// ویدیوهای صفحهٔ کالا: آپلود مستقیم فایل خودمان (با پیش‌نمایش و کاور خودکار) یا لینک آپارات و یوتیوب
import { useRef, useState } from 'react'
import { Film, Link2, Trash2, Upload } from 'lucide-react'
import { Button, cx, Input, Select } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { fa } from '@/shared/lib/fa'

export type PdpVideo = { kind: string; url: string; src?: 'upload' | 'link'; file?: { name: string; size: number; poster?: string; duration?: number } }
const KINDS = ['ویدیوی معرفی', 'ویدیوی بررسی', 'ویدیوی باز کردن جعبه', 'ویدیوی تست غنیمت']
const MAX = 300 * 1024 * 1024
const LIVE = new Set<string>() // فایل‌هایی که در همین نشست انتخاب شده‌اند و پخش‌شدنی‌اند
const mb = (n: number) => `${fa(Math.round(n / 1024 / 1024 * 10) / 10)} مگابایت`
const mmss = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.round(s % 60)).padStart(2, '0'))}`

/** کاور ویدیو: فریم ثانیهٔ اول، کوچک و فشرده تا در دادهٔ کالا بماند */
function grab(file: File): Promise<{ url: string; poster?: string; duration?: number }> {
  const url = URL.createObjectURL(file); LIVE.add(url)
  return new Promise((res) => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.src = url
    const done = (poster?: string) => res({ url, poster, duration: Number.isFinite(v.duration) ? v.duration : undefined })
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2) }
    v.onseeked = () => { try { const c = document.createElement('canvas'); const w = 320; c.width = w; c.height = Math.round(w * (v.videoHeight / v.videoWidth || 0.5625)); c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.6)) } catch { done() } }
    v.onerror = () => done(); setTimeout(() => done(), 4000)
  })
}

export function VideoField({ videos, onChange }: { videos: PdpVideo[]; onChange: (v: PdpVideo[]) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState<number | null>(null); const [drag, setDrag] = useState(false)
  const patch = (i: number, p: Partial<PdpVideo>) => onChange(videos.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])]; if (!list.length) return
    const next = [...videos]
    for (const fl of list) {
      if (!/^video\//.test(fl.type) && !/\.(mp4|mov|webm|m4v)$/i.test(fl.name)) { toast(`«${fl.name}» ویدیو نیست. MP4، MOV یا WebM بفرستید.`, { tone: 'err' }); continue }
      if (fl.size > MAX) { toast(`«${fl.name}» ${mb(fl.size)} است؛ سقف هر ویدیو ۳۰۰ مگابایت است.`, { tone: 'err' }); continue }
      setBusy(next.length); const g = await grab(fl)
      next.push({ kind: next.length ? 'ویدیوی بررسی' : 'ویدیوی معرفی', url: g.url, src: 'upload', file: { name: fl.name, size: fl.size, poster: g.poster, duration: g.duration } })
    }
    setBusy(null); onChange(next); if (input.current) input.current.value = ''
  }
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2"><p className="text-13 font-semibold">ویدیوهای صفحهٔ کالا</p><span className="text-11 text-t2">آپلود فایل خودمان یا لینک آپارات و یوتیوب</span></div>
    <label onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files) }}
      className={cx('flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-12 transition', drag ? 'border-brand bg-brand-tint/50' : 'border-line hover:border-brand/50 hover:bg-neutral-bg/60')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-tint text-brand"><Upload size={17} /></span>
      <span className="flex-1"><b className="block text-13">ویدیو را اینجا رها کنید یا انتخاب کنید</b><span className="text-t2">MP4، MOV یا WebM تا ۳۰۰ مگابایت · کاور از خود ویدیو ساخته می‌شود · روی سرور غنیمت برای موبایل فشرده و بدون نیاز به سایت دیگر پخش می‌شود</span></span>
      <input ref={input} type="file" accept="video/*" multiple className="sr-only" aria-label="آپلود ویدیو" onChange={(e) => upload(e.target.files)} />
    </label>
    {busy !== null && <p className="text-11 text-t2">در حال آماده‌سازی ویدیو و ساخت کاور…</p>}
    {videos.map((v, i) => { const up = v.src === 'upload' || !!v.file; const live = up && LIVE.has(v.url); return (
      <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-bg">
          {live ? <video src={v.url} poster={v.file?.poster} controls muted className="size-full object-cover" aria-label={`پیش‌نمایش ${v.file?.name}`} /> : v.file?.poster ? <img src={v.file.poster} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-t2">{up ? <Film size={18} /> : <Link2 size={18} />}</span>}
          {v.file?.duration ? <span className="absolute bottom-1 left-1 rounded-sm bg-black/70 px-1 text-[10px] text-white">{mmss(v.file.duration)}</span> : null}
        </div>
        <Select className="w-40" value={v.kind} onChange={(k) => patch(i, { kind: k })} options={KINDS} />
        {up ? <span className="min-w-0 flex-1 text-12"><b className="block truncate ltr text-left">{v.file?.name}</b><span className="text-t2">{v.file ? mb(v.file.size) : ''} · آپلودشده{!live && ' · فایل روی سرور غنیمت'}</span></span>
          : <Input aria-label="نشانی ویدیو" className="ltr min-w-48 flex-1 text-left" value={v.url} placeholder="لینک آپارات یا یوتیوب: https://…" onChange={(e) => patch(i, { url: e.target.value, src: 'link' })} />}
        {i > 0 && <button className="text-11 text-brand hover:underline" onClick={() => { const a = [...videos]; const [x] = a.splice(i, 1); a.unshift(x); onChange(a) }}>اول نمایش بده</button>}
        <Button variant="ghost" aria-label="حذف ویدیو" icon={<Trash2 size={14} />} onClick={() => onChange(videos.filter((_, j) => j !== i))} />
      </div>) })}
    <div className="flex flex-wrap gap-2"><Button size="sm" icon={<Upload size={13} />} onClick={() => input.current?.click()}>آپلود ویدیو</Button><Button size="sm" variant="ghost" icon={<Link2 size={13} />} onClick={() => onChange([...videos, { kind: 'ویدیوی معرفی', url: '', src: 'link' }])}>افزودن لینک ویدیو</Button></div>
  </div>
}
