import { useEffect, useState } from 'react'
import { BellRing, CircleAlert, CreditCard, Flame, Plane, ShoppingCart, Sparkle, Star, Zap } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa, num } from '@/shared/lib/fa'
import type { Product, Unit } from '@/shared/data/seed'
import type { Site } from '@/shared/data/site'

const pad = (n: number) => fa(String(Math.max(0, n)).padStart(2, '0'))
function useCountdown(end?: string) {
  const [t, setT] = useState(Date.now())
  useEffect(() => { if (!end) return; const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i) }, [end])
  if (!end) return null
  const s = Math.max(0, Math.floor((new Date(end).getTime() - t) / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** کارت محصول سایت مطابق Card-Main فیگما. همهٔ بج‌ها از قانون‌ها، پارامترها و سرویس پیش‌فرض خوانده می‌شوند. */
export function ProductCard({ p, u, mini, hover, out, skeleton, cfg: cfgIn, fluid }: { p: Product; u?: Unit; mini?: boolean; hover?: boolean; out?: boolean; skeleton?: boolean; cfg?: Site['card']; fluid?: boolean }) {
  const d = useDB()
  const cfg = cfgIn ?? d.sitePublished?.card
  const rule = (k: string) => d.rules.find((r) => r.key === k)?.value ?? 0
  const on = (id: string) => d.cardBadges.find((b) => b.id === id)?.on
  const stock = p.mode === 'qty' ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) : d.units.filter((x) => x.productId === p.id && x.status === 'unit.published').length
  const isOut = out || stock === 0
  const unit = u ?? d.units.find((x) => x.productId === p.id && x.status === 'unit.published')
  const price = unit?.price || p.price || 0
  const before = p.compareAt && p.compareAt > price ? p.compareAt : 0
  const off = before ? Math.round((1 - price / before) * 100) : 0
  const bnpl = d.providers.find((x) => x.family === 'bnpl' && x.isDefault && x.status === 'prov.active')
  const camp = d.entities.priceCampaigns?.find((c) => c.active && String(c.products).includes(p.en.split(' ').slice(1, 3).join(' ')))
  const timer = useCountdown(camp ? new Date(new Date(camp.end).getTime() + 864e5 - 1).toISOString() : undefined)
  const fast = on('fast') && p.fastEligible && (unit ? unit.warehouse === 'tehran' : (p.qty?.tehran ?? 0) > 0) && !isOut
  const lineIcon = (k: string) => k === 'low' ? <CircleAlert size={16} className="text-[#d97706]" /> : k === 'origin' ? <Plane size={15} className="text-[#0000ff]" /> : k === 'bnpl' ? <CreditCard size={15} className="text-[#0000ff]" /> : <Sparkle size={15} className="text-[#0000ff]" />
  const lineOk = (k: string) => k === 'low' ? on('low') && stock > 0 && stock <= rule('low_stock_threshold') : k === 'origin' ? on('origin') && (unit?.source ?? p.source) === 'amazon' : k === 'bnpl' ? on('bnpl') && !!bnpl : true
  const rot = (cfg?.lines ?? []).filter((l) => l.on && l.text.trim() && lineOk(l.kind)).map((l) => ({ icon: lineIcon(l.kind), text: l.text.replace('{اقساط}', fa(bnpl?.installments ?? rule('installments_shown'))).replace('{سرویس}', bnpl?.name ?? '') }))
  const show = (k: keyof Site['card']) => cfg ? cfg[k] !== false : true

  const [i, setI] = useState(0)
  useEffect(() => { if (rot.length < 2) return; const t = setInterval(() => setI((x) => x + 1), (cfg?.interval ?? 2.6) * 1000); return () => clearInterval(t) }, [rot.length, cfg?.interval])
  const r = rot.length ? rot[i % rot.length] : null
  if (skeleton) return <div className={cx('w-full rounded-2xl border border-[#e6e8f0] bg-white p-3', fluid ? '' : mini ? 'max-w-[176px]' : 'max-w-[236px]')}><div className="skeleton aspect-square" /><div className="skeleton mt-3 h-4" /><div className="skeleton mt-2 h-4 w-2/3" /><div className="skeleton mt-4 h-6 w-1/2" /></div>
  return (
    <div className={cx('group relative w-full overflow-hidden rounded-2xl border bg-white text-[#10123d] transition-shadow', hover ? 'border-[#0000ff]/40 shadow-float' : 'border-[#e6e8f0]', fluid ? '' : mini ? 'max-w-[176px]' : 'max-w-[236px]')}>
      <div className={cx('relative overflow-hidden bg-white', cfg?.ratio === '4/5' ? 'aspect-[4/5]' : 'aspect-square')}>
        {p.image ? <img src={p.image} alt={p.title} style={{ objectPosition: p.imagePos ?? '50% 50%' }} className={cx('absolute inset-0 size-full object-cover transition-transform duration-300', hover && 'scale-[1.03]', isOut && 'opacity-50 grayscale')} /> : <div className="absolute inset-0 grid place-items-center text-12 text-[#5a5e78]">تصویر کالا</div>}
        {show('showTimer') && timer && !isOut && <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-[#c42f2f] px-2 py-1 text-12 font-bold text-white"><span>غنی‌آف</span><span className="tnum ltr">{timer}</span></span>}
        {show('showHot') && on('hot') && p.cvr > 2.5 && !isOut && <span className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg bg-[#fdecec] text-[#c42f2f]"><Flame size={17} /></span>}
        {hover && !isOut && <span className="absolute inset-x-2.5 bottom-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0000ff] text-13 font-medium text-white"><ShoppingCart size={14} />{cfg?.cta || 'افزودن به سبد خرید'}</span>}
        {isOut && <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-md bg-[#10123d] px-3 py-1 text-12 font-medium text-white">ناموجود</span>}
      </div>
      <div className={cx('space-y-2', mini ? 'p-2.5' : 'p-3.5')}>
        <div className="flex min-h-5 items-center justify-between text-12">
          {show('showGrade') && unit && unit.condition !== 'sealed' ? <span className="rounded-md bg-[#f3eeff] px-1.5 py-0.5 font-medium text-[#6d28d9]">{unit.condition === 'used' ? 'استوک' : 'جعبه باز'} · {unit.grade}{'‎'}</span> : <span />}
          {show('showRating') && p.reviews >= 5 && <span className="tnum flex items-center gap-0.5 font-medium"><Star size={13} className="fill-[#ffc24b] text-[#ffc24b]" />{fa(p.rating)}</span>}
        </div>
        <p className={cx('line-clamp-2 font-bold', mini ? 'min-h-10 text-13 leading-5' : 'min-h-12 text-14 leading-6')}>{p.title}</p>
        {show('showFast') && fast && <span className="inline-flex items-center gap-1 rounded-lg bg-[#eef0ff] px-2.5 py-1 text-12 font-bold text-[#0000ff]"><Zap size={13} />تحویل {fa(rule('fast_delivery_hours'))} ساعته</span>}
        {!mini && <div className="relative h-6 overflow-hidden" aria-live="off">{r && <p key={i} className="rot-in absolute inset-0 flex items-center gap-1.5 text-13 text-[#10123d]">{r.icon}{r.text}</p>}</div>}
        {isOut ? (
          <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#0000ff] text-13 font-medium text-[#0000ff]"><BellRing size={14} />موجود شد خبرم کن</button>
        ) : (
          <div className="space-y-0.5">
            {show('showCompare') && before > 0 && <div className="flex items-center justify-between"><span className="tnum text-13 text-[#5a5e78] line-through">{num(before)}</span><span className="tnum rounded-md bg-[#c42f2f] px-1.5 py-0.5 text-12 font-bold text-white">{fa(off)}٪</span></div>}
            <p className="tnum flex items-baseline gap-1 font-bold"><span className={mini ? 'text-16' : 'text-20'}>{num(price)}</span><span className="text-11 font-medium">تومان</span></p>
          </div>
        )}
      </div>
    </div>
  )
}
