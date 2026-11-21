// مالکیت و محل موجودی، فروش بین شرکا و تسویهٔ خودکار
// هر واحد فروش سه نقش دارد:
//   مالک (تأمین‌کننده): کسی که پول کالا را داده و بهای تمام‌شده و سهم سودش مال اوست
//   محل (انبار): کالا فیزیکی کجاست و از کجا ارسال می‌شود؛ هر انبار یک گردانندهٔ مشخص دارد
//   فروشنده (کانال): چه کسی فروخته و پول را چه کسی گرفته (سایت غنیمت، شعبهٔ شریک، سایت خود شریک)
// اگر مالک و فروشنده یکی نباشند، طبق «قرارداد سهم» میان آن دو، سهم هر طرف خودکار حساب می‌شود.

export type Party = { pause?: PauseState; logo?: string; brandName?: string; id: string; name: string; prefix: string; kind: 'self' | 'partner'; color: string; site?: string; phone?: string; active: boolean; city?: string; userId?: string; account?: 'internal' | 'portal'; joinedAt?: string; note?: string; offAt?: string; offBy?: string; offWhy?: string; payout?: { cycle: 'weekly' | 'biweekly' | 'monthly'; holdDays: number; minShelfDays?: number } }
/** توقف فوری: هر بخش جدا قابل توقف است و بدون پاک شدن سابقه، با یک کلیک برمی‌گردد */
export type PauseState = { at: string; by: string; why: string; until?: string; sell: boolean; ship: boolean; sync: boolean; login: boolean }
export type StockWh = { pause?: PauseState; id: string; name: string; city: string; operator: string; handlingFee: number; active: boolean }
export type Channel = { id: string; name: string; seller: string; collector: string; brand: string; active: boolean }
/** مدل قرارداد: تقسیم سود (درصد سود برای فروشنده)، قیمت توافقی ثابت (بهای هر ورود همان مبلغ مالک است و بقیه مال فروشنده) یا کمیسیون (درصد از مبلغ فروش برای فروشنده) */
export type Agreement = { owner: string; seller: string; sellerPct: number; note?: string; model?: 'profit_share' | 'fixed_price' | 'commission' }
/** qty0: تعداد همان ورود در لحظهٔ ثبت (qty با هر فروش کم می‌شود ولی qty0 ثابت می‌ماند و سند ورود است) */
export type Lot = { id: string; productId: string; variationId?: string; owner: string; warehouse: string; qty: number; qty0?: number; cost: number; at: string; ref?: string; hold?: boolean; expiry?: string; batch?: string }
/** qty منفی یعنی برگشت (لغو یا مرجوعی) همان فروش؛ discount و fee جمع سهم این ردیف از تخفیف سفارش و کارمزد درگاه است */
export type StockSale = { id: string; at: string; productId: string; variationId?: string; owner: string; warehouse: string; channel: string; qty: number; price: number; cost: number; orderId?: string; shipId?: string; unitId?: string; code?: string; by: string; discount?: number; fee?: number; auto?: boolean; reversal?: string; note?: string; ext?: string }
export type Settlement = { id: string; at: string; from: string; to: string; amount: number; ref: string; by: string; note?: string }
export type CustomCode = { code: string; productId: string; variationId?: string; owner: string; note?: string }

