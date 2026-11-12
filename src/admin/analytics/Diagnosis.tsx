import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, Bug, CheckCircle2, ChevronLeft, CircleDollarSign, Gauge, Lightbulb, ShieldCheck, ShoppingCart, Smartphone, Sparkles, ThumbsUp, Timer, Truck } from 'lucide-react'
import { Badge, Button, Card, cx, Segmented } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { AreaFunnel } from '@/shared/ui/charts'
import { askCopilot } from '@/shared/ui/overlay'
import { fa, pct } from '@/shared/lib/fa'

// دادهٔ تحلیلی ۳۰ روز اخیر (نمونه): هر مرحلهٔ قیف با دلیل‌های ریزش، سهم هر دلیل و شاهد آن
type Reason = { why: string; share: number; evidence: string; fix: string; to: string; impact: number }
const STEPS: { label: string; value: number; note: string; reasons: Reason[] }[] = [
  { label: 'بازدید از سایت', value: 48200, note: 'ورود', reasons: [] },
  { label: 'دیدن صفحهٔ کالا', value: 21400, note: '۴۴٪ ادامه دادند', reasons: [
    { why: 'صفحهٔ اول دیر بالا می‌آید', share: 38, evidence: 'LCP موبایل ۳٫۹ ثانیه؛ ۶۱٪ خروج‌ها پیش از ۴ ثانیه', fix: 'بهینه‌سازی تصویر هیرو و بارگذاری تنبل بنرها', to: '/admin/infra', impact: 6 },
    { why: 'جست‌وجو نتیجهٔ مناسب نداد', share: 27, evidence: '۱٬۹۲۰ جست‌وجوی بی‌نتیجه؛ «ایرپاد ۴» و «کیندل» بیشترین', fix: 'افزودن مترادف و پیشنهاد «خبرم کن»', to: '/admin/seo', impact: 4 },
    { why: 'ورود از تبلیغ نامرتبط', share: 21, evidence: 'کمپین «تخفیف» با پرش ۸۲٪', fix: 'هم‌راستا کردن صفحهٔ فرود با متن تبلیغ', to: '/admin/marketing', impact: 3 },
  ] },
  { label: 'افزودن به سبد', value: 3850, note: '۱۸٪ از صفحهٔ کالا', reasons: [
    { why: 'قیمت بالاتر از ترب', share: 34, evidence: 'در ۷ کالا رقیب ارزان‌تر؛ نرخ افزودن این کالاها ۹٪ در برابر ۲۱٪', fix: 'هم‌قیمت شدن یا نمایش مزیت گارانتی کنار قیمت', to: '/admin/channels?tab=rank', impact: 9 },
    { why: 'اعتماد به استوک و جعبه‌باز', share: 29, evidence: 'خروج پس از دیدن «گرید B»؛ کلیک کم روی جزئیات ظاهری', fix: 'عکس واقعی هر ایراد و ویدیوی بررسی کوتاه', to: '/admin/readiness?tab=video', impact: 7 },
    { why: 'ناموجودی یا رنگ دلخواه نبود', share: 22, evidence: '۴۱۰ کلیک «خبرم کن» در ماه', fix: 'تأمین تنوع پرتقاضا (سفید سونی)', to: '/admin/supply', impact: 5 },
  ] },
  { label: 'شروع پرداخت', value: 2380, note: '۶۲٪ از سبد', reasons: [
    { why: 'هزینهٔ ارسال در مرحلهٔ آخر دیده شد', share: 41, evidence: '۵۸٪ رهاشده‌ها در صفحهٔ «زمان ارسال» خارج شدند', fix: 'نمایش هزینه و زمان ارسال روی صفحهٔ کالا', to: '/admin/shipping', impact: 6 },
    { why: 'ظرفیت تحویل سریع پر بود', share: 24, evidence: '«ظرفیت تحویل ۲ ساعتهٔ امروز تمام شده» ۳۱۲ بار دیده شد', fix: 'افزایش ظرفیت عصر یا جایگزین با پیک دوم', to: '/admin/shipping?tab=fast', impact: 4 },
    { why: 'ثبت‌نام و کد یک‌بارمصرف', share: 19, evidence: 'میانهٔ زمان رسیدن پیامک ۴ ثانیه؛ ۷٪ کد را وارد نکردند', fix: 'ورود با یک کلیک برای مشتری برگشتی', to: '/admin/experience', impact: 2 },
  ] },
  { label: 'خرید موفق', value: 1460, note: '۶۱٪ از پرداخت', reasons: [
    { why: 'خطا یا قطعی درگاه', share: 46, evidence: 'تارا قطع؛ ۱۸۴ پرداخت ناموفق اقساطی', fix: 'پنهان‌سازی خودکار و پیشنهاد درگاه دیگر', to: '/admin/finance?tab=gateways', impact: 5 },
    { why: 'رد اعتبار اقساطی', share: 33, evidence: 'نرخ تأیید اسنپ‌پی ۶۲٪', fix: 'نمایش پیش‌تأیید اعتبار پیش از سبد', to: '/admin/finance', impact: 3 },
  ] },
]
const WHY_BUY: { why: string; share: number; icon: typeof ShieldCheck; evidence: string }[] = [
  { why: 'گارانتی اختصاصی و QC دو مرحله‌ای', share: 34, icon: ShieldCheck, evidence: 'در نظرسنجی پس از خرید و ۲۱٪ کلیک روی «شرایط گارانتی»' },
  { why: 'قیمت کمتر از نو برای استوک', share: 27, icon: CircleDollarSign, evidence: 'میانگین ۱۸٪ ارزان‌تر از نو؛ بالاترین تبدیل در ساعت‌های عصر' },
  { why: 'تحویل ۲ ساعتهٔ تهران', share: 19, icon: Truck, evidence: '۵۶٪ سفارش‌های تهران تحویل سریع را انتخاب کردند' },
  { why: 'پرداخت اقساطی', share: 12, icon: ShoppingCart, evidence: 'میانگین سبد اقساطی ۲٫۳ برابر نقدی' },
  { why: 'دیدگاه و عکس واقعی خریداران', share: 8, icon: ThumbsUp, evidence: 'کالاهای دارای عکس خریدار ۳۷٪ تبدیل بیشتر' },
]
const TECH = [{ k: 'LCP موبایل', v: '۳٫۹ ثانیه', ok: false, goal: 'زیر ۲٫۵' }, { k: 'INP', v: '۱۸۰ میلی‌ثانیه', ok: true, goal: 'زیر ۲۰۰' }, { k: 'CLS', v: '۰٫۰۴', ok: true, goal: 'زیر ۰٫۱' }, { k: 'خطای جاوااسکریپت در پرداخت', v: '۰٫۸٪ نشست‌ها', ok: false, goal: 'زیر ۰٫۲٪' }, { k: 'سهم موبایل', v: '۷۸٪', ok: true, goal: '—' }, { k: 'زمان پاسخ API سبد', v: '۳۲۰ میلی‌ثانیه', ok: true, goal: 'زیر ۵۰۰' }]

