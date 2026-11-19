import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarRange, Check, FileDown, Layers, Printer } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, StatusBadge, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB, useSession } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import { st } from '@/shared/data/statuses'
import type { Order, Shipment } from '@/shared/data/seed'
import { CourierLabel, Invoice, Manifest, PickList, PickupReceipt, PostLabel, type DocOpts } from './docs'
import { PAPERS, printPages, saveBlob, toPdf, type OutPage } from '@/shared/lib/printOut'

/** سندهایی که گروهی چاپ می‌شوند؛ per = به‌ازای هر سفارش یا هر مرسوله، all = یک سند تجمیعی برای همه */
export const BATCH_DOCS: { id: string; label: string; per: 'order' | 'ship' | 'all'; hint: string }[] = [
  { id: 'invoice', label: 'فاکتور فروش', per: 'order', hint: 'یک فاکتور برای هر سفارش' },
  { id: 'proforma', label: 'پیش‌فاکتور', per: 'order', hint: 'برای خریدار حقوقی و استعلام' },
  { id: 'post', label: 'برچسب و رسید پستی', per: 'ship', hint: 'فقط مرسوله‌های پست، پیشتاز و تیپاکس' },
  { id: 'courier', label: 'برچسب مرسولهٔ پیک', per: 'ship', hint: 'فقط مرسوله‌های پیک و ارسال سریع' },
  { id: 'pickup', label: 'رسید دریافت حضوری', per: 'order', hint: 'فقط سفارش‌های تحویل حضوری' },
  { id: 'pick', label: 'لیست جمع‌آوری تجمیعی انبار', per: 'all', hint: 'یک برگه برای همهٔ اقلام' },
  { id: 'manifest', label: 'مانیفست تحویل به پست', per: 'all', hint: 'فهرست همهٔ مرسوله‌های پستی' },
]
/** اندازه‌های قابل انتخاب برای هر نوع سند (پیش‌فرض: اولی) */
export const SIZE_OPTS: Record<string, string[]> = { invoice: ['A4', 'A5', 'Letter'], proforma: ['A4', 'A5', 'Letter'], post: ['A6', 'A5 افقی', '100x150', 'A5'], courier: ['100x100', '100x150', 'A6'], pickup: ['80mm', '58mm', 'A6', 'A5'], pick: ['A4', 'A4 افقی', 'A5'], manifest: ['A4', 'A4 افقی', 'A5'] }
export function pageEls(root: ParentNode, sel: string): HTMLElement[] { return [...root.querySelectorAll<HTMLElement>(sel)].map((w) => w.querySelector<HTMLElement>('.doc-sheet') ?? w) }
const isPost = (s: Shipment) => /پست|پیشتاز|تیپاکس|باربری/.test(s.method)
const isCourier = (s: Shipment) => !isPost(s) && !/حضوری/.test(s.method)
const isPickup = (o: Order) => o.shipments.some((s) => /حضوری/.test(s.method))
const day = (d: Date) => d.toISOString().slice(0, 10)
const PRESETS: [string, string][] = [['today', 'امروز'], ['yesterday', 'دیروز'], ['7d', '۷ روز اخیر'], ['30d', '۳۰ روز اخیر'], ['custom', 'بازهٔ دلخواه'], ['all', 'همه']]
const range = (p: string, from: string, to: string): [string, string] | null => { const t = new Date(); const ago = (n: number) => day(new Date(t.getTime() - n * 864e5))
  return p === 'today' ? [day(t), day(t)] : p === 'yesterday' ? [ago(1), ago(1)] : p === '7d' ? [ago(6), day(t)] : p === '30d' ? [ago(29), day(t)] : p === 'custom' ? [from || '0000', to || '9999'] : null }

