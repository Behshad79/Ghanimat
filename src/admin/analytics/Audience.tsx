import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, MonitorSmartphone } from 'lucide-react'
import { Button, Card, cx, Segmented } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { Donut, LineChart } from '@/shared/ui/charts'
import { useDB } from '@/shared/lib/store'
import { csv, download, fa, num } from '@/shared/lib/fa'
import { ProductImg } from '../pages/_shared'

const DAYS = 15
const dayLabel = (i: number) => new Date(Date.now() - (DAYS - 1 - i) * 864e5).toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' })
const wave = (i: number, base: number, amp: number, seed: number) => Math.round(base + amp * Math.sin(i * 0.9 + seed) + (((i * 7919 + seed * 104729) % 97) / 97 - 0.5) * amp)

/** حلقه‌های هم‌مرکز برای سهم مرورگرها */
function Rings({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((x) => x.value), 1); const W = 220; const c = W / 2
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox={`0 0 ${W} ${W}`} className="size-52 shrink-0 -rotate-90">{data.map((x, i) => { const r = 96 - i * 15; const len = 2 * Math.PI * r; return <g key={x.label}><circle cx={c} cy={c} r={r} fill="none" stroke="var(--neutral-bg)" strokeWidth={10} /><circle cx={c} cy={c} r={r} fill="none" stroke={x.color} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${(x.value / max) * len * 0.75} ${len}`} className="transition-all duration-700" /></g> })}</svg>
      <ul className="space-y-1.5 text-12">{data.map((x) => <li key={x.label} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: x.color }} /><span className="ltr w-28 text-right">{x.label}</span><b className="tnum">{fa(x.value)}٪</b></li>)}</ul>
    </div>
  )
}

/** ستون‌های گروهی فروشگاه و وبلاگ */
function GroupBars({ a, b, labels }: { a: number[]; b: number[]; labels: string[] }) {
  const max = Math.max(...a, ...b, 1); const [hov, setHov] = useState<number | null>(null)
  return (
    <div className="relative">
      <div dir="ltr" className="flex h-48 items-end gap-1.5 border-b border-line">{a.map((v, i) => <div key={i} className="relative flex h-full flex-1 items-end justify-center gap-0.5" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
        <span className="w-1/2 max-w-3 rounded-t bg-brand-solid transition-all" style={{ height: `${(v / max) * 100}%` }} />
        <span className="w-1/2 max-w-3 rounded-t bg-[#ffc24b] transition-all" style={{ height: `${(b[i] / max) * 100}%` }} />
        {hov === i && <span className="absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-[#10123d] px-2 py-1 text-11 text-white">{labels[i]} · فروشگاه {fa(v)} · وبلاگ {fa(b[i])}</span>}
      </div>)}</div>
      <div dir="ltr" className="mt-1 flex gap-1.5">{labels.map((l, i) => <span key={i} className="tnum flex-1 text-center text-[10px] text-t3">{i % 2 ? ' ' : l}</span>)}</div>
    </div>
  )
}

type Per = 'all' | 'today' | 'week' | 'month'
const PER: [Per, string][] = [['all', 'همه'], ['today', 'امروز'], ['week', 'هفته'], ['month', 'ماه']]
const FACTOR: Record<Per, number> = { all: 1, month: 0.34, week: 0.09, today: 0.014 }

/** مخاطبان: بازدید فروشگاه و وبلاگ، مرورگر و سیستم‌عامل، پرفروش‌ها و پربازدیدها */
export function Audience() {
  const d = useDB(); const nav = useNavigate(); const [per, setPer] = useState<Per>('all'); const [perB, setPerB] = useState<Per>('all')
  const labels = Array.from({ length: DAYS }, (_, i) => dayLabel(i))
  const shopPv = labels.map((_, i) => wave(i, 1850, 420, 1)); const blogPv = labels.map((_, i) => wave(i, 640, 210, 3))
  const shopU = labels.map((_, i) => wave(i, 520, 110, 2)); const blogU = labels.map((_, i) => wave(i, 260, 70, 5))
  const sum = (x: number[]) => x.reduce((p, q) => p + q, 0)
  const browsers = [{ label: 'Chrome', value: 54, color: '#0000ff' }, { label: 'Safari', value: 27, color: '#ffc24b' }, { label: 'Samsung Internet', value: 9, color: '#12733f' }, { label: 'Firefox', value: 6, color: '#a64b07' }, { label: 'Edge', value: 4, color: '#7c3aed' }]
  const os = [{ label: 'Android', value: 58, color: '#12733f' }, { label: 'iOS', value: 27, color: '#ffc24b' }, { label: 'Windows', value: 11, color: '#0000ff' }, { label: 'macOS', value: 3, color: '#10123d' }, { label: 'Linux', value: 1, color: '#9aa0b8' }]
  const sold = useMemo(() => { const m: Record<string, number> = {}; d.orders.forEach((o) => o.shipments.forEach((s) => s.items.forEach((it) => { m[it.productId] = (m[it.productId] ?? 0) + it.qty }))); return m }, [d.orders])
  const best = d.products.map((p) => ({ p, n: Math.max(0, Math.round((sold[p.id] ?? 0) * (per === 'all' ? 6 : per === 'month' ? 3 : per === 'week' ? 1 : (sold[p.id] ? 1 : 0)))) })).sort((a, b) => b.n - a.n).slice(0, 10)
  const viewed = [...d.products].sort((a, b) => b.views - a.views).slice(0, 10)
  const posts = [...d.blog.posts].filter((p) => p.status === 'منتشرشده').sort((a, b) => b.views - a.views).slice(0, 10)
  const exportTop = () => download('top-products.csv', csv([['کالا', 'فروش', 'بازدید'], ...d.products.map((p) => [p.title, sold[p.id] ?? 0, p.views])]))
  const row = (rank: number, pid: string, title: string, val: string) => <li key={pid + rank} onClick={() => nav(`/admin/catalog/${pid}`)} className="flex cursor-pointer items-center gap-3 px-4 py-2 text-13 hover:bg-surface-2"><b className={cx('tnum w-5 text-center', rank < 3 ? 'text-brand' : 'text-t3')}>{fa(rank + 1)}</b><ProductImg pid={pid} size={34} /><span className="min-w-0 flex-1 truncate">{title}</span><b className="tnum">{val}</b></li>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="بازدید صفحه در ۱۵ روز" value={num(sum(shopPv) + sum(blogPv))} spark={shopPv.slice(-7)} />
        <KPI label="بازدیدکنندهٔ یکتا در ۱۵ روز" value={num(sum(shopU) + sum(blogU))} spark={shopU.slice(-7)} />
        <KPI label="سهم وبلاگ از بازدید" value={`${fa(Math.round(sum(blogPv) * 100 / (sum(shopPv) + sum(blogPv))))}٪`} note="ورودی محتوایی به فروشگاه" />
        <KPI label="سهم موبایل" value="۸۵٪" note="Android و iOS" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="بازدید صفحه در ۱۵ روز اخیر" actions={<span className="flex gap-3 text-11"><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brand-solid" />فروشگاه</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#ffc24b]" />وبلاگ</span></span>}><GroupBars a={shopPv} b={blogPv} labels={labels} /></Card>
        <Card title="بازدیدکنندهٔ یکتا در ۱۵ روز اخیر"><LineChart labels={labels} series={[{ name: 'فروشگاه', data: shopU, color: 'var(--brand)' }, { name: 'وبلاگ', data: blogU, color: '#ffc24b' }]} h={210} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-1.5"><MonitorSmartphone size={15} />مرورگر کاربران</span>}><Rings data={browsers} /><p className="mt-3 text-11 text-t2">صفحهٔ پرداخت و گالری عکس واحدها روی Safari و Samsung Internet هم آزموده شود؛ ۳۶٪ خریداران با این دو مرورگر می‌آیند.</p></Card>
        <Card title="سیستم‌عامل کاربران"><Donut data={os} center={<span className="text-12">۵۸٪<br />Android</span>} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="۱۰ کالای پرفروش" pad={false} actions={<Segmented size="sm" value={per} onChange={setPer} options={PER} />}><ul className="divide-y divide-line">{best.map((x, i) => row(i, x.p.id, x.p.title, `${fa(x.n)} فروش`))}</ul></Card>
        <Card title="۱۰ کالای پربازدید" pad={false} actions={<Segmented size="sm" value={perB} onChange={setPerB} options={PER} />}><ul className="divide-y divide-line">{viewed.map((p, i) => row(i, p.id, p.title, `${fa(Math.max(1, Math.round(p.views * FACTOR[perB])))} بازدید`))}</ul></Card>
      </div>
      <Card title="مقاله‌های پربازدید وبلاگ" pad={false} actions={<Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={exportTop}>خروجی کالاها</Button>}>
        <ul className="divide-y divide-line">{posts.map((p, i) => <li key={p.id} onClick={() => nav(`/admin/blog/${p.id}`)} className="flex cursor-pointer items-center gap-3 px-4 py-2 text-13 hover:bg-surface-2"><b className={cx('tnum w-5 text-center', i < 3 ? 'text-brand' : 'text-t3')}>{fa(i + 1)}</b>{p.cover ? <img src={p.cover} alt="" className="size-9 rounded-lg bg-neutral-bg object-cover" /> : <span className="size-9 rounded-lg bg-neutral-bg" />}<span className="min-w-0 flex-1 truncate">{p.title}</span><span className="hidden text-11 text-t2 sm:block">{p.category}</span><b className="tnum">{fa(p.views)} بازدید</b></li>)}</ul>
        {posts.length === 0 && <p className="p-4 text-13 text-t2">هنوز مقالهٔ منتشرشده‌ای نیست.</p>}
      </Card>
    </div>
  )
}
