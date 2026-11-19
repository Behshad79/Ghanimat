// کالاهای در راه: خریدی که هنوز نرسیده (آمازون، اربیل و…) تا در فاصلهٔ رسیدن، صفحهٔ کالا، محتوا و «به‌زودی» از قبل آماده شود
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
export const IN_STAGES = ['خرید شد', 'در انبار مبدأ', 'در مسیر اربیل', 'رسیده به اربیل', 'در مرز', 'ترخیص شد', 'رسید به انبار'] as const
export const IN_ROUTES = ['آمازون → اربیل → مرز', 'خرید مستقیم اربیل', 'خرید مستقیم سلیمانیه', 'دبی → بندر'] 
export type InItem = { id: string; name: string; qty: number; unitCost?: number; color?: string; amazonUrl?: string; productId?: string; note?: string; arrived?: { qty: number; ean?: string; code?: string; color?: string; note?: string; at: string } }
export type InBatch = { id: string; title: string; route: string; supplier?: string; orderedAt: string; eta: string; stage: string; items: InItem[]; note?: string; receivedAt?: string; currency?: string; rate?: number; freight?: number; customs?: number; other?: number; paid?: number; trade?: { ntsw?: string; sata?: string; kotaj?: string; customsValue?: number; duties?: number; customsVat?: number; nwms?: string } }

export function makeIncoming(): InBatch[] {
  return [
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
