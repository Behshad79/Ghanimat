import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUp, Zap, Bell, ChevronDown, CheckCheck, ChevronsRight, ExternalLink, Eye, FlaskConical, ListChecks, LogOut, Maximize, Menu, Moon, MoreHorizontal, Pin, Plus, Search, ShoppingBag, Sparkles, Sun, Home as HomeIcon } from 'lucide-react'
import { GROUP_HINT, NAV } from './nav'
import { useReminders } from '../planner/Planner'
import { Messenger } from './Messenger'
import { waitItems } from '../home/tasks'
import { Copilot } from './Copilot'
import { LiveAlert } from '../shared/LiveAlert'
import { CommandPalette } from './CommandPalette'
import { Avatar, Badge, Button, cx, Kbd, Light, Segmented, Select, StatusBadge } from '@/shared/ui/base'
import { Drawer, Modal, toast } from '@/shared/ui/overlay'
import { can, currentUser, effectiveRole, getSession, mutate, resetDB, ROLES, setSession, useDB, useSession, type ViewState } from '@/shared/lib/store'
import { compactToman, fa, rel } from '@/shared/lib/fa'
import { StorePreview } from '@/storefront/Preview'

/** انتخابگر نوار نمایشی: ظاهر یکسان در همهٔ مرورگرها، فلش سمت چپ و متن خوانا روی زمینهٔ تیره */
function DemoSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) {
  return <label className="relative flex h-6 shrink-0 items-center rounded-md border border-white/15 bg-white/10 transition hover:bg-white/15 focus-within:border-white/50">
    <select aria-label={label} value={value} onChange={onChange} style={{ colorScheme: 'dark' }} className="h-full cursor-pointer appearance-none bg-transparent pe-6 ps-2 text-11 text-white outline-none [&>option]:bg-[#10123d] [&>option]:text-white">{children}</select>
    <ChevronDown size={12} className="pointer-events-none absolute end-1.5 text-white/70" />
  </label>
}

