// گزارش مالی سرمایه‌گذار: درآمد، هزینه، سود، پرداخت‌ها (به چه کسی و برای چه)، خرید کالا، شرکا، سرمایه و نقدینگی؛ با بازهٔ زمانی، بخش‌های قابل انتخاب و خروجی PDF برگه‌ای A4
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Download, FileBarChart, Printer, RotateCcw } from 'lucide-react'
import { Button, Card, cx, Field, Input, Segmented, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fa, jday } from '@/shared/lib/fa'
import { printPages, saveBlob, toPdf } from '@/shared/lib/printOut'
import type { DB } from '@/shared/data/seed'
import { balanceOf, KIND_LABEL, type TEntry } from '@/shared/data/treasury'
import { landed, itemQty, fundRecon } from '@/shared/data/inbound'
import { split } from '@/shared/data/stock'

type Unit = 'toman' | 'mt' | 'usd'
type Opts = { preset: string; from: string; to: string; unit: Unit; salesSrc: 'orders' | 'ledger'; investor: string; title: string; note: string; mask: boolean; sections: Record<string, boolean> }
const SECTIONS: [string, string, string][] = [
  ['summary', 'خلاصهٔ اجرایی', 'شاخص‌های اصلی دوره و مقایسه با دورهٔ قبل'],
  ['pnl', 'سود و زیان ماه‌به‌ماه', 'درآمد، سود ناخالص، هزینه و سود خالص هر ماه با نمودار'],
  ['revenue', 'درآمدها', 'فروش به تفکیک کانال و روش پرداخت، درآمد غیرفروش'],
  ['expenses', 'هزینه‌ها', 'به تفکیک دسته و بیشترین طرف‌حساب‌ها، با سهم از کل'],
  ['payments', 'پرداخت‌ها: به چه کسی، برای چه', 'همهٔ پول‌های خارج‌شده، گروه‌بندی‌شده بر اساس دریافت‌کننده'],
  ['purchases', 'خرید کالا', 'محموله‌ها، ارزش، پول‌دهنده‌ها و سهم مالک‌ها'],
  ['partners', 'شرکا و تسویه‌ها', 'سهم فروش کالای شرکا و تسویه‌های انجام‌شده'],
  ['capital', 'سرمایه و منابع مالی', 'ورود سرمایه، وام و برداشت به تفکیک سرمایه‌گذار'],
  ['cash', 'نقدینگی و حساب‌ها', 'مانده اول و آخر دورهٔ هر حساب، میانگین مصرف ماهانه و ماه‌های باقی‌مانده'],
  ['ledger', 'دفتر ریز تراکنش‌ها', 'تک‌تک ردیف‌های دفتر در دوره (مو به مو)'],
  ['notes', 'توضیحات مدیریت', 'متن دلخواه شما برای سرمایه‌گذار'],
]
const KEY = 'gh-investor-report'
const DEF: Opts = { preset: '90', from: '', to: '', unit: 'toman', salesSrc: 'ledger', investor: '', title: 'گزارش مالی دوره‌ای غنیمت', note: '', mask: true, sections: Object.fromEntries(SECTIONS.map(([k]) => [k, k !== 'ledger'])) }
/** ماه شمسی (مثلاً «آبان ۱۴۰۵») برای گروه‌بندی ماه‌به‌ماه */
const JM = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long' })
const monthKey = (iso: string | Date) => JM.format(typeof iso === 'string' ? new Date(iso) : iso)
const SALE = ['order.paid', 'order.preparing', 'order.shipped', 'order.delivered', 'order.pickup_ready', 'order.needs_decision', 'order.returned']

function range(o: Opts, first: number): [number, number] {
  const end = o.preset === 'custom' && o.to ? +new Date(o.to) + 864e5 - 1 : Date.now()
  const start = o.preset === 'custom' && o.from ? +new Date(o.from) : o.preset === 'all' ? first : end - Number(o.preset) * 864e5
  return [start, end]
}
const sum = <T,>(A: T[], f: (x: T) => number) => A.reduce((a, x) => a + (f(x) || 0), 0)
const group = <T,>(A: T[], k: (x: T) => string, v: (x: T) => number) => { const m = new Map<string, { n: number; v: number }>(); A.forEach((x) => { const g = m.get(k(x)) ?? { n: 0, v: 0 }; g.n++; g.v += v(x) || 0; m.set(k(x), g) }); return [...m].sort((a, b) => b[1].v - a[1].v) }

