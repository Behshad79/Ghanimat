// ورود بار و حواله: محمولهٔ خرید (یاسین از عراق، بهشاد از یوسف یا هر تأمین‌کننده) با تنوع، مالک، تقسیم بین انبارها، بها و قیمت پیشنهادی؛
// برچسب مالک‌دار از همان لحظهٔ ثبت؛ حوالهٔ بین انبارها با چک‌لیست اسکن؛ و ابزار تشخیص «این کالا باید دست چه کسی باشد».
import type { DB } from './seed'
import { labelCode, scanLookup, type StockDB } from './stock'
import type { InBatch, InItem, InVariant } from './incoming'

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
export function itemLabel(s: StockDB, it: InItem, v?: InVariant | null) {
  return labelCode(s, it.owner ?? 'gh', { id: it.id, code: it.code }, v ? { suffix: v.suffix } : null)
}
/** تعداد کل و تقسیم انبار هر قلم (با تنوع یا بدون تنوع) */
export const itemQty = (it: InItem) => (it.variants?.length ? it.variants.reduce((a, v) => a + v.qty, 0) : it.qty)
export function itemSplit(it: InItem): Record<string, number> {
  const out: Record<string, number> = {}
  const add = (sp?: Record<string, number>) => Object.entries(sp ?? {}).forEach(([w, q]) => { out[w] = (out[w] ?? 0) + (q || 0) })
  if (it.variants?.length) it.variants.forEach((v) => add(v.split)); else add(it.split)
  return out
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
  for (const b of d.incoming) for (const it of b.items) {
    const vs = it.variants?.length ? it.variants : [null]
    for (const v of vs) if (itemLabel(d.stock, it, v).toUpperCase() === code) {
      const p = it.productId ? d.products.find((x) => x.id === it.productId) : undefined
      const vid = v ? p?.variations?.find((x) => x.suffix === v.suffix)?.id : undefined
      return { owner: it.owner ?? 'gh', code, title: p?.title ?? it.name, vname: v?.label, productId: p?.id, variationId: vid, batchId: b.id, itemId: it.id, variantId: v?.id, split: v ? v.split : it.split, image: p?.image || it.photos?.[0] }
    }
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
