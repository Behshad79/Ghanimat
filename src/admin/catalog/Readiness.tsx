import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Clapperboard, FileText, Flame, Camera as Instagram, PackagePlus, Rocket, Sparkles, Target, TrendingUp } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa } from '@/shared/lib/fa'
import type { DB, Product } from '@/shared/data/seed'
import type { ContentItem } from '@/shared/data/contentQueue'
import { ProductImg, useTab } from '../pages/_shared'

type R = { p: Product; photos: number; onSite: boolean; desc: number; video: boolean; social?: ContentItem; sold: number; revenue: number; stock: number; score: number; action: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'brand'; gaps: string[] }

/** تحلیل آمادگی هر کالا: عکس، حضور در سایت، کامل بودن محتوا، ویدیو، صف شبکه‌های اجتماعی و عملکرد فروش؛ و پیشنهاد اقدام بعدی */
function analyse(d: DB): R[] {
  return d.products.map((p) => {
    const photos = (p.images?.length ?? 0) || (p.image ? 1 : 0)
    const units = d.units.filter((u) => u.productId === p.id)
    const stock = p.mode === 'qty' ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) : units.filter((u) => ['unit.published', 'unit.ready', 'unit.photo', 'unit.qc'].includes(u.status)).length
    const lines = d.orders.filter((o) => o.status !== 'order.cancelled').flatMap((o) => o.shipments.flatMap((s) => s.items)).filter((i) => i.productId === p.id)
    const sold = lines.reduce((a, i) => a + i.qty, 0); const revenue = lines.reduce((a, i) => a + i.qty * i.price, 0)
    const fields = [p.short, p.long, p.keyFeatures, p.box, p.specs && Object.keys(p.specs).length ? 'x' : '']
    const desc = Math.round((fields.filter((f) => f && String(f).trim().length > 2).length / fields.length) * 100)
    const video = !!p.pdp?.videos?.length
    const social = d.contentQueue.filter((c) => c.productId === p.id).sort((a, b) => a.due.localeCompare(b.due))[0]
    const onSite = p.status === 'product.published'
    const gaps = [!photos && 'بدون عکس', photos > 0 && photos < 3 && 'عکس کم', !onSite && 'در سایت نیست', desc < 60 && 'محتوای ناقص', !video && 'بدون ویدیوی بررسی', !social && 'محتوای شبکه‌های اجتماعی ندارد'].filter(Boolean) as string[]
    // امتیاز آمادگی: عکس ۲۵، حضور در سایت ۲۰، محتوا ۲۵، ویدیو ۱۵، شبکهٔ اجتماعی ۱۵
    const score = Math.round(Math.min(photos, 4) / 4 * 25 + (onSite ? 20 : 0) + desc / 100 * 25 + (video ? 15 : 0) + (social ? (social.status === 'منتشرشده' ? 15 : 8) : 0))
    const hot = p.cvr >= 2.5; const traffic = p.views >= 2500
    const [action, tone] = !onSite && stock > 0 ? ['موجود در انبار ولی در سایت نیست؛ سریع منتشر کنید', 'danger'] : !photos ? ['اول عکاسی', 'danger'] : hot && !traffic ? ['تبدیل خوب، بازدید کم: تبلیغ و محتوای شبکه‌های اجتماعی', 'brand'] : traffic && !hot ? ['بازدید زیاد، تبدیل کم: محتوا، عکس یا قیمت را بهتر کنید', 'warning'] : hot && traffic ? ['پرفروش: موجودی و تبلیغ را حفظ کنید', 'success'] : sold === 0 && p.views < 1500 ? ['دیده نشده: نیاز به توجه و محتوا', 'warning'] : ['تکمیل محتوای باقی‌مانده', 'info']
    return { p, photos, onSite, desc, video, social, sold, revenue, stock, score, action, tone: tone as R['tone'], gaps }
  })
}

