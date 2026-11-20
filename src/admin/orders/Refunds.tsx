// بازگشت وجه، یک پرونده برای هر بازگشت: ثبت ← تأیید ← ارسال به بانک ← واریز شد (با شمارهٔ پیگیری)، یا ناموفق ← تلاش دوباره یا تغییر مقصد.
// از لغو سفارش یا قلم، لغو مرسوله، ویرایش سفارش، تصمیم کمبود و بازگشت دستی ساخته می‌شود؛ پس از واریز، سفارش به‌روز می‌شود.
import { useState } from 'react'
import { Banknote, CheckCircle2, Clock, Copy, Phone, RotateCcw, Send, Wallet, XCircle } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented } from '@/shared/ui/base'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { DataTable } from '@/shared/ui/table'
import { currentUser, getDB, isChief, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB, Refund } from '@/shared/data/seed'
import { useSearchParams } from 'react-router-dom'

export const DESTS = ['کیف پول', 'کارت به کارت', 'شبا (پایا)', 'بازگشت به حساب مبدأ'] as const
const VIA_OF: Record<string, string> = { 'کارت به کارت': 'کارت به کارت', 'شبا (پایا)': 'پایا (شبا)', 'کارت بانکی': 'پایا (شبا)', 'بازگشت به حساب مبدأ': 'برگشت از درگاه', 'همان روش پرداخت': 'برگشت از درگاه' }
const STEPS: [Refund['status'], string][] = [['requested', 'ثبت درخواست'], ['approved', 'تأیید'], ['sent', 'ارسال به بانک'], ['done', 'واریز شد']]
const W_STEPS: [Refund['status'], string][] = [['requested', 'ثبت درخواست'], ['approved', 'تأیید'], ['done', 'واریز به کیف پول']]
export const REFUND_LABEL: Record<Refund['status'], [string, 'neutral' | 'info' | 'warning' | 'success' | 'danger']> = { requested: ['منتظر تأیید', 'warning'], approved: ['تأییدشده؛ منتظر اعمال', 'info'], sent: ['در صف بانک', 'info'], done: ['واریز شد', 'success'], failed: ['ناموفق', 'danger'] }
const SLA_H = 72
const who = () => currentUser()?.name ?? 'کاربر'
const now = () => new Date().toISOString()

/** ساخت پروندهٔ بازگشت وجه داخل یک mutate؛ کیف پول فوری انجام می‌شود */
export function createRefund(x: DB, r: { orderId: string; customerId: string; amount: number; source: string; dest: string; note?: string; account?: string }) {
  if (!r.amount || r.amount <= 0) return
  x.refunds ??= []
  // هیچ بازگشتی خودکار تأیید یا اجرا نمی‌شود؛ پرونده باز می‌ماند تا خودمان تأیید و اعمال کنیم
  const id = `RF-${String(1000 + x.refunds.length + 1)}`; const at = now(); const by = who()
  const rf: Refund = { id, ...r, at, by, status: 'requested', log: [{ at, by, step: 'ثبت درخواست', note: `${r.source} · مقصد: ${r.dest}${r.account ? ` · ${r.account}` : ''}` }] }
  x.refunds.unshift(rf); syncOrder(x, r.orderId)
}
/** جمع بازگشت‌های انجام‌شده و در جریان روی خود سفارش، و هماهنگی خلاصهٔ لغو */
function syncOrder(x: DB, oid: string) {
  const o = x.orders.find((q) => q.id === oid); if (!o) return
  const R = (x.refunds ?? []).filter((q) => q.orderId === oid)
  o.refunded = R.filter((q) => q.status === 'done').reduce((a, q) => a + q.amount, 0)
  o.refundPending = R.filter((q) => !['done'].includes(q.status)).reduce((a, q) => a + q.amount, 0)
  if (o.cancelInfo) { const last = R.find((q) => /لغو/.test(q.source)); if (last) { o.cancelInfo.refund = last.status === 'done' ? 'بازگشت داده شد' : last.status === 'failed' ? 'ناموفق' : 'در جریان'; if (last.ref) o.cancelInfo.ref = last.ref; if (last.doneAt) o.cancelInfo.refundAt = last.doneAt } }
}
function step(id: string, fn: (r: Refund) => void, label: string, note?: string, sms?: (r: Refund) => string) {
  mutate((x) => { const r = x.refunds.find((q) => q.id === id)!; fn(r); r.log.push({ at: now(), by: who(), step: label, note }); syncOrder(x, r.orderId) }, { action: `بازگشت وجه: ${label}`, target: getDB().refunds.find((q) => q.id === id)?.orderId ?? id, after: `${id}${note ? ` · ${note}` : ''}` })
  const r = getDB().refunds.find((q) => q.id === id)!; const c = getDB().customers.find((q) => q.id === r.customerId)
  if (sms && c) sendSms(c.mobile, `غنیمت: ${sms(r)}`, 'بازگشت وجه', r.orderId, c.id)
}

