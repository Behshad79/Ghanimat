// گردش کار پرونده‌های مرجوعی و گارانتی، دقیقاً مطابق فیگمای پنل کاربری
// مرجوعی: Panel › سفارش‌های مرجوعی (7524:361204) و فرم درخواست در سفارش‌های تحویل‌شده (7524:330351)
// گارانتی: Panel › گارانتی‌ها (7524:393003)
import type { Ret, RetItem, War, WCard } from '@/shared/data/seed'

export type Who = 'ما' | 'مشتری' | 'پیک' | 'مالی' | '—'
export type Stage = { step: number; who: Who; next: string }

/** همان چهار مرحلهٔ «مراحل بعدی» در صفحهٔ ثبت مرجوعی مشتری */
export const RETURN_STEPS: [string, string][] = [['ثبت درخواست', 'توسط مشتری'], ['ارسال کالا به غنیمت', 'پیک، پست یا تحویل حضوری'], ['بررسی کالا', 'مرکز کنترل کیفیت'], ['نتیجه و بازگشت وجه', 'واریز یا ارسال مجدد']]
/** همان شش مرحلهٔ «مراحل رسیدگی» در جزئیات درخواست گارانتی */
export const WARRANTY_STEPS: [string, string][] = [['ثبت درخواست', 'توسط مشتری'], ['بررسی غنیمت', 'مدارک و شرایط'], ['تأیید', 'ایراد تحت پوشش'], ['ارسال کالا', 'توسط مشتری'], ['انجام خدمت', 'تعمیر، تعویض یا بازگشت مبلغ'], ['تکمیل', 'تحویل یا واریز']]

/** دلیل‌های مرجوعی در فرم مشتری؛ photo یعنی دست‌کم یک عکس لازم است */
export const RETURN_REASONS: { k: string; desc: string; photo: boolean }[] = [
  { k: 'ایراد کارکردی', desc: 'کالا روشن نمی‌شود یا درست کار نمی‌کند.', photo: true },
  { k: 'مغایرت با صفحهٔ کالا', desc: 'کالای دریافتی با تصاویر یا مشخصات صفحهٔ کالا فرق دارد.', photo: true },
  { k: 'کالای غیراصل', desc: 'تردید دارید کالا اصل باشد.', photo: true },
  { k: 'آسیب‌دیدگی حین حمل', desc: 'کالا یا جعبه هنگام ارسال آسیب دیده است.', photo: true },
  { k: 'انصراف از خرید', desc: 'کالا سالم است ولی از خرید منصرف شده‌اید.', photo: false },
]
/** دلیل‌های مشکل در فرم درخواست گارانتی */
export const WARRANTY_REASONS: { k: string; desc: string }[] = [
  { k: 'ایراد کارکردی یا عملکرد کالا', desc: 'مثلاً روشن نمی‌شود، صدا قطع و وصل می‌شود یا شارژ نمی‌گیرد.' },
  { k: 'تردید در اصالت کالا', desc: 'فکر می‌کنید کالا اصل نیست یا با مشخصات اعلام‌شده فرق دارد.' },
  { k: 'سایر', desc: 'مشکلی که در موارد بالا نیست؛ در توضیحات شرح دهید.' },
]
export const COVERED = ['ایراد کارکردی و عملکرد کالا', 'عدم اصالت کالا']
export const EXCLUDED = ['آسیبی که پس از تحویل به کالا وارد شود', 'انصراف یا تغییر نظر خریدار']

export const METHODS: Record<string, { label: string; short: string; desc: string }> = {
  inperson: { label: 'تحویل حضوری', short: 'تحویل حضوری در شعبه', desc: 'مشتری کالا را به شعبهٔ غنیمت می‌آورد.' },
  post: { label: 'پست (پس‌کرایه)', short: 'پست · پس‌کرایه', desc: 'مشتری در دفتر پست با گزینهٔ پس‌کرایه تحویل می‌دهد.' },
  courier: { label: 'پیک (پس‌کرایه)', short: 'پیک · پس‌کرایه', desc: 'مشتری خودش پیک می‌گیرد؛ کرایه در مقصد پرداخت می‌شود.' },
}
export const RETURN_WAREHOUSE = 'انبار مرجوعی غنیمت — تهران، خیابان ولیعصر، پلاک ۱۲۰ / مهاباد، خیابان جمهوری، پلاک ۴۵'
export const SERVICE_CENTER = 'مرکز خدمات گارانتی غنیمت'
export const SHIP_BACK = ['پست پیشتاز', 'تیپاکس', 'پیک غنیمت', 'تحویل حضوری']
export const QC_CHECKS = ['پلمب', 'ظاهر', 'کارکرد', 'متعلقات']

export const refundLabel = (r: Ret) => r.refundTo?.kind === 'card' ? `کارت بانکی ${r.refundTo.bank} •••• ${r.refundTo.last4}` : 'کیف پول غنیمت'

