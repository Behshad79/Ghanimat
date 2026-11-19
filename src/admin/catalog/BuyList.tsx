import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, PackagePlus, Plus, Star, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, getDB, mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import { saveBlob, toPdf } from '@/shared/lib/printOut'
import type { BuyItem, DB, Product } from '@/shared/data/seed'
import { IN_ROUTES } from '@/shared/data/incoming'
import { ProductImg } from '../pages/_shared'
import { stockOf } from './Catalog'

const CURS = ['دلار', 'درهم', 'دینار', 'تومان']
/** شاخص‌های فروش هر کالا در بازهٔ اخیر: تعداد، فروش، سود، سرعت فروش و روزهای پوشش موجودی */
export function salesStats(d: DB, days = 90) {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const m = new Map<string, { units: number; revenue: number; profit: number }>()
  d.orders.filter((o) => o.createdAt >= since && !['order.cancelled', 'order.returned'].includes(o.status)).forEach((o) => o.shipments.forEach((s) => s.items.filter((i) => !i.cancelled).forEach((i) => {
    const p = d.products.find((x) => x.id === i.productId); const u = d.units.find((x) => x.id === i.unitId); const cost = u?.cost || p?.cost || 0; const q = Number(i.qty) || 1
    const r = m.get(i.productId) ?? { units: 0, revenue: 0, profit: 0 }; r.units += q; r.revenue += i.price * q; r.profit += cost ? (i.price - cost) * q : 0; m.set(i.productId, r) })))
  return d.products.filter((p) => !['product.incoming'].includes(p.status)).map((p) => { const r = m.get(p.id) ?? { units: 0, revenue: 0, profit: 0 }; const stock = stockOf(d, p); const perDay = r.units / days; return { p, ...r, stock, perDay, cover: perDay ? stock / perDay : Infinity } })
}

