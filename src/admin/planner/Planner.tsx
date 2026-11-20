import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Home as HomeIcon, Link2, MessageSquare, NotebookPen, Pin, Plus, RefreshCw, Repeat, Send, Share2, Sparkles, Trash2, Video } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { currentUser, fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { addDays, CH_LABEL, COLORS, dayKey, fromLocalInput, meetLink, nextRepeat, onHome, parseQuick, toLocalInput, visibleTo, type Channel, type PNote } from '@/shared/data/planner'
import type { DB } from '@/shared/data/seed'
import { useTab } from '../pages/_shared'

const uid = () => `PN-${Date.now().toString(36).slice(-6).toUpperCase()}`
const time = (iso: string) => new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
const dayName = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })
const KIND: Record<PNote['kind'], string> = { task: 'کار', event: 'جلسه یا رویداد', note: 'یادداشت' }
const REPEAT: Record<NonNullable<PNote['repeat']>, string> = { daily: 'هر روز', weekly: 'هر هفته', monthly: 'هر ماه' }
const blank = (owner: string, due?: string): PNote => ({ id: '', owner, kind: due ? 'task' : 'note', title: '', due, createdAt: new Date().toISOString() })

/** یادداشت‌ها و کارهایی که کاربر فعلی می‌بیند */
function useMine() { const d = useDB(); const me = currentUser(); const id = me?.id ?? 'u1'; return { d, me, id, list: (d.planner?.notes ?? []).filter((n) => visibleTo(n, id)) } }

/** ثبت یا به‌روزرسانی یک یادداشت */
export function saveNote(n: PNote, msg = 'ذخیره شد.') {
  const isNew = !n.id; const id = n.id || uid()
  mutate((x) => { x.planner = x.planner ?? { notes: [], google: { connected: false, calendar: '', twoWay: false, meetDefault: false }, defaults: { before: 30, ch: ['panel'], digest: { on: false, at: '08:00', ch: ['telegram'] } } }
    const g = x.planner.google; const next = { ...n, id, updatedAt: new Date().toISOString(), gcal: n.gcal?.on ? { ...n.gcal, synced: g.connected ? new Date().toISOString() : n.gcal.synced } : n.gcal }
    const i = x.planner.notes.findIndex((y) => y.id === id); if (i >= 0) x.planner.notes[i] = next; else x.planner.notes.unshift(next) }, { action: isNew ? 'ثبت یادداشت یا کار' : 'ویرایش یادداشت یا کار', target: n.title })
  toast(msg); return id
}
export function toggleDone(n: PNote) {
  mutate((x) => { const y = x.planner.notes.find((q) => q.id === n.id); if (!y) return
    if (!y.done && y.repeat && y.due) { // کار تکرارشونده: نوبت بعدی ساخته می‌شود
      y.due = nextRepeat(y.due, y.repeat); if (y.remind) y.remind = { ...y.remind, at: nextRepeat(y.remind.at, y.repeat), sent: undefined }; return }
    y.done = !y.done; y.doneAt = y.done ? new Date().toISOString() : undefined }, { action: n.done ? 'بازگرداندن کار' : 'انجام کار', target: n.title })
  if (!n.done) toast(n.repeat ? `انجام شد؛ نوبت بعدی ${REPEAT[n.repeat]} در برنامه است.` : 'انجام شد.')
}

/** موتور یادآوری: هر نیم دقیقه یادآوری‌های سررسیده را با اعلان پنل، پیامک یا ربات تلگرام می‌فرستد */
export function useReminders() {
  const d = useDB(); const me = currentUser()
  useEffect(() => { const tick = () => { const now = Date.now(); const due = (d.planner?.notes ?? []).filter((n) => me && visibleTo(n, me.id) && n.remind && !n.remind.sent && !n.done && +new Date(n.remind.at) <= now); if (!due.length) return
    mutate((x) => { due.forEach((n) => { const y = x.planner.notes.find((q) => q.id === n.id); if (!y?.remind) return; const at = new Date().toISOString()
      const text = `یادآوری غنیمت: ${y.title}${y.due ? ` · ${time(y.due)}` : ''}${y.gcal?.meet ? ` · لینک جلسه: ${y.gcal.meet}` : ''}`
      if (y.remind.ch.includes('panel')) x.alerts.unshift({ id: `al-pn-${y.id}-${now}`, cat: 'یادآوری', tone: 'info', title: `یادآوری: ${y.title}`, body: y.body?.split('\n')[0] ?? (y.due ? `سررسید ${time(y.due)}` : ''), to: `/admin/planner?note=${y.id}`, at, read: false })
      if (y.remind.ch.includes('sms')) x.smsLog.unshift({ id: `sm-pn-${y.id}-${now}`, to: me!.phone ?? '', kind: 'یادآوری شخصی', ref: y.id, text, status: 'تحویل شد', at })
      if (y.remind.ch.includes('telegram') && x.remote) x.remote.log.unshift({ id: `rm-pn-${y.id}-${now}`, ch: 'تلگرام', dir: 'out', to: me!.name, text, at, ok: true })
      y.remind.sent = at }) }, { action: 'ارسال یادآوری', target: due.map((n) => n.title).join('، ') })
    due.forEach((n) => toast(`یادآوری: ${n.title}${n.remind!.ch.length > 1 ? ` · ارسال با ${n.remind!.ch.map((c) => CH_LABEL[c]).join('، ')}` : ''}`)) }
    tick(); const t = setInterval(tick, 30000); return () => clearInterval(t) }, [d.planner, me])
}

