import { useEffect, useState } from 'react'
import { Check, FileCheck2, Plane, ShieldCheck, Warehouse } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Toggle } from '@/shared/ui/base'
import { Area } from '@/shared/ui/charts'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, num, toman } from '@/shared/lib/fa'
import { fetchRate, FX_CURS, type FxCur, type FxResult } from '@/shared/lib/fx'
import type { ImportRoute, Pdp, PricePoint } from '@/shared/data/seed'
import { RemoteFor } from '@/shared/ui/remoteUpload'

const day = (s?: string) => (s ? s.slice(0, 10) : '')
const faDate = (s?: string) => (s ? new Date(s).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
export const blankRoute = (): ImportRoute => ({ origin: 'amazon', store: 'Amazon.com', seller: 'Amazon.com', boughtAt: '', inbound: 'tehran', inAt: '' })

/** مراحل مسیر واردات به همان ترتیبی که در صفحهٔ کالا نمایش داده می‌شود */
export const routeSteps = (r: ImportRoute): [string, string | undefined][] => r.inbound === 'baneh'
  ? [['خرید از فروشگاه مبدأ', r.boughtAt], ['ورود به انبار بانه', r.inAt], ['انتقال به انبار تهران', r.transferAt], ['کنترل کیفیت و عکاسی', undefined]]
  : [[r.origin === 'amazon' ? 'خرید از آمازون' : 'خرید از فروشگاه مبدأ', r.boughtAt], ['ارسال بین‌المللی', undefined], ['ورود به انبار تهران', r.inAt], ['کنترل کیفیت و عکاسی', undefined]]

/** فیگما: صفحهٔ کالا › «مبدأ و مسیر واردات» (دو حالت: آمازون مستقیم به تهران، فروشگاه خارجی از راه انبار بانه) */
export function RouteEditor({ pdp, onChange }: { pdp: Pdp; onChange: (p: Pdp) => void }) {
  const r = pdp.route ?? blankRoute(); const set = (x: Partial<ImportRoute>) => onChange({ ...pdp, route: { ...r, ...x } })
  const order = r.inAt && r.boughtAt && r.inAt < r.boughtAt
  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><Plane size={15} />مبدأ و مسیر واردات</p>{!pdp.route && <Badge tone="warning">هنوز ثبت نشده؛ بخش «مبدأ و مسیر واردات» در صفحهٔ کالا پنهان می‌ماند</Badge>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="مبدأ خرید"><Segmented value={r.origin} onChange={(v) => set(v === 'amazon' ? { origin: v, store: 'Amazon.com', seller: r.seller || 'Amazon.com' } : { origin: v, store: r.store === 'Amazon.com' ? '' : r.store })} options={[['amazon', 'آمازون'], ['store', 'فروشگاه خارجی']]} /></Field>
        <Field label="انبار ورودی"><Segmented value={r.inbound} onChange={(v) => set({ inbound: v })} options={[['tehran', 'مستقیم انبار تهران'], ['baneh', 'انبار بانه، سپس تهران']]} /></Field>
        <Field label={r.origin === 'amazon' ? 'نسخهٔ آمازون' : 'نام فروشگاه مبدأ'}><Input className={r.origin === 'amazon' ? 'ltr text-left' : ''} value={r.store} onChange={(e) => set({ store: e.target.value })} placeholder={r.origin === 'amazon' ? 'Amazon.com / Amazon.ae' : 'مثلاً Sharaf DG (اربیل)'} /></Field>
        <Field label="فروشنده در مبدأ" help="در صفحهٔ کالا: «فروشنده در آمازون»"><Input className="ltr text-left" value={r.seller} onChange={(e) => set({ seller: e.target.value })} /></Field>
        <Field label={r.origin === 'amazon' ? 'تاریخ خرید از آمازون' : 'تاریخ خرید از فروشگاه مبدأ'}><Input type="date" value={day(r.boughtAt)} onChange={(e) => set({ boughtAt: e.target.value })} /></Field>
        <Field label={r.inbound === 'baneh' ? 'ورود به انبار بانه' : 'ورود به انبار تهران'} error={order ? 'تاریخ ورود نمی‌تواند پیش از تاریخ خرید باشد.' : undefined}><Input type="date" value={day(r.inAt)} onChange={(e) => set({ inAt: e.target.value })} /></Field>
        {r.inbound === 'baneh' && <Field label="انتقال به انبار تهران"><Input type="date" value={day(r.transferAt)} onChange={(e) => set({ transferAt: e.target.value })} /></Field>}
        <Field label="فاکتور خرید" help="فقط برای سوابق داخلی؛ خود فاکتور در سایت نمایش داده نمی‌شود، فقط عبارت «ثبت‌شده در سوابق کالا».">
          <div className="flex items-center gap-2"><label className="btn flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 text-12"><FileCheck2 size={14} />{r.invoice ? 'تعویض فایل' : 'بارگذاری فاکتور'}<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { set({ invoice: f.name, invoiceOk: false }); toast('فاکتور بارگذاری شد؛ پس از تطبیق مبلغ و سریال، «تأیید فاکتور» را بزنید.') } }} /></label><RemoteFor label="فاکتور خرید" docs compact />
            {r.invoice && <><span className="ltr truncate font-mono text-11 text-t2">{r.invoice}</span><Toggle on={!!r.invoiceOk} onChange={(v) => set({ invoiceOk: v })} text="تأییدشده" /></>}</div>
        </Field>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-2 p-2 text-11">{routeSteps(r).map(([t, at], i) => <li key={t} className="flex items-center gap-1.5">{i > 0 && <span className="text-t3">←</span>}<span className={cx('rounded-full px-2 py-0.5', at || i === routeSteps(r).length - 1 ? 'bg-success-bg text-success' : 'bg-neutral-bg text-t2')}>{t}{at ? ` · ${faDate(at)}` : ''}</span></li>)}</ol>
      <p className="text-11 text-t2">متن صفحهٔ کالا: «{r.origin === 'amazon' ? 'این کالا از آمازون خریداری و وارد شده است' : 'این کالا از فروشگاه خارجی خریداری و وارد شده است'}» · {r.inbound === 'baneh' ? 'ورود اول به انبار بانه، سپس انتقال به انبار تهران غنیمت.' : 'خرید مستقیم، ارسال بین‌المللی و ورود به انبار تهران غنیمت.'}</p>
    </div>
  )
}

