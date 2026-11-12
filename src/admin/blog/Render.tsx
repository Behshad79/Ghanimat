import { CircleCheck, CircleAlert, Info, Lightbulb, Play, Quote as QuoteIcon, ExternalLink, Link2 } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import type { Block, Post } from '@/shared/data/blog'
import { readMin } from '@/shared/data/blog'

const jd = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })

/** کارت کالای داخل مقاله (مثل «کالاهای مرتبط» در فیگما) */
function PCard({ pid, compact }: { pid: string; compact?: boolean }) {
  const d = useDB(); const p = d.products.find((x) => x.id === pid); if (!p) return <div className="rounded-xl border border-dashed border-line p-3 text-12 text-t2">کالا انتخاب نشده</div>
  const price = p.price ?? p.priceNew; const off = p.compareAt && p.compareAt > price ? Math.round((1 - price / p.compareAt) * 100) : [25, 16, 22][pid.length % 3]
  return (
    <div className={cx('rounded-2xl border border-[#e6e8f0] bg-white p-3 text-right', compact ? 'w-48 shrink-0' : 'flex items-center gap-3')}>
      <img src={p.image || './brand/logo-mark.png'} alt={p.title} className={cx('rounded-xl bg-[#f5f6fa] object-contain', compact ? 'mb-2 aspect-square w-full' : 'size-20')} />
      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-[13px] font-semibold text-[#10123d]">{p.title}</p><p className="mt-1 flex items-center justify-between gap-2"><span className="rounded-full bg-[#c42f2f] px-1.5 text-[11px] font-bold text-white">{fa(off)}٪</span><b className="tnum text-[13px] text-[#10123d]">{toman(price).replace(' تومان', '')} <span className="text-[10px] font-normal">تومان</span></b></p></div>
    </div>
  )
}

/** رندر یک بلوک به شکل صفحهٔ مقالهٔ سایت */
export function RenderBlock({ b, post, idx }: { b: Block; post: Post; idx?: number }) {
  const d = useDB()
  switch (b.t) {
    case 'h2': return <h2 id={b.id} className="mt-8 mb-3 flex items-center gap-2 text-[22px] font-extrabold text-[#10123d]">{idx !== undefined && <span className="grid size-7 place-items-center rounded-full bg-[#0000ff] text-[13px] text-white">{fa(idx)}</span>}{b.v || 'عنوان بخش'}</h2>
    case 'h3': return <h3 id={b.id} className="mt-5 mb-2 text-[17px] font-bold text-[#10123d]">{b.v || 'زیرعنوان'}</h3>
    case 'p': return <div className="prose-gh text-[15px] leading-8 text-[#2a2d4a]" dangerouslySetInnerHTML={{ __html: b.html || '<span style="color:#9aa0b8">متن پاراگراف…</span>' }} />
    case 'img': return <figure className="my-5">{b.src ? <img src={b.src} alt={b.alt ?? ''} className="w-full rounded-2xl" /> : <div className="grid aspect-video place-items-center rounded-2xl bg-[#f5f6fa] text-12 text-[#5a5e78]">تصویر</div>}{b.caption && <figcaption className="mt-2 text-center text-12 text-[#5a5e78]">{b.caption}</figcaption>}</figure>
    case 'banner': return <a href={b.href} onClick={(e) => e.preventDefault()} className="my-6 block overflow-hidden rounded-2xl" style={{ aspectRatio: `${b.w ?? 1200} / ${b.h ?? 400}` }}>{b.src ? <img src={b.src} alt={b.alt ?? 'بنر'} className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-[#eef0ff] text-12 text-[#0000ff]">بنر {fa(b.w ?? 1200)}×{fa(b.h ?? 400)}</div>}</a>
    case 'product': return <div className="my-5"><PCard pid={b.pid ?? ''} />{b.v && <p className="mt-2 text-12 text-[#5a5e78]">{b.v}</p>}</div>
    case 'products': return <div className="my-6"><p className="mb-3 text-[17px] font-bold text-[#10123d]">{b.v || 'کالاهای مرتبط'}</p><div className="flex gap-3 overflow-x-auto pb-2">{(b.pids ?? []).map((pid) => <PCard key={pid} pid={pid} compact />)}</div></div>
    case 'compare': return <div className="my-6 grid gap-3 sm:grid-cols-2">{(b.cols ?? []).map((c, i) => <div key={i} className={cx('rounded-2xl border p-4', i === 0 ? 'border-[#0000ff]/30 bg-[#eef0ff]' : 'border-[#e6e8f0] bg-white')}><b className="text-[15px] text-[#10123d]">{c.title}</b><p className="mt-1 text-12 text-[#5a5e78]">{c.sub}</p><ul className="mt-3 space-y-1.5 text-13">{c.points.split('\n').filter(Boolean).map((x) => <li key={x} className="flex items-center gap-1.5"><CircleCheck size={14} className="text-[#12733f]" />{x}</li>)}</ul></div>)}</div>
    case 'grades': return <table className="my-6 w-full overflow-hidden rounded-2xl text-13"><tbody>{(b.rows ?? []).map(([k, v], i) => <tr key={i} className={i % 2 ? 'bg-[#f6f7fa]' : 'bg-white'}><td className="w-16 p-3 text-center text-[17px] font-black text-[#0000ff]">{k}</td><td className="p-3 text-[#2a2d4a]">{v}</td></tr>)}</tbody></table>
    case 'callout': { const I = b.tone === 'warn' ? CircleAlert : b.tone === 'tip' ? Lightbulb : Info; return <div className={cx('my-5 flex gap-2 rounded-2xl p-4 text-14 leading-7', b.tone === 'warn' ? 'bg-[#fff3e8] text-[#a64b07]' : b.tone === 'tip' ? 'bg-[#e8f7ee] text-[#12733f]' : 'bg-[#eef0ff] text-[#10123d]')}><I size={18} className="mt-1 shrink-0" />{b.v}</div> }
    case 'summary': return <div className="my-6 rounded-2xl border-r-4 border-[#ffc24b] bg-[#fffaf0] p-4 text-14 leading-7"><b>خلاصه: </b>{b.v}</div>
    case 'quote': return <blockquote className="my-6 rounded-2xl bg-[#f5f6fa] p-5 text-[16px] leading-8 text-[#10123d]"><QuoteIcon size={20} className="mb-1 text-[#0000ff]" />{b.v}{b.author && <footer className="mt-2 text-12 text-[#5a5e78]">— {b.author}</footer>}</blockquote>
    case 'cta': return <div className="my-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#10123d] p-5 text-white"><b className="text-[16px]">{b.v || 'متن دعوت به اقدام'}</b><a href={b.href} onClick={(e) => e.preventDefault()} className="rounded-xl bg-[#0000ff] px-4 py-2 text-13 font-semibold text-white">{b.btn || 'مشاهدهٔ کالا'}</a></div>
    case 'faq': return <div className="my-6 space-y-2">{(b.rows ?? []).map(([q, a], i) => <details key={i} className="rounded-xl border border-[#e6e8f0] bg-white p-3"><summary className="cursor-pointer text-14 font-semibold text-[#10123d]">{q}</summary><p className="mt-2 text-13 leading-7 text-[#2a2d4a]">{a}</p></details>)}</div>
    case 'video': { const v = d.blog.videos.find((x) => x.id === b.vid); return <div className="my-6"><div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-[#10123d]">{(v?.cover || b.src) && <img src={v?.cover ?? b.src} alt="" className="absolute inset-0 size-full object-cover opacity-60" />}<span className="relative grid size-14 place-items-center rounded-full bg-white/90 text-[#0000ff]"><Play size={24} /></span></div><p className="mt-2 text-12 text-[#5a5e78]">{v?.title ?? b.v ?? b.href}</p></div> }
    case 'link': return <a href={b.href} onClick={(e) => e.preventDefault()} className="my-4 flex items-center gap-3 rounded-2xl border border-[#e6e8f0] bg-white p-3 hover:border-[#0000ff]/40">{b.external ? <ExternalLink size={18} className="text-[#0000ff]" /> : <Link2 size={18} className="text-[#0000ff]" />}<span className="min-w-0 flex-1"><b className="block text-14 text-[#10123d]">{b.v || 'عنوان لینک'}</b><span className="ltr block truncate text-left text-11 text-[#5a5e78]">{b.href}</span></span></a>
    case 'toc': { const hs = post.blocks.filter((x) => x.t === 'h2'); return <nav className="my-5 rounded-2xl border border-[#e6e8f0] bg-white p-4"><b className="text-14 text-[#10123d]">در این مطلب</b><ol className="mt-2 space-y-1.5 text-13">{hs.map((h, i) => <li key={h.id} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#eef0ff] text-[11px] text-[#0000ff]">{fa(i + 1)}</span>{h.v}</li>)}</ol></nav> }
    case 'divider': return <hr className="my-8 border-[#e6e8f0]" />
  }
}

/** پیش‌نمایش کامل صفحهٔ مقاله، مطابق فریم «جزئیات مقاله» فیگما */
export function ArticlePreview({ post, mobile }: { post: Post; mobile?: boolean }) {
  let n = 0
  return (
    <article dir="rtl" className={cx('mx-auto bg-white font-sans text-[#10123d]', mobile ? 'w-[390px] p-4' : 'max-w-[820px] p-8')}>
      <p className="text-12 text-[#5a5e78]">خانه / وبلاگ / {post.category}</p>
      <h1 className={cx('mt-3 font-black leading-snug', mobile ? 'text-[22px]' : 'text-[30px]')}>{post.title}</h1>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-12 text-[#5a5e78]"><span>{post.author}</span><span>{jd(post.publishAt)}</span><span>{fa(readMin(post))} دقیقه مطالعه</span><span>{fa(post.views)} بازدید</span></p>
      {post.reviewer && <p className="mt-2 rounded-xl bg-[#f5f6fa] px-3 py-2 text-12">بازبینی تخصصی: <b>{post.reviewer}</b></p>}
      {post.cover && <img src={post.cover} alt={post.title} className="mt-5 aspect-[16/8] w-full rounded-3xl bg-[#f5f6fa] object-contain" />}
      <div className="mt-4">{post.blocks.map((b) => <RenderBlock key={b.id} b={b} post={post} idx={b.t === 'h2' ? ++n : undefined} />)}</div>
      {post.tags.length > 0 && <p className="mt-6 flex flex-wrap gap-2">{post.tags.map((t) => <span key={t} className="rounded-full bg-[#f5f6fa] px-3 py-1 text-12"># {t}</span>)}</p>}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#e6e8f0] p-4 text-13"><span className="flex-1 font-semibold">این مطلب برایتان مفید بود؟</span><span className="rounded-full border px-3 py-1">بله · {fa(post.helpful[0])}</span><span className="rounded-full border px-3 py-1">خیر · {fa(post.helpful[1])}</span></div>
    </article>
  )
}
