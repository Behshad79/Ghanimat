import type { Order, Shipment } from '@/shared/data/seed'
import { cx } from '@/shared/ui/base'
import { useNavigate } from 'react-router-dom'
import { Hourglass, Mail, Maximize2, PackageCheck, PackageOpen, Plus, Zap } from 'lucide-react'
import { Badge, Button, Card, Light, Progress, StatusBadge } from '@/shared/ui/base'
import { ActionChips, AISummary, KPI, Page } from '@/shared/ui/page'
import { Bars, Columns, Donut, Funnel, Gauge, IranTiles, LineChart } from '@/shared/ui/charts'
import { CountUp } from '@/shared/ui/motion'
import { Boxes, Download, LayoutGrid, Package, Percent, Receipt, RotateCcw, ShoppingBag, TrendingUp, Truck } from 'lucide-react'
import { Modal } from '@/shared/ui/overlay'
import { Toggle } from '@/shared/ui/base'
import { currentUser } from '@/shared/lib/store'
import { counted, orderProfit } from '@/shared/lib/profit'
import { ProductImg } from './_shared'
import { useState } from 'react'
import { csv, download, rel } from '@/shared/lib/fa'
import { Hint, toast } from '@/shared/ui/overlay'
import { mutate, notify } from '@/shared/lib/store'
import { compactToman, fa, minsLeft, pct, toman } from '@/shared/lib/fa'
import { SlaChip, useLookup } from './_shared'
import { NAV } from '../shell/nav'
import { CONDITION, WAREHOUSE } from '@/shared/data/statuses'

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان']
const MONTH_SALES = [4.1, 5.3, 4.8, 6.2, 7.1, 6.6, 8.4, 10.8]
const WIDGETS: [string, string][] = [['kpi', 'شاخص‌های اصلی'], ['monthly', 'فروش ماهانه'], ['top', 'پرفروش‌ها'], ['orders', 'سفارش‌های اخیر'], ['goal', 'هدف ماهانه'], ['profit', 'سود من'], ['cats', 'فروش به تفکیک دسته'], ['sources', 'منابع ورودی'], ['map', 'فروش به تفکیک استان'], ['cards', 'کالاهای برتر'], ['ai', 'خلاصهٔ AI']]
export function Home() {
  const { d } = useLookup(); const nav = useNavigate(); const [pick, setPick] = useState(false)
  const hidden: string[] = (d.entities.homeHidden?.[0]?.list as string[]) ?? []
  const on = (k: string) => !hidden.includes(k)
  const toggleW = (k: string) => mutate((x) => { const l = new Set((x.entities.homeHidden?.[0]?.list as string[]) ?? []); l.has(k) ? l.delete(k) : l.add(k); x.entities.homeHidden = [{ id: 'hh', list: [...l] }] }, { action: 'تغییر ویجت‌های خانه', target: k })
  const live = d.orders.filter(counted)
  const today = live.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 864e5)
  const gmv = today.reduce((a, o) => a + o.total, 0)
  const profitToday = today.reduce((a, o) => a + orderProfit(d, o).profit, 0)
  const profitMonth = live.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 30 * 864e5).reduce((a, o) => a + orderProfit(d, o).profit, 0)
  const published = d.units.filter((u) => u.status === 'unit.published')
  const cnt = (id: string) => NAV.find((n) => n.id === id)!.count!(d)
  const me = currentUser()!
  const sold = new Map<string, number>(); live.forEach((o) => o.shipments.forEach((s) => s.items.forEach((i) => sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.price * i.qty))))
  const top = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const cats = new Map<string, number>(); live.forEach((o) => o.shipments.forEach((s) => s.items.forEach((i) => { const c = d.products.find((p) => p.id === i.productId)?.category ?? '—'; cats.set(c, (cats.get(c) ?? 0) + i.price * i.qty) })))
  const prov: Record<string, number> = { تهران: 0 }; live.forEach((o) => { const p = d.customers.find((c) => c.id === o.customerId)?.addr?.province; if (p) prov[p] = (prov[p] ?? 0) + o.total })
  const featuredCards = d.products.filter((p) => p.status === 'product.published' && p.image).slice(0, 4)
  return (
    <Page title={`سلام ${me.name}`} sub={new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())} module="home"
      empty={{ title: 'هنوز داده‌ای برای داشبورد نیست.', desc: 'با ثبت اولین کالا و اولین سفارش، شاخص‌ها اینجا نمایش داده می‌شوند.', action: <Button variant="primary" onClick={() => nav('/admin/settings?tab=setup')}>چک‌لیست راه‌اندازی فروشگاه</Button> }}
      actions={<><Button icon={<Download size={14} />} onClick={() => { download('خلاصهٔ-امروز.csv', csv([['شاخص', 'مقدار'], ['فروش امروز', gmv], ['سفارش امروز', today.length], ['سود امروز', profitToday]])); toast('خلاصهٔ امروز دانلود شد.') }}>خروجی گزارش</Button><Button icon={<LayoutGrid size={14} />} onClick={() => setPick(true)}>چیدمان ویجت‌ها</Button></>}>
      <div className="space-y-4">
        <ActionChips items={[
          { label: 'سفارش منتظر اقدام', count: cnt('orders'), to: '/admin/orders?tab=action', tone: 'danger' },
          { label: 'واحد منتظر QC، عکاسی یا انتشار', count: cnt('warehouse'), to: '/admin/warehouse?tab=qc' },
          { label: 'مرجوعی و گارانتی منتظر بررسی', count: cnt('returns'), to: '/admin/returns' },
          { label: 'تراکنش نامشخص', count: cnt('finance'), to: '/admin/finance?tab=txns', tone: 'danger' },
          { label: 'تیکت باز', count: cnt('support'), to: '/admin/support' },
          { label: 'دیدگاه منتظر تأیید', count: cnt('reviews'), to: '/admin/reviews' },
          { label: 'کالای شریک منتظر تأیید', count: d.partnerQueue.length, to: '/admin/catalog?tab=partner' },
          { label: 'تأیید منتظر من', count: d.approvals.filter((a) => a.status === 'approval.pending').length, to: '/admin/team?tab=approvals' },
        ]} />
        {on('kpi') && <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured icon={<ShoppingBag size={17} />} label="فروش امروز" num={gmv} fmt={compactToman} full={toman(gmv)} delta={12.4} spark={[4, 6, 5, 8, 7, 9, 12]} to="/admin/orders" note="هدف روزانه: ۶۰۰ میلیون" />
          <KPI icon={<TrendingUp size={17} />} label="سود امروز" hint="margin" num={profitToday} fmt={compactToman} delta={9.1} spark={[3, 4, 4, 5, 6, 6, 7]} to="/admin/finance?tab=profit" />
          <KPI icon={<Package size={17} />} label="تعداد سفارش" num={today.length} fmt={(n) => fa(Math.round(n))} delta={8.1} spark={[3, 4, 4, 6, 5, 6, 7]} to="/admin/orders" />
          <KPI icon={<Percent size={17} />} label="نرخ تبدیل" hint="cvr" value={pct(2.1, 1)} delta={-6.2} spark={[9, 8, 8, 7, 8, 6, 6]} to="/admin/growth" />
          <KPI icon={<Receipt size={17} />} label="AOV" hint="aov" num={gmv / Math.max(1, today.length)} fmt={compactToman} delta={3.9} to="/admin/analytics" />
          <KPI icon={<Boxes size={17} />} label="موجودی قابل فروش" num={published.length} fmt={(n) => `${fa(Math.round(n))} واحد`} note={`ارزش: ${compactToman(published.reduce((a, u) => a + u.price, 0))}`} to="/admin/warehouse?tab=stock" />
          <KPI icon={<Truck size={17} />} label="تحویل به‌موقع" hint="sla" value={pct(94)} delta={1.2} to="/admin/shipping" />
          <KPI icon={<RotateCcw size={17} />} label="نرخ مرجوعی" value={pct(6.4, 1)} delta={-1.1} goodDown to="/admin/returns" />
        </div>}
        {on('ai') && <AISummary source="سفارش‌ها، موجودی و هشدارهای ۲۴ ساعت اخیر" lines={[
          `فروش امروز ${compactToman(gmv)} از ${fa(today.length)} سفارش است؛ ۱۲٪ بالاتر از سه‌شنبهٔ معمول.`,
          'درگاه اقساطی تارا پاسخ نمی‌دهد و خودکار از صفحهٔ پرداخت پنهان شده است؛ پرداخت‌ها از سایر درگاه‌ها ادامه دارد.',
          `${fa(d.units.filter((u) => Date.now() - new Date(u.received).getTime() > 30 * 864e5 && u.status === 'unit.published').length)} واحد بیش از ۳۰ روز در انبار مانده؛ پیشنهاد: کاهش پلکانی قیمت.`,
        ]} />}
        <div className="grid gap-4 xl:grid-cols-3">
          {on('monthly') && <Card className="xl:col-span-2" title="فروش ماهانه از اول سال" actions={<><Badge tone="success">+۲۸٪ نسبت به آبان پارسال</Badge><Button size="sm" variant="ghost" icon={<Maximize2 size={13} />} onClick={() => nav('/admin/analytics')}>کاوش</Button></>}>
            <div className="mb-3 flex items-baseline gap-2"><span className="tnum text-24 font-bold">{fa(MONTH_SALES.reduce((a, b) => a + b, 0).toFixed(1))} میلیارد تومان</span><span className="text-12 text-t2">جمع ۸ ماه</span></div>
            <Columns data={MONTHS.map((m, i) => ({ label: m, value: MONTH_SALES[i], sub: `${fa(Math.round(MONTH_SALES[i] * 26))} سفارش` }))} fmt={(n) => `${fa(n.toFixed(1))} میلیارد`} onPick={() => nav('/admin/analytics')} /></Card>}
          {on('top') && <Card title="پرفروش‌ها" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/finance?tab=profit')}>همه</Button>} pad={false}><ul className="divide-y divide-line">{top.map(([pid, v]) => { const p = d.products.find((x) => x.id === pid)!; return <li key={pid}><button onClick={() => nav(`/admin/catalog/${pid}`)} className="flex w-full items-center gap-3 px-5 py-3 text-right hover:bg-surface-2"><ProductImg pid={pid} size={44} /><span className="min-w-0 flex-1"><span className="block truncate text-13 font-medium">{p.en}</span><span className="text-11 text-t2">{p.category}</span></span><span className="tnum text-13 font-bold">{compactToman(v)}</span></button></li> })}</ul></Card>}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {on('orders') && <Card className="xl:col-span-2" title="سفارش‌های اخیر" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/orders')}>همهٔ سفارش‌ها</Button>} pad={false}><ul className="divide-y divide-line">{d.orders.slice(0, 6).map((o) => { const c = d.customers.find((x) => x.id === o.customerId)!; return <li key={o.id}><button onClick={() => nav(`/admin/orders/${o.id}`)} className="flex w-full items-center gap-3 px-5 py-3 text-right hover:bg-surface-2"><span className="flex">{o.shipments.flatMap((s) => s.items).slice(0, 2).map((i, k) => <ProductImg key={k} pid={i.productId} size={40} className={k ? '-mr-3 ring-2 ring-surface' : ''} />)}</span><span className="min-w-0 flex-1"><span className="block text-13 font-medium">{c.name}</span><span className="ltr block text-right font-mono text-11 text-t2">{o.id}</span></span><span className="hidden text-12 text-t2 sm:block">{rel(o.createdAt)}</span><span className="tnum text-13 font-semibold">{compactToman(o.total)}</span><StatusBadge s={o.status} /></button></li> })}</ul></Card>}
          <div className="space-y-4">
            {on('goal') && <Card title="هدف این ماه"><Gauge value={72} label={pct(72)} sub="از هدف ۱۵ میلیارد تومان" /><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[['هدف', '۱۵ میلیارد'], ['فروش', '۱۰٫۸ میلیارد'], ['امروز', compactToman(gmv)]].map(([k, v]) => <div key={k} className="rounded-xl bg-neutral-bg p-2"><p className="text-11 text-t2">{k}</p><p className="tnum text-12 font-bold">{v}</p></div>)}</div></Card>}
            {on('profit') && <Card onClick={() => nav('/admin/finance?tab=profit')} title="سود من"><p className="tnum text-24 font-bold text-success"><CountUp value={profitMonth} format={compactToman} /></p><p className="text-12 text-t2">سود خالص ۳۰ روز اخیر، پس از کسر خرید، کارمزد، ارسال و بسته‌بندی</p></Card>}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {on('cats') && <Card title="فروش به تفکیک دسته"><Donut data={[...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, v], i) => ({ label: l, value: v, color: ['var(--brand-solid)', 'var(--info)', 'var(--purple)', 'var(--warning)', 'var(--success)'][i] }))} center={<span>{fa(cats.size)}<br />دسته</span>} /></Card>}
          {on('sources') && <Card title="منابع ورودی امروز"><Donut data={[{ label: 'ترب', value: 39, color: 'var(--brand-solid)' }, { label: 'جست‌وجوی گوگل', value: 27, color: 'var(--info)' }, { label: 'مستقیم', value: 18, color: 'var(--purple)' }, { label: 'اینستاگرام', value: 10, color: 'var(--warning)' }, { label: 'پیام‌رسان‌ها', value: 6, color: 'var(--success)' }]} center={<span>{fa('4,820')}<br />بازدید</span>} /></Card>}
          {on('map') && <Card title="فروش به تفکیک استان" className="md:col-span-2"><IranTiles values={{ ...prov, البرز: (prov['البرز'] ?? 0) + 4e7, خوزستان: 2.2e7, 'خراسان رضوی': 3.1e7, گیلان: 1.4e7, مازندران: 1.9e7 }} fmt={compactToman} onPick={() => nav('/admin/analytics')} /><p className="mt-2 text-11 text-t2">تهران بیشترین سهم را دارد؛ هر خانه یک استان است و پررنگی آن، فروش ۳۰ روز اخیر را نشان می‌دهد.</p></Card>}
        </div>
        {on('cards') && <Card title="کالاهای برتر این هفته" actions={<Button size="sm" variant="ghost" onClick={() => nav('/admin/catalog')}>همهٔ کالاها</Button>}><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{featuredCards.map((p) => { const u = d.units.find((x) => x.productId === p.id && x.status === 'unit.published'); const price = u?.price ?? p.price ?? 0; const off = p.priceNew > price ? Math.round((1 - price / p.priceNew) * 100) : 0; return (
          <button key={p.id} onClick={() => nav(`/admin/catalog/${p.id}`)} className="lift group overflow-hidden rounded-2xl border border-line bg-surface text-right"><div className="relative aspect-[4/3] overflow-hidden bg-white"><img src={p.image} alt={p.title} style={{ objectPosition: p.imagePos ?? '50% 50%' }} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />{off > 0 && <span className="tnum absolute top-2 left-2 rounded-md bg-danger-solid px-1.5 py-0.5 text-11 font-bold text-white">{fa(off)}٪ ارزان‌تر از نو</span>}</div><div className="p-3"><p className="truncate text-13 font-semibold">{p.en}</p><p className="text-11 text-t2">{p.category}</p><div className="mt-2 flex items-center justify-between"><span className="tnum text-13 font-bold">{compactToman(price)}</span><span className="rounded-md bg-neutral-bg px-1.5 py-0.5 text-11">{fa(Math.round(p.cvr * 9))} فروش</span></div></div></button>) })}</div></Card>}
        {(d.entities.homeWidgets ?? []).length > 0 && <div className="grid gap-4 md:grid-cols-2">{d.entities.homeWidgets.map((w) => <Card key={w.id} title={w.name} actions={<Button size="sm" variant="ghost" onClick={() => mutate((x) => { x.entities.homeWidgets = x.entities.homeWidgets.filter((y) => y.id !== w.id) }, { action: 'حذف ویجت سنجاق‌شده', target: w.name })}>برداشتن</Button>}><Bars data={[['استوک', 46], ['جعبه‌باز', 31], ['اکبند', 23]].map(([l, v]) => ({ label: l as string, value: v as number }))} fmt={pct} /></Card>)}</div>}
      </div>
      <Modal open={pick} onClose={() => setPick(false)} title="چیدمان ویجت‌های خانه"><ul className="space-y-2">{WIDGETS.map(([k, l]) => <li key={k} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-13"><span>{l}</span><Toggle on={on(k)} label={l} onChange={() => toggleW(k)} /></li>)}</ul><p className="mt-3 text-11 text-t2">از «تحلیل و گزارش» یا دستیار غنیمت هم می‌توانید نمودار دلخواه را به خانه سنجاق کنید.</p></Modal>
    </Page>
  )
}

