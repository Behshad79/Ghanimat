// قفل ارسال تا تسویهٔ مابه‌التفاوت: وقتی سفارش ویرایش شد و مشتری باید مبلغی بپردازد (لینک یا کارت به کارت)،
// هیچ مرحلهٔ ارسالی (جمع‌آوری، بسته‌بندی، تحویل پیک یا پست، کد رهگیری، آماده‌سازی حضوری) جلو نمی‌رود؛
// مگر پرداخت آنلاین تأیید شود، ما دریافت را تأیید کنیم، یا خودمان صریحاً اجازهٔ ارسال بدهیم.
import { useState } from 'react'
import { BellRing, CheckCircle2, Lock, ShieldCheck, Unlock, XCircle } from 'lucide-react'
import { Badge, Button, Card, Field, Input } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, getDB, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'

export type PayHold = NonNullable<Order['payHold']>
export const holdOf = (o?: Order | null) => (o?.payHold?.status === 'pending' ? o.payHold : null)
export const holdText = (o: Order) => { const h = holdOf(o); return h ? `سفارش ${o.id} منتظر پرداخت مابه‌التفاوت ${toman(h.amount)} (${h.method}) است. تا تأیید پرداخت یا اجازهٔ شما، ارسال جلو نمی‌رود.` : '' }
/** پیش از هر مرحلهٔ ارسال صدا زده می‌شود؛ اگر قفل باشد پیام می‌دهد و true برمی‌گرداند */
export function shipBlocked(orderId: string, silent = false) {
  const o = getDB().orders.find((x) => x.id === orderId); const t = o ? holdText(o) : ''
  if (t && !silent) toast(t, { tone: 'err' })
  return !!t
}

