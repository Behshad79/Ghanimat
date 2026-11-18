// گردش کار پرونده‌های مرجوعی و گارانتی: مرحله‌ها، اینکه توپ در زمین کیست و قدم بعدی چیست
import type { Ret, War } from '@/shared/data/seed'

export type Who = 'ما' | 'مشتری' | 'پیک' | 'مالی' | 'مرکز خدمات' | '—'
export type Stage = { step: number; who: Who; next: string }

export const RETURN_STEPS = ['ثبت درخواست', 'بررسی درخواست', 'بازگشت کالا', 'دریافت در انبار', 'بازرسی و تصمیم', 'واریز یا بازگرداندن کالا', 'بسته شد']
export const WARRANTY_STEPS = ['ثبت درخواست', 'بررسی اولیه', 'دریافت کالا', 'عیب‌یابی', 'تعمیر، تعویض یا بازگشت مبلغ', 'ارسال به مشتری', 'بسته شد']

export const METHODS: Record<string, { label: string; desc: string }> = {
  courier: { label: 'پیک غنیمت دریافت می‌کند', desc: 'برای تهران و کرج؛ پیک در زمان هماهنگ‌شده کالا را از مشتری تحویل می‌گیرد.' },
  post: { label: 'مشتری با پست می‌فرستد', desc: 'برچسب مرجوعی با نشانی انبار برای مشتری پیامک می‌شود و مشتری کد رهگیری را ثبت می‌کند.' },
  inperson: { label: 'تحویل حضوری در شعبه', desc: 'مشتری کالا را به شعبه یا انبار می‌آورد و همان‌جا رسید می‌گیرد.' },
}
export const SHIP_BACK = ['پست پیشتاز', 'تیپاکس', 'پیک غنیمت', 'تحویل حضوری']
export const REFUND_DEST = ['کیف پول غنیمت', 'کارت بانکی (شبا)', 'درگاه پرداخت اصلی']

/** مرجوعی بسته شده است؟ (رد پیش از ارسال کالا هم بسته حساب می‌شود) */
export const retClosed = (r: Ret) => ['return.refunded', 'return.sent_back', 'return.expired', 'return.cancelled'].includes(r.status) || (r.status === 'return.rejected' && !r.receipt)
export const warClosed = (w: War) => ['warranty.done', 'warranty.rejected', 'warranty.refunded'].includes(w.status)

export function retStage(r: Ret): Stage {
  if (retClosed(r)) return { step: 6, who: '—', next: 'پرونده بسته شده است' }
  switch (r.status) {
    case 'return.registered': return { step: 1, who: 'ما', next: 'بررسی درخواست و تعیین روش بازگشت کالا' }
    case 'return.awaiting_customer': return { step: 2, who: 'مشتری', next: 'منتظر ارسال کالا و ثبت کد رهگیری' }
    case 'return.pickup_scheduled': return { step: 2, who: 'پیک', next: 'پیک غنیمت کالا را از مشتری تحویل بگیرد' }
    case 'return.awaiting_pickup': return { step: 3, who: 'مشتری', next: 'مشتری کالا را به شعبه بیاورد؛ رسید دریافت ثبت شود' }
    case 'return.in_transit': return { step: 3, who: 'ما', next: 'ثبت رسید دریافت کالا در انبار' }
    case 'return.inspecting': return { step: 4, who: 'ما', next: 'بازرسی کالا و اعلام نتیجه' }
    case 'return.approved': return { step: 5, who: 'مالی', next: 'تأیید نفر دوم برای بازگشت وجه' }
    case 'return.refunding': case 'return.partial': case 'return.approved_deducted': return { step: 5, who: 'مالی', next: 'واریز مبلغ و ثبت شمارهٔ پیگیری' }
    case 'return.rejected': return { step: 5, who: 'ما', next: 'بازگرداندن کالا به مشتری و ثبت کد رهگیری' }
    default: return { step: 1, who: 'ما', next: 'بررسی درخواست' }
  }
}

export function warStage(w: War): Stage {
  if (warClosed(w)) return { step: 6, who: '—', next: 'پرونده بسته شده است' }
  switch (w.status) {
    case 'warranty.pending': return { step: 1, who: 'ما', next: 'بررسی پوشش گارانتی و تعیین روش ارسال کالا' }
    case 'warranty.approved': return { step: 2, who: 'مشتری', next: 'منتظر ارسال کالا توسط مشتری' }
    case 'warranty.in_transit': return { step: 2, who: 'ما', next: 'ثبت رسید دریافت کالا' }
    case 'warranty.received': return { step: 3, who: 'ما', next: 'عیب‌یابی و انتخاب راه‌حل' }
    case 'warranty.repairing': return { step: 4, who: 'ما', next: 'پایان تعمیر را ثبت کنید' }
    case 'warranty.external': return { step: 4, who: 'مرکز خدمات', next: 'منتظر بازگشت کالا از مرکز خدمات' }
    case 'warranty.ready': case 'warranty.replaced': return { step: 5, who: 'ما', next: 'ارسال کالا به مشتری و ثبت کد رهگیری' }
    case 'warranty.shipping_back': return { step: 5, who: 'پیک', next: 'ثبت تحویل به مشتری' }
    default: return { step: 1, who: 'ما', next: 'بررسی درخواست' }
  }
}

/** صف‌های فهرست: برای فیلتر سریع بالای جدول */
export const QUEUES: [string, string][] = [['all', 'همه'], ['us', 'نیازمند اقدام ما'], ['customer', 'منتظر مشتری'], ['transit', 'در راه'], ['money', 'واریز'], ['closed', 'بسته‌شده']]
export function inQueue(q: string, s: Stage) {
  if (q === 'all') return true
  if (q === 'closed') return s.step === 6
  if (q === 'us') return s.who === 'ما'
  if (q === 'customer') return s.who === 'مشتری'
  if (q === 'transit') return s.who === 'پیک' || s.who === 'مرکز خدمات'
  if (q === 'money') return s.who === 'مالی'
  return true
}
