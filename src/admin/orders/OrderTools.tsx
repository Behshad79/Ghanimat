import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Scissors, Trash2, UserPlus } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { getDB, mutate, snapshot, useDB, currentUser, sendSms } from '@/shared/lib/store'
import { WAREHOUSE } from '@/shared/data/statuses'
import { SHIPPED } from './History'
import { fa, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'
import { ProductImg, useQuickChips } from '../pages/_shared'
import { createRefund } from './Refunds'

const METHODS = [['تحویل سریع (پیک)', 150000], ['پست پیشتاز', 90000], ['تیپاکس', 140000], ['باربری', 450000], ['دریافت حضوری از شعبه', 0]] as const
type Line = { pid: string; uid: string; qty: number; price: number }
const available = () => { const d = getDB(); return d.products.filter((p) => p.status === 'product.published').flatMap((p) => p.mode === 'qty' ? [{ pid: p.id, uid: '', label: p.title, price: p.price ?? 0, wh: (p.qty?.tehran ?? 0) > 0 ? 'tehran' : 'mahabad' }] : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').map((u) => ({ pid: p.id, uid: u.id, label: `${p.title} · ${u.color} · ${u.condition === 'sealed' ? 'اکبند' : u.condition === 'openbox' ? 'جعبه‌باز' : 'استوک'}`, price: u.price, wh: u.warehouse }))) }

/** ثبت سفارش دستی (تلفنی یا حضوری): مشتری موجود یا تازه، کالاها، نشانی، روش ارسال، روش پرداخت */
export const PAYS: Record<string, string> = { link: 'لینک پرداخت', pos: 'پرداخت حضوری (کارت‌خوان)', wallet: 'کیف پول', c2c: 'کارت به کارت' }
export const CHANNELS = ['سفارش دستی', 'اینستاگرام دایرکت', 'واتساپ', 'تلگرام', 'بله', 'تلفنی', 'حضوری در شعبه']
export function ManualOrder({ open, onClose, channel: ch0 = 'سفارش دستی' }: { open: boolean; onClose: () => void; channel?: string }) {
  const d = useDB(); const nav = useNavigate(); const qc = useQuickChips()
  const [cid, setCid] = useState('c1'); const [isNew, setIsNew] = useState(false); const [nc, setNc] = useState({ name: '', mobile: '', city: 'تهران', street: '', alley: '', plaque: '', postal: '' })
  const [lines, setLines] = useState<Line[]>([]); const [method, setMethod] = useState<string>('پست پیشتاز'); const [pay, setPay] = useState('link'); const [discount, setDiscount] = useState(0); const [cnote, setCnote] = useState(''); const [note, setNote] = useState(''); const [channel, setChannel] = useState(ch0); const [handle, setHandle] = useState(''); const [rcpt, setRcpt] = useState({ last4: '', ref: '', time: '' })
  const opts = useMemo(available, [d.units, d.products])
  const sub = lines.reduce((a, l) => a + l.price * l.qty, 0); const ship = METHODS.find((m) => m[0] === method)?.[1] ?? 0; const total = Math.max(0, sub + ship - discount)
  const submit = () => {
    if (!lines.length) return toast('دست‌کم یک کالا اضافه کنید.', { tone: 'err' })
    if (isNew && (!nc.name.trim() || !/^09\d{9}$/.test(nc.mobile))) return toast('نام و موبایل ۱۱ رقمی مشتری تازه را وارد کنید.', { tone: 'err' })
    const id = `GH-${10500 + d.orders.length}`; const custId = isNew ? `c${Date.now().toString(36)}` : cid
    const byWh = new Map<string, Line[]>(); lines.forEach((l) => { const w = opts.find((o) => o.pid === l.pid && o.uid === l.uid)?.wh ?? 'tehran'; byWh.set(w, [...(byWh.get(w) ?? []), l]) })
    mutate((x) => {
      if (isNew) x.customers.unshift({ ...x.customers[1], id: custId, name: nc.name, mobile: nc.mobile, email: '', city: nc.city, orders: 0, ltv: 0, aov: 0, segment: 'جدید', source: 'سفارش دستی', wallet: 0, tags: [], addr: { province: nc.city, city: nc.city, district: '', street: nc.street, sub: '', alley: nc.alley, plaque: nc.plaque, floor: '', unit: '', postal: nc.postal } } as any)
      x.orders.unshift({ id, customerId: custId, createdAt: new Date().toISOString(), status: pay === 'link' || pay === 'c2c' ? 'order.awaiting_payment' : 'order.paid', pay: PAYS[pay] ?? pay, total, discount, shippingFee: ship, fee: 0, margin: 15, risk: 5, channel, tags: [channel, ...(handle ? [`شناسه: ${handle}`] : []), ...(note ? ['یادداشت'] : [])], lockedBy: null,
        shipments: [...byWh.entries()].map(([w, ls], i) => ({ id: `${id}-${i + 1}`, warehouse: w, method: w === 'mahabad' && /تحویل سریع|پیک/.test(method) ? 'پست پیشتاز' : method, shipFee: i === 0 ? ship : 0, status: 'ship.pending', sla: new Date(Date.now() + (/سریع/.test(method) ? 2 : 48) * 36e5).toISOString(), items: ls.map((l) => ({ productId: l.pid, unitId: l.uid, qty: l.qty, price: l.price })), courier: null, tracking: '', allocReason: w === 'mahabad' ? 'فقط در انبار مهاباد موجود بود.' : 'موجودی تهران کافی بود.' })) }); { const oo = x.orders.find((y) => y.id === id)!; if (cnote.trim()) oo.customerNote = cnote.trim(); if (note.trim()) oo.notes = [{ id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), by: currentUser()?.name ?? 'کارشناس', src: 'داخلی', text: note.trim() }] }
      // ثبت هم‌زمان در مالی: تراکنش و (برای کارت به کارت) رسید در صف تطبیق
      x.txns.unshift({ id: `TX-${Date.now().toString(36).slice(-6).toUpperCase()}`, orderId: id, amount: total, gateway: PAYS[pay] ?? pay, ref: pay === 'c2c' ? rcpt.ref : '', status: pay === 'pos' || pay === 'wallet' || pay === 'cod' ? 'pay.success' : 'pay.unknown', at: new Date().toISOString() } as any)
      if (pay === 'c2c') x.bank.receipts.unshift({ id: `RC-${Date.now().toString(36).slice(-5).toUpperCase()}`, orderId: id, customer: isNew ? nc.name : x.customers.find((c) => c.id === cid)?.name ?? '', amount: total, last4: rcpt.last4, ref: rcpt.ref, time: rcpt.time, channel, status: 'در انتظار تطبیق', note: '', at: new Date().toISOString() })
      lines.forEach((l) => { if (l.uid) x.units.find((u) => u.id === l.uid)!.status = 'unit.reserved'; else { const p = x.products.find((y) => y.id === l.pid)!; if (p.qty) p.qty.tehran = Math.max(0, p.qty.tehran - l.qty) } })
    }, { action: 'ثبت سفارش دستی', target: id, after: toman(total) })
    toast(pay === 'link' ? `سفارش ${id} ثبت شد و لینک پرداخت برای مشتری پیامک شد.` : pay === 'c2c' ? `سفارش ${id} ثبت شد؛ فاکتور صادر و رسید کارت به کارت به صف تطبیق رفت. تا تطبیق، ارسال قفل است.` : `سفارش ${id} ثبت شد و تراکنش در مالی ثبت شد.`); onClose(); setLines([]); nav(`/admin/orders/${id}`)
  }
  return (
    <Modal open={open} onClose={onClose} wide title="ثبت سفارش دستی" footer={<><Button variant="primary" onClick={submit}>{pay === 'link' ? `ثبت و ارسال لینک پرداخت ${toman(total)}` : `ثبت سفارش ${toman(total)}`}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-5">
        <section><div className="mb-2 flex items-center justify-between"><p className="text-13 font-semibold">مشتری</p><Button size="sm" variant="ghost" icon={<UserPlus size={13} />} onClick={() => setIsNew(!isNew)}>{isNew ? 'انتخاب از مشتریان' : 'مشتری تازه'}</Button></div>
          {isNew ? <div className="grid gap-3 sm:grid-cols-3"><Field label="نام و نام خانوادگی"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field><Field label="موبایل"><Input className="ltr text-left font-mono" inputMode="numeric" value={nc.mobile} onChange={(e) => setNc({ ...nc, mobile: e.target.value.replace(/\D/g, '') })} placeholder="09…" /></Field><Field label="شهر"><Input value={nc.city} onChange={(e) => setNc({ ...nc, city: e.target.value })} /></Field><Field label="خیابان"><Input value={nc.street} onChange={(e) => setNc({ ...nc, street: e.target.value })} /></Field><Field label="کوچه و پلاک"><Input value={nc.alley} onChange={(e) => setNc({ ...nc, alley: e.target.value })} /></Field><Field label="کد پستی"><Input className="ltr text-left font-mono" value={nc.postal} onChange={(e) => setNc({ ...nc, postal: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field></div>
            : <Select chips={qc.customers} value={cid} onChange={setCid} options={d.customers.map((c) => [c.id, `${c.name} · ${c.city}`])} />}
        </section>
        <section><p className="mb-2 text-13 font-semibold">کالاها</p>
          <Select value="" onChange={(v) => { const o = opts.find((x) => `${x.pid}|${x.uid}` === v); if (!o) return; if (lines.some((l) => l.uid && l.uid === o.uid)) return toast('این واحد قبلاً اضافه شده است.', { tone: 'err' }); setLines([...lines, { pid: o.pid, uid: o.uid, qty: 1, price: o.price }]) }} options={[['', 'افزودن کالا…'], ...opts.map((o) => [`${o.pid}|${o.uid}`, `${o.label} · ${toman(o.price)}`] as [string, string])]} />
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">{lines.map((l, i) => <li key={i} className="flex items-center gap-3 px-3 py-2"><ProductImg pid={l.pid} size={40} /><span className="min-w-0 flex-1 truncate text-13">{d.products.find((p) => p.id === l.pid)?.title}</span>{!l.uid && <span className="flex items-center gap-1"><Button size="sm" aria-label="کم" icon={<Minus size={12} />} onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} /><b className="tnum w-6 text-center">{fa(l.qty)}</b><Button size="sm" aria-label="زیاد" icon={<Plus size={12} />} onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))} /></span>}<b className="tnum text-13">{toman(l.price * l.qty)}</b><Button size="sm" variant="ghost" aria-label="حذف" icon={<Trash2 size={13} />} onClick={() => setLines(lines.filter((_, j) => j !== i))} /></li>)}{!lines.length && <li className="px-3 py-4 text-center text-12 text-t2">هنوز کالایی اضافه نشده است.</li>}</ul>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="روش ارسال"><Select value={method} onChange={setMethod} options={METHODS.map(([m, f]) => [m, `${m} · ${f ? toman(f) : 'رایگان'}`])} /></Field>
          <Field label="کانال فروش"><Select value={channel} onChange={setChannel} options={CHANNELS} /></Field>
          {channel !== 'سفارش دستی' && <Field label="شناسهٔ مشتری در کانال" help="آیدی اینستاگرام/تلگرام یا شمارهٔ واتساپ و بله؛ برای پیگیری گفتگو."><Input className="ltr text-left" placeholder="@username" value={handle} onChange={(e) => setHandle(e.target.value)} /></Field>}
          <Field label="روش پرداخت"><Select value={pay} onChange={setPay} options={Object.entries(PAYS)} /></Field>
          {pay === 'c2c' && <div className="grid grid-cols-3 gap-2 sm:col-span-2"><Field label="۴ رقم آخر کارت مبدأ"><Input className="ltr text-left" maxLength={4} value={rcpt.last4} onChange={(e) => setRcpt({ ...rcpt, last4: e.target.value.replace(/\D/g, '') })} /></Field><Field label="شمارهٔ پیگیری رسید"><Input className="ltr text-left" value={rcpt.ref} onChange={(e) => setRcpt({ ...rcpt, ref: e.target.value })} /></Field><Field label="ساعت واریز"><Input type="time" className="ltr" value={rcpt.time} onChange={(e) => setRcpt({ ...rcpt, time: e.target.value })} /></Field></div>}
          <Field label="تخفیف دستی (تومان)"><Input className="ltr text-left font-mono" value={discount ? discount.toLocaleString('en-US') : ''} onChange={(e) => setDiscount(Number(e.target.value.replace(/\D/g, '')))} /></Field>
          <Field label="درخواست مشتری برای این سفارش" help="روی سفارش، برگهٔ جمع‌آوری و پرتال شعبه نمایش داده می‌شود."><Input value={cnote} onChange={(e) => setCnote(e.target.value)} placeholder="مثلاً کادو شود، فاکتور داخل بسته نباشد" /></Field>
          <Field label="یادداشت داخلی"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="flex justify-between rounded-lg bg-neutral-bg px-4 py-3 text-13"><span>کالاها {toman(sub)} + ارسال {toman(ship)} − تخفیف {toman(discount)}</span><b className="tnum">{toman(total)}</b></div>
      </div>
    </Modal>
  )
}

/** ویرایش کامل سفارش ثبت‌شده (تماس مشتری یا تصمیم داخلی): انبار و روش و هزینهٔ ارسال هر مرسوله، قیمت، رنگ یا تنوع و تعداد هر قلم،
 *  افزودن، حذف، تقسیم و جابه‌جایی قلم، نشانی و تحویل‌گیرنده، تخفیف؛ با منبع و دلیل، تسویهٔ مابه‌التفاوت و پیامک اختیاری به مشتری */
const SRC = ['تماس تلفنی مشتری', 'پیام‌رسان یا دایرکت', 'حضوری', 'تصمیم داخلی غنیمت']
const NOTE_SRC: Record<string, 'تماس تلفنی' | 'پیام‌رسان' | 'حضوری' | 'داخلی'> = { 'تماس تلفنی مشتری': 'تماس تلفنی', 'پیام‌رسان یا دایرکت': 'پیام‌رسان', 'حضوری': 'حضوری', 'تصمیم داخلی غنیمت': 'داخلی' }
const addrText = (a?: Record<string, string>) => (a ? [a.province, a.city, a.district, a.street, a.sub, a.alley, a.plaque && `پلاک ${a.plaque}`, a.floor && `طبقه ${a.floor}`, a.unit && `واحد ${a.unit}`, a.postal && `کد پستی ${a.postal}`].filter(Boolean).join('، ') : '')
export function OrderEdit({ o, onClose }: { o: Order | null; onClose: () => void }) {
  const d = useDB(); const opts = useMemo(available, [d.units, d.products])
  const [draft, setDraft] = useState<Order | null>(null)
  const c = o ? d.customers.find((x) => x.id === o.customerId) : undefined
  const [src, setSrc] = useState(SRC[0]); const [reason, setReason] = useState(''); const [sms, setSms] = useState(true); const [smsEdit, setSmsEdit] = useState<string | null>(null)
  const [settle, setSettle] = useState('')
  useMemo(() => { setDraft(o ? { ...structuredClone(o), shipTo: o.shipTo ?? addrText(c?.addr as any), receiver: o.receiver ?? { name: o.buyer === 'legal' ? '' : c?.name ?? '', mobile: c?.mobile ?? '' } } : null); setReason(''); setSmsEdit(null); setSettle('') }, [o?.id])
  if (!o || !draft) return null
  const editable = (sid: string) => !SHIPPED.includes(draft.shipments.find((s) => s.id === sid)?.status ?? '')
  const live = (x: Order) => x.shipments.flatMap((s) => s.items.filter((i) => !i.cancelled))
  const sum = (x: Order) => x.shipments.reduce((a, s) => a + s.items.filter((i) => !i.cancelled).reduce((b, i) => b + i.price * i.qty, 0) + (s.shipFee ?? 0), 0) - (x.discount ?? 0)
  const diff = sum(draft) - sum(o)
  const P = (pid: string) => d.products.find((p) => p.id === pid)
  const vName = (pid: string, vid?: string) => { const v = P(pid)?.variations?.find((x) => x.id === vid); return v ? Object.values(v.opts).join(' · ') : '' }
  const setShip = (si: number, fn: (s: Order['shipments'][number]) => void) => setDraft((dr) => { const n = structuredClone(dr!); fn(n.shipments[si]); return n })
  const setItem = (si: number, ii: number, fn: (it: Order['shipments'][number]['items'][number]) => void) => setShip(si, (s) => fn(s.items[ii]))

  /* فهرست تغییرها برای لاگ، یادداشت سفارش و پیامک */
  const changes: string[] = []
  draft.shipments.forEach((s) => {
    const b = o.shipments.find((x) => x.id === s.id)
    if (!b) { changes.push(`مرسولهٔ تازهٔ ${s.id} (${WAREHOUSE[s.warehouse] ?? s.warehouse}، ${s.method})`); return }
    if (b.warehouse !== s.warehouse) changes.push(`انبار ارسال ${s.id}: ${WAREHOUSE[b.warehouse] ?? b.warehouse} ← ${WAREHOUSE[s.warehouse] ?? s.warehouse}`)
    if (b.method !== s.method) changes.push(`روش ارسال ${s.id}: ${b.method} ← ${s.method}`)
    if ((b.shipFee ?? 0) !== (s.shipFee ?? 0)) changes.push(`هزینهٔ ارسال ${s.id}: ${toman(b.shipFee ?? 0)} ← ${toman(s.shipFee ?? 0)}`)
  })
  const key = (i: { productId: string; unitId: string; variationId?: string }) => `${i.productId}|${i.unitId}`
  const before = live(o); const after = live(draft)
  after.forEach((i) => { const b = before.find((x) => key(x) === key(i)); const t = P(i.productId)?.title ?? i.productId
    if (!b) changes.push(`افزودن ${t}${i.variationId ? ` (${vName(i.productId, i.variationId)})` : ''} × ${fa(i.qty)}`)
    else { if (b.qty !== i.qty) changes.push(`تعداد ${t}: ${fa(b.qty)} ← ${fa(i.qty)}`); if (b.price !== i.price) changes.push(`قیمت ${t}: ${toman(b.price)} ← ${toman(i.price)}`); if ((b.variationId ?? '') !== (i.variationId ?? '')) changes.push(`تنوع ${t}: ${vName(i.productId, b.variationId) || 'پیش‌فرض'} ← ${vName(i.productId, i.variationId)}`) } })
  before.filter((b) => !after.some((i) => key(i) === key(b))).forEach((b) => changes.push(`حذف ${P(b.productId)?.title ?? b.productId}`))
  if ((o.shipTo ?? addrText(c?.addr as any)) !== draft.shipTo) changes.push(`نشانی ارسال: ${draft.shipTo}`)
  if (o.receiver ? o.receiver.name !== draft.receiver?.name || o.receiver.mobile !== draft.receiver?.mobile : (draft.receiver?.name !== (c?.name ?? '') || draft.receiver?.mobile !== (c?.mobile ?? ''))) changes.push(`تحویل‌گیرنده: ${draft.receiver?.name} · ${draft.receiver?.mobile}`)
  if ((o.discount ?? 0) !== (draft.discount ?? 0)) changes.push(`تخفیف سفارش: ${toman(o.discount ?? 0)} ← ${toman(draft.discount ?? 0)}`)
  const settleOpts = diff > 0 ? ['ارسال لینک پرداخت مابه‌التفاوت', 'کارت به کارت توسط مشتری', 'دریافت شد (کارت‌خوان یا کارت به کارت)', 'رایگان؛ بر عهدهٔ غنیمت'] : diff < 0 ? ['بازگشت به کیف پول', 'بازگشت به کارت بانکی', 'بازگشت به همان روش پرداخت'] : []
  const how = settle || settleOpts[0] || ''
  const autoSms = `غنیمت: ${src === 'تصمیم داخلی غنیمت' ? 'سفارش' : 'طبق درخواست شما، سفارش'} ${o.id} ویرایش شد. ${changes.slice(0, 3).join('؛ ')}${changes.length > 3 ? ` و ${fa(changes.length - 3)} تغییر دیگر` : ''}. مبلغ نهایی: ${toman(sum(draft))}.${diff > 0 ? (how.startsWith('ارسال لینک') ? ` لینک پرداخت ${toman(diff)} برایتان ارسال شد؛ ارسال سفارش پس از پرداخت انجام می‌شود.` : how.startsWith('کارت به کارت') ? ` لطفاً ${toman(diff)} را کارت به کارت کنید و رسید را بفرستید؛ ارسال سفارش پس از تأیید پرداخت انجام می‌شود.` : '') : diff < 0 ? ` ${toman(-diff)} ${how.replace('بازگشت به', 'به')} برمی‌گردد.` : ''}`
  const smsText = smsEdit ?? autoSms

  const save = async () => {
    if (!after.length) return toast('سفارش بدون قلم نمی‌ماند؛ برای حذف همهٔ اقلام، سفارش را لغو کنید.', { tone: 'err' })
    if (!changes.length) return toast('تغییری ثبت نشده است.', { tone: 'err' })
    if (reason.trim().length < 3) return toast('دلیل یا توضیح ویرایش را بنویسید (برای سوابق).', { tone: 'err' })
    if (!(await confirm({ title: `ثبت ${fa(changes.length)} تغییر در سفارش ${o.id}؟`, body: `${changes.join('\n')}${diff ? `\nمابه‌التفاوت: ${diff > 0 ? '+' : '−'}${toman(Math.abs(diff))} · ${how}` : ''}${sms ? '\nپیامک تغییرات برای مشتری ارسال می‌شود.' : '\nپیامکی ارسال نمی‌شود.'}`, confirm: 'ثبت تغییرها' }))) return
    const undo = snapshot(); const who = currentUser()?.name ?? 'کاربر'
    mutate((x) => {
      const cur = x.orders.find((y) => y.id === o.id)!
      cur.shipments.flatMap((s) => s.items).filter((i) => i.unitId && !draft.shipments.some((s) => s.items.some((j) => j.unitId === i.unitId))).forEach((i) => { const u = x.units.find((y) => y.id === i.unitId); if (u) u.status = 'unit.published' })
      draft.shipments.flatMap((s) => s.items).filter((i) => i.unitId).forEach((i) => { const u = x.units.find((y) => y.id === i.unitId); if (u && u.status === 'unit.published') u.status = 'unit.reserved' })
      const next = structuredClone(draft); next.shipments = next.shipments.filter((s) => s.items.length); next.total = sum(next)
      if (diff < 0) createRefund(x, { orderId: o.id, customerId: o.customerId, amount: -diff, source: 'ویرایش سفارش', dest: how === 'بازگشت به کیف پول' ? 'کیف پول' : how === 'بازگشت به کارت بانکی' ? 'شبا (پایا)' : 'بازگشت به حساب مبدأ' })
      next.notes = [...(next.notes ?? []), { id: `N-${Date.now().toString(36)}`, at: new Date().toISOString(), by: who, src: NOTE_SRC[src], text: `ویرایش سفارش (${src}): ${reason.trim()} · ${changes.join('؛ ')}` }]
      if (diff > 0 && (how.startsWith('ارسال لینک') || how.startsWith('کارت به کارت'))) next.payHold = { amount: diff + (o.payHold?.status === 'pending' ? o.payHold.amount : 0), method: how.startsWith('ارسال لینک') ? 'لینک پرداخت' : 'کارت به کارت', at: new Date().toISOString(), by: who, status: 'pending' }
      next.edits = [...(next.edits ?? []), { at: new Date().toISOString(), by: who, src, reason: reason.trim(), changes, diff, settle: diff ? how : undefined, sms, prev: JSON.stringify({ ...cur, edits: undefined, rollbacks: undefined, notes: undefined }) }]
      x.orders[x.orders.findIndex((y) => y.id === o.id)] = next
    }, { action: 'ویرایش سفارش', target: o.id, before: toman(sum(o)), after: `${toman(sum(draft))} · ${changes.join('؛ ')}` })
    if (sms && c) sendSms(c.mobile, smsText, 'وضعیت سفارش', o.id, c.id)
    toast(`${fa(changes.length)} تغییر ثبت شد${sms ? ' و برای مشتری پیامک رفت' : '؛ پیامکی ارسال نشد'}.`, { undo }); onClose()
  }

  return (
    <Drawer open onClose={onClose} width={680} title={`ویرایش سفارش ${o.id}`} footer={<><Button variant="primary" onClick={() => void save()}>ثبت تغییرها{changes.length ? ` (${fa(changes.length)})` : ''}{diff ? ` · ${diff > 0 ? '+' : '−'}${toman(Math.abs(diff))}` : ''}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-4">
        {draft.shipments.every((s) => !editable(s.id)) && <p className="rounded-xl bg-warning-bg px-3 py-2 text-12 text-warning">همهٔ مرسوله‌های این سفارش به پیک یا پست تحویل شده‌اند؛ اقلام، قیمت و ارسال دیگر قابل تغییر نیست. در موارد بحرانی، مدیر کل می‌تواند از کارت مرسوله وضعیت را به مرحلهٔ قبل برگرداند.</p>}
        <div className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
          <Field label="درخواست از کجا آمد؟"><Select value={src} other={false} onChange={setSrc} options={SRC.map((x) => [x, x] as [string, string])} /></Field>
          <Field label="دلیل یا توضیح (برای سوابق)"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً مشتری تلفنی رنگ را عوض کرد" /></Field>
        </div>

        {draft.shipments.map((s, si) => { const ed = editable(s.id); return (
          <div key={s.id} className="rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><b className="ltr font-mono text-13">{s.id}</b>{ed ? <Badge tone="info">قابل ویرایش</Badge> : <Badge>ارسال‌شده؛ فقط مشاهده</Badge>}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="انبار ارسال (مبدأ)"><Select value={s.warehouse} other={false} onChange={(v) => ed && setShip(si, (x) => { x.warehouse = v; x.allocReason = `تغییر دستی انبار: ${reason || src}` })} options={Object.entries(WAREHOUSE).map(([k, v]) => [k, v] as [string, string])} /></Field>
              <Field label="روش ارسال"><Select value={s.method} onChange={(v) => { if (!ed) return; const f = METHODS.find((m) => m[0] === v)?.[1]; setShip(si, (x) => { x.method = v; if (f !== undefined) x.shipFee = f }) }} options={[...new Set([s.method, ...METHODS.map(([m]) => m)])]} /></Field>
              <Field label="هزینهٔ ارسال (تومان)"><Input className="ltr" inputMode="numeric" disabled={!ed} value={String(s.shipFee ?? 0)} onChange={(e) => setShip(si, (x) => { x.shipFee = Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
            </div>
            <ul className="mt-2 divide-y divide-line">{s.items.map((it, ii) => { if (it.cancelled) return null; const p = P(it.productId); const vars = p?.variations?.filter((v) => v.enabled) ?? []; const orig = o.shipments.find((x) => x.id === s.id)?.items[ii]; const serial = !!it.unitId
              return <li key={ii} className="space-y-2 py-2.5">
                <div className="flex items-center gap-2"><ProductImg pid={it.productId} size={36} /><span className="min-w-0 flex-1 truncate text-12 font-medium">{p?.title}</span>
                  {ed && s.items.length > 1 && <Button size="sm" variant="ghost" title="تقسیم به مرسولهٔ جدا" aria-label="تقسیم به مرسولهٔ جدا" icon={<Scissors size={13} />} onClick={() => setDraft((dr) => { const n = structuredClone(dr!); const [m] = n.shipments[si].items.splice(ii, 1); n.shipments.push({ ...structuredClone(n.shipments[si]), id: `${o.id}-${n.shipments.length + 1}`, items: [m], shipFee: 0, status: 'ship.pending' }); return n })} />}
                  {ed && <Button size="sm" variant="ghost" aria-label={`حذف ${p?.title ?? 'قلم'}`} icon={<Trash2 size={13} />} onClick={() => setShip(si, (x) => { x.items.splice(ii, 1) })} />}</div>
                {ed && <div className="flex flex-wrap items-end gap-2">
                  {vars.length > 0 && <Field label="رنگ یا تنوع"><Select className="w-44" value={it.variationId ?? ''} other={false} onChange={(v) => setItem(si, ii, (x) => { x.variationId = v; const vv = vars.find((q) => q.id === v); if (vv?.price) x.price = vv.sale ?? vv.price })} options={[['', 'پیش‌فرض'], ...vars.map((v) => [v.id, Object.values(v.opts).join(' · ')] as [string, string])]} /></Field>}
                  <Field label="تعداد"><span className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="کم کردن تعداد" disabled={it.qty <= 1} icon={<Minus size={12} />} onClick={() => setItem(si, ii, (x) => { x.qty = Math.max(1, x.qty - 1) })} /><b className="tnum w-6 text-center text-13">{fa(it.qty)}</b><Button size="sm" variant="ghost" aria-label="زیاد کردن تعداد" disabled={serial} title={serial ? 'کالای سریال‌دار: برای تعداد بیشتر واحد تازه اضافه کنید' : undefined} icon={<Plus size={12} />} onClick={() => setItem(si, ii, (x) => { x.qty += 1 })} /></span></Field>
                  <Field label="قیمت واحد (تومان)"><Input className="ltr w-36" inputMode="numeric" value={String(it.price)} onChange={(e) => setItem(si, ii, (x) => { x.listPrice ??= orig?.price ?? x.price; x.price = Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
                  {draft.shipments.length > 1 && <Field label="انتقال به مرسوله"><Select className="w-36" value={s.id} other={false} onChange={(v) => setDraft((dr) => { const n = structuredClone(dr!); const [m] = n.shipments[si].items.splice(ii, 1); n.shipments.find((q) => q.id === v)!.items.push(m); return n })} options={draft.shipments.filter((q) => editable(q.id)).map((q) => [q.id, q.id] as [string, string])} /></Field>}
                  <b className="tnum mr-auto text-12">{toman(it.price * it.qty)}{orig && orig.price !== it.price && <s className="mr-1 font-normal text-t3">{toman(orig.price * it.qty)}</s>}</b>
                </div>}
              </li> })}</ul>
            {ed && <Select className="mt-2" value="" onChange={(v) => { const op = opts.find((x) => `${x.pid}|${x.uid}` === v); if (!op) return; setShip(si, (x) => { x.items.push({ productId: op.pid, unitId: op.uid, qty: 1, price: op.price }) }) }} options={[['', 'افزودن کالا به این مرسوله…'], ...opts.map((x) => [`${x.pid}|${x.uid}`, `${x.label} · ${toman(x.price)}`] as [string, string])]} />}
          </div>) })}

        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-12 font-semibold">نشانی و تحویل‌گیرنده</p>
          <Field label="نشانی ارسال این سفارش"><Textarea rows={2} value={draft.shipTo ?? ''} onChange={(e) => setDraft({ ...draft, shipTo: e.target.value })} /></Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="نام تحویل‌گیرنده"><Input value={draft.receiver?.name ?? ''} onChange={(e) => setDraft({ ...draft, receiver: { name: e.target.value, mobile: draft.receiver?.mobile ?? '' } })} /></Field>
            <Field label="موبایل تحویل‌گیرنده"><Input className="ltr" inputMode="tel" value={draft.receiver?.mobile ?? ''} onChange={(e) => setDraft({ ...draft, receiver: { name: draft.receiver?.name ?? '', mobile: e.target.value } })} /></Field>
            <Field label="تخفیف سفارش (تومان)"><Input className="ltr" inputMode="numeric" value={String(draft.discount ?? 0)} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
          </div>
          <p className="text-11 text-t3">این نشانی فقط روی همین سفارش اعمال می‌شود و دفترچهٔ نشانی مشتری تغییر نمی‌کند.</p>
        </div>

        <div className={cx('rounded-xl px-4 py-3 text-13', diff > 0 ? 'bg-warning-bg' : diff < 0 ? 'bg-success-bg' : 'bg-neutral-bg')}>
          <p className={diff > 0 ? 'text-warning' : diff < 0 ? 'text-success' : 'text-t2'}>{diff > 0 ? `مشتری باید ${toman(diff)} دیگر بپردازد.` : diff < 0 ? `${toman(-diff)} به مشتری برمی‌گردد.` : 'مبلغ سفارش تغییری نکرده است.'} مبلغ نهایی: <b>{toman(sum(draft))}</b></p>
          {diff !== 0 && <Field label="تسویهٔ مابه‌التفاوت"><Segmented size="sm" value={how} onChange={setSettle} options={settleOpts.map((x) => [x, x] as [string, string])} /></Field>}
          {diff > 0 && (how.startsWith('ارسال لینک') || how.startsWith('کارت به کارت')) && <p className="mt-2 flex items-center gap-1.5 text-12 text-danger"><b>قفل ارسال:</b> تا پرداخت تأیید نشود یا شما اجازه ندهید، این سفارش جمع‌آوری، بسته‌بندی و ارسال نمی‌شود.</p>}
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="mb-1 text-12 font-semibold">تغییرهای این ویرایش ({fa(changes.length)})</p>
          {changes.length ? <ul className="list-disc space-y-0.5 pr-5 text-12 text-t2">{changes.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-12 text-t3">هنوز چیزی تغییر نکرده است.</p>}
          <div className="mt-3 border-t border-line pt-3"><Toggle on={sms} onChange={setSms} text="پیامک تغییرات برای مشتری ارسال شود" />
            {sms && <Field label="متن پیامک (قابل ویرایش)"><Textarea rows={3} value={smsText} onChange={(e) => setSmsEdit(e.target.value)} /></Field>}
            {sms && smsEdit !== null && <button type="button" className="text-11 text-brand" onClick={() => setSmsEdit(null)}>بازگشت به متن خودکار</button>}
          </div>
        </div>

        {(o.edits?.length ?? 0) > 0 && <div className="rounded-xl bg-neutral-bg p-3 text-12"><p className="mb-1 font-semibold">ویرایش‌های قبلی</p><ul className="space-y-1">{o.edits!.slice().reverse().map((e, i) => <li key={i}><b>{new Date(e.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</b> · {e.by} · {e.src} · {e.reason}<span className="block text-t2">{e.changes.join('؛ ')}{e.diff ? ` · ${e.diff > 0 ? '+' : '−'}${toman(Math.abs(e.diff))} (${e.settle})` : ''} · {e.sms ? 'پیامک شد' : 'بدون پیامک'}</span></li>)}</ul></div>}
      </div>
    </Drawer>
  )
}

/** ویرایش نشانی مرسولهٔ ارسال‌نشده */
export function AddressEdit({ o, onClose }: { o: Order | null; onClose: () => void }) {
  const d = useDB(); const c = o ? d.customers.find((x) => x.id === o.customerId) : undefined
  const [a, setA] = useState<any>(null)
  useMemo(() => setA(c?.addr ? { ...c.addr } : null), [o?.id])
  if (!o || !c || !a) return null
  const shipped = o.shipments.every((s) => !['ship.pending', 'ship.picking', 'ship.packed', 'ship.partner_confirm'].includes(s.status))
  const F = (k: string, l: string, ltr?: boolean) => <Field label={l}><Input className={ltr ? 'ltr text-left font-mono' : ''} value={a[k] ?? ''} onChange={(e) => setA({ ...a, [k]: e.target.value })} /></Field>
  return (
    <Drawer open onClose={onClose} title={`ویرایش نشانی ${o.id}`} footer={<><Button variant="primary" disabled={shipped} onClick={() => { if (!/^\d{10}$/.test(a.postal)) return toast('کد پستی باید ۱۰ رقم باشد.', { tone: 'err' }); const undo = snapshot(); mutate((x) => { x.customers.find((y) => y.id === c.id)!.addr = a }, { action: 'ویرایش نشانی سفارش', target: o.id }); toast('نشانی ذخیره شد؛ برچسب‌های چاپ‌نشده با نشانی تازه چاپ می‌شوند.', { undo }); onClose() }}>ذخیرهٔ نشانی</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      {shipped ? <p className="rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">همهٔ مرسوله‌ها ارسال شده‌اند؛ نشانی دیگر قابل تغییر نیست.</p> : <div className="grid grid-cols-2 gap-3">{F('province', 'استان')}{F('city', 'شهر')}{F('district', 'منطقه یا محله')}{F('street', 'خیابان اصلی')}{F('sub', 'خیابان فرعی')}{F('alley', 'کوچه')}{F('plaque', 'پلاک')}{F('floor', 'طبقه')}{F('unit', 'واحد')}{F('postal', 'کد پستی', true)}</div>}
    </Drawer>
  )
}

/** نوشتن پیام به مشتری (پیامک یا پیام‌رسان) با پیش‌نویس */
export function MessageModal({ to, draft, onClose }: { to: { name: string; mobile: string } | null; draft: string; onClose: () => void }) {
  const [text, setText] = useState(draft); const [ch, setCh] = useState('پیامک')
  useMemo(() => setText(draft), [draft, to?.mobile])
  if (!to) return null
  return (
    <Modal open onClose={onClose} title={`پیام به ${to.name}`} footer={<><Button variant="primary" onClick={() => { if (!text.trim()) return toast('متن پیام خالی است.', { tone: 'err' }); mutate(() => {}, { action: `ارسال ${ch} به مشتری`, target: to.name, after: text.slice(0, 40) }); toast(`${ch} برای ${to.name} ارسال شد.`); onClose() }}>ارسال {ch}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-3"><Segmented size="sm" value={ch} onChange={setCh} options={[['پیامک', 'پیامک'], ['بله', 'بله'], ['ایمیل', 'ایمیل']]} /><Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} /><p className="text-11 text-t2">{fa(text.length)} نویسه{ch === 'پیامک' && ` · ${fa(Math.ceil(text.length / 70) || 1)} پیامک`}</p></div>
    </Modal>
  )
}
/** تماس: روی موبایل شماره‌گیر باز می‌شود؛ شماره هم نمایش داده می‌شود */
/** تماس خروجی از تلفن ابری: در سابقهٔ تماس‌ها ثبت می‌شود (با مشتری و کارشناس) و روی دستگاه، شماره‌گیر باز می‌شود */
export const callTo = (mobile: string, name: string) => {
  const by = currentUser()?.name ?? 'کارشناس'
  mutate((x) => { const c = x.customers.find((y) => y.mobile === mobile); (x.calls?.calls as any[])?.unshift({ id: `CL-${Date.now().toString(36).slice(-4).toUpperCase()}`, dir: 'out', number: mobile, customerId: c?.id, agent: by, queue: 'تماس خروجی', status: 'پاسخ‌داده', waitSec: 0, durSec: 0, at: new Date().toISOString(), recording: true, note: `تماس از پنل با ${name}` }) }, { action: 'تماس تلفنی', target: name })
  try { window.location.href = `tel:${mobile}` } catch { /* */ }
  toast(`در حال تماس با ${name} (${fa(mobile)})؛ تماس در «تلفن و تماس‌ها» ثبت شد و ضبط می‌شود.`)
}
