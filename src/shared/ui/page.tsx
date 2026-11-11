import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpLeft, ArrowUpRight, Check, ChevronLeft, Sparkles, WifiOff } from 'lucide-react'
import { CountUp } from './motion'
import { Button, Card, cx, EmptyState, ErrorState, NoAccess, SkeletonPage } from './base'
import { askCopilot, Hint } from './overlay'
import { Spark } from './charts'
import { can, useSession } from '../lib/store'
import { rel, signedPct } from '../lib/fa'

/** قالب صفحه: عنوان و وضعیت → اقدام اصلی (فقط یکی) → محتوا. «منوی حالت‌ها» همین‌جا اعمال می‌شود (بخش ۱۸.۲). */
export function Page({ title, sub, badge, actions, primary, children, module, empty, back, tabs }: {
  title: ReactNode; sub?: ReactNode; badge?: ReactNode; actions?: ReactNode; primary?: ReactNode; children: ReactNode
  module?: string; empty?: { title: string; desc?: string; action?: ReactNode }; back?: string; tabs?: ReactNode
}) {
  const s = useSession()
  const nav = useNavigate()
  const denied = (module && !can(module, s)) || s.viewState === 'noaccess'
  return (
    <div key={typeof title === 'string' ? title : undefined} className="page-enter mx-auto w-full max-w-[1600px] p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {back && <button onClick={() => nav(back)} className="mb-1 flex items-center gap-0.5 text-12 text-t2 hover:text-brand">بازگشت به فهرست<ChevronLeft size={13} /></button>}
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-20 font-bold">{title}</h1>{badge}</div>
          {sub && <p className="mt-0.5 text-13 text-t2">{sub}</p>}
        </div>
        {!denied && <div className="no-print flex flex-wrap items-center gap-2">{actions}{primary}</div>}
      </header>
      {s.viewState === 'offline' && (
        <div role="status" className="mb-3 flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning"><WifiOff size={14} />اتصال اینترنت قطع است. تغییرها روی همین دستگاه نگه داشته می‌شود و با برگشت اتصال ارسال می‌شود.</div>
      )}
      {!denied && tabs && <div className="mb-4">{tabs}</div>}
      {denied ? <Card><NoAccess what={typeof title === 'string' ? `«${title}»` : 'این صفحه'} /></Card>
        : s.viewState === 'loading' ? <SkeletonPage />
        : s.viewState === 'error' ? <Card><ErrorState /></Card>
        : s.viewState === 'empty' && empty ? <Card><EmptyState {...empty} /></Card>
        : children}
    </div>
  )
}

