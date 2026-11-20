import { useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { Button, Field, Input, Segmented, Select } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { takeCode, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { printSolo } from '@/shared/lib/printSolo'
import { varLabel } from '@/shared/lib/variants'
import { labelCode } from '@/shared/data/stock'
import type { PAttr, Product, Variation } from '@/shared/data/seed'
import { LABEL_BG, LABEL_SIZES, ProductLabel } from '../print/ProductLabel'
import type { SplitRow } from '../stock/OwnerSplit'

type F = { kind: 'simple' | 'variable'; mode: 'qty' | 'serial'; code: string; title: string; en: string; brand: string; category: string; model: string; attrs: PAttr[]; variations: Variation[]; qtyTehran: number; qtyMahabad: number; owner?: string; ownSplit?: SplitRow[]; units: { serial: string }[] }

/** برچسب‌های همین کالا در مرحلهٔ «بارکد و برچسب»: هر کالای متمایز (هر ترکیب ویژگی‌ها) و هر مالک یک کد؛ چاپ مستقیم از همین صفحه */
export function WizardLabels({ f, set }: { f: F; set: (p: { code: string }) => void }) {
  const d = useDB(); const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState('50x30'); const [bg, setBg] = useState('white'); const [copies, setCopies] = useState<Record<string, number>>({})
  const owner = f.owner ?? 'gh'; const base = { id: 'new', code: f.code || 'GH-P-000000' }
  const vars = f.kind === 'variable' ? f.variations.filter((v) => v.enabled) : []
  const vname = (v?: Variation) => (v ? varLabel(d, f.attrs, v) : '')
  const oname = (o: string) => d.stock.parties.find((x) => x.id === o)?.name ?? o
  const rows: { k: string; title: string; code: string; qty: number; sub?: string }[] = f.mode === 'serial' ? [{ k: 'p', title: f.title, code: f.code || 'GH-P-000000', qty: Math.max(1, f.units.length) }]
    : f.ownSplit?.length ? f.ownSplit.filter((r) => r.qty > 0).map((r, i) => { const v = vars.find((x) => x.id === r.variationId); return { k: `s${i}`, title: [f.title, vname(v)].filter(Boolean).join(' · '), sub: [vname(v), oname(r.owner)].filter(Boolean).join(' · '), code: labelCode(d.stock, r.owner, base, v ?? null), qty: r.qty } })
    : vars.length ? vars.map((v) => ({ k: v.id, title: `${f.title} · ${vname(v)}`, sub: `${vname(v)} · ${oname(owner)}`, code: labelCode(d.stock, owner, base, v), qty: v.qty.tehran + v.qty.mahabad })).filter((r) => r.qty > 0)
    : [{ k: 'p', title: f.title, code: labelCode(d.stock, owner, base, null), qty: Math.max(1, f.qtyTehran + f.qtyMahabad) }]
  // برچسب‌های هم‌کد (مثلاً یک تنوع در دو انبار) یکی می‌شوند
  const merged = Object.values(rows.reduce<Record<string, (typeof rows)[number]>>((a, r) => { a[r.code] = a[r.code] ? { ...a[r.code], qty: a[r.code].qty + r.qty } : r; return a }, {}))
  const n = (r: (typeof merged)[number]) => copies[r.code] ?? r.qty
  const total = merged.reduce((a, r) => a + n(r), 0)
  const prod = (r: (typeof merged)[number]) => ({ id: 'x', image: '', title: r.title || 'عنوان کالا', en: f.en, brand: f.brand, category: f.category, status: '', mode: f.mode, priceNew: 0, rating: 0, reviews: 0, views: 0, cvr: 0, health: 0, seller: '', code: r.code, model: f.model }) as unknown as Product
  const print = () => {
    if (!total) return toast('تعداد برچسب صفر است.', { tone: 'err' })
    if (!f.code) { const c = takeCode('product'); set({ code: c }); toast(`کد ${c} برای این کالا رزرو شد تا برچسب با کد واقعی چاپ شود.`); setTimeout(() => printSolo(box.current), 120); return }
    printSolo(box.current)
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-end gap-3">
      <Field label="اندازهٔ برچسب"><Select className="w-40" value={size} onChange={setSize} options={Object.entries(LABEL_SIZES).map(([k, v]) => [k, v.label] as [string, string])} /></Field>
      <Field label="زمینه"><Segmented size="sm" value={bg} onChange={setBg} options={Object.entries(LABEL_BG).map(([k, v]) => [k, v.label] as [string, string])} /></Field>
      <Button variant="primary" icon={<Printer size={14} />} onClick={print}>چاپ {fa(total)} برچسب</Button>
    </div>
    {!f.code && <p className="rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">کد کالا هنوز ساخته نشده است؛ با زدن «چاپ»، کد واقعی رزرو و روی برچسب گذاشته می‌شود.</p>}
    <ul className="grid gap-2 2xl:grid-cols-2">{merged.map((r) => <li key={r.code} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
      <div className="shrink-0 rounded-lg bg-neutral-bg p-1.5"><ProductLabel p={prod(r)} size={size} bg={bg} /></div>
      <div className="min-w-0 flex-1 space-y-1.5 text-12"><p className="font-semibold">{r.sub || 'برچسب کالا'}</p><p className="text-t2">موجودی {fa(r.qty)} عدد</p>
        <label className="flex items-center gap-1.5 text-t2">تعداد چاپ<Input type="number" min={0} max={500} className="ltr h-8 w-20 text-center font-mono" value={n(r)} onChange={(e) => setCopies({ ...copies, [r.code]: Math.max(0, Math.min(500, +e.target.value)) })} aria-label={`تعداد چاپ ${r.code}`} /></label></div>
    </li>)}</ul>
    <p className="text-11 text-t2">برای هر تنوع (هر ترکیب رنگ، حافظه و ویژگی‌های دیگر) و هر مالک یک کد جداست تا هنگام بسته‌بندی، اسکن تنوع و مالک را درست تشخیص دهد. برچسب واحدهای سریال‌دار پس از ثبت از صفحهٔ هر واحد هم چاپ می‌شود.</p>
    <div ref={box} className="hidden">{merged.flatMap((r) => Array.from({ length: n(r) }, (_, i) => <ProductLabel key={r.code + i} p={prod(r)} size={size} bg={bg} />))}</div>
  </div>
}
