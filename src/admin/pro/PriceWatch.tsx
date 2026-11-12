import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, ExternalLink, Radar, TrendingDown } from 'lucide-react'
import { Badge, Button, Card, cx, Toggle } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, notify, useDB } from '@/shared/lib/store'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import { CHANNELS } from '../orders/OrderTools'
import { CH_STYLE, ChannelLogo } from '../social/ChannelLogo'
import { ProductImg } from '../pages/_shared'

/** فروش کانال‌های اجتماعی و حضوری در نمای کلی کانال‌ها (از همان سفارش‌های ثبت‌شده) */
export function SocialChannelStats() {
  const d = useDB(); const nav = useNavigate(); const soc = CHANNELS.slice(1)
  const all = d.orders.filter((o) => soc.includes(o.channel)); const rev = all.reduce((a, o) => a + o.total, 0)
  return (
    <Card title="فروش شبکه‌های اجتماعی و حضوری" actions={<Button size="sm" onClick={() => nav('/admin/social')}>مدیریت فروش اجتماعی</Button>}>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-12 text-t2"><span>کل: <b className="text-t1">{fa(all.length)} سفارش</b></span><span>مبلغ: <b className="text-t1">{compactToman(rev)}</b></span><span>سهم از کل سفارش‌ها: <b className="text-t1">{fa(Math.round((all.length / Math.max(1, d.orders.length)) * 100))}٪</b></span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{soc.map((c) => { const L = all.filter((o) => o.channel === c); const st = CH_STYLE[c]; const r = L.reduce((a, o) => a + o.total, 0); return (
        <button key={c} type="button" onClick={() => nav(`/admin/social?ch=${encodeURIComponent(c)}`)} className="lift rounded-xl border border-line p-3 text-right" style={{ background: st ? `linear-gradient(160deg, ${st.tint}, transparent 70%)` : undefined }}>
          <span className="flex items-center gap-2"><ChannelLogo ch={c} size={28} /><b className="text-12">{c}</b></span>
          <span className="mt-2 block text-18 font-bold tnum">{fa(L.length)}<span className="mr-1 text-11 font-normal text-t2">سفارش</span></span>
          <span className="block text-11 text-t2">{compactToman(r)} · میانگین {compactToman(L.length ? r / L.length : 0)}</span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full" style={{ width: `${rev ? (r / rev) * 100 : 0}%`, background: st?.bg ?? 'var(--brand)' }} /></span>
        </button>) })}</div>
    </Card>
  )
}

type Row = { pid: string; ours: number; torob: number; torobRank: number; emalls: number; emallsRank: number; at: number; prev?: number }
const seedRow = (pid: string, ours: number, i: number, t: number): Row => { const k = [1, 0.985, 1.01, 0.94, 1, 0.97, 0.99, 1.02, 0.96][i % 9]; const e = [1.01, 1, 0.975, 0.99, 0.95, 1, 1.03, 0.98, 1][i % 9]; return { pid, ours, torob: Math.round((ours * k) / 1e4) * 1e4, torobRank: k >= 1 ? 1 : 1 + Math.ceil((1 - k) * 60), emalls: Math.round((ours * e) / 1e4) * 1e4, emallsRank: e >= 1 ? 1 : 1 + Math.ceil((1 - e) * 50), at: t } }