export type PickRule = 'fifo' | 'own_first' | 'partner_first' | 'cost_low'
export type CostRules = { discount: 'shared' | 'seller'; fee: 'shared' | 'seller' }
export type ExtSite = { paused?: boolean; partyId: string; kind: 'woocommerce'; url: string; key: string; secret: string; on: boolean; lastSync?: string; pullOrders: boolean; pushStock: boolean; autoImport?: boolean; skuMap: Record<string, { productId: string; variationId?: string }>; inbox: ExtOrder[]; webhook: boolean }
export type ExtOrder = { id: string; at: string; status: 'new' | 'imported' | 'skipped' | 'unmatched' | 'refunded'; refundedAt?: string; lines: { sku: string; name: string; qty: number; price: number }[]; customer: string; note?: string; importedAt?: string }
export type OwnerReturn = { id: string; at: string; owner: string; warehouse: string; lines: { productId: string; variationId?: string; qty: number; batch?: string; expiry?: string }[]; reason: string; by: string; receivedBy?: string }
/** زمان رسیدن پول هر روش پرداخت به حساب ما: چند درصد، چند روز بعد از پرداخت مشتری */
export type PayTerm = { match: string; label: string; tranches: { days: number; pct: number }[] }
/** تغییر دستی موجودی از «میز موجودی»: فروش حضوری، کنار گذاشتن از فروش، برگرداندن به فروش، اصلاح شمارش، ورود تازه، خرابی یا مفقودی */
export type AdjustKind = 'sale' | 'hold' | 'release' | 'count' | 'intake' | 'loss'
export type StockAdjust = { id: string; at: string; by: string; productId: string; variationId?: string; owner: string; warehouse: string; kind: AdjustKind; delta: number; note?: string; price?: number }
export type StockDB = { manifests?: import('./inbound').Manifest[]; targets?: Record<string, number>; adjusts?: StockAdjust[]; parties: Party[]; warehouses: StockWh[]; channels: Channel[]; agreements: Agreement[]; lots: Lot[]; sales: StockSale[]; settlements: Settlement[]; codes: CustomCode[]; codeRule: { sep: string; withVariant: boolean }; pickRule: PickRule; rules: CostRules; channelMap: Record<string, string>; ext: ExtSite[]; payTerms: PayTerm[]; ownerReturns: OwnerReturn[] }

