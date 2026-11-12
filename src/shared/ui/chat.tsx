import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, FileText, Mic, Paperclip, Pause, Play, Send, Square, Trash2, X } from 'lucide-react'
import { Button, cx } from './base'
import { Modal, toast } from './overlay'
import { fileToImage } from '../lib/image'
import { fa } from '../lib/fa'
import type { Att } from '../data/seed'

const kb = (n?: number) => (!n ? '' : n > 1048576 ? `${fa((n / 1048576).toFixed(1))} مگابایت` : `${fa(Math.round(n / 1024))} کیلوبایت`)
const readURL = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })
const mmss = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(Math.floor(s % 60)).padStart(2, '0'))}`

/** پخش پیام صوتی با نوار موج؛ اگر فایل صوتی واقعی نباشد (نمونه)، فقط مدت را نشان می‌دهد */
function Voice({ a, mine }: { a: Att; mine?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null); const [on, setOn] = useState(false); const [p, setP] = useState(0)
  const bars = Array.from({ length: 28 }, (_, i) => 30 + ((i * 37 + (a.dur ?? 9) * 13) % 70))
  const toggle = () => { const el = ref.current; if (!a.src || !el) { setOn(!on); if (!on) { let t = 0; const iv = setInterval(() => { t += 0.1; setP(Math.min(1, t / (a.dur ?? 10))); if (t >= (a.dur ?? 10)) { clearInterval(iv); setOn(false); setP(0) } }, 100) } return } if (on) el.pause(); else void el.play(); setOn(!on) }
  return (
    <div className={cx('flex w-64 items-center gap-2 rounded-xl px-2 py-1.5', mine ? 'bg-brand-solid/10' : 'bg-surface')}>
      <button type="button" aria-label={on ? 'توقف پیام صوتی' : 'پخش پیام صوتی'} onClick={toggle} className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-solid text-white">{on ? <Pause size={14} /> : <Play size={14} />}</button>
      <span className="flex h-7 flex-1 items-center gap-[2px]" aria-hidden>{bars.map((h, i) => <span key={i} className={cx('w-[3px] rounded-full', i / bars.length <= p ? 'bg-brand' : 'bg-t3/40')} style={{ height: `${h}%` }} />)}</span>
      <span className="tnum text-11 text-t2">{mmss(a.dur ?? 0)}</span>
      {a.src && <audio ref={ref} src={a.src} onTimeUpdate={(e) => setP(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} onEnded={() => { setOn(false); setP(0) }} />}
    </div>
  )
}

/** نمایش پیوست‌های یک پیام: عکس (بزرگ‌نمایی)، ویدیو، فایل (دانلود) و صدا */
export function Attachments({ list, mine }: { list?: Att[]; mine?: boolean }) {
  const [zoom, setZoom] = useState<string | null>(null)
  if (!list?.length) return null
  return (
    <div className="mt-2 space-y-1.5">
      {list.some((a) => a.kind === 'image') && <div className="flex flex-wrap gap-1.5">{list.filter((a) => a.kind === 'image').map((a, i) => <button key={i} type="button" onClick={() => setZoom(a.src)} className="overflow-hidden rounded-lg border border-line"><img src={a.src} alt={a.name ?? 'عکس'} className="size-24 object-cover" /></button>)}</div>}
      {list.filter((a) => a.kind === 'video').map((a, i) => <video key={i} src={a.src} controls className="max-h-48 rounded-lg" />)}
      {list.filter((a) => a.kind === 'voice').map((a, i) => <Voice key={i} a={a} mine={mine} />)}
      {list.filter((a) => a.kind === 'file').map((a, i) => <a key={i} href={a.src || undefined} download={a.name} className="flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-12 hover:border-brand/50"><FileText size={16} className="text-brand" /><span className="max-w-48 truncate">{a.name}</span><span className="text-11 text-t2">{kb(a.size)}</span></a>)}
      <Modal wide open={!!zoom} onClose={() => setZoom(null)} title="پیوست">{zoom && <img src={zoom} alt="" className="w-full rounded-xl" />}</Modal>
    </div>
  )
}

/** نوشتن پیام با پیوست: عکس، فایل، ویدیو و پیام صوتی؛ کشیدن و رها کردن و چسباندن عکس هم پشتیبانی می‌شود */
export function Composer({ onSend, placeholder = 'پاسخ را بنویسید', primary = 'ارسال پاسخ', extra, value, onChange, disabled }: { onSend: (text: string, atts: Att[]) => void; placeholder?: string; primary?: string; extra?: (text: string, atts: Att[], reset: () => void) => ReactNode; value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  const [own, setOwn] = useState(''); const text = value ?? own; const setText = onChange ?? setOwn
  const [atts, setAtts] = useState<Att[]>([]); const [drag, setDrag] = useState(false)
  const [rec, setRec] = useState<{ mr: MediaRecorder; t0: number } | null>(null); const [sec, setSec] = useState(0)
  useEffect(() => { if (!rec) return; const iv = setInterval(() => setSec((Date.now() - rec.t0) / 1000), 200); return () => clearInterval(iv) }, [rec])
  const add = async (files: FileList | File[]) => { for (const f of [...files]) { if (f.size > 15 * 1048576) { toast(`«${f.name}» بیشتر از ۱۵ مگابایت است.`, { tone: 'err' }); continue } const kind: Att['kind'] = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'voice' : 'file'; const src = kind === 'image' ? await fileToImage(f, 1600, 0.85) : await readURL(f); setAtts((x) => [...x, { kind, src, name: f.name, size: f.size }]) } }
  const record = async () => {
    if (rec) { rec.mr.stop(); return }
    try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(st); const chunks: Blob[] = []; const t0 = Date.now()
      mr.ondataavailable = (e) => chunks.push(e.data); mr.onstop = async () => { st.getTracks().forEach((t) => t.stop()); const b = new Blob(chunks, { type: mr.mimeType }); const src = await readURL(new File([b], 'voice')); setAtts((x) => [...x, { kind: 'voice', src, name: 'پیام صوتی', dur: Math.round((Date.now() - t0) / 1000), size: b.size }]); setRec(null); setSec(0) }
      mr.start(); setRec({ mr, t0 }) } catch { toast('دسترسی به میکروفون داده نشد. از تنظیمات مرورگر اجازهٔ میکروفون را بدهید.', { tone: 'err' }) } }
  const reset = () => { setText(''); setAtts([]) }
  const send = () => { if (!text.trim() && !atts.length) return toast('متن یا پیوستی برای ارسال نیست.', { tone: 'err' }); onSend(text.trim(), atts); reset() }
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void add(e.dataTransfer.files) }} className={cx('rounded-xl border bg-surface transition-colors', drag ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
      <textarea rows={3} value={text} disabled={disabled} onChange={(e) => setText(e.target.value)} onPaste={(e) => { const fs = [...e.clipboardData.files]; if (fs.length) { e.preventDefault(); void add(fs) } }} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }} placeholder={drag ? 'فایل را رها کنید' : `${placeholder} (عکس را بچسبانید یا بکشید؛ Ctrl+Enter برای ارسال)`} aria-label="متن پیام" className="block w-full resize-y rounded-t-xl bg-transparent px-3 py-2 text-13 leading-6 outline-none" />
      {atts.length > 0 && <div className="flex flex-wrap gap-2 px-3 pb-2">{atts.map((a, i) => <span key={i} className="relative flex items-center gap-1.5 rounded-lg border border-line bg-neutral-bg py-1 pl-6 pr-1.5 text-11">{a.kind === 'image' ? <img src={a.src} alt="" className="size-8 rounded object-cover" /> : a.kind === 'voice' ? <Mic size={14} className="text-brand" /> : <FileText size={14} className="text-brand" />}<span className="max-w-32 truncate">{a.kind === 'voice' ? `پیام صوتی ${mmss(a.dur ?? 0)}` : a.name}</span><button type="button" aria-label="حذف پیوست" onClick={() => setAtts(atts.filter((_, j) => j !== i))} className="absolute left-1 grid size-4 place-items-center rounded-full text-t2 hover:text-danger"><X size={11} /></button></span>)}</div>}
      <div className="flex flex-wrap items-center gap-1 border-t border-line px-2 py-1.5">
        <label className="grid size-8 cursor-pointer place-items-center rounded-lg text-t2 hover:bg-neutral-bg hover:text-brand" title="عکس یا ویدیو"><Camera size={16} /><input type="file" accept="image/*,video/*" multiple className="sr-only" aria-label="افزودن عکس یا ویدیو" onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = '' }} /></label>
        <label className="grid size-8 cursor-pointer place-items-center rounded-lg text-t2 hover:bg-neutral-bg hover:text-brand" title="فایل (PDF، فاکتور، اکسل…)"><Paperclip size={16} /><input type="file" multiple className="sr-only" aria-label="افزودن فایل" onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = '' }} /></label>
        <button type="button" onClick={() => void record()} title={rec ? 'پایان ضبط' : 'ضبط پیام صوتی'} aria-label={rec ? 'پایان ضبط' : 'ضبط پیام صوتی'} className={cx('flex h-8 items-center gap-1 rounded-lg px-2 text-12', rec ? 'bg-danger-solid text-white' : 'text-t2 hover:bg-neutral-bg hover:text-brand')}>{rec ? <><Square size={13} /><span className="tnum">{mmss(sec)}</span></> : <Mic size={16} />}</button>
        {atts.length > 0 && <button type="button" onClick={() => setAtts([])} className="flex h-8 items-center gap-1 rounded-lg px-2 text-11 text-t2 hover:text-danger"><Trash2 size={12} />حذف پیوست‌ها</button>}
        <span className="mr-auto flex flex-wrap gap-2"><Button variant="primary" icon={<Send size={14} />} disabled={disabled} onClick={send}>{primary}</Button>{extra?.(text, atts, reset)}</span>
      </div>
    </div>
  )
}