/** فیگما: «تأیید اصالت و سلامت توسط غنیمت» — دو لایهٔ کنترل کیفیت */
export const QC_LAYERS: [string, string[]][] = [
  ['لایهٔ ۱ — پیش از ارسال به انبار', ['بررسی اولیهٔ کارکرد و اصالت']],
  ['لایهٔ ۲ — در انبار غنیمت', ['بررسی سلامت پلمپ', 'تطبیق اصالت کالا', 'عکاسی واقعی از همین کالا', 'تخصیص گارانتی بر اساس دستهٔ کالا', 'روشن‌کردن و تست عملکرد پایه']],
]
const POWER = 'روشن‌کردن و تست عملکرد پایه'
export const qcItems = (sealed: boolean) => QC_LAYERS.flatMap(([, xs]) => xs).filter((x) => !(sealed && x === POWER))
export const qcDone = (pdp: Pdp, sealed: boolean) => qcItems(sealed).every((x) => pdp.qc?.[x])

export function QcLayers({ pdp, sealed, onChange }: { pdp: Pdp; sealed: boolean; onChange: (p: Pdp) => void }) {
  const qc = pdp.qc ?? {}; const all = qcItems(sealed); const n = all.filter((x) => qc[x]).length
  return (
    <div className="space-y-2 rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><ShieldCheck size={15} />کنترل کیفیت دو لایه</p><Badge tone={n === all.length ? 'success' : 'warning'}>{fa(n)} از {fa(all.length)}</Badge></div>
      <p className="text-11 text-t2">«هیچ کالایی بدون عبور از کنترل کیفیت غنیمت در سایت نمایش داده نمی‌شود.» تا همهٔ موارد تیک نخورد، نشان «این کالا از هر دو لایهٔ کنترل کیفیت عبور کرده است» در صفحهٔ کالا نمایش داده نمی‌شود.</p>
      <div className="grid gap-3 sm:grid-cols-2">{QC_LAYERS.map(([t, xs]) => <div key={t}><p className="mb-1 text-12 font-medium">{t}</p><ul className="space-y-1">{xs.map((x) => { const na = sealed && x === POWER; return <li key={x}><button type="button" disabled={na} onClick={() => onChange({ ...pdp, qc: { ...qc, [x]: !qc[x] } })} className={cx('flex min-h-10 w-full items-center gap-2 rounded-md border px-2.5 text-right text-12', na ? 'border-line opacity-60' : qc[x] ? 'border-success bg-success-bg' : 'border-line')}><span className={cx('grid size-4 place-items-center rounded-sm border', qc[x] && !na ? 'border-success bg-success-solid text-white' : 'border-line')}>{qc[x] && !na && <Check size={11} />}</span><span className="flex-1">{x}</span>{na && <span className="text-11 text-t2">برای کالای پلمپ لازم نیست</span>}</button></li> })}</ul></div>)}</div>
      <p className="flex items-center gap-1.5 text-11 text-t2"><Warehouse size={12} />ویدیوی تست را در گام «تصاویر و ویدیو» با نوع «ویدیوی تست غنیمت» اضافه کنید.</p>
    </div>
  )
}

