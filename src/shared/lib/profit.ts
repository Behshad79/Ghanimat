import type { DB, Order } from '../data/seed'
// محاسبهٔ یکپارچهٔ سود: هر جا سود نمایش داده می‌شود (سفارش، کالا، دوره) همین تابع است.
export const providerOf = (d: DB, pay: string) => d.providers.filter((p) => ['gateway', 'bnpl'].includes(p.family)).find((p) => pay.includes(p.name))
export type Line = { pid: string; uid: string; qty: number; price: number; cost: number | null; warehouse: string }
export function orderProfit(d: DB, o: Order) {
  const lines: Line[] = o.shipments.flatMap((s) => s.items.map((i) => {
    const u = d.units.find((x) => x.id === i.unitId); const p = d.products.find((x) => x.id === i.productId)
    const c = u?.cost ?? p?.cost ?? null
    return { pid: i.productId, uid: i.unitId, qty: i.qty, price: i.price, cost: c ? c * i.qty : null, warehouse: s.warehouse }
  }))
  const prov = providerOf(d, o.pay)
  const revenue = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const cogs = lines.reduce((a, l) => a + (l.cost ?? 0), 0)
  const unknownCost = lines.some((l) => l.cost === null)
  const fee = Math.round((o.total * (prov?.fee ?? 0)) / 100)
  const shipIncome = o.shipments.reduce((a, s) => a + (s.shipFee ?? 0), 0) || o.shippingFee
  const shipCost = o.shipments.reduce((a, s) => a + (s.courier?.cost ?? (/پست|تیپاکس/.test(s.method) ? 95000 : 0)), 0)
  const packaging = o.shipments.length * (d.packagingCost ?? 0)
  const discount = o.discount
  const profit = revenue - cogs - fee + shipIncome - shipCost - packaging - discount
  return { lines, prov, revenue, cogs, fee, shipIncome, shipCost, packaging, discount, profit, unknownCost, margin: revenue ? (profit / revenue) * 100 : 0 }
}
export const counted = (o: Order) => !['order.cancelled', 'order.awaiting_payment'].includes(o.status)
/** طلب از درگاه یا سرویس اقساطی برای یک سفارش */
export function receivable(d: DB, o: Order) {
  const prov = providerOf(d, o.pay); if (!prov) return null
  const fee = Math.round((o.total * (prov.fee ?? 0)) / 100); const net = o.total - fee
  const due = d.settleDue[o.id] ?? new Date(new Date(o.createdAt).getTime() + (prov.settleDays ?? 1) * 864e5).toISOString()
  const paid = d.settlements[o.id]
  const status = paid ? (Math.abs(paid.amount - net) > 1000 ? 'اختلاف' : 'واریزشده') : new Date(due).getTime() < Date.now() ? 'دیرکرد' : 'در انتظار'
  return { o, prov, fee, net, due, paid, status }
}
