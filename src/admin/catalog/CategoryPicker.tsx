import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, FolderPlus, Plus, Search, X } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { getDB, mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

export type CatNode = { name: string; parent: string; depth: number; implicit: boolean; children: number }
const ROOT = (p?: string) => !p || p === '—' || p === '-'
const norm = (t: string) => t.toLowerCase().replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/‌/g, ' ').trim()

/** درخت دسته‌ها از فهرست تخت (name + parent). والدی که خودش ردیف ندارد «ضمنی» ساخته می‌شود. */
export function catTree(cats: { name: string; parent?: string; active?: boolean }[]): CatNode[] {
  const names = new Set(cats.map((c) => c.name))
  const roots = [...new Set([...cats.filter((c) => ROOT(c.parent)).map((c) => c.name), ...cats.filter((c) => !ROOT(c.parent) && !names.has(c.parent!)).map((c) => c.parent!)])]
  const kids = (p: string) => cats.filter((c) => c.parent === p).map((c) => c.name)
  const out: CatNode[] = []
  const walk = (n: string, depth: number, parent: string, seen: Set<string>) => { if (seen.has(n)) return; seen.add(n); const ch = kids(n); out.push({ name: n, parent, depth, implicit: !names.has(n), children: ch.length }); ch.forEach((c) => walk(c, depth + 1, n, seen)) }
  const seen = new Set<string>(); roots.forEach((r) => walk(r, 0, '', seen))
  cats.forEach((c) => { if (!seen.has(c.name)) walk(c.name, 0, '', seen) })
  return out
}

/** ساخت دسته یا زیردسته از داخل همان منو */
export function createCategory(name: string, parent: string): string | null {
  const n = name.trim(); if (!n) return 'نام دسته را بنویسید.'
  const cats = (getDB().entities.categories ?? []) as unknown as { name: string; parent?: string; template?: string }[]
  if (cats.some((c) => norm(c.name) === norm(n)) || catTree(cats).some((c) => norm(c.name) === norm(n))) return `دستهٔ «${n}» از قبل هست.`
  const tpl = cats.find((c) => c.name === parent)?.template ?? ''
  mutate((x) => { (x.entities.categories ??= []).push({ id: `cat${Date.now().toString(36)}`, name: n, parent: parent || '—', slug: '', template: tpl, faq: 0, active: true }) }, { action: parent ? 'ساخت زیردسته از فرم کالا' : 'ساخت دستهٔ اصلی از فرم کالا', target: parent ? `${parent} › ${n}` : n })
  return null
}

type Props = { label?: string; placeholder?: string; error?: boolean } & ({ multi?: false; value: string; onChange: (v: string) => void; exclude?: string[] } | { multi: true; value: string[]; onChange: (v: string[]) => void; exclude?: string[] })

