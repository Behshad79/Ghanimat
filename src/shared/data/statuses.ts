// جدول واژگان وضعیت‌ها (بخش ۴.۳ قاعدهٔ ۶): برای هر وضعیت فقط یک عبارت و یک رنگ در کل پنل.
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'brand'
export const STATUS: Record<string, { label: string; tone: Tone }> = {
  // سفارش
  'order.awaiting_payment': { label: 'در انتظار پرداخت', tone: 'neutral' },
  'order.paid': { label: 'پرداخت‌شده', tone: 'info' },
  'order.needs_decision': { label: 'نیازمند تصمیم مشتری', tone: 'warning' },
  'order.preparing': { label: 'در حال آماده‌سازی', tone: 'info' },
  'order.shipped': { label: 'ارسال‌شده', tone: 'brand' },
  'order.delivered': { label: 'تحویل‌شده', tone: 'success' },
  'order.cancelled': { label: 'لغوشده', tone: 'danger' },
  'order.returned': { label: 'مرجوع‌شده', tone: 'purple' },
  'order.suspicious': { label: 'مشکوک', tone: 'danger' },
  // مرسوله
  'ship.pending': { label: 'در انتظار آماده‌سازی', tone: 'neutral' },
  'ship.partner_confirm': { label: 'در انتظار تأیید شریک', tone: 'warning' },
  'ship.picking': { label: 'در حال جمع‌آوری', tone: 'info' },
  'ship.packed': { label: 'بسته‌بندی‌شده', tone: 'info' },
  'ship.handed': { label: 'تحویل پیک شد', tone: 'brand' },
  'ship.in_transit': { label: 'در مسیر', tone: 'brand' },
  'ship.delivered': { label: 'تحویل‌شده', tone: 'success' },
  'ship.failed': { label: 'تحویل ناموفق', tone: 'danger' },
  'ship.cancelled': { label: 'لغوشده', tone: 'danger' },
  // واحد کالا
  'unit.in_transit': { label: 'در راه', tone: 'neutral' },
  'unit.received': { label: 'دریافت‌شده', tone: 'neutral' },
  'unit.qc': { label: 'در انتظار QC', tone: 'warning' },
  'unit.photo': { label: 'در انتظار عکاسی', tone: 'warning' },
  'unit.ready': { label: 'آمادهٔ انتشار', tone: 'info' },
  'unit.published': { label: 'منتشرشده', tone: 'success' },
  'unit.reserved': { label: 'رزروشده', tone: 'brand' },
  'unit.sold': { label: 'فروخته‌شده', tone: 'neutral' },
  'unit.returned': { label: 'مرجوع‌شده', tone: 'purple' },
  'unit.repair': { label: 'در تعمیر', tone: 'purple' },
  'unit.defective': { label: 'معیوب', tone: 'danger' },
  'unit.rejected': { label: 'ردشده در QC', tone: 'danger' },
  // محصول
  'product.published': { label: 'منتشرشده', tone: 'success' },
  'product.draft': { label: 'پیش‌نویس', tone: 'neutral' },
  'product.pending': { label: 'منتظر تأیید', tone: 'warning' },
  'product.rejected': { label: 'ردشده', tone: 'danger' },
  'product.needs_fix': { label: 'نیازمند اصلاح', tone: 'warning' },
  // مرجوعی
  'return.registered': { label: 'ثبت‌شده', tone: 'neutral' },
  'return.awaiting_customer': { label: 'در انتظار ارسال توسط مشتری', tone: 'warning' },
  'return.in_transit': { label: 'در راه انبار', tone: 'purple' },
  'return.inspecting': { label: 'در حال بررسی', tone: 'purple' },
  'return.approved': { label: 'تأییدشده', tone: 'success' },
  'return.partial': { label: 'تأیید بخشی', tone: 'warning' },
  'return.rejected': { label: 'ردشده', tone: 'danger' },
  'return.refunding': { label: 'در حال واریز', tone: 'info' },
  'return.refunded': { label: 'واریزشده', tone: 'success' },
  'return.awaiting_pickup': { label: 'در انتظار تحویل حضوری', tone: 'warning' },
  'return.approved_deducted': { label: 'تأیید با کسر هزینهٔ ارسال', tone: 'success' },
  'return.cancelled': { label: 'لغو توسط مشتری', tone: 'neutral' },
  'return.expired': { label: 'مهلت ارسال تمام شد', tone: 'danger' },
  // گارانتی
  'warranty.pending': { label: 'در انتظار بررسی', tone: 'warning' },
  'warranty.repairing': { label: 'در حال تعمیر', tone: 'purple' },
  'warranty.replaced': { label: 'تعویض‌شده', tone: 'success' },
  'warranty.done': { label: 'تکمیل‌شده', tone: 'success' },
  'warranty.rejected': { label: 'ردشده', tone: 'danger' },
  'warranty.approved': { label: 'تأیید شد، منتظر ارسال کالا', tone: 'info' },
  'warranty.in_transit': { label: 'کالا در راه غنیمت', tone: 'purple' },
  'warranty.refunded': { label: 'مبلغ بازگشت داده شد', tone: 'success' },
  // تیکت
  'ticket.new': { label: 'جدید', tone: 'brand' },
  'ticket.open': { label: 'در حال پیگیری', tone: 'info' },
  'ticket.needs_info': { label: 'نیازمند اطلاعات بیشتر', tone: 'warning' },
  'ticket.answered': { label: 'پاسخ داده‌شده', tone: 'success' },
  'ticket.closed': { label: 'بسته', tone: 'neutral' },
  'ticket.reopened': { label: 'بازگشایی‌شده', tone: 'warning' },
  // پرداخت
  'pay.success': { label: 'موفق', tone: 'success' },
  'pay.failed': { label: 'ناموفق', tone: 'danger' },
  'pay.unknown': { label: 'نامشخص', tone: 'warning' },
  'pay.refunded': { label: 'برگشتی', tone: 'purple' },
  // تأیید دومرحله‌ای
  'approval.pending': { label: 'منتظر تأیید', tone: 'warning' },
  'approval.approved': { label: 'تأییدشده', tone: 'success' },
  'approval.rejected': { label: 'ردشده', tone: 'danger' },
  // ارائه‌دهنده
  'prov.active': { label: 'فعال', tone: 'success' },
  'prov.testing': { label: 'آزمایشی', tone: 'info' },
  'prov.paused': { label: 'متوقف', tone: 'neutral' },
  'prov.error': { label: 'خطا', tone: 'danger' },
  'prov.slow': { label: 'کند', tone: 'warning' },
  'prov.retired': { label: 'بازنشسته', tone: 'neutral' },
  'prov.soon': { label: 'به‌زودی', tone: 'neutral' },
  // چراغ سلامت
  'health.ok': { label: 'سالم', tone: 'success' },
  'health.warn': { label: 'هشدار', tone: 'warning' },
  'health.crit': { label: 'بحران', tone: 'danger' },
  // دیدگاه
  'review.pending': { label: 'منتظر تأیید', tone: 'warning' },
  'review.approved': { label: 'تأییدشده', tone: 'success' },
  'review.rejected': { label: 'ردشده', tone: 'danger' },
  // عمومی
  on: { label: 'فعال', tone: 'success' },
  off: { label: 'غیرفعال', tone: 'neutral' },
  soon: { label: 'به‌زودی', tone: 'neutral' },
}
export const st = (k: string) => STATUS[k] ?? { label: k, tone: 'neutral' as Tone }

