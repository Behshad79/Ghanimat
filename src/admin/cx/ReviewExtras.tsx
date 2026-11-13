import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, MessageCircleQuestion, Reply, Send, ThumbsDown, ThumbsUp, Trash2, Users } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Segmented, Textarea } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { ProductImg } from '../pages/_shared'

const REC = { yes: ['خرید این کالا را پیشنهاد می‌کند', 'text-success'], no: ['خرید این کالا را پیشنهاد نمی‌کند', 'text-danger'], unsure: ['مطمئن نیست', 'text-t2'] } as const

/** نکات مثبت و منفی، پیشنهاد خرید، بازخورد کاربران، گزارش‌ها و پاسخ رسمی غنیمت زیر هر دیدگاه */
export function ReviewMetaBlock({ rid }: { rid: string }) {
  const d = useDB(); const m = d.reviewMeta[rid]; const [rep, setRep] = useState<string | null>(null)
  if (!m) return null
  const who = currentUser()?.name ?? 'پشتیبانی'
  return (
    <div className="mt-3 space-y-2">
      <p className={cx('text-12 font-semibold', REC[m.recommend][1])}>{REC[m.recommend][0]}</p>
      {(m.pros.length > 0 || m.cons.length > 0) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-12">
        {m.pros.length > 0 && <span className="flex flex-wrap items-center gap-x-2"><b className="text-success">نکات مثبت:</b>{m.pros.map((p) => <span key={p} className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-success" />{p}</span>)}</span>}
        {m.cons.length > 0 && <span className="flex flex-wrap items-center gap-x-2"><b className="text-danger">نکات منفی:</b>{m.cons.map((p) => <span key={p} className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-danger" />{p}</span>)}</span>}
      </div>}
      <p className="flex items-center gap-3 text-11 text-t2">بازخورد کاربران:<span className="flex items-center gap-1"><ThumbsUp size={12} />{fa(m.likes)}</span><span className="flex items-center gap-1"><ThumbsDown size={12} />{fa(m.dislikes)}</span></p>
      {m.reports.length > 0 && <div className="rounded-xl border border-danger/30 bg-danger-bg/60 p-2.5 text-12">
        <p className="flex items-center gap-1.5 font-semibold text-danger"><Flag size={12} />{fa(m.reports.length)} گزارش از کاربران</p>
        <ul className="mt-1 space-y-0.5 text-t2">{m.reports.map((r, i) => <li key={i}>{r.reason} · {r.by} · {rel(r.at)}</li>)}</ul>
        <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => mutate((x) => { x.reviewMeta[rid].reports = [] }, { action: 'بررسی گزارش دیدگاه: بدون مشکل', target: rid })}>بدون مشکل؛ گزارش‌ها بسته شود</Button>
          <Button size="sm" variant="danger" onClick={async () => { const why = await askReason({ kind: 'review', ref: rid, status: 'رد دیدگاه گزارش‌شده', title: 'دلیل حذف دیدگاه گزارش‌شده' }); if (!why) return; mutate((x) => { x.reviews.find((r) => r.id === rid)!.status = 'review.rejected'; x.reviewMeta[rid].reports = [] }, { action: 'حذف دیدگاه گزارش‌شده', target: rid, after: why }); toast('دیدگاه از سایت برداشته شد.') }}>حذف از سایت</Button></div>
      </div>}
      {m.reply && rep === null && <div className="relative rounded-xl border border-line bg-surface-2 p-3 text-12"><p className="mb-1 flex items-center gap-2"><b>{m.reply.by}</b><Badge tone="brand" dot={false}>پاسخ رسمی</Badge><span className="text-t3">{rel(m.reply.at)}</span></p><p className="leading-6">{m.reply.text}</p>
        <div className="mt-1 flex gap-3"><button className="text-brand" onClick={() => setRep(m.reply!.text)}>ویرایش</button><button className="text-danger" onClick={async () => { if (await confirm({ title: 'پاسخ رسمی حذف شود؟', body: 'پاسخ از زیر دیدگاه در سایت برداشته می‌شود.', danger: true, confirm: 'حذف' })) mutate((x) => { delete x.reviewMeta[rid].reply }, { action: 'حذف پاسخ رسمی دیدگاه', target: rid }) }}>حذف</button></div></div>}
      {rep !== null ? <div className="space-y-2"><Textarea rows={3} value={rep} onChange={(e) => setRep(e.target.value)} placeholder="پاسخ رسمی غنیمت زیر این دیدگاه نمایش داده می‌شود…" /><div className="flex gap-2"><Button size="sm" variant="primary" disabled={!rep.trim()} onClick={() => { mutate((x) => { x.reviewMeta[rid].reply = { by: 'پشتیبانی غنیمت', text: rep.trim(), at: new Date().toISOString() } }, { action: 'پاسخ رسمی به دیدگاه', target: rid, after: who }); setRep(null); toast('پاسخ ثبت شد و به نویسندهٔ دیدگاه اطلاع داده می‌شود.') }}>ثبت پاسخ</Button><Button size="sm" variant="ghost" onClick={() => setRep(null)}>انصراف</Button></div></div>
        : !m.reply && <button className="flex items-center gap-1 text-12 text-brand" onClick={() => setRep('')}><Reply size={12} />پاسخ رسمی غنیمت</button>}
    </div>
  )
}

type QF = 'all' | 'q' | 'a' | 'none'
/** پرسش و پاسخ کالاها: تأیید پرسش، پاسخ کارشناس، تأیید پاسخ خریداران و پرسیدن از خریداران قبلی */
export function QuestionsTab() {
  const d = useDB(); const nav = useNavigate(); const [f, setF] = useState<QF>('all'); const [draft, setDraft] = useState<Record<string, string>>({})
  const buyer = (cid: string, pid: string) => d.orders.some((o) => o.customerId === cid && o.shipments.some((s) => s.items.some((i) => i.productId === pid)))
  const rows = d.questions.filter((q) => f === 'q' ? q.status === 'pending' : f === 'a' ? q.answers.some((a) => a.status === 'pending') : f === 'none' ? q.status === 'approved' && !q.answers.some((a) => a.status === 'approved') : true)
  const setQ = (qid: string, status: 'approved' | 'rejected') => mutate((x) => { x.questions.find((q) => q.id === qid)!.status = status }, { action: status === 'approved' ? 'تأیید پرسش' : 'رد پرسش', target: qid })
  const setA = (qid: string, aid: string, status: 'approved' | 'rejected') => mutate((x) => { x.questions.find((q) => q.id === qid)!.answers.find((a) => a.id === aid)!.status = status }, { action: status === 'approved' ? 'تأیید پاسخ' : 'رد پاسخ', target: `${qid}/${aid}` })
  const cnt = (k: QF) => d.questions.filter((q) => k === 'q' ? q.status === 'pending' : k === 'a' ? q.answers.some((a) => a.status === 'pending') : k === 'none' ? q.status === 'approved' && !q.answers.some((a) => a.status === 'approved') : true).length
  return (
    <div className="space-y-4">
      <Segmented value={f} onChange={setF} options={[['all', `همه (${fa(cnt('all'))})`], ['q', `پرسش منتظر تأیید (${fa(cnt('q'))})`], ['a', `پاسخ منتظر تأیید (${fa(cnt('a'))})`], ['none', `بی‌پاسخ (${fa(cnt('none'))})`]]} />
      {rows.length === 0 ? <Card><EmptyState title="موردی در این بخش نیست." /></Card> : rows.map((q) => { const c = d.customers.find((x) => x.id === q.customerId); const p = d.products.find((x) => x.id === q.productId); const buyers = d.orders.filter((o) => o.customerId !== q.customerId && o.shipments.some((s) => s.items.some((i) => i.productId === q.productId))).map((o) => o.customerId).filter((v, i, a) => a.indexOf(v) === i); return (
        <Card key={q.id} title={<span className="flex items-center gap-2"><ProductImg pid={q.productId} size={32} /><button className="text-right hover:text-brand" onClick={() => nav(`/admin/catalog/${q.productId}`)}>{p?.title}</button></span>} actions={q.status === 'pending' ? <Badge tone="warning">منتظر تأیید</Badge> : q.status === 'rejected' ? <Badge tone="danger">ردشده</Badge> : <Badge tone="success">منتشرشده</Badge>}>
          <p className="mb-1 flex flex-wrap items-center gap-2 text-12 text-t2"><button className="font-semibold text-brand" onClick={() => nav(`/admin/customers/${q.customerId}`)}>{c?.name}</button>{buyer(q.customerId, q.productId) && <Badge tone="success" dot={false}>خریدار</Badge>}<span>{rel(q.at)}</span><span>· {fa(q.answers.length)} پاسخ</span></p>
          <p className="flex items-start gap-2 text-14 font-semibold"><MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-brand" />{q.text}</p>
          {q.status === 'pending' && <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" onClick={() => setQ(q.id, 'approved')}>تأیید پرسش</Button><Button size="sm" variant="danger" onClick={() => setQ(q.id, 'rejected')}>رد</Button></div>}
          <div className="mt-3 space-y-2">{q.answers.map((a) => <div key={a.id} className={cx('rounded-xl border p-3 text-13', a.staff ? 'border-brand/30 bg-brand-tint/40' : 'border-line bg-surface-2')}>
            <p className="mb-1 flex flex-wrap items-center gap-2 text-12"><b>{a.by}</b>{a.staff ? <Badge tone="brand" dot={false}>کارشناس غنیمت</Badge> : a.customerId && buyer(a.customerId, q.productId) ? <Badge tone="success" dot={false}>خریدار</Badge> : <Badge dot={false}>کاربر</Badge>}<span className="text-t3">{rel(a.at)}</span>{a.status === 'pending' && <Badge tone="warning">منتظر تأیید</Badge>}{a.status === 'rejected' && <Badge tone="danger">ردشده</Badge>}</p>
            <p className="leading-6">{a.text}</p>
            <div className="mt-1 flex items-center gap-3 text-11 text-t2"><span className="flex items-center gap-1"><ThumbsUp size={11} />{fa(a.likes)}</span><span className="flex items-center gap-1"><ThumbsDown size={11} />{fa(a.dislikes)}</span>
              {a.status === 'pending' && <><button className="mr-auto text-success" onClick={() => setA(q.id, a.id, 'approved')}>تأیید پاسخ</button><button className="text-danger" onClick={() => setA(q.id, a.id, 'rejected')}>رد</button></>}
              {a.status !== 'pending' && <button aria-label="حذف پاسخ" className="mr-auto text-t3 hover:text-danger" onClick={async () => { if (await confirm({ title: 'این پاسخ حذف شود؟', body: 'پاسخ از صفحهٔ کالا برداشته می‌شود.', danger: true, confirm: 'حذف' })) mutate((x) => { const qq = x.questions.find((y) => y.id === q.id)!; qq.answers = qq.answers.filter((y) => y.id !== a.id) }, { action: 'حذف پاسخ', target: `${q.id}/${a.id}` }) }}><Trash2 size={12} /></button>}</div>
          </div>)}</div>
          {q.status !== 'rejected' && <div className="mt-3 flex gap-2"><Textarea rows={2} className="flex-1" value={draft[q.id] ?? ''} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} placeholder="پاسخ کارشناس غنیمت…" /><Button variant="primary" icon={<Send size={13} />} disabled={!(draft[q.id] ?? '').trim()} onClick={() => { mutate((x) => { const qq = x.questions.find((y) => y.id === q.id)!; qq.status = 'approved'; qq.answers.push({ id: `A-${Date.now().toString(36)}`, by: 'پشتیبانی غنیمت', staff: true, text: draft[q.id].trim(), status: 'approved', at: new Date().toISOString(), likes: 0, dislikes: 0 }) }, { action: 'پاسخ کارشناس به پرسش', target: q.id }); if (c) sendSms(c.mobile, `غنیمت: به پرسش شما دربارهٔ «${p?.title}» پاسخ داده شد.`, 'پاسخ پرسش', q.id, c.id); setDraft({ ...draft, [q.id]: '' }); toast('پاسخ منتشر شد و به پرسنده پیامک شد.') }}>پاسخ</Button></div>}
          {q.status === 'approved' && buyers.length > 0 && <button disabled={!!q.askedBuyers} className={cx('mt-2 flex items-center gap-1 text-12', q.askedBuyers ? 'text-t3' : 'text-brand')} onClick={() => { mutate((x) => { x.questions.find((y) => y.id === q.id)!.askedBuyers = buyers.length }, { action: 'پرسیدن از خریداران قبلی', target: q.id, after: `${buyers.length} نفر` }); toast(`از ${fa(buyers.length)} خریدار قبلی این کالا خواسته شد پاسخ بدهند.`) }}><Users size={12} />{q.askedBuyers ? `از ${fa(q.askedBuyers)} خریدار قبلی پرسیده شد` : `پرسیدن از ${fa(buyers.length)} خریدار قبلی این کالا`}</button>}
        </Card>) })}
    </div>
  )
}
