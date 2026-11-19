import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Crop, FlipHorizontal2, ImagePlus, Images, Info, Pencil, RotateCw, Search, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react'
import { Badge, Button, Card, copyText, cx, Field, Input, Segmented, Select, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { RowMenu } from '@/shared/ui/menu'
import { currentUser, getDB, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { ACCEPT, assess, editImage, GUIDE, kb, processImage, readFile, type EditOpts, type MediaItem, type ProcessOpts, type SquareMode } from '@/shared/lib/media'
import { RemoteUpload } from '../shared/RemoteUpload'

type Staged = { key: string; file: string; src: string; w: number; h: number; size: number; type: string; alt: string }
const me = () => currentUser()?.name ?? 'بهشاد'
const used = (d: ReturnType<typeof getDB>, src: string) => d.products.filter((p) => p.image === src || (p.images ?? []).includes(src))
const toneCls = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' }

/** راهنمای اندازهٔ عکس کالا (در بارگذاری، ویرایش و صفحهٔ کتابخانه) */
export function SizeGuide({ compact }: { compact?: boolean }) {
  const rows: [string, string][] = [['نسبت', '۱:۱ (مربع)'], ['اندازهٔ ایده‌آل', `${fa(GUIDE.ideal)}×${fa(GUIDE.ideal)} پیکسل`], ['حداقل', `${fa(GUIDE.min)}×${fa(GUIDE.min)} پیکسل`], ['خروجی بهینه', `WebP، کمتر از ${kb(GUIDE.target)}`], ['پس‌زمینه', 'سفید یا روشن، بدون متن و قاب'], ['حداکثر فایل ورودی', kb(GUIDE.maxUpload)]]
  return <div className={cx('rounded-xl bg-surface-2 p-3 text-12', compact && 'p-2')}><p className="mb-1 flex items-center gap-1.5 font-semibold"><Info size={13} />راهنمای اندازهٔ عکس کالا</p><dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">{rows.map(([k, v]) => <div key={k}><dt className="inline text-t2">{k}: </dt><dd className="inline font-medium">{v}</dd></div>)}</dl><p className="mt-1 text-11 text-t2">سایت از هر عکس سه اندازه می‌سازد: کوچک ۲۰۰، کارت ۵۰۰ و بزرگ‌نمایی ۱۲۰۰ پیکسل. عکس کالای استوک و جعبه‌باز باید عکس واقعی همان واحد باشد و ایرادش روتوش نشود.</p></div>
}

/** ناحیهٔ بارگذاری با گزینه‌های بهینه‌سازی، مربع‌کردن و واترمارک (مثل نمونهٔ ارسالی) */
function Uploader({ onDone }: { onDone?: (items: MediaItem[]) => void }) {
  const d = useDB(); const [st, setSt] = useState<Staged[]>([]); const [busy, setBusy] = useState(false); const [drag, setDrag] = useState(false)
  const [o, setO] = useState<ProcessOpts>({ optimize: true, square: 'none', watermark: !!d.storeCfg.media.watermark.on && d.storeCfg.media.watermark.catalog })
  const input = useRef<HTMLInputElement>(null)
  const add = async (files: FileList | File[] | null) => { if (!files) return; const out: Staged[] = []
    for (const f of [...files]) { try { const r = await readFile(f); out.push({ key: `${f.name}-${f.size}-${Date.now()}`, file: f.name, alt: '', ...r }) } catch (e) { toast((e as Error).message, { tone: 'err' }) } }
    setSt((s) => [...s, ...out]) }
  const upload = async () => {
    if (!st.length) return; setBusy(true); const made: MediaItem[] = []
    try { for (const s of st) { const r = await processImage(s.src, s.type, o); const base = s.file.replace(/\.[^.]+$/, ''); made.push({ id: `M-${Date.now().toString(36)}${made.length}`, src: r.src, name: `${base}.${r.type}`, alt: s.alt.trim(), w: r.w, h: r.h, size: r.size, type: r.type, by: me(), at: new Date().toISOString(), optimized: o.optimize, square: o.square === 'none' ? undefined : o.square, watermark: o.watermark, orig: { w: s.w, h: s.h, size: s.size } }) }
      mutate((x) => { x.media.unshift(...made) }, { action: 'بارگذاری در کتابخانهٔ رسانه', target: `${fa(made.length)} تصویر`, after: made.map((m) => `${m.name} (${kb(m.size)})`).join('، ') })
      const saved = st.reduce((a, s) => a + s.size, 0) - made.reduce((a, m) => a + m.size, 0)
      toast(`${fa(made.length)} تصویر بارگذاری شد${saved > 0 ? ` · ${kb(saved)} کم‌حجم‌تر` : ''}.`); setSt([]); onDone?.(made)
    } catch (e) { toast((e as Error).message, { tone: 'err' }) } finally { setBusy(false) }
  }
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }} className={cx('rounded-2xl border-2 border-dashed p-4 transition-colors', drag ? 'border-brand bg-brand-tint/40' : 'border-line')}>
      <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="انتخاب تصویر" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      {!st.length ? <div className="py-4 text-center"><p className="text-14 font-semibold">تصویر خود را برای بارگذاری انتخاب کنید</p><p className="mt-1 text-12 text-t2">(فرمت‌های مجاز: JPG، PNG، WEBP، GIF، SVG) · حداکثر {kb(GUIDE.maxUpload)} برای هر فایل · امکان انتخاب گروهی</p><div className="mt-3 flex flex-wrap items-center justify-center gap-2"><Button icon={<Upload size={14} />} onClick={() => input.current?.click()}>انتخاب تصویر</Button><RemoteUpload target="media" label="کتابخانهٔ رسانه" sample={d.products.map((p) => p.image).filter(Boolean)} onReceive={(srcs, source) => { if (!srcs.length) return; const made: MediaItem[] = srcs.map((src, i) => ({ id: `M-${Date.now().toString(36)}${i}`, src, name: `${source === 'گوشی' ? 'phone' : 'cloud'}-${Date.now().toString(36)}${i}.webp`, alt: '', w: 500, h: 500, size: 30000, type: 'webp', by: `${me()} (${source})`, at: new Date().toISOString(), optimized: true })); mutate((x) => { x.media.unshift(...made) }, { action: `بارگذاری از ${source} در کتابخانهٔ رسانه`, target: `${fa(made.length)} تصویر` }); onDone?.(made) }} /></div></div>
        : <>
          <ul className="flex flex-wrap gap-3">{st.map((s, i) => { const a = assess(s.w, s.h, s.size); return <li key={s.key} className="w-44 rounded-xl border border-line bg-surface p-2">
            <div className="relative"><img src={s.src} alt="" className="aspect-square w-full rounded-lg bg-white object-contain" /><button type="button" aria-label={`حذف ${s.file}`} onClick={() => setSt(st.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid size-6 place-items-center rounded-md bg-danger-solid text-white"><X size={13} /></button></div>
            <Input aria-label={`عنوان فایل ${s.file}`} className="mt-1.5 h-8 text-12" value={s.alt} onChange={(e) => setSt(st.map((y, j) => (j === i ? { ...y, alt: e.target.value } : y)))} placeholder="عنوان فایل (سئو)" />
            <p className="ltr mt-1 truncate text-left font-mono text-11 text-t2">{s.file}</p><p className="text-11 text-t2"><bdi>{fa(s.w)}×{fa(s.h)}</bdi> · <bdi>{kb(s.size)}</bdi></p>
            <ul className="mt-0.5 space-y-0.5">{a.map((x) => <li key={x.text} className={cx('text-11', toneCls[x.tone])}>{x.text}</li>)}</ul></li> })}
            <li><button type="button" onClick={() => input.current?.click()} className="grid h-full min-h-40 w-28 place-items-center rounded-xl border border-dashed border-line text-12 text-t2 hover:border-brand hover:text-brand"><span className="grid place-items-center gap-1"><ImagePlus size={18} />افزودن</span></button></li></ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-13">
              <Toggle on={o.optimize} onChange={(v) => setO({ ...o, optimize: v })} text="بهینه‌سازی تصویر" />
              <span className="flex items-center gap-2"><span className="text-12 text-t2">تصویر مربع:</span><Segmented size="sm" value={o.square} onChange={(v) => setO({ ...o, square: v as SquareMode })} options={[['none', 'بدون تغییر'], ['pad', 'حاشیهٔ سفید'], ['crop', 'برش از وسط']]} /></span>
              <Toggle on={o.watermark} onChange={(v) => setO({ ...o, watermark: v })} text="افزودن واترمارک فروشگاه" />
            </div>
            <div className="flex gap-2"><Button variant="danger" aria-label="حذف همه" icon={<Trash2 size={14} />} onClick={() => setSt([])} /><Button variant="primary" icon={<Upload size={14} />} loading={busy} onClick={upload}>بارگذاری {fa(st.length)} تصویر</Button></div>
          </div>
          <p className="mt-2 text-11 text-t2">بهینه‌سازی: کوچک‌کردن تا {fa(GUIDE.max)} پیکسل و تبدیل به WebP. «حاشیهٔ سفید» چیزی از کالا نمی‌بُرد و برای عکس کالا امن‌تر است؛ «برش از وسط» لبه‌ها را حذف می‌کند. واترمارک طبق «تنظیمات ← فروشگاه و برند» ({d.storeCfg.media.watermark.pos}، {fa(d.storeCfg.media.watermark.opacity)}٪) زده می‌شود.</p>
        </>}
    </div>
  )
}

/** ویرایشگر تصویر: چرخش، قرینه، نور، کنتراست و مربع‌کردن؛ نسخهٔ تازه جایگزین می‌شود و کالاهای استفاده‌کننده هم به‌روز می‌شوند */
export function ImageEditor({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [e, setE] = useState<EditOpts>({ rotate: 0, flip: false, brightness: 100, contrast: 100, square: 'none', offset: 50 }); const [busy, setBusy] = useState(false)
  const style = { transform: `rotate(${e.rotate}deg) scaleX(${e.flip ? -1 : 1})`, filter: `brightness(${e.brightness}%) contrast(${e.contrast}%)` }
  const save = async () => { setBusy(true); try { const r = await editImage(item.src, e); const n = getDB().products.filter((p) => p.image === item.src || (p.images ?? []).includes(item.src)).length
    mutate((x) => { const m = x.media.find((y) => y.id === item.id)!; const old = m.src; Object.assign(m, { src: r.src, w: r.w, h: r.h, size: r.size, type: r.src.startsWith('data:image/webp') ? 'webp' : 'jpg', optimized: true, edited: new Date().toISOString(), square: e.square === 'none' ? m.square : e.square })
      x.products.forEach((p) => { if (p.image === old) p.image = r.src; if (p.images) p.images = p.images.map((s) => (s === old ? r.src : s)) }) }, { action: 'ویرایش تصویر', target: item.name, after: `${r.w}×${r.h} · ${kb(r.size)}${n ? ` · ${n} کالا به‌روز شد` : ''}` })
    toast(n ? `تصویر ذخیره شد و در ${fa(n)} کالا جایگزین شد.` : 'تصویر ذخیره شد.'); onClose() } catch (er) { toast((er as Error).message, { tone: 'err' }) } finally { setBusy(false) } }
  return (
    <Modal open wide onClose={onClose} title={`ویرایش تصویر «${item.name}»`} footer={<><Button variant="primary" loading={busy} onClick={save}>ذخیرهٔ نسخهٔ تازه</Button><Button variant="ghost" onClick={() => setE({ rotate: 0, flip: false, brightness: 100, contrast: 100, square: 'none', offset: 50 })}>بازنشانی</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(#f2f3f7_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
          <div className={cx('relative grid place-items-center', e.square !== 'none' && 'aspect-square w-[88%] overflow-hidden bg-white outline outline-2 outline-brand')}><img src={item.src} alt={item.alt} style={{ ...style, objectFit: e.square === 'crop' ? 'cover' : 'contain', objectPosition: `${e.offset}% ${e.offset}%` }} className={cx('max-h-[420px] max-w-full transition-transform', e.square !== 'none' && 'size-full')} /></div>
        </div>
        <div className="space-y-3 text-13">
          <div className="flex gap-2"><Button icon={<RotateCw size={14} />} onClick={() => setE({ ...e, rotate: ((e.rotate + 90) % 360) as EditOpts['rotate'] })}>چرخش ۹۰°</Button><Button icon={<FlipHorizontal2 size={14} />} onClick={() => setE({ ...e, flip: !e.flip })}>قرینه</Button></div>
          <Field label={`نور: ${fa(e.brightness)}٪`}><input type="range" min={60} max={140} value={e.brightness} onChange={(v) => setE({ ...e, brightness: +v.target.value })} className="w-full accent-[var(--brand)]" /></Field>
          <Field label={`کنتراست: ${fa(e.contrast)}٪`}><input type="range" min={60} max={140} value={e.contrast} onChange={(v) => setE({ ...e, contrast: +v.target.value })} className="w-full accent-[var(--brand)]" /></Field>
          <Field label="مربع"><Segmented size="sm" value={e.square} onChange={(v) => setE({ ...e, square: v as SquareMode })} options={[['none', 'بدون تغییر'], ['pad', 'حاشیهٔ سفید'], ['crop', 'برش']]} /></Field>
          {e.square === 'crop' && <Field label="جای برش"><input type="range" min={0} max={100} value={e.offset} onChange={(v) => setE({ ...e, offset: +v.target.value })} className="w-full accent-[var(--brand)]" /></Field>}
          <div className="rounded-xl bg-surface-2 p-2 text-12"><p>فعلی: {fa(item.w)}×{fa(item.h)} · {kb(item.size)}</p><ul>{assess(item.w, item.h, item.size).map((x) => <li key={x.text} className={toneCls[x.tone]}>{x.text}</li>)}</ul></div>
          <p className="text-11 text-t2">برای کالای استوک و جعبه‌باز فقط چرخش، قرینه و نور مجاز است؛ ایراد ظاهری نباید پنهان شود.</p>
        </div>
      </div>
    </Modal>
  )
}

/** جزئیات فایل: عنوان سئو، نام، ابعاد، استفاده در کالاها */
function Details({ m, onClose, onEdit }: { m: MediaItem; onClose: () => void; onEdit: () => void }) {
  const d = useDB(); const nav = useNavigate(); const u = used(d, m.src); const cur = d.media.find((x) => x.id === m.id) ?? m
  const set = (p: Partial<MediaItem>) => mutate((x) => { Object.assign(x.media.find((y) => y.id === m.id)!, p) })
  return (
    <Drawer open onClose={onClose} width={460} title="جزئیات فایل" footer={<div className="flex w-full gap-2"><Button variant="primary" icon={<Pencil size={14} />} onClick={onEdit}>ویرایش تصویر</Button><Button variant="ghost" icon={<Copy size={14} />} onClick={() => { copyText(new URL(cur.src, location.href).href); toast('نشانی فایل کپی شد.') }}>کپی نشانی</Button></div>}>
      <div className="space-y-3">
        <img src={cur.src} alt={cur.alt} className="aspect-square w-full rounded-xl border border-line bg-white object-contain" />
        <Field label="عنوان فایل (سئو، متن جایگزین)" help="فارسی و توصیفی؛ مثلاً «هدفون سونی WH-1000XM5 مشکی، نمای کنار»."><div className="flex gap-1.5"><Input value={cur.alt} onChange={(e) => set({ alt: e.target.value })} /><Button variant="ai" aria-label="نوشتن با AI" icon={<Sparkles size={14} />} onClick={() => { const p = u[0]; set({ alt: p ? `${p.title}، ${p.category}، عکس واقعی همین کالا` : cur.name.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') }); toast('عنوان پیشنهادی گذاشته شد؛ بازبینی کنید.') }} /></div></Field>
        <Field label="نام فایل"><Input className="ltr text-left font-mono" value={cur.name} onChange={(e) => set({ name: e.target.value.replace(/\s+/g, '-') })} /></Field>
        <dl className="grid grid-cols-2 gap-y-1 text-12"><dt className="text-t2">ابعاد</dt><dd className="tnum">{fa(cur.w)}×{fa(cur.h)}</dd><dt className="text-t2">حجم</dt><dd>{kb(cur.size)}{cur.orig && cur.orig.size > cur.size ? <span className="text-success"> (از {kb(cur.orig.size)})</span> : ''}</dd><dt className="text-t2">قالب</dt><dd className="uppercase">{cur.type}</dd><dt className="text-t2">بهینه‌سازی</dt><dd>{cur.optimized ? <Badge tone="success">انجام شده</Badge> : <Badge tone="warning">انجام نشده</Badge>}</dd><dt className="text-t2">بارگذاری</dt><dd>{cur.by} · {rel(cur.at)}</dd>{cur.edited && <><dt className="text-t2">آخرین ویرایش</dt><dd>{rel(cur.edited)}</dd></>}</dl>
        <ul className="space-y-0.5 text-12">{assess(cur.w, cur.h, cur.size).map((x) => <li key={x.text} className={toneCls[x.tone]}>{x.text}</li>)}</ul>
        <div><p className="mb-1 text-12 font-semibold">استفاده در کالاها ({fa(u.length)})</p>{u.length ? <ul className="space-y-1">{u.map((p) => <li key={p.id}><button type="button" className="text-12 text-brand hover:underline" onClick={() => nav(`/admin/catalog/${p.id}?tab=media`)}>{p.title}</button></li>)}</ul> : <p className="text-12 text-t2">در هیچ کالایی استفاده نشده است.</p>}</div>
      </div>
    </Drawer>
  )
}

type Sort = 'new' | 'old' | 'big' | 'name'
/** کتابخانهٔ رسانه: بارگذاری، جست‌وجو، فیلتر، انتخاب و مدیریت فایل‌ها */
export function MediaLibraryView({ pick, onPick, picked = [] }: { pick?: boolean; onPick?: (srcs: string[]) => void; picked?: string[] }) {
  const d = useDB(); const [q, setQ] = useState(''); const [who, setWho] = useState<'all' | 'mine' | 'others'>('all'); const [sort, setSort] = useState<Sort>('new'); const [fl, setFl] = useState<'all' | 'noalt' | 'raw' | 'unused' | 'small'>('all')
  const [sel, setSel] = useState<string[]>([]); const [det, setDet] = useState<MediaItem | null>(null); const [ed, setEd] = useState<MediaItem | null>(null); const [asg, setAsg] = useState<MediaItem | null>(null); const [target, setTarget] = useState('')
  const list = useMemo(() => d.media.filter((m) => (!q.trim() || `${m.name} ${m.alt}`.toLowerCase().includes(q.trim().toLowerCase())) && (who === 'all' || (who === 'mine' ? m.by === me() : m.by !== me()))
    && (fl === 'all' || (fl === 'noalt' ? !m.alt : fl === 'raw' ? !m.optimized : fl === 'unused' ? !used(d, m.src).length : Math.min(m.w, m.h) < GUIDE.min)))
    .sort((a, b) => (sort === 'new' ? b.at.localeCompare(a.at) : sort === 'old' ? a.at.localeCompare(b.at) : sort === 'big' ? b.size - a.size : a.name.localeCompare(b.name))), [d.media, d.products, q, who, sort, fl])
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const remove = async (m: MediaItem) => { const u = used(d, m.src); const ok = await confirm({ title: `حذف «${m.name}»`, body: u.length ? `این تصویر در ${u.length} کالا استفاده شده (${u.map((p) => p.title).slice(0, 3).join('، ')}) و از آن‌ها هم برداشته می‌شود.` : 'فایل از کتابخانه حذف می‌شود.', confirm: 'حذف', danger: true }); if (!ok) return
    mutate((x) => { x.media = x.media.filter((y) => y.id !== m.id); x.products.forEach((p) => { if (p.images) p.images = p.images.filter((s) => s !== m.src); if (p.image === m.src) p.image = p.images?.[0] ?? '' }) }, { action: 'حذف از کتابخانهٔ رسانه', target: m.name }); toast('فایل حذف شد.') }
  const FL: [typeof fl, string, number][] = [['all', 'همه', d.media.length], ['noalt', 'بدون عنوان سئو', d.media.filter((m) => !m.alt).length], ['raw', 'بهینه‌نشده', d.media.filter((m) => !m.optimized).length], ['unused', 'استفاده‌نشده', d.media.filter((m) => !used(d, m.src).length).length], ['small', 'کوچک‌تر از حد', d.media.filter((m) => Math.min(m.w, m.h) < GUIDE.min).length]]
  return (
    <div className="space-y-3">
      <Uploader onDone={(items) => pick && setSel((s) => [...s, ...items.map((m) => m.id)])} />
      <div className="relative"><Search size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input aria-label="جست‌وجوی نام فایل" className="pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام فایل یا عنوان سئو…" /></div>
      <div className="flex flex-wrap items-center gap-2 text-12"><span className="text-t2">مرتب‌سازی:</span><Select className="w-36" value={sort} onChange={(v) => setSort(v as Sort)} options={[['new', 'جدیدترین'], ['old', 'قدیمی‌ترین'], ['big', 'حجیم‌ترین'], ['name', 'نام فایل']]} other={false} />
        <Segmented size="sm" value={who} onChange={setWho} options={[['all', 'همه'], ['mine', 'فایل‌های من'], ['others', 'سایر کاربران']]} />
        <span className="mx-1 h-5 w-px bg-line" />{FL.map(([k, l, n]) => <button key={k} type="button" onClick={() => setFl(k)} className={cx('rounded-full border px-2.5 py-0.5', fl === k ? 'border-transparent bg-brand-solid text-white' : 'border-line text-t2 hover:border-brand')}>{l} {fa(n)}</button>)}</div>
      {list.length === 0 ? <p className="rounded-xl bg-surface-2 py-8 text-center text-13 text-t2">فایلی با این فیلتر نیست.</p>
        : <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">{list.map((m) => { const on = sel.includes(m.id); const inP = picked.includes(m.src); const bad = assess(m.w, m.h, m.size).find((x) => x.tone !== 'success')
          return <li key={m.id} className={cx('group relative overflow-hidden rounded-xl border bg-white', on ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
            <button type="button" aria-pressed={pick ? on : undefined} aria-label={m.alt || m.name} onClick={() => (pick ? (inP ? toast('این تصویر از قبل در گالری کالاست.') : toggle(m.id)) : setDet(m))} className="block w-full"><img src={m.src} alt={m.alt} loading="lazy" className={cx('aspect-square w-full object-contain p-1', inP && 'opacity-40')} /></button>
            {pick && <span className={cx('pointer-events-none absolute top-1.5 right-1.5 grid size-5 place-items-center rounded border', on ? 'border-brand bg-brand-solid text-white' : 'border-line bg-white/90')}>{on && <Check size={12} />}</span>}
            {inP && <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-11 font-semibold text-brand">در گالری</span>}
            <span className="absolute top-1 left-1"><RowMenu items={[{ label: 'جزئیات و عنوان سئو', icon: <Info size={14} />, onClick: () => setDet(m) }, { label: 'ویرایش تصویر', icon: <Crop size={14} />, onClick: () => setEd(m) }, { label: 'کپی نشانی', icon: <Copy size={14} />, onClick: () => { copyText(new URL(m.src, location.href).href); toast('نشانی فایل کپی شد.') } }, ...(pick ? [] : [{ label: 'افزودن به گالری یک کالا', icon: <ImagePlus size={14} />, onClick: () => { setAsg(m); setTarget('') } }]), 'sep', { label: 'حذف', icon: <Trash2 size={14} />, danger: true, onClick: () => remove(m) }]} /></span>
            {(!m.alt || bad) && <span className="pointer-events-none absolute bottom-12 inset-x-1.5 flex flex-wrap gap-1">{!m.alt && <span className="rounded bg-warning-bg px-1.5 text-[10px] font-medium text-warning">بدون عنوان سئو</span>}{bad && <span className={cx('rounded px-1.5 text-[10px] font-medium', bad.tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning')} title={bad.text}>{bad.text.split(/[ (؛]/)[0]}</span>}</span>}
            <div className="border-t border-line px-1.5 py-1 text-11"><p className="ltr truncate text-left font-mono text-t2" title={m.name}>{m.name}</p><p className="truncate whitespace-nowrap text-t3"><bdi className="tnum">{fa(m.w)}×{fa(m.h)}</bdi> · <bdi>{kb(m.size)}</bdi></p></div>
          </li> })}</ul>}
      {pick && <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3"><span className="text-12 text-t2">{fa(sel.length)} تصویر انتخاب شده{sel.length ? ' · ترتیب انتخاب = ترتیب گالری' : ''}</span><div className="flex gap-2">{sel.length > 0 && <Button variant="ghost" onClick={() => setSel([])}>لغو انتخاب</Button>}<Button variant="primary" disabled={!sel.length} icon={<Check size={14} />} onClick={() => onPick?.(sel.map((id) => d.media.find((m) => m.id === id)!.src))}>افزودن به گالری کالا</Button></div></div>}
      {det && <Details m={det} onClose={() => setDet(null)} onEdit={() => { setEd(d.media.find((x) => x.id === det.id) ?? det); setDet(null) }} />}
      {ed && <ImageEditor item={ed} onClose={() => setEd(null)} />}
      {asg && <Modal open onClose={() => setAsg(null)} title={`افزودن «${asg.name}» به گالری کالا`} footer={<><Button variant="primary" disabled={!target} onClick={() => { mutate((x) => { const p = x.products.find((y) => y.id === target)!; const imgs = p.images?.length ? p.images : [p.image].filter(Boolean); if (!imgs.includes(asg.src)) p.images = [...imgs, asg.src]; if (!p.image) p.image = asg.src }, { action: 'افزودن تصویر از کتابخانه به کالا', target: `${asg.name} → ${d.products.find((p) => p.id === target)?.title}` }); toast('به گالری کالا اضافه شد.'); setAsg(null) }}>افزودن</Button><Button variant="ghost" onClick={() => setAsg(null)}>انصراف</Button></>}>
        <img src={asg.src} alt="" className="mb-3 size-24 rounded-lg border border-line object-contain" /><Field label="کالا"><Select value={target} onChange={setTarget} placeholder="جست‌وجوی نام کالا…" options={d.products.map((p) => [p.id, p.title] as [string, string])} other={false} /></Field></Modal>}
    </div>
  )
}

/** پنجرهٔ «کتابخانهٔ مدیا» برای فرم کالا */
export function MediaPicker({ open, onClose, onPick, picked }: { open: boolean; onClose: () => void; onPick: (srcs: string[]) => void; picked?: string[] }) {
  if (!open) return null
  return <Modal open xl onClose={onClose} title="کتابخانهٔ مدیا"><MediaLibraryView pick picked={picked} onPick={(s) => { onPick(s); onClose() }} /></Modal>
}

/** صفحهٔ «کتابخانهٔ رسانه» در منوی کناری */
export function MediaPage() {
  const d = useDB(); const [busy, setBusy] = useState(false)
  const total = d.media.reduce((a, m) => a + m.size, 0); const noAlt = d.media.filter((m) => !m.alt).length; const raw = d.media.filter((m) => !m.optimized).length; const unused = d.media.filter((m) => !used(d, m.src).length).length
  const fixAlt = () => mutate((x) => { x.media.forEach((m) => { if (!m.alt) { const p = x.products.find((y) => y.image === m.src || (y.images ?? []).includes(m.src)); m.alt = p ? `${p.title}، عکس واقعی همین کالا` : m.name.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') } }) }, { action: 'نوشتن عنوان سئو با AI برای فایل‌های بدون عنوان', target: `${fa(noAlt)} فایل`, ai: true })
  const optimizeAll = async () => { setBusy(true); let n = 0; const todo = getDB().media.filter((m) => !m.optimized)
    for (const m of todo) { try { const r = await processImage(m.src, `image/${m.type === 'jpg' ? 'jpeg' : m.type}`, { optimize: true, square: 'none', watermark: false }); mutate((x) => { const y = x.media.find((z) => z.id === m.id)!; const old = y.src; Object.assign(y, { src: r.src, w: r.w, h: r.h, size: r.size, type: r.type, optimized: true, orig: y.orig ?? { w: m.w, h: m.h, size: m.size } }); x.products.forEach((p) => { if (p.image === old) p.image = r.src; if (p.images) p.images = p.images.map((s) => (s === old ? r.src : s)) }) }); n++ } catch { /* فایل خارجی یا خراب: رد می‌شود */ } }
    setBusy(false); toast(n ? `${fa(n)} فایل بهینه شد.` : 'فایل بهینه‌نشده‌ای نبود.') }
  return (
    <Page title="کتابخانهٔ رسانه" module="media" sub="همهٔ تصویرهای کالا، بنر و وبلاگ در یک جا: بارگذاری با بهینه‌سازی، مربع‌کردن و واترمارک، عنوان سئو، ویرایش و استفاده در کالاها."
      actions={<><Button variant="ai" icon={<Sparkles size={14} />} disabled={!noAlt} onClick={fixAlt}>عنوان سئو برای {fa(noAlt)} فایل</Button><Button icon={<Wand2 size={14} />} loading={busy} disabled={!raw} onClick={optimizeAll}>بهینه‌سازی {fa(raw)} فایل</Button></>}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Images size={17} />} label="فایل در کتابخانه" value={fa(d.media.length)} note={`حجم کل ${kb(total)}`} />
        <KPI label="بدون عنوان سئو" value={fa(noAlt)} tone={noAlt ? 'warning' : undefined} note="برای گوگل و دسترس‌پذیری لازم است" />
        <KPI label="بهینه‌نشده" value={fa(raw)} tone={raw ? 'warning' : undefined} note="WebP نیست یا بزرگ‌تر از حد است" />
        <KPI label="استفاده‌نشده" value={fa(unused)} note="در هیچ کالایی نیست" />
      </div>
      <div className="mb-3"><SizeGuide /></div>
      <Card><MediaLibraryView /></Card>
    </Page>
  )
}
