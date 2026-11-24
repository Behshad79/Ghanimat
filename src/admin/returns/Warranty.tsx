import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Camera, Download, ExternalLink, Printer, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select, StatusBadge, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'
import { nextWarrantyCode, providerFor } from '@/shared/lib/warranty'
import type { DB, WCard } from '@/shared/data/seed'
import { cardState, COVERED, EXCLUDED } from './flow'
import { askReason } from '@/shared/ui/reason'
import { ManualReturn } from '../orders/ReturnTools'
import { WarrantyCard, type DocOpts } from '../print/docs'
import { printPages, saveBlob, toPdf, type OutPage } from '@/shared/lib/printOut'
import { RemoteFor } from '@/shared/ui/remoteUpload'

/** نام کالا، سریال و مشتریِ یک کارت گارانتی؛ برای کارت‌های دستی و کالای خارج از سایت هم کار می‌کند */
export const cardProduct = (d: DB, c: WCard) => c.productTitle ?? d.products.find((p) => p.id === c.productId)?.title ?? c.productId
export const cardSerial = (d: DB, c: WCard) => c.serial ?? (c.unitId ? d.units.find((u) => u.id === c.unitId)?.serial : undefined) ?? ''
/** متن سریال برای نمایش؛ کالای بی‌سریال با شمارهٔ عدد در سفارش */
export const serialText = (d: DB, c: WCard) => cardSerial(d, c) ? `سریال ${cardSerial(d, c)}` : `بدون سریال${c.lineKey ? ` · عدد ${fa(c.lineKey.split('|').pop() ?? '')} از این ردیف سفارش` : ''}`
export const cardCustomer = (d: DB, c: WCard) => c.customerName ?? d.customers.find((x) => x.id === c.customerId)?.name ?? '—'
export const cardMobile = (d: DB, c: WCard) => c.customerMobile ?? d.customers.find((x) => x.id === c.customerId)?.mobile ?? ''
export const cardStatusText = (c: WCard) => { const s = cardState(c); return s.status === 'active' ? 'فعال' : s.status === 'expired' ? 'منقضی‌شده' : s.status === 'archived' ? 'بایگانی‌شده' : 'نامعتبر' }
export const statusTone = (t: string) => (t === 'فعال' ? 'success' : t === 'بایگانی‌شده' ? 'neutral' : 'danger') as 'success' | 'neutral' | 'danger'

/** روزشمار پایان گارانتی: روزهای مانده با نوار باقی‌مانده؛ زیر ۳۰ روز زرد، منقضی قرمز */
export function Countdown({ c, wide }: { c: WCard; wide?: boolean }) {
  const s = cardState(c)
  if (s.status === 'archived') return <span className="text-12 text-t3">بایگانی‌شده{c.archivedAt ? ` · ${new Date(c.archivedAt).toLocaleDateString('fa-IR')}` : ''}</span>
  if (s.status === 'invalid') return <span className="text-12 text-danger">نامعتبر</span>
  if (s.status === 'expired') return <span className="text-12 font-semibold text-danger">منقضی · {fa(-s.daysLeft)} روز پیش</span>
  const left = Math.max(0, s.daysLeft); const pc = Math.max(3, Math.min(100, (left / Math.max(1, s.total)) * 100)); const warn = left <= 30
  return <span className={cx('inline-flex flex-col gap-1', wide ? 'w-full' : 'w-32')} title={`پایان: ${s.end.toLocaleDateString('fa-IR')}`}>
    <span className={cx('text-12 font-bold', warn ? 'text-warning' : 'text-success')}>{fa(left)} روز مانده<span className="font-normal text-t3"> · تا {s.end.toLocaleDateString('fa-IR')}</span></span>
    <span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className={cx('block h-full rounded-full', warn ? 'bg-warning' : 'bg-success')} style={{ width: `${pc}%` }} /></span>
  </span>
}

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
      return { kind: 'کارت گارانتی', id: c.code, title: `${cardProduct(d, c)}${c.source === 'manual' ? ' · صدور دستی' : ''}`, sub: `${serialText(d, c)} · ${cardCustomer(d, c)} · ${c.type} · ${fa(c.months)} ماه${s.status === 'active' ? ` · ${fa(s.daysLeft)} روز مانده (تا ${s.end.toLocaleDateString('fa-IR')})` : s.status === 'expired' ? ` · ${fa(-s.daysLeft)} روز پیش منقضی شد` : c.archivedReason ? ` · ${c.archivedReason}` : ''}`, status: t, tone: statusTone(t), go: () => onCard(c.code) } }),
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

