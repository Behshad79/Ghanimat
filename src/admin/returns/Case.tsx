// پروندهٔ مرجوعی و گارانتی: مرحله‌به‌مرحله، با قدم بعدی روشن، رسید دریافت، واریز، ارسال به مشتری و پیامک هر مرحله
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bike, Camera, Check, CircleDollarSign, ClipboardCheck, Inbox, MessageSquareText, PackageSearch, Send, Store, Truck, Wrench, X } from 'lucide-react'
import { Badge, Button, Card, CopyId, cx, Field, Input, Row, Segmented, Select, StatusBadge, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { askReason, ReasonLog } from '@/shared/ui/reason'
import { currentUser, getDB, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel, toman, g } from '@/shared/lib/fa'
import type { CaseFlow, CaseReceipt, Ret, War } from '@/shared/data/seed'
import { CustLink, ProductImg } from '../pages/_shared'
import { OriginalOrder } from '../orders/ReturnTools'
import { PackPhotos } from '../shared/PackPhotos'
import { METHODS, REFUND_DEST, RETURN_STEPS, retStage, SHIP_BACK, warStage, WARRANTY_STEPS, type Stage } from './flow'

type Kind = 'return' | 'warranty'
const me = () => currentUser()?.name.split(' ')[0] ?? 'کاربر'
const now = () => new Date().toISOString()
const fd = (iso: string) => new Date(iso).toLocaleString('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** تغییر پرونده + ثبت رویداد + پیامک اختیاری به مشتری؛ همهٔ دکمه‌های این صفحه از همین می‌گذرند */
function act(kind: Kind, id: string, fn: (c: Ret & War) => void, text: string, sms?: string) {
  mutate((d) => {
    const c = (kind === 'return' ? d.returns : d.warranties).find((x) => x.id === id) as (Ret & War) | undefined
    if (!c) return
    fn(c); (c.events ??= []).push({ at: now(), by: me(), text, who: 'ما' })
  }, { action: `${kind === 'return' ? 'مرجوعی' : 'گارانتی'}: ${text}`, target: id })
  if (sms) {
    const c = (kind === 'return' ? getDB().returns : getDB().warranties).find((x) => x.id === id)!
    const cu = getDB().customers.find((x) => x.id === c.customerId)
    if (cu) sendSms(cu.mobile, `غنیمت: ${sms}`, kind === 'return' ? 'مرجوعی' : 'گارانتی', id, cu.id)
  }
}

export function ReturnCase() { return <CaseView kind="return" /> }
export function WarrantyCase() { return <CaseView kind="warranty" /> }

function CaseView({ kind }: { kind: Kind }) {
  const { id = '' } = useParams(); const d = useDB(); const nav = useNavigate()
  const c = (kind === 'return' ? d.returns : d.warranties).find((x) => x.id === id) as (Ret & War) | undefined
  const [msg, setMsg] = useState(false)
  if (!c) return <Page title="پرونده پیدا نشد" back="/admin/returns"><Card><p className="p-6 text-center text-13 text-t2">پرونده‌ای با شمارهٔ {id} نیست.</p></Card></Page>
  const cu = d.customers.find((x) => x.id === c.customerId)
  const unit = d.units.find((u) => u.id === c.unitId)
  const prod = d.products.find((p) => p.id === (unit?.productId ?? c.productId))
  const orderId = c.orderId ?? d.orders.find((o) => o.shipments.some((sh) => sh.items.some((i) => i.unitId === c.unitId)))?.id
  const order = d.orders.find((o) => o.id === orderId)
  const st: Stage = kind === 'return' ? retStage(c) : warStage(c)
  const steps = kind === 'return' ? RETURN_STEPS : WARRANTY_STEPS
  const sms = d.smsLog.filter((s) => s.ref === c.id)
  const label = kind === 'return' ? 'مرجوعی' : 'گارانتی'

  return (
    <Page module="returns" back={`/admin/returns${kind === 'warranty' ? '?tab=warranty' : ''}`}
      title={<span className="flex items-center gap-2">پروندهٔ {label} <span className="ltr font-mono">{kind === 'warranty' ? c.code : c.id}</span></span>}
      badge={<><StatusBadge s={c.status} />{st.who !== '—' && <Badge tone={st.who === 'ما' ? 'warning' : 'neutral'} dot={false}>اقدام با: {st.who}</Badge>}</>}
      sub={[cu?.name, prod?.title ?? 'کالای تعدادی', (c.createdAt ?? c.events?.[0]?.at) && `ثبت ${rel(c.createdAt ?? c.events![0].at)}`].filter(Boolean).join(' · ')}
      actions={<><Button icon={<MessageSquareText size={16} />} onClick={() => setMsg(true)}>پیام به مشتری</Button>{order && <Button onClick={() => nav(`/admin/orders/${order.id}`)}>سفارش اصلی</Button>}</>}>
      <Card pad={false} className="mb-4"><Stepper steps={steps} at={st.step} /></Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <NextBox st={st}>{kind === 'return' ? <ReturnNext c={c} /> : <WarrantyNext c={c} />}</NextBox>
          <Card title="درخواست مشتری">
            <div className="space-y-2 text-13">
              {kind === 'return' ? <Row k="دلیل">{c.reason}</Row> : <><Row k="شرح مشکل">{c.issue}</Row><Row k="نوع گارانتی">{c.type} · {fa(c.months)} ماه</Row><Row k="مسئول هزینه">{c.owner}</Row></>}
              {c.note && <Row k="توضیح مشتری">«{c.note}»</Row>}
              {kind === 'return' && <Row k="مبلغ خرید">{toman(c.amount)}</Row>}
              {c.method && <Row k="روش بازگشت کالا">{METHODS[c.method]?.label}{c.tracking && <> · <span className="ltr font-mono">{c.tracking}</span></>}{c.courierName && ` · ${c.courierName}`}</Row>}
              {c.channel && <Row k="ثبت">دستی · {c.channel}{c.by && ` · ${c.by}`}</Row>}
            </div>
            {c.photos && c.photos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{c.photos.map((ph, i) => <img key={i} src={ph} alt="عکس مشتری" className="size-20 rounded-lg object-cover" />)}</div>}
          </Card>
          <Evidence c={c} orderId={orderId} />
          {orderId && <OriginalOrder orderId={orderId} highlight={c.unitId} />}
        </div>
        <aside className="space-y-4">
          <Card title="مشتری">
            <div className="space-y-2 text-13">
              <Row k="نام">{cu ? <CustLink v={cu.name} id={cu.id} /> : '—'}</Row>
              <Row k="موبایل"><span className="ltr">{cu?.mobile}</span></Row>
              <Row k="کیف پول">{toman(cu?.wallet ?? 0)}</Row>
              <Row k="نرخ مرجوعی">{fa(cu?.returnRate ?? 0)}٪</Row>
            </div>
          </Card>
          {prod && <Card title="کالا"><div className="flex items-center gap-3"><ProductImg pid={prod.id} size={56} /><div className="min-w-0 text-13"><p className="line-clamp-2 font-semibold">{prod.title}</p>{unit && <p className="text-12 text-t2">سریال <span className="ltr font-mono">{unit.serial}</span> · گرید {g(unit.grade)}</p>}</div></div></Card>}
          <Card title="تاریخچهٔ پرونده">
            <ol className="relative space-y-3 border-s border-line ps-4">
              {(c.events ?? []).slice().reverse().map((e, i) => <li key={i} className="text-12"><span className={cx('absolute -start-1.5 mt-1 size-3 rounded-full border-2 border-surface', e.who === 'مشتری' ? 'bg-purple' : e.who === 'سیستم' ? 'bg-t3' : 'bg-brand-solid')} /><p className="text-13">{e.text}</p><p className="text-t3">{e.by} · {fd(e.at)}</p></li>)}
              {!(c.events ?? []).length && <li className="text-12 text-t2">هنوز رویدادی ثبت نشده است.</li>}
            </ol>
          </Card>
          <Card title="پیامک‌های ارسال‌شده">
            {sms.length ? <ul className="space-y-2">{sms.map((s) => <li key={s.id} className="rounded-md bg-neutral-bg p-2 text-12"><p>{s.text}</p><p className="mt-1 text-t3">{s.status} · {rel(s.at)}</p></li>)}</ul> : <p className="text-12 text-t2">هنوز پیامکی برای این پرونده ارسال نشده است.</p>}
          </Card>
          <ReasonLog kind={kind} refId={c.id} />
        </aside>
      </div>
      <MessageModal open={msg} onClose={() => setMsg(false)} kind={kind} c={c} />
    </Page>
  )
}

function Stepper({ steps, at }: { steps: string[]; at: number }) {
  return <ol className="flex gap-1 overflow-x-auto p-4">{steps.map((s, i) => { const done = i < at || at === steps.length - 1; const cur = i === at && at !== steps.length - 1
    return <li key={s} className="flex min-w-28 flex-1 flex-col gap-1.5"><span className={cx('h-1.5 rounded-full', done ? 'bg-success-solid' : cur ? 'bg-brand-solid' : 'bg-neutral-bg')} /><span className={cx('flex items-center gap-1 text-12', cur ? 'font-bold text-brand' : done ? 'text-t1' : 'text-t3')}>{done && <Check size={13} className="text-success" />}{fa(i + 1)}. {s}</span></li> })}</ol>
}

function NextBox({ st, children }: { st: Stage; children: ReactNode }) {
  return <section className={cx('rounded-xl border p-4', st.step === 6 ? 'border-line bg-surface' : 'border-brand/40 bg-brand-tint')}>
    <p className="text-12 text-t2">{st.step === 6 ? 'وضعیت' : 'قدم بعدی'}</p>
    <h2 className="mb-3 text-16 font-bold">{st.next}</h2>
    {children}
  </section>
}

// ───────── قدم‌های مرجوعی ─────────
function ReturnNext({ c }: { c: Ret & War }) {
  const d = useDB(); const order = d.orders.find((o) => o.id === c.orderId)
  const days = d.rules.find((r) => r.key === 'return_days')!.value; const cap = d.rules.find((r) => r.key === 'refund_cap')!.value
  const ih = d.rules.find((r) => r.key === 'inspection_hours')!.value
  const ourFault = c.reason !== 'انصراف از خرید'
  const shipFee = ourFault ? 0 : Math.max(order?.shippingFee ?? 0, 450000)
  const [method, setMethod] = useState<'courier' | 'post' | 'inperson'>(c.method ?? 'post')
  const [tracking, setTracking] = useState(''); const [courier, setCourier] = useState('الوپیک')
  const [checks, setChecks] = useState<Record<string, boolean>>(c.checks ?? { 'پلمپ و بسته‌بندی': true, 'ظاهر بدون آسیب تازه': true, 'کارکرد': true, 'متعلقات کامل': true })
  const [fate, setFate] = useState(c.fate ?? 'بازگشت به فروش با گرید جدید')
  const [deduct, setDeduct] = useState(String(shipFee)); const [partial, setPartial] = useState(String(c.amount))
  const id = c.id

  if (c.status === 'return.registered') {
    const delivered = order?.deliveredAt ? (Date.now() - new Date(order.deliveredAt).getTime()) / 864e5 : 0
    const inTime = delivered <= days; const needPhoto = c.reason === 'مغایرت با صفحهٔ کالا'; const hasPhoto = !!c.photos?.length
    const approve = async () => {
      if (!inTime && !(await confirm({ title: 'خارج از مهلت مرجوعی', body: `از تحویل سفارش بیش از ${fa(days)} روز گذشته است. با این حال تأیید شود؟ دلیل در تاریخچه ثبت می‌شود.`, confirm: 'تأیید استثنایی' }))) return
      if (needPhoto && !hasPhoto && !(await confirm({ title: 'عکس مغایرت ثبت نشده', body: 'برای «مغایرت با صفحهٔ کالا» دست‌کم یک عکس لازم است. بدون عکس تأیید شود؟', confirm: 'تأیید بدون عکس' }))) return
      const st = method === 'courier' ? 'return.pickup_scheduled' : method === 'inperson' ? 'return.awaiting_pickup' : 'return.awaiting_customer'
      const txt = method === 'courier' ? `درخواست مرجوعی ${id} تأیید شد. پیک غنیمت برای دریافت کالا با شما تماس می‌گیرد. کالا را با جعبه و متعلقات آماده کنید.`
        : method === 'inperson' ? `درخواست مرجوعی ${id} تأیید شد. لطفاً کالا را با جعبه و متعلقات به شعبهٔ غنیمت بیاورید و رسید بگیرید.`
        : `درخواست مرجوعی ${id} تأیید شد. کالا را با برچسب مرجوعی پیوست به نشانی انبار بفرستید و کد رهگیری را در پنل ثبت کنید.${ourFault ? ' هزینهٔ ارسال با غنیمت است.' : ' پس‌کرایه از مبلغ کسر می‌شود.'}`
      act('return', id, (x) => { x.status = st; x.method = method }, `درخواست تأیید شد؛ روش بازگشت: ${METHODS[method].label}${ourFault ? ' (کرایه با غنیمت)' : ' (پس‌کرایه با مشتری)'}.`, txt)
      toast('تأیید شد و دستورالعمل برای مشتری پیامک شد.')
    }
    return <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Check2 ok={inTime} t={inTime ? `در مهلت ${fa(days)} روزه` : 'خارج از مهلت مرجوعی'} />
        <Check2 ok={!needPhoto || hasPhoto} t={needPhoto ? (hasPhoto ? 'عکس مغایرت پیوست شده' : 'عکس مغایرت لازم است') : 'عکس الزامی نیست'} />
        <Check2 ok t={ourFault ? 'کرایهٔ رفت و برگشت با غنیمت' : 'پس‌کرایه با مشتری'} />
      </div>
      <Field label="کالا چطور به ما برگردد؟"><MethodPick v={method} on={setMethod} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Check size={16} />} onClick={approve}>تأیید و ارسال دستورالعمل به مشتری</Button>
        <Button onClick={async () => { const why = await askReason({ kind: 'return', ref: id, status: 'درخواست عکس یا توضیح', title: 'چه چیزی از مشتری لازم است؟' }); if (why) { act('return', id, () => {}, `از مشتری عکس یا توضیح خواسته شد: ${why}`, `برای بررسی مرجوعی ${id} لطفاً ${why} را در پنل کاربری ثبت کنید.`); toast('درخواست برای مشتری پیامک شد.') } }}>درخواست عکس یا توضیح</Button>
        <Button variant="danger" onClick={async () => { const why = await askReason({ kind: 'return', ref: id, status: 'رد درخواست مرجوعی', title: `دلیل رد درخواست ${id}` }); if (why) { act('return', id, (x) => { x.status = 'return.rejected' }, `درخواست پیش از ارسال کالا رد شد: ${why}`, `درخواست مرجوعی ${id} پذیرفته نشد. دلیل: ${why}. جزئیات در پنل کاربری.`); toast('رد شد و دلیل برای مشتری پیامک شد.') } }}>رد درخواست با دلیل</Button>
      </div>
    </div>
  }

  if (c.status === 'return.awaiting_customer' || c.status === 'return.pickup_scheduled') {
    const pickup = c.status === 'return.pickup_scheduled'
    return <div className="space-y-4">
      <p className="text-13 text-t2">{pickup ? 'پیک غنیمت باید کالا را از مشتری تحویل بگیرد. وقتی تحویل گرفت اینجا ثبت کنید.' : `برچسب مرجوعی برای مشتری فرستاده شده است. مهلت ارسال: ${rel(c.deadline)}.`}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        {pickup ? <Field label="پیک"><Select value={courier} onChange={setCourier} options={['الوپیک', 'اسنپ‌باکس', 'پیک داخلی غنیمت']} /></Field>
          : <Field label="کد رهگیری ارسال مشتری" help="اگر مشتری خودش در پنل ثبت نکرده، از او بگیرید و اینجا وارد کنید."><Input className="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="مثلاً 2840519930021" /></Field>}
        <div className="flex items-end"><Button variant="primary" icon={<Truck size={16} />} disabled={!pickup && tracking.trim().length < 6} onClick={() => { act('return', id, (x) => { x.status = 'return.in_transit'; if (pickup) x.courierName = courier; else x.tracking = tracking.trim() }, pickup ? `پیک ${courier} کالا را از مشتری تحویل گرفت.` : `کد رهگیری ثبت شد: ${tracking.trim()}`, pickup ? `کالای مرجوعی ${id} از شما تحویل گرفته شد و در راه انبار غنیمت است.` : `کد رهگیری مرجوعی ${id} ثبت شد. پس از رسیدن به انبار، حداکثر ${fa(ih)} ساعت بررسی می‌شود.`); toast('ثبت شد؛ کالا در راه انبار است.') }}>{pickup ? 'پیک کالا را تحویل گرفت' : 'ثبت کد رهگیری'}</Button></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { act('return', id, () => {}, 'یادآوری ارسال کالا برای مشتری پیامک شد.', `یادآوری: برای تکمیل مرجوعی ${id}، کالا را تا ${rel(c.deadline)} ارسال کنید.`); toast('یادآوری پیامک شد.') }}>یادآوری به مشتری</Button>
        <Button onClick={async () => { if (await confirm({ title: 'مهلت ارسال تمام شد؟', body: 'پرونده بسته می‌شود و مشتری خبردار می‌شود.', confirm: 'بستن پرونده', danger: true })) act('return', id, (x) => { x.status = 'return.expired' }, 'مهلت ارسال کالا تمام شد و پرونده بسته شد.', `مهلت ارسال کالای مرجوعی ${id} تمام شد و درخواست بسته شد. برای پیگیری با پشتیبانی در تماس باشید.`) }}>مهلت تمام شد</Button>
        <Button variant="ghost" onClick={async () => { const why = await askReason({ kind: 'return', ref: id, status: 'لغو توسط مشتری', title: 'دلیل لغو به درخواست مشتری' }); if (why) act('return', id, (x) => { x.status = 'return.cancelled' }, `به درخواست مشتری لغو شد: ${why}`, `درخواست مرجوعی ${id} به درخواست شما لغو شد.`) }}>لغو به درخواست مشتری</Button>
      </div>
    </div>
  }

  if (c.status === 'return.in_transit' || c.status === 'return.awaiting_pickup')
    return <ReceiptForm kind="return" c={c} after="return.inspecting" note={c.status === 'return.awaiting_pickup' ? 'وقتی مشتری کالا را در شعبه تحویل داد، رسید را همین‌جا ثبت کنید. رسید برای مشتری پیامک می‌شود.' : 'کالا را باز کنید، سریال را با واحد ارسالی تطبیق دهید و از وضعیت دریافت عکس بگیرید.'}
      sms={`کالای مرجوعی ${id} در انبار غنیمت تحویل گرفته شد. نتیجهٔ بررسی حداکثر تا ${fa(ih)} ساعت دیگر اعلام می‌شود.`} />

  if (c.status === 'return.inspecting') {
    const finalAmt = Math.max(0, c.amount - (Number(deduct) || 0))
    const decide = async (mode: 'full' | 'deduct' | 'partial') => {
      const amt = mode === 'full' ? c.amount : mode === 'deduct' ? finalAmt : Math.min(c.amount, Number(partial) || 0)
      let why = ''
      if (mode !== 'full') { const r = await askReason({ kind: 'return', ref: id, status: mode === 'deduct' ? 'تأیید با کسر هزینهٔ ارسال' : 'تأیید بخشی', title: mode === 'deduct' ? 'توضیح کسر هزینه برای مشتری' : 'توضیح تأیید بخشی برای مشتری' }); if (!r) return; why = r }
      const needs = amt > cap
      mutate((x) => { const u = x.units.find((z) => z.id === c.unitId); if (u) u.status = fate.startsWith('بازگشت') ? 'unit.qc' : fate === 'تعمیر' ? 'unit.repair' : 'unit.defective'
        if (needs) x.approvals.unshift({ id: `AP-${720 + x.approvals.length}`, type: 'بازگشت وجه', title: `بازگشت ${toman(amt)} بابت ${id}`, ref: id, amount: amt, by: me(), byRole: 'x', status: 'approval.pending', at: now() }) }, { action: 'سرنوشت واحد مرجوعی', target: id, after: fate })
      act('return', id, (x) => { x.checks = checks; x.fate = fate; x.status = needs ? 'return.approved' : mode === 'partial' ? 'return.partial' : mode === 'deduct' ? 'return.approved_deducted' : 'return.refunding'; x.refund = { amount: amt, dest: x.dest === 'کیف پول' ? 'کیف پول غنیمت' : x.dest === 'درگاه پرداخت' ? 'درگاه پرداخت اصلی' : 'کارت بانکی (شبا)', deduct: c.amount - amt } },
        `بازرسی تمام شد: ${mode === 'full' ? 'تأیید کامل' : mode === 'deduct' ? 'تأیید با کسر هزینهٔ ارسال' : 'تأیید بخشی'} · مبلغ بازگشتی ${toman(amt)} · سرنوشت واحد: ${fate}${why ? ` · ${why}` : ''}`,
        `مرجوعی ${id} تأیید شد. مبلغ ${toman(amt)} ${needs ? 'پس از تأیید مالی' : 'به‌زودی'} برای شما واریز می‌شود.${why ? ` توضیح: ${why}` : ''}`)
      toast(needs ? 'تأیید شد؛ مبلغ بالای سقف است و به تأیید نفر دوم رفت.' : 'تأیید شد؛ پرونده به مرحلهٔ واریز رفت.')
    }
    return <div className="space-y-4">
      <Field label="چک‌لیست بازرسی"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.keys(checks).map((k) => <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-13"><input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />{k}</label>)}</div></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="سرنوشت واحد"><Select value={fate} onChange={setFate} options={['بازگشت به فروش با گرید جدید', 'تعمیر', 'معیوب']} /></Field>
        <Field label="کسر هزینه (تومان)" help={ourFault ? 'تقصیر با غنیمت است؛ معمولاً کسری ندارد.' : 'انصراف از خرید: پس‌کرایه کسر می‌شود.'}><Input className="ltr" inputMode="numeric" value={deduct} onChange={(e) => setDeduct(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="مبلغ تأیید بخشی (تومان)"><Input className="ltr" inputMode="numeric" value={partial} onChange={(e) => setPartial(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <div className="rounded-md bg-surface p-3 text-13"><Row k="مبلغ خرید">{toman(c.amount)}</Row><Row k="کسر">{toman(Number(deduct) || 0)}</Row><Row k="قابل بازگشت"><b>{toman(finalAmt)}</b></Row>{finalAmt > cap && <p className="mt-1 text-12 text-warning">بالای {toman(cap)} است و تأیید نفر دوم لازم دارد.</p>}</div>
      {Object.values(checks).some((v) => !v) && <p className="rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">برخی موارد چک‌لیست رد شده است. اگر تأیید می‌کنید، توضیح بدهید یا مرجوعی را رد کنید.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => decide(ourFault ? 'full' : 'deduct')}>{ourFault ? `تأیید کامل · ${toman(c.amount)}` : `تأیید با کسر پس‌کرایه · ${toman(finalAmt)}`}</Button>
        {!ourFault && <Button onClick={() => decide('full')}>تأیید کامل بدون کسر</Button>}
        <Button onClick={() => decide('partial')}>تأیید بخشی</Button>
        <Button variant="danger" onClick={async () => { const why = await askReason({ kind: 'return', ref: id, status: 'رد مرجوعی', title: `دلیل رد مرجوعی ${id}` }); if (why) { act('return', id, (x) => { x.status = 'return.rejected'; x.checks = checks }, `پس از بازرسی رد شد: ${why}`, `مرجوعی ${id} پس از بازرسی پذیرفته نشد. دلیل: ${why}. کالا به نشانی شما بازگردانده می‌شود.`); toast('رد شد؛ قدم بعد ارسال کالا به مشتری است.') } }}>رد مرجوعی</Button>
      </div>
    </div>
  }

  if (c.status === 'return.approved') {
    const ap = d.approvals.find((a) => a.ref === id)
    return <div className="space-y-3">
      <p className="text-13">مبلغ {toman(c.refund?.amount ?? c.amount)} بالای سقف بازگشت بدون تأیید دوم است. {ap && <>درخواست <span className="ltr font-mono">{ap.id}</span> در صف تأییدهاست.</>}</p>
      <Button variant="primary" onClick={() => { mutate((x) => { const a = x.approvals.find((y) => y.ref === id); if (a) a.status = 'approval.approved' }, { action: 'تأیید بازگشت وجه', target: id }); act('return', id, (x) => { x.status = 'return.refunding' }, 'تأیید نفر دوم برای بازگشت وجه ثبت شد.'); toast('تأیید شد؛ آمادهٔ واریز.') }}>ثبت تأیید مالی</Button>
    </div>
  }

  if (['return.refunding', 'return.partial', 'return.approved_deducted'].includes(c.status)) return <RefundForm kind="return" c={c} done="return.refunded" />

  if (c.status === 'return.rejected' && c.receipt) return <ShipBackForm kind="return" c={c} done="return.sent_back" title="کالا به مشتری بازگردانده شود" />

  return <Closed c={c} kind="return" />
}

// ───────── قدم‌های گارانتی ─────────
function WarrantyNext({ c }: { c: Ret & War }) {
  const d = useDB(); const id = c.id; const code = c.code
  const [method, setMethod] = useState<'courier' | 'post' | 'inperson'>(c.method ?? 'courier')
  const [tracking, setTracking] = useState('')
  const [excl, setExcl] = useState<Record<string, boolean>>({ 'آسیب فیزیکی یا ضربه': false, 'نفوذ مایعات': false, 'باز شدن یا دستکاری توسط غیرمجاز': false })
  const [diag, setDiag] = useState(c.diagnosis ?? ''); const [res, setRes] = useState(c.resolution ?? 'تعمیر داخلی')
  const [center, setCenter] = useState(c.center ?? 'مرکز خدمات رسمی برند'); const [rep, setRep] = useState('')
  const [repairNote, setRepairNote] = useState('')
  const unit = d.units.find((u) => u.id === c.unitId)
  const order = d.orders.find((o) => o.id === (c.orderId ?? d.orders.find((oo) => oo.shipments.some((sh) => sh.items.some((i) => i.unitId === c.unitId)))?.id))
  const start = order?.deliveredAt ?? order?.createdAt; const until = start ? new Date(new Date(start).getTime() + c.months * 30 * 864e5) : null
  const active = !until || until.getTime() > Date.now()
  const spares = d.units.filter((u) => u.productId === unit?.productId && u.id !== c.unitId && ['unit.published', 'unit.ready', 'unit.qc'].includes(u.status))

  if (c.status === 'warranty.pending') {
    const blocked = Object.values(excl).some(Boolean)
    return <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Check2 ok={active} t={until ? (active ? `فعال تا ${until.toLocaleDateString('fa-IR')}` : 'گارانتی منقضی شده') : 'تاریخ شروع نامشخص'} />
        <Check2 ok={!!unit} t={unit ? `سریال ثبت‌شده: ${unit.serial}` : 'واحد سریال‌دار پیدا نشد'} />
        <Check2 ok t={`هزینه با: ${c.owner}`} />
      </div>
      <Field label="موارد خارج از پوشش (از روی عکس و توضیح مشتری)"><div className="grid gap-2 sm:grid-cols-3">{Object.keys(excl).map((k) => <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-13"><input type="checkbox" checked={excl[k]} onChange={(e) => setExcl({ ...excl, [k]: e.target.checked })} />{k}</label>)}</div></Field>
      {blocked && <p className="rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">موردی خارج از پوشش علامت خورده است؛ معمولاً درخواست رد می‌شود یا با هزینهٔ مشتری تعمیر پیشنهاد می‌شود.</p>}
      <Field label="کالا چطور به ما برسد؟"><MethodPick v={method} on={setMethod} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!active} icon={<Check size={16} />} onClick={() => { act('warranty', id, (x) => { x.status = 'warranty.approved'; x.method = method }, `درخواست پذیرفته شد؛ روش ارسال کالا: ${METHODS[method].label}.`, method === 'courier' ? `درخواست گارانتی ${code} پذیرفته شد. پیک غنیمت برای دریافت کالا با شما تماس می‌گیرد.` : method === 'inperson' ? `درخواست گارانتی ${code} پذیرفته شد. کالا را با کارت گارانتی به شعبهٔ غنیمت بیاورید.` : `درخواست گارانتی ${code} پذیرفته شد. کالا را با برچسب پیوست بفرستید و کد رهگیری را در پنل ثبت کنید. هزینهٔ ارسال با ${c.owner} است.`); toast('پذیرفته شد و دستورالعمل پیامک شد.') }}>پذیرش و ارسال دستورالعمل</Button>
        <Button onClick={async () => { const why = await askReason({ kind: 'warranty', ref: id, status: 'نیازمند اصلاح یا مدارک', title: 'چه مدرک یا توضیحی لازم است؟' }); if (why) act('warranty', id, () => {}, `مدرک یا توضیح خواسته شد: ${why}`, `برای بررسی گارانتی ${code} لطفاً ${why} را در پنل کاربری ثبت کنید.`) }}>درخواست مدارک</Button>
        <Button variant="danger" onClick={async () => { const why = await askReason({ kind: 'warranty', ref: id, status: 'رد درخواست', title: `دلیل رد گارانتی ${code}` }); if (why) act('warranty', id, (x) => { x.status = 'warranty.rejected' }, `درخواست رد شد: ${why}`, `درخواست گارانتی ${code} پذیرفته نشد. دلیل: ${why}. جزئیات در پنل کاربری.`) }}>رد با ذکر دلیل</Button>
      </div>
    </div>
  }

  if (c.status === 'warranty.approved') return <div className="space-y-4">
    <p className="text-13 text-t2">{c.method === 'inperson' ? 'وقتی مشتری کالا را آورد، مستقیم رسید دریافت را ثبت کنید.' : c.method === 'courier' ? 'وقتی پیک کالا را تحویل گرفت ثبت کنید.' : 'منتظر کد رهگیری ارسال مشتری هستیم.'}</p>
    {c.method === 'inperson' ? <ReceiptForm kind="warranty" c={c} after="warranty.received" note="کالا را در حضور مشتری بررسی و رسید ثبت کنید." sms={`کالای گارانتی ${code} در شعبهٔ غنیمت تحویل گرفته شد. نتیجهٔ عیب‌یابی را پیامک می‌کنیم.`} />
      : <div className="grid gap-3 sm:grid-cols-[1fr_auto]">{c.method === 'post' ? <Field label="کد رهگیری ارسال مشتری"><Input className="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field> : <div />}
        <div className="flex items-end"><Button variant="primary" icon={<Truck size={16} />} disabled={c.method === 'post' && tracking.trim().length < 6} onClick={() => act('warranty', id, (x) => { x.status = 'warranty.in_transit'; if (tracking) x.tracking = tracking.trim() }, c.method === 'post' ? `کد رهگیری ثبت شد: ${tracking.trim()}` : 'پیک کالا را از مشتری تحویل گرفت.', `کالای گارانتی ${code} در راه غنیمت است.`)}>{c.method === 'post' ? 'ثبت کد رهگیری' : 'پیک کالا را تحویل گرفت'}</Button></div></div>}
    <Button onClick={() => act('warranty', id, () => {}, 'یادآوری ارسال کالا پیامک شد.', `یادآوری: برای ادامهٔ خدمات گارانتی ${code}، کالا را ارسال کنید.`)}>یادآوری به مشتری</Button>
  </div>

  if (c.status === 'warranty.in_transit') return <ReceiptForm kind="warranty" c={c} after="warranty.received" note="سریال را با کارت گارانتی تطبیق دهید و از وضعیت ظاهری عکس بگیرید؛ این عکس‌ها مبنای تشخیص آسیب فیزیکی است." sms={`کالای گارانتی ${code} به غنیمت رسید و عیب‌یابی شروع شد.`} />

  if (c.status === 'warranty.received') {
    const go = async () => {
      if (res === 'بازگشت مبلغ') { act('warranty', id, (x) => { x.diagnosis = diag; x.resolution = res; x.refund = { amount: order?.total ?? 0, dest: 'کارت بانکی (شبا)' }; x.status = 'warranty.ready' }, `تشخیص: ${diag} · اقدام: بازگشت مبلغ`); return }
      if (res === 'عیبی یافت نشد') { act('warranty', id, (x) => { x.diagnosis = diag; x.resolution = res; x.status = 'warranty.ready' }, `تشخیص: عیبی یافت نشد · ${diag}`, `کالای گارانتی ${code} بررسی شد و عیبی مشاهده نشد. توضیح: ${diag}. کالا برای شما بازگردانده می‌شود.`); return }
      if (res === 'تعویض با واحد مشابه' && !rep) { toast('واحد جایگزین را انتخاب کنید.', { tone: 'err' }); return }
      act('warranty', id, (x) => { x.diagnosis = diag; x.resolution = res; if (res === 'ارسال به مرکز خدمات') x.center = center; if (res === 'تعویض با واحد مشابه') x.replaceUnitId = rep
        x.status = res === 'تعمیر داخلی' ? 'warranty.repairing' : res === 'ارسال به مرکز خدمات' ? 'warranty.external' : 'warranty.replaced' }, `تشخیص: ${diag} · اقدام: ${res}${res === 'ارسال به مرکز خدمات' ? ` (${center})` : ''}`,
        `نتیجهٔ عیب‌یابی گارانتی ${code}: ${diag}. اقدام: ${res === 'تعویض با واحد مشابه' ? 'کالا با واحد مشابه تعویض می‌شود' : res === 'تعمیر داخلی' ? 'تعمیر در غنیمت' : 'ارسال به مرکز خدمات برند'}.`)
      if (res === 'تعویض با واحد مشابه') mutate((x) => { const n = x.units.find((u) => u.id === rep); if (n) n.status = 'unit.reserved'; const o = x.units.find((u) => u.id === c.unitId); if (o) o.status = 'unit.repair' }, { action: 'رزرو واحد جایگزین گارانتی', target: rep })
    }
    return <div className="space-y-4">
      <Field label="تشخیص فنی" help="این متن برای مشتری پیامک می‌شود؛ ساده و دقیق بنویسید."><Textarea rows={3} value={diag} onChange={(e) => setDiag(e.target.value)} placeholder="مثلاً لحیم ماژول بلوتوث سرد شده است" /></Field>
      <Field label="راه‌حل"><Segmented value={res} onChange={setRes} options={(['تعمیر داخلی', 'ارسال به مرکز خدمات', 'تعویض با واحد مشابه', 'بازگشت مبلغ', 'عیبی یافت نشد'] as const).map((x) => [x, x]) as [string, string][]} /></Field>
      {res === 'ارسال به مرکز خدمات' && <Field label="مرکز خدمات"><Select value={center} onChange={setCenter} options={['مرکز خدمات رسمی برند', 'شرکت گارانتی طرف قرارداد', 'تعمیرگاه همکار']} other /></Field>}
      {res === 'تعویض با واحد مشابه' && <Field label="واحد جایگزین" help={spares.length ? 'واحدهای موجود از همین مدل' : 'از این مدل واحد آماده‌ای نیست؛ راه‌حل دیگری انتخاب کنید.'}><Select value={rep} onChange={setRep} options={spares.map((u) => [u.id, `${u.serial} · گرید ${g(u.grade)} · ${u.shelf ?? ''}`] as [string, string])} /></Field>}
      <Button variant="primary" icon={<Wrench size={16} />} disabled={diag.trim().length < 5} onClick={go}>ثبت تشخیص و شروع اقدام</Button>
    </div>
  }

  if (c.status === 'warranty.repairing' || c.status === 'warranty.external') return <div className="space-y-3">
    <p className="text-13">تشخیص: {c.diagnosis} {c.center && <>· نزد <b>{c.center}</b></>}</p>
    <Field label="شرح کار انجام‌شده"><Input value={repairNote} onChange={(e) => setRepairNote(e.target.value)} placeholder="مثلاً ماژول بلوتوث تعویض شد" /></Field>
    <Button variant="primary" disabled={repairNote.trim().length < 3} onClick={() => act('warranty', id, (x) => { x.repairNote = repairNote; x.status = 'warranty.ready' }, `${c.status === 'warranty.external' ? 'کالا از مرکز خدمات برگشت' : 'تعمیر تمام شد'}: ${repairNote}`, `تعمیر کالای گارانتی ${code} انجام شد (${repairNote}) و به‌زودی برای شما ارسال می‌شود.`)}>{c.status === 'warranty.external' ? 'کالا از مرکز خدمات برگشت' : 'تعمیر تمام شد'}</Button>
  </div>

  if (c.status === 'warranty.ready' || c.status === 'warranty.replaced') {
    if (c.resolution === 'بازگشت مبلغ') return <RefundForm kind="warranty" c={c} done="warranty.refunded" />
    return <ShipBackForm kind="warranty" c={c} done="warranty.shipping_back" title={c.resolution === 'تعویض با واحد مشابه' ? 'کالای جایگزین برای مشتری ارسال شود' : 'کالا به مشتری بازگردانده شود'} />
  }

  if (c.status === 'warranty.shipping_back') return <div className="space-y-3">
    <p className="text-13">ارسال با {c.back?.method}{c.back?.tracking && <> · کد رهگیری <span className="ltr font-mono">{c.back.tracking}</span></>}</p>
    <Button variant="primary" icon={<Check size={16} />} onClick={() => act('warranty', id, (x) => { x.status = 'warranty.done' }, 'کالا به مشتری تحویل شد و پرونده بسته شد.', `کالای گارانتی ${code} به شما تحویل شد. از اینکه به غنیمت اعتماد کردید ممنونیم؛ نظرتان را از لینک پنل ثبت کنید.`)}>تحویل به مشتری ثبت شد</Button>
  </div>

  return <Closed c={c} kind="warranty" />
}

// ───────── فرم‌های مشترک ─────────
function MethodPick({ v, on }: { v: 'courier' | 'post' | 'inperson'; on: (m: 'courier' | 'post' | 'inperson') => void }) {
  const ic = { courier: <Bike size={18} />, post: <Send size={18} />, inperson: <Store size={18} /> }
  return <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(METHODS) as ('courier' | 'post' | 'inperson')[]).map((k) => <button key={k} type="button" aria-pressed={v === k} aria-label={METHODS[k].label} onClick={() => on(k)} className={cx('rounded-lg border p-3 text-start', v === k ? 'border-brand-solid bg-surface ring-2 ring-brand-solid/20' : 'border-line bg-surface hover:border-brand/40')}><span className="flex items-center gap-2 text-13 font-semibold">{ic[k]}{METHODS[k].label}</span><span className="mt-1 block text-12 text-t2">{METHODS[k].desc}</span></button>)}</div>
}

function Check2({ ok, t }: { ok: boolean; t: string }) {
  return <p className={cx('flex items-center gap-2 rounded-md px-3 py-2 text-12', ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>{ok ? <Check size={14} /> : <X size={14} />}{t}</p>
}

function ReceiptForm({ kind, c, after, note, sms }: { kind: Kind; c: Ret & War; after: string; note: string; sms: string }) {
  const d = useDB(); const unit = d.units.find((u) => u.id === c.unitId)
  const [serial, setSerial] = useState(''); const [seal, setSeal] = useState(true); const [acc, setAcc] = useState(true)
  const [photos, setPhotos] = useState<string[]>([]); const [txt, setTxt] = useState('')
  const match = !unit || serial.trim().toUpperCase() === unit.serial.toUpperCase()
  const save = async () => {
    if (unit && !match && !(await confirm({ title: 'سریال مطابقت ندارد', body: `سریال دریافتی (${serial}) با واحد ارسالی (${unit.serial}) یکی نیست. رسید با «عدم تطابق» ثبت شود؟`, confirm: 'ثبت با عدم تطابق', danger: true }))) return
    const r: CaseReceipt = { at: now(), by: me(), serial: serial.trim(), serialOk: match, sealOk: seal, accOk: acc, photos, note: txt }
    act(kind, c.id, (x) => { x.receipt = r; x.status = after }, `رسید دریافت ثبت شد؛ سریال ${match ? 'مطابق' : 'نامطابق'}، پلمپ ${seal ? 'سالم' : 'باز'}، متعلقات ${acc ? 'کامل' : 'ناقص'}${txt ? ` · ${txt}` : ''}`, sms)
    if (kind === 'return' && unit) mutate((x) => { const u = x.units.find((z) => z.id === unit.id); if (u) u.status = 'unit.returned' }, { action: 'دریافت واحد مرجوعی', target: unit.id })
    toast('رسید ثبت شد و برای مشتری پیامک شد.')
  }
  return <div className="space-y-4">
    <p className="text-13 text-t2">{note}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="سریال کالای دریافتی" help={unit ? `سریال واحد ارسالی: ${unit.serial}` : 'کالای تعدادی؛ سریال اختیاری است.'} error={unit && serial && !match ? 'با واحد ارسالی مطابقت ندارد' : undefined}><Input className="ltr" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="اسکن یا تایپ سریال" /></Field>
      <Field label="توضیح دریافت"><Input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="مثلاً جعبه کمی آسیب دیده" /></Field>
    </div>
    <div className="flex flex-wrap gap-4"><Toggle on={seal} onChange={setSeal} text="پلمپ و بسته‌بندی سالم" /><Toggle on={acc} onChange={setAcc} text="متعلقات کامل" /></div>
    <Field label="عکس کالا هنگام دریافت" help="دست‌کم یک عکس؛ برای مقایسه با عکس‌های پیش از ارسال.">
      <div className="flex flex-wrap gap-2">{photos.map((p, i) => <img key={i} src={p} alt="" className="size-20 rounded-lg object-cover" />)}
        <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-brand/50 bg-surface text-12 text-brand"><span className="grid place-items-center gap-1"><Camera size={18} />عکس</span><input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => { const fs = Array.from(e.target.files ?? []); const imgs = await Promise.all(fs.map((f) => fileToImage(f))); setPhotos((p) => [...p, ...imgs]) }} /></label></div>
    </Field>
    <Button variant="primary" icon={<Inbox size={16} />} disabled={!photos.length || (!!unit && !serial.trim())} onClick={save}>ثبت رسید دریافت</Button>
  </div>
}

function RefundForm({ kind, c, done }: { kind: Kind; c: Ret & War; done: string }) {
  const d = useDB(); const order = d.orders.find((o) => o.id === c.orderId)
  const amount = c.refund?.amount ?? c.amount ?? 0
  const [dest, setDest] = useState(c.refund?.dest ?? REFUND_DEST[0]); const [acc, setAcc] = useState(c.refund?.account ?? ''); const [ref, setRef] = useState('')
  const wallet = dest === 'کیف پول غنیمت'; const ok = wallet || (ref.trim().length >= 4 && (dest !== 'کارت بانکی (شبا)' || /^(IR)?\d{24}$/i.test(acc.replace(/\s/g, ''))))
  const pay = () => {
    const r = ref.trim() || `W-${Date.now().toString(36).toUpperCase()}`
    mutate((x) => { if (wallet) { const cu = x.customers.find((z) => z.id === c.customerId); if (cu) cu.wallet += amount }
      if (dest === 'درگاه پرداخت اصلی') { const t = x.txns.find((z) => z.orderId === c.orderId); x.txns.unshift({ ...(t ?? { gateway: 'درگاه', orderId: c.orderId ?? '' }), id: `TX-R${Date.now().toString(36)}`, amount: -amount, ref: r, status: 'pay.refunded', at: now() } as typeof x.txns[number]) } }, { action: 'بازگشت وجه', target: c.id, after: `${toman(amount)} · ${dest}` })
    act(kind, c.id, (x) => { x.status = done; x.refund = { ...(x.refund ?? { amount }), amount, dest, account: acc || undefined, ref: r, at: now(), by: me() } }, `${toman(amount)} به ${dest} واریز شد · پیگیری ${r}`,
      `مبلغ ${toman(amount)} بابت ${kind === 'return' ? 'مرجوعی' : 'گارانتی'} ${kind === 'return' ? c.id : c.code} ${wallet ? 'به کیف پول غنیمت شما اضافه شد' : `به ${dest === 'درگاه پرداخت اصلی' ? 'کارت پرداخت‌کننده' : 'حساب شما'} واریز شد. شمارهٔ پیگیری: ${r}`}.`)
    toast('واریز ثبت شد و مشتری خبردار شد.')
  }
  return <div className="space-y-4">
    <div className="rounded-md bg-surface p-3 text-13"><Row k="مبلغ قابل بازگشت"><b>{toman(amount)}</b></Row>{!!c.refund?.deduct && <Row k="کسرشده">{toman(c.refund.deduct)}</Row>}{order && <Row k="پرداخت اولیه">{order.pay}</Row>}</div>
    <Field label="مقصد واریز"><Segmented value={dest} onChange={setDest} options={REFUND_DEST.map((x) => [x, x]) as [string, string][]} /></Field>
    {dest === 'کارت بانکی (شبا)' && <Field label="شمارهٔ شبا" help="به نام خود مشتری؛ با استعلام شبا تطبیق داده می‌شود." error={acc && !/^(IR)?\d{24}$/i.test(acc.replace(/\s/g, '')) ? 'شبا ۲۴ رقم است' : undefined}><Input className="ltr" value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="IR000000000000000000000000" /></Field>}
    {!wallet && <Field label="شمارهٔ پیگیری واریز" help={dest === 'درگاه پرداخت اصلی' ? 'شمارهٔ برگشت تراکنش از پنل درگاه' : 'شمارهٔ پیگیری حواله یا پایا'}><Input className="ltr" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}
    {wallet && <p className="text-12 text-t2">مبلغ فوراً به کیف پول مشتری اضافه می‌شود و قابل برداشت یا خرید است.</p>}
    <Button variant="primary" icon={<CircleDollarSign size={16} />} disabled={!ok} onClick={pay}>ثبت واریز و خبر دادن به مشتری</Button>
  </div>
}

function ShipBackForm({ kind, c, done, title }: { kind: Kind; c: Ret & War; done: string; title: string }) {
  const [m, setM] = useState(SHIP_BACK[0]); const [t, setT] = useState('')
  const need = m !== 'تحویل حضوری'
  return <div className="space-y-4">
    <p className="text-13 font-semibold">{title}</p>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="روش ارسال"><Select value={m} onChange={setM} options={SHIP_BACK} /></Field>{need && <Field label={m === 'پیک غنیمت' ? 'نام پیک یا لینک سفر' : 'کد رهگیری'}><Input className="ltr" value={t} onChange={(e) => setT(e.target.value)} /></Field>}</div>
    <Button variant="primary" icon={<PackageSearch size={16} />} disabled={need && t.trim().length < 3} onClick={() => {
      act(kind, c.id, (x) => { x.status = done; x.back = { method: m, tracking: t.trim() || undefined, at: now() } }, `کالا با ${m} برای مشتری ارسال شد${t ? ` · ${t}` : ''}.`,
        `${kind === 'return' ? `کالای مرجوعی ${c.id}` : `کالای گارانتی ${c.code}`} ${m === 'تحویل حضوری' ? 'آمادهٔ تحویل در شعبه است' : `با ${m} برای شما ارسال شد${t ? `؛ کد رهگیری ${t}` : ''}`}.`)
      if (kind === 'return') mutate((x) => { const u = x.units.find((z) => z.id === c.unitId); if (u) u.status = 'unit.sold' }, { action: 'بازگشت واحد به مشتری', target: c.unitId })
      toast('ارسال ثبت شد و مشتری خبردار شد.') }}>ثبت ارسال و پیامک کد رهگیری</Button>
  </div>
}

function Closed({ c, kind }: { c: Ret & War; kind: Kind }) {
  return <div className="space-y-1 text-13">
    {c.refund?.at && <Row k="واریز">{toman(c.refund.amount)} · {c.refund.dest}{c.refund.ref && <> · <span className="ltr font-mono">{c.refund.ref}</span></>}</Row>}
    {c.back && <Row k="ارسال به مشتری">{c.back.method}{c.back.tracking && <> · <span className="ltr font-mono">{c.back.tracking}</span></>}</Row>}
    {kind === 'warranty' && c.resolution && <Row k="راه‌حل">{c.resolution}{c.repairNote && ` · ${c.repairNote}`}</Row>}
    {!c.refund?.at && !c.back && <p className="text-t2">این پرونده بسته است. دلیل‌ها و تاریخچه در ستون کناری است.</p>}
  </div>
}

function Evidence({ c, orderId }: { c: CaseFlow & { unitId: string }; orderId?: string }) {
  const d = useDB(); const o = d.orders.find((x) => x.id === orderId); const sh = o?.shipments.find((x) => x.items.some((i) => i.unitId === c.unitId)) ?? o?.shipments[0]
  const r = c.receipt
  return <Card title="مقایسهٔ ارسال و دریافت">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-line p-3"><p className="mb-2 text-12 font-semibold">پیش از ارسال به مشتری</p>{o && sh ? <PackPhotos orderId={o.id} shipId={sh.id} readOnly big /> : <p className="text-12 text-t2">مرسوله پیدا نشد.</p>}</div>
      <div className="rounded-md border border-purple/40 p-3"><p className="mb-2 flex items-center gap-1.5 text-12 font-semibold"><ClipboardCheck size={14} />رسید دریافت</p>
        {r ? <div className="space-y-1 text-12">
          <p className={r.serialOk ? 'text-success' : 'text-danger'}>سریال {r.serial ? <span className="ltr font-mono">{r.serial}</span> : '—'} · {r.serialOk ? 'مطابق' : 'نامطابق'}</p>
          <p>پلمپ {r.sealOk ? 'سالم' : 'باز'} · متعلقات {r.accOk ? 'کامل' : 'ناقص'}</p>{r.note && <p className="text-t2">«{r.note}»</p>}<p className="text-t3">{r.by} · {fd(r.at)}</p>
          {r.photos.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{r.photos.map((p, i) => <img key={i} src={p} alt="" className="size-16 rounded-md object-cover" />)}</div>}
        </div> : <p className="text-12 text-t2">کالا هنوز دریافت نشده است.</p>}
      </div>
    </div>
  </Card>
}

function MessageModal({ open, onClose, kind, c }: { open: boolean; onClose: () => void; kind: Kind; c: Ret & War }) {
  const ref = kind === 'return' ? c.id : c.code
  const T = [`درخواست ${ref} در حال بررسی است و نتیجه را تا پایان امروز اعلام می‌کنیم.`, `برای ادامهٔ بررسی ${ref} لطفاً با پشتیبانی غنیمت تماس بگیرید.`, `برای ${ref} یک عکس واضح از سریال و ایراد کالا در پنل ثبت کنید.`, `ارسال کالای ${ref} با تأخیر همراه است؛ پوزش می‌خواهیم و پیگیری می‌کنیم.`]
  const [t, setT] = useState(T[0])
  return <Modal open={open} onClose={onClose} title="پیام به مشتری" footer={<><Button variant="primary" disabled={t.trim().length < 5} onClick={() => { act(kind, c.id, () => {}, `پیام به مشتری: ${t}`, t); onClose(); toast('پیامک ارسال شد.') }}>ارسال پیامک</Button><Button onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3"><div className="flex flex-wrap gap-1.5">{T.map((x) => <button key={x} type="button" onClick={() => setT(x)} className="rounded-full border border-line px-3 py-1 text-12 hover:border-brand/50">{x.slice(0, 32)}…</button>)}</div>
      <Textarea rows={4} value={t} onChange={(e) => setT(e.target.value)} /><p className="text-12 text-t2">با پیشوند «غنیمت:» ارسال و در تاریخچهٔ پرونده ثبت می‌شود.</p></div>
  </Modal>
}
