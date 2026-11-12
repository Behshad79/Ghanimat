import { useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Heading2, ImagePlus, Link2, Package, Pilcrow, Plus, Quote, Send, Trash2, Video } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Textarea, Toggle } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { Bars } from '@/shared/ui/charts'
import { DataTable } from '@/shared/ui/table'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { IconPicker } from '@/shared/ui/IconPicker'
import { MagicIcon } from '@/shared/ui/MagicIcon'
import { mutate, sendSms, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'
import { PRESETS, type Theme } from '@/shared/data/pages'
import { ProductImg } from '../pages/_shared'

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
type Open = (pageId: string, secId: string, elId: string) => void

/** همهٔ بنرها و تصویرهای همهٔ صفحه‌ها: ابعاد لازم، جایگاه، کلیک و تعویض با بررسی ابعاد */
export function BannersTab({ onOpen }: { onOpen: Open }) {
  const d = useDB(); const [pg, setPg] = useState('all')
  const rows = d.pages.flatMap((p) => p.sections.flatMap((s) => s.els.filter((e) => e.kind === 'banner' || e.kind === 'image').map((e) => ({ p, s, e, id: e.id })))).filter((r) => pg === 'all' || r.p.id === pg)
  const file = useRef<HTMLInputElement>(null); const [target, setTarget] = useState<(typeof rows)[number] | null>(null)
  return (
    <div className="space-y-3">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI featured label="جایگاه بنر و تصویر" value={fa(rows.length)} /><KPI label="بدون تصویر" value={fa(rows.filter((r) => !r.e.src).length)} goodDown /><KPI label="کلیک بنرها" value={fa(rows.reduce((a, r) => a + r.e.clicks, 0))} /><KPI label="بهترین CTR" value={`${fa(Math.max(0, ...rows.map((r) => (r.e.clicks / Math.max(1, r.e.views)) * 100)).toFixed(1))}٪`} /></div>
      <DataTable name="بنرها" rows={rows} rowKey={(r) => r.id} onRow={(r) => onOpen(r.p.id, r.s.id, r.e.id)} empty={{ title: 'بنری در این صفحه نیست.' }} search={(r) => `${r.p.title} ${r.s.name} ${r.e.label}`}
        filters={<Select className="w-52" value={pg} onChange={setPg} options={[['all', 'همهٔ صفحه‌ها'], ...d.pages.map((p) => [p.id, p.title] as [string, string])]} />}
        cols={[{ key: 'img', title: 'تصویر', render: (r) => <span className="block h-10 w-16 overflow-hidden rounded-md bg-gradient-to-br from-[#eef0ff] to-[#fff3d6]">{r.e.src && <img src={r.e.src} alt="" className="size-full object-cover" />}</span> }, { key: 'l', title: 'بنر', render: (r) => r.e.label, text: (r) => r.e.label }, { key: 'p', title: 'صفحه › بخش', render: (r) => <span className="text-12">{r.p.title} › {r.s.name}</span> }, { key: 'dim', title: 'ابعاد لازم', render: (r) => <span className="ltr font-mono text-12">{r.e.w}×{r.e.h}</span> }, { key: 'c', title: 'کلیک', align: 'left', render: (r) => fa(r.e.clicks), sort: (r) => r.e.clicks }, { key: 'ctr', title: 'CTR', align: 'left', render: (r) => `${fa(((r.e.clicks / Math.max(1, r.e.views)) * 100).toFixed(2))}٪`, sort: (r) => r.e.clicks / Math.max(1, r.e.views) }, { key: 's', title: 'وضعیت', render: (r) => (r.e.src ? <Badge tone="success">تصویر دارد</Badge> : <Badge tone="warning">خالی</Badge>) }]}
        actions={(r) => [{ label: 'تعویض تصویر', icon: <ImagePlus size={14} />, onClick: () => { setTarget(r); file.current?.click() } }, { label: 'باز کردن در صفحه‌ساز', onClick: () => onOpen(r.p.id, r.s.id, r.e.id) }]} />
      <input ref={file} type="file" accept="image/*" hidden onChange={async (ev) => { const f = ev.target.files?.[0]; if (!f || !target) return; const img = new Image(); img.src = URL.createObjectURL(f); await img.decode(); const need = (target.e.w ?? 1) / (target.e.h ?? 1); const ok = Math.abs(img.width / img.height - need) / need < 0.04
        const src = await fileToImage(f, Math.max(target.e.w ?? 900, 600), 0.86); mutate((x) => { x.pages.find((p) => p.id === target.p.id)!.sections.find((s) => s.id === target.s.id)!.els.find((e) => e.id === target.e.id)!.src = src }, { action: 'تعویض بنر', target: `${target.p.title} › ${target.e.label}` })
        toast(ok ? 'بنر تعویض شد.' : `بنر تعویض شد، ولی ابعاد فایل ${fa(img.width)}×${fa(img.height)} با جایگاه ${fa(target.e.w ?? 0)}×${fa(target.e.h ?? 0)} یکی نیست و برش می‌خورد.`, { tone: ok ? 'ok' : 'err' }); ev.target.value = '' }} />
    </div>
  )
}

/** آمار کلیک همهٔ المان‌ها (کلیک‌خورها) */
export function ClicksTab({ onOpen }: { onOpen: Open }) {
  const d = useDB(); const [pg, setPg] = useState('all'); const [kind, setKind] = useState('all')
  const rows = d.pages.flatMap((p) => p.sections.flatMap((s) => s.els.filter((e) => e.clicks > 0).map((e) => ({ p, s, e, id: e.id })))).filter((r) => (pg === 'all' || r.p.id === pg) && (kind === 'all' || r.e.kind === kind))
  const byPage = d.pages.map((p) => ({ label: p.title, value: p.sections.flatMap((s) => s.els).reduce((a, e) => a + e.clicks, 0) })).sort((a, b) => b.value - a.value).slice(0, 8)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2"><Card title="کلیک به تفکیک صفحه"><Bars data={byPage} /></Card><Card title="پرکلیک‌ترین المان‌ها">{[...rows].sort((a, b) => b.e.clicks - a.e.clicks).slice(0, 8).map((r) => <button key={r.id} onClick={() => onOpen(r.p.id, r.s.id, r.e.id)} className="flex w-full justify-between py-1 text-right text-13 hover:text-brand"><span>{r.p.title} › {r.e.label}</span><b className="tnum">{fa(r.e.clicks)}</b></button>)}</Card></div>
      <DataTable name="کلیک المان‌ها" rows={rows} rowKey={(r) => r.id} onRow={(r) => onOpen(r.p.id, r.s.id, r.e.id)} empty={{ title: 'کلیکی ثبت نشده است.' }} search={(r) => `${r.p.title} ${r.s.name} ${r.e.label}`}
        filters={<><Select className="w-48" value={pg} onChange={setPg} options={[['all', 'همهٔ صفحه‌ها'], ...d.pages.map((p) => [p.id, p.title] as [string, string])]} /><Select className="w-36" value={kind} onChange={setKind} options={[['all', 'همهٔ انواع'], ['banner', 'بنر'], ['button', 'دکمه'], ['link', 'لینک'], ['products', 'کالاها'], ['chips', 'چیپ'], ['icon', 'آیکون'], ['image', 'تصویر']]} /></>}
        cols={[{ key: 'l', title: 'المان', render: (r) => r.e.label, text: (r) => r.e.label }, { key: 'p', title: 'صفحه › بخش', render: (r) => <span className="text-12">{r.p.title} › {r.s.name}</span> }, { key: 'v', title: 'نمایش', align: 'left', render: (r) => fa(r.e.views), sort: (r) => r.e.views }, { key: 'c', title: 'کلیک', align: 'left', render: (r) => fa(r.e.clicks), sort: (r) => r.e.clicks }, { key: 'ctr', title: 'CTR', align: 'left', render: (r) => `${fa(((r.e.clicks / Math.max(1, r.e.views)) * 100).toFixed(2))}٪`, sort: (r) => r.e.clicks / Math.max(1, r.e.views) }]} />
    </div>
  )
}

