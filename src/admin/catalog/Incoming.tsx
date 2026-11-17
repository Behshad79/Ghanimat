// کالاهای در راه: ثبت خرید پیش از رسیدن، پیش‌ساخت صفحه و محتوا، نمایش در «به‌زودی» و رسید و انتشار یک‌جا
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clapperboard, ExternalLink, FileText, PackageCheck, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { Modal, toast } from '@/shared/ui/overlay'
import { getDB, mutate, notify, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { IN_ROUTES, IN_STAGES, type InBatch, type InItem } from '@/shared/data/incoming'
import type { Product } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'

const daysTo = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
const nameFromUrl = (u: string) => { try { const seg = new URL(u).pathname.split('/').filter(Boolean); const i = seg.indexOf('dp'); const slug = i > 0 ? seg[i - 1] : seg[0]; return slug && slug !== 'dp' ? decodeURIComponent(slug).replace(/[-_]+/g, ' ') : '' } catch { return '' } }
/** هر خط: «نام | تعداد | لینک» یا فقط لینک آمازون یا فقط نام */
export function parseLines(t: string): Omit<InItem, 'id'>[] {
  return t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split(/[|،,\t]/).map((x) => x.trim()).filter(Boolean)
    const url = parts.find((x) => /^https?:\/\//i.test(x)); const qty = Number((parts.find((x) => /^[\d۰-۹]+$/.test(x)) ?? '1').replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))))
    const name = parts.find((x) => x !== url && !/^[\d۰-۹]+$/.test(x)) ?? (url ? nameFromUrl(url) : '') ?? ''
    return { name: name || 'کالای آمازون (نام را اصلاح کنید)', qty: qty || 1, amazonUrl: url }
  })
}

