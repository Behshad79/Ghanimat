import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CircleDollarSign, HandCoins, Pencil, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Segmented, Select } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Bars, Donut, Waterfall } from '@/shared/ui/charts'
import { Hint, Modal, toast } from '@/shared/ui/overlay'
import { mutate, snapshot, useDB } from '@/shared/lib/store'
import { compactToman, fa, jday, pct, toman } from '@/shared/lib/fa'
import { counted, orderProfit, providerOf, receivable } from '@/shared/lib/profit'
import { CONDITION, SOURCE, WAREHOUSE } from '@/shared/data/statuses'
import type { Order } from '@/shared/data/seed'
import { Cell, Money, ProductImg } from '../pages/_shared'

const toneOf = (s: string) => (s === 'واریزشده' ? 'success' : s === 'دیرکرد' ? 'danger' : s === 'اختلاف' ? 'warning' : 'info') as 'success' | 'danger' | 'warning' | 'info'
const toInput = (iso: string) => new Date(iso).toISOString().slice(0, 10)

/** طلب از درگاه‌ها و سرویس‌های اقساطی: مبلغ خالص، موعد قابل ویرایش، ثبت واریز */
export function Receivables() {
  const d = useDB(); const nav = useNavigate()
  const rows = d.orders.filter(counted).map((o) => receivable(d, o)).filter(Boolean) as NonNullable<ReturnType<typeof receivable>>[]
  const [prov, setProv] = useState('all'); const [due, setDue] = useState<{ ids: string[]; date: string } | null>(null); const [pay, setPay] = useState<{ ids: string[]; amount: number; date: string; ref: string } | null>(null)
  const view = rows.filter((r) => prov === 'all' || r.prov.id === prov)
  const provs = [...new Set(rows.map((r) => r.prov.id))].map((id) => d.providers.find((p) => p.id === id)!)
  const sum = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((a, r) => a + (r.paid ? 0 : r.net), 0)
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">درگاه‌های نقدی و سرویس‌های اقساطی برای غنیمت یکسان‌اند: سرویس فقط اعلام می‌کند پرداخت موفق بوده و بعداً تسویه می‌کند. اقساط و اعتبار مشتری به غنیمت مربوط نیست.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="کل طلب واریزنشده" hint="receivable" value={compactToman(sum(() => true))} full={toman(sum(() => true))} />
        <KPI label="سررسیدگذشته (دیرکرد)" value={compactToman(sum((r) => r.status === 'دیرکرد'))} note={`${fa(rows.filter((r) => r.status === 'دیرکرد').length)} سفارش`} goodDown />
        <KPI label="سررسید ۷ روز آینده" value={compactToman(sum((r) => !r.paid && new Date(r.due).getTime() - Date.now() < 7 * 864e5 && new Date(r.due).getTime() >= Date.now()))} />
        <KPI label="واریزشده این ماه" value={compactToman(rows.filter((r) => r.paid).reduce((a, r) => a + r.paid!.amount, 0))} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{provs.map((p) => { const rs = rows.filter((r) => r.prov.id === p.id); const open = rs.filter((r) => !r.paid); const next = open.map((r) => r.due).sort()[0]; return (
        <Card key={p.id} onClick={() => setProv(p.id === prov ? 'all' : p.id)} className={cx(prov === p.id && 'border-brand ring-2 ring-brand/20')}>
          <div className="flex items-center justify-between"><b className="text-14">{p.name}</b><Badge tone={p.family === 'bnpl' ? 'purple' : 'info'} dot={false}>{p.family === 'bnpl' ? 'اقساطی' : 'نقدی'}</Badge></div>
          <p className="tnum mt-2 text-20 font-bold">{compactToman(open.reduce((a, r) => a + r.net, 0))}</p><p className="text-11 text-t2">باید واریز کند · کارمزد {pct(p.fee ?? 0, 1)} · تسویه هر {fa(p.settleDays ?? 1)} روز</p>
          <p className="mt-2 flex items-center gap-1 text-12"><CalendarClock size={13} className="text-t3" />{next ? `سررسید بعدی ${jday(next)}` : 'طلبی باز نیست'}</p>
        </Card>) })}</div>
      <DataTable name="طلب از سرویس‌ها" rows={view} rowKey={(r) => r.o.id} onRow={(r) => nav(`/admin/orders/${r.o.id}`)} search={(r) => `${r.o.id} ${r.prov.name}`}
        filters={<Select className="w-40" value={prov} onChange={setProv} options={[['all', 'همهٔ سرویس‌ها'], ...provs.map((p) => [p.id, p.name] as [string, string])]} />}
        empty={{ title: 'طلبی ثبت نشده است.' }}
        cols={[{ key: 'o', title: 'سفارش', render: (r) => <Cell pid={r.o.shipments[0]?.items[0]?.productId} a={<span className="ltr font-mono">{r.o.id}</span>} b={d.customers.find((c) => c.id === r.o.customerId)?.name} /> },
          { key: 'p', title: 'سرویس', render: (r) => <span className="flex items-center gap-1.5">{r.prov.name}<Badge tone={r.prov.family === 'bnpl' ? 'purple' : 'info'} dot={false}>{r.prov.family === 'bnpl' ? 'اقساطی' : 'نقدی'}</Badge></span>, sort: (r) => r.prov.name },
          { key: 'sale', title: 'مبلغ فروش', align: 'left', render: (r) => <Money v={r.o.total} />, sort: (r) => r.o.total, text: (r) => r.o.total },
          { key: 'fee', title: 'کارمزد', align: 'left', render: (r) => <Money v={r.fee} />, sort: (r) => r.fee, text: (r) => r.fee },
          { key: 'net', title: 'باید واریز کند', align: 'left', render: (r) => <b><Money v={r.net} /></b>, sort: (r) => r.net, text: (r) => r.net },
          { key: 'due', title: 'موعد تسویه', render: (r) => <button onClick={(e) => { e.stopPropagation(); setDue({ ids: [r.o.id], date: toInput(r.due) }) }} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-neutral-bg">{jday(r.due)}{d.settleDue[r.o.id] && <Badge dot={false}>دستی</Badge>}<Pencil size={12} className="text-t3" /></button>, sort: (r) => r.due, text: (r) => r.due },
          { key: 'st', title: 'وضعیت', render: (r) => <Badge tone={toneOf(r.status)}>{r.status}</Badge>, sort: (r) => r.status, text: (r) => r.status }]}
        actions={(r) => [{ label: 'ثبت واریز', icon: <HandCoins size={14} />, disabled: !!r.paid, onClick: () => setPay({ ids: [r.o.id], amount: r.net, date: toInput(new Date().toISOString()), ref: '' }) }, { label: 'تغییر موعد تسویه', icon: <CalendarClock size={14} />, onClick: () => setDue({ ids: [r.o.id], date: toInput(r.due) }) }, { label: 'مشاهدهٔ سفارش', icon: <ReceiptText size={14} />, onClick: () => nav(`/admin/orders/${r.o.id}`) }]}
        bulk={(ids, clear) => <><Button size="sm" onClick={() => { setPay({ ids, amount: view.filter((r) => ids.includes(r.o.id) && !r.paid).reduce((a, r) => a + r.net, 0), date: toInput(new Date().toISOString()), ref: '' }); clear() }}>ثبت واریز گروهی {fa(ids.length)}</Button><Button size="sm" onClick={() => { setDue({ ids, date: toInput(new Date(Date.now() + 3 * 864e5).toISOString()) }); clear() }}>تغییر موعد</Button></>} />
      <Card title="تقویم سررسیدها (۱۴ روز آینده)"><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 14 }).map((_, i) => { const day = new Date(Date.now() + i * 864e5).toISOString().slice(0, 10); const items = rows.filter((r) => !r.paid && r.due.slice(0, 10) === day); if (!items.length) return null; return <li key={day} className="rounded-lg border border-line p-3"><p className="text-12 text-t2">{jday(day)}</p><p className="tnum text-14 font-bold">{compactToman(items.reduce((a, r) => a + r.net, 0))}</p><p className="text-11 text-t2">{items.map((r) => r.prov.name).join('، ')}</p></li> })}{!rows.some((r) => !r.paid && new Date(r.due).getTime() - Date.now() < 14 * 864e5) && <li className="text-12 text-t2">سررسیدی در ۱۴ روز آینده نیست.</li>}</ul></Card>
      <Modal open={!!due} onClose={() => setDue(null)} title="تغییر موعد تسویه" footer={<><Button variant="primary" onClick={() => { const undo = snapshot(); mutate((x) => due!.ids.forEach((id) => (x.settleDue[id] = new Date(due!.date + 'T12:00:00').toISOString())), { action: 'تغییر دستی موعد تسویه', target: due!.ids.join('، '), after: due!.date }); toast(`موعد تسویهٔ ${fa(due!.ids.length)} سفارش تغییر کرد.`, { undo }); setDue(null) }}>ذخیرهٔ موعد</Button><Button variant="ghost" onClick={() => { mutate((x) => due!.ids.forEach((id) => delete x.settleDue[id])); toast('موعد به محاسبهٔ قرارداد برگشت.'); setDue(null) }}>بازگشت به موعد قرارداد</Button></>}>
        {due && <Field label="تاریخ جدید" help="موعد محاسبه‌شده از دورهٔ قرارداد را برای این سفارش‌ها بازنویسی می‌کند."><Input type="date" className="ltr text-left font-mono" value={due.date} onChange={(e) => setDue({ ...due, date: e.target.value })} /></Field>}
      </Modal>
      <Modal open={!!pay} onClose={() => setPay(null)} title={`ثبت واریز${pay && pay.ids.length > 1 ? ` (${fa(pay.ids.length)} سفارش)` : ''}`} footer={<><Button variant="primary" onClick={() => { if (!pay!.ref.trim()) return toast('شمارهٔ پیگیری واریز را وارد کنید.', { tone: 'err' }); const undo = snapshot(); mutate((x) => { const per = view.filter((r) => pay!.ids.includes(r.o.id) && !r.paid); per.forEach((r) => (x.settlements[r.o.id] = { amount: pay!.ids.length === 1 ? pay!.amount : r.net, at: new Date(pay!.date + 'T12:00:00').toISOString(), ref: pay!.ref })) }, { action: 'ثبت واریز سرویس پرداخت', target: pay!.ids.join('، '), after: toman(pay!.amount) }); toast(`واریز ${toman(pay!.amount)} ثبت شد.`, { undo }); setPay(null) }}>ثبت واریز {pay ? toman(pay.amount) : ''}</Button><Button variant="ghost" onClick={() => setPay(null)}>انصراف</Button></>}>
        {pay && <div className="space-y-3"><Field label="مبلغ واریزشده (تومان)" help="اگر با مبلغ خالص فرق داشته باشد، وضعیت «اختلاف» می‌گیرد."><Input className="ltr text-left font-mono" value={pay.amount.toLocaleString('en-US')} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value.replace(/\D/g, '')) })} /></Field><Field label="تاریخ واریز"><Input type="date" className="ltr text-left font-mono" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></Field><Field label="شمارهٔ پیگیری"><Input className="ltr text-left font-mono" value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} placeholder="مثلاً SP-88120" /></Field></div>}
      </Modal>
    </div>
  )
}

