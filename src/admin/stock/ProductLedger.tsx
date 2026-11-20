import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, FileText, Printer, Scale, Search } from 'lucide-react'
import { Badge, Button, Card, Input, Segmented, Select } from '@/shared/ui/base'
import { Drawer, Modal, toast } from '@/shared/ui/overlay'
import { printSolo } from '@/shared/lib/printSolo'
import { canSecret, currentUser, myParty, useDB } from '@/shared/lib/store'
import { fa, num, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { split, type StockSale } from '@/shared/data/stock'
import { expired } from '@/shared/data/ledger'
import { payoutBetween, tranches } from '@/shared/data/payout'
import { chName, PartyChip, partyName, pv, whName } from './common'
import { SaleBreakdown } from './Ownership'
import { OrderPeek } from '../orders/OrderPeek'

const PERIODS: [string, string][] = [['30', '۳۰ روز'], ['90', '۹۰ روز'], ['365', 'یک سال'], ['all', 'از ابتدا']]
const day = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')
const dtm = (iso: string) => new Date(iso).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })

/** یک ردیف گردش: ورود، فروش، برگشت از مشتری یا برگشت به مالک */
type Mv = { at: string; kind: 'in' | 'move' | 'sale' | 'back' | 'owner' | 'adj'; doc: string; orderId?: string; qty: number; note: string; wh: string; sale?: StockSale
  price?: number; disc?: number; fee?: number; revenue?: number; cost?: number; owner?: number; seller?: number; sellerId?: string; handling?: number; pay?: string }
type Group = { key: string; owner: string; pid: string; vid?: string; name: string; onHand: number; hold: number; sold: number; back: number; ownerRet: number; adj: number; received: number
  pSold: number; pBack: number; revenue: number; costT: number; ownerTotal: number; sellerShare: number; handling: number; disc: number; fee: number; orders: number; last?: string; mv: Mv[] }

const KIND: Record<Mv['kind'], [string, 'neutral' | 'info' | 'success' | 'danger' | 'warning']> = { in: ['ورود موجودی', 'info'], move: ['انتقال بین انبار', 'neutral'], sale: ['فروش', 'success'], back: ['برگشت از مشتری', 'danger'], owner: ['برگشت به مالک', 'warning'], adj: ['تغییر دستی', 'neutral'] }

