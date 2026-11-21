// ثبت مرسولهٔ پستی در تاپین: برآورد هزینه از روی وزن و شهر، ثبت سفارش (order/post/register) و دریافت بارکد ۲۴ رقمی همان لحظه، چاپ برچسب پستی
import { useRef, useState } from 'react'
import { Printer, Send } from 'lucide-react'
import { Badge, Button, Field, Input, Segmented, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { Barcode } from '@/shared/ui/codes'
import { printSolo } from '@/shared/lib/printSolo'
import { currentUser, fakeCall, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { Order, Shipment } from '@/shared/data/seed'
import { rollShipped } from './Progress'
import { shipBlocked } from './PayHold'

/** برآورد هزینهٔ پست پیشتاز یا سفارشی (نمونه؛ در نسخهٔ واقعی از order/post/check-price/ گرفته می‌شود) */
export const tapinPrice = (grams: number, sameProvince: boolean, priority: boolean, insured: number) => Math.round(((priority ? 68000 : 45000) + Math.max(0, Math.ceil((grams - 500) / 500)) * (priority ? 18000 : 12000) + (sameProvince ? 0 : 22000) + insured * 0.002) / 1000) * 1000
const barcodeFor = (sid: string) => { const h = [...sid].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11); return `1204${String(h).padStart(10, '0').slice(0, 10)}${String(Date.now()).slice(-10)}`.slice(0, 24) }

export function TapinButton({ o, s }: { o: Order; s: Shipment }) {
  const d = useDB(); const T = d.delivery.tapin; const [open, setOpen] = useState(false)
  if (!T?.on || !/پست/.test(s.method) || ['ship.delivered', 'ship.cancelled'].includes(s.status)) return null
  return <><Button size="sm" variant={s.tracking ? 'ghost' : 'primary'} icon={<Send size={12} />} onClick={() => setOpen(true)}>{s.tracking && s.trackingCarrier?.includes('تاپین') ? 'برچسب پستی تاپین' : 'ثبت در تاپین و بارکد پستی'}</Button>{open && <TapinModal o={o} s={s} onClose={() => setOpen(false)} />}</>
}

function TapinModal({ o, s, onClose }: { o: Order; s: Shipment; onClose: () => void }) {
  const d = useDB(); const T = d.delivery.tapin; const c = d.customers.find((x) => x.id === o.customerId); const ref = useRef<HTMLDivElement>(null)
  const done = !!s.tracking && !!s.trackingCarrier?.includes('تاپین')
  const value = s.items.reduce((a, it) => a + it.price * it.qty, 0)
  const [f, setF] = useState({ weight: s.items.reduce((a, it) => a + it.qty, 0) * T.defaultWeight + T.boxWeight, priority: T.orderType === 1, insured: T.insurance, handed: true, cod: false })
  const fromCity = s.warehouse === 'tehran' ? T.sender.city : d.stock.warehouses.find((w) => w.id === s.warehouse)?.city ?? T.sender.city
  const same = (c?.city ?? '') === fromCity
  const price = tapinPrice(f.weight, same, f.priority, f.insured ? value : 0)
  const [busy, setBusy] = useState(false)
  const register = async () => {
    if (shipBlocked(o.id)) return
    if (!f.cod && T.payType === 1 && T.balance < price) { toast(`موجودی کیف پول تاپین (${toman(T.balance)}) کمتر از هزینهٔ ارسال است؛ از تنظیمات تاپین شارژ کنید.`, { tone: 'err' }); return }
    setBusy(true); try { await fakeCall(true, 800) } catch { /* نمونه */ } setBusy(false)
    const barcode = barcodeFor(s.id); const by = currentUser()?.name ?? 'پنل'
    mutate((x) => { const oo = x.orders.find((y) => y.id === o.id)!; const sh = oo.shipments.find((y) => y.id === s.id)!
      sh.tracking = barcode; sh.trackingCarrier = `پست ${f.priority ? 'پیشتاز' : 'سفارشی'} (تاپین)`; sh.trackingUrl = `https://tracking.post.ir/?id=${barcode}`
      if (f.handed && ['ship.pending', 'ship.picking', 'ship.packed', 'ship.handed'].includes(sh.status)) { sh.status = 'ship.in_transit'; rollShipped(oo) }
      const t = x.delivery.tapin; if (!f.cod && t.payType === 1) t.balance -= price
      t.log.unshift({ at: new Date().toISOString(), orderId: o.id, shipId: s.id, barcode, price, ok: true, msg: 'order/post/register: ثبت شد، آمادهٔ ارسال', by }) },
    { action: 'ثبت مرسوله در تاپین', target: s.id, after: `${barcode} · ${price}` })
    if (c) sendSms(c.mobile, `غنیمت: مرسولهٔ ${s.id} با پست ${f.priority ? 'پیشتاز' : 'سفارشی'} ثبت شد. کد رهگیری: ${barcode} · tracking.post.ir`, 'وضعیت سفارش', o.id, c.id)
    toast(`بارکد پستی ${barcode} صادر شد${f.handed ? '؛ سفارش «ارسال‌شده» شد' : ''} و کد رهگیری برای مشتری پیامک شد.`) }
  return <Modal open onClose={onClose} title={`تاپین · مرسولهٔ ${s.id}`} footer={done ? <><Button variant="primary" icon={<Printer size={14} />} onClick={() => printSolo(ref.current)}>چاپ برچسب پستی</Button><Button variant="ghost" onClick={onClose}>بستن</Button></> : <><Button variant="primary" icon={<Send size={14} />} disabled={busy} onClick={() => void register()}>{busy ? 'در حال ثبت…' : `ثبت و دریافت بارکد (${toman(price)})`}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    {!done ? <div className="space-y-3 text-12">
      <div className="grid gap-2 rounded-xl bg-neutral-bg p-3 sm:grid-cols-2"><p><span className="text-t2">گیرنده:</span> {o.receiver?.name ?? c?.name} · {c?.mobile}</p><p><span className="text-t2">شهر:</span> {c?.city ?? '—'}{same ? ' (درون‌استانی)' : ' (برون‌استانی)'}</p><p><span className="text-t2">ارزش کالا:</span> {toman(value)}</p><p><span className="text-t2">کیف پول تاپین:</span> {toman(T.balance)}</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="نوع ارسال"><Segmented value={f.priority ? '1' : '0'} onChange={(v) => setF({ ...f, priority: v === '1' })} options={[['1', 'پیشتاز'], ['0', 'سفارشی']]} /></Field><Field label="وزن بسته (گرم)"><Input type="number" className="ltr text-left" value={f.weight} onChange={(e) => setF({ ...f, weight: Math.max(50, +e.target.value) })} /></Field></div>
      <div className="flex flex-wrap gap-4"><Toggle on={f.insured} onChange={(v) => setF({ ...f, insured: v })} text="بیمهٔ مرسوله به ارزش کالا" /><Toggle on={f.handed} onChange={(v) => setF({ ...f, handed: v })} text="بسته همین حالا تحویل باجه یا نامه‌رسان می‌شود" /></div>
      <p className="rounded-lg bg-info-bg px-3 py-2 text-info">هزینهٔ برآوردی: <b>{toman(price)}</b> از کیف پول تاپین کم می‌شود. بعد از ثبت، بارکد ۲۴ رقمی همان لحظه صادر می‌شود، روی مرسوله می‌نشیند و برای مشتری پیامک می‌شود{f.handed ? '؛ سفارش هم «ارسال‌شده» می‌شود و گام بعدی «تحویل» است' : ''}.</p>
    </div> : <div ref={ref} className="space-y-2 rounded-xl border-2 border-dashed border-line p-4 text-center text-12">
      <p className="font-bold">پست جمهوری اسلامی ایران · {s.trackingCarrier}</p>
      <Barcode value={s.tracking!} height={52} />
      <div className="grid grid-cols-2 gap-2 text-right"><div className="rounded-lg bg-neutral-bg p-2"><b className="block">فرستنده</b>{T.sender.name}{s.warehouse !== 'tehran' ? ` · ${d.stock.warehouses.find((w) => w.id === s.warehouse)?.name ?? ''}` : ''}<br />{s.warehouse !== 'tehran' ? `${d.stock.warehouses.find((w) => w.id === s.warehouse)?.city ?? ''}، شعبهٔ غنیمت` : T.sender.address}<br />{s.warehouse === 'tehran' && `کد پستی ${T.sender.postal}`}</div><div className="rounded-lg bg-neutral-bg p-2"><b className="block">گیرنده</b>{o.receiver?.name ?? c?.name} · {c?.mobile}<br />{c?.city}<br />سفارش {o.id}</div></div>
      <Badge tone="success">ثبت‌شده در تاپین</Badge>
    </div>}
  </Modal>
}

/** تنظیمات اتصال تاپین */
export function TapinSettings() {
  const d = useDB(); const T = d.delivery.tapin; const [busy, setBusy] = useState(false)
  const up = (fn: (t: typeof T) => void, action: string) => mutate((x) => fn(x.delivery.tapin), { action, target: 'تاپین' })
  return <div className="space-y-4 text-12">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"><Toggle on={T.on} onChange={(v) => up((t) => { t.on = v }, v ? 'فعال‌سازی اتصال تاپین' : 'بستن اتصال تاپین')} text={T.on ? 'اتصال تاپین فعال است' : 'اتصال تاپین بسته است'} /><Badge tone={T.on ? 'success' : 'neutral'}>{T.on ? 'متصل' : 'بسته'}</Badge><span className="text-t2">کیف پول: <b className="text-t1">{toman(T.balance)}</b></span>
      <Button size="sm" variant="ghost" className="mr-auto" disabled={busy} onClick={async () => { setBusy(true); try { await fakeCall(true, 700) } catch { /* نمونه */ } setBusy(false); up((t) => { t.lastSync = new Date().toISOString() }, 'آزمایش اتصال تاپین'); toast('اتصال سالم است (shop/detail ← ۲۰۰).') }}>آزمایش اتصال</Button>
      <Button size="sm" onClick={() => toast('لینک پرداخت شارژ کیف پول از transaction/indirect/new ساخته و در برگهٔ تازه باز می‌شود.')}>شارژ کیف پول</Button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="کلید API (Authorization)" help="از پنل تاپین؛ فقط سمت سرور نگه‌داری و در درخواست‌ها ارسال می‌شود"><Input type="password" className="ltr text-left font-mono" value={T.token} onChange={(e) => up((t) => { t.token = e.target.value }, 'تغییر کلید تاپین')} /></Field>
      <Field label="شناسهٔ فروشگاه (shop_id)"><Input className="ltr text-left font-mono" value={T.shopId} onChange={(e) => up((t) => { t.shopId = e.target.value }, 'تغییر shop_id تاپین')} /></Field>
      <Field label="نوع ارسال پیش‌فرض"><Segmented value={String(T.orderType)} onChange={(v) => up((t) => { t.orderType = +v as 0 | 1 }, 'تغییر نوع ارسال تاپین')} options={[['1', 'پیشتاز'], ['0', 'سفارشی']]} /></Field>
      <Field label="پرداخت هزینهٔ پست"><Segmented value={String(T.payType)} onChange={(v) => up((t) => { t.payType = +v as 0 | 1 | 2 | 3 }, 'تغییر پرداخت هزینهٔ تاپین')} options={[['1', 'از کیف پول'], ['2', 'پس‌کرایه'], ['0', 'پرداخت در محل'], ['3', 'رایگان']]} /></Field>
      <Field label="وزن پیش‌فرض هر کالا (گرم)"><Input type="number" className="ltr text-left" value={T.defaultWeight} onChange={(e) => up((t) => { t.defaultWeight = +e.target.value }, 'تغییر وزن پیش‌فرض تاپین')} /></Field>
      <Field label="وزن کارتن (گرم)"><Input type="number" className="ltr text-left" value={T.boxWeight} onChange={(e) => up((t) => { t.boxWeight = +e.target.value }, 'تغییر وزن کارتن تاپین')} /></Field>
      <Field label="نام فرستنده"><Input value={T.sender.name} onChange={(e) => up((t) => { t.sender.name = e.target.value }, 'تغییر فرستندهٔ تاپین')} /></Field>
      <Field label="کد پستی فرستنده"><Input className="ltr text-left" value={T.sender.postal} onChange={(e) => up((t) => { t.sender.postal = e.target.value }, 'تغییر فرستندهٔ تاپین')} /></Field>
      <div className="sm:col-span-2"><Field label="نشانی فرستنده"><Input value={T.sender.address} onChange={(e) => up((t) => { t.sender.address = e.target.value }, 'تغییر فرستندهٔ تاپین')} /></Field></div>
    </div>
    <div className="flex flex-wrap gap-4"><Toggle on={T.insurance} onChange={(v) => up((t) => { t.insurance = v }, 'تغییر بیمهٔ تاپین')} text="بیمهٔ مرسوله به ارزش کالا" /><Toggle on={T.autoOnPack} onChange={(v) => up((t) => { t.autoOnPack = v }, 'تغییر ثبت خودکار تاپین')} text="بعد از بسته‌بندی، مرسولهٔ پستی خودکار در تاپین ثبت شود" /></div>
    <div className="rounded-xl bg-neutral-bg p-3 text-11 text-t2"><p className="mb-1 font-semibold text-t1">مسیرهای API که سرور استفاده می‌کند (POST با بدنهٔ JSON، پایه: api.tapin.ir/api/v2/public/)</p><p className="ltr text-left font-mono leading-6">order/post/check-price/ · order/post/register/ · order/post/detail/ · order/post/change-status/ (status 80 = حذف) · order/post/change-status/report/ · transaction/credit/ · state/tree/</p><p className="mt-1">تاپین وب‌هوک وضعیت ندارد؛ سرور هر ۳۰ دقیقه گزارش تغییر وضعیت را می‌خواند و مرسوله‌های «تحویل شده» (کد ۷) را خودکار «تحویل مشتری» ثبت می‌کند.</p></div>
    {T.log.length > 0 && <div><p className="mb-1 font-semibold">آخرین ثبت‌ها</p><ul className="space-y-1">{T.log.slice(0, 8).map((l, i) => <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"><Badge tone={l.ok ? 'success' : 'danger'} dot={false}>{l.ok ? 'موفق' : 'خطا'}</Badge><span className="font-mono">{l.orderId}</span><bdi dir="ltr" className="font-mono text-11">{l.barcode}</bdi>{l.price ? <span>{toman(l.price)}</span> : null}<span className="text-t2">{l.by} · {new Date(l.at).toLocaleString('fa-IR')}</span></li>)}</ul></div>}
  </div>
}
export { fa }
