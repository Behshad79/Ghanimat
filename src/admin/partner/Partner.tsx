import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Building2, FileText, Home, Link2, Minus, Package, Plus, ShoppingBag, Store, Truck, Wallet } from 'lucide-react'
import { DemoBar } from '../shell/Shell'
import { Avatar, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Select, StatusBadge, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { KPI, Stepper } from '@/shared/ui/page'
import { Area } from '@/shared/ui/charts'
import { mutate, notify, setSession, snapshot, useDB, useSession, currentUser } from '@/shared/lib/store'
import { EntityManager } from '@/shared/ui/entity'
import { compactToman, csv, download, fa, left, minsLeft, rel, toman } from '@/shared/lib/fa'
import { CAPITAL, statement, type Capital } from '@/shared/data/partners'
import { partnerTheme } from './theme'
import { ProductImg } from '../pages/_shared'

/** پرتال شعبه و شریک فروش: همان چیدمان پنل مدیریت، با رنگ خود شعبه. فقط دادهٔ همین شعبه نمایش داده می‌شود؛ هیچ دادهٔ مالی یا مشتری دیگر غنیمت اینجا نیست. */
type Tab = 'home' | 'orders' | 'stock' | 'fast' | 'money' | 'contract' | 'sites'
export function Partner() {
  const d = useDB(); const s = useSession(); const nav = useNavigate(); const me = currentUser()!
  const P = d.partners.find((x) => x.id === s.partnerId) ?? d.partners.find((x) => x.userId === me.id) ?? d.partners[0]
  const st = statement(P, d.lots)
  const [tab, setTab] = useState<Tab>('home'); const [track, setTrack] = useState<string | null>(null); const [code, setCode] = useState(''); const [carrier, setCarrier] = useState('پست پیشتاز'); const [add, setAdd] = useState(false); const [none, setNone] = useState<string | null>(null)
  const [np, setNp] = useState({ name: '', qty: '', cost: '', price: '', capital: 'partner' as Capital })
  const ships = d.orders.flatMap((o) => o.shipments.filter((x) => x.warehouse === P.warehouse).map((x) => ({ ...x, order: o })))
  const waiting = ships.filter((x) => x.status === 'ship.partner_confirm'); const toSend = ships.filter((x) => ['ship.picking', 'ship.packed'].includes(x.status))
  const isMahabad = P.warehouse === 'mahabad'
  const mine = isMahabad ? d.products.filter((p) => (p.qty?.mahabad ?? 0) > 0 || d.units.some((u) => u.productId === p.id && u.warehouse === 'mahabad')) : []
  const stockOf = (p: (typeof mine)[number]) => p.mode === 'qty' ? p.qty!.mahabad : d.units.filter((u) => u.productId === p.id && u.warehouse === 'mahabad' && u.status === 'unit.published').length
  const cust = (id: string) => d.customers.find((c) => c.id === id)!
  const setStatus = (oid: string, sid: string, v: string, label: string) => mutate((x) => { x.orders.find((o) => o.id === oid)!.shipments.find((y) => y.id === sid)!.status = v }, { action: label, target: sid })
  const chg = (pid: string, by: number) => { const undo = snapshot(); mutate((x) => { const p = x.products.find((y) => y.id === pid)!; if (p.qty) p.qty.mahabad = Math.max(0, p.qty.mahabad + by) }, { action: `تغییر موجودی ${P.name}`, target: pid, after: `${by > 0 ? '+' : ''}${by}` }); toast('موجودی فوری در سایت اعمال شد.', { undo }) }
  const attach = () => { const sh = ships.find((x) => x.id === track)!; if (!/^\d{24}$|^\d{11}$/.test(code)) return toast('کد رهگیری نامعتبر است. کد پست ۲۴ رقم و کد تیپاکس ۱۱ رقم است.', { tone: 'err' }); if (d.orders.flatMap((o) => o.shipments).some((x) => x.tracking === code)) return toast('این کد قبلاً برای مرسولهٔ دیگری ثبت شده است.', { tone: 'err' }); mutate((x) => { const o = x.orders.find((y) => y.id === sh.order.id)!; const y = o.shipments.find((z) => z.id === sh.id)!; y.tracking = code; y.method = carrier; y.status = 'ship.in_transit'; if (o.shipments.every((z) => !['ship.pending', 'ship.picking', 'ship.packed', 'ship.partner_confirm'].includes(z.status))) o.status = 'order.shipped' }, { action: 'تحویل به پست و ثبت رهگیری (شریک)', target: sh.id, after: code }); setTrack(null); setCode(''); toast('ثبت شد. پیام رهگیری خودکار برای مشتری ارسال شد.') }
  const storeSale = (lid: string) => { const l = d.lots.find((x) => x.id === lid)!; if (l.soldOnline + l.soldStore >= l.qty) return toast('موجودی این محموله تمام است.', { tone: 'err' }); mutate((x) => { x.lots.find((y) => y.id === lid)!.soldStore += 1 }, { action: 'ثبت فروش حضوری در شعبه', target: lid }); toast('فروش حضوری ثبت شد و در صورت‌حساب آمد.') }
  const tabs: [Tab, string, typeof Home, number?][] = [['home', 'داشبورد', Home], ['orders', 'سفارش‌ها', ShoppingBag, waiting.length + toSend.length], ['stock', 'موجودی و سرمایه', Boxes], ['fast', 'ارسال سریع', Truck], ['money', 'تسویه و کمیسیون', Wallet], ['contract', 'قرارداد', FileText], ['sites', 'سایت‌های من', Link2]]
  const spark = Array.from({ length: 14 }, (_, i) => Math.round(st.revenue / 14 * (0.6 + ((i * 37) % 9) / 10)))
  const done = P.checklist.filter((c) => c.done).length
  return (
    <div className="flex h-full flex-col bg-bg" style={partnerTheme(P.color)}>
      <DemoBar />
      {s.viewAs && <div className="flex h-8 shrink-0 items-center justify-center gap-3 bg-warning-bg text-12 text-warning">مشاهدهٔ پرتال «{P.name}» از دید شریک؛ فقط مشاهده.<button className="font-semibold underline" onClick={() => { setSession({ viewAs: null }); nav('/admin/sellers') }}>بازگشت به مدیر کل</button></div>}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <span className="flex items-center gap-2 text-14 font-bold"><span className="grid size-8 place-items-center rounded-xl text-white" style={{ background: P.color }}><Store size={16} /></span>پرتال {P.name}<Badge tone={P.status === 'فعال' ? 'success' : 'warning'}>{P.status}</Badge></span>
        <span className="flex items-center gap-2 text-12"><span className="hidden text-t2 sm:inline">با همکاری غنیمت</span><Avatar name={P.owner} /><span className="hidden font-semibold sm:inline">{P.owner}</span></span>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-60 shrink-0 space-y-1 border-l border-line bg-surface p-3 md:block">
          <div className="mb-3 rounded-2xl p-3 text-white" style={{ background: P.color }}><p className="text-11 opacity-80">انبار</p><p className="text-14 font-bold">{P.city}</p><p className="mt-1 text-11 opacity-80">{P.fast.on ? `ارسال سریع ${fa(P.fast.hours)} ساعته فعال` : 'ارسال سریع خاموش'}</p></div>
          {tabs.map(([id, l, Icon, n]) => <button key={id} onClick={() => setTab(id)} className={cx('flex h-10 w-full items-center gap-2 rounded-xl px-3 text-13', tab === id ? 'bg-brand-solid font-semibold text-white' : 'text-t2 hover:bg-neutral-bg')}><Icon size={17} /><span className="flex-1 text-right">{l}</span>{!!n && <span className={cx('tnum rounded-full px-1.5 text-11 font-semibold', tab === id ? 'bg-white/25 text-white' : 'bg-danger-bg text-danger')}>{fa(n)}</span>}</button>)}
        </nav>
        <main className="w-full flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
          {isMahabad && !d.flags.mahabadSales && <p className="rounded-md bg-danger-bg px-3 py-2 text-13 text-danger">غنیمت فروش از انبار شما را موقتاً متوقف کرده است. سفارش‌های ثبت‌شده را ادامه دهید.</p>}
          {P.status === 'متوقف' && <p className="rounded-md bg-danger-bg px-3 py-2 text-13 text-danger">فروش از انبار شما موقتاً متوقف است.</p>}

          {tab === 'home' && <>
            <h1 className="text-20 font-bold">سلام {P.owner}</h1>
            {P.status === 'در حال راه‌اندازی' && <Card title="راه‌اندازی شعبه"><p className="mb-2 flex justify-between text-12"><span>{fa(done)} از {fa(P.checklist.length)} مرحله</span></p><Progress value={done * 100 / P.checklist.length} tone="warning" /><ul className="mt-3 grid gap-1.5 text-12 sm:grid-cols-2">{P.checklist.map((c) => <li key={c.t} className={c.done ? 'text-success' : 'text-t2'}>{c.done ? '✓' : '○'} {c.t}</li>)}</ul></Card>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPI featured label="فروش این دوره" value={compactToman(st.revenue)} spark={spark.slice(-7)} note={`${fa(st.rows.reduce((a, r) => a + r.sold, 0))} واحد`} />
              <KPI label="سهم من" value={compactToman(st.partnerShare)} note="بعد از کمیسیون و کارمزد" />
              <KPI label="منتظر تأیید موجودی" value={fa(waiting.length)} tone="danger" to={undefined} />
              <KPI label="بستهٔ منتظر ارسال" value={fa(toSend.length)} tone="warning" />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card title="فروش ۱۴ روز اخیر"><Area data={spark} fmt={compactToman} color={P.color} /></Card>
              <Card title={st.net >= 0 ? 'غنیمت به شما بدهکار است' : 'شما به غنیمت بدهکارید'}><p className="tnum text-24 font-bold">{toman(Math.abs(st.net))}</p><p className="mt-1 text-12 text-t2">تسویهٔ بعدی تا {fa(P.contract.settleDays)} روز دیگر</p><Button className="mt-3" onClick={() => setTab('money')}>جزئیات صورت‌حساب</Button></Card>
            </div>
            <div className="grid gap-3 md:grid-cols-3">{(Object.keys(CAPITAL) as Capital[]).map((k) => { const r = st.byCap(k); return <Card key={k} title={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: CAPITAL[k].color }} />{CAPITAL[k].label}</span>}><Row k="مانده در انبار">{fa(r.reduce((a, x) => a + x.l.qty - x.sold, 0))} واحد</Row><Row k="ارزش">{compactToman(r.reduce((a, x) => a + x.stockValue, 0))}</Row><Row k="سهم من از فروش">{compactToman(r.reduce((a, x) => a + x.partnerShare, 0))}</Row></Card> })}</div>
          </>}

          {tab === 'orders' && (ships.length === 0 || s.viewState === 'empty' ? <Card><EmptyState title="سفارشی از انبار شما نیست." desc="با هر سفارش تازه، پیامک و پیام‌رسان برای شما ارسال می‌شود." /></Card> : ships.map((x) => { const stp = ({ 'ship.partner_confirm': 0, 'ship.picking': 1, 'ship.packed': 2, 'ship.in_transit': 3, 'ship.delivered': 4 } as Record<string, number>)[x.status] ?? 0; return (
            <Card key={x.id} title={<span className="flex flex-wrap items-center gap-2"><CopyId v={x.id} /><StatusBadge s={x.status} /></span>} actions={!['ship.delivered', 'ship.cancelled', 'ship.in_transit'].includes(x.status) && <Badge tone={minsLeft(x.sla) < 45 ? 'danger' : 'warning'}>{left(x.sla)}</Badge>}>
              {x.status !== 'ship.cancelled' && <div className="mb-3"><Stepper current={stp} steps={['تأیید موجودی', 'بسته‌بندی', 'چاپ برچسب', 'تحویل به پست', 'تحویل']} /></div>}
              <p className="text-13 font-medium">{x.items.map((i) => `${d.products.find((p) => p.id === i.productId)!.title} · ${fa(i.qty)} عدد`).join('، ')}</p>
              <p className="mt-1 text-12 text-t2">گیرنده: {cust(x.order.customerId).name} · {cust(x.order.customerId).city}، خیابان نمونه، پلاک ۱۲ · کد پستی ۱۹۸۷۶۵۴۳۲۱ · موبایل پوشیده</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {x.status === 'ship.partner_confirm' && <><Button variant="primary" onClick={() => { setStatus(x.order.id, x.id, 'ship.picking', 'تأیید موجودی (شریک)'); toast('موجودی تأیید شد. بسته را آماده کنید.') }}>دارم؛ تأیید موجودی</Button><Button variant="danger" onClick={() => setNone(x.id)}>ندارم</Button></>}
                {x.status === 'ship.picking' && <Button variant="primary" onClick={() => { setStatus(x.order.id, x.id, 'ship.packed', 'بسته‌بندی (شریک)'); toast('بسته‌بندی ثبت شد. برچسب پستی را چاپ کنید.') }}>بسته‌بندی شد (کالا، برگهٔ کنترل کیفیت، کارت گارانتی)</Button>}
                {x.status === 'ship.packed' && <><Button onClick={() => { toast(`برچسب پستی با نشانی فرستندهٔ ${P.name} آماده شد.`); window.print() }}>چاپ برچسب پستی</Button><Button variant="primary" onClick={() => setTrack(x.id)}>ثبت کد رهگیری و تحویل به پست</Button></>}
                {x.status === 'ship.in_transit' && <span className="text-12 text-t2">کد رهگیری: <CopyId v={x.tracking} /></span>}
                <Button variant="ghost" onClick={() => { mutate(() => {}, { action: 'تماس شریک با مشتری از طریق مرکز تماس', target: x.id }); toast('تماس از طریق مرکز تماس غنیمت برقرار می‌شود؛ شمارهٔ مشتری نمایش داده نمی‌شود.') }}>تماس با مشتری</Button>
              </div>
            </Card>) }))}

          {tab === 'stock' && <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-16 font-bold">موجودی و سرمایه</h1>{P.services.ownProducts ? <Button variant="primary" icon={<Plus size={14} />} onClick={() => setAdd(true)}>افزودن کالای خودم</Button> : <span className="text-12 text-t2">افزودن کالای شخصی در قرارداد شما فعال نیست.</span>}</div>
            {(Object.keys(CAPITAL) as Capital[]).map((k) => { const r = st.byCap(k); if (!r.length) return null; return <Card key={k} title={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: CAPITAL[k].color }} />{CAPITAL[k].label}</span>} pad={false}>
              <p className="px-4 pt-3 text-11 text-t2">{CAPITAL[k].desc}</p>
              <ul className="divide-y divide-line">{r.map((x) => <li key={x.l.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-13"><ProductImg pid={x.l.productId} size={36} /><span className="min-w-0 flex-1"><b className="block truncate">{d.products.find((p) => p.id === x.l.productId)?.title}</b><span className="text-11 text-t2">{fa(x.l.qty - x.sold)} مانده از {fa(x.l.qty)} · فروش {compactToman(x.l.unitPrice)} · سهم من {compactToman(x.partnerShare / (x.sold || 1))} از هر واحد</span></span>{P.services.storeSales && <Button size="sm" onClick={() => storeSale(x.l.id)}>ثبت فروش حضوری</Button>}</li>)}</ul>
            </Card> })}
            {mine.length > 0 && <Card title="موجودی تعدادی در سایت" pad={false}><ul className="divide-y divide-line">{mine.map((p) => { const q = d.partnerQueue.find((x) => x.productId === p.id); return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="text-13 font-semibold">{p.title}</p><div className="mt-1 flex flex-wrap gap-1">{q ? <><StatusBadge s={q.status} /><span className="text-11 text-t3">{q.note}</span></> : <StatusBadge s={p.status} />}</div></div>
                {p.mode === 'qty' ? <div className="flex items-center gap-2"><Button aria-label="کم‌کردن" icon={<Minus size={16} />} onClick={() => chg(p.id, -1)} /><span className="tnum w-8 text-center text-16 font-bold">{fa(stockOf(p))}</span><Button aria-label="زیادکردن" icon={<Plus size={16} />} onClick={() => chg(p.id, 1)} /><Button variant="danger" onClick={() => chg(p.id, -stockOf(p))}>ناموجود شد</Button></div> : <span className="text-12 text-t2">{fa(stockOf(p))} واحد سریال‌دار</span>}</li>) })}</ul></Card>}
            {st.rows.length === 0 && mine.length === 0 && <Card><EmptyState title="هنوز کالایی در انبار شما ثبت نشده است." desc="اولین محمولهٔ امانی غنیمت بعد از تکمیل راه‌اندازی ثبت می‌شود." /></Card>}
            <p className="text-12 text-t2">تغییر تعداد فوری اعمال می‌شود. کالای جدید و هر تغییر در عنوان، توضیح، عکس یا مشخصات تا تأیید غنیمت منتشر نمی‌شود.</p>
          </>}

          {tab === 'fast' && <Card title={<span className="flex items-center gap-2"><Truck size={15} />ارسال سریع از انبار {P.city}</span>}>
            <Row k="شهرها">{P.fast.cities}</Row><Row k="وعدهٔ تحویل">{fa(P.fast.hours)} ساعت</Row><Row k="هزینه">{toman(P.fast.fee)}</Row><Row k="ساعت قطع سفارش">{P.fast.cutoff}</Row><Row k="ظرفیت روزانه">{fa(P.fast.capacity)} سفارش</Row><Row k="پیک">{P.fast.courier}</Row>
            <div className="mt-3 rounded-xl border border-line p-3"><Toggle on={P.fast.on} disabled={P.status !== 'فعال'} onChange={(v) => { mutate((x) => { x.partners.find((y) => y.id === P.id)!.fast.on = v }, { action: v ? 'روشن‌کردن ارسال سریع امروز (شریک)' : 'توقف ارسال سریع امروز (شریک)', target: P.name }); if (!v) notify('ارسال سریع شعبه متوقف شد', `${P.name} ارسال سریع امروز را خاموش کرد.`, '/admin/sellers', 'عملیات', 'warning'); toast(v ? 'ارسال سریع روشن شد.' : 'ارسال سریع امروز خاموش شد و غنیمت خبردار شد.') }} text="امروز ارسال سریع انجام می‌دهم" /><p className="mt-1 text-11 text-t2">اگر پیک ندارید یا ظرفیت پر شده، خاموش کنید تا مشتری وعدهٔ اشتباه نبیند. تغییر هزینه و محدوده با غنیمت هماهنگ می‌شود.</p></div>
          </Card>}

          {tab === 'money' && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="فروش دوره" value={compactToman(st.revenue)} /><KPI label="سهم من" value={compactToman(st.partnerShare)} /><KPI label="سهم غنیمت" value={compactToman(st.hqShare)} /><KPI featured label={st.net >= 0 ? 'قابل دریافت از غنیمت' : 'قابل پرداخت به غنیمت'} value={compactToman(Math.abs(st.net))} /></div>
            <Card title="صورت‌حساب دورهٔ جاری" actions={<Button size="sm" onClick={() => { download(`صورت‌حساب-${P.name}.csv`, csv([['محموله', 'مدل سرمایه', 'فروش آنلاین', 'فروش حضوری', 'مبلغ فروش', 'سهم من', 'سهم غنیمت'], ...st.rows.map((r) => [r.l.id, CAPITAL[r.l.capital].label, r.l.soldOnline, r.l.soldStore, r.revenue, Math.round(r.partnerShare), Math.round(r.hqShare)])])); toast('خروجی صورت‌حساب دانلود شد.') }}>خروجی</Button>} pad={false}>
              <ul className="divide-y divide-line text-13">{st.rows.filter((r) => r.sold).map((r) => <li key={r.l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"><span><Badge dot={false}>{CAPITAL[r.l.capital].short}</Badge> {d.products.find((p) => p.id === r.l.productId)?.title.slice(0, 30)} · {fa(r.sold)} عدد</span><span className="tnum">سهم من {compactToman(r.partnerShare)}</span></li>)}</ul>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 font-bold"><span>{st.net >= 0 ? 'قابل دریافت از غنیمت' : 'قابل پرداخت به غنیمت'}</span><span className="tnum">{toman(Math.abs(st.net))}</span></div>
              <p className="px-4 pb-2 text-11 text-t2">پول فروش آنلاین را غنیمت دریافت می‌کند و سهم شما را می‌پردازد؛ پول فروش حضوری دست شماست و سهم غنیمت از آن کم می‌شود.</p>
              <div className="px-4 pb-4"><Button onClick={() => { mutate((x) => { x.approvals.unshift({ id: `AP-${900 + x.approvals.length}`, type: 'اختلاف تسویهٔ شریک', title: `${P.name} به صورت‌حساب دورهٔ جاری اعتراض دارد`, ref: 'تسویه', amount: Math.round(Math.abs(st.net)), by: me.name, byRole: 'partner', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'ثبت اختلاف تسویه', target: P.name }); notify('اختلاف در تسویهٔ شریک', `${P.name} به صورت‌حساب دورهٔ جاری اعتراض کرد.`, '/admin/sellers', 'مالی', 'warning'); toast('اختلاف ثبت شد و برای کارشناس مالی غنیمت ارسال شد.') }}>ثبت اختلاف</Button></div>
            </Card>
            <Card title="تسویه‌های قبلی">{P.payouts.length === 0 ? <EmptyState title="هنوز تسویه‌ای انجام نشده است." /> : <ul className="space-y-2">{P.payouts.map((x) => <li key={x.id} className="flex items-center justify-between text-13"><span>{x.id} · {rel(x.at)}</span><span className="flex items-center gap-2"><b className="tnum">{toman(x.amount)}</b><Badge tone={x.status === 'پرداخت شد' ? 'success' : 'warning'}>{x.status}</Badge></span></li>)}</ul>}</Card>
          </div>}

          {tab === 'contract' && <Card title="شرایط قرارداد با غنیمت">
            <Row k="کمیسیون من از فروش کالای امانی غنیمت">{fa(P.contract.hqCommission)}٪</Row>
            <Row k="کارمزد غنیمت از فروش کالای خودم">{fa(P.contract.platformFee)}٪</Row>
            <Row k="سهم من در کالای سرمایهٔ مشترک">{fa(P.contract.sharedSplit)}٪</Row>
            <Row k="حداقل حاشیهٔ سود قیمت‌گذاری">{fa(P.contract.minMargin)}٪</Row>
            <Row k="دورهٔ تسویه">هر {fa(P.contract.settleDays)} روز</Row>
            <Row k="جریمهٔ «ندارم» پس از فروش">{toman(P.contract.noStockPenalty)}</Row>
            <Row k="ودیعه و سقف کالای امانی">{toman(P.contract.deposit)}</Row>
            <Row k="هزینهٔ مرجوعی">{P.contract.returnsBy}</Row>
            <p className="mt-3 text-11 text-t2">برای تغییر شرایط با مدیر فروش غنیمت هماهنگ کنید؛ هر تغییر از دورهٔ تسویهٔ بعد اعمال می‌شود.</p>
          </Card>}

          {tab === 'sites' && <><Card title="اتصال سایت‌های من" pad={false}><div className="p-3"><EntityManager ek="partnerSites" kind="سایت" fields={[{ k: 'name', label: 'نام', required: true }, { k: 'url', label: 'نشانی', ltr: true, required: true }, { k: 'mode', label: 'روش همگام‌سازی', type: 'select', options: ['اتصال مستقیم', 'خزش دوره‌ای', 'به‌روزرسانی دستی'] }, { k: 'last', label: 'آخرین همگام‌سازی', form: false }, { k: 'active', label: 'فعال', type: 'toggle' }]} /></div></Card>
            <Card title="ناهماهنگی‌های موجودی">{d.syncIssues.length === 0 || !isMahabad ? <p className="text-13 text-t2">موجودی همه‌جا یکی است.</p> : <ul className="space-y-2 text-13">{d.syncIssues.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-warning-bg px-3 py-2 text-warning"><span>{x.product}: اینجا {fa(x.ours)}، {x.source} {fa(x.theirs)} · {rel(x.at)}</span><Button size="sm" onClick={() => { mutate((db) => { db.syncIssues = db.syncIssues.filter((y) => y.id !== x.id) }, { action: 'اصلاح ناهماهنگی (شریک)', target: x.product }); toast('موجودی اصلاح شد.') }}>همان {fa(x.theirs)} درست است</Button></li>)}</ul>}</Card></>}
        </main>
      </div>
      <nav className="flex h-16 shrink-0 border-t border-line bg-surface md:hidden">{tabs.slice(0, 5).map(([id, l, Icon, n]) => <button key={id} onClick={() => setTab(id)} className={cx('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-11', tab === id ? 'text-brand' : 'text-t2')}><Icon size={20} />{l}{!!n && <span className="tnum absolute top-1 right-1/4 rounded-full bg-danger-solid px-1 text-[10px] text-white">{fa(n)}</span>}</button>)}</nav>
      <Modal open={!!track} onClose={() => setTrack(null)} title="تحویل به پست" footer={<><Button variant="primary" onClick={attach}>ثبت «تحویل به پست شد»</Button><Button variant="ghost" onClick={() => setTrack(null)}>انصراف</Button></>}>
        <div className="space-y-3"><Field label="شرکت حمل" help={`فقط روش‌هایی که غنیمت برای ${P.name} فعال کرده است.`}><Select value={carrier} onChange={setCarrier} options={['پست پیشتاز', 'تیپاکس']} /></Field><Field label="کد رهگیری" help="اسکن بارکد، تایپ یا عکس رسید."><Input className="ltr text-left font-mono" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="۲۴ رقم پست یا ۱۱ رقم تیپاکس" /></Field><button className="text-12 text-brand" onClick={() => setCode('120459870001245789630077')}>کد نمونه بگذار</button></div>
      </Modal>
      <Modal open={!!none} onClose={() => setNone(null)} title="اعلام «ندارم»" footer={<><Button variant="danger" onClick={() => { const sh = ships.find((x) => x.id === none)!; mutate((x) => { const o = x.orders.find((y) => y.id === sh.order.id)!; o.shipments.find((y) => y.id === sh.id)!.status = 'ship.cancelled'; o.status = 'order.needs_decision' }, { action: 'اعلام «ندارم» پس از فروش (شریک)', target: sh.id }); setNone(null); toast('ثبت شد. غنیمت با مشتری هماهنگ می‌کند و این مورد در کارنامه و تسویه اثر دارد.') }}>ثبت «ندارم»</Button><Button variant="ghost" onClick={() => setNone(null)}>انصراف</Button></>}>
        <p className="mb-3 text-13 leading-6 text-t2">مشتری پول این کالا را پرداخته است. با ثبت «ندارم»، سفارش به غنیمت برمی‌گردد و جریمهٔ {toman(P.contract.noStockPenalty)} در تسویه کسر می‌شود.</p><Field label="دلیل"><Select value="در سایت دیگرم فروخته شد" onChange={() => {}} options={['در سایت دیگرم فروخته شد', 'کالا آسیب دیده است', 'اشتباه در شمارش']} /></Field>
      </Modal>
      <Modal open={add} onClose={() => setAdd(false)} title="افزودن کالای خودم" footer={<><Button variant="primary" disabled={!np.name.trim() || !+np.qty || !+np.price} onClick={() => { mutate((x) => { const pid = x.products[0].id; x.partnerQueue.unshift({ id: `PQ-${Date.now().toString(36).slice(-3).toUpperCase()}`, productId: pid, kind: `کالای جدید ${P.name}: ${np.name.trim()} (${np.qty} عدد، ${CAPITAL[np.capital].short})`, status: 'product.pending', note: `قیمت پیشنهادی ${toman(+np.price)}`, at: new Date().toISOString() }) }, { action: 'ارسال کالای جدید شریک برای تأیید', target: np.name }); notify('کالای جدید از شعبه', `${P.name}: ${np.name}`, '/admin/catalog?tab=partner', 'کاتالوگ'); setAdd(false); setNp({ name: '', qty: '', cost: '', price: '', capital: 'partner' }); toast('کالا ثبت شد و به صف تأیید غنیمت رفت. نتیجه با اعلان خبر داده می‌شود.') }}>ثبت و ارسال برای تأیید غنیمت</Button><Button variant="ghost" onClick={() => setAdd(false)}>انصراف</Button></>}>
        <div className="space-y-3">
          <Field label="لینک یا نام کالا" help="دستیار بقیهٔ مشخصات را پر می‌کند."><Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="مثلاً لینک صفحهٔ کالا" /></Field>
          <Field label="سرمایهٔ چه کسی؟"><Select value={np.capital} onChange={(v) => setNp({ ...np, capital: v as Capital })} options={[['partner', CAPITAL.partner.label], ['shared', CAPITAL.shared.label]]} /></Field>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="تعداد"><Input className="ltr text-left font-mono" inputMode="numeric" value={np.qty} onChange={(e) => setNp({ ...np, qty: e.target.value.replace(/\D/g, '') })} /></Field><Field label="قیمت خرید (تومان)"><Input className="ltr text-left font-mono" inputMode="numeric" value={np.cost} onChange={(e) => setNp({ ...np, cost: e.target.value.replace(/\D/g, '') })} /></Field><Field label="قیمت فروش (تومان)"><Input className="ltr text-left font-mono" inputMode="numeric" value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value.replace(/\D/g, '') })} /></Field></div>
          {+np.cost > 0 && +np.price > 0 && (+np.price - +np.cost) / +np.price * 100 < P.contract.minMargin && <p className="rounded-xl bg-warning-bg p-2 text-12 text-warning">حاشیهٔ سود کمتر از {fa(P.contract.minMargin)}٪ قرارداد است؛ غنیمت احتمالاً قیمت را اصلاح می‌کند.</p>}
          {+np.price > 0 && <p className="text-12 text-t2">از هر فروش، سهم شما حدود {toman(np.capital === 'partner' ? +np.price * (1 - P.contract.platformFee / 100) : +np.price * P.contract.sharedSplit / 100)} است.</p>}
        </div>
      </Modal>
    </div>
  )
}
export const PartnerIcons = { Building2, Package }
