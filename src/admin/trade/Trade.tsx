import { useNavigate } from 'react-router-dom'
import { Building2, Check, FileCheck2, Landmark, Lock, PackageCheck, Receipt, Ship, Warehouse } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

type Mod = 'docs' | 'imports' | 'product' | 'warehouse' | 'finance'
/** هر بخش: چه چیزی در پنل عوض می‌شود وقتی فعال شود */
const MODS: { k: Mod; icon: typeof Ship; title: string; where: string; changes: string[] }[] = [
  { k: 'docs', icon: FileCheck2, title: 'کارت بازرگانی و اسناد', where: 'همین صفحه و «اسناد و قراردادها»', changes: ['ثبت شمارهٔ کارت، اتاق صادرکننده، تاریخ صدور و انقضا با یادآوری تمدید', 'چک‌لیست مدارک بازرگانی و وضعیت هر کدام', 'نمایش کارت بازرگانی در اطلاعات فروشنده روی فاکتور رسمی'] },
  { k: 'imports', icon: Ship, title: 'مسیر واردات رسمی', where: 'تأمین و خرید ← سفارش‌ها و محموله‌ها', changes: ['فیلدهای ثبت سفارش در سامانهٔ جامع تجارت (NTSW)، کد رهگیری تأمین ارز، شمارهٔ کوتاژ اظهارنامه', 'ارزش گمرکی، حقوق ورودی (حقوق گمرکی + سود بازرگانی) و ارزش افزودهٔ گمرکی برای هر محموله', 'حقوق ورودی در قیمت تمام‌شدهٔ هر قلم پخش می‌شود'] },
  { k: 'product', icon: PackageCheck, title: 'اطلاعات قانونی کالا', where: 'فرم کالا ← گام «وضعیت و منبع»', changes: ['کد تعرفهٔ گمرکی (HS)، شناسهٔ کالا (ایران‌کد یا GTIN) و کد رهگیری کالا', 'شمارهٔ رجیستری همتا برای گوشی و تبلت', 'کشور سازنده'] },
  { k: 'warehouse', icon: Warehouse, title: 'انبار و سامانهٔ جامع انبارها', where: 'محموله‌ها و رسید انبار', changes: ['شناسهٔ رسید یا حوالهٔ سامانهٔ جامع انبارها برای هر محموله', 'یادآوری ثبت ورود و خروج کالای دارای شناسه'] },
  { k: 'finance', icon: Receipt, title: 'مالی و مالیات', where: 'محموله‌ها، سود من و گزارش مالیات', changes: ['ارزش افزودهٔ پرداختی در گمرک جدا و به‌عنوان اعتبار مالیاتی (سامانهٔ مؤدیان) نمایش داده می‌شود', 'هزینه‌های ترخیص در بهای تمام‌شده و سود هر محموله'] },
]
/** مدارک رایج دریافت کارت بازرگانی (طبق منابع عمومی؛ پیش از اقدام با اتاق بازرگانی تطبیق دهید) */
const DOCS: [string, string][] = [
  ['nid', 'کارت ملی و شناسنامهٔ متقاضی (برای حقوقی: مدیرعامل)'], ['mil', 'کارت پایان خدمت یا معافیت (آقایان)'], ['age', 'حداقل ۲۳ سال سن'],
  ['place', 'سند مالکیت یا اجاره‌نامهٔ رسمی محل فعالیت (دفتر یا انبار)'], ['bank', 'گواهی حساب جاری و حسن اعتبار بانکی'], ['tax', 'کد اقتصادی و ثبت‌نام در سامانهٔ مؤدیان'],
  ['clear', 'گواهی عدم سوءپیشینه'], ['course', 'گواهی دورهٔ آموزشی اتاق بازرگانی (در صورت الزام)'], ['company', 'برای حقوقی: اساسنامه، روزنامهٔ رسمی و آگهی آخرین تغییرات'], ['ntsw', 'ثبت‌نام در سامانهٔ جامع تجارت پس از صدور کارت'],
]

