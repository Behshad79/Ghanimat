import { useNavigate } from 'react-router-dom'
import { ArrowUpLeft, Database, Lightbulb, Sigma, Sparkles } from 'lucide-react'
import { Button, cx } from './base'
import { askCopilot, Drawer } from './overlay'
import { Area } from './charts'
import { signedPct } from '../lib/fa'
import type { ReactNode } from 'react'
import { GoalEdit, goalKeyOf } from './goal'

type Src = { source: string; formula: string; to: string; tips: string[] }
/** این عدد از کجا می‌آید: منبع داده، روش محاسبه، صفحهٔ جزئیات و پیشنهاد بهبود (بر اساس عنوان کارت) */
const MAP: [RegExp, Src][] = [
  [/فروش.*(امروز|دوره|ماه|ماهانه)|درآمد|^فروش/, { source: 'سفارش‌های پرداخت‌شده (بدون لغوشده و مرجوعی کامل) از سایت، فروش اجتماعی، ثبت دستی و شعب', formula: 'جمع مبلغ نهایی سفارش‌ها پس از تخفیف، بدون هزینهٔ ارسال', to: '/admin/orders', tips: ['کالاهای پربازدید با نرخ تبدیل پایین را در «تحلیل ← تشخیص» بررسی کنید.', 'یادآوری سبد مانده و سفارش پرداخت‌نشده را در «پیامک و پیگیری مشتری» روشن نگه دارید.', 'برای کالای راکد بالای ۳۰ روز کمپین تایمردار بسازید.'] }],
  [/سود|حاشیه/, { source: 'فروش هر واحد منهای قیمت تمام‌شده (خرید، ارز، گمرک، حمل) از کارت واحد و صورت‌حساب‌ها', formula: 'فروش − بهای تمام‌شده − کارمزد درگاه و اقساط − هزینهٔ ارسال رایگان − تخفیف', to: '/admin/finance?tab=profit', tips: ['کالاهای زیر کف حاشیه را در «میز قیمت‌گذاری» علامت‌دار ببینید.', 'سهم اقساطی‌ها بالا باشد کارمزد سود را می‌خورد؛ کف مبلغ اقساط را بررسی کنید.'] }],
  [/سفارش.*(منتظر|معوق|اقدام)|منتظر تأیید موجودی|بستهٔ منتظر/, { source: 'سفارش‌ها و مرسوله‌هایی که منتظر یک اقدام انسانی هستند', formula: 'تعداد سفارش در وضعیت پرداخت‌شده، نیاز به تصمیم، مشکوک یا دارای رویداد باز', to: '/admin/orders?tab=action', tips: ['صف را از قدیمی‌ترین شروع کنید؛ مهلت‌ها در «مرکز عملیات زنده» شمارش معکوس دارند.'] }],
  [/سفارش|AOV|میانگین سبد/, { source: 'جدول سفارش‌ها', formula: 'تعداد سفارش (یا میانگین مبلغ هر سفارش = فروش ÷ تعداد سفارش)', to: '/admin/orders', tips: ['پیشنهاد کالای مکمل در سبد، میانگین سبد را بالا می‌برد.', 'ارسال رایگان از یک مبلغ مشخص را با «ماشین‌حساب ارسال» بسنجید.'] }],
  [/تبدیل/, { source: 'جلسه‌های سایت (رویدادهای بازدید) و سفارش‌های پرداخت‌شده', formula: 'سفارش پرداخت‌شده ÷ جلسهٔ یکتا × ۱۰۰', to: '/admin/analytics?tab=funnel', tips: ['بزرگ‌ترین ریزش قیف را در «قیف‌ها» پیدا کنید.', 'هشدار فیلترشکن در پرداخت را روشن نگه دارید تا پرداخت‌های ناموفق کم شود.'] }],
  [/مرجوعی/, { source: 'درخواست‌های مرجوعی ثبت‌شده در پنل کاربری، تماس و ثبت دستی', formula: 'تعداد کالای مرجوعی ÷ کالای تحویل‌شده در همان دوره × ۱۰۰', to: '/admin/returns', tips: ['دلیل غالب مرجوعی را در «ارسال ← تحلیل» ببینید؛ «مغایرت با صفحهٔ کالا» یعنی عکس و توضیح باید دقیق‌تر شود.', 'برای کالاهای استوک ویدیوی بررسی بگذارید.'] }],
  [/تحویل به‌موقع|SLA|مهلت/, { source: 'زمان واقعی تحویل هر مرسوله در برابر وعدهٔ داده‌شده', formula: 'مرسولهٔ تحویل‌شده در مهلت ÷ کل تحویل‌شده × ۱۰۰', to: '/admin/shipping?tab=stats', tips: ['ظرفیت بازه‌های پرتقاضا را در «زمان ارسال و ظرفیت» بالا ببرید.', 'ساعت قطع سفارش را با زمان واقعی بسته‌بندی هماهنگ کنید.'] }],
  [/موجودی|واحد|انبار|QC|عکاسی|انتشار/, { source: 'واحدهای سریال‌دار و کالاهای تعدادی همهٔ انبارها (تهران، شعب و شرکا)', formula: 'تعداد واحد در وضعیت مربوط؛ ارزش = جمع بهای تمام‌شدهٔ آن واحدها', to: '/admin/warehouse', tips: ['واحدهای بیش از ۳ روز در صف QC یا عکاسی را اولویت دهید؛ هر روز تأخیر فروش از دست می‌رود.', 'از «جانمایی کالا» برای کنار هم گذاشتن کالاهای مشابه استفاده کنید.'] }],
  [/مشتری|LTV|ریزش|وفادار/, { source: 'پروندهٔ مشتریان و سفارش‌هایشان', formula: 'تعداد مشتری یکتا یا ارزش طول عمر = جمع خرید هر مشتری', to: '/admin/customers', tips: ['بخش «در خطر ریزش» را با سیاست «مشتری بی‌فعالیت» و کد اختصاصی برگردانید.', 'باشگاه مشتریان را فعال نگه دارید.'] }],
  [/کیف پول|برداشت|تسویه|بدهی|طلب|سهم/, { source: 'تراکنش‌های کیف پول، صورت‌حساب شعب و سرویس‌های اقساطی', formula: 'جمع مانده‌ها یا خالص بدهی و طلب در دورهٔ جاری', to: '/admin/finance', tips: ['تسویه‌های منتظر تأیید دوم را دیر نکنید؛ اعتماد شرکا به همین وابسته است.'] }],
  [/بازدید|جلسه|آنلاین|بازدیدکننده/, { source: 'رویدادهای بازدید سایت (بدون ربات و اعضای تیم)', formula: 'تعداد بازدید صفحه یا بازدیدکنندهٔ یکتا در بازهٔ انتخابی', to: '/admin/analytics?tab=audience', tips: ['جست‌وجوهای بی‌نتیجه را به مترادف یا تأمین تبدیل کنید.', 'مقاله‌های پربازدید وبلاگ را به کالا لینک دهید.'] }],
  [/پیامک|ارسال|پیام/, { source: 'گزارش پیامک‌ها و سیاست‌های پیگیری خودکار', formula: 'تعداد پیام ارسال‌شده و سهم خرید پس از پیام', to: '/admin/messaging', tips: ['پیام کوتاه‌تر از ۷۰ نویسه یک بخش حساب می‌شود و ارزان‌تر است.'] }],
  [/تیکت|پشتیبانی|پاسخ/, { source: 'تیکت‌ها و گفتگوهای پشتیبانی', formula: 'تعداد تیکت باز یا میانگین زمان اولین پاسخ', to: '/admin/support', tips: ['قالب «درخواست اطلاعات بیشتر» زمان رسیدگی را کوتاه می‌کند.', 'سؤالات تکراری را به مرکز راهنما اضافه کنید.'] }],
  [/دیدگاه|پرسش|امتیاز/, { source: 'دیدگاه‌ها و پرسش‌های کالاها', formula: 'تعداد مورد منتظر تأیید یا میانگین امتیاز', to: '/admin/reviews', tips: ['پرسش‌های بی‌پاسخ را از خریداران قبلی بپرسید.'] }],
  [/کمیسیون|شعبه|شریک|امانی/, { source: 'محموله‌های شعب و قرارداد هر شریک', formula: 'بر اساس مدل سرمایه: امانی (کمیسیون شعبه)، کالای شریک (کارمزد غنیمت)، مشترک (به نسبت سهم)', to: '/admin/sellers', tips: ['سقف ارزش کالای امانی هر شعبه را با ودیعه‌اش هماهنگ کنید.'] }],
]
const FALLBACK: Src = { source: 'دادهٔ همین صفحه', formula: 'شمارش یا جمع موارد نمایش‌داده‌شده در همین بخش', to: '', tips: ['برای جزئیات بیشتر از دستیار بپرسید یا در «کاوشگر» گزارش دلخواه بسازید.'] }
export const kpiSource = (label: string) => MAP.find(([r]) => r.test(label))?.[1] ?? FALLBACK

