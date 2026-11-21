// عملیات ورود بار و حواله روی پایگاه داده: ساخت کالا از قلم محموله، رسید در انبار ورودی، ساخت حواله، جمع‌آوری و تحویل با اسکن
import type { DB, Product } from '@/shared/data/seed'
import type { InBatch, InItem } from '@/shared/data/incoming'
import { itemLabel, itemQty, landed, type Manifest, type ManifestLine } from '@/shared/data/inbound'
import { labelCode } from '@/shared/data/stock'
import { syncQty, takeLots } from '@/shared/data/ledger'

export const now = () => new Date().toISOString()
export const mid = (p: string) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`
const VAR_AXIS = 'تنوع'

/** صفحهٔ کالا برای یک قلم محموله: با همان کد و پسوند تنوع، تا برچسب‌هایی که چاپ شده عوض نشوند. اگر از قبل ساخته شده، همان را برمی‌گرداند */
export function ensureProduct(x: DB, b: InBatch, it: InItem, status: 'product.incoming' | 'product.draft' = 'product.incoming'): Product {
  const ex = it.productId ? x.products.find((p) => p.id === it.productId) : undefined
  if (ex) return ex
  const tpl = structuredClone(x.products[0]) as Record<string, unknown>
  ;['ean', 'model', 'specs', 'keyFeatures', 'long', 'box', 'pros', 'cons', 'metaTitle', 'metaDesc', 'slug', 'video', 'warrantyTerms', 'saleFrom', 'saleUntil', 'irc', 'comingSoon', 'exclusive'].forEach((k) => delete tpl[k])
  const pid = `p${Date.now().toString(36)}${it.id}`; const cost = landed(b, it).unit
  const vars = it.variants?.length ? it.variants : null
  const p = { ...(tpl as unknown as Product), id: pid, code: it.code, title: it.name, en: it.name, brand: it.brand || 'بدون برند', category: it.category || 'سایر', subCats: [], status, mode: 'qty',
    kind: vars ? 'variable' : 'simple', attrs: vars ? [{ axis: VAR_AXIS, name: VAR_AXIS, values: vars.map((v) => v.label), forVar: true, visible: true }] : [],
    variations: vars ? vars.map((v) => ({ id: `var-${pid}-${v.suffix.toLowerCase()}`, opts: { [VAR_AXIS]: v.label }, suffix: v.suffix, qty: { tehran: 0, mahabad: 0 }, enabled: true, price: it.sellPrice || undefined })) : undefined,
    defaultVar: undefined, qty: { tehran: 0, mahabad: 0 }, priceNew: it.sellPrice ?? 0, price: undefined, compareAt: undefined, cost, image: it.photos?.[0] ?? '', images: it.photos ?? [], short: it.specs ?? '',
    rating: 0, reviews: 0, views: 0, cvr: 0, health: 20, featured: false, torob: false, incoming: b.id, owner: it.owner && it.owner !== 'gh' ? it.owner : undefined, partner: it.owner && it.owner !== 'gh' ? true : undefined,
    pdp: { ...((tpl.pdp as object) ?? {}), videos: [], flaws: [], variantGroup: '', variantLabel: '', variant: undefined, amazonUrl: it.amazonUrl, cardLines: undefined, featured: false, covered: '', notCovered: '' },
    fromBatch: { batchId: b.id, itemId: it.id } } as unknown as Product
  x.products.unshift(p); it.productId = pid
  return p
}

/** خط‌های یک قلم با کد برچسب (هر تنوع یک خط) */
export function itemLines(x: DB, it: InItem): { v?: InItem['variants'] extends (infer T)[] | undefined ? T : never; code: string; qty: number; split: Record<string, number> }[] {
  return it.variants?.length ? it.variants.map((v) => ({ v, code: itemLabel(x.stock, it, v), qty: v.qty, split: v.split ?? {} })) : [{ code: itemLabel(x.stock, it, null), qty: it.qty, split: it.split ?? {} }]
}

/** رسید محموله در انبار ورودی: موجودی همهٔ رسیده‌ها به نام مالک در همان انبار ثبت می‌شود و برای سهم انبارهای دیگر حواله ساخته می‌شود */
export function landBatch(x: DB, batchId: string, got: Record<string, number>, by: string): string[] {
  const b = x.incoming.find((q) => q.id === batchId)!; const at = b.landing ?? 'tehran'; const made: string[] = []
  const outs = new Map<string, ManifestLine[]>()
  b.items.forEach((it) => {
    const p = ensureProduct(x, b, it, 'product.draft'); if (p.status === 'product.incoming') p.status = 'product.draft'
    const cost = landed(b, it).unit; let total = 0
    itemLines(x, it).forEach(({ v, code, split }) => {
      const key = `${it.id}|${v?.id ?? ''}`; const q = Math.max(0, got[key] ?? 0); if (!q) return; total += q
      const vid = v ? p.variations?.find((y) => y.suffix === v.suffix)?.id : undefined
      x.stock.lots.unshift({ id: mid('L') + it.id + (v?.suffix ?? ''), productId: p.id, variationId: vid, owner: it.owner ?? 'gh', warehouse: at, qty: q, qty0: q, cost, at: now(), ref: `${b.id} · ${b.title}` })
      // سهم انبارهای دیگر، به اندازهٔ آنچه واقعاً رسیده
      let left = q; Object.entries(split).filter(([w]) => w !== at).forEach(([w, n]) => { const send = Math.min(left, n || 0); if (!send) return; left -= send
        const L = outs.get(w) ?? []; L.push({ key: `${p.id}|${vid ?? ''}|${it.owner ?? 'gh'}`, owner: it.owner ?? 'gh', code, title: p.title, vname: v?.label, qty: send, packed: 0, received: 0, productId: p.id, variationId: vid, batchId: b.id, itemId: it.id, variantId: v?.id }); outs.set(w, L) })
    })
    it.landedAt = { ...(it.landedAt ?? {}), [at]: total }; it.arrived = { qty: total, at: now() }
    syncQty(x, p.id)
  })
  x.stock.manifests = x.stock.manifests ?? []
  outs.forEach((lines, to) => { const id = mid('HV'); made.push(id)
    x.stock.manifests!.unshift({ id, from: at, to, status: 'draft', createdAt: now(), by, batchId: b.id, reason: `سهم ${to === 'tehran' ? 'انبار تهران' : 'انبار مقصد'} از ${b.title}`, lines, issues: [], events: [{ at: now(), by, text: `ساخت خودکار از رسید محمولهٔ ${b.id}` }] }) })
  b.stage = 'رسید به انبار'; b.receivedAt = now()
  return made
}

/** خط حواله از موجودی فعلی یک انبار (برای انتقال دستی یا انتقال همهٔ موجودی) */
export function linesFromStock(x: DB, from: string, owner?: string): ManifestLine[] {
  const m = new Map<string, ManifestLine>()
  x.stock.lots.filter((l) => l.warehouse === from && l.qty > 0 && !l.hold && (!owner || l.owner === owner)).forEach((l) => {
    const p = x.products.find((q) => q.id === l.productId); if (!p) return; const v = p.variations?.find((q) => q.id === l.variationId)
    const key = `${l.productId}|${l.variationId ?? ''}|${l.owner}`; const cur = m.get(key)
    if (cur) cur.qty += l.qty
    else m.set(key, { key, owner: l.owner, code: labelCode(x.stock, l.owner, p, v ?? null), title: p.title, vname: v ? Object.values(v.opts).join(' · ') : undefined, qty: l.qty, packed: 0, received: 0, productId: l.productId, variationId: l.variationId })
  })
  return [...m.values()]
}

/** تحویل حواله در انبار مقصد: به اندازهٔ «رسیده» از انبار مبدأ برداشته و با همان مالک و بها در مقصد ثبت می‌شود */
export function receiveManifest(x: DB, id: string, by: string) {
  const m = x.stock.manifests!.find((q) => q.id === id)!; const touched = new Set<string>()
  m.lines.forEach((ln) => { if (!ln.productId || !ln.received) return
    const t = takeLots(x, { productId: ln.productId, variationId: ln.variationId, owner: ln.owner, warehouse: m.from }, ln.received)
    x.stock.lots.unshift({ id: mid('L') + ln.key.length, productId: ln.productId, variationId: ln.variationId, owner: ln.owner, warehouse: m.to, qty: ln.received, qty0: ln.received, cost: t.cost, at: now(), ref: `حوالهٔ ${m.id}` })
    touched.add(ln.productId) })
  const short = m.lines.some((l) => l.received < l.qty) || m.issues.some((i) => i.kind === 'damaged')
  m.status = short ? 'partial' : 'received'; m.receivedAt = now(); m.receivedBy = by
  m.lines.filter((l) => l.received < l.qty).forEach((l) => m.issues.push({ at: now(), by, code: l.code, kind: 'short', note: `${l.qty - l.received} عدد کمتر رسید` }))
  m.events.push({ at: now(), by, text: short ? 'تحویل با مغایرت ثبت شد' : 'تحویل کامل با اسکن' })
  touched.forEach((pid) => syncQty(x, pid))
  return { short, products: [...touched] }
}

export const manifestTotals = (m: Manifest) => ({ qty: m.lines.reduce((a, l) => a + l.qty, 0), packed: m.lines.reduce((a, l) => a + Math.min(l.packed, l.qty), 0), received: m.lines.reduce((a, l) => a + Math.min(l.received, l.qty), 0) })
export const batchTotals = (b: InBatch) => ({ items: b.items.length, units: b.items.reduce((a, it) => a + itemQty(it), 0) })
