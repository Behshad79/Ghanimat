import { StoriesTab } from '../analytics/Traffic'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Monitor, Plus, Search, Smartphone, Upload } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Tabs } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { figmaUrl, type El, type PageDef, type Sec } from '@/shared/data/pages'
import { fileToImage } from '@/shared/lib/image'
import { useTab } from '../pages/_shared'
import { Canvas, type Sel } from './Canvas'
import { Inspector } from './Inspector'
import { BadgesTab, BannersTab, BlogTab, CategoriesTab, ClicksTab, NewsletterTab, ThemeTab } from './BuilderTabs'

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const SECTION_LIB: [string, string, () => El[]][] = [
  ['banner', 'بنر تمام‌عرض', () => [{ id: uid('el'), kind: 'banner', label: 'بنر تازه', w: 1440, h: 320, clicks: 0, views: 0 }]],
  ['twobanner', 'دو بنر کنار هم', () => [{ id: uid('el'), kind: 'banner', label: 'بنر راست', w: 700, h: 300, clicks: 0, views: 0 }, { id: uid('el'), kind: 'banner', label: 'بنر چپ', w: 700, h: 300, clicks: 0, views: 0 }]],
  ['products', 'ردیف کالا', () => [{ id: uid('el'), kind: 'heading', label: 'عنوان', text: 'عنوان ردیف', clicks: 0, views: 0 }, { id: uid('el'), kind: 'products', label: 'کالاها', source: 'انتخاب دستی', count: 8, clicks: 0, views: 0 }]],
  ['amazing', 'پیشنهاد با تایمر', () => [{ id: uid('el'), kind: 'heading', label: 'عنوان', text: 'پیشنهاد ویژه', clicks: 0, views: 0 }, { id: uid('el'), kind: 'timer', label: 'تایمر', text: 'تا پایان', end: new Date(Date.now() + 864e5).toISOString(), clicks: 0, views: 0 }, { id: uid('el'), kind: 'products', label: 'کالاها', source: 'کمپین فعال غنی‌آف', count: 8, clicks: 0, views: 0 }]],
  ['features', 'ویژگی‌ها با آیکون', () => ['تضمین اصالت', 'ارسال سریع', 'گارانتی'].map((t, i) => ({ id: uid('el'), kind: 'icon' as const, label: t, text: t, icon: ['shield-check', 'location-pin', 'clock'][i], clicks: 0, views: 0 }))],
  ['text', 'متن و دکمه', () => [{ id: uid('el'), kind: 'heading', label: 'عنوان', text: 'عنوان تازه', clicks: 0, views: 0 }, { id: uid('el'), kind: 'text', label: 'متن', text: 'متن را اینجا بنویسید.', clicks: 0, views: 0 }, { id: uid('el'), kind: 'button', label: 'دکمه', text: 'بیشتر بدانید', href: '/', clicks: 0, views: 0 }]],
  ['faq', 'پرسش‌های متداول', () => [{ id: uid('el'), kind: 'list', label: 'پرسش‌ها', items: ['پرسش ۱', 'پرسش ۲'], clicks: 0, views: 0 }]],
  ['video', 'ویدیو', () => [{ id: uid('el'), kind: 'video', label: 'ویدیو', text: 'ویدیوی معرفی', clicks: 0, views: 0 }]],
]

