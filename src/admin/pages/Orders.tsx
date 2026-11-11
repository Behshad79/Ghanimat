import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ClipboardPaste, Lock, MapPin, Phone, Printer, Sparkles, Truck } from 'lucide-react'
import { AITag, Avatar, Badge, Button, Card, CopyId, Field, Input, Masked, Row, Select, StatusBadge, Tabs } from '@/shared/ui/base'
import { Page, Stepper, Timeline } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { confirm, Hint, Modal, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, snapshot } from '@/shared/lib/store'
import { compactToman, fa, pct, rel, toman, g } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import type { Order } from '@/shared/data/seed'
import { Cell, Money, ProductImg, SlaChip, useLookup, useTab } from './_shared'

const TABS: [string, string, (o: Order) => boolean][] = [
  ['all', 'همه', () => true],
  ['action', 'نیازمند اقدام', (o) => ['order.paid', 'order.needs_decision', 'order.suspicious', 'order.awaiting_credit'].includes(o.status)],
  ['credit', 'در انتظار اعتبار اقساطی', (o) => o.status === 'order.awaiting_credit'],
  ['decision', 'نیازمند تصمیم مشتری', (o) => o.status === 'order.needs_decision'],
  ['preparing', 'آماده‌سازی', (o) => ['order.paid', 'order.preparing'].includes(o.status)],
  ['shipped', 'ارسال‌شده', (o) => o.status === 'order.shipped'],
  ['delivered', 'تحویل‌شده', (o) => o.status === 'order.delivered'],
  ['cancelled', 'لغو و مرجوعی', (o) => ['order.cancelled', 'order.returned'].includes(o.status)],
  ['suspicious', 'مشکوک', (o) => o.status === 'order.suspicious'],
]
export function Orders() {
  const { d, customer, product } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('all'); const [sp] = useSearchParams()
  const [wh, setWh] = useState('all'); const [manual, setManual] = useState(sp.get('new') === '1')
  const rows = d.orders.filter(TABS.find((t) => t[0] === tab)?.[2] ?? (() => true)).filter((o) => wh === 'all' || o.shipments.some((s) => s.warehouse === wh))
  const cols: Col<Order>[] = [
    { key: 'id', title: 'شماره', render: (o) => <span className="flex items-center gap-1"><CopyId v={o.id} />{o.lockedBy && <Lock size={12} className="text-warning" />}</span>, sort: (o) => o.id, text: (o) => o.id },
    { key: 'customer', title: 'مشتری', render: (o) => <Cell a={customer(o.customerId).name} b={customer(o.customerId).city} />, text: (o) => customer(o.customerId).name },
    { key: 'items', title: 'کالاها', hideMobile: true, render: (o) => { const it = o.shipments.flatMap((s) => s.items); return it.length ? <span className="flex items-center" title={it.map((i) => product(i.productId).title).join('، ')}>{it.slice(0, 3).map((i, k) => <ProductImg key={k} pid={i.productId} size={32} className={k ? '-mr-2 ring-2 ring-surface' : ''} />)}{it.length > 3 && <span className="tnum mr-1 text-11 text-t2">+{fa(it.length - 3)}</span>}</span> : '—' } },
    { key: 'total', title: 'مبلغ', align: 'left', render: (o) => <Money v={o.total} />, sort: (o) => o.total, text: (o) => o.total },
    { key: 'pay', title: 'روش پرداخت', hideMobile: true, render: (o) => o.pay, text: (o) => o.pay },
    { key: 'wh', title: 'انبار مبدأ', hideMobile: true, render: (o) => <span className="text-12">{[...new Set(o.shipments.map((s) => WAREHOUSE[s.warehouse]))].join(' + ') || '—'}</span> },
    { key: 'ships', title: 'مرسوله', optional: true, render: (o) => fa(o.shipments.length) },
    { key: 'channel', title: 'کانال', optional: true, render: (o) => o.channel, text: (o) => o.channel },
    { key: 'seller', title: 'فروشنده', optional: true, render: () => 'غنیمت' },
    { key: 'status', title: 'وضعیت', render: (o) => <StatusBadge s={o.status} />, sort: (o) => o.status, text: (o) => o.status },
    { key: 'sla', title: <>مهلت<Hint k="sla" /></>, render: (o) => o.shipments[0] ? <SlaChip at={o.shipments[0].sla} done={['order.delivered', 'order.cancelled', 'order.returned'].includes(o.status)} /> : '—', sort: (o) => o.shipments[0]?.sla ?? '' },
    { key: 'age', title: 'ثبت', hideMobile: true, render: (o) => <span className="text-12 text-t3">{rel(o.createdAt)}</span>, sort: (o) => o.createdAt },
  ]
  return (
    <Page title="سفارش‌ها" module="orders" primary={<Button variant="primary" onClick={() => setManual(true)}>ثبت سفارش دستی</Button>}
      empty={{ title: 'هنوز سفارشی ثبت نشده است.', desc: 'سفارش‌های سایت و کانال‌های فروش اینجا نمایش داده می‌شوند. برای سفارش تلفنی یا حضوری، سفارش دستی ثبت کنید.', action: <Button variant="primary" onClick={() => setManual(true)}>ثبت سفارش دستی</Button> }}
      tabs={<Tabs value={tab} onChange={setTab} tabs={TABS.map(([id, label, f]) => ({ id, label, count: id === 'all' ? undefined : d.orders.filter(f).length }))} />}>
      <DataTable name="سفارش‌ها" rows={rows} cols={cols} rowKey={(o) => o.id} onRow={(o) => nav(`/admin/orders/${o.id}`)}
        search={(o) => `${o.id} ${customer(o.customerId).name} ${customer(o.customerId).mobile} ${o.pay}`}
        filters={<Select value={wh} onChange={setWh} options={[['all', 'همهٔ انبارها'], ['tehran', 'انبار تهران'], ['mahabad', 'انبار مهاباد']]} className="w-36" />}
        empty={{ title: 'سفارشی در این نما نیست.', desc: 'نمای دیگری را انتخاب کنید یا فیلتر انبار را بردارید.' }}
        bulk={(ids, clear) => <>
          <Button size="sm" icon={<Printer size={13} />} onClick={() => { nav(`/admin/print?orders=${ids.join(',')}`); clear() }}>چاپ بستهٔ کامل {fa(ids.length)} سفارش</Button>
          <Button size="sm" onClick={() => { toast(`${fa(ids.length)} سفارش به نیما تخصیص یافت.`, { undo: () => {} }); clear() }}>تخصیص به انباردار</Button>
        </>} />
      <Modal open={manual} onClose={() => setManual(false)} title="ثبت سفارش دستی" footer={<><Button variant="primary" onClick={() => { setManual(false); toast('لینک پرداخت با پیامک برای مشتری ارسال شد.') }}>ارسال لینک پرداخت با پیامک</Button><Button variant="ghost" onClick={() => setManual(false)}>انصراف</Button></>}>
        <div className="space-y-3">
          <Field label="کالا" help="فقط واحدهای منتشرشده قابل انتخاب‌اند."><Select value="p2" onChange={() => {}} options={d.products.filter((p) => p.status === 'product.published').map((p) => [p.id, p.title])} /></Field>
          <Field label="موبایل مشتری"><Input className="ltr text-left font-mono" placeholder="مثلاً 09121234567" /></Field>
          <Field label="نشانی" help="متن نشانی را بچسبانید؛ استان، شهر، خیابان، پلاک و کد پستی خودکار تفکیک می‌شود."><Input placeholder="مثلاً تهران، ولیعصر، کوچهٔ نور، پلاک ۱۲، واحد ۳" /></Field>
        </div>
      </Modal>
    </Page>
  )
}

