import type { ReactNode } from 'react'
import {
  Activity, AlarmClock, BadgePercent, Banknote, Bell, Boxes, Building2, CalendarClock, CircleAlert, CircleDollarSign, Clock, CreditCard, Eye, FileText, Gauge, Gift, Globe, HandCoins,
  Headset, Image, Inbox, Layers, Link2, Mail, MapPin, Megaphone, MessageSquare, MessageSquareText, MousePointerClick, Package, PackageCheck, Percent, Receipt, RefreshCw, RotateCcw,
  Search, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Tag, Target, Timer, TrendingUp, Truck, UserCheck, UserMinus, Users, Wallet, Warehouse, Webhook, Zap,
} from 'lucide-react'

export type KpiTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// آیکون معنادار هر شاخص از روی عنوانش؛ ترتیب مهم است (عبارت‌های خاص‌تر اول)
const ICONS: [RegExp, typeof Activity][] = [
  [/مشکوک|تقلب|ریسک/, ShieldAlert], [/دیرکرد|سررسیدگذشته|نقض|مهلت تمام/, AlarmClock], [/مرجوعی|بازگشت/, RotateCcw], [/گارانتی/, ShieldCheck], [/ریزش|لغو/, UserMinus],
  [/حضوری|شعبه|شعب/, Store], [/نقشه|امتیاز/, Star], [/پیک|ارسال|مرسوله|محموله|رهگیری/, Truck], [/انبار|موجودی|راکد/, Warehouse], [/بسته|آماده/, PackageCheck],
  [/سبد|رها/, ShoppingCart], [/سفارش/, ShoppingBag], [/کالا|محصول|SKU/, Package], [/رسید|فاکتور/, Receipt], [/کارت/, CreditCard], [/کیف پول|موجودی کیف/, Wallet],
  [/اقساط|BNPL|اعتبار/, HandCoins], [/سود|حاشیه|ROAS|LTV/, TrendingUp], [/هزینه|کارمزد|CAC/, Wallet], [/فروش|درآمد|GMV|مبلغ|پرداخت|تسویه/, Banknote], [/قیمت/, Tag],
  [/تخفیف|کوپن|پروموشن|کمپین|کش‌بک/, BadgePercent], [/هدیه|جایزه/, Gift], [/نرخ تبدیل|CTR|درصد|نرخ/, Percent], [/کلیک/, MousePointerClick], [/بازدید|نمایش|دیده/, Eye],
  [/ایندکس|رتبه|سئو|جست‌وجو|کلمه/, Search], [/صفحه|مقاله|محتوا|بلاگ/, FileText], [/بنر|تصویر|عکس|رسانه/, Image], [/مشترک|خبرنامه|ایمیل/, Mail], [/پیامک/, MessageSquareText],
  [/تیکت|پشتیبانی|انتقال/, Headset], [/گفتگو|چت|پیام/, MessageSquare], [/دیدگاه|نظر|پرسش/, MessageSquare], [/دستیار|هوش|AI/, Sparkles], [/درخواست|صف|منتظر/, Inbox],
  [/مشتری|کاربر|عضو|تیم|بازدیدکننده/, Users], [/تأیید|احراز/, UserCheck], [/انتظار|زمان پاسخ|زمان/, Timer], [/امروز|بازه|ظرفیت/, CalendarClock], [/وب‌هوک|webhook/i, Webhook],
  [/اتصال|API|آداپتور/, Link2], [/رویداد|همگام/, RefreshCw], [/دسترس|سرور|سلامت/, Gauge], [/هشدار|اعلان/, Bell], [/لایه|جایگاه/, Layers], [/کانال|بازار/, Globe],
  [/هدف|UTM/, Target], [/تبلیغ|مارکتینگ/, Megaphone], [/فوری|سریع/, Zap], [/منطقه|شهر/, MapPin], [/شرکت|حقوقی/, Building2], [/واحد|قفسه/, Boxes], [/ارز|دلار/, CircleDollarSign], [/زنده|فعال/, Activity], [/ساعت/, Clock],
]
const DANGER = /مشکوک|دیرکرد|سررسیدگذشته|ناموفق|خطا|مهلت تمام|نقض|ریزش|رد شده|تقلب|بدون تطبیق/
const WARNING = /در انتظار|منتظر|نیازمند|بدون |ثبت نشده|ناقص|رها|راکد|انتظار|انتقال به پشتیبانی|کم/
const SUCCESS = /تحویل|موفق|تطبیق شد|سود|فعال|پذیرفته|ROAS|LTV/

export function kpiIcon(label: string, size = 17): ReactNode { const I = ICONS.find(([r]) => r.test(label))?.[1] ?? Activity; return <I size={size} /> }
export function kpiTone(label: string): KpiTone { return DANGER.test(label) ? 'danger' : WARNING.test(label) ? 'warning' : SUCCESS.test(label) ? 'success' : 'brand' }
/** آیا مقدار صفر است (برای کم‌رنگ کردن کارت‌های هشدار بی‌مورد) */
export const isZero = (v: ReactNode) => typeof v === 'string' && /^[\s۰0]+$/.test(v.replace(/[٪%,٬.٫]/g, '')) || v === 0

export const TONE_CLS: Record<KpiTone, { bubble: string; ring: string; wash: string; text: string }> = {
  brand: { bubble: 'bg-brand-tint text-brand', ring: 'border-brand/30', wash: 'from-brand-tint/70', text: 'text-brand' },
  success: { bubble: 'bg-success-bg text-success', ring: 'border-success/30', wash: 'from-success-bg', text: 'text-success' },
  warning: { bubble: 'bg-warning-bg text-warning', ring: 'border-warning/40', wash: 'from-warning-bg', text: 'text-warning' },
  danger: { bubble: 'bg-danger-bg text-danger', ring: 'border-danger/40', wash: 'from-danger-bg', text: 'text-danger' },
  info: { bubble: 'bg-info-bg text-info', ring: 'border-info/30', wash: 'from-info-bg', text: 'text-info' },
  neutral: { bubble: 'bg-neutral-bg text-t2', ring: 'border-line', wash: 'from-neutral-bg', text: 'text-t2' },
}

// انیمیشن متناسب با موضوع هر شاخص: پیک حرکت می‌کند، زنگ می‌لرزد، سکه می‌چرخد، سبد می‌پرد، قلب می‌تپد…
const ANIMS: [RegExp, string][] = [[/پیک|ارسال|مرسوله|محموله|رهگیری|تحویل/, 'kpi-drive'], [/هشدار|اعلان|مشکوک|دیرکرد|نقض|فوری|ریسک/, 'kpi-ring'], [/فروش|درآمد|مبلغ|سود|هزینه|پرداخت|تسویه|کیف|کارمزد|حقوق|قیمت|وام/, 'kpi-flip'], [/سفارش|سبد|خرید/, 'kpi-bounce'], [/دیدگاه|امتیاز|رضایت|مشتری|عضو|مشترک/, 'kpi-beat'], [/همگام|رویداد|بازسازی|اتصال|API/, 'kpi-spin'], [/پیام|گفتگو|تیکت|پشتیبانی|درخواست|پیامک/, 'kpi-chat']]
export const kpiAnim = (label: string) => ANIMS.find(([r]) => r.test(label))?.[1] ?? 'kpi-float'
