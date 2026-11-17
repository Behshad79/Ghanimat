// جدول تنوع‌ها: ساخت چند تنوع یک‌جا (مثلا چند رنگ) و اتصال بارکد، کد و موجودی جدای هر تنوع
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ScanBarcode } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { getDB, mutate, takeCode, useDB } from '@/shared/lib/store'
import { isEan13 } from '@/shared/lib/barcode'
import { fa } from '@/shared/lib/fa'
import type { Product } from '@/shared/data/seed'

const soldOf = (pid: string) => getDB().orders.filter((o) => !/cancel/.test(o.status)).flatMap((o) => o.shipments.flatMap((s) => s.items)).filter((i) => i.productId === pid).reduce((a, i) => a + Number(i.qty), 0)
const eanTaken = (ean: string, except?: string) => !!ean && getDB().products.some((p) => p.ean === ean && p.id !== except)

export function VariantMatrix({ selfId, draftGroup, onGroup }: { selfId?: string; draftGroup?: string; onGroup?: (g: string) => void }) {
  const d = useDB(); const nav = useNavigate(); const base = selfId ? d.products.find((p) => p.id === selfId) : undefined
  const group = draftGroup || base?.pdp?.variantGroup; const sibs = group ? d.products.filter((p) => p.pdp?.variantGroup === group) : base ? [base] : []
  const [open, setOpen] = useState(false); const [ax, setAx] = useState('color'); const [rows, setRows] = useState<{ v: string; on: boolean; ean: string; code: string; qt: string; qm: string }[]>([])
  const A = d.axes.find((a) => a.id === ax)
  const lbl = (p: Product) => p.pdp?.variantLabel || Object.entries(p.pdp?.variant ?? {}).map(([a, x]) => d.axes.find((y) => y.id === a)?.values.find((z) => z.v === x)?.l).filter(Boolean).join(' · ') || 'بدون تنوع'
  const editP = (pid: string, patch: Partial<Product>, action: string) => mutate((x) => { Object.assign(x.products.find((p) => p.id === pid)!, patch) }, { action, target: pid })
  const startAdd = (axis: string) => { const a = d.axes.find((y) => y.id === axis); const used = new Set(sibs.map((s) => s.pdp?.variant?.[axis])); setAx(axis); setRows((a?.values ?? []).filter((o) => !used.has(o.v)).map((o) => ({ v: o.v, on: false, ean: '', code: '', qt: '0', qm: '0' }))); setOpen(true) }
  const chosen = rows.filter((r) => r.on)
  const err = (r: (typeof rows)[number]) => (r.ean && !isEan13(r.ean) ? 'بارکد ۱۳ رقمی معتبر نیست' : r.ean && (eanTaken(r.ean) || chosen.filter((x) => x.ean === r.ean).length > 1) ? 'این بارکد قبلا ثبت شده' : '')
  const create = () => {
    if (!base) return
    const g = group || (base.en || base.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const baseLabel = lbl(base)
    mutate((x) => {
      const b = x.products.find((p) => p.id === base.id)!; b.pdp = { ...(b.pdp as any), variantGroup: g }
      chosen.forEach((r, i) => {
        const val = A!.values.find((o) => o.v === r.v)!; const variant = { ...(base.pdp?.variant ?? {}), [ax]: r.v }
        const label = Object.entries(variant).map(([a, v]) => x.axes.find((y) => y.id === a)?.values.find((z) => z.v === v)?.l).filter(Boolean).join(' · ')
        const title = baseLabel !== 'بدون تنوع' && base.title.includes(baseLabel) ? base.title.replace(baseLabel, val.l) : `${base.title} ${val.l}`
        x.products.unshift({ ...structuredClone(base), id: `p${Date.now().toString(36)}${i}`, title, code: r.code.trim() || takeCode('product'), ean: r.ean, qty: { tehran: +r.qt || 0, mahabad: +r.qm || 0 }, mode: 'qty', views: 0, cvr: 0, reviews: base.reviews, pdp: { ...(base.pdp as any), variantGroup: g, variant, variantLabel: label } })
      })
    }, { action: 'ساخت تنوع‌های کالا', target: base.title, after: `${chosen.length} تنوع` })
    onGroup?.(g)
    toast(`${fa(chosen.length)} تنوع ساخته شد؛ هر کدام کد، بارکد و موجودی جدا دارد و در صفحهٔ کالا کنار هم نشان داده می‌شوند.`); setOpen(false)
  }
  if (!base) return <p className="rounded-lg bg-neutral-bg p-2.5 text-11 text-t2">بعد از اولین ذخیرهٔ کالا، از همین‌جا چند رنگ یا حافظه را یک‌جا با بارکد و موجودی جدا می‌سازید.</p>
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-12 font-semibold">جدول تنوع‌ها، بارکد و موجودی</p>
      <span className="flex flex-wrap gap-1.5">{d.axes.map((a) => <Button key={a.id} size="sm" icon={<Plus size={12} />} onClick={() => startAdd(a.id)}>چند {a.name} یک‌جا</Button>)}</span></div>
    <div className="overflow-x-auto rounded-lg border border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['تنوع', 'کد کالا', 'بارکد', 'تهران', 'مهاباد', 'فروخته', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {sibs.map((p) => { const c = p.pdp?.variant?.color; const hex = c ? d.axes.find((a) => a.id === 'color')?.values.find((x) => x.v === c)?.hex : undefined; const bad = p.ean && (!isEan13(p.ean) || eanTaken(p.ean, p.id)); return <tr key={p.id} className={cx('border-t border-line', p.id === selfId && 'bg-brand-tint/30')}>
        <td className="p-2"><span className="flex items-center gap-1.5">{hex && <span className="size-3.5 rounded-full border border-line" style={{ background: hex }} />}{lbl(p)}{p.id === selfId && <Badge tone="brand" dot={false}>همین کالا</Badge>}</span></td>
        <td className="p-2 font-mono ltr text-left">{p.code ?? '—'}</td>
        <td className="p-2"><Input aria-label={`بارکد ${lbl(p)}`} className={cx('ltr w-36 text-left font-mono', bad && 'border-danger')} inputMode="numeric" defaultValue={p.ean ?? ''} placeholder="اسکن یا تایپ" onBlur={(e) => { const v = e.target.value.trim(); if (v === (p.ean ?? '')) return; if (v && !isEan13(v)) return toast('بارکد ۱۳ رقمی معتبر نیست.', { tone: 'err' }); if (eanTaken(v, p.id)) return toast('این بارکد روی کالای دیگری ثبت است.', { tone: 'err' }); editP(p.id, { ean: v }, 'اتصال بارکد به تنوع') }} /></td>
        {(['tehran', 'mahabad'] as const).map((w) => <td key={w} className="p-2"><Input aria-label={`موجودی ${w === 'tehran' ? 'تهران' : 'مهاباد'} ${lbl(p)}`} className="ltr w-16 text-center" inputMode="numeric" defaultValue={String(p.qty?.[w] ?? 0)} onBlur={(e) => { const n = +e.target.value.replace(/\D/g, '') || 0; if (n !== (p.qty?.[w] ?? 0)) editP(p.id, { qty: { tehran: p.qty?.tehran ?? 0, mahabad: p.qty?.mahabad ?? 0, [w]: n } }, 'موجودی تنوع') }} /></td>)}
        <td className="tnum p-2">{fa(soldOf(p.id))}</td>
        <td className="p-2">{p.id !== selfId && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/catalog/${p.id}/edit?step=4`)}>ویرایش</Button>}</td>
      </tr> })}</tbody></table></div>
    <p className="flex items-start gap-1.5 text-11 leading-5 text-t2"><ScanBarcode size={13} className="mt-0.5 shrink-0" />اسکن بارکد در انبار، رسید و میز فروش مستقیم همان تنوع را پیدا می‌کند؛ موجودی و فروش هر رنگ جدا حساب می‌شود و تنوع ناموجود در سایت غیرفعال نشان داده می‌شود.</p>
    <Modal open={open} onClose={() => setOpen(false)} wide title={`ساخت چند ${A?.name ?? ''} یک‌جا از «${base.title}»`} footer={<><Button variant="primary" disabled={!chosen.length || chosen.some((r) => err(r))} onClick={create}>ساخت {chosen.length ? fa(chosen.length) : ''} تنوع</Button><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button></>}>
      <p className="mb-3 text-12 text-t2">همهٔ اطلاعات (عکس، توضیح، قیمت، گارانتی، سئو) از همین کالا کپی می‌شود و بعدا برای هر تنوع قابل تغییر است. هر تنوع کالای جدا با کد، بارکد و موجودی خودش است.</p>
      <Field label="ویژگی"><Select value={ax} onChange={startAdd} options={d.axes.map((a) => [a.id, a.name] as [string, string])} other={false} /></Field>
      {rows.length === 0 ? <p className="mt-3 text-12 text-t2">همهٔ مقدارهای این ویژگی ساخته شده‌اند. مقدار تازه را از «مقدار تازه» در بالای همین بخش اضافه کنید.</p> :
        <div className="mt-3 space-y-1.5">{rows.map((r, i) => { const o = A!.values.find((x) => x.v === r.v)!; const e = r.on ? err(r) : ''; const up = (p: Partial<typeof r>) => setRows(rows.map((x, j) => (j === i ? { ...x, ...p } : x))); return (
          <div key={r.v} className={cx('grid items-center gap-2 rounded-lg border p-2 sm:grid-cols-[160px_1fr_120px_80px_80px]', r.on ? 'border-brand/50 bg-brand-tint/20' : 'border-line')}>
            <label className="flex cursor-pointer items-center gap-2 text-13"><input type="checkbox" checked={r.on} onChange={(ev) => up({ on: ev.target.checked })} />{o.hex && <span className="size-4 rounded-full border border-line" style={{ background: o.hex }} />}{o.l}</label>
            <div><Input aria-label={`بارکد ${o.l}`} className={cx('ltr text-left font-mono', e && 'border-danger')} disabled={!r.on} inputMode="numeric" value={r.ean} placeholder="بارکد ۱۳ رقمی (اختیاری)" onChange={(ev) => up({ ean: ev.target.value.trim() })} />{e && <p className="mt-0.5 text-11 text-danger">{e}</p>}</div>
            <Input aria-label={`کد ${o.l}`} className="ltr text-left font-mono" disabled={!r.on} value={r.code} placeholder="کد: خودکار" onChange={(ev) => up({ code: ev.target.value })} />
            <Input aria-label={`تهران ${o.l}`} className="ltr text-center" disabled={!r.on} inputMode="numeric" value={r.qt} onChange={(ev) => up({ qt: ev.target.value.replace(/\D/g, '') })} />
            <Input aria-label={`مهاباد ${o.l}`} className="ltr text-center" disabled={!r.on} inputMode="numeric" value={r.qm} onChange={(ev) => up({ qm: ev.target.value.replace(/\D/g, '') })} />
          </div>) })}<p className="text-11 text-t2">ستون‌ها: انتخاب، بارکد، کد کالا، موجودی تهران، موجودی مهاباد.</p></div>}
    </Modal>
  </div>
}
