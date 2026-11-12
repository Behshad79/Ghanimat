import { Bell, Check, CheckCheck, CircleX, MessageSquareReply, PackageSearch, Send, ShieldCheck } from 'lucide-react'
import { Badge, Button, Tabs } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { EntityManager, type EField } from '@/shared/ui/entity'
import { toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { mutate, notify, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { Rec } from '@/shared/data/entities'
import { useTab } from '../pages/_shared'

const tone = (s: string) => /جدید|در انتظار|باز|در حال بررسی/.test(s) ? 'warning' : /رد|نشد|نیست/.test(s) ? 'danger' : 'success'
const St = ({ v }: { v: string }) => <Badge tone={tone(v)}>{v}</Badge>
const when: EField = { k: 'at', label: 'زمان', form: false, render: (r) => <span className="text-12 text-t2">{rel(r.at ?? r.lastAt)}</span> }
const setRow = (ek: string, id: string, patch: Partial<Rec>, action: string) => mutate((x) => { const r = x.entities[ek].find((y) => y.id === id); if (r) Object.assign(r, patch) }, { action, target: id })

/** هر صفی که سایت و پنل مشتری می‌سازد (طبق فایل فیگما) و تا امروز جای مدیریت نداشت */
export function CustomerRequests() {
  const d = useDB(); const E = d.entities; const [tab, setTab] = useTab('contact')
  const open = (ek: string, re: RegExp) => (E[ek] ?? []).filter((r) => re.test(String(r.status ?? (r.sent === false ? 'باز' : '')))).length
  const tabs = [
    { id: 'contact', label: 'تماس با ما', count: open('contactMessages', /جدید|بررسی/) },
    { id: 'reports', label: 'گزارش مشکل کالا', count: open('productReports', /جدید/) },
    { id: 'stock', label: 'درخواست ورود کالا', count: open('stockRequests', /باز/) },
    { id: 'notify', label: 'خبرم کن', count: (E.notifyMe ?? []).filter((r) => !r.sent).length },
    { id: 'reminders', label: 'یادآوری ویژه‌ها', count: (E.offerReminders ?? []).filter((r) => !r.sent).length },
    { id: 'branch', label: 'پرسش از شعبه', count: open('branchInquiries', /جدید/) },
    { id: 'cancel', label: 'درخواست لغو', count: open('cancelRequests', /بررسی/) },
    { id: 'withdraw', label: 'برداشت از کیف پول', count: open('withdrawals', /انتظار/) },
    { id: 'bank', label: 'کارت و شبای مشتریان', count: open('bankAccounts', /نیست|نشد/) },
    { id: 'assistant', label: 'بازخورد دستیار خرید', count: (E.assistantFeedback ?? []).filter((r) => !r.handled).length },
  ]
  const totalOpen = tabs.reduce((a, t) => a + (t.count ?? 0), 0)
  return (
    <Page title="درخواست‌های مشتری" module="support" sub="هر فرم، دکمه و درخواستی که مشتری در سایت و پنل کاربری می‌زند اینجا یک صف قابل پیگیری دارد."
      tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Bell size={17} />} label="درخواست باز" value={fa(totalOpen)} note="در همهٔ صف‌ها" />
        <KPI icon={<PackageSearch size={17} />} label="منتظر موجود شدن" value={fa((E.notifyMe ?? []).filter((r) => !r.sent).reduce((a, r) => a + r.subscribers, 0))} note="مشترک «خبرم کن»" />
        <KPI icon={<Send size={17} />} label="برداشت در انتظار" value={toman((E.withdrawals ?? []).filter((r) => r.status === 'در انتظار').reduce((a, r) => a + r.amount, 0))} />
        <KPI icon={<ShieldCheck size={17} />} label="حساب بانکی نیازمند بررسی" value={fa(open('bankAccounts', /نیست|نشد/))} />
      </div>
      {tab === 'contact' && <EntityManager ek="contactMessages" kind="پیام" titleKey="subject" emptyDesc="پیام‌های فرم «تماس با ما» اینجا می‌آیند."
        fields={[{ k: 'name', label: 'نام', required: true }, { k: 'mobile', label: 'موبایل', ltr: true }, { k: 'email', label: 'ایمیل', ltr: true, table: false }, { k: 'subject', label: 'موضوع', type: 'select', options: (E.contactSubjects ?? []).map((x) => x.name) }, { k: 'text', label: 'متن پیام', type: 'textarea', table: false }, { k: 'reply', label: 'پاسخ', type: 'textarea', table: false }, { k: 'status', label: 'وضعیت', type: 'select', options: ['جدید', 'در حال بررسی', 'پاسخ داده‌شده', 'بسته'], render: (r) => <St v={r.status} /> }, when]}
        extraActions={(r) => [{ label: 'علامت پاسخ داده‌شده', icon: <MessageSquareReply size={14} />, onClick: () => { setRow('contactMessages', r.id, { status: 'پاسخ داده‌شده' }, 'پاسخ به پیام تماس'); toast(`پاسخ برای ${r.name} با پیامک و ایمیل ارسال شد.`) } }]} />}
      {tab === 'reports' && <EntityManager ek="productReports" kind="گزارش" titleKey="product" emptyDesc="گزارش‌های «گزارش مشکل» صفحهٔ کالا."
        fields={[{ k: 'product', label: 'کالا', required: true }, { k: 'reason', label: 'دلیل', type: 'select', options: (E.reportReasons ?? []).map((x) => x.name) }, { k: 'text', label: 'توضیح', type: 'textarea', table: false }, { k: 'reporter', label: 'گزارش‌دهنده', ltr: true }, { k: 'status', label: 'وضعیت', type: 'select', options: ['جدید', 'در حال بررسی', 'اصلاح شد', 'نادرست بود'], render: (r) => <St v={r.status} /> }, when]}
        extraActions={(r) => [{ label: 'اصلاح شد', icon: <Check size={14} />, onClick: () => { setRow('productReports', r.id, { status: 'اصلاح شد' }, 'رسیدگی به گزارش کالا'); toast('گزارش بسته شد و از گزارش‌دهنده تشکر شد.') } }]} />}
      {tab === 'stock' && <EntityManager ek="stockRequests" kind="درخواست ورود" titleKey="product" emptyDesc="درخواست‌های «درخواست ورود» برای کالاهای ناموجود."
        fields={[{ k: 'product', label: 'کالا', required: true }, { k: 'count', label: 'تعداد درخواست', type: 'number' }, { k: 'status', label: 'وضعیت', type: 'select', options: ['باز', 'در حال تأمین', 'موجود شد', 'تأمین نمی‌شود'], render: (r) => <St v={r.status} /> }, { k: 'note', label: 'یادداشت تأمین', table: false }, when]}
        extraActions={(r) => [{ label: 'ساخت سفارش خرید', icon: <PackageSearch size={14} />, onClick: () => { setRow('stockRequests', r.id, { status: 'در حال تأمین' }, 'ارجاع درخواست ورود به تأمین'); toast(`«${r.product}» به صف تأمین و خرید رفت.`) } }]} />}
      {tab === 'notify' && <EntityManager ek="notifyMe" kind="خبرم کن" titleKey="product" emptyDesc="مشترکان «موجود شد خبرم کن» و «کاهش قیمت»."
        fields={[{ k: 'product', label: 'کالا', required: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['موجود شدن', 'کاهش قیمت'] }, { k: 'subscribers', label: 'مشترک', type: 'number' }, { k: 'sent', label: 'اعلان ارسال شد', type: 'toggle' }, when]}
        extraActions={(r) => [{ label: `ارسال اعلان به ${fa(r.subscribers)} نفر`, icon: <Send size={14} />, disabled: r.sent, onClick: () => { setRow('notifyMe', r.id, { sent: true }, 'ارسال اعلان خبرم کن'); notify('اعلان «خبرم کن» ارسال شد', `${r.product} · ${fa(r.subscribers)} نفر`, '/admin/requests?tab=notify', 'بازاریابی', 'info'); toast(`اعلان «${r.kind}» برای ${fa(r.subscribers)} نفر ارسال شد.`) } }]} />}
      {tab === 'reminders' && <EntityManager ek="offerReminders" kind="یادآوری" titleKey="offer" emptyDesc="یادآوری‌های «به‌زودی در ویژه‌ها»."
        fields={[{ k: 'offer', label: 'پیشنهاد', required: true }, { k: 'startsAt', label: 'شروع', type: 'date' }, { k: 'subscribers', label: 'مشترک', type: 'number' }, { k: 'channel', label: 'کانال', type: 'select', options: ['پیامک', 'اعلان پنل', 'ایمیل'] }, { k: 'sent', label: 'ارسال شد', type: 'toggle' }]} />}
      {tab === 'branch' && <EntityManager ek="branchInquiries" kind="پرسش" titleKey="name" emptyDesc="فرم‌های «پرسش دربارهٔ موجودی» و «سؤال از شعبه»."
        fields={[{ k: 'branch', label: 'شعبه', type: 'select', options: (E.branches ?? []).map((x) => x.name).concat(['شعبهٔ تهران (ونک)', 'شعبهٔ مهاباد']).filter((v, i, a) => a.indexOf(v) === i) }, { k: 'name', label: 'نام', required: true }, { k: 'mobile', label: 'موبایل', ltr: true }, { k: 'kind', label: 'نوع', type: 'select', options: ['موجودی کالا', 'سؤال از شعبه'] }, { k: 'text', label: 'متن', type: 'textarea', table: false }, { k: 'status', label: 'وضعیت', type: 'select', options: ['جدید', 'پاسخ داده‌شده', 'بسته'], render: (r) => <St v={r.status} /> }, when]} />}
      {tab === 'cancel' && <EntityManager ek="cancelRequests" kind="درخواست لغو" titleKey="order" emptyDesc="درخواست‌های لغو کل یا بخشی از سفارش از پنل مشتری."
        fields={[{ k: 'order', label: 'سفارش', ltr: true, required: true }, { k: 'customer', label: 'مشتری' }, { k: 'scope', label: 'دامنه', type: 'select', options: ['کل سفارش', '۱ کالا', 'چند کالا'] }, { k: 'reason', label: 'دلیل' }, { k: 'refundTo', label: 'بازگشت وجه به', type: 'select', options: ['کیف پول', 'کارت بانکی'] }, { k: 'status', label: 'وضعیت', type: 'select', options: ['در حال بررسی', 'تأییدشده', 'تأیید نشد', 'بازگشت وجه ناموفق'], render: (r) => <St v={r.status} /> }, when]}
        extraActions={(r) => [
          { label: 'تأیید لغو و بازگشت وجه', icon: <CheckCheck size={14} />, disabled: r.status !== 'در حال بررسی', onClick: () => { setRow('cancelRequests', r.id, { status: 'تأییدشده' }, 'تأیید درخواست لغو'); toast(`لغو ${r.order} تأیید شد؛ وجه به ${r.refundTo} برمی‌گردد.`) } },
          { label: 'رد درخواست لغو', icon: <CircleX size={14} />, danger: true, disabled: r.status !== 'در حال بررسی', onClick: async () => { const why = await askReason({ kind: 'cancel', ref: r.id, status: 'تأیید نشد', title: `دلیل رد درخواست لغو ${r.order}` }); if (why) setRow('cancelRequests', r.id, { status: 'تأیید نشد', reason: why }, 'رد درخواست لغو') } },
        ]} />}
      {tab === 'withdraw' && <EntityManager ek="withdrawals" kind="برداشت" titleKey="id" emptyDesc="درخواست‌های برداشت از کیف پول مشتری."
        fields={[{ k: 'customer', label: 'مشتری', required: true }, { k: 'amount', label: 'مبلغ', type: 'money', required: true }, { k: 'card', label: 'کارت', ltr: true, table: false }, { k: 'iban', label: 'شبا', ltr: true }, { k: 'status', label: 'وضعیت', type: 'select', options: ['در انتظار', 'واریز شد', 'رد شد'], render: (r) => <St v={r.status} /> }, { k: 'reason', label: 'دلیل رد', table: false }, when]}
        extraActions={(r) => [
          { label: 'واریز شد', icon: <Check size={14} />, disabled: r.status !== 'در انتظار', onClick: () => { setRow('withdrawals', r.id, { status: 'واریز شد' }, 'تأیید برداشت از کیف پول'); toast(`${toman(r.amount)} به شبای ${r.customer} واریز شد.`) } },
          { label: 'رد درخواست', icon: <CircleX size={14} />, danger: true, disabled: r.status !== 'در انتظار', onClick: async () => { const why = await askReason({ kind: 'withdrawal', ref: r.id, status: 'رد شد', title: `دلیل رد برداشت ${r.id}` }); if (!why) return; setRow('withdrawals', r.id, { status: 'رد شد', reason: why }, 'رد برداشت از کیف پول'); toast('درخواست رد شد، مبلغ به کیف پول برگشت و دلیل برای مشتری نمایش داده می‌شود.') } },
        ]} />}
      {tab === 'bank' && <EntityManager ek="bankAccounts" kind="حساب بانکی" titleKey="customer" emptyDesc="کارت و شبای ثبت‌شده با استعلام مالکیت."
        fields={[{ k: 'customer', label: 'مشتری', required: true }, { k: 'card', label: 'کارت', ltr: true }, { k: 'iban', label: 'شبا', ltr: true }, { k: 'owner', label: 'صاحب حساب (استعلام)' }, { k: 'status', label: 'وضعیت', type: 'select', options: ['تأییدشده', 'در حال استعلام', 'کارت به نام کاربر نیست', 'شبا به نام کاربر نیست', 'کارت و شبا برای یک حساب نیستند', 'استعلام انجام نشد'], render: (r) => <St v={r.status} /> }, when]}
        extraActions={(r) => [{ label: 'استعلام دوباره', icon: <ShieldCheck size={14} />, onClick: () => { setRow('bankAccounts', r.id, { status: 'تأییدشده', owner: r.customer }, 'استعلام دوبارهٔ مالکیت حساب'); toast('استعلام انجام شد و مالکیت تأیید شد.') } }]} />}
      {tab === 'assistant' && <EntityManager ek="assistantFeedback" kind="بازخورد" titleKey="question" emptyDesc="بازخوردهای مثبت و منفی روی پاسخ‌های دستیار خرید."
        fields={[{ k: 'question', label: 'پرسش کاربر', required: true }, { k: 'rating', label: 'بازخورد', type: 'select', options: ['مثبت', 'منفی'], render: (r) => <Badge tone={r.rating === 'مثبت' ? 'success' : 'danger'}>{r.rating}</Badge> }, { k: 'reason', label: 'دلیل' }, { k: 'handled', label: 'بررسی شد', type: 'toggle' }, when]} />}
    </Page>
  )
}
