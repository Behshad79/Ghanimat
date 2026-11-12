// مجموعه‌دادهٔ نمونهٔ واحد (بخش ۱۸.۲). هیچ دادهٔ واقعی مشتری یا کلید واقعی در آن نیست.
const now = Date.now()
const ago = (min: number) => new Date(now - min * 60000).toISOString()
const inMin = (min: number) => new Date(now + min * 60000).toISOString()

export type Courier = { name: string; phone: string; plate: string; vehicle: string; eta: number; code: string; cost: number; company?: string }
export type Shipment = { id: string; warehouse: string; method: string; shipFee?: number; packPhotos?: { at: string; by: string; src: string }[]; status: string; sla: string; items: { productId: string; unitId: string; qty: number; price: number }[]; courier: Courier | null; tracking: string; trackingUrl?: string; trackingCarrier?: string; allocReason: string }
export type Pdp = { videos: { kind: string; url: string }[]; flaws: { zone: string; status: string; note: string }[]; importRoute: string; variantGroup: string; variantLabel: string; variant?: Record<string, string>; covered: string; notCovered: string }
export type Product = { id: string; image: string; images?: string[]; imagePos?: string; title: string; en: string; brand: string; category: string; status: string; mode: string; qty?: { tehran: number; mahabad: number }; priceNew: number; price?: number; compareAt?: number; cost?: number; rating: number; reviews: number; views: number; cvr: number; health: number; fastEligible: boolean; seller: string; torob: boolean; partner?: boolean; featured?: boolean; pdp?: Pdp
  code?: string; ean?: string; model?: string; specs?: Record<string, string>; keyFeatures?: string; short?: string; long?: string; box?: string; pros?: string; cons?: string; condition?: string; grade?: string; source?: string; originLabel?: string; supplier?: string; warehouse?: string; currency?: string; costFx?: number; rate?: number; extraCost?: number; discount?: number; weight?: number; dims?: string; shipClass?: string; insurance?: boolean; install?: boolean; warrantyType?: string; warrantyMonths?: number; warrantyTerms?: string; metaTitle?: string; metaDesc?: string; slug?: string; scheduledAt?: string; video?: string }
