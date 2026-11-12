import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Phone, Warehouse } from 'lucide-react'
import { Button, cx } from '@/shared/ui/base'
import { Modal } from '@/shared/ui/overlay'
import { fa } from '@/shared/lib/fa'
import type { Order, Shipment } from '@/shared/data/seed'
import { Plate } from './Progress'

// مسیر نمونه روی نقشهٔ شهری (مختصات viewBox 400×260)؛ در نسخهٔ واقعی از موقعیت زندهٔ پیک (API اسنپ‌باکس و الوپیک) خوانده می‌شود
const ROUTE = 'M352 214 L352 176 L300 176 L300 128 L232 128 L232 92 L150 92 L150 58 L64 58'
const prog0 = (s: Shipment) => (s.status === 'ship.delivered' ? 1 : s.status === 'ship.in_transit' ? 0.55 : s.status === 'ship.handed' ? 0.18 : 0)

function MapSvg({ s, big }: { s: Shipment; big?: boolean }) {
  const path = useRef<SVGPathElement>(null); const [p, setP] = useState(prog0(s)); const [pt, setPt] = useState({ x: 352, y: 214 })
  const moving = ['ship.handed', 'ship.in_transit'].includes(s.status)
  useEffect(() => { setP(prog0(s)) }, [s.id, s.status])
  useEffect(() => { if (!moving) return; const t = setInterval(() => setP((x) => (x >= 0.96 ? 0.18 : x + 0.004)), 120); return () => clearInterval(t) }, [moving, s.id])
  useEffect(() => { const el = path.current; if (!el) return; const L = el.getTotalLength(); const q = el.getPointAtLength(L * p); setPt({ x: q.x, y: q.y }) }, [p])
  const L = path.current?.getTotalLength() ?? 600
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="size-full" role="img" aria-label="نقشهٔ زندهٔ مسیر پیک">
      <rect width="400" height="260" fill="#eef1f6" />
      {/* بلوک‌های شهری */}
      {Array.from({ length: 7 }).map((_, i) => Array.from({ length: 5 }).map((__, j) => <rect key={`${i}-${j}`} x={12 + i * 56} y={12 + j * 50} width="44" height="36" rx="5" fill={(i + j) % 5 === 0 ? '#d9f0dc' : '#ffffff'} />))}
      <path d="M0 150 C 90 140, 160 175, 400 150" stroke="#cfe3ff" strokeWidth="14" fill="none" />
      {/* خیابان‌های اصلی */}
      {[52, 102, 152, 202].map((y) => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#e3e6ee" strokeWidth="6" />)}
      {[62, 118, 174, 230, 286, 342].map((x) => <line key={x} y1="0" y2="260" x1={x} x2={x} stroke="#e3e6ee" strokeWidth="6" />)}
      {/* مسیر */}
      <path ref={path} d={ROUTE} fill="none" stroke="#c7ccff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROUTE} fill="none" stroke="#0000ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * p} ${L}`} />
      {/* مبدأ و مقصد */}
      <circle cx="352" cy="214" r="9" fill="#10123d" /><circle cx="352" cy="214" r="4" fill="#fff" />
      <g transform="translate(64 58)"><circle r="16" fill="#c42f2f" opacity=".15"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" /></circle><path d="M0 -14 C 8 -14 10 -6 10 -4 C 10 4 0 12 0 12 C 0 12 -10 4 -10 -4 C -10 -6 -8 -14 0 -14 Z" fill="#c42f2f" /><circle cy="-4" r="3.5" fill="#fff" /></g>
      {/* پیک */}
      {s.status !== 'ship.pending' && <g transform={`translate(${pt.x} ${pt.y})`} style={{ transition: 'transform 120ms linear' }}><circle r={big ? 16 : 13} fill="#0000ff" opacity=".18" /><circle r={big ? 10 : 8} fill="#0000ff" stroke="#fff" strokeWidth="2.5" /><path d="M-4 1 h6 v-3 h2 l2 3 v2 h-10 z" fill="#fff" /></g>}
    </svg>
  )
}

/** پیگیری زندهٔ مرسوله به سبک اپ‌های پیک: نقشه، حرکت پیک، زمان رسیدن، اطلاعات مأمور و لینک سفارش */
export function LiveMap({ o, s, city, warehouse, onOrder }: { o: Order; s: Shipment; city: string; warehouse: string; onOrder: () => void }) {
  const [full, setFull] = useState(false)
  const eta = s.status === 'ship.delivered' ? 0 : Math.max(3, Math.round((new Date(s.sla).getTime() - Date.now()) / 6e4))
  const card = (big?: boolean) => (
    <div className={cx('relative overflow-hidden rounded-2xl border border-line', big ? 'h-[60vh]' : 'h-44')}>
      <button type="button" aria-label={`باز کردن سفارش ${o.id}`} onClick={onOrder} className="absolute inset-0 cursor-pointer"><MapSvg s={s} big={big} /></button>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <span className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-11 font-medium text-[#10123d] shadow-sm"><span className={cx('size-2 rounded-full', ['ship.handed', 'ship.in_transit'].includes(s.status) ? 'animate-pulse bg-[#12733f]' : 'bg-[#9aa0b8]')} />{s.status === 'ship.delivered' ? 'تحویل شد' : ['ship.handed', 'ship.in_transit'].includes(s.status) ? `در راه · ${fa(eta)} دقیقه تا مقصد` : 'هنوز تحویل پیک نشده'}</span>
        <span className="pointer-events-auto flex gap-1"><button type="button" onClick={onOrder} className="flex items-center gap-1 rounded-full bg-[#0000ff] px-2.5 py-1 text-11 font-medium text-white shadow-sm"><ExternalLink size={12} />سفارش <span className="ltr font-mono">{o.id}</span></button>{!big && <button type="button" aria-label="نقشهٔ بزرگ" onClick={() => setFull(true)} className="grid size-7 place-items-center rounded-full bg-white/95 text-[#10123d] shadow-sm"><Maximize2 size={13} /></button>}</span>
      </div>
      <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] text-[#10123d] shadow-sm"><Warehouse size={11} />{warehouse}</span>
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] text-[#c42f2f] shadow-sm">{city}</span>
    </div>
  )
  return (
    <>
      {card()}
      {s.courier && <div className="mt-2 flex items-center gap-2 rounded-xl bg-neutral-bg px-2.5 py-2 text-12"><span className="grid size-8 place-items-center rounded-full bg-brand-tint font-bold text-brand">{s.courier.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><b className="block truncate">{s.courier.name} · {s.courier.company ?? s.courier.vehicle}</b><Plate v={s.courier.plate} /></span>{s.courier.phone && <a href={`tel:${s.courier.phone}`} aria-label="تماس با پیک" className="grid size-8 place-items-center rounded-full bg-success-solid text-white"><Phone size={14} /></a>}</div>}
      <Modal wide open={full} onClose={() => setFull(false)} title={<span className="flex items-center gap-2">پیگیری زندهٔ مرسوله <span className="ltr font-mono text-13">{s.id}</span></span>} footer={<Button variant="primary" icon={<ExternalLink size={14} />} onClick={() => { setFull(false); onOrder() }}>باز کردن سفارش {o.id}</Button>}>{card(true)}</Modal>
    </>
  )
}