/** چاپ گروهی: سفارش‌های انتخاب‌شده یا سفارش‌های یک بازهٔ تاریخ و وضعیت؛ چند نوع سند با هم، هر سند در صفحهٔ جدا */
export function BatchPrint() {
  const d = useDB(); const s0 = useSession(); const nav = useNavigate(); const [sp] = useSearchParams()
  const [picked, setPicked] = useState<string[]>(() => sp.get('orders')?.split(',').filter(Boolean) ?? [])
  const [src, setSrc] = useState<'picked' | 'filter'>(picked.length ? 'picked' : 'filter')
  const [preset, setPreset] = useState(sp.get('range') ?? 'today'); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const statuses = [...new Set(d.orders.map((o) => o.status))]
  const [stSel, setStSel] = useState<string[]>(sp.get('status')?.split(',') ?? []); const [method, setMethod] = useState('all'); const [wh, setWh] = useState('all'); const [onlyNew, setOnlyNew] = useState(false)
  const [docs, setDocs] = useState<string[]>(sp.get('docs')?.split(',').filter((x) => BATCH_DOCS.some((b) => b.id === x)) ?? ['invoice'])
  const [order, setOrder] = useState<'byOrder' | 'byDoc'>('byOrder'); const [copies, setCopies] = useState(1); const [sort, setSort] = useState<'old' | 'new'>('old')
  const [sizes, setSizes] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(SIZE_OPTS).map(([k, v]) => [k, (d.docSettings as Record<string, { paper?: string }>)[k]?.paper ?? v[0]])))
  const paper = sizes.post; const [busy, setBusy] = useState<string | null>(null); const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const opts = (id: string): DocOpts => ({ font: 1, margin: 10, footer: '', seal: true, hide: [], ...(d.docSettings[id] ?? {}) } as DocOpts)
  const printedRefs = (doc: string) => new Set(d.printLog.filter((x) => x.doc === doc).map((x) => x.ref))
  const found = useMemo(() => {
    let list = src === 'picked' ? d.orders.filter((o) => picked.includes(o.id)) : d.orders
    if (src === 'filter') { const r = range(preset, from, to); if (r) list = list.filter((o) => { const x = o.createdAt.slice(0, 10); return x >= r[0] && x <= r[1] }); if (stSel.length) list = list.filter((o) => stSel.includes(o.status)) }
    if (wh !== 'all') list = list.filter((o) => o.shipments.some((s) => s.warehouse === wh))
    if (method !== 'all') list = list.filter((o) => o.shipments.some((s) => (method === 'post' ? isPost(s) : method === 'courier' ? isCourier(s) : /حضوری/.test(s.method))))
    if (onlyNew) list = list.filter((o) => docs.some((doc) => { const per = BATCH_DOCS.find((b) => b.id === doc)!.per; const done = printedRefs(doc); return per === 'ship' ? o.shipments.some((s) => !done.has(s.id)) : !done.has(o.id) }))
    return [...list].sort((a, b) => (sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)))
  }, [d.orders, d.printLog, src, picked, preset, from, to, stSel, wh, method, onlyNew, docs, sort])
  const [off, setOff] = useState<string[]>([]); const [lq, setLq] = useState('')
  const orders = found.filter((o) => !off.includes(o.id))
  // سندهای هر سفارش با رعایت قاعده‌ها (لغوشده، روش ارسال)
  const live = (s: Shipment) => s.status !== 'ship.cancelled'
  const perOrder = (o: Order) => docs.flatMap((doc) => { const B = BATCH_DOCS.find((b) => b.id === doc)!; if (B.per === 'all') return []
    if (doc === 'invoice' || doc === 'proforma') return o.status === 'order.cancelled' && doc === 'invoice' ? [] : Array.from({ length: doc === 'invoice' ? copies : 1 }, (_, c) => ({ key: `${doc}-${o.id}-${c}`, doc, ref: o.id, el: <Invoice o={o} opts={doc === 'proforma' ? { ...opts(doc), proforma: true, seal: false } : opts(doc)} /> }))
    if (doc === 'pickup') return isPickup(o) ? [{ key: `pickup-${o.id}`, doc, ref: o.id, el: <PickupReceipt o={o} opts={opts(doc)} /> }] : []
    return o.shipments.filter(live).filter(doc === 'post' ? isPost : isCourier).map((s) => ({ key: `${doc}-${s.id}`, doc, ref: s.id, el: doc === 'post' ? <PostLabel o={o} s={s} opts={opts(doc)} paper={paper} /> : <CourierLabel o={o} s={s} opts={opts(doc)} /> }))
  })
  const ships = orders.flatMap((o) => o.shipments.filter(live).map((s) => ({ ...s, order: o })))
  const agg = docs.filter((x) => BATCH_DOCS.find((b) => b.id === x)!.per === 'all').map((doc) => ({ key: `${doc}-all`, doc, ref: `${fa(orders.length)} سفارش`, el: doc === 'pick' ? <PickList ships={ships.filter((s) => !['ship.delivered', 'ship.cancelled', 'ship.returned'].includes(s.status))} opts={opts(doc)} /> : <Manifest ships={ships.filter(isPost)} opts={opts(doc)} /> }))
  const pages = order === 'byOrder' ? [...agg, ...orders.flatMap(perOrder)] : [...agg, ...docs.flatMap((doc) => orders.flatMap((o) => perOrder(o).filter((x) => x.doc === doc)))]
  const count = (doc: string) => pages.filter((x) => x.doc === doc).length
  const skipped = docs.includes('post') ? orders.filter((o) => !o.shipments.some((s) => live(s) && isPost(s))).length : 0
  const log = (how: string) => { const by = currentUser()?.name ?? 'کارشناس'; const at = new Date().toISOString()
    mutate((x) => { pages.forEach((p, i) => { const n = x.printLog.filter((y) => y.doc === p.doc && y.ref === p.ref).length; x.printLog.unshift({ id: `PL-${Date.now().toString(36).slice(-4).toUpperCase()}${i}`, doc: p.doc, label: BATCH_DOCS.find((b) => b.id === p.doc)!.label, ref: p.ref, by, at, copy: n + 1, paper: sizes[p.doc] ?? 'A4' }) }) }, { action: 'چاپ گروهی', target: `${fa(pages.length)} سند · ${fa(orders.length)} سفارش · ${how}`, after: docs.map((x) => `${BATCH_DOCS.find((b) => b.id === x)!.label}: ${count(x)} (${sizes[x]})`).join('، ') }) }
  const outPages = (): OutPage[] => pageEls(document, '[data-batch-page]').map((el, i) => ({ el, paper: sizes[pages[i].doc] ?? 'A4' }))
  const guard = () => { if (!pages.length) { toast('سندی برای چاپ نیست؛ فیلترها یا نوع سند را عوض کنید.', { tone: 'err' }); return false } if (s0.simulate === 'fail') { toast('چاپگر در دسترس نیست. «دانلود PDF» را بزنید.', { tone: 'err' }); return false } return true }
  const pdf = async () => { if (!guard()) return; setBusy('در حال آماده‌سازی…'); try { const blob = await toPdf(outPages(), (i, n) => setBusy(`ساخت PDF: صفحهٔ ${fa(i)} از ${fa(n)}`)); const name = `ghanimat-${docs.join('-')}-${new Date().toISOString().slice(0, 10)}.pdf`; setPdfUrl(saveBlob(blob, name)); log('PDF'); toast(`PDF با ${fa(pages.length)} صفحه ساخته شد (${(blob.size / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت).`) } catch (e) { toast(`ساخت PDF ناموفق بود: ${(e as Error).message}`, { tone: 'err' }) } finally { setBusy(null) } }
  const print = async () => { if (!guard()) return; setBusy('آماده‌سازی چاپ…'); try { const ok = await printPages(outPages()); if (ok) log('چاپ'); else { try { window.print(); log('چاپ') } catch { toast('مرورگر پنجرهٔ چاپ را باز نکرد. «دانلود PDF» را بزنید و فایل را چاپ کنید.', { tone: 'err' }) } } } finally { setBusy(null) } }

  return (
    <Page title="چاپ گروهی" module="print" back="/admin/print" sub="فاکتورها، برچسب‌های پستی و پیک، رسیدها و لیست جمع‌آوری چند سفارش با هم؛ هر سند در صفحهٔ جدا"
      actions={<><Button variant="ghost" onClick={() => nav('/admin/print?view=archive')}>بایگانی و سابقهٔ چاپ</Button><Button icon={<Printer size={14} />} disabled={!pages.length || !!busy} onClick={print}>چاپ {fa(pages.length)} سند</Button></>}
      primary={<Button variant="primary" icon={<FileDown size={14} />} loading={!!busy} disabled={!pages.length} onClick={pdf}>دانلود PDF ({fa(pages.length)} سند)</Button>}
      badge={busy ? <Badge tone="info">{busy}</Badge> : undefined}>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="no-print space-y-4">
          <Card title={<span className="flex items-center gap-1.5"><CalendarRange size={15} />کدام سفارش‌ها</span>}><div className="space-y-3">
            {picked.length > 0 && <Segmented value={src} onChange={setSrc} options={[['picked', `انتخاب‌شده‌ها (${fa(picked.length)})`], ['filter', 'با فیلتر']]} />}
            {src === 'filter' && <>
              <div role="group" aria-label="تاریخ ثبت سفارش"><p className="mb-1 text-12 font-medium text-t2">تاریخ ثبت سفارش</p><div className="flex flex-wrap gap-1.5">{PRESETS.map(([k, l]) => <button key={k} type="button" onClick={() => setPreset(k)} className={cx('rounded-full border px-2.5 py-1 text-12', preset === k ? 'border-transparent bg-brand-solid text-white' : 'border-line text-t2 hover:border-brand')}>{l}</button>)}</div></div>
              {preset === 'custom' && <div className="grid grid-cols-2 gap-2"><Field label="از تاریخ"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="تا تاریخ"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>}
              <div role="group" aria-label="وضعیت سفارش"><p className="mb-1 text-12 font-medium text-t2">وضعیت سفارش <span className="font-normal text-t3">(خالی = همه)</span></p><div className="flex flex-wrap gap-1.5">{statuses.map((x) => { const on = stSel.includes(x); return <button key={x} type="button" aria-pressed={on} onClick={() => setStSel(on ? stSel.filter((y) => y !== x) : [...stSel, x])} className={cx('flex items-center gap-1 rounded-full border px-2 py-0.5 text-11', on ? 'border-brand bg-brand-tint text-brand' : 'border-line text-t2')}>{on && <Check size={11} />}{st(x).label} · {fa(d.orders.filter((o) => o.status === x).length)}</button> })}</div></div>
            </>}
            <div className="grid grid-cols-2 gap-2"><Field label="انبار"><Select value={wh} onChange={setWh} other={false} options={[['all', 'همه'], ['tehran', 'تهران'], ['mahabad', 'مهاباد']]} /></Field><Field label="روش ارسال"><Select value={method} onChange={setMethod} other={false} options={[['all', 'همه'], ['post', 'پست و پیشتاز'], ['courier', 'پیک و ارسال سریع'], ['pickup', 'تحویل حضوری']]} /></Field></div>
            <Toggle on={onlyNew} onChange={setOnlyNew} text="فقط سندهایی که هنوز چاپ نشده‌اند" />
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-12"><b className="tnum">{fa(orders.length)}</b> سفارش · جمع {toman(orders.reduce((a, o) => a + o.total, 0))}</p>
          </div></Card>
          <Card title={<span className="flex items-center gap-1.5"><Layers size={15} />کدام سندها</span>}><ul className="space-y-1.5">{BATCH_DOCS.map((b) => { const on = docs.includes(b.id); return <li key={b.id}><label className={cx('flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-13', on ? 'border-brand bg-brand-tint/40' : 'border-line')}><input type="checkbox" className="mt-1" checked={on} onChange={() => setDocs(on ? docs.filter((x) => x !== b.id) : [...docs, b.id])} /><span className="flex-1"><b className="block">{b.label}</b><span className="text-11 text-t2">{b.hint}</span></span>{on && <Badge dot={false} tone="brand">{fa(count(b.id))}</Badge>}</label></li> })}</ul></Card>
          <Card title="ترتیب و کاغذ"><div className="space-y-3">
            <Field label="ترتیب صفحه‌ها"><Segmented value={order} onChange={setOrder} options={[['byOrder', 'سفارش به سفارش'], ['byDoc', 'اول همهٔ فاکتورها، بعد برچسب‌ها']]} /></Field>
            <Field label="مرتب‌سازی سفارش‌ها"><Segmented value={sort} onChange={setSort} options={[['old', 'قدیمی‌ترین اول'], ['new', 'جدیدترین اول']]} /></Field>
            {docs.includes('invoice') && <Field label="تعداد نسخهٔ فاکتور"><Segmented value={String(copies)} onChange={(v) => setCopies(+v)} options={[['1', '۱ نسخه'], ['2', '۲ نسخه (مشتری و بایگانی)']]} /></Field>}
            <div><p className="mb-1 text-12 font-medium text-t2">اندازهٔ خروجی هر سند</p><div className="space-y-1.5">{docs.map((x) => <div key={x} className="flex items-center gap-2 text-12"><span className="w-28 shrink-0 truncate">{BATCH_DOCS.find((b) => b.id === x)!.label}</span><div className="flex-1"><Select label={`اندازهٔ ${BATCH_DOCS.find((b) => b.id === x)!.label}`} value={sizes[x]} other={false} onChange={(v) => { setSizes({ ...sizes, [x]: v }); mutate((y) => { (y.docSettings as Record<string, object>)[x] = { ...((y.docSettings as Record<string, object>)[x] ?? {}), paper: v } }) }} options={(SIZE_OPTS[x] ?? ['A4']).map((k) => [k, PAPERS[k]?.label ?? k] as [string, string])} /></div></div>)}</div><p className="mt-1 text-11 text-t3">انتخاب هر سند برای دفعهٔ بعد هم می‌ماند. سند در کاغذ کوچک‌تر با همان نسبت کوچک می‌شود.</p></div>
          </div></Card>
        </div>
        <div className="space-y-3">
          <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-12">
            <b>{fa(pages.length)} سند</b>{docs.map((x) => <Badge key={x} dot={false}>{BATCH_DOCS.find((b) => b.id === x)!.label}: {fa(count(x))}</Badge>)}
            {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">باز کردن آخرین PDF</a>}
            {skipped > 0 && <span className="text-warning">{fa(skipped)} سفارش مرسولهٔ پستی ندارد و برچسب پستی نمی‌گیرد.</span>}
            {docs.includes('invoice') && orders.some((o) => o.status === 'order.cancelled') && <span className="text-warning">برای سفارش لغوشده فاکتور چاپ نمی‌شود.</span>}
          </div>
          {found.length > 0 && <Card pad={false} className="no-print">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-12"><b>{fa(orders.length)} از {fa(found.length)} سفارش انتخاب شده</b><button type="button" className="text-brand" onClick={() => setOff([])}>همه</button><button type="button" className="text-brand" onClick={() => setOff(found.map((o) => o.id))}>هیچ‌کدام</button>
              <Input aria-label="جست‌وجو در سفارش‌ها" className="h-8 w-44 text-12" value={lq} onChange={(e) => setLq(e.target.value)} placeholder="شماره یا نام مشتری…" />
              {src === 'picked' && <span className="w-56"><Select label="افزودن سفارش" value="" placeholder="افزودن سفارش دیگر…" other={false} onChange={(v) => { setPicked([...picked, v]); setOff(off.filter((x) => x !== v)) }} options={d.orders.filter((o) => !picked.includes(o.id)).map((o) => [o.id, `${o.id} · ${d.customers.find((c) => c.id === o.customerId)?.name ?? ''}`] as [string, string])} /></span>}
              <span className="mr-auto text-11 text-t3">تیک هر سفارش را بردارید تا چاپ نشود.</span></div>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto overscroll-contain text-12">{found.filter((o) => !lq.trim() || `${o.id} ${d.customers.find((c) => c.id === o.customerId)?.name ?? ''}`.includes(lq.trim())).map((o) => { const on = !off.includes(o.id); return <li key={o.id} className={cx('flex items-center gap-2 px-3 py-1.5', !on && 'opacity-50')}>
              <input type="checkbox" aria-label={`انتخاب ${o.id}`} checked={on} onChange={() => setOff(on ? [...off, o.id] : off.filter((x) => x !== o.id))} />
              <button type="button" className="ltr font-mono text-brand hover:underline" onClick={() => nav(`/admin/orders/${o.id}`)}>{o.id}</button><span className="flex-1 truncate">{d.customers.find((c) => c.id === o.customerId)?.name}</span><span className="hidden truncate text-t2 sm:inline">{[...new Set(o.shipments.map((s) => s.method))].join('، ')}</span><StatusBadge s={o.status} /><span className="tnum text-t2">{new Date(o.createdAt).toLocaleDateString('fa-IR')}</span>
              {d.printLog.some((x) => x.ref === o.id && x.doc === 'invoice') && <Badge dot={false}>چاپ شده</Badge>}</li> })}</ul></Card>}
          <div className="print-area space-y-6 overflow-auto rounded-xl border border-line bg-neutral-bg p-4 md:p-6">
            {pages.length === 0 ? <p className="no-print py-10 text-center text-13 text-t2">با این فیلترها سندی برای چاپ نیست.</p>
              : pages.map((p, i) => <div key={p.key} data-batch-page={i} className={cx('relative', i < pages.length - 1 && 'print-break')}><span className="no-print absolute -top-4 left-0 text-[10px] text-t3">{fa(i + 1)} · {BATCH_DOCS.find((b) => b.id === p.doc)!.label} · {PAPERS[sizes[p.doc]]?.label ?? sizes[p.doc]}</span>{p.el}</div>)}
          </div>
        </div>
      </div>
    </Page>
  )
}
