import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock, HelpCircle, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Badge, Button, cx, Field, Row, Segmented, Select, Textarea } from '@/shared/ui/base'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, left, rel } from '@/shared/lib/fa'
import { STATUS } from '@/shared/data/statuses'
import type { Ticket } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'

export const TICKET_ST = Object.keys(STATUS).filter((k) => k.startsWith('ticket.'))
const setStatus = (id: string, status: string, action: string) => mutate((x) => { const t = x.tickets.find((y) => y.id === id)!; t.status = status; t.history = [...(t.history ?? []), { status, at: new Date().toISOString() }]; if (status !== 'ticket.needs_info') t.replyBy = undefined }, { action, target: id, after: STATUS[status]?.label })

/** مراحل رسیدگی همان‌طور که مشتری در «جزئیات درخواست» می‌بیند */
export function TicketSteps({ t }: { t: Ticket }) {
  const mid = t.status === 'ticket.needs_info' ? 'نیازمند اطلاعات بیشتر' : t.status === 'ticket.answered' ? 'پاسخ داده‌شده' : 'در حال بررسی'
  const steps = ['ثبت‌شده', mid, 'بسته‌شده']
  const cur = t.status === 'ticket.new' ? 0 : t.status === 'ticket.closed' ? 2 : 1
  return <ol className="mb-3 flex items-center gap-2 text-11">{steps.map((s, i) => <li key={s} className="flex flex-1 items-center gap-2"><span className={cx('grid size-6 shrink-0 place-items-center rounded-full', i < cur ? 'bg-success-solid text-white' : i === cur ? (t.status === 'ticket.needs_info' ? 'bg-warning-solid text-white' : 'bg-brand-solid text-white') : 'bg-neutral-bg text-t3')}>{i < cur ? <Check size={12} /> : fa(i + 1)}</span><span className={cx('whitespace-nowrap', i === cur ? 'font-semibold' : 'text-t2')}>{s}</span>{i < steps.length - 1 && <span className={cx('h-px flex-1', i < cur ? 'bg-success' : 'bg-line')} />}</li>)}</ol>
}

/** تغییر دستی وضعیت تیکت */
export function TicketStatusPicker({ t }: { t: Ticket }) {
  return <Select className="w-48" value={t.status} onChange={(v) => setStatus(t.id, v, 'تغییر وضعیت تیکت')} options={TICKET_ST.map((k) => [k, STATUS[k].label])} />
}

/** «درخواست اطلاعات بیشتر»: پیام با قالب آماده، مهلت پاسخ مشتری و بسته‌شدن خودکار در صورت پاسخ ندادن */
export function NeedInfoButton({ t }: { t: Ticket }) {
  const d = useDB(); const [open, setOpen] = useState(false); const [text, setText] = useState(''); const [hours, setHours] = useState('48')
  const tpl = d.reasonPresets?.ticketNeedInfo?.items.filter((x) => x.on).map((x) => x.text) ?? []
  const c = d.customers.find((x) => x.id === t.customerId)
  return <>
    <Button variant="ghost" icon={<HelpCircle size={14} />} onClick={() => { setText(tpl[0] ?? ''); setOpen(true) }}>درخواست اطلاعات بیشتر</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="درخواست اطلاعات بیشتر از مشتری" footer={<Button variant="primary" disabled={text.trim().length < 5} onClick={() => {
      const by = new Date(Date.now() + +hours * 36e5).toISOString()
      mutate((x) => { const y = x.tickets.find((z) => z.id === t.id)!; y.messages.push({ from: 'agent', text: text.trim(), at: new Date().toISOString() }); y.status = 'ticket.needs_info'; y.replyBy = by; y.history = [...(y.history ?? []), { status: 'ticket.needs_info', at: new Date().toISOString() }] }, { action: 'درخواست اطلاعات بیشتر', target: t.id, after: `${hours} ساعت مهلت` })
      if (c) sendSms(c.mobile, `غنیمت: برای ادامهٔ رسیدگی به درخواست ${t.id} اطلاعات بیشتری لازم است. تا ${fa(hours)} ساعت فرصت پاسخ دارید.`, 'درخواست اطلاعات تیکت', t.id, c.id)
      setOpen(false); toast(`درخواست ارسال شد. اگر تا ${fa(hours)} ساعت پاسخی نرسد، تیکت خودکار بسته می‌شود.`) }}>ارسال درخواست</Button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{tpl.map((x) => <button key={x} type="button" onClick={() => setText(x)} className={cx('rounded-full border px-2.5 py-1 text-12', text === x ? 'border-transparent bg-brand-solid text-white' : 'border-line hover:border-brand')}>{x.slice(0, 48)}{x.length > 48 && '…'}</button>)}</div>
        <Field label="متن درخواست"><Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Field label="مهلت پاسخ مشتری" help="پیام «برای پاسخ دادن … فرصت دارید» به مشتری نمایش داده می‌شود."><Segmented value={hours} onChange={setHours} options={[['24', '۲۴ ساعت'], ['48', '۴۸ ساعت'], ['72', '۷۲ ساعت']]} /></Field>
        <p className="text-11 text-t2">قالب‌ها در «تنظیمات و سیستم ← دراپ‌داون‌ها و دلیل‌ها» قابل ویرایش‌اند.</p>
      </div>
    </Modal>
  </>
}

/** پیشنهاد ثبت مرجوعی در پاسخ: دکمهٔ «ثبت درخواست مرجوعی» زیر پیام برای مشتری نمایش داده می‌شود */
export function OfferReturnButton({ t }: { t: Ticket }) {
  const d = useDB(); const o = d.orders.find((x) => x.id === t.orderId)
  if (!o || !o.deliveredAt && o.status !== 'order.delivered') return null
  return <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => { mutate((x) => { const y = x.tickets.find((z) => z.id === t.id)!; y.messages.push({ from: 'agent', text: 'بررسی شد و درخواست شما تأیید می‌شود. می‌توانید از همین‌جا درخواست مرجوعی ثبت کنید؛ هزینهٔ ارسال برگشت با غنیمت است.', at: new Date().toISOString(), cta: 'ثبت درخواست مرجوعی' }); y.status = 'ticket.answered' }, { action: 'پیشنهاد ثبت مرجوعی در تیکت', target: t.id }); toast('پاسخ با دکمهٔ «ثبت درخواست مرجوعی» برای مشتری ارسال شد.') }}>پاسخ با دکمهٔ ثبت مرجوعی</Button>
}

