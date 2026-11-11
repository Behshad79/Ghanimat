import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, X } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { currentUser, mutate, useDB } from '@/shared/lib/store'

/** اعلان لحظه‌ای: هر هشدار تازه به‌صورت کارت لغزان می‌آید و (با اجازهٔ مرورگر) اعلان سیستم‌عامل هم می‌فرستد */
export function LiveAlert() {
  const d = useDB(); const nav = useNavigate(); const me = currentUser()
  const top = d.alerts[0]; const seen = useRef(top?.id); const [show, setShow] = useState<typeof top | null>(null)
  useEffect(() => {
    if (!top || top.id === seen.current) return
    seen.current = top.id
    if (!me || !['super', 'ops'].includes(me.role)) return
    setShow(top)
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`غنیمت · ${top.title}`, { body: top.body, icon: './brand/logo-mark.png', tag: top.id }) } catch { /* قاب نمایشی اجازهٔ اعلان نمی‌دهد */ }
    const t = setTimeout(() => setShow(null), 7000); return () => clearTimeout(t)
  }, [top?.id])
  if (!show) return null
  return (
    <div role="status" className="no-print anim-pop fixed top-12 left-1/2 z-[75] w-[min(92vw,420px)] -translate-x-1/2">
      <div className={cx('flex items-start gap-3 rounded-xl border bg-surface p-3 shadow-float', show.tone === 'danger' ? 'border-danger/40' : show.tone === 'warning' ? 'border-warning/40' : 'border-brand/30')}>
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', show.tone === 'danger' ? 'bg-danger-bg text-danger' : show.tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-brand-tint text-brand')}><BellRing size={17} /></span>
        <button className="min-w-0 flex-1 text-right" onClick={() => { mutate((x) => { const a = x.alerts.find((y) => y.id === show.id); if (a) a.read = true }); setShow(null); nav(show.to) }}>
          <p className="text-13 font-bold">{show.title}</p><p className="line-clamp-2 text-12 text-t2">{show.body}</p><span className="mt-1 inline-block text-12 font-medium text-brand">مشاهده</span>
        </button>
        <button aria-label="بستن اعلان" onClick={() => setShow(null)} className="text-t3 hover:text-t1"><X size={16} /></button>
      </div>
    </div>
  )
}
/** درخواست اجازهٔ اعلان مرورگر (از تنظیمات اعلان‌ها) */
export async function askBrowserNotify(): Promise<string> {
  try { if (!('Notification' in window)) return 'این مرورگر اعلان سیستم‌عامل را پشتیبانی نمی‌کند.'; const r = await Notification.requestPermission(); return r === 'granted' ? 'اعلان مرورگر فعال شد.' : 'اجازهٔ اعلان داده نشد. از تنظیمات مرورگر می‌توانید آن را باز کنید.' } catch { return 'این قاب اجازهٔ اعلان نمی‌دهد. پنل را در پنجرهٔ جدا یا به‌صورت وب‌اپ نصب‌شده باز کنید.' }
}
