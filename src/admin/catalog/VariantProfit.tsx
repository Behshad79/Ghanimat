import { useEffect, useState } from 'react'
import { Target, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge, Button, cx, Input } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, pct, toman } from '@/shared/lib/fa'
import { fetchRate, FX_CURS, type FxCur } from '@/shared/lib/fx'
import { effPrice, landedVar, marginOf, priceForMargin, skuOf, varLabel, type CostBase } from '@/shared/lib/variants'
import type { PAttr, Variation } from '@/shared/data/seed'
import { logPrice } from './PdpExtras'

const money = (v?: number) => (v ? v.toLocaleString('en-US') : '')
const parse = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0

/** سود هر تنوع در فرم کالا: قیمت خرید و هزینهٔ جانبی جدا، قیمت تمام‌شده، قیمت فروش، سود و حاشیه؛ تعیین قیمت با حاشیهٔ هدف */
export function VariantProfit({ attrs, variations, base, currency, price, floor, code, onChange }: { attrs: PAttr[]; variations: Variation[]; base: CostBase; currency: string; price: number; floor: number; code: string; onChange: (v: Variation[]) => void }) {
  const d = useDB(); const [target, setTarget] = useState(String(Math.max(floor + 5, 15)))
  const fx = currency !== 'تومان'
  const up = (id: string, p: Partial<Variation>) => onChange(variations.map((v) => (v.id === id ? { ...v, ...p } : v)))
  const rows = variations.map((v) => { const cost = landedVar(v, base); const sell = effPrice(v, price); const m = marginOf(sell, cost); return { v, cost, sell, m, profit: sell - cost } })
  const on = rows.filter((r) => r.v.enabled && r.sell)
  const ms = on.map((r) => r.m); const lo = ms.length ? Math.min(...ms) : 0; const hi = ms.length ? Math.max(...ms) : 0
  const applyTarget = (only?: string) => { const t = parse(target); onChange(variations.map((v) => (only && v.id !== only ? v : { ...v, price: priceForMargin(landedVar(v, base), t), sale: undefined }))); toast(only ? 'قیمت این تنوع با حاشیهٔ هدف تنظیم شد.' : `قیمت همهٔ تنوع‌ها برای حاشیهٔ ${fa(t)}٪ تنظیم شد.`) }
  return (
    <div className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-13 font-semibold">قیمت، هزینه و سود هر تنوع</p>
        <span className="flex flex-wrap items-center gap-2 text-12"><Target size={14} className="text-t2" />حاشیهٔ هدف<Input aria-label="حاشیهٔ سود هدف" className="ltr h-8 w-16 text-center" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))} />٪<Button size="sm" onClick={() => applyTarget()}>قیمت‌گذاری همه با این حاشیه</Button></span>
      </div>
      <p className="text-11 text-t2">خالی بودن «قیمت خرید» یا «هزینهٔ جانبی» یعنی همان مقدار پایهٔ بالا ({fx ? `${fa(base.costFx)} ${currency}` : toman(base.costFx)} · جانبی {toman(base.extra)}). اگر یک رنگ گران‌تر خریده شده، قیمت خرید همان رنگ را اینجا بنویسید.</p>
      <div className="overflow-x-auto rounded-xl border border-line"><table className="gh-table w-full text-12">
        <thead><tr className="bg-surface-2">{['تنوع', `قیمت خرید (${currency})`, 'هزینهٔ جانبی', 'قیمت تمام‌شده', 'قیمت عادی', 'قیمت ویژه', 'سود هر واحد', 'حاشیه', ''].map((h) => <th key={h} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
        <tbody>{rows.map(({ v, cost, sell, m, profit }) => <tr key={v.id} className={cx('border-t border-line', !v.enabled && 'opacity-50')}>
          <td className="p-2"><b>{varLabel(d, attrs, v)}</b><span className="ltr block text-left font-mono text-11 text-t3">{skuOf(code, v)}</span></td>
          <td className="p-2"><Input aria-label={`قیمت خرید ${varLabel(d, attrs, v)}`} className="ltr h-8 w-28 text-left font-mono" inputMode="decimal" value={v.costFx != null ? money(v.costFx) : ''} placeholder={money(base.costFx)} onChange={(e) => up(v.id, { costFx: e.target.value === '' ? undefined : parse(e.target.value) })} /></td>
          <td className="p-2"><Input aria-label={`هزینهٔ جانبی ${varLabel(d, attrs, v)}`} className="ltr h-8 w-28 text-left font-mono" inputMode="numeric" value={v.extra != null ? money(v.extra) : ''} placeholder={money(base.extra)} onChange={(e) => up(v.id, { extra: e.target.value === '' ? undefined : parse(e.target.value) })} /></td>
          <td className="tnum p-2">{toman(cost)}</td>
          <td className="p-2"><Input aria-label={`قیمت عادی ${varLabel(d, attrs, v)}`} className="ltr h-8 w-32 text-left font-mono" inputMode="numeric" value={money(v.price)} placeholder={money(price)} onChange={(e) => up(v.id, { price: parse(e.target.value) || undefined })} /></td>
          <td className="p-2"><Input aria-label={`قیمت ویژه ${varLabel(d, attrs, v)}`} className="ltr h-8 w-32 text-left font-mono" inputMode="numeric" value={money(v.sale)} placeholder="—" onChange={(e) => up(v.id, { sale: parse(e.target.value) || undefined })} /></td>
          <td className={cx('tnum p-2 font-semibold', profit < 0 ? 'text-danger' : 'text-success')}>{sell ? toman(profit) : '—'}</td>
          <td className="p-2">{sell ? <Badge tone={profit < 0 ? 'danger' : m < floor ? 'warning' : 'success'} dot={false}>{pct(m, 1)}</Badge> : <span className="text-11 text-warning">بدون قیمت</span>}</td>
          <td className="p-2"><Button size="sm" variant="ghost" title={`قیمت برای حاشیهٔ ${target}٪`} onClick={() => applyTarget(v.id)}>حاشیهٔ هدف</Button></td>
        </tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center gap-3 text-12">
        <span>حاشیهٔ تنوع‌های فعال: <b>{ms.length ? (lo === hi ? pct(lo, 1) : `${pct(lo, 1)} تا ${pct(hi, 1)}`) : '—'}</b></span>
        {on.some((r) => r.m < floor) && <Badge tone="warning">{fa(on.filter((r) => r.m < floor).length)} تنوع زیر کف حاشیهٔ {pct(floor)}؛ انتشار به تأیید مدیر نیاز دارد</Badge>}
        {on.some((r) => r.profit < 0) && <Badge tone="danger">{fa(on.filter((r) => r.profit < 0).length)} تنوع زیان‌ده</Badge>}
      </div>
    </div>
  )
}

/** صفحهٔ کالا: قیمت تمام‌شدهٔ هر تنوع با نرخ ارز امروز و قیمت پیشنهادی برای حفظ حاشیهٔ هر تنوع؛ اعمال فقط با تأیید */
export function VariantFxRevalue({ pid }: { pid: string }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid)!; const cur = p.currency as FxCur | undefined
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => { if (cur && FX_CURS.includes(cur)) fetchRate(cur).then((r) => setRate(r.rate)) }, [pid, cur])
  const base: CostBase = { costFx: p.costFx ?? 0, rate: p.rate ?? 1, extra: p.extraCost ?? 0 }
  if (!cur || !FX_CURS.includes(cur) || !p.rate) return null
  const now = rate ?? base.rate
  const rows = (p.variations ?? []).filter((v) => v.enabled).map((v) => { const then = landedVar(v, base); const today = landedVar(v, base, now); const sell = effPrice(v, p.price ?? 0); const m = marginOf(sell, then); const sug = m < 100 ? Math.round(today / (1 - m / 100) / 100000) * 100000 : sell; return { v, then, today, sell, m, sug, mNow: marginOf(sell, today) } })
  const changed = rows.filter((r) => r.sug !== r.sell)
  const apply = async (ids: string[]) => {
    const list = rows.filter((r) => ids.includes(r.v.id) && r.sug !== r.sell); if (!list.length) return
    if (!(await confirm({ title: 'به‌روزرسانی قیمت تنوع‌ها', body: `${list.map((r) => `${varLabel(d, p.attrs ?? [], r.v)}: ${toman(r.sell)} ← ${toman(r.sug)}`).join('، ')}. روی سایت و فیدها همین الان اعمال می‌شود؛ سفارش‌های ثبت‌شده تغییری نمی‌کنند.`, confirm: 'اعمال قیمت تازه' }))) return
    mutate((x) => { const t = x.products.find((y) => y.id === pid)!; t.variations = (t.variations ?? []).map((v) => { const r = list.find((y) => y.v.id === v.id); return r ? { ...v, price: r.sug, sale: undefined } : v }); const ps = t.variations.filter((v) => v.enabled).map((v) => effPrice(v, t.price ?? 0)); if (ps.length) { t.price = Math.min(...ps); logPrice(x, pid, t.price, 'به‌روزرسانی با نرخ روز') } }, { action: 'به‌روزرسانی قیمت تنوع‌ها با نرخ روز', target: p.title, after: list.map((r) => `${varLabel(d, p.attrs ?? [], r.v)}: ${r.sug}`).join('، ') })
    toast(`قیمت ${fa(list.length)} تنوع به‌روز شد.`)
  }
  return (
    <div className="space-y-2 rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-13 font-semibold">قیمت تمام‌شدهٔ هر تنوع با نرخ {cur} امروز</p><span className="text-11 text-t2">نرخ روز خرید {toman(base.rate)} · امروز {toman(now)} ({now >= base.rate ? '+' : ''}{fa((((now - base.rate) / base.rate) * 100).toFixed(1))}٪)</span></div>
      <div className="overflow-x-auto rounded-xl border border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['تنوع', 'خرید', 'تمام‌شده روز خرید', 'تمام‌شده با نرخ امروز', 'قیمت فعلی', 'حاشیه (خرید ← امروز)', 'قیمت پیشنهادی', ''].map((h) => <th key={h} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.v.id} className="border-t border-line">
          <td className="p-2 font-medium">{varLabel(d, p.attrs ?? [], r.v)}</td><td className="tnum p-2">{fa(r.v.costFx ?? base.costFx)} {cur}</td><td className="tnum p-2">{toman(r.then)}</td>
          <td className={cx('tnum p-2', r.today > r.then ? 'text-danger' : r.today < r.then ? 'text-success' : '')}>{toman(r.today)}{r.today !== r.then && (r.today > r.then ? <TrendingUp size={12} className="mr-1 inline" /> : <TrendingDown size={12} className="mr-1 inline" />)}</td>
          <td className="tnum p-2">{toman(r.sell)}</td><td className="p-2">{pct(r.m, 1)} ← <b className={r.mNow < r.m ? 'text-danger' : 'text-success'}>{pct(r.mNow, 1)}</b></td>
          <td className="tnum p-2 font-semibold">{toman(r.sug)}</td><td className="p-2"><Button size="sm" variant="ghost" disabled={r.sug === r.sell} onClick={() => apply([r.v.id])}>اعمال</Button></td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-11 text-t2">قیمت سایت با تغییر نرخ خودکار عوض نمی‌شود؛ فقط با «اعمال». قیمت تمام‌شدهٔ حسابداری (روز خرید) دست نمی‌خورد.</p><Button size="sm" variant="primary" disabled={!changed.length} onClick={() => apply(changed.map((r) => r.v.id))}>اعمال قیمت پیشنهادی همه ({fa(changed.length)})</Button></div>
    </div>
  )
}