/** منوی درختی دسته‌ها: دستهٔ اصلی پررنگ، زیردسته‌ها تورفته؛ جست‌وجو، انتخاب چندتایی با تیک، ساخت دسته و زیردسته در همان منو */
export function CategoryPicker(p: Props) {
  const d = useDB(); const tree = useMemo(() => catTree((d.entities.categories ?? []) as unknown as { name: string; parent?: string }[]), [d.entities.categories])
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [adding, setAdding] = useState<{ parent: string } | null>(null); const [nn, setNn] = useState('')
  const btn = useRef<HTMLDivElement>(null); const pop = useRef<HTMLDivElement>(null); const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false })
  const place = () => { const r = btn.current!.getBoundingClientRect(); const up = window.innerHeight - r.bottom < 380 && r.top > 380; setPos({ top: up ? r.top : r.bottom, left: r.left, width: Math.max(r.width, 300), up }) }
  useEffect(() => { if (!open) return
    const follow = (e: Event) => { if (pop.current && e.target instanceof Node && pop.current.contains(e.target)) return; const r = btn.current?.getBoundingClientRect(); if (!r || r.bottom < 0 || r.top > window.innerHeight) return setOpen(false); place() }
    const close = () => setOpen(false); window.addEventListener('scroll', follow, true); window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', follow, true); window.removeEventListener('resize', close) } }, [open])
  const sel = p.multi ? p.value : p.value ? [p.value] : []
  const ex = new Set(p.exclude ?? [])
  // جست‌وجو: هر دسته‌ای که خودش یا یکی از زیرشاخه‌هایش بخورد، با والدهایش نمایش داده می‌شود
  const list = useMemo(() => { if (!q.trim()) return tree; const hit = new Set(tree.filter((n) => norm(n.name).includes(norm(q))).map((n) => n.name)); const keep = new Set<string>(); tree.forEach((n) => { if (!hit.has(n.name)) return; keep.add(n.name); let par = n.parent; while (par) { keep.add(par); par = tree.find((t) => t.name === par)?.parent ?? '' } }); return tree.filter((n) => keep.has(n.name)) }, [tree, q])
  const toggle = (name: string) => { if (p.multi) p.onChange(sel.includes(name) ? sel.filter((x) => x !== name) : [...sel, name]); else { p.onChange(name); setOpen(false); setQ('') } }
  const selectable = list.filter((n) => !ex.has(n.name))
  const allOn = p.multi && selectable.length > 0 && selectable.every((n) => sel.includes(n.name))
  const add = () => { const err = createCategory(nn, adding!.parent); if (err) return toast(err, { tone: 'err' }); toast(adding!.parent ? `زیردستهٔ «${nn.trim()}» زیر «${adding!.parent}» ساخته شد.` : `دستهٔ اصلی «${nn.trim()}» ساخته شد.`); toggle(nn.trim()); setNn(''); setAdding(null) }
  const addRow = (parent: string, depth: number) => <li key={`add-${parent}`} className="flex items-center gap-1.5 px-2 py-1" style={{ paddingRight: 8 + depth * 18 }}>
    <input autoFocus aria-label={parent ? `نام زیردستهٔ ${parent}` : 'نام دستهٔ اصلی تازه'} value={nn} onChange={(e) => setNn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } if (e.key === 'Escape') setAdding(null) }} placeholder={parent ? `زیردستهٔ تازه در «${parent}»` : 'نام دستهٔ اصلی تازه'} className="h-8 min-w-0 flex-1 rounded-lg border border-brand bg-surface px-2 text-13 outline-none" />
    <button type="button" onClick={add} className="h-8 rounded-lg bg-brand-solid px-3 text-12 text-white">ساختن</button><button type="button" aria-label="انصراف" onClick={() => setAdding(null)} className="grid size-8 place-items-center text-t2"><X size={14} /></button></li>
  return (
    <>
      <div ref={btn} role="combobox" tabIndex={0} aria-expanded={open} aria-label={p.label} onClick={() => { place(); setOpen((o) => !o) }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); place(); setOpen(true) } if (e.key === 'Escape') setOpen(false) }}
        className={cx('ctl flex min-h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border bg-surface px-2 py-1 text-13 outline-none focus:border-brand', open ? 'border-brand ring-2 ring-brand/20' : p.error ? 'border-danger' : 'border-line')}>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {!sel.length && <span className="px-1 text-t3">{p.placeholder ?? 'انتخاب دسته‌بندی'}</span>}
          {!p.multi && sel[0] && <span className="truncate px-1">{(() => { const n = tree.find((t) => t.name === sel[0]); return n?.parent ? <><span className="text-t2">{n.parent} › </span>{n.name}</> : sel[0] })()}</span>}
          {p.multi && sel.slice(0, 3).map((s) => <span key={s} className="flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-12 text-brand">{s}<button type="button" aria-label={`برداشتن ${s}`} onClick={(e) => { e.stopPropagation(); toggle(s) }}><X size={12} /></button></span>)}
          {p.multi && sel.length > 3 && <span className="text-12 text-t2">+{fa(sel.length - 3)}</span>}
        </span>
        <ChevronDown size={14} className={cx('shrink-0 text-t3 transition-transform', open && 'rotate-180')} />
      </div>
      {open && createPortal(<>
        <div className="fixed inset-0 z-[80]" onClick={() => { setOpen(false); setAdding(null) }} />
        <div ref={pop} role="listbox" aria-multiselectable={p.multi || undefined} className="anim-pop fixed z-[81] flex max-h-[380px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-float" style={{ left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}>
          <div className="flex items-center gap-2 border-b border-line p-2">
            {p.multi && <button type="button" role="checkbox" aria-checked={allOn} aria-label="انتخاب همه" onClick={() => p.onChange(allOn ? sel.filter((x) => !selectable.some((n) => n.name === x)) : [...new Set([...sel, ...selectable.map((n) => n.name)])])} className={cx('grid size-5 shrink-0 place-items-center rounded border', allOn ? 'border-success bg-success-solid text-white' : 'border-line')}>{allOn && <Check size={12} />}</button>}
            <div className="relative flex-1"><Search size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-t3" /><input autoFocus aria-label="جست‌وجو در دسته‌ها" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در دسته‌ها…" className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-8 pl-2 text-13 outline-none focus:border-brand" /></div>
            {p.multi && sel.length > 0 && <button type="button" aria-label="پاک کردن همه" onClick={() => p.onChange([])} className="grid size-8 place-items-center text-t2 hover:text-danger"><X size={15} /></button>}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {list.length === 0 && <li className="px-3 py-3 text-center text-12 text-t3">دسته‌ای با «{q}» نیست.{' '}<button type="button" className="text-brand underline" onClick={() => { setAdding({ parent: '' }); setNn(q) }}>ساخت «{q}» به‌عنوان دستهٔ اصلی</button></li>}
            {list.map((n) => { const on = sel.includes(n.name); const off = ex.has(n.name); const root = n.depth === 0
              return [<li key={n.name} className="group flex items-center gap-1">
                <button type="button" role="option" aria-selected={on} disabled={off} onClick={() => toggle(n.name)} title={off ? 'دستهٔ اصلی همین کالاست' : undefined}
                  className={cx('flex min-h-9 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-right text-13 hover:bg-neutral-bg disabled:cursor-not-allowed disabled:opacity-40', on && !p.multi && 'bg-brand-tint text-brand')} style={{ paddingRight: 8 + n.depth * 18 }}>
                  {p.multi && <span className={cx('grid size-5 shrink-0 place-items-center rounded border', on ? 'border-success bg-success-solid text-white' : 'border-line')}>{on && <Check size={12} />}</span>}
                  {!root && <span className="size-1 shrink-0 rounded-full bg-t3" />}
                  <span className={cx('truncate', root && 'font-bold')}>{n.name}</span>
                  {n.children > 0 && <span className="text-11 text-t3">{fa(n.children)}</span>}
                  {!p.multi && on && <Check size={14} className="mr-auto" />}
                </button>
                <button type="button" aria-label={`زیردستهٔ تازه در ${n.name}`} title="زیردستهٔ تازه" onClick={() => { setAdding({ parent: n.name }); setNn('') }} className="grid size-8 shrink-0 place-items-center rounded-lg text-t3 opacity-0 hover:bg-neutral-bg hover:text-brand focus:opacity-100 group-hover:opacity-100"><Plus size={14} /></button>
              </li>, adding?.parent === n.name && addRow(n.name, n.depth + 1)] })}
            {adding?.parent === '' && addRow('', 0)}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5 text-11 text-t3">
            <button type="button" onClick={() => { setAdding({ parent: '' }); setNn('') }} className="flex items-center gap-1 rounded-md px-2 py-1 text-12 text-brand hover:bg-brand-tint"><FolderPlus size={14} />دستهٔ اصلی تازه</button>
            <span>{p.multi ? `${fa(sel.length)} انتخاب‌شده · ` : ''}برای زیردسته روی + کنار هر دسته بزنید</span>
          </div>
        </div></>, document.body)}
    </>
  )
}
