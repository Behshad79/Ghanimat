import { useState } from 'react'
import { MapPinned, MousePointerClick } from 'lucide-react'
import { Badge, Card, cx, Select } from '@/shared/ui/base'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

// نمای سادهٔ ۲۲ منطقهٔ شهرداری تهران (شمال بالا) و شهرهای اطراف؛ جای تقریبی، نه نقشهٔ دقیق
const D: [number, number, number][] = [[22, 0, 0], [5, 1, 0], [2, 2, 0], [3, 3, 0], [1, 4, 0], [4, 5, 0], [21, 0, 1], [9, 1, 1], [10, 2, 1], [6, 3, 1], [7, 4, 1], [8, 5, 1], [13, 6, 1], [18, 0, 2], [17, 1, 2], [11, 2, 2], [12, 3, 2], [14, 4, 2], [15, 5, 2], [19, 1, 3], [16, 2, 3], [20, 3, 3]]
const TOWNS = ['کرج', 'فردیس', 'پردیس', 'اسلامشهر', 'قدس', 'پرند', 'لواسان', 'پاکدشت']
const COLORS = ['#0000ff', '#12a150', '#f97316', '#7c3aed', '#c42f2f', '#0ea5e9']
type Z = { id: string; name: string; cities: string; districts?: number[]; towns?: string[]; active?: boolean }

/** انتخاب منطقهٔ ارسال روی نقشه: روی مناطق بزنید یا بکشید تا «از کجا تا کجا» به منطقهٔ انتخابی اضافه یا از آن کم شود */
export function ZoneMap() {
  const d = useDB(); const Zs = (d.entities.zones ?? []) as unknown as Z[]; const [zid, setZid] = useState(Zs[0]?.id ?? ''); const [paint, setPaint] = useState<null | boolean>(null)
  const color = (id: string) => COLORS[Math.max(0, Zs.findIndex((z) => z.id === id)) % COLORS.length]
  const owner = (n: number) => Zs.find((z) => z.districts?.includes(n))
  const townOwner = (t: string) => Zs.find((z) => z.towns?.includes(t))
  const label = (z: Z) => [z.districts?.length ? `تهران، مناطق ${[...z.districts].sort((a, b) => a - b).map((x) => fa(x)).join('، ')}` : '', ...(z.towns ?? [])].filter(Boolean).join('، ')
  const set = (n: number, on: boolean) => mutate((x) => { const L = (x.entities.zones ?? []) as unknown as Z[]; L.forEach((z) => { z.districts = (z.districts ?? []).filter((y) => y !== n) }); const z = L.find((y) => y.id === zid); if (z && on) z.districts = [...(z.districts ?? []), n]; L.forEach((y) => { if (y.districts?.length || y.towns?.length) y.cities = label(y) }) })
  const setTown = (t: string) => mutate((x) => { const L = (x.entities.zones ?? []) as unknown as Z[]; const z = L.find((y) => y.id === zid); const on = !z?.towns?.includes(t); L.forEach((y) => { y.towns = (y.towns ?? []).filter((q) => q !== t) }); if (z && on) z.towns = [...(z.towns ?? []), t]; L.forEach((y) => { if (y.districts?.length || y.towns?.length) y.cities = label(y) }) }, { action: 'تغییر شهرهای منطقهٔ ارسال', target: t })
  const cur = Zs.find((z) => z.id === zid)
  return (
    <Card title={<span className="flex items-center gap-1.5"><MapPinned size={15} />انتخاب منطقه روی نقشه</span>} actions={<Select className="w-64" value={zid} onChange={setZid} options={Zs.map((z) => [z.id, z.name] as [string, string])} />}>
      <p className="mb-3 flex items-center gap-1 text-12 text-t2"><MousePointerClick size={13} />منطقهٔ ارسال را از بالا انتخاب کنید، بعد روی مناطق شهر بزنید یا روی چند منطقه بکشید تا «از کجا تا کجا» اضافه شود. دوباره زدن، منطقه را برمی‌دارد.</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative mx-auto grid w-full max-w-xl select-none grid-cols-7 gap-1.5 rounded-2xl bg-[#eef1f6] p-3" onPointerUp={() => setPaint(null)} onPointerLeave={() => setPaint(null)} style={{ gridTemplateRows: 'repeat(4, 64px)' }}>
          <span className="absolute top-1 left-2 text-[10px] text-t2">شمال ↑</span>
          {D.map(([n, c, r]) => { const o = owner(n); const mine = o?.id === zid; return (
            <button key={n} type="button" aria-pressed={mine} aria-label={`منطقهٔ ${n}${o ? ` در ${o.name}` : ''}`} onPointerDown={() => { const on = !mine; setPaint(on); set(n, on) }} onPointerEnter={() => { if (paint !== null && mine !== paint) set(n, paint) }}
              className={cx('flex flex-col items-center justify-center rounded-xl border-2 text-12 font-bold transition-colors', mine ? 'text-white' : o ? 'text-t1' : 'border-dashed border-line bg-white text-t2')} style={{ gridColumn: 7 - c, gridRow: r + 1, background: o ? (mine ? color(o.id) : `${color(o.id)}33`) : undefined, borderColor: o ? color(o.id) : undefined }}>
              {fa(n)}<span className="text-[9px] font-normal opacity-80">منطقه</span>
            </button>) })}
        </div>
        <div className="space-y-3">
          <div><p className="mb-1.5 text-12 font-semibold">شهرهای اطراف</p><div className="flex flex-wrap gap-1.5">{TOWNS.map((t) => { const o = townOwner(t); const mine = o?.id === zid; return <button key={t} type="button" aria-pressed={mine} onClick={() => setTown(t)} className={cx('h-8 rounded-full border px-3 text-12', mine ? 'text-white' : '')} style={{ background: mine && o ? color(o.id) : o ? `${color(o.id)}22` : undefined, borderColor: o ? color(o.id) : 'var(--border)' }}>{t}</button> })}</div></div>
          <div><p className="mb-1.5 text-12 font-semibold">راهنما</p><ul className="space-y-1">{Zs.map((z) => <li key={z.id} className="flex items-center gap-2 text-12"><span className="size-3 rounded" style={{ background: color(z.id) }} /><span className="flex-1">{z.name}</span><Badge dot={false}>{fa((z.districts?.length ?? 0) + (z.towns?.length ?? 0))}</Badge></li>)}</ul></div>
          {cur && <p className="rounded-xl bg-neutral-bg p-2.5 text-12 leading-6"><b>{cur.name}:</b> {cur.cities || '—'}</p>}
        </div>
      </div>
    </Card>
  )
}
