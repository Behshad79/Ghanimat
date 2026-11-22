// نقشهٔ محدوده‌های ارسال سریع: ترسیم مرز هر مقصد (چندضلعی یا شعاع از انبار) و آزمون تشخیص خودکار از روی پین یا متن نشانی
import { useMemo, useState, type MouseEvent } from 'react'
import { Crosshair, MapPin, PenLine, RotateCcw, Search, Undo2, Warehouse } from 'lucide-react'
import { Badge, Button, cx, Input, Segmented } from '@/shared/ui/base'
import { fa } from '@/shared/lib/fa'
import { detectByText, detectZone, distKm, type LatLng, type Zone } from '@/shared/lib/geo'
import type { Delivery } from '@/shared/data/delivery'

type Fast = Delivery['fast']
const B = { n: 35.92, s: 35.45, w: 50.82, e: 51.7 }
const W = 800; const H = Math.round((W * (B.n - B.s)) / ((B.e - B.w) * Math.cos((35.7 * Math.PI) / 180)))
const X = (lng: number) => ((lng - B.w) / (B.e - B.w)) * W
const Y = (lat: number) => ((B.n - lat) / (B.n - B.s)) * H
const toLL = (x: number, y: number): LatLng => [+(B.n - (y / H) * (B.n - B.s)).toFixed(4), +(B.w + (x / W) * (B.e - B.w)).toFixed(4)]
const pts = (poly: LatLng[]) => poly.map(([la, ln]) => `${X(ln)},${Y(la)}`).join(' ')
const kmPx = (km: number) => (km / 111) / (B.n - B.s) * H

/* زمینهٔ راهنما (تقریبی): شهرها و آزادراه‌های اصلی */
const PLACES: { n: string; at: LatLng; r?: number }[] = [{ n: 'تهران', at: [35.672, 51.36], r: 1 }, { n: 'کرج', at: [35.835, 50.97], r: 1 }, { n: 'اسلامشهر', at: [35.55, 51.23] }, { n: 'شهریار', at: [35.66, 51.06] }, { n: 'قدس', at: [35.72, 51.11] }, { n: 'رباط‌کریم', at: [35.485, 51.08] }, { n: 'پاکدشت', at: [35.48, 51.68] }, { n: 'لواسان', at: [35.82, 51.63] }, { n: 'فردیس', at: [35.725, 50.985] }, { n: 'شهر ری', at: [35.59, 51.435] }]
const ROADS: LatLng[][] = [[[35.715, 51.33], [35.75, 51.2], [35.8, 51.06], [35.82, 50.95]], [[35.66, 51.33], [35.6, 51.25], [35.53, 51.2], [35.47, 51.15]], [[35.7, 51.47], [35.73, 51.6], [35.75, 51.7]], [[35.62, 51.42], [35.55, 51.48], [35.47, 51.55]]]

