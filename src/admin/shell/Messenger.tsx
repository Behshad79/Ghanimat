// پیام‌رسان درون‌تیمی: ویجت شناور گوشهٔ پنل، گفت‌وگوی دونفره و گروهی، فایل و عکس، پاسخ به پیام، واکنش، وضعیت خوانده‌شدن،
// لینک خودکار به سفارش و حواله و محموله، و اعلان کوچک وقتی پیام تازه می‌رسد. میان‌بر: Ctrl+J
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BellOff, Check, CheckCheck, Copy, FileText, MessageCircle, MessagesSquare, Paperclip, Pin, Plus, Reply, Search, SendHorizontal, Smile, Trash2, Users, X } from 'lucide-react'
import { cx } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { currentUser, getDB, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'
import type { ChatFile, ChatMsg, ChatThread } from '@/shared/data/chat'

const EMOJI = ['👍', '❤️', '✅', '😂', '🙏', '🔥', '👀', '🎉']
const QUICK = ['باشه 👍', 'الان انجام می‌دم', 'ممنون 🙏', 'چند دقیقه دیگه']
const COLORS = ['#0000ff', '#12733f', '#c2410c', '#7c3aed', '#0e7490', '#be185d', '#a16207', '#334155']
const colorOf = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
const uidM = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
const short = (iso: string) => { const d = new Date(iso); const t = new Date(); if (d.toDateString() === t.toDateString()) return hhmm(iso); const y = new Date(t.getTime() - 864e5); if (d.toDateString() === y.toDateString()) return 'دیروز'; return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' }) }
const dayLabel = (iso: string) => { const d = new Date(iso); const t = new Date(); if (d.toDateString() === t.toDateString()) return 'امروز'; if (d.toDateString() === new Date(t.getTime() - 864e5).toDateString()) return 'دیروز'; return d.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }) }
const kb = (n: number) => (n > 1e6 ? `${fa((n / 1e6).toFixed(1))} مگابایت` : `${fa(Math.max(1, Math.round(n / 1000)))} کیلوبایت`)
/** صدای ملایم پیام تازه */
const ping = () => { try { const C = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext; const c = new C(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(880, c.currentTime); o.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.12); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4); setTimeout(() => c.close(), 600) } catch { /* بی‌صدا */ } }

