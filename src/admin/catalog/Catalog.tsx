import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Barcode as BarcodeIcon, Camera, Copy, Eye, Link2, Package, PackagePlus, Pause, Pencil, Play, Plus, Printer, RotateCcw, ScanLine, Sparkles, Trash2 } from 'lucide-react'
import { AIButton, AITag, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Segmented, Select, StatusBadge, Tabs, Toggle } from '@/shared/ui/base'
import { Page, Timeline } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { confirm, Drawer, Hint, Modal, toast } from '@/shared/ui/overlay'
import { EntityManager } from '@/shared/ui/entity'
import { Barcode, QR } from '@/shared/ui/codes'
import { mutate, restoreTrash, snapshot, takeCode, useDB } from '@/shared/lib/store'
import { isEan13 } from '@/shared/lib/barcode'
import { compactToman, fa, g, num, pct, rel, toman } from '@/shared/lib/fa'
import { CONDITION, SOURCE, WAREHOUSE } from '@/shared/data/statuses'
import type { DB, Product, Unit } from '@/shared/data/seed'
import { Cell, Money, ProductImg, useLookup, useTab } from '../pages/_shared'
import { ProductCard } from './ProductCard'
import { WIZARD_STEPS } from './Wizard'
import { LABEL_BG, LABEL_SIZES, ProductLabel } from '../print/ProductLabel'
import { CardRules } from '../pages/Catalog'
import { CatalogInsights, ProductBoard } from './ProductBoard'
import { ContentWorkflow, InlineTable, MediaLibrary, PimPanel } from '../pro/CatalogPro'

export const stockOf = (d: DB, p: Product) => (p.mode === 'qty' ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length)
const openOrdersWith = (d: DB, pid: string) => d.orders.filter((o) => !['order.delivered', 'order.cancelled', 'order.returned'].includes(o.status) && o.shipments.some((s) => s.items.some((i) => i.productId === pid)))
const unitInOpenOrder = (d: DB, uid: string) => d.orders.find((o) => !['order.delivered', 'order.cancelled', 'order.returned'].includes(o.status) && o.shipments.some((s) => s.items.some((i) => i.unitId === uid)))

