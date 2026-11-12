import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Check, MapPin, PackageCheck, RotateCcw, ShoppingBag, Timer, Truck, Warehouse } from 'lucide-react'
import { Badge, Button, Card, cx, Select, StatusBadge } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { AreaFunnel } from '@/shared/ui/charts'
import { compactToman, fa, jday, pct } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import { ProductImg, useLookup } from '../pages/_shared'
import { LiveMap } from './LiveMap'
import { UrgentCard } from './Urgent'

const FLOW = ['ship.pending', 'ship.picking', 'ship.packed', 'ship.handed', 'ship.in_transit', 'ship.delivered']
const FLOW_L = ['ثبت و تأیید سفارش', 'جمع‌آوری از قفسه', 'بسته‌بندی و عکس پیش از ارسال', 'تحویل به حامل', 'در مسیر', 'تحویل به مشتری']

/** سربرگ صفحهٔ سفارش‌ها: شاخص‌ها، پیگیری مرسوله و قیف فروش */
export function OrdersOverview() {
  const { d, customer, product } = useLookup(); const nav = useNavigate()
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ o, s }))).filter(({ s }) => !['ship.cancelled'].includes(s.status))
  const [sel, setSel] = useState(ships.find(({ s }) => s.status === 'ship.in_transit' || s.status === 'ship.handed')?.s.id ?? ships[0]?.s.id ?? '')
  const cur = ships.find(({ s }) => s.id === sel)
  const idx = cur ? Math.max(0, FLOW.indexOf(cur.s.status === 'ship.partner_confirm' ? 'ship.pending' : cur.s.status)) : 0
  const live = d.orders.filter((o) => !['order.cancelled'].includes(o.status))
  const gmv = live.reduce((a, o) => a + o.total, 0)
  const at = (i: number) => cur ? new Date(new Date(cur.o.createdAt).getTime() + i * 3.2 * 36e5).toISOString() : ''
  const city = cur ? customer(cur.o.customerId)?.city ?? 'مقصد' : ''
  const prog = idx / (FLOW.length - 1)
  return (
    <div className="mb-4 space-y-3">
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured icon={<ShoppingBag size={17} />} label="کل سفارش‌ها" num={d.orders.length} fmt={(n) => fa(Math.round(n))} delta={6.2} to="/admin/orders?tab=all" />
          <KPI icon={<Banknote size={17} />} label="فروش ناخالص" value={compactToman(gmv)} delta={9.1} to="/admin/finance" />
          <UrgentCard onOpen={(id) => nav(`/admin/orders/${id}`)} onAll={() => nav('/admin/orders?tab=action')} />
          <KPI icon={<RotateCcw size={17} />} label="مرجوعی" value={fa(d.returns.length)} delta={-1.2} goodDown to="/admin/returns" />
        </div>
    <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <Card title="قیف فروش این ماه" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/analytics?tab=funnel')}>تحلیل کامل</Button>}>
          <AreaFunnel onPick={() => nav('/admin/analytics?tab=funnel')} steps={[{ label: 'بازدید کالا', value: 48200, note: 'از همهٔ کانال‌ها' }, { label: 'افزودن به سبد', value: 6120 }, { label: 'شروع پرداخت', value: 2380 }, { label: 'خرید موفق', value: 1460 }]} />
          <p className="mt-2 text-11 text-t2">بیشترین ریزش بین بازدید و سبد است. نرخ تبدیل کل {pct(3)}.</p>
        </Card>
        <Card title="سفارش‌ها بر اساس روش پرداخت" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/finance?tab=paysales')}>نقدی و اقساطی</Button>}>
          <div className="grid gap-2 sm:grid-cols-2">{Object.entries(live.reduce<Record<string, { n: number; v: number }>>((m, o) => { const k = o.pay; m[k] ??= { n: 0, v: 0 }; m[k].n++; m[k].v += o.total; return m }, {})).sort((a, b) => b[1].v - a[1].v).map(([k, x]) => { const bn = d.providers.some((p) => p.family === 'bnpl' && k.includes(p.name)); return (
            <button key={k} onClick={() => nav('/admin/finance?tab=paysales')} className="lift flex items-center gap-3 rounded-xl border border-line p-3 text-right"><span className={cx('grid size-9 place-items-center rounded-full', bn ? 'bg-warning-bg text-warning' : 'bg-brand-tint text-brand')}>{bn ? <Timer size={16} /> : <Banknote size={16} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-13 font-medium">{k}</span><span className="text-11 text-t2">{fa(x.n)} سفارش · {bn ? 'اقساطی' : 'نقدی'}</span></span><b className="tnum text-13">{compactToman(x.v)}</b></button>) })}</div>
        </Card>
      </div>
      <Card title="پیگیری مرسوله" actions={cur && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/orders/${cur.o.id}`)}>سفارش</Button>}>
        <Select value={sel} onChange={setSel} options={ships.map(({ s, o }) => [s.id, `${s.id} · ${customer(o.customerId)?.name ?? ''}`] as [string, string])} />
        {cur && <>
          <div className="mt-3"><LiveMap o={cur.o} s={cur.s} city={city} warehouse={WAREHOUSE[cur.s.warehouse]} onOrder={() => nav(`/admin/orders/${cur.o.id}`)} /></div>
          <div className="mt-3 flex items-center gap-2"><div className="flex -space-x-2 space-x-reverse">{cur.s.items.slice(0, 3).map((i) => <ProductImg key={i.unitId + i.productId} pid={i.productId} size={32} rounded="rounded-full" />)}</div><p className="min-w-0 flex-1 truncate text-12">{cur.s.items.map((i) => product(i.productId)?.en).join('، ')}</p><StatusBadge s={cur.s.status} /></div>
          <p className="mt-1 text-11 text-t2">{cur.s.method}{cur.s.tracking && <> · کد رهگیری <span className="ltr font-mono">{cur.s.tracking}</span></>}</p>
          <ol className="mt-3 space-y-0">{FLOW_L.map((l, i) => { const done = i <= idx; const now = i === idx; return (
            <li key={l} className="relative flex gap-3 pb-3 last:pb-0">
              {i < FLOW_L.length - 1 && <span className={cx('absolute top-6 right-[11px] h-[calc(100%-18px)] w-0.5', i < idx ? 'bg-brand-solid' : 'bg-neutral-bg')} />}
              <span className={cx('relative z-10 grid size-6 shrink-0 place-items-center rounded-md border', done ? 'border-transparent bg-brand-solid text-white' : 'border-line bg-surface text-t3')}>{done ? (i === 2 && cur.s.packPhotos?.length ? <PackageCheck size={13} /> : <Check size={13} />) : null}</span>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2"><div><p className={cx('text-13', done ? 'font-medium' : 'text-t3')}>{l}{now && <span className="mr-1.5"><Badge tone="brand">اکنون</Badge></span>}</p>{done && <p className="text-11 text-t2">{jday(at(i))}</p>}</div>{done && <span className="tnum shrink-0 text-11 text-t3">{new Date(at(i)).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>}</div>
            </li>) })}</ol>
        </>}
      </Card>
    </div>
    </div>
  )
}
