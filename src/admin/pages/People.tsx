import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Sparkles, Star } from 'lucide-react'
import { AIButton, AITag, Avatar, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Masked, Progress, Row, StatusBadge, Tabs, Textarea } from '@/shared/ui/base'
import { Page, Timeline } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { confirm, Drawer, Hint, toast } from '@/shared/ui/overlay'
import { mutate, snapshot } from '@/shared/lib/store'
import { compactToman, fa, pct, rel, toman } from '@/shared/lib/fa'
import { Cell, Money, SlaChip, useLookup, useTab } from './_shared'

export function Customers() {
  const { d } = useLookup(); const nav = useNavigate(); const [sp, setSp] = useSearchParams(); const [tab, setTab] = useTab('list'); const [amt, setAmt] = useState('')
  const c = d.customers.find((x) => x.id === sp.get('c'))
  const close = () => { const n = new URLSearchParams(sp); n.delete('c'); setSp(n) }
  const charge = async () => { const n = Number(amt.replace(/\D/g, '')); if (!c || !n) return; if (!(await confirm({ title: `شارژ کیف پول ${c.name}؟`, body: <>{toman(n)} به کیف پول اضافه می‌شود. این تعدیل در دفتر کیف پول و لاگ ممیزی ثبت می‌شود.</>, confirm: `شارژ ${toman(n)}` }))) return; mutate((x) => { x.customers.find((y) => y.id === c.id)!.wallet += n }, { action: 'شارژ کیف پول', target: c.name, after: toman(n) }); setAmt(''); toast(`${toman(n)} به کیف پول ${c.name} واریز شد.`) }
  const segs = [...new Set(d.customers.map((x) => x.segment))]
  return (
    <Page title="مشتریان" module="customers" empty={{ title: 'هنوز مشتری‌ای ثبت‌نام نکرده است.', desc: 'با اولین ثبت‌نام یا سفارش، مشتریان اینجا نمایش داده می‌شوند.' }}
      primary={<Button variant="primary" onClick={() => toast('سازندهٔ بخش: شرط‌های رفتاری و ویژگی با «و/یا».')}>ساخت بخش مشتری</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'list', label: 'همهٔ مشتریان', count: d.customers.length }, { id: 'segments', label: 'بخش‌ها و RFM' }, { id: 'legal', label: 'حساب‌های حقوقی', count: 1 }]} />}>
      {tab === 'list' && <DataTable name="مشتریان" rows={d.customers} rowKey={(x) => x.id} onRow={(x) => { const n = new URLSearchParams(sp); n.set('c', x.id); setSp(n) }} search={(x) => `${x.name} ${x.mobile} ${x.city}`} empty={{ title: 'مشتری‌ای نیست.' }}
        cols={[{ key: 'n', title: 'مشتری', render: (x) => <Cell a={x.name} b={x.city} />, sort: (x) => x.name, text: (x) => x.name }, { key: 'm', title: 'موبایل', hideMobile: true, render: (x) => <Masked id={`m-${x.id}`} value={x.mobile} label={`شمارهٔ موبایل ${x.name}`} />, text: (x) => x.mobile.slice(0, 4) + '•••' }, { key: 'seg', title: 'بخش', render: (x) => <Badge dot={false} tone={x.segment === 'در خطر ریزش' ? 'warning' : x.segment === 'VIP' ? 'brand' : 'neutral'}>{x.segment}</Badge>, sort: (x) => x.segment },
          { key: 'ltv', title: <>LTV<Hint k="ltv" /></>, align: 'left', render: (x) => <Money v={x.ltv} compact />, sort: (x) => x.ltv, text: (x) => x.ltv }, { key: 'o', title: 'سفارش', align: 'left', hideMobile: true, render: (x) => fa(x.orders), sort: (x) => x.orders }, { key: 'last', title: 'آخرین خرید', hideMobile: true, render: (x) => rel(x.lastOrder), sort: (x) => x.lastOrder }, { key: 'h', title: 'سلامت', hideMobile: true, render: (x) => <div className="w-16"><Progress value={x.health} tone={x.health > 70 ? 'success' : x.health > 45 ? 'warning' : 'danger'} /></div>, sort: (x) => x.health }, { key: 'src', title: 'منبع جذب', optional: true, render: (x) => x.source }]}
        bulk={(ids, clear) => <Button size="sm" onClick={() => { nav('/admin/marketing'); clear() }}>ارسال {fa(ids.length)} نفر به کمپین</Button>} />}
      {tab === 'segments' && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{segs.map((s) => { const list = d.customers.filter((x) => x.segment === s); return <Card key={s} title={s} actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/marketing')}>ارسال به کمپین</Button>}><p className="tnum text-24 font-bold">{fa(list.length)}</p><p className="text-12 text-t2">میانگین LTV: {compactToman(list.reduce((a, x) => a + x.ltv, 0) / list.length)}</p></Card> })}</div>}
      {tab === 'legal' && <Card title="صف بررسی حساب‌های حقوقی"><div className="flex flex-wrap items-center justify-between gap-3"><Cell a="شرکت داده‌پرداز آریا" b="شناسهٔ ملی و کد اقتصادی استعلام شد · روزنامهٔ رسمی ناخوانا است" /><div className="flex gap-2"><Button variant="primary" onClick={() => toast('حساب حقوقی تأیید شد و مشتری خبردار شد.')}>تأیید حساب حقوقی</Button><Button onClick={() => toast('درخواست بارگذاری دوبارهٔ روزنامهٔ رسمی ارسال شد.')}>درخواست تکمیل مدارک</Button><Button variant="danger" onClick={() => toast('حساب رد شد.')}>رد</Button></div></div></Card>}
      <Drawer open={!!c} onClose={close} width={520} title={c ? <span className="flex items-center gap-2"><Avatar name={c.name} />{c.name}<Badge dot={false}>{c.segment}</Badge></span> : ''}>
        {c && <div className="space-y-4">
          <div className="rounded-md bg-brand-tint/50 p-3 text-12 leading-5"><p className="mb-1 flex items-center gap-1 font-medium text-brand"><Sparkles size={12} />خلاصهٔ مشتری</p>{c.name} از {c.source} آمده، {fa(c.orders)} سفارش داشته و بیشتر اقساطی خرید می‌کند. احتمال ریزش {pct(c.churn)} است. بهترین اقدام بعدی: {c.churn > 50 ? 'کد بازگشت با مهلت کوتاه' : 'پیشنهاد کالای مکمل آخرین خرید'}.<p className="mt-1 text-11 text-t3">پیشنهاد AI؛ بازبینی نشده</p></div>
          <div className="grid grid-cols-3 gap-2">{[['LTV', compactToman(c.ltv)], ['AOV', compactToman(c.aov)], ['نرخ مرجوعی', pct(c.returnRate)]].map(([l, v]) => <div key={l} className="rounded-md bg-neutral-bg p-2 text-center"><p className="text-11 text-t3">{l}</p><p className="tnum text-13 font-bold">{v}</p></div>)}</div>
          <Card title="هویت (دادهٔ حساس پوشیده است)"><Row k="موبایل"><Masked id={`m-${c.id}`} value={c.mobile} label={`شمارهٔ موبایل ${c.name}`} /></Row><Row k="کد ملی"><Masked id={`n-${c.id}`} value={c.nid} label={`کد ملی ${c.name}`} /></Row><Row k="ایمیل"><span className="ltr">{c.email}</span></Row><Row k={<>احتمال ریزش<Hint k="churn" /></>}>{pct(c.churn)}</Row></Card>
          <Card title="کیف پول"><Row k="موجودی"><Money v={c.wallet} /></Row><div className="mt-2 flex gap-2"><Input className="ltr text-left font-mono" inputMode="numeric" placeholder="مثلاً 500,000" value={amt} onChange={(e) => setAmt(e.target.value)} /><Button onClick={charge}>شارژ کیف پول</Button></div></Card>
          <Card title="سفارش‌ها و رویدادها"><Timeline items={[...d.orders.filter((o) => o.customerId === c.id).map((o) => ({ at: o.createdAt, text: <button className="text-brand" onClick={() => nav(`/admin/orders/${o.id}`)}>سفارش {o.id} · {compactToman(o.total)}</button>, tone: 'ok' as const })), ...d.tickets.filter((t) => t.customerId === c.id).map((t) => ({ at: t.messages[0].at, text: `تیکت ${t.id}: ${t.subject}`, tone: 'warn' as const }))].sort((a, b) => (a.at < b.at ? 1 : -1))} /></Card>
          <div className="flex flex-wrap gap-2"><Button onClick={() => toast('کد تخفیف اختصاصی برای مشتری ارسال شد.')}>اهدای کد تخفیف</Button><Button onClick={() => toast('ورود به‌جای مشتری در لاگ ثبت شد. فقط مشاهده.')}>ورود به‌جای مشتری</Button><Button variant="danger" onClick={async () => { if (await confirm({ title: `مسدودسازی ${c.name}؟`, body: 'مشتری دیگر نمی‌تواند سفارش ثبت کند. سفارش‌های باز او ادامه پیدا می‌کنند. بعداً قابل برداشتن است.', confirm: 'مسدودسازی مشتری', danger: true })) { mutate((x) => { x.customers.find((y) => y.id === c.id)!.blocked = true }, { action: 'مسدودسازی مشتری', target: c.name }); toast('مشتری مسدود شد.') } }}>مسدودسازی</Button></div>
        </div>}
      </Drawer>
    </Page>
  )
}

const MACROS = ['سلام. پیگیری کردم؛ نتیجه را تا یک ساعت دیگر همین‌جا اطلاع می‌دهم.', 'پیک در مسیر است و حدود ۱۵ دقیقهٔ دیگر می‌رسد. لینک رصد برای شما پیامک شده است.', 'بابت این مشکل متأسفیم. قطعهٔ جاافتاده همین امروز رایگان برای شما ارسال می‌شود.']
export function Support() {
  const { d, customer } = useLookup(); const nav = useNavigate(); const [sp, setSp] = useSearchParams(); const [text, setText] = useState('')
  const open = d.tickets.filter((t) => t.status !== 'ticket.closed')
  const t = d.tickets.find((x) => x.id === sp.get('t')) ?? open[0]
  const pick = (id: string) => { setSp({ t: id }); setText('') }
  const send = (close: boolean) => { if (!t || !text.trim()) return toast('متن پاسخ خالی است.', { tone: 'err' }); mutate((x) => { const y = x.tickets.find((z) => z.id === t.id)!; y.messages.push({ from: 'agent', text, at: new Date().toISOString() }); y.status = close ? 'ticket.closed' : 'ticket.answered' }, { action: close ? 'پاسخ و بستن تیکت' : 'پاسخ به تیکت', target: t.id }); setText(''); toast(close ? 'پاسخ ارسال و تیکت بسته شد. مشتری از کانال ترجیحی‌اش خبردار شد.' : 'پاسخ ارسال شد.') }
  const draft = () => { if (!t) return; const o = d.orders.find((x) => x.id === t.orderId); setText(`سلام ${customer(t.customerId).name.split(' ')[0]} عزیز. دربارهٔ سفارش ${t.orderId}${o ? ` (${o.shipments[0]?.method ?? ''})` : ''} بررسی کردم. ${/پیک/.test(t.subject) ? 'پیک در مسیر است و حدود ۱۴ دقیقهٔ دیگر می‌رسد.' : /شارژر|نبود/.test(t.subject) ? 'حق با شماست؛ کابل باید داخل جعبه می‌بود. همین امروز رایگان برای شما ارسال می‌کنیم.' : 'نتیجه را تا یک ساعت دیگر اطلاع می‌دهم.'}`) }
  return (
    <Page title="پشتیبانی" module="support" sub="صندوق ورودی یکپارچه: چت سایت، تیکت، تماس و پیام‌رسان‌ها" empty={{ title: 'صندوق ورودی خالی است.', desc: 'پیام‌های مشتریان از همهٔ کانال‌ها اینجا می‌آید.' }}>
      {!t ? <Card><EmptyState title="همهٔ گفت‌وگوها پاسخ داده شده است." desc="پیام تازه که برسد، کارشناس کشیک طبق زنجیرهٔ کانال‌ها خبردار می‌شود." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
          <Card pad={false} className="self-start"><ul className="divide-y divide-line">{d.tickets.map((x) => (
            <li key={x.id}><button onClick={() => pick(x.id)} className={cx('block w-full px-3 py-2.5 text-right', x.id === t.id && 'bg-brand-tint/60')}>
              <div className="flex items-center justify-between gap-2"><span className="truncate text-13 font-medium">{customer(x.customerId).name}</span><SlaChip at={x.sla} done={['ticket.closed', 'ticket.answered'].includes(x.status)} /></div>
              <p className="truncate text-12 text-t2">{x.subject}</p><div className="mt-1 flex items-center justify-between"><StatusBadge s={x.status} /><span className="text-11 text-t3">{x.channel}</span></div></button></li>))}</ul></Card>
          <Card title={<span className="flex flex-wrap items-center gap-2">{t.subject}<CopyId v={t.id} /></span>} actions={<Badge tone={t.sentiment === 'ناراضی' ? 'danger' : 'neutral'}>{t.sentiment}</Badge>}>
            <div className="mb-4 max-h-80 space-y-2 overflow-y-auto">{t.messages.map((m, i) => <div key={i} className={cx('max-w-[85%] rounded-lg px-3 py-2 text-13 leading-6', m.from === 'customer' ? 'bg-neutral-bg' : 'mr-auto bg-brand-tint')}>{m.text}<p className="text-11 text-t3">{m.from === 'customer' ? customer(t.customerId).name : 'غنیمت'} · {rel(m.at)}</p></div>)}</div>
            {t.status === 'ticket.closed' ? <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2">این تیکت بسته است. تا ۷۲ ساعت با پیام مشتری بازگشایی می‌شود.</p> : <>
              <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="پاسخ را بنویسید یا از پیش‌نویس AI شروع کنید" />
              {text && text.startsWith('سلام ') && <div className="mt-1"><AITag confidence="بالا" source={`سفارش ${t.orderId}`} /></div>}
              <div className="mt-2 flex flex-wrap gap-1">{MACROS.map((m) => <button key={m} onClick={() => setText(m)} className="max-w-full truncate rounded-sm bg-neutral-bg px-2 py-1 text-11 text-t2 hover:text-brand">{m.slice(0, 38)}…</button>)}</div>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" icon={<Send size={14} />} onClick={() => send(true)}>ارسال و بستن تیکت</Button><Button onClick={() => send(false)}>فقط ارسال</Button><AIButton onClick={draft}>پیش‌نویس پاسخ</AIButton>{d.orders.find((o) => o.id === t.orderId)?.shipments.some((s) => s.warehouse === 'mahabad') && <Button variant="ghost" onClick={() => toast('پرسش به‌صورت یادداشت داخلی برای شریک انبار ارجاع شد.')}>ارجاع به شریک انبار</Button>}</div></>}
          </Card>
          <div className="space-y-4 lg:col-span-2 xl:col-span-1">
            <Card title="زمینه"><Row k="مشتری"><button className="text-brand" onClick={() => nav(`/admin/customers?c=${t.customerId}`)}>{customer(t.customerId).name}</button></Row><Row k="سفارش مرتبط"><button className="ltr font-mono text-brand" onClick={() => nav(`/admin/orders/${t.orderId}`)}>{t.orderId}</button></Row><Row k="اولویت">{t.priority}</Row><Row k="مسئول">{t.assignee || <Button size="sm" onClick={() => mutate((x) => { x.tickets.find((y) => y.id === t.id)!.assignee = 'من'; x.tickets.find((y) => y.id === t.id)!.status = 'ticket.open' }, { action: 'تخصیص تیکت به من', target: t.id })}>تخصیص به من</Button>}</Row></Card>
            <Card title={<span className="flex items-center gap-1 text-brand"><Sparkles size={13} />خلاصهٔ گفت‌وگو</span>}><p className="text-12 leading-5 text-t2">موضوع: {t.subject}. احساس مشتری: {t.sentiment}. فوریت: {t.priority}. مقالهٔ پیشنهادی: «داخل جعبهٔ هر کالا چه چیزهایی هست؟»</p></Card>
          </div>
        </div>)}
    </Page>
  )
}

export function Reviews() {
  const { d, customer, product, rule } = useLookup(); const [tab, setTab] = useTab('pending')
  const rows = d.reviews.filter((r) => tab === 'all' || r.status === 'review.pending')
  const act = (ids: string[], ok: boolean) => { const undo = snapshot(); mutate((x) => x.reviews.filter((r) => ids.includes(r.id)).forEach((r) => (r.status = ok ? 'review.approved' : 'review.rejected')), { action: ok ? 'تأیید دیدگاه' : 'رد دیدگاه', target: `${ids.length} دیدگاه` }); toast(`${fa(ids.length)} دیدگاه ${ok ? 'تأیید' : 'رد'} شد.`, { undo }) }
  return (
    <Page title="دیدگاه‌ها و پرسش‌ها" module="reviews" sub={`هدیهٔ دیدگاه ${toman(rule('review_gift'))} پس از پایان مهلت مرجوعی واریز می‌شود.`} empty={{ title: 'هنوز دیدگاهی ثبت نشده است.', desc: 'دیدگاه‌های خریداران پیش از نمایش در سایت اینجا تأیید می‌شوند.' }}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'pending', label: 'منتظر تأیید', count: d.reviews.filter((r) => r.status === 'review.pending').length }, { id: 'all', label: 'همهٔ دیدگاه‌ها', count: d.reviews.length }]} />}>
      <DataTable name="دیدگاه‌ها" rows={rows} rowKey={(r) => r.id} search={(r) => `${r.text} ${customer(r.customerId).name}`} empty={{ title: 'صف تأیید خالی است.', desc: 'همهٔ دیدگاه‌ها بررسی شده‌اند.' }}
        cols={[{ key: 'p', title: 'کالا و خریدار', render: (r) => <Cell a={product(r.productId).en} b={`${customer(r.customerId).name}${r.verified ? ' · خریدار تأییدشده' : ''}`} /> }, { key: 'r', title: 'امتیاز', render: (r) => <span className="tnum flex items-center gap-0.5">{fa(r.rating)}<Star size={12} className="fill-warning text-warning" /></span>, sort: (r) => r.rating }, { key: 't', title: 'متن', render: (r) => <span className="line-clamp-2 max-w-md text-12">{r.text}</span> }, { key: 'ai', title: 'بررسی AI', hideMobile: true, render: (r) => <Badge tone={r.ai === 'سالم' ? 'success' : 'danger'}>{r.ai}</Badge> }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> },
          { key: 'a', title: '', render: (r) => r.status === 'review.pending' && <span className="flex gap-1" onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={() => act([r.id], true)}>تأیید</Button><Button size="sm" variant="danger" onClick={() => act([r.id], false)}>رد</Button></span> }]}
        bulk={(ids, clear) => <><Button size="sm" variant="primary" onClick={() => { act(ids, true); clear() }}>تأیید {fa(ids.length)} دیدگاه</Button><Button size="sm" variant="danger" onClick={() => { act(ids, false); clear() }}>رد {fa(ids.length)} دیدگاه</Button></>} />
    </Page>
  )
}
