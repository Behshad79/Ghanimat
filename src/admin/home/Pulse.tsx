import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpLeft, Eye, FileText, Package, ShoppingBag, Users, type LucideIcon } from 'lucide-react'
import { Badge, Card, cx } from '@/shared/ui/base'
import { useDB, currentUser } from '@/shared/lib/store'
import { compactToman, fa, rel } from '@/shared/lib/fa'
import { ProductImg } from '../pages/_shared'
import { GoalEdit } from '@/shared/ui/goal'

const days = (n: number) => Array.from({ length: n }, (_, i) => { const t = new Date(Date.now() - (n - 1 - i) * 864e5); return new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(t) })

/** «منتظر شما»: یک جا برای هر چیزی که همین حالا باید بررسی، تأیید یا منتشر شود (ادغام خوشامد و میانبرهای اقدام) */
export type WaitItem = { label: string; count: number; to: string; icon: LucideIcon; urgent?: boolean }
const WINDOWS: [string, string, number][] = [['24', '۲۴ ساعت گذشته', 24], ['72', '۳ روز', 72], ['168', '۷ روز', 168], ['all', 'همه', Infinity]]
const FOCUS = ['سفارش منتظر اقدام', 'مرسولهٔ منتظر بسته‌بندی']
export function WelcomeHero({ items }: { items: WaitItem[] }) {
  const nav = useNavigate(); const d = useDB()
  const [win, setWin] = useState(() => { try { return localStorage.getItem('gh-home-window') ?? '24' } catch { return '24' } })
  const pickWin = (v: string) => { setWin(v); try { localStorage.setItem('gh-home-window', v) } catch { /* فقط در حافظه */ } }
  const hours = WINDOWS.find(([k]) => k === win)?.[2] ?? 24; const inWin = (iso: string) => Date.now() - +new Date(iso) <= hours * 36e5
  // دو مورد اصلی روز: سفارش‌هایی که باید تأیید یا تصمیم بگیرند و مرسوله‌هایی که باید بسته‌بندی شوند
  const actAll = d.orders.filter((o) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(o.status) || d.orderEvents.some((e) => e.status === 'open' && e.orderId === o.id))
  const packAll = d.orders.flatMap((o) => o.shipments.filter((sh) => sh.status === 'ship.picking').map((sh) => ({ o, sh })))
  const act = actAll.filter((o) => inWin(o.createdAt)); const pack = packAll.filter((x) => inWin(x.o.createdAt))
  const oldest = (L: string[]) => L.length ? L.reduce((a, b) => (a < b ? a : b)) : null
  const soon = (iso?: string) => !!iso && +new Date(iso) - Date.now() < 2 * 36e5
  const focus = [
    { label: FOCUS[0], icon: ShoppingBag, n: act.length, all: actAll.length, to: `/admin/orders?tab=action&fl=${encodeURIComponent(FOCUS[0])}`, old: oldest(act.map((o) => o.createdAt)),
      chips: [[`${fa(act.filter((o) => o.status === 'order.suspicious').length)} مشکوک`, act.some((o) => o.status === 'order.suspicious')], [`${fa(act.filter((o) => o.status === 'order.needs_decision').length)} نیازمند تصمیم`, act.some((o) => o.status === 'order.needs_decision')], [`${fa(act.filter((o) => o.shipments.some((sh) => /سریع|پیک/.test(sh.method))).length)} ارسال سریع`, false]] as [string, boolean][] },
    { label: FOCUS[1], icon: Package, n: pack.length, all: packAll.length, to: '/admin/packing', old: oldest(pack.map((x) => x.o.createdAt)),
      chips: [[`${fa(pack.filter((x) => soon(x.sh.sla)).length)} نزدیک پایان مهلت`, pack.some((x) => soon(x.sh.sla))], [`تهران ${fa(pack.filter((x) => x.sh.warehouse === 'tehran').length)} · مهاباد ${fa(pack.filter((x) => x.sh.warehouse === 'mahabad').length)}`, false]] as [string, boolean][] },
  ]
  const rest = items.filter((x) => !FOCUS.includes(x.label))
  const open = rest.filter((x) => x.count > 0).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent)); const clear = rest.filter((x) => x.count === 0)
  const total = open.reduce((a, x) => a + x.count, 0) + actAll.length + packAll.length
  const showFocus = items.some((x) => FOCUS.includes(x.label))
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-solid p-5 text-white">
      <span aria-hidden className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-white/10" /><span aria-hidden className="pointer-events-none absolute -bottom-20 left-40 size-48 rounded-full bg-[#ffc24b]/20" />
      <p className="relative text-16 font-bold">{total ? `${fa(total)} مورد منتظر بررسی و تصمیم شماست` : 'همه‌چیز مرتب است؛ موردی منتظر شما نیست.'}</p>
      {showFocus && <div className="relative mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-12"><span className="text-white/80">بازهٔ زمانی ثبت سفارش:</span><div role="radiogroup" aria-label="بازهٔ زمانی" className="flex flex-wrap gap-1 rounded-full bg-white/10 p-1">{WINDOWS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={win === k} onClick={() => pickWin(k)} className={cx('h-7 rounded-full px-3 transition-colors', win === k ? 'bg-white font-semibold text-[#10123d]' : 'text-white/85 hover:bg-white/15')}>{l}</button>)}</div></div>
        <div className="grid gap-3 lg:grid-cols-2">{focus.filter((x) => items.some((i) => i.label === x.label)).map((x) => { const I = x.icon; const hot = x.n > 0; return (
          <button key={x.label} type="button" onClick={() => nav(x.to)} className="lift group flex items-center gap-4 rounded-2xl bg-white p-4 text-right text-[#10123d] ring-2 ring-transparent hover:ring-[#ffc24b] sm:p-5">
            <span className={cx('grid size-14 shrink-0 place-items-center rounded-2xl', hot ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success')}><I size={26} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2"><b className={cx('tnum text-[40px] leading-none font-extrabold', hot ? 'text-danger' : 'text-success')}>{fa(x.n)}</b><span className="text-14 font-semibold">{x.label}</span></span>
              <span className="mt-1.5 block text-11 text-t2">{win === 'all' ? 'همهٔ زمان‌ها' : `در ${WINDOWS.find(([k]) => k === win)?.[1]}`}{win !== 'all' && x.all !== x.n ? ` · از کل ${fa(x.all)}` : ''}{x.old ? ` · قدیمی‌ترین: ${rel(x.old)}` : ''}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">{x.chips.map(([t, warn]) => <span key={t} className={cx('rounded-full px-2 py-0.5 text-11', warn ? 'bg-danger-bg font-medium text-danger' : 'bg-neutral-bg text-t2')}>{t}</span>)}</span>
            </span>
            <ArrowUpLeft size={20} className="shrink-0 text-t3 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
          </button>) })}</div>
      </div>}
      {open.length > 0 && <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{open.map((x) => { const I = x.icon; return (
        <button key={x.label} type="button" onClick={() => nav(/[?&]fl=/.test(x.to) ? x.to : `${x.to}${x.to.includes('?') ? '&' : '?'}fl=${encodeURIComponent(x.label)}`)} className="lift flex items-center gap-2.5 rounded-2xl bg-white p-3 text-right text-[#10123d]">
          <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', x.urgent ? 'bg-danger-bg text-danger' : 'bg-brand-tint text-brand')}><I size={18} /></span>
          <span className="min-w-0"><b className={cx('tnum block text-22 leading-none', x.urgent && 'text-danger')}>{fa(x.count)}</b><span className="mt-1 block truncate text-11 text-t2">{x.label}</span></span>
        </button>) })}</div>}
      {clear.length > 0 && <p className="relative mt-3 flex flex-wrap items-center gap-1.5 text-11 text-white/80"><span>بدون مورد:</span>{clear.map((x) => <button key={x.label} type="button" onClick={() => nav(/[?&]fl=/.test(x.to) ? x.to : `${x.to}${x.to.includes('?') ? '&' : '?'}fl=${encodeURIComponent(x.label)}`)} className="rounded-full bg-white/10 px-2 py-0.5 hover:bg-white/20">{x.label}</button>)}</p>}
    </div>
  )
}