function compute(d: DB, from: number, to: number, src: Opts['salesSrc']) {
  const inR = (iso?: string) => { if (!iso) return false; const t = +new Date(iso); return t >= from && t <= to }
  const T = d.treasury; const pn = (id: string) => d.stock.parties.find((p) => p.id === id)?.name ?? id; const inv = (id?: string) => T.investors.find((x) => x.id === id)?.name ?? id ?? '—'
  const O = d.orders.filter((o) => SALE.includes(o.status) && inR(o.createdAt)); const kept = O.filter((o) => o.status !== 'order.returned')
  const avgMargin = sum(kept, (o) => o.total) ? sum(kept, (o) => (o.total * o.margin) / 100) / sum(kept, (o) => o.total) : 0.15
  const E = T.entries.filter((e) => e.status === 'paid' && inR(e.at))
  const isSale = (e: TEntry) => e.kind === 'income' && /^فروش/.test(e.category ?? '')
  const ledgerSales = sum(E.filter(isSale), (e) => e.amount)
  const orderRev = sum(O, (o) => o.total)
  const revenue = src === 'ledger' && ledgerSales ? ledgerSales : orderRev
  const refunds = (d.refunds ?? []).filter((r) => ['sent', 'done'].includes(r.status) && inR(r.at)); const refundSum = sum(refunds, (r) => r.amount)
  const gross = src === 'ledger' && ledgerSales ? revenue * avgMargin : sum(kept, (o) => (o.total * o.margin) / 100)
  const fees = src === 'ledger' && ledgerSales ? 0 : sum(O, (o) => o.fee)
  const exp = E.filter((e) => e.kind === 'expense'); const opex = sum(exp, (e) => e.amount)
  const other = E.filter((e) => e.kind === 'income' && !isSale(e)); const otherSum = sum(other, (e) => e.amount)
  const net = gross - fees - opex + otherSum
  const capital = E.filter((e) => e.kind === 'capital'); const loans = E.filter((e) => e.kind === 'loan'); const draws = E.filter((e) => e.kind === 'draw')
  // خرید کالا
  const B = d.incoming.filter((b) => !b.single && b.items.length && inR(b.orderedAt)).map((b) => { const R = fundRecon(b); const rate = (b.currency ?? 'تومان') === 'تومان' ? 1 : b.rate || 0
    return { b, value: sum(b.items, (it) => landed(b, it).unit * itemQty(it)), units: sum(b.items, (it) => itemQty(it)), paid: R.hasFunding ? R.paid * rate : b.paid ?? 0, owners: R.rows.filter((r) => r.goods > 0).map((r) => ({ name: pn(r.party), v: r.goods * rate })), funders: R.rows.filter((r) => r.paid > 0).map((r) => ({ name: pn(r.party), v: r.paid * rate })), diff: R.hasFunding && !R.ok ? R.diff * rate : 0, recon: !!b.recon } })
  // شرکا
  const S = d.stock.sales.filter((x) => inR(x.at) && x.owner !== 'gh')
  const partnerShare = group(S, (x) => pn(x.owner), (x) => split(d.stock, x).ownerTotal)
  const settle = d.stock.settlements.filter((t) => inR(t.at))
  // پرداخت‌ها: به چه کسی، برای چه
  const pays: { to: string; what: string; n: number; v: number }[] = []
  group(exp, (e) => `${e.vendor || e.category || 'سایر'}|${e.category ?? 'هزینه'}`, (e) => e.amount).forEach(([k, g]) => { const [to, what] = k.split('|'); pays.push({ to, what, n: g.n, v: g.v }) })
  settle.filter((t) => t.from === 'gh').forEach((t) => pays.push({ to: pn(t.to), what: 'تسویهٔ سهم شریک', n: 1, v: t.amount }))
  if (refunds.length) pays.push({ to: `مشتریان (${fa(refunds.length)} مورد)`, what: 'بازپرداخت مرجوعی و لغو', n: refunds.length, v: refundSum })
  B.filter((x) => x.paid > 0).forEach((x) => pays.push({ to: x.b.supplier || pn(x.b.buyer ?? 'gh'), what: `خرید کالا · ${x.b.title}`, n: 1, v: x.paid }))
  draws.forEach((e) => pays.push({ to: inv(e.investor), what: 'برداشت شریک', n: 1, v: e.amount }))
  pays.sort((a, b) => b.v - a.v)
  // ماه‌به‌ماه
  const months: string[] = []; for (let t = from; t <= to; t += 864e5) { const k = monthKey(new Date(t)); if (!months.includes(k)) months.push(k) } if (!months.includes(monthKey(new Date(to)))) months.push(monthKey(new Date(to)))
  const monthly = months.map((k) => { const oo = O.filter((o) => monthKey(o.createdAt) === k); const kk = oo.filter((o) => o.status !== 'order.returned'); const ee = E.filter((e) => monthKey(e.at) === k)
    const rev = src === 'ledger' && ledgerSales ? sum(ee.filter(isSale), (e) => e.amount) : sum(oo, (o) => o.total); const g = src === 'ledger' && ledgerSales ? rev * avgMargin : sum(kk, (o) => (o.total * o.margin) / 100)
    const ox = sum(ee.filter((e) => e.kind === 'expense'), (e) => e.amount); const oi = sum(ee.filter((e) => e.kind === 'income' && !isSale(e)), (e) => e.amount); const f = src === 'ledger' && ledgerSales ? 0 : sum(oo, (o) => o.fee)
    return { k, rev, gross: g, opex: ox, net: g - f - ox + oi } })
  // نقدینگی
  const acc = T.accounts.filter((a) => a.active).map((a) => ({ name: a.name, kind: a.kind, open: balanceOf(T, a.id, from - 1), close: balanceOf(T, a.id, to) }))
  const days = Math.max(1, (to - from) / 864e5); const burn = (opex / days) * 30; const cash = sum(acc, (a) => a.close)
  return { O, kept, revenue, orderRev, ledgerSales, refunds, refundSum, gross, fees, opex, other, otherSum, net, exp, capital, loans, draws, B, partnerShare, settle, pays, monthly, acc, burn, cash, E, avgMargin, inv, pn,
    byChannel: group(O, (o) => o.channel || 'سایت', (o) => o.total), byPay: group(O, (o) => o.pay || '—', (o) => o.total), byCat: group(exp, (e) => e.category ?? 'سایر', (e) => e.amount), byVendor: group(exp, (e) => e.vendor || e.category || 'سایر', (e) => e.amount) }
}

