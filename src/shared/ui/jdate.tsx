import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

// ───── تبدیل شمسی و میلادی (الگوریتم جلالی) ─────
const div = (a: number, b: number) => ~~(a / b); const mod = (a: number, b: number) => a - ~~(a / b) * b
const BR = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
function jalCal(jy: number) {
  let leapJ = -14, jp = BR[0], jm = 0, jump = 0, n = 0
  for (let i = 1; i < BR.length; i++) { jm = BR[i]; jump = jm - jp; if (jy < jm) break; leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm }
  n = jy - jp; leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4); if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const gy = jy + 621; const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150; const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4); if (leap === -1) leap = 4
  return { leap, gy, march }
}
const g2d = (gy: number, gm: number, gd: number) => { let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408; d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752; return d }
const d2g = (jdn: number) => { let j = 4 * jdn + 139361631; j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908; const i = div(mod(j, 1461), 4) * 5 + 308; const gd = div(mod(i, 153), 5) + 1; const gm = mod(div(i, 153), 12) + 1; const gy = div(j, 1461) - 100100 + div(8 - gm, 6); return { gy, gm, gd } }
const j2d = (jy: number, jm: number, jd: number) => { const r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1 }
const d2j = (jdn: number) => { const g = d2g(jdn); let jy = g.gy - 621; const r = jalCal(jy); const start = g2d(g.gy, 3, r.march); let k = jdn - start
  if (k >= 0) { if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; k -= 186 } else { jy -= 1; k += 179; if (r.leap === 1) k += 1 }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 } }
export const toJalali = (d: Date) => d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()))
export const fromJalali = (jy: number, jm: number, jd: number) => { const g = d2g(j2d(jy, jm, jd)); return new Date(g.gy, g.gm - 1, g.gd) }
const monthLen = (jy: number, jm: number) => jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 0 ? 30 : 29

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const WD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const faN = (n: number | string) => String(n).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[+x])
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (v: string) => { if (!v) return null; const [a, b] = v.split('T'); const [y, m, dd] = a.split('-').map(Number); if (!y || !m || !dd) return null; const d = new Date(y, m - 1, dd); return { d, time: (b ?? '').slice(0, 5) } }

