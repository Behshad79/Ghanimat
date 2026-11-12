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
import { DateFilter, inRange, useDateRange } from '@/shared/ui/datefilter'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'
import type { Pickup } from '@/shared/data/pickups'
import { ProductImg } from '../pages/_shared'

const COL: [Pickup['status'], string, string][] = [['preparing', 'در حال آماده‌سازی', 'bg-info-bg text-info'], ['ready', 'آماده تحویل (پیامک ارسال شد)', 'bg-warning-bg text-warning'], ['handed', 'تحویل‌شده با رسید', 'bg-success-bg text-success'], ['expired', 'مهلت تمام‌شده', 'bg-danger-bg text-danger']]

/** میز دریافت حضوری: آماده‌سازی، پیامک، تطبیق کد تحویل، ثبت تحویل‌گیرنده و بایگانی رسید امضاشده */
export function PickupDesk() {
  const d = useDB(); const nav = useNavigate(); const P = d.pickups; const [dr, setDr] = useDateRange()
  const [hand, setHand] = useState<Pickup | null>(null); const [f, setF] = useState({ code: '', receiver: '', receiverId: '', relation: 'خود مشتری', receipt: '' }); const [view, setView] = useState<string | null>(null)
  const name = (id: string) => d.customers.find((c) => c.id === id)?.name ?? id
  const set = (id: string, patch: Partial<Pickup>, action: string) => mutate((x) => { Object.assign(x.pickups.find((p) => p.id === id)!, patch) }, { action, target: id })
  const ready = (p: Pickup) => { mutate((x) => { const o = x.orders.find((y) => y.id === p.orderId); if (o) { o.status = 'order.pickup_ready'; o.shipments.forEach((sh) => { if (/حضوری/.test(sh.method)) sh.status = 'ship.pickup_ready' }) } }); set(p.id, { status: 'ready', readyAt: new Date().toISOString() }, 'آماده شدن سفارش حضوری'); const c = d.customers.find((x) => x.id === p.customerId); if (c) sendSms(c.mobile, d.delivery.templates.pickupReady.replace('{سفارش}', p.orderId).replace('{شعبه}', p.branch).replace('{زمان}', p.window).replace('{کد}', p.code), 'دریافت حضوری', p.orderId, c.id); toast('سفارش آمادهٔ تحویل شد و پیامک با کد تحویل ارسال شد.') }
  const done = () => { if (!hand) return; if (f.code !== hand.code) return toast('کد تحویل درست نیست. کد را از پیامک مشتری بخواهید.', { tone: 'err' }); if (!f.receiver.trim()) return toast('نام تحویل‌گیرنده را بنویسید.', { tone: 'err' }); if (!f.receipt) return toast('عکس رسید امضاشده را بگیرید تا بایگانی شود.', { tone: 'err' })
    set(hand.id, { status: 'handed', receiver: f.receiver, receiverId: f.receiverId, relation: f.relation, receipt: f.receipt, handedAt: new Date().toISOString(), by: currentUser()?.name ?? 'شما' }, 'تحویل حضوری با رسید'); mutate((x) => { const o = x.orders.find((y) => y.id === hand.orderId); if (o) { o.status = 'order.delivered'; o.deliveredAt = new Date().toISOString(); o.shipments.forEach((sh) => { if (/حضوری/.test(sh.method)) sh.status = 'ship.delivered' }) } }); setHand(null); toast('تحویل ثبت شد؛ رسید امضاشده بایگانی شد و سفارش «تحویل‌شده» شد.') }
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
      <h3 className="mb-2 mt-6 text-14 font-semibold">بایگانی رسیدهای تحویل حضوری</h3>
      <DateFilter r={dr} set={setDr} count={P.filter((p) => p.status === 'handed' && inRange(p.handedAt!, dr)).length} total={P.filter((p) => p.status === 'handed').length} noun="تحویل" />
      <DataTable name="بایگانی رسیدهای تحویل حضوری" noDate rows={P.filter((p) => p.status === 'handed' && inRange(p.handedAt!, dr))} rowKey={(p) => p.id} onRow={(p) => setView(p.id)} empty={{ title: 'هنوز تحویل حضوری ثبت نشده است.' }} search={(p) => `${p.orderId} ${name(p.customerId)} ${p.receiver} ${p.receiverId}`}
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

/** رسید تحویل حضوری داخل صفحهٔ سفارش: عکس رسید امضاشده، مشخصات تحویل‌گیرنده، بارگذاری یا جایگزینی عکس */
export function PickupReceipt({ orderId, customerId, items }: { orderId: string; customerId: string; items: string[] }) {
  const d = useDB(); const nav = useNavigate(); const p = d.pickups.find((x) => x.orderId === orderId); const [big, setBig] = useState(false)
  const upload = async (file: File) => {
    const img = await fileToImage(file, 1000, 0.8)
    if (p?.receipt) { const why = await askReason({ kind: 'order', ref: orderId, status: 'جایگزینی عکس رسید تحویل', title: 'دلیل جایگزینی عکس رسید' }); if (!why) return }
    mutate((x) => {
      const q = x.pickups.find((y) => y.orderId === orderId)
      if (q) { q.receipt = img; if (q.status !== 'handed') { q.status = 'handed'; q.handedAt = new Date().toISOString(); q.by = currentUser()?.name ?? 'شما'; q.receiver = q.receiver || x.customers.find((c) => c.id === customerId)?.name } }
      else x.pickups.unshift({ id: `PU-${1300 + x.pickups.length}`, orderId, customerId, branch: 'شعبهٔ ونک', status: 'handed', window: '—', code: '—', deadline: new Date().toISOString(), receiver: x.customers.find((c) => c.id === customerId)?.name, relation: 'خود مشتری', handedAt: new Date().toISOString(), by: currentUser()?.name ?? 'شما', receipt: img, items })
    }, { action: p?.receipt ? 'جایگزینی عکس رسید تحویل حضوری' : 'بارگذاری عکس رسید تحویل حضوری', target: orderId })
    toast('عکس رسید امضاشده بایگانی شد.')
  }
  const picker = (label: string, primary?: boolean) => <label className={cx('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-12 font-medium', primary ? 'bg-brand-solid text-white' : 'border border-line bg-surface text-t1 hover:bg-neutral-bg')}><Camera size={13} />{label}<input type="file" accept="image/*" capture="environment" className="sr-only" aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} /></label>
  return (
    <div className="mb-3 rounded-lg border border-line p-3">
      <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-12 font-semibold"><span className="flex items-center gap-1.5"><FileSignature size={14} />رسید تحویل حضوری (امضای مشتری)</span>{p?.receipt ? <Badge tone="success">عکس رسید امضاشده بایگانی شد</Badge> : p?.status === 'handed' ? <Badge tone="warning">رسید کاغذی، عکس بارگذاری نشده</Badge> : <Badge tone="warning">هنوز تحویل نشده</Badge>}</p>
      {p?.status === 'handed' ? (
        <div className="flex flex-wrap gap-3">
          {p.receipt ? <button type="button" onClick={() => setBig(true)} aria-label="نمایش بزرگ رسید امضاشده" className="lift w-28 shrink-0 overflow-hidden rounded-lg border border-line"><img src={p.receipt} alt={`رسید امضاشدهٔ سفارش ${orderId}`} className="aspect-[3/4] w-full object-cover" /></button> : <div className="grid w-28 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-neutral-bg px-2 text-center text-11 text-t2">بدون عکس</div>}
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-12">
            <dt className="text-t2">تحویل‌گیرنده</dt><dd className="font-medium">{p.receiver} <span className="text-t2">({p.relation})</span></dd>
            <dt className="text-t2">کد ملی</dt><dd className="ltr text-right">{p.receiverId || '—'}</dd>
            <dt className="text-t2">زمان تحویل</dt><dd>{rel(p.handedAt!)}</dd>
            <dt className="text-t2">شعبه و کارمند</dt><dd>{p.branch} · {p.by}</dd>
            <dt className="text-t2">کد تحویل</dt><dd className="ltr text-right font-mono">{p.code}</dd>
          </dl>
        </div>
      ) : p && (p.status === 'ready' || p.status === 'preparing') ? <PickupWaiting p={p} /> : <p className="text-12 text-t2">{p ? `وضعیت در میز دریافت حضوری: ${COL.find((c) => c[0] === p.status)?.[1]}.` : 'برای این سفارش هنوز رکورد دریافت حضوری ساخته نشده. اگر تحویل داده‌اید، عکس رسید امضاشده را بارگذاری کنید.'}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {p?.status === 'handed' && p.receipt && <Button size="sm" variant="ghost" onClick={() => setBig(true)}>نمایش بزرگ</Button>}
        {p?.status === 'handed' ? picker(p.receipt ? 'جایگزینی عکس رسید' : 'بارگذاری عکس رسید', !p.receipt) : !p && picker('بارگذاری عکس رسید', true)}
        {p && p.status === 'expired' && <Button size="sm" onClick={() => nav('/admin/orders?tab=pickup')}>رفتن به میز دریافت حضوری</Button>}
        <Button size="sm" icon={<Printer size={13} />} onClick={() => nav(`/admin/print?doc=pickup&orders=${orderId}`)}>چاپ رسید برای امضا</Button>
      </div>
      <Modal open={big} onClose={() => setBig(false)} title={<span className="flex items-center gap-2">رسید امضاشدهٔ سفارش <span className="ltr font-mono">{orderId}</span></span>}>{p?.receipt && <img src={p.receipt} alt="رسید امضاشده" className="w-full rounded-xl" />}</Modal>
    </div>
  )
}

/** سفارش حضوری که هنوز تحویل نشده: آماده‌سازی یا آماده و منتظر مراجعه، با مهلت، کد، پیامک و اقدام‌ها */
function PickupWaiting({ p }: { p: Pickup }) {
  const d = useDB(); const nav = useNavigate(); const c = d.customers.find((x) => x.id === p.customerId)
  const left = Math.round((new Date(p.deadline).getTime() - Date.now()) / 36e5)
  const sms = d.smsLog.find((m) => m.ref === p.orderId && m.kind === 'دریافت حضوری')
  const ready = p.status === 'ready'
  return (
    <div className={cx('rounded-xl border p-3', ready ? 'border-warning/40 bg-warning-bg/40' : 'border-info/30 bg-info-bg/40')}>
      <p className="mb-2 flex flex-wrap items-center gap-2 text-13 font-semibold"><Store size={15} />{ready ? 'آماده در شعبه؛ مشتری هنوز مراجعه نکرده' : 'در حال آماده‌سازی برای تحویل در شعبه'}<Badge tone={ready ? 'warning' : 'info'}>{ready ? `${fa(Math.max(0, left))} ساعت تا پایان مهلت` : 'هنوز پیامک آماده‌شدن نرفته'}</Badge></p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-12 sm:grid-cols-4">
        <div><dt className="text-t2">شعبه</dt><dd className="font-medium">{p.branch}</dd></div>
        <div><dt className="text-t2">زمان مراجعه</dt><dd className="font-medium">{p.window}</dd></div>
        <div><dt className="text-t2">کد تحویل (پیامک‌شده به مشتری)</dt><dd className="ltr text-right font-mono font-bold">{p.code}</dd></div>
        <div><dt className="text-t2">پیامک آماده‌شدن</dt><dd className="font-medium">{ready ? (sms ? rel(sms.at) : p.readyAt ? rel(p.readyAt) : 'ارسال شد') : '—'}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {ready ? <Button size="sm" variant="primary" icon={<KeyRound size={13} />} onClick={() => nav('/admin/orders?tab=pickup')}>مشتری آمد: تحویل با کد</Button> : <Button size="sm" variant="primary" onClick={() => nav('/admin/orders?tab=pickup')}>آماده شد؟ از میز تحویل پیامک بدهید</Button>}
        {ready && c && <Button size="sm" icon={<MessageSquareText size={13} />} onClick={() => { sendSms(c.mobile, d.delivery.templates.pickupReminder.replace('{سفارش}', p.orderId).replace('{مهلت}', new Date(p.deadline).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })).replace('{شعبه}', p.branch), 'یادآوری دریافت حضوری', p.orderId, c.id); toast('پیامک یادآوری برای مشتری ارسال شد.') }}>یادآوری پیامکی</Button>}
      </div>
    </div>
  )
}
