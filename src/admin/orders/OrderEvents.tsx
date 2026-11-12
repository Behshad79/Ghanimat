import { useState } from 'react'
import { BellRing, Check, CircleX, MapPinned, PackageX, Phone, RefreshCcw, Undo2, Wallet, X } from 'lucide-react'
import { Badge, Button, cx, Field, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB, Order } from '@/shared/data/seed'
import type { OrderEvent } from '@/shared/data/orderEvents'

const KIND: Record<OrderEvent['kind'], { label: string; icon: typeof BellRing; cls: string }> = {
  cancel: { label: 'درخواست لغو', icon: CircleX, cls: 'border-danger/40 bg-danger-bg/60' },
  stock: { label: 'کمبود موجودی', icon: PackageX, cls: 'border-warning/50 bg-warning-bg/60' },
  change: { label: 'تغییر از طرف مشتری', icon: MapPinned, cls: 'border-brand/40 bg-brand-tint/60' },
  payment: { label: 'مشکل پرداخت', icon: Wallet, cls: 'border-warning/50 bg-warning-bg/60' },
}
export const openEvents = (d: DB, orderId?: string) => d.orderEvents.filter((e) => e.status === 'open' && (!orderId || e.orderId === orderId))

/** قلم‌های سفارش برای لغو جزئی */
const lines = (o: Order) => o.shipments.flatMap((s) => s.items.map((it, i) => ({ key: `${s.id}|${i}`, s, it })))

