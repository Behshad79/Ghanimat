// گزینه‌های قابل ویرایش فرم‌ها (منبع تأمین، وضعیت، گرید، مسیر واردات…) و محورهای تنوع کالا (رنگ، حافظه، جنس، سایز)
export type Opt = { v: string; l: string; hex?: string; note?: string }
export const makeOptions = () => ({
  source: [{ v: 'amazon', l: 'انبارگردانی آمازون', note: 'ارسال از مبدأ آمازون' }, { v: 'kurdistan', l: 'خرید مستقیم اقلیم کردستان', note: 'خرید مستقیم اقلیم کردستان' }, { v: 'uae', l: 'خرید عمده از دبی', note: 'وارداتی از امارات' }] as Opt[],
  condition: [{ v: 'sealed', l: 'اکبند - پلمپ' }, { v: 'openbox', l: 'جعبه‌باز' }, { v: 'used', l: 'استوک - تست‌شده' }, { v: 'refurb', l: 'بازسازی‌شده (ریفربیش)' }] as Opt[],
  grade: [{ v: 'A+', l: 'A+' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'C', l: 'C' }] as Opt[],
  importRoute: ['آمازون خاورمیانه', 'فروشگاه آمازون عراق', 'آمازون امارات', 'شبکهٔ فروشندگان مرزی', 'تأمین داخلی'].map((l) => ({ v: l, l })) as Opt[],
  flawStatus: ['سالم', 'بدون خط‌وخش', 'خط‌وخش جزئی', 'نیاز به دقت', 'ایراد مشخص'].map((l) => ({ v: l, l })) as Opt[],
})
export type Options = ReturnType<typeof makeOptions>
export type VariantAxis = { id: string; name: string; kind: 'color' | 'text'; values: Opt[] }
export const makeAxes = (): VariantAxis[] => [
  { id: 'color', name: 'رنگ', kind: 'color', values: [{ v: 'black', l: 'مشکی', hex: '#1d1d1f' }, { v: 'white', l: 'سفید', hex: '#f5f5f7' }, { v: 'silver', l: 'نقره‌ای', hex: '#c9ccd1' }, { v: 'gray', l: 'خاکستری', hex: '#8e8e93' }, { v: 'titanium', l: 'تیتانیوم طبیعی', hex: '#bab4a8' }, { v: 'desert', l: 'طلایی صحرایی', hex: '#c8a98a' }, { v: 'blue', l: 'آبی', hex: '#3a5a8c' }, { v: 'midnight', l: 'سرمه‌ای', hex: '#232a3b' }] },
  { id: 'storage', name: 'حافظه', kind: 'text', values: [{ v: '128', l: '۱۲۸ گیگابایت' }, { v: '256', l: '۲۵۶ گیگابایت' }, { v: '512', l: '۵۱۲ گیگابایت' }, { v: '1tb', l: '۱ ترابایت' }] },
  { id: 'material', name: 'جنس و بافت', kind: 'text', values: [{ v: 'alu', l: 'آلومینیوم' }, { v: 'ti', l: 'تیتانیوم' }, { v: 'leather', l: 'چرم' }, { v: 'fabric', l: 'پارچه‌ای' }, { v: 'silicone', l: 'سیلیکون' }] },
  { id: 'size', name: 'سایز', kind: 'text', values: [{ v: '42', l: '۴۲ میلی‌متر' }, { v: '46', l: '۴۶ میلی‌متر' }] },
]
