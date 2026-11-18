// ایجنت‌ها و اتوماسیون: وصل کردن دستیارهای هوش مصنوعی به پنل با دسترسی محدود، کار روزانه، صف تأیید، آموزش و گزارش کامل
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Check, Copy, KeyRound, Pause, Play, Plus, ShieldAlert, Sparkles, X } from 'lucide-react'
import { Badge, Button, Card, copyText, cx, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { NAV } from '../shell/nav'
import { useTab } from '../pages/_shared'
import { LEVELS, LOCKED, TEMPLATES, TRIGGERS, type Agent, type AgentLevel, type AgentTask, type Proposal } from '@/shared/data/agents'

const now = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Date.now().toString(36)}`
const lvl = (l: AgentLevel) => LEVELS.find((x) => x[0] === l)?.[1] ?? l
const TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { queued: 'neutral', running: 'info', needs_approval: 'warning', done: 'success', failed: 'danger' }
const TLABEL: Record<string, string> = { queued: 'در صف', running: 'در حال اجرا', needs_approval: 'منتظر تأیید شما', done: 'انجام شد', failed: 'ناموفق' }

/** ثبت در گزارش ایجنت و لاگ ممیزی (با نشان هوش مصنوعی) */
function log(agentId: string, action: string, target: string, result: 'ok' | 'pending' | 'blocked', note?: string) {
  mutate((d) => { d.agents.log.unshift({ id: uid('l'), agentId, at: now(), action, target, result, note }) }, { action: `ایجنت: ${action}`, target, ai: true })
}

export function Agents() {
  const d = useDB(); const [tab, setTab] = useTab('agents')
  const A = d.agents
  const pending = A.tasks.filter((t) => t.status === 'needs_approval').length
  return (
    <Page title="ایجنت‌ها و اتوماسیون" module="agents" sub="دستیارهای هوش مصنوعی با دسترسی محدود به پنل وصل می‌شوند؛ هر اقدام اثرگذار منتظر تأیید شماست و همه‌چیز ثبت می‌شود."
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'agents', label: 'ایجنت‌ها', count: A.agents.length }, { id: 'tasks', label: 'کارهای امروز', count: pending }, { id: 'playbooks', label: 'آموزش و دستورالعمل', count: A.playbooks.length }, { id: 'auto', label: 'اتوماسیون‌ها', count: A.automations.filter((a) => a.on).length }, { id: 'log', label: 'گزارش فعالیت' }, { id: 'connect', label: 'راهنمای اتصال' }]} />}>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="منتظر تأیید شما" value={fa(pending)} to="/admin/agents?tab=tasks" />
        <KPI label="اقدام‌های امروز ایجنت‌ها" value={fa(A.agents.reduce((s, a) => s + a.actionsToday, 0))} to="/admin/agents?tab=log" />
        <KPI label="اتوماسیون فعال" value={fa(A.automations.filter((a) => a.on).length)} to="/admin/agents?tab=auto" />
        <KPI label="اقدام‌های جلوگیری‌شده" value={fa(A.log.filter((l) => l.result === 'blocked').length)} note="به‌خاطر قفل دسترسی" to="/admin/agents?tab=log" />
      </div>
      {tab === 'agents' && <AgentList />}
      {tab === 'tasks' && <Tasks />}
      {tab === 'playbooks' && <Playbooks />}
      {tab === 'auto' && <Automations />}
      {tab === 'log' && <Log />}
      {tab === 'connect' && <Connect />}
    </Page>
  )
}

// ───────── ایجنت‌ها ─────────
function AgentList() {
  const d = useDB(); const [edit, setEdit] = useState<Agent | null>(null); const [token, setToken] = useState<string | null>(null)
  const blank: Agent = { id: '', name: '', desc: '', provider: 'مدل زبانی (قابل تعویض)', conn: 'MCP', status: 'active', scopes: {}, limits: { perDay: 100, maxDiscount: 0, hours: '۰۹ تا ۲۱', refunds: false }, actionsToday: 0, playbooks: [] }
  const issue = (a: Agent) => { const t = `ghn_${Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 56]).join('')}`
    mutate((x) => { const g = x.agents.agents.find((y) => y.id === a.id)!; g.token = { last4: t.slice(-4), created: now(), expires: new Date(Date.now() + 30 * 864e5).toISOString() } }, { action: 'صدور کلید دسترسی ایجنت', target: a.name }); setToken(t) }
  return <>
    <div className="mb-3 flex justify-end"><Button variant="primary" icon={<Plus size={16} />} onClick={() => setEdit({ ...blank, id: uid('ag') })}>ایجنت تازه</Button></div>
    <div className="grid gap-4 lg:grid-cols-3">{d.agents.agents.map((a) => {
      const sc = Object.entries(a.scopes).filter(([, v]) => v !== 'none')
      return <Card key={a.id} title={<span className="flex items-center gap-2"><Bot size={16} />{a.name}</span>} actions={<Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status === 'active' ? 'فعال' : 'متوقف'}</Badge>}>
        <p className="text-13 text-t2">{a.desc}</p>
        <div className="mt-3 space-y-1 text-12">
          <p><span className="text-t3">اتصال: </span>{a.conn} · {a.provider}</p>
          <p><span className="text-t3">ساعت کار: </span>{a.limits.hours} · سقف {fa(a.limits.perDay)} اقدام در روز</p>
          <p><span className="text-t3">کلید: </span>{a.token ? <>•••• <span className="ltr font-mono">{a.token.last4}</span> · اعتبار تا {new Date(a.token.expires).toLocaleDateString('fa-IR')}</> : 'صادر نشده'}</p>
          <p><span className="text-t3">آخرین فعالیت: </span>{a.lastActive ? rel(a.lastActive) : '—'} · امروز {fa(a.actionsToday)} اقدام</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">{sc.map(([m, v]) => <span key={m} className={cx('rounded-full px-2 py-0.5 text-11', v === 'auto' ? 'bg-warning-bg text-warning' : v === 'approve' ? 'bg-brand-tint text-brand' : 'bg-neutral-bg text-t2')}>{NAV.find((n) => n.id === m)?.label ?? m}: {lvl(v)}</span>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setEdit(structuredClone(a))}>دسترسی و تنظیمات</Button>
          <Button size="sm" icon={<KeyRound size={14} />} onClick={async () => { if (!a.token || await confirm({ title: 'کلید تازه صادر شود؟', body: 'کلید قبلی همین حالا باطل می‌شود و ایجنت تا وارد کردن کلید تازه قطع است.', confirm: 'صدور کلید تازه' })) issue(a) }}>{a.token ? 'کلید تازه' : 'صدور کلید'}</Button>
          <Button size="sm" variant="ghost" icon={a.status === 'active' ? <Pause size={14} /> : <Play size={14} />} onClick={() => mutate((x) => { const g = x.agents.agents.find((y) => y.id === a.id)!; g.status = g.status === 'active' ? 'paused' : 'active' }, { action: a.status === 'active' ? 'توقف ایجنت' : 'فعال‌سازی ایجنت', target: a.name })}>{a.status === 'active' ? 'توقف فوری' : 'فعال‌سازی'}</Button>
          {a.token && <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: 'کلید باطل شود؟', body: 'ایجنت فوراً قطع می‌شود.', confirm: 'باطل کردن', danger: true })) mutate((x) => { x.agents.agents.find((y) => y.id === a.id)!.token = undefined }, { action: 'ابطال کلید ایجنت', target: a.name }) }}>ابطال کلید</Button>}
        </div>
      </Card> })}</div>
    <AgentEditor a={edit} onClose={() => setEdit(null)} />
    <Modal open={!!token} onClose={() => setToken(null)} title="کلید دسترسی ایجنت" footer={<><Button variant="primary" icon={<Copy size={16} />} onClick={() => { copyText(token ?? ''); toast('کلید کپی شد.') }}>کپی کلید</Button><Button onClick={() => setToken(null)}>ذخیره کردم</Button></>}>
      <div className="space-y-3 text-13"><p className="rounded-md bg-warning-bg px-3 py-2 text-warning">این کلید فقط همین یک بار نشان داده می‌شود. آن را در تنظیمات ایجنت (مثلاً فایل پیکربندی MCP) بگذارید و جای دیگری نفرستید.</p>
        <p className="ltr break-all rounded-md bg-neutral-bg p-3 font-mono text-12">{token}</p><p className="text-12 text-t2">اعتبار ۳۰ روز. هر زمان با «ابطال کلید» قطعش کنید.</p></div>
    </Modal>
  </>
}

function AgentEditor({ a, onClose }: { a: Agent | null; onClose: () => void }) {
  const d = useDB(); const [f, setF] = useState<Agent | null>(a)
  if (a && (!f || f.id !== a.id)) setF(a)
  if (!a || !f) return null
  const mods = NAV.filter((n) => n.id !== 'agents')
  const save = () => {
    if (f.name.trim().length < 2) return toast('نام ایجنت را بنویسید.', { tone: 'err' })
    mutate((x) => { const i = x.agents.agents.findIndex((y) => y.id === f.id); if (i >= 0) x.agents.agents[i] = f; else x.agents.agents.push(f) }, { action: 'ذخیرهٔ دسترسی ایجنت', target: f.name, after: Object.entries(f.scopes).filter(([, v]) => v !== 'none').map(([k, v]) => `${k}:${v}`).join(', ') })
    toast('دسترسی‌ها ذخیره شد.'); onClose()
  }
  return <Modal wide open onClose={onClose} title={a.name ? `دسترسی ${a.name}` : 'ایجنت تازه'} footer={<><Button variant="primary" onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="نام"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثلاً دستیار پشتیبانی" /></Field><Field label="کارش چیست؟"><Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="نوع اتصال"><Segmented value={f.conn} onChange={(v) => setF({ ...f, conn: v })} options={[['MCP', 'MCP'], ['REST API', 'REST API'], ['Webhook', 'Webhook']]} /></Field>
        <Field label="سقف اقدام روزانه"><Input className="ltr" inputMode="numeric" value={String(f.limits.perDay)} onChange={(e) => setF({ ...f, limits: { ...f.limits, perDay: Number(e.target.value.replace(/\D/g, '')) || 0 } })} /></Field>
        <Field label="ساعت مجاز کار"><Input value={f.limits.hours} onChange={(e) => setF({ ...f, limits: { ...f.limits, hours: e.target.value } })} /></Field>
      </div>
      <Field label="دسترسی به هر بخش" help="پول، قیمت، مرجوعی، تیم و تنظیمات هیچ‌وقت «اجرای مستقیم» نمی‌گیرند.">
        <div className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">{mods.map((m) => { const v = f.scopes[m.id] ?? 'none'; const locked = LOCKED.includes(m.id)
          return <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-13"><span>{m.label} <span className="text-11 text-t3">· {m.group}</span>{locked && <ShieldAlert size={13} className="ms-1 inline text-warning" />}</span>
            <select aria-label={`دسترسی ${m.label}`} className="h-9 rounded-md border border-line bg-surface px-2 text-12" value={v} onChange={(e) => setF({ ...f, scopes: { ...f.scopes, [m.id]: e.target.value as AgentLevel } })}>{LEVELS.filter(([k]) => !(locked && k === 'auto')).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div> })}</div>
      </Field>
      <Field label="دستورالعمل‌هایی که این ایجنت باید بداند"><div className="flex flex-wrap gap-1.5">{d.agents.playbooks.map((p) => { const on = f.playbooks.includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => setF({ ...f, playbooks: on ? f.playbooks.filter((x) => x !== p.id) : [...f.playbooks, p.id] })} className={cx('h-8 rounded-full border px-3 text-12', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{p.title}</button> })}</div></Field>
      <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2">بازگشت وجه، تغییر قیمت، تخفیف، حذف، تغییر دسترسی و هر کار مالی برای ایجنت همیشه بسته است؛ حتی اگر در دستور بخواهید.</p>
    </div>
  </Modal>
}

// ───────── کارهای امروز و صف تأیید ─────────
function Tasks() {
  const d = useDB(); const nav = useNavigate()
  const [agentId, setAgentId] = useState(d.agents.agents[0]?.id ?? ''); const [title, setTitle] = useState(''); const [sch, setSch] = useState<AgentTask['schedule']>('once'); const [at, setAt] = useState('اکنون')
  const add = () => { if (title.trim().length < 6) return toast('کار را کامل بنویسید.', { tone: 'err' })
    mutate((x) => { x.agents.tasks.unshift({ id: uid('tk'), agentId, title: title.trim(), schedule: sch, at: sch === 'once' ? 'اکنون' : at, status: 'queued', by: 'بهشاد', createdAt: now() }) }, { action: 'دستور تازه به ایجنت', target: title.trim() }); setTitle(''); toast('کار به صف ایجنت اضافه شد.') }
  return <div className="space-y-4">
    <Card title="به ایجنت کار بدهید">
      <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
        <Field label="ایجنت"><Select value={agentId} onChange={setAgentId} options={d.agents.agents.map((a) => [a.id, a.name] as [string, string])} /></Field>
        <Field label="کار امروز (به زبان خودتان)"><Textarea rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: سفارش‌هایی که بیش از ۲۴ ساعت در «آماده‌سازی» مانده‌اند را پیدا کن و برای هر کدام علت و پیشنهاد بنویس" /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3"><Field label="زمان"><Segmented value={sch} onChange={setSch} options={[['once', 'یک بار، همین حالا'], ['daily', 'هر روز'], ['weekly', 'هر هفته']]} /></Field>{sch !== 'once' && <Field label="ساعت"><Input className="w-28" value={at} onChange={(e) => setAt(e.target.value)} placeholder="۰۹:۰۰" /></Field>}<Button variant="primary" icon={<Sparkles size={16} />} onClick={add}>اضافه به صف</Button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{['تیکت‌های بی‌پاسخ را پیش‌نویس کن', 'سفارش‌های پرریسک امروز را بررسی کن', 'کالاهای کم‌موجودی را با پیشنهاد خرید بیاور', 'برای کالاهای پیش‌نویس توضیح و سئو بنویس', 'گزارش فروش و سود هفته را خلاصه کن'].map((x) => <button key={x} type="button" onClick={() => setTitle(x)} className="rounded-full border border-line px-3 py-1 text-12 hover:border-brand/50">{x}</button>)}</div>
    </Card>
    {d.agents.tasks.map((t) => <TaskCard key={t.id} t={t} onOpen={(to) => nav(to)} />)}
  </div>
}

function TaskCard({ t, onOpen }: { t: AgentTask; onOpen: (to: string) => void }) {
  const d = useDB(); const a = d.agents.agents.find((x) => x.id === t.agentId)
  const run = async () => {
    if (a?.status !== 'active') return toast('این ایجنت متوقف است؛ اول فعالش کنید.', { tone: 'err' })
    mutate((x) => { x.agents.tasks.find((y) => y.id === t.id)!.status = 'running' }, { action: 'اجرای کار ایجنت', target: t.title, ai: true })
    try { await fakeCall(true, 1200) } catch { mutate((x) => { const y = x.agents.tasks.find((z) => z.id === t.id)!; y.status = 'failed'; y.result = 'سرویس هوش مصنوعی پاسخ نداد؛ دوباره امتحان کنید.' }); return }
    const db = d; const props: Proposal[] = []
    if (t.agentId === 'ag-support') db.tickets.filter((k) => !['ticket.closed', 'ticket.answered'].includes(k.status)).slice(0, 3).forEach((k) => props.push({ id: uid('p'), kind: 'پاسخ تیکت', target: k.id, text: `سلام، پیام شما دربارهٔ «${k.subject}» را دیدیم. پرونده را بررسی می‌کنیم و تا پایان امروز نتیجه را همین‌جا اعلام می‌کنیم.`, state: 'pending' }))
    else if (t.agentId === 'ag-ops') db.orders.filter((o) => o.risk >= 50 || o.status === 'order.needs_decision').slice(0, 3).forEach((o) => props.push({ id: uid('p'), kind: 'بررسی سفارش', target: o.id, text: o.risk >= 50 ? `امتیاز ریسک ${fa(o.risk)}. پیشنهاد: پیش از ارسال تماس تلفنی برای تأیید هویت و نشانی.` : 'کمبود موجودی؛ پیشنهاد: پیامک به مشتری برای انتخاب جایگزین یا ارسال از انبار دیگر.', state: 'pending' }))
    else db.products.slice(0, 2).forEach((p) => props.push({ id: uid('p'), kind: 'توضیح کالا', target: p.id, text: `پیش‌نویس توضیح تازه برای «${p.title}» با حفظ وضعیت، گرید و ایرادهای ثبت‌شده.`, state: 'pending' }))
    mutate((x) => { const y = x.agents.tasks.find((z) => z.id === t.id)!; y.status = props.length ? 'needs_approval' : 'done'; y.result = props.length ? `${fa(props.length)} پیشنهاد آماده است.` : 'موردی پیدا نشد.'; y.proposals = props
      const g = x.agents.agents.find((z) => z.id === t.agentId)!; g.actionsToday += props.length + 1; g.lastActive = now() })
    log(t.agentId, 'اجرای کار', t.title, props.length ? 'pending' : 'ok')
  }
  const decide = (p: Proposal, ok: boolean) => {
    mutate((x) => { const y = x.agents.tasks.find((z) => z.id === t.id)!; const q = y.proposals!.find((z) => z.id === p.id)!; q.state = ok ? 'approved' : 'rejected'
      if (ok && p.kind === 'پاسخ تیکت') { const k = x.tickets.find((z) => z.id === p.target); if (k) { k.messages.push({ from: 'agent', text: p.text, at: now() }); k.status = 'ticket.answered' } }
      if (ok && p.kind === 'بررسی سفارش') { const o = x.orders.find((z) => z.id === p.target); if (o && !o.tags.includes('تماس برای تأیید')) o.tags.push('تماس برای تأیید') }
      if (y.proposals!.every((z) => z.state !== 'pending')) y.status = 'done' }, { action: ok ? 'تأیید پیشنهاد ایجنت' : 'رد پیشنهاد ایجنت', target: p.target, after: p.text, ai: true })
    log(t.agentId, ok ? `اجرای «${p.kind}» پس از تأیید` : `رد «${p.kind}»`, p.target, 'ok')
  }
  const to = (p: Proposal) => p.kind === 'پاسخ تیکت' ? '/admin/support' : p.kind === 'بررسی سفارش' ? `/admin/orders/${p.target}` : `/admin/catalog/${p.target}`
  return <Card title={<span className="flex flex-wrap items-center gap-2">{t.title}<Badge tone={TONE[t.status]}>{TLABEL[t.status]}</Badge></span>} actions={(t.status === 'queued' || t.status === 'failed' || (t.status === 'done' && t.schedule !== 'once')) && <Button size="sm" icon={<Play size={14} />} onClick={run}>اجرا همین حالا</Button>}>
    <p className="text-12 text-t2">{a?.name} · {t.schedule === 'once' ? 'یک بار' : t.schedule === 'daily' ? `هر روز ${t.at}` : `هر هفته ${t.at}`} · ثبت: {t.by} · {rel(t.createdAt)}</p>
    {t.result && <p className="mt-2 rounded-md bg-neutral-bg px-3 py-2 text-13">{t.result}</p>}
    {t.proposals && t.proposals.length > 0 && <ul className="mt-3 space-y-2">{t.proposals.map((p) => <li key={p.id} className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-12"><b>{p.kind}</b> · <button type="button" className="ltr font-mono text-brand underline" onClick={() => onOpen(to(p))}>{p.target}</button></span>
        {p.state === 'pending' ? <span className="flex gap-1.5"><Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => decide(p, true)}>تأیید و اجرا</Button><Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => decide(p, false)}>رد</Button></span> : <Badge tone={p.state === 'approved' ? 'success' : 'neutral'}>{p.state === 'approved' ? 'تأیید و اجرا شد' : 'رد شد'}</Badge>}</div>
      <p className="mt-1.5 text-13">{p.text}</p></li>)}</ul>}
  </Card>
}

// ───────── آموزش و دستورالعمل ─────────
function Playbooks() {
  const d = useDB(); const [open, setOpen] = useState<string | null>(null)
  const p = d.agents.playbooks.find((x) => x.id === open)
  const [f, setF] = useState({ title: '', area: 'همه', body: '', good: '', bad: '' })
  const edit = (id: string | null) => { const q = d.agents.playbooks.find((x) => x.id === id); setF(q ? { title: q.title, area: q.area, body: q.body, good: q.good ?? '', bad: q.bad ?? '' } : { title: '', area: 'همه', body: '', good: '', bad: '' }); setOpen(id ?? 'new') }
  const save = () => { if (f.title.trim().length < 3 || f.body.trim().length < 20) return toast('عنوان و متن دستورالعمل را کامل کنید.', { tone: 'err' })
    mutate((x) => { const q = x.agents.playbooks.find((y) => y.id === open); if (q) Object.assign(q, f, { updatedAt: now() }); else x.agents.playbooks.push({ id: uid('pb'), ...f, agents: [], updatedAt: now() }) }, { action: 'ذخیرهٔ دستورالعمل ایجنت', target: f.title }); setOpen(null); toast('دستورالعمل ذخیره شد؛ ایجنت‌های متصل از اجرای بعدی از آن پیروی می‌کنند.') }
  return <>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-13 text-t2">هر چیزی که می‌خواهید ایجنت‌ها «یاد بگیرند» این‌جا بنویسید: لحن، قوانین، کی ارجاع بدهند، نمونهٔ پاسخ خوب و بد.</p><Button variant="primary" icon={<Plus size={16} />} onClick={() => edit(null)}>دستورالعمل تازه</Button></div>
    <div className="grid gap-4 lg:grid-cols-2">{d.agents.playbooks.map((q) => <Card key={q.id} title={q.title} actions={<Button size="sm" variant="ghost" onClick={() => edit(q.id)}>ویرایش</Button>}>
      <p className="text-12 text-t3">{q.area} · به‌روز {rel(q.updatedAt)} · {q.agents.map((x) => d.agents.agents.find((a) => a.id === x)?.name).filter(Boolean).join('، ') || 'به هیچ ایجنتی وصل نیست'}</p>
      <p className="mt-2 line-clamp-4 text-13">{q.body}</p>
      {q.good && <p className="mt-2 rounded-md bg-success-bg px-3 py-1.5 text-12 text-success">نمونهٔ خوب: {q.good}</p>}
      {q.bad && <p className="mt-1 rounded-md bg-danger-bg px-3 py-1.5 text-12 text-danger">نمونهٔ بد: {q.bad}</p>}
    </Card>)}</div>
    <Modal wide open={!!open} onClose={() => setOpen(null)} title={p ? `ویرایش ${p.title}` : 'دستورالعمل تازه'} footer={<><Button variant="primary" onClick={save}>ذخیره</Button><Button variant="ghost" onClick={() => setOpen(null)}>انصراف</Button></>}>
      <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="عنوان"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="حوزه"><Select value={f.area} onChange={(v) => setF({ ...f, area: v })} options={['همه', 'پشتیبانی', 'سفارش‌ها', 'کاتالوگ', 'بازاریابی', 'مدیریت']} /></Field></div>
        <Field label="دستورالعمل" help="مثل آموزش دادن به یک همکار تازه بنویسید: چه کار کند، چه کار نکند، کی بپرسد."><Textarea rows={7} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="نمونهٔ پاسخ خوب"><Textarea rows={2} value={f.good} onChange={(e) => setF({ ...f, good: e.target.value })} /></Field><Field label="نمونهٔ پاسخ بد"><Textarea rows={2} value={f.bad} onChange={(e) => setF({ ...f, bad: e.target.value })} /></Field></div></div>
    </Modal>
  </>
}

// ───────── اتوماسیون‌ها ─────────
function Automations() {
  const d = useDB(); const [nw, setNw] = useState(false)
  const [f, setF] = useState({ name: '', trigger: TRIGGERS[0], condition: '', agentId: d.agents.agents[0]?.id ?? '', action: '', approval: true })
  const add = (t?: typeof TEMPLATES[number]) => { const v = t ? { name: t.title, trigger: t.trigger, condition: '—', agentId: t.agent, action: t.action, approval: t.approval } : f
    if (!t && (v.name.trim().length < 3 || v.action.trim().length < 6)) return toast('نام و کار اتوماسیون را بنویسید.', { tone: 'err' })
    mutate((x) => { x.agents.automations.push({ id: uid('au'), ...v, on: true, runs: 0 }) }, { action: 'اتوماسیون تازه', target: v.name }); setNw(false); toast('اتوماسیون فعال شد.') }
  return <div className="space-y-4">
    <div className="flex justify-end"><Button variant="primary" icon={<Plus size={16} />} onClick={() => setNw(true)}>اتوماسیون دلخواه</Button></div>
    <Card title="اتوماسیون‌های فعال" pad={false}><ul className="divide-y divide-line">{d.agents.automations.map((au) => <li key={au.id} className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1"><p className="text-13 font-semibold">{au.name}</p><p className="text-12 text-t2">وقتی «{au.trigger}»{au.condition !== '—' && ` و ${au.condition}`} ← {d.agents.agents.find((a) => a.id === au.agentId)?.name}: {au.action}</p><p className="text-11 text-t3">{au.approval ? 'با تأیید شما' : 'بدون تأیید (فقط کار کم‌خطر)'} · {fa(au.runs)} بار اجرا{au.lastRun && ` · آخرین ${rel(au.lastRun)}`}</p></div>
      <Toggle on={au.on} onChange={(v) => mutate((x) => { x.agents.automations.find((y) => y.id === au.id)!.on = v }, { action: v ? 'روشن کردن اتوماسیون' : 'خاموش کردن اتوماسیون', target: au.name })} label={`روشن یا خاموش ${au.name}`} />
    </li>)}</ul></Card>
    <Card title="الگوهای آماده"><div className="grid gap-3 md:grid-cols-2">{TEMPLATES.filter((t) => !d.agents.automations.some((a) => a.name === t.title)).map((t) => <div key={t.title} className="rounded-md border border-line p-3"><p className="text-13 font-semibold">{t.title} <span className="text-11 font-normal text-t3">· {t.area}</span></p><p className="mt-1 text-12 text-t2">{t.action}</p><Button size="sm" className="mt-2" onClick={() => add(t)}>افزودن</Button></div>)}{TEMPLATES.every((t) => d.agents.automations.some((a) => a.name === t.title)) && <p className="text-12 text-t2">همهٔ الگوها اضافه شده‌اند.</p>}</div></Card>
    <Modal open={nw} onClose={() => setNw(false)} title="اتوماسیون دلخواه" footer={<><Button variant="primary" onClick={() => add()}>افزودن</Button><Button variant="ghost" onClick={() => setNw(false)}>انصراف</Button></>}>
      <div className="space-y-3"><Field label="نام"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="وقتی"><Select value={f.trigger} onChange={(v) => setF({ ...f, trigger: v })} options={TRIGGERS} /></Field><Field label="شرط (اختیاری)"><Input value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })} placeholder="مثلاً مبلغ بالای ۵۰ میلیون" /></Field>
        <Field label="ایجنت"><Select value={f.agentId} onChange={(v) => setF({ ...f, agentId: v })} options={d.agents.agents.map((a) => [a.id, a.name] as [string, string])} /></Field><Field label="چه کار کند"><Textarea rows={3} value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} /></Field><Toggle on={f.approval} onChange={(v) => setF({ ...f, approval: v })} text="قبل از اجرا از من تأیید بگیرد" /></div>
    </Modal>
  </div>
}

// ───────── گزارش فعالیت ─────────
function Log() {
  const d = useDB(); const [ag, setAg] = useState('all')
  const rows = d.agents.log.filter((l) => ag === 'all' || l.agentId === ag)
  return <Card title="هر کاری که ایجنت‌ها کرده‌اند یا خواسته‌اند بکنند" actions={<Select value={ag} onChange={setAg} options={[['all', 'همهٔ ایجنت‌ها'] as [string, string], ...d.agents.agents.map((a) => [a.id, a.name] as [string, string])]} />} pad={false}>
    <ul className="divide-y divide-line">{rows.map((l) => <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-13"><Badge tone={l.result === 'ok' ? 'success' : l.result === 'pending' ? 'warning' : 'danger'}>{l.result === 'ok' ? 'انجام شد' : l.result === 'pending' ? 'منتظر تأیید' : 'جلوگیری شد'}</Badge><span className="min-w-0 flex-1">{d.agents.agents.find((a) => a.id === l.agentId)?.name}: {l.action} · <span className="ltr font-mono text-12">{l.target}</span>{l.note && <span className="block text-12 text-danger">{l.note}</span>}</span><span className="text-12 text-t3">{rel(l.at)}</span></li>)}
      {!rows.length && <li className="p-4 text-12 text-t2">فعالیتی ثبت نشده است.</li>}</ul>
    <p className="border-t border-line px-4 py-2 text-11 text-t3">همهٔ این موارد با نشان هوش مصنوعی در لاگ ممیزی سیستم هم ثبت می‌شود.</p>
  </Card>
}

// ───────── راهنمای اتصال ─────────
function Connect() {
  const mcp = `{
  "mcpServers": {
    "ghanimat": {
      "url": "https://api.ghanimat.com/mcp",
      "headers": { "Authorization": "Bearer <AGENT_TOKEN>" }
    }
  }
}`
  const rest = `curl https://api.ghanimat.com/api/v1/orders?status=order.preparing \\
  -H "Authorization: Bearer <AGENT_TOKEN>"`
  const tools = [['list_orders / get_order', 'خواندن سفارش‌ها و مرسوله‌ها'], ['list_tickets / draft_ticket_reply', 'خواندن تیکت و ساخت پیش‌نویس پاسخ (تأیید با شما)'], ['list_products / draft_product_copy', 'خواندن کالا و پیش‌نویس توضیح و سئو'], ['low_stock_report', 'کالاهای کم‌موجودی با فروش ۳۰ روز'], ['daily_summary', 'خلاصهٔ فروش، سود و کارهای گیرکرده'], ['propose_action', 'پیشنهاد هر اقدام دیگر برای صف تأیید'], ['get_playbooks', 'خواندن دستورالعمل‌های وصل‌شده به همان ایجنت']]
  const Code = ({ v }: { v: string }) => <div className="relative"><pre className="ltr overflow-x-auto rounded-md bg-[#10123d] p-3 pr-11 text-12 leading-6 text-white">{v}</pre><button type="button" aria-label="کپی" onClick={() => { copyText(v); toast('کپی شد.') }} className="absolute right-2 top-2 rounded-md bg-white/10 p-1.5 text-white hover:bg-white/20"><Copy size={14} /></button></div>
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="سه قدم تا اتصال"><ol className="list-decimal space-y-2 ps-5 text-13">
      <li>در زبانهٔ «ایجنت‌ها» یک ایجنت بسازید و فقط بخش‌هایی را که لازم دارد باز کنید.</li>
      <li>«صدور کلید» بزنید و کلید را در تنظیمات ابزار هوش مصنوعی‌تان بگذارید (نمونهٔ MCP کنار همین کارت).</li>
      <li>در زبانهٔ «آموزش و دستورالعمل» قوانین را بنویسید و به ایجنت وصل کنید؛ بعد در «کارهای امروز» کار بدهید یا اتوماسیون روشن کنید.</li></ol>
      <p className="mt-3 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">در نسخهٔ نمایشی اتصال شبیه‌سازی می‌شود. سرور MCP و API را توسعه‌دهنده طبق مستندات مخزن می‌سازد.</p></Card>
    <Card title="پیکربندی MCP"><Code v={mcp} /><p className="mt-2 text-12 text-t2">به‌جای <span className="ltr font-mono">AGENT_TOKEN</span> کلیدی را بگذارید که از «صدور کلید» گرفتید. برای ابزارهایی که از MCP پشتیبانی می‌کنند (دستیارهای دسکتاپ، ابزارهای کدنویسی و SDK ایجنت‌ها).</p></Card>
    <Card title="ابزارهایی که ایجنت می‌بیند" pad={false}><ul className="divide-y divide-line">{tools.map(([k, v]) => <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-13"><span className="ltr font-mono text-12">{k}</span><span className="text-t2">{v}</span></li>)}</ul></Card>
    <Card title="فراخوانی مستقیم API"><Code v={rest} /><p className="mt-2 text-12 text-t2">همهٔ مسیرها در <span className="ltr font-mono">docs/developer/openapi.yaml</span>. کلید فقط به بخش‌هایی دسترسی دارد که در دسترسی ایجنت باز کرده‌اید.</p></Card>
  </div>
}
