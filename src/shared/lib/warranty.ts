import type { DB, WCard } from '../data/seed'

/** کالا گارانتی دارد اگر نوعش «بدون گارانتی» نباشد و مدتش بیش از صفر ماه باشد */
export const hasWarranty = (type?: string, months?: number) => !!type && type !== 'بدون گارانتی' && (months ?? 0) > 0
/** سفارش‌هایی که خریدشان قطعی شده است */
const LIVE = ['order.paid', 'order.preparing', 'order.shipped', 'order.delivered', 'order.pickup_ready', 'order.needs_decision']
/** مرجوعی‌هایی که کالا در آن‌ها واقعاً برگشته و پذیرفته شده است */
const RET_DONE = ['return.approved', 'return.approved_deducted', 'return.refunding', 'return.refunded', 'return.partial']

/** کد گارانتی یکتا و پشت‌سرهم: GW-31878، GW-31879 … */
export function nextWarrantyCode(d: Pick<DB, 'wcards'>) {
  const n = Math.max(31877, ...d.wcards.map((c) => +c.code.replace(/\D/g, '') || 0)) + 1
  return `GW-${n}`
}
export const providerFor = (type: string) => (type === 'گارانتی شرکتی' ? 'نمایندگی رسمی برند' : 'واحد گارانتی غنیمت')
/** شمارهٔ عدد در ردیف سفارش برای کالای بی‌سریال (از lineKey) */
export const lineIndex = (c: WCard) => (c.lineKey ? +(c.lineKey.split('|').pop() ?? 0) : 0)

/** صدور و بایگانی خودکار گارانتی، پس از هر تغییر داده:
 *  ۱. برای هر واحد (یا هر عدد از کالای تعدادی) در سفارش قطعی که کالایش گارانتی دارد، یک کارت با کد یکتا ساخته می‌شود؛ شروع گارانتی لحظهٔ ثبت خرید است.
 *  ۲. اگر سفارش یا مرسوله لغو شود یا کالا با مرجوعی برگردد، کارت بایگانی می‌شود (مگر به تصمیم ما «فعال بماند»).
 *  ۳. اگر همان واحد دوباره فروخته شود، گارانتی تازه صادر و کارت قبلی بایگانی می‌شود. */
export function warrantyHook(next: DB) {
  if (!next.wcards) next.wcards = []
  const now = new Date().toISOString()
  const archive = (c: WCard, why: string) => { c.status = 'archived'; c.archivedReason = why; c.archivedAt = now }
  for (const o of next.orders) {
    if (!LIVE.includes(o.status)) continue
    for (const s of o.shipments) {
      if (s.status === 'ship.cancelled') continue
      s.items.forEach((it, idx) => {
        const p = next.products.find((x) => x.id === it.productId); if (!p) return
        const keys = it.unitId ? [{ unitId: it.unitId, lineKey: undefined as string | undefined }] : Array.from({ length: it.qty || 1 }, (_, k) => ({ unitId: '', lineKey: `${o.id}|${s.id}|${idx}|${k + 1}` }))
        for (const k of keys) {
          const u = k.unitId ? next.units.find((x) => x.id === k.unitId) : undefined
          const months = u?.warrantyMonths ?? p.warrantyMonths ?? 0
          if (!hasWarranty(p.warrantyType, months)) continue
          if (next.wcards.some((w) => (k.unitId ? w.unitId === k.unitId && w.orderId === o.id : w.lineKey === k.lineKey))) continue
          // همان واحد قبلاً به مشتری دیگری فروخته و برگشته: کارت قبلی بایگانی و کارت تازه صادر می‌شود
          if (k.unitId) next.wcards.filter((w) => w.unitId === k.unitId && w.orderId !== o.id && w.status !== 'archived' && !w.keep).forEach((w) => archive(w, `همین کالا دوباره در سفارش ${o.id} فروخته شد و گارانتی تازه گرفت`))
          next.wcards.unshift({ code: nextWarrantyCode(next), unitId: k.unitId, lineKey: k.lineKey, productId: p.id, customerId: o.customerId, orderId: o.id, type: p.warrantyType!, provider: providerFor(p.warrantyType!), months,
            start: o.createdAt, status: 'active', notes: [], source: 'auto', createdAt: o.createdAt, createdBy: 'سیستم' } as WCard)
        }
      })
    }
  }
  for (const c of next.wcards) {
    // کارت‌های نسخهٔ قبل که «در انتظار تحویل» بودند: شروع از لحظهٔ خرید
    if (c.awaiting) { c.awaiting = false; c.start = next.orders.find((o) => o.id === c.orderId)?.createdAt ?? c.start }
    if (c.source === 'manual' || !c.orderId || c.keep || c.status === 'archived') continue
    const o = next.orders.find((x) => x.id === c.orderId); if (!o) continue
    if (o.status === 'order.cancelled') { archive(c, `سفارش ${o.id} لغو شد`); continue }
    if (o.status === 'order.returned') { archive(c, `سفارش ${o.id} کامل مرجوع شد`); continue }
    const ship = c.lineKey ? o.shipments.find((s) => s.id === c.lineKey!.split('|')[1]) : o.shipments.find((s) => s.items.some((i) => i.unitId === c.unitId))
    if (ship?.status === 'ship.cancelled') { archive(c, `مرسولهٔ ${ship.id} لغو شد`); continue }
    for (const r of next.returns.filter((x) => x.orderId === o.id && RET_DONE.includes(x.status))) {
      const items = (r.items?.length ? r.items : [{ productId: r.productId ?? '', unitId: r.unitId, qty: 1, price: 0 }]).filter((i) => i.ok !== false)
      const hit = c.unitId ? items.some((i) => i.unitId === c.unitId) : lineIndex(c) <= items.filter((i) => !i.unitId && i.productId === c.productId && (!i.shipId || i.shipId === ship?.id)).reduce((n, i) => n + (i.qty || 1), 0)
      if (hit) { archive(c, `کالا با مرجوعی ${r.id} برگشت`); break }
    }
  }
  return next
}