function RefundRow({ r }: { r: Refund }) {
  const [send, setSend] = useState(false); const [done, setDone] = useState(false)
  const [via, setVia] = useState(VIA_OF[r.dest] ?? 'پایا (شبا)'); const [acct, setAcct] = useState(r.account ?? ''); const [ref, setRef] = useState('')
  const FLOW = r.dest === 'کیف پول' ? W_STEPS : STEPS
  const idx = r.status === 'failed' ? 2 : FLOW.findIndex(([s]) => s === r.status)
  const late = !['done'].includes(r.status) && Date.now() - +new Date(r.at) > SLA_H * 36e5
  const [lab, tone] = REFUND_LABEL[r.status]
  return <li className="rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-center gap-2 text-13"><b className="ltr font-mono text-12">{r.id}</b><b>{toman(r.amount)}</b><span className="text-t2">به {r.dest}</span><Badge tone={tone}>{lab}</Badge>{late && <Badge tone="danger" dot={false}>بیش از {fa(SLA_H)} ساعت</Badge>}<span className="mr-auto text-11 text-t3">{r.source} · {rel(r.at)}</span></div>
    <ol className="mt-2 flex items-center gap-1 text-11">{FLOW.map(([s, l], i) => <li key={s} className="flex flex-1 items-center gap-1"><span className={cx('grid size-5 shrink-0 place-items-center rounded-full text-[10px]', i < idx || r.status === 'done' ? 'bg-success-solid text-white' : i === idx ? (r.status === 'failed' ? 'bg-danger-solid text-white' : 'bg-brand-solid text-white') : 'bg-neutral-bg text-t3')}>{i < idx || r.status === 'done' ? '✓' : fa(i + 1)}</span><span className={cx('truncate', i === idx ? 'font-semibold' : 'text-t3')}>{i === idx && r.status === 'failed' ? 'ناموفق' : l}</span>{i < FLOW.length - 1 && <span className="h-px flex-1 bg-line" />}</li>)}</ol>
    {(r.ref || r.via || r.account || r.failWhy) && <p className="mt-1.5 text-11 text-t2">{r.via && `روش: ${r.via}`}{r.account && <> · مقصد: <bdi dir="ltr" className="font-mono">{r.account}</bdi></>}{r.ref && <> · پیگیری: <bdi dir="ltr" className="font-mono">{r.ref}</bdi></>}{r.failWhy && <span className="text-danger"> · علت ناموفق: {r.failWhy}</span>}</p>}
    <div className="mt-2 flex flex-wrap gap-1.5">
      {r.status === 'requested' && <Button size="sm" variant="primary" icon={<CheckCircle2 size={12} />} onClick={() => { const cap = Number(getDB().rules.find((q) => q.key === 'refund_cap')?.value ?? 20000000); if (r.amount > cap && !isChief()) return toast(`مبلغ از سقف ${toman(cap)} بیشتر است و فقط مدیر کل تأیید می‌کند.`, { tone: 'err' }); step(r.id, (q) => { q.status = 'approved' }, 'تأیید', r.amount > cap ? 'تأیید دوم مدیر کل' : undefined) }}>تأیید</Button>}
      {(r.status === 'approved' || r.status === 'failed') && r.dest !== 'کیف پول' && <Button size="sm" variant="primary" icon={<Send size={12} />} onClick={() => setSend(true)}>{r.status === 'failed' ? 'ارسال دوباره به بانک' : 'ارسال به بانک'}</Button>}
      {r.status === 'approved' && r.dest === 'کیف پول' && <Button size="sm" variant="primary" icon={<Wallet size={12} />} onClick={async () => { if (!(await confirm({ title: `واریز ${toman(r.amount)} به کیف پول مشتری؟`, body: 'مبلغ همین حالا در کیف پول مشتری قابل خرید می‌شود.', confirm: 'اعمال در کیف پول' }))) return; mutate((x) => { const c = x.customers.find((q) => q.id === r.customerId); if (c) c.wallet += r.amount; x.journey.walletTx.unshift({ id: `WT-${600 + x.journey.walletTx.length}`, customerId: r.customerId, type: 'بازگشت وجه', amount: r.amount, at: now(), ref: r.orderId, status: 'انجام شد', note: r.source }) }, { action: 'واریز بازگشت وجه به کیف پول', target: r.orderId }); step(r.id, (q) => { q.status = 'done'; q.doneAt = now(); q.ref = q.id }, 'واریز شد', 'به کیف پول مشتری', (q) => `${toman(q.amount)} بابت سفارش ${q.orderId} به کیف پول شما واریز شد.`) }}>اعمال در کیف پول</Button>}
      {r.status === 'sent' && <Button size="sm" variant="primary" icon={<Banknote size={12} />} onClick={() => setDone(true)}>ثبت واریز</Button>}
      {r.status === 'sent' && <Button size="sm" variant="ghost" icon={<XCircle size={12} />} onClick={async () => { const w = await askReason({ kind: 'order', ref: r.orderId, status: 'بازگشت وجه ناموفق', title: 'علت برگشت خوردن واریز' }); if (w) step(r.id, (q) => { q.status = 'failed'; q.failWhy = w }, 'ناموفق', w, (q) => `واریز ${toman(q.amount)} سفارش ${q.orderId} انجام نشد (${w}). برای ثبت شبای درست یا انتقال به کیف پول با پشتیبانی تماس بگیرید.`) }}>ناموفق</Button>}
      {['approved', 'failed', 'requested'].includes(r.status) && r.dest !== 'کیف پول' && <Button size="sm" variant="ghost" icon={<Wallet size={12} />} onClick={async () => { if (!(await confirm({ title: 'انتقال به کیف پول مشتری؟', body: `${toman(r.amount)} همین حالا به کیف پول مشتری واریز می‌شود.`, confirm: 'واریز به کیف پول' }))) return; step(r.id, (q) => { q.dest = 'کیف پول'; q.status = 'done'; q.doneAt = now(); q.ref = q.id }, 'واریز شد', 'تغییر مقصد به کیف پول', (q) => `${toman(q.amount)} بابت سفارش ${q.orderId} به کیف پول شما واریز شد.`); mutate((x) => { const c = x.customers.find((q) => q.id === r.customerId); if (c) c.wallet += r.amount }, { action: 'واریز بازگشت وجه به کیف پول', target: r.orderId }) }}>واریز به کیف پول</Button>}
    </div>
    <details className="mt-1.5 text-11 text-t2"><summary className="cursor-pointer">سابقهٔ مراحل ({fa(r.log.length)})</summary><ul className="mt-1 space-y-0.5 pr-3">{r.log.map((l, i) => <li key={i}>{new Date(l.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })} · <b>{l.step}</b> · {l.by}{l.note ? ` · ${l.note}` : ''}</li>)}</ul></details>
    <Modal open={send} onClose={() => setSend(false)} title={`ارسال ${toman(r.amount)} به بانک`} footer={<><Button variant="primary" disabled={acct.replace(/\s/g, '').length < 16} onClick={() => { step(r.id, (q) => { q.status = 'sent'; q.via = via; q.account = acct.trim(); q.sentAt = now(); q.failWhy = undefined }, 'ارسال به بانک', `${via} · ${acct.trim()}`, (q) => `بازگشت ${toman(q.amount)} سفارش ${q.orderId} با ${via} ارسال شد و حداکثر تا ۷۲ ساعت کاری به حساب شما می‌نشیند.`); setSend(false); toast('در صف بانک ثبت شد؛ پس از واریز، شمارهٔ پیگیری را ثبت کنید.') }}>ثبت ارسال</Button><Button variant="ghost" onClick={() => setSend(false)}>انصراف</Button></>}>
      <div className="space-y-3"><Field label="روش"><Segmented size="sm" value={via} onChange={setVia} options={['پایا (شبا)', 'ساتنا', 'کارت به کارت', 'برگشت از درگاه'].map((x) => [x, x] as [string, string])} /></Field>
        <Field label={via === 'کارت به کارت' ? 'شمارهٔ کارت مقصد' : via === 'برگشت از درگاه' ? 'کارت پرداخت‌کننده (از اطلاعات بانک)' : 'شمارهٔ شبای مقصد'}><Input className="ltr" value={acct} onChange={(e) => setAcct(e.target.value)} placeholder={via === 'کارت به کارت' ? '6037-99xx-xxxx-1234' : 'IR00 0000 0000 0000 0000 0000 00'} /></Field>
        <p className="text-11 text-t2">شبا یا کارت باید به نام خود مشتری باشد (استعلام مالکیت در «درخواست‌های مشتری › کارت و شبا»).</p></div>
    </Modal>
    <Modal open={done} onClose={() => setDone(false)} title="ثبت واریز" footer={<><Button variant="primary" disabled={ref.trim().length < 4} onClick={() => { step(r.id, (q) => { q.status = 'done'; q.ref = ref.trim(); q.doneAt = now() }, 'واریز شد', `پیگیری ${ref.trim()}`, (q) => `${toman(q.amount)} بابت سفارش ${q.orderId} به حساب شما واریز شد. شمارهٔ پیگیری: ${ref.trim()}`); setDone(false); toast('واریز ثبت شد؛ سفارش و پیامک مشتری به‌روز شد.') }}>ثبت و پیامک به مشتری</Button><Button variant="ghost" onClick={() => setDone(false)}>انصراف</Button></>}>
      <Field label="شمارهٔ پیگیری بانک"><Input className="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثلاً 140508231245" /></Field>
    </Modal>
  </li>
}

