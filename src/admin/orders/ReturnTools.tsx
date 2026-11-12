import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ExternalLink, PackageCheck, PhoneCall, Store, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Segmented, Select, StatusBadge, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel, toman } from '@/shared/lib/fa'
import { ProductImg, useQuickChips } from '../pages/_shared'

const fd = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

/** سفارش اصلیِ یک مرجوعی یا گارانتی، همان‌طور که مشتری ثبت کرده بود: تاریخ، مبلغ، پرداخت، کانال، اقلام و تحویل */
export function OriginalOrder({ orderId, highlight }: { orderId: string; highlight?: string }) {
  const d = useDB(); const nav = useNavigate(); const o = d.orders.find((x) => x.id === orderId)
  if (!o) return <p className="rounded-xl border border-dashed border-line p-3 text-12 text-t2">سفارش {orderId} در سامانه پیدا نشد (ممکن است سفارش خارج از سایت یا قدیمی باشد).</p>
  const delivered = o.deliveredAt ?? o.shipments.find((s) => s.status === 'ship.delivered')?.sla
  const days = delivered ? Math.round((Date.now() - new Date(delivered).getTime()) / 864e5) : null
  return (
    <div className="rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
        <p className="flex items-center gap-2 text-13 font-semibold">سفارش اصلی <span className="ltr font-mono">{o.id}</span><StatusBadge s={o.status} /></p>
        <Button size="sm" icon={<ExternalLink size={13} />} onClick={() => nav(`/admin/orders/${o.id}`)}>باز کردن سفارش</Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5 text-12 sm:grid-cols-4">
        <div><dt className="text-t2">ثبت سفارش</dt><dd className="font-medium">{fd(o.createdAt)}</dd><dd className="text-11 text-t2">{rel(o.createdAt)}</dd></div>
        <div><dt className="text-t2">تحویل</dt><dd className="font-medium">{delivered ? fd(delivered) : '—'}</dd>{days !== null && <dd className="text-11 text-t2">{fa(days)} روز پیش</dd>}</div>
        <div><dt className="text-t2">مبلغ و پرداخت</dt><dd className="font-medium tnum">{toman(o.total)}</dd><dd className="text-11 text-t2">{o.pay}</dd></div>
        <div><dt className="text-t2">کانال</dt><dd className="font-medium">{o.channel}</dd><dd className="text-11 text-t2">{o.shipments[0]?.method ?? '—'}</dd></div>
      </dl>
      <ul className="divide-y divide-line border-t border-line">{o.shipments.flatMap((s) => s.items.map((it, k) => { const p = d.products.find((x) => x.id === it.productId); const u = d.units.find((x) => x.id === it.unitId); const hit = highlight && it.unitId === highlight; return (
        <li key={`${s.id}-${k}`} className={hit ? 'flex items-center gap-3 bg-warning-bg/50 px-3 py-2' : 'flex items-center gap-3 px-3 py-2'}>
          <ProductImg pid={it.productId} size={40} /><span className="min-w-0 flex-1 text-12"><b className="block truncate">{p?.title}</b><span className="text-t2">{u ? `سریال ${u.serial} · گرید ${u.grade}` : `${fa(it.qty)} عدد`}{hit && ' · همین کالا برگشت خورده'}</span></span><span className="tnum text-12">{toman(it.price * it.qty)}</span>
        </li>) }))}</ul>
    </div>
  )
}

const CH: [string, string][] = [['تماس تلفنی', 'تماس تلفنی'], ['حضوری در شعبه', 'حضوری در شعبه'], ['واتساپ', 'واتساپ'], ['اینستاگرام دایرکت', 'اینستاگرام'], ['تلگرام', 'تلگرام'], ['ایمیل', 'ایمیل'], ['سایر', 'سایر']]
const REASONS = ['انصراف از خرید', 'مغایرت با صفحهٔ کالا', 'خرابی کالا', 'آسیب در ارسال', 'ارسال کالای اشتباه', 'کسری اقلام', 'سایر']

