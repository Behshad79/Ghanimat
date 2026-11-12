import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Download, FileText, Printer, RotateCcw, Settings2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { Drawer, toast } from '@/shared/ui/overlay'
import { mutate, useDB, useSession } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { CourierLabel, Invoice, Manifest, PickList, PickupReceipt, PostLabel, QCSheet, ReturnForm, WarrantyCard, type DocOpts } from './docs'
import { useQuickChips } from '../pages/_shared'
import { EditableDoc } from './EditableDoc'

export const DOCS: { id: string; label: string; src: 'order' | 'ship' | 'unit' | 'ret' | 'batch' | 'labels'; papers: string[]; fields: [string, string][] }[] = [
  { id: 'invoice', label: 'فاکتور فروش (حقیقی و حقوقی)', src: 'order', papers: ['A4'], fields: [['paymentInfo', 'اطلاعات پرداخت'], ['nid', 'کد ملی خریدار حقیقی (پوشیده)']] },
  { id: 'post', label: 'برچسب مرسولهٔ پستی (قانون پست: A5 افقی)', src: 'ship', papers: ['A5 افقی', 'A6', '100x150', 'A5'], fields: [['carrierLogo', 'لوگوی شرکت حمل'], ['barcode', 'بارکد مرسوله و رهگیری'], ['fragile', 'علامت شکستنی'], ['contents', 'محتوای کلی']] },
  { id: 'courier', label: 'برچسب مرسولهٔ پیک', src: 'ship', papers: ['100x100'], fields: [] },
  { id: 'labels', label: 'برچسب کالا و واحد', src: 'labels', papers: ['50x30', '40x25', '60x40', 'A4'], fields: [] },
  { id: 'qc', label: 'برگهٔ کنترل کیفیت', src: 'unit', papers: ['A5'], fields: [] },
  { id: 'warranty', label: 'کارت گارانتی', src: 'unit', papers: ['کارت ۸۵×۵۴'], fields: [] },
  { id: 'pick', label: 'لیست جمع‌آوری', src: 'batch', papers: ['A4'], fields: [] },
  { id: 'manifest', label: 'مانیفست تحویل به پست', src: 'batch', papers: ['A4'], fields: [] },
  { id: 'return', label: 'برچسب و فرم مرجوعی', src: 'ret', papers: ['A5'], fields: [] },
  { id: 'pickup', label: 'رسید دریافت حضوری', src: 'order', papers: ['۸۰ میلی‌متر'], fields: [] },
  { id: 'bundle', label: 'بستهٔ کامل سفارش', src: 'order', papers: ['A4 و برچسب'], fields: [] },
]
const DEF: DocOpts = { font: 1, margin: 10, footer: '', seal: true, hide: [] }

