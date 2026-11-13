import { useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Badge, Button, cx } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, takeCode, useDB } from '@/shared/lib/store'
import { csv, download, fa, num } from '@/shared/lib/fa'

const HEAD = ['عنوان فارسی', 'عنوان انگلیسی', 'برند', 'دسته', 'قیمت پایه (تومان)']
type Row = { title: string; en: string; brand: string; category: string; price: number; errs: string[] }

/** خواندن CSV ساده با پشتیبانی از گیومه */
function parse(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cur = ''; let q = false
  for (let i = 0; i < text.length; i++) { const ch = text[i]
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = '' } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = '' } else cur += ch }
  if (cur || row.length) { row.push(cur); out.push(row) }
  return out.filter((r) => r.some((c) => c.trim()))
}

/** ورود گروهی کالا از اکسل (ذخیره به‌صورت CSV): همه پیش‌نویس ساخته می‌شوند تا واحد، عکس و قیمت هر واحد جدا ثبت شود */
export function CsvImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const [rows, setRows] = useState<Row[] | null>(null); const [name, setName] = useState('')
  const brands = new Set((d.entities.brands ?? []).map((b) => String(b.name))); const cats = new Set(d.products.map((p) => p.category))
  const existing = new Set(d.products.map((p) => p.en.toLowerCase()))
  const read = async (f: File) => {
    setName(f.name); const t = (await f.text()).replace(/^﻿/, ''); const all = parse(t); const body = all[0]?.[0]?.includes('عنوان') ? all.slice(1) : all
    setRows(body.map((c) => { const [title = '', en = '', brand = '', category = '', price = ''] = c.map((x) => x.trim()); const pr = +price.replace(/[^\d]/g, ''); const errs: string[] = []
      if (!title) errs.push('عنوان فارسی خالی است'); if (!en) errs.push('عنوان انگلیسی خالی است'); else if (existing.has(en.toLowerCase())) errs.push('این کالا قبلاً ثبت شده')
      if (brand && !brands.has(brand)) errs.push(`برند «${brand}» تعریف نشده`); if (category && !cats.has(category)) errs.push(`دستهٔ «${category}» وجود ندارد`)
      return { title, en, brand, category, price: pr, errs } }))
  }
  const ok = rows?.filter((r) => !r.errs.length) ?? []
  const close = () => { setRows(null); setName(''); onClose() }
  return (
    <Modal wide open={open} onClose={close} title="ورود گروهی کالا از اکسل"
      footer={rows ? <><Button variant="primary" disabled={!ok.length} onClick={() => { const base = d.products[0]; mutate((x) => { ok.forEach((r, i) => x.products.unshift({ ...base, id: `p${Date.now().toString(36)}${i}`, code: takeCode('product'), title: r.title, en: r.en, brand: r.brand || base.brand, category: r.category || base.category, priceNew: r.price || 0, price: undefined, compareAt: undefined, status: 'product.draft', views: 0, cvr: 0, reviews: 0, rating: 0, health: 30, image: '', images: [], qty: base.mode === 'qty' ? { tehran: 0, mahabad: 0 } : undefined })) }, { action: 'ورود گروهی کالا از اکسل', target: name, after: `${ok.length} پیش‌نویس` }); toast(`${fa(ok.length)} کالا به‌صورت پیش‌نویس ساخته شد. ردیف‌های دارای خطا وارد نشدند.`); close() }}>ساخت {fa(ok.length)} پیش‌نویس</Button><Button variant="ghost" onClick={() => setRows(null)}>فایل دیگر</Button></> : undefined}>
      {!rows ? <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface-2 p-8 text-center hover:border-brand">
          <FileSpreadsheet size={28} className="text-brand" /><b className="text-14">فایل خود را انتخاب کنید</b>
          <span className="text-12 text-t2">فایل اکسل را با «Save As ← CSV UTF-8» ذخیره کنید · حداکثر ۵۰۰ ردیف</span>
          <span className="mt-1 flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-12"><Upload size={12} />انتخاب فایل</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f) }} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-info-bg p-3 text-12 text-info"><span>ستون‌ها به این ترتیب: {HEAD.join('، ')}</span><Button size="sm" icon={<Download size={13} />} onClick={() => download('ghanimat-products-template.csv', csv([HEAD, ['گوشی اپل iPhone 15 ظرفیت ۱۲۸ گیگابایت', 'Apple iPhone 15 128GB', [...brands][0] ?? 'اپل', [...cats][0] ?? 'گوشی موبایل', 52000000]]))}>دریافت فایل نمونه</Button></div>
        <p className="text-11 text-t2">همهٔ کالاها پیش‌نویس ساخته می‌شوند. عکس واقعی، گرید و قیمت هر واحد بعداً در «واحدها» ثبت می‌شود و تا آن موقع چیزی در سایت نمایش داده نمی‌شود.</p>
      </div> : <div className="space-y-3">
        <p className="flex flex-wrap gap-2 text-13"><b>{name}</b><Badge tone="success">{fa(ok.length)} ردیف سالم</Badge>{rows.length - ok.length > 0 && <Badge tone="danger">{fa(rows.length - ok.length)} ردیف دارای خطا</Badge>}</p>
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-line"><table className="gh-table w-full text-12"><thead className="sticky top-0 bg-surface-2"><tr>{['#', ...HEAD, 'بررسی'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className={cx('border-t border-line', r.errs.length > 0 && 'bg-danger-bg/50')}><td className="tnum p-2">{fa(i + 1)}</td><td className="p-2">{r.title}</td><td className="ltr p-2 text-right">{r.en}</td><td className="p-2">{r.brand}</td><td className="p-2">{r.category}</td><td className="tnum p-2">{r.price ? num(r.price) : '—'}</td><td className="p-2">{r.errs.length ? <span className="text-danger">{r.errs.join('؛ ')}</span> : <span className="text-success">سالم</span>}</td></tr>)}</tbody></table></div>
      </div>}
    </Modal>
  )
}
