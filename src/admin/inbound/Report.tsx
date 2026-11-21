// کارنامهٔ انبار و شریک: فروش در برابر هدف و دورهٔ قبل، سرعت فروش موجودی، ارسال به‌موقع، مرجوعی، خطای حواله و شمارش، ماندگاری موجودی؛ و یک نمرهٔ روشن با دلیل
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge, Button, Card, cx, Input, Progress, Segmented } from '@/shared/ui/base'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, pct, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { split } from '@/shared/data/stock'
import { PartyChip, partyLogo } from '../stock/common'

type Metric = { k: string; label: string; v: number; score: number; text: string; w: number }
function warehouseCard(d: DB, wh: string, days: number) {
  const s = d.stock; const t0 = Date.now() - days * 864e5; const t1 = t0 - days * 864e5
  const S = s.sales.filter((x) => x.warehouse === wh && +new Date(x.at) >= t0); const P = s.sales.filter((x) => x.warehouse === wh && +new Date(x.at) >= t1 && +new Date(x.at) < t0)
  const rev = S.reduce((a, x) => a + split(s, x).revenue, 0); const prev = P.reduce((a, x) => a + split(s, x).revenue, 0); const profit = S.reduce((a, x) => a + split(s, x).profit, 0)
  const units = S.reduce((a, x) => a + x.qty, 0); const returns = S.filter((x) => x.qty < 0).reduce((a, x) => a - x.qty, 0); const sold = S.filter((x) => x.qty > 0).reduce((a, x) => a + x.qty, 0)
  const target = Math.round(((s.targets?.[wh] ?? 0) * days) / 30)
  const onHand = s.lots.filter((l) => l.warehouse === wh && l.qty > 0); const stockUnits = onHand.reduce((a, l) => a + l.qty, 0)
  const age = stockUnits ? Math.round(onHand.reduce((a, l) => a + l.qty * ((Date.now() - +new Date(l.at)) / 864e5), 0) / stockUnits) : 0
  const slow = onHand.filter((l) => (Date.now() - +new Date(l.at)) / 864e5 > 60).reduce((a, l) => a + l.qty, 0)
  const ships = d.orders.filter((o) => +new Date(o.createdAt) >= t0).flatMap((o) => o.shipments).filter((x) => x.warehouse === wh && x.status !== 'ship.cancelled')
  const late = ships.filter((x) => ['ship.pending', 'ship.picking', 'ship.packed', 'ship.partner_confirm'].includes(x.status) && +new Date(x.sla) < Date.now()).length
  const M = (s.manifests ?? []).filter((m) => +new Date(m.createdAt) >= t0 && (m.from === wh || m.to === wh)); const errs = M.reduce((a, m) => a + m.issues.filter((i) => ['wrong', 'missing', 'short', 'extra'].includes(i.kind)).length, 0)
  const loss = (s.adjusts ?? []).filter((a) => a.warehouse === wh && +new Date(a.at) >= t0 && ['loss', 'count'].includes(a.kind) && a.delta < 0).reduce((a, x) => a - x.delta, 0)
  const sellThrough = sold + stockUnits ? sold / (sold + stockUnits) : 0; const onTime = ships.length ? 1 - late / ships.length : 1; const retRate = sold ? returns / sold : 0
  const metrics: Metric[] = [
    { k: 'target', label: 'تحقق هدف فروش', v: target ? rev / target : 0, w: 30, score: target ? Math.min(1, rev / target) : rev > 0 ? 0.7 : 0, text: target ? `${toman(rev)} از هدف ${toman(target)}` : 'هدف تعریف نشده' },
    { k: 'st', label: 'سرعت فروش موجودی', v: sellThrough, w: 15, score: Math.min(1, sellThrough / 0.35), text: `${fa(sold)} فروخته از ${fa(sold + stockUnits)} عدد در دسترس` },
    { k: 'ontime', label: 'ارسال به‌موقع', v: onTime, w: 20, score: onTime, text: ships.length ? `${fa(late)} مرسولهٔ دیرکرد از ${fa(ships.length)}` : 'مرسوله‌ای در دوره نبود' },
    { k: 'ret', label: 'مرجوعی پایین', v: retRate, w: 10, score: Math.max(0, 1 - retRate / 0.15), text: `${fa(returns)} برگشت از ${fa(sold)} فروش` },
    { k: 'err', label: 'دقت حواله و شمارش', v: errs + loss, w: 15, score: Math.max(0, 1 - (errs + loss) / 8), text: `${fa(errs)} خطای حواله · ${fa(loss)} عدد کسری یا خرابی` },
    { k: 'age', label: 'تازگی موجودی', v: age, w: 10, score: Math.max(0, 1 - Math.max(0, age - 30) / 90), text: `میانگین ${fa(age)} روز · ${fa(slow)} عدد بالای ۶۰ روز` },
  ]
  const score = Math.round(metrics.reduce((a, m) => a + m.score * m.w, 0))
  return { rev, prev, profit, units, target, stockUnits, metrics, score, sold }
}
const verdict = (n: number) => n >= 80 ? { t: 'عالی', tone: 'success' as const } : n >= 65 ? { t: 'خوب', tone: 'info' as const } : n >= 45 ? { t: 'نیازمند توجه', tone: 'warning' as const } : { t: 'کم‌کاری یا مشکل جدی', tone: 'danger' as const }