export function PrintCenter() {
  const d = useDB(); const s0 = useSession(); const nav = useNavigate(); const [sp, setSp] = useSearchParams()
  const qc = useQuickChips()
  const ships = d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, order: o })))
  const docId = sp.get('doc') ?? (sp.get('ship') ? 'post' : 'invoice'); const doc = DOCS.find((x) => x.id === docId) ?? DOCS[0]
  const orderId = sp.get('orders')?.split(',')[0] ?? ships.find((s) => s.id === sp.get('ship'))?.order.id ?? 'GH-10458'
  const order = d.orders.find((o) => o.id === orderId) ?? d.orders[0]
  const shipId = sp.get('ship') ?? order.shipments[0]?.id ?? ships[0].id
  const ship = ships.find((s) => s.id === shipId) ?? ships[0]
  const unitId = sp.get('unit') || d.units.find((u) => u.status === 'unit.sold')?.id || d.units[0].id
  const retId = sp.get('ret') ?? d.returns[0]?.id
  const [paper, setPaper] = useState(doc.papers[0]); const [bw, setBw] = useState(false); const [editor, setEditor] = useState(false)
  const opts: DocOpts = { ...DEF, ...(d.docSettings[doc.id] ?? {}), hide: d.docSettings[doc.id]?.hide ?? [] }
  const setOpt = (patch: Partial<DocOpts>) => mutate((x) => { x.docSettings[doc.id] = { ...(x.docSettings[doc.id] ?? {}), ...patch } })
  const go = (patch: Record<string, string>) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => n.set(k, v)); setSp(n, { replace: true }) }
  const cancelled = (doc.src === 'ship' && ship.status === 'ship.cancelled')
  const batch = doc.id === 'pick' ? ships.filter((s) => ['ship.pending', 'ship.picking'].includes(s.status) && s.warehouse === 'tehran') : ships.filter((s) => /پست|تیپاکس/.test(s.method) && ['ship.packed', 'ship.in_transit'].includes(s.status))
  const print = () => {
    if (cancelled) return toast('این مرسوله لغو شده است و برچسب برای آن چاپ نمی‌شود.', { tone: 'err' })
    if (s0.simulate === 'fail') return toast('چاپگر در دسترس نیست. اتصال چاپگر را بررسی کنید یا «ذخیرهٔ PDF» را بزنید.', { tone: 'err' })
    const again = d.audit.some((a) => a.action === 'چاپ سند' && a.target.includes(`${doc.label} · ${doc.src === 'order' ? order.id : doc.src === 'ship' ? ship.id : unitId}`))
    mutate(() => {}, { action: 'چاپ سند', target: `${doc.label} · ${doc.src === 'order' ? order.id : doc.src === 'ship' ? ship.id : doc.src === 'unit' ? unitId : retId}${again ? ' (نسخهٔ دوم)' : ''}` })
    try { window.print() } catch { toast('مرورگر اجازهٔ چاپ از این قاب را نمی‌دهد. پنل را در پنجرهٔ جدا باز کنید.', { tone: 'err' }) }
  }
  if (doc.id === 'labels') { nav('/admin/labels', { replace: true }); return null }
  return (
    <Page title="چاپ و خروجی" module="print" back="/admin/orders" sub={doc.label}
      actions={<>{doc.src === 'order' && <Button variant="ghost" icon={<ChevronRight size={14} />} onClick={() => nav(`/admin/orders/${order.id}`)}>بازگشت به جزئیات سفارش</Button>}<Button icon={<Settings2 size={14} />} onClick={() => setEditor(true)}>ویرایش قالب</Button><Button icon={<Download size={14} />} onClick={() => { toast('در پنجرهٔ چاپ، مقصد را «ذخیره به‌صورت PDF» انتخاب کنید.'); print() }}>ذخیرهٔ PDF</Button></>}
      primary={<Button variant="primary" icon={<Printer size={14} />} onClick={print}>چاپ {doc.label.split(' (')[0]}</Button>}>
      <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
        <div className="no-print space-y-4">
          <Card title="سند"><ul className="space-y-0.5">{DOCS.map((x) => <li key={x.id}><button onClick={() => { if (x.id === 'labels') return nav('/admin/labels'); go({ doc: x.id }); setPaper(x.papers[0]) }} className={cx('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-right text-13 transition-colors', x.id === doc.id ? 'bg-brand-tint font-semibold text-brand' : 'hover:bg-neutral-bg')}><FileText size={14} />{x.label}</button></li>)}</ul></Card>
          <Card title="منبع"><div className="space-y-3">
            {doc.src === 'order' && <Field label="سفارش"><Select chips={qc.orders} value={order.id} onChange={(v) => go({ orders: v })} options={d.orders.map((o) => [o.id, `${o.id} · ${d.customers.find((c) => c.id === o.customerId)?.name}${o.buyer === 'legal' ? ' (حقوقی)' : ''}`])} /></Field>}
            {doc.src === 'ship' && <Field label="مرسوله"><Select chips={qc.ships} value={ship.id} onChange={(v) => go({ ship: v })} options={ships.map((s) => [s.id, `${s.id} · ${s.method}`])} /></Field>}
            {doc.src === 'unit' && <Field label="واحد"><Select value={unitId} onChange={(v) => go({ unit: v })} options={d.units.map((u) => [u.id, `${u.code} · ${d.products.find((p) => p.id === u.productId)?.en}`])} /></Field>}
            {doc.src === 'ret' && <Field label="مرجوعی"><Select value={retId} onChange={(v) => go({ ret: v })} options={d.returns.map((r) => [r.id, `${r.id} · ${r.reason}`])} /></Field>}
            {doc.src === 'batch' && <p className="text-12 text-t2">{fa(batch.length)} مرسوله {doc.id === 'pick' ? 'منتظر جمع‌آوری در انبار تهران' : 'پستی آمادهٔ تحویل'} در این سند می‌آید.</p>}
            <Field label="اندازهٔ کاغذ"><Select value={paper} onChange={setPaper} options={doc.papers} /></Field>
            {doc.id === 'warranty' && <label className="flex items-center gap-2 text-13"><Toggle on={bw} label="سیاه‌وسفید" onChange={setBw} />نسخهٔ چاپی سیاه‌وسفید</label>}
            {doc.src === 'order' && <Button className="w-full" onClick={() => go({ doc: 'bundle', orders: order.id })}>چاپ بستهٔ کامل سفارش</Button>}
          </div></Card>
          <Card title="لاگ چاپ" pad={false}><ul className="max-h-40 divide-y divide-line overflow-y-auto text-12">{d.audit.filter((a) => a.action === 'چاپ سند').slice(0, 8).map((a, i) => <li key={i} className="px-3 py-2">{a.target}</li>)}{!d.audit.some((a) => a.action === 'چاپ سند') && <li className="px-3 py-3 text-t2">هنوز سندی چاپ نشده است.</li>}</ul></Card>
        </div>
        <div className="print-area overflow-auto rounded-xl border border-line bg-neutral-bg p-4 md:p-8">
          {cancelled && <p className="no-print mb-3 rounded-md bg-danger-bg px-3 py-2 text-12 text-danger">این مرسوله لغو شده است؛ چاپ برچسب مسدود است.</p>}
          {d.seller.assumed && ['invoice', 'post', 'warranty', 'return'].includes(doc.id) && <p className="no-print mb-3 flex items-center justify-between gap-2 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">اطلاعات فروشنده و انبار هنوز فرضی است.<button className="font-semibold underline" onClick={() => nav('/admin/settings?tab=seller')}>ویرایش در تنظیمات</button></p>}
          <EditableDoc docKey={`${doc.id}:${doc.src === 'order' ? order.id : doc.src === 'ship' ? ship.id : doc.src === 'unit' ? unitId : doc.src === 'ret' ? retId : 'all'}`} label={doc.label}>
          {doc.id === 'invoice' && <Invoice o={order} opts={opts} />}
          {doc.id === 'post' && <PostLabel o={ship.order} s={ship} opts={opts} paper={paper} />}
          {doc.id === 'courier' && <CourierLabel o={ship.order} s={ship} opts={opts} />}
          {doc.id === 'qc' && <QCSheet unitId={unitId} opts={opts} />}
          {doc.id === 'warranty' && <WarrantyCard unitId={unitId} opts={opts} bw={bw} />}
          {doc.id === 'pick' && <PickList ships={batch} opts={opts} />}
          {doc.id === 'manifest' && <Manifest ships={batch} opts={opts} />}
          {doc.id === 'return' && retId && <ReturnForm retId={retId} opts={opts} />}
          {doc.id === 'pickup' && <PickupReceipt o={order} opts={opts} />}
          {doc.id === 'bundle' && <div className="space-y-8"><Invoice o={order} opts={opts} />{order.shipments.map((s) => <div key={s.id}>{/پست|تیپاکس|باربری/.test(s.method) ? <PostLabel o={order} s={s} opts={opts} paper="A6" /> : <CourierLabel o={order} s={s} opts={opts} />}</div>)}{order.shipments.flatMap((s) => s.items.filter((i) => i.unitId)).map((i) => <div key={i.unitId} className="space-y-6"><QCSheet unitId={i.unitId} opts={opts} /><WarrantyCard unitId={i.unitId} opts={opts} /></div>)}</div>}
          </EditableDoc>
        </div>
      </div>
      <Drawer open={editor} onClose={() => setEditor(false)} title={`ویرایش قالب: ${doc.label}`} footer={<><Button variant="primary" onClick={() => { setEditor(false); toast('قالب ذخیره شد و برای چاپ‌های بعدی هم اعمال می‌شود.') }}>ذخیرهٔ قالب</Button><Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => { mutate((x) => { delete x.docSettings[doc.id] }); toast('قالب به حالت پیش‌فرض برگشت.') }}>بازگشت به پیش‌فرض</Button></>}>
        <div className="space-y-4">
          <Field label="اندازهٔ قلم"><Segmented value={String(opts.font)} onChange={(v) => setOpt({ font: +v })} options={[['0.9', 'کوچک'], ['1', 'معمولی'], ['1.1', 'بزرگ']]} /></Field>
          <Field label="حاشیه (میلی‌متر)"><Input type="number" min={2} max={20} className="ltr w-24 text-center font-mono" value={opts.margin} onChange={(e) => setOpt({ margin: Math.min(20, Math.max(2, +e.target.value)) })} /></Field>
          {doc.id === 'invoice' && <label className="flex items-center gap-2 text-13"><Toggle on={opts.seal} label="مهر" onChange={(v) => setOpt({ seal: v })} />نمایش مهر فروشنده</label>}
          {doc.fields.length > 0 && <div><p className="mb-2 text-12 font-medium text-t2">فیلدهای نمایشی</p><div className="space-y-2">{doc.fields.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-13"><Toggle on={!opts.hide.includes(k)} label={l} onChange={(v) => setOpt({ hide: v ? opts.hide.filter((h) => h !== k) : [...opts.hide, k] })} />{l}</label>)}</div></div>}
          <Field label="متن پانویس"><Input value={opts.footer} onChange={(e) => setOpt({ footer: e.target.value })} placeholder="مثلاً: از خرید شما سپاسگزاریم." /></Field>
          <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2">لوگوها، مهر، امضا و نشانی‌ها از «تنظیمات › فروشنده و انبارها» خوانده می‌شوند.</p>
          <Button variant="ghost" onClick={() => nav('/admin/settings?tab=seller')}>رفتن به فروشنده و انبارها</Button>
        </div>
      </Drawer>
    </Page>
  )
}
export { Badge }
