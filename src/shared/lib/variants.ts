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
/** قیمت ویژه فقط در بازهٔ زمان‌بندی‌شده فعال است؛ تاریخ پایانِ بدون ساعت تا آخر همان روز حساب می‌شود */
const saleEnd = (u: string) => new Date(u.length <= 10 ? `${u}T23:59:59` : u)
export const saleState = (v: Pick<Variation, 'sale' | 'saleFrom' | 'saleUntil'>, now = new Date()): 'none' | 'scheduled' | 'active' | 'ended' => !v.sale || v.sale <= 0 ? 'none' : v.saleFrom && new Date(v.saleFrom) > now ? 'scheduled' : v.saleUntil && saleEnd(v.saleUntil) <= now ? 'ended' : 'active'
export const effPrice = (v: Variation, base: number) => (saleState(v) === 'active' ? v.sale! : v.price || base)
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

/** روش‌های ارسالی که با انتخاب این تنوع در صفحهٔ کالا نمایش داده می‌شود (بر اساس موجودی هر انبار) */
export type Delivery = { tone: 'fast' | 'post' | 'none' | 'pre'; title: string; lines: string[]; from: string[] }
export function deliveryFor(v: Pick<Variation, 'qty' | 'backorder'>, fastEligible: boolean, fastTehran = true, fastMahabad = true): Delivery {
  const t = v.qty.tehran, m = v.qty.mahabad; const from = [t > 0 && 'تهران', m > 0 && 'مهاباد'].filter(Boolean) as string[]
  if (!t && !m) return v.backorder ? { tone: 'pre', title: 'پیش‌فروش', lines: ['ارسال پس از رسیدن محمولهٔ بعدی', 'زمان تقریبی رسیدن در صفحه نمایش داده می‌شود'], from } : { tone: 'none', title: 'ناموجود', lines: ['دکمهٔ «موجود شد، خبرم کن» به‌جای «افزودن به سبد»', 'کالاهای مشابه نمایش داده می‌شود'], from }
  if (t > 0 && fastEligible && fastTehran) return { tone: 'fast', title: 'ارسال سریع ۲ ساعته در تهران و کرج', lines: ['تحویل ۲ ساعته در تهران و کرج · پیک', 'تحویل حضوری در شعبه', 'ارسال پستی به سایر شهرها'], from }
  if (t > 0) return { tone: 'post', title: 'ارسال از انبار تهران', lines: ['ارسال پیشتاز به همهٔ شهرها', 'تحویل حضوری در شعبه'], from }
  return { tone: 'post', title: 'فقط ارسال پیشتاز از انبار مهاباد', lines: ['ارسال سریع تهران برای این تنوع در دسترس نیست', `ارسال پیشتاز به همهٔ شهرها · ۲ تا ۴ روز کاری${fastMahabad ? '؛ در مهاباد تحویل سریع شهری' : ''}`], from }
}

/** قیمت تمام‌شدهٔ هر تنوع: قیمت خرید خود تنوع (یا پایه) × نرخ ارز + هزینهٔ جانبی خود تنوع (یا پایه) */
export type CostBase = { costFx: number; rate: number; extra: number }
export const landedVar = (v: Pick<Variation, 'costFx' | 'extra'>, b: CostBase, rate = b.rate) => Math.round((v.costFx ?? b.costFx) * rate + (v.extra ?? b.extra))
export const marginOf = (price: number, cost: number) => (price && cost ? ((price - cost) / price) * 100 : 0)
/** قیمت لازم برای رسیدن به حاشیهٔ هدف، گردشده به هزار تومان */
export const priceForMargin = (cost: number, pct: number) => (pct < 100 ? Math.ceil(cost / (1 - pct / 100) / 1000) * 1000 : cost)
