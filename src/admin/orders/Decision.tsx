// تصمیم مشتری در کمبود تأمین؛ دقیقاً مطابق فیگما (سفارش‌های جاری › «نیازمند تصمیم شما»، حالت‌های ۱ تا ۱۱)
// سه نوع: تأمین نشد (تأیید بخشی)، ناموجود، موجود در انبار دیگر. انتخاب‌های مشتری و لغو خودکار پس از مهلت.
import { useState } from 'react'
import { AlertTriangle, Clock, PackageX, Truck } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Segmented } from '@/shared/ui/base'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { currentUser, getDB, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import type { Order, OrderDecision } from '@/shared/data/seed'

const KIND: Record<OrderDecision['kind'], { badge: string; title: (n: number, total: number, alt?: string) => string; sub: string }> = {
  unsupplied: { badge: 'تأمین نشد', title: (n, t) => `${fa(t - n)} کالا تأیید شد و ${fa(n)} کالا تأمین نشد`, sub: 'این کالاها تأمین نشدند و بقیهٔ کالاها تا انتخاب مشتری ارسال نمی‌شوند.' },
  out_of_stock: { badge: 'ناموجود', title: (n) => `${fa(n)} کالا از سفارش موجود نیست`, sub: 'موجودی این کالا تمام شده است و بقیهٔ کالاها تا انتخاب مشتری ارسال نمی‌شوند.' },
  other_warehouse: { badge: 'موجود در انبار دیگر', title: (n, _t, alt) => `${fa(n)} کالا در انبار اصلی نیست، ولی در ${WAREHOUSE[alt ?? 'mahabad'] ?? 'انبار دیگر'} موجود است`, sub: 'بقیهٔ کالاها تا انتخاب مشتری ارسال نمی‌شوند.' },
}
const key = (shipId: string, i: number) => `${shipId}|${i}`
const isBnpl = (o: Order) => /اسنپ|ترب|دیجی|تارا|کیپا|اقساط/.test(o.pay)

/** اجرای انتخاب: لغو اقلام، مرسولهٔ جدا از انبار دیگر، یا لغو کل سفارش؛ با بازگشت وجه و ثبت رویداد */
export function applyDecision(oid: string, choice: NonNullable<OrderDecision['choice']>, by: NonNullable<OrderDecision['chosenBy']>) {
  const o0 = getDB().orders.find((x) => x.id === oid); if (!o0?.decision) return
  const dec = o0.decision; const picked = (s: { id: string }, i: number) => dec.items.includes(key(s.id, i))
  let refund = 0
  mutate((d) => {
    const o = d.orders.find((x) => x.id === oid)!; const dd = o.decision!
    if (choice === 'cancel_all') { o.shipments.forEach((s) => { s.items.forEach((it) => { if (!it.cancelled) { refund += it.price * it.qty; it.cancelled = true; it.cancelBy = by } }); s.status = 'ship.cancelled' }); o.status = 'order.cancelled' }
    else if (choice === 'from_other') {
      const moved: typeof o.shipments[number]['items'] = []
      o.shipments.forEach((s) => { s.items.forEach((it, i) => { if (picked(s, i)) { moved.push({ ...it }); it.cancelled = true; it.cancelBy = 'انتقال به مرسولهٔ جدا' } }) })
      const base = o.shipments[0]
      o.shipments.push({ ...base, id: `${o.id}-${o.shipments.length + 1}`, warehouse: dd.alt ?? 'mahabad', method: 'پست پیشتاز', shipFee: 0, status: 'ship.pending', sla: new Date(Date.now() + 72 * 36e5).toISOString(), items: moved, courier: null, tracking: '', packPhotos: [], allocReason: `به انتخاب ${by}: ارسال جدا از ${WAREHOUSE[dd.alt ?? 'mahabad']} بدون هزینهٔ اضافه` })
      o.status = 'order.preparing'
    } else {
      o.shipments.forEach((s) => { s.items.forEach((it, i) => { if (picked(s, i)) { refund += it.price * it.qty; it.cancelled = true; it.cancelBy = by } }); if (s.items.every((it) => it.cancelled)) s.status = 'ship.cancelled' })
      o.status = 'order.preparing'
    }
    dd.choice = choice; dd.chosenBy = by; dd.chosenAt = new Date().toISOString(); dd.refund = refund
  }, { action: `تصمیم کمبود تأمین: ${choice === 'cancel_all' ? 'لغو کل سفارش' : choice === 'from_other' ? 'ارسال جدا از انبار دیگر' : 'لغو کالا و ارسال بقیه'}`, target: oid, after: by })
  const c = getDB().customers.find((x) => x.id === o0.customerId)
  const back = isBnpl(o0) ? 'از قسط‌های باقی‌مانده کم می‌شود' : 'به کیف پول یا کارت شما برمی‌گردد'
  const txt = choice === 'cancel_all' ? `کل سفارش ${oid} لغو شد؛ ${toman(refund)} ${back}.` : choice === 'from_other' ? `کالای سفارش ${oid} در مرسولهٔ جدا از ${WAREHOUSE[dec.alt ?? 'mahabad']} با پست ارسال می‌شود و تا ۷۲ ساعت می‌رسد؛ هزینهٔ اضافه ندارد.` : `${by === 'سیستم' ? 'مهلت انتخاب تمام شد؛ ' : ''}${fa(dec.items.length)} کالای سفارش ${oid} لغو شد و ${toman(refund)} ${back}. بقیهٔ کالاها ارسال می‌شوند.`
  if (c) sendSms(c.mobile, `غنیمت: ${txt}`, 'وضعیت سفارش', oid, c.id)
  toast(txt)
}

export function DecisionPanel({ o }: { o: Order }) {
  const d = useDB(); const [ask, setAsk] = useState(false)
  const dec = o.decision
  const all = o.shipments.flatMap((s) => s.items.map((it, i) => ({ s, it, k: key(s.id, i) })))
  const live = all.filter((x) => !x.it.cancelled || dec?.items.includes(x.k))
  if (!dec) return <>
    {['order.paid', 'order.preparing'].includes(o.status) && <div className="flex justify-end"><Button size="sm" variant="ghost" icon={<PackageX size={14} />} onClick={() => setAsk(true)}>اعلام کمبود به مشتری</Button></div>}
    <StartDecision o={o} open={ask} onClose={() => setAsk(false)} />
  </>
  const K = KIND[dec.kind]; const n = dec.items.length
  const sum = all.filter((x) => dec.items.includes(x.k)).reduce((a, x) => a + x.it.price * x.it.qty, 0)
  const back = isBnpl(o) ? 'از قسط‌های باقی‌مانده کم می‌شود' : 'به کیف پول یا کارت مشتری برمی‌گردد'
  const late = new Date(dec.deadline).getTime() < Date.now()
  if (dec.choice) return <Card title="نتیجهٔ تصمیم کمبود تأمین">
    <p className="text-13">{dec.choice === 'cancel_all' ? 'کل سفارش لغو شد.' : dec.choice === 'from_other' ? `کالا در مرسولهٔ جدا از ${WAREHOUSE[dec.alt ?? 'mahabad']} ارسال می‌شود.` : `${fa(n)} کالا لغو شد و ${fa(live.length - n)} کالای دیگر ارسال می‌شوند.`}{dec.refund ? ` بازگشت وجه: ${toman(dec.refund)} (${back}).` : ''}</p>
    <p className="mt-1 text-12 text-t2">انتخاب‌کننده: {dec.chosenBy}{dec.chosenBy === 'سیستم' && ' (پایان مهلت بدون انتخاب)'} · {dec.chosenAt && rel(dec.chosenAt)}</p>
  </Card>
  const opts: [NonNullable<OrderDecision['choice']>, string, string][] = [
    ...(dec.kind === 'other_warehouse' ? [['from_other', `از ${WAREHOUSE[dec.alt ?? 'mahabad']} بفرستید`, 'این کالا در مرسولهٔ جدا با پست ارسال می‌شود و تا ۷۲ ساعت می‌رسد. هزینهٔ اضافه ندارد.'] as [NonNullable<OrderDecision['choice']>, string, string]] : []),
    ['send_rest', dec.kind === 'unsupplied' ? `${fa(live.length - n)} کالای تأییدشده را بفرستید` : dec.kind === 'other_warehouse' ? 'این کالا را لغو کنید' : 'بقیهٔ کالاها را بفرستید', `${n > 1 ? `این ${fa(n)} کالا حذف می‌شوند` : 'این کالا حذف می‌شود'} و ${toman(sum)} ${back}.`],
    ['cancel_all', 'کل سفارش را لغو کنید', `همهٔ کالاها لغو می‌شوند${isBnpl(o) ? ' و قسط‌های باقی‌ماندهٔ این سفارش لغو می‌شوند' : ' و کل مبلغ برمی‌گردد'}.`],
  ]
  return <Card className="border-warning/50" title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-warning" />نیازمند تصمیم مشتری: {K.title(n, live.length, dec.alt)}</span>} actions={<Badge tone={late ? 'danger' : 'warning'} dot={false}><Clock size={12} className="me-1 inline" />{late ? 'مهلت تمام شد' : `مهلت ${rel(dec.deadline)}`}</Badge>}>
    <p className="text-13 text-t2">{K.sub} مشتری این را در «سفارش‌های جاری» با برچسب «نیازمند تصمیم شما» می‌بیند و پیامک گرفته است.</p>
    <ul className="mt-3 divide-y divide-line rounded-md border border-line">{live.map((x) => { const p = d.products.find((y) => y.id === x.it.productId); const bad = dec.items.includes(x.k)
      return <li key={x.k} className="flex items-center justify-between gap-2 px-3 py-2 text-13"><span className="min-w-0 truncate">{p?.title ?? x.it.productId}<span className="text-12 text-t3"> · {x.s.id}</span></span><Badge tone={bad ? (dec.kind === 'other_warehouse' ? 'info' : 'danger') : 'success'} dot={false}>{bad ? K.badge : 'تأیید شد'}</Badge></li> })}</ul>
    <p className="mb-2 mt-4 text-12 font-semibold">گزینه‌های مشتری (اگر تلفنی یا در گفتگو اعلام کرد، به‌جایش ثبت کنید)</p>
    <div className="grid gap-2 md:grid-cols-3">{opts.map(([v, t, sub]) => <button key={v} type="button" onClick={async () => { if (await confirm({ title: `ثبت انتخاب «${t}»؟`, body: `${sub} به مشتری پیامک می‌شود.`, confirm: 'ثبت انتخاب', danger: v === 'cancel_all' })) applyDecision(o.id, v, 'پشتیبانی') }} className={cx('rounded-lg border p-3 text-start hover:border-brand/50', v === 'cancel_all' ? 'border-danger/30' : 'border-line')}><span className="block text-13 font-semibold">{t}</span><span className="mt-1 block text-12 text-t2">{sub}</span></button>)}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><p className="flex-1 text-12 text-t2">اگر تا پایان مهلت انتخاب نکند، سیستم {n > 1 ? `این ${fa(n)} کالا` : 'این کالا'} را لغو و بقیهٔ کالاها را ارسال می‌کند.</p>
      <Button size="sm" variant={late ? 'primary' : 'ghost'} onClick={async () => { if (late || await confirm({ title: 'لغو خودکار اکنون اجرا شود؟', body: 'مهلت هنوز تمام نشده؛ این کار همان چیزی است که سیستم در پایان مهلت انجام می‌دهد.', confirm: 'اجرا' })) applyDecision(o.id, 'send_rest', 'سیستم') }}>{late ? 'اجرای لغو خودکار' : 'اجرای لغو خودکار (پیش از مهلت)'}</Button></div>
  </Card>
}

function StartDecision({ o, open, onClose }: { o: Order; open: boolean; onClose: () => void }) {
  const d = useDB(); const hours = Number(d.rules.find((r) => r.key === 'decision_hours')?.value ?? 24)
  const [kind, setKind] = useState<OrderDecision['kind']>('out_of_stock'); const [items, setItems] = useState<string[]>([]); const [alt, setAlt] = useState('mahabad')
  const all = o.shipments.flatMap((s) => s.items.map((it, i) => ({ s, it, k: key(s.id, i) }))).filter((x) => !x.it.cancelled)
  const go = () => {
    if (!items.length) return toast('کالای کم‌آمده را انتخاب کنید.', { tone: 'err' })
    if (items.length === all.length && kind !== 'other_warehouse') return toast('اگر هیچ کالایی تأمین نمی‌شود، سفارش را با دلیل لغو کنید.', { tone: 'err' })
    const deadline = new Date(Date.now() + hours * 36e5).toISOString()
    mutate((x) => { const y = x.orders.find((z) => z.id === o.id)!; y.decision = { kind, items, alt: kind === 'other_warehouse' ? alt : undefined, deadline, at: new Date().toISOString(), by: currentUser()?.name ?? 'کاربر' }; y.status = 'order.needs_decision' }, { action: 'اعلام کمبود تأمین به مشتری', target: o.id, after: `${KIND[kind].badge} · ${items.length} کالا` })
    const c = d.customers.find((z) => z.id === o.customerId)
    if (c) sendSms(c.mobile, `غنیمت: برای سفارش ${o.id} ${kind === 'other_warehouse' ? `${fa(items.length)} کالا در انبار دیگری موجود است` : `${fa(items.length)} کالا ${kind === 'unsupplied' ? 'تأمین نشد' : 'موجود نیست'}`}. تا ${fa(hours)} ساعت در پنل کاربری انتخاب کنید؛ در غیر این صورت این کالا لغو و بقیه ارسال می‌شود.`, 'وضعیت سفارش', o.id, c.id)
    toast('برای مشتری پیامک شد؛ سفارش در «نیازمند تصمیم مشتری» است.'); setItems([]); onClose()
  }
  return <Modal open={open} onClose={onClose} title={`اعلام کمبود · ${o.id}`} footer={<><Button variant="primary" onClick={go}>اعلام به مشتری</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3">
      <Field label="چه اتفاقی افتاده؟"><Segmented value={kind} onChange={setKind} options={[['unsupplied', 'تأمین نشد'], ['out_of_stock', 'ناموجود'], ['other_warehouse', 'در انبار دیگر موجود است']]} /></Field>
      {kind === 'other_warehouse' && <Field label="انبار دیگر"><Segmented value={alt} onChange={setAlt} options={Object.entries(WAREHOUSE).filter(([k]) => !o.shipments.some((s) => s.warehouse === k)).map(([k, v]) => [k, v]) as [string, string][]} /></Field>}
      <Field label="کدام کالاها؟"><ul className="space-y-1">{all.map((x) => { const on = items.includes(x.k); const p = d.products.find((y) => y.id === x.it.productId)
        return <li key={x.k}><button type="button" aria-pressed={on} onClick={() => setItems(on ? items.filter((z) => z !== x.k) : [...items, x.k])} className={cx('flex w-full items-center justify-between rounded-md border px-3 py-2 text-start text-13', on ? 'border-brand-solid bg-brand-tint' : 'border-line')}><span>{p?.title}</span><span className="text-12 text-t2">{toman(x.it.price * x.it.qty)}</span></button></li> })}</ul></Field>
      <p className="flex items-center gap-1 text-12 text-t2"><Truck size={13} />مشتری {fa(hours)} ساعت مهلت انتخاب دارد (قانون «مهلت تصمیم مشتری»).</p>
    </div>
  </Modal>
}
