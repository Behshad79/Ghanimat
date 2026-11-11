// تنظیمات سایت مشتری (سربرگ، منو، فوتر، کارت و فهرست محصولات).
// «site» پیش‌نویس در حال ویرایش است و «sitePublished» نسخه‌ای است که مشتری می‌بیند.
export type Link = { id: string; label: string; to: string; badge?: string; children?: Link[]; hidden?: boolean }
export type CardLine = { id: string; kind: 'low' | 'origin' | 'bnpl' | 'custom'; text: string; on: boolean; icon?: string }
export type Social = { id: string; kind: string; url: string; on: boolean }

export const makeSite = () => ({
  theme: { radius: 16, font: 'وزیرمتن' },
  announce: {
    on: true, interval: 4, tone: 'brand' as 'brand' | 'ink' | 'yellow',
    items: [
      { id: 'an1', text: 'خرید کالای اصل، با ضمانتی که می‌توانید به آن اعتماد کنید', to: '/trust', on: true },
      { id: 'an2', text: 'تحویل ۲ ساعته در تهران', to: '/help/shipping', on: true },
      { id: 'an3', text: '۷ روز ضمانت بازگشت کالا', to: '/help/return-policy', on: true },
      { id: 'an4', text: 'ارسال رایگان خریدهای بالای {آستانه_ارسال_رایگان}', to: '/help/shipping', on: true },
    ],
  },
  header: {
    logo: 'full' as 'full' | 'mark', sticky: true, search: 'جست‌وجوی محصول، برند یا مدل…', showPhone: false, phone: '021-61887700',
    login: 'ثبت‌نام | ورود', showTrack: true, showWishlist: true, showAddress: true, addressLabel: 'انتخاب آدرس', showNotifications: true, showAiButton: true,
    utility: [
      { id: 'u1', label: 'تماس با ما', to: '/contact' },
      { id: 'u2', label: 'به‌زودی', to: '/coming-soon' },
      { id: 'u3', label: 'فروشنده شوید', to: '/become-seller', hidden: true },
      { id: 'u4', label: 'اعتماد به غنیمت', to: '/trust' },
    ] as Link[],
  },
  menu: [
    { id: 'm1', label: 'دسته‌بندی کالاها', to: '/categories', mega: true, children: [
      { id: 'm1a', label: 'موبایل', to: '/c/mobile' }, { id: 'm1b', label: 'لپ‌تاپ', to: '/c/laptop' }, { id: 'm1c', label: 'هدفون و هدست', to: '/c/headphones' },
      { id: 'm1d', label: 'ساعت هوشمند', to: '/c/smartwatch' }, { id: 'm1e', label: 'لوازم جانبی موبایل', to: '/c/accessories' }, { id: 'm1f', label: 'اسپیکر', to: '/c/speaker' },
      { id: 'm1g', label: 'کنسول بازی', to: '/c/console' }, { id: 'm1h', label: 'لوازم خانگی', to: '/c/home' },
    ] },
    { id: 'm2', label: 'پیشنهادهای ویژه', to: '/offers', badge: 'غنی‌آف', children: [] },
    { id: 'm3', label: 'پرفروش‌ترین‌ها', to: '/best-sellers', children: [] },
    { id: 'm4', label: 'کالاهای استوک و تست‌شده', to: '/c/all?cond=used', children: [] },
  ] as (Link & { mega?: boolean })[],
  footer: {
    about: 'غنیمت کالای اصل و اورجینال وارداتی را با تضمین اصالت و ارسال سریع در تهران و کرج به دست شما می‌رساند.',
    strip: [
      { id: 'st1', text: 'پشتیبانی ۲۴ ساعته', on: true }, { id: 'st2', text: 'امکان بازگشت کالا', on: true }, { id: 'st3', text: 'گارانتی ۳ تا ۱۲ ماهه', on: true },
      { id: 'st4', text: 'تضمین اصالت کالا', on: true }, { id: 'st5', text: 'ارسال سریع تهران و کرج', on: true },
    ],
    columns: [
      { id: 'f1', title: 'قوانین', links: <Link[]>[{ id: 'f1a', label: 'قوانین و مقررات', to: '/terms' }, { id: 'f1b', label: 'حریم خصوصی', to: '/privacy' }, { id: 'f1c', label: 'شرایط استفاده', to: '/conditions' }] },
      { id: 'f2', title: 'راهنمای کالا', links: <Link[]>[{ id: 'f2a', label: 'راهنمای ضمانت کالا', to: '/help/warranty' }, { id: 'f2b', label: 'راهنمای وضعیت کالا', to: '/help/product-condition' }, { id: 'f2c', label: 'راهنمای کنترل کیفیت', to: '/help/quality-control' }, { id: 'f2d', label: 'راهنمای مرجوعی در سایت', to: '/help/how-to-return' }] },
      { id: 'f3', title: 'مرکز راهنما', links: <Link[]>[{ id: 'f3a', label: 'سؤالات متداول', to: '/faq' }, { id: 'f3b', label: 'روش‌های خرید', to: '/help/how-to-order' }, { id: 'f3c', label: 'راهنمای خرید', to: '/help/before-buying' }, { id: 'f3d', label: 'شرایط و رویه‌های مرجوعی', to: '/help/return-policy' }, { id: 'f3e', label: 'شیوه‌ها و هزینهٔ ارسال کالا', to: '/help/shipping' }] },
      { id: 'f4', title: 'غنیمت', links: <Link[]>[{ id: 'f4a', label: 'فروشگاه', to: '/stores' }, { id: 'f4b', label: 'اعتماد به غنیمت', to: '/trust' }, { id: 'f4c', label: 'دربارهٔ غنیمت', to: '/about' }, { id: 'f4d', label: 'تماس با ما', to: '/contact' }, { id: 'f4e', label: 'بلاگ', to: '/blog' }, { id: 'f4f', label: 'به‌زودی', to: '/coming-soon' }, { id: 'f4g', label: 'فروشنده شوید', to: '/become-seller', hidden: true }] },
    ],
    phone: '021-61887700', email: 'support@ghanimat.example', hours: '۷ روز هفته، ۲۴ ساعته', address: 'تهران، خیابان ولیعصر، پلاک ۰',
    socials: [
      { id: 's1', kind: 'اینستاگرام', url: 'instagram.com/ghanimat', on: true },
      { id: 's2', kind: 'تلگرام', url: 't.me/ghanimat', on: true },
      { id: 's3', kind: 'لینکدین', url: 'linkedin.com/company/ghanimat', on: true },
      { id: 's4', kind: 'آپارات', url: 'aparat.com/ghanimat', on: true },
    ] as Social[],
    trust: { enamad: true, samandehi: true, union: true },
    newsletter: true, newsletterText: 'از تخفیف‌ها و کالاهای تازه باخبر شوید. کالاهای تازهٔ استوک و جعبه‌باز و پیشنهادهای ویژه را برای ایمیل یا موبایلتان می‌فرستیم.',
    seoTitle: 'غنیمت؛ فروشگاه اینترنتی کالای اصل و اورجینال وارداتی',
    seoText: 'هر کالایی که در غنیمت می‌بینید، پیش از قرار گرفتن روی سایت از کنترل کیفیت غنیمت عبور کرده است: پلمپ کالا بررسی می‌شود، کالای بدون پلمپ روشن و از نظر عملکرد پایه تست می‌شود، اصالتش تطبیق داده می‌شود و از همان کالا عکس واقعی گرفته می‌شود.',
    backToTop: true,
    copyright: 'تمام حقوق این وبسایت متعلق به فروشگاه آنلاین غنیمت می‌باشد.',
  },
  card: {
    interval: 2.6, cta: 'افزودن به سبد خرید', ratio: '1/1' as '1/1' | '4/5', colsDesktop: 4, colsMobile: 2,
    showTimer: true, showRating: true, showCompare: true, showFast: true, showGrade: true, showHot: true, showOutOfStock: true,
    lines: [
      { id: 'low', kind: 'low', text: 'موجودی محدود', on: true },
      { id: 'origin', kind: 'origin', text: 'ارسال از مبدأ آمازون', on: true },
      { id: 'bnpl', kind: 'bnpl', text: 'خرید {اقساط} قسطه {سرویس}', on: true },
    ] as CardLine[],
  },
  listing: {
    view: 'grid' as 'grid' | 'list', perPage: 24, sort: 'popular', showFilters: true, stickyFilters: true,
    filters: [
      { id: 'cat', label: 'دسته', on: true }, { id: 'brand', label: 'برند', on: true }, { id: 'price', label: 'بازهٔ قیمت', on: true },
      { id: 'cond', label: 'وضعیت کالا (نو، جعبه‌باز، استوک)', on: true }, { id: 'grade', label: 'گرید ظاهری', on: true },
      { id: 'fast', label: 'فقط تحویل سریع', on: true }, { id: 'bnpl', label: 'فقط اقساطی', on: true }, { id: 'stock', label: 'فقط موجود', on: false },
    ],
    chips: [
      { id: 'ch1', label: 'همه', on: true }, { id: 'ch2', label: 'ارسال سریع', on: true }, { id: 'ch3', label: 'اقساطی', on: true },
      { id: 'ch4', label: 'زیر ۱۰ میلیون', on: true }, { id: 'ch5', label: 'استوک تست‌شده', on: true },
    ],
  },
})
export type Site = ReturnType<typeof makeSite>

