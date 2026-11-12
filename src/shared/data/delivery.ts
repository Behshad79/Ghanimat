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
  // پیک و قیمت تحویل سریع: انتخاب پیک، زنجیرهٔ جایگزین و افزایش خودکار قیمت در ساعت‌های پرترافیک
  fast: {
    primary: 'snappbox', fallback: ['alopeyk', 'ghcourier'], autoSwitch: true, switchGap: 20,
    couriers: [
      { id: 'snappbox', name: 'اسنپ‌باکس', base: 128000, api: true, on: true },
      { id: 'alopeyk', name: 'الوپیک', base: 119000, api: true, on: true },
      { id: 'tapsi', name: 'تپسی‌باکس', base: 122000, api: true, on: true },
      { id: 'miare', name: 'میاره', base: 112000, api: false, on: false },
      { id: 'ghcourier', name: 'پیک غنیمت', base: 95000, api: false, on: true },
    ],
    price: 185000, auto: true, pass: 100, cap: 320000, round: 5000,
    // درصد افزایش خودکار هر ساعت (الگوی ترافیک تهران؛ از تاریخچهٔ قیمت پیک‌ها به‌روز می‌شود)
    profile: { 8: 15, 9: 10, 10: 0, 11: 0, 12: 5, 13: 10, 14: 5, 15: 0, 16: 10, 17: 30, 18: 35, 19: 25, 20: 10, 21: 5, 22: 0 } as Record<number, number>,
    overrides: { 18: 40 } as Record<number, number>,
    dayExtra: { 'چهارشنبه': 5, 'پنجشنبه': 10 } as Record<string, number>,
    rain: false, rainPct: 25,
    boost: null as null | { pct: number; until: string; why: string },
  },
  templates: {
    pickupReady: 'غنیمت: سفارش {سفارش} در {شعبه} آماده است. زمان مراجعه: {زمان}. کد تحویل: {کد}. پیش از دریافت این پیامک مراجعه نکنید.',
    pickupReminder: 'غنیمت: یادآوری؛ سفارش {سفارش} تا {مهلت} در {شعبه} نگه داشته می‌شود.',
    pickupExpired: 'غنیمت: مهلت دریافت سفارش {سفارش} تمام شد و سفارش لغو شد. مبلغ به {مقصد} برمی‌گردد.',
    callFirst: 'غنیمت: برای آماده‌سازی سفارش {سفارش}، پیش از مراجعه با {تلفن} تماس بگیرید.',
    slotConfirmed: 'غنیمت: سفارش {سفارش} {زمان} با {روش} تحویل می‌شود.',
  },
})
export type Delivery = ReturnType<typeof makeDelivery>
