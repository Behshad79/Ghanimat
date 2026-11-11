import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Mic, Send, Sparkles } from 'lucide-react'
import { Button, Input } from '@/shared/ui/base'
import { Drawer, toast } from '@/shared/ui/overlay'
import { Bars } from '@/shared/ui/charts'
import { getDB, mutate, snapshot, getSession } from '@/shared/lib/store'
import { HINTS } from '@/shared/data/hints'
import { compactToman, fa, pct } from '@/shared/lib/fa'

type Msg = { from: 'me' | 'ai'; body: ReactNode; meta?: string }
const SUGGEST = ['وضعیت امروز کسب‌وکار را خلاصه کن', 'کدام واحدها بیش از ۳۰ روز در انبار مانده‌اند؟', 'برای واحدهای راکد ۵٪ تخفیف بگذار', 'چرا نرخ تبدیل دیروز افت کرد؟']

/** پاسخ‌گوی شبیه‌سازی‌شده: پاسخ‌ها از همان دادهٔ نمونه ساخته می‌شوند؛ هر اقدام نوشتنی پیش‌نمایش و تأیید انسانی دارد. */
function answer(q: string, push: (m: Msg) => void): Msg {
  const d = getDB()
  const aged = d.units.filter((u) => ['unit.published', 'unit.ready'].includes(u.status) && Date.now() - new Date(u.received).getTime() > 30 * 864e5)
  const name = (pid: string) => d.products.find((p) => p.id === pid)?.en ?? pid
  if (getSession().simulate === 'fail') return { from: 'ai', body: 'سرویس دستیار در دسترس نیست. چند دقیقهٔ دیگر دوباره تلاش کنید؛ کارهای دستی پنل مثل قبل انجام می‌شود.' }
  if (/تخفیف/.test(q)) return {
    from: 'ai', meta: 'پیش‌نمایش اقدام · اجرا فقط با تأیید شما',
    body: (<div><p>پیش‌نمایش: ۵٪ کاهش قیمت برای {fa(aged.length)} واحد راکد.</p>
      <ul className="my-2 list-disc pr-4 text-12">{aged.map((u) => <li key={u.id}>{name(u.productId)} · {compactToman(u.price)} ← {compactToman(u.price * 0.95)}</li>)}</ul>
      <p className="text-12 text-t2">اثر بر حاشیهٔ سود: حدود ۴ واحد درصد کمتر. هیچ واحدی زیر کف حاشیه نمی‌رود.</p>
      <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" onClick={() => { const undo = snapshot(); mutate((x) => aged.forEach((a) => { const u = x.units.find((y) => y.id === a.id)!; u.price = Math.round((u.price * 0.95) / 100000) * 100000 }), { action: 'کاهش قیمت گروهی ۵٪', target: `${aged.length} واحد راکد`, ai: true }); toast(`قیمت ${fa(aged.length)} واحد تغییر کرد.`, { undo }); push({ from: 'ai', body: 'اعمال شد و در لاگ با برچسب AI ثبت شد.' }) }}>اعمال برای {fa(aged.length)} واحد</Button><Button size="sm" variant="ghost">رد</Button></div></div>),
  }
  if (/راکد|۳۰ روز|30/.test(q)) return {
    from: 'ai', meta: 'منبع: موجودی انبار · بازه: تا این لحظه',
    body: (<div><p>{fa(aged.length)} واحد منتشرشده بیش از ۳۰ روز در انبار مانده است:</p><div className="mt-2"><Bars data={aged.map((u) => ({ label: `${name(u.productId)} · ${u.id}`, value: Math.round((Date.now() - new Date(u.received).getTime()) / 864e5) }))} fmt={(n) => `${fa(n)} روز`} color="var(--warning)" /></div><Button size="sm" className="mt-2" onClick={() => toast('به داشبورد خانه اضافه شد.')}>افزودن به داشبورد</Button></div>),
  }
  if (/چرا|علت|افت/.test(q)) return {
    from: 'ai', meta: 'منبع: قیف خرید و تراکنش‌ها · بازه: دیروز در برابر میانگین ۷ روز · اطمینان: متوسط',
    body: (<div><p>سه عامل بیشترین سهم را دارند:</p><div className="mt-2"><Bars data={[{ label: 'قطعی درگاه اقساطی تارا (پرداخت ناموفق)', value: 46 }, { label: 'ناموجودی ۲ کالای پربازدید', value: 31 }, { label: 'تأخیر پیامک کد ورود', value: 23 }]} fmt={(n) => pct(n)} color="var(--danger)" /></div><p className="mt-2 text-12 text-t2">اقدام پیشنهادی: سرویس قطع‌شده تا پایدار شدن پنهان بماند و برای کالاهای ناموجود فرصت خرید ثبت شود.</p></div>),
  }
  const h = Object.values(HINTS).find((x) => q.includes(x.title.split(' (')[0]) || q.includes(x.title))
  if (h) return { from: 'ai', meta: 'منبع: فرهنگ شاخص‌های غنیمت', body: <div><p>{h.def}</p>{h.here && <p className="mt-1">{h.here}</p>}{h.formula && <p className="mt-1 rounded-sm bg-neutral-bg px-2 py-1">{h.formula}</p>}{h.effect && <p className="mt-1">{h.effect}</p>}</div> }
  const paid = d.orders.filter((o) => !['order.cancelled', 'order.awaiting_payment'].includes(o.status) && Date.now() - new Date(o.createdAt).getTime() < 864e5)
  return {
    from: 'ai', meta: 'منبع: سفارش‌ها، صف‌ها و هشدارها · بازه: ۲۴ ساعت اخیر',
    body: (<ul className="list-disc space-y-1 pr-4"><li>{fa(paid.length)} سفارش به ارزش {compactToman(paid.reduce((a, o) => a + o.total, 0))} ثبت شده است.</li><li>{fa(d.units.filter((u) => u.status === 'unit.qc').length)} واحد منتظر QC و {fa(d.units.filter((u) => u.status === 'unit.photo').length)} واحد منتظر عکاسی است.</li><li>{fa(d.txns.filter((t) => t.status === 'pay.unknown').length)} تراکنش نامشخص و {fa(d.approvals.filter((a) => a.status === 'approval.pending').length)} مورد منتظر تأیید دارید.</li><li>مهم‌ترین هشدار: {d.alerts[0]?.title}.</li></ul>),
  }
}

export function Copilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loc = useLocation()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const push = (m: Msg) => setMsgs((x) => [...x, m])
  const ask = (text: string) => {
    if (!text.trim()) return
    push({ from: 'me', body: text }); setQ(''); setBusy(true)
    setTimeout(() => { push(answer(text, push)); setBusy(false) }, getSession().simulate === 'slow' ? 2600 : 700)
  }
  useEffect(() => { const h = (e: Event) => ask((e as CustomEvent).detail) ; window.addEventListener('copilot', h); return () => window.removeEventListener('copilot', h) }, [])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])
  return (
    <Drawer open={open} onClose={onClose} width={440} title={<span className="flex items-center gap-1.5 text-brand"><Sparkles size={16} />دستیار غنیمت</span>}
      footer={<form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); ask(q) }}><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: حاشیهٔ سود هدفون‌ها در این ماه" /><Button type="button" variant="ghost" aria-label="ورودی صوتی" icon={<Mic size={15} />} onClick={() => toast('ورودی صوتی در نسخهٔ نمایشی شبیه‌سازی نشده است.')} /><Button variant="primary" aria-label="ارسال" icon={<Send size={15} />} /></form>}>
      <p className="mb-3 rounded-md bg-neutral-bg px-3 py-2 text-11 text-t2">زمینه: صفحهٔ <span className="ltr font-mono">{loc.pathname}</span> · دسترسی دستیار برابر دسترسی شماست · همهٔ اقدام‌ها با برچسب AI در لاگ ثبت می‌شود.</p>
      {msgs.length === 0 && <div className="space-y-2">{SUGGEST.map((s) => <button key={s} onClick={() => ask(s)} className="block w-full rounded-md border border-line px-3 py-2 text-right text-13 hover:border-brand">{s}</button>)}</div>}
      <div className="space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'me' ? 'mr-8 rounded-lg bg-brand-solid px-3 py-2 text-13 text-white' : 'ml-8 rounded-lg border border-line bg-surface-2 px-3 py-2 text-13 leading-6'}>
            {m.body}{m.meta && <p className="mt-2 border-t border-line pt-1.5 text-11 text-t3">{m.meta}</p>}
          </div>
        ))}
        {busy && <div className="skeleton ml-8 h-12" />}
        <div ref={end} />
      </div>
    </Drawer>
  )
}
