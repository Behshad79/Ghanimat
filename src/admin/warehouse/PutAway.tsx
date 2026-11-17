import { useMemo, useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Badge, Button, cx, Field, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, snapshot, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { binOf, type Bin, type Section } from '@/shared/data/site'
import type { DB, Unit } from '@/shared/data/seed'
import { Cell } from '../pages/_shared'

/** اندازهٔ تقریبی هر دسته: چند خانه جا می‌گیرد و کدام ارتفاع مناسب است */
export const SIZE: Record<string, { cls: 'کوچک' | 'متوسط' | 'بزرگ'; slots: number; keys: string[] }> = {
  'گوشی موبایل': { cls: 'کوچک', slots: 1, keys: ['موبایل'] }, 'ساعت هوشمند': { cls: 'کوچک', slots: 1, keys: ['پوشیدنی', 'ساعت'] }, 'لوازم جانبی': { cls: 'کوچک', slots: 1, keys: ['لوازم جانبی'] },
  'کتاب‌خوان': { cls: 'کوچک', slots: 1, keys: ['تبلت', 'کتاب'] }, 'هدفون': { cls: 'متوسط', slots: 1, keys: ['هدفون', 'صوتی'] }, 'تبلت': { cls: 'متوسط', slots: 1, keys: ['تبلت'] }, 'لپ‌تاپ': { cls: 'بزرگ', slots: 2, keys: ['لپ‌تاپ'] },
}
const LIVE = ['unit.qc', 'unit.photo', 'unit.ready', 'unit.published', 'unit.reserved']
type Sug = { bin: Bin; sec: Section; score: number; why: string[] }

/** پیشنهاد خانه برای یک واحد: کنار کالاهای مشابه، در ناحیهٔ دستهٔ خودش، متناسب با اندازه و جای خالی */
export function suggestBins(d: DB, wh: string, u: Pick<Unit, 'id' | 'productId' | 'status'> & { category?: string; brand?: string }, limit = 3): Sug[] {
  const p = d.products.find((x) => x.id === u.productId) ?? { category: u.category ?? '', brand: u.brand ?? '' }; const sz = SIZE[p?.category ?? ''] ?? { cls: 'متوسط', slots: 1, keys: [] }
  const units = d.units.filter((x) => x.warehouse === wh && LIVE.includes(x.status) && x.id !== u.id)
  const used = (b: Bin) => units.filter((x) => binOf(x.shelf) === b.id).length + Object.values(b.qty ?? {}).reduce((a, n) => a + n, 0)
  const out: Sug[] = []
  for (const f of d.layout[wh as 'tehran'] ?? []) for (const sec of f.sections) sec.bins.forEach((b, i) => {
    if (b.blocked) return; const free = b.cap - used(b); if (free < sz.slots) return
    const why: string[] = []; let score = (free / b.cap) * 10
    const special = /بازرسی|عکاسی|مرجوعی|قرنطینه/.test(sec.zone)
    if (u.status === 'unit.qc' && /بازرسی/.test(sec.zone)) { score += 80; why.push('واحد منتظر QC است') }
    else if (u.status === 'unit.photo' && /عکاسی/.test(sec.zone)) { score += 80; why.push('واحد منتظر عکاسی است') }
    else if (special) return
    if (sz.keys.some((k) => sec.zone.includes(k))) { score += 40; why.push(`ناحیهٔ ${sec.zone}`) }
    const inSec = units.filter((x) => sec.bins.some((bb) => bb.id === binOf(x.shelf))).map((x) => d.products.find((y) => y.id === x.productId))
    const sameProd = units.filter((x) => binOf(x.shelf) === b.id && x.productId === u.productId).length
    if (sameProd) { score += 30; why.push(`${fa(sameProd)} واحد از همین کالا در این خانه`) }
    const sameCat = inSec.filter((x) => x?.category === p?.category).length; if (sameCat) { score += Math.min(25, sameCat * 5); why.push(`کنار ${fa(sameCat)} کالای ${p?.category}`) }
    const sameBrand = inSec.filter((x) => x?.brand === p?.brand).length; if (sameBrand && !sameCat) { score += Math.min(12, sameBrand * 3); why.push(`کنار کالاهای ${p?.brand}`) }
    const level = Math.floor(i / (sec.cols ?? sec.bins.length)); const levels = sec.levels ?? 1
    if (sz.cls === 'بزرگ' && level === levels - 1) { score += 10; why.push('طبقهٔ پایین برای کالای بزرگ') }
    if (sz.cls === 'کوچک' && levels > 1 && level > 0 && level < levels - 1) { score += 5; why.push('ارتفاع دست برای برداشت سریع') }
    why.push(`${fa(free)} جای خالی`)
    out.push({ bin: b, sec, score, why })
  })
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** جانمایی واحد در انبار با پیشنهاد خودکار؛ هر وقت بخواهید دستی هم انتخاب کنید */
export function PutAway({ open, onClose, wh, allBins, used, initial }: { open: boolean; onClose: () => void; wh: string; allBins: (Bin & { sec: string })[]; used: (b: Bin) => number; initial?: string }) {
  const d = useDB(); const [uid, setUid] = useState(initial ?? ''); const [pick, setPick] = useState('')
  const units = d.units.filter((u) => u.warehouse === wh && LIVE.includes(u.status))
  const homeless = units.filter((u) => !allBins.some((b) => b.id === binOf(u.shelf)))
  const u = units.find((x) => x.id === uid)
  const sugs = useMemo(() => (u ? suggestBins(d, wh, u) : []), [d, wh, u])
  const target = pick || sugs[0]?.bin.id || ''
  const place = (unit: Unit, to: string) => { const from = binOf(unit.shelf); mutate((x) => { x.units.find((y) => y.id === unit.id)!.shelf = to; x.moves.unshift({ id: `mv${Date.now().toString(36)}${unit.id.slice(-2)}`, at: new Date().toISOString(), who: currentUser()?.name ?? 'شما', kind: allBins.some((b) => b.id === from) ? 'جابه‌جایی' : 'ورود', unit: unit.id, product: unit.productId, from: from || '—', to, read: false }) }, { action: 'جانمایی واحد در انبار', target: unit.code ?? unit.id, before: from, after: to }) }
  const autoAll = () => { const undo = snapshot(); let n = 0; homeless.forEach((h) => { const s = suggestBins(d, wh, h, 1)[0]; if (s) { place(h, s.bin.id); n++ } }); toast(`${fa(n)} واحد بی‌جا در خانهٔ پیشنهادی قرار گرفت.`, { undo }) }
  return (
    <Modal wide open={open} onClose={() => { setUid(''); setPick(''); onClose() }} title="جانمایی کالا در انبار" footer={u ? <Button variant="primary" disabled={!target} onClick={() => { place(u, target); toast(`واحد ${u.code ?? u.id} در خانهٔ ${target} قرار گرفت.`); setUid(''); setPick('') }}>قرار دادن در {target || '…'}</Button> : undefined}>
      <div className="space-y-4">
        {homeless.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-bg p-3 text-12 text-warning"><span className="flex-1">{fa(homeless.length)} واحد هنوز جای مشخص ندارد.</span><Button size="sm" icon={<Wand2 size={13} />} onClick={autoAll}>جانمایی خودکار همه</Button></div>}
        <Field label="کدام واحد؟" help="اسکن بارکد واحد یا جست‌وجو با نام و کد"><Select value={uid} onChange={(v) => { setUid(v); setPick('') }} placeholder="انتخاب واحد…" options={[...homeless, ...units.filter((x) => !homeless.includes(x))].map((x) => [x.id, `${d.products.find((p) => p.id === x.productId)?.en ?? ''} · ${x.code ?? x.id}${homeless.includes(x) ? ' · بی‌جا' : ` · ${binOf(x.shelf)}`}`] as [string, string])} /></Field>
        {u && <>
          <div className="rounded-xl border border-line p-2"><Cell pid={u.productId} size={40} a={d.products.find((p) => p.id === u.productId)?.title} b={`اندازه: ${SIZE[d.products.find((p) => p.id === u.productId)?.category ?? '']?.cls ?? 'متوسط'} · جای فعلی: ${binOf(u.shelf) || 'ندارد'}`} /></div>
          <div><p className="mb-2 flex items-center gap-1 text-13 font-semibold"><Sparkles size={14} className="text-brand" />پیشنهاد</p>
            {sugs.length === 0 ? <p className="text-12 text-danger">خانهٔ خالی مناسبی نیست؛ قفسهٔ تازه بسازید یا خانه‌ای را آزاد کنید.</p> : <div className="grid gap-2 md:grid-cols-3">{sugs.map((s, i) => <button key={s.bin.id} type="button" onClick={() => setPick(s.bin.id)} className={cx('rounded-xl border p-3 text-right transition-colors', target === s.bin.id ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand/50')}>
              <p className="flex items-center gap-2"><b className="ltr font-mono text-14">{s.bin.id}</b>{i === 0 && <Badge tone="brand" dot={false}>بهترین</Badge>}</p><p className="text-11 text-t2">{s.sec.name}</p>
              <ul className="mt-1.5 space-y-0.5 text-11">{s.why.map((w) => <li key={w}>· {w}</li>)}</ul></button>)}</div>}
          </div>
          <details><summary className="cursor-pointer text-12 text-brand">انتخاب دستی خانهٔ دیگر</summary>
            <div className="mt-2 grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-8">{allBins.map((b) => { const n = used(b); const full = b.blocked || n >= b.cap; return <button key={b.id} type="button" disabled={full} onClick={() => setPick(b.id)} className={cx('ltr h-11 rounded-lg border font-mono text-12 disabled:opacity-35', target === b.id ? 'border-brand bg-brand-solid text-white' : 'border-line hover:border-brand')}>{b.id}<span className="tnum block text-[10px]">{fa(n)}/{fa(b.cap)}</span></button> })}</div></details>
        </>}
        <p className="text-11 text-t2">پیشنهاد بر اساس دستهٔ کالا و ناحیهٔ قفسه، کنار هم ماندن کالاهای مشابه و هم‌برند، اندازهٔ کالا (کالای بزرگ طبقهٔ پایین) و جای خالی است. اندازهٔ هر دسته را می‌توانید در قالب ویژگی‌ها تغییر دهید.</p>
      </div>
    </Modal>
  )
}
