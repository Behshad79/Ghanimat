import { useState } from 'react'
import { Camera, Trash2, ZoomIn } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'

/** عکس پیش از ارسال: از کالا و بستهٔ بازِ هر مرسوله عکس گرفته و بایگانی می‌شود تا در مرجوعی، کالای دیگری پس داده نشود */
export function PackPhotos({ orderId, shipId, big, readOnly }: { orderId: string; shipId: string; big?: boolean; readOnly?: boolean }) {
  const d = useDB(); const s = d.orders.find((o) => o.id === orderId)?.shipments.find((x) => x.id === shipId)
  const [zoom, setZoom] = useState<string | null>(null)
  if (!s) return null
  const photos = s.packPhotos ?? []
  const add = async (files: FileList | null) => {
    if (!files?.length) return
    try {
      const imgs = await Promise.all([...files].slice(0, 6).map((f) => fileToImage(f, 1000, 0.8)))
      const by = currentUser()?.name ?? 'کاربر'
      mutate((x) => { const t = x.orders.find((o) => o.id === orderId)!.shipments.find((y) => y.id === shipId)!; t.packPhotos = [...(t.packPhotos ?? []), ...imgs.map((src) => ({ src, at: new Date().toISOString(), by }))] }, { action: 'ثبت عکس پیش از ارسال', target: `${shipId} (${imgs.length} عکس)` })
      toast(`${fa(imgs.length)} عکس پیش از ارسال بایگانی شد.`)
    } catch (e) { toast((e as Error).message, { tone: 'err' }) }
  }
  const size = big ? 'size-24' : 'size-16'
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((p, i) => (
          <div key={i} className={cx('group relative overflow-hidden rounded-lg border border-line', size)}>
            <button className="size-full" onClick={() => setZoom(p.src)} aria-label={`بزرگ‌نمایی عکس ${fa(i + 1)}`}><img src={p.src} alt={`عکس پیش از ارسال ${fa(i + 1)}`} className="size-full object-cover" /></button>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#10123d]/70 px-1 text-[10px] text-white">{rel(p.at)}</span>
            {!readOnly && <button aria-label="حذف عکس" onClick={() => mutate((x) => { const t = x.orders.find((o) => o.id === orderId)!.shipments.find((y) => y.id === shipId)!; t.packPhotos = (t.packPhotos ?? []).filter((_, j) => j !== i) }, { action: 'حذف عکس پیش از ارسال', target: shipId })} className="absolute top-1 left-1 hidden size-6 place-items-center rounded-sm bg-white/95 text-danger shadow group-hover:grid"><Trash2 size={12} /></button>}
          </div>))}
        {!readOnly && <label className={cx('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand/50 bg-brand-tint/40 text-11 font-medium text-brand transition-colors hover:border-brand', size)}>
          <Camera size={big ? 22 : 16} />عکس<input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>}
      </div>
      {!photos.length && <p className="mt-1 text-11 text-t2">{readOnly ? 'عکسی پیش از ارسال ثبت نشده است.' : 'پیش از تحویل، از کالا، سریال و بستهٔ باز عکس بگیرید.'}</p>}
      <Modal open={!!zoom} onClose={() => setZoom(null)} title={<span className="flex items-center gap-1"><ZoomIn size={15} />عکس پیش از ارسال · {shipId}</span>} wide>{zoom && <img src={zoom} alt="" className="mx-auto max-h-[70vh] rounded-lg" />}</Modal>
    </div>
  )
}
