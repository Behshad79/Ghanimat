import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle2, FileSignature, KeyRound, MessageSquareText, Printer, Store } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { QuickText } from '@/shared/ui/quickview'
import { askReason } from '@/shared/ui/reason'
import { currentUser, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'
import type { Pickup } from '@/shared/data/pickups'
import { ProductImg } from '../pages/_shared'

const COL: [Pickup['status'], string, string][] = [['preparing', 'در حال آماده‌سازی', 'bg-info-bg text-info'], ['ready', 'آماده تحویل (پیامک ارسال شد)', 'bg-warning-bg text-warning'], ['handed', 'تحویل‌شده با رسید', 'bg-success-bg text-success'], ['expired', 'مهلت تمام‌شده', 'bg-danger-bg text-danger']]

/** میز دریافت حضوری: آماده‌سازی، پیامک، تطبیق کد تحویل، ثبت تحویل‌گیرنده و بایگانی رسید امضاشده */
export function PickupDesk() {
  const d = useDB(); const nav = useNavigate(); const P = d.pickups
  const [hand, setHand] = useState<Pickup | null>(null); const [f, setF] = useState({ code: '', receiver: '', receiverId: '', relation: 'خود مشتری', receipt: '' }); const [view, setView] = useState<string | null>(null)
  const name = (id: string) => d.customers.find((c) => c.id === id)?.name ?? id
  const set = (id: string, patch: Partial<Pickup>, action: string) => mutate((x) => { Object.assign(x.pickups.find((p) => p.id === id)!, patch) }, { action, target: id })
  const ready = (p: Pickup) => { set(p.id, { status: 'ready', readyAt: new Date().toISOString() }, 'آماده شدن سفارش حضوری'); const c = d.customers.find((x) => x.id === p.customerId); if (c) sendSms(c.mobile, d.delivery.templates.pickupReady.replace('{سفارش}', p.orderId).replace('{شعبه}', p.branch).replace('{زمان}', p.window).replace('{کد}', p.code), 'دریافت حضوری', p.orderId, c.id); toast('سفارش آمادهٔ تحویل شد و پیامک با کد تحویل ارسال شد.') }
  const done = () => { if (!hand) return; if (f.code !== hand.code) return toast('کد تحویل درست نیست. کد را از پیامک مشتری بخواهید.', { tone: 'err' }); if (!f.receiver.trim()) return toast('نام تحویل‌گیرنده را بنویسید.', { tone: 'err' }); if (!f.receipt) return toast('عکس رسید امضاشده را بگیرید تا بایگانی شود.', { tone: 'err' })
    set(hand.id, { status: 'handed', receiver: f.receiver, receiverId: f.receiverId, relation: f.relation, receipt: f.receipt, handedAt: new Date().toISOString(), by: currentUser()?.name ?? 'شما' }, 'تحویل حضوری با رسید'); mutate((x) => { const o = x.orders.find((y) => y.id === hand.orderId); if (o) o.status = 'order.delivered' }); setHand(null); toast('تحویل ثبت شد؛ رسید امضاشده بایگانی شد و سفارش «تحویل‌شده» شد.') }
  const viewP = P.find((p) => p.id === view)
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Store size={17} />} label="آماده تحویل در شعبه" value={fa(P.filter((p) => p.status === 'ready').length)} />
        <KPI label="در حال آماده‌سازی" value={fa(P.filter((p) => p.status === 'preparing').length)} />
        <KPI label="تحویل با رسید (بایگانی)" value={fa(P.filter((p) => p.status === 'handed').length)} />
        <KPI label="مهلت تمام‌شده" value={fa(P.filter((p) => p.status === 'expired').length)} goodDown />
      </div>
      <div className="grid gap-3 overflow-x-auto lg:grid-cols-4">{COL.map(([st, label, tone]) => { const list = P.filter((p) => p.status === st); return <div key={st} className="min-w-56 rounded-2xl bg-neutral-bg/60 p-2"><p className="mb-2 flex items-center justify-between px-1 text-13 font-semibold">{label}<span className={cx('rounded-full px-2 text-11', tone)}>{fa(list.length)}</span></p>
        <div className="space-y-2">{list.map((p) => <div key={p.id} className="rounded-xl border border-line bg-surface p-2.5 text-12">
          <div className="flex items-center justify-between"><QuickText v={p.orderId} /><span className="text-11 text-t2">{p.branch}</span></div>
          <p className="mt-1"><QuickText v={name(p.customerId)} /></p>
          <div className="mt-1 flex -space-x-1.5 space-x-reverse">{p.items.map((i) => <ProductImg key={i} pid={i} size={26} rounded="rounded-full" />)}</div>
          <p className="mt-1 text-11 text-t2">زمان مراجعه: {p.window}</p>
          {st === 'handed' && <p className="mt-1 text-11">تحویل به <b>{p.receiver}</b> ({p.relation}) · {rel(p.handedAt!)} · توسط {p.by}</p>}
          {st === 'expired' && p.note && <p className="mt-1 text-11 text-danger">{p.note}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {st === 'preparing' && <Button size="sm" variant="primary" icon={<MessageSquareText size={12} />} onClick={() => ready(p)}>آماده شد، پیامک بده</Button>}
            {st === 'ready' && <><Button size="sm" variant="primary" icon={<KeyRound size={12} />} onClick={() => { setHand(p); setF({ code: '', receiver: name(p.customerId), receiverId: '', relation: 'خود مشتری', receipt: '' }) }}>تحویل به مشتری</Button><Button size="sm" variant="ghost" onClick={async () => { const why = await askReason({ kind: 'order', ref: p.orderId, status: 'پایان مهلت دریافت حضوری', title: 'دلیل لغو دریافت حضوری' }); if (why) set(p.id, { status: 'expired', note: why }, 'پایان مهلت دریافت حضوری') }}>پایان مهلت</Button></>}
            {st === 'handed' && <Button size="sm" icon={<FileSignature size={12} />} onClick={() => setView(p.id)}>مشاهدهٔ رسید</Button>}
            <Button size="sm" variant="ghost" icon={<Printer size={12} />} onClick={() => nav(`/admin/print?doc=pickup&orders=${p.orderId}`)}>رسید چاپی</Button>
          </div></div>)}{list.length === 0 && <p className="py-4 text-center text-11 text-t3">خالی</p>}</div></div> })}</div>
      <DataTable name="بایگانی رسیدهای تحویل حضوری" rows={P.filter((p) => p.status === 'handed')} rowKey={(p) => p.id} onRow={(p) => setView(p.id)} empty={{ title: 'هنوز تحویل حضوری ثبت نشده است.' }} search={(p) => `${p.orderId} ${name(p.customerId)} ${p.receiver} ${p.receiverId}`}
        cols={[{ key: 'o', title: 'سفارش', render: (p) => <QuickText v={p.orderId} /> }, { key: 'c', title: 'مشتری', render: (p) => <QuickText v={name(p.customerId)} /> }, { key: 'r', title: 'تحویل‌گیرنده', render: (p) => `${p.receiver} · ${p.relation}` }, { key: 'id', title: 'کد ملی', render: (p) => <span className="ltr">{p.receiverId || '—'}</span> }, { key: 'b', title: 'شعبه', render: (p) => p.branch }, { key: 'by', title: 'تحویل‌دهنده', render: (p) => p.by ?? '—' }, { key: 'at', title: 'زمان تحویل', render: (p) => <span className="text-12 text-t2">{rel(p.handedAt!)}</span>, sort: (p) => p.handedAt ?? '' }, { key: 'rc', title: 'رسید', render: (p) => (p.receipt ? <Badge tone="success">عکس امضا</Badge> : <Badge>رسید کاغذی (بدون عکس)</Badge>) }]} />
      <Modal open={!!hand} onClose={() => setHand(null)} title={hand ? `تحویل حضوری سفارش ${hand.orderId}` : ''} footer={<Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={done}>ثبت تحویل و بایگانی رسید</Button>}>
        {hand && <div className="space-y-3">
          <Field label="کد تحویل (از پیامک مشتری)"><Input className="ltr text-center font-mono text-18 tracking-widest" maxLength={4} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, '') })} /></Field>
          {f.code.length === 4 && <p className={cx('text-12', f.code === hand.code ? 'text-success' : 'text-danger')}>{f.code === hand.code ? 'کد درست است.' : 'کد مطابقت ندارد.'}</p>}
          <div className="grid gap-2 sm:grid-cols-2"><Field label="نام تحویل‌گیرنده"><Input value={f.receiver} onChange={(e) => setF({ ...f, receiver: e.target.value })} /></Field><Field label="کد ملی تحویل‌گیرنده"><Input className="ltr text-left" value={f.receiverId} onChange={(e) => setF({ ...f, receiverId: e.target.value })} /></Field></div>
          <Field label="نسبت با مشتری"><Select value={f.relation} onChange={(v) => setF({ ...f, relation: v })} options={['خود مشتری', 'تحویل‌گیرندهٔ معرفی‌شده در سفارش', 'نمایندهٔ شرکت (معرفی‌نامه)', 'سایر (با هماهنگی تلفنی)']} /></Field>
          <div className="rounded-xl border border-dashed border-line p-3"><p className="mb-2 flex items-center gap-1 text-12 font-semibold"><Camera size={13} />عکس رسید امضاشده (اجباری)</p>{f.receipt && <img src={f.receipt} alt="رسید" className="mb-2 max-h-48 rounded-lg" />}<input type="file" accept="image/*" capture="environment" aria-label="عکس رسید" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, receipt: await fileToImage(file, 1000, 0.8) }) }} className="text-12" /><p className="mt-1 text-11 text-t2">اول «رسید چاپی» را بدهید مشتری امضا کند، بعد از آن عکس بگیرید.</p></div>
        </div>}
      </Modal>
      <Modal open={!!viewP} onClose={() => setView(null)} title={viewP ? `رسید تحویل ${viewP.orderId}` : ''}>
        {viewP && <div className="space-y-2 text-13"><p>تحویل‌گیرنده: <b>{viewP.receiver}</b> ({viewP.relation}) · کد ملی <span className="ltr">{viewP.receiverId || '—'}</span></p><p>شعبه: {viewP.branch} · تحویل‌دهنده: {viewP.by} · {rel(viewP.handedAt!)}</p><p>کد تحویل تطبیق‌شده: <span className="ltr font-mono">{viewP.code}</span></p>{viewP.receipt ? <img src={viewP.receipt} alt="رسید امضاشده" className="w-full rounded-xl" /> : <p className="rounded-xl bg-neutral-bg px-3 py-6 text-center text-12 text-t2">برای این تحویل فقط رسید کاغذی ثبت شده و عکسی بایگانی نشده است.</p>}</div>}
      </Modal>
    </div>
  )
}
