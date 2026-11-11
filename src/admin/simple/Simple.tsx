import { useState, type ReactNode } from 'react'
import { ArrowRight, Camera, Check, ClipboardCheck, HelpCircle, MessageCircle, Package, PackagePlus, Phone, PhoneCall, Search, Send, Video, WifiOff } from 'lucide-react'
import { DemoBar } from '../shell/Shell'
import { Button, cx, Input } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, fakeCall, mutate, setSession, useDB, useSession } from '@/shared/lib/store'
import { fa, minsLeft } from '@/shared/lib/fa'
import { useNavigate } from 'react-router-dom'
import { ProductImg } from '../pages/_shared'

/** حالت ساده (بخش ۵.۱۲): از صفر و بر اساس «کار»؛ یک کار در هر صفحه، زبان روزمره، دکمهٔ بزرگ، بدون اصطلاح. */
type Flow = null | 'pack' | 'ship' | 'msg' | 'add' | 'phone' | 'track' | 'day'
const Big = ({ children, tone = 'go', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'go' | 'stop' | 'plain' }) => (
  <button {...p} className={cx('flex min-h-14 w-full items-center justify-center gap-2 rounded-lg px-4 text-16 font-bold transition-colors disabled:opacity-40', tone === 'go' ? 'bg-success-solid text-white' : tone === 'stop' ? 'bg-danger-bg text-danger' : 'border border-line bg-surface text-t1')}>{children}</button>
)
export function Simple() {
  const d = useDB(); const s = useSession(); const nav = useNavigate(); const me = currentUser()!
  const [flow, setFlow] = useState<Flow>(null); const [step, setStep] = useState(0); const [help, setHelp] = useState(false); const [link, setLink] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [q, setQ] = useState('')
  const ships = d.orders.flatMap((o) => o.shipments.filter((x) => x.warehouse === 'tehran').map((x) => ({ ...x, order: o })))
  const fresh = ships.filter((x) => ['ship.pending', 'ship.picking'].includes(x.status) && x.order.status !== 'order.suspicious' && x.order.status !== 'order.awaiting_credit')
  const packed = ships.filter((x) => x.status === 'ship.packed')
  const msgs = d.tickets.filter((t) => ['ticket.new', 'ticket.open'].includes(t.status))
  const start = (f: Flow) => { setFlow(f); setStep(0); setErr(''); setLink('') }
  const back = () => (step > 0 ? setStep(step - 1) : setFlow(null))
  const cur = flow === 'pack' ? fresh[0] : flow === 'ship' ? packed[0] : undefined
  const prod = (id: string) => d.products.find((p) => p.id === id)!
  const urgent = fresh.find((x) => minsLeft(x.sla) < 120)
  const askBoss = (what: string) => { mutate((x) => { x.approvals.unshift({ id: `AP-${760 + x.approvals.length}`, type: 'درخواست اپراتور', title: what, ref: '-', amount: 0, by: me.name, byRole: 'simple', status: 'approval.pending', at: new Date().toISOString() }) }, { action: 'درخواست از مدیر', target: what }); toast('برای مدیر فرستاده شد. تا جواب بدهد، کار بعدی را انجام بده.') }
  const cards: [Flow, ReactNode, string, string, number?][] = [['pack', <Package size={26} />, 'سفارش‌های تازه', 'آماده‌کردن بسته‌ها', fresh.length], ['ship', <Send size={26} />, 'بسته‌های آمادهٔ ارسال', 'تحویل به پیک یا پست', packed.length], ['msg', <MessageCircle size={26} />, 'پیام‌های مشتری‌ها', 'جواب‌دادن', msgs.length], ['add', <PackagePlus size={26} />, 'افزودن کالای جدید', 'با لینک، عکس یا نام'], ['phone', <PhoneCall size={26} />, 'ثبت سفارش تلفنی', 'برای مشتری پشت خط'], ['track', <Search size={26} />, 'وضعیت سفارش‌ها', 'با نام، موبایل یا شماره'], ['day', <ClipboardCheck size={26} />, 'کارهای امروز', 'شروع و پایان روز']]
  const Steps = ({ n }: { n: number }) => <div className="mb-4 flex gap-1">{Array.from({ length: n }).map((_, i) => <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-success' : 'bg-line')} />)}</div>
  const m = msgs[0]; const found = q.length > 2 ? d.orders.find((o) => o.id.includes(q.toUpperCase()) || d.customers.find((c) => c.id === o.customerId)!.name.includes(q)) : undefined

  return (
    <div className="flex h-full flex-col bg-bg">
      <DemoBar />
      {s.viewAs && <div className="flex h-8 shrink-0 items-center justify-center gap-3 bg-warning-bg text-12 text-warning">مشاهدهٔ «حالت ساده» از دید اپراتور؛ فقط مشاهده.<button className="font-semibold underline" onClick={() => { setSession({ viewAs: null }); nav('/admin') }}>بازگشت به مدیر کل</button></div>}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        {flow ? <button onClick={back} className="flex min-h-11 items-center gap-1 text-14 font-semibold"><ArrowRight size={18} />برگرد</button> : <img src="./brand/logo-mark.png" alt="غنیمت" className="h-7" />}
        <button onClick={() => setHelp(true)} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-warning-bg px-3 text-14 font-bold text-warning"><HelpCircle size={18} />نمی‌دانم، کمک</button>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4 text-16 leading-7">
        {s.viewState === 'offline' && <p className="mb-3 flex items-center gap-2 rounded-lg bg-warning-bg p-3 text-14 text-warning"><WifiOff size={18} />اینترنت قطع است. کارت را ادامه بده؛ وقتی وصل شد خودش ثبت می‌شود.</p>}
        {!flow && <>
          <h1 className="mb-1 text-24 font-bold">سلام {me.name}</h1><p className="mb-4 text-t2">امروز چه کار کنم؟</p>
          {urgent && <button onClick={() => start('pack')} className="mb-3 w-full rounded-lg bg-danger-solid p-4 text-right text-white"><p className="text-16 font-bold">این سفارش عجله دارد</p><p className="text-14">{fa(Math.max(0, minsLeft(urgent.sla)))} دقیقه وقت داری. اول همین را آماده کن.</p></button>}
          {s.viewState === 'empty' || (fresh.length + packed.length + msgs.length === 0) ? <p className="mb-3 rounded-lg bg-success-bg p-4 text-center font-bold text-success">همه‌چیز انجام شده. آفرین.</p> : null}
          <div className="grid grid-cols-2 gap-3">{cards.map(([f, icon, t, sub, n]) => (
            <button key={t} onClick={() => start(f)} className="relative flex min-h-32 flex-col items-start justify-between rounded-lg border border-line bg-surface p-4 text-right active:border-brand">
              <span className="text-brand">{icon}</span><span><span className="block text-16 font-bold">{t}</span><span className="block text-13 text-t2">{sub}</span></span>
              {!!n && <span className="tnum absolute top-3 left-3 grid h-8 min-w-8 place-items-center rounded-full bg-danger-solid px-2 text-14 font-bold text-white">{fa(n)}</span>}
            </button>))}</div></>}

        {flow === 'pack' && (!cur ? <Done text="سفارش تازه‌ای نمانده." onHome={() => setFlow(null)} /> : <>
          <Steps n={4} />
          {step === 0 && <><h2 className="mb-3 text-20 font-bold">این کالا را از قفسه بردار</h2>{cur.items.map((it, i) => { const u = d.units.find((x) => x.id === it.unitId); return <div key={i} className="mb-3 rounded-lg border border-line bg-surface p-4"><ProductImg pid={it.productId} size={400} rounded="rounded-md" className="mb-3 !h-auto aspect-video !w-full" /><p className="font-bold">{prod(it.productId).title}</p><p className="text-t2">قفسه: <b className="ltr font-mono text-t1">{u?.shelf ?? 'A-01'}</b> · {fa(it.qty)} عدد</p></div> })}<Big onClick={() => setStep(1)}>کالا را پیدا کردم</Big><div className="mt-2"><Big tone="stop" onClick={() => { askBoss(`کالای سفارش ${cur.order.id} در قفسه پیدا نشد`); setFlow(null) }}>پیدا نکردم</Big></div></>}
          {step === 1 && <><h2 className="mb-3 text-20 font-bold">بارکد روی کالا را بگیر جلوی دوربین</h2><div className="mb-3 grid aspect-video place-items-center rounded-lg bg-[#10123d] text-white"><Camera size={40} /></div>{err && <p className="mb-3 rounded-lg bg-danger-bg p-3 text-14 text-danger">{err}</p>}<Big onClick={() => { setErr(''); setStep(2) }}>بارکد درست بود</Big><div className="mt-2"><Big tone="plain" onClick={() => setErr('این بارکد مال این سفارش نیست. کالا را سر جایش بگذار و دوباره از همان قفسه بردار.')}>نمونهٔ بارکد اشتباه</Big></div></>}
          {step === 2 && <Checklist title="این‌ها را داخل بسته بگذار" items={['خودِ کالا', 'برگهٔ کنترل کیفیت', 'کارت گارانتی']} onDone={() => setStep(3)} />}
          {step === 3 && <><h2 className="mb-3 text-20 font-bold">برچسب را چاپ کن و روی بسته بچسبان</h2><Big tone="plain" onClick={() => toast(s.simulate === 'fail' ? 'چاپگر کار نمی‌کند. نشانی را از روی صفحه با خودکار روی بسته بنویس.' : 'برچسب چاپ شد.', { tone: s.simulate === 'fail' ? 'err' : 'ok' })}>چاپ برچسب</Big><div className="mt-2"><Big onClick={() => { mutate((x) => { const o = x.orders.find((y) => y.id === cur.order.id)!; o.shipments.find((y) => y.id === cur.id)!.status = 'ship.packed'; o.status = 'order.preparing' }, { action: 'بسته آماده شد (حالت ساده)', target: cur.id }); toast('بسته آماده شد.'); setStep(0); if (fresh.length <= 1) setFlow(null) }}>بسته آماده شد</Big></div></>}</>)}

        {flow === 'ship' && (!cur ? <Done text="بستهٔ آماده‌ای نمانده." onHome={() => setFlow(null)} /> : (() => { const post = /پست|تیپاکس|باربری/.test(cur.method); return <>
          <Steps n={2} />
          <h2 className="mb-1 text-20 font-bold">{post ? 'این بسته با پست می‌رود' : 'این بسته با پیک می‌رود'}</h2><p className="mb-3 text-t2">{cur.items.map((i) => prod(i.productId).en).join('، ')}</p>
          {step === 0 && <><p className="mb-2 font-bold">{post ? 'شمارهٔ روی رسید پست را اینجا بنویس' : 'لینک پیک را اینجا بچسبان'}</p><Input className="ltr h-14 text-left font-mono text-16" value={link} onChange={(e) => setLink(e.target.value)} placeholder={post ? '۲۴ رقم' : 'https://…'} />
            <button className="mt-2 text-14 text-brand" onClick={() => setLink(post ? '120459870001245789632155' : 'https://app.snapp-box.example/track/SB-90500')}>نمونه بگذار</button>
            {err && <p className="mt-3 rounded-lg bg-danger-bg p-3 text-14 text-danger">{err}</p>}
            <div className="mt-4"><Big disabled={busy} onClick={async () => { setErr(''); if (post ? !/^\d{24}$/.test(link) : !/^https?:\/\//.test(link)) return setErr(post ? 'این شماره درست نیست. باید ۲۴ رقم باشد. دوباره از روی رسید نگاه کن.' : 'این لینک خوانده نشد. دوباره از برنامهٔ پیک کپی کن.'); setBusy(true); try { await fakeCall(true); setStep(1) } catch { setErr('الان جواب نمی‌دهد. یک دقیقه صبر کن و دوباره بزن؛ اگر نشد «نمی‌دانم، کمک» را بزن.') } setBusy(false) }}>{busy ? 'صبر کن…' : 'بعدی'}</Big></div></>}
          {step === 1 && <>{!post && <div className="mb-4 rounded-lg border border-line bg-surface p-4"><p className="text-t2">پیکی که می‌آید:</p><p className="text-20 font-bold">حمید زارعی</p><p>موتور · پلاک ۸۷۶ ایران ۳۳</p></div>}
            <Big onClick={() => { mutate((x) => { const o = x.orders.find((y) => y.id === cur.order.id)!; const sh = o.shipments.find((y) => y.id === cur.id)!; if (post) { sh.tracking = link; sh.status = 'ship.in_transit' } else { sh.courier = { name: 'حمید زارعی', phone: '09120000002', plate: '۸۷۶ ایران ۳۳', vehicle: 'موتور', eta: 25, code: 'SB-90500', cost: 190000 }; sh.status = 'ship.handed' } o.status = 'order.shipped' }, { action: 'تحویل بسته (حالت ساده)', target: cur.id }); toast('ثبت شد. به مشتری خودکار پیام داده شد.'); setStep(0); setLink(''); if (packed.length <= 1) setFlow(null) }}>{post ? 'به پست دادم' : 'تحویل پیک دادم'}</Big></>}</> })())}

        {flow === 'msg' && (!m ? <Done text="پیام بی‌جوابی نمانده." onHome={() => setFlow(null)} /> : <>
          <h2 className="mb-3 text-20 font-bold">{d.customers.find((c) => c.id === m.customerId)!.name} پرسیده:</h2>
          <p className="mb-2 rounded-lg bg-surface p-4">{m.messages[m.messages.length - 1].text}</p><p className="mb-4 text-14 text-t2">سفارش {m.orderId}</p>
          <p className="mb-2 font-bold">یکی از این جواب‌ها را انتخاب کن:</p>
          {['سلام. بسته دست پیک است و حدود ۱۵ دقیقهٔ دیگر می‌رسد.', 'سلام. بررسی کردم؛ تا یک ساعت دیگر خبرتان می‌کنم.', 'سلام. حق با شماست. همین امروز برایتان می‌فرستیم.'].map((r) => <button key={r} onClick={() => { mutate((x) => { const t = x.tickets.find((y) => y.id === m.id)!; t.messages.push({ from: 'agent', text: r, at: new Date().toISOString() }); t.status = 'ticket.answered' }, { action: 'پاسخ به مشتری (حالت ساده)', target: m.id }); toast('جواب فرستاده شد.') }} className="mb-2 block min-h-14 w-full rounded-lg border border-line bg-surface p-3 text-right active:border-brand">{r}</button>)}
          <div className="mt-2"><Big tone="stop" onClick={() => { mutate((x) => { x.tickets.find((y) => y.id === m.id)!.status = 'ticket.needs_info' }); askBoss(`پیام ${m.id}: ${m.subject}`) }}>سخت است؛ به مدیر بسپار</Big></div></>)}

        {flow === 'add' && <><Steps n={3} />
          {step === 0 && <><h2 className="mb-3 text-20 font-bold">کالای جدید را چطور نشان می‌دهی؟</h2><div className="space-y-2">{['لینک کالا را دارم', 'از جعبه عکس می‌گیرم', 'اسمش را می‌نویسم'].map((t) => <Big key={t} tone="plain" onClick={() => setStep(1)}>{t}</Big>)}</div></>}
          {step === 1 && <><h2 className="mb-3 text-20 font-bold">کالا نو است یا استفاده‌شده؟</h2><div className="space-y-2">{['نو و بازنشده', 'جعبه‌اش باز شده', 'استفاده‌شده'].map((t) => <Big key={t} tone="plain" onClick={() => setStep(2)}>{t}</Big>)}</div></>}
          {step === 2 && <><h2 className="mb-2 text-20 font-bold">تمام شد</h2><p className="mb-4 text-t2">بقیه را دستیار پر کرد. قیمت را مدیر می‌گذارد؛ کالا تا آن موقع در سایت دیده نمی‌شود.</p><Big onClick={() => { askBoss('کالای جدید منتظر قیمت و تأیید مدیر'); setFlow(null) }}>ثبت و فرستادن برای مدیر</Big></>}</>}

        {flow === 'phone' && <><h2 className="mb-3 text-20 font-bold">سفارش تلفنی</h2><p className="mb-2 font-bold">مشتری چه می‌خواهد؟</p><div className="mb-4 space-y-2">{d.products.filter((p) => p.status === 'product.published').slice(0, 3).map((p) => <button key={p.id} className="block min-h-14 w-full rounded-lg border border-line bg-surface p-3 text-right">{p.title}</button>)}</div><p className="mb-2 font-bold">شمارهٔ موبایل مشتری</p><Input className="ltr mb-4 h-14 text-left font-mono text-16" inputMode="numeric" placeholder="09…" /><Big onClick={() => { toast('لینک پرداخت برای مشتری پیامک شد. وقتی پول را داد، سفارش در «سفارش‌های تازه» می‌آید.'); setFlow(null) }}>لینک پرداخت را برایش بفرست</Big></>}

        {flow === 'track' && <><h2 className="mb-3 text-20 font-bold">سفارش کجاست؟</h2><Input className="mb-4 h-14 text-16" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام مشتری یا شمارهٔ سفارش" />
          {found ? <div className="rounded-lg border border-line bg-surface p-4"><p className="ltr text-right font-mono font-bold">{found.id}</p><p className="mt-2">{found.status === 'order.shipped' ? 'بسته دست پیک است و در راه است.' : found.status === 'order.delivered' ? 'بسته به دست مشتری رسیده.' : found.status === 'order.cancelled' ? 'این سفارش لغو شده و پول برگشته.' : 'داریم بسته را آماده می‌کنیم.'}</p><p className="mt-3 rounded-md bg-neutral-bg p-3 text-14">به مشتری بگو: «سفارش شما ثبت است و {found.status === 'order.shipped' ? 'تا کمتر از یک ساعت دیگر می‌رسد' : 'خبرتان می‌کنیم'}.»</p></div> : q.length > 2 && <p className="text-t2">چیزی پیدا نشد. نام یا شماره را دوباره نگاه کن.</p>}</>}

        {flow === 'day' && <Checklist title={d.simpleDay.started ? 'پایان روز' : 'شروع روز'} items={d.simpleDay.started ? ['بسته‌ای روی میز نمانده', 'چاپگر را خاموش کردم', 'در انبار را قفل کردم'] : ['چاپگر روشن است', 'برچسب و کاغذ داریم', 'اینترنت وصل است']} doneLabel={d.simpleDay.started ? 'فرستادن گزارش امروز برای مدیر' : 'شروع کنیم'} onDone={() => { mutate((x) => { x.simpleDay.started = !x.simpleDay.started }, { action: d.simpleDay.started ? 'گزارش پایان روز' : 'شروع روز', target: me.name }); toast(d.simpleDay.started ? 'گزارش امروز برای مدیر فرستاده شد.' : 'روز خوبی داشته باشی.'); setFlow(null) }} />}
      </main>
      <Modal open={help} onClose={() => setHelp(false)} title="چه کمکی می‌خواهی؟">
        <div className="space-y-2"><Big tone="plain" onClick={() => { setHelp(false); toast('ویدیوی ۳۰ ثانیه‌ای همین کار پخش می‌شود.') }}><Video size={20} />ویدیوی همین کار را ببینم</Big><Big tone="plain" onClick={() => { setHelp(false); toast('دستیار گوش می‌دهد؛ سؤالت را بگو.') }}><MessageCircle size={20} />از دستیار بپرسم</Big><Big onClick={() => { setHelp(false); askBoss('اپراتور کمک می‌خواهد (عکس صفحه پیوست شد)') }}><Phone size={20} />به مدیر خبر بده</Big></div>
      </Modal>
    </div>
  )
}
const Done = ({ text, onHome }: { text: string; onHome: () => void }) => <div className="py-10 text-center"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-success-bg text-success"><Check size={32} /></div><p className="mb-6 text-20 font-bold">{text}</p><Big tone="plain" onClick={onHome}>برگرد به خانه</Big></div>
function Checklist({ title, items, onDone, doneLabel = 'همه را گذاشتم' }: { title: string; items: string[]; onDone: () => void; doneLabel?: string }) {
  const [ok, setOk] = useState<string[]>([])
  return <><h2 className="mb-3 text-20 font-bold">{title}</h2><div className="mb-4 space-y-2">{items.map((i) => <button key={i} onClick={() => setOk(ok.includes(i) ? ok.filter((x) => x !== i) : [...ok, i])} className={cx('flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 text-right', ok.includes(i) ? 'border-success bg-success-bg' : 'border-line bg-surface')}><span className={cx('grid size-7 place-items-center rounded-md border', ok.includes(i) ? 'border-success bg-success-solid text-white' : 'border-line')}>{ok.includes(i) && <Check size={18} />}</span>{i}</button>)}</div><Big disabled={ok.length < items.length} onClick={onDone}>{doneLabel}</Big></>
}
