// قانون‌های زمان ارسال، ظرفیت بازه‌ها، دریافت حضوری و متن پیامک‌ها
export const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const makeDelivery = () => ({
  openHour: 9, fastCutoff: 19, nightAfter: 22, fastHours: 2, closedDays: ['جمعه'],
  slots: [
    { id: 'sl1', from: 8, to: 10, cap: 14 }, { id: 'sl2', from: 10, to: 12, cap: 16 }, { id: 'sl3', from: 12, to: 14, cap: 16 },
    { id: 'sl4', from: 14, to: 16, cap: 16 }, { id: 'sl5', from: 16, to: 18, cap: 14 }, { id: 'sl6', from: 18, to: 20, cap: 12 }, { id: 'sl7', from: 20, to: 22, cap: 8 },
  ],
  booked: { 'today:sl5': 14, 'today:sl6': 9, 'tomorrow:sl1': 6, 'tomorrow:sl2': 11 } as Record<string, number>,
  pickup: { mode: 'after_sms' as 'after_sms' | 'window' | 'call_first', prepHours: 2, windowFrom: 9, windowTo: 17, holdDays: 3, showCode: true, partialStock: 'ask' as 'ask' | 'ship_rest' | 'wait_all' },
  templates: {
    pickupReady: 'غنیمت: سفارش {سفارش} در {شعبه} آماده است. زمان مراجعه: {زمان}. کد تحویل: {کد}. پیش از دریافت این پیامک مراجعه نکنید.',
    pickupReminder: 'غنیمت: یادآوری؛ سفارش {سفارش} تا {مهلت} در {شعبه} نگه داشته می‌شود.',
    pickupExpired: 'غنیمت: مهلت دریافت سفارش {سفارش} تمام شد و سفارش لغو شد. مبلغ به {مقصد} برمی‌گردد.',
    callFirst: 'غنیمت: برای آماده‌سازی سفارش {سفارش}، پیش از مراجعه با {تلفن} تماس بگیرید.',
    slotConfirmed: 'غنیمت: سفارش {سفارش} {زمان} با {روش} تحویل می‌شود.',
  },
})
export type Delivery = ReturnType<typeof makeDelivery>