export function InvestorReport() {
  const d = useDB(); const [o, setO0] = useState<Opts>(() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEF } })
  const setO = (p: Partial<Opts>) => setO0((x) => { const n = { ...x, ...p }; try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* */ } return n })
  const first = Math.min(...d.treasury.entries.map((e) => +new Date(e.at)), ...d.orders.map((x) => +new Date(x.createdAt)))
  const [from, to] = range(o, first); const span = to - from
  const R = useMemo(() => compute(d, from, to, o.salesSrc), [d, from, to, o.salesSrc])
  const P = useMemo(() => compute(d, from - span, from - 1, o.salesSrc), [d, from, span, o.salesSrc])
  const usd = (d.storeCfg?.fx?.rates?.['دلار'] as number | undefined) ?? 61500
  const M = (n: number) => o.unit === 'usd' ? `${n < 0 ? '−' : ''}${fa(Math.round(Math.abs(n) / usd).toLocaleString('en-US'))} دلار` : o.unit === 'mt' ? `${n < 0 ? '−' : ''}${fa((Math.abs(n) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }))} م.ت` : `${n < 0 ? '−' : ''}${fa(Math.round(Math.abs(n)).toLocaleString('en-US'))}`
  const unitLabel = o.unit === 'usd' ? `دلار (نرخ ${fa(usd.toLocaleString('en-US'))} تومان)` : o.unit === 'mt' ? 'میلیون تومان' : 'تومان'
  const sheets = useRef<HTMLDivElement>(null); const [busy, setBusy] = useState<string | null>(null)
  const pages = buildPages({ d, o, R, P, M, from, to, unitLabel })
  const els = () => [...(sheets.current?.querySelectorAll<HTMLElement>('.inv-page') ?? [])].map((el) => ({ el, paper: 'A4' }))
  const log = (how: string) => mutate((x) => { x.printLog.unshift({ id: `PL-${Date.now().toString(36).slice(-5).toUpperCase()}`, doc: 'investor', label: 'گزارش سرمایه‌گذار', ref: `${jday(from)} تا ${jday(to)}`, by: currentUser()?.name ?? 'مدیر', at: new Date().toISOString(), copy: 1, paper: 'A4' }) }, { action: `خروجی گزارش سرمایه‌گذار (${how})`, target: `${jday(from)} تا ${jday(to)}${o.investor ? ` · برای ${o.investor}` : ''}` })
  const pdf = async () => { setBusy('pdf'); try { const blob = await toPdf(els()); saveBlob(blob, `ghanimat-investor-${new Date(from).toISOString().slice(0, 10)}_${new Date(to).toISOString().slice(0, 10)}.pdf`); log('PDF'); toast(`PDF با ${fa(pages.length)} صفحه ساخته شد.`) } catch (e) { toast(`ساخت PDF ناموفق بود: ${(e as Error).message}`, { tone: 'err' }) } finally { setBusy(null) } }
  const print = async () => { setBusy('print'); const ok = await printPages(els()); setBusy(null); if (ok) log('چاپ'); else toast('مرورگر پنجرهٔ چاپ را باز نکرد؛ «دانلود PDF» را بزنید.', { tone: 'err' }) }
  return <Page title="گزارش سرمایه‌گذار" module="investor" sub="آمار مالی دوره، مو به مو: چقدر خرج شد، چقدر درآمد داشتیم، چقدر و به چه کسی پرداخت شد؛ با خروجی PDF"
    primary={<span className="flex gap-2"><Button icon={<Printer size={14} />} loading={busy === 'print'} onClick={() => void print()}>چاپ</Button><Button variant="primary" icon={<Download size={14} />} loading={busy === 'pdf'} onClick={() => void pdf()}>دانلود PDF ({fa(pages.length)} صفحه)</Button></span>}>
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4 xl:sticky xl:top-2 xl:self-start">
        <Card title="بازه و واحد" collapsible={false}><div className="space-y-3">
          <Segmented size="sm" value={o.preset} onChange={(v) => setO({ preset: v })} options={[['30', '۳۰ روز'], ['90', '۹۰ روز'], ['180', '۶ ماه'], ['all', 'از ابتدا'], ['custom', 'سفارشی']]} />
          {o.preset === 'custom' && <div className="grid grid-cols-2 gap-2"><Field label="از"><Input type="date" value={o.from} onChange={(e) => setO({ from: e.target.value })} /></Field><Field label="تا"><Input type="date" value={o.to} onChange={(e) => setO({ to: e.target.value })} /></Field></div>}
          <p className="text-12 text-t2">{jday(from)} تا {jday(to)} · {fa(Math.round(span / 864e5))} روز</p>
          <Field label="واحد مبلغ‌ها"><Segmented size="sm" value={o.unit} onChange={(v) => setO({ unit: v as Unit })} options={[['toman', 'تومان'], ['mt', 'میلیون تومان'], ['usd', 'دلار']]} /></Field>
          <Field label="منبع درآمد فروش" help={o.salesSrc === 'ledger' ? 'جمع واریزهای فروش در دفتر خزانه (خلاصهٔ درگاه)؛ سود ناخالص با میانگین حاشیهٔ سفارش‌ها برآورد می‌شود.' : 'سفارش‌های ثبت‌شده در پنل با حاشیهٔ سود واقعی هر سفارش.'}><Segmented size="sm" value={o.salesSrc} onChange={(v) => setO({ salesSrc: v as Opts['salesSrc'] })} options={[['ledger', 'دفتر خزانه'], ['orders', 'سفارش‌های پنل']]} /></Field>
        </div></Card>
        <Card title="بخش‌های گزارش" collapsible={false}><ul className="space-y-2">{SECTIONS.map(([k, l, h]) => <li key={k} className="flex items-start gap-2 text-13"><Toggle on={!!o.sections[k]} label={l} onChange={(v) => setO({ sections: { ...o.sections, [k]: v } })} /><span><span className="block font-medium">{l}</span><span className="text-11 text-t3">{h}</span></span></li>)}</ul></Card>
        <Card title="شخصی‌سازی" collapsible={false}><div className="space-y-3">
          <Field label="عنوان گزارش"><Input value={o.title} onChange={(e) => setO({ title: e.target.value })} /></Field>
          <Field label="تقدیم به (نام سرمایه‌گذار)"><Input value={o.investor} onChange={(e) => setO({ investor: e.target.value })} placeholder={d.treasury.investors.find((x) => x.kind === 'equity')?.name ?? 'نام سرمایه‌گذار'} /></Field>
          {o.sections.notes && <Field label="توضیحات مدیریت"><Textarea rows={4} value={o.note} onChange={(e) => setO({ note: e.target.value })} placeholder="مثلاً: رشد فروش ماه سوم از کمپین اینستاگرام بود؛ برای فصل بعد خرید عمده از اربیل داریم." /></Field>}
          <label className="flex items-center gap-2 text-13"><Toggle on={o.mask} label="پوشاندن نام مشتری‌ها" onChange={(v) => setO({ mask: v })} />پوشاندن نام مشتری‌ها در دفتر ریز</label>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setO0(DEF)}>بازگشت به تنظیم پیش‌فرض</Button>
        </div></Card>
      </div>
      <div ref={sheets} className="space-y-6 overflow-x-auto rounded-xl border border-line bg-neutral-bg p-4 md:p-6">{pages.map((pg, i) => <div key={i} className="inv-page mx-auto bg-white text-[#10123d] shadow-float" style={{ width: 794, minHeight: 1123, padding: '44px 48px 36px', display: 'flex', flexDirection: 'column', fontSize: 12 }}>
        <header className="mb-5 flex items-center justify-between border-b-2 border-[#0000ff] pb-3"><img src="./brand/logo-full.png" alt="غنیمت" style={{ height: 28 }} /><span className="text-left text-[11px] text-[#5b5f86]">{o.title}<br />{jday(from)} تا {jday(to)}</span></header>
        <div className="flex-1">{pg}</div>
        <footer className="mt-6 flex items-center justify-between border-t border-[#e3e5f2] pt-2 text-[10px] text-[#8a8db0]"><span>محرمانه · تهیه‌شده از دادهٔ پنل غنیمت در {jday(Date.now())} · مبلغ‌ها به {unitLabel}</span><span>صفحهٔ {fa(i + 1)} از {fa(pages.length)}</span></footer>
      </div>)}</div>
    </div>
  </Page>
}