/** کارت شاخص: آیکون در دایرهٔ رنگی، مقدار (با شمارش متحرک)، قرص تغییر، Sparkline، «چرا تغییر کرد؟» و پیکان رفتن به جزئیات */
export function KPI({ label, value, full, delta, spark, hint, note, to, goodDown, icon, featured, num, fmt }: { label: string; value?: ReactNode; full?: string; delta?: number; spark?: number[]; hint?: string; note?: string; to?: string; goodDown?: boolean; icon?: ReactNode; featured?: boolean; num?: number; fmt?: (n: number) => string }) {
  const nav = useNavigate()
  const good = delta === undefined ? true : goodDown ? delta <= 0 : delta >= 0
  return (
    <div role={to ? 'link' : undefined} tabIndex={to ? 0 : undefined} onClick={() => to && nav(to)} onKeyDown={(e) => e.key === 'Enter' && to && nav(to)}
      className={cx('group relative overflow-hidden rounded-2xl border p-4 text-right', featured ? 'border-transparent bg-brand-solid text-white' : 'border-line bg-surface', to && 'lift cursor-pointer', to && !featured && 'hover:border-brand/40')}>
      {featured && <span className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-white/10" />}
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">{icon && <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', featured ? 'bg-white/15 text-white' : 'bg-brand-tint text-brand')}>{icon}</span>}<span className={cx('truncate text-13 font-medium', featured ? 'text-white/90' : 'text-t2')}>{label}</span>{hint && !featured && <Hint k={hint} />}</span>
        <span className="flex items-center gap-1">
          <button title="چرا تغییر کرد؟" onClick={(e) => { e.stopPropagation(); askCopilot(`چرا «${label}» تغییر کرد؟`) }} className={cx('hidden opacity-0 sm:inline transition-opacity group-hover:opacity-100', featured ? 'text-white/80' : 'text-t3 hover:text-brand')}><Sparkles size={13} /></button>
          {to && <span className={cx('grid size-7 place-items-center rounded-full border transition-colors', featured ? 'border-white/30 text-white' : 'border-line text-t2 group-hover:border-brand group-hover:text-brand')}><ArrowUpLeft size={14} /></span>}
        </span>
      </div>
      <p className="tnum relative mt-3 truncate text-18 font-bold whitespace-nowrap sm:text-24" title={full}>{num !== undefined && fmt ? <CountUp value={num} format={fmt} /> : value}</p>
      <div className="relative mt-2 flex min-h-7 items-end justify-between gap-2">
        {delta !== undefined ? (
          <span className={cx('tnum inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-11 font-medium', featured ? 'bg-white/15 text-white' : good ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>
            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}{signedPct(delta)}<span className={cx('mr-1 hidden font-normal sm:inline', featured ? 'text-white/85' : '')}>نسبت به دورهٔ قبل</span>
          </span>
        ) : note ? <span className={cx('text-11', featured ? 'text-white/85' : 'text-t2')}>{note}</span> : <span />}
        {spark && <Spark data={spark} w={64} h={24} color={featured ? '#ffffff' : good ? 'var(--success)' : 'var(--danger)'} />}
      </div>
      {note && delta !== undefined && <p className={cx('relative mt-1 text-11 leading-4', featured ? 'text-white/85' : 'text-t2')}>{note}</p>}
    </div>
  )
}

export type TL = { at: string; who?: string; text: ReactNode; tone?: 'ok' | 'warn' | 'err' | 'ai' }
export const Timeline = ({ items }: { items: TL[] }) => (
  <ol className="relative space-y-3 border-r border-line pr-4">
    {items.map((t, i) => (
      <li key={i} className="relative">
        <span className={cx('absolute top-1.5 -right-[21px] size-2.5 rounded-full ring-2 ring-surface', t.tone === 'err' ? 'bg-danger' : t.tone === 'warn' ? 'bg-warning' : t.tone === 'ai' ? 'bg-brand' : t.tone === 'ok' ? 'bg-success' : 'bg-t3')} />
        <p className="text-13">{t.text}</p>
        <p className="text-11 text-t3">{t.who && `${t.who} · `}{rel(t.at)}</p>
      </li>
    ))}
  </ol>
)
export const Stepper = ({ steps, current }: { steps: string[]; current: number }) => (
  <ol className="flex items-center overflow-x-auto">
    {steps.map((s, i) => (
      <li key={s} className="flex shrink-0 items-center">
        <span className={cx('grid size-6 place-items-center rounded-full text-11 font-semibold', i < current ? 'bg-success-solid text-white' : i === current ? 'bg-brand-solid text-white' : 'bg-neutral-bg text-t3')}>{i < current ? <Check size={13} /> : i + 1}</span>
        <span className={cx('mx-2 text-12', i === current ? 'font-semibold text-t1' : 'text-t2')}>{s}</span>
        {i < steps.length - 1 && <span className={cx('ml-2 h-px w-6', i < current ? 'bg-success' : 'bg-line')} />}
      </li>
    ))}
  </ol>
)
/** ردیف «نیازمند اقدام»: همیشه بالای داشبورد */
export function ActionChips({ items }: { items: { label: string; count: number; to: string; tone?: 'danger' | 'warning' }[] }) {
  const nav = useNavigate()
  const live = items.filter((i) => i.count > 0)
  if (!live.length) return <div className="rounded-lg border border-line bg-success-bg px-4 py-3 text-13 text-success">همه‌چیز انجام شده است. کار معوقی ندارید.</div>
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {live.map((i) => (
        <button key={i.label} onClick={() => nav(i.to)} className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-right hover:border-brand">
          <span className={cx('tnum grid h-7 min-w-7 place-items-center rounded-md px-1 text-13 font-bold', i.tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning')}>{i.count.toLocaleString('fa-IR')}</span>
          <span className="text-12 font-medium">{i.label}</span>
        </button>
      ))}
    </div>
  )
}
export function AISummary({ lines, source }: { lines: string[]; source: string }) {
  const [open, setOpen] = useState(true)
  return (
    <Card className="border-brand/30 bg-brand-tint/40" title={<span className="flex items-center gap-1.5 text-brand"><Sparkles size={14} />خلاصهٔ امروز با AI</span>} actions={<Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{open ? 'بستن' : 'نمایش'}</Button>}>
      {open && <><ul className="list-disc space-y-1 pr-4 text-13 leading-6">{lines.map((l) => <li key={l}>{l}</li>)}</ul><p className="mt-2 text-11 text-t3">منبع: {source} · اطمینان: متوسط · پیشنهاد AI؛ بازبینی نشده</p></>}
    </Card>
  )
}
