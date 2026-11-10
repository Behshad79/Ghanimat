import { type ReactNode } from 'react'
import { fa } from '../lib/fa'
import { EmptyState } from './base'
import { ChartNoAxesColumn } from 'lucide-react'

// نمودارهای سبک SVG. قرارداد واحد کل پنل: محور زمان از چپ (گذشته) به راست (اکنون)، مثل نمودارهای مالی رایج.
const path = (pts: number[], w: number, h: number, pad = 4) => {
  const max = Math.max(...pts), min = Math.min(...pts), span = max - min || 1
  return pts.map((v, i) => `${i ? 'L' : 'M'}${(pad + (i * (w - pad * 2)) / (pts.length - 1)).toFixed(1)},${(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)}`).join(' ')
}
export const Spark = ({ data, color = 'var(--brand)', w = 80, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) => (
  <svg width={w} height={h} aria-hidden="true"><path d={path(data, w, h)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const NoData = ({ what = 'نمودار' }: { what?: string }) => <EmptyState icon={<ChartNoAxesColumn size={22} />} title={`داده برای ${what} کافی نیست.`} desc="دست‌کم ۳ نقطهٔ داده لازم است. بازهٔ زمانی را بزرگ‌تر کنید." />

export function LineChart({ series, labels, h = 200, events }: { series: { name: string; data: number[]; color: string; dashed?: boolean }[]; labels: string[]; h?: number; events?: { i: number; label: string }[] }) {
  const w = 600
  if (series[0].data.length < 3) return <NoData />
  const all = series.flatMap((s) => s.data), max = Math.max(...all), min = Math.min(...all)
  const x = (i: number) => 16 + (i * (w - 32)) / (labels.length - 1)
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={series.map((s) => s.name).join('، ')}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="16" x2={w - 16} y1={h * g} y2={h * g} stroke="var(--border)" strokeDasharray="3 4" />)}
        {events?.map((e) => <g key={e.i}><line x1={x(e.i)} x2={x(e.i)} y1="8" y2={h - 8} stroke="var(--warning)" strokeDasharray="2 3" /><text x={x(e.i) + 4} y="16" fontSize="10" textAnchor="end" direction="rtl" fill="var(--warning)">{e.label}</text></g>)}
        {series.map((s) => { const sc = (v: number) => h - 16 - ((v - min) / (max - min || 1)) * (h - 32); return (
          <path key={s.name} d={s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${sc(v).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 5' : undefined} strokeLinecap="round" strokeLinejoin="round" />
        ) })}
      </svg>
      <div dir="ltr" className="mt-1 flex justify-between px-3 text-11 text-t3">{labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0).map((l) => <span key={l}>{l}</span>)}</div>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-11 text-t2">{series.map((s) => <span key={s.name} className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  )
}
export function Bars({ data, onPick, fmt = (n: number) => fa(n), color = 'var(--brand)' }: { data: { label: string; value: number; tone?: string }[]; onPick?: (label: string) => void; fmt?: (n: number) => ReactNode; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label}>
          <button disabled={!onPick} onClick={() => onPick?.(d.label)} className="group block w-full text-right disabled:cursor-default">
            <div className="mb-1 flex justify-between text-12"><span className="text-t2 group-enabled:group-hover:text-brand">{d.label}</span><span className="tnum font-medium">{fmt(d.value)}</span></div>
            <div className="h-2 rounded-full bg-neutral-bg"><div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.tone ?? color }} /></div>
          </button>
        </li>
      ))}
    </ul>
  )
}
export function Donut({ data, center }: { data: { label: string; value: number; color: string }[]; center?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  let acc = 0
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 36 36" className="size-28 -rotate-90">
          {data.map((d) => { const dash = (d.value / total) * 100; const el = <circle key={d.label} cx="18" cy="18" r="15.9" fill="none" stroke={d.color} strokeWidth="4" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-acc} />; acc += dash; return el })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center text-12 font-semibold">{center}</div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1 text-12">
        {data.map((d) => <li key={d.label} className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 truncate text-t2"><i className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />{d.label}</span><span className="tnum font-medium">{fa(Math.round((d.value / total) * 100))}٪</span></li>)}
      </ul>
    </div>
  )
}
export function Funnel({ steps, onPick }: { steps: { label: string; value: number }[]; onPick?: (label: string) => void }) {
  const max = steps[0]?.value || 1
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => { const drop = i ? Math.round((1 - s.value / steps[i - 1].value) * 100) : 0; return (
        <li key={s.label}>
          <button onClick={() => onPick?.(s.label)} className="flex w-full items-center gap-2 text-right text-12">
            <span className="w-24 shrink-0 text-t2">{s.label}</span>
            <span className="h-6 rounded-sm bg-brand/85" style={{ width: `${Math.max(4, (s.value / max) * 60)}%` }} />
            <span className="tnum font-medium">{fa(s.value.toLocaleString('en-US'))}</span>
            {i > 0 && <span className="tnum text-danger">−{fa(drop)}٪</span>}
          </button>
        </li>
      ) })}
    </ol>
  )
}
/** Waterfall اقتصاد واحد: از قیمت فروش تا سود مشارکتی */
export function Waterfall({ steps }: { steps: { label: string; value: number }[] }) {
  const total = steps[0].value
  let run = 0
  return (
    <div className="flex h-44 items-end gap-2">
      {steps.map((s, i) => { const isEnd = i === 0 || i === steps.length - 1; const start = isEnd ? 0 : run + s.value; if (i === 0) run = s.value; else if (!isEnd) run += s.value; const hgt = (Math.abs(s.value) / total) * 100; const bottom = (Math.max(0, isEnd ? 0 : start) / total) * 100; return (
        <div key={s.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
          <div className="relative flex-1"><div title={fa(s.value.toLocaleString('en-US'))} className="absolute inset-x-0 rounded-sm" style={{ height: `${hgt}%`, bottom: `${bottom}%`, background: isEnd ? (i === 0 ? 'var(--brand)' : 'var(--success)') : 'var(--danger)', opacity: isEnd ? 1 : 0.7 }} /></div>
          <span className="mt-1 truncate text-11 text-t2">{s.label}</span>
        </div>
      ) })}
    </div>
  )
}
/** جدول حرارتی کوهورت */
export function Heat({ rows, cols }: { rows: { label: string; values: number[] }[]; cols: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-11">
        <thead><tr><th />{cols.map((c) => <th key={c} className="px-1 font-normal text-t3">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><td className="pl-2 whitespace-nowrap text-t2">{r.label}</td>{cols.map((_, i) => { const v = r.values[i]; return <td key={i} className="tnum h-7 rounded-sm text-center" style={v === undefined ? {} : { background: `color-mix(in srgb, var(--brand) ${v}%, var(--surface))`, color: v > 45 ? '#fff' : 'var(--text-1)' }}>{v !== undefined && `${fa(v)}٪`}</td> })}</tr>)}</tbody>
      </table>
    </div>
  )
}