/** اقدام‌های مشترک کالا (جدول، کارت، صفحهٔ کالا) */
export function useProductActions() {
  const { d } = useLookup(); const nav = useNavigate(); const [preview, setPreview] = useState<Product | null>(null); const [stock, setStock] = useState<Product | null>(null)
  const toggle = (p: Product) => { const on = p.status === 'product.published'; const undo = snapshot(); mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; t.status = on ? 'product.draft' : 'product.published'; x.units.filter((u) => u.productId === p.id && (on ? u.status === 'unit.published' : u.status === 'unit.ready')).forEach((u) => (u.status = on ? 'unit.ready' : 'unit.published')) }, { action: on ? 'توقف فروش کالا' : 'انتشار کالا', target: p.title }); toast(on ? `فروش «${p.title}» متوقف شد.` : `«${p.title}» منتشر شد.`, { undo }) }
  const dup = (p: Product) => { const id = `p${Date.now().toString(36)}`; const code = takeCode('product'); mutate((x) => { x.products.unshift({ ...p, id, code, title: `${p.title} (کپی)`, status: 'product.draft', qty: p.mode === 'qty' ? { tehran: 0, mahabad: 0 } : undefined, views: 0, cvr: 0, reviews: 0, rating: 0 }) }, { action: 'کپی کالا', target: p.title }); toast('یک کپی پیش‌نویس ساخته شد؛ موجودی آن صفر است.', { undo: () => mutate((x) => { x.products = x.products.filter((y) => y.id !== id) }) }); nav(`/admin/catalog/${id}`) }
  const remove = async (p: Product) => {
    const open = openOrdersWith(d, p.id)
    if (open.length) return toast(`این کالا ${fa(open.length)} سفارش باز دارد (${open.map((o) => o.id).join('، ')}). به‌جای حذف «توقف فروش» را بزنید یا بعد از تحویل سفارش‌ها حذف کنید.`, { tone: 'err' })
    if (!(await confirm({ title: `«${p.title}» به سطل بازیافت برود؟`, body: 'از سایت و کانال‌ها برداشته می‌شود. واحدهای آن در انبار می‌مانند. تا ۳۰ روز از سطل بازیافت قابل بازگردانی است.', confirm: 'انتقال به سطل بازیافت', danger: true }))) return
    const undo = snapshot(); mutate((x) => { x.products = x.products.filter((y) => y.id !== p.id); x.trash.unshift({ id: `tr-${p.id}-${Date.now()}`, kind: 'کالا', ek: 'products', label: p.title, data: p as any, at: new Date().toISOString() }) }, { action: 'انتقال کالا به سطل بازیافت', target: p.title })
    toast(`«${p.title}» به سطل بازیافت رفت.`, { undo }); nav('/admin/catalog')
  }
  const items = (p: Product) => [
    { label: 'ویرایش کامل', icon: <Pencil size={14} />, onClick: () => nav(`/admin/catalog/${p.id}/edit`) },
    { label: 'مشاهدهٔ جزئیات', icon: <Eye size={14} />, onClick: () => nav(`/admin/catalog/${p.id}`) },
    { label: p.mode === 'qty' ? 'ویرایش موجودی' : 'افزودن واحد', icon: <PackagePlus size={14} />, onClick: () => (p.mode === 'qty' ? setStock(p) : nav(`/admin/catalog/${p.id}/edit?step=5`)) },
    { label: p.status === 'product.published' ? 'توقف فروش' : 'انتشار', icon: p.status === 'product.published' ? <Pause size={14} /> : <Play size={14} />, onClick: () => toggle(p) },
    { label: 'کپی‌کردن', icon: <Copy size={14} />, onClick: () => dup(p) },
    { label: 'چاپ برچسب', icon: <Printer size={14} />, onClick: () => nav(`/admin/labels?products=${p.id}`) },
    { label: 'پیش‌نمایش در سایت', icon: <Eye size={14} />, onClick: () => setPreview(p) },
    'sep' as const,
    { label: 'انتقال به سطل بازیافت', icon: <Trash2 size={14} />, danger: true, onClick: () => remove(p) },
  ]
  const modals = (
    <>
      <Modal open={!!preview} onClose={() => setPreview(null)} title="پیش‌نمایش کارت در سایت">{preview && <div className="flex flex-wrap justify-center gap-4"><ProductCard p={preview} /><ProductCard p={preview} mini /><ProductCard p={preview} hover /></div>}</Modal>
      <StockDrawer p={stock} onClose={() => setStock(null)} />
    </>
  )
  return { items, modals, toggle, remove, dup }
}
function StockDrawer({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const [t, setT] = useState(0); const [m, setM] = useState(0); const [reason, setReason] = useState('دریافت محموله')
  const key = p?.id
  useMemo(() => { if (p) { setT(p.qty?.tehran ?? 0); setM(p.qty?.mahabad ?? 0) } }, [key])
  return (
    <Drawer open={!!p} onClose={onClose} title={p ? `موجودی «${p.title}»` : ''} footer={<><Button variant="primary" onClick={() => { const undo = snapshot(); mutate((x) => { x.products.find((y) => y.id === p!.id)!.qty = { tehran: t, mahabad: m } }, { action: 'تعدیل موجودی', target: p!.title, before: `${p!.qty?.tehran}/${p!.qty?.mahabad}`, after: `${t}/${m} · ${reason}` }); toast('موجودی ذخیره شد و در سایت و کانال‌ها اعمال شد.', { undo }); onClose() }}>ذخیرهٔ موجودی</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      {p && <div className="space-y-4">{([['انبار تهران', t, setT], ['انبار مهاباد', m, setM]] as const).map(([l, v, sv]) => <Field key={l} label={l}><div className="flex items-center gap-2"><Button aria-label="کم" onClick={() => sv(Math.max(0, v - 1))}>−</Button><Input type="number" className="ltr w-24 text-center font-mono" value={v} onChange={(e) => sv(Math.max(0, +e.target.value))} /><Button aria-label="زیاد" onClick={() => sv(v + 1)}>+</Button></div></Field>)}
        <Field label="دلیل تعدیل" help="در لاگ و تاریخچهٔ کالا ثبت می‌شود."><Select value={reason} onChange={setReason} options={['دریافت محموله', 'شمارش انبار', 'کالای آسیب‌دیده', 'انتقال بین انبارها', 'اصلاح خطای ثبت']} /></Field></div>}
    </Drawer>
  )
}
/** ویرایش یک واحد (سریال، وضعیت، گرید، انبار، قفسه، قیمت، بارکد کارخانه) */
export function UnitDrawer({ u, onClose }: { u: Unit | null; onClose: () => void }) {
  const { d, product } = useLookup(); const [f, setF] = useState<Unit | null>(null)
  useMemo(() => setF(u ? { ...u } : null), [u?.id])
  if (!u || !f) return null
  const save = () => { if (!f.serial.trim()) return toast('سریال خالی است.', { tone: 'err' }); if (d.units.some((x) => x.serial === f.serial && x.id !== f.id)) return toast(`سریال «${f.serial}» برای واحد دیگری ثبت شده است.`, { tone: 'err' }); if (f.ean && !isEan13(f.ean)) return toast('بارکد EAN-13 نامعتبر است.', { tone: 'err' }); if (f.price && f.price < f.cost) return toast(`قیمت از قیمت تمام‌شده (${toman(f.cost)}) کمتر است.`, { tone: 'err' }); const undo = snapshot(); mutate((x) => { const i = x.units.findIndex((y) => y.id === f.id); x.units[i] = f }, { action: 'ویرایش واحد', target: f.code ?? f.id }); toast('تغییرهای واحد ذخیره شد.', { undo }); onClose() }
  return (
    <Drawer open onClose={onClose} title={<span className="flex items-center gap-2">ویرایش واحد<CopyId v={f.code ?? f.id} /></span>} footer={<><Button variant="primary" onClick={save}>ذخیرهٔ تغییرهای واحد</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-4">
        <Cell pid={f.productId} size={48} a={product(f.productId).title} b={product(f.productId).code} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="سریال / IMEI"><Input className="ltr text-left font-mono" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} /></Field>
          <Field label="رنگ"><Input value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
          <Field label="وضعیت کالا"><Select value={f.condition} onChange={(v) => setF({ ...f, condition: v })} options={Object.entries(CONDITION)} /></Field>
          <Field label="گرید"><Select value={f.grade} onChange={(v) => setF({ ...f, grade: v })} options={['A+', 'A', 'B']} /></Field>
          <Field label="انبار"><Select value={f.warehouse} onChange={(v) => setF({ ...f, warehouse: v })} options={d.warehouses.map((w) => [w.id, w.name])} /></Field>
          <Field label="قفسه"><Input className="ltr text-left font-mono" value={f.shelf} onChange={(e) => setF({ ...f, shelf: e.target.value })} /></Field>
          <Field label="قیمت تمام‌شده"><Input className="ltr text-left font-mono" value={f.cost.toLocaleString('en-US')} onChange={(e) => setF({ ...f, cost: Number(e.target.value.replace(/\D/g, '')) })} /></Field>
          <Field label="قیمت فروش"><Input className="ltr text-left font-mono" value={f.price.toLocaleString('en-US')} onChange={(e) => setF({ ...f, price: Number(e.target.value.replace(/\D/g, '')) })} /></Field>
          <Field label="چرخهٔ عمر"><Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={['unit.qc', 'unit.photo', 'unit.ready', 'unit.published', 'unit.repair', 'unit.defective'].map((s) => [s, { 'unit.qc': 'در انتظار QC', 'unit.photo': 'در انتظار عکاسی', 'unit.ready': 'آمادهٔ انتشار', 'unit.published': 'منتشرشده', 'unit.repair': 'در تعمیر', 'unit.defective': 'معیوب' }[s]!])} /></Field>
          <Field label="بارکد کارخانه (اتصال)" help="اسکن یا تایپ ۱۳ رقم"><Input className="ltr text-left font-mono" inputMode="numeric" maxLength={13} value={f.ean ?? ''} onChange={(e) => setF({ ...f, ean: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <Field label="ایرادهای ظاهری" help="با ویرگول جدا کنید."><Input value={f.flaws.join('، ')} onChange={(e) => setF({ ...f, flaws: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })} /></Field>
      </div>
    </Drawer>
  )
}

export function Catalog() {
  const { d, product } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('products'); const [sp, setSp] = useSearchParams()
  const [add, setAdd] = useState(sp.get('add') === '1'); const [editU, setEditU] = useState<Unit | null>(null); const [st, setSt] = useState('all'); const [pv, setPvRaw] = useState<'board' | 'table'>(() => (localStorage.getItem('gh-catalog-view') as 'table') || 'board'); const setPv = (v: 'board' | 'table') => { setPvRaw(v); try { localStorage.setItem('gh-catalog-view', v) } catch { /* حافظهٔ مرورگر پر است */ } }
  const pa = useProductActions()
  const unitActions = (u: Unit) => {
    const inOrder = unitInOpenOrder(d, u.id)
    return [
      { label: 'ویرایش واحد', icon: <Pencil size={14} />, onClick: () => setEditU(u) },
      { label: 'مشاهدهٔ جزئیات', icon: <Eye size={14} />, onClick: () => nav(`/admin/catalog/unit/${u.id}`) },
      { label: 'چاپ برچسب', icon: <Printer size={14} />, onClick: () => nav(`/admin/labels?units=${u.id}`) },
      ...(['unit.published', 'unit.ready'].includes(u.status) ? [{ label: u.status === 'unit.published' ? 'توقف فروش واحد' : 'انتشار واحد', icon: u.status === 'unit.published' ? <Pause size={14} /> : <Play size={14} />, onClick: () => { const undo = snapshot(); mutate((x) => { const t = x.units.find((y) => y.id === u.id)!; t.status = u.status === 'unit.published' ? 'unit.ready' : 'unit.published' }, { action: 'تغییر وضعیت فروش واحد', target: u.code ?? u.id }); toast('وضعیت فروش واحد تغییر کرد.', { undo }) } }] : []),
      'sep' as const,
      { label: 'انتقال به سطل بازیافت', icon: <Trash2 size={14} />, danger: true, disabled: ['unit.sold', 'unit.reserved'].includes(u.status) || !!inOrder, hint: inOrder ? `در سفارش باز ${inOrder.id}` : u.status === 'unit.sold' ? 'واحد فروخته‌شده حذف نمی‌شود' : undefined, onClick: () => { const undo = snapshot(); mutate((x) => { x.units = x.units.filter((y) => y.id !== u.id); x.trash.unshift({ id: `tr-${u.id}-${Date.now()}`, kind: 'واحد', ek: 'units', label: `${product(u.productId).en} · ${u.code}`, data: u as any, at: new Date().toISOString() }) }, { action: 'انتقال واحد به سطل بازیافت', target: u.code ?? u.id }); toast('واحد به سطل بازیافت رفت.', { undo }) } },
    ]
  }
  const prodRows = d.products.filter((p) => st === 'all' || p.status === st)
  const pcols: Col<Product>[] = [
    { key: 'title', title: 'محصول', render: (p) => <Cell pid={p.id} size={44} a={p.title} b={<><span className="ltr font-mono">{p.code}</span> · {p.brand}</>} />, sort: (p) => p.title, text: (p) => p.title },
    { key: 'cat', title: 'دسته', hideMobile: true, render: (p) => p.category, sort: (p) => p.category, text: (p) => p.category },
    { key: 'mode', title: <>نگهداری<Hint k="product_unit" /></>, hideMobile: true, render: (p) => <Badge dot={false}>{p.mode === 'serial' ? 'واحد سریال‌دار' : 'موجودی تعدادی'}</Badge> },
    { key: 'stock', title: 'موجود', align: 'left', render: (p) => { const n = stockOf(d, p); return <span className={n === 0 ? 'text-danger' : ''}>{fa(n)}<span className="md:hidden"> موجود</span></span> }, sort: (p) => stockOf(d, p), text: (p) => stockOf(d, p) },
    { key: 'price', title: 'قیمت', align: 'left', hideMobile: true, render: (p) => { const u = d.units.find((x) => x.productId === p.id && x.status === 'unit.published'); const v = u?.price ?? p.price; return v ? <Money v={v} compact /> : '—' } },
    { key: 'views', title: 'بازدید', align: 'left', hideMobile: true, render: (p) => num(p.views), sort: (p) => p.views, text: (p) => p.views },
    { key: 'health', title: <>سلامت محتوا<Hint k="content_health" /></>, hideMobile: true, render: (p) => <div className="flex w-24 items-center gap-2"><Progress value={p.health} tone={p.health > 80 ? 'success' : p.health > 60 ? 'warning' : 'danger'} /><span className="tnum text-11">{fa(p.health)}</span></div>, sort: (p) => p.health },
    { key: 'status', title: 'وضعیت', render: (p) => <StatusBadge s={p.status} />, sort: (p) => p.status },
  ]
  const ucols: Col<Unit>[] = [
    { key: 'p', title: 'واحد', render: (u) => <Cell pid={u.productId} a={product(u.productId)?.en ?? '—'} b={<span className="ltr font-mono">{u.code}</span>} />, text: (u) => u.code ?? u.id },
    { key: 'serial', title: 'سریال', hideMobile: true, render: (u) => <CopyId v={u.serial} />, text: (u) => u.serial },
    { key: 'cond', title: 'وضعیت کالا', render: (u) => `${CONDITION[u.condition]} · ${g(u.grade)}`, sort: (u) => u.condition },
    { key: 'wh', title: 'انبار', hideMobile: true, render: (u) => `${WAREHOUSE[u.warehouse]} · ${u.shelf}`, sort: (u) => u.warehouse },
    { key: 'price', title: 'قیمت فروش', align: 'left', render: (u) => (u.price ? <Money v={u.price} /> : <span className="text-warning">بدون قیمت</span>), sort: (u) => u.price, text: (u) => u.price },
    { key: 'margin', title: <>سود<Hint k="margin" /></>, align: 'left', hideMobile: true, render: (u) => (u.price ? <span className={u.price - u.cost < 0 ? 'text-danger' : 'text-success'}>{compactToman(u.price - u.cost)}</span> : '—'), sort: (u) => u.price - u.cost },
    { key: 'st', title: 'چرخهٔ عمر', render: (u) => <StatusBadge s={u.status} />, sort: (u) => u.status },
  ]
  const tabs = [{ id: 'products', label: 'محصولات', count: d.products.length }, { id: 'units', label: 'واحدها', count: d.units.length }, { id: 'partner', label: 'صف تأیید شریک', count: d.partnerQueue.length }, { id: 'card', label: 'قوانین کارت محصول' }, { id: 'categories', label: 'دسته‌ها' }, { id: 'brands', label: 'برندها' }, { id: 'attr', label: 'قالب ویژگی‌ها' }, { id: 'collections', label: 'مجموعه‌ها' }, { id: 'bulk', label: 'ویرایش جدولی' }, { id: 'pim', label: 'تنوع، مکمل و باندل' }, { id: 'workflow', label: 'جریان کار محتوا' }, { id: 'media', label: 'رسانه' }]
  const decide = (id: string, ok: boolean) => { mutate((x) => { const q = x.partnerQueue.find((y) => y.id === id)!; x.products.find((p) => p.id === q.productId)!.status = ok ? 'product.published' : 'product.rejected'; x.partnerQueue = x.partnerQueue.filter((y) => y.id !== id) }, { action: ok ? 'تأیید کالای شریک' : 'رد کالای شریک', target: id }); toast(ok ? 'کالا تأیید و منتشر شد. شریک با اعلان خبردار شد.' : 'کالا رد شد و دلیل برای شریک ارسال شد.') }
  return (
    <Page title="کالا و کاتالوگ" module="catalog" sub="محصول یعنی مدل؛ واحد یعنی یک نمونهٔ فیزیکی با سریال و عکس خودش."
      empty={{ title: 'هنوز محصولی ثبت نشده است.', desc: 'کالا را دستی و گام‌به‌گام ثبت کنید، یا از لینک و عکس جعبه شروع کنید.', action: <Button variant="primary" icon={<Plus size={14} />} onClick={() => setAdd(true)}>افزودن کالا</Button> }}
      actions={<><Button icon={<ScanLine size={14} />} onClick={() => nav('/admin/labels')}>چاپ برچسب</Button><Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => nav('/admin/trash')}>سطل بازیافت{d.trash.length > 0 && ` (${fa(d.trash.length)})`}</Button></>}
      primary={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setAdd(true)}>افزودن کالا</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}>
      {tab === 'products' && <div className="mb-4 space-y-4"><CatalogInsights /><div className="flex items-center justify-between"><p className="text-15 font-bold">همهٔ محصولات</p><Segmented size="sm" value={pv} onChange={setPv} options={[['board', 'کارت و فیلتر'], ['table', 'جدول']]} /></div>{pv === 'board' && <ProductBoard items={pa.items} onAdd={() => setAdd(true)} />}</div>}
      {tab === 'products' && pv === 'table' && <DataTable name="محصولات" rows={prodRows} cols={pcols} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/catalog/${p.id}`)} search={(p) => `${p.title} ${p.en} ${p.brand} ${p.code}`} actions={pa.items}
        filters={<Select className="w-36" value={st} onChange={setSt} options={[['all', 'همهٔ وضعیت‌ها'], ['product.published', 'منتشرشده'], ['product.draft', 'پیش‌نویس'], ['product.pending', 'منتظر تأیید']]} />}
        empty={{ title: 'هنوز محصولی ثبت نشده است.', action: <Button variant="primary" onClick={() => setAdd(true)}>افزودن کالا</Button> }}
        bulk={(ids, clear) => <>
          <Button size="sm" onClick={() => { const undo = snapshot(); mutate((x) => x.products.filter((p) => ids.includes(p.id)).forEach((p) => (p.status = 'product.published')), { action: 'انتشار گروهی', target: `${ids.length} محصول` }); toast(`${fa(ids.length)} محصول منتشر شد.`, { undo }); clear() }}>انتشار {fa(ids.length)}</Button>
          <Button size="sm" onClick={() => { const undo = snapshot(); mutate((x) => x.products.filter((p) => ids.includes(p.id)).forEach((p) => (p.status = 'product.draft')), { action: 'توقف فروش گروهی', target: `${ids.length} محصول` }); toast(`فروش ${fa(ids.length)} محصول متوقف شد.`, { undo }); clear() }}>توقف فروش</Button>
          <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/labels?products=${ids.join(',')}`); clear() }}>چاپ برچسب</Button>
          <Button size="sm" variant="danger" onClick={() => { const blocked = ids.filter((id) => openOrdersWith(d, id).length); if (blocked.length) { toast(`${fa(blocked.length)} کالا سفارش باز دارند و حذف نمی‌شوند. اول فروش آن‌ها را متوقف کنید.`, { tone: 'err' }); return } const undo = snapshot(); mutate((x) => { x.products.filter((p) => ids.includes(p.id)).forEach((p) => x.trash.unshift({ id: `tr-${p.id}-${Date.now()}`, kind: 'کالا', ek: 'products', label: p.title, data: p as any, at: new Date().toISOString() })); x.products = x.products.filter((p) => !ids.includes(p.id)) }, { action: 'حذف گروهی کالا', target: `${ids.length} کالا` }); toast(`${fa(ids.length)} کالا به سطل بازیافت رفت.`, { undo }); clear() }}>حذف {fa(ids.length)}</Button>
        </>} />}
      {tab === 'units' && <DataTable name="واحدها" rows={d.units} cols={ucols} rowKey={(u) => u.id} onRow={(u) => nav(`/admin/catalog/unit/${u.id}`)} search={(u) => `${u.id} ${u.code} ${u.serial} ${product(u.productId)?.en}`} actions={unitActions}
        empty={{ title: 'هنوز واحدی دریافت نشده است.', desc: 'واحدها با ثبت کالای سریال‌دار یا دریافت محموله ساخته می‌شوند.', action: <Button variant="primary" onClick={() => setAdd(true)}>افزودن کالا</Button> }}
        bulk={(ids, clear) => <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/labels?units=${ids.join(',')}`); clear() }}>چاپ برچسب {fa(ids.length)} واحد</Button>} />}
      {tab === 'partner' && (d.partnerQueue.length === 0 ? <Card><EmptyState title="صف تأیید خالی است." desc="کالاهای جدید و تغییرهای محتوایی شریک انبار پیش از انتشار اینجا می‌آیند." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">{d.partnerQueue.map((q) => { const p = product(q.productId); return (
          <Card key={q.id} title={<>{q.kind}<StatusBadge s={q.status} /></>} actions={<span className="text-11 text-t2">{rel(q.at)}</span>}>
            <div className="flex gap-3"><ProductImg pid={p.id} size={72} /><div className="grid flex-1 gap-2 sm:grid-cols-2"><div className="rounded-md bg-neutral-bg p-3 text-12"><p className="mb-1 text-11 text-t2">قبل</p>{q.kind === 'کالای جدید' ? 'در کاتالوگ نبود.' : p.title}</div><div className="rounded-md bg-success-bg p-3 text-12"><p className="mb-1 text-11 text-t2">بعد (پیشنهاد شریک)</p>{p.title}</div></div></div>
            <p className="mt-2 text-12 text-t2">{q.note}</p><div className="mt-2"><AITag confidence="بالا" source="بازبین محتوا" /></div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" onClick={() => decide(q.id, true)}>تأیید و انتشار</Button><Button onClick={() => nav(`/admin/catalog/${p.id}/edit`)}>اصلاح و تأیید</Button><Button variant="danger" onClick={() => decide(q.id, false)}>رد کالا</Button></div>
          </Card>) })}</div>))}
      {tab === 'card' && <CardRules />}
      {tab === 'bulk' && <InlineTable />}
      {tab === 'pim' && <PimPanel />}
      {tab === 'workflow' && <ContentWorkflow />}
      {tab === 'media' && <MediaLibrary />}
      {tab === 'categories' && <EntityManager ek="categories" kind="دسته" fields={[{ k: 'name', label: 'نام دسته', required: true }, { k: 'parent', label: 'دستهٔ والد' }, { k: 'slug', label: 'نشانی', ltr: true }, { k: 'template', label: 'قالب ویژگی', type: 'select', options: (d.entities.attrTemplates ?? []).map((t) => t.name) }, { k: 'faq', label: 'پرسش متداول', type: 'number' }, { k: 'active', label: 'نمایش در سایت', type: 'toggle' }]} blockDelete={(r) => { const n = d.products.filter((p) => p.category === r.name).length; return n ? `${fa(n)} کالا در دستهٔ «${r.name}» هست. اول آن‌ها را به دستهٔ دیگری ببرید.` : null }} />}
      {tab === 'brands' && <EntityManager ek="brands" kind="برند" fields={[{ k: 'name', label: 'نام برند', required: true }, { k: 'en', label: 'نام انگلیسی', ltr: true }, { k: 'origin', label: 'کشور' }, { k: 'products', label: 'تعداد کالا', type: 'number' }, { k: 'active', label: 'فعال', type: 'toggle' }]} blockDelete={(r) => { const n = d.products.filter((p) => p.brand === r.name).length; return n ? `${fa(n)} کالا با برند «${r.name}» ثبت شده است.` : null }} />}
      {tab === 'attr' && <EntityManager ek="attrTemplates" kind="قالب ویژگی" fields={[{ k: 'name', label: 'نام قالب', required: true }, { k: 'fields', label: 'فیلدها (با ویرگول فارسی جدا کنید)', type: 'textarea', required: true }, { k: 'compare', label: 'در مقایسه نمایش داده شود', type: 'toggle' }]} />}
      {tab === 'collections' && <EntityManager ek="collections" kind="مجموعه" fields={[{ k: 'name', label: 'نام مجموعه', required: true }, { k: 'type', label: 'نوع', type: 'select', options: ['دستی', 'مبتنی بر قانون'] }, { k: 'rule', label: 'قانون عضویت', type: 'textarea' }, { k: 'items', label: 'تعداد کالا', type: 'number' }, { k: 'active', label: 'فعال', type: 'toggle' }]} />}
      <Modal open={add} onClose={() => { setAdd(false); setSp({}, { replace: true }) }} title="افزودن کالا" wide>
        <div className="grid gap-3 sm:grid-cols-3">
          {([[<PackagePlus size={22} />, 'ثبت دستی گام‌به‌گام', 'همهٔ اطلاعات را خودتان وارد می‌کنید؛ کمک AI در هر گام اختیاری است.', '/admin/catalog/new', true], [<Link2 size={22} />, 'از لینک', 'لینک دیجی‌کالا، آمازون یا سایت سازنده؛ در پایان همان فرم گام‌به‌گام برای اصلاح باز می‌شود.', '/admin/catalog/import'], [<Camera size={22} />, 'از عکس جعبه یا بارکد', 'از جعبه عکس بگیرید یا بارکد را اسکن کنید؛ مشخصات پیشنهاد و در فرم قرار می‌گیرد.', '/admin/catalog/new?from=photo']] as const).map(([ic, t, desc, to, rec]) => (
            <button key={t} onClick={() => { setAdd(false); nav(to) }} className={cx('lift flex flex-col items-start gap-2 rounded-xl border p-4 text-right', rec ? 'border-brand/50 bg-brand-tint/40' : 'border-line')}>
              <span className="grid size-11 place-items-center rounded-full bg-brand-tint text-brand">{ic}</span><span className="text-14 font-bold">{t}{rec && <span className="mr-2 align-middle"><Badge tone="brand" dot={false}>پیش‌فرض</Badge></span>}</span><span className="text-12 leading-5 text-t2">{desc}</span>
            </button>))}
        </div>
      </Modal>
      <UnitDrawer u={editU} onClose={() => setEditU(null)} />
      {pa.modals}
    </Page>
  )
}

export function ProductDetail() {
  const { id } = useParams(); const { d } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('base'); const pa = useProductActions(); const [editU, setEditU] = useState<Unit | null>(null)
  const p = d.products.find((x) => x.id === id)
  if (!p) return <Page title="محصول پیدا نشد" back="/admin/catalog"><Card><EmptyState title="محصولی با این شناسه نیست." desc="ممکن است به سطل بازیافت رفته باشد." action={<Button onClick={() => nav('/admin/trash')}>سطل بازیافت</Button>} /></Card></Page>
  const units = d.units.filter((u) => u.productId === p.id)
  const sold = d.orders.flatMap((o) => o.shipments.flatMap((s) => s.items.filter((i) => i.productId === p.id).map((i) => ({ ...i, order: o }))))
  const edit = (step: number) => nav(`/admin/catalog/${p.id}/edit?step=${step}`)
  const EditBtn = ({ step }: { step: number }) => <Button size="sm" icon={<Pencil size={13} />} onClick={() => edit(step)}>ویرایش «{WIZARD_STEPS[step]}»</Button>
  const pu = units.find((u) => u.status === 'unit.published'); const price = pu?.price ?? p.price ?? 0; const cost = pu?.cost ?? p.cost ?? 0
  const TABS = [['base', 'اطلاعات پایه'], ['specs', 'مشخصات'], ['content', 'محتوا'], ['media', 'رسانه'], ['units', 'واحدها و موجودی'], ['price', 'قیمت و سود'], ['ship', 'ارسال و خدمات'], ['warranty', 'گارانتی'], ['seo', 'سئو و کانال‌ها'], ['perf', 'عملکرد'], ['history', 'تاریخچه']]
  return (
    <Page module="catalog" back="/admin/catalog" title={p.title} badge={<StatusBadge s={p.status} />} sub={<span className="ltr">{p.en} · {p.code}</span>}
      actions={<><Button icon={<Printer size={14} />} onClick={() => nav(`/admin/labels?products=${p.id}`)}>چاپ برچسب</Button><Button onClick={() => pa.toggle(p)} icon={p.status === 'product.published' ? <Pause size={14} /> : <Play size={14} />}>{p.status === 'product.published' ? 'توقف فروش' : 'انتشار'}</Button><Button variant="ghost" icon={<Copy size={14} />} onClick={() => pa.dup(p)}>کپی</Button><Button variant="danger" icon={<Trash2 size={14} />} onClick={() => pa.remove(p)}>حذف</Button></>}
      primary={<Button variant="primary" icon={<Pencil size={14} />} onClick={() => edit(0)}>ویرایش کامل</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={TABS.map(([i, l]) => ({ id: i, label: l, count: i === 'units' ? units.length || undefined : undefined }))} />}>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <Card>
          {tab === 'base' && <div className="space-y-4"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{[['عنوان فارسی', p.title], ['عنوان انگلیسی', p.en], ['دسته', p.category], ['برند', p.brand], ['مدل', p.model || '—'], ['فروشنده', p.seller], ['منبع تأمین', SOURCE[p.source ?? 'amazon']], ['تأمین‌کننده', p.supplier ?? '—']].map(([k, v]) => <div key={k}><dt className="text-12 text-t2">{k}</dt><dd className="text-13 font-medium">{v}</dd></div>)}</dl><EditBtn step={0} /></div>}
          {tab === 'specs' && <div className="space-y-4">{p.specs && Object.keys(p.specs).length ? <dl className="divide-y divide-line rounded-lg border border-line">{Object.entries(p.specs).map(([k, v]) => <div key={k} className="flex justify-between px-3 py-2 text-13"><dt className="text-t2">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>)}</dl> : <EmptyState title="مشخصاتی ثبت نشده است." desc="فیلدها از قالب ویژگی دسته خوانده می‌شوند." />}{p.keyFeatures && <ul className="list-disc pr-5 text-13">{p.keyFeatures.split('\n').map((l) => <li key={l}>{l}</li>)}</ul>}<EditBtn step={1} /></div>}
          {tab === 'content' && <div className="space-y-4">{[['معرفی کوتاه', p.short], ['معرفی کامل', p.long], ['محتوای جعبه', p.box], ['نکات مثبت', p.pros], ['نکات منفی', p.cons]].map(([k, v]) => <div key={k}><p className="text-12 text-t2">{k}</p><p className="text-13 leading-7">{v || <span className="text-t3">نوشته نشده است.</span>}</p></div>)}<div className="flex gap-2"><EditBtn step={3} /><AIButton size="sm" onClick={() => edit(3)}>نگارش با AI</AIButton></div></div>}
          {tab === 'media' && <div className="space-y-4">{(p.images?.length ? p.images : p.image ? [p.image] : []).length ? <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">{(p.images?.length ? p.images : [p.image]).map((src, i) => <li key={i} className={cx('aspect-square overflow-hidden rounded-lg border', i === 0 ? 'border-brand' : 'border-line')}><img src={src} alt={`${p.title} ${fa(i + 1)}`} className="size-full object-cover" /></li>)}</ul> : <EmptyState title="هنوز تصویری بارگذاری نشده است." action={<Button variant="primary" onClick={() => edit(2)}>افزودن تصویر</Button>} />}<EditBtn step={2} /></div>}
          {tab === 'units' && (p.mode === 'qty' ? <div className="space-y-3"><div className="grid grid-cols-2 gap-3">{(['tehran', 'mahabad'] as const).map((w) => <div key={w} className="rounded-xl bg-neutral-bg p-4"><p className="text-12 text-t2">{WAREHOUSE[w]}</p><p className="tnum text-24 font-bold">{fa(p.qty?.[w] ?? 0)}</p></div>)}</div><Button icon={<PackagePlus size={14} />} onClick={() => pa.items(p)[2] !== 'sep' && (pa.items(p)[2] as any).onClick()}>ویرایش موجودی</Button></div>
            : <div className="space-y-3"><ul className="divide-y divide-line">{units.map((u) => <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><button onClick={() => nav(`/admin/catalog/unit/${u.id}`)} className="text-right hover:text-brand"><span className="ltr font-mono text-12">{u.code}</span> · {CONDITION[u.condition]} · گرید {g(u.grade)} · {u.color} · {WAREHOUSE[u.warehouse]}</button><span className="flex items-center gap-2">{u.price > 0 && <Money v={u.price} compact />}<StatusBadge s={u.status} /><Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => setEditU(u)}>ویرایش</Button></span></li>)}</ul><Button icon={<Plus size={14} />} onClick={() => edit(5)}>افزودن واحد</Button></div>)}
          {tab === 'price' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{[['قیمت تمام‌شده', toman(cost)], ['قیمت فروش', toman(price)], ['سود هر واحد', cost ? `${toman(price - cost)} (${pct(((price - cost) / (price || 1)) * 100, 1)})` : 'نامعلوم']].map(([k, v]) => <div key={k} className="rounded-xl bg-neutral-bg p-3"><p className="text-11 text-t2">{k}</p><p className="tnum text-14 font-bold">{v}</p></div>)}</div><Row k="قیمت مرجع کالای نو"><Money v={p.priceNew} /></Row>{p.compareAt && <Row k="قیمت قبل از تخفیف"><Money v={p.compareAt} /></Row>}<div className="flex gap-2"><EditBtn step={6} /><Button size="sm" onClick={() => nav('/admin/finance?tab=profit')}>سود این کالا در «سود من»</Button></div></div>}
          {tab === 'ship' && <div className="space-y-3"><dl className="grid gap-3 sm:grid-cols-3">{[['وزن', p.weight ? `${fa(p.weight)} گرم` : '—'], ['ابعاد', p.dims || '—'], ['کلاس ارسال', p.shipClass ?? 'عادی'], ['تحویل سریع', p.fastEligible ? 'دارد' : 'ندارد'], ['بیمه', p.insurance ? 'دارد' : 'ندارد'], ['نصب', p.install ? 'دارد' : 'ندارد']].map(([k, v]) => <div key={k}><dt className="text-12 text-t2">{k}</dt><dd className="text-13 font-medium">{v}</dd></div>)}</dl><EditBtn step={7} /></div>}
          {tab === 'warranty' && <div className="space-y-3"><Row k="نوع">{p.warrantyType}</Row><Row k="مدت">{fa(p.warrantyMonths ?? 0)} ماه</Row><p className="text-13 text-t2">{p.warrantyTerms ?? '—'}</p><div className="flex gap-2"><EditBtn step={8} /><Button size="sm" icon={<Printer size={13} />} onClick={() => nav(`/admin/print?doc=warranty&unit=${units[0]?.id ?? ''}`)}>نمونهٔ کارت گارانتی</Button></div></div>}
          {tab === 'seo' && <div className="space-y-3"><div className="rounded-lg border border-line p-3"><p className="ltr text-left text-11 text-success">ghanimat.example › product › {p.slug || p.en.toLowerCase().replace(/\s+/g, '-')}</p><p className="text-14 text-brand">{p.metaTitle || `خرید ${p.title} | غنیمت`}</p><p className="text-12 text-t2">{p.metaDesc || 'توضیح متا نوشته نشده است.'}</p></div><Row k="نمایش در ترب">{p.torob ? 'بله' : 'خیر'}</Row><EditBtn step={9} /></div>}
          {tab === 'perf' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{[['بازدید', num(p.views)], ['نرخ تبدیل', pct(p.cvr, 1)], ['امتیاز', fa(p.rating)], ['دیدگاه', fa(p.reviews)], ['فروخته‌شده', fa(sold.length)], ['«خبرم کن»', fa(Math.round(p.views / 140))]].map(([l, v]) => <div key={l} className="rounded-xl bg-neutral-bg p-3"><p className="text-11 text-t2">{l}</p><p className="tnum text-16 font-bold">{v}</p></div>)}<div className="col-span-full"><p className="mb-2 text-12 font-medium">سفارش‌های این کالا</p>{sold.length ? <ul className="divide-y divide-line text-13">{sold.map((s, i) => <li key={i}><button className="flex w-full justify-between py-2 hover:text-brand" onClick={() => nav(`/admin/orders/${s.order.id}`)}><span className="ltr font-mono">{s.order.id}</span><Money v={s.price} /></button></li>)}</ul> : <p className="text-12 text-t2">هنوز فروشی ثبت نشده است.</p>}</div></div>}
          {tab === 'history' && <Timeline items={[...d.audit.filter((a) => a.target.includes(p.title) || a.target.includes(p.code ?? '#')).map((a) => ({ at: a.at, who: a.who, text: `${a.action}${a.after !== '-' ? `: ${a.after}` : ''}`, tone: a.ai ? 'ai' as const : 'ok' as const })), { at: new Date(Date.now() - 864e5 * 3).toISOString(), who: 'هستی', text: 'محصول ساخته شد.', tone: 'ok' }]} />}
        </Card>
        <div className="space-y-4">
          <Card title="پیش‌نمایش کارت در سایت"><div className="flex justify-center"><ProductCard p={p} /></div></Card>
          <Card title="کد و بارکد"><Barcode value={p.code ?? p.id} className="h-16 w-full rounded border border-line" />{p.ean && <Barcode value={p.ean} type="ean13" className="mt-2 h-16 w-full rounded border border-line" />}<div className="mt-3 flex items-center gap-3"><QR value={`https://ghanimat.example/p/${p.code}`} size={72} /><Button size="sm" icon={<Printer size={13} />} onClick={() => nav(`/admin/labels?products=${p.id}`)}>چاپ برچسب</Button></div></Card>
        </div>
      </div>
      <UnitDrawer u={editU} onClose={() => setEditU(null)} />
      {pa.modals}
    </Page>
  )
}

export function UnitDetail() {
  const { id } = useParams(); const { d, product } = useLookup(); const nav = useNavigate(); const [edit, setEdit] = useState(false)
  const u = d.units.find((x) => x.id === id)
  if (!u) return <Page title="واحد پیدا نشد" back="/admin/catalog?tab=units"><Card><EmptyState title="واحدی با این شناسه نیست." desc="بارکد را دوباره اسکن کنید یا سریال را جست‌وجو کنید." /></Card></Page>
  const p = product(u.productId)
  const order = d.orders.find((o) => o.shipments.some((s) => s.items.some((i) => i.unitId === u.id)))
  return (
    <Page module="catalog" back="/admin/catalog?tab=units" title={<span className="ltr font-mono">{u.code}</span>} badge={<StatusBadge s={u.status} />} sub={`${p.title} · ${u.color}`}
      actions={<><Button icon={<Printer size={14} />} onClick={() => nav(`/admin/labels?units=${u.id}`)}>چاپ برچسب</Button><Button icon={<Printer size={14} />} onClick={() => nav(`/admin/print?doc=warranty&unit=${u.id}`)}>کارت گارانتی</Button></>}
      primary={<Button variant="primary" icon={<Pencil size={14} />} onClick={() => setEdit(true)}>ویرایش واحد</Button>}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="شناسنامهٔ واحد"><div className="mb-3 flex gap-3"><ProductImg pid={p.id} size={84} /><div><p className="text-13 font-semibold">{p.title}</p><p className="text-12 text-t2">{p.code}</p></div></div>
          <Row k="سریال / IMEI"><CopyId v={u.serial} /></Row><Row k="وضعیت کالا">{CONDITION[u.condition]}</Row><Row k={<>گرید<Hint k="grade" /></>}>{g(u.grade)}</Row><Row k="انبار">{WAREHOUSE[u.warehouse]}</Row><Row k="قفسه"><span className="ltr font-mono">{u.shelf}</span></Row><Row k="سن موجودی">{fa(Math.round((Date.now() - new Date(u.received).getTime()) / 864e5))} روز</Row>
          {order && <Row k="سفارش"><button className="ltr font-mono text-brand" onClick={() => nav(`/admin/orders/${order.id}`)}>{order.id}</button></Row>}
          <p className="mt-3 mb-1 text-11 font-medium text-t2">ایرادهای ظاهری</p>{u.flaws.length ? u.flaws.map((f) => <Badge key={f} tone="warning">{f}</Badge>) : <span className="text-12 text-t2">ایرادی ثبت نشده است.</span>}</Card>
        <Card title="قیمت و سود"><Row k={<>قیمت تمام‌شده<Hint k="landed" /></>}><Money v={u.cost} /></Row><Row k="قیمت فروش">{u.price ? <Money v={u.price} /> : <span className="text-warning">بدون قیمت</span>}</Row><Row k={<>سود هر واحد<Hint k="margin" /></>}>{u.price ? <span className={u.price < u.cost ? 'text-danger' : 'text-success'}>{toman(u.price - u.cost)} ({pct(((u.price - u.cost) / u.price) * 100, 1)})</span> : '—'}</Row><Row k="قیمت مرجع کالای نو"><Money v={p.priceNew} /></Row>
          <div className="mt-3 rounded-md bg-brand-tint/50 p-2 text-12"><p className="flex items-center gap-1 font-medium text-brand"><Sparkles size={12} />قیمت پیشنهادی: {compactToman(Math.round((u.cost * 1.22) / 1e5) * 1e5)}</p><p className="text-11 text-t2">بر اساس قیمت بازار و سن موجودی · اطمینان: متوسط</p></div></Card>
        <Card title="کد، بارکد و QR"><Barcode value={u.code ?? u.id} className="h-16 w-full rounded border border-line" />{u.ean && <Barcode value={u.ean} type="ean13" className="mt-2 h-16 w-full rounded border border-line" />}<div className="mt-3 flex items-center gap-3"><QR value={`https://ghanimat.example/u/${u.code}`} size={84} /><p className="text-12 text-t2">اسکن این کد در جست‌وجو، جمع‌آوری، بسته‌بندی و مرجوعی همین واحد را باز می‌کند.</p></div>
          <div className="mt-3"><ProductLabel p={p} u={u} /></div></Card>
      </div>
      <UnitDrawer u={edit ? u : null} onClose={() => setEdit(false)} />
    </Page>
  )
}

/** چاپ برچسب کالا: تکی یا گروهی، اندازه، زمینه و تعداد نسخه */
export function Labels() {
  const { d, product } = useLookup(); const [sp] = useSearchParams(); const nav = useNavigate()
  const [size, setSize] = useState('50x30'); const [bg, setBg] = useState('white'); const [copies, setCopies] = useState(1); const [sheet, setSheet] = useState(false)
  const unitIds = (sp.get('units') ?? '').split(',').filter(Boolean); const prodIds = (sp.get('products') ?? '').split(',').filter(Boolean)
  const list: { p: Product; u?: Unit }[] = [...unitIds.map((id) => d.units.find((u) => u.id === id)).filter(Boolean).map((u) => ({ p: product(u!.productId), u: u! })), ...prodIds.flatMap((id) => { const p = d.products.find((x) => x.id === id); if (!p) return []; const us = d.units.filter((u) => u.productId === p.id && ['unit.published', 'unit.ready', 'unit.qc', 'unit.photo'].includes(u.status)); return p.mode === 'serial' && us.length ? us.map((u) => ({ p, u })) : [{ p }] })]
  const all = list.flatMap((x) => Array.from({ length: copies }, () => x))
  return (
    <Page title="چاپ برچسب کالا" back="/admin/catalog" sub="کد درشت، نام، شرح کوتاه، QR با حرف گرید و بارکد تمام‌عرض؛ اندازه‌ها به میلی‌متر واقعی."
      primary={<Button variant="primary" icon={<Printer size={14} />} disabled={!all.length} onClick={() => { mutate(() => {}, { action: 'چاپ برچسب کالا', target: `${all.length} برچسب` }); window.print() }}>چاپ {fa(all.length)} برچسب</Button>}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="no-print self-start" title="تنظیم چاپ"><div className="space-y-3">
          <Field label="اندازه"><Select value={size} onChange={setSize} options={Object.entries(LABEL_SIZES).map(([k, v]) => [k, v.label])} /></Field>
          <Field label="زمینه"><Segmented size="sm" value={bg} onChange={setBg} options={Object.entries(LABEL_BG).map(([k, v]) => [k, v.label])} /></Field>
          <Field label="تعداد نسخه از هر برچسب"><Input type="number" min={1} max={20} className="ltr w-24 text-center font-mono" value={copies} onChange={(e) => setCopies(Math.min(20, Math.max(1, +e.target.value)))} /></Field>
          <label className="flex items-center gap-2 text-13"><Toggle on={sheet} label="A4 چندتایی" onChange={setSheet} />چند برچسب در یک برگ A4</label>
          <Field label="افزودن کالا یا واحد"><Select value="" onChange={(v) => { if (!v) return; const [k, id] = v.split(':'); const n = new URLSearchParams(sp); const key = k === 'u' ? 'units' : 'products'; n.set(key, [...(n.get(key) ?? '').split(',').filter(Boolean), id].join(',')); nav(`/admin/labels?${n}`) }} options={[['', 'انتخاب کنید…'], ...d.products.map((p) => [`p:${p.id}`, `کالا: ${p.title}`] as [string, string]), ...d.units.filter((u) => u.status !== 'unit.sold').map((u) => [`u:${u.id}`, `واحد: ${u.code} · ${product(u.productId)?.en}`] as [string, string])]} /></Field>
          {list.length > 0 && <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => nav('/admin/labels')}>پاک‌کردن فهرست</Button>}
        </div></Card>
        <div className="print-area rounded-xl border border-line bg-neutral-bg p-6">
          {all.length === 0 ? <EmptyState icon={<BarcodeIcon size={22} />} title="برچسبی انتخاب نشده است." desc="از فهرست کالاها یا واحدها چند مورد را انتخاب کنید و «چاپ برچسب» را بزنید، یا از کادر کناری اضافه کنید." action={<Button onClick={() => nav('/admin/catalog?tab=units')}>انتخاب از فهرست واحدها</Button>} />
            : <div className={cx('flex flex-wrap gap-3', sheet && 'mx-auto w-[210mm] bg-white p-[8mm]')}>{all.map((x, i) => <ProductLabel key={i} p={x.p} u={x.u} size={size} bg={bg} qty={x.p.mode === 'qty' ? (x.p.qty?.tehran ?? 0) + (x.p.qty?.mahabad ?? 0) : undefined} />)}</div>}
        </div>
      </div>
    </Page>
  )
}

