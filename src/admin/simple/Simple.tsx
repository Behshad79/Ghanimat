import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Boxes, Camera, Check, CheckCircle2, ClipboardCheck, HelpCircle, LayoutDashboard, MessageCircle, Package, PackagePlus, PhoneCall, Printer, RotateCcw, Search, Send, Star, Truck, Video, WifiOff, Zap } from 'lucide-react'
import { DemoBar } from '../shell/Shell'
import { Badge, Button, cx, Input, StatusBadge, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { SuccessCheck } from '@/shared/ui/motion'
import { currentUser, fakeCall, mutate, notify, permOf, setSession, useDB, useSession } from '@/shared/lib/store'
import { fa, minsLeft, num, rel, toman } from '@/shared/lib/fa'
import { CONDITION, WAREHOUSE } from '@/shared/data/statuses'
import { ProductImg } from '../pages/_shared'
import { PackPhotos } from '../shared/PackPhotos'
import { ProductWizard } from '../catalog/Wizard'
import { LiveAlert } from '../shared/LiveAlert'

/** حالت سریع: نمای روزمرهٔ اپراتور و خود مدیر روی موبایل. همهٔ کارها تا آخر انجام می‌شود؛ تأیید فقط جایی که مجوز «با تأیید» باشد. */
type Flow = null | 'orders' | 'ship' | 'msg' | 'add' | 'stock' | 'phone' | 'track' | 'returns' | 'reviews' | 'day'
const Big = ({ children, tone = 'go', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'go' | 'stop' | 'plain' | 'brand' }) => (
  <button {...p} className={cx('btn flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-16 font-bold disabled:opacity-40', tone === 'go' ? 'bg-success-solid text-white' : tone === 'brand' ? 'bg-brand-solid text-white' : tone === 'stop' ? 'bg-danger-bg text-danger' : 'border border-line bg-surface text-t1', p.className)}>{children}</button>
)
const Steps = ({ n, i }: { n: number; i: number }) => <div className="mb-4 flex gap-1">{Array.from({ length: n }).map((_, k) => <span key={k} className={cx('h-1.5 flex-1 rounded-full transition-colors', k <= i ? 'bg-success-solid' : 'bg-line')} />)}</div>

export function Simple() {
  const d = useDB(); const s = useSession(); const nav = useNavigate(); const me = currentUser()!
  const [flow, setFlow] = useState<Flow>(null); const [help, setHelp] = useState(false)
  const isBoss = me.role === 'super' || me.role === 'ops'
  const product = (id: string) => d.products.find((p) => p.id === id)!
  const ships = d.orders.flatMap((o) => o.shipments.filter((x) => x.warehouse === 'tehran').map((x) => ({ ...x, order: o })))
  const toApprove = d.orders.filter((o) => o.status === 'order.paid')
  const toPack = ships.filter((x) => ['ship.pending', 'ship.picking'].includes(x.status) && !['order.suspicious', 'order.awaiting_payment', 'order.paid'].includes(x.order.status))
  const toSend = ships.filter((x) => x.status === 'ship.packed')
  const msgs = d.tickets.filter((t) => ['ticket.new', 'ticket.open'].includes(t.status))
  const rets = d.returns.filter((r) => ['return.in_transit', 'return.awaiting_customer'].includes(r.status))
  const revs = d.reviews.filter((r) => r.status === 'review.pending')
  const urgent = [...toPack, ...toApprove.flatMap((o) => o.shipments.map((x) => ({ ...x, order: o })))].find((x) => x.warehouse === 'tehran' && /تحویل سریع/.test(x.method) && minsLeft(x.sla) < 120)
  const imgs = (pids: string[]) => <span className="flex">{[...new Set(pids)].slice(0, 3).map((pid, i) => <ProductImg key={pid} pid={pid} size={34} className={i ? '-mr-2 ring-2 ring-surface' : ''} />)}</span>
  const cards: [Flow, ReactNode, string, string, number, string[]][] = [
    ['orders', <Package size={22} />, 'سفارش‌های تازه', 'تأیید، جمع‌آوری و بسته‌بندی', toApprove.length + toPack.length, [...toApprove, ...toPack.map((x) => x.order)].flatMap((o) => o.shipments.flatMap((x) => x.items.map((i) => i.productId)))],
    ['ship', <Truck size={22} />, 'آمادهٔ ارسال', 'تحویل به پیک یا پست', toSend.length, toSend.flatMap((x) => x.items.map((i) => i.productId))],
    ['msg', <MessageCircle size={22} />, 'پیام مشتری‌ها', 'پاسخ کامل', msgs.length, []],
    ['add', <PackagePlus size={22} />, 'افزودن کالا', 'عکس، نام، قیمت و انتشار', 0, []],
    ['stock', <Boxes size={22} />, 'موجودی و قیمت', 'تغییر تعداد و قیمت', 0, d.products.slice(0, 3).map((p) => p.id)],
    ['phone', <PhoneCall size={22} />, 'سفارش تلفنی', 'ثبت برای مشتری پشت خط', 0, []],
    ['returns', <RotateCcw size={22} />, 'مرجوعی‌های رسیده', 'دریافت و مقایسهٔ عکس', rets.length, []],
    ['reviews', <Star size={22} />, 'دیدگاه‌ها', 'تأیید یا رد، با عکس مشتری', revs.length, revs.map((r) => r.productId)],
    ['track', <Search size={22} />, 'پیگیری سفارش', 'با نام، موبایل یا شماره', 0, []],
    ['day', <ClipboardCheck size={22} />, 'کارهای امروز', 'شروع و پایان روز', 0, []],
  ]
  const home = () => setFlow(null)
  return (
    <div className="flex h-full flex-col bg-bg">
      <DemoBar />
      <LiveAlert />
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-4">
        {flow ? <button onClick={home} className="btn flex min-h-11 items-center gap-1 rounded-lg px-2 text-14 font-semibold hover:bg-neutral-bg"><ArrowRight size={18} />خانهٔ حالت سریع</button> : <span className="flex items-center gap-2 text-14 font-bold"><img src="./brand/logo-mark.png" alt="" className="h-7" />حالت سریع</span>}
        <div className="flex items-center gap-2">
          {isBoss && <button onClick={() => nav('/admin')} className="btn flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-13 font-medium hover:bg-neutral-bg"><LayoutDashboard size={16} />پنل کامل</button>}
          <button onClick={() => setHelp(true)} className="btn flex min-h-10 items-center gap-1.5 rounded-lg bg-warning-bg px-3 text-13 font-bold text-warning"><HelpCircle size={16} />راهنما</button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4 text-15 leading-7">
        {s.viewState === 'offline' && <p className="mb-3 flex items-center gap-2 rounded-xl bg-warning-bg p-3 text-14 text-warning"><WifiOff size={18} />اتصال اینترنت قطع است. کار را ادامه دهید؛ با برگشت اتصال ثبت می‌شود.</p>}
        {!flow && <div className="page-enter">
          <h1 className="text-24 font-bold">سلام {me.name}</h1><p className="mb-4 text-t2">{toApprove.length + toPack.length + toSend.length + msgs.length ? `${fa(toApprove.length + toPack.length + toSend.length + msgs.length)} کار منتظر شماست.` : 'کاری باقی نمانده است.'}</p>
          {urgent && <button onClick={() => setFlow('orders')} className="lift mb-3 flex w-full items-center gap-3 rounded-xl bg-danger-solid p-4 text-right text-white"><Zap size={22} /><span className="flex-1"><b className="block text-16">سفارش تحویل سریع {urgent.order.id}</b><span className="text-14">{fa(Math.max(0, minsLeft(urgent.sla)))} دقیقه تا پایان مهلت. اول همین را آماده کنید.</span></span></button>}
          <div className="stagger grid grid-cols-2 gap-3">{cards.map(([f, icon, t, sub, n, pids]) => (
            <button key={t} onClick={() => setFlow(f)} className="lift relative flex min-h-36 flex-col items-start justify-between rounded-xl border border-line bg-surface p-4 text-right">
              <span className="grid size-11 place-items-center rounded-full bg-brand-tint text-brand">{icon}</span>
              <span className="w-full"><span className="block text-16 font-bold">{t}</span><span className="block text-13 text-t2">{sub}</span>{pids.length > 0 && <span className="mt-2 block">{imgs(pids)}</span>}</span>
              {n > 0 && <span className="tnum absolute top-3 left-3 grid h-8 min-w-8 place-items-center rounded-full bg-danger-solid px-2 text-15 font-bold text-white">{fa(n)}</span>}
            </button>))}</div>
          <div className="mt-4 rounded-xl border border-line bg-surface p-4"><p className="mb-2 text-13 font-semibold">آخرین کارهای ثبت‌شده</p><ul className="space-y-1.5 text-13">{d.audit.slice(0, 5).map((a, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{a.who}: {a.action} · <span className="text-t2">{a.target}</span></span><span className="shrink-0 text-11 text-t2">{rel(a.at)}</span></li>)}</ul></div>
        </div>}
        {flow === 'orders' && <OrdersFlow done={home} />}
        {flow === 'ship' && <ShipFlow done={home} />}
        {flow === 'msg' && <MsgFlow done={home} />}
        {flow === 'add' && <div className="-m-4"><ProductWizard quick onDone={(id) => { toast('کالا منتشر شد و در سایت دیده می‌شود.'); notify('کالای تازه از حالت سریع', `${me.name}: «${product(id).title}» منتشر شد.`, `/admin/catalog/${id}`); home() }} /></div>}
        {flow === 'stock' && <StockFlow />}
        {flow === 'phone' && <PhoneFlow done={home} />}
        {flow === 'returns' && <ReturnsFlow />}
        {flow === 'reviews' && <ReviewsFlow />}
        {flow === 'track' && <TrackFlow />}
        {flow === 'day' && <DayFlow done={home} />}
      </main>
      <Modal open={help} onClose={() => setHelp(false)} title="راهنما و کمک">
        <div className="space-y-2"><Big tone="plain" onClick={() => { setHelp(false); toast('ویدیوی ۳۰ ثانیه‌ای همین بخش پخش می‌شود.') }}><Video size={20} />ویدیوی آموزشی همین کار</Big><Big tone="plain" onClick={() => { setHelp(false); window.dispatchEvent(new CustomEvent('copilot', { detail: 'در حالت سریع چطور سفارش را بسته‌بندی و ارسال کنم؟' })) }}><MessageCircle size={20} />پرسش از دستیار</Big>{!isBoss && <Big tone="brand" onClick={() => { setHelp(false); notify('اپراتور کمک خواست', `${me.name} از حالت سریع کمک خواست.`, '/simple', 'عملیات', 'warning'); toast('به مدیر خبر داده شد.') }}><PhoneCall size={20} />خبر دادن به مدیر</Big>}</div>
      </Modal>
    </div>
  )
}

function Need({ action, children }: { action: string; children: (go: () => void) => ReactNode; }) { return <>{children(() => {})}</> }
const ask = (action: string, title: string) => { const m = permOf(action); if (m === 'deny') { toast(`مجوز «${action}» برای شما بسته است. از مدیر بخواهید آن را باز کند.`, { tone: 'err' }); return false } if (m === 'approve') { mutate((x) => { x.approvals.unshift({ id: `AP-${800 + x.approvals.length}`, type: action, title, ref: '-', amount: 0, by: currentUser()?.name ?? '', byRole: 'simple', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'درخواست از مدیر', target: title }); notify('درخواست تأیید از حالت سریع', title, '/admin/team?tab=approvals', 'عملیات', 'warning'); toast('این کار به تأیید مدیر نیاز دارد. درخواست ارسال شد.'); return false } return true }

function OrdersFlow({ done }: { done: () => void }) {
  const d = useDB(); const me = currentUser()!
  const list = d.orders.filter((o) => o.status === 'order.paid' || (o.status === 'order.preparing' && o.shipments.some((s) => s.warehouse === 'tehran' && ['ship.pending', 'ship.picking'].includes(s.status))))
  const [oid, setOid] = useState<string | null>(null); const [step, setStep] = useState(0); const [checks, setChecks] = useState<string[]>([]); const [scanErr, setScanErr] = useState('')
  const o = d.orders.find((x) => x.id === oid)
  if (!o) return list.length === 0 ? <Done text="سفارش تازه‌ای نمانده است." onHome={done} /> : (
    <div className="page-enter space-y-3"><h2 className="text-20 font-bold">سفارش‌های تازه</h2>{list.map((x) => { const c = d.customers.find((y) => y.id === x.customerId)!; return (
      <button key={x.id} onClick={() => { setOid(x.id); setStep(x.status === 'order.paid' ? 0 : 1) }} className="lift flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-right">
        <span className="flex">{x.shipments.flatMap((s) => s.items).slice(0, 2).map((i, k) => <ProductImg key={k} pid={i.productId} size={52} className={k ? '-mr-3 ring-2 ring-surface' : ''} />)}</span>
        <span className="min-w-0 flex-1"><b className="ltr block text-left font-mono text-14">{x.id}</b><span className="block truncate text-13 text-t2">{c.name} · {toman(x.total)}</span></span><StatusBadge s={x.status} />
      </button>) })}</div>)
  const ship = o.shipments.find((s) => s.warehouse === 'tehran' && !['ship.delivered', 'ship.cancelled', 'ship.handed', 'ship.in_transit', 'ship.packed'].includes(s.status)) ?? o.shipments[0]
  const c = d.customers.find((x) => x.id === o.customerId)!
  const items = ship.items
  const setShip = (st: string, label: string) => mutate((x) => { const oo = x.orders.find((y) => y.id === o.id)!; oo.shipments.find((y) => y.id === ship.id)!.status = st; if (oo.status === 'order.paid') oo.status = 'order.preparing' }, { action: label, target: ship.id })
  const STEPS = ['تأیید سفارش', 'جمع‌آوری', 'بسته‌بندی', 'عکس پیش از ارسال', 'چاپ برچسب و فاکتور']
  return (
    <div className="page-enter">
      <Steps n={STEPS.length} i={step} /><p className="mb-1 text-13 text-t2">{STEPS[step]} · گام {fa(step + 1)} از {fa(STEPS.length)}</p>
      <h2 className="mb-3 text-20 font-bold"><span className="ltr font-mono">{o.id}</span> · {c.name}</h2>
      {step === 0 && <><div className="mb-3 space-y-2">{o.shipments.map((s) => <div key={s.id} className="rounded-xl border border-line bg-surface p-3"><p className="mb-2 text-13 text-t2">{WAREHOUSE[s.warehouse]} · {s.method}</p>{s.items.map((it, k) => <div key={k} className="flex items-center gap-3 py-1"><ProductImg pid={it.productId} size={48} /><span className="flex-1 text-14">{d.products.find((p) => p.id === it.productId)?.title}</span><b className="tnum text-14">{toman(it.price)}</b></div>)}</div>)}</div>
        <p className="mb-4 rounded-xl bg-neutral-bg p-3 text-14">پرداخت: <b>{o.pay}</b> · مبلغ: <b>{toman(o.total)}</b>{o.risk > 70 && <span className="mt-1 block text-danger">امتیاز ریسک این سفارش بالاست؛ پیش از تأیید با مشتری تماس بگیرید.</span>}</p>
        <Big onClick={() => { if (!ask('تأیید سفارش', `تأیید سفارش ${o.id}`)) return; mutate((x) => { x.orders.find((y) => y.id === o.id)!.status = 'order.preparing' }, { action: 'تأیید سفارش (حالت سریع)', target: o.id }); notify('سفارش تأیید شد', `${me.name} سفارش ${o.id} را تأیید کرد.`, `/admin/orders/${o.id}`); setStep(1) }}><Check size={20} />تأیید سفارش و شروع آماده‌سازی</Big>
        <div className="mt-2"><Big tone="stop" onClick={async () => { if (!ask('لغو سفارش', `لغو سفارش ${o.id}`)) return; if (!(await askReason({ kind: 'order', ref: o.id, status: 'لغو سفارش', title: 'دلیل لغو (برای مشتری)' }))) return; mutate((x) => { const y = x.orders.find((z) => z.id === o.id)!; y.status = 'order.cancelled'; y.shipments.forEach((z) => (z.status = 'ship.cancelled')) }, { action: 'لغو سفارش (حالت سریع)', target: o.id }); notify('سفارش لغو شد', `${me.name} سفارش ${o.id} را لغو کرد.`, `/admin/orders/${o.id}`, 'عملیات', 'warning'); toast('سفارش لغو شد. بازگشت وجه در مالی پیگیری می‌شود.'); setOid(null) }}>لغو سفارش</Big></div></>}
      {step === 1 && <>{items.map((it, k) => { const u = d.units.find((x) => x.id === it.unitId); return <div key={k} className="mb-3 rounded-xl border border-line bg-surface p-3"><ProductImg pid={it.productId} size={400} rounded="rounded-lg" className="mb-3 !h-auto aspect-video !w-full" /><p className="text-16 font-bold">{d.products.find((p) => p.id === it.productId)?.title}</p><p className="text-14 text-t2">قفسه <b className="ltr font-mono text-t1">{u?.shelf ?? 'تعدادی'}</b> · {fa(it.qty)} عدد{u && <> · سریال <span className="ltr font-mono">{u.serial}</span></>}</p></div> })}
        {scanErr && <p className="mb-3 rounded-xl bg-danger-bg p-3 text-14 text-danger">{scanErr}</p>}
        <Big onClick={() => { setScanErr(''); setShip('ship.picking', 'جمع‌آوری (حالت سریع)'); setStep(2) }}><Camera size={20} />بارکد کالا اسکن شد</Big>
        <div className="mt-2"><Big tone="plain" onClick={() => setScanErr('این بارکد برای این سفارش نیست. کالا را به قفسه برگردانید و دوباره بررسی کنید.')}>نمونهٔ بارکد اشتباه</Big></div></>}
      {step === 2 && <><p className="mb-2 font-bold">این موارد را داخل بسته بگذارید:</p><div className="mb-4 space-y-2">{['خودِ کالا', 'برگهٔ کنترل کیفیت', 'کارت گارانتی', 'فاکتور'].map((i) => <button key={i} onClick={() => setChecks(checks.includes(i) ? checks.filter((x) => x !== i) : [...checks, i])} className={cx('flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-right', checks.includes(i) ? 'border-success bg-success-bg' : 'border-line bg-surface')}><span className={cx('grid size-7 place-items-center rounded-md border', checks.includes(i) ? 'border-success bg-success-solid text-white' : 'border-line')}>{checks.includes(i) && <Check size={18} />}</span>{i}</button>)}</div>
        <Big disabled={checks.length < 4} onClick={() => setStep(3)}>همه را گذاشتم</Big></>}
      {step === 3 && <><p className="mb-3 text-14">پیش از بستن، از کالا، سریال و بستهٔ باز عکس بگیرید. این عکس‌ها بایگانی می‌شوند تا در مرجوعی، کالای دیگری پس داده نشود.</p><div className="mb-4 rounded-xl border border-line bg-surface p-3"><PackPhotos orderId={o.id} shipId={ship.id} big /></div>
        <Big disabled={!(ship.packPhotos?.length)} onClick={() => setStep(4)}>عکس‌ها ثبت شد</Big>{!ship.packPhotos?.length && <p className="mt-2 text-center text-13 text-t2">دست‌کم یک عکس لازم است.</p>}</>}
      {step === 4 && <><div className="mb-3 grid grid-cols-2 gap-2"><Big tone="plain" onClick={() => window.open(`#/admin/print?doc=${/پست|تیپاکس|باربری/.test(ship.method) ? 'post' : 'courier'}&ship=${ship.id}`, '_blank')}><Printer size={18} />چاپ برچسب</Big><Big tone="plain" onClick={() => window.open(`#/admin/print?doc=invoice&orders=${o.id}`, '_blank')}><Printer size={18} />چاپ فاکتور</Big></div>
        <Big onClick={() => { mutate((x) => { const oo = x.orders.find((y) => y.id === o.id)!; oo.shipments.find((y) => y.id === ship.id)!.status = 'ship.packed'; oo.status = 'order.preparing' }, { action: 'بسته آماده شد (حالت سریع)', target: ship.id }); notify('بسته آماده شد', `${me.name} مرسولهٔ ${ship.id} را بسته‌بندی کرد.`, `/admin/orders/${o.id}`); toast('بسته آماده شد و به «آمادهٔ ارسال» رفت.'); setOid(null); setChecks([]); setStep(0) }}><CheckCircle2 size={20} />بسته آماده است</Big></>}
    </div>
  )
}

function ShipFlow({ done }: { done: () => void }) {
  const d = useDB(); const me = currentUser()!
  const list = d.orders.flatMap((o) => o.shipments.filter((x) => x.status === 'ship.packed' && x.warehouse === 'tehran').map((x) => ({ ...x, order: o })))
  const [sid, setSid] = useState<string | null>(null); const [v, setV] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(false)
  const s = list.find((x) => x.id === sid)
  if (ok) return <div className="page-enter py-10 text-center"><div className="mx-auto mb-4 grid place-items-center"><SuccessCheck size={64} /></div><p className="mb-6 text-20 font-bold">تحویل ثبت شد و به مشتری پیام رفت.</p><Big tone="plain" onClick={() => { setOk(false); setSid(null); setV('') }}>بستهٔ بعدی</Big></div>
  if (!s) return list.length === 0 ? <Done text="بستهٔ آماده‌ای نمانده است." onHome={done} /> : <div className="page-enter space-y-3"><h2 className="text-20 font-bold">آمادهٔ ارسال</h2>{list.map((x) => <button key={x.id} onClick={() => setSid(x.id)} className="lift flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-right"><ProductImg pid={x.items[0].productId} size={52} /><span className="flex-1"><b className="ltr block text-left font-mono">{x.id}</b><span className="text-13 text-t2">{x.method}</span></span>{x.packPhotos?.length ? <Badge tone="success">عکس ثبت شده</Badge> : <Badge tone="warning">بدون عکس</Badge>}</button>)}</div>
  const post = /پست|تیپاکس|باربری/.test(s.method)
  return (
    <div className="page-enter"><h2 className="mb-1 text-20 font-bold">{post ? 'تحویل به پست' : 'تحویل به پیک'}</h2><p className="mb-3 text-13 text-t2"><span className="ltr font-mono">{s.id}</span> · {s.method}</p>
      {!s.packPhotos?.length && <div className="mb-3 rounded-xl border border-warning/40 bg-warning-bg p-3"><p className="mb-2 text-13 text-warning">برای این مرسوله عکس پیش از ارسال ثبت نشده است.</p><PackPhotos orderId={s.order.id} shipId={s.id} /></div>}
      <p className="mb-2 font-bold">{post ? 'کد رهگیری روی رسید پست (۲۴ رقم) را وارد یا اسکن کنید' : 'لینک سفر پیک را بچسبانید'}</p>
      <Input className="ltr h-14 text-left font-mono text-16" value={v} onChange={(e) => setV(e.target.value)} placeholder={post ? '۲۴ رقم' : 'https://…'} />
      <button className="mt-2 text-14 text-brand" onClick={() => setV(post ? '120459870001245789632155' : 'https://app.snapp-box.example/track/SB-90500')}>مقدار نمونه</button>
      {err && <p className="mt-3 rounded-xl bg-danger-bg p-3 text-14 text-danger">{err}</p>}
      <div className="mt-4"><Big disabled={busy} onClick={async () => { setErr(''); if (post ? !/^\d{24}$/.test(v.replace(/\s/g, '')) : !/^https?:\/\//.test(v)) return setErr(post ? 'کد رهگیری باید ۲۴ رقم باشد. دوباره از روی رسید بررسی کنید.' : 'این لینک خوانده نشد. لینک را دوباره از برنامهٔ پیک کپی کنید.'); setBusy(true); try { await fakeCall(true) } catch { setBusy(false); return setErr('سرویس پاسخ نمی‌دهد. یک دقیقهٔ دیگر دوباره تلاش کنید.') } mutate((x) => { const o = x.orders.find((y) => y.id === s.order.id)!; const sh = o.shipments.find((y) => y.id === s.id)!; if (post) { sh.tracking = v.replace(/\s/g, ''); sh.status = 'ship.in_transit' } else { sh.courier = { name: 'حمید زارعی', phone: '09120000002', plate: '۸۷۶ ایران ۳۳', vehicle: 'موتور', eta: 25, code: 'SB-90500', cost: 190000 }; sh.status = 'ship.handed' } o.status = 'order.shipped' }, { action: post ? 'تحویل به پست (حالت سریع)' : 'تحویل به پیک (حالت سریع)', target: s.id }); notify('مرسوله ارسال شد', `${me.name}: ${s.id} ${post ? 'به پست' : 'به پیک'} تحویل شد.`, `/admin/orders/${s.order.id}`); setBusy(false); setOk(true) }}>{busy ? 'در حال ثبت…' : <><Send size={18} />{post ? 'به پست تحویل دادم' : 'تحویل پیک دادم'}</>}</Big></div>
    </div>
  )
}

function MsgFlow({ done }: { done: () => void }) {
  const d = useDB(); const list = d.tickets.filter((t) => ['ticket.new', 'ticket.open'].includes(t.status)); const [text, setText] = useState('')
  const m = list[0]
  if (!m) return <Done text="پیام بی‌پاسخی نمانده است." onHome={done} />
  const c = d.customers.find((x) => x.id === m.customerId)!; const o = d.orders.find((x) => x.id === m.orderId)
  const send = (close: boolean) => { if (!text.trim()) return toast('متن پاسخ خالی است.', { tone: 'err' }); if (!ask('پاسخ به پشتیبانی', `پاسخ به ${m.id}`)) return; mutate((x) => { const t = x.tickets.find((y) => y.id === m.id)!; t.messages.push({ from: 'agent', text, at: new Date().toISOString() }); t.status = close ? 'ticket.closed' : 'ticket.answered' }, { action: 'پاسخ به مشتری (حالت سریع)', target: m.id }); setText(''); toast('پاسخ ارسال شد و مشتری خبردار شد.') }
  return (
    <div className="page-enter"><p className="text-13 text-t2">{fa(list.length)} پیام بی‌پاسخ</p><h2 className="mb-2 text-20 font-bold">{c.name}: {m.subject}</h2>
      {o && <div className="mb-3 flex items-center gap-3 rounded-xl bg-neutral-bg p-3"><ProductImg pid={o.shipments[0]?.items[0]?.productId ?? ''} size={44} /><span className="text-13"><span className="ltr font-mono">{o.id}</span> · <StatusBadge s={o.status} /></span></div>}
      <div className="mb-3 space-y-2">{m.messages.map((x, i) => <p key={i} className={cx('rounded-xl p-3 text-14', x.from === 'customer' ? 'bg-surface' : 'mr-8 bg-brand-tint')}>{x.text}</p>)}</div>
      <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="پاسخ را بنویسید یا یکی از پیشنهادها را انتخاب کنید" />
      <div className="my-2 flex flex-wrap gap-1.5">{['سلام. بررسی کردم؛ همین امروز پیگیری و نتیجه را اعلام می‌کنم.', 'سلام. بسته در مسیر است و به‌زودی می‌رسد. لینک رصد برایتان پیامک شده است.', 'سلام. حق با شماست؛ قطعهٔ جاافتاده همین امروز رایگان ارسال می‌شود.'].map((r) => <button key={r} onClick={() => setText(r)} className="rounded-lg bg-neutral-bg px-2.5 py-1.5 text-12 text-t2 hover:text-brand">{r.slice(0, 34)}…</button>)}</div>
      <div className="grid grid-cols-2 gap-2"><Big onClick={() => send(true)}>ارسال و بستن</Big><Big tone="plain" onClick={() => send(false)}>فقط ارسال</Big></div>
    </div>
  )
}

function StockFlow() {
  const d = useDB(); const [q, setQ] = useState(''); const [edit, setEdit] = useState<{ id: string; price: string } | null>(null)
  const list = d.products.filter((p) => !q || p.title.includes(q) || p.en.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="page-enter"><h2 className="mb-3 text-20 font-bold">موجودی و قیمت</h2><Input className="mb-3 h-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی کالا" />
      <ul className="space-y-2">{list.map((p) => { const units = d.units.filter((u) => u.productId === p.id && u.status === 'unit.published'); const price = units[0]?.price ?? p.price ?? 0; return (
        <li key={p.id} className="rounded-xl border border-line bg-surface p-3"><div className="flex items-center gap-3"><ProductImg pid={p.id} size={52} /><div className="min-w-0 flex-1"><p className="truncate text-14 font-semibold">{p.title}</p><p className="tnum text-13 text-t2">{toman(price)}</p></div>
          {p.mode === 'qty' ? <div className="flex items-center gap-1.5"><button className="btn grid size-10 place-items-center rounded-lg border border-line text-18" onClick={() => mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; t.qty = { tehran: Math.max(0, (t.qty?.tehran ?? 0) - 1), mahabad: t.qty?.mahabad ?? 0 } }, { action: 'کاهش موجودی (حالت سریع)', target: p.title })}>−</button><b className="tnum w-8 text-center text-16">{fa(p.qty?.tehran ?? 0)}</b><button className="btn grid size-10 place-items-center rounded-lg border border-line text-18" onClick={() => mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; t.qty = { tehran: (t.qty?.tehran ?? 0) + 1, mahabad: t.qty?.mahabad ?? 0 } }, { action: 'افزایش موجودی (حالت سریع)', target: p.title })}>+</button></div> : <Badge dot={false}>{fa(units.length)} واحد</Badge>}</div>
          {edit?.id === p.id ? <div className="mt-2 flex gap-2"><Input className="ltr h-11 text-left font-mono" inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ id: p.id, price: e.target.value })} /><Button variant="primary" onClick={() => { const n = Number(edit.price.replace(/\D/g, '')); const cost = units[0]?.cost ?? p.cost ?? 0; if (!n) return toast('قیمت را وارد کنید.', { tone: 'err' }); if (cost && n < cost) return toast(`قیمت از قیمت تمام‌شده (${toman(cost)}) کمتر است.`, { tone: 'err' }); if (!ask('تغییر قیمت', `تغییر قیمت ${p.title} به ${toman(n)}`)) return; mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; if (t.mode === 'qty') t.price = n; x.units.filter((u) => u.productId === p.id && u.status === 'unit.published').forEach((u) => (u.price = n)) }, { action: 'تغییر قیمت (حالت سریع)', target: p.title, after: toman(n) }); notify('قیمت تغییر کرد', `«${p.title}» به ${toman(n)} تغییر کرد.`, `/admin/catalog/${p.id}`); setEdit(null); toast('قیمت جدید در سایت اعمال شد.') }}>ذخیره</Button></div>
            : <button className="mt-2 text-13 font-medium text-brand" onClick={() => setEdit({ id: p.id, price: String(price) })}>تغییر قیمت</button>}
        </li>) })}</ul></div>
  )
}