/** پوستهٔ سایت: رنگ‌ها، گردی، اندازهٔ لوگو و پوسته‌های آماده */
export function ThemeTab() {
  const d = useDB(); const T = d.theme
  const set = (p: Partial<Theme>, log?: string) => mutate((x) => { Object.assign(x.theme, p) }, log ? { action: log, target: 'پوستهٔ سایت' } : undefined)
  const C = ({ k, l }: { k: keyof Theme; l: string }) => <label className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-13">{l}<span className="flex items-center gap-2"><span className="ltr font-mono text-11 text-t2">{String(T[k])}</span><input aria-label={l} type="color" value={String(T[k])} onChange={(e) => set({ [k]: e.target.value } as Partial<Theme>)} className="h-8 w-10 rounded-md border border-line" /></span></label>
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card title="رنگ‌ها و شکل کلی سایت">
        <div className="grid gap-2 sm:grid-cols-2"><C k="brand" l="رنگ اصلی (دکمه‌ها)" /><C k="ink" l="رنگ متن و تیره" /><C k="accent" l="رنگ مکمل" /><C k="danger" l="رنگ تخفیف" /><C k="success" l="رنگ موفقیت" /><C k="bg" l="پس‌زمینهٔ صفحه" /><C k="surface" l="پس‌زمینهٔ کارت‌ها" /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label={`گردی گوشه‌ها (${fa(T.radius)})`}><input aria-label="گردی" type="range" min={0} max={28} value={T.radius} onChange={(e) => set({ radius: +e.target.value })} className="w-full" /></Field><Field label={`لوگو دسکتاپ (${fa(T.logoHeight)})`}><input aria-label="لوگو دسکتاپ" type="range" min={18} max={56} value={T.logoHeight} onChange={(e) => set({ logoHeight: +e.target.value })} className="w-full" /></Field><Field label={`لوگو موبایل (${fa(T.logoHeightMobile)})`}><input aria-label="لوگو موبایل" type="range" min={16} max={40} value={T.logoHeightMobile} onChange={(e) => set({ logoHeightMobile: +e.target.value })} className="w-full" /></Field></div>
        <p className="mt-4 text-13 font-semibold">پوسته‌های آماده (مناسبت‌ها)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">{PRESETS.map((p) => <button key={p.name} onClick={() => set(p.t, `اعمال پوستهٔ ${p.name}`)} className="lift rounded-xl border border-line p-2 text-right text-12"><span className="mb-1.5 flex gap-1">{[p.t.brand, p.t.ink, p.t.accent, p.t.bg].map((c, i) => <span key={i} className="size-5 rounded-full border border-line" style={{ background: c }} />)}</span>{p.name}</button>)}</div>
        <p className="mt-3 text-11 text-t2">رنگ‌های پنل ادمین تغییر نمی‌کند؛ فقط سایت و پنل مشتری. کنتراست متن سفید روی رنگ اصلی را بررسی کنید.</p>
      </Card>
      <Card title="پیش‌نمایش"><div className="space-y-3 rounded-2xl p-4" style={{ background: T.bg }}><img src="./brand/logo-full.png" alt="غنیمت" style={{ height: T.logoHeight }} /><div className="p-3" style={{ background: T.surface, borderRadius: T.radius }}><p className="font-bold" style={{ color: T.ink }}>هدست بلوتوثی اپل AirPods Max</p><p className="mt-1 flex items-center gap-2 text-12"><span className="rounded-md px-1.5 text-white" style={{ background: T.danger }}>۲۰٪</span><b style={{ color: T.ink }}>۱۵٬۰۰۰٬۰۰۰ تومان</b></p><span className="mt-2 inline-flex h-9 items-center px-4 text-12 text-white" style={{ background: T.brand, borderRadius: T.radius / 1.5 }}>افزودن به سبد خرید</span></div><span className="inline-block rounded-full px-3 py-1 text-12" style={{ background: T.accent, color: T.ink }}>غنی‌آف</span></div></Card>
    </div>
  )
}