export function PayHoldCard({ o }: { o: Order }) {
  const d = useDB(); const h = o.payHold; const [ref, setRef] = useState('')
  if (!h) return null
  const c = d.customers.find((x) => x.id === o.customerId)
  const set = (fn: (x: PayHold) => void, action: string, sms?: string) => { mutate((x) => { fn(x.orders.find((y) => y.id === o.id)!.payHold!) }, { action, target: o.id, after: toman(h.amount) }); if (sms && c) sendSms(c.mobile, `غنیمت: ${sms}`, 'وضعیت سفارش', o.id, c.id) }
  const who = () => currentUser()?.name ?? 'شما'
  if (h.status !== 'pending') return <div className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-bg px-3 py-2 text-12">
    {h.status === 'paid' ? <CheckCircle2 size={14} className="text-success" /> : <Unlock size={14} className="text-warning" />}
    <span>مابه‌التفاوت {toman(h.amount)}: <b>{h.status === 'paid' ? `پرداخت شد${h.ref ? ` · پیگیری ${h.ref}` : ''}` : h.status === 'waived' ? 'بخشیده شد (بر عهدهٔ غنیمت)' : 'ارسال با اجازهٔ ما بدون پرداخت'}</b>{h.note ? ` · ${h.note}` : ''}{h.doneBy ? ` · ${h.doneBy}` : ''}{h.doneAt ? ` · ${rel(h.doneAt)}` : ''}</span>
  </div>
  return <Card className="border-danger/50 bg-danger-bg/30" title={<span className="flex items-center gap-2 text-danger"><Lock size={16} />ارسال قفل است: منتظر پرداخت مابه‌التفاوت</span>} actions={<Badge tone="danger" dot={false}>{toman(h.amount)}</Badge>}>
    <p className="text-13 leading-6">پس از ویرایش سفارش، مشتری باید <b>{toman(h.amount)}</b> دیگر با <b>{h.method}</b> بپردازد ({rel(h.at)} · {h.by}). تا وقتی پرداخت تأیید نشده یا شما اجازه نداده‌اید، جمع‌آوری، بسته‌بندی، تحویل به پیک یا پست، ثبت کد رهگیری و آماده‌سازی تحویل حضوری انجام نمی‌شود.</p>
    {h.method === 'لینک پرداخت' && <p className="mt-1 text-12 text-t2">پرداخت آنلاین با بازگشت درگاه خودکار تأیید می‌شود و قفل باز می‌شود.</p>}
    <div className="mt-3 flex flex-wrap items-end gap-2">
      {h.method === 'لینک پرداخت' && <Button size="sm" variant="primary" icon={<ShieldCheck size={13} />} onClick={() => { set((x) => { x.status = 'paid'; x.ref = `ZP-${Math.floor(Math.random() * 9e8 + 1e8)}`; x.doneAt = new Date().toISOString(); x.doneBy = 'درگاه (خودکار)' }, 'تأیید خودکار پرداخت مابه‌التفاوت', `پرداخت ${toman(h.amount)} سفارش ${o.id} انجام شد. سفارش شما در حال آماده‌سازی است.`); toast('درگاه پرداخت را تأیید کرد؛ قفل ارسال باز شد.') }}>شبیه‌سازی: پرداخت آنلاین انجام شد</Button>}
      <Field label="شمارهٔ پیگیری یا ۴ رقم آخر کارت"><Input className="ltr w-44" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثلاً 784512" /></Field>
      <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={ref.trim().length < 4} onClick={async () => { if (!(await confirm({ title: `تأیید دریافت ${toman(h.amount)}؟`, body: 'پرداخت را دیده‌اید و قفل ارسال باز می‌شود.', confirm: 'تأیید دریافت' }))) return; set((x) => { x.status = 'paid'; x.ref = ref.trim(); x.doneAt = new Date().toISOString(); x.doneBy = who() }, 'تأیید دستی دریافت مابه‌التفاوت', `پرداخت ${toman(h.amount)} سفارش ${o.id} تأیید شد. سفارش شما در حال آماده‌سازی است.`); toast('دریافت تأیید شد؛ قفل ارسال باز شد.') }}>تأیید دریافت (کارت به کارت یا دستی)</Button>
      <Button size="sm" variant="ghost" icon={<BellRing size={13} />} onClick={() => { if (c) sendSms(c.mobile, `غنیمت: برای ادامهٔ ارسال سفارش ${o.id}، لطفاً ${toman(h.amount)} مابه‌التفاوت را ${h.method === 'لینک پرداخت' ? 'از لینک پرداخت' : 'با کارت به کارت و ارسال رسید'} بپردازید.`, 'وضعیت سفارش', o.id, c.id); set((x) => { x.reminders = (x.reminders ?? 0) + 1 }, 'یادآوری پرداخت مابه‌التفاوت'); toast('یادآوری پیامک شد.') }}>یادآوری پیامکی{h.reminders ? ` (${fa(h.reminders)})` : ''}</Button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
      <Button size="sm" variant="ghost" icon={<Unlock size={13} />} onClick={async () => { const why = await askReason({ kind: 'order', ref: o.id, status: 'ارسال بدون پرداخت مابه‌التفاوت', title: 'چرا بدون پرداخت ارسال شود؟ (مثلاً پرداخت در محل)' }); if (!why) return; set((x) => { x.status = 'released'; x.note = why; x.doneAt = new Date().toISOString(); x.doneBy = who() }, 'اجازهٔ ارسال بدون پرداخت مابه‌التفاوت'); toast('با اجازهٔ شما قفل ارسال باز شد؛ مابه‌التفاوت همچنان در حساب مشتری باقی است.') }}>اجازهٔ ارسال بدون پرداخت</Button>
      <Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={async () => { if (!(await confirm({ title: 'مابه‌التفاوت بخشیده شود؟', body: `${toman(h.amount)} بر عهدهٔ غنیمت می‌شود و قفل ارسال باز می‌شود.`, confirm: 'بخشیدن' }))) return; set((x) => { x.status = 'waived'; x.doneAt = new Date().toISOString(); x.doneBy = who() }, 'بخشیدن مابه‌التفاوت', `مابه‌التفاوت سفارش ${o.id} بر عهدهٔ غنیمت شد؛ نیازی به پرداخت نیست.`); toast('مابه‌التفاوت بخشیده شد.') }}>بخشیدن مابه‌التفاوت</Button>
    </div>
  </Card>
}
