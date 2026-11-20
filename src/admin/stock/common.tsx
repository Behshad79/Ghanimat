import type { DB, Product } from '@/shared/data/seed'
import { labelCode, type Lot, type StockDB } from '@/shared/data/stock'
import { varLabel } from '@/shared/lib/variants'

export const partyOf = (s: StockDB, id: string) => s.parties.find((x) => x.id === id)
export const partyName = (s: StockDB, id: string) => partyOf(s, id)?.name ?? id
export const whName = (s: StockDB, id: string) => s.warehouses.find((w) => w.id === id)?.name ?? id
export const chName = (s: StockDB, id: string) => s.channels.find((c) => c.id === id)?.name ?? id

/** برچسب رنگی مالک با پیشوند کدش */
export function PartyChip({ s, id, n }: { s: StockDB; id: string; n?: number }) {
  const p = partyOf(s, id); const c = p?.color ?? '#666'
  return <span className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-11 font-semibold" style={{ borderColor: `${c}55`, background: `${c}12`, color: c }}><bdi dir="ltr" className="font-mono">{p?.prefix ?? id}</bdi>{p?.name ?? id}{n !== undefined && <b className="font-mono">×{n.toLocaleString('fa-IR')}</b>}</span>
}

/** نام کالا و تنوع */
export function pv(d: DB, pid: string, vid?: string) {
  const p = d.products.find((x) => x.id === pid && (!vid || x.variations?.some((v) => v.id === vid))) ?? d.products.find((x) => x.id === pid)
  const v = vid ? p?.variations?.find((x) => x.id === vid) : undefined
  return { p, v, name: p?.title ?? pid, vname: v && p ? varLabel(d, p.attrs ?? [], v) : '', full: `${p?.title ?? pid}${v && p ? ` · ${varLabel(d, p.attrs ?? [], v)}` : ''}` }
}
export const codeFor = (d: DB, owner: string, pid: string, vid?: string) => { const { p, v } = pv(d, pid, vid); return p ? labelCode(d.stock, owner, p, v ?? null) : pid }

/** موجودی تهران و مهاباد کالا و تنوع‌ها از روی لات‌های مالکیت به‌روز می‌شود تا سایت و انبار یک عدد ببینند */
export function syncQty(x: DB, pid: string) {
  const L = x.stock.lots.filter((l) => l.productId === pid); if (!L.length) return
  x.products.filter((p) => p.id === pid && p.mode !== 'serial').forEach((p) => {
    const sum = (wh: string, vid?: string) => L.filter((l) => l.warehouse === wh && (vid === undefined || l.variationId === vid)).reduce((a, l) => a + l.qty, 0)
    if (p.variations?.length) { p.variations.forEach((v) => { v.qty = { tehran: sum('tehran', v.id), mahabad: sum('mahabad', v.id) } }); p.qty = { tehran: p.variations.reduce((a, v) => a + v.qty.tehran, 0), mahabad: p.variations.reduce((a, v) => a + v.qty.mahabad, 0) } }
    else p.qty = { tehran: sum('tehran'), mahabad: sum('mahabad') }
  })
}

/** برداشت از موجودی یک مالک در یک انبار (قدیمی‌ترین لات اول)؛ بهای تمام‌شدهٔ میانگین برمی‌گردد */
export function takeLots(x: DB, q: { productId: string; variationId?: string; owner: string; warehouse: string }, n: number) {
  let left = n; let cost = 0
  const L = x.stock.lots.filter((l) => l.productId === q.productId && (l.variationId ?? '') === (q.variationId ?? '') && l.owner === q.owner && l.warehouse === q.warehouse && l.qty > 0).sort((a, b) => +new Date(a.at) - +new Date(b.at))
  for (const l of L) { if (!left) break; const t = Math.min(l.qty, left); l.qty -= t; left -= t; cost += t * l.cost }
  const taken = n - left
  return { taken, cost: taken ? Math.round(cost / taken) : (L[0]?.cost ?? 0) }
}

export const ownersAt = (s: StockDB, pid: string, vid: string | undefined, wh: string) => {
  const m = new Map<string, number>(); s.lots.filter((l) => l.productId === pid && (l.variationId ?? '') === (vid ?? '') && l.warehouse === wh).forEach((l) => m.set(l.owner, (m.get(l.owner) ?? 0) + l.qty)); return m
}
export const lotKey = (l: Pick<Lot, 'productId' | 'variationId'>) => `${l.productId}|${l.variationId ?? ''}`
export const productsWithLots = (d: DB): Product[] => { const ids = new Set(d.stock.lots.map((l) => l.productId)); const seen = new Set<string>(); return d.products.filter((p) => ids.has(p.id) && !seen.has(p.id) && !!seen.add(p.id)) }
