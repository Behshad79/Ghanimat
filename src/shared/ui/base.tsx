import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'
import { Check, Copy, Eye, Inbox, Lock, RotateCcw, Sparkles, TriangleAlert, Loader2 } from 'lucide-react'
import { st, type Tone } from '../data/statuses'
import { fa, mask } from '../lib/fa'
import { mutate, setSession, useSession } from '../lib/store'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

const toneCls: Record<Tone, string> = {
  neutral: 'bg-neutral-bg text-t2', info: 'bg-info-bg text-info', success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning', danger: 'bg-danger-bg text-danger', purple: 'bg-purple-bg text-purple', brand: 'bg-brand-tint text-brand',
}
const toneDot: Record<Tone, string> = { neutral: 'bg-t3', info: 'bg-info', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', purple: 'bg-purple', brand: 'bg-brand' }

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai'; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; loading?: boolean }
export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand-solid text-on-brand shadow-sm hover:bg-brand-solid-pressed active:bg-brand-solid-pressed',
    secondary: 'bg-surface text-t1 border border-line hover:bg-surface-2',
    ghost: 'text-t2 hover:bg-neutral-bg hover:text-t1',
    danger: 'bg-danger-bg text-danger hover:brightness-95',
    ai: 'bg-brand-tint text-brand hover:brightness-95',
  }[variant]
  const s = { sm: 'h-7 px-2 text-12 gap-1', md: 'h-9 px-3 text-13 gap-1.5', lg: 'h-11 px-4 text-14 gap-2' }[size]
  return (
    <button {...p} disabled={p.disabled || loading} className={cx('btn inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50', v, s, className)}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
export const AIButton = (p: BtnProps) => <Button variant="ai" icon={<Sparkles size={14} />} {...p} />
export const AITag = ({ confidence, source }: { confidence?: string; source?: string }) => (
  <span className="inline-flex items-center gap-1 rounded-sm bg-brand-tint px-1.5 py-0.5 text-11 text-brand">
    <Sparkles size={11} /> پیشنهاد AI؛ بازبینی نشده{confidence && ` · اطمینان: ${confidence}`}{source && ` · منبع: ${source}`}
  </span>
)

export function Badge({ tone = 'neutral', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-11 font-medium whitespace-nowrap', toneCls[tone])}>
      {dot && <span className={cx('size-1.5 rounded-full', toneDot[tone])} />}{children}
    </span>
  )
}
export const StatusBadge = ({ s }: { s: string }) => { const x = st(s); return <Badge tone={x.tone}>{x.label}</Badge> }

export function Card({ title, hint, actions, children, className, pad = true }: { title?: ReactNode; hint?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('rounded-lg border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h3 className="flex items-center gap-1 text-13 font-semibold">{title}{hint}</h3>
          <div className="flex items-center gap-1">{actions}</div>
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

export function Field({ label, help, error, hint, children }: { label: string; help?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-12 font-medium text-t2">{label}{hint}</span>
      {children}
      {error ? <span className="mt-1 block text-11 text-danger">{error}</span> : help && <span className="mt-1 block text-11 text-t3">{help}</span>}
    </label>
  )
}
const inputCls = 'ctl h-9 w-full rounded-md border border-line bg-surface px-3 text-13 text-t1 placeholder:font-sans placeholder:text-t3 focus:border-brand focus:outline-none disabled:opacity-60'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'h-auto py-2 leading-6', p.className)} />
export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: (string | [string, string])[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'pe-8', className)}>
      {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option> })}
    </select>
  )
}
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50', on ? 'bg-brand' : 'bg-line')}>
      <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all duration-150', on ? 'right-[18px]' : 'right-0.5')} />
    </button>
  )
}
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-md bg-neutral-bg p-0.5">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={cx('rounded-sm px-2.5 font-medium transition-colors', size === 'sm' ? 'h-6 text-11' : 'h-8 text-12', v === value ? 'bg-surface text-t1 shadow-sm' : 'text-t2 hover:text-t1')}>{l}</button>
      ))}
    </div>
  )
}
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)} className={cx('-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-13 font-medium transition-colors', t.id === value ? 'border-brand text-brand' : 'border-transparent text-t2 hover:text-t1')}>
          {t.label}
          {t.count !== undefined && <span className={cx('tnum rounded-full px-1.5 text-11', t.id === value ? 'bg-brand-tint' : 'bg-neutral-bg')}>{fa(t.count)}</span>}
        </button>
      ))}
    </div>
  )
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />
export const SkeletonPage = () => (
  <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
    <Skeleton className="h-10" />
    {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11" />)}
  </div>
)
export function EmptyState({ title, desc, action, icon }: { title: string; desc?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-full bg-neutral-bg text-t3">{icon ?? <Inbox size={22} />}</div>
      <p className="text-14 font-semibold">{title}</p>
      {desc && <p className="max-w-md text-13 text-t2">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
export function ErrorState({ title = 'داده‌ها بارگذاری نشد.', desc = 'سرور پاسخ نداد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید. اگر ادامه داشت، وضعیت سیستم را ببینید.', onRetry }: { title?: string; desc?: string; onRetry?: () => void }) {
  return (
    <EmptyState icon={<TriangleAlert size={22} className="text-danger" />} title={title} desc={desc}
      action={<Button icon={<RotateCcw size={14} />} onClick={onRetry ?? (() => setSession({ viewState: 'normal' }))}>تلاش دوباره</Button>} />
  )
}
export function NoAccess({ what = 'این صفحه' }: { what?: string }) {
  const [sent, setSent] = useState(false)
  return (
    <EmptyState icon={<Lock size={22} />} title={`به ${what} دسترسی ندارید.`} desc="نقش شما این بخش را شامل نمی‌شود. می‌توانید از مدیر بخواهید دسترسی بدهد؛ درخواست با اعلان برای او ارسال می‌شود."
      action={sent ? <Badge tone="success">درخواست برای مدیر ارسال شد</Badge> : (
        <Button variant="primary" onClick={() => { mutate((d) => { d.approvals.unshift({ id: `AP-${700 + d.approvals.length + 2}`, type: 'درخواست دسترسی', title: `دسترسی به ${what}`, ref: '-', amount: 0, by: 'کاربر فعلی', byRole: 'x', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'درخواست از مدیر', target: what }); setSent(true) }}>درخواست از مدیر</Button>
      )} />
  )
}

export const Avatar = ({ name, size = 28 }: { name: string; size?: number }) => (
  <span className="inline-grid shrink-0 place-items-center rounded-full bg-brand-tint font-semibold text-brand" style={{ width: size, height: size, fontSize: size * 0.42 }}>{name.trim()[0]}</span>
)
/** شناسه، سریال و کد: قلم هم‌عرض و کپی با یک کلیک (بخش ۱۲) */
export function CopyId({ v }: { v: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button title="کپی" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(v); setOk(true); setTimeout(() => setOk(false), 1200) }} className="ltr group inline-flex items-center gap-1 font-mono text-12 text-t1 hover:text-brand">
      {v}{ok ? <Check size={11} className="text-success" /> : <Copy size={11} className="opacity-0 group-hover:opacity-60" />}
    </button>
  )
}
/** دادهٔ حساس: پیش‌فرض پوشیده؛ آشکارسازی در لاگ ممیزی ثبت می‌شود (بخش ۲) */
export function Masked({ id, value, label }: { id: string; value: string; label: string }) {
  const s = useSession()
  const shown = s.revealed.includes(id)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="ltr font-mono text-12">{shown ? value : mask(value)}</span>
      {!shown && <button title="نمایش؛ در لاگ ثبت می‌شود" className="text-t3 hover:text-brand" onClick={(e) => { e.stopPropagation(); setSession({ revealed: [...s.revealed, id] }); mutate(() => {}, { action: 'مشاهدهٔ دادهٔ حساس', target: label }) }}><Eye size={13} /></button>}
    </span>
  )
}
export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="ltr rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-11 text-t2">{children}</kbd>
export const Progress = ({ value, tone = 'brand' }: { value: number; tone?: Tone }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full transition-all', toneDot[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
)
export const Light = ({ s }: { s: 'ok' | 'warn' | 'crit' }) => <span title={st(`health.${s}`).label} className={cx('inline-block size-2.5 rounded-full', s === 'ok' ? 'bg-success' : s === 'warn' ? 'bg-warning' : 'bg-danger animate-pulse')} />
export const Row = ({ k, children }: { k: ReactNode; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-13"><span className="shrink-0 text-t2">{k}</span><span className="text-left font-medium">{children}</span></div>
)
