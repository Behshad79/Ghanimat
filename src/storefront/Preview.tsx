import { useEffect, useState, type ReactNode } from 'react'
import { BadgeCheck, ChevronDown, Heart, Menu, Phone, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Truck, UserRound, X } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { compactToman, fa } from '@/shared/lib/fa'
import type { Site } from '@/shared/data/site'
import { ProductCard } from '@/admin/catalog/ProductCard'

export type Region = 'announce' | 'header' | 'menu' | 'home' | 'card' | 'listing' | 'footer'
export const REGION_LABEL: Record<Region, string> = { announce: 'نوار اعلان', header: 'سربرگ', menu: 'منو', home: 'صفحهٔ خانه', card: 'کارت محصول', listing: 'فهرست محصولات', footer: 'فوتر' }

/** پیش‌نمایش سایت مشتری. هر ناحیه با کلیک، بخش ویرایش خودش را باز می‌کند. */
export function StorePreview({ site, device = 'desktop', page = 'home', active, onPick }: { site: Site; device?: 'desktop' | 'mobile'; page?: 'home' | 'listing'; active?: Region; onPick?: (r: Region) => void }) {
  const d = useDB()
  const thr = d.rules.find((r) => r.key === 'free_shipping_threshold')?.value ?? 0
  const mob = device === 'mobile'
  const fill = (t: string) => t.replace('{آستانه_ارسال_رایگان}', compactToman(thr))
  const ann = site.announce.items.filter((a) => a.on && a.text.trim())
  const [ai, setAi] = useState(0)
  useEffect(() => { if (ann.length < 2) return; const t = setInterval(() => setAi((x) => x + 1), site.announce.interval * 1000); return () => clearInterval(t) }, [ann.length, site.announce.interval])
  const [drawer, setDrawer] = useState(false); const [open, setOpen] = useState<string | null>(null)
  const prods = d.products.filter((p) => p.status === 'product.published')
  const blocks = [...(d.entities.homeBlocks ?? [])].filter((b) => b.active).sort((a, b) => a.order - b.order)
  const cols = mob ? site.card.colsMobile : site.card.colsDesktop
  const grid = (list: typeof prods) => <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{list.map((p) => <ProductCard key={p.id} p={p} cfg={site.card} mini={mob || cols > 4} fluid />)}</div>
  const annTone = site.announce.tone === 'ink' ? 'bg-[#10123d] text-white' : site.announce.tone === 'yellow' ? 'bg-[#ffc24b] text-[#10123d]' : 'bg-[#0000ff] text-white'

  const R = ({ id, children, className }: { id: Region; children: ReactNode; className?: string }) => (
    <div onClick={onPick ? (e) => { e.stopPropagation(); onPick(id) } : undefined}
      className={cx('relative', onPick && 'group/r cursor-pointer', className)}>
      {children}
      {onPick && <span className={cx('pointer-events-none absolute inset-0 z-10 rounded-sm outline-2 -outline-offset-2 transition-all', active === id ? 'outline outline-[#0000ff]' : 'outline-transparent group-hover/r:outline group-hover/r:outline-dashed group-hover/r:outline-[#0000ff]/60')} />}
      {onPick && <span className={cx('pointer-events-none absolute top-1 left-1 z-20 rounded-md bg-[#0000ff] px-1.5 py-0.5 text-[10px] font-medium text-white transition-opacity', active === id ? 'opacity-100' : 'opacity-0 group-hover/r:opacity-100')}>{active === id ? 'در حال ویرایش: ' : 'ویرایش '}{REGION_LABEL[id]}</span>}
    </div>
  )

  return (
    <div dir="rtl" className="overflow-hidden bg-[#f5f6fa] text-[#10123d]" style={{ fontSize: 13 }}>
      {site.announce.on && ann.length > 0 && <R id="announce"><div className={cx('relative h-8 overflow-hidden text-center text-12', annTone)}><p key={ai} className="rot-in absolute inset-0 flex items-center justify-center px-3">{fill(ann[ai % ann.length].text)}</p></div></R>}
      <R id="header"><div className="bg-white">
        {!mob && site.header.utility.length > 0 && <div className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-1.5 text-11 text-[#5a5e78]"><span className="flex gap-4">{site.header.utility.filter((u) => !u.hidden).map((u) => <span key={u.id}>{u.label}</span>)}</span>{site.header.showPhone && <span className="ltr flex items-center gap-1"><Phone size={11} />{site.header.phone}</span>}</div>}
        <div className="flex items-center gap-3 px-4 py-3">
          {mob && <button onClick={() => setDrawer(true)} aria-label="منو"><Menu size={20} /></button>}
          <img src={site.header.logo === 'mark' ? './brand/logo-mark.png' : './brand/logo-full.png'} alt="غنیمت" className={site.header.logo === 'mark' ? 'h-8' : 'h-7'} onError={(e) => ((e.currentTarget.src = './brand/logo-full.png'))} />
          {!mob && <div className="mx-4 flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#f2f3f7] px-3 text-12 text-[#5a5e78]"><Search size={15} />{site.header.search}</div>}
          <div className="mr-auto flex items-center gap-2">
            {!mob && <span className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e6e8f0] px-3 text-12 font-medium"><UserRound size={15} />{site.header.login}</span>}
            {site.header.showWishlist && <span className="grid size-9 place-items-center rounded-xl border border-[#e6e8f0]"><Heart size={16} /></span>}
            <span className="relative grid size-9 place-items-center rounded-xl bg-[#0000ff] text-white"><ShoppingCart size={16} /><span className="absolute -top-1 -left-1 grid size-4 place-items-center rounded-full bg-[#c42f2f] text-[10px]">{fa(2)}</span></span>
          </div>
        </div>
        {mob && <div className="px-4 pb-3"><div className="flex h-10 items-center gap-2 rounded-xl bg-[#f2f3f7] px-3 text-12 text-[#5a5e78]"><Search size={15} />{site.header.search}</div></div>}
      </div></R>
      {!mob && <R id="menu"><nav className="relative flex items-center gap-1 overflow-x-auto border-t border-[#eef0f6] bg-white px-4 text-13 whitespace-nowrap [scrollbar-width:none]">
        {site.menu.filter((m) => !m.hidden).map((m) => (
          <div key={m.id} className="relative" onMouseEnter={() => setOpen(m.id)} onMouseLeave={() => setOpen(null)}>
            <span className={cx('flex h-11 items-center gap-1 px-2.5 font-medium', open === m.id && 'text-[#0000ff]')}>{m.label}{m.badge && <span className="rounded-md bg-[#fdecec] px-1 text-[10px] font-bold text-[#c42f2f]">{m.badge}</span>}{(m.children?.length ?? 0) > 0 && <ChevronDown size={13} />}</span>
            {open === m.id && (m.children?.length ?? 0) > 0 && <div className="absolute top-full right-0 z-30 min-w-44 rounded-xl border border-[#e6e8f0] bg-white p-2 shadow-float">{m.children!.filter((c) => !c.hidden).map((c) => <p key={c.id} className="rounded-lg px-3 py-2 text-12 hover:bg-[#f2f3f7]">{c.label}</p>)}</div>}
          </div>))}
      </nav></R>}
      {mob && drawer && <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDrawer(false)}><div className="h-full w-64 bg-white p-4" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><b>دسته‌بندی‌ها</b><button onClick={() => setDrawer(false)} aria-label="بستن"><X size={18} /></button></div>{site.menu.filter((m) => !m.hidden).map((m) => <div key={m.id} className="border-b border-[#eef0f6] py-2"><p className="font-medium">{m.label}</p>{m.children?.filter((c) => !c.hidden).map((c) => <p key={c.id} className="pr-3 pt-1 text-12 text-[#5a5e78]">{c.label}</p>)}</div>)}</div></div>}

      {page === 'home' ? <R id="home"><div className="space-y-4 p-4">
        {blocks.map((b) => {
          if (b.kind === 'هیرو') return <div key={b.id} className="relative overflow-hidden rounded-2xl bg-[#10123d] p-6 text-white"><span className="absolute -left-10 -top-10 size-40 rounded-full bg-[#0000ff]/50 blur-2xl" /><p className="relative text-11 text-[#ffc24b]">کالای اصل وارداتی</p><p className={cx('relative mt-1 font-bold', mob ? 'text-16' : 'text-22')}>{b.title}</p><span className="relative mt-3 inline-flex h-9 items-center rounded-xl bg-[#0000ff] px-4 text-12 font-medium">مشاهدهٔ کالاها</span></div>
          if (b.kind === 'ردیف دسته‌ها') return <div key={b.id}><p className="mb-2 font-bold">{b.title}</p><div className="flex gap-2 overflow-x-auto">{(d.entities.categories ?? []).filter((c) => c.active).map((c) => <span key={c.id} className="shrink-0 rounded-xl bg-white px-3 py-2 text-12 font-medium shadow-sm">{c.name}</span>)}</div></div>
          if (b.kind?.includes('کاروسل')) return <div key={b.id}><div className="mb-2 flex items-center justify-between"><p className="font-bold">{b.title}</p><span className="text-12 text-[#0000ff]">مشاهدهٔ همه</span></div><R id="card">{grid(prods.slice(0, cols))}</R></div>
          if (b.kind === 'بنر') return <div key={b.id} className="rounded-2xl bg-[#ffc24b] p-5 font-bold">{b.title}</div>
          return <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-white p-4"><span className="grid size-10 place-items-center rounded-full bg-[#eef0ff] text-[#0000ff]"><ShieldCheck size={18} /></span><div><p className="font-bold">{b.title}</p><p className="text-12 text-[#5a5e78]">QC ورودی و پیش از ارسال؛ عکس همان واحدی که می‌خرید.</p></div></div>
        })}
      </div></R> : <R id="listing"><div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">{site.listing.chips.filter((c) => c.on).map((c, i) => <span key={c.id} className={cx('rounded-full px-3 py-1 text-12', i === 0 ? 'bg-[#0000ff] text-white' : 'bg-white')}>{c.label}</span>)}<span className="mr-auto text-12 text-[#5a5e78]">{fa(prods.length)} کالا</span></div>
        <div className={cx('grid gap-4', site.listing.showFilters && !mob && 'grid-cols-[180px_1fr]')}>
          {site.listing.showFilters && (mob ? <span className="flex h-9 w-fit items-center gap-1.5 rounded-xl border border-[#e6e8f0] bg-white px-3 text-12"><SlidersHorizontal size={14} />فیلترها</span> : <aside className="h-fit space-y-2 rounded-2xl bg-white p-3 text-12">{site.listing.filters.filter((f) => f.on).map((f) => <p key={f.id} className="flex items-center justify-between border-b border-[#eef0f6] pb-2 last:border-0">{f.label}<ChevronDown size={13} /></p>)}</aside>)}
          {site.listing.view === 'list' ? <div className="space-y-2">{prods.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-2"><img src={p.image || './brand/logo-mark.png'} alt="" className="size-14 rounded-xl object-cover" /><p className="flex-1 font-medium">{p.title}</p></div>)}</div> : <R id="card">{grid(prods)}</R>}
        </div>
      </div></R>}

      <R id="footer"><footer className="mt-2 bg-white px-5 pt-6 pb-4 text-12">
        <div className={cx('grid gap-6', !mob && 'grid-cols-[1.4fr_repeat(3,1fr)]')}>
          <div><img src="./brand/logo-full.png" alt="غنیمت" className="h-7" /><p className="mt-3 leading-6 text-[#5a5e78]">{site.footer.about}</p>
            <p className="mt-3 flex items-center gap-1.5"><Phone size={13} /><span className="ltr">{site.footer.phone}</span> · {site.footer.hours}</p></div>
          {site.footer.columns.map((c) => <div key={c.id}><p className="mb-2 font-bold">{c.title}</p><ul className="space-y-1.5 text-[#5a5e78]">{c.links.filter((l) => !l.hidden).map((l) => <li key={l.id}>{l.label}</li>)}</ul></div>)}
        </div>
        {site.footer.newsletter && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#f2f3f7] p-3"><p className="flex-1">{site.footer.newsletterText}</p><span className="flex h-9 w-56 items-center justify-between rounded-xl bg-white pr-3 pl-1 text-[#5a5e78]">شمارهٔ موبایل<span className="rounded-lg bg-[#0000ff] px-3 py-1.5 text-white">عضویت</span></span></div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f6] pt-3">
          <div className="flex gap-2">{site.footer.socials.filter((s) => s.on).map((s) => <span key={s.id} title={s.url} className="grid size-8 place-items-center rounded-full bg-[#eef0ff] text-11 font-bold text-[#0000ff]">{s.kind.slice(0, 1)}</span>)}</div>
          <div className="flex gap-2">{([['enamad', 'نماد اعتماد', <BadgeCheck size={16} />], ['samandehi', 'ساماندهی', <ShieldCheck size={16} />], ['union', 'اتحادیه', <Truck size={16} />]] as const).filter(([k]) => site.footer.trust[k]).map(([k, l, ic]) => <span key={k} className="flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-[#e6e8f0] text-[10px] text-[#5a5e78]">{ic}{l}</span>)}</div>
        </div>
        <p className="mt-3 text-center text-11 text-[#5a5e78]">{site.footer.copyright}</p>
      </footer></R>
    </div>
  )
}
