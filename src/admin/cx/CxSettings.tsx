import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, Textarea, Toggle, Tabs } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { EntityManager } from '@/shared/ui/entity'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { CxSettings } from '@/shared/data/cx'
import { useTab } from '../pages/_shared'

type G = Exclude<keyof CxSettings, 'notifications'>
type F = { k: string; label: string; type?: 'num' | 'text' | 'long' | 'bool'; help?: string; unit?: string }
/** فرم تنظیمات یک گروه؛ هر تغییر فوراً ذخیره و در لاگ ممیزی ثبت می‌شود */
function Config({ g, title, fields, desc }: { g: G; title: string; fields: F[]; desc?: ReactNode }) {
  const d = useDB(); const v = d.cx[g] as Record<string, unknown>
  const set = (k: string, val: unknown, log = false) => mutate((x) => { (x.cx[g] as Record<string, unknown>)[k] = val }, log ? { action: `تغییر تنظیم «${fields.find((f) => f.k === k)?.label}»`, target: title, after: String(val) } : undefined)
  return (
    <Card title={title}>{desc && <p className="-mt-1 mb-3 text-12 text-t2">{desc}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{fields.map((f) => f.type === 'bool'
        ? <label key={f.k} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line px-3 text-13">{f.label}<Toggle on={!!v[f.k]} label={f.label} onChange={(x) => set(f.k, x, true)} /></label>
        : <Field key={f.k} label={f.unit ? `${f.label} (${f.unit})` : f.label} help={f.help}>{f.type === 'long'
          ? <Textarea rows={3} value={String(v[f.k] ?? '')} onChange={(e) => set(f.k, e.target.value)} onBlur={(e) => set(f.k, e.target.value, true)} />
          : <Input type={f.type === 'num' ? 'number' : 'text'} className={f.type === 'num' ? 'ltr text-left font-mono' : ''} value={String(v[f.k] ?? '')} onChange={(e) => set(f.k, f.type === 'num' ? Number(e.target.value) : e.target.value)} onBlur={(e) => set(f.k, f.type === 'num' ? Number(e.target.value) : e.target.value, true)} />}</Field>)}</div>
    </Card>
  )
}

/** تنظیمات سایت و پنل مشتری: هر رفتار قابل تنظیمی که در فایل فیگما آمده */
export function CxSettingsPage() {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useTab('auth'); const n = d.cx.notifications
  const tabs = [['auth', 'ورود و ثبت‌نام'], ['search', 'جست‌وجو'], ['help', 'مرکز راهنما'], ['support', 'پشتیبانی و گفتگو'], ['notif', 'اعلان‌های مشتری'], ['wallet', 'کیف پول و برداشت'], ['referral', 'دعوت از دوستان'], ['reviews', 'دیدگاه و پرسش'], ['checkout', 'سبد و پرداخت'], ['assistant', 'دستیار خرید AI'], ['panel', 'پنل کاربری'], ['pages', 'صفحه‌های ثابت و خطا'], ['content', 'بلوک‌های محتوایی']].map(([id, label]) => ({ id, label }))
  return (
    <Page title="تنظیمات سایت و پنل مشتری" module="content" sub="رفتار، متن و قانون‌های هر صفحه و هر حالت سایت و پنل کاربری؛ مطابق فایل طراحی مشتری."
      actions={<><Button onClick={() => nav('/admin/site')}>ویرایش ظاهر سایت</Button><Button variant="ghost" onClick={() => nav('/admin/requests')}>درخواست‌های مشتری</Button></>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}>
      <div key={tab} className="page-enter space-y-4">
        {tab === 'auth' && <Config g="auth" title="ورود با کد یکبارمصرف و رمز عبور" desc="مسیرهای ۱ تا ۴ ورود و ثبت‌نام: شماره و کد، شماره و رمز، بازیابی رمز، کد معرف." fields={[
          { k: 'otpLength', label: 'طول کد', type: 'num', unit: 'رقم' }, { k: 'codeExpiryMinutes', label: 'اعتبار کد', type: 'num', unit: 'دقیقه' }, { k: 'resendSeconds', label: 'فعال شدن ارسال مجدد', type: 'num', unit: 'ثانیه' },
          { k: 'maxResends', label: 'سقف ارسال مجدد', type: 'num', help: 'بعد از آن حالت «محدودیت ارسال مجدد» نمایش داده می‌شود.' }, { k: 'maxAttempts', label: 'سقف تلاش کد نادرست', type: 'num', help: 'بعد از آن حالت «محدودیت تلاش».' }, { k: 'lockMinutes', label: 'مدت قفل', type: 'num', unit: 'دقیقه' },
          { k: 'passwordMin', label: 'حداقل طول رمز', type: 'num', unit: 'نویسه' }, { k: 'passwordNeedsDigit', label: 'رمز باید عدد داشته باشد', type: 'bool' }, { k: 'passwordNeedsLetter', label: 'رمز باید حرف داشته باشد', type: 'bool' },
          { k: 'allowPasswordLogin', label: 'ورود با رمز عبور', type: 'bool' }, { k: 'mergeGuestCart', label: 'ادغام سبد مهمان بعد از ورود', type: 'bool' }, { k: 'signupReferral', label: 'فیلد کد معرف در ثبت‌نام', type: 'bool' }]} />}
        {tab === 'search' && <>
          <Config g="search" title="رفتار جست‌وجو" fields={[{ k: 'placeholder', label: 'متن راهنمای جعبهٔ جست‌وجو' }, { k: 'recentCount', label: 'تعداد جست‌وجوهای اخیر', type: 'num' }, { k: 'suggestCount', label: 'تعداد پیشنهادها', type: 'num' }, { k: 'aiSearch', label: 'جست‌وجوی AI در سرچ‌بار', type: 'bool' }, { k: 'didYouMean', label: '«منظورتان … بود؟»', type: 'bool' }, { k: 'imageSearch', label: 'جست‌وجو با عکس', type: 'bool' }]} />
          <EntityManager ek="searchSynonyms" kind="مترادف" titleKey="from" fields={[{ k: 'from', label: 'عبارت کاربر', required: true }, { k: 'to', label: 'تبدیل به', required: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['مترادف', 'منظورتان … بود؟'] }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <EntityManager ek="searchSuggestions" kind="پیشنهاد" titleKey="text" fields={[{ k: 'text', label: 'متن', required: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['پرجست‌وجو', 'میان‌بر', 'پیشنهاد دسته'] }, { k: 'pinned', label: 'سنجاق‌شده', type: 'toggle' }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <EntityManager ek="zeroResults" kind="جست‌وجوی بی‌نتیجه" titleKey="query" emptyDesc="عبارت‌هایی که نتیجه نداشتند؛ برایشان مترادف یا ریدایرکت بسازید."
            fields={[{ k: 'query', label: 'عبارت', required: true }, { k: 'count', label: 'تکرار', type: 'number' }, { k: 'action', label: 'اقدام انجام‌شده' }]}
            extraActions={(r) => [{ label: 'ساخت مترادف', onClick: () => mutate((x) => { x.entities.searchSynonyms.push({ id: `sy${Date.now().toString(36)}`, from: r.query, to: '', kind: 'مترادف', active: false }); x.entities.zeroResults.find((y) => y.id === r.id)!.action = 'مترادف ساخته شد' }, { action: 'ساخت مترادف از جست‌وجوی بی‌نتیجه', target: r.query }) }]} />
        </>}
        {tab === 'help' && <>
          <EntityManager ek="helpGuides" kind="راهنما" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'slug', label: 'نشانی', ltr: true }, { k: 'group', label: 'گروه', type: 'select', options: ['خرید', 'ارسال', 'مرجوعی', 'گارانتی', 'کالا', 'پرداخت'] }, { k: 'body', label: 'متن راهنما', type: 'textarea', table: false }, { k: 'yes', label: 'مفید بود', type: 'number' }, { k: 'no', label: 'مفید نبود', type: 'number' }, { k: 'active', label: 'منتشر', type: 'toggle' }]} />
          <EntityManager ek="tutorialVideos" kind="ویدیو" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'topic', label: 'موضوع' }, { k: 'duration', label: 'مدت' }, { k: 'views', label: 'بازدید', type: 'number' }, { k: 'active', label: 'منتشر', type: 'toggle' }]} />
          <Card title="سؤالات متداول و دسته‌های وبلاگ"><p className="text-13 text-t2">پرسش‌های متداول، مقاله‌ها و متن‌های حقوقی در «محتوا و صفحات سایت» ویرایش می‌شوند.</p><Button className="mt-3" onClick={() => nav('/admin/content?tab=faqs')}>رفتن به سؤالات متداول</Button></Card>
        </>}
        {tab === 'support' && <>
          <Config g="support" title="ویجت پشتیبانی و گفتگو" fields={[{ k: 'chatEnabled', label: 'گفتگوی زنده', type: 'bool' }, { k: 'aiFirst', label: 'اول دستیار AI پاسخ دهد', type: 'bool' }, { k: 'days', label: 'روزهای کاری' }, { k: 'hours', label: 'ساعت کاری' }, { k: 'phone', label: 'تلفن پشتیبانی' }, { k: 'offlineMessage', label: 'پیام خارج از ساعت کاری', type: 'long' }, { k: 'queueMessage', label: 'پیام صف انتظار', type: 'long' }, { k: 'rateAfterClose', label: 'امتیازدهی بعد از پایان گفتگو', type: 'bool' }]} />
          <Config g="support" title="تیکت" fields={[{ k: 'autoCloseDays', label: 'بسته شدن خودکار بعد از بی‌پاسخی', type: 'num', unit: 'روز' }, { k: 'reopenDays', label: 'مهلت بازگشایی', type: 'num', unit: 'روز' }, { k: 'maxFiles', label: 'سقف پیوست', type: 'num', unit: 'فایل' }, { k: 'maxFileMb', label: 'حجم هر پیوست', type: 'num', unit: 'مگابایت' }]} />
          <EntityManager ek="ticketTopics" kind="موضوع تیکت" fields={[{ k: 'name', label: 'موضوع', required: true }, { k: 'reasons', label: 'دلیل‌ها (با ویرگول)', type: 'textarea' }, { k: 'needsOrder', label: 'انتخاب سفارش لازم است', type: 'toggle' }, { k: 'sla', label: 'مهلت پاسخ (ساعت)', type: 'number' }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <EntityManager ek="contactSubjects" kind="موضوع تماس" fields={[{ k: 'name', label: 'موضوع', required: true }, { k: 'route', label: 'ارجاع به', type: 'select', options: ['پشتیبانی', 'مالی', 'فروش', 'مدیریت'] }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <EntityManager ek="reportReasons" kind="دلیل گزارش کالا" fields={[{ k: 'name', label: 'دلیل', required: true }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
        </>}
        {tab === 'notif' && <Card title="اعلان‌های مشتری: دسته‌ها و کانال‌ها" pad={false}>
          <p className="px-5 pt-4 text-12 text-t2">پیش‌فرض هر دسته برای مشتری تازه. دسته‌های قفل‌شده را مشتری نمی‌تواند خاموش کند. سقف پیامک هفتگی: <b className="tnum">{fa(n.smsWeeklyCap)}</b></p>
          <div className="overflow-x-auto p-5"><table className="gh-table w-full text-13"><thead><tr className="text-t2"><th className="py-2 text-right font-medium">دسته</th>{(['push', 'sms', 'email'] as const).map((c) => <th key={c} className="py-2 text-center font-medium">{({ push: 'پوش', sms: 'پیامک', email: 'ایمیل' })[c]}</th>)}<th className="py-2 text-center font-medium">قفل</th></tr></thead>
            <tbody>{n.categories.map((c, i) => <tr key={c.id} className="border-t border-line"><td className="py-2">{c.label}</td>{(['push', 'sms', 'email'] as const).map((ch) => <td key={ch} className="py-2 text-center"><span className="inline-flex"><Toggle on={c[ch]} label={`${c.label} ${ch}`} onChange={(v) => mutate((x) => { x.cx.notifications.categories[i][ch] = v }, { action: 'تغییر کانال اعلان مشتری', target: c.label })} /></span></td>)}<td className="py-2 text-center"><span className="inline-flex"><Toggle on={c.locked} label="قفل" onChange={(v) => mutate((x) => { x.cx.notifications.categories[i].locked = v })} /></span></td></tr>)}</tbody></table></div>
        </Card>}
        {tab === 'wallet' && <Config g="wallet" title="کیف پول، افزایش موجودی و برداشت" fields={[{ k: 'minWithdraw', label: 'حداقل برداشت', type: 'num', unit: 'تومان' }, { k: 'withdrawDays', label: 'مدت واریز برداشت', type: 'num', unit: 'روز کاری' }, { k: 'topupMin', label: 'حداقل افزایش موجودی', type: 'num', unit: 'تومان' }, { k: 'topupMax', label: 'حداکثر افزایش موجودی', type: 'num', unit: 'تومان' }, { k: 'combinedPayment', label: 'پرداخت ترکیبی کیف پول با درگاه یا اقساط', type: 'bool' }, { k: 'giftCardWithCode', label: 'کارت هدیه و کد تخفیف هم‌زمان', type: 'bool' }, { k: 'refundDefault', label: 'مقصد پیش‌فرض بازگشت وجه' }]} />}
        {tab === 'referral' && <Config g="referral" title="دعوت از دوستان" fields={[{ k: 'active', label: 'فعال', type: 'bool' }, { k: 'inviterReward', label: 'هدیهٔ دعوت‌کننده', type: 'num', unit: 'تومان' }, { k: 'inviteeReward', label: 'هدیهٔ دعوت‌شده', type: 'num', unit: 'تومان' }, { k: 'minFirstOrder', label: 'حداقل خرید اول', type: 'num', unit: 'تومان' }, { k: 'rewardAfter', label: 'زمان واریز هدیه' }]} />}
        {tab === 'reviews' && <Config g="reviews" title="دیدگاه و پرسش" fields={[{ k: 'needPurchase', label: 'فقط خریداران دیدگاه بنویسند', type: 'bool' }, { k: 'editRequiresReapproval', label: 'ویرایش دیدگاه منتشرشده دوباره تأیید شود', type: 'bool' }, { k: 'aiSummary', label: 'خلاصهٔ دیدگاه‌ها با AI', type: 'bool' }, { k: 'maxPhotos', label: 'سقف عکس هر دیدگاه', type: 'num' }, { k: 'maxVideos', label: 'سقف ویدیو', type: 'num' }, { k: 'rewardAmount', label: 'هدیهٔ دیدگاه تأییدشده', type: 'num', unit: 'تومان' }]} />}
        {tab === 'checkout' && <>
          <Config g="checkout" title="سبد خرید، ارسال و پرداخت" fields={[{ k: 'maxQtyPerItem', label: 'سقف تعداد هر کالا در سبد', type: 'num' }, { k: 'suggestAlternatives', label: 'پیشنهاد جایگزین برای کالای ناموجود', type: 'bool' }, { k: 'showLaterBuy', label: '«بعداً می‌خرم»', type: 'bool' }, { k: 'recipientOther', label: 'تحویل به شخص دیگر', type: 'bool' }, { k: 'pickupInBranch', label: 'دریافت حضوری از شعبه', type: 'bool' }, { k: 'twoHourCities', label: 'شهرهای تحویل ۲ ساعته' }, { k: 'paymentTimeoutMin', label: 'مهلت پرداخت', type: 'num', unit: 'دقیقه' }, { k: 'maxPaymentAttempts', label: 'سقف تلاش پرداخت', type: 'num' }]} />
          <EntityManager ek="cartServices" kind="خدمت قابل افزودن" fields={[{ k: 'name', label: 'نام خدمت', required: true }, { k: 'price', label: 'قیمت', type: 'number' }, { k: 'unit', label: 'واحد قیمت', type: 'select', options: ['تومان', 'درصد قیمت کالا'] }, { k: 'categories', label: 'دسته‌های مجاز' }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <Card title="درگاه‌ها، اقساط، مناطق و بازه‌های ارسال"><div className="flex flex-wrap gap-2"><Button onClick={() => nav('/admin/finance?tab=gateways')}>درگاه‌ها و سرویس‌های اقساطی</Button><Button onClick={() => nav('/admin/shipping?tab=zones')}>مناطق و بازه‌های ارسال</Button><Button onClick={() => nav('/admin/pricing?tab=codes')}>کد تخفیف و کارت هدیه</Button></div></Card>
        </>}
        {tab === 'assistant' && <>
          <Config g="assistant" title="دستیار خرید AI" fields={[{ k: 'name', label: 'نام دستیار' }, { k: 'tone', label: 'لحن' }, { k: 'greeting', label: 'پیام شروع', type: 'long' }, { k: 'showFloating', label: 'دکمهٔ شناور روی صفحه‌ها', type: 'bool' }, { k: 'handoff', label: 'انتقال به پشتیبانی انسانی', type: 'bool' }]} />
          <EntityManager ek="assistantPrompts" kind="پیش‌نوشته" titleKey="text" fields={[{ k: 'text', label: 'متن', required: true }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
        </>}
        {tab === 'panel' && <EntityManager ek="panelCards" kind="کارت خلاصهٔ فعالیت" fields={[{ k: 'name', label: 'کارت', required: true }, { k: 'priority', label: 'اولویت نمایش', type: 'number' }, { k: 'active', label: 'نمایش', type: 'toggle' }]} emptyDesc="کارت‌های «خلاصهٔ فعالیت‌ها» در خانهٔ پنل کاربری." />}
        {tab === 'pages' && <>
          <EntityManager ek="staticPages" kind="صفحه" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'slug', label: 'نشانی', ltr: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['صفحهٔ محتوایی', 'صفحهٔ فرم', 'صفحهٔ شعب', 'صفحهٔ فهرست کالا'] }, { k: 'body', label: 'محتوا', type: 'textarea', table: false }, { k: 'updated', label: 'به‌روزرسانی', type: 'date' }, { k: 'active', label: 'منتشر', type: 'toggle' }]} />
          <EntityManager ek="errorPages" kind="صفحهٔ خطا" titleKey="title" fields={[{ k: 'code', label: 'کد', required: true }, { k: 'title', label: 'عنوان', required: true }, { k: 'body', label: 'متن', type: 'textarea' }, { k: 'cta', label: 'دکمه' }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
        </>}
        {tab === 'content' && <>
          <EntityManager ek="sourcingRoutes" kind="مسیر تأمین" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'subtitle', label: 'زیرعنوان' }, { k: 'text', label: 'توضیح', type: 'textarea', table: false }, { k: 'perks', label: 'مزیت‌ها' }, { k: 'active', label: 'نمایش', type: 'toggle' }]} emptyDesc="بلوک «کالا از کجا می‌آید؟» صفحهٔ خانه." />
          <EntityManager ek="trustItems" kind="مزیت" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'text', label: 'توضیح', type: 'textarea' }, { k: 'active', label: 'نمایش', type: 'toggle' }]} emptyDesc="بلوک «چرا غنیمت؟»." />
          <EntityManager ek="testimonials" kind="نظر مشتری" fields={[{ k: 'name', label: 'نام', required: true }, { k: 'product', label: 'کالا' }, { k: 'title', label: 'عنوان' }, { k: 'text', label: 'متن', type: 'textarea', table: false }, { k: 'active', label: 'نمایش', type: 'toggle' }]} />
          <EntityManager ek="instagramPosts" kind="پست اینستاگرام" titleKey="title" fields={[{ k: 'title', label: 'عنوان', required: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['ریلز', 'پست'] }, { k: 'url', label: 'نشانی', ltr: true }, { k: 'active', label: 'نمایش', type: 'toggle' }]} />
          <EntityManager ek="blogCategories" kind="دستهٔ وبلاگ" fields={[{ k: 'name', label: 'نام', required: true }, { k: 'slug', label: 'نشانی', ltr: true }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
          <Config g="newsletter" title="خبرنامه و کد تخفیف هفته" fields={[{ k: 'title', label: 'عنوان' }, { k: 'text', label: 'متن', type: 'long' }, { k: 'note', label: 'یادداشت زیر فرم' }, { k: 'weeklyCode', label: 'کد تخفیف هفته' }]} />
        </>}
      </div>
    </Page>
  )
}
