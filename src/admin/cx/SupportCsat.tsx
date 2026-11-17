import { useNavigate } from 'react-router-dom'
import { Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Badge, Card, cx } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { useDB } from '@/shared/lib/store'
import { fa, pct, rel } from '@/shared/lib/fa'

/** رضایت پس از پشتیبانی: «مشکل شما حل شد؟» بعد از بستن تیکت و امتیاز ستاره‌ای بعد از گفتگوی آنلاین */
export function SupportCsat() {
  const d = useDB(); const nav = useNavigate()
  const closed = d.tickets.filter((t) => t.status === 'ticket.closed'); const yes = closed.filter((t) => t.csat === 'yes').length; const no = closed.filter((t) => t.csat === 'no').length; const answered = yes + no
  const chats = d.journey.widgetChats.filter((w) => w.rating > 0); const avg = chats.length ? chats.reduce((a, w) => a + w.rating, 0) / chats.length : 0
  const agents = [...new Set(chats.map((w) => w.agent))].map((a) => { const l = chats.filter((w) => w.agent === a); return { a, n: l.length, avg: l.reduce((x, w) => x + w.rating, 0) / l.length, wait: l.reduce((x, w) => x + w.waitSec, 0) / l.length } }).sort((x, y) => y.avg - x.avg)
  const topics = [...new Set(chats.map((w) => w.topic))].map((t) => { const l = chats.filter((w) => w.topic === t); return { t, avg: l.reduce((x, w) => x + w.rating, 0) / l.length, n: l.length } })
  const low = [...chats.filter((w) => w.rating <= 3).map((w) => ({ id: w.id, who: d.customers.find((c) => c.id === w.customerId)?.name ?? '', text: `${'★'.repeat(w.rating)} · ${w.reason}`, at: w.at, cid: w.customerId, kind: 'گفتگوی آنلاین' })), ...closed.filter((t) => t.csat === 'no').map((t) => ({ id: t.id, who: d.customers.find((c) => c.id === t.customerId)?.name ?? '', text: `مشکل حل نشد · ${t.subject}`, at: t.messages.at(-1)?.at ?? '', cid: t.customerId, kind: 'تیکت' }))]
  return <div className="mb-4 space-y-3">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KPI label="میانگین امتیاز گفتگو" value={`${fa(avg.toFixed(1))} از ۵`} note={`${fa(chats.length)} امتیاز ثبت‌شده`} />
      <KPI label="«مشکل حل شد» پس از تیکت" value={answered ? pct(yes * 100 / answered) : '—'} note={`${fa(answered)} پاسخ از ${fa(closed.length)} تیکت بسته`} />
      <KPI label="نرخ پاسخ به نظرسنجی" value={closed.length ? pct(answered * 100 / closed.length) : '—'} />
      <KPI label="امتیاز پایین منتظر پیگیری" value={fa(low.length)} tone={low.length ? 'warning' : 'success'} />
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      <Card title="به تفکیک کارشناس">{agents.map((x) => <div key={x.a} className="mb-2 text-12"><p className="flex justify-between"><b>{x.a}</b><span className="tnum">{fa(x.avg.toFixed(1))} <Star size={11} className="inline fill-[#ffc24b] text-[#ffc24b]" /> · {fa(x.n)} گفتگو · انتظار {fa(Math.round(x.wait / 60))} دقیقه</span></p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className={cx('block h-full rounded-full', x.avg >= 4 ? 'bg-success' : 'bg-warning')} style={{ width: `${x.avg * 20}%` }} /></div></div>)}</Card>
      <Card title="به تفکیک موضوع">{topics.map((x) => <p key={x.t} className="flex justify-between py-1 text-12"><span>{x.t}</span><span className="tnum">{fa(x.avg.toFixed(1))} از ۵ · {fa(x.n)}</span></p>)}</Card>
      <Card title="امتیازهای پایین (برای تماس دوباره)">{low.length === 0 ? <p className="text-12 text-t2">موردی نیست.</p> : <ul className="space-y-2 text-12">{low.map((x) => <li key={x.id}><button className="w-full rounded-xl border border-line p-2 text-right hover:border-brand" onClick={() => nav(`/admin/customers/${x.cid}`)}><span className="flex items-center gap-1.5"><b>{x.who}</b><Badge dot={false}>{x.kind}</Badge>{x.kind === 'تیکت' ? <ThumbsDown size={12} className="text-danger" /> : null}<span className="mr-auto text-11 text-t3">{x.at && rel(x.at)}</span></span><span className="mt-0.5 block text-t2">{x.text}</span></button></li>)}</ul>}
        <p className="mt-2 flex items-center gap-1 text-11 text-t2"><ThumbsUp size={11} />نظرسنجی بعد از بستن تیکت و پایان گفتگو خودکار برای مشتری نمایش داده می‌شود.</p></Card>
    </div>
  </div>
}
