import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Check, Printer, ScanLine, X } from 'lucide-react'
import { AITag, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Segmented, Select, StatusBadge, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Bars } from '@/shared/ui/charts'
import { confirm, Hint, Modal, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, snapshot, useSession } from '@/shared/lib/store'
import { EntityManager } from '@/shared/ui/entity'
import { compactToman, fa, pct, rel, toman, g } from '@/shared/lib/fa'
import { CONDITION, WAREHOUSE } from '@/shared/data/statuses'
import { Cell, Money, ProductImg, SlaChip, useLookup, useTab } from './_shared'
import { PackPhotos } from '../shared/PackPhotos'

// ───────── انبار و موجودی ─────────
const QC_LIST = ['دستگاه روشن می‌شود', 'نمایشگر بدون لکه و پیکسل سوخته', 'سلامت باتری بالای ۸۵٪', 'دوربین‌ها و میکروفون', 'اتصال‌ها (وای‌فای، بلوتوث، سیم‌کارت)', 'تطبیق سریال با جعبه و فاکتور']
export function Warehouse() {
  const { d, product } = useLookup(); const s = useSession(); const nav = useNavigate(); const [tab, setTab] = useTab('qc')
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
      empty={{ title: 'انبار خالی است.', desc: 'با دریافت اولین محموله، واحدها ساخته می‌شوند و به صف QC می‌آیند.', action: <Button variant="primary" onClick={() => nav('/admin/supply')}>ثبت محمولهٔ ورودی</Button> }}
      actions={<Button icon={<ScanLine size={14} />} onClick={() => setScan('')}>اسکن بارکد</Button>}
      primary={qc.length > 0 ? <Button variant="primary" onClick={() => { setTab('qc'); setFocus(qc[0].id) }}>شروع QC ({fa(qc.length)} واحد)</Button> : undefined}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'qc', label: 'صف QC', count: qc.length }, { id: 'photo', label: 'صف عکاسی', count: photo.length }, { id: 'publish', label: 'صف انتشار', count: ready.length }, { id: 'stock', label: 'نمای موجودی' }, { id: 'sync', label: 'همگام‌سازی شریک', count: d.syncIssues.length }]} />}>
      {tab === 'qc' && <QueueCard list={qc} label="بازرسی این واحد" action={setFocus} emptyT="صف QC خالی است." emptyD="واحدهای دریافت‌شده بعد از ثبت ورود، اینجا می‌آیند." />}
      {tab === 'photo' && <QueueCard list={photo} label="ثبت عکس‌ها و ارسال به انتشار" action={(id) => move([id], 'unit.ready', 'عکاسی کامل شد')} emptyT="صف عکاسی خالی است." emptyD="واحدهایی که QC را گذرانده‌اند برای عکاسی اینجا می‌آیند." />}
      {tab === 'publish' && <DataTable name="صف انتشار" rows={ready} rowKey={(u) => u.id} onRow={(u) => nav(`/admin/catalog/unit/${u.id}`)} empty={{ title: 'واحدی آمادهٔ انتشار نیست.', desc: 'واحدها بعد از QC، عکاسی و قیمت‌گذاری اینجا می‌آیند.' }}
        cols={[{ key: 'id', title: 'واحد', render: (u) => <CopyId v={u.id} /> }, { key: 'p', title: 'محصول', render: (u) => <Cell pid={u.productId} a={product(u.productId).en} /> }, { key: 'chk', title: 'چک‌لیست انتشار', render: (u) => <span className="flex gap-1">{[['QC', true], ['عکس', true], ['قیمت', u.price > 0], ['محتوا', product(u.productId).health > 60]].map(([l, ok]) => <Badge key={l as string} tone={ok ? 'success' : 'danger'}>{l}</Badge>)}</span> }, { key: 'price', title: 'قیمت', align: 'left', render: (u) => u.price ? <Money v={u.price} /> : '—' }]}
        bulk={(ids, clear) => <Button size="sm" variant="primary" onClick={() => { move(ids, 'unit.published', 'انتشار'); clear() }}>انتشار {fa(ids.length)} واحد</Button>} />}
      {tab === 'stock' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI label="واحد قابل فروش" value={fa(q('unit.published').length)} to="/admin/catalog?tab=units" /><KPI label="ارزش موجودی (فروش)" value={compactToman(d.units.filter((u) => inScope(u.warehouse)).reduce((a, u) => a + u.price, 0))} />
          <KPI label="موجودی راکد (بیش از ۳۰ روز)" value={fa(d.units.filter((u) => u.status === 'unit.published' && Date.now() - new Date(u.received).getTime() > 30 * 864e5).length)} note="پیشنهاد AI: کاهش پلکانی قیمت" to="/admin/pricing" /><KPI label="زمان ورود تا انتشار" value={`${fa(1.8)} روز`} delta={-12} goodDown />
        </div>
        <div className="grid gap-4 md:grid-cols-2"><Card title="موجودی به تفکیک انبار"><Bars data={Object.keys(WAREHOUSE).map((w) => ({ label: WAREHOUSE[w], value: d.units.filter((u) => u.warehouse === w && u.status === 'unit.published').length + d.products.reduce((a, p) => a + (p.qty?.[w as 'tehran'] ?? 0), 0) }))} fmt={(n) => `${fa(n)} عدد`} /></Card>
          <Card title="موجودی به تفکیک چرخهٔ عمر"><Bars onPick={() => nav('/admin/catalog?tab=units')} data={['unit.qc', 'unit.photo', 'unit.ready', 'unit.published', 'unit.reserved', 'unit.sold'].map((k) => ({ label: k.replace('unit.', '').replace('qc', 'در انتظار QC').replace('photo', 'در انتظار عکاسی').replace('ready', 'آمادهٔ انتشار').replace('published', 'منتشرشده').replace('reserved', 'رزروشده').replace('sold', 'فروخته‌شده'), value: d.units.filter((u) => u.status === k).length }))} /></Card></div></div>}
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
    </Page>
  )
}

