import { useRef, useState } from 'react'
import { BarChart3, ImagePlus, Paintbrush, Plus, Sparkles, Trash2, Type, Wand2 } from 'lucide-react'
import { Badge, Button, cx, Field, Input, Segmented, Select, Textarea } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { IconPicker } from '@/shared/ui/IconPicker'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'
import type { El, Sec } from '@/shared/data/pages'

const COLORS: [string, string][] = [['', 'پیش‌فرض'], ['#0000ff', 'آبی برند'], ['#10123d', 'سرمه‌ای'], ['#ffc24b', 'زرد'], ['#c42f2f', 'قرمز تخفیف'], ['#12733f', 'سبز'], ['#ffffff', 'سفید'], ['#f5f6fa', 'خاکستری روشن'], ['#fdecec', 'صورتی کم‌رنگ'], ['#eef0ff', 'آبی کم‌رنگ']]
const COLOR_WORDS: Record<string, string> = { آبی: '#0000ff', سرمه: '#10123d', زرد: '#ffc24b', قرمز: '#c42f2f', سبز: '#12733f', سفید: '#ffffff', مشکی: '#000000', خاکستری: '#f5f6fa', صورتی: '#fdecec' }

/** ویرایش با هوش مصنوعی (شبیه‌سازی؛ در نسخهٔ واقعی با کلید Claude در «یکپارچه‌سازی‌ها»): از فرمان فارسی، تغییرها را پیشنهاد می‌کند */
export function aiPatch(target: { el?: El; sec?: Sec }, prompt: string): { patch: Partial<El> & Partial<Sec>; summary: string[] } {
  const p = prompt.trim(); const out: Partial<El> & Partial<Sec> = {}; const sum: string[] = []
  const color = Object.entries(COLOR_WORDS).find(([w]) => p.includes(w))?.[1]
  if (color && /پس[‌ ]?زمینه|بک[‌ ]?گراند|رنگ بخش/.test(p)) { out.bg = color; sum.push(`پس‌زمینه ← ${color}`) } else if (color) { out.color = color; sum.push(`رنگ ← ${color}`) }
  const q = p.match(/[«"]([^»"]+)[»"]/)?.[1] ?? p.match(/(?:به|بنویس|بکن|کن)\s*[:：]\s*(.+)$/)?.[1]
  if (q) { if (target.el) { out.text = q; sum.push(`متن ← «${q}»`) } else { out.name = q; sum.push(`نام بخش ← «${q}»`) } }
  const el = target.el
  if (el?.text && /کوتاه|خلاصه/.test(p)) { const t = el.text.split(/[،,؛.]/)[0].trim(); out.text = t; sum.push(`متن کوتاه شد: «${t}»`) }
  if (el?.text && /رسمی/.test(p)) { out.text = el.text.replace(/می‌خوای/g, 'می‌خواهید').replace(/بخر/g, 'خرید کنید'); sum.push('لحن رسمی‌تر شد') }
  if (el?.text && /صمیمی|خودمونی/.test(p)) { out.text = el.text.replace(/می‌خواهید/g, 'می‌خوای').replace(/کنید/g, 'کن'); sum.push('لحن صمیمی‌تر شد') }
  if (/بزرگ[‌ ]?تر|درشت/.test(p)) { out.size = (el?.size ?? 16) + 4; sum.push(`اندازهٔ قلم ← ${out.size}`) }
  if (/کوچک[‌ ]?تر|ریز/.test(p)) { out.size = Math.max(10, (el?.size ?? 16) - 3); sum.push(`اندازهٔ قلم ← ${out.size}`) }
  if (/پررنگ|بولد|ضخیم/.test(p)) { out.weight = 800; sum.push('ضخامت ← پررنگ') }
  if (/وسط/.test(p)) { out.align = 'center'; sum.push('چینش ← وسط') }
  if (/پنهان|مخفی|نشان نده/.test(p)) { out.hidden = true; sum.push('پنهان شد') }
  if (/نشان بده|نمایش بده|آشکار/.test(p)) { out.hidden = false; sum.push('نمایش داده شد') }
  const cnt = p.match(/(\d+|[۰-۹]+)\s*(?:کالا|تا)/)?.[1]; if (el?.kind === 'products' && cnt) { out.count = +cnt.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))); sum.push(`تعداد کالا ← ${out.count}`) }
  if (!sum.length) sum.push('تغییری از این فرمان برداشت نشد؛ مثلاً بنویسید: «پس‌زمینه را زرد کن» یا «متن را به: …» یا «بزرگ‌تر و پررنگ کن».')
  return { patch: out, summary: sum }
}