/** فهرست کارت‌های گارانتی با روزشمار؛ «جزئیات» و «چاپ» در همین صفحه به‌صورت پنجره باز می‌شوند (سفارش، پروفایل مشتری) */
export function WarrantyList({ cards, empty }: { cards: WCard[]; empty: string }) {
  const d = useDB(); const [open, setOpen] = useState<string | null>(null); const [print, setPrint] = useState<string[] | null>(null)
  if (!cards.length) return <p className="rounded-xl border border-dashed border-line p-3 text-12 text-t2">{empty}</p>
  return <>
    <ul className="divide-y divide-line rounded-xl border border-line">{cards.map((c) => { const t = cardStatusText(c)
      return <li key={c.code} className={cx('flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-12', t === 'بایگانی‌شده' && 'bg-neutral-bg/60')}>
        <button type="button" onClick={() => setOpen(c.code)} className="ltr font-mono text-13 font-bold text-brand hover:underline">{c.code}</button>
        <Badge tone={statusTone(t)}>{t}</Badge>{c.source === 'manual' && <Badge tone="info">دستی</Badge>}{c.keep && <Badge tone="info">فعال به تصمیم ما</Badge>}
        <span className="min-w-0 flex-1 basis-56"><b className="block truncate">{cardProduct(d, c)}</b><span className="block truncate text-t2">{serialText(d, c)} · {c.type} · {fa(c.months)} ماه{c.archivedReason && t === 'بایگانی‌شده' ? ` · ${c.archivedReason}` : ''}</span></span>
        <Countdown c={c} />
        <span className="flex gap-1"><Button size="sm" variant="ghost" icon={<Printer size={13} />} onClick={() => setPrint([c.code])}>چاپ</Button><Button size="sm" onClick={() => setOpen(c.code)}>جزئیات</Button></span>
      </li> })}</ul>
    {open && <WarrantyModal code={open} onClose={() => setOpen(null)} />}
    {print && <WarrantyPrint codes={print} onClose={() => setPrint(null)} />}
  </>
}

/** کلید ردیف سفارش برای پیش‌پر کردن فرم مرجوعی یا درخواست گارانتی */
export function cardItemKey(d: DB, c: WCard) {
  const o = d.orders.find((x) => x.id === c.orderId); if (!o) return undefined
  if (c.lineKey) { const [, sid, idx] = c.lineKey.split('|'); const sh = o.shipments.find((x) => x.id === sid); const it = sh?.items[+idx]; return sh && it ? `${sh.id}|${it.productId}|${it.unitId}` : undefined }
  for (const sh of o.shipments) for (const it of sh.items) if (it.unitId && it.unitId === c.unitId) return `${sh.id}|${it.productId}|${it.unitId}`
  return undefined
}
/** مرجوعی‌های همین سفارش که این کالا را دربر دارند */
export function cardReturns(d: DB, c: WCard) {
  return d.returns.filter((r) => r.orderId && r.orderId === c.orderId && (r.items?.length ? r.items : [{ productId: r.productId ?? '', unitId: r.unitId }]).some((i) => (c.unitId ? i.unitId === c.unitId : !i.unitId && i.productId === c.productId)))
}