export type Unit = { id: string; productId: string; serial: string; condition: string; grade: string; warehouse: string; source: string; status: string; cost: number; price: number; shelf: string; received: string; flaws: string[]; color: string; warrantyMonths?: number; code?: string; ean?: string; photos?: string[] }
export type Order = { shipTo?: string; id: string; customerId: string; buyer?: 'person' | 'legal'; legalId?: string; deliveredAt?: string; invoiceNo?: string; createdAt: string; status: string; pay: string; total: number; discount: number; shippingFee: number; fee: number; margin: number; risk: number; channel: string; tags: string[]; lockedBy: string | null; shipments: Shipment[] }

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
import { makeBank } from './bank'
import { makeNewsletter, makePages, makeTheme } from './pages'
import { makeHub } from './hub'
import { makePromos } from './promos'
import { makePickups } from './pickups'
export type Att = { kind: 'image' | 'file' | 'voice' | 'video'; src: string; name?: string; size?: number; dur?: number }
export type Msg = { from: string; text: string; at: string; atts?: Att[] }
export type Ticket = { id: string; customerId: string; orderId: string; subject: string; channel: string; status: string; priority: string; sla: string; assignee: string; sentiment: string; messages: Msg[] }
export type Ret = { id: string; orderId: string; customerId: string; unitId: string; reason: string; note: string; status: string; amount: number; dest: string; createdAt: string; deadline: string; channel?: string; photos?: string[]; by?: string; productId?: string }
export type War = { id: string; code: string; customerId: string; unitId: string; type: string; months: number; status: string; issue: string; owner: string; deadline: string; orderId?: string; channel?: string; photos?: string[]; by?: string; productId?: string }
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
    { id: 'GH-10481', customerId: 'c1', createdAt: ago(18), status: 'order.paid', pay: 'زرین‌پال', total: 147400000, discount: 0, shippingFee: 0, fee: 1474000, margin: 14.2, risk: 12, channel: 'سایت', tags: ['تحویل سریع'], lockedBy: null,
      shipments: [{ id: 'GH-10481-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', status: 'ship.pending', sla: inMin(102), items: [{ productId: 'p1', unitId: 'GU-20412', qty: 1, price: 124500000 }, { productId: 'p5', unitId: 'GU-20440', qty: 1, price: 22900000 }], courier: null, tracking: '', allocReason: 'هر دو کالا در انبار تهران موجود بود.' }] },
    { id: 'GH-10480', customerId: 'c6', createdAt: ago(42), status: 'order.paid', pay: 'اسنپ‌پی', total: 15000000, discount: 0, shippingFee: 0, fee: 900000, margin: 14.7, risk: 34, channel: 'ترب', tags: ['اقساطی'], lockedBy: null,
      shipments: [{ id: 'GH-10480-1', warehouse: 'tehran', method: 'تحویل سریع (اسنپ‌باکس)', status: 'ship.pending', sla: inMin(60 * 20), items: [{ productId: 'p2', unitId: 'GU-20471', qty: 1, price: 15000000 }], courier: null, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10479', customerId: 'c7', createdAt: ago(60 * 2), status: 'order.preparing', pay: 'درگاه ملت', total: 104400000, discount: 2000000, shippingFee: 95000, fee: 0, margin: 16.8, risk: 8, channel: 'سایت', tags: ['دو مرسوله'], lockedBy: null,
      shipments: [
        { id: 'GH-10479-1', warehouse: 'tehran', method: 'پست پیشتاز', status: 'ship.packed', sla: inMin(60 * 5), items: [{ productId: 'p3', unitId: 'GU-20421', qty: 1, price: 79900000 }], courier: null, tracking: '', allocReason: 'موجودی تهران کافی بود.' },
        { id: 'GH-10479-2', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.partner_confirm', sla: inMin(35), items: [{ productId: 'p5', unitId: 'GU-20441', qty: 1, price: 24500000 }], courier: null, tracking: '', allocReason: 'تهران ناموجود بود؛ به انبار مهاباد رفت.' },
      ] },
    { id: 'GH-10478', customerId: 'c2', createdAt: ago(60 * 3), status: 'order.shipped', pay: 'ترب‌پی', total: 30900000, discount: 0, shippingFee: 0, fee: 1854000, margin: 15.9, risk: 10, channel: 'ترب', tags: ['اقساطی', 'تحویل سریع'], lockedBy: null,
      shipments: [{ id: 'GH-10478-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', status: 'ship.in_transit', sla: inMin(14), items: [{ productId: 'p4', unitId: 'GU-20430', qty: 1, price: 30900000 }], courier: { name: 'رضا احمدی', phone: '09120000000', plate: '۱۲۳ ایران ۴۵', vehicle: 'موتور', eta: 14, code: 'SB-88213', cost: 185000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10475', customerId: 'c3', createdAt: ago(60 * 7), status: 'order.needs_decision', pay: 'زرین‌پال', total: 74900000, discount: 0, shippingFee: 120000, fee: 749000, margin: 18.5, risk: 15, channel: 'سایت', tags: ['کمبود تأمین'], lockedBy: 'نیما',
      shipments: [{ id: 'GH-10475-1', warehouse: 'mahabad', method: 'پست پیشتاز', status: 'ship.cancelled', sla: inMin(60 * 16), items: [{ productId: 'p7', unitId: 'GU-20450', qty: 1, price: 74900000 }], courier: null, tracking: '', allocReason: 'فقط در انبار مهاباد موجود بود. شریک اعلام «ندارم» کرد.' }] },
    { id: 'GH-10470', customerId: 'c4', createdAt: ago(60 * 24), status: 'order.shipped', pay: 'کیف پول + زرین‌پال', total: 4500000, discount: 0, shippingFee: 0, fee: 45000, margin: 32.3, risk: 5, channel: 'سایت', tags: ['حقوقی', 'فاکتور رسمی'], lockedBy: null,
      shipments: [{ id: 'GH-10470-1', warehouse: 'tehran', method: 'تیپاکس', status: 'ship.in_transit', sla: inMin(60 * 24), items: [{ productId: 'p9', unitId: '', qty: 3, price: 1500000 }], courier: null, tracking: '21005478123', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10458', customerId: 'c1', buyer: 'legal', legalId: 'c4', createdAt: '2026-10-25T10:42:00+03:30', deliveredAt: '2026-10-27T13:10:00+03:30', status: 'order.delivered', pay: 'درگاه ملت', total: 30000000, discount: 1240000, shippingFee: 240000, fee: 0, margin: 19.6, risk: 6, channel: 'سایت', tags: ['دو مرسوله', 'حقوقی', 'فاکتور رسمی'], lockedBy: null,
      shipments: [
        { id: 'GH-10458-1', warehouse: 'tehran', method: 'تحویل سریع (پیک)', shipFee: 150000, packPhotos: [{ src: './products/p2-500.webp', at: '2026-10-25T11:20:00+03:30', by: 'نیما' }], status: 'ship.delivered', sla: '2026-10-25T12:42:00+03:30', items: [{ productId: 'p2', unitId: 'GU-20470', qty: 1, price: 16000000 }], courier: { name: 'محمد نوری', phone: '09120000001', plate: '۵۴۳ ایران ۲۱', vehicle: 'موتور', eta: 0, code: 'SB-87102', cost: 172000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' },
        { id: 'GH-10458-2', warehouse: 'mahabad', method: 'پست پیشتاز', shipFee: 90000, status: 'ship.delivered', sla: '2026-10-28T18:00:00+03:30', items: [{ productId: 'p2', unitId: 'GU-20473', qty: 1, price: 15000000 }], courier: null, tracking: '120459870001245789630412', allocReason: 'رنگ استارلایت فقط در انبار مهاباد موجود بود.' },
      ] },
    { id: 'GH-10412', customerId: 'c1', createdAt: ago(60 * 24 * 29), status: 'order.delivered', pay: 'زرین‌پال', total: 29500000, discount: 0, shippingFee: 0, fee: 295000, margin: 15.6, risk: 4, channel: 'سایت', tags: [], lockedBy: null,
      shipments: [{ id: 'GH-10412-1', warehouse: 'tehran', method: 'تحویل سریع (اسنپ‌باکس)', status: 'ship.delivered', sla: ago(60 * 24 * 28), items: [{ productId: 'p4', unitId: 'GU-20432', qty: 1, price: 29500000 }], courier: { name: 'رضا احمدی', phone: '09120000000', plate: '۱۲۳ ایران ۴۵', vehicle: 'موتور', eta: 0, code: 'SB-81944', cost: 165000 }, tracking: '', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10451', customerId: 'c3', createdAt: ago(60 * 24 * 5), status: 'order.returned', pay: 'زرین‌پال', total: 21900000, discount: 0, shippingFee: 95000, fee: 219000, margin: 9.2, risk: 18, channel: 'ترب', tags: [], lockedBy: null,
      shipments: [{ id: 'GH-10451-1', warehouse: 'tehran', method: 'پست پیشتاز', status: 'ship.delivered', sla: ago(60 * 24 * 3), items: [{ productId: 'p5', unitId: 'GU-20442', qty: 1, price: 21900000 }], courier: null, tracking: '120459870001245789632145', allocReason: 'موجودی تهران کافی بود.' }] },
    { id: 'GH-10449', customerId: 'c5', createdAt: ago(60 * 24 * 6), status: 'order.cancelled', pay: 'تارا', total: 22900000, discount: 0, shippingFee: 0, fee: 0, margin: 0, risk: 22, channel: 'اینستاگرام', tags: ['اعتبار ردشده'], lockedBy: null, shipments: [] },
    { id: 'GH-10444', customerId: 'c6', createdAt: ago(60 * 24 * 7), status: 'order.suspicious', pay: 'زرین‌پال', total: 259800000, discount: 12000000, shippingFee: 0, fee: 2598000, margin: 10.1, risk: 87, channel: 'سایت', tags: ['امتیاز ریسک بالا'], lockedBy: null,
      shipments: [{ id: 'GH-10444-1', warehouse: 'tehran', method: 'باربری', status: 'ship.pending', sla: inMin(60 * 30), items: [{ productId: 'p1', unitId: 'GU-20414', qty: 2, price: 129900000 }], courier: null, tracking: '', allocReason: 'بازبینی دستی لازم است.' }] },
  ] as Order[]),
  tickets: [
    { id: 'TK-482106', customerId: 'c1', orderId: 'GH-10458', subject: 'کابل شارژ داخل جعبه نبود', channel: 'چت سایت', status: 'ticket.new', priority: 'فوری', sla: inMin(11), assignee: '', sentiment: 'ناراضی', messages: [{ from: 'customer', text: 'سلام. سفارش GH-10458 را تحویل گرفتم. هدست AirPods Max جعبه‌باز بود ولی کابل شارژ داخل جعبه نبود. در صفحهٔ کالا نوشته بود کابل دارد.', at: ago(19) }] },
    { id: 'TK-482093', customerId: 'c2', orderId: 'GH-10478', subject: 'پیک کی می‌رسد؟', channel: 'پیامک', status: 'ticket.open', priority: 'عادی', sla: inMin(25), assignee: 'سارا', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'سفارشم را دو ساعت پیش ثبت کردم. پیک کجاست؟', at: ago(12) }] },
    { id: 'TK-482071', customerId: 'c3', orderId: 'GH-10451', subject: 'وضعیت بازگشت وجه مرجوعی', channel: 'تیکت پنل', status: 'ticket.needs_info', priority: 'عادی', sla: inMin(60 * 3), assignee: 'سارا', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'کالا را سه روز پیش پس فرستادم. پول کی واریز می‌شود؟', at: ago(60 * 4) }, { from: 'agent', text: 'سلام. بسته به انبار رسیده و در حال بررسی است. شمارهٔ شبا را برای واریز تأیید می‌کنید؟', at: ago(60 * 3) }] },
    { id: 'TK-482044', customerId: 'c7', orderId: 'GH-10479', subject: 'چرا سفارش من دو بسته شده است؟', channel: 'بله', status: 'ticket.answered', priority: 'کم', sla: inMin(60 * 8), assignee: 'نیما', sentiment: 'خنثی', messages: [{ from: 'customer', text: 'در پنل نوشته دو مرسوله. یعنی چه؟', at: ago(60 * 2) }, { from: 'agent', text: 'یکی از کالاها از انبار تهران و دیگری از انبار مهاباد ارسال می‌شود. هر دو با پست پیشتاز می‌رسند و هزینهٔ اضافه‌ای ندارد.', at: ago(60) }] },
    { id: 'TK-481980', customerId: 'c5', orderId: 'GH-10449', subject: 'اعتبار اقساطی رد شد', channel: 'تماس تلفنی', status: 'ticket.closed', priority: 'عادی', sla: ago(60 * 24), assignee: 'سارا', sentiment: 'ناراضی', messages: [{ from: 'customer', text: 'اعتبار تارا رد شد و سفارش لغو شد.', at: ago(60 * 24 * 6) }] },
  ] as Ticket[],
  returns: [
    { id: 'RT-840552', orderId: 'GH-10451', customerId: 'c3', unitId: 'GU-20442', reason: 'مغایرت با صفحهٔ کالا', note: 'رنگ هدفون با عکس فرق دارد.', status: 'return.inspecting', amount: 21900000, dest: 'کارت بانکی', createdAt: ago(60 * 24 * 3), deadline: inMin(60 * 20) },
    { id: 'RT-839910', orderId: 'GH-10412', customerId: 'c1', unitId: 'GU-20432', reason: 'انصراف از خرید', note: 'بند ساعت کوچک بود.', status: 'return.refunded', amount: 29335000, dest: 'کیف پول', createdAt: ago(60 * 24 * 26), deadline: ago(60 * 24 * 24) },
    { id: 'RT-838745', orderId: 'GH-10470', customerId: 'c4', unitId: '', reason: 'خرابی کالا', note: 'یکی از سه شارژر گرم می‌شود و شارژ نمی‌کند.', status: 'return.refunding', amount: 1500000, dest: 'کارت بانکی', createdAt: ago(60 * 24 * 2), deadline: inMin(60 * 4) },
    { id: 'RT-841203', orderId: 'GH-10444', customerId: 'c6', unitId: 'GU-20414', reason: 'انصراف از خرید', note: '', status: 'return.rejected', amount: 0, dest: '-', createdAt: ago(60 * 24 * 9), deadline: ago(60 * 24 * 5) },
  ] as Ret[],
  warranties: [
    { id: 'GR-1840', code: 'GW-884120', customerId: 'c1', unitId: 'GU-20470', type: 'گارانتی اختصاصی غنیمت', months: 6, status: 'warranty.pending', issue: 'صدای گوشی چپ گاهی قطع و وصل می‌شود.', owner: 'غنیمت', deadline: inMin(60 * 22) },
    { id: 'GR-1838', code: 'GW-880034', customerId: 'c3', unitId: 'GU-20442', type: 'گارانتی اختصاصی غنیمت', months: 6, status: 'warranty.repairing', issue: 'قطع و وصل شدن بلوتوث.', owner: 'غنیمت', deadline: inMin(60 * 70) },
    { id: 'GR-1825', code: 'GW-871200', customerId: 'c4', unitId: 'GU-20441', type: 'گارانتی شرکتی', months: 12, status: 'warranty.done', issue: 'خرابی دکمهٔ پاور.', owner: 'شریک مهاباد', deadline: ago(60 * 48) },
  ] as War[],
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
  ],
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
    { key: 'reserve_minutes', group: 'موجودی و سبد', name: 'مدت رزرو واحد هنگام پرداخت', value: 15, unit: 'دقیقه', desc: 'واحد از شروع پرداخت برای این مدت قفل می‌شود.', sensitive: false, usedIn: ['صفحهٔ پرداخت', 'مانیتور رزروها', 'قفل بین کانال‌ها'], history: [] },
    { key: 'low_stock_threshold', group: 'موجودی و سبد', name: 'آستانهٔ «موجودی محدود»', value: 2, unit: 'عدد', desc: 'کمتر یا مساوی این تعداد، بج «موجودی محدود» نمایش داده می‌شود.', sensitive: false, usedIn: ['بج چرخشی کارت محصول', 'صفحهٔ کالا'], history: [] },
    { key: 'decision_hours', group: 'سفارش', name: 'مهلت تصمیم مشتری در کمبود تأمین', value: 24, unit: 'ساعت', desc: 'پس از پایان مهلت، قلم تأمین‌نشده خودکار لغو می‌شود.', sensitive: true, usedIn: ['پنل مشتری › سفارش جاری', 'پیامک درخواست تصمیم', 'لغو خودکار'], history: [] },
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
  people: makePeople(), peopleCfg: makePeopleConfig(), vault: makeVault(), opts: makeOptions(), axes: makeAxes(), orderEvents: makeOrderEvents(), contentQueue: makeContentQueue(),
  // دسترسی اختصاصی هر عضو: ماژول‌های افزوده یا گرفته‌شده نسبت به نقش او
  access: { u5: { add: ['conversations'], remove: [] } } as Record<string, { add: string[]; remove: string[] }>,
  team: [
    { id: 'u1', name: 'بهراد', role: 'super', phone: '09000000001', status: 'آنلاین', twoFA: true },
    { id: 'u2', name: 'نیما', role: 'ops', phone: '09000000002', status: 'آنلاین', twoFA: true },
    { id: 'u3', name: 'آرش', role: 'simple', phone: '09000000003', status: 'آنلاین', twoFA: false },
    { id: 'u4', name: 'کاک هیوا', role: 'partner', phone: '09000000004', status: 'آفلاین', twoFA: false },
    { id: 'u5', name: 'سارا', role: 'support', phone: '09000000005', status: 'آنلاین', twoFA: true },
    { id: 'u6', name: 'مریم', role: 'finance', phone: '09000000006', status: 'استراحت', twoFA: true },
    { id: 'u7', name: 'پویا', role: 'growth', phone: '09000000007', status: 'آنلاین', twoFA: true },
    { id: 'u8', name: 'هستی', role: 'qc', phone: '09000000008', status: 'آنلاین', twoFA: false },
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
    { at: ago(60 * 3), who: 'بهراد', action: 'مشاهدهٔ دادهٔ حساس', target: 'شمارهٔ موبایل c1', before: '-', after: '-', ai: false },
    { at: ago(60 * 5), who: 'کاک هیوا', action: 'تغییر موجودی', target: 'Kindle Paperwhite / انبار مهاباد', before: '۹', after: '۷', ai: false },
  ],
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
    address: 'تهران، خیابان ولیعصر، خیابان نمونه، پلاک ۰، واحد ۰', postalCode: '1500000000', phone: '021-00000000', website: 'ghanimat.example',
    seal: '' as string, signature: '' as string, assumed: true,
  },
  warehouses: [
    { id: 'tehran', name: 'انبار تهران', owner: 'غنیمت', province: 'تهران', city: 'تهران', district: 'منطقهٔ نمونه', street: 'خیابان اصلی نمونه', alley: 'کوچهٔ نمونه', plaque: '۰', postalCode: '1500000001', phone: '021-00000001', manager: 'نیما', services: 'تحویل سریع و ارسال پستی', assumed: true },
    { id: 'mahabad', name: 'انبار مهاباد', owner: 'شریک انبار مهاباد', province: 'آذربایجان غربی', city: 'مهاباد', district: 'محلهٔ نمونه', street: 'خیابان اصلی نمونه', alley: 'کوچهٔ نمونه', plaque: '۰', postalCode: '5900000001', phone: '044-00000001', manager: 'کاک هیوا', services: 'فقط ارسال پستی', assumed: true },
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
  docOverrides: {} as Record<string, { html: string; at: string }>,
  newsletter: makeNewsletter(),
  articleBlocks: {} as Record<string, { id: string; t: string; v: string; href?: string; w?: number; h?: number }[]>,
  smsLog: [
    { id: 'sm1', to: '09123456789', customerId: 'c1', kind: 'وضعیت سفارش', ref: 'GH-10458', text: 'غنیمت: سفارش GH-10458 تحویل پیک شد. پیک: علی رضایی، پلاک ۲۲ ب ۳۴۵ ایران ۱۰. رصد: ghanimat.example/t/10458', status: 'تحویل شد', at: ago(60 * 3) },
    { id: 'sm2', to: '09351234567', customerId: 'c2', kind: 'دریافت حضوری', ref: 'GH-10480', text: 'غنیمت: سفارش شما در شعبهٔ ونک آماده است. زمان مراجعه: فردا ساعت ۱۷ تا ۱۹. کد تحویل: 4821', status: 'تحویل شد', at: ago(60 * 5) },
    { id: 'sm3', to: '09120000003', customerId: 'c3', kind: 'کد ورود', ref: '', text: 'کد ورود شما به غنیمت: 52817', status: 'ارسال‌نشده (خطای اپراتور)', at: ago(60 * 9) },
  ] as { id: string; to: string; customerId?: string; kind: string; ref: string; text: string; status: string; at: string }[],
  settleDue: {} as Record<string, string>,
  settlements: { 'GH-10458': { amount: 29850000, at: '2026-10-26T10:00:00+03:30', ref: 'MLT-77120' }, 'GH-10412': { amount: 29205000, at: ago(60 * 24 * 27), ref: 'ZP-55021' } } as Record<string, { amount: number; at: string; ref: string }>,
  packagingCost: 25000,
  docSettings: {} as Record<string, { paper?: string; font?: number; margin?: number; footer?: string; seal?: boolean; hide?: string[] }>,
  codeFormat: { product: 'GH-P-', unit: 'GH-U-', pDigits: 6, uDigits: 7, nextProduct: 110, nextUnit: 20480 },
  trash: [] as TrashItem[],
  reasons: [
    { id: 'rs1', kind: 'return', ref: 'RT-838745', status: 'رد مرجوعی', reason: 'سریال کالای برگشتی با واحد ارسالی مطابقت ندارد؛ عکس‌های پیش از ارسال پیوست شد.', visible: true, by: 'مریم', at: ago(60 * 30) },
    { id: 'rs2', kind: 'warranty', ref: 'GR-1840', status: 'نیازمند اصلاح یا مدارک', reason: 'برای بررسی، تصویر کالا و برچسب جعبه را پیوست کنید.', visible: true, by: 'نیما', at: ago(60 * 5) },
  ] as { id: string; kind: string; ref: string; status: string; reason: string; visible: boolean; by: string; at: string; editedAt?: string }[],
  site: makeSite(),
  sitePublished: makeSite(),
  siteVersions: [{ id: 'v1', at: ago(60 * 24 * 3), by: 'بهراد', note: 'نسخهٔ اولیهٔ سایت' }] as { id: string; at: string; by: string; note: string; data?: ReturnType<typeof makeSite> }[],
  layout: makeLayout(),
  moves: [
    { id: 'mv1', at: ago(25), who: 'نیما', kind: 'ورود', unit: 'GU-20413', product: 'p1', from: 'رسید', to: 'QC-1', read: false },
    { id: 'mv2', at: ago(90), who: 'نیما', kind: 'جابه‌جایی', unit: 'GU-20412', product: 'p1', from: 'A-02', to: 'A-03', read: false },
    { id: 'mv3', at: ago(60 * 5), who: 'کاک هیوا', kind: 'ورود', unit: '', product: 'p8', from: 'رسید', to: 'M-08', qty: 6, read: true },
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
    ['GH-10495', 'c1', 'حضوری در شعبه', 'شعبهٔ ونک', 'پرداخت حضوری (کارت‌خوان)', 'p9', 3000000, 'order.delivered'],
  ]
  rows.forEach(([id, cid, ch, handle, pay, pid, total, status], i) => {
    const o = structuredClone(base)
    Object.assign(o, { id, customerId: cid, channel: ch, pay, total, discount: 0, status, buyer: 'person', legalId: undefined, invoiceNo: undefined, createdAt: new Date(Date.now() - (i + 1) * 95 * 6e4).toISOString(), tags: [ch, `شناسه: ${handle}`] })
    o.shipments = [{ ...structuredClone(base.shipments[0]), id: `${id}-1`, status: status === 'order.delivered' ? 'ship.delivered' : status === 'order.shipped' ? 'ship.in_transit' : 'ship.pending', method: ch === 'حضوری در شعبه' ? 'دریافت حضوری از شعبه' : 'پست پیشتاز', packPhotos: [], courier: null, sla: new Date(Date.now() + (status === 'order.delivered' ? -5 * 36e5 : (i * 55 + 35) * 6e4)).toISOString(), items: [{ productId: pid, unitId: '', qty: 1, price: total }] }]
    s.orders.unshift(o)
    s.txns.unshift({ ...s.txns[0], id: `TX-S${i}`, orderId: id, amount: total, gateway: pay, ref: '', status: ['order.awaiting_payment'].includes(status) ? 'pay.unknown' : 'pay.success', at: o.createdAt })
  })
  const cr = s.bank.credits.find((c) => c.id === 'CR-1'); if (cr) cr.matched = 'GH-10490'
  // پیوست نمونه در تیکت: عکس جعبهٔ مشتری و پیام صوتی
  { const t = s.tickets.find((x) => x.id === 'TK-482106'); if (t) { t.messages[0].atts = [{ kind: 'image', src: './products/p2-500.webp', name: 'جعبه-باز-شده.jpg', size: 412000 }, { kind: 'voice', src: '', name: 'پیام صوتی', dur: 14 }] } }
  // سفارش سایتی با دریافت حضوری که آماده شده و مشتری هنوز نیامده است
  { const o = structuredClone(base); Object.assign(o, { id: 'GH-10497', customerId: 'c2', channel: 'سایت', pay: 'زرین‌پال', total: 32900000, discount: 0, status: 'order.pickup_ready', buyer: 'person', legalId: undefined, invoiceNo: undefined, createdAt: new Date(Date.now() - 7 * 36e5).toISOString(), tags: ['دریافت حضوری'] })
    o.shipments = [{ ...structuredClone(base.shipments[0]), id: 'GH-10497-1', warehouse: 'tehran', method: 'دریافت حضوری از شعبه', status: 'ship.pickup_ready', sla: new Date(Date.now() + 70 * 36e5).toISOString(), packPhotos: [{ src: './products/p6-500.webp', at: new Date(Date.now() - 3 * 36e5).toISOString(), by: 'آرش' }], courier: null, tracking: '', allocReason: 'مشتری دریافت حضوری از شعبهٔ ونک را انتخاب کرد.', items: [{ productId: 'p6', unitId: '', qty: 1, price: 32900000 }] }]
    s.orders.unshift(o); s.txns.unshift({ ...s.txns[0], id: 'TX-S97', orderId: 'GH-10497', amount: 32900000, gateway: 'زرین‌پال', ref: '48120117745', status: 'pay.success', at: o.createdAt }) }
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
  return s
}
export type DB = ReturnType<typeof makeSeedBase>