/** لیست خرید روزانه: اقلامی که باید در خرید بعدی بیاید، با گزارش پرفروش، سریع‌فروش، پرسود و تمام‌شده؛ خروجی PDF و تبدیل به سفارش خرید */
export function BuyList() {
  const d = useDB(); const nav = useNavigate(); const sheet = useRef<HTMLDivElement>(null)
  const [days, setDays] = useState<'30' | '90'>('90'); const [rep, setRep] = useState<'best' | 'fast' | 'profit' | 'out'>('best')
  const stats = useMemo(() => salesStats(d, +days), [d.orders, d.products, d.units, days])
  const inList = (pid: string) => d.buyList.some((b) => b.productId === pid && b.status === 'در لیست')
  const ranked = rep === 'best' ? [...stats].filter((s) => s.units).sort((a, b) => b.units - a.units) : rep === 'fast' ? [...stats].filter((s) => s.units).sort((a, b) => a.cover - b.cover) : rep === 'profit' ? [...stats].filter((s) => s.profit > 0).sort((a, b) => b.profit - a.profit) : stats.filter((s) => s.stock <= (d.storeCfg.pdp.lowStock ?? 3)).sort((a, b) => b.units - a.units)
  const REASON = { best: 'پرفروش', fast: 'سریع‌فروش', profit: 'پرسود', out: 'تمام‌شده یا رو به اتمام' } as const
  const add = (it: Omit<BuyItem, 'id' | 'addedAt' | 'by' | 'status'>) => mutate((x) => { x.buyList.unshift({ ...it, id: `bl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, addedAt: new Date().toISOString(), by: currentUser()?.name ?? 'کاربر', status: 'در لیست' }) }, { action: 'افزودن به لیست خرید', target: it.name })
  const addFromStat = (p: Product, why: string, units: number) => { if (inList(p.id)) return toast('این کالا از قبل در لیست خرید است.'); add({ productId: p.id, name: p.title, qty: Math.max(1, Math.ceil(units / 3)), targetCost: p.costFx, currency: p.currency ?? 'دلار', must: false, reason: why }); toast(`«${p.title}» به لیست خرید اضافه شد.`) }
  const list = [...d.buyList].filter((b) => b.status === 'در لیست').sort((a, b) => Number(b.must) - Number(a.must) || b.addedAt.localeCompare(a.addedAt))
  const ordered = d.buyList.filter((b) => b.status === 'سفارش داده شد')
  const [sel, setSel] = useState<string[]>([]); const [po, setPo] = useState(false)
  const setB = (id: string, p: Partial<BuyItem>) => mutate((x) => { Object.assign(x.buyList.find((y) => y.id === id)!, p) })
  const pdf = async () => { if (!list.length) return toast('لیست خرید خالی است.', { tone: 'err' }); const el = sheet.current; if (!el) return; el.style.display = 'block'; try { const blob = await toPdf([{ el, paper: 'A4' }]); saveBlob(blob, `ghanimat-buy-list-${new Date().toISOString().slice(0, 10)}.pdf`); toast('PDF لیست خرید ساخته شد؛ برای خریدار بفرستید.') } catch (e) { toast((e as Error).message, { tone: 'err' }) } finally { el.style.display = 'none' } }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card title={<span className="flex items-center gap-2">لیست خرید بعدی<Badge dot={false}>{fa(list.length)} قلم</Badge>{list.some((b) => b.must) && <Badge tone="warning" dot={false}>{fa(list.filter((b) => b.must).length)} حتماً</Badge>}</span>}
          actions={<span className="flex flex-wrap gap-2"><Button size="sm" icon={<FileDown size={13} />} onClick={pdf}>PDF برای خریدار</Button><Button size="sm" variant="primary" icon={<PackagePlus size={13} />} disabled={!sel.length} onClick={() => setPo(true)}>سفارش خرید از انتخاب‌شده‌ها ({fa(sel.length)})</Button></span>}>
          <QuickAdd onAdd={(it) => { add(it); toast('به لیست خرید اضافه شد.') }} />
          {list.length === 0 ? <p className="mt-3 rounded-xl bg-surface-2 py-6 text-center text-12 text-t2">لیست خالی است. از گزارش کناری یا فرم بالا اضافه کنید.</p>
            : <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['', 'حتماً', 'کالا', 'دلیل', 'تعداد', 'قیمت هدف', 'یادداشت برای خریدار', ''].map((h, i) => <th key={i} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
              <tbody>{list.map((b) => <tr key={b.id} className={cx('border-t border-line', b.must && 'bg-warning-bg/30')}>
                <td className="p-2"><input type="checkbox" aria-label={`انتخاب ${b.name}`} checked={sel.includes(b.id)} onChange={() => setSel(sel.includes(b.id) ? sel.filter((x) => x !== b.id) : [...sel, b.id])} /></td>
                <td className="p-2"><button type="button" aria-label={b.must ? 'برداشتن «حتماً»' : 'علامت «حتماً»'} aria-pressed={b.must} onClick={() => setB(b.id, { must: !b.must })} className={b.must ? 'text-warning' : 'text-t3 hover:text-warning'}><Star size={16} fill={b.must ? 'currentColor' : 'none'} /></button></td>
                <td className="p-2"><span className="flex items-center gap-2">{b.productId && <ProductImg pid={b.productId} size={28} />}<span><b className="line-clamp-1">{b.name}</b>{b.productId && <span className="text-11 text-t2">موجودی فعلی {fa(stockOf(d, d.products.find((p) => p.id === b.productId) ?? ({} as Product)) || 0)}</span>}</span></span></td>
                <td className="p-2"><Badge dot={false} tone={b.reason === 'دستی' ? 'neutral' : 'info'}>{b.reason}</Badge><span className="block text-[10px] text-t3">{b.by}</span></td>
                <td className="p-2"><Input aria-label={`تعداد ${b.name}`} className="ltr h-8 w-16 text-center" inputMode="numeric" value={b.qty} onChange={(e) => setB(b.id, { qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></td>
                <td className="p-2"><span className="flex items-center gap-1"><Input aria-label={`قیمت هدف ${b.name}`} className="ltr h-8 w-24 text-left" inputMode="decimal" value={b.targetCost ?? ''} onChange={(e) => setB(b.id, { targetCost: Number(e.target.value.replace(/[^\d.]/g, '')) || undefined })} /><span className="text-11 text-t2">{b.currency}</span></span></td>
                <td className="p-2"><Input aria-label={`یادداشت ${b.name}`} className="h-8 min-w-40 text-12" value={b.note ?? ''} placeholder="مثلاً رنگ، مدل، حداکثر قیمت" onChange={(e) => setB(b.id, { note: e.target.value })} /></td>
                <td className="p-2"><button type="button" aria-label={`حذف ${b.name}`} className="text-t3 hover:text-danger" onClick={() => mutate((x) => { x.buyList = x.buyList.filter((y) => y.id !== b.id) }, { action: 'حذف از لیست خرید', target: b.name })}><Trash2 size={14} /></button></td>
              </tr>)}</tbody></table></div>}
          {ordered.length > 0 && <p className="mt-2 text-11 text-t2">{fa(ordered.length)} قلم قبلاً سفارش داده شده و در «سفارش‌ها و محموله‌ها» است.</p>}
        </Card>
        <Card title="گزارش پیشنهاد خرید" actions={<Segmented size="sm" value={days} onChange={setDays} options={[['30', '۳۰ روز'], ['90', '۹۰ روز']]} />}>
          <Segmented size="sm" value={rep} onChange={setRep} options={[['best', 'پرفروش'], ['fast', 'سریع‌فروش'], ['profit', 'پرسود'], ['out', 'تمام‌شده']]} />
          <p className="mt-2 text-11 text-t2">{rep === 'best' ? 'بیشترین تعداد فروش در بازه.' : rep === 'fast' ? 'کمترین روز تا تمام‌شدن موجودی فعلی با سرعت فروش اخیر.' : rep === 'profit' ? 'بیشترین سود ناخالص (فروش منهای قیمت تمام‌شده).' : 'موجودی صفر یا زیر آستانهٔ کمبود.'}</p>
          <ul className="mt-2 divide-y divide-line">{ranked.slice(0, 10).map((s, i) => <li key={s.p.id} className="flex items-center gap-2 py-2 text-12">
            <span className="tnum w-5 text-t3">{fa(i + 1)}</span><ProductImg pid={s.p.id} size={30} />
            <button type="button" className="min-w-0 flex-1 text-right hover:text-brand" onClick={() => nav(`/admin/catalog/${s.p.id}`)}><b className="line-clamp-1">{s.p.title}</b><span className="text-11 text-t2">{fa(s.units)} فروش · {s.profit ? `سود ${toman(s.profit)}` : 'سود نامعلوم'} · موجودی {fa(s.stock)}{s.cover !== Infinity ? ` (${fa(Math.round(s.cover))} روز)` : ''}</span></button>
            {inList(s.p.id) ? <Badge dot={false} tone="success">در لیست</Badge> : <Button size="sm" icon={<Plus size={12} />} onClick={() => addFromStat(s.p, REASON[rep], s.units)}>لیست</Button>}
          </li>)}{!ranked.length && <li className="py-6 text-center text-12 text-t2">موردی نیست.</li>}</ul>
        </Card>
      </div>
      <div ref={sheet} style={{ display: 'none', width: '210mm' }} className="doc-sheet bg-white p-[12mm] text-black" dir="rtl">
        <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-2"><b className="text-18">لیست خرید غنیمت</b><span className="text-12">{new Date().toLocaleDateString('fa-IR', { dateStyle: 'full' })}</span></div>
        <table className="w-full border-collapse text-12"><thead><tr>{['#', 'کالا', 'تعداد', 'قیمت هدف', 'یادداشت', '✓'].map((h) => <th key={h} className="border border-black p-1.5 text-right">{h}</th>)}</tr></thead>
          <tbody>{list.map((b, i) => <tr key={b.id}><td className="border border-black p-1.5">{fa(i + 1)}</td><td className="border border-black p-1.5">{b.must && '★ '}<b>{b.name}</b></td><td className="border border-black p-1.5 text-center">{fa(b.qty)}</td><td className="border border-black p-1.5">{b.targetCost ? `${fa(b.targetCost)} ${b.currency}` : '—'}</td><td className="border border-black p-1.5">{b.note}</td><td className="w-8 border border-black p-1.5" /></tr>)}</tbody></table>
        <p className="mt-3 text-11">★ = حتماً بخرید. جمع اقلام: {fa(list.length)} · جمع تعداد: {fa(list.reduce((a, b) => a + b.qty, 0))}</p>
      </div>
      {po && <NewPO items={list.filter((b) => sel.includes(b.id))} onClose={() => { setPo(false); setSel([]) }} />}
    </div>
  )
}

function QuickAdd({ onAdd }: { onAdd: (it: Omit<BuyItem, 'id' | 'addedAt' | 'by' | 'status'>) => void }) {
  const d = useDB(); const [pid, setPid] = useState(''); const [name, setName] = useState(''); const [qty, setQty] = useState('1'); const [cost, setCost] = useState(''); const [cur, setCur] = useState('دلار'); const [must, setMust] = useState(false); const [note, setNote] = useState('')
  return <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
    <Field label="از کاتالوگ"><Select className="w-56" value={pid} other={false} placeholder="کالای موجود…" onChange={(v) => { setPid(v); const p = d.products.find((x) => x.id === v); if (p) { setName(p.title); if (p.currency) setCur(p.currency); if (p.costFx) setCost(String(p.costFx)) } }} options={[['', '—'], ...d.products.map((p) => [p.id, p.title] as [string, string])]} /></Field>
    <Field label="یا کالای تازه"><Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و مدل" /></Field>
    <Field label="تعداد"><Input className="ltr w-16 text-center" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} /></Field>
    <Field label="قیمت هدف"><span className="flex gap-1"><Input className="ltr w-24 text-left" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} /><Select className="w-24" value={cur} other={false} onChange={setCur} options={CURS} /></span></Field>
    <Field label="یادداشت"><Input className="w-44" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    <div className="flex h-9 items-center"><Toggle on={must} onChange={setMust} text="حتماً" /></div>
    <Button icon={<Plus size={14} />} onClick={() => { if (!name.trim() || !Number(qty)) return toast('نام و تعداد را بنویسید.', { tone: 'err' }); onAdd({ productId: pid || undefined, name: name.trim(), qty: Number(qty), targetCost: Number(cost) || undefined, currency: cur, must, note: note.trim() || undefined, reason: 'دستی' }); setPid(''); setName(''); setQty('1'); setCost(''); setMust(false); setNote('') }}>افزودن</Button>
  </div>
}

/** سفارش خرید تازه: یک محمولهٔ «خرید شد» با اقلام انتخاب‌شده (یا خالی) */
export function NewPO({ items = [], onClose }: { items?: BuyItem[]; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const [title, setTitle] = useState(`خرید ${new Date().toLocaleDateString('fa-IR', { month: 'long' })}`); const [sup, setSup] = useState(d.entities.suppliers?.[0]?.name ?? ''); const [route, setRoute] = useState(IN_ROUTES[0]); const [cur, setCur] = useState(items[0]?.currency ?? 'دلار'); const [eta, setEta] = useState(new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10))
  const create = () => { const id = `IN-${Date.now().toString(36).slice(-5).toUpperCase()}`; const rate = getDB().storeCfg.fx.rates[cur as 'دلار'] ?? 1
    mutate((x) => { x.incoming.unshift({ id, title: title.trim() || 'سفارش خرید', route, supplier: sup, orderedAt: new Date().toISOString(), eta: new Date(eta).toISOString(), stage: 'خرید شد', currency: cur, rate: cur === 'تومان' ? 1 : rate, freight: 0, customs: 0, other: 0, paid: 0, items: items.map((b, i) => ({ id: `ii${Date.now().toString(36)}${i}`, name: b.name, qty: b.qty, unitCost: b.targetCost, productId: b.productId, note: b.note })) })
      x.buyList.forEach((b) => { if (items.some((y) => y.id === b.id)) { b.status = 'سفارش داده شد'; b.batchId = id } }) }, { action: 'ثبت سفارش خرید', target: `${id} · ${items.length} قلم` })
    toast(`سفارش خرید ${id} ثبت شد؛ اقلام، هزینه‌ها و مسیر را در «سفارش‌ها و محموله‌ها» کامل کنید.`); onClose(); nav('/admin/supply?tab=ledger') }
  return <Modal open onClose={onClose} title="سفارش خرید تازه" footer={<><Button variant="primary" onClick={create}>ثبت سفارش خرید</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="عنوان"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="تأمین‌کننده"><Select value={sup} onChange={setSup} options={(d.entities.suppliers ?? []).map((s) => s.name)} /></Field>
      <Field label="مسیر"><Select value={route} onChange={setRoute} options={IN_ROUTES} /></Field>
      <Field label="ارز خرید"><Select value={cur} other={false} onChange={setCur} options={CURS} /></Field>
      <Field label="رسیدن تقریبی"><Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
    </div>
    {items.length > 0 && <ul className="mt-3 space-y-1 rounded-xl bg-surface-2 p-2 text-12">{items.map((b) => <li key={b.id} className="flex justify-between"><span>{b.must && '★ '}{b.name}</span><span className="tnum">{fa(b.qty)} عدد{b.targetCost ? ` · ${fa(b.targetCost)} ${b.currency}` : ''}</span></li>)}</ul>}
    <p className="mt-2 text-11 text-t2">نرخ ارز از «نرخ روز» گذاشته می‌شود و بعداً قابل تغییر است. اقلام بیشتر را در کارت همین سفارش اضافه کنید.</p>
  </Modal>
}
