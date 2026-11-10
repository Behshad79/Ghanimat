import { type ReactNode } from 'react'
import { Clock } from 'lucide-react'
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
export const Thumb = ({ label }: { label: string }) => <span className="grid size-9 shrink-0 place-items-center rounded-md bg-neutral-bg text-11 font-semibold text-t2">{label.slice(0, 2)}</span>
export const Cell = ({ a, b, thumb }: { a: ReactNode; b?: ReactNode; thumb?: string }) => (
  <div className="flex min-w-0 items-center gap-2">{thumb && <Thumb label={thumb} />}<div className="min-w-0"><div className="truncate font-medium">{a}</div>{b && <div className="line-clamp-2 text-11 text-t3">{b}</div>}</div></div>
)
/** تب فعال در URL نگه داشته می‌شود تا لینک عمیق کار کند */
export function useTab(def: string): [string, (v: string) => void] {
  const [sp, setSp] = useSearchParams()
  return [sp.get('tab') ?? def, (v) => { const n = new URLSearchParams(sp); n.set('tab', v); setSp(n, { replace: true }) }]
}
