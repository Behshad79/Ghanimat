import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Clapperboard, Eye, FileText, MessageSquare, Plus, Play, Star, Trash2, Upload, X } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Drawer, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'
import { readMin, type Post, type Video } from '@/shared/data/blog'
import { useTab } from '../pages/_shared'

const ST: Record<Post['status'], 'success' | 'info' | 'warning' | 'neutral'> = { 'منتشرشده': 'success', 'زمان‌بندی‌شده': 'info', 'در بازبینی': 'warning', 'پیش‌نویس': 'neutral' }

/** وبلاگ و ویدیوها: بخش اختصاصی برای مقاله‌ها، ویدیوها، چیدمان صفحهٔ وبلاگ، دیدگاه‌ها و دسته‌ها */
export function Blog() {
  const d = useDB(); const B = d.blog; const nav = useNavigate(); const [tab, setTab] = useTab('posts'); const [vid, setVid] = useState<Video | null>(null); const [nc, setNc] = useState(''); const [reply, setReply] = useState<Record<string, string>>({})
  const newPost = () => { const id = `ar${Date.now().toString(36)}`; mutate((x) => { x.blog.posts.unshift({ id, title: '', slug: id, excerpt: '', cover: '', category: x.blog.cats[0], tags: [], author: 'تحریریهٔ غنیمت', status: 'پیش‌نویس', publishAt: new Date().toISOString(), views: 0, helpful: [0, 0], seo: { title: '', desc: '' }, related: [], blocks: [{ id: `h${id}`, t: 'h2', v: '' }, { id: `p${id}`, t: 'p', html: '' }] }) }, { action: 'ساخت مقالهٔ تازه', target: id }); nav(`/admin/blog/${id}`) }
  const pending = B.comments.filter((c) => c.status === 'pending')
  const L = B.landing
  return (
    <Page title="وبلاگ و ویدیوها" module="blog" sub="مقاله‌ها با ویرایشگر بلوکی (متن، کالا، بنر، ویدیو، جدول، پرسش‌ها…)، ویدیوهای آموزشی، چیدمان صفحهٔ وبلاگ و دیدگاه‌ها."
      primary={<Button variant="primary" icon={<Plus size={14} />} onClick={tab === 'videos' ? () => setVid({ id: `v${Date.now().toString(36)}`, title: '', cat: B.videoCats[0], dur: '', views: 0, cover: '', url: '', status: 'پیش‌نویس', isNew: true }) : newPost}>{tab === 'videos' ? 'ویدیوی تازه' : 'مقالهٔ تازه'}</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'posts', label: 'مقاله‌ها', count: B.posts.length }, { id: 'videos', label: 'ویدیوها', count: B.videos.length }, { id: 'landing', label: 'صفحهٔ اصلی وبلاگ و ویدیو' }, { id: 'comments', label: 'دیدگاه‌ها', count: pending.length }, { id: 'cats', label: 'دسته‌ها' }]} />}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<FileText size={17} />} label="مقالهٔ منتشرشده" value={fa(B.posts.filter((p) => p.status === 'منتشرشده').length)} note={`${fa(B.posts.filter((p) => p.status === 'زمان‌بندی‌شده').length)} زمان‌بندی‌شده · ${fa(B.posts.filter((p) => p.status === 'پیش‌نویس' || p.status === 'در بازبینی').length)} در حال نگارش`} />
        <KPI icon={<Eye size={17} />} label="بازدید مقاله‌ها" value={fa(B.posts.reduce((a, p) => a + p.views, 0))} delta={12.4} />
        <KPI icon={<Clapperboard size={17} />} label="بازدید ویدیوها" value={fa(B.videos.reduce((a, v) => a + v.views, 0))} delta={8.1} />
        <KPI icon={<MessageSquare size={17} />} label="دیدگاه منتظر تأیید" tone="warning" value={fa(pending.length)} to="/admin/blog?tab=comments" />
      </div>
      {tab === 'posts' && <DataTable name="مقاله‌ها" rows={B.posts} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/blog/${p.id}`)} empty={{ title: 'هنوز مقاله‌ای نیست.', action: <Button variant="primary" onClick={newPost}>مقالهٔ تازه</Button> }}
        cols={[{ key: 't', title: 'مقاله', render: (p) => <span className="flex items-center gap-3">{p.cover ? <img src={p.cover} alt="" className="h-12 w-20 rounded-lg bg-neutral-bg object-contain" /> : <span className="grid h-12 w-20 place-items-center rounded-lg bg-neutral-bg text-11 text-t3">بدون تصویر</span>}<span className="min-w-0"><b className="line-clamp-1 text-13">{p.title || 'بی‌عنوان'}</b><span className="text-11 text-t2">{p.author} · {fa(readMin(p))} دقیقه · {fa(p.blocks.length)} بلوک{p.featured ? ' · ویژه' : ''}</span></span></span>, text: (p) => `${p.title} ${p.tags.join(' ')}` },
          { key: 'c', title: 'دسته', render: (p) => p.category }, { key: 's', title: 'وضعیت', render: (p) => <Badge tone={ST[p.status]}>{p.status}</Badge>, text: (p) => p.status },
          { key: 'd', title: 'انتشار', render: (p) => <span className="text-12 text-t2">{new Date(p.publishAt).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })}</span>, sort: (p) => p.publishAt },
          { key: 'v', title: 'بازدید', align: 'left', render: (p) => fa(p.views), sort: (p) => p.views },
          { key: 'h', title: 'مفید بود', align: 'left', render: (p) => p.helpful[0] + p.helpful[1] ? `${fa(Math.round((p.helpful[0] / (p.helpful[0] + p.helpful[1])) * 100))}٪` : '—', sort: (p) => p.helpful[0] },
          { key: 'pr', title: 'لینک به کالا', render: (p) => { const n = p.blocks.filter((b) => b.t === 'product' || b.t === 'products' || b.t === 'cta').length; return n ? <Badge tone="success">{fa(n)}</Badge> : <Badge>ندارد</Badge> }, text: (p) => (p.blocks.some((b) => b.t === 'product' || b.t === 'products') ? 'دارد' : 'ندارد') }]}
        actions={(p) => [{ label: 'ویرایش', onClick: () => nav(`/admin/blog/${p.id}`) }, { label: p.featured ? 'برداشتن از ویژه' : 'ویژهٔ صفحهٔ وبلاگ', onClick: () => mutate((x) => { x.blog.posts.forEach((y) => { y.featured = y.id === p.id ? !p.featured : false }) }, { action: 'تغییر مقالهٔ ویژه', target: p.title }) }, { label: 'تکثیر', onClick: () => mutate((x) => { x.blog.posts.unshift({ ...structuredClone(p), id: `ar${Date.now().toString(36)}`, title: `${p.title} (کپی)`, status: 'پیش‌نویس', views: 0 }) }, { action: 'تکثیر مقاله', target: p.title }) }, 'sep', { label: 'حذف', danger: true, onClick: async () => { const why = await askReason({ kind: 'cancel', ref: p.title, status: 'حذف مقاله', title: 'دلیل حذف مقاله' }); if (why) mutate((x) => { x.blog.posts = x.blog.posts.filter((y) => y.id !== p.id) }, { action: 'حذف مقاله', target: p.title, after: why }) } }]} />}
      {tab === 'videos' && <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{B.videoCats.map((c) => <Badge key={c} dot={false}>{c} · {fa(B.videos.filter((v) => v.cat === c).length)}</Badge>)}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{B.videos.map((v) => <button key={v.id} type="button" onClick={() => setVid(structuredClone(v))} className="lift overflow-hidden rounded-2xl border border-line bg-surface text-right">
          <span className="relative block aspect-video bg-[#10123d]">{v.cover && <img src={v.cover} alt="" className="size-full object-cover opacity-80" />}<span className="absolute inset-0 grid place-items-center"><span className="grid size-11 place-items-center rounded-full bg-white/90 text-brand"><Play size={18} /></span></span><span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 text-11 text-white">{v.dur || '—'}</span>{v.isNew && <span className="absolute top-2 right-2 rounded-full bg-brand-solid px-2 text-11 text-white">جدید</span>}{v.featured && <Star size={16} className="absolute top-2 left-2 fill-[#ffc24b] text-[#ffc24b]" />}</span>
          <span className="block p-3"><b className="line-clamp-2 text-13">{v.title || 'بی‌عنوان'}</b><span className="mt-1 flex items-center justify-between text-11 text-t2"><span>{v.cat} · {fa(v.views)} بازدید</span><Badge tone={v.status === 'منتشرشده' ? 'success' : 'neutral'}>{v.status}</Badge></span></span>
        </button>)}</div>
      </div>}
      {tab === 'landing' && <div className="grid gap-4 xl:grid-cols-2">
        <Card title="صفحهٔ اصلی وبلاگ">
          <Field label="متن بالای صفحه"><Textarea rows={2} value={L.hero} onChange={(e) => mutate((x) => { x.blog.landing.hero = e.target.value })} /></Field>
          <Field label="مقالهٔ ویژه"><Select value={B.posts.find((p) => p.featured)?.id ?? ''} onChange={(v) => mutate((x) => { x.blog.posts.forEach((p) => { p.featured = p.id === v }) }, { action: 'تغییر مقالهٔ ویژه', target: v })} options={B.posts.filter((p) => p.status === 'منتشرشده').map((p) => [p.id, p.title] as [string, string])} /></Field>
          <p className="mb-2 mt-3 text-12 font-semibold">بخش‌ها و ترتیبشان</p>
          <ul className="space-y-1.5">{L.sections.map((sc, i) => <li key={sc.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-13"><span className="flex-1">{sc.label}</span><button type="button" aria-label="بالا" disabled={i === 0} onClick={() => mutate((x) => { const a = x.blog.landing.sections; [a[i - 1], a[i]] = [a[i], a[i - 1]] })} className="text-t2 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" aria-label="پایین" disabled={i === L.sections.length - 1} onClick={() => mutate((x) => { const a = x.blog.landing.sections; [a[i + 1], a[i]] = [a[i], a[i + 1]] })} className="text-t2 disabled:opacity-30"><ArrowDown size={14} /></button><Toggle on={sc.on} label={sc.label} onChange={(v) => mutate((x) => { x.blog.landing.sections[i].on = v }, { action: 'تغییر بخش صفحهٔ وبلاگ', target: sc.label })} /></li>)}</ul>
        </Card>
        <Card title="صفحهٔ ویدیوهای آموزشی">
          <Field label="متن بالای صفحه"><Textarea rows={2} value={L.videoHero} onChange={(e) => mutate((x) => { x.blog.landing.videoHero = e.target.value })} /></Field>
          <Field label="جست‌وجوهای پرتکرار (با ویرگول)"><Input value={L.popularSearches.join('، ')} onChange={(e) => mutate((x) => { x.blog.landing.popularSearches = e.target.value.split(/[،,]/).map((y) => y.trim()).filter(Boolean) })} /></Field>
          <Field label="ویدیوی ویژه (پخش‌کنندهٔ بزرگ)"><Select value={B.videos.find((v) => v.featured)?.id ?? ''} onChange={(v) => mutate((x) => { x.blog.videos.forEach((y) => { y.featured = y.id === v }) }, { action: 'تغییر ویدیوی ویژه', target: v })} options={B.videos.map((v) => [v.id, v.title] as [string, string])} /></Field>
          <p className="mt-2 text-11 text-t2">ساختار هر دو صفحه مطابق فریم‌های «جزئیات مقاله» و «ویدیوهای آموزشی غنیمت» در فیگماست؛ ظاهر دقیق بخش‌ها از «صفحه‌ساز» هم قابل ویرایش است.</p>
        </Card>
      </div>}
      {tab === 'comments' && <Card pad={false}><ul className="divide-y divide-line">{[...B.comments].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)).map((c) => { const p = B.posts.find((x) => x.id === c.postId); return (
        <li key={c.id} className="p-4 text-13">
          <p className="mb-1 flex flex-wrap items-center gap-2"><b>{c.name}</b><span className="text-11 text-t2">{rel(c.at)} · در «{p?.title}»</span><Badge tone={c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger'}>{c.status === 'approved' ? 'تأییدشده' : c.status === 'pending' ? 'منتظر تأیید' : 'ردشده'}</Badge></p>
          <p className="leading-7">{c.text}</p>
          {c.reply && <p className="mt-2 rounded-xl bg-brand-tint/60 p-2.5 text-12"><b>پاسخ تحریریهٔ غنیمت: </b>{c.reply}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">{c.status !== 'approved' && <Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => mutate((x) => { x.blog.comments.find((y) => y.id === c.id)!.status = 'approved' }, { action: 'تأیید دیدگاه وبلاگ', target: c.id })}>تأیید</Button>}{c.status !== 'rejected' && <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={async () => { const why = await askReason({ kind: 'review', ref: c.id, status: 'رد دیدگاه وبلاگ', title: 'دلیل رد دیدگاه' }); if (why) mutate((x) => { x.blog.comments.find((y) => y.id === c.id)!.status = 'rejected' }, { action: 'رد دیدگاه وبلاگ', target: c.id, after: why }) }}>رد</Button>}
            <Input className="h-8 min-w-48 flex-1" placeholder="پاسخ تحریریه…" value={reply[c.id] ?? ''} onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })} /><Button size="sm" disabled={!reply[c.id]?.trim()} onClick={() => { mutate((x) => { const y = x.blog.comments.find((z) => z.id === c.id)!; y.reply = reply[c.id]; y.status = 'approved' }, { action: 'پاسخ به دیدگاه وبلاگ', target: c.id }); setReply({ ...reply, [c.id]: '' }); toast('پاسخ منتشر شد.') }}>ثبت پاسخ</Button></div>
        </li>) })}</ul></Card>}
      {tab === 'cats' && <div className="grid gap-4 lg:grid-cols-2">{([['cats', 'دسته‌های مقاله', B.cats, (c: string) => B.posts.filter((p) => p.category === c).length], ['videoCats', 'دسته‌های ویدیو', B.videoCats, (c: string) => B.videos.filter((v) => v.cat === c).length]] as const).map(([k, t, list, cnt]) => <Card key={k} title={t}>
        <ul className="space-y-1.5">{list.map((c, i) => <li key={c} className="flex items-center gap-2"><Input value={c} onChange={(e) => mutate((x) => { const old = x.blog[k][i]; x.blog[k][i] = e.target.value; if (k === 'cats') x.blog.posts.forEach((p) => { if (p.category === old) p.category = e.target.value }); else x.blog.videos.forEach((v) => { if (v.cat === old) v.cat = e.target.value }) })} /><Badge dot={false}>{fa(cnt(c))}</Badge><button type="button" aria-label={`حذف ${c}`} onClick={() => { if (cnt(c)) return toast('این دسته محتوا دارد؛ اول آن‌ها را جابه‌جا کنید.', { tone: 'err' }); mutate((x) => { x.blog[k].splice(i, 1) }, { action: 'حذف دسته', target: c }) }} className="text-t2 hover:text-danger"><Trash2 size={14} /></button></li>)}</ul>
        <div className="mt-3 flex gap-2"><Input placeholder="دستهٔ تازه" value={nc} onChange={(e) => setNc(e.target.value)} /><Button onClick={() => { if (!nc.trim()) return; mutate((x) => { x.blog[k].push(nc.trim()) }, { action: 'افزودن دسته', target: nc }); setNc('') }}>افزودن</Button></div>
      </Card>)}</div>}
      <Drawer open={!!vid} onClose={() => setVid(null)} width={520} title={vid && B.videos.some((v) => v.id === vid.id) ? 'ویرایش ویدیو' : 'ویدیوی تازه'} footer={<div className="flex w-full gap-2"><Button variant="primary" onClick={() => { if (!vid?.title.trim()) return toast('عنوان را بنویسید.', { tone: 'err' }); mutate((x) => { const i = x.blog.videos.findIndex((v) => v.id === vid.id); if (i >= 0) x.blog.videos[i] = vid; else x.blog.videos.unshift(vid) }, { action: 'ذخیرهٔ ویدیو', target: vid.title }); setVid(null); toast('ویدیو ذخیره شد.') }}>ذخیره</Button>{vid && B.videos.some((v) => v.id === vid.id) && <Button variant="danger" className="mr-auto" onClick={() => { mutate((x) => { x.blog.videos = x.blog.videos.filter((v) => v.id !== vid.id) }, { action: 'حذف ویدیو', target: vid.title }); setVid(null) }}>حذف</Button>}</div>}>
        {vid && <div className="space-y-3">
          <label className="block cursor-pointer overflow-hidden rounded-xl border border-dashed border-line">{vid.cover ? <img src={vid.cover} alt="" className="aspect-video w-full object-cover" /> : <span className="grid aspect-video place-items-center gap-1 text-12 text-t2"><Upload size={18} />کاور ویدیو (۱۶:۹)</span>}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setVid({ ...vid, cover: await fileToImage(f, 1280, 0.85) }) }} /></label>
          <Field label="عنوان"><Input value={vid.title} onChange={(e) => setVid({ ...vid, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="دسته"><Select value={vid.cat} onChange={(v) => setVid({ ...vid, cat: v })} options={B.videoCats} /></Field><Field label="مدت"><Input value={vid.dur} placeholder="۵:۴۰" onChange={(e) => setVid({ ...vid, dur: e.target.value })} /></Field></div>
          <Field label="لینک ویدیو (آپارات، یوتیوب یا فایل)"><Input className="ltr text-left" value={vid.url} onChange={(e) => setVid({ ...vid, url: e.target.value })} /></Field>
          <Field label="کالای همین ویدیو (ویدیوی همان واحدی که می‌خرید)"><Select value={vid.productId ?? ''} onChange={(v) => setVid({ ...vid, productId: v || undefined })} options={[['', 'بدون کالا'], ...d.products.map((p) => [p.id, p.en] as [string, string])]} /></Field>
          <Field label="توضیح"><Textarea rows={3} value={vid.desc ?? ''} onChange={(e) => setVid({ ...vid, desc: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-4 text-12"><Toggle on={vid.status === 'منتشرشده'} onChange={(v) => setVid({ ...vid, status: v ? 'منتشرشده' : 'پیش‌نویس' })} text="منتشرشده" /><Toggle on={!!vid.isNew} onChange={(v) => setVid({ ...vid, isNew: v })} text="برچسب «جدید»" /><Toggle on={!!vid.featured} onChange={(v) => setVid({ ...vid, featured: v })} text="ویدیوی ویژه" /></div>
          <p className={cx('text-11 text-t2')}>ویدیوی دارای کالا در صفحهٔ همان کالا هم نمایش داده می‌شود و در ویرایشگر مقاله با بلوک «ویدیو» قابل درج است.</p>
        </div>}
      </Drawer>
    </Page>
  )
}
