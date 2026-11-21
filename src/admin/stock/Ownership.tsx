import { useMemo, useState } from 'react'
import { MoneyInput } from '@/shared/ui/money'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Undo2, ArrowLeftRight, Sparkles, Barcode as BarcodeIcon, Building2, HandCoins, Info, PackagePlus, Plus, Printer, ReceiptText, ScanLine, Trash2, Users, Warehouse } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { Barcode } from '@/shared/ui/codes'
import { can, canSecret, currentUser, getDB, myParty, mutate, notify, takeCode, useDB } from '@/shared/lib/store'
import { fa, num, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { balances, labelCode, shareOf, split, type OwnerReturn, type StockSale } from '@/shared/data/stock'
import { chName, codeFor, ownersAt, PartyChip, partyName, pv, productsWithLots, syncQty, takeLots, whName } from './common'
import { useTab } from '../pages/_shared'
import { payoutBetween } from '@/shared/data/payout'
import { PartyManager } from './Parties'
import { PerformanceTab, StatementTab } from './Statement'
import { ExtTab } from './ExtSites'
import { ProductLedgerTab } from './ProductLedger'
import { StockDesk } from './StockDesk'

const uid = (p: string) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`
const by = () => currentUser()?.name ?? 'پنل'

/** مالکیت، محل و تسویهٔ موجودی میان غنیمت و شرکا */
export function Ownership() {
  const d = useDB(); const s = d.stock; const [tab, setTab] = useTab('stock'); const nav = useNavigate()
  const sec = canSecret(); const me = myParty()
  const bal = balances(s).filter((b) => Math.abs(b.net) > 0 && (sec || b.a === me || b.b === me))
  const units = (o: string) => s.lots.filter((l) => l.owner === o).reduce((a, l) => a + l.qty, 0)
  const value = (o: string) => s.lots.filter((l) => l.owner === o).reduce((a, l) => a + l.qty * l.cost, 0)
  return (
    <Page module="ownership" title="شرکا و تسویه" sub="شرکا، موجودی هر کدام، فروش و سهم‌ها، تسویه، و سایت‌های متصل در یک جا"
      primary={sec ? <Button variant="primary" icon={<Plus size={14} />} onClick={() => setTab('setup')}>شریک تازه</Button> : undefined}
      actions={<>{can('team') && <Button variant="ghost" icon={<ReceiptText size={14} />} onClick={() => nav('/admin/team?tab=audit')}>لاگ فعالیت‌ها</Button>}<Button variant="ghost" icon={<Warehouse size={14} />} onClick={() => nav('/admin/warehouse')}>انبار و موجودی</Button></>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'موجودی به تفکیک مالک' }, { id: 'sales', label: 'فروش و سهم‌ها', count: s.sales.length }, { id: 'settle', label: 'تسویه', count: bal.length || undefined }, { id: 'statement', label: 'صورت‌حساب من' }, { id: 'ledger', label: 'گردش کالا' }, { id: 'perf', label: 'عملکرد' }, { id: 'ext', label: 'سایت‌های متصل (API)', count: s.ext.filter((e) => e.inbox.some((o) => o.status === 'new' || o.status === 'unmatched')).length || undefined }, { id: 'codes', label: 'کدگذاری و بارکد' }, { id: 'setup', label: 'شرکا و قرارداد' }]} />}>
      {/* کارت هر شریک: موجودی، ارزش، مانده با دیگران و وضعیت سایت؛ هر بخش کارت به تب مربوط می‌رود */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {s.parties.filter((p) => p.active && (sec || p.id === me)).map((p) => { const e = s.ext.find((x) => x.partyId === p.id); const owe = bal.filter((b) => b.a === p.id || b.b === p.id); const whs = s.warehouses.filter((w) => w.operator === p.id && w.active)
          return <div key={p.id} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4" style={{ borderTop: `3px solid ${p.color}` }}>
            <div className="flex items-center gap-2"><PartyChip s={s} id={p.id} /><span className="text-11 text-t2">{p.kind === 'self' ? 'خودمان' : 'شریک'}{p.city ? ` · ${p.city}` : ''}</span></div>
            <button type="button" onClick={() => setTab('stock')} className="text-right"><b className="text-20">{fa(units(p.id))}</b> <span className="text-12 text-t2">عدد موجود</span><span className="block text-12 text-t2">ارزش {toman(value(p.id))}{whs.length ? ` · ${whs.map((w) => w.name).join('، ')}` : ''}</span></button>
            <button type="button" onClick={() => setTab('settle')} className="text-right text-12">{owe.length ? owe.map((b) => { const debtor = b.net > 0 ? b.a : b.b; return <span key={b.a + b.b} className="block">{debtor === p.id ? 'بدهکار به' : 'طلبکار از'} <b>{partyName(s, debtor === p.id ? (b.net > 0 ? b.b : b.a) : debtor)}</b> <b className={debtor === p.id ? 'text-warning' : 'text-success'}>{toman(Math.abs(b.net))}</b></span> }) : <span className="text-success">تسویه است</span>}</button>
            {p.kind !== 'self' && <button type="button" onClick={() => setTab('ext')} className="mt-auto flex items-center gap-1.5 rounded-lg bg-neutral-bg px-2.5 py-1.5 text-right text-11">{e ? <><span className={`size-2 rounded-full ${e.paused ? 'bg-danger-solid' : e.on ? 'bg-success-solid' : 'bg-t3'}`} /><bdi dir="ltr" className="truncate font-mono">{e.url.replace(/^https?:\/\//, '')}</bdi><span className="mr-auto text-t2">{e.kind === 'custom' ? 'API' : 'ووکامرس'}</span></> : <><span className="size-2 rounded-full bg-line" /><span className="text-t2">سایت متصل ندارد</span><span className="mr-auto font-semibold text-brand">اتصال</span></>}</button>}
          </div> })}
      </div>
      {tab === 'stock' && <StockTab />}
      {tab === 'sales' && <SalesTab />}
      {tab === 'statement' && <StatementTab />}
      {tab === 'settle' && <SettleTab />}
      {tab === 'ledger' && <ProductLedgerTab />}
      {tab === 'perf' && <PerformanceTab />}
      {tab === 'ext' && <ExtTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'setup' && <SetupTab />}
    </Page>
  )
}

/* ───────── موجودی ───────── */
function StockTab() {
  const d = useDB(); const s = d.stock; const [sp] = useSearchParams(); const [intake, setIntake] = useState(sp.get('intake') === '1'); const [move, setMove] = useState(false); const [ret, setRet] = useState<{ lotId?: string } | null>(null)
  const whs = s.warehouses.filter((w) => w.active)
  const rows = productsWithLots(d).flatMap((p) => (p.variations?.length ? p.variations.map((v) => ({ p, vid: v.id })) : [{ p, vid: undefined as string | undefined }])).filter((r) => s.lots.some((l) => l.productId === r.p.id && (l.variationId ?? '') === (r.vid ?? '')))
  return (
    <div className="space-y-4">
      <StockDesk onIntake={() => setIntake(true)} />
      <ExpiryAlerts onReturn={(pre) => setRet(pre)} />
      <Card title="ورودها و لات‌های موجودی" pad={false} defaultOpen={false}>
        <DataTable name="لات‌های موجودی" empty={{ title: 'لاتی ثبت نشده است' }} rows={[...s.lots].sort((a, b) => +new Date(b.at) - +new Date(a.at))} rowKey={(l) => l.id} search={(l) => `${l.id} ${pv(d, l.productId, l.variationId).full} ${partyName(s, l.owner)} ${l.ref ?? ''}`}
          cols={[{ key: 'id', title: 'شناسه', render: (l) => <span className="font-mono text-12">{l.id}</span> }, { key: 'p', title: 'کالا', render: (l) => pv(d, l.productId, l.variationId).full }, { key: 'o', title: 'مالک', render: (l) => <PartyChip s={s} id={l.owner} /> }, { key: 'w', title: 'انبار', render: (l) => whName(s, l.warehouse) }, { key: 'q', title: 'مانده', render: (l) => fa(l.qty), sort: (l) => l.qty }, { key: 'c', title: 'بهای تمام‌شدهٔ هر عدد (تومان)', render: (l) => (canSecret() || l.owner === myParty() ? toman(l.cost) : <span className="text-t3">محرمانه</span>), sort: (l) => l.cost }, { key: 'code', title: 'کد برچسب', render: (l) => <bdi dir="ltr" className="font-mono text-12">{codeFor(d, l.owner, l.productId, l.variationId)}</bdi> }, { key: 'ex', title: 'انقضا و سری', render: (l) => l.expiry ? <span className="text-12">{expBadge(l.expiry)}{l.batch && <bdi dir="ltr" className="mr-1 font-mono text-t2">{l.batch}</bdi>}</span> : <span className="text-t3">—</span>, sort: (l) => (l.expiry ? +new Date(l.expiry) : Infinity) }, { key: 'r', title: 'منشأ', render: (l) => <span className="text-12 text-t2">{l.ref ?? '—'} · {rel(l.at)}</span> }]} />
      </Card>
      <IntakeModal open={intake} onClose={() => setIntake(false)} />
      <MoveModal open={move} onClose={() => setMove(false)} />
      <OwnerReturnModal pre={ret} onClose={() => setRet(null)} />
      <OwnerReturns />
    </div>
  )
}

function ProductPicker({ pid, vid, onChange }: { pid: string; vid: string; onChange: (pid: string, vid: string) => void }) {
  const d = useDB(); const seen = new Set<string>(); const list = d.products.filter((p) => p.mode !== 'serial' && !seen.has(p.id) && !!seen.add(p.id))
  const p = list.find((x) => x.id === pid)
  return <div className="grid gap-3 sm:grid-cols-2"><Field label="کالا"><Select value={pid} onChange={(v) => onChange(v, list.find((x) => x.id === v)?.variations?.[0]?.id ?? '')} options={list.map((x) => [x.id, x.title] as [string, string])} /></Field>
    {p?.variations?.length ? <Field label="تنوع (رنگ و ویژگی)"><Select value={vid} onChange={(v) => onChange(pid, v)} options={p.variations.map((v) => [v.id, pv(d, p.id, v.id).vname] as [string, string])} /></Field> : <div />}</div>
}

type NewRow = { title: string; specs: string; category: string; qty: number; cost: number; price: number }
const emptyRow = (category = ''): NewRow => ({ title: '', specs: '', category, qty: 1, cost: 0, price: 0 })
const normT = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()
/** متن چسبانده‌شده از اکسل یا گوگل‌شیت: نام، مشخصات، دسته، تعداد، بهای هر عدد، قیمت پیشنهادی */
function parsePaste(txt: string, cats: string[], fallbackCat: string): NewRow[] {
  const n = (v?: string) => +String(v ?? '').replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[^\d.]/g, '') || 0
  return txt.split(/\r?\n/).map((l) => l.split(/\t|;|,(?=\s*[\d۰-۹])/).map((c) => c.trim())).filter((c) => c[0] && !/^(نام|title)/i.test(c[0]))
    .map((c) => ({ title: c[0], specs: c[1] ?? '', category: cats.find((x) => x === c[2]) ?? fallbackCat, qty: Math.max(1, n(c[3]) || 1), cost: n(c[4]), price: n(c[5]) }))
}

function IntakeModal({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { pid: string; vid?: string } }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const me = myParty()
  const [f, setF] = useState({ pid: preset?.pid ?? 'prx', vid: preset?.vid ?? 'var-prx-blk', owner: me, wh: s.warehouses.find((w) => w.operator === me && w.active)?.id ?? 'tehran', qty: 1, cost: 0, ref: '', expiry: '', batch: '', irc: '' })
  const [src, setSrc] = useState<'cat' | 'new'>('cat')
  const cats = useMemo(() => [...new Set([...((d.entities?.categories as unknown as { name: string }[]) ?? []).map((c) => c.name), ...d.products.map((p) => p.category)])].filter(Boolean), [d])
  const [rows, setRows] = useState<NewRow[]>([emptyRow()]); const [paste, setPaste] = useState<string | null>(null); const [dated, setDated] = useState(false); const [note, setNote] = useState('')
  const isNew = src === 'new'
  const known = useMemo(() => new Map(d.products.map((p) => [normT(p.title), p] as const)), [d])
  const rowErr = (r: NewRow, i: number) => !r.title.trim() ? '' : r.title.trim().length < 3 ? 'نام کوتاه است' : known.get(normT(r.title)) ? 'در کاتالوگ هست' : rows.findIndex((x) => normT(x.title) === normT(r.title)) !== i ? 'تکراری در همین فهرست' : !r.category ? 'دسته' : r.qty < 1 ? 'تعداد' : r.cost <= 0 ? 'بها' : ''
  const filled = rows.filter((r) => r.title.trim())
  const rowsOk = filled.length > 0 && filled.every((r) => !rowErr(r, rows.indexOf(r)))
  const prod = isNew ? undefined : d.products.find((x) => x.id === f.pid); const needs = !isNew && !!prod?.needsExpiry; const minShelf = s.parties.find((p) => p.id === f.owner)?.payout?.minShelfDays ?? 0
  const shelfDays = f.expiry ? Math.round((+new Date(f.expiry) - Date.now()) / 864e5) : null
  const fmt = d.codeFormat; const codeAt = (k: number) => `${fmt.product}${String(fmt.nextProduct + k).padStart(fmt.pDigits, '0')}`
  const ok = isNew ? rowsOk : f.qty > 0 && f.cost > 0 && (!needs || (!!f.expiry && !!f.batch.trim() && !!(prod?.irc || f.irc.trim())))
  const setRow = (i: number, p: Partial<NewRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const saveNew = () => {
    const batchId = uid('NB'); const at = new Date().toISOString(); const who = by(); const owner = f.owner
    /** اسکلت خالی: ساختار کالای نمونه بدون هیچ محتوای آن (بارکد، مدل، مشخصات، توضیح، ویدیو، گارانتی) */
    const base = (() => { const b = structuredClone(getDB().products[0]) as Record<string, unknown>; ['ean', 'model', 'specs', 'keyFeatures', 'long', 'box', 'pros', 'cons', 'metaTitle', 'metaDesc', 'slug', 'video', 'warrantyType', 'warrantyMonths', 'warrantyTerms', 'supplier', 'costFx', 'rate', 'currency', 'extraCost', 'discount', 'weight', 'dims', 'source', 'condition', 'grade', 'irc', 'saleFrom', 'saleUntil'].forEach((k) => delete b[k]); const pd = b.pdp as Record<string, unknown> | undefined; if (pd) b.pdp = { ...pd, videos: [], flaws: [], variantGroup: '', variantLabel: '', variant: undefined, amazonUrl: undefined, featured: false, covered: '', notCovered: '', cardLines: undefined }; return b as unknown as ReturnType<typeof getDB>['products'][number] })(); const made: { pid: string; code: string; r: NewRow }[] = []
    filled.forEach((r, k) => made.push({ pid: `p${Date.now().toString(36)}${k}`, code: takeCode('product'), r }))
    mutate((x) => {
      made.forEach(({ pid, code, r }) => {
        const title = r.title.trim()
        x.products.unshift({ ...structuredClone(base), id: pid, code, title, en: title, torob: false, brand: 'بدون برند', category: r.category, subCats: [], kind: 'simple', attrs: [], variations: undefined, defaultVar: undefined, mode: 'qty', qty: { tehran: 0, mahabad: 0 }, priceNew: r.price, price: undefined, compareAt: undefined, cost: r.cost, status: 'product.draft', image: '', images: [], short: r.specs.trim(), views: 0, cvr: 0, reviews: 0, rating: 0, health: 15, featured: false, comingSoon: undefined, incoming: undefined, owner: owner === 'gh' ? undefined : owner, partner: owner !== 'gh' || undefined, needsExpiry: dated || undefined, exclusive: { owner, at, by: who, note: note.trim() || undefined, specs: r.specs.trim() || undefined, warehouse: f.wh, batchId } } as typeof base)
        x.stock.lots.unshift({ id: uid('L') + made.findIndex((m) => m.pid === pid), productId: pid, owner, warehouse: f.wh, qty: r.qty, qty0: r.qty, cost: r.cost, at, ref: f.ref || `ورود کالای تازه توسط ${who}` })
        syncQty(x, pid)
      })
    }, { action: 'ورود گروهی کالای تازه (هنوز در سایت نیست)', target: `${fa(made.length)} کالا · ${partyName(s, owner)} · ${whName(s, f.wh)}`, after: `${made[0].code} تا ${made[made.length - 1].code} · پیش‌نویس در صف تکمیل` })
    notify('کالای تازه در صف تکمیل', `${who} ${fa(made.length)} کالای تازه (${fa(filled.reduce((a, r) => a + r.qty, 0))} عدد) به نام ${partyName(s, owner)} در ${whName(s, f.wh)} وارد کرد. عکس، مشخصات و صفحهٔ کالا را کامل و منتشر کنید.`, '/admin/catalog?tab=fill', 'کاتالوگ', 'warning')
    toast(`${fa(made.length)} کالای تازه با کد ${made[0].code}${made.length > 1 ? ` تا ${made[made.length - 1].code}` : ''} ساخته و موجودی‌اش ثبت شد؛ در «کاتالوگ ← صف تکمیل کالای تازه» منتظر اطلاعات و انتشار است.`)
    setRows([emptyRow()]); setNote(''); setDated(false); setSrc('cat'); onClose()
  }
  const save = () => { mutate((x) => { x.stock.lots.unshift({ id: uid('L'), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh, qty: f.qty, qty0: f.qty, cost: f.cost, at: new Date().toISOString(), ref: f.ref || `ورود توسط ${by()}`, expiry: f.expiry || undefined, batch: f.batch.trim() || undefined }); if (f.irc.trim()) { const q = x.products.find((y) => y.id === f.pid); if (q) q.irc = f.irc.trim() } syncQty(x, f.pid) }, { action: 'ورود موجودی با مالک مشخص', target: `${pv(d, f.pid, f.vid).full} · ${partyName(s, f.owner)} · ${whName(s, f.wh)}` }); toast(`${fa(f.qty)} عدد به نام ${partyName(s, f.owner)} در ${whName(s, f.wh)} ثبت شد.`); onClose() }
  const shared = <div className="grid gap-3 sm:grid-cols-2"><Field label="مالک (تأمین‌کننده)" help="کسی که پول این کالا را داده است"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.filter((p) => p.active).map((p) => [p.id, `${p.name} (${p.prefix})`] as [string, string])} /></Field><Field label="انبار محل نگهداری"><Select value={f.wh} onChange={(v) => setF({ ...f, wh: v })} options={s.warehouses.filter((w) => w.active).map((w) => [w.id, w.name] as [string, string])} /></Field></div>
  const total = filled.reduce((a, r) => a + r.qty, 0)
  return <Modal open={open} onClose={onClose} title="ورود موجودی با مالک مشخص" wide footer={<><Button onClick={onClose}>انصراف</Button>{isNew ? <Button variant="primary" disabled={!ok} onClick={saveNew}>{filled.length ? `ساخت ${fa(filled.length)} کالا و ثبت ${fa(total)} عدد` : 'ساخت کالا و ثبت ورود'}</Button> : <Button variant="primary" disabled={!ok} onClick={save}>ثبت ورود</Button>}</>}>
    <div className="space-y-3">
      <Segmented value={src} onChange={(v) => setSrc(v as 'cat' | 'new')} options={[['cat', 'کالای موجود در کاتالوگ'], ['new', 'کالای تازه، یکی یا گروهی']]} />
      {isNew ? <>
        <p className="flex items-start gap-1.5 rounded-lg bg-info-bg px-3 py-2 text-12 text-info"><Sparkles size={14} className="mt-0.5 shrink-0" />برای کالاهایی که در کاتالوگ غنیمت نیستند؛ فقط نام، مشخصات کوتاه، تعداد و بها کافی است. هر کالا کد داخلی خودکار می‌گیرد، موجودی‌اش همان لحظه به نام مالک ثبت می‌شود و به‌صورت پیش‌نویس (دیده‌نشدنی در سایت) به «کاتالوگ ← صف تکمیل کالای تازه» می‌رود تا تیم کاتالوگ عکس، مشخصات و صفحه را کامل و منتشر کند.</p>
        {shared}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1080px] text-12">
            <thead className="bg-neutral-bg text-t2"><tr><th className="w-8 px-2 py-2">#</th><th className="min-w-[230px] px-2 py-2 text-right">نام کالا</th><th className="min-w-[170px] px-2 py-2 text-right">مشخصات کوتاه</th><th className="w-36 px-2 py-2 text-right">دسته</th><th className="w-20 px-2 py-2 text-right">تعداد</th><th className="w-40 px-2 py-2 text-right">بهای هر عدد</th><th className="w-40 px-2 py-2 text-right">قیمت پیشنهادی</th><th className="w-32 px-2 py-2 text-right">کد خودکار</th><th className="w-8" /></tr></thead>
            <tbody>{rows.map((r, i) => { const e = rowErr(r, i); const k = filled.indexOf(r); return <tr key={i} className="border-t border-line align-top">
              <td className="px-2 py-2 text-center text-t3">{fa(i + 1)}</td>
              <td className="px-1 py-1.5"><Input value={r.title} onChange={(ev) => setRow(i, { title: ev.target.value })} placeholder="مثلاً عطر Khamrah ۱۰۰ میل" aria-invalid={!!e} />{e && <p className="mt-0.5 text-11 text-danger">{e === 'در کاتالوگ هست' ? <>در کاتالوگ هست؛ <button type="button" className="underline" onClick={() => { const p = known.get(normT(r.title))!; setF({ ...f, pid: p.id, vid: p.variations?.[0]?.id ?? '' }); setSrc('cat') }}>ورود روی همان کالا</button></> : e === 'دسته' || e === 'تعداد' || e === 'بها' ? `${e} لازم است` : e}</p>}</td>
              <td className="px-1 py-1.5"><Input value={r.specs} onChange={(ev) => setRow(i, { specs: ev.target.value })} placeholder="مشکی، ۲۵۶ گیگ" /></td>
              <td className="px-1 py-1.5"><Select value={r.category} onChange={(v) => setRow(i, { category: v })} options={[['', 'انتخاب'] as [string, string], ...cats.map((c) => [c, c] as [string, string])]} /></td>
              <td className="px-1 py-1.5"><Input type="number" min={1} className="ltr text-left font-mono" value={r.qty} onChange={(ev) => setRow(i, { qty: Math.max(0, +ev.target.value) })} /></td>
              <td className="px-1 py-1.5"><MoneyInput value={r.cost} onChange={(n) => setRow(i, { cost: n })} /></td>
              <td className="px-1 py-1.5"><MoneyInput value={r.price} onChange={(n) => setRow(i, { price: n })} /></td>
              <td className="px-2 py-2"><bdi dir="ltr" className="font-mono text-11 text-t2">{k >= 0 ? codeAt(k) : '—'}</bdi>{k >= 0 && <bdi dir="ltr" className="block font-mono text-11 text-t3">{labelCode(s, f.owner, { id: 'n', code: codeAt(k) }, null)}</bdi>}</td>
              <td className="px-1 py-1.5">{rows.length > 1 && <button type="button" aria-label="حذف ردیف" className="grid size-8 place-items-center rounded-md text-t3 hover:bg-danger-bg hover:text-danger" onClick={() => setRows(rows.filter((_, x) => x !== i))}><Trash2 size={14} /></button>}</td>
            </tr> })}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setRows([...rows, emptyRow(rows[rows.length - 1]?.category)])}>ردیف تازه</Button>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setRows([...rows, ...Array.from({ length: 10 }, () => emptyRow(rows[rows.length - 1]?.category))])}>۱۰ ردیف</Button>
          <Button size="sm" onClick={() => setPaste(paste === null ? '' : null)}>چسباندن از اکسل</Button>
          <span className="mr-auto text-12 text-t2">{fa(filled.length)} کالا · {fa(total)} عدد{filled.length ? ` · کدها ${codeAt(0)} تا ${codeAt(filled.length - 1)}` : ''}</span>
        </div>
        {paste !== null && <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
          <p className="text-12 text-t2">ستون‌ها را از اکسل یا گوگل‌شیت کپی و اینجا بچسبانید، به همین ترتیب: نام کالا، مشخصات، دسته، تعداد، بهای هر عدد، قیمت پیشنهادی. هر سطر یک کالا؛ تا چند صد سطر در یک بار.</p>
          <Textarea rows={5} className="font-mono text-12" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'عطر Khamrah ۱۰۰ میل\tادو پرفیوم\tعطر\t12\t1850000\t2690000'} />
          <div className="flex gap-2"><Button size="sm" variant="primary" disabled={!paste.trim()} onClick={() => { const add = parsePaste(paste, cats, rows[rows.length - 1]?.category ?? ''); setRows([...rows.filter((r) => r.title.trim()), ...add]); setPaste(null); toast(`${fa(add.length)} ردیف اضافه شد؛ ردیف‌های قرمز را اصلاح کنید.`) }}>افزودن به جدول</Button><Button size="sm" variant="ghost" onClick={() => setPaste(null)}>بستن</Button></div>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2"><Field label="سند یا منشأ (اختیاری)"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="مثلاً بار دبی، فاکتور ۴۱۲" /></Field><Field label="یادداشت برای تیم کاتالوگ (اختیاری)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً عکس جعبه‌ها در گروه تلگرام است" /></Field></div>
        <Toggle on={dated} onChange={setDated} text="این کالاها تاریخ‌دارند (آرایشی، بهداشتی، خوراکی)؛ تاریخ انقضا، سری ساخت و IRC در صف تکمیل خواسته می‌شود" />
      </> : <>
        <ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} />
        {shared}
      <div className="grid gap-3 sm:grid-cols-3"><Field label="تعداد"><Input type="number" min={1} className="ltr text-left font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: Math.max(0, +e.target.value) })} /></Field><Field label="بهای تمام‌شدهٔ هر عدد (تومان)" help="به تومان؛ برای کالای وارداتی، مبلغ تبدیل‌شده با هزینهٔ حمل و گمرک"><MoneyInput value={f.cost} onChange={(n) => setF({ ...f, cost: n })} /></Field><Field label="سند یا منشأ (اختیاری)"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="مثلاً فاکتور خرید اربیل" /></Field></div>
      <div className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
        <p className="text-12 font-semibold sm:col-span-3">{needs ? 'کالای تاریخ‌دار (آرایشی، بهداشتی، خوراکی): این سه مورد اجباری است' : 'تاریخ انقضا و سری ساخت (اختیاری؛ برای کالای تاریخ‌دار)'}</p>
        <Field label="تاریخ انقضا" error={needs && !f.expiry ? 'اجباری' : shelfDays !== null && shelfDays < 0 ? 'این کالا منقضی شده است' : undefined}><Input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></Field>
        <Field label="شمارهٔ سری ساخت (Batch/LOT)" error={needs && !f.batch.trim() ? 'اجباری' : undefined}><Input className="ltr text-left font-mono" value={f.batch} onChange={(e) => setF({ ...f, batch: e.target.value })} /></Field>
        <Field label="شناسهٔ سلامت (IRC)" help={prod?.irc ? `ثبت‌شده: ${prod.irc}` : 'از برچسب سازمان غذا و دارو'} error={needs && !prod?.irc && !f.irc.trim() ? 'اجباری' : undefined}><Input className="ltr text-left font-mono" value={f.irc || prod?.irc || ''} onChange={(e) => setF({ ...f, irc: e.target.value })} /></Field>
        {shelfDays !== null && minShelf > 0 && shelfDays < minShelf && <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning sm:col-span-3">ماندگاری این محموله {fa(Math.max(0, shelfDays))} روز است؛ طبق قرارداد {partyName(s, f.owner)} حداقل {fa(minShelf)} روز لازم است. قبل از پذیرفتن، با او هماهنگ کنید.</p>}
      </div>
      <p className="flex items-start gap-1.5 rounded-lg bg-info-bg px-3 py-2 text-12 text-info"><Info size={14} className="mt-0.5 shrink-0" />کد برچسب این ورود: <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, f.owner, f.pid, f.vid || undefined)}</bdi>. همین کد روی جعبه چسبانده می‌شود تا هنگام بسته‌بندی، مالک خودکار تشخیص داده شود.</p></>}
    </div>
  </Modal>
}

function MoveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [f, setF] = useState({ pid: 'prx', vid: 'var-prx-blk', owner: 'gh', from: 'tehran', to: 'mahabad', qty: 1 })
  const avail = ownersAt(s, f.pid, f.vid || undefined, f.from).get(f.owner) ?? 0
  const save = () => { mutate((x) => { const t = takeLots(x, { productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.from }, f.qty); x.stock.lots.unshift({ id: uid('L'), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.to, qty: t.taken, cost: t.cost, at: new Date().toISOString(), ref: `انتقال از ${whName(s, f.from)}` }); syncQty(x, f.pid) }, { action: 'انتقال موجودی بین انبارها', target: `${pv(d, f.pid, f.vid).full}: ${whName(s, f.from)} ← ${whName(s, f.to)}` }); toast('انتقال ثبت شد؛ مالک تغییری نکرد.'); onClose() }
  return <Modal open={open} onClose={onClose} title="انتقال بین انبارها (مالک ثابت می‌ماند)" wide footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={f.qty < 1 || f.qty > avail || f.from === f.to} onClick={save}>ثبت انتقال</Button></>}>
    <div className="space-y-3"><ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} />
      <div className="grid gap-3 sm:grid-cols-4"><Field label="مالک"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="از انبار"><Select value={f.from} onChange={(v) => setF({ ...f, from: v })} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} /></Field><Field label="به انبار"><Select value={f.to} onChange={(v) => setF({ ...f, to: v })} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} /></Field><Field label={`تعداد (موجود: ${fa(avail)})`}><Input type="number" min={1} max={avail} className="ltr text-left font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} /></Field></div></div>
  </Modal>
}

/* ───────── فروش ───────── */
export function SaleBreakdown({ x }: { x: StockSale }) {
  const d = useDB(); const s = d.stock; const b = split(s, x); const nav = useNavigate()
  return <div className="space-y-2 text-12">
    {x.reversal && <p className="rounded-lg bg-danger-bg px-2.5 py-1.5 text-danger">این ردیف برگشت فروش است ({x.note}); همهٔ سهم‌ها برعکس حساب شده است.</p>}
    <div className="flex flex-wrap items-center gap-2"><span className="text-t2">مالک:</span><PartyChip s={s} id={x.owner} /><span className="text-t2">انبار:</span><b>{whName(s, x.warehouse)}</b><span className="text-t2">فروشنده:</span><PartyChip s={s} id={b.seller} /><span className="text-t2">کانال:</span><b>{chName(s, x.channel)}</b><span className="text-t2">پول دست:</span><PartyChip s={s} id={b.collector} /></div>
    {x.orderId && <p className="flex flex-wrap items-center gap-2"><span className="text-t2">سفارش:</span><button className="font-mono text-brand underline" onClick={() => nav(`/admin/orders/${x.orderId}`)}>{x.orderId}</button>{x.code && <><span className="text-t2">کد اسکن‌شده:</span><bdi dir="ltr" className="font-mono">{x.code}</bdi></>}<span className="text-t2">ثبت:</span>{x.by}{x.auto && <Badge tone="warning">بدون اسکن، طبق قاعدهٔ برداشت</Badge>}</p>}
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([['مبلغ فهرست', b.gross], ['تخفیف سهم این قلم', -b.disc], ['کارمزد درگاه سهم این قلم', -b.fee], ['بهای تمام‌شده', b.costT], ['سود قابل تقسیم', b.profit], [`سهم فروشنده (${fa(b.pct)}٪ سود)`, b.sellerShare], ['هزینهٔ ارسال گردانندهٔ انبار', b.handling], ['سهم کل مالک', b.ownerTotal]] as [string, number][]).map(([k, v]) => <div key={k} className="rounded-lg bg-neutral-bg px-2.5 py-1.5"><dt className="text-[10px] text-t2">{k}</dt><dd className="font-semibold">{toman(v)}</dd></div>)}</dl>
    <p className="text-11 text-t2">قاعدهٔ فعلی: تخفیف {s.rules?.discount === 'seller' ? 'فقط از سهم فروشنده' : 'مشترک، پیش از تقسیم سود'} · کارمزد درگاه {s.rules?.fee === 'seller' ? 'فقط از سهم فروشنده' : 'مشترک، پیش از تقسیم سود'}</p>
    {b.flows.length ? b.flows.map((f, i) => <p key={i} className="rounded-lg bg-warning-bg px-2.5 py-1.5 text-warning"><b>{partyName(s, f.from)}</b> باید <b>{toman(f.amount)}</b> به <b>{partyName(s, f.to)}</b> بدهد ({f.why}).</p>) : <p className="rounded-lg bg-success-bg px-2.5 py-1.5 text-success">مالک خودش فروخته و پول دست خودش است؛ تسویه‌ای لازم نیست.</p>}
  </div>
}

function SalesTab() {
  const d = useDB(); const s = d.stock; const [open, setOpen] = useState<StockSale | null>(null); const [add, setAdd] = useState(false)
  const rows = [...s.sales].filter((x) => canSecret() || shareOf(s, x, myParty()).involved).sort((a, b) => +new Date(b.at) - +new Date(a.at))
  return <Card pad={false} title="هر فروش: مالک، انبار، فروشنده و سهم هر طرف" hint="فروش سایت غنیمت هنگام «تأیید بسته‌بندی با اسکن» خودکار ثبت می‌شود؛ فروش حضوری یا سایت ve1 را اینجا ثبت کنید." actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setAdd(true)}>ثبت فروش خارج از سایت</Button>}>
    <DataTable name="فروش و سهم‌ها" empty={{ title: 'فروشی ثبت نشده است' }} rows={rows} rowKey={(x) => x.id} onRow={setOpen} search={(x) => `${x.id} ${x.orderId ?? ''} ${pv(d, x.productId, x.variationId).full} ${partyName(s, x.owner)} ${chName(s, x.channel)}`}
      cols={[{ key: 'id', title: 'شناسه', render: (x) => <span className="font-mono text-12">{x.orderId ?? x.id}</span> }, { key: 'p', title: 'کالا', render: (x) => <span>{pv(d, x.productId, x.variationId).full} <span className="text-t2">×{fa(x.qty)}</span></span> }, { key: 'o', title: 'مالک', render: (x) => <PartyChip s={s} id={x.owner} /> }, { key: 'w', title: 'از انبار', render: (x) => whName(s, x.warehouse) }, { key: 'c', title: 'فروشنده و کانال', render: (x) => <span className="flex items-center gap-1"><PartyChip s={s} id={split(s, x).seller} /><span className="text-12 text-t2">{chName(s, x.channel)}</span></span> }, { key: 'r', title: 'مبلغ', render: (x) => toman(x.price * x.qty), sort: (x) => x.price * x.qty }, { key: 'pr', title: 'سود', render: (x) => toman(split(s, x).profit), sort: (x) => split(s, x).profit }, { key: 'f', title: 'تسویه', render: (x) => { const f = split(s, x).flows; return f.length ? <span className="text-12 text-warning">{f.map((y) => `${partyName(s, y.from)} ← ${partyName(s, y.to)}: ${num(y.amount)}`).join(' · ')}</span> : <Badge tone="success">ندارد</Badge> } }, { key: 'at', title: 'زمان', render: (x) => <span className="text-12 text-t2">{rel(x.at)}</span>, sort: (x) => +new Date(x.at) }]} />
    <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `ریز سهم فروش ${open.orderId ?? open.id}` : ''} wide>{open && <SaleBreakdown x={open} />}</Modal>
    <OfflineSale open={add} onClose={() => setAdd(false)} />
  </Card>
}

function OfflineSale({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [f, setF] = useState({ ch: 've1', pid: 'prx', vid: 'var-prx-blk', owner: s.parties.find((p) => p.active && p.kind !== 'self')?.id ?? 'gh', wh: 'mahabad', qty: 1, price: 2900000 })
  const avail = ownersAt(s, f.pid, f.vid || undefined, f.wh).get(f.owner) ?? 0
  const preview: StockSale = { id: 'preview', at: new Date().toISOString(), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh, channel: f.ch, qty: f.qty, price: f.price, cost: s.lots.find((l) => l.productId === f.pid && (l.variationId ?? '') === f.vid && l.owner === f.owner)?.cost ?? 0, by: by() }
  const save = () => { mutate((x) => { const t = takeLots(x, { productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh }, f.qty); x.stock.sales.unshift({ ...preview, id: uid('S'), cost: t.cost }); syncQty(x, f.pid) }, { action: 'ثبت فروش خارج از سایت', target: `${chName(s, f.ch)} · ${pv(d, f.pid, f.vid).full} ×${f.qty}` }); toast('فروش ثبت شد، از موجودی کم شد و سهم‌ها به حساب تسویه رفت.'); onClose() }
  return <Modal open={open} onClose={onClose} title="ثبت فروش حضوری یا سایت شریک" xl footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={f.qty < 1 || f.qty > avail || f.price <= 0} onClick={save}>ثبت فروش</Button></>}>
    <div className="space-y-3"><Field label="کانال فروش"><Select value={f.ch} onChange={(v) => setF({ ...f, ch: v })} options={s.channels.filter((c) => c.active && c.id !== 'gh-site').map((c) => [c.id, `${c.name} · فروشنده: ${partyName(s, c.seller)}`] as [string, string])} /></Field>
      <ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} />
      <div className="grid gap-3 sm:grid-cols-4"><Field label="از موجودی کدام مالک"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="انبار"><Select value={f.wh} onChange={(v) => setF({ ...f, wh: v })} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} /></Field><Field label={`تعداد (موجود: ${fa(avail)})`}><Input type="number" min={1} className="ltr text-left font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} /></Field><Field label="قیمت فروش هر عدد (تومان)"><MoneyInput value={f.price} onChange={(n) => setF({ ...f, price: n })} /></Field></div>
      <div className="rounded-xl border border-line p-3"><p className="mb-2 text-12 font-semibold">پیش‌نمایش سهم‌ها</p><SaleBreakdown x={preview} /></div></div>
  </Modal>
}

/* ───────── تسویه ───────── */
function SettleTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [pay, setPay] = useState<{ from: string; to: string; amount: number; payable: number } | null>(null); const [open, setOpen] = useState<string | null>(null)
  const pairs = balances(s).filter((b) => canSecret() || b.a === myParty() || b.b === myParty())
  const dt = (k: string) => (/^\d{4}-/.test(k) ? new Date(k).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' }) : k)
  return <div className="space-y-4">
    <p className="flex items-start gap-1.5 rounded-xl bg-info-bg px-3 py-2 text-12 text-info"><Info size={14} className="mt-0.5 shrink-0" />«قابل پرداخت» فقط پولی است که هم به حساب ما رسیده (مثلاً قسط اسنپ‌پی) و هم مهلت مرجوعی کالایش گذشته است. بقیه با تاریخ در «بعداً» می‌ماند تا پول کالایی را که دو ماه دیگر از اقساطی می‌رسد، الان پرداخت نکنیم. قاعدهٔ هر روش پرداخت در تب «شرکا، انبارها و قرارداد سهم» قابل تغییر است.</p>
    <div className="grid gap-3 lg:grid-cols-2">{pairs.map((p0) => { const po = payoutBetween(d, p0.a, p0.b); const from = po.total >= 0 ? p0.a : p0.b; const to = po.total >= 0 ? p0.b : p0.a; const sg = po.total >= 0 ? 1 : -1; const payable = Math.max(0, po.payable * sg); const key = p0.a + p0.b
      return <Card key={key} title={<span className="flex items-center gap-2"><PartyChip s={s} id={p0.a} />و<PartyChip s={s} id={p0.b} /></span>} actions={po.total !== 0 && <Button size="sm" variant="primary" icon={<HandCoins size={13} />} onClick={() => setPay({ from, to, amount: Math.abs(po.total), payable })}>ثبت پرداخت تسویه</Button>}>
        {po.total === 0 ? <p className="text-15 text-success">مانده صفر است.</p> : <>
          <p className="text-13"><b>{partyName(s, from)}</b> در کل <b>{toman(Math.abs(po.total))}</b> به <b>{partyName(s, to)}</b> بدهکار است.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-success-bg p-2.5"><p className="text-11 text-success">قابل پرداخت همین حالا</p><p className="text-18 font-bold text-success">{toman(payable)}</p></div>
            <div className="rounded-xl bg-warning-bg p-2.5"><p className="text-11 text-warning">بعداً قابل پرداخت می‌شود</p><p className="text-18 font-bold text-warning">{toman(Math.max(0, Math.abs(po.total) - payable))}</p></div>
          </div>
          {po.later.length > 0 && <ul className="mt-3 space-y-1 text-12">{po.later.map((l) => <li key={l.at} className="flex justify-between gap-2 border-b border-line py-1 last:border-0"><span><b>{dt(l.at)}</b> <span className="text-t2">· {l.why}</span></span><span className="shrink-0 font-semibold">{toman(Math.abs(l.amount))}</span></li>)}</ul>}
          <button className="mt-2 text-12 text-brand underline" onClick={() => setOpen(open === key ? null : key)}>{open === key ? 'بستن ریز اقساط' : 'ریز هر فروش و قسط'}</button>
          {open === key && <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-11">{po.tranches.map((t, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-bg px-2 py-1"><span>{t.sale.orderId ? <button className="font-mono text-brand underline" onClick={() => nav(`/admin/orders/${t.sale.orderId}`)}>{t.sale.orderId}</button> : <span className="font-mono">{t.sale.id}</span>} · {pv(d, t.sale.productId, t.sale.variationId).full} · <span className="text-t2">{t.why}</span></span><span className="flex items-center gap-1.5">{t.state === 'payable' ? <Badge tone="success">قابل پرداخت</Badge> : t.state === 'waiting_delivery' ? <Badge>در انتظار تحویل</Badge> : <Badge tone="warning">{t.at ? dt(t.at.slice(0, 10)) : '—'}</Badge>}<span className="font-mono">{partyName(s, t.from)} ← {partyName(s, t.to)}: {num(t.amount)}</span></span></li>)}</ul>}
        </>}
        {s.settlements.some((t) => [t.from, t.to].includes(p0.a) && [t.from, t.to].includes(p0.b)) && <ul className="mt-3 space-y-0.5 border-t border-line pt-2 text-12">{s.settlements.filter((t) => [t.from, t.to].includes(p0.a) && [t.from, t.to].includes(p0.b)).map((t) => <li key={t.id} className="flex justify-between text-success"><span>پرداخت {partyName(s, t.from)} به {partyName(s, t.to)} {t.note ? `· ${t.note}` : ''} · {rel(t.at)}</span><span className="font-mono">{num(t.amount)}</span></li>)}</ul>}
      </Card> })}</div>
    <Card pad={false} title="پرداخت‌های تسویه"><DataTable name="پرداخت‌های تسویه" empty={{ title: 'پرداختی ثبت نشده است' }} rows={s.settlements} rowKey={(t) => t.id} cols={[{ key: 'id', title: 'شناسه', render: (t) => <span className="font-mono text-12">{t.id}</span> }, { key: 'f', title: 'پرداخت‌کننده', render: (t) => <PartyChip s={s} id={t.from} /> }, { key: 't', title: 'دریافت‌کننده', render: (t) => <PartyChip s={s} id={t.to} /> }, { key: 'a', title: 'مبلغ', render: (t) => toman(t.amount), sort: (t) => t.amount }, { key: 'r', title: 'شمارهٔ پیگیری', render: (t) => <bdi dir="ltr" className="font-mono text-12">{t.ref}</bdi> }, { key: 'b', title: 'ثبت', render: (t) => <span className="text-12 text-t2">{t.by} · {rel(t.at)}</span> }]} /></Card>
    <SettleModal v={pay} onClose={() => setPay(null)} />
  </div>
}

function SettleModal({ v, onClose }: { v: { from: string; to: string; amount: number; payable: number } | null; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [amount, setAmount] = useState(0); const [ref, setRef] = useState(''); const [note, setNote] = useState('')
  const a = amount || v?.payable || 0
  const over = v ? a > v.payable : false
  const save = () => { if (!v) return; mutate((x) => { x.stock.settlements.unshift({ id: uid('ST'), at: new Date().toISOString(), from: v.from, to: v.to, amount: a, ref, by: by(), note: note || (over ? 'پیش‌پرداخت (بیش از قابل پرداخت)' : undefined) }) }, { action: 'ثبت پرداخت تسویه بین شرکا', target: `${partyName(s, v.from)} ← ${partyName(s, v.to)}: ${num(a)}`, after: over ? `پیش‌پرداخت ${num(a - v.payable)}` : 'در حد قابل پرداخت' }); toast('پرداخت تسویه ثبت شد و از مانده کم شد.'); setAmount(0); setRef(''); setNote(''); onClose() }
  return <Modal open={!!v} onClose={onClose} title="ثبت پرداخت تسویه" footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={!ref.trim() || a <= 0} onClick={save}>ثبت پرداخت</Button></>}>
    {v && <div className="space-y-3"><p className="text-13"><b>{partyName(s, v.from)}</b> به <b>{partyName(s, v.to)}</b> · مانده کل: {toman(v.amount)} · <b className="text-success">قابل پرداخت الان: {toman(v.payable)}</b></p>
      <Field label="مبلغ پرداختی (تومان)" help="پیش‌فرض همان «قابل پرداخت» است"><MoneyInput value={a} onChange={setAmount} /></Field>
      {over && <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning">{toman(a - v.payable)} از این مبلغ هنوز از درگاه یا اقساطی به حساب ما نرسیده یا مهلت مرجوعی‌اش تمام نشده است. اگر ثبت کنید، پیش‌پرداخت حساب می‌شود و ریسک مرجوعی با ماست.</p>}
      <Field label="شمارهٔ پیگیری بانکی"><Input className="ltr text-left font-mono" value={ref} onChange={(e) => setRef(e.target.value)} /></Field><Field label="یادداشت (اختیاری)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>}
  </Modal>
}

/* ───────── کدگذاری و بارکد ───────── */
function CodesTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [f, setF] = useState({ code: '', pid: 'prx', vid: 'var-prx-blk', owner: s.parties.find((p) => p.active && p.kind !== 'self')?.id ?? 'gh', note: '' })
  const rows = useMemo(() => productsWithLots(d).flatMap((p) => (p.variations?.length ? p.variations.map((v) => ({ p, vid: v.id as string | undefined })) : [{ p, vid: undefined }])), [d])
  const dup = !!f.code && (s.codes.some((c) => c.code.toUpperCase() === f.code.trim().toUpperCase()))
  return <div className="space-y-4">
    <Card title="قاعدهٔ کد" hint="هر کالای متمایز یک کد دارد، نه هر عدد. «متمایز» یعنی هر ترکیب ویژگی‌ها: رنگ، حافظه، رم، نسخهٔ منطقه یا هر ویژگی دیگری که برای تنوع تعریف شده؛ مثلاً سفید ۱۲۸ و سفید ۶۴ دو کد جدا دارند. پیشوند کد مالک را نشان می‌دهد: GH برای غنیمت، YS برای یاسین.">
      <div className="flex flex-wrap items-end gap-4"><Field label="جداکننده"><Select className="w-28" value={s.codeRule.sep} onChange={(v) => mutate((x) => { x.stock.codeRule.sep = v })} options={[['-', 'خط تیره (-)'], ['', 'بدون جداکننده']]} /></Field><Toggle on={s.codeRule.withVariant} onChange={(v) => mutate((x) => { x.stock.codeRule.withVariant = v }, { action: 'تغییر قاعدهٔ کد تنوع', target: v ? 'با پسوند تنوع' : 'بدون پسوند' })} text="پسوند تنوع (شمارهٔ ترکیب ویژگی‌ها) در انتهای کد" /><p className="text-12 text-t2">نمونه: <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, 'gh', 'prx', 'var-prx-blk')}</bdi> و <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, 'ys', 'prx', 'var-prx-blk')}</bdi></p></div>
    </Card>
    <Card pad={false} title="برچسب هر کالای متمایز به تفکیک مالک" actions={<Button size="sm" icon={<Printer size={13} />} onClick={() => nav('/admin/labels?products=prx')}>مرکز چاپ برچسب</Button>}>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{rows.flatMap(({ p, vid }) => s.parties.filter((o) => s.lots.some((l) => l.productId === p.id && (l.variationId ?? '') === (vid ?? '') && l.owner === o.id)).map((o) => { const code = codeFor(d, o.id, p.id, vid); return (
        <div key={code} className="rounded-xl border border-line p-3"><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-12 font-medium">{pv(d, p.id, vid).full}</span><PartyChip s={s} id={o.id} /></div><Barcode value={code} className="h-16 w-full" /></div>) }))}</div>
    </Card>
    <Card title="بارکدهای اختصاصی شرکا" hint="اگر شریک روی جعبه‌هایش بارکد خودش (مثلاً بارکد کارخانه) دارد، اینجا به کالا، تنوع و مالک وصل کنید تا اسکنر همان را هم بشناسد و برچسب دوباره لازم نباشد.">
      <ul className="mb-3 space-y-1.5">{s.codes.map((c) => <li key={c.code} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-12"><bdi dir="ltr" className="font-mono font-bold">{c.code}</bdi><span>← {pv(d, c.productId, c.variationId).full}</span><PartyChip s={s} id={c.owner} /><span className="flex-1 text-t2">{c.note}</span><button aria-label="حذف" className="text-t2 hover:text-danger" onClick={() => mutate((x) => { x.stock.codes = x.stock.codes.filter((y) => y.code !== c.code) }, { action: 'حذف بارکد اختصاصی', target: c.code })}><Trash2 size={14} /></button></li>)}</ul>
      <div className="space-y-3 rounded-xl border border-dashed border-line p-3"><div className="grid gap-3 sm:grid-cols-3"><Field label="بارکد" error={dup ? 'این بارکد قبلاً ثبت شده است.' : undefined}><Input className="ltr text-left font-mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="اسکن کنید یا بنویسید" /></Field><Field label="مالک"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="یادداشت"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div><ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} /><Button size="sm" variant="primary" icon={<BarcodeIcon size={13} />} disabled={!f.code.trim() || dup} onClick={() => { mutate((x) => { x.stock.codes.push({ code: f.code.trim(), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, note: f.note }) }, { action: 'ثبت بارکد اختصاصی شریک', target: f.code }); setF({ ...f, code: '', note: '' }) }}>اتصال بارکد</Button></div>
    </Card>
  </div>
}

/* ───────── تنظیمات: شرکا، انبارها، کانال‌ها، قرارداد سهم ───────── */
function SetupTab() {
  const d = useDB(); const s = d.stock
  const [np, setNp] = useState({ name: '', prefix: '', site: '' }); const [nw, setNw] = useState({ name: '', city: '', operator: 'gh', fee: 0 }); const [nc, setNc] = useState({ name: '', seller: 'gh', collector: 'gh', brand: 'غنیمت' })
  const COLORS = ['#b45309', '#7c3aed', '#0e7490', '#be185d', '#4d7c0f']
  const setPct = (owner: string, seller: string, v: number) => mutate((x) => { const a = x.stock.agreements.find((y) => y.owner === owner && y.seller === seller); if (a) a.sellerPct = v; else x.stock.agreements.push({ owner, seller, sellerPct: v }) }, { action: 'تغییر قرارداد سهم', target: `${partyName(s, owner)} ← ${partyName(s, seller)}: ${v}٪` })
  const pfxBad = !!np.prefix && (s.parties.some((p) => p.prefix === np.prefix.toUpperCase()) || !/^[A-Z]{2,4}$/i.test(np.prefix))
  const orderChannels = [...new Set([...d.orders.map((o) => o.channel ?? 'سایت'), ...Object.keys(s.channelMap ?? {})])]
  return <div className="grid gap-4 xl:grid-cols-2">
    <Card className="xl:col-span-2" title={<span className="flex items-center gap-1.5"><Info size={15} />قواعد محاسبه و برداشت</span>} hint="روی همهٔ فروش‌های بعدی اعمال می‌شود؛ فروش‌های ثبت‌شده با قاعدهٔ زمان خودشان می‌مانند مگر برگشت بخورند.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="اولویت برداشت وقتی هر دو مالک در یک انبار موجودی دارند" help="در ایستگاه بسته‌بندی پیشنهاد داده می‌شود و در تأیید بدون اسکن همین اعمال می‌شود"><Select value={s.pickRule ?? 'fifo'} onChange={(v) => mutate((x) => { x.stock.pickRule = v as typeof s.pickRule }, { action: 'تغییر قاعدهٔ اولویت برداشت', target: v })} options={[['partner_first', 'اول کالای شریک (پیشنهادی: نقدینگی شریک زودتر برمی‌گردد)'], ['own_first', 'اول کالای خودمان'], ['fifo', 'قدیمی‌ترین ورود اول'], ['cost_low', 'کم‌هزینه‌ترین اول']]} /></Field>
        <Field label="تخفیف سفارش" help="کد تخفیف و تخفیف دستی به نسبت مبلغ میان اقلام پخش می‌شود"><Segmented value={s.rules?.discount ?? 'shared'} onChange={(v) => mutate((x) => { x.stock.rules = { ...x.stock.rules, discount: v } }, { action: 'تغییر قاعدهٔ تخفیف در تسویه', target: v })} options={[['shared', 'مشترک (پیش از تقسیم سود)'], ['seller', 'فقط با فروشنده']]} /></Field>
        <Field label="کارمزد درگاه و اقساطی" help="کارمزد زرین‌پال، اسنپ‌پی و مانند آن"><Segmented value={s.rules?.fee ?? 'shared'} onChange={(v) => mutate((x) => { x.stock.rules = { ...x.stock.rules, fee: v } }, { action: 'تغییر قاعدهٔ کارمزد در تسویه', target: v })} options={[['shared', 'مشترک'], ['seller', 'فقط با فروشنده']]} /></Field>
      </div>
      <p className="mt-3 mb-1.5 text-12 font-semibold">کانال سفارش ← کانال تسویه</p>
      <p className="mb-2 text-11 text-t2">هر سفارش از روی کانالش به یکی از کانال‌های فروش وصل می‌شود تا معلوم باشد فروشنده و دریافت‌کنندهٔ پول کیست. روی صفحهٔ هر سفارش هم می‌شود دستی عوض کرد.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{orderChannels.map((c) => <label key={c} className="flex items-center gap-2 rounded-lg bg-neutral-bg px-2.5 py-1.5 text-12"><span className="w-28 shrink-0 truncate">{c}</span><Select className="flex-1" value={s.channelMap?.[c] ?? 'gh-site'} onChange={(v) => mutate((x) => { x.stock.channelMap = { ...x.stock.channelMap, [c]: v } }, { action: 'نگاشت کانال سفارش به کانال تسویه', target: `${c} ← ${v}` })} options={s.channels.map((ch) => [ch.id, ch.name] as [string, string])} /></label>)}</div>
    </Card>
    <PartyManager />
    <Card title={<span className="flex items-center gap-1.5"><Warehouse size={15} />انبارها و شهرها</span>} hint="گردانندهٔ انبار کسی است که کالا را بسته‌بندی و ارسال می‌کند؛ اگر کالای دیگری را ارسال کند، هزینهٔ ارسال هر عدد به او تعلق می‌گیرد.">
      <ul className="mb-3 space-y-1.5">{s.warehouses.map((w) => <li key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-13"><Building2 size={14} className="text-t2" /><b>{w.name}</b><span className="text-12 text-t2">{w.city} · گرداننده: {partyName(s, w.operator)}</span><span className="flex-1" /><label className="flex items-center gap-1 text-11 text-t2">هزینهٔ ارسال هر عدد<MoneyInput hint={false} className="w-36" value={w.handlingFee} onChange={(n) => mutate((x) => { const q = x.stock.warehouses.find((y) => y.id === w.id); if (q) q.handlingFee = n })} /></label></li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_.8fr_.8fr_.7fr_auto] sm:items-end"><Field label="نام انبار"><Input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} placeholder="انبار شیراز" /></Field><Field label="شهر"><Input value={nw.city} onChange={(e) => setNw({ ...nw, city: e.target.value })} /></Field><Field label="گرداننده"><Select value={nw.operator} onChange={(v) => setNw({ ...nw, operator: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="هزینهٔ ارسال هر عدد (تومان)"><MoneyInput hint={false} value={nw.fee} onChange={(n) => setNw({ ...nw, fee: n })} /></Field>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!nw.name.trim() || !nw.city.trim()} onClick={() => { mutate((x) => { x.stock.warehouses.push({ id: `wh${Date.now().toString(36).slice(-4)}`, name: nw.name.trim(), city: nw.city.trim(), operator: nw.operator, handlingFee: nw.fee, active: true }) }, { action: 'افزودن انبار تازه', target: nw.name }); setNw({ name: '', city: '', operator: 'gh', fee: 0 }) }}>افزودن</Button></div>
    </Card>
    <Card title={<span className="flex items-center gap-1.5"><ReceiptText size={15} />کانال‌های فروش</span>} hint="«فروشنده» کسی است که فروش را انجام داده و سهم فروشنده می‌گیرد؛ «پول دست» کسی است که مبلغ مشتری به حسابش می‌رود.">
      <ul className="mb-3 space-y-1.5">{s.channels.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-12"><b className="text-13">{c.name}</b><span className="text-t2">برند: {c.brand}</span><span className="flex-1" />فروشنده <PartyChip s={s} id={c.seller} /> پول دست <PartyChip s={s} id={c.collector} /></li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_.7fr_.7fr_.7fr_auto] sm:items-end"><Field label="نام کانال"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field><Field label="فروشنده"><Select value={nc.seller} onChange={(v) => setNc({ ...nc, seller: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="پول دست"><Select value={nc.collector} onChange={(v) => setNc({ ...nc, collector: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="برند"><Input value={nc.brand} onChange={(e) => setNc({ ...nc, brand: e.target.value })} /></Field>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!nc.name.trim()} onClick={() => { mutate((x) => { x.stock.channels.push({ id: `ch${Date.now().toString(36).slice(-4)}`, name: nc.name.trim(), seller: nc.seller, collector: nc.collector, brand: nc.brand, active: true }) }, { action: 'افزودن کانال فروش', target: nc.name }); setNc({ ...nc, name: '' }) }}>افزودن</Button></div>
    </Card>
    <Card className="xl:col-span-2" title={<span className="flex items-center gap-1.5"><HandCoins size={15} />قرارداد سهم میان مالک و فروشنده</span>} hint="ردیف: مالک کالا · ستون: فروشنده. برای هر جفت مدل قرارداد را انتخاب کنید.">
      <div className="overflow-x-auto"><table className="w-full text-12"><thead><tr><th className="p-2 text-right text-t2">مالک ↓ / فروشنده ←</th>{s.parties.map((p) => <th key={p.id} className="p-2"><PartyChip s={s} id={p.id} /></th>)}</tr></thead>
        <tbody>{s.parties.map((o) => <tr key={o.id} className="border-t border-line align-top"><td className="p-2"><PartyChip s={s} id={o.id} /></td>{s.parties.map((sl) => { const ag = s.agreements.find((a) => a.owner === o.id && a.seller === sl.id); const m = ag?.model ?? 'profit_share'; return <td key={sl.id} className="p-2 text-center">{o.id === sl.id ? <span className="text-t3">—</span> : <div className="mx-auto flex w-44 flex-col gap-1">
          <select aria-label={`مدل قرارداد ${o.name} با ${sl.name}`} className="h-8 rounded-md border border-line bg-surface px-1 text-11" value={m} onChange={(e) => mutate((x) => { const a = x.stock.agreements.find((y) => y.owner === o.id && y.seller === sl.id); const v = e.target.value as typeof m; if (a) a.model = v; else x.stock.agreements.push({ owner: o.id, seller: sl.id, sellerPct: v === 'fixed_price' ? 100 : 20, model: v }) }, { action: 'تغییر مدل قرارداد سهم', target: `${o.name} ← ${sl.name}: ${e.target.value}` })}><option value="profit_share">تقسیم سود</option><option value="fixed_price">قیمت توافقی ثابت</option><option value="commission">کمیسیون از مبلغ فروش</option></select>
          {m === 'fixed_price' ? <span className="text-[10px] leading-4 text-t2">سهم مالک = مبلغ توافقی هر ورود؛ بقیه مال فروشنده</span> : <span className="inline-flex items-center justify-center gap-1"><Input type="number" min={0} max={100} className="ltr h-8 w-16 text-center font-mono" value={ag?.sellerPct ?? 0} onChange={(e) => setPct(o.id, sl.id, Math.min(100, Math.max(0, +e.target.value)))} /><span className="text-[10px] text-t2">{m === 'commission' ? '٪ از فروش' : '٪ از سود'}</span></span>}
        </div>}</td> })}</tr>)}</tbody></table></div>
      <div className="mt-3 grid gap-2 text-12 leading-6 lg:grid-cols-3">
        <p className="rounded-lg bg-neutral-bg p-2.5"><b>تقسیم سود:</b> فروشنده درصدی از سود را برمی‌دارد؛ بهای تمام‌شده و بقیهٔ سود مال مالک. مثل یاسین.</p>
        <p className="rounded-lg bg-neutral-bg p-2.5"><b>قیمت توافقی ثابت:</b> مالک برای هر عدد همان مبلغ توافقی را می‌گیرد؛ تخفیف، کارمزد و سود با فروشنده. پیشنهادی برای تأمین‌کنندهٔ امانی مثل یوسف.</p>
        <p className="rounded-lg bg-neutral-bg p-2.5"><b>کمیسیون:</b> فروشنده درصدی از مبلغ خالص فروش را برمی‌دارد و بقیه مال مالک؛ بهای خرید مالک لازم نیست.</p>
      </div>
    </Card>
    <Card className="xl:col-span-2" title={<span className="flex items-center gap-1.5"><Info size={15} />زمان رسیدن پول هر روش پرداخت</span>} hint="پرداخت به شرکا و تأمین‌کنندگان فقط بعد از رسیدن همان پول به حساب ما و گذشت مهلت مرجوعی انجام می‌شود. قالب: روز:درصد، مثلاً «30:50، 60:50» یعنی نیمی ۳۰ روز بعد و نیمی ۶۰ روز بعد.">
      <ul className="grid gap-2 lg:grid-cols-2">{(s.payTerms ?? []).map((t, i) => <PayTermRow key={t.match + i} i={i} />)}</ul>
      <Button size="sm" className="mt-2" icon={<Plus size={13} />} onClick={() => mutate((x) => { x.stock.payTerms = [...(x.stock.payTerms ?? []), { match: 'روش تازه', label: 'روش پرداخت تازه', tranches: [{ days: 0, pct: 100 }] }] }, { action: 'افزودن قاعدهٔ زمان رسیدن پول', target: 'روش تازه' })}>افزودن روش پرداخت</Button>
    </Card>
  </div>
}

/** کارت مالکیت در صفحهٔ هر کالا */
export function ProductOwnership({ pid }: { pid: string }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [intake, setIntake] = useState(false)
  const p = d.products.find((x) => x.id === pid); if (!p) return null
  const rows = p.variations?.length ? p.variations.map((v) => v.id as string | undefined) : [undefined]
  const has = s.lots.some((l) => l.productId === pid)
  return <Card title="مالکیت و محل موجودی" hint="هر عدد این کالا مال کیست و در کدام انبار است" actions={<div className="flex gap-2"><Button size="sm" icon={<PackagePlus size={13} />} onClick={() => setIntake(true)}>ورود با مالک</Button><Button size="sm" variant="ghost" onClick={() => nav('/admin/ownership')}>همهٔ موجودی‌ها</Button></div>}>
    {!has ? <p className="text-12 text-t2">هنوز مالک این کالا جدا ثبت نشده است؛ همهٔ موجودی به نام <b>{partyName(s, p.owner ?? 'gh')}</b> (مالک پیش‌فرض) حساب می‌شود. برای تقسیم میان چند مالک «ورود با مالک» را بزنید.</p>
      : <div className="space-y-2">{rows.map((vid) => <div key={vid ?? 'x'} className="rounded-lg border border-line p-2.5"><p className="mb-1.5 text-12 font-semibold">{pv(d, pid, vid).vname || 'موجودی'}</p><div className="flex flex-wrap gap-3">{s.warehouses.map((w) => { const m = [...ownersAt(s, pid, vid, w.id)].filter(([, n]) => n > 0); return m.length ? <div key={w.id} className="flex items-center gap-1 text-12"><span className="text-t2">{w.name}:</span>{m.map(([o, n]) => <PartyChip key={o} s={s} id={o} n={n} />)}</div> : null })}</div></div>)}</div>}
    <IntakeModal open={intake} onClose={() => setIntake(false)} preset={{ pid, vid: p.variations?.[0]?.id }} />
  </Card>
}

export type { DB }

function PayTermRow({ i }: { i: number }) {
  const d = useDB(); const t = d.stock.payTerms[i]; const [txt, setTxt] = useState(t.tranches.map((x) => `${x.days}:${x.pct}`).join('، '))
  const parse = (v: string) => v.split(/[،,]/).map((p) => p.trim()).filter(Boolean).map((p) => { const [a, b] = p.split(':').map((q) => Number(q.replace(/[^\d]/g, ''))); return { days: a || 0, pct: b || 0 } })
  const T = parse(txt); const sum = T.reduce((a, x) => a + x.pct, 0)
  const save = () => { if (sum !== 100) return toast('جمع درصدها باید ۱۰۰ باشد.', { tone: 'err' }); mutate((x) => { x.stock.payTerms[i].tranches = T }, { action: 'تغییر زمان رسیدن پول روش پرداخت', target: t.label, after: txt }) }
  return <li className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-2.5 text-12">
    <label className="flex-1"><span className="mb-0.5 block text-11 text-t2">عنوان</span><Input className="h-8" value={t.label} onChange={(e) => mutate((x) => { x.stock.payTerms[i].label = e.target.value })} /></label>
    <label className="w-28"><span className="mb-0.5 block text-11 text-t2">اگر روش پرداخت شامل</span><Input className="h-8" value={t.match} onChange={(e) => mutate((x) => { x.stock.payTerms[i].match = e.target.value })} /></label>
    <label className="w-36"><span className="mb-0.5 block text-11 text-t2">روز:درصد</span><Input className={sum === 100 ? 'ltr h-8 text-left font-mono' : 'ltr h-8 border-danger text-left font-mono'} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={save} /></label>
    <button aria-label={`حذف ${t.label}`} className="pb-2 text-t3 hover:text-danger" onClick={() => mutate((x) => { x.stock.payTerms.splice(i, 1) }, { action: 'حذف قاعدهٔ زمان رسیدن پول', target: t.label })}><Trash2 size={14} /></button>
    <p className="basis-full text-[10px] text-t3">{T.map((x) => `${fa(x.pct)}٪ ${x.days ? `${fa(x.days)} روز بعد` : 'همان روز'}`).join(' · ')}</p>
  </li>
}

const expDays = (iso: string) => Math.round((+new Date(iso) - Date.now()) / 864e5)
function expBadge(iso: string) { const n = expDays(iso); return <Badge tone={n < 0 ? 'danger' : n <= 90 ? 'warning' : 'neutral'}>{n < 0 ? `منقضی (${fa(-n)} روز)` : `${new Date(iso).toLocaleDateString('fa-IR')} · ${fa(n)} روز`}</Badge> }

/** هشدار انقضا: منقضی‌ها از سایت خارج‌اند و باید به مالک برگردند یا معدوم شوند؛ نزدیک‌ها اول فروخته می‌شوند */
function ExpiryAlerts({ onReturn }: { onReturn: (p: { lotId?: string }) => void }) {
  const d = useDB(); const s = d.stock
  const L = s.lots.filter((l) => l.expiry && l.qty > 0 && expDays(l.expiry) <= 90).sort((a, b) => +new Date(a.expiry!) - +new Date(b.expiry!))
  if (!L.length) return null
  return <Card title="انقضای نزدیک یا گذشته" hint="کالای منقضی خودکار از سایت خارج است؛ کالای نزدیک به انقضا در بسته‌بندی زودتر برداشته می‌شود.">
    <ul className="space-y-1.5">{L.map((l) => <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-2.5 py-1.5 text-12">{expBadge(l.expiry!)}<span className="flex-1">{pv(d, l.productId, l.variationId).full} ×{fa(l.qty)} · {whName(s, l.warehouse)}{l.batch && <> · سری <bdi dir="ltr" className="font-mono">{l.batch}</bdi></>}</span><PartyChip s={s} id={l.owner} />{l.owner !== (s.parties.find((p) => p.kind === 'self')?.id ?? 'gh') && <Button size="sm" variant="ghost" icon={<Undo2 size={12} />} onClick={() => onReturn({ lotId: l.id })}>برگشت به مالک</Button>}</li>)}</ul>
  </Card>
}

/** برگشت کالای فروش‌نرفته یا تاریخ‌گذشته به مالک، با رسید */
function OwnerReturnModal({ pre, onClose }: { pre: { lotId?: string } | null; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const lot0 = s.lots.find((l) => l.id === pre?.lotId)
  const [owner, setOwner] = useState(lot0?.owner ?? s.parties.find((p) => p.kind !== 'self')?.id ?? ''); const [sel, setSel] = useState<Record<string, number>>(lot0 ? { [lot0.id]: lot0.qty } : {}); const [reason, setReason] = useState(lot0 && lot0.expiry && expDays(lot0.expiry) < 0 ? 'تاریخ‌گذشته' : 'فروش نرفت'); const [recv, setRecv] = useState('')
  if (!pre) return null
  const lots = s.lots.filter((l) => l.owner === owner && l.qty > 0)
  const total = Object.values(sel).reduce((a, n) => a + n, 0)
  const save = () => { if (!total) return toast('دست‌کم یک قلم و تعداد انتخاب کنید.', { tone: 'err' }); if (!recv.trim()) return toast('نام تحویل‌گیرنده را بنویسید.', { tone: 'err' })
    const id = uid('RTO'); const wh = lots.find((l) => sel[l.id])?.warehouse ?? 'tehran'
    mutate((x) => { const lines: OwnerReturn['lines'] = []; Object.entries(sel).forEach(([lid, n]) => { const l = x.stock.lots.find((y) => y.id === lid); if (!l || !n) return; const t = Math.min(n, l.qty); l.qty -= t; lines.push({ productId: l.productId, variationId: l.variationId, qty: t, batch: l.batch, expiry: l.expiry }); syncQty(x, l.productId) })
      x.stock.ownerReturns = [{ id, at: new Date().toISOString(), owner, warehouse: wh, lines, reason, by: by(), receivedBy: recv.trim() }, ...(x.stock.ownerReturns ?? [])] }, { action: 'برگشت کالا به مالک', target: `${partyName(s, owner)} · ${fa(total)} عدد`, after: `${reason} · تحویل‌گیرنده ${recv.trim()}` })
    toast(`رسید ${id} ثبت شد؛ ${fa(total)} عدد از موجودی کم شد.`); setSel({}); onClose() }
  return <Modal open onClose={onClose} title="برگشت کالا به مالک" wide footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" onClick={save}>ثبت رسید برگشت</Button></>}>
    <div className="space-y-3 text-13">
      <div className="grid gap-3 sm:grid-cols-3"><Field label="مالک"><Select value={owner} onChange={(v) => { setOwner(v); setSel({}) }} options={s.parties.filter((p) => p.kind !== 'self').map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="دلیل"><Select value={reason} onChange={setReason} options={['فروش نرفت', 'تاریخ‌گذشته', 'نزدیک به انقضا', 'آسیب‌دیده', 'پایان همکاری', 'درخواست مالک']} /></Field><Field label="تحویل‌گیرنده (نام)"><Input value={recv} onChange={(e) => setRecv(e.target.value)} /></Field></div>
      <ul className="space-y-1.5">{lots.map((l) => <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-12"><span className="flex-1">{pv(d, l.productId, l.variationId).full} · {whName(s, l.warehouse)}{l.batch && <> · <bdi dir="ltr" className="font-mono">{l.batch}</bdi></>}</span>{l.expiry && expBadge(l.expiry)}<span className="text-t2">موجود {fa(l.qty)}</span><Input type="number" min={0} max={l.qty} aria-label="تعداد برگشتی" className="ltr h-8 w-20 text-center font-mono" value={sel[l.id] ?? 0} onChange={(e) => setSel({ ...sel, [l.id]: Math.min(l.qty, Math.max(0, +e.target.value)) })} /></li>)}{!lots.length && <li className="text-12 text-t2">این مالک موجودی‌ای در انبارها ندارد.</li>}</ul>
      <p className="text-11 text-t2">رسید با نام تحویل‌گیرنده ثبت می‌شود و موجودی همان سری‌ها کم می‌شود. پیشنهاد: هنگام تحویل، رسید چاپی را امضا بگیرید.</p>
    </div>
  </Modal>
}

function OwnerReturns() {
  const d = useDB(); const s = d.stock; const R = s.ownerReturns ?? []
  if (!R.length) return null
  return <Card title="رسیدهای برگشت کالا به مالک" pad={false}><ul className="divide-y divide-line">{R.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-12"><b className="font-mono">{r.id}</b><PartyChip s={s} id={r.owner} /><span className="flex-1">{r.lines.map((l) => `${pv(d, l.productId, l.variationId).full} ×${fa(l.qty)}`).join('، ')}</span><Badge>{r.reason}</Badge><span className="text-t2">تحویل به {r.receivedBy} · {r.by} · {rel(r.at)}</span></li>)}</ul></Card>
}
