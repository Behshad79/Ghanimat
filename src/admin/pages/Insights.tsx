import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AIButton, AITag, Badge, Button, Card, Input, Progress, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Bars, Funnel, Heat, LineChart, NoData } from '@/shared/ui/charts'
import { askCopilot, Hint, toast } from '@/shared/ui/overlay'
import { mutate } from '@/shared/lib/store'
import { compactToman, fa, pct } from '@/shared/lib/fa'
import { useLookup, useTab } from './_shared'

type K = { label: string; value: string; delta?: number; hint?: string; goodDown?: boolean; note?: string }
type Item = [string, string, string?] // عنوان، توضیح، وضعیت
/** قالب مشترک ماژول‌های رشد: شاخص‌ها، فهرست کار، نمودار تصمیم‌محور و «راه گسترش» */
function Module({ id, title, sub, primary, kpis, sections, children, extend }: { id: string; title: string; sub: string; primary: string; kpis: K[]; sections: { title: string; items: Item[] }[]; children?: ReactNode; extend: string }) {
  return (
    <Page title={title} sub={sub} module={id} primary={<Button variant="primary" onClick={() => toast(`«${primary}» در نسخهٔ نمایشی جای‌گذاری شده است.`)}>{primary}</Button>}
      actions={<AIButton onClick={() => askCopilot(`وضعیت ${title} را خلاصه کن`)}>خلاصه با AI</AIButton>}
      empty={{ title: `هنوز داده‌ای برای ${title} نیست.`, desc: 'با اولین رویداد، شاخص‌ها و فهرست‌ها اینجا نمایش داده می‌شوند.' }}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map((k) => <KPI key={k.label} {...k} spark={[4, 5, 5, 6, 6, 7, k.delta && k.delta < 0 ? 5 : 8]} />)}</div>
        {children}
        <div className="grid gap-4 md:grid-cols-2">{sections.map((s) => (
          <Card key={s.title} title={s.title} pad={false}><ul className="divide-y divide-line">{s.items.map(([t, desc, st]) => (
            <li key={t} className="flex items-center justify-between gap-3 px-4 py-2.5"><div className="min-w-0"><p className="truncate text-13 font-medium">{t}</p><p className="truncate text-11 text-t3">{desc}</p></div>{st && <Badge tone={/خطا|افت|قطع|رد/.test(st) ? 'danger' : /منتظر|پیش‌نویس|هشدار|زمان‌بندی/.test(st) ? 'warning' : /به‌زودی/.test(st) ? 'neutral' : 'success'}>{st}</Badge>}</li>))}</ul></Card>))}</div>
        <p className="rounded-md border border-dashed border-line px-4 py-3 text-12 text-t2"><b className="text-t1">راه گسترش:</b> {extend}</p>
      </div>
    </Page>
  )
}

export const Supply = () => {
  const { d } = useLookup()
  return (
    <Module id="supply" title="تأمین و خرید" sub="دو مسیر تأمین: انبارگردانی آمازون و خرید مستقیم اقلیم کردستان" primary="ثبت سفارش خرید"
      kpis={[{ label: 'محمولهٔ در راه', value: fa(2), note: 'یکی ۳ روز دیرکرده است' }, { label: 'نرخ دلار مرجع', value: '+۱٫۸٪', delta: 1.8, goodDown: true, hint: 'landed' }, { label: 'نرخ مغایرت دریافت', value: pct(2.4, 1), delta: -0.6, goodDown: true }, { label: 'تقاضای برآورده‌نشده', value: `${fa(41)} درخواست` }]}
      sections={[
        { title: 'محموله‌ها', items: [['SH-118 · ۲۴ واحد', 'خرید ← مرز ← انبار مرزی ← تهران · اکنون: انبار مرزی', 'در راه'], ['SH-117 · ۱۲ واحد', 'برآورد رسیدن ۳ روز پیش بود', 'هشدار دیرکرد'], ['SH-116 · ۳۰ واحد', 'دریافت شد · ۱ مغایرت مدل ثبت شد', 'دریافت‌شده']] },
        { title: 'فرصت‌های خرید (از «خبرم کن» و جست‌وجوهای بی‌نتیجه)', items: [['AirPods Pro 2', '۱۴ نفر منتظر · حاشیهٔ برآوردی ۱۹٪', 'پیشنهاد AI'], ['PlayStation 5 Slim', '۹ جست‌وجوی بی‌نتیجه در ۷ روز', 'پیشنهاد AI'], ['iPhone 16 Pro Max', '۱۱ درخواست از دستیار خرید', 'پیشنهاد AI']] },
        { title: 'تأمین‌کنندگان', items: [['دفتر اربیل', 'کیفیت ۹۶٪ · تحویل ۹ روز · ارز: دلار', 'فعال'], ['تأمین‌کنندهٔ دبی', 'کیفیت ۹۲٪ · تحویل ۱۲ روز · ارز: درهم', 'فعال'], ['شریک انبار مهاباد', `کارنامه: نرخ «ندارم» ۴٪ · ${fa(d.syncIssues.length)} ناهماهنگی باز`, 'هشدار']] },
        { title: 'نرخ ارز و قیمت تمام‌شده', items: [['دلار', 'نرخ مرجع روز برای محموله‌های تازه', 'ثبت‌شده'], ['دینار', 'برای خرید مستقیم', 'ثبت‌شده'], ['درهم', 'نرخ امروز ثبت نشده است؛ محمولهٔ دبی قیمت‌گذاری نمی‌شود', 'خطا']] },
      ]} extend="تأمین‌کننده، منبع تأمین و برچسب مبدأ تازه از همین صفحه تعریف می‌شود؛ خواندن خودکار فاکتور (OCR) با دکمهٔ ✦ فعال می‌شود." />
  )
}