/** زمینهٔ تیکت: موضوع و دلیل، کالاهای انتخاب‌شده، زمان تقریبی نتیجه، مهلت پاسخ مشتری و رضایت */
export function TicketContext({ t }: { t: Ticket }) {
  const d = useDB(); const nav = useNavigate()
  const topic = (d.entities.ticketTopics ?? []).find((x) => x.name === t.topic)
  return <>
    <Row k="موضوع / دلیل">{t.topic ? <span>{t.topic}{t.reason && <span className="text-t2"> · {t.reason}</span>}</span> : <span className="text-t3">ثبت نشده</span>}</Row>
    {topic && <Row k="زمان تقریبی نتیجه"><span className="flex items-center gap-1"><Clock size={12} />تا {fa(Number(topic.sla))} ساعت</span></Row>}
    {t.items?.length ? <div className="py-1.5"><p className="mb-1 text-12 text-t2">کالاهای دارای مشکل</p><div className="flex flex-wrap gap-2">{t.items.map((pid) => <button key={pid} onClick={() => nav(`/admin/catalog/${pid}`)} className="flex items-center gap-1.5 rounded-lg border border-line p-1 pl-2 text-11"><ProductImg pid={pid} size={26} />{d.products.find((p) => p.id === pid)?.title.slice(0, 22)}</button>)}</div></div> : null}
    {t.status === 'ticket.needs_info' && t.replyBy && <p className="mt-1 rounded-lg bg-warning-bg px-2.5 py-1.5 text-12 text-warning">منتظر پاسخ مشتری · {left(t.replyBy)} تا بسته‌شدن خودکار</p>}
    {t.status === 'ticket.closed' && <Row k="«مشکل شما حل شد؟»">{t.csat === 'yes' ? <Badge tone="success"><ThumbsUp size={11} className="ml-1 inline" />بله</Badge> : t.csat === 'no' ? <Badge tone="danger"><ThumbsDown size={11} className="ml-1 inline" />خیر</Badge> : <span className="text-t3">پاسخ نداده</span>}</Row>}
    {(t.history?.length ?? 0) > 0 && <div className="mt-2 border-t border-line pt-2 text-11 text-t2">{t.history!.slice(-3).map((h, i) => <p key={i}>{STATUS[h.status]?.label} · {rel(h.at)}</p>)}</div>}
  </>
}

/** فیگما: «بسته‌شده — بسته‌شدن به‌دلیل پاسخ ندادن در مهلت». فقط برای تیکت منتظر اطلاعات که مهلتش گذشته یا نزدیک است */
export function NoReplyCloseButton({ t }: { t: Ticket }) {
  const d = useDB()
  if (t.status !== 'ticket.needs_info') return null
  const late = !!t.replyBy && new Date(t.replyBy).getTime() < Date.now()
  return <Button variant={late ? 'primary' : 'ghost'} onClick={async () => {
    if (!late && !(await confirm({ title: 'مهلت پاسخ مشتری هنوز تمام نشده', body: 'تیکت با پیام «بسته‌شدن به‌دلیل پاسخ ندادن در مهلت» بسته می‌شود. مطمئن هستید؟', confirm: 'بستن تیکت' }))) return
    const c = d.customers.find((x) => x.id === t.customerId)
    mutate((x) => { const y = x.tickets.find((z) => z.id === t.id)!; y.status = 'ticket.closed'; y.messages.push({ from: 'note', text: 'این درخواست به‌دلیل پاسخ ندادن در مهلت بسته شد. مشتری تا مهلت بازگشایی می‌تواند آن را دوباره باز کند.', at: new Date().toISOString() }) }, { action: 'بستن تیکت به‌دلیل پاسخ ندادن مشتری', target: t.id })
    if (c) sendSms(c.mobile, `غنیمت: درخواست ${t.id} به‌دلیل پاسخ ندادن در مهلت بسته شد. اگر هنوز مشکل دارید، از پنل کاربری بازگشایی کنید.`, 'پشتیبانی', t.id, c.id)
    toast('تیکت بسته شد و به مشتری پیامک رفت.') }}>{late ? 'بستن: مشتری در مهلت پاسخ نداد' : 'بستن به‌دلیل پاسخ ندادن'}</Button>
}
