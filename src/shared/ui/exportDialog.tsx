import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react'
import { Button, cx, Field, Input, Segmented, Toggle } from './base'
import { Modal, toast } from './overlay'
import { mutate } from '../lib/store'
import { csv, download, fa } from '../lib/fa'

export type Cell = string | number
export type ExportSection = { id: string; label: string; hint?: string; build: (range: { from: number; to: number }) => Cell[][] }
type Fmt = 'excel' | 'pdf' | 'json'
const DAY = 864e5
const PERIODS: [string, string][] = [['today', 'امروز'], ['7', '۷ روز اخیر'], ['30', '۳۰ روز اخیر'], ['month', 'این ماه'], ['all', 'همه'], ['custom', 'بازهٔ دلخواه']]
const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const maskRow = (r: Cell[]) => r.map((c) => typeof c === 'string' ? c.replace(/(09\d{2})\d{5}(\d{2})/g, '$1•••••$2') : c)

/** پنجرهٔ خروجی: چه بخش‌هایی، چه قالبی (اکسل، PDF، JSON)، چه بازه‌ای، چه ستون‌هایی، همه یا فقط نمای فعلی */
export function ExportDialog({ open, onClose, name, sections, single, columns, period = true }: { open: boolean; onClose: () => void; name: string; sections: ExportSection[]; single?: boolean; columns?: string[]; period?: boolean }) {
  const [pick, setPick] = useState<string[]>(sections.slice(0, 1).map((s) => s.id)); const [fmt, setFmt] = useState<Fmt>('excel'); const [per, setPer] = useState('30')
  const [from, setFrom] = useState(iso(Date.now() - 30 * DAY)); const [to, setTo] = useState(iso(Date.now())); const [cols, setCols] = useState<string[] | null>(null); const [mask, setMask] = useState(true)
  const range = () => { const now = Date.now(); if (!period || per === 'all') return { from: 0, to: now + DAY }; if (per === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return { from: d.getTime(), to: now + DAY } } if (per === 'month') { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return { from: d.getTime(), to: now + DAY } } if (per === 'custom') return { from: new Date(`${from}T00:00:00`).getTime(), to: new Date(`${to}T23:59:59`).getTime() }; return { from: now - +per * DAY, to: now + DAY } }
  const useCols = cols ?? columns ?? []
  const tables = () => sections.filter((s) => pick.includes(s.id)).map((s) => { let t = s.build(range()); if (columns && cols) { const idx = t[0].map((h, i) => (cols.includes(String(h)) ? i : -1)).filter((i) => i >= 0); t = t.map((r) => idx.map((i) => r[i])) } if (mask) t = t.map(maskRow); return { s, t } })
  const go = () => {
    const T = tables(); if (!T.length) return toast('دست‌کم یک بخش را انتخاب کنید.', { tone: 'err' })
    const rows = T.reduce((a, x) => a + x.t.length - 1, 0)
    if (fmt === 'excel') { const all: Cell[][] = []; T.forEach((x, i) => { if (T.length > 1) { if (i) all.push([]); all.push([`«${x.s.label}»`]) } all.push(...x.t) }); download(`${name}.csv`, csv(all)) }
    else if (fmt === 'json') download(`${name}.json`, JSON.stringify(Object.fromEntries(T.map((x) => [x.s.label, x.t.slice(1).map((r) => Object.fromEntries(x.t[0].map((h, i) => [h, r[i]])))])), null, 2), 'application/json')
    else { const html = `<html dir="rtl"><head><meta charset="utf-8"><title>${name}</title><style>body{font-family:Vazirmatn,Tahoma,sans-serif;padding:24px;color:#10123d}h2{font-size:15px;margin:20px 0 8px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #d9dce8;padding:6px 8px;text-align:right}th{background:#eef0ff}tr:nth-child(even) td{background:#f7f8fb}</style></head><body><h1 style="font-size:18px">${name}</h1>${T.map((x) => `<h2>${x.s.label}</h2><table><thead><tr>${x.t[0].map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${x.t.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`
      const w = window.open('', '_blank'); if (!w) { download(`${name}.html`, html, 'text/html;charset=utf-8'); toast('پنجرهٔ چاپ باز نشد؛ فایل HTML دانلود شد که با «چاپ ← ذخیره به PDF» تبدیل می‌شود.'); } else { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) } }
    mutate(() => {}, { action: 'خروجی گرفتن', target: `${name} (${T.map((x) => x.s.label).join('، ')})`, after: `${rows} ردیف · ${fmt}` })
    if (fmt !== 'pdf') toast(`خروجی ${fa(rows)} ردیف ساخته شد.`); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={`خروجی ${name}`} footer={<Button variant="primary" icon={<Download size={14} />} onClick={go}>گرفتن خروجی</Button>}>
      <div className="space-y-4">
        <Field label={single ? 'کدام ردیف‌ها؟' : 'از کدام بخش‌ها؟'}><div className="space-y-1.5">{sections.map((s) => { const on = pick.includes(s.id); return <label key={s.id} className={cx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-13', on ? 'border-brand bg-brand-tint/50' : 'border-line')}><input type={single ? 'radio' : 'checkbox'} name="exp-sec" checked={on} onChange={() => setPick(single ? [s.id] : on ? pick.filter((x) => x !== s.id) : [...pick, s.id])} className="accent-[var(--brand)]" /><span className="flex-1">{s.label}</span>{s.hint && <span className="text-11 text-t2">{s.hint}</span>}</label> })}</div>
          {!single && sections.length > 2 && <div className="mt-1.5 flex gap-3 text-12"><button type="button" className="text-brand" onClick={() => setPick(sections.map((s) => s.id))}>همه</button><button type="button" className="text-t2" onClick={() => setPick([])}>هیچ‌کدام</button></div>}</Field>
        <Field label="قالب"><div className="grid grid-cols-3 gap-2">{([['excel', 'اکسل (CSV)', FileSpreadsheet], ['pdf', 'PDF و چاپ', Printer], ['json', 'JSON', FileJson]] as const).map(([k, l, I]) => <button key={k} type="button" onClick={() => setFmt(k)} className={cx('flex flex-col items-center gap-1 rounded-xl border p-3 text-12', fmt === k ? 'border-brand bg-brand-tint text-brand' : 'border-line')}><I size={18} />{l}</button>)}</div></Field>
        {period && <Field label="بازهٔ زمانی"><Segmented size="sm" value={per} onChange={setPer} options={PERIODS} />{per === 'custom' && <div className="mt-2 grid grid-cols-2 gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>}</Field>}
        {columns && columns.length > 0 && <Field label={`ستون‌ها (${fa(useCols.length)} از ${fa(columns.length)})`}><div className="flex flex-wrap gap-1.5">{columns.map((c) => { const on = useCols.includes(c); return <button key={c} type="button" onClick={() => setCols(on ? useCols.filter((x) => x !== c) : [...useCols, c])} className={cx('rounded-full border px-2.5 py-1 text-12', on ? 'border-brand bg-brand-tint text-brand' : 'border-line text-t2')}>{c}</button> })}</div></Field>}
        <Toggle on={mask} onChange={setMask} text="پوشاندن شمارهٔ موبایل و دادهٔ حساس" />
      </div>
    </Modal>
  )
}