export function Content() {
  const { d, rule } = useLookup(); const [bar, setBar] = useState(`ارسال رایگان برای خریدهای بالای {آستانه_ارسال_رایگان}`)
  return (
    <Module id="content" title="محتوا و صفحات سایت" sub="هر بلوک هر صفحهٔ سایت از اینجا مدیریت می‌شود؛ با پیش‌نمایش، زمان‌بندی و نسخه‌ها." primary="ساخت صفحه یا مقاله"
      kpis={[{ label: 'صفحهٔ منتشرشده', value: fa(48) }, { label: 'پیش‌نویس', value: fa(6) }, { label: 'ناسازگاری با راهنمای نگارش', value: fa(13), note: 'اصلاح یک‌کلیکی با AI' }, { label: 'تناقض بین صفحات', value: fa(1), note: 'دو مدت گارانتی متفاوت' }]}
      sections={[
        { title: 'صفحهٔ خانه (بلوک‌ها)', items: [['Hero', 'تیتر، زیرتیتر، تصویر، دکمه · کلیک ۶٫۲٪', 'منتشرشده'], ['بلوک استوک', 'مبتنی بر قانون: استوک گرید A+', 'منتشرشده'], ['بلوک دو مسیر تأمین', 'انبارگردانی و خرید مستقیم', 'منتشرشده'], ['بلوک یلدا', 'از ۲۵ آذر تا ۱ دی', 'زمان‌بندی‌شده']] },
        { title: 'صفحات حقوقی و سیستم', items: [['قوانین و مقررات · نسخهٔ ۴', 'منتظر تأیید حقوقی؛ بدون تأیید منتشر نمی‌شود', 'منتظر تأیید'], ['حریم خصوصی · نسخهٔ ۲', 'تاریخ اعمال: ۱ مهر', 'منتشرشده'], ['صفحهٔ ۴۰۴ و ۵۰۰', 'با پیشنهاد کالا', 'منتشرشده'], ['وبلاگ: راهنمای خرید استوک', 'در حال نگارش', 'پیش‌نویس']] },
      ]} extend="بلوک صفحه، قالب لندینگ و نوع صفحهٔ تازه بدون توسعه‌دهنده تعریف می‌شود. ریزمتن‌های سایت در «مدیریت ریزمتن» قابل جست‌وجو و ویرایش است.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="نوار بالای سایت"><Input value={bar} onChange={(e) => setBar(e.target.value)} /><p className="mt-2 text-11 text-t3">پیش‌نمایش (متغیر از قوانین کسب‌وکار خوانده می‌شود):</p><p className="mt-1 rounded-md bg-[#0000ff] px-3 py-2 text-center text-12 text-white">{bar.replace('{آستانه_ارسال_رایگان}', compactToman(rule('free_shipping_threshold')))}</p></Card>
        <Card title="کلیدهای سایت (Feature Flags)">{([['maintenance', 'حالت تعمیر سایت'], ['shopAssistant', 'دستیار خرید'], ['compare', 'مقایسهٔ محصولات'], ['storeFinder', 'شعبه‌یاب'], ['sellerLink', 'لینک «فروشنده شوید»'], ['showSoon', 'نمایش برچسب‌های «به‌زودی» در پنل']] as const).map(([k, l]) => <div key={k} className="flex items-center justify-between border-b border-line py-2 text-13 last:border-0"><span>{l}{k === 'maintenance' && d.flags[k] && <span className="mr-2"><Badge tone="danger">سایت در حالت تعمیر است</Badge></span>}</span><Toggle on={d.flags[k]} label={l} onChange={(v) => { mutate((x) => { x.flags[k] = v }, { action: v ? 'روشن‌کردن' : 'خاموش‌کردن', target: l }); toast(`${l} ${v ? 'روشن' : 'خاموش'} شد.`, { undo: () => mutate((x) => { x.flags[k] = !v }) }) }} /></div>)}</Card>
      </div>
    </Module>
  )
}

export const Seo = () => (
  <Module id="seo" title="سئو" sub="منبع داده: ابزار جست‌وجو و خزش داخلی (بدون وابستگی به سرویس تحریم‌پذیر)" primary="رفع گروهی خطاها با AI"
    kpis={[{ label: 'کلیک ارگانیک', value: fa('18,420'), delta: 9.3 }, { label: 'CTR', value: pct(3.8, 1), delta: 0.4 }, { label: 'میانگین رتبه', value: fa(11.2), delta: -1.3, goodDown: true }, { label: 'صفحهٔ ایندکس‌شده', value: fa(412), delta: 2.1 }]}
    sections={[
      { title: 'سلامت فنی (اولویت بر اساس اثر)', items: [['۳۴ صفحه بدون توضیح متا', 'اثر بالا · رفع با یک کلیک', 'خطا'], ['۷ زنجیرهٔ ریدایرکت', 'کالاهای فروخته‌شده', 'هشدار'], ['۱۲ تصویر بدون Alt', 'Alt خودکار آماده است', 'هشدار'], ['نقشهٔ سایت', 'آخرین ساخت ۲ ساعت پیش', 'سالم']] },
      { title: 'فرصت‌های کلیدواژه (رتبهٔ ۴ تا ۲۰)', items: [['خرید آیفون استوک', 'رتبهٔ ۶ · ۲٬۴۰۰ جست‌وجو در ماه', 'فرصت'], ['ایرپاد مکس اصل', 'رتبهٔ ۹ · ۱٬۳۰۰ جست‌وجو', 'فرصت'], ['مک بوک ایر جعبه باز', 'رتبهٔ ۱۴ · ۵۹۰ جست‌وجو', 'فرصت']] },
    ]} extend="قالب متای مبتنی بر متغیر برای نوع صفحهٔ تازه، و منبع دادهٔ رتبهٔ تازه از «ثبت ارائه‌دهنده» اضافه می‌شود." />
)

export const Marketing = () => {
  const { d } = useLookup(); const sms = d.providers.find((p) => p.family === 'sms' && p.isDefault)!
  return (
    <Module id="marketing" title="مارکتینگ" sub="سقف پیام به هر مشتری و ساعات سکوت روی همهٔ ارسال‌ها اعمال می‌شود." primary="ساخت کمپین"
      kpis={[{ label: 'درآمد منتسب', value: compactToman(2140000000), delta: 11 }, { label: 'ROAS', value: fa(6.4), delta: 0.8, hint: 'roas' }, { label: 'CAC', value: compactToman(1280000), delta: -5.2, goodDown: true, hint: 'cac' }, { label: 'اعتبار پیامک', value: compactToman(sms.credit ?? 0), note: `حدود ${fa(Math.round((sms.credit ?? 0) / (sms.burn ?? 1)))} روز دیگر تمام می‌شود` }]}
      sections={[
        { title: 'کمپین‌ها', items: [['بازگشت مشتریان خفته', 'پیامک + بله · ۲۴۰ نفر · کد ۸٪', 'زمان‌بندی‌شده'], ['یلدای هدفون', 'بخش «علاقه‌مند به هدفون» · قالب پیامک تأیید نشده است', 'خطا'], ['خوش‌آمد', 'اتوماسیون · نرخ تبدیل ۷٫۱٪', 'فعال']] },
        { title: 'اتوماسیون‌ها', items: [['سبد رهاشده', '۳ گام · بازیابی ۱۲٪', 'فعال'], ['موجودشدن کالا', 'برای منتظران «خبرم کن»', 'فعال'], ['درخواست دیدگاه', 'پس از پایان مهلت مرجوعی', 'فعال'], ['پایان گارانتی', 'یادآور ۳۰ روز مانده', 'پیش‌نویس']] },
      ]} extend="کانال پیام‌رسانی، قالب پیام و نوع اتوماسیون تازه از همین ماژول اضافه می‌شود؛ همکاری در فروش و اینفلوئنسرها با برچسب «به‌زودی»." />
  )
}

export function Growth() {
  const [tab, setTab] = useTab('funnel'); const nav = useNavigate()
  return (
    <Page title="رشد و آزمایش" module="growth" sub="شاخص ستارهٔ شمالی: سفارش تحویل‌شدهٔ بدون مرجوعی در هفته" empty={{ title: 'داده برای تحلیل رشد کافی نیست.', desc: 'دست‌کم یک هفته داده لازم است.' }}
      primary={<Button variant="primary" onClick={() => toast('فرم آزمایش: فرضیه، شاخص اصلی و محافظ، تخصیص ترافیک.')}>ساخت آزمایش</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'funnel', label: 'قیف‌ها' }, { id: 'cohort', label: 'کوهورت و ریزش' }, { id: 'ab', label: 'آزمایش‌ها', count: 2 }]} />}>
      {tab === 'funnel' && <div className="grid gap-4 lg:grid-cols-2"><Card title="کاربران کجای قیف خرید می‌افتند؟"><Funnel onPick={(l) => toast(`فهرست کاربران افتاده در مرحلهٔ «${l}» باز شد.`)} steps={[{ label: 'بازدید', value: 33740 }, { label: 'صفحهٔ کالا', value: 20370 }, { label: 'سبد', value: 2814 }, { label: 'ورود', value: 1930 }, { label: 'نشانی', value: 1410 }, { label: 'پرداخت', value: 1036 }, { label: 'موفق', value: 707 }]} /></Card>
        <Card title="دلایل شکست پرداخت"><Bars onPick={() => nav('/admin/finance?tab=gateways')} data={[{ label: 'پرداخت ناموفق در درگاه اقساطی', value: 38 }, { label: 'انصراف کاربر', value: 27 }, { label: 'خطای درگاه', value: 18 }, { label: 'پایان زمان', value: 11 }, { label: 'موجودی ناکافی کارت', value: 6 }]} fmt={pct} color="var(--danger)" /><div className="mt-3"><AITag confidence="بالا" source="تراکنش‌های ۷ روز اخیر" /></div></Card></div>}
      {tab === 'cohort' && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="نرخ خرید تکراری" value={pct(31)} delta={2.4} /><KPI label="نرخ ریزش ۹۰ روزه" hint="churn" value={pct(44)} delta={-1.8} goodDown /><KPI label="نسبت LTV به CAC" hint="ltv" value={fa(4.2)} delta={0.3} /><KPI label="مشتری در خطر ریزش" value={fa(1)} to="/admin/customers?tab=segments" /></div>
        <Card title="نگهداشت کوهورتی (درصد خرید دوباره)"><Heat cols={['ماه ۰', 'ماه ۱', 'ماه ۲', 'ماه ۳', 'ماه ۴']} rows={[{ label: 'تیر', values: [100, 24, 17, 14, 12] }, { label: 'مرداد', values: [100, 27, 19, 15] }, { label: 'شهریور', values: [100, 29, 21] }, { label: 'مهر', values: [100, 31] }, { label: 'آبان', values: [100] }]} /></Card></div>}
      {tab === 'ab' && <div className="grid gap-4 md:grid-cols-2"><Card title="نمایش قسط ماهانه روی کارت محصول" actions={<Badge tone="success">معنادار · ۹۶٪</Badge>}><p className="text-13">نسخهٔ ب نرخ تبدیل را <b className="text-success">+۸٫۴٪</b> بالا برد. شاخص محافظ (نرخ مرجوعی) تغییری نکرد.</p><div className="mt-3 flex gap-2"><Button variant="primary" onClick={() => toast('نسخهٔ ب برای همه فعال شد.')}>فعال‌سازی نسخهٔ ب برای همه</Button><Button>بایگانی آموخته</Button></div></Card>
        <Card title="آستانهٔ ارسال رایگان ۸ در برابر ۱۰ میلیون" actions={<Badge tone="warning">دادهٔ ناکافی</Badge>}><NoData what="معناداری آماری" /></Card></div>}
    </Page>
  )
}

