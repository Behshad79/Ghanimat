import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ExternalLink, PackageCheck, PhoneCall, Store, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Segmented, Select, StatusBadge, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel, toman } from '@/shared/lib/fa'
import { ProductImg, useQuickChips } from '../pages/_shared'
import { cardState, METHODS, RETURN_REASONS, WARRANTY_REASONS } from '../returns/flow'
import { RemoteFor } from '@/shared/ui/remoteUpload'

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
/** ثبت دستی مرجوعی یا درخواست گارانتی به نیابت از مشتری (تماس، شعبه، پیام‌رسان)؛ فیلدها همان فرم مشتری در فیگماست */
export function ManualReturn({ open, onClose, defaultKind = 'return' }: { open: boolean; onClose: () => void; defaultKind?: 'return' | 'warranty' }) {
  const d = useDB(); const chips = useQuickChips()
  const [kind, setKind] = useState<'return' | 'warranty'>(defaultKind)
  const blank = { customerId: '', orderId: '', items: [] as string[], channel: 'تماس تلفنی', reason: RETURN_REASONS[0].k, wreason: WARRANTY_REASONS[0].k, note: '', method: 'post' as 'post' | 'courier' | 'inperson', refund: 'wallet' as 'wallet' | 'card', bank: '', last4: '', photos: [] as string[], terms: false }
  const [f, setF] = useState(blank)
  const orders = useMemo(() => d.orders.filter((o) => (!f.customerId || o.customerId === f.customerId) && ['order.delivered', 'order.returned'].includes(o.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [d.orders, f.customerId])
  const o = d.orders.find((x) => x.id === f.orderId)
  const all = o ? o.shipments.flatMap((s) => s.items.map((it) => ({ key: `${s.id}|${it.productId}|${it.unitId}`, it, shipId: s.id }))) : []
  const sel = all.filter((x) => f.items.includes(x.key))
  const rr = RETURN_REASONS.find((r) => r.k === f.reason)!
  const allOrder = !!o && sel.length === all.length
  const max = sel.reduce((s, x) => s + x.it.price * x.it.qty, 0) + (allOrder && f.reason !== 'انصراف از خرید' ? o?.shippingFee ?? 0 : 0)
  const card = kind === 'warranty' && sel[0] ? d.wcards.find((w) => w.unitId === sel[0].it.unitId) : undefined
  const cs = card && cardState(card)
  const save = () => {
    if (!o || !sel.length) return toast('مشتری، سفارش و کالا را انتخاب کنید.', { tone: 'err' })
    if (!f.note.trim()) return toast('شرح مشکل را از زبان مشتری بنویسید.', { tone: 'err' })
    if (/^سایر:?\s*$/.test(f.channel)) return toast('برای گزینهٔ «سایر» بنویسید منظورتان چیست.', { tone: 'err' })
    if (!f.terms) return toast('پذیرش شرایط و رویه‌ها توسط مشتری را تأیید کنید.', { tone: 'err' })
    const by = currentUser()?.name ?? 'شما'; const now = new Date().toISOString(); const ch = `ثبت دستی توسط ${by} از راه ${f.channel}`
    if (kind === 'return') {
      if (rr.photo && !f.photos.length) return toast(`برای دلیل «${f.reason}» دست‌کم یک عکس لازم است.`, { tone: 'err' })
      if (f.refund === 'card' && (!f.bank.trim() || !/^\d{4}$/.test(f.last4.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))))) return toast('بانک و چهار رقم آخر کارت به نام مشتری را وارد کنید.', { tone: 'err' })
      const id = `RT-${841000 + d.returns.length}`
      const base = o.deliveredAt ? new Date(o.deliveredAt).getTime() : Date.now()
      const deadline = new Date(Math.max(base + 7 * 864e5, Date.now() + 864e5)).toISOString()
      const dest = f.refund === 'card' ? `کارت بانکی ${f.bank} •••• ${f.last4}` : 'کیف پول غنیمت'
      mutate((x) => { x.returns.unshift({ id, orderId: o.id, customerId: o.customerId, unitId: sel[0].it.unitId, productId: sel[0].it.productId, items: sel.map((s) => ({ ...s.it, shipId: s.shipId })), reason: f.reason, note: f.note, photos: f.photos, status: f.method === 'inperson' ? 'return.awaiting_pickup' : 'return.awaiting_customer', amount: max, origShipFee: allOrder ? o.shippingFee : undefined, dest: f.refund === 'card' ? 'کارت بانکی' : 'کیف پول', refundTo: f.refund === 'card' ? { kind: 'card', bank: f.bank, last4: f.last4 } : { kind: 'wallet' }, method: f.method, branch: f.method === 'inperson' ? 'شعبهٔ سعادت‌آباد' : undefined, shipCostBy: f.reason === 'انصراف از خرید' && f.method !== 'inperson' ? 'مشتری' : 'غنیمت', createdAt: now, deadline, channel: f.channel, by,
        events: [{ at: now, by, text: `ثبت درخواست مرجوعی؛ دلیل: ${f.reason}؛ روش ارسال: ${METHODS[f.method].label}؛ بازگشت وجه: ${dest} (${ch})`, who: 'ما' }] }) }, { action: 'ثبت دستی مرجوعی', target: id })
      toast(`مرجوعی ${id} ثبت شد و راهنمای ارسال با پیامک برای مشتری فرستاده شد.`)
    } else {
      if (!card) return toast('برای این کالا کارت گارانتی صادر نشده است.', { tone: 'err' })
      if (cs && cs.status !== 'active') return toast(`این گارانتی ${cs.status === 'expired' ? 'منقضی شده' : 'نامعتبر است'}؛ درخواست ثبت نمی‌شود.`, { tone: 'err' })
      const id = `GR-${2046 + d.warranties.length}`
      mutate((x) => { x.warranties.unshift({ id, code: card.code, customerId: o.customerId, unitId: sel[0].it.unitId, productId: sel[0].it.productId, orderId: o.id, type: card.type, months: card.months, status: 'warranty.pending', reasonKind: f.wreason, issue: f.note, photos: f.photos, contact: d.customers.find((c) => c.id === o.customerId)?.mobile, owner: 'واحد گارانتی غنیمت', createdAt: now, deadline: new Date(Date.now() + 24 * 36e5).toISOString(), channel: f.channel, by,
        events: [{ at: now, by, text: `ثبت درخواست مرجوعی گارانتی (${ch})`, who: 'ما' }] }) }, { action: 'ثبت دستی درخواست گارانتی', target: id })
      toast(`درخواست ${id} ثبت شد و در صف بررسی قرار گرفت.`)
    }
    setF(blank); onClose()
  }
  const toggle = (k: string) => setF({ ...f, items: kind === 'warranty' ? [k] : f.items.includes(k) ? f.items.filter((x) => x !== k) : [...f.items, k] })
  return (
    <Modal wide open={open} onClose={onClose} title={kind === 'return' ? 'ثبت دستی مرجوعی' : 'ثبت دستی درخواست مرجوعی گارانتی'} footer={<><Button variant="primary" onClick={save}>ثبت {kind === 'return' ? 'درخواست مرجوعی' : 'درخواست گارانتی'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><Segmented value={kind} onChange={(v) => { setKind(v); setF({ ...f, items: [] }) }} options={[['return', 'مرجوعی'], ['warranty', 'گارانتی']]} /><span className="flex items-center gap-1 text-11 text-t2"><UserRound size={12} />ثبت‌کننده: {currentUser()?.name ?? 'شما'}</span></div>
        <Field label="مشتری درخواست را از چه راهی داد؟"><div className="flex flex-wrap gap-1.5">{CH.map(([v, l]) => { const on = f.channel === v || (v === 'سایر' && f.channel.startsWith('سایر')); return <button key={v} type="button" aria-pressed={on} onClick={() => setF({ ...f, channel: v === 'سایر' ? 'سایر: ' : v })} className={`h-8 rounded-full border px-3 text-12 ${on ? 'border-brand bg-brand-tint text-brand' : 'border-line'}`}>{l}</button> })}</div>{f.channel.startsWith('سایر') && <Input className="mt-2" value={f.channel.slice(5)} onChange={(e) => setF({ ...f, channel: `سایر: ${e.target.value}` })} placeholder="از چه راهی؟" />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="مشتری"><Select value={f.customerId} onChange={(v) => setF({ ...f, customerId: v, orderId: '', items: [] })} chips={chips.customers} placeholder="جست‌وجوی نام یا موبایل" options={d.customers.map((c) => [c.id, `${c.name} · ${c.mobile}`] as [string, string])} /></Field>
          <Field label="سفارش تحویل‌شده"><Select value={f.orderId} onChange={(v) => { const oo = d.orders.find((x) => x.id === v); setF({ ...f, orderId: v, customerId: oo?.customerId ?? f.customerId, items: [] }) }} chips={chips.orders} placeholder="شماره سفارش" options={orders.map((x) => [x.id, `${x.id} · ${fd(x.deliveredAt ?? x.createdAt)}`] as [string, string])} /></Field>
        </div>
        {o && <Field label={kind === 'return' ? '۱. کدام کالا را برمی‌گرداند؟' : '۱. کالای دارای گارانتی'} help={kind === 'return' ? 'فقط کالاهایی که مهلت ۷ روزهٔ مرجوعی‌شان باز است.' : undefined}>
          <ul className="space-y-1.5">{all.map(({ key, it, shipId }) => { const p = d.products.find((x) => x.id === it.productId); const u = d.units.find((x) => x.id === it.unitId); const on = f.items.includes(key)
            return <li key={key}><button type="button" aria-pressed={on} onClick={() => toggle(key)} className={`flex w-full items-center gap-3 rounded-md border p-2 text-start text-13 ${on ? 'border-brand-solid bg-brand-tint' : 'border-line'}`}><ProductImg pid={it.productId} size={36} /><span className="min-w-0 flex-1"><span className="line-clamp-1">{p?.title ?? it.productId}</span><span className="block text-12 text-t2">{shipId}{u && ` · سریال ${u.serial}`} · {fa(it.qty)} عدد</span></span><span className="tnum">{toman(it.price * it.qty)}</span></button></li> })}</ul></Field>}
        {kind === 'warranty' && sel[0] && (card ? <Badge tone={cs?.status === 'active' ? 'success' : 'danger'}>{card.code} · {card.type} · {fa(card.months)} ماه · {cs?.status === 'active' ? `${fa(cs.daysLeft)} روز تا پایان گارانتی` : cs?.status === 'expired' ? 'منقضی‌شده' : 'نامعتبر'}</Badge> : <Badge tone="danger">برای این کالا کارت گارانتی صادر نشده است</Badge>)}
        {kind === 'return' ? <Field label="۲. دلیل مرجوعی"><div className="grid gap-1.5 sm:grid-cols-2">{RETURN_REASONS.map((r) => <button key={r.k} type="button" aria-pressed={f.reason === r.k} onClick={() => setF({ ...f, reason: r.k })} className={`rounded-md border p-2 text-start ${f.reason === r.k ? 'border-brand-solid bg-brand-tint' : 'border-line'}`}><span className="block text-13 font-semibold">{r.k}</span><span className="text-12 text-t2">{r.desc}</span></button>)}</div>{f.reason === 'انصراف از خرید' && <p className="mt-1 text-12 text-warning">هزینهٔ ارسال خرید و هزینهٔ برگشت کالا با مشتری است و از مبلغ کم می‌شود.</p>}</Field>
          : <Field label="۲. دلیل مشکل"><div className="grid gap-1.5 sm:grid-cols-3">{WARRANTY_REASONS.map((r) => <button key={r.k} type="button" aria-pressed={f.wreason === r.k} onClick={() => setF({ ...f, wreason: r.k })} className={`rounded-md border p-2 text-start ${f.wreason === r.k ? 'border-brand-solid bg-brand-tint' : 'border-line'}`}><span className="block text-13 font-semibold">{r.k}</span><span className="text-12 text-t2">{r.desc}</span></button>)}</div><p className="mt-1 text-12 text-t2">آسیب پس از تحویل و انصراف از خرید شامل گارانتی نمی‌شود.</p></Field>}
        <Field label={kind === 'return' ? '۳. توضیحات و عکس' : '۳. شرح مشکل و مدارک'} help={kind === 'return' ? (rr.photo ? 'برای این دلیل دست‌کم یک عکس لازم است. حداکثر ۵ فایل.' : 'عکس اختیاری است.') : 'عکس یا ویدیوی واضح از ایراد، بررسی را دقیق‌تر می‌کند.'}><Textarea rows={3} maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مشکل از کی شروع شد و دقیقاً چه اتفاقی می‌افتد؟" /><p className="mt-1 text-11 text-t3">{fa(f.note.length)} / ۵۰۰</p></Field>
        <div className="flex flex-wrap items-center gap-2">{f.photos.map((ph, i) => <span key={i} className="relative"><img src={ph} alt="" className="size-16 rounded-lg object-cover" /><button type="button" aria-label="حذف عکس" onClick={() => setF({ ...f, photos: f.photos.filter((_, j) => j !== i) })} className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-danger-solid text-white"><Trash2 size={11} /></button></span>)}
          {f.photos.length < 5 && <label className="grid size-16 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-t2 hover:border-brand/50"><Camera size={18} /><input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={async (e) => { const fs = [...(e.target.files ?? [])].slice(0, 5 - f.photos.length); const imgs = await Promise.all(fs.map((x) => fileToImage(x))); setF((p) => ({ ...p, photos: [...p.photos, ...imgs] })) }} /><RemoteFor label="عکس مرجوعی" compact /></label>}</div>
        {kind === 'return' && <>
          <Field label="۴. ارسال کالای مرجوعی" help="کالا باید تا ۷ روز پس از تحویل سفارش تحویل پیک یا پست شود یا حضوری به شعبه برسد."><Segmented value={f.method} onChange={(v) => setF({ ...f, method: v })} options={[['inperson', 'تحویل حضوری'], ['post', 'پست (پس‌کرایه)'], ['courier', 'پیک (پس‌کرایه)']]} /></Field>
          <Field label="۵. بازگشت وجه"><Segmented value={f.refund} onChange={(v) => setF({ ...f, refund: v })} options={[['wallet', 'کیف پول غنیمت'], ['card', 'کارت بانکی به نام مشتری']]} />{f.refund === 'card' && <div className="mt-2 grid gap-2 sm:grid-cols-2"><Input value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} placeholder="بانک (مثلاً ملت)" aria-label="بانک" /><Input className="ltr" maxLength={4} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value })} placeholder="چهار رقم آخر کارت" aria-label="چهار رقم آخر کارت" /></div>}</Field>
          <div className="rounded-md bg-neutral-bg p-3 text-13"><span className="text-t2">حداکثر مبلغ قابل بازگشت: </span><b>{toman(max)}</b><span className="block text-12 text-t2">{allOrder ? 'همهٔ کالاهای سفارش؛ هزینهٔ ارسال خرید هم برمی‌گردد.' : 'هزینهٔ ارسال خرید برنمی‌گردد (بخشی از سفارش).'} مبلغ نهایی پس از بررسی کالا در مرکز کنترل کیفیت اعلام می‌شود.</span></div>
        </>}
        <label className="flex items-center gap-2 text-13"><input type="checkbox" checked={f.terms} onChange={(e) => setF({ ...f, terms: e.target.checked })} />مشتری {kind === 'return' ? 'شرایط و رویه‌های مرجوعی' : 'شرایط پوشش این گارانتی'} را پذیرفت.</label>
        <p className="flex items-center gap-1 text-11 text-t2"><PackageCheck size={12} />درخواست مثل درخواست‌های سایت وارد همان روند می‌شود و برچسب «{f.channel}» می‌گیرد.</p>
      </div>
    </Modal>
  )
}
