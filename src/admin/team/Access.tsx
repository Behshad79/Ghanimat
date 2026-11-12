import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Eye, Minus, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { mutate, ROLES, setSession, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { Face, RoleDef } from '@/shared/data/roles'
import { NAV } from '../shell/nav'

const FACE: [Face, string][] = [['full', 'پنل کامل'], ['simple', 'حالت سادهٔ اپراتور'], ['partner', 'پرتال شریک']]
const GROUPS = [...new Set(NAV.map((n) => n.group))]
const label = (id: string) => NAV.find((n) => n.id === id)?.label ?? id
const roleHas = (r: RoleDef | undefined, m: string) => !!r && (r.modules === '*' || r.modules.includes(m))

/** فهرست ماژول‌ها به تفکیک گروه با تیک؛ برای نقش و برای دسترسی اختصاصی هر فرد */
function ModulePicker({ value, onToggle, base, disabled }: { value: (m: string) => boolean; onToggle: (m: string, on: boolean) => void; base?: (m: string) => boolean; disabled?: boolean }) {
  const [q, setQ] = useState('')
  return (
    <div>
      <Input placeholder="جست‌وجوی ماژول" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" aria-label="جست‌وجوی ماژول" />
      <div className="max-h-[52vh] space-y-3 overflow-y-auto pl-1">
        {GROUPS.map((g) => { const items = NAV.filter((n) => n.group === g && (!q || n.label.includes(q))); if (!items.length) return null; return (
          <div key={g}><p className="mb-1 text-11 font-semibold text-t2">{g}</p>
            <ul className="grid gap-1 sm:grid-cols-2">{items.map((n) => { const on = value(n.id); const diff = base && base(n.id) !== on; return (
              <li key={n.id}><label className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-12', on ? 'border-brand/40 bg-brand-tint' : 'border-line', disabled && 'cursor-not-allowed opacity-60')}>
                <input type="checkbox" className="accent-[#0000ff]" checked={on} disabled={disabled} onChange={(e) => onToggle(n.id, e.target.checked)} /><span className="flex-1">{n.label}</span>
                {diff && <Badge tone={on ? 'success' : 'danger'} dot={false}>{on ? 'افزوده برای این فرد' : 'گرفته‌شده از این فرد'}</Badge>}
              </label></li>) })}</ul>
          </div>) })}
      </div>
    </div>
  )
}

/** نقش‌ها و ماتریس دسترسی: ساخت نقش تازه، کپی نقش، تغییر نام، حذف و روشن و خاموش کردن هر خانهٔ ماتریس */
export function RolesMatrix() {
  const d = useDB(); const nav = useNavigate(); const roles = d.roleDefs
  const [edit, setEdit] = useState<{ key: string | null; label: string; face: Face; desc: string; from: string; home: string } | null>(null)
  const count = (k: string) => d.team.filter((u) => u.role === k).length
  const toggle = (k: string, m: string) => {
    const r = roles[k]; if (r.modules === '*') return toast('مدیر کل به همهٔ ماژول‌ها دسترسی دارد و قابل محدود کردن نیست.', { tone: 'err' })
    const on = r.modules.includes(m)
    mutate((x) => { const rr = x.roleDefs[k]; if (rr.modules === '*') return; rr.modules = on ? rr.modules.filter((y) => y !== m) : [...rr.modules, m] }, { action: on ? 'گرفتن دسترسی از نقش' : 'دادن دسترسی به نقش', target: `${r.label} · ${label(m)}`, before: on ? 'دارد' : 'ندارد', after: on ? 'ندارد' : 'دارد' })
    toast(`${label(m)} برای نقش «${r.label}» ${on ? 'بسته شد' : 'باز شد'}. ${fa(count(k))} عضو با این نقش از همین لحظه تغییر را می‌بینند.`)
  }
  const save = () => {
    if (!edit) return; if (!edit.label.trim()) return toast('نام نقش را بنویسید.', { tone: 'err' })
    if (edit.key) { mutate((x) => { Object.assign(x.roleDefs[edit.key!], { label: edit.label, desc: edit.desc, face: edit.face, home: edit.home }) }, { action: 'ویرایش نقش', target: edit.label }); toast('نقش ذخیره شد.') }
    else { const key = `r${Date.now().toString(36)}`; const src = roles[edit.from]; mutate((x) => { x.roleDefs[key] = { label: edit.label, face: edit.face, desc: edit.desc, modules: src ? (src.modules === '*' ? NAV.map((n) => n.id) : [...src.modules]) : ['home'], home: edit.home || src?.home || '/admin', opens: edit.desc || 'نقش سفارشی', custom: true } }, { action: 'ساخت نقش تازه', target: edit.label }); toast(`نقش «${edit.label}» ساخته شد. حالا در ماتریس، دسترسی‌هایش را تیک بزنید.`) }
    setEdit(null)
  }
  const remove = async (k: string) => {
    if (count(k)) return toast(`${fa(count(k))} عضو این نقش را دارند. اول نقش آن‌ها را عوض کنید.`, { tone: 'err' })
    const why = await askReason({ kind: 'cancel', ref: roles[k].label, status: 'حذف نقش', title: `دلیل حذف نقش «${roles[k].label}»` }); if (!why) return
    mutate((x) => { delete x.roleDefs[k] }, { action: 'حذف نقش', target: roles[k].label, after: why }); toast('نقش حذف شد.')
  }
  const full = Object.entries(roles).filter(([, r]) => r.face === 'full')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-12 text-t2">روی هر خانهٔ ماتریس بزنید تا آن ماژول برای آن نقش باز یا بسته شود. تغییرها فوری اعمال و در لاگ ممیزی ثبت می‌شوند.</p>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setEdit({ key: null, label: '', face: 'full', desc: '', from: 'support', home: '' })}>ساخت نقش تازه</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(roles).map(([k, r]) => (
        <Card key={k} className="!p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="flex items-center gap-1.5 text-13 font-semibold">{r.label}{r.custom && <Badge tone="brand" dot={false}>سفارشی</Badge>}</p><p className="mt-0.5 text-11 text-t2">{FACE.find((f) => f[0] === r.face)?.[1]} · {fa(count(k))} عضو · {r.modules === '*' ? 'همهٔ ماژول‌ها' : `${fa(r.modules.length)} ماژول`}</p></div>
          <span className="flex shrink-0 gap-0.5">
            <button type="button" aria-label={`ویرایش نقش ${r.label}`} onClick={() => setEdit({ key: k, label: r.label, face: r.face, desc: r.desc ?? r.opens, from: '', home: r.home })} className="grid size-7 place-items-center rounded-md text-t2 hover:bg-neutral-bg"><Pencil size={13} /></button>
            <button type="button" aria-label={`کپی نقش ${r.label}`} onClick={() => setEdit({ key: null, label: `${r.label} (کپی)`, face: r.face, desc: r.desc ?? r.opens, from: k, home: r.home })} className="grid size-7 place-items-center rounded-md text-t2 hover:bg-neutral-bg"><Copy size={13} /></button>
            {k !== 'super' && <button type="button" aria-label={`حذف نقش ${r.label}`} onClick={() => void remove(k)} className="grid size-7 place-items-center rounded-md text-t2 hover:bg-danger-bg hover:text-danger"><Trash2 size={13} /></button>}
          </span></div></Card>))}</div>
      <Card title="ماتریس نقش × ماژول" pad={false}><div className="overflow-x-auto"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2"><th className="sticky right-0 z-10 bg-surface-2 p-2 text-right font-medium">ماژول</th>{full.map(([k, r]) => <th key={k} className="p-2 font-medium whitespace-nowrap"><button className="hover:text-brand" title="پیش‌نمایش پنل از دید این نقش" onClick={() => { setSession({ viewAs: k === 'super' ? null : k }); nav(r.home) }}>{r.label}<Eye size={11} className="mr-1 inline" /></button></th>)}</tr></thead>
        <tbody>{NAV.map((n) => <tr key={n.id} className="border-t border-line"><td className="sticky right-0 z-10 bg-surface p-2">{n.label}</td>{full.map(([k, r]) => { const on = roleHas(r, n.id); return <td key={k} className="p-1 text-center"><button type="button" aria-pressed={on} aria-label={`${n.label} برای ${r.label}: ${on ? 'دارد' : 'ندارد'}`} onClick={() => toggle(k, n.id)} className={cx('mx-auto grid size-7 place-items-center rounded-md transition-colors', on ? 'bg-success-bg text-success hover:bg-danger-bg hover:text-danger' : 'text-t3 hover:bg-success-bg hover:text-success', r.modules === '*' && 'cursor-not-allowed')}>{on ? <Check size={14} /> : <Minus size={14} />}</button></td> })}</tr>)}</tbody></table></div></Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.key ? 'ویرایش نقش' : 'ساخت نقش تازه'} footer={<><Button variant="primary" onClick={save}>{edit?.key ? 'ذخیره' : 'ساخت نقش'}</Button><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button></>}>
        {edit && <div className="space-y-3">
          <Field label="نام نقش"><Input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="مثلاً کارشناس محتوا" /></Field>
          {!edit.key && <Field label="دسترسی‌های اولیه را از این نقش کپی کن" help="بعد از ساخت، در ماتریس هر خانه را جدا تغییر دهید."><Select value={edit.from} onChange={(v) => setEdit({ ...edit, from: v })} options={[['', 'از صفر (فقط خانه)'], ...Object.entries(roles).map(([k, r]) => [k, r.label] as [string, string])]} /></Field>}
          <Field label="نوع پنل"><Segmented value={edit.face} onChange={(v) => setEdit({ ...edit, face: v })} options={FACE} /></Field>
          <Field label="صفحهٔ شروع"><Select value={edit.home} onChange={(v) => setEdit({ ...edit, home: v })} options={NAV.map((n) => [n.path, n.label] as [string, string])} /></Field>
          <Field label="توضیح برای تیم"><Textarea rows={2} value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></Field>
        </div>}
      </Modal>
    </div>
  )
}