/** انتخاب تاریخ شمسی؛ جایگزین input تاریخ مرورگر. مقدار همان قالب استاندارد (YYYY-MM-DD یا YYYY-MM-DDTHH:mm) است. */
export function JDateInput(p: InputHTMLAttributes<HTMLInputElement>) {
  const withTime = p.type === 'datetime-local'; const val = String(p.value ?? ''); const cur = parse(val)
  const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null); const [pos, setPos] = useState({ top: 0, left: 0, up: false })
  const base = cur?.d ?? new Date(); const bj = toJalali(base)
  const [view, setView] = useState({ jy: bj.jy, jm: bj.jm }); const [time, setTime] = useState(cur?.time || '10:00')
  useEffect(() => { if (!open) return; const c = () => setOpen(false); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c) }, [open])
  const emit = (d: Date | null, t = time) => { const v = d ? (withTime ? `${iso(d)}T${t}` : iso(d)) : ''; p.onChange?.({ target: { value: v }, currentTarget: { value: v } } as unknown as ChangeEvent<HTMLInputElement>) }
  const show = () => { const r = btn.current!.getBoundingClientRect(); const up = window.innerHeight - r.bottom < 380 && r.top > 380; setPos({ top: up ? r.top : r.bottom, left: Math.min(r.left, window.innerWidth - 300), up }); const j = toJalali(cur?.d ?? new Date()); setView({ jy: j.jy, jm: j.jm }); setOpen(true) }
  const cj = cur ? toJalali(cur.d) : null; const tj = toJalali(new Date())
  const first = fromJalali(view.jy, view.jm, 1); const lead = (first.getDay() + 1) % 7; const len = monthLen(view.jy, view.jm)
  const move = (k: number) => { let m = view.jm + k, y = view.jy; if (m < 1) { m = 12; y-- } if (m > 12) { m = 1; y++ } setView({ jy: y, jm: m }) }
  const quick: [string, number][] = [['امروز', 0], ['فردا', 1], ['یک هفته بعد', 7], ['یک ماه بعد', 30]]
  const label = cj ? `${faN(cj.jd)} ${MONTHS[cj.jm - 1]} ${faN(cj.jy)}${withTime && cur?.time ? ` · ساعت ${faN(cur.time)}` : ''}` : (p.placeholder || 'انتخاب تاریخ')
  return <>
    <button ref={btn} type="button" aria-label={(p['aria-label'] as string) ?? 'انتخاب تاریخ'} disabled={p.disabled} onClick={show} className={`ctl flex h-9 items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 text-right text-13 hover:border-brand disabled:opacity-60 ${String(p.className ?? '').replace(/\bltr\b|text-left|font-mono/g, '')}`}>
      <span className={cj ? 'tnum' : 'text-t3'}>{label}</span><CalendarDays size={15} className="shrink-0 text-t3" />
    </button>
    {open && createPortal(<>
      <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
      <div dir="rtl" role="dialog" aria-label="تقویم" className="anim-pop fixed z-[91] w-72 rounded-2xl border border-line bg-surface p-3 shadow-float" style={{ left: pos.left, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}>
        <div className="mb-2 flex items-center justify-between"><button type="button" aria-label="ماه قبل" onClick={() => move(-1)} className="grid size-8 place-items-center rounded-lg hover:bg-neutral-bg"><ChevronRight size={16} /></button><b className="text-14">{MONTHS[view.jm - 1]} {faN(view.jy)}</b><button type="button" aria-label="ماه بعد" onClick={() => move(1)} className="grid size-8 place-items-center rounded-lg hover:bg-neutral-bg"><ChevronLeft size={16} /></button></div>
        <div className="grid grid-cols-7 gap-1 text-center text-11 text-t3">{WD.map((w) => <span key={w}>{w}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">{Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}{Array.from({ length: len }, (_, i) => { const day = i + 1; const sel = cj && cj.jy === view.jy && cj.jm === view.jm && cj.jd === day; const today = tj.jy === view.jy && tj.jm === view.jm && tj.jd === day; const fri = (lead + i) % 7 === 6
          return <button key={day} type="button" onClick={() => { emit(fromJalali(view.jy, view.jm, day)); if (!withTime) setOpen(false) }} className={`tnum h-8 rounded-lg text-13 ${sel ? 'bg-brand-solid font-bold text-white' : today ? 'border border-brand text-brand' : fri ? 'text-danger hover:bg-neutral-bg' : 'hover:bg-neutral-bg'}`}>{faN(day)}</button> })}</div>
        {withTime && <label className="mt-2 flex items-center justify-between gap-2 text-12">ساعت<input type="time" className="ltr h-8 rounded-md border border-line bg-surface px-2 text-13" value={time} onChange={(e) => { setTime(e.target.value); if (cur) emit(cur.d, e.target.value) }} /></label>}
        <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">{quick.map(([l, n]) => <button key={l} type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + n); emit(d); if (!withTime) setOpen(false) }} className="rounded-full border border-line px-2 py-0.5 text-11 hover:border-brand">{l}</button>)}
          {cur && !p.required && <button type="button" onClick={() => { emit(null); setOpen(false) }} className="mr-auto flex items-center gap-0.5 text-11 text-danger"><X size={11} />پاک کردن</button>}</div>
        {withTime && <button type="button" onClick={() => setOpen(false)} className="mt-2 h-8 w-full rounded-lg bg-brand-solid text-12 font-semibold text-white">تأیید</button>}
      </div></>, document.body)}
  </>
}

/** زمان اعمال: چند گزینهٔ آماده به‌اضافهٔ «تاریخ و ساعت مشخص» با تقویم شمسی. مقدار: متن گزینه یا تاریخ ISO */
export function WhenPicker({ value, onChange, presets, Select }: { value: string; onChange: (v: string) => void; presets: string[]; Select: (p: { value: string; onChange: (v: string) => void; options: string[] }) => ReactNode }) {
  const CUSTOM = 'تاریخ و ساعت مشخص…'; const isDate = /^\d{4}-\d{2}-\d{2}/.test(value)
  return <span className="flex flex-col gap-1.5">
    <Select value={isDate ? CUSTOM : value} onChange={(v) => onChange(v === CUSTOM ? (() => { const d = new Date(Date.now() + 864e5); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00` })() : v)} options={[...presets, CUSTOM]} />
    {isDate && <JDateInput type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="w-full" />}
  </span>
}
export const whenLabel = (v: string) => { const p = parse(v); if (!p) return v; const j = toJalali(p.d); return `${faN(j.jd)} ${MONTHS[j.jm - 1]} ${faN(j.jy)}${p.time ? ` ساعت ${faN(p.time)}` : ''}` }
