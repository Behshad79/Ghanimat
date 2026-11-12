import { useState } from 'react'
import { Bot, Clock, Headphones, MessageSquare, Sparkles, Star, ThumbsDown, Users } from 'lucide-react'
import { Badge, Card, cx, Tabs } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Bars } from '@/shared/ui/charts'
import { DataTable } from '@/shared/ui/table'
import { Modal } from '@/shared/ui/overlay'
import { QuickText } from '@/shared/ui/quickview'
import { useDB } from '@/shared/lib/store'
import { fa, pct, rel } from '@/shared/lib/fa'
import { ProductImg, useTab } from '../pages/_shared'

/** سوابق و آمار گفتگوهای مشتری با دستیار AI و ویجت پشتیبانی */
export function Conversations() {
  const d = useDB(); const [tab, setTab] = useTab('ai'); const [open, setOpen] = useState<string | null>(null)
  const A = d.journey.aiChats; const W = d.journey.widgetChats; const name = (id: string) => d.customers.find((c) => c.id === id)?.name ?? id
  const rate = (n: number, t: number) => (t ? (n / t) * 100 : 0)
  const intents = Object.entries(A.reduce<Record<string, number>>((m, a) => { m[a.intent] = (m[a.intent] ?? 0) + 1; return m }, {}))
  const recommended = Object.entries(A.flatMap((a) => a.messages.flatMap((m) => ('products' in m && m.products) || [])).reduce<Record<string, number>>((m, p) => { m[p] = (m[p] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1])
  const live = W.filter((w) => !w.offHours); const rated = W.filter((w) => w.rating)
  const cur = A.find((a) => a.id === open)
  return (
    <Page title="گفتگوها و دستیار خرید" module="support" sub="سوابق کامل گفتگوی هر مشتری با دستیار AI و ویجت پشتیبانی، با آمار و داده‌های قابل استخراج."
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'ai', label: 'دستیار خرید AI', count: A.length }, { id: 'widget', label: 'ویجت پشتیبانی', count: W.length }, { id: 'insights', label: 'برداشت‌ها از گفتگوها' }]} />}>
      {tab === 'ai' && <div className="space-y-4">
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured icon={<Bot size={17} />} label="گفتگو" value={fa(A.length)} />
          <KPI icon={<Sparkles size={17} />} label="حل‌شده بدون انسان" value={pct(Math.round(rate(A.filter((a) => a.resolved && !a.handoff).length, A.length)))} />
          <KPI icon={<Users size={17} />} label="انتقال به پشتیبانی" value={pct(Math.round(rate(A.filter((a) => a.handoff).length, A.length)))} goodDown />
          <KPI icon={<ThumbsDown size={17} />} label="خرید پس از گفتگو" value={pct(Math.round(rate(A.filter((a) => a.converted).length, A.length)))} />
        </div>
        <DataTable name="گفتگوهای دستیار" empty={{ title: "گفتگویی ثبت نشده است." }} rows={A} rowKey={(a) => a.id} onRow={(a) => setOpen(a.id)} search={(a) => `${a.id} ${name(a.customerId)} ${a.intent} ${a.messages.map((m) => m.text).join(' ')}`}
          cols={[{ key: 'id', title: 'شناسه', render: (a) => <span className="ltr font-mono text-12">{a.id}</span> }, { key: 'c', title: 'مشتری', render: (a) => <QuickText v={name(a.customerId)} /> }, { key: 'q', title: 'اولین پیام', wrap: true, render: (a) => <span className="line-clamp-1">{a.messages[0].text}</span> }, { key: 'i', title: 'نیت', render: (a) => a.intent }, { key: 'f', title: 'نتیجه', render: (a) => <span className="flex gap-1">{a.resolved ? <Badge tone="success">حل شد</Badge> : <Badge tone="warning">حل نشد</Badge>}{a.handoff && <Badge tone="info">انتقال</Badge>}{a.feedback && <Badge tone={a.feedback === 'مثبت' ? 'success' : 'danger'}>{a.feedback}</Badge>}</span> }, { key: 'at', title: 'زمان', render: (a) => <span className="text-12 text-t2">{rel(a.at)}</span>, sort: (a) => a.at }]} />
      </div>}
      {tab === 'widget' && <div className="space-y-4">
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured icon={<MessageSquare size={17} />} label="گفتگوی ویجت" value={fa(W.length)} note={`${fa(W.filter((w) => w.offHours).length)} خارج از ساعت کاری`} />
          <KPI icon={<Clock size={17} />} label="میانگین انتظار" value={`${fa(Math.round(live.reduce((a, w) => a + w.waitSec, 0) / Math.max(1, live.length)))} ثانیه`} goodDown />
          <KPI icon={<Headphones size={17} />} label="میانگین مدت گفتگو" value={`${fa(Math.round(live.reduce((a, w) => a + w.durationMin, 0) / Math.max(1, live.length)))} دقیقه`} />
          <KPI icon={<Star size={17} />} label="رضایت (CSAT)" value={`${fa((rated.reduce((a, w) => a + w.rating, 0) / Math.max(1, rated.length)).toFixed(1))} از ۵`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="به تفکیک کارشناس"><Bars data={Object.entries(live.reduce<Record<string, number>>((m, w) => { m[w.agent] = (m[w.agent] ?? 0) + 1; return m }, {})).map(([l, v]) => ({ label: l, value: v }))} /></Card>
          <Card title="دلیل رضایت یا نارضایتی">{W.map((w) => <p key={w.id} className="flex items-center justify-between gap-2 py-1 text-13"><span>{w.reason}</span><span className="text-t2">{w.rating ? '★'.repeat(w.rating) : '—'}</span></p>)}</Card>
        </div>
        <DataTable name="گفتگوهای ویجت" empty={{ title: "گفتگویی ثبت نشده است." }} rows={W} rowKey={(w) => w.id} cols={[{ key: 'id', title: 'شناسه', render: (w) => <span className="ltr font-mono text-12">{w.id}</span> }, { key: 'c', title: 'مشتری', render: (w) => <QuickText v={name(w.customerId)} /> }, { key: 't', title: 'موضوع', render: (w) => w.topic }, { key: 'a', title: 'کارشناس', render: (w) => w.agent }, { key: 'w', title: 'انتظار', render: (w) => `${fa(w.waitSec)} ثانیه`, sort: (w) => w.waitSec }, { key: 'r', title: 'امتیاز', render: (w) => (w.rating ? '★'.repeat(w.rating) : '—'), sort: (w) => w.rating }, { key: 'o', title: 'ساعت کاری', render: (w) => (w.offHours ? <Badge tone="warning">خارج از ساعت</Badge> : <Badge tone="success">در ساعت</Badge>) }]} />
      </div>}
      {tab === 'insights' && <div className="grid gap-4 lg:grid-cols-2">
        <Card title="نیت مشتری‌ها در گفتگو"><Bars data={intents.map(([l, v]) => ({ label: l, value: v }))} /></Card>
        <Card title="کالاهایی که دستیار بیشتر پیشنهاد داده">{recommended.map(([pid, n]) => <p key={pid} className="flex items-center gap-2 py-1 text-13"><ProductImg pid={pid} size={32} /><span className="flex-1"><QuickText v={d.products.find((p) => p.id === pid)?.title ?? pid} /></span><b className="tnum">{fa(n)}</b></p>)}</Card>
        <Card title="پرسش‌هایی که دستیار جواب خوبی نداد">{A.filter((a) => a.feedback === 'منفی' || a.handoff).map((a) => <p key={a.id} className="border-b border-line py-2 text-13 last:border-0">«{a.messages[0].text}»<span className="block text-11 text-t2">پیشنهاد: پاسخ آماده یا راهنمای خرید برای این موضوع بنویسید.</span></p>)}</Card>
        <Card title="کلمه‌های پرتکرار">{(() => { const words = A.flatMap((a) => a.messages.filter((m) => m.role === 'user').flatMap((m) => m.text.split(/[\s،؟?.]+/))).filter((w) => w.length > 2); const top = Object.entries(words.reduce<Record<string, number>>((m, w) => { m[w] = (m[w] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1]).slice(0, 18); return <div className="flex flex-wrap gap-1.5">{top.map(([w, n]) => <span key={w} className={cx('rounded-full bg-brand-tint px-2.5 py-1 text-brand', n > 1 ? 'text-13 font-bold' : 'text-12')}>{w}</span>)}</div> })()}</Card>
      </div>}
      <Modal wide open={!!cur} onClose={() => setOpen(null)} title={cur ? `گفتگو ${cur.id} · ${name(cur.customerId)}` : ''}>
        {cur && <div className="space-y-2">{cur.messages.map((m, i) => <div key={i} className={cx('max-w-[80%] rounded-2xl px-3 py-2 text-13', m.role === 'user' ? 'mr-auto bg-neutral-bg' : 'ml-auto bg-brand-tint')}>{m.text}{'products' in m && m.products && <div className="mt-2 flex gap-2">{m.products.map((p) => <ProductImg key={p} pid={p} size={36} />)}</div>}</div>)}</div>}
      </Modal>
    </Page>
  )
}
