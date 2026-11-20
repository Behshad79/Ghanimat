import { useState } from 'react'
import { Bot, MessageSquare, Send, ShieldCheck, Smartphone } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fa, left, mask, minsLeft, rel } from '@/shared/lib/fa'
import { STATUS } from '@/shared/data/statuses'
import { SMS_MENU, type RemoteMsg } from '@/shared/data/remote'
import type { DB, Order } from '@/shared/data/seed'
import { useTab } from '../pages/_shared'
import { shipBlocked } from '../orders/PayHold'

type Act = 'approve' | 'packed' | 'handover' | 'delivered' | 'phone' | 'cancel'
const ACTS: [Act, string][] = [['approve', 'تأیید و آماده‌سازی'], ['packed', 'بسته‌بندی شد'], ['handover', 'تحویل به پیک یا پست'], ['delivered', 'تحویل شد'], ['phone', 'شمارهٔ مشتری'], ['cancel', 'لغو با دلیل']]
const byNum: Record<string, Act> = { '1': 'approve', '2': 'packed', '3': 'handover', '4': 'delivered', '5': 'phone', '9': 'cancel' }

/** متن اعلان سفارش، همان چیزی که در تلگرام یا پیامک می‌رسد */
export const orderAlert = (d: DB, o: Order) => { const s = o.shipments[0]; const items = o.shipments.flatMap((x) => x.items).map((i) => d.products.find((p) => p.id === i.productId)?.title ?? '').join(' و '); const c = d.customers.find((x) => x.id === o.customerId)
  return `سفارش ${o.id} · ${c?.name ?? ''} (${c?.city ?? ''}) · ${items} · ${s?.method ?? ''} · ${s ? `${left(s.sla)} مهلت` : ''} · وضعیت: ${STATUS[o.status]?.label ?? o.status}` }

/** اجرای فرمان روی سفارش؛ همان کاری که دکمه‌های پنل می‌کنند، با ثبت در لاگ ممیزی */
function run(d: DB, o: Order, a: Act, via: string): { ok: boolean; reply: string } {
  const who = `${currentUser()?.name ?? 'مدیر'} از ${via}`
  const set = (fn: (x: Order) => void, label: string) => mutate((x) => fn(x.orders.find((y) => y.id === o.id)!), { action: `${label} (${via})`, target: o.id, after: who })
  if (['approve', 'packed', 'handover'].includes(a) && shipBlocked(o.id, true)) return { ok: false, reply: `سفارش ${o.id} منتظر پرداخت مابه‌التفاوت است؛ ارسال قفل است تا پرداخت یا اجازهٔ مدیر از پنل.` }
  if (a === 'approve') { if (!['order.paid', 'order.preparing'].includes(o.status) && !o.shipments.some((s) => ['ship.pending', 'ship.partner_confirm'].includes(s.status))) return { ok: false, reply: `سفارش ${o.id} در این مرحله قابل تأیید نیست (${STATUS[o.status]?.label}).` }; set((x) => { x.status = 'order.preparing'; x.shipments.forEach((s) => { if (['ship.pending', 'ship.partner_confirm'].includes(s.status)) s.status = 'ship.picking' }) }, 'تأیید سفارش'); return { ok: true, reply: `تأیید شد. ${o.id} وارد آماده‌سازی شد.` } }
  if (a === 'packed') { if (!o.shipments.some((s) => s.status === 'ship.picking')) return { ok: false, reply: 'اول باید تأیید و جمع‌آوری شود (۱).' }; set((x) => x.shipments.forEach((s) => { if (s.status === 'ship.picking') s.status = 'ship.packed' }), 'بسته‌بندی'); return { ok: true, reply: `بسته‌بندی ${o.id} ثبت شد. برای تحویل به پیک ۳ را بفرستید.` } }
  if (a === 'handover') { if (!o.shipments.some((s) => s.status === 'ship.packed')) return { ok: false, reply: 'بسته هنوز آماده نیست (۲).' }; set((x) => { x.shipments.forEach((s) => { if (s.status === 'ship.packed') s.status = 'ship.in_transit' }); x.status = 'order.shipped' }, 'تحویل به پیک یا پست'); return { ok: true, reply: `${o.id} تحویل پیک شد؛ پیامک پیگیری برای مشتری رفت.` } }
  if (a === 'delivered') { if (!o.shipments.some((s) => s.status === 'ship.in_transit')) return { ok: false, reply: 'مرسوله هنوز در راه نیست (۳).' }; set((x) => { x.shipments.forEach((s) => { if (s.status === 'ship.in_transit') s.status = 'ship.delivered' }); x.status = 'order.delivered' }, 'ثبت تحویل'); return { ok: true, reply: `تحویل ${o.id} ثبت شد.` } }
  if (a === 'phone') { const c = d.customers.find((x) => x.id === o.customerId); mutate(() => {}, { action: `مشاهدهٔ شمارهٔ مشتری (${via})`, target: o.id, after: who }); return { ok: true, reply: `${c?.name}: ${c?.mobile} (مشاهده در لاگ ممیزی ثبت شد)` } }
  set((x) => { x.status = 'order.needs_decision' }, 'درخواست لغو'); return { ok: true, reply: `${o.id} برای تصمیم لغو به صف «نیاز به تصمیم» رفت؛ دلیل را در پنل یا با پاسخ بعدی بنویسید.` }
}