const REPORTS = ['عملکرد سایت', 'ورودی‌ها', 'خروجی‌ها', 'کمپین‌ها', 'فروش', 'سفارش‌ها', 'کالا و موجودی', 'ارسال', 'مرجوعی و گارانتی', 'مشتریان و رشد', 'پشتیبانی', 'مالی', 'شریک انبار', 'تیم', 'فنی']
export function Analytics() {
  const [metric, setMetric] = useState('فروش'); const [dim, setDim] = useState('وضعیت کالا'); const [tab, setTab] = useTab('explore')
  const data: Record<string, [string, number][]> = { 'وضعیت کالا': [['استوک - تست‌شده', 46], ['جعبه‌باز', 31], ['اکبند - پلمپ', 23]], انبار: [['انبار تهران', 78], ['انبار مهاباد', 22]], 'کانال تأمین': [['انبارگردانی آمازون', 64], ['خرید مستقیم اقلیم کردستان', 36]], 'روش ارسال': [['تحویل سریع', 41], ['پست پیشتاز', 33], ['پیک غنیمت', 15], ['تیپاکس', 11]] }
  return (
    <Page title="تحلیل و گزارش" module="analytics" sub="سه لایه: داشبوردهای آماده، کاوشگر آزاد، پرسش از AI" empty={{ title: 'داده‌ای در این بازه نیست.', desc: 'بازهٔ زمانی را تغییر دهید.' }}
      primary={<Button variant="primary" onClick={() => askCopilot(`${metric} به تفکیک ${dim} در این ماه چطور بوده؟`)}>پرسش از دستیار</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'explore', label: 'کاوشگر' }, { id: 'catalog', label: 'کاتالوگ گزارش‌ها', count: REPORTS.length }, { id: 'dict', label: 'فرهنگ شاخص‌ها' }]} />}>
      {tab === 'explore' && <Card title={`${metric} به تفکیک ${dim}`} actions={<><Select className="h-8 w-32" value={metric} onChange={setMetric} options={['فروش', 'تعداد سفارش', 'حاشیهٔ سود', 'نرخ مرجوعی']} /><Select className="h-8 w-36" value={dim} onChange={setDim} options={Object.keys(data)} /></>}>
        <Bars data={data[dim].map(([label, value]) => ({ label, value }))} fmt={pct} onPick={(l) => toast(`فهرست سفارش‌های «${l}» باز شد.`)} /><div className="mt-4 flex gap-2"><Button size="sm" onClick={() => toast('به داشبورد خانه اضافه شد.')}>افزودن به داشبورد</Button><Button size="sm" onClick={() => toast('ارسال هفتگی این گزارش به ایمیل زمان‌بندی شد.')}>زمان‌بندی ارسال هفتگی</Button></div></Card>}
      {tab === 'catalog' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{REPORTS.map((r) => <button key={r} onClick={() => toast(`گزارش «${r}» با فیلتر، مقایسه، خروجی و زمان‌بندی باز می‌شود.`)} className="rounded-lg border border-line bg-surface p-4 text-right hover:border-brand"><p className="text-13 font-semibold">{r}</p><p className="mt-1 text-11 text-t3">قابل فیلتر · خروجی · چاپ · زمان‌بندی</p></button>)}</div>}
      {tab === 'dict' && <Card title="فرهنگ شاخص‌ها" pad={false}><ul className="divide-y divide-line">{['gmv', 'aov', 'cvr', 'margin', 'landed', 'ltv', 'churn', 'roas', 'cac', 'csat', 'sla'].map((k) => <li key={k} className="flex items-center gap-2 px-4 py-2.5 text-13"><Hint k={k} /><span className="ltr font-mono text-12 text-t3">{k}</span><span>برای تعریف، فرمول و منبع روی علامت راهنما بزنید.</span></li>)}</ul></Card>}
    </Page>
  )
}

