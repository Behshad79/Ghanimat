// کدام ردیف‌ها پشت کدام کارت شاخص هستند: عنوان کارت + صفحه‌ای که کارت در آن است (where) ← مجموعه‌داده، فیلتر، شاخص جمع و پنل تحلیلی
// ترتیب مهم است: اولین تطبیق برنده است؛ قواعد وابسته به صفحه (where) قبل از قواعد عمومی می‌آیند.
import { compactToman, fa } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { providerOf } from '@/shared/lib/profit'

type Row = Record<string, any>
export type Metric = { label: string; val: (r: Row) => number; fmt: (n: number) => string; avg?: boolean }
export type Spec = { ds: string; only?: (r: Row, d: DB) => boolean; why: string; metric?: Metric; panel?: string; where?: RegExp }

const DAY = 864e5
const ageDays = (t?: string) => (t ? (Date.now() - +new Date(t)) / DAY : 0)
const sum = (label: string, k: string): Metric => ({ label, val: (r) => +r[k] || 0, fmt: compactToman })
const pctAvg = (label: string, k: string): Metric => ({ label, val: (r) => +r[k] || 0, fmt: (n) => `${fa(Math.round(n * 10) / 10)}٪`, avg: true })

const S: [RegExp, Spec][] = [
  /* اصلاح بر اساس صفحه */
  [/تحویل به‌موقع/, { ds: 'partners', why: 'تحویل به‌موقع و کارنامهٔ هر شعبه.', where: /sellers/ }],
  [/منتظر تأیید موجودی/, { ds: 'orders', only: (r) => ['order.paid', 'order.needs_decision'].includes(r.status), why: 'سفارش‌هایی که منتظر تأیید موجودی هستند.' }],
  [/فروش از این انبار/, { ds: 'orders', only: (r) => r.counted, why: 'سفارش‌های ارسال‌شده از این انبار.' }],
  [/خارج از سایت|آمادگی میانگین/, { ds: 'products', only: (r) => r.status !== 'product.published', why: 'کالاهایی که هنوز روی سایت نیستند و چه چیزی کم دارند.', where: /readiness|catalog/ }],
  [/در بخش «به‌زودی»|صفحهٔ آماده/, { ds: 'products', only: (r) => r.status === 'product.incoming' || !!r.comingSoon, why: 'کالاهای در راه که صفحه‌شان از قبل ساخته شده و در بخش «به‌زودی» دیده می‌شوند.', where: /supply|catalog/ }],
  [/بدون عنوان سئو/, { ds: 'media', only: (r) => !r.alt, why: 'تصویرهایی که متن جایگزین (alt) و عنوان سئو ندارند.', where: /media/ }],
  [/دیدگاه منتظر تأیید/, { ds: 'comments', only: (r) => /pending/.test(r.status), why: 'دیدگاه‌های مقاله‌ها که منتظر تأیید هستند.', where: /blog|content/ }],
  [/میانگین انتظار|رضایت/, { ds: 'ai', why: 'گفتگوهای پشتیبانی و دستیار با زمان انتظار و رضایت.', where: /conversations/ }],
  [/رویداد امروز/, { ds: 'events', why: 'رویدادهای سمت سرور: بازدید، افزودن به سبد، پرداخت، با منبع اول و آخر.', where: /integrations/ }],
  [/مصرف این ماه|نرخ پذیرش پیشنهادها|زمان صرفه‌جویی‌شده/, { ds: 'agentLog', why: 'کارهای انجام‌شده توسط دستیار و ایجنت‌ها و پیشنهادهای پذیرفته‌شده.', where: /\/ai|agents/ }],
  [/بدهی کیف پول|^کیف پول/, { ds: 'customers', only: (r) => (r.wallet ?? 0) > 0, why: 'مشتریانی که در کیف پول مانده دارند.', metric: sum('جمع ماندهٔ کیف پول', 'wallet') }],
  [/پرداخت در ۷ روز|واریزشده این ماه/, { ds: 'people', why: 'پرداخت‌های پرسنل در هفتهٔ آینده و این ماه.', metric: sum('جمع حقوق ماهانه', 'gross'), where: /people|team/ }],
  [/واریزشده این ماه/, { ds: 'recv', only: (r) => r.paid, why: 'تسویه‌های دریافت‌شده از درگاه‌ها و سرویس‌ها در این ماه.', metric: sum('جمع واریز خالص', 'net'), where: /finance/ }],
  /* شعب و شرکا */
  [/بدهی شعب به غنیمت|طلب غنیمت از شعبه/, { ds: 'lots', only: (r) => r.partnerOwes > 0, why: 'هر ردیف یک محمولهٔ کالا نزد شعبه است که شعبه آن را حضوری فروخته و سهم غنیمت را هنوز واریز نکرده است.', metric: sum('جمع بدهی شعب به غنیمت', 'partnerOwes'), panel: 'partners' }],
  [/بدهی غنیمت به شعب/, { ds: 'lots', only: (r) => r.hqOwes > 0, why: 'محموله‌هایی که غنیمت آنلاین فروخته و سهم شعبه را بدهکار است.', metric: sum('جمع بدهی غنیمت به شعب', 'hqOwes'), panel: 'partners' }],
  [/امانی/, { ds: 'lots', only: (r) => r.capital === 'hq' && r.stockValue > 0, why: 'کالای غنیمت که نزد شعب مانده و هنوز فروش نرفته است.', metric: sum('ارزش کالای امانی', 'stockValue'), panel: 'partners' }],
  [/فروش شعب|سهم شعبه|سهم غنیمت|سهم من|کالای پذیرفته‌شده/, { ds: 'lots', why: 'فروش و سهم هر طرف به تفکیک شعبه و محموله.', metric: sum('فروش', 'revenue'), panel: 'partners', where: /sellers|partner|pricing|insight|^\/admin$|^$/ }],
  [/امتیاز مشتریان شعبه|میانگین آماده‌سازی|ناموجودی بعد از فروش/, { ds: 'partners', why: 'کارنامهٔ هر شعبه: امتیاز، تحویل به‌موقع، ناموجودی و زمان آماده‌سازی.' }],

  /* پیام و پیگیری */
  [/پیام ارسال‌شده|پیام امروز|مصرف این ماه/, { ds: 'messages', why: 'تک‌تک پیام‌های ارسال‌شده: پیامک‌های خودکار، ارسال‌های دستی و پیام‌های ربات، با گیرنده، متن و وضعیت تحویل.', panel: 'messages' }],
  [/نرخ بازگشت به خرید|فروش برگشتی از پیگیری|سیاست فعال/, { ds: 'policies', why: 'هر سیاست پیگیری: چند پیام فرستاده، چند نفر برگشتند و خرید کردند و چقدر فروش آورد.', metric: sum('فروش برگشتی', 'revenue') }],
  [/فرمان|ربات تلگرام/, { ds: 'messages', only: (r) => r.src === 'remote', why: 'فرمان‌ها و پیام‌های ربات تلگرام و پیامک مدیریتی.' }],
  [/اتوماسیون فعال/, { ds: 'policies', only: (r) => r.active, why: 'اتوماسیون‌ها و سیاست‌های پیگیری روشن.' }],

  /* تماس */
  [/از دست رفته/, { ds: 'calls', only: (r) => r.status === 'از دست رفته', why: 'تماس‌های بی‌پاسخ که باید دوباره گرفته شوند.' }],
  [/تماس|انتظار در صف|میانگین انتظار/, { ds: 'calls', why: 'تماس‌های ورودی و خروجی با اپراتور، صف، زمان انتظار و مدت مکالمه.', metric: { label: 'میانگین انتظار', val: (r) => r.waitSec, fmt: (n) => `${fa(Math.round(n))} ثانیه`, avg: true } }],

  /* مشتری، ماندگاری و ریزش */
  [/نرخ خرید تکراری|وفادار|ماندگاری|ریتنشن/, { ds: 'customers', only: (r) => r.orders > 1, why: 'مشتریانی که بیش از یک بار خرید کرده‌اند؛ عدد کارت = سهم آن‌ها از کل مشتریان.', panel: 'retention' }],
  [/ریزش.*۹۰|در خطر ریزش|احتمال ریزش/, { ds: 'customers', only: (r) => ageDays(r.lastOrder) > 60 || r.segment === 'در خطر ریزش' || (r.health ?? 100) < 50, why: 'مشتریانی که مدتی است خرید نکرده‌اند یا سلامت پرونده‌شان پایین است، همراه با صفحه‌هایی که بیشترین خروج را دارند.', panel: 'churn' }],
  [/بزرگ‌ترین ریزش|درآمد از دست‌رفته در پرداخت/, { ds: 'pages', why: 'صفحه‌ها و مرحله‌های خرید با بیشترین خروج؛ هر ردیف نشان می‌دهد چند نفر رسیدند و چند نفر بدون خرید رفتند.', panel: 'churn', metric: { label: 'میانگین نرخ خروج', val: (r) => r.exitRate, fmt: (n) => `${fa(Math.round(n))}٪`, avg: true } }],
  [/CAC|ROAS|LTV به CAC|نسبت LTV|هزینه به ازای سفارش|هزینهٔ تبلیغات|منبع ورود/, { ds: 'sources', why: 'هر منبع ورود مشتری: تعداد مشتری، فروش، هزینهٔ تبلیغات، هزینهٔ جذب (CAC) و بازگشت تبلیغات (ROAS).', metric: sum('هزینهٔ تبلیغات', 'spend') }],
  [/امتیازهای خرج‌نشده|^مشتریان /, { ds: 'customers', why: 'مشتریان باشگاه با سطح و اعتبار خرج‌نشده.', where: /settings|insight|^$/ }],
  [/مشترک فعال|لغو اشتراک|ایمیلی|پیامکی/, { ds: 'subs', why: 'مشترکان خبرنامه و پیامک با کانال و وضعیت اشتراک.', where: /builder|content|site|insight|^$/ }],

  /* سبد و پرداخت */
  [/سبد|در صفحهٔ پرداخت/, { ds: 'carts', why: 'سبدهای باز همین حالا: مشتری، اقلام، مرحله و خطای احتمالی پرداخت.', metric: sum('ارزش سبدها', 'value') }],
  [/پرداخت ناموفق/, { ds: 'txns', only: (r) => /fail|cancel/.test(r.status), why: 'تراکنش‌های ناموفق درگاه.' }],
  [/در انتظار تطبیق|رسید مشکوک/, { ds: 'receipts', only: (r) => (/مشکوک/.test(r.status ?? '') ? true : r.status === 'در انتظار تطبیق'), why: 'رسیدهای کارت به کارت ارسالی مشتری که باید با واریز بانک تطبیق داده شوند.', metric: sum('جمع مبلغ', 'amount') }],
  [/واریز تطبیق‌نشده/, { ds: 'credits', only: (r) => !r.matched, why: 'واریزهای پیامک بانک که هنوز به سفارشی وصل نشده‌اند.', metric: sum('جمع مبلغ', 'amount') }],
  [/طلب|سررسید|پرداخت در ۷ روز|کل کارمزد/, { ds: 'recv', only: (r) => !r.paid, why: 'طلب از هر درگاه و سرویس اقساطی به تفکیک سفارش: مبلغ خالص، کارمزد و موعد تسویه.', metric: sum('جمع طلب خالص', 'net'), where: /finance|pricing|insight|^\/admin$|^$/ }],
  [/^نقدی$/, { ds: 'orders', only: (r, d) => r.counted && providerOf(d, r.pay ?? '')?.family !== 'bnpl', why: 'سفارش‌های پرداخت نقدی (درگاه بانکی، کیف پول، کارت به کارت).' }],
  [/^اقساطی$/, { ds: 'orders', only: (r, d) => r.counted && providerOf(d, r.pay ?? '')?.family === 'bnpl', why: 'سفارش‌های پرداخت اقساطی (اسنپ‌پی، ترب‌پی، دیجی‌پی و …).' }],
  [/بهای کالای فروخته‌شده/, { ds: 'orders', only: (r) => r.counted, why: 'بهای تمام‌شدهٔ کالاهای هر سفارش فروخته‌شده.', metric: sum('جمع بهای تمام‌شده', 'cost') }],
  [/کارمزد، ارسال|هزینهٔ کامل برای/, { ds: 'orders', only: (r) => r.counted, why: 'کارمزد درگاه و هزینهٔ ارسال و بسته‌بندی هر سفارش.', metric: sum('جمع کارمزد و ارسال', 'fees'), where: /finance|insight|^$/ }],
  [/برداشت در انتظار/, { ds: 'withdrawals', why: 'درخواست‌های برداشت از کیف پول و مانده‌ها.', metric: sum('جمع مبلغ', 'amount') }],
  [/حساب بانکی نیازمند بررسی/, { ds: 'bankAccounts', only: (r) => !/تأیید/.test(r.status), why: 'حساب‌های بانکی مشتریان که منتظر بررسی هستند.' }],
  [/بازگشت وجه معوق/, { ds: 'returns', only: (r) => !/refunded|closed|rejected/.test(r.status), why: 'مرجوعی‌هایی که پولشان هنوز برنگشته است.' }],

  /* تأمین و محموله */
  [/تقاضای برآورده‌نشده|منتظر موجود شدن/, { ds: 'demand', why: 'درخواست‌های «موجود شد خبرم کن» و درخواست تأمین کالا.' }],
  [/محموله|سرمایهٔ خرید|قلم و تعداد|سفارش خرید باز|مغایرت دریافت|فروش از محموله|سود ناخالص تا امروز|ارزش موجودی باقی/, { ds: 'batches', why: 'هر محموله و سفارش خرید با مرحله، سرمایه، فروش و سود.', metric: sum('سرمایهٔ خرید', 'capital'), where: /supply|catalog|insight|^$/ }],
  [/رقیب ارزان‌تر|پیشنهاد تغییر قیمت/, { ds: 'market', only: (r) => r.cheaper, why: 'کالاهایی که رقیب در ترب یا ایمالز ارزان‌تر از ما می‌فروشد.' }],
  [/ارزان‌ترین در|کالاهای پایش‌شده/, { ds: 'market', why: 'قیمت ما در برابر کمترین قیمت ترب و ایمالز برای هر کالا.' }],
  [/^نرخ .* امروز|نرخ ارز/, { ds: 'fx', why: 'کالاهای خریداری‌شده با این ارز: قیمت ارزی، نرخ روز خرید و نرخ امروز.' }],

  /* پرسنل */
  [/خالص ماهانه|هزینهٔ حقوق|مانده وام|پرداخت بعدی|واریزشده این ماه|هزینهٔ کامل/, { ds: 'people', why: 'پرونده‌های پرسنلی با حقوق، وام و مساعده، و موعد پرداخت بعدی.', metric: sum('جمع حقوق ماهانه', 'gross'), where: /people|team|insight|^$/ }],
  [/قرارداد|پایان قرارداد/, { ds: 'people', only: (r) => r.endsIn !== null && r.endsIn <= 30, why: 'قراردادهایی که تا ۳۰ روز دیگر تمام می‌شوند.', where: /people|team|insight|^$/ }],

  /* اسناد، رسانه، محتوا */
  [/نیازمند تمدید/, { ds: 'vault', only: (r) => r.left !== null && r.left <= 60, why: 'اسناد و مجوزهایی که تا ۶۰ روز دیگر منقضی می‌شوند.' }],
  [/بدون فایل پیوست/, { ds: 'vault', only: (r) => !r.fileName, why: 'اسنادی که فقط مشخصاتشان ثبت شده و فایلشان بارگذاری نشده است.' }],
  [/محرمانه/, { ds: 'vault', only: (r) => r.access !== 'all', why: 'اسناد با دسترسی محدود.' }],
  [/کل اسناد/, { ds: 'vault', why: 'همهٔ اسناد بایگانی.' }],
  [/استفاده‌نشده/, { ds: 'media', only: (r) => !r.used, why: 'فایل‌های کتابخانه که در هیچ کالا یا مقاله‌ای استفاده نشده‌اند.' }],
  [/بهینه‌نشده/, { ds: 'media', only: (r) => !r.optimized, why: 'تصویرهایی که هنوز فشرده و بهینه نشده‌اند.' }],
  [/فایل در کتابخانه/, { ds: 'media', why: 'همهٔ فایل‌های کتابخانهٔ رسانه.', metric: { label: 'حجم کل', val: (r) => r.size ?? 0, fmt: (n) => `${fa(Math.round(n / 1024 / 1024 * 10) / 10)} مگابایت` } }],
  [/بدون عنوان سئو/, { ds: 'products', only: (r) => !r.seo?.title, why: 'کالاهایی که عنوان سئو ندارند.' }],
  [/بدون تصویر|عکس کم یا ندارد/, { ds: 'products', only: (r) => !r.image || (r.gallery?.length ?? 0) < 3, why: 'کالاهایی که عکس ندارند یا کمتر از سه عکس دارند.' }],
  [/محتوای ناقص|صف محتوا/, { ds: 'products', only: (r) => r.status !== 'product.published' || !r.seo?.title, why: 'کالاهایی که محتوا یا سئوی کامل ندارند.' }],
  [/مقاله|وبلاگ|ویدیو/, { ds: 'posts', why: 'مقاله‌ها و ویدیوهای وبلاگ با بازدید و وضعیت.', metric: { label: 'جمع بازدید', val: (r) => r.views ?? 0, fmt: (n) => fa(n) } }],
  [/جست‌وجوی بی‌نتیجه/, { ds: 'searches', only: (r) => !r.results, why: 'عبارت‌هایی که جست‌وجو کردند و نتیجه‌ای نگرفتند.' }],
  [/بنر|CTR|کلیک|المان|جایگاه/, { ds: 'banners', why: 'هر جایگاه و بنر صفحه‌ها با بازدید، کلیک و نرخ کلیک.', metric: pctAvg('میانگین نرخ کلیک', 'ctr') }],

  /* ایجنت‌ها و سرویس‌ها */
  [/اقدام/, { ds: 'agentLog', why: 'اقدام‌های ثبت‌شدهٔ ایجنت‌ها با نتیجه.', where: /agents|\/ai|insight|^$/ }],
  [/آخرین همگام|نرخ خطا|زمان پاسخ سرور|در دسترس بودن|هزینهٔ ماهانهٔ سرویس|اعتبار باقی/, { ds: 'services', why: 'سرویس‌های متصل با وضعیت سلامت، کارمزد و تسویه.' }],
  [/منتظر تأیید شما|رویداد امروز/, { ds: 'approvals', why: 'درخواست‌هایی که منتظر تأیید شما هستند.' }],
  [/ظرفیت بازه/, { ds: 'slots', why: 'بازه‌های ارسال امروز با ظرفیت و پرشدگی.' }],

  /* تحویل حضوری */
  [/تحویل با رسید/, { ds: 'pickups', only: (r) => r.status === 'handed', why: 'سفارش‌های تحویل‌شده در شعبه با رسید امضاشده.' }],
  [/مهلت تمام‌شده/, { ds: 'pickups', only: (r) => r.status === 'expired', why: 'سفارش‌هایی که مشتری در مهلت تحویل نگرفت.' }],
  [/آماده تحویل در شعبه/, { ds: 'pickups', only: (r) => r.status === 'ready', why: 'سفارش‌های آماده در شعبه.' }],
  [/در حال آماده‌سازی/, { ds: 'pickups', only: (r) => r.status === 'preparing', why: 'سفارش‌های تحویل حضوری در حال آماده‌سازی.', where: /orders|insight|^$/ }],
  [/^مرسوله|بستهٔ منتظر ارسال/, { ds: 'shipments', only: (r) => !['ship.delivered', 'ship.cancelled'].includes(r.status), why: 'مرسوله‌های تحویل‌نشده با روش ارسال و مهلت.' }],

  /* گفتگو و پشتیبانی */
  [/میانگین امتیاز گفتگو|نرخ حل خودکار|مهم‌ترین دلیل خرید|گفتگوی ویجت|میانگین مدت گفتگو/, { ds: 'ai', why: 'گفتگوهای دستیار خرید با نیت، نتیجه و خرید.' }],
  [/امتیاز پایین منتظر پیگیری/, { ds: 'tickets', only: (r) => r.csat === 'no', why: 'تیکت‌هایی که مشتری از نتیجه راضی نبود و پیگیری می‌خواهند.', where: /support|insight|^$/ }],
  [/نرخ پاسخ به نظرسنجی|«مشکل حل شد»|رضایت/, { ds: 'tickets', only: (r) => !!r.csat, why: 'تیکت‌هایی که مشتری به نظرسنجی پس از تیکت پاسخ داده است.' }],
  [/درخواست باز/, { ds: 'tickets', only: (r) => !/closed|resolved/.test(r.status), why: 'درخواست‌ها و تیکت‌های باز.' }],
  [/دیدگاه منتظر تأیید/, { ds: 'reviews', only: (r) => /pending/.test(r.status), why: 'دیدگاه‌هایی که منتظر تأیید هستند.' }],

  /* بازدید و صفحه‌ها */
  [/بازدید صفحه|بازدیدکنندهٔ یکتا|جلسه در سایت|سهم موبایل|خارج از سایت/, { ds: 'pages', why: 'صفحه‌های سایت با بازدید، افزودن به سبد، خرید و خروج.', metric: { label: 'جمع بازدید', val: (r) => r.views, fmt: (n) => fa(n) } }],
  [/کاربر آنلاین|بازدیدکنندهٔ آنلاین/, { ds: 'sessions', why: 'کاربران آنلاین همین حالا با دستگاه، شهر و صفحهٔ فعلی.' }],
]