/** دسترسی اختصاصی یک عضو: تغییر نقش، افزودن یا گرفتن ماژول نسبت به نقش، فعال و غیرفعال کردن */
export function MemberAccess({ uid }: { uid: string }) {
  const d = useDB(); const u = d.team.find((x) => x.id === uid)!; const r = d.roleDefs[u.role]; const ov = d.access[uid] ?? { add: [], remove: [] }
  const has = (m: string) => (ov.remove.includes(m) ? false : ov.add.includes(m) ? true : roleHas(r, m))
  const toggle = (m: string, on: boolean) => mutate((x) => {
    const o = (x.access[uid] ??= { add: [], remove: [] }); o.add = o.add.filter((y) => y !== m); o.remove = o.remove.filter((y) => y !== m)
    if (on !== roleHas(x.roleDefs[u.role], m)) (on ? o.add : o.remove).push(m)
  }, { action: on ? 'دادن دسترسی اختصاصی' : 'گرفتن دسترسی اختصاصی', target: `${u.name} · ${label(m)}` })
  const changes = ov.add.length + ov.remove.length
  const off = u.status === 'غیرفعال'
  return (
    <div className="space-y-4">
      <Card className="!p-3">
        <Field label="نقش" help="با تغییر نقش، دسترسی‌های اختصاصی این فرد سر جایشان می‌مانند.">
          <Select value={u.role} onChange={async (v) => { if (v === u.role) return; mutate((x) => { x.team.find((y) => y.id === uid)!.role = v }, { action: 'تغییر نقش عضو', target: u.name, before: r?.label, after: d.roleDefs[v]?.label }); toast(`نقش ${u.name} به «${d.roleDefs[v]?.label}» تغییر کرد و با اعلان خبردار شد.`) }} options={Object.entries(d.roleDefs).map(([k, x]) => [k, x.label] as [string, string])} />
        </Field>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-12">
          <Toggle on={!off} onChange={async (v) => { if (!v) { const why = await askReason({ kind: 'cancel', ref: u.name, status: 'غیرفعال کردن عضو', title: `دلیل غیرفعال کردن ${u.name}` }); if (!why) return } mutate((x) => { x.team.find((y) => y.id === uid)!.status = v ? 'آفلاین' : 'غیرفعال' }, { action: v ? 'فعال کردن عضو' : 'غیرفعال کردن عضو', target: u.name }); toast(v ? `${u.name} دوباره می‌تواند وارد شود.` : `ورود ${u.name} بسته شد و نشست‌های بازش بسته شدند.`) }} text="حساب فعال است" />
          <Toggle on={u.twoFA} onChange={(v) => mutate((x) => { x.team.find((y) => y.id === uid)!.twoFA = v }, { action: v ? 'اجباری کردن ورود دومرحله‌ای' : 'برداشتن ورود دومرحله‌ای', target: u.name })} text="ورود دومرحله‌ای اجباری" />
        </div>
      </Card>
      {r?.face === 'full' && <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><ShieldCheck size={15} />ماژول‌هایی که {u.name} می‌بیند</p>{changes > 0 ? <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={() => mutate((x) => { delete x.access[uid] }, { action: 'برگرداندن دسترسی به نقش', target: u.name })}>برگرداندن به دسترسی نقش ({fa(changes)} تغییر)</Button> : <Badge dot={false}>عین نقش «{r.label}»</Badge>}</div>
        <ModulePicker value={has} onToggle={toggle} base={(m) => roleHas(r, m)} disabled={r.modules === '*'} />
      </div>}
    </div>
  )
}

