import { CreditCard, Lock, LogOut, MailCheck, MonitorSmartphone, ShieldAlert, Trash2, Unlock, UserX } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Row } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { fakeCall, mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import { acctOf } from '@/shared/data/acct'
import type { DB } from '@/shared/data/seed'

type Cust = DB['customers'][number]
const BANK_TONE: Record<string, 'success' | 'danger' | 'warning'> = { 'تأییدشده': 'success', 'شبا به نام کاربر نیست': 'danger', 'کارت به نام کاربر نیست': 'danger', 'کارت و شبا برای یک حساب نیستند': 'danger', 'استعلام انجام نشد': 'warning' }
const ensure = (x: DB, id: string) => { x.acct[id] = x.acct[id] ?? { emailVerified: false, nidLocked: false, devices: [] }; return x.acct[id] }

/** هویت و ایمیل، کارت و شبا با نتیجهٔ استعلام، دستگاه‌های فعال و درخواست حذف حساب */
export function AccountExtras({ c }: { c: Cust }) {
  const d = useDB(); const A = acctOf(d.acct, c.id)
  const banks = (d.entities.bankAccounts ?? []).filter((b) => b.customer === c.name)
  const log = (action: string, after?: string) => ({ action, target: c.name, after })
  const openOrders = d.orders.filter((o) => o.customerId === c.id && !['order.delivered', 'order.cancelled'].includes(o.status))
  const openRet = d.returns.filter((r) => r.customerId === c.id && !/closed|refunded|rejected/.test(r.status))
  return <>
    <Card title={<span className="flex items-center gap-2"><MailCheck size={15} />هویت و ایمیل</span>}>
      <Row k="ایمیل"><span className="flex items-center gap-2"><span className="ltr">{c.email || '—'}</span>{c.email && (A.emailVerified ? <Badge tone="success">تأییدشده</Badge> : <Badge tone="warning">تأییدنشده</Badge>)}</span></Row>
      <Row k="کد ملی"><span className="flex items-center gap-2"><span className="ltr">{c.nid ? `${c.nid.slice(0, 3)}•••${c.nid.slice(-2)}` : '—'}</span>{A.nidLocked ? <Badge tone="neutral"><Lock size={10} className="ml-1 inline" />قفل</Badge> : <Badge tone="info">قابل ویرایش</Badge>}</span></Row>
      <p className="mt-1 text-11 text-t2">بعد از تأیید مالکیت کارت بانکی، کد ملی قفل می‌شود تا با صاحب کارت مغایرت پیدا نکند. مشتری خودش نمی‌تواند آن را تغییر دهد.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.email && !A.emailVerified && <Button size="sm" onClick={() => { mutate(() => {}, log('ارسال دوبارهٔ لینک تأیید ایمیل')); toast('لینک تأیید دوباره به ایمیل مشتری فرستاده شد.') }}>ارسال دوبارهٔ لینک تأیید ایمیل</Button>}
        {A.nidLocked && <Button size="sm" icon={<Unlock size={13} />} onClick={async () => { const why = await askReason({ kind: 'account', ref: c.id, status: 'باز کردن قفل کد ملی', title: 'دلیل باز کردن قفل کد ملی' }); if (!why) return; mutate((x) => { ensure(x, c.id).nidLocked = false }, log('باز کردن قفل کد ملی', why)); toast('قفل کد ملی برداشته شد؛ کارت‌های تأییدشده دوباره استعلام می‌شوند.') }}>باز کردن قفل کد ملی</Button>}
      </div>
    </Card>

    <Card title={<span className="flex items-center gap-2"><CreditCard size={15} />کارت و شبای بازگشت وجه</span>}>
      {banks.length === 0 ? <EmptyState title="کارت یا شبایی ثبت نشده است." desc="بازگشت وجه تا ثبت کارت به کیف پول واریز می‌شود." /> : <ul className="space-y-2">{banks.map((b) => <li key={String(b.id)} className="rounded-xl border border-line p-3 text-12">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="ltr font-mono">{String(b.card)}</span><Badge tone={BANK_TONE[String(b.status)] ?? 'neutral'}>{String(b.status)}</Badge></div>
        {b.iban && <p className="ltr mt-1 text-right font-mono text-t2">{String(b.iban)}</p>}
        <p className="mt-1 text-t2">صاحب حساب طبق استعلام: <b>{String(b.owner)}</b> · {rel(String(b.at))}</p>
        {b.status !== 'تأییدشده' && <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={async () => { try { await fakeCall(true, 600) } catch { return toast('سرویس استعلام بانکی پاسخ نداد؛ کمی بعد دوباره تلاش کنید.', { tone: 'err' }) } const ok = String(b.owner) === c.name; mutate((x) => { const y = x.entities.bankAccounts.find((z) => z.id === b.id)!; y.status = ok ? 'تأییدشده' : String(b.status) === 'استعلام انجام نشد' ? 'کارت به نام کاربر نیست' : String(y.status); y.at = new Date().toISOString(); if (ok) ensure(x, c.id).nidLocked = true }, log('استعلام دوبارهٔ کارت و شبا', String(b.card))); toast(ok ? 'مالکیت تأیید شد.' : 'استعلام انجام شد؛ حساب به نام مشتری نیست.', { tone: ok ? 'ok' : 'err' }) }}>استعلام دوباره</Button>
          <Button size="sm" variant="ghost" onClick={async () => { const why = await askReason({ kind: 'account', ref: c.id, status: 'تأیید دستی کارت', title: 'دلیل تأیید دستی مالکیت کارت' }); if (!why) return; mutate((x) => { x.entities.bankAccounts.find((z) => z.id === b.id)!.status = 'تأییدشده' }, log('تأیید دستی کارت و شبا', why)) }}>تأیید دستی با مدارک</Button>
        </div>}
      </li>)}</ul>}
      <p className="mt-2 text-11 text-t2">خطاهایی که مشتری می‌بیند: کارت به نام کاربر نیست، شبا به نام کاربر نیست، کارت و شبا برای یک حساب نیستند، استعلام انجام نشد.</p>
    </Card>

    <Card title={<span className="flex items-center gap-2"><MonitorSmartphone size={15} />دستگاه‌های فعال</span>} actions={A.devices.length > 1 && <Button size="sm" variant="ghost" icon={<LogOut size={13} />} onClick={async () => { if (!(await confirm({ title: 'خروج از همهٔ دستگاه‌ها به‌جز دستگاه فعلی؟', body: 'مشتری روی بقیهٔ دستگاه‌ها باید دوباره وارد شود.', confirm: 'خروج' }))) return; mutate((x) => { const a = ensure(x, c.id); a.devices = a.devices.filter((v) => v.current) }, log('خروج مشتری از همهٔ دستگاه‌ها')); toast('مشتری از بقیهٔ دستگاه‌ها خارج شد.') }}>خروج از بقیه</Button>}>
      {A.devices.length === 0 ? <EmptyState title="دستگاه فعالی ثبت نشده است." /> : <ul className="divide-y divide-line">{A.devices.map((v) => { const odd = v.city !== c.city; return <li key={v.id} className="flex items-center gap-3 py-2 text-13">
        <span className="min-w-0 flex-1"><b className="block">{v.name}{v.current && <Badge tone="success" dot={false}>دستگاه فعلی</Badge>}</b><span className="text-11 text-t2">{v.os} · {v.city} · {rel(v.at)}</span>{odd && <span className="mt-0.5 flex items-center gap-1 text-11 text-warning"><ShieldAlert size={11} />ورود از شهری غیر از شهر مشتری</span>}</span>
        {!v.current && <Button size="sm" variant="ghost" onClick={() => { mutate((x) => { const a = ensure(x, c.id); a.devices = a.devices.filter((y) => y.id !== v.id) }, log('خروج دستگاه مشتری', v.name)); toast(`${v.name} از حساب خارج شد.`) }}>خروج</Button>}
      </li> })}</ul>}
    </Card>

    <Card title={<span className="flex items-center gap-2"><UserX size={15} />حذف حساب</span>}>
      {!A.deleteReq ? <p className="text-13 text-t2">درخواست حذف حسابی ثبت نشده است.</p> : <>
        <Row k="وضعیت">{A.deleteReq.status === 'pending' ? <Badge tone="warning">در انتظار بررسی</Badge> : A.deleteReq.status === 'done' ? <Badge tone="neutral">حذف شد</Badge> : <Badge tone="danger">ردشده</Badge>}</Row>
        <Row k="دلیل مشتری">{A.deleteReq.reason}</Row><Row k="زمان درخواست">{rel(A.deleteReq.at)}</Row>
        {A.deleteReq.note && <Row k="توضیح غنیمت">{A.deleteReq.note}</Row>}
        {A.deleteReq.status === 'pending' && <>
          <ul className="mt-2 space-y-1 text-12">{([['سفارش باز ندارد', openOrders.length === 0, `${fa(openOrders.length)} سفارش باز`], ['کیف پول تسویه شده', c.wallet === 0, toman(c.wallet)], ['مرجوعی یا گارانتی باز ندارد', openRet.length === 0, `${fa(openRet.length)} مورد باز`]] as [string, boolean, string][]).map(([k, ok, v]) => <li key={k} className={cx(ok ? 'text-success' : 'text-danger')}>{ok ? '✓' : '✗'} {k}{!ok && ` (${v})`}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="danger" icon={<Trash2 size={13} />} disabled={openOrders.length > 0 || c.wallet > 0 || openRet.length > 0} onClick={async () => { if (!(await confirm({ title: `حساب ${c.name} حذف شود؟`, body: 'اطلاعات شخصی ناشناس می‌شود؛ فاکتورها و سوابق مالی طبق قانون نگه داشته می‌شوند.', danger: true, confirm: 'حذف حساب' }))) return; mutate((x) => { const a = ensure(x, c.id); a.deleteReq = { ...a.deleteReq!, status: 'done' }; a.devices = []; x.customers.find((y) => y.id === c.id)!.blocked = true }, log('حذف حساب مشتری به درخواست خودش')); sendSms(c.mobile, 'غنیمت: حساب کاربری شما طبق درخواستتان حذف شد.', 'حذف حساب', c.id, c.id); toast('حساب حذف و اطلاعات شخصی ناشناس شد.') }}>انجام حذف</Button>
            <Button size="sm" onClick={async () => { const why = await askReason({ kind: 'deleteReject', ref: c.id, status: 'رد حذف حساب', title: 'چرا حساب فعلاً حذف نمی‌شود؟' }); if (!why) return; mutate((x) => { const a = ensure(x, c.id); a.deleteReq = { ...a.deleteReq!, status: 'rejected', note: why } }, log('رد درخواست حذف حساب', why)); toast('دلیل برای مشتری نمایش داده می‌شود.') }}>رد با دلیل</Button>
          </div>
          {(openOrders.length > 0 || c.wallet > 0 || openRet.length > 0) && <p className="mt-2 text-11 text-t2">تا وقتی موارد قرمز باز است، حذف ممکن نیست؛ اول کیف پول را تسویه کنید یا با دلیل رد کنید.</p>}
        </>}
      </>}
    </Card>
  </>
}

/** صف درخواست‌های حذف حساب برای فهرست مشتریان */
export function DeletionQueue({ onOpen }: { onOpen: (id: string) => void }) {
  const d = useDB(); const rows = Object.entries(d.acct ?? {}).filter(([, a]) => a.deleteReq).map(([id, a]) => ({ c: d.customers.find((x) => x.id === id), a }))
  if (!rows.length) return <Card><EmptyState title="درخواست حذف حسابی نیست." /></Card>
  return <Card pad={false}><ul className="divide-y divide-line">{rows.map(({ c, a }) => c && <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-13"><b>{c.name}</b><span className="text-t2">{a.deleteReq!.reason}</span><span className="text-11 text-t3">{rel(a.deleteReq!.at)}</span><span className="mr-auto">{a.deleteReq!.status === 'pending' ? <Badge tone="warning">در انتظار بررسی</Badge> : a.deleteReq!.status === 'done' ? <Badge>حذف شد</Badge> : <Badge tone="danger">ردشده</Badge>}</span><Button size="sm" onClick={() => onOpen(c.id)}>بررسی</Button></li>)}</ul></Card>
}
