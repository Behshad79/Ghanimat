// قانون‌های تخفیف شرطی، فروش ویژهٔ تایمردار و کمپین‌های UTM
export type Cond = { k: string; op: string; v: string }
export type Promo = { id: string; name: string; conds: Cond[]; action: string; value: number; start: string; end: string; budget: number; used: number; stack: boolean; active: boolean }
export const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
export const makePromos = () => ({
  rules: [
    { id: 'pr1', name: 'ارسال رایگان خرید اول بالای ۵ میلیون در لوازم جانبی', conds: [{ k: 'first', op: '=', v: 'بله' }, { k: 'cart', op: '≥', v: '5000000' }, { k: 'cat', op: 'در', v: 'لوازم جانبی' }], action: 'freeship', value: 0, start: day(-3), end: day(20), budget: 20000000, used: 6400000, stack: true, active: true },
    { id: 'pr2', name: 'کش‌بک ۳٪ پرداخت با کیف پول', conds: [{ k: 'pay', op: '=', v: 'کیف پول' }], action: 'cashback', value: 3, start: day(-10), end: day(5), budget: 50000000, used: 31000000, stack: false, active: true },
  ] as Promo[],
  flash: [{ id: 'fs1', name: 'غنی‌آف هدفون', products: ['p2', 'p5'], pct: 20, start: new Date().toISOString(), end: new Date(Date.now() + 18 * 36e5).toISOString(), cap: 5, sold: 2, active: true }],
  utm: [
    { id: 'u1', source: 'instagram', medium: 'story', campaign: 'yalda-headphones', code: 'YALDA20', spend: 18000000, orders: 14, revenue: 312000000, newCustomers: 9 },
    { id: 'u2', source: 'torob', medium: 'cpc', campaign: 'always-on', code: '', spend: 26000000, orders: 22, revenue: 488000000, newCustomers: 15 },
    { id: 'u3', source: 'sms', medium: 'blast', campaign: 'stock-week', code: 'WEEK15', spend: 4100000, orders: 6, revenue: 74000000, newCustomers: 1 },
    { id: 'u4', source: 'google', medium: 'organic', campaign: '-', code: '', spend: 0, orders: 31, revenue: 612000000, newCustomers: 21 },
    { id: 'u5', source: 'telegram', medium: 'channel', campaign: 'unboxing', code: 'TG10', spend: 6000000, orders: 4, revenue: 41000000, newCustomers: 3 },
  ],
})

