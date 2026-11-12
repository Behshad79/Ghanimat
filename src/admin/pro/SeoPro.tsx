import { useMemo, useState } from 'react'
import { Globe, Plus, Smartphone, Monitor } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, num, rel } from '@/shared/lib/fa'

const SITE = 'ghanimat.example'
/** پیش‌نمایش زندهٔ نتیجهٔ گوگل (موبایل و دسکتاپ) و کارت اشتراک‌گذاری (Open Graph) */
export function SerpPreview() {
  const d = useDB(); const [pid, setPid] = useState(d.products[0].id); const p = d.products.find((x) => x.id === pid)!
  const [title, setTitle] = useState(`خرید ${p.title} | غنیمت`); const [desc, setDesc] = useState(`${p.title} اصل با گارانتی غنیمت، کنترل کیفیت دو مرحله‌ای و تحویل ۲ ساعته در تهران.`); const [slug, setSlug] = useState(p.en.toLowerCase().replace(/\s+/g, '-'))
  const [dev, setDev] = useState<'m' | 'd'>('d')
  const tLen = title.length; const dLen = desc.length
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="عنوان و توضیح">
        <Field label="کالا"><Select value={pid} onChange={(v) => { setPid(v); const q = d.products.find((x) => x.id === v)!; setTitle(`خرید ${q.title} | غنیمت`); setSlug(q.en.toLowerCase().replace(/\s+/g, '-')) }} options={d.products.map((x) => [x.id, x.title])} /></Field>
        <Field label={`عنوان (${fa(tLen)} نویسه؛ هدف ۵۰ تا ۶۰)`}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="mt-1 h-1.5 rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full', tLen > 60 ? 'bg-danger-solid' : tLen < 40 ? 'bg-warning' : 'bg-success-solid')} style={{ width: `${Math.min(100, (tLen / 70) * 100)}%` }} /></div>
        <Field label={`توضیح متا (${fa(dLen)} نویسه؛ هدف ۱۲۰ تا ۱۵۵)`}><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="نشانی (Slug)"><Input className="ltr text-left" value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
        <Button variant="primary" className="mt-3" onClick={() => { mutate((x) => { const q = x.products.find((y) => y.id === pid)! as typeof p & { metaTitle?: string; metaDesc?: string; slug?: string }; q.metaTitle = title; q.metaDesc = desc; q.slug = slug }, { action: 'ذخیرهٔ متای کالا', target: p.title }); toast('متا ذخیره شد.') }}>ذخیره</Button>
      </Card>
      <div className="space-y-4">
        <Card title="پیش‌نمایش گوگل" actions={<Segmented size="sm" value={dev} onChange={setDev} options={[['d', <Monitor key="d" size={13} />], ['m', <Smartphone key="m" size={13} />]]} />}>
          <div className={cx('rounded-xl border border-line bg-white p-4 text-right', dev === 'm' && 'mx-auto max-w-[360px]')} dir="rtl">
            <p className="flex items-center gap-2 text-12 text-[#202124]"><span className="grid size-6 place-items-center rounded-full bg-[#eef0ff]"><Globe size={12} /></span><span><b className="block">غنیمت</b><span className="ltr text-[#4d5156]">https://{SITE} › p › {slug}</span></span></p>
            <p className={cx('mt-1 text-[#1a0dab]', dev === 'm' ? 'text-16' : 'text-18')}>{title.length > 60 ? `${title.slice(0, 58)}…` : title}</p>
            <p className="mt-0.5 text-13 leading-5 text-[#4d5156]">{desc.length > 155 ? `${desc.slice(0, 152)}…` : desc}</p>
            <p className="mt-1 text-12 text-[#70757a]">★ ۴٫۷ · ۲۱۴ نظر · {num(p.price ?? p.priceNew)} تومان · موجود</p>
          </div>
        </Card>
        <Card title="کارت اشتراک‌گذاری (Open Graph)"><div className="overflow-hidden rounded-xl border border-line bg-white" dir="rtl">{p.image ? <img src={p.image} alt="" className="aspect-[1200/630] w-full object-cover" /> : <div className="aspect-[1200/630] bg-neutral-bg" />}<div className="p-3"><p className="ltr text-11 uppercase text-[#65676b]">{SITE}</p><p className="text-14 font-bold text-[#050505]">{title}</p><p className="line-clamp-1 text-12 text-[#65676b]">{desc}</p></div></div><p className="mt-2 text-11 text-t2">تصویر OG: ۱۲۰۰×۶۳۰ پیکسل. در تلگرام، واتساپ، لینکدین و اینستاگرام همین نمایش داده می‌شود.</p></Card>
      </div>
    </div>
  )
}