export function ReportTab() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [days, setDays] = useState(30)
  const people = new Map<string, { sales: number; rev: number; packed: number; errs: number }>()
  const t0 = Date.now() - days * 864e5
  s.sales.filter((x) => +new Date(x.at) >= t0 && x.qty > 0).forEach((x) => { const p = people.get(x.by) ?? { sales: 0, rev: 0, packed: 0, errs: 0 }; p.sales += x.qty; p.rev += split(s, x).revenue; people.set(x.by, p) })
  ;(s.manifests ?? []).filter((m) => +new Date(m.createdAt) >= t0).forEach((m) => { const who = m.sentBy ?? m.by; const p = people.get(who) ?? { sales: 0, rev: 0, packed: 0, errs: 0 }; p.packed += m.lines.reduce((a, l) => a + l.packed, 0); p.errs += m.issues.filter((i) => i.by === who && ['wrong', 'missing', 'extra'].includes(i.kind)).length; people.set(who, p) })
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-12 text-t2">نمره از ۱۰۰ با شش معیار وزن‌دار؛ هر معیار دلیلش را کنارش دارد تا معلوم باشد کجا خوب است و کجا کم‌کاری شده.</p><Segmented size="sm" value={String(days)} onChange={(v) => setDays(+v)} options={[['7', '۷ روز'], ['30', '۳۰ روز'], ['90', '۹۰ روز']]} /></div>
    <div className="grid gap-4 xl:grid-cols-2">{s.warehouses.map((w) => { const c = warehouseCard(d, w.id, days); const v = verdict(c.score); const op = s.parties.find((p) => p.id === w.operator); const delta = c.prev ? (c.rev - c.prev) / c.prev : 0
      return <Card key={w.id} title={<span className="flex flex-wrap items-center gap-2">{partyLogo(op) && <img src={partyLogo(op)} alt="" className="size-6 object-contain" />}{w.name}<PartyChip s={s} id={w.operator} /></span>} actions={<span className="flex items-center gap-2"><Badge tone={v.tone}>{v.t}</Badge><b className={cx('text-22', v.tone === 'success' ? 'text-success' : v.tone === 'danger' ? 'text-danger' : v.tone === 'warning' ? 'text-warning' : 'text-info')}>{fa(c.score)}</b></span>}>
        <div className="space-y-3 text-12">
          <div className="grid grid-cols-3 gap-2"><div className="rounded-lg bg-neutral-bg p-2"><span className="text-t2">فروش خالص</span><b className="block text-14">{compactToman(c.rev)}</b><span className={cx('flex items-center gap-0.5 text-11', delta >= 0 ? 'text-success' : 'text-danger')}>{delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{c.prev ? pct(Math.abs(delta) * 100) : '—'} نسبت به دورهٔ قبل</span></div><div className="rounded-lg bg-neutral-bg p-2"><span className="text-t2">سود</span><b className="block text-14">{compactToman(c.profit)}</b><span className="text-11 text-t3">{fa(c.units)} عدد خالص</span></div><div className="rounded-lg bg-neutral-bg p-2"><span className="text-t2">هدف ماهانه</span><Input aria-label={`هدف ${w.name}`} className="ltr mt-0.5 h-8 text-left text-12" value={String(s.targets?.[w.id] ?? 0)} onChange={(e) => mutate((x) => { x.stock.targets = { ...(x.stock.targets ?? {}), [w.id]: +e.target.value.replace(/\D/g, '') || 0 } }, { action: 'ویرایش هدف فروش انبار', target: w.name })} /></div></div>
          <ul className="space-y-2">{c.metrics.map((m) => <li key={m.k}><div className="flex items-center justify-between gap-2"><span>{m.label} <span className="text-11 text-t3">(وزن {fa(m.w)})</span></span><span className="text-11 text-t2">{m.text}</span></div><Progress value={Math.round(m.score * 100)} tone={m.score >= 0.75 ? 'success' : m.score >= 0.45 ? 'warning' : 'danger'} /></li>)}</ul>
          {c.score < 65 && <p className="rounded-lg bg-warning-bg px-3 py-2 text-warning">کمترین نمره‌ها: {c.metrics.slice().sort((a, b) => a.score - b.score).slice(0, 2).map((m) => `${m.label} (${m.text})`).join('؛ ')}.</p>}
          <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => nav(`/admin/orders?wh=${w.id}`)}>سفارش‌های این انبار</Button><Button size="sm" variant="ghost" onClick={() => nav('/admin/ownership?tab=performance')}>فروش به تفکیک مالک و کانال</Button></div>
        </div>
      </Card> })}</div>
    <Card defaultOpen={false} title={<span className="flex items-center gap-1.5"><Award size={15} />افراد</span>} pad={false}><table className="w-full text-12"><thead><tr className="bg-surface-2 text-t2">{['نفر', 'فروش ثبت‌شده', 'مبلغ', 'جمع‌آوری حواله', 'خطای اسکن و ارسال'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {[...people].sort((a, b) => b[1].rev - a[1].rev).map(([n, p]) => <tr key={n} className="border-t border-line"><td className="p-2 font-medium">{n}</td><td className="p-2 tnum">{fa(p.sales)} عدد</td><td className="p-2">{toman(p.rev)}</td><td className="p-2 tnum">{fa(p.packed)} عدد</td><td className={cx('p-2 tnum', p.errs > 2 && 'text-danger')}>{fa(p.errs)}</td></tr>)}
      {people.size === 0 && <tr><td colSpan={5} className="p-4 text-center text-t2">در این دوره فعالیتی ثبت نشده است.</td></tr>}
    </tbody></table></Card>
  </div>
}
