import { useEffect, useState } from 'react'
import { Flame, Zap } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

const DONE = ['ship.delivered', 'ship.cancelled', 'ship.handed', 'ship.in_transit']
/** کارت «در انتظار اقدام» با حالت فوریت: سفارش‌هایی که وقت ارسالشان رو به پایان است، با شمارش معکوس زنده و انیمیشن */
export function UrgentCard({ onOpen, onAll }: { onOpen: (orderId: string) => void; onAll: () => void }) {
  const d = useDB(); const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const pending = d.orders.filter((o) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(o.status))
  const urgent = d.orders.flatMap((o) => o.shipments.filter((s) => !DONE.includes(s.status)).map((s) => ({ o, s, left: (new Date(s.sla).getTime() - now) / 6e4 }))).filter((x) => x.left < 120).sort((a, b) => a.left - b.left)
  const hot = urgent.filter((x) => x.left < 45).length
  const clock = (m: number) => { if (m < -60) return `${fa(Math.floor(-m / 60))} ساعت دیرکرد`; const sec = Math.abs(Math.round(m * 60)); const h = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60; return `${m < 0 ? '−' : ''}${h ? `${fa(h)}:` : ''}${fa(String(mm).padStart(2, '0'))}:${fa(String(ss).padStart(2, '0'))}` }
  return (
    <div role="link" tabIndex={0} onClick={onAll} onKeyDown={(e) => e.key === 'Enter' && onAll()} className={cx('relative cursor-pointer overflow-hidden rounded-2xl border p-4 text-right text-white', hot ? 'urgent-glow border-transparent' : 'border-transparent')} style={{ background: hot ? 'linear-gradient(135deg,#b3261e 0%,#c2410c 60%,#b45309 110%)' : 'linear-gradient(135deg,#a64b07,#b45309)', backgroundColor: hot ? '#b3261e' : '#a64b07' }}>
      <span className="pointer-events-none absolute -top-8 -left-8 size-28 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-13 font-medium"><span className="flame-flicker grid size-9 place-items-center rounded-full bg-white/20"><Flame size={18} /></span>در انتظار اقدام</span>
        {hot > 0 && <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-11 font-bold text-[#c42f2f]"><Zap size={11} />{fa(hot)} فوری</span>}
      </div>
      <p className="tnum relative mt-2 text-24 font-bold">{fa(pending.length)} <span className="text-12 font-normal text-white/90">سفارش · {fa(urgent.length)} مرسوله تا ۲ ساعت</span></p>
      <ul className="relative mt-2 space-y-1">{urgent.slice(0, 3).map(({ o, s, left }) => <li key={s.id}><button type="button" onClick={(e) => { e.stopPropagation(); onOpen(o.id) }} className="flex w-full items-center justify-between gap-2 rounded-lg bg-black/15 px-2 py-1 text-11 hover:bg-black/25"><span className="ltr font-mono">{s.id}</span><span className="truncate">{s.method}</span><b className={cx('tnum ltr rounded-md px-1.5', left < 0 ? 'bg-white text-[#c42f2f]' : left < 45 ? 'animate-pulse bg-white/25' : 'bg-white/15')}>{clock(left)}</b></button></li>)}</ul>
      {urgent.length === 0 && <p className="relative mt-2 text-11 text-white/90">هیچ مرسوله‌ای در آستانهٔ دیرکرد نیست.</p>}
    </div>
  )
}
