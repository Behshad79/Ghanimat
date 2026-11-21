import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { JDateInput } from './jdate'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Copy, Eye, Inbox, Lock, RotateCcw, Search, Sparkles, TriangleAlert, Loader2 } from 'lucide-react'
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
    <button {...p} disabled={p.disabled || loading} className={cx('btn inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,transform,box-shadow] duration-150 active:scale-[.97] disabled:opacity-50 disabled:active:scale-100', v, s, className)}>
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

/** دامنهٔ ذخیرهٔ باز و بسته بودن کارت‌ها (مسیر صفحه و تب)؛ Page آن را تنظیم می‌کند */
let CARD_SCOPE = ''
export const setCardScope = (scope: string) => { CARD_SCOPE = scope }
/** متن ساده از عنوان کارت، برای کلید ذخیره */
const textOf = (n: ReactNode): string => n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : typeof n === 'object' && 'props' in (n as object) ? textOf((n as { props: { children?: ReactNode } }).props.children) : ''
/** کارت؛ هر کارت عنوان‌دار با کلیک روی عنوان یا فلش جمع و باز می‌شود و حالتش برای هر صفحه ذخیره می‌ماند.
 *  defaultOpen={false} برای کارت‌هایی که داده‌شان در لحظه مهم نیست؛ collapsible={false} برای کارتی که خودش باز و بسته را مدیریت می‌کند */
