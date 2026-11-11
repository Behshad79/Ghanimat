import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Flame, Link2, ShoppingCart, Sparkles, Star, X, Zap } from 'lucide-react'
import { AIButton, AITag, Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Progress, Row, Segmented, StatusBadge, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page, Timeline } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { Hint, Modal, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, snapshot } from '@/shared/lib/store'
import { compactToman, fa, num, pct, rel, toman, g } from '@/shared/lib/fa'
import { CONDITION, SOURCE, WAREHOUSE } from '@/shared/data/statuses'
import type { DB } from '@/shared/data/seed'
import { Cell, Money, useLookup, useTab } from './_shared'

type P = DB['products'][number]; type U = DB['units'][number]
const stock = (d: DB, p: P) => p.mode === 'qty' ? (p.qty!.tehran + p.qty!.mahabad) : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length

export { ProductCard } from '../catalog/ProductCard'
import { ProductCard } from '../catalog/ProductCard'

export function CardRules() {
  const [nb, setNb] = useState<{ label: string; rule: string; rotate: boolean } | null>(null)
  const { d, defaultBnpl } = useLookup(); const [ctx, setCtx] = useState<'desktop' | 'hover' | 'mobile' | 'out'>('desktop')
  const p = d.products.find((x) => x.id === 'p2') ?? d.products[0]; const u = d.units.find((x) => x.productId === p.id && x.status === 'unit.published')
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card title="بج‌ها و قانون نمایش" actions={<Button size="sm" onClick={() => setNb({ label: '', rule: '', rotate: false })}>تعریف بج جدید</Button>} pad={false}>
        <ul className="divide-y divide-line">{d.cardBadges.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3"><Toggle on={b.on} label={b.label} onChange={(v) => mutate((x) => { x.cardBadges.find((y) => y.id === b.id)!.on = v }, { action: v ? 'روشن‌کردن بج' : 'خاموش‌کردن بج', target: b.label })} />
            <div className="min-w-0 flex-1"><p className="text-13 font-medium">{b.label}{b.rotate && <Badge dot={false}>چرخشی</Badge>}</p><p className="text-11 text-t3">شرط نمایش: {b.rule}</p></div></li>))}</ul>
        <p className="border-t border-line px-4 py-3 text-11 text-t3">متن‌های داخل {'{ }'} متغیرند و از «قوانین کسب‌وکار» و سرویس اقساطی پیش‌فرض ({defaultBnpl()?.name ?? 'تعریف نشده'}) خوانده می‌شوند. با حذف یا تغییر سرویس، این متن خودکار عوض می‌شود.</p>
      </Card>
      <Card title="پیش‌نمایش زندهٔ کارت" className="self-start">
        <Segmented size="sm" value={ctx} onChange={setCtx} options={[['desktop', 'عادی'], ['hover', 'هاور'], ['mobile', 'موبایل فشرده'], ['out', 'ناموجود']]} />
        <div className="mt-3 flex justify-center"><ProductCard p={p} u={u} hover={ctx === 'hover'} mini={ctx === 'mobile'} out={ctx === 'out'} /></div>
        <Modal open={!!nb} onClose={() => setNb(null)} title="تعریف بج جدید" footer={<Button variant="primary" onClick={() => { if (!nb?.label.trim() || !nb.rule.trim()) return toast('متن و شرط نمایش بج را بنویسید.', { tone: 'err' }); mutate((x) => { x.cardBadges.push({ id: `b-${Date.now().toString(36)}`, label: nb.label, rule: nb.rule, on: true, rotate: nb.rotate }) }, { action: 'تعریف بج کارت محصول', target: nb.label }); toast(`بج «${nb.label}» اضافه شد.`); setNb(null) }}>افزودن بج</Button>}>
          {nb && <div className="space-y-3"><Field label="متن بج"><Input value={nb.label} onChange={(e) => setNb({ ...nb, label: e.target.value })} placeholder="مثلاً ارسال رایگان" /></Field><Field label="شرط نمایش"><Input value={nb.rule} onChange={(e) => setNb({ ...nb, rule: e.target.value })} placeholder="مثلاً قیمت ≥ آستانهٔ ارسال رایگان" /></Field><label className="flex items-center gap-2 text-13"><Toggle on={nb.rotate} label="چرخشی" onChange={(v) => setNb({ ...nb, rotate: v })} />در خط چرخشی کارت نمایش داده شود</label></div>}
        </Modal>
        <p className="mt-3 text-11 leading-5 text-t3">چرا «تحویل سریع» نمایش داده می‌شود؟ واحد در انبار تهران است، کلاس کالا عادی است و ساعت قطع سفارش نگذشته است.</p>
      </Card>
    </div>
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
      primary={st === 'done' ? <Button variant="primary" onClick={() => { toast('اطلاعات استخراج‌شده به فرم گام‌به‌گام منتقل شد؛ همه را بازبینی و اصلاح کنید.'); nav(`/admin/catalog/new?title=${encodeURIComponent('تبلت اپل iPad Air 11 M2 ظرفیت ۱۲۸ گیگابایت')}`) }}>ذخیرهٔ پیش‌نویس محصول</Button> : undefined}>
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
