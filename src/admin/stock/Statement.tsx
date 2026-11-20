import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpLeft, BarChart3, Eye } from 'lucide-react'
import { Badge, Card, Select, Segmented } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { Modal } from '@/shared/ui/overlay'
import { canSecret, currentUser, myParty, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import { shareOf, split, type StockSale } from '@/shared/data/stock'
import { chName, PartyChip, partyName, pv, whName } from './common'
import { SaleBreakdown } from './Ownership'

const PERIODS: [string, string][] = [['7', '۷ روز'], ['30', '۳۰ روز'], ['90', '۹۰ روز'], ['all', 'همه']]
type Line = { kind: 'sale'; x: StockSale; role: string; earns: number; net: number; at: string } | { kind: 'pay'; id: string; at: string; from: string; to: string; amount: number; ref: string; net: number; earns: 0; role: string }

/** صورت‌حساب از دید هر طرف: «از این فروش‌ها به تو این‌قدر می‌رسد و با هر شریک این‌قدر طلب یا بدهی داری» */
export function StatementTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate()
  const mine = s.parties.find((p) => p.userId === currentUser()?.id)?.id ?? 'gh'; const sec = canSecret()
  const [viewer, setViewer] = useState(mine); const [other, setOther] = useState('all'); const [period, setPeriod] = useState('30'); const [open, setOpen] = useState<StockSale | null>(null)
  const since = period === 'all' ? 0 : Date.now() - Number(period) * 864e5
  const me = partyName(s, viewer); const you = viewer === mine
  const lines: Line[] = useMemo(() => {
    const L: Line[] = []
    s.sales.forEach((x) => { const sh = shareOf(s, x, viewer); if (!sh.involved) return; const b = sh.b
      if (other !== 'all' && ![x.owner, b.seller, b.collector, b.operator].includes(other)) return
      const role = [x.owner === viewer && 'مالک', b.seller === viewer && b.seller !== x.owner && 'فروشنده', b.seller === viewer && b.seller === x.owner && 'مالک و فروشنده', b.operator === viewer && b.handling ? 'گردانندهٔ انبار' : ''].filter(Boolean).join('، ') || 'دریافت‌کنندهٔ پول'
      L.push({ kind: 'sale', x, role, earns: sh.earns, net: sh.net, at: x.at }) })
    s.settlements.forEach((t) => { if (![t.from, t.to].includes(viewer) || (other !== 'all' && ![t.from, t.to].includes(other))) return; L.push({ kind: 'pay', id: t.id, at: t.at, from: t.from, to: t.to, amount: t.amount, ref: t.ref, net: t.from === viewer ? t.amount : -t.amount, earns: 0, role: t.from === viewer ? 'پرداخت کردی' : 'دریافت کردی' }) })
    return L.sort((a, b) => +new Date(b.at) - +new Date(a.at))
  }, [s, viewer, other])
  const inP = lines.filter((l) => +new Date(l.at) >= since)
  const earned = inP.reduce((a, l) => a + l.earns, 0)
  // مانده با هر طرف (همهٔ زمان‌ها): مثبت یعنی طلب
  const bal = s.parties.filter((p) => p.id !== viewer).map((p) => ({ p, v: lines.filter((l) => l.kind === 'pay' ? [l.from, l.to].includes(p.id) : (() => { const b = split(s, l.x); return [l.x.owner, b.seller, b.collector, b.operator].includes(p.id) })()).reduce((a, l) => a + (l.kind === 'pay' ? l.net : split(s, l.x).flows.reduce((t, f) => t + (f.to === viewer && f.from === p.id ? f.amount : f.from === viewer && f.to === p.id ? -f.amount : 0), 0)), 0) })).filter((b) => b.v !== 0)
  const sold = inP.filter((l): l is Extract<Line, { kind: 'sale' }> => l.kind === 'sale')
  return <div className="space-y-4">
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-12"><span className="mb-1 block text-t2">صورت‌حساب از دید</span><Select className="w-48" value={viewer} onChange={(v) => { setViewer(v); setOther('all') }} options={s.parties.filter((p) => sec || p.id === mine).map((p) => [p.id, `${p.name}${p.id === mine ? ' (من)' : ''}`] as [string, string])} /></label>
        <label className="text-12"><span className="mb-1 block text-t2">با چه کسی</span><Select className="w-44" value={other} onChange={setOther} options={[['all', 'همهٔ طرف‌ها'], ...s.parties.filter((p) => p.id !== viewer).map((p) => [p.id, p.name] as [string, string])]} /></label>
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        {!you && <Badge tone="info"><Eye size={12} /> نمای {me}؛ همان چیزی که او در پنل خودش می‌بیند</Badge>}
      </div>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><p className="text-12 text-t2">{you ? 'سهم تو' : `سهم ${me}`} از فروش‌های این دوره</p><p className="mt-1 text-20 font-bold text-success">{toman(earned)}</p><p className="text-11 text-t2">سود مالکیت، سهم فروشنده و هزینهٔ ارسال · {fa(sold.length)} ردیف</p></Card>
      {bal.length ? bal.map((b) => <Card key={b.p.id}><p className="flex items-center gap-1 text-12 text-t2">{b.v > 0 ? <ArrowDownLeft size={14} className="text-success" /> : <ArrowUpLeft size={14} className="text-danger" />}مانده با {b.p.name}</p><p className={b.v > 0 ? 'mt-1 text-20 font-bold text-success' : 'mt-1 text-20 font-bold text-danger'}>{toman(Math.abs(b.v))}</p><p className="text-12">{b.v > 0 ? `${you ? 'از' : `${me} از`} ${b.p.name} طلب ${you ? 'داری' : 'دارد'}` : `${you ? 'به' : `${me} به`} ${b.p.name} بدهکار ${you ? 'هستی' : 'است'}`}</p></Card>) : <Card><p className="text-12 text-t2">مانده</p><p className="mt-1 text-15 font-semibold text-success">با هیچ‌کس طلب یا بدهی باز نیست.</p></Card>}
    </div>
    <Card pad={false} title={you ? 'ریز حساب تو' : `ریز حساب ${me}`} hint="هر ردیف یک فروش یا پرداخت است؛ روی ردیف فروش بزنید تا محاسبهٔ کامل و لینک سفارش را ببینید.">
      <DataTable name={`صورت‌حساب ${me}`} empty={{ title: 'در این دوره ردیفی نیست.' }} rows={inP} rowKey={(l) => (l.kind === 'sale' ? l.x.id : l.id)} onRow={(l) => l.kind === 'sale' && setOpen(l.x)} search={(l) => (l.kind === 'sale' ? `${l.x.orderId ?? ''} ${pv(d, l.x.productId, l.x.variationId).full} ${chName(s, l.x.channel)}` : `${l.ref} تسویه`)}
        cols={[{ key: 'at', title: 'زمان', render: (l) => <span className="text-12">{rel(l.at)}</span>, sort: (l) => +new Date(l.at) },
          { key: 'o', title: 'سفارش', render: (l) => l.kind === 'sale' ? (l.x.orderId ? <button className="font-mono text-12 text-brand underline" onClick={(e) => { e.stopPropagation(); nav(`/admin/orders/${l.x.orderId}`) }}>{l.x.orderId}</button> : <span className="text-12 text-t2">{chName(s, l.x.channel)}</span>) : <Badge tone="success">پرداخت تسویه</Badge> },
          { key: 'p', title: 'شرح', render: (l) => l.kind === 'sale' ? <span className="text-12">{pv(d, l.x.productId, l.x.variationId).full} ×{fa(Math.abs(l.x.qty))}{l.x.qty < 0 && <Badge tone="danger">برگشت</Badge>}<span className="block text-11 text-t2">مالک {partyName(s, l.x.owner)} · از {whName(s, l.x.warehouse)} · {chName(s, l.x.channel)}</span></span> : <span className="text-12">{partyName(s, l.from)} به {partyName(s, l.to)} · پیگیری <bdi dir="ltr" className="font-mono">{l.ref}</bdi></span> },
          { key: 'r', title: 'نقش', render: (l) => <span className="text-12">{l.role}</span> },
          { key: 'e', title: you ? 'سهم تو' : 'سهم او', render: (l) => l.earns ? <span className={l.earns > 0 ? 'text-success' : 'text-danger'}>{toman(l.earns)}</span> : '—', sort: (l) => l.earns },
          { key: 'n', title: 'اثر بر حساب', render: (l) => l.net ? <span className={l.net > 0 ? 'font-medium text-success' : 'font-medium text-danger'}>{l.net > 0 ? 'طلب ' : 'بدهی '}{toman(Math.abs(l.net))}</span> : <span className="text-12 text-t2">بی‌اثر</span>, sort: (l) => l.net }]} />
    </Card>
    <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `ریز فروش ${open.orderId ?? open.id}` : ''} wide>{open && <SaleBreakdown x={open} />}</Modal>
  </div>
}

