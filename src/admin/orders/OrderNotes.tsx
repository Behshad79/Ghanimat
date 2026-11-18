// یادداشت‌های سفارش: توضیح مشتری هنگام پرداخت، درخواست‌های تلفنی و پیام‌رسان، و یادداشت داخلی تیم؛ با «باید اعمال شود» و «انجام شد»
import { useState } from 'react'
import { Check, MessageSquareQuote, PhoneCall, Pin, StickyNote } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Segmented, Textarea, Toggle } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { currentUser, mutate } from '@/shared/lib/store'
import { rel } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'

export type ONote = { id: string; at: string; by: string; src: 'تماس تلفنی' | 'پیام‌رسان' | 'حضوری' | 'داخلی'; text: string; act?: boolean; done?: boolean; doneBy?: string }
const SRC: ONote['src'][] = ['تماس تلفنی', 'پیام‌رسان', 'حضوری', 'داخلی']
const ICON = { 'تماس تلفنی': PhoneCall, 'پیام‌رسان': MessageSquareQuote, 'حضوری': StickyNote, 'داخلی': StickyNote }
/** تعداد درخواست‌های انجام‌نشده (برای نشان در فهرست سفارش‌ها و پرتال شعبه) */
export const openNotes = (o: Order) => (o.customerNote && !o.customerNoteDone ? 1 : 0) + (o.notes ?? []).filter((n) => n.act && !n.done).length

/** نوار برجستهٔ بالای سفارش: هر چیزی که هنگام آماده‌سازی باید دیده شود */
export function NoteBanner({ o, compact }: { o: Order; compact?: boolean }) {
  const acts = (o.notes ?? []).filter((n) => n.act && !n.done)
  if (!(o.customerNote && !o.customerNoteDone) && !acts.length) return null
  return <div className={cx('rounded-xl border border-warning/50 bg-warning-bg/60 text-12', compact ? 'p-2' : 'p-3')} role="note">
    <p className="mb-1 flex items-center gap-1.5 font-semibold text-warning"><Pin size={13} />پیش از آماده‌سازی بخوانید</p>
    <ul className="space-y-1">{o.customerNote && !o.customerNoteDone && <li><b>توضیح مشتری هنگام پرداخت:</b> «{o.customerNote}»</li>}{acts.map((n) => <li key={n.id}><b>{n.src}:</b> {n.text}</li>)}</ul>
  </div>
}

export function OrderNotes({ o }: { o: Order }) {
  const me = currentUser()?.name ?? 'کارشناس'
  const [src, setSrc] = useState<ONote['src']>('تماس تلفنی'); const [text, setText] = useState(''); const [act, setAct] = useState(true)
  const up = (fn: (x: Order) => void, action: string) => mutate((db) => fn(db.orders.find((y) => y.id === o.id)!), { action, target: o.id })
  const add = () => { if (!text.trim()) return; up((x) => { (x.notes ??= []).unshift({ id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), by: me, src, text: text.trim(), act: src !== 'داخلی' && act }) }, `یادداشت سفارش (${src})`); setText(''); toast(act && src !== 'داخلی' ? 'ثبت شد و بالای سفارش، در برگهٔ جمع‌آوری و پرتال شعبه نمایش داده می‌شود.' : 'یادداشت ثبت شد.') }
  const notes = o.notes ?? []
  return <Card title={<span className="flex items-center gap-2">یادداشت‌ها و درخواست‌های مشتری{openNotes(o) > 0 && <Badge tone="warning">{openNotes(o)} درخواست انجام‌نشده</Badge>}</span>}>
    <div className="space-y-3">
      <div className={cx('rounded-xl border p-3 text-13', o.customerNote ? 'border-brand/30 bg-brand-tint/30' : 'border-dashed border-line')}>
        <p className="mb-1 flex items-center justify-between gap-2 text-12 font-semibold text-t2"><span className="flex items-center gap-1.5"><MessageSquareQuote size={14} />توضیح مشتری هنگام پرداخت</span>{o.customerNote && <label className="flex items-center gap-1.5 font-normal"><Toggle on={!!o.customerNoteDone} label="انجام شد" onChange={(v) => up((x) => { x.customerNoteDone = v }, v ? 'انجام درخواست مشتری' : 'بازگشایی درخواست مشتری')} />انجام شد</label>}</p>
        {o.customerNote ? <p className={cx(o.customerNoteDone && 'text-t3 line-through')}>«{o.customerNote}»</p> : <p className="text-12 text-t3">مشتری در مرحلهٔ پرداخت توضیحی ننوشته است. این فیلد در صفحهٔ پرداخت سایت با عنوان «توضیح برای سفارش (اختیاری)» است.</p>}
      </div>
      {notes.length > 0 && <ul className="space-y-2">{notes.map((n) => { const I = ICON[n.src]; return <li key={n.id} className={cx('flex items-start gap-2 rounded-xl border border-line p-2.5 text-13', n.done && 'opacity-60')}>
        <I size={15} className="mt-0.5 shrink-0 text-t2" />
        <div className="min-w-0 flex-1"><p className={cx(n.done && 'line-through')}>{n.text}</p><p className="mt-0.5 text-11 text-t3">{n.src} · {n.by} · {rel(n.at)}{n.done && n.doneBy ? ` · انجام: ${n.doneBy}` : ''}</p></div>
        {n.act && <Button size="sm" variant={n.done ? 'ghost' : 'secondary'} icon={<Check size={12} />} onClick={() => up((x) => { const y = x.notes!.find((z) => z.id === n.id)!; y.done = !y.done; y.doneBy = y.done ? me : undefined }, n.done ? 'بازگشایی درخواست' : 'انجام درخواست سفارش')}>{n.done ? 'بازگشایی' : 'انجام شد'}</Button>}
      </li> })}</ul>}
      <div className="rounded-xl bg-neutral-bg/60 p-3">
        <Field label="ثبت یادداشت یا درخواست تازه"><Segmented size="sm" value={src} onChange={setSrc} options={SRC.map((x) => [x, x])} /></Field>
        <Textarea aria-label="متن یادداشت" className="mt-2" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={src === 'تماس تلفنی' ? 'مثلاً مشتری تماس گرفت: بسته را کادو کنید و فاکتور قیمت داخل نگذارید' : src === 'داخلی' ? 'یادداشت داخلی تیم؛ مشتری نمی‌بیند' : 'خلاصهٔ درخواست مشتری'} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">{src !== 'داخلی' ? <label className="flex items-center gap-1.5 text-12"><Toggle on={act} label="باید اعمال شود" onChange={setAct} />باید هنگام آماده‌سازی اعمال شود</label> : <span className="text-11 text-t3">فقط تیم می‌بیند</span>}<Button size="sm" variant="primary" disabled={!text.trim()} onClick={add}>ثبت</Button></div>
      </div>
    </div>
  </Card>
}
