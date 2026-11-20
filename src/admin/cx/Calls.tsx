import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Headphones, Pause, Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Play, Voicemail } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, mask, pct, rel } from '@/shared/lib/fa'
import { useTab } from '../pages/_shared'

const dur = (s: number) => `${fa(Math.floor(s / 60))}:${fa(String(s % 60).padStart(2, '0'))}`
const ST_T = { 'پاسخ‌داده': 'success', 'از دست رفته': 'danger', 'پیغام صوتی': 'warning', 'در صف': 'info' } as const

/** تلفن ابری: همهٔ تماس‌ها با ضبط مکالمه، تماس‌های از دست رفته برای تماس دوباره، صف‌ها، منوی صوتی و کارشناسان */
export function Calls() {
  const d = useDB(); const nav = useNavigate(); const C = d.calls; const [tab, setTab] = useTab('log'); const [f, setF] = useState('all'); const [play, setPlay] = useState<string | null>(null); const [open, setOpen] = useState<string | null>(null)
  const missed = C.calls.filter((c) => c.status === 'از دست رفته' && !c.callbackDone)
  const ans = C.calls.filter((c) => c.status === 'پاسخ‌داده'); const inCalls = C.calls.filter((c) => c.dir === 'in')
  const rows = C.calls.filter((c) => f === 'all' || (f === 'missed' ? c.status === 'از دست رفته' : f === 'in' ? c.dir === 'in' : f === 'out' ? c.dir === 'out' : c.status === 'پیغام صوتی'))
  const cust = (id?: string) => d.customers.find((x) => x.id === id)
  const sel = C.calls.find((c) => c.id === open)
  const upd = (id: string, fn: (c: (typeof C.calls)[number]) => void, action: string) => mutate((x) => fn(x.calls.calls.find((c) => c.id === id)!), { action, target: id })
  return (
    <Page title="تلفن و تماس‌ها" module="calls" sub="تلفن ابری: تماس‌ها، ضبط مکالمه، صف‌ها و منوی صوتی، همه کنار پروندهٔ مشتری"
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'log', label: 'تماس‌ها', count: missed.length }, { id: 'agents', label: 'کارشناسان' }, { id: 'ivr', label: 'منوی صوتی و ساعت کاری' }, { id: 'connect', label: 'اتصال تلفن ابری' }]} />}>
      <div className="space-y-4">
        {!C.provider.connected && <p className="rounded-xl bg-info-bg px-3 py-2 text-12 text-info">تلفن ابری هنوز وصل نشده است؛ داده‌های این صفحه نمونه است. از تب «اتصال تلفن ابری» شمارهٔ مجازی را وصل کنید.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="تماس امروز" value={fa(C.calls.length)} note={`${fa(inCalls.length)} ورودی · ${fa(C.calls.length - inCalls.length)} خروجی`} />
          <KPI label="از دست رفته منتظر تماس دوباره" value={fa(missed.length)} tone={missed.length ? 'danger' : 'success'} />
          <KPI label="نرخ پاسخ تماس ورودی" value={pct(inCalls.filter((c) => c.status === 'پاسخ‌داده').length * 100 / Math.max(1, inCalls.length))} />
          <KPI label="میانگین انتظار در صف" value={`${fa(Math.round(ans.reduce((a, c) => a + c.waitSec, 0) / Math.max(1, ans.length)))} ثانیه`} />
        </div>
        {tab === 'log' && <Card pad={false} title="تماس‌ها" actions={<Segmented size="sm" value={f} onChange={setF} options={[['all', 'همه'], ['missed', 'از دست رفته'], ['in', 'ورودی'], ['out', 'خروجی'], ['vm', 'پیغام صوتی']]} />}>
          <ul className="divide-y divide-line">{rows.map((c) => { const cu = cust(c.customerId); const I = c.status === 'از دست رفته' ? PhoneMissed : c.status === 'پیغام صوتی' ? Voicemail : c.dir === 'in' ? PhoneIncoming : PhoneOutgoing; return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-13">
              <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', c.status === 'از دست رفته' ? 'bg-danger-bg text-danger' : 'bg-brand-tint text-brand')}><I size={16} /></span>
              <button className="min-w-40 text-right" onClick={() => setOpen(c.id)}><b className="block">{cu?.name ?? 'شمارهٔ ناشناس'}</b><span className="ltr block text-right text-11 text-t2">{mask(c.number)}</span></button>
              <span className="text-12 text-t2">{c.queue} · {c.agent}</span>
              <Badge tone={ST_T[c.status]}>{c.status}{c.callbackDone ? ' · تماس دوباره شد' : ''}</Badge>
              <span className="tnum text-12 text-t2">{c.durSec ? dur(c.durSec) : '—'} · انتظار {fa(c.waitSec)} ثانیه</span>
              <span className="mr-auto flex items-center gap-2">
                {c.recording && <Button size="sm" variant="ghost" icon={play === c.id ? <Pause size={13} /> : <Play size={13} />} onClick={() => setPlay(play === c.id ? null : c.id)}>{play === c.id ? 'توقف' : 'ضبط مکالمه'}</Button>}
                {c.status !== 'پاسخ‌داده' && !c.callbackDone && <Button size="sm" variant="primary" icon={<PhoneCall size={13} />} onClick={() => { upd(c.id, (x) => { x.callbackDone = true }, 'تماس دوباره با مشتری'); toast('تماس از داخلی شما برقرار می‌شود.') }}>تماس دوباره</Button>}
                <span className="text-11 text-t3">{rel(c.at)}</span></span>
              {play === c.id && <div className="w-full rounded-xl bg-surface-2 p-2"><div className="h-2 overflow-hidden rounded-full bg-line"><span className="block h-full w-1/3 animate-pulse rounded-full bg-brand-solid" /></div><p className="mt-1 text-11 text-t2">پخش ضبط مکالمه ({dur(c.durSec)}) · دسترسی به ضبط‌ها در لاگ ممیزی ثبت می‌شود.</p></div>}
            </li>) })}</ul>
        </Card>}
        {tab === 'agents' && <div className="grid gap-3 md:grid-cols-3">{C.agents.map((a) => <Card key={a.ext} title={<span className="flex items-center gap-2"><Headphones size={15} />{a.name}<span className="ltr text-11 text-t3">داخلی {a.ext}</span></span>} actions={<Badge tone={a.state === 'آزاد' ? 'success' : a.state === 'در تماس' ? 'info' : 'neutral'}>{a.state}</Badge>}>
          <p className="text-13">امروز {fa(a.today)} تماس</p><p className="text-12 text-t2">میانگین امتیاز: {fa((C.calls.filter((c) => c.agent === a.name && c.rating).reduce((x, c) => x + (c.rating ?? 0), 0) / Math.max(1, C.calls.filter((c) => c.agent === a.name && c.rating).length)).toFixed(1))} از ۵</p>
          <div className="mt-2"><Segmented size="sm" value={a.state} onChange={(v) => mutate((x) => { x.calls.agents.find((y) => y.ext === a.ext)!.state = v }, { action: 'تغییر وضعیت کارشناس تلفن', target: a.name, after: v })} options={[['آزاد', 'آزاد'], ['استراحت', 'استراحت'], ['آفلاین', 'آفلاین']]} /></div></Card>)}</div>}
        {tab === 'ivr' && <div className="grid gap-4 lg:grid-cols-2">
          <Card title="منوی صوتی (وقتی مشتری زنگ می‌زند)">{C.ivr.map((o, i) => <div key={o.key} className="mb-2 flex items-center gap-2"><span className="tnum grid size-8 place-items-center rounded-lg bg-brand-tint font-bold text-brand">{fa(o.key)}</span><Input className="flex-1" defaultValue={o.label} onBlur={(e) => mutate((x) => { x.calls.ivr[i].label = e.target.value }, { action: 'ویرایش منوی صوتی', target: o.key })} /><Input className="w-40" defaultValue={o.queue} onBlur={(e) => mutate((x) => { x.calls.ivr[i].queue = e.target.value }, { action: 'ویرایش صف منوی صوتی', target: o.key })} /></div>)}
            <p className="mt-2 text-11 text-t2">اگر شماره در پروندهٔ مشتریان باشد، تماس مستقیم به آخرین کارشناس همان مشتری می‌رود و پنجرهٔ پرونده‌اش برای کارشناس باز می‌شود.</p></Card>
          <Card title="ساعت کاری و پیغام"><div className="grid grid-cols-2 gap-3"><Field label="از"><Input type="time" className="ltr" defaultValue={C.hours.from} onBlur={(e) => mutate((x) => { x.calls.hours.from = e.target.value })} /></Field><Field label="تا"><Input type="time" className="ltr" defaultValue={C.hours.to} onBlur={(e) => mutate((x) => { x.calls.hours.to = e.target.value })} /></Field></div><Field label="پیغام خارج از ساعت کاری"><Textarea rows={3} defaultValue={C.hours.offMsg} onBlur={(e) => mutate((x) => { x.calls.hours.offMsg = e.target.value }, { action: 'ویرایش پیغام خارج از ساعت', target: 'تلفن' })} /></Field>
            <div className="mt-3 space-y-2 text-13"><Toggle on={C.provider.recordAll} onChange={(v) => mutate((x) => { x.calls.provider.recordAll = v })} text="ضبط همهٔ مکالمه‌ها" /><Toggle on={C.provider.announce} onChange={(v) => mutate((x) => { x.calls.provider.announce = v })} text="اعلام «این مکالمه ضبط می‌شود» در ابتدای تماس" /></div></Card>
        </div>}
        {tab === 'connect' && <Card title="اتصال تلفن ابری">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="سرویس‌دهنده"><Input placeholder="نام سرویس تلفن ابری" defaultValue={C.provider.name} onBlur={(e) => mutate((x) => { x.calls.provider.name = e.target.value })} /></Field><Field label="شمارهٔ مجازی"><Input className="ltr text-left" defaultValue={C.provider.did} onBlur={(e) => mutate((x) => { x.calls.provider.did = e.target.value })} /></Field></div>
          <p className="mt-2 text-12 text-t2">کلید API سرویس در «مرکز اتصالات و API» ذخیره می‌شود. بعد از اتصال، تماس‌ها، ضبط‌ها و وضعیت کارشناسان خودکار اینجا می‌آید و روی کارت هر مشتری «تماس» با یک کلیک برقرار می‌شود.</p>
          <Button className="mt-3" variant="primary" icon={<Phone size={14} />} onClick={() => { mutate((x) => { x.calls.provider.connected = true }, { action: 'اتصال تلفن ابری', target: C.provider.did }); toast('تلفن ابری وصل شد (نمایشی).') }}>{C.provider.connected ? 'وصل است' : 'اتصال'}</Button>
        </Card>}
      </div>
      <Modal open={!!sel} onClose={() => setOpen(null)} title={sel ? `تماس ${sel.id}` : ''} footer={sel && <>{sel.customerId && <Button onClick={() => nav(`/admin/customers/${sel.customerId}`)}>پروندهٔ مشتری</Button>}{sel.ticketId ? <Button variant="ghost" onClick={() => nav(`/admin/support?t=${sel.ticketId}`)}>تیکت {sel.ticketId}</Button> : <Button variant="ghost" onClick={() => { const id = `TK-${Date.now().toString().slice(-6)}`; mutate((x) => { x.tickets.unshift({ id, customerId: sel.customerId ?? 'c1', orderId: '', subject: `تماس تلفنی ${sel.id}`, channel: 'تلفن', status: 'ticket.open', priority: 'عادی', sla: new Date(Date.now() + 4 * 36e5).toISOString(), assignee: sel.agent, sentiment: 'خنثی', messages: [{ from: 'agent', text: sel.note || 'ثبت از تماس تلفنی', at: new Date().toISOString() }] }); x.calls.calls.find((c) => c.id === sel.id)!.ticketId = id }, { action: 'ساخت تیکت از تماس', target: sel.id }); toast(`تیکت ${id} ساخته شد.`) }}>ساخت تیکت از این تماس</Button>}</>}>
        {sel && <div className="space-y-2 text-13"><p>{cust(sel.customerId)?.name ?? 'شمارهٔ ناشناس'} · <span className="ltr">{mask(sel.number)}</span></p><p className="text-t2">{sel.dir === 'in' ? 'ورودی' : 'خروجی'} · {sel.queue} · {sel.agent} · {sel.durSec ? dur(sel.durSec) : 'بدون مکالمه'}</p>
          <Field label="یادداشت مکالمه"><Textarea rows={3} defaultValue={sel.note ?? ''} onBlur={(e) => upd(sel.id, (x) => { x.note = e.target.value }, 'یادداشت تماس')} /></Field></div>}
      </Modal>
    </Page>
  )
}