// ───────── ارسال و لجستیک ─────────
export function Shipping() {
  const { d, rule } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('methods'); const [file, setFile] = useState(false)
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, orderId: o.id })))
  const carriers = d.providers.filter((p) => p.family === 'carrier')
  const methods = [[`تحویل ${fa(rule('fast_delivery_hours'))} ساعته`, 'انبار تهران · محدودهٔ تهران و کرج · تا ساعت قطع سفارش', 185000], ['پیک غنیمت با انتخاب بازه', 'انبار تهران · تهران و کرج', 95000], ['پست پیشتاز', 'هر دو انبار · سراسر کشور', 95000], ['تیپاکس', 'هر دو انبار · مراکز استان', 140000], ['باربری کالای سنگین', 'انبار تهران · کلاس سنگین', 450000], ['دریافت حضوری از شعبه', 'شعبهٔ مرکزی', 0]] as const
  return (
    <Page title="ارسال و لجستیک" module="shipping" sub={`ارسال رایگان برای سبدهای بالای ${compactToman(rule('free_shipping_threshold'))} (از قوانین کسب‌وکار)`}
      empty={{ title: 'هنوز روش ارسالی تعریف نشده است.', desc: 'دست‌کم یک روش ارسال تعریف کنید تا مشتری بتواند سفارش ثبت کند.' }}
      primary={<Button variant="primary" onClick={() => setTab('methods')}>روش‌های ارسال</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'methods', label: 'روش‌ها و ظرفیت' }, { id: 'trips', label: 'سفرهای پیک', count: ships.filter((s) => s.courier).length }, { id: 'track', label: 'پست و الحاق رهگیری' }, { id: 'photos', label: 'بایگانی عکس ارسال', count: ships.filter((x) => x.packPhotos?.length).length }, { id: 'zones', label: 'مناطق و بازه‌ها' }, { id: 'carriers', label: 'شرکت‌های حمل' }]} />}>
      {tab === 'methods' && <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div><EntityManager ek="shipMethods" kind="روش ارسال" fields={[{ k: 'name', label: 'نام روش', required: true, help: 'متغیر {مدت_تحویل_سریع} از قوانین کسب‌وکار خوانده می‌شود.', render: (r) => String(r.name).replace('{مدت_تحویل_سریع}', fa(rule('fast_delivery_hours'))) }, { k: 'scope', label: 'انبار، شهر و شرایط', type: 'textarea' }, { k: 'price', label: 'هزینه', type: 'money' }, { k: 'active', label: 'فعال', type: 'toggle' }]} /><p className="mt-2 text-11 text-t2">مدت وعدهٔ تحویل سریع از «قوانین کسب‌وکار» خوانده می‌شود. <button className="text-brand" onClick={() => nav('/admin/rules')}>تغییر مدت تحویل سریع</button></p></div>
        <Card title="ظرفیت بازه‌های امروز">{[['۹ تا ۱۲', 100], ['۱۲ تا ۱۵', 80], ['۱۵ تا ۱۸', 55], ['۱۸ تا ۲۱', 100]].map(([l, v]) => <div key={l} className="mb-3"><div className="mb-1 flex justify-between text-12"><span>{l}</span><span className={v === 100 ? 'text-danger' : 'text-t2'}>{v === 100 ? 'تکمیل ظرفیت' : pct(v as number)}</span></div><Progress value={v as number} tone={v === 100 ? 'danger' : 'brand'} /></div>)}<KPI label="تحویل به‌موقع این هفته" hint="sla" value={pct(94)} delta={1.2} /></Card></div>}
      {tab === 'trips' && <DataTable name="سفرهای پیک" rows={ships.filter((s) => s.courier)} rowKey={(s) => s.id} onRow={(s) => nav(`/admin/orders/${s.orderId}`)} empty={{ title: 'هنوز سفری ثبت نشده است.', desc: 'با چسباندن لینک سفر در کارت مرسوله، سفر اینجا ثبت می‌شود.' }}
        cols={[{ key: 'c', title: 'کد سفر', render: (s) => <CopyId v={s.courier!.code} /> }, { key: 'n', title: 'پیک', render: (s) => <Cell a={s.courier!.name} b={`${s.courier!.vehicle} · ${s.courier!.plate}`} /> }, { key: 'o', title: 'مرسوله', render: (s) => <CopyId v={s.id} /> }, { key: 'cost', title: 'هزینه', align: 'left', render: (s) => <Money v={s.courier!.cost} />, sort: (s) => s.courier!.cost, text: (s) => s.courier!.cost }, { key: 's', title: 'وضعیت', render: (s) => <StatusBadge s={s.status} /> }]} />}
      {tab === 'track' && <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">{[['تکی', 'چسباندن یا اسکن کد در کارت مرسوله', () => nav('/admin/orders/GH-10479')], ['اسکن پشت‌سرهم', 'برچسب مرسوله، سپس بارکد پست', () => toast('حالت اسکن پشت‌سرهم: دوربین در نسخهٔ نمایشی در دسترس نیست.')], ['فایل باجه', 'بارگذاری Excel یا CSV و تطبیق خودکار', () => setFile(true)], ['عکس رسید', 'استخراج کدها از عکس (OCR)', () => setFile(true)]].map(([t, desc, fn]) => <button key={t as string} onClick={fn as () => void} className="rounded-lg border border-line bg-surface p-4 text-right hover:border-brand"><p className="text-13 font-semibold">{t as string}</p><p className="mt-1 text-12 text-t2">{desc as string}</p></button>)}</div>
        <DataTable name="مرسوله‌های پستی" rows={ships.filter((s) => /پست|تیپاکس|باربری/.test(s.method))} rowKey={(s) => s.id} onRow={(s) => nav(`/admin/orders/${s.orderId}`)} empty={{ title: 'مرسولهٔ پستی‌ای نیست.' }}
          cols={[{ key: 'id', title: 'مرسوله', render: (s) => <CopyId v={s.id} /> }, { key: 'w', title: 'انبار', render: (s) => WAREHOUSE[s.warehouse] }, { key: 'm', title: 'روش', render: (s) => s.method }, { key: 't', title: 'کد رهگیری', render: (s) => s.tracking ? <CopyId v={s.tracking} /> : <Badge tone="warning">ثبت نشده</Badge> }, { key: 's', title: 'وضعیت', render: (s) => <StatusBadge s={s.status} /> }, { key: 'sla', title: 'مهلت', render: (s) => <SlaChip at={s.sla} done={['ship.delivered', 'ship.cancelled'].includes(s.status)} /> }]}
          bulk={(ids, clear) => <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/print?ship=${ids[0]}&doc=manifest`); clear() }}>مانیفست تحویل {fa(ids.length)} مرسوله</Button>} /></div>}
      {tab === 'photos' && <DataTable name="بایگانی عکس ارسال" rows={ships.filter((x) => !['ship.cancelled'].includes(x.status))} rowKey={(x) => x.id} onRow={(x) => nav(`/admin/orders/${x.orderId}`)} search={(x) => `${x.id} ${x.orderId}`} empty={{ title: 'هنوز عکسی بایگانی نشده است.' }}
        cols={[{ key: 'id', title: 'مرسوله', render: (x) => <Cell pid={x.items[0]?.productId} a={<span className="ltr font-mono">{x.id}</span>} b={x.method} /> }, { key: 'st', title: 'وضعیت', render: (x) => <StatusBadge s={x.status} /> }, { key: 'ph', title: 'عکس پیش از ارسال', render: (x) => <PackPhotos orderId={x.orderId} shipId={x.id} readOnly /> , wrap: true }]} />}
      {tab === 'zones' && <div className="space-y-6"><div><h2 className="mb-2 text-14 font-semibold">مناطق ارسال</h2><EntityManager ek="zones" kind="منطقه" fields={[{ k: 'name', label: 'نام منطقه', required: true }, { k: 'cities', label: 'شهرها و محدوده', type: 'textarea' }, { k: 'methods', label: 'روش‌های مجاز' }, { k: 'active', label: 'فعال', type: 'toggle' }]} /></div><div><h2 className="mb-2 text-14 font-semibold">بازه‌های زمانی تحویل</h2><EntityManager ek="slots" kind="بازه" fields={[{ k: 'name', label: 'بازه', required: true }, { k: 'capacity', label: 'ظرفیت', type: 'number' }, { k: 'days', label: 'روزها' }, { k: 'active', label: 'فعال', type: 'toggle' }]} /></div></div>}
      {tab === 'carriers' && <Providers family="carrier" title="شرکت حمل" list={carriers} />}
      <Modal open={file} onClose={() => setFile(false)} title="تطبیق فایل باجهٔ پست" footer={<><Button variant="primary" onClick={() => { setFile(false); toast('۲ کد رهگیری ثبت شد و مشتریان خبردار شدند. ۱ مورد بدون تطبیق ماند.') }}>تأیید ۲ مورد مطمئن</Button><Button variant="ghost" onClick={() => setFile(false)}>انصراف</Button></>}>
        <ul className="space-y-2">{[['GH-10479-1', 'نام و کد پستی یکی است', 'success', 'مطمئن'], ['GH-10470-1', 'شمارهٔ سفارش در فایل هست', 'success', 'مطمئن'], ['GH-10444-1', 'دو ردیف با همین نام', 'warning', 'مشکوک'], ['ردیف ۷ فایل', 'سفارشی پیدا نشد', 'danger', 'بدون تطبیق']].map(([a, b, t, l]) => <li key={a} className="flex items-center justify-between rounded-md border border-line px-3 py-2"><span><span className="ltr font-mono text-12">{a}</span><span className="mr-2 text-12 text-t2">{b}</span></span><Badge tone={t as any}>{l}</Badge></li>)}</ul>
      </Modal>
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
          <Card key={p.id}><div className="flex items-start justify-between gap-2"><div><p className="text-14 font-semibold">{p.name}{p.isDefault && <span className="mr-2"><Badge tone="brand" dot={false}>پیش‌فرض</Badge></span>}</p><p className="text-11 text-t3">سهم استفاده {pct(p.share)}{p.health > 0 && ` · سلامت ${pct(p.health, 1)}`}</p></div><StatusBadge s={p.status} /></div>
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
  const { d, customer, product, unit, rule } = useLookup(); const [tab, setTab] = useTab('returns'); const [open, setOpen] = useState<string | null>(null); const [fate, setFate] = useState('بازگشت به فروش با گرید جدید')
  const r = d.returns.find((x) => x.id === open); const u = r ? unit(r.unitId) : undefined
  const decide = (ok: boolean) => { if (!r) return; const cap = rule('refund_cap'); const needs = ok && r.amount > cap
    mutate((x) => { const y = x.returns.find((z) => z.id === r.id)!; y.status = ok ? (needs ? 'return.approved' : 'return.refunding') : 'return.rejected'; if (ok && u) x.units.find((z) => z.id === u.id)!.status = fate.startsWith('بازگشت') ? 'unit.qc' : fate === 'تعمیر' ? 'unit.repair' : 'unit.defective'; if (needs) x.approvals.unshift({ id: `AP-${720 + x.approvals.length}`, type: 'بازگشت وجه', title: `بازگشت ${toman(r.amount)} بابت ${r.id}`, ref: r.id, amount: r.amount, by: 'کاربر فعلی', byRole: 'x', status: 'approval.pending', at: new Date().toISOString() }) }, { action: ok ? 'تأیید مرجوعی' : 'رد مرجوعی', target: r.id })
    setOpen(null); toast(!ok ? 'مرجوعی رد شد و کالا دوباره برای مشتری ارسال می‌شود.' : needs ? 'مرجوعی تأیید شد. بازگشت وجه به تأیید نفر دوم رفت.' : `مرجوعی تأیید شد. ${toman(r.amount)} در حال واریز به ${r.dest} است.`) }
  return (
    <Page title="مرجوعی و گارانتی" module="returns" sub={`مهلت مرجوعی ${fa(rule('return_days'))} روز · مهلت بازرسی ${fa(rule('inspection_hours'))} ساعت`}
      empty={{ title: 'هنوز مرجوعی‌ای ثبت نشده است.', desc: 'درخواست‌های مرجوعی مشتریان اینجا نمایش داده می‌شود.', action: <Button>مشاهدهٔ قوانین مرجوعی</Button> }}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'returns', label: 'مرجوعی‌ها', count: d.returns.length }, { id: 'warranty', label: 'گارانتی', count: d.warranties.length }, { id: 'stats', label: 'تحلیل' }]} />}>
      {tab === 'returns' && <DataTable name="مرجوعی‌ها" rows={d.returns} rowKey={(x) => x.id} onRow={(x) => setOpen(x.id)} search={(x) => `${x.id} ${x.orderId} ${customer(x.customerId).name}`} empty={{ title: 'هنوز مرجوعی‌ای ثبت نشده است.' }}
        cols={[{ key: 'id', title: 'شماره', render: (x) => <CopyId v={x.id} /> }, { key: 'c', title: 'مشتری', render: (x) => <Cell a={customer(x.customerId).name} b={x.orderId} /> }, { key: 'r', title: 'دلیل', hideMobile: true, render: (x) => x.reason, sort: (x) => x.reason }, { key: 'a', title: 'مبلغ', align: 'left', render: (x) => x.amount ? <Money v={x.amount} /> : '—', sort: (x) => x.amount }, { key: 's', title: 'وضعیت', render: (x) => <StatusBadge s={x.status} />, sort: (x) => x.status }, { key: 'd', title: 'مهلت', render: (x) => <SlaChip at={x.deadline} done={['return.rejected', 'return.refunded'].includes(x.status)} /> }]} />}
      {tab === 'warranty' && <DataTable name="گارانتی" rows={d.warranties} rowKey={(x) => x.id} search={(x) => `${x.code} ${x.id} ${unit(x.unitId)?.serial}`} empty={{ title: 'درخواست گارانتی‌ای نیست.', desc: 'گارانتی با تحویل سفارش خودکار صادر می‌شود و درخواست‌های خدمات اینجا می‌آیند.' }}
        cols={[{ key: 'code', title: 'کد گارانتی', render: (x) => <CopyId v={x.code} /> }, { key: 'c', title: 'مشتری', render: (x) => <Cell a={customer(x.customerId).name} b={x.issue} /> }, { key: 't', title: 'نوع', hideMobile: true, render: (x) => `${x.type} · ${fa(x.months)} ماه` }, { key: 'o', title: 'مسئول هزینه', hideMobile: true, render: (x) => x.owner }, { key: 's', title: 'وضعیت', render: (x) => <StatusBadge s={x.status} /> }, { key: 'd', title: 'مهلت', render: (x) => <SlaChip at={x.deadline} done={x.status === 'warranty.done'} /> },
          { key: 'a', title: '', render: (x) => x.status === 'warranty.pending' ? <Button size="sm" onClick={() => { mutate((db) => { db.warranties.find((y) => y.id === x.id)!.status = 'warranty.repairing' }, { action: 'پذیرش گارانتی', target: x.id }); toast('درخواست پذیرفته شد و برچسب ارسال به مرکز خدمات برای مشتری رفت.') }}>پذیرش و ارسال برچسب</Button> : x.status === 'warranty.repairing' ? <Button size="sm" onClick={() => { mutate((db) => { db.warranties.find((y) => y.id === x.id)!.status = 'warranty.done' }, { action: 'تکمیل تعمیر', target: x.id }); toast('تعمیر تکمیل شد؛ کالا با گارانتی تعمیر برای مشتری ارسال می‌شود.') }}>ثبت تکمیل تعمیر</Button> : null }]} />}
      {tab === 'stats' && <div className="grid gap-4 md:grid-cols-2"><Card title="دلایل مرجوعی"><Bars data={[{ label: 'مغایرت با صفحهٔ کالا', value: 40 }, { label: 'انصراف از خرید', value: 33 }, { label: 'خرابی کالا', value: 19 }, { label: 'سایر', value: 8 }]} fmt={pct} color="var(--purple)" /><div className="mt-3"><AITag confidence="متوسط" /></div><p className="mt-1 text-12 text-t2">۴۰٪ مرجوعی‌های هدفون به‌خاطر مغایرت رنگ در عکس است. پیشنهاد: بازبینی نور عکاسی این دسته.</p></Card>
        <Card title="نرخ خرابی در گارانتی به تفکیک تأمین"><Bars data={[{ label: 'انبارگردانی آمازون', value: 2.1 }, { label: 'خرید مستقیم اقلیم کردستان', value: 3.4 }, { label: 'شریک انبار مهاباد', value: 4.0 }]} fmt={(n) => pct(n, 1)} color="var(--warning)" /></Card></div>}
      <Modal wide open={!!r} onClose={() => setOpen(null)} title={r ? <span className="flex items-center gap-2">بازرسی مرجوعی<CopyId v={r.id} /><StatusBadge s={r.status} /></span> : ''}
        footer={r && r.status === 'return.inspecting' ? <><Button variant="primary" onClick={() => decide(true)}>تأیید و واریز {compactToman(r.amount)}</Button><Button variant="danger" onClick={() => decide(false)}>رد مرجوعی</Button></> : <Button onClick={() => setOpen(null)}>بستن</Button>}>
        {r && <div className="space-y-4">
          <p className="text-13"><b>{customer(r.customerId).name}</b> · دلیل: {r.reason}{r.note && ` · «${r.note}»`}</p>
          {(() => { const ro = d.orders.find((x) => x.id === r.orderId); const rs = ro?.shipments.find((x) => x.items.some((i) => i.unitId === r.unitId)) ?? ro?.shipments[0]; return <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-line p-3"><p className="mb-2 text-12 font-semibold">عکس‌های پیش از ارسال (بایگانی)</p>{ro && rs ? <PackPhotos orderId={ro.id} shipId={rs.id} readOnly big /> : <p className="text-12 text-t2">مرسوله پیدا نشد.</p>}<p className="mt-2 text-12 text-t2">{u ? `گرید ${g(u.grade)} · سریال ${u.serial}` : 'موجودی تعدادی'}</p></div>
            <div className="rounded-md border border-purple/40 p-3"><p className="mb-2 text-12 font-semibold">کالای برگشتی</p>{u ? <ProductImg pid={u.productId} size={300} rounded="rounded-sm" className="!h-auto aspect-video !w-full border-0" /> : <div className="grid aspect-video place-items-center rounded-sm bg-purple-bg text-11 text-purple">عکس دریافت در انبار</div>}<p className="mt-2 text-12 text-t2">سریال دریافتی را با سریال و عکس‌های ارسال مقایسه کنید.</p></div></div> })()}
          {r.status === 'return.inspecting' ? <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['پلمپ', 'ظاهر', 'کارکرد', 'متعلقات'].map((c) => <label key={c} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-13"><input type="checkbox" defaultChecked />{c}</label>)}</div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="سرنوشت واحد"><Select value={fate} onChange={setFate} options={['بازگشت به فروش با گرید جدید', 'تعمیر', 'معیوب']} /></Field><Field label="مبلغ بازگشتی" help={r.reason === 'انصراف از خرید' ? 'پس‌کرایه از مبلغ کسر می‌شود.' : 'هزینهٔ ارسال هم بازگردانده می‌شود.'}><Input disabled value={toman(r.amount)} /></Field></div></>
            : <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2">{r.status === 'return.awaiting_customer' ? 'منتظر ارسال کالا توسط مشتری هستیم. برچسب مرجوعی برای او ارسال شده است.' : r.status === 'return.rejected' ? 'مهلت مرجوعی تمام شده بود؛ درخواست رد شد.' : 'بازرسی انجام شده است.'}</p>}
        </div>}
      </Modal>
    </Page>
  )
}
