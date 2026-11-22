import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Headphones, Pause, Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Play, Voicemail, X } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, mask, pct, rel, toman } from '@/shared/lib/fa'
import { useTab } from '../pages/_shared'

type NavatelCfg = { crm: boolean; popup: boolean; clickToCall: boolean; missedTask: boolean; missedSms: boolean; orderIvr: boolean; smsLine: boolean; webchat: boolean; automation: boolean; slaTarget: number; storage: { totalMB: number; usedMB: number }; webhook: string; apiKey: string }
const dur = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(s % 60).padStart(2, '0'))}`
const ST_T = { 'پاسخ‌داده': 'success', 'از دست رفته': 'danger', 'پیغام صوتی': 'warning', 'در صف': 'info' } as const

/** تلفن ابری: همهٔ تماس‌ها با ضبط مکالمه، تماس‌های از دست رفته برای تماس دوباره، صف‌ها، منوی صوتی و کارشناسان */
export function Calls() {
  const d = useDB(); const nav = useNavigate(); const C = d.calls; const [tab, setTab] = useTab('log'); const [f, setF] = useState('all'); const [play, setPlay] = useState<string | null>(null); const [open, setOpen] = useState<string | null>(null); const [ring, setRing] = useState<string | null>(null)
  const N = (C as typeof C & { navatel?: NavatelCfg }).navatel
  const missed = C.calls.filter((c) => c.status === 'از دست رفته' && !c.callbackDone)
  const ans = C.calls.filter((c) => c.status === 'پاسخ‌داده'); const inCalls = C.calls.filter((c) => c.dir === 'in')
  const rows = C.calls.filter((c) => f === 'all' || (f === 'missed' ? c.status === 'از دست رفته' : f === 'in' ? c.dir === 'in' : f === 'out' ? c.dir === 'out' : c.status === 'پیغام صوتی'))
  const cust = (id?: string) => d.customers.find((x) => x.id === id)
  const sel = C.calls.find((c) => c.id === open)
  const upd = (id: string, fn: (c: (typeof C.calls)[number]) => void, action: string) => mutate((x) => fn(x.calls.calls.find((c) => c.id === id)!), { action, target: id })
  return (
    <Page title="تلفن و تماس‌ها" module="calls" sub="تلفن ابری: تماس‌ها، ضبط مکالمه، صف‌ها و منوی صوتی، همه کنار پروندهٔ مشتری"
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'log', label: 'تماس‌ها', count: missed.length }, { id: 'agents', label: 'کارشناسان' }, { id: 'ivr', label: 'منوی صوتی و ساعت کاری' }, { id: 'connect', label: 'نواتل و اتصال' }]} />}>
      <div className="space-y-4">
        {!C.provider.connected && <p className="rounded-xl bg-info-bg px-3 py-2 text-12 text-info">تلفن ابری هنوز وصل نشده است؛ داده‌های این صفحه نمونه است. از تب «اتصال تلفن ابری» شمارهٔ مجازی را وصل کنید.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="تماس امروز" value={fa(C.calls.length)} note={`${fa(inCalls.length)} ورودی · ${fa(C.calls.length - inCalls.length)} خروجی`} />
          <KPI label="از دست رفته منتظر تماس دوباره" value={fa(missed.length)} tone={missed.length ? 'danger' : 'success'} />
          <KPI label="نرخ پاسخ تماس ورودی" value={pct(inCalls.filter((c) => c.status === 'پاسخ‌داده').length * 100 / Math.max(1, inCalls.length))} />
          <KPI label="میانگین انتظار در صف" value={`${fa(Math.round(ans.reduce((a, c) => a + c.waitSec, 0) / Math.max(1, ans.length)))} ثانیه`} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI label={`سطح سرویس (پاسخ زیر ${fa(N?.slaTarget ?? 20)} ثانیه)`} value={pct(inCalls.filter((c) => c.status === 'پاسخ‌داده' && c.waitSec <= (N?.slaTarget ?? 20)).length * 100 / Math.max(1, inCalls.length))} />
          <KPI label="دقایق مکالمه (ورودی · خروجی)" value={`${fa(Math.round(inCalls.reduce((a, c) => a + c.durSec, 0) / 60))} · ${fa(Math.round(C.calls.filter((c) => c.dir === 'out').reduce((a, c) => a + c.durSec, 0) / 60))}`} />
          <KPI label="میانگین زمان مکالمه" value={dur(Math.round(ans.reduce((a, c) => a + c.durSec, 0) / Math.max(1, ans.length)))} />
          <KPI label="فضای ضبط مکالمه" value={`${pct(((N?.storage.usedMB ?? 0) / Math.max(1, N?.storage.totalMB ?? 1)) * 100)}`} note={`${fa(N?.storage.usedMB ?? 0)} از ${fa(N?.storage.totalMB ?? 0)} مگابایت`} />
        </div>
        {tab === 'log' && <Card pad={false} title="تماس‌ها" actions={<Segmented size="sm" value={f} onChange={setF} options={[['all', 'همه'], ['missed', 'از دست رفته'], ['in', 'ورودی'], ['out', 'خروجی'], ['vm', 'پیغام صوتی']]} />}>
          <ul className="divide-y divide-line">{rows.map((c) => { const cu = cust(c.customerId); const I = c.status === 'از دست رفته' ? PhoneMissed : c.status === 'پیغام صوتی' ? Voicemail : c.dir === 'in' ? PhoneIncoming : PhoneOutgoing; return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-13">
              <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', c.status === 'از دست رفته' ? 'bg-danger-bg text-danger' : 'bg-brand-tint text-brand')}><I size={16} /></span>
              <button className="min-w-40 text-right" onClick={() => setOpen(c.id)}><b className="block">{cu?.name ?? 'شمارهٔ ناشناس'}</b><span className="ltr block text-right text-11 text-t2">{mask(c.number)}</span></button>
              <span className="text-12 text-t2">{c.queue} · {c.agent}</span>
              <Badge tone={ST_T[c.status]}>{c.status}{c.callbackDone ? ' · تماس دوباره شد' : ''}</Badge>
              <span className="tnum text-12 text-t2">{c.durSec ? dur(c.durSec) : '—'} · انتظار {fa(c.waitSec)} ثانیه</span>
              <span className="mr-auto flex items-center gap-2">
                {c.recording && <Button size="sm" variant="ghost" icon={play === c.id ? <Pause size={13} /> : <Play size={13} />} onClick={() => setPlay(play === c.id ? null : c.id)}>{play === c.id ? 'توقف' : 'ضبط مکالمه'}</Button>}
                {c.status !== 'پاسخ‌داده' && !c.callbackDone && <Button size="sm" variant="primary" icon={<PhoneCall size={13} />} onClick={() => { upd(c.id, (x) => { x.callbackDone = true }, 'تماس دوباره با مشتری'); toast('تماس از داخلی شما برقرار می‌شود.') }}>تماس دوباره</Button>}
                <span className="text-11 text-t3">{rel(c.at)}</span></span>
              {play === c.id && <div className="w-full rounded-xl bg-surface-2 p-2"><div className="h-2 overflow-hidden rounded-full bg-line"><span className="block h-full w-1/3 animate-pulse rounded-full bg-brand-solid" /></div><p className="mt-1 text-11 text-t2">پخش ضبط مکالمه ({dur(c.durSec)}) · دسترسی به ضبط‌ها در لاگ ممیزی ثبت می‌شود.</p></div>}
            </li>) })}</ul>
        </Card>}
        {tab === 'agents' && <div className="grid gap-3 md:grid-cols-3">{C.agents.map((a) => <Card key={a.ext} title={<span className="flex items-center gap-2"><Headphones size={15} />{a.name}<span className="ltr text-11 text-t3">داخلی {a.ext}</span></span>} actions={<Badge tone={a.state === 'آزاد' ? 'success' : a.state === 'در تماس' ? 'info' : 'neutral'}>{a.state}</Badge>}>
          <p className="text-13">امروز {fa(a.today)} تماس</p><p className="text-12 text-t2">میانگین امتیاز: {fa((C.calls.filter((c) => c.agent === a.name && c.rating).reduce((x, c) => x + (c.rating ?? 0), 0) / Math.max(1, C.calls.filter((c) => c.agent === a.name && c.rating).length)).toFixed(1))} از ۵</p>
          <div className="mt-2"><Segmented size="sm" value={a.state} onChange={(v) => mutate((x) => { x.calls.agents.find((y) => y.ext === a.ext)!.state = v }, { action: 'تغییر وضعیت کارشناس تلفن', target: a.name, after: v })} options={[['آزاد', 'آزاد'], ['استراحت', 'استراحت'], ['آفلاین', 'آفلاین']]} /></div></Card>)}</div>}
        {tab === 'ivr' && <div className="grid gap-4 lg:grid-cols-2">
          <Card title="منوی صوتی (وقتی مشتری زنگ می‌زند)">{C.ivr.map((o, i) => <div key={o.key} className="mb-2 flex items-center gap-2"><span className="tnum grid size-8 place-items-center rounded-lg bg-brand-tint font-bold text-brand">{fa(o.key)}</span><Input className="flex-1" defaultValue={o.label} onBlur={(e) => mutate((x) => { x.calls.ivr[i].label = e.target.value }, { action: 'ویرایش منوی صوتی', target: o.key })} /><Input className="w-40" defaultValue={o.queue} onBlur={(e) => mutate((x) => { x.calls.ivr[i].queue = e.target.value }, { action: 'ویرایش صف منوی صوتی', target: o.key })} /></div>)}
            <p className="mt-2 text-11 text-t2">اگر شماره در پروندهٔ مشتریان باشد، تماس مستقیم به آخرین کارشناس همان مشتری می‌رود و پنجرهٔ پرونده‌اش برای کارشناس باز می‌شود.</p></Card>
          <Card title="ساعت کاری و پیغام"><div className="grid grid-cols-2 gap-3"><Field label="از"><Input type="time" className="ltr" defaultValue={C.hours.from} onBlur={(e) => mutate((x) => { x.calls.hours.from = e.target.value })} /></Field><Field label="تا"><Input type="time" className="ltr" defaultValue={C.hours.to} onBlur={(e) => mutate((x) => { x.calls.hours.to = e.target.value })} /></Field></div><Field label="پیغام خارج از ساعت کاری"><Textarea rows={3} defaultValue={C.hours.offMsg} onBlur={(e) => mutate((x) => { x.calls.hours.offMsg = e.target.value }, { action: 'ویرایش پیغام خارج از ساعت', target: 'تلفن' })} /></Field>
            <div className="mt-3 space-y-2 text-13"><Toggle on={C.provider.recordAll} onChange={(v) => mutate((x) => { x.calls.provider.recordAll = v })} text="ضبط همهٔ مکالمه‌ها" /><Toggle on={C.provider.announce} onChange={(v) => mutate((x) => { x.calls.provider.announce = v })} text="اعلام «این مکالمه ضبط می‌شود» در ابتدای تماس" /></div></Card>
        </div>}
        {tab === 'connect' && <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <Card title={<span className="flex items-center gap-2"><Phone size={15} />نواتل · {C.provider.plan ?? 'پنل'}</span>} actions={<Badge tone={C.provider.connected ? 'success' : 'neutral'}>{C.provider.connected ? 'وصل است' : 'وصل نشده'}</Badge>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="شمارهٔ ابری"><Input className="ltr text-left" defaultValue={C.provider.did} onBlur={(e) => mutate((x) => { x.calls.provider.did = e.target.value }, { action: 'ویرایش شمارهٔ تلفن ابری', target: e.target.value })} /></Field>
              <Field label="کلید API نواتل" help="از پنل نواتل ← اتصال به CRM"><Input type="password" className="ltr text-left font-mono" placeholder="کلید را اینجا بچسبانید" defaultValue={N?.apiKey} onBlur={(e) => mutate((x) => { const n = (x.calls as typeof C & { navatel?: NavatelCfg }).navatel; if (n) n.apiKey = e.target.value }, { action: 'ثبت کلید API نواتل', target: 'نواتل' })} /></Field>
              <div className="sm:col-span-2"><Field label="نشانی وب‌هوک برای «اتصال به CRM» در پنل نواتل" help="رویدادهای زنگ خوردن، پاسخ، پایان تماس و تماس ازدست‌رفته به این نشانی فرستاده می‌شود."><Input className="ltr text-left font-mono" readOnly value={N?.webhook ?? ''} /></Field></div>
            </div>
            <ul className="mt-3 space-y-2 text-13">{([
              ['crm', 'اتصال به CRM: هر تماس در پروندهٔ همان مشتری و سفارش ثبت شود'],
              ['popup', 'پنجرهٔ تماس ورودی: با زنگ خوردن، نام مشتری، آخرین سفارش و تیکت باز نمایش داده شود'],
              ['clickToCall', 'تماس با یک کلیک از صفحهٔ سفارش و مشتری، از داخلی خود شما و با شمارهٔ ابری'],
              ['missedTask', 'تماس ازدست‌رفته خودکار کار «تماس دوباره» بسازد'],
              ['missedSms', 'پیامک خودکار بعد از تماس ازدست‌رفته'],
              ['orderIvr', 'منوی صوتی «پیگیری سفارش» وضعیت را از پنل غنیمت بخواند'],
              ['automation', 'اتوماسیون نواتل: پیغام خارج از ساعت کاری و صف‌بندی خودکار'],
              ['smsLine', 'ارسال پیامک‌های وضعیت سفارش از خط پیامک نواتل'],
              ['webchat', 'وب‌چت نواتل روی سایت (کنار پشتیبانی)'],
            ] as [string, string][]).map(([k, l]) => <li key={k}><Toggle on={!!(N as Record<string, unknown> | undefined)?.[k]} onChange={(v) => mutate((x) => { const n = (x.calls as typeof C & { navatel?: Record<string, unknown> }).navatel; if (n) n[k] = v }, { action: 'تنظیم اتصال نواتل', target: l, after: v ? 'روشن' : 'خاموش' })} text={l} /></li>)}</ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" icon={<Phone size={14} />} onClick={() => { mutate((x) => { x.calls.provider.connected = true; x.calls.provider.name = 'نواتل' }, { action: 'اتصال تلفن ابری نواتل', target: C.provider.did }); toast('نواتل وصل شد (نمایشی). در نسخهٔ نهایی با کلید API و وب‌هوک.') }}>{C.provider.connected ? 'آزمون دوبارهٔ اتصال' : 'اتصال'}</Button>
              <Button icon={<PhoneIncoming size={14} />} onClick={() => setRing(d.customers[0]?.id ?? null)}>نمونهٔ تماس ورودی</Button>
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="پیغام‌های صوتی و پیامک">
              <div className="space-y-2 text-12">
                <p><b>خوش‌آمد منوی صوتی:</b> «سلام، به غنیمت خوش آمدید. برای پیگیری سفارش یک، برای مشاوره و خرید دو، برای مرجوعی و گارانتی سه، برای شعبهٔ مهاباد چهار، و برای صحبت با همکاران ما صفر را بگیرید.»</p>
                <p><b>انتظار در صف:</b> «همهٔ همکاران ما در حال پاسخ‌گویی‌اند. تا چند لحظهٔ دیگر یک آدم واقعی جواب می‌دهد.»</p>
                <p><b>پیامک پس از تماس ازدست‌رفته:</b> «غنیمت | تماس شما را از دست دادیم. تا ۳۰ دقیقهٔ دیگر با شما تماس می‌گیریم. پیگیری سفارش: ghanimat.com/o»</p>
              </div>
            </Card>
            <Card title="فضای ضبط مکالمه">
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-brand-solid" style={{ width: `${((N?.storage.usedMB ?? 0) / Math.max(1, N?.storage.totalMB ?? 1)) * 100}%` }} /></div>
              <p className="mt-2 text-12 text-t2">{fa(N?.storage.usedMB ?? 0)} از {fa(N?.storage.totalMB ?? 0)} مگابایت مصرف شده. پیشنهاد: ضبط‌های قدیمی‌تر از ۹۰ روز که به مرجوعی یا شکایت باز وصل نیستند، از نواتل پاک شوند؛ ضبط‌های مهم به پروندهٔ همان سفارش در پنل منتقل شود.</p>
            </Card>
          </div>
        </div>}
      </div>
      {ring && (() => { const cu = d.customers.find((x) => x.id === ring); const last = d.orders.filter((o) => o.customerId === ring).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; const tk = d.tickets.find((t) => t.customerId === ring && t.status !== 'ticket.closed')
        return <div role="dialog" aria-label="تماس ورودی" className="anim-pop fixed bottom-24 left-6 z-[55] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center gap-2 bg-[#10123d] px-4 py-3 text-white"><PhoneIncoming size={16} className="animate-pulse" /><b className="text-13">تماس ورودی · {C.provider.did}</b><button type="button" aria-label="بستن" className="mr-auto opacity-80 hover:opacity-100" onClick={() => setRing(null)}><X size={16} /></button></div>
          <div className="space-y-2 p-4 text-12"><p className="text-14"><b>{cu?.name ?? 'شمارهٔ ناشناس'}</b> <span className="ltr text-t2">{cu ? mask(cu.mobile) : ''}</span></p>
            {last ? <p>آخرین سفارش: <b className="ltr">{last.id}</b> · {toman(last.total)} · {rel(last.createdAt)}</p> : <p className="text-t2">سفارشی ندارد.</p>}
            {tk && <p className="text-warning">تیکت باز: {tk.subject}</p>}
            <div className="flex flex-wrap gap-2 pt-1">{last && <Button size="sm" variant="primary" onClick={() => { setRing(null); nav(`/admin/orders/${last.id}`) }}>باز کردن سفارش</Button>}{cu && <Button size="sm" onClick={() => { setRing(null); nav(`/admin/customers/${cu.id}`) }}>پروندهٔ مشتری</Button>}{cu && N?.missedSms && <Button size="sm" variant="ghost" onClick={() => { sendSms(cu.mobile, 'غنیمت | تماس شما را از دست دادیم. تا ۳۰ دقیقهٔ دیگر با شما تماس می‌گیریم.', 'تماس ازدست‌رفته', last?.id, cu.id); toast('پیامک تماس ازدست‌رفته فرستاده شد.'); setRing(null) }}>از دست رفت؛ پیامک</Button>}</div>
          </div></div> })()}
      <Modal open={!!sel} onClose={() => setOpen(null)} title={sel ? `تماس ${sel.id}` : ''} footer={sel && <>{sel.customerId && <Button onClick={() => nav(`/admin/customers/${sel.customerId}`)}>پروندهٔ مشتری</Button>}{sel.ticketId ? <Button variant="ghost" onClick={() => nav(`/admin/support?t=${sel.ticketId}`)}>تیکت {sel.ticketId}</Button> : <Button variant="ghost" onClick={() => { const id = `TK-${Date.now().toString().slice(-6)}`; mutate((x) => { x.tickets.unshift({ id, customerId: sel.customerId ?? 'c1', orderId: '', subject: `تماس تلفنی ${sel.id}`, channel: 'تلفن', status: 'ticket.open', priority: 'عادی', sla: new Date(Date.now() + 4 * 36e5).toISOString(), assignee: sel.agent, sentiment: 'خنثی', messages: [{ from: 'agent', text: sel.note || 'ثبت از تماس تلفنی', at: new Date().toISOString() }] }); x.calls.calls.find((c) => c.id === sel.id)!.ticketId = id }, { action: 'ساخت تیکت از تماس', target: sel.id }); toast(`تیکت ${id} ساخته شد.`) }}>ساخت تیکت از این تماس</Button>}</>}>
        {sel && <div className="space-y-2 text-13"><p>{cust(sel.customerId)?.name ?? 'شمارهٔ ناشناس'} · <span className="ltr">{mask(sel.number)}</span></p><p className="text-t2">{sel.dir === 'in' ? 'ورودی' : 'خروجی'} · {sel.queue} · {sel.agent} · {sel.durSec ? dur(sel.durSec) : 'بدون مکالمه'}</p>
          <Field label="یادداشت مکالمه"><Textarea rows={3} defaultValue={sel.note ?? ''} onBlur={(e) => upd(sel.id, (x) => { x.note = e.target.value }, 'یادداشت تماس')} /></Field></div>}
      </Modal>
    </Page>
  )
}