/** نوار «نسخهٔ نمایشی»: تعویض سریع نقش، منوی حالت‌ها، نتیجهٔ سرویس‌های بیرونی، بازنشانی داده (بخش ۱۸) */
export function DemoBar() {
  const s = useSession(); const d = useDB(); const nav = useNavigate()
  return (
    <div className="no-print flex h-9 shrink-0 items-center gap-2 overflow-x-auto bg-[#10123d] px-3 text-11 text-white/80">
      <span className="flex shrink-0 items-center gap-1 font-semibold text-white"><FlaskConical size={13} />نسخهٔ نمایشی</span>
      <DemoSelect label="تعویض سریع نقش" value={s.userId ?? ''} onChange={(e) => { const u = d.team.find((x) => x.id === e.target.value)!; setSession({ userId: u.id, viewAs: null }); nav(ROLES[u.role].home) }}>
        {d.team.map((u) => <option key={u.id} value={u.id}>{ROLES[u.role].label} ({u.name})</option>)}
      </DemoSelect>
      <DemoSelect label="منوی حالت‌ها" value={s.viewState} onChange={(e) => setSession({ viewState: e.target.value as ViewState })}>
        {([['normal', 'حالت: عادی'], ['empty', 'حالت: خالی'], ['loading', 'حالت: بارگذاری'], ['error', 'حالت: خطا'], ['noaccess', 'حالت: بدون دسترسی'], ['offline', 'حالت: آفلاین']] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </DemoSelect>
      <DemoSelect label="نتیجهٔ سرویس‌های بیرونی" value={s.simulate} onChange={(e) => setSession({ simulate: e.target.value as any })}>
        <option value="success">سرویس‌های بیرونی: موفق</option><option value="fail">سرویس‌های بیرونی: ناموفق</option><option value="slow">سرویس‌های بیرونی: کند</option>
      </DemoSelect>
      <button className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/20 px-2 text-white/90 transition hover:bg-white/10 hover:text-white" onClick={() => { resetDB(); toast('دادهٔ نمونه به حالت اول برگشت.') }}>بازنشانی دادهٔ نمونه</button>
    </div>
  )
}

function Sidebar({ mobile, onNav }: { mobile?: boolean; onNav?: () => void }) {
  const s = useSession(); const d = useDB()
  const mini = s.collapsed && !mobile
  const items = NAV.filter((n) => can(n.id, s) && (!n.soon || d.flags.showSoon))
  const core = items.filter((n) => n.group === 'امروز')
  const groups = [...new Set(items.filter((n) => n.group !== 'امروز').map((n) => n.group))]
  const loc = useLocation()
  const activeN = items.filter((n) => n.path !== '/admin' && loc.pathname.startsWith(n.path)).sort((a, b) => b.path.length - a.path.length)[0]; const activeG = activeN?.also ?? activeN?.group
  // آکاردئون: فقط یک گروه باز است؛ گروه صفحهٔ فعلی خودکار باز می‌شود
  const [open, setOpen] = useState<string | null>(activeG ?? null)
  useEffect(() => { if (activeG && activeG !== 'امروز') setOpen(activeG) }, [activeG])
  const pins = items.filter((i) => s.pinned.includes(i.id) && i.group !== 'امروز')
  const link = (n: (typeof NAV)[number]) => { const c = n.count?.(d) ?? 0; return (
    <NavLink key={n.id} to={n.path} end={n.path === '/admin'} onClick={onNav} title={mini ? `${n.label}${c ? ` (${fa(c)})` : ''}` : undefined}
      className={({ isActive }) => cx('group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-13 transition-colors', isActive ? 'bg-brand-solid font-semibold text-white shadow-sm [&_.navcount]:bg-white/20 [&_.navcount]:text-white' : 'text-t2 hover:bg-neutral-bg hover:text-t1', mini && 'h-10 justify-center px-0')}>
      <n.icon size={17} className="shrink-0" />
      {!mini && <span className="flex-1 truncate">{n.label}</span>}
      {!mini && n.soon && <Badge dot={false}>به‌زودی</Badge>}
      {c > 0 && <span className={cx('navcount tnum rounded-full px-1.5 text-11 font-semibold', n.urgent ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-t2', mini && 'absolute top-0.5 left-1 px-1')}>{fa(c)}</span>}
      {!mini && !n.soon && c === 0 && n.group !== 'امروز' && <button aria-label={s.pinned.includes(n.id) ? 'برداشتن سنجاق' : 'سنجاق به بالای منو'} title={s.pinned.includes(n.id) ? 'برداشتن سنجاق' : 'سنجاق به بالای منو'} onClick={(e) => { e.preventDefault(); setSession({ pinned: s.pinned.includes(n.id) ? s.pinned.filter((x) => x !== n.id) : [...s.pinned, n.id] }) }} className={cx('text-t3 hover:text-brand', s.pinned.includes(n.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100')}><Pin size={12} /></button>}
    </NavLink>
  ) }
  const Head = ({ children }: { children: ReactNode }) => mini ? <div className="mx-3 my-1 border-t border-line" /> : <p className="px-2.5 pt-1 pb-1 text-11 font-medium text-t3">{children}</p>
  return (
    <aside className={cx('no-print flex h-full shrink-0 flex-col border-l border-line bg-surface transition-[width] duration-200', mobile ? 'w-72' : mini ? 'w-[72px]' : 'w-[256px]')}>
      <div className={cx('flex h-14 shrink-0 items-center border-b border-line px-4', mini && 'justify-center px-0')}>
        {mini ? <img src="./brand/logo-mark.png" alt="غنیمت" className="h-7" /> : s.theme === 'dark'
          ? <span className="flex items-center gap-2 text-20 font-bold"><img src="./brand/logo-mark.png" alt="" className="h-7" />غنیمت</span>
          : <img src="./brand/logo-full.png" alt="غنیمت" className="h-8" />}
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-2" aria-label="منوی اصلی">
        <>
          <div className="space-y-0.5">{core.map(link)}</div>
          {pins.length > 0 && <div className="space-y-0.5"><Head>سنجاق‌شده‌های من</Head>{pins.map(link)}</div>}
          <div className={cx(!mini && 'border-t border-line pt-2')}>
            {groups.map((g) => { const gi = items.filter((i) => i.group === g || i.also === g); const isOpen = mini || open === g; const urgent = gi.filter((n) => n.urgent).reduce((a, n) => a + (n.count?.(d) ?? 0), 0); const here = activeG === g; return (
              <div key={g} className="mb-0.5">
                {!mini ? <button onClick={() => setOpen(open === g ? null : g)} aria-expanded={isOpen} className={cx('flex min-h-8 w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-12 font-semibold hover:bg-neutral-bg', here ? 'text-brand' : 'text-t1')}>
                  <span className="min-w-0 flex-1 text-right" title={GROUP_HINT[g]}><span className="block">{g}</span>{isOpen && GROUP_HINT[g] && <span className="block truncate text-[10px] font-normal text-t3">{GROUP_HINT[g]}</span>}</span>
                  {!isOpen && urgent > 0 && <span className="tnum rounded-full bg-danger-bg px-1.5 text-[10px] font-semibold text-danger">{fa(urgent)}</span>}
                  <ChevronDown size={13} className={cx('text-t3 transition-transform', !isOpen && 'rotate-90')} />
                </button> : <div className="mx-3 my-1.5 border-t border-line" />}
                {isOpen && <div className={cx('space-y-0.5', !mini && 'mt-0.5 mb-1.5 border-r-2 border-line pr-1.5 mr-3')}>{gi.map(link)}</div>}
              </div>) })}
          </div>
        </>
      </nav>
      {!mobile && <button onClick={() => setSession({ collapsed: !s.collapsed })} title="جمع و باز کردن منو (کلید [ )" className="flex h-10 shrink-0 items-center justify-center gap-2 border-t border-line text-12 text-t3 hover:text-t1"><ChevronsRight size={15} className={cx('transition-transform', mini && 'rotate-180')} />{!mini && <>جمع‌کردن منو<Kbd>[</Kbd></>}</button>}
    </aside>
  )
}

const QUICK = [['افزودن کالا', '/admin/catalog/new'], ['کالا از لینک آمازون یا دیجی‌کالا', '/admin/catalog/import'], ['ورود موجودی با مالک', '/admin/ownership?tab=stock&intake=1'], ['سفارش دستی', '/admin/orders?new=1'], ['کد تخفیف', '/admin/pricing?tab=codes&new=1'], ['تیکت', '/admin/support'], ['قانون یا پارامتر', '/admin/rules']] as const

function TopBar({ onMenu, onCmd, onAI }: { onMenu: () => void; onCmd: () => void; onAI: () => void }) {
  const s = useSession(); const d = useDB(); const nav = useNavigate()
  const [panel, setPanel] = useState<null | 'alerts' | 'approvals' | 'status' | 'me' | 'quick'>(null)
  const me = currentUser()!
  const role = effectiveRole(s)
  const pend = d.approvals.filter((a) => a.status === 'approval.pending')
  const unread = d.alerts.filter((a) => !a.read).length
  const bad = d.providers.filter((p) => ['prov.error', 'prov.slow'].includes(p.status))
  const decide = (id: string, ok: boolean) => { mutate((x) => { x.approvals.find((a) => a.id === id)!.status = ok ? 'approval.approved' : 'approval.rejected' }, { action: ok ? 'تأیید درخواست' : 'رد درخواست', target: id }); toast(ok ? 'درخواست تأیید شد.' : 'درخواست رد شد.') }
  const IconBtn = ({ label, n, onClick, children }: { label: string; n?: number; onClick: () => void; children: ReactNode }) => (
    <button aria-label={label} title={label} onClick={onClick} className="relative grid size-9 shrink-0 place-items-center rounded-md text-t2 hover:bg-neutral-bg hover:text-t1">{children}{!!n && <span className="tnum absolute top-0.5 left-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-solid px-1 text-[10px] font-bold text-white">{fa(n)}</span>}</button>
  )
  return (
    <header className="no-print relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      <button aria-label="منو" onClick={onMenu} className="grid size-9 place-items-center rounded-md text-t2 hover:bg-neutral-bg lg:hidden"><Menu size={18} /></button>
      {/* راست: پیدا کردن و دامنهٔ داده */}
      <button onClick={onCmd} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-13 text-t3 hover:border-brand md:max-w-md"><Search size={15} /><span className="truncate">جست‌وجوی سفارش، کالا، مشتری یا دستور</span><span className="mr-auto hidden whitespace-nowrap lg:block"><Kbd>Ctrl K</Kbd></span></button>
      <div className="hidden xl:block"><Select value={s.scope} onChange={(v) => setSession({ scope: v as any })} options={[['all', 'همهٔ انبارها'], ['tehran', 'انبار تهران'], ['mahabad', 'انبار مهاباد']]} className="h-9 w-36" /></div>
      {/* چپ: وضعیت فقط وقتی مشکلی هست، بعد اقدام، اعلان‌ها و حساب */}
      <div className="mr-auto flex items-center gap-1">
        {(() => { const n = d.network; const c = n?.closed && new Date(n.closed.until).getTime() > Date.now(); const f = n?.fastOff && new Date(n.fastOff.until).getTime() > Date.now(); if (!c && !f) return null; return <button onClick={() => nav('/admin/network')} className={cx('btn flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-12 font-semibold', c ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning')}><span className="size-2 animate-pulse rounded-full bg-current" />{c ? 'تعطیل' : 'ارسال سریع متوقف'}</button> })()}
        {(() => { const lv = bad.some((b) => b.status === 'prov.error') ? 'crit' : bad.length ? 'warn' : 'ok'; return (
          <button onClick={() => setPanel('status')} title={lv === 'ok' ? 'همهٔ سرویس‌ها سالم است' : 'وضعیت سیستم'} className={cx('btn flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-12', lv === 'ok' ? 'text-t3 hover:bg-neutral-bg' : lv === 'warn' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger')}>
            <Light s={lv} /><span className={cx(lv === 'ok' ? 'hidden 2xl:inline' : 'hidden md:inline')}>{lv === 'ok' ? 'سیستم سالم' : lv === 'warn' ? `${fa(bad.length)} هشدار سرویس` : `${fa(bad.filter((b) => b.status === 'prov.error').length)} سرویس قطع`}</span>
          </button>) })()}
        <div className="relative z-10 hidden md:block">
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setPanel(panel === 'quick' ? null : 'quick')} aria-expanded={panel === 'quick'}>ایجاد</Button>
          {panel === 'quick' && <div className="anim-pop absolute top-10 left-0 z-10 w-52 rounded-lg border border-line bg-surface p-1 shadow-float">{QUICK.map(([l, p]) => <button key={l} onClick={() => { nav(p); setPanel(null) }} className="block w-full rounded-md px-3 py-2 text-right text-13 hover:bg-neutral-bg">{l}</button>)}</div>}
        </div>
        <span className="mx-1 hidden h-6 w-px bg-line md:block" />
        <IconBtn label="صندوق تأییدها" n={pend.length} onClick={() => setPanel('approvals')}><CheckCheck size={18} /></IconBtn>
        <IconBtn label="هشدارها" n={unread} onClick={() => setPanel('alerts')}><Bell size={18} /></IconBtn>
        <span className="hidden xl:block"><IconBtn label="مشاهدهٔ فروشگاه" onClick={() => window.dispatchEvent(new Event('site-preview'))}><ExternalLink size={17} /></IconBtn></span>
        <Button variant="ai" icon={<Sparkles size={15} />} onClick={onAI} className="mx-1"><span className="hidden lg:inline">دستیار</span></Button>
        <button onClick={() => setPanel(panel === 'me' ? null : 'me')} aria-expanded={panel === 'me'} className="flex items-center gap-2 rounded-lg p-1 hover:bg-neutral-bg"><Avatar name={me.name} /><span className="hidden text-right leading-4 lg:block"><span className="block text-12 font-semibold">{me.name}</span><span className="block text-11 text-t3">{ROLES[role].label}</span></span><ChevronDown size={13} className="hidden text-t3 lg:block" /></button>
      </div>
      {(panel === 'me' || panel === 'quick') && <div className="fixed inset-0" aria-hidden onClick={() => setPanel(null)} />}
      {panel === 'me' && (
        <div className="anim-pop absolute top-14 left-3 w-64 rounded-lg border border-line bg-surface p-3 text-13 shadow-float">
          {['super', 'ops'].includes(me.role) && !s.viewAs && <button onClick={() => { setPanel(null); nav('/simple') }} className="mb-2 flex w-full items-center gap-2 rounded-md bg-neutral-bg px-2 py-2 text-right font-medium hover:text-brand"><Zap size={15} />رفتن به حالت سریع<span className="mr-auto text-11 font-normal text-t3">برای اپراتور</span></button>}
          <div className="mb-3 flex gap-1"><button onClick={() => setSession({ theme: s.theme === 'dark' ? 'light' : 'dark' })} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-12 hover:border-brand">{s.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}{s.theme === 'dark' ? 'تم روشن' : 'تم تیره'}</button><button onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}) }} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-12 hover:border-brand"><Maximize size={14} />تمام‌صفحه</button></div>
          <p className="mb-2 text-11 text-t3">تراکم جدول</p>
          <Segmented size="sm" value={s.density} onChange={(v) => setSession({ density: v })} options={[['comfortable', 'راحت'], ['normal', 'معمولی'], ['compact', 'فشرده']]} />
          {me.role === 'super' && <><p className="mt-3 mb-1 flex items-center gap-1 text-11 text-t3"><Eye size={12} />مشاهده به‌جای… (فقط مشاهده)</p>
            <Select value={s.viewAs ?? ''} onChange={(v) => { setSession({ viewAs: v || null }); setPanel(null); if (v) nav(ROLES[v].home) }} options={[['', 'خودم (مدیر کل)'], ...Object.entries(ROLES).filter(([k]) => k !== 'super').map(([k, r]) => [k, r.label] as [string, string])]} /></>}
          <button onClick={() => { setPanel(null); window.dispatchEvent(new Event('site-preview')) }} className="mt-3 flex w-full items-center gap-2 rounded-sm px-1 py-1.5 text-t2 hover:text-brand"><ExternalLink size={14} />پیش‌نمایش سایت</button>
          <button onClick={() => { setSession({ userId: null, viewAs: null }); nav('/login') }} className="flex w-full items-center gap-2 rounded-sm px-1 py-1.5 text-danger"><LogOut size={14} />خروج از حساب</button>
        </div>
      )}
      <Drawer open={panel === 'alerts'} onClose={() => setPanel(null)} title="هشدارها" footer={<Button onClick={() => mutate((x) => x.alerts.forEach((a) => (a.read = true)))}>همه خوانده شد</Button>}>
        <ul className="space-y-2">{d.alerts.map((a) => (
          <li key={a.id}><button onClick={() => { mutate((x) => { x.alerts.find((y) => y.id === a.id)!.read = true }); setPanel(null); nav(a.to) }} className={cx('block w-full rounded-md border p-3 text-right', a.read ? 'border-line' : 'border-brand/40 bg-brand-tint/40')}>
            <div className="mb-1 flex items-center justify-between"><Badge tone={a.tone as any}>{a.cat}</Badge><span className="text-11 text-t3">{rel(a.at)}</span></div>
            <p className="text-13 font-semibold">{a.title}</p><p className="text-12 text-t2">{a.body}</p></button></li>
        ))}</ul>
      </Drawer>
      <Drawer open={panel === 'approvals'} onClose={() => setPanel(null)} title="صندوق تأییدها">
        {d.approvals.length === 0 ? <p className="text-13 text-t2">موردی منتظر تأیید شما نیست.</p> : <ul className="space-y-2">{d.approvals.map((a) => { const own = a.byRole === role; return (
          <li key={a.id} className="rounded-md border border-line p-3">
            <div className="mb-1 flex items-center justify-between"><Badge tone="info">{a.type}</Badge><StatusBadge s={a.status} /></div>
            <p className="text-13 font-medium">{a.title}</p>
            <p className="text-11 text-t3">درخواست از {a.by} · {rel(a.at)}{a.amount > 0 && ` · ${compactToman(a.amount)}`}</p>
            {a.status === 'approval.pending' && (own
              ? <p className="mt-2 rounded-sm bg-warning-bg px-2 py-1 text-11 text-warning">درخواست‌دهنده نمی‌تواند درخواست خودش را تأیید کند. نفر دوم باید تأیید کند.</p>
              : <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" onClick={() => decide(a.id, true)}>تأیید درخواست</Button><Button size="sm" variant="danger" onClick={() => decide(a.id, false)}>رد درخواست</Button></div>)}
          </li>) })}</ul>}
      </Drawer>
      <Modal open={panel === 'status'} onClose={() => setPanel(null)} title="وضعیت سیستم" footer={<Button onClick={() => { setPanel(null); nav('/admin/infra') }}>برج پایش و زیرساخت</Button>}>
        <ul className="divide-y divide-line">{d.providers.filter((p) => ['gateway', 'bnpl', 'sms', 'carrier'].includes(p.family)).map((p) => <li key={p.id} className="flex items-center justify-between py-2"><span className="flex items-center gap-2"><Light s={p.status === 'prov.error' ? 'crit' : p.status === 'prov.slow' ? 'warn' : 'ok'} />{p.name}</span><StatusBadge s={p.status} /></li>)}</ul>
      </Modal>
    </header>
  )
}

/** دکمهٔ بازگشت به بالا در صفحه‌های بلند */
function BackToTop({ main }: { main: React.RefObject<HTMLElement | null> }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const m = main.current; if (!m) return; const f = () => setOn(m.scrollTop > 900); m.addEventListener('scroll', f, { passive: true }); return () => m.removeEventListener('scroll', f) }, [main])
  return <button type="button" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالا" onClick={() => main.current?.scrollTo({ top: 0, behavior: 'smooth' })} className={cx('no-print fixed right-4 bottom-20 z-30 grid size-11 place-items-center rounded-full border border-line bg-surface text-t1 shadow-float transition-all duration-200 hover:text-brand lg:right-auto lg:bottom-28 lg:left-6', on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')}><ArrowUp size={18} /></button>
}

/** ناوبری پایین موبایل با ۵ آیتم (بخش ۵.۸) */
function MobileNav({ onMore, onAI }: { onMore: () => void; onAI: () => void }) {
  const d = useDB(); useSession(); const nav = useNavigate(); const [tasks, setTasks] = useState(false)
  const mine = waitItems(d).filter((x) => x.count > 0).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
  const Item = ({ to, icon, label, n }: { to: string; icon: ReactNode; label: string; n?: number }) => (
    <NavLink to={to} end className={({ isActive }) => cx('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-11', isActive ? 'text-brand' : 'text-t2')}>{icon}{label}{!!n && <span className="tnum absolute top-1 right-1/4 rounded-full bg-danger-solid px-1 text-[10px] text-white">{fa(n)}</span>}</NavLink>
  )
  return (
    <>
      <button aria-label="دستیار هوشمند غنیمت" title="دستیار هوشمند" onClick={onAI} className="ai-fab no-print fixed bottom-20 left-4 z-30 grid size-12 place-items-center rounded-full text-brand lg:hidden"><Sparkles size={20} /><span aria-hidden className="absolute -top-1 -right-1 rounded-full bg-brand-solid px-1 text-[9px] font-bold leading-[14px] text-white">AI</span></button>
      <nav className="no-print flex h-16 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="ناوبری موبایل">
        <Item to="/admin" icon={<HomeIcon size={20} />} label="خانه" />
        <Item to="/admin/orders" icon={<ShoppingBag size={20} />} label="سفارش‌ها" n={NAV.find((x) => x.id === 'orders')!.count!(d)} />
        <button onClick={() => setTasks(true)} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-11 text-t2"><ListChecks size={20} />کارهای من{mine.length > 0 && <span className="tnum absolute top-1 right-1/4 rounded-full bg-danger-solid px-1 text-[10px] text-white">{fa(mine.reduce((a, x) => a + x.count, 0))}</span>}</button>
        <Item to="/admin/live" icon={<Bell size={20} />} label="هشدارها" n={d.alerts.filter((a) => !a.read).length} />
        <button onClick={onMore} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-11 text-t2"><MoreHorizontal size={20} />بیشتر</button>
      </nav>
      <Drawer open={tasks} onClose={() => setTasks(false)} title="کارهای من">
        <p className="mb-3 text-12 text-t2">فقط کارهایی که همین حالا منتظر اقدام شماست، از بخش‌هایی که به آن دسترسی دارید. فوری‌ها بالاترند.</p>
        {mine.length ? <ul className="space-y-2">{mine.map((x) => { const I = x.icon; return <li key={x.label}><button onClick={() => { setTasks(false); nav(x.to) }} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-right hover:border-brand"><span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', x.urgent ? 'bg-danger-bg text-danger' : 'bg-brand-tint text-brand')}><I size={18} /></span><span className="flex-1 text-13 font-medium">{x.label}</span><b className={cx('tnum text-18', x.urgent && 'text-danger')}>{fa(x.count)}</b></button></li> })}</ul> : <p className="rounded-xl bg-success-bg p-4 text-13 text-success">کاری منتظر شما نیست.</p>}
      </Drawer>
    </>
  )
}

export function Shell() {
  const s = useSession(); const loc = useLocation(); const nav = useNavigate(); const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }) }, [loc.pathname])
  useReminders()
  const [menu, setMenu] = useState(false); const [cmd, setCmd] = useState(false); const [ai, setAI] = useState(false); const [keys, setKeys] = useState(false); const [site, setSite] = useState(false)
  useEffect(() => { const f = () => setSite(true); window.addEventListener('site-preview', f); return () => window.removeEventListener('site-preview', f) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v) }
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      if (!typing && e.key === '?') setKeys(true)
      if (!typing && e.key === '[') setSession({ collapsed: !getSession().collapsed })
      if (!typing && e.key === 'g') { const once = (k: KeyboardEvent) => { ({ o: '/admin/orders', h: '/admin', c: '/admin/catalog', w: '/admin/warehouse', s: '/admin/support' } as Record<string, string>)[k.key] && nav(({ o: '/admin/orders', h: '/admin', c: '/admin/catalog', w: '/admin/warehouse', s: '/admin/support' } as Record<string, string>)[k.key]); window.removeEventListener('keydown', once) }; window.addEventListener('keydown', once) }
    }
    const openAI = () => setAI(true)
    window.addEventListener('keydown', h); window.addEventListener('copilot', openAI)
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('copilot', openAI) }
  }, [])
  useEffect(() => { setMenu(false) }, [loc.pathname])
  return (
    <div className="flex h-full flex-col">
      <DemoBar />
      {s.viewAs && <div className="no-print flex h-8 shrink-0 items-center justify-center gap-3 bg-warning-bg text-12 text-warning"><Eye size={13} />در حال مشاهدهٔ پنل از دید «{ROLES[s.viewAs].label}» هستید؛ فقط مشاهده.<button className="font-semibold underline" onClick={() => { setSession({ viewAs: null }); nav('/admin') }}>بازگشت به مدیر کل</button></div>}
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block"><Sidebar /></div>
        {menu && <div className="anim-fade fixed inset-0 z-40 bg-[#10123d]/40 lg:hidden" onClick={() => setMenu(false)}><div className="absolute inset-y-0 right-0" onClick={(e) => e.stopPropagation()}><Sidebar mobile onNav={() => setMenu(false)} /></div></div>}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMenu(true)} onCmd={() => setCmd(true)} onAI={() => setAI(true)} />
          <main ref={mainRef} className="relative min-h-0 flex-1 overflow-y-auto"><Outlet /><BackToTop main={mainRef} /></main>
          <MobileNav onMore={() => setMenu(true)} onAI={() => setAI(true)} />
        </div>
      </div>
      <LiveAlert />
      <Messenger />
      <SitePreview open={site} onClose={() => setSite(false)} />
      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <Copilot open={ai} onClose={() => setAI(false)} />
      <Modal open={keys} onClose={() => setKeys(false)} title="میان‌برهای صفحه‌کلید">
        <ul className="space-y-2">{[['Ctrl K', 'جست‌وجوی سراسری و دستور'], ['?', 'همین راهنما'], ['g سپس o', 'رفتن به سفارش‌ها'], ['g سپس h', 'رفتن به خانه'], ['g سپس w', 'رفتن به انبار'], ['g سپس s', 'رفتن به پشتیبانی'], ['Esc', 'بستن کشو یا مودال'], ['Shift + کلیک', 'انتخاب بازه‌ای ردیف‌ها'], ['Enter در صف کار', 'تأیید و بعدی']].map(([k, l]) => <li key={k} className="flex items-center justify-between"><span>{l}</span><Kbd>{k}</Kbd></li>)}</ul>
      </Modal>
    </div>
  )
}

/** پیش‌نمایش سایت مشتری با همین داده و همین کارت محصول (تا ساخت کامل سایت) */
function SitePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  return (
    <Modal open={open} onClose={onClose} wide title="پیش‌نمایش سایت غنیمت (نسخهٔ منتشرشده)" footer={<><Button variant="primary" onClick={() => { onClose(); nav('/admin/site') }}>ویرایش سایت</Button><Segmented value={device} onChange={setDevice} options={[['desktop', 'دسکتاپ'], ['mobile', 'موبایل']]} /></>}>
      <div className={cx('mx-auto overflow-hidden rounded-xl border border-line', device === 'mobile' && 'w-[390px] max-w-full')}><StorePreview site={d.sitePublished} device={device} /></div>
    </Modal>
  )
}