/** کارت بالای صفحهٔ خانه: یادداشت‌ها و کارهای امروز، عقب‌افتاده‌ها و یادداشت سریع */
export function HomeNotes() {
  const { list, id } = useMine(); const nav = useNavigate(); const [q, setQ] = useState(''); const [edit, setEdit] = useState<PNote | null>(null)
  const items = list.filter((n) => onHome(n)).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
  const add = () => { if (!q.trim()) return; const p = parseQuick(q); saveNote({ ...blank(id), title: p.title, kind: p.due ? 'task' : 'note', due: p.due, allDay: p.allDay, home: p.home || !p.due ? { from: dayKey(p.due ? new Date(p.due) : new Date()) } : undefined, remind: p.remind && p.due ? { at: p.due, ch: p.ch } : undefined }, p.due ? `برای ${dayName(p.due)}${p.allDay ? '' : ` ساعت ${time(p.due)}`} ثبت شد.` : 'یادداشت ثبت شد.'); setQ('') }
  return <Card title={<span className="flex items-center gap-1.5"><NotebookPen size={15} />یادداشت‌ها و کارهای امروز{items.length > 0 && <Badge>{fa(items.length)}</Badge>}</span>} actions={<button className="text-12 text-brand" onClick={() => nav('/admin/planner')}>همهٔ برنامه‌ها</button>}>
    {items.length === 0 ? <p className="mb-3 text-12 text-t2">برای امروز یادداشت یا کاری نیست.</p> : <ul className="mb-3 space-y-1.5">{items.map((n) => <NoteRow key={n.id} n={n} onOpen={() => setEdit(n)} compact />)}</ul>}
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}><Input className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: فردا ساعت ۱۰ تماس با یوسف، با تلگرام یادم بنداز" aria-label="یادداشت سریع" /><Button variant="primary" icon={<Plus size={14} />}>ثبت</Button></form>
    <NoteEditor n={edit} onClose={() => setEdit(null)} />
  </Card>
}

