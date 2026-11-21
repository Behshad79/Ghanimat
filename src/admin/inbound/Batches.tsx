// محموله‌های خرید: ثبت گام‌به‌گام یا جدولی کالاهای خریداری‌شده با لینک، تنوع، مالک، تقسیم انبار، بها و قیمت پیشنهادی؛ برچسب خودکار و رسید در انبار ورودی
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronDown, ExternalLink, FileSpreadsheet, ImagePlus, PackageCheck, Pencil, Plus, Printer, RefreshCw, Sparkles, Table2, Trash2, Truck, Wand2, Zap } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Progress, Segmented, Select, Textarea } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { MoneyInput } from '@/shared/ui/money'
import { Barcode } from '@/shared/ui/codes'
import { printSolo } from '@/shared/lib/printSolo'
import { fileToImage } from '@/shared/lib/image'
import { currentUser, getDB, myParty, mutate, notify, takeCode, useDB } from '@/shared/lib/store'
import { compactToman, fa, pct, rel, toman } from '@/shared/lib/fa'
import { fetchRate, type FxCur } from '@/shared/lib/fx'
import type { DB } from '@/shared/data/seed'
import { itemSales } from '../catalog/BatchLedger'
import { IN_ROUTES, IN_STAGES, type InBatch, type InItem, type InVariant } from '@/shared/data/incoming'
import { BUY_SOURCES, CURRENCIES, itemLabel, itemQty, itemSplit, landed, varSuffix } from '@/shared/data/inbound'
import { PartyChip, partyLogo, whName } from '../stock/common'
import { ensureProduct, landBatch, mid } from './ops'

const me = () => currentUser()?.name ?? 'پنل'
const usd = () => Math.round(((getDB().storeCfg?.fx?.rates?.['دلار'] ?? 61500) * 1.12) / 100) * 100
export const RATE_HINT: Record<string, number> = { دلار: 0, درهم: 0, دینار: 47, یورو: 0, لیر: 2100, تومان: 1 }
const defaultRate = (c: string) => c === 'دلار' ? usd() : c === 'درهم' ? Math.round(usd() / 3.6725) : c === 'یورو' ? Math.round(usd() * 1.08) : RATE_HINT[c] ?? 1
const nameFromUrl = (u: string) => { try { const url = new URL(u); const seg = url.pathname.split('/').filter(Boolean); const i = seg.indexOf('dp'); const slug = i > 0 ? seg[i - 1] : seg.find((x) => x.length > 6 && /[a-z]/i.test(x)); return slug && slug !== 'dp' ? decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim() : '' } catch { return '' } }
const sourceFromUrl = (u: string) => /amazon\./i.test(u) ? 'آمازون' : /noon\./i.test(u) ? 'نون (Noon)' : /digikala/i.test(u) ? 'سایر' : ''
const pctMargin = (sell: number, cost: number) => (sell > 0 && cost > 0 ? Math.round(((sell - cost) / sell) * 100) : null)

