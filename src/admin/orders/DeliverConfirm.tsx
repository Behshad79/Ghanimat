// ثبت «تحویل به مشتری» (نه تحویل به پیک): دستی با زمان و تحویل‌گیرنده، یا خودکار از استعلام کد رهگیری پست/تیپاکس و سرویس پیک
import { useState } from 'react'
import { CheckCircle2, PackageCheck, RefreshCw, Search } from 'lucide-react'
import { Badge, Button, Field, Input, Segmented } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, fakeCall, mutate, sendSms, snapshot, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'

type Ev = { at: string; text: string; place?: string }
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const RELS = ['خود مشتری', 'خانواده', 'همکار یا محل کار', 'نگهبان یا لابی', 'همسایه', 'سایر']
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16)

/** پاسخ نمونهٔ سامانهٔ رهگیری (در نسخهٔ نهایی از API پست، تیپاکس یا سرویس پیک) */
function trackOf(s: Order['shipments'][number], name: string): { delivered: boolean; events: Ev[]; receiver?: string } {
  const h = hash(s.id + (s.tracking ?? '')); const t0 = new Date(s.sla).getTime() - 48 * 36e5; const at = (hh: number) => new Date(t0 + hh * 36e5).toISOString()
  const fast = /پیک/.test(s.method)
  const ev: Ev[] = fast ? [{ at: at(0), text: 'سفر پیک شروع شد' }, { at: at(0.4), text: 'بسته از انبار تحویل پیک شد' }, { at: at(0.9), text: 'پیک به مقصد رسید' }] : [{ at: at(0), text: 'پذیرش مرسوله', place: 'باجهٔ معاملاتی تهران' }, { at: at(6), text: 'خروج از مبدأ', place: 'مرکز مبادلات تهران' }, { at: at(20), text: 'ورود به مرکز مبادلهٔ مقصد', place: s.warehouse === 'mahabad' ? 'مرکز مبادلات ارومیه' : 'مرکز مبادلات مقصد' }, { at: at(30), text: 'تحویل به نامه‌رسان برای توزیع' }]
  const delivered = h % 3 !== 0
  if (delivered) ev.push({ at: fast ? at(1) : at(34), text: 'تحویل گیرنده شد', place: `تحویل‌گیرنده: ${name}` })
  return { delivered, events: ev, receiver: delivered ? name : undefined }
}