/** فروش به تفکیک روش پرداخت: نقدی (هر درگاه)، اقساطی (هر سرویس)، کیف پول، ترکیبی */
export function PaySales() {
  const d = useDB(); const orders = d.orders.filter(counted)
  const groups = new Map<string, { name: string; kind: string; n: number; total: number; fee: number; received: number }>()
  orders.forEach((o) => { const p = providerOf(d, o.pay); const key = o.pay.includes('+') ? 'mixed' : p?.id ?? o.pay; const kind = o.pay.includes('+') ? 'ترکیبی' : p ? (p.family === 'bnpl' ? 'اقساطی' : 'نقدی') : o.pay.includes('کیف') ? 'کیف پول' : 'سایر'; const g = groups.get(key) ?? { name: o.pay.includes('+') ? 'ترکیبی (کیف پول + درگاه)' : p?.name ?? o.pay, kind, n: 0, total: 0, fee: 0, received: 0 }; const r = receivable(d, o); g.n++; g.total += o.total; g.fee += r?.fee ?? 0; g.received += r?.paid?.amount ?? 0; groups.set(key, g) })
  const list = [...groups.values()].sort((a, b) => b.total - a.total); const all = list.reduce((a, g) => a + g.total, 0)
  const byKind = ['نقدی', 'اقساطی', 'ترکیبی', 'کیف پول', 'سایر'].map((k) => ({ label: k, value: list.filter((g) => g.kind === k).reduce((a, g) => a + g.total, 0) })).filter((x) => x.value)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="کل فروش" value={compactToman(all)} full={toman(all)} /><KPI label="نقدی" value={compactToman(byKind.find((x) => x.label === 'نقدی')?.value ?? 0)} note={pct(((byKind.find((x) => x.label === 'نقدی')?.value ?? 0) / (all || 1)) * 100)} /><KPI label="اقساطی" value={compactToman(byKind.find((x) => x.label === 'اقساطی')?.value ?? 0)} note={pct(((byKind.find((x) => x.label === 'اقساطی')?.value ?? 0) / (all || 1)) * 100)} /><KPI label="کل کارمزد" value={compactToman(list.reduce((a, g) => a + g.fee, 0))} goodDown /></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <DataTable name="فروش بر اساس روش پرداخت" rows={list} rowKey={(g) => g.name} empty={{ title: 'فروشی ثبت نشده است.' }}
          cols={[{ key: 'n', title: 'روش پرداخت', render: (g) => <span className="flex items-center gap-1.5">{g.name}<Badge dot={false} tone={g.kind === 'اقساطی' ? 'purple' : 'info'}>{g.kind}</Badge></span> }, { key: 'c', title: 'سفارش', align: 'left', render: (g) => fa(g.n), sort: (g) => g.n }, { key: 't', title: 'فروش', align: 'left', render: (g) => <Money v={g.total} compact />, sort: (g) => g.total, text: (g) => g.total }, { key: 's', title: 'سهم', align: 'left', render: (g) => pct((g.total / (all || 1)) * 100, 1), sort: (g) => g.total }, { key: 'f', title: 'کارمزد', align: 'left', render: (g) => <Money v={g.fee} compact />, sort: (g) => g.fee }, { key: 'r', title: 'دریافت‌شده', align: 'left', render: (g) => <Money v={g.received} compact /> }, { key: 'w', title: 'در راه', align: 'left', render: (g) => <Money v={Math.max(0, g.total - g.fee - g.received)} compact /> }]} />
        <Card title="سهم نقدی و اقساطی"><Donut data={byKind.map((k, i) => ({ ...k, color: ['var(--brand)', 'var(--purple)', 'var(--info)', 'var(--warning)', 'var(--text-3)'][i] }))} center={<span>{compactToman(all)}</span>} /></Card>
      </div>
    </div>
  )
}

