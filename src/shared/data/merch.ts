// ویترین سایت: غنی‌آف‌های زمان‌دار (با صف آینده، سقف تعداد و برگشت خودکار قیمت) و جایگاه‌های نمایش کالا طبق فریم‌های فیگما
import type { DB, Product } from './seed'
const h = (n: number) => new Date(Date.now() + n * 36e5).toISOString()

export type Deal = { id: string; pid: string; price: number; regular: number; start: string; end: string; cap: number; sold: number; perUser: number; paused?: boolean; endedAt?: string; places: string[]; notifyBefore: number; notified?: boolean; note?: string }
export type DealStatus = 'scheduled' | 'live' | 'soldout' | 'ended' | 'paused'
export const DEAL_LABEL: Record<DealStatus, [string, 'info' | 'success' | 'warning' | 'neutral' | 'danger']> = { scheduled: ['در صف', 'info'], live: ['در حال اجرا', 'success'], soldout: ['سقف تمام شد', 'warning'], ended: ['پایان‌یافته', 'neutral'], paused: ['متوقف', 'danger'] }

export type Placement = { id: string; name: string; page: string; path: string; figma: string; mode: 'auto' | 'manual' | 'mixed'; rule: string; max: number; pins: string[]; excl: string[]; on: boolean; from?: string; to?: string }

export function dealStatus(x: Deal, now = Date.now()): DealStatus {
  if (x.endedAt || new Date(x.end).getTime() <= now) return 'ended'
  if (x.sold >= x.cap) return 'soldout'
  if (x.paused) return 'paused'
  return new Date(x.start).getTime() > now ? 'scheduled' : 'live'
}
export const liveDeal = (d: DB, pid: string) => (d.merch?.deals ?? []).find((x) => x.pid === pid && dealStatus(x) === 'live')
/** هم‌پوشانی زمانی دو غنی‌آف یک کالا (برای جلوگیری از دو قیمت هم‌زمان) */
export const overlaps = (a: { pid: string; start: string; end: string; id?: string }, list: Deal[]) => list.find((x) => x.id !== a.id && x.pid === a.pid && !x.endedAt && new Date(x.start) < new Date(a.end) && new Date(a.start) < new Date(x.end))

const stockOf = (p: Product) => (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0)
/** کالاهای هر جایگاه: قانون خودکار + سنجاق‌های دستی − حذف‌شده‌ها */
export function placementItems(d: DB, pl: Placement): { p: Product; why: 'pin' | 'auto' }[] {
  const pub = d.products.filter((p) => p.status === 'product.published')
  const soldBy = (pid: string) => d.orders.flatMap((o) => o.shipments.flatMap((s) => s.items)).filter((i) => i.productId === pid).length
  let auto: Product[] = []
  switch (pl.id) {
    case 'amazing': case 'offers': auto = pub.filter((p) => liveDeal(d, p.id) || (pl.id === 'offers' && (p.compareAt ?? 0) > (p.price ?? 0))); break
    case 'bestsellers': auto = [...pub].sort((a, b) => soldBy(b.id) * 10 + b.views / 100 - (soldBy(a.id) * 10 + a.views / 100)); break
    case 'fast': auto = pub.filter((p) => p.fastEligible && ((p.qty?.tehran ?? 0) > 0 || d.units.some((u) => u.productId === p.id && u.warehouse === 'tehran' && u.status === 'unit.published'))); break
    case 'stock': auto = pub.filter((p) => p.condition && p.condition !== 'sealed'); break
    case 'soon': auto = d.products.filter((p) => !!p.comingSoon); break
    case 'personal': auto = [...pub].sort((a, b) => b.cvr - a.cvr); break
    case 'new': auto = [...pub].reverse(); break
    default: auto = []
  }
  if (pl.mode === 'manual') auto = []
  auto = auto.filter((p) => !pl.excl.includes(p.id) && (pl.id === 'soon' || stockOf(p) > 0 || p.mode === 'serial'))
  const pins = pl.pins.map((id) => d.products.find((p) => p.id === id)).filter((p): p is Product => !!p)
  return [...pins.map((p) => ({ p, why: 'pin' as const })), ...auto.filter((p) => !pl.pins.includes(p.id)).map((p) => ({ p, why: 'auto' as const }))].slice(0, pl.max)
}

export function makeMerch() {
  const P = (id: string, name: string, page: string, path: string, figma: string, mode: Placement['mode'], rule: string, max = 10, pins: string[] = []): Placement => ({ id, name, page, path, figma, mode, rule, max, pins, excl: [], on: true })
  return {
    deals: [
      { id: 'dl1', pid: 'p5', price: 17500000, regular: 21900000, start: h(-3), end: h(15), cap: 5, sold: 2, perUser: 1, places: ['amazing', 'offers'], notifyBefore: 2, notified: true },
      { id: 'dl2', pid: 'p2', price: 12900000, regular: 15500000, start: h(20), end: h(44), cap: 4, sold: 0, perUser: 1, places: ['amazing', 'offers'], notifyBefore: 2, note: 'شب یلدا' },
      { id: 'dl3', pid: 'p7', price: 4400000, regular: 5200000, start: h(50), end: h(62), cap: 10, sold: 0, perUser: 2, places: ['amazing'], notifyBefore: 1 },
      { id: 'dl4', pid: 'p3', price: 52000000, regular: 58500000, start: h(-50), end: h(-26), cap: 3, sold: 3, perUser: 1, places: ['amazing', 'offers'], notifyBefore: 2, notified: true },
    ] as Deal[],
    placements: [
      P('amazing', 'پیشنهاد شگفت‌انگیز (غنی‌آف)', 'خانه', '/', 'Ghanimat Desktop › پیشنهاد شگفت‌انگیز', 'mixed', 'غنی‌آف‌های در حال اجرا، به ترتیب زمان پایان', 8),
      P('bestsellers', 'محصولات پرفروش و محبوب', 'خانه', '/', 'Ghanimat Desktop › محصولات پرفروش', 'mixed', 'بیشترین فروش و بازدید ۳۰ روز اخیر', 10),
      P('fast', 'کالاهای ارسال سریع', 'خانه', '/', 'Ghanimat Desktop › ارسال سریع', 'auto', 'کالاهای دارای «ارسال سریع» با موجودی انبار تهران', 10),
      P('personal', 'پیشنهاد شخصی (بر اساس جست‌وجو)', 'خانه', '/', 'Ghanimat Desktop › پیشنهاد شخصی', 'auto', 'بر اساس جست‌وجو و بازدید هر کاربر؛ برای مهمان، بالاترین نرخ تبدیل', 10),
      P('stock', 'کالاهای نو، جعبه‌باز و استوک', 'خانه', '/', 'Ghanimat Desktop › نو، جعبه‌باز و استوک', 'mixed', 'کالاهای جعبه‌باز، استوک و بازسازی‌شده', 10),
      P('new', 'تازه‌ها', 'دسته‌بندی', '/category', 'General › صفحهٔ دسته‌بندی', 'auto', 'تازه‌ترین کالاهای منتشرشده', 12),
      P('offers', 'صفحهٔ پیشنهادهای ویژه', 'پیشنهادهای ویژه', '/offers', 'General › پیشنهادهای ویژه', 'mixed', 'غنی‌آف‌ها و کالاهای دارای تخفیف', 24),
      P('soon', 'به‌زودی', 'به‌زودی در ویژه‌ها', '/coming-soon', 'General › به زودی در ویژه ها', 'auto', 'کالاهای در راه که «به‌زودی» برایشان روشن است', 12),
    ],
  }
}
export type Merch = ReturnType<typeof makeMerch>