export const CONDITION: Record<string, string> = { sealed: 'اکبند - پلمپ', openbox: 'جعبه‌باز', used: 'استوک - تست‌شده' }
export const WAREHOUSE: Record<string, string> = { tehran: 'انبار تهران', mahabad: 'انبار مهاباد' }
export const SOURCE: Record<string, string> = { amazon: 'انبارگردانی آمازون', kurdistan: 'خرید مستقیم اقلیم کردستان' }

// Glossary (بخش ۴.۳ قاعدهٔ ۷)
export const GLOSSARY: [string, string][] = [
  ['محصول', 'مدل کالا با مشخصات و محتوا؛ چند واحد می‌تواند داشته باشد.'],
  ['واحد', 'یک نمونهٔ فیزیکی از محصول با سریال، گرید و عکس اختصاصی.'],
  ['سفارش', 'خرید ثبت‌شدهٔ مشتری؛ می‌تواند چند مرسوله داشته باشد.'],
  ['مرسوله', 'بسته‌ای که از یک انبار با یک روش ارسال می‌رود.'],
  ['مرجوعی', 'بازگرداندن کالا در مهلت مرجوعی، با بازرسی در انبار.'],
  ['گارانتی', 'خدمات پس از مهلت مرجوعی: تعمیر، تعویض یا بازگشت مبلغ.'],
  ['بازگشت وجه', 'واریز مبلغ به کیف پول یا کارت مشتری.'],
  ['لغو', 'توقف سفارش یا مرسوله پیش از تحویل.'],
  ['قیمت تمام‌شده', 'قیمت خرید به‌اضافهٔ حمل، ترخیص و هزینه‌های جانبی هر واحد (Landed Cost).'],
  ['حاشیهٔ سود', 'قیمت فروش منهای قیمت تمام‌شده، تقسیم بر قیمت فروش.'],
  ['خرید اقساطی', 'پرداخت از طریق سرویس‌های اقساطی (BNPL).'],
  ['کیف پول', 'موجودی مشتری نزد غنیمت.'],
]