/** پایش لحظه‌ای جایگاه قیمت در ترب و ایمالز: هر بار که رقیبی ارزان‌تر شود، هشدار فوری می‌آید */
export function PriceWatch() {
  const d = useDB(); const nav = useNavigate(); const [alert, setAlert] = useState(true); const [tick, setTick] = useState(0)
  const prods = d.products.filter((p) => p.status === 'product.published' && (p.price ?? p.priceNew))
  const [rows, setRows] = useState<Row[]>(() => prods.map((p, i) => seedRow(p.id, p.price ?? p.priceNew, i, Date.now() - (i % 5) * 6e4)))
  // هر ۲۰ ثانیه یک کالا دوباره بررسی می‌شود (در نسخهٔ واقعی خزندهٔ سرور هر چند دقیقه همه را می‌سنجد)
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 20000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!tick || !rows.length) return; const i = tick % rows.length; setRows((R) => R.map((r, j) => { if (j !== i) return r; const drop = tick % 3 === 0; const torob = drop ? Math.round((r.ours * 0.965) / 1e4) * 1e4 : r.torob; const n = { ...r, prev: r.torob, torob, torobRank: torob < r.ours ? Math.max(2, r.torobRank) : 1, at: Date.now() }; if (drop && r.torob >= r.ours && alert) { const p = d.products.find((x) => x.id === r.pid); notify('رقیب در ترب ارزان‌تر شد', `${p?.title ?? r.pid}: ${toman(torob)} در برابر ${toman(r.ours)} ما.`, '/admin/channels?tab=rank', 'قیمت', 'warning'); toast(`ترب: ${p?.en ?? r.pid} حالا ${fa(Math.round(((r.ours - torob) / r.ours) * 1000) / 10)}٪ ارزان‌تر از ما فروخته می‌شود.`, { tone: 'err' }) } return n })) }, [tick])
  const cheaper = rows.filter((r) => r.torob < r.ours || r.emalls < r.ours)
  const match = async (r: Row) => { const p = d.products.find((x) => x.id === r.pid); if (!p) return; const target = Math.min(r.torob, r.emalls) - 10000; const cost = p.cost ?? 0; const margin = cost ? Math.round(((target - cost) / target) * 1000) / 10 : null
    if (!(await confirm({ title: `قیمت ${p.en} به ${toman(target)} برسد؟`, body: <>۱۰ هزار تومان ارزان‌تر از کمترین قیمت رقبا. {margin !== null ? <>حاشیهٔ سود بعد از تغییر: <b className={margin < 5 ? 'text-danger' : ''}>{fa(margin)}٪</b>.</> : 'قیمت خرید ثبت نشده؛ حاشیه را بررسی کنید.'}</>, confirm: 'اعمال قیمت' }))) return
    mutate((x) => { const y = x.products.find((z) => z.id === p.id)!; if (y.price) y.price = target; else y.priceNew = target }, { action: 'هم‌قیمت شدن با رقیب', target: p.en, before: toman(r.ours), after: toman(target) })
    setRows((R) => R.map((z) => (z.pid === r.pid ? { ...z, ours: target, torobRank: 1, emallsRank: 1, at: Date.now() } : z))); toast('قیمت در سایت و فید ترب و ایمالز به‌روز شد.') }
  const rank = (n: number, theirs: number, ours: number) => <span className="flex flex-col"><Badge tone={n === 1 ? 'success' : n <= 2 ? 'warning' : 'danger'}>{n === 1 ? 'ارزان‌ترین هستیم' : `رتبهٔ ${fa(n)}`}</Badge><span className={cx('mt-0.5 text-11 tnum', theirs < ours ? 'text-danger' : 'text-t2')}>کمترین: {toman(theirs)}</span></span>
  const sorted = useMemo(() => [...rows].sort((a, b) => Math.min(a.torob, a.emalls) / a.ours - Math.min(b.torob, b.emalls) / b.ours), [rows])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Radar size={17} />} label="کالاهای پایش‌شده" value={fa(rows.length)} note="ترب و ایمالز · هر چند دقیقه" />
        <KPI label="رقیب ارزان‌تر از ما" tone="danger" value={fa(cheaper.length)} icon={<TrendingDown size={17} />} />
        <KPI label="ارزان‌ترین در ترب" tone="success" value={fa(rows.filter((r) => r.torob >= r.ours).length)} />
        <KPI label="ارزان‌ترین در ایمالز" tone="success" value={fa(rows.filter((r) => r.emalls >= r.ours).length)} />
      </div>
      {cheaper.length > 0 && <div className="rounded-2xl border border-danger/40 bg-danger-bg/60 p-3" role="alert"><p className="mb-2 flex items-center gap-1.5 text-13 font-semibold text-danger"><BellRing size={15} />{fa(cheaper.length)} کالا در ترب یا ایمالز ارزان‌تر از ما فروخته می‌شود</p><div className="flex flex-wrap gap-2">{cheaper.slice(0, 6).map((r) => { const p = d.products.find((x) => x.id === r.pid); return <button key={r.pid} type="button" onClick={() => void match(r)} className="flex items-center gap-2 rounded-full border border-danger/30 bg-surface px-2.5 py-1 text-12 hover:border-danger"><ProductImg pid={r.pid} size={20} />{p?.en}<b className="tnum text-danger">{fa(Math.round(((r.ours - Math.min(r.torob, r.emalls)) / r.ours) * 1000) / 10)}٪</b></button> })}</div></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-12"><Toggle on={alert} onChange={setAlert} text="هشدار فوری (اعلان و پیام) وقتی رقیبی ارزان‌تر شد" /><span className="flex items-center gap-1.5 text-t2"><span className="size-2 animate-pulse rounded-full bg-success" />پایش زنده</span></div>
      <DataTable name="جایگاه قیمت در ترب و ایمالز" rows={sorted} rowKey={(r) => r.pid} onRow={(r) => nav(`/admin/catalog/${r.pid}`)} empty={{ title: 'کالای منتشرشده‌ای نیست.' }}
        cols={[{ key: 'p', title: 'کالا', render: (r) => { const p = d.products.find((x) => x.id === r.pid); return <span className="flex items-center gap-2"><ProductImg pid={r.pid} size={36} /><span><b className="block">{p?.en}</b><span className="text-11 text-t2">{p?.title}</span></span></span> }, text: (r) => d.products.find((x) => x.id === r.pid)?.en ?? r.pid },
          { key: 'o', title: 'قیمت ما', align: 'left', render: (r) => toman(r.ours), sort: (r) => r.ours },
          { key: 't', title: 'ترب', render: (r) => rank(r.torobRank, r.torob, r.ours), sort: (r) => r.torobRank },
          { key: 'e', title: 'ایمالز', render: (r) => rank(r.emallsRank, r.emalls, r.ours), sort: (r) => r.emallsRank },
          { key: 'g', title: 'فاصله با کمترین', render: (r) => { const g = Math.round(((r.ours - Math.min(r.torob, r.emalls)) / r.ours) * 1000) / 10; return <Badge tone={g > 0 ? 'danger' : 'success'}>{g > 0 ? `${fa(g)}٪ گران‌تر` : 'ارزان‌ترین'}</Badge> }, sort: (r) => Math.min(r.torob, r.emalls) / r.ours },
          { key: 'at', title: 'آخرین بررسی', render: (r) => <span className="text-12 text-t2">{rel(new Date(r.at).toISOString())}</span>, sort: (r) => r.at },
          { key: 'x', title: '', render: (r) => <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>{(r.torob < r.ours || r.emalls < r.ours) && <Button size="sm" variant="primary" onClick={() => void match(r)}>هم‌قیمت شو</Button>}<a href={`https://torob.com/search/?query=${encodeURIComponent(d.products.find((x) => x.id === r.pid)?.en ?? '')}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-11"><ExternalLink size={11} />ترب</a><a href={`https://emalls.ir/Search/?q=${encodeURIComponent(d.products.find((x) => x.id === r.pid)?.en ?? '')}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-11"><ExternalLink size={11} />ایمالز</a></span> }]} />
      <p className="text-11 text-t2">قیمت و رتبهٔ رقبا در نسخهٔ نمایشی شبیه‌سازی شده است. در نسخهٔ واقعی خزندهٔ سرور غنیمت صفحهٔ هر کالا را در ترب و ایمالز بررسی می‌کند و با تغییر، اعلان فوری می‌فرستد.</p>
    </div>
  )
}
