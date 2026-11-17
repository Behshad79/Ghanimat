// پیامک و پیگیری مشتری: سیاست‌های خودکار (سفارش پرداخت‌نشده، سبد باز، …) و ارسال‌های دستی
export type Trigger = 'awaiting_payment' | 'open_cart' | 'failed_payment' | 'back_in_stock' | 'price_drop' | 'inactive' | 'after_delivery'
export const TRIGGERS: Record<Trigger, { label: string; desc: string; stop: string }> = {
  awaiting_payment: { label: 'سفارش در انتظار پرداخت', desc: 'سفارش ثبت شده ولی پرداخت نشده است.', stop: 'پرداخت انجام شود' },
  open_cart: { label: 'کالا در سبد خرید مانده', desc: 'مشتری کالا به سبد اضافه کرده و خرید نکرده است.', stop: 'خرید انجام شود یا سبد خالی شود' },
  failed_payment: { label: 'پرداخت ناموفق', desc: 'پرداخت در درگاه یا سرویس اقساطی ناموفق بوده است.', stop: 'پرداخت موفق' },
  back_in_stock: { label: 'موجود شدن کالای «خبرم کن»', desc: 'کالایی که مشتری منتظرش بود دوباره موجود شد.', stop: 'خرید همان کالا' },
  price_drop: { label: 'کاهش قیمت کالای علاقه‌مندی', desc: 'قیمت کالای لیست علاقه‌مندی مشتری کم شد.', stop: 'خرید همان کالا' },
  inactive: { label: 'مشتری بی‌فعالیت', desc: 'مدتی از آخرین خرید گذشته است.', stop: 'خرید تازه' },
  after_delivery: { label: 'بعد از تحویل سفارش', desc: 'درخواست دیدگاه یا پیشنهاد کالای مکمل.', stop: 'ثبت دیدگاه' },
}
export type Policy = { id: string; name: string; trigger: Trigger; delay: number; unit: 'دقیقه' | 'ساعت' | 'روز'; channel: string; text: string; code?: { pct: number; days: number; cap: number }; segment: string; minCart: number; active: boolean; sent: number; conv: number; revenue: number }
export type Blast = { id: string; at: string; by: string; audience: string; count: number; channel: string; text: string; code?: string; status: 'ارسال شد' | 'زمان‌بندی‌شده'; when?: string; conv: number }

export function makeNudges() {
  return {
    policies: [
      { id: 'np1', name: 'یادآوری پرداخت سفارش', trigger: 'awaiting_payment', delay: 20, unit: 'دقیقه', channel: 'پیامک', text: '{نام} عزیز، سفارش {کد_سفارش} هنوز پرداخت نشده است. واحدهای این سفارش تکی هستند و تا ۴۰ دقیقهٔ دیگر برای شما نگه داشته می‌شوند: {لینک_پرداخت}', segment: 'همه', minCart: 0, active: true, sent: 312, conv: 118, revenue: 4820000000 },
      { id: 'np2', name: 'سبد خرید مانده', trigger: 'open_cart', delay: 3, unit: 'ساعت', channel: 'پیامک', text: '{نام} عزیز، {کالا} هنوز در سبد شماست و فقط {موجودی} عدد از آن باقی مانده. ادامهٔ خرید: {لینک_سبد}', segment: 'همه', minCart: 5000000, active: true, sent: 845, conv: 97, revenue: 2640000000 },
      { id: 'np3', name: 'سبد مانده با کد تخفیف', trigger: 'open_cart', delay: 2, unit: 'روز', channel: 'پیامک', text: '{نام} عزیز، با کد {کد_تخفیف} تا {انقضا} روی سبد خریدت {درصد}٪ تخفیف داری: {لینک_سبد}', code: { pct: 5, days: 2, cap: 3000000 }, segment: 'جدید', minCart: 10000000, active: true, sent: 204, conv: 41, revenue: 1310000000 },
      { id: 'np4', name: 'پرداخت ناموفق', trigger: 'failed_payment', delay: 5, unit: 'دقیقه', channel: 'پیامک', text: '{نام} عزیز، پرداخت شما کامل نشد و سبد خریدتان حفظ شده است. اگر فیلترشکن روشن است خاموش کنید و دوباره پرداخت کنید: {لینک_پرداخت}', segment: 'همه', minCart: 0, active: true, sent: 156, conv: 88, revenue: 3150000000 },
      { id: 'np5', name: 'موجود شد', trigger: 'back_in_stock', delay: 0, unit: 'دقیقه', channel: 'پیامک', text: '{کالا} که منتظرش بودید موجود شد؛ فقط {موجودی} واحد: {لینک_کالا}', segment: 'همه', minCart: 0, active: true, sent: 73, conv: 19, revenue: 960000000 },
      { id: 'np6', name: 'برگشت مشتری بی‌فعالیت', trigger: 'inactive', delay: 60, unit: 'روز', channel: 'پیامک', text: '{نام} عزیز، دلمان برایت تنگ شده؛ کد {کد_تخفیف} ({درصد}٪ تا سقف ۲ میلیون) تا {انقضا} برای توست.', code: { pct: 7, days: 7, cap: 2000000 }, segment: 'در خطر ریزش', minCart: 0, active: false, sent: 0, conv: 0, revenue: 0 },
    ] as Policy[],
    blasts: [
      { id: 'BL-12', at: new Date(Date.now() - 864e5 * 3).toISOString(), by: 'بهشاد', audience: 'بخش VIP', count: 1, channel: 'پیامک', text: '{نام} عزیز، آیفون ۱۶ پرو با گرید A+ رسید؛ پیش از انتشار عمومی برای شما رزرو می‌کنیم.', status: 'ارسال شد', conv: 1 },
    ] as Blast[],
    smsPrice: 450, quiet: { from: '23:00', to: '07:00' },
  }
}
export const VARS = ['{نام}', '{کد_سفارش}', '{لینک_پرداخت}', '{لینک_سبد}', '{کالا}', '{موجودی}', '{کد_تخفیف}', '{درصد}', '{انقضا}', '{لینک_کالا}']
/** تعداد بخش پیامک فارسی (۷۰ نویسه برای یک بخش، ۶۷ برای چندبخشی) */
export const smsParts = (t: string) => (t.length <= 70 ? 1 : Math.ceil(t.length / 67))