export function KpiDetail({ open, onClose, label, value, delta, spark, note, to }: { open: boolean; onClose: () => void; label: string; value: ReactNode; delta?: number; spark?: number[]; note?: string; to?: string }) {
  const nav = useNavigate(); const s = kpiSource(label); const target = to || s.to
  return (
    <Drawer open={open} onClose={onClose} title={label} footer={<>{target && <Button variant="primary" icon={<ArrowUpLeft size={14} />} onClick={() => { onClose(); nav(target) }}>رفتن به جزئیات و منبع</Button>}<Button variant="ghost" icon={<Sparkles size={14} />} onClick={() => { onClose(); askCopilot(`«${label}» را تحلیل کن و بگو چطور بهتر شود.`) }}>تحلیل با دستیار</Button></>}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-2 p-4"><p className="tnum text-28 font-bold">{value}</p>{delta !== undefined && <p className={cx('tnum mt-1 text-12', delta >= 0 ? 'text-success' : 'text-danger')}>{signedPct(delta)} نسبت به دورهٔ قبل</p>}{note && <p className="mt-1 text-12 text-t2">{note}</p>}</div>
        {goalKeyOf(label) && <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-12"><span>هدف این شاخص</span><GoalEdit k={goalKeyOf(label)!} /></div>}
        {spark && spark.length > 1 && <div><p className="mb-1 text-12 font-semibold">روند</p><Area data={spark} h={110} /></div>}
        <div className="space-y-2 text-13">
          <p className="flex gap-2"><Database size={15} className="mt-0.5 shrink-0 text-brand" /><span><b className="block text-12 text-t2">این عدد از کجا می‌آید</b>{s.source}</span></p>
          <p className="flex gap-2"><Sigma size={15} className="mt-0.5 shrink-0 text-brand" /><span><b className="block text-12 text-t2">روش محاسبه</b>{s.formula}</span></p>
        </div>
        <div><p className="mb-2 flex items-center gap-1.5 text-12 font-semibold"><Lightbulb size={14} className="text-[#e0a100]" />پیشنهاد برای بهتر شدن</p><ul className="space-y-1.5 text-12 leading-6">{s.tips.map((t) => <li key={t} className="rounded-xl border border-line px-3 py-2">{t}</li>)}</ul></div>
      </div>
    </Drawer>
  )
}
