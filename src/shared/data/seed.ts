// مجموعه‌دادهٔ نمونهٔ واحد (بخش ۱۸.۲). هیچ دادهٔ واقعی مشتری یا کلید واقعی در آن نیست.
const now = Date.now()
const ago = (min: number) => new Date(now - min * 60000).toISOString()
const inMin = (min: number) => new Date(now + min * 60000).toISOString()

export type Courier = { name: string; phone: string; plate: string; vehicle: string; eta: number; code: string; cost: number; company?: string }
export type Shipment = { id: string; warehouse: string; method: string; shipFee?: number; packPhotos?: { at: string; by: string; src: string }[]; pack?: { at: string; by: string; station: string; scans: { at: string; code: string; productId: string; variationId?: string; unitId?: string; owner: string; ok: boolean; why?: string }[] }; status: string; sla: string; items: { productId: string; unitId: string; qty: number; price: number; cancelled?: boolean; cancelBy?: string; variationId?: string; listPrice?: number }[]; courier: Courier | null; tracking: string; trackingUrl?: string; trackingCarrier?: string; allocReason: string }
export type Pdp = { videos: { kind: string; url: string; src?: 'upload' | 'link'; file?: { name: string; size: number; poster?: string; duration?: number } }[]; flaws: { zone: string; status: string; note: string }[]; importRoute: string; variantGroup: string; variantLabel: string; variant?: Record<string, string>; covered: string; notCovered: string; saleMode?: 'online' | 'inquiry'; amazonUrl?: string; featured?: boolean; cardLines?: { mode: 'inherit' | 'add' | 'replace'; pick: string[]; custom: { id: string; text: string; icon: string; color: string; dur?: number; weight?: number }[]; over?: Record<string, { dur?: number; weight?: number; text?: string }> }; showQA?: boolean; showReviews?: boolean; headCode?: string; route?: ImportRoute; qc?: Record<string, boolean>; showPriceChart?: boolean; similar?: string[]; trade?: TradeInfo }
/** مبدأ و مسیر واردات (فیگما: صفحهٔ کالا › مبدأ و مسیر واردات) */
export type ImportRoute = { origin: 'amazon' | 'store'; store: string; seller: string; boughtAt: string; inbound: 'tehran' | 'baneh'; inAt: string; transferAt?: string; invoice?: string; invoiceOk?: boolean }
/** هر تغییر قیمت فروش؛ منبع «نمودار قیمت» صفحهٔ کالا */
/** فایل کتابخانهٔ رسانه */
export type MediaItem = { id: string; src: string; name: string; alt: string; w: number; h: number; size: number; type: string; by: string; at: string; optimized: boolean; square?: 'crop' | 'pad'; watermark?: boolean; orig?: { w: number; h: number; size: number }; edited?: string }
/** قلم «لیست خرید»: چیزهایی که باید در خرید بعدی بیاید */
export type BuyItem = { id: string; productId?: string; name: string; qty: number; targetCost?: number; currency?: string; must: boolean; note?: string; reason: string; status: 'در لیست' | 'سفارش داده شد'; addedAt: string; by: string; batchId?: string }
/** اطلاعات بازرگانی کالا (فقط با فعال‌شدن «امور بازرگانی») */
export type TradeInfo = { hsCode?: string; iranCode?: string; trackCode?: string; hamta?: string; origin?: string }
export type PricePoint = { pid: string; at: string; price: number; by: string }
export type Product = { id: string; image: string; images?: string[]; imagePos?: string; title: string; en: string; brand: string; category: string; subCats?: string[]; kind?: 'simple' | 'variable'; attrs?: PAttr[]; variations?: Variation[]; defaultVar?: string; status: string; mode: string; qty?: { tehran: number; mahabad: number }; priceNew: number; price?: number; compareAt?: number; cost?: number; rating: number; reviews: number; views: number; cvr: number; health: number; fastEligible: boolean; seller: string; torob: boolean; partner?: boolean; featured?: boolean; comingSoon?: string; incoming?: string; owner?: string; needsExpiry?: boolean; irc?: string; pdp?: Pdp
  code?: string; ean?: string; model?: string; specs?: Record<string, string>; keyFeatures?: string; short?: string; long?: string; box?: string; pros?: string; cons?: string; condition?: string; grade?: string; source?: string; originLabel?: string; supplier?: string; warehouse?: string; currency?: string; costFx?: number; rate?: number; extraCost?: number; discount?: number; weight?: number; dims?: string; shipClass?: string; insurance?: boolean; install?: boolean; warrantyType?: string; warrantyMonths?: number; warrantyTerms?: string; metaTitle?: string; metaDesc?: string; slug?: string; scheduledAt?: string; video?: string }
/** ویژگی کالای متغیر: سراسری (از ویژگی‌های فروشگاه) یا اختصاصی همین کالا */
export type PAttr = { axis: string; name?: string; values: string[]; forVar: boolean; visible: boolean }
/** یک تنوع کالای متغیر (مثل هدفون آبی): کد، بارکد، قیمت، موجودی و تصویر جدا */
export type Variation = { id: string; opts: Record<string, string>; suffix: string; ean?: string; price?: number; sale?: number; saleUntil?: string; qty: { tehran: number; mahabad: number }; low?: number; enabled: boolean; image?: string; backorder?: boolean; weight?: number; costFx?: number; extra?: number }
/** هر اقدام ثبت‌شده؛ changes سند خودکار تغییرهاست (چه رکوردی، چه فیلدی، از چه به چه) */
export type AuditEntry = { at: string; who: string; action: string; target: string; before: string; after: string; ai: boolean; role?: string; changes?: string[]; sensitive?: boolean }
export type Unit = { variationId?: string; owner?: string; id: string; productId: string; serial: string; condition: string; grade: string; warehouse: string; source: string; status: string; cost: number; price: number; shelf: string; received: string; flaws: string[]; color: string; warrantyMonths?: number; code?: string; ean?: string; photos?: string[] }
/** تصمیم مشتری در کمبود تأمین (فیگما: سفارش‌های جاری › نیازمند تصمیم شما) */
export type OrderDecision = { kind: 'unsupplied' | 'out_of_stock' | 'other_warehouse'; items: string[]; alt?: string; deadline: string; at: string; by: string; choice?: 'send_rest' | 'from_other' | 'cancel_all'; chosenBy?: 'مشتری' | 'پشتیبانی' | 'سیستم'; chosenAt?: string; refund?: number; error?: boolean }
/** جزئیات لغو و بازگشت وجه (فیگما: سفارش‌های لغوشده) */
export type CancelInfo = { by: 'غنیمت' | 'مشتری'; reason: string; at: string; amount: number; to: string; refund: 'در جریان' | 'بازگشت داده شد' | 'ناموفق'; ref?: string; refundAt?: string; failWhy?: string; apology?: string; code?: { code: string; amount: number; until: string }; notify?: boolean; partial?: boolean }
export type Refund = { id: string; orderId: string; customerId: string; amount: number; source: string; dest: string; note?: string; at: string; by: string; status: 'requested' | 'approved' | 'sent' | 'done' | 'failed'; via?: string; account?: string; ref?: string; sentAt?: string; doneAt?: string; failWhy?: string; log: { at: string; by: string; step: string; note?: string }[] }
export type GatewayHold = { id: string; customerId: string; items: { productId: string; unitId: string; qty: number }[]; gateway: string; amount: number; at: string; status: 'in_gateway' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'released'; endedAt?: string; note?: string; orderId?: string }
export type Order = { refunded?: number; refundPending?: number; payHold?: { amount: number; method: 'لینک پرداخت' | 'کارت به کارت'; at: string; by: string; status: 'pending' | 'paid' | 'released' | 'waived'; ref?: string; note?: string; doneAt?: string; doneBy?: string; reminders?: number }; receiver?: { name: string; mobile: string }; edits?: { at: string; by: string; src: string; reason: string; changes: string[]; diff: number; settle?: string; sms: boolean; prev?: string; undone?: { at: string; by: string } }[]; rollbacks?: { at: string; by: string; shipId: string; from: string; to: string; reason: string; prev: { status: string; orderStatus: string; tracking: string; courier: any }; undone?: { at: string; by: string } }[]; cancelInfo?: CancelInfo; decision?: OrderDecision; customerNote?: string; customerNoteDone?: boolean; notes?: { id: string; at: string; by: string; src: 'تماس تلفنی' | 'پیام‌رسان' | 'حضوری' | 'داخلی'; text: string; act?: boolean; done?: boolean; doneBy?: string }[]; shipTo?: string; id: string; customerId: string; buyer?: 'person' | 'legal'; legalId?: string; deliveredAt?: string; invoiceNo?: string; createdAt: string; status: string; pay: string; total: number; discount: number; shippingFee: number; fee: number; margin: number; risk: number; channel: string; tags: string[]; lockedBy: string | null; shipments: Shipment[] }

import { makeStock, type StockSale as StockSaleT } from './stock'
import { syncQty } from './ledger'
import { makeEntities, type Rec } from './entities'
import { makeSite, makeLayout } from './site'
import { makeCxEntities, makeCxSettings } from './cx'
import { makeJourney } from './journey'
import { makeDelivery } from './delivery'
import { BASE_ROLES } from './roles'
import { makePeople, makePeopleConfig } from './people'
import { makeVault } from './vault'
import { makeAxes, makeOptions } from './options'
import { makeOrderEvents } from './orderEvents'
import { makeContentQueue } from './contentQueue'
import { makeIncoming } from './incoming'
import { makeMerch } from './merch'
import { makeAgents } from './agents'
import { makeBlog } from './blog'
import { makeTraffic } from './traffic'
import { makeStoreCfg } from './storeCfg'
import { makeQuestions, makeReviewMeta } from './qa'
import { makeReasonPresets } from './reasons'
import { makeAcct } from './acct'
import { makeLots, makePartners, makeNetwork } from './partners'
import { makeNudges } from './nudges'
import { makeCalls } from './calls'
import { makeRemote } from './remote'
import { makeBank } from './bank'
import { makePlanner } from './planner'
import { makeNewsletter, makePages, makeTheme } from './pages'
import { makeHub } from './hub'
import { makePromos } from './promos'
import { makePickups } from './pickups'
export type Att = { kind: 'image' | 'file' | 'voice' | 'video'; src: string; name?: string; size?: number; dur?: number }
export type Msg = { from: string; text: string; at: string; atts?: Att[]; cta?: string }
export type Ticket = { id: string; customerId: string; orderId: string; subject: string; channel: string; status: string; priority: string; sla: string; assignee: string; sentiment: string; messages: Msg[]; topic?: string; reason?: string; items?: string[]; csat?: 'yes' | 'no'; replyBy?: string; history?: { status: string; at: string }[] }
export type CaseEvent = { at: string; by: string; text: string; who?: 'ما' | 'مشتری' | 'سیستم' }
export type CaseReceipt = { at: string; by: string; serial: string; serialOk: boolean; sealOk: boolean; accOk: boolean; photos: string[]; note: string }
export type CaseRefund = { amount: number; dest: string; account?: string; ref?: string; at?: string; by?: string; deduct?: number }
export type CaseShip = { method: string; tracking?: string; courier?: string; at: string }
/** فیلدهای مشترک پروندهٔ مرجوعی و گارانتی: روش بازگشت کالا، رسید دریافت، واریز، ارسال به مشتری و تاریخچه */
/** فیلدهای مشترک پروندهٔ مرجوعی و گارانتی (مطابق فیگمای پنل کاربری) */
export type CaseFlow = { method?: 'courier' | 'post' | 'inperson'; tracking?: string; declaredAt?: string; pickupAt?: string; receipt?: CaseReceipt; refund?: CaseRefund; back?: CaseShip; events?: CaseEvent[]; checks?: Record<string, boolean> }
/** یک کالای درخواست مرجوعی؛ ok و why نتیجهٔ بررسی همان کالاست */
export type RetItem = { productId: string; unitId: string; qty: number; price: number; shipId?: string; ok?: boolean; why?: string }
/** مقصد بازگشت وجه را مشتری هنگام ثبت انتخاب می‌کند */
export type RefundTo = { kind: 'wallet' } | { kind: 'card'; bank: string; last4: string; holder?: string }
export type Ret = CaseFlow & { id: string; orderId: string; customerId: string; unitId: string; reason: string; note: string; status: string; amount: number; dest: string; createdAt: string; deadline: string; channel?: string; photos?: string[]; by?: string; productId?: string; courierName?: string
  fate?: string; items?: RetItem[]; refundTo?: RefundTo; shipCostBy?: 'غنیمت' | 'مشتری'; returnShipCost?: number; origShipFee?: number; qcNote?: string; reship?: CaseShip & { shipId?: string }; branch?: string; cancelledAt?: string }
export type War = CaseFlow & { id: string; code: string; customerId: string; unitId: string; type: string; months: number; status: string; issue: string; owner: string; deadline: string; orderId?: string; channel?: string; photos?: string[]; by?: string; productId?: string
  reasonKind?: string; contact?: string; createdAt?: string; shipDeadline?: string; defect?: string; service?: 'تعمیر' | 'تعویض' | 'بازگشت مبلغ'; newSerial?: string; replaceUnitId?: string; repairNote?: string; rejectReason?: string }
/** کارت گارانتی صادرشده برای هر واحد (گارانتی‌های من / استعلام گارانتی) */
export type WCard = { code: string; unitId: string; productId: string; customerId: string; orderId: string; type: string; provider: string; months: number; start: string; status: 'active' | 'expired' | 'invalid'; invalidReason?: string; notes: string[] }
export type TrashItem = { id: string; kind: string; ek: string; label: string; data: Rec; at: string }