type Act = { onPrint: () => void; onRequest?: () => void; onReturn?: () => void; onSection?: () => void }
/** جزئیات کامل یک گارانتی + اقدام‌ها؛ در کشوی صفحهٔ گارانتی و پنجرهٔ صفحهٔ سفارش مشترک است */
export function WarrantyDetail({ code, act }: { code: string; act: Act }) {
  const d = useDB(); const nav = useNavigate()
  const c = d.wcards.find((x) => x.code === code)
  if (!c) return <p className="text-13 text-t2">این کد گارانتی پیدا نشد.</p>
  const s = cardState(c); const t = cardStatusText(c); const o = d.orders.find((x) => x.id === c.orderId)
  const reqs = d.warranties.filter((w) => w.code === c.code); const rets = cardReturns(d, c)
  const delivered = !!o && ['order.delivered', 'order.returned'].includes(o.status)
  const set = (fn: (x: WCard) => void, action: string, after?: string) => mutate((x) => { const y = x.wcards.find((w) => w.code === c.code); if (y) fn(y) }, { action, target: c.code, after })
  const L = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex items-start justify-between gap-3 py-1.5"><span className="shrink-0 text-t2">{k}</span><span className="text-end">{children}</span></div>
  return <div className="space-y-4 text-13">
    <div className={cx('rounded-xl border p-3', t === 'فعال' ? 'border-success/30 bg-success-bg/40' : t === 'بایگانی‌شده' ? 'border-line bg-neutral-bg' : 'border-danger/30 bg-danger-bg/40')}>
      <div className="mb-2 flex flex-wrap items-center gap-2"><span className="ltr font-mono text-15 font-black">{c.code}</span><Badge tone={statusTone(t)}>{t}</Badge>{c.source === 'manual' && <Badge tone="info">صدور دستی</Badge>}{c.offsite && <Badge tone="warning">خارج از سایت</Badge>}{c.keep && <Badge tone="info">فعال به تصمیم ما</Badge>}</div>
      <Countdown c={c} wide />
      {t === 'بایگانی‌شده' && <p className="mt-2 text-12 text-t2">علت بایگانی: {c.archivedReason ?? '—'}. اگر کالا دوباره فروخته شود، گارانتی تازه با کد جدید صادر می‌شود.</p>}
      {t === 'نامعتبر' && c.invalidReason && <p className="mt-2 text-12 text-danger">علت: {c.invalidReason}</p>}
    </div>
    <div className="divide-y divide-line">
      <L k="کالا">{cardProduct(d, c)}</L>
      <L k="سریال">{cardSerial(d, c) ? <span className="ltr font-mono">{cardSerial(d, c)}</span> : serialText(d, c)}</L>
      <L k="سفارش">{c.orderId ? <button type="button" className="ltr font-mono text-brand" onClick={() => nav(`/admin/orders/${c.orderId}`)}>{c.orderId}</button> : '—'}</L>
      <L k="مشتری">{cardCustomer(d, c)}{cardMobile(d, c) && <span className="ltr block text-12 text-t2">{cardMobile(d, c)}</span>}</L>
      <L k="نوع و مدت">{c.type} · {fa(c.months)} ماه</L>
      <L k="ارائه‌دهنده">{c.provider}</L>
      <L k="شروع">{new Date(c.start).toLocaleDateString('fa-IR')}<span className="block text-12 text-t2">{c.source === 'manual' ? 'تاریخ صدور دستی' : 'لحظهٔ ثبت خرید'}</span></L>
      <L k="پایان">{s.end.toLocaleDateString('fa-IR')}</L>
      <L k="صدور">{c.source === 'manual' ? `دستی توسط ${c.createdBy ?? '—'}` : 'خودکار هنگام خرید'}</L>
    </div>
    {(c.photos ?? []).length > 0 && <div><p className="mb-1 font-semibold">عکس کالا هنگام صدور</p><div className="flex flex-wrap gap-2">{c.photos!.map((ph, i) => <a key={i} href={ph} target="_blank" rel="noreferrer"><img src={ph} alt="" className="size-16 rounded-lg object-cover" /></a>)}</div></div>}
    <div><p className="mb-1.5 font-semibold">درخواست‌های گارانتی و مرجوعی این کالا</p>
      {reqs.length + rets.length ? <ul className="space-y-1.5">{[...reqs.map((w) => ({ id: w.id, kind: 'درخواست گارانتی', st: w.status, go: `/admin/returns/w/${w.id}` })), ...rets.map((r) => ({ id: r.id, kind: 'مرجوعی', st: r.status, go: `/admin/returns/${r.id}` }))].map((x) =>
        <li key={x.id}><button type="button" onClick={() => nav(x.go)} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-start hover:border-brand/40"><Badge tone={x.kind === 'مرجوعی' ? 'warning' : 'info'}>{x.kind}</Badge><span className="ltr font-mono">{x.id}</span><span className="ms-auto"><StatusBadge s={x.st} /></span></button></li>)}</ul>
        : <p className="text-12 text-t2">هنوز درخواستی برای این کالا ثبت نشده است.</p>}
    </div>
    <div className="space-y-2 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2">
        {act.onRequest && s.status === 'active' && c.orderId && <Button size="sm" variant="primary" onClick={act.onRequest}>ثبت درخواست گارانتی</Button>}
        {act.onReturn && c.orderId && delivered && t !== 'بایگانی‌شده' && <Button size="sm" onClick={act.onReturn}>ثبت مرجوعی</Button>}
        <Button size="sm" icon={<Printer size={13} />} onClick={act.onPrint}>چاپ کارت</Button>
        {act.onSection && <Button size="sm" variant="ghost" icon={<ExternalLink size={13} />} onClick={act.onSection}>باز کردن در بخش گارانتی</Button>}
      </div>
      {c.orderId && !delivered && t === 'فعال' && <p className="text-11 text-t2">مرجوعی پس از تحویل ثبت می‌شود. اگر مشتری پیش از تحویل منصرف شد، سفارش یا مرسوله را لغو کنید؛ این گارانتی خودکار بایگانی می‌شود.</p>}
      <div className="flex flex-wrap gap-2">
        {(t === 'فعال' || t === 'منقضی‌شده') && <Button size="sm" variant="ghost" icon={<Archive size={13} />} onClick={async () => { const w = await askReason({ kind: 'warranty', ref: c.code, status: 'بایگانی گارانتی', title: `علت بایگانی ${c.code}` }); if (w) { set((y) => { y.status = 'archived'; y.archivedReason = w; y.archivedAt = new Date().toISOString(); y.keep = false }, 'بایگانی گارانتی', w); toast('گارانتی بایگانی شد.') } }}>بایگانی</Button>}
        {t === 'بایگانی‌شده' && <Button size="sm" icon={<RotateCcw size={13} />} onClick={() => { set((y) => { y.status = 'active'; y.keep = true; y.archivedReason = undefined; y.archivedAt = undefined }, 'فعال ماندن گارانتی پس از مرجوعی'); toast('گارانتی به تصمیم شما فعال ماند و دیگر خودکار بایگانی نمی‌شود.') }}>فعال بماند</Button>}
        {t !== 'نامعتبر' && <Button size="sm" variant="danger" onClick={async () => { const w = await askReason({ kind: 'warranty', ref: c.code, status: 'نامعتبر کردن گارانتی', title: `علت نامعتبر کردن ${c.code}` }); if (w) { set((y) => { y.status = 'invalid'; y.invalidReason = w }, 'نامعتبر کردن گارانتی', w); toast('گارانتی نامعتبر شد؛ مشتری در تب «نامعتبر» می‌بیند.') } }}>نامعتبر کردن</Button>}
        {t === 'نامعتبر' && <Button size="sm" onClick={() => { set((y) => { y.status = 'active'; y.invalidReason = undefined }, 'معتبر کردن دوبارهٔ گارانتی'); toast('گارانتی دوباره معتبر شد.') }}>معتبر کردن دوباره</Button>}
      </div>
    </div>
    <details className="text-12"><summary className="cursor-pointer font-semibold">شرایط پوشش</summary><p className="mt-1"><b className="text-success">تحت پوشش:</b> {COVERED.join('، ')}</p><p><b className="text-danger">خارج از پوشش:</b> {EXCLUDED.join('، ')}</p>{c.notes.map((n) => <p key={n} className="text-t2">تبصره: {n}</p>)}</details>
  </div>
}

/** پنجرهٔ جزئیات گارانتی در صفحهٔ سفارش و پروفایل مشتری؛ درخواست گارانتی، مرجوعی و چاپ همین‌جا */
export function WarrantyModal({ code, onClose }: { code: string; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const [sub, setSub] = useState<null | 'warranty' | 'return' | 'print'>(null)
  const c = d.wcards.find((x) => x.code === code); const key = c && cardItemKey(d, c)
  const preset = c?.orderId ? { orderId: c.orderId, customerId: c.customerId, items: key ? [key] : [], code: c.code } : undefined
  if (sub === 'print') return <WarrantyPrint codes={[code]} onClose={() => setSub(null)} />
  if (sub && preset) return <ManualReturn open defaultKind={sub} preset={preset} onClose={() => setSub(null)} />
  return <Modal open onClose={onClose} title="جزئیات گارانتی">
    <WarrantyDetail code={code} act={{ onPrint: () => setSub('print'), onRequest: () => setSub('warranty'), onReturn: () => setSub('return'), onSection: () => { onClose(); nav(`/admin/returns?tab=wcards&q=${code}`) } }} />
  </Modal>
}

/** پنجرهٔ چاپ کارت گارانتی: پیش‌نمایش، رنگی یا سیاه‌وسفید، کاغذ کارت یا A4، چاپ و PDF */
export function WarrantyPrint({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const ref = useRef<HTMLDivElement>(null)
  const [bw, setBw] = useState(false); const [paper, setPaper] = useState<'card' | 'A4'>('card'); const [busy, setBusy] = useState(false)
  const opts: DocOpts = { font: 1, margin: 10, footer: '', seal: true, hide: [], ...(d.docSettings.warranty ?? {}) }
  const pages = (): OutPage[] => { const root = ref.current; if (!root) return []
    return paper === 'card' ? [...root.querySelectorAll<HTMLElement>('[data-wcard]')].map((el) => ({ el, paper: 'کارت ۸۵×۵۴' })) : [...root.querySelectorAll<HTMLElement>('[data-wpage]')].map((el) => ({ el, paper: 'A4' })) }
  const log = () => mutate((x) => { codes.forEach((code) => { const n = x.printLog.filter((y) => y.doc === 'warranty' && y.ref === code).length; x.printLog.unshift({ id: `PL-${Date.now().toString(36).slice(-5).toUpperCase()}${code.slice(-2)}`, doc: 'warranty', label: 'کارت گارانتی', ref: code, by: currentUser()?.name ?? 'کارشناس', at: new Date().toISOString(), copy: n + 1, paper: paper === 'card' ? 'کارت ۸۵×۵۴' : 'A4' }) }) }, { action: 'چاپ سند', target: `کارت گارانتی · ${codes.join('، ')}` })
  const doPrint = async () => { const ps = pages(); if (!ps.length) return; log(); const ok = await printPages(ps); if (!ok) toast('مرورگر پنجرهٔ چاپ را باز نکرد. «دانلود PDF» را بزنید و فایل را چاپ کنید.', { tone: 'err' }) }
  const pdf = async () => { const ps = pages(); if (!ps.length) return; setBusy(true); try { saveBlob(await toPdf(ps), `ghanimat-warranty-${codes.length === 1 ? codes[0] : `${codes.length}-cards`}.pdf`); toast('PDF کارت گارانتی ساخته شد.') } catch (e) { toast(`ساخت PDF ناموفق بود: ${(e as Error).message}`, { tone: 'err' }) } finally { setBusy(false) } }
  return <Modal wide open onClose={onClose} title={`چاپ کارت گارانتی${codes.length > 1 ? ` · ${fa(codes.length)} کارت` : ''}`}
    footer={<><Button variant="primary" icon={<Printer size={14} />} onClick={doPrint}>چاپ</Button><Button icon={<Download size={14} />} disabled={busy} onClick={pdf}>{busy ? 'در حال ساخت…' : 'دانلود PDF'}</Button><Button variant="ghost" onClick={() => { onClose(); nav(`/admin/print?doc=warranty&code=${codes[0]}`) }}>ویرایش قالب در مرکز چاپ</Button></>}>
    <div className="mb-3 flex flex-wrap items-center gap-3 text-12"><Segmented value={bw ? 'bw' : 'c'} onChange={(v) => setBw(v === 'bw')} options={[['c', 'رنگی'], ['bw', 'سیاه‌وسفید']]} /><Segmented value={paper} onChange={(v) => setPaper(v)} options={[['card', 'کاغذ کارت ۸۵×۵۴'], ['A4', 'برگهٔ A4']]} /><span className="text-t2">{paper === 'card' ? 'هر رو یک صفحه؛ برای چاپگر کارت.' : 'هر کارت پشت و رو روی یک برگه؛ بعد برش بزنید.'}</span></div>
    <div ref={ref} className="max-h-[60vh] space-y-4 overflow-auto rounded-xl bg-neutral-bg p-4">{codes.map((code) => <div key={code} data-wpage className="bg-white p-3"><WarrantyCard unitId="" code={code} opts={opts} bw={bw} /></div>)}</div>
  </Modal>
}
