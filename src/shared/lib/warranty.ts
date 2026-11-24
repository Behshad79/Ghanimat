import type { DB, WCard } from '../data/seed'

/** کالا گارانتی دارد اگر نوعش «بدون گارانتی» نباشد و مدتش بیش از صفر ماه باشد */
export const hasWarranty = (type?: string, months?: number) => !!type && type !== 'بدون گارانتی' && (months ?? 0) > 0
/** سفارش‌هایی که فروش قطعی دارند و کالایشان به مشتری می‌رسد */
const LIVE = ['order.paid', 'order.preparing', 'order.shipped', 'order.delivered', 'order.pickup_ready', 'order.needs_decision']

/** کد گارانتی یکتا و پشت‌سرهم: GW-31878، GW-31879 … */
export function nextWarrantyCode(d: Pick<DB, 'wcards'>) {
  const n = Math.max(31877, ...d.wcards.map((c) => +c.code.replace(/\D/g, '') || 0)) + 1
  return `GW-${n}`
}
export const providerFor = (type: string) => (type === 'گارانتی شرکتی' ? 'نمایندگی رسمی برند' : 'واحد گارانتی غنیمت')

/** صدور خودکار: برای هر واحد (یا هر عدد از کالای تعدادی) در سفارش قطعی که کالایش گارانتی دارد، یک کارت با کد یکتا ساخته می‌شود.
 *  تا تحویل، کارت «در انتظار تحویل» است؛ با تحویل سفارش، تاریخ شروع همان روز تحویل ثبت می‌شود. */
export function warrantyHook(next: DB) {
  if (!next.wcards) next.wcards = []
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
          let c = next.wcards.find((w) => (k.unitId ? w.unitId === k.unitId && (!w.orderId || w.orderId === o.id) : w.lineKey === k.lineKey))
          if (!c) {
            c = { code: nextWarrantyCode(next), unitId: k.unitId, lineKey: k.lineKey, productId: p.id, customerId: o.customerId, orderId: o.id, type: p.warrantyType!, provider: providerFor(p.warrantyType!), months,
              start: o.deliveredAt ?? o.createdAt, awaiting: !o.deliveredAt, status: 'active', notes: [], source: 'auto', createdAt: o.createdAt, createdBy: 'سیستم' } as WCard
            next.wcards.unshift(c)
          } else if (c.awaiting && o.deliveredAt) { c.start = o.deliveredAt; c.awaiting = false }
        }
      })
    }
  }
  return next
}