const makeSeedBase = () => ({
  products: ([
    { id: 'p1', image: './products/p1-500.webp', imagePos: '50% 62%', title: 'گوشی اپل iPhone 16 Pro ظرفیت ۲۵۶ گیگابایت', en: 'Apple iPhone 16 Pro 256GB', brand: 'اپل', category: 'گوشی موبایل', status: 'product.published', mode: 'serial', priceNew: 132690000, rating: 4.7, reviews: 38, views: 4210, cvr: 2.4, health: 92, fastEligible: true, seller: 'غنیمت', torob: true },
    { id: 'p2', image: './products/p2-500.webp', title: 'هدست بلوتوثی اپل AirPods Max ۲۰۲۴', en: 'Apple AirPods Max 2024', brand: 'اپل', category: 'هدفون', status: 'product.published', mode: 'serial', priceNew: 20000000, compareAt: 18750000, rating: 4.5, reviews: 21, views: 2890, cvr: 3.1, health: 88, fastEligible: true, seller: 'غنیمت', torob: true },
    { id: 'p3', image: './products/p3-500.webp', title: 'لپ‌تاپ اپل MacBook Air 13 M3', en: 'Apple MacBook Air 13 M3', brand: 'اپل', category: 'لپ‌تاپ', status: 'product.published', mode: 'serial', priceNew: 98000000, rating: 4.8, reviews: 12, views: 1980, cvr: 1.6, health: 81, fastEligible: true, seller: 'غنیمت', torob: true },
    { id: 'p4', image: './products/p4-500.webp', title: 'ساعت هوشمند اپل Watch Series 10', en: 'Apple Watch Series 10 46mm', brand: 'اپل', category: 'ساعت هوشمند', status: 'product.published', mode: 'serial', priceNew: 36500000, rating: 4.4, reviews: 9, views: 1320, cvr: 2.0, health: 74, fastEligible: true, seller: 'غنیمت', torob: false },
    { id: 'p5', image: './products/p5-500.webp', title: 'هدفون سونی WH-1000XM5', en: 'Sony WH-1000XM5', brand: 'سونی', category: 'هدفون', status: 'product.published', mode: 'serial', priceNew: 27800000, rating: 4.6, reviews: 44, views: 3105, cvr: 2.9, health: 95, fastEligible: true, seller: 'غنیمت', torob: true },
    { id: 'p6', image: './products/p6-500.webp', title: 'تبلت اپل iPad Air 11 M2', en: 'Apple iPad Air 11 M2', brand: 'اپل', category: 'تبلت', status: 'product.draft', mode: 'serial', priceNew: 54000000, rating: 0, reviews: 0, views: 0, cvr: 0, health: 46, fastEligible: true, seller: 'غنیمت', torob: false },
    { id: 'p7', image: './products/p7-500.webp', title: 'گوشی سامسونگ Galaxy S24 Ultra', en: 'Samsung Galaxy S24 Ultra 512GB', brand: 'سامسونگ', category: 'گوشی موبایل', status: 'product.published', mode: 'serial', priceNew: 89500000, rating: 4.3, reviews: 17, views: 2440, cvr: 1.2, health: 68, fastEligible: false, seller: 'غنیمت', torob: true },
    { id: 'p8', image: './products/p8-500.webp', title: 'کتاب‌خوان آمازون Kindle Paperwhite', en: 'Amazon Kindle Paperwhite 16GB', brand: 'آمازون', category: 'کتاب‌خوان', status: 'product.pending', mode: 'qty', qty: { tehran: 0, mahabad: 7 }, priceNew: 12400000, price: 10900000, cost: 8600000, rating: 0, reviews: 0, views: 0, cvr: 0, health: 58, fastEligible: false, seller: 'غنیمت', torob: false, partner: true },
    { id: 'p9', image: '', title: 'شارژر دیواری انکر ۲۰ وات USB-C', en: 'Anker 20W USB-C Charger', brand: 'انکر', category: 'لوازم جانبی', status: 'product.published', mode: 'qty', qty: { tehran: 24, mahabad: 6 }, priceNew: 1650000, price: 1500000, cost: 1000000, rating: 4.6, reviews: 12, views: 1420, cvr: 4.2, health: 79, fastEligible: true, seller: 'غنیمت', torob: true },
  ] as Product[]).map((p, i) => ({ ...p, code: `GH-P-${String(101 + i).padStart(6, '0')}`, warrantyType: 'گارانتی اختصاصی غنیمت', warrantyMonths: 6, supplier: 'دفتر اربیل', source: 'amazon' }) as Product),
  units: ([
    { id: 'GU-20411', productId: 'p1', serial: '356789104521187', condition: 'used', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.published', cost: 96400000, price: 118900000, shelf: 'A-03-2', received: ago(60 * 24 * 6), flaws: ['خط ریز کنار قاب'], color: 'تیتانیوم طبیعی' },
    { id: 'GU-20412', productId: 'p1', serial: '356789104529934', condition: 'openbox', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.reserved', cost: 101200000, price: 124500000, shelf: 'A-03-3', received: ago(60 * 24 * 4), flaws: [], color: 'تیتانیوم مشکی' },
    { id: 'GU-20413', productId: 'p1', serial: '356789104533210', condition: 'used', grade: 'B', warehouse: 'tehran', source: 'kurdistan', status: 'unit.qc', cost: 88000000, price: 0, shelf: 'QC-1', received: ago(60 * 20), flaws: [], color: 'تیتانیوم سفید' },
    { id: 'GU-20414', productId: 'p1', serial: '356789104540076', condition: 'sealed', grade: 'A+', warehouse: 'mahabad', source: 'kurdistan', status: 'unit.published', cost: 108500000, price: 129900000, shelf: 'M-11', received: ago(60 * 24 * 9), flaws: [], color: 'تیتانیوم صحرایی' },
    { id: 'GU-20415', productId: 'p1', serial: '356789104547712', condition: 'used', grade: 'A', warehouse: 'tehran', source: 'amazon', status: 'unit.photo', cost: 92300000, price: 0, shelf: 'PH-2', received: ago(60 * 30), flaws: ['سایش جزئی لنز'], color: 'تیتانیوم طبیعی' },
    { id: 'GU-20420', productId: 'p3', serial: 'FVFJ3LL0Q6L4', condition: 'openbox', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.published', cost: 69800000, price: 86400000, shelf: 'B-01-1', received: ago(60 * 24 * 38), flaws: [], color: 'نیمه‌شب' },
    { id: 'GU-20421', productId: 'p3', serial: 'FVFJ3LL0Q7M9', condition: 'used', grade: 'A', warehouse: 'tehran', source: 'amazon', status: 'unit.ready', cost: 64200000, price: 79900000, shelf: 'B-01-2', received: ago(60 * 24 * 2), flaws: ['خط ریز زیر دستگاه'], color: 'نقره‌ای' },
    { id: 'GU-20430', productId: 'p4', serial: 'H4KX92JLQ1', condition: 'used', grade: 'A', warehouse: 'tehran', source: 'amazon', status: 'unit.published', cost: 24100000, price: 30900000, shelf: 'C-02-4', received: ago(60 * 24 * 45), flaws: [], color: 'مشکی' },
    { id: 'GU-20431', productId: 'p4', serial: 'H4KX92JLR8', condition: 'used', grade: 'B', warehouse: 'tehran', source: 'kurdistan', status: 'unit.qc', cost: 21500000, price: 0, shelf: 'QC-1', received: ago(60 * 9), flaws: [], color: 'نقره‌ای' },
    { id: 'GU-20470', productId: 'p2', serial: 'H2KZ6P0QL7M1', condition: 'openbox', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.sold', cost: 12400000, price: 16000000, shelf: 'D-02-1', received: ago(60 * 24 * 21), flaws: [], color: 'میدنایت', warrantyMonths: 6 },
    { id: 'GU-20473', productId: 'p2', serial: 'H2KZ6P0QP2S5', condition: 'sealed', grade: 'A+', warehouse: 'mahabad', source: 'kurdistan', status: 'unit.sold', cost: 11900000, price: 15000000, shelf: 'M-05', received: ago(60 * 24 * 23), flaws: [], color: 'استارلایت', warrantyMonths: 6 },
    { id: 'GU-20471', productId: 'p2', serial: 'H2KZ6P0QM4C8', condition: 'sealed', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.published', cost: 11900000, price: 15000000, shelf: 'D-02-2', received: ago(60 * 24 * 5), flaws: [], color: 'میدنایت', warrantyMonths: 6 },
    { id: 'GU-20472', productId: 'p2', serial: 'H2KZ6P0QN9R2', condition: 'sealed', grade: 'A+', warehouse: 'mahabad', source: 'kurdistan', status: 'unit.published', cost: 12100000, price: 15500000, shelf: 'M-05', received: ago(60 * 24 * 8), flaws: [], color: 'نقره‌ای', warrantyMonths: 6 },
    { id: 'GU-20432', productId: 'p4', serial: 'H4KX92JLS3', condition: 'openbox', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.sold', cost: 24600000, price: 29500000, shelf: '-', received: ago(60 * 24 * 40), flaws: [], color: 'مشکی' },
    { id: 'GU-20440', productId: 'p5', serial: 'S01-5524871', condition: 'used', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.published', cost: 17900000, price: 22900000, shelf: 'D-04-1', received: ago(60 * 24 * 3), flaws: [], color: 'مشکی' },
    { id: 'GU-20441', productId: 'p5', serial: 'S01-5524990', condition: 'openbox', grade: 'A+', warehouse: 'mahabad', source: 'kurdistan', status: 'unit.published', cost: 19400000, price: 24500000, shelf: 'M-04', received: ago(60 * 24 * 12), flaws: [], color: 'نقره‌ای' },
    { id: 'GU-20442', productId: 'p5', serial: 'S01-5525102', condition: 'used', grade: 'A', warehouse: 'tehran', source: 'amazon', status: 'unit.sold', cost: 17100000, price: 21900000, shelf: '-', received: ago(60 * 24 * 20), flaws: [], color: 'مشکی' },
    { id: 'GU-20450', productId: 'p7', serial: '350123987654321', condition: 'used', grade: 'A', warehouse: 'mahabad', source: 'kurdistan', status: 'unit.published', cost: 61000000, price: 74900000, shelf: 'M-02', received: ago(60 * 24 * 52), flaws: ['خط ریز روی نمایشگر'], color: 'خاکستری تیتانیوم' },
    { id: 'GU-20460', productId: 'p6', serial: 'DMPX71KQ0F', condition: 'openbox', grade: 'A+', warehouse: 'tehran', source: 'amazon', status: 'unit.photo', cost: 39800000, price: 0, shelf: 'PH-1', received: ago(60 * 14), flaws: [], color: 'آبی' },
  ] as Unit[]).map((u) => ({ ...u, code: `GH-U-00${u.id.replace(/\D/g, '')}` }) as Unit),
  customers: [
    { id: 'c1', addr: { province: 'تهران', city: 'تهران', district: 'منطقهٔ ۶، یوسف‌آباد', street: 'خیابان ولیعصر', sub: 'خیابان فاطمی', alley: 'کوچهٔ نهم', plaque: '۱۸', floor: '۳', unit: '۷', postal: '1997654321' }, name: 'سروش رنجبران', mobile: '09123456789', referral: 'REFaM6GEe', nid: '0012345678', email: 'soroush@example.com', city: 'تهران', orders: 7, ltv: 412000000, aov: 58800000, lastOrder: ago(60 * 5), segment: 'VIP', health: 91, source: 'ترب', wallet: 15820000, returnRate: 14, churn: 8, tags: ['حقوقی‌نشده', 'اقساطی'], blocked: false },
    { id: 'c2', addr: { province: 'البرز', city: 'کرج', district: 'عظیمیه', street: 'بلوار استقلال', sub: 'خیابان مطهری', alley: 'کوچهٔ لاله', plaque: '۲۴', floor: '۲', unit: '۴', postal: '3149876543' }, name: 'نگار امینی', mobile: '09351112233', nid: '0023456789', email: 'negar@example.com', city: 'کرج', orders: 2, ltv: 61400000, aov: 30700000, lastOrder: ago(60 * 26), segment: 'جدید', health: 72, source: 'جست‌وجوی گوگل', wallet: 0, returnRate: 0, churn: 31, tags: [], blocked: false },
    { id: 'c3', addr: { province: 'آذربایجان شرقی', city: 'تبریز', district: 'ولیعصر', street: 'خیابان توانیر', sub: 'خیابان فروغی', alley: 'کوچهٔ بهار', plaque: '۹', floor: '۱', unit: '۲', postal: '5156789012' }, name: 'کاوه مرادی', mobile: '09143334455', nid: '0034567890', email: 'kaveh@example.com', city: 'تبریز', orders: 4, ltv: 188900000, aov: 47200000, lastOrder: ago(60 * 24 * 3), segment: 'وفادار', health: 84, source: 'مستقیم', wallet: 2400000, returnRate: 25, churn: 12, tags: ['مرجوعی اخیر'], blocked: false },
    { id: 'c4', addr: { province: 'تهران', city: 'تهران', district: 'منطقهٔ ۶', street: 'خیابان ولیعصر', sub: '', alley: 'کوچهٔ نهم', plaque: '۱۸', floor: '۳', unit: '', postal: '1997654321' }, name: 'شرکت آرین‌پردازان نوین (سهامی خاص)', legal: { nationalId: '14007894561', regNo: '543210', economicCode: '14007894561', address: 'تهران، خیابان ولیعصر، کوچهٔ نهم، پلاک ۱۸، طبقهٔ ۳', postalCode: '1997654321', phone: '021-88776655', rep: 'سروش رنجبران', repMobile: '09123456789', verified: true }, mobile: '02188776655', nid: '14007894561', email: 'buy@example.com', city: 'تهران', orders: 3, ltv: 298000000, aov: 99300000, lastOrder: ago(60 * 24 * 8), segment: 'حقوقی', health: 88, source: 'مستقیم', wallet: 0, returnRate: 0, churn: 15, tags: ['حقوقی', 'منتظر بررسی مدارک'], blocked: false },
    { id: 'c5', addr: { province: 'اصفهان', city: 'اصفهان', district: 'جلفا', street: 'خیابان نظر', sub: 'خیابان حکیم نظامی', alley: 'کوچهٔ ۱۲', plaque: '۵', floor: 'همکف', unit: '۱', postal: '8174612345' }, name: 'مهسا توکلی', mobile: '09194445566', nid: '0045678901', email: 'mahsa@example.com', city: 'اصفهان', orders: 1, ltv: 22900000, aov: 22900000, lastOrder: ago(60 * 24 * 41), segment: 'در خطر ریزش', health: 38, source: 'اینستاگرام', wallet: 500000, returnRate: 0, churn: 74, tags: [], blocked: false },
    { id: 'c6', addr: { province: 'تهران', city: 'تهران', district: 'منطقهٔ ۴، پاسداران', street: 'خیابان پاسداران', sub: 'گلستان دوم', alley: 'کوچهٔ نارنج', plaque: '۳۱', floor: '۴', unit: '۸', postal: '1666712345' }, name: 'امیرحسین صادقی', mobile: '09125556677', nid: '0056789012', email: 'amir@example.com', city: 'تهران', orders: 5, ltv: 143000000, aov: 28600000, lastOrder: ago(42), segment: 'شکارچی تخفیف', health: 55, source: 'ترب', wallet: 0, returnRate: 40, churn: 22, tags: ['ریسک مرجوعی'], blocked: false },
    { id: 'c7', addr: { province: 'فارس', city: 'شیراز', district: 'معالی‌آباد', street: 'بلوار چمران', sub: 'خیابان ستارخان', alley: 'کوچهٔ ۶', plaque: '۱۴', floor: '۲', unit: '۳', postal: '7187654321' }, name: 'الهام کریمی', mobile: '09366667788', nid: '0067890123', email: 'elham@example.com', city: 'شیراز', orders: 2, ltv: 104400000, aov: 52200000, lastOrder: ago(60 * 2), segment: 'جدید', health: 77, source: 'دعوت دوستان', wallet: 1000000, returnRate: 0, churn: 28, tags: [], blocked: false },
  ],
  orders: ([
    { id: 'GH-10481', customerId: 'c1', createdAt: ago(18), status: 'order.preparing', pay: 'زرین‌پال', total: 147400000, discount: 0, shippingFee: 0, fee: 1474000, margin: 14.2, risk: 12, channel: 'سایت', tags: ['تحویل سریع'], lockedBy: null,
      shipments: [{ id: 'GH-10481-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', status: 'ship.packed', sla: inMin(102), items: [{ productId: 'p1', unitId: 'GU-20412', qty: 1, price: 124500000 }, { productId: 'p5', unitId: 'GU-20440', qty: 1, price: 22900000 }], courier: null, tracking: '', allocReason: 'هر دو کالا در انبار تهران موجود بود.' }] },
    { id: 'GH-10480', customerId: 'c6', createdAt: ago(42), status: 'order.paid', pay: 'اسنپ‌پی', total: 15000000, discount: 0, shippingFee: 0, fee: 900000, margin: 14.7, risk: 34, channel: 'ترب', tags: ['اقساطی'], lockedBy: null,
      shipments: [{ id: 'GH-10480-1', warehouse: 'tehran', method: 'تحویل سریع (اسنپ‌باکس)', status: 'ship.pending', sla: inMin(60 * 20), items: [{ productId: 'p2', unitId: 'GU-20471', qty: 1, price: 15000000 }], courier: null, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10479', customerId: 'c7', createdAt: ago(60 * 2), status: 'order.preparing', pay: 'درگاه ملت', total: 104400000, discount: 2000000, shippingFee: 95000, fee: 0, margin: 16.8, risk: 8, channel: 'سایت', tags: ['دو مرسوله'], lockedBy: null,
      shipments: [
        { id: 'GH-10479-1', warehouse: 'tehran', method: 'پست پیشتاز', status: 'ship.packed', sla: inMin(60 * 5), items: [{ productId: 'p3', unitId: 'GU-20421', qty: 1, price: 79900000 }], courier: null, tracking: '', allocReason: 'موجودی تهران کافی بود.' },
        { id: 'GH-10479-2', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.partner_confirm', sla: inMin(35), items: [{ productId: 'p5', unitId: 'GU-20441', qty: 1, price: 24500000 }], courier: null, tracking: '', allocReason: 'تهران ناموجود بود؛ به انبار مهاباد رفت.' },
      ] },
    { id: 'GH-10478', customerId: 'c2', createdAt: ago(60 * 3), status: 'order.shipped', pay: 'ترب‌پی', total: 30900000, discount: 0, shippingFee: 0, fee: 1854000, margin: 15.9, risk: 10, channel: 'ترب', tags: ['اقساطی', 'تحویل سریع'], lockedBy: null,
      shipments: [{ id: 'GH-10478-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', status: 'ship.in_transit', sla: inMin(14), items: [{ productId: 'p4', unitId: 'GU-20430', qty: 1, price: 30900000 }], courier: { name: 'رضا احمدی', phone: '09120000000', plate: 'موتور ۱۲۳-۴۵۶۷۸', vehicle: 'موتور', eta: 14, code: 'SB-88213', cost: 185000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10475', customerId: 'c3', createdAt: ago(60 * 7), status: 'order.needs_decision', pay: 'زرین‌پال', total: 74900000, discount: 0, shippingFee: 120000, fee: 749000, margin: 18.5, risk: 15, channel: 'سایت', tags: ['کمبود تأمین'], lockedBy: 'نیما',
      decision: { kind: 'other_warehouse', alt: 'tehran', items: ['GH-10475-1|0'], deadline: inMin(60 * 17), at: ago(60 * 7), by: 'نیما' }, shipments: [{ id: 'GH-10475-1', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.pending', sla: inMin(60 * 16), items: [{ productId: 'p7', unitId: 'GU-20450', qty: 1, price: 74900000 }, { productId: 'p9', unitId: '', qty: 1, price: 1500000 }], courier: null, tracking: '', allocReason: 'فقط در انبار مهاباد موجود بود. شریک اعلام «ندارم» کرد.' }] },
    { id: 'GH-10470', customerId: 'c4', createdAt: ago(60 * 24), status: 'order.shipped', pay: 'کیف پول + زرین‌پال', total: 4500000, discount: 0, shippingFee: 0, fee: 45000, margin: 32.3, risk: 5, channel: 'سایت', tags: ['حقوقی', 'فاکتور رسمی'], lockedBy: null,
      shipments: [{ id: 'GH-10470-1', warehouse: 'tehran', method: 'تیپاکس', status: 'ship.in_transit', sla: inMin(60 * 24), items: [{ productId: 'p9', unitId: '', qty: 3, price: 1500000 }], courier: null, tracking: '21005478123', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10458', customerId: 'c1', buyer: 'legal', legalId: 'c4', createdAt: '2026-10-25T10:42:00+03:30', deliveredAt: '2026-10-27T13:10:00+03:30', status: 'order.delivered', pay: 'درگاه ملت', total: 30000000, discount: 1240000, shippingFee: 240000, fee: 0, margin: 19.6, risk: 6, channel: 'سایت', tags: ['دو مرسوله', 'حقوقی', 'فاکتور رسمی'], lockedBy: null,
      shipments: [
        { id: 'GH-10458-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', shipFee: 150000, packPhotos: [{ src: './products/p2-500.webp', at: '2026-10-25T11:20:00+03:30', by: 'نیما' }], status: 'ship.delivered', sla: '2026-10-25T12:42:00+03:30', items: [{ productId: 'p2', unitId: 'GU-20470', qty: 1, price: 16000000 }], courier: { name: 'محمد نوری', phone: '09120000001', plate: 'موتور ۵۴۳-۲۱۹۸۷', vehicle: 'موتور', eta: 0, code: 'SB-87102', cost: 172000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' },
        { id: 'GH-10458-2', warehouse: 'mahabad', method: 'پست پیشتاز', shipFee: 90000, status: 'ship.delivered', sla: '2026-10-28T18:00:00+03:30', items: [{ productId: 'p2', unitId: 'GU-20473', qty: 1, price: 15000000 }], courier: null, tracking: '120459870001245789630412', allocReason: 'رنگ استارلایت فقط در انبار مهاباد موجود بود.' },
      ] },
    { id: 'GH-10412', customerId: 'c1', createdAt: ago(60 * 24 * 29), status: 'order.delivered', pay: 'زرین‌پال', total: 29500000, discount: 0, shippingFee: 0, fee: 295000, margin: 15.6, risk: 4, channel: 'سایت', tags: [], lockedBy: null,
      shipments: [{ id: 'GH-10412-1', warehouse: 'tehran', method: 'تحویل سریع (اسنپ‌باکس)', status: 'ship.delivered', sla: ago(60 * 24 * 28), items: [{ productId: 'p4', unitId: 'GU-20432', qty: 1, price: 29500000 }], courier: { name: 'رضا احمدی', phone: '09120000000', plate: 'موتور ۱۲۳-۴۵۶۷۸', vehicle: 'موتور', eta: 0, code: 'SB-81944', cost: 165000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10451', customerId: 'c3', createdAt: ago(60 * 24 * 5), status: 'order.returned', pay: 'زرین‌پال', total: 21900000, discount: 0, shippingFee: 95000, fee: 219000, margin: 9.2, risk: 18, channel: 'ترب', tags: [], lockedBy: null,
      shipments: [{ id: 'GH-10451-1', warehouse: 'tehran', method: 'پست پیشتاز', status: 'ship.delivered', sla: ago(60 * 24 * 3), items: [{ productId: 'p5', unitId: 'GU-20442', qty: 1, price: 21900000 }], courier: null, tracking: '120459870001245789632145', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10449', cancelInfo: { by: 'غنیمت', reason: 'اعتبار اقساطی مشتری تأیید نشد و پرداخت جایگزین انجام نشد', at: ago(60 * 24 * 6 - 30), amount: 22900000, to: 'کارت بانکی', refund: 'در جریان', apology: 'از این لغو متأسفیم؛ اعتبار اقساطی تأیید نشد و پرداخت دیگری ثبت نشد.', code: { code: 'GH0449K7Q', amount: 500000, until: inMin(60 * 24 * 8) }, notify: true }, customerId: 'c5', createdAt: ago(60 * 24 * 6), status: 'order.cancelled', pay: 'تارا', total: 22900000, discount: 0, shippingFee: 0, fee: 0, margin: 0, risk: 22, channel: 'اینستاگرام', tags: ['اعتبار ردشده'], lockedBy: null, shipments: [{ id: 'GH-10449-1', warehouse: 'tehran', method: 'پست پیشتاز', status: 'ship.cancelled', sla: ago(60 * 24 * 6), items: [{ productId: 'p5', unitId: '', qty: 1, price: 22900000, cancelled: true, cancelBy: 'غنیمت' }] }] },
    { id: 'GH-10444', customerId: 'c6', createdAt: ago(60 * 24 * 7), status: 'order.suspicious', pay: 'زرین‌پال', total: 259800000, discount: 12000000, shippingFee: 0, fee: 2598000, margin: 10.1, risk: 87, channel: 'سایت', tags: ['امتیاز ریسک بالا'], lockedBy: null,
      shipments: [{ id: 'GH-10444-1', warehouse: 'tehran', method: 'باربری', status: 'ship.pending', sla: inMin(60 * 30), items: [{ productId: 'p1', unitId: 'GU-20414', qty: 2, price: 129900000 }], courier: null, tracking: '', allocReason: 'بازبینی دستی لازم است.' }] },
  ] as Order[]),
  tickets: [
    { id: 'TK-482106', topic: 'سفارش و ارسال', reason: 'کسری اقلام', items: ['p2'], customerId: 'c1', orderId: 'GH-10458', subject: 'کابل شارژ داخل جعبه نبود', channel: 'چت سایت', status: 'ticket.new', priority: 'فوری', sla: inMin(11), assignee: '', sentiment: 'ناراضی', messages: [{ from: 'customer', text: 'سلام. سفارش GH-10458 را تحویل گرفتم. هدست AirPods Max جعبه‌باز بود ولی کابل شارژ داخل جعبه نبود. در صفحهٔ کالا نوشته بود کابل دارد.', at: ago(19) }] },
    { id: 'TK-482093', topic: 'سفارش و ارسال', reason: 'تأخیر در ارسال', customerId: 'c2', orderId: 'GH-10478', subject: 'پیک کی می‌رسد؟', channel: 'پیامک', status: 'ticket.open', priority: 'عادی', sla: inMin(25), assignee: 'سارا', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'سفارشم را دو ساعت پیش ثبت کردم. پیک کجاست؟', at: ago(12) }] },
    { id: 'TK-482071', topic: 'مرجوعی و گارانتی', reason: 'پیگیری مرجوعی', replyBy: new Date(Date.now() + 36e5 * 31).toISOString(), customerId: 'c3', orderId: 'GH-10451', subject: 'وضعیت بازگشت وجه مرجوعی', channel: 'تیکت پنل', status: 'ticket.needs_info', priority: 'عادی', sla: inMin(60 * 3), assignee: 'سارا', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'کالا را سه روز پیش پس فرستادم. پول کی واریز می‌شود؟', at: ago(60 * 4) }, { from: 'agent', text: 'سلام. بسته به انبار رسیده و در حال بررسی است. شمارهٔ شبا را برای واریز تأیید می‌کنید؟', at: ago(60 * 3) }] },
    { id: 'TK-482044', topic: 'سفارش و ارسال', reason: 'سایر', customerId: 'c7', orderId: 'GH-10479', subject: 'چرا سفارش من دو بسته شده است؟', channel: 'بله', status: 'ticket.answered', priority: 'کم', sla: inMin(60 * 8), assignee: 'نیما', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'در پنل نوشته دو مرسوله. یعنی چه؟', at: ago(60 * 2) }, { from: 'agent', text: 'یکی از کالاها از انبار تهران و دیگری از انبار مهاباد ارسال می‌شود. هر دو با پست پیشتاز می‌رسند و هزینهٔ اضافه‌ای ندارد.', at: ago(60) }] },
    { id: 'TK-481980', topic: 'پرداخت و کیف پول', reason: 'اقساط', csat: 'yes', customerId: 'c5', orderId: 'GH-10449', subject: 'اعتبار اقساطی رد شد', channel: 'تماس تلفنی', status: 'ticket.closed', priority: 'عادی', sla: ago(60 * 24), assignee: 'سارا', sentiment: 'ناراضی', messages: [{ from: 'customer', text: 'اعتبار تارا رد شد و سفارش لغو شد.', at: ago(60 * 24 * 6) }] },
  ] as Ticket[],
  returns: [
    { id: 'RT-840552', orderId: 'GH-10458', customerId: 'c1', unitId: 'GU-20473', productId: 'p2', items: [{ productId: 'p2', unitId: 'GU-20473', qty: 1, price: 15000000, shipId: 'GH-10458-2' }], reason: 'مغایرت با صفحهٔ کالا', note: 'رنگ کالای دریافتی با رنگ اعلام‌شده در صفحهٔ کالا فرق دارد. در صفحه «استارلایت» نوشته شده ولی کالا آبی روشن است.', photos: ['./products/p2-500.webp'], status: 'return.awaiting_customer', amount: 15000000, dest: 'کارت بانکی', refundTo: { kind: 'card', bank: 'ملت', last4: '۴۴۱۷', holder: 'سروش رنجبران' }, method: 'courier', shipCostBy: 'غنیمت', createdAt: ago(60 * 5), deadline: inMin(60 * 24 * 4),
      events: [{ at: ago(60 * 5), by: 'سروش رنجبران', text: 'ثبت درخواست مرجوعی؛ دلیل: مغایرت با صفحهٔ کالا؛ روش ارسال: پیک (پس‌کرایه)؛ بازگشت وجه: کارت بانکی ملت •••• ۴۴۱۷', who: 'مشتری' }] },
    { id: 'RT-841512', orderId: 'GH-10478', customerId: 'c2', unitId: 'GU-20430', items: [{ productId: 'p4', unitId: 'GU-20430', qty: 1, price: 30900000 }], reason: 'ایراد کارکردی', note: 'باتری بعد از یک روز استفاده ۶۰٪ است و گوشی گرم می‌شود.', photos: [], status: 'return.in_transit', amount: 30900000, dest: 'کیف پول', refundTo: { kind: 'wallet' }, method: 'post', tracking: '2840519930021', declaredAt: ago(60 * 20), shipCostBy: 'غنیمت', createdAt: ago(60 * 50), deadline: inMin(60 * 24 * 2),
      events: [{ at: ago(60 * 50), by: 'نگار امینی', text: 'ثبت درخواست مرجوعی؛ دلیل: ایراد کارکردی؛ روش ارسال: پست (پس‌کرایه)؛ بازگشت وجه: کیف پول غنیمت', who: 'مشتری' }, { at: ago(60 * 20), by: 'نگار امینی', text: 'اعلام ارسال کالا (پست، کد رهگیری 2840519930021)', who: 'مشتری' }] },
    { id: 'RT-840560', orderId: 'GH-10451', customerId: 'c3', unitId: 'GU-20442', items: [{ productId: 'p5', unitId: 'GU-20442', qty: 1, price: 21900000 }], reason: 'مغایرت با صفحهٔ کالا', note: 'رنگ هدفون با عکس صفحهٔ کالا فرق دارد.', photos: ['./products/p5-500.webp'], status: 'return.inspecting', amount: 21995000, origShipFee: 95000, dest: 'کارت بانکی', refundTo: { kind: 'card', bank: 'سامان', last4: '۸۸۰۲', holder: 'کاوه مرادی' }, method: 'post', tracking: '2840519930077', declaredAt: ago(60 * 30), shipCostBy: 'غنیمت', createdAt: ago(60 * 24 * 3), deadline: inMin(60 * 24 * 3),
      receipt: { at: ago(60 * 4), by: 'مریم', serial: 'S01-5525102', serialOk: true, sealOk: true, accOk: true, photos: [], note: 'جعبه سالم، هدفون در کیف اصلی.' },
      events: [{ at: ago(60 * 24 * 3), by: 'کاوه مرادی', text: 'ثبت درخواست مرجوعی؛ دلیل: مغایرت با صفحهٔ کالا؛ روش ارسال: پست (پس‌کرایه)؛ بازگشت وجه: کارت بانکی سامان •••• ۸۸۰۲', who: 'مشتری' }, { at: ago(60 * 30), by: 'کاوه مرادی', text: 'اعلام ارسال کالا (پست، کد رهگیری 2840519930077)', who: 'مشتری' }, { at: ago(60 * 4), by: 'مریم', text: 'دریافت در انبار مرجوعی تهران؛ بررسی در مرکز کنترل کیفیت آغاز شد.', who: 'ما' }] },
    { id: 'RT-841880', orderId: 'GH-10495', customerId: 'c1', unitId: '', reason: 'انصراف از خرید', note: 'به مدل دیگری از این کالا نیاز پیدا کردم.', photos: [], items: [{ productId: 'p9', unitId: '', qty: 1, price: 3000000 }], status: 'return.awaiting_pickup', amount: 3000000, dest: 'کیف پول', refundTo: { kind: 'wallet' }, method: 'inperson', branch: 'شعبهٔ سعادت‌آباد', shipCostBy: 'مشتری', createdAt: ago(60 * 26), deadline: inMin(60 * 46),
      events: [{ at: ago(60 * 26), by: 'سروش رنجبران', text: 'ثبت درخواست مرجوعی؛ دلیل: انصراف از خرید؛ روش ارسال: تحویل حضوری در شعبه؛ بازگشت وجه: کیف پول غنیمت', who: 'مشتری' }] },
    { id: 'RT-839910', orderId: 'GH-10412', customerId: 'c1', unitId: 'GU-20432', items: [{ productId: 'p4', unitId: 'GU-20432', qty: 1, price: 29500000, ok: true }], reason: 'انصراف از خرید', note: 'بند ساعت برایم کوچک بود.', status: 'return.refunded', amount: 29500000, dest: 'کیف پول', refundTo: { kind: 'wallet' }, method: 'post', shipCostBy: 'مشتری', returnShipCost: 180000, qcNote: 'کالا سالم و کامل بود.', createdAt: ago(60 * 24 * 26), deadline: ago(60 * 24 * 24),
      refund: { amount: 29320000, dest: 'کیف پول غنیمت', ref: '7412589631', at: ago(60 * 24 * 21), by: 'مالی', deduct: 180000 } },
    { id: 'RT-838745', orderId: 'GH-10470', customerId: 'c4', unitId: '', items: [{ productId: 'p9', unitId: '', qty: 1, price: 1500000, ok: true }], reason: 'ایراد کارکردی', note: 'یکی از سه شارژر گرم می‌شود و شارژ نمی‌کند.', status: 'return.refunding', amount: 1500000, dest: 'کارت بانکی', refundTo: { kind: 'card', bank: 'تجارت', last4: '۱۲۰۹', holder: 'آرین‌پردازان نوین' }, method: 'courier', shipCostBy: 'غنیمت', qcNote: 'ایراد کارکردی تأیید شد.', createdAt: ago(60 * 24 * 2), deadline: inMin(60 * 4),
      refund: { amount: 1500000, dest: 'کارت بانکی تجارت •••• ۱۲۰۹' } },
    { id: 'RT-841203', orderId: 'GH-10458', customerId: 'c1', unitId: 'GU-20470', items: [{ productId: 'p2', unitId: 'GU-20470', qty: 1, price: 16000000, shipId: 'GH-10458-1' }], reason: 'انصراف از خرید', note: '', status: 'return.cancelled', amount: 16000000, dest: 'کیف پول', refundTo: { kind: 'wallet' }, method: 'post', shipCostBy: 'مشتری', createdAt: ago(60 * 24 * 9), deadline: ago(60 * 24 * 5), cancelledAt: ago(60 * 24 * 8) },
  ] as Ret[],
  warranties: [
    { id: 'GR-2045', code: 'GW-31877', customerId: 'c1', unitId: 'GU-20470', productId: 'p2', orderId: 'GH-10458', type: 'گارانتی رسمی غنیمت', months: 1, status: 'warranty.pending', reasonKind: 'ایراد کارکردی یا عملکرد کالا', issue: 'از دو روز پیش صدای گوشی چپ گاهی قطع و وصل می‌شود. با گوشی و لپ‌تاپ امتحان کردم و در هر دو همین مشکل هست.', photos: ['./products/p2-500.webp'], contact: '09123456789', owner: 'واحد گارانتی غنیمت', createdAt: ago(40), deadline: inMin(60 * 23),
      events: [{ at: ago(40), by: 'سروش رنجبران', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }] },
    { id: 'GR-1987', code: 'GW-29811', customerId: 'c3', unitId: 'GU-20442', productId: 'p5', orderId: 'GH-10451', type: 'گارانتی رسمی غنیمت', months: 3, status: 'warranty.reviewing', reasonKind: 'ایراد کارکردی یا عملکرد کالا', issue: 'اتصال بلوتوث هر چند دقیقه قطع می‌شود.', photos: [], contact: '09121112233', owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 26), deadline: inMin(60 * 6),
      events: [{ at: ago(60 * 26), by: 'کاوه مرادی', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 3), by: 'سارا', text: 'شروع بررسی توسط واحد گارانتی غنیمت' }] },
    { id: 'GR-1840', code: 'GW-30955', customerId: 'c1', unitId: 'GU-20432', productId: 'p4', orderId: 'GH-10412', type: 'گارانتی رسمی شرکتی', months: 6, status: 'warranty.approved', reasonKind: 'تردید در اصالت کالا', issue: 'سریال روی جعبه با سریال داخل تنظیمات ساعت یکی نیست.', photos: [], contact: '09123456789', owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 24 * 3), deadline: inMin(60 * 24 * 5), shipDeadline: inMin(60 * 24 * 5),
      events: [{ at: ago(60 * 24 * 3), by: 'سروش رنجبران', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 24 * 2), by: 'سارا', text: 'شروع بررسی توسط واحد گارانتی غنیمت' }, { at: ago(60 * 24 * 2 - 90), by: 'سارا', text: 'تأیید درخواست و درخواست ارسال کالا از طرف غنیمت' }] },
    { id: 'GR-1838', code: 'GW-30412', customerId: 'c1', unitId: 'GU-20473', productId: 'p2', orderId: 'GH-10458', type: 'گارانتی رسمی غنیمت', months: 3, status: 'warranty.in_transit', reasonKind: 'ایراد کارکردی یا عملکرد کالا', issue: 'شارژ نمی‌گیرد.', photos: [], contact: '09123456789', owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 24 * 6), deadline: inMin(60 * 24 * 2), shipDeadline: inMin(60 * 24 * 2), method: 'post', tracking: '120345678901234567890012', declaredAt: ago(60 * 24),
      events: [{ at: ago(60 * 24 * 6), by: 'سروش رنجبران', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 24 * 5), by: 'سارا', text: 'شروع بررسی توسط واحد گارانتی غنیمت' }, { at: ago(60 * 24 * 4), by: 'سارا', text: 'تأیید درخواست و درخواست ارسال کالا از طرف غنیمت' }, { at: ago(60 * 24), by: 'سروش رنجبران', text: 'اعلام ارسال کالا توسط مشتری (پست پیشتاز)', who: 'مشتری' }] },
    { id: 'GR-1836', code: 'GW-28870', customerId: 'c2', unitId: 'GU-20430', productId: 'p4', orderId: 'GH-10478', type: 'گارانتی رسمی شرکتی', months: 6, status: 'warranty.repairing', reasonKind: 'ایراد کارکردی یا عملکرد کالا', issue: 'صفحه گاهی لمس را تشخیص نمی‌دهد.', photos: [], contact: '09351234567', owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 24 * 9), deadline: inMin(60 * 24 * 3), method: 'inperson', defect: 'ایراد لمس صفحه در گوشهٔ پایین', service: 'تعمیر',
      receipt: { at: ago(60 * 24 * 2), by: 'مریم', serial: 'H4KX92JLQ1', serialOk: true, sealOk: true, accOk: true, photos: [], note: '' },
      events: [{ at: ago(60 * 24 * 9), by: 'نگار امینی', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 24 * 8), by: 'سارا', text: 'شروع بررسی توسط واحد گارانتی غنیمت' }, { at: ago(60 * 24 * 7), by: 'سارا', text: 'تأیید درخواست و درخواست ارسال کالا از طرف غنیمت' }, { at: ago(60 * 24 * 2), by: 'مریم', text: 'دریافت و بررسی کالا در غنیمت' }, { at: ago(60 * 24 * 1), by: 'رضا', text: 'شروع تعمیر' }] },
    { id: 'GR-1825', code: 'GW-26550', customerId: 'c4', unitId: 'GU-20441', productId: 'p5', type: 'گارانتی رسمی شرکتی', months: 6, status: 'warranty.done', reasonKind: 'ایراد کارکردی یا عملکرد کالا', issue: 'دکمهٔ پاور کار نمی‌کند.', owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 24 * 30), deadline: ago(60 * 48), method: 'post', defect: 'خرابی کلید پاور', service: 'تعمیر', repairNote: 'کلید پاور تعویض شد', back: { method: 'پست پیشتاز', tracking: '120345678901234567899001', at: ago(60 * 24 * 4) },
      events: [{ at: ago(60 * 24 * 30), by: 'مشتری', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 24 * 2), by: 'مریم', text: 'تحویل کالای تعمیرشده به مشتری' }] },
    { id: 'GR-1792', code: 'GW-27315', customerId: 'c6', unitId: 'GU-20414', productId: 'p1', type: 'گارانتی رسمی غنیمت', months: 1, status: 'warranty.rejected', reasonKind: 'سایر', issue: 'گوشی بعد از افتادن روشن نمی‌شود.', photos: [], owner: 'واحد گارانتی غنیمت', createdAt: ago(60 * 24 * 12), deadline: ago(60 * 24 * 10), rejectReason: 'بر اساس تصاویر ارسالی، ایراد ناشی از آسیب فیزیکی پس از تحویل است و شامل پوشش این گارانتی نمی‌شود.',
      events: [{ at: ago(60 * 24 * 12), by: 'امیرحسین صادقی', text: 'ثبت درخواست مرجوعی گارانتی', who: 'مشتری' }, { at: ago(60 * 24 * 11), by: 'سارا', text: 'شروع بررسی توسط واحد گارانتی غنیمت' }, { at: ago(60 * 24 * 10), by: 'سارا', text: 'رد درخواست با ذکر دلیل' }] },
  ] as War[],
  wcards: [
    { code: 'GW-31877', unitId: 'GU-20470', productId: 'p2', customerId: 'c1', orderId: 'GH-10458', type: 'گارانتی رسمی غنیمت', provider: 'واحد گارانتی غنیمت', months: 1, start: '2026-10-27T13:10:00+03:30', status: 'active', notes: ['جعبه و بسته‌بندی این کالا شامل گارانتی نمی‌شود.'] },
    { code: 'GW-30412', unitId: 'GU-20473', productId: 'p2', customerId: 'c1', orderId: 'GH-10458', type: 'گارانتی رسمی غنیمت', provider: 'واحد گارانتی غنیمت', months: 3, start: '2026-10-28T16:00:00+03:30', status: 'active', notes: [] },
    { code: 'GW-30955', unitId: 'GU-20432', productId: 'p4', customerId: 'c1', orderId: 'GH-10412', type: 'گارانتی رسمی شرکتی', provider: 'آواژنگ (نمایندگی رسمی)', months: 6, start: ago(60 * 24 * 28), status: 'active', notes: ['بند ساعت شامل گارانتی نمی‌شود.'] },
    { code: 'GW-29811', unitId: 'GU-20442', productId: 'p5', customerId: 'c3', orderId: 'GH-10451', type: 'گارانتی رسمی غنیمت', provider: 'واحد گارانتی غنیمت', months: 3, start: ago(60 * 24 * 3), status: 'active', notes: [] },
    { code: 'GW-28870', unitId: 'GU-20430', productId: 'p4', customerId: 'c2', orderId: 'GH-10478', type: 'گارانتی رسمی شرکتی', provider: 'آواژنگ (نمایندگی رسمی)', months: 6, start: ago(60 * 24 * 12), status: 'active', notes: [] },
    { code: 'GW-26550', unitId: 'GU-20441', productId: 'p5', customerId: 'c4', orderId: 'GH-10479', type: 'گارانتی رسمی شرکتی', provider: 'واحد گارانتی غنیمت', months: 6, start: ago(60 * 24 * 60), status: 'active', notes: [] },
    { code: 'GW-27315', unitId: 'GU-20414', productId: 'p1', customerId: 'c6', orderId: 'GH-10444', type: 'گارانتی رسمی غنیمت', provider: 'واحد گارانتی غنیمت', months: 1, start: ago(60 * 24 * 20), status: 'invalid', invalidReason: 'سفارش به‌دلیل ریسک بالا در بازبینی است و کالا تحویل نشده است.', notes: [] },
    { code: 'GW-26108', unitId: 'GU-20412', productId: 'p1', customerId: 'c7', orderId: 'GH-10479', type: 'گارانتی رسمی غنیمت', provider: 'واحد گارانتی غنیمت', months: 1, start: ago(60 * 24 * 75), status: 'expired', notes: [] },
  ] as WCard[],
  txns: [
    { id: 'TX-90811', orderId: 'GH-10481', amount: 147400000, gateway: 'زرین‌پال', ref: '48120099731', status: 'pay.success', at: ago(18) },
    { id: 'TX-90810', orderId: 'GH-10480', amount: 38500000, gateway: 'اسنپ‌پی', ref: 'SP-7781200', status: 'pay.unknown', at: ago(42) },
    { id: 'TX-90808', orderId: 'GH-10479', amount: 102495000, gateway: 'درگاه ملت', ref: '90011247781', status: 'pay.success', at: ago(60 * 2) },
    { id: 'TX-90805', orderId: 'GH-10478', amount: 30900000, gateway: 'ترب‌پی', ref: 'TP-220871', status: 'pay.success', at: ago(60 * 3) },
    { id: 'TX-90801', orderId: '', amount: 24500000, gateway: 'زرین‌پال', ref: '48120099102', status: 'pay.unknown', at: ago(60 * 5) },
    { id: 'TX-90790', orderId: 'GH-10475', amount: 75020000, gateway: 'زرین‌پال', ref: '48120098540', status: 'pay.success', at: ago(60 * 7) },
    { id: 'TX-90744', orderId: 'GH-10449', amount: 22900000, gateway: 'تارا', ref: 'TR-55102', status: 'pay.failed', at: ago(60 * 24 * 6) },
    { id: 'TX-90702', orderId: 'GH-10451', amount: 21995000, gateway: 'زرین‌پال', ref: '48120091277', status: 'pay.refunded', at: ago(60 * 24 * 5) },
  ],
  approvals: [
    { id: 'AP-701', type: 'بازگشت وجه', title: 'بازگشت ۲۱٬۹۰۰٬۰۰۰ تومان به کارت کاوه مرادی', ref: 'RT-840552', amount: 21900000, by: 'کارشناس مالی', byRole: 'finance', status: 'approval.pending', at: ago(50) },
    { id: 'AP-700', type: 'تغییر قیمت گروهی', title: 'کاهش ۴٪ قیمت ۶ واحد راکد بیش از ۳۰ روز', ref: 'قیمت‌گذاری', amount: 0, by: 'مدیر عملیات', byRole: 'ops', status: 'approval.pending', at: ago(60 * 3) },
    { id: 'AP-698', type: 'درخواست اپراتور', title: 'تغییر آدرس سفارش GH-10479', ref: 'GH-10479', amount: 0, by: 'اپراتور ساده', byRole: 'simple', status: 'approval.pending', at: ago(25) },
  ],
  reviews: ([
    { id: 'RV-1', productId: 'p1', customerId: 'c1', rating: 5, text: 'دقیقاً همان چیزی بود که در عکس‌ها دیدم. خط کنار قاب هم همان‌قدر ریز بود که نوشته بودید.', status: 'review.pending', verified: true, at: ago(60 * 5), ai: 'سالم', media: [{ id: 'm1', type: 'image', src: './products/p1-500.webp', status: 'pending', flag: '' }, { id: 'm2', type: 'image', src: './products/p1-500.webp', status: 'pending', flag: '' }] },
    { id: 'RV-2', productId: 'p5', customerId: 'c3', rating: 2, text: 'رنگش با عکس فرق داشت. مرجوع کردم.', status: 'review.pending', verified: true, at: ago(60 * 26), ai: 'سالم', media: [{ id: 'm3', type: 'image', src: './products/p5-500.webp', status: 'pending', flag: '' }, { id: 'm4', type: 'video', src: './products/p5-500.webp', status: 'pending', flag: '' }] },
    { id: 'RV-3', productId: 'p2', customerId: 'c6', rating: 5, text: 'عالی عالی عالی بخرید شماره من ۰۹۱۲...', status: 'review.pending', verified: false, at: ago(60 * 30), ai: 'اطلاعات شخصی + احتمال اسپم', media: [{ id: 'm5', type: 'image', src: './products/p2-500.webp', status: 'pending', flag: 'شمارهٔ تلفن روی عکس' }] },
    { id: 'RV-4', productId: 'p3', customerId: 'c7', rating: 4, text: 'بسته‌بندی خوب بود و برگهٔ کنترل کیفیت داخل جعبه بود.', status: 'review.approved', verified: true, at: ago(60 * 24 * 4), ai: 'سالم', media: [{ id: 'm6', type: 'image', src: './products/p3-500.webp', status: 'approved', flag: '', featured: true }] },
  ] as { id: string; productId: string; customerId: string; rating: number; text: string; status: string; verified: boolean; at: string; ai: string; media: { id: string; type: string; src: string; status: string; flag: string; featured?: boolean }[] }[]),
  codes: [
    { id: 'WELCOME', type: 'مبلغی', value: '۵۰۰٬۰۰۰ تومان', used: 214, limit: 1000, active: true, cond: 'اولین خرید' },
    { id: 'SORRY-CANCEL', type: 'مبلغی', value: '۵۰۰٬۰۰۰ تومان', used: 31, limit: 0, active: true, cond: 'کد جبرانی لغو' },
    { id: 'YALDA', type: 'درصدی', value: '۸٪ هدفون‌ها', used: 0, limit: 300, active: false, cond: 'دستهٔ هدفون، حداقل خرید ۲۰ میلیون' },
    { id: 'FREESHIP', type: 'ارسال رایگان', value: 'ارسال رایگان', used: 88, limit: 500, active: true, cond: 'حداقل خرید ۱۰ میلیون' },
  ] as { id: string; type: string; value: string; used: number; limit: number; active: boolean; cond: string; title?: string; cap?: number; expires?: string; perUser?: number; audience?: string; customerId?: string; minCart?: number }[],
  // ثبت ارائه‌دهنده (بخش ۵.۱۱-الف)؛ هیچ نام سرویسی در منطق ثابت نیست.
  providers: [
    { id: 'snapppay', family: 'bnpl', name: 'اسنپ‌پی', status: 'prov.active', share: 14, installments: 4, fee: 6, settleDays: 7, pending: 412000000, isDefault: true, min: 1000000, max: 100000000, health: 99.1 },
    { id: 'torobpay', family: 'bnpl', name: 'ترب‌پی', status: 'prov.active', share: 9, installments: 4, fee: 6, settleDays: 10, pending: 228000000, isDefault: false, min: 500000, max: 80000000, health: 98.4 },
    { id: 'digipay', family: 'bnpl', name: 'دیجی‌پی', status: 'prov.slow', share: 7, installments: 4, fee: 6.5, settleDays: 14, pending: 301000000, isDefault: false, min: 1000000, max: 150000000, health: 91.0 },
    { id: 'tara', family: 'bnpl', name: 'تارا', status: 'prov.error', share: 3, installments: 3, fee: 5, settleDays: 15, pending: 64000000, isDefault: false, min: 500000, max: 50000000, health: 62.5 },
    { id: 'zarinpal', family: 'gateway', name: 'زرین‌پال', status: 'prov.active', share: 52, fee: 1, settleDays: 1, pending: 0, isDefault: true, health: 99.6 },
    { id: 'mellat', family: 'gateway', name: 'درگاه ملت', status: 'prov.active', share: 11, fee: 0.5, settleDays: 1, pending: 0, isDefault: false, health: 98.9 },
    { id: 'saman', family: 'gateway', name: 'درگاه سامان', status: 'prov.paused', share: 0, fee: 0, isDefault: false, health: 100 },
    { id: 'snappbox', family: 'carrier', name: 'اسنپ‌باکس', status: 'prov.active', share: 38, health: 97.2, isDefault: true },
    { id: 'alopeyk', family: 'carrier', name: 'الوپیک', status: 'prov.active', share: 17, health: 100, isDefault: false },
    { id: 'post', family: 'carrier', name: 'پست پیشتاز', status: 'prov.active', share: 31, health: 96.0, isDefault: false },
    { id: 'tipax', family: 'carrier', name: 'تیپاکس', status: 'prov.active', share: 11, health: 98.1, isDefault: false },
    { id: 'freight', family: 'carrier', name: 'باربری', status: 'prov.active', share: 3, health: 100, isDefault: false },
    { id: 'sms1', family: 'sms', name: 'پنل پیامک اصلی', status: 'prov.active', share: 92, health: 98.7, isDefault: true, credit: 3850000, burn: 410000 },
    { id: 'sms2', family: 'sms', name: 'پنل پیامک پشتیبان', status: 'prov.testing', share: 8, health: 99.0, isDefault: false, credit: 900000, burn: 30000 },
    { id: 'bale', family: 'messenger', name: 'بله', status: 'prov.active', share: 46, health: 99.2, isDefault: true },
    { id: 'telegram', family: 'messenger', name: 'تلگرام', status: 'prov.active', share: 31, health: 94.0, isDefault: false },
    { id: 'whatsapp', family: 'messenger', name: 'واتساپ', status: 'prov.paused', share: 0, health: 0, isDefault: false },
    { id: 'site', family: 'channel', name: 'سایت غنیمت', status: 'prov.active', share: 61, health: 99.9, isDefault: true },
    { id: 'torob', family: 'channel', name: 'ترب', status: 'prov.active', share: 39, health: 97.5, isDefault: false },
    { id: 'basalam', family: 'channel', name: 'باسلام', status: 'prov.soon', share: 0, health: 0, isDefault: false },
    { id: 'digikala', family: 'channel', name: 'دیجی‌کالا', status: 'prov.soon', share: 0, health: 0, isDefault: false },
    { id: 'shahkar', family: 'inquiry', name: 'شاهکار', status: 'prov.active', share: 100, health: 97.8, isDefault: true },
    { id: 'cardinq', family: 'inquiry', name: 'استعلام کارت و شبا', status: 'prov.active', share: 100, health: 99.0, isDefault: true },
  ],
  // موتور قوانین کسب‌وکار (بخش ۵.۱۱-ج و ۶.۲۶)
  rules: [
    { key: 'fast_delivery_hours', group: 'ارسال', name: 'مدت وعدهٔ تحویل سریع', value: 2, unit: 'ساعت', desc: 'از لحظهٔ پرداخت تا تحویل در محدودهٔ تحویل سریع.', sensitive: false, usedIn: ['نام روش ارسال «تحویل {مدت_تحویل_سریع} ساعته»', 'بج کارت محصول', 'نوار بالای سایت و هیرو', 'صفحهٔ راهنمای ارسال و FAQ', 'عنوان و توضیح متای ۳۴ صفحه', 'قالب پیامک «سفارش جدید»', 'تایمر SLA مرکز عملیات', 'ساعت قطع سفارش', 'هشدار «در آستانهٔ نقض SLA»', 'گزارش تحویل به‌موقع'], history: [{ by: 'مدیر کل', at: ago(60 * 24 * 40), from: 3, to: 2 }] },
    { key: 'free_shipping_threshold', group: 'ارسال', name: 'آستانهٔ ارسال رایگان', value: 10000000, unit: 'تومان', desc: 'سبدهای بالاتر از این مبلغ ارسال رایگان دارند.', sensitive: false, usedIn: ['نوار بالای سایت', 'نوار پیشرفت سبد خرید', 'صفحهٔ راهنمای ارسال'], history: [] },
    { key: 'cutoff_hour', group: 'ارسال', name: 'ساعت قطع سفارش تحویل سریع', value: 19, unit: 'ساعت روز', desc: 'سفارش‌های بعد از این ساعت، فردا تحویل می‌شوند.', sensitive: false, usedIn: ['صفحهٔ کالا', 'مرحلهٔ ارسال'], history: [] },
    { key: 'return_days', group: 'مرجوعی', name: 'مهلت مرجوعی', value: 7, unit: 'روز', desc: 'از زمان تحویل تا ثبت درخواست مرجوعی.', sensitive: true, usedIn: ['صفحهٔ کالا', 'صفحهٔ قوانین و مقررات', 'پنل مشتری › مرجوعی', 'زمان واریز هدیهٔ دیدگاه', 'FAQ'], history: [] },
    { key: 'inspection_hours', group: 'مرجوعی', name: 'مهلت بازرسی مرجوعی', value: 48, unit: 'ساعت', desc: 'از رسیدن بسته به انبار تا اعلام نتیجه.', sensitive: false, usedIn: ['صف مرجوعی', 'پیامک وضعیت مرجوعی'], history: [] },
    { key: 'reserve_minutes', group: 'موجودی و سبد', name: 'مدت رزرو کالا داخل درگاه پرداخت', value: 15, unit: 'دقیقه', desc: 'رزرو فقط از لحظهٔ ورود مشتری به درگاه بانک شروع می‌شود؛ در سبد خرید و صفحهٔ پرداخت سایت رزروی نیست. اگر پرداخت ناموفق شد، مشتری انصراف داد یا از درگاه برگشت، کالا همان لحظه به موجودی سایت برمی‌گردد. اگر در این مدت پاسخی از درگاه نیامد، رزرو خودکار آزاد می‌شود.', sensitive: false, usedIn: ['صفحهٔ پرداخت', 'مانیتور رزروها', 'قفل بین کانال‌ها'], history: [] },
    { key: 'low_stock_threshold', group: 'موجودی و سبد', name: 'آستانهٔ «موجودی محدود»', value: 2, unit: 'عدد', desc: 'کمتر یا مساوی این تعداد، بج «موجودی محدود» نمایش داده می‌شود.', sensitive: false, usedIn: ['بج چرخشی کارت محصول', 'صفحهٔ کالا'], history: [] },
    { key: 'decision_hours', group: 'سفارش', name: 'مهلت تصمیم مشتری در کمبود تأمین', value: 24, unit: 'ساعت', desc: 'پس از پایان مهلت، قلم تأمین‌نشده خودکار لغو می‌شود.', sensitive: true, usedIn: ['پنل مشتری › سفارش جاری', 'پیامک درخواست تصمیم', 'لغو خودکار'], history: [] },
    { key: 'daily_sales_goal', group: 'اهداف', name: 'هدف فروش روزانه', value: 600000000, unit: 'تومان', desc: 'خط هدف نمودار «فروش روزانه در برابر هدف» و یادداشت کارت «فروش امروز».', sensitive: false, usedIn: ['خانه › فروش روزانه در برابر هدف', 'کارت فروش امروز', 'گزارش روزانه'], history: [] },
    { key: 'monthly_sales_goal', group: 'اهداف', name: 'هدف فروش ماهانه', value: 15000000000, unit: 'تومان', desc: 'پیشرفت ماه در داشبورد و گزارش‌های زمان‌بندی‌شده.', sensitive: false, usedIn: ['خانه', 'تحلیل و گزارش'], history: [] },
    { key: 'ontime_goal', group: 'اهداف', name: 'هدف تحویل به‌موقع', value: 95, unit: 'درصد', desc: 'زیر این مقدار، کارت «تحویل به‌موقع» هشدار می‌دهد.', sensitive: false, usedIn: ['خانه', 'ارسال ← تحلیل'], history: [] },
    { key: 'margin_goal', group: 'اهداف', name: 'هدف حاشیهٔ سود', value: 18, unit: 'درصد', desc: 'حاشیهٔ هدف در میز قیمت‌گذاری و کارت سود.', sensitive: false, usedIn: ['میز قیمت‌گذاری', 'کارت سود'], history: [] },
    { key: 'margin_floor', group: 'قیمت', name: 'کف حاشیهٔ سود', value: 8, unit: 'درصد', desc: 'قیمتی که حاشیه را زیر این مقدار ببرد، بدون تأیید مدیر ذخیره نمی‌شود.', sensitive: true, usedIn: ['میز قیمت‌گذاری', 'پیشنهاد قیمت AI', 'قواعد انتشار ترب'], history: [] },
    { key: 'refund_cap', group: 'پرداخت', name: 'سقف بازگشت وجه بدون تأیید دوم', value: 20000000, unit: 'تومان', desc: 'بازگشت وجه بالاتر از این مبلغ به تأیید نفر دوم می‌رود.', sensitive: true, usedIn: ['بازگشت وجه', 'مرجوعی', 'صندوق تأییدها'], history: [] },
    { key: 'installments_shown', group: 'پرداخت', name: 'تعداد اقساط نمایش‌داده‌شده', value: 4, unit: 'قسط', desc: 'از سرویس اقساطی پیش‌فرض خوانده می‌شود.', sensitive: false, usedIn: ['بج چرخشی کارت محصول', 'صفحهٔ کالا', 'سبد خرید'], history: [] },
    { key: 'mahabad_buffer', group: 'شریک انبار', name: 'ذخیرهٔ احتیاطی موجودی انبار مهاباد', value: 1, unit: 'عدد', desc: 'موجودی انبار مهاباد با کسر این تعداد در سایت نمایش داده می‌شود.', sensitive: false, usedIn: ['نمایش موجودی سایت', 'سلامت همگام‌سازی'], history: [] },
    { key: 'sync_stale_minutes', group: 'شریک انبار', name: 'پنهان‌سازی خودکار پس از قدیمی‌شدن همگام‌سازی', value: 30, unit: 'دقیقه', desc: 'اگر دادهٔ شریک قدیمی‌تر از این شود، کالاهای انبار مهاباد موقتاً ناموجود می‌شوند.', sensitive: false, usedIn: ['سلامت همگام‌سازی', 'کارنامهٔ شریک'], history: [] },
    { key: 'vat_percent', group: 'پرداخت', name: 'نرخ مالیات و عوارض ارزش افزوده', value: 0, unit: 'درصد', desc: 'صفر یعنی روی فاکتور «طبق نرخ مصوب» چاپ شود؛ با وارد کردن نرخ، مبلغ محاسبه می‌شود.', sensitive: true, usedIn: ['فاکتور رسمی و عادی', 'گزارش سامانهٔ مودیان', 'صورت سود و زیان'], history: [] },
    { key: 'review_gift', group: 'مشوق‌ها', name: 'هدیهٔ ثبت دیدگاه', value: 200000, unit: 'تومان', desc: 'پس از پایان مهلت مرجوعی به کیف پول واریز می‌شود.', sensitive: false, usedIn: ['پنل مشتری › دیدگاه‌ها', 'پیامک درخواست دیدگاه'], history: [] },
    { key: 'otp_seconds', group: 'حساب و امنیت', name: 'اعتبار کد یک‌بارمصرف', value: 120, unit: 'ثانیه', desc: 'کد ورود همیشه با پیامک ارسال می‌شود.', sensitive: false, usedIn: ['صفحهٔ ورود سایت', 'ورود پنل'], history: [] },
  ],
  roleDefs: structuredClone(BASE_ROLES),
  people: makePeople(), peopleCfg: makePeopleConfig(), vault: makeVault(), opts: makeOptions(), axes: makeAxes(), orderEvents: makeOrderEvents(), contentQueue: makeContentQueue(), blog: makeBlog(), planner: makePlanner(), traffic: makeTraffic(), storeCfg: makeStoreCfg(), reviewMeta: makeReviewMeta(), questions: makeQuestions(), reasonPresets: makeReasonPresets(), acct: makeAcct(), partners: makePartners(), network: makeNetwork(), lots: makeLots(), nudges: makeNudges(), calls: makeCalls(), remote: makeRemote(), incoming: makeIncoming(), merch: makeMerch(), agents: makeAgents(), stock: makeStock(), priceLog: [] as PricePoint[], media: [] as MediaItem[], buyList: [] as BuyItem[], extReviews: {} as Record<string, { id: string; author: string; rating: number; text: string; textFa: string; date: string; country: string; verified: boolean; show: boolean }[]>,
  // دسترسی اختصاصی هر عضو: ماژول‌های افزوده یا گرفته‌شده نسبت به نقش او
  access: { u5: { add: ['conversations'], remove: [] } } as Record<string, { add: string[]; remove: string[] }>,
  team: [
    { id: 'u1', name: 'بهشاد', role: 'super', phone: '09000000001', status: 'آنلاین', twoFA: true },
    { id: 'u2', name: 'نیما', role: 'ops', phone: '09000000002', status: 'آنلاین', twoFA: true },
    { id: 'u3', name: 'آرش', role: 'simple', phone: '09000000003', status: 'آنلاین', twoFA: false },
    { id: 'u4', name: 'یاسین', role: 'cofounder', phone: '09000000004', status: 'آفلاین', twoFA: false },
    { id: 'u5', name: 'سارا', role: 'support', phone: '09000000005', status: 'آنلاین', twoFA: true },
    { id: 'u6', name: 'مریم', role: 'finance', phone: '09000000006', status: 'استراحت', twoFA: true },
    { id: 'u7', name: 'پویا', role: 'growth', phone: '09000000007', status: 'آنلاین', twoFA: true },
    { id: 'u8', name: 'هستی', role: 'qc', phone: '09000000008', status: 'آنلاین', twoFA: false },
    { id: 'u9', name: 'دستیار بهشاد', role: 'assistant', phone: '09000000009', status: 'آنلاین', twoFA: true },
  ],
  // مجوزهای سه‌حالته برای هر فرد (بخش ۲.۳): allow | approve | deny + سقف اختیاری
  perms: {
    u3: { 'افزودن و انتشار کالا': { mode: 'allow' }, 'تغییر قیمت': { mode: 'allow' }, 'تغییر موجودی': { mode: 'allow' }, 'تأیید سفارش': { mode: 'allow' }, 'بسته‌بندی و تحویل پیک یا پست': { mode: 'allow' }, 'چاپ برچسب و فاکتور': { mode: 'allow' }, 'پاسخ به پشتیبانی': { mode: 'allow' }, 'ثبت سفارش تلفنی': { mode: 'allow' }, 'دریافت مرجوعی': { mode: 'allow' }, 'تأیید دیدگاه': { mode: 'allow' }, 'لغو سفارش': { mode: 'allow' }, 'بازگشت وجه': { mode: 'approve' }, 'حذف دائمی': { mode: 'approve' }, 'دیدن شمارهٔ مشتری': { mode: 'allow' } },
    u4: { 'تغییر موجودی انبار خودم': { mode: 'allow' }, 'انتشار کالای جدید': { mode: 'approve' }, 'ویرایش محتوای کالا': { mode: 'approve' }, 'دیدن قیمت فروش نهایی': { mode: 'deny' }, 'ثبت کد رهگیری': { mode: 'allow' }, 'اعلام «ندارم»': { mode: 'allow' } },
  } as Record<string, Record<string, { mode: 'allow' | 'approve' | 'deny'; cap?: number }>>,
  audit: [
    { at: ago(8), who: 'نیما', action: 'تغییر وضعیت مرسوله', target: 'GH-10479-1', before: 'در حال جمع‌آوری', after: 'بسته‌بندی‌شده', ai: false },
    { at: ago(31), who: 'دستیار غنیمت', action: 'پیش‌نویس پاسخ تیکت', target: 'TK-482044', before: '-', after: 'پذیرفته شد', ai: true },
    { at: ago(55), who: 'مریم', action: 'درخواست بازگشت وجه', target: 'RT-300398', before: '-', after: '۳۸٬۵۰۰٬۰۰۰ تومان', ai: false },
    { at: ago(60 * 3), who: 'بهشاد', action: 'مشاهدهٔ دادهٔ حساس', target: 'شمارهٔ موبایل c1', before: '-', after: '-', ai: false },
    { at: ago(60 * 5), who: 'یاسین', action: 'تغییر موجودی', target: 'Kindle Paperwhite / انبار مهاباد', before: '۹', after: '۷', ai: false },
  ] as AuditEntry[],
  alerts: [
    { id: 'al1', cat: 'مالی', tone: 'danger', title: 'تارا پاسخ نمی‌دهد', body: 'درگاه اقساطی تارا خودکار از صفحهٔ پرداخت پنهان شد. پرداخت‌ها از سایر درگاه‌ها ادامه دارد.', to: '/admin/finance?tab=gateways', at: ago(9), read: false },
    { id: 'al2', cat: 'عملیات', tone: 'warning', title: 'تأیید موجودی شریک رو به پایان است', body: 'مرسولهٔ GH-10479-2 تا ۳۵ دقیقهٔ دیگر تأیید نشود، به جریان تصمیم مشتری می‌رود.', to: '/admin/orders/GH-10479', at: ago(14), read: false },
    { id: 'al3', cat: 'موجودی', tone: 'warning', title: 'ناهماهنگی موجودی انبار مهاباد', body: 'Kindle Paperwhite: غنیمت ۷، سایت شریک ۵.', to: '/admin/warehouse?tab=sync', at: ago(40), read: false },
    { id: 'al4', cat: 'سیستم', tone: 'warning', title: 'اعتبار پنل پیامک ۹ روز دیگر تمام می‌شود', body: 'مصرف روزانه ۴۱۰ هزار تومان است.', to: '/admin/infra', at: ago(60 * 2), read: true },
    { id: 'al5', cat: 'ناهنجاری داده', tone: 'info', title: 'نرخ تبدیل ترب ۱۸٪ بالاتر از معمول', body: 'دلیل اصلی: جایگاه اول قیمت در ۳ کالای پربازدید.', to: '/admin/channels', at: ago(60 * 4), read: true },
  ],
  // صف تأیید کالاهای شریک و ناهماهنگی‌ها (بخش ۶.۲۷)
  partnerQueue: [
    { id: 'PQ-31', productId: 'p8', kind: 'کالای جدید', status: 'product.pending', note: 'با لینک ثبت شده است.', at: ago(60 * 6) },
    { id: 'PQ-30', productId: 'p7', kind: 'تغییر عنوان و عکس', status: 'product.needs_fix', note: 'عکس واترمارک سایت دیگر دارد.', at: ago(60 * 28) },
  ],
  syncIssues: [
    { id: 'SY-1', product: 'Kindle Paperwhite', ours: 7, theirs: 5, source: 'سایت اول شریک', at: ago(40) },
    { id: 'SY-2', product: 'Sony WH-1000XM5 جعبه‌باز', ours: 1, theirs: 0, source: 'سایت دوم شریک', at: ago(75) },
  ],
  // تنظیمات مشتری‌دید و Feature Flag
  flags: { shopAssistant: true, compare: true, wallet: true, storeFinder: false, aiSummary: true, referral: true, sellerLink: false, showSoon: true, maintenance: false, mahabadSales: true } as Record<string, boolean>,
  notifMatrix: {} as Record<string, boolean>,
  cardBadges: [
    { id: 'fast', label: 'تحویل {مدت_تحویل_سریع} ساعته', rule: 'انبار تهران + کلاس عادی + قبل از ساعت قطع', on: true, rotate: false },
    { id: 'low', label: 'موجودی محدود', rule: 'موجودی ≤ آستانهٔ «موجودی محدود»', on: true, rotate: true },
    { id: 'origin', label: 'خریداری‌شده از آمازون', rule: 'منبع تأمین واحد = انبارگردانی آمازون', on: true, rotate: true },
    { id: 'bnpl', label: 'پرداخت {تعداد_اقساط} قسطه {سرویس_اقساطی_پیش‌فرض}', rule: 'واجد شرایط اقساط + سرویس پیش‌فرض فعال', on: true, rotate: true },
    { id: 'hot', label: 'پرفروش', rule: '۱۰ فروش در ۷ روز اخیر', on: true, rotate: false },
  ],
  simpleDay: { started: false, done: [] as string[] },
  // اطلاعات فروشنده و انبارها: منبع همهٔ اسناد چاپی (فاکتور، برچسب پستی، کارت گارانتی). مقدارها فرضی‌اند و از «تنظیمات › فروشنده و انبارها» عوض می‌شوند.
  seller: {
    legalName: 'شرکت غنیمت تجارت نوین (سهامی خاص)', brand: 'غنیمت', nationalId: '14000000000', regNo: '600000', economicCode: '411100000000',
    address: 'تهران، خیابان ولیعصر، خیابان نمونه، پلاک ۰، واحد ۰', postalCode: '1500000000', phone: '021-00000000', website: 'ghanimat.ir',
    seal: '' as string, signature: '' as string, assumed: true,
  },
  warehouses: [
    { id: 'tehran', name: 'انبار تهران', owner: 'غنیمت', province: 'تهران', city: 'تهران', district: 'منطقهٔ نمونه', street: 'خیابان اصلی نمونه', alley: 'کوچهٔ نمونه', plaque: '۰', postalCode: '1500000001', phone: '021-00000001', manager: 'نیما', services: 'تحویل سریع و ارسال پستی', assumed: true },
    { id: 'mahabad', name: 'انبار مهاباد', owner: 'شریک انبار مهاباد', province: 'آذربایجان غربی', city: 'مهاباد', district: 'محلهٔ نمونه', street: 'خیابان اصلی نمونه', alley: 'کوچهٔ نمونه', plaque: '۰', postalCode: '5900000001', phone: '044-00000001', manager: 'یاسین', services: 'فقط ارسال پستی', assumed: true },
  ],
  carrierLogos: { post: '', tipax: '' } as Record<string, string>,
  entities: { ...makeEntities(), ...makeCxEntities() },
  cx: makeCxSettings(),
  journey: makeJourney(),
  delivery: makeDelivery(),
  bank: makeBank(),
  pages: makePages(),
  pagesPublished: [] as ReturnType<typeof makePages>,
  theme: makeTheme(),
  hub: makeHub(),
  promos: makePromos(),
  pickups: makePickups(),
  gatewayHolds: [] as GatewayHold[],
  refunds: [] as Refund[],
  docOverrides: {} as Record<string, { html: string; at: string }>,
  newsletter: makeNewsletter(),
  articleBlocks: {} as Record<string, { id: string; t: string; v: string; href?: string; w?: number; h?: number }[]>,
  smsLog: [
    { id: 'sm1', to: '09123456789', customerId: 'c1', kind: 'وضعیت سفارش', ref: 'GH-10458', text: 'غنیمت: سفارش GH-10458 تحویل پیک شد. پیک: علی رضایی، پلاک ۲۲ ب ۳۴۵ ایران ۱۰. رصد: ghanimat.ir/t/10458', status: 'تحویل شد', at: ago(60 * 3) },
    { id: 'sm2', to: '09351234567', customerId: 'c2', kind: 'دریافت حضوری', ref: 'GH-10480', text: 'غنیمت: سفارش شما در شعبهٔ تهران آماده است. زمان مراجعه: فردا ساعت ۱۷ تا ۱۹.', status: 'تحویل شد', at: ago(60 * 5) },
    { id: 'sm3', to: '09120000003', customerId: 'c3', kind: 'کد ورود', ref: '', text: 'کد ورود شما به غنیمت: 52817', status: 'ارسال‌نشده (خطای اپراتور)', at: ago(60 * 9) },
  ] as { id: string; to: string; customerId?: string; kind: string; ref: string; text: string; status: string; at: string }[],
  settleDue: {} as Record<string, string>,
  settlements: { 'GH-10458': { amount: 29850000, at: '2026-10-26T10:00:00+03:30', ref: 'MLT-77120' }, 'GH-10412': { amount: 29205000, at: ago(60 * 24 * 27), ref: 'ZP-55021' } } as Record<string, { amount: number; at: string; ref: string }>,
  packagingCost: 25000,
  docSettings: {} as Record<string, { paper?: string; font?: number; margin?: number; footer?: string; seal?: boolean; hide?: string[]; accent?: string; style?: 'classic' | 'modern' | 'minimal' }>,
  docVersions: {} as Record<string, { at: string; by: string; opts: Record<string, unknown> }[]>,
  printLog: [] as { id: string; doc: string; label: string; ref: string; by: string; at: string; copy: number; paper: string }[],
  codeFormat: { product: 'GH-P-', unit: 'GH-U-', pDigits: 6, uDigits: 7, nextProduct: 110, nextUnit: 20480 },
  trash: [] as TrashItem[],
  reasons: [
    { id: 'rs1', kind: 'return', ref: 'RT-838745', status: 'رد مرجوعی', reason: 'سریال کالای برگشتی با واحد ارسالی مطابقت ندارد؛ عکس‌های پیش از ارسال پیوست شد.', visible: true, by: 'مریم', at: ago(60 * 30) },
    { id: 'rs2', kind: 'warranty', ref: 'GR-1840', status: 'نیازمند اصلاح یا مدارک', reason: 'برای بررسی، تصویر کالا و برچسب جعبه را پیوست کنید.', visible: true, by: 'نیما', at: ago(60 * 5) },
  ] as { id: string; kind: string; ref: string; status: string; reason: string; visible: boolean; by: string; at: string; editedAt?: string }[],
  site: makeSite(),
  sitePublished: makeSite(),
  siteVersions: [{ id: 'v1', at: ago(60 * 24 * 3), by: 'بهشاد', note: 'نسخهٔ اولیهٔ سایت' }] as { id: string; at: string; by: string; note: string; data?: ReturnType<typeof makeSite> }[],
  layout: makeLayout(),
  moves: [
    { id: 'mv1', at: ago(25), who: 'نیما', kind: 'ورود', unit: 'GU-20413', product: 'p1', from: 'رسید', to: 'QC-1', read: false },
    { id: 'mv2', at: ago(90), who: 'نیما', kind: 'جابه‌جایی', unit: 'GU-20412', product: 'p1', from: 'A-02', to: 'A-03', read: false },
    { id: 'mv3', at: ago(60 * 5), who: 'یاسین', kind: 'ورود', unit: '', product: 'p8', from: 'رسید', to: 'M-08', qty: 6, read: true },
    { id: 'mv4', at: ago(60 * 26), who: 'نیما', kind: 'خروج', unit: 'GU-20471', product: 'p2', from: 'B-01', to: 'بسته‌بندی', read: true },
  ] as { id: string; at: string; who: string; kind: string; unit: string; product: string; from: string; to: string; qty?: number; read: boolean }[],
})
/** سفارش‌های نمونهٔ شبکه‌های اجتماعی (دایرکت اینستاگرام، واتساپ، تلگرام، بله، تلفن، حضوری) با فاکتور و رسید کارت به کارت */
export const makeSeed = () => {
  const s = makeSeedBase(); const base = s.orders.find((o) => o.id === 'GH-10458') ?? s.orders[0]
  const rows: [string, string, string, string, string, string, number, string][] = [
    ['GH-10490', 'c2', 'اینستاگرام دایرکت', '@negar.amini', 'کارت به کارت', 'p2', 15000000, 'order.paid'],
    ['GH-10491', 'c3', 'واتساپ', '0912-000-0003', 'لینک پرداخت', 'p9', 1500000, 'order.awaiting_payment'],
    ['GH-10492', 'c5', 'تلگرام', '@mahsa_t', 'کارت به کارت', 'p4', 38900000, 'order.awaiting_payment'],
    ['GH-10493', 'c6', 'بله', '0935-000-0006', 'لینک پرداخت', 'p5', 21900000, 'order.preparing'],
    ['GH-10494', 'c7', 'تلفنی', '021-تماس ورودی', 'لینک پرداخت', 'p8', 8200000, 'order.shipped'],
    ['GH-10495', 'c1', 'حضوری در شعبه', 'شعبهٔ تهران', 'پرداخت حضوری (کارت‌خوان)', 'p9', 3000000, 'order.delivered'],
  ]
  rows.forEach(([id, cid, ch, handle, pay, pid, total, status], i) => {
    const o = structuredClone(base)
    Object.assign(o, { id, customerId: cid, channel: ch, pay, total, discount: 0, shippingFee: 0, status, buyer: 'person', legalId: undefined, invoiceNo: undefined, createdAt: new Date(Date.now() - (i + 1) * 95 * 6e4).toISOString(), tags: [ch, `شناسه: ${handle}`] })
    o.shipments = [{ ...structuredClone(base.shipments[0]), id: `${id}-1`, status: status === 'order.delivered' ? 'ship.delivered' : status === 'order.shipped' ? 'ship.in_transit' : 'ship.pending', method: ch === 'حضوری در شعبه' ? 'دریافت حضوری از شعبه' : 'پست پیشتاز', packPhotos: [], courier: null, sla: new Date(Date.now() + (status === 'order.delivered' ? -5 * 36e5 : (i * 55 + 35) * 6e4)).toISOString(), items: [{ productId: pid, unitId: '', qty: 1, price: total }] }]
    s.orders.unshift(o)
    s.txns.unshift({ ...s.txns[0], id: `TX-S${i}`, orderId: id, amount: total, gateway: pay, ref: '', status: ['order.awaiting_payment'].includes(status) ? 'pay.unknown' : 'pay.success', at: o.createdAt })
  })
  // ۴۸ سفارش نمونهٔ دیگر برای پوشش همهٔ حالت‌ها: هر وضعیت، روش ارسال، انبار، درگاه، کانال، خریدار و بازهٔ زمانی ۳۰ روزه
  { const ST: [string, string][] = [['order.awaiting_payment', 'ship.pending'], ['order.awaiting_credit', 'ship.pending'], ['order.paid', 'ship.pending'], ['order.suspicious', 'ship.pending'], ['order.preparing', 'ship.picking'], ['order.preparing', 'ship.packed'], ['order.shipped', 'ship.handed'], ['order.shipped', 'ship.in_transit'], ['order.pickup_ready', 'ship.pickup_ready'], ['order.delivered', 'ship.delivered'], ['order.delivered', 'ship.delivered'], ['order.cancelled', 'ship.cancelled'], ['order.returned', 'ship.delivered'], ['order.delivered', 'ship.delivered']]
    const PAY = ['زرین‌پال', 'درگاه ملت', 'اسنپ‌پی (۴ قسط)', 'ترب‌پی', 'دیجی‌پی', 'کیف پول', 'کارت به کارت', 'کیف پول + زرین‌پال', 'درگاه سامان']
    const CH = ['سایت', 'سایت', 'سایت', 'اپلیکیشن', 'اینستاگرام دایرکت', 'تلگرام', 'واتساپ', 'تلفنی', 'ترب', 'باسلام', 'حضوری در شعبه']
    const M: [string, string, number][] = [['تحویل سریع (پیک)', 'tehran', 185000], ['پست پیشتاز', 'tehran', 90000], ['پست پیشتاز', 'mahabad', 90000], ['تیپاکس', 'tehran', 140000], ['باربری', 'mahabad', 450000], ['دریافت حضوری از شعبه', 'tehran', 0]]
    const COUR = [['حمید زارعی', 'موتور ۸۷۶-۴۵۲۱۳'], ['رضا احمدی', 'موتور ۱۲۳-۴۵۶۷۸'], ['مجید کریمی', 'سواری ۲۴ ب ۳۶۵ ایران ۱۱']]
    const pub = s.products.filter((p) => p.status === 'product.published')
    for (let i = 0; i < 48; i++) {
      const [os, ss] = ST[i % ST.length]; const pay = PAY[(i * 5) % PAY.length]; const ch = CH[(i * 7) % CH.length]; const [meth, wh, fee] = ch === 'حضوری در شعبه' ? M[5] : M[(i * 3) % 5]
      const p1 = pub[i % pub.length]; const p2 = i % 4 === 0 ? pub[(i + 3) % pub.length] : null; const pr = (p: typeof p1) => p.price || p.priceNew || 5000000
      const items = [{ productId: p1.id, unitId: '', qty: i % 6 === 0 ? 2 : 1, price: pr(p1) }, ...(p2 ? [{ productId: p2.id, unitId: '', qty: 1, price: pr(p2) }] : [])]
      const sub = items.reduce((a, it) => a + it.price * it.qty, 0); const disc = i % 5 === 0 ? Math.round(sub * 0.05 / 10000) * 10000 : 0
      const created = new Date(Date.now() - ((i * 13 + 2) % 720) * 36e5 - i * 7 * 6e4).toISOString(); const id = `GH-${10300 + i}`
      const o = structuredClone(base)
      Object.assign(o, { id, customerId: `c${(i % 9) + 1}`, channel: ch, pay, total: sub + fee - disc, discount: disc, shippingFee: fee, status: os, buyer: i % 9 === 4 ? 'legal' : 'person', legalId: undefined, invoiceNo: undefined, decision: undefined, cancelInfo: undefined, notes: [], createdAt: created, deliveredAt: os === 'order.delivered' ? new Date(+new Date(created) + 2 * 864e5).toISOString() : undefined, tags: i % 8 === 0 ? ['VIP'] : i % 11 === 0 ? ['هدیه'] : [], risk: os === 'order.suspicious' ? 78 : (i * 17) % 40, margin: 6 + (i % 9) })
      const fast = /پیک/.test(meth); const post = /پست|تیپاکس|باربری/.test(meth); const sent = ['ship.handed', 'ship.in_transit', 'ship.delivered'].includes(ss)
      o.shipments = [{ ...structuredClone(base.shipments[0]), id: `${id}-1`, warehouse: wh, method: meth, shipFee: fee, status: ss, items, packPhotos: sent ? [{ at: created, by: 'آرش', src: `./products/${p1.id}-500.webp` }] : [], allocReason: wh === 'tehran' ? 'موجودی تهران کافی بود.' : 'فقط در انبار مهاباد موجود بود.',
        courier: fast && sent ? { name: COUR[i % 3][0], phone: '09120000000', plate: COUR[i % 3][1], vehicle: COUR[i % 3][1].startsWith('موتور') ? 'موتور' : 'سواری', eta: 25, code: `SB-${80000 + i}`, cost: 160000 } : null,
        tracking: post && sent ? (/تیپاکس/.test(meth) ? String(30000000000 + i * 7919) : `1204${String(59870001245789632155 + i).slice(0, 20)}`) : '', sla: new Date(Date.now() + ((i % 7) - 3) * 6 * 36e5).toISOString() }]
      if (os === 'order.cancelled') o.cancelInfo = { by: i % 2 ? 'مشتری' : 'غنیمت', reason: i % 2 ? 'از خرید منصرف شدم' : 'کالا در انبار ناموجود شد', at: created, amount: o.total, to: 'کیف پول', refund: 'بازگشت داده شد', refundAt: created }
      s.orders.push(o)
      s.txns.push({ ...s.txns[0], id: `TX-G${i}`, orderId: id, amount: o.total, gateway: pay, ref: /اسنپ|ترب|دیجی/.test(pay) ? `SP-${7700000 + i}` : String(48120000000 + i * 911), status: os === 'order.awaiting_payment' ? (i % 2 ? 'pay.unknown' : 'pay.failed') : os === 'order.cancelled' ? 'pay.refunded' : 'pay.success', at: created })
    }
  }
  // هر سفارش پرداخت‌شده‌ای که تراکنش ندارد، تراکنش درگاه خودش را می‌گیرد (پاسخ درگاه برای همهٔ پرداخت‌ها ذخیره می‌شود)
  s.orders.forEach((o, i) => { if (s.txns.some((t) => t.orderId === o.id)) return
    const st = o.status === 'order.awaiting_payment' ? 'pay.unknown' : o.status === 'order.cancelled' ? 'pay.refunded' : 'pay.success'
    s.txns.push({ ...s.txns[0], id: `TX-F${i}`, orderId: o.id, amount: o.total, gateway: /حضوری|کارت‌خوان/.test(o.pay) ? 'کارت‌خوان شعبه' : o.pay, ref: /اسنپ|ترب|دیجی/.test(o.pay) ? `SP-${7600000 + i}` : String(48110000000 + i * 733), status: st, at: o.createdAt }) })
  const cr = s.bank.credits.find((c) => c.id === 'CR-1'); if (cr) cr.matched = 'GH-10490'
  // سفارش اقساطی در انتظار تأیید اعتبار (فیگما: «در انتظار اعتبار اسنپ‌پی»)
  { const o = structuredClone(base); Object.assign(o, { id: 'GH-10498', customerId: 'c7', channel: 'سایت', pay: 'اسنپ‌پی (۴ قسط)', total: 31000000, discount: 0, status: 'order.awaiting_credit', buyer: 'person', legalId: undefined, invoiceNo: undefined, decision: undefined, createdAt: new Date(Date.now() - 25 * 6e4).toISOString(), tags: ['اقساطی'] }); o.shipments = [{ ...structuredClone(base.shipments[0]), id: 'GH-10498-1', status: 'ship.pending', courier: null, packPhotos: [] }]; s.orders.unshift(o) }
  // پیوست نمونه در تیکت: عکس جعبهٔ مشتری و پیام صوتی
  { const t = s.tickets.find((x) => x.id === 'TK-482106'); if (t) { t.messages[0].atts = [{ kind: 'image', src: './products/p2-500.webp', name: 'جعبه-باز-شده.jpg', size: 412000 }, { kind: 'voice', src: '', name: 'پیام صوتی', dur: 14 }] } }
  // سفارش سایتی با دریافت حضوری که آماده شده و مشتری هنوز نیامده است
  { const o = structuredClone(base); Object.assign(o, { id: 'GH-10497', customerId: 'c2', channel: 'سایت', pay: 'زرین‌پال', total: 32900000, discount: 0, shippingFee: 0, status: 'order.pickup_ready', buyer: 'person', legalId: undefined, invoiceNo: undefined, createdAt: new Date(Date.now() - 7 * 36e5).toISOString(), tags: ['دریافت حضوری'] })
    o.shipments = [{ ...structuredClone(base.shipments[0]), id: 'GH-10497-1', warehouse: 'tehran', method: 'دریافت حضوری از شعبه', status: 'ship.pickup_ready', sla: new Date(Date.now() + 70 * 36e5).toISOString(), packPhotos: [{ src: './products/p6-500.webp', at: new Date(Date.now() - 3 * 36e5).toISOString(), by: 'آرش' }], courier: null, tracking: '', allocReason: 'مشتری دریافت حضوری از شعبهٔ تهران را انتخاب کرد.', items: [{ productId: 'p6', unitId: '', qty: 1, price: 32900000 }] }]
    s.orders.unshift(o); s.txns.unshift({ ...s.txns[0], id: 'TX-S97', orderId: 'GH-10497', amount: 32900000, gateway: 'زرین‌پال', ref: '48120117745', status: 'pay.success', at: o.createdAt }) }
  // توضیح مشتری هنگام پرداخت و درخواست تلفنی نمونه
  { const set = (id: string, note: string) => { const o = s.orders.find((x) => x.id === id); if (o) o.customerNote = note }
    set('GH-10493', 'لطفاً قبل از ارسال زنگ نزنید؛ پیامک بدهید. ساعت ۹ تا ۱۳ خانه نیستم.')
    set('GH-10479', 'کادوست؛ فاکتور قیمت داخل بسته نگذارید.')
    const o = s.orders.find((x) => x.id === 'GH-10481'); if (o) o.notes = [{ id: 'n1', at: new Date(Date.now() - 40 * 6e4).toISOString(), by: 'سارا', src: 'تماس تلفنی', text: 'مشتری تماس گرفت: رنگ قاب را مشکی کنید (به‌جای نقره‌ای)، اگر موجود است.', act: true }] }
  // سابقهٔ چاپ نمونه برای بایگانی اسناد
  { const who = ['سارا', 'نیما', 'پویا']; s.orders.slice(0, 14).forEach((o, i) => { s.printLog.push({ id: `PL-${900 + i * 3}`, doc: 'invoice', label: 'فاکتور فروش (حقیقی و حقوقی)', ref: o.id, by: who[i % 3], at: new Date(new Date(o.createdAt).getTime() + 25 * 6e4).toISOString(), copy: 1, paper: 'A4' }); o.shipments.forEach((sh, k) => { if (/پست|تیپاکس/.test(sh.method)) s.printLog.push({ id: `PL-${901 + i * 3 + k}`, doc: 'post', label: 'برچسب مرسولهٔ پستی (قانون پست: A5 افقی)', ref: sh.id, by: who[(i + 1) % 3], at: new Date(new Date(o.createdAt).getTime() + 70 * 6e4).toISOString(), copy: 1, paper: '100x150' }) }) }); s.printLog.sort((a, b) => b.at.localeCompare(a.at)) }
  // صفحهٔ از پیش ساخته‌شدهٔ کالای در راه (محمولهٔ آمازون)
  { const p1 = s.products.find((x) => x.id === 'p1')!
    s.products.push({ ...structuredClone(p1), id: 'pin1', title: 'هدفون بی‌سیم اپل AirPods Pro 2 با درگاه USB-C', en: 'AirPods Pro 2 USB-C', brand: 'اپل', category: 'هدفون', status: 'product.incoming', mode: 'qty', qty: { tehran: 0, mahabad: 0 }, priceNew: 14900000, price: 13900000, compareAt: undefined, rating: 0, reviews: 0, views: 0, cvr: 0, health: 70, seller: 'غنیمت', comingSoon: new Date(Date.now() + 20 * 864e5).toISOString(), incoming: 'IN-1405-08', ean: '', code: '', pdp: { ...(p1.pdp ?? {}), amazonUrl: 'https://www.amazon.com/dp/B0CHWRXH8B' } as any }) }
  // سفارش‌های شهری شعبهٔ مهاباد: ارسال سریع با پیک و دریافت حضوری از شعبه
  { const c2 = s.customers.find((x) => x.id === 'c2')!
    s.customers.push({ ...structuredClone(c2), id: 'c8', name: 'هیمن رسولی', mobile: '09141239876', city: 'مهاباد', email: '', orders: 3, ltv: 96000000, segment: 'وفادار', source: 'اینستاگرام', addr: { ...c2.addr, province: 'آذربایجان غربی', city: 'مهاباد', district: 'محلهٔ تپه‌قاضی', street: 'خیابان جمهوری' } })
    s.customers.push({ ...structuredClone(c2), id: 'c9', name: 'شیلان کریمی', mobile: '09149876543', city: 'بوکان', email: '', orders: 1, ltv: 24500000, segment: 'جدید', source: 'مستقیم', addr: { ...c2.addr, province: 'آذربایجان غربی', city: 'بوکان', district: 'مرکز شهر', street: 'خیابان انقلاب' } })
    const mk = (id: string, cid: string, minsAgo: number, ship: Partial<Shipment>, total: number, tags: string[]) => { const o = structuredClone(base); Object.assign(o, { id, customerId: cid, channel: 'سایت', pay: 'زرین‌پال', total, discount: 0, status: 'order.preparing', buyer: 'person', legalId: undefined, invoiceNo: undefined, createdAt: new Date(Date.now() - minsAgo * 6e4).toISOString(), tags }); o.shipments = [{ ...structuredClone(base.shipments[0]), courier: null, tracking: '', packPhotos: [], allocReason: 'نزدیک‌ترین انبار به مشتری: مهاباد', ...ship } as Shipment]; s.orders.unshift(o) }
    mk('GH-10501', 'c8', 25, { id: 'GH-10501-1', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.partner_confirm', sla: new Date(Date.now() + 26 * 36e5).toISOString(), items: [{ productId: 'p2', unitId: 'GU-20472', qty: 1, price: 15500000 }], shipFee: 85000 }, 15585000, ['پست پیشتاز'])
    mk('GH-10502', 'c9', 70, { id: 'GH-10502-1', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.picking', sla: new Date(Date.now() + 30 * 36e5).toISOString(), items: [{ productId: 'p1', unitId: 'GU-20414', qty: 1, price: 129900000 }], shipFee: 85000 }, 129985000, ['پست پیشتاز'])
    mk('GH-10503', 'c8', 180, { id: 'GH-10503-1', warehouse: 'mahabad', method: 'دریافت حضوری از شعبه', status: 'ship.packed', sla: new Date(Date.now() + 6 * 36e5).toISOString(), items: [{ productId: 'p7', unitId: 'GU-20450', qty: 1, price: 74900000 }] }, 74900000, ['دریافت حضوری']) }
  // محتوای نمونهٔ صفحهٔ کالا (برای سنجش آمادگی محتوا): برخی کامل، برخی ناقص
  const C: Record<string, [string, string, string, string]> = { p1: ['آیفون ۱۶ پرو اصل با گارانتی غنیمت، آنلاک و تست‌شده.', 'بدنهٔ تیتانیومی، تراشهٔ A18 Pro و دوربین ۴۸ مگاپیکسلی؛ هر واحد پیش از ارسال دو مرحله کنترل کیفیت می‌شود.', 'تیتانیوم · A18 Pro · ۴۸MP', 'گوشی، کابل USB-C، دفترچه'], p2: ['هدست AirPods Max ۲۰۲۴ با حذف نویز فعال.', 'نسخهٔ USB-C با صدای فضایی و ۲۰ ساعت باتری.', 'حذف نویز · صدای فضایی · USB-C', 'هدست، کیف هوشمند، کابل'], p4: ['ساعت Apple Watch سری ۱۰ با صفحهٔ بزرگ‌تر.', '', 'صفحهٔ ۴۶ میلی‌متری · سنسور دما', ''], p5: ['هدفون سونی WH-1000XM5 با بهترین حذف نویز.', 'هشت میکروفون و پردازندهٔ V1؛ ۳۰ ساعت باتری و شارژ سریع.', 'حذف نویز · ۳۰ ساعت · LDAC', 'هدفون، کیف، کابل'], p7: ['گلکسی S24 Ultra با قلم S Pen.', '', '', ''] }
  Object.entries(C).forEach(([id, [sh, lo, kf, bx]]) => { const p = s.products.find((x) => x.id === id); if (p) Object.assign(p, { short: sh, long: lo, keyFeatures: kf, box: bx, specs: lo ? { 'گارانتی': 'غنیمت', 'وضعیت': 'تست‌شده' } : undefined }) })
  const p1 = s.products.find((x) => x.id === 'p1'); if (p1?.pdp) p1.pdp.videos = [{ kind: 'ویدیوی بررسی', url: 'https://www.aparat.com/v/sample' }]
  // تنوع‌های نمونه: هر تنوع یک کالای جدا (SKU) در یک گروه است و واحدهایش بارکد خودشان را دارند
  const V: [string, string, string, Record<string, string>][] = [['p1', 'iphone-16-pro', 'تیتانیوم طبیعی · ۲۵۶ گیگابایت', { color: 'titanium', storage: '256' }], ['p5', 'sony-wh1000xm5', 'مشکی', { color: 'black' }], ['p4', 'apple-watch-s10', 'نقره‌ای · ۴۶ میلی‌متر · آلومینیوم', { color: 'silver', size: '46', material: 'alu' }], ['p7', 's24-ultra', 'خاکستری · ۵۱۲ گیگابایت', { color: 'gray', storage: '512' }]]
  V.forEach(([id, g, l, v]) => { const p = s.products.find((x) => x.id === id); if (p) p.pdp = { videos: [], flaws: [], importRoute: 'آمازون خاورمیانه', covered: '', notCovered: '', ...(p.pdp ?? {}), variantGroup: g, variantLabel: l, variant: v } })
  const p5 = s.products.find((x) => x.id === 'p5'); if (p5) s.products.splice(s.products.indexOf(p5) + 1, 0, { ...structuredClone(p5), id: 'p5w', title: 'هدفون سونی WH-1000XM5 سفید', code: 'GH-P-0051', mode: 'qty', qty: { tehran: 0, mahabad: 0 }, pdp: { ...structuredClone(p5.pdp!), variantLabel: 'سفید', variant: { color: 'white' } } })
  s.bank.receipts.unshift(
    { id: 'RC-310', orderId: 'GH-10490', customer: 'نگار امینی', amount: 15000000, last4: '4410', ref: '784512', time: '14:20', channel: 'اینستاگرام دایرکت', status: 'تطبیق شد', note: 'CR-1', at: s.orders[5].createdAt },
    { id: 'RC-311', orderId: 'GH-10492', customer: 'مهسا توکلی', amount: 38900000, last4: '2290', ref: '553311', time: '16:45', channel: 'تلگرام', status: 'در انتظار تطبیق', note: '', at: s.orders[3].createdAt },
  )
  // تاریخچهٔ قیمت ۱۲ ماه (نمودار قیمت صفحهٔ کالا) و مسیر واردات و QC نمونه
  s.products.forEach((p, k) => { const now = p.price ?? s.units.find((u) => u.productId === p.id && u.price > 0)?.price ?? 0; if (!now) return
    for (let m = 11; m >= 0; m--) { const w = Math.sin((k + 1) * 1.7 + m * 0.9) * 0.045 + (m > 6 ? 0.05 : m > 3 ? 0.025 : 0); s.priceLog.push({ pid: p.id, at: new Date(Date.now() - m * 30 * 864e5 - (k % 5) * 864e5).toISOString(), price: Math.round(now * (1 + (m ? w : 0)) / 100000) * 100000, by: m ? 'سارا' : 'سیستم' }) } })
  { const fx: Record<string, [string, number, number, number]> = { p1: ['دلار', 1520, 58200, 4500000], p2: ['درهم', 790, 16100, 900000], p5: ['دینار', 400000, 45, 1200000] }
    Object.entries(fx).forEach(([id, [c, amt, r, ex]]) => { const p = s.products.find((x) => x.id === id); if (p) Object.assign(p, { currency: c, costFx: amt, rate: r, extraCost: ex }) }) }
  { const p1 = s.products.find((x) => x.id === 'p1'); if (p1?.pdp) Object.assign(p1.pdp, { showPriceChart: true, similar: ['p7'], route: { origin: 'amazon', store: 'Amazon.com', seller: 'Amazon.com', boughtAt: new Date(Date.now() - 76 * 864e5).toISOString(), inbound: 'tehran', inAt: new Date(Date.now() - 60 * 864e5).toISOString(), invoice: 'invoice-112-4417.pdf', invoiceOk: true }, qc: { 'بررسی اولیهٔ کارکرد و اصالت': true, 'بررسی سلامت پلمپ': true, 'تطبیق اصالت کالا': true, 'عکاسی واقعی از همین کالا': true, 'تخصیص گارانتی بر اساس دستهٔ کالا': true, 'روشن‌کردن و تست عملکرد پایه': true } })
    const p2 = s.products.find((x) => x.id === 'p2'); if (p2?.pdp) Object.assign(p2.pdp, { route: { origin: 'store', store: 'Sharaf DG (اربیل)', seller: 'Sharaf DG', boughtAt: new Date(Date.now() - 40 * 864e5).toISOString(), inbound: 'baneh', inAt: new Date(Date.now() - 31 * 864e5).toISOString(), transferAt: new Date(Date.now() - 24 * 864e5).toISOString() } }) }
  // کالای متغیر نمونه (الگوی ووکامرس): یک مدل هدفون در سه رنگ با موجودی، قیمت و تصویر جدا
  { const p5 = s.products.find((x) => x.id === 'p5')!; const vv = (id: string, color: string, suffix: string, t: number, m: number, extra: Partial<Variation> = {}): Variation => ({ id, opts: { color }, suffix, qty: { tehran: t, mahabad: m }, enabled: true, ...extra })
    s.products.splice(s.products.indexOf(p5) + 2, 0, { ...structuredClone(p5), id: 'psn', code: 'GH-P-000190', title: 'هدفون بی‌سیم سونی WH-CH720N', en: 'Sony WH-CH720N', mode: 'qty', kind: 'variable', priceNew: 7900000, price: 6900000, compareAt: undefined, image: './products/p5-500.webp', images: ['./products/p5-500.webp', './products/p2-500.webp'], rating: 4.4, reviews: 12, views: 1240, health: 82, pdp: { ...structuredClone(p5.pdp!), variantGroup: '', variantLabel: '', variant: {} },
      attrs: [{ axis: 'color', values: ['blue', 'yellow', 'black'], forVar: true, visible: true }, { axis: 'material', values: ['fabric'], forVar: false, visible: true }],
      variations: [vv('var-psn-1', 'blue', '1', 3, 1), vv('var-psn-2', 'yellow', '2', 0, 3, { costFx: 320, price: 7200000, image: './products/p2-500.webp', low: 2 }), vv('var-psn-3', 'black', '3', 4, 1, { sale: 6500000, image: './products/p5-500.webp', ean: '4548736143654' })], defaultVar: 'var-psn-3', qty: { tehran: 7, mahabad: 5 }, currency: 'درهم', costFx: 290, rate: 16100, extraCost: 650000 }) }
  // کالای متغیر با مالکیت چندگانه: ۸۵ هدفون ریمکس Dragon؛ ۵۰ عدد مال غنیمت (۴۰ تهران، ۱۰ مهاباد) و ۳۵ عدد مال یاسین در مهاباد
  { const p9 = s.products.find((x) => x.id === 'psn')!; const fromLots = (vid: string, wh: 'tehran' | 'mahabad') => s.stock.lots.filter((l) => l.variationId === vid && l.warehouse === wh).reduce((a, l) => a + l.qty, 0)
    const v = (id: string, color: string, suffix: string): Variation => ({ id, opts: { color }, suffix, qty: { tehran: fromLots(id, 'tehran'), mahabad: fromLots(id, 'mahabad') }, enabled: true })
    const prx = { ...structuredClone(p9), id: 'prx', code: 'GH-P-000201', title: 'هدفون بی‌سیم ریمکس Dragon', en: 'Remax Dragon Wireless Headphone', brand: 'ریمکس', priceNew: 2900000, price: 2900000, cost: 1600000, image: '', images: [], rating: 4.3, reviews: 9, views: 860, health: 76, seller: 'غنیمت', currency: 'تومان', costFx: undefined, rate: undefined, extraCost: undefined,
      attrs: [{ axis: 'color', values: ['black', 'white'], forVar: true, visible: true }], variations: [v('var-prx-blk', 'black', '1'), v('var-prx-wht', 'white', '2')], defaultVar: 'var-prx-blk' } as Product
    prx.qty = { tehran: prx.variations!.reduce((a, x) => a + x.qty.tehran, 0), mahabad: prx.variations!.reduce((a, x) => a + x.qty.mahabad, 0) }
    s.products.splice(s.products.indexOf(p9) + 1, 0, prx)
    const base = s.orders.find((o) => o.id === 'GH-10480')!; const m = (x: number) => new Date(Date.now() + x * 6e4).toISOString()
    const mk = (id: string, cid: string, wh: string, items: Shipment['items'], ago: number): Order => ({ ...structuredClone(base), id, customerId: cid, createdAt: new Date(Date.now() - ago * 6e4).toISOString(), status: 'order.preparing', pay: 'زرین‌پال', channel: 'سایت', tags: ['بسته‌بندی با اسکن'], total: items.reduce((a, x) => a + x.price * x.qty, 0), fee: 0, risk: 6, edits: undefined, payHold: undefined,
      shipments: [{ id: `${id}-1`, warehouse: wh, method: 'پست پیشتاز', status: 'ship.picking', sla: m(240), items, courier: null, tracking: '', allocReason: wh === 'mahabad' ? 'رنگ سفید فقط در انبار مهاباد کافی بود.' : 'موجودی تهران کافی بود.' }] })
    s.orders.unshift(
      mk('GH-10511', 'c2', 'mahabad', [{ productId: 'prx', unitId: '', qty: 2, price: 2900000, variationId: 'var-prx-blk' }, { productId: 'prx', unitId: '', qty: 1, price: 2900000, variationId: 'var-prx-wht' }], 25),
      mk('GH-10510', 'c5', 'tehran', [{ productId: 'prx', unitId: '', qty: 1, price: 2900000, variationId: 'var-prx-wht' }, { productId: 'prx', unitId: '', qty: 1, price: 2900000, variationId: 'var-prx-blk' }], 40))
    s.txns.unshift(...['GH-10511', 'GH-10510'].map((oid, i) => ({ ...structuredClone(s.txns.find((t) => t.orderId === 'GH-10480') ?? s.txns[0]), id: `TX-PK${i + 1}`, orderId: oid, amount: s.orders.find((o) => o.id === oid)!.total, status: 'pay.success' }))) }
  // کالای متغیر با چند ویژگی: تنوع‌ها ممکن است در رنگ، حافظه، رم یا نسخهٔ منطقه فرق کنند؛ هر ترکیب یک کالای متمایز با کد خودش است
  { const base = s.products.find((x) => x.id === 'prx')!; const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
    const combos: [string, string, string, string, string, string][] = [['var-pga-1', 'green', '128', '8', 'me', '1'], ['var-pga-2', 'white', '128', '8', 'me', '2'], ['var-pga-3', 'white', '64', '4', 'me', '3'], ['var-pga-4', 'white', '128', '8', 'vn', '4']]
    const lots: [string, string, string, number][] = [['var-pga-1', 'gh', 'tehran', 4], ['var-pga-2', 'gh', 'tehran', 6], ['var-pga-3', 'gh', 'tehran', 3], ['var-pga-2', 'ys', 'mahabad', 3], ['var-pga-4', 'ys', 'mahabad', 5]]
    lots.forEach(([vid, owner, wh, qty], i) => s.stock.lots.push({ id: `L-2${i}1`, productId: 'pga', variationId: vid, owner, warehouse: wh, qty, cost: vid === 'var-pga-3' ? 17800000 : 21500000, at: ago(120 - i * 10), ref: owner === 'ys' ? 'خرید یاسین از اربیل' : 'IN-1405-08' }))
    const q = (vid: string, wh: string) => lots.filter((l) => l[0] === vid && l[2] === wh).reduce((a, l) => a + l[3], 0)
    const pga = { ...structuredClone(base), id: 'pga', code: 'GH-P-000202', title: 'گوشی سامسونگ Galaxy A55', en: 'Samsung Galaxy A55', brand: 'سامسونگ', category: 'موبایل', priceNew: 26900000, price: 26900000, cost: 21500000, image: '', images: [], rating: 4.5, reviews: 21, views: 2140, health: 81, seller: 'غنیمت',
      attrs: [{ axis: 'color', values: ['green', 'white'], forVar: true, visible: true }, { axis: 'storage', values: ['64', '128'], forVar: true, visible: true }, { axis: 'ram', values: ['4', '8'], forVar: true, visible: true }, { axis: 'region', values: ['me', 'vn'], forVar: true, visible: true }],
      variations: combos.map(([id, color, storage, ram, region, suffix]) => ({ id, opts: { color, storage, ram, region }, suffix, qty: { tehran: q(id, 'tehran'), mahabad: q(id, 'mahabad') }, enabled: true, price: storage === '64' ? 22900000 : region === 'vn' ? 25900000 : 26900000 })), defaultVar: 'var-pga-2' } as Product
    pga.qty = { tehran: pga.variations!.reduce((a, v) => a + v.qty.tehran, 0), mahabad: pga.variations!.reduce((a, v) => a + v.qty.mahabad, 0) }
    s.products.splice(s.products.indexOf(base) + 1, 0, pga)
    const o0 = s.orders.find((o) => o.id === 'GH-10510')!
    s.orders.unshift({ ...structuredClone(o0), id: 'GH-10512', customerId: 'c3', createdAt: ago(0.4), total: 26900000 + 26900000, tags: ['چند ویژگی'], shipments: [{ ...structuredClone(o0.shipments[0]), id: 'GH-10512-1', status: 'ship.picking', pack: undefined, items: [{ productId: 'pga', unitId: '', qty: 1, price: 26900000, variationId: 'var-pga-2' }, { productId: 'pga', unitId: '', qty: 1, price: 26900000, variationId: 'var-pga-1' }], allocReason: 'سفید ۱۲۸ و سبز ۱۲۸ نسخهٔ خاورمیانه در تهران موجود بود.' }] }) }
  // فروش‌های نمونهٔ سایت غنیمت در دفتر شرکا، سفارش واقعی خودشان را دارند تا از صورت‌حساب به سفارش رفت
  { const base = s.orders.find((o) => o.id === 'GH-10412')!; let n = 0
    s.stock.sales.filter((x) => x.channel === 'gh-site' && !x.orderId).forEach((x) => { n++; const id = `GH-${10519 + n}`; const shipId = `${id}-1`
      s.orders.push({ ...structuredClone(base), id, customerId: ['c2', 'c5', 'c6', 'c7'][n % 4], createdAt: x.at, status: 'order.delivered', total: x.price * x.qty, discount: 0, shippingFee: 0, fee: Math.round(x.price * x.qty * 0.01), tags: [], edits: undefined, payHold: undefined, cancelInfo: undefined, refunded: undefined, refundPending: undefined,
        shipments: [{ ...structuredClone(base.shipments[0]), id: shipId, warehouse: x.warehouse, method: x.warehouse === 'mahabad' ? 'پست پیشتاز' : 'تحویل سریع (پیک)', status: 'ship.delivered', items: [{ productId: x.productId, unitId: '', qty: x.qty, price: x.price, variationId: x.variationId }], allocReason: x.warehouse === 'mahabad' ? 'کالا در انبار مهاباد بود.' : 'موجودی تهران کافی بود.', pack: { at: x.at, by: x.warehouse === 'mahabad' ? 'یاسین' : 'نیما', station: x.warehouse, scans: [{ at: x.at, code: `${x.owner.toUpperCase()}-${x.productId}`, productId: x.productId, variationId: x.variationId, owner: x.owner, ok: true }] } }] })
      x.orderId = id; x.shipId = shipId }) }
  // یوسف: تأمین‌کنندهٔ امانی بدون انبار و کانال فروش؛ کالا در انبار تهران ماست، با قیمت توافقی ثابت، تاریخ انقضا، سری ساخت و شناسهٔ سلامت
  { const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString(); const inD = (dd: number) => new Date(Date.now() + dd * 864e5).toISOString()
    s.stock.parties.push({ id: 'yf', name: 'یوسف', prefix: 'YF', kind: 'partner', color: '#b45309', active: true, city: 'تهران', phone: '09120000011', account: 'internal', joinedAt: ago(24 * 20), note: 'تأمین‌کنندهٔ امانی لوازم بهداشتی؛ انبار و کانال فروش ندارد.', payout: { cycle: 'weekly', holdDays: 7, minShelfDays: 270 } })
    s.stock.agreements.push({ owner: 'yf', seller: 'gh', sellerPct: 100, model: 'fixed_price', note: 'قیمت توافقی ثابت: مبلغ هر ورود سهم یوسف است و بقیه مال غنیمت' }, { owner: 'yf', seller: 'ys', sellerPct: 100, model: 'fixed_price' }, { owner: 'gh', seller: 'yf', sellerPct: 0, model: 'profit_share' }, { owner: 'ys', seller: 'yf', sellerPct: 0, model: 'profit_share' })
    const base = s.products.find((x) => x.id === 'p8')!
    const mk = (id: string, code: string, title: string, en: string, brand: string, price: number, irc: string) => ({ ...structuredClone(base), id, code, title, en, brand, category: 'آرایشی و بهداشتی', status: 'product.published', mode: 'qty', kind: 'simple', variations: undefined, attrs: undefined, priceNew: price, price, cost: undefined, image: '', images: [], rating: 4.6, reviews: 7, views: 410, health: 74, partner: false, seller: 'غنیمت', owner: 'yf', needsExpiry: true, irc, qty: { tehran: 0, mahabad: 0 } }) as Product
    s.products.push(mk('pgl', 'GH-P-000203', 'تیغ اصلاح ژیلت Mach3 بستهٔ ۴ عددی', 'Gillette Mach3 Blades 4-pack', 'ژیلت', 850000, '1228541937482116'), mk('pfs', 'GH-P-000204', 'ژل شستشوی صورت سراوی ۲۳۶ میلی‌لیتر', 'CeraVe Foaming Facial Cleanser 236ml', 'سراوی', 1450000, '1228330918844205'))
    s.stock.lots.push(
      { id: 'L-301', productId: 'pgl', owner: 'yf', warehouse: 'tehran', qty: 18, cost: 600000, at: ago(24 * 18), ref: 'رسید امانی ۰۱', batch: 'MCH-2409A', expiry: inD(520) },
      { id: 'L-302', productId: 'pfs', owner: 'yf', warehouse: 'tehran', qty: 9, cost: 1050000, at: ago(24 * 18), ref: 'رسید امانی ۰۱', batch: 'CV-24K118', expiry: inD(55) },
      { id: 'L-303', productId: 'pfs', owner: 'yf', warehouse: 'tehran', qty: 2, cost: 1050000, at: ago(24 * 60), ref: 'رسید امانی ۰۰', batch: 'CV-23F007', expiry: inD(-4) },
      { id: 'L-304', productId: 'pfs', owner: 'yf', warehouse: 'tehran', qty: 12, cost: 1050000, at: ago(24 * 6), ref: 'رسید امانی ۰۲', batch: 'CV-25B031', expiry: inD(610) })
    const o0 = s.orders.find((o) => o.id === 'GH-10412')!
    const mo = (id: string, pay: string, h: number, items: [string, number, number][]) => { const at = ago(h); const shipId = `${id}-1`
      s.orders.push({ ...structuredClone(o0), id, customerId: 'c6', createdAt: at, status: 'order.delivered', pay, total: items.reduce((a, i) => a + i[1] * i[2], 0), discount: 0, shippingFee: 0, fee: Math.round(items.reduce((a, i) => a + i[1] * i[2], 0) * (pay.includes('اسنپ') ? 0.06 : 0.01)), tags: [], edits: undefined, payHold: undefined, cancelInfo: undefined, refunded: undefined, refundPending: undefined,
        shipments: [{ ...structuredClone(o0.shipments[0]), id: shipId, warehouse: 'tehran', status: 'ship.delivered', deliveredAt: ago(h - 30), items: items.map(([pid, price, qty]) => ({ productId: pid, unitId: '', qty, price })), allocReason: 'کالای امانی یوسف در انبار تهران', pack: { at: ago(h - 2), by: 'نیما', station: 'tehran', scans: [] } } as Order['shipments'][number]] })
      items.forEach(([pid, price, qty], k) => s.stock.sales.unshift({ id: `S-3${id.slice(-2)}${k}`, at: ago(h - 2), productId: pid, owner: 'yf', warehouse: 'tehran', channel: 'gh-site', qty, price, cost: pid === 'pgl' ? 600000 : 1050000, orderId: id, shipId, by: 'نیما', fee: Math.round(price * qty * (pay.includes('اسنپ') ? 0.06 : 0.01)) })) }
    mo('GH-10530', 'اسنپ‌پی (۴ قسط)', 24 * 12, [['pgl', 850000, 2], ['pfs', 1450000, 1]])
    mo('GH-10531', 'زرین‌پال', 24 * 11, [['pgl', 850000, 3]])
    mo('GH-10532', 'درگاه ملت', 24 * 2, [['pfs', 1450000, 2]])
    ;['pgl', 'pfs'].forEach((pid) => { const p = s.products.find((x) => x.id === pid)!; p.qty = { tehran: s.stock.lots.filter((l) => l.productId === pid && (!l.expiry || +new Date(l.expiry) > Date.now())).reduce((a, l) => a + l.qty, 0), mahabad: 0 } }) }
  // دادهٔ نمونهٔ بیشتر: کالا در دسته‌های بیشتر (با مالک و انبار)، مشتری، سفارش در همهٔ وضعیت‌ها و دیدگاه
  { const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString(); const inD = (dd: number) => new Date(Date.now() + dd * 864e5).toISOString()
    const tpl = s.products.find((x) => x.id === 'p8')!
    const IMG: Record<string, string> = { 'گوشی موبایل': './products/p7-500.webp', 'هدفون': './products/p5-500.webp', 'لپ‌تاپ': './products/p3-500.webp', 'ساعت هوشمند': './products/p4-500.webp', 'تبلت': './products/p6-500.webp', 'کتاب‌خوان': './products/p8-500.webp' }
    // [id, عنوان, انگلیسی, برند, دسته, قیمت, بهای تمام‌شده, تهران-غنیمت, مهاباد-غنیمت, مهاباد-یاسین, ستاره، نظر، بازدید، وضعیت]
    const L: [string, string, string, string, string, number, number, number, number, number, number, number, number, string][] = [
      ['n01', 'گوشی شیائومی Redmi Note 13 Pro ۲۵۶ گیگ', 'Xiaomi Redmi Note 13 Pro 256GB', 'شیائومی', 'گوشی موبایل', 21900000, 17600000, 6, 2, 4, 4.4, 31, 3880, 'product.published'],
      ['n02', 'گوشی اپل iPhone 15 ظرفیت ۱۲۸ گیگ', 'Apple iPhone 15 128GB', 'اپل', 'گوشی موبایل', 78900000, 69500000, 3, 0, 1, 4.7, 26, 5120, 'product.published'],
      ['n03', 'گوشی سامسونگ Galaxy S24 FE', 'Samsung Galaxy S24 FE 256GB', 'سامسونگ', 'گوشی موبایل', 42500000, 36200000, 2, 1, 0, 4.3, 12, 2210, 'product.published'],
      ['n04', 'هدفون بی‌سیم اپل AirPods Pro 2 (USB-C)', 'Apple AirPods Pro 2 USB-C', 'اپل', 'هدفون', 13900000, 11300000, 9, 2, 3, 4.8, 64, 6900, 'product.published'],
      ['n05', 'هدفون سامسونگ Galaxy Buds3 Pro', 'Samsung Galaxy Buds3 Pro', 'سامسونگ', 'هدفون', 11400000, 9200000, 4, 0, 2, 4.4, 15, 1840, 'product.published'],
      ['n06', 'هدفون جی‌بی‌ال Tune 770NC', 'JBL Tune 770NC', 'جی‌بی‌ال', 'هدفون', 6400000, 4900000, 7, 3, 0, 4.2, 22, 2370, 'product.published'],
      ['n07', 'لپ‌تاپ لنوو IdeaPad Slim 5', 'Lenovo IdeaPad Slim 5 14 Ryzen 7', 'لنوو', 'لپ‌تاپ', 56800000, 48900000, 2, 0, 0, 4.5, 8, 1430, 'product.published'],
      ['n08', 'لپ‌تاپ ایسوس Zenbook 14 OLED', 'ASUS Zenbook 14 OLED UX3405', 'ایسوس', 'لپ‌تاپ', 71500000, 61800000, 1, 0, 1, 4.6, 5, 980, 'product.published'],
      ['n09', 'ساعت هوشمند سامسونگ Galaxy Watch7', 'Samsung Galaxy Watch7 44mm', 'سامسونگ', 'ساعت هوشمند', 15800000, 12900000, 3, 1, 2, 4.3, 11, 1650, 'product.published'],
      ['n10', 'ساعت هوشمند گارمین Forerunner 265', 'Garmin Forerunner 265', 'گارمین', 'ساعت هوشمند', 29700000, 25100000, 2, 0, 0, 4.7, 7, 760, 'product.published'],
      ['n11', 'تبلت سامسونگ Galaxy Tab S9 FE', 'Samsung Galaxy Tab S9 FE 128GB', 'سامسونگ', 'تبلت', 27400000, 23100000, 3, 0, 2, 4.4, 9, 1290, 'product.published'],
      ['n12', 'کتاب‌خوان کوبو Clara BW', 'Kobo Clara BW', 'کوبو', 'کتاب‌خوان', 9800000, 7700000, 2, 2, 0, 4.5, 6, 540, 'product.published'],
      ['n13', 'پاوربانک انکر ۲۰ هزار ۶۵ وات', 'Anker PowerCore 20000 65W', 'انکر', 'لوازم جانبی', 3450000, 2500000, 14, 4, 6, 4.6, 48, 4120, 'product.published'],
      ['n14', 'شارژر دیواری سامسونگ ۴۵ وات', 'Samsung 45W Super Fast Charger', 'سامسونگ', 'لوازم جانبی', 1690000, 1150000, 22, 6, 8, 4.5, 37, 3010, 'product.published'],
      ['n15', 'کابل اپل USB-C به USB-C یک متری', 'Apple USB-C Woven Cable 1m', 'اپل', 'لوازم جانبی', 990000, 640000, 30, 10, 0, 4.4, 19, 2050, 'product.published'],
      ['n16', 'قاب سیلیکونی اصل iPhone 16 Pro', 'Apple Silicone Case iPhone 16 Pro', 'اپل', 'لوازم جانبی', 2450000, 1700000, 8, 0, 4, 4.3, 14, 1580, 'product.published'],
      ['n17', 'اسپیکر بلوتوثی جی‌بی‌ال Flip 6', 'JBL Flip 6', 'جی‌بی‌ال', 'اسپیکر', 6900000, 5300000, 5, 2, 3, 4.7, 41, 3330, 'product.published'],
      ['n18', 'اسپیکر هوشمند آمازون Echo Dot 5', 'Amazon Echo Dot 5th Gen', 'آمازون', 'اسپیکر', 3900000, 2900000, 6, 0, 0, 4.1, 10, 1110, 'product.published'],
      ['n19', 'کنسول بازی سونی PlayStation 5 Slim', 'Sony PlayStation 5 Slim Digital', 'سونی', 'کنسول بازی', 46900000, 40200000, 2, 0, 1, 4.8, 33, 7240, 'product.published'],
      ['n20', 'دسته بازی سونی DualSense', 'Sony DualSense Wireless Controller', 'سونی', 'کنسول بازی', 4790000, 3700000, 10, 3, 4, 4.6, 28, 2690, 'product.published'],
      ['n21', 'دوربین ورزشی گوپرو HERO12 Black', 'GoPro HERO12 Black', 'گوپرو', 'دوربین', 31800000, 27100000, 1, 0, 1, 4.5, 6, 870, 'product.published'],
      ['n22', 'عطر دیور Sauvage ادو پرفیوم ۱۰۰ میل', 'Dior Sauvage EDP 100ml', 'دیور', 'عطر', 12800000, 10100000, 4, 0, 3, 4.7, 24, 4410, 'product.published'],
      ['n23', 'ماشین اصلاح فیلیپس OneBlade', 'Philips OneBlade QP2724', 'فیلیپس', 'لوازم شخصی', 3200000, 2350000, 6, 2, 0, 4.4, 17, 1720, 'product.published'],
      ['n24', 'گوشی گوگل Pixel 9', 'Google Pixel 9 128GB', 'گوگل', 'گوشی موبایل', 64900000, 57200000, 0, 0, 0, 4.6, 0, 210, 'product.draft'],
    ]
    L.forEach(([id, title, en, brand, cat, price, cost, tg, mg, my, rating, reviews, views, status], k) => {
      const code = `GH-P-${String(205 + k).padStart(6, '0')}`; const pid = `p${id}`
      s.products.push({ ...structuredClone(tpl), id: pid, code, title, en, brand, category: cat, status, mode: 'qty', kind: 'simple', variations: undefined, attrs: undefined, priceNew: price, price, compareAt: k % 5 === 0 ? Math.round(price * 1.08 / 10000) * 10000 : undefined, cost, image: IMG[cat] ?? '', images: IMG[cat] ? [IMG[cat]] : [], rating, reviews, views, cvr: Math.round((1 + (k % 4) * 0.8) * 10) / 10, health: 60 + (k * 7) % 38, fastEligible: tg > 0, seller: 'غنیمت', torob: k % 3 !== 0, partner: false, featured: k % 6 === 0, owner: 'gh', needsExpiry: cat === 'عطر' ? true : undefined, irc: cat === 'عطر' ? `12283${String(41000000000 + k * 7919)}` : undefined, qty: { tehran: tg, mahabad: mg + my } } as Product)
      ;([['gh', 'tehran', tg], ['gh', 'mahabad', mg], ['ys', 'mahabad', my]] as [string, string, number][]).forEach(([owner, wh, q], j) => { if (q > 0) s.stock.lots.push({ id: `L-N${id}${j}`, productId: pid, owner, warehouse: wh, qty: q, cost: owner === 'ys' ? Math.round(cost * 0.97 / 10000) * 10000 : cost, at: ago(24 * (10 + k)), ref: owner === 'ys' ? 'خرید یاسین از اربیل' : 'IN-1405-09', expiry: cat === 'عطر' ? inD(900) : undefined, batch: cat === 'عطر' ? `SV-${24 + (k % 3)}A${k}` : undefined }) })
    })
    ;['شیائومی', 'لنوو', 'ایسوس', 'گارمین', 'کوبو', 'جی‌بی‌ال', 'گوپرو', 'دیور', 'فیلیپس', 'گوگل'].forEach((b, i) => { const B = s.entities.brands as unknown as { id: string; name: string }[]; if (!B.some((x) => x.name === b)) B.push({ id: `brn${i}`, name: b, en: '', origin: '—', products: 1, active: true } as never) })
    ;['اسپیکر', 'کنسول بازی', 'دوربین', 'عطر', 'لوازم شخصی'].forEach((c, i) => { const C = s.entities.categories as unknown as { id: string; name: string }[]; if (!C.some((x) => x.name === c)) C.push({ id: `catn${i}`, name: c, parent: 'الکترونیک', slug: `new-${i}`, template: '—', faq: 0, active: true } as never) })
    // مشتری‌های بیشتر
    const C0 = s.customers.find((c) => c.id === 'c2')!
    const CU: [string, string, string, string, string][] = [['علی رضایی', '09121230011', 'تهران', 'تهران', 'منطقهٔ ۲، سعادت‌آباد'], ['فاطمه کریمی', '09351230012', 'شیراز', 'فارس', 'معالی‌آباد'], ['محمد حسینی', '09141230013', 'مهاباد', 'آذربایجان غربی', 'کوی فرهنگیان'], ['زهرا نوری', '09191230014', 'مشهد', 'خراسان رضوی', 'وکیل‌آباد'], ['رضا قاسمی', '09121230015', 'تهران', 'تهران', 'منطقهٔ ۱، زعفرانیه'], ['سارا محمدی', '09371230016', 'رشت', 'گیلان', 'گلسار'], ['حسین اکبری', '09141230017', 'ارومیه', 'آذربایجان غربی', 'شهرک باهنر'], ['مریم جعفری', '09121230018', 'کرج', 'البرز', 'جهانشهر'], ['امید طاهری', '09131230019', 'اصفهان', 'اصفهان', 'خیابان چهارباغ'], ['نرگس صالحی', '09121230020', 'تهران', 'تهران', 'منطقهٔ ۵، شهرک غرب'], ['بهزاد شریفی', '09141230021', 'مهاباد', 'آذربایجان غربی', 'خیابان جمهوری'], ['لیلا مقدم', '09171230022', 'بوشهر', 'بوشهر', 'خیابان لیان']]
    CU.forEach(([name, mobile, city, province, district], i) => s.customers.push({ ...structuredClone(C0), id: `c${20 + i}`, name, mobile, city, email: `user${20 + i}@example.com`, orders: 1 + (i % 4), ltv: (1 + (i % 4)) * (8000000 + i * 1300000), aov: 8000000 + i * 1300000, segment: i % 5 === 0 ? 'VIP' : i % 3 === 0 ? 'جدید' : 'وفادار', wallet: i % 4 === 0 ? 350000 : 0, tags: [], addr: { ...C0.addr!, province, city, district, postal: String(1000000000 + i * 7919131) } }))
    // سفارش‌های بیشتر با کالاهای تازه، مشتری‌های تازه، هر دو انبار و همهٔ وضعیت‌ها
    const base = s.orders.find((o) => o.id === 'GH-10412')!
    const FLOW: [string, string][] = [['order.delivered', 'ship.delivered'], ['order.delivered', 'ship.delivered'], ['order.shipped', 'ship.in_transit'], ['order.shipped', 'ship.handed'], ['order.preparing', 'ship.packed'], ['order.preparing', 'ship.picking'], ['order.paid', 'ship.pending'], ['order.awaiting_payment', 'ship.pending'], ['order.delivered', 'ship.delivered'], ['order.cancelled', 'ship.cancelled']]
    const PAYS = ['زرین‌پال', 'اسنپ‌پی (۴ قسط)', 'درگاه ملت', 'دیجی‌پی', 'کارت به کارت', 'ترب‌پی', 'زرین‌پال', 'کیف پول + زرین‌پال']
    const pubN = s.products.filter((x) => x.id.startsWith('pn') && x.status === 'product.published')
    for (let i = 0; i < 36; i++) {
      const [os, ss] = FLOW[i % FLOW.length]; const p1 = pubN[(i * 5) % pubN.length]; const p2 = i % 3 === 0 ? pubN[(i * 7 + 2) % pubN.length] : null
      const wh = i % 4 === 1 ? 'mahabad' : 'tehran'; const meth = wh === 'mahabad' ? 'پست پیشتاز' : ['تحویل سریع (پیک)', 'پست پیشتاز', 'تیپاکس'][i % 3]; const fee = /پیک/.test(meth) ? 185000 : /تیپاکس/.test(meth) ? 140000 : 90000
      const items = [{ productId: p1.id, unitId: '', qty: i % 7 === 0 ? 2 : 1, price: p1.price ?? p1.priceNew }, ...(p2 && p2.id !== p1.id ? [{ productId: p2.id, unitId: '', qty: 1, price: p2.price ?? p2.priceNew }] : [])]
      const sub = items.reduce((a, x) => a + x.price * x.qty, 0); const disc = i % 6 === 0 ? Math.round(sub * 0.04 / 10000) * 10000 : 0
      const at = ago(3 + i * 17 + (i % 5) * 3); const id = `GH-${10540 + i}`; const pay = PAYS[i % PAYS.length]
      const o = structuredClone(base)
      Object.assign(o, { id, customerId: `c${20 + (i % 12)}`, createdAt: at, status: os, pay, channel: ['سایت', 'سایت', 'اپلیکیشن', 'اینستاگرام دایرکت', 'ترب'][i % 5], total: sub + fee - disc, discount: disc, shippingFee: fee, fee: Math.round(sub * (pay.includes('اسنپ') ? 0.06 : 0.01)), tags: i % 9 === 0 ? ['هدیه'] : [], edits: undefined, payHold: undefined, refunded: undefined, refundPending: undefined, decision: undefined, notes: [], cancelInfo: os === 'order.cancelled' ? { by: 'مشتری', reason: 'از خرید منصرف شدم', at, amount: sub + fee - disc, to: 'کیف پول', refund: 'بازگشت داده شد', refundAt: at } : undefined })
      const sent = ['ship.handed', 'ship.in_transit', 'ship.delivered'].includes(ss)
      o.shipments = [{ ...structuredClone(base.shipments[0]), id: `${id}-1`, warehouse: wh, method: meth, shipFee: fee, status: ss, items, sla: new Date(Date.now() + ((i % 6) - 2) * 5 * 36e5).toISOString(), allocReason: wh === 'mahabad' ? 'موجودی کافی در انبار مهاباد و نزدیکی به مشتری' : 'موجودی تهران کافی بود.', tracking: sent && /پست|تیپاکس/.test(meth) ? `1204${String(77000000000 + i * 7919)}` : '', courier: null, deliveredAt: ss === 'ship.delivered' ? ago(i * 17 - 20 > 0 ? i * 17 - 20 : 1) : undefined, pack: undefined } as Order['shipments'][number]]
      s.orders.push(o)
      s.txns.push({ ...s.txns[0], id: `TX-N${i}`, orderId: id, amount: o.total, gateway: pay, ref: String(55120000000 + i * 913), status: os === 'order.awaiting_payment' ? 'pay.unknown' : 'pay.success', at })
      // دفتر شرکا: هر قلم بسته‌بندی‌شده با مالکش (کالای مهاباد به‌ترتیب اول از یاسین)
      if (['ship.packed', 'ship.handed', 'ship.in_transit', 'ship.delivered'].includes(ss)) items.forEach((it, k) => { const owner = wh === 'mahabad' && s.stock.lots.some((l) => l.productId === it.productId && l.owner === 'ys') ? 'ys' : 'gh'; const lot = s.stock.lots.find((l) => l.productId === it.productId && l.owner === owner)
        s.stock.sales.unshift({ id: `S-N${i}${k}`, at, productId: it.productId, owner, warehouse: wh, channel: o.channel === 'ترب' || o.channel === 'اینستاگرام دایرکت' || o.channel === 'اپلیکیشن' || o.channel === 'سایت' ? 'gh-site' : 'gh-site', qty: it.qty, price: it.price, cost: lot?.cost ?? Math.round(it.price * 0.82), orderId: id, shipId: `${id}-1`, by: wh === 'mahabad' ? 'یاسین' : 'نیما', discount: Math.round(disc * it.price * it.qty / sub), fee: Math.round(o.fee * it.price * it.qty / sub) }) })
    }
    // دیدگاه‌های بیشتر
    const R0 = s.reviews[0]
    const TX: [number, string][] = [[5, 'اصل بود و پلمپ. بستهٔ ارسالی هم خیلی تمیز بود.'], [4, 'کیفیت خوب، فقط ارسال یک روز دیرتر رسید.'], [5, 'قیمتش از بازار بهتر بود و فاکتور رسمی هم داد.'], [3, 'کالا سالم بود ولی جعبه کمی ضربه خورده بود.'], [5, 'پشتیبانی تلفنی خیلی خوب راهنمایی کرد.'], [4, 'از عکس‌های واقعی واحد راضی بودم؛ همان چیزی بود که دیدم.'], [2, 'رنگ با عکس سایت کمی فرق داشت.'], [5, 'دومین خریدم از غنیمت بود؛ باز هم راضی.']]
    pubN.slice(0, 16).forEach((p, i) => { const [r, t] = TX[i % TX.length]; s.reviews.push({ ...structuredClone(R0), id: `RV-N${i}`, productId: p.id, customerId: `c${20 + (i % 12)}`, rating: r, text: t, status: i % 4 === 0 ? 'review.pending' : 'review.approved', verified: i % 5 !== 0, at: ago(10 + i * 21), ai: 'سالم', media: [] }) })
  }
  // پرتال شرکای مستقل فعلاً غیرفعال است؛ یاسین جزئی از غنیمت است و از «مالکیت و تسویه» مدیریت می‌شود
  s.partners.forEach((p) => { p.status = 'در انتظار تأیید' })
  // سابقهٔ بسته‌بندی با اسکن برای چند مرسولهٔ ارسال‌شده (تب «تاریخچه» ایستگاه)
  { const who = ['نیما', 'هستی', 'یاسین']; let n = 0
    s.orders.forEach((o) => o.shipments.forEach((sh) => { if (n >= 14 || !['ship.packed', 'ship.handed', 'ship.in_transit', 'ship.delivered'].includes(sh.status)) return; n++
      const at = new Date(new Date(o.createdAt).getTime() + 50 * 6e4).toISOString(); const scans: NonNullable<Shipment['pack']>['scans'] = []
      if (n % 4 === 1) { const p = s.products.find((x) => x.id !== sh.items[0]?.productId && x.code); if (p) scans.push({ at, code: p.code!, productId: p.id, owner: 'gh', ok: false, why: `«${p.title}» در این سفارش نیست.` }) }
      sh.items.filter((i) => !i.cancelled).forEach((i) => { for (let k = 0; k < i.qty; k++) scans.push({ at, code: i.unitId || s.products.find((x) => x.id === i.productId)?.code || i.productId, productId: i.productId, variationId: i.variationId, unitId: i.unitId || undefined, owner: sh.warehouse === 'mahabad' && n % 3 === 0 ? 'ys' : 'gh', ok: true }) })
      sh.pack = { at, by: sh.warehouse === 'mahabad' ? 'یاسین' : who[n % 2], station: sh.warehouse, scans } })) }
  // لیست خرید نمونه
  { const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
    s.buyList.push({ id: 'bl1', productId: 'p1', name: 'گوشی اپل iPhone 16 Pro ظرفیت ۲۵۶ گیگابایت', qty: 4, targetCost: 1500, currency: 'دلار', must: true, reason: 'پرفروش', note: 'فقط تیتانیوم طبیعی و مشکی', status: 'در لیست', addedAt: ago(20), by: 'بهشاد' },
      { id: 'bl2', name: 'کیف ضدآب سامسونت برای مک‌بوک ۱۴ اینچ', qty: 6, targetCost: 35, currency: 'دلار', must: false, reason: 'دستی', note: 'سه مشتری در دایرکت پرسیدند', status: 'در لیست', addedAt: ago(5), by: 'یاسین' }) }
  // رزرو داخل درگاه: یک مشتری همین حالا در درگاه است و چند رزرو اخیر که آزاد یا نهایی شده‌اند
  { const m = (x: number) => new Date(Date.now() - x * 6e4).toISOString(); const u = s.units.find((x) => x.id === 'GU-20471')
    if (u && u.status === 'unit.published') u.status = 'unit.reserved'
    s.gatewayHolds.push(
      { id: 'GH-R1', customerId: 'c3', items: [{ productId: 'p2', unitId: u?.id ?? '', qty: 1 }], gateway: 'زرین‌پال', amount: 15000000, at: m(3), status: 'in_gateway' },
      { id: 'GH-R2', customerId: 'c1', items: [{ productId: 'p2', unitId: '', qty: 1 }], gateway: 'درگاه ملت', amount: 15000000, at: m(26), status: 'failed', endedAt: m(24), note: 'خطای بانک ‎-51: موجودی کافی نیست' },
      { id: 'GH-R3', customerId: 'c5', items: [{ productId: 'p5', unitId: '', qty: 1 }], gateway: 'زرین‌پال', amount: 21900000, at: m(58), status: 'expired', endedAt: m(43), note: 'پاسخی از درگاه نیامد؛ پس از ۱۵ دقیقه آزاد شد' },
      { id: 'GH-R4', customerId: 'c2', items: [{ productId: 'p4', unitId: '', qty: 1 }], gateway: 'اسنپ‌پی', amount: 30900000, at: m(190), status: 'paid', endedAt: m(187), orderId: 'GH-10478' },
      { id: 'GH-R5', customerId: 'c6', items: [{ productId: 'p9', unitId: '', qty: 2 }], gateway: 'درگاه ملت', amount: 3000000, at: m(75), status: 'cancelled', endedAt: m(74), note: 'انصراف مشتری داخل درگاه' })
  }
  // پرونده‌های بازگشت وجه نمونه در مراحل مختلف
  { const h = (x: number) => new Date(Date.now() - x * 36e5).toISOString(); const L = (at: string, step: string, note?: string) => ({ at, by: 'بهشاد', step, note })
    s.refunds.push(
      { id: 'RF-1004', orderId: 'GH-10479', customerId: s.orders.find((o) => o.id === 'GH-10479')?.customerId ?? 'c3', amount: 9900000, source: 'لغو یک قلم', dest: 'کارت بانکی', at: h(80), by: 'بهشاد', status: 'sent', via: 'پایا (شبا)', account: 'IR12 0120 0000 0000 0123 4567 89', sentAt: h(78), log: [L(h(80), 'ثبت درخواست', 'لغو یک قلم'), L(h(80), 'تأیید'), L(h(78), 'ارسال به بانک', 'پایا (شبا)')] },
      { id: 'RF-1003', orderId: 'GH-10480', customerId: s.orders.find((o) => o.id === 'GH-10480')?.customerId ?? 'c4', amount: 38500000, source: 'لغو سفارش', dest: 'همان روش پرداخت', at: h(5), by: 'سارا', status: 'requested', log: [L(h(5), 'ثبت درخواست', 'لغو سفارش · بالاتر از سقف تأیید')] },
      { id: 'RF-1002', orderId: 'GH-10458', customerId: 'c1', amount: 15000000, source: 'مرجوعی', dest: 'کارت بانکی', at: h(30), by: 'بهشاد', status: 'failed', via: 'پایا (شبا)', account: 'IR55 0170 0000 0000 9988 7766 55', failWhy: 'شبا به نام مشتری نیست', log: [L(h(30), 'ثبت درخواست', 'مرجوعی'), L(h(30), 'تأیید'), L(h(28), 'ارسال به بانک', 'پایا (شبا)'), L(h(6), 'ناموفق', 'شبا به نام مشتری نیست')] },
      { id: 'RF-1001', orderId: 'GH-10466', customerId: s.orders.find((o) => o.id === 'GH-10466')?.customerId ?? 'c2', amount: 2400000, source: 'ویرایش سفارش', dest: 'کیف پول', at: h(50), by: 'بهشاد', status: 'done', ref: 'RF-1001', doneAt: h(50), log: [L(h(50), 'ثبت درخواست', 'ویرایش سفارش'), L(h(50), 'واریز شد', 'به کیف پول مشتری')] })
    s.refunds.forEach((r) => { const o = s.orders.find((q) => q.id === r.orderId); if (o) { o.refunded = (o.refunded ?? 0) + (r.status === 'done' ? r.amount : 0); o.refundPending = (o.refundPending ?? 0) + (r.status !== 'done' ? r.amount : 0) } })
  }
  // کتابخانهٔ رسانه: همهٔ تصویرهای کالاها یک بار، با ابعاد و حجم نمونه
  { const seen = new Set<string>(); let n = 0
    s.products.forEach((p) => [p.image, ...(p.images ?? [])].filter(Boolean).forEach((src) => { if (seen.has(src)) return; seen.add(src); n++
      s.media.push({ id: `M-${String(270 + n)}`, src, name: src.split('/').pop() ?? src, alt: n % 3 ? `${p.title}، عکس واقعی همین کالا` : '', w: 500, h: 500, size: 18000 + ((n * 7919) % 40000), type: src.endsWith('.webp') ? 'webp' : 'jpg', by: n % 3 === 1 ? 'نیما' : 'بهشاد', at: new Date(Date.now() - n * 2.3 * 864e5).toISOString(), optimized: src.endsWith('.webp') }) })) }
  // تاریخچهٔ کامل‌تر دفتر شرکا، محصول به محصول: فروش حضوری شعبه‌ها و سایت ve1 با تخفیف و کارمزد، یک برگشت از مشتری و یک برگشت کالا به مالک
  { const hr = (h: number) => new Date(Date.now() - h * 36e5).toISOString(); let n = 0
    s.stock.channels.push({ id: 'gh-store', name: 'فروش حضوری شعبهٔ تهران', seller: 'gh', collector: 'gh', brand: 'غنیمت', active: true })
    const priceOf = (pid: string, vid?: string) => { const p = s.products.find((x) => x.id === pid); const v = p?.variations?.find((x) => x.id === vid); return v?.sale ?? v?.price ?? p?.price ?? p?.priceNew ?? 0 }
    const extra: StockSaleT[] = []
    s.stock.lots.filter((l) => l.qty > 2 && (l.owner !== 'gh' || l.warehouse === 'mahabad')).forEach((l, i) => {
      const base = priceOf(l.productId, l.variationId); if (!base) return
      const reps = 2 + (i % 3)
      for (let k = 0; k < reps; k++) { n++
        const ch = l.owner === 'ys' ? (k % 2 ? 've1' : 'ys-store') : l.warehouse === 'mahabad' ? (k % 2 ? 'gh-branch-ys' : 'ys-store') : 'gh-store'
        const qty = 1 + ((i + k) % 3 === 0 ? 1 : 0); const price = Math.round((base * (k % 3 === 2 ? 0.97 : 1)) / 1000) * 1000
        const disc = k % 4 === 1 ? Math.round((price * qty * 0.03) / 1000) * 1000 : 0; const fee = ch === 've1' ? Math.round(price * qty * 0.012) : 0
        extra.push({ id: `S-H${String(n).padStart(3, '0')}`, at: hr(24 * (4 + ((i * 7 + k * 11) % 85)) + k * 3), productId: l.productId, variationId: l.variationId, owner: l.owner, warehouse: l.warehouse, channel: ch, qty, price, cost: l.cost, by: ch === 'gh-store' ? 'نیما' : 'یاسین', discount: disc || undefined, fee: fee || undefined, ext: ch === 've1' ? `ve1-${4800 + n}` : ch.endsWith('store') ? `POS-${7300 + n}` : undefined })
      }
    })
    // یک برگشت از مشتری روی یکی از فروش‌های حضوری
    const r0 = extra.find((x) => x.channel === 'ys-store' && x.qty === 2); if (r0) extra.push({ ...r0, id: `S-H${String(++n).padStart(3, '0')}`, at: new Date(+new Date(r0.at) + 3 * 864e5).toISOString(), qty: -1, discount: r0.discount ? Math.round(r0.discount / 2) : undefined, reversal: r0.id, note: 'مرجوعی مشتری در شعبه: ایراد ظاهری جعبه', by: 'یاسین' })
    s.stock.sales.push(...extra)
    // برگشت کالا به مالک (یوسف): یک بستهٔ گلوتاتیون با بستهٔ آسیب‌دیده
    if (s.stock.parties.some((p) => p.id === 'yf')) s.stock.ownerReturns.push({ id: 'OR-1001', at: hr(24 * 9), owner: 'yf', warehouse: 'tehran', lines: [{ productId: 'pgl', qty: 1, batch: 'MCH-2409A' }], reason: 'بستهٔ آسیب‌دیده در حمل؛ به تأمین‌کننده برگشت', by: 'نیما', receivedBy: 'یوسف' })
    // سند ورود هر لات: تعداد لحظهٔ ورود = باقی‌مانده + فروش خالص همان مالک از همان انبار (قدیمی‌ترین لات اول) + برگشت به مالک
    const used = new Map<string, number>(); const k3 = (o: string, p: string, v: string | undefined, w: string) => `${o}|${p}|${v ?? ''}|${w}`
    s.stock.sales.filter((x) => !x.unitId).forEach((x) => used.set(k3(x.owner, x.productId, x.variationId, x.warehouse), (used.get(k3(x.owner, x.productId, x.variationId, x.warehouse)) ?? 0) + x.qty))
    s.stock.ownerReturns.forEach((r) => r.lines.forEach((ln) => used.set(k3(r.owner, ln.productId, ln.variationId, r.warehouse), (used.get(k3(r.owner, ln.productId, ln.variationId, r.warehouse)) ?? 0) + ln.qty)))
    ;[...s.stock.lots].filter((l) => !(l.ref ?? '').startsWith('برگشت')).sort((a, b) => +new Date(a.at) - +new Date(b.at)).forEach((l) => { const key = k3(l.owner, l.productId, l.variationId, l.warehouse); const u = Math.max(0, used.get(key) ?? 0); l.qty0 = l.qty + u; used.set(key, 0) })
  }
  // یکدستی دادهٔ نمونه: مبلغ کل هر سفارش = جمع کالاهای فعال − تخفیف + ارسال (و تراکنش موفق همان سفارش هم‌مبلغ)؛ موجودی کالاها از روی لات‌ها و رزرو سفارش‌های باز
  s.orders.forEach((o) => { const sub = o.shipments.flatMap((x) => x.items).filter((i) => !i.cancelled).reduce((a, i) => a + i.price * (i.qty ?? 1), 0); if (!sub) return
    const want = sub - (o.discount ?? 0) + (o.shippingFee ?? 0); if (want === o.total) return
    const old = [o.total, o.total + (o.shippingFee ?? 0), o.total - (o.discount ?? 0) + (o.shippingFee ?? 0)]
    s.txns.filter((t) => t.orderId === o.id && old.includes(t.amount)).forEach((t) => { t.amount = want }); o.total = want })
  new Set(s.stock.lots.map((l) => l.productId)).forEach((pid) => syncQty(s, pid))
  return s
}
export type DB = ReturnType<typeof makeSeedBase>
