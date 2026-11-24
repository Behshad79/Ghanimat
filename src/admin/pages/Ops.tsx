import { sendSms } from '@/shared/lib/store'
import { StockDesk } from '../stock/StockDesk'
import { BrandLogo, WithLogo } from '@/shared/ui/brandLogo'
import { WarehouseDetail } from '../warehouse/WarehouseDetail'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Check, Printer, ScanLine, X } from 'lucide-react'
import { AITag, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Segmented, Select, StatusBadge, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Bars } from '@/shared/ui/charts'
import { confirm, Drawer, Hint, Modal, toast } from '@/shared/ui/overlay'
import { askReason, ReasonLog } from '@/shared/ui/reason'
import { fakeCall, mutate, snapshot, useDB, useSession } from '@/shared/lib/store'
import { EntityManager } from '@/shared/ui/entity'
import { compactToman, fa, pct, rel, toman, g } from '@/shared/lib/fa'
import { CONDITION, WAREHOUSE } from '@/shared/data/statuses'
import { Cell, Money, ProductImg, SlaChip, useLookup, useTab, CustLink } from './_shared'
import { PackPhotos } from '../shared/PackPhotos'
import { WarehouseMap } from '../warehouse/WarehouseMap'
import { PickupRules, SlotsEngine, SmsLog } from '../logistics/Slots'
import { FastCourier } from '../logistics/FastCourier'
import { ManualReturn } from '../orders/ReturnTools'
import { cardCustomer, cardMobile, cardProduct, cardSerial, serialText, cardStatusText, Inquiry, ManualWarranty } from '../returns/Warranty'
import { cardState, COVERED, EXCLUDED, inQueue, METHODS, QUEUES, retStage, warStage, type Stage } from '../returns/flow'
import { SplitRules } from '../orders/Split'
import { ZoneMap } from '../logistics/ZoneMap'
import { VariantStockTable } from '../catalog/VariableEditor'
import { shipBlocked } from '../orders/PayHold'
import { getDB } from '@/shared/lib/store'

