import { useEffect, useRef, useState } from 'react'
import { PackageCheck, Truck } from 'lucide-react'
import type { Order } from '@/shared/data/seed'
import { fa } from '@/shared/lib/fa'

const COLORS = ['#12733f', '#0000ff', '#ffc24b', '#22c55e', '#f97316']
/** جشن کوتاه تحویل: وقتی مرسوله‌ای همین حالا «تحویل شد»، چند ثانیه نمایش داده می‌شود و با کلیک بسته می‌شود */
export function DeliveredCelebration({ o }: { o: Order }) {
  const count = o.shipments.filter((s) => s.status === 'ship.delivered').length
  // فقط وقتی همین سفارش تحویل تازه گرفت؛ رفتن از یک سفارش به سفارش دیگر جشن را روشن نمی‌کند
  const prev = useRef({ id: o.id, count }); const [show, setShow] = useState<null | { all: boolean; n: number }>(null)
  useEffect(() => {
    if (prev.current.id !== o.id) { prev.current = { id: o.id, count }; setShow(null); return }
    if (count > prev.current.count) { const all = o.status === 'order.delivered'; setShow({ all, n: count }); const t = setTimeout(() => setShow(null), 2600); prev.current = { id: o.id, count }; return () => clearTimeout(t) }
    prev.current = { id: o.id, count }
  }, [o.id, count, o.status])
  if (!show) return null
  const bits = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; const r = 90 + (i % 3) * 26; return { dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r}px`, rot: `${(i * 47) % 360}deg`, c: COLORS[i % COLORS.length], d: `${(i % 4) * 40}ms` } })
  return <div role="status" aria-live="polite" onClick={() => setShow(null)} className="fixed inset-0 z-[60] grid place-items-center bg-[#10123d]/25 backdrop-blur-[2px]" style={{ animation: 'fadeIn .2s ease-out both' }}>
    <div className="relative grid w-[min(360px,90vw)] justify-items-center gap-3 rounded-3xl bg-surface p-7 text-center shadow-2xl check-pop">
      <span className="relative grid size-24 place-items-center">
        <span aria-hidden className="ring-burst absolute inset-0 rounded-full border-4 border-[#12733f]" />
        <span aria-hidden className="ring-burst absolute inset-0 rounded-full border-2 border-[#12733f]" style={{ animationDelay: '.18s' }} />
        {bits.map((b, i) => <span key={i} aria-hidden className="confetti absolute left-1/2 top-1/2 size-2 rounded-sm" style={{ background: b.c, ['--dx' as string]: b.dx, ['--dy' as string]: b.dy, ['--rot' as string]: b.rot, animationDelay: b.d }} />)}
        <svg width="96" height="96" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#12733f" className="check-pop" /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="check-draw" /></svg>
      </span>
      <p className="text-18 font-extrabold text-[#12733f]">{show.all ? 'سفارش تحویل مشتری شد' : `مرسولهٔ ${fa(show.n)} تحویل شد`}</p>
      <p className="flex items-center gap-1.5 text-12 text-t2"><Truck size={14} className="truck-in text-[#12733f]" />{show.all ? 'همهٔ مرسوله‌ها رسید؛ مهلت ۷ روزهٔ مرجوعی از همین لحظه شروع شد.' : 'مرسوله‌های دیگر این سفارش هنوز در راه‌اند.'}</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-3 py-1 text-11 font-semibold text-success"><PackageCheck size={12} />پایان مسیر ارسال</span>
    </div>
  </div>
}