export function FastZoneMap({ f, zid, setZid, set, priceOf }: { f: Fast; zid: string; setZid: (id: string) => void; set: (fn: (x: Fast) => void, action: string, target?: string) => void; priceOf: (z: Zone) => number }) {
  const [edit, setEdit] = useState(false); const [pin, setPin] = useState<LatLng | null>([35.535, 51.215]); const [hover, setHover] = useState<LatLng | null>(null)
  const [addr, setAddr] = useState('کرج، گوهردشت، بلوار موذن')
  const z = f.zones.find((x) => x.id === zid) ?? null; const o: LatLng = [f.origin.lat, f.origin.lng]
  const setZ = (fn: (t: Zone) => void, action: string) => z && set((x) => { const t = x.zones.find((y) => y.id === z.id); if (t) fn(t) }, action, z.name)
  const hit = useMemo(() => (pin ? detectZone(f, pin) : null), [f, pin]); const byText = useMemo(() => (addr.trim() ? detectByText(f, addr) : null), [f, addr])
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const p = toLL(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H)
    if (edit && z && z.mode === 'polygon') setZ((t) => { t.poly = [...t.poly, p] }, 'افزودن نقطه به مرز محدوده')
    else setPin(p)
  }
  const move = (e: MouseEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); setHover(toLL(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H)) }

  return (
    <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-12">
          {edit && z ? <>
            <Badge tone="warning">در حال ترسیم مرز «{z.name}»</Badge>
            <Segmented size="sm" value={z.mode} onChange={(v) => setZ((t) => { t.mode = v }, v === 'radius' ? 'محدودهٔ شعاعی' : 'محدودهٔ چندضلعی')} options={[['polygon', 'مرز دلخواه روی نقشه'], ['radius', 'شعاع از انبار']]} />
            {z.mode === 'polygon' ? <>
              <span className="text-t2">روی نقشه بزنید تا نقطه اضافه شود · {fa(z.poly.length)} نقطه</span>
              <Button size="sm" variant="ghost" icon={<Undo2 size={12} />} disabled={!z.poly.length} onClick={() => setZ((t) => { t.poly = t.poly.slice(0, -1) }, 'برداشتن آخرین نقطهٔ مرز')}>برداشتن آخرین نقطه</Button>
              <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => setZ((t) => { t.poly = [] }, 'پاک کردن مرز محدوده')}>ترسیم از نو</Button>
            </> : <label className="flex items-center gap-2">شعاع <input type="range" min={1} max={40} value={z.radiusKm} aria-label="شعاع محدوده به کیلومتر" onChange={(e) => setZ((t) => { t.radiusKm = Number(e.target.value) }, 'تغییر شعاع محدوده')} className="w-36 accent-[#0000ff]" /><b className="tnum">{fa(z.radiusKm)} کیلومتر</b></label>}
            <Button size="sm" variant="primary" className="mr-auto" onClick={() => setEdit(false)}>پایان ترسیم</Button>
          </> : <>
            <span className="flex items-center gap-1 text-t2"><Crosshair size={13} />روی نقشه بزنید تا مثل پین مشتری در سبد خرید، محدوده و قیمت تشخیص داده شود.</span>
            {z && <Button size="sm" className="mr-auto" icon={<PenLine size={12} />} onClick={() => setEdit(true)}>ترسیم مرز «{z.name}»</Button>}
          </>}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="نقشهٔ محدوده‌های ارسال سریع" onClick={click} onMouseMove={move} onMouseLeave={() => setHover(null)} className={cx('w-full rounded-xl border border-line bg-[#f4f6fb] select-none', edit ? 'cursor-crosshair' : 'cursor-pointer')}>
          <defs><pattern id="zg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#e3e7f1" strokeWidth="1" /></pattern></defs>
          <rect width={W} height={H} fill="url(#zg)" />
          <path d={`M0 ${Y(35.9)} C ${X(51.0)} ${Y(35.95)}, ${X(51.3)} ${Y(35.88)}, ${W} ${Y(35.93)} L ${W} 0 L 0 0 Z`} fill="#e7eadf" opacity=".7" />
          <text x={X(51.2)} y={Y(35.9)} fontSize="11" fill="#8a9178" textAnchor="middle">رشته‌کوه البرز</text>
          {ROADS.map((r, i) => <polyline key={i} points={pts(r)} fill="none" stroke="#d6dae6" strokeWidth="3" strokeLinecap="round" />)}
          {f.zones.map((x) => { const sel = x.id === zid; const col = x.color ?? '#0000ff'; return x.mode === 'radius'
            ? <circle key={x.id} cx={X(o[1])} cy={Y(o[0])} r={kmPx(x.radiusKm)} fill={col} fillOpacity={x.on ? (sel ? 0.16 : 0.08) : 0.03} stroke={col} strokeWidth={sel ? 2.5 : 1.5} strokeDasharray={x.on ? undefined : '5 4'} onClick={() => { if (!edit) setZid(x.id) }} />
            : x.poly.length > 1 && <polygon key={x.id} points={pts(x.poly)} fill={col} fillOpacity={x.on ? (sel ? 0.18 : 0.09) : 0.03} stroke={col} strokeWidth={sel ? 2.5 : 1.5} strokeLinejoin="round" strokeDasharray={x.on ? undefined : '5 4'} onClick={() => { if (!edit) setZid(x.id) }} /> })}
          {PLACES.map((p) => <g key={p.n} pointerEvents="none"><circle cx={X(p.at[1])} cy={Y(p.at[0])} r={p.r ? 3.5 : 2.5} fill="#4a5068" /><text x={X(p.at[1])} y={Y(p.at[0]) - 7} fontSize={p.r ? 14 : 11} fontWeight={p.r ? 800 : 500} fill="#2a2f45" textAnchor="middle">{p.n}</text></g>)}
          {f.zones.filter((x) => x.mode === 'polygon' && x.poly.length > 2).map((x) => { const c = x.poly.reduce((a, p) => [a[0] + p[0] / x.poly.length, a[1] + p[1] / x.poly.length], [0, 0]); return <text key={`l-${x.id}`} x={X(c[1])} y={Y(c[0]) + 22} fontSize="11" fontWeight="700" fill={x.color ?? '#0000ff'} textAnchor="middle" pointerEvents="none">{x.name} · {fa(Math.round(priceOf(x) / 1000))} هزار</text> })}
          {edit && z?.mode === 'polygon' && z.poly.map(([la, ln], i) => <circle key={i} cx={X(ln)} cy={Y(la)} r="5" fill="#fff" stroke={z.color ?? '#0000ff'} strokeWidth="2" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setZ((t) => { t.poly = t.poly.filter((_, j) => j !== i) }, 'حذف نقطه از مرز') }}><title>برای حذف این نقطه بزنید</title></circle>)}
          <g pointerEvents="none"><rect x={X(o[1]) - 9} y={Y(o[0]) - 9} width="18" height="18" rx="5" fill="#0d1020" /><path d={`M${X(o[1]) - 5} ${Y(o[0]) + 4}V${Y(o[0]) - 1}l5 -3l5 3V${Y(o[0]) + 4}Z`} fill="#fff" /></g>
          {pin && !edit && <g pointerEvents="none"><line x1={X(o[1])} y1={Y(o[0])} x2={X(pin[1])} y2={Y(pin[0])} stroke="#0d1020" strokeDasharray="4 4" strokeWidth="1.2" /><path d={`M${X(pin[1])} ${Y(pin[0])}c-7 -9 -10 -13 -10 -18a10 10 0 0 1 20 0c0 5 -3 9 -10 18z`} fill={hit ? hit.color ?? '#0000ff' : '#c42f2f'} stroke="#fff" strokeWidth="1.5" /><circle cx={X(pin[1])} cy={Y(pin[0]) - 18} r="3.5" fill="#fff" /></g>}
        </svg>
        <p className="mt-1 flex justify-between text-[10px] text-t3"><span>نقشهٔ راهنمای تقریبی؛ در نسخهٔ نهایی روی نقشهٔ نشان یا Map.ir نمایش داده می‌شود</span><span className="ltr tnum">{hover ? `${hover[0]}, ${hover[1]}` : ''}</span></p>
      </div>

      <div className="space-y-3 text-12">
        <div className="rounded-xl border border-line p-3">
          <p className="mb-1 flex items-center gap-1.5 font-semibold"><MapPin size={14} />تشخیص از روی پین مشتری</p>
          {pin ? <>
            <p className="ltr text-right text-11 text-t3 tnum">{pin[0]}, {pin[1]}</p>
            {hit ? <div className="mt-2 rounded-lg p-2" style={{ background: `${hit.color ?? '#0000ff'}14` }}><p>محدوده: <b style={{ color: hit.color }}>{hit.name}</b></p><p>قیمت همین الان: <b className="tnum">{fa(priceOf(hit).toLocaleString('en-US'))} تومان</b></p></div>
              : <p className="mt-2 rounded-lg bg-danger-bg p-2 text-danger">خارج از همهٔ محدوده‌ها؛ گزینهٔ پیک ۳ ساعته به مشتری نشان داده نمی‌شود و ارسال عادی پیشنهاد می‌شود.</p>}
            <p className="mt-1.5 flex items-center gap-1 text-t2"><Warehouse size={12} />فاصله از انبار: <b className="tnum">{fa(distKm(o, pin).toFixed(1))} کیلومتر</b></p>
          </> : <p className="text-t2">روی نقشه بزنید.</p>}
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold"><Search size={14} />پشتیبان: تشخیص از متن نشانی</p>
          <Input aria-label="نشانی آزمایشی" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="مثلاً اسلامشهر، خیابان آیت‌الله کاشانی" />
          <p className="mt-1.5">{byText ? <>محدوده: <b style={{ color: byText.color }}>{byText.name}</b> · {fa(priceOf(byText).toLocaleString('en-US'))} تومان</> : <span className="text-t2">در متن نشانی نام هیچ محدوده‌ای پیدا نشد.</span>}</p>
          <p className="mt-1 text-11 leading-5 text-t3">فقط وقتی مشتری پین نگذارد استفاده می‌شود. نام‌ها از ستون «محدوده» خوانده می‌شوند.</p>
        </div>
        <div className="rounded-xl bg-brand-tint/50 p-3 leading-6 text-t2">
          <b className="text-brand">ترتیب تشخیص در سبد خرید</b>
          <ol className="mr-4 list-decimal">
            <li>پین مشتری روی نقشه (دقیق و آنی)</li>
            <li>اگر پین نبود: تبدیل نشانی تایپ‌شده به مختصات با سرویس نقشه</li>
            <li>اگر باز هم نشد: تطبیق نام شهر یا محله</li>
          </ol>
          <p className="mt-1">اگر چند محدوده روی هم بیفتند، کوچک‌ترین و دقیق‌ترین محدوده انتخاب می‌شود.</p>
        </div>
      </div>
    </div>
  )
}
