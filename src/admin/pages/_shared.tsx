import { type ReactNode } from 'react'
import { BookOpen, Clock, Headphones, Laptop, Package, PlugZap, Smartphone, Tablet, Watch, type LucideIcon } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { QuickText } from '@/shared/ui/quickview'
import { useDB } from '@/shared/lib/store'
import { compactToman, left, minsLeft, toman } from '@/shared/lib/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
  <div className="flex min-w-0 items-center gap-3">{pid && <ProductImg pid={pid} size={size} />}<div className="min-w-0"><div className="truncate font-medium">{typeof a === 'string' ? <QuickText v={a} /> : a}</div>{b && <div className="line-clamp-2 text-11 text-t3">{b}</div>}</div></div>
)
/** تب فعال در URL نگه داشته می‌شود تا لینک عمیق کار کند */
export function useTab(def: string): [string, (v: string) => void] {
  const [sp, setSp] = useSearchParams()
  return [sp.get('tab') ?? def, (v) => { const n = new URLSearchParams(sp); n.set('tab', v); setSp(n, { replace: true }) }]
}

/** فیلترهای سریع داخل دراپ‌داون‌های سفارش، مرسوله و مشتری */
const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString()
export function useQuickChips() {
  const d = useDB()
  const ord = (id: string) => d.orders.find((o) => o.id === id)
  const ship = (id: string) => d.orders.flatMap((o) => o.shipments.map((s) => ({ s, o }))).find((x) => x.s.id === id)
  return {
    orders: [
      { label: 'سفارش‌های امروز', test: (v: string) => isToday(ord(v)?.createdAt) },
      { label: 'نیازمند اقدام', test: (v: string) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(ord(v)?.status ?? '') },
      { label: 'در حال آماده‌سازی', test: (v: string) => (ord(v)?.shipments ?? []).some((s) => ['ship.picking', 'ship.packed', 'ship.pending'].includes(s.status)) },
      { label: 'ارسال‌شده', test: (v: string) => (ord(v)?.shipments ?? []).some((s) => ['ship.handed', 'ship.in_transit'].includes(s.status)) },
      { label: 'حقوقی', test: (v: string) => ord(v)?.buyer === 'legal' },
    ],
    ships: [
      { label: 'امروز', test: (v: string) => isToday(ship(v)?.o.createdAt) },
      { label: 'آمادهٔ چاپ برچسب', test: (v: string) => ['ship.packed', 'ship.picking'].includes(ship(v)?.s.status ?? '') },
      { label: 'پیک', test: (v: string) => /پیک|اسنپ/.test(ship(v)?.s.method ?? '') },
      { label: 'پست', test: (v: string) => /پست/.test(ship(v)?.s.method ?? '') },
    ],
    customers: [
      { label: 'حقوقی', test: (v: string) => !!d.customers.find((c) => c.id === v)?.legal },
      { label: 'سفارش امروز', test: (v: string) => d.orders.some((o) => o.customerId === v && isToday(o.createdAt)) },
      { label: 'وفادار', test: (v: string) => /وفادار|قهرمان/.test(d.customers.find((c) => c.id === v)?.segment ?? '') },
    ],
  }
}

/** نام مشتری قابل کلیک در همهٔ جدول‌ها و فهرست‌ها: پروندهٔ ۳۶۰ درجهٔ همان مشتری باز می‌شود (بدون باز کردن ردیف) */
export function CustLink({ v, id, mobile }: { v: string; id?: string; mobile?: string }) {
  const d = useDB(); const nav = useNavigate()
  const cid = id ?? d.customers.find((c) => c.name === v.trim() || (!!mobile && c.mobile === mobile))?.id
  if (!cid || !v) return <>{v || '—'}</>
  return <button type="button" title={`پروندهٔ ${v}`} onClick={(e) => { e.stopPropagation(); nav(`/admin/customers/${cid}`) }} className="max-w-full truncate text-right font-medium text-t1 underline-offset-4 hover:text-brand hover:underline">{v}</button>
}

/** شمارهٔ سفارش قابل کلیک: جزئیات همان سفارش */
export function OrderLink({ id }: { id: string }) {
  const nav = useNavigate(); const oid = id.match(/GH-\d+/)?.[0] ?? id
  return <button type="button" title={`سفارش ${oid}`} onClick={(e) => { e.stopPropagation(); nav(`/admin/orders/${oid}`) }} className="ltr font-mono text-12 text-t1 underline-offset-4 hover:text-brand hover:underline">{id}</button>
}
