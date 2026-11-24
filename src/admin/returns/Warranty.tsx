import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Search, Trash2 } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select, StatusBadge, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'
import { nextWarrantyCode, providerFor } from '@/shared/lib/warranty'
import type { DB, WCard } from '@/shared/data/seed'
import { cardState } from './flow'
import { RemoteFor } from '@/shared/ui/remoteUpload'

/** نام کالا، سریال و مشتریِ یک کارت گارانتی؛ برای کارت‌های دستی و کالای خارج از سایت هم کار می‌کند */
export const cardProduct = (d: DB, c: WCard) => c.productTitle ?? d.products.find((p) => p.id === c.productId)?.title ?? c.productId
export const cardSerial = (d: DB, c: WCard) => c.serial ?? (c.unitId ? d.units.find((u) => u.id === c.unitId)?.serial : undefined) ?? ''
/** متن سریال برای نمایش؛ کالای بی‌سریال با شمارهٔ عدد در سفارش */
export const serialText = (d: DB, c: WCard) => cardSerial(d, c) ? `سریال ${cardSerial(d, c)}` : `بدون سریال${c.lineKey ? ` · عدد ${fa(c.lineKey.split('|').pop() ?? '')} از این ردیف سفارش` : ''}`
export const cardCustomer = (d: DB, c: WCard) => c.customerName ?? d.customers.find((x) => x.id === c.customerId)?.name ?? '—'
export const cardMobile = (d: DB, c: WCard) => c.customerMobile ?? d.customers.find((x) => x.id === c.customerId)?.mobile ?? ''
export const cardStatusText = (c: WCard) => { const s = cardState(c); return c.awaiting && s.status !== 'invalid' ? 'در انتظار تحویل' : s.status === 'active' ? 'فعال' : s.status === 'expired' ? 'منقضی‌شده' : 'نامعتبر' }

const TYPES = ['گارانتی اختصاصی غنیمت', 'گارانتی شرکتی']
const today = () => new Date().toISOString().slice(0, 10)

