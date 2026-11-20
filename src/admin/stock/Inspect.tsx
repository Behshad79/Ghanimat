import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Pencil, PlusCircle, Printer, ScanSearch, ShoppingCart } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { canSecret, currentUser, mutate, myParty, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import { attrKey, axisOf, valLabel } from '@/shared/lib/variants'
import { reserved } from '@/shared/data/ledger'
import type { Order } from '@/shared/data/seed'
import { ManualOrder } from '../orders/OrderTools'
import { chName, ownersAt, PartyChip, pv } from './common'
import { resolveCode } from './Packing'

const OPEN = ['ship.pending', 'ship.picking']

/** استعلام کالا با اسکن: همهٔ اطلاعات همین کالا و همین تنوع، و اقدام فوری (سفارش دستی، افزودن به سفارش دیگر، تغییر قیمت، ویرایش) */
export function Inspect({ station, initial }: { station: string; initial?: string }) {
  const d = useDB(); const nav = useNavigate(); const [code, setCode] = useState(''); const [hit, setHit] = useState<(NonNullable<ReturnType<typeof resolveCode>> & { code: string }) | null>(() => { const r = initial ? resolveCode(d, initial) : null; return r ? { ...r, code: initial! } : null }); const [err, setErr] = useState('')
  const [manual, setManual] = useState(false); const [addTo, setAddTo] = useState(false); const [price, setPrice] = useState<string | null>(null)
  const go = (c: string) => { const r = resolveCode(d, c.trim()); setCode(''); setPrice(null); if (!r) { setErr(`«${c}» در سیستم تعریف نشده است.`); setHit(null); return } setErr(''); setHit({ ...r, code: c.trim() }) }
  const p = hit ? d.products.find((x) => x.id === hit.productId && (!hit.variationId || x.variations?.some((v) => v.id === hit.variationId))) ?? d.products.find((x) => x.id === hit.productId) : undefined
  const v = hit?.variationId ? p?.variations?.find((x) => x.id === hit.variationId) : undefined
  const unit = hit?.unitId ? d.units.find((u) => u.id === hit.unitId) : undefined
  const curPrice = unit?.price ?? v?.sale ?? v?.price ?? p?.price ?? p?.priceNew ?? 0
  const openOrders = p ? d.orders.filter((o) => o.shipments.some((s) => OPEN.includes(s.status) && s.items.some((i) => !i.cancelled && i.productId === p.id && (!v || i.variationId === v.id)))) : []
  const sales = p ? d.stock.sales.filter((x) => x.productId === p.id && (!v || x.variationId === v.id)).slice(0, 5) : []
  const savePrice = () => { if (!p || price === null) return; const n = Number(price.replace(/\D/g, '')); if (!n) return toast('قیمت را وارد کنید.', { tone: 'err' })
    mutate((x) => { const q = x.products.find((y) => y.id === p.id)!; if (unit) { const u = x.units.find((y) => y.id === unit.id); if (u) u.price = n } else if (v) { const vv = q.variations!.find((y) => y.id === v.id)!; vv.price = n; vv.sale = undefined } else q.price = n }, { action: 'تغییر قیمت از استعلام اسکن', target: `${pv(d, p.id, v?.id).full}`, before: toman(curPrice), after: toman(n) })
    toast('قیمت همین حالا در سایت هم عوض شد.'); setPrice(null) }
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
    <Card title={<span className="flex items-center gap-1.5"><ScanSearch size={15} />استعلام کالا با اسکن</span>}>
      <p className="mb-2 text-12 text-t2">هر بارکدی را اسکن کنید: برچسب مالک‌دار (GH یا YS)، بارکد کارخانه، کد کالا یا سریال واحد.</p>
      <form onSubmit={(e) => { e.preventDefault(); go(code) }}><Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="اسکن یا تایپ کد…" aria-label="کد برای استعلام" className="ltr h-12 text-left font-mono text-16" /></form>
      {err && <p className="mt-2 text-12 text-danger">{err}</p>}
      <p className="mt-2 text-11 text-t2">نمونه برای آزمایش: {['GH-000202-2', 'YS-000201-1', '6971234500017', 'GH-P-000108'].map((c) => <button key={c} type="button" className="mx-0.5 font-mono text-brand underline" onClick={() => go(c)}>{c}</button>)}</p>
    </Card>
    {!p || !hit ? <Card><p className="py-10 text-center text-13 text-t2">کدی اسکن کنید تا اطلاعات کامل همان کالا و همان تنوع اینجا بیاید.</p></Card> : <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1"><p className="text-16 font-bold">{p.title}</p><p className="ltr mt-0.5 text-left text-12 text-t2">{p.en} · {p.code}</p>
            {v && <div className="mt-2 flex flex-wrap gap-1.5">{(p.attrs ?? []).filter((a) => a.forVar).map((a) => <Badge key={attrKey(a)} dot={false}>{axisOf(d, a).name}: {valLabel(d, a, v.opts[attrKey(a)] ?? '—')}</Badge>)}</div>}
            {unit && <p className="mt-2 text-12">واحد <bdi dir="ltr" className="font-mono">{unit.id}</bdi> · سریال <bdi dir="ltr" className="font-mono">{unit.serial}</bdi> · <span className="text-t2">{unit.status}</span></p>}
            <p className="mt-2 flex flex-wrap items-center gap-2 text-12"><span className="text-t2">کد اسکن‌شده:</span><bdi dir="ltr" className="font-mono">{hit.code}</bdi><span className="text-t2">مالک این جعبه:</span><PartyChip s={d.stock} id={hit.owner} /></p></div>
          <div className="text-left"><p className="text-11 text-t2">قیمت فروش</p>{price === null ? <p className="text-20 font-bold">{toman(curPrice)}</p> : <div className="flex gap-1"><Input autoFocus className="ltr h-9 w-36 text-left font-mono" value={price} onChange={(e) => setPrice(e.target.value)} /><Button size="sm" variant="primary" onClick={savePrice}>ذخیره</Button></div>}{price === null && <button className="text-11 text-brand underline" onClick={() => setPrice(String(curPrice))}>تغییر قیمت</button>}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" icon={<ShoppingCart size={14} />} onClick={() => setManual(true)}>ثبت سفارش دستی با این کالا</Button>
          <Button icon={<PlusCircle size={14} />} onClick={() => setAddTo(true)}>افزودن به سفارش دیگر</Button>
          <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => nav(`/admin/catalog/${p.id}/edit`)}>ویرایش کامل کالا</Button>
          <Button variant="ghost" icon={<ExternalLink size={14} />} onClick={() => nav(`/admin/catalog/${p.id}`)}>صفحهٔ کالا</Button>
          <Button variant="ghost" icon={<Printer size={14} />} onClick={() => nav(`/admin/labels?products=${p.id}`)}>چاپ برچسب</Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="موجودی همین تنوع">
          <ul className="space-y-1.5 text-12">{d.stock.warehouses.map((w) => { const m = [...ownersAt(d.stock, p.id, v?.id, w.id)].filter(([, n]) => n > 0); const r = reserved(d, p.id, v?.id, w.id); return <li key={w.id} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-neutral-bg px-2.5 py-1.5"><b className="w-24">{w.name}</b>{m.length ? m.map(([o, n]) => <PartyChip key={o} s={d.stock} id={o} n={n} />) : <span className="text-t3">—</span>}{r > 0 && <Badge tone="warning">{fa(r)} رزرو سفارش باز</Badge>}{!w.active && <Badge tone="danger">انبار بسته</Badge>}</li> })}</ul>
          <p className="mt-2 text-11 text-t2">قابل فروش در سایت: تهران {fa((v ?? p).qty?.tehran ?? 0)} · مهاباد {fa((v ?? p).qty?.mahabad ?? 0)}</p>
        </Card>
        <Card title={`سفارش‌های باز با این کالا (${fa(openOrders.length)})`}>{openOrders.length ? <ul className="space-y-1 text-12">{openOrders.map((o) => <li key={o.id}><button className="font-mono text-brand underline" onClick={() => nav(`/admin/orders/${o.id}`)}>{o.id}</button> <span className="text-t2">· {rel(o.createdAt)} · {o.shipments.find((s) => OPEN.includes(s.status))?.status === 'ship.picking' ? 'در حال جمع‌آوری' : 'در انتظار'}</span></li>)}</ul> : <p className="text-12 text-t2">سفارش بازی این کالا را ندارد.</p>}
          {sales.length > 0 && <><p className="mt-3 mb-1 text-12 font-semibold">آخرین فروش‌ها</p><ul className="space-y-1 text-12">{sales.map((x) => <li key={x.id} className="flex flex-wrap items-center gap-1.5">{x.qty < 0 ? 'برگشت' : 'فروش'} ×{fa(Math.abs(x.qty))} · {chName(d.stock, x.channel)} · <PartyChip s={d.stock} id={x.owner} />{(canSecret() || x.owner === myParty()) && <span className="text-t2">{toman(x.price)}</span>}<span className="text-t3">{rel(x.at)}</span></li>)}</ul></>}
        </Card>
      </div>
      <ManualOrder key={`${p.id}-${v?.id ?? ''}-${manual}`} open={manual} onClose={() => setManual(false)} initial={[{ pid: p.id, uid: unit?.id ?? '', qty: 1, price: curPrice, vid: v?.id }]} />
      <AddToOrder open={addTo} onClose={() => setAddTo(false)} pid={p.id} vid={v?.id} unitId={unit?.id} price={curPrice} station={station} />
    </div>}
  </div>
}

/** افزودن کالای اسکن‌شده به سفارش باز دیگری؛ اگر سفارش پرداخت شده، مابه‌التفاوت تا پرداخت جلوی ارسال را می‌گیرد */
function AddToOrder({ open, onClose, pid, vid, unitId, price, station }: { open: boolean; onClose: () => void; pid: string; vid?: string; unitId?: string; price: number; station: string }) {
  const d = useDB(); const [oid, setOid] = useState(''); const [qty, setQty] = useState(1); const [pr, setPr] = useState(price)
  const cands = d.orders.filter((o) => !['order.cancelled', 'order.delivered', 'order.shipped'].includes(o.status) && o.shipments.some((s) => OPEN.includes(s.status)))
  const o = cands.find((x) => x.id === oid)
  const save = () => { if (!o) return toast('سفارش را انتخاب کنید.', { tone: 'err' }); const add = pr * (unitId ? 1 : qty)
    mutate((x) => { const oo = x.orders.find((y) => y.id === o.id) as Order; const sh = oo.shipments.find((s) => OPEN.includes(s.status) && s.warehouse === station) ?? oo.shipments.find((s) => OPEN.includes(s.status))!
      sh.items.push({ productId: pid, unitId: unitId ?? '', qty: unitId ? 1 : qty, price: pr, variationId: vid }); oo.total += add
      if (unitId) { const u = x.units.find((y) => y.id === unitId); if (u) u.status = 'unit.reserved' }
      if (oo.status !== 'order.awaiting_payment') oo.payHold = { amount: (oo.payHold?.status === 'pending' ? oo.payHold.amount : 0) + add, method: 'لینک پرداخت', at: new Date().toISOString(), by: currentUser()?.name ?? 'پنل', status: 'pending', note: 'افزودن کالا با اسکن' }
      ;(oo.edits ??= []).unshift({ at: new Date().toISOString(), by: currentUser()?.name ?? 'پنل', src: 'استعلام اسکن', reason: 'افزودن کالا به سفارش', changes: [`افزودن ${pv(x, pid, vid).full} ×${unitId ? 1 : qty}`], diff: add, sms: false }) },
    { action: 'افزودن کالا به سفارش از استعلام اسکن', target: o.id, after: `${pv(d, pid, vid).full} · ${toman(add)}` })
    toast(o.status === 'order.awaiting_payment' ? `به ${o.id} اضافه شد.` : `به ${o.id} اضافه شد؛ تا پرداخت ${toman(add)} مابه‌التفاوت، ارسال قفل است.`); onClose() }
  return <Modal open={open} onClose={onClose} title="افزودن به سفارش دیگر" footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" disabled={!o} onClick={save}>افزودن به سفارش</Button></>}>
    <div className="space-y-3 text-13">
      <Field label="سفارش باز (هنوز ارسال‌نشده)"><Select value={oid} onChange={setOid} options={[['', 'انتخاب کنید…'], ...cands.map((x) => [x.id, `${x.id} · ${d.customers.find((c) => c.id === x.customerId)?.name ?? ''} · ${toman(x.total)}`] as [string, string])]} /></Field>
      <div className="grid grid-cols-2 gap-3">{!unitId && <Field label="تعداد"><Input type="number" min={1} className="ltr text-left font-mono" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))} /></Field>}<Field label="قیمت هر عدد"><Input type="number" className="ltr text-left font-mono" value={pr} onChange={(e) => setPr(+e.target.value)} /></Field></div>
      {o && o.status !== 'order.awaiting_payment' && <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning">این سفارش پرداخت شده است؛ {toman(pr * (unitId ? 1 : qty))} مابه‌التفاوت ثبت و تا پرداخت، ارسال قفل می‌شود.</p>}
    </div>
  </Modal>
}