/* ───── برگه‌ها ───── */
const H = ({ children, sub }: { children: ReactNode; sub?: string }) => <div className="mb-3"><h2 className="text-[17px] font-extrabold">{children}</h2>{sub && <p className="text-[11px] text-[#5b5f86]">{sub}</p>}</div>
function Tbl({ head, rows, foot, num = [] }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode[]; num?: number[] }) {
  return <table className="mb-4 w-full border-collapse text-[11px]"><thead><tr>{head.map((h, i) => <th key={i} className={cx('border-b-2 border-[#10123d] bg-[#f3f4fb] px-2 py-1.5 font-bold', num.includes(i) ? 'text-left' : 'text-right')}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className={i % 2 ? 'bg-[#fafbff]' : ''}>{r.map((c, j) => <td key={j} className={cx('border-b border-[#e3e5f2] px-2 py-1.5 align-top', num.includes(j) && 'ltr text-left tabular-nums')}>{c}</td>)}</tr>)}
      {rows.length === 0 && <tr><td colSpan={head.length} className="px-2 py-3 text-center text-[#8a8db0]">در این دوره موردی نیست.</td></tr>}</tbody>
    {foot && <tfoot><tr>{foot.map((c, j) => <td key={j} className={cx('border-t-2 border-[#10123d] px-2 py-1.5 font-bold', num.includes(j) && 'ltr text-left tabular-nums')}>{c}</td>)}</tr></tfoot>}</table>
}
const chunk = <T,>(A: T[], n: number) => (A.length ? Array.from({ length: Math.ceil(A.length / n) }, (_, i) => A.slice(i * n, i * n + n)) : [[]])
const share = (v: number, t: number) => (t ? `${fa(((v / t) * 100).toFixed(1))}٪` : '—')

