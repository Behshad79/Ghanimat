// آیکون‌ها و رنگ‌های آماده برای خط متحرک کارت کالا
import { useDB } from '@/shared/lib/store'
import { BadgeCheck, CircleAlert, Clock, CreditCard, Flame, Gift, Heart, Plane, ShieldCheck, Sparkle, Star, Tag, Truck, Zap, type LucideIcon } from 'lucide-react'
export const LINE_ICONS: Record<string, [LucideIcon, string]> = {
  alert: [CircleAlert, 'هشدار'], plane: [Plane, 'هواپیما'], card: [CreditCard, 'کارت'], sparkle: [Sparkle, 'درخشش'], truck: [Truck, 'ارسال'], shield: [ShieldCheck, 'ضمانت'],
  flame: [Flame, 'داغ'], gift: [Gift, 'هدیه'], clock: [Clock, 'زمان'], star: [Star, 'ستاره'], tag: [Tag, 'برچسب'], badge: [BadgeCheck, 'تأییدشده'], zap: [Zap, 'سریع'], heart: [Heart, 'محبوب'],
}
export const LINE_COLORS = ['#0000ff', '#d97706', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#10123d']
export const KIND_DEFAULT: Record<string, { icon: string; color: string }> = { low: { icon: 'alert', color: '#d97706' }, origin: { icon: 'plane', color: '#0000ff' }, bnpl: { icon: 'card', color: '#0000ff' }, fast: { icon: 'zap', color: '#16a34a' }, custom: { icon: 'sparkle', color: '#0000ff' } }
export const WEIGHT: [string, string][] = [['1', 'عادی'], ['2', 'مهم'], ['3', 'خیلی مهم']]
export type UserIcon = { id: string; name: string; src: string; mono: boolean }
/** آیکون خط کارت: آیکون آماده یا آیکون بارگذاری‌شده (u:شناسه). آیکون تک‌رنگ با رنگ انتخابی رنگ‌آمیزی می‌شود؛ آیکون رنگی همان رنگ خودش را نگه می‌دارد */
export function LineIcon({ k, color, size = 15 }: { k?: string; color?: string; size?: number }) {
  const d = useDB()
  if (k?.startsWith('u:')) { const u = (d.site.card.icons ?? []).find((x) => x.id === k.slice(2)); if (u) return u.mono ? <span aria-hidden className="inline-block shrink-0" style={{ width: size, height: size, background: color ?? '#0000ff', WebkitMask: `url("${u.src}") center/contain no-repeat`, mask: `url("${u.src}") center/contain no-repeat` }} /> : <img src={u.src} alt="" aria-hidden className="shrink-0 object-contain" style={{ width: size, height: size }} /> }
  const I = (LINE_ICONS[k ?? 'sparkle'] ?? LINE_ICONS.sparkle)[0]; return <I size={size} style={{ color: color ?? '#0000ff' }} className="shrink-0" />
}
/** همهٔ آیکون‌های قابل انتخاب: آماده + بارگذاری‌شده */
export function useIconKeys(): [string, string][] { const d = useDB(); return [...Object.entries(LINE_ICONS).map(([k, [, lb]]) => [k, lb] as [string, string]), ...(d.site.card.icons ?? []).map((u) => [`u:${u.id}`, u.name] as [string, string])] }
/** بررسی فایل آیکون: SVG (ترجیحی، مربع، تا ۲۰ کیلوبایت) یا PNG/WebP شفاف مربع حداقل ۴۸×۴۸ و حداکثر ۵۰ کیلوبایت */
export async function readIcon(f: File): Promise<UserIcon> {
  const name = f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 24) || 'آیکون'
  const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)
  if (!isSvg && !/^image\/(png|webp)$/.test(f.type)) throw new Error('فقط SVG، PNG یا WebP. بهترین گزینه SVG تک‌رنگ است.')
  if (f.size > (isSvg ? 20 : 50) * 1024) throw new Error(isSvg ? 'حجم SVG باید زیر ۲۰ کیلوبایت باشد؛ آن را بهینه کنید (مثلاً با SVGOMG).' : 'حجم PNG یا WebP باید زیر ۵۰ کیلوبایت باشد.')
  const src = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('فایل خوانده نشد.')); r.readAsDataURL(f) })
  if (isSvg) {
    const txt = await f.text(); if (!/<svg[\s>]/i.test(txt)) throw new Error('فایل SVG معتبر نیست.'); if (/<script|on\w+=/i.test(txt)) throw new Error('SVG دارای اسکریپت پذیرفته نمی‌شود.')
    const vb = txt.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i); if (vb && Math.abs(+vb[1] / +vb[2] - 1) > 0.15) throw new Error('آیکون باید مربع باشد (مثلاً viewBox="0 0 24 24").')
    const colors = new Set((txt.match(/(?:fill|stroke)=["']([^"']+)["']/gi) ?? []).map((m) => m.split(/=/)[1].replace(/["']/g, '').toLowerCase()).filter((c) => !['none', 'currentcolor', 'transparent'].includes(c)))
    return { id: Date.now().toString(36), name, src, mono: colors.size <= 1 }
  }
  const dim = await new Promise<[number, number]>((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = src })
  if (dim[0] < 48 || dim[1] < 48) throw new Error(`ابعاد ${dim[0]}×${dim[1]} کوچک است؛ حداقل ۴۸×۴۸ و پیشنهادی ۹۶×۹۶ پیکسل.`)
  if (Math.abs(dim[0] / dim[1] - 1) > 0.15) throw new Error('آیکون باید مربع باشد (مثلاً ۹۶×۹۶).')
  return { id: Date.now().toString(36), name, src, mono: false }
}
