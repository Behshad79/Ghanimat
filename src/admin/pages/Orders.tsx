import { BrandLogo, WithLogo } from '@/shared/ui/brandLogo'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardPaste, ExternalLink, Eye, Link2, Lock, MapPin, PackageCheck, Pencil, Phone, Printer, ScanLine, Sparkles, Truck, Undo2, Warehouse } from 'lucide-react'
import { AITag, Avatar, Badge, Button, Card, CopyId, Field, Input, Masked, Row, Segmented, Select, StatusBadge, Tabs, copyText, cx } from '@/shared/ui/base'
import { Page, Stepper, StickyStepBar, Timeline, useScrolledPast } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { confirm, Drawer, Hint, Modal, toast } from '@/shared/ui/overlay'
import { askReason, ReasonLog } from '@/shared/ui/reason'
import { CustomerProgress, rollShipped } from '../orders/Progress'
import { canSecret, currentUser, isChief, fakeCall, getDB, mutate, snapshot } from '@/shared/lib/store'
import { OrdersOverview } from '../orders/OrdersOverview'
import { DateFilter, inRange, useDateRange } from '@/shared/ui/datefilter'
import { PickupDesk, PickupReceipt } from '../orders/PickupDesk'
import { VariantChips } from '../catalog/Choices'
import { ShipChips, SplitBanner } from '../orders/Split'
import { OrderAlerts, openEvents } from '../orders/OrderEvents'
import { PackPhotos } from '../shared/PackPhotos'
import { NoteBanner, OrderNotes, openNotes } from '../orders/OrderNotes'
import { DecisionPanel } from '../orders/Decision'
import { PayHoldCard, shipBlocked, holdOf } from '../orders/PayHold'
import { ChangeHistory, RollbackShip } from '../orders/History'
import { PackRecord, PackSession } from '../stock/Packing'
import { PaymentInfo } from '../orders/PaymentInfo'
import { Installments } from '../orders/Installments'
import { CancelSummary } from '../orders/OrderEvents'
import { OrderProfitCard } from '../finance/Money'
import { AddressEdit, callTo, ManualOrder, MessageModal, OrderEdit } from '../orders/OrderTools'
import { compactToman, fa, pct, rel, toman, g } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import type { Order } from '@/shared/data/seed'
import { Cell, Money, ProductImg, SlaChip, useLookup, useTab, CustLink } from './_shared'
import { applyRestock, restockLabel, RestockChoice, type RestockMode } from '../orders/Restock'
import { createRefund, RefundDest, RefundPanel } from '../orders/Refunds'
import { OrderPeek } from '../orders/OrderPeek'
import { OrderReturns, ReturnShipButton } from '../orders/OrderReturns'
import { DeliveredCelebration } from '../orders/Delivered'
import { DeliverConfirm } from '../orders/DeliverConfirm'
import { QuickPrint } from '../print/QuickPrint'
import { StoreSale } from '../stock/ExtSites'
import { OrderLedger } from '../stock/OrderLedger'
import { guardForeign, myWarehouses } from '../stock/foreign'
import { partyLogo } from '../stock/common'

