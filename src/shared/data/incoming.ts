// کالاهای در راه: خریدی که هنوز نرسیده (آمازون، اربیل و…) تا در فاصلهٔ رسیدن، صفحهٔ کالا، محتوا و «به‌زودی» از قبل آماده شود
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
export const IN_STAGES = ['خرید شد', 'در انبار مبدأ', 'در مسیر اربیل', 'رسیده به اربیل', 'در مرز', 'ترخیص شد', 'رسید به انبار'] as const
export const IN_ROUTES = ['آمازون → اربیل → مرز', 'خرید مستقیم اربیل', 'خرید مستقیم سلیمانیه', 'دبی → بندر'] 
export type InItem = { id: string; name: string; qty: number; amazonUrl?: string; productId?: string; note?: string; arrived?: { qty: number; ean?: string; code?: string; color?: string; note?: string; at: string } }
export type InBatch = { id: string; title: string; route: string; supplier?: string; orderedAt: string; eta: string; stage: string; items: InItem[]; note?: string; receivedAt?: string }

export function makeIncoming(): InBatch[] {
  return [
    { id: 'IN-1405-08', title: 'خرید آمازون آبان', route: 'آمازون → اربیل → مرز', supplier: 'انبار آمازون اربیل', orderedAt: day(-6), eta: day(20), stage: 'در مسیر اربیل', note: 'بار هوایی تا اربیل، بعد زمینی تا مرز باشماق',
      items: [
        { id: 'ii1', name: 'AirPods Pro 2 (USB-C)', qty: 30, amazonUrl: 'https://www.amazon.com/dp/B0CHWRXH8B', productId: 'pin1' },
        { id: 'ii2', name: 'Kindle Paperwhite 16GB', qty: 20, amazonUrl: 'https://www.amazon.com/dp/B09TMN58KL' },
        { id: 'ii3', name: 'Apple Watch SE 2 44mm', qty: 15 },
        { id: 'ii4', name: 'Logitech MX Master 3S', qty: 20, amazonUrl: 'https://www.amazon.com/dp/B09HM94VDS' },
        { id: 'ii5', name: 'Anker 737 Power Bank', qty: 15 },
      ] },
    { id: 'IN-1405-09', title: 'خرید مستقیم اربیل (لوازم جانبی)', route: 'خرید مستقیم اربیل', supplier: 'نمایندگی اربیل', orderedAt: day(-1), eta: day(9), stage: 'خرید شد',
      items: [{ id: 'ii6', name: 'شارژر ۳۵ وات اپل دوپورت', qty: 40 }, { id: 'ii7', name: 'کابل USB-C به لایتنینگ ۱ متری اپل', qty: 60 }] },
  ]
}
