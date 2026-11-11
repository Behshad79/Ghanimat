import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Heart, LayoutGrid, List, MoreHorizontal, Pencil, RotateCcw, Search, SlidersHorizontal, Sparkles, Star, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Input, Select, StatusBadge, Toggle } from '@/shared/ui/base'
import { Area, SegGauge } from '@/shared/ui/charts'
import { RowMenu, type MenuItem } from '@/shared/ui/menu'
import { askCopilot, Drawer } from '@/shared/ui/overlay'
import { mutate } from '@/shared/lib/store'
import { compactToman, fa, num, pct } from '@/shared/lib/fa'
import type { Product } from '@/shared/data/seed'
import { CONDITION } from '@/shared/data/statuses'
import { ProductImg, useLookup } from '../pages/_shared'
import { stockOf } from './Catalog'

const COLORS = ['#0000ff', '#ffc24b', '#12a150', '#c42f2f', '#7c3aed', '#0ea5e9', '#f97316']
type F = { q: string; cats: string[]; brands: string[]; conds: string[]; min: string; max: string; st: string; chip: string; sort: string }
const EMPTY: F = { q: '', cats: [], brands: [], conds: [], min: '', max: '', st: 'all', chip: 'all', sort: 'views' }

/** سربرگ تحلیلی کاتالوگ: درآمد محصولات، کالای برتر، سهم دسته‌ها و تحلیل AI */
export function CatalogInsights() {
  const { d } = useLookup(); const nav = useNavigate()
  const sold = useMemo(() => { const m: Record<string, number> = {}; d.orders.filter((o) => !['order.cancelled'].includes(o.status)).forEach((o) => o.shipments.forEach((s) => s.items.forEach((i) => { m[i.productId] = (m[i.productId] ?? 0) + i.price * i.qty }))); return m }, [d.orders])
  const total = Object.values(sold).reduce((a, b) => a + b, 0)
  const ranked = d.products.map((p) => ({ p, v: sold[p.id] ?? 0 })).sort((a, b) => b.v - a.v)
  const cats = Object.entries(d.products.reduce<Record<string, number>>((m, p) => { m[p.category] = (m[p.category] ?? 0) + (sold[p.id] ?? 0) + p.views * 1000; return m }, {})).sort((a, b) => b[1] - a[1])
  const top4 = cats.slice(0, 3); const rest = cats.slice(3).reduce((a, [, v]) => a + v, 0)
  const trend = [42, 48, 45, 53, 51, 58, 62, 60, 67, 71, 69, 78].map((v) => v * (total / 780 || 1e6))
  const months = ['آذر', 'دی', 'بهمن', 'اسفند', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان']
  const lead = ranked[0]; const shareMax = Math.max(1, ...ranked.slice(0, 4).map((r) => r.v))
  return (
    <div className="stagger grid gap-3 lg:grid-cols-3">
      <Card title="درآمد محصولات" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/finance?tab=profit')}>سود من</Button>}>
        <div className="flex items-baseline gap-2"><p className="tnum text-22 font-bold">{compactToman(total)}</p><span className="inline-flex items-center gap-0.5 rounded-full bg-success-bg px-2 py-0.5 text-11 text-success"><ArrowUpRight size={12} />{pct(8.4)}</span></div>
        <div className="mt-2"><Area data={trend} labels={months} h={110} fmt={compactToman} /></div>
      </Card>
      <Card title="کالای برتر" actions={lead && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/catalog/${lead.p.id}`)}>جزئیات</Button>}>
        {lead && <div className="flex items-center gap-3"><ProductImg pid={lead.p.id} size={56} rounded="rounded-xl" /><div className="min-w-0"><p className="truncate text-13 font-bold">{lead.p.title}</p><p className="tnum text-12 text-t2">{compactToman(lead.v)} فروش · {fa(lead.p.views)} بازدید</p></div></div>}
        <div className="mt-4 space-y-2.5">{ranked.slice(0, 4).map((r, i) => <button key={r.p.id} onClick={() => nav(`/admin/catalog/${r.p.id}`)} className="block w-full text-right"><div className="mb-1 flex items-center justify-between text-11"><span className="truncate">{r.p.en}</span><span className="tnum text-t2">{compactToman(r.v)}</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-bg"><div className="bar-grow-x h-full rounded-full" style={{ width: `${Math.max(3, (r.v / shareMax) * 100)}%`, background: i === 0 ? 'var(--brand-solid)' : 'var(--brand-tint-strong, #c7ccff)', animationDelay: `${i * 60}ms` }} /></div></button>)}</div>
      </Card>
      <Card title="سهم دسته‌ها" actions={<Button size="sm" variant="ghost" icon={<Sparkles size={13} />} onClick={() => askCopilot('کدام دسته‌ها رشد کرده‌اند و کدام کالاها نیاز به تأمین دارند؟')}>تحلیل AI</Button>}>
        <SegGauge sub="دسته‌ها" center={fa(cats.length)} data={[...top4.map(([l, v], i) => ({ label: l, value: v, color: COLORS[i] })), ...(rest ? [{ label: 'سایر', value: rest, color: '#9aa0b8' }] : [])]} />
      </Card>
    </div>
  )
}

const Check = ({ on, label, count, onChange }: { on: boolean; label: string; count?: number; onChange: () => void }) => (
  <label className="flex min-h-8 cursor-pointer items-center gap-2 text-13">
    <input type="checkbox" checked={on} onChange={onChange} className="size-4 accent-[var(--brand-solid)]" /><span className="flex-1">{label}</span>{count !== undefined && <span className="tnum text-11 text-t3">{fa(count)}</span>}
  </label>
)

/** نمای شبکه‌ای محصولات با ستون فیلتر؛ هر کارت کلید فعال/غیرفعال، ویرایش و حذف دارد. */
export function ProductBoard({ items, onAdd }: { items: (p: Product) => MenuItem[]; onAdd: () => void }) {
  const { d } = useLookup(); const nav = useNavigate()
  const [f, setF] = useState<F>(EMPTY); const [view, setView] = useState<'grid' | 'list'>('grid'); const [mobF, setMobF] = useState(false)
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }))
  const tog = (k: 'cats' | 'brands' | 'conds', v: string) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }))
  const priceOf = (p: Product) => d.units.find((u) => u.productId === p.id && u.status === 'unit.published')?.price ?? p.price ?? p.priceNew
  const condsOf = (p: Product) => p.mode === 'qty' ? ['sealed'] : [...new Set(d.units.filter((u) => u.productId === p.id).map((u) => u.condition))]
  const rows = d.products.filter((p) => {
    if (f.q && !`${p.title} ${p.en} ${p.code} ${p.brand}`.toLowerCase().includes(f.q.toLowerCase())) return false
    if (f.cats.length && !f.cats.includes(p.category)) return false
    if (f.brands.length && !f.brands.includes(p.brand)) return false
    if (f.conds.length && !condsOf(p).some((c) => f.conds.includes(c))) return false
    const pr = priceOf(p); if (f.min && pr < +f.min * 1e6) return false; if (f.max && pr > +f.max * 1e6) return false
    if (f.st !== 'all' && p.status !== f.st) return false
    if (f.chip === 'out' && stockOf(d, p) > 0) return false
    if (f.chip === 'fast' && !p.fastEligible) return false
    if (f.chip === 'featured' && !p.featured) return false
    if (f.chip === 'weak' && p.health >= 70) return false
    return true
  }).sort((a, b) => f.sort === 'price' ? priceOf(a) - priceOf(b) : f.sort === 'stock' ? stockOf(d, a) - stockOf(d, b) : f.sort === 'health' ? a.health - b.health : b.views - a.views)
  const count = (pred: (p: Product) => boolean) => d.products.filter(pred).length
  const active = f.cats.length + f.brands.length + f.conds.length + (f.min ? 1 : 0) + (f.max ? 1 : 0) + (f.st !== 'all' ? 1 : 0)
  const toggle = (p: Product) => mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; t.status = p.status === 'product.published' ? 'product.draft' : 'product.published' }, { action: p.status === 'product.published' ? 'غیرفعال‌سازی کالا' : 'فعال‌سازی کالا', target: p.title })
  const fav = (p: Product) => mutate((x) => { const t = x.products.find((y) => y.id === p.id)!; t.featured = !t.featured }, { action: p.featured ? 'برداشتن از کالاهای ویژه' : 'افزودن به کالاهای ویژه', target: p.title })
  const cats = [...new Set(d.products.map((p) => p.category))]; const brands = [...new Set(d.products.map((p) => p.brand))]

  const filters = (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-14 font-semibold"><SlidersHorizontal size={15} />فیلترها{active > 0 && <Badge tone="brand" dot={false}>{fa(active)}</Badge>}</p><button disabled={!active} onClick={() => setF({ ...EMPTY, q: f.q, chip: f.chip, sort: f.sort })} className="flex items-center gap-1 text-12 text-brand disabled:text-t3"><RotateCcw size={12} />پاک کردن</button></div>
      <div><p className="mb-1 text-12 font-semibold text-t2">دسته</p>{cats.map((c) => <Check key={c} label={c} on={f.cats.includes(c)} count={count((p) => p.category === c)} onChange={() => tog('cats', c)} />)}</div>
      <div><p className="mb-1 text-12 font-semibold text-t2">بازهٔ قیمت (میلیون تومان)</p><div className="flex items-center gap-2"><Input aria-label="از" placeholder="از" inputMode="numeric" className="h-9" value={f.min} onChange={(e) => set({ min: e.target.value.replace(/\D/g, '') })} /><span className="text-t3">تا</span><Input aria-label="تا" placeholder="تا" inputMode="numeric" className="h-9" value={f.max} onChange={(e) => set({ max: e.target.value.replace(/\D/g, '') })} /></div>
        <div className="mt-2 flex flex-wrap gap-1">{[['', '10', 'زیر ۱۰'], ['10', '50', '۱۰ تا ۵۰'], ['50', '', 'بالای ۵۰']].map(([a, b, l]) => <button key={l} onClick={() => set({ min: a, max: b })} className={cx('rounded-full border px-2 py-0.5 text-11', f.min === a && f.max === b ? 'border-brand bg-brand-tint text-brand' : 'border-line text-t2')}>{l}</button>)}</div></div>
      <div><p className="mb-1 text-12 font-semibold text-t2">وضعیت کالا</p>{Object.entries(CONDITION).map(([k, l]) => <Check key={k} label={l} on={f.conds.includes(k)} count={count((p) => condsOf(p).includes(k))} onChange={() => tog('conds', k)} />)}</div>
      <div><p className="mb-1 text-12 font-semibold text-t2">برند</p>{brands.map((b) => <Check key={b} label={b} on={f.brands.includes(b)} count={count((p) => p.brand === b)} onChange={() => tog('brands', b)} />)}</div>
      <div><p className="mb-1 text-12 font-semibold text-t2">وضعیت انتشار</p><Select value={f.st} onChange={(v) => set({ st: v })} options={[['all', 'همه'], ['product.published', 'فعال در سایت'], ['product.draft', 'غیرفعال / پیش‌نویس'], ['product.pending', 'منتظر تأیید']]} /></div>
    </div>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="hidden h-fit lg:sticky lg:top-20 lg:block">{filters}</Card>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1"><Search size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input aria-label="جست‌وجو" className="h-10 pr-9" placeholder="نام، کد GH-P، برند…" value={f.q} onChange={(e) => set({ q: e.target.value })} /></div>
          <Button className="lg:hidden" icon={<SlidersHorizontal size={14} />} onClick={() => setMobF(true)}>فیلترها{active > 0 && ` (${fa(active)})`}</Button>
          <Select className="w-40" value={f.sort} onChange={(v) => set({ sort: v })} options={[['views', 'پربازدیدترین'], ['price', 'ارزان‌ترین'], ['stock', 'کمترین موجودی'], ['health', 'ضعیف‌ترین محتوا']]} />
          <div className="flex rounded-xl border border-line p-0.5">{([['grid', <LayoutGrid key="g" size={15} />, 'شبکه‌ای'], ['list', <List key="l" size={15} />, 'فهرستی']] as const).map(([k, ic, l]) => <button key={k} aria-label={l} title={l} onClick={() => setView(k)} className={cx('flex h-8 items-center gap-1 rounded-lg px-2.5 text-12', view === k ? 'bg-brand-solid text-white' : 'text-t2')}>{ic}<span className="hidden sm:inline">{l}</span></button>)}</div>
        </div>
        <div className="scroll-fade flex gap-1.5 overflow-x-auto">{[['all', 'همه', d.products.length], ['featured', 'ویژه', count((p) => !!p.featured)], ['fast', 'تحویل سریع', count((p) => p.fastEligible)], ['out', 'ناموجود', count((p) => stockOf(d, p) === 0)], ['weak', 'محتوای ضعیف', count((p) => p.health < 70)]].map(([k, l, n]) => <button key={k} onClick={() => set({ chip: k as string })} className={cx('flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-12 transition-colors', f.chip === k ? 'border-transparent bg-brand-solid text-white' : 'border-line bg-surface text-t2 hover:border-brand/50')}>{l}<span className={cx('tnum rounded-full px-1.5 text-11', f.chip === k ? 'bg-white/20' : 'bg-neutral-bg')}>{fa(n as number)}</span></button>)}</div>
        <p className="text-12 text-t2"><b className="tnum text-t1">{fa(rows.length)}</b> کالا{active > 0 && ' با فیلترهای فعلی'}</p>
        {rows.length === 0 ? <Card><EmptyState title="کالایی با این فیلترها نیست." desc="فیلترها را کمتر کنید یا کالای تازه ثبت کنید." action={<div className="flex gap-2"><Button onClick={() => setF(EMPTY)}>پاک کردن فیلترها</Button><Button variant="primary" onClick={onAdd}>افزودن کالا</Button></div>} /></Card>
          : view === 'grid' ? <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">{rows.map((p) => { const on = p.status === 'product.published'; const n = stockOf(d, p); return (
            <article key={p.id} className="lift group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative aspect-[4/3] cursor-pointer bg-white" onClick={() => nav(`/admin/catalog/${p.id}`)}>
                {p.image ? <img src={p.image} alt={p.title} loading="lazy" style={{ objectPosition: p.imagePos ?? '50% 50%' }} className={cx('absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]', !on && 'opacity-60 grayscale')} /> : <div className="absolute inset-0 grid place-items-center"><ProductImg pid={p.id} size={72} className="border-0" /></div>}
                <div className="absolute inset-x-2 top-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/90 py-1 pr-1 pl-2.5 text-11 font-medium text-[#10123d] shadow-sm backdrop-blur"><Toggle on={on} onChange={() => toggle(p)} label={on ? 'غیرفعال کردن' : 'فعال کردن'} disabled={p.status === 'product.pending'} />{on ? 'فعال' : p.status === 'product.pending' ? 'منتظر تأیید' : 'غیرفعال'}</span>
                  <button aria-label={p.featured ? 'برداشتن از ویژه' : 'ویژه کردن'} title={p.featured ? 'برداشتن از ویژه' : 'ویژه کردن (نمایش در صفحهٔ خانه)'} onClick={() => fav(p)} className="grid size-8 place-items-center rounded-full bg-white/90 shadow-sm"><Heart size={15} className={p.featured ? 'fill-[#c42f2f] text-[#c42f2f]' : 'text-[#5a5e78]'} /></button>
                </div>
                {n === 0 && <span className="absolute bottom-2 right-2 rounded-md bg-[#10123d] px-2 py-0.5 text-11 text-white">ناموجود</span>}
                {n > 0 && n <= 2 && <span className="absolute bottom-2 right-2 rounded-md bg-warning-bg px-2 py-0.5 text-11 font-medium text-warning">{fa(n)} عدد مانده</span>}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <div className="flex items-center gap-1.5 text-11 text-t2"><span>{p.brand}</span>{p.views > 1500 && <Badge tone="success" dot={false}>پربازدید</Badge>}{p.rating > 0 && <span className="tnum mr-auto flex items-center gap-0.5"><Star size={11} className="fill-[#ffc24b] text-[#ffc24b]" />{fa(p.rating)}</span>}</div>
                <button onClick={() => nav(`/admin/catalog/${p.id}`)} className="line-clamp-2 min-h-10 text-right text-13 font-bold leading-5 hover:text-brand">{p.title}</button>
                <p className="ltr text-right font-mono text-11 text-t2">{p.code}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                  <div><p className="text-11 text-t2">قیمت · موجودی {fa(n)}</p><p className="tnum text-14 font-bold">{num(priceOf(p))}<span className="mr-1 text-11 font-normal text-t2">تومان</span></p></div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" icon={<Pencil size={12} />} onClick={() => nav(`/admin/catalog/${p.id}/edit`)}>ویرایش</Button>
                    <RowMenu items={items(p)} label={`اقدام‌های ${p.title}`} trigger={<span className="grid size-7 place-items-center rounded-md border border-line text-t2 hover:text-brand"><MoreHorizontal size={14} /></span>} />
                  </div>
                </div>
              </div>
            </article>) })}</div>
          : <div className="space-y-2">{rows.map((p) => { const on = p.status === 'product.published'; return (
            <div key={p.id} className="lift flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pl-3">
              <button onClick={() => nav(`/admin/catalog/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-right"><ProductImg pid={p.id} size={52} rounded="rounded-xl" /><span className="min-w-0"><span className="block truncate text-13 font-bold">{p.title}</span><span className="block text-11 text-t2">{p.category} · {p.brand} · <span className="ltr font-mono">{p.code}</span></span></span></button>
              <span className="hidden w-28 text-left md:block"><b className="tnum text-13">{compactToman(priceOf(p))}</b><span className="block text-11 text-t2">موجودی {fa(stockOf(d, p))}</span></span>
              <span className="hidden sm:block"><StatusBadge s={p.status} /></span>
              <Toggle on={on} onChange={() => toggle(p)} label={on ? 'غیرفعال کردن' : 'فعال کردن'} disabled={p.status === 'product.pending'} />
              <Button size="sm" variant="ghost" aria-label="ویرایش" icon={<Pencil size={13} />} onClick={() => nav(`/admin/catalog/${p.id}/edit`)} />
              <Button size="sm" variant="ghost" aria-label="حذف" className="text-danger" icon={<Trash2 size={13} />} onClick={() => { const it = items(p).find((x): x is Exclude<MenuItem, 'sep'> => x !== 'sep' && !!x.danger); it?.onClick() }} />
              <RowMenu items={items(p)} label={`اقدام‌های ${p.title}`} />
            </div>) })}</div>}
      </div>
      <Drawer open={mobF} onClose={() => setMobF(false)} title="فیلترها" width={340} footer={<Button variant="primary" className="w-full" onClick={() => setMobF(false)}>نمایش {fa(rows.length)} کالا</Button>}>{filters}</Drawer>
    </div>
  )
}
