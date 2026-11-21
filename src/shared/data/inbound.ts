// ورود بار و حواله: محمولهٔ خرید (یاسین از عراق، بهشاد از یوسف یا هر تأمین‌کننده) با تنوع، مالک، تقسیم بین انبارها، بها و قیمت پیشنهادی؛
// برچسب مالک‌دار از همان لحظهٔ ثبت؛ حوالهٔ بین انبارها با چک‌لیست اسکن؛ و ابزار تشخیص «این کالا باید دست چه کسی باشد».
import type { DB } from './seed'
import { labelCode, scanLookup, type StockDB } from './stock'
import type { Alloc, InBatch, InItem, InVariant } from './incoming'

export const CURRENCIES = ['دلار', 'درهم', 'دینار', 'یورو', 'لیر', 'تومان'] as const
export const BUY_SOURCES = ['آمازون', 'نون (Noon)', 'بازار اربیل', 'بازار سلیمانیه', 'فروشگاه رسمی', 'عمده‌فروش', 'یوسف', 'سایر'] as const

export type ManifestLine = {
  key: string; owner: string; code: string; title: string; vname?: string; qty: number; packed: number; received: number
  productId?: string; variationId?: string; batchId?: string; itemId?: string; variantId?: string
}
export type ManifestIssue = { at: string; by: string; code: string; kind: 'wrong' | 'extra' | 'unknown' | 'missing' | 'damaged' | 'short'; note?: string }
export type Manifest = {
  id: string; from: string; to: string; status: 'draft' | 'packing' | 'sent' | 'received' | 'partial' | 'cancelled'
  createdAt: string; by: string; batchId?: string; note?: string; reason?: string; carrier?: string; tracking?: string
  sentAt?: string; sentBy?: string; receivedAt?: string; receivedBy?: string
  lines: ManifestLine[]; issues: ManifestIssue[]; events: { at: string; by: string; text: string }[]
}
export const MANIFEST_STATUS: Record<Manifest['status'], { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'purple' }> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' }, packing: { label: 'در حال جمع‌آوری با اسکن', tone: 'info' }, sent: { label: 'ارسال شد، در راه', tone: 'purple' },
  received: { label: 'تحویل کامل', tone: 'success' }, partial: { label: 'تحویل با مغایرت', tone: 'warning' }, cancelled: { label: 'لغو شد', tone: 'danger' },
}

