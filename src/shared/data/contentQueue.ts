// صف تولید محتوای شبکه‌های اجتماعی و ویدیوی بررسی برای هر کالا
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString()
export type ContentItem = { id: string; productId: string; channel: 'اینستاگرام' | 'تلگرام' | 'سایت' | 'آپارات'; kind: 'ریلز' | 'پست' | 'استوری' | 'ویدیوی بررسی' | 'آنباکسینگ'; status: 'ایده' | 'در تولید' | 'آماده انتشار' | 'منتشرشده'; due: string; owner: string; note?: string }
export const makeContentQueue = (): ContentItem[] => [
  { id: 'cq1', productId: 'p1', channel: 'اینستاگرام', kind: 'ریلز', status: 'آماده انتشار', due: d(1), owner: 'پویا', note: 'مقایسهٔ رنگ تیتانیوم طبیعی زیر نور روز' },
  { id: 'cq2', productId: 'p5', channel: 'اینستاگرام', kind: 'پست', status: 'در تولید', due: d(2), owner: 'پویا' },
  { id: 'cq3', productId: 'p3', channel: 'آپارات', kind: 'ویدیوی بررسی', status: 'ایده', due: d(6), owner: 'پویا', note: 'تست باتری و دمای M3 در کار روزمره' },
  { id: 'cq4', productId: 'p2', channel: 'اینستاگرام', kind: 'استوری', status: 'منتشرشده', due: d(-3), owner: 'پویا' },
  { id: 'cq5', productId: 'p7', channel: 'تلگرام', kind: 'پست', status: 'ایده', due: d(4), owner: 'پویا' },
]
