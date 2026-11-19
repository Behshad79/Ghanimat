// نمای سریع سفارش در پنجره: وضعیت، مشتری، نشانی، اقلام، مرسوله‌ها، پرداخت و بانک، مبالغ و بازگشت وجه، هشدارها و آخرین رویدادها
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Pencil, Printer } from 'lucide-react'
import { Badge, Button, Row, StatusBadge } from '@/shared/ui/base'
import { Modal } from '@/shared/ui/overlay'
import { WithLogo } from '@/shared/ui/brandLogo'
import { useDB } from '@/shared/lib/store'
import { fa, mask, rel, toman } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import { ProductImg } from '../pages/_shared'
import { bankOf } from './PaymentInfo'
import { REFUND_LABEL } from './Refunds'

export function OrderPeek({ id, onClose }: { id: string | null; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const o = d.orders.find((x) => x.id === id)
  if (!o) return null
  const c = d.customers.find((x) => x.id === o.customerId); const P = (pid: string) => d.products.find((p) => p.id === pid)
  const items = o.shipments.flatMap((s) => s.items); const sub = items.filter((i) => !i.cancelled).reduce((a, i) => a + i.price * i.qty, 0)
  const tx = d.txns.filter((t) => t.orderId === o.id); const rf = (d.refunds ?? []).filter((r) => r.orderId === o.id)
  const log = d.audit.filter((a) => a.target.startsWith(o.id)).slice(0, 5)
  const go = (to: string) => { onClose(); nav(to) }
  const addr = o.shipTo ?? (c?.addr ? [c.addr.city, c.addr.district, c.addr.street, c.addr.alley, c.addr.plaque && `پلاک ${c.addr.plaque}`].filter(Boolean).join('، ') : '—')
  return <Modal open onClose={onClose} wide title={<span className="flex flex-wrap items-center gap-2"><span className="ltr font-mono">{o.id}</span><StatusBadge s={o.status} />{o.payHold?.status === 'pending' && <Badge tone="danger" dot={false}>قفل: منتظر مابه‌التفاوت</Badge>}{o.decision && !o.decision.choice && <Badge tone="warning" dot={false}>منتظر تصمیم مشتری</Badge>}</span>}
    footer={<><Button variant="primary" icon={<ExternalLink size={14} />} onClick={() => go(`/admin/orders/${o.id}`)}>جزئیات کامل</Button><Button icon={<Printer size={14} />} onClick={() => go(`/admin/print?orders=${o.id}`)}>چاپ</Button><Button variant="ghost" icon={<Pencil size={14} />} onClick={() => go(`/admin/orders/${o.id}`)}>ویرایش در صفحهٔ سفارش</Button></>}>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="rounded-xl border border-line p-3 text-13"><p className="mb-1 text-12 font-semibold text-t2">مشتری و ارسال</p>
          <Row k="مشتری">{c?.name ?? '—'}{o.buyer === 'legal' && <> <Badge dot={false}>حقوقی</Badge></>}</Row>
          <Row k="موبایل"><bdi dir="ltr">{c ? mask(c.mobile) : '—'}</bdi></Row>
          <Row k="تحویل‌گیرنده">{o.receiver ? `${o.receiver.name} · ${mask(o.receiver.mobile)}` : c?.name ?? '—'}</Row>
          <Row k="نشانی"><span className="text-12 leading-5">{addr}</span></Row>
          <Row k="ثبت">{new Date(o.createdAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} · {o.channel}</Row>
        </div>
        <div className="rounded-xl border border-line p-3 text-13"><p className="mb-1 text-12 font-semibold text-t2">مبالغ و پرداخت</p>
          <Row k="کالاها">{toman(sub)}</Row><Row k="ارسال">{o.shippingFee ? toman(o.shippingFee) : 'رایگان'}</Row>{o.discount > 0 && <Row k="تخفیف"><span className="text-success">−{toman(o.discount)}</span></Row>}
          <Row k={<b>مبلغ سفارش</b>}><b>{toman(o.total)}</b></Row>
          {(o.refunded ?? 0) > 0 && <Row k="بازگشت داده‌شده"><span className="text-success">{toman(o.refunded!)}</span></Row>}
          {(o.refundPending ?? 0) > 0 && <Row k="بازگشت در جریان"><span className="text-warning">{toman(o.refundPending!)}</span></Row>}
          {tx.map((t) => { const b = bankOf(t); return <div key={t.id} className="mt-1.5 flex items-center justify-between rounded-lg bg-neutral-bg px-2 py-1 text-11"><WithLogo name={t.gateway} size={14} /><bdi dir="ltr" className="font-mono">{b.pan}</bdi><span>مرجع <bdi dir="ltr" className="font-mono">{b.rrn}</bdi></span><StatusBadge s={t.status} /></div> })}
          {rf.map((r) => <p key={r.id} className="mt-1 flex items-center justify-between text-11"><span>بازگشت {toman(r.amount)} به {r.dest}</span><Badge tone={REFUND_LABEL[r.status][1]}>{REFUND_LABEL[r.status][0]}</Badge></p>)}
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-line p-3"><p className="mb-1 text-12 font-semibold text-t2">اقلام ({fa(items.filter((i) => !i.cancelled).length)})</p>
          <ul className="divide-y divide-line">{items.map((i, k) => <li key={k} className={`flex items-center gap-2 py-1.5 text-12 ${i.cancelled ? 'opacity-50 line-through' : ''}`}><ProductImg pid={i.productId} size={32} /><span className="min-w-0 flex-1 truncate">{P(i.productId)?.title}{i.qty > 1 && ` × ${fa(i.qty)}`}</span><b className="tnum">{toman(i.price * i.qty)}</b></li>)}</ul>
        </div>
        <div className="space-y-1.5">{o.shipments.map((s) => <div key={s.id} className="rounded-xl border border-line p-2.5 text-12">
          <div className="flex items-center justify-between"><span className="ltr font-mono">{s.id}</span><StatusBadge s={s.status} /></div>
          <p className="mt-1 text-t2">{WAREHOUSE[s.warehouse] ?? s.warehouse} · <WithLogo name={s.method} size={14} /> · مهلت {rel(s.sla)}</p>
          {s.courier && <p className="text-t2">پیک: {s.courier.name} · {s.courier.vehicle} · پلاک {s.courier.plate}</p>}
          {s.tracking && <p className="text-t2">کد رهگیری: <bdi dir="ltr" className="font-mono">{s.tracking}</bdi></p>}
        </div>)}</div>
        {log.length > 0 && <div className="rounded-xl bg-neutral-bg p-2.5 text-11"><p className="mb-1 font-semibold text-t2">آخرین رویدادها</p><ul className="space-y-0.5">{log.map((a, i) => <li key={i}><b>{a.action}</b> · {a.who} · {rel(a.at)}</li>)}</ul></div>}
      </div>
    </div>
  </Modal>
}