/** پسوند تنوع روی برچسب: V1، V2 … (بعد از ساخت صفحه، همین پسوند روی تنوع کالا می‌نشیند تا برچسب‌ها عوض نشوند) */
export const varSuffix = (i: number) => `V${i + 1}`
/** کد برچسب یک قلم یا تنوع محموله، پیش از آنکه صفحهٔ کالا ساخته شده باشد */
export function itemLabel(s: StockDB, it: InItem, v?: InVariant | null, owner?: string) {
  return labelCode(s, owner ?? it.owner ?? allocOf(it, v)[0]?.owner ?? 'gh', { id: it.id, code: it.code }, v ? { suffix: v.suffix } : null)
}
/** سهم مالک‌ها و انبارهای یک تنوع (یا کالای بی‌تنوع). برای داده‌های قدیمی از «تقسیم انبار + مالک کالا» ساخته می‌شود */
export function allocOf(it: InItem, v?: InVariant | null): Alloc[] {
  const A = v ? v.alloc : it.alloc; if (A?.length) return A.filter((a) => a.qty > 0)
  const sp = (v ? v.split : it.split) ?? {}; const own = it.owner ?? 'gh'
  const L = Object.entries(sp).filter(([, q]) => q > 0).map(([wh, qty]) => ({ owner: own, wh, qty }))
  const total = v ? v.qty : it.qty; const placed = L.reduce((a, x) => a + x.qty, 0)
  return placed ? L : total ? [{ owner: own, wh: '', qty: total }] : []
}
export const allocQty = (A: Alloc[]) => A.reduce((a, x) => a + (x.qty || 0), 0)
/** مالک‌های یک تنوع یا کل کالا */
export const ownersOf = (it: InItem, v?: InVariant | null) => [...new Set((v !== undefined ? allocOf(it, v) : (it.variants?.length ? it.variants.flatMap((x) => allocOf(it, x)) : allocOf(it))).map((a) => a.owner))]
/** تعداد کل و تقسیم انبار هر قلم (با تنوع یا بدون تنوع) */
export const itemQty = (it: InItem) => (it.variants?.length ? it.variants.reduce((a, v) => a + allocQty(allocOf(it, v)), 0) : allocQty(allocOf(it)) || it.qty)
export function itemSplit(it: InItem, owner?: string): Record<string, number> {
  const out: Record<string, number> = {}
  ;(it.variants?.length ? it.variants.flatMap((v) => allocOf(it, v)) : allocOf(it)).filter((a) => a.wh && (!owner || a.owner === owner)).forEach((a) => { out[a.wh] = (out[a.wh] ?? 0) + a.qty })
  return out
}
/** خط‌های برچسب یک قلم: هر تنوع × هر مالک یک کد جدا دارد (پیشوند کد، مالک را نشان می‌دهد) */
export function labelLines(s: StockDB, it: InItem) {
  return (it.variants?.length ? it.variants : [null]).flatMap((v) => { const A = allocOf(it, v); return [...new Set(A.map((a) => a.owner))].map((owner) => { const mine = A.filter((a) => a.owner === owner); const split: Record<string, number> = {}; mine.forEach((a) => { if (a.wh) split[a.wh] = (split[a.wh] ?? 0) + a.qty })
    return { v, owner, code: itemLabel(s, it, v, owner), qty: allocQty(mine), split } }) })
}
/** بهای تومانی هر عدد: بهای ارزی × نرخ + سهم هزینهٔ حمل، گمرک و سایر به نسبت ارزش */
export function landed(b: InBatch, it: InItem) {
  const rate = b.currency === 'تومان' ? 1 : b.rate || 0
  const base = (it.unitCost ?? 0) * rate
  const total = b.items.reduce((a, x) => a + (x.unitCost ?? 0) * rate * itemQty(x), 0)
  const extra = (b.freight ?? 0) + (b.customs ?? 0) + (b.other ?? 0)
  const share = total > 0 ? (base / total) * extra : 0
  return { base: Math.round(base), unit: Math.round(base + share), share: Math.round(share) }
}

/** هر کدی که اسکن شود: کالای ساخته‌شده (با برچسب مالک‌دار) یا قلم محموله‌ای که هنوز صفحه ندارد */
export type Resolved = { owner: string; code: string; title: string; vname?: string; productId?: string; variationId?: string; batchId?: string; itemId?: string; variantId?: string; split?: Record<string, number>; image?: string }
export function resolveCode(d: DB, raw: string): Resolved | null {
  const code = raw.trim().toUpperCase(); if (!code) return null
  for (const b of d.incoming) for (const it of b.items) for (const ln of labelLines(d.stock, it)) if (ln.code.toUpperCase() === code) {
    const p = it.productId ? d.products.find((x) => x.id === it.productId) : undefined
    const vid = ln.v ? p?.variations?.find((x) => x.suffix === ln.v!.suffix)?.id : undefined
    return { owner: ln.owner, code, title: p?.title ?? it.name, vname: ln.v?.label, productId: p?.id, variationId: vid, batchId: b.id, itemId: it.id, variantId: ln.v?.id, split: ln.split, image: p?.image || it.photos?.[0] }
  }
  const r = scanLookup(d.stock, d.products, code)
  if (r) { const p = d.products.find((x) => x.id === r.productId); const v = p?.variations?.find((x) => x.id === r.variationId); return { owner: r.owner, code, title: p?.title ?? r.productId, vname: v ? Object.values(v.opts).join(' · ') : undefined, productId: r.productId, variationId: r.variationId, image: p?.image } }
  return null
}

/** خلاصهٔ پیش‌فرض اقساط هر سرویس */
export type Bnpl = { provider: string; count: number; schedule: { due: string; amount: number; paid?: boolean }[]; model: 'after_delivery' | 'after_purchase' | 'per_installment'; fee: number; settleDays: number; note?: string; edited?: { at: string; by: string } }
export const BNPL_MODEL: Record<Bnpl['model'], string> = {
  after_delivery: 'تسویهٔ یک‌جا با ما بعد از تأیید تحویل (منهای کارمزد)',
  after_purchase: 'تسویهٔ یک‌جا با ما بعد از خرید (منهای کارمزد)',
  per_installment: 'واریز به ما هم‌زمان با پرداخت هر قسط مشتری',
}
