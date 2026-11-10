import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Flame, Link2, ShoppingCart, Sparkles, Star, X, Zap } from 'lucide-react'
import { AIButton, AITag, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Segmented, StatusBadge, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page, Timeline } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { Hint, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, snapshot } from '@/shared/lib/store'
import { compactToman, fa, num, pct, rel, toman, g } from '@/shared/lib/fa'
import { CONDITION, SOURCE, WAREHOUSE } from '@/shared/data/statuses'
import type { DB } from '@/shared/data/seed'
import { Cell, Money, useLookup, useTab } from './_shared'

type P = DB['products'][number]; type U = DB['units'][number]
const stock = (d: DB, p: P) => p.mode === 'qty' ? (p.qty!.tehran + p.qty!.mahabad) : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length

/** کارت محصول سایت؛ همهٔ بج‌ها از قانون‌ها و پارامترها خوانده می‌شوند، نه متن ثابت (بخش ۶.۴) */
export function ProductCard({ p, u, compact: mini, hover, out }: { p: P; u?: U; compact?: boolean; hover?: boolean; out?: boolean }) {
  const { d, rule, defaultBnpl } = useLookup()
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 2400); return () => clearInterval(t) }, [])
  const on = (id: string) => d.cardBadges.find((b) => b.id === id)?.on
  const price = u?.price || p.price || 0
  const bn = defaultBnpl()
  const rot = [
    on('low') && stock(d, p) <= rule('low_stock_threshold') && 'موجودی محدود',
    on('origin') && u?.source === 'amazon' && 'خریداری‌شده از آمازون',
    on('bnpl') && bn && `پرداخت ${fa(bn.installments ?? rule('installments_shown'))} قسطه ${bn.name}`,
  ].filter(Boolean) as string[]
  const fast = on('fast') && p.fastEligible && (u ? u.warehouse === 'tehran' : (p.qty?.tehran ?? 0) > 0) && !out
  const off = Math.round((1 - price / p.priceNew) * 100)
  return (
    <div className={cx('relative w-full overflow-hidden rounded-lg border bg-white text-[#10123d]', hover ? 'border-[#0000ff] shadow-float' : 'border-[#e6e8f0]', mini ? 'max-w-[170px]' : 'max-w-[232px]', out && 'opacity-70')}>
      <div className="relative grid aspect-square place-items-center bg-[#f5f6fa] text-11 text-[#8a90a2]">{u && u.condition !== 'sealed' ? 'عکس واقعی همین واحد' : 'تصویر مدل'}
        {fast && <span className="absolute top-2 right-2 flex items-center gap-1 rounded-sm bg-[#0000ff] px-1.5 py-0.5 text-11 font-medium text-white"><Zap size={11} />تحویل {fa(rule('fast_delivery_hours'))} ساعته</span>}
        {on('hot') && p.cvr > 2.5 && <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-[#fff3e8] text-[#b45309]"><Flame size={13} /></span>}
        {hover && !out && <span className="absolute inset-x-2 bottom-2 flex h-8 items-center justify-center gap-1 rounded-md bg-[#0000ff] text-12 font-medium text-white"><ShoppingCart size={13} />افزودن به سبد خرید</span>}
      </div>
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center justify-between text-11">
          {u && u.condition !== 'sealed' ? <span className="rounded-sm bg-[#f3eeff] px-1.5 py-0.5 text-[#6d28d9]">{u.condition === 'used' ? 'استوک' : 'جعبه باز'} · {g(u.grade)}</span> : <span />}
          {p.reviews >= 5 && <span className="tnum flex items-center gap-0.5"><Star size={11} className="fill-[#f5a623] text-[#f5a623]" />{fa(p.rating)}</span>}
        </div>
        <p className="line-clamp-2 min-h-10 text-13 leading-5 font-medium">{p.title}</p>
        {!mini && rot.length > 0 && !out && <p key={tick} className="anim-fade h-5 truncate text-11 text-[#5a5e78]">{rot[tick % rot.length]}</p>}
        {out ? <p className="pt-1 text-13 font-semibold text-[#8a90a2]">ناموجود</p> : (
          <>
            {off >= 3 && <p className="text-11 text-[#5a5e78]">قیمت نو: <span className="tnum">{num(p.priceNew)}</span> · <b className="text-[#14804a]">{fa(off)}٪ ارزان‌تر</b></p>}
            <p className="tnum text-left text-14 font-bold">{num(price)} <span className="text-11 font-normal">تومان</span></p>
          </>
        )}
      </div>
    </div>
  )
}

export function Catalog() {
  const { d, product } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useTab('products')
  const pcols: Col<P>[] = [
    { key: 'title', title: 'محصول', render: (p) => <Cell thumb={p.en} a={p.title} b={<span className="ltr">{p.en}</span>} />, sort: (p) => p.title, text: (p) => p.title },
    { key: 'cat', title: 'دسته', hideMobile: true, render: (p) => p.category, sort: (p) => p.category, text: (p) => p.category },
    { key: 'mode', title: <>نگهداری<Hint k="product_unit" /></>, hideMobile: true, render: (p) => <Badge dot={false}>{p.mode === 'serial' ? 'واحد سریال‌دار' : 'موجودی تعدادی'}</Badge> },
    { key: 'stock', title: 'موجود', align: 'left', render: (p) => { const n = stock(d, p); return <span className={n === 0 ? 'text-danger' : ''}>{fa(n)}</span> }, sort: (p) => stock(d, p), text: (p) => stock(d, p) },
    { key: 'views', title: 'بازدید', align: 'left', hideMobile: true, render: (p) => num(p.views), sort: (p) => p.views, text: (p) => p.views },
    { key: 'cvr', title: <>نرخ تبدیل<Hint k="cvr" /></>, align: 'left', hideMobile: true, render: (p) => pct(p.cvr, 1), sort: (p) => p.cvr },
    { key: 'health', title: 'سلامت محتوا', hideMobile: true, render: (p) => <div className="flex w-24 items-center gap-2"><Progress value={p.health} tone={p.health > 80 ? 'success' : p.health > 60 ? 'warning' : 'danger'} /><span className="tnum text-11">{fa(p.health)}</span></div>, sort: (p) => p.health },
    { key: 'seller', title: 'فروشنده', optional: true, render: (p) => p.seller },
    { key: 'status', title: 'وضعیت', render: (p) => <StatusBadge s={p.status} />, sort: (p) => p.status },
  ]
  const ucols: Col<U>[] = [
    { key: 'id', title: 'واحد', render: (u) => <CopyId v={u.id} />, sort: (u) => u.id, text: (u) => u.id },
    { key: 'p', title: 'محصول', render: (u) => <Cell a={product(u.productId).en} b={u.color} />, text: (u) => product(u.productId).en },
    { key: 'serial', title: 'سریال', hideMobile: true, render: (u) => <CopyId v={u.serial} />, text: (u) => u.serial },
    { key: 'cond', title: 'وضعیت کالا', render: (u) => `${CONDITION[u.condition]} · ${g(u.grade)}`, sort: (u) => u.condition },
    { key: 'wh', title: 'انبار', hideMobile: true, render: (u) => WAREHOUSE[u.warehouse], sort: (u) => u.warehouse },
    { key: 'price', title: 'قیمت فروش', align: 'left', render: (u) => u.price ? <Money v={u.price} /> : <span className="text-warning">بدون قیمت</span>, sort: (u) => u.price, text: (u) => u.price },
    { key: 'margin', title: <>حاشیه<Hint k="margin" /></>, align: 'left', hideMobile: true, render: (u) => u.price ? pct(((u.price - u.cost) / u.price) * 100, 1) : '—', sort: (u) => (u.price - u.cost) / (u.price || 1) },
    { key: 'age', title: 'سن موجودی', hideMobile: true, render: (u) => { const dd = Math.round((Date.now() - new Date(u.received).getTime()) / 864e5); return <span className={dd > 30 ? 'text-warning' : ''}>{fa(dd)} روز</span> }, sort: (u) => u.received },
    { key: 'st', title: 'چرخهٔ عمر', render: (u) => <StatusBadge s={u.status} />, sort: (u) => u.status },
  ]
  const decide = (id: string, ok: boolean) => { mutate((x) => { const q = x.partnerQueue.find((y) => y.id === id)!; x.products.find((p) => p.id === q.productId)!.status = ok ? 'product.published' : 'product.rejected'; x.partnerQueue = x.partnerQueue.filter((y) => y.id !== id) }, { action: ok ? 'تأیید کالای شریک' : 'رد کالای شریک', target: id }); toast(ok ? 'کالا تأیید و منتشر شد. شریک با اعلان خبردار شد.' : 'کالا رد شد و دلیل برای شریک ارسال شد.') }
  return (
    <Page title="کالا و کاتالوگ" module="catalog" sub="محصول یعنی مدل؛ واحد یعنی یک نمونهٔ فیزیکی با سریال و عکس خودش."
      empty={{ title: 'هنوز محصولی ثبت نشده است.', desc: 'سریع‌ترین راه: لینک، نام یا بارکد کالا را بدهید تا پیش‌نویس کامل ساخته شود.', action: <Button variant="primary" onClick={() => nav('/admin/catalog/import')}>واردکردن محصول از لینک</Button> }}
      primary={<Button variant="primary" icon={<Link2 size={14} />} onClick={() => nav('/admin/catalog/import')}>واردکردن محصول از لینک</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'products', label: 'محصولات', count: d.products.length }, { id: 'units', label: 'واحدها', count: d.units.length }, { id: 'partner', label: 'صف تأیید کالاهای شریک', count: d.partnerQueue.length }, { id: 'card', label: 'قوانین کارت محصول' }, { id: 'more', label: 'دسته‌ها، برندها و مجموعه‌ها' }]} />}>
      {tab === 'products' && <DataTable name="محصولات" rows={d.products} cols={pcols} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/catalog/${p.id}`)} search={(p) => `${p.title} ${p.en} ${p.brand}`} empty={{ title: 'هنوز محصولی ثبت نشده است.' }}
        bulk={(ids, clear) => <><Button size="sm" onClick={() => { const undo = snapshot(); mutate((x) => x.products.filter((p) => ids.includes(p.id)).forEach((p) => (p.status = 'product.draft')), { action: 'خروج از فروش', target: `${ids.length} محصول` }); toast(`${fa(ids.length)} محصول از فروش خارج شد.`, { undo }); clear() }}>خروج {fa(ids.length)} محصول از فروش</Button><AIButton size="sm" onClick={() => { toast('پیش‌نویس اصلاح محتوا ساخته شد و منتظر بازبینی شماست.'); clear() }}>اصلاح محتوا با AI</AIButton></>} />}
      {tab === 'units' && <DataTable name="واحدها" rows={d.units} cols={ucols} rowKey={(u) => u.id} onRow={(u) => nav(`/admin/catalog/unit/${u.id}`)} search={(u) => `${u.id} ${u.serial} ${product(u.productId).en}`} empty={{ title: 'هنوز واحدی دریافت نشده است.', desc: 'واحدها با دریافت محموله در انبار ساخته می‌شوند.' }} />}
      {tab === 'partner' && (d.partnerQueue.length === 0 ? <Card><EmptyState title="صف تأیید خالی است." desc="کالاهای جدید و تغییرهای محتوایی شریک انبار پیش از انتشار اینجا می‌آیند." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">{d.partnerQueue.map((q) => { const p = product(q.productId); return (
          <Card key={q.id} title={<>{q.kind}<StatusBadge s={q.status} /></>} actions={<span className="text-11 text-t3">{rel(q.at)}</span>}>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-md bg-neutral-bg p-3 text-12"><p className="mb-1 text-11 text-t3">قبل</p>{q.kind === 'کالای جدید' ? 'در کاتالوگ نبود.' : p.title}</div><div className="rounded-md bg-success-bg p-3 text-12"><p className="mb-1 text-11 text-t3">بعد (پیشنهاد شریک)</p>{p.title}</div></div>
            <p className="mt-2 text-12 text-t2">{q.note}</p><div className="mt-2"><AITag confidence="بالا" source="بازبین محتوا" /></div>
            <div className="mt-3 flex gap-2"><Button variant="primary" onClick={() => decide(q.id, true)}>تأیید و انتشار</Button><Button onClick={() => toast('درخواست اصلاح برای شریک ارسال شد.')}>درخواست اصلاح</Button><Button variant="danger" onClick={() => decide(q.id, false)}>رد کالا</Button></div>
          </Card>) })}</div>))}
      {tab === 'card' && <CardRules />}
      {tab === 'more' && <div className="grid gap-4 md:grid-cols-3">{[['دسته‌بندی‌ها', 'درخت دسته‌ها، قالب ویژگی، فیلترها و مگامنوی هر دسته.', d.products.map((p) => p.category)], ['برندها', 'صفحهٔ برند، لوگو و قالب متا.', d.products.map((p) => p.brand)], ['مجموعه‌ها', 'دستی یا مبتنی بر قانون؛ مثل «نتایج استوک».', ['استوک‌های گرید A+', 'هدفون‌های زیر ۳۰ میلیون', 'تازه‌رسیده‌ها']]].map(([t, desc, list]) => (
        <Card key={t as string} title={t} actions={<Button size="sm" onClick={() => toast('فرم افزودن در نسخهٔ نمایشی جای‌گذاری شده است.')}>افزودن</Button>}><p className="mb-2 text-12 text-t2">{desc as string}</p><div className="flex flex-wrap gap-1">{[...new Set(list as string[])].map((x) => <Badge key={x} dot={false}>{x}</Badge>)}</div></Card>))}</div>}
    </Page>
  )
}

function CardRules() {
  const { d, defaultBnpl } = useLookup(); const [ctx, setCtx] = useState<'desktop' | 'hover' | 'mobile' | 'out'>('desktop')
  const p = d.products[0]; const u = d.units[0]
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card title="بج‌ها و قانون نمایش" actions={<Button size="sm" onClick={() => toast('فرم تعریف بج جدید: متن، آیکون، رنگ، شرط، اولویت و محل.')}>تعریف بج جدید</Button>} pad={false}>
        <ul className="divide-y divide-line">{d.cardBadges.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3"><Toggle on={b.on} label={b.label} onChange={(v) => mutate((x) => { x.cardBadges.find((y) => y.id === b.id)!.on = v }, { action: v ? 'روشن‌کردن بج' : 'خاموش‌کردن بج', target: b.label })} />
            <div className="min-w-0 flex-1"><p className="text-13 font-medium">{b.label}{b.rotate && <Badge dot={false}>چرخشی</Badge>}</p><p className="text-11 text-t3">شرط نمایش: {b.rule}</p></div></li>))}</ul>
        <p className="border-t border-line px-4 py-3 text-11 text-t3">متن‌های داخل {'{ }'} متغیرند و از «قوانین کسب‌وکار» و سرویس اقساطی پیش‌فرض ({defaultBnpl()?.name ?? 'تعریف نشده'}) خوانده می‌شوند. با حذف یا تغییر سرویس، این متن خودکار عوض می‌شود.</p>
      </Card>
      <Card title="پیش‌نمایش زندهٔ کارت" className="self-start">
        <Segmented size="sm" value={ctx} onChange={setCtx} options={[['desktop', 'عادی'], ['hover', 'هاور'], ['mobile', 'موبایل فشرده'], ['out', 'ناموجود']]} />
        <div className="mt-3 flex justify-center"><ProductCard p={p} u={u} hover={ctx === 'hover'} compact={ctx === 'mobile'} out={ctx === 'out'} /></div>
        <p className="mt-3 text-11 leading-5 text-t3">چرا «تحویل سریع» نمایش داده می‌شود؟ واحد در انبار تهران است، کلاس کالا عادی است و ساعت قطع سفارش نگذشته است.</p>
      </Card>
    </div>
  )
}

const PTABS = ['اطلاعات پایه', 'مشخصات', 'محتوا', 'رسانه', 'واحدها', 'قیمت', 'ارسال و خدمات', 'گارانتی', 'سئو', 'عملکرد', 'تاریخچه']
export function ProductDetail() {
  const { id } = useParams(); const { d } = useLookup(); const nav = useNavigate(); const [tab, setTab] = useState(PTABS[0]); const [dirty, setDirty] = useState(0)
  const p = d.products.find((x) => x.id === id)
  if (!p) return <Page title="محصول پیدا نشد" back="/admin/catalog"><Card><EmptyState title="محصولی با این شناسه نیست." /></Card></Page>
  const units = d.units.filter((u) => u.productId === p.id)
  const checks: [string, boolean][] = [['مشخصات کامل', p.health > 60], ['دست‌کم یک واحد با QC تأییدشده', units.some((u) => ['unit.ready', 'unit.published'].includes(u.status)) || p.mode === 'qty'], ['عکس واقعی واحد برای استوک و جعبه‌باز', p.health > 50], ['قیمت بالاتر از قیمت تمام‌شده', units.every((u) => !u.price || u.price > u.cost)], ['عنوان و توضیح متا', p.health > 70]]
  const publish = () => { if (checks.some((c) => !c[1])) return toast('انتشار انجام نشد. موارد ناقص چک‌لیست انتشار را کامل کنید.', { tone: 'err' }); mutate((x) => { x.products.find((y) => y.id === p.id)!.status = 'product.published' }, { action: 'انتشار محصول', target: p.en }); toast('محصول منتشر شد.') }
  return (
    <Page module="catalog" back="/admin/catalog" title={p.title} badge={<StatusBadge s={p.status} />} sub={<span className="ltr">{p.en}</span>}
      actions={<AIButton onClick={() => toast('پیشنهادهای محتوا ساخته شد؛ در تب «محتوا» بازبینی کنید.')}>تکمیل با AI</AIButton>}
      primary={p.status === 'product.published' ? <Button variant="primary" disabled={!dirty} onClick={() => { setDirty(0); toast('تغییرها ذخیره شد.') }}>ذخیرهٔ تغییرها</Button> : <Button variant="primary" onClick={publish}>انتشار محصول</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={PTABS.map((t) => ({ id: t, label: t, count: t === 'واحدها' ? units.length : undefined }))} />}>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <Card>
          {tab === 'اطلاعات پایه' && <div className="grid max-w-[720px] gap-4 sm:grid-cols-2" onChange={() => setDirty(dirty + 1)}>
            <div className="sm:col-span-2"><Field label="عنوان فارسی" help="تا دو خط روی کارت محصول نمایش داده می‌شود."><Input defaultValue={p.title} /></Field></div>
            <Field label="عنوان انگلیسی"><Input className="ltr text-left" defaultValue={p.en} /></Field><Field label="برند"><Input defaultValue={p.brand} /></Field>
            <Field label="دسته"><Input defaultValue={p.category} /></Field><Field label="فروشنده" help="در فاز مارکت‌پلیس قابل تغییر می‌شود."><Input disabled defaultValue={p.seller} /></Field>
            <Field label="قیمت مرجع کالای نو (تومان)" help="ردیف «قیمت نو» و درصد ارزان‌تر روی کارت از این عدد ساخته می‌شود."><Input className="ltr text-left font-mono" defaultValue={p.priceNew.toLocaleString('en-US')} /></Field>
            <Field label="نمایش در کانال‌های فروش"><div className="flex h-9 items-center gap-2"><Toggle on={p.torob} label="ترب" onChange={(v) => mutate((x) => { x.products.find((y) => y.id === p.id)!.torob = v })} /><span className="text-13">{d.providers.find((x) => x.id === 'torob')?.name}</span></div></Field>
          </div>}
          {tab === 'محتوا' && <div className="max-w-[720px] space-y-4" onChange={() => setDirty(dirty + 1)}>
            <Field label="معرفی کوتاه" help="اختصاصی نوشته شود؛ متن منبع کپی نشود."><Textarea rows={3} defaultValue={`${p.title} با کنترل کیفیت دو مرحله‌ای و عکس واقعی هر واحد در غنیمت عرضه می‌شود.`} /></Field>
            <AITag confidence="متوسط" source="صفحهٔ سازنده" /><div className="flex gap-2"><Button size="sm" variant="primary" onClick={() => toast('متن پیشنهادی اعمال شد.', { undo: () => {} })}>اعمال</Button><Button size="sm">ویرایش</Button><Button size="sm" variant="ghost">رد</Button><Button size="sm" variant="ghost">بازتولید</Button></div>
          </div>}
          {tab === 'واحدها' && (units.length ? <ul className="divide-y divide-line">{units.map((u) => <li key={u.id}><button onClick={() => nav(`/admin/catalog/unit/${u.id}`)} className="flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-right hover:text-brand"><span><CopyId v={u.id} /> · {CONDITION[u.condition]} · گرید {g(u.grade)} · {WAREHOUSE[u.warehouse]}</span><span className="flex items-center gap-2">{u.price > 0 && <Money v={u.price} compact />}<StatusBadge s={u.status} /></span></button></li>)}</ul> : <EmptyState title="این محصول موجودی تعدادی دارد." desc={`انبار تهران: ${fa(p.qty?.tehran ?? 0)} عدد · انبار مهاباد: ${fa(p.qty?.mahabad ?? 0)} عدد`} />)}
          {tab === 'سئو' && <div className="max-w-[720px] space-y-4"><Field label="عنوان متا" help="از قالب متای دسته ساخته شده است؛ می‌توانید اختصاصی کنید."><Input defaultValue={`خرید ${p.title} | غنیمت`} /></Field><div className="rounded-md border border-line p-3"><p className="ltr text-left text-11 text-success">ghanimat.example › product › {p.id}</p><p className="text-14 text-brand">خرید {p.title} | غنیمت</p><p className="text-12 text-t2">کالای اصل با عکس واقعی، کنترل کیفیت دو مرحله‌ای و مهلت مرجوعی {fa(d.rules.find((r) => r.key === 'return_days')!.value)} روزه.</p></div><p className="text-12 text-t2">سیاست واحد فروخته‌شده: صفحهٔ محصول پایدار می‌ماند و «ناموجود + خبرم کن + مشابه‌ها» نمایش داده می‌شود.</p></div>}
          {tab === 'عملکرد' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['بازدید', num(p.views)], ['نرخ تبدیل', pct(p.cvr, 1)], ['امتیاز', fa(p.rating)], ['دیدگاه', fa(p.reviews)], ['علاقه‌مندی', fa(Math.round(p.views / 31))], ['«خبرم کن»', fa(Math.round(p.views / 140))]].map(([l, v]) => <div key={l} className="rounded-md bg-neutral-bg p-3"><p className="text-11 text-t3">{l}</p><p className="tnum text-16 font-bold">{v}</p></div>)}</div>}
          {tab === 'تاریخچه' && <Timeline items={[{ at: new Date(Date.now() - 36e5).toISOString(), who: 'دستیار غنیمت', text: 'معرفی کوتاه پیشنهاد شد.', tone: 'ai' }, { at: new Date(Date.now() - 864e5 * 3).toISOString(), who: 'هستی', text: 'محصول ساخته شد.', tone: 'ok' }]} />}
          {!['اطلاعات پایه', 'محتوا', 'واحدها', 'سئو', 'عملکرد', 'تاریخچه'].includes(tab) && <EmptyState title={`تب «${tab}»`} desc="ساختار این تب در مشخصات آمده و در مرحلهٔ بعدی ساخت کامل می‌شود. فیلدهای اثرگذار روی کارت و صفحهٔ کالا در تب‌های دیگر در دسترس است." />}
        </Card>
        <div className="space-y-4">
          <Card title="چک‌لیست انتشار"><ul className="space-y-1.5">{checks.map(([l, ok]) => <li key={l} className="flex items-center gap-2 text-12">{ok ? <Check size={14} className="text-success" /> : <X size={14} className="text-danger" />}<span className={ok ? '' : 'text-danger'}>{l}</span></li>)}</ul></Card>
          <Card title="پیش‌نمایش کارت"><div className="flex justify-center"><ProductCard p={p} u={units.find((u) => u.status === 'unit.published')} out={stock(d, p) === 0} /></div></Card>
        </div>
      </div>
      {dirty > 0 && <div className="no-print fixed inset-x-0 bottom-16 z-20 mx-auto flex w-fit items-center gap-3 rounded-lg bg-[#10123d] px-4 py-2 text-12 text-white shadow-float lg:bottom-4">{fa(dirty)} تغییر ذخیره‌نشده<Button size="sm" variant="primary" onClick={() => { setDirty(0); toast('تغییرها ذخیره شد.') }}>ذخیرهٔ تغییرها</Button><button onClick={() => setDirty(0)}>دور ریختن</button></div>}
    </Page>
  )
}

export function UnitDetail() {
  const { id } = useParams(); const { d, product } = useLookup(); const [price, setPrice] = useState<string | null>(null)
  const u = d.units.find((x) => x.id === id)
  if (!u) return <Page title="واحد پیدا نشد" back="/admin/catalog?tab=units"><Card><EmptyState title="واحدی با این شناسه نیست." desc="بارکد را دوباره اسکن کنید یا سریال را جست‌وجو کنید." /></Card></Page>
  const p = product(u.productId); const floor = d.rules.find((r) => r.key === 'margin_floor')!.value
  const save = () => { const n = Number((price ?? '').replace(/\D/g, '')); if (n < u.cost) return toast(`قیمت از قیمت تمام‌شده (${toman(u.cost)}) کمتر است. ذخیره نشد.`, { tone: 'err' }); if (n < u.price / 5 || n > u.price * 5 && u.price) return toast('این قیمت با قیمت قبلی فاصلهٔ زیادی دارد؛ احتمال جاافتادن یا اضافه‌شدن صفر. عدد را بررسی کنید.', { tone: 'err' }); const m = ((n - u.cost) / n) * 100; const undo = snapshot(); mutate((x) => { x.units.find((y) => y.id === u.id)!.price = n }, { action: 'تغییر قیمت واحد', target: u.id, before: toman(u.price), after: toman(n) }); setPrice(null); toast(m < floor ? `قیمت ذخیره شد، ولی حاشیه (${pct(m, 1)}) زیر کف ${pct(floor)} است و به تأیید مدیر رفت.` : 'قیمت جدید ذخیره شد.', { undo }) }
  return (
    <Page module="catalog" back="/admin/catalog?tab=units" title={<span className="ltr font-mono">{u.id}</span>} badge={<StatusBadge s={u.status} />} sub={`${p.title} · ${u.color}`}
      primary={u.status === 'unit.ready' ? <Button variant="primary" onClick={() => { mutate((x) => { x.units.find((y) => y.id === u.id)!.status = 'unit.published' }, { action: 'انتشار واحد', target: u.id }); toast('واحد منتشر شد.') }}>انتشار واحد</Button> : u.status === 'unit.published' ? <Button onClick={() => { const undo = snapshot(); mutate((x) => { x.units.find((y) => y.id === u.id)!.status = 'unit.ready' }, { action: 'توقف فروش واحد', target: u.id }); toast('فروش این واحد متوقف شد.', { undo }) }}>توقف فروش واحد</Button> : undefined}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="شناسنامهٔ واحد"><Row k="سریال / IMEI"><CopyId v={u.serial} /></Row><Row k="وضعیت کالا">{CONDITION[u.condition]}</Row><Row k={<>گرید ظاهری<Hint k="grade" /></>}>{g(u.grade)}</Row><Row k="انبار">{WAREHOUSE[u.warehouse]}</Row><Row k="قفسه"><span className="ltr font-mono">{u.shelf}</span></Row><Row k="سن موجودی">{fa(Math.round((Date.now() - new Date(u.received).getTime()) / 864e5))} روز</Row>
          <p className="mt-3 mb-1 text-11 font-medium text-t3">ایرادهای ظاهری</p>{u.flaws.length ? u.flaws.map((f) => <Badge key={f} tone="warning">{f}</Badge>) : <span className="text-12 text-t2">ایرادی ثبت نشده است.</span>}
          <p className="mt-3 text-11 text-t3">عکس واقعی واحد با AI «بهتر از واقعیت» نمی‌شود؛ روتوش ایراد ظاهری مسدود است.</p></Card>
        <Card title="قیمت و حاشیه"><Row k={<>قیمت تمام‌شده<Hint k="landed" /></>}><Money v={u.cost} /></Row><Row k="قیمت فروش">{u.price ? <Money v={u.price} /> : <span className="text-warning">بدون قیمت</span>}</Row><Row k={<>حاشیهٔ سود<Hint k="margin" /></>}>{u.price ? pct(((u.price - u.cost) / u.price) * 100, 1) : '—'}</Row><Row k="قیمت مرجع کالای نو"><Money v={p.priceNew} /></Row>
          {price === null ? <Button className="mt-2" onClick={() => setPrice(String(u.price || ''))}>تغییر قیمت</Button> : <div className="mt-2 flex gap-2"><Input autoFocus className="ltr text-left font-mono" inputMode="numeric" value={price ? Number(price.replace(/\D/g, '')).toLocaleString('en-US') : ''} onChange={(e) => setPrice(e.target.value)} /><Button variant="primary" onClick={save}>ذخیرهٔ قیمت جدید</Button></div>}
          <div className="mt-3 rounded-md bg-brand-tint/50 p-2 text-12"><p className="flex items-center gap-1 font-medium text-brand"><Sparkles size={12} />قیمت پیشنهادی: {compactToman(Math.round(u.cost * 1.22 / 1e5) * 1e5)}</p><p className="text-11 text-t3">بر اساس قیمت بازار و سن موجودی · اطمینان: متوسط · تأیید انسانی لازم است</p></div></Card>
        <Card title="مسیر واردات"><Timeline items={[{ at: u.received, text: 'ورود به انبار و ثبت واحد', tone: 'ok' }, { at: new Date(new Date(u.received).getTime() - 864e5 * 2).toISOString(), text: 'انبار مرزی', tone: 'ok' }, { at: new Date(new Date(u.received).getTime() - 864e5 * 6).toISOString(), text: 'ارسال بین‌المللی', tone: 'ok' }, { at: new Date(new Date(u.received).getTime() - 864e5 * 9).toISOString(), text: `خرید از مبدأ · ${SOURCE[u.source]} · QC مرحلهٔ اول`, tone: 'ok' }]} /></Card>
      </div>
    </Page>
  )
}

/** واردکردن محصول از لینک با نمای مقایسه، ویرایش با دستور و نمرهٔ یکتایی (بخش ۶.۴) */
export function ImportLink() {
  const nav = useNavigate(); const [url, setUrl] = useState(''); const [st, setSt] = useState<'idle' | 'reading' | 'done' | 'err' | 'dup'>('idle'); const [msg, setMsg] = useState('')
  const [text, setText] = useState('آیپد ایر ۱۱ اینچی با تراشهٔ M2 برای کار روزمره، طراحی و تماشای ویدیو سبک و پرقدرت است. نمایشگر Liquid Retina رنگ‌ها را دقیق نشان می‌دهد و باتری آن یک روز کاری کامل دوام می‌آورد.'); const [cmd, setCmd] = useState(''); const [uniq, setUniq] = useState(71); const [acc, setAcc] = useState<Record<string, boolean>>({})
  const read = async (v = url) => {
    if (!/^https?:\/\/|^B0\w{8}$/.test(v.trim())) { setSt('err'); return setMsg('لینک نامعتبر است. لینک صفحهٔ کالا، ASIN یا بارکد را وارد کنید.') }
    if (/iphone/i.test(v)) { setSt('dup'); return }
    setSt('reading'); try { await fakeCall(true, 1200); setSt('done') } catch { setSt('err'); setMsg('منبع در دسترس نیست یا دسترسی را مسدود کرده است. چند دقیقهٔ دیگر تلاش کنید یا مشخصات را دستی وارد کنید.') }
  }
  const rows: [string, string, string, string][] = [['عنوان', 'Apple iPad Air 11-inch (M2) Wi-Fi 128GB - Blue', 'تبلت اپل iPad Air 11 M2 ظرفیت ۱۲۸ گیگابایت', 'بالا'], ['برند', 'Apple', 'اپل', 'بالا'], ['نمایشگر', '11" Liquid Retina, 2360x1640', '۱۱ اینچ Liquid Retina، ۲۳۶۰ در ۱۶۴۰', 'بالا'], ['وزن', '1.02 lb', '۴۶۲ گرم', 'متوسط'], ['دسته', 'Tablets', 'تبلت', 'بالا'], ['باتری', 'Up to 10 hours (دو منبع متفاوت)', '۱۰ ساعت', 'پایین']]
  return (
    <Page module="catalog" back="/admin/catalog" title="واردکردن محصول از لینک" sub="لینک دیجی‌کالا، آمازون یا سایت سازنده را بدهید. گارانتی، قیمت و موجودی هرگز از منبع کپی نمی‌شود."
      primary={st === 'done' ? <Button variant="primary" onClick={() => { toast('پیش‌نویس محصول ذخیره شد و تا تأیید انسانی منتشر نمی‌شود.'); nav('/admin/catalog/p6') }}>ذخیرهٔ پیش‌نویس محصول</Button> : undefined}>
      <Card className="mb-4"><form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); read() }}><Input className="ltr text-left font-mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… یا ASIN مثل B0D3J6L2ZC" /><Button variant="primary" loading={st === 'reading'}>خواندن و ساخت پیش‌نویس</Button></form>
        <div className="mt-2 flex flex-wrap gap-1 text-11 text-t3">نمونه‌ها: {[['لینک سالم', 'https://www.amazon.example/dp/B0D3J6L2ZC'], ['محصول تکراری', 'https://www.digikala.example/product/iphone-16-pro'], ['لینک نامعتبر', 'ipad air']].map(([l, v]) => <button key={l} className="rounded-sm bg-neutral-bg px-1.5 py-0.5 hover:text-brand" onClick={() => { setUrl(v); read(v) }}>{l}</button>)}</div></Card>
      {st === 'reading' && <div className="space-y-2"><div className="skeleton h-10" /><div className="skeleton h-40" /></div>}
      {st === 'err' && <Card><p role="alert" className="text-13 text-danger">{msg}</p></Card>}
      {st === 'dup' && <Card><p className="text-13">این محصول قبلاً در کاتالوگ هست: <b>iPhone 16 Pro</b>. می‌توانید فیلدهای خالی آن را تکمیل کنید.</p><div className="mt-3 flex gap-2"><Button variant="primary" onClick={() => nav('/admin/catalog/p1')}>باز کردن محصول موجود</Button><Button onClick={() => setSt('done')}>تکمیل فیلدهای خالی از منبع</Button></div></Card>}
      {st === 'done' && <div className="grid gap-4 xl:grid-cols-2">
        <Card title="مقایسهٔ منبع و پیش‌نویس غنیمت" pad={false}><table className="w-full text-12"><thead><tr className="bg-surface-2 text-t2"><th className="p-2 text-right font-medium">فیلد</th><th className="p-2 text-right font-medium">منبع</th><th className="p-2 text-right font-medium">پیش‌نویس غنیمت</th><th className="p-2" /></tr></thead><tbody>{rows.map(([f, s, g, c]) => <tr key={f} className="border-t border-line"><td className="p-2 text-t2">{f}</td><td className="ltr p-2 text-right text-t3">{s}</td><td className="p-2">{g}<span className={cx('mr-1 text-11', c === 'پایین' ? 'text-danger' : c === 'متوسط' ? 'text-warning' : 'text-success')}>اطمینان {c}</span></td><td className="p-2 whitespace-nowrap">{acc[f] === undefined ? <><button className="ml-2 text-success" onClick={() => setAcc({ ...acc, [f]: true })}>پذیرش</button><button className="text-danger" onClick={() => setAcc({ ...acc, [f]: false })}>رد</button></> : <Badge tone={acc[f] ? 'success' : 'danger'}>{acc[f] ? 'پذیرفته' : 'ردشده'}</Badge>}</td></tr>)}</tbody></table>
          <p className="border-t border-line p-3 text-11 text-t3">تصاویر منبع فقط «تصویر مدل» هستند و هشدار حق نشر دارند. عکس واقعی واحد برای استوک و جعبه‌باز جدا و الزامی است.</p></Card>
        <Card title="معرفی کوتاه (بازنویسی اختصاصی)" actions={<Badge tone={uniq > 80 ? 'success' : 'warning'}>نمرهٔ یکتایی {fa(uniq)}</Badge>}>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          {uniq <= 80 && <p className="mt-1 text-11 text-warning">جملهٔ دوم بیش از حد شبیه منبع است. بازنویسی دوباره پیشنهاد می‌شود.</p>}
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!cmd) return; setText(/کوتاه/.test(cmd) ? 'آیپد ایر ۱۱ اینچی با تراشهٔ M2؛ سبک، سریع و با شارژدهی یک روز کاری.' : text + ' تراشهٔ M2 در ویرایش ویدیو و چندوظیفگی سنگین هم کم نمی‌آورد.'); setUniq(93); setCmd(''); toast('متن بازنویسی شد.', { undo: () => {} }) }}><Input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="بگو چه تغییری بدهم؛ مثلاً کوتاه‌تر و فنی‌تر" /><AIButton>اعمال دستور</AIButton></form>
          <div className="mt-2 flex flex-wrap gap-1">{['کوتاه‌تر کن', 'فنی‌تر کن', 'روی باتری تأکید کن', 'برای سئو بهینه کن'].map((c) => <button key={c} onClick={() => setCmd(c)} className="rounded-sm bg-neutral-bg px-2 py-1 text-11 hover:text-brand">{c}</button>)}</div>
          <div className="mt-3"><AITag confidence="متوسط" source="صفحهٔ منبع" /></div></Card>
      </div>}
    </Page>
  )
}
