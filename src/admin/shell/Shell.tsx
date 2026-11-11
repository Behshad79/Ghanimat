import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Zap, Bell, CheckCheck, ChevronsRight, ExternalLink, Eye, FlaskConical, ListChecks, LogOut, Menu, Moon, MoreHorizontal, Pin, Plus, Search, ShoppingBag, Sparkles, Sun, Home as HomeIcon } from 'lucide-react'
import { NAV } from './nav'
import { Copilot } from './Copilot'
import { LiveAlert } from '../shared/LiveAlert'
import { CommandPalette } from './CommandPalette'
import { Avatar, Badge, Button, cx, Kbd, Light, Segmented, Select, StatusBadge } from '@/shared/ui/base'
import { Drawer, Modal, toast } from '@/shared/ui/overlay'
import { can, currentUser, effectiveRole, mutate, resetDB, ROLES, setSession, useDB, useSession, type ViewState } from '@/shared/lib/store'
import { compactToman, fa, rel } from '@/shared/lib/fa'

/** نوار «نسخهٔ نمایشی»: تعویض سریع نقش، منوی حالت‌ها، نتیجهٔ سرویس‌های بیرونی، بازنشانی داده (بخش ۱۸) */
export function DemoBar() {
  const s = useSession(); const d = useDB(); const nav = useNavigate()
  return (
    <div className="no-print flex h-9 shrink-0 items-center gap-2 overflow-x-auto bg-[#10123d] px-3 text-11 text-white/80">
      <span className="flex shrink-0 items-center gap-1 font-semibold text-white"><FlaskConical size={13} />نسخهٔ نمایشی</span>
      <select aria-label="تعویض سریع نقش" value={s.userId ?? ''} onChange={(e) => { const u = d.team.find((x) => x.id === e.target.value)!; setSession({ userId: u.id, viewAs: null }); nav(ROLES[u.role].home) }} className="h-6 shrink-0 rounded-sm bg-white/10 px-1 text-white [&>option]:text-black">
        {d.team.map((u) => <option key={u.id} value={u.id}>{ROLES[u.role].label} ({u.name})</option>)}
      </select>
      <select aria-label="منوی حالت‌ها" value={s.viewState} onChange={(e) => setSession({ viewState: e.target.value as ViewState })} className="h-6 shrink-0 rounded-sm bg-white/10 px-1 text-white [&>option]:text-black">
        {([['normal', 'حالت: عادی'], ['empty', 'حالت: خالی'], ['loading', 'حالت: بارگذاری'], ['error', 'حالت: خطا'], ['noaccess', 'حالت: بدون دسترسی'], ['offline', 'حالت: آفلاین']] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select aria-label="نتیجهٔ سرویس‌های بیرونی" value={s.simulate} onChange={(e) => setSession({ simulate: e.target.value as any })} className="h-6 shrink-0 rounded-sm bg-white/10 px-1 text-white [&>option]:text-black">
        <option value="success">سرویس‌های بیرونی: موفق</option><option value="fail">سرویس‌های بیرونی: ناموفق</option><option value="slow">سرویس‌های بیرونی: کند</option>
      </select>
      <button className="shrink-0 hover:text-white" onClick={() => { resetDB(); toast('دادهٔ نمونه به حالت اول برگشت.') }}>بازنشانی دادهٔ نمونه</button>
    </div>
  )
}

function Sidebar({ mobile, onNav }: { mobile?: boolean; onNav?: () => void }) {
  const s = useSession(); const d = useDB()
  const mini = s.collapsed && !mobile
  const items = NAV.filter((n) => can(n.id, s) && (!n.soon || d.flags.showSoon))
  const groups = [...new Set(items.map((n) => n.group))]
  const link = (n: (typeof NAV)[number]) => { const c = n.count?.(d) ?? 0; return (
    <NavLink key={n.id} to={n.path} end={n.path === '/admin'} onClick={onNav} title={mini ? n.label : undefined}
      className={({ isActive }) => cx('group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-13 transition-colors', isActive ? 'bg-brand-tint font-semibold text-brand' : 'text-t2 hover:bg-neutral-bg hover:text-t1', mini && 'justify-center px-0')}>
      <n.icon size={17} className="shrink-0" />
      {!mini && <span className="flex-1 truncate">{n.label}</span>}
      {!mini && n.soon && <Badge dot={false}>به‌زودی</Badge>}
      {c > 0 && <span className={cx('tnum rounded-full bg-danger-bg px-1.5 text-11 font-semibold text-danger', mini && 'absolute top-0.5 left-1 px-1')}>{fa(c)}</span>}
      {!mini && !n.soon && c === 0 && <button aria-label="سنجاق" onClick={(e) => { e.preventDefault(); setSession({ pinned: s.pinned.includes(n.id) ? s.pinned.filter((x) => x !== n.id) : [...s.pinned, n.id] }) }} className={cx('text-t3 hover:text-brand', s.pinned.includes(n.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}><Pin size={12} /></button>}
    </NavLink>
  ) }
  return (
    <aside className={cx('no-print flex h-full shrink-0 flex-col border-l border-line bg-surface transition-[width] duration-200', mobile ? 'w-72' : mini ? 'w-[72px]' : 'w-[264px]')}>
      <div className={cx('flex h-14 shrink-0 items-center border-b border-line px-4', mini && 'justify-center px-0')}>
        {mini ? <img src="./brand/logo-mark.png" alt="غنیمت" className="h-7" /> : s.theme === 'dark'
          ? <span className="flex items-center gap-2 text-20 font-bold"><img src="./brand/logo-mark.png" alt="" className="h-7" />غنیمت</span>
          : <img src="./brand/logo-full.png" alt="غنیمت" className="h-8" />}
      </div>
      <nav className="flex-1 space-y-3 overflow-y-auto p-2" aria-label="منوی اصلی">
        {!mini && s.pinned.some((p) => items.find((i) => i.id === p)) && (
          <div><p className="px-2.5 pb-1 text-11 font-medium text-t3">سنجاق‌شده</p>{items.filter((i) => s.pinned.includes(i.id)).map(link)}</div>
        )}
        {groups.map((g) => <div key={g}>{!mini && <p className="px-2.5 pb-1 text-11 font-medium text-t3">{g}</p>}{items.filter((i) => i.group === g).map(link)}</div>)}
      </nav>
      {!mobile && <button onClick={() => setSession({ collapsed: !s.collapsed })} className="flex h-10 items-center justify-center gap-2 border-t border-line text-12 text-t3 hover:text-t1"><ChevronsRight size={15} className={cx('transition-transform', mini && 'rotate-180')} />{!mini && 'جمع‌کردن منو'}</button>}
    </aside>
  )
}

const QUICK = [['کالا از لینک', '/admin/catalog/import'], ['سفارش دستی', '/admin/orders?new=1'], ['کد تخفیف', '/admin/pricing?tab=codes&new=1'], ['تیکت', '/admin/support'], ['قانون یا پارامتر', '/admin/rules']] as const

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
    <header className="no-print relative z-20 flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-3">
      <button aria-label="منو" onClick={onMenu} className="grid size-9 place-items-center rounded-md text-t2 hover:bg-neutral-bg lg:hidden"><Menu size={18} /></button>
      <button onClick={onCmd} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-13 text-t3 hover:border-brand md:max-w-sm"><Search size={15} /><span className="truncate">جست‌وجو یا اجرای دستور</span><span className="mr-auto hidden md:block"><Kbd>Ctrl K</Kbd></span></button>
      {['super', 'ops'].includes(me.role) && !s.viewAs && <Button variant="ghost" icon={<Zap size={15} />} onClick={() => nav('/simple')} className="hidden sm:inline-flex">حالت سریع</Button>}
      <div className="relative hidden md:block">
        <Button icon={<Plus size={15} />} onClick={() => setPanel(panel === 'quick' ? null : 'quick')}>ایجاد سریع</Button>
        {panel === 'quick' && <div className="anim-pop absolute top-10 right-0 w-44 rounded-md border border-line bg-surface p-1 shadow-float">{QUICK.map(([l, p]) => <button key={l} onClick={() => { nav(p); setPanel(null) }} className="block w-full rounded-sm px-3 py-1.5 text-right text-13 hover:bg-neutral-bg">{l}</button>)}</div>}
      </div>
      <div className="mr-auto hidden xl:block"><Select value={s.scope} onChange={(v) => setSession({ scope: v as any })} options={[['all', 'همهٔ انبارها'], ['tehran', 'انبار تهران'], ['mahabad', 'انبار مهاباد']]} className="h-9 w-36" /></div>
      <div className="mr-auto flex items-center xl:mr-0">
        {(() => { const lv = bad.some((b) => b.status === 'prov.error') ? 'crit' : bad.length ? 'warn' : 'ok'; return (
          <button onClick={() => setPanel('status')} title="وضعیت سیستم" className="btn flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-12 text-t2 hover:bg-neutral-bg hover:text-t1">
            <Light s={lv} /><span className="hidden md:inline">{lv === 'ok' ? 'سیستم سالم' : lv === 'warn' ? `${fa(bad.length)} هشدار` : `${fa(bad.filter((b) => b.status === 'prov.error').length)} سرویس قطع`}</span>
          </button>) })()}
        <IconBtn label="صندوق تأییدها" n={pend.length} onClick={() => setPanel('approvals')}><CheckCheck size={18} /></IconBtn>
        <IconBtn label="هشدارها" n={unread} onClick={() => setPanel('alerts')}><Bell size={18} /></IconBtn>
        <span className="hidden sm:block"><IconBtn label="تغییر تم" onClick={() => setSession({ theme: s.theme === 'dark' ? 'light' : 'dark' })}>{s.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</IconBtn></span>
        <Button variant="ai" icon={<Sparkles size={15} />} onClick={onAI} className="mx-1"><span className="hidden md:inline">دستیار غنیمت</span></Button>
        <button onClick={() => setPanel(panel === 'me' ? null : 'me')} className="flex items-center gap-2 rounded-md p-1 hover:bg-neutral-bg"><Avatar name={me.name} /><span className="hidden text-right leading-4 lg:block"><span className="block text-12 font-semibold">{me.name}</span><span className="block text-11 text-t3">{ROLES[role].label}</span></span></button>
      </div>
      {panel === 'me' && (
        <div className="anim-pop absolute top-14 left-3 w-64 rounded-lg border border-line bg-surface p-3 text-13 shadow-float">
          <p className="mb-2 text-11 text-t3">تراکم جدول</p>
          <Segmented size="sm" value={s.density} onChange={(v) => setSession({ density: v })} options={[['comfortable', 'راحت'], ['normal', 'معمولی'], ['compact', 'فشرده']]} />
          {me.role === 'super' && <><p className="mt-3 mb-1 flex items-center gap-1 text-11 text-t3"><Eye size={12} />مشاهده به‌جای… (فقط مشاهده)</p>
            <Select value={s.viewAs ?? ''} onChange={(v) => { setSession({ viewAs: v || null }); setPanel(null); if (v) nav(ROLES[v].home) }} options={[['', 'خودم (مدیر کل)'], ...Object.entries(ROLES).filter(([k]) => k !== 'super').map(([k, r]) => [k, r.label] as [string, string])]} /></>}
          <a href="#/" onClick={() => toast('سایت مشتری در مرحلهٔ بعد اضافه می‌شود.')} className="mt-3 flex items-center gap-2 rounded-sm px-1 py-1.5 text-t2 hover:text-brand"><ExternalLink size={14} />مشاهدهٔ سایت</a>
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

/** ناوبری پایین موبایل با ۵ آیتم (بخش ۵.۸) */
function MobileNav({ onMore, onAI }: { onMore: () => void; onAI: () => void }) {
  const d = useDB()
  const Item = ({ to, icon, label, n }: { to: string; icon: ReactNode; label: string; n?: number }) => (
    <NavLink to={to} end className={({ isActive }) => cx('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-11', isActive ? 'text-brand' : 'text-t2')}>{icon}{label}{!!n && <span className="tnum absolute top-1 right-1/4 rounded-full bg-danger-solid px-1 text-[10px] text-white">{fa(n)}</span>}</NavLink>
  )
  return (
    <>
      <button aria-label="دستیار غنیمت" onClick={onAI} className="no-print fixed bottom-20 left-4 z-30 grid size-12 place-items-center rounded-full bg-brand-solid text-white shadow-float lg:hidden"><Sparkles size={20} /></button>
      <nav className="no-print flex h-16 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="ناوبری موبایل">
        <Item to="/admin" icon={<HomeIcon size={20} />} label="خانه" />
        <Item to="/admin/orders" icon={<ShoppingBag size={20} />} label="سفارش‌ها" n={NAV[2].count!(d)} />
        <Item to="/admin/warehouse" icon={<ListChecks size={20} />} label="کارهای من" n={NAV[5].count!(d)} />
        <Item to="/admin/live" icon={<Bell size={20} />} label="هشدارها" n={d.alerts.filter((a) => !a.read).length} />
        <button onClick={onMore} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-11 text-t2"><MoreHorizontal size={20} />بیشتر</button>
      </nav>
    </>
  )
}

export function Shell() {
  const s = useSession(); const loc = useLocation(); const nav = useNavigate()
  const [menu, setMenu] = useState(false); const [cmd, setCmd] = useState(false); const [ai, setAI] = useState(false); const [keys, setKeys] = useState(false)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v) }
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      if (!typing && e.key === '?') setKeys(true)
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
          <main className="min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
          <MobileNav onMore={() => setMenu(true)} onAI={() => setAI(true)} />
        </div>
      </div>
      <LiveAlert />
      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <Copilot open={ai} onClose={() => setAI(false)} />
      <Modal open={keys} onClose={() => setKeys(false)} title="میان‌برهای صفحه‌کلید">
        <ul className="space-y-2">{[['Ctrl K', 'جست‌وجوی سراسری و دستور'], ['?', 'همین راهنما'], ['g سپس o', 'رفتن به سفارش‌ها'], ['g سپس h', 'رفتن به خانه'], ['g سپس w', 'رفتن به انبار'], ['g سپس s', 'رفتن به پشتیبانی'], ['Esc', 'بستن کشو یا مودال'], ['Shift + کلیک', 'انتخاب بازه‌ای ردیف‌ها'], ['Enter در صف کار', 'تأیید و بعدی']].map(([k, l]) => <li key={k} className="flex items-center justify-between"><span>{l}</span><Kbd>{k}</Kbd></li>)}</ul>
      </Modal>
    </div>
  )
}