// ───── چیدمان انبار: طبقه ← قفسه ← خانه (Bin) ─────
export type Bin = { id: string; cap: number; blocked?: boolean; qty?: Record<string, number> }
export type Section = { id: string; name: string; zone: string; bins: Bin[] }
export type Floor = { id: string; name: string; sections: Section[] }
const bins = (p: string, n: number, cap: number, extra: Record<string, Partial<Bin>> = {}) =>
  Array.from({ length: n }, (_, i) => { const id = `${p}-${String(i + 1).padStart(2, '0')}`; return { id, cap, ...extra[id] } })
export const makeLayout = () => ({
  tehran: [
    { id: 'f1', name: 'همکف', sections: [
      { id: 'A', name: 'قفسهٔ A', zone: 'موبایل و تبلت', bins: bins('A', 6, 6, { 'A-05': { blocked: true } }) },
      { id: 'B', name: 'قفسهٔ B', zone: 'هدفون و صوتی', bins: bins('B', 6, 8) },
      { id: 'C', name: 'قفسهٔ C', zone: 'لپ‌تاپ', bins: bins('C', 4, 4) },
      { id: 'D', name: 'قفسهٔ D', zone: 'لوازم جانبی و پوشیدنی', bins: bins('D', 6, 30, { 'D-05': { qty: { p9: 24 } } }) },
    ] },
    { id: 'f2', name: 'طبقهٔ اول', sections: [
      { id: 'QC', name: 'میز QC', zone: 'بازرسی ورودی', bins: bins('QC', 4, 3).map((b, i) => ({ ...b, id: `QC-${i + 1}` })) },
      { id: 'PH', name: 'استودیو عکاسی', zone: 'عکاسی واحد', bins: bins('PH', 2, 4).map((b, i) => ({ ...b, id: `PH-${i + 1}` })) },
      { id: 'R', name: 'قفسهٔ R', zone: 'مرجوعی و قرنطینه', bins: bins('R', 4, 5) },
    ] },
  ] as Floor[],
  mahabad: [
    { id: 'f1', name: 'سالن اصلی', sections: [
      { id: 'M', name: 'قفسهٔ M', zone: 'همهٔ دسته‌ها', bins: bins('M', 12, 6, { 'M-08': { qty: { p8: 6 } }, 'M-09': { qty: { p9: 6 } } }) },
    ] },
  ] as Floor[],
})
export type Layout = ReturnType<typeof makeLayout>
export const binOf = (shelf: string) => { const p = shelf.split('-'); return p.length > 2 ? `${p[0]}-${p[1]}` : shelf }