export function Card({ title, hint, actions, children, className, pad = true, onClick, defaultOpen = true, collapsible, id }: { title?: ReactNode; hint?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; pad?: boolean; onClick?: () => void; defaultOpen?: boolean; collapsible?: boolean; id?: string }) {
  const can = (collapsible ?? !!title) && !onClick
  const name = id ?? textOf(title).trim().slice(0, 60)
  const key = can && name ? `gh-card:${CARD_SCOPE}:${name}` : ''
  const read = () => { if (!key) return defaultOpen; try { const v = localStorage.getItem(key); return v === null ? defaultOpen : v === '1' } catch { return defaultOpen } }
  const [open, setOpen] = useState(read)
  useEffect(() => { setOpen(read()) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (v: boolean) => { setOpen(v); if (key) try { localStorage.setItem(key, v ? '1' : '0') } catch { /* فقط در حافظه */ } }
  useEffect(() => { if (!can) return; const f = (e: Event) => toggle((e as CustomEvent<boolean>).detail); window.addEventListener('gh-cards-all', f); return () => window.removeEventListener('gh-cards-all', f) }, [can, key]) // eslint-disable-line react-hooks/exhaustive-deps
  const show = !can || open
  return (
    <section onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined} className={cx('rounded-2xl border border-line bg-surface', onClick && 'lift cursor-pointer hover:border-brand/40', className)}>
      {(title || actions) && (
        <header className={cx('flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2.5', show && 'border-b border-line')}>
          <h3 onClick={can ? (e) => { if (!(e.target as HTMLElement).closest('button,a,input,select,label,textarea')) toggle(!open) } : undefined} className={cx('flex min-w-0 items-center gap-1.5 text-14 font-semibold', can && 'cursor-pointer select-none')}>{title}{hint}</h3>
          <div className="flex min-w-0 flex-wrap items-center gap-1 [&>*]:max-w-full">{show && actions}{can && <button type="button" aria-expanded={open} aria-label={open ? 'بستن' : 'باز کردن'} title={open ? 'بستن' : 'باز کردن'} onClick={() => toggle(!open)} className="grid size-7 shrink-0 place-items-center rounded-lg text-t3 hover:bg-neutral-bg hover:text-t1"><ChevronDown size={16} className={cx('transition-transform duration-200', open && 'rotate-180')} /></button>}</div>
        </header>
      )}
      {show && <div className={pad ? 'p-5' : ''}>{children}</div>}
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
/** اگر پهنا داده نشده، تمام‌عرض (رفع تداخل w-full با w-36) */
const withW = (c?: string) => cx(inputBase, /(^|\s)(w-|min-w-|max-w-|flex-1)/.test(c ?? '') ? '' : 'w-full')
const inputBase = 'ctl h-9 rounded-md border border-line bg-surface px-3 text-13 text-t1 placeholder:font-sans placeholder:text-t3 focus:border-brand focus:outline-none disabled:opacity-60'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => p.type === 'date' || p.type === 'datetime-local' ? <JDateInput {...p} /> : <input {...p} className={cx(withW(p.className), p.className)} />
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(withW(p.className), 'h-auto py-2 leading-6', p.className)} />
export type QuickChip = { label: string; test: (value: string, label: string) => boolean }
/** منوی کشویی با جست‌وجو و فیلتر سریع داخل خود منو (قانون سراسری پنل: هیچ دراپ‌داونی بدون جست‌وجو نیست) */
export function Select({ value, onChange, options, className, chips, placeholder = 'انتخاب کنید', label, other }: { value: string; onChange: (v: string) => void; options: (string | [string, string])[]; className?: string; chips?: QuickChip[]; placeholder?: string; label?: string; other?: boolean }) {
  // قانون سراسری: هر فهرست انتخاب متنی گزینهٔ «سایر» دارد (به‌جز فیلترها و انتخاب رکورد مثل مشتری یا سفارش)
  const auto = other ?? (options.length >= 2 && options.every((o) => typeof o === 'string') && !options.some((o) => /^همه/.test(o as string)))
  const opts = [...options.map((o) => (Array.isArray(o) ? o : [o, o]) as [string, string]), ...(auto && !options.some((o) => isOther(Array.isArray(o) ? o[0] : o)) ? [['سایر', 'سایر'] as [string, string]] : [])]
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [chip, setChip] = useState(-1); const [hi, setHi] = useState(0)
  const btn = useRef<HTMLButtonElement>(null); const pop = useRef<HTMLDivElement>(null); const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false })
  // گزینهٔ «سایر»: با انتخابش کادر توضیح باز می‌شود و مقدار به شکل «سایر: …» ذخیره می‌شود
  const otherOpt = opts.find(([v]) => isOther(v)); const custom = !!otherOpt && value.startsWith('سایر: ')
  const cur = opts.find(([v]) => v === value) ?? (custom ? [value, value] as [string, string] : undefined)
  const showOther = !!otherOpt && (isOther(value) || custom)
  const norm = (t: string) => t.toLowerCase().replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/\u200c/g, ' ')
  const list = opts.filter(([v, l]) => (!q || norm(`${l} ${v}`).includes(norm(q))) && (chip < 0 || !chips || chips[chip].test(v, l)))
  const place = () => { const r = btn.current!.getBoundingClientRect(); const up = window.innerHeight - r.bottom < 300 && r.top > 300; setPos({ top: up ? r.top : r.bottom, left: r.left, width: Math.max(r.width, 220), up }) }
  // اسکرول داخل خود منو نادیده گرفته می‌شود؛ با اسکرول صفحه منو همراه دکمه جابه‌جا می‌شود و اگر دکمه از دید خارج شد بسته می‌شود
  useEffect(() => { if (!open) return
    const follow = (e: Event) => { if (pop.current && e.target instanceof Node && pop.current.contains(e.target)) return; const r = btn.current?.getBoundingClientRect(); if (!r || r.bottom < 0 || r.top > window.innerHeight) return setOpen(false); place() }
    const close = () => setOpen(false)
    window.addEventListener('scroll', follow, true); window.addEventListener('resize', close); return () => { window.removeEventListener('scroll', follow, true); window.removeEventListener('resize', close) } }, [open])
  const pick = (v: string) => { onChange(isOther(v) ? 'سایر: ' : v); setOpen(false); setQ(''); if (!isOther(v)) btn.current?.focus() }
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi][0]) }
    else if (e.key === 'Escape') { setOpen(false); btn.current?.focus() }
  }
  const searchable = opts.length > 5 || !!chips
  const trigger = (
    <>
      <button ref={btn} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-label={label} title={cur?.[1]}
        onClick={() => { place(); setOpen((o) => !o); setHi(Math.max(0, list.findIndex(([v]) => v === value))) }}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); place(); setOpen(true) } else if (open) key(e) }}
        className={cx(withW(className), 'flex items-center justify-between gap-2 text-right', className)}>
        <span className={cx('truncate', !cur && 'text-t3')}>{cur?.[1] ?? placeholder}</span><ChevronDown size={14} className={cx('shrink-0 text-t3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(<>
        <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
        <div ref={pop} role="listbox" className="anim-pop fixed z-[81] overflow-hidden rounded-xl border border-line bg-surface shadow-float" style={{ left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }} onKeyDown={key}>
          {searchable && <div className="border-b border-line p-2"><div className="relative"><Search size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-t3" /><input autoFocus aria-label="جست‌وجو در گزینه‌ها" value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder="جست‌وجو…" className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-8 pl-2 text-13 outline-none focus:border-brand" /></div>
            {chips && <div className="mt-2 flex flex-wrap gap-1">{chips.map((c, i) => <button key={c.label} type="button" onClick={() => { setChip(chip === i ? -1 : i); setHi(0) }} className={cx('rounded-full border px-2 py-0.5 text-11', chip === i ? 'border-transparent bg-brand-solid text-white' : 'border-line text-t2 hover:border-brand')}>{c.label}</button>)}</div>}</div>}
          <ul className="max-h-64 overflow-y-auto overscroll-contain p-1">{list.length === 0 ? <li className="px-3 py-3 text-center text-12 text-t3">موردی پیدا نشد.</li> : list.map(([v, l], i) => <li key={v}><button type="button" role="option" aria-selected={v === value} onMouseEnter={() => setHi(i)} onClick={() => pick(v)} className={cx('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-13', i === hi && 'bg-neutral-bg', v === value && 'font-semibold text-brand')}><span className="truncate">{l}</span>{v === value && <Check size={14} />}</button></li>)}</ul>
          {searchable && <p className="border-t border-line px-3 py-1.5 text-11 text-t3">{list.length.toLocaleString('fa-IR')} از {opts.length.toLocaleString('fa-IR')} گزینه</p>}
        </div></>, document.body)}
    </>
  )
  if (!showOther) return trigger
  const wcls = (className ?? '').split(/\s+/).filter((c) => /^(\w+:)?(w-|min-w-|max-w-|flex-1|grow|shrink)/.test(c)).join(' ')
  return <span className={cx('flex flex-col gap-1.5', wcls || 'w-full')}>{trigger}<input autoFocus aria-label="توضیح گزینهٔ سایر" value={value.startsWith('سایر: ') ? value.slice(6) : ''} onChange={(e) => onChange('سایر: ' + e.target.value)} placeholder="منظورتان از «سایر» چیست؟ بنویسید…" className={cx('ctl h-9 w-full rounded-md border bg-surface px-3 text-13 text-t1 outline-none placeholder:text-t3 focus:border-brand', value.trim() === 'سایر:' || isOther(value) ? 'border-warning' : 'border-line')} /></span>
}
/** آیا این گزینه «سایر» است؟ */
export const isOther = (v: string) => /^سایر($|\s*\(|\s*…)/.test(v.trim())
export function Toggle({ on, onChange, label, disabled, text }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; text?: ReactNode }) {
  const sw = (
    <button type="button" role="switch" aria-checked={on} aria-label={label ?? (typeof text === 'string' ? text : undefined)} disabled={disabled} onClick={() => onChange(!on)} className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50', on ? 'bg-brand-solid' : 'bg-line')}>
      <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all duration-150', on ? 'right-[18px]' : 'right-0.5')} />
    </button>
  )
  // با text، متن کنار کلید دیده می‌شود و کلیک روی متن هم کلید را عوض می‌کند
  return text ? <span className="inline-flex items-center gap-2">{sw}<span className={cx('cursor-pointer select-none', disabled && 'opacity-60')} onClick={() => !disabled && onChange(!on)}>{text}</span></span> : sw
}
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][]; size?: 'sm' | 'md' }) {
  const other = options.find(([v]) => isOther(v))
  if (other && (value === other[0] || String(value).startsWith('سایر: '))) return <span className="inline-flex flex-col gap-1.5"><span className="inline-flex rounded-md bg-neutral-bg p-0.5">{options.map(([v, l]) => <button key={v} type="button" aria-pressed={v === value} aria-label={typeof l === 'string' ? l : undefined} onClick={() => onChange(v)} className={cx('rounded-sm px-2.5 font-medium transition-colors', size === 'sm' ? 'h-6 text-11' : 'h-8 text-12', v === other[0] ? 'bg-surface text-t1 shadow-sm' : 'text-t2 hover:text-t1')}>{l}</button>)}</span><input autoFocus aria-label="توضیح گزینهٔ سایر" value={String(value).startsWith('سایر: ') ? String(value).slice(6) : ''} onChange={(e) => onChange(('سایر: ' + e.target.value) as T)} placeholder="منظورتان از «سایر» چیست؟" className="h-9 rounded-md border border-line bg-surface px-3 text-13 outline-none focus:border-brand" /></span>
  return (
    <div className="inline-flex rounded-md bg-neutral-bg p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} aria-label={typeof l === 'string' ? l : undefined} onClick={() => onChange(v)} className={cx('rounded-sm px-2.5 font-medium transition-colors', size === 'sm' ? 'h-6 text-11' : 'h-8 text-12', v === value ? 'bg-surface text-t1 shadow-sm' : 'text-t2 hover:text-t1')}>{l}</button>
      ))}
    </div>
  )
}
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  // نشانگر زیر تب فعال با حرکت نرم جابه‌جا می‌شود تا تغییر تب حس شود
  const box = useRef<HTMLDivElement>(null); const [bar, setBar] = useState<{ x: number; w: number } | null>(null)
  useLayoutEffect(() => { const el = box.current?.querySelector<HTMLElement>('[aria-selected="true"]'); if (!el || !box.current) return setBar(null); setBar({ x: el.offsetLeft, w: el.offsetWidth }); el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }) }, [value, tabs.length])
  return (
    <div ref={box} role="tablist" className="scroll-fade relative flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)} className={cx('-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-13 font-medium transition-colors', t.id === value ? 'text-brand' : 'text-t2 hover:text-t1', !bar && t.id === value && 'border-brand')}>
          {t.label}
          {t.count !== undefined && <span className={cx('tnum rounded-full px-1.5 text-11 transition-colors', t.id === value ? 'bg-brand-tint' : 'bg-neutral-bg')}>{fa(t.count)}</span>}
        </button>
      ))}
      {bar && <span aria-hidden className="tab-bar pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-brand" style={{ left: bar.x, width: bar.w }} />}
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
/** کپی امن: اگر مرورگر اجازهٔ کلیپ‌بورد نداد، از روش جایگزین استفاده می‌شود و خطا به کاربر نمی‌رسد */
export function copyText(t: string): boolean {
  const fallback = () => { try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok } catch { return false } }
  try { const pr = navigator.clipboard?.writeText(t); if (pr) { pr.catch(fallback); return true } } catch { /* مجوز داده نشد */ }
  return fallback()
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
  // کلیک روی شناسه: نمای سریع همان مورد (اگر شناخته شود)؛ کلیک روی آیکون: کپی
  const open = (e: React.MouseEvent) => { const ev = new CustomEvent('quickview', { detail: { ref: v, handled: false } }); window.dispatchEvent(ev); if ((ev.detail as { handled: boolean }).handled) e.stopPropagation(); else copy(e) }
  const copy = (e: React.MouseEvent) => { e.stopPropagation(); copyText(v); setOk(true); setTimeout(() => setOk(false), 1200) }
  return (
    <span className="ltr group inline-flex items-center gap-1 font-mono text-12 text-t1">
      <button type="button" title="جزئیات" onClick={open} className="hover:text-brand hover:underline">{v}</button>
      <button type="button" title="کپی" aria-label={`کپی ${v}`} onClick={copy} className="opacity-40 hover:opacity-100 group-hover:opacity-70">{ok ? <Check size={11} className="text-success" /> : <Copy size={11} />}</button>
    </span>
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
