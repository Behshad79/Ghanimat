import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Scissors, Trash2, UserPlus } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select, Textarea } from '@/shared/ui/base'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { getDB, mutate, snapshot, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'

const METHODS = [['تحویل سریع (پیک)', 150000], ['پیک غنیمت', 95000], ['پست پیشتاز', 90000], ['تیپاکس', 140000], ['باربری', 450000], ['دریافت حضوری از شعبه', 0]] as const
type Line = { pid: string; uid: string; qty: number; price: number }
const available = () => { const d = getDB(); return d.products.filter((p) => p.status === 'product.published').flatMap((p) => p.mode === 'qty' ? [{ pid: p.id, uid: '', label: p.title, price: p.price ?? 0, wh: (p.qty?.tehran ?? 0) > 0 ? 'tehran' : 'mahabad' }] : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').map((u) => ({ pid: p.id, uid: u.id, label: `${p.title} · ${u.color} · ${u.condition === 'sealed' ? 'اکبند' : u.condition === 'openbox' ? 'جعبه‌باز' : 'استوک'}`, price: u.price, wh: u.warehouse }))) }

/** ثبت سفارش دستی (تلفنی یا حضوری): مشتری موجود یا تازه، کالاها، نشانی، روش ارسال، روش پرداخت */
export function ManualOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate()
  const [cid, setCid] = useState('c1'); const [isNew, setIsNew] = useState(false); const [nc, setNc] = useState({ name: '', mobile: '', city: 'تهران', street: '', alley: '', plaque: '', postal: '' })
  const [lines, setLines] = useState<Line[]>([]); const [method, setMethod] = useState<string>('پست پیشتاز'); const [pay, setPay] = useState('link'); const [discount, setDiscount] = useState(0); const [note, setNote] = useState('')
  const opts = useMemo(available, [d.units, d.products])
  const sub = lines.reduce((a, l) => a + l.price * l.qty, 0); const ship = METHODS.find((m) => m[0] === method)?.[1] ?? 0; const total = Math.max(0, sub + ship - discount)
  const submit = () => {
    if (!lines.length) return toast('دست‌کم یک کالا اضافه کنید.', { tone: 'err' })
    if (isNew && (!nc.name.trim() || !/^09\d{9}$/.test(nc.mobile))) return toast('نام و موبایل ۱۱ رقمی مشتری تازه را وارد کنید.', { tone: 'err' })
    const id = `GH-${10500 + d.orders.length}`; const custId = isNew ? `c${Date.now().toString(36)}` : cid
    const byWh = new Map<string, Line[]>(); lines.forEach((l) => { const w = opts.find((o) => o.pid === l.pid && o.uid === l.uid)?.wh ?? 'tehran'; byWh.set(w, [...(byWh.get(w) ?? []), l]) })
    mutate((x) => {
      if (isNew) x.customers.unshift({ ...x.customers[1], id: custId, name: nc.name, mobile: nc.mobile, email: '', city: nc.city, orders: 0, ltv: 0, aov: 0, segment: 'جدید', source: 'سفارش دستی', wallet: 0, tags: [], addr: { province: nc.city, city: nc.city, district: '', street: nc.street, sub: '', alley: nc.alley, plaque: nc.plaque, floor: '', unit: '', postal: nc.postal } } as any)
      x.orders.unshift({ id, customerId: custId, createdAt: new Date().toISOString(), status: pay === 'link' ? 'order.awaiting_payment' : 'order.paid', pay: pay === 'link' ? 'لینک پرداخت' : pay === 'pos' ? 'پرداخت حضوری (کارت‌خوان)' : 'کیف پول', total, discount, shippingFee: ship, fee: 0, margin: 15, risk: 5, channel: 'سفارش دستی', tags: ['سفارش دستی', ...(note ? ['یادداشت'] : [])], lockedBy: null,
        shipments: [...byWh.entries()].map(([w, ls], i) => ({ id: `${id}-${i + 1}`, warehouse: w, method: w === 'mahabad' && /تحویل سریع|پیک/.test(method) ? 'پست پیشتاز' : method, shipFee: i === 0 ? ship : 0, status: 'ship.pending', sla: new Date(Date.now() + (/سریع/.test(method) ? 2 : 48) * 36e5).toISOString(), items: ls.map((l) => ({ productId: l.pid, unitId: l.uid, qty: l.qty, price: l.price })), courier: null, tracking: '', allocReason: w === 'mahabad' ? 'فقط در انبار مهاباد موجود بود.' : 'موجودی تهران کافی بود.' })) })
      lines.forEach((l) => { if (l.uid) x.units.find((u) => u.id === l.uid)!.status = 'unit.reserved'; else { const p = x.products.find((y) => y.id === l.pid)!; if (p.qty) p.qty.tehran = Math.max(0, p.qty.tehran - l.qty) } })
    }, { action: 'ثبت سفارش دستی', target: id, after: toman(total) })
    toast(pay === 'link' ? `سفارش ${id} ثبت شد و لینک پرداخت برای مشتری پیامک شد.` : `سفارش ${id} ثبت و پرداخت حضوری ثبت شد.`); onClose(); setLines([]); nav(`/admin/orders/${id}`)
  }
  return (
    <Modal open={open} onClose={onClose} wide title="ثبت سفارش دستی" footer={<><Button variant="primary" onClick={submit}>{pay === 'link' ? `ثبت و ارسال لینک پرداخت ${toman(total)}` : `ثبت سفارش ${toman(total)}`}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-5">
        <section><div className="mb-2 flex items-center justify-between"><p className="text-13 font-semibold">مشتری</p><Button size="sm" variant="ghost" icon={<UserPlus size={13} />} onClick={() => setIsNew(!isNew)}>{isNew ? 'انتخاب از مشتریان' : 'مشتری تازه'}</Button></div>
          {isNew ? <div className="grid gap-3 sm:grid-cols-3"><Field label="نام و نام خانوادگی"><Input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field><Field label="موبایل"><Input className="ltr text-left font-mono" inputMode="numeric" value={nc.mobile} onChange={(e) => setNc({ ...nc, mobile: e.target.value.replace(/\D/g, '') })} placeholder="09…" /></Field><Field label="شهر"><Input value={nc.city} onChange={(e) => setNc({ ...nc, city: e.target.value })} /></Field><Field label="خیابان"><Input value={nc.street} onChange={(e) => setNc({ ...nc, street: e.target.value })} /></Field><Field label="کوچه و پلاک"><Input value={nc.alley} onChange={(e) => setNc({ ...nc, alley: e.target.value })} /></Field><Field label="کد پستی"><Input className="ltr text-left font-mono" value={nc.postal} onChange={(e) => setNc({ ...nc, postal: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field></div>
            : <Select value={cid} onChange={setCid} options={d.customers.map((c) => [c.id, `${c.name} · ${c.city}`])} />}
        </section>
        <section><p className="mb-2 text-13 font-semibold">کالاها</p>
          <Select value="" onChange={(v) => { const o = opts.find((x) => `${x.pid}|${x.uid}` === v); if (!o) return; if (lines.some((l) => l.uid && l.uid === o.uid)) return toast('این واحد قبلاً اضافه شده است.', { tone: 'err' }); setLines([...lines, { pid: o.pid, uid: o.uid, qty: 1, price: o.price }]) }} options={[['', 'افزودن کالا…'], ...opts.map((o) => [`${o.pid}|${o.uid}`, `${o.label} · ${toman(o.price)}`] as [string, string])]} />
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">{lines.map((l, i) => <li key={i} className="flex items-center gap-3 px-3 py-2"><ProductImg pid={l.pid} size={40} /><span className="min-w-0 flex-1 truncate text-13">{d.products.find((p) => p.id === l.pid)?.title}</span>{!l.uid && <span className="flex items-center gap-1"><Button size="sm" aria-label="کم" icon={<Minus size={12} />} onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} /><b className="tnum w-6 text-center">{fa(l.qty)}</b><Button size="sm" aria-label="زیاد" icon={<Plus size={12} />} onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))} /></span>}<b className="tnum text-13">{toman(l.price * l.qty)}</b><Button size="sm" variant="ghost" aria-label="حذف" icon={<Trash2 size={13} />} onClick={() => setLines(lines.filter((_, j) => j !== i))} /></li>)}{!lines.length && <li className="px-3 py-4 text-center text-12 text-t2">هنوز کالایی اضافه نشده است.</li>}</ul>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="روش ارسال"><Select value={method} onChange={setMethod} options={METHODS.map(([m, f]) => [m, `${m} · ${f ? toman(f) : 'رایگان'}`])} /></Field>
          <Field label="روش پرداخت"><Segmented size="sm" value={pay} onChange={setPay} options={[['link', 'لینک پرداخت'], ['pos', 'پرداخت حضوری'], ['wallet', 'کیف پول']]} /></Field>
          <Field label="تخفیف دستی (تومان)"><Input className="ltr text-left font-mono" value={discount ? discount.toLocaleString('en-US') : ''} onChange={(e) => setDiscount(Number(e.target.value.replace(/\D/g, '')))} /></Field>
          <Field label="یادداشت داخلی"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="flex justify-between rounded-lg bg-neutral-bg px-4 py-3 text-13"><span>کالاها {toman(sub)} + ارسال {toman(ship)} − تخفیف {toman(discount)}</span><b className="tnum">{toman(total)}</b></div>
      </div>
    </Modal>
  )
}

/** ویرایش سفارش ثبت‌شده: افزودن یا حذف قلم با محاسبهٔ مابه‌التفاوت، تغییر روش ارسال، تقسیم مرسوله */
export function OrderEdit({ o, onClose }: { o: Order | null; onClose: () => void }) {
  const d = useDB(); const opts = useMemo(available, [d.units, d.products])
  const [draft, setDraft] = useState<Order | null>(null)
  useMemo(() => setDraft(o ? structuredClone(o) : null), [o?.id])
  if (!o || !draft) return null
  const editable = (sid: string) => ['ship.pending', 'ship.picking', 'ship.partner_confirm'].includes(draft.shipments.find((s) => s.id === sid)!.status)
  const sum = (x: Order) => x.shipments.reduce((a, s) => a + s.items.reduce((b, i) => b + i.price * i.qty, 0) + (s.shipFee ?? 0), 0) - x.discount
  const diff = sum(draft) - sum(o)
  const save = async () => {
    if (!draft.shipments.some((s) => s.items.length)) return toast('سفارش بدون قلم نمی‌ماند؛ برای حذف همهٔ اقلام، سفارش را لغو کنید.', { tone: 'err' })
    if (diff !== 0 && !(await confirm({ title: diff > 0 ? `دریافت ${toman(diff)} از مشتری؟` : `بازگشت ${toman(-diff)} به مشتری؟`, body: diff > 0 ? 'لینک پرداخت مابه‌التفاوت با پیامک برای مشتری ارسال می‌شود.' : 'مابه‌التفاوت به کیف پول مشتری واریز می‌شود.', confirm: diff > 0 ? 'ذخیره و ارسال لینک پرداخت' : 'ذخیره و بازگشت وجه' }))) return
    const undo = snapshot()
    mutate((x) => {
      const before = x.orders.find((y) => y.id === o.id)!
      before.shipments.flatMap((s) => s.items).filter((i) => i.unitId && !draft.shipments.some((s) => s.items.some((j) => j.unitId === i.unitId))).forEach((i) => (x.units.find((u) => u.id === i.unitId)!.status = 'unit.published'))
      draft.shipments.flatMap((s) => s.items).filter((i) => i.unitId).forEach((i) => { const u = x.units.find((y) => y.id === i.unitId)!; if (u.status === 'unit.published') u.status = 'unit.reserved' })
      draft.total = sum(draft); draft.shipments = draft.shipments.filter((s) => s.items.length)
      if (diff < 0) x.customers.find((c) => c.id === o.customerId)!.wallet += -diff
      x.orders[x.orders.findIndex((y) => y.id === o.id)] = draft
    }, { action: 'ویرایش سفارش', target: o.id, before: toman(sum(o)), after: toman(sum(draft)) })
    toast(diff > 0 ? `سفارش ویرایش شد؛ لینک پرداخت ${toman(diff)} برای مشتری رفت.` : diff < 0 ? `سفارش ویرایش شد؛ ${toman(-diff)} به کیف پول مشتری برگشت.` : 'سفارش ویرایش شد.', { undo }); onClose()
  }
  return (
    <Drawer open onClose={onClose} width={560} title={`ویرایش سفارش ${o.id}`} footer={<><Button variant="primary" onClick={save}>ذخیرهٔ تغییرها{diff ? ` (${diff > 0 ? '+' : '−'}${toman(Math.abs(diff))})` : ''}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-4">
        {draft.shipments.map((s, si) => (
          <div key={s.id} className="rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><b className="ltr font-mono text-13">{s.id}</b>{editable(s.id) ? <Badge tone="info">قابل ویرایش</Badge> : <Badge>ارسال‌شده؛ فقط مشاهده</Badge>}</div>
            <Field label="روش ارسال"><Select value={s.method} onChange={(v) => { if (!editable(s.id)) return; const f = METHODS.find((m) => m[0] === v)?.[1] ?? 0; setDraft({ ...draft, shipments: draft.shipments.map((x, j) => (j === si ? { ...x, method: v, shipFee: f } : x)) }) }} options={METHODS.map(([m]) => m)} /></Field>
            <ul className="mt-2 divide-y divide-line">{s.items.map((it, ii) => <li key={ii} className="flex items-center gap-2 py-2"><ProductImg pid={it.productId} size={36} /><span className="min-w-0 flex-1 truncate text-12">{d.products.find((p) => p.id === it.productId)?.title}{it.qty > 1 && ` × ${fa(it.qty)}`}</span><b className="tnum text-12">{toman(it.price * it.qty)}</b>
              {editable(s.id) && s.items.length > 1 && <Button size="sm" variant="ghost" title="تقسیم به مرسولهٔ جدا" aria-label="تقسیم" icon={<Scissors size={13} />} onClick={() => setDraft({ ...draft, shipments: [...draft.shipments.map((x, j) => (j === si ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x)), { ...s, id: `${o.id}-${draft.shipments.length + 1}`, items: [it], shipFee: 0, status: 'ship.pending' }] })} />}
              {editable(s.id) && <Button size="sm" variant="ghost" aria-label="حذف قلم" icon={<Trash2 size={13} />} onClick={() => setDraft({ ...draft, shipments: draft.shipments.map((x, j) => (j === si ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x)) })} />}</li>)}</ul>
            {editable(s.id) && <Select className="mt-2" value="" onChange={(v) => { const op = opts.find((x) => `${x.pid}|${x.uid}` === v); if (!op) return; setDraft({ ...draft, shipments: draft.shipments.map((x, j) => (j === si ? { ...x, items: [...x.items, { productId: op.pid, unitId: op.uid, qty: 1, price: op.price }] } : x)) }) }} options={[['', 'افزودن قلم به این مرسوله…'], ...opts.map((x) => [`${x.pid}|${x.uid}`, `${x.label} · ${toman(x.price)}`] as [string, string])]} />}
          </div>))}
        <div className={cx('rounded-lg px-4 py-3 text-13', diff > 0 ? 'bg-warning-bg text-warning' : diff < 0 ? 'bg-success-bg text-success' : 'bg-neutral-bg text-t2')}>{diff > 0 ? `مشتری باید ${toman(diff)} دیگر بپردازد.` : diff < 0 ? `${toman(-diff)} به مشتری برمی‌گردد.` : 'مبلغ سفارش تغییری نکرده است.'}</div>
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
export const callTo = (mobile: string, name: string) => { mutate(() => {}, { action: 'تماس تلفنی', target: name }); try { window.location.href = `tel:${mobile}` } catch { /* */ } toast(`تماس با ${name}: ${fa(mobile)}`) }
