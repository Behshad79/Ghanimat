import { useState } from 'react'
import { MapPin, Printer, ScanLine } from 'lucide-react'
import { Badge, Button, cx, Input, StatusBadge } from '@/shared/ui/base'
import { Modal } from '@/shared/ui/overlay'
import { useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import { STATUS, WAREHOUSE } from '@/shared/data/statuses'
import { binOf } from '@/shared/data/site'
import type { Order } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'
import { Invoice, PickList, PickupReceipt, PostLabel } from '../print/docs'

/** توضیح ساده برای کسی که تازه آمده */
const PLAIN: Record<string, string> = {
  'unit.qc': 'تازه رسیده؛ باید سالم بودنش چک شود.', 'unit.photo': 'چک شده؛ منتظر عکس واقعی است.', 'unit.ready': 'آماده است ولی هنوز در سایت نیست.',
  'unit.published': 'در سایت است و می‌شود فروخت.', 'unit.reserved': 'برای یک سفارش کنار گذاشته شده؛ به آن دست نزنید.', 'unit.sold': 'فروخته و ارسال شده.',
}
const findBin = (layout: ReturnType<typeof useDB>['layout'], wh: string, bin: string) => { for (const f of layout[wh as 'tehran'] ?? []) for (const s of f.sections) { const i = s.bins.findIndex((b) => b.id === bin); if (i >= 0) return { floor: f.name, sec: s, i } } return null }

/** «کالا کجاست؟»: هر واحد در کدام انبار، طبقه، قفسه و خانه است؛ با نقشهٔ کوچک قفسه */
export function FindFlow() {
  const d = useDB(); const [q, setQ] = useState('')
  const norm = (t: string) => t.toLowerCase()
  const products = q.trim().length < 2 ? [] : d.products.filter((p) => norm(`${p.title} ${p.en} ${p.code ?? ''}`).includes(norm(q)) || d.units.some((u) => u.productId === p.id && norm(`${u.serial} ${u.code ?? ''} ${u.id}`).includes(norm(q)))).slice(0, 6)
  return (
    <div className="page-enter space-y-3">
      <h2 className="text-20 font-bold">کالا کجاست؟</h2>
      <p className="text-13 text-t2">نام کالا، کد کالا، سریال یا کد واحد را بنویسید یا بارکد را اسکن کنید.</p>
      <div className="relative"><ScanLine size={18} className="absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input autoFocus className="h-12 pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً AirPods یا GU-20412" /></div>
      {q.trim().length >= 2 && products.length === 0 && <p className="rounded-xl bg-neutral-bg p-3 text-14">چیزی پیدا نشد. املای نام یا کد را دوباره چک کنید.</p>}
      {products.map((p) => { const units = d.units.filter((u) => u.productId === p.id && u.status !== 'unit.sold'); return (
        <div key={p.id} className="rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 flex items-center gap-3"><ProductImg pid={p.id} size={52} /><div className="min-w-0"><p className="text-15 font-bold">{p.title}</p><p className="text-12 text-t2">{p.mode === 'qty' ? `کالای تعدادی · تهران ${fa(p.qty?.tehran ?? 0)} عدد، مهاباد ${fa(p.qty?.mahabad ?? 0)} عدد` : `${fa(units.length)} واحد در انبار`}</p></div></div>
          {units.length === 0 && p.mode !== 'qty' && <p className="text-13 text-t2">الان واحدی از این کالا در انبار نیست.</p>}
          <ul className="space-y-2">{units.map((u) => { const loc = findBin(d.layout, u.warehouse, binOf(u.shelf)); const order = d.orders.find((o) => o.shipments.some((s) => s.items.some((i) => i.unitId === u.id) && !['ship.delivered', 'ship.cancelled'].includes(s.status))); return (
            <li key={u.id} className="rounded-xl bg-surface-2 p-3 text-13">
              <div className="flex flex-wrap items-center gap-2"><b className="ltr font-mono">{u.code ?? u.id}</b><StatusBadge s={u.status} /><span className="text-12 text-t2">گرید {u.grade}</span></div>
              <p className="mt-1 text-12 text-t2">{PLAIN[u.status] ?? ''}{order && <> سفارش <b className="ltr">{order.id}</b>.</>}</p>
              <p className="mt-2 flex items-center gap-1.5 text-14 font-bold text-brand"><MapPin size={16} />{WAREHOUSE[u.warehouse]}{loc ? ` · ${loc.floor} · ${loc.sec.name} · خانهٔ ${binOf(u.shelf)}` : ` · ${u.shelf || 'جای مشخص ندارد'}`}</p>
              {loc && <div className="mt-2 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${loc.sec.cols ?? loc.sec.bins.length}, minmax(0, 28px))` }}>{loc.sec.bins.map((b, i) => <span key={b.id} title={b.id} className={cx('h-6 rounded', i === loc.i ? 'animate-pulse bg-brand-solid' : 'bg-line')} />)}</div>}
              {loc && <p className="mt-1 text-11 text-t2">ردیف {fa(Math.floor(loc.i / (loc.sec.cols ?? loc.sec.bins.length)) + 1)} از بالا، خانهٔ {fa(loc.i % (loc.sec.cols ?? loc.sec.bins.length) + 1)} از راست · ناحیهٔ {loc.sec.zone}</p>}
            </li>) })}</ul>
        </div>) })}
    </div>
  )
}

type Doc = 'invoice' | 'label' | 'pick' | 'pickup'
/** چاپ فاکتور، برچسب پستی، برگهٔ جمع‌آوری و رسید دریافت حضوری، مستقیم از حالت سریع */
export function PrintFlow() {
  const d = useDB(); const [q, setQ] = useState(''); const [show, setShow] = useState<{ o: Order; doc: Doc } | null>(null)
  const opts = { font: 1, margin: 10, footer: 'غنیمت | کالای اصل وارداتی', seal: true, hide: [] as string[] }
  const list = d.orders.filter((o) => !['order.cancelled'].includes(o.status) && (!q || o.id.includes(q.toUpperCase()) || (d.customers.find((c) => c.id === o.customerId)?.name ?? '').includes(q))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12)
  const name = (o: Order) => d.customers.find((c) => c.id === o.customerId)?.name ?? ''
  const docs: [Doc, string][] = [['invoice', 'فاکتور'], ['label', 'برچسب پستی'], ['pick', 'برگهٔ جمع‌آوری'], ['pickup', 'رسید حضوری']]
  return (
    <div className="page-enter space-y-3">
      <h2 className="text-20 font-bold">چاپ فاکتور و برچسب</h2>
      <p className="text-13 text-t2">سفارش را پیدا کنید و برگهٔ لازم را بزنید. فاکتور داخل بسته می‌رود؛ برچسب پستی روی کارتن چسبانده می‌شود؛ برگهٔ جمع‌آوری برای پیدا کردن کالا در قفسه است.</p>
      <Input className="h-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="شمارهٔ سفارش یا نام مشتری" />
      <ul className="space-y-2">{list.map((o) => <li key={o.id} className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2"><b className="ltr font-mono">{o.id}</b><StatusBadge s={o.status} /><span className="text-13 text-t2">{name(o)} · {toman(o.total)} · {rel(o.createdAt)}</span></div>
        <div className="mt-2 flex flex-wrap gap-2">{docs.filter(([k]) => k !== 'pickup' || o.status === 'order.pickup_ready').map(([k, l]) => <Button key={k} size="sm" icon={<Printer size={13} />} onClick={() => setShow({ o, doc: k })}>{l}</Button>)}</div>
      </li>)}</ul>
      <Modal wide open={!!show} onClose={() => setShow(null)} title={show ? `${docs.find((x) => x[0] === show.doc)?.[1]} · ${show.o.id}` : ''} footer={<><Button variant="primary" icon={<Printer size={14} />} onClick={() => window.print()}>چاپ</Button><Button variant="ghost" onClick={() => setShow(null)}>بستن</Button></>}>
        {show && <div className="print-area overflow-auto">{show.doc === 'invoice' ? <Invoice o={show.o} opts={opts} /> : show.doc === 'label' ? <PostLabel o={show.o} s={show.o.shipments[0]} opts={opts} paper="A6" /> : show.doc === 'pick' ? <PickList ships={show.o.shipments.map((s) => ({ ...s, order: show.o }))} opts={opts} /> : <PickupReceipt o={show.o} opts={opts} />}</div>}
      </Modal>
    </div>
  )
}

/** واژه‌نامهٔ ساده: هر وضعیت یعنی چه و الان چه باید کرد */
export function Glossary() {
  const rows: [string, string][] = [['order.paid', 'پول آمده؛ باید تأیید و آماده‌سازی شود.'], ['order.preparing', 'در حال جمع‌آوری و بسته‌بندی.'], ['order.shipped', 'تحویل پیک یا پست شده.'], ['order.needs_decision', 'مشکلی هست؛ مدیر باید تصمیم بگیرد.'], ['order.suspicious', 'شاید تقلب باشد؛ ارسال نکنید.'], ['order.pickup_ready', 'آماده؛ مشتری حضوری می‌آید.'], ...Object.entries(PLAIN).map(([k, v]) => [k, v] as [string, string])]
  return <ul className="space-y-1.5 text-13">{rows.map(([k, v]) => <li key={k} className="flex items-start gap-2"><span className="shrink-0">{STATUS[k] ? <Badge tone={STATUS[k].tone as 'info'}>{STATUS[k].label}</Badge> : k}</span><span className="text-t2">{v}</span></li>)}</ul>
}
