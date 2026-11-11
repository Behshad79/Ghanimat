import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CircleHelp, Search, Sparkles, X, BookOpen } from 'lucide-react'
import { Button, cx, Input } from './base'
import { SuccessCheck } from './motion'
import { HINTS } from '../data/hints'
import { useSession } from '../lib/store'

// ───── Modal ─────
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open, onClose])
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-50 grid place-items-end bg-[#10123d]/40 sm:place-items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className={cx('anim-pop flex max-h-[90vh] w-full flex-col rounded-t-lg bg-surface shadow-float sm:rounded-lg', wide ? 'sm:max-w-3xl' : 'sm:max-w-md')}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-14 font-semibold">{title}</h2><button aria-label="بستن" onClick={onClose} className="text-t3 hover:text-t1"><X size={18} /></button></header>
        <div className="overflow-y-auto p-4 text-13">{children}</div>
        {footer && <footer className="flex justify-start gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
// ───── Side Panel (کشوی جانبی) ─────
export function Drawer({ open, onClose, title, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open, onClose])
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-40 bg-[#10123d]/30" onMouseDown={onClose}>
      <aside onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: width }} className="anim-slide absolute inset-y-0 left-0 flex w-full flex-col bg-surface shadow-float">
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3"><div className="min-w-0 text-14 font-semibold">{title}</div><button aria-label="بستن" onClick={onClose} className="text-t3 hover:text-t1"><X size={18} /></button></header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </aside>
    </div>
  )
}

// ───── Toast با «بازگردانی» (بخش ۳ قاعدهٔ ۹) ─────
type T = { id: number; msg: string; undo?: () => void; tone?: 'ok' | 'err' }
let toasts: T[] = []
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
export function toast(msg: string, opts: { undo?: () => void; tone?: 'ok' | 'err' } = {}) {
  const t = { id: Date.now() + Math.random(), msg, ...opts }
  toasts = [...toasts, t].slice(-3); emit()
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); emit() }, opts.undo ? 7000 : 4000)
}
export function ToastHost() {
  const list = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => toasts)
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('anim-pop pointer-events-auto flex max-w-lg items-center gap-3 rounded-md px-4 py-2.5 text-13 text-white shadow-float', t.tone === 'err' ? 'bg-[#b02a2a]' : 'bg-[#10123d]')}>
          {t.tone !== 'err' && <SuccessCheck />}<span>{t.msg}</span>
          {t.undo && <button className="font-semibold text-[#aab0ff] hover:underline" onClick={() => { t.undo!(); toasts = toasts.filter((x) => x.id !== t.id); emit() }}>بازگردانی</button>}
        </div>
      ))}
    </div>
  )
}

// ───── مودال تأیید با اثر دقیق (بخش ۴.۳ قاعدهٔ ۴) ─────
type C = { title: string; body: ReactNode; confirm: string; danger?: boolean; resolve: (ok: boolean) => void }
let pending: C | null = null
const cSubs = new Set<() => void>()
export const confirm = (o: Omit<C, 'resolve'>) => new Promise<boolean>((resolve) => { pending = { ...o, resolve }; cSubs.forEach((f) => f()) })
export function ConfirmHost() {
  const c = useSyncExternalStore((f) => { cSubs.add(f); return () => cSubs.delete(f) }, () => pending)
  const done = (ok: boolean) => { c?.resolve(ok); pending = null; cSubs.forEach((f) => f()) }
  return (
    <Modal open={!!c} onClose={() => done(false)} title={c?.title ?? ''} footer={<><Button variant={c?.danger ? 'danger' : 'primary'} onClick={() => done(true)}>{c?.confirm}</Button><Button variant="ghost" onClick={() => done(false)}>انصراف</Button></>}>
      <div className="leading-6 text-t2">{c?.body}</div>
    </Modal>
  )
}

// ───── هینت با «از AI بپرس»، «جست‌وجو در گوگل»، «راهنمای کامل» (بخش ۵.۷) ─────
export const askCopilot = (q: string) => window.dispatchEvent(new CustomEvent('copilot', { detail: q }))
export function Hint({ k }: { k: keyof typeof HINTS | string }) {
  const h = HINTS[k]
  const s = useSession()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState<string | null>(null); const [full, setFull] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => { if (!open) return; const f = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f) }, [open])
  if (!h || s.hints === 'off') return null
  return (
    <span ref={ref} className="relative inline-flex align-middle" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`راهنما: ${h.title}`} onClick={() => setOpen(!open)} className="text-t3 hover:text-brand"><CircleHelp size={13} /></button>
      <Modal open={full} onClose={() => setFull(false)} title={`راهنمای کامل: ${h.title}`}>
        <div className="space-y-3 text-13 leading-7"><p>{h.def}</p>{h.here && <p><b>در غنیمت یعنی:</b> {h.here}</p>}{h.formula && <p className="rounded-md bg-neutral-bg px-3 py-2"><b>فرمول:</b> {h.formula}</p>}{h.effect && <p><b>اثر:</b> {h.effect}</p>}<p className="text-12 text-t2">پرسش بیشتر؟ از «از AI بپرس» در همین راهنما استفاده کنید یا مرکز راهنمای داخلی را ببینید.</p></div>
      </Modal>
      {open && (
        <div role="tooltip" className="anim-pop absolute top-5 right-0 z-30 w-72 rounded-lg border border-line bg-surface p-3 text-right text-12 font-normal leading-5 text-t2 shadow-float">
          <p className="mb-1 text-13 font-semibold text-t1">{h.title}</p>
          <p>{h.def}</p>
          {h.here && <p className="mt-1.5"><b className="text-t1">در غنیمت یعنی:</b> {h.here}</p>}
          {h.formula && <p className="mt-1.5 rounded-sm bg-neutral-bg px-2 py-1 text-t1">{h.formula}</p>}
          {h.effect && <p className="mt-1.5">{h.effect}</p>}
          {q !== null ? (
            <div className="mt-2 flex gap-1">
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="h-7 text-12" />
              <Button size="sm" variant="primary" onClick={() => { window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener'); setQ(null) }}>جست‌وجو</Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
              {s.askAI && <Button size="sm" variant="ai" icon={<Sparkles size={12} />} onClick={() => { askCopilot(`${h.title} یعنی چه و در این صفحه چه معنایی دارد؟`); setOpen(false) }}>از AI بپرس</Button>}
              {s.google && <Button size="sm" variant="ghost" icon={<Search size={12} />} onClick={() => setQ(h.q)}>جست‌وجو در گوگل</Button>}
              <Button size="sm" variant="ghost" icon={<BookOpen size={12} />} onClick={() => { setOpen(false); setFull(true) }}>راهنمای کامل</Button>
            </div>
          )}
        </div>
      )}
    </span>
  )
}
