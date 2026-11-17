import { useState } from 'react'
import { Paperclip, Plus, X } from 'lucide-react'
import { toast } from './overlay'

/** چیپ «سایر» برای بارگذاری مدرکی که در فهرست ثابت نیست: اول عنوانش را می‌پرسد، بعد فایل را می‌گیرد */
export function OtherUpload({ onFile, accept = 'image/*,application/pdf', label = 'سایر (مدرک دیگر)' }: { onFile: (file: File, title: string) => void; accept?: string; label?: string }) {
  const [open, setOpen] = useState(false); const [title, setTitle] = useState('')
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-line px-2.5 text-12 text-t2 hover:border-brand hover:text-brand"><Plus size={12} />{label}</button>
  return <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand bg-surface pr-2 text-12">
    <input autoFocus aria-label="عنوان مدرک" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="این مدرک چیست؟" className="h-7 w-40 bg-transparent outline-none" />
    <label className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 ${title.trim() ? 'bg-brand-solid text-white' : 'pointer-events-none bg-neutral-bg text-t3'}`}><Paperclip size={12} />انتخاب فایل<input type="file" accept={accept} className="sr-only" disabled={!title.trim()} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (!title.trim()) return toast('اول عنوان مدرک را بنویسید.', { tone: 'err' }); onFile(f, title.trim()); setTitle(''); setOpen(false) }} /></label>
    <button type="button" aria-label="انصراف" onClick={() => { setOpen(false); setTitle('') }} className="px-1 text-t3 hover:text-danger"><X size={13} /></button>
  </span>
}