type Member = { id: string; name: string; role: string; status: string }
function Avatar({ m, size = 36, ring }: { m?: Member; size?: number; ring?: boolean }) {
  const online = m?.status === 'آنلاین'
  return <span className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
    <span className={cx('grid size-full place-items-center rounded-full font-bold text-white', ring && 'ring-2 ring-surface')} style={{ background: colorOf(m?.id ?? '?'), fontSize: size * 0.4 }}>{m?.name?.[0] ?? '?'}</span>
    {online && <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-surface bg-[#22c55e]" />}
  </span>
}
function GroupAvatar({ ms, size = 36 }: { ms: (Member | undefined)[]; size?: number }) {
  const [a, b] = ms
  return <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
    <span className="absolute top-0 right-0"><Avatar m={a} size={size * 0.7} /></span>
    <span className="absolute bottom-0 left-0"><Avatar m={b} size={size * 0.7} ring /></span>
  </span>
}

/** متن پیام با لینک خودکار: GH-10458 به سفارش، HV- به حواله، IN- به محموله، و @نام برجسته */
function RichText({ text, members, onGo }: { text: string; members: Member[]; onGo: (to: string) => void }) {
  const parts = text.split(/(GH-\d{5}|HV-[\dA-Z-]{3,}|IN-[\dA-Z-]{3,}|@[؀-ۿ\w]+)/g)
  return <>{parts.map((p, i) => {
    if (/^GH-\d{5}$/.test(p)) return <button key={i} type="button" onClick={() => onGo(`/admin/orders/${p}`)} className="mx-0.5 rounded bg-black/10 px-1 font-mono text-[0.92em] underline-offset-2 hover:underline" dir="ltr">{p}</button>
    if (/^HV-/.test(p)) return <button key={i} type="button" onClick={() => onGo(`/admin/inbound?tab=manifests&m=${p}`)} className="mx-0.5 rounded bg-black/10 px-1 font-mono text-[0.92em] hover:underline" dir="ltr">{p}</button>
    if (/^IN-/.test(p)) return <button key={i} type="button" onClick={() => onGo('/admin/inbound?tab=batches')} className="mx-0.5 rounded bg-black/10 px-1 font-mono text-[0.92em] hover:underline" dir="ltr">{p}</button>
    if (/^@/.test(p) && members.some((m) => m.name === p.slice(1))) return <b key={i} className="rounded bg-[#ffc24b]/40 px-0.5">{p}</b>
    return <span key={i}>{p}</span>
  })}</>
}

/** پاسخ نمونه برای نسخهٔ نمایشی، تا حس گفت‌وگوی زنده منتقل شود */
function demoReply(text: string): string {
  if (/حواله|اسکن|ارسال/.test(text)) return 'باشه، همین الان با اسکن جمعش می‌کنم و کد رهگیری رو می‌فرستم.'
  if (/قیمت|تأیید|تایید/.test(text)) return 'دیدم، قیمت به نظرم خوبه. تأیید کردم 👍'
  if (/سفارش|GH-/.test(text)) return 'چک کردم، مرسوله‌اش امروز می‌ره.'
  if (/عکس|فایل/.test(text)) return 'گرفتم، ممنون 🙏'
  if (/سلام/.test(text)) return 'سلام، جانم؟'
  return ['باشه، حله.', 'الان نگاه می‌کنم.', 'دریافت شد ✅', 'اوکی، خبرت می‌کنم.'][Math.floor(Math.random() * 4)]
}

export function Messenger() {
  const d = useDB(); const nav = useNavigate(); const me = currentUser()?.id ?? 'u1'
  const team = (d.team as Member[]); const mem = (id: string) => team.find((m) => m.id === id)
  const chat = (d as unknown as { chat?: { threads: ChatThread[]; messages: ChatMsg[] } }).chat ?? { threads: [], messages: [] }
  const mine = chat.threads.filter((t) => t.members.includes(me))
  const [open, setOpen] = useState(false); const [view, setView] = useState<'list' | 'thread' | 'new'>('list'); const [tid, setTid] = useState<string | null>(null)
  const [q, setQ] = useState(''); const [filter, setFilter] = useState<'all' | 'unread' | 'group'>('all'); const [notice, setNotice] = useState<ChatMsg | null>(null); const [typing, setTyping] = useState<Record<string, string>>({})
  const unreadIn = (t: ChatThread) => chat.messages.filter((m) => m.thread === t.id && m.from !== me && !m.readBy.includes(me)).length
  const badge = mine.filter((t) => !t.mutedBy?.includes(me)).reduce((a, t) => a + unreadIn(t), 0)
  const last = (t: ChatThread) => chat.messages.filter((m) => m.thread === t.id).at(-1)
  const titleOf = (t: ChatThread) => t.kind === 'group' ? t.name ?? 'گروه' : mem(t.members.find((x) => x !== me) ?? '')?.name ?? 'گفت‌وگو'
  // اعلان پیام تازه
  const seen = useRef(new Set(chat.messages.map((m) => m.id)))
  useEffect(() => {
    const fresh = chat.messages.filter((m) => !seen.current.has(m.id)); fresh.forEach((m) => seen.current.add(m.id))
    const inc = fresh.filter((m) => m.from !== me && mine.some((t) => t.id === m.thread && !t.mutedBy?.includes(me)))
    const show = inc.filter((m) => !(open && view === 'thread' && tid === m.thread)).at(-1)
    if (show) { setNotice(show); ping(); const t = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(t) }
  }, [chat.messages.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // خوانده‌شدن پیام‌های گفت‌وگوی باز
  useEffect(() => { if (!open || view !== 'thread' || !tid) return; const un = chat.messages.some((m) => m.thread === tid && m.from !== me && !m.readBy.includes(me)); if (un) mutate((x) => { (x as unknown as { chat: { messages: ChatMsg[] } }).chat.messages.forEach((m) => { if (m.thread === tid && !m.readBy.includes(me)) m.readBy.push(me) }) }) }, [open, view, tid, chat.messages.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((v) => !v) } if (e.key === 'Escape' && open) setOpen(false) }; window.addEventListener('keydown', h); const o = (e: Event) => { setOpen(true); const id = (e as CustomEvent<string | undefined>).detail; if (id) { setTid(id); setView('thread') } }; window.addEventListener('open-messenger', o); return () => { window.removeEventListener('keydown', h); window.removeEventListener('open-messenger', o) } }, [open])
  const openThread = (id: string) => { setTid(id); setView('thread'); setOpen(true); setNotice(null) }
  const send = (threadId: string, text: string, files: ChatFile[], replyTo?: string) => {
    const msg: ChatMsg = { id: uidM(), thread: threadId, from: me, at: new Date().toISOString(), text: text.trim() || undefined, files: files.length ? files : undefined, replyTo, readBy: [me] }
    mutate((x) => { (x as unknown as { chat: { messages: ChatMsg[] } }).chat.messages.push(msg) })
    seen.current.add(msg.id)
    // نسخهٔ نمایشی: عضو دیگر چند ثانیه بعد پاسخ می‌دهد
    const t = getDB() as unknown as { chat: { threads: ChatThread[] } }; const th = t.chat.threads.find((x) => x.id === threadId); const others = th?.members.filter((x) => x !== me) ?? []
    const who = others.find((x) => mem(x)?.status === 'آنلاین') ?? others[0]
    if (who && (text.trim() || files.length)) { setTimeout(() => setTyping((v) => ({ ...v, [threadId]: who })), 900); setTimeout(() => { setTyping((v) => { const n = { ...v }; delete n[threadId]; return n }); mutate((x) => { const c = (x as unknown as { chat: { messages: ChatMsg[] } }).chat; c.messages.forEach((m) => { if (m.thread === threadId && !m.readBy.includes(who)) m.readBy.push(who) }); c.messages.push({ id: uidM(), thread: threadId, from: who, at: new Date().toISOString(), text: demoReply(text), readBy: [who], replyTo: th?.kind === 'group' ? msg.id : undefined }) }) }, 2600 + Math.random() * 1500) }
  }
  const list = mine.filter((t) => (filter === 'all' || (filter === 'unread' ? unreadIn(t) > 0 : t.kind === 'group')) && (!q.trim() || titleOf(t).includes(q.trim()) || chat.messages.some((m) => m.thread === t.id && m.text?.includes(q.trim()))))
    .sort((a, b) => Number(!!b.pinnedBy?.includes(me)) - Number(!!a.pinnedBy?.includes(me)) || (last(b)?.at ?? b.at).localeCompare(last(a)?.at ?? a.at))
  const th = tid ? mine.find((t) => t.id === tid) : undefined
  return <>
    {/* اعلان کوچک بالای دکمه */}
    {notice && !open && (() => { const t = mine.find((x) => x.id === notice.thread); const m = mem(notice.from); return <div role="status" className="no-print anim-pop fixed bottom-[8.5rem] left-4 z-[38] w-[min(88vw,320px)] cursor-pointer rounded-2xl border border-line bg-surface p-3 shadow-float lg:bottom-24 lg:left-6" onClick={() => openThread(notice.thread)}>
      <div className="flex items-start gap-2.5"><Avatar m={m} size={36} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-12"><b>{m?.name}</b>{t?.kind === 'group' && <span className="truncate text-t2">در {t.name}</span>}<span className="mr-auto text-11 text-t3">همین حالا</span></p><p className="mt-0.5 line-clamp-2 text-12 text-t2">{notice.text ?? (notice.files?.length ? `📎 ${notice.files[0].name}` : '')}</p></div>
        <button type="button" aria-label="بستن اعلان" onClick={(e) => { e.stopPropagation(); setNotice(null) }} className="text-t3 hover:text-t1"><X size={14} /></button></div>
      <p className="mt-2 text-11 font-semibold text-brand">پاسخ بدهید ←</p>
    </div> })()}
    {/* دکمهٔ شناور */}
    <button type="button" aria-label={`پیام‌رسان تیم${badge ? `، ${badge} پیام خوانده‌نشده` : ''}`} title="پیام‌رسان تیم (Ctrl+J)" onClick={() => { setOpen(!open); setNotice(null) }}
      className={cx('msg-fab group no-print fixed bottom-20 left-[4.5rem] z-[37] grid size-12 place-items-center rounded-[18px] text-white transition-transform hover:-translate-y-0.5 lg:bottom-5 lg:left-6 lg:size-14 lg:rounded-[20px]', open && 'is-open')}>
      {open ? <X size={22} /> : <MessagesSquare size={23} strokeWidth={2.1} />}
      {!open && <span aria-hidden className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-[#10123d] px-2.5 py-1 text-11 font-semibold opacity-0 shadow-float transition-opacity group-hover:opacity-100 lg:block">پیام‌رسان تیم</span>}
      {!open && badge > 0 && <><span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-surface bg-danger-solid px-1 text-11 font-bold leading-4">{fa(badge)}</span></>}
    </button>
    {open && <div role="dialog" aria-label="پیام‌رسان تیم" className="no-print anim-pop fixed inset-x-2 top-16 bottom-2 z-[39] flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl lg:inset-x-auto lg:top-auto lg:bottom-24 lg:left-6 lg:h-[min(600px,calc(100vh-140px))] lg:w-[392px]">
      {view === 'list' && <>
        <header className="msg-head px-4 pt-4 pb-3 text-white">
          <div className="flex items-center gap-2"><b className="text-16">پیام‌رسان تیم</b><span className="rounded-full bg-white/15 px-2 py-0.5 text-11">{fa(team.filter((m) => m.status === 'آنلاین').length)} آنلاین</span>
            <button type="button" onClick={() => setView('new')} className="mr-auto flex h-8 items-center gap-1 rounded-full bg-white/15 px-3 text-12 font-semibold hover:bg-white/25"><Plus size={14} />گفت‌وگوی تازه</button>
            <button type="button" aria-label="بستن" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-white/15"><X size={16} /></button></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">{team.filter((m) => m.id !== me).slice(0, 8).map((m) => <button key={m.id} type="button" title={`${m.name} · ${m.status}`} onClick={() => { const ex = mine.find((t) => t.kind === 'dm' && t.members.includes(m.id)); if (ex) openThread(ex.id); else { const id = `th-${Date.now().toString(36)}`; mutate((x) => { (x as unknown as { chat: { threads: ChatThread[] } }).chat.threads.push({ id, kind: 'dm', members: [me, m.id], at: new Date().toISOString() }) }); openThread(id) } }} className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-0.5 transition-transform hover:-translate-y-0.5 hover:bg-white/10"><Avatar m={m} size={34} /><span className="max-w-12 truncate text-[10px] text-white/85">{m.name}</span></button>)}</div>
          <label className="mt-3 flex h-9 items-center gap-2 rounded-xl bg-white/15 px-3 text-12"><Search size={14} className="opacity-80" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی گفت‌وگو یا متن پیام" className="w-full bg-transparent placeholder:text-white/70 focus:outline-none focus-visible:outline-none" /></label>
        </header>
        <div className="flex gap-1 border-b border-line px-3 py-2">{([['all', 'همه'], ['unread', `خوانده‌نشده${badge ? ` (${fa(badge)})` : ''}`], ['group', 'گروه‌ها']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={cx('h-7 rounded-full px-3 text-12 transition-colors', filter === k ? 'bg-brand-tint font-semibold text-brand' : 'text-t2 hover:bg-neutral-bg')}>{l}</button>)}</div>
        <ul className="flex-1 overflow-y-auto">{list.length === 0 ? <li className="p-8 text-center text-12 text-t2">گفت‌وگویی پیدا نشد.</li> : list.map((t) => { const lm = last(t); const u = unreadIn(t); const other = mem(t.members.find((x) => x !== me) ?? '')
          return <li key={t.id}><button type="button" onClick={() => openThread(t.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-right transition-colors hover:bg-neutral-bg">
            {t.kind === 'group' ? <GroupAvatar ms={t.members.filter((x) => x !== me).map(mem)} size={44} /> : <Avatar m={other} size={44} />}
            <span className="min-w-0 flex-1"><span className="flex items-center gap-1"><b className="truncate text-13">{titleOf(t)}</b>{t.pinnedBy?.includes(me) && <Pin size={11} className="shrink-0 text-t3" />}{t.mutedBy?.includes(me) && <BellOff size={11} className="shrink-0 text-t3" />}<span className={cx('mr-auto flex shrink-0 items-center gap-0.5 text-11', u ? 'font-semibold text-brand' : 'text-t3')}>{lm?.from === me && (t.members.filter((x) => x !== me).every((x) => lm.readBy.includes(x)) ? <CheckCheck size={14} className="text-brand" /> : <Check size={14} />)}{lm ? short(lm.at) : ''}</span></span>
              <span className="mt-0.5 flex items-center gap-1"><span className={cx('truncate text-12', u ? 'font-medium text-t1' : 'text-t2')}>{typing[t.id] ? <i className="text-brand">در حال نوشتن…</i> : lm ? `${lm.from === me ? 'شما: ' : t.kind === 'group' ? `${mem(lm.from)?.name}: ` : ''}${lm.text ?? (lm.files?.length ? `📎 ${lm.files[0].name}` : '')}` : 'هنوز پیامی نیست'}</span>{u > 0 && <span className={cx('mr-auto grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-11 font-bold text-white', t.mutedBy?.includes(me) ? 'bg-t3' : 'bg-brand-solid')}>{fa(u)}</span>}</span></span>
          </button></li> })}</ul>
      </>}
      {view === 'new' && <NewChat me={me} team={team} onBack={() => setView('list')} onOpen={openThread} existing={mine} />}
      {view === 'thread' && th && <ThreadView t={th} me={me} team={team} msgs={chat.messages.filter((m) => m.thread === th.id)} typing={typing[th.id]} onBack={() => setView('list')} onSend={send} onGo={(to) => { nav(to); if (window.innerWidth < 1024) setOpen(false) }} title={titleOf(th)} />}
    </div>}
  </>
}

function NewChat({ me, team, onBack, onOpen, existing }: { me: string; team: Member[]; onBack: () => void; onOpen: (id: string) => void; existing: ChatThread[] }) {
  const [group, setGroup] = useState(false); const [name, setName] = useState(''); const [pick, setPick] = useState<string[]>([])
  const others = team.filter((m) => m.id !== me)
  const dm = (id: string) => { const ex = existing.find((t) => t.kind === 'dm' && t.members.includes(id)); if (ex) return onOpen(ex.id); const tid = `th-${Date.now().toString(36)}`; mutate((x) => { (x as unknown as { chat: { threads: ChatThread[] } }).chat.threads.push({ id: tid, kind: 'dm', members: [me, id], at: new Date().toISOString() }) }); onOpen(tid) }
  const make = () => { const tid = `th-${Date.now().toString(36)}`; mutate((x) => { const c = (x as unknown as { chat: { threads: ChatThread[]; messages: ChatMsg[] } }).chat; c.threads.push({ id: tid, kind: 'group', name: name.trim(), members: [me, ...pick], createdBy: me, at: new Date().toISOString() }); c.messages.push({ id: uidM(), thread: tid, from: me, at: new Date().toISOString(), text: `گروه «${name.trim()}» ساخته شد.`, readBy: [me], system: true }) }, { action: 'ساخت گروه پیام‌رسان', target: name.trim() }); toast('گروه ساخته شد.'); onOpen(tid) }
  return <>
    <header className="flex items-center gap-2 border-b border-line px-3 py-3"><button type="button" aria-label="بازگشت" onClick={onBack} className="grid size-8 place-items-center rounded-full hover:bg-neutral-bg"><ArrowRight size={17} /></button><b className="text-14">{group ? 'گروه تازه' : 'گفت‌وگوی تازه'}</b>
      <button type="button" onClick={() => { setGroup(!group); setPick([]) }} className={cx('mr-auto flex h-8 items-center gap-1 rounded-full px-3 text-12 font-semibold', group ? 'bg-neutral-bg' : 'bg-brand-tint text-brand')}><Users size={14} />{group ? 'دونفره' : 'ساخت گروه'}</button></header>
    {group && <div className="space-y-2 border-b border-line p-3"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="نام گروه، مثلاً «خرید عراق»" className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-13 focus:border-brand focus:outline-none" /><p className="text-11 text-t2">{pick.length ? `${fa(pick.length)} نفر انتخاب شد` : 'اعضا را از فهرست انتخاب کنید'}</p></div>}
    <ul className="flex-1 overflow-y-auto py-1">{others.map((m) => { const on = pick.includes(m.id); return <li key={m.id}><button type="button" onClick={() => (group ? setPick(on ? pick.filter((x) => x !== m.id) : [...pick, m.id]) : dm(m.id))} className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-neutral-bg">
      <Avatar m={m} size={40} /><span className="flex-1"><b className="block text-13">{m.name}</b><span className="text-11 text-t2">{m.status}</span></span>
      {group && <span className={cx('grid size-5 place-items-center rounded-md border-2', on ? 'border-brand bg-brand-solid text-white' : 'border-line')}>{on && <Check size={12} />}</span>}</button></li> })}</ul>
    {group && <div className="border-t border-line p-3"><button type="button" disabled={!name.trim() || pick.length < 1} onClick={make} className="h-11 w-full rounded-xl bg-brand-solid text-13 font-semibold text-white disabled:opacity-40">ساخت گروه با {fa(pick.length + 1)} نفر</button></div>}
  </>
}

function ThreadView({ t, me, team, msgs, typing, onBack, onSend, onGo, title }: { t: ChatThread; me: string; team: Member[]; msgs: ChatMsg[]; typing?: string; onBack: () => void; onSend: (tid: string, text: string, files: ChatFile[], replyTo?: string) => void; onGo: (to: string) => void; title: string }) {
  const mem = (id: string) => team.find((m) => m.id === id); const other = mem(t.members.find((x) => x !== me) ?? '')
  const [text, setText] = useState(''); const [files, setFiles] = useState<ChatFile[]>([]); const [reply, setReply] = useState<ChatMsg | null>(null); const [emo, setEmo] = useState(false); const [members, setMembers] = useState(false)
  const box = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [msgs.length, typing])
  useEffect(() => { ta.current?.focus() }, [t.id])
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(120, el.scrollHeight)}px` } }, [text])
  const go = () => { if (!text.trim() && !files.length) return; onSend(t.id, text, files, reply?.id); setText(''); setFiles([]); setReply(null); setEmo(false) }
  const react = (m: ChatMsg, e: string) => mutate((x) => { const q = (x as unknown as { chat: { messages: ChatMsg[] } }).chat.messages.find((y) => y.id === m.id)!; const R = { ...(q.reactions ?? {}) }; const L = R[e] ?? []; R[e] = L.includes(me) ? L.filter((u) => u !== me) : [...L, me]; if (!R[e].length) delete R[e]; q.reactions = R })
  const toggle = (k: 'pinnedBy' | 'mutedBy') => mutate((x) => { const q = (x as unknown as { chat: { threads: ChatThread[] } }).chat.threads.find((y) => y.id === t.id)!; const L = q[k] ?? []; q[k] = L.includes(me) ? L.filter((u) => u !== me) : [...L, me] })
  const sub = t.kind === 'group' ? `${fa(t.members.length)} عضو · ${t.members.map((x) => mem(x)?.name).filter(Boolean).join('، ')}` : typing ? 'در حال نوشتن…' : other?.status === 'آنلاین' ? 'آنلاین' : other?.status === 'استراحت' ? 'در استراحت' : 'آخرین بازدید به‌تازگی'
  /** منوی پیام (کلیک راست، کلیک روی پیام یا نگه داشتن در موبایل): واکنش‌ها بالا، کارها پایین؛ مثل تلگرام */
  const [menu, setMenu] = useState<null | { m: ChatMsg; x: number; y: number }>(null); const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => { if (!menu) return; const close = () => setMenu(null); const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null); window.addEventListener('keydown', k); const id = setTimeout(() => window.addEventListener('click', close), 0); return () => { clearTimeout(id); window.removeEventListener('click', close); window.removeEventListener('keydown', k) } }, [menu])
  const openMenu = (e: React.MouseEvent, m: ChatMsg) => { if ((e.target as HTMLElement).closest('a,button')) return; e.preventDefault(); const r = box.current!.getBoundingClientRect(); setMenu({ m, x: Math.min(Math.max(8, e.clientX - r.left - 100), r.width - 216), y: Math.min(e.clientY - r.top + box.current!.scrollTop, box.current!.scrollTop + r.height - 230) }) }
  const jump = (id: string) => { const el = box.current?.querySelector(`[data-mid="${id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setFlash(id); setTimeout(() => setFlash(null), 1400) }
  const delMsg = (m: ChatMsg) => mutate((x) => { const c = (x as unknown as { chat: { messages: ChatMsg[] } }).chat; c.messages = c.messages.filter((y) => y.id !== m.id) })
  const blocks: ReactNode[] = []; let lastDay = ''
  msgs.forEach((m, i) => {
    const day = new Date(m.at).toDateString(); if (day !== lastDay) { lastDay = day; blocks.push(<div key={`d${m.id}`} className="sticky top-1 z-[1] my-2 flex justify-center"><span className="rounded-full bg-[#10123d]/45 px-3 py-0.5 text-11 text-white backdrop-blur">{dayLabel(m.at)}</span></div>) }
    if (m.system) { blocks.push(<div key={m.id} className="my-2 flex justify-center"><span className="rounded-full bg-[#10123d]/35 px-3 py-0.5 text-11 text-white">{m.text}</span></div>); return }
    const mineM = m.from === me; const prev = msgs[i - 1]; const next = msgs[i + 1]
    const first = !prev || prev.from !== m.from || +new Date(m.at) - +new Date(prev.at) > 5 * 6e4 || !!prev.system; const lastOf = !next || next.from !== m.from || +new Date(next.at) - +new Date(m.at) > 5 * 6e4 || !!next.system
    const rp = m.replyTo ? msgs.find((x) => x.id === m.replyTo) : undefined; const readAll = t.members.filter((x) => x !== me).every((x) => m.readBy.includes(x))
    const onlyImg = !m.text && m.files?.length === 1 && m.files[0].type.startsWith('image/') && !rp
    const meta = <span className={cx('float-left mt-1.5 mr-2 inline-flex items-center gap-0.5 text-[10px] leading-none', onlyImg ? 'absolute bottom-1.5 left-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-white' : mineM ? 'text-brand/70' : 'text-t3')}>{m.edited && 'ویرایش‌شده · '}{hhmm(m.at)}{mineM && (readAll ? <CheckCheck size={14} className={onlyImg ? '' : 'text-brand'} /> : <Check size={14} />)}</span>
    blocks.push(<div key={m.id} data-mid={m.id} className={cx('flex items-end gap-1.5 rounded-xl transition-colors', mineM ? 'flex-row-reverse' : '', first ? 'mt-2' : 'mt-[3px]', flash === m.id && 'bg-brand/15')}>
      {!mineM && t.kind === 'group' && <span className="w-8 shrink-0">{lastOf && <Avatar m={mem(m.from)} size={32} />}</span>}
      <div className={cx('relative max-w-[80%]')}>
        <div onContextMenu={(e) => openMenu(e, m)} onClick={(e) => openMenu(e, m)} onDoubleClick={() => { setReply(m); setMenu(null); ta.current?.focus() }}
          className={cx('relative cursor-default select-text text-13 leading-6 shadow-[0_1px_1px_rgba(16,18,61,.12)]', onlyImg ? 'overflow-hidden rounded-2xl' : 'px-2.5 pt-1.5 pb-1', mineM ? 'bg-[#dfe3ff] text-[#10123d] dark:bg-[#2a2f7a] dark:text-white' : 'bg-white text-[#10123d] dark:bg-[#23263f] dark:text-white',
            onlyImg ? '' : mineM ? cx('rounded-2xl', lastOf && 'rounded-bl-[4px] msg-tail-out') : cx('rounded-2xl', lastOf && 'rounded-br-[4px] msg-tail-in'))}>
          {first && !mineM && t.kind === 'group' && !onlyImg && <p className="text-12 font-bold leading-5" style={{ color: colorOf(m.from) }}>{mem(m.from)?.name}</p>}
          {rp && <button type="button" onClick={() => jump(rp.id)} className="mb-1 flex w-full gap-1.5 rounded-md bg-[#0000ff]/[0.07] py-1 pl-2 text-right hover:bg-[#0000ff]/[0.12]"><span className="w-[3px] shrink-0 rounded-full" style={{ background: colorOf(rp.from) }} /><span className="min-w-0"><b className="block text-11 leading-4" style={{ color: colorOf(rp.from) }}>{rp.from === me ? 'شما' : mem(rp.from)?.name}</b><span className="line-clamp-1 text-11 leading-4 opacity-80">{rp.text ?? `📎 ${rp.files?.[0]?.name ?? ''}`}</span></span></button>}
          {m.files?.map((f, k) => f.type.startsWith('image/') && f.url ? <a key={k} href={f.url} target="_blank" rel="noreferrer" className={cx('block overflow-hidden', onlyImg ? '' : 'mb-1 rounded-xl')}><img src={f.url} alt={f.name} className="max-h-56 w-full min-w-40 object-cover" /></a>
            : <div key={k} className="mb-1 flex items-center gap-2.5 py-1"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-solid text-white"><FileText size={18} /></span><span className="min-w-0"><span className="block truncate text-12 font-semibold">{f.name}</span><span className="text-11 opacity-70">{kb(f.size)}</span></span></div>)}
          {m.text && <span className="whitespace-pre-wrap break-words"><RichText text={m.text} members={team} onGo={onGo} /></span>}
          {meta}
          {!onlyImg && <span className="clear-both block" />}
        </div>
        {m.reactions && Object.keys(m.reactions).length > 0 && <div className={cx('mt-0.5 flex flex-wrap gap-1', mineM ? 'justify-end' : 'justify-start')}>{Object.entries(m.reactions).map(([e, L]) => <button key={e} type="button" onClick={() => react(m, e)} title={L.map((u) => mem(u)?.name).join('، ')} className={cx('flex h-6 items-center gap-1 rounded-full px-2 text-12 shadow-sm transition-colors', L.includes(me) ? 'bg-brand-solid text-white' : 'bg-white text-[#10123d] dark:bg-[#23263f] dark:text-white')}>{e}{L.length > 1 && <span className="tnum text-11">{fa(L.length)}</span>}</button>)}</div>}
      </div>
    </div>)
  })
  return <>
    <header className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
      <button type="button" aria-label="بازگشت به گفت‌وگوها" onClick={onBack} className="grid size-8 place-items-center rounded-full hover:bg-neutral-bg"><ArrowRight size={17} /></button>
      <button type="button" onClick={() => t.kind === 'group' && setMembers(!members)} className="flex min-w-0 flex-1 items-center gap-2.5 text-right">{t.kind === 'group' ? <GroupAvatar ms={t.members.filter((x) => x !== me).map(mem)} size={38} /> : <Avatar m={other} size={38} />}
        <span className="min-w-0"><b className="block truncate text-14">{title}</b><span className={cx('block truncate text-11', typing || other?.status === 'آنلاین' ? 'text-success' : 'text-t2')}>{typing && t.kind === 'group' ? `${mem(typing)?.name} در حال نوشتن…` : sub}</span></span></button>
      <button type="button" aria-label={t.pinnedBy?.includes(me) ? 'برداشتن سنجاق' : 'سنجاق کردن'} title={t.pinnedBy?.includes(me) ? 'برداشتن سنجاق' : 'سنجاق بالای فهرست'} onClick={() => toggle('pinnedBy')} className={cx('grid size-8 place-items-center rounded-full hover:bg-neutral-bg', t.pinnedBy?.includes(me) ? 'text-brand' : 'text-t3')}><Pin size={15} /></button>
      <button type="button" aria-label={t.mutedBy?.includes(me) ? 'روشن کردن اعلان' : 'بی‌صدا کردن'} title={t.mutedBy?.includes(me) ? 'روشن کردن اعلان' : 'بی‌صدا'} onClick={() => toggle('mutedBy')} className={cx('grid size-8 place-items-center rounded-full hover:bg-neutral-bg', t.mutedBy?.includes(me) ? 'text-warning' : 'text-t3')}><BellOff size={15} /></button>
    </header>
    {members && <div className="anim-pop border-b border-line bg-neutral-bg/60 px-4 py-2 text-12"><p className="mb-1 font-semibold">اعضای گروه</p><div className="flex flex-wrap gap-2">{t.members.map((x) => <span key={x} className="flex items-center gap-1.5 rounded-full bg-surface px-2 py-1"><Avatar m={mem(x)} size={20} />{mem(x)?.name}</span>)}</div></div>}
    <div ref={box} className="msg-bg relative flex-1 overflow-y-auto px-2.5 pb-3">
      {msgs.length === 0 && <div className="grid h-full place-items-center text-center text-12 text-t2"><div><MessageCircle size={28} className="mx-auto mb-2 text-brand" />اولین پیام را بفرستید.<br /><span className="text-11 text-t3">شمارهٔ سفارش (مثل GH-10458) یا حواله خودکار لینک می‌شود.</span></div></div>}
      {blocks}
      {menu && <div role="menu" onClick={(e) => e.stopPropagation()} className="anim-pop absolute z-20 w-[208px] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl" style={{ left: menu.x, top: menu.y }}>
        <div className="flex justify-between gap-0.5 border-b border-line px-2 py-1.5">{EMOJI.slice(0, 6).map((e) => <button key={e} type="button" role="menuitem" aria-label={`واکنش ${e}`} onClick={() => { react(menu.m, e); setMenu(null) }} className={cx('grid size-8 place-items-center rounded-full text-17 transition-transform hover:scale-125', menu.m.reactions?.[e]?.includes(me) && 'bg-brand-tint')}>{e}</button>)}</div>
        <button type="button" role="menuitem" onClick={() => { setReply(menu.m); setMenu(null); ta.current?.focus() }} className="flex h-10 w-full items-center gap-3 px-4 text-13 hover:bg-neutral-bg"><Reply size={16} className="text-t2" />پاسخ</button>
        {menu.m.text && <button type="button" role="menuitem" onClick={() => { void navigator.clipboard?.writeText(menu.m.text ?? ''); toast('متن پیام کپی شد.'); setMenu(null) }} className="flex h-10 w-full items-center gap-3 px-4 text-13 hover:bg-neutral-bg"><Copy size={16} className="text-t2" />کپی متن</button>}
        {menu.m.from === me && <button type="button" role="menuitem" onClick={() => { delMsg(menu.m); setMenu(null); toast('پیام حذف شد.') }} className="flex h-10 w-full items-center gap-3 px-4 text-13 text-danger hover:bg-danger-bg"><Trash2 size={16} />حذف برای همه</button>}
        <p className="border-t border-line px-4 py-1.5 text-[10px] text-t3">{new Date(menu.m.at).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}{menu.m.from === me ? ` · دیده‌شده: ${fa(menu.m.readBy.filter((u) => u !== me).length)} نفر` : ''}</p>
      </div>}
      {typing && <div className="mt-2 flex items-end gap-2"><Avatar m={mem(typing)} size={28} /><div className="flex gap-1 rounded-2xl rounded-br-md bg-neutral-bg px-3 py-3">{[0, 1, 2].map((k) => <span key={k} className="size-1.5 animate-bounce rounded-full bg-t3" style={{ animationDelay: `${k * 0.15}s` }} />)}</div></div>}
    </div>
    <div className="border-t border-line bg-surface p-2.5">
      {!text && !files.length && msgs.length > 0 && msgs.at(-1)?.from !== me && <div className="mb-2 flex gap-1.5 overflow-x-auto">{QUICK.map((qq) => <button key={qq} type="button" onClick={() => onSend(t.id, qq, [], undefined)} className="h-7 shrink-0 rounded-full border border-line px-2.5 text-11 hover:border-brand hover:text-brand">{qq}</button>)}</div>}
      {reply && <div className="mb-2 flex items-center gap-2 rounded-xl bg-neutral-bg px-3 py-1.5 text-11"><Reply size={13} className="text-brand" /><span className="min-w-0 flex-1"><b>پاسخ به {reply.from === me ? 'خودتان' : mem(reply.from)?.name}</b><span className="block truncate text-t2">{reply.text ?? reply.files?.[0]?.name}</span></span><button type="button" aria-label="لغو پاسخ" onClick={() => setReply(null)}><X size={13} /></button></div>}
      {files.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{files.map((f, i) => <span key={i} className="flex items-center gap-1.5 rounded-xl border border-line bg-surface py-1 pr-1 pl-2 text-11">{f.url && f.type.startsWith('image/') ? <img src={f.url} alt="" className="size-8 rounded-lg object-cover" /> : <FileText size={16} className="mr-1 text-t2" />}<span className="max-w-28 truncate">{f.name}</span><button type="button" aria-label="حذف فایل" onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={12} /></button></span>)}</div>}
      <div className="relative flex items-end gap-1.5">
        {emo && <div className="anim-pop absolute bottom-12 left-0 z-10 grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-float">{EMOJI.map((e) => <button key={e} type="button" onClick={() => { setText(text + e); ta.current?.focus() }} className="grid size-9 place-items-center rounded-xl text-18 hover:bg-neutral-bg">{e}</button>)}</div>}
        <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-t2 hover:bg-neutral-bg hover:text-brand" title="پیوست فایل یا عکس"><Paperclip size={18} /><input type="file" multiple className="sr-only" onChange={async (e) => { const L = [...(e.target.files ?? [])].slice(0, 5); const out: ChatFile[] = await Promise.all(L.map(async (fl) => ({ name: fl.name, size: fl.size, type: fl.type || 'application/octet-stream', url: fl.type.startsWith('image/') ? await fileToImage(fl, 900) : undefined }))); setFiles([...files, ...out]); e.target.value = '' }} /></label>
        <div className="flex min-h-10 flex-1 items-end rounded-2xl border border-line bg-neutral-bg/50 px-3 focus-within:border-brand focus-within:bg-surface">
          <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go() } }} placeholder={`پیام به ${title}…`} aria-label="متن پیام" className="max-h-[120px] w-full resize-none bg-transparent py-2.5 text-13 leading-5 focus:outline-none focus-visible:outline-none" />
          <button type="button" aria-label="شکلک" onClick={() => setEmo(!emo)} className="mb-1.5 grid size-7 shrink-0 place-items-center rounded-full text-t3 hover:text-brand"><Smile size={18} /></button>
        </div>
        <button type="button" aria-label="ارسال" disabled={!text.trim() && !files.length} onClick={go} className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-solid text-white shadow-sm transition-transform enabled:hover:scale-105 disabled:opacity-35"><SendHorizontal size={17} className="-scale-x-100" /></button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-t3">Enter ارسال · Shift+Enter خط تازه · شمارهٔ سفارش و حواله خودکار لینک می‌شود</p>
    </div>
  </>
}

export function useChatUnread() {
  const d = useDB(); const me = currentUser()?.id ?? 'u1'; const chat = (d as unknown as { chat?: { threads: ChatThread[]; messages: ChatMsg[] } }).chat
  return useMemo(() => { if (!chat) return 0; const T = chat.threads.filter((t) => t.members.includes(me) && !t.mutedBy?.includes(me)).map((t) => t.id); return chat.messages.filter((m) => T.includes(m.thread) && m.from !== me && !m.readBy.includes(me)).length }, [chat, me])
}
