import { useState } from 'react'
import { ChevronDown, Copy, ImageOff, Layers, Pencil, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { ColorPicker, guessHex } from '@/shared/ui/colorPicker'
import { Badge, Button, cx, Field, Input, Segmented, Select, Toggle } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { getDB, mutate, useDB } from '@/shared/lib/store'
import { isEan13 } from '@/shared/lib/barcode'
import { fa, toman } from '@/shared/lib/fa'
import type { PAttr, Unit, Variation } from '@/shared/data/seed'
import { attrKey, axisOf, combos, deliveryFor, effPrice, LOCAL, priceRange, sameOpts, skuOf, totalQty, valHex, valLabel, varLabel, varStock, type Delivery } from '@/shared/lib/variants'
import { fastOn } from '@/shared/data/partners'
import { Truck, Zap, Bell } from 'lucide-react'

export type VarDraft = { fastEligible?: boolean; title?: string; code: string; images: string[]; price: number; mode: 'qty' | 'serial'; attrs: PAttr[]; variations: Variation[]; defaultVar: string; units: { serial: string; variationId?: string }[]; id?: string }
const money = (v?: number) => (v ? v.toLocaleString('en-US') : '')
const parse = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const Num = ({ value, onChange, placeholder, label, w }: { value?: number; onChange: (n: number) => void; placeholder?: string; label: string; w?: string }) => <Input aria-label={label} className={cx('ltr text-left font-mono', w)} inputMode="numeric" value={money(value)} placeholder={placeholder} onChange={(e) => onChange(parse(e.target.value))} />
const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w؀-ۿ-]/g, '') || `v${Date.now().toString(36)}`
const newVar = (opts: Record<string, string>, n: number): Variation => ({ id: `var${Date.now().toString(36)}${n}${Math.random().toString(36).slice(2, 5)}`, opts, suffix: String(n), qty: { tehran: 0, mahabad: 0 }, enabled: true })

