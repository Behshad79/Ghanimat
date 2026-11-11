import { useEffect, useRef, useState } from 'react'

const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return true } }
/** شمارش عددی هنگام نمایش (۶۰۰ میلی‌ثانیه، ease-out)؛ در «کاهش حرکت» مستقیم مقدار نهایی */
export function useCountUp(target: number, ms = 650) {
  const [v, setV] = useState(() => (reduced() ? target : 0)); const from = useRef(0)
  useEffect(() => {
    if (reduced()) { setV(target); return }
    const start = performance.now(); const a = from.current; let raf = 0
    const tick = (t: number) => { const k = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - k, 3); setV(a + (target - a) * e); if (k < 1) raf = requestAnimationFrame(tick); else from.current = target }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) { return <>{format(useCountUp(value))}</> }
/** تیک موفقیت متحرک (برای Toast و پایان جریان‌ها) */
export const SuccessCheck = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"><circle cx="12" cy="12" r="11" fill="#12733f" className="check-pop" /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="check-draw" /></svg>
)
