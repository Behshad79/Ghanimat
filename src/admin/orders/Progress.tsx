import { useState } from 'react'
import { Check, Truck } from 'lucide-react'
import { Button, cx, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, sendSms, useDB } from '@/shared/lib/store'
import type { Order, Shipment } from '@/shared/data/seed'
import { fa, jday } from '@/shared/lib/fa'

export const STEPS = ['ثبت سفارش', 'آماده‌سازی', 'در حال ارسال', 'تحویل شده'] as const
/** مرحلهٔ نوار پیشرفت پنل مشتری، خودکار از وضعیت مرسوله */
export const stepOf = (s: Shipment) => ['ship.delivered'].includes(s.status) ? 3 : ['ship.handed', 'ship.in_transit'].includes(s.status) ? 2 : ['ship.picking', 'ship.packed'].includes(s.status) ? 1 : 0

/** پلاک خودروی ایرانی: دو رقم، حرف، سه رقم، کد استان */
export function Plate({ v }: { v: string }) {
  const m = v.match(/^(\S{2})\s*(\S)\s*(\S{3})\s*ایران\s*(\S{2})$/)
  if (!m) return <span className="rounded-md border border-line px-2 py-0.5 text-12">{v || 'پلاک ثبت نشده'}</span>
  return <span dir="ltr" className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-[#10123d] bg-white text-13 font-bold text-[#10123d]"><span className="bg-[#0b3fbd] px-1 text-[8px] leading-6 text-white">IR</span><span className="px-1.5 leading-6">{m[1]}</span><span className="px-1 leading-6">{m[2]}</span><span className="px-1.5 leading-6">{m[3]}</span><span className="flex flex-col border-l-2 border-[#10123d] px-1 text-center text-[8px] leading-3"><span>ایران</span><b className="text-11">{m[4]}</b></span></span>
}
const COMPANIES = ['پیک غنیمت', 'اسنپ‌باکس', 'الوپیک', 'تیپاکس', 'پست پیشتاز']
const LETTERS = ['الف', 'ب', 'پ', 'ت', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ل', 'م', 'ن', 'و', 'ه', 'ی', 'ژ']

/** نمای همان چیزی که مشتری در «سفارش‌های جاری» می‌بیند + ثبت مأمور ارسال و پلاک */
export function CustomerProgress({ o, s }: { o: Order; s: Shipment }) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId); const step = stepOf(s)
  const [edit, setEdit] = useState(false); const [f, setF] = useState({ company: s.courier?.company ?? (/اسنپ/.test(s.method) ? 'اسنپ‌باکس' : 'پیک غنیمت'), name: s.courier?.name ?? '', phone: s.courier?.phone ?? '', p1: '', l: 'ب', p2: '', r: '' })
  const slot = (s as Shipment & { slot?: string }).slot
  const save = () => {
    const rc = d.bank.receipts.find((r) => r.orderId === o.id)
    if (o.pay === 'کارت به کارت' && rc?.status !== 'تطبیق شد') return toast('رسید کارت به کارت این سفارش هنوز با واریز بانک تطبیق نشده است؛ ارسال قفل است.', { tone: 'err' })
    const plate = `${f.p1} ${f.l} ${f.p2} ایران ${f.r}`
    mutate((x) => { const sh = x.orders.find((y) => y.id === o.id)!.shipments.find((y) => y.id === s.id)!; sh.courier = { ...(sh.courier ?? { vehicle: 'موتور', eta: 30, code: '', cost: 0 }), name: f.name, phone: f.phone, plate, company: f.company } as Shipment['courier']; if (stepOf(sh) < 2) sh.status = 'ship.handed' }, { action: 'ثبت مأمور ارسال و پلاک', target: s.id, after: plate })
    if (c) sendSms(c.mobile, `غنیمت: مرسولهٔ ${s.id} در راه است. ${f.company}: ${f.name}، پلاک ${plate}.`, 'وضعیت سفارش', o.id, c.id)
    setEdit(false); toast('مأمور ارسال ثبت شد؛ نوار پیشرفت مشتری روی «در حال ارسال» رفت و پیامک ارسال شد.')
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-2 text-12 font-semibold text-t2">آنچه مشتری در پنل می‌بیند</p>
      <ol className="flex items-center">{STEPS.map((l, i) => <li key={l} className="flex flex-1 items-center last:flex-none"><span className="flex flex-col items-center gap-1"><span className={cx('grid size-7 place-items-center rounded-full text-11 font-bold', i <= step ? 'bg-brand-solid text-white' : 'bg-neutral-bg text-t3')}>{i < step ? <Check size={14} /> : fa(i + 1)}</span><span className={cx('text-11 whitespace-nowrap', i === step ? 'font-bold text-t1' : 'text-t2')}>{l}</span></span>{i < STEPS.length - 1 && <span className={cx('mx-1 mb-5 h-1 flex-1 rounded-full', i < step ? 'bg-brand-solid' : 'bg-neutral-bg')} />}</li>)}</ol>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-12">
        <span>زمان ارسال: <b>{slot ?? `${jday(s.sla)} · تا ${new Date(s.sla).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`}</b></span>
        {s.courier ? <span className="flex items-center gap-2"><Truck size={13} />{s.courier.company ?? 'پیک'} · {s.courier.name} · <span className="ltr">{fa(s.courier.phone)}</span> <Plate v={s.courier.plate} /></span> : <span className="text-t3">مأمور ارسال هنوز ثبت نشده</span>}
        {!/حضوری/.test(s.method) && <Button size="sm" className="mr-auto" onClick={() => setEdit(true)}>{s.courier ? 'ویرایش مأمور ارسال' : 'ثبت مأمور ارسال و پلاک'}</Button>}
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title={`مأمور ارسال مرسولهٔ ${s.id}`} footer={<Button variant="primary" disabled={!f.name || !/^\d{2}$/.test(f.p1) || !/^\d{3}$/.test(f.p2) || !/^\d{2}$/.test(f.r)} onClick={save}>ثبت و اطلاع به مشتری</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
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
