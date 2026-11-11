import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, Sparkles, WifiOff } from 'lucide-react'
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
    <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
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

/** کارت شاخص: مقدار، تغییر، Sparkline، هدف، تفسیر، «چرا تغییر کرد؟» و Drill-down با کلیک (بخش ۳ قاعدهٔ ۳ و ۴) */
export function KPI({ label, value, full, delta, spark, hint, note, to, goodDown }: { label: string; value: ReactNode; full?: string; delta?: number; spark?: number[]; hint?: string; note?: string; to?: string; goodDown?: boolean }) {
  const nav = useNavigate()
  const good = delta === undefined ? true : goodDown ? delta <= 0 : delta >= 0
  return (
    <div role={to ? 'link' : undefined} tabIndex={to ? 0 : undefined} onClick={() => to && nav(to)} onKeyDown={(e) => e.key === 'Enter' && to && nav(to)} className={cx('group rounded-lg border border-line bg-surface p-3 text-right transition-colors', to && 'cursor-pointer hover:border-brand')}>
      <div className="flex items-center justify-between gap-1 text-12 text-t2">
        <span className="flex items-center gap-1">{label}{hint && <Hint k={hint} />}</span>
        <button title="چرا تغییر کرد؟" onClick={(e) => { e.stopPropagation(); askCopilot(`چرا «${label}» تغییر کرد؟`) }} className="text-t3 opacity-0 group-hover:opacity-100 hover:text-brand"><Sparkles size={13} /></button>
      </div>
      <p className="tnum mt-1 text-20 font-bold whitespace-nowrap" title={full}>{value}</p>
      <div className="mt-1 flex min-h-7 items-end justify-between gap-2">
        {delta !== undefined ? (
          <span className={cx('tnum flex items-center gap-0.5 text-11', good ? 'text-success' : 'text-danger')}>
            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}{signedPct(delta)}<span className="hidden text-t3 sm:inline">نسبت به دورهٔ قبل</span>
          </span>
        ) : <span />}
        {spark && <Spark data={spark} w={64} h={24} color={good ? 'var(--success)' : 'var(--danger)'} />}
      </div>
      {note && <p className="mt-1 text-11 leading-4 text-t3">{note}</p>}
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