/** گزارش عملکرد: هر شریک و هر انبار چه فروخت، چه سودی ساخت، کدام کالاها */
export function PerformanceTab() {
  const d = useDB(); const s = d.stock; const [by, setBy] = useState<'owner' | 'seller' | 'warehouse' | 'channel'>('owner'); const [period, setPeriod] = useState('30')
  const since = period === 'all' ? 0 : Date.now() - Number(period) * 864e5
  const me = myParty(); const rows = s.sales.filter((x) => +new Date(x.at) >= since && (canSecret() || shareOf(s, x, me).involved))
  const keyOf = (x: StockSale) => by === 'owner' ? x.owner : by === 'seller' ? split(s, x).seller : by === 'warehouse' ? x.warehouse : x.channel
  const nameOf = (k: string) => by === 'warehouse' ? whName(s, k) : by === 'channel' ? chName(s, k) : partyName(s, k)
  const groups = [...new Set(rows.map(keyOf))].map((k) => { const R = rows.filter((x) => keyOf(x) === k); const prod = new Map<string, number>(); R.forEach((x) => { const n = pv(d, x.productId, x.variationId).full; prod.set(n, (prod.get(n) ?? 0) + x.qty) })
    return { k, units: R.reduce((a, x) => a + x.qty, 0), rev: R.reduce((a, x) => a + split(s, x).revenue, 0), profit: R.reduce((a, x) => a + split(s, x).profit, 0), returns: R.filter((x) => x.qty < 0).reduce((a, x) => a - x.qty, 0), top: [...prod].sort((a, b) => b[1] - a[1]).slice(0, 3) } }).sort((a, b) => b.rev - a.rev)
  const max = Math.max(1, ...groups.map((g) => g.rev))
  return <Card title={<span className="flex items-center gap-1.5"><BarChart3 size={15} />عملکرد فروش</span>} actions={<div className="flex flex-wrap gap-2"><Segmented size="sm" value={by} onChange={setBy} options={[['owner', 'به تفکیک مالک'], ['seller', 'فروشنده'], ['warehouse', 'انبار'], ['channel', 'کانال']]} /><Segmented size="sm" value={period} onChange={setPeriod} options={PERIODS} /></div>}>
    {groups.length === 0 ? <p className="text-12 text-t2">در این دوره فروشی ثبت نشده است.</p> : <ul className="space-y-3">{groups.map((g) => <li key={g.k} className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">{by === 'owner' || by === 'seller' ? <PartyChip s={s} id={g.k} /> : <b className="text-13">{nameOf(g.k)}</b>}<span className="text-12 text-t2">{fa(g.units)} عدد خالص{g.returns ? ` · ${fa(g.returns)} برگشتی` : ''}</span><span className="flex-1" /><b>{toman(g.rev)}</b><span className="text-12 text-success">سود {toman(g.profit)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-brand" style={{ width: `${(g.rev / max) * 100}%` }} /></div>
      <p className="mt-1.5 text-11 text-t2">پرفروش‌ها: {g.top.map(([n, q]) => `${n} (${fa(q)})`).join('، ')}</p>
    </li>)}</ul>}
  </Card>
}
