// اطلاعات پرداخت هر تراکنش، همان چیزی که درگاه یا بانک برمی‌گرداند: کارت پرداخت‌کننده (ماسک‌شده طبق قوانین شاپرک)،
// شمارهٔ مرجع (RRN)، کد پیگیری، شناسهٔ درگاه، ترمینال، وضعیت تأیید (verify)، تلاش‌های ناموفق با کد خطا، و برای اقساطی و کارت به کارت جزئیات خودشان.
// در نسخهٔ نمایشی برای تراکنش‌هایی که این فیلدها را ندارند، مقدار ثابت و قابل تکرار ساخته می‌شود.
import { useState } from 'react'
import { ChevronLeft, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge, Button, CopyId, StatusBadge } from '@/shared/ui/base'
import { Drawer, toast } from '@/shared/ui/overlay'
import { WithLogo } from '@/shared/ui/brandLogo'
import { fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'

type Txn = DB['txns'][number]
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const BINS: [string, string][] = [['603799', 'بانک ملی'], ['610433', 'بانک ملت'], ['589210', 'بانک سپه'], ['627353', 'بانک تجارت'], ['621986', 'بانک سامان'], ['502229', 'بانک پاسارگاد'], ['622106', 'بانک پارسیان'], ['589463', 'بانک رفاه']]
const isBnpl = (g: string) => /اسنپ|ترب|دیجی|تارا|کیپا/.test(g)
const isC2C = (g: string) => /کارت به کارت/.test(g)
const isWallet = (g: string) => /کیف پول/.test(g) && !/\+/.test(g)
const ERR: [string, string][] = [['-51', 'موجودی کافی نیست'], ['-55', 'رمز دوم اشتباه است'], ['-17', 'انصراف کاربر از پرداخت'], ['-9', 'پایان زمان پرداخت در درگاه'], ['-61', 'سقف مبلغ برداشت روزانه']]

/** دادهٔ بانکی هر تراکنش (از خود تراکنش، یا ساختهٔ ثابت برای نمونه) */
export function bankOf(t: Txn) {
  const x = t as Txn & Record<string, any>; const h = hash(t.id); const [bin, bank] = BINS[h % BINS.length]; const last4 = String(1000 + (h % 9000))
  const at = new Date(t.at).getTime()
  const fails = t.status === 'pay.success' && h % 3 === 0 ? [{ at: new Date(at - 4 * 6e4).toISOString(), code: ERR[h % ERR.length][0], msg: ERR[h % ERR.length][1], pan: `${bin.slice(0, 4)}-${bin.slice(4)}**-****-${String(1000 + ((h >>> 3) % 9000))}` }] : t.status === 'pay.failed' ? [{ at: t.at, code: ERR[h % ERR.length][0], msg: ERR[h % ERR.length][1], pan: `${bin.slice(0, 4)}-${bin.slice(4)}**-****-${last4}` }] : []
  return {
    pan: x.pan ?? `${bin.slice(0, 4)}-${bin.slice(4)}**-****-${last4}`, bank: x.bank ?? bank,
    rrn: x.rrn ?? String(100000000000 + (h % 899999999999)).slice(0, 12), trace: x.trace ?? String(100000 + (h % 899999)),
    authority: x.authority ?? `A00000000000000000000000000${String(h).slice(-9)}`.slice(-36), terminal: x.terminal ?? String(10000000 + (h % 89999999)),
    verified: x.verified ?? (t.status === 'pay.success' ? new Date(at + 9000).toISOString() : null), settled: x.settled ?? (t.status === 'pay.success' ? new Date(at + 864e5).toISOString() : null),
    ip: x.ip ?? `5.${h % 250}.${(h >>> 4) % 250}.${(h >>> 8) % 250}`, fee: x.fee, fails: (x.fails as typeof fails | undefined) ?? fails,
    bnpl: isBnpl(t.gateway) ? { creditId: `CR-${String(h).slice(-7)}`, plan: '۴ قسط ماهانه', first: Math.round(t.amount / 4), status: t.status === 'pay.unknown' ? 'در انتظار تأیید اعتبار' : 'اعتبار تأیید و خرید نهایی شد' } : null,
  }
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5 text-12 last:border-0"><span className="text-t3">{k}</span><span className="min-w-0 text-left">{v}</span></div>
const when = (s?: string | null) => (s ? new Date(s).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')

export function PaymentInfo({ orderId }: { orderId: string }) {
  const d = useDB(); const T = d.txns.filter((t) => t.orderId === orderId); const [open, setOpen] = useState<string | null>(null)
  const rc = d.bank.receipts.find((r) => r.orderId === orderId); const cr = rc && d.bank.credits.find((c) => c.matched === orderId || c.ref === rc.ref)
  const t = T.find((x) => x.id === open); const b = t ? bankOf(t) : null
  const inquire = async (tx: Txn) => { toast('در حال استعلام وضعیت از درگاه…'); await fakeCall(true).catch(() => null); const ok = hash(tx.id) % 4 !== 0
    mutate((x) => { const y = x.txns.find((z) => z.id === tx.id)! as Txn & Record<string, any>; y.status = ok ? 'pay.success' : 'pay.failed'; if (ok) y.verified = new Date().toISOString() }, { action: 'استعلام وضعیت تراکنش از درگاه', target: orderId, after: `${tx.id}: ${ok ? 'موفق' : 'ناموفق'}` })
    toast(ok ? 'درگاه پرداخت را تأیید کرد (verify موفق).' : 'درگاه تراکنش را ناموفق اعلام کرد؛ مبلغ حداکثر تا ۷۲ ساعت به کارت مشتری برمی‌گردد.', { tone: ok ? undefined : 'err' }) }
  return <>
    <p className="mt-2 mb-1 text-11 font-medium text-t3">تراکنش‌ها و اطلاعات بانک</p>
    {T.length === 0 && !rc && <p className="text-12 text-t3">تراکنشی ثبت نشده است.</p>}
    {T.map((tx) => { const bb = bankOf(tx); return <button key={tx.id} type="button" onClick={() => setOpen(tx.id)} className="mb-1.5 w-full rounded-lg border border-line px-2.5 py-2 text-right hover:border-brand/50">
      <span className="flex items-center justify-between gap-2 text-12"><WithLogo name={tx.gateway} /><StatusBadge s={tx.status} /></span>
      <span className="mt-1 flex items-center justify-between gap-2 text-11 text-t2"><bdi dir="ltr" className="font-mono">{isWallet(tx.gateway) || isBnpl(tx.gateway) ? (tx.ref || tx.id) : bb.pan}</bdi><span className="flex items-center gap-1"><b className="text-t1">{toman(tx.amount)}</b><ChevronLeft size={12} /></span></span>
      {!isWallet(tx.gateway) && !isBnpl(tx.gateway) && <span className="mt-0.5 block text-11 text-t3">{bb.bank} · مرجع <bdi dir="ltr" className="font-mono">{bb.rrn}</bdi>{bb.fails.length ? ` · ${fa(bb.fails.length)} تلاش ناموفق` : ''}</span>}
    </button> })}
    {rc && <div className="mb-1.5 rounded-lg border border-line px-2.5 py-2 text-12"><p className="flex items-center justify-between"><b>کارت به کارت</b><Badge tone={rc.status === 'تطبیق شد' ? 'success' : 'warning'} dot={false}>{rc.status}</Badge></p>
      <p className="mt-1 text-11 text-t2">کارت مبدأ <bdi dir="ltr" className="font-mono">****{rc.last4}</bdi> · پیگیری <bdi dir="ltr" className="font-mono">{rc.ref}</bdi> · ساعت {rc.time} · {toman(rc.amount)}</p>
      {cr && <p className="mt-0.5 text-11 text-t3">پیامک بانک: <span className="ltr">{cr.raw}</span></p>}</div>}

    <Drawer open={!!t} onClose={() => setOpen(null)} width={460} title={t ? `تراکنش ${t.id}` : ''} footer={t && t.status === 'pay.unknown' ? <Button variant="primary" icon={<RefreshCw size={14} />} onClick={() => void inquire(t)}>استعلام وضعیت از درگاه</Button> : undefined}>
      {t && b && <div className="space-y-4">
        <div className="rounded-xl bg-surface-2 p-3"><div className="flex items-center justify-between"><WithLogo name={t.gateway} /><StatusBadge s={t.status} /></div><p className="mt-2 text-22 font-bold tnum">{toman(t.amount)}</p><p className="text-11 text-t3">{when(t.at)}</p></div>
        {!isWallet(t.gateway) && !isBnpl(t.gateway) && <div><p className="mb-1 text-12 font-semibold">پاسخ درگاه و بانک</p>
          <Row k="کارت پرداخت‌کننده" v={<bdi dir="ltr" className="font-mono">{b.pan}</bdi>} />
          <Row k="بانک صادرکنندهٔ کارت" v={b.bank} />
          <Row k="شمارهٔ مرجع (RRN)" v={<CopyId v={b.rrn} />} />
          <Row k="کد پیگیری" v={<CopyId v={b.trace} />} />
          <Row k="شمارهٔ تراکنش درگاه" v={t.ref ? <CopyId v={t.ref} /> : '—'} />
          <Row k="شناسهٔ پرداخت (Authority)" v={<bdi dir="ltr" className="block max-w-52 truncate font-mono text-11">{b.authority}</bdi>} />
          <Row k="شمارهٔ ترمینال" v={<bdi dir="ltr" className="font-mono">{b.terminal}</bdi>} />
          <Row k="تأیید نهایی (verify)" v={b.verified ? <span className="text-success">انجام شد · {when(b.verified)}</span> : t.status === 'pay.unknown' ? <span className="text-warning">انجام نشده؛ استعلام کنید</span> : '—'} />
          <Row k="تسویه به حساب غنیمت" v={b.settled ? when(b.settled) : '—'} />
          <Row k="IP پرداخت‌کننده" v={<bdi dir="ltr" className="font-mono">{b.ip}</bdi>} />
        </div>}
        {b.bnpl && <div><p className="mb-1 text-12 font-semibold">اقساطی</p>
          <Row k="شناسهٔ اعتبار" v={<CopyId v={b.bnpl.creditId} />} /><Row k="شمارهٔ خرید سرویس" v={t.ref ? <CopyId v={t.ref} /> : '—'} />
          <Row k="طرح" v={b.bnpl.plan} /><Row k="قسط اول (پرداخت مشتری)" v={toman(b.bnpl.first)} /><Row k="وضعیت" v={b.bnpl.status} />
        </div>}
        {isWallet(t.gateway) && <p className="rounded-lg bg-neutral-bg px-3 py-2 text-12">پرداخت از کیف پول مشتری؛ تراکنش داخلی است و بانک در آن نقشی ندارد.</p>}
        {b.fails.length > 0 && <div><p className="mb-1 text-12 font-semibold">تلاش‌های ناموفق پیش از این تراکنش</p><ul className="space-y-1">{b.fails.map((f, i) => <li key={i} className="rounded-lg bg-danger-bg/50 px-3 py-1.5 text-12"><b className="ltr font-mono">{f.code}</b> · {f.msg}<span className="block text-11 text-t2">{when(f.at)} · کارت <bdi dir="ltr" className="font-mono">{f.pan}</bdi></span></li>)}</ul></div>}
        <p className="flex items-start gap-1.5 text-11 leading-5 text-t3"><ShieldCheck size={13} className="mt-0.5 shrink-0" />طبق قوانین شاپرک فقط ۶ رقم اول و ۴ رقم آخر کارت نگهداری و نمایش داده می‌شود. این اطلاعات از پاسخ درگاه در لحظهٔ پرداخت و تأیید (verify) ذخیره می‌شود.</p>
      </div>}
    </Drawer>
  </>
}
