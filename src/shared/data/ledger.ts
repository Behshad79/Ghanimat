// دفتر خودکار موجودی شرکا: هر جای پنل که مرسوله‌ای بسته‌بندی، لغو، برگشت یا به عقب برگردانده شود،
// اینجا بعد از همان تغییر اجرا می‌شود تا موجودی مالک، ردیف فروش و سهم تسویه همیشه درست بماند.
import type { DB, Order, Shipment } from './seed'
import type { Lot, StockSale } from './stock'

export const PACKED = ['ship.packed', 'ship.handed', 'ship.in_transit', 'ship.pickup_ready', 'ship.delivered']
export const OPEN_SHIP = ['ship.pending', 'ship.picking', 'ship.partner_confirm']
type Item = Shipment['items'][number]
type Scan = NonNullable<Shipment['pack']>['scans'][number]
const id = (p: string) => `${p}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

/** تعداد رزرو سفارش‌های باز (هنوز بسته‌بندی نشده) برای یک کالا و رنگ در یک انبار */
export function reserved(x: DB, pid: string, vid: string | undefined, wh: string) {
  return x.orders.reduce((a, o) => a + o.shipments.filter((s) => s.warehouse === wh && OPEN_SHIP.includes(s.status)).reduce((b, s) => b + s.items.filter((i) => !i.cancelled && i.productId === pid && (vid === undefined || (i.variationId ?? '') === (vid ?? ''))).reduce((c, i) => c + i.qty, 0), 0), 0)
}
export const expired = (l: Lot, now = Date.now()) => !!l.expiry && +new Date(l.expiry) < now
const liveLot = (x: DB, l: Lot) => !l.hold && !expired(l) && x.stock.parties.find((p) => p.id === l.owner)?.active !== false && x.stock.warehouses.find((w) => w.id === l.warehouse)?.active !== false

/** موجودی سایت = موجودی فیزیکی مالکان فعال در انبارهای فعال، منهای رزرو سفارش‌های باز */
export function syncQty(x: DB, pid: string) {
  const L = x.stock.lots.filter((l) => l.productId === pid); if (!L.length) return
  x.products.filter((p) => p.id === pid && p.mode !== 'serial').forEach((p) => {
    const sum = (wh: 'tehran' | 'mahabad', vid?: string) => Math.max(0, L.filter((l) => l.warehouse === wh && liveLot(x, l) && (vid === undefined || l.variationId === vid)).reduce((a, l) => a + l.qty, 0) - reserved(x, pid, vid, wh))
    if (p.variations?.length) { p.variations.forEach((v) => { v.qty = { tehran: sum('tehran', v.id), mahabad: sum('mahabad', v.id) } }); p.qty = { tehran: p.variations.reduce((a, v) => a + v.qty.tehran, 0), mahabad: p.variations.reduce((a, v) => a + v.qty.mahabad, 0) } }
    else p.qty = { tehran: sum('tehran'), mahabad: sum('mahabad') }
  })
}

/** برداشت از موجودی یک مالک در یک انبار (قدیمی‌ترین لات اول)؛ بهای تمام‌شدهٔ میانگین برمی‌گردد */
export function takeLots(x: DB, q: { productId: string; variationId?: string; owner: string; warehouse: string }, n: number) {
  let left = n; let cost = 0
  const L = x.stock.lots.filter((l) => l.productId === q.productId && (l.variationId ?? '') === (q.variationId ?? '') && l.owner === q.owner && l.warehouse === q.warehouse && l.qty > 0 && !l.hold && !expired(l)).sort((a, b) => (a.expiry && b.expiry ? +new Date(a.expiry) - +new Date(b.expiry) : a.expiry ? -1 : b.expiry ? 1 : 0) || +new Date(a.at) - +new Date(b.at))
  for (const l of L) { if (!left) break; const t = Math.min(l.qty, left); l.qty -= t; left -= t; cost += t * l.cost }
  const taken = n - left
  return { taken, cost: taken ? Math.round(cost / taken) : (L[0]?.cost ?? x.stock.lots.find((l) => l.productId === q.productId && l.owner === q.owner)?.cost ?? 0) }
}

/** پیشنهاد برداشت طبق «قاعدهٔ اولویت برداشت»: از کدام مالک چند عدد */
export function suggestOwners(x: DB, pid: string, vid: string | undefined, wh: string, n: number): { owner: string; qty: number }[] {
  const L = x.stock.lots.filter((l) => l.productId === pid && (l.variationId ?? '') === (vid ?? '') && l.warehouse === wh && l.qty > 0 && liveLot(x, l))
  const byOwner = new Map<string, { qty: number; at: number; cost: number }>()
  L.forEach((l) => { const c = byOwner.get(l.owner) ?? { qty: 0, at: Infinity, cost: Infinity }; byOwner.set(l.owner, { qty: c.qty + l.qty, at: Math.min(c.at, +new Date(l.at)), cost: Math.min(c.cost, l.cost) }) })
  const self = x.stock.parties.find((p) => p.kind === 'self')?.id ?? 'gh'
  const rule = x.stock.pickRule ?? 'fifo'
  const order = [...byOwner.entries()].sort(([a, A], [b, B]) => rule === 'own_first' ? Number(b === self) - Number(a === self) || A.at - B.at : rule === 'partner_first' ? Number(a === self) - Number(b === self) || A.at - B.at : rule === 'cost_low' ? A.cost - B.cost : A.at - B.at)
  const out: { owner: string; qty: number }[] = []; let left = n
  for (const [o, v] of order) { if (!left) break; const t = Math.min(v.qty, left); out.push({ owner: o, qty: t }); left -= t }
  if (left > 0) out.push({ owner: x.products.find((p) => p.id === pid)?.owner ?? self, qty: left })
  return out
}

/** کانال فروش سفارش برای تسویه: انتخاب دستی روی سفارش، یا نگاشت کانال سفارش در تنظیمات */
export const channelOf = (x: DB, o: Order) => (o as Order & { salesChannel?: string }).salesChannel ?? x.stock.channelMap?.[o.channel ?? ''] ?? 'gh-site'

/** سهم یک قلم از تخفیف سفارش و کارمزد درگاه، به نسبت مبلغ */
function shares(o: Order) {
  const live = o.shipments.flatMap((s) => s.items.filter((i) => !i.cancelled)); const tot = live.reduce((a, i) => a + i.price * i.qty, 0) || 1
  return (it: Item, qty: number) => ({ discount: Math.round(((o.discount ?? 0) * it.price * qty) / tot), fee: Math.round(((o.fee ?? 0) * it.price * qty) / tot) })
}

/** ثبت فروش اقلام یک مرسوله از روی اسکن‌ها (یا تخصیص خودکار وقتی اسکن نشده) */
export function recordShipment(x: DB, o: Order, sh: Shipment, scans: Scan[] | null, by: string) {
  const at = new Date().toISOString(); const chan = channelOf(x, o); const sh2 = shares(o); const touched = new Set<string>()
  const auto = !scans
  const picks: { it: Item; owner: string; qty: number; code?: string; unitId?: string }[] = []
  sh.items.forEach((it) => {
    if (it.cancelled) return
    if (it.unitId) { const u = x.units.find((y) => y.id === it.unitId) as (DB['units'][number] & { owner?: string }) | undefined; const sc = scans?.find((q) => q.ok && q.unitId === it.unitId); picks.push({ it, owner: sc?.owner ?? u?.owner ?? x.products.find((p) => p.id === it.productId)?.owner ?? 'gh', qty: it.qty, code: sc?.code ?? it.unitId, unitId: it.unitId }); return }
    if (scans) { const m = new Map<string, number>(); scans.filter((q) => q.ok && q.productId === it.productId && (q.variationId ?? '') === (it.variationId ?? '')).forEach((q) => m.set(q.owner, (m.get(q.owner) ?? 0) + 1)); m.forEach((n, ow) => picks.push({ it, owner: ow, qty: n, code: scans.find((q) => q.ok && q.owner === ow && q.productId === it.productId)?.code })); if (m.size) return }
    suggestOwners(x, it.productId, it.variationId, sh.warehouse, it.qty).forEach((s) => picks.push({ it, owner: s.owner, qty: s.qty }))
  })
  picks.forEach((pk) => {
    const tracked = x.stock.lots.some((l) => l.productId === pk.it.productId)
    const cost = pk.unitId ? (x.units.find((u) => u.id === pk.unitId)?.cost ?? 0) : tracked ? takeLots(x, { productId: pk.it.productId, variationId: pk.it.variationId, owner: pk.owner, warehouse: sh.warehouse }, pk.qty).cost : (x.products.find((p) => p.id === pk.it.productId)?.cost ?? Math.round(pk.it.price * 0.85))
    x.stock.sales.unshift({ id: id('S'), at, productId: pk.it.productId, variationId: pk.it.variationId, owner: pk.owner, warehouse: sh.warehouse, channel: chan, qty: pk.qty, price: pk.it.price, cost, orderId: o.id, shipId: sh.id, unitId: pk.unitId, code: pk.code, by, auto, ...sh2(pk.it, pk.qty), note: auto ? 'بدون اسکن؛ مالک طبق قاعدهٔ اولویت برداشت تعیین شد' : undefined })
    touched.add(pk.it.productId)
  })
  if (auto && !sh.pack) sh.pack = { at, by: `${by} (بدون اسکن)`, station: sh.warehouse, scans: picks.map((pk) => ({ at, code: pk.code ?? '—', productId: pk.it.productId, variationId: pk.it.variationId, unitId: pk.unitId, owner: pk.owner, ok: true, why: 'تخصیص خودکار بدون اسکن' })) }
  touched.forEach((p) => syncQty(x, p))
}

/** برگرداندن فروش‌های ثبت‌شده (لغو، مرجوعی یا برگشت وضعیت): ردیف منفی ثبت و موجودی به لات همان مالک برمی‌گردد */
export function reverseSales(x: DB, f: { orderId: string; shipId?: string; productId?: string; variationId?: string; qty?: number }, why: string, by: string, restock: 'site' | 'hold' = 'site') {
  const at = new Date().toISOString(); const touched = new Set<string>()
  const net = new Map<string, StockSale & { left: number }>()
  x.stock.sales.filter((s) => s.orderId === f.orderId && (!f.shipId || s.shipId === f.shipId) && (!f.productId || s.productId === f.productId) && (f.variationId === undefined || (s.variationId ?? '') === (f.variationId ?? ''))).forEach((s) => {
    const k = `${s.shipId}|${s.productId}|${s.variationId ?? ''}|${s.owner}|${s.unitId ?? ''}`; const c = net.get(k); if (c) c.left += s.qty; else net.set(k, { ...s, left: s.qty }) })
  let want = f.qty ?? Infinity
  net.forEach((s) => { if (s.left <= 0 || want <= 0) return; const n = Math.min(s.left, want); want -= n
    const r = n / s.qty
    x.stock.sales.unshift({ ...s, id: id('S'), at, qty: -n, discount: s.discount !== undefined ? Math.round(s.discount * r) : undefined, fee: s.fee !== undefined ? Math.round(s.fee * r) : undefined, by, reversal: s.id, note: why, auto: false })
    if (!s.unitId && x.stock.lots.some((l) => l.productId === s.productId)) x.stock.lots.push({ id: id('L'), productId: s.productId, variationId: s.variationId, owner: s.owner, warehouse: s.warehouse, qty: n, cost: s.cost, at, ref: `برگشت ${f.orderId}: ${why}`, hold: restock === 'hold' || undefined })
    touched.add(s.productId) })
  touched.forEach((p) => syncQty(x, p))
}

/** بعد از هر تغییر: انتقال وضعیت مرسوله‌ها را با قبل مقایسه و دفتر را به‌روز می‌کند */
export function ledgerHook(prev: DB, next: DB, by: string) {
  if (!next.stock || prev.orders === next.orders) return
  const before = new Map<string, { status: string; cancelled: string }>()
  prev.orders.forEach((o) => o.shipments.forEach((s) => before.set(s.id, { status: s.status, cancelled: s.items.map((i) => (i.cancelled ? 1 : 0)).join('') })))
  const touchedP = new Set<string>()
  next.orders.forEach((o) => o.shipments.forEach((s) => {
    const b = before.get(s.id); const wasPacked = b ? PACKED.includes(b.status) : false; const isPacked = PACKED.includes(s.status)
    const has = next.stock.sales.filter((x) => x.shipId === s.id).reduce((t, x) => t + x.qty, 0) > 0
    if (isPacked && !wasPacked && !has) recordShipment(next, o, s, null, by)
    if (wasPacked && !isPacked && has) {
      const restock = (s.items.find((i) => (i as Item & { restockMode?: 'site' | 'hold' }).restockMode) as Item & { restockMode?: 'site' | 'hold' } | undefined)?.restockMode ?? 'site'
      reverseSales(next, { orderId: o.id, shipId: s.id }, s.status === 'ship.cancelled' ? 'لغو مرسوله پس از بسته‌بندی' : 'برگشت وضعیت به پیش از بسته‌بندی', by, restock)
      if (s.status !== 'ship.cancelled') delete s.pack
    }
    // لغو یک قلم بعد از بسته‌بندی
    if (isPacked && b && b.cancelled !== s.items.map((i) => (i.cancelled ? 1 : 0)).join('')) s.items.forEach((it, i) => { if (it.cancelled && b.cancelled[i] === '0') reverseSales(next, { orderId: o.id, shipId: s.id, productId: it.productId, variationId: it.variationId, qty: it.qty }, 'لغو قلم پس از بسته‌بندی', by, (it as Item & { restockMode?: 'site' | 'hold' }).restockMode ?? 'site') })
    // سفارش باز تازه یا لغو پیش از بسته‌بندی: رزرو تغییر کرده
    if (!b || b.status !== s.status) s.items.forEach((it) => touchedP.add(it.productId))
  }))
  touchedP.forEach((p) => { if (next.stock.lots.some((l) => l.productId === p)) syncQty(next, p) })
  // مرجوعی تأییدشده و بازپرداخت‌شده: فروش برعکس می‌شود و کالا تا بررسی دوباره «نگه‌داشته» به موجودی مالک برمی‌گردد
  if (prev.returns !== next.returns) {
    const was = new Map(prev.returns.map((r) => [r.id, r.status]))
    next.returns.forEach((r) => { if (['return.refunded', 'return.partial'].includes(r.status) && !['return.refunded', 'return.partial'].includes(was.get(r.id) ?? '')) {
      const pid = r.productId ?? next.units.find((u) => u.id === r.unitId)?.productId; if (!pid) return
      reverseSales(next, { orderId: r.orderId, productId: pid, qty: 1 }, `مرجوعی ${r.id}`, by, 'hold') } })
  }
}