const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
export const makeStock = (): StockDB => ({
  parties: [
    { id: 'gh', name: 'غنیمت', prefix: 'GH', kind: 'self', color: '#0000ff', logo: './brand/logo-mark.png', active: true, city: 'تهران', userId: 'u1', account: 'internal' },
    { id: 'ys', name: 'یاسین', prefix: 'YS', kind: 'partner', color: '#12733f', brandName: 'Ve1', logo: './logos/ve1.png', site: 've1', active: true, city: 'مهاباد', userId: 'u4', account: 'internal', joinedAt: ago(24 * 60), note: 'انبار مهاباد جزئی از غنیمت است؛ با حساب مدیر کل دوم کار می‌کند.', payout: { cycle: 'weekly', holdDays: 7 } },
  ],
  warehouses: [
    { id: 'tehran', name: 'انبار تهران', city: 'تهران', operator: 'gh', handlingFee: 0, active: true },
    { id: 'mahabad', name: 'انبار مهاباد', city: 'مهاباد', operator: 'ys', handlingFee: 60000, active: true },
  ],
  channels: [
    { id: 'gh-site', name: 'سایت غنیمت', seller: 'gh', collector: 'gh', brand: 'غنیمت', active: true },
    { id: 'gh-branch-ys', name: 'شعبهٔ مهاباد به نام غنیمت', seller: 'ys', collector: 'gh', brand: 'غنیمت', active: true },
    { id: 'ys-store', name: 'فروش حضوری شعبهٔ مهاباد', seller: 'ys', collector: 'ys', brand: 'غنیمت', active: true },
    { id: 've1', name: 'سایت ve1 (یاسین)', seller: 'ys', collector: 'ys', brand: 've1', active: true },
  ],
  agreements: [
    { owner: 'gh', seller: 'ys', sellerPct: 30, model: 'profit_share', note: 'یاسین کالای غنیمت را می‌فروشد: بهای تمام‌شده + ۷۰٪ سود به غنیمت، ۳۰٪ سود برای یاسین' },
    { owner: 'ys', seller: 'gh', sellerPct: 25, model: 'profit_share', note: 'غنیمت کالای یاسین را می‌فروشد: بهای تمام‌شده + ۷۵٪ سود به یاسین، ۲۵٪ سود برای غنیمت' },
  ],
  lots: [
    { id: 'L-101', productId: 'prx', variationId: 'var-prx-blk', owner: 'gh', warehouse: 'tehran', qty: 25, cost: 1600000, at: ago(240), ref: 'IN-1405-06' },
    { id: 'L-102', productId: 'prx', variationId: 'var-prx-wht', owner: 'gh', warehouse: 'tehran', qty: 15, cost: 1600000, at: ago(240), ref: 'IN-1405-06' },
    { id: 'L-103', productId: 'prx', variationId: 'var-prx-blk', owner: 'gh', warehouse: 'mahabad', qty: 5, cost: 1600000, at: ago(230), ref: 'انتقال از تهران' },
    { id: 'L-104', productId: 'prx', variationId: 'var-prx-wht', owner: 'gh', warehouse: 'mahabad', qty: 5, cost: 1600000, at: ago(230), ref: 'انتقال از تهران' },
    { id: 'L-105', productId: 'prx', variationId: 'var-prx-blk', owner: 'ys', warehouse: 'mahabad', qty: 20, cost: 1500000, at: ago(200), ref: 'خرید یاسین از اربیل' },
    { id: 'L-106', productId: 'prx', variationId: 'var-prx-wht', owner: 'ys', warehouse: 'mahabad', qty: 15, cost: 1500000, at: ago(200), ref: 'خرید یاسین از اربیل' },
    { id: 'L-107', productId: 'p8', owner: 'ys', warehouse: 'mahabad', qty: 7, cost: 8600000, at: ago(150), ref: 'کالای یاسین برای فروش در سایت غنیمت' },
  ],
  sales: [
    { id: 'S-201', at: ago(200), productId: 'prx', variationId: 'var-prx-blk', owner: 'gh', warehouse: 'tehran', channel: 'gh-site', qty: 8, price: 2900000, cost: 1600000, by: 'سیستم' },
    { id: 'S-202', at: ago(150), productId: 'prx', variationId: 'var-prx-wht', owner: 'gh', warehouse: 'tehran', channel: 'gh-site', qty: 4, price: 2900000, cost: 1600000, by: 'سیستم' },
    { id: 'S-203', at: ago(120), productId: 'prx', variationId: 'var-prx-blk', owner: 'gh', warehouse: 'mahabad', channel: 'gh-branch-ys', qty: 2, price: 2900000, cost: 1600000, by: 'یاسین' },
    { id: 'S-204', at: ago(90), productId: 'prx', variationId: 'var-prx-wht', owner: 'gh', warehouse: 'mahabad', channel: 've1', qty: 2, price: 2800000, cost: 1600000, by: 'یاسین' },
    { id: 'S-205', at: ago(70), productId: 'prx', variationId: 'var-prx-blk', owner: 'ys', warehouse: 'mahabad', channel: 'gh-site', qty: 3, price: 2900000, cost: 1500000, by: 'سیستم' },
    { id: 'S-206', at: ago(40), productId: 'prx', variationId: 'var-prx-blk', owner: 'ys', warehouse: 'mahabad', channel: 've1', qty: 5, price: 2750000, cost: 1500000, by: 'یاسین' },
    { id: 'S-207', at: ago(30), productId: 'p8', owner: 'ys', warehouse: 'mahabad', channel: 'gh-site', qty: 1, price: 10900000, cost: 8600000, by: 'سیستم' },
    { id: 'S-208', at: ago(10), productId: 'prx', variationId: 'var-prx-blk', owner: 'gh', warehouse: 'mahabad', channel: 'ys-store', qty: 1, price: 3000000, cost: 1600000, by: 'یاسین' },
  ],
  settlements: [{ id: 'ST-01', at: ago(100), from: 'ys', to: 'gh', amount: 4000000, ref: '140508011245', by: 'یاسین', note: 'تسویهٔ هفتهٔ اول' }],
  codes: [{ code: '6971234500017', productId: 'prx', variationId: 'var-prx-blk', owner: 'ys', note: 'بارکد کارخانه روی جعبه‌های یاسین' }],
  codeRule: { sep: '-', withVariant: true },
  pickRule: 'partner_first',
  payTerms: [
    { match: 'اسنپ‌پی', label: 'اسنپ‌پی (اقساطی)', tranches: [{ days: 30, pct: 50 }, { days: 60, pct: 50 }] },
    { match: 'دیجی‌پی', label: 'دیجی‌پی', tranches: [{ days: 30, pct: 100 }] },
    { match: 'ترب‌پی', label: 'ترب‌پی', tranches: [{ days: 15, pct: 50 }, { days: 45, pct: 50 }] },
    { match: 'تارا', label: 'تارا', tranches: [{ days: 30, pct: 100 }] },
    { match: 'زرین‌پال', label: 'درگاه زرین‌پال', tranches: [{ days: 1, pct: 100 }] },
    { match: 'درگاه', label: 'درگاه بانکی (شاپرک)', tranches: [{ days: 1, pct: 100 }] },
    { match: 'کیف پول', label: 'کیف پول مشتری', tranches: [{ days: 0, pct: 100 }] },
    { match: 'کارت', label: 'کارت به کارت یا کارت‌خوان', tranches: [{ days: 0, pct: 100 }] },
  ],
  ownerReturns: [],
  targets: { tehran: 900000000, mahabad: 260000000 },
  rules: { discount: 'shared', fee: 'shared' },
  channelMap: { 'سایت': 'gh-site', 'ترب': 'gh-site', 'دیجی‌کالا': 'gh-site', 'اینستاگرام دایرکت': 'gh-site', 'تلگرام': 'gh-site', 'واتساپ': 'gh-site', 'بله': 'gh-site', 'تلفنی': 'gh-site', 'حضوری در شعبه': 'gh-site' },
  ext: [{ partyId: 'ys', kind: 'woocommerce', url: 'https://ve1.ir', key: 'ck_7f3a••••••••••••••••••••c21d', secret: 'cs_91be••••••••••••••••••••04aa', on: true, lastSync: ago(3), pullOrders: true, pushStock: true, webhook: true,
    skuMap: { 'VE1-RMX-DRG-BLK': { productId: 'prx', variationId: 'var-prx-blk' }, 'VE1-RMX-DRG-WHT': { productId: 'prx', variationId: 'var-prx-wht' }, 'VE1-KINDLE-16': { productId: 'p8' } },
    inbox: [
      { id: 've1-5521', at: ago(2), status: 'new', customer: 'ر. کریمی', lines: [{ sku: 'VE1-RMX-DRG-BLK', name: 'Remax Dragon Black', qty: 1, price: 2750000 }] },
      { id: 've1-5522', at: ago(1.2), status: 'new', customer: 'م. احمدی', lines: [{ sku: 'VE1-RMX-DRG-WHT', name: 'Remax Dragon White', qty: 2, price: 2750000 }, { sku: 'VE1-KINDLE-16', name: 'Kindle Paperwhite', qty: 1, price: 11200000 }] },
      { id: 've1-5523', at: ago(0.5), status: 'unmatched', customer: 'ش. رحیمی', lines: [{ sku: 'VE1-ANKER-20W', name: 'Anker 20W Charger', qty: 1, price: 1450000 }], note: 'SKU این کالا هنوز به کالای غنیمت وصل نشده است' },
    ] }],
})