/** هشدار فوری در صفحهٔ سفارش: هر رویداد تازه با توضیح و اقدام مستقیم (تأیید، رد با دلیل، اعمال تغییر، جایگزینی) */
export function OrderAlerts({ o }: { o: Order }) {
  const d = useDB(); const E = d.orderEvents.filter((e) => e.orderId === o.id); const [cancel, setCancel] = useState<OrderEvent | 'admin' | null>(null); const [showDone, setShowDone] = useState(false)
  const c = d.customers.find((x) => x.id === o.customerId)
  const close = (e: OrderEvent, status: 'done' | 'rejected', result: string) => mutate((x) => { const y = x.orderEvents.find((z) => z.id === e.id)!; y.status = status; y.result = `${result} · ${currentUser()?.name ?? 'شما'}`; const cr = e.payload?.cr && (x.entities.cancelRequests ?? []).find((r) => r.id === e.payload!.cr); if (cr) cr.status = status === 'done' ? 'تأییدشده' : 'ردشده' }, { action: `رویداد سفارش: ${result}`, target: `${o.id} · ${e.title}` })
  const reject = async (e: OrderEvent) => { const why = await askReason({ kind: 'order', ref: o.id, status: `رد «${e.title}»`, title: 'دلیل رد درخواست (برای مشتری)' }); if (!why) return; close(e, 'rejected', `رد شد: ${why}`); if (c) sendSms(c.mobile, `غنیمت: درخواست شما برای سفارش ${o.id} پذیرفته نشد. دلیل: ${why}`, 'وضعیت سفارش', o.id, c.id); toast('درخواست رد شد و دلیل برای مشتری پیامک شد.') }
  const applyAddress = (e: OrderEvent) => { mutate((x) => { x.orders.find((y) => y.id === o.id)!.shipTo = e.payload?.address }); close(e, 'done', 'نشانی تازه اعمال شد'); if (c) sendSms(c.mobile, `غنیمت: نشانی تحویل سفارش ${o.id} به‌روز شد.`, 'وضعیت سفارش', o.id, c.id); toast('نشانی تازه روی سفارش و برچسب‌ها اعمال شد.') }
  const moveWh = (e: OrderEvent) => { mutate((x) => { const oo = x.orders.find((y) => y.id === o.id)!; oo.shipments.forEach((s) => { if (s.warehouse === 'tehran' && s.status !== 'ship.delivered') { s.warehouse = 'mahabad'; s.method = 'پست پیشتاز'; s.allocReason = 'موجودی تهران تمام شد؛ از انبار مهاباد تأمین شد.' } }) }); close(e, 'done', 'از انبار مهاباد با پست تأمین شد'); if (c) sendSms(c.mobile, `غنیمت: سفارش ${o.id} از انبار دیگر و با پست پیشتاز ارسال می‌شود؛ زمان تحویل ۲ تا ۴ روز کاری.`, 'وضعیت سفارش', o.id, c.id); toast('مرسوله به انبار مهاباد منتقل شد و مشتری خبردار شد.') }
  const offer = (e: OrderEvent) => { if (c) sendSms(c.mobile, `غنیمت: کالای سفارش ${o.id} در انبار تهران تمام شد. برای انتخاب ارسال از انبار دیگر، کالای جایگزین یا لغو و بازگشت وجه وارد پنل شوید.`, 'نیازمند تصمیم', o.id, c.id); mutate((x) => { x.orders.find((y) => y.id === o.id)!.status = 'order.needs_decision' }, { action: 'ارسال گزینه‌های جایگزین به مشتری', target: o.id }); close(e, 'done', 'گزینه‌ها برای تصمیم مشتری ارسال شد'); toast('سه گزینه برای مشتری پیامک شد و سفارش «نیازمند تصمیم مشتری» شد.') }
  const open = E.filter((e) => e.status === 'open'); const done = E.filter((e) => e.status !== 'open')
  const dead = ['order.cancelled', 'order.delivered', 'order.returned'].includes(o.status)
  return (
    <>
      {open.length > 0 && <div className="space-y-2" role="alert" aria-live="polite">{open.map((e) => { const K = KIND[e.kind]; return (
        <div key={e.id} className={cx('relative overflow-hidden rounded-2xl border p-4', K.cls)}>
          <span className="absolute top-4 left-4 flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-danger" /></span>
          <p className="mb-1 flex flex-wrap items-center gap-2 text-14 font-semibold"><K.icon size={17} />{e.title}<Badge dot={false}>{K.label}</Badge><span className="text-11 font-normal text-t2">{rel(e.at)} · {e.by}</span></p>
          <p className="mb-3 text-13 leading-6 text-t1">{e.body}</p>
          <div className="flex flex-wrap gap-2">
            {e.kind === 'cancel' && <><Button size="sm" variant="danger" icon={<Check size={13} />} onClick={() => setCancel(e)}>{e.payload?.scope === 'کل سفارش' ? 'تأیید لغو و بازگشت وجه' : 'لغو همان قلم و بازگشت وجه'}</Button><Button size="sm" icon={<X size={13} />} onClick={() => void reject(e)}>رد با ذکر دلیل</Button></>}
            {e.kind === 'stock' && <><Button size="sm" variant="primary" icon={<RefreshCcw size={13} />} onClick={() => moveWh(e)}>تأمین از انبار مهاباد (پست)</Button><Button size="sm" onClick={() => offer(e)}>گزینه‌ها را برای مشتری بفرست</Button><Button size="sm" variant="danger" onClick={() => setCancel(e)}>لغو قلم و بازگشت وجه</Button></>}
            {e.kind === 'change' && <><Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => applyAddress(e)}>اعمال تغییر</Button><Button size="sm" icon={<X size={13} />} onClick={() => void reject(e)}>رد با ذکر دلیل</Button></>}
            {c && <Button size="sm" variant="ghost" icon={<Phone size={13} />} onClick={() => { window.location.href = `tel:${c.mobile}` }}>تماس با مشتری</Button>}
          </div>
        </div>) })}</div>}
      {done.length > 0 && <div className="text-12"><button type="button" onClick={() => setShowDone(!showDone)} className="text-t2 hover:text-brand">{showDone ? 'پنهان کردن' : 'نمایش'} {fa(done.length)} رویداد رسیدگی‌شده</button>{showDone && <ul className="mt-2 space-y-1">{done.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-1.5"><Badge tone={e.status === 'done' ? 'success' : 'neutral'}>{e.status === 'done' ? 'انجام شد' : 'رد شد'}</Badge><b>{e.title}</b><span className="text-t2">{e.result}</span></li>)}</ul>}</div>}
      {!dead && <div className="flex justify-end"><Button size="sm" variant="ghost" icon={<Undo2 size={13} />} onClick={() => setCancel('admin')}>لغو سفارش یا یک قلم توسط ما</Button></div>}
      <CancelModal key={cancel === 'admin' ? 'admin' : cancel?.id ?? 'none'} o={o} ev={cancel} onClose={() => setCancel(null)} onDone={(e, res) => e && close(e, 'done', res)} />
    </>
  )
}

/** لغو کل سفارش یا یک قلم، با انتخاب مقصد بازگشت وجه و دلیل؛ هم برای درخواست مشتری و هم تصمیم خود ما (مثلا ناموجودی) */
function CancelModal({ o, ev, onClose, onDone }: { o: Order; ev: OrderEvent | 'admin' | null; onClose: () => void; onDone: (e: OrderEvent | null, res: string) => void }) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId); const L = lines(o).filter((l) => !['ship.delivered', 'ship.cancelled'].includes(l.s.status))
  const e = ev && ev !== 'admin' ? ev : null
  const [scope, setScope] = useState<string>(e?.payload?.scope === 'کل سفارش' ? 'all' : L[0]?.key ?? 'all'); const [to, setTo] = useState(e?.payload?.refundTo ?? 'کیف پول')
  const amount = scope === 'all' ? L.reduce((a, l) => a + l.it.price * l.it.qty, 0) : (L.find((l) => l.key === scope)?.it.price ?? 0) * (L.find((l) => l.key === scope)?.it.qty ?? 1)
  const go = async () => {
    const why = e ? e.body.slice(0, 80) : await askReason({ kind: 'cancel', ref: o.id, status: scope === 'all' ? 'لغو سفارش' : 'لغو یک قلم', title: 'دلیل لغو (برای مشتری و سوابق)' }); if (!why) return
    mutate((x) => {
      const oo = x.orders.find((y) => y.id === o.id)!
      if (scope === 'all') { oo.status = 'order.cancelled'; oo.shipments.forEach((s) => { if (s.status !== 'ship.delivered') s.status = 'ship.cancelled' }) }
      else { const [sid, idx] = scope.split('|'); const sh = oo.shipments.find((s) => s.id === sid)!; sh.items.splice(Number(idx), 1); if (!sh.items.length) sh.status = 'ship.cancelled'; oo.total -= amount; if (oo.shipments.every((s) => s.status === 'ship.cancelled')) oo.status = 'order.cancelled' }
      if (to === 'کیف پول') x.journey.walletTx.unshift({ id: `WT-${600 + x.journey.walletTx.length}`, customerId: o.customerId, type: 'بازگشت وجه', amount, at: new Date().toISOString(), ref: o.id, status: 'انجام شد', note: scope === 'all' ? 'لغو سفارش' : 'لغو یک قلم' })
    }, { action: scope === 'all' ? 'لغو سفارش' : 'لغو یک قلم سفارش', target: o.id, after: `${toman(amount)} به ${to} · ${why}` })
    if (c) sendSms(c.mobile, `غنیمت: ${scope === 'all' ? `سفارش ${o.id} لغو شد` : `یک قلم از سفارش ${o.id} لغو شد`} و ${toman(amount)} به ${to} برمی‌گردد.`, 'وضعیت سفارش', o.id, c.id)
    onDone(e, scope === 'all' ? `سفارش لغو شد؛ ${toman(amount)} به ${to}` : `قلم لغو شد؛ ${toman(amount)} به ${to}`)
    toast(`${scope === 'all' ? 'سفارش' : 'قلم'} لغو شد. ${toman(amount)} ${to === 'کیف پول' ? 'به کیف پول مشتری واریز شد' : `به ${to} در صف بازگشت است`} و پیامک رفت.`); onClose()
  }
  return (
    <Modal open={!!ev} onClose={onClose} title={e ? `رسیدگی به «${e.title}»` : `لغو در سفارش ${o.id}`} footer={<><Button variant="danger" onClick={() => void go()}>تأیید لغو و بازگشت {toman(amount)}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="space-y-3">
        <Field label="چه چیزی لغو شود؟"><Select value={scope} onChange={setScope} options={[['all', `کل سفارش (${fa(L.length)} قلم)`], ...L.map((l) => [l.key, `${d.products.find((p) => p.id === l.it.productId)?.title ?? l.it.productId} · ${toman(l.it.price)} · ${l.s.id}`] as [string, string])]} /></Field>
        <Field label="بازگشت وجه به"><Select value={to} onChange={setTo} options={['کیف پول', 'کارت بانکی', 'همان روش پرداخت']} /></Field>
        <p className="rounded-xl bg-neutral-bg px-3 py-2 text-12 text-t2">مبلغ بازگشتی: <b className="text-t1">{toman(amount)}</b>. {to === 'کیف پول' ? 'فوری به کیف پول مشتری واریز می‌شود.' : 'در صف بازگشت وجه مالی قرار می‌گیرد (حداکثر ۷۲ ساعت).'}</p>
      </div>
    </Modal>
  )
}
