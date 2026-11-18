// حالت بازبینی تیم طراحی: انتخاب هر بخش از پنل و ثبت نظر در Issues مخزن GitHub (جای مشترک همهٔ نظرها)
// در نسخهٔ تولید با VITE_REVIEW=off خاموش می‌شود.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Crosshair, ExternalLink, FileText, List, MessageSquarePlus, X } from 'lucide-react'
import { Button, copyText, cx, Field, Segmented, Select, Textarea } from './base'
import { Modal, toast } from './overlay'
import { effectiveRole, ROLES, useSession } from '@/shared/lib/store'

const REPO = 'https://github.com/Behshad79/Ghanimat'
const SITE = 'https://behshad79.github.io/Ghanimat/'
const LABEL = 'نظر طراحی'
const NAME_KEY = 'ghanimat-reviewer'
const TEAM = ['بهشاد', 'پارسا', 'نسترن', 'معصومه', 'بنیامین', 'زینب']
const KINDS = ['ایراد', 'پیشنهاد', 'سؤال', 'نگارش'] as const
const LEVELS = ['کم', 'متوسط', 'زیاد'] as const
export const REVIEW_LIST = `${REPO}/issues?q=${encodeURIComponent(`is:issue label:"${LABEL}"`)}`

type Picked = { text: string; trail: string[]; tag: string } | null
const UI = '[data-review-ui]'
const clean = (s: string, n = 90) => s.replace(/\s+/g, ' ').trim().slice(0, n)

/** توصیف قابل‌فهم یک عنصر: متن خودش و عنوان‌های بخش‌هایی که داخلشان است */
function describe(el: HTMLElement): NonNullable<Picked> {
  const own = clean(el.getAttribute('aria-label') || (el as HTMLInputElement).placeholder || el.getAttribute('alt') || el.innerText || el.textContent || '')
  const trail: string[] = []
  let e: HTMLElement | null = el
  while (e && trail.length < 4) {
    const h = Array.from(e.children).flatMap((c) => [c, ...Array.from(c.children)]).find((c) => /^H[1-3]$/.test(c.tagName)) as HTMLElement | undefined
    const t = h && clean(h.innerText, 60)
    if (t && !trail.includes(t) && t !== own) trail.unshift(t)
    e = e.parentElement
  }
  const tag = el.closest('button,a,input,select,textarea,[role=tab],[role=button]')?.tagName.toLowerCase() ?? el.tagName.toLowerCase()
  return { text: own, trail, tag: { button: 'دکمه', a: 'لینک', input: 'ورودی', select: 'انتخابگر', textarea: 'متن بلند', img: 'تصویر', h1: 'عنوان صفحه', h2: 'عنوان', h3: 'عنوان بخش', td: 'خانهٔ جدول', th: 'سرستون جدول' }[tag] ?? 'بخش' }
}

export function ReviewWidget() {
  const loc = useLocation(); const s = useSession()
  const [menu, setMenu] = useState(false); const [pick, setPick] = useState(false)
  const [box, setBox] = useState<DOMRect | null>(null); const [picked, setPicked] = useState<Picked>(null)
  const [open, setOpen] = useState(false)
  const last = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!pick) return
    const target = (x: number, y: number) => { const el = document.elementFromPoint(x, y) as HTMLElement | null; return el && !el.closest(UI) ? el : null }
    const move = (e: MouseEvent) => { const el = target(e.clientX, e.clientY); last.current = el; setBox(el ? el.getBoundingClientRect() : null) }
    const click = (e: MouseEvent) => { const el = target(e.clientX, e.clientY); if (!el) return; e.preventDefault(); e.stopPropagation(); setPicked(describe(el)); setPick(false); setBox(null); setOpen(true) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPick(false); setBox(null) } }
    document.addEventListener('mousemove', move, true); document.addEventListener('click', click, true); document.addEventListener('keydown', key)
    document.body.style.cursor = 'crosshair'
    return () => { document.removeEventListener('mousemove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key); document.body.style.cursor = '' }
  }, [pick])

  const page = document.querySelector('main h1, h1')?.textContent?.trim() || 'صفحه'
  const path = `${loc.pathname}${loc.search}`

  return <div data-review-ui className="print:hidden">
    {pick && <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center p-3"><p className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#10123d] px-4 py-2 text-13 text-white shadow-float" data-review-ui><Crosshair size={16} />روی بخشی که نظر دارید کلیک کنید<button type="button" className="ms-2 rounded-full bg-white/15 px-2 py-0.5 text-12" onClick={() => { setPick(false); setBox(null) }}>انصراف (Esc)</button></p></div>
      {box && <div className="pointer-events-none fixed z-[89] rounded-md border-2 border-brand-solid bg-brand-solid/10 transition-all duration-75" style={{ top: box.top - 2, left: box.left - 2, width: box.width + 4, height: box.height + 4 }} />}
    </>}
    {!pick && !open && <div className="fixed bottom-4 left-4 z-[80] flex flex-col items-end gap-2">
      {menu && <div className="w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface text-13 shadow-float" role="menu">
        <p className="border-b border-line px-4 py-2.5 text-12 text-t2">نظر شما در بخش Issues مخزن GitHub ثبت می‌شود و همهٔ تیم می‌بینند.</p>
        <MItem icon={<Crosshair size={16} />} onClick={() => { setMenu(false); setPick(true) }}>انتخاب بخش و ثبت نظر</MItem>
        <MItem icon={<FileText size={16} />} onClick={() => { setMenu(false); setPicked(null); setOpen(true) }}>نظر کلی دربارهٔ این صفحه</MItem>
        <MItem icon={<List size={16} />} onClick={() => { setMenu(false); window.open(REVIEW_LIST, '_blank', 'noopener') }}>همهٔ نظرهای ثبت‌شده</MItem>
      </div>}
      <button type="button" aria-expanded={menu} onClick={() => setMenu((m) => !m)} aria-label="ثبت نظر" className="flex size-11 items-center justify-center gap-2 rounded-full bg-[#10123d] text-13 font-semibold text-white shadow-float hover:bg-[#1c1f4a] sm:w-auto sm:px-4">
        {menu ? <X size={18} /> : <MessageSquarePlus size={18} />}<span className="hidden sm:inline">ثبت نظر</span>
      </button>
    </div>}
    <ReviewForm open={open} onClose={() => setOpen(false)} picked={picked} page={page} path={path} role={ROLES[effectiveRole(s)]?.label ?? effectiveRole(s)} theme={s.theme} onRepick={() => { setOpen(false); setPick(true) }} />
  </div>
}

function MItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2.5 px-4 py-3 text-start hover:bg-neutral-bg">{icon}{children}</button>
}

function ReviewForm({ open, onClose, picked, page, path, role, theme, onRepick }: { open: boolean; onClose: () => void; picked: Picked; page: string; path: string; role: string; theme: string; onRepick: () => void }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } })
  const [kind, setKind] = useState<string>(KINDS[0]); const [level, setLevel] = useState<string>(LEVELS[1]); const [text, setText] = useState('')
  useEffect(() => { if (open) setText('') }, [open])
  const where = picked ? [...picked.trail, picked.text ? `${picked.tag} «${picked.text}»` : picked.tag].filter(Boolean).join(' › ') : 'کل صفحه'
  const title = `[نظر] ${kind} · ${page}${picked?.text ? ` · ${clean(picked.text, 40)}` : ''}`
  const body = [
    `**نوع:** ${kind}  ·  **اهمیت:** ${level}  ·  **از طرف:** ${name || '—'}`,
    '',
    `**صفحه:** ${page}`,
    `**بخش:** ${where}`,
    `**لینک مستقیم:** ${SITE}#${path}`,
    '',
    '### شرح',
    text.trim(),
    '',
    '### اسکرین‌شات',
    '<!-- اسکرین‌شات را با Ctrl+V یا کشیدن فایل همین‌جا بچسبانید -->',
    '',
    '---',
    `<sub>نقش: ${role} · تم: ${theme === 'dark' ? 'تیره' : 'روشن'} · صفحه‌نمایش: ${window.innerWidth}×${window.innerHeight} · ${new Date().toLocaleString('fa-IR')}</sub>`,
  ].join('\n')
  const ok = text.trim().length >= 5 && name.trim().length >= 2
  const send = () => {
    try { localStorage.setItem(NAME_KEY, name) } catch { /* بدون ذخیره */ }
    const url = `${REPO}/issues/new?template=ui-review.md&labels=${encodeURIComponent(LABEL)}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank', 'noopener'); onClose()
    toast('صفحهٔ GitHub باز شد. اگر اسکرین‌شات دارید بچسبانید و «Create» را بزنید.')
  }
  return <Modal open={open} onClose={onClose} title="ثبت نظر برای تیم"
    footer={<><Button variant="primary" icon={<ExternalLink size={16} />} disabled={!ok} onClick={send}>ثبت در GitHub</Button><Button disabled={!ok} onClick={() => { copyText(`${title}\n\n${body}`); toast('متن نظر کپی شد.') }}>کپی متن</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-4" data-review-ui>
      <div className="rounded-md bg-neutral-bg p-3 text-13"><p className="text-12 text-t2">{page}</p><p className="mt-0.5 font-semibold">{where}</p><button type="button" onClick={onRepick} className="mt-1 text-12 text-brand underline">انتخاب بخش دیگر</button></div>
      <Field label="نام شما"><Select value={name} onChange={setName} options={TEAM} other /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نوع نظر"><Segmented size="sm" value={kind} onChange={setKind} options={KINDS.map((k) => [k, k]) as [string, string][]} /></Field>
        <Field label="اهمیت"><Segmented size="sm" value={level} onChange={setLevel} options={LEVELS.map((k) => [k, k]) as [string, string][]} /></Field>
      </div>
      <Field label="شرح" help="چه چیزی مشکل دارد و پیشنهادتان چیست؟ هر نظر یک موضوع."><Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً عنوان کارت در موبایل دو خط می‌شود و دکمه پایین می‌رود؛ بهتر است…" /></Field>
      <p className={cx('text-12 text-t2')}>برای ثبت، یک حساب رایگان GitHub لازم است. صفحهٔ GitHub با همهٔ این اطلاعات پرشده باز می‌شود؛ فقط «Create» را بزنید.</p>
    </div>
  </Modal>
}