function PhoneFlow({ done }: { done: () => void }) {
  const d = useDB(); const me = currentUser()!
  const avail = d.products.filter((p) => p.status === 'product.published')
  const [pid, setPid] = useState(avail[0]?.id ?? ''); const [name, setName] = useState(''); const [mobile, setMobile] = useState(''); const [addr, setAddr] = useState(''); const [pay, setPay] = useState<'link' | 'inperson'>('link'); const [ship, setShip] = useState('پست پیشتاز')
  const p = d.products.find((x) => x.id === pid); const u = d.units.find((x) => x.productId === pid && x.status === 'unit.published'); const price = u?.price ?? p?.price ?? 0
  const submit = () => {
    if (!name.trim() || !/^09\d{9}$/.test(mobile.replace(/\D/g, ''))) return toast('نام و موبایل ۱۱ رقمی مشتری را وارد کنید.', { tone: 'err' })
    if (!ask('ثبت سفارش تلفنی', `سفارش تلفنی برای ${name}`)) return
    const id = `GH-${10500 + d.orders.length}`; const cid = `c${Date.now().toString(36)}`
    mutate((x) => {
      x.customers.unshift({ ...x.customers[1], id: cid, name, mobile: mobile.replace(/\D/g, ''), orders: 1, ltv: price, aov: price, lastOrder: new Date().toISOString(), segment: 'جدید', source: 'تماس تلفنی', wallet: 0, tags: ['سفارش تلفنی'], addr: { province: 'تهران', city: 'تهران', district: '', street: addr, sub: '', alley: '', plaque: '', floor: '', unit: '', postal: '' } } as any)
      x.orders.unshift({ id, customerId: cid, createdAt: new Date().toISOString(), status: pay === 'inperson' ? 'order.paid' : 'order.awaiting_payment', pay: pay === 'inperson' ? 'پرداخت حضوری' : 'لینک پرداخت', total: price, discount: 0, shippingFee: 0, fee: 0, margin: 15, risk: 10, channel: 'تلفنی', tags: ['سفارش تلفنی'], lockedBy: null, shipments: [{ id: `${id}-1`, warehouse: u?.warehouse ?? 'tehran', method: ship, status: 'ship.pending', sla: new Date(Date.now() + 864e5).toISOString(), items: [{ productId: pid, unitId: u?.id ?? '', qty: 1, price }], courier: null, tracking: '', allocReason: 'سفارش تلفنی' }] })
      if (u) x.units.find((y) => y.id === u.id)!.status = 'unit.reserved'
    }, { action: 'ثبت سفارش تلفنی (حالت سریع)', target: id })
    notify('سفارش تلفنی ثبت شد', `${me.name}: ${id} برای ${name}، ${toman(price)}`, `/admin/orders/${id}`)
    toast(pay === 'link' ? `سفارش ${id} ثبت شد و لینک پرداخت برای ${name} پیامک شد.` : `سفارش ${id} با پرداخت حضوری ثبت شد.`); done()
  }
  return (
    <div className="page-enter space-y-3"><h2 className="text-20 font-bold">سفارش تلفنی</h2>
      <p className="font-bold">کالا</p><div className="space-y-2">{avail.slice(0, 6).map((x) => <button key={x.id} onClick={() => setPid(x.id)} className={cx('flex w-full items-center gap-3 rounded-xl border p-2.5 text-right', pid === x.id ? 'border-brand bg-brand-tint/50' : 'border-line bg-surface')}><ProductImg pid={x.id} size={44} /><span className="flex-1 text-14">{x.title}</span></button>)}</div>
      <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام مشتری" /><Input className="ltr h-12 text-left font-mono" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09…" /><Textarea rows={2} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="نشانی (برای ارسال)" />
      <div className="grid grid-cols-2 gap-2">{['پست پیشتاز', 'تحویل سریع (پیک)'].map((m) => <button key={m} onClick={() => setShip(m)} className={cx('min-h-12 rounded-xl border text-14', ship === m ? 'border-brand bg-brand-tint font-bold text-brand' : 'border-line bg-surface')}>{m}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">{([['link', 'لینک پرداخت با پیامک'], ['inperson', 'پرداخت حضوری']] as const).map(([k, l]) => <button key={k} onClick={() => setPay(k)} className={cx('min-h-12 rounded-xl border text-14', pay === k ? 'border-brand bg-brand-tint font-bold text-brand' : 'border-line bg-surface')}>{l}</button>)}</div>
      <p className="rounded-xl bg-neutral-bg p-3 text-14">مبلغ: <b className="tnum">{toman(price)}</b></p>
      <Big onClick={submit}>{pay === 'link' ? 'ثبت و ارسال لینک پرداخت' : 'ثبت سفارش'}</Big>
    </div>
  )
}

function ReturnsFlow() {
  const d = useDB(); const list = d.returns.filter((r) => ['return.in_transit', 'return.awaiting_customer', 'return.inspecting'].includes(r.status)); const [rid, setRid] = useState<string | null>(null)
  const r = list.find((x) => x.id === rid)
  if (!r) return list.length === 0 ? <p className="py-10 text-center text-t2">مرجوعی منتظر دریافتی نیست.</p> : <div className="page-enter space-y-3"><h2 className="text-20 font-bold">مرجوعی‌ها</h2>{list.map((x) => { const u = d.units.find((y) => y.id === x.unitId); return <button key={x.id} onClick={() => setRid(x.id)} className="lift flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-right">{u ? <ProductImg pid={u.productId} size={52} /> : <span className="grid size-13 place-items-center rounded-lg bg-neutral-bg"><RotateCcw size={18} /></span>}<span className="flex-1"><b className="ltr block text-left font-mono">{x.id}</b><span className="text-13 text-t2">{x.reason}</span></span><StatusBadge s={x.status} /></button> })}</div>
  const o = d.orders.find((x) => x.id === r.orderId); const sh = o?.shipments.find((s) => s.items.some((i) => i.unitId === r.unitId)) ?? o?.shipments[0]
  return (
    <div className="page-enter"><h2 className="mb-3 text-20 font-bold">دریافت مرجوعی <span className="ltr font-mono">{r.id}</span></h2>
      <p className="mb-1 text-13 font-bold">عکس‌های پیش از ارسال (بایگانی)</p><div className="mb-3 rounded-xl border border-line bg-surface p-3">{o && sh ? <PackPhotos orderId={o.id} shipId={sh.id} readOnly big /> : <p className="text-13 text-t2">مرسوله پیدا نشد.</p>}</div>
      <p className="mb-3 text-14">کالای برگشتی را با این عکس‌ها و سریال مقایسه کنید. اگر یکی نیست، «کالا با ارسالی یکی نیست» را بزنید.</p>
      <Big onClick={() => { if (!ask('دریافت مرجوعی', `دریافت ${r.id}`)) return; mutate((x) => { x.returns.find((y) => y.id === r.id)!.status = 'return.inspecting' }, { action: 'دریافت مرجوعی (حالت سریع)', target: r.id }); notify('مرجوعی دریافت شد', `${r.id} در انبار دریافت شد و منتظر بازرسی است.`, '/admin/returns'); toast('دریافت ثبت شد. تصمیم بازگشت وجه با کارشناس مرجوعی است.'); setRid(null) }}>کالا را تحویل گرفتم و یکی است</Big>
      <div className="mt-2"><Big tone="stop" onClick={async () => { if (!(await askReason({ kind: 'return', ref: r.id, status: 'رد مرجوعی', title: 'دلیل رد مرجوعی (برای مشتری)' }))) return; mutate((x) => { x.returns.find((y) => y.id === r.id)!.status = 'return.rejected' }, { action: 'مغایرت مرجوعی با عکس ارسال (حالت سریع)', target: r.id }); notify('مغایرت در مرجوعی', `کالای برگشتی ${r.id} با عکس پیش از ارسال یکی نیست.`, '/admin/returns', 'عملیات', 'danger'); toast('مغایرت ثبت شد و به مدیر خبر داده شد.'); setRid(null) }}>کالا با ارسالی یکی نیست</Big></div>
    </div>
  )
}

function ReviewsFlow() {
  const d = useDB(); const list = d.reviews.filter((r) => r.status === 'review.pending')
  if (!list.length) return <p className="py-10 text-center text-t2">دیدگاهی منتظر تأیید نیست.</p>
  return <div className="page-enter space-y-3"><h2 className="text-20 font-bold">دیدگاه‌های منتظر تأیید</h2>{list.map((r) => (
    <div key={r.id} className="rounded-xl border border-line bg-surface p-3"><div className="mb-2 flex items-center gap-3"><ProductImg pid={r.productId} size={44} /><span className="flex-1 text-13"><b>{d.customers.find((c) => c.id === r.customerId)?.name}</b> · {fa(r.rating)} ستاره</span>{r.ai !== 'سالم' && <Badge tone="danger">{r.ai}</Badge>}</div>
      <p className="mb-2 text-14">{r.text}</p>{(r as any).media?.length > 0 && <div className="mb-2 flex gap-2">{(r as any).media.map((m: any, i: number) => <img key={i} src={m.src} alt="" className="size-16 rounded-lg object-cover" />)}</div>}
      <div className="grid grid-cols-2 gap-2"><Big onClick={() => { if (!ask('تأیید دیدگاه', `تأیید ${r.id}`)) return; mutate((x) => { x.reviews.find((y) => y.id === r.id)!.status = 'review.approved' }, { action: 'تأیید دیدگاه (حالت سریع)', target: r.id }); toast('دیدگاه تأیید شد.') }}>تأیید</Big><Big tone="stop" onClick={() => { mutate((x) => { x.reviews.find((y) => y.id === r.id)!.status = 'review.rejected' }, { action: 'رد دیدگاه (حالت سریع)', target: r.id }); toast('دیدگاه رد شد.') }}>رد</Big></div>
    </div>))}</div>
}

function TrackFlow() {
  const d = useDB(); const nav = useNavigate(); const [q, setQ] = useState('')
  const found = q.length > 2 ? d.orders.filter((o) => o.id.includes(q.toUpperCase()) || d.customers.find((c) => c.id === o.customerId)!.name.includes(q) || d.customers.find((c) => c.id === o.customerId)!.mobile.includes(q)).slice(0, 5) : []
  return <div className="page-enter"><h2 className="mb-3 text-20 font-bold">پیگیری سفارش</h2><Input className="mb-4 h-14 text-16" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل یا شمارهٔ سفارش" />
    {found.map((o) => <div key={o.id} className="mb-2 rounded-xl border border-line bg-surface p-4"><div className="flex items-center gap-3"><ProductImg pid={o.shipments[0]?.items[0]?.productId ?? ''} size={48} /><b className="ltr flex-1 text-left font-mono">{o.id}</b><StatusBadge s={o.status} /></div>
      <p className="mt-2 text-14">{o.status === 'order.shipped' ? 'بسته در مسیر است.' : o.status === 'order.delivered' ? 'بسته تحویل شده است.' : o.status === 'order.cancelled' ? 'سفارش لغو شده و وجه بازگردانده می‌شود.' : 'سفارش در حال آماده‌سازی است.'}</p>
      <p className="mt-2 rounded-lg bg-neutral-bg p-3 text-13">به مشتری بگویید: «سفارش {o.id} ثبت است و {o.status === 'order.shipped' ? 'به‌زودی به دستتان می‌رسد' : o.status === 'order.delivered' ? 'تحویل شده است' : 'وضعیت آن را برایتان پیامک می‌کنیم'}.»</p>
      <button className="mt-2 text-13 font-medium text-brand" onClick={() => nav(`/admin/orders/${o.id}`)}>جزئیات کامل در پنل</button></div>)}
    {q.length > 2 && !found.length && <p className="text-t2">سفارشی پیدا نشد. نام یا شماره را دوباره بررسی کنید.</p>}</div>
}

function DayFlow({ done }: { done: () => void }) {
  const d = useDB(); const me = currentUser()!; const [ok, setOk] = useState<string[]>([])
  const items = d.simpleDay.started ? ['بسته‌ای روی میز نمانده است', 'چاپگر خاموش شد', 'در انبار قفل شد'] : ['چاپگر روشن است', 'برچسب و کاغذ کافی هست', 'اتصال اینترنت برقرار است']
  const today = d.audit.filter((a) => Date.now() - new Date(a.at).getTime() < 864e5 && a.who === me.name)
  return <div className="page-enter"><h2 className="mb-3 text-20 font-bold">{d.simpleDay.started ? 'پایان روز' : 'شروع روز'}</h2>
    <div className="mb-4 space-y-2">{items.map((i) => <button key={i} onClick={() => setOk(ok.includes(i) ? ok.filter((x) => x !== i) : [...ok, i])} className={cx('flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-right', ok.includes(i) ? 'border-success bg-success-bg' : 'border-line bg-surface')}><span className={cx('grid size-7 place-items-center rounded-md border', ok.includes(i) ? 'border-success bg-success-solid text-white' : 'border-line')}>{ok.includes(i) && <Check size={18} />}</span>{i}</button>)}</div>
    {d.simpleDay.started && <div className="mb-4 rounded-xl bg-neutral-bg p-3 text-14"><b>گزارش امروز:</b> {fa(today.length)} کار ثبت شد{today.length ? ` (آخرین: ${today[0].action})` : ''}.</div>}
    <Big disabled={ok.length < items.length} onClick={() => { mutate((x) => { x.simpleDay.started = !x.simpleDay.started }, { action: d.simpleDay.started ? 'گزارش پایان روز' : 'شروع روز', target: me.name }); if (d.simpleDay.started) notify('گزارش پایان روز', `${me.name}: ${fa(today.length)} کار در حالت سریع ثبت شد.`, '/admin/team?tab=audit'); toast(d.simpleDay.started ? 'گزارش امروز برای مدیر ارسال شد.' : 'روز کاری شروع شد.'); done() }}>{d.simpleDay.started ? 'ارسال گزارش امروز برای مدیر' : 'شروع روز کاری'}</Big></div>
}
const Done = ({ text, onHome }: { text: string; onHome: () => void }) => <div className="page-enter py-10 text-center"><div className="mx-auto mb-4 grid place-items-center"><SuccessCheck size={60} /></div><p className="mb-6 text-20 font-bold">{text}</p><Big tone="plain" onClick={onHome}>بازگشت به خانه</Big></div>
export { Need, num, CONDITION, setSession }
