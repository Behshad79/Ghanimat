import { useState } from 'react'
import { MoneyInput } from '@/shared/ui/money'
import { Ban, Pencil, Play, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, getDB, mutate, ROLES, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import type { Party } from '@/shared/data/stock'
import { syncQty } from '@/shared/data/ledger'
import { PartyChip } from './common'

const COLORS = ['#b45309', '#7c3aed', '#0e7490', '#be185d', '#4d7c0f', '#c2410c']
type Member = DB['team'][number] & { disabled?: boolean }
const far = () => new Date(Date.now() + 3650 * 864e5).toISOString()

/** اثر غیرفعال‌سازی یک شریک: چه موجودی‌ای از سایت می‌رود، کدام انبار بسته می‌شود، کدام سفارش باز می‌ماند */
function impact(d: DB, pid: string) {
  const lots = d.stock.lots.filter((l) => l.owner === pid && l.qty > 0)
  const whs = d.stock.warehouses.filter((w) => w.operator === pid && w.active)
  const products = [...new Set(lots.map((l) => l.productId))]
  const outAll = products.filter((p) => !d.stock.lots.some((l) => l.productId === p && l.owner !== pid && l.qty > 0 && !whs.some((w) => w.id === l.warehouse)))
  const open = d.orders.flatMap((o) => o.shipments.filter((s) => whs.some((w) => w.id === s.warehouse) && ['ship.pending', 'ship.picking', 'ship.packed', 'ship.partner_confirm'].includes(s.status)).map((s) => ({ o, s })))
  return { units: lots.reduce((a, l) => a + l.qty, 0), products, outAll, whs, open }
}

export function PartyManager() {
  const d = useDB(); const s = d.stock
  const [edit, setEdit] = useState<Party | null>(null); const [off, setOff] = useState<Party | null>(null); const [add, setAdd] = useState(false)
  const user = (p: Party) => d.team.find((u) => u.id === p.userId) as Member | undefined
  const canDelete = (p: Party) => p.kind !== 'self' && !s.lots.some((l) => l.owner === p.id) && !s.sales.some((x) => x.owner === p.id) && !s.settlements.some((t) => t.from === p.id || t.to === p.id)
  const del = (p: Party) => { if (!canDelete(p)) return toast('این شریک موجودی، فروش یا تسویهٔ ثبت‌شده دارد و برای حفظ سوابق حذف نمی‌شود؛ غیرفعالش کنید.', { tone: 'err' }); mutate((x) => { x.stock.parties = x.stock.parties.filter((y) => y.id !== p.id); x.stock.agreements = x.stock.agreements.filter((a) => a.owner !== p.id && a.seller !== p.id) }, { action: 'حذف شریک', target: p.name }); toast(`«${p.name}» حذف شد.`) }
  const on = (p: Party) => mutate((x) => { const q = x.stock.parties.find((y) => y.id === p.id)!; q.active = true; q.offAt = undefined; q.offWhy = undefined; q.offBy = undefined
    x.stock.warehouses.filter((w) => w.operator === p.id).forEach((w) => { w.active = true; if (x.network?.pausedBranches) delete x.network.pausedBranches[w.id] })
    const u = x.team.find((y) => y.id === p.userId) as Member | undefined; if (u) { u.disabled = false; if (u.status === 'غیرفعال') u.status = 'آفلاین' }
    new Set(x.stock.lots.filter((l) => l.owner === p.id).map((l) => l.productId)).forEach((pid) => syncQty(x, pid)) }, { action: 'فعال‌سازی دوبارهٔ شریک', target: p.name, after: 'موجودی و انبار برگشت' })
  return <Card title={<span className="flex items-center gap-1.5"><Users size={15} />شرکا و تأمین‌کنندگان</span>} hint="هر شریک یک پیشوند کد (۲ تا ۴ حرف لاتین)، یک حساب کاربری و انبار شهر خودش را دارد. افزودن، ویرایش، غیرفعال‌سازی و حذف همه از همین‌جاست." actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setAdd(true)}>پیوستن شریک تازه</Button>}>
    <ul className="space-y-2">{s.parties.map((p) => { const u = user(p); const lots = s.lots.filter((l) => l.owner === p.id).reduce((a, l) => a + l.qty, 0); return (
      <li key={p.id} className={p.active ? 'rounded-xl border border-line p-3' : 'rounded-xl border border-dashed border-danger/40 bg-danger-bg/30 p-3'}>
        <div className="flex flex-wrap items-center gap-2"><PartyChip s={s} id={p.id} /><span className="text-12 text-t2">{p.kind === 'self' ? 'خودمان' : p.account === 'portal' ? 'پرتال جداگانه (به‌زودی)' : 'جزئی از غنیمت'}{p.city ? ` · ${p.city}` : ''}{p.site ? ` · سایت ${p.site}` : ''}</span>{!p.active && <Badge tone="danger">غیرفعال</Badge>}<span className="flex-1" />
          <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => setEdit(p)}>ویرایش</Button>
          {p.kind !== 'self' && (p.active ? <Button size="sm" variant="ghost" icon={<Ban size={13} />} onClick={() => setOff(p)}>غیرفعال‌سازی</Button> : <Button size="sm" icon={<Play size={13} />} onClick={() => on(p)}>فعال‌سازی دوباره</Button>)}
          {p.kind !== 'self' && <Button size="sm" variant="ghost" aria-label={`حذف ${p.name}`} title={canDelete(p) ? 'حذف' : 'سوابق دارد؛ فقط غیرفعال می‌شود'} icon={<Trash2 size={13} />} onClick={() => del(p)} />}
        </div>
        <p className="mt-1.5 text-11 text-t2">{fa(lots)} عدد موجودی · انبارها: {s.warehouses.filter((w) => w.operator === p.id).map((w) => w.name).join('، ') || '—'} · حساب: {u ? `${u.name} (${ROLES[u.role]?.label ?? u.role})${u.disabled ? ' · ورود بسته' : ''}` : 'ندارد'}</p>
        {!p.active && p.offWhy && <p className="mt-1 text-11 text-danger">غیرفعال از {p.offAt ? new Date(p.offAt).toLocaleDateString('fa-IR') : '—'} توسط {p.offBy}: {p.offWhy}</p>}
      </li>) })}</ul>
    <PartyEdit p={edit} onClose={() => setEdit(null)} />
    <PartyOff p={off} onClose={() => setOff(null)} />
    <PartyJoin open={add} onClose={() => setAdd(false)} />
  </Card>
}

