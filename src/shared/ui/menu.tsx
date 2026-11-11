import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import { cx } from './base'

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; hint?: string } | 'sep'
/** منوی اقدام ردیف و کارت؛ در لایهٔ شناور رندر می‌شود تا داخل جدول اسکرول‌دار بریده نشود */
export function RowMenu({ items, label = 'اقدام‌های بیشتر', trigger }: { items: MenuItem[]; label?: string; trigger?: ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null); const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pos) return
    const close = (e: Event) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setPos(null) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    document.addEventListener('mousedown', close); window.addEventListener('keydown', key); window.addEventListener('scroll', () => setPos(null), { once: true, capture: true })
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', key) }
  }, [pos])
  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = btn.current!.getBoundingClientRect(); const h = items.length * 36 + 16
    setPos({ top: r.bottom + h > window.innerHeight ? Math.max(8, r.top - h) : r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 228)) })
  }
  return (
    <>
      <button ref={btn} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={open} className="btn grid size-8 place-items-center rounded-md text-t2 transition-colors hover:bg-neutral-bg hover:text-t1">{trigger ?? <MoreHorizontal size={16} />}</button>
      {pos && createPortal(
        <div ref={box} role="menu" style={{ top: pos.top, left: pos.left }} className="anim-pop fixed z-[80] w-56 rounded-lg border border-line bg-surface p-1 text-13 shadow-float" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => it === 'sep' ? <div key={i} className="my-1 h-px bg-line" /> : (
            <button key={i} role="menuitem" disabled={it.disabled} title={it.hint} onClick={() => { setPos(null); it.onClick() }} className={cx('flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-right transition-colors disabled:opacity-45', it.danger ? 'text-danger hover:bg-danger-bg' : 'hover:bg-neutral-bg')}>
              <span className="grid w-4 place-items-center">{it.icon}</span><span className="flex-1">{it.label}</span>
            </button>
          ))}
        </div>, document.body)}
    </>
  )
}