/** کارت «سود این سفارش» با نمودار آبشاری */
export function OrderProfitCard({ o }: { o: Order }) {
  const d = useDB(); const p = orderProfit(d, o)
  return (
    <Card title={<>سود این سفارش<Hint k="margin" /></>} actions={<Badge tone={p.unknownCost ? 'warning' : p.profit >= 0 ? 'success' : 'danger'}>{p.unknownCost ? 'قیمت خرید ناقص' : pct(p.margin, 1)}</Badge>}>
      <Waterfall steps={[{ label: 'فروش', value: p.revenue / 1e6 }, { label: 'خرید', value: -p.cogs / 1e6 }, { label: 'کارمزد', value: -p.fee / 1e6 }, { label: 'ارسال', value: (p.shipIncome - p.shipCost) / 1e6 }, { label: 'بسته‌بندی', value: -p.packaging / 1e6 }, { label: 'تخفیف', value: -p.discount / 1e6 }, { label: 'سود', value: p.profit / 1e6 }]} />
      <dl className="mt-3 space-y-1 text-12">{[['فروش کالا', p.revenue], ['قیمت تمام‌شدهٔ کالا', -p.cogs], [`کارمزد ${p.prov?.name ?? 'پرداخت'}`, -p.fee], ['هزینهٔ ارسال دریافتی', p.shipIncome], ['هزینهٔ ارسال پرداختی', -p.shipCost], ['بسته‌بندی', -p.packaging], ['تخفیف', -p.discount]].map(([k, v]) => <div key={k as string} className="flex justify-between"><dt className="text-t2">{k}</dt><dd className={cx('tnum', (v as number) < 0 && 'text-danger')}>{toman(v as number)}</dd></div>)}<div className="flex justify-between border-t border-line pt-1.5 text-13 font-bold"><dt>سود خالص</dt><dd className={cx('tnum', p.profit < 0 ? 'text-danger' : 'text-success')}>{toman(p.profit)}</dd></div></dl>
      {p.unknownCost && <p className="mt-2 text-11 text-warning">قیمت خرید برخی اقلام ثبت نشده؛ سود این سفارش کامل نیست.</p>}
    </Card>
  )
}

