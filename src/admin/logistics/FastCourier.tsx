import { BrandLogo, WithLogo } from '@/shared/ui/brandLogo'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CloudRain, Lock, MapPin, Plus, RotateCcw, Trash2, Truck, Zap } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Toggle } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { DAYS, type Delivery } from '@/shared/data/delivery'
import { FastZoneMap } from './FastZoneMap'

type Fast = Delivery['fast']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8)
const toman = (v: number) => `${fa(Math.round(v).toLocaleString('en-US'))} تومان`
const todayName = () => DAYS[(new Date().getDay() + 1) % 7]

/** درصد افزایش یک ساعت: دستی (اگر قفل شده) یا خودکار، به‌اضافهٔ روز هفته، باران و افزایش موقت */
export function fastPct(f: Fast, h: number, day: string, now = Date.now()) {
  const manual = f.overrides[h]
  const base = manual ?? (f.auto ? f.profile[h] ?? 0 : 0)
  const boost = f.boost && new Date(f.boost.until).getTime() > now && h === new Date(now).getHours() ? f.boost.pct : 0
  return { base, manual: manual !== undefined, day: f.dayExtra[day] ?? 0, rain: f.rain ? f.rainPct : 0, boost, total: base + (f.dayExtra[day] ?? 0) + (f.rain ? f.rainPct : 0) + boost }
}
type Zone = Fast['zones'][number]
/** قیمت نهایی تحویل سریع: قیمت پایهٔ مقصد (یا قیمت پیش‌فرض) + سهم مشتری از افزایش، با سقف همان مقصد */
export function fastPrice(f: Fast, pct: number, z?: Zone | null) {
  const base = z?.price ?? f.price; const cap = z?.cap ?? f.cap
  const raw = base * (1 + (pct * f.pass) / 10000)
  return Math.min(cap, Math.round(raw / f.round) * f.round)
}

