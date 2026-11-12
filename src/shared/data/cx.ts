// پوشش فایل فیگما «UI – General – Customer» (صفحه‌های General و Panel) در پنل ادمین.
// هر صف یا فهرستی که سایت و پنل مشتری تولید می‌کند، اینجا دادهٔ نمونه دارد و در «درخواست‌های مشتری» یا «تنظیمات سایت و پنل مشتری» مدیریت می‌شود.
import type { Rec } from './entities'

const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

/** صف‌ها و فهرست‌های قابل ویرایش (EntityManager) */
export const makeCxEntities = (): Record<string, Rec[]> => ({
  // سایت › تماس با ما
  contactMessages: [
    { id: 'cm1', name: 'مهسا کریمی', mobile: '09121112233', email: 'mahsa@example.com', subject: 'پیگیری سفارش', text: 'سفارش GH-10479 هنوز ارسال نشده، زمان دقیق را می‌خواهم. عکس صفحهٔ پیگیری را هم فرستادم.', status: 'جدید', at: ago(35), files: [{ kind: 'image', src: './products/p1-500.webp', name: 'اسکرین-پیگیری.jpg', size: 286000 }] },
    { id: 'cm2', name: 'علی نوری', mobile: '09351234567', email: '', subject: 'همکاری و فروش', text: 'برای فروش عمده هدفون شرایط همکاری را می‌خواهم.', status: 'پاسخ داده‌شده', at: ago(60 * 26) },
    { id: 'cm3', name: 'شرکت آرین', mobile: '02100000000', email: 'info@arian.example', subject: 'فاکتور رسمی', text: 'فاکتور رسمی سفارش GH-10458 با کد اقتصادی شرکت لازم است.', status: 'در حال بررسی', at: ago(60 * 5) },
  ],
  contactSubjects: [
    { id: 'cs1', name: 'پیگیری سفارش', route: 'پشتیبانی', active: true }, { id: 'cs2', name: 'مرجوعی و گارانتی', route: 'پشتیبانی', active: true },
    { id: 'cs3', name: 'فاکتور رسمی', route: 'مالی', active: true }, { id: 'cs4', name: 'همکاری و فروش', route: 'فروش', active: true },
    { id: 'cs5', name: 'پیشنهاد و انتقاد', route: 'مدیریت', active: true }, { id: 'cs6', name: 'سایر', route: 'پشتیبانی', active: true },
  ],
  // صفحهٔ کالا › گزارش مشکل
  productReports: [
    { id: 'pr1', product: 'Apple iPhone 16 Pro 256GB', reason: 'قیمت نادرست', text: 'قیمت با سایت‌های دیگر خیلی فرق دارد.', reporter: '09123456789', status: 'جدید', at: ago(50) },
    { id: 'pr2', product: 'Sony WH-1000XM5', reason: 'اطلاعات یا مشخصات نادرست', text: 'وزن نوشته‌شده درست نیست.', reporter: 'ناشناس', status: 'اصلاح شد', at: ago(60 * 30) },
  ],
  reportReasons: [
    { id: 'rr1', name: 'قیمت نادرست', active: true }, { id: 'rr2', name: 'اطلاعات یا مشخصات نادرست', active: true }, { id: 'rr3', name: 'تصویر نامناسب یا نامرتبط', active: true },
    { id: 'rr4', name: 'شک به اصل نبودن کالا', active: true }, { id: 'rr5', name: 'محتوای توهین‌آمیز در دیدگاه‌ها', active: true }, { id: 'rr6', name: 'سایر', active: true },
  ],
  // صفحهٔ کالا › ناموجود › درخواست ورود و خبرم کن
  stockRequests: [
    { id: 'sr1', product: 'Apple iPhone 16 Pro 512GB تیتانیوم صحرایی', count: 14, lastAt: ago(90), status: 'باز', note: '' },
    { id: 'sr2', product: 'Sony PlayStation 5 Slim', count: 31, lastAt: ago(60 * 3), status: 'در حال تأمین', note: 'سفارش خرید PO-221' },
    { id: 'sr3', product: 'Apple Watch Ultra 2', count: 6, lastAt: ago(60 * 20), status: 'باز', note: '' },
  ],
  notifyMe: [
    { id: 'nm1', product: 'Apple AirPods Max 2024 · نقره‌ای', kind: 'موجود شدن', subscribers: 42, sent: false, at: ago(60 * 2) },
    { id: 'nm2', product: 'Samsung Galaxy S24 Ultra 512GB', kind: 'کاهش قیمت', subscribers: 18, sent: false, at: ago(60 * 9) },
    { id: 'nm3', product: 'Amazon Kindle Paperwhite', kind: 'موجود شدن', subscribers: 9, sent: true, at: ago(60 * 40) },
  ],
  // ویژه‌ها › به‌زودی در ویژه‌ها › یادآوری
  offerReminders: [
    { id: 'or1', offer: 'غنی‌آف هدفون‌های سونی', startsAt: day(1), subscribers: 126, channel: 'پیامک', sent: false },
    { id: 'or2', offer: 'جعبه‌بازهای آیپد', startsAt: day(3), subscribers: 58, channel: 'اعلان پنل', sent: false },
  ],
  // فروشگاه حضوری › فرم پرسش دربارهٔ موجودی و سؤال از شعبه
  branchInquiries: [
    { id: 'bi1', branch: 'شعبهٔ تهران (ونک)', name: 'رضا', mobile: '09120000001', kind: 'موجودی کالا', text: 'آیفون ۱۶ پرو مشکی در شعبه هست؟', status: 'جدید', at: ago(25) },
    { id: 'bi2', branch: 'شعبهٔ مهاباد', name: 'هیوا', mobile: '09140000002', kind: 'سؤال از شعبه', text: 'جمعه‌ها باز هستید؟', status: 'پاسخ داده‌شده', at: ago(60 * 8) },
  ],
  // پنل › کیف پول › برداشت
  withdrawals: [
    { id: 'WD-3120', customer: 'سروش رنجبران', amount: 2400000, card: '6037-99**-****-1234', iban: 'IR06 0170 **** **** 1234', status: 'در انتظار', at: ago(60 * 3), reason: '' },
    { id: 'WD-3114', customer: 'نگار امینی', amount: 850000, card: '6104-33**-****-9087', iban: 'IR12 0120 **** **** 9087', status: 'واریز شد', at: ago(60 * 30), reason: '' },
    { id: 'WD-3109', customer: 'پارسا مرادی', amount: 5000000, card: '5022-29**-****-4410', iban: 'IR44 0560 **** **** 4410', status: 'رد شد', at: ago(60 * 52), reason: 'شبا به نام کاربر نیست.' },
  ],
  // پنل › مودال افزودن کارت و شبا (استعلام مالکیت)
  bankAccounts: [
    { id: 'ba1', customer: 'سروش رنجبران', card: '6037-99**-****-1234', iban: 'IR06 0170 **** **** 1234', owner: 'سروش رنجبران', status: 'تأییدشده', at: ago(60 * 24 * 10) },
    { id: 'ba2', customer: 'پارسا مرادی', card: '5022-29**-****-4410', iban: 'IR44 0560 **** **** 4410', owner: 'محمد مرادی', status: 'شبا به نام کاربر نیست', at: ago(60 * 53) },
    { id: 'ba3', customer: 'نگار امینی', card: '6104-33**-****-9087', iban: '', owner: '—', status: 'استعلام انجام نشد', at: ago(60 * 2) },
  ],
  // پنل › سفارش جاری › درخواست لغو
  cancelRequests: [
    { id: 'CR-501', order: 'GH-10480', customer: 'نگار امینی', scope: 'کل سفارش', reason: 'از خرید منصرف شدم', refundTo: 'کیف پول', status: 'در حال بررسی', at: ago(40) },
    { id: 'CR-498', order: 'GH-10412', customer: 'سروش رنجبران', scope: '۱ کالا', reason: 'زمان ارسال طولانی است', refundTo: 'کارت بانکی', status: 'تأییدشده', at: ago(60 * 28) },
  ],
  // پنل › پشتیبانی › ثبت تیکت (موضوع، دلیل، نیاز به انتخاب سفارش)
  ticketTopics: [
    { id: 'tt1', name: 'سفارش و ارسال', needsOrder: true, reasons: 'تأخیر در ارسال، مغایرت کالا، آسیب در ارسال، کسری اقلام', sla: 12, active: true },
    { id: 'tt2', name: 'مرجوعی و گارانتی', needsOrder: true, reasons: 'پیگیری مرجوعی، خرابی کالا، استعلام گارانتی', sla: 24, active: true },
    { id: 'tt3', name: 'پرداخت و کیف پول', needsOrder: false, reasons: 'پرداخت نامشخص، برداشت، کارت هدیه، اقساط', sla: 6, active: true },
    { id: 'tt4', name: 'حساب کاربری', needsOrder: false, reasons: 'ورود و رمز، حساب حقوقی، اطلاعات شخصی', sla: 24, active: true },
    { id: 'tt5', name: 'پیشنهاد و انتقاد', needsOrder: false, reasons: 'سایت، کالا، پشتیبانی', sla: 48, active: true },
  ],
  // مرکز راهنما (صفحه‌های راهنما با «این جواب مفید بود؟»)
  helpGuides: [
    { id: 'hg1', title: 'چطور سفارش بدهم؟', slug: 'how-to-order', group: 'خرید', yes: 412, no: 18, active: true },
    { id: 'hg2', title: 'قبل از خرید چه چک کنم؟', slug: 'before-buying', group: 'خرید', yes: 288, no: 9, active: true },
    { id: 'hg3', title: 'شیوه‌ها و هزینهٔ ارسال کالا', slug: 'shipping', group: 'ارسال', yes: 351, no: 22, active: true },
    { id: 'hg4', title: 'شرایط مرجوعی چیست؟', slug: 'return-policy', group: 'مرجوعی', yes: 198, no: 31, active: true },
    { id: 'hg5', title: 'چطور مرجوعی ثبت کنم؟', slug: 'how-to-return', group: 'مرجوعی', yes: 176, no: 12, active: true },
    { id: 'hg6', title: 'راهنمای ضمانت کالا', slug: 'warranty', group: 'گارانتی', yes: 143, no: 8, active: true },
    { id: 'hg7', title: 'راهنمای کنترل کیفیت', slug: 'quality-control', group: 'کالا', yes: 97, no: 4, active: true },
    { id: 'hg8', title: 'راهنمای وضعیت کالا', slug: 'product-condition', group: 'کالا', yes: 264, no: 15, active: true },
  ],
  tutorialVideos: [
    { id: 'tv1', title: 'آنباکس و تست کالای استوک', duration: '۴:۱۲', topic: 'کنترل کیفیت', views: 12400, active: true },
    { id: 'tv2', title: 'چطور خرید اقساطی با اسنپ‌پی انجام دهیم', duration: '۲:۴۸', topic: 'پرداخت', views: 8600, active: true },
    { id: 'tv3', title: 'ثبت مرجوعی در کمتر از یک دقیقه', duration: '۱:۳۰', topic: 'مرجوعی', views: 5100, active: true },
  ],
  // جست‌وجو: مترادف‌ها و «منظورتان … بود؟»، پیشنهادها، جست‌وجوی بی‌نتیجه
  searchSynonyms: [
    { id: 'sy1', from: 'ایرپاد', to: 'AirPods', kind: 'مترادف', active: true }, { id: 'sy2', from: 'ایفون', to: 'آیفون', kind: 'منظورتان … بود؟', active: true },
    { id: 'sy3', from: 'هندزفری', to: 'هدفون بی‌سیم', kind: 'مترادف', active: true }, { id: 'sy4', from: 'پلی استیشن', to: 'PlayStation', kind: 'مترادف', active: true },
  ],
  searchSuggestions: [
    { id: 'ss1', text: 'آیفون ۱۶ پرو', kind: 'پرجست‌وجو', pinned: true, active: true }, { id: 'ss2', text: 'ایرپادز مکس', kind: 'پرجست‌وجو', pinned: false, active: true },
    { id: 'ss3', text: 'استوک تست‌شده', kind: 'میان‌بر', pinned: true, active: true }, { id: 'ss4', text: 'لپ‌تاپ گیمینگ', kind: 'پیشنهاد دسته', pinned: false, active: true },
  ],
  zeroResults: [
    { id: 'zr1', query: 'ps5 pro', count: 64, lastAt: ago(30), action: '' }, { id: 'zr2', query: 'شیائومی ۱۴ تی', count: 21, lastAt: ago(60 * 4), action: '' },
    { id: 'zr3', query: 'کیف لپتاپ', count: 12, lastAt: ago(60 * 12), action: 'مترادف ساخته شد' },
  ],
  // دستیار خرید AI: پیش‌نوشته‌ها و بازخوردها
  assistantPrompts: [
    { id: 'ap1', text: 'یه هدفون خوب برای سفر تا ۱۵ میلیون', active: true }, { id: 'ap2', text: 'فرق اکبند و استوک چیه؟', active: true },
    { id: 'ap3', text: 'گوشی با دوربین خوب و باتری قوی', active: true }, { id: 'ap4', text: 'با عکس کالا جست‌وجو کن', active: true },
  ],
  assistantFeedback: [
    { id: 'af1', question: 'لپ‌تاپ برای برنامه‌نویسی تا ۷۰ میلیون', rating: 'منفی', reason: 'کالاهای پیشنهادی گران‌تر از بودجه بود', at: ago(80), handled: false },
    { id: 'af2', question: 'هدفون نویزکنسلینگ', rating: 'مثبت', reason: 'پاسخ دقیق', at: ago(60 * 6), handled: true },
  ],
  // صفحه‌های ثابت و سیستمی
  staticPages: [
    { id: 'sp1', title: 'دربارهٔ ما', slug: 'about', kind: 'صفحهٔ محتوایی', updated: day(-12), active: true },
    { id: 'sp2', title: 'اعتماد به غنیمت', slug: 'trust', kind: 'صفحهٔ محتوایی', updated: day(-5), active: true },
    { id: 'sp3', title: 'تماس با ما', slug: 'contact', kind: 'صفحهٔ فرم', updated: day(-30), active: true },
    { id: 'sp4', title: 'فروشگاه حضوری و شعبه‌یاب', slug: 'stores', kind: 'صفحهٔ شعب', updated: day(-8), active: true },
    { id: 'sp5', title: 'پیشنهادهای ویژه', slug: 'offers', kind: 'صفحهٔ فهرست کالا', updated: day(-1), active: true },
    { id: 'sp6', title: 'پرفروش‌ترین‌ها', slug: 'best-sellers', kind: 'صفحهٔ فهرست کالا', updated: day(-1), active: true },
    { id: 'sp7', title: 'به‌زودی در ویژه‌ها', slug: 'coming-soon', kind: 'صفحهٔ فهرست کالا', updated: day(-2), active: true },
    { id: 'sp8', title: 'فروشنده شوید', slug: 'become-seller', kind: 'صفحهٔ فرم', updated: day(-40), active: false },
  ],
  errorPages: [
    { id: 'ep1', code: '۴۰۴', title: 'صفحه پیدا نشد', body: 'نشانی را بررسی کنید یا از جست‌وجو استفاده کنید.', cta: 'بازگشت به خانه', active: true },
    { id: 'ep2', code: '۵۰۰', title: 'خطای سرور', body: 'مشکل از ماست و در حال رفع آن هستیم. چند دقیقهٔ دیگر دوباره سر بزنید.', cta: 'تلاش دوباره', active: true },
    { id: 'ep3', code: 'آفلاین', title: 'اتصال اینترنت قطع است', body: 'به اینترنت وصل شوید؛ سبد خرید شما حفظ می‌شود.', cta: 'تلاش دوباره', active: true },
    { id: 'ep4', code: 'به‌روزرسانی', title: 'سایت در حال به‌روزرسانی است', body: 'کمتر از یک ساعت دیگر برمی‌گردیم.', cta: 'تماس با پشتیبانی', active: true },
    { id: 'ep5', code: 'کالای حذف‌شده', title: 'این کالا دیگر فروخته نمی‌شود', body: 'کالاهای مشابه را ببینید.', cta: 'کالاهای مشابه', active: true },
  ],
  blogCategories: [
    { id: 'bc1', name: 'راهنمای خرید', slug: 'buying-guide', active: true }, { id: 'bc2', name: 'آموزش', slug: 'learn', active: true },
    { id: 'bc3', name: 'اصالت کالا', slug: 'authenticity', active: true }, { id: 'bc4', name: 'ویدیو', slug: 'video', active: true },
  ],
  instagramPosts: [
    { id: 'ig1', title: 'خانهٔ هوشمند با گجت‌های تازه', kind: 'ریلز', url: 'instagram.com/p/1', active: true },
    { id: 'ig2', title: 'آنباکسینگ کالاهای تازه', kind: 'ریلز', url: 'instagram.com/p/2', active: true },
    { id: 'ig3', title: 'تازه‌های iOS 27', kind: 'پست', url: 'instagram.com/p/3', active: true },
    { id: 'ig4', title: 'کد تخفیف اختصاصی این هفته', kind: 'پست', url: 'instagram.com/p/4', active: true },
  ],
  testimonials: [
    { id: 'ts1', name: 'امیر رضایی', product: 'موس Logitech G Pro 2', title: 'دقت و کلیک', text: 'کلیک‌ها دقیق و پاسخ‌گویی موس خیلی خوبه.', active: true },
    { id: 'ts2', name: 'نگار احمدی', product: 'موس Logitech G Pro 2', title: 'وزن و اتصال بی‌سیم', text: 'وزن و دقتش خیلی خوبه و اتصال بی‌سیم پایدار است.', active: true },
    { id: 'ts3', name: 'رامین کریمیان', product: 'هدفون Sony', title: 'بسته‌بندی و ارسال', text: 'محصول تمیز و سالم رسید، ارسال سریع بود.', active: true },
  ],
  trustItems: [
    { id: 'ti1', title: 'تضمین اصالت', text: 'هر کالا پیش از فروش از نظر اصالت بررسی می‌شود.', active: true },
    { id: 'ti2', title: 'کنترل کیفیت دولایه', text: 'بار اول نزد تأمین‌کننده، بار دوم در انبار غنیمت.', active: true },
    { id: 'ti3', title: 'وضعیت شفاف کالا', text: 'اکبند یا استوکِ تست‌شده، با عکس واقعی همان کالا.', active: true },
    { id: 'ti4', title: 'قیمت منصفانه', text: 'بخش بزرگی از کالاها پایین‌تر از قیمت بازار؛ منبع هر کالا روشن است.', active: true },
    { id: 'ti5', title: 'ارسال سریع تهران و کرج', text: 'از انبار مرکزی تهران، بدون انتظار چندروزه.', active: true },
    { id: 'ti6', title: 'گارانتی و بازگشت کالا', text: 'گارانتی ۳ تا ۱۲ ماهه بسته به کالا، با شرایط مرجوعی شفاف.', active: true },
  ],
  sourcingRoutes: [
    { id: 'so1', title: 'مستقیم از انبارگردانی', subtitle: 'کالای آمازون و وارداتی خارجی', text: 'کالاهای انبارگردانی که حدود سه ماه بعد وارد بازار خاورمیانه می‌شوند؛ اکبند یا بدون پلمپ، و هیچ‌کدام دست‌دوم نیستند.', perks: 'کالای اصل، معمولاً ارزان‌تر از بازار ایران، دسترسی سریع در تهران و کرج', active: true },
    { id: 'so2', title: 'از شبکهٔ فروشندگان مرزی', subtitle: 'کالای اصل از بانه و شهرهای مرزی', text: 'شبکهٔ فروشندگان غنیمت در شهرهای مرزی که کالای اصل را مستقیم وارد می‌کنند.', perks: 'اصالت و سرعت دسترسی؛ لزوماً ارزان‌تر از بازار نیست', active: true },
  ],
  cartServices: [
    { id: 'cv1', name: 'بیمهٔ تجهیزات دیجیتال (۱۲ ماه)', price: 1.8, unit: 'درصد قیمت کالا', categories: 'گوشی موبایل، لپ‌تاپ، تبلت', active: true },
    { id: 'cv2', name: 'گارانتی تمدیدی ۶ ماهه', price: 1200000, unit: 'تومان', categories: 'همه', active: true },
    { id: 'cv3', name: 'نصب محافظ صفحه', price: 350000, unit: 'تومان', categories: 'گوشی موبایل', active: false },
  ],
  panelCards: [
    { id: 'pc1', name: 'سفارش در انتظار پرداخت', priority: 1, active: true }, { id: 'pc2', name: 'سفارش نیازمند تصمیم شما', priority: 2, active: true },
    { id: 'pc3', name: 'مرجوعی فعال', priority: 3, active: true }, { id: 'pc4', name: 'گارانتی نزدیک به انقضا', priority: 4, active: true },
    { id: 'pc5', name: 'اطلاعات پروفایل ناقص', priority: 5, active: true }, { id: 'pc6', name: 'دیدگاه در انتظار ثبت', priority: 6, active: true },
  ],
})

