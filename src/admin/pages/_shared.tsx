import { type ReactNode } from 'react'
import { BookOpen, Clock, Headphones, Laptop, Package, PlugZap, Smartphone, Tablet, Watch, type LucideIcon } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { compactToman, left, minsLeft, toman } from '@/shared/lib/fa'
import { useSearchParams } from 'react-router-dom'

export function useLookup() {
  const d = useDB()
  return {
    d,
    product: (id: string) => d.products.find((p) => p.id === id)!,
    customer: (id: string) => d.customers.find((c) => c.id === id)!,
    unit: (id: string) => d.units.find((u) => u.id === id),
    rule: (key: string) => d.rules.find((r) => r.key === key)!.value,
    defaultBnpl: () => d.providers.find((p) => p.family === 'bnpl' && p.isDefault && p.status !== 'prov.retired') ?? d.providers.find((p) => p.family === 'bnpl' && p.status === 'prov.active'),
  }
}
/** تایمر SLA رنگی: ایمن، در خطر، نقض‌شده (رنگ + آیکون + متن) */
export function SlaChip({ at, done }: { at: string; done?: boolean }) {
  const m = minsLeft(at)
  if (done) return <span className="text-12 text-t3">—</span>
  return <span className={cx('tnum inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-11 font-medium whitespace-nowrap', m < 0 ? 'bg-danger-bg text-danger' : m < 45 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')}><Clock size={11} />{left(at)}</span>
}
export const Money = ({ v, compact: c }: { v: number; compact?: boolean }) => <span className="tnum" title={toman(v)}>{c ? compactToman(v) : toman(v)}</span>
const CAT_ICON: Record<string, LucideIcon> = { 'گوشی موبایل': Smartphone, هدفون: Headphones, 'لپ‌تاپ': Laptop, 'ساعت هوشمند': Watch, تبلت: Tablet, 'کتاب‌خوان': BookOpen, 'لوازم جانبی': PlugZap }
/** عکس کالا با اندازهٔ ثابت؛ کالای بی‌عکس آیکون دسته‌اش را می‌گیرد، نه حروف لاتین */
export function ProductImg({ pid, size = 40, className, rounded = 'rounded-lg' }: { pid: string; size?: number; className?: string; rounded?: string }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid)
  const Icon = (p && CAT_ICON[p.category]) || Package
  return (
    <span className={cx('relative grid shrink-0 place-items-center overflow-hidden border border-line bg-white', rounded, className)} style={{ width: size, height: size }}>
      {p?.image ? <img src={p.image} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover" style={{ objectPosition: p.imagePos ?? '50% 50%' }} /> : <Icon size={Math.round(size * 0.45)} strokeWidth={1.6} className="text-t3" aria-label={p?.category ?? 'کالا'} />}
    </span>
  )
}
export const Cell = ({ a, b, pid, size }: { a: ReactNode; b?: ReactNode; pid?: string; size?: number }) => (
  <div className="flex min-w-0 items-center gap-3">{pid && <ProductImg pid={pid} size={size} />}<div className="min-w-0"><div className="truncate font-medium">{a}</div>{b && <div className="line-clamp-2 text-11 text-t3">{b}</div>}</div></div>
)
/** تب فعال در URL نگه داشته می‌شود تا لینک عمیق کار کند */
export function useTab(def: string): [string, (v: string) => void] {
  const [sp, setSp] = useSearchParams()
  return [sp.get('tab') ?? def, (v) => { const n = new URLSearchParams(sp); n.set('tab', v); setSp(n, { replace: true }) }]
}