/** ویژگی‌ها و تنوع‌های کالای متغیر (الگو: ووکامرس؛ با کد، قیمت، موجودی و تصویر جدا برای هر تنوع) */
export function VariableEditor({ f, set }: { f: VarDraft; set: (p: Partial<VarDraft>) => void }) {
  const d = useDB(); const [open, setOpen] = useState<string | null>(null); const [newAttr, setNewAttr] = useState<string | null>(null); const [newVal, setNewVal] = useState<Record<string, string>>({})
  const [newHex, setNewHex] = useState<Record<string, string>>({}); const [edit, setEdit] = useState<{ k: string; i: number; v: string; l: string; hex?: string } | null>(null)
  const [bulk, setBulk] = useState('price'); const [bulkV, setBulkV] = useState(''); const [sfx, setSfx] = useState<'num' | 'code'>('num')
  const A = f.attrs; const V = f.variations; const forVar = A.filter((a) => a.forVar)
  const setA = (i: number, p: Partial<PAttr>) => set({ attrs: A.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const setVar = (id: string, p: Partial<Variation>) => set({ variations: V.map((v) => (v.id === id ? { ...v, ...p } : v)) })
  const used = new Set(A.map((a) => a.axis))
  const all = combos(A); const missing = all.filter((c) => !V.some((v) => sameOpts(v.opts, c)))
  const nextSuffix = (opts: Record<string, string>, i: number) => (sfx === 'code' ? forVar.map((a) => (opts[attrKey(a)] ?? '').toString().slice(0, 4).toUpperCase()).filter(Boolean).join('-') || String(i) : String(i))
  const gen = () => { if (!forVar.length) return toast('دست‌کم یک ویژگی با تیک «استفاده برای تنوع‌ها» و مقدار انتخاب‌شده لازم است.', { tone: 'err' }); if (!missing.length) return toast('همهٔ ترکیب‌ها از قبل ساخته شده‌اند.')
    const start = V.length; const made = missing.map((c, k) => { const v = newVar(c, start + k + 1); v.suffix = nextSuffix(c, start + k + 1); return v }); set({ variations: [...V, ...made], defaultVar: f.defaultVar || made[0].id }); toast(`${fa(made.length)} تنوع ساخته شد. قیمت، موجودی و تصویر هر کدام را تنظیم کنید.`) }
  const addOne = () => { const v = newVar(Object.fromEntries(forVar.map((a) => [attrKey(a), '*'])), V.length + 1); set({ variations: [...V, v], defaultVar: f.defaultVar || v.id }); setOpen(v.id) }
  const renumber = () => set({ variations: V.map((v, i) => ({ ...v, suffix: nextSuffix(v.opts, i + 1) })) })
  const applyBulk = async () => { const n = parse(bulkV)
    if (bulk === 'delete') { if (!(await confirm({ title: 'حذف همهٔ تنوع‌ها', body: `${fa(V.length)} تنوع حذف می‌شود.`, confirm: 'حذف همه', danger: true }))) return; return set({ variations: [], defaultVar: '' }) }
    const map: Record<string, (v: Variation) => Variation> = { price: (v) => ({ ...v, price: n || undefined }), sale: (v) => ({ ...v, sale: n || undefined }), salePct: (v) => ({ ...v, sale: n ? Math.round((v.price || f.price) * (1 - n / 100) / 1000) * 1000 : undefined }), up: (v) => ({ ...v, price: Math.round((v.price || f.price) * (1 + n / 100) / 1000) * 1000 }), tehran: (v) => ({ ...v, qty: { ...v.qty, tehran: n } }), mahabad: (v) => ({ ...v, qty: { ...v.qty, mahabad: n } }), on: (v) => ({ ...v, enabled: true }), off: (v) => ({ ...v, enabled: false }), noimg: (v) => ({ ...v, image: undefined }) }
    set({ variations: V.map(map[bulk]) }); toast('روی همهٔ تنوع‌ها اعمال شد.') }
  const addAxisVal = (i: number) => { const a = A[i]; const l = (newVal[attrKey(a)] ?? '').trim(); if (!l) return
    if (a.axis === LOCAL) { if (a.values.includes(l)) return toast('این مقدار هست.', { tone: 'err' }); setA(i, { values: [...a.values, l] }) }
    else { const ax = getDB().axes.find((x) => x.id === a.axis)!; if (ax.values.some((x) => x.l === l)) return toast('این مقدار هست.', { tone: 'err' }); const v = slug(l); const hex = ax.kind === 'color' ? newHex[attrKey(a)] || guessHex(l) : undefined; mutate((x) => { x.axes.find((y) => y.id === a.axis)!.values.push(hex ? { v, l, hex } : { v, l }) }, { action: 'افزودن مقدار ویژگی', target: `${ax.name} › ${l}${hex ? ` (${hex})` : ''}` }); setNewHex({ ...newHex, [attrKey(a)]: '' }); setA(i, { values: [...a.values, v] }) }
    setNewVal({ ...newVal, [attrKey(a)]: '' }) }
  const saveEdit = () => { if (!edit) return; const a = A[edit.i]; const l = edit.l.trim(); if (!l) return toast('نام مقدار را بنویسید.', { tone: 'err' })
    if (a.axis === LOCAL) { if (l !== edit.v && a.values.includes(l)) return toast('این مقدار هست.', { tone: 'err' }); const k = attrKey(a); setA(edit.i, { values: a.values.map((x) => (x === edit.v ? l : x)) }); set({ attrs: A.map((y, j) => (j === edit.i ? { ...y, values: y.values.map((x) => (x === edit.v ? l : x)) } : y)), variations: V.map((v) => (v.opts[k] === edit.v ? { ...v, opts: { ...v.opts, [k]: l } } : v)) }) }
    else { const ax = getDB().axes.find((x) => x.id === a.axis)!; if (ax.values.some((x) => x.l === l && x.v !== edit.v)) return toast('مقداری با این نام هست.', { tone: 'err' }); mutate((x) => { const val = x.axes.find((y) => y.id === a.axis)!.values.find((y) => y.v === edit.v)!; val.l = l; if (edit.hex) val.hex = edit.hex }, { action: 'ویرایش مقدار ویژگی سراسری', target: `${ax.name} › ${l}`, after: edit.hex ?? '' }) }
    toast('مقدار ذخیره شد.'); setEdit(null) }
  const delVal = async () => { if (!edit) return; const a = A[edit.i]; const k = attrKey(a)
    if (V.some((v) => v.opts[k] === edit.v)) return toast('این مقدار در تنوع‌های همین کالا استفاده شده؛ اول آن تنوع‌ها را حذف یا مقدارشان را عوض کنید.', { tone: 'err' })
    if (a.axis === LOCAL) { setA(edit.i, { values: a.values.filter((x) => x !== edit.v) }); setEdit(null); return }
    const db = getDB(); const inVars = db.products.filter((p) => p.id !== f.id && (p.variations ?? []).some((v) => v.opts[a.axis] === edit.v) || (p.pdp?.variant?.[a.axis] === edit.v && p.id !== f.id)); if (inVars.length) return toast(`این مقدار در تنوع ${inVars.length} کالای دیگر استفاده شده (${inVars.slice(0, 2).map((p) => p.title).join('، ')}) و حذف نمی‌شود. می‌توانید نام یا رنگش را ویرایش کنید.`, { tone: 'err' })
    const inAttrs = db.products.filter((p) => p.id !== f.id && (p.attrs ?? []).some((x) => x.axis === a.axis && x.values.includes(edit.v)))
    if (!(await confirm({ title: `حذف «${edit.l}» از ویژگی سراسری`, body: inAttrs.length ? `از ویژگی‌های ${inAttrs.length} کالای دیگر هم برداشته می‌شود.` : 'این مقدار از فهرست ویژگی برای همهٔ کالاها حذف می‌شود.', confirm: 'حذف مقدار', danger: true }))) return
    mutate((x) => { const ax = x.axes.find((y) => y.id === a.axis)!; ax.values = ax.values.filter((y) => y.v !== edit.v); x.products.forEach((p) => { p.attrs?.forEach((y) => { if (y.axis === a.axis) y.values = y.values.filter((z) => z !== edit.v) }) }) }, { action: 'حذف مقدار ویژگی سراسری', target: edit.l })
    setA(edit.i, { values: a.values.filter((x) => x !== edit.v) }); setEdit(null); toast('مقدار حذف شد.') }
  const dupSuffix = V.map((v) => v.suffix).filter((s, i, arr) => arr.indexOf(s) !== i)
  const [lo, hi] = priceRange(V, f.price); const tq = totalQty(V)
  const unitCount = (id: string) => f.units.filter((u) => u.variationId === id).length

  return (
    <div className="space-y-4">
      {/* ── ویژگی‌ها ── */}
      <div className="space-y-3 rounded-2xl border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><Layers size={15} />ویژگی‌ها</p><p className="text-11 text-t2">ویژگی‌هایی که مشتری انتخاب می‌کند (رنگ، حافظه…) و تنوع می‌سازند. مشخصات ثابت مثل تراشه یا وزن در گام «مشخصات» است. ویژگی بدون «استفاده برای تنوع‌ها» فقط برای نمایش و فیلتر است.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-60"><Select label="افزودن ویژگی سراسری" value="" placeholder="افزودن ویژگی سراسری…" onChange={(v) => set({ attrs: [...A, { axis: v, values: [], forVar: true, visible: true }] })} options={d.axes.filter((x) => !used.has(x.id)).map((x) => [x.id, x.name] as [string, string])} other={false} /></div>
          {newAttr === null ? <Button icon={<Plus size={14} />} onClick={() => setNewAttr('')}>ویژگی اختصاصی تازه</Button>
            : <span className="flex items-center gap-1.5"><Input autoFocus aria-label="نام ویژگی اختصاصی" className="w-44" value={newAttr} placeholder="مثلاً ظرفیت باتری" onChange={(e) => setNewAttr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (document.getElementById('add-local-attr') as HTMLButtonElement)?.click() } }} /><Button id="add-local-attr" variant="primary" onClick={() => { const n = (newAttr ?? '').trim(); if (!n) return; if (A.some((a) => (a.axis === LOCAL ? a.name : axisOf(d, a).name) === n)) return toast('این ویژگی هست.', { tone: 'err' }); set({ attrs: [...A, { axis: LOCAL, name: n, values: [], forVar: true, visible: true }] }); setNewAttr(null) }}>افزودن</Button><Button variant="ghost" aria-label="انصراف" icon={<X size={14} />} onClick={() => setNewAttr(null)} /></span>}
        </div>
        {A.length === 0 && <p className="rounded-xl bg-surface-2 px-3 py-3 text-center text-12 text-t2">هنوز ویژگی‌ای اضافه نشده است. مثلاً «رنگ» را از ویژگی‌های سراسری انتخاب کنید و مقدارهای آبی، زرد و مشکی را تیک بزنید.</p>}
        {A.map((a, i) => { const ax = axisOf(d, a); const k = attrKey(a); return <div key={k} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><b className="text-13">{ax.name}</b><Badge dot={false} tone={a.axis === LOCAL ? 'neutral' : 'info'}>{a.axis === LOCAL ? 'اختصاصی این کالا' : 'سراسری'}</Badge><span className="text-11 text-t2">{fa(a.values.length)} مقدار</span></span>
            <span className="flex flex-wrap items-center gap-3 text-12"><Toggle on={a.visible} onChange={(v) => setA(i, { visible: v })} text="نمایش در برگهٔ کالا" /><Toggle on={a.forVar} onChange={(v) => setA(i, { forVar: v })} text="استفاده برای تنوع‌ها" /><button type="button" className="text-danger" onClick={() => { set({ attrs: A.filter((_, j) => j !== i), variations: V.map((v) => { const o = { ...v.opts }; delete o[k]; return { ...v, opts: o } }) }) }}>حذف</button></span></div>
          <div className="flex flex-wrap gap-1.5">{(a.axis === LOCAL ? a.values.map((v) => ({ v, l: v, hex: undefined as string | undefined })) : ax.values).map((o) => { const on = a.values.includes(o.v); const ed = edit?.k === k && edit.v === o.v; return <span key={o.v} className={cx('group inline-flex items-center rounded-full border text-12', ed ? 'border-brand ring-2 ring-brand/30' : on ? 'border-brand bg-brand-tint text-brand' : 'border-line text-t2 hover:border-brand/50')}>
            <button type="button" aria-pressed={on} onClick={() => setA(i, { values: on ? a.values.filter((x) => x !== o.v) : [...a.values, o.v] })} className="flex items-center gap-1.5 py-1 pr-2.5 pl-1">{o.hex && <span className="size-3.5 rounded-full border border-line" style={{ background: o.hex }} />}{o.l}</button>
            <button type="button" aria-label={`ویرایش ${o.l}`} title="ویرایش نام و رنگ" onClick={() => setEdit(ed ? null : { k, i, v: o.v, l: o.l, hex: o.hex ?? (ax.kind === 'color' ? guessHex(o.l) : undefined) })} className="grid size-6 place-items-center rounded-full text-t3 opacity-60 hover:bg-neutral-bg hover:text-brand group-hover:opacity-100 focus:opacity-100"><Pencil size={11} /></button></span> })}</div>
          {edit?.k === k && <div className="mt-2 grid gap-3 rounded-xl border border-brand/30 bg-surface-2 p-3 sm:grid-cols-[1fr_280px]">
            <div className="space-y-2"><p className="text-12 font-semibold">ویرایش مقدار «{edit.l}»</p><Input aria-label="نام مقدار" value={edit.l} onChange={(e) => setEdit({ ...edit, l: e.target.value })} />
              <p className="text-11 text-t2">{a.axis === LOCAL ? 'فقط در همین کالا تغییر می‌کند.' : 'ویژگی سراسری است؛ نام و رنگ برای همهٔ کالاهایی که این مقدار را دارند عوض می‌شود.'}</p>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="primary" onClick={saveEdit}>ذخیره</Button><Button size="sm" variant="danger" icon={<Trash2 size={12} />} onClick={delVal}>حذف مقدار</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>انصراف</Button></div></div>
            {edit.hex !== undefined && <ColorPicker label={`رنگ ${edit.l}`} value={edit.hex} onChange={(hex) => setEdit({ ...edit, hex })} />}
          </div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><Input aria-label={`مقدار تازهٔ ${ax.name}`} className="h-8 w-40 text-12" value={newVal[k] ?? ''} placeholder="مقدار تازه" onChange={(e) => setNewVal({ ...newVal, [k]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAxisVal(i) } }} />{ax.kind === 'color' && a.axis !== LOCAL && <span className="size-6 rounded-full border border-line" style={{ background: newHex[k] || guessHex(newVal[k] ?? '') }} title="رنگ مقدار تازه" />}<Button size="sm" onClick={() => addAxisVal(i)}>ایجاد مقدار</Button>
            {a.axis !== LOCAL && <><Button size="sm" variant="ghost" onClick={() => setA(i, { values: ax.values.map((x) => x.v) })}>انتخاب همه</Button><Button size="sm" variant="ghost" onClick={() => setA(i, { values: [] })}>انتخاب هیچ‌کدام</Button></>}
            {a.axis !== LOCAL && <span className="text-11 text-t3">مقدار تازهٔ ویژگی سراسری برای همهٔ کالاها اضافه می‌شود.</span>}</div>
          {ax.kind === 'color' && a.axis !== LOCAL && (newVal[k] ?? '').trim() && <div className="mt-2 max-w-sm rounded-xl border border-line p-3"><p className="mb-2 text-12 font-medium">رنگ «{newVal[k]}»</p><ColorPicker label={`رنگ ${newVal[k]}`} value={newHex[k] || guessHex(newVal[k] ?? '')} onChange={(hex) => setNewHex({ ...newHex, [k]: hex })} /></div>}
        </div> })}
      </div>

      {/* ── تنوع‌ها ── */}
      <div className="space-y-3 rounded-2xl border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-13 font-semibold">تنوع‌ها ({fa(V.length)})</p>
          <span className="flex flex-wrap gap-2"><Button variant="primary" icon={<Wand2 size={14} />} onClick={gen}>تولید تنوع{missing.length ? ` (${fa(missing.length)} ترکیب)` : ''}</Button><Button icon={<Plus size={14} />} disabled={!forVar.length} onClick={addOne}>افزودن دستی</Button></span>
        </div>
        {V.length > 0 && <div className="grid gap-3 rounded-xl bg-surface-2 p-2.5 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-56"><Select label="اقدام گروهی" value={bulk} onChange={setBulk} other={false} options={[['price', 'قیمت عادی همه'], ['up', 'افزایش قیمت (درصد)'], ['sale', 'قیمت ویژهٔ همه'], ['salePct', 'تخفیف درصدی همه'], ['tehran', 'موجودی تهران همه'], ['mahabad', 'موجودی مهاباد همه'], ['on', 'فعال‌کردن همه'], ['off', 'غیرفعال‌کردن همه'], ['noimg', 'برداشتن تصویر همه'], ['delete', 'حذف همهٔ تنوع‌ها']]} /></div>
            {!['on', 'off', 'noimg', 'delete'].includes(bulk) && <Input aria-label="مقدار اقدام گروهی" className="ltr w-36 text-left font-mono" inputMode="numeric" value={bulkV} onChange={(e) => setBulkV(e.target.value)} placeholder={['up', 'salePct'].includes(bulk) ? 'درصد' : 'عدد'} />}
            <Button onClick={applyBulk}>اعمال</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-52"><Select label="تنوع پیش‌فرض فرم" value={f.defaultVar} onChange={(v) => set({ defaultVar: v })} other={false} placeholder="بدون پیش‌فرض" options={[['', 'بدون پیش‌فرض (مشتری انتخاب کند)'], ...V.map((v) => [v.id, varLabel(d, A, v)] as [string, string])]} /></div>
          </div>
        </div>}
        {V.length > 0 && <div className="flex flex-wrap items-center gap-2 text-12"><span className="text-t2">پسوند کد تنوع:</span><Segmented size="sm" value={sfx} onChange={setSfx} options={[['num', 'عدد ترتیبی (‎-1، ‎-2)'], ['code', 'کد مقدار (‎-BLAC)']]} /><Button size="sm" variant="ghost" onClick={renumber}>بازسازی پسوندها</Button><span className="ltr font-mono text-t2">{f.code || 'GH-P-…'}-{V[0]?.suffix}</span>{dupSuffix.length > 0 && <Badge tone="danger">پسوند تکراری: {dupSuffix.join('، ')}</Badge>}</div>}
        {V.length === 0 ? <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-12 text-t2">{forVar.length ? `«تولید تنوع» همهٔ ${fa(all.length)} ترکیب را می‌سازد؛ یا با «افزودن دستی» فقط ترکیب‌هایی را که دارید بسازید.` : 'اول ویژگی و مقدارها را انتخاب کنید.'}</p>
          : <ul className="space-y-2">{V.map((v, i) => { const isOpen = open === v.id; const img = v.image && f.images.includes(v.image) ? v.image : undefined; const stock = f.mode === 'serial' ? unitCount(v.id) : varStock(v); const eBad = v.ean && !isEan13(v.ean); const pr = effPrice(v, f.price)
            return <li key={v.id} className={cx('rounded-xl border', v.enabled ? 'border-line' : 'border-dashed border-line opacity-70', isOpen && 'border-brand/50')}>
              <div className="flex flex-wrap items-center gap-2 p-2">
                <span className="tnum w-6 text-center text-11 text-t3">{fa(i + 1)}</span>
                <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-white">{img ? <img src={img} alt="" className="size-full object-contain" /> : <span className="grid size-full place-items-center text-t3" title="تصویر اختصاصی ندارد؛ تصویر اصلی نمایش داده می‌شود"><ImageOff size={14} /></span>}</span>
                <span className="flex flex-wrap items-center gap-1.5">{forVar.map((a) => { const k = attrKey(a); const ax = axisOf(d, a); return <span key={k} className="w-36"><Select label={`${ax.name} تنوع ${i + 1}`} value={v.opts[k] ?? '*'} other={false} onChange={(x) => setVar(v.id, { opts: { ...v.opts, [k]: x } })} options={[['*', `هر ${ax.name}…`], ...a.values.map((x) => [x, valLabel(d, a, x)] as [string, string])]} /></span> })}
                  {forVar.map((a) => { const hx = valHex(d, a, v.opts[attrKey(a)]); return hx ? <span key={attrKey(a)} className="size-4 rounded-full border border-line" style={{ background: hx }} /> : null })}</span>
                <span className="ltr font-mono text-11 text-t2">{skuOf(f.code, v)}</span>
                <span className="mr-auto flex items-center gap-2 text-12">{f.mode === 'qty' && <span className="tnum text-11 text-t2">تهران {fa(v.qty.tehran)} · مهاباد {fa(v.qty.mahabad)}</span>}{f.mode === 'qty' && <DeliveryBadge dl={deliveryFor(v, !!f.fastEligible, fastOn(d.network, 'tehran', d.partners), fastOn(d.network, 'mahabad', d.partners))} />}<span className={cx('tnum', !stock && 'text-danger')}>{stock ? `${fa(stock)} عدد` : 'ناموجود'}</span><span className="tnum font-medium">{pr ? toman(pr) : <span className="text-warning">بدون قیمت</span>}</span>
                  <Toggle on={v.enabled} label={`فعال بودن تنوع ${i + 1}`} onChange={(x) => setVar(v.id, { enabled: x })} />
                  <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : v.id)} icon={<ChevronDown size={14} className={cx('transition-transform', isOpen && 'rotate-180')} />}>ویرایش</Button>
                  <Button size="sm" variant="ghost" aria-label={`کپی تنوع ${i + 1}`} icon={<Copy size={13} />} onClick={() => set({ variations: [...V, { ...structuredClone(v), id: newVar({}, i).id, suffix: String(V.length + 1), ean: '' }] })} />
                  <Button size="sm" variant="ghost" aria-label={`حذف تنوع ${i + 1}`} icon={<Trash2 size={13} />} onClick={() => set({ variations: V.filter((x) => x.id !== v.id), defaultVar: f.defaultVar === v.id ? '' : f.defaultVar })} /></span>
              </div>
              {isOpen && <div className="grid gap-4 border-t border-line p-3 lg:grid-cols-[220px_1fr]">
                <div><p className="mb-1.5 text-12 font-medium">تصویر این تنوع</p><p className="mb-2 text-11 text-t2">وقتی مشتری این تنوع را انتخاب کند، گالری روی همین تصویر می‌رود.</p>
                  <div className="grid grid-cols-4 gap-1.5"><button type="button" onClick={() => setVar(v.id, { image: undefined })} className={cx('grid aspect-square place-items-center rounded-lg border text-center text-[10px] leading-4 text-t2', !img ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>تصویر اصلی</button>
                    {f.images.map((s, j) => <button key={j} type="button" aria-label={`تصویر ${j + 1} برای این تنوع`} onClick={() => setVar(v.id, { image: s })} className={cx('relative aspect-square overflow-hidden rounded-lg border bg-white', img === s ? 'border-brand ring-2 ring-brand/30' : 'border-line')}><img src={s} alt="" className="size-full object-contain" /><span className="absolute bottom-0 left-0 rounded-tr bg-white/90 px-1 text-[10px]">{fa(j + 1)}</span></button>)}</div>
                  {!f.images.length && <p className="mt-2 text-11 text-warning">اول در گام «تصاویر و ویدیو» عکس‌ها را اضافه کنید.</p>}</div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label="پسوند کد تنوع" help={`کد کامل: ${skuOf(f.code, v)}`}><Input className={cx('ltr text-left font-mono', dupSuffix.includes(v.suffix) && 'border-danger')} value={v.suffix} onChange={(e) => setVar(v.id, { suffix: e.target.value.replace(/\s+/g, '').toUpperCase() })} /></Field>
                  <Field label="بارکد کارخانه (EAN-13)" error={eBad ? 'بارکد ۱۳ رقمی معتبر نیست.' : undefined}><Input className="ltr text-left font-mono" inputMode="numeric" maxLength={13} value={v.ean ?? ''} placeholder="اختیاری" onChange={(e) => setVar(v.id, { ean: e.target.value.replace(/\D/g, '') })} /></Field>
                  <Field label="قیمت عادی (تومان)" help={v.price ? undefined : `خالی = قیمت پایه ${f.price ? toman(f.price) : 'ثبت نشده'}`}><Num label="قیمت عادی تنوع" value={v.price} placeholder={money(f.price)} onChange={(n) => setVar(v.id, { price: n || undefined })} /></Field>
                  <Field label="قیمت فروش ویژه (تومان)" error={v.sale && v.sale >= (v.price || f.price) ? 'قیمت ویژه باید کمتر از قیمت عادی باشد.' : undefined}><Num label="قیمت ویژهٔ تنوع" value={v.sale} placeholder="اختیاری" onChange={(n) => setVar(v.id, { sale: n || undefined })} /></Field>
                  {v.sale ? <Field label="پایان قیمت ویژه"><Input type="date" value={(v.saleUntil ?? '').slice(0, 10)} onChange={(e) => setVar(v.id, { saleUntil: e.target.value || undefined })} /></Field> : null}
                  {f.mode === 'qty' ? <>
                    <Field label="موجودی انبار تهران"><Input type="number" min={0} className="ltr text-left font-mono" value={v.qty.tehran} onChange={(e) => setVar(v.id, { qty: { ...v.qty, tehran: Math.max(0, +e.target.value) } })} /></Field>
                    <Field label="موجودی انبار مهاباد"><Input type="number" min={0} className="ltr text-left font-mono" value={v.qty.mahabad} onChange={(e) => setVar(v.id, { qty: { ...v.qty, mahabad: Math.max(0, +e.target.value) } })} /></Field>
                  </> : <Field label="موجودی" help="کالای سریال‌دار: موجودی از واحدهایی می‌آید که در گام «موجودی» به این تنوع وصل شده‌اند."><p className="tnum flex h-9 items-center text-13 font-semibold">{fa(unitCount(v.id))} واحد</p></Field>}
                  <Field label="آستانهٔ کمبود موجودی" help={`خالی = پیش‌فرض فروشگاه (${fa(d.storeCfg.pdp.lowStock)})`}><Input type="number" min={0} className="ltr text-left font-mono" value={v.low ?? ''} onChange={(e) => setVar(v.id, { low: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })} /></Field>
                  <Field label="وزن (گرم)" help="خالی = وزن کالای اصلی"><Input type="number" min={0} className="ltr text-left font-mono" value={v.weight ?? ''} onChange={(e) => setVar(v.id, { weight: e.target.value === '' ? undefined : +e.target.value })} /></Field>
                  <Field label="پیش‌فروش وقتی ناموجود است"><div className="flex h-9 items-center"><Toggle on={!!v.backorder} onChange={(x) => setVar(v.id, { backorder: x })} text={v.backorder ? 'مجاز' : 'مجاز نیست'} /></div></Field>
                </div>
              </div>}
            </li> })}</ul>}
        {V.length > 0 && <div className="grid gap-2 rounded-xl bg-surface-2 p-3 text-12 sm:grid-cols-3">
          <p>جمع موجودی: <b className="tnum">{fa(f.mode === 'serial' ? f.units.filter((u) => u.variationId).length : tq.tehran + tq.mahabad)}</b>{f.mode === 'qty' && <span className="text-t2"> (تهران {fa(tq.tehran)} · مهاباد {fa(tq.mahabad)})</span>}</p>
          <p>قیمت در سایت: <b>{lo === hi ? toman(lo) : `از ${toman(lo)} تا ${toman(hi)}`}</b>{!f.price && V.some((v) => v.enabled && !v.price) && <span className="block text-11 text-warning">{fa(V.filter((v) => v.enabled && !v.price).length)} تنوع قیمت ندارد؛ قیمت پایه را در گام «قیمت و سود» بگذارید.</span>}</p>
          <p>بدون تصویر اختصاصی: <b className="tnum">{fa(V.filter((v) => !v.image).length)}</b> <span className="text-t2">(تصویر اصلی نمایش داده می‌شود)</span></p>
          <p className="text-t2 sm:col-span-3"><Sparkles size={12} className="ml-1 inline" />در صفحهٔ کالا: {V.filter((v) => v.enabled).slice(0, 4).map((v) => `«${varLabel(d, A, v)}» ← ${v.image && f.images.includes(v.image) ? `تصویر ${fa(f.images.indexOf(v.image) + 1)}` : 'تصویر اصلی'}`).join('، ')}{V.length > 4 ? '…' : ''}. تنوع ناموجود با «خبرم کن» نمایش داده می‌شود و تنوع غیرفعال پنهان است.</p>
        </div>}
        {V.some((v) => v.enabled) && <PdpPreview f={f} />}
      </div>
    </div>
  )
}

/** انتخاب تنوع برای هر واحد سریال‌دار (کالای متغیر) */
export function UnitVariationSelect({ f, value, onChange, label }: { f: Pick<VarDraft, 'attrs' | 'variations'>; value?: string; onChange: (v: string) => void; label: string }) {
  const d = useDB()
  return <Select label={label} value={value ?? ''} onChange={onChange} other={false} placeholder="انتخاب تنوع" options={f.variations.map((v) => [v.id, varLabel(d, f.attrs, v)] as [string, string])} />
}
export type { Unit }

/** موجودی تنوع‌های کالاهای متغیر (انبار و صفحهٔ کالا) */
export function VariantStockTable({ pid, onlyLow, onEdit }: { pid?: string; onlyLow?: boolean; onEdit?: (pid: string) => void }) {
  const d = useDB(); const low0 = d.storeCfg.pdp.lowStock
  const rows = d.products.filter((p) => p.kind === 'variable' && (!pid || p.id === pid)).flatMap((p) => (p.variations ?? []).map((v) => { const units = d.units.filter((u) => u.productId === p.id && u.variationId === v.id && ['unit.published', 'unit.ready'].includes(u.status)).length; const t = p.mode === 'serial' ? units : varStock(v); return { p, v, t, low: t <= (v.low ?? low0), label: varLabel(d, p.attrs ?? [], v) } }))
    .filter((r) => !onlyLow || (r.low && r.v.enabled))
  if (!rows.length) return <p className="rounded-xl bg-surface-2 px-3 py-3 text-center text-12 text-t2">{onlyLow ? 'هیچ تنوعی زیر آستانهٔ کمبود نیست.' : 'کالای متغیری ثبت نشده است.'}</p>
  return <div className="overflow-x-auto rounded-xl border border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{[...(pid ? [] : ['کالا']), 'تنوع', 'کد', 'بارکد', 'تهران', 'مهاباد', 'جمع', 'ارسال', 'قیمت', 'تصویر', ''].map((h) => <th key={h} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
    <tbody>{rows.map(({ p, v, t, low, label }) => { const hex = (p.attrs ?? []).map((a) => valHex(d, a, v.opts[attrKey(a)])).find(Boolean); return <tr key={v.id} className={cx('border-t border-line', !v.enabled && 'opacity-50')}>
      {!pid && <td className="p-2">{p.title}</td>}
      <td className="p-2"><span className="flex items-center gap-1.5">{hex && <span className="size-3.5 rounded-full border border-line" style={{ background: hex }} />}{label}{p.defaultVar === v.id && <Badge dot={false} tone="info">پیش‌فرض</Badge>}{!v.enabled && <Badge dot={false}>غیرفعال</Badge>}</span></td>
      <td className="ltr p-2 text-left font-mono">{skuOf(p.code ?? '', v)}</td><td className="ltr p-2 text-left font-mono text-t2">{v.ean || '—'}</td>
      <td className="tnum p-2">{p.mode === 'serial' ? '—' : fa(v.qty.tehran)}</td><td className="tnum p-2">{p.mode === 'serial' ? '—' : fa(v.qty.mahabad)}</td>
      <td className="p-2"><span className={cx('tnum font-semibold', !t ? 'text-danger' : low ? 'text-warning' : '')}>{t ? fa(t) : 'ناموجود'}</span>{t > 0 && low && <span className="mr-1 text-11 text-warning">کمبود</span>}{!t && v.backorder && <span className="mr-1 text-11 text-info">پیش‌فروش</span>}</td>
      <td className="p-2">{p.mode === 'qty' ? <DeliveryBadge dl={deliveryFor(v, p.fastEligible, fastOn(d.network, 'tehran', d.partners), fastOn(d.network, 'mahabad', d.partners))} /> : '—'}</td>
      <td className="tnum p-2">{toman(effPrice(v, p.price ?? 0))}{v.sale && v.sale < (v.price || p.price || 0) ? <span className="mr-1 text-11 text-t3 line-through">{toman(v.price || p.price || 0)}</span> : null}</td>
      <td className="p-2">{v.image ? <img src={v.image} alt="" className="size-8 rounded border border-line object-contain" /> : <span className="text-11 text-t3">اصلی</span>}</td>
      <td className="p-2">{onEdit && <Button size="sm" variant="ghost" onClick={() => onEdit(p.id)}>ویرایش</Button>}</td></tr> })}</tbody></table></div>
}

/** تعدیل موجودی هر تنوع (کشوی «ویرایش موجودی» کالای متغیر) */
export function VariantStockEditor({ pid, onDone }: { pid: string; onDone: () => void }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid)!; const [rows, setRows] = useState(() => (p.variations ?? []).map((v) => ({ id: v.id, t: v.qty.tehran, m: v.qty.mahabad })))
  const [reason, setReason] = useState('دریافت محموله')
  const save = () => { mutate((x) => { const t = x.products.find((y) => y.id === pid)!; t.variations = (t.variations ?? []).map((v) => { const r = rows.find((y) => y.id === v.id)!; return { ...v, qty: { tehran: r.t, mahabad: r.m } } }); t.qty = totalQty(t.variations) }, { action: 'تعدیل موجودی تنوع‌ها', target: p.title, after: `${rows.map((r) => `${varLabel(d, p.attrs ?? [], p.variations!.find((v) => v.id === r.id)!)}: ${r.t}/${r.m}`).join('، ')} · ${reason}` }); toast('موجودی تنوع‌ها ثبت شد.'); onDone() }
  return <div className="space-y-3">
    {(p.variations ?? []).map((v, i) => { const r = rows[i]; const up = (k: 't' | 'm', n: number) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: Math.max(0, n) } : x))); return <div key={v.id} className="rounded-xl border border-line p-2.5"><p className="mb-1.5 flex items-center justify-between text-13"><b>{varLabel(d, p.attrs ?? [], v)}</b><span className="ltr font-mono text-11 text-t2">{skuOf(p.code ?? '', v)}</span></p>
      <div className="grid grid-cols-2 gap-2">{([['t', 'تهران'], ['m', 'مهاباد']] as const).map(([k, l]) => <Field key={k} label={l}><div className="flex items-center gap-1.5"><Button aria-label={`کم ${l}`} onClick={() => up(k, r[k] - 1)}>−</Button><Input aria-label={`${l} ${varLabel(d, p.attrs ?? [], v)}`} type="number" className="ltr w-20 text-center font-mono" value={r[k]} onChange={(e) => up(k, +e.target.value)} /><Button aria-label={`زیاد ${l}`} onClick={() => up(k, r[k] + 1)}>+</Button></div></Field>)}</div></div> })}
    <Field label="دلیل تعدیل" help="در لاگ و تاریخچهٔ کالا ثبت می‌شود."><Select value={reason} onChange={setReason} options={['دریافت محموله', 'شمارش انبار', 'کالای آسیب‌دیده', 'انتقال بین انبارها', 'اصلاح خطای ثبت']} /></Field>
    <Button variant="primary" onClick={save}>ثبت موجودی</Button>
  </div>
}