/** افزودن عضو تازه با نقش، و در صورت نیاز دسترسی متفاوت از همان ابتدا */
export function InviteMember({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const [f, setF] = useState({ name: '', phone: '', role: 'support', twoFA: true }); const [custom, setCustom] = useState(false); const [mods, setMods] = useState<string[] | null>(null)
  const r = d.roleDefs[f.role]; const base = useMemo(() => NAV.filter((n) => roleHas(r, n.id)).map((n) => n.id), [r])
  const cur = mods ?? base
  const send = () => {
    if (!f.name.trim()) return toast('نام عضو را بنویسید.', { tone: 'err' }); if (!/^09\d{9}$/.test(f.phone)) return toast('موبایل را درست وارد کنید؛ مثلاً 09121234567.', { tone: 'err' })
    const id = `u${Date.now().toString(36)}`
    mutate((x) => { x.team.push({ id, name: f.name, role: f.role, phone: f.phone, status: 'دعوت‌شده', twoFA: f.twoFA }); if (custom && mods) x.access[id] = { add: mods.filter((m) => !base.includes(m)), remove: base.filter((m) => !mods.includes(m)) } }, { action: 'دعوت عضو تیم', target: `${f.name} · ${r?.label}` })
    toast(`دعوت‌نامه برای ${f.name} با پیامک ارسال شد و ۴۸ ساعت اعتبار دارد.`); setF({ name: '', phone: '', role: 'support', twoFA: true }); setCustom(false); setMods(null); onClose()
  }
  return (
    <Modal wide open={open} onClose={onClose} title={<span className="flex items-center gap-2"><UserPlus size={16} />افزودن عضو تیم</span>} footer={<><Button variant="primary" onClick={send}>ارسال دعوت‌نامه</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="نام و نام خانوادگی"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="موبایل"><Input className="ltr text-left font-mono" placeholder="09121234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></Field></div>
        <Field label="نقش"><Select value={f.role} onChange={(v) => { setF({ ...f, role: v }); setMods(null) }} options={Object.entries(d.roleDefs).map(([k, x]) => [k, `${x.label} · ${x.modules === '*' ? 'همهٔ ماژول‌ها' : `${fa(x.modules.length)} ماژول`}`] as [string, string])} /></Field>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-12"><Toggle on={f.twoFA} onChange={(v) => setF({ ...f, twoFA: v })} text="ورود دومرحله‌ای اجباری" />{r?.face === 'full' && r.modules !== '*' && <Toggle on={custom} onChange={(v) => { setCustom(v); if (!v) setMods(null) }} text="از همان اول دسترسی متفاوت با نقش بده" />}</div>
        {custom && <ModulePicker value={(m) => cur.includes(m)} onToggle={(m, on) => setMods(on ? [...cur, m] : cur.filter((x) => x !== m))} base={(m) => base.includes(m)} />}
      </div>
    </Modal>
  )
}