/** کارت هر محموله با جدول اقلام */
export function BatchesTab({ onManifests }: { onManifests: () => void }) {
  const d = useDB(); const nav = useNavigate(); const s = d.stock
  const [form, setForm] = useState<InBatch | null>(null); const [wiz, setWiz] = useState<{ b: string; it?: InItem } | null>(null); const [grid, setGrid] = useState<string | null>(null)
  const [land, setLand] = useState<string | null>(null); const [labels, setLabels] = useState<string | null>(null); const [view, setView] = useState<'open' | 'done'>('open')
  const open = d.incoming.filter((b) => !b.receivedAt); const done = d.incoming.filter((b) => b.receivedAt)
  const [q, setQ] = useState(''); const [shut, setShut] = useState<Record<string, boolean>>({})
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim()
  const list = (view === 'open' ? open : done).filter((b) => !q.trim() || norm(`${b.id} ${b.title} ${b.supplier ?? ''} ${b.items.map((it) => `${it.name} ${it.code ?? ''} ${it.source ?? ''}`).join(' ')}`).includes(norm(q)))
  const isOpen = (id: string, i: number) => shut[id] === undefined ? i === 0 || !!q.trim() : !shut[id]
  const units = open.flatMap((b) => b.items).reduce((a, it) => a + itemQty(it), 0)
  const value = open.reduce((a, b) => a + b.items.reduce((x, it) => x + landed(b, it).unit * itemQty(it), 0), 0)
  const byOwner = (o: string) => open.flatMap((b) => b.items).filter((it) => (it.owner ?? 'gh') === o).reduce((a, it) => a + itemQty(it), 0)
  const newBatch = () => { const mine = myParty(); const wh = s.warehouses.find((w) => w.operator === mine && w.active)?.id ?? 'tehran'
    setForm({ id: `IN-${Date.now().toString(36).slice(-4).toUpperCase()}`, title: '', buyer: mine, landing: wh, by: me(), route: mine === 'gh' ? IN_ROUTES[4] : IN_ROUTES[1], orderedAt: new Date().toISOString(), eta: new Date(Date.now() + 7 * 864e5).toISOString(), stage: IN_STAGES[0], items: [], currency: mine === 'gh' ? 'تومان' : 'دلار', rate: mine === 'gh' ? 1 : usd(), freight: 0, customs: 0, other: 0 }) }
  const build = (b: InBatch, it: InItem) => { let pid = it.productId
    if (!pid) mutate((x) => { const bb = x.incoming.find((q) => q.id === b.id)!; const ii = bb.items.find((q) => q.id === it.id)!; pid = ensureProduct(x, bb, ii).id }, { action: 'ساخت صفحهٔ کالا از محموله', target: `${b.id} · ${it.name}` })
    nav(`/admin/catalog/${pid}/edit?step=0&from=batch`) }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5">
      <Input className="h-9 w-64 text-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی کالا، کد یا تأمین‌کننده" aria-label="جست‌وجو در محموله‌ها" />
      <Segmented size="sm" value={view} onChange={setView} options={[['open', `باز (${fa(open.length)})`], ['done', `رسیده (${fa(done.length)})`]]} />
      <span className="flex flex-wrap gap-1.5 text-11 text-t2"><span className="rounded-full bg-neutral-bg px-2 py-1">{fa(open.flatMap((b) => b.items).length)} قلم · {fa(units)} عدد در راه</span><span className="rounded-full bg-neutral-bg px-2 py-1">ارزش {compactToman(value)}</span><span className="rounded-full bg-neutral-bg px-2 py-1">غنیمت {fa(byOwner('gh'))} · Ve1 {fa(byOwner('ys'))}</span>{open.flatMap((b) => b.items).some((it) => !it.productId) && <span className="rounded-full bg-warning-bg px-2 py-1 text-warning">{fa(open.flatMap((b) => b.items).filter((it) => !it.productId).length)} صفحه نساخته</span>}</span>
      <Button variant="primary" className="mr-auto" icon={<Plus size={14} />} onClick={newBatch}>محمولهٔ تازه</Button>
    </div>
    {list.length === 0 && <Card><EmptyState title={view === 'open' ? 'محمولهٔ بازی نیست.' : 'هنوز محموله‌ای رسید نشده است.'} desc="خرید عراق، دبی، آمازون یا تأمین‌کنندهٔ داخلی را از همان روز خرید ثبت کنید." action={<Button variant="primary" onClick={newBatch}>محمولهٔ تازه</Button>} /></Card>}
    {list.map((b, bi) => { const expanded = isOpen(b.id, bi); const fin = batchFin(d, b); const si = IN_STAGES.indexOf(b.stage as (typeof IN_STAGES)[number]); const dl = Math.ceil((+new Date(b.eta) - Date.now()) / 864e5)
      const tot = b.items.reduce((a, it) => a + itemQty(it), 0); const split: Record<string, number> = {}; b.items.forEach((it) => Object.entries(itemSplit(it)).forEach(([w, q]) => { split[w] = (split[w] ?? 0) + q }))
      return <Card key={b.id} pad={false} title={<span className="flex flex-wrap items-center gap-2"><button type="button" aria-expanded={expanded} aria-label={expanded ? 'بستن محموله' : 'باز کردن محموله'} onClick={() => setShut({ ...shut, [b.id]: expanded })} className="grid size-7 place-items-center rounded-lg hover:bg-neutral-bg"><ChevronDown size={16} className={cx('transition-transform', expanded && 'rotate-180')} /></button><button type="button" className="text-right hover:text-brand" onClick={() => setShut({ ...shut, [b.id]: expanded })}>{b.title || 'محمولهٔ بدون عنوان'}</button><Badge dot={false}>{b.id}</Badge>{b.buyer && <PartyChip s={s} id={b.buyer} />}{!b.receivedAt && <Badge tone={dl < 0 ? 'danger' : dl <= 2 ? 'warning' : 'info'}>{dl < 0 ? `${fa(-dl)} روز تأخیر` : dl === 0 ? 'امروز می‌رسد' : `${fa(dl)} روز تا رسیدن`}</Badge>}{b.receivedAt && <Badge tone="success">رسید {rel(b.receivedAt)}</Badge>}</span>}
        actions={<span className="flex flex-wrap gap-1.5">
          {!b.receivedAt && <><Button size="sm" icon={<Plus size={13} />} onClick={() => setWiz({ b: b.id })}>افزودن کالا (گام‌به‌گام)</Button><Button size="sm" icon={<Table2 size={13} />} onClick={() => setGrid(b.id)}>ویرایش جدولی</Button></>}
          <Button size="sm" variant="ghost" icon={<Printer size={13} />} disabled={!b.items.length} onClick={() => setLabels(b.id)}>برچسب‌ها</Button>
          <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => setForm(structuredClone(b))}>محموله</Button>
          {!b.receivedAt && <Button size="sm" variant="primary" icon={<PackageCheck size={13} />} disabled={!b.items.length} onClick={() => setLand(b.id)}>رسید در {whName(s, b.landing ?? 'tehran')}</Button>}
        </span>}>
        {!expanded && <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-12 text-t2"><span>{fa(b.items.length)} قلم · {fa(tot)} عدد</span>{Object.entries(split).map(([w, q2]) => <span key={w}>{whName(s, w)}: {fa(q2)}</span>)}<span>سرمایه {compactToman(fin.capital)}</span>{b.receivedAt && <span className={fin.profit < 0 ? 'text-danger' : 'text-success'}>سود {compactToman(fin.profit)}</span>}</div>}
        {expanded && <>
        <div className="space-y-2 border-b border-line p-4 text-12">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-t2"><span>مسیر: {b.route}</span>{b.supplier && <span>خرید از: {b.supplier}</span>}<span>انبار ورودی: <b className="text-t1">{whName(s, b.landing ?? 'tehran')}</b></span><span>ارز: {b.currency ?? 'تومان'}{b.currency && b.currency !== 'تومان' ? ` · نرخ ${fa(b.rate ?? 0)}` : ''}</span><span>ثبت: {b.by ?? '—'} · {rel(b.orderedAt)}</span></div>
          <div className="flex flex-wrap items-center gap-2"><b>{fa(b.items.length)} قلم · {fa(tot)} عدد</b>{Object.entries(split).map(([w, q]) => <span key={w} className="rounded-full bg-neutral-bg px-2 py-0.5">{whName(s, w)}: {fa(q)}</span>)}{tot !== Object.values(split).reduce((a, q) => a + q, 0) && <Badge tone="warning">{fa(tot - Object.values(split).reduce((a, q) => a + q, 0))} عدد بدون انبار مقصد</Badge>}</div>
          {!b.receivedAt && <ol className="flex flex-wrap gap-1" aria-label="مرحلهٔ محموله">{IN_STAGES.map((st, i) => <li key={st}><button type="button" onClick={() => mutate((x) => { x.incoming.find((q) => q.id === b.id)!.stage = st }, { action: `مرحلهٔ محموله: ${st}`, target: b.id })} className={cx('rounded-full px-2.5 py-1 text-11 transition', i < si ? 'bg-success-bg text-success' : i === si ? 'bg-brand-solid font-semibold text-white' : 'bg-neutral-bg text-t2 hover:bg-brand-tint')}>{st}</button></li>)}</ol>}
        </div>
        {b.items.length === 0 ? <div className="p-4"><EmptyState title="هنوز کالایی ثبت نشده است." action={<span className="flex gap-2"><Button size="sm" variant="primary" onClick={() => setWiz({ b: b.id })}>گام‌به‌گام</Button><Button size="sm" onClick={() => setGrid(b.id)}>جدولی</Button></span>} /></div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-12"><thead><tr className="bg-surface-2 text-t2">{['کالا', 'تنوع و تعداد', 'مالک', 'سهم انبارها', 'بها و قیمت', 'برچسب', 'صفحهٔ کالا', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
            {b.items.map((it) => { const p = it.productId ? d.products.find((x) => x.id === it.productId) : undefined; const L = landed(b, it); const mg = pctMargin(it.sellPrice ?? 0, L.unit); const sp = itemSplit(it)
              return <tr key={it.id} className="border-t border-line align-top">
                <td className="p-2"><span className="flex gap-2">{it.photos?.[0] || p?.image ? <img src={it.photos?.[0] || p?.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-neutral-bg text-t3"><Camera size={16} /></span>}<span className="min-w-0"><b className="block max-w-60 truncate">{p?.title ?? it.name}</b><span className="text-11 text-t2">{it.source ?? '—'}{it.brand ? ` · ${it.brand}` : ''}</span>{it.amazonUrl && <a href={it.amazonUrl} target="_blank" rel="noreferrer" className="mr-1 inline-flex items-center gap-0.5 text-11 text-brand"><ExternalLink size={10} />لینک</a>}{it.specs && <span className="block max-w-60 truncate text-11 text-t3">{it.specs}</span>}</span></span></td>
                <td className="p-2">{it.variants?.length ? <ul className="space-y-0.5">{it.variants.map((v) => <li key={v.id}>{v.label} <b className="tnum">× {fa(v.qty)}</b></li>)}</ul> : <b className="tnum">× {fa(it.qty)}</b>}</td>
                <td className="p-2"><PartyChip s={s} id={it.owner ?? 'gh'} /></td>
                <td className="p-2">{Object.keys(sp).length ? Object.entries(sp).map(([w, q]) => <span key={w} className="block">{whName(s, w)}: <b className="tnum">{fa(q)}</b></span>) : <span className="text-warning">تعیین نشده</span>}{it.landedAt && <span className="mt-0.5 block text-11 text-success">رسید: {Object.entries(it.landedAt).map(([w, q]) => `${whName(s, w)} ${fa(q)}`).join('، ')}</span>}</td>
                <td className="p-2"><span className="block">{b.currency && b.currency !== 'تومان' ? `${fa(it.unitCost ?? 0)} ${b.currency} ← ` : ''}<b>{toman(L.unit)}</b></span><span className="block text-t2">فروش: {it.sellPrice ? toman(it.sellPrice) : '—'}{mg !== null && <span className={cx('mr-1', mg < 10 ? 'text-danger' : 'text-success')}>({fa(mg)}٪)</span>}</span></td>
                <td className="p-2">{(it.variants?.length ? it.variants : [null]).map((v, i) => <bdi key={i} dir="ltr" className="block font-mono text-11">{itemLabel(s, it, v)}</bdi>)}</td>
                <td className="p-2">{p ? <span className="flex flex-col items-start gap-1"><Badge tone={p.status === 'product.published' ? 'success' : p.health >= 70 ? 'info' : 'warning'} dot={false}>{p.status === 'product.published' ? 'منتشر شده' : `آمادگی ${fa(p.health)}٪`}</Badge><Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => nav(`/admin/catalog/${p.id}/edit?step=0&from=batch`)}>ادامه</Button><span className="flex gap-2 text-11"><button type="button" className="text-t2 hover:text-brand" title="سناریوی اینستاگرام پیش از رسیدن" onClick={() => { mutate((x) => { x.contentQueue.unshift({ id: `cq${Date.now().toString(36)}`, productId: p.id, channel: 'اینستاگرام', kind: 'ریلز', status: 'ایده', due: new Date(Math.max(Date.now() + 864e5, +new Date(b.eta) - 864e5)).toISOString(), owner: me(), note: `معرفی ${p.title} پیش از رسیدن` } as never) }, { action: 'سناریوی معرفی کالای در راه', target: p.title }); toast('سناریوی اینستاگرام به صف محتوا رفت.') }}>+ سناریو</button><button type="button" className="text-t2 hover:text-brand" onClick={() => { mutate((x) => { (x as unknown as { comingSoon?: unknown }); const q = x.products.find((y) => y.id === p.id); if (q) q.comingSoon = q.comingSoon ? undefined : b.eta }, { action: 'به‌زودی کالای در راه', target: p.title }); toast(p.comingSoon ? 'از «به‌زودی» برداشته شد.' : 'در «به‌زودی» با تاریخ رسیدن نمایش داده می‌شود.') }}>{p.comingSoon ? '− به‌زودی' : '+ به‌زودی'}</button></span></span> : <Button size="sm" icon={<Sparkles size={12} />} onClick={() => build(b, it)}>ساخت صفحه</Button>}</td>
                <td className="p-2">{!b.receivedAt && <span className="flex gap-1"><button type="button" aria-label={`ویرایش ${it.name}`} className="grid size-7 place-items-center rounded-lg text-t2 hover:bg-brand-tint hover:text-brand" onClick={() => setWiz({ b: b.id, it })}><Pencil size={13} /></button><button type="button" aria-label={`حذف ${it.name}`} className="grid size-7 place-items-center rounded-lg text-t2 hover:bg-danger-bg hover:text-danger" onClick={async () => { if (await confirm({ title: `«${it.name}» از محموله حذف شود؟`, body: 'برچسب‌هایی که برای این قلم چاپ شده دیگر شناخته نمی‌شوند.', confirm: 'حذف', danger: true })) mutate((x) => { const bb = x.incoming.find((q) => q.id === b.id)!; bb.items = bb.items.filter((q) => q.id !== it.id) }, { action: 'حذف قلم از محموله', target: `${b.id} · ${it.name}` }) }}><Trash2 size={13} /></button></span>}</td>
              </tr> })}
          </tbody></table></div>}
        {!b.receivedAt && <QuickAdd batch={b} />}
        <FinStrip b={b} fin={fin} />
        </>}
      </Card> })}
    {form && <BatchForm b={form} onClose={() => setForm(null)} />}
    {wiz && <ItemWizard batch={d.incoming.find((b) => b.id === wiz.b)!} edit={wiz.it} onClose={() => setWiz(null)} />}
    {grid && <BatchGrid batch={d.incoming.find((b) => b.id === grid)!} onClose={() => setGrid(null)} />}
    {land && <LandModal batch={d.incoming.find((b) => b.id === land)!} onClose={(made) => { setLand(null); if (made?.length) onManifests() }} />}
    {labels && <LabelSheet batch={d.incoming.find((b) => b.id === labels)!} onClose={() => setLabels(null)} />}
  </div>
}

/** مالی هر محموله: سرمایه، پرداخت‌شده و مانده، فروش و سود از زمان رسیدن، و بازگشت سرمایه */
function batchFin(d: DB, b: InBatch) {
  const capital = b.items.reduce((a, it) => a + landed(b, it).unit * itemQty(it), 0)
  const S = b.items.map((it) => ({ it, ...itemSales(d, b, it), unit: landed(b, it).unit }))
  const revenue = S.reduce((a, x) => a + x.revenue, 0); const cogs = S.reduce((a, x) => a + x.sold * x.unit, 0)
  return { capital, revenue, profit: revenue - cogs, paid: b.paid ?? 0, sold: S.reduce((a, x) => a + x.sold, 0) }
}
function FinStrip({ b, fin }: { b: InBatch; fin: ReturnType<typeof batchFin> }) {
  const left = Math.max(0, fin.capital - fin.paid)
  return <div className="grid gap-3 border-t border-line bg-surface-2 p-3 text-12 sm:grid-cols-2 lg:grid-cols-5">
    <p>سرمایهٔ کل<b className="block tnum text-14">{toman(fin.capital)}</b></p>
    <label className="block">پرداخت‌شده به تأمین‌کننده<Input aria-label="پرداخت‌شده" className="ltr mt-0.5 h-8 text-left text-12" value={fin.paid ? fin.paid.toLocaleString('en-US') : ''} placeholder="0" onChange={(e) => mutate((x) => { x.incoming.find((y) => y.id === b.id)!.paid = Number(e.target.value.replace(/\D/g, '')) || 0 }, { action: 'ثبت پرداخت محموله', target: b.id })} /><span className={left ? 'text-warning' : 'text-success'}>{left ? `مانده ${toman(left)}` : 'تسویه شده'}</span></label>
    <p>فروش از این محموله<b className="block tnum text-14">{b.receivedAt ? toman(fin.revenue) : '—'}</b><span className="text-t2">{b.receivedAt ? `${fa(fin.sold)} عدد` : 'بعد از رسید حساب می‌شود'}</span></p>
    <p>سود ناخالص<b className={cx('block tnum text-14', fin.profit < 0 ? 'text-danger' : fin.profit > 0 ? 'text-success' : '')}>{b.receivedAt ? toman(fin.profit) : '—'}</b><span className="text-t2">{fin.revenue ? `حاشیه ${pct((fin.profit / fin.revenue) * 100, 1)}` : ''}</span></p>
    <div><span>بازگشت سرمایه</span><Progress value={fin.capital ? Math.min(100, (fin.revenue / fin.capital) * 100) : 0} tone={fin.revenue >= fin.capital && fin.capital ? 'success' : 'brand'} /><span className="text-11 text-t2">{fin.capital ? pct((fin.revenue / fin.capital) * 100) : '—'}</span></div>
  </div>
}
/** افزودن سریع: لینک یا نام + تعداد + Enter؛ مالک و انبار مقصد پیش‌فرض محموله است و بعداً قابل اصلاح */
function QuickAdd({ batch }: { batch: InBatch }) {
  const d = useDB(); const s = d.stock; const [t, setT] = useState(''); const [n, setN] = useState('1'); const [owner, setOwner] = useState(batch.buyer ?? 'gh')
  const landing = batch.landing ?? 'tehran'
  const add = () => { const raw = t.trim(); if (!raw) return; const url = /^https?:\/\//i.test(raw) ? raw : ''; const name = url ? nameFromUrl(url) || 'کالای تازه (نام را اصلاح کنید)' : raw; const qty = Math.max(1, Number(n.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))) || 1)
    const it: InItem = { id: `ii${Date.now().toString(36)}`, name, qty, amazonUrl: url || undefined, source: url ? sourceFromUrl(url) || undefined : undefined, owner, code: takeCode('product'), split: { [landing]: qty }, by: me(), at: new Date().toISOString() }
    mutate((x) => { x.incoming.find((y) => y.id === batch.id)!.items.push(it) }, { action: 'افزودن سریع کالا به محموله', target: `${batch.id} · ${name}` }); setT(''); setN('1'); toast(`«${name}» با ${fa(qty)} عدد اضافه شد؛ تنوع، بها و تقسیم انبار را با ✎ کامل کنید.`) }
  return <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex flex-wrap items-center gap-2 border-t border-dashed border-line px-4 py-2.5">
    <Zap size={14} className="text-brand" /><Input className="h-9 min-w-60 flex-1 text-12" value={t} onChange={(e) => setT(e.target.value)} placeholder="افزودن سریع: لینک کالا یا نام را بنویسید و Enter بزنید" aria-label="افزودن سریع" />
    <Input className="ltr h-9 w-16 text-center" value={n} onChange={(e) => setN(e.target.value)} aria-label="تعداد" />
    <span className="flex gap-1">{s.parties.filter((p) => p.active).map((p) => <button key={p.id} type="button" aria-pressed={owner === p.id} title={`مالک: ${p.name}`} onClick={() => setOwner(p.id)} className={cx('flex h-9 items-center gap-1 rounded-lg border px-2 text-11 font-semibold', owner === p.id ? 'text-white' : 'border-line')} style={owner === p.id ? { background: p.color, borderColor: p.color } : undefined}><bdi dir="ltr" className="font-mono">{p.prefix}</bdi></button>)}</span>
    <Button type="submit" size="sm" variant="primary" disabled={!t.trim()}>افزودن</Button>
  </form>
}

function BatchForm({ b, onClose }: { b: InBatch; onClose: () => void }) {
  const d = useDB(); const [f, setF] = useState(b); const exists = d.incoming.some((x) => x.id === b.id)
  const save = () => { mutate((x) => { const i = x.incoming.findIndex((q) => q.id === f.id); if (i >= 0) x.incoming[i] = { ...x.incoming[i], ...f, items: x.incoming[i].items }; else x.incoming.unshift(f) }, { action: exists ? 'ویرایش محموله' : 'ثبت محمولهٔ تازه', target: `${f.id} · ${f.title}` }); toast(exists ? 'محموله به‌روز شد.' : 'محموله ثبت شد؛ حالا کالاها را اضافه کنید.'); onClose() }
  return <Modal open onClose={onClose} wide title={exists ? `ویرایش محمولهٔ ${b.id}` : 'محمولهٔ تازه'} footer={<><Button variant="primary" disabled={!f.title.trim()} onClick={save}>{exists ? 'ذخیره' : 'ثبت محموله'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-2"><Field label="عنوان محموله"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً خرید اربیل · آذر یا خرید از یوسف" /></Field></div>
      <Field label="خریدار"><Select value={f.buyer ?? 'gh'} onChange={(v) => setF({ ...f, buyer: v })} options={d.stock.parties.filter((p) => p.active).map((p) => [p.id, p.brandName ? `${p.name} (${p.brandName})` : p.name] as [string, string])} other={false} /></Field>
      <Field label="خرید از (تأمین‌کننده یا بازار)"><Input value={f.supplier ?? ''} onChange={(e) => setF({ ...f, supplier: e.target.value })} placeholder="بازار اربیل، آمازون، یوسف…" /></Field>
      <Field label="مسیر"><Select value={f.route} onChange={(v) => setF({ ...f, route: v })} options={IN_ROUTES} /></Field>
      <Field label="انبار ورودی (اول کجا می‌رسد)"><Select value={f.landing ?? 'tehran'} onChange={(v) => setF({ ...f, landing: v })} options={d.stock.warehouses.filter((w) => w.active).map((w) => [w.id, w.name] as [string, string])} other={false} /></Field>
      <Field label="ارز خرید"><Select value={f.currency ?? 'تومان'} onChange={(v) => setF({ ...f, currency: v, rate: defaultRate(v) })} options={[...CURRENCIES]} other={false} /></Field>
      <Field label="نرخ هر واحد ارز (تومان)" help={f.currency === 'دلار' ? 'پیش‌فرض: نرخ مرجع تنظیمات + ۱۲٪' : undefined} hint={f.currency && f.currency !== 'تومان' && ['دلار', 'درهم', 'دینار'].includes(f.currency) ? <button type="button" className="flex items-center gap-1 text-11 text-brand" onClick={async () => { const r = await fetchRate(f.currency as FxCur); setF({ ...f, rate: r.rate }); toast(`نرخ ${f.currency} ${toman(r.rate)} گذاشته شد.`) }}><RefreshCw size={11} />نرخ امروز</button> : undefined}><MoneyInput value={f.rate ?? 1} onChange={(n) => setF({ ...f, rate: n })} aria-label="نرخ ارز" /></Field>
      <Field label="رسیدن حدودی"><Input type="date" value={f.eta.slice(0, 10)} onChange={(e) => e.target.value && setF({ ...f, eta: new Date(e.target.value).toISOString() })} /></Field>
      <Field label="کرایهٔ حمل (تومان)"><MoneyInput value={f.freight ?? 0} onChange={(n) => setF({ ...f, freight: n })} aria-label="کرایه" /></Field>
      <Field label="گمرک و ترخیص (تومان)"><MoneyInput value={f.customs ?? 0} onChange={(n) => setF({ ...f, customs: n })} aria-label="گمرک" /></Field>
      <Field label="سایر هزینه‌ها (تومان)"><MoneyInput value={f.other ?? 0} onChange={(n) => setF({ ...f, other: n })} aria-label="سایر" /></Field>
      <div className="sm:col-span-3"><Field label="یادداشت"><Input value={f.note ?? ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
    </div>
    {d.storeCfg.trade?.on && (d.storeCfg.trade.modules.imports || d.storeCfg.trade.modules.warehouse) && <div className="mt-3 grid gap-3 rounded-xl border border-brand/30 bg-brand-tint/20 p-3 sm:grid-cols-3"><p className="text-12 font-semibold sm:col-span-3">واردات رسمی (امور بازرگانی)</p>
      {d.storeCfg.trade.modules.imports && ([['ntsw', 'شمارهٔ ثبت سفارش (NTSW)', false], ['sata', 'کد رهگیری تأمین ارز', false], ['kotaj', 'شمارهٔ کوتاژ اظهارنامه', false], ['customsValue', 'ارزش گمرکی (تومان)', true], ['duties', 'حقوق ورودی (تومان)', true], ['customsVat', 'ارزش افزودهٔ گمرکی (تومان)', true]] as const).map(([k, l, num]) => <Field key={k} label={l}><Input className="ltr text-left" value={String((f.trade as Record<string, string | number> | undefined)?.[k] ?? '')} onChange={(e) => setF({ ...f, trade: { ...(f.trade ?? {}), [k]: num ? Number(e.target.value.replace(/\D/g, '')) || 0 : e.target.value } })} /></Field>)}
      {d.storeCfg.trade.modules.warehouse && <Field label="شناسهٔ رسید سامانهٔ جامع انبارها"><Input className="ltr text-left" value={f.trade?.nwms ?? ''} onChange={(e) => setF({ ...f, trade: { ...(f.trade ?? {}), nwms: e.target.value } })} /></Field>}
    </div>}
    <p className="mt-3 rounded-lg bg-neutral-bg px-3 py-2 text-11 text-t2">هزینهٔ حمل، گمرک و سایر به نسبت ارزش روی بهای هر کالا پخش می‌شود و بهای تمام‌شدهٔ لات‌ها با همین عدد ثبت می‌شود.</p>
  </Modal>
}

type Draft = { name: string; amazonUrl: string; source: string; brand: string; category: string; specs: string; photos: string[]; hasVar: boolean; variants: InVariant[]; qty: number; split: Record<string, number>; owner: string; unitCost: number; sellPrice: number }
const STEPS = ['لینک و نام', 'تنوع و تعداد', 'مالک و انبار', 'بها و قیمت', 'مرور و برچسب']
/** ورود گام‌به‌گام یک کالا */
function ItemWizard({ batch, edit, onClose }: { batch: InBatch; edit?: InItem; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const whs = s.warehouses.filter((w) => w.active); const landing = batch.landing ?? 'tehran'
  const [st, setSt] = useState(0)
  const [f, setF] = useState<Draft>(() => edit ? { name: edit.name, amazonUrl: edit.amazonUrl ?? '', source: edit.source ?? '', brand: edit.brand ?? '', category: edit.category ?? '', specs: edit.specs ?? '', photos: edit.photos ?? [], hasVar: !!edit.variants?.length, variants: edit.variants ?? [], qty: edit.qty, split: edit.split ?? { [landing]: edit.qty }, owner: edit.owner ?? 'gh', unitCost: edit.unitCost ?? 0, sellPrice: edit.sellPrice ?? 0 }
    : { name: '', amazonUrl: '', source: '', brand: '', category: '', specs: '', photos: [], hasVar: false, variants: [], qty: 1, split: { [landing]: 1 }, owner: batch.buyer ?? myParty(), unitCost: 0, sellPrice: 0 })
  const set = (p: Partial<Draft>) => setF({ ...f, ...p })
  const cats = useMemo(() => [...new Set(d.products.map((p) => p.category))].filter(Boolean), [d])
  const total = f.hasVar ? f.variants.reduce((a, v) => a + v.qty, 0) : f.qty
  const splitSum = (sp: Record<string, number>) => Object.values(sp).reduce((a, q) => a + (q || 0), 0)
  const splitOk = f.hasVar ? f.variants.every((v) => splitSum(v.split ?? {}) === v.qty) : splitSum(f.split) === f.qty
  const probe: InItem = { id: edit?.id ?? 'new', name: f.name, qty: total, owner: f.owner, code: edit?.code ?? `GH-P-${String(d.codeFormat.nextProduct).padStart(d.codeFormat.pDigits, '0')}`, variants: f.hasVar ? f.variants : undefined }
  const L = landed({ ...batch, items: [...batch.items.filter((x) => x.id !== edit?.id), { ...probe, unitCost: f.unitCost }] }, { ...probe, unitCost: f.unitCost })
  const ok = [f.name.trim().length >= 2, total > 0 && (!f.hasVar || f.variants.every((v) => v.label.trim() && v.qty > 0)), splitOk, true, true]
  const dupOf = f.name.trim().length > 3 ? d.products.find((p) => p.title.trim() === f.name.trim() || p.en?.toLowerCase().trim() === f.name.toLowerCase().trim()) : undefined
  const setVar = (i: number, p: Partial<InVariant>) => set({ variants: f.variants.map((v, k) => (k === i ? { ...v, ...p, split: p.qty !== undefined && Object.keys(v.split ?? {}).length <= 1 ? { [Object.keys(v.split ?? {})[0] ?? landing]: p.qty } : { ...(v.split ?? {}), ...(p.split ?? {}) } } : v)) })
  const addVar = (label = '') => set({ variants: [...f.variants, { id: `v${f.variants.length + 1}${Date.now().toString(36).slice(-2)}`, label, qty: 1, suffix: varSuffix(f.variants.length), split: { [landing]: 1 } }] })
  const allTo = (w: string) => f.hasVar ? set({ variants: f.variants.map((v) => ({ ...v, split: { [w]: v.qty } })) }) : set({ split: { [w]: f.qty } })
  const save = () => {
    const by = me(); const code = edit?.code ?? takeCode('product')
    const it: InItem = { ...(edit ?? {}), id: edit?.id ?? `ii${Date.now().toString(36)}`, name: f.name.trim(), amazonUrl: f.amazonUrl.trim() || undefined, source: f.source || undefined, brand: f.brand || undefined, category: f.category || undefined, specs: f.specs.trim() || undefined, photos: f.photos, owner: f.owner, code, unitCost: f.unitCost || undefined, sellPrice: f.sellPrice || undefined,
      variants: f.hasVar ? f.variants.map((v, i) => ({ ...v, suffix: v.suffix || varSuffix(i) })) : undefined, qty: total, split: f.hasVar ? undefined : f.split, by: edit?.by ?? by, at: edit?.at ?? new Date().toISOString() }
    mutate((x) => { const bb = x.incoming.find((q) => q.id === batch.id)!; const i = bb.items.findIndex((q) => q.id === it.id); if (i >= 0) bb.items[i] = it; else bb.items.push(it) }, { action: edit ? 'ویرایش کالای محموله' : 'افزودن کالا به محموله', target: `${batch.id} · ${it.name}`, after: `${total} عدد · مالک ${it.owner}` })
    toast(edit ? 'کالا به‌روز شد.' : `«${it.name}» با ${fa(total)} عدد و ${fa(it.variants?.length || 1)} برچسب اضافه شد.`); onClose()
  }
  return <Modal open onClose={onClose} wide title={edit ? `ویرایش «${edit.name}»` : `افزودن کالا به «${batch.title}»`} footer={<div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-12 text-t2">گام {fa(st + 1)} از {fa(STEPS.length)}</span><span className="flex-1" />
      {st > 0 && <Button variant="ghost" onClick={() => setSt(st - 1)}>قبلی</Button>}
      {st < STEPS.length - 1 ? <Button variant="primary" disabled={!ok[st]} onClick={() => setSt(st + 1)}>بعدی</Button> : <Button variant="primary" icon={<Check size={14} />} disabled={!ok.slice(0, 3).every(Boolean)} onClick={save}>{edit ? 'ذخیره' : 'افزودن به محموله'}</Button>}
    </div>}>
    <ol className="mb-4 grid grid-cols-5 gap-1.5">{STEPS.map((t, i) => <li key={t}><button type="button" disabled={i > st && !ok.slice(0, i).every(Boolean)} onClick={() => setSt(i)} className={cx('w-full rounded-lg border px-2 py-1.5 text-right text-11 disabled:opacity-50', i < st ? 'border-success/40 bg-success-bg text-success' : i === st ? 'border-brand bg-brand-tint font-semibold text-brand' : 'border-line text-t2')}><span className="tnum">{fa(i + 1)}.</span> {t}</button></li>)}</ol>
    {st === 0 && <div className="space-y-3">
      <Field label="لینک کالا (آمازون، نون، سایت رسمی یا هر جا)" help="نام و محل خرید از لینک خوانده می‌شود؛ بعداً تیم کاتالوگ صفحه را با همین لینک کامل می‌کند."><Input className="ltr text-left" value={f.amazonUrl} onChange={(e) => { const u = e.target.value; set({ amazonUrl: u, name: f.name || nameFromUrl(u), source: f.source || sourceFromUrl(u) }) }} placeholder="https://www.amazon.com/dp/..." /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام کالا" error={dupOf ? `«${dupOf.title}» در کاتالوگ هست؛ برای همان، صفحهٔ تازه نسازید` : undefined}><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً گوشی سامسونگ Galaxy A55" /></Field>
        <Field label="محل خرید"><Select value={f.source} onChange={(v) => set({ source: v })} options={[...BUY_SOURCES]} placeholder="انتخاب کنید" /></Field>
        <Field label="برند (اختیاری)"><Input value={f.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
        <Field label="دسته (اختیاری)"><Select value={f.category} onChange={(v) => set({ category: v })} options={cats} placeholder="انتخاب دسته" /></Field>
      </div>
      <Field label="مشخصات کوتاه (اختیاری)"><Textarea rows={2} value={f.specs} onChange={(e) => set({ specs: e.target.value })} placeholder="مثلاً ۸ گیگ رم، کارتن پلمب، نسخهٔ گلوبال" /></Field>
      <div><p className="mb-1.5 text-12 font-semibold">عکس از کالا (اختیاری، تا ۶ عکس)</p><div className="flex flex-wrap gap-2">{f.photos.map((ph, i) => <span key={i} className="relative"><img src={ph} alt="" className="size-20 rounded-lg object-cover" /><button type="button" aria-label="حذف عکس" onClick={() => set({ photos: f.photos.filter((_, k) => k !== i) })} className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-danger-solid text-white"><Trash2 size={11} /></button></span>)}
        {f.photos.length < 6 && <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-t2 hover:border-brand hover:text-brand"><ImagePlus size={20} /><input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={async (e) => { const files = [...(e.target.files ?? [])].slice(0, 6 - f.photos.length); const imgs = await Promise.all(files.map((fl) => fileToImage(fl))); set({ photos: [...f.photos, ...imgs] }); e.target.value = '' }} /></label>}</div></div>
    </div>}
    {st === 1 && <div className="space-y-3">
      <Segmented value={f.hasVar ? 'var' : 'one'} onChange={(v) => set({ hasVar: v === 'var', variants: v === 'var' && !f.variants.length ? [{ id: 'v1', label: '', qty: f.qty, suffix: 'V1', split: { [landing]: f.qty } }] : f.variants })} options={[['one', 'یک مدل'], ['var', 'چند تنوع (رنگ، حافظه، سایز)']]} />
      {!f.hasVar ? <Field label="تعداد"><Input type="number" min={1} className="ltr w-32 text-center" value={f.qty} onChange={(e) => { const q = Math.max(0, +e.target.value); set({ qty: q, split: Object.keys(f.split).length <= 1 ? { [Object.keys(f.split)[0] ?? landing]: q } : f.split }) }} /></Field> : <>
        <div className="space-y-2">{f.variants.map((v, i) => <div key={v.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-2">
          <Field label={`تنوع ${fa(i + 1)}`}><Input className="w-56" value={v.label} onChange={(e) => setVar(i, { label: e.target.value })} placeholder="مثلاً مشکی · ۱۲۸ گیگ" /></Field>
          <Field label="تعداد"><Input type="number" min={1} className="ltr w-24 text-center" value={v.qty} onChange={(e) => setVar(i, { qty: Math.max(0, +e.target.value) })} /></Field>
          <span className="pb-2 font-mono text-11 text-t3" dir="ltr">…-{v.suffix}</span>
          {f.variants.length > 1 && <button type="button" aria-label="حذف تنوع" className="mb-1 grid size-8 place-items-center rounded-md text-t3 hover:bg-danger-bg hover:text-danger" onClick={() => set({ variants: f.variants.filter((_, k) => k !== i) })}><Trash2 size={14} /></button>}
        </div>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><Button size="sm" icon={<Plus size={13} />} onClick={() => addVar()}>تنوع تازه</Button><span className="text-11 text-t2">پیشنهاد سریع:</span>{['مشکی', 'سفید', 'آبی', 'نقره‌ای', '۱۲۸ گیگ', '۲۵۶ گیگ', '۵۱۲ گیگ'].map((l) => <button key={l} type="button" className="rounded-full border border-line px-2 py-0.5 text-11 hover:border-brand hover:text-brand" onClick={() => addVar(l)}>{l}</button>)}</div>
      </>}
      <p className="text-12 text-t2">جمع: <b className="tnum text-t1">{fa(total)}</b> عدد</p>
    </div>}
    {st === 2 && <div className="space-y-3">
      <Field label="مالک این کالا (پول آن را چه کسی داده است)"><div className="flex flex-wrap gap-2">{s.parties.filter((p) => p.active).map((p) => <button key={p.id} type="button" aria-pressed={f.owner === p.id} onClick={() => set({ owner: p.id })} className={cx('flex h-11 items-center gap-2 rounded-xl border-2 px-3 text-13 font-semibold', f.owner === p.id ? 'text-white' : 'border-line')} style={f.owner === p.id ? { background: p.color, borderColor: p.color } : undefined}>{partyLogo(p) && <span className="grid size-7 place-items-center rounded-md bg-white"><img src={partyLogo(p)} alt="" className="size-5 object-contain" /></span>}{p.name}{p.brandName && ` (${p.brandName})`}<bdi dir="ltr" className="font-mono text-11 opacity-80">{p.prefix}</bdi></button>)}</div></Field>
      <div className="flex flex-wrap items-center gap-1.5 text-12"><span className="text-t2">همه به:</span>{whs.map((w) => <Button key={w.id} size="sm" variant="ghost" onClick={() => allTo(w.id)}>{w.name}</Button>)}</div>
      <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-12"><thead><tr className="bg-surface-2 text-t2"><th className="p-2 text-right font-medium">تنوع</th><th className="p-2 text-right font-medium">تعداد</th>{whs.map((w) => <th key={w.id} className="p-2 text-right font-medium">{w.name}</th>)}<th className="p-2 text-right font-medium">وضعیت</th></tr></thead><tbody>
        {(f.hasVar ? f.variants : [null]).map((v, i) => { const q = v ? v.qty : f.qty; const sp = v ? v.split ?? {} : f.split; const sum = splitSum(sp)
          return <tr key={v?.id ?? 'one'} className="border-t border-line"><td className="p-2">{v?.label || f.name}</td><td className="p-2 tnum">{fa(q)}</td>
            {whs.map((w) => <td key={w.id} className="p-1.5"><Input type="number" min={0} className="ltr w-20 text-center" value={sp[w.id] ?? 0} onChange={(e) => { const n = Math.max(0, +e.target.value); if (v) setVar(i, { split: { [w.id]: n } }); else set({ split: { ...f.split, [w.id]: n } }) }} /></td>)}
            <td className="p-2">{sum === q ? <span className="text-success">درست</span> : <span className="text-danger">{sum < q ? `${fa(q - sum)} عدد بی‌مقصد` : `${fa(sum - q)} عدد اضافه`}</span>}</td></tr> })}
      </tbody></table></div>
      <p className="text-11 text-t2">برچسب هر عدد مقصدش را هم نشان می‌دهد تا در {whName(s, landing)} هنگام تفکیک، با اسکن معلوم شود کدام بماند و کدام به انبار دیگر برود.</p>
    </div>}
    {st === 3 && <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`بهای خرید هر عدد (${batch.currency ?? 'تومان'})`}>{batch.currency && batch.currency !== 'تومان' ? <Input type="number" min={0} className="ltr text-left" value={f.unitCost} onChange={(e) => set({ unitCost: Math.max(0, +e.target.value) })} /> : <MoneyInput value={f.unitCost} onChange={(n) => set({ unitCost: n })} aria-label="بها" />}</Field>
        <Field label="قیمت پیشنهادی فروش (تومان)"><MoneyInput value={f.sellPrice} onChange={(n) => set({ sellPrice: n })} aria-label="قیمت فروش" /></Field>
        <div className="rounded-xl bg-neutral-bg p-3 text-12"><p className="text-t2">بهای تمام‌شدهٔ هر عدد</p><p className="text-16 font-bold">{toman(L.unit)}</p><p className="text-11 text-t3">{batch.currency && batch.currency !== 'تومان' ? `${fa(f.unitCost)} × ${fa(batch.rate ?? 0)}` : 'بها'} + سهم حمل و گمرک {toman(L.share)}</p></div>
      </div>
      {f.sellPrice > 0 && L.unit > 0 && <p className={cx('rounded-lg px-3 py-2 text-12', (pctMargin(f.sellPrice, L.unit) ?? 0) < 10 ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success')}>سود هر عدد {toman(f.sellPrice - L.unit)} · حاشیهٔ سود {fa(pctMargin(f.sellPrice, L.unit) ?? 0)}٪ · سود کل این قلم {toman((f.sellPrice - L.unit) * total)}</p>}
      <p className="text-11 text-t2">این قیمت‌ها هنگام ساخت صفحهٔ کالا خودکار در فرم کالا می‌نشینند و قابل ویرایش‌اند. قیمت نهایی را تیم قیمت‌گذاری تأیید می‌کند.</p>
    </div>}
    {st === 4 && <div className="space-y-3">
      <div className="grid gap-2 rounded-xl border border-line p-3 text-12 sm:grid-cols-2">
        <p><span className="text-t2">کالا:</span> <b>{f.name}</b></p><p><span className="text-t2">مالک:</span> <PartyChip s={s} id={f.owner} /></p>
        <p><span className="text-t2">تعداد:</span> {fa(total)} عدد{f.hasVar ? ` در ${fa(f.variants.length)} تنوع` : ''}</p><p><span className="text-t2">محل خرید:</span> {f.source || '—'}</p>
        <p><span className="text-t2">بهای تمام‌شده:</span> {toman(L.unit)}</p><p><span className="text-t2">قیمت پیشنهادی:</span> {f.sellPrice ? toman(f.sellPrice) : '—'}</p>
      </div>
      <p className="text-12 font-semibold">برچسب‌هایی که ساخته می‌شود</p>
      <div className="grid gap-2 sm:grid-cols-2">{(f.hasVar ? f.variants : [null]).map((v, i) => { const sp = v ? v.split ?? {} : f.split; return <div key={i} className="rounded-xl border border-line p-3"><div className="flex items-center justify-between gap-2"><PartyChip s={s} id={f.owner} /><span className="text-11 text-t2">{v?.label ?? 'یک مدل'} · ×{fa(v ? v.qty : f.qty)}</span></div><div className="mt-2 flex justify-center"><Barcode value={itemLabel(s, probe, v)} height={40} /></div><p className="mt-1 text-center text-11 text-t2">{Object.entries(sp).filter(([, q]) => q).map(([w, q]) => `${whName(s, w)}: ${fa(q)}`).join(' · ')}</p></div> })}</div>
      {!edit && <p className="text-11 text-t2">کد داخلی با ثبت رزرو می‌شود و بعد از ساخت صفحهٔ کالا هم همین می‌ماند؛ برچسب‌های چاپ‌شده تا آخر معتبرند.</p>}
    </div>}
  </Modal>
}

type Row = { key: string; name: string; variant: string; split: Record<string, number>; owner: string; unitCost: number; sellPrice: number; link: string; source: string; itemId?: string; variantId?: string }
/** ویرایش جدولی کل محموله؛ هر ردیف یک تنوع است و ردیف‌های هم‌نام یک کالا می‌شوند. از اکسل هم می‌شود چسباند */
function BatchGrid({ batch, onClose }: { batch: InBatch; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const whs = s.warehouses.filter((w) => w.active); const landing = batch.landing ?? 'tehran'
  const toRows = (): Row[] => batch.items.flatMap((it) => (it.variants?.length ? it.variants : [null]).map((v) => ({ key: `${it.id}|${v?.id ?? ''}`, name: it.name, variant: v?.label ?? '', split: { ...(v ? v.split ?? {} : it.split ?? {}) }, owner: it.owner ?? 'gh', unitCost: it.unitCost ?? 0, sellPrice: it.sellPrice ?? 0, link: it.amazonUrl ?? '', source: it.source ?? '', itemId: it.id, variantId: v?.id })))
  const blank = (o = batch.buyer ?? 'gh'): Row => ({ key: `n${Math.random().toString(36).slice(2, 7)}`, name: '', variant: '', split: { [landing]: 1 }, owner: o, unitCost: 0, sellPrice: 0, link: '', source: '' })
  const [rows, setRows] = useState<Row[]>(() => { const r = toRows(); return r.length ? r : [blank(), blank(), blank()] }); const [paste, setPaste] = useState<string | null>(null)
  const set = (i: number, p: Partial<Row>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const qtyOf = (r: Row) => Object.values(r.split).reduce((a, q) => a + (q || 0), 0)
  const filled = rows.filter((r) => r.name.trim() && qtyOf(r) > 0)
  const parse = (t: string) => { const n = (v?: string) => +String(v ?? '').replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[^\d.]/g, '') || 0
    return t.split(/\r?\n/).map((l) => l.split('\t').map((c) => c.trim())).filter((c) => c[0] && !/^(نام|name)/i.test(c[0])).map((c): Row => { const own = s.parties.find((p) => p.prefix.toUpperCase() === (c[4] ?? '').toUpperCase() || p.name === c[4])?.id ?? batch.buyer ?? 'gh'
      const sp: Record<string, number> = {}; whs.forEach((w, i) => { const q = n(c[2 + i]); if (q) sp[w.id] = q }); return { ...blank(own), name: c[0], variant: c[1] ?? '', split: Object.keys(sp).length ? sp : { [landing]: 1 }, unitCost: n(c[5]), sellPrice: n(c[6]), link: (c[7] ?? '').startsWith('http') ? c[7] : '', source: c[8] ?? '' } }) }
  const save = () => {
    const groups = new Map<string, Row[]>(); filled.forEach((r) => { const k = `${r.name.trim()}|${r.owner}|${r.link}`; groups.set(k, [...(groups.get(k) ?? []), r]) })
    const items: InItem[] = [...groups.values()].map((G) => { const r0 = G[0]; const old = batch.items.find((it) => it.id === r0.itemId); const hasVar = G.length > 1 || !!G[0].variant.trim()
      const variants = hasVar ? G.map((r, i) => { const ov = old?.variants?.find((v) => v.id === r.variantId); return { id: ov?.id ?? `v${i + 1}${Math.random().toString(36).slice(2, 4)}`, label: r.variant.trim() || `تنوع ${i + 1}`, qty: qtyOf(r), suffix: ov?.suffix ?? varSuffix((old?.variants?.length ?? 0) + i), split: r.split } }) : undefined
      return { ...(old ?? {}), id: old?.id ?? `ii${Math.random().toString(36).slice(2, 8)}`, name: r0.name.trim(), owner: r0.owner, unitCost: r0.unitCost || undefined, sellPrice: r0.sellPrice || undefined, amazonUrl: r0.link || undefined, source: r0.source || old?.source, code: old?.code ?? '', variants, qty: variants ? variants.reduce((a, v) => a + v.qty, 0) : qtyOf(r0), split: variants ? undefined : r0.split, by: old?.by ?? me(), at: old?.at ?? new Date().toISOString() } })
    items.forEach((it) => { if (!it.code) it.code = takeCode('product') })
    mutate((x) => { x.incoming.find((q) => q.id === batch.id)!.items = items }, { action: 'ویرایش جدولی محموله', target: batch.id, after: `${items.length} قلم · ${items.reduce((a, it) => a + itemQty(it), 0)} عدد` })
    toast(`${fa(items.length)} کالا با ${fa(items.reduce((a, it) => a + itemQty(it), 0))} عدد ذخیره شد؛ برچسب‌ها آماده‌اند.`); onClose()
  }
  return <Modal open onClose={onClose} wide title={`ویرایش جدولی «${batch.title}»`} footer={<><Button variant="primary" disabled={!filled.length} onClick={save}>ذخیرهٔ {fa(filled.length)} ردیف</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <p className="mb-2 text-12 text-t2">هر ردیف یک تنوع است؛ ردیف‌هایی که نام، مالک و لینک یکسان دارند یک کالا با چند تنوع می‌شوند. ستون انبارها تعداد هر مقصد است و جمعشان تعداد آن تنوع.</p>
    <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[1180px] text-12"><thead><tr className="bg-surface-2 text-t2">{['نام کالا', 'تنوع', ...whs.map((w) => w.name), 'مالک', `بها (${batch.currency ?? 'تومان'})`, 'قیمت فروش', 'لینک', 'محل خرید', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {rows.map((r, i) => <tr key={r.key} className="border-t border-line">
        <td className="p-1"><Input className="w-52" value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="نام کالا" /></td>
        <td className="p-1"><Input className="w-32" value={r.variant} onChange={(e) => set(i, { variant: e.target.value })} placeholder="مشکی، ۱۲۸ گیگ" /></td>
        {whs.map((w) => <td key={w.id} className="p-1"><Input type="number" min={0} className="ltr w-16 text-center" value={r.split[w.id] ?? 0} onChange={(e) => set(i, { split: { ...r.split, [w.id]: Math.max(0, +e.target.value) } })} /></td>)}
        <td className="p-1"><Select className="w-28" value={r.owner} onChange={(v) => set(i, { owner: v })} options={s.parties.filter((p) => p.active).map((p) => [p.id, `${p.prefix} · ${p.name}`] as [string, string])} other={false} /></td>
        <td className="p-1"><Input type="number" min={0} className="ltr w-24 text-left" value={r.unitCost} onChange={(e) => set(i, { unitCost: Math.max(0, +e.target.value) })} /></td>
        <td className="p-1"><Input type="number" min={0} className="ltr w-28 text-left" value={r.sellPrice} onChange={(e) => set(i, { sellPrice: Math.max(0, +e.target.value) })} /></td>
        <td className="p-1"><Input className="ltr w-40 text-left" value={r.link} onChange={(e) => set(i, { link: e.target.value, name: r.name || nameFromUrl(e.target.value), source: r.source || sourceFromUrl(e.target.value) })} placeholder="https://" /></td>
        <td className="p-1"><Input className="w-28" value={r.source} onChange={(e) => set(i, { source: e.target.value })} placeholder="آمازون، بازار…" /></td>
        <td className="p-1"><span className="flex gap-0.5"><button type="button" aria-label="تکرار ردیف برای تنوع دیگر" title="تنوع دیگر همین کالا" className="grid size-8 place-items-center rounded-md text-t3 hover:bg-brand-tint hover:text-brand" onClick={() => setRows([...rows.slice(0, i + 1), { ...r, key: `n${Math.random().toString(36).slice(2, 7)}`, variant: '', itemId: r.itemId, variantId: undefined }, ...rows.slice(i + 1)])}><Wand2 size={14} /></button><button type="button" aria-label="حذف ردیف" className="grid size-8 place-items-center rounded-md text-t3 hover:bg-danger-bg hover:text-danger" onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={14} /></button></span></td>
      </tr>)}
    </tbody></table></div>
    <div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" icon={<Plus size={13} />} onClick={() => setRows([...rows, blank()])}>ردیف تازه</Button><Button size="sm" onClick={() => setRows([...rows, ...Array.from({ length: 10 }, () => blank())])}>۱۰ ردیف</Button><Button size="sm" icon={<FileSpreadsheet size={13} />} onClick={() => setPaste(paste === null ? '' : null)}>چسباندن از اکسل</Button><span className="mr-auto text-12 text-t2">{fa(filled.length)} ردیف · {fa(filled.reduce((a, r) => a + qtyOf(r), 0))} عدد</span></div>
    {paste !== null && <div className="mt-2 space-y-2 rounded-xl border border-dashed border-line p-3"><p className="text-12 text-t2">ترتیب ستون‌ها: نام، تنوع، {whs.map((w) => w.name).join('، ')}، مالک (پیشوند مثل GH یا YS)، بها، قیمت فروش، لینک، محل خرید.</p><Textarea rows={5} className="font-mono text-12" value={paste} onChange={(e) => setPaste(e.target.value)} /><Button size="sm" variant="primary" disabled={!paste.trim()} onClick={() => { const add = parse(paste); setRows([...rows.filter((r) => r.name.trim()), ...add]); setPaste(null); toast(`${fa(add.length)} ردیف اضافه شد.`) }}>افزودن به جدول</Button></div>}
  </Modal>
}

/** رسید محموله در انبار ورودی، تنوع به تنوع؛ با ثبت، موجودی به نام مالک ثبت و برای سهم انبارهای دیگر حواله ساخته می‌شود */
function LandModal({ batch, onClose }: { batch: InBatch; onClose: (made?: string[]) => void }) {
  const d = useDB(); const s = d.stock; const at = batch.landing ?? 'tehran'
  const lines = batch.items.flatMap((it) => (it.variants?.length ? it.variants : [null]).map((v) => ({ key: `${it.id}|${v?.id ?? ''}`, it, v, qty: v ? v.qty : it.qty, split: v ? v.split ?? {} : it.split ?? {} })))
  const [got, setGot] = useState<Record<string, number>>(() => Object.fromEntries(lines.map((l) => [l.key, l.qty])))
  const others = lines.reduce((a, l) => a + Object.entries(l.split).filter(([w]) => w !== at).reduce((x, [, q]) => x + (q || 0), 0), 0)
  const go = () => { let made: string[] = []; const by = me()
    mutate((x) => { made = landBatch(x, batch.id, got, by) }, { action: 'رسید محموله در انبار ورودی', target: `${batch.id} · ${whName(s, at)}`, after: `${Object.values(got).reduce((a, q) => a + q, 0)} عدد · ${made.length} حواله` })
    notify('محموله رسید', `${batch.title} در ${whName(s, at)} رسید شد${made.length ? `؛ ${fa(made.length)} حواله برای انبارهای دیگر ساخته شد` : ''}. صفحه‌های کالا در صف ساخت منتظرند.`, '/admin/inbound?tab=queue', 'عملیات', 'info')
    toast(`رسید ثبت شد؛ موجودی به نام مالک‌ها در ${whName(s, at)} نشست${made.length ? ` و ${fa(made.length)} حواله آمادهٔ جمع‌آوری با اسکن است` : ''}.`); onClose(made) }
  return <Modal open onClose={() => onClose()} wide title={`رسید «${batch.title}» در ${whName(s, at)}`} footer={<><Button variant="primary" icon={<PackageCheck size={14} />} onClick={go}>ثبت رسید{others ? ' و ساخت حواله' : ''}</Button><Button variant="ghost" onClick={() => onClose()}>انصراف</Button></>}>
    <p className="mb-3 text-12 text-t2">تعداد واقعی رسیده را برای هر تنوع وارد کنید. موجودی همه در {whName(s, at)} و به نام مالک همان کالا ثبت می‌شود؛ کالاهایی که سهم انبار دیگری دارند در حوالهٔ «{whName(s, at)} ← مقصد» قرار می‌گیرند تا با اسکن جمع و فرستاده شوند.</p>
    <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-12"><thead><tr className="bg-surface-2 text-t2">{['کالا و تنوع', 'مالک', 'سفارش', 'رسیده', 'سهم انبارها'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {lines.map((l) => <tr key={l.key} className="border-t border-line"><td className="p-2"><b>{l.it.name}</b>{l.v && <span className="text-t2"> · {l.v.label}</span>}<bdi dir="ltr" className="block font-mono text-11 text-t3">{itemLabel(s, l.it, l.v)}</bdi></td><td className="p-2"><PartyChip s={s} id={l.it.owner ?? 'gh'} /></td><td className="p-2 tnum">{fa(l.qty)}</td>
        <td className="p-2"><Input type="number" min={0} className={cx('ltr w-20 text-center', got[l.key] !== l.qty && 'border-warning')} value={got[l.key] ?? 0} onChange={(e) => setGot({ ...got, [l.key]: Math.max(0, +e.target.value) })} /></td>
        <td className="p-2 text-11">{Object.entries(l.split).filter(([, q]) => q).map(([w, q]) => <span key={w} className={cx('mr-1 inline-block rounded-full px-2 py-0.5', w === at ? 'bg-neutral-bg' : 'bg-brand-tint text-brand')}>{whName(s, w)} {fa(q)}{w !== at && <Truck size={10} className="mr-0.5 inline" />}</span>)}</td></tr>)}
    </tbody></table></div>
  </Modal>
}

/** برگهٔ چاپ برچسب‌ها: هر عدد یک برچسب، گروه‌بندی بر اساس مقصد تا تفکیک راحت باشد */
function LabelSheet({ batch, onClose }: { batch: InBatch; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const ref = useRef<HTMLDivElement>(null)
  const groups = new Map<string, { it: InItem; v: InVariant | null }[]>()
  batch.items.forEach((it) => (it.variants?.length ? it.variants : [null]).forEach((v) => { const sp = v ? v.split ?? {} : it.split ?? {}; Object.entries(sp).forEach(([w, q]) => { for (let i = 0; i < (q || 0); i++) groups.set(w, [...(groups.get(w) ?? []), { it, v }]) }) }))
  const count = [...groups.values()].reduce((a, g) => a + g.length, 0)
  return <Modal open onClose={onClose} wide title={`برچسب‌های «${batch.title}» · ${fa(count)} برچسب`} footer={<><Button variant="primary" icon={<Printer size={14} />} onClick={() => printSolo(ref.current)}>چاپ</Button><Button variant="ghost" onClick={onClose}>بستن</Button></>}>
    <div ref={ref} className="space-y-4">{[...groups].map(([w, L]) => <section key={w}><h3 className="mb-2 text-13 font-bold">مقصد: {whName(s, w)} · {fa(L.length)} عدد</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{L.map(({ it, v }, i) => { const o = s.parties.find((p) => p.id === (it.owner ?? 'gh')); return <div key={i} className="break-inside-avoid rounded-lg border-2 p-2 text-center" style={{ borderColor: o?.color ?? '#999' }}>
        <div className="flex items-center justify-between text-[10px]"><b style={{ color: o?.color }}>{o?.brandName ?? o?.name}</b><span>→ {whName(s, w)}</span></div>
        <Barcode value={itemLabel(s, it, v)} height={34} module={1.6} />
        <p className="truncate text-[10px]">{it.name}{v ? ` · ${v.label}` : ''}</p></div> })}</div></section>)}</div>
  </Modal>
}

export { mid }
