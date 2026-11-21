// اقساط سفارش‌های اسنپ‌پی، دیجی‌پی، ترب‌پی و…: زمان‌بندی اقساط مشتری (نمایشی و قابل اصلاح) و برآورد تسویهٔ سرویس با ما.
// پرداخت اقساط بین مشتری و سرویس است؛ ما فقط زمان‌بندی را می‌بینیم و مبلغ و زمان تسویهٔ خودمان را برآورد می‌کنیم.
import { useState } from 'react'
import { CalendarClock, Pencil } from 'lucide-react'
import { Badge, Button, Field, Input, Segmented, Select, Textarea } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'
import { BNPL_MODEL, type Bnpl } from '@/shared/data/inbound'

const PROV: [RegExp, string][] = [[/اسنپ/, 'snapppay'], [/ترب/, 'torobpay'], [/دیجی/, 'digipay'], [/تارا/, 'tara']]
const MODEL0: Record<string, Bnpl['model']> = { snapppay: 'after_delivery', torobpay: 'after_delivery', digipay: 'after_purchase', tara: 'after_purchase' }
const faNum = (t: string) => Number(t.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))))
export const isBnplPay = (pay: string) => PROV.some(([r]) => r.test(pay))
const addMonths = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString() }
/** اقساط پیش‌فرض: تعداد از متن روش پرداخت (مثلاً «۶ قسط») یا تنظیم سرویس؛ قسط اول هنگام خرید و بقیه ماهانه */
export function bnplOf(o: Order, providers: { id: string; name: string; installments?: number; fee?: number; settleDays?: number }[]): Bnpl | null {
  if (o.bnpl) return o.bnpl
  const id = PROV.find(([r]) => r.test(o.pay))?.[1]; if (!id) return null
  const pv = providers.find((p) => p.id === id); const m = o.pay.match(/([\d۰-۹]+)\s*قسط/); const count = m ? faNum(m[1]) : pv?.installments ?? 4
  const each = Math.round(o.total / count / 1000) * 1000
  return { provider: id, count, model: MODEL0[id] ?? 'after_delivery', fee: pv?.fee ?? 6, settleDays: pv?.settleDays ?? 7, schedule: Array.from({ length: count }, (_, i) => ({ due: addMonths(o.createdAt, i), amount: i === count - 1 ? o.total - each * (count - 1) : each, paid: i === 0 || +new Date(addMonths(o.createdAt, i)) < Date.now() })) }
}

export function Installments({ o }: { o: Order }) {
  const d = useDB(); const P = (d as unknown as { providers: { id: string; name: string; installments?: number; fee?: number; settleDays?: number }[] }).providers ?? []
  const b = bnplOf(o, P); const [edit, setEdit] = useState(false)
  if (!b) return null
  const name = P.find((p) => p.id === b.provider)?.name ?? b.provider
  const net = Math.round(o.total * (1 - b.fee / 100))
  const base = b.model === 'after_delivery' ? o.deliveredAt : b.model === 'after_purchase' ? o.createdAt : undefined
  const settleAt = base ? new Date(+new Date(base) + b.settleDays * 864e5) : null
  return <div className="mt-3 rounded-xl border border-line p-3 text-12">
    <div className="flex flex-wrap items-center gap-2"><CalendarClock size={14} className="text-brand" /><b>اقساط {name} · {fa(b.count)} قسط</b>{b.edited && <Badge dot={false}>اصلاح‌شده</Badge>}<Button size="sm" variant="ghost" className="mr-auto" icon={<Pencil size={12} />} onClick={() => setEdit(true)}>ویرایش</Button></div>
    <ol className="mt-2 space-y-1">{b.schedule.map((x, i) => <li key={i} className="flex items-center gap-2"><span className={`grid size-5 shrink-0 place-items-center rounded-full text-11 ${x.paid ? 'bg-success-solid text-white' : 'bg-neutral-bg text-t2'}`}>{fa(i + 1)}</span><span className="flex-1">{new Date(x.due).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })}{i === 0 && ' · هنگام خرید'}</span><span className="tnum">{toman(x.amount)}</span><span className={`text-11 ${x.paid ? 'text-success' : 'text-t3'}`}>{x.paid ? 'پرداخت شده' : 'سررسید آینده'}</span></li>)}</ol>
    <div className="mt-2 space-y-0.5 rounded-lg bg-neutral-bg px-2.5 py-2 text-11">
      <p><b>تسویهٔ {name} با ما:</b> {BNPL_MODEL[b.model]}</p>
      <p>مبلغ خالص برآوردی: <b>{toman(net)}</b> (کارمزد {fa(b.fee)}٪ = {toman(o.total - net)}){b.model === 'per_installment' ? ' · هم‌زمان با هر قسط' : settleAt ? ` · حدود ${settleAt.toLocaleDateString('fa-IR')}` : ` · ${fa(b.settleDays)} روز بعد از تحویل`}</p>
      <p className="text-t3">پرداخت اقساط و پیگیری آن بین مشتری و {name} است؛ این زمان‌بندی برای پاسخ‌گویی به مشتری و برآورد نقدینگی ماست.</p>
      {b.note && <p>یادداشت: {b.note}</p>}
    </div>
    {edit && <EditBnpl o={o} b={b} name={name} onClose={() => setEdit(false)} />}
  </div>
}

