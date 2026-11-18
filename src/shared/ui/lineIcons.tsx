// آیکون‌ها و رنگ‌های آماده برای خط متحرک کارت کالا
import { BadgeCheck, CircleAlert, Clock, CreditCard, Flame, Gift, Heart, Plane, ShieldCheck, Sparkle, Star, Tag, Truck, Zap, type LucideIcon } from 'lucide-react'
export const LINE_ICONS: Record<string, [LucideIcon, string]> = {
  alert: [CircleAlert, 'هشدار'], plane: [Plane, 'هواپیما'], card: [CreditCard, 'کارت'], sparkle: [Sparkle, 'درخشش'], truck: [Truck, 'ارسال'], shield: [ShieldCheck, 'ضمانت'],
  flame: [Flame, 'داغ'], gift: [Gift, 'هدیه'], clock: [Clock, 'زمان'], star: [Star, 'ستاره'], tag: [Tag, 'برچسب'], badge: [BadgeCheck, 'تأییدشده'], zap: [Zap, 'سریع'], heart: [Heart, 'محبوب'],
}
export const LINE_COLORS = ['#0000ff', '#d97706', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#10123d']
export const KIND_DEFAULT: Record<string, { icon: string; color: string }> = { low: { icon: 'alert', color: '#d97706' }, origin: { icon: 'plane', color: '#0000ff' }, bnpl: { icon: 'card', color: '#0000ff' }, fast: { icon: 'zap', color: '#16a34a' }, custom: { icon: 'sparkle', color: '#0000ff' } }
export const WEIGHT: [string, string][] = [['1', 'عادی'], ['2', 'مهم'], ['3', 'خیلی مهم']]
export function LineIcon({ k, color, size = 15 }: { k?: string; color?: string; size?: number }) { const I = (LINE_ICONS[k ?? 'sparkle'] ?? LINE_ICONS.sparkle)[0]; return <I size={size} style={{ color: color ?? '#0000ff' }} className="shrink-0" /> }