export function Trash() {
  const d = useDB()
  const purge = async (ids: string[]) => { if (!(await confirm({ title: ids.length === 1 ? 'حذف دائمی این مورد؟' : `حذف دائمی ${fa(ids.length)} مورد؟`, body: 'این کار برگشت‌پذیر نیست. سوابق سفارش‌های قدیمی با اطلاعات ذخیره‌شده در خود سفارش باقی می‌مانند.', confirm: 'حذف دائمی', danger: true }))) return; mutate((x) => { x.trash = x.trash.filter((t) => !ids.includes(t.id)) }, { action: 'حذف دائمی', target: `${ids.length} مورد` }); toast(`${fa(ids.length)} مورد برای همیشه حذف شد.`) }
  return (
    <Page title="سطل بازیافت" sub="موارد حذف‌شده تا ۳۰ روز اینجا می‌مانند؛ بازگردانی یا حذف دائمی." empty={{ title: 'سطل بازیافت خالی است.' }}>
      <DataTable name="سطل بازیافت" rows={d.trash} rowKey={(t) => t.id} empty={{ title: 'سطل بازیافت خالی است.', desc: 'هر چیزی که حذف کنید، اول اینجا می‌آید و قابل بازگردانی است.' }}
        cols={[{ key: 'label', title: 'مورد', render: (t) => t.ek === 'products' ? <Cell pid={t.data.id} a={t.label} b={t.kind} /> : <Cell a={t.label} b={t.kind} /> }, { key: 'at', title: 'زمان حذف', render: (t) => rel(t.at), sort: (t) => t.at }, { key: 'left', title: 'باقی‌مانده تا حذف خودکار', render: (t) => `${fa(Math.max(0, 30 - Math.floor((Date.now() - new Date(t.at).getTime()) / 864e5)))} روز` }]}
        actions={(t) => [{ label: 'بازگردانی', icon: <RotateCcw size={14} />, onClick: () => { restoreTrash(t.id); toast(`«${t.label}» به جای خود برگشت.`) } }, 'sep', { label: 'حذف دائمی', icon: <Trash2 size={14} />, danger: true, onClick: () => purge([t.id]) }]}
        bulk={(ids, clear) => <><Button size="sm" onClick={() => { ids.forEach(restoreTrash); toast(`${fa(ids.length)} مورد بازگردانده شد.`); clear() }}>بازگردانی {fa(ids.length)}</Button><Button size="sm" variant="danger" onClick={() => { purge(ids); clear() }}>حذف دائمی</Button></>} />
    </Page>
  )
}
export { Package }