// ───────── انبار و موجودی ─────────
const QC_LIST = ['دستگاه روشن می‌شود', 'نمایشگر بدون لکه و پیکسل سوخته', 'سلامت باتری بالای ۸۵٪', 'دوربین‌ها و میکروفون', 'اتصال‌ها (وای‌فای، بلوتوث، سیم‌کارت)', 'تطبیق سریال با جعبه و فاکتور']
/** موجودی تنوع‌ها (کالای متغیر): هر رنگ یا حافظه با کد، موجودی هر انبار و هشدار کمبود */
function VariantStockCard() {
  const nav = useNavigate(); const [low, setLow] = useState(false)
  return <Card title="موجودی تنوع‌های کالاهای متغیر" actions={<Toggle on={low} onChange={setLow} text="فقط کمبود و ناموجود" />}><VariantStockTable onlyLow={low} onEdit={(pid) => nav(`/admin/catalog/${pid}?tab=units`)} /></Card>
}
export function Warehouse() {
  const { d, product } = useLookup(); const s = useSession(); const nav = useNavigate(); const [tab, setTab] = useTab('stock'); const [whD, setWhD] = useState<string | null>(null)
  const [scan, setScan] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null); const [checks, setChecks] = useState<Record<string, boolean>>({}); const [grade, setGrade] = useState('A')
  const inScope = (w: string) => s.scope === 'all' || s.scope === w
  const q = (st: string) => d.units.filter((u) => u.status === st && inScope(u.warehouse))
  const qc = q('unit.qc'), photo = q('unit.photo'), ready = q('unit.ready')
  const cur = d.units.find((u) => u.id === focus)
  const finish = (ok: boolean) => {
    if (!cur) return
    if (ok && QC_LIST.some((c) => !checks[c])) return toast('همهٔ موارد چک‌لیست باید بررسی شود. موارد ناموفق را با «رد واحد» ثبت کنید.', { tone: 'err' })
    mutate((x) => { const u = x.units.find((y) => y.id === cur.id)!; u.status = ok ? 'unit.photo' : 'unit.rejected'; if (ok) u.grade = grade }, { action: ok ? 'تأیید QC' : 'رد QC', target: cur.id, after: ok ? `گرید ${grade}` : 'ردشده' })
    const next = qc.find((u) => u.id !== cur.id); setChecks({}); setFocus(next?.id ?? null)
    toast(ok ? `واحد ${cur.id} تأیید شد و به صف عکاسی رفت.` : `واحد ${cur.id} رد شد.`)
  }
  useEffect(() => { if (!focus) return; const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') finish(true) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) })
  const move = (ids: string[], to: string, label: string) => { const undo = snapshot(); mutate((x) => x.units.filter((u) => ids.includes(u.id)).forEach((u) => { u.status = to; if (to === 'unit.ready' && !u.price) u.price = Math.round((u.cost * 1.22) / 1e5) * 1e5 }), { action: label, target: `${ids.length} واحد` }); toast(`${label}: ${fa(ids.length)} واحد.`, { undo }) }
  const QueueCard = ({ list, action, label, emptyT, emptyD }: { list: typeof qc; action: (id: string) => void; label: string; emptyT: string; emptyD: string }) => list.length === 0 ? <Card><EmptyState title={emptyT} desc={emptyD} /></Card> : (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((u) => (
      <Card key={u.id}><div className="flex items-start justify-between gap-2"><Cell pid={u.productId} size={48} a={product(u.productId).en} b={`${CONDITION[u.condition]} · ${u.color}`} /><StatusBadge s={u.status} /></div>
        <div className="mt-2 flex items-center justify-between text-12 text-t2"><CopyId v={u.id} /><span>قفسه <span className="ltr font-mono">{u.shelf}</span> · {rel(u.received)}</span></div>
        <Button variant="primary" className="mt-3 w-full" onClick={() => action(u.id)}>{label}</Button></Card>))}</div>)
  return (
    <Page title="انبار و موجودی" module="warehouse" sub={`محدوده: ${s.scope === 'all' ? 'همهٔ انبارها' : WAREHOUSE[s.scope]}`}
      empty={{ title: 'انبار خالی است.', desc: 'با دریافت اولین محموله، واحدها ساخته می‌شوند و به صف QC می‌آیند.', action: <Button variant="primary" onClick={() => nav('/admin/inbound?tab=batches')}>ثبت محمولهٔ ورودی</Button> }}
      actions={<><Button variant="ghost" onClick={() => nav('/admin/ownership')}>شرکا و تسویه</Button><Button icon={<ScanLine size={14} />} onClick={() => setScan('')}>اسکن بارکد</Button></>}
      primary={qc.length > 0 ? <Button variant="primary" onClick={() => { setTab('qc'); setFocus(qc[0].id) }}>شروع QC ({fa(qc.length)} واحد)</Button> : undefined}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'نمای موجودی و میز موجودی' }, { id: 'map', label: 'نقشهٔ قفسه‌ها' }, { id: 'qc', label: 'صف QC', count: qc.length }, { id: 'photo', label: 'صف عکاسی', count: photo.length }, { id: 'publish', label: 'صف انتشار', count: ready.length }, { id: 'sync', label: 'همگام‌سازی شریک', count: d.syncIssues.length }]} />}>
      {tab === 'qc' && <QueueCard list={qc} label="بازرسی این واحد" action={setFocus} emptyT="صف QC خالی است." emptyD="واحدهای دریافت‌شده بعد از ثبت ورود، اینجا می‌آیند." />}
      {tab === 'photo' && <QueueCard list={photo} label="ثبت عکس‌ها و ارسال به انتشار" action={(id) => move([id], 'unit.ready', 'عکاسی کامل شد')} emptyT="صف عکاسی خالی است." emptyD="واحدهایی که QC را گذرانده‌اند برای عکاسی اینجا می‌آیند." />}
      {tab === 'publish' && <DataTable name="صف انتشار" rows={ready} rowKey={(u) => u.id} onRow={(u) => nav(`/admin/catalog/unit/${u.id}`)} empty={{ title: 'واحدی آمادهٔ انتشار نیست.', desc: 'واحدها بعد از QC، عکاسی و قیمت‌گذاری اینجا می‌آیند.' }}
        cols={[{ key: 'id', title: 'واحد', render: (u) => <CopyId v={u.id} /> }, { key: 'p', title: 'محصول', render: (u) => <Cell pid={u.productId} a={product(u.productId).en} /> }, { key: 'chk', title: 'چک‌لیست انتشار', render: (u) => <span className="flex gap-1">{[['QC', true], ['عکس', true], ['قیمت', u.price > 0], ['محتوا', product(u.productId).health > 60]].map(([l, ok]) => <Badge key={l as string} tone={ok ? 'success' : 'danger'}>{l}</Badge>)}</span> }, { key: 'price', title: 'قیمت', align: 'left', render: (u) => u.price ? <Money v={u.price} /> : '—' }]}
        bulk={(ids, clear) => <Button size="sm" variant="primary" onClick={() => { move(ids, 'unit.published', 'انتشار'); clear() }}>انتشار {fa(ids.length)} واحد</Button>} />}
      {tab === 'map' && <WarehouseMap />}
      {tab === 'stock' && <div className="space-y-4">
        <StockDesk />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(() => { const qtyP = d.products.filter((p) => p.mode !== 'serial' && p.status === 'product.published'); const qn = (p: (typeof qtyP)[number]) => (inScope('tehran') ? p.qty?.tehran ?? 0 : 0) + (inScope('mahabad') ? p.qty?.mahabad ?? 0 : 0); const units = q('unit.published').length; const qty = qtyP.reduce((a, p) => a + qn(p), 0)
            return <><KPI label="موجودی قابل فروش" value={`${fa(units + qty)} عدد`} note={`${fa(units)} واحد سریال‌دار · ${fa(qty)} عدد کالای تعدادی`} to="/admin/catalog?tab=units" /><KPI label="ارزش موجودی (فروش)" value={compactToman(d.units.filter((u) => inScope(u.warehouse) && ['unit.published', 'unit.ready', 'unit.reserved'].includes(u.status)).reduce((a, u) => a + u.price, 0) + qtyP.reduce((a, p) => a + qn(p) * (p.price ?? p.priceNew ?? 0), 0))} note="سریال‌دار و تعدادی، به قیمت فروش" /></> })()}
          <KPI label="موجودی راکد (بیش از ۳۰ روز)" value={fa(d.units.filter((u) => u.status === 'unit.published' && Date.now() - new Date(u.received).getTime() > 30 * 864e5).length)} note="پیشنهاد AI: کاهش پلکانی قیمت" to="/admin/pricing" /><KPI label="زمان ورود تا انتشار" value={`${fa(1.8)} روز`} delta={-12} goodDown />
        </div>
        <div className="grid gap-4 md:grid-cols-2"><Card title="موجودی به تفکیک انبار" actions={<span className="text-11 text-t2">روی هر انبار بزنید</span>}><Bars onPick={(l) => setWhD(Object.keys(WAREHOUSE).find((k) => WAREHOUSE[k] === l) ?? null)} data={Object.keys(WAREHOUSE).map((w) => ({ label: WAREHOUSE[w], value: d.units.filter((u) => u.warehouse === w && u.status === 'unit.published').length + d.products.reduce((a, p) => a + (p.qty?.[w as 'tehran'] ?? 0), 0) }))} fmt={(n) => `${fa(n)} عدد`} /></Card>
          <Card title="موجودی به تفکیک چرخهٔ عمر"><Bars onPick={() => nav('/admin/catalog?tab=units')} data={['unit.qc', 'unit.photo', 'unit.ready', 'unit.published', 'unit.reserved', 'unit.sold'].map((k) => ({ label: k.replace('unit.', '').replace('qc', 'در انتظار QC').replace('photo', 'در انتظار عکاسی').replace('ready', 'آمادهٔ انتشار').replace('published', 'منتشرشده').replace('reserved', 'رزروشده').replace('sold', 'فروخته‌شده'), value: d.units.filter((u) => u.status === k).length }))} /></Card></div>  <VariantStockCard />
      </div>}
      {tab === 'sync' && <div className="space-y-4">
        <Card title={<>سلامت همگام‌سازی موجودی انبار مهاباد<Hint k="buffer" /></>} actions={<div className="flex items-center gap-2 text-12"><span>فروش از انبار شریک</span><Toggle on={d.flags.mahabadSales} label="کلید توقف" onChange={async (v) => { if (!v && !(await confirm({ title: 'توقف فروش از انبار مهاباد؟', body: 'همهٔ کالاهای این انبار موقتاً در سایت ناموجود می‌شوند. سفارش‌های ثبت‌شده ادامه پیدا می‌کنند. هر زمان بخواهید دوباره روشن می‌شود.', confirm: 'توقف فروش', danger: true }))) return; mutate((x) => { x.flags.mahabadSales = v }, { action: v ? 'ازسرگیری فروش انبار شریک' : 'توقف فروش انبار شریک', target: 'انبار مهاباد' }) }} /></div>}>
          <div className="grid gap-3 sm:grid-cols-3">{[['به‌روزرسانی دستی شریک', '۵ ساعت پیش', 'ok'], ['اتصال مستقیم سایت اول', '۲ دقیقه پیش', 'ok'], ['خزش دوره‌ای سایت دوم', '۷۵ دقیقه پیش · قدیمی', 'warn']].map(([l, v, t]) => <div key={l} className={cx('rounded-md p-3 text-12', t === 'ok' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning')}><p className="font-medium">{l}</p><p>{v}</p></div>)}</div>
        </Card>
        <DataTable name="ناهماهنگی‌ها" rows={d.syncIssues} rowKey={(x) => x.id} empty={{ title: 'ناهماهنگی‌ای نیست.', desc: 'موجودی غنیمت و سایت‌های شریک یکی است.' }}
          cols={[{ key: 'p', title: 'کالا', render: (x) => x.product }, { key: 'o', title: 'غنیمت', align: 'left', render: (x) => fa(x.ours) }, { key: 't', title: 'سایت شریک', align: 'left', render: (x) => fa(x.theirs) }, { key: 's', title: 'منبع', render: (x) => x.source }, { key: 'at', title: 'تشخیص', render: (x) => rel(x.at) },
            { key: 'a', title: '', render: (x) => <Button size="sm" onClick={() => { mutate((db) => { db.syncIssues = db.syncIssues.filter((y) => y.id !== x.id) }, { action: 'اصلاح موجودی طبق سایت شریک', target: x.product, before: String(x.ours), after: String(x.theirs) }); toast(`موجودی ${x.product} به ${fa(x.theirs)} اصلاح شد.`) }}>اصلاح به {fa(x.theirs)}</Button> }]} /></div>}
      <Modal open={scan !== null} onClose={() => setScan(null)} title="اسکن بارکد یا QR" footer={<Button variant="primary" onClick={() => { const v = (scan ?? '').trim().toUpperCase(); const u = d.units.find((x) => [x.code, x.id, x.serial, x.ean].includes(v)); const pr = d.products.find((x) => [x.code, x.ean].includes(v)); if (u) { setScan(null); nav(`/admin/catalog/unit/${u.id}`) } else if (pr) { setScan(null); nav(`/admin/catalog/${pr.id}`) } else toast('این بارکد در سیستم نیست. کد را دوباره اسکن کنید یا واحد را با سریال جست‌وجو کنید.', { tone: 'err' }) }}>باز کردن</Button>}>
        <Field label="کد را اسکن یا تایپ کنید" help="کد داخلی (GH-U-…)، سریال، IMEI یا بارکد کارخانه. اسکنر بارکد مثل صفحه‌کلید عمل می‌کند."><Input autoFocus className="ltr h-12 text-left font-mono" value={scan ?? ''} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.closest('[role=dialog]')?.querySelector('footer button') as HTMLButtonElement)?.click() }} placeholder="GH-U-0020411" /></Field>
        <div className="mt-2 flex flex-wrap gap-1 text-11 text-t2">نمونه: {['GH-U-0020411', '356789104529934', 'GH-P-000102', 'XXXX'].map((c) => <button key={c} className="rounded-sm bg-neutral-bg px-1.5 py-0.5 hover:text-brand" onClick={() => setScan(c)}>{c}</button>)}</div>
      </Modal>
      {/* حالت تمرکز صف QC: یک واحد در هر لحظه، «تأیید و بعدی» */}
      <Modal wide open={!!cur} onClose={() => setFocus(null)} title={cur ? <span className="flex items-center gap-2">بازرسی QC<CopyId v={cur.id} /><span className="text-12 font-normal text-t3">{fa(qc.length)} واحد مانده</span></span> : ''}
        footer={<><Button variant="primary" size="lg" onClick={() => finish(true)}>تأیید و بعدی</Button><Button variant="danger" size="lg" onClick={() => finish(false)}>رد واحد</Button><span className="mr-auto hidden self-center text-11 text-t3 sm:block">Enter: تأیید و بعدی</span></>}>
        {cur && <div className="grid gap-4 md:grid-cols-2">
          <div><p className="mb-2 text-13 font-semibold">{product(cur.productId).title}</p><Row k="سریال"><CopyId v={cur.serial} /></Row><Row k="وضعیت کالا">{CONDITION[cur.condition]}</Row>
            <Progress value={(Object.values(checks).filter(Boolean).length / QC_LIST.length) * 100} tone="success" />
            <ul className="mt-3 space-y-2">{QC_LIST.map((c) => <li key={c}><button onClick={() => setChecks({ ...checks, [c]: !checks[c] })} className={cx('flex min-h-11 w-full items-center gap-3 rounded-md border px-3 text-right text-13', checks[c] ? 'border-success bg-success-bg' : 'border-line')}><span className={cx('grid size-5 place-items-center rounded-sm border', checks[c] ? 'border-success bg-success-solid text-white' : 'border-line')}>{checks[c] && <Check size={13} />}</span>{c}</button></li>)}</ul></div>
          <div className="space-y-3"><div className="relative overflow-hidden rounded-md bg-neutral-bg"><ProductImg pid={cur.productId} size={360} rounded="rounded-md" className="!h-auto aspect-video !w-full border-0" /><span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-[#10123d]/80 px-2 py-1 text-11 text-white"><Camera size={12} />ایراد را روی عکس علامت بزنید</span></div>
            <Field label="گرید ظاهری" hint={<Hint k="grade" />}><Segmented value={grade} onChange={setGrade} options={[['A+', 'A+\u200E'], ['A', 'A'], ['B', 'B']]} /></Field>
            <AITag confidence="متوسط" source="تشخیص ایراد از عکس" /><p className="text-12 text-t2">پیشنهاد گرید: A. گرید را فقط کارشناس QC تأیید می‌کند.</p>
            <Field label="ایراد ظاهری (اختیاری)"><Input placeholder="مثلاً خط ریز کنار قاب" /></Field></div>
        </div>}
      </Modal>
      <WarehouseDetail wh={whD} onClose={() => setWhD(null)} />
    </Page>
  )
}

