import { useState, type ReactNode } from 'react'
import { fa } from '../lib/fa'
import { cx, EmptyState } from './base'
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
          <path key={s.name} d={s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${sc(v).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.4" strokeDasharray={s.dashed ? '5 5' : undefined} strokeLinecap="round" strokeLinejoin="round" className={s.dashed ? undefined : 'line-draw'} />
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
            <div className="h-2 rounded-full bg-neutral-bg"><div className="bar-grow-x h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.tone ?? color }} /></div>
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

/** نمودار ستونی با ستون برجسته (رنگ برند) و Tooltip؛ ستون‌ها هنگام نمایش رشد می‌کنند */
export function Columns({ data, highlight, fmt = (n: number) => fa(n), onPick, h = 200 }: { data: { label: string; value: number; sub?: string }[]; highlight?: number; fmt?: (n: number) => ReactNode; onPick?: (i: number) => void; h?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1); const hi = highlight ?? data.length - 1
  return (
    <div className="relative flex items-end gap-2" style={{ height: h }} dir="ltr">
      {data.map((d, i) => (
        <button key={d.label} onClick={() => onPick?.(i)} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          {i === hi && <span className="anim-pop whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-center text-11 shadow-float" dir="rtl"><b className="tnum block">{fmt(d.value)}</b>{d.sub && <span className="text-t2">{d.sub}</span>}</span>}
          <span className={cx('bar-grow w-full max-w-10 rounded-lg transition-colors', i === hi ? 'bg-brand-solid' : 'bg-neutral-bg group-hover:bg-brand-tint')} style={{ height: `${Math.max(4, (d.value / max) * (i === hi ? 62 : 78))}%`, animationDelay: `${i * 35}ms` }} />
          <span className={cx('text-11', i === hi ? 'font-bold text-t1' : 'text-t2')} dir="rtl">{d.label}</span>
        </button>
      ))}
    </div>
  )
}
/** نیم‌دایرهٔ پیشرفت هدف */
export function Gauge({ value, label, sub }: { value: number; label: ReactNode; sub?: ReactNode }) {
  const v = Math.max(0, Math.min(100, value)); const len = Math.PI * 80
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 112" className="w-full" aria-label={`پیشرفت ${fa(Math.round(v))}٪`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--neutral-bg)" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--brand-solid)" strokeWidth="16" strokeLinecap="round" className="line-draw" style={{ ['--len' as string]: len, strokeDasharray: `${(v / 100) * len} ${len}` }} />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center"><p className="tnum text-24 font-bold">{label}</p>{sub && <p className="text-11 text-t2">{sub}</p>}</div>
    </div>
  )
}
// نقشهٔ کاشی‌ای ایران: هر استان یک خانه در جای تقریبی جغرافیایی (بدون نقشهٔ خارجی)
const PROV: [string, number, number][] = [['آذربایجان غربی', 0, 0], ['آذربایجان شرقی', 0, 1], ['اردبیل', 0, 2], ['گیلان', 1, 2], ['مازندران', 1, 3], ['گلستان', 1, 4], ['خراسان شمالی', 1, 5], ['کردستان', 1, 0], ['زنجان', 1, 1], ['کرمانشاه', 2, 0], ['همدان', 2, 1], ['قزوین', 2, 2], ['البرز', 2, 3], ['تهران', 2, 4], ['سمنان', 2, 5], ['خراسان رضوی', 2, 6], ['ایلام', 3, 0], ['لرستان', 3, 1], ['مرکزی', 3, 2], ['قم', 3, 3], ['اصفهان', 3, 4], ['خراسان جنوبی', 3, 6], ['خوزستان', 4, 1], ['چهارمحال و بختیاری', 4, 2], ['کهگیلویه و بویراحمد', 4, 3], ['یزد', 4, 4], ['کرمان', 4, 5], ['سیستان و بلوچستان', 4, 6], ['بوشهر', 5, 2], ['فارس', 5, 3], ['هرمزگان', 5, 4]]
export function IranTiles({ values, fmt, onPick }: { values: Record<string, number>; fmt: (n: number) => string; onPick?: (p: string) => void }) {
  const max = Math.max(...Object.values(values), 1)
  return (
    <div className="mx-auto grid max-w-[360px] gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', direction: 'ltr' }}>
      {Array.from({ length: 6 * 7 }).map((_, k) => { const r = Math.floor(k / 7), c = k % 7; const p = PROV.find(([, pr, pc]) => pr === r && pc === c); if (!p) return <span key={k} />; const v = values[p[0]] ?? 0; const raw = v ? 18 + (v / max) * 82 : 0; const a = raw < 55 ? raw : Math.max(raw, 72) /* بازهٔ میانی، کنتراست هیچ رنگ متنی را تأمین نمی‌کند */
        return <button key={k} title={`${p[0]}: ${fmt(v)}`} onClick={() => onPick?.(p[0])} className="lift grid aspect-square place-items-center rounded-md text-[9px] leading-tight font-medium" style={{ background: v ? `color-mix(in srgb, var(--brand-solid) ${a}%, var(--surface))` : 'var(--neutral-bg)', color: a >= 72 ? '#fff' : 'var(--text-1)', direction: 'rtl' }}>{p[0].split(' ')[0].slice(0, 6)}</button> })}
    </div>
  )
}
/** نیم‌دایرهٔ چندبخشی (سهم دسته‌ها) */
export function SegGauge({ data, center, sub }: { data: { label: string; value: number; color: string }[]; center: ReactNode; sub?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1; const len = Math.PI * 80; let acc = 0
  return (
    <div>
      <div className="relative mx-auto w-full max-w-[240px]">
        <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={data.map((d) => `${d.label} ${fa(Math.round((d.value / total) * 100))}٪`).join('، ')}>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--neutral-bg)" strokeWidth="16" />
          {data.map((d) => { const l = (d.value / total) * len; const el = <path key={d.label} d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${Math.max(0, l - 3)} ${len}`} strokeDashoffset={-acc} className="anim-fade" />; acc += l; return el })}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">{sub && <p className="text-11 text-t2">{sub}</p>}<p className="tnum text-22 font-bold">{center}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">{data.map((d) => <span key={d.label} className="flex items-center gap-1.5 text-11"><span className="size-2 rounded-full" style={{ background: d.color }} />{d.label}<b className="tnum">{fa(Math.round((d.value / total) * 100))}٪</b></span>)}</div>
    </div>
  )
}
/** نمودار ناحیه‌ای پیوسته با برچسب محور زمان (چپ به راست) */
export function Area({ data, labels, h = 140, color = 'var(--brand)', fmt = (n: number) => fa(n) }: { data: number[]; labels?: string[]; h?: number; color?: string; fmt?: (n: number) => string }) {
  const max = Math.max(...data, 1); const w = 300; const step = w / Math.max(1, data.length - 1)
  const pts = data.map((v, i) => [i * step, h - 8 - (v / max) * (h - 24)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [hi, setHi] = useState<number | null>(null)
  return (
    <div dir="ltr" className="relative" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }}>
        <defs><linearGradient id="ar-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#ar-g)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" className="line-draw" style={{ ['--len' as string]: 1200 }} />
        {pts.map(([x], i) => <rect key={i} x={x - step / 2} y={0} width={step} height={h} fill="transparent" onMouseEnter={() => setHi(i)} />)}
        {hi !== null && <line x1={pts[hi][0]} x2={pts[hi][0]} y1={0} y2={h} stroke={color} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hi !== null && <span className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-surface px-2 py-1 text-11 shadow-float" style={{ left: `${(pts[hi][0] / w) * 100}%` }} dir="rtl"><b className="tnum">{fmt(data[hi])}</b>{labels && <span className="block text-t2">{labels[hi]}</span>}</span>}
      {labels && <div className="mt-1 flex justify-between text-11 text-t2">{labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0).map((l) => <span key={l}>{l}</span>)}</div>}
    </div>
  )
}
/** قیف ناحیه‌ای: هر مرحله یک ستون با مقدار، درصد ریزش و منحنی نرم بین مرحله‌ها */
export function AreaFunnel({ steps, fmt = (n: number) => fa(n), onPick }: { steps: { label: string; value: number; note?: string }[]; fmt?: (n: number) => string; onPick?: (i: number) => void }) {
  const max = steps[0]?.value || 1; const n = steps.length; const W = 100 * n; const H = 120
  const y = (v: number) => H - Math.sqrt(v / max) * (H - 10)
  const colors = ['#0000ff', '#4d5cff', '#8f99ff', '#ffc24b']
  return (
    <div className="relative">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {steps.map((s, i) => { const drop = i ? Math.round((1 - s.value / steps[i - 1].value) * 100) : 0; return (
          <button key={s.label} onClick={() => onPick?.(i)} className={cx('px-3 pb-2 text-right', i > 0 && 'border-r border-line')}>
            <p className="text-12 text-t2">{s.label}</p>
            <p className="tnum text-18 font-bold">{fmt(s.value)}</p>
            <p className="text-11 text-t2">{i === 0 ? s.note ?? 'شروع قیف' : <span>ریزش <b className="tnum text-danger">{fa(drop)}٪</b></span>}</p>
          </button>) })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full" style={{ transform: 'scaleX(-1)' }}>
        {steps.map((s, i) => { const next = steps[i + 1]?.value ?? s.value * 0.9; const x0 = i * 100, x1 = x0 + 100; const y0 = y(s.value), y1 = y(next)
          return <path key={i} d={`M${x0} ${y0} C${x0 + 55} ${y0} ${x1 - 45} ${y1} ${x1} ${y1} L${x1} ${H} L${x0} ${H} Z`} fill={colors[i % colors.length]} opacity={0.9} className="bar-grow" style={{ transformOrigin: 'bottom', animationDelay: `${i * 80}ms` }} /> })}
      </svg>
    </div>
  )
}
