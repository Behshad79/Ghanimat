import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Globe, Laptop, LogOut, MonitorSmartphone, Plus, Search, ShieldAlert, Smartphone, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Toggle } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, rel } from '@/shared/lib/fa'
import type { Story } from '@/shared/data/traffic'

const PAGES = ['/product/iphone-16-pro', '/', '/category/headphones', '/checkout', '/product/airpods-max', '/blog/stock-buying-guide', '/search?q=کیندل', '/cart']
const SRC = ['گوگل', 'مستقیم', 'اینستاگرام', 'ترب', 'تلگرام', 'ایمالز']
const CITY = ['تهران', 'کرج', 'اصفهان', 'شیراز', 'تبریز', 'مشهد']
type V = { id: string; page: string; src: string; dev: 'موبایل' | 'دسکتاپ'; city: string; since: number; cart: number }
const mk = (i: number): V => ({ id: `v${i}`, page: PAGES[(i * 7) % PAGES.length], src: SRC[(i * 3) % SRC.length], dev: i % 4 ? 'موبایل' : 'دسکتاپ', city: CITY[(i * 5) % CITY.length], since: Date.now() - ((i * 37) % 900) * 1000, cart: i % 5 === 0 ? 15000000 + (i % 3) * 8000000 : 0 })

/** بازدیدکنندگان زنده و جست‌وجوهای داخل سایت: چه کسی الان کجاست، و مردم دنبال چه می‌گردند که پیدا نمی‌کنند */
export function Traffic() {
  const d = useDB(); const nav = useNavigate(); const T = d.traffic
  const [vis, setVis] = useState<V[]>(() => Array.from({ length: 24 }, (_, i) => mk(i))); const [n, setN] = useState(24)
  useEffect(() => { const t = setInterval(() => { setN((k) => k + 1); setVis((L) => [mk(Date.now() % 997), ...L.slice(0, 23)]) }, 6000); return () => clearInterval(t) }, [])
  const byPage = useMemo(() => Object.entries(vis.reduce<Record<string, number>>((a, v) => { a[v.page] = (a[v.page] ?? 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1]), [vis])
  const zero = T.searches.filter((s) => s.results === 0)
  const [syn, setSyn] = useState<[string, string]>(['', ''])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="بازدیدکنندهٔ آنلاین" value={fa(vis.length + 114)} note={`${fa(vis.filter((v) => v.dev === 'موبایل').length * 100 / vis.length)}٪ موبایل`} spark={[5, 6, 7, 6, 8, 9, 8]} />
        <KPI label="در صفحهٔ پرداخت" tone="info" value={fa(vis.filter((v) => v.page === '/checkout').length + 20)} />
        <KPI label="سبد باز همین حالا" tone="success" value={fa(vis.filter((v) => v.cart).length)} note="ارزش تقریبی ۲۳۰ میلیون" />
        <KPI label="جست‌وجوی بی‌نتیجه" tone="danger" value={fa(zero.reduce((a, s) => a + s.count, 0))} note={`${fa(zero.length)} عبارت در ۳۰ روز`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card title={<span className="flex items-center gap-2">رهگیری بازدیدها<span className="flex items-center gap-1 text-11 font-normal text-success"><span className="size-2 animate-pulse rounded-full bg-success" />زنده</span></span>} pad={false}>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">{vis.map((v, i) => <li key={`${v.id}-${i}`} className={cx('flex items-center gap-3 px-4 py-2 text-12', i === 0 && n > 24 && 'row-flash')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-bg text-t2">{v.dev === 'موبایل' ? <Smartphone size={14} /> : <Laptop size={14} />}</span>
            <span className="min-w-0 flex-1"><span className="ltr block truncate text-left font-mono text-11">{v.page}</span><span className="text-11 text-t2">{v.src} · {v.city} · {rel(new Date(v.since).toISOString())}</span></span>
            {v.cart > 0 && <Badge tone="success">سبد {fa(Math.round(v.cart / 1e6))} م</Badge>}
          </li>)}</ul>
        </Card>
        <div className="space-y-4">
          <Card title="صفحه‌های پربازدید همین حالا">{byPage.slice(0, 6).map(([p, c]) => <div key={p} className="mb-2 text-12"><p className="flex justify-between"><span className="ltr truncate font-mono">{p}</span><b className="tnum">{fa(c)}</b></p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-brand" style={{ width: `${(c / byPage[0][1]) * 100}%` }} /></div></div>)}</Card>
          <Card title="منبع ورود">{SRC.map((s) => { const c = vis.filter((v) => v.src === s).length; return <div key={s} className="mb-1.5 flex items-center gap-2 text-12"><Globe size={12} className="text-t2" /><span className="w-20">{s}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-bg"><span className="block h-full rounded-full bg-[#ffc24b]" style={{ width: `${(c / vis.length) * 100}%` }} /></span><b className="tnum w-6 text-left">{fa(c)}</b></div> })}</Card>
        </div>
      </div>
      <Card title={<span className="flex items-center gap-1.5"><Search size={15} />جست‌وجوهای داخل سایت</span>} pad={false}>
        <DataTable name="جست‌وجوها" rows={[...T.searches].sort((a, b) => b.count - a.count)} rowKey={(s) => s.id} empty={{ title: 'جست‌وجویی ثبت نشده است.' }}
          cols={[{ key: 't', title: 'عبارت', render: (s) => <b>{s.term}</b>, text: (s) => s.term }, { key: 'c', title: 'تعداد', align: 'left', render: (s) => fa(s.count), sort: (s) => s.count }, { key: 'r', title: 'نتیجه', render: (s) => s.results ? `${fa(s.results)} کالا` : <Badge tone="danger">بی‌نتیجه</Badge>, sort: (s) => s.results, text: (s) => (s.results ? 'دارد' : 'بی‌نتیجه') }, { key: 'ctr', title: 'کلیک روی نتیجه', align: 'left', render: (s) => s.results ? `${fa(s.ctr)}٪` : '—', sort: (s) => s.ctr }, { key: 'a', title: 'اقدام', render: (s) => s.action ? <Badge tone="success">{s.action}</Badge> : s.results === 0 ? <span className="text-11 text-warning">فرصت: تأمین کالا یا مترادف</span> : '—', text: (s) => s.action ?? '' }]}
          actions={(s) => [{ label: 'افزودن مترادف', onClick: () => setSyn([s.term, '']) }, { label: 'تأمین این کالا (به تأمین و خرید)', onClick: () => { mutate((x) => { x.traffic.searches.find((y) => y.id === s.id)!.action = 'ارسال به تأمین' }, { action: 'ارسال جست‌وجوی بی‌نتیجه به تأمین', target: s.term }); nav('/admin/supply') } }, { label: 'ساخت صفحهٔ فرود', onClick: () => nav('/admin/seo?tab=landing') }]} />
        <div className="border-t border-line p-4"><p className="mb-2 text-12 font-semibold">مترادف‌ها (جست‌وجوی یکی، نتیجهٔ دیگری را هم نشان می‌دهد)</p><div className="flex flex-wrap gap-1.5">{T.synonyms.map(([a, b], i) => <span key={i} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-12">{a} ⇄ {b}<button type="button" aria-label="حذف مترادف" onClick={() => mutate((x) => { x.traffic.synonyms.splice(i, 1) })} className="text-t2 hover:text-danger"><Trash2 size={11} /></button></span>)}<Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setSyn(['', ''])}>مترادف تازه</Button></div></div>
      </Card>
      <Modal open={syn[0] !== '' || syn[1] !== '' ? true : false} onClose={() => setSyn(['', ''])} title="مترادف جست‌وجو" footer={<Button variant="primary" onClick={() => { if (!syn[0].trim() || !syn[1].trim()) return toast('هر دو عبارت را بنویسید.', { tone: 'err' }); mutate((x) => { x.traffic.synonyms.push([syn[0].trim(), syn[1].trim()]); const s = x.traffic.searches.find((y) => y.term === syn[0].trim()); if (s) s.action = 'مترادف اضافه شد' }, { action: 'افزودن مترادف جست‌وجو', target: syn.join(' ⇄ ') }); setSyn(['', '']); toast('مترادف اضافه شد.') }}>افزودن</Button>}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="عبارت جست‌وجوشده"><Input value={syn[0]} onChange={(e) => setSyn([e.target.value, syn[1]])} /></Field><Field label="همان معنا در کالاها"><Input value={syn[1]} onChange={(e) => setSyn([syn[0], e.target.value])} placeholder="مثلا AirPods 4" /></Field></div>
      </Modal>
    </div>
  )
}

/** نشست‌های فعال تیم: هر دستگاه واردشده، با امکان خروج از راه دور */
export function ActiveSessions() {
  const d = useDB(); const S = d.traffic.sessions
  const name = (u: string) => d.team.find((x) => x.id === u)?.name ?? u
  const kill = (id: string, who: string) => { mutate((x) => { x.traffic.sessions = x.traffic.sessions.filter((s) => s.id !== id) }, { action: 'خروج از نشست از راه دور', target: who }); toast(`نشست ${who} بسته شد.`) }
  const odd = S.filter((s) => s.city !== 'تهران' && s.city !== 'کرج')
  return (
    <div className="space-y-3">
      {odd.length > 0 && <div className="flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger-bg/60 p-3 text-13"><ShieldAlert size={16} className="text-danger" />{fa(odd.length)} نشست از شهر غیرمعمول ({odd.map((s) => `${name(s.userId)} از ${s.city}`).join('، ')}). اگر آشنا نیست، ببندید.</div>}
      <DataTable name="نشست‌های فعال" rows={S} rowKey={(s) => s.id} empty={{ title: 'نشست فعالی نیست.' }}
        cols={[{ key: 'u', title: 'عضو', render: (s) => <span className="flex items-center gap-2"><b>{name(s.userId)}</b>{s.current && <Badge tone="brand" dot={false}>همین دستگاه</Badge>}</span>, text: (s) => name(s.userId) }, { key: 'd', title: 'دستگاه', render: (s) => <span className="flex items-center gap-1.5"><MonitorSmartphone size={14} className="text-t2" />{s.device} · {s.browser}</span> }, { key: 'ip', title: 'IP', render: (s) => <span className="ltr font-mono text-12">{s.ip}</span> }, { key: 'c', title: 'شهر', render: (s) => <span className={s.city !== 'تهران' && s.city !== 'کرج' ? 'font-semibold text-danger' : ''}>{s.city}</span>, text: (s) => s.city }, { key: 'l', title: 'آخرین فعالیت', render: (s) => <span className="text-12 text-t2">{rel(s.last)}</span>, sort: (s) => s.last }]}
        actions={(s) => [{ label: 'خروج این نشست', icon: <LogOut size={14} />, danger: true, disabled: s.current, onClick: () => kill(s.id, name(s.userId)) }]} />
      <Button variant="ghost" icon={<Ban size={14} />} onClick={() => { mutate((x) => { x.traffic.sessions = x.traffic.sessions.filter((s) => s.current) }, { action: 'خروج از همهٔ نشست‌های دیگر', target: 'تیم' }); toast('همهٔ نشست‌ها به جز همین دستگاه بسته شدند.') }}>خروج از همهٔ نشست‌های دیگر</Button>
    </div>
  )
}

/** استوری‌های صفحهٔ اصلی فروشگاه (دایره‌های بالای صفحه): کاور، لینک به کالا یا دسته یا مقاله، تاریخ پایان و آمار */
export function StoriesTab() {
  const d = useDB(); const L = d.traffic.stories; const [ed, setEd] = useState<Story | null>(null)
  return (
    <div className="space-y-4">
      <Card title="پیش‌نمایش ردیف استوری‌ها"><div className="flex gap-4 overflow-x-auto pb-1">{L.filter((s) => s.on).map((s) => <button key={s.id} type="button" onClick={() => setEd(structuredClone(s))} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"><span className="rounded-full bg-[conic-gradient(#0000ff,#ffc24b,#0000ff)] p-[3px]"><img src={s.cover} alt="" className="size-16 rounded-full border-2 border-white bg-white object-cover" /></span><span className="line-clamp-2 text-11">{s.title}</span></button>)}<button type="button" onClick={() => setEd({ id: `st${Date.now().toString(36)}`, title: '', cover: '', link: '/', kind: 'product', views: 0, clicks: 0, until: new Date(Date.now() + 3 * 864e5).toISOString(), on: true })} className="flex w-20 shrink-0 flex-col items-center gap-1.5"><span className="grid size-[70px] place-items-center rounded-full border-2 border-dashed border-line text-t2"><Plus size={20} /></span><span className="text-11">استوری تازه</span></button></div></Card>
      <DataTable name="استوری‌ها" rows={L} rowKey={(s) => s.id} onRow={(s) => setEd(structuredClone(s))} empty={{ title: 'استوری ندارید.' }}
        cols={[{ key: 't', title: 'استوری', render: (s) => <span className="flex items-center gap-2"><img src={s.cover} alt="" className="size-10 rounded-full object-cover" /><b>{s.title}</b></span>, text: (s) => s.title }, { key: 'l', title: 'لینک', render: (s) => <span className="ltr font-mono text-11">{s.link}</span> }, { key: 'v', title: 'بازدید', align: 'left', render: (s) => fa(s.views), sort: (s) => s.views }, { key: 'c', title: 'کلیک', align: 'left', render: (s) => `${fa(s.clicks)} · ${s.views ? fa(Math.round((s.clicks / s.views) * 1000) / 10) : 0}٪`, sort: (s) => s.clicks }, { key: 'u', title: 'تا', render: (s) => <span className="text-12">{new Date(s.until).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })}</span>, sort: (s) => s.until }, { key: 'on', title: 'وضعیت', render: (s) => <Badge tone={s.on ? 'success' : 'neutral'}>{s.on ? 'فعال' : 'خاموش'}</Badge>, text: (s) => (s.on ? 'فعال' : 'خاموش') }]} />
      <Modal open={!!ed} onClose={() => setEd(null)} title="استوری" footer={<>{ed && L.some((s) => s.id === ed.id) && <Button variant="danger" onClick={() => { mutate((x) => { x.traffic.stories = x.traffic.stories.filter((s) => s.id !== ed.id) }, { action: 'حذف استوری', target: ed.title }); setEd(null) }}>حذف</Button>}<Button variant="primary" onClick={() => { if (!ed?.title.trim() || !ed.cover) return toast('عنوان و کاور لازم است.', { tone: 'err' }); mutate((x) => { const i = x.traffic.stories.findIndex((s) => s.id === ed.id); if (i >= 0) x.traffic.stories[i] = ed; else x.traffic.stories.unshift(ed) }, { action: 'ذخیرهٔ استوری', target: ed.title }); setEd(null); toast('استوری ذخیره شد.') }}>ذخیره</Button></>}>
        {ed && <div className="space-y-3"><label className="mx-auto block w-28 cursor-pointer text-center"><span className="block rounded-full bg-[conic-gradient(#0000ff,#ffc24b,#0000ff)] p-[3px]">{ed.cover ? <img src={ed.cover} alt="" className="size-24 rounded-full border-2 border-white object-cover" /> : <span className="grid size-24 place-items-center rounded-full border-2 border-white bg-neutral-bg text-11 text-t2">کاور ۱:۱</span>}</span><input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEd({ ...ed, cover: await fileToImage(f, 600, 0.85) }) }} /></label>
          <Field label="عنوان"><Input value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} /></Field>
          <div className="grid grid-cols-[140px_1fr] gap-2"><Field label="نوع لینک"><Select value={ed.kind} onChange={(v) => setEd({ ...ed, kind: v as Story['kind'] })} options={[['product', 'کالا'], ['category', 'دسته'], ['blog', 'مقاله یا ویدیو'], ['url', 'نشانی دلخواه']]} /></Field><Field label="لینک">{ed.kind === 'product' ? <Select value={ed.link.replace('/product/', '')} onChange={(v) => setEd({ ...ed, link: `/product/${v}` })} options={d.products.map((p) => [p.id, p.en] as [string, string])} /> : <Input className="ltr text-left" value={ed.link} onChange={(e) => setEd({ ...ed, link: e.target.value })} />}</Field></div>
          <div className="flex items-end gap-3"><Field label="نمایش تا"><Input type="date" value={ed.until.slice(0, 10)} onChange={(e) => setEd({ ...ed, until: new Date(`${e.target.value}T23:59:00`).toISOString() })} /></Field><Toggle on={ed.on} onChange={(v) => setEd({ ...ed, on: v })} text="فعال" /></div></div>}
      </Modal>
    </div>
  )
}
