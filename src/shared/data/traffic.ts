// بازدید زنده، جست‌وجوهای داخل سایت، نشست‌های فعال تیم و استوری‌های صفحهٔ اصلی (نمونه)
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
export type SearchRow = { id: string; term: string; count: number; results: number; ctr: number; action?: string }
export type Sess = { id: string; userId: string; device: string; browser: string; ip: string; city: string; last: string; current?: boolean }
export type Story = { id: string; title: string; cover: string; link: string; kind: 'product' | 'category' | 'blog' | 'url'; views: number; clicks: number; until: string; on: boolean }
export const makeTraffic = () => ({
  searches: [
    { id: 's1', term: 'ایرپاد ۴', count: 412, results: 0, ctr: 0 }, { id: 's2', term: 'آیفون ۱۶ پرو', count: 380, results: 3, ctr: 41 }, { id: 's3', term: 'کیندل', count: 296, results: 1, ctr: 18 },
    { id: 's4', term: 'هدفون سونی', count: 241, results: 2, ctr: 37 }, { id: 's5', term: 'مک بوک استوک', count: 198, results: 1, ctr: 33 }, { id: 's6', term: 'ساعت اپل', count: 176, results: 2, ctr: 29 },
    { id: 's7', term: 'گلکسی s25', count: 151, results: 0, ctr: 0 }, { id: 's8', term: 'شارژر انکر', count: 97, results: 1, ctr: 22 }, { id: 's9', term: 'airpods max', count: 88, results: 1, ctr: 46 }, { id: 's10', term: 'لپ تاپ دانشجویی', count: 64, results: 0, ctr: 0 },
  ] as SearchRow[],
  synonyms: [['ایرپاد', 'AirPods'], ['کیندل', 'Kindle'], ['مک بوک', 'MacBook']] as [string, string][],
  sessions: [
    { id: 'ss1', userId: 'u1', device: 'مک‌بوک', browser: 'Chrome ۱۳۰', ip: '5.112.x.x', city: 'تهران', last: ago(0), current: true },
    { id: 'ss2', userId: 'u1', device: 'آیفون', browser: 'Safari', ip: '37.98.x.x', city: 'تهران', last: ago(95) },
    { id: 'ss3', userId: 'u2', device: 'ویندوز', browser: 'Edge', ip: '5.120.x.x', city: 'تهران', last: ago(4) },
    { id: 'ss4', userId: 'u5', device: 'اندروید', browser: 'Chrome', ip: '91.98.x.x', city: 'کرج', last: ago(12) },
    { id: 'ss5', userId: 'u6', device: 'ویندوز', browser: 'Firefox', ip: '185.51.x.x', city: 'استانبول', last: ago(60 * 26) },
  ] as Sess[],
  stories: [
    { id: 'st1', title: 'آیفون ۱۶ پرو استوک', cover: './products/p1-500.webp', link: '/product/p1', kind: 'product', views: 3820, clicks: 412, until: ago(-60 * 24 * 2), on: true },
    { id: 'st2', title: 'آنباکسینگ AirPods Max', cover: './products/p2-500.webp', link: '/blog/videos', kind: 'blog', views: 2140, clicks: 188, until: ago(-60 * 24), on: true },
    { id: 'st3', title: 'هفتهٔ هدفون', cover: './products/p5-500.webp', link: '/category/headphones', kind: 'category', views: 1610, clicks: 97, until: ago(-60 * 24 * 5), on: true },
    { id: 'st4', title: 'ساعت هوشمند با گارانتی', cover: './products/p4-500.webp', link: '/category/watch', kind: 'category', views: 0, clicks: 0, until: ago(-60 * 24 * 7), on: false },
  ] as Story[],
})
