// وبلاگ و ویدیوهای غنیمت: مقاله‌ها با بلوک‌های محتوا، ویدیوها، دیدگاه‌ها و چیدمان صفحهٔ اصلی وبلاگ (مطابق فریم‌های فیگما)
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString()

export type BlockT = 'h2' | 'h3' | 'p' | 'img' | 'banner' | 'product' | 'products' | 'compare' | 'grades' | 'callout' | 'summary' | 'quote' | 'cta' | 'faq' | 'video' | 'link' | 'toc' | 'divider'
export type Block = { id: string; t: BlockT; v?: string; html?: string; src?: string; alt?: string; caption?: string; href?: string; w?: number; h?: number; pid?: string; pids?: string[]; tone?: 'tip' | 'warn' | 'info'; author?: string; btn?: string; rows?: [string, string][]; cols?: { title: string; sub: string; points: string }[]; vid?: string; external?: boolean }
export type Post = { id: string; title: string; slug: string; excerpt: string; cover: string; category: string; tags: string[]; author: string; reviewer?: string; status: 'پیش‌نویس' | 'در بازبینی' | 'زمان‌بندی‌شده' | 'منتشرشده'; publishAt: string; views: number; helpful: [number, number]; seo: { title: string; desc: string }; featured?: boolean; related: string[]; blocks: Block[] }
export type BComment = { id: string; postId: string; name: string; text: string; at: string; status: 'pending' | 'approved' | 'rejected'; reply?: string }
export type Video = { id: string; title: string; cat: string; dur: string; views: number; cover: string; url: string; productId?: string; isNew?: boolean; featured?: boolean; status: 'منتشرشده' | 'پیش‌نویس'; desc?: string }

const b = (t: BlockT, x: Partial<Block> = {}): Block => ({ id: `${t}${Math.random().toString(36).slice(2, 7)}`, t, ...x })
export const BLOG_CATS = ['راهنمای خرید', 'آموزشی', 'اصالت کالا', 'نقد و بررسی', 'فرهنگ خرید', 'سبک زندگی', 'اخبار']
export const VIDEO_CATS = ['آنباکسینگ', 'بررسی کالا', 'راهنمای خرید', 'آموزش استفاده', 'کنترل کیفیت']

