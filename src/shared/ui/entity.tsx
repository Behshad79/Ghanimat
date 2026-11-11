import { useState, type ReactNode } from 'react'
import { Archive, ArchiveRestore, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Field, Input, Select, Textarea, Toggle } from './base'
import { DataTable, type Col } from './table'
import { confirm, Drawer, toast } from './overlay'
import { mutate, snapshot, useDB } from '../lib/store'
import type { Rec } from '../data/entities'
import { fa, num, toman } from '../lib/fa'
import type { MenuItem } from './menu'

export type EField = {
  k: string; label: string; type?: 'text' | 'textarea' | 'number' | 'money' | 'select' | 'toggle' | 'date'
  options?: (string | [string, string])[]; required?: boolean; ltr?: boolean; help?: string; table?: boolean; def?: any
  render?: (r: Rec) => ReactNode
  form?: false
}
const showVal = (f: EField, v: any): ReactNode => {
  if (f.render) return null
  if (f.type === 'toggle') return <Badge tone={v ? 'success' : 'neutral'}>{v ? 'فعال' : 'غیرفعال'}</Badge>
  if (f.type === 'money') return <span className="tnum">{toman(Number(v) || 0)}</span>
  if (f.type === 'number') return <span className="tnum">{fa(v ?? 0)}</span>
  if (f.type === 'date' && v) return <span className="tnum">{new Date(v).toLocaleDateString('fa-IR')}</span>
  return <span className="block max-w-80 truncate">{String(v ?? '—') || '—'}</span>
}
const newId = (ek: string) => `${ek.slice(0, 3)}-${Date.now().toString(36).slice(-5)}`

/** حذف نرم: رکورد به سطل بازیافت می‌رود و با «بازگردانی» برمی‌گردد */
export function softDelete(kind: string, ek: string, items: Rec[], label: (r: Rec) => string) {
  const undo = snapshot()
  mutate((x) => {
    x.entities[ek] = (x.entities[ek] ?? []).filter((r) => !items.some((i) => i.id === r.id))
    items.forEach((i) => x.trash.unshift({ id: `tr-${i.id}-${Date.now()}`, kind, ek, label: label(i), data: i, at: new Date().toISOString() }))
  }, { action: 'انتقال به سطل بازیافت', target: items.map(label).join('، ') })
  toast(items.length === 1 ? `«${label(items[0])}» به سطل بازیافت رفت.` : `${fa(items.length)} مورد به سطل بازیافت رفت.`, { undo })
}