/** کد کالا بر اساس مالک: پیشوند مالک + شمارهٔ کالا + پسوند تنوع؛ مثلاً GH-000201-1 و YS-000201-1 */
export function labelCode(s: StockDB, ownerId: string, product: { code?: string; id: string }, variation?: { suffix: string } | null) {
  const p = s.parties.find((x) => x.id === ownerId)?.prefix ?? ownerId.toUpperCase()
  const num = (product.code ?? '').replace(/\D/g, '').slice(-6) || product.id.replace(/\W/g, '').toUpperCase()
  return [p, num, s.codeRule.withVariant && variation ? variation.suffix : ''].filter(Boolean).join(s.codeRule.sep)
}

type ProdLite = { id: string; code?: string; title: string; variations?: { id: string; suffix: string; opts: Record<string, string>; enabled?: boolean }[] }
/** خواندن هر بارکد: کد ساختهٔ سیستم یا بارکد اختصاصی شریک ← کالا، تنوع و مالک */
export function scanLookup(s: StockDB, products: ProdLite[], raw: string): { productId: string; variationId?: string; owner: string } | null {
  const code = raw.trim().toUpperCase(); if (!code) return null
  const c = s.codes.find((x) => x.code.toUpperCase() === code); if (c) return { productId: c.productId, variationId: c.variationId, owner: c.owner }
  for (const p of products) for (const o of s.parties) {
    if (p.variations?.length) { for (const v of p.variations) if (labelCode(s, o.id, p, v).toUpperCase() === code) return { productId: p.id, variationId: v.id, owner: o.id } }
    else if (labelCode(s, o.id, p, null).toUpperCase() === code) return { productId: p.id, owner: o.id }
  }
  return null
}