/** محاسبهٔ گردش هر کالا × تنوع × مالک؛ ورودی کل از اتحاد «موجودی فعلی + فروش خالص + برگشت به مالک» به دست می‌آید تا هر عدد قابل ردیابی باشد */
export function ledgerGroups(d: DB, f: { owner: string; wh: string; since: number; q: string }) {
  const s = d.stock; const m = new Map<string, Group>()
  const g = (owner: string, pid: string, vid?: string) => { const k = `${owner}|${pid}|${vid ?? ''}`; let x = m.get(k); if (!x) { x = { key: k, owner, pid, vid, name: pv(d, pid, vid).full, onHand: 0, hold: 0, sold: 0, back: 0, ownerRet: 0, adj: 0, received: 0, pSold: 0, pBack: 0, revenue: 0, costT: 0, ownerTotal: 0, sellerShare: 0, handling: 0, disc: 0, fee: 0, orders: 0, mv: [] }; m.set(k, x) } return x }
  const okOwner = (o: string) => f.owner === 'all' || o === f.owner; const okWh = (w: string) => f.wh === 'all' || w === f.wh
  s.lots.forEach((l) => { if (!okOwner(l.owner) || !okWh(l.warehouse)) return; const x = g(l.owner, l.productId, l.variationId)
    if (l.hold || expired(l)) x.hold += l.qty; else x.onHand += l.qty
    const back = (l.ref ?? '').startsWith('برگشت'); if (back) return
    const move = /انتقال/.test(l.ref ?? '')
    x.mv.push({ at: l.at, kind: move ? 'move' : 'in', doc: l.ref || l.id, qty: l.qty0 ?? l.qty, wh: l.warehouse, cost: l.cost, note: `${l.qty0 !== undefined ? `ورود ${fa(l.qty0)} عدد · باقی‌مانده ${fa(l.qty)}` : `باقی‌مانده از این ورود: ${fa(l.qty)}`}${l.batch ? ` · بچ ${l.batch}` : ''}${l.expiry ? ` · انقضا ${day(l.expiry)}` : ''}${l.hold ? ' · نگه‌داشته' : ''}` }) })
  const ords = new Map<string, Set<string>>()
  s.sales.forEach((x) => { if (!okOwner(x.owner) || !okWh(x.warehouse)) return; const G = g(x.owner, x.productId, x.variationId); const b = split(s, x)
    if (x.qty > 0) G.sold += x.qty; else G.back -= x.qty
    const T = tranches(d, x).filter((t) => t.from === x.owner || t.to === x.owner)
    const pay = x.owner === b.collector ? 'پول نزد خود مالک' : !T.length ? '—' : T.every((t) => t.state === 'payable') ? 'قابل تسویه' : T.map((t) => t.state === 'payable' ? 'قابل تسویه' : t.state === 'waiting_delivery' ? 'پس از تحویل' : t.at ? `از ${day(t.at)}` : 'در انتظار').join(' + ')
    G.mv.push({ at: x.at, kind: x.qty > 0 ? 'sale' : 'back', doc: x.orderId ?? x.ext ?? x.id, orderId: x.orderId, qty: -x.qty, wh: x.warehouse, sale: x, price: x.price, disc: b.disc, fee: b.fee, revenue: b.revenue, cost: b.costT, owner: b.ownerTotal, seller: x.owner === b.seller ? 0 : b.sellerShare, sellerId: b.seller, handling: b.handling, pay,
      note: `${chName(s, x.channel)}${x.auto ? ' · بدون اسکن' : ''}${x.note ? ` · ${x.note}` : ''}` })
    if (+new Date(x.at) < f.since) return
    if (x.qty > 0) G.pSold += x.qty; else G.pBack -= x.qty
    G.revenue += b.revenue; G.costT += b.costT; G.ownerTotal += b.ownerTotal; G.sellerShare += x.owner === b.seller ? 0 : b.sellerShare; G.handling += b.handling; G.disc += b.disc; G.fee += b.fee
    if (x.orderId) { const o = ords.get(G.key) ?? new Set(); o.add(x.orderId); ords.set(G.key, o) }
    if (!G.last || x.at > G.last) G.last = x.at })
  s.ownerReturns.forEach((r) => { if (!okOwner(r.owner) || !okWh(r.warehouse)) return; r.lines.forEach((ln) => { const G = g(r.owner, ln.productId, ln.variationId); G.ownerRet += ln.qty; G.mv.push({ at: r.at, kind: 'owner', doc: r.id, qty: -ln.qty, wh: r.warehouse, note: `${r.reason}${ln.batch ? ` · بچ ${ln.batch}` : ''} · تحویل‌گیرنده: ${r.receivedBy ?? '—'}` }) }) })
  ;(s.adjusts ?? []).forEach((a) => { if (!okOwner(a.owner) || !okWh(a.warehouse)) return; const G = g(a.owner, a.productId, a.variationId); if (a.kind === 'count' || a.kind === 'loss') G.adj += a.delta
    if (a.kind !== 'sale' && a.kind !== 'intake') G.mv.push({ at: a.at, kind: 'adj', doc: a.id, qty: a.delta, wh: a.warehouse, note: `${({ hold: 'کنار گذاشتن از فروش', release: 'برگشت به فروش', count: 'اصلاح شمارش', loss: 'خراب یا مفقود' } as Record<string, string>)[a.kind] ?? a.kind} · ${a.by}${a.note ? ` · ${a.note}` : ''}` }) })
  const q = f.q.trim()
  return [...m.values()].map((G) => ({ ...G, received: G.onHand + G.hold + (G.sold - G.back) + G.ownerRet - G.adj, orders: ords.get(G.key)?.size ?? 0, mv: G.mv.sort((a, b) => +new Date(b.at) - +new Date(a.at)) }))
    .filter((G) => !q || G.name.includes(q) || G.mv.some((v) => v.doc.includes(q))).sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, 'fa'))
}

