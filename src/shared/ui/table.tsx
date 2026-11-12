import { QuickText } from './quickview'
import { isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Filter, Maximize2, Minimize2, Printer, Search, SearchX, X } from 'lucide-react'
import { Badge, Button, cx, EmptyState, Input } from './base'
import { DateFilter, inRange, rangeActive, rangeLabel, type DateRange } from './datefilter'
import { st } from '../data/statuses'
import { Drawer, toast } from './overlay'
import { RowMenu, type MenuItem } from './menu'
import { csv, download, fa } from '../lib/fa'
import { mutate } from '../lib/store'

export type Col<R> = { key: string; title: ReactNode; render: (r: R) => ReactNode; sort?: (r: R) => number | string; text?: (r: R) => string | number; align?: 'left'; hideMobile?: boolean; optional?: boolean; wrap?: boolean }
type Props<R> = {
  rows: R[]; cols: Col<R>[]; rowKey: (r: R) => string; name: string
  onRow?: (r: R) => void; search?: (r: R) => string; filters?: ReactNode
  bulk?: (ids: string[], clear: () => void) => ReactNode
  empty: { title: string; desc?: string; action?: ReactNode }
  pageSize?: number; flashId?: string | null
  actions?: (r: R) => MenuItem[]
  /** وقتی صفحه خودش فیلتر زمانی دارد، فیلتر زمانی داخلی جدول پنهان می‌شود */
  noDate?: boolean
}