/** پیک و قیمت تحویل سریع: انتخاب پیک، زنجیرهٔ جایگزین، افزایش خودکار ساعت‌های پرترافیک و تغییر دستی هر ساعت */
export function FastCourier() {
  const d = useDB(); const f = d.delivery.fast
  const [day, setDay] = useState(todayName() === 'جمعه' ? 'شنبه' : todayName()); const [sel, setSel] = useState<number | null>(null); const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t) }, [])
  const set = (fn: (x: Fast) => void, action: string, target = 'تحویل سریع') => mutate((x) => fn(x.delivery.fast), { action, target })
  const nowH = new Date().getHours(); const nowP = fastPct(f, nowH, todayName())
  const cur = f.couriers.find((c) => c.id === f.primary)!
  const cost = (id: string, pct: number) => (f.couriers.find((c) => c.id === id)?.base ?? 0) * (1 + pct / 100)
  // اگر پیک اصلی در این ساعت بیش از آستانه گران‌تر از ارزان‌ترین پیک فعال شد، سفارش به پیک جایگزین می‌رود
  const pick = (pct: number) => { const chain = [f.primary, ...f.fallback].filter((id) => f.couriers.find((c) => c.id === id)?.on); if (!f.autoSwitch || pct < f.switchGap) return chain[0]; const alt = chain.slice(1).sort((a, b) => cost(a, pct) - cost(b, pct))[0]; return alt && cost(chain[0], pct) - cost(alt, pct) > cost(chain[0], 0) * 0.1 ? alt : chain[0] }
  const name = (id: string) => f.couriers.find((c) => c.id === id)?.name ?? id
  const max = Math.max(60, ...HOURS.map((h) => fastPct(f, h, day).total))
  const sp = sel !== null ? fastPct(f, sel, day) : null
  const zones = f.zones ?? []; const [zid, setZid] = useState(zones[0]?.id ?? ''); const z = zones.find((x) => x.id === zid) ?? null
  const zcost = (id: string, pct: number) => (z ? z.cost * (1 + pct / 100) : cost(id, pct))
  const setZ = (id: string, fn: (x: Zone) => void, action: string) => set((x) => { const t = x.zones.find((y) => y.id === id); if (t) fn(t) }, action, zones.find((y) => y.id === id)?.name ?? 'مقصد')

  return (
    <div className="space-y-4" id="fast-courier">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-12 text-t2">الان ({fa(nowH)}:۰۰) مشتری می‌بیند</p><p className="mt-1 text-22 font-bold tnum text-brand">{toman(fastPrice(f, nowP.total, z))}</p><p className="mt-1 text-11 text-t2">{z ? `${z.name} · ` : ''}{nowP.total ? `${fa(nowP.total)}٪ افزایش ساعت پرترافیک` : 'قیمت پایه، بدون افزایش'}</p></Card>
        <Card><p className="text-12 text-t2">پیکی که الان انتخاب می‌شود</p><p className="mt-1 text-18 font-bold">{name(pick(nowP.total))}</p><p className="mt-1 text-11 text-t2">هزینهٔ تقریبی برای ما: {toman(zcost(pick(nowP.total), nowP.total))}</p></Card>
        <Card><p className="text-12 text-t2">حاشیهٔ هر سفارش در این ساعت</p>{(() => { const m = fastPrice(f, nowP.total, z) - zcost(pick(nowP.total), nowP.total); return <p className={cx('mt-1 text-18 font-bold tnum', m < 0 ? 'text-danger' : 'text-success')}>{m < 0 ? '−' : ''}{toman(Math.abs(m))}</p> })()}<p className="mt-1 text-11 text-t2">قیمت مشتری منهای هزینهٔ پیک</p></Card>
        <Card><p className="text-12 text-t2">وضعیت ویژه</p><div className="mt-2 flex flex-wrap gap-1.5">{f.rain && <Badge tone="info">باران +{fa(f.rainPct)}٪</Badge>}{f.boost && new Date(f.boost.until).getTime() > Date.now() ? <Badge tone="warning">افزایش موقت +{fa(f.boost.pct)}٪ تا {rel(f.boost.until)}</Badge> : null}{(f.dayExtra[todayName()] ?? 0) > 0 && <Badge>{todayName()} +{fa(f.dayExtra[todayName()])}٪</Badge>}{!f.rain && !(f.boost && new Date(f.boost.until).getTime() > Date.now()) && !(f.dayExtra[todayName()] ?? 0) && <span className="text-12 text-t2">روال عادی</span>}</div></Card>
      </div>

      <Card title={<span className="flex items-center gap-1.5"><MapPin size={15} />قیمت پیک ۲ ساعته بر اساس مقصد</span>} actions={<Button size="sm" icon={<Plus size={13} />} onClick={() => { const id = `z-${Date.now().toString(36)}`; set((x) => { x.zones.push({ id, name: 'مقصد تازه', kind: 'شهر', areas: '', price: f.price, cap: Math.round(f.price * 1.6), cost: Math.round(f.price * 0.65), on: true, mode: 'polygon', radiusKm: 8, color: ['#7c3aed', '#0e7490', '#be185d', '#4d7c0f'][x.zones.length % 4], poly: [] }) }, 'افزودن مقصد تحویل سریع'); setZid(id) }}>افزودن منطقه یا شهر</Button>} pad={false}>
        <p className="px-4 pt-3 text-12 leading-5 text-t2">برای هر منطقهٔ تهران یا هر شهر اطراف، قیمت پایهٔ جدا بگذارید و مرزش را روی نقشهٔ پایین بکشید (یا شعاعی از انبار تعیین کنید). سبد خرید از روی پین مشتری، آنی تشخیص می‌دهد در کدام محدوده است. افزایش ساعت پرترافیک، روز هفته، باران و افزایش موقت روی قیمت همان مقصد حساب می‌شود. مقصدی که اینجا نیست، قیمت پیش‌فرض ({toman(f.price)}) را می‌گیرد.</p>
        <div className="overflow-x-auto p-3"><table className="w-full min-w-[820px] text-12">
          <thead><tr className="text-right text-11 text-t2"><th className="px-2 py-1.5 font-medium">مقصد</th><th className="px-2 font-medium">نوع</th><th className="px-2 font-medium">محدوده (محله‌ها، شهرها)</th><th className="px-2 font-medium">قیمت پایه برای مشتری</th><th className="px-2 font-medium">سقف</th><th className="px-2 font-medium">هزینهٔ پیک برای ما</th><th className="px-2 font-medium">مرز روی نقشه</th><th className="px-2 font-medium">الان مشتری می‌بیند</th><th className="px-2 font-medium">فعال</th><th /></tr></thead>
          <tbody>{zones.map((x) => { const now = fastPrice(f, nowP.total, x); const mg = now - x.cost * (1 + nowP.total / 100); return (
            <tr key={x.id} className={cx('border-t border-line', zid === x.id && 'bg-brand-tint/40', !x.on && 'opacity-60')}>
              <td className="px-2 py-1.5"><Input aria-label="نام مقصد" className="h-8 w-32" value={x.name} onFocus={() => setZid(x.id)} onChange={(e) => setZ(x.id, (t) => { t.name = e.target.value }, 'تغییر نام مقصد تحویل سریع')} /></td>
              <td className="px-2"><Segmented size="sm" value={x.kind} onChange={(v) => setZ(x.id, (t) => { t.kind = v }, 'تغییر نوع مقصد')} options={[['منطقه', 'منطقه'], ['شهر', 'شهر']]} /></td>
              <td className="px-2"><Input aria-label={`محدودهٔ ${x.name}`} className="h-8 w-56" value={x.areas} placeholder="مثلاً ونک، جردن، سعادت‌آباد" onChange={(e) => setZ(x.id, (t) => { t.areas = e.target.value }, 'تغییر محدودهٔ مقصد')} /></td>
              <td className="px-2"><Input aria-label={`قیمت پایهٔ ${x.name}`} type="number" step={10000} className="h-8 w-28" value={x.price} onChange={(e) => setZ(x.id, (t) => { t.price = Number(e.target.value) }, 'تغییر قیمت پایهٔ مقصد')} /></td>
              <td className="px-2"><Input aria-label={`سقف قیمت ${x.name}`} type="number" step={10000} className="h-8 w-28" value={x.cap} onChange={(e) => setZ(x.id, (t) => { t.cap = Number(e.target.value) }, 'تغییر سقف قیمت مقصد')} /></td>
              <td className="px-2"><Input aria-label={`هزینهٔ پیک ${x.name}`} type="number" step={10000} className="h-8 w-28" value={x.cost} onChange={(e) => setZ(x.id, (t) => { t.cost = Number(e.target.value) }, 'تغییر هزینهٔ پیک مقصد')} /></td>
              <td className="px-2"><button type="button" onClick={() => setZid(x.id)} className={cx('flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-11', x.mode === 'radius' || x.poly.length > 2 ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning')}><span className="size-2 rounded-full" style={{ background: x.color }} />{x.mode === 'radius' ? `شعاع ${fa(x.radiusKm)} کیلومتر` : x.poly.length > 2 ? `مرز با ${fa(x.poly.length)} نقطه` : 'مرز ترسیم نشده'}</button></td>
              <td className="px-2"><b className="tnum text-brand">{toman(now)}</b><span className={cx('block text-[10px]', mg < 0 ? 'text-danger' : 'text-success')}>حاشیه {mg < 0 ? '−' : ''}{toman(Math.abs(mg))}</span></td>
              <td className="px-2"><Toggle on={x.on} label={`فعال بودن ${x.name}`} onChange={(v) => setZ(x.id, (t) => { t.on = v }, v ? 'فعال کردن تحویل سریع مقصد' : 'غیرفعال کردن تحویل سریع مقصد')} /></td>
              <td className="px-2"><button type="button" aria-label={`حذف ${x.name}`} className="grid size-7 place-items-center rounded text-t3 hover:bg-danger-bg hover:text-danger" onClick={() => { set((y) => { y.zones = y.zones.filter((q) => q.id !== x.id) }, 'حذف مقصد تحویل سریع', x.name); if (zid === x.id) setZid(zones.find((q) => q.id !== x.id)?.id ?? '') }}><Trash2 size={13} /></button></td>
            </tr>) })}</tbody>
        </table>{zones.length === 0 && <p className="py-4 text-center text-12 text-t2">هنوز مقصدی تعریف نشده؛ همهٔ سفارش‌ها قیمت پیش‌فرض را می‌گیرند.</p>}</div>
        <FastZoneMap f={f} zid={zid} setZid={setZid} set={set} priceOf={(x) => fastPrice(f, nowP.total, x)} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card title="قیمت تحویل سریع در هر ساعت" actions={<span className="flex flex-wrap items-center gap-2">{zones.length > 0 && <Select className="w-40" value={zid} other={false} onChange={setZid} options={zones.map((x) => [x.id, x.name] as [string, string])} />}<Segmented size="sm" value={day} onChange={setDay} options={DAYS.filter((x) => !d.delivery.closedDays.includes(x)).map((x) => [x, x] as [string, string])} /></span>}>
          <p className="mb-3 text-12 leading-5 text-t2">ستون‌ها درصد افزایش هر ساعت‌اند. روی هر ساعت بزنید تا دستی تغییرش دهید. ساعت‌های دستی قفل دارند و الگوی خودکار رویشان اثر نمی‌گذارد.</p>
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-12">
            <Toggle on={f.auto} onChange={(v) => set((x) => { x.auto = v }, v ? 'روشن کردن افزایش خودکار ساعت پرترافیک' : 'خاموش کردن افزایش خودکار')} text="افزایش خودکار در ساعت‌های پرترافیک" />
            <span className="flex items-center gap-3 text-11 text-t2"><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-brand" />خودکار</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#b45309]" />دستی</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#c7ccff]" />روز، باران، موقت</span></span>
          </div>
          <div className="flex h-56 items-end gap-1.5 border-b border-line pb-1" role="list" aria-label="درصد افزایش قیمت در هر ساعت">
            {HOURS.map((h) => { const p = fastPct(f, h, day); const extra = p.total - p.base; return (
              <button key={h} role="listitem" type="button" onClick={() => setSel(h)} aria-label={`ساعت ${h}: ${p.total} درصد، ${toman(fastPrice(f, p.total, z))}`} className={cx('group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-md pt-1', sel === h ? 'bg-brand-tint' : 'hover:bg-neutral-bg', h === nowH && day === todayName() && 'ring-1 ring-brand')}>
                <span className="mb-1 text-[10px] font-semibold tnum">{p.total ? `+${fa(p.total)}٪` : '۰'}</span>
                {p.manual && <Lock size={10} className="mb-0.5 text-[#b45309]" aria-hidden />}
                <span className="flex w-full flex-col justify-end px-0.5" style={{ height: `${Math.max(3, (p.total / max) * 150)}px` }}>
                  {extra > 0 && <span className="w-full rounded-t-sm bg-[#c7ccff]" style={{ height: `${(extra / Math.max(1, p.total)) * 100}%` }} />}
                  <span className={cx('w-full', extra > 0 ? '' : 'rounded-t-sm', p.manual ? 'bg-[#b45309]' : 'bg-brand')} style={{ height: `${p.total ? (p.base / p.total) * 100 : 100}%`, minHeight: 3 }} />
                </span>
                <span className="mt-1 text-[10px] text-t2 tnum">{fa(h)}</span>
              </button>) })}
          </div>
          <p className="mt-2 text-11 text-t2">{z ? `${z.name}: ` : ''}قیمت پایه {toman(z?.price ?? f.price)} · سقف {toman(z?.cap ?? f.cap)} · گرد به {toman(f.round)} · ساعت قطع سفارش سریع {fa(d.delivery.fastCutoff)}</p>
          {sel !== null && sp && (
            <div className="mt-3 rounded-xl border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><b className="text-13">ساعت {fa(sel)} تا {fa(sel + 1)} · {day}</b><span className="text-13">مشتری می‌بیند{z ? ` (${z.name})` : ''}: <b className="tnum text-brand">{toman(fastPrice(f, sp.total, z))}</b> · پیک: {name(pick(sp.total))}</span></div>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="درصد افزایش این ساعت"><Input type="number" min={-30} max={150} className="w-28" value={f.overrides[sel] ?? f.profile[sel] ?? 0} onChange={(e) => { const v = Number(e.target.value); set((x) => { x.overrides[sel] = v }, 'تغییر دستی قیمت ساعت تحویل سریع', `ساعت ${sel}`) }} /></Field>
                <div className="flex gap-1">{[-10, 0, 10, 20, 35, 50].map((v) => <Button key={v} size="sm" variant={(f.overrides[sel] ?? -999) === v ? 'primary' : 'secondary'} onClick={() => set((x) => { x.overrides[sel] = v }, 'تغییر دستی قیمت ساعت تحویل سریع', `ساعت ${sel}`)}>{v > 0 ? `+${fa(v)}` : fa(v)}٪</Button>)}</div>
                {sp.manual && <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => set((x) => { delete x.overrides[sel] }, 'برگرداندن ساعت به قیمت خودکار', `ساعت ${sel}`)}>برگرداندن به خودکار ({fa(f.profile[sel] ?? 0)}٪)</Button>}
              </div>
              <p className="mt-2 text-11 text-t2">جزئیات: {sp.manual ? 'دستی' : 'خودکار'} {fa(sp.base)}٪{sp.day ? ` + روز ${fa(sp.day)}٪` : ''}{sp.rain ? ` + باران ${fa(sp.rain)}٪` : ''}{sp.boost ? ` + موقت ${fa(sp.boost)}٪` : ''}. ورود عدد منفی یعنی تخفیف در ساعت‌های خلوت.</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-1.5"><Truck size={15} />پیک تحویل سریع</span>}>
            <p className="mb-3 text-12 leading-5 text-t2">سفارش‌های تحویل سریع اول به پیک اصلی می‌روند. اگر در دسترس نبود یا خیلی گران شد، به ترتیب زنجیرهٔ جایگزین.</p>
            <Field label="پیک اصلی"><Select value={f.primary} onChange={(v) => set((x) => { x.fallback = [x.primary, ...x.fallback].filter((y) => y !== v); x.primary = v }, 'تغییر پیک اصلی تحویل سریع', name(v))} options={f.couriers.filter((c) => c.on).map((c) => [c.id, `${c.name}${c.api ? ' · اتصال API' : ''}`] as [string, string])} /></Field>
            <p className="mb-1.5 mt-3 text-12 font-semibold">ترتیب جایگزین‌ها</p>
            <ol className="space-y-1.5">{f.fallback.map((id, i) => <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-12"><span className="grid size-5 place-items-center rounded-full bg-neutral-bg text-[10px]">{fa(i + 2)}</span><span className="flex-1">{name(id)}</span><span className="text-11 text-t2">{toman(cost(id, 0))}</span><button type="button" aria-label={`بالا بردن ${name(id)}`} disabled={i === 0} onClick={() => set((x) => { [x.fallback[i - 1], x.fallback[i]] = [x.fallback[i], x.fallback[i - 1]] }, 'تغییر ترتیب پیک جایگزین')} className="grid size-6 place-items-center rounded text-t2 hover:bg-neutral-bg disabled:opacity-30"><ArrowUp size={12} /></button><button type="button" aria-label={`پایین بردن ${name(id)}`} disabled={i === f.fallback.length - 1} onClick={() => set((x) => { [x.fallback[i + 1], x.fallback[i]] = [x.fallback[i], x.fallback[i + 1]] }, 'تغییر ترتیب پیک جایگزین')} className="grid size-6 place-items-center rounded text-t2 hover:bg-neutral-bg disabled:opacity-30"><ArrowDown size={12} /></button></li>)}</ol>
            <div className="mt-2"><Select value="" placeholder="افزودن پیک به زنجیره" onChange={(v) => set((x) => { if (!x.fallback.includes(v)) x.fallback.push(v) }, 'افزودن پیک جایگزین', name(v))} options={f.couriers.filter((c) => c.id !== f.primary && !f.fallback.includes(c.id)).map((c) => [c.id, c.name] as [string, string])} /></div>
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-12">
              <Toggle on={f.autoSwitch} onChange={(v) => set((x) => { x.autoSwitch = v }, 'تغییر جابه‌جایی خودکار پیک')} text="در ساعت‌های گران، خودکار به پیک ارزان‌تر برو" />
              {f.autoSwitch && <label className="flex items-center gap-2">وقتی افزایش ساعت از <Input type="number" className="w-16" value={f.switchGap} onChange={(e) => set((x) => { x.switchGap = Number(e.target.value) }, 'تغییر آستانهٔ جابه‌جایی پیک')} /> درصد بیشتر شد</label>}
            </div>
            <ul className="mt-3 space-y-1 border-t border-line pt-3">{f.couriers.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 text-12"><span className="flex items-center gap-1.5"><BrandLogo name={c.name} size={18} fallback={false} />{c.name}{c.api ? <Badge tone="success">API</Badge> : <Badge>دستی</Badge>}</span><Toggle on={c.on} disabled={c.id === f.primary} onChange={(v) => set((x) => { x.couriers.find((y) => y.id === c.id)!.on = v; if (!v) x.fallback = x.fallback.filter((y) => y !== c.id) }, v ? 'فعال کردن پیک' : 'غیرفعال کردن پیک', c.name)} label={`فعال بودن ${c.name}`} /></li>)}</ul>
          </Card>

          <Card title="قیمت پایه و سهم مشتری">
            <div className="grid grid-cols-2 gap-3">
              <Field label="قیمت پیش‌فرض (مقصد تعریف‌نشده)"><Input type="number" value={f.price} onChange={(e) => set((x) => { x.price = Number(e.target.value) }, 'تغییر قیمت پایهٔ تحویل سریع')} /></Field>
              <Field label="سقف قیمت (تومان)"><Input type="number" value={f.cap} onChange={(e) => set((x) => { x.cap = Number(e.target.value) }, 'تغییر سقف قیمت تحویل سریع')} /></Field>
            </div>
            <Field label={`سهم مشتری از افزایش: ${fa(f.pass)}٪`} help="۱۰۰٪ یعنی کل افزایش روی قیمت مشتری می‌رود؛ ۵۰٪ یعنی نصفش را غنیمت می‌پردازد."><input type="range" min={0} max={100} step={10} value={f.pass} aria-label="سهم مشتری از افزایش" onChange={(e) => set((x) => { x.pass = Number(e.target.value) }, 'تغییر سهم مشتری از افزایش قیمت')} className="w-full accent-[#0000ff]" /></Field>
            <div className="grid grid-cols-2 gap-3">{['چهارشنبه', 'پنجشنبه'].map((dn) => <Field key={dn} label={`افزایش روز ${dn} (٪)`}><Input type="number" value={f.dayExtra[dn] ?? 0} onChange={(e) => set((x) => { x.dayExtra[dn] = Number(e.target.value) }, 'تغییر افزایش روز هفته', dn)} /></Field>)}</div>
          </Card>

          <Card title={<span className="flex items-center gap-1.5"><Zap size={15} />تغییر فوری</span>}>
            <p className="mb-3 text-12 leading-5 text-t2">برای ترافیک ناگهانی، باران یا کمبود پیک. همهٔ تغییرها در لاگ ممیزی ثبت می‌شوند.</p>
            <div className="flex items-center justify-between gap-2 text-12"><span className="flex items-center gap-1.5"><CloudRain size={14} />حالت باران و برف</span><Toggle on={f.rain} onChange={(v) => set((x) => { x.rain = v }, v ? 'روشن کردن حالت باران' : 'خاموش کردن حالت باران')} label="حالت باران" /></div>
            {f.rain && <label className="mt-2 flex items-center gap-2 text-12">افزایش در حالت باران <Input type="number" className="w-16" value={f.rainPct} onChange={(e) => set((x) => { x.rainPct = Number(e.target.value) }, 'تغییر درصد حالت باران')} />٪</label>}
            <p className="mb-1.5 mt-3 text-12 font-semibold">افزایش موقت همین ساعت</p>
            <div className="flex flex-wrap gap-1.5">{[[10, 1], [20, 1], [20, 2], [30, 2]].map(([p, h]) => <Button key={`${p}-${h}`} size="sm" onClick={() => { set((x) => { x.boost = { pct: p, until: new Date(Date.now() + h * 36e5).toISOString(), why: 'ترافیک' } }, `افزایش موقت ${p}٪ برای ${h} ساعت`); toast(`قیمت تحویل سریع تا ${fa(h)} ساعت آینده ${fa(p)}٪ بیشتر شد.`) }}>+{fa(p)}٪ تا {fa(h)} ساعت</Button>)}</div>
            {f.boost && new Date(f.boost.until).getTime() > Date.now() && <Button size="sm" variant="ghost" className="mt-2" icon={<RotateCcw size={12} />} onClick={() => set((x) => { x.boost = null }, 'لغو افزایش موقت')}>لغو افزایش موقت</Button>}
          </Card>
        </div>
      </div>
    </div>
  )
}
