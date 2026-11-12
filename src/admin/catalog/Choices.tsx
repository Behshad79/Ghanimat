import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { Options, Opt } from '@/shared/data/options'
import type { Pdp } from '@/shared/data/seed'

type ListKey = keyof Options
const TITLES: Record<ListKey, string> = { source: 'منبع تأمین', condition: 'وضعیت کالا', grade: 'گرید ظاهری', importRoute: 'مبدأ و مسیر واردات', flawStatus: 'وضعیت بخش‌های ظاهری' }
const FIELD: Partial<Record<ListKey, 'source' | 'condition' | 'grade'>> = { source: 'source', condition: 'condition', grade: 'grade' }

/** ویرایش فهرست گزینه‌ها: افزودن، تغییر نام، حذف (با هشدار اگر کالایی از آن استفاده می‌کند) */
export function OptionsEditor({ list, open, onClose }: { list: ListKey; open: boolean; onClose: () => void }) {
  const d = useDB(); const L = d.opts[list]; const [nw, setNw] = useState({ l: '', note: '' })
  const used = (v: string) => { const k = FIELD[list]; return k ? d.products.filter((p) => p[k] === v).length : 0 }
  const upd = (fn: (x: Opt[]) => void, action: string) => mutate((x) => fn(x.opts[list]), { action, target: TITLES[list] })
  return (
    <Modal open={open} onClose={onClose} title={`گزینه‌های «${TITLES[list]}»`} footer={<Button onClick={onClose}>بستن</Button>}>
      <ul className="space-y-2">{L.map((o, i) => (
        <li key={o.v} className="flex items-center gap-2">
          <Input value={o.l} aria-label="نام گزینه" onChange={(e) => upd((x) => { x[i].l = e.target.value }, 'تغییر نام گزینه')} />
          {list === 'source' && <Input value={o.note ?? ''} aria-label="برچسب روی کارت" placeholder="برچسب روی کارت کالا" onChange={(e) => upd((x) => { x[i].note = e.target.value }, 'تغییر برچسب منبع')} />}
          {used(o.v) > 0 && <Badge dot={false}>{fa(used(o.v))} کالا</Badge>}
          <button type="button" aria-label={`حذف ${o.l}`} disabled={L.length <= 1} onClick={() => { if (used(o.v)) return toast(`${fa(used(o.v))} کالا از «${o.l}» استفاده می‌کنند. اول آن‌ها را به گزینهٔ دیگری ببرید.`, { tone: 'err' }); upd((x) => { x.splice(i, 1) }, 'حذف گزینه') }} className="grid size-8 shrink-0 place-items-center rounded-md text-t2 hover:bg-danger-bg hover:text-danger disabled:opacity-30"><Trash2 size={14} /></button>
        </li>))}</ul>
      <div className="mt-4 flex items-end gap-2 border-t border-line pt-3">
        <Field label="گزینهٔ تازه"><Input value={nw.l} onChange={(e) => setNw({ ...nw, l: e.target.value })} placeholder="مثلا خرید از ترکیه" /></Field>
        {list === 'source' && <Field label="برچسب روی کارت"><Input value={nw.note} onChange={(e) => setNw({ ...nw, note: e.target.value })} placeholder="وارداتی از ترکیه" /></Field>}
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => { if (!nw.l.trim()) return; upd((x) => { x.push({ v: list === 'source' ? `s${Date.now().toString(36)}` : nw.l.trim(), l: nw.l.trim(), note: nw.note.trim() || undefined }) }, 'افزودن گزینه'); setNw({ l: '', note: '' }) }}>افزودن</Button>
      </div>
    </Modal>
  )
}

/** انتخاب از فهرست قابل ویرایش؛ دکمهٔ مداد کنارش فهرست را برای افزودن یا تغییر باز می‌کند */
export function EditableChoice({ list, value, onChange, segmented }: { list: ListKey; value: string; onChange: (v: string) => void; segmented?: boolean }) {
  const d = useDB(); const [ed, setEd] = useState(false); const L = d.opts[list]
  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">{segmented ? <Segmented value={value} onChange={onChange} options={L.map((o) => [o.v, o.l] as [string, string])} /> : <Select value={value} onChange={onChange} options={L.map((o) => [o.v, o.l] as [string, string])} />}</div>
      <button type="button" title={`ویرایش گزینه‌های ${TITLES[list]}`} aria-label={`ویرایش گزینه‌های ${TITLES[list]}`} onClick={() => setEd(true)} className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-t2 hover:border-brand/50 hover:text-brand"><Pencil size={14} /></button>
      <OptionsEditor list={list} open={ed} onClose={() => setEd(false)} />
    </div>
  )
}

