import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Barcode as BarcodeIcon, Building2, HandCoins, Info, PackagePlus, Plus, Printer, ReceiptText, ScanLine, Trash2, Users, Warehouse } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, Tabs, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { Barcode } from '@/shared/ui/codes'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fa, num, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { balances, split, type StockSale } from '@/shared/data/stock'
import { chName, codeFor, ownersAt, PartyChip, partyName, pv, productsWithLots, syncQty, takeLots, whName } from './common'
import { useTab } from '../pages/_shared'

const uid = (p: string) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`
const by = () => currentUser()?.name ?? 'پنل'

/** مالکیت، محل و تسویهٔ موجودی میان غنیمت و شرکا */
export function Ownership() {
  const d = useDB(); const s = d.stock; const [tab, setTab] = useTab('stock'); const nav = useNavigate()
  const bal = balances(s).filter((b) => Math.abs(b.net) > 0)
  const units = (o: string) => s.lots.filter((l) => l.owner === o).reduce((a, l) => a + l.qty, 0)
  const value = (o: string) => s.lots.filter((l) => l.owner === o).reduce((a, l) => a + l.qty * l.cost, 0)
  return (
    <Page module="warehouse" title="مالکیت و تسویهٔ موجودی" sub="هر عدد کالا: مال کیست، کجاست، چه کسی فروخت و سهم هر طرف چقدر است"
      actions={<Button icon={<ScanLine size={14} />} onClick={() => nav('/admin/packing')}>ایستگاه بسته‌بندی</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'موجودی به تفکیک مالک' }, { id: 'sales', label: 'فروش و سهم‌ها', count: s.sales.length }, { id: 'settle', label: 'تسویه بین شرکا', count: bal.length || undefined }, { id: 'codes', label: 'کدگذاری و بارکد' }, { id: 'setup', label: 'شرکا، انبارها و قرارداد سهم' }]} />}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {s.parties.filter((p) => p.active).map((p) => <Card key={p.id} onClick={() => setTab('stock')}><div className="flex items-center justify-between"><PartyChip s={s} id={p.id} /><span className="text-11 text-t2">{p.kind === 'self' ? 'خودمان' : 'شریک'}</span></div><p className="mt-2 text-20 font-bold">{fa(units(p.id))} <span className="text-12 font-normal text-t2">عدد موجود</span></p><p className="text-12 text-t2">ارزش به بهای تمام‌شده: {toman(value(p.id))}</p></Card>)}
        <Card onClick={() => setTab('settle')}><p className="flex items-center gap-1.5 text-12 text-t2"><HandCoins size={14} />ماندهٔ تسویه</p>{bal.length ? bal.map((b) => <p key={b.a + b.b} className="mt-1.5 text-13"><b>{partyName(s, b.net > 0 ? b.a : b.b)}</b> به <b>{partyName(s, b.net > 0 ? b.b : b.a)}</b> <span className="font-bold text-warning">{toman(Math.abs(b.net))}</span></p>) : <p className="mt-2 text-13 text-success">همه تسویه است.</p>}</Card>
      </div>
      {tab === 'stock' && <StockTab />}
      {tab === 'sales' && <SalesTab />}
      {tab === 'settle' && <SettleTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'setup' && <SetupTab />}
    </Page>
  )
}

/* ───────── موجودی ───────── */
function StockTab() {
  const d = useDB(); const s = d.stock; const [sp] = useSearchParams(); const [intake, setIntake] = useState(sp.get('intake') === '1'); const [move, setMove] = useState(false)
  const whs = s.warehouses.filter((w) => w.active)
  const rows = productsWithLots(d).flatMap((p) => (p.variations?.length ? p.variations.map((v) => ({ p, vid: v.id })) : [{ p, vid: undefined as string | undefined }])).filter((r) => s.lots.some((l) => l.productId === r.p.id && (l.variationId ?? '') === (r.vid ?? '')))
  return (
    <div className="space-y-4">
      <Card pad={false} title="موجودی هر کالا: انبار × مالک" hint="یک کالا یا یک رنگ می‌تواند هم‌زمان در چند انبار و مال چند نفر باشد؛ عدد سایت جمع همهٔ این خانه‌هاست." actions={<div className="flex gap-2"><Button size="sm" icon={<ArrowLeftRight size={13} />} onClick={() => setMove(true)}>انتقال بین انبارها</Button><Button size="sm" variant="primary" icon={<PackagePlus size={13} />} onClick={() => setIntake(true)}>ورود موجودی</Button></div>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-13">
          <thead><tr className="border-b border-line text-right text-12 text-t2"><th className="px-4 py-2.5 font-medium">کالا و تنوع</th>{whs.map((w) => <th key={w.id} className="px-3 py-2.5 font-medium">{w.name}<span className="block text-[10px] font-normal">گرداننده: {partyName(s, w.operator)}</span></th>)}<th className="px-3 py-2.5 font-medium">جمع به تفکیک مالک</th></tr></thead>
          <tbody>{rows.map(({ p, vid }) => { const { vname } = pv(d, p.id, vid); const tot = new Map<string, number>(); return (
            <tr key={p.id + (vid ?? '')} className="border-b border-line align-top last:border-0">
              <td className="px-4 py-3"><p className="font-medium">{p.title}</p>{vname && <p className="text-12 text-t2">{vname}</p>}</td>
              {whs.map((w) => { const m = ownersAt(s, p.id, vid, w.id); m.forEach((n, o) => tot.set(o, (tot.get(o) ?? 0) + n)); return <td key={w.id} className="px-3 py-3"><div className="flex flex-wrap gap-1">{[...m].filter(([, n]) => n > 0).map(([o, n]) => <PartyChip key={o} s={s} id={o} n={n} />)}{![...m].some(([, n]) => n > 0) && <span className="text-t3">—</span>}</div></td> })}
              <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{[...tot].map(([o, n]) => <PartyChip key={o} s={s} id={o} n={n} />)}</div><p className="mt-1 text-11 text-t2">کل: {fa([...tot.values()].reduce((a, b) => a + b, 0))} عدد</p></td>
            </tr>) })}</tbody>
        </table></div>
      </Card>
      <Card title="ورودها و لات‌های موجودی" pad={false}>
        <DataTable name="لات‌های موجودی" empty={{ title: 'لاتی ثبت نشده است' }} rows={[...s.lots].sort((a, b) => +new Date(b.at) - +new Date(a.at))} rowKey={(l) => l.id} search={(l) => `${l.id} ${pv(d, l.productId, l.variationId).full} ${partyName(s, l.owner)} ${l.ref ?? ''}`}
          cols={[{ key: 'id', title: 'شناسه', render: (l) => <span className="font-mono text-12">{l.id}</span> }, { key: 'p', title: 'کالا', render: (l) => pv(d, l.productId, l.variationId).full }, { key: 'o', title: 'مالک', render: (l) => <PartyChip s={s} id={l.owner} /> }, { key: 'w', title: 'انبار', render: (l) => whName(s, l.warehouse) }, { key: 'q', title: 'مانده', render: (l) => fa(l.qty), sort: (l) => l.qty }, { key: 'c', title: 'بهای تمام‌شدهٔ واحد', render: (l) => toman(l.cost), sort: (l) => l.cost }, { key: 'code', title: 'کد برچسب', render: (l) => <bdi dir="ltr" className="font-mono text-12">{codeFor(d, l.owner, l.productId, l.variationId)}</bdi> }, { key: 'r', title: 'منشأ', render: (l) => <span className="text-12 text-t2">{l.ref ?? '—'} · {rel(l.at)}</span> }]} />
      </Card>
      <IntakeModal open={intake} onClose={() => setIntake(false)} />
      <MoveModal open={move} onClose={() => setMove(false)} />
    </div>
  )
}

function ProductPicker({ pid, vid, onChange }: { pid: string; vid: string; onChange: (pid: string, vid: string) => void }) {
  const d = useDB(); const seen = new Set<string>(); const list = d.products.filter((p) => p.mode !== 'serial' && !seen.has(p.id) && !!seen.add(p.id))
  const p = list.find((x) => x.id === pid)
  return <div className="grid gap-3 sm:grid-cols-2"><Field label="کالا"><Select value={pid} onChange={(v) => onChange(v, list.find((x) => x.id === v)?.variations?.[0]?.id ?? '')} options={list.map((x) => [x.id, x.title] as [string, string])} /></Field>
    {p?.variations?.length ? <Field label="تنوع (رنگ و ویژگی)"><Select value={vid} onChange={(v) => onChange(pid, v)} options={p.variations.map((v) => [v.id, pv(d, p.id, v.id).vname] as [string, string])} /></Field> : <div />}</div>
}

function IntakeModal({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { pid: string; vid?: string } }) {
  const d = useDB(); const s = d.stock
  const [f, setF] = useState({ pid: preset?.pid ?? 'prx', vid: preset?.vid ?? 'var-prx-blk', owner: 'gh', wh: 'tehran', qty: 1, cost: 0, ref: '' })
  const ok = f.qty > 0 && f.cost > 0
  const save = () => { mutate((x) => { x.stock.lots.unshift({ id: uid('L'), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh, qty: f.qty, cost: f.cost, at: new Date().toISOString(), ref: f.ref || `ورود توسط ${by()}` }); syncQty(x, f.pid) }, { action: 'ورود موجودی با مالک مشخص', target: `${pv(d, f.pid, f.vid).full} · ${partyName(s, f.owner)} · ${whName(s, f.wh)}` }); toast(`${fa(f.qty)} عدد به نام ${partyName(s, f.owner)} در ${whName(s, f.wh)} ثبت شد.`); onClose() }
  return <Modal open={open} onClose={onClose} title="ورود موجودی با مالک مشخص" wide footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={!ok} onClick={save}>ثبت ورود</Button></>}>
    <div className="space-y-3"><ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} />
      <div className="grid gap-3 sm:grid-cols-2"><Field label="مالک (تأمین‌کننده)" help="کسی که پول این کالا را داده است"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.filter((p) => p.active).map((p) => [p.id, `${p.name} (${p.prefix})`] as [string, string])} /></Field><Field label="انبار محل نگهداری"><Select value={f.wh} onChange={(v) => setF({ ...f, wh: v })} options={s.warehouses.filter((w) => w.active).map((w) => [w.id, w.name] as [string, string])} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="تعداد"><Input type="number" min={1} className="ltr text-left font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: Math.max(0, +e.target.value) })} /></Field><Field label="بهای تمام‌شدهٔ هر عدد (تومان)"><Input type="number" min={0} className="ltr text-left font-mono" value={f.cost || ''} onChange={(e) => setF({ ...f, cost: Math.max(0, +e.target.value) })} /></Field><Field label="سند یا منشأ (اختیاری)"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="مثلاً فاکتور خرید اربیل" /></Field></div>
      <p className="flex items-start gap-1.5 rounded-lg bg-info-bg px-3 py-2 text-12 text-info"><Info size={14} className="mt-0.5 shrink-0" />کد برچسب این ورود: <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, f.owner, f.pid, f.vid || undefined)}</bdi>. همین کد روی جعبه چسبانده می‌شود تا هنگام بسته‌بندی، مالک خودکار تشخیص داده شود.</p></div>
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
  const d = useDB(); const s = d.stock; const b = split(s, x)
  return <div className="space-y-2 text-12">
    <div className="flex flex-wrap items-center gap-2"><span className="text-t2">مالک:</span><PartyChip s={s} id={x.owner} /><span className="text-t2">انبار:</span><b>{whName(s, x.warehouse)}</b><span className="text-t2">فروشنده:</span><PartyChip s={s} id={b.seller} /><span className="text-t2">کانال:</span><b>{chName(s, x.channel)}</b><span className="text-t2">پول دست:</span><PartyChip s={s} id={b.collector} /></div>
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[['مبلغ فروش', b.revenue], ['بهای تمام‌شده', b.costT], ['سود ناخالص', b.profit], [`سهم فروشنده (${fa(b.pct)}٪ سود)`, b.sellerShare], ['سهم کل مالک', b.ownerTotal]].map(([k, v]) => <div key={k as string} className="rounded-lg bg-neutral-bg px-2.5 py-1.5"><dt className="text-[10px] text-t2">{k}</dt><dd className="font-semibold">{toman(v as number)}</dd></div>)}</dl>
    {b.handling > 0 && <p className="text-t2">هزینهٔ ارسال از {whName(s, x.warehouse)}: {toman(b.handling)} به {partyName(s, b.operator)}</p>}
    {b.flows.length ? b.flows.map((f, i) => <p key={i} className="rounded-lg bg-warning-bg px-2.5 py-1.5 text-warning"><b>{partyName(s, f.from)}</b> باید <b>{toman(f.amount)}</b> به <b>{partyName(s, f.to)}</b> بدهد ({f.why}).</p>) : <p className="rounded-lg bg-success-bg px-2.5 py-1.5 text-success">مالک خودش فروخته و پول دست خودش است؛ تسویه‌ای لازم نیست.</p>}
  </div>
}

function SalesTab() {
  const d = useDB(); const s = d.stock; const [open, setOpen] = useState<StockSale | null>(null); const [add, setAdd] = useState(false)
  const rows = [...s.sales].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  return <Card pad={false} title="هر فروش: مالک، انبار، فروشنده و سهم هر طرف" hint="فروش سایت غنیمت هنگام «تأیید بسته‌بندی با اسکن» خودکار ثبت می‌شود؛ فروش حضوری یا سایت ve1 را اینجا ثبت کنید." actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setAdd(true)}>ثبت فروش خارج از سایت</Button>}>
    <DataTable name="فروش و سهم‌ها" empty={{ title: 'فروشی ثبت نشده است' }} rows={rows} rowKey={(x) => x.id} onRow={setOpen} search={(x) => `${x.id} ${x.orderId ?? ''} ${pv(d, x.productId, x.variationId).full} ${partyName(s, x.owner)} ${chName(s, x.channel)}`}
      cols={[{ key: 'id', title: 'شناسه', render: (x) => <span className="font-mono text-12">{x.orderId ?? x.id}</span> }, { key: 'p', title: 'کالا', render: (x) => <span>{pv(d, x.productId, x.variationId).full} <span className="text-t2">×{fa(x.qty)}</span></span> }, { key: 'o', title: 'مالک', render: (x) => <PartyChip s={s} id={x.owner} /> }, { key: 'w', title: 'از انبار', render: (x) => whName(s, x.warehouse) }, { key: 'c', title: 'فروشنده و کانال', render: (x) => <span className="flex items-center gap-1"><PartyChip s={s} id={split(s, x).seller} /><span className="text-12 text-t2">{chName(s, x.channel)}</span></span> }, { key: 'r', title: 'مبلغ', render: (x) => toman(x.price * x.qty), sort: (x) => x.price * x.qty }, { key: 'pr', title: 'سود', render: (x) => toman(split(s, x).profit), sort: (x) => split(s, x).profit }, { key: 'f', title: 'تسویه', render: (x) => { const f = split(s, x).flows; return f.length ? <span className="text-12 text-warning">{f.map((y) => `${partyName(s, y.from)} ← ${partyName(s, y.to)}: ${num(y.amount)}`).join(' · ')}</span> : <Badge tone="success">ندارد</Badge> } }, { key: 'at', title: 'زمان', render: (x) => <span className="text-12 text-t2">{rel(x.at)}</span>, sort: (x) => +new Date(x.at) }]} />
    <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `ریز سهم فروش ${open.orderId ?? open.id}` : ''} wide>{open && <SaleBreakdown x={open} />}</Modal>
    <OfflineSale open={add} onClose={() => setAdd(false)} />
  </Card>
}

function OfflineSale({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [f, setF] = useState({ ch: 've1', pid: 'prx', vid: 'var-prx-blk', owner: 'ys', wh: 'mahabad', qty: 1, price: 2900000 })
  const avail = ownersAt(s, f.pid, f.vid || undefined, f.wh).get(f.owner) ?? 0
  const preview: StockSale = { id: 'preview', at: new Date().toISOString(), productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh, channel: f.ch, qty: f.qty, price: f.price, cost: s.lots.find((l) => l.productId === f.pid && (l.variationId ?? '') === f.vid && l.owner === f.owner)?.cost ?? 0, by: by() }
  const save = () => { mutate((x) => { const t = takeLots(x, { productId: f.pid, variationId: f.vid || undefined, owner: f.owner, warehouse: f.wh }, f.qty); x.stock.sales.unshift({ ...preview, id: uid('S'), cost: t.cost }); syncQty(x, f.pid) }, { action: 'ثبت فروش خارج از سایت', target: `${chName(s, f.ch)} · ${pv(d, f.pid, f.vid).full} ×${f.qty}` }); toast('فروش ثبت شد، از موجودی کم شد و سهم‌ها به حساب تسویه رفت.'); onClose() }
  return <Modal open={open} onClose={onClose} title="ثبت فروش حضوری یا سایت شریک" xl footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={f.qty < 1 || f.qty > avail || f.price <= 0} onClick={save}>ثبت فروش</Button></>}>
    <div className="space-y-3"><Field label="کانال فروش"><Select value={f.ch} onChange={(v) => setF({ ...f, ch: v })} options={s.channels.filter((c) => c.active && c.id !== 'gh-site').map((c) => [c.id, `${c.name} · فروشنده: ${partyName(s, c.seller)}`] as [string, string])} /></Field>
      <ProductPicker pid={f.pid} vid={f.vid} onChange={(pid, vid) => setF({ ...f, pid, vid })} />
      <div className="grid gap-3 sm:grid-cols-4"><Field label="از موجودی کدام مالک"><Select value={f.owner} onChange={(v) => setF({ ...f, owner: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="انبار"><Select value={f.wh} onChange={(v) => setF({ ...f, wh: v })} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} /></Field><Field label={`تعداد (موجود: ${fa(avail)})`}><Input type="number" min={1} className="ltr text-left font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} /></Field><Field label="قیمت فروش هر عدد"><Input type="number" className="ltr text-left font-mono" value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} /></Field></div>
      <div className="rounded-xl border border-line p-3"><p className="mb-2 text-12 font-semibold">پیش‌نمایش سهم‌ها</p><SaleBreakdown x={preview} /></div></div>
  </Modal>
}

/* ───────── تسویه ───────── */
function SettleTab() {
  const d = useDB(); const s = d.stock; const [pay, setPay] = useState<{ from: string; to: string; amount: number } | null>(null)
  const pairs = balances(s)
  return <div className="space-y-4">
    <div className="grid gap-3 lg:grid-cols-2">{pairs.map((b) => { const from = b.net >= 0 ? b.a : b.b; const to = b.net >= 0 ? b.b : b.a; const flows = s.sales.flatMap((x) => split(s, x).flows.filter((f) => (f.from === b.a && f.to === b.b) || (f.from === b.b && f.to === b.a)).map((f) => ({ ...f, x })))
      return <Card key={b.a + b.b} title={<span className="flex items-center gap-2"><PartyChip s={s} id={b.a} />و<PartyChip s={s} id={b.b} /></span>} actions={b.net !== 0 && <Button size="sm" variant="primary" icon={<HandCoins size={13} />} onClick={() => setPay({ from, to, amount: Math.abs(b.net) })}>ثبت پرداخت تسویه</Button>}>
        <p className="text-15">{b.net === 0 ? <span className="text-success">مانده صفر است.</span> : <><b>{partyName(s, from)}</b> به <b>{partyName(s, to)}</b> <b className="text-warning">{toman(Math.abs(b.net))}</b> بدهکار است.</>}</p>
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-12">{flows.map((f, i) => <li key={i} className="flex justify-between gap-2 border-b border-line py-1 last:border-0"><span>{pv(d, f.x.productId, f.x.variationId).full} ×{fa(f.x.qty)} · {chName(s, f.x.channel)} <span className="text-t2">({f.why})</span></span><span className="shrink-0 font-mono">{partyName(s, f.from)} ← {partyName(s, f.to)}: {num(f.amount)}</span></li>)}
          {s.settlements.filter((t) => [t.from, t.to].includes(b.a) && [t.from, t.to].includes(b.b)).map((t) => <li key={t.id} className="flex justify-between gap-2 py-1 text-success"><span>پرداخت تسویه {t.note ? `· ${t.note}` : ''} · {rel(t.at)}</span><span className="font-mono">−{num(t.amount)}</span></li>)}</ul>
      </Card> })}</div>
    <Card pad={false} title="پرداخت‌های تسویه"><DataTable name="پرداخت‌های تسویه" empty={{ title: 'پرداختی ثبت نشده است' }} rows={s.settlements} rowKey={(t) => t.id} cols={[{ key: 'id', title: 'شناسه', render: (t) => <span className="font-mono text-12">{t.id}</span> }, { key: 'f', title: 'پرداخت‌کننده', render: (t) => <PartyChip s={s} id={t.from} /> }, { key: 't', title: 'دریافت‌کننده', render: (t) => <PartyChip s={s} id={t.to} /> }, { key: 'a', title: 'مبلغ', render: (t) => toman(t.amount), sort: (t) => t.amount }, { key: 'r', title: 'شمارهٔ پیگیری', render: (t) => <bdi dir="ltr" className="font-mono text-12">{t.ref}</bdi> }, { key: 'b', title: 'ثبت', render: (t) => <span className="text-12 text-t2">{t.by} · {rel(t.at)}</span> }]} /></Card>
    <SettleModal v={pay} onClose={() => setPay(null)} />
  </div>
}

function SettleModal({ v, onClose }: { v: { from: string; to: string; amount: number } | null; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [amount, setAmount] = useState(0); const [ref, setRef] = useState(''); const [note, setNote] = useState('')
  const a = amount || v?.amount || 0
  const save = () => { if (!v) return; mutate((x) => { x.stock.settlements.unshift({ id: uid('ST'), at: new Date().toISOString(), from: v.from, to: v.to, amount: a, ref, by: by(), note }) }, { action: 'ثبت پرداخت تسویه بین شرکا', target: `${partyName(s, v.from)} ← ${partyName(s, v.to)}: ${num(a)}` }); toast('پرداخت تسویه ثبت شد و از مانده کم شد.'); setAmount(0); setRef(''); setNote(''); onClose() }
  return <Modal open={!!v} onClose={onClose} title="ثبت پرداخت تسویه" footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={!ref.trim() || a <= 0} onClick={save}>ثبت پرداخت</Button></>}>
    {v && <div className="space-y-3"><p className="text-13"><b>{partyName(s, v.from)}</b> به <b>{partyName(s, v.to)}</b> · مانده: {toman(v.amount)}</p><Field label="مبلغ پرداختی (تومان)" help="پرداخت بخشی از مانده هم مجاز است"><Input type="number" className="ltr text-left font-mono" value={a} onChange={(e) => setAmount(+e.target.value)} /></Field><Field label="شمارهٔ پیگیری بانکی"><Input className="ltr text-left font-mono" value={ref} onChange={(e) => setRef(e.target.value)} /></Field><Field label="یادداشت (اختیاری)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>}
  </Modal>
}

/* ───────── کدگذاری و بارکد ───────── */
function CodesTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [f, setF] = useState({ code: '', pid: 'prx', vid: 'var-prx-blk', owner: 'ys', note: '' })
  const rows = useMemo(() => productsWithLots(d).flatMap((p) => (p.variations?.length ? p.variations.map((v) => ({ p, vid: v.id as string | undefined })) : [{ p, vid: undefined }])), [d])
  const dup = !!f.code && (s.codes.some((c) => c.code.toUpperCase() === f.code.trim().toUpperCase()))
  return <div className="space-y-4">
    <Card title="قاعدهٔ کد" hint="هر کالای متمایز (کالا + رنگ و ویژگی) یک کد دارد، نه هر عدد. پیشوند کد مالک را نشان می‌دهد؛ مثلاً یک هدفون مشکی: کد غنیمت با GH و کد یاسین با YS.">
      <div className="flex flex-wrap items-end gap-4"><Field label="جداکننده"><Select className="w-28" value={s.codeRule.sep} onChange={(v) => mutate((x) => { x.stock.codeRule.sep = v })} options={[['-', 'خط تیره (-)'], ['', 'بدون جداکننده']]} /></Field><Toggle on={s.codeRule.withVariant} onChange={(v) => mutate((x) => { x.stock.codeRule.withVariant = v }, { action: 'تغییر قاعدهٔ کد تنوع', target: v ? 'با پسوند تنوع' : 'بدون پسوند' })} text="پسوند تنوع (رنگ) در انتهای کد" /><p className="text-12 text-t2">نمونه: <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, 'gh', 'prx', 'var-prx-blk')}</bdi> و <bdi dir="ltr" className="font-mono font-bold">{codeFor(d, 'ys', 'prx', 'var-prx-blk')}</bdi></p></div>
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
  return <div className="grid gap-4 xl:grid-cols-2">
    <Card title={<span className="flex items-center gap-1.5"><Users size={15} />شرکا و تأمین‌کنندگان</span>} hint="هر شریک یک پیشوند کد دارد (۲ تا ۴ حرف لاتین).">
      <ul className="mb-3 space-y-1.5">{s.parties.map((p) => <li key={p.id} className="flex items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-13"><PartyChip s={s} id={p.id} /><span className="flex-1 text-12 text-t2">{p.kind === 'self' ? 'خودمان' : `شریک${p.site ? ` · سایت ${p.site}` : ''}`}</span>{p.kind !== 'self' && <Toggle on={p.active} onChange={(v) => mutate((x) => { const q = x.stock.parties.find((y) => y.id === p.id); if (q) q.active = v }, { action: v ? 'فعال‌سازی شریک' : 'غیرفعال‌سازی شریک', target: p.name })} />}</li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_.6fr_.8fr_auto] sm:items-end"><Field label="نام شریک"><Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="مثلاً شعبهٔ شیراز" /></Field><Field label="پیشوند کد" error={pfxBad ? 'تکراری یا نامعتبر' : undefined}><Input className="ltr text-left font-mono uppercase" value={np.prefix} onChange={(e) => setNp({ ...np, prefix: e.target.value.toUpperCase() })} placeholder="SH" /></Field><Field label="سایت خودش (اختیاری)"><Input className="ltr text-left" value={np.site} onChange={(e) => setNp({ ...np, site: e.target.value })} /></Field>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!np.name.trim() || !np.prefix || pfxBad} onClick={() => { const id = np.prefix.toLowerCase(); mutate((x) => { x.stock.parties.push({ id, name: np.name.trim(), prefix: np.prefix.toUpperCase(), kind: 'partner', color: COLORS[x.stock.parties.length % COLORS.length], site: np.site || undefined, active: true }); x.stock.parties.filter((p) => p.id !== id).forEach((p) => { x.stock.agreements.push({ owner: p.id, seller: id, sellerPct: 30 }, { owner: id, seller: p.id, sellerPct: 25 }) }) }, { action: 'افزودن شریک تازه', target: np.name }); toast(`«${np.name}» اضافه شد؛ قرارداد سهم پیش‌فرض با بقیه ساخته شد و قابل ویرایش است.`); setNp({ name: '', prefix: '', site: '' }) }}>افزودن</Button></div>
    </Card>
    <Card title={<span className="flex items-center gap-1.5"><Warehouse size={15} />انبارها و شهرها</span>} hint="گردانندهٔ انبار کسی است که کالا را بسته‌بندی و ارسال می‌کند؛ اگر کالای دیگری را ارسال کند، هزینهٔ ارسال هر عدد به او تعلق می‌گیرد.">
      <ul className="mb-3 space-y-1.5">{s.warehouses.map((w) => <li key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-13"><Building2 size={14} className="text-t2" /><b>{w.name}</b><span className="text-12 text-t2">{w.city} · گرداننده: {partyName(s, w.operator)}</span><span className="flex-1" /><label className="flex items-center gap-1 text-11 text-t2">هزینهٔ ارسال هر عدد<Input type="number" className="ltr h-8 w-28 text-left font-mono" value={w.handlingFee} onChange={(e) => mutate((x) => { const q = x.stock.warehouses.find((y) => y.id === w.id); if (q) q.handlingFee = Math.max(0, +e.target.value) })} /></label></li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_.8fr_.8fr_.7fr_auto] sm:items-end"><Field label="نام انبار"><Input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} placeholder="انبار شیراز" /></Field><Field label="شهر"><Input value={nw.city} onChange={(e) => setNw({ ...nw, city: e.target.value })} /></Field><Field label="گرداننده"><Select value={nw.operator} onChange={(v) => setNw({ ...nw, operator: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="هزینهٔ ارسال"><Input type="number" className="ltr text-left font-mono" value={nw.fee} onChange={(e) => setNw({ ...nw, fee: +e.target.value })} /></Field>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!nw.name.trim() || !nw.city.trim()} onClick={() => { mutate((x) => { x.stock.warehouses.push({ id: `wh${Date.now().toString(36).slice(-4)}`, name: nw.name.trim(), city: nw.city.trim(), operator: nw.operator, handlingFee: nw.fee, active: true }) }, { action: 'افزودن انبار تازه', target: nw.name }); setNw({ name: '', city: '', operator: 'gh', fee: 0 }) }}>افزودن</Button></div>
    </Card>
    <Card title={<span className="flex items-center gap-1.5"><ReceiptText size={15} />کانال‌های فروش</span>} hint="«فروشنده» کسی است که فروش را انجام داده و سهم فروشنده می‌گیرد؛ «پول دست» کسی است که مبلغ مشتری به حسابش می‌رود.">
      <ul className="mb-3 space-y-1.5">{s.channels.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-12"><b className="text-13">{c.name}</b><span className="text-t2">برند: {c.brand}</span><span className="flex-1" />فروشنده <PartyChip s={s} id={c.seller} /> پول دست <PartyChip s={s} id={c.collector} /></li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_.7fr_.7fr_.7fr_auto] sm:items-end"><Field label="نام کانال"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field><Field label="فروشنده"><Select value={nc.seller} onChange={(v) => setNc({ ...nc, seller: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="پول دست"><Select value={nc.collector} onChange={(v) => setNc({ ...nc, collector: v })} options={s.parties.map((p) => [p.id, p.name] as [string, string])} /></Field><Field label="برند"><Input value={nc.brand} onChange={(e) => setNc({ ...nc, brand: e.target.value })} /></Field>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!nc.name.trim()} onClick={() => { mutate((x) => { x.stock.channels.push({ id: `ch${Date.now().toString(36).slice(-4)}`, name: nc.name.trim(), seller: nc.seller, collector: nc.collector, brand: nc.brand, active: true }) }, { action: 'افزودن کانال فروش', target: nc.name }); setNc({ ...nc, name: '' }) }}>افزودن</Button></div>
    </Card>
    <Card title={<span className="flex items-center gap-1.5"><HandCoins size={15} />قرارداد سهم (درصد سود برای فروشنده)</span>} hint="ردیف: مالک کالا · ستون: فروشنده. عدد یعنی فروشنده چند درصد از سود را نگه می‌دارد؛ بقیهٔ سود به‌اضافهٔ بهای تمام‌شده به مالک می‌رسد.">
      <div className="overflow-x-auto"><table className="w-full text-12"><thead><tr><th className="p-2 text-right text-t2">مالک ↓ / فروشنده ←</th>{s.parties.map((p) => <th key={p.id} className="p-2"><PartyChip s={s} id={p.id} /></th>)}</tr></thead>
        <tbody>{s.parties.map((o) => <tr key={o.id} className="border-t border-line"><td className="p-2"><PartyChip s={s} id={o.id} /></td>{s.parties.map((sl) => <td key={sl.id} className="p-2 text-center">{o.id === sl.id ? <span className="text-t3">—</span> : <span className="inline-flex items-center gap-1"><Input type="number" min={0} max={100} className="ltr h-8 w-16 text-center font-mono" value={s.agreements.find((a) => a.owner === o.id && a.seller === sl.id)?.sellerPct ?? 0} onChange={(e) => setPct(o.id, sl.id, Math.min(100, Math.max(0, +e.target.value)))} />٪</span>}</td>)}</tr>)}</tbody></table></div>
      <div className="mt-3 rounded-lg bg-neutral-bg p-3 text-12 leading-6"><b>نمونه با اعداد فعلی:</b> هدفون ریمکس با بهای تمام‌شدهٔ ۱٬۶۰۰٬۰۰۰ و فروش ۲٬۹۰۰٬۰۰۰ (سود ۱٬۳۰۰٬۰۰۰). اگر یاسین کالای غنیمت را بفروشد، {fa(s.agreements.find((a) => a.owner === 'gh' && a.seller === 'ys')?.sellerPct ?? 0)}٪ سود ({toman(Math.round(1300000 * (s.agreements.find((a) => a.owner === 'gh' && a.seller === 'ys')?.sellerPct ?? 0) / 100))}) مال یاسین است و {toman(2900000 - Math.round(1300000 * (s.agreements.find((a) => a.owner === 'gh' && a.seller === 'ys')?.sellerPct ?? 0) / 100))} به غنیمت می‌رسد.</div>
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