const DL_TONE: Record<Delivery['tone'], string> = { fast: 'bg-success-bg text-success', post: 'bg-info-bg text-info', none: 'bg-danger-bg text-danger', pre: 'bg-warning-bg text-warning' }
export const DeliveryBadge = ({ dl }: { dl: Delivery }) => <span title={dl.lines.join(' · ')} className={cx('rounded-full px-2 py-0.5 text-[11px] font-medium', DL_TONE[dl.tone])}>{dl.tone === 'fast' ? 'ارسال سریع' : dl.tone === 'post' ? (dl.from.includes('تهران') ? 'از تهران' : 'فقط پیشتاز') : dl.tone === 'pre' ? 'پیش‌فروش' : 'ناموجود'}</span>

/** پیش‌نمایش رفتار صفحهٔ کالا: با انتخاب هر مقدار، تصویر، قیمت، موجودی هر انبار و روش ارسال همان تنوع نمایش داده می‌شود */
export function PdpPreview({ f }: { f: Pick<VarDraft, 'attrs' | 'variations' | 'images' | 'price' | 'defaultVar' | 'fastEligible' | 'title' | 'mode'> & { code?: string } }) {
  const d = useDB(); const use = f.attrs.filter((a) => a.forVar)
  const def = f.variations.find((v) => v.id === f.defaultVar && v.enabled) ?? f.variations.find((v) => v.enabled)!
  const [pick, setPick] = useState<Record<string, string>>(() => ({ ...(def?.opts ?? {}) }))
  const match = (o: Record<string, string>) => f.variations.find((v) => v.enabled && use.every((a) => { const k = attrKey(a); const x = v.opts[k]; return !x || x === '*' || x === o[k] }))
  const v = match(pick); const img = v?.image && f.images.includes(v.image) ? v.image : f.images[0]
  const dl = v ? deliveryFor(v, !!f.fastEligible, fastOn(d.network, 'tehran', d.partners), fastOn(d.network, 'mahabad', d.partners)) : null
  const price = v ? effPrice(v, f.price) : 0; const reg = v ? v.price || f.price : 0
  const avail = (k: string, val: string) => f.variations.some((x) => x.enabled && (x.opts[k] === val || x.opts[k] === '*') && varStock(x) > 0)
  return <div className="rounded-2xl border border-brand/30 bg-brand-tint/20 p-3">
    <p className="mb-2 text-12 font-semibold">پیش‌نمایش صفحهٔ کالا برای مشتری <span className="font-normal text-t2">(مقدارها را بزنید)</span></p>
    <div className="grid gap-3 rounded-xl bg-surface p-3 sm:grid-cols-[160px_1fr]">
      <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-line bg-white">{img ? <img src={img} alt="" className="size-full object-contain" /> : <span className="text-11 text-t3">بدون تصویر</span>}</div>
      <div className="space-y-2 text-13">
        <p className="font-semibold">{f.title || 'عنوان کالا'}</p>
        {use.map((a) => { const k = attrKey(a); const ax = axisOf(d, a); return <div key={k}><p className="mb-1 text-12 text-t2">{ax.name}: <b className="text-t1">{pick[k] ? valLabel(d, a, pick[k]) : '—'}</b></p><div className="flex flex-wrap gap-1.5">{a.values.map((val) => { const hx = valHex(d, a, val); const on = pick[k] === val; const ok = avail(k, val); return <button key={val} type="button" aria-label={`پیش‌نمایش ${valLabel(d, a, val)}`} aria-pressed={on} onClick={() => setPick({ ...pick, [k]: val })} className={cx('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-12', on ? 'border-brand ring-2 ring-brand/25' : 'border-line', !ok && 'text-t3 line-through decoration-t3')}>{hx && <span className="size-3.5 rounded-full border border-line" style={{ background: hx }} />}{valLabel(d, a, val)}</button> })}</div></div> })}
        {!v ? <p className="rounded-lg bg-neutral-bg px-3 py-2 text-12 text-t2">این ترکیب تنوع ندارد؛ در سایت قابل انتخاب نیست.</p> : <>
          <p className="tnum text-16 font-bold">{toman(price)}{price < reg && <span className="mr-2 text-12 font-normal text-t3 line-through">{toman(reg)}</span>}</p>
          {f.mode === 'qty' && <p className="text-12 text-t2">{d.warehouses.map((w) => { const n = w.id === 'tehran' ? v.qty.tehran : w.id === 'mahabad' ? v.qty.mahabad : 0; return <span key={w.id} className={cx('ml-3', n ? 'text-t1' : 'text-t3')}>{w.name}: <b className="tnum">{n ? fa(n) : 'ندارد'}</b></span> })}{varStock(v) > 0 && varStock(v) <= (v.low ?? d.storeCfg.pdp.lowStock) && <span className="text-warning">تنها {fa(varStock(v))} عدد باقی مانده</span>}</p>}
          {dl && <div className={cx('rounded-xl px-3 py-2 text-12', DL_TONE[dl.tone])}><p className="flex items-center gap-1.5 font-semibold">{dl.tone === 'fast' ? <Zap size={14} /> : dl.tone === 'none' ? <Bell size={14} /> : <Truck size={14} />}{dl.title}</p><ul className="mt-0.5 list-disc pr-5">{dl.lines.map((l) => <li key={l}>{l}</li>)}</ul></div>}
          <p className="text-11 text-t3">کد: <bdi className="font-mono">{skuOf(f.code ?? '', v)}</bdi> {v.image && f.images.includes(v.image) ? `· تصویر ${fa(f.images.indexOf(v.image) + 1)}` : '· تصویر اصلی'}</p>
        </>}
      </div>
    </div>
  </div>
}