/** صفحه‌ساز دیداری: همهٔ صفحه‌های سایت و پنل مشتری، کلیک روی هر جا و ویرایش دستی یا با AI */
export function Builder() {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useTab('builder')
  const [pid, setPid] = useState(d.pages[0]?.id ?? ''); const [q, setQ] = useState(''); const [sel, setSel] = useState<Sel>(null)
  const [heat, setHeat] = useState(false); const [mobile, setMobile] = useState(false); const [lib, setLib] = useState(false); const [cmp, setCmp] = useState<'off' | 'side' | 'over'>('off'); const [op, setOp] = useState(50)
  const page = d.pages.find((p) => p.id === pid) ?? d.pages[0]
  const groups = useMemo(() => [...new Set(d.pages.map((p) => p.group))], [d.pages])
  const dirty = JSON.stringify(d.pages) !== JSON.stringify(d.pagesPublished.length ? d.pagesPublished : d.pages)
  const upd = (fn: (p: PageDef) => void, log?: string) => mutate((x) => { const p = x.pages.find((y) => y.id === page.id)!; fn(p); p.updated = new Date().toISOString() }, log ? { action: log, target: page.title } : undefined)
  const sec = page?.sections.find((s) => s.id === sel?.sec); const el = sec?.els.find((e) => e.id === sel?.el)
  const move = (a: number, b: number) => { if (b < 0 || b >= page.sections.length) return; upd((p) => { const [x] = p.sections.splice(a, 1); p.sections.splice(b, 0, x) }, 'جابه‌جایی بخش') }
  const T = d.theme
  return (
    <Page title="صفحه‌ساز سایت و پنل مشتری" module="content" sub={`${fa(d.pages.length)} صفحه از سایت‌مپ‌های فیگما؛ روی هر بخش، کارت، متن، بنر یا آیکون بزنید تا ویرایش شود.`}
      actions={<><Button onClick={() => nav('/admin/site')}>سربرگ، منو و فوتر</Button><Button variant="ghost" onClick={() => nav('/admin/experience')}>تنظیمات رفتاری</Button></>}
      primary={<Button variant="primary" icon={<Upload size={14} />} disabled={!dirty} onClick={async () => { if (await confirm({ title: 'تغییرات صفحه‌ها منتشر شود؟', body: 'همهٔ صفحه‌های ویرایش‌شده روی سایت می‌روند. نسخهٔ قبلی در لاگ ممیزی ثبت است.', confirm: 'انتشار' })) { mutate((x) => { x.pagesPublished = structuredClone(x.pages) }, { action: 'انتشار صفحه‌ساز', target: `${d.pages.length} صفحه` }); toast('صفحه‌ها منتشر شدند.') } }}>{dirty ? 'انتشار تغییرات' : 'همه منتشر شده'}</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'builder', label: 'صفحه‌ساز' }, { id: 'stories', label: 'استوری‌ها', count: d.traffic.stories.filter((x) => x.on).length }, { id: 'banners', label: 'بنرها', count: d.pages.flatMap((p) => p.sections.flatMap((s) => s.els)).filter((e) => e.kind === 'banner').length }, { id: 'clicks', label: 'آمار کلیک' }, { id: 'theme', label: 'پوسته و رنگ' }, { id: 'categories', label: 'دسته‌ها و آیکون‌ها' }, { id: 'badges', label: 'نشان‌های کارت کالا' }, { id: 'blog', label: 'نویسندهٔ وبلاگ' }, { id: 'newsletter', label: 'خبرنامه', count: d.newsletter.filter((n) => n.active).length }]} />}>
      {tab === 'builder' && page && <div className="grid gap-3 xl:grid-cols-[230px_1fr_330px]">
        <Card pad={false} className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          <div className="border-b border-line p-2"><div className="relative"><Search size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-t3" /><Input aria-label="جست‌وجوی صفحه" className="h-9 pr-8" placeholder="جست‌وجوی صفحه…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
          {groups.map((g) => { const list = d.pages.filter((p) => p.group === g && (!q || p.title.includes(q) || p.path.includes(q))); if (!list.length) return null; return <div key={g} className="p-2"><p className="px-2 pb-1 text-11 font-semibold text-t3">{g}</p>{list.map((p) => <button key={p.id} onClick={() => { setPid(p.id); setSel(null) }} className={cx('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-right text-12', p.id === page.id ? 'bg-brand-solid text-white' : 'hover:bg-neutral-bg')}><span className="truncate">{p.title}</span><span className={cx('text-[10px]', p.id === page.id ? 'text-white/80' : 'text-t3')}>{fa(p.sections.length)}</span></button>)}</div> })}
        </Card>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented size="sm" value={mobile ? 'm' : 'd'} onChange={(v) => setMobile(v === 'm')} options={[['d', <span key="d" className="flex items-center gap-1"><Monitor size={13} />دسکتاپ</span>], ['m', <span key="m" className="flex items-center gap-1"><Smartphone size={13} />موبایل</span>]]} />
            <Button size="sm" variant={heat ? 'primary' : 'secondary'} icon={<Flame size={13} />} onClick={() => setHeat(!heat)}>نقشهٔ کلیک</Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setLib(!lib)}>افزودن بخش</Button>
            <Segmented size="sm" value={cmp} onChange={setCmp} options={[['off', 'بدون مقایسه'], ['side', 'کنار فیگما'], ['over', 'روی فیگما']]} />
            {cmp === 'over' && <input aria-label="شفافیت" type="range" min={10} max={90} value={op} onChange={(e) => setOp(+e.target.value)} className="w-24" />}
            {page.node && <a href={figmaUrl(page.node)} target="_blank" rel="noreferrer" className="text-12 text-brand underline">فریم در فیگما</a>}
            <label className="cursor-pointer text-12 text-t2 underline">بارگذاری تصویر فیگما<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const src = await fileToImage(f, 1440, 0.8); upd((p) => { p.ref = src }, 'بارگذاری تصویر مرجع فیگما'); setCmp('side') }} /></label>
            <span className="mr-auto text-11 text-t2"><span className="ltr">{page.path}</span> · فیگما: {page.figma}</span>
          </div>
          {lib && <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-2 sm:grid-cols-4">{SECTION_LIB.map(([k, l, make]) => <button key={k} onClick={() => { upd((p) => { const at = sel?.sec ? p.sections.findIndex((s) => s.id === sel.sec) + 1 : p.sections.length; p.sections.splice(at, 0, { id: uid('sec'), type: k, name: l, els: make() }) }, `افزودن بخش «${l}»`); setLib(false) }} className="rounded-xl border border-line px-2 py-3 text-12 hover:border-brand hover:text-brand">{l}</button>)}</div>}
          {cmp !== 'off' && !page.ref && <p className="rounded-xl bg-warning-bg px-3 py-2 text-12 text-warning">تصویر فیگمای این صفحه هنوز نیامده است. از فیگما فریم دسکتاپ را PNG خروجی بگیرید و «بارگذاری تصویر فیگما» را بزنید.</p>}
          <div className={cx(cmp === 'side' && page.ref && 'grid grid-cols-2 gap-2')}>
          {cmp === 'side' && page.ref && <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-line"><p className="sticky top-0 z-10 bg-surface px-2 py-1 text-11 font-semibold">طرح فیگما</p><img src={page.ref} alt="طرح فیگما" className="w-full" /></div>}
          <div className={cx('relative mx-auto overflow-hidden rounded-2xl border border-line shadow-sm transition-all', mobile && 'w-[390px] max-w-full border-[6px] border-[#10123d]', cmp === 'side' && page.ref && 'max-h-[80vh] overflow-y-auto')}>
            {cmp === 'over' && page.ref && <img src={page.ref} alt="طرح فیگما" className="pointer-events-none absolute inset-x-0 top-0 z-30 w-full" style={{ opacity: op / 100 }} />}
            <Canvas page={page} theme={T} sel={sel} onSel={setSel} heat={heat} mobile={mobile} onMove={move}
              onDup={(i) => upd((p) => { const c = structuredClone(p.sections[i]); c.id = uid('sec'); c.name += ' (کپی)'; c.els.forEach((e) => (e.id = uid('el'))); p.sections.splice(i + 1, 0, c) }, 'کپی بخش')}
              onHide={(i) => upd((p) => { p.sections[i].hidden = !p.sections[i].hidden }, 'پنهان/نمایش بخش')}
              onDel={async (i) => { if (await confirm({ title: `بخش «${page.sections[i].name}» حذف شود؟`, body: 'تا پیش از انتشار، با «بازگردانی» در لاگ ممیزی برمی‌گردد.', danger: true, confirm: 'حذف بخش' })) { upd((p) => { p.sections.splice(i, 1) }, 'حذف بخش'); setSel(null) } }} />
          </div>
          </div>
        </div>
        <Card className="h-fit xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          {sel?.sec === '__header' ? <div className="space-y-3"><p className="text-15 font-bold">سربرگ سایت</p>
            <Field label={`اندازهٔ لوگو در دسکتاپ (${fa(T.logoHeight)} پیکسل)`}><input aria-label="اندازهٔ لوگو دسکتاپ" type="range" min={18} max={56} value={T.logoHeight} onChange={(e) => mutate((x) => { x.theme.logoHeight = +e.target.value })} className="w-full accent-[var(--brand-solid)]" /></Field>
            <Field label={`اندازهٔ لوگو در موبایل (${fa(T.logoHeightMobile)} پیکسل)`}><input aria-label="اندازهٔ لوگو موبایل" type="range" min={16} max={40} value={T.logoHeightMobile} onChange={(e) => mutate((x) => { x.theme.logoHeightMobile = +e.target.value })} className="w-full accent-[var(--brand-solid)]" /></Field>
            <Button className="w-full" onClick={() => nav('/admin/site?tab=header')}>منو، نوار اعلان و لینک‌های سربرگ</Button></div>
          : sel?.sec === '__footer' ? <div className="space-y-3"><p className="text-15 font-bold">فوتر</p><p className="text-12 text-t2">ستون‌ها، شبکه‌های اجتماعی، نمادها، خبرنامه و متن سئوی فوتر.</p><Button className="w-full" variant="primary" onClick={() => nav('/admin/site')}>ویرایش فوتر بخش به بخش</Button></div>
          : sec ? <Inspector pageTitle={page.title} sec={sec} el={el}
              onEl={(p, log) => upd((pg) => { Object.assign(pg.sections.find((s) => s.id === sec.id)!.els.find((x) => x.id === el!.id)!, p) }, log)}
              onSec={(p, log) => upd((pg) => { Object.assign(pg.sections.find((s) => s.id === sec.id)!, p) }, log)}
              onAddEl={(kind) => { const ne: El = { id: uid('el'), kind, label: 'المان تازه', text: kind === 'button' ? 'دکمه' : kind === 'heading' ? 'عنوان تازه' : 'متن', w: kind === 'banner' ? 1440 : kind === 'image' ? 400 : undefined, h: kind === 'banner' ? 300 : kind === 'image' ? 300 : undefined, items: ['chips', 'list'].includes(kind) ? ['آیتم ۱', 'آیتم ۲'] : undefined, count: kind === 'products' ? 8 : undefined, source: kind === 'products' ? 'انتخاب دستی' : undefined, clicks: 0, views: 0 }; upd((pg) => { pg.sections.find((s) => s.id === sec.id)!.els.push(ne) }, 'افزودن المان'); setSel({ sec: sec.id, el: ne.id }) }}
              onDelEl={async () => { if (await confirm({ title: `«${el!.label}» حذف شود؟`, body: 'از این بخش برداشته می‌شود.', danger: true, confirm: 'حذف' })) { upd((pg) => { const s = pg.sections.find((x) => x.id === sec.id)!; s.els = s.els.filter((x) => x.id !== el!.id) }, 'حذف المان'); setSel({ sec: sec.id }) } }} />
          : <div className="space-y-2 text-13 text-t2"><p className="font-bold text-t1">روی هر جای صفحه بزنید.</p><p>هر بخش، کارت، متن، دکمه، بنر، آیکون، چیپ یا تایمر با کلیک انتخاب می‌شود. بخش‌ها را با دستگیره بکشید و جابه‌جا کنید.</p><p className="flex flex-wrap gap-1 pt-2">{page.sections.map((s) => <button key={s.id} onClick={() => setSel({ sec: s.id })} className="rounded-full border border-line px-2 py-0.5 text-11 hover:border-brand">{s.name}</button>)}</p>{dirty && <Badge tone="warning">تغییرات منتشرنشده</Badge>}</div>}
        </Card>
      </div>}
      {tab === 'banners' && <BannersTab onOpen={(p, s, e) => { setPid(p); setSel({ sec: s, el: e }); setTab('builder') }} />}
      {tab === 'clicks' && <ClicksTab onOpen={(p, s, e) => { setPid(p); setSel({ sec: s, el: e }); setHeat(true); setTab('builder') }} />}
      {tab === 'theme' && <ThemeTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'badges' && <BadgesTab />}
      {tab === 'blog' && <BlogTab />}
      {tab === 'newsletter' && <NewsletterTab />}
      {tab === 'stories' && <StoriesTab />}
    </Page>
  )
}
export type { Sec }