/** گردش و کارت کالا: هر کالای هر مالک، محصول به محصول و سفارش به سفارش، با گزارش چاپی قابل امضا */
export function ProductLedgerTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const sec = canSecret(); const me = myParty()
  const money = sec || me !== 'gh' // دستیار بدون دسترسی محرمانه بهای تمام‌شده و سهم غنیمت را نمی‌بیند
  const [owner, setOwner] = useState(sec ? 'all' : me); const [wh, setWh] = useState('all'); const [period, setPeriod] = useState('90'); const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null); const [sale, setSale] = useState<StockSale | null>(null); const [peek, setPeek] = useState<string | null>(null)
  const since = period === 'all' ? 0 : Date.now() - Number(period) * 864e5
  const G = useMemo(() => ledgerGroups(d, { owner, wh, since, q }), [d, owner, wh, since, q])
  const sum = (k: keyof Group) => G.reduce((a, x) => a + (x[k] as number), 0)
  const printRef = useRef<HTMLDivElement>(null); const oneRef = useRef<HTMLDivElement>(null)
  const cur = G.find((x) => x.key === open)
  const po = owner !== 'all' && owner !== 'gh' ? payoutBetween(d, 'gh', owner) : null // مثبت: غنیمت به این شریک بدهکار است
  const ownersOpt: [string, string][] = sec ? [['all', 'همهٔ مالک‌ها'], ...s.parties.map((p) => [p.id, p.name] as [string, string])] : [[me, partyName(s, me)]]
  const csv = () => {
    const H = ['تاریخ', 'مالک', 'کالا', 'نوع', 'سند یا سفارش', 'انبار', 'تغییر موجودی', 'قیمت واحد', 'تخفیف', 'کارمزد', 'مبلغ خالص', ...(money ? ['بهای تمام‌شده', 'سهم مالک', 'سهم فروشنده', 'هزینهٔ انبار'] : []), 'وضعیت تسویه', 'شرح']
    const R = G.flatMap((g) => g.mv.filter((v) => +new Date(v.at) >= since).map((v) => [dtm(v.at), partyName(s, g.owner), g.name, KIND[v.kind][0], v.doc, whName(s, v.wh), String(v.qty), v.price ?? '', v.disc ?? '', v.fee ?? '', v.revenue ?? '', ...(money ? [v.cost ?? '', v.owner ?? '', v.seller ?? '', v.handling ?? ''] : []), v.pay ?? '', v.note]))
    const text = '﻿' + [H, ...R].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = `gardesh-kala-${owner}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); toast(`${fa(R.length)} ردیف گردش در فایل اکسل (CSV) ذخیره شد.`)
  }
  return <div className="space-y-4">
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-12"><span className="mb-1 block text-t2">مالک کالا</span><Select className="w-44" value={owner} onChange={setOwner} options={ownersOpt} /></label>
        <label className="text-12"><span className="mb-1 block text-t2">انبار</span><Select className="w-40" value={wh} onChange={setWh} options={[['all', 'همهٔ انبارها'], ...s.warehouses.map((w) => [w.id, w.name] as [string, string])]} /></label>
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        <label className="relative text-12"><span className="mb-1 block text-t2">جست‌وجوی کالا یا شمارهٔ سفارش</span><Search size={14} className="pointer-events-none absolute right-2.5 top-[30px] text-t3" /><Input className="w-56 pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً ریمکس یا GH-10540" /></label>
        <span className="flex-1" />
        <Button size="sm" icon={<Download size={13} />} onClick={csv}>خروجی اکسل</Button>
        <Button size="sm" variant="primary" icon={<Printer size={13} />} onClick={() => printSolo(printRef.current)}>چاپ گزارش کامل</Button>
      </div>
      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-neutral-bg px-3 py-2 text-12 text-t2"><Scale size={14} className="mt-0.5 shrink-0 text-brand" />هر کالا با یک اتحاد ساده کنترل می‌شود: <b className="text-t1">کل ورودی = موجودی فعلی + نگه‌داشته + فروش خالص + برگشت به مالک − اصلاح شمارش و خرابی</b>. هر ردیف فروش به سفارش یا سند خودش وصل است و مبلغ، تخفیف، کارمزد و سهم هر طرف را جدا نشان می‌دهد؛ دوره فقط ستون‌های فروش و مبلغ را فیلتر می‌کند.</p>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card><p className="text-12 text-t2">کالا و تنوع</p><p className="mt-1 text-20 font-bold">{fa(G.length)}</p><p className="text-11 text-t2">{fa(sum('received'))} عدد ورودی کل · {fa(sum('onHand'))} موجود</p></Card>
      <Card><p className="text-12 text-t2">فروش خالص این دوره</p><p className="mt-1 text-20 font-bold">{fa(sum('pSold') - sum('pBack'))} عدد</p><p className="text-11 text-t2">{fa(sum('pSold'))} فروش · {fa(sum('pBack'))} برگشت · {fa(G.reduce((a, x) => a + x.orders, 0))} سفارش</p></Card>
      <Card><p className="text-12 text-t2">مبلغ فروش خالص</p><p className="mt-1 text-20 font-bold">{toman(sum('revenue'))}</p><p className="text-11 text-t2">پس از {toman(sum('disc'))} تخفیف · کارمزد درگاه {toman(sum('fee'))}</p></Card>
      {money && <Card><p className="text-12 text-t2">{owner === 'all' ? 'سهم مالک‌ها' : `سهم ${partyName(s, owner)}`}</p><p className="mt-1 text-20 font-bold text-success">{toman(sum('ownerTotal'))}</p><p className="text-11 text-t2">بهای تمام‌شده {toman(sum('costT'))} + سود {toman(sum('ownerTotal') - sum('costT'))}</p></Card>}
      {po ? <Card><p className="text-12 text-t2">تسویه با {partyName(s, owner)}</p><p className={po.total >= 0 ? 'mt-1 text-20 font-bold text-success' : 'mt-1 text-20 font-bold text-danger'}>{toman(Math.abs(po.total))}</p><p className="text-11 text-t2">{po.total >= 0 ? `طلب ${partyName(s, owner)} از غنیمت` : `بدهی ${partyName(s, owner)} به غنیمت`} · قابل پرداخت الان {toman(Math.abs(po.payable))}</p></Card>
        : money && <Card><p className="text-12 text-t2">سهم فروشنده و انبار</p><p className="mt-1 text-20 font-bold">{toman(sum('sellerShare') + sum('handling'))}</p><p className="text-11 text-t2">فروشنده {toman(sum('sellerShare'))} · انبار {toman(sum('handling'))}</p></Card>}
    </div>
    <Card pad={false} title={<span className="flex items-center gap-1.5"><FileText size={15} />کارت هر کالا</span>} hint="روی هر ردیف بزنید تا گردش کامل همان کالا، سفارش به سفارش، باز شود.">
      {G.length === 0 ? <p className="p-5 text-12 text-t2">با این فیلترها کالایی پیدا نشد.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-12">
        <thead><tr className="border-b border-line text-right text-t2">{['کالا و تنوع', 'مالک', 'کل ورودی', 'موجود', 'نگه‌داشته', 'فروش خالص (کل)', 'برگشت به مالک', 'فروش این دوره', 'مبلغ خالص', ...(money ? ['سهم مالک'] : []), 'میانگین قیمت', 'آخرین فروش', ''].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
        <tbody>{G.map((x) => { const net = x.sold - x.back; const pnet = x.pSold - x.pBack; return <tr key={x.key} onClick={() => setOpen(x.key)} className="cursor-pointer border-b border-line/60 hover:bg-neutral-bg/60">
          <td className="px-3 py-2.5 font-medium">{x.name}</td><td className="px-3"><PartyChip s={s} id={x.owner} /></td>
          <td className="px-3 font-mono">{fa(x.received)}</td><td className="px-3 font-mono">{fa(x.onHand)}</td><td className="px-3 font-mono text-warning">{x.hold ? fa(x.hold) : '—'}</td>
          <td className="px-3 font-mono">{fa(net)}{x.back ? <span className="block text-[10px] text-danger">{fa(x.back)} برگشتی</span> : null}</td><td className="px-3 font-mono">{x.ownerRet ? fa(x.ownerRet) : '—'}</td>
          <td className="px-3 font-mono">{fa(pnet)}<span className="block text-[10px] text-t3">{fa(x.orders)} سفارش</span></td><td className="px-3">{toman(x.revenue)}</td>{money && <td className="px-3 text-success">{toman(x.ownerTotal)}</td>}
          <td className="px-3">{pnet ? toman(Math.round(x.revenue / pnet)) : '—'}</td><td className="px-3 text-t2">{x.last ? day(x.last) : '—'}</td>
          <td className="px-3"><span className="whitespace-nowrap text-brand">کارت کالا</span></td></tr> })}</tbody>
        <tfoot><tr className="bg-neutral-bg/60 font-semibold"><td className="px-3 py-2.5">جمع</td><td /><td className="px-3 font-mono">{fa(sum('received'))}</td><td className="px-3 font-mono">{fa(sum('onHand'))}</td><td className="px-3 font-mono">{fa(sum('hold'))}</td><td className="px-3 font-mono">{fa(sum('sold') - sum('back'))}</td><td className="px-3 font-mono">{fa(sum('ownerRet'))}</td><td className="px-3 font-mono">{fa(sum('pSold') - sum('pBack'))}</td><td className="px-3">{toman(sum('revenue'))}</td>{money && <td className="px-3 text-success">{toman(sum('ownerTotal'))}</td>}<td /><td /><td /></tr></tfoot>
      </table></div>}
    </Card>

    <Drawer open={!!cur} onClose={() => setOpen(null)} width={980} title={cur ? <span className="flex flex-wrap items-center gap-2">کارت کالا: {cur.name}<PartyChip s={s} id={cur.owner} /></span> : ''} footer={cur && <><Button variant="primary" icon={<Printer size={14} />} onClick={() => printSolo(oneRef.current)}>چاپ کارت همین کالا</Button><Button variant="ghost" onClick={() => setOpen(null)}>بستن</Button></>}>
      {cur && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-12 sm:grid-cols-5">
          {([['کل ورودی', cur.received], ['موجود', cur.onHand], ['نگه‌داشته یا منقضی', cur.hold], ['فروش خالص', cur.sold - cur.back], ['برگشت به مالک', cur.ownerRet]] as [string, number][]).map(([k, v]) => <div key={k} className="rounded-lg bg-neutral-bg p-2.5"><p className="text-t2">{k}</p><p className="text-16 font-bold">{fa(v)}</p></div>)}
        </div>
        <p className="rounded-lg border border-success/30 bg-success-bg/40 px-3 py-2 text-12">کنترل: {fa(cur.onHand)} موجود + {fa(cur.hold)} نگه‌داشته + {fa(cur.sold - cur.back)} فروش خالص ({fa(cur.sold)} فروش − {fa(cur.back)} برگشت) + {fa(cur.ownerRet)} برگشت به مالک{cur.adj ? ` ${cur.adj > 0 ? '−' : '+'} ${fa(Math.abs(cur.adj))} اصلاح شمارش و خرابی` : ''} = <b>{fa(cur.received)}</b> عدد ورودی کل.</p>
        <MvTable g={cur} money={money} onSale={setSale} onPeek={setPeek} onOrder={(id) => nav(`/admin/orders/${id}`)} />
      </div>}
    </Drawer>
    <Modal open={!!sale} onClose={() => setSale(null)} title={sale ? `ریز فروش ${sale.orderId ?? sale.id}` : ''} wide>{sale && <SaleBreakdown x={sale} />}</Modal>
    <OrderPeek id={peek} onClose={() => setPeek(null)} />

    {/* گزارش چاپی کامل: خلاصه، جدول کنترل و گردش ریز هر کالا با جای امضا */}
    <div ref={printRef} className="hidden"><Report d={d} groups={G} owner={owner} wh={wh} period={period} since={since} money={money} /></div>
    <div ref={oneRef} className="hidden">{cur && <Report d={d} groups={[cur]} owner={cur.owner} wh={wh} period={period} since={0} money={money} single />}</div>
  </div>
}

function MvTable({ g, money, onSale, onPeek, onOrder }: { g: Group; money: boolean; onSale: (x: StockSale) => void; onPeek: (id: string) => void; onOrder: (id: string) => void }) {
  const d = useDB(); const s = d.stock
  return <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[1040px] text-12 [&_td]:whitespace-nowrap [&_td:nth-child(3)]:min-w-52 [&_td:nth-child(3)]:whitespace-normal">
    <thead><tr className="border-b border-line bg-neutral-bg/60 text-right text-t2">{['تاریخ', 'نوع', 'سفارش یا سند', 'انبار', 'تغییر موجودی', 'قیمت واحد', 'تخفیف و کارمزد', 'مبلغ خالص', ...(money ? ['سهم مالک', 'سهم فروشنده', 'انبار'] : []), 'تسویه', ''].map((h) => <th key={h} className="px-2.5 py-2 font-medium">{h}</th>)}</tr></thead>
    <tbody>{g.mv.map((v, i) => <tr key={i} className="border-b border-line/50 align-top">
      <td className="whitespace-nowrap px-2.5 py-2">{dtm(v.at)}</td>
      <td className="px-2.5 py-2"><Badge tone={KIND[v.kind][1]}>{KIND[v.kind][0]}</Badge></td>
      <td className="px-2.5 py-2">{v.orderId ? <span className="flex items-center gap-1"><button className="font-mono text-brand underline" onClick={() => onOrder(v.orderId!)}>{v.orderId}</button><button aria-label={`نمای سریع ${v.orderId}`} title="نمای سریع سفارش" className="grid size-6 place-items-center rounded text-t2 hover:bg-neutral-bg hover:text-brand" onClick={() => onPeek(v.orderId!)}><Eye size={13} /></button></span> : <span className={/^[A-Za-z0-9-]+$/.test(v.doc) ? 'font-mono text-t2' : 'font-medium'}>{v.doc}</span>}<span className="block text-[11px] text-t3">{v.note}</span></td>
      <td className="whitespace-nowrap px-2.5 py-2">{whName(s, v.wh)}</td>
      <td className={v.qty < 0 ? 'px-2.5 py-2 font-mono text-danger' : 'px-2.5 py-2 font-mono text-success'}><bdi dir="ltr">{v.qty > 0 ? '+' : v.qty < 0 ? '−' : ''}{fa(Math.abs(v.qty))}</bdi></td>
      <td className="px-2.5 py-2">{v.price !== undefined ? toman(v.price) : v.cost !== undefined && money ? <span className="text-t2">بها {toman(v.cost)}</span> : '—'}</td>
      <td className="px-2.5 py-2 text-t2">{v.disc || v.fee ? `${v.disc ? `تخفیف ${num(v.disc)}` : ''}${v.disc && v.fee ? ' · ' : ''}${v.fee ? `کارمزد ${num(v.fee)}` : ''}` : '—'}</td>
      <td className="px-2.5 py-2 font-medium">{v.revenue !== undefined ? toman(v.revenue) : '—'}</td>
      {money && <><td className="px-2.5 py-2 text-success">{v.owner !== undefined ? toman(v.owner) : '—'}</td><td className="px-2.5 py-2">{v.seller ? <>{toman(v.seller)}<span className="block text-[11px] text-t3">{partyName(s, v.sellerId ?? '')}</span></> : '—'}</td><td className="px-2.5 py-2">{v.handling ? toman(v.handling) : '—'}</td></>}
      <td className="min-w-28 px-2.5 py-2 text-[11px]">{v.pay ?? '—'}</td>
      <td className="px-2.5 py-2">{v.sale && <button className="whitespace-nowrap text-brand underline" onClick={() => onSale(v.sale!)}>ریز محاسبه</button>}</td>
    </tr>)}</tbody>
  </table></div>
}

function Report({ d, groups, owner, wh, period, since, money, single }: { d: DB; groups: Group[]; owner: string; wh: string; period: string; since: number; money: boolean; single?: boolean }) {
  const s = d.stock; const T = (k: keyof Group) => groups.reduce((a, x) => a + (x[k] as number), 0)
  const th: React.CSSProperties = { borderBottom: '1px solid #000', textAlign: 'right', padding: '3px 4px', fontWeight: 700 }; const td: React.CSSProperties = { borderBottom: '1px solid #ddd', padding: '3px 4px', verticalAlign: 'top' }
  const po = owner !== 'all' && owner !== 'gh' ? payoutBetween(d, 'gh', owner) : null
  return <div dir="rtl" style={{ width: '277mm', padding: '6mm', color: '#000', background: '#fff', fontFamily: 'inherit', fontSize: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 6 }}>
      <div><h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{single ? 'کارت کالا' : 'گزارش گردش و فروش کالا'} {owner === 'all' ? '(همهٔ مالک‌ها)' : `· مالک: ${partyName(s, owner)}`}</h2>
        <p style={{ margin: '3px 0 0' }}>انبار: {wh === 'all' ? 'همهٔ انبارها' : whName(s, wh)} · دورهٔ فروش: {single ? 'از ابتدا' : PERIODS.find(([k]) => k === period)?.[1]} · تاریخ چاپ: {dtm(new Date().toISOString())} · چاپ‌کننده: {currentUser()?.name ?? '—'}</p></div>
      <div style={{ textAlign: 'left', fontSize: 9 }}>غنیمت · سند داخلی تسویه<br />شمارهٔ گزارش: GR-{Date.now().toString(36).toUpperCase()}</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}><thead><tr>{['کالا', 'مالک', 'کل ورودی', 'موجود', 'نگه‌داشته', 'فروش خالص', 'برگشت به مالک', 'فروش دوره', 'مبلغ خالص دوره', ...(money ? ['بهای تمام‌شده', 'سهم مالک'] : [])].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
      <tbody>{groups.map((g) => <tr key={g.key}><td style={td}>{g.name}</td><td style={td}>{partyName(s, g.owner)}</td><td style={td}>{fa(g.received)}</td><td style={td}>{fa(g.onHand)}</td><td style={td}>{fa(g.hold)}</td><td style={td}>{fa(g.sold - g.back)}</td><td style={td}>{fa(g.ownerRet)}</td><td style={td}>{fa(g.pSold - g.pBack)}</td><td style={td}>{num(g.revenue)}</td>{money && <><td style={td}>{num(g.costT)}</td><td style={td}>{num(g.ownerTotal)}</td></>}</tr>)}
        <tr style={{ fontWeight: 700 }}><td style={td}>جمع</td><td style={td} /><td style={td}>{fa(T('received'))}</td><td style={td}>{fa(T('onHand'))}</td><td style={td}>{fa(T('hold'))}</td><td style={td}>{fa(T('sold') - T('back'))}</td><td style={td}>{fa(T('ownerRet'))}</td><td style={td}>{fa(T('pSold') - T('pBack'))}</td><td style={td}>{num(T('revenue'))}</td>{money && <><td style={td}>{num(T('costT'))}</td><td style={td}>{num(T('ownerTotal'))}</td></>}</tr></tbody></table>
    <p style={{ marginTop: 4, fontSize: 9 }}>کنترل هر ردیف: کل ورودی = موجود + نگه‌داشته + فروش خالص + برگشت به مالک. مبلغ‌ها به تومان است. تخفیف و کارمزد طبق قانون «{s.rules?.discount === 'seller' ? 'با فروشنده' : 'مشترک'}» پیش از تقسیم سود کم شده است.</p>
    {po && <p style={{ marginTop: 4, fontSize: 11 }}>ماندهٔ تسویه: <b>{num(Math.abs(po.total))} تومان</b> {po.total >= 0 ? `طلب ${partyName(s, owner)} از غنیمت` : `بدهی ${partyName(s, owner)} به غنیمت`} · قابل پرداخت الان {num(Math.abs(po.payable))}{po.later.length ? ` · بعداً: ${po.later.map((l) => `${/^\d{4}-/.test(l.at) ? day(l.at) : l.at} ${num(Math.abs(l.amount))}`).join('، ')}` : ''}</p>}
    {groups.map((g) => { const rows = g.mv.filter((v) => single || v.kind === 'in' || v.kind === 'move' || +new Date(v.at) >= since); return rows.length ? <div key={g.key} style={{ marginTop: 10, breakInside: 'avoid-page' }}>
      <p style={{ fontWeight: 700, fontSize: 11, margin: '0 0 3px', background: '#f2f2f2', padding: '3px 4px' }}>{g.name} · مالک {partyName(s, g.owner)} · ورودی {fa(g.received)} · موجود {fa(g.onHand)} · فروش خالص {fa(g.sold - g.back)}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['تاریخ', 'نوع', 'سفارش یا سند', 'انبار', 'تغییر موجودی', 'قیمت واحد', 'تخفیف', 'کارمزد', 'مبلغ خالص', ...(money ? ['سهم مالک', 'سهم فروشنده', 'انبار'] : []), 'تسویه', 'شرح'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((v, i) => <tr key={i}><td style={td}>{dtm(v.at)}</td><td style={td}>{KIND[v.kind][0]}</td><td style={td}>{v.doc}</td><td style={td}>{whName(s, v.wh)}</td><td style={td}>{fa(v.qty)}</td><td style={td}>{v.price !== undefined ? num(v.price) : ''}</td><td style={td}>{v.disc ? num(v.disc) : ''}</td><td style={td}>{v.fee ? num(v.fee) : ''}</td><td style={td}>{v.revenue !== undefined ? num(v.revenue) : ''}</td>{money && <><td style={td}>{v.owner !== undefined ? num(v.owner) : ''}</td><td style={td}>{v.seller ? `${num(v.seller)} (${partyName(s, v.sellerId ?? '')})` : ''}</td><td style={td}>{v.handling ? num(v.handling) : ''}</td></>}<td style={td}>{v.pay ?? ''}</td><td style={td}>{v.note}</td></tr>)}</tbody></table>
    </div> : null })}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 11 }}><span>امضا و تاریخ از طرف غنیمت: ......................</span><span>امضا و تاریخ {owner !== 'all' && owner !== 'gh' ? partyName(s, owner) : 'شریک'}: ......................</span></div>
  </div>
}