const TOWER: [string, [string, 'ok' | 'warn' | 'crit', string, string][]][] = [
  ['کسب‌وکار', [['فروش لحظه‌ای در برابر پیش‌بینی', 'ok', '۱۰۸٪ پیش‌بینی', '/admin'], ['نرخ تبدیل زنده', 'warn', '۲٫۱٪ (معمول ۲٫۴٪)', '/admin/growth']]],
  ['عملیات', [['صف‌های QC، عکاسی و انتشار', 'ok', 'در مهلت', '/admin/warehouse?tab=qc'], ['سفارش‌های در خطر مهلت', 'warn', '۲ مرسوله', '/admin/orders'], ['مرسوله‌های بی‌حرکت', 'ok', 'صفر', '/admin/shipping']]],
  ['پرداخت', [['درگاه‌های نقدی', 'ok', 'موفقیت ۹۹٪', '/admin/finance'], ['سرویس‌های اقساطی', 'crit', 'یک سرویس قطع', '/admin/finance?tab=gateways'], ['تراکنش‌های نامشخص', 'warn', '۲ مورد', '/admin/finance?tab=txns']]],
  ['ارتباطات', [['تحویل پیامک کد ورود', 'ok', '۴ ثانیه', '/admin/infra'], ['اعتبار پنل پیامک', 'warn', '۹ روز مانده', '/admin/infra']]],
  ['کانال‌ها', [['فید کانال‌های فروش', 'ok', '۳ دقیقه پیش', '/admin/channels'], ['ناهماهنگی موجودی شریک', 'warn', '۲ کالا', '/admin/warehouse?tab=sync']]],
  ['فنی', [['در دسترس بودن سایت', 'ok', '۹۹٫۹۶٪', '/admin/infra'], ['آزمون خودکار مسیر خرید', 'ok', '۶ دقیقه پیش موفق', '/admin/infra']]],
  ['امنیت و بازار', [['ورودهای مشکوک', 'ok', 'صفر', '/admin/team?tab=audit'], ['نرخ ارز', 'warn', 'دلار ۱٫۸٪ بالا رفت', '/admin/pricing']]],
]
export function Live() {
  const { d, product, customer } = useLookup(); const nav = useNavigate()
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, order: o })))
  const cols: [string, string[]][] = [['در انتظار', ['ship.pending', 'ship.partner_confirm']], ['جمع‌آوری و بسته‌بندی', ['ship.picking', 'ship.packed']], ['در مسیر', ['ship.handed', 'ship.in_transit']], ['تحویل‌شدهٔ امروز', ['ship.delivered']]]
  return (
    <Page title="مرکز عملیات زنده" sub="هر چراغ سه حالت دارد: سالم، هشدار، بحران" module="live" badge={<Badge tone="success">زنده</Badge>}
      empty={{ title: 'امروز هنوز سفارشی ثبت نشده است.', desc: 'سفارش‌های امروز به تفکیک مرحله اینجا نمایش داده می‌شوند.' }}
      actions={<Button icon={<Maximize2 size={14} />} onClick={() => document.documentElement.requestFullscreen?.()}>تمام‌صفحه</Button>}
      primary={<Button variant="primary" onClick={() => { mutate((x) => { x.entities.incidents.unshift({ id: `in-${Date.now().toString(36)}`, title: 'رخداد تازه از مرکز عملیات', owner: 'مسئول فنی', severity: 'متوسط', status: 'باز', at: new Date().toISOString().slice(0, 16) }) }, { action: 'باز کردن رخداد', target: 'مرکز عملیات' }); notify('رخداد تازه باز شد', 'از مرکز عملیات زنده؛ به مسئول فنی اطلاع داده شد.', '/admin/infra', 'سیستم', 'warning'); toast('رخداد باز شد و به مسئول فنی اطلاع داده شد.'); nav('/admin/infra') }}>باز کردن رخداد</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="کاربر آنلاین" value={fa(138)} spark={[4, 6, 7, 6, 8, 9, 8]} note="۲۳ نفر در صفحهٔ پرداخت" />
          <KPI label="سبد فعال" tone="info" value={fa(27)} note="ارزش: ۹۱۲ میلیون تومان" to="/admin/orders?tab=carts" />
          <KPI label="پرداخت در جریان" tone="warning" priority={false} value={fa(3)} note="میانگین ۴۰ ثانیه در درگاه" to="/admin/finance?tab=txns" />
          <KPI label="ظرفیت بازه‌های امروز" tone="success" value={pct(72)} note="بازهٔ ۱۸ تا ۲۱ تکمیل است" to="/admin/shipping?tab=slots" />
        </div>
        <Pipeline ships={ships} />
        <Card title={<>برج پایش<Hint k="sla" /></>}>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            {TOWER.map(([g, lights]) => (
              <div key={g}><p className="mb-2 text-12 font-semibold text-t2">{g}</p>
                <ul className="space-y-1.5">{lights.map(([l, s, v, to]) => <li key={l}><button onClick={() => nav(to)} className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-right text-12 hover:bg-neutral-bg"><span className="flex items-center gap-2"><Light s={s} />{l}</span><span className="tnum shrink-0 text-t3">{v}</span></button></li>)}</ul>
              </div>
            ))}
          </div>
        </Card>
        <Card title="آخرین تغییرات قوانین، قیمت‌ها و تنظیمات">
          <ul className="space-y-1 text-12">{d.audit.slice(0, 5).map((a, i) => <li key={i} className="flex justify-between gap-2"><span>{a.who}: {a.action} · <span className="text-t2">{a.target}</span></span><span className="shrink-0 text-t3">{CONDITION[''] ?? ''}{new Date(a.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></li>)}</ul>
        </Card>
      </div>
    </Page>
  )
}

/** بُرد زندهٔ مرسوله‌ها: چهار مرحله با رنگ و آیکون خودش، نوار سهم و کارت‌های یک‌شکل */
const STAGES: { key: string; title: string; sts: string[]; color: string; icon: typeof Truck; anim: string }[] = [
  { key: 'wait', title: 'در انتظار', sts: ['ship.pending', 'ship.partner_confirm'], color: '#b45309', icon: Hourglass, anim: 'kpi-float' },
  { key: 'pick', title: 'جمع‌آوری و بسته‌بندی', sts: ['ship.picking', 'ship.packed', 'ship.pickup_ready'], color: '#0e7490', icon: PackageOpen, anim: 'kpi-bounce' },
  { key: 'road', title: 'در مسیر', sts: ['ship.handed', 'ship.in_transit'], color: '#0000ff', icon: Truck, anim: 'kpi-drive' },
  { key: 'done', title: 'تحویل‌شدهٔ امروز', sts: ['ship.delivered'], color: '#12733f', icon: PackageCheck, anim: 'kpi-beat' },
]
function Pipeline({ ships }: { ships: (Shipment & { order: Order })[] }) {
  const { product, customer } = useLookup(); const nav = useNavigate()
  const active = ships.filter((s) => STAGES.some((st) => st.sts.includes(s.status)))
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((st) => { const list = active.filter((s) => st.sts.includes(s.status)).sort((a, b) => minsLeft(a.sla) - minsLeft(b.sla)); const late = list.filter((s) => st.key !== 'done' && minsLeft(s.sla) < 60).length; const I = st.icon; return (
        <section key={st.key} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface" style={{ backgroundImage: `linear-gradient(180deg, ${st.color}12, transparent 120px)` }}>
          <header className="flex items-center gap-2.5 px-3 pt-3">
            <span className={cx('kpi-ico grid size-9 place-items-center rounded-xl text-white', st.anim)} style={{ background: st.color }}><I size={17} /></span>
            <span className="min-w-0 flex-1"><b className="block text-13">{st.title}</b><span className="text-11 text-t2">{late > 0 ? <span className="font-semibold text-danger">{fa(late)} مورد زیر یک ساعت</span> : st.key === 'done' ? 'تحویل‌های امروز' : 'همه در مهلت'}</span></span>
            <span className="tnum text-22 font-bold" style={{ color: st.color }}>{fa(list.length)}</span>
          </header>
          <div className="mx-3 mt-2 h-1 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full" style={{ width: `${(list.length / Math.max(1, active.length)) * 100}%`, background: st.color }} /></div>
          <ul className="max-h-96 flex-1 space-y-2 overflow-y-auto p-3">
            {list.length === 0 && <li className="grid place-items-center gap-1 py-8 text-center text-12 text-t3"><I size={22} className="opacity-40" />موردی در این مرحله نیست.</li>}
            {list.map((s) => { const fast = /سریع|پیک|اسنپ/.test(s.method); return (
              <li key={s.id}><button type="button" onClick={() => nav(`/admin/orders/${s.order.id}`)} className={cx('lift relative block w-full overflow-hidden rounded-xl border border-line bg-surface p-2.5 pr-3.5 text-right', st.key === 'done' && 'opacity-80')}>
                <span className="absolute inset-y-0 right-0 w-1" style={{ background: st.color }} />
                <span className="flex items-center justify-between gap-2"><span className="ltr font-mono text-12 font-semibold">{s.id}</span><SlaChip at={s.sla} done={s.status === 'ship.delivered'} /></span>
                <span className="mt-2 flex items-center gap-2"><ProductImg pid={s.items[0]?.productId ?? ''} size={34} /><span className="min-w-0 flex-1"><span className="block truncate text-12 font-medium">{s.items.map((i) => product(i.productId).en).join('، ')}</span><span className="block truncate text-11 text-t2">{customer(s.order.customerId).name}</span></span></span>
                <span className="mt-2 flex items-center justify-between gap-2 text-11"><span className="flex min-w-0 items-center gap-1 text-t2">{fast ? <Zap size={12} className="shrink-0 text-brand" /> : <Mail size={12} className="shrink-0" />}<span className="truncate">{s.method}</span></span><span className="shrink-0 rounded-full bg-neutral-bg px-2 py-0.5 text-t2">{WAREHOUSE[s.warehouse]}</span></span>
              </button></li>) })}
          </ul>
        </section>) })}
    </div>
  )
}
