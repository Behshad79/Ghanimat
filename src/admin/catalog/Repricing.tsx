import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCw, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { confirm, toast } from '@/shared/ui/overlay'
import { BrandLogo } from '@/shared/ui/brandLogo'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, pct, toman } from '@/shared/lib/fa'
import { fetchRate, FX_CURS, type FxCur } from '@/shared/lib/fx'
import { marketOf } from '@/shared/lib/market'
import { effPrice, landedVar, varLabel } from '@/shared/lib/variants'
import { logPrice } from './PdpExtras'
import { ProductImg } from '../pages/_shared'

type Row = { key: string; pid: string; vid?: string; title: string; sub: string; cur: FxCur; costFx: number; rateThen: number; rateNow: number; extra: number; then: number; now: number; price: number; marginThen: number; keep: number; floorP: number; tMin: number; eMin: number; typical: number; capP: number; proposal: number; note: string; tone: 'up' | 'down' | 'same' }
const r100k = (n: number) => Math.round(n / 100000) * 100000

/** بازقیمت‌گذاری ارزی: قیمت تمام‌شده با نرخ امروز، قیمت پیشنهادی برای حفظ حاشیه، سقف رقابتی ترب و ایمالز؛ تأیید تکی یا گروهی */
export function Repricing() {
  const d = useDB(); const nav = useNavigate(); const floor = d.rules.find((r) => r.key === 'margin_floor')?.value ?? 8
  const [rates, setRates] = useState<Record<string, { rate: number; source: string }>>({}); const [busy, setBusy] = useState(false)
  const load = async () => { setBusy(true); const out: Record<string, { rate: number; source: string }> = {}; for (const c of FX_CURS) { const r = await fetchRate(c); out[c] = { rate: r.rate, source: r.source } } setRates(out); setBusy(false) }
  useEffect(() => { load() }, [])
  const [mode, setMode] = useState<'keep' | 'target'>('keep'); const [target, setTarget] = useState(String(Math.max(floor + 7, 15))); const [cap, setCap] = useState('3'); const [minChg, setMinChg] = useState('1')
  const [dir, setDir] = useState<'all' | 'up' | 'down'>('all'); const [edits, setEdits] = useState<Record<string, number>>({}); const [sel, setSel] = useState<string[]>([]); const [done, setDone] = useState<Record<string, 'ok' | 'no'>>({})
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    d.products.filter((p) => p.currency && FX_CURS.includes(p.currency as FxCur) && p.costFx && p.rate && !['product.archived'].includes(p.status)).forEach((p) => {
      const cur = p.currency as FxCur; const rateNow = rates[cur]?.rate ?? p.rate!; const base = { costFx: p.costFx!, rate: p.rate!, extra: p.extraCost ?? 0 }
      const items = p.kind === 'variable' && p.variations?.length ? p.variations.filter((v) => v.enabled).map((v) => ({ vid: v.id, sub: varLabel(d, p.attrs ?? [], v), costFx: v.costFx ?? base.costFx, extra: v.extra ?? base.extra, price: effPrice(v, p.price ?? 0) }))
        : [{ vid: undefined, sub: '', costFx: base.costFx, extra: base.extra, price: p.price ?? d.units.find((u) => u.productId === p.id && u.price > 0)?.price ?? 0 }]
      items.forEach((it) => { if (!it.price) return
        const then = landedVar({ costFx: it.costFx, extra: it.extra }, base); const now = landedVar({ costFx: it.costFx, extra: it.extra }, base, rateNow)
        const marginThen = ((it.price - then) / it.price) * 100; const m = mode === 'keep' ? Math.max(marginThen, floor) : Number(target) || floor
        const keep = r100k(now / (1 - m / 100)); const floorP = Math.ceil(now / (1 - floor / 100) / 100000) * 100000
        const mk = marketOf(it.vid ?? p.id, it.price); const minMarket = Math.min(mk.torobMin, mk.emallsMin); const capP = r100k(minMarket * (1 + (Number(cap) || 0) / 100))
        let proposal = Math.min(keep, capP); let note = keep > capP ? `سقف رقابتی: حداکثر ${fa(Number(cap) || 0)}٪ بالاتر از کمترین قیمت بازار` : 'حفظ حاشیهٔ سود'
        if (proposal < floorP) { proposal = floorP; note = 'رقیب ارزان‌تر از کف حاشیهٔ ماست؛ قیمت روی کف حاشیه ماند' }
        const key = `${p.id}${it.vid ? `:${it.vid}` : ''}`; proposal = edits[key] ?? proposal
        out.push({ key, pid: p.id, vid: it.vid, title: p.title, sub: it.sub, cur, costFx: it.costFx, rateThen: base.rate, rateNow, extra: it.extra, then, now, price: it.price, marginThen, keep, floorP, tMin: mk.torobMin, eMin: mk.emallsMin, typical: mk.typical, capP, proposal, note, tone: proposal > it.price ? 'up' : proposal < it.price ? 'down' : 'same' })
      })
    })
    return out
  }, [d.products, d.units, rates, mode, target, cap, edits, floor])
  const shown = rows.filter((r) => !done[r.key] && Math.abs((r.proposal - r.price) / r.price) * 100 >= (Number(minChg) || 0) && (dir === 'all' || r.tone === dir))
  const apply = async (list: Row[]) => {
    if (!list.length) return
    if (!(await confirm({ title: `اعمال قیمت تازهٔ ${fa(list.length)} مورد`, body: `${list.slice(0, 5).map((r) => `${r.title}${r.sub ? ` (${r.sub})` : ''}: ${toman(r.price)} ← ${toman(r.proposal)}`).join('، ')}${list.length > 5 ? '…' : ''}. روی سایت و فیدهای ترب و ایمالز همین الان اعمال می‌شود؛ سفارش‌های ثبت‌شده تغییری نمی‌کنند.`, confirm: 'تأیید و اعمال' }))) return
    mutate((x) => { list.forEach((r) => { const p = x.products.find((y) => y.id === r.pid)!
      if (r.vid) { p.variations = (p.variations ?? []).map((v) => (v.id === r.vid ? { ...v, price: r.proposal, sale: undefined } : v)); const ps = p.variations.filter((v) => v.enabled).map((v) => effPrice(v, p.price ?? 0)); if (ps.length) p.price = Math.min(...ps) }
      else { if (p.mode === 'qty' || p.price) p.price = r.proposal; x.units.filter((u) => u.productId === r.pid && ['unit.published', 'unit.ready'].includes(u.status)).forEach((u) => { u.price = r.proposal }) }
      logPrice(x, r.pid, r.vid ? (p.price ?? r.proposal) : r.proposal, 'بازقیمت‌گذاری ارزی') }) }, { action: 'بازقیمت‌گذاری با نرخ ارز', target: `${list.length} مورد`, after: list.map((r) => `${r.title}${r.sub ? ` ${r.sub}` : ''}: ${r.proposal}`).join('، ') })
    setDone((x) => ({ ...x, ...Object.fromEntries(list.map((r) => [r.key, 'ok' as const])) })); setSel([]); toast(`قیمت ${fa(list.length)} مورد به‌روز شد.`)
  }
  const up = shown.filter((r) => r.tone === 'up').length, dn = shown.filter((r) => r.tone === 'down').length
  const capped = shown.filter((r) => r.keep > r.capP).length
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FX_CURS.map((c) => { const used = d.products.filter((p) => p.currency === c && p.rate); const avgThen = used.length ? used.reduce((a, p) => a + (p.rate ?? 0), 0) / used.length : 0; const now = rates[c]?.rate; return <KPI key={c} label={`نرخ ${c} امروز`} value={now ? toman(now) : '…'} note={avgThen && now ? `میانگین نرخ خرید ${toman(Math.round(avgThen))} (${now >= avgThen ? '+' : ''}${fa((((now - avgThen) / avgThen) * 100).toFixed(1))}٪) · ${rates[c]?.source === 'api' ? 'از API' : rates[c]?.source === 'demo' ? 'نمایشی' : 'ذخیره‌شده'}` : `${fa(used.length)} کالا`} /> })}
        <KPI label="پیشنهاد تغییر قیمت" value={fa(shown.length)} note={`${fa(up)} افزایش · ${fa(dn)} کاهش${capped ? ` · ${fa(capped)} محدود به سقف بازار` : ''}`} tone={shown.length ? 'warning' : undefined} />
      </div>
      <Card title="قاعدهٔ پیشنهاد" actions={<Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} loading={busy} onClick={load}>استعلام دوبارهٔ نرخ‌ها</Button>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="مبنای قیمت"><Segmented value={mode} onChange={setMode} options={[['keep', 'حفظ حاشیهٔ روز خرید'], ['target', 'حاشیهٔ هدف']]} /></Field>
          {mode === 'target' && <Field label="حاشیهٔ هدف (٪)"><Input className="ltr text-left" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))} /></Field>}
          <Field label="سقف نسبت به کمترین قیمت ترب و ایمالز (٪)" help="پیشنهاد از این بالاتر نمی‌رود تا بی‌دلیل گران‌تر از بازار نشویم."><Input className="ltr text-left" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^\d.-]/g, ''))} /></Field>
          <Field label="نادیده‌گرفتن تغییرهای کمتر از (٪)"><Input className="ltr text-left" inputMode="numeric" value={minChg} onChange={(e) => setMinChg(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
        </div>
        <p className="mt-2 text-11 text-t2">کف حاشیهٔ فروشگاه {pct(floor)} است و پیشنهاد هیچ‌وقت زیر آن نمی‌رود. قیمت‌ها به ۱۰۰ هزار تومان گرد می‌شوند. فقط کالاهایی که با ارز خریده شده‌اند و نرخ روز خرید دارند در فهرست می‌آیند ({fa(d.products.filter((p) => !p.currency || p.currency === 'تومان').length)} کالای تومانی جدا هستند).</p>
      </Card>
      <Card pad={false} title={<span className="flex flex-wrap items-center gap-3">پیشنهادها<Segmented size="sm" value={dir} onChange={setDir} options={[['all', 'همه'], ['up', 'افزایش'], ['down', 'کاهش']]} /></span>}
        actions={<span className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setSel(sel.length === shown.length ? [] : shown.map((r) => r.key))}>{sel.length === shown.length && shown.length ? 'لغو انتخاب' : 'انتخاب همه'}</Button><Button size="sm" variant="primary" icon={<Check size={13} />} disabled={!sel.length} onClick={() => apply(shown.filter((r) => sel.includes(r.key)))}>تأیید انتخاب‌شده‌ها ({fa(sel.length)})</Button><Button size="sm" disabled={!shown.length} onClick={() => apply(shown)}>تأیید همه ({fa(shown.length)})</Button></span>}>
        {shown.length === 0 ? <p className="px-4 py-8 text-center text-13 text-t2">با نرخ امروز تغییری لازم نیست{Object.keys(done).length ? ` · ${fa(Object.keys(done).length)} مورد بررسی شد` : ''}.</p>
          : <div className="overflow-x-auto"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['', 'کالا', 'نرخ خرید ← امروز', 'تمام‌شده ← امروز', 'قیمت فعلی', 'حفظ حاشیه', 'بازار', 'پیشنهاد نهایی', ''].map((h, i) => <th key={i} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
            <tbody>{shown.map((r) => { const chg = ((r.proposal - r.price) / r.price) * 100; const mNew = ((r.proposal - r.now) / r.proposal) * 100; return <tr key={r.key} className="border-t border-line align-top">
              <td className="p-2"><input type="checkbox" aria-label={`انتخاب ${r.title} ${r.sub}`} checked={sel.includes(r.key)} onChange={() => setSel(sel.includes(r.key) ? sel.filter((x) => x !== r.key) : [...sel, r.key])} /></td>
              <td className="p-2"><button type="button" className="flex items-center gap-2 text-right hover:text-brand" onClick={() => nav(`/admin/catalog/${r.pid}?tab=price`)}><ProductImg pid={r.pid} size={32} /><span><b className="line-clamp-1">{r.title}</b>{r.sub && <span className="text-11 text-t2">{r.sub}</span>}</span></button></td>
              <td className="tnum p-2">{fa(r.costFx)} {r.cur}<span className="block text-11 text-t2">{toman(r.rateThen)} ← <b className={r.rateNow > r.rateThen ? 'text-danger' : 'text-success'}>{toman(r.rateNow)}</b></span></td>
              <td className="tnum p-2">{toman(r.then)}<span className={cx('block text-11', r.now > r.then ? 'text-danger' : 'text-success')}>← {toman(r.now)}</span></td>
              <td className="tnum p-2">{toman(r.price)}<span className="block text-11 text-t2">حاشیه {pct(r.marginThen, 1)}</span></td>
              <td className="tnum p-2">{toman(r.keep)}</td>
              <td className="p-2 text-11"><span className="flex items-center gap-1"><BrandLogo name="ترب" size={14} />کمترین {toman(r.tMin)}</span><span className="flex items-center gap-1 text-t2">ایمالز {toman(r.eMin)}</span><span className="text-t3">عرف {toman(r.typical)}</span>{r.proposal > Math.min(r.tMin, r.eMin) && <Badge tone="warning" dot={false}>گران‌تر از کمترین</Badge>}</td>
              <td className="p-2"><Input aria-label={`پیشنهاد ${r.title} ${r.sub}`} className="ltr h-8 w-32 text-left font-mono" inputMode="numeric" value={r.proposal.toLocaleString('en-US')} onChange={(e) => setEdits({ ...edits, [r.key]: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                <span className={cx('mt-0.5 flex items-center gap-1 text-11', chg > 0 ? 'text-danger' : chg < 0 ? 'text-success' : 'text-t2')}>{chg > 0 ? <TrendingUp size={11} /> : chg < 0 ? <TrendingDown size={11} /> : null}{chg > 0 ? '+' : ''}{fa(chg.toFixed(1))}٪ · حاشیه {pct(mNew, 1)}</span><span className="block text-[10px] text-t3">{r.note}</span></td>
              <td className="p-2"><span className="flex gap-1"><Button size="sm" variant="primary" aria-label={`تأیید ${r.title} ${r.sub}`} icon={<Check size={13} />} onClick={() => apply([r])} /><Button size="sm" variant="ghost" aria-label={`رد ${r.title} ${r.sub}`} icon={<X size={13} />} onClick={() => setDone({ ...done, [r.key]: 'no' })} /></span></td>
            </tr> })}</tbody></table></div>}
        {Object.keys(done).length > 0 && <div className="flex items-center justify-between border-t border-line px-4 py-2 text-12 text-t2"><span>{fa(Object.values(done).filter((x) => x === 'ok').length)} اعمال شد · {fa(Object.values(done).filter((x) => x === 'no').length)} رد شد</span><Button size="sm" variant="ghost" onClick={() => setDone({})}>نمایش دوبارهٔ ردشده‌ها</Button></div>}
      </Card>
      <p className="text-11 text-t2">قیمت سایت هیچ‌وقت خودکار عوض نمی‌شود؛ فقط با «تأیید». قیمت رقبا از «پایش قیمت ترب و ایمالز» خوانده می‌شود؛ در این نسخهٔ نمایشی عددها نمونه‌اند.</p>
    </div>
  )
}