function NoteRow({ n, onOpen, compact }: { n: PNote; onOpen: () => void; compact?: boolean }) {
  const d = useDB(); const late = !n.done && n.due && n.kind !== 'note' && +new Date(n.due) < Date.now() && dayKey(n.due) < dayKey()
  const owner = d.team.find((u) => u.id === n.owner)?.name
  return <li className={cx('flex items-start gap-2.5 rounded-xl border p-2.5', n.done ? 'border-line/60 opacity-60' : late ? 'border-danger/40 bg-danger-bg/30' : 'border-line')} style={n.color ? { borderInlineStartWidth: 3, borderInlineStartColor: n.color } : undefined}>
    {n.kind !== 'note' ? <button type="button" aria-label={n.done ? `بازگرداندن ${n.title}` : `انجام شد: ${n.title}`} onClick={() => toggleDone(n)} className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors', n.done ? 'border-success bg-success-solid text-white' : 'border-line hover:border-brand')}>{n.done && <Check size={13} />}</button> : <NotebookPen size={15} className="mt-0.5 shrink-0 text-t3" />}
    <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right">
      <p className={cx('text-13 font-medium', n.done && 'line-through')}>{n.pinned && <Pin size={12} className="ml-1 inline text-brand" />}{n.title}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-11 text-t2">
        {n.due && <span className={late ? 'font-semibold text-danger' : ''}>{late ? 'عقب افتاده · ' : ''}{dayKey(n.due) === dayKey() ? 'امروز' : dayKey(n.due) === dayKey(addDays(new Date(), 1)) ? 'فردا' : dayName(n.due)}{!n.allDay && ` · ${time(n.due)}`}</span>}
        {n.remind && !n.done && <span className="inline-flex items-center gap-0.5"><Bell size={11} />{n.remind.sent ? 'ارسال شد' : n.remind.ch.map((c) => CH_LABEL[c]).join('، ')}</span>}
        {n.repeat && <span className="inline-flex items-center gap-0.5"><Repeat size={11} />{REPEAT[n.repeat]}</span>}
        {n.home && <span className="inline-flex items-center gap-0.5"><HomeIcon size={11} />خانه</span>}
        {n.gcal?.on && <span className="inline-flex items-center gap-0.5"><CalendarDays size={11} />تقویم گوگل</span>}
        {n.shared?.length ? <span className="inline-flex items-center gap-0.5"><Share2 size={11} />{owner && n.owner !== currentUser()?.id ? `از ${owner}` : 'مشترک'}</span> : null}
        {!compact && n.tags?.map((t) => <Badge key={t} dot={false}>{t}</Badge>)}
      </p>
    </button>
    {n.gcal?.meet && !n.done && <a href={n.gcal.meet} target="_blank" rel="noopener" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-line px-2 text-11 text-brand hover:border-brand"><Video size={12} />ورود به جلسه</a>}
    {n.link && !compact && <a href={`#${n.link.to}`} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-line px-2 text-11 text-t2 hover:text-brand"><Link2 size={12} />{n.link.label}</a>}
  </li>
}

/** ویرایش کامل یک یادداشت یا کار */
export function NoteEditor({ n, onClose }: { n: PNote | null; onClose: () => void }) {
  const d = useDB(); const me = currentUser(); const [f, setF] = useState<PNote | null>(n)
  useEffect(() => setF(n), [n])
  if (!f) return null
  const set = (p: Partial<PNote>) => setF({ ...f, ...p }); const mine = f.owner === (me?.id ?? 'u1'); const g = d.planner?.google
  const save = () => { if (!f.title.trim()) return toast('عنوان را بنویسید.', { tone: 'err' }); if (f.remind && !f.remind.ch.length) return toast('دست‌کم یک راه یادآوری انتخاب کنید.', { tone: 'err' }); saveNote(f, f.remind && !f.remind.sent ? `ذخیره شد؛ یادآوری ${dayName(f.remind.at)} ساعت ${time(f.remind.at)} با ${f.remind.ch.map((c) => CH_LABEL[c]).join('، ')}.` : 'ذخیره شد.'); onClose() }
  return <Modal open onClose={onClose} wide title={f.id ? 'ویرایش یادداشت یا کار' : 'یادداشت یا کار تازه'} footer={<>
    <Button variant="primary" onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button><span className="flex-1" />
    {f.id && mine && <Button variant="ghost" icon={<Trash2 size={14} />} onClick={async () => { if (!(await confirm({ title: 'حذف این یادداشت؟', body: f.title, danger: true, confirm: 'حذف' }))) return; mutate((x) => { x.planner.notes = x.planner.notes.filter((y) => y.id !== f.id) }, { action: 'حذف یادداشت', target: f.title }); toast('حذف شد.'); onClose() }}>حذف</Button>}</>}>
    <div className="space-y-4">
      {!mine && <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">این یادداشت را {d.team.find((u) => u.id === f.owner)?.name} با شما به اشتراک گذاشته است.</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="عنوان"><Input autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً تمدید هاست یا جلسه با یاسین" /></Field>
        <Field label="نوع"><Segmented value={f.kind} onChange={(v) => set({ kind: v as PNote['kind'] })} options={Object.entries(KIND) as [string, string][]} /></Field></div>
      <Field label="متن و جزئیات"><Textarea rows={4} value={f.body ?? ''} onChange={(e) => set({ body: e.target.value })} placeholder="هر نکته‌ای که نباید یادتان برود؛ هر خط یک مورد" /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={f.kind === 'note' ? 'تاریخ (اختیاری)' : 'زمان یا سررسید'}><Input type="datetime-local" value={toLocalInput(f.due)} onChange={(e) => set({ due: fromLocalInput(e.target.value) })} /></Field>
        <Field label="تکرار"><Select value={f.repeat ?? ''} onChange={(v) => set({ repeat: (v || undefined) as PNote['repeat'] })} options={[['', 'بدون تکرار'], ...Object.entries(REPEAT)] as [string, string][]} /></Field>
        <div className="flex items-end gap-3 pb-1.5"><Toggle on={!!f.pinned} onChange={(v) => set({ pinned: v })} text="سنجاق بالای فهرست" /></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-line p-3">
          <Toggle on={!!f.home} onChange={(v) => set({ home: v ? { from: dayKey(f.due ?? addDays(new Date(), 1)) } : undefined })} text="بالای صفحهٔ خانه نمایش بده" />
          {f.home && <div className="grid grid-cols-2 gap-2"><Field label="از روز"><Input type="date" value={f.home.from} onChange={(e) => set({ home: { ...f.home!, from: e.target.value } })} /></Field><Field label="تا روز (اختیاری)"><Input type="date" value={f.home.until ?? ''} onChange={(e) => set({ home: { ...f.home!, until: e.target.value || undefined } })} /></Field>
            <div className="col-span-2 flex flex-wrap gap-1.5">{[['امروز', 0], ['فردا', 1], ['پس‌فردا', 2], ['هفتهٔ بعد', 7]].map(([l, n]) => <button key={l as string} type="button" onClick={() => set({ home: { from: dayKey(addDays(new Date(), n as number)) } })} className="h-7 rounded-full border border-line px-2.5 text-11 hover:border-brand hover:text-brand">{l}</button>)}</div></div>}
          <p className="text-11 text-t3">تا وقتی انجام نشده یا روز پایان نرسیده، در کارت «یادداشت‌ها و کارهای امروز» صفحهٔ خانه می‌ماند.</p>
        </div>
        <div className="space-y-2 rounded-xl border border-line p-3">
          <Toggle on={!!f.remind} onChange={(v) => set({ remind: v ? { at: f.due ? new Date(+new Date(f.due) - (d.planner?.defaults.before ?? 30) * 6e4).toISOString() : new Date(Date.now() + 36e5).toISOString(), ch: d.planner?.defaults.ch ?? ['panel'] } : undefined })} text="یادآوری بفرست" />
          {f.remind && <><Field label="زمان یادآوری"><Input type="datetime-local" value={toLocalInput(f.remind.at)} onChange={(e) => set({ remind: { ...f.remind!, at: fromLocalInput(e.target.value) ?? f.remind!.at, sent: undefined } })} /></Field>
            {f.due && <div className="flex flex-wrap gap-1.5">{[['سر وقت', 0], ['۱۵ دقیقه قبل', 15], ['۱ ساعت قبل', 60], ['یک روز قبل', 1440]].map(([l, m]) => <button key={l as string} type="button" onClick={() => set({ remind: { ...f.remind!, at: new Date(+new Date(f.due!) - (m as number) * 6e4).toISOString(), sent: undefined } })} className="h-7 rounded-full border border-line px-2.5 text-11 hover:border-brand hover:text-brand">{l}</button>)}</div>}
            <div className="flex flex-wrap gap-3">{(Object.keys(CH_LABEL) as Channel[]).map((c) => <Toggle key={c} on={f.remind!.ch.includes(c)} onChange={(v) => set({ remind: { ...f.remind!, ch: v ? [...f.remind!.ch, c] : f.remind!.ch.filter((x) => x !== c) } })} text={CH_LABEL[c]} />)}</div>
            {f.remind.sent && <p className="text-11 text-success">ارسال شد {rel(f.remind.sent)}. با تغییر زمان، دوباره فرستاده می‌شود.</p>}</>}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-line p-3">
          <Toggle on={!!f.gcal?.on} onChange={(v) => set({ gcal: v ? { on: true, meet: f.gcal?.meet ?? (g?.meetDefault && f.kind === 'event' ? meetLink() : undefined) } : undefined })} text="در تقویم گوگل هم ثبت شود" />
          {f.gcal?.on && <div className="flex flex-wrap items-center gap-2 text-12">{f.gcal.meet ? <><a href={f.gcal.meet} target="_blank" rel="noopener" className="font-mono text-11 text-brand underline" dir="ltr">{f.gcal.meet}</a><Button size="sm" variant="ghost" onClick={() => set({ gcal: { ...f.gcal!, meet: undefined } })}>حذف لینک</Button></> : <Button size="sm" icon={<Video size={13} />} onClick={() => set({ gcal: { ...f.gcal!, meet: meetLink() } })}>ساخت لینک گوگل میت</Button>}
            {!g?.connected && <span className="text-11 text-warning">تقویم گوگل هنوز وصل نیست؛ از تب «اتصال‌ها» وصل کنید.</span>}</div>}
        </div>
        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-12 font-medium">اشتراک با همکار</p>
          <div className="flex flex-wrap gap-1.5">{d.team.filter((u) => u.id !== f.owner).map((u) => { const on = !!f.shared?.includes(u.id); return <button key={u.id} type="button" disabled={!mine} onClick={() => set({ shared: on ? f.shared!.filter((x) => x !== u.id) : [...(f.shared ?? []), u.id] })} className={cx('h-7 rounded-full border px-2.5 text-11 disabled:opacity-60', on ? 'border-brand bg-brand-tint text-brand' : 'border-line hover:border-brand')}>{on && <Check size={11} className="ml-0.5 inline" />}{u.name}</button> })}</div>
          <p className="text-11 text-t3">یادداشت‌ها به‌طور پیش‌فرض فقط برای خودتان است؛ همکار انتخاب‌شده هم می‌بیند و یادآوری را می‌گیرد.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-12 text-t2">رنگ</span>{COLORS.map((c) => <button key={c} type="button" aria-label={`رنگ ${c}`} onClick={() => set({ color: f.color === c ? undefined : c })} className={cx('size-6 rounded-full border-2', f.color === c ? 'border-t1' : 'border-transparent')} style={{ background: c }} />)}
        <span className="mr-3 text-12 text-t2">برچسب‌ها</span><Input className="h-8 w-56 text-12" value={(f.tags ?? []).join('، ')} onChange={(e) => set({ tags: e.target.value.split(/[،,]/).map((t) => t.trim()).filter(Boolean) })} placeholder="مثلاً حقوقی، انبار" /></div>
    </div>
  </Modal>
}

/** یادداشت و برنامه‌ریزی */
export function Planner() {
  const { d, list, id } = useMine(); const [tab, setTab] = useTab('agenda'); const [sp] = useSearchParams(); const [edit, setEdit] = useState<PNote | null>(null); const [q, setQ] = useState('')
  useEffect(() => { const k = sp.get('note'); const n = k && list.find((x) => x.id === k); if (n) setEdit(n) }, [sp.get('note')]) // eslint-disable-line react-hooks/exhaustive-deps
  const preview = q.trim() ? parseQuick(q) : null
  const add = () => { if (!preview) return; saveNote({ ...blank(id), title: preview.title, kind: preview.due ? (/(جلسه|میت|ملاقات)/.test(preview.title) ? 'event' : 'task') : 'note', due: preview.due, allDay: preview.allDay, home: preview.home ? { from: dayKey(preview.due ? new Date(preview.due) : new Date()) } : undefined, remind: preview.remind && preview.due ? { at: preview.due, ch: preview.ch } : undefined }, 'ثبت شد.'); setQ('') }
  const open = list.filter((n) => !n.done)
  return <Page module="planner" title="یادداشت و برنامه‌ریزی" sub="کارها، جلسه‌ها و نکته‌هایی که نباید از یاد بروند؛ با نمایش در صفحهٔ خانه و یادآوری با پیامک یا ربات تلگرام"
    primary={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setEdit(blank(id, new Date(Date.now() + 36e5).toISOString()))}>کار یا یادداشت تازه</Button>}
    tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'agenda', label: 'امروز و پیش رو', count: open.filter((n) => n.kind !== 'note').length }, { id: 'calendar', label: 'تقویم' }, { id: 'notes', label: 'یادداشت‌ها', count: list.filter((n) => n.kind === 'note').length }, { id: 'connect', label: 'اتصال‌ها و یادآوری' }]} />}>
    <div className="space-y-4">
      {tab !== 'connect' && <Card>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); add() }}><Input className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="هر طور راحتید بنویسید: «پنج‌شنبه ساعت ۱۶ جلسه با عکاس» یا «فردا بالای صفحهٔ اصلی نشون بده: پرداخت قسط اجاره»" aria-label="ثبت سریع" /><Button variant="primary" icon={<Plus size={14} />} disabled={!preview}>ثبت</Button></form>
        {preview ? <p className="mt-2 flex flex-wrap items-center gap-1.5 text-12 text-t2"><Sparkles size={13} className="text-brand" />برداشت من: <b className="text-t1">«{preview.title}»</b>{preview.due ? <Badge tone="info">{dayName(preview.due)}{!preview.allDay && ` · ${time(preview.due)}`}</Badge> : <Badge dot={false}>بدون تاریخ (یادداشت)</Badge>}{preview.remind && preview.due && <Badge tone="warning">یادآوری با {preview.ch.map((c) => CH_LABEL[c]).join('، ')}</Badge>}{preview.home && <Badge tone="success">نمایش در خانه</Badge>}</p>
          : <p className="mt-2 text-11 text-t3">«امروز، فردا، پس‌فردا، شنبه تا جمعه، ۳ روز دیگه، ساعت ۱۰، عصر»، «با پیامک»، «با تلگرام»، «یادم بنداز» و «بالای صفحهٔ اصلی» را خودش می‌فهمد. برای جزئیات بیشتر «کار یا یادداشت تازه» را بزنید.</p>}
      </Card>}
      {tab === 'agenda' && <Agenda list={list} onOpen={setEdit} />}
      {tab === 'calendar' && <MonthCal list={list} onOpen={setEdit} onDay={(k) => { const x = new Date(`${k}T10:00`); setEdit(blank(id, x.toISOString())) }} />}
      {tab === 'notes' && <NotesBoard list={list} onOpen={setEdit} />}
      {tab === 'connect' && <Connect d={d} />}
    </div>
    <NoteEditor n={edit} onClose={() => setEdit(null)} />
  </Page>
}

