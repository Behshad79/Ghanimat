// برگرداندن وضعیت مرسوله در موارد بحرانی و سوابق قابل واگرد سفارش (ویرایش‌ها و برگرداندن‌ها، با روز و ساعت)
import { useState } from 'react'
import { History as HistoryIcon, RotateCcw, Undo2 } from 'lucide-react'
import { Badge, Button, Field, Select } from '@/shared/ui/base'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, isChief, mutate, snapshot, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import { STATUS } from '@/shared/data/statuses'
import type { Order } from '@/shared/data/seed'

export const SHIP_FLOW = ['ship.pending', 'ship.picking', 'ship.packed', 'ship.handed', 'ship.in_transit', 'ship.delivered']
/** مرسوله‌ای که به پیک یا پست رسیده، دیگر اقلامش قابل ویرایش نیست */
export const SHIPPED = ['ship.handed', 'ship.in_transit', 'ship.delivered', 'ship.cancelled', 'ship.returned']
const L = (s: string) => STATUS[s]?.label ?? s
const when = (at: string) => new Date(at).toLocaleString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const orderStatusFor = (to: string) => (['ship.pending'].includes(to) ? 'order.paid' : ['ship.picking', 'ship.packed'].includes(to) ? 'order.preparing' : to === 'ship.delivered' ? 'order.delivered' : 'order.shipped')

/** برگرداندن مرسوله به مرحلهٔ قبل: فقط مدیر کل، با دلیل؛ در سوابق ثبت می‌شود و قابل واگرد است */
export function RollbackShip({ o, sid }: { o: Order; sid: string }) {
  const s = o.shipments.find((x) => x.id === sid)!; const i = SHIP_FLOW.indexOf(s.status); const [open, setOpen] = useState(false); const [to, setTo] = useState(SHIP_FLOW[Math.max(0, i - 1)])
  if (i <= 0) return null
  const go = async () => {
    if (!isChief()) return toast('برگرداندن وضعیت فقط برای مدیر کل است.', { tone: 'err' })
    const why = await askReason({ kind: 'order', ref: o.id, status: `برگرداندن ${sid} از «${L(s.status)}» به «${L(to)}»`, title: 'دلیل برگرداندن (مورد بحرانی)' }); if (!why) return
    const undo = snapshot(); const who = currentUser()?.name ?? 'مدیر کل'
    mutate((x) => {
      const oo = x.orders.find((y) => y.id === o.id)!; const sh = oo.shipments.find((y) => y.id === sid)!
      oo.rollbacks = [...(oo.rollbacks ?? []), { at: new Date().toISOString(), by: who, shipId: sid, from: sh.status, to, reason: why, prev: { status: sh.status, orderStatus: oo.status, tracking: sh.tracking, courier: sh.courier ? structuredClone(sh.courier) : null } }]
      sh.status = to
      if (SHIP_FLOW.indexOf(to) < SHIP_FLOW.indexOf('ship.handed')) { sh.tracking = ''; sh.courier = null }
      oo.status = oo.shipments.some((y) => y.status !== 'ship.cancelled' && SHIP_FLOW.indexOf(y.status) < 3) ? orderStatusFor(to) : oo.status
    }, { action: 'برگرداندن وضعیت مرسوله', target: sid, before: L(s.status), after: `${L(to)} · ${why}` })
    toast(`مرسولهٔ ${sid} به «${L(to)}» برگشت و در سوابق ثبت شد.`, { undo }); setOpen(false)
  }
  return <>
    <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setOpen(true)}>برگرداندن به مرحلهٔ قبل</Button>
    <Modal open={open} onClose={() => setOpen(false)} title={`برگرداندن وضعیت ${sid}`} footer={<><Button variant="danger" onClick={() => void go()}>برگرداندن</Button><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button></>}>
      <div className="space-y-3 text-13">
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning">فقط برای موارد بحرانی، مثل ثبت اشتباه تحویل یا برگشت مرسوله از پیک پیش از تحویل. فقط مدیر کل می‌تواند، دلیل اجباری است و در سوابق با روز و ساعت ثبت و قابل واگرد می‌شود.</p>
        <p>وضعیت فعلی: <b>{L(s.status)}</b></p>
        <Field label="برگردد به"><Select value={to} other={false} onChange={setTo} options={SHIP_FLOW.slice(0, i).map((x) => [x, L(x)] as [string, string])} /></Field>
        {SHIP_FLOW.indexOf(to) < 3 && (s.tracking || s.courier) && <p className="text-12 text-t2">کد رهگیری و اطلاعات پیک این مرسوله پاک می‌شود (در سوابق می‌ماند و با واگرد برمی‌گردد).</p>}
      </div>
    </Modal>
  </>
}