/** کنترل ایندکس، Canonical و تولید خودکار JSON-LD */
export function SchemaBuilder() {
  const d = useDB(); const [pid, setPid] = useState(d.products[0].id); const p = d.products.find((x) => x.id === pid)!
  const [robots, setRobots] = useState('index,follow'); const [canon, setCanon] = useState(`https://${SITE}/p/${p.en.toLowerCase().replace(/\s+/g, '-')}`)
  const [types, setTypes] = useState({ Product: true, Offer: true, AggregateRating: true, BreadcrumbList: true, FAQPage: false })
  const stock = p.mode === 'qty' ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length
  const json = useMemo(() => { const g: object[] = []
    if (types.Product) g.push({ '@type': 'Product', name: p.title, sku: p.code, brand: { '@type': 'Brand', name: p.brand }, image: p.image ? `https://${SITE}/${p.image.replace('./', '')}` : undefined, ...(types.Offer ? { offers: { '@type': 'Offer', priceCurrency: 'IRR', price: (p.price ?? p.priceNew) * 10, availability: stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition', url: canon } } : {}), ...(types.AggregateRating && p.reviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } } : {}) })
    if (types.BreadcrumbList) g.push({ '@type': 'BreadcrumbList', itemListElement: [['خانه', '/'], [p.category, `/c/${p.category}`], [p.title, canon]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) })
    if (types.FAQPage) g.push({ '@type': 'FAQPage', mainEntity: (d.entities.faqs ?? []).slice(0, 3).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': g }, null, 2) }, [p, types, canon, stock, d.entities.faqs])
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card title="ایندکس و Canonical">
        <Field label="صفحه"><Select value={pid} onChange={(v) => { setPid(v); const q = d.products.find((x) => x.id === v)!; setCanon(`https://${SITE}/p/${q.en.toLowerCase().replace(/\s+/g, '-')}`) }} options={d.products.map((x) => [x.id, x.title])} /></Field>
        <Field label="Robots"><Select value={robots} onChange={setRobots} options={['index,follow', 'noindex,follow', 'noindex,nofollow', 'index,nofollow']} /></Field>
        <Field label="Canonical"><Input className="ltr text-left" value={canon} onChange={(e) => setCanon(e.target.value)} /></Field>
        <p className="mt-3 text-12 font-semibold">اسکیماها</p>
        {Object.keys(types).map((k) => <label key={k} className="flex items-center justify-between py-1 text-13"><span className="ltr">{k}</span><Toggle on={types[k as keyof typeof types]} label={k} onChange={(v) => setTypes({ ...types, [k]: v })} /></label>)}
        <Button variant="primary" className="mt-3 w-full" onClick={() => { mutate(() => {}, { action: 'ذخیرهٔ اسکیما و ایندکس', target: p.title, after: robots }); toast('اسکیما و دستور ایندکس ذخیره شد؛ قیمت و موجودی خودکار به‌روز می‌شوند.') }}>ذخیره</Button>
      </Card>
      <Card title="JSON-LD تولیدشده (خودکار از قیمت و موجودی)"><pre dir="ltr" className="max-h-[480px] overflow-auto rounded-xl bg-[#10123d] p-3 text-left text-11 leading-5 text-[#d6dcff]">{`<meta name="robots" content="${robots}">\n<link rel="canonical" href="${canon}">\n<script type="application/ld+json">\n${json}\n</script>`}</pre></Card>
    </div>
  )
}

const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
const NOTFOUND = [{ id: 'nf1', url: '/p/iphone-15-pro-max-256', hits: 412, referrer: 'google', last: ago(12) }, { id: 'nf2', url: '/c/headphone', hits: 96, referrer: 'instagram', last: ago(55) }, { id: 'nf3', url: '/blog/ios-26-features', hits: 41, referrer: 'telegram', last: ago(60 * 5) }, { id: 'nf4', url: '/product/123', hits: 12, referrer: 'مستقیم', last: ago(60 * 22) }]
/** پایش ۴۰۴ و ساخت ریدایرکت ۳۰۱/۳۰۲/۴۱۰ از همان‌جا */
export function NotFoundMonitor() {
  const d = useDB(); const [rows, setRows] = useState(NOTFOUND)
  const fix = (r: (typeof NOTFOUND)[number], code: string, to: string) => { mutate((x) => { x.entities.redirects = [{ id: `rd${Date.now().toString(36)}`, from: r.url, to, code, hits: 0, active: true } as never, ...(x.entities.redirects ?? [])] }, { action: `ثبت ${code}`, target: r.url, after: to }); setRows(rows.filter((y) => y.id !== r.id)); toast(`${code} برای ${r.url} ثبت شد.`) }
  return <DataTable name="خطاهای ۴۰۴" rows={rows} rowKey={(r) => r.id} empty={{ title: 'خطای ۴۰۴ تازه‌ای نیست.' }}
    cols={[{ key: 'u', title: 'نشانی', render: (r) => <span className="ltr text-12">{r.url}</span> }, { key: 'h', title: 'ورود کاربر', align: 'left', render: (r) => fa(r.hits), sort: (r) => r.hits }, { key: 'r', title: 'از', render: (r) => r.referrer }, { key: 'l', title: 'آخرین', render: (r) => <span className="text-12 text-t2">{rel(r.last)}</span> }]}
    actions={(r) => [{ label: 'ریدایرکت ۳۰۱ به نزدیک‌ترین کالا', onClick: () => fix(r, '301', `/p/${d.products[0].en.toLowerCase().replace(/\s+/g, '-')}`) }, { label: 'ریدایرکت ۳۰۲ به دسته', onClick: () => fix(r, '302', '/c/mobile') }, { label: 'علامت ۴۱۰ (حذف دائمی)', danger: true, onClick: () => fix(r, '410', '') }]} />
}

/** صفحه‌های فرود ترکیبی برای کلیدواژه‌های دم‌بلند */
export function LandingPages() {
  const d = useDB(); const rows = (d.entities.seoLandings ?? []) as { id: string; h1: string; slug: string; filters: string; intro: string; active: boolean }[]
  const [f, setF] = useState({ cat: 'هدفون', cond: 'استوک', brand: 'سونی', max: '20' })
  const h1 = `خرید ${f.cat} ${f.brand} ${f.cond} زیر ${f.max} میلیون`; const slug = `${f.cat}-${f.brand}-${f.cond}-under-${f.max}m`.replace(/\s+/g, '-')
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card title="سازندهٔ صفحهٔ فرود">
        <div className="grid grid-cols-2 gap-2"><Field label="دسته"><Select value={f.cat} onChange={(v) => setF({ ...f, cat: v })} options={(d.entities.categories ?? []).map((c) => c.name)} /></Field><Field label="برند"><Select value={f.brand} onChange={(v) => setF({ ...f, brand: v })} options={(d.entities.brands ?? []).map((b) => b.name)} /></Field><Field label="وضعیت"><Select value={f.cond} onChange={(v) => setF({ ...f, cond: v })} options={['اکبند', 'جعبه‌باز', 'استوک']} /></Field><Field label="سقف قیمت (میلیون)"><Input type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field></div>
        <p className="mt-3 text-12">H1: <b>{h1}</b></p><p className="ltr text-left text-11 text-t2">/{slug}</p>
        <Button variant="primary" className="mt-3 w-full" icon={<Plus size={14} />} onClick={() => mutate((x) => { x.entities.seoLandings = [{ id: `lp${Date.now().toString(36)}`, h1, slug, filters: `دسته=${f.cat}، برند=${f.brand}، وضعیت=${f.cond}، قیمت≤${f.max}م`, intro: `راهنمای انتخاب ${f.cat} ${f.brand} ${f.cond} با گارانتی غنیمت.`, active: true }, ...(x.entities.seoLandings ?? [])] }, { action: 'ساخت صفحهٔ فرود سئو', target: h1 })}>ساخت صفحه</Button>
      </Card>
      <DataTable name="صفحه‌های فرود" rows={rows} rowKey={(r) => r.id} empty={{ title: 'هنوز صفحهٔ فرودی ساخته نشده است.', desc: 'از ترکیب فیلترها برای کلیدواژه‌های دم‌بلند صفحه بسازید.' }}
        cols={[{ key: 'h', title: 'H1', render: (r) => r.h1 }, { key: 's', title: 'نشانی', render: (r) => <span className="ltr text-12">/{r.slug}</span> }, { key: 'f', title: 'فیلترها', wrap: true, render: (r) => <span className="text-12">{r.filters}</span> }, { key: 'a', title: 'وضعیت', render: (r) => <Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'منتشر' : 'پیش‌نویس'}</Badge> }]} />
    </div>
  )
}

/** دادهٔ Search Console برای هر کالا: کلیدواژهٔ ورودی، نمایش، کلیک، CTR و جایگاه */
export function GscPanel() {
  const d = useDB()
  const rows = d.products.flatMap((p, i) => [`خرید ${p.title.split(' ').slice(0, 3).join(' ')}`, `قیمت ${p.en.split(' ').slice(0, 3).join(' ')}`].map((q, j) => { const imp = 800 + ((i * 37 + j * 91) % 9000); const pos = 2 + ((i + j * 3) % 18); const ctr = Math.max(0.6, 28 / pos); return { id: `${p.id}-${j}`, p, q, imp, clicks: Math.round((imp * ctr) / 100), ctr, pos } }))
  return <DataTable name="Search Console" rows={rows} rowKey={(r) => r.id} empty={{ title: 'داده‌ای از Search Console نرسیده است.' }} search={(r) => `${r.q} ${r.p.title}`}
    cols={[{ key: 'q', title: 'کلیدواژه', render: (r) => r.q }, { key: 'p', title: 'صفحه', render: (r) => r.p.en }, { key: 'i', title: 'نمایش', align: 'left', render: (r) => fa(r.imp), sort: (r) => r.imp }, { key: 'c', title: 'کلیک', align: 'left', render: (r) => fa(r.clicks), sort: (r) => r.clicks }, { key: 'ctr', title: 'CTR', align: 'left', render: (r) => `${fa(r.ctr.toFixed(1))}٪`, sort: (r) => r.ctr }, { key: 'pos', title: 'جایگاه', align: 'left', render: (r) => <span className={r.pos <= 3 ? 'text-success' : r.pos > 10 ? 'text-danger' : ''}>{fa(r.pos)}</span>, sort: (r) => r.pos }]} />
}
