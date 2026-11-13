import { useState } from 'react'
import { Activity, KeyRound, Plug, Plus, Send, Trash2, Webhook } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Bars } from '@/shared/ui/charts'
import { DataTable } from '@/shared/ui/table'
import { Drawer, toast } from '@/shared/ui/overlay'
import { QuickText } from '@/shared/ui/quickview'
import { fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { useTab } from '../pages/_shared'

import { EVENTS } from '@/shared/data/hub'
import { FeedsApi } from '../settings/FeedsApi'

/** مرکز اتصالات: هر سرویس با کلید از پنل، وب‌هوک برای هر رویداد، و ثبت رویداد سمت سرور با منبع اول و آخر */
export function Integrations() {
  const d = useDB(); const H = d.hub; const [tab, setTab] = useTab('adapters'); const [edit, setEdit] = useState<string | null>(null); const [key, setKey] = useState('')
  const [nh, setNh] = useState({ url: '', events: [] as string[] })
  const ad = H.adapters.find((a) => a.id === edit)
  const families = [...new Set(H.adapters.map((a) => a.family))]
  return (
    <Page title="مرکز اتصالات و API" module="infra" sub="هر درگاه، پنل پیامک، پوش، آنالیتیکس، حسابداری، حمل و هوش مصنوعی از همین‌جا وصل می‌شود؛ بدون کدنویسی و بدون وابستگی به یک سرویس."
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'adapters', label: 'اتصال‌ها', count: H.adapters.filter((a) => a.status === 'وصل نشده').length }, { id: 'hooks', label: 'وب‌هوک‌ها' }, { id: 'events', label: 'رویدادهای سمت سرور' }, { id: 'api', label: 'فیدها، کلید و مستندات API' }]} />}>
      {tab === 'api' && <FeedsApi />}
      {tab === 'adapters' && <div className="space-y-4">{families.map((f) => <Card key={f} title={f}><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{H.adapters.filter((a) => a.family === f).map((a) => <button key={a.id} onClick={() => { setEdit(a.id); setKey('') }} className="lift flex items-center gap-3 rounded-xl border border-line p-3 text-right"><span className={cx('grid size-9 place-items-center rounded-full', a.status === 'متصل' ? 'bg-success-bg text-success' : 'bg-neutral-bg text-t3')}><Plug size={16} /></span><span className="min-w-0 flex-1"><b className="block text-13">{a.name}</b><span className="ltr block truncate text-11 text-t2">{a.key || 'بدون کلید'}</span></span><Badge tone={a.status === 'متصل' ? 'success' : a.status === 'وصل نشده' ? 'neutral' : 'warning'}>{a.status}</Badge></button>)}</div></Card>)}</div>}
      {tab === 'hooks' && <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <DataTable name="وب‌هوک‌ها" rows={H.hooks} rowKey={(h) => h.id} empty={{ title: 'وب‌هوکی تعریف نشده است.' }}
            cols={[{ key: 'u', title: 'نشانی', render: (h) => <span className="ltr text-12">{h.url}</span> }, { key: 'e', title: 'رویدادها', wrap: true, render: (h) => <span className="flex flex-wrap gap-1">{h.events.map((e) => <Badge key={e} dot={false}><span className="ltr">{e}</span></Badge>)}</span> }, { key: 'a', title: 'فعال', render: (h) => <Toggle on={h.active} label="فعال" onChange={(v) => mutate((x) => { x.hub.hooks.find((y) => y.id === h.id)!.active = v }, { action: 'تغییر وضعیت وب‌هوک', target: h.url })} /> }]}
            actions={(h) => [{ label: 'ارسال آزمایشی', icon: <Send size={14} />, onClick: async () => { try { await fakeCall(true); mutate((x) => { x.hub.deliveries.unshift({ id: `dl${Date.now().toString(36)}`, hook: h.id, event: h.events[0], ref: 'test', status: 200, ms: 120, at: new Date().toISOString() }) }); toast('رویداد آزمایشی ارسال شد (۲۰۰).') } catch { toast('سرویس مقصد پاسخ نداد.', { tone: 'err' }) } } }, { label: 'حذف', icon: <Trash2 size={14} />, danger: true, onClick: () => mutate((x) => { x.hub.hooks = x.hub.hooks.filter((y) => y.id !== h.id) }, { action: 'حذف وب‌هوک', target: h.url }) }]} />
          <DataTable name="گزارش ارسال‌ها" rows={H.deliveries} rowKey={(x) => x.id} empty={{ title: 'ارسالی ثبت نشده است.' }} cols={[{ key: 'e', title: 'رویداد', render: (x) => <span className="ltr text-12">{x.event}</span> }, { key: 'r', title: 'مرجع', render: (x) => <QuickText v={x.ref} /> }, { key: 's', title: 'پاسخ', render: (x) => <Badge tone={x.status < 300 ? 'success' : 'danger'}>{fa(x.status)}</Badge> }, { key: 'ms', title: 'زمان', render: (x) => `${fa(x.ms)} ms` }, { key: 'at', title: 'کی', render: (x) => <span className="text-12 text-t2">{rel(x.at)}</span> }]}
            actions={(x) => [{ label: 'ارسال دوباره', onClick: () => { mutate((y) => { y.hub.deliveries.find((z) => z.id === x.id)!.status = 200 }, { action: 'ارسال دوبارهٔ وب‌هوک', target: x.event }); toast('دوباره ارسال شد.') } }]} />
        </div>
        <Card title={<span className="flex items-center gap-2"><Webhook size={15} />وب‌هوک تازه</span>}>
          <Field label="نشانی مقصد (n8n، Make، Slack، CRM…)"><Input className="ltr text-left" placeholder="https://" value={nh.url} onChange={(e) => setNh({ ...nh, url: e.target.value })} /></Field>
          <p className="mt-3 mb-1 text-12 font-semibold">رویدادها</p>
          <div className="flex flex-wrap gap-1">{EVENTS.map((e) => <button key={e} onClick={() => setNh({ ...nh, events: nh.events.includes(e) ? nh.events.filter((x) => x !== e) : [...nh.events, e] })} className={cx('ltr rounded-full border px-2 py-0.5 text-11', nh.events.includes(e) ? 'border-transparent bg-brand-solid text-white' : 'border-line')}>{e}</button>)}</div>
          <Button variant="primary" className="mt-3 w-full" icon={<Plus size={14} />} disabled={!/^https:\/\//.test(nh.url) || !nh.events.length} onClick={() => { mutate((x) => { x.hub.hooks.push({ id: `wh${Date.now().toString(36)}`, url: nh.url, events: nh.events, secret: `whsec_${Math.random().toString(36).slice(2, 6)}••`, active: true }) }, { action: 'افزودن وب‌هوک', target: nh.url }); setNh({ url: '', events: [] }); toast('وب‌هوک ساخته شد. امضای HMAC در سرآیند X-Ghanimat-Signature ارسال می‌شود.') }}>ساخت وب‌هوک</Button>
        </Card>
      </div>}
      {tab === 'events' && <div className="space-y-4">
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI featured icon={<Activity size={17} />} label="رویداد امروز" value={fa(H.serverEvents.length * 412)} note="ثبت سمت سرور؛ مستقل از ادبلاکر" /><KPI label="خرید ثبت‌شده" value={fa(H.serverEvents.filter((e) => e.event === 'purchase').length * 37)} /><KPI label="پرداخت ناموفق" value={fa(H.serverEvents.filter((e) => e.event === 'payment_failed').length * 9)} goodDown /><KPI label="منبع ورود ثبت‌شده" value="۹۸٪" /></div>
        <div className="grid gap-4 lg:grid-cols-2"><Card title="اولین تماس (First touch)"><Bars data={Object.entries(H.serverEvents.reduce<Record<string, number>>((m, e) => { m[e.first] = (m[e.first] ?? 0) + 1; return m }, {})).map(([l, v]) => ({ label: l, value: v }))} /></Card><Card title="آخرین تماس پیش از خرید (Last touch)"><Bars data={Object.entries(H.serverEvents.reduce<Record<string, number>>((m, e) => { m[e.last] = (m[e.last] ?? 0) + 1; return m }, {})).map(([l, v]) => ({ label: l, value: v }))} /></Card></div>
        <DataTable name="جدول رویدادها" rows={H.serverEvents} rowKey={(e) => e.id} empty={{ title: 'رویدادی ثبت نشده است.' }} search={(e) => `${e.event} ${e.path} ${e.first} ${e.last}`}
          cols={[{ key: 'e', title: 'رویداد', render: (e) => <span className="ltr text-12">{e.event}</span> }, { key: 'p', title: 'مسیر', render: (e) => <span className="ltr text-12">{e.path}</span> }, { key: 'c', title: 'مشتری', render: (e) => (e.customer ? <QuickText v={e.customer} /> : 'مهمان') }, { key: 'f', title: 'اولین تماس', render: (e) => <span className="ltr text-12">{e.first}</span> }, { key: 'l', title: 'آخرین تماس', render: (e) => <span className="ltr text-12">{e.last}</span> }, { key: 'at', title: 'زمان', render: (e) => <span className="text-12 text-t2">{rel(e.at)}</span> }]} />
      </div>}
      <Drawer open={!!ad} onClose={() => setEdit(null)} title={ad ? `${ad.name} · ${ad.family}` : ''} footer={ad && <><Button variant="primary" onClick={async () => { try { await fakeCall(true); mutate((x) => { const a = x.hub.adapters.find((y) => y.id === ad.id)!; if (key) a.key = `${key.slice(0, 3)}••••${key.slice(-3)}`; a.status = 'متصل'; a.env = 'عملیاتی' }, { action: 'اتصال سرویس', target: ad.name }); toast(`${ad.name} وصل و آزمایش شد.`); setEdit(null) } catch { toast(`${ad.name} پاسخ نداد؛ کلید را بررسی کنید.`, { tone: 'err' }) } }}>ذخیره و آزمایش اتصال</Button>{ad.status === 'متصل' && <Button variant="danger" onClick={() => { mutate((x) => { const a = x.hub.adapters.find((y) => y.id === ad.id)!; a.status = 'وصل نشده'; a.key = '' }, { action: 'قطع اتصال سرویس', target: ad.name }); setEdit(null) }}>قطع اتصال</Button>}</>}>
        {ad && <div className="space-y-3"><Field label="کلید API" help="کلید فقط پوشیده نمایش داده می‌شود و در خزانهٔ اسرار سرور ذخیره می‌شود؛ هرگز در مرورگر نیست."><Input type="password" className="ltr text-left" placeholder={ad.key || 'کلید را وارد کنید'} value={key} onChange={(e) => setKey(e.target.value)} /></Field>
          <Field label="محیط"><Select value={ad.env === '—' ? 'آزمایشی' : ad.env} onChange={(v) => mutate((x) => { x.hub.adapters.find((y) => y.id === ad.id)!.env = v })} options={['آزمایشی', 'عملیاتی']} /></Field>
          <p className="flex items-center gap-1 text-12 text-t2"><KeyRound size={13} />الگوی Adapter: سرویس‌های هم‌خانواده جایگزین هم می‌شوند بی‌آنکه بقیهٔ پنل تغییر کند.</p></div>}
      </Drawer>
    </Page>
  )
}