/** امور بازرگانی: تا فعال نشود هیچ بخشی از پنل تغییر نمی‌کند؛ با فعال‌شدن هر بخش، فیلدها و قاعده‌های همان بخش اضافه می‌شود */
export function TradePage() {
  const d = useDB(); const nav = useNavigate(); const T = d.storeCfg.trade
  const set = (fn: (t: typeof T) => void, action: string) => mutate((x) => { fn(x.storeCfg.trade) }, { action, target: 'امور بازرگانی' })
  const days = T.card.expires ? Math.round((new Date(T.card.expires).getTime() - Date.now()) / 864e5) : null
  return (
    <Page title="امور بازرگانی" module="trade" sub="برای وقتی که کارت بازرگانی گرفتیم و واردات رسمی انجام می‌دهیم. تا فعال نشود، هیچ چیزی در پنل عوض نمی‌شود."
      badge={<Badge tone={T.on ? 'success' : 'neutral'}>{T.on ? 'فعال' : 'غیرفعال'}</Badge>}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className={cx('grid size-11 place-items-center rounded-xl', T.on ? 'bg-success-bg text-success' : 'bg-neutral-bg text-t3')}>{T.on ? <Building2 size={20} /> : <Lock size={20} />}</span>
            <div><b className="text-14">{T.on ? 'امور بازرگانی فعال است' : 'هنوز کارت بازرگانی نداریم'}</b><p className="text-12 text-t2">{T.on ? `${fa(Object.values(T.modules).filter(Boolean).length)} از ${fa(MODS.length)} بخش روشن است. هر بخش را جدا روشن کنید.` : 'پنل مثل الان کار می‌کند: خرید از مسیر فعلی (آمازون، اربیل) بدون ثبت سفارش و ترخیص رسمی.'}</p></div></div>
          <Toggle on={T.on} onChange={async (v) => { if (v && !(await confirm({ title: 'فعال‌کردن امور بازرگانی', body: 'بعد از فعال‌کردن، هر بخش را جدا روشن کنید. تا بخشی روشن نشود، چیزی در آن تغییر نمی‌کند.', confirm: 'فعال کن' }))) return; set((t) => { t.on = v; if (!v) Object.keys(t.modules).forEach((k) => { t.modules[k as Mod] = false }) }, v ? 'فعال‌کردن امور بازرگانی' : 'غیرفعال‌کردن امور بازرگانی و همهٔ بخش‌ها') }} text="امور بازرگانی" />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {MODS.map((m) => { const on = T.on && T.modules[m.k]; const Icon = m.icon
          return <Card key={m.k} className={cx(!T.on && 'opacity-60')} title={<span className="flex items-center gap-2"><Icon size={16} />{m.title}</span>} actions={<Toggle on={on} disabled={!T.on} label={m.title} onChange={(v) => set((t) => { t.modules[m.k] = v }, `${v ? 'روشن' : 'خاموش'} کردن «${m.title}»`)} />}>
            <p className="mb-2 text-11 text-t2">محل تغییر: {m.where}</p>
            <ul className="space-y-1 text-12">{m.changes.map((c) => <li key={c} className="flex items-start gap-1.5"><Check size={13} className={cx('mt-0.5 shrink-0', on ? 'text-success' : 'text-t3')} />{c}</li>)}</ul>
            {!T.on && <p className="mt-2 text-11 text-t3">برای روشن‌کردن، اول «امور بازرگانی» را بالای صفحه فعال کنید.</p>}
          </Card> })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><Landmark size={16} />کارت بازرگانی</span>} className={cx(!(T.on && T.modules.docs) && 'opacity-60')}>
          <fieldset disabled={!(T.on && T.modules.docs)} className="grid gap-3 sm:grid-cols-2">
            <Field label="نوع کارت"><Segmented value={T.card.kind} onChange={(v) => set((t) => { t.card.kind = v }, 'تغییر نوع کارت بازرگانی')} options={[['حقیقی', 'حقیقی'], ['حقوقی', 'حقوقی (شرکت)']]} /></Field>
            <Field label="شمارهٔ کارت"><Input className="ltr text-left" value={T.card.no} onChange={(e) => set((t) => { t.card.no = e.target.value }, 'ثبت شمارهٔ کارت بازرگانی')} /></Field>
            <Field label="نام دارنده"><Input value={T.card.holder} onChange={(e) => set((t) => { t.card.holder = e.target.value }, 'ثبت دارندهٔ کارت')} /></Field>
            <Field label="اتاق صادرکننده"><Input value={T.card.chamber} onChange={(e) => set((t) => { t.card.chamber = e.target.value }, 'ثبت اتاق صادرکننده')} /></Field>
            <Field label="تاریخ صدور"><Input type="date" value={T.card.issuedAt} onChange={(e) => set((t) => { t.card.issuedAt = e.target.value }, 'ثبت تاریخ صدور کارت')} /></Field>
            <Field label="تاریخ انقضا" help={days !== null ? (days < 0 ? 'کارت منقضی شده است.' : `${fa(days)} روز مانده؛ ۳۰ روز پیش از انقضا اعلان تمدید می‌آید.`) : 'کارت اول معمولاً یک‌ساله است و تمدیدها طولانی‌تر.'}><Input type="date" value={T.card.expires} onChange={(e) => set((t) => { t.card.expires = e.target.value }, 'ثبت تاریخ انقضای کارت')} /></Field>
          </fieldset>
        </Card>
        <Card title="چک‌لیست مدارک دریافت کارت" actions={<Badge dot={false}>{fa(DOCS.filter(([k]) => T.docs[k]).length)} از {fa(DOCS.length)}</Badge>}>
          <ul className="space-y-1.5">{DOCS.map(([k, l]) => <li key={k}><label className="flex cursor-pointer items-start gap-2 text-12"><input type="checkbox" className="mt-0.5" checked={!!T.docs[k]} onChange={() => set((t) => { t.docs[k] = !t.docs[k] }, `${T.docs[k] ? 'برداشتن' : 'تیک'} مدرک بازرگانی`)} />{l}</label></li>)}</ul>
          <p className="mt-2 text-11 text-t2">این چک‌لیست همین الان هم قابل استفاده است تا مدارک را از قبل آماده کنید. فهرست نهایی و هزینه را از اتاق بازرگانی بپرسید؛ منابع عمومی دربارهٔ مدت اعتبار و هزینه یکسان نیستند. فایل مدارک را در <button type="button" className="text-brand underline" onClick={() => nav('/admin/vault')}>اسناد و قراردادها</button> نگه دارید.</p>
        </Card>
      </div>

      <Card className="mt-4" title="مسیر واردات رسمی بعد از دریافت کارت (برای برنامه‌ریزی)">
        <ol className="grid gap-2 text-12 sm:grid-cols-2 lg:grid-cols-4">{['ثبت‌نام و ثبت سفارش در سامانهٔ جامع تجارت (NTSW) با پیش‌فاکتور فروشنده', 'تأمین ارز از مسیر تعیین‌شده در ثبت سفارش و دریافت کد رهگیری', 'حمل، بیمهٔ باربری و رسیدن به گمرک', 'اظهار در گمرک با کد تعرفه (HS)، ارزیابی و پرداخت حقوق ورودی و ارزش افزوده', 'ترخیص (پروانهٔ سبز گمرکی) و رفع تعهد ارزی', 'ثبت ورود به انبار در سامانهٔ جامع انبارها با شناسهٔ کالا', 'رجیستری همتا برای گوشی و تبلت پیش از فروش', 'فروش با فاکتور رسمی و ثبت در سامانهٔ مؤدیان'].map((t, i) => <li key={t} className="flex gap-2 rounded-xl border border-line p-2.5"><b className="tnum grid size-6 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">{fa(i + 1)}</b>{t}</li>)}</ol>
        <p className="mt-3 text-11 text-t2">جزئیات (نرخ حقوق ورودی هر کد تعرفه، کالاهای مشمول شناسهٔ کالا، روش تأمین ارز) مدام تغییر می‌کند؛ پیش از هر واردات از سامانهٔ جامع تجارت و ترخیص‌کار بپرسید.</p>
        <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => nav('/admin/supply?tab=ledger')}>سفارش‌ها و محموله‌ها</Button><Button size="sm" variant="ghost" onClick={() => nav('/admin/vault')}>اسناد و قراردادها</Button></div>
      </Card>
    </Page>
  )
}