function PartyEdit({ p, onClose }: { p: Party | null; onClose: () => void }) {
  const d = useDB(); const [f, setF] = useState<Party | null>(null)
  const cur = f && p && f.id === p.id ? f : p
  if (!p || !cur) return null
  const locked = d.stock.lots.some((l) => l.owner === p.id) || d.stock.codes.some((c) => c.owner === p.id)
  const set = (x: Partial<Party>) => setF({ ...cur, ...x })
  const save = () => { if (!cur.name.trim()) return toast('نام شریک را بنویسید.', { tone: 'err' }); mutate((x) => { const i = x.stock.parties.findIndex((y) => y.id === p.id); x.stock.parties[i] = { ...cur, name: cur.name.trim(), prefix: cur.prefix.toUpperCase() } }, { action: 'ویرایش شریک', target: cur.name, before: `${p.name} · ${p.prefix}`, after: `${cur.name} · ${cur.prefix}` }); toast('اطلاعات شریک ذخیره شد.'); setF(null); onClose() }
  return <Modal open onClose={() => { setF(null); onClose() }} title={`ویرایش ${p.name}`} wide footer={<><Button onClick={() => { setF(null); onClose() }}>انصراف</Button><Button variant="primary" onClick={save}>ذخیره</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="نام"><Input value={cur.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field label="پیشوند کد" help={locked ? 'کالا یا بارکد با این پیشوند ثبت شده؛ برای خوانا ماندن برچسب‌های چاپ‌شده قابل تغییر نیست.' : '۲ تا ۴ حرف لاتین'}><Input className="ltr text-left font-mono uppercase" disabled={locked} value={cur.prefix} onChange={(e) => set({ prefix: e.target.value.toUpperCase().slice(0, 4) })} /></Field>
      <Field label="شهر"><Input value={cur.city ?? ''} onChange={(e) => set({ city: e.target.value })} /></Field>
      <Field label="موبایل"><Input className="ltr text-left font-mono" value={cur.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
      <Field label="سایت خودش (اختیاری)"><Input className="ltr text-left" value={cur.site ?? ''} onChange={(e) => set({ site: e.target.value })} /></Field>
      <Field label="حساب کاربری متصل"><Select value={cur.userId ?? ''} onChange={(v) => set({ userId: v || undefined })} options={[['', 'بدون حساب'], ...d.team.map((u) => [u.id, `${u.name} · ${ROLES[u.role]?.label ?? u.role}`] as [string, string])]} /></Field>
      {cur.kind !== 'self' && <Field label="نوع همکاری"><Segmented value={cur.account ?? 'internal'} onChange={(v) => set({ account: v })} options={[['internal', 'جزئی از غنیمت (پنل مشترک)'], ['portal', 'پرتال جداگانه (به‌زودی)']]} /></Field>}
      <Field label="رنگ"><div className="flex gap-1.5">{[cur.color, ...COLORS].filter((c, i, a) => a.indexOf(c) === i).map((c) => <button key={c} type="button" aria-label={`رنگ ${c}`} onClick={() => set({ color: c })} className="size-8 rounded-full border-2" style={{ background: c, borderColor: cur.color === c ? '#000' : 'transparent' }} />)}</div></Field>
      {cur.kind !== 'self' && <div className="grid gap-3 rounded-xl border border-line p-3 sm:col-span-2 sm:grid-cols-3">
        <p className="text-12 font-semibold sm:col-span-3">شرایط پرداخت به این شریک</p>
        <Field label="دورهٔ تسویه"><Segmented value={cur.payout?.cycle ?? 'weekly'} onChange={(v) => set({ payout: { holdDays: 7, ...cur.payout, cycle: v } })} options={[['weekly', 'هفتگی'], ['biweekly', 'دوهفتگی'], ['monthly', 'ماهانه']]} /></Field>
        <Field label="مهلت مرجوعی پیش از پرداخت (روز)" help="پول فروش تا این مدت بعد از تحویل نگه داشته می‌شود"><Input type="number" min={0} className="ltr text-left font-mono" value={cur.payout?.holdDays ?? 0} onChange={(e) => set({ payout: { cycle: 'weekly', ...cur.payout, holdDays: Math.max(0, +e.target.value) } })} /></Field>
        <Field label="حداقل ماندگاری هنگام تحویل (روز)" help="برای کالای تاریخ‌دار؛ ورود با ماندگاری کمتر هشدار می‌دهد"><Input type="number" min={0} className="ltr text-left font-mono" value={cur.payout?.minShelfDays ?? 0} onChange={(e) => set({ payout: { cycle: 'weekly', holdDays: 7, ...cur.payout, minShelfDays: Math.max(0, +e.target.value) || undefined } })} /></Field>
      </div>}
      <div className="sm:col-span-2"><Field label="یادداشت"><Textarea rows={2} value={cur.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></Field></div>
    </div>
  </Modal>
}

function PartyOff({ p, onClose }: { p: Party | null; onClose: () => void }) {
  const d = useDB(); const [why, setWhy] = useState(''); const [orders, setOrders] = useState<'keep' | 'move'>('keep'); const [login, setLogin] = useState(true)
  if (!p) return null
  const im = impact(d, p.id); const u = d.team.find((x) => x.id === p.userId)
  const go = () => { if (!why.trim()) return toast('دلیل غیرفعال‌سازی را بنویسید؛ در سوابق می‌ماند.', { tone: 'err' })
    mutate((x) => { const q = x.stock.parties.find((y) => y.id === p.id)!; q.active = false; q.offAt = new Date().toISOString(); q.offBy = currentUser()?.name ?? 'پنل'; q.offWhy = why.trim()
      x.stock.warehouses.filter((w) => w.operator === p.id).forEach((w) => { w.active = false; if (x.network) { x.network.pausedBranches = { ...(x.network.pausedBranches ?? {}), [w.id]: { until: far(), reason: `غیرفعال‌سازی ${p.name}: ${why.trim()}`, at: new Date().toISOString(), by: q.offBy! } } } })
      if (orders === 'move') x.orders.forEach((o) => o.shipments.forEach((s) => { if (im.whs.some((w) => w.id === s.warehouse) && ['ship.pending', 'ship.picking', 'ship.partner_confirm'].includes(s.status)) { s.warehouse = 'tehran'; s.allocReason = `انتقال به انبار تهران پس از غیرفعال‌سازی ${p.name}` } }))
      if (login) { const m = x.team.find((y) => y.id === p.userId) as Member | undefined; if (m) { m.disabled = true; m.status = 'غیرفعال' } }
      new Set([...x.stock.lots.filter((l) => l.owner === p.id || im.whs.some((w) => w.id === l.warehouse)).map((l) => l.productId)]).forEach((pid) => syncQty(x, pid)) },
    { action: 'غیرفعال‌سازی شریک', target: p.name, before: 'فعال', after: `${why.trim()} · ${fa(im.units)} عدد از سایت خارج شد` })
    toast(`«${p.name}» غیرفعال شد؛ موجودی‌اش از سایت خارج و ارسال از ${im.whs.map((w) => w.name).join('، ') || 'انبارهایش'} متوقف شد. هر وقت بخواهید با «فعال‌سازی دوباره» برمی‌گردد.`); setWhy(''); onClose() }
  return <Modal open onClose={onClose} title={`غیرفعال‌سازی ${p.name}`} wide footer={<><Button onClick={onClose}>انصراف</Button><Button variant="danger" onClick={go}>غیرفعال‌سازی</Button></>}>
    <div className="space-y-3 text-13">
      <p>با غیرفعال‌سازی، هیچ سابقه‌ای پاک نمی‌شود و هر وقت بخواهید با یک کلیک برمی‌گردد. همین حالا این اتفاق‌ها می‌افتد:</p>
      <ul className="space-y-1.5 rounded-xl bg-neutral-bg p-3 text-12">
        <li>• <b>{fa(im.units)}</b> عدد موجودی او در <b>{fa(im.products.length)}</b> کالا از سایت خارج می‌شود.{im.outAll.length > 0 && <> این کالاها کاملاً ناموجود می‌شوند: {im.outAll.map((x) => d.products.find((q) => q.id === x)?.title ?? x).join('، ')}.</>}</li>
        <li>• انبار {im.whs.map((w) => w.name).join('، ') || '—'} بسته می‌شود و ارسال پیشتاز، تیپاکس و پیک از آن متوقف می‌شود.</li>
        <li>• {fa(im.open.length)} مرسولهٔ باز از این انبار هست.</li>
        <li>• مانده و صورت‌حساب او سر جایش می‌ماند تا تسویهٔ نهایی.</li>
      </ul>
      {im.open.length > 0 && <Field label="مرسوله‌های باز"><Segmented value={orders} onChange={setOrders} options={[['keep', 'همان‌جا بمانند تا ارسال شوند'], ['move', 'به انبار تهران منتقل شوند']]} /></Field>}
      {u && <Toggle on={login} onChange={setLogin} text={`ورود ${u.name} به پنل هم بسته شود`} />}
      <Field label="دلیل (در سوابق و لاگ ممیزی می‌ماند)"><Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="مثلاً پایان همکاری یا توقف موقت تا تسویه" /></Field>
    </div>
  </Modal>
}

/** پیوستن شریک تازه از شهر تازه: شریک، انبار، کانال‌ها، قرارداد سهم، حساب کاربری و موجودی اولیه در یک فرم */
function PartyJoin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB()
  const [f, setF] = useState({ name: '', prefix: '', city: '', phone: '', site: '', wh: true, whName: '', fee: 50000, store: true, own: false, sellPct: 30, buyPct: 25, account: true, role: 'cofounder', csv: '' })
  const s = d.stock; const pfx = f.prefix.toUpperCase(); const bad = !/^[A-Z]{2,4}$/.test(pfx) || s.parties.some((p) => p.prefix === pfx)
  const phoneBad = f.account && (!/^09\d{9}$/.test(f.phone) || d.team.some((u) => u.phone === f.phone))
  const rows = f.csv.split('\n').map((l) => l.split(/[,،\t]/).map((x) => x.trim())).filter((r) => r[0])
  const parsed = rows.map((r) => { const p = d.products.find((x) => x.code === r[0] || x.ean === r[0]); const v = p?.variations?.find((y) => y.suffix === r[1]); return { r, p, v, qty: Number(r[2]) || 0, cost: Number(r[3]) || p?.cost || 0 } })
  const ok = f.name.trim() && !bad && f.city.trim() && !phoneBad
  const save = () => { if (!ok) return
    const id = pfx.toLowerCase(); const uid = `u${Date.now().toString(36).slice(-4)}`; const at = new Date().toISOString(); const whId = `wh-${id}`
    mutate((x) => {
      x.stock.parties.push({ id, name: f.name.trim(), prefix: pfx, kind: 'partner', color: COLORS[x.stock.parties.length % COLORS.length], city: f.city.trim(), phone: f.phone || undefined, site: f.site || undefined, active: true, account: 'internal', joinedAt: at, userId: f.account ? uid : undefined })
      x.stock.parties.filter((p) => p.id !== id).forEach((p) => { x.stock.agreements.push({ owner: p.id, seller: id, sellerPct: f.sellPct }, { owner: id, seller: p.id, sellerPct: f.buyPct }) })
      if (f.wh) x.stock.warehouses.push({ id: whId, name: f.whName.trim() || `انبار ${f.city.trim()}`, city: f.city.trim(), operator: id, handlingFee: f.fee, active: true })
      if (f.store) x.stock.channels.push({ id: `${id}-store`, name: `فروش حضوری ${f.city.trim()}`, seller: id, collector: id, brand: 'غنیمت', active: true })
      if (f.own && f.site) x.stock.channels.push({ id: `${id}-site`, name: `سایت ${f.site}`, seller: id, collector: id, brand: f.site, active: true })
      if (f.account) x.team.push({ ...structuredClone(x.team.find((u) => u.id === 'u4') ?? x.team[0]), id: uid, name: f.name.trim(), role: f.role, phone: f.phone, status: 'آفلاین', twoFA: false })
      parsed.filter((q) => q.p && q.qty > 0).forEach((q, i) => { x.stock.lots.push({ id: `L-${Date.now().toString(36).slice(-3).toUpperCase()}${i}`, productId: q.p!.id, variationId: q.v?.id, owner: id, warehouse: f.wh ? whId : 'tehran', qty: q.qty, cost: q.cost, at, ref: 'موجودی اولیهٔ پیوستن' }) })
      new Set(parsed.filter((q) => q.p).map((q) => q.p!.id)).forEach((pid) => syncQty(x, pid))
    }, { action: 'پیوستن شریک تازه', target: `${f.name} (${pfx}) · ${f.city}`, after: `${f.wh ? 'انبار تازه' : 'بدون انبار'} · ${fa(parsed.filter((q) => q.p).length)} ردیف موجودی` })
    toast(`«${f.name}» پیوست${f.account ? `؛ حساب کاربری با موبایل ${f.phone} ساخته شد` : ''}.`); onClose() }
  const set = (x: Partial<typeof f>) => setF({ ...f, ...x })
  return <Modal open={open} onClose={onClose} title="پیوستن شریک تازه" xl footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" icon={<UserPlus size={14} />} disabled={!ok} onClick={save}>ثبت شریک</Button></>}>
    <div className="space-y-4 text-13">
      <div className="grid gap-3 sm:grid-cols-3"><Field label="نام شریک"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً آقای رضوی" /></Field><Field label="پیشوند کد" error={f.prefix && bad ? 'تکراری یا نامعتبر' : undefined}><Input className="ltr text-left font-mono uppercase" value={f.prefix} onChange={(e) => set({ prefix: e.target.value.toUpperCase().slice(0, 4) })} placeholder="MS" /></Field><Field label="شهر"><Input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="مشهد" /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="موبایل" error={f.phone && phoneBad ? 'موبایل نامعتبر یا تکراری' : undefined}><Input className="ltr text-left font-mono" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="09xxxxxxxxx" /></Field><Field label="سایت خودش (اختیاری)"><Input className="ltr text-left" value={f.site} onChange={(e) => set({ site: e.target.value })} /></Field></div>
      <div className="rounded-xl border border-line p-3"><Toggle on={f.wh} onChange={(v) => set({ wh: v })} text="انبار شهر خودش را دارد" />{f.wh && <div className="mt-2 grid gap-3 sm:grid-cols-2"><Field label="نام انبار"><Input value={f.whName} onChange={(e) => set({ whName: e.target.value })} placeholder={`انبار ${f.city || '…'}`} /></Field><Field label="هزینهٔ ارسال هر عدد برای کالای دیگران (تومان)"><MoneyInput value={f.fee} onChange={(n) => set({ fee: n })} /></Field></div>}</div>
      <div className="flex flex-wrap gap-4 rounded-xl border border-line p-3"><Toggle on={f.store} onChange={(v) => set({ store: v })} text="فروش حضوری در شهر خودش" /><Toggle on={f.own} onChange={(v) => set({ own: v })} text="سایت خودش هم کانال فروش است" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="اگر او کالای دیگران را بفروشد: درصد سود برای او"><Input type="number" className="ltr text-left font-mono" value={f.sellPct} onChange={(e) => set({ sellPct: +e.target.value })} /></Field><Field label="اگر دیگران کالای او را بفروشند: درصد سود برای فروشنده"><Input type="number" className="ltr text-left font-mono" value={f.buyPct} onChange={(e) => set({ buyPct: +e.target.value })} /></Field></div>
      <div className="rounded-xl border border-line p-3"><Toggle on={f.account} onChange={(v) => set({ account: v })} text="حساب کاربری پنل بسازد (موبایل بالا، رمز و کد ورود جدا از مدیر کل)" />{f.account && <div className="mt-2"><Field label="نقش"><Select value={f.role} onChange={(v) => set({ role: v })} options={Object.entries(ROLES).filter(([k]) => k !== 'super').map(([k, r]) => [k, r.label] as [string, string])} /></Field><p className="mt-1 text-11 text-t2">بعد از ساخت، از «تیم و دسترسی» هر بخشی را بخواهید برای او می‌بندید.</p></div>}</div>
      <Field label="موجودی اولیه (اختیاری)" help="هر خط: کد کالا یا بارکد، پسوند تنوع (برای کالای ساده خالی)، تعداد، بهای تمام‌شدهٔ هر عدد به تومان. مثلاً: GH-P-000201, 1, 10, 1550000"><Textarea rows={3} className="ltr text-left font-mono" value={f.csv} onChange={(e) => set({ csv: e.target.value })} /></Field>
      {parsed.length > 0 && <ul className="space-y-1 text-12">{parsed.map((q, i) => <li key={i} className={q.p ? 'text-success' : 'text-danger'}>{q.p ? `${q.p.title}${q.v ? ` · ${q.v.suffix}` : ''} × ${fa(q.qty)}` : `«${q.r[0]}» پیدا نشد؛ این خط ثبت نمی‌شود`}</li>)}</ul>}
    </div>
  </Modal>
}

export const partyOfUser = (uid?: string | null) => getDB().stock.parties.find((p) => p.userId === uid)?.id