/** کارت‌های «از ابتدا تا کنون» با نمودار کوچک ناحیه‌ای */
export function LifetimeCards() {
  const d = useDB(); const nav = useNavigate()
  const cards: [string, number, string, typeof Users, number[], string][] = [
    ['تعداد مشتریان', d.customers.length * 812, 'نفر', Users, [3, 4, 4, 6, 7, 8, 10], '/admin/customers'],
    ['کالای منتشرشده', d.products.filter((p) => p.status === 'product.published').length, 'کالا', Package, [2, 3, 3, 5, 5, 6, 7], '/admin/catalog'],
    ['مقالهٔ منتشرشده', d.blog.posts.filter((p) => p.status === 'منتشرشده').length, 'مقاله', FileText, [1, 1, 2, 2, 3, 3, 4], '/admin/blog'],
    ['کل سفارش‌ها', d.orders.length, 'سفارش', ShoppingBag, [4, 5, 7, 6, 8, 9, 11], '/admin/orders'],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([l, v, u, I, sp, to]) => { const mx = Math.max(...sp); const pts = sp.map((y, i) => `${(i / (sp.length - 1)) * 100},${34 - (y / mx) * 28}`).join(' '); return (
      <button key={l} type="button" onClick={() => nav(to)} className="group lift relative overflow-hidden rounded-2xl border border-line bg-surface p-4 text-right">
        <span className="flex items-center gap-2 text-13 text-t2"><span className="grid size-8 place-items-center rounded-lg bg-brand-tint text-brand"><I size={15} /></span>{l}</span>
        <span className="mt-3 flex items-baseline gap-1"><b className="tnum text-24">{fa(v)}</b><span className="text-12 text-t2">{u}</span></span>
        <span className="mt-1 flex items-center justify-between text-11 text-t2"><span>از ابتدا تا کنون</span><span className="flex items-center gap-0.5 text-brand opacity-0 transition-opacity group-hover:opacity-100">مشاهده<ArrowUpLeft size={12} /></span></span>
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full" aria-hidden><polygon points={`0,36 ${pts} 100,36`} fill="var(--brand)" opacity=".08" /><polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.4" opacity=".5" /></svg>
      </button>) })}</div>
  )
}