/** ثبت دستی مرجوعی یا گارانتی برای مشتری‌ای که تلفنی، حضوری یا در پیام‌رسان هماهنگ کرده است */
export function ManualReturn({ open, onClose, defaultKind = 'return' }: { open: boolean; onClose: () => void; defaultKind?: 'return' | 'warranty' }) {
  const d = useDB(); const chips = useQuickChips()
  const [kind, setKind] = useState<'return' | 'warranty'>(defaultKind)
  const [f, setF] = useState({ customerId: '', orderId: '', item: '', channel: 'تماس تلفنی', reason: 'خرابی کالا', note: '', dest: 'کارت بانکی', amount: '', photos: [] as string[] })
  const orders = useMemo(() => d.orders.filter((o) => !f.customerId || o.customerId === f.customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [d.orders, f.customerId])
  const o = d.orders.find((x) => x.id === f.orderId)
  const items = o ? o.shipments.flatMap((s) => s.items.map((it) => ({ key: `${it.productId}|${it.unitId}`, it }))) : []
  const sel = items.find((x) => x.key === f.item)?.it
  const reset = () => setF({ customerId: '', orderId: '', item: '', channel: 'تماس تلفنی', reason: 'خرابی کالا', note: '', dest: 'کارت بانکی', amount: '', photos: [] })
  const save = () => {
    if (!o || !sel) return toast('مشتری، سفارش و کالا را انتخاب کنید.', { tone: 'err' })
    if (!f.note.trim()) return toast('شرح درخواست را از زبان مشتری بنویسید.', { tone: 'err' })
    const by = currentUser()?.name ?? 'شما'; const now = new Date().toISOString()
    if (kind === 'return') {
      const id = `RT-${841000 + d.returns.length}`; const amount = Number(f.amount.replace(/\D/g, '')) || sel.price * sel.qty
      mutate((x) => { x.returns.unshift({ id, orderId: o.id, customerId: o.customerId, unitId: sel.unitId, productId: sel.productId, reason: f.reason, note: f.note, status: 'return.awaiting_customer', amount, dest: f.dest, createdAt: now, deadline: new Date(Date.now() + 72 * 36e5).toISOString(), channel: f.channel, photos: f.photos, by }) }, { action: `ثبت دستی مرجوعی (${f.channel})`, target: `${id} · ${o.id}` })
      toast(`مرجوعی ${id} ثبت شد. برچسب و راهنمای ارسال با پیامک برای مشتری فرستاده شد.`)
    } else {
      const id = `GR-${1850 + d.warranties.length}`
      mutate((x) => { x.warranties.unshift({ id, code: `GW-${890000 + x.warranties.length}`, customerId: o.customerId, unitId: sel.unitId, productId: sel.productId, orderId: o.id, type: 'گارانتی اختصاصی غنیمت', months: 6, status: 'warranty.pending', issue: f.note, owner: 'غنیمت', deadline: new Date(Date.now() + 48 * 36e5).toISOString(), channel: f.channel, photos: f.photos, by }) }, { action: `ثبت دستی گارانتی (${f.channel})`, target: `${id} · ${o.id}` })
      toast(`درخواست گارانتی ${id} ثبت شد و مشتری با پیامک خبردار شد.`)
    }
    reset(); onClose()
  }
  return (
    <Modal wide open={open} onClose={onClose} title="ثبت دستی مرجوعی یا گارانتی" footer={<><Button variant="primary" onClick={save}>ثبت {kind === 'return' ? 'مرجوعی' : 'گارانتی'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><Segmented value={kind} onChange={setKind} options={[['return', 'مرجوعی'], ['warranty', 'گارانتی']]} /><span className="flex items-center gap-1 text-11 text-t2"><UserRound size={12} />ثبت‌کننده: {currentUser()?.name ?? 'شما'}</span></div>
        <Field label="مشتری درخواست را از چه راهی داد؟"><div className="flex flex-wrap gap-1.5">{CH.map(([v, l]) => <button key={v} type="button" aria-pressed={f.channel === v} onClick={() => setF({ ...f, channel: v })} className={f.channel === v ? 'flex h-8 items-center gap-1 rounded-full border border-brand bg-brand-solid px-3 text-12 text-white' : 'flex h-8 items-center gap-1 rounded-full border border-line px-3 text-12'}>{v === 'تماس تلفنی' ? <PhoneCall size={12} /> : v === 'حضوری در شعبه' ? <Store size={12} /> : null}{l}</button>)}</div></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="مشتری"><Select value={f.customerId} onChange={(v) => setF({ ...f, customerId: v, orderId: '', item: '' })} chips={chips.customers} placeholder="جست‌وجوی نام یا موبایل" options={d.customers.map((c) => [c.id, `${c.name} · ${c.mobile}`] as [string, string])} /></Field>
          <Field label="سفارش"><Select value={f.orderId} onChange={(v) => { const oo = d.orders.find((x) => x.id === v); setF({ ...f, orderId: v, customerId: oo?.customerId ?? f.customerId, item: '' }) }} chips={chips.orders} placeholder="شماره یا تاریخ سفارش" options={orders.map((x) => [x.id, `${x.id} · ${fd(x.createdAt)} · ${toman(x.total)}`] as [string, string])} /></Field>
        </div>
        {o && <OriginalOrder orderId={o.id} highlight={sel?.unitId} />}
        {o && <Field label="کدام کالا؟"><Select value={f.item} onChange={(v) => setF({ ...f, item: v })} options={items.map(({ key, it }) => { const p = d.products.find((x) => x.id === it.productId); const u = d.units.find((x) => x.id === it.unitId); return [key, `${p?.title ?? it.productId}${u ? ` · سریال ${u.serial}` : ''} · ${toman(it.price)}`] as [string, string] })} /></Field>}
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === 'return' && <Field label="دلیل"><Select value={f.reason} onChange={(v) => setF({ ...f, reason: v })} options={REASONS} /></Field>}
          {kind === 'return' && <Field label="مبلغ بازگشتی (خالی = مبلغ کالا)"><Input inputMode="numeric" placeholder={sel ? String(sel.price * sel.qty) : ''} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>}
          {kind === 'return' && <Field label="مقصد بازگشت وجه"><Select value={f.dest} onChange={(v) => setF({ ...f, dest: v })} options={['کارت بانکی', 'کیف پول', 'همان روش پرداخت']} /></Field>}
        </div>
        <Field label="شرح درخواست (از زبان مشتری)"><Textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثلا: از روز دوم صدای گوشی چپ قطع و وصل می‌شود." /></Field>
        <div><p className="mb-1.5 flex items-center gap-1 text-12 font-semibold"><Camera size={13} />عکس یا ویدیوی کالا (اختیاری)</p>
          <div className="flex flex-wrap items-center gap-2">{f.photos.map((ph, i) => <span key={i} className="relative"><img src={ph} alt="" className="size-16 rounded-lg object-cover" /><button type="button" aria-label="حذف عکس" onClick={() => setF({ ...f, photos: f.photos.filter((_, j) => j !== i) })} className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-danger-solid text-white"><Trash2 size={10} /></button></span>)}
            <label className="grid size-16 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-t2 hover:border-brand/50"><Camera size={18} /><input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => { const fs = [...(e.target.files ?? [])]; const imgs = await Promise.all(fs.map((x) => fileToImage(x, 1000, 0.8))); setF((v) => ({ ...v, photos: [...v.photos, ...imgs] })) }} /></label></div></div>
        <p className="flex items-center gap-1 text-11 text-t2"><PackageCheck size={12} />بعد از ثبت، درخواست مثل درخواست‌های سایت وارد صف بازرسی می‌شود و برچسب «{f.channel}» می‌گیرد.</p>
        {kind === 'warranty' && sel && <Badge tone="info">گارانتی ۶ ماهه غنیمت · بر اساس تاریخ تحویل سفارش</Badge>}
      </div>
    </Modal>
  )
}