// سفارشی که رویداد باز دارد (درخواست لغو، کمبود موجودی، تغییر مشتری) در «نیازمند اقدام» هم می‌آید
const evOpen = { has: (id: string) => getDB().orderEvents.some((e) => e.status === 'open' && e.orderId === id) }
const TABS: [string, string, (o: Order) => boolean][] = [
  ['all', 'همه', () => true],
  ['action', 'نیازمند اقدام', (o) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(o.status) || evOpen.has(o.id)],
  ['decision', 'نیازمند تصمیم مشتری', (o) => o.status === 'order.needs_decision'],
  ['unpaid', 'در انتظار پرداخت یا اعتبار', (o) => ['order.awaiting_payment', 'order.awaiting_credit'].includes(o.status)],
  ['preparing', 'آماده‌سازی', (o) => ['order.paid', 'order.preparing'].includes(o.status)],
  ['shipped', 'ارسال‌شده', (o) => o.status === 'order.shipped'],
  ['delivered', 'تحویل‌شده', (o) => o.status === 'order.delivered'],
  ['pickup', 'دریافت حضوری', () => false],
  ['cancelled', 'لغو و مرجوعی', (o) => ['order.cancelled', 'order.returned'].includes(o.status)],
  ['suspicious', 'مشکوک', (o) => o.status === 'order.suspicious'],
]
export function Orders() {
  const { d, customer, product } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('all'); const [sp] = useSearchParams()
  const [peek, setPeek] = useState<string | null>(null)
  const uid = currentUser()?.id ?? 'u'; const mineWh = myWarehouses()
  const [wh, setWhRaw] = useState(() => { try { return localStorage.getItem(`gh-orders-wh-${uid}`) ?? (mineWh.length && !mineWh.includes('tehran') ? mineWh[0] : 'all') } catch { return 'all' } })
  const setWh = (v: string) => { setWhRaw(v); try { localStorage.setItem(`gh-orders-wh-${uid}`, v) } catch { /* فقط در حافظه */ } }
  const [own, setOwnRaw] = useState(() => { try { return localStorage.getItem(`gh-orders-own-${uid}`) ?? 'all' } catch { return 'all' } })
  const setOwn = (v: string) => { setOwnRaw(v); try { localStorage.setItem(`gh-orders-own-${uid}`, v) } catch { /* فقط در حافظه */ } }
  const [manual, setManual] = useState(sp.get('new') === '1'); const [store, setStore] = useState(sp.get('store') === '1'); const [view, setView] = useState<'list' | 'kanban'>('list')
  /** مالک کالاهای هر سفارش: بعد از بسته‌بندی از فروش ثبت‌شده، قبل از آن از موجودی همان انبار (مالک‌هایی که این کالا را دارند) */
  const ownersOf = (o: Order) => { const sold = d.stock.sales.filter((x) => x.orderId === o.id).map((x) => x.owner); if (sold.length) return new Set(sold)
    return new Set(o.shipments.flatMap((s) => s.items.flatMap((it) => d.stock.lots.filter((l) => l.productId === it.productId && l.warehouse === s.warehouse && l.qty > 0).map((l) => l.owner)))) }
  const whOk = (o: Order) => wh === 'all' || (wh === 'both' ? o.shipments.some((s) => s.warehouse === 'tehran') && o.shipments.some((s) => s.warehouse === 'mahabad') : o.shipments.some((s) => s.warehouse === wh && s.status !== 'ship.cancelled'))
  const ownOk = (o: Order) => own === 'all' || ownersOf(o).has(own)
  const [dr, setDr] = useDateRange(); const dated = d.orders.filter((o) => inRange(o.createdAt, dr) && whOk(o) && ownOk(o)); const datedAll = d.orders.filter((o) => inRange(o.createdAt, dr))
  const rows = dated.filter(TABS.find((t) => t[0] === tab)?.[2] ?? (() => true))
  const whCount = (w: string) => datedAll.filter(TABS.find((t) => t[0] === tab)?.[2] ?? (() => true)).filter((o) => w === 'all' || (w === 'both' ? o.shipments.some((s) => s.warehouse === 'tehran') && o.shipments.some((s) => s.warehouse === 'mahabad') : o.shipments.some((s) => s.warehouse === w && s.status !== 'ship.cancelled'))).length
  const scope = <div className="flex flex-wrap items-center gap-1.5">
    <span className="ml-1 flex items-center gap-1 text-12 font-semibold text-t2"><Warehouse size={14} />انبار</span>
    {([['all', 'همه'], ...d.stock.warehouses.map((w) => [w.id, w.name] as [string, string]), ['both', 'هر دو انبار']] as [string, string][]).map(([k, l]) => <button key={k} type="button" aria-pressed={wh === k} onClick={() => setWh(k)} className={cx('flex h-8 items-center gap-1.5 rounded-full border px-3 text-12 transition-colors', wh === k ? 'border-brand bg-brand-solid text-white' : 'border-line hover:border-brand/50')}>{(() => { const op = d.stock.parties.find((p) => p.id === d.stock.warehouses.find((w) => w.id === k)?.operator); const lg = partyLogo(op); return lg ? <span title={`گرداننده: ${op?.brandName ?? op?.name}`} className={cx('grid size-5 place-items-center rounded', wh === k && 'bg-white')}><img src={lg} alt="" className="size-4 object-contain" /></span> : null })()}{l}{mineWh.includes(k) && <span className={cx('rounded-full px-1.5 text-11', wh === k ? 'bg-white/20' : 'bg-brand-tint text-brand')}>من</span>}<span className={cx('tnum text-11', wh === k ? 'text-white/80' : 'text-t3')}>{fa(whCount(k))}</span></button>)}
  </div>
  const cols: Col<Order>[] = [
    { key: 'id', title: 'شماره', render: (o) => <span className="flex items-center gap-1"><button type="button" aria-label={`نمای سریع سفارش ${o.id}`} title="نمای سریع" onClick={(e) => { e.stopPropagation(); setPeek(o.id) }} className="grid size-7 place-items-center rounded-md text-t3 hover:bg-brand-tint hover:text-brand"><Eye size={15} /></button><CopyId v={o.id} />{o.lockedBy && <Lock size={12} className="text-warning" />}{openNotes(o) > 0 && <span title={`${openNotes(o)} درخواست مشتری انجام‌نشده`} className="rounded-full bg-warning-bg px-1.5 text-[10px] font-semibold text-warning">یادداشت</span>}{openEvents(d, o.id).length > 0 && <span title={openEvents(d, o.id).map((e) => e.title).join('، ')} className="flex items-center gap-1 rounded-full bg-danger-solid px-1.5 py-0.5 text-[10px] font-semibold text-white"><span className="size-1.5 animate-pulse rounded-full bg-white" />{openEvents(d, o.id)[0].title.split(' ').slice(0, 2).join(' ')}</span>}</span>, sort: (o) => o.id, text: (o) => o.id },
    { key: 'customer', title: 'مشتری', render: (o) => <Cell a={<CustLink v={customer(o.customerId).name} id={o.customerId} />} b={customer(o.customerId).city} />, text: (o) => customer(o.customerId).name },
    { key: 'items', title: 'کالاها', hideMobile: true, render: (o) => { const it = o.shipments.flatMap((s) => s.items); return it.length ? <span className="flex items-center" title={it.map((i) => product(i.productId).title).join('، ')}>{it.slice(0, 3).map((i, k) => <ProductImg key={k} pid={i.productId} size={32} className={k ? '-mr-2 ring-2 ring-surface' : ''} />)}{it.length > 3 && <span className="tnum mr-1 text-11 text-t2">+{fa(it.length - 3)}</span>}</span> : '—' } },
    { key: 'total', title: 'مبلغ', align: 'left', render: (o) => <Money v={o.total} />, sort: (o) => o.total, text: (o) => o.total },
    { key: 'pay', title: 'روش پرداخت', hideMobile: true, render: (o) => <span className="flex flex-wrap items-center gap-1">{o.pay.split('+').map((x) => <WithLogo key={x} name={x.trim()} size={16} />)}</span>, text: (o) => o.pay },
    { key: 'payKind', title: 'نوع پرداخت', optional: true, render: (o) => (d.providers.some((p) => p.family === 'bnpl' && o.pay.includes(p.name)) ? 'اقساطی' : /کارت به کارت|کارت‌به‌کارت/.test(o.pay) ? 'کارت به کارت' : /کیف/.test(o.pay) ? 'کیف پول' : 'درگاه آنلاین'), text: (o) => (d.providers.some((p) => p.family === 'bnpl' && o.pay.includes(p.name)) ? 'اقساطی' : /کارت به کارت|کارت‌به‌کارت/.test(o.pay) ? 'کارت به کارت' : /کیف/.test(o.pay) ? 'کیف پول' : 'درگاه آنلاین') },
    { key: 'city', title: 'شهر', optional: true, render: (o) => customer(o.customerId).city, text: (o) => customer(o.customerId).city },
    { key: 'wh', title: 'انبار', optional: true, render: (o) => [...new Set(o.shipments.map((s) => WAREHOUSE[s.warehouse]))].join('، '), text: (o) => [...new Set(o.shipments.map((s) => WAREHOUSE[s.warehouse]))].join('، ') },
    { key: 'method', title: 'روش ارسال', optional: true, render: (o) => <span className="flex flex-wrap gap-1">{[...new Set(o.shipments.map((s) => s.method))].map((m) => <WithLogo key={m} name={m} size={16} />)}</span>, text: (o) => [...new Set(o.shipments.map((s) => (/پست|پیشتاز/.test(s.method) ? 'پست' : /حضوری/.test(s.method) ? 'تحویل حضوری' : /سریع|پیک|اسنپ/.test(s.method) ? 'پیک و ارسال سریع' : s.method)))].join('، ') },
    { key: 'buyer', title: 'نوع خریدار', optional: true, render: (o) => (o.buyer === 'legal' ? 'حقوقی' : 'حقیقی'), text: (o) => (o.buyer === 'legal' ? 'حقوقی' : 'حقیقی') },
    { key: 'disc', title: 'تخفیف', optional: true, render: (o) => (o.discount ? <Money v={o.discount} /> : '—'), text: (o) => (o.discount ? 'با تخفیف' : 'بدون تخفیف') },
    { key: 'cnt', title: 'تعداد اقلام', optional: true, align: 'left', render: (o) => fa(o.shipments.flatMap((s) => s.items).length), text: (o) => o.shipments.flatMap((s) => s.items).length },
    { key: 'printed', title: 'فاکتور چاپ‌شده', optional: true, render: (o) => (d.printLog.some((x) => x.doc === 'invoice' && x.ref === o.id) ? 'چاپ شده' : 'چاپ نشده'), text: (o) => (d.printLog.some((x) => x.doc === 'invoice' && x.ref === o.id) ? 'چاپ شده' : 'چاپ نشده') },
    { key: 'ships', title: 'ارسال و مرسوله‌ها', render: (o) => <ShipChips o={o} />, text: (o) => o.shipments.map((s) => `${WAREHOUSE[s.warehouse]} ${s.method}`).join(' + ') + (o.shipments.length > 1 ? ' چندمرسوله‌ای' : '') },
    { key: 'channel', title: 'کانال', optional: true, render: (o) => <WithLogo name={o.channel} size={16} />, text: (o) => o.channel },
    { key: 'seller', title: 'فروشنده', optional: true, render: () => 'غنیمت' },
    { key: 'status', title: 'وضعیت', render: (o) => <span className="flex flex-wrap items-center gap-1"><StatusBadge s={o.status} />{holdOf(o) && <Badge tone="danger" dot={false}>قفل: منتظر مابه‌التفاوت</Badge>}</span>, sort: (o) => o.status, text: (o) => o.status },
    { key: 'sla', title: <>مهلت<Hint k="sla" /></>, render: (o) => o.shipments[0] ? <SlaChip at={o.shipments[0].sla} done={['order.delivered', 'order.cancelled', 'order.returned'].includes(o.status)} /> : '—', sort: (o) => o.shipments[0]?.sla ?? '' },
    { key: 'age', title: 'ثبت', hideMobile: true, render: (o) => <span className="text-12 text-t3">{rel(o.createdAt)}</span>, sort: (o) => o.createdAt },
  ]
  return (
    <Page title="سفارش‌ها" module="orders" primary={<Button variant="primary" onClick={() => setManual(true)}>ثبت سفارش دستی</Button>} actions={<><Button icon={<ScanLine size={14} />} onClick={() => setStore(true)} title="فروش در مغازه با اسکن برچسب؛ مالک کالا از کد معلوم است">فروش حضوری</Button><Button icon={<Printer size={14} />} onClick={() => nav('/admin/print?view=batch&range=today')}>چاپ گروهی</Button></>}
      empty={{ title: 'هنوز سفارشی ثبت نشده است.', desc: 'سفارش‌های سایت و کانال‌های فروش اینجا نمایش داده می‌شوند. برای سفارش تلفنی یا حضوری، سفارش دستی ثبت کنید.', action: <Button variant="primary" onClick={() => setManual(true)}>ثبت سفارش دستی</Button> }}
      tabs={<Tabs value={tab} onChange={setTab} tabs={TABS.map(([id, label, f]) => ({ id, label, count: id === 'all' ? undefined : id === 'pickup' ? d.pickups.filter((p) => p.status === 'ready' || p.status === 'preparing').length : dated.filter(f).length }))} />}>
      {tab !== 'pickup' && <DateFilter r={dr} set={setDr} count={rows.length} total={d.orders.filter((o) => whOk(o) && ownOk(o)).filter(TABS.find((t) => t[0] === tab)?.[2] ?? (() => true)).length} extra={scope} />}
      {tab === 'all' && <OrdersOverview />}
      {tab === 'pickup' && <PickupDesk />}
      {tab !== 'pickup' && <div className="mb-3 flex justify-end"><Segmented size="sm" value={view} onChange={setView} options={[['list', 'فهرست'], ['kanban', 'کانبان وضعیت']]} /></div>}
      {tab !== 'pickup' && view === 'kanban' && <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-5">{([['در انتظار تأیید', ['order.paid', 'order.awaiting_payment', 'order.suspicious', 'order.needs_decision']], ['در حال آماده‌سازی', ['order.preparing']], ['ارسال یا آماده در شعبه', ['order.shipped', 'order.pickup_ready']], ['تحویل‌شده', ['order.delivered']], ['لغو و مرجوعی', ['order.cancelled', 'order.returned']]] as [string, string[]][]).map(([col, sts]) => { const list = rows.filter((o) => sts.includes(o.status)); return <div key={col} className="min-w-56 rounded-2xl bg-neutral-bg/60 p-2"><p className="mb-2 flex items-center justify-between px-1 text-13 font-semibold">{col}<Badge dot={false}>{fa(list.length)}</Badge></p><div className="space-y-2">{list.map((o) => <button key={o.id} onClick={() => nav(`/admin/orders/${o.id}`)} className="lift block w-full rounded-xl border border-line bg-surface p-2.5 text-right text-12"><span className="flex items-center justify-between"><span className="ltr font-mono">{o.id}</span><StatusBadge s={o.status} /></span><span className="mt-1 block truncate">{customer(o.customerId).name}</span><span className="mt-1 flex justify-between text-t2"><span>{o.channel}</span><b className="tnum text-t1">{compactToman(o.total)}</b></span></button>)}{list.length === 0 && <p className="px-1 py-4 text-center text-11 text-t3">خالی</p>}</div></div> })}</div>}
      <OrderPeek id={peek} onClose={() => setPeek(null)} />
      {tab !== 'pickup' && view === 'list' && <DataTable name="سفارش‌ها" rows={rows} cols={cols} rowKey={(o) => o.id} onRow={(o) => nav(`/admin/orders/${o.id}`)}
        search={(o) => `${o.id} ${customer(o.customerId).name} ${customer(o.customerId).mobile} ${o.pay}`}
        filters={<><Select value={wh} onChange={setWh} options={[['all', 'همهٔ انبارها'], ...d.stock.warehouses.map((w) => [w.id, w.name] as [string, string]), ['both', 'هر دو انبار']]} className="w-36" other={false} /><Select value={own} onChange={setOwn} options={[['all', 'همهٔ مالک‌ها'], ...d.stock.parties.filter((p) => p.active).map((p) => [p.id, `کالای ${p.name}${p.brandName ? ` (${p.brandName})` : ''}`] as [string, string])]} className="w-44" other={false} /></>}
        empty={{ title: 'سفارشی در این نما نیست.', desc: 'نمای دیگری را انتخاب کنید یا فیلتر انبار را بردارید.' }}
        bulk={(ids, clear) => <>
          <span className="w-44"><Select label="چاپ گروهی" value="" placeholder={`چاپ گروهی ${fa(ids.length)} سفارش…`} other={false} onChange={(v) => { nav(`/admin/print?view=batch&orders=${ids.join(',')}&docs=${v}`); clear() }} options={[['invoice', 'چاپ فاکتورها'], ['post', 'چاپ برچسب و رسید پستی'], ['courier', 'چاپ برچسب پیک'], ['pickup', 'چاپ رسید تحویل حضوری'], ['pick', 'لیست جمع‌آوری تجمیعی انبار'], ['invoice,post,courier', 'فاکتور و برچسب ارسال با هم'], ['manifest', 'مانیفست تحویل به پست']]} /></span>
          <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/print?orders=${ids.join(',')}`); clear() }}>چاپ بستهٔ کامل {fa(ids.length)} سفارش</Button>
          <Button size="sm" onClick={() => { const undo = snapshot(); mutate((x) => x.orders.filter((o) => ids.includes(o.id)).forEach((o) => (o.lockedBy = null, o.tags = [...new Set([...o.tags, 'تخصیص: نیما'])])), { action: 'تخصیص سفارش به انباردار', target: ids.join('، ') }); toast(`${fa(ids.length)} سفارش به نیما تخصیص یافت.`, { undo }); clear() }}>تخصیص به انباردار</Button>
        </>} />}
      <ManualOrder open={manual} onClose={() => setManual(false)} />
      <Drawer open={store} onClose={() => setStore(false)} width={760} title="فروش حضوری در مغازه"><StoreSale /></Drawer>
    </Page>
  )
}

// ───── چسباندن هوشمند (بخش ۵.۶): لینک پیک یا کد رهگیری ─────
const SAMPLES: [string, string][] = [['لینک سالم', 'https://app.snapp-box.example/track/SB-90412'], ['استخراج ناقص', 'https://app.snapp-box.example/track/SB-90413?partial'], ['منقضی', 'https://app.snapp-box.example/track/expired'], ['تکراری', 'https://app.snapp-box.example/track/SB-88213'], ['مقصد ناهمخوان', 'https://app.snapp-box.example/track/SB-90414?dest=other'], ['کد پست', '120459870001245789632199'], ['کد نامعتبر', '12345']]
function SmartPaste({ orderId, shipId, carrierName }: { orderId: string; shipId: string; carrierName: string }) {
  const { d } = useLookup()
  const [v, setV] = useState(''); const [state, setState] = useState<'idle' | 'reading' | 'ok' | 'partial' | 'err' | 'down'>('idle'); const [msg, setMsg] = useState(''); const [c, setC] = useState<any>(null); const [warn, setWarn] = useState('')
  const used = d.orders.flatMap((o) => o.shipments).filter((s) => s.id !== shipId)
  const read = async (raw = v) => {
    const x = raw.trim(); setWarn(''); setC(null)
    if (/^\d+$/.test(x)) {
      if (x.length !== 24 && x.length !== 11) { setState('err'); return setMsg('کد رهگیری نامعتبر است. کد پست ۲۴ رقم و کد تیپاکس ۱۱ رقم است.') }
      if (used.some((s) => s.tracking === x)) { setState('err'); return setMsg('این کد قبلاً به مرسولهٔ دیگری وصل شده است. کد را بررسی کنید.') }
      if (!getDB().orders.find((o) => o.id === orderId)?.shipments.find((y) => y.id === shipId)?.packPhotos?.length) { setState('err'); return setMsg('اول عکس پیش از ارسال را ثبت کنید.') }
      if (shipBlocked(orderId)) { setState('idle'); return }
      mutate((db) => { const s = db.orders.find((o) => o.id === orderId)!.shipments.find((s) => s.id === shipId)!; s.tracking = x; s.status = 'ship.in_transit'; db.orders.find((o) => o.id === orderId)!.status = 'order.shipped' }, { action: 'الحاق کد رهگیری', target: shipId, after: x })
      setV(''); setState('idle'); return toast(`کد رهگیری ${x.length === 24 ? 'پست' : 'تیپاکس'} ثبت شد و لینک رهگیری برای مشتری ارسال شد.`)
    }
    if (!/^https?:\/\/\S+track\/\S+/.test(x)) { setState('err'); return setMsg('لینک نامعتبر است. لینک پیگیری سفر را از اپ پیک کپی کنید.') }
    if (/expired/.test(x)) { setState('err'); return setMsg('این لینک منقضی شده است. لینک تازه بگیرید یا اطلاعات پیک را دستی وارد کنید.') }
    const code = x.match(/SB-\d+/)?.[0] ?? ''
    if (used.some((s) => s.courier?.code === code)) { setState('err'); return setMsg(`این سفر قبلاً به مرسولهٔ دیگری وصل شده است (${code}).`) }
    setState('reading')
    try {
      await fakeCall(true)
      const partial = /partial/.test(x)
      setC({ name: 'حمید زارعی', phone: '09120000002', plate: partial ? '' : '۸۷۶ ایران ۳۳', vehicle: 'موتور', eta: 22, code, cost: partial ? 0 : 196000 })
      if (/dest=other/.test(x)) setWarn('مقصد این سفر با نشانی سفارش یکی نیست. پیش از تأیید بررسی کنید.')
      setState(partial ? 'partial' : 'ok')
    } catch { setState('down'); setMsg(`${carrierName} پاسخ نمی‌دهد. اطلاعات پیک را دستی وارد کنید؛ خواندن لینک در پس‌زمینه دوباره تلاش می‌شود.`); setC({ name: '', phone: '', plate: '', vehicle: 'موتور', eta: 0, code, cost: 0 }) }
  }
  const save = () => {
    const sh = getDB().orders.find((o) => o.id === orderId)?.shipments.find((x) => x.id === shipId)
    if (shipBlocked(orderId)) return
    if (!sh?.packPhotos?.length) return toast('اول عکس پیش از ارسال را ثبت کنید؛ این عکس‌ها برای مقایسه در مرجوعی بایگانی می‌شوند.', { tone: 'err' })
    const undo = snapshot()
    mutate((db) => { const o = db.orders.find((o) => o.id === orderId)!; const s = o.shipments.find((s) => s.id === shipId)!; s.courier = c; s.status = 'ship.handed'; o.status = 'order.shipped' }, { action: 'ثبت پیک با لینک', target: shipId, after: c.name })
    setState('idle'); setV(''); setC(null); toast('پیک ثبت شد و لینک رصد برای مشتری ارسال شد.', { undo })
  }
  return (
    <div className="rounded-md border border-dashed border-brand/50 bg-brand-tint/30 p-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); read() }}>
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="لینک سفر پیک یا کد رهگیری را بچسبانید" className="ltr text-left font-mono text-12" />
        <Button variant="primary" loading={state === 'reading'} icon={<ClipboardPaste size={14} />}>خواندن</Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1 text-11 text-t3">نمونه‌ها: {SAMPLES.map(([l, s]) => <button key={l} className="rounded-sm bg-surface px-1.5 py-0.5 hover:text-brand" onClick={() => { setV(s); read(s) }}>{l}</button>)}</div>
      {state === 'reading' && <div className="skeleton mt-3 h-16" />}
      {(state === 'err' || state === 'down') && <p role="alert" className="mt-2 rounded-sm bg-danger-bg px-2 py-1.5 text-12 text-danger">{msg}</p>}
      {c && ['ok', 'partial', 'down'].includes(state) && (
        <div className="mt-3 space-y-2">
          {warn && <p className="rounded-sm bg-warning-bg px-2 py-1.5 text-12 text-warning">{warn}</p>}
          {state === 'partial' && <p className="rounded-sm bg-warning-bg px-2 py-1.5 text-12 text-warning">استخراج ناقص بود. فیلدهای خالی را دستی پر کنید.</p>}
          <div className="grid grid-cols-2 gap-2">
            {([['name', 'نام پیک'], ['phone', 'شمارهٔ تماس'], ['plate', 'پلاک'], ['vehicle', 'نوع وسیله']] as const).map(([k, l]) => (
              <Field key={k} label={l} help={c[k] && state !== 'down' ? 'استخراج خودکار' : undefined} error={!c[k] ? 'خالی است' : undefined}><Input value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></Field>
            ))}
          </div>
          <p className="text-11 text-t3">زمان تقریبی رسیدن: {fa(c.eta)} دقیقه · کد سفر: <span className="ltr font-mono">{c.code}</span>{c.cost > 0 && ` · هزینه: ${toman(c.cost)}`} · اطمینان: {state === 'ok' ? 'بالا' : 'پایین'}</p>
          <Button variant="primary" disabled={!c.name || !c.plate} onClick={save}>ثبت پیک و اطلاع به مشتری</Button>
        </div>
      )}
    </div>
  )
}

export function OrderDetail() {
  const { id } = useParams(); const { d, customer, product, unit, rule } = useLookup(); const nav = useNavigate()
  const [packing, setPacking] = useState<string | null>(null)
  const [qprint, setQprint] = useState<string | null>(null)
  const [refund, setRefund] = useState(false); const [amount, setAmount] = useState(''); const [dest, setDest] = useState('کیف پول')
  const [cancelSh, setCancelSh] = useState<{ sid: string; total: number } | null>(null); const [restock, setRestock] = useState<RestockMode>('site'); const [rdest, setRdest] = useState('کیف پول'); const [racct, setRacct] = useState('')
  const [editOpen, setEditOpen] = useState(false); const [addrOpen, setAddrOpen] = useState(false); const [msg, setMsg] = useState<string | null>(null)
  const idx = d.orders.findIndex((o) => o.id === id); const o = d.orders[idx]
  if (!o) return <Page title="سفارش پیدا نشد" back="/admin/orders" empty={undefined}><Card><p className="p-6 text-center text-13 text-t2">سفارشی با این شماره نیست. شماره را بررسی کنید یا از جست‌وجوی سراسری استفاده کنید.</p></Card></Page>
  const c = customer(o.customerId)
  const step = ({ 'order.awaiting_payment': 0, 'order.awaiting_credit': 0, 'order.paid': 1, 'order.needs_decision': 1, 'order.suspicious': 1, 'order.preparing': 2, 'order.shipped': 4, 'order.pickup_ready': 4, 'order.delivered': 5, 'order.returned': 5 } as Record<string, number>)[o.status] ?? 5
  const items = o.shipments.flatMap((s) => s.items); const sub = items.reduce((a, i) => a + i.price * i.qty, 0)
  const advance = async (sid: string, to: string, label: string) => { if (to !== 'ship.delivered' && shipBlocked(o.id)) return; const wh0 = o.shipments.find((x) => x.id === sid)?.warehouse ?? ''; if (!(await guardForeign(wh0, label, sid))) return; const undo = snapshot(); mutate((db) => { const oo = db.orders.find((x) => x.id === o.id)!; oo.shipments.find((s) => s.id === sid)!.status = to; if (to === 'ship.picking') oo.status = 'order.preparing'; if (to === 'ship.handed' || to === 'ship.in_transit') rollShipped(oo); if (to === 'ship.delivered' && oo.shipments.every((s) => ['ship.delivered', 'ship.cancelled'].includes(s.status))) oo.status = 'order.delivered' }, { action: label, target: sid }); toast(`${label} ثبت شد.`, { undo }) }
  const openPack = async (sid: string) => { const wh0 = o.shipments.find((x) => x.id === sid)?.warehouse ?? ''; if (!(await guardForeign(wh0, 'بسته‌بندی با اسکن', sid))) return; setPacking(sid); setTimeout(() => document.getElementById(`pack-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }
  const cancelShip = async (sid: string, total: number) => { const wh0 = o.shipments.find((x) => x.id === sid)?.warehouse ?? ''; if (!(await guardForeign(wh0, 'لغو مرسوله', sid))) return; setRestock('site'); setRdest('کیف پول'); setRacct(''); setCancelSh({ sid, total }) }
  const doCancelShip = async () => {
    if (!cancelSh) return; const { sid, total } = cancelSh
    if (!(await askReason({ kind: 'order', ref: o.id, status: `لغو مرسولهٔ ${sid}`, title: 'دلیل لغو (برای مشتری)' }))) return
    const undo = snapshot()
    mutate((db) => { const oo = db.orders.find((x) => x.id === o.id)!; const sh = oo.shipments.find((s) => s.id === sid)!; applyRestock(db, sh.items.filter((it) => !it.cancelled).map((it) => ({ it, warehouse: sh.warehouse })), restock); createRefund(db, { orderId: o.id, customerId: o.customerId, amount: total, source: 'لغو مرسوله', dest: rdest, account: racct.trim() || undefined }); sh.status = 'ship.cancelled'; if (oo.shipments.every((s) => s.status === 'ship.cancelled')) oo.status = 'order.cancelled' }, { action: 'لغو مرسوله', target: sid, after: `${toman(total)} · ${restockLabel(restock)}` })
    toast(`مرسولهٔ ${sid} لغو شد؛ ${restockLabel(restock)}. پروندهٔ بازگشت ${toman(total)} به ${rdest} باز شد.`, { undo }); setCancelSh(null)
  }
  const doRefund = () => {
    const n = Number(amount.replace(/\D/g, '')); const cap = rule('refund_cap')
    if (!n) return toast('مبلغ را وارد کنید.', { tone: 'err' })
    if (n > o.total) return toast(`مبلغ بازگشت وجه از مبلغ سفارش (${toman(o.total)}) بیشتر است.`, { tone: 'err' })
    setRefund(false)
    if (n > cap && !isChief()) { mutate((db) => { db.approvals.unshift({ id: `AP-${710 + db.approvals.length}`, type: 'بازگشت وجه', title: `بازگشت ${toman(n)} به ${dest} ${c.name}`, ref: o.id, amount: n, by: 'کاربر فعلی', byRole: 'x', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'درخواست بازگشت وجه', target: o.id, after: toman(n) }); return toast('مبلغ بالاتر از سقف است. درخواست به صندوق تأییدها رفت.') }
    mutate((db) => { createRefund(db, { orderId: o.id, customerId: c.id, amount: n, source: 'بازگشت دستی', dest: dest === 'کیف پول' ? 'کیف پول' : 'شبا (پایا)' }) }, { action: 'بازگشت وجه', target: o.id, after: toman(n) }); toast(`پروندهٔ بازگشت ${toman(n)} ساخته شد؛ از کارت «بازگشت وجه» تأیید و اعمال کنید.`)
  }
  // اقدام بعدی: اولین مرسولهٔ فعال تعیین می‌کند الان چه کاری باید انجام شود
  const live = o.shipments.find((s) => !['ship.cancelled', 'ship.delivered'].includes(s.status))
  const goShip = (sid: string) => document.getElementById(`ship-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const [sumRef, pastSum] = useScrolledPast<HTMLDivElement>()
  const stepNames = o.shipments.length && o.shipments.every((x) => /حضوری/.test(x.method)) ? ['پرداخت', 'تأیید', 'آماده‌سازی', 'آماده در شعبه', step > 4 ? 'تحویل شد' : 'تحویل حضوری'] : ['پرداخت', 'تأیید', 'آماده‌سازی', step > 3 ? 'ارسال شد' : 'ارسال', step > 4 ? 'تحویل شد' : 'تحویل']
  const nextAct: { label: string; hint: string; run?: () => void; tone?: 'wait' | 'done' | 'deliver' } = o.status === 'order.awaiting_payment' || o.status === 'order.awaiting_credit' ? { label: 'منتظر پرداخت مشتری', hint: 'تا پرداخت کامل نشود، آماده‌سازی شروع نمی‌شود.', tone: 'wait' }
    : o.status === 'order.suspicious' ? { label: 'بازبینی سفارش مشکوک', hint: 'ارسال تا تأیید شما متوقف است.', run: () => document.getElementById('order-attention')?.scrollIntoView({ behavior: 'smooth' }) }
    : !live ? { label: o.status === 'order.cancelled' ? 'سفارش لغو شده است' : 'همهٔ مرسوله‌ها تحویل شد', hint: o.status === 'order.cancelled' ? 'بازگشت وجه را از کارت «بازگشت وجه» پیگیری کنید.' : 'کار دیگری روی این سفارش باقی نمانده است.', tone: 'done' }
    : live.status === 'ship.pending' ? { label: 'شروع جمع‌آوری', hint: `مرسولهٔ ${live.id} از ${WAREHOUSE[live.warehouse]}`, run: () => advance(live.id, 'ship.picking', 'شروع جمع‌آوری') }
    : live.status === 'ship.picking' ? { label: 'بسته‌بندی با اسکن', hint: `مرسولهٔ ${live.id}: هر قلم را اسکن کنید`, run: () => void openPack(live.id) }
    : live.status === 'ship.partner_confirm' ? { label: 'منتظر تأیید موجودی شریک', hint: 'پیامک و پیام‌رسان برای او ارسال شده است.', tone: 'wait' }
    : live.status === 'ship.packed' ? { label: /پست|تیپاکس|باربری/.test(live.method) ? 'ثبت تحویل به پست و کد رهگیری' : 'ثبت پیک و تحویل بسته', hint: `مرسولهٔ ${live.id} آمادهٔ ارسال است`, run: () => goShip(live.id) }
    : { label: 'ثبت تحویل به مشتری', hint: `مرسولهٔ ${live.id} در مسیر است؛ گام پایانی`, run: () => goShip(live.id), tone: 'deliver' }
  return (
    <Page module="orders" back="/admin/orders" title={<span className="ltr font-mono">{o.id}</span>} badge={<><StatusBadge s={o.status} />{o.tags.map((t) => <Badge key={t} dot={false}>{t}</Badge>)}</>} sub={`ثبت ${rel(o.createdAt)} · کانال ${o.channel} · ${c.name}`}
      actions={<>
        <span className="flex items-center rounded-lg border border-line">
          <button aria-label="سفارش قبلی" title="سفارش قبلی" disabled={idx <= 0} onClick={() => nav(`/admin/orders/${d.orders[idx - 1].id}`)} className="grid size-9 place-items-center text-t2 hover:text-brand disabled:opacity-40"><ChevronRight size={16} /></button>
          <span className="h-5 w-px bg-line" />
          <button aria-label="سفارش بعدی" title="سفارش بعدی" disabled={idx >= d.orders.length - 1} onClick={() => nav(`/admin/orders/${d.orders[idx + 1].id}`)} className="grid size-9 place-items-center text-t2 hover:text-brand disabled:opacity-40"><ChevronLeft size={16} /></button>
        </span>
        <Button icon={<Printer size={14} />} onClick={() => nav(`/admin/print?orders=${o.id}`)}>چاپ بستهٔ کامل</Button>
        <Button icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>ویرایش سفارش</Button>
        <Button icon={<Undo2 size={14} />} onClick={() => { setAmount(''); setRefund(true) }}>بازگشت وجه</Button>
      </>}>
      {o.lockedBy && <div className="mb-3 flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning"><Avatar name={o.lockedBy} size={20} />{o.lockedBy} همین سفارش را باز کرده است. ویرایش هم‌زمان ممکن است تعارض بسازد؛ تغییر او اول ذخیره می‌شود.</div>}
      {/* خلاصهٔ سفارش و اقدام بعدی: مهم‌ترین چیزی که اپراتور باید در یک نگاه ببیند */}
      <div ref={sumRef}><Card className="mb-4" pad={false}>
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="p-4">
            <Stepper current={step} steps={stepNames} />
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-12 sm:grid-cols-4">
              <div><dt className="text-t3">مبلغ پرداختی</dt><dd className="mt-0.5 text-15 font-bold"><Money v={o.total} /></dd></div>
              <div><dt className="text-t3">پرداخت</dt><dd className="mt-0.5 font-medium">{o.pay}</dd></div>
              <div><dt className="text-t3">مشتری</dt><dd className="mt-0.5 flex items-center gap-1 font-medium">{c.name}<button aria-label={`تماس با ${c.name}`} title="تماس" onClick={() => callTo(c.mobile, c.name)} className="text-t3 hover:text-brand"><Phone size={13} /></button></dd></div>
              <div><dt className="text-t3">ارسال</dt><dd className="mt-0.5 font-medium">{o.shipments.length ? `${fa(o.shipments.length)} مرسوله · ${[...new Set(o.shipments.map((x) => WAREHOUSE[x.warehouse]))].join('، ')}` : '—'}</dd></div>
            </dl>
          </div>
          <div className={cx('flex flex-col justify-center gap-2 border-t border-line p-4 lg:w-80 lg:border-t-0 lg:border-r', nextAct.tone === 'done' || nextAct.tone === 'deliver' ? 'bg-success-bg/50' : nextAct.tone === 'wait' ? 'bg-warning-bg/50' : 'bg-brand-tint/30')}>
            <p className="text-11 font-medium text-t3">اقدام بعدی</p>
            {nextAct.run ? (nextAct.tone === 'deliver' ? <Button size="lg" icon={<PackageCheck size={17} />} onClick={nextAct.run} className="deliver-cta justify-center border-0">{nextAct.label}</Button> : <Button variant="primary" size="lg" icon={<ArrowLeft size={16} />} onClick={nextAct.run} className="justify-center">{nextAct.label}</Button>) : <p className={cx('text-15 font-bold', nextAct.tone === 'done' ? 'text-success' : 'text-warning')}>{nextAct.label}</p>}
            <p className="text-12 text-t2">{nextAct.hint}</p>
            {live && <SlaChip at={live.sla} />}
          </div>
        </div>
      </Card></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          {/* نیازمند توجه: فقط وقتی موردی باشد چیزی نشان داده می‌شود */}
          <div id="order-attention" className="space-y-4 empty:hidden">
          <NoteBanner o={o} />
          <PayHoldCard o={o} />
          <OrderAlerts key={o.id} o={o} />
          <DecisionPanel o={o} />
          <CancelSummary o={o} />
          <RefundPanel orderId={o.id} />
          {o.status === 'order.suspicious' && (
            <Card className="border-danger/50" title={<>سفارش مشکوک · امتیاز ریسک {fa(o.risk)}<Hint k="risk" /></>}>
              <p className="text-13 text-t2">دلایل: دو واحد گران‌قیمت در یک سفارش، نرخ مرجوعی ۴۰٪ مشتری، نشانی تازه. ارسال تا بازبینی متوقف است.</p><AITag confidence="متوسط" />
              <div className="mt-3 flex gap-2"><Button variant="primary" onClick={() => { mutate((db) => { db.orders.find((x) => x.id === o.id)!.status = 'order.paid' }, { action: 'تأیید سفارش مشکوک', target: o.id }); toast('سفارش تأیید شد و به صف آماده‌سازی رفت.') }}>تأیید و ادامهٔ سفارش</Button><Button variant="danger" onClick={() => cancelShip(o.shipments[0].id, o.total)}>رد و بازگشت وجه</Button></div>
            </Card>
          )}
          {o.shipments.length > 1 && <SplitBanner o={o} />}
          </div>
          {o.shipments.length === 0 && <Card><p className="py-6 text-center text-13 text-t2">این سفارش مرسوله‌ای ندارد؛ پیش از تخصیص انبار لغو شده است.</p></Card>}
          {o.shipments.map((s, i) => { const total = s.items.reduce((a, x) => a + x.price * x.qty, 0); const dead = ['ship.cancelled', 'ship.delivered'].includes(s.status); const post = /پست|تیپاکس|باربری/.test(s.method); const isNext = live?.id === s.id; return (
            <section key={s.id} id={`ship-${s.id}`} className={cx('scroll-mt-24 rounded-2xl border bg-surface', isNext ? 'border-brand/50 shadow-sm' : 'border-line')}>
              <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <b className="text-14">مرسولهٔ {fa(i + 1)}</b><CopyId v={s.id} /><StatusBadge s={s.status} />{isNext && <Badge tone="brand" dot={false}>در جریان</Badge>}{myWarehouses().length > 0 && !myWarehouses().includes(s.warehouse) && <Badge tone="warning" dot={false}>انبار دیگر · مال {d.stock.parties.find((p) => p.id === d.stock.warehouses.find((w) => w.id === s.warehouse)?.operator)?.name ?? '—'}</Badge>}
                <span className="flex-1" /><SlaChip at={s.sla} done={dead} />
              </header>
              <div className="p-4">
              <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-12 text-t2"><span className="flex items-center gap-1"><MapPin size={13} />ارسال از {WAREHOUSE[s.warehouse]}</span><span className="flex items-center gap-1"><Truck size={13} />{s.method}</span><span>دلیل تخصیص: {s.allocReason}</span><span className="mr-auto font-medium text-t1">جمع مرسوله: <Money v={total} /></span></div>
              <ul className="mb-3 divide-y divide-line rounded-md border border-line">
                {s.items.map((it, k) => { const u = unit(it.unitId); return (
                  <li key={k} className={cx('flex flex-wrap items-center justify-between gap-2 px-3 py-2', it.cancelled && 'bg-neutral-bg/60 opacity-70')}>
                    <Cell pid={it.productId} size={48} a={<span className="flex flex-wrap items-center gap-1.5"><button className="text-right hover:text-brand hover:underline" onClick={() => nav(`/admin/catalog/${it.productId}`)}>{product(it.productId).title}</button><VariantChips pid={it.productId} /></span>} b={u ? <>واحد <span className="ltr font-mono">{u.id}</span> · سریال <span className="ltr font-mono">{u.serial}</span>{u.grade && u.condition !== 'sealed' && <> · گرید {g(u.grade)}</>} · قفسه {u.shelf}</> : `موجودی تعدادی · ${fa(it.qty)} عدد`} />
                    <span className="flex items-center gap-2">{it.cancelled && <Badge tone="danger" dot={false}>لغو شد{it.cancelBy ? ` · ${it.cancelBy}` : ''}</Badge>}<ProductLinks pid={it.productId} /><Money v={it.price * it.qty} /></span>
                  </li>) })}
              </ul>
              {packing === s.id && ['ship.pending', 'ship.picking'].includes(s.status) && <PackSession inline shipId={s.id} onDone={() => setPacking(null)} onClose={() => setPacking(null)} />}
              {s.status === 'ship.partner_confirm' && <p className="mb-3 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">منتظر تأیید موجودی شریک انبار. پیامک و پیام‌رسان برای او ارسال شده است. اگر تا پایان مهلت تأیید نکند، سفارش به جریان تصمیم مشتری می‌رود.</p>}
              {/* اقدام‌های مرسوله: اصلی‌ها راست، کم‌کاربرد و حساس‌ها چپ و جدا */}
              {!dead && s.status !== 'ship.partner_confirm' && (
                <div className="mb-3 space-y-3 rounded-xl bg-neutral-bg/60 p-3">
                  {s.status === 'ship.packed' && !s.courier && !s.tracking && /سریع|پیک|اسنپ/.test(s.method) && <SmartPaste orderId={o.id} shipId={s.id} carrierName={d.delivery.fast.couriers.find((c) => c.id === d.delivery.fast.primary)?.name ?? 'سرویس پیک'} />}
                  <div className="flex flex-wrap items-center gap-2">
                    {s.status === 'ship.pending' && <Button variant="primary" onClick={() => advance(s.id, 'ship.picking', 'شروع جمع‌آوری')}>شروع جمع‌آوری</Button>}
                    {['ship.pending', 'ship.picking'].includes(s.status) && packing !== s.id && <Button variant={s.status === 'ship.picking' ? 'primary' : 'secondary'} icon={<ScanLine size={14} />} onClick={() => void openPack(s.id)}>بسته‌بندی با اسکن</Button>}
                    {s.status === 'ship.picking' && <Button onClick={() => advance(s.id, 'ship.packed', 'تأیید بسته‌بندی بدون اسکن')} title="مالک هر قلم طبق قاعدهٔ اولویت برداشت تعیین و ثبت می‌شود">تأیید بدون اسکن</Button>}
                    {['ship.handed', 'ship.in_transit'].includes(s.status) && <DeliverConfirm o={o} sid={s.id} />}
                    <Button icon={<Printer size={14} />} onClick={() => setQprint(s.id)}>چاپ برچسب {post ? 'پستی' : 'پیک'}</Button><QuickPrint open={qprint === s.id} onClose={() => setQprint(null)} o={o} s={s} doc={post ? 'post' : 'courier'} />
                    <Button variant="ghost" icon={<MapPin size={14} />} disabled={['ship.handed', 'ship.in_transit'].includes(s.status)} title={['ship.handed', 'ship.in_transit'].includes(s.status) ? 'پس از تحویل به پیک، نشانی قابل تغییر نیست.' : ''} onClick={() => setAddrOpen(true)}>ویرایش نشانی</Button>
                    <span className="mr-auto flex flex-wrap items-center gap-2"><RollbackShip o={o} sid={s.id} /><Button variant="danger" size="sm" onClick={() => cancelShip(s.id, total)}>لغو مرسوله</Button></span>
                  </div>
                </div>
              )}
              {s.status === 'ship.delivered' && <div className="flex flex-wrap items-center justify-between gap-2">{(s as any).deliveredAt ? <p className="flex items-center gap-1.5 rounded-lg bg-success-bg px-3 py-1.5 text-12 text-success">تحویل مشتری شد · {new Date((s as any).deliveredAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}{(s as any).deliveredTo ? ` · ${(s as any).deliveredTo.name} (${(s as any).deliveredTo.relation})` : ''}{(s as any).deliveredVia ? ` · ${(s as any).deliveredVia}` : ''}</p> : <span />}<span className="flex flex-wrap items-center gap-2"><ReturnShipButton o={o} sid={s.id} /><RollbackShip o={o} sid={s.id} /></span></div>}
              <div className="space-y-3">
                <CustomerProgress o={o} s={s} />
                <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              {s.courier && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-neutral-bg px-3 py-2 text-12"><b>پیک: {s.courier.name}</b><span>پلاک {s.courier.plate}</span><span>{s.courier.vehicle}</span>{s.status !== 'ship.delivered' && <span>حدود {fa(s.courier.eta)} دقیقهٔ دیگر می‌رسد</span>}<span className="ltr font-mono">{s.courier.code}</span><Button size="sm" variant="ghost" icon={<Phone size={12} />} onClick={() => callTo(s.courier!.phone, `پیک ${s.courier!.name}`)}>تماس</Button></div>}
              {s.tracking && <p className="text-12">کد رهگیری: <CopyId v={s.tracking} /></p>}
              <PackRecord s={s} />
              {(/حضوری/.test(s.method) || d.pickups.some((p) => p.orderId === o.id)) && s.status !== 'ship.cancelled' && <PickupReceipt orderId={o.id} customerId={o.customerId} items={s.items.map((x) => x.productId)} />}
              {s.status !== 'ship.cancelled' && <details className="rounded-lg border border-line" open={!s.packPhotos?.length && ['ship.picking', 'ship.packed'].includes(s.status)}><summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-12 font-semibold">عکس پیش از ارسال{s.packPhotos?.length ? <Badge tone="success">{fa(s.packPhotos.length)} عکس بایگانی شد</Badge> : <Badge tone="warning">ثبت نشده</Badge>}</summary><div className="border-t border-line p-3"><PackPhotos orderId={o.id} shipId={s.id} readOnly={['ship.delivered', 'ship.in_transit', 'ship.handed'].includes(s.status)} /></div></details>}
                </div>
              </div>
              </div>
            </section>) })}
          <OrderReturns o={o} />
          <OrderNotes o={o} />
          <Card title="تاریخچه و یادداشت‌ها" defaultOpen={false}>
            <ChangeHistory o={o} />
            <Timeline items={[
              ...d.audit.filter((a) => a.target.startsWith(o.id)).map((a) => ({ at: a.at, who: a.who, text: <>{a.action}{a.after !== '-' && <>: <b>{a.after}</b></>}</>, tone: a.ai ? 'ai' as const : 'ok' as const })),
              { at: o.createdAt, who: 'سیستم', text: `پیامک «سفارش شما ثبت شد» برای مشتری ارسال شد.` },
              { at: o.createdAt, who: c.name, text: `سفارش با ${o.pay} ثبت شد.`, tone: 'ok' },
            ]} />
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget.elements.namedItem('n') as HTMLInputElement; if (!f.value) return; mutate(() => {}, { action: 'یادداشت داخلی', target: o.id, after: f.value }); f.value = '' }}><Input name="n" placeholder="یادداشت داخلی؛ با @ همکار را منشن کنید" /><Button>ثبت یادداشت</Button></form>
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Card title="مشتری" actions={<Button size="sm" variant="ghost" onClick={() => nav(`/admin/customers?c=${c.id}`)}>پروفایل ۳۶۰</Button>}>
            <div className="mb-2 flex items-center gap-2"><Avatar name={c.name} /><div><p className="text-13 font-semibold">{c.name}</p><p className="text-11 text-t3">{c.segment} · {c.city}</p></div></div>
            <Row k="موبایل"><Masked id={`m-${c.id}`} value={c.mobile} label={`شمارهٔ موبایل ${c.name}`} /></Row>
            <Row k={<>LTV<Hint k="ltv" /></>}><Money v={c.ltv} compact /></Row>
            <Row k="تعداد سفارش">{fa(c.orders)}</Row><Row k="نرخ مرجوعی">{pct(c.returnRate)}</Row>
            <Row k={<>امتیاز ریسک<Hint k="risk" /></>}><Badge tone={o.risk > 70 ? 'danger' : o.risk > 30 ? 'warning' : 'success'}>{fa(o.risk)}</Badge></Row>
            <div className="mt-2 flex gap-2"><Button size="sm" icon={<Phone size={12} />} onClick={() => callTo(c.mobile, c.name)}>تماس</Button><Button size="sm" onClick={() => { mutate((x) => { x.tickets.unshift({ id: `TK-${482200 + x.tickets.length}`, customerId: c.id, orderId: o.id, subject: `پیگیری سفارش ${o.id}`, channel: 'پنل ادمین', status: 'ticket.open', priority: 'عادی', sla: new Date(Date.now() + 4 * 36e5).toISOString(), assignee: 'من', sentiment: 'خنثی', messages: [{ from: 'agent', text: `تیکت برای پیگیری سفارش ${o.id} ساخته شد.`, at: new Date().toISOString() }] }) }, { action: 'ساخت تیکت', target: o.id }); nav(`/admin/support?t=TK-${482200 + d.tickets.length}`) }}>ساخت تیکت</Button><Button size="sm" variant="ai" icon={<Sparkles size={12} />} onClick={() => setMsg(`سلام ${c.name.split(' ')[0]} عزیز. سفارش ${o.id} شما ${o.status === 'order.shipped' ? 'در مسیر است و به‌زودی می‌رسد' : o.status === 'order.delivered' ? 'تحویل شده است؛ از خرید شما سپاسگزاریم' : 'در حال آماده‌سازی است'}. غنیمت`)}>پیش‌نویس پیام</Button></div>
          </Card>
          <Card title="مالی">
            <Row k="جمع کالاها"><Money v={sub} /></Row><Row k="هزینهٔ ارسال">{o.shippingFee ? <Money v={o.shippingFee} /> : 'رایگان'}</Row>
            {o.discount > 0 && <Row k="تخفیف"><span className="text-success">−<Money v={o.discount} /></span></Row>}
            <div className="my-1 border-t border-line" /><Row k={<b className="text-t1">مبلغ پرداختی</b>}><b><Money v={o.total} /></b></Row>
            <Row k={`کارمزد ${o.pay}`}><Money v={o.fee} /></Row>{canSecret() && <Row k={<>حاشیهٔ سود سفارش<Hint k="margin" /></>}>{pct(o.margin, 1)}</Row>}
            {(o.refunded || o.refundPending) ? <><Row k="بازگشت داده‌شده"><span className="text-success">{toman(o.refunded ?? 0)}</span></Row>{o.refundPending ? <Row k="بازگشت در جریان"><span className="text-warning">{toman(o.refundPending)}</span></Row> : null}<Row k={<b className="text-t1">خالص دریافتی</b>}><b>{toman(o.total - (o.refunded ?? 0))}</b></Row></> : null}
            <PaymentInfo orderId={o.id} />
            <Installments o={o} />
            <Button size="sm" className="mt-2" icon={<Printer size={12} />} onClick={() => nav(`/admin/print?orders=${o.id}&doc=invoice`)}>فاکتور {c.segment === 'حقوقی' ? 'رسمی' : 'فروش'}</Button>
          </Card>
          <OrderLedger o={o} />
          {canSecret() && <OrderProfitCard o={o} />}
          <Card><ReasonLog kind="order" refId={o.id} /></Card>
        </div>
      </div>
      <DeliveredCelebration o={o} />
      <StickyStepBar show={pastSum} at={step} total={stepNames.length} label={<><bdi dir="ltr" className="font-mono">{o.id}</bdi> · {stepNames[Math.min(step, stepNames.length - 1)]} · <span className="text-t2">{nextAct.hint}</span></>}>
        <span className="flex items-center rounded-lg border border-line"><button aria-label="سفارش قبلی" title="سفارش قبلی" disabled={idx <= 0} onClick={() => nav(`/admin/orders/${d.orders[idx - 1].id}`)} className="grid size-9 place-items-center text-t2 hover:text-brand disabled:opacity-40"><ChevronRight size={16} /></button><span className="h-5 w-px bg-line" /><button aria-label="سفارش بعدی" title="سفارش بعدی" disabled={idx >= d.orders.length - 1} onClick={() => nav(`/admin/orders/${d.orders[idx + 1].id}`)} className="grid size-9 place-items-center text-t2 hover:text-brand disabled:opacity-40"><ChevronLeft size={16} /></button></span>
        {nextAct.run ? (nextAct.tone === 'deliver' ? <Button icon={<PackageCheck size={14} />} onClick={nextAct.run} className="deliver-cta border-0">{nextAct.label}</Button> : <Button variant="primary" icon={<ArrowLeft size={14} />} onClick={nextAct.run}>{nextAct.label}</Button>) : <Badge tone={nextAct.tone === 'done' ? 'success' : 'warning'}>{nextAct.label}</Badge>}
      </StickyStepBar>
      <Modal open={!!cancelSh} onClose={() => setCancelSh(null)} title={`لغو مرسولهٔ ${cancelSh?.sid ?? ''}`} footer={<><Button variant="danger" onClick={() => void doCancelShip()}>لغو مرسوله</Button><Button variant="ghost" onClick={() => setCancelSh(null)}>انصراف</Button></>}>
        <div className="space-y-3 text-13"><p>این مرسوله لغو می‌شود. مقصد بازگشت وجه را انتخاب کنید؛ پرونده تا تأیید و اعمال شما باز می‌ماند.</p><RefundDest dest={rdest} setDest={setRdest} account={racct} setAccount={setRacct} amount={cancelSh?.total ?? 0} customer={{ name: c.name, mobile: c.mobile }} /><RestockChoice value={restock} onChange={setRestock} /></div>
      </Modal>
      <OrderEdit o={editOpen ? o : null} onClose={() => setEditOpen(false)} />
      <AddressEdit o={addrOpen ? o : null} onClose={() => setAddrOpen(false)} />
      <MessageModal to={msg !== null ? { name: c.name, mobile: c.mobile } : null} draft={msg ?? ''} onClose={() => setMsg(null)} />
      <Modal open={refund} onClose={() => setRefund(false)} title={`بازگشت وجه سفارش ${o.id}`} footer={<><Button variant="primary" onClick={doRefund}>واریز {amount ? toman(Number(amount.replace(/\D/g, ''))) : 'مبلغ'}</Button><Button variant="ghost" onClick={() => setRefund(false)}>انصراف</Button></>}>
        <div className="space-y-3">
          <Field label="مبلغ (تومان)" help={`حداکثر ${toman(o.total)}. بالاتر از ${compactToman(rule('refund_cap'))} به تأیید نفر دوم نیاز دارد.`} hint={<Hint k="maker_checker" />}><Input className="ltr text-left font-mono" inputMode="numeric" value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('en-US') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="مثلاً 15,820,000" /></Field>
          <Field label="مقصد وجه"><Select value={dest} onChange={setDest} options={['کیف پول', 'کارت بانکی']} /></Field>
          {dest === 'کارت بانکی' && <p className="rounded-sm bg-info-bg px-2 py-1.5 text-12 text-info">واریز به کارت فقط پس از تأیید مالکیت کارت با کد ملی مشتری انجام می‌شود.</p>}
        </div>
      </Modal>
    </Page>
  )
}

/** لینک‌های کالا در ردیف سفارش: صفحهٔ کالا در پنل و صفحهٔ عمومی در سایت (باز شدن یا کپی برای ارسال به مشتری) */
function ProductLinks({ pid }: { pid: string }) {
  const nav = useNavigate(); const p = getDB().products.find((x) => x.id === pid)
  const url = `https://ghanimat.ir/product/${pid}/${(p?.en ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  return <span className="no-print flex items-center gap-1">
    <Button size="sm" variant="ghost" onClick={() => nav(`/admin/catalog/${pid}`)}>صفحهٔ کالا</Button>
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label="مشاهدهٔ کالا در سایت" title="مشاهده در سایت" className="grid size-7 place-items-center rounded-lg text-t2 hover:bg-neutral-bg hover:text-brand"><ExternalLink size={14} /></a>
    <button aria-label="کپی لینک کالا در سایت" title="کپی لینک سایت برای ارسال به مشتری" className="grid size-7 place-items-center rounded-lg text-t2 hover:bg-neutral-bg hover:text-brand" onClick={() => { copyText(url); toast('لینک صفحهٔ کالا کپی شد.') }}><Link2 size={14} /></button>
  </span>
}