function EditBnpl({ o, b, name, onClose }: { o: Order; b: Bnpl; name: string; onClose: () => void }) {
  const [f, setF] = useState<Bnpl>(structuredClone(b))
  const recount = (n: number) => { const each = Math.round(o.total / n / 1000) * 1000; setF({ ...f, count: n, schedule: Array.from({ length: n }, (_, i) => ({ due: f.schedule[i]?.due ?? addMonths(f.schedule[0]?.due ?? o.createdAt, i), amount: i === n - 1 ? o.total - each * (n - 1) : each, paid: f.schedule[i]?.paid ?? i === 0 })) }) }
  const save = () => { mutate((x) => { const q = x.orders.find((y) => y.id === o.id)!; q.bnpl = { ...f, edited: { at: new Date().toISOString(), by: currentUser()?.name ?? 'پنل' } } }, { action: 'ویرایش زمان‌بندی اقساط سفارش', target: o.id, after: `${f.count} قسط · ${BNPL_MODEL[f.model]}` }); toast('زمان‌بندی اقساط ذخیره شد.'); onClose() }
  const sum = f.schedule.reduce((a, x) => a + x.amount, 0)
  return <Modal open onClose={onClose} title={`اقساط ${name} · سفارش ${o.id}`} footer={<><Button variant="primary" onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3 text-12">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="تعداد اقساط"><Select value={String(f.count)} onChange={(v) => recount(+v)} options={['2', '3', '4', '6', '8', '10', '12'].map((n) => [n, `${fa(+n)} قسط`] as [string, string])} other={false} /></Field>
        <Field label="کارمزد سرویس (٪)"><Input type="number" step="0.5" className="ltr text-left" value={f.fee} onChange={(e) => setF({ ...f, fee: +e.target.value })} /></Field>
        <Field label="روز تا تسویه"><Input type="number" className="ltr text-left" value={f.settleDays} onChange={(e) => setF({ ...f, settleDays: +e.target.value })} /></Field>
      </div>
      <Field label="نحوهٔ تسویهٔ سرویس با ما"><Segmented value={f.model} onChange={(v) => setF({ ...f, model: v })} options={(Object.keys(BNPL_MODEL) as Bnpl['model'][]).map((k) => [k, k === 'after_delivery' ? 'یک‌جا بعد از تحویل' : k === 'after_purchase' ? 'یک‌جا بعد از خرید' : 'هم‌زمان با هر قسط'])} /></Field>
      <div className="space-y-1.5">{f.schedule.map((x, i) => <div key={i} className="flex flex-wrap items-center gap-2"><span className="w-12">قسط {fa(i + 1)}</span><Input type="date" className="w-40" value={x.due.slice(0, 10)} onChange={(e) => e.target.value && setF({ ...f, schedule: f.schedule.map((y, k) => (k === i ? { ...y, due: new Date(`${e.target.value}T12:00`).toISOString() } : y)) })} /><Input type="number" className="ltr w-36 text-left" value={x.amount} onChange={(e) => setF({ ...f, schedule: f.schedule.map((y, k) => (k === i ? { ...y, amount: +e.target.value } : y)) })} /><label className="flex items-center gap-1"><input type="checkbox" checked={!!x.paid} onChange={(e) => setF({ ...f, schedule: f.schedule.map((y, k) => (k === i ? { ...y, paid: e.target.checked } : y)) })} />پرداخت شده</label></div>)}</div>
      {sum !== o.total && <p className="text-warning">جمع اقساط ({toman(sum)}) با مبلغ سفارش ({toman(o.total)}) یکی نیست.</p>}
      <Field label="یادداشت"><Textarea rows={2} value={f.note ?? ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثلاً مشتری قسط دوم را با تأخیر داد؛ پیگیری با پشتیبانی دیجی‌پی" /></Field>
    </div>
  </Modal>
}
