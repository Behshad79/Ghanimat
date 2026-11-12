import { useRef, useState } from 'react'
import { ImagePlus, Search, X } from 'lucide-react'
import { Button, cx, Input } from './base'
import { Modal, toast } from './overlay'
import { MAGICOON, ICON_LABEL } from '../icons/magicoon'
import { MagicIcon } from './MagicIcon'
import { fileToImage } from '../lib/image'

/** انتخاب آیکون از کتابخانهٔ Magicoon، یا تبدیل آیکون به عکس دلخواه، یا حذف آیکون */
export function IconPicker({ value, onChange, label = 'آیکون' }: { value?: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const file = useRef<HTMLInputElement>(null)
  const names = Object.keys(MAGICOON).filter((k) => !q || `${k} ${ICON_LABEL[k] ?? ''}`.includes(q))
  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`تغییر ${label}`} onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-xl border border-line bg-surface-2 hover:border-brand">{value ? <MagicIcon name={value} size={22} /> : <span className="text-11 text-t3">بدون</span>}</button>
        <Button size="sm" onClick={() => setOpen(true)}>انتخاب آیکون</Button>
        <Button size="sm" variant="ghost" icon={<ImagePlus size={13} />} onClick={() => file.current?.click()}>تبدیل به عکس</Button>
        {value && <Button size="sm" variant="ghost" aria-label="حذف آیکون" icon={<X size={13} />} onClick={() => onChange('')} />}
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const src = await fileToImage(f, 128, 0.9); onChange(`img:${src}`); toast('آیکون به عکس تبدیل شد.') }} />
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="کتابخانهٔ آیکون Magicoon">
        <div className="relative mb-3"><Search size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input autoFocus aria-label="جست‌وجوی آیکون" className="pr-8" placeholder="مثلاً سبد، قلب، ساعت…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="grid max-h-80 grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">{names.map((k) => <button key={k} type="button" title={ICON_LABEL[k] ?? k} onClick={() => { onChange(k); setOpen(false) }} className={cx('flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] text-t2 hover:border-brand', value === k ? 'border-brand bg-brand-tint text-brand' : 'border-line')}><MagicIcon name={k} size={22} /><span className="w-full truncate text-center">{ICON_LABEL[k] ?? k}</span></button>)}</div>
        <p className="mt-3 text-11 text-t2">{Object.keys(MAGICOON).length.toLocaleString('fa-IR')} آیکون پرکاربرد از ۲٬۷۶۷ آیکون فایل فیگما. برای آیکون دیگر، «تبدیل به عکس» را بزنید یا SVG آن را به کتابخانه اضافه کنید.</p>
      </Modal>
    </>
  )
}