function Agenda({ list, onOpen }: { list: PNote[]; onOpen: (n: PNote) => void }) {
  const [showDone, setShowDone] = useState(false); const t = dayKey(); const tm = dayKey(addDays(new Date(), 1)); const wk = dayKey(addDays(new Date(), 7))
  const act = list.filter((n) => !n.done && (n.kind !== 'note' || n.due)).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
  const groups: [string, PNote[], string?][] = [
    ['عقب افتاده', act.filter((n) => n.due && dayKey(n.due) < t), 'danger'], ['امروز', act.filter((n) => n.due && dayKey(n.due) === t)], ['فردا', act.filter((n) => n.due && dayKey(n.due) === tm)],
    ['این هفته', act.filter((n) => n.due && dayKey(n.due) > tm && dayKey(n.due) <= wk)], ['بعداً', act.filter((n) => n.due && dayKey(n.due) > wk)], ['بدون تاریخ', act.filter((n) => !n.due)]]
  const done = list.filter((n) => n.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  return <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
    <div className="space-y-4">{groups.filter(([, L]) => L.length).map(([title, L, tone]) => <Card key={title} title={<span className={cx('flex items-center gap-2', tone === 'danger' && 'text-danger')}>{title}<Badge tone={tone === 'danger' ? 'danger' : 'neutral'}>{fa(L.length)}</Badge></span>}><ul className="space-y-1.5">{L.map((n) => <NoteRow key={n.id} n={n} onOpen={() => onOpen(n)} />)}</ul></Card>)}
      {groups.every(([, L]) => !L.length) && <Card><p className="text-13 text-t2">کار بازی نیست. با کادر بالا اولین کار یا یادآوری را بنویسید.</p></Card>}
      {done.length > 0 && <Card title={<button className="flex items-center gap-2" onClick={() => setShowDone(!showDone)}>انجام‌شده‌ها<Badge tone="success">{fa(done.length)}</Badge><ChevronLeft size={14} className={cx('transition-transform', showDone && '-rotate-90')} /></button>}>{showDone ? <ul className="space-y-1.5">{done.map((n) => <NoteRow key={n.id} n={n} onOpen={() => onOpen(n)} />)}</ul> : <p className="text-12 text-t3">برای دیدن، روی عنوان بزنید.</p>}</Card>}
    </div>
    <aside className="space-y-4">
      <Card title="یادآوری‌های پیش رو">{(() => { const R = list.filter((n) => n.remind && !n.remind.sent && !n.done).sort((a, b) => a.remind!.at.localeCompare(b.remind!.at)).slice(0, 6); return R.length ? <ul className="space-y-2 text-12">{R.map((n) => <li key={n.id}><button className="w-full text-right" onClick={() => onOpen(n)}><p className="font-medium">{n.title}</p><p className="text-11 text-t2">{dayName(n.remind!.at)} · {time(n.remind!.at)} · {n.remind!.ch.map((c) => CH_LABEL[c]).join('، ')}</p></button></li>)}</ul> : <p className="text-12 text-t2">یادآوری فعالی نیست.</p> })()}</Card>
      <Card title="در صفحهٔ خانه">{(() => { const H = list.filter((n) => onHome(n)); return H.length ? <ul className="space-y-1 text-12">{H.map((n) => <li key={n.id} className="flex items-center gap-1.5"><HomeIcon size={12} className="text-t3" />{n.title}</li>)}</ul> : <p className="text-12 text-t2">امروز چیزی در خانه نمایش داده نمی‌شود.</p> })()}</Card>
    </aside>
  </div>
}

function MonthCal({ list, onOpen, onDay }: { list: PNote[]; onOpen: (n: PNote) => void; onDay: (k: string) => void }) {
  const [off, setOff] = useState(0)
  const jd = (x: Date) => { const p = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(x); const g = (t: string) => +(p.find((y) => y.type === t)?.value ?? 0); return { y: g('year'), m: g('month'), d: g('day') } }
  const { days, title } = useMemo(() => {
    const base = new Date(); base.setHours(12, 0, 0, 0); let ref = new Date(base); const target = jd(base); let ym = target.y * 12 + target.m - 1 + off
    // رفتن به روز اول ماه هدف
    ref = addDays(ref, off * 30); let guard = 0; while ((jd(ref).y * 12 + jd(ref).m - 1) !== ym && guard++ < 70) ref = addDays(ref, (jd(ref).y * 12 + jd(ref).m - 1) < ym ? 1 : -1)
    while (jd(ref).d !== 1) ref = addDays(ref, -1)
    const first = new Date(ref); const lead = (first.getDay() + 1) % 7 // شنبه = ستون اول
    const out: { date: Date; inMonth: boolean }[] = []; let cur = addDays(first, -lead)
    for (let i = 0; i < 42; i++) { out.push({ date: cur, inMonth: (jd(cur).y * 12 + jd(cur).m - 1) === ym }); cur = addDays(cur, 1) }
    ym = ym + 0; return { days: out, title: first.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }) }
  }, [off])
  const today = dayKey()
  return <Card title={<span className="flex items-center gap-2"><CalendarDays size={15} />{title}</span>} actions={<span className="flex items-center gap-1"><Button size="sm" variant="ghost" icon={<ChevronRight size={14} />} onClick={() => setOff(off - 1)} aria-label="ماه قبل" /><Button size="sm" variant="ghost" onClick={() => setOff(0)}>امروز</Button><Button size="sm" variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => setOff(off + 1)} aria-label="ماه بعد" /></span>} pad={false}>
    <div className="grid grid-cols-7 border-b border-line text-center text-11 text-t2">{['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map((w) => <div key={w} className="py-2">{w}</div>)}</div>
    <div className="grid grid-cols-7">{days.map(({ date, inMonth }) => { const k = dayKey(date); const L = list.filter((n) => n.due && dayKey(n.due) === k); return <div key={k} className={cx('group min-h-24 border-b border-l border-line/70 p-1.5 text-right', !inMonth && 'bg-neutral-bg/40 text-t3', k === today && 'bg-brand-tint/40')}>
      <div className="flex items-center justify-between"><span className={cx('grid size-6 place-items-center rounded-full text-12', k === today && 'bg-brand-solid font-bold text-white')}>{fa(jd(date).d)}</span><button type="button" aria-label={`افزودن در ${date.toLocaleDateString('fa-IR')}`} onClick={() => onDay(k)} className="grid size-5 place-items-center rounded text-t3 opacity-0 hover:bg-neutral-bg hover:text-brand group-hover:opacity-100 focus:opacity-100"><Plus size={12} /></button></div>
      <ul className="mt-1 space-y-0.5">{L.slice(0, 3).map((n) => <li key={n.id}><button type="button" onClick={() => onOpen(n)} className={cx('w-full truncate rounded px-1 py-0.5 text-right text-[11px]', n.done ? 'text-t3 line-through' : 'bg-brand-tint/60 text-brand')} style={n.color && !n.done ? { background: `${n.color}1a`, color: n.color } : undefined}>{!n.allDay && `${time(n.due!)} `}{n.title}</button></li>)}{L.length > 3 && <li className="text-[10px] text-t3">+{fa(L.length - 3)} مورد دیگر</li>}</ul>
    </div> })}</div>
  </Card>
}

function NotesBoard({ list, onOpen }: { list: PNote[]; onOpen: (n: PNote) => void }) {
  const [tag, setTag] = useState(''); const notes = list.filter((n) => n.kind === 'note' && (!tag || n.tags?.includes(tag))).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  const tags = [...new Set(list.flatMap((n) => n.tags ?? []))]
  return <div className="space-y-3">
    {tags.length > 0 && <div className="flex flex-wrap gap-1.5">{['', ...tags].map((t) => <button key={t || 'all'} onClick={() => setTag(t)} className={cx('h-7 rounded-full border px-3 text-12', tag === t ? 'border-brand bg-brand-tint text-brand' : 'border-line hover:border-brand')}>{t || 'همه'}</button>)}</div>}
    {notes.length === 0 ? <Card><p className="text-13 text-t2">یادداشتی نیست.</p></Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{notes.map((n) => <button key={n.id} onClick={() => onOpen(n)} className="lift rounded-2xl border border-line bg-surface p-4 text-right hover:border-brand/40" style={n.color ? { borderTopWidth: 4, borderTopColor: n.color } : undefined}>
      <p className="flex items-center gap-1.5 text-14 font-semibold">{n.pinned && <Pin size={13} className="text-brand" />}{n.title}</p>
      {n.body && <p className="mt-2 line-clamp-6 whitespace-pre-line text-12 leading-6 text-t2">{n.body}</p>}
      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-11 text-t3">{n.tags?.map((t) => <Badge key={t} dot={false}>{t}</Badge>)}{n.home && <span className="inline-flex items-center gap-0.5"><HomeIcon size={11} />خانه</span>}{n.shared?.length ? <span className="inline-flex items-center gap-0.5"><Share2 size={11} />مشترک</span> : null}<span className="flex-1" />{rel(n.updatedAt ?? n.createdAt)}</p>
    </button>)}</div>}
  </div>
}

function Connect({ d }: { d: DB }) {
  const P = d.planner; const g = P.google; const me = currentUser(); const [busy, setBusy] = useState(false)
  const up = (fn: (x: DB) => void, action: string) => mutate(fn, { action, target: 'یادداشت و برنامه‌ریزی' })
  const tg = d.remote?.telegram; const myChat = tg?.chats.find((c) => c.name === me?.name)
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title={<span className="flex items-center gap-2"><CalendarDays size={15} />تقویم گوگل و گوگل میت</span>} actions={<Badge tone={g.connected ? 'success' : 'neutral'}>{g.connected ? 'وصل' : 'وصل نیست'}</Badge>}>
      {g.connected ? <div className="space-y-3 text-12">
        <p>حساب: <b>{g.account}</b> · تقویم: <b>{g.calendar}</b>{g.lastSync && <span className="text-t2"> · آخرین همگام‌سازی {rel(g.lastSync)}</span>}</p>
        <Toggle on={g.twoWay} onChange={(v) => up((x) => { x.planner.google.twoWay = v }, 'همگام‌سازی دوطرفه با تقویم گوگل')} text="همگام‌سازی دوطرفه (جلسه‌ای که در گوگل بسازید هم این‌جا می‌آید)" />
        <Toggle on={g.meetDefault} onChange={(v) => up((x) => { x.planner.google.meetDefault = v }, 'لینک خودکار گوگل میت')} text="برای هر جلسهٔ تازه خودکار لینک گوگل میت بساز" />
        <div className="flex flex-wrap gap-2"><Button size="sm" icon={<RefreshCw size={13} />} loading={busy} onClick={async () => { setBusy(true); try { await fakeCall(true, 900); up((x) => { x.planner.google.lastSync = new Date().toISOString(); x.planner.notes.forEach((n) => { if (n.gcal?.on) n.gcal.synced = new Date().toISOString() }) }, 'همگام‌سازی تقویم گوگل'); toast('با تقویم گوگل همگام شد.') } catch { toast('گوگل پاسخ نداد؛ دوباره تلاش کنید. یادآوری‌های پیامک و تلگرام بدون گوگل هم کار می‌کنند.', { tone: 'err' }) } setBusy(false) }}>همگام‌سازی همین حالا</Button><Button size="sm" variant="ghost" onClick={() => up((x) => { x.planner.google.connected = false }, 'قطع اتصال تقویم گوگل')}>قطع اتصال</Button></div>
      </div> : <div className="space-y-3 text-12"><p className="text-t2">با اتصال، کار و جلسه‌هایی که «ثبت در تقویم گوگل» دارند در تقویم شما هم می‌نشینند و جلسه‌ها لینک گوگل میت می‌گیرند.</p><Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await fakeCall(true, 1100); up((x) => { Object.assign(x.planner.google, { connected: true, account: 'تقویم کاری غنیمت', calendar: x.planner.google.calendar || 'غنیمت · جلسه‌ها و سررسیدها', lastSync: new Date().toISOString() }) }, 'اتصال تقویم گوگل'); toast('تقویم گوگل وصل شد.') } catch { toast('اتصال انجام نشد؛ دوباره تلاش کنید.', { tone: 'err' }) } setBusy(false) }}>اتصال حساب گوگل</Button></div>}
      <p className="mt-3 rounded-lg bg-neutral-bg px-3 py-2 text-11 text-t2">اگر دسترسی به سرویس‌های گوگل مختل شود، تقویم همین پنل منبع اصلی می‌ماند و یادآوری‌ها از پیامک و ربات تلگرام بدون وقفه می‌رسند؛ با برگشت اتصال، همگام‌سازی خودکار ادامه پیدا می‌کند.</p>
    </Card>
    <Card title={<span className="flex items-center gap-2"><Bell size={15} />راه‌های یادآوری</span>}>
      <ul className="space-y-3 text-12">
        <li className="flex items-start gap-2"><Bell size={15} className="mt-0.5 text-brand" /><span className="flex-1"><b>اعلان پنل</b><span className="block text-t2">در زنگولهٔ بالای پنل، با لینک مستقیم به همان کار.</span></span><Badge tone="success">فعال</Badge></li>
        <li className="flex items-start gap-2"><MessageSquare size={15} className="mt-0.5 text-brand" /><span className="flex-1"><b>پیامک</b><span className="block text-t2">به شمارهٔ ثبت‌شدهٔ شما در «تیم و دسترسی»، از خط {d.remote?.sms.line ?? 'خدماتی'}.</span></span><Badge tone={d.remote?.sms.on ? 'success' : 'neutral'}>{d.remote?.sms.on ? 'فعال' : 'خاموش'}</Badge></li>
        <li className="flex items-start gap-2"><Send size={15} className="mt-0.5 text-brand" /><span className="flex-1"><b>ربات تلگرام</b><span className="block text-t2">{tg ? <>از <bdi dir="ltr">{tg.bot}</bdi>{myChat ? ` به گفتگوی «${myChat.name}»` : '؛ گفتگوی شما هنوز به ربات وصل نیست. از «ربات تلگرام و فرمان پیامکی» وصل کنید.'}</> : 'ربات تنظیم نشده است.'}</span></span><Badge tone={tg?.on && myChat ? 'success' : 'warning'}>{tg?.on && myChat ? 'فعال' : 'نیاز به اتصال'}</Badge></li>
      </ul>
      <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
        <Field label="یادآوری پیش‌فرض (دقیقه قبل از زمان کار)"><Input inputMode="numeric" className="ltr text-left" value={String(P.defaults.before)} onChange={(e) => up((x) => { x.planner.defaults.before = +e.target.value.replace(/\D/g, '') || 0 }, 'تغییر یادآوری پیش‌فرض')} /></Field>
        <div className="space-y-1.5"><p className="text-12 text-t2">راه پیش‌فرض</p><div className="flex flex-wrap gap-3">{(Object.keys(CH_LABEL) as Channel[]).map((c) => <Toggle key={c} on={P.defaults.ch.includes(c)} onChange={(v) => up((x) => { x.planner.defaults.ch = v ? [...x.planner.defaults.ch, c] : x.planner.defaults.ch.filter((y) => y !== c) }, 'تغییر راه پیش‌فرض یادآوری')} text={CH_LABEL[c]} />)}</div></div>
      </div>
      <div className="mt-3 space-y-2 border-t border-line pt-3">
        <Toggle on={P.defaults.digest.on} onChange={(v) => up((x) => { x.planner.defaults.digest.on = v }, 'خلاصهٔ صبحگاهی')} text="خلاصهٔ صبحگاهی کارهای امروز" />
        {P.defaults.digest.on && <div className="flex flex-wrap items-center gap-3 text-12"><span>ساعت</span><Input className="h-8 w-20 ltr text-center" value={P.defaults.digest.at} onChange={(e) => up((x) => { x.planner.defaults.digest.at = e.target.value }, 'ساعت خلاصهٔ صبحگاهی')} />{(['telegram', 'sms'] as Channel[]).map((c) => <Toggle key={c} on={P.defaults.digest.ch.includes(c)} onChange={(v) => up((x) => { x.planner.defaults.digest.ch = v ? [...x.planner.defaults.digest.ch, c] : x.planner.defaults.digest.ch.filter((y) => y !== c) }, 'راه خلاصهٔ صبحگاهی')} text={CH_LABEL[c]} />)}</div>}
        <p className="text-11 text-t3">هر صبح فهرست کارهای امروز، جلسه‌ها با لینک میت و کارهای عقب‌افتاده در یک پیام فرستاده می‌شود.</p>
      </div>
    </Card>
  </div>
}