export function Readiness() {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useTab('all'); const [plan, setPlan] = useState<ContentItem | null>(null)
  const rows = useMemo(() => analyse(d), [d])
  const F: Record<string, [string, (r: R) => boolean]> = {
    all: ['همه', () => true], push: ['روی این‌ها مانور بدهیم', (r) => r.p.cvr >= 2.5 || r.sold >= 2], ignored: ['دیده نشده', (r) => r.p.views < 1500 && r.sold === 0],
    photo: ['بدون عکس یا عکس کم', (r) => r.photos < 3], site: ['در سایت نیست', (r) => !r.onSite], content: ['محتوای ناقص', (r) => r.desc < 60], video: ['بدون ویدیوی بررسی', (r) => !r.video], social: ['صف شبکه‌های اجتماعی', (r) => !!r.social && r.social.status !== 'منتشرشده'],
  }
  const list = rows.filter(F[tab]?.[1] ?? (() => true)).sort((a, b) => a.score - b.score)
  const notListed = d.partnerQueue.length + rows.filter((r) => !r.onSite && r.stock > 0).length
  return (
    <Page title="آمادگی کالا و محتوا" module="readiness" sub="کدام کالا عکس، محتوا، ویدیو یا حضور در سایت ندارد، کدام در صف اینستاگرام است و روی کدام باید مانور بدهیم."
      primary={<Button variant="primary" icon={<Clapperboard size={14} />} onClick={() => setPlan({ id: `cq${Date.now().toString(36)}`, productId: rows[0]?.p.id ?? '', channel: 'اینستاگرام', kind: 'ریلز', status: 'ایده', due: new Date(Date.now() + 3 * 864e5).toISOString(), owner: 'پویا' })}>برنامهٔ محتوای تازه</Button>}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI featured icon={<Target size={17} />} label="آمادگی میانگین" value={`${fa(Math.round(rows.reduce((a, r) => a + r.score, 0) / Math.max(1, rows.length)))}٪`} note={`${fa(rows.filter((r) => r.score >= 80).length)} کالا کامل`} />
        <KPI icon={<Camera size={17} />} label="عکس کم یا ندارد" tone="danger" value={fa(rows.filter((r) => r.photos < 3).length)} to="/admin/readiness?tab=photo" />
        <KPI icon={<PackagePlus size={17} />} label="خارج از سایت" tone="danger" value={fa(notListed)} note={`${fa(d.partnerQueue.length)} در صف تأیید شریک`} to="/admin/readiness?tab=site" />
        <KPI icon={<FileText size={17} />} label="محتوای ناقص" tone="warning" value={fa(rows.filter((r) => r.desc < 60).length)} to="/admin/readiness?tab=content" />
        <KPI icon={<Instagram size={17} />} label="صف محتوا" tone="info" value={fa(d.contentQueue.filter((c) => c.status !== 'منتشرشده').length)} to="/admin/readiness?tab=social" />
      </div>
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        {[['روی این‌ها مانور بدهیم', <Rocket key="r" size={15} />, rows.filter((r) => r.p.cvr >= 2.5).sort((a, b) => b.p.cvr - a.p.cvr).slice(0, 3), (r: R) => `تبدیل ${fa(r.p.cvr)}٪ · ${fa(r.p.views)} بازدید`, 'border-brand/30 bg-brand-tint/50'], ['پرفروش‌ها', <Flame key="f" size={15} />, [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 3), (r: R) => `${fa(r.sold)} فروش · ${compactToman(r.revenue)}`, 'border-success/30 bg-success-bg/50'], ['به این‌ها توجه نکرده‌ایم', <Sparkles key="s" size={15} />, rows.filter((r) => r.sold === 0).sort((a, b) => a.p.views - b.p.views).slice(0, 3), (r: R) => `${fa(r.p.views)} بازدید · بدون فروش · آمادگی ${fa(r.score)}٪`, 'border-warning/40 bg-warning-bg/50']].map(([t, icon, L, sub, cls]) => (
          <div key={t as string} className={cx('rounded-2xl border p-3', cls as string)}><p className="mb-2 flex items-center gap-1.5 text-13 font-semibold">{icon as React.ReactNode}{t as string}</p><ul className="space-y-1.5">{(L as R[]).map((r) => <li key={r.p.id}><button type="button" onClick={() => nav(`/admin/catalog/${r.p.id}`)} className="flex w-full items-center gap-2 rounded-lg bg-surface p-1.5 text-right text-12 hover:ring-1 hover:ring-brand/40"><ProductImg pid={r.p.id} size={32} /><span className="min-w-0 flex-1"><b className="block truncate">{r.p.en}</b><span className="text-t2">{(sub as (r: R) => string)(r)}</span></span></button></li>)}</ul></div>))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">{Object.entries(F).map(([k, [l, f]]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={cx('h-8 rounded-full border px-3 text-12', tab === k ? 'border-brand bg-brand-solid text-white' : 'border-line bg-surface hover:border-brand/50')}>{l} <span className="tnum opacity-80">{fa(rows.filter(f).length)}</span></button>)}</div>
      <DataTable name="آمادگی کالاها" rows={list} rowKey={(r) => r.p.id} onRow={(r) => nav(`/admin/catalog/${r.p.id}/edit`)} empty={{ title: 'کالایی در این دسته نیست.' }}
        cols={[{ key: 'p', title: 'کالا', render: (r) => <span className="flex items-center gap-2"><ProductImg pid={r.p.id} size={40} /><span><b className="block">{r.p.en}</b><span className="text-11 text-t2">{r.p.category} · موجودی {fa(r.stock)}</span></span></span>, text: (r) => `${r.p.en} ${r.p.title}` },
          { key: 's', title: 'آمادگی', render: (r) => <span className="flex w-24 flex-col gap-1"><b className={cx('tnum text-13', r.score >= 80 ? 'text-success' : r.score >= 50 ? 'text-warning' : 'text-danger')}>{fa(r.score)}٪</b><span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className={cx('block h-full rounded-full', r.score >= 80 ? 'bg-success' : r.score >= 50 ? 'bg-warning' : 'bg-danger')} style={{ width: `${r.score}%` }} /></span></span>, sort: (r) => r.score },
          { key: 'ph', title: 'عکس', render: (r) => <Badge tone={r.photos >= 3 ? 'success' : r.photos ? 'warning' : 'danger'}>{r.photos ? `${fa(r.photos)} عکس` : 'ندارد'}</Badge>, sort: (r) => r.photos, text: (r) => (r.photos ? `${r.photos} عکس` : 'بدون عکس') },
          { key: 'site', title: 'سایت', render: (r) => <Badge tone={r.onSite ? 'success' : 'danger'}>{r.onSite ? 'منتشرشده' : 'منتشر نشده'}</Badge>, text: (r) => (r.onSite ? 'منتشرشده' : 'منتشر نشده') },
          { key: 'desc', title: 'محتوا', render: (r) => <Badge tone={r.desc >= 80 ? 'success' : r.desc >= 60 ? 'warning' : 'danger'}>{fa(r.desc)}٪</Badge>, sort: (r) => r.desc },
          { key: 'v', title: 'ویدیوی بررسی', render: (r) => r.video ? <Badge tone="success">دارد</Badge> : <Badge>ندارد</Badge>, text: (r) => (r.video ? 'ویدیو دارد' : 'بدون ویدیو') },
          { key: 'so', title: 'شبکه‌های اجتماعی', render: (r) => r.social ? <span className="text-12">{r.social.channel} · {r.social.kind}<Badge tone={r.social.status === 'منتشرشده' ? 'success' : r.social.status === 'آماده انتشار' ? 'brand' : 'neutral'}>{r.social.status}</Badge></span> : <span className="text-12 text-t3">—</span>, text: (r) => r.social ? `${r.social.channel} ${r.social.status}` : 'بدون برنامه' },
          { key: 'sales', title: 'فروش و تبدیل', align: 'left', render: (r) => <span className="text-12"><b className="tnum">{fa(r.sold)}</b> فروش · {fa(r.p.views)} بازدید · <span className={r.p.cvr >= 2.5 ? 'text-success' : 'text-t2'}>{fa(r.p.cvr)}٪</span></span>, sort: (r) => r.revenue },
          { key: 'a', title: 'اقدام بعدی', wrap: true, render: (r) => <span className={cx('flex items-start gap-1 text-12 font-medium', `text-${r.tone === 'brand' ? 'brand' : r.tone}`)}><TrendingUp size={13} className="mt-0.5 shrink-0" />{r.action}</span>, text: (r) => r.action }]}
        actions={(r) => [{ label: 'تکمیل محتوا و عکس', onClick: () => nav(`/admin/catalog/${r.p.id}/edit?step=2`) }, { label: 'برنامهٔ محتوای اینستاگرام', onClick: () => setPlan({ id: `cq${Date.now().toString(36)}`, productId: r.p.id, channel: 'اینستاگرام', kind: 'ریلز', status: 'ایده', due: new Date(Date.now() + 3 * 864e5).toISOString(), owner: 'پویا' }) }, { label: r.onSite ? 'مشاهده در سایت' : 'انتشار در سایت', onClick: () => nav(r.onSite ? `/admin/catalog/${r.p.id}` : `/admin/catalog/${r.p.id}/edit?step=11`) }]} />
      <Card title="صف تولید محتوا" className="mt-4" pad={false}><ul className="divide-y divide-line">{[...d.contentQueue].sort((a, b) => a.due.localeCompare(b.due)).map((c) => { const p = d.products.find((x) => x.id === c.productId); return (
        <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-13"><ProductImg pid={c.productId} size={32} /><span className="min-w-0 flex-1"><b>{p?.en}</b> · {c.channel} · {c.kind}{c.note && <span className="block text-11 text-t2">{c.note}</span>}</span><span className="text-11 text-t2">{new Date(c.due).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })} · {c.owner}</span>
          <Select className="w-36" value={c.status} onChange={(v) => mutate((x) => { x.contentQueue.find((y) => y.id === c.id)!.status = v as ContentItem['status'] }, { action: 'تغییر وضعیت محتوا', target: `${p?.en} · ${v}` })} options={['ایده', 'در تولید', 'آماده انتشار', 'منتشرشده']} /></li>) })}</ul></Card>
      <Modal open={!!plan} onClose={() => setPlan(null)} title="برنامهٔ محتوای تازه" footer={<Button variant="primary" onClick={() => { if (!plan) return; mutate((x) => { x.contentQueue.unshift(plan) }, { action: 'افزودن به صف محتوا', target: plan.productId }); setPlan(null); toast('به صف تولید محتوا اضافه شد.') }}>افزودن به صف</Button>}>
        {plan && <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="کالا"><Select value={plan.productId} onChange={(v) => setPlan({ ...plan, productId: v })} options={d.products.map((p) => [p.id, p.en] as [string, string])} /></Field></div>
          <Field label="کانال"><Select value={plan.channel} onChange={(v) => setPlan({ ...plan, channel: v as ContentItem['channel'] })} options={['اینستاگرام', 'تلگرام', 'سایت', 'آپارات']} /></Field>
          <Field label="نوع"><Select value={plan.kind} onChange={(v) => setPlan({ ...plan, kind: v as ContentItem['kind'] })} options={['ریلز', 'پست', 'استوری', 'ویدیوی بررسی', 'آنباکسینگ']} /></Field>
          <Field label="موعد"><Input type="date" value={plan.due.slice(0, 10)} onChange={(e) => setPlan({ ...plan, due: new Date(`${e.target.value}T12:00:00`).toISOString() })} /></Field>
          <Field label="مسئول"><Select value={plan.owner} onChange={(v) => setPlan({ ...plan, owner: v })} options={d.team.map((u) => u.name)} /></Field>
          <div className="sm:col-span-2"><Field label="ایده"><Input value={plan.note ?? ''} onChange={(e) => setPlan({ ...plan, note: e.target.value })} placeholder="مثلا تست صدای حذف نویز در مترو" /></Field></div>
        </div>}
      </Modal>
    </Page>
  )
}
