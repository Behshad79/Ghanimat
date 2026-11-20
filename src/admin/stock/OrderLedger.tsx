import { useNavigate } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { Badge, Card, Select } from '@/shared/ui/base'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'
import { split } from '@/shared/data/stock'
import { channelOf } from '@/shared/data/ledger'
import { PartyChip, partyName, pv, whName } from './common'

/** کارت «مالکیت و تسویه» روی صفحهٔ سفارش: هر قلم مال کی بود، از کجا رفت، چه کسی فروخت و سهم هر طرف */
export function OrderLedger({ o }: { o: Order }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate()
  const rows = s.sales.filter((x) => x.orderId === o.id)
  const ch = channelOf(d, o)
  const net = new Map<string, number>(); rows.forEach((x) => split(s, x).flows.forEach((f) => { const k = `${f.from}>${f.to}`; net.set(k, (net.get(k) ?? 0) + f.amount) }))
  return <Card title={<span className="flex items-center gap-1.5"><HandCoins size={15} />مالکیت و تسویهٔ این سفارش</span>} actions={<button className="text-12 text-brand" onClick={() => nav('/admin/ownership?tab=sales')}>همهٔ فروش‌ها</button>}>
    <label className="mb-3 flex items-center gap-2 text-12"><span className="shrink-0 text-t2">کانال تسویه</span><Select className="flex-1" value={ch} onChange={(v) => mutate((x) => { const oo = x.orders.find((y) => y.id === o.id) as Order & { salesChannel?: string }; oo.salesChannel = v; x.stock.sales.filter((y) => y.orderId === o.id).forEach((y) => { y.channel = v }) }, { action: 'تغییر کانال تسویهٔ سفارش', target: `${o.id} ← ${s.channels.find((c) => c.id === v)?.name ?? v}` })} options={s.channels.map((c) => [c.id, `${c.name} · فروشنده ${partyName(s, c.seller)}`] as [string, string])} /></label>
    {rows.length === 0 ? <p className="text-12 text-t2">هنوز بسته‌بندی نشده است. هنگام بسته‌بندی (با اسکن، یا بدون اسکن طبق قاعدهٔ برداشت) معلوم می‌شود هر قلم از موجودی کدام مالک رفت.</p>
      : <ul className="space-y-2">{rows.map((x) => { const b = split(s, x); return <li key={x.id} className={x.qty < 0 ? 'rounded-lg bg-danger-bg/60 p-2 text-12' : 'rounded-lg bg-neutral-bg p-2 text-12'}>
        <p className="flex flex-wrap items-center gap-1.5"><b>{pv(d, x.productId, x.variationId).full}</b><span>×{fa(Math.abs(x.qty))}</span>{x.qty < 0 && <Badge tone="danger">برگشت</Badge>}{x.auto && <Badge tone="warning">بدون اسکن</Badge>}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-t2">مالک <PartyChip s={s} id={x.owner} /> از {whName(s, x.warehouse)} · فروشنده <PartyChip s={s} id={b.seller} /></p>
        <p className="mt-1 text-t2">سود {toman(b.profit)} · سهم فروشنده {toman(b.sellerShare)} · سهم مالک {toman(b.ownerTotal)}</p>
      </li> })}</ul>}
    {net.size > 0 && <div className="mt-3 space-y-1 border-t border-line pt-2">{[...net].filter(([, v]) => v).map(([k, v]) => { const [a, b] = k.split('>'); return <p key={k} className="text-12"><b>{partyName(s, a)}</b> از این سفارش <b className="text-warning">{toman(v)}</b> به <b>{partyName(s, b)}</b> بدهکار است.</p> })}</div>}
  </Card>
}