/** مدیریت کامل یک موجودیت: افزودن، ویرایش، کپی، بایگانی، حذف نرم و گروهی. */
export function EntityManager({ ek, kind, fields, titleKey = 'name', blockDelete, extraActions, toolbar, emptyDesc, onOpen }: {
  ek: string; kind: string; fields: EField[]; titleKey?: string; blockDelete?: (r: Rec) => string | null
  extraActions?: (r: Rec) => MenuItem[]; toolbar?: ReactNode; emptyDesc?: string; onOpen?: (r: Rec) => void
}) {
  const d = useDB(); const rows = d.entities[ek] ?? []
  const [edit, setEdit] = useState<Rec | null>(null); const [isNew, setIsNew] = useState(false); const [err, setErr] = useState<Record<string, string>>({})
  const activeKey = fields.find((f) => f.type === 'toggle' && (f.k === 'active'))?.k
  const label = (r: Rec) => String(r[titleKey] ?? r.id)
  const open = (r?: Rec) => { setErr({}); if (r) { setIsNew(false); setEdit({ ...r }) } else { setIsNew(true); setEdit(Object.fromEntries([['id', newId(ek)], ...fields.map((f) => [f.k, f.def ?? (f.type === 'toggle' ? true : f.type === 'number' || f.type === 'money' ? 0 : '')])]) as Rec) } }
  const save = () => {
    if (!edit) return
    const e: Record<string, string> = {}
    fields.filter((f) => f.form !== false).forEach((f) => { if (f.required && (edit[f.k] === '' || edit[f.k] == null)) e[f.k] = `${f.label} را وارد کنید.` })
    setErr(e); if (Object.keys(e).length) return
    const undo = snapshot()
    mutate((x) => { const list = (x.entities[ek] ??= []); const i = list.findIndex((r) => r.id === edit.id); if (i >= 0) list[i] = edit; else list.unshift(edit) }, { action: isNew ? `افزودن ${kind}` : `ویرایش ${kind}`, target: label(edit) })
    toast(isNew ? `${kind} «${label(edit)}» اضافه شد.` : `تغییرهای «${label(edit)}» ذخیره شد.`, { undo }); setEdit(null)
  }
  const del = async (items: Rec[]) => {
    const blocked = items.map((r) => [r, blockDelete?.(r)] as const).filter(([, m]) => m)
    if (blocked.length) return toast(blocked[0][1]!, { tone: 'err' })
    if (items.length > 1 && !(await confirm({ title: `${fa(items.length)} ${kind} به سطل بازیافت برود؟`, body: 'تا ۳۰ روز از سطل بازیافت قابل بازگردانی است.', confirm: `انتقال ${fa(items.length)} مورد به سطل بازیافت`, danger: true }))) return
    softDelete(kind, ek, items, label)
  }
  const dup = (r: Rec) => { const c = { ...r, id: newId(ek), [titleKey]: `${label(r)} (کپی)` }; mutate((x) => { x.entities[ek].unshift(c) }, { action: `کپی ${kind}`, target: label(r) }); toast(`از «${label(r)}» یک کپی ساخته شد.`, { undo: () => mutate((x) => { x.entities[ek] = x.entities[ek].filter((i) => i.id !== c.id) }) }) }
  const toggleActive = (r: Rec) => { if (!activeKey) return; const undo = snapshot(); mutate((x) => { const t = x.entities[ek].find((i) => i.id === r.id)!; t[activeKey] = !t[activeKey] }, { action: r[activeKey] ? `بایگانی ${kind}` : `فعال‌سازی ${kind}`, target: label(r) }); toast(r[activeKey] ? `«${label(r)}» غیرفعال شد.` : `«${label(r)}» فعال شد.`, { undo }) }
  const cols: Col<Rec>[] = fields.filter((f) => f.table !== false).map((f) => ({ key: f.k, title: f.label, render: (r) => f.render ? f.render(r) : showVal(f, r[f.k]), sort: (r) => r[f.k] ?? '', text: (r) => String(r[f.k] ?? ''), align: f.type === 'money' || f.type === 'number' ? 'left' : undefined, wrap: f.type === 'textarea' }))
  return (
    <>
      <DataTable name={kind} rows={rows} cols={cols} rowKey={(r) => r.id} onRow={(r) => (onOpen ? onOpen(r) : open(r))}
        search={(r) => fields.map((f) => r[f.k]).join(' ')}
        filters={<>{toolbar}<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => open()}>افزودن {kind}</Button></>}
        empty={{ title: `هنوز ${kind}ی ثبت نشده است.`, desc: emptyDesc, action: <Button variant="primary" icon={<Plus size={14} />} onClick={() => open()}>افزودن {kind}</Button> }}
        actions={(r) => [
          { label: 'ویرایش', icon: <Pencil size={14} />, onClick: () => open(r) },
          { label: 'کپی‌کردن', icon: <Copy size={14} />, onClick: () => dup(r) },
          ...(activeKey ? [{ label: r[activeKey] ? 'بایگانی (غیرفعال)' : 'فعال‌سازی', icon: r[activeKey] ? <Archive size={14} /> : <ArchiveRestore size={14} />, onClick: () => toggleActive(r) }] : []),
          ...(extraActions?.(r) ?? []), 'sep',
          { label: 'انتقال به سطل بازیافت', icon: <Trash2 size={14} />, danger: true, onClick: () => del([r]) },
        ]}
        bulk={(ids, clear) => <>
          {activeKey && <Button size="sm" onClick={() => { mutate((x) => x.entities[ek].filter((r) => ids.includes(r.id)).forEach((r) => (r[activeKey] = false)), { action: `بایگانی گروهی ${kind}`, target: `${ids.length} مورد` }); toast(`${fa(ids.length)} مورد غیرفعال شد.`); clear() }}>بایگانی {fa(ids.length)} مورد</Button>}
          <Button size="sm" variant="danger" onClick={() => { del(rows.filter((r) => ids.includes(r.id))); clear() }}>حذف {fa(ids.length)} مورد</Button>
        </>} />
      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? `افزودن ${kind}` : `ویرایش ${kind}: ${edit ? label(edit) : ''}`}
        footer={<><Button variant="primary" onClick={save}>{isNew ? `افزودن ${kind}` : 'ذخیرهٔ تغییرها'}</Button><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button>{!isNew && edit && <Button variant="danger" className="mr-auto" icon={<Trash2 size={14} />} onClick={() => { del([edit]); setEdit(null) }}>حذف</Button>}</>}>
        {edit && <div className="space-y-4">
          {fields.filter((f) => f.form !== false).map((f) => (
            <Field key={f.k} label={f.label + (f.required ? ' *' : '')} help={f.help} error={err[f.k]}>
              {f.type === 'textarea' ? <Textarea rows={4} value={edit[f.k] ?? ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />
                : f.type === 'select' ? <Select value={String(edit[f.k] ?? '')} onChange={(v) => setEdit({ ...edit, [f.k]: v })} options={f.options ?? []} />
                : f.type === 'toggle' ? <div className="flex h-9 items-center gap-2"><Toggle on={!!edit[f.k]} label={f.label} onChange={(v) => setEdit({ ...edit, [f.k]: v })} /><span className="text-12 text-t2">{edit[f.k] ? 'روشن' : 'خاموش'}</span></div>
                : f.type === 'money' ? <Input className="ltr text-left font-mono" inputMode="numeric" value={num(Number(edit[f.k]) || 0).replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٬/g, ',')} onChange={(e) => setEdit({ ...edit, [f.k]: Number(e.target.value.replace(/\D/g, '')) })} />
                : <Input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} className={f.ltr || f.type === 'number' || f.type === 'date' ? 'ltr text-left font-mono' : ''} value={edit[f.k] ?? ''} onChange={(e) => setEdit({ ...edit, [f.k]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />}
            </Field>
          ))}
        </div>}
      </Drawer>
    </>
  )
}