const RANGES: [string, string, number][] = [['1m', '۱ ماه', 1], ['3m', '۳ ماه', 3], ['6m', '۶ ماه', 6], ['1y', '۱ سال', 12]]
/** ثبت تغییر قیمت در تاریخچه (فقط اگر با آخرین قیمت فرق داشته باشد) */
export function logPrice(x: { priceLog: PricePoint[] }, pid: string, price: number, by: string) {
  if (!price) return; const last = [...x.priceLog].reverse().find((p) => p.pid === pid)
  if (!last || last.price !== price) x.priceLog.push({ pid, at: new Date().toISOString(), price, by })
}

/** فیگما: «نمودار قیمت فروش» (۱ ماه، ۳ ماه، ۶ ماه، ۱ سال؛ بیشترین و کمترین ۶ ماه؛ قیمت امروز) */
export function PriceChart({ pid }: { pid: string }) {
  const d = useDB(); const cfg = d.storeCfg.pdp.priceChart; const [r, setR] = useState(cfg.range)
  const p = d.products.find((x) => x.id === pid)!; const months = RANGES.find((x) => x[0] === r)![2]
  const all = d.priceLog.filter((x) => x.pid === pid).sort((a, b) => a.at.localeCompare(b.at))
  const pts = all.filter((x) => Date.now() - new Date(x.at).getTime() <= months * 31 * 864e5)
  const six = all.filter((x) => Date.now() - new Date(x.at).getTime() <= 6 * 31 * 864e5).map((x) => x.price)
  const shown = p.pdp?.showPriceChart ?? cfg.on; const enough = pts.length >= cfg.minPoints
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><Segmented size="sm" value={r} onChange={setR} options={RANGES.map(([k, l]) => [k, l] as [string, string])} /><Toggle on={shown} onChange={(v) => mutate((x) => { const t = x.products.find((y) => y.id === pid)!; if (t.pdp) t.pdp.showPriceChart = v }, { action: v ? 'نمایش نمودار قیمت در صفحهٔ کالا' : 'پنهان‌کردن نمودار قیمت', target: p.title })} text="نمایش «نمودار قیمت» در صفحهٔ کالا" /></div>
      <div className="grid gap-2 sm:grid-cols-3">{[['بیشترین قیمت در ۶ ماه', six.length ? Math.max(...six) : 0], ['کمترین قیمت در ۶ ماه', six.length ? Math.min(...six) : 0], ['قیمت امروز', all.at(-1)?.price ?? 0]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-neutral-bg p-3"><p className="text-11 text-t2">{k}</p><p className="tnum text-14 font-bold">{v ? toman(v as number) : '—'}</p></div>)}</div>
      {enough ? <Area data={pts.map((x) => x.price)} labels={pts.map((x) => new Date(x.at).toLocaleDateString('fa-IR', { month: 'short' }))} fmt={(n) => toman(n)} /> : <p className="rounded-xl bg-warning-bg px-3 py-2 text-12 text-warning">در این بازه کمتر از {fa(cfg.minPoints)} قیمت ثبت شده؛ نمودار در صفحهٔ کالا نمایش داده نمی‌شود تا روند گمراه‌کننده نباشد.</p>}
      <p className="text-11 text-t2">قیمت‌ها مربوط به همین تنوع (رنگ و حافظه) است. هر ذخیرهٔ قیمت در فرم کالا، ویرایش جدولی یا قیمت‌گذاری خودکار یک نقطه ثبت می‌کند.</p>
      <details className="text-12"><summary className="cursor-pointer text-brand">همهٔ تغییرات ({fa(all.length)})</summary><ul className="mt-2 divide-y divide-line">{[...all].reverse().map((x, i) => <li key={i} className="flex justify-between py-1.5"><span className="text-t2">{faDate(x.at)} · {x.by}</span><span className="tnum">{toman(x.price)}</span></li>)}</ul></details>
      {!all.length && <Button size="sm" onClick={() => mutate((x) => logPrice(x, pid, p.price ?? 0, 'سیستم'), { action: 'ثبت قیمت فعلی در تاریخچه', target: p.title })}>ثبت قیمت فعلی به‌عنوان نقطهٔ شروع</Button>}
    </div>
  )
}

/** خلاصهٔ مسیر واردات و QC در صفحهٔ محصول */
export function RouteSummary({ pdp, sealed }: { pdp?: Pdp; sealed: boolean }) {
  if (!pdp) return null; const r = pdp.route; const done = qcDone(pdp, sealed)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line p-3 text-12"><p className="mb-1 flex items-center gap-1.5 font-semibold"><Plane size={14} />مبدأ و مسیر واردات</p>{r ? <><p>{r.origin === 'amazon' ? 'آمازون' : 'فروشگاه خارجی'}: <b className="ltr">{r.store}</b> · فروشنده: <span className="ltr">{r.seller}</span></p><p className="mt-1 text-t2">{routeSteps(r).map(([t, at]) => `${t}${at ? ` (${faDate(at)})` : ''}`).join(' ← ')}</p><p className="mt-1">فاکتور خرید: {r.invoice ? (r.invoiceOk ? <Badge tone="success">تأییدشده</Badge> : <Badge tone="warning">منتظر تأیید</Badge>) : <Badge>بارگذاری نشده</Badge>}</p></> : <p className="text-t2">ثبت نشده؛ بخش در صفحهٔ کالا پنهان است.</p>}</div>
      <div className="rounded-xl border border-line p-3 text-12"><p className="mb-1 flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} />کنترل کیفیت دو لایه</p><p>{done ? <Badge tone="success">از هر دو لایه عبور کرده</Badge> : <Badge tone="warning">{fa(qcItems(sealed).filter((x) => pdp.qc?.[x]).length)} از {fa(qcItems(sealed).length)} مورد</Badge>}</p><p className="mt-1 text-t2">ویدیوی تست غنیمت: {pdp.videos.some((v) => v.kind === 'ویدیوی تست غنیمت') ? 'دارد' : 'ندارد'}</p></div>
    </div>
  )
}