/** سوابق تغییرهای سفارش با روز و ساعت؛ آخرین تغییر قابل واگرد است */
export function ChangeHistory({ o }: { o: Order }) {
  const d = useDB()
  type Row = { kind: 'edit' | 'rollback'; i: number; at: string; by: string; title: string; detail: string; undone?: boolean }
  const rows: Row[] = [
    ...(o.edits ?? []).map((e, i) => ({ kind: 'edit' as const, i, at: e.at, by: e.by, title: `ویرایش سفارش · ${e.src}`, detail: `${e.reason} · ${e.changes.join('؛ ')}${e.diff ? ` · ${e.diff > 0 ? '+' : '−'}${toman(Math.abs(e.diff))} (${e.settle})` : ''} · ${e.sms ? 'پیامک شد' : 'بدون پیامک'}`, undone: !!e.undone })),
    ...(o.rollbacks ?? []).map((r, i) => ({ kind: 'rollback' as const, i, at: r.at, by: r.by, title: `برگرداندن وضعیت ${r.shipId}`, detail: `${L(r.from)} ← ${L(r.to)} · ${r.reason}`, undone: !!r.undone })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  if (!rows.length) return null
  const last = rows.find((r) => !r.undone)
  const undo = async (r: Row) => {
    if (!isChief()) return toast('واگرد سوابق فقط برای مدیر کل است.', { tone: 'err' })
    if (!(await confirm({ title: 'واگرد این تغییر؟', body: r.kind === 'edit' ? 'سفارش به حالت پیش از این ویرایش برمی‌گردد (اقلام، قیمت‌ها، ارسال، نشانی). پرونده‌های بازگشت وجهِ این ویرایش در کارت «بازگشت وجه» می‌مانند و جداگانه رسیدگی می‌شوند.' : 'وضعیت مرسوله، کد رهگیری و اطلاعات پیک به حالت پیش از برگرداندن بازمی‌گردد.', confirm: 'واگرد' }))) return
    const who = currentUser()?.name ?? 'مدیر کل'
    mutate((x) => {
      const idx = x.orders.findIndex((y) => y.id === o.id); const cur = x.orders[idx]
      if (r.kind === 'edit') {
        const e = cur.edits![r.i]; const prev = JSON.parse(e.prev ?? 'null') as Order | null; if (!prev) return
        e.undone = { at: new Date().toISOString(), by: who }
        x.orders[idx] = { ...prev, edits: cur.edits, rollbacks: cur.rollbacks, notes: cur.notes }
      } else {
        const rb = cur.rollbacks![r.i]; const sh = cur.shipments.find((y) => y.id === rb.shipId); if (!sh) return
        sh.status = rb.prev.status; sh.tracking = rb.prev.tracking; sh.courier = rb.prev.courier; cur.status = rb.prev.orderStatus
        rb.undone = { at: new Date().toISOString(), by: who }
      }
    }, { action: `واگرد ${r.title}`, target: o.id, after: r.detail.slice(0, 120) })
    toast('تغییر واگرد شد و در سوابق ثبت شد.')
  }
  void d
  return <div className="mb-4 rounded-xl border border-line p-3">
    <p className="mb-2 flex items-center gap-1.5 text-12 font-semibold"><HistoryIcon size={14} />سوابق تغییرها ({fa(rows.length)})<span className="mr-auto text-11 font-normal text-t3">آخرین تغییر قابل واگرد است</span></p>
    <ul className="space-y-2">{rows.map((r) => <li key={`${r.kind}${r.i}`} className={r.undone ? 'opacity-60' : ''}>
      <div className="flex flex-wrap items-center gap-2 text-12"><Badge tone={r.kind === 'rollback' ? 'warning' : 'brand'} dot={false}>{r.kind === 'rollback' ? 'برگرداندن' : 'ویرایش'}</Badge><b>{r.title}</b><span className="text-t3">{when(r.at)} · {r.by}</span>{r.undone && <Badge dot={false}>واگرد شد</Badge>}
        {last === r && <Button size="sm" variant="ghost" className="mr-auto" icon={<Undo2 size={12} />} onClick={() => void undo(r)}>واگرد</Button>}</div>
      <p className="mt-0.5 text-12 leading-5 text-t2">{r.detail}</p>
    </li>)}</ul>
  </div>
}