export function Incoming() {
  const d = useDB(); const nav = useNavigate()
  const [add, setAdd] = useState<string | null>(null); const [batchForm, setBatchForm] = useState<InBatch | null>(null); const [recv, setRecv] = useState<string | null>(null)
  const open = d.incoming.filter((b) => !b.receivedAt); const done = d.incoming.filter((b) => b.receivedAt)
  const items = open.flatMap((b) => b.items); const prod = (id?: string) => (id ? d.products.find((p) => p.id === id) : undefined)
  const pagesReady = items.filter((i) => (prod(i.productId)?.health ?? 0) >= 70).length
  const contentFor = (pid?: string) => (pid ? d.contentQueue.filter((c) => c.productId === pid).length + d.blog.posts.filter((p) => p.related.includes(pid)).length : 0)
  const nearest = open.map((b) => daysTo(b.eta)).sort((a, b) => a - b)[0]
  const upd = (bid: string, fn: (b: InBatch) => void, action: string) => mutate((x) => fn(x.incoming.find((b) => b.id === bid)!), { action, target: bid })

  const buildPage = (b: InBatch, it: InItem) => {
    if (it.productId) return nav(`/admin/catalog/${it.productId}/edit`)
    const pid = `p${Date.now().toString(36)}`
    mutate((x) => {
      x.products.unshift({ id: pid, image: '', images: [], title: it.name, en: it.name, brand: '', category: 'هدفون', status: 'product.incoming', mode: 'qty', qty: { tehran: 0, mahabad: 0 }, priceNew: 0, rating: 0, reviews: 0, views: 0, cvr: 0, health: 20, fastEligible: false, seller: 'غنیمت', torob: false, incoming: b.id, source: it.amazonUrl ? 'amazon' : undefined, pdp: it.amazonUrl ? { amazonUrl: it.amazonUrl } : undefined } as unknown as Product)
      x.incoming.find((y) => y.id === b.id)!.items.find((y) => y.id === it.id)!.productId = pid
    }, { action: 'شروع پیش‌ساخت صفحهٔ کالای در راه', target: it.name })
    nav(`/admin/catalog/${pid}/edit`)
  }
  const addInsta = (it: InItem, b: InBatch) => { mutate((x) => { x.contentQueue.unshift({ id: `cq${Date.now().toString(36)}`, productId: it.productId!, channel: 'اینستاگرام', kind: 'ریلز', status: 'ایده', due: new Date(Math.min(new Date(b.eta).getTime() - 864e5, Date.now() + 7 * 864e5)).toISOString(), owner: 'پویا', note: `معرفی پیش از رسیدن · ${b.title}` }) }, { action: 'سناریوی اینستاگرام برای کالای در راه', target: it.name }); toast('به صف تولید محتوا رفت؛ از «آمادگی کالا و محتوا» پیگیری کنید.') }
  const addArticle = (it: InItem) => { const id = `ar${Date.now().toString(36)}`; mutate((x) => { x.blog.posts.unshift({ id, title: `معرفی ${it.name}`, slug: id, excerpt: '', cover: '', category: x.blog.cats[0], tags: ['به‌زودی'], author: 'تحریریهٔ غنیمت', status: 'پیش‌نویس', publishAt: new Date().toISOString(), views: 0, helpful: [0, 0], seo: { title: '', desc: '' }, related: [it.productId!], blocks: [{ id: `h${id}`, t: 'h2', v: '' }, { id: `p${id}`, t: 'p', html: '' }] } as any) }, { action: 'مقالهٔ پیش از رسیدن', target: it.name }); nav(`/admin/blog/${id}`) }
  const setSoon = (b: InBatch, it: InItem, on: boolean) => mutate((x) => { const p = x.products.find((y) => y.id === it.productId)!; p.comingSoon = on ? b.eta : undefined }, { action: on ? 'افزودن به «به‌زودی»' : 'برداشتن از «به‌زودی»', target: it.name })

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KPI label="محمولهٔ در راه" value={fa(open.length)} note={nearest !== undefined ? `نزدیک‌ترین: ${nearest > 0 ? `${fa(nearest)} روز دیگر` : 'امروز یا گذشته'}` : 'محموله‌ای در راه نیست'} />
      <KPI label="قلم و تعداد در راه" value={`${fa(items.length)} قلم`} note={`${fa(items.reduce((a, i) => a + i.qty, 0))} عدد`} />
      <KPI label="صفحهٔ آماده" value={`${fa(pagesReady)} از ${fa(items.length)}`} note="صفحه با سلامت ۷۰٪ به بالا" />
      <KPI label="در بخش «به‌زودی»" value={fa(items.filter((i) => prod(i.productId)?.comingSoon).length)} note="با تاریخ رسیدن و «خبرم کن»" />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-info-bg px-4 py-3 text-12 text-info"><span>روند: خرید را با فهرست یا لینک آمازون ثبت کنید ← تا رسیدن، صفحهٔ کامل کالا، سناریوی اینستاگرام و مقاله را آماده کنید ← اگر خواستید در «به‌زودی» نشان دهید ← هنگام رسید فقط تعداد واقعی، بارکد، کد و رنگ را وارد و یک‌جا منتشر کنید.</span>
      <Button variant="primary" icon={<Plus size={14} />} onClick={() => setBatchForm({ id: `IN-${Date.now().toString(36).slice(-4).toUpperCase()}`, title: '', route: IN_ROUTES[0], orderedAt: new Date().toISOString(), eta: new Date(Date.now() + 20 * 864e5).toISOString(), stage: IN_STAGES[0], items: [] })}>ثبت خرید در راه</Button></div>

    {open.length === 0 && <Card><EmptyState title="خرید در راهی ثبت نشده است." desc="خرید آمازون یا اربیل را از همان روز خرید ثبت کنید تا صفحه و محتوا تا رسیدنش آماده شود." /></Card>}
    {open.map((b) => { const dl = daysTo(b.eta); const si = IN_STAGES.indexOf(b.stage as any); return (
      <Card key={b.id} title={<span className="flex flex-wrap items-center gap-2">{b.title}<Badge dot={false}>{b.id}</Badge><Badge tone={dl < 0 ? 'danger' : dl <= 3 ? 'warning' : 'info'}>{dl < 0 ? `${fa(-dl)} روز تأخیر` : dl === 0 ? 'امروز می‌رسد' : `${fa(dl)} روز تا رسیدن`}</Badge></span>}
        actions={<span className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setBatchForm(structuredClone(b))}>ویرایش</Button><Button size="sm" icon={<Plus size={13} />} onClick={() => setAdd(b.id)}>افزودن اقلام</Button><Button size="sm" variant="primary" icon={<PackageCheck size={13} />} disabled={!b.items.length} onClick={() => setRecv(b.id)}>رسید و انتشار</Button></span>} pad={false}>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-12 text-t2"><span>مسیر: {b.route}</span>{b.supplier && <span>تأمین‌کننده: {b.supplier}</span>}<span>خرید: {new Date(b.orderedAt).toLocaleDateString('fa-IR')}</span><span>رسیدن حدودی: {new Date(b.eta).toLocaleDateString('fa-IR')}</span>{b.note && <span>{b.note}</span>}</div>
          <ol className="flex flex-wrap gap-1" aria-label="مرحلهٔ محموله">{IN_STAGES.map((s, i) => <li key={s}><button onClick={() => upd(b.id, (x) => { x.stage = s }, `مرحلهٔ محموله: ${s}`)} className={cx('rounded-full px-2.5 py-1 text-11 transition', i < si ? 'bg-success-bg text-success' : i === si ? 'bg-brand-solid font-semibold text-white' : 'bg-neutral-bg text-t2 hover:bg-line')}>{s}</button></li>)}</ol>
        </div>
        {b.items.length === 0 ? <div className="border-t border-line p-4"><EmptyState title="هنوز قلمی ثبت نشده است." action={<Button size="sm" onClick={() => setAdd(b.id)}>افزودن اقلام</Button>} /></div> :
          <div className="overflow-x-auto border-t border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['کالا', 'تعداد', 'صفحهٔ کالا', 'محتوا', 'به‌زودی', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
            {b.items.map((it) => { const p = prod(it.productId); return <tr key={it.id} className="border-t border-line align-middle">
              <td className="p-2"><span className="flex items-center gap-2">{p?.image ? <ProductImg pid={p.id} size={34} /> : <span className="grid size-[34px] place-items-center rounded-lg bg-neutral-bg text-t2"><Sparkles size={14} /></span>}<span className="min-w-0"><span className="block max-w-64 truncate font-medium">{p?.title ?? it.name}</span>{it.amazonUrl && <a href={it.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-11 text-brand hover:underline"><ExternalLink size={11} />لینک آمازون</a>}</span></span></td>
              <td className="p-2"><Input aria-label={`تعداد ${it.name}`} className="ltr w-16 text-center" inputMode="numeric" value={String(it.qty)} onChange={(e) => upd(b.id, (x) => { x.items.find((y) => y.id === it.id)!.qty = +e.target.value.replace(/\D/g, '') || 0 }, 'ویرایش تعداد قلم در راه')} /></td>
              <td className="p-2">{p ? <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-bg"><span className={cx('block h-full rounded-full', p.health >= 70 ? 'bg-success-solid' : 'bg-warning')} style={{ width: `${p.health}%` }} /></span><span className="tnum text-11 text-t2">{fa(p.health)}٪</span><Button size="sm" variant="ghost" onClick={() => buildPage(b, it)}>ادامهٔ ساخت</Button></span> : <Button size="sm" onClick={() => buildPage(b, it)}>ساخت صفحه از الان</Button>}</td>
              <td className="p-2">{p ? <span className="flex items-center gap-1"><Badge tone={contentFor(p.id) ? 'success' : 'neutral'} dot={false}>{fa(contentFor(p.id))} محتوا</Badge><Button size="sm" variant="ghost" icon={<Clapperboard size={12} />} onClick={() => addInsta(it, b)}>سناریوی اینستا</Button><Button size="sm" variant="ghost" icon={<FileText size={12} />} onClick={() => addArticle(it)}>مقاله</Button></span> : <span className="text-11 text-t2">اول صفحه را شروع کنید</span>}</td>
              <td className="p-2"><Toggle on={!!p?.comingSoon} disabled={!p} label={`نمایش ${it.name} در به‌زودی`} onChange={(v) => setSoon(b, it, v)} /></td>
              <td className="p-2"><button aria-label={`حذف ${it.name}`} className="grid size-7 place-items-center rounded-lg text-t2 hover:bg-danger-bg hover:text-danger" onClick={() => upd(b.id, (x) => { x.items = x.items.filter((y) => y.id !== it.id) }, 'حذف قلم از خرید در راه')}><Trash2 size={13} /></button></td>
            </tr> })}
          </tbody></table></div>}
      </Card>) })}

    {done.length > 0 && <Card title="رسیده‌ها" pad={false}><ul className="divide-y divide-line">{done.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-12"><span><b>{b.title}</b> · {fa(b.items.length)} قلم · {fa(b.items.reduce((a, i) => a + (i.arrived?.qty ?? 0), 0))} عدد رسید</span><span className="text-t2">رسید {new Date(b.receivedAt!).toLocaleDateString('fa-IR')}</span></li>)}</ul></Card>}

    {add && <AddItems batch={d.incoming.find((b) => b.id === add)!} onClose={() => setAdd(null)} />}
    {batchForm && <BatchForm b={batchForm} onClose={() => setBatchForm(null)} />}
    {recv && <Receive batch={d.incoming.find((b) => b.id === recv)!} onClose={() => setRecv(null)} />}
  </div>
}

function BatchForm({ b, onClose }: { b: InBatch; onClose: () => void }) {
  const [f, setF] = useState(b); const exists = getDB().incoming.some((x) => x.id === b.id)
  return <Modal open onClose={onClose} title={exists ? 'ویرایش خرید در راه' : 'ثبت خرید در راه'} footer={<><Button variant="primary" disabled={!f.title.trim()} onClick={() => { mutate((x) => { const i = x.incoming.findIndex((y) => y.id === f.id); if (i >= 0) x.incoming[i] = f; else x.incoming.unshift(f) }, { action: exists ? 'ویرایش خرید در راه' : 'ثبت خرید در راه', target: f.title }); toast(exists ? 'ذخیره شد.' : 'خرید ثبت شد؛ حالا اقلام را اضافه کنید.'); onClose() }}>ذخیره</Button>{exists && <Button variant="danger" onClick={() => { mutate((x) => { x.incoming = x.incoming.filter((y) => y.id !== f.id) }, { action: 'حذف خرید در راه', target: f.title }); onClose() }}>حذف</Button>}</>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="عنوان خرید"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً خرید آمازون آذر" /></Field></div>
      <Field label="مسیر"><Select value={f.route} onChange={(v) => setF({ ...f, route: v })} options={IN_ROUTES} /></Field>
      <Field label="تأمین‌کننده (اختیاری)"><Input value={f.supplier ?? ''} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></Field>
      <Field label="تاریخ خرید"><Input type="date" value={f.orderedAt.slice(0, 10)} onChange={(e) => setF({ ...f, orderedAt: new Date(e.target.value).toISOString() })} /></Field>
      <Field label="رسیدن حدودی" help="روی صفحه‌های «به‌زودی» هم همین تاریخ نشان داده می‌شود."><Input type="date" value={f.eta.slice(0, 10)} onChange={(e) => setF({ ...f, eta: new Date(e.target.value).toISOString() })} /></Field>
      <Field label="مرحله"><Select value={f.stage} onChange={(v) => setF({ ...f, stage: v })} options={[...IN_STAGES]} other={false} /></Field>
      <Field label="یادداشت"><Input value={f.note ?? ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
    </div>
  </Modal>
}

function AddItems({ batch, onClose }: { batch: InBatch; onClose: () => void }) {
  const [mode, setMode] = useState<'one' | 'list'>('one'); const [one, setOne] = useState({ name: '', qty: '1', amazonUrl: '' }); const [list, setList] = useState('')
  const rows = mode === 'list' ? parseLines(list) : one.name.trim() || one.amazonUrl.trim() ? [{ name: one.name.trim() || nameFromUrl(one.amazonUrl) || 'کالای آمازون', qty: +one.qty || 1, amazonUrl: one.amazonUrl.trim() || undefined }] : []
  const dupOf = (n: string) => { const k = (t: string) => t.toLowerCase().replace(/[\s\-_()]+/g, ''); return getDB().products.find((p) => p.status !== 'product.incoming' && (k(p.en) === k(n) || k(p.title) === k(n))) }
  return <Modal open onClose={onClose} title={`افزودن اقلام به «${batch.title}»`} footer={<><Button variant="primary" disabled={!rows.length} onClick={() => { mutate((x) => { x.incoming.find((y) => y.id === batch.id)!.items.push(...rows.map((r, i) => ({ ...r, id: `ii${Date.now().toString(36)}${i}` }))) }, { action: 'افزودن اقلام به خرید در راه', target: batch.title, after: `${rows.length} قلم` }); toast(`${fa(rows.length)} قلم اضافه شد.`); onClose() }}>افزودن {rows.length ? fa(rows.length) : ''} قلم</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <Segmented value={mode} onChange={setMode} options={[['one', 'دانه‌به‌دانه'], ['list', 'فهرست یا چند لینک']]} />
    {mode === 'one' ? <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_90px]">
      <Field label="نام کالا"><Input value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} placeholder="مثلاً Kindle Paperwhite" /></Field>
      <Field label="تعداد"><Input className="ltr text-center" inputMode="numeric" value={one.qty} onChange={(e) => setOne({ ...one, qty: e.target.value.replace(/\D/g, '') })} /></Field>
      <div className="sm:col-span-2"><Field label="لینک آمازون (اختیاری)" help="نام از لینک هم خوانده می‌شود؛ بعداً در صفحهٔ کالا برای نظرات آمازون استفاده می‌شود."><Input className="ltr text-left" value={one.amazonUrl} onChange={(e) => setOne({ ...one, amazonUrl: e.target.value })} placeholder="https://www.amazon.com/..." /></Field></div>
    </div> : <div className="mt-3"><Field label="هر خط یک قلم" help="«نام | تعداد | لینک»، یا فقط لینک آمازون، یا فقط نام. از اکسل هم می‌شود چسباند."><Textarea rows={7} className="ltr text-left font-mono text-12" value={list} onChange={(e) => setList(e.target.value)} placeholder={'AirPods Pro 2 | 30 | https://www.amazon.com/dp/...\nhttps://www.amazon.com/Kindle-Paperwhite/dp/B09TMN58KL\nApple Watch SE 2 | 15'} /></Field></div>}
    {rows.length > 0 && <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-12">{rows.map((r, i) => { const dp = dupOf(r.name); return <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2"><span className="flex-1 truncate">{r.name}</span><span className="tnum text-t2">{fa(r.qty)} عدد</span>{r.amazonUrl && <Badge dot={false}>آمازون</Badge>}{dp && <Badge tone="warning">در کاتالوگ هست: {dp.title.slice(0, 24)}</Badge>}</li> })}</ul>}
    {rows.some((r) => dupOf(r.name)) && <p className="mt-2 text-11 text-warning">برای کالایی که در کاتالوگ هست صفحهٔ تازه نسازید؛ هنگام رسید فقط موجودی همان کالا را بالا ببرید.</p>}
  </Modal>
}

function Receive({ batch, onClose }: { batch: InBatch; onClose: () => void }) {
  const d = useDB()
  const [rows, setRows] = useState(() => batch.items.map((it) => ({ id: it.id, qty: String(it.qty), ean: '', code: '', color: '', note: '', publish: !!it.productId })))
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const confirm = () => {
    let pub = 0; let drafts = 0
    mutate((x) => {
      const b = x.incoming.find((y) => y.id === batch.id)!
      rows.forEach((r) => {
        const it = b.items.find((y) => y.id === r.id)!; const q = +r.qty || 0
        it.arrived = { qty: q, ean: r.ean || undefined, code: r.code || undefined, color: r.color || undefined, note: r.note || undefined, at: new Date().toISOString() }
        let p = it.productId ? x.products.find((y) => y.id === it.productId) : undefined
        if (!p) { const pid = `p${Date.now().toString(36)}${r.id}`; p = { id: pid, image: '', images: [], title: it.name, en: it.name, brand: '', category: 'هدفون', status: 'product.draft', mode: 'qty', qty: { tehran: 0, mahabad: 0 }, priceNew: 0, rating: 0, reviews: 0, views: 0, cvr: 0, health: 20, fastEligible: false, seller: 'غنیمت', torob: false } as unknown as Product; x.products.unshift(p); it.productId = pid }
        p.qty = { tehran: (p.qty?.tehran ?? 0) + q, mahabad: p.qty?.mahabad ?? 0 }
        if (r.ean) p.ean = r.ean; if (r.code) p.code = r.code
        if (r.color) p.specs = { ...(p.specs ?? {}), رنگ: r.color }
        p.comingSoon = undefined; p.incoming = undefined
        if (r.publish && (p.price || p.priceNew)) { p.status = 'product.published'; pub++ } else { if (p.status === 'product.incoming') p.status = 'product.draft'; drafts++ }
      })
      b.stage = 'رسید به انبار'; b.receivedAt = new Date().toISOString()
    }, { action: 'رسید خرید در راه و انتشار', target: batch.title })
    notify('محموله رسید', `${batch.title}: ${fa(pub)} کالا منتشر شد${drafts ? `، ${fa(drafts)} کالا پیش‌نویس ماند` : ''}.`, '/admin/catalog?tab=incoming', 'عملیات', 'info')
    toast(`${fa(pub)} کالا منتشر شد${drafts ? `؛ ${fa(drafts)} کالا بدون قیمت یا با انتخاب شما در پیش‌نویس ماند` : ''}. منتظران «خبرم کن» پیامک گرفتند.`); onClose()
  }
  return <Modal open onClose={onClose} wide title={`رسید «${batch.title}»`} footer={<><Button variant="primary" onClick={confirm}>ثبت رسید و انتشار</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <p className="mb-3 text-12 text-t2">صفحه‌ها از قبل آماده‌اند؛ اینجا فقط تعداد رسیده، بارکد، کد کالا و رنگ یا تفاوت واقعی را وارد کنید. کالایی که صفحه ندارد به‌صورت پیش‌نویس با همین موجودی ساخته می‌شود.</p>
    <div className="space-y-2">{batch.items.map((it, i) => { const p = d.products.find((y) => y.id === it.productId); const r = rows[i]; return (
      <div key={it.id} className="rounded-xl border border-line p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-13"><b className="flex-1 truncate">{p?.title ?? it.name}</b><span className="text-11 text-t2">سفارش: {fa(it.qty)} عدد</span>{p ? <Badge tone={p.health >= 70 ? 'success' : 'warning'} dot={false}>صفحه {fa(p.health)}٪</Badge> : <Badge tone="warning" dot={false}>بدون صفحه</Badge>}</div>
        <div className="grid gap-2 sm:grid-cols-5">
          <Field label="رسیده"><Input aria-label={`رسیده ${it.name}`} className={cx('ltr text-center', +r.qty !== it.qty && 'border-warning')} inputMode="numeric" value={r.qty} onChange={(e) => set(i, { qty: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="بارکد"><Input className="ltr text-left font-mono" inputMode="numeric" value={r.ean} onChange={(e) => set(i, { ean: e.target.value })} placeholder="اسکن یا تایپ" /></Field>
          <Field label="کد کالا"><Input className="ltr text-left font-mono" value={r.code} onChange={(e) => set(i, { code: e.target.value })} placeholder="خالی: خودکار" /></Field>
          <Field label="رنگ یا تفاوت"><Input value={r.color} onChange={(e) => set(i, { color: e.target.value })} placeholder="اگر متفاوت بود" /></Field>
          <Field label="انتشار الان"><div className="flex h-10 items-center"><Toggle on={r.publish} disabled={!p} label={`انتشار ${it.name}`} onChange={(v) => set(i, { publish: v })} /></div></Field>
        </div>
      </div>) })}</div>
  </Modal>
}