export const makeBlog = () => ({
  posts: [
    { id: 'ar1', title: 'مهم‌ترین نکات خرید کالای استوک؛ چطور یک انتخاب مطمئن داشته باشیم؟', slug: 'stock-buying-guide', excerpt: 'وضعیت، گرید، عکس‌های واقعی، گارانتی و مهلت بازگشت را پیش از پرداخت بررسی کنید.', cover: './products/p1-500.webp', category: 'راهنمای خرید', tags: ['راهنمای خرید', 'کنترل کیفیت', 'گرید ظاهری', 'کالای استوک'], author: 'تحریریهٔ غنیمت', reviewer: 'علی رضایی، متخصص تست و بررسی سخت‌افزار', status: 'منتشرشده', publishAt: d(-12), views: 2480, helpful: [184, 9], seo: { title: 'نکات خرید کالای استوک | وبلاگ غنیمت', desc: 'راهنمای کامل خرید کالای استوک و تست‌شده: گرید ظاهری، عکس واقعی، گارانتی و مهلت بازگشت.' }, featured: true, related: ['ar3', 'ar4'], blocks: [
      b('toc'),
      b('h2', { v: 'کالای استوک دقیقاً یعنی چه؟' }), b('p', { html: 'کالای <b>استوک</b> کالایی است که پلمپ آن باز شده و پیش از عرضه در غنیمت <a href="/help/qc">تست و کنترل کیفیت</a> شده است.' }),
      b('compare', { cols: [{ title: 'استوک - تست‌شده', sub: 'پلمپ باز شده · تست‌شده در غنیمت · دارای گرید ظاهری', points: 'عکس واقعی همان واحد\nگزارش تست\nگارانتی غنیمت' }, { title: 'اکبند - پلمپ', sub: 'پلمپ و بسته‌بندی اصلی کارخانه · بدون گرید', points: 'نو و دست‌نخورده\nگارانتی\nقیمت بالاتر' }] }),
      b('h2', { v: 'گرید ظاهری را جدی بگیرید' }), b('grades', { rows: [['A+', 'بدون خط‌وخش یا نشانهٔ استفادهٔ قابل مشاهده؛ در حد نو.'], ['A', 'خط‌وخش یا سایش جزئی که فقط از نزدیک دیده می‌شود.'], ['B', 'خط‌وخش یا سایش قابل مشاهده روی بدنه یا صفحه.']] }),
      b('h2', { v: 'عکس‌های واقعی همان کالا را ببینید' }), b('product', { pid: 'p2', v: 'بخش «وضعیت کالا» در صفحهٔ محصول' }),
      b('callout', { tone: 'info', v: 'هیچ کالایی بدون عبور از کنترل کیفیت غنیمت در سایت نمایش داده نمی‌شود.' }),
      b('h2', { v: 'گارانتی و مهلت بازگشت را بشناسید' }), b('p', { html: 'هر کالا گارانتی ۳ تا ۱۲ ماهه و ۷ روز مهلت بازگشت دارد.' }),
      b('banner', { src: './figma/home.webp', href: '/category/stock', w: 1200, h: 400, alt: 'کالاهای استوک و تست‌شده' }),
      b('h2', { v: 'عجله کنید، اما با دقت' }), b('products', { pids: ['p2', 'p4', 'p5'], v: 'کالاهای مرتبط' }),
      b('summary', { v: 'وضعیت، گرید، عکس‌های واقعی، گارانتی و مهلت بازگشت را پیش از پرداخت بررسی کنید.' }),
    ] },
    { id: 'ar2', title: 'تفاوت اکبند، جعبه‌باز و استوک', slug: 'sealed-openbox-stock', excerpt: 'سه وضعیت کالا در غنیمت و اینکه کدام برای شما مناسب‌تر است.', cover: './products/p3-500.webp', category: 'آموزشی', tags: ['وضعیت کالا'], author: 'پویا', status: 'در بازبینی', publishAt: d(3), views: 0, helpful: [0, 0], seo: { title: 'تفاوت اکبند، جعبه‌باز و استوک', desc: '' }, related: [], blocks: [b('h2', { v: 'سه وضعیت، سه قیمت' }), b('p', { html: 'متن مقاله در حال نگارش است.' })] },
    { id: 'ar3', title: 'راهنمای تشخیص کالای اصل', slug: 'original-check', excerpt: 'از شماره سریال تا بسته‌بندی؛ نشانه‌هایی که باید پیش از خرید بررسی کنید.', cover: './products/p4-500.webp', category: 'اصالت کالا', tags: ['اصالت کالا'], author: 'تحریریهٔ غنیمت', status: 'منتشرشده', publishAt: d(-20), views: 3120, helpful: [96, 4], seo: { title: 'راهنمای تشخیص کالای اصل | غنیمت', desc: 'نشانه‌های کالای اصل و اورجینال.' }, related: ['ar1'], blocks: [b('p', { html: 'شماره سریال را در سایت سازنده استعلام کنید.' })] },
    { id: 'ar4', title: 'آشنایی با سیستم عامل iOS 27', slug: 'ios-27', excerpt: 'یکی از مهم‌ترین به‌روزرسانی‌های نرم‌افزاری اپل در سال‌های اخیر.', cover: './products/p1-500.webp', category: 'اخبار', tags: ['اپل'], author: 'پویا', status: 'زمان‌بندی‌شده', publishAt: d(2), views: 0, helpful: [0, 0], seo: { title: 'iOS 27 | غنیمت', desc: '' }, related: [], blocks: [b('video', { href: 'https://www.aparat.com/v/sample', v: 'معرفی iOS 27' })] },
  ] as Post[],
  comments: [
    { id: 'bc1', postId: 'ar1', name: 'مریم', text: 'خیلی کاربردی بود. فرق گرید A و B را نمی‌دانستم؛ حالا با خیال راحت‌تر انتخاب می‌کنم.', at: d(-11), status: 'approved' },
    { id: 'bc2', postId: 'ar1', name: 'علی', text: 'اگر بعد از خرید ببینم گرید کالا با چیزی که نوشته شده فرق دارد، چه کار باید بکنم؟', at: d(-10), status: 'approved', reply: 'تا ۷ روز می‌توانید از پنل کاربری درخواست مرجوعی ثبت کنید؛ هزینهٔ ارسال با غنیمت است.' },
    { id: 'bc3', postId: 'ar3', name: 'کاربر مهمان', text: 'لینک خرید ارزان از سایت دیگر: ...', at: d(-1), status: 'pending' },
  ] as BComment[],
  videos: [
    { id: 'v1', title: 'آنباکسینگ AirPods اکبند و بررسی پلمپ', cat: 'آنباکسینگ', dur: '۵:۴۰', views: 6300, cover: './products/p2-500.webp', url: 'https://www.aparat.com/v/a1', productId: 'p2', featured: true, status: 'منتشرشده' },
    { id: 'v2', title: 'بازکردن جعبهٔ مرسوله؛ پیش از امضا', cat: 'آنباکسینگ', dur: '۳:۲۰', views: 4400, cover: './products/p5-500.webp', url: 'https://www.aparat.com/v/a2', status: 'منتشرشده' },
    { id: 'v3', title: 'چک‌لیست خرید لپ‌تاپ استوک', cat: 'راهنمای خرید', dur: '۸:۲۰', views: 3100, cover: './products/p3-500.webp', url: 'https://www.aparat.com/v/a3', productId: 'p3', status: 'منتشرشده' },
    { id: 'v4', title: 'بهینه‌سازی باتری لپ‌تاپ', cat: 'آموزش استفاده', dur: '۹:۰۵', views: 1800, cover: './products/p3-500.webp', url: 'https://www.aparat.com/v/a4', status: 'منتشرشده' },
    { id: 'v5', title: 'ماوس اصل یا طرح؟', cat: 'بررسی کالا', dur: '۶:۱۲', views: 980, cover: './products/p8-500.webp', url: 'https://www.aparat.com/v/a5', isNew: true, status: 'منتشرشده' },
    { id: 'v6', title: 'تست سلامت باتری آیفون در کنترل کیفیت', cat: 'کنترل کیفیت', dur: '۴:۱۰', views: 1200, cover: './products/p1-500.webp', url: '', productId: 'p1', isNew: true, status: 'پیش‌نویس' },
  ] as Video[],
  landing: {
    hero: 'راهنماهای خرید، نقد کالا و خبرهای دنیای تکنولوژی را برای خریدی آگاهانه‌تر می‌نویسیم.',
    sections: [{ id: 'featured', label: 'مقالهٔ ویژه (بالای صفحه)', on: true }, { id: 'cats', label: 'دسته‌بندی‌ها', on: true }, { id: 'latest', label: 'تازه‌ترین مطالب', on: true }, { id: 'popular', label: 'پربازدیدترین‌ها', on: true }, { id: 'videos', label: 'ردیف ویدیوها', on: true }, { id: 'products', label: 'کالاهای پیشنهادی', on: false }, { id: 'newsletter', label: 'خبرنامه', on: true }],
    videoHero: 'مطمئن بخر و اول ببین؛ از بررسی تخصصی تا آنباکسینگ، همه با ویدیو!',
    popularSearches: ['تست سلامت باتری', 'گرید ظاهری', 'آنباکسینگ AirPods'],
  },
  cats: [...BLOG_CATS],
  videoCats: [...VIDEO_CATS],
})
export type Blog = ReturnType<typeof makeBlog>
export const readMin = (p: Post) => Math.max(1, Math.round(p.blocks.reduce((a, x) => a + ((x.v ?? '') + (x.html ?? '').replace(/<[^>]+>/g, '')).split(/\s+/).length, 0) / 180) + 2)
