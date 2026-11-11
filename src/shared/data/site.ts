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
      { id: 'an1', text: 'ارسال رایگان برای خریدهای بالای {آستانه_ارسال_رایگان}', to: '/shipping', on: true },
      { id: 'an2', text: 'ضمانت اصالت کالا؛ اگر اصل نبود، کل مبلغ برمی‌گردد', to: '/authenticity', on: true },
      { id: 'an3', text: 'خرید ۴ قسطه با اسنپ‌پی، بدون ضامن و چک', to: '/bnpl', on: true },
    ],
  },
  header: {
    logo: 'full' as 'full' | 'mark', sticky: true, search: 'جست‌وجو در کالاهای اصل وارداتی…', showPhone: true, phone: '021-00000000',
    login: 'ورود | ثبت‌نام', showTrack: true, showWishlist: true,
    utility: [
      { id: 'u1', label: 'پیگیری سفارش', to: '/track' },
      { id: 'u2', label: 'ضمانت اصالت', to: '/authenticity' },
      { id: 'u3', label: 'شعب', to: '/branches' },
    ] as Link[],
  },
  menu: [
    { id: 'm1', label: 'گوشی موبایل', to: '/c/mobile', children: [{ id: 'm1a', label: 'آیفون', to: '/c/mobile?brand=apple' }, { id: 'm1b', label: 'سامسونگ', to: '/c/mobile?brand=samsung' }, { id: 'm1c', label: 'استوک تست‌شده', to: '/c/mobile?cond=used' }] },
    { id: 'm2', label: 'هدفون و صوتی', to: '/c/headphones', children: [{ id: 'm2a', label: 'ایرپادز', to: '/c/headphones?brand=apple' }, { id: 'm2b', label: 'سونی', to: '/c/headphones?brand=sony' }] },
    { id: 'm3', label: 'لپ‌تاپ و تبلت', to: '/c/laptop', children: [{ id: 'm3a', label: 'مک‌بوک', to: '/c/laptop?brand=apple' }, { id: 'm3b', label: 'آیپد', to: '/c/tablet' }] },
    { id: 'm4', label: 'ساعت هوشمند', to: '/c/smartwatch', children: [] },
    { id: 'm5', label: 'لوازم جانبی', to: '/c/accessories', children: [] },
    { id: 'm6', label: 'غنی‌آف', to: '/offers', badge: 'داغ', children: [] },
    { id: 'm7', label: 'استوک و جعبه‌باز', to: '/c/all?cond=used', badge: 'جدید', children: [] },
  ] as Link[],
  footer: {
    about: 'غنیمت فروشگاه کالای اصل وارداتی است. هر واحد پیش از انتشار دو مرحله کنترل کیفیت می‌شود و عکس همان واحد را می‌بینید.',
    columns: [
      { id: 'f1', title: 'خرید از غنیمت', links: <Link[]>[{ id: 'f1a', label: 'راهنمای خرید', to: '/help/buy' }, { id: 'f1b', label: 'خرید اقساطی', to: '/bnpl' }, { id: 'f1c', label: 'شیوه‌های ارسال', to: '/shipping' }, { id: 'f1d', label: 'پیگیری سفارش', to: '/track' }] },
      { id: 'f2', title: 'خدمات مشتریان', links: <Link[]>[{ id: 'f2a', label: 'شرایط مرجوعی', to: '/returns' }, { id: 'f2b', label: 'گارانتی', to: '/warranty' }, { id: 'f2c', label: 'پرسش‌های متداول', to: '/faq' }, { id: 'f2d', label: 'تماس با ما', to: '/contact' }] },
      { id: 'f3', title: 'غنیمت', links: <Link[]>[{ id: 'f3a', label: 'دربارهٔ ما', to: '/about' }, { id: 'f3b', label: 'وبلاگ', to: '/blog' }, { id: 'f3c', label: 'حریم خصوصی', to: '/privacy' }, { id: 'f3d', label: 'قوانین و مقررات', to: '/terms' }] },
    ],
    phone: '021-00000000', email: 'support@ghanimat.example', hours: 'شنبه تا پنجشنبه، ۹ تا ۲۱', address: 'تهران، خیابان ولیعصر، پلاک ۰',
    socials: [
      { id: 's1', kind: 'اینستاگرام', url: 'instagram.com/ghanimat', on: true },
      { id: 's2', kind: 'تلگرام', url: 't.me/ghanimat', on: true },
      { id: 's3', kind: 'لینکدین', url: 'linkedin.com/company/ghanimat', on: true },
      { id: 's4', kind: 'آپارات', url: 'aparat.com/ghanimat', on: false },
    ] as Social[],
    trust: { enamad: true, samandehi: true, union: true },
    newsletter: true, newsletterText: 'از غنی‌آف‌ها و کالاهای تازه زودتر باخبر شوید.',
    copyright: 'تمام حقوق برای غنیمت محفوظ است.',
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
