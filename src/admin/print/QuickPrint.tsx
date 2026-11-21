// چاپ سریع برچسب مرسوله در همان صفحه: پیش‌نمایش، انتخاب کاغذ، چاپ یا PDF؛ رفتن به مرکز چاپ فقط با انتخاب خود کاربر
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ExternalLink, Printer } from 'lucide-react'
import { Button, cx } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB, useSession } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { Order, Shipment } from '@/shared/data/seed'
import { PAPERS, paperKey, printPages, saveBlob, toPdf } from '@/shared/lib/printOut'
import { CourierLabel, PostLabel, type DocOpts } from './docs'
import { DOCS } from './PrintCenter'

const DEF: DocOpts = { font: 1, margin: 10, footer: '', seal: true, hide: [] }

export function QuickPrint({ open, onClose, o, s, doc }: { open: boolean; onClose: () => void; o: Order; s: Shipment; doc: 'post' | 'courier' }) {
  const d = useDB(); const s0 = useSession(); const nav = useNavigate(); const area = useRef<HTMLDivElement>(null); const box = useRef<HTMLDivElement>(null); const [zoom, setZoom] = useState(1)
  const meta = DOCS.find((x) => x.id === doc)!
  const saved = (d.docSettings as Record<string, { paper?: string }>)[doc]?.paper
  const [paper, setPaper] = useState(saved ?? meta.papers[0]); const [busy, setBusy] = useState(false)
  const opts: DocOpts = { ...DEF, ...(d.docSettings[doc] ?? {}), hide: d.docSettings[doc]?.hide ?? [] }
  const label = doc === 'post' ? <PostLabel o={o} s={s} opts={opts} paper={paper} /> : <CourierLabel o={o} s={s} opts={opts} />
  useEffect(() => { if (!open) return; const fit = () => { const sh = area.current?.querySelector<HTMLElement>('.doc-sheet'); const W = (box.current?.clientWidth ?? 0) - 32; const H = (box.current ? Math.min(window.innerHeight * 0.58, 99999) : 0) - 32; if (sh && W > 0) setZoom(Math.min(1, W / sh.offsetWidth, H / sh.offsetHeight)) }; const t = setTimeout(fit, 30); window.addEventListener('resize', fit); return () => { clearTimeout(t); window.removeEventListener('resize', fit) } }, [open, paper, doc])
  const copies = d.printLog.filter((y) => y.doc === doc && y.ref === s.id).length
  const cancelled = s.status === 'ship.cancelled'
  const sheets = () => [...(area.current?.querySelectorAll<HTMLElement>('.doc-sheet') ?? [])].map((el) => ({ el, paper: paperKey(paper) }))
  const log = () => mutate((x) => { x.printLog.unshift({ id: `PL-${Date.now().toString(36).slice(-5).toUpperCase()}`, doc, label: meta.label, ref: s.id, by: currentUser()?.name ?? 'کارشناس', at: new Date().toISOString(), copy: copies + 1, paper }) }, { action: 'چاپ سند', target: `${meta.label} · ${s.id}${copies ? ' (نسخهٔ دوم)' : ''}` })
  const print = () => {
    if (cancelled) return toast('این مرسوله لغو شده است و برچسب برای آن چاپ نمی‌شود.', { tone: 'err' })
    if (s0.simulate === 'fail') return toast('چاپگر در دسترس نیست. اتصال چاپگر را بررسی کنید یا «دانلود PDF» را بزنید.', { tone: 'err' })
    log(); printPages(sheets()).then((ok) => { if (!ok) toast('مرورگر پنجرهٔ چاپ را باز نکرد. «دانلود PDF» را بزنید و فایل را چاپ کنید.', { tone: 'err' }) })
  }
  const pdf = async () => {
    if (cancelled) return toast('این مرسوله لغو شده است و برچسب برای آن چاپ نمی‌شود.', { tone: 'err' })
    setBusy(true); try { saveBlob(await toPdf(sheets()), `ghanimat-${doc}-${s.id}.pdf`); toast(`PDF در اندازهٔ ${PAPERS[paperKey(paper)]?.label ?? paper} ساخته شد.`) } catch (e) { toast(`ساخت PDF ناموفق بود: ${(e as Error).message}`, { tone: 'err' }) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} wide title={<span className="flex items-center gap-1.5"><Printer size={16} />{doc === 'post' ? 'برچسب پستی' : 'برچسب پیک'} · <span className="ltr font-mono">{s.id}</span></span>}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <Button variant="ghost" icon={<ExternalLink size={14} />} onClick={() => { onClose(); nav(`/admin/print?doc=${doc}&ship=${s.id}`) }}>باز کردن در مرکز چاپ</Button>
        <span className="mr-auto flex gap-2"><Button icon={<Download size={14} />} loading={busy} onClick={() => void pdf()}>دانلود PDF</Button><Button variant="primary" icon={<Printer size={14} />} onClick={print}>چاپ</Button></span>
      </div>}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-12">
          <span className="text-t2">کاغذ:</span>
          {[...new Set([...meta.papers, ...(doc === 'post' ? ['A6', '100x150'] : ['100x100', 'A6'])])].map((k) => <button key={k} type="button" aria-pressed={paper === k} onClick={() => setPaper(k)} className={cx('rounded-full border px-2.5 py-1 transition-colors', paper === k ? 'border-brand bg-brand-tint font-semibold text-brand' : 'border-line hover:border-brand/50')}>{PAPERS[paperKey(k)]?.label ?? k}</button>)}
          <span className="mr-auto text-11 text-t3">{copies ? `${fa(copies)} بار چاپ شده` : 'هنوز چاپ نشده'}</span>
        </div>
        {cancelled && <p className="rounded-lg bg-danger-bg px-3 py-2 text-12 text-danger">این مرسوله لغو شده است؛ چاپ برچسب مسدود است.</p>}
        {/* پیش‌نمایش کوچک‌شده برای دیدن کل برچسب؛ نسخهٔ اندازهٔ واقعی برای چاپ و PDF بیرون از دید ساخته می‌شود */}
        <div ref={box} className="grid max-h-[58vh] place-items-center overflow-auto rounded-xl border border-line bg-neutral-bg p-4">
          <div aria-hidden className="pointer-events-none" style={{ zoom }}>{label}</div>
        </div>
        <div ref={area} aria-hidden className="pointer-events-none fixed top-0 -left-[9999px] opacity-0">{label}</div>
        <p className="text-11 text-t3">قالب، لوگو و فیلدها از «مرکز چاپ › ویرایش قالب» می‌آیند. برای تغییر قالب یا چاپ گروهی، «باز کردن در مرکز چاپ» را بزنید.</p>
      </div>
    </Modal>
  )
}