// ───── چسباندن هوشمند (بخش ۵.۶): لینک پیک یا کد رهگیری ─────
const SAMPLES: [string, string][] = [['لینک سالم', 'https://app.snapp-box.example/track/SB-90412'], ['استخراج ناقص', 'https://app.snapp-box.example/track/SB-90413?partial'], ['منقضی', 'https://app.snapp-box.example/track/expired'], ['تکراری', 'https://app.snapp-box.example/track/SB-88213'], ['مقصد ناهمخوان', 'https://app.snapp-box.example/track/SB-90414?dest=other'], ['کد پست', '120459870001245789632199'], ['کد نامعتبر', '12345']]
function SmartPaste({ orderId, shipId, carrierName }: { orderId: string; shipId: string; carrierName: string }) {
  const { d } = useLookup()
  const [v, setV] = useState(''); const [state, setState] = useState<'idle' | 'reading' | 'ok' | 'partial' | 'err' | 'down'>('idle'); const [msg, setMsg] = useState(''); const [c, setC] = useState<any>(null); const [warn, setWarn] = useState('')
  const used = d.orders.flatMap((o) => o.shipments).filter((s) => s.id !== shipId)
  const read = async (raw = v) => {
    const x = raw.trim(); setWarn(''); setC(null)
    if (/^\d+$/.test(x)) {
      if (x.length !== 24 && x.length !== 11) { setState('err'); return setMsg('کد رهگیری نامعتبر است. کد پست ۲۴ رقم و کد تیپاکس ۱۱ رقم است.') }
      if (used.some((s) => s.tracking === x)) { setState('err'); return setMsg('این کد قبلاً به مرسولهٔ دیگری وصل شده است. کد را بررسی کنید.') }
      mutate((db) => { const s = db.orders.find((o) => o.id === orderId)!.shipments.find((s) => s.id === shipId)!; s.tracking = x; s.status = 'ship.in_transit'; db.orders.find((o) => o.id === orderId)!.status = 'order.shipped' }, { action: 'الحاق کد رهگیری', target: shipId, after: x })
      setV(''); setState('idle'); return toast(`کد رهگیری ${x.length === 24 ? 'پست' : 'تیپاکس'} ثبت شد و لینک رهگیری برای مشتری ارسال شد.`)
    }
    if (!/^https?:\/\/\S+track\/\S+/.test(x)) { setState('err'); return setMsg('لینک نامعتبر است. لینک پیگیری سفر را از اپ پیک کپی کنید.') }
    if (/expired/.test(x)) { setState('err'); return setMsg('این لینک منقضی شده است. لینک تازه بگیرید یا اطلاعات پیک را دستی وارد کنید.') }
    const code = x.match(/SB-\d+/)?.[0] ?? ''
    if (used.some((s) => s.courier?.code === code)) { setState('err'); return setMsg(`این سفر قبلاً به مرسولهٔ دیگری وصل شده است (${code}).`) }
    setState('reading')
    try {
      await fakeCall(true)
      const partial = /partial/.test(x)
      setC({ name: 'حمید زارعی', phone: '09120000002', plate: partial ? '' : '۸۷۶ ایران ۳۳', vehicle: 'موتور', eta: 22, code, cost: partial ? 0 : 196000 })
      if (/dest=other/.test(x)) setWarn('مقصد این سفر با نشانی سفارش یکی نیست. پیش از تأیید بررسی کنید.')
      setState(partial ? 'partial' : 'ok')
    } catch { setState('down'); setMsg(`${carrierName} پاسخ نمی‌دهد. اطلاعات پیک را دستی وارد کنید؛ خواندن لینک در پس‌زمینه دوباره تلاش می‌شود.`); setC({ name: '', phone: '', plate: '', vehicle: 'موتور', eta: 0, code, cost: 0 }) }
  }
  const save = () => {
    const undo = snapshot()
    mutate((db) => { const o = db.orders.find((o) => o.id === orderId)!; const s = o.shipments.find((s) => s.id === shipId)!; s.courier = c; s.status = 'ship.handed'; o.status = 'order.shipped' }, { action: 'ثبت پیک با لینک', target: shipId, after: c.name })
    setState('idle'); setV(''); setC(null); toast('پیک ثبت شد و لینک رصد برای مشتری ارسال شد.', { undo })
  }
  return (
    <div className="rounded-md border border-dashed border-brand/50 bg-brand-tint/30 p-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); read() }}>
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="لینک سفر پیک یا کد رهگیری را بچسبانید" className="ltr text-left font-mono text-12" />
        <Button variant="primary" loading={state === 'reading'} icon={<ClipboardPaste size={14} />}>خواندن</Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1 text-11 text-t3">نمونه‌ها: {SAMPLES.map(([l, s]) => <button key={l} className="rounded-sm bg-surface px-1.5 py-0.5 hover:text-brand" onClick={() => { setV(s); read(s) }}>{l}</button>)}</div>
      {state === 'reading' && <div className="skeleton mt-3 h-16" />}
      {(state === 'err' || state === 'down') && <p role="alert" className="mt-2 rounded-sm bg-danger-bg px-2 py-1.5 text-12 text-danger">{msg}</p>}
      {c && ['ok', 'partial', 'down'].includes(state) && (
        <div className="mt-3 space-y-2">
          {warn && <p className="rounded-sm bg-warning-bg px-2 py-1.5 text-12 text-warning">{warn}</p>}
          {state === 'partial' && <p className="rounded-sm bg-warning-bg px-2 py-1.5 text-12 text-warning">استخراج ناقص بود. فیلدهای خالی را دستی پر کنید.</p>}
          <div className="grid grid-cols-2 gap-2">
            {([['name', 'نام پیک'], ['phone', 'شمارهٔ تماس'], ['plate', 'پلاک'], ['vehicle', 'نوع وسیله']] as const).map(([k, l]) => (
              <Field key={k} label={l} help={c[k] && state !== 'down' ? 'استخراج خودکار' : undefined} error={!c[k] ? 'خالی است' : undefined}><Input value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></Field>
            ))}
          </div>
          <p className="text-11 text-t3">زمان تقریبی رسیدن: {fa(c.eta)} دقیقه · کد سفر: <span className="ltr font-mono">{c.code}</span>{c.cost > 0 && ` · هزینه: ${toman(c.cost)}`} · اطمینان: {state === 'ok' ? 'بالا' : 'پایین'}</p>
          <Button variant="primary" disabled={!c.name || !c.plate} onClick={save}>ثبت پیک و اطلاع به مشتری</Button>
        </div>
      )}
    </div>
  )
}