type BP = { d: DB; o: Opts; R: ReturnType<typeof compute>; P: ReturnType<typeof compute>; M: (n: number) => string; from: number; to: number; unitLabel: string }
function buildPages({ d, o, R, P, M, from, to, unitLabel }: BP): ReactNode[] {
  const pages: ReactNode[] = []; const on = (k: string) => !!o.sections[k]
  const delta = (a: number, b: number) => (b ? <span className={a >= b ? 'text-[#12733f]' : 'text-[#c2410c]'}>{a >= b ? '▲' : '▼'} {fa(Math.abs(((a - b) / Math.abs(b)) * 100).toFixed(0))}٪</span> : <span className="text-[#8a8db0]">—</span>)
  const runway = R.burn > 0 ? R.cash / R.burn : 0
  // جلد و خلاصه
  pages.push(<div>
    <div className="mb-6 rounded-2xl bg-[#10123d] p-6 text-white"><p className="text-[11px] opacity-70">گزارش مالی برای سرمایه‌گذار</p><h1 className="mt-1 text-[24px] font-extrabold">{o.title}</h1><p className="mt-2 text-[13px]">دورهٔ {jday(from)} تا {jday(to)}{o.investor ? ` · تقدیم به ${o.investor}` : ''}</p><p className="mt-3 text-[11px] opacity-70">مبلغ‌ها به {unitLabel}. منبع درآمد فروش: {o.salesSrc === 'ledger' && R.ledgerSales ? 'واریزهای فروش در دفتر خزانه' : 'سفارش‌های ثبت‌شده در پنل'}.</p></div>
    {on('summary') && <>
      <H sub="هر عدد با دورهٔ هم‌طول قبلی مقایسه شده است">خلاصهٔ اجرایی</H>
      <div className="mb-5 grid grid-cols-3 gap-2">{([['درآمد فروش', R.revenue, P.revenue], ['سود ناخالص', R.gross, P.gross], ['هزینه‌های عملیاتی', R.opex, P.opex], ['سود (زیان) خالص', R.net, P.net], ['ورود سرمایه و وام', sum(R.capital, (e) => e.amount) + sum(R.loans, (e) => e.amount), sum(P.capital, (e) => e.amount) + sum(P.loans, (e) => e.amount)], ['نقد پایان دوره', R.cash, P.cash]] as [string, number, number][]).map(([l, v, p]) => <div key={l} className="rounded-xl border border-[#e3e5f2] p-3"><p className="text-[10px] text-[#5b5f86]">{l}</p><p className={cx('ltr text-left text-[16px] font-extrabold tabular-nums', l.startsWith('سود (') && v < 0 && 'text-[#c2410c]')}>{M(v)}</p><p className="text-[10px]">{delta(v, p)} <span className="text-[#8a8db0]">نسبت به قبل</span></p></div>)}</div>
      <Tbl head={['شاخص', 'این دوره', 'دورهٔ قبل']} num={[1, 2]} rows={[
        ['تعداد سفارش (بدون لغو)', fa(R.O.length), fa(P.O.length)], ['میانگین مبلغ سفارش', M(R.O.length ? R.orderRev / R.O.length : 0), M(P.O.length ? P.orderRev / P.O.length : 0)],
        ['حاشیهٔ سود ناخالص', R.revenue ? `${fa(((R.gross / R.revenue) * 100).toFixed(1))}٪` : '—', P.revenue ? `${fa(((P.gross / P.revenue) * 100).toFixed(1))}٪` : '—'],
        ['مرجوعی و بازپرداخت', M(R.refundSum), M(P.refundSum)], ['کارمزد درگاه', M(R.fees), M(P.fees)],
        ['میانگین هزینهٔ ماهانه', M(R.burn), M(P.burn)], ['ماه‌های باقی‌مانده با نقد فعلی', runway ? fa(runway.toFixed(1)) : '—', '—']]} />
      <p className="rounded-lg bg-[#f3f4fb] px-3 py-2 text-[10px] leading-5 text-[#5b5f86]">سود خالص = سود ناخالص − کارمزد درگاه − هزینه‌های عملیاتی + درآمد غیرفروش. خرید کالا هزینه حساب نمی‌شود و تا فروش در موجودی می‌ماند؛ بهای کالای فروخته‌شده در سود ناخالص کم شده است.</p>
    </>}
  </div>)
  if (on('pnl')) { const mx = Math.max(1, ...R.monthly.flatMap((m) => [m.rev, m.opex, Math.abs(m.net)]))
    pages.push(<div><H sub="هر ستون یک ماه شمسی از دوره">سود و زیان ماه‌به‌ماه</H>
      <svg viewBox="0 0 700 220" className="mb-4 w-full" role="img" aria-label="نمودار درآمد، هزینه و سود خالص ماهانه">{R.monthly.map((m, i) => { const w = 700 / R.monthly.length; const x = i * w; const bw = Math.min(26, w / 4); const y0 = 180; const h = (v: number) => (Math.abs(v) / mx) * 160
        return <g key={m.k} transform={`translate(${700 - x - w},0)`}><rect x={w / 2 - bw * 1.6} y={y0 - h(m.rev)} width={bw} height={h(m.rev)} fill="#0000ff" rx="3" /><rect x={w / 2 - bw * 0.5} y={y0 - h(m.opex)} width={bw} height={h(m.opex)} fill="#ffc24b" rx="3" /><rect x={w / 2 + bw * 0.6} y={m.net >= 0 ? y0 - h(m.net) : y0} width={bw} height={h(m.net)} fill={m.net >= 0 ? '#12733f' : '#c2410c'} rx="3" /><text x={w / 2} y={205} textAnchor="middle" fontSize="11" fill="#5b5f86">{m.k}</text></g> })}<line x1="0" x2="700" y1="180" y2="180" stroke="#c9cce3" /></svg>
      <p className="mb-3 flex gap-4 text-[10px]"><span><span className="ml-1 inline-block size-2.5 rounded-sm bg-[#0000ff]" />درآمد فروش</span><span><span className="ml-1 inline-block size-2.5 rounded-sm bg-[#ffc24b]" />هزینهٔ عملیاتی</span><span><span className="ml-1 inline-block size-2.5 rounded-sm bg-[#12733f]" />سود خالص (قرمز: زیان)</span></p>
      <Tbl head={['ماه', 'درآمد فروش', 'سود ناخالص', 'هزینهٔ عملیاتی', 'سود (زیان) خالص']} num={[1, 2, 3, 4]} rows={R.monthly.map((m) => [m.k, M(m.rev), M(m.gross), M(m.opex), <b key="n" className={m.net < 0 ? 'text-[#c2410c]' : ''}>{M(m.net)}</b>])} foot={['جمع', M(sum(R.monthly, (m) => m.rev)), M(sum(R.monthly, (m) => m.gross)), M(sum(R.monthly, (m) => m.opex)), M(sum(R.monthly, (m) => m.net))]} />
    </div>) }
  if (on('revenue')) pages.push(<div><H sub={`جمع سفارش‌های ثبت‌شده: ${M(R.orderRev)} · ${fa(R.O.length)} سفارش`}>درآمدها</H>
    <Tbl head={['کانال فروش', 'تعداد', 'مبلغ', 'سهم']} num={[1, 2, 3]} rows={R.byChannel.map(([k, g]) => [k, fa(g.n), M(g.v), share(g.v, R.orderRev)])} />
    <Tbl head={['روش پرداخت', 'تعداد', 'مبلغ', 'سهم']} num={[1, 2, 3]} rows={R.byPay.map(([k, g]) => [k, fa(g.n), M(g.v), share(g.v, R.orderRev)])} />
    <Tbl head={['درآمد غیرفروش', 'تاریخ', 'مبلغ']} num={[2]} rows={R.other.map((e) => [e.note || e.category || 'درآمد', jday(e.at), M(e.amount)])} foot={['جمع', '', M(R.otherSum)]} />
  </div>)
  if (on('expenses')) pages.push(<div><H sub={`جمع هزینه‌های عملیاتی: ${M(R.opex)} · ${fa(R.exp.length)} ردیف`}>هزینه‌ها</H>
    <Tbl head={['دسته', 'تعداد', 'مبلغ', 'سهم از کل', 'بودجهٔ ماهانه']} num={[1, 2, 3, 4]} rows={R.byCat.map(([k, g]) => [k, fa(g.n), M(g.v), share(g.v, R.opex), d.treasury.budgets[k] ? M(d.treasury.budgets[k]) : '—'])} foot={['جمع', fa(R.exp.length), M(R.opex), '۱۰۰٪', '']} />
    <Tbl head={['ده طرف‌حساب اول', 'تعداد', 'مبلغ', 'سهم']} num={[1, 2, 3]} rows={R.byVendor.slice(0, 10).map(([k, g]) => [k, fa(g.n), M(g.v), share(g.v, R.opex)])} />
  </div>)
  if (on('payments')) chunk(R.pays, 26).forEach((rows, i, A) => pages.push(<div><H sub={i === 0 ? `همهٔ پول‌های خارج‌شده در دوره: ${M(sum(R.pays, (p) => p.v))}` : 'ادامه'}>پرداخت‌ها: به چه کسی، برای چه</H>
    <Tbl head={['دریافت‌کننده', 'برای چه', 'دفعات', 'مبلغ']} num={[2, 3]} rows={rows.map((p) => [p.to, p.what, fa(p.n), M(p.v)])} foot={i === A.length - 1 ? ['جمع', '', fa(sum(R.pays, (p) => p.n)), M(sum(R.pays, (p) => p.v))] : undefined} /></div>))
  if (on('purchases')) pages.push(<div><H sub={`${fa(R.B.length)} محموله با ارزش تمام‌شدهٔ ${M(sum(R.B, (x) => x.value))}`}>خرید کالا</H>
    <Tbl head={['محموله', 'تعداد', 'ارزش تمام‌شده', 'پول‌دهنده‌ها', 'سهم مالک‌ها', 'تطبیق']} num={[1, 2]} rows={R.B.map((x) => [<span key="t"><b>{x.b.title}</b><br /><span className="text-[10px] text-[#8a8db0]">{x.b.id} · {jday(x.b.orderedAt)}</span></span>, fa(x.units), M(x.value), x.funders.length ? x.funders.map((f) => `${f.name} ${M(f.v)}`).join('، ') : '—', x.owners.map((f) => `${f.name} ${M(f.v)}`).join('، '), x.recon ? 'تأیید شد' : x.diff ? `مغایرت ${M(x.diff)}` : x.funders.length ? 'بدون مغایرت' : '—'])} foot={['جمع', fa(sum(R.B, (x) => x.units)), M(sum(R.B, (x) => x.value)), M(sum(R.B, (x) => x.paid)), '', '']} />
    <p className="text-[10px] text-[#5b5f86]">ارزش تمام‌شده شامل بهای خرید با نرخ ارز محموله و سهم حمل، گمرک و سایر هزینه‌هاست.</p></div>)
  if (on('partners')) pages.push(<div><H sub="کالای شرکا با قرارداد سهم سود یا قیمت ثابت فروخته می‌شود">شرکا و تسویه‌ها</H>
    <Tbl head={['شریک', 'تعداد فروش', 'سهم شریک از فروش']} num={[1, 2]} rows={R.partnerShare.map(([k, g]) => [k, fa(g.n), M(g.v)])} />
    <Tbl head={['تاریخ', 'از', 'به', 'مبلغ', 'شناسه']} num={[3]} rows={R.settle.map((t) => [jday(t.at), R.pn(t.from), R.pn(t.to), M(t.amount), <span key="r" className="ltr font-mono">{t.ref}</span>])} />
  </div>)
  if (on('capital')) pages.push(<div><H sub="منابع مالی کسب‌وکار در دوره">سرمایه و منابع مالی</H>
    <Tbl head={['تاریخ', 'نوع', 'سرمایه‌گذار', 'مبلغ', 'شرح']} num={[3]} rows={[...R.capital, ...R.loans, ...R.draws].sort((a, b) => a.at.localeCompare(b.at)).map((e) => [jday(e.at), KIND_LABEL[e.kind], R.inv(e.investor), M(e.kind === 'draw' ? -e.amount : e.amount), e.note ?? ''])} foot={['خالص', '', '', M(sum(R.capital, (e) => e.amount) + sum(R.loans, (e) => e.amount) - sum(R.draws, (e) => e.amount)), '']} />
    <Tbl head={['سرمایه‌گذار', 'نوع', 'تعهد', 'سهم', 'آورده تا پایان دوره']} num={[2, 3, 4]} rows={d.treasury.investors.map((v) => [v.name, v.kind === 'equity' ? 'سهام' : v.kind === 'loan' ? 'وام' : 'مؤسس', M(v.committed), v.share ? `${fa(v.share)}٪` : '—', M(sum(d.treasury.entries.filter((e) => e.status === 'paid' && e.investor === v.id && ['capital', 'loan'].includes(e.kind) && +new Date(e.at) <= to), (e) => e.amount))])} />
  </div>)
  if (on('cash')) pages.push(<div><H sub={`نقد کل پایان دوره ${M(R.cash)} · میانگین مصرف ماهانه ${M(R.burn)}${runway ? ` · حدود ${fa(runway.toFixed(1))} ماه` : ''}`}>نقدینگی و حساب‌ها</H>
    <Tbl head={['حساب', 'مانده اول دوره', 'مانده آخر دوره', 'تغییر']} num={[1, 2, 3]} rows={R.acc.map((a) => [a.name, M(a.open), M(a.close), M(a.close - a.open)])} foot={['جمع', M(sum(R.acc, (a) => a.open)), M(R.cash), M(R.cash - sum(R.acc, (a) => a.open))]} /></div>)
  if (on('ledger')) { const L = R.E.slice().sort((a, b) => a.at.localeCompare(b.at)).filter((e) => e.kind !== 'transfer')
    chunk(L, 30).forEach((rows, i) => pages.push(<div><H sub={i === 0 ? `${fa(L.length)} ردیف (انتقال بین حساب‌های خودمان حذف شده)` : 'ادامه'}>دفتر ریز تراکنش‌ها</H>
      <Tbl head={['تاریخ', 'نوع', 'دسته / طرف‌حساب', 'شرح', 'مبلغ']} num={[4]} rows={rows.map((e) => [jday(e.at), KIND_LABEL[e.kind], e.vendor || e.category || R.inv(e.investor), (o.mask ? (e.note ?? '').replace(/(مشتری|خانم|آقای)\s+\S+/g, '$1 ***') : e.note) ?? '', M(['expense', 'draw'].includes(e.kind) ? -e.amount : e.amount)])} /></div>)) }
  if (on('notes') && o.note.trim()) pages.push(<div><H>توضیحات مدیریت</H><p className="whitespace-pre-line text-[13px] leading-7">{o.note}</p></div>)
  return pages
}
export const INVESTOR_ICON = FileBarChart
