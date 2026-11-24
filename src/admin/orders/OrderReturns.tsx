import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ExternalLink, Plus, RotateCcw, UserRound } from 'lucide-react'
import { Badge, Button, Card, StatusBadge, cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { Order } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'
import { METHODS, refundLabel, RETURN_STEPS, retItems, retStage } from '../returns/flow'
import { ManualReturn } from './ReturnTools'
import { WarrantyList, WarrantyPrint } from '../returns/Warranty'
import { ShieldCheck } from 'lucide-react'

/** نوار چهارگام پرونده مرجوعی، کوچک و داخل کارت سفارش */
function MiniSteps({ at }: { at: number }) {
  return <ol className="grid grid-cols-4 gap-1.5">{RETURN_STEPS.map(([t, sub], i) => <li key={t} className={cx('rounded-lg border px-2 py-1.5', i < at ? 'border-success/40 bg-success-bg' : i === at ? 'border-brand bg-brand-tint' : 'border-line')}>
    <p className={cx('flex items-center gap-1 text-11 font-semibold', i < at ? 'text-success' : i === at ? 'text-brand' : 'text-t3')}>{i < at ? <Check size={11} /> : <span className="tnum">{fa(i + 1)}</span>}{t}</p>
    <p className="text-11 text-t3">{sub}</p></li>)}</ol>
}

/** مرجوعی‌های همین سفارش + ثبت دستی بعد از تحویل؛ پرونده‌ای که مشتری از سایت ثبت کند هم همین‌جا با همان چهار گام دیده می‌شود */
export function OrderReturns({ o }: { o: Order }) {
  const d = useDB(); const nav = useNavigate(); const [open, setOpen] = useState<string[] | null>(null)
  const list = d.returns.filter((r) => r.orderId === o.id)
  const delivered = o.shipments.filter((s) => s.status === 'ship.delivered')
  if (!delivered.length && !list.length) return null
  const base = o.deliveredAt ? new Date(o.deliveredAt).getTime() : Math.max(...delivered.map((s) => new Date((s as { deliveredAt?: string }).deliveredAt ?? s.sla).getTime()))
  const left = Math.ceil((base + 7 * 864e5 - Date.now()) / 864e5)
  return <Card title={<span className="inline-flex items-center gap-1.5"><RotateCcw size={15} />مرجوعی این سفارش{list.length > 0 && <Badge>{fa(list.length)} پرونده</Badge>}</span>}
    actions={delivered.length > 0 && <Button size="sm" icon={<Plus size={13} />} onClick={() => setOpen([])}>ثبت دستی مرجوعی</Button>}>
    <div className="space-y-3">
      {delivered.length > 0 && <p className={cx('rounded-lg px-3 py-2 text-12', left > 0 ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning')}>{left > 0 ? `مهلت ۷ روزهٔ مرجوعی باز است: ${fa(left)} روز دیگر.` : 'مهلت ۷ روزهٔ مرجوعی تمام شده است؛ ثبت دستی فقط با تأیید مدیر و برای ایراد کارکردی یا گارانتی.'} مشتری از «پنل کاربری ← سفارش‌ها ← ثبت مرجوعی» هم می‌تواند درخواست بدهد؛ در هر دو حالت پرونده همین‌جا و در «مرجوعی و گارانتی» دیده می‌شود.</p>}
      {list.map((r) => { const st = retStage(r); const items = retItems(r, d.orders); const byCustomer = !r.channel
        return <div key={r.id} className="space-y-2.5 rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="font-mono text-13 font-bold text-brand hover:underline" onClick={() => nav(`/admin/returns/${r.id}`)}>{r.id}</button>
            <StatusBadge s={r.status} />
            <span className="inline-flex items-center gap-1 text-11 text-t2"><UserRound size={11} />{byCustomer ? 'ثبت مشتری از پنل کاربری سایت' : `ثبت دستی توسط ${r.by} از راه ${r.channel}`} · {rel(r.createdAt)}</span>
            <Button size="sm" variant="ghost" className="mr-auto" icon={<ExternalLink size={12} />} onClick={() => nav(`/admin/returns/${r.id}`)}>باز کردن پرونده</Button>
          </div>
          <MiniSteps at={st.step} />
          <p className="text-12"><b>اقدام بعدی:</b> {st.next}{st.who !== '—' && <span className="text-t2"> · با {st.who}</span>}</p>
          <div className="flex flex-wrap gap-2">{items.map((it, i) => <span key={i} className="inline-flex items-center gap-2 rounded-lg bg-neutral-bg px-2 py-1 text-12"><ProductImg pid={it.productId} size={28} />{d.products.find((p) => p.id === it.productId)?.title ?? it.productId}<span className="text-t2">× {fa(it.qty)}</span></span>)}</div>
          <div className="grid gap-x-4 gap-y-1 text-12 sm:grid-cols-2">
            <p><span className="text-t2">دلیل:</span> {r.reason}</p>
            <p><span className="text-t2">روش ارسال برگشت:</span> {METHODS[(r as { method?: string }).method ?? 'post']?.label ?? '—'}{(r as { tracking?: string }).tracking && <> · کد <bdi dir="ltr" className="font-mono">{(r as { tracking?: string }).tracking}</bdi></>}</p>
            <p><span className="text-t2">مبلغ قابل بازگشت:</span> <span className="tnum">{toman(r.amount)}</span></p>
            <p><span className="text-t2">بازگشت وجه به:</span> {refundLabel(r)}</p>
          </div>
          {(r.events ?? []).length > 0 && <ol className="space-y-1 border-r-2 border-line pr-3 text-12">{(r.events ?? []).slice(-3).map((e, i) => <li key={i}><span className="text-t3">{rel(e.at)} · {e.by}:</span> {e.text}</li>)}</ol>}
        </div> })}
      {!list.length && <div className="rounded-xl border border-dashed border-line p-3 text-12 text-t2">
        <p className="mb-2 font-semibold text-t1">هنوز مرجوعی برای این سفارش ثبت نشده است. اگر مشتری از سایت «ثبت مرجوعی» بزند، این چهار گام همین‌جا دنبال می‌شود:</p>
        <MiniSteps at={-1} />
        <ol className="mt-2 list-decimal space-y-0.5 pr-5"><li>مشتری کالا، دلیل، عکس و مقصد بازگشت وجه را انتخاب می‌کند؛ پرونده با وضعیت «در انتظار ارسال کالا» ساخته می‌شود و برای شما اعلان می‌آید.</li><li>مشتری با پست یا پیک پس‌کرایه می‌فرستد و کد رهگیری را در پنل وارد می‌کند، یا حضوری تحویل می‌دهد؛ شما «دریافت در انبار» را ثبت می‌کنید.</li><li>کنترل کیفیت پلمب، ظاهر، کارکرد و متعلقات را بررسی می‌کند و نتیجه را ثبت می‌کند.</li><li>با تأیید، وجه به کیف پول یا کارت واریز می‌شود؛ با رد، کالا دوباره برای مشتری ارسال می‌شود.</li></ol>
        <p className="mt-2">نمونهٔ کامل: <button type="button" className="font-mono text-brand underline" onClick={() => nav('/admin/orders/GH-10458')}>GH-10458</button> (ثبت مشتری از سایت، منتظر ارسال کالا) و <button type="button" className="font-mono text-brand underline" onClick={() => nav('/admin/orders/GH-10451')}>GH-10451</button> (در حال بررسی کالا).</p>
      </div>}
    </div>
    {open && <ManualReturn open onClose={() => setOpen(null)} preset={{ orderId: o.id, customerId: o.customerId, items: open }} />}
  </Card>
}

/** دکمهٔ ثبت دستی مرجوعی روی مرسولهٔ تحویل‌شده؛ کالاهای همین مرسوله از پیش انتخاب می‌شوند */
export function ReturnShipButton({ o, sid }: { o: Order; sid: string }) {
  const [open, setOpen] = useState(false); const s = o.shipments.find((x) => x.id === sid)
  if (!s) return null
  return <><Button size="sm" icon={<RotateCcw size={13} />} onClick={() => setOpen(true)}>ثبت دستی مرجوعی</Button>
    {open && <ManualReturn open onClose={() => setOpen(false)} preset={{ orderId: o.id, customerId: o.customerId, items: s.items.map((it) => `${s.id}|${it.productId}|${it.unitId}`) }} />}</>
}

/** گارانتی‌های این سفارش: برای هر واحد (یا هر عدد) کالای گارانتی‌دار یک کد یکتا؛ همان کدی که روی کارت چاپ و برای مشتری فرستاده می‌شود */
export function OrderWarranties({ o }: { o: Order }) {
  const d = useDB(); const [print, setPrint] = useState(false); const cards = d.wcards.filter((c) => c.orderId === o.id)
  if (!cards.length) return null
  const live = cards.filter((c) => c.status !== 'archived'); const arch = cards.length - live.length
  return <Card title={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} />گارانتی‌های این سفارش<Badge>{fa(cards.length)} کد</Badge>{arch > 0 && <Badge tone="neutral">{fa(arch)} بایگانی</Badge>}</span>}
    actions={live.length ? <Button size="sm" onClick={() => setPrint(true)}>چاپ کارت‌ها ({fa(live.length)})</Button> : undefined}>
    <p className="mb-2 text-12 text-t2">کدها از لحظهٔ ثبت خرید فعال‌اند و در «گارانتی‌های من» مشتری دیده می‌شوند. برای جزئیات، ثبت درخواست گارانتی یا مرجوعی و چاپ، روی هر کد بزنید. با مرجوعی یا لغو، کد خودکار بایگانی می‌شود.</p>
    <WarrantyList cards={cards} empty="" />
    {print && <WarrantyPrint codes={live.map((c) => c.code)} onClose={() => setPrint(false)} />}
  </Card>
}
