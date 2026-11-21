// کالاهای در راه: خریدی که هنوز نرسیده (آمازون، اربیل و…) تا در فاصلهٔ رسیدن، صفحهٔ کالا، محتوا و «به‌زودی» از قبل آماده شود
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
export const IN_STAGES = ['خرید شد', 'در انبار مبدأ', 'در مسیر اربیل', 'رسیده به اربیل', 'در مرز', 'ترخیص شد', 'رسید به انبار'] as const
export const IN_ROUTES = ['آمازون → اربیل → مرز', 'خرید مستقیم اربیل', 'خرید مستقیم سلیمانیه', 'دبی → بندر', 'خرید داخلی (تأمین‌کنندهٔ ایران)'] 
/** تنوع خریداری‌شده (مثلاً «مشکی» ۳ عدد یا «۱۲۸ گیگ» ۴ عدد) با تقسیم بین انبارها؛ suffix روی برچسب می‌نشیند */
/** سهم هر مالک در هر انبار: «۲ عدد مال یاسین، دست بهشاد در تهران» یعنی { owner: 'ys', wh: 'tehran', qty: 2 } */
export type Alloc = { owner: string; wh: string; qty: number }
export type InVariant = { id: string; label: string; qty: number; suffix: string; split?: Record<string, number>; opts?: Record<string, string>; alloc?: Alloc[] }
export type InItem = { id: string; name: string; qty: number; unitCost?: number; color?: string; amazonUrl?: string; productId?: string; note?: string; arrived?: { qty: number; ean?: string; code?: string; color?: string; note?: string; at: string }
  /** مالک کالا (پیشوند برچسب)، کد داخلی رزروشده، تنوع‌ها و تقسیم انبار، قیمت پیشنهادی فروش، محل خرید، مشخصات و عکس‌ها */
  owner?: string; code?: string; variants?: InVariant[]; split?: Record<string, number>; alloc?: Alloc[]; attrs?: { name: string; values: string[] }[]; sellPrice?: number; source?: string; specs?: string; photos?: string[]; brand?: string; category?: string; by?: string; at?: string
  /** موجودی رسیده به هر انبار (بعد از ثبت رسید) */
  landedAt?: Record<string, number> }
/** پولی که هر نفر برای این خرید به خریدار داده (یا خود خریدار از جیبش گذاشته)؛ هر ردیف ارز خودش را دارد (بی‌ارز = ارز محموله) و rate نرخ تومانی آن ارز است */
export type Fund = { id: string; party: string; amount: number; cur?: string; rate?: number; at: string; via?: string; note?: string; by?: string }
/** توضیح اختلاف پول و کالا برای یک نفر: خرج سفر، کارمزد، پول برگشتی، برداشت شخصی خریدار و…؛ مبلغ به ارز محموله */
export type FundAdj = { id: string; party: string; amount: number; kind: string; note?: string; at: string; by?: string }
export type InBatch = { funding?: Fund[]; adjusts?: FundAdj[]; recon?: { at: string; by: string; note?: string }; single?: boolean; buyer?: string; landing?: string; by?: string; id: string; title: string; route: string; supplier?: string; orderedAt: string; eta: string; stage: string; items: InItem[]; note?: string; receivedAt?: string; currency?: string; rate?: number; freight?: number; customs?: number; other?: number; paid?: number; trade?: { ntsw?: string; sata?: string; kotaj?: string; customsValue?: number; duties?: number; customsVat?: number; nwms?: string } }

