// پروندهٔ مرجوعی و گارانتی سمت مدیریت؛ مراحل، وضعیت‌ها، فیلدها و متن تاریخچه دقیقاً مطابق فیگمای پنل کاربری است
// تا هر کاری که این‌جا انجام می‌شود همان چیزی را به مشتری نشان دهد که در فیگما طراحی شده است.
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Check, CircleDollarSign, ClipboardCheck, Inbox, MessageSquareText, PackageSearch, PlayCircle, Truck, Wrench } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Row, Segmented, Select, StatusBadge, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { askReason, ReasonLog } from '@/shared/ui/reason'
import { currentUser, getDB, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel, toman, g } from '@/shared/lib/fa'
import type { CaseReceipt, Ret, War } from '@/shared/data/seed'
import { CustLink, ProductImg } from '../pages/_shared'
import { OriginalOrder } from '../orders/ReturnTools'
import { PackPhotos } from '../shared/PackPhotos'
import { cardState, COVERED, EXCLUDED, METHODS, QC_CHECKS, refundLabel, RETURN_STEPS, retItems, retStage, SERVICE_CENTER, SHIP_BACK, warStage, WARRANTY_STEPS, type Stage } from './flow'

type Kind = 'return' | 'warranty'
type C = Ret & War
const me = () => currentUser()?.name.split(' ')[0] ?? 'کاربر'
const now = () => new Date().toISOString()
const fd = (iso?: string) => iso ? new Date(iso).toLocaleString('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fday = (iso?: string) => iso ? new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString()

/** تغییر پرونده + ثبت رویداد (همان متنی که مشتری در «تاریخچهٔ وضعیت» می‌بیند) + پیامک اختیاری */
function act(kind: Kind, id: string, fn: (c: C) => void, events: string | string[], sms?: string) {
  const ev = Array.isArray(events) ? events : [events]
  mutate((d) => {
    const c = (kind === 'return' ? d.returns : d.warranties).find((x) => x.id === id) as C | undefined
    if (!c) return
    fn(c); for (const t of ev) (c.events ??= []).push({ at: now(), by: me(), text: t, who: 'ما' })
  }, { action: `${kind === 'return' ? 'مرجوعی' : 'گارانتی'}: ${ev.join(' · ')}`, target: id })
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
  const c = (kind === 'return' ? d.returns : d.warranties).find((x) => x.id === id) as C | undefined
  const [msg, setMsg] = useState(false)
  if (!c) return <Page title="پرونده پیدا نشد" back="/admin/returns"><Card><p className="p-6 text-center text-13 text-t2">پرونده‌ای با شمارهٔ {id} نیست.</p></Card></Page>
  const cu = d.customers.find((x) => x.id === c.customerId)
  const unit = d.units.find((u) => u.id === c.unitId)
  const prod = d.products.find((p) => p.id === (unit?.productId ?? c.productId))
  const orderId = c.orderId ?? d.orders.find((o) => o.shipments.some((sh) => sh.items.some((i) => i.unitId === c.unitId)))?.id
  const st: Stage = kind === 'return' ? retStage(c) : warStage(c)
  const sms = d.smsLog.filter((s) => s.ref === c.id)
  const label = kind === 'return' ? 'مرجوعی' : 'درخواست مرجوعی گارانتی'

  return (
    <Page module="returns" back={`/admin/returns${kind === 'warranty' ? '?tab=warranty' : ''}`}
      title={<span className="flex items-center gap-2">{label} <span className="ltr font-mono">{c.id}</span></span>}
      badge={<><StatusBadge s={c.status} />{st.who !== '—' && <Badge tone={st.who === 'ما' ? 'warning' : 'neutral'} dot={false}>اقدام با: {st.who}</Badge>}</>}
      sub={[orderId && `سفارش ${orderId}`, `ثبت درخواست: ${fday(c.createdAt ?? c.events?.[0]?.at)}`, cu?.name].filter(Boolean).join(' · ')}
      actions={<><Button icon={<MessageSquareText size={16} />} onClick={() => setMsg(true)}>پیام به مشتری</Button>{orderId && <Button onClick={() => nav(`/admin/orders/${orderId}`)}>سفارش اصلی</Button>}</>}>
      <Card pad={false} className="mb-4"><Stepper steps={kind === 'return' ? RETURN_STEPS : WARRANTY_STEPS} at={st.step} /></Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <NextBox st={st}>{kind === 'return' ? <ReturnNext key={`${c.id}-${c.status}`} c={c} /> : <WarrantyNext key={`${c.id}-${c.status}`} c={c} />}</NextBox>
          {kind === 'return' ? <ReturnSummary c={c} /> : <WarrantySummary c={c} />}
          <Evidence c={c} orderId={orderId} />
          {orderId && <OriginalOrder orderId={orderId} highlight={c.unitId} />}
        </div>
        <aside className="space-y-4">
          <Card title="مشتری">
            <div className="space-y-2 text-13">
              <Row k="نام">{cu ? <CustLink v={cu.name} id={cu.id} /> : '—'}</Row>
              <Row k="موبایل"><span className="ltr">{c.contact ?? cu?.mobile}</span></Row>
              <Row k="کیف پول">{toman(cu?.wallet ?? 0)}</Row>
              <Row k="نرخ مرجوعی">{fa(cu?.returnRate ?? 0)}٪</Row>
            </div>
          </Card>
          {prod && <Card title="کالا"><div className="flex items-center gap-3"><ProductImg pid={prod.id} size={56} /><div className="min-w-0 text-13"><p className="line-clamp-2 font-semibold">{prod.title}</p>{unit && <p className="text-12 text-t2">سریال <span className="ltr font-mono">{unit.serial}</span> · گرید {g(unit.grade)}</p>}</div></div></Card>}
          <Card title="تاریخچهٔ وضعیت">
            <ol className="relative space-y-3 border-s border-line ps-4">
              {(c.events ?? []).slice().reverse().map((e, i) => <li key={i} className="text-12"><span className={cx('absolute -start-1.5 mt-1 size-3 rounded-full border-2 border-surface', e.who === 'مشتری' ? 'bg-purple' : e.who === 'سیستم' ? 'bg-t3' : 'bg-brand-solid')} /><p className="text-13">{e.text}</p><p className="text-t3">{e.who === 'مشتری' ? 'مشتری' : e.by} · {fd(e.at)}</p></li>)}
              {!(c.events ?? []).length && <li className="text-12 text-t2">هنوز رویدادی ثبت نشده است.</li>}
            </ol>
            <p className="mt-3 text-11 text-t3">همین متن‌ها در «تاریخچهٔ وضعیت» پنل مشتری نمایش داده می‌شود.</p>
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

function Stepper({ steps, at }: { steps: [string, string][]; at: number }) {
  const all = at >= steps.length
  return <ol className="flex gap-1 overflow-x-auto p-4">{steps.map(([s, sub], i) => { const done = all || i < at; const cur = !all && i === at
    return <li key={s} className="flex min-w-28 flex-1 flex-col gap-1.5"><span className={cx('h-1.5 rounded-full', done ? 'bg-success-solid' : cur ? 'bg-brand-solid' : 'bg-neutral-bg')} /><span className={cx('flex items-center gap-1 text-12', cur ? 'font-bold text-brand' : done ? 'text-t1' : 'text-t3')}>{done && <Check size={13} className="text-success" />}{fa(i + 1)}. {s}</span><span className="text-11 text-t3">{sub}</span></li> })}</ol>
}

function NextBox({ st, children }: { st: Stage; children: ReactNode }) {
  const closed = st.who === '—'
  return <section className={cx('rounded-xl border p-4', closed ? 'border-line bg-surface' : 'border-brand/40 bg-brand-tint')}>
    <p className="text-12 text-t2">{closed ? 'وضعیت' : 'قدم بعدی'}</p>
    <h2 className="mb-3 text-16 font-bold">{st.next}</h2>
    {children}
  </section>
}

const Info = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' }) => <p className={cx('rounded-md px-3 py-2 text-12', tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-surface text-t2')}>{children}</p>

// ───────── مرجوعی ─────────
function ReturnSummary({ c }: { c: C }) {
  const d = useDB(); const items = retItems(c, d.orders); const o = d.orders.find((x) => x.id === c.orderId)
  const cost = c.method === 'inperson' ? 'بدون هزینهٔ ارسال' : c.shipCostBy === 'مشتری' ? `بر عهدهٔ مشتری · از مبلغ بازگشتی کسر می‌شود${c.returnShipCost ? ` (${toman(c.returnShipCost)})` : ''}` : `بر عهدهٔ غنیمت · به‌دلیل ${c.reason}`
  const approved = c.refund?.amount
  return <Card title="خلاصهٔ درخواست">
    <div className="grid gap-x-6 gap-y-2 text-13 sm:grid-cols-2">
      <Row k="کد مرجوعی (روی بسته)"><span className="ltr font-mono">{c.id}</span></Row>
      <Row k="دلیل مرجوعی">{c.reason}</Row>
      <Row k="روش ارسال">{METHODS[c.method ?? 'post']?.short}</Row>
      <Row k="مهلت ارسال">تا {fday(c.deadline)} · ۷ روز پس از تحویل</Row>
      <Row k="نشانی مقصد">{c.method === 'inperson' ? (c.branch ?? 'شعبهٔ غنیمت') : 'انبار مرجوعی غنیمت'}</Row>
      <Row k="هزینهٔ ارسال مرجوعی">{cost}</Row>
      <Row k="بازگشت وجه به">{refundLabel(c)}</Row>
      <Row k={approved ? 'مبلغ تأییدشده' : 'حداکثر مبلغ قابل بازگشت'}><b>{toman(approved ?? c.amount)}</b></Row>
      {c.declaredAt && <Row k="اطلاعات ارسال">اعلام‌شده در {fd(c.declaredAt)} · کد رهگیری: {c.tracking ? <span className="ltr font-mono">{c.tracking}</span> : 'ثبت نشده'}</Row>}
      {c.channel && <Row k="ثبت">دستی · {c.channel}{c.by && ` · ${c.by}`}</Row>}
    </div>
    {c.note && <p className="mt-3 rounded-md bg-neutral-bg px-3 py-2 text-13">«{c.note}»</p>}
    {c.photos && c.photos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{c.photos.map((ph, i) => <img key={i} src={ph} alt="عکس مشتری" className="size-20 rounded-lg object-cover" />)}</div>}
    <p className="mb-2 mt-4 text-12 font-semibold">کالاهای مرجوعی ({fa(items.length)} کالا){o && c.reason !== 'انصراف از خرید' && items.length === o.shipments.flatMap((s) => s.items).length && <span className="ms-2 font-normal text-t2">همهٔ کالاهای سفارش؛ هزینهٔ ارسال خرید ({toman(o.shippingFee)}) هم برمی‌گردد</span>}</p>
    <ul className="divide-y divide-line rounded-md border border-line">{items.map((it, i) => { const p = d.products.find((x) => x.id === it.productId); const u = d.units.find((x) => x.id === it.unitId)
      return <li key={i} className="flex items-center gap-3 p-2.5 text-13"><ProductImg pid={it.productId} size={40} /><div className="min-w-0 flex-1"><p className="line-clamp-1">{p?.title ?? it.productId}</p><p className="text-12 text-t2">{u ? `سریال ${u.serial}` : `${fa(it.qty)} عدد`}{it.shipId && ` · ${it.shipId}`}</p>{it.ok === false && it.why && <p className="text-12 text-danger">{it.why}</p>}</div><span className="tnum">{toman(it.price * it.qty)}</span>{it.ok !== undefined && <Badge tone={it.ok ? 'success' : 'danger'} dot={false}>{it.ok ? 'تأیید شد' : 'رد شد'}</Badge>}</li> })}</ul>
    {c.qcNote && <p className="mt-3 text-13"><b>نتیجهٔ بررسی:</b> {c.qcNote}</p>}
  </Card>
}

function ReturnNext({ c }: { c: C }) {
  const d = useDB(); const o = d.orders.find((x) => x.id === c.orderId); const id = c.id
  const items = retItems(c, d.orders)
  const cap = d.rules.find((r) => r.key === 'refund_cap')!.value
  const ih = d.rules.find((r) => r.key === 'inspection_hours')!.value
  const [tracking, setTracking] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>(c.checks ?? Object.fromEntries(QC_CHECKS.map((k) => [k, true])))
  const [dec, setDec] = useState<boolean[]>(items.map((i) => i.ok ?? true))
  const [why, setWhy] = useState<string[]>(items.map((i) => i.why ?? 'ایراد اعلام‌شده در بررسی تأیید نشد؛ این کالا دوباره برایتان ارسال می‌شود.'))
  const [fate, setFate] = useState(c.fate ?? 'بازگشت به فروش با گرید جدید')
  const [shipCost, setShipCost] = useState(String(c.returnShipCost ?? 180000))
  const deduct = c.reason === 'انصراف از خرید' && c.method !== 'inperson'
  const okSum = items.reduce((s, it, i) => s + (dec[i] ? it.price * it.qty : 0), 0)
  const allOrder = !!o && items.length === o.shipments.flatMap((s) => s.items).length
  const allOk = dec.every(Boolean); const noneOk = dec.every((x) => !x)
  const quit = c.reason === 'انصراف از خرید'
  const shipBack = allOrder && allOk && !quit ? (o?.shippingFee ?? 0) : 0
  const minus = deduct && !noneOk ? Number(shipCost) || 0 : 0
  const total = Math.max(0, okSum + shipBack - minus)
  const [note, setNote] = useState('')
  const autoNote = noneOk ? 'ایراد اعلام‌شده در بررسی تأیید نشد.' : !allOk ? `${fa(dec.filter(Boolean).length)} کالا تأیید و ${fa(dec.filter((x) => !x).length)} کالا رد شد.` : quit ? 'کالا سالم و کامل بود.' : `${c.reason} تأیید شد.`

  if (c.status === 'return.awaiting_customer' || c.status === 'return.awaiting_pickup') {
    const inperson = c.status === 'return.awaiting_pickup'
    const late = new Date(c.deadline).getTime() < Date.now()
    return <div className="space-y-4">
      <Info>{inperson ? `مشتری باید کالا را با جعبه، همهٔ متعلقات و کد ${id} تا ${fday(c.deadline)} در ساعات کاری به ${c.branch ?? 'شعبهٔ غنیمت'} تحویل دهد. وقتی آورد، رسید دریافت را همین‌جا ثبت کنید.` : `مشتری باید کالا را با جعبه و همهٔ متعلقات بسته‌بندی کند، کد ${id} را روی بسته بنویسد و تا ${fday(c.deadline)} با ${c.method === 'courier' ? 'پیک' : 'پست'} (پس‌کرایه) به انبار مرجوعی بفرستد و ارسال را در پنل اعلام کند.`}</Info>
      {inperson ? <ReceiptForm kind="return" c={c} after="return.inspecting" places={[c.branch ?? 'شعبهٔ سعادت‌آباد']} event={(p) => `تحویل حضوری کالا در ${p}؛ بررسی در مرکز کنترل کیفیت آغاز شد.`} sms={`کالای مرجوعی ${id} در شعبه تحویل گرفته شد. نتیجهٔ بررسی حداکثر تا ${fa(ih)} ساعت دیگر اعلام می‌شود.`} />
        : <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="کد رهگیری مرسوله (اختیاری)" help="اگر مشتری تلفنی خبر داد که فرستاده، به جای او اعلام کنید."><Input className="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="کد رهگیری پست یا شمارهٔ سفارش پیک" /></Field>
          <div className="flex items-end"><Button variant="primary" icon={<Truck size={16} />} onClick={() => { act('return', id, (x) => { x.status = 'return.in_transit'; x.declaredAt = now(); if (tracking.trim()) x.tracking = tracking.trim() }, `اعلام ارسال کالا (${c.method === 'courier' ? 'پیک' : 'پست'}${tracking.trim() ? `، کد رهگیری ${tracking.trim()}` : ''}) به درخواست مشتری`, `ارسال کالای مرجوعی ${id} ثبت شد. پس از رسیدن بسته به انبار مرجوعی، بررسی کالا آغاز می‌شود.`); toast('ارسال اعلام شد؛ پرونده در راه انبار است.') }}>اعلام ارسال به جای مشتری</Button></div>
        </div>}
      {late && <Info tone="warning">مهلت ارسال گذشته است و ارسالی اعلام نشده.</Info>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { act('return', id, () => {}, 'یادآوری مهلت ارسال به مشتری', `یادآوری: کالای مرجوعی ${id} را تا ${fday(c.deadline)} ${inperson ? 'به شعبه بیاورید' : 'بفرستید و ارسال را در «سفارش‌های مرجوعی» اعلام کنید'}.`); toast('یادآوری پیامک شد.') }}>یادآوری به مشتری</Button>
        <Button variant={late ? 'danger' : 'secondary'} onClick={async () => { if (await confirm({ title: 'مهلت ارسال تمام شد؟', body: 'درخواست بسته می‌شود و بازگشت وجهی انجام نمی‌شود.', confirm: 'بستن درخواست', danger: true })) act('return', id, (x) => { x.status = 'return.expired' }, 'ارسالی اعلام نشد و کالایی به انبار مرجوعی نرسید.', `ارسال کالای مرجوعی ${id} تا پایان مهلت ثبت نشد و درخواست بسته شد. اگر کالا را پیش از پایان مهلت فرستاده‌اید، تیکت ثبت کنید.`) }}>مهلت ارسال تمام شد</Button>
        <Button variant="ghost" onClick={async () => { if (await confirm({ title: `درخواست مرجوعی ${id} لغو شود؟`, body: 'به درخواست مشتری؛ کالا نزد مشتری می‌ماند و بازگشت وجهی انجام نمی‌شود.', confirm: 'لغو درخواست', danger: true })) act('return', id, (x) => { x.status = 'return.cancelled'; x.cancelledAt = now() }, 'لغو درخواست به درخواست مشتری', `درخواست مرجوعی ${id} به درخواست شما لغو شد. کالا نزد شما می‌ماند.`) }}>لغو به درخواست مشتری</Button>
      </div>
    </div>
  }

  if (c.status === 'return.in_transit')
    return <ReceiptForm kind="return" c={c} after="return.inspecting" places={['انبار مرجوعی تهران', 'انبار مرجوعی مهاباد']} event={(p) => `دریافت در ${p}؛ بررسی در مرکز کنترل کیفیت آغاز شد.`}
      sms={`کالای مرجوعی ${id} به انبار مرجوعی غنیمت رسید و در مرکز کنترل کیفیت در حال بررسی است. نتیجه حداکثر تا ${fa(ih)} ساعت دیگر اعلام می‌شود.`} />

  if (c.status === 'return.inspecting') {
    const submit = async () => {
      const text = note.trim() || autoNote
      const next = noneOk ? 'return.rejected' : !allOk ? 'return.partial' : minus > 0 ? 'return.approved_deducted' : 'return.refunding'
      const needs = !noneOk && total > cap
      mutate((x) => { items.forEach((it, i) => { const u = x.units.find((z) => z.id === it.unitId); if (u) u.status = dec[i] ? (fate.startsWith('بازگشت') ? 'unit.qc' : fate === 'تعمیر' ? 'unit.repair' : 'unit.defective') : 'unit.sold' })
        if (needs) x.approvals.unshift({ id: `AP-${720 + x.approvals.length}`, type: 'بازگشت وجه', title: `بازگشت ${toman(total)} بابت ${id}`, ref: id, amount: total, by: me(), byRole: 'x', status: 'approval.pending', at: now() }) }, { action: 'نتیجهٔ بازرسی مرجوعی', target: id, after: text })
      act('return', id, (x) => { x.checks = checks; x.fate = fate; x.qcNote = text; x.items = items.map((it, i) => ({ ...it, ok: dec[i], why: dec[i] ? undefined : why[i] })); if (deduct) x.returnShipCost = Number(shipCost) || 0
        if (!noneOk) x.refund = { amount: total, dest: refundLabel(c), deduct: minus || undefined }
        x.status = needs ? 'return.approved' : next },
        `${fday(now())} · ${text}`,
        noneOk ? `مرجوعی ${id} رد شد. ${text} کالا تا ۲۴ ساعت آینده دوباره برایتان ارسال می‌شود.` : `مرجوعی ${id} ${allOk ? 'تأیید شد' : 'به‌صورت بخشی تأیید شد'}. مبلغ ${toman(total)} ${minus ? 'پس از کسر هزینهٔ ارسال مرجوعی ' : ''}به ${refundLabel(c)} واریز می‌شود.${!allOk ? ' کالاهای ردشده دوباره برایتان ارسال می‌شوند.' : ''}`)
      toast(needs ? 'نتیجه ثبت شد؛ مبلغ بالای سقف است و به تأیید نفر دوم رفت.' : 'نتیجه ثبت شد و به مشتری اعلام شد.')
    }
    return <div className="space-y-4">
      <Field label="بررسی در مرکز کنترل کیفیت"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{QC_CHECKS.map((k) => <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-13"><input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />{k}</label>)}</div></Field>
      <Field label="نتیجهٔ هر کالا"><ul className="space-y-2">{items.map((it, i) => { const p = d.products.find((x) => x.id === it.productId)
        return <li key={i} className="rounded-md border border-line bg-surface p-3"><div className="flex flex-wrap items-center gap-3"><span className="min-w-0 flex-1 text-13">{p?.title ?? it.productId} · {toman(it.price * it.qty)}</span><Segmented size="sm" value={dec[i] ? 'ok' : 'no'} onChange={(v) => setDec(dec.map((x, j) => (j === i ? v === 'ok' : x)))} options={[['ok', 'تأیید'], ['no', 'رد']]} /></div>
          {!dec[i] && <Input className="mt-2" value={why[i]} onChange={(e) => setWhy(why.map((x, j) => (j === i ? e.target.value : x)))} aria-label="دلیل رد این کالا برای مشتری" />}</li> })}</ul></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="سرنوشت واحدهای تأییدشده"><Select value={fate} onChange={setFate} options={['بازگشت به فروش با گرید جدید', 'تعمیر', 'معیوب']} /></Field>
        {deduct && <Field label="کرایهٔ پس‌کرایهٔ برگشت (تومان)" help="انصراف از خرید: هزینهٔ ارسال مرجوعی بر عهدهٔ مشتری است و کسر می‌شود."><Input className="ltr" inputMode="numeric" value={shipCost} onChange={(e) => setShipCost(e.target.value.replace(/\D/g, ''))} /></Field>}
      </div>
      <div className="rounded-md bg-surface p-3 text-13">
        <Row k="بهای کالاهای تأییدشده">{toman(okSum)}</Row>
        {allOrder && <Row k="هزینهٔ ارسال خرید">{shipBack ? toman(shipBack) : quit ? 'برنمی‌گردد (انصراف از خرید)' : 'برنمی‌گردد'}</Row>}
        {!allOrder && <Row k="هزینهٔ ارسال خرید">برنمی‌گردد (بخشی از سفارش)</Row>}
        {minus > 0 && <Row k="کسر هزینهٔ ارسال مرجوعی (پس‌کرایه)">−{toman(minus)}</Row>}
        <Row k="مبلغ قابل بازگشت"><b>{toman(total)}</b> به {refundLabel(c)}</Row>
        {total > cap && <p className="mt-1 text-12 text-warning">بالای {toman(cap)} است و تأیید نفر دوم لازم دارد.</p>}
      </div>
      <Field label="نتیجه برای مشتری" help={`خالی بماند: «${autoNote}»`}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={autoNote} /></Field>
      {Object.values(checks).some((v) => !v) && allOk && <Info tone="warning">برخی موارد بررسی رد شده ولی همهٔ کالاها تأیید شده‌اند؛ مطمئن هستید؟</Info>}
      <Button variant="primary" icon={<ClipboardCheck size={16} />} onClick={submit}>{noneOk ? 'ثبت رد مرجوعی' : allOk ? `ثبت تأیید · ${toman(total)}` : `ثبت تأیید بخشی · ${toman(total)}`}</Button>
    </div>
  }

  if (c.status === 'return.approved') {
    const ap = d.approvals.find((a) => a.ref === id)
    const after = c.items?.some((i) => i.ok === false) ? 'return.partial' : c.refund?.deduct ? 'return.approved_deducted' : 'return.refunding'
    return <div className="space-y-3">
      <Info>مبلغ {toman(c.refund?.amount ?? 0)} بالای سقف بازگشت بدون تأیید دوم است.{ap && ` درخواست ${ap.id} در صف تأییدهاست.`} مشتری «مرجوعی تأیید شد» را می‌بیند.</Info>
      <Button variant="primary" onClick={() => { mutate((x) => { const a = x.approvals.find((y) => y.ref === id); if (a) a.status = 'approval.approved' }, { action: 'تأیید بازگشت وجه', target: id }); act('return', id, (x) => { x.status = after }, 'تأیید مالی برای بازگشت وجه'); toast('تأیید شد؛ آمادهٔ واریز.') }}>ثبت تأیید مالی</Button>
    </div>
  }

  const needRefund = ['return.refunding', 'return.approved_deducted', 'return.partial'].includes(c.status) && !c.refund?.at
  const needReship = (c.status === 'return.rejected' || c.status === 'return.partial') && !c.reship
  if (needRefund || needReship) return <div className="space-y-5">
    {needRefund && <RefundForm kind="return" c={c} amount={c.refund?.amount ?? c.amount} fixedDest={refundLabel(c)} done={c.status === 'return.partial' ? 'return.partial' : 'return.refunded'} />}
    {needReship && <ReshipForm c={c} />}
  </div>

  return <Closed c={c} kind="return" />
}

/** ارسال مجدد کالای ردشده: یک مرسولهٔ تازه داخل همان سفارش (در «سفارش‌های جاری» مشتری دیده می‌شود) */
function ReshipForm({ c }: { c: C }) {
  const d = useDB(); const [m, setM] = useState(SHIP_BACK[0]); const [t, setT] = useState('')
  const items = retItems(c, d.orders).filter((i) => i.ok === false || c.status === 'return.rejected')
  return <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
    <p className="text-13 font-semibold">ارسال مجدد {fa(items.length)} کالای ردشده</p>
    <p className="text-12 text-t2">یک مرسولهٔ تازه در سفارش {c.orderId} ساخته می‌شود و مشتری آن را در «سفارش‌های جاری» می‌بیند. طبق فیگما کالا تا ۲۴ ساعت آینده ارسال می‌شود.</p>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="روش ارسال"><Select value={m} onChange={setM} options={SHIP_BACK.filter((x) => x !== 'تحویل حضوری')} /></Field><Field label="کد رهگیری (در صورت وجود)"><Input className="ltr" value={t} onChange={(e) => setT(e.target.value)} /></Field></div>
    <Button variant="primary" icon={<PackageSearch size={16} />} onClick={() => {
      const shipId = `${c.orderId}-R${(d.orders.find((o) => o.id === c.orderId)?.shipments.length ?? 0) + 1}`
      mutate((x) => { const o = x.orders.find((z) => z.id === c.orderId); if (!o) return; const base = o.shipments[0]
        o.shipments.push({ ...base, id: shipId, method: m, status: 'ship.pending', sla: plusDays(1), items: items.map(({ productId, unitId, qty, price }) => ({ productId, unitId, qty, price })), courier: null, tracking: t.trim(), packPhotos: [], allocReason: `ارسال مجدد کالای ردشدهٔ مرجوعی ${c.id}` } as typeof base)
        o.status = 'order.preparing' }, { action: 'ارسال مجدد کالای ردشدهٔ مرجوعی', target: c.id, after: shipId })
      act('return', c.id, (x) => { x.reship = { method: m, tracking: t.trim() || undefined, at: now(), shipId } }, `${fday(now())} · ارسال مجدد ${fa(items.length)} کالای ردشده با ${m}${t ? ` · کد رهگیری ${t}` : ''} (مرسولهٔ ${shipId})`, `کالای ردشدهٔ مرجوعی ${c.id} تا ۲۴ ساعت آینده دوباره برایتان ارسال می‌شود. کد رهگیری و وضعیت در جزئیات سفارش ${c.orderId} نمایش داده می‌شود.`)
      toast(`مرسولهٔ ${shipId} در سفارش ساخته شد.`) }}>ثبت ارسال مجدد در سفارش</Button>
  </div>
}

// ───────── گارانتی ─────────
function WarrantySummary({ c }: { c: C }) {
  const d = useDB(); const card = d.wcards.find((x) => x.code === c.code); const cs = card && cardState(card)
  const unit = d.units.find((u) => u.id === c.unitId); const rep = d.units.find((u) => u.id === c.replaceUnitId)
  return <div className="grid gap-4 xl:grid-cols-2">
    <Card title="اطلاعات درخواست">
      <div className="space-y-2 text-13">
        <Row k="شمارهٔ درخواست"><span className="ltr font-mono">{c.id}</span></Row>
        <Row k="تاریخ ثبت">{fd(c.createdAt ?? c.events?.[0]?.at)}</Row>
        <Row k="دلیل مشکل">{c.reasonKind ?? '—'}</Row>
        <Row k="شمارهٔ تماس برای پیگیری"><span className="ltr">{c.contact ?? '—'}</span></Row>
        <Row k="مدارک ارسالی">{c.photos?.length ? `${fa(c.photos.length)} فایل` : 'ندارد'}</Row>
      </div>
      <p className="mt-3 rounded-md bg-neutral-bg px-3 py-2 text-13"><span className="text-12 text-t2">شرح مشکل: </span>{c.issue}</p>
      {c.photos && c.photos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{c.photos.map((ph, i) => <img key={i} src={ph} alt="مدرک مشتری" className="size-16 rounded-lg object-cover" />)}</div>}
    </Card>
    <Card title="کالا و گارانتی">
      <div className="space-y-2 text-13">
        <Row k="کد گارانتی"><span className="ltr font-mono">{c.code}</span></Row>
        <Row k="وضعیت کالا">{unit ? `${unit.condition === 'sealed' ? 'آکبند' : 'جعبه‌باز'} · سریال ${unit.serial}` : '—'}</Row>
        <Row k="نوع و مدت">{c.type} · {fa(c.months)} ماه</Row>
        <Row k="مسئول رسیدگی">{c.owner}</Row>
        {cs && <Row k="اعتبار">{cs.status === 'active' ? `فعال تا ${fday(cs.end.toISOString())} (${fa(Math.max(0, cs.daysLeft))} روز مانده)` : cs.status === 'expired' ? 'منقضی‌شده' : 'نامعتبر'}</Row>}
      </div>
      <p className="mt-3 text-12"><b className="text-success">تحت پوشش:</b> {COVERED.join('، ')}</p>
      <p className="mt-1 text-12"><b className="text-danger">خارج از پوشش:</b> {EXCLUDED.join('، ')}</p>
      {card?.notes.map((n) => <p key={n} className="mt-1 text-12 text-t2">تبصره: {n}</p>)}
    </Card>
    {(c.shipDeadline || c.declaredAt) && <Card title="ارسال به غنیمت"><div className="space-y-2 text-13">
      {c.shipDeadline && <Row k="مهلت ارسال">تا {fday(c.shipDeadline)}</Row>}
      {c.method && <Row k="روش">{c.method === 'inperson' ? 'تحویل حضوری' : c.method === 'post' ? 'پست پیشتاز · پس‌کرایه' : 'پیک'}</Row>}
      {c.declaredAt && <Row k="اعلام ارسال">{fd(c.declaredAt)}{c.tracking && <> · کد رهگیری <span className="ltr font-mono">{c.tracking}</span></>}</Row>}
      {c.receipt && <Row k="رسید به غنیمت">{fday(c.receipt.at)}</Row>}
    </div></Card>}
    {(c.defect || c.service) && <Card title="نتیجهٔ بررسی کالا"><div className="space-y-2 text-13">
      {c.receipt && <Row k="دریافت کالا در غنیمت">{fday(c.receipt.at)}</Row>}
      {c.defect && <Row k="ایراد تأییدشده">{c.defect}</Row>}
      {c.service && <Row k="نوع خدمت">{c.service}</Row>}
      {c.repairNote && <Row k="کار انجام‌شده">{c.repairNote}</Row>}
      {rep && <Row k="کالای جایگزین">شماره سریال جدید <span className="ltr font-mono">{rep.serial}</span></Row>}
      {c.back && <Row k="ارسال به مشتری">{c.back.method}{c.back.tracking && <> · کد رهگیری <span className="ltr font-mono">{c.back.tracking}</span></>}</Row>}
    </div></Card>}
    {c.rejectReason && <Card title="دلیل رد"><p className="text-13">{c.rejectReason}</p></Card>}
  </div>
}

function WarrantyNext({ c }: { c: C }) {
  const d = useDB(); const id = c.id
  const card = d.wcards.find((x) => x.code === c.code); const cs = card && cardState(card)
  const [excl, setExcl] = useState<Record<string, boolean>>(Object.fromEntries(EXCLUDED.map((k) => [k, false])))
  const [days, setDays] = useState('7')
  const [m, setM] = useState<'inperson' | 'post' | 'courier'>('post'); const [tracking, setTracking] = useState('')
  const [defect, setDefect] = useState(c.defect ?? ''); const [service, setService] = useState<string>(c.service ?? 'تعمیر')
  const [outcome, setOutcome] = useState('done')
  const unit = d.units.find((u) => u.id === c.unitId)
  const price = d.orders.flatMap((o) => o.shipments.flatMap((s) => s.items)).find((i) => i.unitId === c.unitId)?.price ?? unit?.price ?? 0

  if (c.status === 'warranty.pending') return <div className="space-y-3">
    <Info>درخواست در صف بررسی است و مشتری «درخواست شما در صف بررسی غنیمت است» را می‌بیند. با شروع بررسی، وضعیت مشتری به «در حال بررسی» تغییر می‌کند.</Info>
    {cs && cs.status !== 'active' && <Info tone="warning">این گارانتی {cs.status === 'expired' ? 'منقضی شده' : 'نامعتبر است'}.</Info>}
    <Button variant="primary" icon={<PlayCircle size={16} />} onClick={() => act('warranty', id, (x) => { x.status = 'warranty.reviewing' }, 'شروع بررسی توسط واحد گارانتی غنیمت')}>شروع بررسی</Button>
  </div>

  if (c.status === 'warranty.reviewing') {
    const blocked = Object.values(excl).some(Boolean)
    return <div className="space-y-4">
      <Info>مدارک و شرایط پوشش را بررسی کنید. نتیجه با دلیل در صفحهٔ مشتری اعلام می‌شود.</Info>
      <Field label="آیا ایراد خارج از پوشش است؟ (از روی شرح و مدارک)"><div className="grid gap-2 sm:grid-cols-2">{EXCLUDED.map((k) => <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-13"><input type="checkbox" checked={excl[k]} onChange={(e) => setExcl({ ...excl, [k]: e.target.checked })} />{k}</label>)}</div></Field>
      {blocked && <Info tone="warning">موردی خارج از پوشش علامت خورده است؛ معمولاً درخواست با ذکر دلیل رد می‌شود.</Info>}
      <Field label="مهلت ارسال کالا پس از تأیید" help="مشتری روش ارسال (تحویل حضوری، پست پیشتاز پس‌کرایه یا پیک) را خودش انتخاب می‌کند."><Segmented value={days} onChange={setDays} options={[['3', '۳ روز'], ['5', '۵ روز'], ['7', '۷ روز']]} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={cs?.status === 'expired' || cs?.status === 'invalid'} icon={<Check size={16} />} onClick={() => { const dl = plusDays(Number(days)); act('warranty', id, (x) => { x.status = 'warranty.approved'; x.shipDeadline = dl; x.deadline = dl }, 'تأیید درخواست و درخواست ارسال کالا از طرف غنیمت', `درخواست ${id} تأیید شد؛ ایراد اعلام‌شده تحت پوشش گارانتی است. کالا را تا ${fday(dl)} برای غنیمت بفرستید. روش و نشانی در پنل شماست.`); toast('تأیید شد و مهلت ارسال برای مشتری پیامک شد.') }}>تأیید و درخواست ارسال کالا</Button>
        <Button onClick={async () => { const w = await askReason({ kind: 'warranty', ref: id, status: 'نیازمند مدارک بیشتر', title: 'چه مدرک یا توضیحی لازم است؟' }); if (w) act('warranty', id, () => {}, `درخواست مدارک بیشتر: ${w}`, `برای بررسی درخواست ${id} لطفاً ${w} را در پنل ثبت کنید.`) }}>درخواست مدارک بیشتر</Button>
        <Button variant="danger" onClick={async () => { const w = await askReason({ kind: 'warranty', ref: id, status: 'رد درخواست', title: `دلیل رد ${id} (برای مشتری نمایش داده می‌شود)` }); if (w) act('warranty', id, (x) => { x.status = 'warranty.rejected'; x.rejectReason = w }, 'رد درخواست با ذکر دلیل', `درخواست مرجوعی گارانتی ${id} رد شد. دلیل: ${w}`) }}>رد درخواست با ذکر دلیل</Button>
      </div>
    </div>
  }

  if (c.status === 'warranty.approved') {
    const late = !!c.shipDeadline && new Date(c.shipDeadline).getTime() < Date.now()
    return <div className="space-y-4">
      <Info>مشتری باید کالا را تا {fday(c.shipDeadline)} به {SERVICE_CENTER} بفرستد و ارسال را در پنل اعلام کند. اگر تا پایان مهلت ارسال نکند، درخواست بسته می‌شود.</Info>
      <Field label="روش ارسال مشتری (اگر تلفنی اعلام کرد)"><Segmented value={m} onChange={setM} options={[['inperson', 'تحویل حضوری'], ['post', 'پست پیشتاز (پس‌کرایه)'], ['courier', 'پیک']]} /></Field>
      {m === 'inperson' ? <ReceiptForm kind="warranty" c={c} after="warranty.received" places={[SERVICE_CENTER]} event={() => 'دریافت و بررسی کالا در غنیمت'} sms={`کالای درخواست ${id} در ${SERVICE_CENTER} تحویل گرفته شد. نتیجهٔ بررسی و نوع خدمت در پنل اعلام می‌شود.`} extra={(x) => { x.method = 'inperson' }} />
        : <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="کد رهگیری یا نام و شمارهٔ پیک (اختیاری برای پیک)"><Input className="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
          <div className="flex items-end"><Button variant="primary" icon={<Truck size={16} />} disabled={m === 'post' && tracking.trim().length < 6} onClick={() => act('warranty', id, (x) => { x.status = 'warranty.in_transit'; x.method = m; x.declaredAt = now(); if (tracking.trim()) x.tracking = tracking.trim() }, `اعلام ارسال کالا توسط مشتری (${m === 'post' ? 'پست پیشتاز' : 'پیک'})`, `ارسال کالای درخواست ${id} ثبت شد. پس از رسیدن کالا به مرکز خدمات، بررسی آغاز می‌شود.`)}>ثبت ارسال کالا</Button></div></div>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => act('warranty', id, () => {}, 'یادآوری مهلت ارسال به مشتری', `یادآوری: کالای درخواست ${id} را تا ${fday(c.shipDeadline)} برای غنیمت بفرستید.`)}>یادآوری به مشتری</Button>
        <Button variant={late ? 'danger' : 'secondary'} onClick={async () => { if (await confirm({ title: 'مهلت ارسال تمام شد؟', body: 'درخواست بسته می‌شود.', confirm: 'بستن درخواست', danger: true })) act('warranty', id, (x) => { x.status = 'warranty.closed' }, 'ارسال کالا تا پایان مهلت انجام نشد و درخواست بسته شد', `کالای درخواست ${id} تا پایان مهلت ارسال نشد و درخواست بسته شد. در صورت نیاز درخواست جدید ثبت کنید.`) }}>مهلت ارسال تمام شد</Button>
      </div>
    </div>
  }

  if (c.status === 'warranty.in_transit') return <ReceiptForm kind="warranty" c={c} after="warranty.received" places={[SERVICE_CENTER]} event={() => 'دریافت و بررسی کالا در غنیمت'}
    sms={`کالای درخواست ${id} به ${SERVICE_CENTER} رسید و بررسی آن آغاز شد.`} />

  if (c.status === 'warranty.received') return <div className="space-y-4">
    <Field label="ایراد تأییدشده" help="برای مشتری در «نتیجهٔ بررسی کالا» نمایش داده می‌شود."><Input value={defect} onChange={(e) => setDefect(e.target.value)} placeholder="مثلاً قطع و وصل صدای گوشی چپ" /></Field>
    <Field label="نوع خدمت"><Segmented value={service} onChange={setService} options={[['تعمیر', 'تعمیر'], ['تعویض', 'تعویض'], ['بازگشت مبلغ', 'بازگشت مبلغ']]} /></Field>
    {service === 'تعمیر' && <Button variant="primary" icon={<Wrench size={16} />} disabled={defect.trim().length < 4} onClick={() => act('warranty', id, (x) => { x.defect = defect; x.service = 'تعمیر'; x.status = 'warranty.repairing' }, 'شروع تعمیر', `کالای درخواست ${id} در مرکز خدمات غنیمت در حال تعمیر است. ایراد تأییدشده: ${defect}. پس از پایان تعمیر، کالا به نشانی شما ارسال می‌شود.`)}>ثبت نتیجه و شروع تعمیر</Button>}
    {service === 'تعویض' && (defect.trim().length < 4 ? <Info>ابتدا ایراد تأییدشده را بنویسید.</Info> : <ReplaceForm c={c} first={`تصمیم به تعویض (ایراد تأییدشده: ${defect})`} extra={(x) => { x.defect = defect; x.service = 'تعویض' }} />)}
    {service === 'بازگشت مبلغ' && (defect.trim().length < 4 ? <Info>ابتدا ایراد تأییدشده را بنویسید.</Info> : <RefundForm kind="warranty" c={c} amount={price} done="warranty.refunded" pre={`تصمیم به بازگشت مبلغ (ایراد تأییدشده: ${defect})`} extra={(x) => { x.defect = defect; x.service = 'بازگشت مبلغ' }} />)}
  </div>

  if (c.status === 'warranty.repairing') return <div className="space-y-4">
    <Field label="نتیجهٔ تعمیر"><Segmented value={outcome} onChange={setOutcome} options={[['done', 'پایان تعمیر'], ['replace', 'تعمیر ممکن نبود؛ تعویض'], ['refund', 'تعمیر و تعویض ممکن نبود؛ بازگشت مبلغ']]} /></Field>
    {outcome === 'done' && <ShipToCustomer c={c} title="ارسال کالای تعمیرشده به مشتری" note withRepairNote events={(n, mm, t) => [`پایان تعمیر${n ? `: ${n}` : ''}`, `ارسال کالای تعمیرشده (${mm}${t ? ` · کد رهگیری ${t}` : ''})`]} status="warranty.shipping_back" sms={(mm, t) => `تعمیر کالای درخواست ${id} انجام شد و با ${mm} برایتان ارسال شد${t ? `؛ کد رهگیری ${t}` : ''}.`} />}
    {outcome === 'replace' && <ReplaceForm c={c} first="تعمیر ممکن نبود؛ تصمیم به تعویض" extra={(x) => { x.service = 'تعویض' }} />}
    {outcome === 'refund' && <RefundForm kind="warranty" c={c} amount={price} done="warranty.refunded" pre="تعمیر و تعویض ممکن نبود؛ تصمیم به بازگشت مبلغ" extra={(x) => { x.service = 'بازگشت مبلغ' }} />}
  </div>

  if (c.status === 'warranty.replaced' || c.status === 'warranty.shipping_back') {
    const end = cs ? fday(cs.end.toISOString()) : ''
    return <div className="space-y-3">
      <Info>{c.status === 'warranty.replaced' ? 'کالای جایگزین' : 'کالای تعمیرشده'} با {c.back?.method}{c.back?.tracking ? ` (کد رهگیری ${c.back.tracking})` : ''} در راه مشتری است. پس از تحویل، درخواست به «خدمت تکمیل شد» تغییر می‌کند.</Info>
      <Button variant="primary" icon={<Check size={16} />} onClick={() => act('warranty', id, (x) => { x.status = 'warranty.done' }, c.status === 'warranty.replaced' ? 'تحویل کالای جایگزین به مشتری' : 'تحویل کالای تعمیرشده به مشتری', `خدمت گارانتی درخواست ${id} تکمیل شد.${end ? ` گارانتی این کالا تا ${end} همچنان فعال است.` : ''}`)}>ثبت تحویل به مشتری</Button>
    </div>
  }

  return <Closed c={c} kind="warranty" />
}

/** تعویض: انتخاب واحد سالم جایگزین و ارسال آن؛ واحد قبلی به تعمیر می‌رود */
function ReplaceForm({ c, first, extra }: { c: C; first: string; extra?: (x: C) => void }) {
  const d = useDB(); const unit = d.units.find((u) => u.id === c.unitId)
  const spares = d.units.filter((u) => u.productId === unit?.productId && u.id !== c.unitId && ['unit.published', 'unit.ready', 'unit.qc'].includes(u.status))
  const [rep, setRep] = useState(''); const [m, setM] = useState(SHIP_BACK[0]); const [t, setT] = useState('')
  const r = d.units.find((u) => u.id === rep)
  return <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
    <Field label="کالای جایگزین" help={spares.length ? 'واحدهای آماده از همین مدل' : 'از این مدل واحد آماده‌ای نیست؛ بازگشت مبلغ را انتخاب کنید.'}><Select value={rep} onChange={setRep} options={spares.map((u) => [u.id, `${u.serial} · گرید ${g(u.grade)}${u.shelf ? ` · ${u.shelf}` : ''}`] as [string, string])} /></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="روش ارسال"><Select value={m} onChange={setM} options={SHIP_BACK} /></Field>{m !== 'تحویل حضوری' && <Field label="کد رهگیری"><Input className="ltr" value={t} onChange={(e) => setT(e.target.value)} /></Field>}</div>
    <Button variant="primary" disabled={!rep || (m !== 'تحویل حضوری' && t.trim().length < 3)} onClick={() => {
      mutate((x) => { const n = x.units.find((u) => u.id === rep); if (n) n.status = 'unit.sold'; const o = x.units.find((u) => u.id === c.unitId); if (o) o.status = 'unit.repair'
        const card = x.wcards.find((w) => w.code === c.code); if (card) card.unitId = rep }, { action: 'تعویض واحد گارانتی', target: c.id, after: rep })
      act('warranty', c.id, (x) => { extra?.(x); x.replaceUnitId = rep; x.newSerial = r?.serial; x.status = 'warranty.replaced'; x.back = { method: m, tracking: t.trim() || undefined, at: now() } }, [first, `ارسال کالای جایگزین (${m}${t ? ` · کد رهگیری ${t}` : ''})`],
        `کالای درخواست ${c.id} تعویض شد و کالای جایگزین با شماره سریال ${r?.serial} با ${m} برایتان ارسال شد${t ? `؛ کد رهگیری ${t}` : ''}.`)
      toast('تعویض ثبت شد؛ کارت گارانتی به سریال جدید منتقل شد.') }}>ثبت تعویض و ارسال کالای جایگزین</Button>
  </div>
}

function ShipToCustomer({ c, title, withRepairNote, events, status, sms }: { c: C; title: string; note?: boolean; withRepairNote?: boolean; events: (note: string, m: string, t: string) => string[]; status: string; sms: (m: string, t: string) => string }) {
  const [n, setN] = useState(''); const [m, setM] = useState(SHIP_BACK[0]); const [t, setT] = useState('')
  const need = m !== 'تحویل حضوری'
  return <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
    <p className="text-13 font-semibold">{title}</p>
    {withRepairNote && <Field label="کار انجام‌شده"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="مثلاً درایور گوشی چپ تعویض شد" /></Field>}
    <div className="grid gap-3 sm:grid-cols-2"><Field label="روش ارسال"><Select value={m} onChange={setM} options={SHIP_BACK} /></Field>{need && <Field label="کد رهگیری"><Input className="ltr" value={t} onChange={(e) => setT(e.target.value)} /></Field>}</div>
    <Button variant="primary" icon={<PackageSearch size={16} />} disabled={(withRepairNote && n.trim().length < 3) || (need && t.trim().length < 3)} onClick={() => { act('warranty', c.id, (x) => { if (withRepairNote) x.repairNote = n; x.status = status; x.back = { method: m, tracking: t.trim() || undefined, at: now() } }, events(n, m, t.trim()), sms(m, t.trim())); toast('ثبت شد و مشتری خبردار شد.') }}>ثبت و پیامک به مشتری</Button>
  </div>
}

// ───────── فرم‌های مشترک ─────────
function ReceiptForm({ kind, c, after, places, event, sms, extra }: { kind: Kind; c: C; after: string; places: string[]; event: (place: string) => string; sms: string; extra?: (x: C) => void }) {
  const d = useDB(); const units = kind === 'return' ? retItems(c, d.orders).map((i) => d.units.find((u) => u.id === i.unitId)).filter(Boolean) : [d.units.find((u) => u.id === c.unitId)].filter(Boolean)
  const unit = units[0]
  const [place, setPlace] = useState(places[0]); const [serial, setSerial] = useState(''); const [seal, setSeal] = useState(true); const [acc, setAcc] = useState(true)
  const [photos, setPhotos] = useState<string[]>([]); const [txt, setTxt] = useState('')
  const match = !unit || units.some((u) => u!.serial.toUpperCase() === serial.trim().toUpperCase())
  const save = async () => {
    if (unit && !match && !(await confirm({ title: 'سریال مطابقت ندارد', body: `سریال دریافتی (${serial}) با واحد ارسالی (${unit.serial}) یکی نیست. رسید با «عدم تطابق» ثبت شود؟`, confirm: 'ثبت با عدم تطابق', danger: true }))) return
    const r: CaseReceipt = { at: now(), by: me(), serial: serial.trim(), serialOk: match, sealOk: seal, accOk: acc, photos, note: [place, txt].filter(Boolean).join(' · ') }
    act(kind, c.id, (x) => { extra?.(x); x.receipt = r; x.status = after }, event(place), sms)
    if (kind === 'return') mutate((x) => { units.forEach((u) => { const z = x.units.find((y) => y.id === u!.id); if (z) z.status = 'unit.returned' }) }, { action: 'دریافت واحد مرجوعی', target: c.id })
    toast('رسید ثبت شد و برای مشتری پیامک شد.')
  }
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      {places.length > 1 ? <Field label="محل دریافت"><Select value={place} onChange={setPlace} options={places} /></Field> : <Field label="محل دریافت"><Input value={place} disabled /></Field>}
      <Field label="سریال کالای دریافتی" help={unit ? `سریال واحد ارسالی: ${units.map((u) => u!.serial).join('، ')}` : 'کالای تعدادی؛ سریال اختیاری است.'} error={unit && serial && !match ? 'با واحد ارسالی مطابقت ندارد' : undefined}><Input className="ltr" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="اسکن یا تایپ سریال" /></Field>
    </div>
    <div className="flex flex-wrap gap-4"><Toggle on={seal} onChange={setSeal} text="پلمب و بسته‌بندی سالم" /><Toggle on={acc} onChange={setAcc} text="متعلقات کامل" /></div>
    <Field label="توضیح دریافت"><Input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="مثلاً جعبه کمی آسیب دیده" /></Field>
    <Field label="عکس کالا هنگام دریافت" help="دست‌کم یک عکس؛ برای مقایسه با عکس‌های پیش از ارسال.">
      <div className="flex flex-wrap gap-2">{photos.map((p, i) => <img key={i} src={p} alt="" className="size-20 rounded-lg object-cover" />)}
        <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-brand/50 bg-surface text-12 text-brand"><span className="grid place-items-center gap-1"><Camera size={18} />عکس</span><input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => { const fs = Array.from(e.target.files ?? []); const imgs = await Promise.all(fs.map((f) => fileToImage(f))); setPhotos((p) => [...p, ...imgs]) }} /></label></div>
    </Field>
    <Button variant="primary" icon={<Inbox size={16} />} disabled={!photos.length || (!!unit && !serial.trim())} onClick={save}>ثبت دریافت کالا</Button>
  </div>
}

/** واریز وجه؛ در مرجوعی مقصد همان است که مشتری هنگام ثبت انتخاب کرده */
function RefundForm({ kind, c, amount, fixedDest, done, pre, extra }: { kind: Kind; c: C; amount: number; fixedDest?: string; done: string; pre?: string; extra?: (x: C) => void }) {
  const [dest, setDest] = useState(fixedDest ?? 'کیف پول غنیمت'); const [ref, setRef] = useState('')
  const wallet = dest.startsWith('کیف پول'); const ok = wallet || ref.trim().length >= 4
  const pay = () => {
    const r = ref.trim() || `${Date.now()}`.slice(-10)
    mutate((x) => { if (wallet) { const cu = x.customers.find((z) => z.id === c.customerId); if (cu) cu.wallet += amount } }, { action: 'بازگشت وجه', target: c.id, after: `${toman(amount)} · ${dest}` })
    act(kind, c.id, (x) => { extra?.(x); x.status = done; x.refund = { ...(x.refund ?? { amount }), amount, dest, ref: r, at: now(), by: me() } },
      [...(pre ? [pre] : []), kind === 'warranty' ? 'واریز مبلغ و بستن درخواست' : `${fday(now())} · ${toman(amount)} به ${dest} واریز شد.`],
      `مبلغ ${toman(amount)} بابت ${kind === 'return' ? 'مرجوعی' : 'درخواست'} ${c.id} ${wallet ? 'به کیف پول غنیمت شما واریز شد و آمادهٔ خرید است' : `به ${dest} واریز شد. شمارهٔ پیگیری بازپرداخت: ${r}`}.`)
    toast('واریز ثبت شد و مشتری خبردار شد.')
  }
  return <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
    <p className="flex items-center gap-1.5 text-13 font-semibold"><CircleDollarSign size={16} />بازگشت وجه</p>
    <div className="text-13"><Row k="مبلغ">{toman(amount)}</Row>{!!c.refund?.deduct && <Row k="کسرشده">{toman(c.refund.deduct)}</Row>}<Row k="مقصد">{fixedDest ?? dest}</Row></div>
    {!fixedDest && <Field label="مقصد واریز"><Segmented value={dest} onChange={setDest} options={[['کیف پول غنیمت', 'کیف پول غنیمت'], ['کارت بانکی به نام مشتری', 'کارت بانکی به نام مشتری']]} /></Field>}
    {fixedDest && <p className="text-12 text-t2">مقصد را مشتری هنگام ثبت درخواست انتخاب کرده است.</p>}
    {!wallet && <Field label="شمارهٔ پیگیری بازپرداخت"><Input className="ltr" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}
    {wallet && <p className="text-12 text-t2">مبلغ فوراً به کیف پول مشتری اضافه می‌شود و آمادهٔ خرید است.</p>}
    <Button variant="primary" icon={<CircleDollarSign size={16} />} disabled={!ok} onClick={pay}>ثبت واریز و خبر دادن به مشتری</Button>
  </div>
}

function Closed({ c, kind }: { c: C; kind: Kind }) {
  return <div className="space-y-1 text-13">
    {c.status === 'return.cancelled' && <p>درخواست {c.cancelledAt ? `در ${fd(c.cancelledAt)} ` : ''}لغو شد. کالا نزد مشتری می‌ماند و بازگشت وجهی انجام نمی‌شود.</p>}
    {c.status === 'return.expired' && <p>ارسال کالا تا پایان مهلت ({fday(c.deadline)}) ثبت نشد و درخواست بسته شد.</p>}
    {c.status === 'warranty.rejected' && <p>دلیل رد: {c.rejectReason ?? 'در سوابق دلیل‌ها'}</p>}
    {c.status === 'warranty.closed' && <p>ارسال کالا تا پایان مهلت انجام نشد و درخواست بسته شد.</p>}
    {c.refund?.at && <Row k="بازگشت وجه">{toman(c.refund.amount)} · {c.refund.dest}{c.refund.ref && <> · شمارهٔ پیگیری <span className="ltr font-mono">{c.refund.ref}</span></>} · {fd(c.refund.at)}</Row>}
    {c.reship && <Row k="ارسال مجدد">{c.reship.method}{c.reship.shipId && ` · مرسولهٔ ${c.reship.shipId}`}{c.reship.tracking && ` · ${c.reship.tracking}`}</Row>}
    {kind === 'warranty' && c.service && <Row k="خلاصهٔ خدمت">{c.service}{c.defect && ` · ایراد برطرف‌شده: ${c.defect}`}{c.repairNote && ` · ${c.repairNote}`}</Row>}
    {c.back && <Row k="ارسال به مشتری">{c.back.method}{c.back.tracking && <> · <span className="ltr font-mono">{c.back.tracking}</span></>}</Row>}
  </div>
}

function Evidence({ c, orderId }: { c: C; orderId?: string }) {
  const d = useDB(); const o = d.orders.find((x) => x.id === orderId); const sh = o?.shipments.find((x) => x.items.some((i) => i.unitId === c.unitId)) ?? o?.shipments[0]
  const r = c.receipt
  return <Card title="مقایسهٔ ارسال و دریافت">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-line p-3"><p className="mb-2 text-12 font-semibold">پیش از ارسال به مشتری</p>{o && sh ? <PackPhotos orderId={o.id} shipId={sh.id} readOnly big /> : <p className="text-12 text-t2">مرسوله پیدا نشد.</p>}</div>
      <div className="rounded-md border border-purple/40 p-3"><p className="mb-2 flex items-center gap-1.5 text-12 font-semibold"><ClipboardCheck size={14} />رسید دریافت</p>
        {r ? <div className="space-y-1 text-12">
          <p className={r.serialOk ? 'text-success' : 'text-danger'}>سریال {r.serial ? <span className="ltr font-mono">{r.serial}</span> : '—'} · {r.serialOk ? 'مطابق' : 'نامطابق'}</p>
          <p>پلمب {r.sealOk ? 'سالم' : 'باز'} · متعلقات {r.accOk ? 'کامل' : 'ناقص'}</p>{r.note && <p className="text-t2">«{r.note}»</p>}<p className="text-t3">{r.by} · {fd(r.at)}</p>
          {r.photos.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{r.photos.map((p, i) => <img key={i} src={p} alt="" className="size-16 rounded-md object-cover" />)}</div>}
        </div> : <p className="text-12 text-t2">کالا هنوز دریافت نشده است.</p>}
      </div>
    </div>
  </Card>
}

function MessageModal({ open, onClose, kind, c }: { open: boolean; onClose: () => void; kind: Kind; c: C }) {
  const T = [`درخواست ${c.id} در حال بررسی است و نتیجه را در پنل شما اعلام می‌کنیم.`, `برای ادامهٔ بررسی ${c.id} لطفاً با پشتیبانی غنیمت تماس بگیرید.`, `برای ${c.id} یک عکس واضح از سریال و ایراد کالا در پنل ثبت کنید.`, `بررسی ${c.id} کمی بیشتر طول می‌کشد؛ پوزش می‌خواهیم و پیگیری می‌کنیم.`]
  const [t, setT] = useState(T[0])
  return <Modal open={open} onClose={onClose} title="پیام به مشتری" footer={<><Button variant="primary" disabled={t.trim().length < 5} onClick={() => { act(kind, c.id, () => {}, `پیام به مشتری: ${t}`, t); onClose(); toast('پیامک ارسال شد.') }}>ارسال پیامک</Button><Button onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3"><div className="flex flex-wrap gap-1.5">{T.map((x) => <button key={x} type="button" onClick={() => setT(x)} className="rounded-full border border-line px-3 py-1 text-12 hover:border-brand/50">{x.slice(0, 32)}…</button>)}</div>
      <Textarea rows={4} value={t} onChange={(e) => setT(e.target.value)} /><p className="text-12 text-t2">با پیشوند «غنیمت:» ارسال و در تاریخچهٔ پرونده ثبت می‌شود.</p></div>
  </Modal>
}