/** نمایش تنوع یک کالا: دایرهٔ رنگ + برچسب‌ها (در سفارش، کارت و فهرست‌ها) */
export function VariantChips({ pid, size = 'sm' }: { pid: string; size?: 'sm' | 'md' }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid); const v = p?.pdp?.variant
  if (!v || !Object.keys(v).length) return null
  return <span className="inline-flex flex-wrap items-center gap-1">{Object.entries(v).map(([ax, val]) => { const A = d.axes.find((a) => a.id === ax); const o = A?.values.find((x) => x.v === val); if (!A || !o) return null; return <span key={ax} className={cx('inline-flex items-center gap-1 rounded-full border border-line bg-surface px-1.5', size === 'sm' ? 'h-5 text-[10px]' : 'h-6 text-11')}>{A.kind === 'color' && <span className="size-2.5 rounded-full ring-1 ring-black/15" style={{ background: o.hex }} />}{A.kind === 'color' ? o.l : `${A.name}: ${o.l}`}</span> })}</span>
}

/** ویرایشگر تنوع: گروه، محورها (رنگ با دایرهٔ رنگ، حافظه، جنس، سایز یا محور دلخواه) و پیش‌نمایش صفحهٔ کالا */
export function VariantEditor({ pdp, onChange, selfId }: { pdp: Pdp; onChange: (p: Pdp) => void; selfId?: string }) {
  const d = useDB(); const nav = useNavigate(); const v = pdp.variant ?? {}
  const [newVal, setNewVal] = useState<{ ax: string; l: string; hex: string } | null>(null); const [newAx, setNewAx] = useState<{ name: string; kind: 'color' | 'text' } | null>(null)
  const label = (vv: Record<string, string>) => Object.entries(vv).map(([a, x]) => d.axes.find((y) => y.id === a)?.values.find((z) => z.v === x)?.l).filter(Boolean).join(' · ')
  const setV = (vv: Record<string, string>) => onChange({ ...pdp, variant: vv, variantLabel: label(vv) })
  const siblings = pdp.variantGroup ? d.products.filter((p) => p.pdp?.variantGroup === pdp.variantGroup) : []
  return (
    <div className="space-y-3 rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><Layers size={15} />تنوع کالا (رنگ، حافظه، جنس، سایز…)</p>{siblings.length > 0 && <Badge tone="brand" dot={false}>{fa(siblings.length)} تنوع در این گروه</Badge>}</div>
      <p className="text-11 leading-5 text-t2">هر تنوع (مثلا هدفون سفید و هدفون مشکی) یک کالای جدا با کد و موجودی خودش است و همهٔ تنوع‌های یک مدل با «گروه تنوع» به هم وصل می‌شوند. هر واحد فیزیکی (هر هدفون) بارکد و سریال خودش را دارد و به تنوع خودش تعلق دارد؛ پس ۱۰ سفید و ۱۰ مشکی یعنی ۲ تنوع و ۲۰ بارکد.</p>
      <Field label="گروه تنوع (کلید یکسان برای همهٔ تنوع‌های یک مدل)"><Input className="ltr text-left" placeholder="مثلا sony-wh1000xm5" value={pdp.variantGroup} onChange={(e) => onChange({ ...pdp, variantGroup: e.target.value.trim() })} /></Field>
      {Object.keys(v).map((ax) => { const A = d.axes.find((a) => a.id === ax); if (!A) return null; return (
        <div key={ax}><p className="mb-1.5 flex items-center justify-between text-12 font-medium">{A.name}<button type="button" onClick={() => { const n = { ...v }; delete n[ax]; setV(n) }} className="flex items-center gap-0.5 text-11 text-t2 hover:text-danger"><X size={11} />حذف این ویژگی</button></p>
          <div className="flex flex-wrap items-center gap-1.5">{A.values.map((o) => <button key={o.v} type="button" aria-pressed={v[ax] === o.v} onClick={() => setV({ ...v, [ax]: o.v })} title={o.l} className={cx('flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-12 transition-colors', v[ax] === o.v ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand' : 'border-line hover:border-brand/50')}>{A.kind === 'color' && <span className="size-4 rounded-full ring-1 ring-black/15" style={{ background: o.hex }} />}{o.l}</button>)}
            <button type="button" onClick={() => setNewVal({ ax, l: '', hex: '#888888' })} className="flex h-8 items-center gap-1 rounded-full border border-dashed border-line px-2.5 text-12 text-t2 hover:border-brand/50"><Plus size={12} />مقدار تازه</button></div></div>) })}
      <div className="flex flex-wrap gap-1.5">{d.axes.filter((a) => !(a.id in v)).map((a) => <Button key={a.id} size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setV({ ...v, [a.id]: a.values[0]?.v ?? '' })}>{a.name}</Button>)}<Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setNewAx({ name: '', kind: 'text' })}>ویژگی دلخواه (مثلا بافت یا ظرفیت باتری)</Button></div>
      {siblings.length > 0 && <div className="rounded-lg bg-neutral-bg p-2.5"><p className="mb-1.5 text-11 text-t2">پیش‌نمایش در صفحهٔ کالا: مشتری بین تنوع‌ها جابه‌جا می‌شود</p>
        <div className="flex flex-wrap gap-1.5">{siblings.map((s) => { const c = s.pdp?.variant?.color; const hex = c ? d.axes.find((a) => a.id === 'color')?.values.find((x) => x.v === c)?.hex : undefined; const me = s.id === selfId; return <button key={s.id} type="button" onClick={() => !me && nav(`/admin/catalog/${s.id}/edit?step=4`)} className={cx('flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-12', me ? 'border-brand bg-surface ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50')}>{hex && <span className="size-5 rounded-full ring-1 ring-black/15" style={{ background: hex }} />}{s.pdp?.variantLabel || s.title}{me && <span className="text-[10px] text-brand">(همین)</span>}</button> })}</div></div>}
      <Modal open={!!newVal} onClose={() => setNewVal(null)} title="مقدار تازه" footer={<Button variant="primary" onClick={() => { if (!newVal?.l.trim()) return; const id = `x${Date.now().toString(36)}`; mutate((x) => { x.axes.find((a) => a.id === newVal.ax)!.values.push({ v: id, l: newVal.l.trim(), hex: newVal.hex }) }, { action: 'افزودن مقدار تنوع', target: newVal.l }); setV({ ...v, [newVal.ax]: id }); setNewVal(null) }}>افزودن</Button>}>
        {newVal && <div className="flex items-end gap-2"><Field label="نام"><Input value={newVal.l} onChange={(e) => setNewVal({ ...newVal, l: e.target.value })} placeholder="مثلا سبز زیتونی" /></Field>{d.axes.find((a) => a.id === newVal.ax)?.kind === 'color' && <Field label="رنگ"><input type="color" value={newVal.hex} onChange={(e) => setNewVal({ ...newVal, hex: e.target.value })} className="h-10 w-16 cursor-pointer rounded-lg border border-line" aria-label="انتخاب رنگ" /></Field>}</div>}
      </Modal>
      <Modal open={!!newAx} onClose={() => setNewAx(null)} title="ویژگی تنوع تازه" footer={<Button variant="primary" onClick={() => { if (!newAx?.name.trim()) return; const id = `ax${Date.now().toString(36)}`; mutate((x) => { x.axes.push({ id, name: newAx.name.trim(), kind: newAx.kind, values: [] }) }, { action: 'ساخت ویژگی تنوع', target: newAx.name }); setNewAx(null); setNewVal({ ax: id, l: '', hex: '#888888' }); setV({ ...v, [id]: '' }) }}>ساخت</Button>}>
        {newAx && <div className="space-y-3"><Field label="نام ویژگی"><Input value={newAx.name} onChange={(e) => setNewAx({ ...newAx, name: e.target.value })} placeholder="مثلا بافت بند" /></Field><Field label="نوع نمایش"><Segmented value={newAx.kind} onChange={(k) => setNewAx({ ...newAx, kind: k })} options={[['text', 'متنی (دکمه)'], ['color', 'رنگی (دایرهٔ رنگ)']]} /></Field></div>}
      </Modal>
    </div>
  )
}