/** تشخیص گام‌به‌گام: کجای مسیر خرید ریزش داریم، چرا، با چه شاهدی، و چه کنیم؛ و چرا مشتری‌ها می‌خرند */
export function Diagnosis() {
  const nav = useNavigate(); const [step, setStep] = useState(2); const [view, setView] = useState<'business' | 'tech'>('business')
  const cur = STEPS[step]; const prev = STEPS[step - 1]
  const lost = prev ? prev.value - cur.value : 0
  const fixes = STEPS.flatMap((s) => s.reasons.map((r) => ({ ...r, step: s.label }))).sort((a, b) => b.impact - a.impact)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Gauge size={17} />} label="نرخ تبدیل کل" value={pct(3, 1)} delta={-0.3} note="۱٬۴۶۰ خرید از ۴۸٬۲۰۰ بازدید" />
        <KPI label="بزرگ‌ترین ریزش" tone="danger" value="۸۲٪" note="از صفحهٔ کالا به سبد نمی‌رسند" />
        <KPI label="درآمد از دست‌رفته در پرداخت" tone="warning" value="۱٫۲ میلیارد" note="۹۲۰ پرداخت ناتمام × میانگین سبد" />
        <KPI label="مهم‌ترین دلیل خرید" tone="success" value="گارانتی" note="۳۴٪ خریداران" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><Segmented value={view} onChange={setView} options={[['business', 'نگاه کسب‌وکار'], ['tech', 'نگاه فنی']]} /><Button variant="ai" icon={<Sparkles size={14} />} onClick={() => askCopilot(`چرا در مرحلهٔ «${cur.label}» ریزش داریم و اول چه کنیم؟`)}>توضیح بیشتر از دستیار</Button></div>
      {view === 'business' ? <>
        <Card title="۱. قیف خرید: روی هر مرحله بزنید تا دلیل ریزشش باز شود"><AreaFunnel steps={STEPS.map((s) => ({ label: s.label, value: s.value, note: s.note }))} onPick={(i) => i > 0 && setStep(i)} /></Card>
        <Card title={<span className="flex flex-wrap items-center gap-2">۲. چرا از «{prev?.label}» به «{cur.label}» نرسیدند؟<Badge tone="danger">{fa(lost)} نفر · {fa(Math.round((lost / Math.max(1, prev?.value ?? 1)) * 100))}٪ ریزش</Badge></span>} actions={<div className="flex gap-1">{STEPS.slice(1).map((s, i) => <button key={s.label} type="button" onClick={() => setStep(i + 1)} className={cx('h-8 rounded-full border px-3 text-12', step === i + 1 ? 'border-brand bg-brand-solid text-white' : 'border-line')}>{s.label}</button>)}</div>}>
          <ol className="space-y-3">{cur.reasons.map((r, i) => (
            <li key={r.why} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-danger-solid text-11 font-bold text-white">{fa(i + 1)}</span><b className="text-13">{r.why}</b><span className="mr-auto text-12 font-semibold text-danger">{fa(r.share)}٪ از ریزش این مرحله</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-danger" style={{ width: `${r.share}%` }} /></div>
              <dl className="mt-2 grid gap-2 text-12 sm:grid-cols-2"><div><dt className="flex items-center gap-1 text-t2"><Bug size={12} />شاهد در داده</dt><dd className="mt-0.5">{r.evidence}</dd></div><div><dt className="flex items-center gap-1 text-t2"><Lightbulb size={12} />پیشنهاد</dt><dd className="mt-0.5">{r.fix} <span className="text-success">(+{fa(r.impact)}٪ تبدیل این مرحله، برآورد)</span></dd></div></dl>
              <Button size="sm" variant="ghost" className="mt-2" icon={<ChevronLeft size={13} />} onClick={() => nav(r.to)}>رفتن به همان بخش</Button>
            </li>))}</ol>
          <p className="mt-3 text-11 text-t2">روش: سهم هر دلیل از نشست‌های ریزش‌کرده با رویداد آخر صفحه، پیام خطا، نظرسنجی خروج و مقایسه با گروه خریدار محاسبه شده است. برآورد اثر بر پایهٔ آزمون‌های قبلی و ±۳۰٪ خطا دارد.</p>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="۳. چرا مشتری‌ها از ما می‌خرند">{WHY_BUY.map((w) => <div key={w.why} className="mb-3 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-bg text-success"><w.icon size={16} /></span><div className="min-w-0 flex-1"><p className="flex justify-between text-13"><b>{w.why}</b><span className="tnum font-semibold text-success">{fa(w.share)}٪</span></p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-success" style={{ width: `${w.share * 2.5}%` }} /></div><p className="mt-1 text-11 text-t2">{w.evidence}</p></div></div>)}</Card>
          <Card title="۴. اولویت اقدام (بیشترین اثر اول)">{fixes.slice(0, 6).map((f, i) => <button key={f.why} type="button" onClick={() => nav(f.to)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-right hover:border-brand/50"><span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-11 font-bold', i < 2 ? 'bg-brand-solid text-white' : 'bg-neutral-bg text-t2')}>{fa(i + 1)}</span><span className="min-w-0 flex-1"><b className="block text-13">{f.fix}</b><span className="text-11 text-t2">{f.step} · {f.why}</span></span><span className="flex items-center gap-0.5 text-12 font-semibold text-success"><ArrowDownRight size={13} className="rotate-180" />+{fa(f.impact)}٪</span></button>)}</Card>
        </div>
      </> : <div className="grid gap-4 xl:grid-cols-2">
        <Card title="سلامت فنی مسیر خرید">{TECH.map((t) => <div key={t.k} className="flex items-center justify-between border-b border-line py-2 text-13 last:border-0"><span className="flex items-center gap-2">{t.ok ? <CheckCircle2 size={15} className="text-success" /> : <Timer size={15} className="text-danger" />}{t.k}</span><span className="flex items-center gap-3"><b className={cx('tnum', !t.ok && 'text-danger')}>{t.v}</b><span className="text-11 text-t2">هدف: {t.goal}</span></span></div>)}</Card>
        <Card title="ریزش به تفکیک دستگاه و سرعت"><ul className="space-y-3 text-13">{[['موبایل، اینترنت همراه', 2.1, 'LCP ۴٫۴ ثانیه'], ['موبایل، وای‌فای', 3.2, 'LCP ۲٫۸ ثانیه'], ['دسکتاپ', 4.6, 'LCP ۱٫۹ ثانیه']].map(([k, v, n]) => <li key={k as string}><p className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Smartphone size={14} />{k}</span><b className="tnum">{pct(v as number, 1)} تبدیل</b></p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-brand" style={{ width: `${(v as number) * 20}%` }} /></div><p className="mt-0.5 text-11 text-t2">{n}</p></li>)}</ul><p className="mt-3 text-12">هر ۱ ثانیه کاهش LCP در موبایل حدود ۰٫۴ واحد درصد تبدیل اضافه کرده است (۹۰ روز اخیر).</p></Card>
      </div>}
    </div>
  )
}