/** پنل ویژگی‌های المان یا بخش انتخاب‌شده: دستی + هوش مصنوعی + آمار */
export function Inspector({ sec, el, onEl, onSec, onAddEl, onDelEl, pageTitle }: { sec: Sec; el?: El; onEl: (p: Partial<El>, log?: string) => void; onSec: (p: Partial<Sec>, log?: string) => void; onAddEl: (kind: El['kind']) => void; onDelEl: () => void; pageTitle: string }) {
  const [tab, setTab] = useState<'content' | 'style' | 'ai' | 'stats'>('content'); const [prompt, setPrompt] = useState(''); const [preview, setPreview] = useState<ReturnType<typeof aiPatch> | null>(null)
  const file = useRef<HTMLInputElement>(null); const [dimWarn, setDimWarn] = useState('')
  const upload = async (f: File) => {
    const url = URL.createObjectURL(f); const img = new Image()
    img.onload = async () => { const need = el?.w && el?.h ? el.w / el.h : 0; const got = img.width / img.height
      setDimWarn(need && Math.abs(need - got) / need > 0.04 ? `ابعاد فایل ${fa(img.width)}×${fa(img.height)} است؛ نسبت این جایگاه ${fa(el!.w!)}×${fa(el!.h!)} است و تصویر برش می‌خورد.` : img.width < (el?.w ?? 0) ? `عرض فایل (${fa(img.width)}) از عرض جایگاه (${fa(el!.w!)}) کمتر است و تار دیده می‌شود.` : '')
      onEl({ src: await fileToImage(f, Math.max(el?.w ?? 900, 600), 0.86) }, 'تعویض تصویر'); URL.revokeObjectURL(url) }
    img.src = url
  }
  const t = el ?? sec
  return (
    <div className="space-y-3">
      <div><p className="text-11 text-t2">{pageTitle} › {sec.name}</p><p className="flex items-center gap-2 text-15 font-bold">{el ? el.label : sec.name}{el && <Badge dot={false}>{({ heading: 'عنوان', text: 'متن', button: 'دکمه', link: 'لینک', image: 'تصویر', banner: 'بنر', icon: 'آیکون', badge: 'نشان', chips: 'چیپ‌ها', timer: 'تایمر', products: 'کالاها', list: 'فهرست', input: 'فیلد', video: 'ویدیو' } as Record<string, string>)[el.kind]}</Badge>}</p></div>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-bg p-1">{([['content', 'محتوا', <Type key="c" size={13} />], ['style', 'ظاهر', <Paintbrush key="s" size={13} />], ['ai', 'هوش مصنوعی', <Sparkles key="a" size={13} />], ['stats', 'آمار', <BarChart3 key="b" size={13} />]] as const).map(([k, l, ic]) => <button key={k} onClick={() => setTab(k)} className={cx('flex items-center justify-center gap-1 rounded-lg py-1.5 text-11', tab === k ? 'bg-surface font-semibold text-brand shadow-sm' : 'text-t2')}>{ic}{l}</button>)}</div>
      {tab === 'content' && (el ? <div className="space-y-3">
        <Field label="نام در پنل"><Input value={el.label} onChange={(e) => onEl({ label: e.target.value })} /></Field>
        {['heading', 'text', 'button', 'link', 'badge', 'icon', 'input', 'video', 'timer', 'banner', 'image'].includes(el.kind) && <Field label={el.kind === 'banner' || el.kind === 'image' ? 'متن روی تصویر / alt' : 'متن'}>{el.kind === 'text' ? <Textarea rows={3} value={el.text ?? ''} onChange={(e) => onEl({ text: e.target.value })} /> : <Input value={el.text ?? ''} onChange={(e) => onEl({ text: e.target.value })} />}</Field>}
        {['button', 'link', 'banner', 'image', 'icon'].includes(el.kind) && <Field label="لینک" help="داخلی (/offers) یا بیرونی (https://…)"><Input className="ltr text-left" value={el.href ?? ''} onChange={(e) => onEl({ href: e.target.value })} /></Field>}
        {['button', 'link', 'badge', 'icon'].includes(el.kind) && <Field label="آیکون"><IconPicker value={el.icon} onChange={(v) => onEl({ icon: v }, 'تغییر آیکون')} /></Field>}
        {(el.kind === 'banner' || el.kind === 'image') && <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-12"><b>ابعاد لازم:</b> <span className="ltr">{fa(el.w ?? 0)} × {fa(el.h ?? 0)}</span> پیکسل · <span className="text-t2">{pageTitle} › {sec.name}</span></p>
          {el.src && <img src={el.src} alt="" className="w-full rounded-lg" style={{ aspectRatio: `${el.w} / ${el.h}`, objectFit: 'cover' }} />}
          <div className="flex gap-2"><Button size="sm" variant="primary" icon={<ImagePlus size={13} />} onClick={() => file.current?.click()}>{el.src ? 'تعویض تصویر' : 'بارگذاری تصویر'}</Button>{el.src && <Button size="sm" variant="ghost" onClick={() => onEl({ src: '' }, 'حذف تصویر')}>حذف</Button>}</div>
          {dimWarn && <p className="rounded-lg bg-warning-bg px-2 py-1 text-11 text-warning">{dimWarn}</p>}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
          <div className="grid grid-cols-2 gap-2"><Field label="عرض"><Input type="number" value={el.w ?? 0} onChange={(e) => onEl({ w: +e.target.value })} /></Field><Field label="ارتفاع"><Input type="number" value={el.h ?? 0} onChange={(e) => onEl({ h: +e.target.value })} /></Field></div>
        </div>}
        {(el.kind === 'chips' || el.kind === 'list') && <div className="space-y-1.5"><p className="text-12 font-semibold">{el.kind === 'chips' ? 'چیپ‌ها / فیلترها' : 'آیتم‌ها'}</p>{(el.items ?? []).map((x, i) => <div key={i} className="flex gap-1"><Input aria-label={`آیتم ${i + 1}`} className="h-8 text-12" value={x} onChange={(e) => onEl({ items: (el.items ?? []).map((y, j) => (j === i ? e.target.value : y)) })} /><button aria-label="حذف" className="text-danger" onClick={() => onEl({ items: (el.items ?? []).filter((_, j) => j !== i) })}><Trash2 size={13} /></button></div>)}<Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => onEl({ items: [...(el.items ?? []), 'آیتم تازه'] })}>افزودن</Button></div>}
        {el.kind === 'timer' && <Field label="پایان"><Input type="datetime-local" className="ltr" value={(el.end ?? '').slice(0, 16)} onChange={(e) => onEl({ end: new Date(e.target.value).toISOString() })} /></Field>}
        {el.kind === 'products' && <><Field label="منبع کالاها"><Select value={el.source ?? ''} onChange={(v) => onEl({ source: v })} options={['کمپین فعال غنی‌آف', 'پرفروش ۷ روز اخیر', 'واجد تحویل سریع + انبار تهران', 'رفتار همین کاربر', 'وضعیت = استوک یا جعبه‌باز', 'دستهٔ انتخابی', 'انتخاب دستی', el.source ?? ''].filter((v, i, a) => v && a.indexOf(v) === i)} /></Field><Field label="تعداد"><Input type="number" min={1} max={24} value={el.count ?? 8} onChange={(e) => onEl({ count: +e.target.value })} /></Field></>}
        <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={onDelEl}>حذف این المان</Button>
      </div> : <div className="space-y-3">
        <Field label="نام بخش"><Input value={sec.name} onChange={(e) => onSec({ name: e.target.value })} /></Field>
        <p className="text-12 font-semibold">افزودن المان به این بخش</p>
        <div className="grid grid-cols-3 gap-1.5">{([['heading', 'عنوان'], ['text', 'متن'], ['button', 'دکمه'], ['link', 'لینک'], ['banner', 'بنر'], ['image', 'تصویر'], ['icon', 'آیکون'], ['badge', 'نشان'], ['chips', 'چیپ'], ['timer', 'تایمر'], ['products', 'کالاها'], ['list', 'فهرست'], ['video', 'ویدیو'], ['input', 'فیلد']] as const).map(([k, l]) => <button key={k} onClick={() => onAddEl(k)} className="rounded-lg border border-line py-2 text-12 hover:border-brand hover:text-brand">{l}</button>)}</div>
      </div>)}
      {tab === 'style' && <div className="space-y-3">
        {el && <Field label="رنگ متن"><Select value={el.color ?? ''} onChange={(v) => onEl({ color: v || undefined })} options={COLORS} /></Field>}
        <Field label={el ? 'رنگ پس‌زمینهٔ المان' : 'رنگ پس‌زمینهٔ بخش'}><div className="flex items-center gap-2"><Select className="flex-1" value={(el ? el.bg : sec.bg) ?? ''} onChange={(v) => (el ? onEl({ bg: v || undefined }, 'تغییر پس‌زمینه') : onSec({ bg: v || undefined }, 'تغییر پس‌زمینهٔ بخش'))} options={COLORS} /><input aria-label="رنگ دلخواه" type="color" className="h-9 w-11 rounded-md border border-line" value={((el ? el.bg : sec.bg) ?? '#ffffff').slice(0, 7)} onChange={(e) => (el ? onEl({ bg: e.target.value }) : onSec({ bg: e.target.value }))} /></div></Field>
        {el && ['heading', 'text', 'button', 'badge'].includes(el.kind) && <><Field label="اندازهٔ قلم"><Input type="number" min={10} max={48} value={el.size ?? 14} onChange={(e) => onEl({ size: +e.target.value })} /></Field><Field label="ضخامت"><Segmented size="sm" value={String(el.weight ?? 400)} onChange={(v) => onEl({ weight: +v })} options={[['400', 'معمولی'], ['600', 'نیمه'], ['800', 'پررنگ']]} /></Field><Field label="چینش"><Segmented size="sm" value={el.align ?? 'start'} onChange={(v) => onEl({ align: v as El['align'] })} options={[['start', 'راست'], ['center', 'وسط'], ['end', 'چپ']]} /></Field></>}
        <Button size="sm" variant="ghost" onClick={() => (el ? onEl({ hidden: !el.hidden }, el.hidden ? 'نمایش المان' : 'پنهان کردن المان') : onSec({ hidden: !sec.hidden }))}>{(el ? el.hidden : sec.hidden) ? 'نمایش' : 'پنهان کردن'}</Button>
      </div>}
      {tab === 'ai' && <div className="space-y-3">
        <p className="text-12 text-t2">بنویسید چه چیزی عوض شود؛ پیش از اعمال، تغییرها را می‌بینید.</p>
        <Textarea rows={3} aria-label="فرمان هوش مصنوعی" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={el ? 'مثلاً: متن را به: «تخفیف‌های امروز را ببینید» و پررنگ کن' : 'مثلاً: پس‌زمینه را زرد کن'} />
        <div className="flex flex-wrap gap-1">{(el ? ['کوتاه‌تر کن', 'بزرگ‌تر و پررنگ کن', 'رسمی‌تر بنویس', 'رنگ را قرمز کن', 'وسط‌چین کن'] : ['پس‌زمینه را زرد کن', 'پس‌زمینه را سرمه‌ای کن', 'بخش را پنهان کن']).map((x) => <button key={x} onClick={() => setPrompt(x)} className="rounded-full border border-line px-2 py-0.5 text-11 hover:border-brand">{x}</button>)}</div>
        <Button variant="ai" icon={<Wand2 size={14} />} disabled={!prompt.trim()} onClick={() => setPreview(aiPatch({ el, sec: el ? undefined : sec }, prompt))}>پیشنهاد تغییر</Button>
        {preview && <div className="rounded-xl border border-brand/40 bg-brand-tint/40 p-3 text-12"><ul className="list-inside list-disc space-y-0.5">{preview.summary.map((x) => <li key={x}>{x}</li>)}</ul>
          {Object.keys(preview.patch).length > 0 && <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" onClick={() => { el ? onEl(preview.patch, `ویرایش با AI: ${prompt}`) : onSec(preview.patch as Partial<Sec>, `ویرایش با AI: ${prompt}`); setPreview(null); setPrompt(''); toast('تغییر هوش مصنوعی اعمال شد. با «بازگردانی» در لاگ برمی‌گردد.') }}>اعمال</Button><Button size="sm" variant="ghost" onClick={() => setPreview(null)}>رد</Button></div>}</div>}
      </div>}
      {tab === 'stats' && <div className="space-y-2 text-13">{el ? <><p className="flex justify-between"><span className="text-t2">نمایش</span><b className="tnum">{fa(el.views)}</b></p><p className="flex justify-between"><span className="text-t2">کلیک</span><b className="tnum">{fa(el.clicks)}</b></p><p className="flex justify-between"><span className="text-t2">نرخ کلیک (CTR)</span><b className="tnum">{fa(((el.clicks / Math.max(1, el.views)) * 100).toFixed(2))}٪</b></p></> : <><p className="flex justify-between"><span className="text-t2">کلیک کل بخش</span><b className="tnum">{fa(sec.els.reduce((a, e) => a + e.clicks, 0))}</b></p>{[...sec.els].sort((a, b) => b.clicks - a.clicks).slice(0, 6).map((e) => <p key={e.id} className="flex justify-between text-12"><span>{e.label}</span><b className="tnum">{fa(e.clicks)}</b></p>)}</>}<p className="text-11 text-t2">داده از جدول رویدادهای سمت سرور (بخش «یکپارچه‌سازی‌ها › رویدادها») خوانده می‌شود.</p></div>}
      {t && null}
    </div>
  )
}