/** بازدید یکتا و بازدید صفحه در ۷ روز اخیر (ستون‌های دوتایی) */
export function VisitsChart() {
  const L = days(7); const uniq = [612, 540, 498, 702, 655, 820, 760]; const views = [4100, 3710, 3616, 5020, 4480, 6110, 5480]; const [hov, setHov] = useState<number | null>(null)
  const mx = Math.max(...views)
  return (
    <Card title="بازدید هفتهٔ اخیر" actions={<span className="flex gap-3 text-11 text-t2"><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-brand" />بازدید صفحه</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#ffc24b]" />بازدیدکنندهٔ یکتا</span></span>}>
      <div className="mb-3 flex gap-6 text-12"><span>بازدیدکنندهٔ یکتا: <b className="tnum text-15">{fa(uniq.reduce((a, b) => a + b, 0))}</b></span><span>بازدید صفحه: <b className="tnum text-15">{fa(views.reduce((a, b) => a + b, 0))}</b></span><span className="text-t2">میانگین {fa(Math.round(views.reduce((a, b) => a + b, 0) / uniq.reduce((a, b) => a + b, 0) * 10) / 10)} صفحه در هر بازدید</span></div>
      <div className="flex h-44 items-end gap-3" role="img" aria-label="نمودار بازدید هفتهٔ اخیر">{L.map((l, i) => (
        <div key={i} className="relative flex h-full flex-1 flex-col items-center justify-end" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
          {hov === i && <span className="absolute -top-1 z-10 whitespace-nowrap rounded-lg bg-[#10123d] px-2 py-1 text-[11px] text-white">{fa(views[i])} صفحه · {fa(uniq[i])} نفر</span>}
          <span className="flex h-full w-full items-end justify-center gap-1"><span className="w-1/3 rounded-t-md bg-brand transition-all" style={{ height: `${(views[i] / mx) * 100}%`, opacity: hov === null || hov === i ? 1 : .45 }} /><span className="w-1/3 rounded-t-md bg-[#ffc24b] transition-all" style={{ height: `${(uniq[i] / mx) * 100 * 4}%`, opacity: hov === null || hov === i ? 1 : .45 }} /></span>
          <span className="mt-1.5 text-11 text-t2">{l}</span>
        </div>))}</div>
      <p className="mt-2 text-11 text-t2">ستون زرد برای خوانایی ۴ برابر بزرگ‌نمایی شده است.</p>
    </Card>
  )
}