export function makeIncoming(): InBatch[] {
  return [
    { id: 'IN-1405-Y1', title: 'خرید یاسین از اربیل · آذر', buyer: 'ys', landing: 'mahabad', by: 'یاسین', route: 'خرید مستقیم اربیل', supplier: 'بازار اربیل (مجیدی‌مال) و آمازون', orderedAt: day(-3), eta: day(4), stage: 'در مرز', currency: 'دلار', rate: 68900, freight: 18000000, customs: 24000000, other: 3000000, paid: 0, note: 'یاسین خودش همراه بار است؛ از مرز باشماق تا مهاباد',
      funding: [{ id: 'f1', party: 'gh', amount: 3400, at: day(-5), via: 'حوالهٔ صرافی اربیل', note: 'بهشاد برای سهم غنیمت', by: 'بهشاد' }, { id: 'f2', party: 'ys', amount: 1000, at: day(-4), via: 'نقد', note: 'سرمایهٔ خود یاسین برای کالاهای Ve1', by: 'یاسین' }, { id: 'f3', party: 'ys', amount: 34450000, cur: 'تومان', rate: 1, at: day(-4), via: 'کارت به کارت', note: 'بقیهٔ سهم یاسین به تومان', by: 'یاسین' }],
      adjusts: [{ id: 'a1', party: 'gh', amount: 200, kind: 'خرج سفر و اقامت', note: 'سهم غنیمت از هزینهٔ رفت‌وآمد و هتل اربیل', at: day(-3), by: 'یاسین' }],
      items: [
        { id: 'ii20', name: 'گوشی سامسونگ Galaxy A55 5G', qty: 7, owner: 'gh', code: 'GH-P-000401', unitCost: 365, sellPrice: 31900000, source: 'بازار اربیل', brand: 'سامسونگ', category: 'گوشی موبایل', amazonUrl: 'https://www.amazon.com/dp/B0CWL5JRN8', specs: '۸ گیگ رم، دو سیم‌کارت، کارتن پلمب', by: 'یاسین', at: day(-3),
          variants: [{ id: 'v1', label: 'مشکی · ۱۲۸ گیگ', qty: 3, suffix: 'V1', split: { tehran: 3 } }, { id: 'v2', label: 'آبی روشن · ۲۵۶ گیگ', qty: 4, suffix: 'V2', split: { tehran: 2, mahabad: 2 } }] },
        { id: 'ii21', name: 'اسپیکر بلوتوثی JBL Flip 6', qty: 8, owner: 'ys', code: 'GH-P-000402', unitCost: 89, sellPrice: 7900000, source: 'آمازون', brand: 'جی‌بی‌ال', category: 'اسپیکر', amazonUrl: 'https://www.amazon.com/dp/B09GJVTRNZ', by: 'یاسین', at: day(-3),
          variants: [{ id: 'v1', label: 'مشکی', qty: 5, suffix: 'V1', split: { mahabad: 3, tehran: 2 } }, { id: 'v2', label: 'قرمز', qty: 3, suffix: 'V2', split: { mahabad: 3 } }] },
        { id: 'ii22', name: 'ردیاب اپل AirTag بستهٔ ۴ عددی', qty: 6, owner: 'gh', code: 'GH-P-000403', unitCost: 95, sellPrice: 8400000, source: 'فروشگاه رسمی', brand: 'اپل', category: 'لوازم جانبی', split: { tehran: 6 }, by: 'یاسین', at: day(-3) },
        { id: 'ii23', name: 'ساعت هوشمند Garmin Forerunner 265', qty: 2, owner: 'ys', code: 'GH-P-000404', unitCost: 410, sellPrice: 36500000, source: 'آمازون', brand: 'گارمین', category: 'ساعت هوشمند', specs: 'سایز ۴۶ میلی‌متر، صفحهٔ AMOLED', split: { mahabad: 2 }, by: 'یاسین', at: day(-3) },
      ] },
    { id: 'IN-1405-B1', title: 'خرید بهشاد از یوسف', buyer: 'gh', landing: 'tehran', by: 'بهشاد', route: 'خرید داخلی (تأمین‌کنندهٔ ایران)', supplier: 'یوسف', orderedAt: day(-1), eta: day(2), stage: 'خرید شد', currency: 'تومان', rate: 1, paid: 74000000, funding: [{ id: 'f1', party: 'gh', amount: 74000000, at: day(-1), via: 'کارت به کارت', by: 'بهشاد' }], recon: { at: day(-1), by: 'بهشاد', note: 'فاکتور یوسف با پرداخت یکی است' },
      items: [{ id: 'ii24', name: 'هدفون سونی WH-1000XM5', qty: 4, owner: 'gh', code: 'GH-P-000405', unitCost: 18500000, sellPrice: 22900000, source: 'یوسف', brand: 'سونی', category: 'هدفون', by: 'بهشاد', at: day(-1),
        variants: [{ id: 'v1', label: 'مشکی', qty: 2, suffix: 'V1', split: { tehran: 2 } }, { id: 'v2', label: 'نقره‌ای', qty: 2, suffix: 'V2', split: { tehran: 1, mahabad: 1 } }] }] },
    { id: 'IN-1405-08', title: 'خرید آمازون آبان', route: 'آمازون → اربیل → مرز', supplier: 'انبار آمازون اربیل', orderedAt: day(-6), eta: day(20), stage: 'در مسیر اربیل', currency: 'دلار', rate: 61500, freight: 42000000, customs: 65000000, other: 8000000, paid: 400000000, note: 'بار هوایی تا اربیل، بعد زمینی تا مرز باشماق',
      items: [
        { id: 'ii1', name: 'AirPods Pro 2 (USB-C)', qty: 30, unitCost: 189, amazonUrl: 'https://www.amazon.com/dp/B0CHWRXH8B', productId: 'pin1' },
        { id: 'ii2', name: 'Kindle Paperwhite 16GB', qty: 20, unitCost: 149, amazonUrl: 'https://www.amazon.com/dp/B09TMN58KL' },
        { id: 'ii3', name: 'Apple Watch SE 2 44mm', qty: 15, unitCost: 219 },
        { id: 'ii4', name: 'Logitech MX Master 3S', qty: 20, unitCost: 89, amazonUrl: 'https://www.amazon.com/dp/B09HM94VDS' },
        { id: 'ii5', name: 'Anker 737 Power Bank', qty: 15, unitCost: 79 },
      ] },
    { id: 'IN-1405-09', title: 'خرید مستقیم اربیل (لوازم جانبی)', route: 'خرید مستقیم اربیل', supplier: 'نمایندگی اربیل', orderedAt: day(-1), eta: day(9), stage: 'خرید شد',
      items: [{ id: 'ii6', name: 'شارژر ۳۵ وات اپل دوپورت', qty: 40, unitCost: 62000 }, { id: 'ii7', name: 'کابل USB-C به لایتنینگ ۱ متری اپل', qty: 60, unitCost: 38000 }], currency: 'دینار', rate: 47, freight: 9000000, customs: 6000000, other: 2000000, paid: 0 },
    { id: 'IN-1405-06', title: 'خرید آمازون شهریور', route: 'آمازون → اربیل → مرز', supplier: 'انبار آمازون اربیل', orderedAt: day(-75), eta: day(-45), stage: 'رسید به انبار', receivedAt: day(-44), currency: 'دلار', rate: 58200, freight: 38000000, customs: 52000000, other: 6000000, paid: 853182000,
      items: [
        { id: 'ii8', name: 'iPhone 16 Pro 256GB', qty: 6, unitCost: 1520, productId: 'p1', arrived: { qty: 6, at: day(-44) } },
        { id: 'ii9', name: 'AirPods Max 2024', qty: 8, unitCost: 230, productId: 'p2', arrived: { qty: 8, at: day(-44) } },
        { id: 'ii10', name: 'Apple Watch Series 10', qty: 5, unitCost: 410, productId: 'p4', arrived: { qty: 5, at: day(-44) } },
      ] },
  ]
}