// ───────── ارسال و لجستیک ─────────
export function Shipping() {
  const { d, rule } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('methods'); const [file, setFile] = useState(false); const [scan, setScan] = useState(false)
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, orderId: o.id })))
  const carriers = d.providers.filter((p) => p.family === 'carrier')
  const methods = [[`تحویل ${fa(rule('fast_delivery_hours'))} ساعته`, 'انبار تهران · محدودهٔ تهران و کرج · تا ساعت قطع سفارش', 185000], ['تحویل سریع در بازهٔ انتخابی', 'انبار تهران · تهران و کرج · برای فردا یا روزهای بعد', 185000], ['پست پیشتاز', 'هر دو انبار · سراسر کشور', 95000], ['تیپاکس', 'هر دو انبار · مراکز استان', 140000], ['باربری کالای سنگین', 'انبار تهران · کلاس سنگین', 450000], ['دریافت حضوری از شعبه', 'شعبهٔ مرکزی', 0]] as const
  return (
    <Page title="ارسال و لجستیک" module="shipping" sub={`ارسال رایگان برای سبدهای بالای ${compactToman(rule('free_shipping_threshold'))} (از قوانین کسب‌وکار)`}
      empty={{ title: 'هنوز روش ارسالی تعریف نشده است.', desc: 'دست‌کم یک روش ارسال تعریف کنید تا مشتری بتواند سفارش ثبت کند.' }}
      primary={<Button variant="primary" onClick={() => setTab('methods')}>روش‌های ارسال</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'methods', label: 'روش‌ها و ظرفیت' }, { id: 'fast', label: 'پیک و قیمت تحویل سریع' }, { id: 'trips', label: 'سفرهای پیک', count: ships.filter((s) => s.courier).length }, { id: 'track', label: 'پست و الحاق رهگیری' }, { id: 'photos', label: 'بایگانی عکس ارسال', count: ships.filter((x) => x.packPhotos?.length).length }, { id: 'slots', label: 'زمان ارسال و ظرفیت' }, { id: 'pickup', label: 'دریافت حضوری' }, { id: 'sms', label: 'گزارش پیامک‌ها', count: d.smsLog.filter((m) => m.status !== 'تحویل شد').length }, { id: 'zones', label: 'مناطق' }, { id: 'carriers', label: 'شرکت‌های حمل' }]} />}>
      {tab === 'methods' && <div className="space-y-6"><div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div><EntityManager ek="shipMethods" kind="روش ارسال" fields={[{ k: 'name', label: 'نام روش', required: true, help: 'متغیر {مدت_تحویل_سریع} از قوانین کسب‌وکار خوانده می‌شود.', render: (r) => String(r.name).replace('{مدت_تحویل_سریع}', fa(rule('fast_delivery_hours'))) }, { k: 'scope', label: 'انبار، شهر و شرایط', type: 'textarea' }, { k: 'price', label: 'هزینهٔ پایه (تا ۱ کیلوگرم)', type: 'money' }, { k: 'perKg', label: 'هر کیلوگرم اضافه', type: 'money', help: 'برای مرسولهٔ سنگین‌تر از ۱ کیلوگرم به ازای هر کیلوی اضافه.' }, { k: 'maxKg', label: 'حداکثر وزن (کیلوگرم)', type: 'number', help: 'اگر وزن مرسوله بیشتر باشد، این روش به مشتری نمایش داده نمی‌شود. ۰ یعنی بدون سقف.' }, { k: 'timeMode', label: 'نوع زمان ارسال', type: 'select', options: ['متن ثابت', 'انتخاب بازه توسط مشتری'], table: false }, { k: 'timeText', label: 'متن زمان ارسال', help: 'در صفحهٔ پرداخت زیر نام روش نمایش داده می‌شود.', table: false }, { k: 'active', label: 'فعال', type: 'toggle' }]} /><ShipCalc /><p className="mt-2 text-11 text-t2">مدت وعدهٔ تحویل سریع از «قوانین کسب‌وکار» خوانده می‌شود. <button className="text-brand" onClick={() => nav('/admin/rules')}>تغییر مدت تحویل سریع</button></p></div>
        <Card title="ظرفیت بازه‌های امروز">{[['۹ تا ۱۲', 100], ['۱۲ تا ۱۵', 80], ['۱۵ تا ۱۸', 55], ['۱۸ تا ۲۱', 100]].map(([l, v]) => <div key={l} className="mb-3"><div className="mb-1 flex justify-between text-12"><span>{l}</span><span className={v === 100 ? 'text-danger' : 'text-t2'}>{v === 100 ? 'تکمیل ظرفیت' : pct(v as number)}</span></div><Progress value={v as number} tone={v === 100 ? 'danger' : 'brand'} /></div>)}<KPI label="تحویل به‌موقع این هفته" hint="sla" value={pct(94)} delta={1.2} /></Card></div><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-14 font-semibold">پیک و قیمت ساعتی تحویل سریع</p><p className="mt-1 text-12 text-t2">پیک اصلی و جایگزین‌ها، افزایش خودکار در ساعت‌های پرترافیک، تغییر دستی هر ساعت، حالت باران و افزایش موقت.</p></div><Button variant="primary" onClick={() => setTab('fast')}>تنظیم پیک و قیمت تحویل سریع</Button></div></Card><SplitRules /></div>}
      {tab === 'trips' && <DataTable name="سفرهای پیک" rows={ships.filter((s) => s.courier)} rowKey={(s) => s.id} onRow={(s) => nav(`/admin/orders/${s.orderId}`)} empty={{ title: 'هنوز سفری ثبت نشده است.', desc: 'با چسباندن لینک سفر در کارت مرسوله، سفر اینجا ثبت می‌شود.' }}
        cols={[{ key: 'c', title: 'کد سفر', render: (s) => <CopyId v={s.courier!.code} /> }, { key: 'n', title: 'پیک', render: (s) => <Cell a={s.courier!.name} b={`${s.courier!.vehicle} · ${s.courier!.plate}`} /> }, { key: 'o', title: 'مرسوله', render: (s) => <CopyId v={s.id} /> }, { key: 'cost', title: 'هزینه', align: 'left', render: (s) => <Money v={s.courier!.cost} />, sort: (s) => s.courier!.cost, text: (s) => s.courier!.cost }, { key: 's', title: 'وضعیت', render: (s) => <StatusBadge s={s.status} /> }]} />}
      {tab === 'track' && <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">{[['تکی', 'چسباندن یا اسکن کد در کارت مرسوله', () => nav('/admin/orders/GH-10479')], ['اسکن پشت‌سرهم', 'برچسب مرسوله، سپس بارکد پست', () => setScan(true)], ['فایل باجه', 'بارگذاری Excel یا CSV و تطبیق خودکار', () => setFile(true)], ['عکس رسید', 'استخراج کدها از عکس (OCR)', () => setFile(true)]].map(([t, desc, fn]) => <button key={t as string} onClick={fn as () => void} className="rounded-lg border border-line bg-surface p-4 text-right hover:border-brand"><p className="text-13 font-semibold">{t as string}</p><p className="mt-1 text-12 text-t2">{desc as string}</p></button>)}</div>
        <DataTable name="مرسوله‌های پستی" rows={ships.filter((s) => /پست|تیپاکس|باربری/.test(s.method))} rowKey={(s) => s.id} onRow={(s) => nav(`/admin/orders/${s.orderId}`)} empty={{ title: 'مرسولهٔ پستی‌ای نیست.' }}
          cols={[{ key: 'id', title: 'مرسوله', render: (s) => <CopyId v={s.id} /> }, { key: 'w', title: 'انبار', render: (s) => WAREHOUSE[s.warehouse] }, { key: 'm', title: 'روش', render: (s) => <WithLogo name={s.method} /> }, { key: 't', title: 'کد رهگیری', render: (s) => s.tracking ? <CopyId v={s.tracking} /> : <Badge tone="warning">ثبت نشده</Badge> }, { key: 's', title: 'وضعیت', render: (s) => <StatusBadge s={s.status} /> }, { key: 'sla', title: 'مهلت', render: (s) => <SlaChip at={s.sla} done={['ship.delivered', 'ship.cancelled'].includes(s.status)} /> }]}
          bulk={(ids, clear) => <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/print?ship=${ids[0]}&doc=manifest`); clear() }}>مانیفست تحویل {fa(ids.length)} مرسوله</Button>} />
        {scan && <BatchScan onClose={() => setScan(false)} />}</div>}
      {tab === 'photos' && <DataTable name="بایگانی عکس ارسال" rows={ships.filter((x) => !['ship.cancelled'].includes(x.status))} rowKey={(x) => x.id} onRow={(x) => nav(`/admin/orders/${x.orderId}`)} search={(x) => `${x.id} ${x.orderId}`} empty={{ title: 'هنوز عکسی بایگانی نشده است.' }}
        cols={[{ key: 'id', title: 'مرسوله', render: (x) => <Cell pid={x.items[0]?.productId} a={<span className="ltr font-mono">{x.id}</span>} b={x.method} /> }, { key: 'st', title: 'وضعیت', render: (x) => <StatusBadge s={x.status} /> }, { key: 'ph', title: 'عکس پیش از ارسال', render: (x) => <PackPhotos orderId={x.orderId} shipId={x.id} readOnly /> , wrap: true }]} />}
      {tab === 'fast' && <FastCourier />}
      {tab === 'slots' && <SlotsEngine />}
      {tab === 'pickup' && <PickupRules />}
      {tab === 'sms' && <SmsLog />}
      {tab === 'zones' && <div className="space-y-6"><ZoneMap /><div><h2 className="mb-2 text-14 font-semibold">مناطق ارسال</h2><EntityManager ek="zones" kind="منطقه" fields={[{ k: 'name', label: 'نام منطقه', required: true }, { k: 'cities', label: 'شهرها و محدوده', type: 'textarea' }, { k: 'methods', label: 'روش‌های مجاز' }, { k: 'active', label: 'فعال', type: 'toggle' }]} /></div><div><h2 className="mb-2 text-14 font-semibold">بازه‌های زمانی تحویل</h2><EntityManager ek="slots" kind="بازه" fields={[{ k: 'name', label: 'بازه', required: true }, { k: 'capacity', label: 'ظرفیت', type: 'number' }, { k: 'days', label: 'روزها' }, { k: 'active', label: 'فعال', type: 'toggle' }]} /></div></div>}
      {tab === 'carriers' && <Providers family="carrier" title="شرکت حمل" list={carriers} />}
      {file && <PostFile onClose={() => setFile(false)} />}
    </Page>
  )
}

/** الگوی «ثبت ارائه‌دهنده» (بخش ۵.۱۱-الف): فهرست کارتی، افزودن، چرخهٔ عمر و حذف امن با «بررسی اثر» */
export function Providers({ family, title, list }: { family: string; title: string; list: ReturnType<typeof useLookup>['d']['providers'] }) {
  const { d } = useLookup(); const [add, setAdd] = useState(false); const [name, setName] = useState(''); const [impact, setImpact] = useState<string | null>(null)
  const target = d.providers.find((p) => p.id === impact)
  const openOrders = target ? d.orders.filter((o) => o.pay.includes(target.name) && !['order.delivered', 'order.cancelled', 'order.returned'].includes(o.status)).length : 0
  const texts = target ? d.cardBadges.filter(() => target.isDefault && target.family === 'bnpl').length + (target.isDefault ? 2 : 0) : 0
  const retire = () => { if (!target) return; mutate((x) => { const p = x.providers.find((y) => y.id === target.id)!; p.status = 'prov.retired'; if (p.isDefault) { p.isDefault = false; const alt = x.providers.find((y) => y.family === p.family && y.status === 'prov.active' && y.id !== p.id); if (alt) alt.isDefault = true } }, { action: 'بازنشستگی ارائه‌دهنده', target: target.name }); setImpact(null); toast(`${target.name} بازنشسته شد. متن‌ها و بج‌های وابسته خودکار اصلاح شد و سوابق قابل مشاهده می‌ماند.`) }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <Card key={p.id}><div className="flex items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-14 font-semibold"><BrandLogo name={p.name} size={24} fallback={false} />{p.name}{p.isDefault && <span className="mr-2"><Badge tone="brand" dot={false}>پیش‌فرض</Badge></span>}</p><p className="text-11 text-t3">سهم استفاده {pct(p.share)}{p.health > 0 && ` · سلامت ${pct(p.health, 1)}`}</p></div><StatusBadge s={p.status} /></div>
            {p.status === 'prov.error' && <p className="mt-2 rounded-sm bg-danger-bg px-2 py-1.5 text-12 text-danger">{p.name} پاسخ نمی‌دهد. خودکار از صفحهٔ پرداخت پنهان شده و با پایدار شدن برمی‌گردد.</p>}
            {p.status === 'prov.soon' ? <p className="mt-2 text-12 text-t2">اتصال، قواعد انتشار، همگام‌سازی قیمت و موجودی و دریافت سفارش این کانال به‌زودی اضافه می‌شود.</p> : p.status !== 'prov.retired' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={async () => { try { await fakeCall(true); mutate((x) => { const t = x.providers.find((y) => y.id === p.id)!; if (t.status === 'prov.error') t.status = 'prov.slow'; t.health = Math.max(t.health, 95) }, { action: 'تست اتصال', target: p.name, after: 'موفق' }); toast(`اتصال ${p.name} برقرار است: پاسخ در ۳۲۰ میلی‌ثانیه.`) } catch { mutate(() => {}, { action: 'تست اتصال', target: p.name, after: 'ناموفق' }); toast(`${p.name} پاسخ نداد. کلید اتصال و وضعیت سرویس را بررسی کنید.`, { tone: 'err' }) } }}>تست اتصال</Button>
                {!p.isDefault && p.status === 'prov.active' && <Button size="sm" onClick={() => { mutate((x) => x.providers.filter((y) => y.family === p.family).forEach((y) => (y.isDefault = y.id === p.id)), { action: 'تغییر پیش‌فرض', target: p.name }); toast(`${p.name} پیش‌فرض شد. متن‌های وابسته در سایت به‌روز شد.`) }}>پیش‌فرض کن</Button>}
                {['prov.paused', 'prov.testing'].includes(p.status) ? <Button size="sm" onClick={() => mutate((x) => { x.providers.find((y) => y.id === p.id)!.status = 'prov.active' }, { action: 'فعال‌سازی ارائه‌دهنده', target: p.name })}>فعال برای همه</Button> : <Button size="sm" variant="danger" onClick={() => setImpact(p.id)}>توقف یا حذف</Button>}
              </div>)}
          </Card>))}
        <button onClick={() => setAdd(true)} className="grid min-h-28 place-items-center rounded-lg border border-dashed border-line text-13 text-t2 hover:border-brand hover:text-brand">+ افزودن {title}</button>
      </div>
      <Modal open={add} onClose={() => setAdd(false)} title={`افزودن ${title}`} footer={<><Button variant="primary" onClick={() => { if (!name) return; mutate((x) => { x.providers.push({ id: `custom-${x.providers.length}`, family, name, status: 'prov.testing', share: 0, health: 100, isDefault: false, installments: 4, fee: 5, settleDays: 7, pending: 0, min: 1000000, max: 100000000 } as any) }, { action: 'افزودن ارائه‌دهنده', target: name }); setAdd(false); setName(''); toast(`${name} در حالت آزمایشی اضافه شد. پس از آزمایش، تدریجی فعال کنید.`) }}>افزودن در حالت آزمایشی</Button><Button variant="ghost" onClick={() => setAdd(false)}>انصراف</Button></>}>
        <div className="space-y-3"><Field label="نام" help="از فهرست آماده انتخاب کنید یا نام سفارشی بنویسید."><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={family === 'bnpl' ? 'مثلاً ازکی‌پی' : 'مثلاً الوپیک'} /></Field><Field label="کلید اتصال" help="پنهان ذخیره می‌شود. در نسخهٔ نمایشی کلید واقعی وارد نکنید."><Input type="password" placeholder="••••••••" /></Field>
          <p className="text-12 text-t2">چرخهٔ عمر: پیش‌نویس ← آزمایش در محیط تست ← فعال برای بخشی از کاربران ← فعال برای همه ← توقف موقت ← بازنشسته.</p></div>
      </Modal>
      <Modal open={!!target} onClose={() => setImpact(null)} title={`بررسی اثر توقف ${target?.name ?? ''}`} footer={<><Button variant="danger" disabled={openOrders > 0} onClick={retire}>بازنشسته‌کردن {target?.name}</Button><Button onClick={() => { mutate((x) => { x.providers.find((y) => y.id === target!.id)!.status = 'prov.paused' }, { action: 'توقف موقت ارائه‌دهنده', target: target!.name }); setImpact(null); toast(`${target!.name} موقتاً متوقف شد.`, { undo: () => mutate((x) => { x.providers.find((y) => y.id === target!.id)!.status = 'prov.active' }) }) }}>فقط توقف موقت</Button></>}>
        <ul className="space-y-2 text-13">
          <li className="flex justify-between"><span>سفارش باز با این سرویس</span><b className={openOrders ? 'text-danger' : ''}>{fa(openOrders)}</b></li>
          <li className="flex justify-between"><span>تسویهٔ معوق</span><b>{target?.pending ? compactToman(target.pending) : 'ندارد'}</b></li>
          <li className="flex justify-between"><span>متن و بج دارای نام این سرویس</span><b>{fa(texts)} مورد (اصلاح خودکار)</b></li>
          <li className="flex justify-between"><span>جایگزین پیش‌فرض</span><b>{d.providers.find((y) => y.family === target?.family && y.status === 'prov.active' && y.id !== target?.id)?.name ?? 'ندارد'}</b></li>
        </ul>
        {openOrders > 0 && <p className="mt-3 rounded-sm bg-warning-bg px-2 py-1.5 text-12 text-warning">تا بسته‌شدن {fa(openOrders)} سفارش باز، بازنشستگی ممکن نیست. توقف موقت را انتخاب کنید تا سفارش تازه‌ای نگیرد.</p>}
      </Modal>
    </>
  )
}

// ───────── مرجوعی و گارانتی ─────────
export function Returns() {
  const { d, customer, rule } = useLookup(); const [tab, setTab] = useTab('returns'); const nav = useNavigate()
  const [manual, setManual] = useState<null | 'return' | 'warranty'>(null); const [q, setQ] = useState('all')
  const rs = d.returns.map((r) => ({ r, s: retStage(r) })); const ws = d.warranties.map((w) => ({ w, s: warStage(w) }))
  const cnt = (list: { s: Stage }[]) => Object.fromEntries(QUEUES.map(([k]) => [k, list.filter((x) => inQueue(k, x.s)).length]))
  const rc = cnt(rs); const wc = cnt(ws); const cur = tab === 'warranty' ? wc : rc
  const nextCol = { key: 'n', title: 'قدم بعد', hideMobile: true, render: (x: { s: Stage }) => <span className="flex flex-col"><span className="line-clamp-1 text-13">{x.s.next}</span>{x.s.who !== '—' && <span className={cx('text-12', x.s.who === 'ما' ? 'font-semibold text-warning' : 'text-t3')}>اقدام با: {x.s.who}</span>}</span> }
  return (
    <Page title="مرجوعی و گارانتی" module="returns" sub={`مهلت مرجوعی ${fa(rule('return_days'))} روز پس از تحویل · مهلت بازرسی ${fa(rule('inspection_hours'))} ساعت · هر ردیف را باز کنید تا پرونده مرحله‌به‌مرحله جلو برود`}
      primary={<Button variant="primary" onClick={() => setManual(tab === 'warranty' || tab === 'wcards' ? 'warranty' : 'return')}>{tab === 'warranty' || tab === 'wcards' ? 'ثبت دستی درخواست گارانتی' : 'ثبت دستی مرجوعی'}</Button>}
      empty={{ title: 'هنوز مرجوعی‌ای ثبت نشده است.', desc: 'درخواست‌های مرجوعی مشتریان اینجا نمایش داده می‌شود.', action: <Button onClick={() => nav('/admin/rules')}>مشاهدهٔ قوانین مرجوعی</Button> }}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'returns', label: 'مرجوعی‌ها', count: d.returns.length }, { id: 'warranty', label: 'درخواست‌های گارانتی', count: d.warranties.length }, { id: 'wcards', label: 'گارانتی‌ها، کدها و استعلام', count: d.wcards.length }, { id: 'flow', label: 'روند کار' }, { id: 'stats', label: 'تحلیل' }]} />}>
      {(tab === 'returns' || tab === 'warranty') && <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="صف‌ها">{QUEUES.map(([k, l]) => <button key={k} type="button" aria-pressed={q === k} onClick={() => setQ(k)} className={cx('flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-13', q === k ? 'border-brand-solid bg-brand-tint font-semibold text-brand' : 'border-line bg-surface text-t2 hover:border-brand/40')}>{l}<span className={cx('rounded-full px-1.5 text-11', k === 'us' && cur[k] ? 'bg-warning text-white' : 'bg-neutral-bg')}>{fa(cur[k])}</span></button>)}</div>}
      {tab === 'returns' && <DataTable name="مرجوعی‌ها" rows={rs.filter((x) => inQueue(q, x.s))} rowKey={(x) => x.r.id} onRow={(x) => nav(`/admin/returns/${x.r.id}`)} search={(x) => `${x.r.id} ${x.r.orderId} ${customer(x.r.customerId).name}`} empty={{ title: q === 'all' ? 'هنوز مرجوعی‌ای ثبت نشده است.' : 'در این صف پرونده‌ای نیست.' }}
        cols={[{ key: 'id', title: 'شماره', render: (x) => <CopyId v={x.r.id} /> }, { key: 'c', title: 'مشتری', render: (x) => <Cell a={<CustLink v={customer(x.r.customerId).name} id={x.r.customerId} />} b={x.r.orderId} /> }, { key: 'r', title: 'دلیل', hideMobile: true, render: (x) => x.r.reason, sort: (x) => x.r.reason }, { key: 'm', title: 'روش ارسال', hideMobile: true, render: (x) => METHODS[x.r.method ?? 'post']?.short }, { key: 'a', title: 'مبلغ', align: 'left', render: (x) => <Money v={x.r.refund?.amount ?? x.r.amount} />, sort: (x) => x.r.amount }, { key: 's', title: 'وضعیت', render: (x) => <StatusBadge s={x.r.status} />, sort: (x) => x.s.step }, nextCol, { key: 'd', title: 'مهلت ارسال', render: (x) => <SlaChip at={x.r.deadline} done={x.s.step >= 2 || x.s.who === '—'} /> }]} />}
      {tab === 'warranty' && <DataTable name="درخواست‌های گارانتی" rows={ws.filter((x) => inQueue(q, x.s))} rowKey={(x) => x.w.id} search={(x) => `${x.w.code} ${x.w.id} ${d.units.find((u) => u.id === x.w.unitId)?.serial ?? ''}`} empty={{ title: q === 'all' ? 'درخواست گارانتی‌ای نیست.' : 'در این صف پرونده‌ای نیست.', desc: 'مشتری از «گارانتی‌های من» در پنل کاربری درخواست مرجوعی گارانتی ثبت می‌کند.' }}
        cols={[{ key: 'id', title: 'درخواست', render: (x) => <CopyId v={x.w.id} /> }, { key: 'c', title: 'مشتری', render: (x) => <Cell a={<CustLink v={customer(x.w.customerId).name} id={x.w.customerId} />} b={x.w.code} /> }, { key: 'k', title: 'دلیل مشکل', hideMobile: true, render: (x) => x.w.reasonKind ?? '—' }, { key: 't', title: 'گارانتی', hideMobile: true, render: (x) => `${x.w.type} · ${fa(x.w.months)} ماه` }, { key: 's', title: 'وضعیت', render: (x) => <StatusBadge s={x.w.status} />, sort: (x) => x.s.step }, nextCol, { key: 'd', title: 'مهلت', render: (x) => <SlaChip at={x.w.deadline} done={x.s.who === '—'} /> }]}
        onRow={(x) => nav(`/admin/returns/w/${x.w.id}`)} />}
      {tab === 'wcards' && <WarrantyCards onRequest={() => setManual('warranty')} />}
      {tab === 'flow' && <FlowGuide />}
      {tab === 'stats' && <div className="grid gap-4 md:grid-cols-2"><Card title="دلایل مرجوعی"><Bars data={[{ label: 'مغایرت با صفحهٔ کالا', value: 40 }, { label: 'انصراف از خرید', value: 33 }, { label: 'ایراد کارکردی', value: 19 }, { label: 'سایر', value: 8 }]} fmt={pct} color="var(--purple)" /><div className="mt-3"><AITag confidence="متوسط" /></div><p className="mt-1 text-12 text-t2">۴۰٪ مرجوعی‌های هدفون به‌خاطر مغایرت رنگ در عکس است. پیشنهاد: بازبینی نور عکاسی این دسته.</p></Card>
        <Card title="نرخ خرابی در گارانتی به تفکیک تأمین"><Bars data={[{ label: 'انبارگردانی آمازون', value: 2.1 }, { label: 'خرید مستقیم اقلیم کردستان', value: 3.4 }, { label: 'شریک انبار مهاباد', value: 4.0 }]} fmt={(n) => pct(n, 1)} color="var(--warning)" /></Card></div>}
      <ManualReturn open={!!manual} defaultKind={manual ?? 'return'} key={manual ?? 'x'} onClose={() => setManual(null)} />
    </Page>
  )
}

/** گارانتی‌های صادرشده: همان «گارانتی‌های من» و «استعلام گارانتی» پنل مشتری، از دید مدیریت.
 *  کارت‌ها برای هر واحد فروخته‌شده خودکار ساخته می‌شوند؛ صدور دستی برای کالای داخل یا خارج از سایت با عکس اجباری. */
function WarrantyCards({ onRequest }: { onRequest: () => void }) {
  const { d } = useLookup(); const nav = useNavigate()
  const [sp] = useSearchParams(); const [st, setSt] = useState<'all' | 'active' | 'awaiting' | 'expired' | 'invalid' | 'manual'>('all'); const [open, setOpen] = useState<string | null>(sp.get('q')); const [issue, setIssue] = useState(false)
  const rows = d.wcards.map((c) => ({ c, s: cardState(c), t: cardStatusText(c) }))
  const sel = rows.find((r) => r.c.code === open)
  const reqs = sel ? d.warranties.filter((w) => w.code === sel.c.code) : []
  const F: [typeof st, string, (r: (typeof rows)[number]) => boolean][] = [['all', 'همه', () => true], ['active', 'فعال', (r) => r.t === 'فعال'], ['awaiting', 'در انتظار تحویل', (r) => r.t === 'در انتظار تحویل'], ['expired', 'منقضی‌شده', (r) => r.t === 'منقضی‌شده'], ['invalid', 'نامعتبر', (r) => r.t === 'نامعتبر'], ['manual', 'صدور دستی', (r) => r.c.source === 'manual']]
  const tone = (t: string) => (t === 'فعال' ? 'success' : t === 'در انتظار تحویل' ? 'warning' : 'danger') as 'success' | 'warning' | 'danger'
  return <div className="space-y-4">
    <Card title="استعلام" hint={<span className="text-12 font-normal text-t2">گارانتی، درخواست گارانتی و مرجوعی؛ کارت‌های دستی هم پیدا می‌شوند</span>} actions={<Button size="sm" variant="primary" onClick={() => setIssue(true)}>صدور دستی گارانتی</Button>}>
      <Inquiry onCard={setOpen} />
    </Card>
    <p className="rounded-lg bg-neutral-bg px-3 py-2 text-12 text-t2">هر کالایی که در صفحهٔ کالا گارانتی دارد، به‌محض قطعی شدن سفارش برای هر واحد (یا هر عدد) یک کد گارانتی یکتا می‌گیرد. تا تحویل «در انتظار تحویل» است و با تحویل، شروعش همان روز ثبت می‌شود. کد در سفارش، پروفایل مشتری و «گارانتی‌های من» مشتری دیده می‌شود و روی کارت چاپ می‌شود.</p>
    <div className="flex flex-wrap gap-1.5">{F.map(([k, l, fn]) => <button key={k} type="button" aria-pressed={st === k} onClick={() => setSt(k)} className={cx('min-h-9 rounded-full border px-3 text-13', st === k ? 'border-brand-solid bg-brand-tint font-semibold text-brand' : 'border-line bg-surface text-t2')}>{l} <span className="text-11">{fa(rows.filter(fn).length)}</span></button>)}</div>
    <DataTable name="گارانتی‌ها" empty={{ title: 'گارانتی‌ای با این فیلتر نیست.' }} rows={rows.filter(F.find((x) => x[0] === st)![2])} rowKey={(r) => r.c.code} onRow={(r) => setOpen(r.c.code)} search={(r) => `${r.c.code} ${cardSerial(d, r.c)} ${cardProduct(d, r.c)} ${cardCustomer(d, r.c)} ${cardMobile(d, r.c)} ${r.c.orderId}`}
      cols={[{ key: 'code', title: 'کد گارانتی', render: (r) => <CopyId v={r.c.code} /> }, { key: 'p', title: 'کالا', render: (r) => <Cell a={cardProduct(d, r.c)} b={serialText(d, r.c)} /> }, { key: 'c', title: 'مشتری', hideMobile: true, render: (r) => r.c.customerId ? <CustLink v={cardCustomer(d, r.c)} id={r.c.customerId} /> : <Cell a={cardCustomer(d, r.c)} b={cardMobile(d, r.c)} /> },
        { key: 'src', title: 'صدور', hideMobile: true, render: (r) => r.c.source === 'manual' ? <Badge tone="info">دستی · {r.c.createdBy}</Badge> : <span className="text-12 text-t2">خودکار{r.c.orderId ? ` · ${r.c.orderId}` : ''}</span> },
        { key: 't', title: 'نوع و مدت', hideMobile: true, render: (r) => `${r.c.type} · ${fa(r.c.months)} ماه` }, { key: 'e', title: 'تاریخ پایان', render: (r) => r.t === 'نامعتبر' ? '—' : r.c.awaiting ? 'از تاریخ تحویل' : r.s.end.toLocaleDateString('fa-IR'), sort: (r) => r.s.end.getTime() }, { key: 's', title: 'وضعیت', render: (r) => <Badge tone={tone(r.t)}>{r.t}</Badge> }]} />
    <Drawer open={!!sel} onClose={() => setOpen(null)} width={540} title={sel ? <span className="flex items-center gap-2">جزئیات گارانتی <CopyId v={sel.c.code} /></span> : ''}>
      {sel && <div className="space-y-4 text-13">
        <div className="space-y-2"><Row k="کالا">{cardProduct(d, sel.c)}{sel.c.offsite && <Badge tone="warning">خارج از سایت</Badge>}</Row><Row k="سریال">{cardSerial(d, sel.c) ? <span className="ltr font-mono">{cardSerial(d, sel.c)}</span> : serialText(d, sel.c)}</Row><Row k="سفارش">{sel.c.orderId ? <button type="button" className="ltr font-mono text-brand" onClick={() => nav(`/admin/orders/${sel.c.orderId}`)}>{sel.c.orderId}</button> : '—'}</Row>
          <Row k="مشتری">{sel.c.customerId ? <CustLink v={cardCustomer(d, sel.c)} id={sel.c.customerId} /> : `${cardCustomer(d, sel.c)} · ${cardMobile(d, sel.c)}`}</Row><Row k="نوع گارانتی">{sel.c.type}</Row><Row k="مدت گارانتی">{fa(sel.c.months)} ماه</Row><Row k="ارائه‌دهنده (گارانتی‌کننده)">{sel.c.provider}</Row>
          <Row k="تاریخ شروع">{sel.c.awaiting ? 'روز تحویل سفارش' : new Date(sel.c.start).toLocaleDateString('fa-IR')}</Row><Row k="تاریخ پایان">{sel.c.awaiting ? `${fa(sel.c.months)} ماه پس از تحویل` : sel.s.end.toLocaleDateString('fa-IR')}</Row>
          <Row k="وضعیت"><Badge tone={tone(sel.t)}>{sel.t}</Badge>{sel.c.invalidReason && <span className="text-12 text-danger"> · {sel.c.invalidReason}</span>}</Row>
          <Row k="صدور">{sel.c.source === 'manual' ? `دستی توسط ${sel.c.createdBy}${sel.c.createdAt ? ` · ${rel(sel.c.createdAt)}` : ''}` : 'خودکار هنگام فروش'}</Row></div>
        {(sel.c.photos ?? []).length > 0 && <div><p className="mb-1 font-semibold">عکس کالا هنگام صدور</p><div className="flex flex-wrap gap-2">{sel.c.photos!.map((ph, i) => <a key={i} href={ph} target="_blank" rel="noreferrer"><img src={ph} alt="" className="size-20 rounded-lg object-cover" /></a>)}</div></div>}
        <div><p className="mb-1 font-semibold">شرایط پوشش این گارانتی</p><p className="text-12"><b className="text-success">تحت پوشش:</b> {COVERED.join('، ')}</p><p className="text-12"><b className="text-danger">خارج از پوشش:</b> {EXCLUDED.join('، ')}</p>{sel.c.notes.map((n) => <p key={n} className="text-12 text-t2">تبصرهٔ این کالا: {n}</p>)}</div>
        <div><p className="mb-1 font-semibold">سوابق خدمات و درخواست‌ها</p>{reqs.length ? <ul className="space-y-1">{reqs.map((w) => <li key={w.id}><button type="button" className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-start hover:border-brand/40" onClick={() => nav(`/admin/returns/w/${w.id}`)}><span className="ltr font-mono">{w.id}</span><StatusBadge s={w.status} /></button></li>)}</ul> : <p className="text-12 text-t2">هنوز درخواستی برای این گارانتی ثبت نشده است.</p>}</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<Printer size={13} />} onClick={() => nav(`/admin/print?doc=warranty&code=${sel.c.code}`)}>چاپ کارت گارانتی</Button>
          {sel.s.status === 'active' && !sel.c.awaiting && <Button size="sm" onClick={onRequest}>ثبت درخواست گارانتی</Button>}
          {sel.s.status !== 'invalid' && <Button size="sm" variant="danger" onClick={async () => { const w = await askReason({ kind: 'warranty', ref: sel.c.code, status: 'نامعتبر کردن گارانتی', title: `علت نامعتبر کردن ${sel.c.code}` }); if (w) { mutate((x) => { const c = x.wcards.find((y) => y.code === sel.c.code); if (c) { c.status = 'invalid'; c.invalidReason = w } }, { action: 'نامعتبر کردن گارانتی', target: sel.c.code, after: w }); toast('گارانتی نامعتبر شد؛ مشتری در تب «نامعتبر» می‌بیند.') } }}>نامعتبر کردن با دلیل</Button>}
          {sel.s.status === 'invalid' && <Button size="sm" onClick={() => { mutate((x) => { const c = x.wcards.find((y) => y.code === sel.c.code); if (c) { c.status = 'active'; c.invalidReason = undefined } }, { action: 'معتبر کردن دوبارهٔ گارانتی', target: sel.c.code }); toast('گارانتی دوباره معتبر شد.') }}>معتبر کردن دوباره</Button>}
        </div>
      </div>}
    </Drawer>
    {issue && <ManualWarranty open onClose={() => setIssue(false)} onDone={(c) => setOpen(c)} />}
  </div>
}

/** راهنمای روند: همان مراحل فیگمای پنل کاربری و اینکه هر مرحله با کیست */
function FlowGuide() {
  const R: [string, string, string][] = [
    ['ثبت درخواست', 'مشتری', 'از «سفارش‌های تحویل‌شده»: انتخاب کالا (فقط کالاهایی که مهلت ۷ روزه‌شان باز است)، دلیل (ایراد کارکردی، مغایرت با صفحهٔ کالا، کالای غیراصل، آسیب‌دیدگی حین حمل، انصراف از خرید)، توضیح و عکس (برای همه به‌جز انصراف دست‌کم یک عکس)، روش ارسال (تحویل حضوری، پست پس‌کرایه، پیک پس‌کرایه) و مقصد بازگشت وجه (کیف پول یا کارت بانکی به نام خود). درخواست مستقیم به «در انتظار ارسال کالا» می‌رود.'],
    ['ارسال کالا به غنیمت', 'مشتری', 'مشتری تا پایان مهلت کالا را می‌فرستد و ارسال را اعلام می‌کند (کد رهگیری اختیاری). ما می‌توانیم به نیابت از مشتری اعلام کنیم، یادآوری بفرستیم، یا با پایان مهلت پرونده را ببندیم. تا پیش از ارسال، مشتری می‌تواند لغو کند.'],
    ['بررسی کالا', 'ما', 'ثبت دریافت در انبار مرجوعی یا شعبه (سریال، پلمب، متعلقات، عکس)، سپس بررسی پلمب، ظاهر، کارکرد و متعلقات در مرکز کنترل کیفیت و تصمیم برای هر کالا جداگانه.'],
    ['نتیجه و بازگشت وجه', 'مالی / ما', 'تأیید کامل (بهای کالا، به‌علاوهٔ هزینهٔ ارسال خرید اگر همهٔ کالاهای سفارش برگردد)، تأیید با کسر هزینهٔ ارسال (انصراف)، تأیید بخشی، یا رد. واریز به همان مقصدی که مشتری انتخاب کرده با شمارهٔ پیگیری. کالای ردشده تا ۲۴ ساعت با مرسولهٔ تازه در همان سفارش دوباره ارسال می‌شود.'],
  ]
  const W: [string, string, string][] = [
    ['ثبت درخواست', 'مشتری', 'از «گارانتی‌های من»: دلیل مشکل (ایراد کارکردی یا عملکرد، تردید در اصالت، سایر)، شرح مشکل، عکس یا ویدیو، شمارهٔ تماس و پذیرش شرایط پوشش.'],
    ['بررسی غنیمت', 'ما', '«شروع بررسی» وضعیت را از «در انتظار بررسی» به «در حال بررسی» می‌برد. مدارک و شرایط پوشش بررسی می‌شود.'],
    ['تأیید', 'ما', 'تأیید با تعیین مهلت ارسال کالا، یا رد با ذکر دلیل (مثلاً آسیب فیزیکی پس از تحویل).'],
    ['ارسال کالا', 'مشتری', 'مشتری روش را انتخاب می‌کند (تحویل حضوری، پست پیشتاز پس‌کرایه، پیک) و ارسال را اعلام می‌کند. بدون ارسال تا پایان مهلت، درخواست بسته می‌شود.'],
    ['انجام خدمت', 'ما', 'دریافت و بررسی کالا، ثبت ایراد تأییدشده و نوع خدمت. تعمیر؛ اگر ممکن نبود تعویض با کالای سالم (سریال جدید)؛ اگر آن هم ممکن نبود بازگشت مبلغ به کیف پول.'],
    ['تکمیل', 'ما', 'ارسال کالای تعمیرشده یا جایگزین با کد رهگیری و ثبت تحویل، یا واریز مبلغ و بستن درخواست.'],
  ]
  const T = ({ title, rows }: { title: string; rows: [string, string, string][] }) => <Card title={title}><ol className="space-y-3">{rows.map(([a, b, c], i) => <li key={a} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-tint text-12 font-bold text-brand">{fa(i + 1)}</span><div className="text-13"><p className="font-semibold">{a} <span className="text-12 font-normal text-t3">· اقدام با {b}</span></p><p className="text-t2">{c}</p></div></li>)}</ol></Card>
  return <div className="space-y-3"><p className="text-12 text-t2">این مراحل عیناً از فیگمای پنل کاربری (سفارش‌های مرجوعی و گارانتی‌ها) گرفته شده است؛ هر اقدام این‌جا همان وضعیتی را به مشتری نشان می‌دهد که در فیگما طراحی شده.</p><div className="grid gap-4 lg:grid-cols-2"><T title="مرجوعی" rows={R} /><T title="گارانتی" rows={W} /></div></div>
}

/** ماشین‌حساب هزینهٔ ارسال: با وزن و مبلغ سبد، هزینهٔ هر روش همان‌طور که مشتری می‌بیند */
function ShipCalc() {
  const d = useDB(); const [kg, setKg] = useState('2'); const [cart, setCart] = useState('8000000')
  const free = d.rules.find((r) => r.key === 'free_shipping_threshold')?.value ?? 0
  const w = Math.max(0, +kg || 0); const c = +cart || 0
  return <Card className="mt-3" title="ماشین‌حساب هزینهٔ ارسال"><div className="mb-3 flex flex-wrap gap-3"><Field label="وزن مرسوله (کیلوگرم)"><Input className="ltr w-28 text-left" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ''))} /></Field><Field label="مبلغ سبد (تومان)"><Input className="ltr w-40 text-left" inputMode="numeric" value={cart} onChange={(e) => setCart(e.target.value.replace(/\D/g, ''))} /></Field></div>
    <ul className="divide-y divide-line text-13">{(d.entities.shipMethods ?? []).filter((m) => m.active).map((m) => { const max = Number(m.maxKg) || 0; const over = max > 0 && w > max; const fee = Number(m.price) + Math.max(0, Math.ceil(w - 1)) * (Number(m.perKg) || 0); const isFree = free > 0 && c >= free && Number(m.price) > 0; return <li key={String(m.id)} className="flex items-center justify-between gap-2 py-2"><span>{String(m.name).replace('{مدت_تحویل_سریع}', fa(d.rules[0].value))}<span className="block text-11 text-t2">{String(m.timeText ?? '').replace('{مدت_تحویل_سریع}', fa(d.rules[0].value))}</span></span>{over ? <span className="text-12 text-t3">نمایش داده نمی‌شود (بیش از {fa(max)} کیلو)</span> : isFree ? <span className="text-12 font-semibold text-success">رایگان <s className="font-normal text-t3">{toman(fee)}</s></span> : <b className="tnum">{fee ? toman(fee) : 'رایگان'}</b>}</li> })}</ul>
    <p className="mt-2 text-11 text-t2">آستانهٔ ارسال رایگان ({toman(free)}) از «قوانین کسب‌وکار» خوانده می‌شود.</p></Card>
}

/** اسکن پشت‌سرهم: اسکنر بارکد مثل صفحه‌کلید تایپ می‌کند؛ اول برچسب مرسوله، بعد بارکد پست. هر جفت فوراً الحاق می‌شود */
function BatchScan({ onClose }: { onClose: () => void }) {
  const d = useDB(); const [v, setV] = useState(''); const [cur, setCur] = useState<string | null>(null); const [log, setLog] = useState<{ ship: string; code?: string; ok: boolean; msg: string }[]>([])
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, orderId: o.id })))
  const take = (raw: string) => {
    const t = raw.trim().replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).toUpperCase(); if (!t) return
    const sh = ships.find((s) => s.id === t || s.id === t.replace(/^GH/, 'GH-'))
    if (sh) { setCur(sh.id); setLog((l) => [{ ship: sh.id, ok: true, msg: sh.tracking ? `قبلاً کد ${sh.tracking} داشت؛ بارکد تازه جایگزین می‌شود` : 'منتظر بارکد پست…' }, ...l]); return }
    if (!cur) { setLog((l) => [{ ship: '—', code: t, ok: false, msg: 'اول برچسب مرسوله را اسکن کنید.' }, ...l]); return }
    if (!/^\d{10,26}$/.test(t)) { setLog((l) => [{ ship: cur, code: t, ok: false, msg: 'بارکد پست باید ۱۰ تا ۲۶ رقم باشد.' }, ...l]); return }
    if (ships.some((s) => s.tracking === t && s.id !== cur)) { setLog((l) => [{ ship: cur, code: t, ok: false, msg: 'این کد رهگیری روی مرسولهٔ دیگری ثبت است.' }, ...l]); return }
    { const oid = getDB().orders.find((o) => o.shipments.some((y) => y.id === cur))?.id; if (oid && shipBlocked(oid, true)) { setLog((l) => [{ ship: cur, code: t, ok: false, msg: 'منتظر پرداخت مابه‌التفاوت؛ ارسال قفل است.' }, ...l]); return } }
    mutate((x) => { const s = x.orders.flatMap((o) => o.shipments).find((y) => y.id === cur)!; s.tracking = t; s.trackingCarrier = 'پست'; if (['ship.packed', 'ship.picking', 'ship.pending'].includes(s.status)) s.status = 'ship.handed' }, { action: 'الحاق کد رهگیری با اسکن', target: cur, after: t })
    setLog((l) => [{ ship: cur, code: t, ok: true, msg: 'الحاق شد و مرسوله «تحویل پست» شد.' }, ...l]); setCur(null)
  }
  const done = log.filter((x) => x.ok && x.code).length
  return <Modal open onClose={onClose} wide title="اسکن پشت‌سرهم برچسب و بارکد پست" footer={<><Button variant="primary" onClick={onClose}>پایان ({fa(done)} الحاق)</Button></>}>
    <p className="mb-3 text-12 text-t2">اسکنر بارکد را به کامپیوتر وصل کنید یا کد را تایپ کنید و Enter بزنید. ترتیب: <b>برچسب مرسوله</b> (مثلاً GH-10479-1) سپس <b>بارکد پست</b>. خطاها همان لحظه نشان داده می‌شود.</p>
    <form onSubmit={(e) => { e.preventDefault(); take(v); setV('') }} className="flex gap-2"><Input autoFocus aria-label="ورودی اسکن" className="ltr flex-1 text-left font-mono" value={v} onChange={(e) => setV(e.target.value)} placeholder={cur ? `بارکد پست برای ${cur}` : 'برچسب مرسوله را اسکن کنید'} /><Button variant="primary" type="submit" disabled={!v.trim()}>ثبت</Button></form>
    {cur && <p className="mt-2 rounded-lg bg-info-bg px-3 py-2 text-12 text-info">مرسولهٔ {cur} انتخاب شد؛ حالا بارکد پست را اسکن کنید.</p>}
    <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line text-12">{log.length === 0 ? <li className="p-3 text-t3">هنوز اسکنی انجام نشده است.</li> : log.map((x, i) => <li key={i} className={cx('flex items-center gap-2 px-3 py-2', x.ok ? '' : 'bg-danger-bg/40')}>{x.ok ? <Check size={13} className="text-success" /> : <X size={13} className="text-danger" />}<span className="ltr font-mono">{x.ship}</span>{x.code && <span className="ltr font-mono text-t2">{x.code}</span>}<span className="flex-1 text-t2">{x.msg}</span></li>)}</ul>
  </Modal>
}

/** تطبیق فایل باجهٔ پست (CSV یا خروجی Excel): هر ردیف «شمارهٔ مرسوله یا سفارش، کد رهگیری، نام گیرنده»؛ موارد مطمئن ثبت و به مشتری پیامک می‌شود */
function PostFile({ onClose }: { onClose: () => void }) {
  const d = useDB(); const [rows, setRows] = useState<{ ref: string; code: string; name: string }[] | null>(null)
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, order: o, cust: d.customers.find((c) => c.id === o.customerId) })))
  const SAMPLE = [{ ref: 'GH-10479-1', code: '120459870001245789631001', name: 'الهام کریمی' }, { ref: 'GH-10470', code: '120459870001245789631002', name: 'شرکت آرین‌پردازان' }, { ref: 'GH-10444-1', code: '120459870001245789631003', name: '' }, { ref: 'GH-99999', code: '120459870001245789631004', name: 'نامشخص' }]
  const parse = (t: string) => t.split(/\r?\n/).map((l) => l.split(/[,;\t]/).map((x) => x.trim().replace(/^"|"$/g, ''))).filter((c) => c.length >= 2 && /GH-?\d+/i.test(c[0])).map((c) => ({ ref: c[0].toUpperCase().replace(/^GH(?=\d)/, 'GH-'), code: c[1].replace(/\D/g, ''), name: c[2] ?? '' }))
  const judge = (r: { ref: string; code: string; name: string }) => {
    const hits = ships.filter((s) => s.id === r.ref || (s.order.id === r.ref && /پست|تیپاکس/.test(s.method)))
    if (!hits.length) return { tone: 'danger' as const, label: 'بدون تطبیق', why: 'مرسوله یا سفارشی با این شماره نیست', ship: null }
    if (hits.length > 1) return { tone: 'warning' as const, label: 'مشکوک', why: `${fa(hits.length)} مرسولهٔ پستی در این سفارش؛ مرسوله را مشخص کنید`, ship: null }
    if (!/^\d{11,26}$/.test(r.code)) return { tone: 'danger' as const, label: 'کد نامعتبر', why: 'کد رهگیری باید ۱۱ تا ۲۶ رقم باشد', ship: null }
    if (ships.some((s) => s.tracking === r.code)) return { tone: 'neutral' as const, label: 'تکراری', why: 'این کد قبلاً ثبت شده است', ship: null }
    if (hits[0] && shipBlocked(hits[0].order.id, true)) return { tone: 'danger' as const, label: 'قفل پرداخت', why: 'منتظر پرداخت مابه‌التفاوت', ship: null }
    return { tone: 'success' as const, label: 'مطمئن', why: hits[0].tracking ? `کد قبلی ${hits[0].tracking} جایگزین می‌شود` : `${hits[0].cust?.name ?? ''} · ${hits[0].method}`, ship: hits[0] }
  }
  const judged = (rows ?? []).map((r) => ({ r, j: judge(r) })); const ok = judged.filter((x) => x.j.ship)
  const apply = () => {
    mutate((x) => { ok.forEach(({ r, j }) => { const s = x.orders.flatMap((o) => o.shipments).find((y) => y.id === j.ship!.id)!; s.tracking = r.code; s.trackingCarrier = /تیپاکس/.test(s.method) ? 'تیپاکس' : 'پست'; if (['ship.packed', 'ship.handed'].includes(s.status)) s.status = 'ship.in_transit' }) }, { action: 'ثبت کد رهگیری از فایل باجه', target: `${ok.length} مرسوله` })
    ok.forEach(({ r, j }) => j.ship!.cust && sendSms(j.ship!.cust.mobile, `غنیمت: سفارش ${j.ship!.order.id} تحویل پست شد. کد رهگیری: ${r.code}`, 'کد رهگیری پست', j.ship!.order.id, j.ship!.cust.id))
    toast(`${fa(ok.length)} کد رهگیری ثبت و برای مشتریان پیامک شد${judged.length - ok.length ? `؛ ${fa(judged.length - ok.length)} ردیف بررسی دستی می‌خواهد` : ''}.`); onClose()
  }
  return <Modal open onClose={onClose} wide title="تطبیق فایل باجهٔ پست" footer={<><Button variant="primary" disabled={!ok.length} onClick={apply}>ثبت {ok.length ? fa(ok.length) : ''} مورد مطمئن</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    {!rows ? <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line p-6 text-center text-13 hover:border-brand"><b>فایل CSV یا خروجی Excel باجه را انتخاب کنید</b><span className="text-12 text-t2">ستون‌ها: شمارهٔ مرسوله یا سفارش، کد رهگیری، نام گیرنده</span>
        <input type="file" accept=".csv,.txt,.tsv" className="sr-only" aria-label="فایل باجهٔ پست" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = parse(await f.text()); if (!r.length) return toast('ردیف قابل خواندنی پیدا نشد. ستون اول باید شمارهٔ مرسوله یا سفارش باشد.', { tone: 'err' }); setRows(r) }} /></label>
      <Button variant="ghost" onClick={() => setRows(SAMPLE)}>استفاده از فایل نمونهٔ امروز باجه</Button>
    </div> : <ul className="space-y-2">{judged.map(({ r, j }, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-12"><span className="flex flex-wrap items-center gap-2"><span className="ltr font-mono">{r.ref}</span><span className="ltr font-mono text-t2">{r.code}</span><span className="text-t2">{j.why}</span></span><Badge tone={j.tone}>{j.label}</Badge></li>)}</ul>}
  </Modal>
}