/** سهم هر طرف از یک فروش؛ «بدهکار» کسی است که پول را گرفته ولی همه‌اش مال او نیست. qty منفی (برگشت) همهٔ جریان‌ها را برعکس می‌کند. */
export function split(s: StockDB, x: StockSale) {
  const ch = s.channels.find((c) => c.id === x.channel); const seller = ch?.seller ?? 'gh'; const collector = ch?.collector ?? seller
  const wh = s.warehouses.find((w) => w.id === x.warehouse); const operator = wh?.operator ?? seller
  const R = s.rules ?? { discount: 'shared', fee: 'shared' }
  const gross = x.price * x.qty; const disc = x.discount ?? 0; const fee = x.fee ?? 0; const revenue = gross - disc; const costT = x.cost * x.qty
  const ag = x.owner === seller ? undefined : s.agreements.find((a) => a.owner === x.owner && a.seller === seller)
  const model = ag?.model ?? 'profit_share'
  const pct = x.owner === seller ? 0 : model === 'fixed_price' ? 100 : ag?.sellerPct ?? 0
  // سود قابل تقسیم: تخفیف و کارمزد اگر «مشترک» باشند پیش از تقسیم کم می‌شوند؛ اگر «با فروشنده» باشند فقط از سهم فروشنده کم می‌شوند
  const shared = (R.discount === 'shared' ? disc : 0) + (R.fee === 'shared' ? fee : 0)
  const own = x.owner === seller ? 0 : (R.discount === 'seller' ? disc : 0) + (R.fee === 'seller' ? fee : 0)
  const profit = gross - costT - shared - (x.owner === seller ? disc + fee - shared : 0)
  const handling = operator !== seller && operator !== x.owner ? (wh?.handlingFee ?? 0) * x.qty : 0
  // کمیسیون: درصد از مبلغ خالص فروش (نه از سود) برای فروشنده؛ بهای تمام‌شده نقشی ندارد
  const base = gross - shared
  const cut = model === 'commission' && x.owner !== seller ? Math.round((base * pct) / 100) : Math.round((profit * pct) / 100)
  const sellerShare = (cut - own) || 0
  const ownerTotal = model === 'commission' && x.owner !== seller ? base - cut - handling : costT + profit - cut - handling
  const flows: { from: string; to: string; amount: number; why: string }[] = []
  const pay = (to: string, amount: number, why: string) => { if (to !== collector && amount !== 0) flows.push(amount > 0 ? { from: collector, to, amount, why } : { from: to, to: collector, amount: -amount, why: `${why} (برگشت)` }) }
  pay(x.owner, ownerTotal, 'بهای تمام‌شده و سهم سود مالک')
  pay(seller, sellerShare, 'سهم سود فروشنده')
  pay(operator, handling, 'هزینهٔ ارسال از انبار')
  return { seller, collector, operator, gross, revenue, disc, fee, costT, profit, pct, model, sellerShare, handling, ownerTotal, ownerProfit: ownerTotal - costT, flows }
}

/** سهم یک طرف مشخص از یک فروش (برای صورت‌حساب از دید هر شریک): چقدر از این فروش مال اوست و چقدر باید بدهد یا بگیرد */
export function shareOf(s: StockDB, x: StockSale, party: string) {
  const b = split(s, x)
  const earns = (x.owner === party ? b.ownerTotal - b.costT : 0) + (b.seller === party && b.seller !== x.owner ? b.sellerShare : 0) + (b.operator === party ? b.handling : 0)
  const net = b.flows.reduce((a, f) => a + (f.to === party ? f.amount : f.from === party ? -f.amount : 0), 0)
  return { earns, net, involved: [x.owner, b.seller, b.collector, b.operator].includes(party), b }
}

/** مانده بین هر دو طرف: مثبت یعنی «a» به «b» بدهکار است */
export function balances(s: StockDB) {
  const m = new Map<string, number>(); const k = (a: string, b: string) => `${a}>${b}`
  const add = (from: string, to: string, amt: number) => { m.set(k(from, to), (m.get(k(from, to)) ?? 0) + amt) }
  s.sales.forEach((x) => split(s, x).flows.forEach((f) => add(f.from, f.to, f.amount)))
  s.settlements.forEach((t) => add(t.from, t.to, -t.amount))
  const pairs: { a: string; b: string; net: number }[] = []
  for (let i = 0; i < s.parties.length; i++) for (let j = i + 1; j < s.parties.length; j++) {
    const a = s.parties[i].id; const b = s.parties[j].id; const net = (m.get(k(a, b)) ?? 0) - (m.get(k(b, a)) ?? 0)
    pairs.push({ a, b, net })
  }
  return pairs
}
