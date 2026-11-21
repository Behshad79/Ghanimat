// قانون‌های زمان ارسال، ظرفیت بازه‌ها، دریافت حضوری و متن پیامک‌ها
export const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
/** اتصال تاپین (ثبت مرسولهٔ پست و دریافت بارکد ۲۴ رقمی). مسیرها مطابق API نسخهٔ ۲ تاپین؛ کلید فقط سمت سرور نگه‌داری می‌شود */
export type TapinCfg = { on: boolean; token: string; shopId: string; orderType: 0 | 1; payType: 0 | 1 | 2 | 3; contentType: 1 | 2 | 3 | 4; registerType: 0 | 1 | 2; insurance: boolean; autoOnPack: boolean; defaultWeight: number; boxWeight: number; sender: { name: string; mobile: string; postal: string; province: string; city: string; address: string }; balance: number; lastSync?: string; log: { at: string; orderId: string; shipId: string; barcode?: string; price?: number; ok: boolean; msg: string; by: string }[] }
export const makeTapin = (): TapinCfg => ({ on: true, token: 'jwt ••••••••4f2a', shopId: 'fc45949a-••••-••••-••••-ab5180f7d1c2', orderType: 1, payType: 1, contentType: 1, registerType: 2, insurance: true, autoOnPack: false, defaultWeight: 600, boxWeight: 150,
  sender: { name: 'فروشگاه غنیمت', mobile: '09120000000', postal: '1966700000', province: 'تهران', city: 'تهران', address: 'تهران، سعادت‌آباد، انبار غنیمت' }, balance: 1850000, lastSync: new Date(Date.now() - 36e5).toISOString(), log: [] })
export const makeDelivery = () => ({
  tapin: makeTapin(),
  openHour: 9, fastCutoff: 19, nightAfter: 22, fastHours: 2, closedDays: ['جمعه'],
  slots: [
    { id: 'sl1', from: 8, to: 10, cap: 14 }, { id: 'sl2', from: 10, to: 12, cap: 16 }, { id: 'sl3', from: 12, to: 14, cap: 16 },
    { id: 'sl4', from: 14, to: 16, cap: 16 }, { id: 'sl5', from: 16, to: 18, cap: 14 }, { id: 'sl6', from: 18, to: 20, cap: 12 }, { id: 'sl7', from: 20, to: 22, cap: 8 },
  ],
  booked: { 'today:sl5': 14, 'today:sl6': 9, 'tomorrow:sl1': 6, 'tomorrow:sl2': 11 } as Record<string, number>,
  pickup: { mode: 'after_sms' as 'after_sms' | 'window' | 'call_first', prepHours: 2, windowFrom: 9, windowTo: 17, holdDays: 3, showCode: true, partialStock: 'ask' as 'ask' | 'ship_rest' | 'wait_all' },
  // پیک و قیمت تحویل سریع: انتخاب پیک، زنجیرهٔ جایگزین و افزایش خودکار قیمت در ساعت‌های پرترافیک
  fast: {
    primary: 'snappbox', fallback: ['alopeyk', 'tapsi'], autoSwitch: true, switchGap: 20,
    couriers: [
      { id: 'snappbox', name: 'اسنپ‌باکس', base: 128000, api: true, on: true },
      { id: 'alopeyk', name: 'الوپیک', base: 119000, api: true, on: true },
      { id: 'tapsi', name: 'تپسی‌باکس', base: 122000, api: true, on: true },
      { id: 'miare', name: 'میاره', base: 112000, api: false, on: false },
    ],
    price: 185000, auto: true, pass: 100, cap: 320000, round: 5000,
    // درصد افزایش خودکار هر ساعت (الگوی ترافیک تهران؛ از تاریخچهٔ قیمت پیک‌ها به‌روز می‌شود)
    profile: { 8: 15, 9: 10, 10: 0, 11: 0, 12: 5, 13: 10, 14: 5, 15: 0, 16: 10, 17: 30, 18: 35, 19: 25, 20: 10, 21: 5, 22: 0 } as Record<number, number>,
    overrides: { 18: 40 } as Record<number, number>,
    dayExtra: { 'چهارشنبه': 5, 'پنجشنبه': 10 } as Record<string, number>,
    rain: false, rainPct: 25,
    boost: null as null | { pct: number; until: string; why: string },
    // قیمت پایهٔ هر مقصد (منطقه یا شهر)؛ افزایش ساعت، روز، باران و موقت روی همین قیمت اعمال می‌شود
    // مبدأ ارسال سریع (انبار تهران) برای محاسبهٔ فاصله و محدودهٔ شعاعی
    origin: { name: 'انبار تهران · یوسف‌آباد', lat: 35.7286, lng: 51.4061 },
    zones: [
      { id: 'z-teh', name: 'داخل تهران', kind: 'منطقه' as 'منطقه' | 'شهر', areas: 'تهران، مناطق ۱ تا ۲۲', price: 400000, cap: 650000, cost: 260000, on: true, mode: 'polygon' as 'polygon' | 'radius', radiusKm: 18, color: '#0000ff',
        poly: [[35.805, 51.235], [35.83, 51.42], [35.805, 51.55], [35.74, 51.6], [35.66, 51.56], [35.615, 51.44], [35.63, 51.3], [35.69, 51.2]] as [number, number][] },
      { id: 'z-eslam', name: 'اسلامشهر', kind: 'شهر' as 'منطقه' | 'شهر', areas: 'اسلامشهر، چهاردانگه، واوان', price: 500000, cap: 800000, cost: 330000, on: true, mode: 'polygon' as 'polygon' | 'radius', radiusKm: 6, color: '#b45309',
        poly: [[35.585, 51.175], [35.59, 51.285], [35.525, 51.295], [35.505, 51.2], [35.53, 51.16]] as [number, number][] },
      { id: 'z-karaj', name: 'کرج', kind: 'شهر' as 'منطقه' | 'شهر', areas: 'کرج، فردیس، مهرشهر، گوهردشت', price: 700000, cap: 1100000, cost: 470000, on: true, mode: 'polygon' as 'polygon' | 'radius', radiusKm: 10, color: '#12733f',
        poly: [[35.875, 50.885], [35.885, 51.06], [35.81, 51.08], [35.775, 50.95], [35.8, 50.88]] as [number, number][] },
    ],
  },
  // سبد چندانباره: اقلام تهران با روش انتخابی، اقلام مهاباد با پست؛ هزینهٔ ارسال و تجمیع قابل تنظیم
  split: { remoteMethod: 'پست پیشتاز', fee: 'both' as 'both' | 'first' | 'max', consolidate: true, notify: true },
  templates: {
    pickupReady: 'غنیمت: سفارش {سفارش} در {شعبه} آماده است. زمان مراجعه: {زمان}. پیش از دریافت این پیامک مراجعه نکنید.',
    pickupReminder: 'غنیمت: یادآوری؛ سفارش {سفارش} تا {مهلت} در {شعبه} نگه داشته می‌شود.',
    pickupExpired: 'غنیمت: مهلت دریافت سفارش {سفارش} تمام شد و سفارش لغو شد. مبلغ به {مقصد} برمی‌گردد.',
    callFirst: 'غنیمت: برای آماده‌سازی سفارش {سفارش}، پیش از مراجعه با {تلفن} تماس بگیرید.',
    slotConfirmed: 'غنیمت: سفارش {سفارش} {زمان} با {روش} تحویل می‌شود.',
  },
})
export type Delivery = ReturnType<typeof makeDelivery>