export function AiCenter() {
  const [lv, setLv] = useState<Record<string, string>>({ کاتالوگ: 'با تأیید', قیمت‌گذاری: 'فقط پیشنهاد', پشتیبانی: 'با تأیید', دیدگاه‌ها: 'خودکار', مالی: 'فقط پیشنهاد', 'انبار و QC': 'فقط پیشنهاد' })
  return (
    <Page title="هوش مصنوعی" module="ai" sub="انسان در حلقه برای هر اقدام اثرگذار؛ اصالت، گرید، قیمت و پول همیشه تأیید انسانی می‌خواهد." empty={{ title: 'هنوز قابلیت AI فعالی نیست.' }}>
      <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="نرخ پذیرش پیشنهادها" value={pct(71)} delta={4.2} /><KPI label="زمان صرفه‌جویی‌شده" value={`${fa(38)} ساعت`} note="در ۳۰ روز اخیر" /><KPI label="نرخ حل خودکار پشتیبانی" value={pct(22)} delta={3.1} /><KPI label="مصرف این ماه" value={pct(64)} note="سقف مصرف: با پر شدن، قابلیت‌ها به حالت دستی می‌روند" /></div>
        <Card title={<>سطح خودمختاری به تفکیک ماژول<Hint k="autonomy" /></>} pad={false}><ul className="divide-y divide-line">{Object.entries(lv).map(([m, v]) => { const locked = ['قیمت‌گذاری', 'مالی', 'انبار و QC'].includes(m); return <li key={m} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-13"><span>{m}{locked && <span className="mr-2 text-11 text-t3">اجرای خودکار در این ماژول مجاز نیست</span>}</span><Select className="h-8 w-40" value={v} onChange={(x) => { if (locked && x === 'خودکار') return toast('برای قیمت، پول و گرید، اجرای خودکار بسته است.', { tone: 'err' }); setLv({ ...lv, [m]: x }); mutate(() => {}, { action: 'تغییر سطح خودمختاری AI', target: m, after: x }) }} options={['فقط پیشنهاد', 'با تأیید', 'خودکار']} /></li> })}</ul></Card>
        <Card title="دستیار خرید سایت: درخواست‌هایی که موجودی نداشتیم"><Bars data={[{ label: 'AirPods Pro 2', value: 14 }, { label: 'iPhone 16 Pro Max', value: 11 }, { label: 'PlayStation 5 Slim', value: 9 }]} fmt={(n) => `${fa(n)} درخواست`} /><p className="mt-3 text-12 text-t2">این فهرست خودکار به «تأمین › فرصت‌های خرید» می‌رود.</p></Card></div>
    </Page>
  )
}

export const Branches = () => (
  <Module id="branches" title="شعب" sub="موجودی شعبه، دریافت حضوری و پرسش‌های شعبه" primary="افزودن شعبه"
    kpis={[{ label: 'سفارش آمادهٔ دریافت حضوری', value: fa(2) }, { label: 'پرسش بی‌پاسخ شعبه', value: fa(1) }, { label: 'فروش حضوری این ماه', value: compactToman(412000000), delta: 6.5 }, { label: 'امتیاز در نقشه‌ها', value: fa(4.6) }]}
    sections={[{ title: 'شعبه‌ها', items: [['شعبهٔ مرکزی تهران', 'شنبه تا پنجشنبه ۱۰ تا ۲۰ · تست حضوری فعال', 'باز'], ['شعبهٔ کرج', 'افتتاح برنامه‌ریزی‌شده', 'به‌زودی']] }, { title: 'صف دریافت حضوری', items: [['GH-10470', 'پیامک آمادگی ارسال شد · تحویل با کد', 'آماده'], ['GH-10466', 'در حال آماده‌سازی', 'منتظر']] }]}
    extend="شعبهٔ تازه با نشانی، ساعت کاری و خدمات از همین صفحه تعریف می‌شود و صفحهٔ آن در سایت خودکار ساخته می‌شود." />
)
export const Sellers = () => (
  <Page title="فروشندگان" module="sellers" badge={<Badge dot={false}>به‌زودی</Badge>}><Card><div className="px-6 py-16 text-center text-14 text-t2">مدیریت فروشندگان و درخواست‌های «فروشنده شوید» به‌زودی اینجا اضافه می‌شود.</div></Card></Page>
)
