import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, SlidersHorizontal, X } from 'lucide-react'
import { Button, cx, Input } from './base'
import { fa } from '../lib/fa'

// فیلتر زمانی مشترک: بازهٔ آماده یا دلخواه، روزهای هفته و ساعت ثبت؛ در نشانی صفحه می‌ماند تا قابل اشتراک و بازگشت باشد
export type DateRange = { range: string; from: string; to: string; days: number[]; h1: number; h2: number }
const WD = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const PRESETS: [string, string][] = [['all', 'همه'], ['today', 'امروز'], ['yesterday', 'دیروز'], ['7d', '۷ روز اخیر'], ['30d', '۳۰ روز اخیر'], ['month', 'این ماه'], ['custom', 'بازهٔ دلخواه']]
const sod = (t: Date) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime() }
const persianDay = (t: Date) => Number(new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' }).format(t))
const pWeekday = (t: Date) => (t.getDay() + 1) % 7 // شنبه = ۰

export function useDateRange(): [DateRange, (p: Partial<DateRange>) => void] {
  const [sp, setSp] = useSearchParams()
  const r: DateRange = { range: sp.get('range') ?? 'all', from: sp.get('from') ?? '', to: sp.get('to') ?? '', days: (sp.get('days') ?? '').split(',').filter(Boolean).map(Number), h1: Number(sp.get('h1') ?? 0), h2: Number(sp.get('h2') ?? 24) }
  const set = (p: Partial<DateRange>) => { const n = { ...r, ...p }; const q = new URLSearchParams(sp)
    const put = (k: string, v: string, def: string) => (v === def ? q.delete(k) : q.set(k, v))
    put('range', n.range, 'all'); put('from', n.from, ''); put('to', n.to, ''); put('days', n.days.join(','), ''); put('h1', String(n.h1), '0'); put('h2', String(n.h2), '24'); setSp(q, { replace: true }) }
  return [r, set]
}

export function inRange(iso: string, r: DateRange, now = new Date()) {
  const t = new Date(iso); const ms = t.getTime(); const today = sod(now)
  const ok = (() => { switch (r.range) {
    case 'today': return ms >= today
    case 'yesterday': return ms >= today - 864e5 && ms < today
    case '7d': return ms >= today - 6 * 864e5
    case '30d': return ms >= today - 29 * 864e5
    case 'month': return ms >= today - (persianDay(now) - 1) * 864e5
    case 'custom': return (!r.from || ms >= new Date(`${r.from}T00:00:00`).getTime()) && (!r.to || ms < new Date(`${r.to}T00:00:00`).getTime() + 864e5)
    default: return true } })()
  if (!ok) return false
  if (r.days.length && !r.days.includes(pWeekday(t))) return false
  const h = t.getHours(); return h >= r.h1 && h < r.h2
}
export const rangeActive = (r: DateRange) => r.range !== 'all' || r.days.length > 0 || r.h1 > 0 || r.h2 < 24
export const rangeLabel = (r: DateRange) => [PRESETS.find((p) => p[0] === r.range)?.[1] ?? '', r.days.length ? r.days.map((d) => WD[d]).join('، ') : '', r.h1 > 0 || r.h2 < 24 ? `ساعت ${fa(r.h1)} تا ${fa(r.h2)}` : ''].filter(Boolean).join(' · ')

/** نوار فیلتر زمانی: «فقط امروز» با یک کلیک، و روز هفته و ساعت در بخش بیشتر */
export function DateFilter({ r, set, count, total, noun = 'سفارش' }: { r: DateRange; set: (p: Partial<DateRange>) => void; count?: number; total?: number; noun?: string }) {
  const [more, setMore] = useState(r.days.length > 0 || r.h1 > 0 || r.h2 < 24)
  return (
    <div className="mb-3 rounded-2xl border border-line bg-surface p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="ml-1 flex items-center gap-1 text-12 font-semibold text-t2"><CalendarDays size={14} />زمان ثبت</span>
        {PRESETS.map(([k, l]) => <button key={k} type="button" aria-pressed={r.range === k} onClick={() => set({ range: k })} className={cx('h-8 rounded-full border px-3 text-12 transition-colors', r.range === k ? 'border-brand bg-brand text-white' : 'border-line text-t1 hover:border-brand/50')}>{l}</button>)}
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className={cx('flex h-8 items-center gap-1 rounded-full border px-3 text-12', more || r.days.length || r.h1 > 0 || r.h2 < 24 ? 'border-brand/50 text-brand' : 'border-line text-t1')}><SlidersHorizontal size={13} />روز هفته و ساعت</button>
        {rangeActive(r) && <Button size="sm" variant="ghost" icon={<X size={12} />} onClick={() => set({ range: 'all', from: '', to: '', days: [], h1: 0, h2: 24 })}>پاک کردن</Button>}
        {count !== undefined && <span className="mr-auto text-12 text-t2">{rangeActive(r) ? <><b className="tnum text-t1">{fa(count)}</b> {noun} از {fa(total ?? 0)} · {rangeLabel(r)}</> : <>{fa(total ?? count)} {noun}</>}</span>}
      </div>
      {r.range === 'custom' && <div className="mt-2 flex flex-wrap items-center gap-2 text-12"><label className="flex items-center gap-1.5">از <Input type="date" className="h-8 w-40" value={r.from} onChange={(e) => set({ from: e.target.value })} aria-label="از تاریخ" /></label><label className="flex items-center gap-1.5">تا <Input type="date" className="h-8 w-40" value={r.to} onChange={(e) => set({ to: e.target.value })} aria-label="تا تاریخ" /></label>{r.from && <span className="text-t2">{new Date(`${r.from}T12:00:00`).toLocaleDateString('fa-IR')}{r.to && ` تا ${new Date(`${r.to}T12:00:00`).toLocaleDateString('fa-IR')}`}</span>}</div>}
      {more && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2 text-12">
        <span className="flex flex-wrap items-center gap-1">روز: {WD.map((w, i) => <button key={w} type="button" aria-pressed={r.days.includes(i)} onClick={() => set({ days: r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i] })} className={cx('h-7 rounded-full border px-2.5', r.days.includes(i) ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{w}</button>)}</span>
        <span className="flex items-center gap-1.5">ساعت ثبت از <Input type="number" min={0} max={23} className="h-7 w-14" value={r.h1} onChange={(e) => set({ h1: Math.max(0, Math.min(23, Number(e.target.value))) })} aria-label="از ساعت" /> تا <Input type="number" min={1} max={24} className="h-7 w-14" value={r.h2} onChange={(e) => set({ h2: Math.max(1, Math.min(24, Number(e.target.value))) })} aria-label="تا ساعت" /></span>
        <span className="flex gap-1">{[['صبح', 6, 12], ['ظهر', 12, 17], ['عصر', 17, 21], ['شب', 21, 24]].map(([l, a, b]) => <button key={l} type="button" onClick={() => set({ h1: a as number, h2: b as number })} className={cx('h-7 rounded-full border px-2.5', r.h1 === a && r.h2 === b ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{l}</button>)}</span>
      </div>}
    </div>
  )
}
