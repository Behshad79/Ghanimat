import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgePercent, MessageSquareText, Plus, Send, Timer, Users, Zap } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { WhenPicker, whenLabel } from '@/shared/ui/jdate'
import { currentUser, mutate, sendSms, useDB } from '@/shared/lib/store'
import { compactToman, fa, num, pct, rel, toman } from '@/shared/lib/fa'
import { smsParts, TRIGGERS, VARS, type Policy, type Trigger } from '@/shared/data/nudges'
import { useTab } from '../pages/_shared'

const CH = ['پیامک', 'بله', 'پوش', 'ایمیل']
const codeOf = () => `GH${Math.random().toString(36).slice(2, 7).toUpperCase()}`

/** پیامک و پیگیری مشتری: ارسال دستی، سیاست‌های پیگیری خودکار و کد تخفیف خودکار */
export function Messaging() {
  const d = useDB(); const [tab, setTab] = useTab('send'); const N = d.nudges
  const live = N.policies.filter((p) => p.active)
  return (
    <Page title="پیامک و پیگیری مشتری" module="marketing" sub="ارسال دستی به یک یا چند نفر، یادآوری خودکار سفارش و سبد، و کد تخفیف خودکار برای گروه‌های مشخص"
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'send', label: 'ارسال پیام' }, { id: 'policies', label: 'سیاست‌های پیگیری خودکار', count: live.length }, { id: 'history', label: 'ارسال‌های دستی', count: N.blasts.length }, { id: 'log', label: 'گزارش ارسال', count: d.smsLog.length }]} />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="فروش برگشتی از پیگیری‌ها" value={compactToman(N.policies.reduce((a, p) => a + p.revenue, 0))} note="۳۰ روز اخیر" />
          <KPI label="پیام ارسال‌شده" value={num(N.policies.reduce((a, p) => a + p.sent, 0) + N.blasts.reduce((a, b) => a + b.count, 0))} />
          <KPI label="نرخ بازگشت به خرید" value={pct(N.policies.reduce((a, p) => a + p.conv, 0) * 100 / Math.max(1, N.policies.reduce((a, p) => a + p.sent, 0)), 1)} />
          <KPI label="سیاست فعال" value={fa(live.length)} note={`از ${fa(N.policies.length)}`} />
        </div>
        {tab === 'send' && <Composer />}
        {tab === 'policies' && <Policies />}
        {tab === 'history' && <Card pad={false}>{N.blasts.length === 0 ? <div className="p-5"><EmptyState title="هنوز ارسال دستی نداشته‌اید." /></div> : <ul className="divide-y divide-line">{N.blasts.map((b) => <li key={b.id} className="px-4 py-3 text-13"><p className="flex flex-wrap items-center gap-2"><b className="ltr">{b.id}</b><Badge tone={b.status === 'ارسال شد' ? 'success' : 'info'}>{b.status}{b.when && ` · ${whenLabel(b.when)}`}</Badge><span className="text-t2">{b.audience} · {fa(b.count)} نفر · {b.channel}</span>{b.code && <Badge dot={false}>کد {b.code}</Badge>}<span className="mr-auto text-11 text-t3">{b.by} · {rel(b.at)}</span></p><p className="mt-1 text-12 text-t2">{b.text}</p></li>)}</ul>}</Card>}
        {tab === 'log' && <Card pad={false}><ul className="divide-y divide-line">{d.smsLog.slice(0, 60).map((m) => <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-12"><b className="w-28 shrink-0">{m.kind}</b><span className="min-w-0 flex-1 truncate text-t2">{m.text}</span><span className="ltr text-t3">{m.to}</span><Badge tone={m.status === 'تحویل شد' ? 'success' : m.status === 'در صف' ? 'warning' : 'danger'}>{m.status}</Badge><span className="text-11 text-t3">{rel(m.at)}</span></li>)}</ul></Card>}
      </div>
    </Page>
  )
}

/** ارسال دستی: یک نفر، چند نفر، یک بخش یا یک وضعیت (مثل سفارش پرداخت‌نشده) */
function Composer() {
  const d = useDB(); const nav = useNavigate()
  const [mode, setMode] = useState<'people' | 'segment' | 'state'>('people'); const [ids, setIds] = useState<string[]>([]); const [pickId, setPickId] = useState('')
  const [seg, setSeg] = useState('VIP'); const [st, setSt] = useState<Trigger>('awaiting_payment'); const [ch, setCh] = useState('پیامک')
  const [text, setText] = useState('{نام} عزیز، '); const [withCode, setWithCode] = useState(false); const [code, setCode] = useState({ pct: 5, days: 3, cap: 2000000 }); const [when, setWhen] = useState('همین حالا')
  const segs = [...new Set(d.customers.map((c) => c.segment))]
  const byState = (t: Trigger) => t === 'awaiting_payment' ? d.customers.filter((c) => d.orders.some((o) => o.customerId === c.id && o.status === 'order.awaiting_payment') || d.journey.carts.some((k) => k.customerId === c.id && k.step === 'پرداخت')) : t === 'open_cart' ? d.customers.filter((c) => d.journey.carts.some((k) => k.customerId === c.id)) : t === 'failed_payment' ? d.customers.filter((c) => d.journey.failedPayments.some((f) => f.customerId === c.id && !f.resolved)) : t === 'inactive' ? d.customers.filter((c) => Date.now() - new Date(c.lastOrder).getTime() > 30 * 864e5) : d.customers.filter((c) => d.journey.lists.some((l) => l.customerId === c.id))
  const people = mode === 'people' ? d.customers.filter((c) => ids.includes(c.id)) : mode === 'segment' ? d.customers.filter((c) => c.segment === seg) : byState(st)
  const audience = mode === 'people' ? `${fa(people.length)} مشتری انتخابی` : mode === 'segment' ? `بخش ${seg}` : TRIGGERS[st].label
  const sample = (c: (typeof d.customers)[number], cd: string) => text.replace(/{نام}/g, c.name.split(' ')[0]).replace(/{کد_تخفیف}/g, cd).replace(/{درصد}/g, fa(code.pct)).replace(/{انقضا}/g, `${fa(code.days)} روز دیگر`).replace(/{کد_سفارش}/g, d.orders.find((o) => o.customerId === c.id)?.id ?? '').replace(/{لینک_پرداخت}|{لینک_سبد}/g, `g.ir/c/${c.id}`)
  const parts = smsParts(sample(people[0] ?? d.customers[0], 'GHXXXXX')); const cost = parts * people.length * d.nudges.smsPrice
  const send = async () => {
    if (!people.length) return toast('گیرنده‌ای انتخاب نشده است.', { tone: 'err' })
    if (!(await confirm({ title: `ارسال به ${fa(people.length)} نفر؟`, body: `${audience} · ${ch}${withCode ? ` · هر نفر یک کد ${fa(code.pct)}٪ یکتا` : ''} · ${when === 'همین حالا' ? 'همین حالا' : whenLabel(when)}`, confirm: 'ارسال' }))) return
    const later = when !== 'همین حالا'; const codes: string[] = []
    people.forEach((c) => { const cd = withCode ? codeOf() : ''; if (cd) codes.push(cd)
      if (withCode) mutate((x) => { x.codes.unshift({ id: cd, title: 'کد اختصاصی ارسال دستی', type: 'درصدی', value: `${code.pct}٪ تا سقف ${toman(code.cap)}`, used: 0, limit: 1, perUser: 1, cap: code.cap, expires: new Date(Date.now() + code.days * 864e5).toISOString(), audience: 'one', customerId: c.id, active: true, cond: `فقط ${c.name} · تا ${fa(code.days)} روز` }) })
      if (!later && ch === 'پیامک') sendSms(c.mobile, sample(c, cd), 'ارسال دستی', '', c.id) })
    mutate((x) => { x.nudges.blasts.unshift({ id: `BL-${Date.now().toString(36).slice(-3).toUpperCase()}`, at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', audience, count: people.length, channel: ch, text, code: codes[0] ? `${codes.length > 1 ? `${fa(codes.length)} کد یکتا` : codes[0]}` : undefined, status: later ? 'زمان‌بندی‌شده' : 'ارسال شد', when: later ? when : undefined, conv: 0 }) }, { action: 'ارسال پیام دستی', target: audience, after: `${people.length} نفر` })
    toast(later ? `ارسال برای ${whenLabel(when)} زمان‌بندی شد.` : `پیام برای ${fa(people.length)} نفر ارسال شد${withCode ? ' و کدهای یکتا ساخته شد' : ''}.`); setIds([])
  }
  return <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
    <Card title={<span className="flex items-center gap-2"><Send size={15} />ارسال پیام</span>}>
      <Field label="به چه کسانی؟"><Segmented value={mode} onChange={setMode} options={[['people', 'یک یا چند نفر'], ['segment', 'یک بخش مشتری'], ['state', 'مشتریان در یک وضعیت']]} /></Field>
      <div className="mt-3">{mode === 'people' && <><div className="flex gap-2"><Select className="flex-1" value={pickId} onChange={(v) => { if (v && !ids.includes(v)) setIds([...ids, v]); setPickId('') }} placeholder="جست‌وجوی نام یا موبایل…" options={d.customers.filter((c) => !ids.includes(c.id)).map((c) => [c.id, `${c.name} · ${c.mobile}`])} /></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{people.map((c) => <button key={c.id} type="button" onClick={() => setIds(ids.filter((x) => x !== c.id))} className="rounded-full border border-line px-2.5 py-1 text-12 hover:border-danger">{c.name} ×</button>)}</div></>}
        {mode === 'segment' && <Select value={seg} onChange={setSeg} options={segs} />}
        {mode === 'state' && <Select value={st} onChange={(v) => setSt(v as Trigger)} options={(Object.keys(TRIGGERS) as Trigger[]).filter((k) => k !== 'after_delivery').map((k) => [k, TRIGGERS[k].label])} />}
        <p className="mt-2 flex items-center gap-1.5 text-12 text-t2"><Users size={13} />{fa(people.length)} گیرنده{people.length > 0 && mode !== 'people' && `: ${people.slice(0, 4).map((c) => c.name).join('، ')}${people.length > 4 ? ' و …' : ''}`}</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="کانال"><Segmented value={ch} onChange={setCh} options={CH.map((c) => [c, c])} /></Field><Field label="زمان ارسال"><WhenPicker Select={Select} value={when} onChange={setWhen} presets={['همین حالا', 'امروز ساعت ۱۸', 'فردا ساعت ۱۰']} /></Field></div>
      <Field label="متن پیام" help={`${fa(text.length)} نویسه · ${fa(parts)} بخش پیامک`}><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <div className="mt-1 flex flex-wrap gap-1">{VARS.map((v) => <button key={v} type="button" onClick={() => setText(text + v)} className="rounded-md bg-neutral-bg px-2 py-0.5 text-11 text-t2 hover:text-brand">{v}</button>)}</div>
      <div className="mt-4 rounded-xl border border-line p-3"><Toggle on={withCode} onChange={setWithCode} text="برای هر نفر کد تخفیف یکتا بساز" />
        {withCode && <div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="درصد"><Input className="ltr text-left" inputMode="numeric" value={code.pct} onChange={(e) => setCode({ ...code, pct: Math.min(90, +e.target.value.replace(/\D/g, '') || 0) })} /></Field><Field label="اعتبار (روز)"><Input className="ltr text-left" inputMode="numeric" value={code.days} onChange={(e) => setCode({ ...code, days: +e.target.value.replace(/\D/g, '') || 1 })} /></Field><Field label="سقف مبلغ (تومان)"><Input className="ltr text-left" inputMode="numeric" value={code.cap} onChange={(e) => setCode({ ...code, cap: +e.target.value.replace(/\D/g, '') || 0 })} /></Field></div>}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="primary" icon={<Send size={14} />} disabled={!people.length || text.trim().length < 5} onClick={send}>{when === 'همین حالا' ? 'ارسال' : 'زمان‌بندی ارسال'}</Button><span className="text-12 text-t2">هزینهٔ تقریبی پیامک: {toman(ch === 'پیامک' ? cost : 0)}</span><button className="mr-auto text-12 text-brand" onClick={() => nav('/admin/marketing?tab=templates')}>قالب پیام‌ها</button></div>
      <p className="mt-2 text-11 text-t2">ساعات سکوت ({d.nudges.quiet.from} تا {d.nudges.quiet.to}) رعایت می‌شود؛ پیامک تبلیغاتی فقط برای کسانی می‌رود که اعلان آن را خاموش نکرده‌اند.</p>
    </Card>
    <Card title="پیش‌نمایش">{people[0] ? <div className="rounded-2xl bg-neutral-bg p-3 text-13 leading-7">{sample(people[0], withCode ? 'GH7KQ2M' : '')}</div> : <p className="text-12 text-t2">گیرنده‌ای انتخاب نشده است.</p>}
      <p className="mt-2 text-11 text-t2">پیش‌نمایش با اطلاعات اولین گیرنده ساخته شده است.</p></Card>
  </div>
}

/** سیاست‌های پیگیری خودکار: یادآوری پرداخت، سبد مانده، پرداخت ناموفق و کد تخفیف خودکار */
function Policies() {
  const d = useDB(); const [ed, setEd] = useState<Policy | null>(null)
  const upd = (id: string, fn: (p: Policy) => void, action: string) => mutate((x) => fn(x.nudges.policies.find((p) => p.id === id)!), { action, target: d.nudges.policies.find((p) => p.id === id)?.name ?? id })
  const blank: Policy = { id: '', name: '', trigger: 'awaiting_payment', delay: 30, unit: 'دقیقه', channel: 'پیامک', text: '{نام} عزیز، ', segment: 'همه', minCart: 0, active: true, sent: 0, conv: 0, revenue: 0 }
  return <>
    <div className="flex justify-end"><Button variant="primary" icon={<Plus size={14} />} onClick={() => setEd({ ...blank })}>سیاست تازه</Button></div>
    <div className="grid gap-4 lg:grid-cols-2">{d.nudges.policies.map((p) => <Card key={p.id} title={<span className="flex items-center gap-2"><Zap size={15} className={p.active ? 'text-brand' : 'text-t3'} />{p.name}</span>} actions={<Toggle on={p.active} label={p.name} onChange={(v) => upd(p.id, (x) => { x.active = v }, v ? 'روشن‌کردن سیاست پیگیری' : 'خاموش‌کردن سیاست پیگیری')} />}>
      <p className="flex flex-wrap items-center gap-1.5 text-12"><Badge dot={false}>{TRIGGERS[p.trigger].label}</Badge><span className="flex items-center gap-1 text-t2"><Timer size={12} />{p.delay ? `${fa(p.delay)} ${p.unit} بعد` : 'بلافاصله'}</span><Badge dot={false}>{p.channel}</Badge>{p.segment !== 'همه' && <Badge dot={false}>بخش {p.segment}</Badge>}{p.minCart > 0 && <Badge dot={false}>سبد بالای {compactToman(p.minCart)}</Badge>}{p.code && <Badge tone="brand" dot={false}><BadgePercent size={11} className="ml-1 inline" />کد {fa(p.code.pct)}٪ · {fa(p.code.days)} روز</Badge>}</p>
      <p className="mt-2 rounded-xl bg-neutral-bg p-2.5 text-12 leading-6">{p.text}</p>
      <p className="mt-2 text-11 text-t2">توقف وقتی: {TRIGGERS[p.trigger].stop}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-11"><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">ارسال</dt><dd className="tnum text-14 font-bold">{fa(p.sent)}</dd></div><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">برگشت به خرید</dt><dd className="tnum text-14 font-bold">{p.sent ? pct(p.conv * 100 / p.sent, 1) : '—'}</dd></div><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">فروش</dt><dd className="tnum text-14 font-bold">{compactToman(p.revenue)}</dd></div></dl>
      <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => setEd(structuredClone(p))}>ویرایش</Button><Button size="sm" variant="ghost" onClick={() => { const c = d.customers[0]; sendSms(c.mobile, p.text.replace(/{نام}/g, c.name.split(' ')[0]), `آزمایش: ${p.name}`, p.id, c.id); toast('پیام آزمایشی به شمارهٔ نمونه ارسال و در گزارش ثبت شد.') }}>ارسال آزمایشی</Button></div>
    </Card>)}</div>
    <Modal wide open={!!ed} onClose={() => setEd(null)} title={ed?.id ? `ویرایش «${ed.name}»` : 'سیاست پیگیری تازه'} footer={<Button variant="primary" disabled={!ed?.name.trim() || (ed?.text.trim().length ?? 0) < 5} onClick={() => { const p = ed!; mutate((x) => { if (p.id) Object.assign(x.nudges.policies.find((y) => y.id === p.id)!, p); else x.nudges.policies.unshift({ ...p, id: `np${Date.now().toString(36)}` }) }, { action: p.id ? 'ویرایش سیاست پیگیری' : 'ساخت سیاست پیگیری', target: p.name }); setEd(null); toast('سیاست ذخیره شد.') }}>ذخیره</Button>}>
      {ed && <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="نام"><Input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field><Field label="وقتی…"><Select value={ed.trigger} onChange={(v) => setEd({ ...ed, trigger: v as Trigger })} options={(Object.keys(TRIGGERS) as Trigger[]).map((k) => [k, TRIGGERS[k].label])} /></Field></div>
        <p className="text-11 text-t2">{TRIGGERS[ed.trigger].desc} · توقف وقتی: {TRIGGERS[ed.trigger].stop}</p>
        <div className="grid gap-3 sm:grid-cols-4"><Field label="بعد از"><Input className="ltr text-left" inputMode="numeric" value={ed.delay} onChange={(e) => setEd({ ...ed, delay: +e.target.value.replace(/\D/g, '') || 0 })} /></Field><Field label="واحد"><Select value={ed.unit} onChange={(v) => setEd({ ...ed, unit: v as Policy['unit'] })} options={['دقیقه', 'ساعت', 'روز']} /></Field><Field label="کانال"><Select value={ed.channel} onChange={(v) => setEd({ ...ed, channel: v })} options={CH} /></Field><Field label="بخش مشتری"><Select value={ed.segment} onChange={(v) => setEd({ ...ed, segment: v })} options={['همه', ...new Set(d.customers.map((c) => c.segment))]} /></Field></div>
        <Field label="حداقل مبلغ سبد (تومان)" help="۰ یعنی همهٔ سبدها"><Input className="ltr text-left" inputMode="numeric" value={ed.minCart} onChange={(e) => setEd({ ...ed, minCart: +e.target.value.replace(/\D/g, '') || 0 })} /></Field>
        <Field label="متن" help={`${fa(ed.text.length)} نویسه · ${fa(smsParts(ed.text))} بخش`}><Textarea rows={3} value={ed.text} onChange={(e) => setEd({ ...ed, text: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-1">{VARS.map((v) => <button key={v} type="button" onClick={() => setEd({ ...ed, text: ed.text + v })} className="rounded-md bg-neutral-bg px-2 py-0.5 text-11 text-t2 hover:text-brand">{v}</button>)}</div>
        <div className="rounded-xl border border-line p-3"><Toggle on={!!ed.code} onChange={(v) => setEd({ ...ed, code: v ? { pct: 5, days: 2, cap: 2000000 } : undefined })} text="کد تخفیف یکتا خودکار بساز و در پیام بگذار" />
          {ed.code && <div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="درصد"><Input className="ltr text-left" inputMode="numeric" value={ed.code.pct} onChange={(e) => setEd({ ...ed, code: { ...ed.code!, pct: Math.min(90, +e.target.value.replace(/\D/g, '') || 0) } })} /></Field><Field label="اعتبار (روز)"><Input className="ltr text-left" inputMode="numeric" value={ed.code.days} onChange={(e) => setEd({ ...ed, code: { ...ed.code!, days: +e.target.value.replace(/\D/g, '') || 1 } })} /></Field><Field label="سقف مبلغ (تومان)"><Input className="ltr text-left" inputMode="numeric" value={ed.code.cap} onChange={(e) => setEd({ ...ed, code: { ...ed.code!, cap: +e.target.value.replace(/\D/g, '') || 0 } })} /></Field></div>}</div>
        <p className="flex items-center gap-1 text-11 text-t2"><MessageSquareText size={12} />هر مشتری برای یک رویداد فقط یک بار این پیام را می‌گیرد؛ اگر شرط توقف برقرار شود، پیام ارسال نمی‌شود.</p>
      </div>}
    </Modal>
  </>
}
export const MsgCls = cx