/** دسته‌ها: افزودن، حذف، ترتیب، آیکون Magicoon یا عکس */
export function CategoriesTab() {
  const d = useDB(); const cats = d.entities.categories ?? []
  const set = (i: number, p: Record<string, unknown>, log?: string) => mutate((x) => { Object.assign(x.entities.categories[i], p) }, log ? { action: log, target: cats[i].name } : undefined)
  const DEF: Record<string, string> = { 'گوشی موبایل': 'mobile', هدفون: 'shopping-cart', 'لپ‌تاپ': 'laptop', 'ساعت هوشمند': 'watch', تبلت: 'tablet', 'کتاب‌خوان': 'tablet', 'لوازم جانبی': 'plug' }
  return (
    <Card title="دسته‌ها، ترتیب و آیکون‌ها" actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => mutate((x) => { x.entities.categories.push({ id: uid('cat'), name: 'دستهٔ تازه', parent: 'الکترونیک', slug: 'new', template: '—', faq: 0, active: true, icon: 'tag', onHome: true }) }, { action: 'افزودن دسته', target: 'دستهٔ تازه' })}>افزودن دسته</Button>} pad={false}>
      <ul className="divide-y divide-line">{cats.map((c, i) => <li key={c.id} className="grid items-center gap-3 px-4 py-3 md:grid-cols-[auto_1fr_1fr_auto_auto_auto]">
        <span className="flex flex-col"><button aria-label="بالا" disabled={i === 0} onClick={() => mutate((x) => { const a = x.entities.categories; [a[i - 1], a[i]] = [a[i], a[i - 1]] }, { action: 'جابه‌جایی دسته', target: c.name })} className="disabled:opacity-30"><ArrowUp size={13} /></button><button aria-label="پایین" disabled={i === cats.length - 1} onClick={() => mutate((x) => { const a = x.entities.categories; [a[i + 1], a[i]] = [a[i], a[i + 1]] }, { action: 'جابه‌جایی دسته', target: c.name })} className="disabled:opacity-30"><ArrowDown size={13} /></button></span>
        <Input aria-label="نام دسته" value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
        <IconPicker value={c.icon ?? DEF[c.name]} onChange={(v) => set(i, { icon: v }, 'تغییر آیکون دسته')} />
        <label className="flex items-center gap-1.5 text-12">در خانه<Toggle on={c.onHome !== false} label="نمایش در خانه" onChange={(v) => set(i, { onHome: v })} /></label>
        <label className="flex items-center gap-1.5 text-12">فعال<Toggle on={!!c.active} label="فعال" onChange={(v) => set(i, { active: v }, v ? 'فعال کردن دسته' : 'غیرفعال کردن دسته')} /></label>
        <button aria-label="حذف دسته" className="text-danger" onClick={async () => { const n = d.products.filter((p) => p.category === c.name).length; if (n) return toast(`${fa(n)} کالا در این دسته است؛ اول کالاها را جابه‌جا کنید.`, { tone: 'err' }); if (await confirm({ title: `دستهٔ «${c.name}» حذف شود؟`, body: 'از منو و صفحهٔ خانه برداشته می‌شود.', danger: true, confirm: 'حذف' })) mutate((x) => { x.entities.categories.splice(i, 1) }, { action: 'حذف دسته', target: c.name }) }}><Trash2 size={15} /></button>
      </li>)}</ul>
    </Card>
  )
}