// ───── استخراج متن از هر سلول برای جست‌وجو، مرتب‌سازی و فیلتر خودکار ─────
const PD = '۰۱۲۳۴۵۶۷۸۹'
const latin = (x: string) => x.replace(/[۰-۹]/g, (c) => String(PD.indexOf(c))).replace(/[٬,]/g, '').replace('٫', '.')
function nodeText(n: unknown, depth = 0): string {
  if (n == null || typeof n === 'boolean' || depth > 6) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map((x) => nodeText(x, depth + 1)).join(' ')
  if (isValidElement(n)) { const p = n.props as Record<string, unknown>; const own = [p.v, p.a, p.b, p.label, p.value, p.title].filter((x) => typeof x === 'string' || typeof x === 'number' || isValidElement(x)).map((x) => nodeText(x, depth + 1)); if (typeof p.s === 'string') own.push(st(p.s).label); return [...own, nodeText(p.children, depth + 1)].filter(Boolean).join(' ') }
  return ''
}
const asNum = (x: string) => { const t = latin(x).replace(/\s|تومان|ریال|٪|%|عدد|−/g, (m) => (m === '−' ? '-' : '')); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null }
const DATE_KEYS = ['createdAt', 'at', 'handedAt', 'updatedAt', 'date', 'received', 'sentAt', 'deliveredAt', 'deadline', 'readyAt', 'when', 'since']
const isIso = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)
const R0: DateRange = { range: 'all', from: '', to: '', days: [], h1: 0, h2: 24 }
/** جدول داده: جست‌وجو، مرتب‌سازی، انتخاب گروهی (Shift برای بازه)، انتخاب ستون، خروجی همین نما، چاپ، کارت موبایل */
export function DataTable<R>({ rows, cols, rowKey, name, onRow, search, filters, bulk, empty, pageSize = 12, flashId, actions, noDate }: Props<R>) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [last, setLast] = useState<number | null>(null)
  const [hidden, setHidden] = useState<string[]>(cols.filter((c) => c.optional).map((c) => c.key))
  const [colMenu, setColMenu] = useState(false)
  const [page, setPage] = useState(0)
  const [peek, setPeek] = useState<R | null>(null)
  // هیچ ردیفی بی‌واکنش نیست: اگر صفحه جزئیات اختصاصی ندارد، کشوی جزئیات همهٔ ستون‌ها باز می‌شود
  const rowClick = onRow ?? ((r: R) => setPeek(r))

  const [fOpen, setFOpen] = useState(false)
  // بزرگ‌نمایی: جدول کل صفحه را می‌گیرد، ردیف‌های بیشتری در هر صفحه و سربرگ چسبان
  const [max, setMax] = useState(false)
  useEffect(() => { if (!max) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setMax(false); window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' } }, [max])
  const [dr, setDr] = useState<DateRange>(R0)
  const [vals, setVals] = useState<Record<string, string[]>>({})
  const [nums, setNums] = useState<Record<string, [string, string]>>({})
  // متن هر سلول یک‌بار محاسبه می‌شود
  const cellText = useMemo(() => { const m = new Map<R, Record<string, string>>(); rows.forEach((r) => { const o: Record<string, string> = {}; cols.forEach((c) => { const t = c.text ? c.text(r) : undefined; o[c.key] = (t !== undefined ? String(t) : nodeText(c.render(r))).replace(/\s+/g, ' ').trim() }); m.set(r, o) }); return m }, [rows, cols])
  const dateKey = useMemo(() => (noDate ? null : DATE_KEYS.find((k) => rows.some((r) => isIso((r as Record<string, unknown>)[k])))) ?? null, [rows, noDate])
  // ستون‌هایی که مقدارهای محدود دارند (وضعیت، کانال، انبار…) فیلتر انتخابی می‌گیرند؛ ستون‌های عددی بازهٔ حداقل و حداکثر
  // هر ستونِ تکرارشونده (وضعیت، مشتری، کانال، انبار…) فیلتر کشویی با جست‌وجو و شمارش می‌گیرد؛ ستون‌های عددی بازهٔ حداقل و حداکثر. مقدارهای یکتا (کد، شماره) با جست‌وجوی بالای جدول پیدا می‌شوند
  const facets = useMemo(() => cols.map((c) => { const all = rows.map((r) => cellText.get(r)![c.key]).filter(Boolean); const cnt = new Map<string, number>(); all.forEach((x) => cnt.set(x, (cnt.get(x) ?? 0) + 1)); const uniq = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fa')); const numeric = (all.length > 0 && all.every((x) => asNum(x) !== null)) || !!(c.sort && rows.length && typeof c.sort(rows[0]) === 'number'); const categorical = uniq.length >= 2 && uniq.length < all.length && !numeric && all.every((x) => x.length <= 60); return { c, uniq: categorical ? uniq : [], numeric: numeric && uniq.length > 3 } }).filter((f) => f.uniq.length || f.numeric), [rows, cols, cellText])
  const numOf = (c: Col<R>, r: R) => { const v = c.sort?.(r); return typeof v === 'number' ? v : asNum(cellText.get(r)![c.key]) }
  const active = (dateKey && rangeActive(dr) ? 1 : 0) + Object.values(vals).filter((v) => v.length).length + Object.values(nums).filter(([a, b]) => a || b).length
  const clearAll = () => { setQ(''); setDr(R0); setVals({}); setNums({}); setPage(0) }

  const view = useMemo(() => {
    const qq = latin(q.trim().toLowerCase())
    let v = rows.filter((r) => {
      if (qq && !latin(((search ? search(r) + ' ' : '') + Object.values(cellText.get(r)!).join(' ')).toLowerCase()).includes(qq)) return false
      if (dateKey && rangeActive(dr)) { const iso = (r as Record<string, unknown>)[dateKey]; if (!isIso(iso) || !inRange(iso as string, dr)) return false }
      for (const [k, list] of Object.entries(vals)) if (list.length && !list.includes(cellText.get(r)![k])) return false
      for (const [k, [a, b]] of Object.entries(nums)) { if (!a && !b) continue; const c = cols.find((x) => x.key === k)!; const n = numOf(c, r); if (n === null || (a && n < Number(latin(a))) || (b && n > Number(latin(b)))) return false }
      return true
    })
    if (sort) { const c = cols.find((x) => x.key === sort.key); if (c) { const key = (r: R): number | string => { if (c.sort) return c.sort(r); const t = cellText.get(r)![c.key]; const n = asNum(t); return n ?? t } ; v = [...v].sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fa')) * sort.dir }) } }
    return v
  }, [rows, q, sort, cols, search, cellText, dateKey, dr, vals, nums])
  const shown = cols.filter((c) => !hidden.includes(c.key))
  const ps = max ? Math.max(pageSize, 50) : pageSize
  const pages = Math.ceil(view.length / ps)
  const pageRows = view.slice(page * ps, page * ps + ps)
  const toggle = (id: string, i: number, shift: boolean) => {
    if (shift && last !== null) { const ids = pageRows.slice(Math.min(last, i), Math.max(last, i) + 1).map(rowKey); setSel([...new Set([...sel, ...ids])]) }
    else setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
    setLast(i)
  }
  const exportView = () => {
    const src = sel.length ? view.filter((r) => sel.includes(rowKey(r))) : view
    download(`${name}.csv`, csv([shown.map((c) => (typeof c.title === 'string' ? c.title : c.key)), ...src.map((r) => shown.map((c) => (c.text ?? c.sort ?? (() => ''))(r)))]))
    mutate(() => {}, { action: 'خروجی گرفتن', target: `${name} (${src.length} ردیف)` })
    toast(`خروجی ${fa(src.length)} ردیف ساخته شد. دادهٔ حساس در خروجی پوشیده است.`)
  }

  return (
    <div className={cx('overflow-hidden border border-line bg-surface', max ? 'fixed inset-2 z-50 flex flex-col rounded-2xl shadow-float md:inset-4' : 'rounded-2xl')} role={max ? 'dialog' : undefined} aria-label={max ? `${name} در حالت تمام‌صفحه` : undefined}>
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line p-2">
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search size={14} className="absolute top-2.5 right-2.5 text-t3" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="جست‌وجوی کد، نام یا هر متن" aria-label={`جست‌وجو در ${name}`} className="pr-8" />
        </div>
        {(dateKey || facets.length > 0) && <Button size="sm" variant={fOpen || active ? 'primary' : 'secondary'} icon={<Filter size={13} />} aria-expanded={fOpen} onClick={() => setFOpen(!fOpen)}>فیلتر{active ? ` (${fa(active)})` : ''}</Button>}
        {filters}
        <div className="relative mr-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" icon={max ? <Minimize2 size={14} /> : <Maximize2 size={14} />} onClick={() => { setMax(!max); setPage(0) }} title={max ? 'خروج از تمام‌صفحه (Esc)' : 'نمایش تمام‌صفحه'}><span className="hidden sm:inline">{max ? 'کوچک کردن' : 'تمام‌صفحه'}</span></Button>
          <Button variant="ghost" size="sm" icon={<Columns3 size={14} />} onClick={() => setColMenu(!colMenu)}><span className="hidden sm:inline">ستون‌ها</span></Button>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportView}><span className="hidden sm:inline">خروجی همین نما</span></Button>
          <Button variant="ghost" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}><span className="hidden sm:inline">چاپ</span></Button>
          {colMenu && (
            <div className="anim-pop absolute top-8 left-0 z-20 w-48 rounded-md border border-line bg-surface p-2 shadow-float">
              {cols.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-12 hover:bg-neutral-bg">
                  <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => setHidden(hidden.includes(c.key) ? hidden.filter((x) => x !== c.key) : [...hidden, c.key])} />{c.title}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {fOpen && (
        <div className="no-print space-y-3 border-b border-line bg-surface-2/60 p-3">
          {dateKey && <DateFilter r={dr} set={(p) => { setDr({ ...dr, ...p }); setPage(0) }} count={view.length} total={rows.length} noun="مورد" />}
          {facets.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-12 font-semibold text-t2">فیلتر ستون‌ها:</span>{facets.map(({ c, uniq, numeric }) => uniq.length ? <FacetPick key={c.key} title={c.title} values={uniq} sel={vals[c.key] ?? []} onChange={(v) => { setVals({ ...vals, [c.key]: v }); setPage(0) }} /> : numeric ? <RangePick key={c.key} title={c.title} v={nums[c.key] ?? ['', '']} onChange={(v) => { setNums({ ...nums, [c.key]: v }); setPage(0) }} /> : null)}</div>}
        </div>
      )}
      {(active > 0 || q) && <div className="no-print flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2 text-11">
        <span className="text-t2">{fa(view.length)} از {fa(rows.length)}:</span>
        {q && <Badge dot={false}>متن: {q}</Badge>}
        {dateKey && rangeActive(dr) && <Badge tone="brand" dot={false}>{rangeLabel(dr)}</Badge>}
        {Object.entries(vals).filter(([, v]) => v.length).map(([k, v]) => <Badge key={k} tone="brand" dot={false}>{v.length > 2 ? `${v.slice(0, 2).join('، ')} و ${fa(v.length - 2)} مورد دیگر` : v.join('، ')}</Badge>)}
        {Object.entries(nums).filter(([, [a, b]]) => a || b).map(([k, [a, b]]) => <Badge key={k} tone="brand" dot={false}>{a || '…'} تا {b || '…'}</Badge>)}
        <button type="button" onClick={clearAll} className="flex items-center gap-0.5 text-danger hover:underline"><X size={11} />پاک کردن همه</button>
      </div>}

      {view.length === 0 ? (
        rows.length === 0 ? <EmptyState {...empty} /> : (
          <EmptyState icon={<SearchX size={22} />} title="چیزی پیدا نشد." desc="با این جست‌وجو یا فیلتر موردی نیست." action={<Button onClick={clearAll}>برداشتن فیلترها</Button>} />
        )
      ) : (
        <>
          {/* دسکتاپ و iPad */}
          <div className={cx('hidden overflow-x-auto md:block', max && 'min-h-0 flex-1 overflow-y-auto')}>
            <table className="gh-table w-full text-13">
              <thead>
                <tr className={cx('text-12', max && 'sticky top-0 z-10')}>
                  {bulk && <th className="w-9 px-3"><input type="checkbox" aria-label="انتخاب همه" checked={pageRows.every((r) => sel.includes(rowKey(r)))} onChange={(e) => setSel(e.target.checked ? pageRows.map(rowKey) : [])} /></th>}
                  {shown.map((c) => (
                    <th key={c.key} className={cx('h-10 px-3 whitespace-nowrap', c.align === 'left' ? 'text-left' : 'text-right')}>
                      <button type="button" className={cx('group/th inline-flex items-center gap-1 hover:text-t1', sort?.key === c.key && 'text-brand')} title="مرتب‌سازی" onClick={() => setSort(sort?.key === c.key ? (sort.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                        {c.title}{sort?.key === c.key ? (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} className="opacity-0 transition-opacity group-hover/th:opacity-60" />}
                      </button>
                    </th>
                  ))}
                  {actions && <th className="sticky left-0 h-10 w-12 px-2"><span className="sr-only">اقدام‌ها</span></th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => { const id = rowKey(r); return (
                  <tr key={id} tabIndex={0} aria-selected={sel.includes(id)} onClick={() => rowClick(r)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) rowClick(r) }} className={cx('cursor-pointer', flashId === id && 'row-flash')} style={{ height: 'var(--row-h)' }}>
                    {bulk && <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="انتخاب ردیف" checked={sel.includes(id)} onChange={() => {}} onClick={(e) => toggle(id, i, e.shiftKey)} /></td>}
                    {shown.map((c) => <td key={c.key} className={cx('px-3', c.wrap ? 'min-w-48' : 'whitespace-nowrap', c.align === 'left' && 'tnum text-left')}>{linky(c.render(r))}</td>)}
                    {actions && <td className="sticky left-0 px-2" onClick={(e) => e.stopPropagation()}><RowMenu items={actions(r)} /></td>}
                  </tr>
                ) })}
              </tbody>
            </table>
          </div>
          {/* موبایل: فهرست کارتی (بخش ۵.۸) */}
          <ul className="gh-list divide-y divide-line md:hidden">
            {pageRows.map((r) => (
              <li key={rowKey(r)} onClick={() => rowClick(r)} className="relative cursor-pointer flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 active:bg-surface-2">
                {shown.filter((c) => !c.hideMobile).slice(0, 5).map((c, i) => <div key={c.key} className={cx(i === 0 && 'w-full font-medium', i === 0 && actions && 'pl-9', i > 0 && 'text-12 text-t2')}>{linky(c.render(r))}</div>)}
                {actions && <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}><RowMenu items={actions(r)} /></div>}
              </li>
            ))}
          </ul>
          <div className="no-print flex items-center justify-between border-t border-line px-3 py-2 text-12 text-t2">
            <span>{fa(view.length)} مورد{sel.length > 0 && ` · ${fa(sel.length)} انتخاب‌شده`}</span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>قبلی</Button>
                <span className="tnum">{fa(page + 1)} از {fa(pages)}</span>
                <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>بعدی</Button>
              </div>
            )}
          </div>
        </>
      )}
      <Drawer open={!!peek} onClose={() => setPeek(null)} title={`جزئیات ${name}`} footer={peek && actions ? <div className="flex flex-wrap gap-2">{actions(peek).flatMap((a) => (a === 'sep' ? [] : [a])).slice(0, 4).map((a, i) => <button key={i} onClick={() => { setPeek(null); a.onClick() }} className={cx('btn inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-13 font-medium', a.danger ? 'border-transparent bg-danger-bg text-danger' : 'border-line bg-surface hover:bg-surface-2')}>{a.icon}{a.label}</button>)}</div> : undefined}>
        {peek && <dl className="divide-y divide-line">{cols.map((c) => <div key={c.key} className="flex items-start justify-between gap-4 py-2.5 text-13"><dt className="shrink-0 text-t2">{c.title}</dt><dd className="min-w-0 text-left font-medium">{c.render(peek)}</dd></div>)}</dl>}
      </Drawer>
      {/* نوار اقدام گروهی شناور */}
      {bulk && sel.length > 0 && (
        <div className="no-print anim-pop fixed inset-x-0 bottom-20 z-30 mx-auto flex w-fit max-w-[92vw] flex-wrap items-center gap-2 rounded-lg bg-[#10123d] px-3 py-2 text-white shadow-float md:bottom-6">
          <span className="text-12">{fa(sel.length)} مورد انتخاب شد</span>
          {bulk(sel, () => setSel([]))}
          <button className="text-12 text-white/70 hover:text-white" onClick={() => setSel([])}>لغو انتخاب</button>
        </div>
      )}
    </div>
  )
}

/** قانون «همه‌چیز قابل کلیک»: متن سادهٔ هر سلول اگر سفارش، مشتری، کالا، واحد یا همکار باشد، نمای سریع باز می‌کند */
function linky(x: ReactNode): ReactNode { return typeof x === 'string' || typeof x === 'number' ? <QuickText v={String(x)}>{x}</QuickText> : x }

/** فیلتر کشویی یک ستون: جست‌وجو، شمارش هر مقدار، مرتب بر اساس تکرار؛ با هزاران مقدار هم فقط ۴۰ مورد اول نمایش داده می‌شود */
function FacetPick({ title, values, sel, onChange }: { title: ReactNode; values: [string, number][]; sel: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState('')
  const hit = q ? values.filter(([v]) => latin(v.toLowerCase()).includes(latin(q.toLowerCase()))) : values
  const shown = hit.slice(0, 40)
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cx('flex h-8 items-center gap-1.5 rounded-full border px-3 text-12', sel.length ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-surface hover:border-brand/50')}>{title}{sel.length > 0 && <span className="rounded-full bg-brand-solid px-1.5 text-[10px] text-white">{fa(sel.length)}</span>}<ArrowDown size={11} /></button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="anim-pop absolute top-9 right-0 z-40 w-72 rounded-xl border border-line bg-surface p-2 shadow-float">
          <div className="relative mb-2"><Search size={13} className="absolute top-2.5 right-2.5 text-t3" /><Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`جست‌وجو در ${fa(values.length)} مقدار`} className="h-9 pr-8 text-12" /></div>
          <ul className="max-h-64 overflow-y-auto">{shown.map(([v, n]) => { const on = sel.includes(v); return <li key={v}><label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-12 hover:bg-neutral-bg"><input type="checkbox" className="accent-[#0000ff]" checked={on} onChange={() => onChange(on ? sel.filter((x) => x !== v) : [...sel, v])} /><span className="min-w-0 flex-1 truncate">{v}</span><span className="tnum text-11 text-t3">{fa(n)}</span></label></li> })}{hit.length === 0 && <li className="px-2 py-3 text-center text-12 text-t2">موردی پیدا نشد.</li>}</ul>
          {hit.length > shown.length && <p className="px-2 pt-1 text-11 text-t2">{fa(hit.length - shown.length)} مقدار دیگر؛ برای پیدا کردن جست‌وجو کنید.</p>}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-12"><button type="button" className="text-brand hover:underline" onClick={() => onChange([...new Set([...sel, ...hit.map(([v]) => v)])])}>انتخاب {q ? 'نتایج' : 'همه'}</button><button type="button" className="text-t2 hover:text-danger" onClick={() => onChange([])}>پاک کردن</button></div>
        </div>
      </>}
    </div>
  )
}

/** فیلتر بازهٔ عددی (مبلغ، تعداد، درصد) در یک کشو */
function RangePick({ title, v, onChange }: { title: ReactNode; v: [string, string]; onChange: (v: [string, string]) => void }) {
  const [open, setOpen] = useState(false); const on = !!(v[0] || v[1])
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cx('flex h-8 items-center gap-1.5 rounded-full border px-3 text-12', on ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-surface hover:border-brand/50')}>{title}{on && <span className="text-[10px]">{v[0] || '…'} تا {v[1] || '…'}</span>}<ArrowDown size={11} /></button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="anim-pop absolute top-9 right-0 z-40 w-64 rounded-xl border border-line bg-surface p-3 shadow-float">
          <div className="flex items-center gap-1.5 text-12">از <Input autoFocus className="h-8" inputMode="numeric" value={v[0]} onChange={(e) => onChange([e.target.value, v[1]])} aria-label="حداقل" /> تا <Input className="h-8" inputMode="numeric" value={v[1]} onChange={(e) => onChange([v[0], e.target.value])} aria-label="حداکثر" /></div>
          <button type="button" className="mt-2 text-12 text-t2 hover:text-danger" onClick={() => onChange(['', ''])}>پاک کردن</button>
        </div>
      </>}
    </div>
  )
}
