// پایپ‌لاین تصویر: بهینه‌سازی، مربع‌کردن (برش یا حاشیهٔ سفید)، واترمارک و ویرایش (چرخش، قرینه، نور و کنتراست)
// در نسخهٔ نهایی همین کارها سمت سرور هم انجام می‌شود و نسخه‌های ۲۰۰، ۵۰۰ و ۱۲۰۰ پیکسلی ساخته می‌شود.
import { getDB } from './store'

export type { MediaItem } from '../data/seed'
export type SquareMode = 'none' | 'crop' | 'pad'
export type ProcessOpts = { optimize: boolean; square: SquareMode; watermark: boolean }
export type EditOpts = { rotate: 0 | 90 | 180 | 270; flip: boolean; brightness: number; contrast: number; square: SquareMode; offset: number }

/** راهنمای اندازه برای عکس کالا */
export const GUIDE = { min: 800, ideal: 1200, max: 1600, maxUpload: 20 * 1024 * 1024, target: 300 * 1024 }
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

export const bytesOf = (dataUrl: string) => (dataUrl.startsWith('data:') ? Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4) : 0)
export const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(n / 1024)).toLocaleString('fa-IR')} کیلوبایت`)

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('تصویر باز نشد.')); i.src = src })
const read = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error('خواندن فایل ناموفق بود.')); r.onload = () => res(String(r.result)); r.readAsDataURL(f) })

/** ارزیابی اندازه و نسبت تصویر برای صفحهٔ کالا */
const n = (x: number) => x.toLocaleString('fa-IR', { useGrouping: false })
export function assess(w: number, h: number, size: number): { tone: 'success' | 'warning' | 'danger'; text: string }[] {
  const out: { tone: 'success' | 'warning' | 'danger'; text: string }[] = []
  const side = Math.min(w, h)
  if (side < 500) out.push({ tone: 'danger', text: `خیلی کوچک (${n(w)}×${n(h)})؛ حداقل ${n(GUIDE.min)}×${n(GUIDE.min)}` })
  else if (side < GUIDE.min) out.push({ tone: 'warning', text: `کوچک (${n(w)}×${n(h)})؛ بزرگ‌نمایی صفحهٔ کالا تار می‌شود` })
  if (Math.abs(w / h - 1) > 0.02) out.push({ tone: 'warning', text: 'مربع نیست؛ کارت و گالری کالا ۱:۱ است' })
  if (size > 1.5 * 1024 * 1024) out.push({ tone: 'warning', text: `حجم زیاد (${kb(size)})؛ بهینه‌سازی آن را کم می‌کند` })
  if (!out.length) out.push({ tone: 'success', text: side >= GUIDE.ideal ? 'اندازهٔ ایده‌آل' : 'اندازهٔ قابل قبول' })
  return out
}

async function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const wm = getDB().storeCfg.media.watermark; const logo = await load(getDB().storeCfg.media.logo).catch(() => null); if (!logo) return
  const lw = Math.round((W * wm.size) / 100); const lh = Math.round((logo.height / logo.width) * lw); const m = Math.round(W * 0.03)
  const pos: Record<string, [number, number]> = { 'بالا راست': [W - lw - m, m], 'بالا چپ': [m, m], 'وسط': [(W - lw) / 2, (H - lh) / 2], 'پایین راست': [W - lw - m, H - lh - m], 'پایین چپ': [m, H - lh - m] }
  const [x, y] = pos[wm.pos] ?? pos['پایین چپ']; ctx.globalAlpha = wm.opacity / 100; ctx.drawImage(logo, x, y, lw, lh); ctx.globalAlpha = 1
}

/** رسم تصویر با چرخش، قرینه، مربع‌کردن و تغییر اندازه روی بوم */
async function render(img: HTMLImageElement, o: { rotate?: number; flip?: boolean; brightness?: number; contrast?: number; square: SquareMode; offset?: number; max?: number; watermark?: boolean }) {
  const rot = o.rotate ?? 0; const sw = rot % 180 ? img.height : img.width; const sh = rot % 180 ? img.width : img.height
  // مرحلهٔ ۱: چرخش و قرینه و نور روی بوم میانی
  const a = document.createElement('canvas'); a.width = sw; a.height = sh; const ac = a.getContext('2d')!
  ac.filter = `brightness(${o.brightness ?? 100}%) contrast(${o.contrast ?? 100}%)`
  ac.translate(sw / 2, sh / 2); ac.rotate((rot * Math.PI) / 180); if (o.flip) ac.scale(-1, 1); ac.drawImage(img, -img.width / 2, -img.height / 2)
  // مرحلهٔ ۲: مربع و اندازهٔ نهایی
  let cw = sw, ch = sh, sx = 0, sy = 0, sW = sw, sH = sh, dx = 0, dy = 0, dW = sw, dH = sh
  if (o.square === 'crop') { const s = Math.min(sw, sh); const t = (o.offset ?? 50) / 100; sx = (sw - s) * t; sy = (sh - s) * t; sW = sH = s; cw = ch = dW = dH = s }
  if (o.square === 'pad') { const s = Math.max(sw, sh); cw = ch = s; dx = (s - sw) / 2; dy = (s - sh) / 2 }
  const k = o.max ? Math.min(1, o.max / Math.max(cw, ch)) : 1
  const c = document.createElement('canvas'); c.width = Math.round(cw * k); c.height = Math.round(ch * k); const cc = c.getContext('2d')!
  if (o.square === 'pad') { cc.fillStyle = '#ffffff'; cc.fillRect(0, 0, c.width, c.height) }
  cc.drawImage(a, sx, sy, sW, sH, dx * k, dy * k, dW * k, dH * k)
  if (o.watermark) await drawWatermark(cc, c.width, c.height)
  return c
}
const encode = (c: HTMLCanvasElement, optimize: boolean) => { if (optimize) { const w = c.toDataURL('image/webp', 0.82); if (w.startsWith('data:image/webp')) return w; return c.toDataURL('image/jpeg', 0.85) } return c.toDataURL('image/png') }

/** آماده‌سازی فایل انتخاب‌شده پیش از بارگذاری؛ برای پیش‌نمایش و برآورد حجم */
export async function readFile(f: File) {
  if (!f.type.startsWith('image/')) throw new Error(`«${f.name}» تصویر نیست.`)
  if (f.size > GUIDE.maxUpload) throw new Error(`«${f.name}» بیشتر از ${kb(GUIDE.maxUpload)} است.`)
  const src = await read(f); const img = await load(src)
  return { src, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, size: f.size, type: f.type }
}

/** اجرای پایپ‌لاین روی یک تصویر خوانده‌شده */
export async function processImage(src: string, type: string, o: ProcessOpts) {
  const img = await load(src)
  if (type === 'image/svg+xml' || type === 'image/gif' || (!o.optimize && o.square === 'none' && !o.watermark)) return { src, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, size: bytesOf(src), type: type.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg') }
  const c = await render(img, { square: o.square, max: o.optimize ? GUIDE.max : undefined, watermark: o.watermark })
  const out = encode(c, o.optimize)
  return { src: out, w: c.width, h: c.height, size: bytesOf(out), type: out.startsWith('data:image/webp') ? 'webp' : out.startsWith('data:image/jpeg') ? 'jpg' : 'png' }
}

/** ویرایش تصویر موجود (چرخش، قرینه، نور، کنتراست، مربع) */
export async function editImage(src: string, e: EditOpts, optimize = true) {
  const img = await load(src)
  const c = await render(img, { rotate: e.rotate, flip: e.flip, brightness: e.brightness, contrast: e.contrast, square: e.square, offset: e.offset, max: optimize ? GUIDE.max : undefined })
  const out = encode(c, optimize)
  return { src: out, w: c.width, h: c.height, size: bytesOf(out) }
}

/** فایل‌های کتابخانه که در کالاها استفاده شده‌اند */
export const usageOf = (src: string) => getDB().products.filter((p) => p.image === src || (p.images ?? []).includes(src))
