import { useEffect, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Play, Search, ShoppingCart, Trash2, UserRound } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { MagicIcon } from '@/shared/ui/MagicIcon'
import { useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { El, PageDef, Sec, Theme } from '@/shared/data/pages'
import { ProductCard } from '../catalog/ProductCard'

export type Sel = { sec: string; el?: string } | null
type Props = { page: PageDef; theme: Theme; sel: Sel; onSel: (s: Sel) => void; heat: boolean; mobile: boolean
  onMove: (from: number, to: number) => void; onDup: (i: number) => void; onHide: (i: number) => void; onDel: (i: number) => void }

function Countdown({ end }: { end?: string }) {
  const [t, setT] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i) }, [])
  const s = Math.max(0, Math.floor((new Date(end ?? Date.now()).getTime() - t) / 1000)); const p = (n: number) => fa(String(n).padStart(2, '0'))
  return <span className="tnum ltr inline-flex gap-1">{[Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x, i) => <b key={i} className="rounded-md bg-white px-1.5 py-0.5 text-[#c42f2f]">{p(x)}</b>)}</span>
}

/** رندر زندهٔ صفحه با پوستهٔ سایت؛ هر المان با کلیک انتخاب می‌شود */
export function Canvas({ page, theme: T, sel, onSel, heat, mobile, onMove, onDup, onHide, onDel }: Props) {
  const d = useDB(); const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null)
  const maxClicks = Math.max(1, ...page.sections.flatMap((s) => s.els.map((e) => e.clicks)))
  const prods = d.products.filter((p) => p.status === 'product.published')
  const H = d.site.header
  const pick = (sec: string, el?: string) => (ev: { stopPropagation: () => void }) => { ev.stopPropagation(); onSel({ sec, el }) }
  const isSel = (sec: string, el?: string) => sel?.sec === sec && sel?.el === el
  const elStyle = (e: El): CSSProperties => ({ color: e.color, background: e.bg, fontSize: e.size, fontWeight: e.weight, textAlign: e.align === 'center' ? 'center' : e.align === 'end' ? 'left' : undefined })

  const Wrap = ({ s, e, children, className }: { s: Sec; e: El; children: ReactNode; className?: string }) => (
    <div onClick={pick(s.id, e.id)} className={cx('relative cursor-pointer rounded-lg outline-offset-2', isSel(s.id, e.id) ? 'outline-2 outline-[#0000ff]' : 'hover:outline-2 hover:outline-dashed hover:outline-[#0000ff]/60', e.hidden && 'opacity-35', className)}>
      {children}
      {heat && e.clicks > 0 && <span className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: `rgba(196,47,47,${0.08 + (e.clicks / maxClicks) * 0.5})` }} />}
      {heat && e.clicks > 0 && <span className="pointer-events-none absolute top-1 left-1 z-10 rounded-md bg-[#10123d] px-1.5 py-0.5 text-[10px] text-white">{fa(e.clicks)} کلیک · {fa(((e.clicks / e.views) * 100).toFixed(1))}٪</span>}
    </div>
  )
  const renderEl = (s: Sec, e: El) => {
    const st = elStyle(e); const dark = s.bg && ['#10123d', '#000000', '#111111'].includes(s.bg)
    switch (e.kind) {
      case 'heading': return <Wrap key={e.id} s={s} e={e} className="w-full"><h2 style={{ ...st, fontSize: e.size ?? (mobile ? 18 : 22) }} className={cx('font-bold', dark && !e.color && 'text-white')}>{e.text}</h2></Wrap>
      case 'text': return <Wrap key={e.id} s={s} e={e} className="w-full"><p style={st} className={cx('text-13 leading-6', dark && !e.color ? 'text-white/80' : 'text-[#5a5e78]')}>{e.text || <i className="text-[#9aa0b8]">متن خالی</i>}</p></Wrap>
      case 'button': return <Wrap key={e.id} s={s} e={e}><span style={{ background: e.bg ?? T.brand, color: e.color ?? '#fff', borderRadius: T.radius / 1.5 }} className="inline-flex h-10 items-center gap-1.5 px-4 text-13 font-medium">{e.icon && <MagicIcon name={e.icon} size={16} />}{e.text}</span></Wrap>
      case 'link': return <Wrap key={e.id} s={s} e={e} className={e.icon ? '' : ''}>{e.icon ? <span className="flex w-24 flex-col items-center gap-1.5 rounded-xl bg-white p-3 text-center text-12 font-medium text-[#10123d] shadow-sm"><span className="grid size-10 place-items-center rounded-full" style={{ background: `${T.brand}14`, color: T.brand }}><MagicIcon name={e.icon} size={22} /></span>{e.text}</span> : <span style={{ color: e.color ?? T.brand }} className="text-13 font-medium">{e.text}</span>}</Wrap>
      case 'banner': case 'image': { const w = e.w ?? 400; const h = e.h ?? 240; const widthPct = Math.min(100, (w / 1440) * 100 * (mobile ? 2.6 : 1)); return <Wrap key={e.id} s={s} e={e} className={e.kind === 'banner' ? '' : ''}><div style={{ width: e.kind === 'banner' && w >= 1200 ? '100%' : mobile ? '100%' : `${Math.max(14, widthPct)}vw`, maxWidth: '100%', aspectRatio: `${w} / ${h}`, borderRadius: T.radius }} className="relative overflow-hidden bg-gradient-to-br from-[#eef0ff] to-[#fff3d6]">{e.src ? <img src={e.src} alt={e.label} className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center p-2 text-center text-11 text-[#5a5e78]"><span><b className="block text-12 text-[#10123d]">{e.text || e.label}</b><span className="ltr">{fa(w)}×{fa(h)}</span></span></span>}</div></Wrap> }
      case 'icon': return <Wrap key={e.id} s={s} e={e}><span className="flex w-40 items-center gap-2 rounded-xl bg-white p-2.5 text-12 font-medium text-[#10123d]"><span style={{ color: e.color ?? T.brand }}><MagicIcon name={e.icon} size={22} /></span>{e.text}</span></Wrap>
      case 'badge': return <Wrap key={e.id} s={s} e={e}><span style={{ background: e.bg ?? '#eef0ff', color: e.color ?? T.brand }} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-12 font-bold">{e.icon && <MagicIcon name={e.icon} size={14} />}{e.text}</span></Wrap>
      case 'chips': return <Wrap key={e.id} s={s} e={e} className="w-full"><div className="flex flex-wrap gap-1.5">{(e.items ?? []).map((c, i) => <span key={c + i} style={i === 0 ? { background: T.brand, color: '#fff' } : undefined} className="rounded-full bg-white px-3 py-1 text-12 text-[#10123d]">{c}</span>)}</div></Wrap>
      case 'timer': return <Wrap key={e.id} s={s} e={e}><span className="flex items-center gap-2 text-12 text-[#10123d]">{e.text}<Countdown end={e.end} /></span></Wrap>
      case 'products': return <Wrap key={e.id} s={s} e={e} className="w-full"><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${mobile ? 2 : 4}, minmax(0,1fr))` }}>{prods.slice(0, Math.min(e.count ?? 4, mobile ? 2 : 4)).map((p) => <ProductCard key={p.id} p={p} mini fluid cfg={d.site.card} />)}</div><p className="mt-1 text-[10px] text-[#5a5e78]">منبع: {e.source} · {fa(e.count ?? 0)} کالا</p></Wrap>
      case 'list': return <Wrap key={e.id} s={s} e={e} className="w-full"><ul className={cx('space-y-1 text-13', dark ? 'text-white/90' : 'text-[#10123d]')}>{(e.items ?? []).map((x, i) => <li key={i} className="flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ background: T.brand }} />{x}</li>)}</ul></Wrap>
      case 'input': return <Wrap key={e.id} s={s} e={e}><span className="flex h-10 w-56 items-center rounded-xl border border-[#e6e8f0] bg-white px-3 text-12 text-[#9aa0b8]">{e.text}</span></Wrap>
      case 'video': return <Wrap key={e.id} s={s} e={e}><span className="flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-xl bg-[#10123d] text-11 text-white"><Play size={20} />{e.text}</span></Wrap>
    }
  }
  return (
    <div dir="rtl" style={{ background: T.bg, fontFamily: 'Vazirmatn' }} className="text-[#10123d]">
      <div onClick={pick('__header')} className={cx('relative cursor-pointer bg-white -outline-offset-2', sel?.sec === '__header' ? 'outline-2 outline-[#0000ff]' : 'hover:outline-2 hover:outline-dashed hover:outline-[#0000ff]/60')}>
        <p className="py-1.5 text-center text-11 text-white" style={{ background: T.brand }}>{d.site.announce.items[0]?.text.replace('{آستانه_ارسال_رایگان}', '۱۰ میلیون تومان')}</p>
        <div className="flex items-center gap-3 px-4 py-3"><img src={H.logo === 'mark' ? './brand/logo-mark.png' : './brand/logo-full.png'} alt="غنیمت" style={{ height: mobile ? T.logoHeightMobile : T.logoHeight }} />{!mobile && <span className="mx-3 flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#f2f3f7] px-3 text-12 text-[#5a5e78]"><Search size={14} />{H.search}</span>}<span className="mr-auto flex items-center gap-2"><UserRound size={18} /><span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: T.brand }}><ShoppingCart size={16} /></span></span></div>
      </div>
      {page.sections.map((s, i) => (
        <section key={s.id} draggable onDragStart={(ev: DragEvent) => { setDrag(i); ev.dataTransfer.effectAllowed = 'move' }} onDragOver={(ev) => { ev.preventDefault(); setOver(i) }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag !== null && drag !== i) onMove(drag, i); setDrag(null); setOver(null) }} onDragEnd={() => { setDrag(null); setOver(null) }}
          onClick={pick(s.id)} style={{ background: s.bg }} className={cx('group/s relative px-4 py-5 -outline-offset-2 transition-all', sel?.sec === s.id && !sel.el ? 'outline-2 outline-[#0000ff]' : 'hover:outline-2 hover:outline-dashed hover:outline-[#0000ff]/40', s.hidden && 'opacity-40', over === i && drag !== i && 'border-t-4 border-[#0000ff]', drag === i && 'opacity-50')}>
          <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 rounded-lg bg-[#10123d] p-0.5 text-white opacity-0 shadow transition-opacity group-hover/s:opacity-100" onClick={(e) => e.stopPropagation()}>
            <span title="بکشید و جابه‌جا کنید" className="grid size-6 cursor-grab place-items-center"><GripVertical size={13} /></span>
            <button aria-label="بالا" title="بالا" onClick={() => onMove(i, i - 1)} disabled={i === 0} className="grid size-6 place-items-center disabled:opacity-30"><ArrowUp size={13} /></button>
            <button aria-label="پایین" title="پایین" onClick={() => onMove(i, i + 1)} disabled={i === page.sections.length - 1} className="grid size-6 place-items-center disabled:opacity-30"><ArrowDown size={13} /></button>
            <button aria-label="کپی" title="کپی بخش" onClick={() => onDup(i)} className="grid size-6 place-items-center"><Copy size={13} /></button>
            <button aria-label={s.hidden ? 'نمایش' : 'پنهان'} title={s.hidden ? 'نمایش' : 'پنهان'} onClick={() => onHide(i)} className="grid size-6 place-items-center">{s.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            <button aria-label="حذف بخش" title="حذف بخش" onClick={() => onDel(i)} className="grid size-6 place-items-center text-[#ffb4b4]"><Trash2 size={13} /></button>
          </div>
          <span className="pointer-events-none absolute top-1 right-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] text-[#5a5e78] opacity-0 group-hover/s:opacity-100">{s.name}</span>
          <div className="flex flex-wrap items-start gap-3">{s.els.map((e) => renderEl(s, e))}</div>
        </section>
      ))}
      <div onClick={pick('__footer')} className={cx('cursor-pointer bg-white px-4 py-5 text-12 -outline-offset-2', sel?.sec === '__footer' ? 'outline-2 outline-[#0000ff]' : 'hover:outline-2 hover:outline-dashed hover:outline-[#0000ff]/60')}>
        <div className="flex flex-wrap justify-between gap-4">{d.site.footer.columns.map((c) => <div key={c.id}><b>{c.title}</b>{c.links.filter((l) => !l.hidden).slice(0, 4).map((l) => <p key={l.id} className="text-[#5a5e78]">{l.label}</p>)}</div>)}</div>
        <p className="mt-3 text-center text-11 text-[#5a5e78]">{d.site.footer.copyright}</p>
      </div>
    </div>
  )
}