export function OrderDetail() {
  const { id } = useParams(); const { d, customer, product, unit, rule } = useLookup(); const nav = useNavigate()
  const [refund, setRefund] = useState(false); const [amount, setAmount] = useState(''); const [dest, setDest] = useState('کیف پول')
  const idx = d.orders.findIndex((o) => o.id === id); const o = d.orders[idx]
  if (!o) return <Page title="سفارش پیدا نشد" back="/admin/orders" empty={undefined}><Card><p className="p-6 text-center text-13 text-t2">سفارشی با این شماره نیست. شماره را بررسی کنید یا از جست‌وجوی سراسری استفاده کنید.</p></Card></Page>
  const c = customer(o.customerId)
  const step = ({ 'order.awaiting_payment': 0, 'order.awaiting_credit': 0, 'order.paid': 1, 'order.needs_decision': 1, 'order.suspicious': 1, 'order.preparing': 2, 'order.shipped': 3, 'order.delivered': 4 } as Record<string, number>)[o.status] ?? 4
  const items = o.shipments.flatMap((s) => s.items); const sub = items.reduce((a, i) => a + i.price * i.qty, 0)
  const advance = (sid: string, to: string, label: string) => { const undo = snapshot(); mutate((db) => { const oo = db.orders.find((x) => x.id === o.id)!; oo.shipments.find((s) => s.id === sid)!.status = to; if (to === 'ship.picking') oo.status = 'order.preparing'; if (to === 'ship.delivered' && oo.shipments.every((s) => ['ship.delivered', 'ship.cancelled'].includes(s.status))) oo.status = 'order.delivered' }, { action: label, target: sid }); toast(`${label} ثبت شد.`, { undo }) }
  const cancelShip = async (sid: string, total: number) => {
    if (!(await confirm({ title: `لغو مرسولهٔ ${sid}؟`, body: <>این مرسوله لغو و {toman(total)} به {dest} مشتری بازگردانده می‌شود. واحدهای آن دوباره قابل فروش می‌شوند. این کار برگشت‌پذیر نیست.</>, confirm: 'لغو مرسوله', danger: true }))) return
    mutate((db) => { const oo = db.orders.find((x) => x.id === o.id)!; oo.shipments.find((s) => s.id === sid)!.status = 'ship.cancelled'; if (oo.shipments.every((s) => s.status === 'ship.cancelled')) oo.status = 'order.cancelled' }, { action: 'لغو مرسوله', target: sid, after: toman(total) })
    toast(`مرسولهٔ ${sid} لغو شد.`)
  }
  const doRefund = () => {
    const n = Number(amount.replace(/\D/g, '')); const cap = rule('refund_cap')
    if (!n) return toast('مبلغ را وارد کنید.', { tone: 'err' })
    if (n > o.total) return toast(`مبلغ بازگشت وجه از مبلغ سفارش (${toman(o.total)}) بیشتر است.`, { tone: 'err' })
    setRefund(false)
    if (n > cap) { mutate((db) => { db.approvals.unshift({ id: `AP-${710 + db.approvals.length}`, type: 'بازگشت وجه', title: `بازگشت ${toman(n)} به ${dest} ${c.name}`, ref: o.id, amount: n, by: 'کاربر فعلی', byRole: 'x', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'درخواست بازگشت وجه', target: o.id, after: toman(n) }); return toast('مبلغ بالاتر از سقف است. درخواست به صندوق تأییدها رفت.') }
    mutate((db) => { if (dest === 'کیف پول') db.customers.find((x) => x.id === c.id)!.wallet += n }, { action: 'بازگشت وجه', target: o.id, after: toman(n) }); toast(`${toman(n)} به ${dest} ${c.name} واریز شد.`)
  }
  return (
    <Page module="orders" back="/admin/orders" title={<span className="ltr font-mono">{o.id}</span>} badge={<><StatusBadge s={o.status} />{o.tags.map((t) => <Badge key={t} dot={false}>{t}</Badge>)}</>} sub={`ثبت ${rel(o.createdAt)} · کانال ${o.channel} · فروشنده: غنیمت`}
      actions={<>
        <Button size="sm" variant="ghost" disabled={idx <= 0} icon={<ChevronRight size={14} />} onClick={() => nav(`/admin/orders/${d.orders[idx - 1].id}`)}>قبلی</Button>
        <Button size="sm" variant="ghost" disabled={idx >= d.orders.length - 1} onClick={() => nav(`/admin/orders/${d.orders[idx + 1].id}`)}>بعدی<ChevronLeft size={14} /></Button>
        <Button icon={<Printer size={14} />} onClick={() => nav(`/admin/print?orders=${o.id}`)}>چاپ بستهٔ کامل</Button>
        <Button onClick={() => { setAmount(''); setRefund(true) }}>بازگشت وجه</Button>
      </>}>
      {o.lockedBy && <div className="mb-3 flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning"><Avatar name={o.lockedBy} size={20} />{o.lockedBy} همین سفارش را باز کرده است. ویرایش هم‌زمان ممکن است تعارض بسازد؛ تغییر او اول ذخیره می‌شود.</div>}
      <Card className="mb-4"><Stepper current={step} steps={['پرداخت', 'تأیید', 'آماده‌سازی', 'ارسال', 'تحویل']} /></Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {o.status === 'order.needs_decision' && (
            <Card className="border-warning/50" title="کمبود تأمین: نیازمند تصمیم مشتری" actions={<SlaChip at={o.shipments[0].sla} />}>
              <p className="mb-3 text-13 text-t2">شریک انبار اعلام «ندارم» کرده است. سه گزینه برای مشتری ارسال شده و اگر تا پایان مهلت {fa(rule('decision_hours'))} ساعته پاسخ ندهد، قلم خودکار لغو و وجه بازگردانده می‌شود.</p>
              <div className="flex flex-wrap gap-2">
                {['مشتری کالای جایگزین را پذیرفت', 'مشتری همین قلم را لغو کرد', 'مشتری کل سفارش را لغو کرد'].map((l, i) => <Button key={l} onClick={() => { mutate((db) => { db.orders.find((x) => x.id === o.id)!.status = i === 0 ? 'order.preparing' : 'order.cancelled' }, { action: 'ثبت نتیجهٔ تصمیم مشتری', target: o.id, after: l }); toast(i === 0 ? 'نتیجه ثبت شد و سفارش به آماده‌سازی رفت.' : `سفارش لغو شد و ${toman(o.total)} بازگردانده می‌شود.`) }}>{l}</Button>)}
                <Button variant="ghost" icon={<Phone size={14} />} onClick={() => toast('تماس با مشتری برقرار شد.')}>پیگیری تلفنی</Button>
              </div>
            </Card>
          )}
          {o.status === 'order.suspicious' && (
            <Card className="border-danger/50" title={<>سفارش مشکوک · امتیاز ریسک {fa(o.risk)}<Hint k="risk" /></>}>
              <p className="text-13 text-t2">دلایل: دو واحد گران‌قیمت در یک سفارش، نرخ مرجوعی ۴۰٪ مشتری، نشانی تازه. ارسال تا بازبینی متوقف است.</p><AITag confidence="متوسط" />
              <div className="mt-3 flex gap-2"><Button variant="primary" onClick={() => { mutate((db) => { db.orders.find((x) => x.id === o.id)!.status = 'order.paid' }, { action: 'تأیید سفارش مشکوک', target: o.id }); toast('سفارش تأیید شد و به صف آماده‌سازی رفت.') }}>تأیید و ادامهٔ سفارش</Button><Button variant="danger" onClick={() => cancelShip(o.shipments[0].id, o.total)}>رد و بازگشت وجه</Button></div>
            </Card>
          )}
          {o.shipments.length === 0 && <Card><p className="py-6 text-center text-13 text-t2">این سفارش مرسوله‌ای ندارد؛ پیش از تخصیص انبار لغو شده است.</p></Card>}
          {o.shipments.map((s, i) => { const total = s.items.reduce((a, x) => a + x.price * x.qty, 0); const dead = ['ship.cancelled', 'ship.delivered'].includes(s.status); const post = /پست|تیپاکس|باربری/.test(s.method); return (
            <Card key={s.id} title={<span className="flex flex-wrap items-center gap-2">مرسولهٔ {fa(i + 1)}<CopyId v={s.id} /><StatusBadge s={s.status} /></span>} actions={<SlaChip at={s.sla} done={dead} />}>
              <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-12 text-t2"><span className="flex items-center gap-1"><MapPin size={13} />ارسال از {WAREHOUSE[s.warehouse]}</span><span className="flex items-center gap-1"><Truck size={13} />{s.method}</span><span>دلیل تخصیص: {s.allocReason}</span></div>
              <ul className="mb-3 divide-y divide-line rounded-md border border-line">
                {s.items.map((it, k) => { const u = unit(it.unitId); return (
                  <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <Cell pid={it.productId} size={48} a={product(it.productId).title} b={u ? <>واحد <span className="ltr font-mono">{u.id}</span> · سریال <span className="ltr font-mono">{u.serial}</span> · گرید {g(u.grade)} · قفسه {u.shelf}</> : `موجودی تعدادی · ${fa(it.qty)} عدد`} />
                    <Money v={it.price * it.qty} />
                  </li>) })}
              </ul>
              {s.courier && <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-neutral-bg px-3 py-2 text-12"><b>پیک: {s.courier.name}</b><span>پلاک {s.courier.plate}</span><span>{s.courier.vehicle}</span>{s.status !== 'ship.delivered' && <span>حدود {fa(s.courier.eta)} دقیقهٔ دیگر می‌رسد</span>}<span className="ltr font-mono">{s.courier.code}</span><Button size="sm" variant="ghost" icon={<Phone size={12} />} onClick={() => toast('تماس با پیک برقرار شد.')}>تماس</Button></div>}
              {s.tracking && <p className="mb-3 text-12">کد رهگیری: <CopyId v={s.tracking} /></p>}
              {s.status === 'ship.partner_confirm' && <p className="mb-3 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">منتظر تأیید موجودی شریک انبار. پیامک و پیام‌رسان برای او ارسال شده است. اگر تا پایان مهلت تأیید نکند، سفارش به جریان تصمیم مشتری می‌رود.</p>}
              {!dead && s.status !== 'ship.partner_confirm' && (
                <div className="space-y-3">
                  {s.status === 'ship.packed' && !s.courier && !s.tracking && <SmartPaste orderId={o.id} shipId={s.id} carrierName={d.providers.find((p) => p.family === 'carrier' && p.isDefault)?.name ?? 'سرویس پیک'} />}
                  <div className="flex flex-wrap gap-2">
                    {s.status === 'ship.pending' && <Button variant="primary" onClick={() => advance(s.id, 'ship.picking', 'شروع جمع‌آوری')}>شروع جمع‌آوری</Button>}
                    {s.status === 'ship.picking' && <Button variant="primary" onClick={() => advance(s.id, 'ship.packed', 'تأیید بسته‌بندی')}>تأیید بسته‌بندی</Button>}
                    {['ship.handed', 'ship.in_transit'].includes(s.status) && <Button variant="primary" onClick={() => advance(s.id, 'ship.delivered', 'ثبت تحویل')}>ثبت تحویل</Button>}
                    <Button icon={<Printer size={14} />} onClick={() => nav(`/admin/print?ship=${s.id}`)}>چاپ برچسب {post ? 'پستی' : 'پیک'}</Button>
                    <Button variant="ghost" disabled={['ship.handed', 'ship.in_transit'].includes(s.status)} title={['ship.handed', 'ship.in_transit'].includes(s.status) ? 'پس از تحویل به پیک، نشانی قابل تغییر نیست.' : ''} onClick={() => toast('نشانی فقط برای مرسولهٔ ارسال‌نشده قابل ویرایش است.')}>ویرایش نشانی</Button>
                    <Button variant="danger" onClick={() => cancelShip(s.id, total)}>لغو مرسوله</Button>
                  </div>
                </div>
              )}
            </Card>) })}
          <Card title="تاریخچه و یادداشت‌ها">
            <Timeline items={[
              ...d.audit.filter((a) => a.target.startsWith(o.id)).map((a) => ({ at: a.at, who: a.who, text: <>{a.action}{a.after !== '-' && <>: <b>{a.after}</b></>}</>, tone: a.ai ? 'ai' as const : 'ok' as const })),
              { at: o.createdAt, who: 'سیستم', text: `پیامک «سفارش شما ثبت شد» برای مشتری ارسال شد.` },
              { at: o.createdAt, who: c.name, text: `سفارش با ${o.pay} ثبت شد.`, tone: 'ok' },
            ]} />
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget.elements.namedItem('n') as HTMLInputElement; if (!f.value) return; mutate(() => {}, { action: 'یادداشت داخلی', target: o.id, after: f.value }); f.value = '' }}><Input name="n" placeholder="یادداشت داخلی؛ با @ همکار را منشن کنید" /><Button>ثبت یادداشت</Button></form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="مشتری" actions={<Button size="sm" variant="ghost" onClick={() => nav(`/admin/customers?c=${c.id}`)}>پروفایل ۳۶۰</Button>}>
            <div className="mb-2 flex items-center gap-2"><Avatar name={c.name} /><div><p className="text-13 font-semibold">{c.name}</p><p className="text-11 text-t3">{c.segment} · {c.city}</p></div></div>
            <Row k="موبایل"><Masked id={`m-${c.id}`} value={c.mobile} label={`شمارهٔ موبایل ${c.name}`} /></Row>
            <Row k={<>LTV<Hint k="ltv" /></>}><Money v={c.ltv} compact /></Row>
            <Row k="تعداد سفارش">{fa(c.orders)}</Row><Row k="نرخ مرجوعی">{pct(c.returnRate)}</Row>
            <Row k={<>امتیاز ریسک<Hint k="risk" /></>}><Badge tone={o.risk > 70 ? 'danger' : o.risk > 30 ? 'warning' : 'success'}>{fa(o.risk)}</Badge></Row>
            <div className="mt-2 flex gap-2"><Button size="sm" icon={<Phone size={12} />} onClick={() => toast('تماس با مشتری برقرار شد.')}>تماس</Button><Button size="sm" onClick={() => nav('/admin/support')}>ساخت تیکت</Button><Button size="sm" variant="ai" icon={<Sparkles size={12} />} onClick={() => toast('پیش‌نویس پیام ساخته شد.')}>پیش‌نویس پیام</Button></div>
          </Card>
          <Card title="مالی">
            <Row k="جمع کالاها"><Money v={sub} /></Row><Row k="هزینهٔ ارسال">{o.shippingFee ? <Money v={o.shippingFee} /> : 'رایگان'}</Row>
            {o.discount > 0 && <Row k="تخفیف"><span className="text-success">−<Money v={o.discount} /></span></Row>}
            <div className="my-1 border-t border-line" /><Row k={<b className="text-t1">مبلغ پرداختی</b>}><b><Money v={o.total} /></b></Row>
            <Row k={`کارمزد ${o.pay}`}><Money v={o.fee} /></Row><Row k={<>حاشیهٔ سود سفارش<Hint k="margin" /></>}>{pct(o.margin, 1)}</Row>
            <p className="mt-2 mb-1 text-11 font-medium text-t3">تراکنش‌ها</p>
            {d.txns.filter((t) => t.orderId === o.id).map((t) => <div key={t.id} className="flex items-center justify-between py-1 text-12"><span><CopyId v={t.ref} /> · {t.gateway}</span><StatusBadge s={t.status} /></div>)}
            <Button size="sm" className="mt-2" icon={<Printer size={12} />} onClick={() => nav(`/admin/print?orders=${o.id}&doc=invoice`)}>فاکتور {c.segment === 'حقوقی' ? 'رسمی' : 'فروش'}</Button>
          </Card>
        </div>
      </div>
      <Modal open={refund} onClose={() => setRefund(false)} title={`بازگشت وجه سفارش ${o.id}`} footer={<><Button variant="primary" onClick={doRefund}>واریز {amount ? toman(Number(amount.replace(/\D/g, ''))) : 'مبلغ'}</Button><Button variant="ghost" onClick={() => setRefund(false)}>انصراف</Button></>}>
        <div className="space-y-3">
          <Field label="مبلغ (تومان)" help={`حداکثر ${toman(o.total)}. بالاتر از ${compactToman(rule('refund_cap'))} به تأیید نفر دوم نیاز دارد.`} hint={<Hint k="maker_checker" />}><Input className="ltr text-left font-mono" inputMode="numeric" value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('en-US') : ''} onChange={(e) => setAmount(e.target.value)} placeholder="مثلاً 15,820,000" /></Field>
          <Field label="مقصد وجه"><Select value={dest} onChange={setDest} options={['کیف پول', 'کارت بانکی']} /></Field>
          {dest === 'کارت بانکی' && <p className="rounded-sm bg-info-bg px-2 py-1.5 text-12 text-info">واریز به کارت فقط پس از تأیید مالکیت کارت با کد ملی مشتری انجام می‌شود.</p>}
        </div>
      </Modal>
    </Page>
  )
}