/** ربات تلگرام و فرمان پیامکی: اعلان سفارش با مهلت، اقدام از همان‌جا، شمارهٔ مشتری با رمز، و پایش هر دو کانال */
export function Remote() {
  const d = useDB(); const R = d.remote; const [tab, setTab] = useTab('sim')
  const live = d.orders.filter((o) => o.shipments.some((s) => !['ship.delivered', 'ship.cancelled'].includes(s.status)) && !['order.cancelled', 'order.awaiting_payment'].includes(o.status)).sort((a, b) => (a.shipments[0]?.sla ?? '').localeCompare(b.shipments[0]?.sla ?? ''))
  const [oid, setOid] = useState(live[0]?.id ?? ''); const o = d.orders.find((x) => x.id === oid)
  const [sms, setSms] = useState(''); const [chat, setChat] = useState<{ me: boolean; text: string; btns?: boolean }[]>([])
  const [thread, setThread] = useState<{ me: boolean; text: string }[]>([])
  const log = (m: Omit<RemoteMsg, 'id' | 'at'>) => mutate((x) => { x.remote.log.unshift({ ...m, id: `rm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, at: new Date().toISOString() }) })
  const tgSend = () => { if (!o) return; if (!R.telegram.on) return toast('ربات تلگرام خاموش است.', { tone: 'err' }); const t = orderAlert(d, o); setChat((c) => [...c, { me: false, text: t, btns: true }]); log({ ch: 'تلگرام', dir: 'out', to: R.telegram.chats[0].name, text: t, orderId: o.id, ok: true }) }
  const tgPress = (a: Act) => { if (!o) return; setChat((c) => [...c, { me: true, text: ACTS.find((x) => x[0] === a)![1] }]); const r = run(d, o, a, 'تلگرام'); setChat((c) => [...c, { me: false, text: r.reply, btns: r.ok && a !== 'phone' && a !== 'delivered' }]); log({ ch: 'تلگرام', dir: 'in', to: R.telegram.chats[0].name, text: `[دکمه] ${ACTS.find((x) => x[0] === a)![1]} → ${r.reply}`, orderId: o.id, ok: r.ok }) }
  const smsSend = () => { if (!o) return; if (!R.sms.on) return toast('فرمان پیامکی خاموش است.', { tone: 'err' }); const t = `غنیمت: ${orderAlert(d, o)}. ${SMS_MENU.filter(([k]) => k !== '0').map(([k, l]) => `${fa(k)}=${l.split(' ')[0]}`).join(' ')}`; setThread((c) => [...c, { me: false, text: t }]); log({ ch: 'پیامک', dir: 'out', to: R.sms.allowed[0].phone, text: t, orderId: o.id, ok: true }) }
  const smsReply = () => { if (!o) return; const raw = sms.replace(/[۰-۹]/g, (x) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).trim(); setThread((c) => [...c, { me: true, text: sms }]); setSms('')
    const [n, pin] = raw.split(/\s+/); let reply: string; let ok = true
    if (n === '0') reply = `راهنما: ${SMS_MENU.map(([k, l]) => `${fa(k)} ${l}`).join(' · ')}. برای شماره: «۵ رمز»`
    else if (!byNum[n]) { reply = 'فرمان نامعتبر است؛ ۰ را برای راهنما بفرستید.'; ok = false }
    else if (byNum[n] === 'phone' && pin !== R.sms.pin) { reply = 'برای شمارهٔ مشتری رمز لازم است: «۵ رمز»'; ok = false }
    else { const r = run(d, o, byNum[n], 'پیامک'); reply = r.reply; ok = r.ok }
    setThread((c) => [...c, { me: false, text: reply }]); log({ ch: 'پیامک', dir: 'in', to: R.sms.allowed[0].phone, text: `${raw} → ${reply}`, orderId: o.id, ok }) }
  const upd = (fn: (x: DB['remote']) => void, action: string) => mutate((x) => fn(x.remote), { action, target: 'کنترل از راه دور' })
  const fails = R.log.filter((m) => m.ok === false).length
  return (
    <Page title="ربات تلگرام و فرمان پیامکی" module="remote" sub="بدون باز کردن پنل: خبر سفارش با مهلت، تأیید و جلو بردن مراحل، و شمارهٔ مشتری با رمز"
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'sim', label: 'امتحان و پاسخ' }, { id: 'tg', label: 'ربات تلگرام' }, { id: 'sms', label: 'فرمان پیامکی' }, { id: 'events', label: 'چه خبرهایی بیاید' }, { id: 'log', label: 'پایش و گزارش', count: R.log.length }]} />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="ربات تلگرام" value={R.telegram.on ? 'وصل' : 'خاموش'} note={`آخرین فعالیت ${rel(R.telegram.lastSeen)}`} />
          <KPI label="فرمان پیامکی" value={R.sms.on ? 'فعال' : 'خاموش'} note={`خط ${R.sms.line}`} />
          <KPI label="پیام امروز" value={fa(R.log.length)} note={`${fa(R.log.filter((m) => m.dir === 'in').length)} فرمان اجرا شد`} />
          <KPI label="فرمان ناموفق" value={fa(fails)} tone={fails ? 'warning' : 'success'} />
        </div>
        {tab === 'sim' && <>
          <Card><Field label="کدام سفارش؟" help="سفارش‌های باز به ترتیب مهلت"><Select value={oid} onChange={(v) => { setOid(v); setChat([]); setThread([]) }} options={live.map((x) => [x.id, `${x.id} · ${STATUS[x.status]?.label} · ${x.shipments[0] ? left(x.shipments[0].sla) : ''}`] as [string, string])} other={false} /></Field>{o && <p className={cx('mt-2 text-12', minsLeft(o.shipments[0]?.sla ?? '') < 45 ? 'text-danger' : 'text-t2')}>{orderAlert(d, o)}</p>}</Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={<span className="flex items-center gap-2"><Bot size={15} />تلگرام · {R.telegram.bot}</span>} actions={<Button size="sm" icon={<Send size={13} />} onClick={tgSend}>ارسال اعلان</Button>}>
              <div className="min-h-64 space-y-2 rounded-2xl bg-[#e7ebf0] p-3">{chat.length === 0 ? <p className="py-10 text-center text-12 text-t2">«ارسال اعلان» را بزنید تا پیام سفارش مثل تلگرام بیاید.</p> : chat.map((m, i) => <div key={i} className={cx('max-w-[85%] rounded-2xl px-3 py-2 text-13 leading-6', m.me ? 'mr-auto bg-[#d9fdd3]' : 'bg-white')}>{m.text}{m.btns && i === chat.length - 1 && <div className="mt-2 grid grid-cols-2 gap-1">{ACTS.map(([a, l]) => <button key={a} onClick={() => tgPress(a)} className="rounded-lg bg-[#eaf3ff] px-2 py-1.5 text-12 text-[#2a76c6] hover:bg-[#d7e9ff]">{l}</button>)}</div>}</div>)}</div>
            </Card>
            <Card title={<span className="flex items-center gap-2"><Smartphone size={15} />پیامک · خط {R.sms.line}</span>} actions={<Button size="sm" icon={<Send size={13} />} onClick={smsSend}>ارسال پیامک سفارش</Button>}>
              <div className="min-h-52 space-y-2 rounded-2xl bg-surface-2 p-3">{thread.length === 0 ? <p className="py-10 text-center text-12 text-t2">پیامک سفارش را بفرستید و با عدد پاسخ دهید.</p> : thread.map((m, i) => <div key={i} className={cx('max-w-[85%] rounded-2xl px-3 py-2 text-13 leading-6', m.me ? 'mr-auto bg-brand-solid text-white' : 'bg-white')}>{m.text}</div>)}</div>
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sms.trim()) smsReply() }}><Input className="flex-1" value={sms} onChange={(e) => setSms(e.target.value)} placeholder="مثلاً ۱ یا «۵ ۱۲۳۴»" /><Button variant="primary" disabled={!sms.trim()}>ارسال</Button></form>
              <p className="mt-2 text-11 text-t2">{SMS_MENU.map(([k, l]) => `${fa(k)}: ${l}`).join(' · ')}</p>
            </Card>
          </div>
          <p className="text-11 text-t2">هر فرمان دقیقاً همان کار دکمه‌های پنل را می‌کند و با «از تلگرام» یا «از پیامک» در لاگ ممیزی ثبت می‌شود. فقط شماره‌ها و چت‌های مجاز فرمان می‌دهند.</p>
        </>}
        {tab === 'tg' && <Card title="ربات تلگرام اختصاصی" actions={<Toggle on={R.telegram.on} onChange={(v) => upd((x) => { x.telegram.on = v }, v ? 'وصل‌کردن ربات تلگرام' : 'قطع ربات تلگرام')} text={R.telegram.on ? 'وصل' : 'قطع'} />}>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="نام ربات"><Input className="ltr text-left" defaultValue={R.telegram.bot} onBlur={(e) => upd((x) => { x.telegram.bot = e.target.value }, 'تغییر نام ربات')} /></Field><Field label="توکن ربات" help="در «مرکز اتصالات» نگه داشته می‌شود و اینجا نمایش داده نمی‌شود."><Input disabled value="••••••••••••" /></Field></div>
          <p className="mt-4 mb-2 text-13 font-semibold">چت‌ها و گروه‌های مجاز</p>
          <ul className="divide-y divide-line">{R.telegram.chats.map((c, i) => <li key={c.chatId} className="flex items-center gap-3 py-2 text-13"><b className="flex-1">{c.name}</b><Badge dot={false}>{c.role}</Badge><span className="ltr font-mono text-11 text-t2">{c.chatId}</span><Toggle on={c.on} label={`فعال ${c.name}`} onChange={(v) => upd((x) => { x.telegram.chats[i].on = v }, v ? 'فعال‌کردن چت تلگرام' : 'قطع چت تلگرام')} /></li>)}</ul>
          <p className="mt-2 text-11 text-t2">برای افزودن، فرد باید در ربات «/start» بزند؛ درخواستش اینجا برای تأیید شما می‌آید. شریک‌ها فقط سفارش‌های انبار خودشان را می‌بینند.</p>
        </Card>}
        {tab === 'sms' && <Card title="فرمان پیامکی" actions={<Toggle on={R.sms.on} onChange={(v) => upd((x) => { x.sms.on = v }, v ? 'فعال‌کردن فرمان پیامکی' : 'قطع فرمان پیامکی')} text={R.sms.on ? 'فعال' : 'خاموش'} />}>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="خط پیامک"><Input className="ltr text-left" defaultValue={R.sms.line} onBlur={(e) => upd((x) => { x.sms.line = e.target.value }, 'تغییر خط پیامک')} /></Field><Field label="رمز فرمان‌های حساس" help="برای «شمارهٔ مشتری» لازم است؛ مثلاً «۵ ۱۲۳۴»."><Input className="ltr text-left font-mono" type="password" defaultValue={R.sms.pin} onBlur={(e) => upd((x) => { x.sms.pin = e.target.value }, 'تغییر رمز فرمان پیامکی')} /></Field></div>
          <p className="mt-4 mb-2 text-13 font-semibold">شماره‌های مجاز</p>
          <ul className="divide-y divide-line">{R.sms.allowed.map((c, i) => <li key={c.phone} className="flex items-center gap-3 py-2 text-13"><b className="flex-1">{c.name}</b><span className="ltr text-t2">{mask(c.phone)}</span><Toggle on={c.on} label={`فعال ${c.name}`} onChange={(v) => upd((x) => { x.sms.allowed[i].on = v }, v ? 'فعال‌کردن شمارهٔ فرمان' : 'قطع شمارهٔ فرمان')} /></li>)}</ul>
          <p className="mt-2 flex items-center gap-1 text-11 text-t2"><ShieldCheck size={12} />پیامک از شمارهٔ ناشناس نادیده گرفته می‌شود؛ ۳ رمز اشتباه پشت‌سرهم، فرمان پیامکی همان شماره را یک ساعت قفل می‌کند.</p>
        </Card>}
        {tab === 'events' && <Card title="چه خبرهایی بیاید؟"><div className="space-y-2 text-13">{([['newOrder', 'سفارش تازه (با کالا، مشخصات، روش ارسال و مهلت)'], ['fastOnly', 'فقط سفارش‌های ارسال سریع'], ['slaWarn', 'هشدار نزدیک شدن مهلت (۴۵ و ۲۰ دقیقه مانده)'], ['payFail', 'پرداخت ناموفق یا نامشخص'], ['noStock', 'اعلام «ندارم» از انبار یا شعبه'], ['returns', 'درخواست مرجوعی تازه'], ['dailySummary', 'خلاصهٔ روز ساعت ۲۲']] as const).map(([k, l]) => <div key={k}><Toggle on={R.events[k]} onChange={(v) => upd((x) => { x.events[k] = v }, `تغییر خبر ${l}`)} text={l} /></div>)}</div><p className="mt-3 text-11 text-t2">ساعات سکوت و زنجیرهٔ کانال‌ها از «تنظیمات ← زنجیرهٔ کانال‌ها» خوانده می‌شود؛ رویدادهای بحرانی همیشه می‌آیند.</p></Card>}
        {tab === 'log' && <Card pad={false} title="پایش پیام‌ها و فرمان‌ها"><ul className="divide-y divide-line">{R.log.map((m) => <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-12">{m.ch === 'تلگرام' ? <Bot size={14} className="text-[#2a76c6]" /> : <MessageSquare size={14} className="text-brand" />}<Badge dot={false}>{m.dir === 'out' ? 'ارسال' : 'فرمان'}</Badge><span className="min-w-0 flex-1 truncate">{m.text}</span>{m.ok === false && <Badge tone="danger">ناموفق</Badge>}<span className="text-t3">{m.to}</span><span className="text-t3">{rel(m.at)}</span></li>)}</ul></Card>}
      </div>
    </Page>
  )
}
