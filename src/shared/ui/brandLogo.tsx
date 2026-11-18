// لوگوی بانک‌ها، درگاه‌ها، اپ‌ها، شبکه‌ها و نهادهای ایرانی؛ از روی نام فارسی یا انگلیسی پیدا می‌شود
import { cx } from './base'

/** [کلیدهای قابل تشخیص در متن, نام فایل در public/logos] — ترتیب مهم است: نام‌های بلندتر و خاص‌تر اول */
const MAP: [string[], string][] = [
  // درگاه‌ها و پرداخت
  [['زرین‌پال', 'زرین پال', 'zarinpal'], 'zarinpal'], [['زیبال', 'zibal'], 'zibal'], [['آیدی‌پی', 'آیدی پی', 'idpay'], 'idpay'], [['پی‌پینگ', 'پی پینگ', 'payping'], 'pay-ping'],
  [['وندار', 'vandar'], 'vandar'], [['سامان کیش', 'سامان‌کیش', 'sep', 'سپ'], 'saman-kish'], [['سداد', 'sadad', 'بانک ملی (سداد)'], 'sadad'], [['آسان پرداخت', 'آسان‌پرداخت', 'asanpardakht'], 'asan-pardakht'],
  [['دیجی‌پی', 'دیجی پی', 'digipay'], 'digipay'], [['اسنپ‌پی', 'اسنپ پی', 'snappay', 'snap pay'], 'snap-pay'], [['شاپرک', 'shaparak'], 'shaparak'], [['پی‌فا', 'پی فا', 'payfa'], 'payfa'],
  [['نکست‌پی', 'نکست پی', 'nextpay'], 'next-pay'], [['پپ', 'پاسارگاد (پپ)', 'pep'], 'pasargad-pep'],
  // اپ‌ها و بازارها
  [['دیجی‌کالا جت', 'دیجی کالا جت'], 'digikala-jet'], [['دیجی‌کالا', 'دیجی کالا', 'digikala'], 'digikala'], [['ترب', 'torob'], 'torob'], [['باسلام', 'basalam'], 'basalam'], [['دیوار', 'divar'], 'divar'],
  [['شیپور', 'sheypoor'], 'sheypoor'], [['اسنپ‌فود', 'اسنپ فود'], 'snapp-food'], [['اسنپ‌باکس', 'اسنپ باکس', 'اسنپ', 'snapp', 'snap'], 'snap'], [['تپسی', 'tapsi'], 'tapsi'], [['نشان', 'neshan'], 'neshan'],
  [['ازکی', 'azki'], 'azki'], [['خانومی', 'khanoumi'], 'khanoumi'], [['علی‌بابا', 'علی بابا', 'alibaba'], 'alibaba'], [['جاباما', 'jabama'], 'jabama'],
  // شبکه‌ها و نهادها
  [['بله', 'bale'], 'bale'], [['نزدیکا'], 'nazdika-w'], [['اینماد', 'نماد اعتماد', 'enamad'], 'enamad'], [['پست پیشتاز', 'پست سفارشی', 'شرکت پست', 'پست'], 'post'], [['استاندارد'], 'standard'], [['مخابرات'], 'mokhaberat'],
  // بانک‌ها
  [['پست بانک'], 'post-bank'], [['بلوبانک', 'بلو بانک', 'بلو'], 'blu-bank'], [['ملت', 'mellat'], 'mellat'], [['ملی', 'melli'], 'melli'], [['صادرات', 'saderat'], 'saderat'], [['تجارت', 'tejarat'], 'tejarat'],
  [['سامان', 'saman'], 'saman'], [['پاسارگاد', 'pasargad'], 'pasargad'], [['پارسیان', 'parsian'], 'parsian'], [['سپه', 'sepah'], 'sepah'], [['رفاه', 'refah'], 'refah'], [['کشاورزی', 'keshavarzi'], 'keshavarzi'],
  [['مسکن', 'maskan'], 'maskan'], [['شهر', 'shahr'], 'shahr'], [['بانک دی', 'دی'], 'dey'], [['سینا', 'sina'], 'sina'], [['آینده', 'ayandeh'], 'ayandeh'], [['اقتصاد نوین', 'eghtesad'], 'eghtesad-novin'],
  [['کارآفرین', 'karafarin'], 'karafarin'], [['رسالت', 'resalat'], 'resalat'], [['قوامین'], 'ghavamin'], [['ایران زمین'], 'iran-zamin'], [['سرمایه'], 'sarmayeh'], [['گردشگری'], 'gardeshgari'], [['خاورمیانه'], 'khavar-mianeh'],
  [['توسعه تعاون', 'توسعهٔ تعاون'], 'tosee-taavon'], [['صنعت و معدن'], 'sanat-madan'], [['مهر ایران'], 'mehr-iran'], [['کوثر'], 'kosar'], [['ملل'], 'melall'], [['حکمت'], 'hekmat'], [['انصار'], 'ansar'], [['کاسپین'], 'caspian'], [['نور'], 'noor'], [['مرکزی'], 'markazi'],
]
const norm = (t: string) => t.replace(/‌/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const SHORT = new Set(['دی', 'نور', 'شهر', 'پست', 'سپ', 'پپ', 'بله', 'ملی', 'ملل', 'ترب', 'نشان', 'اسنپ', 'بلو'])
/** نام فایل لوگو برای یک متن (مثلاً «درگاه زرین‌پال» یا «کارت بانک ملت»)؛ برای کلیدهای کوتاه فقط تطبیق کلمهٔ کامل */
export function logoOf(text?: string): string | null {
  if (!text) return null; const t = ` ${norm(text)} `
  if (/ملی پیامک|کاوه|نجوا|ملی پی|پیامک/.test(t)) return null
  for (const [keys, file] of MAP) for (const k of keys) { const kk = norm(k); if (SHORT.has(k) ? new RegExp(`[\\s(«"]${kk}[\\s)»".،,:]`).test(t) : t.includes(kk)) return file }
  return null
}
/** لوگو با نام؛ اگر پیدا نشد، حرف اول در دایره (برای اینستاگرام، واتساپ و…) */
export function BrandLogo({ name, size = 20, white, className, fallback = true }: { name?: string; size?: number; white?: boolean; className?: string; fallback?: boolean }) {
  const f = logoOf(name)
  if (!f) return fallback && name ? <span aria-hidden className={cx('inline-grid shrink-0 place-items-center rounded-md bg-neutral-bg font-bold text-t2', className)} style={{ width: size, height: size, fontSize: size * 0.5 }}>{name.trim()[0]}</span> : null
  const src = `./logos/${white && !f.endsWith('-w') ? `${f}-w` : f}.png`
  return <img src={src} alt="" aria-hidden loading="lazy" className={cx('inline-block shrink-0 rounded-md object-contain', className)} style={{ width: size, height: size }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
}
/** نام همراه لوگو؛ برای ستون‌های جدول و برچسب‌ها */
export function WithLogo({ name, size = 18, children }: { name: string; size?: number; children?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5"><BrandLogo name={name} size={size} fallback={false} />{children ?? name}</span>
}