export function DeliverConfirm({ o, sid }: { o: Order; sid: string }) {
  const d = useDB(); const s = o.shipments.find((x) => x.id === sid)!; const c = d.customers.find((x) => x.id === o.customerId)
  const [open, setOpen] = useState(false); const [at, setAt] = useState(toLocalInput(new Date())); const [name, setName] = useState(o.receiver?.name ?? c?.name ?? ''); const [rel, setRel] = useState(RELS[0]); const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false); const [tr, setTr] = useState<ReturnType<typeof trackOf> | null>(null)
  const post = /پست|تیپاکس|باربری/.test(s.method); const canTrack = (post && !!s.tracking) || (!post && !!s.courier)
  const save = (via: string, when: string, who: string) => {
    const undo = snapshot()
    mutate((x) => { const oo = x.orders.find((y) => y.id === o.id)!; const sh = oo.shipments.find((y) => y.id === sid)! as typeof s & Record<string, any>
      sh.status = 'ship.delivered'; sh.deliveredAt = when; sh.deliveredTo = { name: who, relation: rel, note: note || undefined }; sh.deliveredVia = via
      if (oo.shipments.every((y) => ['ship.delivered', 'ship.cancelled'].includes(y.status))) { oo.status = 'order.delivered'; oo.deliveredAt = when } }, { action: 'ثبت تحویل به مشتری', target: sid, after: `${via} · ${who} (${rel}) · ${new Date(when).toLocaleString('fa-IR')}` })
    if (c) sendSms(c.mobile, `غنیمت: سفارش ${o.id} تحویل ${who === c.name ? 'شما' : who} شد. از خریدتان ممنونیم؛ برای ثبت دیدگاه یا مرجوعی به پنل کاربری سر بزنید.`, 'وضعیت سفارش', o.id, c.id)
    toast('تحویل به مشتری ثبت شد و پیامک رفت.', { undo }); setOpen(false); setTr(null)
  }
  const lookup = async () => { setBusy(true); try { await fakeCall(true) } catch { /* نمونه */ } setBusy(false); setTr(trackOf(s, name || c?.name || 'گیرنده')) }
  return <>
    <Button icon={<PackageCheck size={14} />} onClick={() => setOpen(true)} className="deliver-cta border-0">ثبت تحویل به مشتری</Button>
    <Modal open={open} onClose={() => setOpen(false)} title={`ثبت تحویل به مشتری · ${sid}`} footer={<><Button icon={<CheckCircle2 size={14} />} className="border-0 bg-[#12733f] text-white hover:bg-[#0e5c32]" disabled={!name.trim()} onClick={() => save('ثبت دستی', new Date(at).toISOString(), name.trim())}>ثبت دستی تحویل</Button><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button></>}>
      <div className="space-y-3 text-13">
        <p className="rounded-lg bg-brand-tint/50 px-3 py-2 text-12 text-brand">این یعنی بسته به دست مشتری یا نمایندهٔ او رسیده است. «تحویل پیک شد» مرحلهٔ قبل است، یعنی بسته از انبار به پیک یا پست داده شده.</p>
        {canTrack ? <div className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center gap-2"><b className="text-12">استعلام خودکار از {post ? (s.trackingCarrier ?? 'پست') : 'سرویس پیک'}</b>{post ? <bdi dir="ltr" className="font-mono text-11 text-t2">{s.tracking}</bdi> : <span className="text-11 text-t2">{s.courier?.name} · {s.courier?.code}</span>}<Button size="sm" className="mr-auto" icon={busy ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />} disabled={busy} onClick={() => void lookup()}>استعلام وضعیت</Button></div>
          {tr && <><ol className="mt-2 space-y-1 border-r-2 border-line pr-3 text-12">{tr.events.map((e, i) => <li key={i} className={i === tr.events.length - 1 ? 'font-semibold' : 'text-t2'}>{new Date(e.at).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {e.text}{e.place ? ` · ${e.place}` : ''}</li>)}</ol>
            {tr.delivered ? <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="success">سامانه: تحویل گیرنده شد</Badge><Button size="sm" variant="primary" onClick={() => save(post ? 'استعلام کد رهگیری' : 'گزارش سرویس پیک', tr.events[tr.events.length - 1].at, tr.receiver ?? name)}>ثبت تحویل از روی استعلام</Button></div> : <p className="mt-2 text-12 text-warning">هنوز تحویل نشده است. وضعیت هر {fa(3)} ساعت خودکار بررسی می‌شود و با تحویل، سفارش خودش به‌روز می‌شود.</p>}</>}
        </div> : <p className="text-12 text-t2">{post ? 'کد رهگیری برای این مرسوله ثبت نشده؛ تحویل را دستی ثبت کنید.' : 'اطلاعات پیک ثبت نشده؛ تحویل را دستی ثبت کنید.'}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="زمان تحویل"><Input type="datetime-local" className="ltr" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
          <Field label="نام تحویل‌گیرنده"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </div>
        <Field label="نسبت تحویل‌گیرنده"><Segmented size="sm" value={rel} onChange={setRel} options={RELS.map((x) => [x, x] as [string, string])} /></Field>
        <Field label="توضیح (اختیاری)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً تحویل نگهبان برج" /></Field>
        <p className="text-11 text-t3">پس از ثبت، مشتری پیامک تحویل می‌گیرد، سفارش «تحویل‌شده» می‌شود و مهلت مرجوعی از همین زمان شروع می‌شود. ثبت‌کننده: {currentUser()?.name ?? 'شما'}.</p>
      </div>
    </Modal>
  </>
}
