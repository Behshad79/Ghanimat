import { useNavigate } from 'react-router-dom'
import { Maximize2, Plus } from 'lucide-react'
import { Badge, Button, Card, Light, Progress, StatusBadge } from '@/shared/ui/base'
import { ActionChips, AISummary, KPI, Page } from '@/shared/ui/page'
import { Bars, Donut, Funnel, LineChart } from '@/shared/ui/charts'
import { Hint, toast } from '@/shared/ui/overlay'
import { mutate, notify } from '@/shared/lib/store'
import { compactToman, fa, minsLeft, pct, toman } from '@/shared/lib/fa'
import { SlaChip, useLookup } from './_shared'
import { NAV } from '../shell/nav'
import { CONDITION, WAREHOUSE } from '@/shared/data/statuses'

const HOURS = ['۸', '۹', '۱۰', '۱۱', '۱۲', '۱۳', '۱۴', '۱۵', '۱۶', '۱۷', '۱۸', '۱۹']
export function Home() {
  const { d, product, rule } = useLookup(); const nav = useNavigate()
  const live = d.orders.filter((o) => !['order.cancelled', 'order.awaiting_payment'].includes(o.status))
  const today = live.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 864e5)
  const gmv = today.reduce((a, o) => a + o.total, 0)
  const published = d.units.filter((u) => u.status === 'unit.published')
  const cnt = (id: string) => NAV.find((n) => n.id === id)!.count!(d)
  return (
    <Page title="خانه" sub="داشبورد اجرایی · به‌روز تا همین حالا" module="home"
      empty={{ title: 'هنوز داده‌ای برای داشبورد نیست.', desc: 'با ثبت اولین کالا و اولین سفارش، شاخص‌ها اینجا نمایش داده می‌شوند. چک‌لیست راه‌اندازی را دنبال کنید.', action: <Button variant="primary" onClick={() => nav('/admin/settings?tab=setup')}>چک‌لیست راه‌اندازی فروشگاه</Button> }}
      actions={<Button icon={<Plus size={14} />} onClick={() => toast('ویجت‌ها قابل افزودن، حذف و جابه‌جایی‌اند. در نسخهٔ نمایشی چیدمان ثابت است.')}>افزودن ویجت</Button>}>
      <div className="space-y-4">
        <ActionChips items={[
          { label: 'سفارش منتظر اقدام', count: cnt('orders'), to: '/admin/orders?tab=action', tone: 'danger' },
          { label: 'واحد منتظر QC، عکاسی یا انتشار', count: cnt('warehouse'), to: '/admin/warehouse' },
          { label: 'مرجوعی و گارانتی منتظر بررسی', count: cnt('returns'), to: '/admin/returns' },
          { label: 'تراکنش نامشخص', count: cnt('finance'), to: '/admin/finance?tab=txns', tone: 'danger' },
          { label: 'تیکت باز', count: cnt('support'), to: '/admin/support' },
          { label: 'دیدگاه منتظر تأیید', count: cnt('reviews'), to: '/admin/reviews' },
          { label: 'کالای شریک منتظر تأیید', count: d.partnerQueue.length, to: '/admin/catalog?tab=partner' },
          { label: 'تأیید منتظر من', count: d.approvals.filter((a) => a.status === 'approval.pending').length, to: '/admin/team?tab=approvals' },
        ]} />
        <AISummary source="سفارش‌ها، موجودی و هشدارهای ۲۴ ساعت اخیر" lines={[
          `فروش امروز ${compactToman(gmv)} از ${fa(today.length)} سفارش است؛ ۱۲٪ بالاتر از سه‌شنبهٔ معمول.`,
          'درگاه اقساطی تارا پاسخ نمی‌دهد و خودکار از صفحهٔ پرداخت پنهان شده است؛ پرداخت‌ها از سایر درگاه‌ها ادامه دارد.',
          'یک مرسوله از انبار مهاباد منتظر تأیید موجودی شریک است و مهلت آن رو به پایان است.',
          `${fa(d.units.filter((u) => Date.now() - new Date(u.received).getTime() > 30 * 864e5 && u.status === 'unit.published').length)} واحد بیش از ۳۰ روز در انبار مانده؛ پیشنهاد: کاهش پلکانی قیمت.`,
        ]} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI label="فروش امروز" hint="gmv" value={compactToman(gmv)} full={toman(gmv)} delta={12.4} spark={[4, 6, 5, 8, 7, 9, 12]} to="/admin/orders" note="هدف روزانه: ۶۰۰ میلیون تومان" />
          <KPI label="تعداد سفارش" value={fa(today.length)} delta={8.1} spark={[3, 4, 4, 6, 5, 6, 7]} to="/admin/orders" />
          <KPI label="AOV" hint="aov" value={compactToman(gmv / Math.max(1, today.length))} delta={3.9} spark={[5, 5, 6, 6, 7, 6, 7]} to="/admin/analytics" />
          <KPI label="نرخ تبدیل" hint="cvr" value={pct(2.1, 1)} delta={-6.2} spark={[9, 8, 8, 7, 8, 6, 6]} to="/admin/growth" note="افت اصلی در مرحلهٔ اعتبارسنجی اقساط" />
          <KPI label="حاشیهٔ سود ناخالص" hint="margin" value={pct(14.8, 1)} delta={0.6} spark={[5, 6, 6, 6, 7, 7, 7]} to="/admin/finance?tab=profit" />
          <KPI label="موجودی قابل فروش" value={`${fa(published.length)} واحد`} full={toman(published.reduce((a, u) => a + u.price, 0))} note={`ارزش: ${compactToman(published.reduce((a, u) => a + u.price, 0))}`} to="/admin/warehouse" />
          <KPI label="تحویل به‌موقع" hint="sla" value={pct(94)} delta={1.2} spark={[7, 8, 8, 9, 8, 9, 9]} to="/admin/shipping" />
          <KPI label="نرخ مرجوعی" value={pct(6.4, 1)} delta={-1.1} goodDown spark={[8, 8, 7, 7, 6, 7, 6]} to="/admin/returns" />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title="فروش امروز از دیروز بهتر است؟" actions={<Button size="sm" variant="ghost" icon={<Maximize2 size={13} />} onClick={() => nav('/admin/analytics')}>کاوش</Button>}>
            <LineChart labels={HOURS} events={[{ i: 6, label: 'قطعی تارا' }]} series={[{ name: 'امروز', color: 'var(--brand)', data: [12, 30, 58, 92, 140, 171, 180, 236, 301, 352, 410, 468] }, { name: 'دیروز', color: 'var(--text-3)', dashed: true, data: [10, 26, 49, 80, 118, 150, 189, 220, 262, 300, 349, 402] }]} />
            <p className="mt-2 text-11 text-t3">واحد: میلیون تومان، تجمعی · محور زمان از چپ به راست</p>
          </Card>
          <Card title="قیف خرید امروز"><Funnel onPick={() => nav('/admin/growth')} steps={[{ label: 'بازدید', value: 4820 }, { label: 'صفحهٔ کالا', value: 2910 }, { label: 'سبد', value: 402 }, { label: 'پرداخت', value: 148 }, { label: 'موفق', value: 101 }]} /></Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="پرفروش‌های این هفته"><Bars onPick={() => nav('/admin/catalog')} data={d.products.filter((p) => p.cvr > 0).sort((a, b) => b.cvr - a.cvr).slice(0, 5).map((p) => ({ label: p.en, value: Math.round(p.cvr * 9) }))} fmt={(n) => `${fa(n)} فروش`} /></Card>
          <Card title="سهم روش پرداخت"><Donut center={<span>نقدی<br />{fa(67)}٪</span>} data={[{ label: 'درگاه نقدی', value: 63, color: 'var(--brand)' }, ...d.providers.filter((p) => p.family === 'bnpl' && p.status !== 'prov.retired').map((p, i) => ({ label: p.name, value: p.share, color: ['var(--info)', 'var(--purple)', 'var(--warning)', 'var(--success)'][i % 4] })), { label: 'کیف پول', value: 4, color: 'var(--text-3)' }]} /></Card>
          <Card title="اهداف این ماه">
            {[['فروش ماهانه', 62], ['حاشیهٔ سود ۱۵٪', 98], ['رعایت وعدهٔ تحویل سریع', 94], ['واحد منتشرشده', 71]].map(([l, v]) => <div key={l} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-12"><span className="text-t2">{l}</span><span className="tnum font-medium">{pct(v as number)}</span></div><Progress value={v as number} tone={(v as number) > 90 ? 'success' : 'brand'} /></div>)}
          </Card>
        </div>
      </div>
    </Page>
  )
}

const TOWER: [string, [string, 'ok' | 'warn' | 'crit', string, string][]][] = [
  ['کسب‌وکار', [['فروش لحظه‌ای در برابر پیش‌بینی', 'ok', '۱۰۸٪ پیش‌بینی', '/admin'], ['نرخ تبدیل زنده', 'warn', '۲٫۱٪ (معمول ۲٫۴٪)', '/admin/growth']]],
  ['عملیات', [['صف‌های QC، عکاسی و انتشار', 'ok', 'در مهلت', '/admin/warehouse'], ['سفارش‌های در خطر مهلت', 'warn', '۲ مرسوله', '/admin/orders'], ['مرسوله‌های بی‌حرکت', 'ok', 'صفر', '/admin/shipping']]],
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
          <KPI label="کاربر آنلاین" value={fa(138)} spark={[4, 6, 7, 6, 8, 9, 8]} />
          <KPI label="سبد فعال" value={fa(27)} note="ارزش: ۹۱۲ میلیون تومان" to="/admin/orders?tab=carts" />
          <KPI label="پرداخت در جریان" value={fa(3)} to="/admin/finance?tab=txns" />
          <KPI label="ظرفیت بازه‌های امروز" value={pct(72)} note="بازهٔ ۱۸ تا ۲۱ تکمیل است" to="/admin/shipping" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cols.map(([title, sts]) => { const list = ships.filter((s) => sts.includes(s.status)); return (
            <Card key={title} title={<>{title}<span className="tnum mr-1 rounded-full bg-neutral-bg px-1.5 text-11">{fa(list.length)}</span></>} pad={false}>
              <ul className="max-h-80 space-y-2 overflow-y-auto p-2">
                {list.length === 0 && <li className="px-2 py-6 text-center text-12 text-t3">موردی در این مرحله نیست.</li>}
                {list.sort((a, b) => minsLeft(a.sla) - minsLeft(b.sla)).map((s) => (
                  <li key={s.id}><button onClick={() => nav(`/admin/orders/${s.order.id}`)} className="block w-full rounded-md border border-line p-2 text-right hover:border-brand">
                    <div className="flex items-center justify-between"><span className="ltr font-mono text-12 font-semibold">{s.id}</span><SlaChip at={s.sla} done={s.status === 'ship.delivered'} /></div>
                    <p className="mt-1 truncate text-12">{s.items.map((i) => product(i.productId).en).join('، ')}</p>
                    <p className="mt-1 flex items-center justify-between text-11 text-t3"><span>{customer(s.order.customerId).name} · {s.method}</span><span>{WAREHOUSE[s.warehouse]}</span></p>
                    <div className="mt-1"><StatusBadge s={s.status} /></div>
                  </button></li>
                ))}
              </ul>
            </Card>
          ) })}
        </div>
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