/** قیمت تمام‌شده با نرخ ارز امروز در برابر نرخ روز خرید؛ قیمت سایت فقط با تأیید ما عوض می‌شود */
export function FxRevalue({ pid }: { pid: string }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid)!
  const cur = p.currency as FxCur | undefined
  const [now, setNow] = useState<FxResult | null>(null); const [busy, setBusy] = useState(false)
  const load = async () => { if (!cur) return; setBusy(true); setNow(await fetchRate(cur)); setBusy(false) }
  useEffect(() => { load() }, [pid, cur])
  if (!cur || !FX_CURS.includes(cur) || !p.costFx || !p.rate) return <p className="rounded-xl bg-neutral-bg px-3 py-2 text-12 text-t2">این کالا با تومان خریده شده یا مبلغ و نرخ ارز خرید در فرم کالا ثبت نشده است؛ مقایسه با نرخ روز ممکن نیست.</p>
  const units = d.units.filter((u) => u.productId === pid && ['unit.published', 'unit.ready'].includes(u.status))
  const price = p.price ?? units[0]?.price ?? 0; const extra = p.extraCost ?? 0
  const then = Math.round(p.costFx * p.rate + extra); const rateNow = now?.rate ?? p.rate; const costNow = Math.round(p.costFx * rateNow + extra)
  const dCost = then ? ((costNow - then) / then) * 100 : 0; const marginThen = price ? (price - then) / price : 0
  const suggested = marginThen < 1 ? Math.round(costNow / (1 - marginThen) / 100000) * 100000 : price
  const profitNow = price - costNow
  const apply = async () => {
    const ok = await confirm({ title: 'به‌روزرسانی قیمت فروش', body: `قیمت فروش «${p.title}» از ${toman(price)} به ${toman(suggested)} تغییر می‌کند و همین الان روی سایت و فیدها (ترب، ایمالز) اعمال می‌شود. سفارش‌های ثبت‌شده تغییری نمی‌کنند.`, confirm: 'اعمال قیمت تازه' })
    if (!ok) return
    mutate((x) => { const t = x.products.find((y) => y.id === pid)!; if (t.mode === 'qty' || t.price) t.price = suggested; x.units.filter((u) => u.productId === pid && ['unit.published', 'unit.ready'].includes(u.status)).forEach((u) => { u.price = suggested }); logPrice(x, pid, suggested, 'به‌روزرسانی با نرخ روز') }, { action: 'به‌روزرسانی قیمت با نرخ روز ارز', target: p.title, before: toman(price), after: toman(suggested) })
    toast(`قیمت «${p.title}» ${toman(suggested)} شد.`)
  }
  const Cell = ({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: 'up' | 'down' }) => <div className="rounded-xl bg-neutral-bg p-3"><p className="text-11 text-t2">{k}</p><p className={cx('tnum text-14 font-bold', tone === 'up' && 'text-danger', tone === 'down' && 'text-success')}>{v}</p>{sub && <p className="text-11 text-t2">{sub}</p>}</div>
  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-13 font-semibold">قیمت تمام‌شده با نرخ {cur} امروز</p><span className="flex items-center gap-2 text-11 text-t2">{busy ? 'در حال استعلام…' : now ? (now.source === 'api' ? `از API · ${new Date(now.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}` : now.source === 'demo' ? 'نرخ نمایشی' : 'آخرین نرخ ذخیره‌شده') : ''}<button type="button" className="text-brand" onClick={load}>استعلام دوباره</button></span></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Cell k="خرید" v={`${num(p.costFx)} ${cur}`} sub={`نرخ روز خرید: ${toman(p.rate)}`} />
        <Cell k={`نرخ ${cur} امروز`} v={toman(rateNow)} sub={`${rateNow >= p.rate ? '+' : ''}${fa((((rateNow - p.rate) / p.rate) * 100).toFixed(1))}٪ نسبت به روز خرید`} tone={rateNow > p.rate ? 'up' : rateNow < p.rate ? 'down' : undefined} />
        <Cell k="هزینه‌های جانبی" v={toman(extra)} sub="حمل، ترخیص، QC (بدون تغییر)" />
        <Cell k="قیمت تمام‌شده روز خرید" v={toman(then)} />
        <Cell k="قیمت تمام‌شده با نرخ امروز" v={toman(costNow)} tone={costNow > then ? 'up' : costNow < then ? 'down' : undefined} sub={`${costNow >= then ? '+' : ''}${toman(costNow - then)} (${dCost >= 0 ? '+' : ''}${fa(dCost.toFixed(1))}٪)`} />
        <Cell k="سود با قیمت فعلی و نرخ امروز" v={toman(profitNow)} sub={price ? `${fa(((profitNow / price) * 100).toFixed(1))}٪ (روز خرید ${fa((marginThen * 100).toFixed(1))}٪)` : undefined} tone={profitNow < price - then ? 'up' : undefined} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-tint/50 px-3 py-2 text-12">
        <span>قیمت پیشنهادی برای حفظ همان حاشیهٔ سود: <b className="tnum">{toman(suggested)}</b> <span className="text-t2">(فعلی {toman(price)})</span></span>
        <Button size="sm" variant="primary" disabled={!price || suggested === price} onClick={apply}>اعمال قیمت پیشنهادی</Button>
      </div>
      <p className="text-11 text-t2">قیمت سایت با تغییر نرخ ارز خودکار عوض نمی‌شود؛ فقط با زدن «اعمال قیمت پیشنهادی» یا ویرایش دستی قیمت تغییر می‌کند. قیمت تمام‌شدهٔ ثبت‌شده در حسابداری (روز خرید) هم دست نمی‌خورد.</p>
    </div>
  )
}
