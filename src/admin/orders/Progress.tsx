import { useState } from 'react'
import { Check, Truck } from 'lucide-react'
import { Button, cx, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, sendSms, useDB } from '@/shared/lib/store'
import type { Order, Shipment } from '@/shared/data/seed'
import { fa, jday } from '@/shared/lib/fa'

export const STEPS = ['ثبت سفارش', 'آماده‌سازی', 'در حال ارسال', 'تحویل شده'] as const
/** مرحلهٔ نوار پیشرفت پنل مشتری، خودکار از وضعیت مرسوله */
export const PICKUP_STEPS = ['ثبت سفارش', 'آماده‌سازی', 'آماده در شعبه', 'تحویل حضوری'] as const
export const stepOf = (s: Shipment) => ['ship.delivered'].includes(s.status) ? 3 : ['ship.handed', 'ship.in_transit', 'ship.pickup_ready'].includes(s.status) ? 2 : ['ship.picking', 'ship.packed'].includes(s.status) ? 1 : 0

/** پلاک خودروی ایرانی: دو رقم، حرف، سه رقم، کد استان */
export function Plate({ v }: { v: string }) {
  const m = v.match(/^(\S{2})\s*(\S)\s*(\S{3})\s*ایران\s*(\S{2})$/)
  if (!m) return <span className="rounded-md border border-line px-2 py-0.5 text-12">{v || 'پلاک ثبت نشده'}</span>
  return <span dir="ltr" className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-[#10123d] bg-white text-13 font-bold text-[#10123d]"><span className="bg-[#0b3fbd] px-1 text-[8px] leading-6 text-white">IR</span><span className="px-1.5 leading-6">{m[1]}</span><span className="px-1 leading-6">{m[2]}</span><span className="px-1.5 leading-6">{m[3]}</span><span className="flex flex-col border-l-2 border-[#10123d] px-1 text-center text-[8px] leading-3"><span>ایران</span><b className="text-11">{m[4]}</b></span></span>
}
const COMPANIES = ['اسنپ‌باکس', 'الوپیک', 'تیپاکس', 'پست پیشتاز']
const LETTERS = ['الف', 'ب', 'پ', 'ت', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ل', 'م', 'ن', 'و', 'ه', 'ی', 'ژ']

/** نمای همان چیزی که مشتری در «سفارش‌های جاری» می‌بیند + ثبت مأمور ارسال و پلاک */
export function CustomerProgress({ o, s }: { o: Order; s: Shipment }) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId); const step = stepOf(s); const pickup = /حضوری/.test(s.method); const pu = d.pickups.find((x) => x.orderId === o.id); const post = /پست|تیپاکس|باربری/.test(s.method); const [trk, setTrk] = useState(false); const [chg, setChg] = useState(false)
  const [edit, setEdit] = useState(false); const [f, setF] = useState({ company: s.courier?.company ?? (/اسنپ/.test(s.method) ? 'اسنپ‌باکس' : 'الوپیک'), name: s.courier?.name ?? '', phone: s.courier?.phone ?? '', p1: '', l: 'ب', p2: '', r: '', url: s.trackingUrl ?? '' }); const [reading, setReading] = useState(false)
  // خواندن اطلاعات مأمور از لینک رصد سفر (اسنپ‌باکس، الوپیک، تپسی‌باکس)؛ نتیجه قابل اصلاح دستی است
  const readLink = async () => { const u = f.url.trim(); const prov = /snapp/i.test(u) ? 'اسنپ‌باکس' : /alopeyk/i.test(u) ? 'الوپیک' : /tapsi/i.test(u) ? 'تپسی‌باکس' : ''; if (!/^https?:\/\//.test(u) || !prov) return toast('لینک رصد اسنپ‌باکس، الوپیک یا تپسی‌باکس را کامل بچسبانید.', { tone: 'err' }); setReading(true); try { await fakeCall(true, 900); const h = [...u].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 99991, 7); const names = ['محمد نوری', 'رضا احمدی', 'علی کریمی', 'حسین رستمی', 'مهدی صالحی']; setF((x) => ({ ...x, company: prov, name: names[h % names.length], phone: `0912${String(1000000 + (h * 37) % 8999999)}`, p1: String(10 + (h % 89)), l: LETTERS[h % LETTERS.length], p2: String(100 + (h % 899)), r: String(10 + (h % 89)) })); toast(`اطلاعات مأمور از لینک ${prov} خوانده شد. بررسی کنید و اگر لازم بود اصلاح کنید.`) } catch { toast('لینک خوانده نشد؛ اطلاعات را دستی وارد کنید.', { tone: 'err' }) } finally { setReading(false) } }
  const slot = (s as Shipment & { slot?: string }).slot
  const save = () => {
    const rc = d.bank.receipts.find((r) => r.orderId === o.id)
    if (o.pay === 'کارت به کارت' && rc?.status !== 'تطبیق شد') return toast('رسید کارت به کارت این سفارش هنوز با واریز بانک تطبیق نشده است؛ ارسال قفل است.', { tone: 'err' })
    const plate = `${f.p1} ${f.l} ${f.p2} ایران ${f.r}`
    mutate((x) => { const sh = x.orders.find((y) => y.id === o.id)!.shipments.find((y) => y.id === s.id)!; sh.courier = { ...(sh.courier ?? { vehicle: 'موتور', eta: 30, code: '', cost: 0 }), name: f.name, phone: f.phone, plate, company: f.company } as Shipment['courier']; if (f.url.trim()) sh.trackingUrl = f.url.trim(); if (stepOf(sh) < 2) sh.status = 'ship.handed' }, { action: 'ثبت مأمور ارسال و پلاک', target: s.id, after: plate })
    if (c) sendSms(c.mobile, `غنیمت: مرسولهٔ ${s.id} در راه است. ${f.company}: ${f.name}، پلاک ${plate}.${f.url.trim() ? ` رصد زنده: ${f.url.trim()}` : ''}`, 'وضعیت سفارش', o.id, c.id)
    setEdit(false); toast('مأمور ارسال ثبت شد؛ نوار پیشرفت مشتری روی «در حال ارسال» رفت و پیامک ارسال شد.')
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-2 text-12 font-semibold text-t2">آنچه مشتری در پنل می‌بیند</p>
      <ol className="flex items-center">{(pickup ? PICKUP_STEPS : STEPS).map((l, i) => <li key={l} className="flex flex-1 items-center last:flex-none"><span className="flex flex-col items-center gap-1"><span className={cx('grid size-7 place-items-center rounded-full text-11 font-bold', i <= step ? 'bg-brand-solid text-white' : 'bg-neutral-bg text-t3')}>{i < step ? <Check size={14} /> : fa(i + 1)}</span><span className={cx('text-11 whitespace-nowrap', i === step ? 'font-bold text-t1' : 'text-t2')}>{l}</span></span>{i < STEPS.length - 1 && <span className={cx('mx-1 mb-5 h-1 flex-1 rounded-full', i < step ? 'bg-brand-solid' : 'bg-neutral-bg')} />}</li>)}</ol>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-12">
        {pickup ? <span>{pu ? <>مراجعه به <b>{pu.branch}</b> · <b>{pu.window}</b></> : 'شعبه و زمان مراجعه پس از آماده‌شدن پیامک می‌شود.'}</span> : <span>زمان ارسال: <b>{slot ?? `${jday(s.sla)} · تا ${new Date(s.sla).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`}</b></span>}
        {!pickup && !post && s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="rounded-full bg-brand-tint px-2.5 py-1 font-medium text-brand">رصد زندهٔ پیک (مشتری هم می‌بیند)</a>}
        {pickup || post ? null : s.courier ? <span className="flex items-center gap-2"><Truck size={13} />{s.courier.company ?? 'پیک'} · {s.courier.name} · <span className="ltr">{fa(s.courier.phone)}</span> <Plate v={s.courier.plate} /></span> : <span className="text-t3">مأمور ارسال هنوز ثبت نشده</span>}
        {post && s.tracking && <span className="flex items-center gap-2"><Truck size={13} />{s.trackingCarrier ?? s.method} · کد رهگیری <b className="ltr font-mono">{s.tracking}</b>{s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-brand underline">لینک رهگیری</a>}</span>}
        <span className="mr-auto flex gap-1.5">
          {post ? <Button size="sm" onClick={() => setTrk(true)}>{s.tracking ? 'ویرایش کد رهگیری' : 'ثبت کد و لینک رهگیری پستی'}</Button> : !pickup && <Button size="sm" onClick={() => setEdit(true)}>{s.courier ? 'ویرایش مأمور ارسال' : 'ثبت مأمور ارسال و پلاک'}</Button>}
          {s.status !== 'ship.delivered' && s.status !== 'ship.cancelled' && <Button size="sm" variant="ghost" onClick={() => setChg(true)}>تغییر روش ارسال</Button>}
        </span>
      </div>
      <PostTracking open={trk} onClose={() => setTrk(false)} o={o} s={s} />
      <ChangeMethod open={chg} onClose={() => setChg(false)} o={o} s={s} />
      <Modal open={edit} onClose={() => setEdit(false)} title={`مأمور ارسال مرسولهٔ ${s.id}`} footer={<Button variant="primary" disabled={!f.name || !/^\d{2}$/.test(f.p1) || !/^\d{3}$/.test(f.p2) || !/^\d{2}$/.test(f.r)} onClick={save}>ثبت و اطلاع به مشتری</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl border border-dashed border-brand/40 bg-brand-tint/40 p-3"><Field label="لینک رصد سفر (اختیاری)" help="لینک اسنپ‌باکس، الوپیک یا تپسی‌باکس را بچسبانید تا اطلاعات مأمور خودکار پر شود. همین لینک در پنل مشتری با دکمهٔ «رصد زندهٔ پیک» نمایش داده می‌شود."><div className="flex gap-2"><Input className="ltr text-left" placeholder="https://box.snapp.ir/track/..." value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /><Button loading={reading} onClick={() => void readLink()}>خواندن از لینک</Button></div></Field></div>
          <Field label="شرکت ارسال"><Select value={f.company} onChange={(v) => setF({ ...f, company: v })} options={COMPANIES} /></Field>
          <Field label="نام مأمور"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="موبایل مأمور"><Input className="ltr text-left" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="پلاک" help="دو رقم، حرف، سه رقم، کد استان"><div className="flex items-center gap-1" dir="ltr"><Input aria-label="دو رقم" className="w-14 text-center" maxLength={2} value={f.p1} onChange={(e) => setF({ ...f, p1: e.target.value.replace(/\D/g, '') })} /><Select className="w-20" value={f.l} onChange={(v) => setF({ ...f, l: v })} options={LETTERS} /><Input aria-label="سه رقم" className="w-16 text-center" maxLength={3} value={f.p2} onChange={(e) => setF({ ...f, p2: e.target.value.replace(/\D/g, '') })} /><span className="text-12">ایران</span><Input aria-label="کد استان" className="w-14 text-center" maxLength={2} value={f.r} onChange={(e) => setF({ ...f, r: e.target.value.replace(/\D/g, '') })} /></div></Field>
        </div>
        {f.p1 && f.p2 && f.r && <div className="mt-3"><Plate v={`${f.p1} ${f.l} ${f.p2} ایران ${f.r}`} /></div>}
        {f.company === 'اسنپ‌باکس' && <p className="mt-3 rounded-xl bg-info-bg px-3 py-2 text-12 text-info">اسنپ‌باکس: کد تحویل پیک روی برگهٔ چاپی نوشته نمی‌شود.</p>}
      </Modal>
    </div>
  )
}

const CARRIERS: [string, (c: string) => string][] = [['پست پیشتاز', (c) => `https://tracking.post.ir/?id=${c}`], ['تیپاکس', (c) => `https://tipaxco.com/tracking?code=${c}`], ['باربری', () => '']]
/** مرسولهٔ پستی: فقط کد رهگیری و لینک رهگیری؛ با ثبت، مرسوله «در مسیر» می‌شود و برای مشتری پیامک می‌رود */
function PostTracking({ open, onClose, o, s }: { open: boolean; onClose: () => void; o: Order; s: Shipment }) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId)
  const [f, setF] = useState({ carrier: s.trackingCarrier ?? (CARRIERS.find(([n]) => s.method.includes(n))?.[0] ?? 'پست پیشتاز'), code: s.tracking ?? '', url: s.trackingUrl ?? '' })
  const auto = (carrier: string, code: string) => CARRIERS.find(([n]) => n === carrier)?.[1](code) ?? ''
  const save = () => {
    if (!/^[\dA-Za-z-]{6,30}$/.test(f.code.trim())) return toast('کد رهگیری معتبر نیست (۶ تا ۳۰ رقم یا حرف).', { tone: 'err' })
    const url = f.url.trim() || auto(f.carrier, f.code.trim())
    mutate((x) => { const sh = x.orders.find((y) => y.id === o.id)!.shipments.find((y) => y.id === s.id)!; sh.tracking = f.code.trim(); sh.trackingUrl = url; sh.trackingCarrier = f.carrier; if (['ship.pending', 'ship.picking', 'ship.packed'].includes(sh.status)) sh.status = 'ship.in_transit' }, { action: 'ثبت کد رهگیری پستی', target: s.id, after: f.code })
    if (c) sendSms(c.mobile, `غنیمت: مرسولهٔ ${s.id} با ${f.carrier} ارسال شد. کد رهگیری: ${f.code.trim()}${url ? ` · ${url}` : ''}`, 'وضعیت سفارش', o.id, c.id)
    toast('کد و لینک رهگیری ثبت شد و برای مشتری پیامک شد.'); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={`رهگیری پستی مرسولهٔ ${s.id}`} footer={<Button variant="primary" onClick={save}>ثبت و پیامک به مشتری</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="شرکت"><Select value={f.carrier} onChange={(v) => setF({ ...f, carrier: v, url: '' })} options={CARRIERS.map(([n]) => n)} /></Field>
        <Field label="کد رهگیری"><Input className="ltr text-left font-mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="مثلا 236450012345678901234" /></Field>
        <div className="sm:col-span-2"><Field label="لینک رهگیری" help="اگر خالی بماند، از روی شرکت و کد ساخته می‌شود."><Input className="ltr text-left" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder={auto(f.carrier, f.code || 'کد') || 'https://'} /></Field></div>
      </div>
      <p className="mt-3 text-12 text-t2">برای مرسولهٔ پستی، مأمور و پلاک ثبت نمی‌شود؛ مشتری با همین کد و لینک پیگیری می‌کند.</p>
    </Modal>
  )
}

const METHOD_FEES: [string, number][] = [['تحویل سریع (پیک)', 185000], ['تحویل سریع در بازهٔ انتخابی', 185000], ['پست پیشتاز', 95000], ['تیپاکس', 140000], ['باربری', 450000], ['دریافت حضوری از شعبه', 0]]
/** تغییر روش ارسال یک مرسوله (مثلا مشتری تماس گرفته و می‌خواهد به جای پست، پیک بیاید) با ثبت دلیل و تفاوت هزینه */
function ChangeMethod({ open, onClose, o, s }: { open: boolean; onClose: () => void; o: Order; s: Shipment }) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId); const [m, setM] = useState(s.method); const [why, setWhy] = useState('درخواست تلفنی مشتری')
  const fee = METHOD_FEES.find(([n]) => n === m)?.[1] ?? 0; const diff = fee - (s.shipFee ?? 0)
  const blocked = ['ship.handed', 'ship.in_transit'].includes(s.status)
  const save = () => {
    if (m === s.method) return onClose()
    if (s.warehouse === 'mahabad' && /سریع/.test(m)) return toast('تحویل سریع فقط از انبار تهران ممکن است. برای اقلام مهاباد پست یا انتقال به تهران را انتخاب کنید.', { tone: 'err' })
    mutate((x) => { const sh = x.orders.find((y) => y.id === o.id)!.shipments.find((y) => y.id === s.id)!; sh.method = m; sh.shipFee = fee; sh.courier = null; sh.tracking = ''; sh.trackingUrl = undefined; if (/سریع/.test(m)) sh.sla = new Date(Date.now() + 2 * 36e5).toISOString() }, { action: 'تغییر روش ارسال', target: s.id, before: s.method, after: `${m} · ${why}` })
    if (c) sendSms(c.mobile, `غنیمت: روش ارسال مرسولهٔ ${s.id} به «${m}» تغییر کرد.${diff > 0 ? ` مابه‌التفاوت ${diff.toLocaleString('fa-IR')} تومان از لینک پرداخت.` : ''}`, 'وضعیت سفارش', o.id, c.id)
    toast(diff > 0 ? 'روش ارسال تغییر کرد؛ لینک پرداخت مابه‌التفاوت برای مشتری پیامک شد.' : diff < 0 ? 'روش ارسال تغییر کرد؛ مابه‌التفاوت به کیف پول مشتری برمی‌گردد.' : 'روش ارسال تغییر کرد و مشتری خبردار شد.'); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={`تغییر روش ارسال مرسولهٔ ${s.id}`} footer={<Button variant="primary" disabled={blocked} onClick={save}>ثبت تغییر</Button>}>
      {blocked ? <p className="rounded-xl bg-warning-bg px-3 py-2 text-12 text-warning">این مرسوله تحویل پیک یا پست شده است. برای تغییر روش، اول برگشت آن را ثبت کنید.</p> : <div className="space-y-3">
        <p className="text-12 text-t2">روش فعلی: <b className="text-t1">{s.method}</b> · انبار {s.warehouse === 'mahabad' ? 'مهاباد' : 'تهران'}</p>
        <div className="grid gap-2 sm:grid-cols-2">{METHOD_FEES.map(([n, f]) => <button key={n} type="button" aria-pressed={m === n} disabled={s.warehouse === 'mahabad' && /سریع|حضوری/.test(n)} onClick={() => setM(n)} className={cx('flex items-center justify-between rounded-xl border px-3 py-2 text-12 disabled:opacity-40', m === n ? 'border-brand bg-brand-tint ring-1 ring-brand' : 'border-line hover:border-brand/50')}><span>{n}</span><span className="tnum text-t2">{f ? `${f.toLocaleString('fa-IR')} تومان` : 'رایگان'}</span></button>)}</div>
        <Field label="دلیل (در سوابق سفارش)"><Select value={why} onChange={setWhy} options={['درخواست تلفنی مشتری', 'درخواست در پیام‌رسان', 'تکمیل ظرفیت پیک', 'نشانی خارج از محدودهٔ تحویل سریع', 'تصمیم انبار']} /></Field>
        {m !== s.method && <p className={cx('rounded-xl px-3 py-2 text-12', diff > 0 ? 'bg-warning-bg text-warning' : diff < 0 ? 'bg-success-bg text-success' : 'bg-neutral-bg text-t2')}>{diff > 0 ? `مشتری ${diff.toLocaleString('fa-IR')} تومان باید بپردازد؛ لینک پرداخت پیامک می‌شود.` : diff < 0 ? `${(-diff).toLocaleString('fa-IR')} تومان به کیف پول مشتری برمی‌گردد.` : 'هزینهٔ ارسال تغییری نمی‌کند.'}</p>}
      </div>}
    </Modal>
  )
}
