// موجودیت‌های قابل تعریف بدون توسعه‌دهنده (بخش ۵.۱۱-ب). هرکدام با EntityManager ایجاد، ویرایش، کپی، بایگانی و حذف می‌شوند.
export type Rec = { id: string; [k: string]: any }
const now = Date.now()
const d = (days: number) => new Date(now + days * 864e5).toISOString().slice(0, 10)
export const makeEntities = (): Record<string, Rec[]> => ({
  categories: [
    { id: 'cat1', name: 'گوشی موبایل', parent: 'الکترونیک', slug: 'mobile', template: 'گوشی', faq: 3, active: true },
    { id: 'cat2', name: 'هدفون', parent: 'الکترونیک', slug: 'headphones', template: 'صوتی', faq: 2, active: true },
    { id: 'cat3', name: 'لپ‌تاپ', parent: 'الکترونیک', slug: 'laptop', template: 'رایانه', faq: 4, active: true },
    { id: 'cat4', name: 'ساعت هوشمند', parent: 'الکترونیک', slug: 'smartwatch', template: 'پوشیدنی', faq: 1, active: true },
    { id: 'cat5', name: 'تبلت', parent: 'الکترونیک', slug: 'tablet', template: 'رایانه', faq: 2, active: true },
    { id: 'cat6', name: 'کتاب‌خوان', parent: 'الکترونیک', slug: 'ereader', template: 'رایانه', faq: 0, active: true },
    { id: 'cat7', name: 'لوازم جانبی', parent: 'الکترونیک', slug: 'accessories', template: 'لوازم جانبی', faq: 1, active: true },
    { id: 'cat8', name: 'لوازم بهداشتی', parent: '—', slug: 'health', template: '—', faq: 0, active: false },
  ],
  brands: [
    { id: 'br1', name: 'اپل', en: 'Apple', origin: 'آمریکا', products: 6, active: true },
    { id: 'br2', name: 'سامسونگ', en: 'Samsung', origin: 'کره جنوبی', products: 1, active: true },
    { id: 'br3', name: 'سونی', en: 'Sony', origin: 'ژاپن', products: 1, active: true },
    { id: 'br4', name: 'آمازون', en: 'Amazon', origin: 'آمریکا', products: 1, active: true },
    { id: 'br5', name: 'انکر', en: 'Anker', origin: 'چین', products: 1, active: true },
  ],
  attrTemplates: [
    { id: 'at1', name: 'گوشی', fields: 'حافظه، رم، رنگ، سلامت باتری، شبکه، دوربین', compare: true },
    { id: 'at2', name: 'صوتی', fields: 'نوع اتصال، حذف نویز، عمر باتری، رنگ', compare: true },
    { id: 'at3', name: 'رایانه', fields: 'پردازنده، رم، حافظه، صفحه‌نمایش، رنگ', compare: true },
    { id: 'at4', name: 'پوشیدنی', fields: 'اندازه، جنس بند، سلامت باتری', compare: false },
    { id: 'at5', name: 'لوازم جانبی', fields: 'توان، درگاه، طول کابل', compare: false },
  ],
  collections: [
    { id: 'col1', name: 'استوک‌های گرید A+', type: 'مبتنی بر قانون', rule: 'وضعیت = استوک و گرید = A+', items: 4, active: true },
    { id: 'col2', name: 'هدفون‌های زیر ۲۰ میلیون', type: 'مبتنی بر قانون', rule: 'دسته = هدفون و قیمت < ۲۰٬۰۰۰٬۰۰۰', items: 3, active: true },
    { id: 'col3', name: 'تازه‌رسیده‌ها', type: 'دستی', rule: '—', items: 6, active: true },
  ],
  suppliers: [
    { id: 'sp1', name: 'دفتر اربیل', city: 'اربیل', channel: 'انبارگردانی آمازون', currency: 'دلار', terms: '۳۰٪ پیش‌پرداخت', quality: 96, leadDays: 9, phone: '+964-000-0000', active: true },
    { id: 'sp2', name: 'تأمین‌کنندهٔ دبی', city: 'دبی', channel: 'انبارگردانی آمازون', currency: 'درهم', terms: 'نقد', quality: 92, leadDays: 12, phone: '+971-000-0000', active: true },
    { id: 'sp3', name: 'شریک انبار مهاباد', city: 'مهاباد', channel: 'خرید مستقیم اقلیم کردستان', currency: 'تومان', terms: 'تسویهٔ دوهفته‌ای', quality: 90, leadDays: 2, phone: '044-00000000', active: true },
  ],
  purchaseOrders: [
    { id: 'PO-2041', supplier: 'دفتر اربیل', items: 'iPhone 16 Pro ×۶، AirPods Max ×۴', currency: 'دلار', amountFx: 9800, rate: 61500, prepaid: 30, status: 'در راه', eta: d(3) },
    { id: 'PO-2040', supplier: 'تأمین‌کنندهٔ دبی', items: 'MacBook Air M3 ×۳', currency: 'درهم', amountFx: 12600, rate: 16700, prepaid: 100, status: 'دریافت‌شده', eta: d(-6) },
    { id: 'PO-2039', supplier: 'شریک انبار مهاباد', items: 'Kindle Paperwhite ×۷', currency: 'تومان', amountFx: 60200000, rate: 1, prepaid: 0, status: 'پیش‌نویس', eta: d(10) },
  ],
  inbound: [
    { id: 'SH-118', po: 'PO-2041', units: 10, stage: 'انبار مرزی', freight: 18500000, customs: 9200000, eta: d(3), late: false },
    { id: 'SH-117', po: 'PO-2038', units: 12, stage: 'ارسال بین‌المللی', freight: 21000000, customs: 0, eta: d(-3), late: true },
    { id: 'SH-116', po: 'PO-2040', units: 3, stage: 'دریافت در تهران', freight: 7600000, customs: 4100000, eta: d(-6), late: false },
  ],
  zones: [
    { id: 'z1', name: 'تهران (محدودهٔ تحویل سریع)', cities: 'تهران، مناطق ۱ تا ۲۲', methods: 'تحویل سریع، پیک غنیمت، پست', active: true },
    { id: 'z2', name: 'کرج', cities: 'کرج، فردیس', methods: 'پیک غنیمت، پست', active: true },
    { id: 'z3', name: 'سایر شهرها', cities: 'سراسر کشور', methods: 'پست پیشتاز، تیپاکس', active: true },
  ],
  slots: [
    { id: 'sl1', name: '۹ تا ۱۲', capacity: 12, days: 'همهٔ روزها به‌جز جمعه', active: true },
    { id: 'sl2', name: '۱۲ تا ۱۵', capacity: 12, days: 'همهٔ روزها به‌جز جمعه', active: true },
    { id: 'sl3', name: '۱۵ تا ۱۸', capacity: 10, days: 'همهٔ روزها', active: true },
    { id: 'sl4', name: '۱۸ تا ۲۱', capacity: 8, days: 'همهٔ روزها', active: true },
  ],
  giftCards: [
    { id: 'GC-7781', holder: 'شرکت آرین‌پردازان نوین', amount: 5000000, balance: 3200000, expires: d(120), active: true },
    { id: 'GC-7765', holder: 'نگار امینی', amount: 1000000, balance: 1000000, expires: d(60), active: true },
  ],
  priceCampaigns: [
    { id: 'pc1', name: 'غنی‌آف هدست‌ها', type: 'پیشنهاد شگفت‌انگیز', discount: 20, products: 'AirPods Max ۲۰۲۴', start: d(0), end: d(1), cap: 5, active: true },
    { id: 'pc2', name: 'یلدای هدفون', type: 'تخفیف دسته', discount: 8, products: 'دستهٔ هدفون', start: d(35), end: d(42), cap: 0, active: false },
  ],
  templates: [
    { id: 'tp1', name: 'ثبت سفارش', channel: 'پیامک', text: 'غنیمت | سفارش {شماره_سفارش} ثبت شد. پیگیری: {لینک}', approved: true },
    { id: 'tp2', name: 'تحویل به پیک', channel: 'پیامک', text: 'غنیمت | سفارش {شماره_سفارش} دست پیک است. رصد: {لینک}', approved: true },
    { id: 'tp3', name: 'کد رهگیری پست', channel: 'پیامک', text: 'غنیمت | مرسوله {شماره_مرسوله} با کد {کد_رهگیری} به پست تحویل شد.', approved: true },
    { id: 'tp4', name: 'یلدای هدفون', channel: 'پیامک', text: 'غنیمت | {نام} عزیز، هدفون‌ها تا {درصد} ارزان‌تر شدند. {لینک}', approved: false },
  ],
  campaigns: [
    { id: 'cp1', name: 'بازگشت مشتریان خفته', audience: 'در خطر ریزش', channel: 'پیامک + بله', code: 'BACK8', send: d(1), status: 'زمان‌بندی‌شده', reach: 240 },
    { id: 'cp2', name: 'خوش‌آمد', audience: 'جدید', channel: 'پیامک', code: 'WELCOME', send: d(-30), status: 'فعال', reach: 1820 },
  ],
  automations: [
    { id: 'au1', name: 'سبد رهاشده', steps: 3, trigger: '۱ ساعت پس از رهاکردن سبد', active: true, conv: 12 },
    { id: 'au2', name: 'موجودشدن کالا', steps: 1, trigger: 'موجودشدن کالای «خبرم کن»', active: true, conv: 18 },
    { id: 'au3', name: 'درخواست دیدگاه', steps: 2, trigger: 'پایان مهلت مرجوعی', active: true, conv: 9 },
    { id: 'au4', name: 'پایان گارانتی', steps: 1, trigger: '۳۰ روز مانده به پایان گارانتی', active: false, conv: 0 },
  ],
  homeBlocks: [
    { id: 'hb1', name: 'Hero', kind: 'هیرو', title: 'کالای اصل، با عکس واقعی همان واحد', order: 1, active: true },
    { id: 'hb2', name: 'دسته‌ها', kind: 'ردیف دسته‌ها', title: 'دسته‌بندی‌ها', order: 2, active: true },
    { id: 'hb3', name: 'غنی‌آف', kind: 'کاروسل قانون‌محور', title: 'پیشنهادهای ویژه', order: 3, active: true },
    { id: 'hb4', name: 'استوک‌ها', kind: 'کاروسل قانون‌محور', title: 'استوک‌های تست‌شده', order: 4, active: true },
    { id: 'hb5', name: 'کنترل کیفیت', kind: 'بلوک متنی', title: 'کنترل کیفیت دو مرحله‌ای', order: 5, active: true },
    { id: 'hb6', name: 'یلدا', kind: 'بنر', title: 'یلدای هدفون', order: 6, active: false },
  ],
  articles: [
    { id: 'ar1', title: 'راهنمای خرید آیفون استوک', category: 'راهنمای خرید', author: 'پویا', status: 'منتشرشده', date: d(-12) },
    { id: 'ar2', title: 'تفاوت اکبند، جعبه‌باز و استوک', category: 'آموزشی', author: 'پویا', status: 'در حال نگارش', date: d(3) },
  ],
  faqs: [
    { id: 'fq1', q: 'کالای استوک یعنی چه؟', a: 'کالای استفاده‌شده‌ای که در دو مرحله تست شده و گرید ظاهری دارد.', group: 'وضعیت کالا', helpful: 86 },
    { id: 'fq2', q: 'مهلت مرجوعی چند روز است؟', a: '{مهلت_مرجوعی} روز از زمان تحویل.', group: 'مرجوعی', helpful: 91 },
    { id: 'fq3', q: 'تحویل سریع در کدام مناطق است؟', a: 'محدودهٔ تهران و کرج، تا ساعت قطع سفارش.', group: 'ارسال', helpful: 78 },
  ],
  legal: [
    { id: 'lg1', title: 'قوانین و مقررات', version: 4, effective: d(5), status: 'منتظر تأیید حقوقی' },
    { id: 'lg2', title: 'حریم خصوصی', version: 2, effective: d(-40), status: 'منتشرشده' },
    { id: 'lg3', title: 'شرایط استفاده', version: 3, effective: d(-90), status: 'منتشرشده' },
  ],
  redirects: [
    { id: 'rd1', from: '/product/iphone-15-pro-used', to: '/product/iphone-16-pro', code: 301, hits: 412, active: true },
    { id: 'rd2', from: '/category/earphones', to: '/category/headphones', code: 301, hits: 98, active: true },
  ],
  seoPages: [
    { id: 'sp-p1', page: 'صفحهٔ خانه', url: '/', title: 'غنیمت | کالای اصل وارداتی با عکس واقعی', desc: 'خرید کالای اصل اکبند، جعبه‌باز و استوک تست‌شده با عکس واقعی همان واحد.', score: 92 },
    { id: 'sp-p2', page: 'گوشی موبایل', url: '/category/mobile', title: 'خرید گوشی اصل | غنیمت', desc: '', score: 61 },
    { id: 'sp-p3', page: 'هدفون', url: '/category/headphones', title: 'خرید هدفون اصل | غنیمت', desc: 'هدفون اصل با گارانتی و تحویل سریع در تهران.', score: 84 },
    { id: 'sp-p4', page: 'iPhone 16 Pro', url: '/product/iphone-16-pro', title: 'خرید گوشی اپل iPhone 16 Pro ظرفیت ۲۵۶ گیگابایت | غنیمت', desc: '', score: 58 },
  ],
  branches: [
    { id: 'bh1', name: 'شعبهٔ مرکزی تهران', address: 'تهران، خیابان نمونه', hours: 'شنبه تا پنجشنبه ۱۰ تا ۲۰', phone: '021-00000002', pickup: true, test: true, active: true },
    { id: 'bh2', name: 'شعبهٔ کرج', address: 'کرج، خیابان نمونه', hours: '—', phone: '026-00000000', pickup: false, test: false, active: false },
  ],
  notifRules: [
    { id: 'nr1', event: 'سفارش جدید', to: 'مدیر کل', channels: 'پیامک، پوش', cond: 'همهٔ سفارش‌ها', quiet: true, active: true },
    { id: 'nr2', event: 'کالای منتشرشده توسط اپراتور', to: 'مدیر کل', channels: 'بله، درون‌پنل', cond: 'همه', quiet: true, active: true },
    { id: 'nr3', event: 'بازگشت وجه', to: 'مدیر کل، کارشناس مالی', channels: 'پیامک', cond: 'بالای ۵ میلیون', quiet: false, active: true },
  ],
})