/** فروش روزانه در برابر هدف: نشانگر هدف روی هر ستون، سبز وقتی هدف رد شده */
export function SalesGoalChart() {
  const d = useDB(); const L = days(14); const goal = Math.round(+(d.rules.find((r) => r.key === 'daily_sales_goal')?.value ?? 600000000) / 1e6); const sales = [420, 510, 380, 640, 590, 710, 300, 455, 620, 680, 520, 740, 610, 468]; const [hov, setHov] = useState<number | null>(null)
  const mx = Math.max(...sales, goal) * 1.1; const hit = sales.filter((s) => s >= goal).length
  return (
    <Card title="فروش روزانه در برابر هدف" actions={<span className="flex items-center gap-2"><GoalEdit k="daily_sales_goal" compact /><Badge tone={hit >= 7 ? 'success' : 'warning'}>{fa(hit)} روز از ۱۴ روز بالای هدف</Badge></span>}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-12">{[['فروش امروز', sales[13]], ['فروش ۱۴ روز', sales.reduce((a, b) => a + b, 0)], ['هدف روزانه', goal]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-neutral-bg p-2"><p className="text-t2">{k}</p><b className="tnum text-15">{compactToman((v as number) * 1e6)}</b></div>)}</div>
      <div className="relative flex h-44 items-end gap-1.5" role="img" aria-label="فروش روزانه در برابر هدف">
        <span className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-[#c42f2f]/50" style={{ bottom: `${(goal / mx) * 100}%` }}><span className="absolute -top-4 left-0 text-[10px] text-danger">هدف</span></span>
        {sales.map((s, i) => (
          <div key={i} className="relative flex h-full flex-1 flex-col items-center justify-end" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            {hov === i && <span className="absolute -top-1 z-10 whitespace-nowrap rounded-lg bg-[#10123d] px-2 py-1 text-[11px] text-white">{compactToman(s * 1e6)} · {s >= goal ? `${fa(Math.round((s / goal - 1) * 100))}٪ بالای هدف` : `${fa(Math.round((1 - s / goal) * 100))}٪ زیر هدف`}</span>}
            <span className={cx('w-full rounded-t-md transition-all', s >= goal ? 'bg-success' : 'bg-brand')} style={{ height: `${(s / mx) * 100}%`, opacity: hov === null || hov === i ? 1 : .5 }} />
            <span className="mt-1.5 h-4 text-[10px] leading-4 text-t2">{i % 2 ? '\u00a0' : L[i]}</span>
          </div>))}
      </div>
    </Card>
  )
}

/** پربازدیدترین کالاها با وضعیت و آخرین به‌روزرسانی */
export function MostViewed() {
  const d = useDB(); const nav = useNavigate()
  const L = [...d.products].sort((a, b) => b.views - a.views).slice(0, 6)
  return (
    <Card title="پربازدیدترین کالاها" pad={false} actions={<button type="button" onClick={() => nav('/admin/readiness')} className="text-12 text-brand">مشاهدهٔ همه</button>}>
      <ul className="divide-y divide-line">{L.map((p, i) => <li key={p.id}><button type="button" onClick={() => nav(`/admin/catalog/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-surface-2"><span className="tnum w-4 text-12 text-t2">{fa(i + 1)}</span><ProductImg pid={p.id} size={36} /><span className="min-w-0 flex-1"><b className="block truncate text-13">{p.en}</b><span className="text-11 text-t2">{p.status === 'product.published' ? 'منتشرشده' : 'منتشر نشده'} · به‌روزرسانی {rel(new Date(Date.now() - (i + 1) * 36e5 * 3).toISOString())}</span></span><span className="flex items-center gap-1 text-12"><Eye size={13} className="text-t2" /><b className="tnum">{fa(p.views)}</b></span><span className="tnum w-14 text-left text-11 text-success">{fa(p.cvr)}٪ تبدیل</span></button></li>)}</ul>
    </Card>
  )
}
