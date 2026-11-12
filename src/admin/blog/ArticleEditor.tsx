import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlignRight, ArrowDown, ArrowUp, Bold, CalendarClock, Copy, Eye, GripVertical, Heading2, Heading3, Image as ImageIcon, Italic, LayoutList, Link2, List, ListOrdered, Megaphone, Minus, MonitorSmartphone, Package, PackageSearch, Pilcrow, Play, Plus, Quote, Rows3, Search, Send, Sparkles, SquareStack, Table2, Trash2, Underline } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'
import { readMin, type Block, type BlockT, type Post } from '@/shared/data/blog'
import { ArticlePreview, RenderBlock } from './Render'

const PALETTE: [BlockT, string, typeof Pilcrow, string][] = [
  ['p', 'پاراگراف', Pilcrow, 'متن با بولد، لینک و فهرست'], ['h2', 'تیتر بخش', Heading2, 'در فهرست مطالب می‌آید'], ['h3', 'زیرتیتر', Heading3, ''],
  ['img', 'تصویر', ImageIcon, 'با متن جایگزین و زیرنویس'], ['banner', 'بنر تبلیغاتی', Megaphone, '۱۲۰۰×۴۰۰ با لینک و آمار کلیک'], ['product', 'کارت کالا', Package, 'یک کالا با قیمت و تخفیف'],
  ['products', 'ردیف کالاهای مرتبط', PackageSearch, 'چند کالا در یک ردیف'], ['compare', 'مقایسهٔ دو گزینه', SquareStack, 'مثل استوک در برابر اکبند'], ['grades', 'جدول', Table2, 'مثل جدول گرید ظاهری'],
  ['callout', 'کادر نکته یا هشدار', Sparkles, ''], ['summary', 'خلاصه', AlignRight, 'جمع‌بندی پایان مقاله'], ['quote', 'نقل قول', Quote, 'با نام گوینده'],
  ['cta', 'دعوت به اقدام', Send, 'متن و دکمه با لینک'], ['faq', 'پرسش‌های متداول', Rows3, 'برای اسکیمای FAQ گوگل'], ['video', 'ویدیو', Play, 'از کتابخانهٔ ویدیو یا لینک آپارات'],
  ['link', 'لینک داخلی یا بیرونی', Link2, 'کارت لینک'], ['toc', 'فهرست مطالب', LayoutList, 'خودکار از تیترها'], ['divider', 'جداکننده', Minus, ''],
]
const nb = (t: BlockT): Block => ({ id: `${t}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, t, ...(t === 'banner' ? { w: 1200, h: 400 } : t === 'grades' || t === 'faq' ? { rows: [['', '']] } : t === 'compare' ? { cols: [{ title: '', sub: '', points: '' }, { title: '', sub: '', points: '' }] } : t === 'products' ? { pids: [] } : t === 'callout' ? { tone: 'info' } : {}) })

/** متن غنی پاراگراف: بولد، ایتالیک، زیرخط، لینک و فهرست */
function RichText({ html, onChange }: { html?: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (html ?? '')) ref.current.innerHTML = html ?? '' }, [])
  const cmd = (c: string, v?: string) => { ref.current?.focus(); document.execCommand(c, false, v); onChange(ref.current?.innerHTML ?? '') }
  const B = ({ c, icon, label, v }: { c: string; icon: ReactNode; label: string; v?: () => string | undefined }) => <button type="button" title={label} aria-label={label} onMouseDown={(e) => { e.preventDefault(); const x = v ? v() : undefined; if (v && !x) return; cmd(c, x) }} className="grid size-7 place-items-center rounded-md text-t2 hover:bg-neutral-bg hover:text-brand">{icon}</button>
  return (
    <div className="rounded-xl border border-line focus-within:border-brand/50">
      <div className="flex flex-wrap gap-0.5 border-b border-line p-1"><B c="bold" icon={<Bold size={14} />} label="بولد" /><B c="italic" icon={<Italic size={14} />} label="ایتالیک" /><B c="underline" icon={<Underline size={14} />} label="زیرخط" /><B c="createLink" icon={<Link2 size={14} />} label="لینک" v={() => window.prompt('نشانی لینک (داخلی مثل /product/... یا بیرونی):') ?? undefined} /><B c="insertUnorderedList" icon={<List size={14} />} label="فهرست" /><B c="insertOrderedList" icon={<ListOrdered size={14} />} label="فهرست شماره‌دار" /><B c="removeFormat" icon={<span className="text-[11px]">پاک</span>} label="پاک کردن قالب" /></div>
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label="متن پاراگراف" onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)} className="prose-gh min-h-16 px-3 py-2 text-14 leading-8 outline-none" />
    </div>
  )
}

/** فرم ویرایش هر نوع بلوک */
function BlockForm({ b, set, post }: { b: Block; set: (p: Partial<Block>) => void; post: Post }) {
  const d = useDB(); const products = d.products.map((p) => [p.id, p.en] as [string, string])
  const upload = async (f?: File) => { if (f) set({ src: await fileToImage(f, 1600, 0.85) }) }
  const rows = b.rows ?? []; const setRow = (i: number, j: 0 | 1, v: string) => set({ rows: rows.map((r, k) => (k === i ? (j ? [r[0], v] : [v, r[1]]) as [string, string] : r)) })
  switch (b.t) {
    case 'h2': case 'h3': return <Input className={cx('font-bold', b.t === 'h2' ? 'text-18' : 'text-15')} placeholder={b.t === 'h2' ? 'تیتر بخش' : 'زیرتیتر'} value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} />
    case 'p': return <RichText html={b.html} onChange={(h) => set({ html: h })} />
    case 'img': case 'banner': return <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-2 hover:border-brand/50">{b.src ? <img src={b.src} alt="" className="h-16 rounded-lg object-cover" style={{ aspectRatio: b.t === 'banner' ? `${b.w}/${b.h}` : undefined }} /> : <ImageIcon size={20} className="text-t2" />}<span className="text-12">{b.src ? 'جایگزینی تصویر' : 'بارگذاری تصویر'}{b.t === 'banner' && <span className="block text-11 text-t2">اندازهٔ لازم: {fa(b.w ?? 1200)}×{fa(b.h ?? 400)} پیکسل · WebP</span>}</span><input type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} /></label>
      <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="متن جایگزین (alt) برای سئو" value={b.alt ?? ''} onChange={(e) => set({ alt: e.target.value })} />{b.t === 'img' ? <Input placeholder="زیرنویس تصویر" value={b.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} /> : <Input className="ltr text-left" placeholder="لینک بنر، مثلا /category/stock" value={b.href ?? ''} onChange={(e) => set({ href: e.target.value })} />}</div>
      {b.t === 'banner' && <div className="flex items-center gap-2 text-12">اندازه: <Input type="number" className="h-8 w-20" value={b.w} onChange={(e) => set({ w: +e.target.value })} />×<Input type="number" className="h-8 w-20" value={b.h} onChange={(e) => set({ h: +e.target.value })} /><span className="text-t2">کلیک‌ها در «آمار کلیک» صفحه‌ساز ثبت می‌شود.</span></div>}
    </div>
    case 'product': return <div className="grid gap-2 sm:grid-cols-2"><Select value={b.pid ?? ''} onChange={(v) => set({ pid: v })} placeholder="انتخاب کالا" options={products} /><Input placeholder="توضیح زیر کارت (اختیاری)" value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} /></div>
    case 'products': return <div className="space-y-2"><Input placeholder="عنوان ردیف، مثلا کالاهای مرتبط" value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} /><div className="flex flex-wrap gap-1.5">{d.products.map((p) => { const on = (b.pids ?? []).includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => set({ pids: on ? (b.pids ?? []).filter((x) => x !== p.id) : [...(b.pids ?? []), p.id] })} className={cx('h-8 rounded-full border px-2.5 text-11', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{p.en}</button> })}</div></div>
    case 'compare': return <div className="grid gap-2 sm:grid-cols-2">{(b.cols ?? []).map((c, i) => <div key={i} className="space-y-1.5 rounded-xl border border-line p-2"><Input placeholder="عنوان" value={c.title} onChange={(e) => set({ cols: (b.cols ?? []).map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} /><Input placeholder="زیرعنوان" value={c.sub} onChange={(e) => set({ cols: (b.cols ?? []).map((x, k) => (k === i ? { ...x, sub: e.target.value } : x)) })} /><Textarea rows={3} placeholder="هر ویژگی در یک خط" value={c.points} onChange={(e) => set({ cols: (b.cols ?? []).map((x, k) => (k === i ? { ...x, points: e.target.value } : x)) })} /></div>)}</div>
    case 'grades': case 'faq': return <div className="space-y-1.5">{rows.map((r, i) => <div key={i} className="flex gap-2"><Input className={b.t === 'grades' ? 'w-24' : ''} placeholder={b.t === 'faq' ? 'پرسش' : 'ستون اول'} value={r[0]} onChange={(e) => setRow(i, 0, e.target.value)} /><Input placeholder={b.t === 'faq' ? 'پاسخ' : 'ستون دوم'} value={r[1]} onChange={(e) => setRow(i, 1, e.target.value)} /><button type="button" aria-label="حذف ردیف" onClick={() => set({ rows: rows.filter((_, k) => k !== i) })} className="text-t2 hover:text-danger"><Trash2 size={14} /></button></div>)}<Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => set({ rows: [...rows, ['', '']] })}>ردیف تازه</Button></div>
    case 'callout': return <div className="flex gap-2"><Select className="w-32" value={b.tone ?? 'info'} onChange={(v) => set({ tone: v as Block['tone'] })} options={[['info', 'اطلاع'], ['tip', 'نکته'], ['warn', 'هشدار']]} /><Input value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} placeholder="متن کادر" /></div>
    case 'summary': return <Textarea rows={2} value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} placeholder="جمع‌بندی در یک یا دو جمله" />
    case 'quote': return <div className="space-y-2"><Textarea rows={2} value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} placeholder="متن نقل قول" /><Input value={b.author ?? ''} onChange={(e) => set({ author: e.target.value })} placeholder="گوینده" /></div>
    case 'cta': return <div className="grid gap-2 sm:grid-cols-3"><Input value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} placeholder="متن" /><Input value={b.btn ?? ''} onChange={(e) => set({ btn: e.target.value })} placeholder="متن دکمه" /><Input className="ltr text-left" value={b.href ?? ''} onChange={(e) => set({ href: e.target.value })} placeholder="/product/..." /></div>
    case 'video': return <div className="grid gap-2 sm:grid-cols-2"><Select value={b.vid ?? ''} onChange={(v) => set({ vid: v })} placeholder="از کتابخانهٔ ویدیو" options={d.blog.videos.map((v) => [v.id, v.title] as [string, string])} /><Input className="ltr text-left" value={b.href ?? ''} onChange={(e) => set({ href: e.target.value })} placeholder="یا لینک آپارات / یوتیوب" /></div>
    case 'link': return <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input value={b.v ?? ''} onChange={(e) => set({ v: e.target.value })} placeholder="عنوان لینک" /><Input className="ltr text-left" value={b.href ?? ''} onChange={(e) => set({ href: e.target.value, external: /^https?:/.test(e.target.value) })} placeholder="/category/... یا https://..." /><Badge>{b.external ? 'بیرونی (nofollow)' : 'داخلی'}</Badge></div>
    case 'toc': return <p className="text-12 text-t2">خودکار از {fa(post.blocks.filter((x) => x.t === 'h2').length)} تیتر بخش ساخته می‌شود.</p>
    case 'divider': return null
  }
}

export function ArticleEditor() {
  const { id = '' } = useParams(); const d = useDB(); const nav = useNavigate(); const post = d.blog.posts.find((p) => p.id === id)
  const [side, setSide] = useState('settings'); const [ins, setIns] = useState<number | null>(null); const [q, setQ] = useState(''); const [prev, setPrev] = useState<null | 'desk' | 'mob'>(null); const [drag, setDrag] = useState<number | null>(null); const [focus, setFocus] = useState<string | null>(null)
  if (!post) return <Page title="مقاله پیدا نشد" back="/admin/blog"><Card><Button onClick={() => nav('/admin/blog')}>بازگشت به وبلاگ</Button></Card></Page>
  const up = (fn: (p: Post) => void, log?: string) => mutate((x) => fn(x.blog.posts.find((p) => p.id === id)!), log ? { action: log, target: post.title } : undefined)
  const setB = (bid: string, patch: Partial<Block>) => up((p) => { Object.assign(p.blocks.find((b) => b.id === bid)!, patch) })
  const insert = (t: BlockT, at = ins) => { if (at === null) return; const blk = nb(t); up((p) => { p.blocks.splice(at, 0, blk) }, 'افزودن بلوک به مقاله'); setIns(null); setQ(''); setFocus(blk.id) }
  const move = (from: number, to: number) => { if (to < 0 || to >= post.blocks.length) return; up((p) => { const [m] = p.blocks.splice(from, 1); p.blocks.splice(to, 0, m) }) }
  const seoT = post.seo.title || post.title; const seoD = post.seo.desc || post.excerpt
  const checks = [[post.blocks.some((b) => b.t === 'h2'), 'تیتر بخش دارد'], [!!post.cover, 'تصویر شاخص دارد'], [seoT.length <= 60, `عنوان سئو ${fa(seoT.length)} از ۶۰ نویسه`], [seoD.length >= 70 && seoD.length <= 160, `توضیح متا ${fa(seoD.length)} نویسه (۷۰ تا ۱۶۰)`], [post.blocks.some((b) => b.t === 'product' || b.t === 'products'), 'لینک به کالا دارد'], [post.blocks.filter((b) => b.t === 'img' || b.t === 'banner').every((b) => b.alt), 'همهٔ تصاویر متن جایگزین دارند']] as [boolean, string][]
  const Gap = ({ at }: { at: number }) => <div className="group/gap relative h-4"><button type="button" aria-label="افزودن بلوک" onClick={() => setIns(at)} className="absolute inset-x-0 top-1/2 mx-auto grid size-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-t2 opacity-0 transition-opacity group-hover/gap:opacity-100 hover:border-brand hover:text-brand focus:opacity-100"><Plus size={13} /></button></div>
  return (
    <Page title={post.title || 'مقالهٔ بی‌عنوان'} module="blog" back="/admin/blog" badge={<Badge tone={post.status === 'منتشرشده' ? 'success' : post.status === 'زمان‌بندی‌شده' ? 'info' : 'neutral'}>{post.status}</Badge>} sub={`${post.category} · ${fa(readMin(post))} دقیقه مطالعه · ${fa(post.blocks.length)} بلوک · ذخیرهٔ خودکار`}
      actions={<><Button icon={<Eye size={14} />} onClick={() => setPrev('desk')}>پیش‌نمایش</Button><Button icon={<MonitorSmartphone size={14} />} onClick={() => setPrev('mob')}>موبایل</Button></>}
      primary={<Button variant="primary" icon={<Send size={14} />} onClick={() => { const later = new Date(post.publishAt).getTime() > Date.now() + 6e4; up((p) => { p.status = later ? 'زمان‌بندی‌شده' : 'منتشرشده' }, later ? 'زمان‌بندی مقاله' : 'انتشار مقاله'); toast(later ? 'مقاله برای زمان تعیین‌شده زمان‌بندی شد.' : 'مقاله منتشر شد.') }}>{new Date(post.publishAt).getTime() > Date.now() + 6e4 ? 'زمان‌بندی انتشار' : 'انتشار'}</Button>}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card pad={false}>
          <div className="border-b border-line p-4"><textarea rows={2} value={post.title} onChange={(e) => up((p) => { p.title = e.target.value })} aria-label="عنوان مقاله" placeholder="عنوان مقاله" className="w-full resize-none bg-transparent text-22 font-black leading-snug outline-none" /><textarea rows={2} value={post.excerpt} onChange={(e) => up((p) => { p.excerpt = e.target.value })} aria-label="خلاصهٔ مقاله" placeholder="خلاصهٔ کوتاه (در فهرست وبلاگ و شبکه‌های اجتماعی)" className="mt-1 w-full resize-none bg-transparent text-14 text-t2 outline-none" /></div>
          <div className="p-4">
            <Gap at={0} />
            {post.blocks.map((b, i) => { const P = PALETTE.find((x) => x[0] === b.t)!; const PI = P[2]; const on = focus === b.id; return (
              <div key={b.id}>
                <div draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null) }} onClick={() => setFocus(b.id)} className={cx('group/b relative rounded-2xl border px-3 py-2 transition-colors', on ? 'border-brand/50 bg-brand-tint/30' : 'border-transparent hover:border-line', drag === i && 'opacity-40')}>
                  <div className={cx('absolute -top-3 left-3 z-10 flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-11 text-t2 shadow-sm transition-opacity', !on && 'opacity-0 group-hover/b:opacity-100')}><GripVertical size={14} className="cursor-grab" /><PI size={13} /><span className="font-medium">{P[1]}</span>
                    <span className="mr-auto flex gap-0.5">{[[<ArrowUp key="u" size={13} />, 'بالا', () => move(i, i - 1)], [<ArrowDown key="d" size={13} />, 'پایین', () => move(i, i + 1)], [<Copy key="c" size={13} />, 'تکثیر', () => up((p) => { p.blocks.splice(i + 1, 0, { ...structuredClone(b), id: `${b.t}${Date.now().toString(36)}` }) })], [<Trash2 key="t" size={13} />, 'حذف', () => up((p) => { p.blocks.splice(i, 1) }, 'حذف بلوک مقاله')]].map(([ic, l, fn]) => <button key={l as string} type="button" aria-label={l as string} title={l as string} onClick={(e) => { e.stopPropagation(); (fn as () => void)() }} className="grid size-6 place-items-center rounded-md hover:bg-surface hover:text-brand">{ic as ReactNode}</button>)}</span></div>
                  {on || ['p', 'h2', 'h3'].includes(b.t) ? <BlockForm b={b} post={post} set={(patch) => setB(b.id, patch)} /> : null}
                  {!['p', 'h2', 'h3', 'divider'].includes(b.t) && <div className={cx('pointer-events-none', on && 'mt-3 border-t border-dashed border-line pt-2')}><RenderBlock b={b} post={post} /></div>}
                  {b.t === 'divider' && <hr className="border-line" />}
                </div>
                <Gap at={i + 1} />
              </div>) })}
            {post.blocks.length === 0 && <button type="button" onClick={() => setIns(0)} className="w-full rounded-2xl border-2 border-dashed border-line p-8 text-13 text-t2 hover:border-brand/50">اولین بلوک را اضافه کنید</button>}
            <div className="mt-3 flex flex-wrap gap-1.5">{PALETTE.slice(0, 9).map(([t, l, I]) => <Button key={t} size="sm" variant="ghost" icon={<I size={13} />} onClick={() => insert(t, post.blocks.length)}>{l}</Button>)}<Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setIns(post.blocks.length)}>همهٔ بلوک‌ها</Button></div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card pad={false}><div className="border-b border-line px-3 pt-2"><Tabs value={side} onChange={setSide} tabs={[{ id: 'settings', label: 'تنظیمات' }, { id: 'seo', label: 'سئو' }, { id: 'related', label: 'مرتبط' }]} /></div>
            <div className="space-y-3 p-4">
              {side === 'settings' && <>
                <label className="block cursor-pointer overflow-hidden rounded-xl border border-dashed border-line">{post.cover ? <img src={post.cover} alt="" className="aspect-[16/8] w-full object-contain bg-neutral-bg" /> : <span className="grid aspect-[16/8] place-items-center text-12 text-t2">تصویر شاخص</span>}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const src = await fileToImage(f, 1600, 0.85); up((p) => { p.cover = src }, 'تغییر تصویر شاخص') } }} /></label>
                <Field label="وضعیت"><Select value={post.status} onChange={(v) => up((p) => { p.status = v as Post['status'] }, 'تغییر وضعیت مقاله')} options={['پیش‌نویس', 'در بازبینی', 'زمان‌بندی‌شده', 'منتشرشده']} /></Field>
                <Field label="زمان انتشار"><Input type="datetime-local" value={post.publishAt.slice(0, 16)} onChange={(e) => up((p) => { p.publishAt = new Date(e.target.value).toISOString() })} /></Field>
                <Field label="دسته"><Select value={post.category} onChange={(v) => up((p) => { p.category = v })} options={d.blog.cats} /></Field>
                <Field label="برچسب‌ها (با ویرگول)"><Input value={post.tags.join('، ')} onChange={(e) => up((p) => { p.tags = e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} /></Field>
                <Field label="نویسنده"><Select value={post.author} onChange={(v) => up((p) => { p.author = v })} options={['تحریریهٔ غنیمت', ...d.team.map((u) => u.name)]} /></Field>
                <Field label="بازبین تخصصی (اختیاری)"><Input value={post.reviewer ?? ''} onChange={(e) => up((p) => { p.reviewer = e.target.value })} placeholder="مثلا علی رضایی، متخصص تست سخت‌افزار" /></Field>
                <Toggle on={!!post.featured} onChange={(v) => up((p) => { p.featured = v }, v ? 'ویژه کردن مقاله' : 'برداشتن ویژه')} text="مقالهٔ ویژهٔ بالای صفحهٔ وبلاگ" />
              </>}
              {side === 'seo' && <>
                <div className="rounded-xl border border-line p-3"><p className="ltr truncate text-left text-11 text-success">ghanimat.ir › blog › {post.slug}</p><p className="mt-0.5 truncate text-[15px] text-[#1a0dab]">{seoT}</p><p className="line-clamp-2 text-12 text-t2">{seoD}</p></div>
                <Field label={`عنوان سئو (${fa(seoT.length)}/۶۰)`}><Input value={post.seo.title} placeholder={post.title} onChange={(e) => up((p) => { p.seo.title = e.target.value })} /></Field>
                <Field label={`توضیح متا (${fa(seoD.length)}/۱۶۰)`}><Textarea rows={3} value={post.seo.desc} placeholder={post.excerpt} onChange={(e) => up((p) => { p.seo.desc = e.target.value })} /></Field>
                <Field label="نشانی (slug)"><Input className="ltr text-left font-mono" value={post.slug} onChange={(e) => up((p) => { p.slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></Field>
                <ul className="space-y-1 text-12">{checks.map(([ok, l]) => <li key={l} className={cx('flex items-center gap-1.5', ok ? 'text-success' : 'text-warning')}><span className={cx('size-2 rounded-full', ok ? 'bg-success' : 'bg-warning')} />{l}</li>)}</ul>
                <p className="text-11 text-t2">اسکیمای Article، Breadcrumb و در صورت وجود بلوک پرسش‌ها، FAQ خودکار ساخته می‌شود.</p>
              </>}
              {side === 'related' && <><p className="text-12 text-t2">در پایان مقاله، بخش «مطالب مرتبط»:</p><ul className="space-y-1.5">{d.blog.posts.filter((p) => p.id !== post.id).map((p) => { const on = post.related.includes(p.id); return <li key={p.id}><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2 text-12"><input type="checkbox" className="accent-[#0000ff]" checked={on} onChange={() => up((x) => { x.related = on ? x.related.filter((r) => r !== p.id) : [...x.related, p.id] })} />{p.title}</label></li> })}</ul></>}
            </div></Card>
          <Card title="آمار این مقاله"><dl className="grid grid-cols-3 gap-2 text-center text-12">{[['بازدید', fa(post.views)], ['مفید بود', fa(post.helpful[0])], ['دیدگاه', fa(d.blog.comments.filter((c) => c.postId === post.id).length)]].map(([k, v]) => <div key={k} className="rounded-xl bg-neutral-bg p-2"><dt className="text-t2">{k}</dt><dd className="tnum text-15 font-bold">{v}</dd></div>)}</dl><p className="mt-2 flex items-center gap-1 text-11 text-t2"><CalendarClock size={12} />{new Date(post.publishAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</p></Card>
        </div>
      </div>
      <Modal open={ins !== null} onClose={() => { setIns(null); setQ('') }} wide title="افزودن بلوک">
        <div className="relative mb-3"><Search size={14} className="absolute top-2.5 right-2.5 text-t3" /><Input autoFocus className="pr-8" placeholder="جست‌وجوی بلوک (کالا، بنر، ویدیو…)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="grid gap-2 sm:grid-cols-3">{PALETTE.filter(([, l, , h]) => !q || l.includes(q) || h.includes(q)).map(([t, l, I, h]) => <button key={t} type="button" onClick={() => insert(t)} className="lift flex items-start gap-2 rounded-xl border border-line p-3 text-right hover:border-brand/50"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand"><I size={16} /></span><span><b className="block text-13">{l}</b>{h && <span className="text-11 text-t2">{h}</span>}</span></button>)}</div>
      </Modal>
      <Modal open={!!prev} onClose={() => setPrev(null)} wide title={<span className="flex items-center gap-2">پیش‌نمایش مقاله<Segmented size="sm" value={prev ?? 'desk'} onChange={(v) => setPrev(v)} options={[['desk', 'دسکتاپ'], ['mob', 'موبایل']]} /></span>}>
        <div className="max-h-[75vh] overflow-y-auto rounded-xl bg-[#f5f6fa] p-3"><ArticlePreview post={post} mobile={prev === 'mob'} /></div>
      </Modal>
    </Page>
  )
}