/** تنظیمات یک‌جا (فرم تنظیمات) */
export const makeCxSettings = () => ({
  auth: { otpLength: 6, resendSeconds: 120, maxAttempts: 5, lockMinutes: 15, maxResends: 3, codeExpiryMinutes: 2, passwordMin: 8, passwordNeedsDigit: true, passwordNeedsLetter: true, allowPasswordLogin: true, mergeGuestCart: true, signupReferral: true },
  search: { aiSearch: true, recentCount: 6, suggestCount: 8, didYouMean: true, imageSearch: true, placeholder: 'جست‌وجوی محصول، برند یا مدل…' },
  support: { hours: '۹ تا ۲۱', days: 'شنبه تا پنجشنبه', offlineMessage: 'کارشناسان ما الان آنلاین نیستند؛ پیام بگذارید، اول وقت پاسخ می‌دهیم.', queueMessage: 'شما در صف هستید؛ میانگین انتظار کمتر از ۳ دقیقه است.', autoCloseDays: 3, reopenDays: 7, maxFiles: 5, maxFileMb: 10, rateAfterClose: true, phone: '021-61887700', chatEnabled: true, aiFirst: true },
  wallet: { minWithdraw: 100000, withdrawDays: 2, topupMin: 50000, topupMax: 200000000, combinedPayment: true, giftCardWithCode: true, refundDefault: 'کیف پول' },
  referral: { inviterReward: 300000, inviteeReward: 500000, minFirstOrder: 3000000, rewardAfter: 'پایان مهلت مرجوعی سفارش اول', active: true },
  reviews: { needPurchase: true, editRequiresReapproval: true, maxPhotos: 6, maxVideos: 1, rewardAmount: 50000, aiSummary: true },
  notifications: {
    channels: { push: true, sms: true, email: true },
    categories: [
      { id: 'orders', label: 'وضعیت سفارش', push: true, sms: true, email: false, locked: true },
      { id: 'price', label: 'کاهش قیمت', push: true, sms: false, email: true, locked: false },
      { id: 'stock', label: 'موجود شدن کالا', push: true, sms: true, email: false, locked: false },
      { id: 'offers', label: 'کد تخفیف و پیشنهادها', push: true, sms: false, email: true, locked: false },
      { id: 'reviews', label: 'دیدگاه و پرسش', push: true, sms: false, email: false, locked: false },
      { id: 'warranty', label: 'گارانتی و مرجوعی', push: true, sms: true, email: true, locked: true },
    ],
    smsWeeklyCap: 2,
  },
  checkout: { maxQtyPerItem: 3, suggestAlternatives: true, recipientOther: true, pickupInBranch: true, twoHourCities: 'تهران، کرج', paymentTimeoutMin: 15, maxPaymentAttempts: 3, showLaterBuy: true },
  assistant: { name: 'دستیار خرید غنیمت', greeting: 'سلام! بگو دنبال چی هستی تا بهترین گزینه‌های اصل را پیدا کنم.', handoff: true, showFloating: true, tone: 'دوستانه و دقیق' },
  newsletter: { title: 'اولین نفر از شگفت‌انگیزها باخبر شوید', text: 'کالاهای تازهٔ استوک و جعبه‌باز و پیشنهادهای ویژه را با پیامک برایتان می‌فرستیم.', note: 'هفته‌ای حداکثر ۲ پیام؛ هر وقت خواستید لغو کنید.', weeklyCode: 'WEEK15' },
})
export type CxSettings = ReturnType<typeof makeCxSettings>
