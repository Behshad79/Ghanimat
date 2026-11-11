import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Columns3, Download, Printer, Search, SearchX } from 'lucide-react'
import { Button, cx, EmptyState, Input } from './base'
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
}
/** جدول داده: جست‌وجو، مرتب‌سازی، انتخاب گروهی (Shift برای بازه)، انتخاب ستون، خروجی همین نما، چاپ، کارت موبایل */
export function DataTable<R>({ rows, cols, rowKey, name, onRow, search, filters, bulk, empty, pageSize = 12, flashId, actions }: Props<R>) {
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

  const view = useMemo(() => {
    let v = q && search ? rows.filter((r) => search(r).toLowerCase().includes(q.toLowerCase())) : rows
    if (sort) { const c = cols.find((x) => x.key === sort.key); if (c?.sort) v = [...v].sort((a, b) => (c.sort!(a) > c.sort!(b) ? 1 : -1) * sort.dir) }
    return v
  }, [rows, q, sort, cols, search])
  const shown = cols.filter((c) => !hidden.includes(c.key))
  const pages = Math.ceil(view.length / pageSize)
  const pageRows = view.slice(page * pageSize, page * pageSize + pageSize)
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line p-2">
        {search && (
          <div className="relative min-w-40 flex-1 sm:max-w-xs">
            <Search size={14} className="absolute top-2.5 right-2.5 text-t3" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="جست‌وجو در همین فهرست" className="pr-8" />
          </div>
        )}
        {filters}
        <div className="relative mr-auto flex items-center gap-1">
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

      {view.length === 0 ? (
        rows.length === 0 ? <EmptyState {...empty} /> : (
          <EmptyState icon={<SearchX size={22} />} title="چیزی پیدا نشد." desc="با این جست‌وجو یا فیلتر موردی نیست." action={<Button onClick={() => setQ('')}>برداشتن فیلترها</Button>} />
        )
      ) : (
        <>
          {/* دسکتاپ و iPad */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-13">
              <thead>
                <tr className="sticky top-0 bg-surface-2 text-12 text-t2">
                  {bulk && <th className="w-9 border-b border-line px-3"><input type="checkbox" aria-label="انتخاب همه" checked={pageRows.every((r) => sel.includes(rowKey(r)))} onChange={(e) => setSel(e.target.checked ? pageRows.map(rowKey) : [])} /></th>}
                  {shown.map((c) => (
                    <th key={c.key} className={cx('h-9 border-b border-line px-3 font-medium whitespace-nowrap', c.align === 'left' ? 'text-left' : 'text-right')}>
                      {c.sort ? (
                        <button className="inline-flex items-center gap-1 hover:text-t1" onClick={() => setSort(sort?.key === c.key ? (sort.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                          {c.title}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      ) : c.title}
                    </th>
                  ))}
                  {actions && <th className="sticky left-0 h-9 w-12 border-b border-line bg-surface-2 px-2"><span className="sr-only">اقدام‌ها</span></th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => { const id = rowKey(r); return (
                  <tr key={id} onClick={() => rowClick(r)} className={cx('border-b border-line last:border-0 transition-colors', 'cursor-pointer hover:bg-surface-2', sel.includes(id) && 'bg-brand-tint/60', flashId === id && 'row-flash')} style={{ height: 'var(--row-h)' }}>
                    {bulk && <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="انتخاب ردیف" checked={sel.includes(id)} onChange={() => {}} onClick={(e) => toggle(id, i, e.shiftKey)} /></td>}
                    {shown.map((c) => <td key={c.key} className={cx('px-3', c.wrap ? 'min-w-48' : 'whitespace-nowrap', c.align === 'left' && 'tnum text-left')}>{c.render(r)}</td>)}
                    {actions && <td className="sticky left-0 bg-surface px-2" onClick={(e) => e.stopPropagation()}><RowMenu items={actions(r)} /></td>}
                  </tr>
                ) })}
              </tbody>
            </table>
          </div>
          {/* موبایل: فهرست کارتی (بخش ۵.۸) */}
          <ul className="divide-y divide-line md:hidden">
            {pageRows.map((r) => (
              <li key={rowKey(r)} onClick={() => rowClick(r)} className="relative cursor-pointer flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 active:bg-surface-2">
                {shown.filter((c) => !c.hideMobile).slice(0, 5).map((c, i) => <div key={c.key} className={cx(i === 0 && 'w-full font-medium', i === 0 && actions && 'pl-9', i > 0 && 'text-12 text-t2')}>{c.render(r)}</div>)}
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