/** صدور دستی گارانتی: برای کالای داخل سایت یا خارج از سایت؛ عکس کالا اجباری است و کد یکتا خودکار ساخته می‌شود */
export function ManualWarranty({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (code: string) => void }) {
  const d = useDB()
  const [f, setF] = useState({ src: 'site' as 'site' | 'offsite', productId: '', unitId: '', serial: '', productTitle: '', brand: '', who: 'existing' as 'existing' | 'new', customerId: '', customerName: '', customerMobile: '', orderId: '', type: TYPES[0], provider: providerFor(TYPES[0]), months: 6, start: today(), note: '', photos: [] as string[] })
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const p = d.products.find((x) => x.id === f.productId)
  const units = useMemo(() => d.units.filter((u) => u.productId === f.productId), [d.units, f.productId])
  const custOrders = d.orders.filter((o) => o.customerId === f.customerId)
  const save = () => {
    if (f.src === 'site' && !p) return toast('کالا را از فهرست کالاهای سایت انتخاب کنید.', { tone: 'err' })
    if (f.src === 'offsite' && !f.productTitle.trim()) return toast('نام کالای خارج از سایت را بنویسید.', { tone: 'err' })
    const serial = f.unitId ? d.units.find((u) => u.id === f.unitId)?.serial ?? '' : f.serial.trim()
    if (!serial) return toast('شماره سریال یا IMEI کالا را وارد کنید؛ استعلام با همین شماره انجام می‌شود.', { tone: 'err' })
    if (f.who === 'existing' && !f.customerId) return toast('مشتری را انتخاب کنید یا «مشتری تازه» را بزنید.', { tone: 'err' })
    if (f.who === 'new' && (!f.customerName.trim() || !/^09\d{9}$/.test(f.customerMobile.replace(/\D/g, '')))) return toast('نام و شمارهٔ همراه ۱۱ رقمی مشتری را وارد کنید.', { tone: 'err' })
    if (!f.photos.length) return toast('برای صدور دستی، دست‌کم یک عکس از خود کالا (با سریال قابل‌خواندن) لازم است.', { tone: 'err' })
    if (f.months < 1) return toast('مدت گارانتی باید دست‌کم یک ماه باشد.', { tone: 'err' })
    const dup = d.wcards.find((c) => c.status !== 'invalid' && (c.serial === serial || (f.unitId && c.unitId === f.unitId)))
    if (dup) return toast(`برای این سریال گارانتی فعال ${dup.code} وجود دارد. اول آن را نامعتبر کنید یا همان را چاپ کنید.`, { tone: 'err' })
    const code = nextWarrantyCode(d); const by = currentUser()?.name ?? 'مدیر'
    mutate((x) => { x.wcards.unshift({ code, unitId: f.unitId, productId: f.src === 'site' ? f.productId : '', productTitle: f.src === 'offsite' ? [f.productTitle.trim(), f.brand.trim()].filter(Boolean).join(' · ') : undefined, offsite: f.src === 'offsite', serial,
      customerId: f.who === 'existing' ? f.customerId : '', customerName: f.who === 'new' ? f.customerName.trim() : undefined, customerMobile: f.who === 'new' ? f.customerMobile.replace(/\D/g, '') : undefined,
      orderId: f.orderId, type: f.type, provider: f.provider.trim() || providerFor(f.type), months: f.months, start: new Date(f.start).toISOString(), status: 'active', notes: f.note.trim() ? [f.note.trim()] : [],
      source: 'manual', createdAt: new Date().toISOString(), createdBy: by, photos: f.photos, note: f.note.trim() || undefined }) },
    { action: 'صدور دستی گارانتی', target: code, after: `${f.src === 'site' ? p?.title : f.productTitle} · سریال ${serial} · ${fa(f.months)} ماه` })
    toast(`گارانتی ${code} صادر شد؛ در استعلام و پنل مشتری دیده می‌شود.`)
    onDone?.(code); onClose()
  }
  return <Modal open={open} onClose={onClose} wide title="صدور دستی گارانتی" footer={<><Button variant="primary" onClick={save}>صدور و ساخت کد</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-4 text-13">
      <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">برای کالایی که از سایت خریده نشده یا گارانتی‌اش باید جدا صادر شود. کد یکتا خودکار ساخته می‌شود، در استعلام و «گارانتی‌های من» مشتری دیده می‌شود و قابل چاپ است. عکس کالا اجباری است.</p>
      <Field label="کالا"><Segmented value={f.src} onChange={(v) => set({ src: v })} options={[['site', 'کالای داخل سایت'], ['offsite', 'کالای خارج از سایت']]} /></Field>
      {f.src === 'site' ? <div className="grid gap-3 sm:grid-cols-2">
        <Field label="کالا از فهرست سایت"><Select value={f.productId} onChange={(v) => { const pp = d.products.find((x) => x.id === v); set({ productId: v, unitId: '', type: pp?.warrantyType && TYPES.includes(pp.warrantyType) ? pp.warrantyType : f.type, months: pp?.warrantyMonths || f.months }) }} options={d.products.map((x) => [x.id, x.title])} placeholder="جست‌وجوی کالا" /></Field>
        <Field label="واحد (اگر سریالی ثبت شده)" help="اگر واحد در انبار ثبت نشده، سریال را دستی بنویسید."><Select value={f.unitId} onChange={(v) => set({ unitId: v })} options={[['', 'بدون واحد · سریال دستی'], ...units.map((u) => [u.id, `${u.serial} · ${u.id}`] as [string, string])]} /></Field>
      </div> : <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام کالا"><Input value={f.productTitle} onChange={(e) => set({ productTitle: e.target.value })} placeholder="مثلاً هدفون سونی WH-1000XM4" /></Field>
        <Field label="برند و مدل (اختیاری)"><Input value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="سونی · مشکی" /></Field>
      </div>}
      {!f.unitId && <Field label="شماره سریال یا IMEI"><Input className="ltr font-mono" value={f.serial} onChange={(e) => set({ serial: e.target.value })} placeholder="مثلاً H2KZ6P0QL7M1" /></Field>}
      <Field label="مشتری"><Segmented value={f.who} onChange={(v) => set({ who: v })} options={[['existing', 'مشتری ثبت‌شده'], ['new', 'مشتری تازه یا حضوری']]} /></Field>
      {f.who === 'existing' ? <div className="grid gap-3 sm:grid-cols-2">
        <Field label="مشتری"><Select value={f.customerId} onChange={(v) => set({ customerId: v, orderId: '' })} options={d.customers.map((c) => [c.id, `${c.name} · ${c.mobile}`])} placeholder="جست‌وجوی نام یا شماره" /></Field>
        <Field label="سفارش مرتبط (اختیاری)"><Select value={f.orderId} onChange={(v) => set({ orderId: v })} options={[['', 'بدون سفارش'], ...custOrders.map((o) => [o.id, o.id] as [string, string])]} /></Field>
      </div> : <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی"><Input value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} /></Field>
        <Field label="شمارهٔ همراه"><Input className="ltr font-mono" inputMode="numeric" value={f.customerMobile} onChange={(e) => set({ customerMobile: e.target.value })} placeholder="09xxxxxxxxx" /></Field>
      </div>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="نوع گارانتی"><Select value={f.type} onChange={(v) => set({ type: v, provider: providerFor(v) })} options={TYPES} /></Field>
        <Field label="ارائه‌دهنده"><Input value={f.provider} onChange={(e) => set({ provider: e.target.value })} /></Field>
        <Field label="مدت (ماه)"><Input type="number" min={1} className="ltr font-mono" value={f.months} onChange={(e) => set({ months: Math.max(0, +e.target.value) })} /></Field>
        <Field label="تاریخ شروع"><Input type="date" value={f.start} onChange={(e) => set({ start: e.target.value })} /></Field>
      </div>
      <Field label="عکس کالا (اجباری)" help="عکس خود کالا با سریال خوانا؛ حداکثر ۶ عکس.">
        <div className="flex flex-wrap items-center gap-2">{f.photos.map((ph, i) => <span key={i} className="relative"><img src={ph} alt="" className="size-16 rounded-lg object-cover" /><button type="button" aria-label="حذف عکس" onClick={() => set({ photos: f.photos.filter((_, j) => j !== i) })} className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-danger text-white"><Trash2 size={11} /></button></span>)}
          {f.photos.length < 6 && <label className={cx('grid size-16 cursor-pointer place-items-center rounded-lg border border-dashed text-t2 hover:border-brand/50', f.photos.length ? 'border-line' : 'border-danger/60 bg-danger-bg/40')}><Camera size={18} /><input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={async (e) => { const fs = [...(e.target.files ?? [])].slice(0, 6 - f.photos.length); const imgs = await Promise.all(fs.map((x) => fileToImage(x))); setF((p2) => ({ ...p2, photos: [...p2.photos, ...imgs] })) }} /></label>}
          <RemoteFor label="عکس کالای گارانتی" compact /></div>
      </Field>
      <Field label="یادداشت (اختیاری)" help="روی کارت به‌عنوان تبصره دیده می‌شود."><Textarea rows={2} value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="مثلاً خرید حضوری از شعبه؛ پوشش فقط ایراد فنی" /></Field>
    </div>
  </Modal>
}

type Hit = { kind: 'کارت گارانتی' | 'درخواست گارانتی' | 'مرجوعی'; id: string; title: string; sub: string; status: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; go: () => void }
/** استعلام یکپارچه: کد گارانتی، سریال، شمارهٔ همراه، شمارهٔ درخواست گارانتی، شمارهٔ مرجوعی یا سفارش؛ کارت‌های دستی هم پیدا می‌شوند */
export function Inquiry({ onCard }: { onCard: (code: string) => void }) {
  const d = useDB(); const nav = useNavigate(); const [q, setQ] = useState('')
  const k = q.trim().toLowerCase().replace(/\s+/g, ''); const digits = k.replace(/\D/g, '')
  const hits: Hit[] = !k ? [] : [
    ...d.wcards.filter((c) => c.code.toLowerCase() === k || cardSerial(d, c).toLowerCase() === k || (digits.length >= 10 && cardMobile(d, c).endsWith(digits.slice(-10))) || (k.length >= 4 && c.orderId.toLowerCase() === k)).map((c): Hit => {
      const s = cardState(c); const t = cardStatusText(c)
      return { kind: 'کارت گارانتی', id: c.code, title: `${cardProduct(d, c)}${c.source === 'manual' ? ' · صدور دستی' : ''}`, sub: `${serialText(d, c)} · ${cardCustomer(d, c)} · ${c.type} · ${fa(c.months)} ماه${s.status === 'active' && !c.awaiting ? ` · ${fa(s.daysLeft)} روز مانده (تا ${s.end.toLocaleDateString('fa-IR')})` : ''}`, status: t, tone: t === 'فعال' ? 'success' : t === 'در انتظار تحویل' ? 'warning' : 'danger', go: () => onCard(c.code) } }),
    ...d.warranties.filter((w) => w.id.toLowerCase() === k || w.code.toLowerCase() === k || (k.length >= 4 && (w.orderId ?? '').toLowerCase() === k)).map((w): Hit => ({ kind: 'درخواست گارانتی', id: w.id, title: d.products.find((p) => p.id === w.productId)?.title ?? '—', sub: `کارت ${w.code} · ${w.reasonKind ?? ''}`, status: w.status, tone: 'neutral', go: () => nav(`/admin/returns/w/${w.id}`) })),
    ...d.returns.filter((r) => r.id.toLowerCase() === k || r.orderId.toLowerCase() === k || (r.unitId && d.units.find((u) => u.id === r.unitId)?.serial.toLowerCase() === k)).map((r): Hit => ({ kind: 'مرجوعی', id: r.id, title: d.products.find((p) => p.id === r.productId)?.title ?? `سفارش ${r.orderId}`, sub: `سفارش ${r.orderId} · ${r.reason}${r.channel ? ` · ثبت دستی از ${r.channel}` : ''}`, status: r.status, tone: 'neutral', go: () => nav(`/admin/returns/${r.id}`) })),
  ]
  return <div className="space-y-3">
    <div className="relative max-w-xl"><Search size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input className="w-full pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="کد گارانتی، سریال، شمارهٔ همراه، شمارهٔ مرجوعی یا سفارش" aria-label="استعلام" /></div>
    <p className="text-12 text-t2">نمونه: <button type="button" className="ltr font-mono text-brand" onClick={() => setQ('GW-31877')}>GW-31877</button> · <button type="button" className="ltr font-mono text-brand" onClick={() => setQ('H2KZ6P0QL7M1')}>H2KZ6P0QL7M1</button> · <button type="button" className="ltr font-mono text-brand" onClick={() => setQ(d.returns[0]?.id ?? '')}>{d.returns[0]?.id}</button></p>
    {k && (hits.length ? <ul className="space-y-2">{hits.slice(0, 10).map((h) => <li key={h.kind + h.id}><button type="button" onClick={h.go} className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-start hover:border-brand/40">
      <Badge tone={h.kind === 'مرجوعی' ? 'warning' : 'info'}>{h.kind}</Badge><span className="ltr font-mono text-13 font-bold">{h.id}</span>
      {h.kind === 'کارت گارانتی' ? <Badge tone={h.tone}>{h.status}</Badge> : <StatusBadge s={h.status} />}
      <span className="w-full text-13 font-semibold">{h.title}</span><span className="w-full text-12 text-t2">{h.sub}</span></button></li>)}</ul>
      : <p className="rounded-xl border border-dashed border-line p-3 text-13">نتیجه‌ای پیدا نشد. کد، سریال یا شماره را دوباره بررسی کنید؛ اگر کالا گارانتی ندارد، می‌توانید «صدور دستی گارانتی» بزنید.</p>)}
  </div>
}

/** فهرست کارت‌های گارانتی (کد، کالا، سریال، وضعیت، چاپ)؛ در سفارش و پروفایل مشتری */
export function WarrantyList({ cards, empty }: { cards: WCard[]; empty: string }) {
  const d = useDB(); const nav = useNavigate()
  if (!cards.length) return <p className="rounded-xl border border-dashed border-line p-3 text-12 text-t2">{empty}</p>
  return <ul className="divide-y divide-line rounded-xl border border-line">{cards.map((c) => { const t = cardStatusText(c); const s = cardState(c)
    return <li key={c.code} className="flex flex-wrap items-center gap-2 px-3 py-2 text-12">
      <span className="ltr font-mono text-13 font-bold">{c.code}</span><Badge tone={t === 'فعال' ? 'success' : t === 'در انتظار تحویل' ? 'warning' : 'danger'}>{t}</Badge>{c.source === 'manual' && <Badge tone="info">دستی</Badge>}
      <span className="min-w-0 flex-1 truncate"><b>{cardProduct(d, c)}</b> · {cardSerial(d, c) ? <>سریال <span className="ltr font-mono">{cardSerial(d, c)}</span></> : serialText(d, c)} · {fa(c.months)} ماه{c.awaiting ? ' از روز تحویل' : t === 'فعال' ? ` · تا ${s.end.toLocaleDateString('fa-IR')}` : ''}</span>
      <Button size="sm" variant="ghost" onClick={() => nav(`/admin/print?doc=warranty&code=${c.code}`)}>چاپ کارت</Button>
      <Button size="sm" variant="ghost" onClick={() => nav(`/admin/returns?tab=wcards&q=${c.code}`)}>جزئیات</Button>
    </li> })}</ul>
}
