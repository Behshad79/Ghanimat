// کالای متغیر به سبک ووکامرس: ویژگی‌ها، ترکیب‌ها، کد اختصاصی، قیمت، موجودی و تصویر هر تنوع
import type { DB, PAttr, Product, Variation } from '../data/seed'

export type AxisVal = { v: string; l: string; hex?: string }
export const LOCAL = 'local'

/** نام و مقدارهای یک ویژگی (سراسری از ویژگی‌های فروشگاه، اختصاصی از خود ویژگی) */
export function axisOf(d: Pick<DB, 'axes'>, a: PAttr): { name: string; kind: string; values: AxisVal[] } {
  if (a.axis === LOCAL) return { name: a.name ?? 'ویژگی', kind: 'text', values: a.values.map((v) => ({ v, l: v })) }
  const A = d.axes.find((x) => x.id === a.axis); return { name: A?.name ?? a.axis, kind: A?.kind ?? 'text', values: A?.values ?? [] }
}
export const attrKey = (a: PAttr) => (a.axis === LOCAL ? `local:${a.name}` : a.axis)
export const valLabel = (d: Pick<DB, 'axes'>, a: PAttr, v: string) => axisOf(d, a).values.find((x) => x.v === v)?.l ?? v
export const valHex = (d: Pick<DB, 'axes'>, a: PAttr, v: string) => axisOf(d, a).values.find((x) => x.v === v)?.hex

/** برچسب تنوع، مثل «آبی · ۲۵۶ گیگابایت» */
export function varLabel(d: Pick<DB, 'axes'>, attrs: PAttr[], v: Variation) {
  return attrs.filter((a) => a.forVar).map((a) => { const k = attrKey(a); const x = v.opts[k]; return x === '*' ? `هر ${axisOf(d, a).name}` : x ? valLabel(d, a, x) : '' }).filter(Boolean).join(' · ') || 'تنوع'
}

/** همهٔ ترکیب‌های ویژگی‌های «استفاده برای تنوع» */
export function combos(attrs: PAttr[]): Record<string, string>[] {
  const use = attrs.filter((a) => a.forVar && a.values.length)
  return use.reduce<Record<string, string>[]>((acc, a) => acc.flatMap((c) => a.values.map((v) => ({ ...c, [attrKey(a)]: v }))), [{}]).filter((c) => Object.keys(c).length)
}
export const sameOpts = (a: Record<string, string>, b: Record<string, string>) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); return [...k].every((x) => a[x] === b[x]) }

export const skuOf = (code: string, v: Variation) => `${code || 'GH-P-…'}-${v.suffix}`
export const effPrice = (v: Variation, base: number) => (v.sale && v.sale > 0 && (!v.saleUntil || new Date(v.saleUntil) > new Date()) ? v.sale : v.price || base)
export const varStock = (v: Variation) => v.qty.tehran + v.qty.mahabad
export const totalQty = (vs: Variation[]) => vs.filter((v) => v.enabled).reduce((a, v) => ({ tehran: a.tehran + v.qty.tehran, mahabad: a.mahabad + v.qty.mahabad }), { tehran: 0, mahabad: 0 })
export function priceRange(vs: Variation[], base: number): [number, number] {
  const p = vs.filter((v) => v.enabled).map((v) => effPrice(v, base)).filter(Boolean); return p.length ? [Math.min(...p), Math.max(...p)] : [base, base]
}
export const isVariable = (p?: Product) => p?.kind === 'variable' && !!p.variations?.length
/** موجودی هر تنوع یک کالا (برای انبار و گزارش) */
export function variationRows(d: DB, p: Product) {
  return (p.variations ?? []).map((v) => { const units = d.units.filter((u) => u.productId === p.id && u.variationId === v.id); return { v, label: varLabel(d, p.attrs ?? [], v), sku: skuOf(p.code ?? '', v), stock: p.mode === 'serial' ? units.filter((u) => ['unit.published', 'unit.ready'].includes(u.status)).length : varStock(v), units } })
}