/* قواعد قبلی (عمومی‌تر) */
const OLD: [RegExp, Spec][] = [
  [/غنی‌آف.*(اجرا)/, { ds: 'deals', only: (r) => r.st === 'live' || r.st === 'paused', why: 'غنی‌آف‌هایی که الان روی سایت هستند.' }],
  [/صف آینده/, { ds: 'deals', only: (r) => r.st === 'scheduled', why: 'غنی‌آف‌های زمان‌بندی‌شده برای آینده.' }],
  [/غنی‌آف|تخفیف داده‌شده/, { ds: 'deals', why: 'همهٔ غنی‌آف‌ها با فروش و تخفیف هر کدام.' }],
  [/حل‌شده بدون انسان/, { ds: 'ai', only: (r) => r.resolved && !r.handoff, why: 'گفتگوهایی که دستیار بدون دخالت پشتیبان به نتیجه رساند.' }],
  [/انتقال به پشتیبانی|انتقال به انسان/, { ds: 'ai', only: (r) => r.handoff, why: 'گفتگوهایی که دستیار به پشتیبان انسانی سپرد.' }],
  [/خرید پس از گفتگو/, { ds: 'ai', only: (r) => r.converted, why: 'گفتگوهایی که به خرید رسید.' }],
  [/^گفتگو/, { ds: 'ai', why: 'همهٔ گفتگوهای دستیار خرید.' }],
  [/ورود تا انتشار/, { ds: 'intake', why: 'برای هر واحد، فاصلهٔ رسیدن به انبار تا انتشار در سایت و سهم هر مرحله.' }],
  [/راکد/, { ds: 'units', only: (r) => r.status === 'unit.published' && Date.now() - +new Date(r.received) > 30 * DAY, why: 'واحدهای منتشرشده‌ای که بیش از ۳۰ روز فروش نرفته‌اند.' }],
  [/QC|کنترل کیفیت/, { ds: 'units', only: (r) => r.status === 'unit.qc', why: 'واحدهای منتظر کنترل کیفیت.' }],
  [/عکاسی/, { ds: 'units', only: (r) => r.status === 'unit.photo', why: 'واحدهای منتظر عکاسی.' }],
  [/منتظر انتشار|آمادهٔ انتشار/, { ds: 'units', only: (r) => r.status === 'unit.ready', why: 'واحدهای آماده که هنوز منتشر نشده‌اند.' }],
  [/موجودی|واحد|انبار/, { ds: 'units', only: (r) => ['unit.published', 'unit.ready', 'unit.reserved'].includes(r.status), why: 'واحدهای موجود در انبارها.' }],
  [/لغو/, { ds: 'orders', only: (r) => /cancel/.test(r.status), why: 'سفارش‌های لغوشده.' }],
  [/مشکوک/, { ds: 'orders', only: (r) => r.status === 'order.suspicious' || r.risk > 60, why: 'سفارش‌های با ریسک بالا.' }],
  [/سفارش.*(منتظر|معوق|اقدام)|منتظر اقدام|منتظر تأیید موجودی/, { ds: 'orders', only: (r) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(r.status), why: 'سفارش‌هایی که منتظر اقدام انسانی هستند.' }],
  [/تحویل به‌موقع|مهلت|SLA|دیرکرد|تأخیر/, { ds: 'shipments', why: 'مرسوله‌ها با مهلت تحویل؛ دیرشده‌ها قرمزند.' }],
  [/مرجوعی/, { ds: 'returns', why: 'درخواست‌های مرجوعی.' }],
  [/تراکنش|پرداخت|درگاه|نامشخص/, { ds: 'txns', why: 'تراکنش‌های پرداخت.' }],
  [/دیدگاه|پرسش|امتیاز/, { ds: 'reviews', why: 'دیدگاه‌ها و امتیازهای کالاها.' }],
  [/تیکت|پشتیبانی|پاسخ|رضایت/, { ds: 'tickets', why: 'تیکت‌های پشتیبانی.' }],
  [/مشتری|LTV|وفادار|ریزش|VIP|ارزش طول عمر/, { ds: 'customers', why: 'مشتریان مرتبط با این شاخص.' }],
  [/سود|حاشیه/, { ds: 'orders', only: (r) => r.counted, why: 'سود هر سفارش: مبلغ فروش منهای بهای تمام‌شده، کارمزدها و هزینهٔ ارسال.', metric: { label: 'جمع سود', val: (r) => r.profit, fmt: compactToman } }],
  [/AOV|میانگین سبد|میانگین سفارش/, { ds: 'orders', only: (r) => !/cancel/.test(r.status), why: 'میانگین مبلغ سفارش‌های پرداخت‌شده.', metric: { label: 'میانگین مبلغ سفارش', val: (r) => r.total, fmt: compactToman, avg: true } }],
  [/فروش|درآمد|سفارش|تبدیل|خرید ثبت‌شده/, { ds: 'orders', only: (r) => r.counted, why: 'سفارش‌های پرداخت‌شده‌ای که این عدد از آن‌ها ساخته شده است.' }],
  [/کالا|محصول|بازدید/, { ds: 'products', why: 'کالاهای پشت این عدد.' }],
]
const BY_PATH: [RegExp, string][] = [[/merch/, 'deals'], [/sellers|partner/, 'lots'], [/messaging/, 'messages'], [/calls/, 'calls'], [/people|team/, 'people'], [/vault/, 'vault'], [/media/, 'media'], [/blog|content/, 'posts'], [/builder/, 'banners'], [/agents|ai/, 'agentLog'], [/social/, 'receipts'], [/supply/, 'batches'], [/orders|live/, 'orders'], [/warehouse|catalog|readiness/, 'units'], [/customers|growth|marketing/, 'customers'], [/support|requests/, 'tickets'], [/conversations/, 'ai'], [/returns/, 'returns'], [/finance|pricing/, 'txns'], [/reviews/, 'reviews'], [/shipping/, 'shipments'], [/analytics/, 'pages']]

const norm = (from: string) => from.replace(/^#/, '').split('?')[0]
export function resolveSpec(label: string, from = ''): Spec {
  const f = norm(from)
  const hit = S.find(([r, s]) => r.test(label) && (!s.where || s.where.test(f)))?.[1] ?? OLD.find(([r]) => r.test(label))?.[1]
  return hit ?? { ds: BY_PATH.find(([r]) => r.test(f))?.[1] ?? 'orders', why: 'داده‌های همین بخش.' }
}
/** برای آزمون: آیا این عنوان به قاعدهٔ اختصاصی رسید یا به حدس از روی مسیر؟ */
export const isOwn = (label: string, from = '') => { const f = norm(from); return S.some(([r, s]) => r.test(label) && (!s.where || s.where.test(f))) }
export const isMapped = (label: string, from = '') => { const f = norm(from); return S.some(([r, s]) => r.test(label) && (!s.where || s.where.test(f))) || OLD.some(([r]) => r.test(label)) }