/** کالاهای درخواست؛ برای پرونده‌های قدیمی از روی واحد یا سفارش ساخته می‌شود */
export function retItems(r: Ret, orders: { id: string; shipments: { id: string; items: { productId: string; unitId: string; qty: number; price: number }[] }[] }[]): RetItem[] {
  if (r.items?.length) return r.items
  const o = orders.find((x) => x.id === r.orderId)
  const all = o?.shipments.flatMap((s) => s.items.map((i) => ({ ...i, shipId: s.id }))) ?? []
  const one = all.find((i) => r.unitId && i.unitId === r.unitId)
  return one ? [one] : all.length ? all : [{ productId: r.productId ?? '', unitId: r.unitId, qty: 1, price: r.amount }]
}

export const retClosed = (r: Ret) => ['return.refunded', 'return.cancelled', 'return.expired'].includes(r.status) || (r.status === 'return.rejected' && !!r.reship) || (r.status === 'return.partial' && !!r.refund?.at && !!r.reship)
export const warClosed = (w: War) => ['warranty.done', 'warranty.rejected', 'warranty.refunded', 'warranty.closed'].includes(w.status)

export function retStage(r: Ret): Stage {
  if (retClosed(r)) return { step: 4, who: '—', next: 'پرونده بسته شده است' }
  switch (r.status) {
    case 'return.awaiting_customer': return { step: 1, who: 'مشتری', next: `منتظر ارسال کالا توسط مشتری با ${r.method === 'courier' ? 'پیک' : 'پست'} (پس‌کرایه)` }
    case 'return.awaiting_pickup': return { step: 1, who: 'مشتری', next: 'منتظر تحویل حضوری کالا در شعبه' }
    case 'return.in_transit': return { step: 1, who: 'ما', next: 'ثبت دریافت کالا در انبار مرجوعی' }
    case 'return.inspecting': return { step: 2, who: 'ما', next: 'بررسی پلمب، ظاهر، کارکرد و متعلقات و اعلام نتیجه' }
    case 'return.approved': return { step: 3, who: 'مالی', next: 'تأیید نفر دوم برای بازگشت وجه' }
    case 'return.refunding': case 'return.approved_deducted': return { step: 3, who: 'مالی', next: 'واریز وجه و ثبت شمارهٔ پیگیری' }
    case 'return.partial': return { step: 3, who: r.refund?.at ? 'ما' : 'مالی', next: r.refund?.at ? 'ثبت ارسال مجدد کالاهای ردشده' : 'واریز وجه کالاهای تأییدشده و ارسال مجدد کالاهای ردشده' }
    case 'return.rejected': return { step: 3, who: 'ما', next: 'ثبت ارسال مجدد کالا در سفارش (تا ۲۴ ساعت)' }
    default: return { step: 1, who: 'مشتری', next: 'منتظر ارسال کالا' }
  }
}

export function warStage(w: War): Stage {
  if (warClosed(w)) return { step: 6, who: '—', next: 'پرونده بسته شده است' }
  switch (w.status) {
    case 'warranty.pending': return { step: 1, who: 'ما', next: 'شروع بررسی درخواست' }
    case 'warranty.reviewing': return { step: 1, who: 'ما', next: 'بررسی مدارک و شرایط پوشش؛ تأیید یا رد با دلیل' }
    case 'warranty.approved': return { step: 3, who: 'مشتری', next: 'منتظر ارسال کالا توسط مشتری تا پایان مهلت' }
    case 'warranty.in_transit': return { step: 3, who: 'ما', next: 'ثبت دریافت و بررسی کالا در غنیمت' }
    case 'warranty.received': return { step: 4, who: 'ما', next: 'تعیین نوع خدمت: تعمیر، تعویض یا بازگشت مبلغ' }
    case 'warranty.repairing': return { step: 4, who: 'ما', next: 'پایان تعمیر، یا تصمیم به تعویض یا بازگشت مبلغ' }
    case 'warranty.replaced': case 'warranty.shipping_back': return { step: 5, who: 'پیک', next: 'ثبت تحویل کالا به مشتری' }
    default: return { step: 1, who: 'ما', next: 'بررسی درخواست' }
  }
}

/** وضعیت کارت گارانتی با توجه به تاریخ پایان */
export function cardState(c: WCard): { status: WCard['status']; end: Date; daysLeft: number; total: number } {
  const total = c.months * 30
  const end = new Date(new Date(c.start).getTime() + total * 864e5)
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 864e5)
  return { status: c.status === 'invalid' || c.status === 'archived' ? c.status : daysLeft < 0 ? 'expired' : 'active', end, daysLeft, total }
}

export const QUEUES: [string, string][] = [['all', 'همه'], ['us', 'نیازمند اقدام ما'], ['customer', 'منتظر مشتری'], ['transit', 'در راه'], ['money', 'واریز'], ['closed', 'بسته‌شده']]
export function inQueue(q: string, s: Stage) {
  if (q === 'all') return true
  if (q === 'closed') return s.who === '—'
  if (q === 'us') return s.who === 'ما'
  if (q === 'customer') return s.who === 'مشتری'
  if (q === 'transit') return s.who === 'پیک'
  if (q === 'money') return s.who === 'مالی'
  return true
}