/** انتخاب مقصد بازگشت وجه در پنجره‌های لغو و ویرایش */
export function RefundDest({ dest, setDest, account, setAccount, amount, customer }: { dest: string; setDest: (v: string) => void; account: string; setAccount: (v: string) => void; amount: number; customer?: { name: string; mobile: string } }) {
  return <div className="space-y-2 rounded-xl border border-line p-3">
    {customer && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-3 py-2 text-12"><span className="text-t2">مشتری:</span><b>{customer.name}</b><bdi dir="ltr" className="font-mono">{customer.mobile}</bdi><Button size="sm" variant="ghost" icon={<Phone size={12} />} onClick={() => { window.location.href = `tel:${customer.mobile}` }}>تماس</Button><Button size="sm" variant="ghost" icon={<Copy size={12} />} onClick={() => { void navigator.clipboard?.writeText(customer.mobile); toast('شماره کپی شد.') }}>کپی</Button><span className="basis-full text-11 text-t3">اگر همین حالا کارت یا شبا را تلفنی گرفتید، «کارت به کارت» یا «شبا» را بزنید و همین‌جا وارد کنید.</span></div>}
    <Field label={`بازگشت ${toman(amount)} به`}><Segmented size="sm" value={dest} onChange={setDest} options={DESTS.map((x) => [x, x] as [string, string])} /></Field>
    {(dest === 'کارت به کارت' || dest === 'شبا (پایا)') && <Field label={dest === 'کارت به کارت' ? 'شمارهٔ کارت مشتری (اختیاری؛ در مرحلهٔ ارسال هم ثبت می‌شود)' : 'شمارهٔ شبای مشتری (اختیاری)'}><Input className="ltr" value={account} onChange={(e) => setAccount(e.target.value)} placeholder={dest === 'کارت به کارت' ? '6037-99xx-xxxx-1234' : 'IR00 0000 0000 0000 0000 0000 00'} /></Field>}
    <p className="text-11 text-t2">{dest === 'کیف پول' ? 'پس از تأیید، با دکمهٔ «اعمال در کیف پول» واریز می‌شود.' : dest === 'بازگشت به حساب مبدأ' ? 'به همان کارتی که با آن پرداخت شده (از طریق درگاه) برمی‌گردد.' : 'پس از تأیید، به بانک ارسال و با شمارهٔ پیگیری ثبت می‌شود.'} بازگشت وجه خودکار انجام نمی‌شود و تا اعمال شما در کارت «بازگشت وجه» باز می‌ماند.</p>
  </div>
}

/** پنل بازگشت وجه در صفحهٔ سفارش */
export function RefundPanel({ orderId }: { orderId: string }) {
  const d = useDB(); const R = (d.refunds ?? []).filter((r) => r.orderId === orderId)
  if (!R.length) return null
  const doneSum = R.filter((r) => r.status === 'done').reduce((a, r) => a + r.amount, 0); const open = R.filter((r) => r.status !== 'done')
  return <div id="order-refunds" className="scroll-mt-24"><Card className={open.length ? 'border-warning/50' : ''} title={<span className="flex items-center gap-2"><RotateCcw size={16} />بازگشت وجه</span>} actions={<span className="flex gap-1.5">{doneSum > 0 && <Badge tone="success" dot={false}>واریزشده {toman(doneSum)}</Badge>}{open.length > 0 && <Badge tone="warning" dot={false}>در جریان {toman(open.reduce((a, r) => a + r.amount, 0))}</Badge>}</span>}>
    <ul className="space-y-2">{R.map((r) => <RefundRow key={r.id} r={r} />)}</ul>
  </Card></div>
}

/** صف همهٔ بازگشت‌های وجه در «مالی» */
export function RefundQueue() {
  const d = useDB(); const [sp] = useSearchParams(); const [f, setF] = useState<'open' | 'all' | Refund['status']>(sp.get('rf') ? 'all' : 'open'); const [sel, setSel] = useState<string | null>(sp.get('rf'))
  const R = d.refunds ?? []; const rows = R.filter((r) => f === 'all' || (f === 'open' ? r.status !== 'done' : r.status === f))
  const late = R.filter((r) => r.status !== 'done' && Date.now() - +new Date(r.at) > SLA_H * 36e5)
  const sum = (s: (r: Refund) => boolean) => R.filter(s).reduce((a, r) => a + r.amount, 0)
  const cur = R.find((r) => r.id === sel)
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{([['منتظر تأیید', (r: Refund) => r.status === 'requested', 'warning'], ['منتظر ارسال یا ناموفق', (r: Refund) => ['approved', 'failed'].includes(r.status), 'danger'], ['در صف بانک', (r: Refund) => r.status === 'sent', 'info'], ['واریزشده', (r: Refund) => r.status === 'done', 'success']] as const).map(([l, fn, t]) => <Card key={l}><p className="text-12 text-t2">{l}</p><p className="mt-1 text-20 font-bold tnum">{toman(sum(fn))}</p><p className={cx('text-11', t === 'danger' ? 'text-danger' : 'text-t3')}>{fa(R.filter(fn).length)} پرونده</p></Card>)}</div>
    {late.length > 0 && <p className="flex items-center gap-1.5 rounded-xl bg-danger-bg px-3 py-2 text-12 text-danger"><Clock size={14} />{fa(late.length)} بازگشت وجه بیش از {fa(SLA_H)} ساعت باز مانده است.</p>}
    <Segmented size="sm" value={f} onChange={setF} options={[['open', 'باز'], ['requested', 'منتظر تأیید'], ['approved', 'منتظر ارسال'], ['sent', 'در صف بانک'], ['failed', 'ناموفق'], ['done', 'واریزشده'], ['all', 'همه']]} />
    <DataTable name="بازگشت وجه" rows={rows} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} search={(r) => `${r.id} ${r.orderId} ${r.source} ${r.ref ?? ''}`} empty={{ title: 'بازگشت وجهی در این وضعیت نیست.' }}
      cols={[{ key: 'id', title: 'پرونده', render: (r) => <span className="ltr font-mono text-12">{r.id}</span> }, { key: 'o', title: 'سفارش', render: (r) => <span className="ltr font-mono text-12">{r.orderId}</span> }, { key: 'c', title: 'مشتری', render: (r) => d.customers.find((c) => c.id === r.customerId)?.name ?? '—' }, { key: 'src', title: 'منشأ', render: (r) => r.source }, { key: 'a', title: 'مبلغ', render: (r) => toman(r.amount), sort: (r) => r.amount }, { key: 'dest', title: 'مقصد', render: (r) => r.dest }, { key: 's', title: 'وضعیت', render: (r) => <Badge tone={REFUND_LABEL[r.status][1]}>{REFUND_LABEL[r.status][0]}</Badge> }, { key: 'at', title: 'ثبت', render: (r) => <span className={Date.now() - +new Date(r.at) > SLA_H * 36e5 && r.status !== 'done' ? 'font-semibold text-danger' : ''}>{rel(r.at)}</span>, sort: (r) => +new Date(r.at) }]} />
    <Modal open={!!cur} onClose={() => setSel(null)} title={cur ? `بازگشت وجه ${cur.id} · سفارش ${cur.orderId}` : ''} wide>{cur && <ul><RefundRow r={cur} /></ul>}</Modal>
  </div>
}