/** سود من: «چقدر سود کردم؟» به تفکیک دوره، کالا، دسته، انبار، منبع، کانال و روش پرداخت */
export function MyProfit() {
  const d = useDB(); const nav = useNavigate(); const [period, setPeriod] = useState('month'); const [by, setBy] = useState('product'); const [ex, setEx] = useState(false)
  const since = { today: 1, week: 7, month: 30, all: 3650 }[period as 'today']!
  const orders = d.orders.filter(counted).filter((o) => Date.now() - new Date(o.createdAt).getTime() < since * 864e5)
  const calc = useMemo(() => orders.map((o) => ({ o, ...orderProfit(d, o) })), [orders.length, d])
  const total = calc.reduce((a, c) => a + c.profit, 0); const rev = calc.reduce((a, c) => a + c.revenue, 0)
  const groups = new Map<string, { label: string; pid?: string; revenue: number; profit: number; n: number; unknown: boolean }>()
  calc.forEach((c) => c.lines.forEach((l) => {
    const p = d.products.find((x) => x.id === l.pid); const u = d.units.find((x) => x.id === l.uid)
    const key = by === 'product' ? l.pid : by === 'category' ? p?.category ?? '—' : by === 'warehouse' ? WAREHOUSE[l.warehouse] : by === 'source' ? SOURCE[u?.source ?? p?.source ?? 'amazon'] : by === 'channel' ? c.o.channel : c.prov?.name ?? c.o.pay
    const share = c.revenue ? (l.price * l.qty) / c.revenue : 0
    const g = groups.get(key) ?? { label: by === 'product' ? p?.title ?? l.pid : key, pid: by === 'product' ? l.pid : undefined, revenue: 0, profit: 0, n: 0, unknown: false }
    g.revenue += l.price * l.qty; g.profit += l.cost === null ? 0 : l.price * l.qty - l.cost - (c.fee + c.packaging + c.discount - c.shipIncome + c.shipCost) * share; g.n += l.qty; g.unknown ||= l.cost === null; groups.set(key, g)
  }))
  const list = [...groups.values()].sort((a, b) => b.profit - a.profit)
  const ch = d.products.find((p) => p.id === 'p9')!
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Segmented value={period} onChange={setPeriod} options={[['today', 'امروز'], ['week', 'این هفته'], ['month', 'این ماه'], ['all', 'همه']]} /><Button variant="ghost" onClick={() => setEx(true)}>مثال: خرید ۱ میلیون، فروش ۱٫۵ میلیون</Button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-brand-solid p-4 text-white"><p className="flex items-center gap-1.5 text-12 opacity-90"><TrendingUp size={14} />سود خالص</p><p className="tnum mt-2 text-24 font-bold">{compactToman(total)}</p><p className="text-11 opacity-90">{fa(calc.length)} سفارش · حاشیهٔ {pct((total / (rev || 1)) * 100, 1)}</p></div>
        <KPI label="فروش" value={compactToman(rev)} full={toman(rev)} />
        <KPI label="بهای کالای فروخته‌شده" value={compactToman(calc.reduce((a, c) => a + c.cogs, 0))} />
        <KPI label="کارمزد، ارسال و بسته‌بندی" value={compactToman(calc.reduce((a, c) => a + c.fee + c.packaging + c.shipCost - c.shipIncome, 0))} goodDown />
      </div>
      <Card title="سود به تفکیک" actions={<Select className="h-8 w-40" value={by} onChange={setBy} options={[['product', 'کالا'], ['category', 'دسته'], ['warehouse', 'انبار'], ['source', 'منبع تأمین'], ['channel', 'کانال فروش'], ['pay', 'روش پرداخت']]} />} pad={false}>
        {list.length === 0 ? <EmptyState title="در این بازه فروشی نیست." /> : <ul className="divide-y divide-line">{list.map((g) => (
          <li key={g.label}><button onClick={() => g.pid && nav(`/admin/catalog/${g.pid}?tab=price`)} className="flex w-full items-center gap-3 px-4 py-3 text-right hover:bg-surface-2">
            {g.pid ? <ProductImg pid={g.pid} size={44} /> : <span className="grid size-11 place-items-center rounded-lg bg-neutral-bg text-t2"><CircleDollarSign size={18} /></span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-13 font-medium">{g.label}</span><span className="text-11 text-t2">{fa(g.n)} فروش · {compactToman(g.revenue)}</span></span>
            {g.unknown ? <Button size="sm" onClick={(e) => { e.stopPropagation(); g.pid && nav(`/admin/catalog/${g.pid}/edit?step=6`) }}>ثبت قیمت خرید</Button> : <span className={cx('tnum flex items-center gap-1 text-14 font-bold', g.profit < 0 ? 'text-danger' : 'text-success')}>{g.profit < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}{compactToman(g.profit)}</span>}
          </button></li>))}</ul>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="پرسودترین سفارش‌ها"><Bars onPick={(l) => nav(`/admin/orders/${l}`)} data={calc.sort((a, b) => b.profit - a.profit).slice(0, 5).map((c) => ({ label: c.o.id, value: Math.max(0, c.profit) }))} fmt={(n) => compactToman(n)} color="var(--success)" /></Card>
        <Card title="کالاهای کم‌سود یا زیان‌ده">{list.filter((g) => g.profit / (g.revenue || 1) < 0.08).length ? <Bars data={list.filter((g) => g.profit / (g.revenue || 1) < 0.08).map((g) => ({ label: g.label, value: Math.abs(g.profit) }))} fmt={(n) => compactToman(n)} color="var(--danger)" /> : <p className="text-13 text-t2">همهٔ کالاها بالای ۸٪ سود دارند.</p>}</Card>
      </div>
      <Modal open={ex} onClose={() => setEx(false)} title={`ریز سود: ${ch.title}`}>
        <Waterfall steps={[{ label: 'فروش', value: 1.5 }, { label: 'خرید', value: -1 }, { label: 'کارمزد', value: -0.015 }, { label: 'بسته‌بندی', value: -0.025 }, { label: 'سود', value: 0.46 }]} />
        <dl className="mt-3 space-y-1 text-13">{[['قیمت خرید', -1000000], ['قیمت فروش', 1500000], ['کارمزد درگاه (۱٪)', -15000], ['بسته‌بندی', -25000]].map(([k, v]) => <div key={k as string} className="flex justify-between"><dt className="text-t2">{k}</dt><dd className={cx('tnum', (v as number) < 0 && 'text-danger')}>{toman(v as number)}</dd></div>)}<div className="flex justify-between border-t border-line pt-2 font-bold"><dt>سود هر واحد</dt><dd className="tnum text-success">{toman(460000)} ({pct(30.7, 1)})</dd></div></dl>
        <p className="mt-2 text-11 text-t2">هزینهٔ ارسال در سفارش‌های بالای آستانهٔ ارسال رایگان از سود کم می‌شود؛ ریز هر سفارش در صفحهٔ همان سفارش است.</p>
      </Modal>
    </div>
  )
}
export { CONDITION, Wallet }