/** نشان‌های کارت کالا: قانون‌محور یا دستی، رنگ، آیکون و متن؛ هر تعداد نشان تازه */
export function BadgesTab() {
  const d = useDB(); const B = d.cardBadges as (typeof d.cardBadges[number] & { color?: string; bg?: string; icon?: string; manual?: boolean; products?: string[] })[]
  const set = (i: number, p: Record<string, unknown>, log?: string) => mutate((x) => { Object.assign(x.cardBadges[i], p) }, log ? { action: log, target: B[i].label } : undefined)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-13 text-t2">نشان‌های قانون‌محور خودکار روی کارت می‌آیند؛ نشان دستی را به کالاهای دلخواه وصل کنید. همهٔ متن‌ها، رنگ‌ها و آیکون‌ها قابل تغییر است.</p><Button variant="primary" icon={<Plus size={14} />} onClick={() => mutate((x) => { x.cardBadges.push({ id: uid('bd'), label: 'نشان تازه', rule: 'دستی: به کالاهای انتخابی', on: true, rotate: false, manual: true, products: [], bg: '#eef0ff', color: '#0000ff', icon: 'tag' } as never) }, { action: 'افزودن نشان کارت', target: 'نشان تازه' })}>نشان تازه</Button></div>
      <div className="grid gap-3 lg:grid-cols-2">{B.map((b, i) => <Card key={b.id} title={<span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-12 font-bold" style={{ background: b.bg ?? '#eef0ff', color: b.color ?? '#0000ff' }}>{b.icon && <MagicIcon name={b.icon} size={14} />}{b.label}</span>} actions={<><Toggle on={b.on} label="فعال" onChange={(v) => set(i, { on: v }, v ? 'فعال کردن نشان' : 'غیرفعال کردن نشان')} />{b.manual && <button aria-label="حذف نشان" className="mr-2 text-danger" onClick={() => mutate((x) => { x.cardBadges.splice(i, 1) }, { action: 'حذف نشان کارت', target: b.label })}><Trash2 size={14} /></button>}</>}>
        <div className="grid gap-2 sm:grid-cols-2"><Field label="متن نشان"><Input value={b.label} onChange={(e) => set(i, { label: e.target.value })} /></Field><Field label="قانون نمایش"><Input value={b.rule} onChange={(e) => set(i, { rule: e.target.value })} disabled={!b.manual} /></Field>
          <Field label="رنگ متن"><input aria-label="رنگ متن" type="color" value={b.color ?? '#0000ff'} onChange={(e) => set(i, { color: e.target.value })} className="h-9 w-full rounded-md border border-line" /></Field><Field label="پس‌زمینه"><input aria-label="پس‌زمینه" type="color" value={b.bg ?? '#eef0ff'} onChange={(e) => set(i, { bg: e.target.value })} className="h-9 w-full rounded-md border border-line" /></Field></div>
        <Field label="آیکون"><IconPicker value={b.icon} onChange={(v) => set(i, { icon: v })} /></Field>
        <label className="mt-2 flex items-center justify-between text-13">در خط متحرک کارت بچرخد<Toggle on={b.rotate} label="چرخشی" onChange={(v) => set(i, { rotate: v })} /></label>
        {b.manual && <div className="mt-2"><p className="text-12 font-semibold">کالاهای دارای این نشان</p><div className="mt-1 flex flex-wrap gap-1.5">{d.products.map((p) => { const on = b.products?.includes(p.id); return <button key={p.id} onClick={() => set(i, { products: on ? b.products!.filter((x) => x !== p.id) : [...(b.products ?? []), p.id] })} className={cx('flex items-center gap-1 rounded-full border px-2 py-0.5 text-11', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}><ProductImg pid={p.id} size={18} rounded="rounded-full" />{p.en.split(' ').slice(0, 3).join(' ')}</button> })}</div></div>}
      </Card>)}</div>
    </div>
  )
}

type Blk = { id: string; t: string; v: string; href?: string; w?: number; h?: number }
const BLK: [string, string, ReactNode][] = [['h', 'عنوان', <Heading2 key="h" size={14} />], ['p', 'پاراگراف', <Pilcrow key="p" size={14} />], ['img', 'تصویر', <ImagePlus key="i" size={14} />], ['banner', 'بنر لینک‌دار', <ImagePlus key="b" size={14} />], ['product', 'کارت کالای غنیمت', <Package key="pr" size={14} />], ['ext', 'لینک بیرونی', <ExternalLink key="e" size={14} />], ['video', 'ویدیو', <Video key="v" size={14} />], ['quote', 'نقل‌قول', <Quote key="q" size={14} />]]
/** نویسندهٔ وبلاگ بلوکی: متن، تصویر، بنر میان مقاله، کارت کالا، لینک بیرونی و ویدیو */
export function BlogTab() {
  const d = useDB(); const arts = d.entities.articles ?? []; const [aid, setAid] = useState(arts[0]?.id ?? ''); const a = arts.find((x) => x.id === aid)
  const blocks: Blk[] = d.articleBlocks[aid] ?? [{ id: 'b1', t: 'h', v: a?.title ?? '' }, { id: 'b2', t: 'p', v: 'مقدمهٔ مقاله را اینجا بنویسید.' }]
  const save = (next: Blk[], log?: string) => mutate((x) => { x.articleBlocks[aid] = next }, log ? { action: log, target: a?.title ?? aid } : undefined)
  const [prev, setPrev] = useState(false)
  if (!a) return <Card><Button onClick={() => mutate((x) => { x.entities.articles.unshift({ id: uid('ar'), title: 'مقالهٔ تازه', category: 'راهنمای خرید', author: 'تیم محتوا', status: 'پیش‌نویس', date: new Date().toISOString().slice(0, 10) }) })}>نوشتن اولین مقاله</Button></Card>
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card pad={false}><div className="p-2"><Button size="sm" className="w-full" icon={<Plus size={13} />} onClick={() => { const id = uid('ar'); mutate((x) => { x.entities.articles.unshift({ id, title: 'مقالهٔ تازه', category: 'راهنمای خرید', author: 'تیم محتوا', status: 'پیش‌نویس', date: new Date().toISOString().slice(0, 10) }) }, { action: 'ساخت مقاله', target: 'مقالهٔ تازه' }); setAid(id) }}>مقالهٔ تازه</Button></div>{arts.map((x) => <button key={x.id} onClick={() => setAid(x.id)} className={cx('block w-full border-t border-line px-3 py-2 text-right text-12', x.id === aid ? 'bg-brand-tint font-semibold text-brand' : 'hover:bg-neutral-bg')}>{x.title}<span className="block text-11 text-t3">{x.status}</span></button>)}</Card>
      <Card title={<Input aria-label="عنوان مقاله" className="h-9 font-bold" value={a.title} onChange={(e) => mutate((x) => { x.entities.articles.find((y) => y.id === aid)!.title = e.target.value })} />} actions={<><Button size="sm" variant="ghost" onClick={() => setPrev(true)}>پیش‌نمایش</Button><Button size="sm" variant="primary" onClick={() => { mutate((x) => { x.entities.articles.find((y) => y.id === aid)!.status = 'منتشرشده' }, { action: 'انتشار مقاله', target: a.title }); toast('مقاله منتشر شد.') }}>انتشار</Button></>}>
        <div className="space-y-2">{blocks.map((b, i) => <div key={b.id} className="group flex gap-2 rounded-xl border border-line p-2">
          <span className="flex flex-col gap-1 pt-1"><button aria-label="بالا" disabled={i === 0} onClick={() => { const n = [...blocks]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; save(n) }} className="disabled:opacity-30"><ArrowUp size={13} /></button><button aria-label="پایین" disabled={i === blocks.length - 1} onClick={() => { const n = [...blocks]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; save(n) }} className="disabled:opacity-30"><ArrowDown size={13} /></button></span>
          <div className="min-w-0 flex-1 space-y-1.5"><Badge dot={false}>{BLK.find((x) => x[0] === b.t)?.[1]}</Badge>
            {b.t === 'product' ? <Select value={b.v} onChange={(v) => save(blocks.map((x) => (x.id === b.id ? { ...x, v } : x)))} options={d.products.map((p) => [p.id, p.title])} placeholder="انتخاب کالا" />
              : b.t === 'img' || b.t === 'banner' ? <div className="space-y-1.5">{b.v && <img src={b.v} alt="" className="max-h-40 rounded-lg" />}<input type="file" accept="image/*" aria-label="بارگذاری تصویر" onChange={async (e) => { const f = e.target.files?.[0]; if (f) save(blocks.map((x) => (x.id === b.id ? { ...x, v: '' } : x)).map((x) => x), undefined); if (f) { const src = await fileToImage(f, 1200, 0.85); save(blocks.map((x) => (x.id === b.id ? { ...x, v: src } : x)), 'افزودن تصویر به مقاله') } }} className="text-12" />{b.t === 'banner' && <Input aria-label="لینک بنر" className="ltr text-left" placeholder="/offers یا https://…" value={b.href ?? ''} onChange={(e) => save(blocks.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x)))} />}<p className="text-11 text-t2">ابعاد پیشنهادی {b.t === 'banner' ? '۷۶۰×۲۴۰' : '۷۶۰×۴۲۸'} پیکسل</p></div>
              : b.t === 'ext' || b.t === 'video' ? <><Input aria-label="متن" placeholder="متن لینک" value={b.v} onChange={(e) => save(blocks.map((x) => (x.id === b.id ? { ...x, v: e.target.value } : x)))} /><Input aria-label="نشانی" className="ltr text-left" placeholder="https://…" value={b.href ?? ''} onChange={(e) => save(blocks.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x)))} /></>
              : <Textarea aria-label="متن بلوک" rows={b.t === 'p' ? 3 : 1} className={b.t === 'h' ? 'font-bold' : ''} value={b.v} onChange={(e) => save(blocks.map((x) => (x.id === b.id ? { ...x, v: e.target.value } : x)))} />}
          </div>
          <button aria-label="حذف بلوک" className="self-start text-danger opacity-50 group-hover:opacity-100" onClick={() => save(blocks.filter((x) => x.id !== b.id), 'حذف بلوک مقاله')}><Trash2 size={14} /></button>
        </div>)}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">{BLK.map(([t, l, ic]) => <Button key={t} size="sm" icon={ic} onClick={() => save([...blocks, { id: uid('b'), t, v: t === 'product' ? d.products[0].id : '' }], `افزودن ${l} به مقاله`)}>{l}</Button>)}</div>
      </Card>
      <Modal wide open={prev} onClose={() => setPrev(false)} title={a.title}><article className="mx-auto max-w-2xl space-y-3 text-[#10123d]">{blocks.map((b) => b.t === 'h' ? <h2 key={b.id} className="text-20 font-bold">{b.v}</h2> : b.t === 'p' ? <p key={b.id} className="leading-7">{b.v}</p> : b.t === 'quote' ? <blockquote key={b.id} className="border-r-4 border-brand pr-3 italic">{b.v}</blockquote> : b.t === 'img' || b.t === 'banner' ? (b.v ? <img key={b.id} src={b.v} alt="" className="w-full rounded-xl" /> : <div key={b.id} className="grid h-32 place-items-center rounded-xl bg-neutral-bg text-12 text-t2">{b.t === 'banner' ? 'بنر' : 'تصویر'}</div>) : b.t === 'product' ? <div key={b.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><ProductImg pid={b.v} size={56} /><b className="text-13">{d.products.find((p) => p.id === b.v)?.title}</b></div> : <a key={b.id} href={b.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand">{b.t === 'video' ? <Video size={14} /> : <Link2 size={14} />}{b.v || b.href}</a>)}</article></Modal>
    </div>
  )
}

/** مشترکان خبرنامه، علاقه‌مندی‌هایشان و ارسال هدفمند */
export function NewsletterTab() {
  const d = useDB(); const N = d.newsletter; const [interest, setInterest] = useState('all'); const [msg, setMsg] = useState(false); const [text, setText] = useState('غنیمت: کالاهای تازهٔ استوک این هفته رسید. ghanimat.example/stock')
  const interests = [...new Set(N.flatMap((n) => n.interests))]
  const target = N.filter((n) => n.active && (interest === 'all' || n.interests.includes(interest)))
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI featured label="مشترک فعال" value={fa(N.filter((n) => n.active).length)} /><KPI label="پیامکی" value={fa(N.filter((n) => n.channel === 'پیامک').length)} /><KPI label="ایمیلی" value={fa(N.filter((n) => n.channel === 'ایمیل').length)} /><KPI label="لغو اشتراک" value={fa(N.filter((n) => !n.active).length)} goodDown /></div>
      <div className="grid gap-4 lg:grid-cols-2"><Card title="علاقه‌مندی‌های انتخاب‌شده"><Bars data={interests.map((x) => ({ label: x, value: N.filter((n) => n.interests.includes(x)).length }))} /></Card><Card title="محل عضویت"><Bars data={[...new Set(N.map((n) => n.source))].map((x) => ({ label: x, value: N.filter((n) => n.source === x).length }))} /></Card></div>
      <DataTable name="مشترکان خبرنامه" rows={N} rowKey={(n) => n.id} empty={{ title: 'هنوز کسی عضو نشده است.' }} search={(n) => `${n.contact} ${n.interests.join(' ')}`}
        filters={<><Select className="w-44" value={interest} onChange={setInterest} options={[['all', 'همهٔ علاقه‌مندی‌ها'], ...interests.map((x) => [x, x] as [string, string])]} /><Button size="sm" variant="primary" icon={<Send size={13} />} onClick={() => setMsg(true)}>ارسال به {fa(target.length)} نفر</Button></>}
        cols={[{ key: 'c', title: 'تماس', render: (n) => <span className="ltr">{n.contact}</span> }, { key: 'ch', title: 'کانال', render: (n) => n.channel }, { key: 'i', title: 'علاقه‌مندی‌ها', wrap: true, render: (n) => <span className="flex flex-wrap gap-1">{n.interests.map((x) => <Badge key={x} dot={false}>{x}</Badge>)}</span> }, { key: 's', title: 'محل عضویت', render: (n) => n.source }, { key: 'at', title: 'عضویت', render: (n) => <span className="text-12 text-t2">{rel(n.at)}</span>, sort: (n) => n.at }, { key: 'a', title: 'وضعیت', render: (n) => (n.active ? <Badge tone="success">فعال</Badge> : <Badge>لغو شده</Badge>) }]}
        actions={(n) => [{ label: n.active ? 'لغو اشتراک' : 'فعال‌سازی دوباره', onClick: () => mutate((x) => { const y = x.newsletter.find((z) => z.id === n.id)!; y.active = !y.active }, { action: 'تغییر اشتراک خبرنامه', target: n.contact }) }]} />
      <Modal open={msg} onClose={() => setMsg(false)} title={`ارسال به ${fa(target.length)} مشترک`} footer={<Button variant="primary" onClick={() => { target.filter((t) => t.channel === 'پیامک').forEach((t) => sendSms(t.contact, text, 'خبرنامه')); setMsg(false); toast(`برای ${fa(target.length)} مشترک ارسال شد.`) }}>ارسال</Button>}><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /><p className="mt-2 text-11 text-t2">سقف هفتگی پیامک خبرنامه: {fa(d.cx.notifications.smsWeeklyCap)} پیام.</p></Modal>
    </div>
  )
}
