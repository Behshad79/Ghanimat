// زمان‌بندی پرداخت به شرکا و تأمین‌کنندگان: پولی را که هنوز به حساب ما نرسیده (مثلاً قسط دوم اسنپ‌پی) یا کالایی را که مهلت مرجوعی‌اش تمام نشده، الان پرداخت نمی‌کنیم.
import type { DB, Order } from './seed'
import { split, type StockSale } from './stock'
import { fa } from '../lib/fa'

export type Tranche = { from: string; to: string; amount: number; at: string | null; why: string; sale: StockSale; state: 'payable' | 'waiting_money' | 'waiting_return' | 'waiting_delivery' }
const DAY = 864e5
const iso = (t: number) => new Date(t).toISOString()

/** قاعدهٔ رسیدن پول برای روش پرداخت سفارش */
export function termOf(x: DB, pay: string) {
  return x.stock.payTerms?.find((t) => pay.includes(t.match)) ?? { match: '', label: pay || 'نامشخص', tranches: [{ days: 0, pct: 100 }] }
}
const orderOf = (x: DB, s: StockSale) => (s.orderId ? x.orders.find((o) => o.id === s.orderId) : undefined)
const deliveredAt = (o: Order | undefined, shipId?: string) => { if (!o) return null; const sh = o.shipments.find((q) => q.id === shipId) as (Order['shipments'][number] & { deliveredAt?: string }) | undefined; return sh?.status === 'ship.delivered' ? (sh.deliveredAt ?? (o as Order & { deliveredAt?: string }).deliveredAt ?? o.createdAt) : null }

/**
 * هر جریان پولی یک فروش به چند قسط شکسته می‌شود:
 * تاریخ هر قسط = دیرترینِ (رسیدن همان سهم پول از درگاه یا اقساطی) و (تحویل + مهلت مرجوعی شریک دریافت‌کننده).
 * فقط وقتی پول دست ماست (ما گیرندهٔ پول مشتری‌ایم) این زمان‌بندی اعمال می‌شود؛ برگشت‌ها فوری حساب می‌شوند.
 */
export function tranches(x: DB, s: StockSale, now = Date.now()): Tranche[] {
  const b = split(x.stock, s); const o = orderOf(x, s)
  const self = x.stock.parties.find((p) => p.kind === 'self')?.id ?? 'gh'
  return b.flows.flatMap((f) => {
    if (s.qty < 0 || f.from !== self || !o) return [{ from: f.from, to: f.to, amount: f.amount, at: s.at, why: s.qty < 0 ? 'برگشت؛ فوری از مانده کم می‌شود' : 'پول دست فروشنده است', sale: s, state: 'payable' as const }]
    const term = termOf(x, o.pay); const paidAt = +new Date(o.createdAt)
    const hold = x.stock.parties.find((p) => p.id === f.to)?.payout?.holdDays ?? 0
    const dv = deliveredAt(o, s.shipId)
    let left = f.amount
    return term.tranches.map((t, i) => {
      const amt = i === term.tranches.length - 1 ? left : Math.round((f.amount * t.pct) / 100); left -= amt
      const moneyAt = paidAt + t.days * DAY; const retAt = dv ? +new Date(dv) + hold * DAY : null
      const at = retAt === null ? null : Math.max(moneyAt, retAt)
      const state: Tranche['state'] = retAt === null ? 'waiting_delivery' : at! <= now ? 'payable' : moneyAt > now && moneyAt >= retAt ? 'waiting_money' : 'waiting_return'
      const why = term.tranches.length > 1 ? `${term.label}: قسط ${fa(i + 1)} از ${fa(term.tranches.length)} (${fa(t.pct)}٪، ${fa(t.days)} روز بعد از پرداخت)` : t.days ? `${term.label}: ${fa(t.days)} روز بعد از پرداخت به حساب ما می‌رسد` : term.label
      return { from: f.from, to: f.to, amount: amt, at: at === null ? null : iso(at), why: retAt === null ? `${why} · هنوز تحویل مشتری نشده` : hold && retAt > moneyAt && retAt > now ? `${why} · مهلت ${fa(hold)} روزهٔ مرجوعی` : why, sale: s, state }
    })
  })
}

/** وضعیت پرداخت میان دو طرف: کل مانده، قابل پرداخت همین حالا، و آنچه بعداً قابل پرداخت می‌شود (با تاریخ) */
export function payoutBetween(x: DB, a: string, b: string, now = Date.now()) {
  const T = x.stock.sales.flatMap((s) => tranches(x, s, now)).filter((t) => (t.from === a && t.to === b) || (t.from === b && t.to === a))
  const sign = (t: Tranche) => (t.from === a ? t.amount : -t.amount) // مثبت: a به b بدهکار
  const paid = x.stock.settlements.filter((t) => (t.from === a && t.to === b) || (t.from === b && t.to === a)).reduce((s, t) => s + (t.from === a ? t.amount : -t.amount), 0)
  const total = T.reduce((s, t) => s + sign(t), 0) - paid
  const payableGross = T.filter((t) => t.state === 'payable').reduce((s, t) => s + sign(t), 0) - paid
  const later = T.filter((t) => t.state !== 'payable')
  const byDate = new Map<string, { amount: number; why: Set<string> }>()
  later.forEach((t) => { const k = t.at ? t.at.slice(0, 10) : 'پس از تحویل'; const c = byDate.get(k) ?? { amount: 0, why: new Set<string>() }; c.amount += sign(t); c.why.add(t.why.split(' · ')[0]); byDate.set(k, c) })
  return { total, payable: payableGross, later: [...byDate].map(([k, v]) => ({ at: k, amount: v.amount, why: [...v.why].join('، ') })).sort((p, q) => p.at.localeCompare(q.at)), tranches: T }
}
