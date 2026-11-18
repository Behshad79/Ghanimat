// ویترین و غنی‌آف: زمان‌بندی پیشنهادهای زمان‌دار با صف آینده، سقف تعداد و برگشت خودکار قیمت؛ و مدیریت جایگاه‌های نمایش کالا در سایت
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CalendarClock, Copy, EyeOff, Flame, Pause, Pin, Play, Plus, Search, Square, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Segmented, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { getDB, mutate, notify, useDB } from '@/shared/lib/store'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import { DEAL_LABEL, dealStatus, overlaps, placementItems, type Deal, type Placement } from '@/shared/data/merch'
import type { Product } from '@/shared/data/seed'
import { ProductImg, useTab } from '../pages/_shared'

const hrs = (ms: number) => Math.round(ms / 36e5)
const span = (a: string, b: string) => { const h = hrs(new Date(b).getTime() - new Date(a).getTime()); return h >= 48 ? `${fa(Math.round(h / 24))} روز` : `${fa(h)} ساعت` }
const regularOf = (p?: Product) => p?.price || p?.priceNew || 0
const localDT = (iso: string) => { const t = new Date(iso); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16) }
const fmt = (iso: string) => new Date(iso).toLocaleString('fa-IR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
function useNow(ms = 30000) { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms]); return n }
const left = (iso: string, now: number) => { const m = Math.max(0, Math.round((new Date(iso).getTime() - now) / 6e4)); return m >= 60 ? `${fa(Math.floor(m / 60))} ساعت و ${fa(m % 60)} دقیقه` : `${fa(m)} دقیقه` }

export function Merch() {
  const d = useDB(); const [tab, setTab] = useTab('deals')
  const live = d.merch.deals.filter((x) => dealStatus(x) === 'live'); const queued = d.merch.deals.filter((x) => dealStatus(x) === 'scheduled')
  return <Page title="ویترین و غنی‌آف" module="merch" sub="کدام کالا، کجای سایت، از کی تا کی و با چه قیمتی؛ بعد از پایان یا تمام شدن سقف، قیمت خودکار به حالت عادی برمی‌گردد."
    tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'deals', label: 'غنی‌آف و صف زمان‌بندی', count: live.length + queued.length }, { id: 'places', label: 'جایگاه‌های ویترین', count: d.merch.placements.filter((p) => p.on).length }, { id: 'byproduct', label: 'هر کالا کجا نمایش داده شود' }]} />}>
    {tab === 'deals' && <Deals />}
    {tab === 'places' && <Places />}
    {tab === 'byproduct' && <ByProduct />}
  </Page>
}

/* ───────────── غنی‌آف ───────────── */
function Deals() {
  const d = useDB(); const now = useNow(); const [form, setForm] = useState<Partial<Deal> | null>(null); const [showEnded, setShowEnded] = useState(false)
  const all = d.merch.deals.map((x) => ({ x, st: dealStatus(x, now), p: d.products.find((p) => p.id === x.pid) }))
  const live = all.filter((r) => r.st === 'live' || r.st === 'paused').sort((a, b) => +new Date(a.x.end) - +new Date(b.x.end))
  const queue = all.filter((r) => r.st === 'scheduled').sort((a, b) => +new Date(a.x.start) - +new Date(b.x.start))
  const done = all.filter((r) => r.st === 'ended' || r.st === 'soldout').sort((a, b) => +new Date(b.x.end) - +new Date(a.x.end))
  const upd = (id: string, fn: (x: Deal) => void, action: string) => mutate((db) => fn(db.merch.deals.find((y) => y.id === id)!), { action, target: id })
  const endingSoon = live.filter((r) => new Date(r.x.end).getTime() - now < 2 * 36e5).length
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KPI label="غنی‌آف در حال اجرا" value={fa(live.filter((r) => r.st === 'live').length)} note={endingSoon ? `${fa(endingSoon)} مورد کمتر از ۲ ساعت مانده` : 'همه با زمان کافی'} />
      <KPI label="در صف آینده" value={fa(queue.length)} note={queue[0] ? `بعدی: ${fmt(queue[0].x.start)}` : 'صف خالی است'} />
      <KPI label="فروش با غنی‌آف (فعال)" value={`${fa(live.reduce((a, r) => a + r.x.sold, 0))} از ${fa(live.reduce((a, r) => a + r.x.cap, 0))}`} note="عدد فروخته از سقف تعیین‌شده" />
      <KPI label="تخفیف داده‌شده (فعال)" value={compactToman(live.reduce((a, r) => a + (r.x.regular - r.x.price) * r.x.sold, 0))} note="اختلاف قیمت عادی و غنی‌آف × فروش" />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-info-bg px-4 py-3 text-12 text-info"><span>هر غنی‌آف: یک کالا، قیمت ویژه، شروع و پایان، سقف تعداد. تا شروع در «صف» می‌ماند، سر وقت خودکار فعال می‌شود و با پایان زمان یا تمام شدن سقف، قیمت به عادی برمی‌گردد. یک کالا هم‌زمان دو غنی‌آف نمی‌گیرد.</span>
      <Button variant="primary" icon={<Plus size={14} />} onClick={() => setForm({})}>زمان‌بندی غنی‌آف</Button></div>
    <Timeline rows={[...live, ...queue]} now={now} onPick={(x) => setForm(x)} />
    <DealList title="در حال اجرا" rows={live} now={now} empty="الان غنی‌آفی اجرا نمی‌شود." onEdit={setForm} upd={upd} />
    <DealList title="صف آینده" rows={queue} now={now} empty="غنی‌آفی برای آینده زمان‌بندی نشده است." onEdit={setForm} upd={upd} />
    <Card title={<button className="flex items-center gap-2" onClick={() => setShowEnded(!showEnded)}>پایان‌یافته‌ها <Badge dot={false}>{fa(done.length)}</Badge><span className="text-11 font-normal text-brand">{showEnded ? 'بستن' : 'نمایش'}</span></button>} pad={false}>
      {showEnded && <DealRows rows={done} now={now} onEdit={setForm} upd={upd} />}
    </Card>
    {form && <DealForm init={form} onClose={() => setForm(null)} />}
  </div>
}

function Timeline({ rows, now, onPick }: { rows: { x: Deal; st: string; p?: Product }[]; now: number; onPick: (x: Deal) => void }) {
  const [days, setDays] = useState<'3' | '7'>('3'); const from = now - 6 * 36e5; const to = now + +days * 864e5; const W = to - from
  const pos = (iso: string) => Math.min(100, Math.max(0, ((new Date(iso).getTime() - from) / W) * 100))
  const ticks = Array.from({ length: +days + 1 }, (_, i) => { const t = new Date(now); t.setHours(0, 0, 0, 0); return t.getTime() + i * 864e5 }).filter((t) => t > from + W * 0.05 && t < to - W * 0.05)
  return <Card title={<span className="flex items-center gap-2"><CalendarClock size={16} />تقویم غنی‌آف</span>} actions={<Segmented size="sm" value={days} onChange={setDays} options={[['3', '۳ روز'], ['7', '۷ روز']]} />}>
    {rows.length === 0 ? <EmptyState title="در این بازه غنی‌آفی نیست." desc="با «زمان‌بندی غنی‌آف» اولین مورد را در صف بگذارید." /> :
      <div className="relative">
        <div className="relative mb-1 h-5 text-[10px] text-t3">{ticks.map((t) => <span key={t} className="absolute -translate-x-1/2" style={{ right: `${((t - from) / W) * 100}%` }}>{new Date(t).toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric' })}</span>)}</div>
        <div className="space-y-1.5">{rows.map(({ x, st, p }) => { const r = pos(x.start); const l = pos(x.end); return (
          <div key={x.id} className="relative h-8 rounded-md bg-neutral-bg/60">
            <button onClick={() => onPick(x)} title={`${p?.title} · ${fmt(x.start)} تا ${fmt(x.end)}`} className={cx('absolute inset-y-1 flex items-center gap-1 overflow-hidden rounded px-2 text-11 font-medium text-white', st === 'live' ? 'bg-success-solid' : st === 'paused' ? 'bg-danger-solid' : 'bg-brand-solid')} style={{ right: `${r}%`, width: `${Math.max(2, l - r)}%` }}><Flame size={11} className="shrink-0" /><span className="truncate">{p?.title ?? x.pid}</span></button>
          </div>) })}</div>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-danger" style={{ right: `${pos(new Date(now).toISOString())}%` }}><span className="absolute -top-1 -translate-x-1/2 rounded bg-danger px-1 text-[10px] text-white">الان</span></div>
      </div>}
  </Card>
}

function DealList({ title, rows, now, empty, onEdit, upd }: { title: string; rows: { x: Deal; st: string; p?: Product }[]; now: number; empty: string; onEdit: (x: Deal) => void; upd: (id: string, fn: (x: Deal) => void, a: string) => void }) {
  return <Card title={<span className="flex items-center gap-2">{title}<Badge dot={false}>{fa(rows.length)}</Badge></span>} pad={false}>
    {rows.length === 0 ? <p className="p-4 text-12 text-t2">{empty}</p> : <DealRows rows={rows} now={now} onEdit={onEdit} upd={upd} />}
  </Card>
}

function DealRows({ rows, now, onEdit, upd }: { rows: { x: Deal; st: string; p?: Product }[]; now: number; onEdit: (x: Deal) => void; upd: (id: string, fn: (x: Deal) => void, a: string) => void }) {
  const d = useDB(); const floor = d.rules.find((r) => r.key === 'margin_floor')?.value ?? 0
  return <ul className="divide-y divide-line">{rows.map(({ x, st, p }) => { const off = Math.round((1 - x.price / Math.max(1, x.regular)) * 100); const margin = p?.cost ? Math.round(((x.price - p.cost) / x.price) * 100) : null; const [lb, tone] = DEAL_LABEL[st as keyof typeof DEAL_LABEL]; return (
    <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <ProductImg pid={x.pid} size={44} />
      <div className="min-w-48 flex-1"><p className="flex flex-wrap items-center gap-2 text-13 font-medium">{p?.title ?? 'کالای حذف‌شده'}<Badge tone={tone}>{lb}</Badge>{x.note && <Badge dot={false}>{x.note}</Badge>}</p>
        <p className="mt-0.5 text-12 text-t2">{fmt(x.start)} تا {fmt(x.end)} · {span(x.start, x.end)}{st === 'live' && <b className="mr-2 text-danger">{left(x.end, now)} مانده</b>}{st === 'scheduled' && <span className="mr-2 text-brand">شروع {left(x.start, now)} دیگر</span>}</p>
        <p className="mt-0.5 text-11 text-t3">نمایش در: {x.places.map((id) => d.merch.placements.find((pl) => pl.id === id)?.name ?? id).join('، ') || 'فقط صفحهٔ کالا'} · سقف هر مشتری {fa(x.perUser)} عدد{x.notifyBefore ? ` · پیامک «خبرم کن» ${fa(x.notifyBefore)} ساعت قبل` : ''}</p></div>
      <div className="text-left"><p className="text-11 text-t3 line-through">{toman(x.regular)}</p><p className="text-14 font-bold text-danger">{toman(x.price)} <span className="text-11">({fa(off)}٪)</span></p>{margin !== null && <p className={cx('text-11', margin < floor ? 'text-danger' : 'text-success')}>حاشیه {fa(margin)}٪</p>}</div>
      <div className="w-28"><div className="mb-1 flex justify-between text-11 text-t2"><span>فروش</span><span className="tnum">{fa(x.sold)} از {fa(x.cap)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full', x.sold >= x.cap ? 'bg-warning' : 'bg-danger-solid')} style={{ width: `${Math.min(100, (x.sold / Math.max(1, x.cap)) * 100)}%` }} /></div></div>
      <div className="flex flex-wrap gap-1">
        {(st === 'live' || st === 'scheduled' || st === 'paused') && <Button size="sm" variant="ghost" onClick={() => onEdit(x)}>ویرایش</Button>}
        {st === 'live' && <Button size="sm" variant="ghost" icon={<Pause size={12} />} onClick={() => upd(x.id, (y) => { y.paused = true }, 'توقف موقت غنی‌آف')}>توقف</Button>}
        {st === 'paused' && <Button size="sm" variant="ghost" icon={<Play size={12} />} onClick={() => upd(x.id, (y) => { y.paused = false }, 'ادامهٔ غنی‌آف')}>ادامه</Button>}
        {(st === 'live' || st === 'paused') && <Button size="sm" variant="ghost" icon={<Square size={12} />} onClick={async () => { if (await confirm({ title: 'غنی‌آف همین الان تمام شود؟', body: `قیمت «${p?.title}» به ${toman(x.regular)} برمی‌گردد.`, confirm: 'پایان الان', danger: true })) upd(x.id, (y) => { y.endedAt = new Date().toISOString() }, 'پایان دستی غنی‌آف') }}>پایان الان</Button>}
        {st === 'scheduled' && <Button size="sm" variant="ghost" icon={<Play size={12} />} onClick={() => { const o = overlaps({ ...x, start: new Date().toISOString() }, getDB().merch.deals); if (o && o.id !== x.id) return toast('غنی‌آف دیگری برای این کالا در جریان است.', { tone: 'err' }); upd(x.id, (y) => { y.start = new Date().toISOString() }, 'شروع زودتر غنی‌آف') }}>شروع الان</Button>}
        <Button size="sm" variant="ghost" icon={<Copy size={12} />} onClick={() => { const dur = +new Date(x.end) - +new Date(x.start); const last = getDB().merch.deals.filter((y) => y.pid === x.pid).reduce((a, y) => Math.max(a, +new Date(y.end)), Date.now()); onEdit({ ...x, id: undefined as any, sold: 0, endedAt: undefined, paused: false, notified: false, start: new Date(last + 36e5).toISOString(), end: new Date(last + 36e5 + dur).toISOString() }) }}>تکرار</Button>
        {st === 'scheduled' && <Button size="sm" variant="ghost" aria-label="حذف از صف" icon={<Trash2 size={12} />} onClick={() => mutate((db) => { db.merch.deals = db.merch.deals.filter((y) => y.id !== x.id) }, { action: 'حذف غنی‌آف از صف', target: p?.title ?? x.id })} />}
      </div>
    </li>) })}</ul>
}

const DUR = [3, 6, 12, 24, 48, 72]
/** فرم غنی‌آف؛ از ویترین، جدول کالاها و فرم ساخت کالا باز می‌شود. اگر onDraft داده شود (کالای هنوز ذخیره‌نشده)، به‌جای ثبت، پیش‌نویس برمی‌گرداند */
export function DealForm({ init, onClose, onDraft, lockPid }: { init: Partial<Deal>; onClose: () => void; onDraft?: (x: Omit<Deal, 'id' | 'pid'> & { pid?: string }) => void; lockPid?: boolean }) {
  const d = useDB(); const floor = d.rules.find((r) => r.key === 'margin_floor')?.value ?? 0
  const [pid, setPid] = useState(init.pid ?? ''); const p = d.products.find((x) => x.id === pid)
  const regular = init.regular || regularOf(p)
  const [mode, setMode] = useState<'pct' | 'price'>('pct'); const [pct, setPct] = useState(init.price && regular ? String(Math.round((1 - init.price / regular) * 100)) : '15'); const [price, setPrice] = useState(String(init.price ?? ''))
  const [when, setWhen] = useState<'now' | 'at'>(init.start && new Date(init.start).getTime() > Date.now() + 6e4 ? 'at' : init.start ? 'at' : 'now'); const [start, setStart] = useState(init.start ?? new Date(Date.now() + 864e5).toISOString())
  const [dur, setDur] = useState<number | 'custom'>(() => { if (!init.start || !init.end) return 24; const h = hrs(+new Date(init.end) - +new Date(init.start)); return DUR.includes(h) ? h : 'custom' }); const [end, setEnd] = useState(init.end ?? '')
  const stock = p ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) || d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length : 0
  const [cap, setCap] = useState(String(init.cap ?? (Math.min(5, stock) || 3))); const [perUser, setPerUser] = useState(String(init.perUser ?? 1))
  const [places, setPlaces] = useState<string[]>(init.places ?? ['amazing', 'offers']); const [notifyBefore, setNotify] = useState(String(init.notifyBefore ?? 2)); const [note, setNote] = useState(init.note ?? '')
  const final = mode === 'pct' ? Math.round((regular * (100 - (+pct || 0))) / 100 / 1000) * 1000 : +price || 0
  const s = when === 'now' ? new Date().toISOString() : start
  const e = dur === 'custom' ? end : new Date(new Date(s).getTime() + dur * 36e5).toISOString()
  const margin = p?.cost && final ? Math.round(((final - p.cost) / final) * 100) : null
  const subs = (d.entities.notifyRequests ?? []).filter((r: any) => r.productId === pid).length + (pid ? 3 + (pid.charCodeAt(1) % 9) : 0)
  const clash = pid && e ? overlaps({ id: init.id, pid, start: s, end: e }, d.merch.deals) : undefined
  const errs = [!pid && !onDraft && 'کالا را انتخاب کنید.', !regular && 'قیمت عادی کالا مشخص نیست؛ اول در گام «قیمت و سود» قیمت را وارد کنید.', final <= 0 && 'قیمت غنی‌آف را وارد کنید.', final >= regular && regular > 0 && 'قیمت غنی‌آف باید کمتر از قیمت عادی باشد.', !e && 'زمان پایان را مشخص کنید.', e && new Date(e) <= new Date(s) && 'پایان باید بعد از شروع باشد.', !(+cap > 0) && 'سقف تعداد را وارد کنید.', clash && `با غنی‌آف دیگر این کالا (${fmt(clash.start)} تا ${fmt(clash.end)}) هم‌پوشانی دارد.`].filter(Boolean) as string[]
  const save = () => {
    if (errs.length) return toast(errs[0], { tone: 'err' })
    const rec = { price: final, regular, start: s, end: e, cap: +cap, perUser: +perUser || 1, places, notifyBefore: +notifyBefore, note: note.trim() || undefined, sold: init.sold ?? 0 }
    if (onDraft) { onDraft({ ...rec, pid }); toast('غنی‌آف همراه کالا ذخیره می‌شود.'); return onClose() }
    mutate((db) => { const i = db.merch.deals.findIndex((y) => y.id === init.id); if (i >= 0) Object.assign(db.merch.deals[i], rec); else db.merch.deals.unshift({ id: `dl${Date.now().toString(36)}`, pid, ...rec }) }, { action: init.id ? 'ویرایش غنی‌آف' : 'زمان‌بندی غنی‌آف', target: p?.title ?? pid, after: `${toman(final)} · ${fmt(s)} تا ${fmt(e)}` })
    if (new Date(s).getTime() > Date.now() + 6e4 && +notifyBefore > 0) notify('غنی‌آف در صف', `«${p?.title}» ${fmt(s)} شروع می‌شود؛ ${fa(+notifyBefore)} ساعت قبل به ${fa(subs)} نفر پیامک می‌رود.`, '/admin/merch', 'رشد', 'info')
    toast(new Date(s).getTime() > Date.now() + 6e4 ? `در صف قرار گرفت؛ ${fmt(s)} خودکار شروع می‌شود.` : 'غنی‌آف از همین الان فعال شد.'); onClose()
  }
  const pubs = d.products.filter((x) => ['product.published', 'product.incoming', 'product.scheduled'].includes(x.status) || x.id === pid)
  return <Modal open onClose={onClose} wide title={init.id ? 'ویرایش غنی‌آف' : 'زمان‌بندی غنی‌آف'} footer={<><Button variant="primary" onClick={save} disabled={errs.length > 0}>{onDraft ? 'ذخیره همراه کالا' : new Date(s).getTime() > Date.now() + 6e4 ? 'افزودن به صف' : 'شروع الان'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button>{errs.length > 0 && (pid || onDraft) && <span className="text-12 text-danger">{errs[0]}</span>}</>}>
    <div className="space-y-4">
      {!lockPid && <Field label="کالا"><Select value={pid} onChange={setPid} placeholder="جست‌وجوی نام یا مدل…" options={pubs.map((x) => [x.id, x.title] as [string, string])} other={false} /></Field>}
      {p && <div className="flex items-center gap-3 rounded-xl bg-neutral-bg p-3 text-12"><ProductImg pid={p.id} size={40} /><span className="flex-1"><b className="block text-13">{p.title}</b>قیمت عادی {toman(regular)} · موجودی {fa(stock)} · بهای تمام‌شده {p.cost ? toman(p.cost) : 'ثبت نشده'}</span></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="نوع تخفیف"><Segmented value={mode} onChange={setMode} options={[['pct', 'درصد'], ['price', 'قیمت نهایی']]} /></Field>
        {mode === 'pct' ? <Field label="درصد تخفیف"><Input className="ltr text-center" inputMode="numeric" value={pct} onChange={(ev) => setPct(ev.target.value.replace(/\D/g, '').slice(0, 2))} /></Field> : <Field label="قیمت غنی‌آف (تومان)"><Input className="ltr text-left" inputMode="numeric" value={price} onChange={(ev) => setPrice(ev.target.value.replace(/\D/g, ''))} /></Field>}
        <div className="rounded-xl border border-line p-2.5 text-12"><p className="text-t2">قیمت در غنی‌آف</p><p className="text-16 font-bold text-danger">{final ? toman(final) : '—'}</p>{margin !== null && <p className={margin < floor ? 'text-danger' : 'text-success'}>حاشیهٔ سود {fa(margin)}٪{margin < floor ? ` (زیر کف ${fa(floor)}٪)` : ''}</p>}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="شروع"><Segmented value={when} onChange={setWhen} options={[['now', 'همین الان'], ['at', 'زمان مشخص (صف)']]} /></Field>
        {when === 'at' && <Field label="زمان شروع"><Input type="datetime-local" value={localDT(start)} onChange={(ev) => ev.target.value && setStart(new Date(ev.target.value).toISOString())} /></Field>}
      </div>
      <Field label="مدت"><div className="flex flex-wrap gap-1.5">{DUR.map((h) => <button key={h} type="button" aria-pressed={dur === h} aria-label={h >= 48 ? `${fa(h / 24)} روز` : `${fa(h)} ساعت`} onClick={() => setDur(h)} className={cx('h-8 rounded-full border px-3 text-12', dur === h ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{h >= 48 ? `${fa(h / 24)} روز` : `${fa(h)} ساعت`}</button>)}<button type="button" aria-label="تا زمان دلخواه" aria-pressed={dur === 'custom'} onClick={() => { setDur('custom'); setEnd(e || new Date(new Date(s).getTime() + 864e5).toISOString()) }} className={cx('h-8 rounded-full border px-3 text-12', dur === 'custom' ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>تا زمان دلخواه</button></div></Field>
      {dur === 'custom' && <Field label="زمان پایان"><Input type="datetime-local" value={end ? localDT(end) : ''} onChange={(ev) => ev.target.value && setEnd(new Date(ev.target.value).toISOString())} /></Field>}
      {e && <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">{fmt(s)} تا {fmt(e)} ({span(s, e)}). بعد از آن یا وقتی سقف تمام شد، قیمت خودکار به {toman(regular)} برمی‌گردد و کالا از جایگاه غنی‌آف خارج می‌شود.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="سقف تعداد غنی‌آف" help={p && +cap > stock ? `بیشتر از موجودی (${fa(stock)}) است.` : 'بعد از فروش این تعداد، قیمت عادی می‌شود.'}><Input className={cx('ltr text-center', p && +cap > stock && 'border-warning')} inputMode="numeric" value={cap} onChange={(ev) => setCap(ev.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="سقف خرید هر مشتری"><Input className="ltr text-center" inputMode="numeric" value={perUser} onChange={(ev) => setPerUser(ev.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="پیامک «خبرم کن»" help={pid ? `${fa(subs)} نفر منتظر این کالا هستند.` : undefined}><Select value={notifyBefore} onChange={setNotify} options={[['0', 'ارسال نشود'], ['1', '۱ ساعت قبل از شروع'], ['2', '۲ ساعت قبل'], ['6', '۶ ساعت قبل'], ['24', '۱ روز قبل']]} other={false} /></Field>
      </div>
      <Field label="کجا نمایش داده شود"><div className="flex flex-wrap gap-2">{d.merch.placements.filter((pl) => ['amazing', 'offers', 'bestsellers', 'fast', 'stock'].includes(pl.id)).map((pl) => <label key={pl.id} className={cx('flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-12', places.includes(pl.id) ? 'border-brand bg-brand-tint text-brand' : 'border-line')}><input type="checkbox" className="sr-only" checked={places.includes(pl.id)} onChange={() => setPlaces(places.includes(pl.id) ? places.filter((x) => x !== pl.id) : [...places, pl.id])} />{pl.name}</label>)}</div></Field>
      <Field label="برچسب یا مناسبت (اختیاری)"><Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="مثلاً شب یلدا" /></Field>
    </div>
  </Modal>
}

/* ───────────── جایگاه‌ها ───────────── */
function Places() {
  const d = useDB(); const nav = useNavigate(); const [add, setAdd] = useState<string | null>(null); const [pick, setPick] = useState('')
  const upd = (id: string, fn: (x: Placement) => void, action: string) => mutate((db) => fn(db.merch.placements.find((y) => y.id === id)!), { action, target: id })
  const pages = [...new Set(d.merch.placements.map((p) => p.page))]
  return <div className="space-y-4">
    <p className="rounded-xl bg-info-bg px-4 py-3 text-12 text-info">هر جایگاه همان بخشی است که در فیگمای سایت هست. «خودکار» یعنی قانون انتخاب می‌کند، «ترکیبی» یعنی سنجاق‌های شما اول می‌آیند و بقیه با قانون پر می‌شود، «دستی» یعنی فقط همان‌هایی که خودتان می‌گذارید. ظاهر بخش‌ها در «صفحه‌ساز» تغییر می‌کند.</p>
    {pages.map((pg) => <section key={pg} className="space-y-3"><h2 className="text-14 font-bold">{pg}</h2>
      <div className="grid gap-3 xl:grid-cols-2">{d.merch.placements.filter((p) => p.page === pg).map((pl) => { const items = placementItems(d, pl); return (
        <Card key={pl.id} title={<span className="flex flex-wrap items-center gap-2">{pl.name}<Badge dot={false}>{pl.path}</Badge>{!pl.on && <Badge tone="neutral">پنهان</Badge>}</span>} actions={<Toggle on={pl.on} label={`نمایش ${pl.name}`} onChange={(v) => upd(pl.id, (x) => { x.on = v }, v ? 'نمایش جایگاه' : 'پنهان کردن جایگاه')} />}>
          <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
            <Field label="روش انتخاب کالا"><Segmented size="sm" value={pl.mode} onChange={(v) => upd(pl.id, (x) => { x.mode = v }, 'روش انتخاب جایگاه')} options={[['auto', 'خودکار'], ['mixed', 'ترکیبی'], ['manual', 'دستی']]} /></Field>
            <Field label="حداکثر"><Input aria-label={`حداکثر کالای ${pl.name}`} className="ltr text-center" inputMode="numeric" value={String(pl.max)} onChange={(ev) => upd(pl.id, (x) => { x.max = Math.min(48, +ev.target.value.replace(/\D/g, '') || 1) }, 'تعداد کالای جایگاه')} /></Field>
          </div>
          {pl.mode !== 'manual' && <p className="mt-2 text-11 text-t2">قانون خودکار: {pl.rule}</p>}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{items.length === 0 ? <p className="text-12 text-t3">الان کالایی در این جایگاه نیست{pl.mode === 'manual' ? '؛ کالا سنجاق کنید.' : '.'}</p> : items.map(({ p, why }, i) => (
            <div key={p.id} className="group relative w-24 shrink-0 rounded-lg border border-line p-1.5 text-[11px]">
              <ProductImg pid={p.id} size={80} />
              <p className="mt-1 line-clamp-2 leading-4">{p.title}</p>
              {why === 'pin' ? <span className="absolute top-1 right-1 rounded bg-brand-solid px-1 text-[10px] text-white">سنجاق</span> : <span className="absolute top-1 right-1 rounded bg-neutral-bg px-1 text-[10px] text-t2">خودکار</span>}
              <div className="absolute inset-x-1 bottom-1 hidden justify-center gap-0.5 rounded bg-surface/95 p-0.5 shadow group-hover:flex group-focus-within:flex">
                {why === 'pin' ? <>
                  <button aria-label="جلوتر" disabled={i === 0} className="grid size-6 place-items-center rounded hover:bg-neutral-bg disabled:opacity-30" onClick={() => upd(pl.id, (x) => { const k = x.pins.indexOf(p.id); if (k > 0) [x.pins[k - 1], x.pins[k]] = [x.pins[k], x.pins[k - 1]] }, 'ترتیب جایگاه')}><ArrowUp size={12} /></button>
                  <button aria-label="عقب‌تر" className="grid size-6 place-items-center rounded hover:bg-neutral-bg" onClick={() => upd(pl.id, (x) => { const k = x.pins.indexOf(p.id); if (k >= 0 && k < x.pins.length - 1) [x.pins[k + 1], x.pins[k]] = [x.pins[k], x.pins[k + 1]] }, 'ترتیب جایگاه')}><ArrowDown size={12} /></button>
                  <button aria-label={`برداشتن ${p.title}`} className="grid size-6 place-items-center rounded text-danger hover:bg-danger-bg" onClick={() => upd(pl.id, (x) => { x.pins = x.pins.filter((y) => y !== p.id) }, 'برداشتن سنجاق از جایگاه')}><X size={12} /></button></>
                  : <><button aria-label={`سنجاق ${p.title}`} className="grid size-6 place-items-center rounded hover:bg-neutral-bg" onClick={() => upd(pl.id, (x) => { x.pins.push(p.id) }, 'سنجاق کالا در جایگاه')}><Pin size={12} /></button>
                    <button aria-label={`پنهان کردن ${p.title} از این جایگاه`} className="grid size-6 place-items-center rounded text-danger hover:bg-danger-bg" onClick={() => upd(pl.id, (x) => { x.excl.push(p.id) }, 'حذف کالا از جایگاه')}><EyeOff size={12} /></button></>}
              </div>
            </div>))}</div>
          {pl.excl.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-1 text-11 text-t2">پنهان از این جایگاه:{pl.excl.map((id) => <button key={id} onClick={() => upd(pl.id, (x) => { x.excl = x.excl.filter((y) => y !== id) }, 'بازگرداندن کالا به جایگاه')} className="rounded-full border border-line px-2 py-0.5 hover:border-brand">{d.products.find((p) => p.id === id)?.title.slice(0, 22)} ×</button>)}</p>}
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" icon={<Pin size={12} />} onClick={() => { setAdd(pl.id); setPick('') }}>سنجاق کالا</Button>{pl.id === 'amazing' && <Button size="sm" variant="ghost" icon={<Flame size={12} />} onClick={() => nav('/admin/merch?tab=deals')}>غنی‌آف‌ها</Button>}<Button size="sm" variant="ghost" onClick={() => nav('/admin/builder')}>ظاهر در صفحه‌ساز</Button></div>
        </Card>) })}</div></section>)}
    <Modal open={!!add} onClose={() => setAdd(null)} title="سنجاق کالا در جایگاه" footer={<Button variant="primary" disabled={!pick} onClick={() => { upd(add!, (x) => { if (!x.pins.includes(pick)) x.pins.unshift(pick); x.excl = x.excl.filter((y) => y !== pick) }, 'سنجاق کالا در جایگاه'); toast('سنجاق شد و اول این بخش نمایش داده می‌شود.'); setAdd(null) }}>سنجاق</Button>}>
      <Field label="کالا"><Select value={pick} onChange={setPick} placeholder="جست‌وجوی نام یا مدل…" options={d.products.filter((p) => p.status === 'product.published' || p.comingSoon).map((p) => [p.id, p.title] as [string, string])} other={false} /></Field>
    </Modal>
  </div>
}

/* ───────────── هر کالا کجا ───────────── */
const COLS = ['bestsellers', 'fast', 'stock', 'personal', 'new', 'offers', 'soon']
export function placeState(pl: Placement, inAuto: boolean, pid: string): 'pin' | 'excl' | 'auto' | 'none' { return pl.pins.includes(pid) ? 'pin' : pl.excl.includes(pid) ? 'excl' : inAuto ? 'auto' : 'none' }
export function cyclePlace(plId: string, pid: string, st: 'pin' | 'excl' | 'auto' | 'none') {
  mutate((db) => { const x = db.merch.placements.find((y) => y.id === plId)!; x.pins = x.pins.filter((y) => y !== pid); x.excl = x.excl.filter((y) => y !== pid); if (st === 'none' || st === 'auto') x.pins.push(pid); else if (st === 'pin') x.excl.push(pid) }, { action: 'تغییر جایگاه نمایش کالا', target: pid })
}
function ByProduct() {
  const d = useDB(); const [q, setQ] = useState(''); const [deal, setDeal] = useState<string | null>(null)
  const pls = COLS.map((id) => d.merch.placements.find((p) => p.id === id)!).filter(Boolean)
  const autoSets = useMemo(() => Object.fromEntries(pls.map((pl) => [pl.id, new Set(placementItems(d, { ...pl, pins: [], excl: [], max: 999 }).map((r) => r.p.id))])), [d])
  const rows = d.products.filter((p) => (p.status === 'product.published' || p.comingSoon) && (!q || p.title.includes(q) || p.en.toLowerCase().includes(q.toLowerCase())))
  return <Card pad={false} title="هر کالا کجای سایت دیده شود" actions={<div className="relative"><Search size={13} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-t3" /><Input aria-label="جست‌وجوی کالا" className="h-8 w-56 ps-8 text-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی کالا" /></div>}>
    <p className="px-4 pt-3 text-11 text-t2">روی هر خانه بزنید: <b className="text-t1">خودکار</b> (قانون جایگاه) ← <b className="text-brand">سنجاق</b> (حتماً و اول نمایش داده شود) ← <b className="text-danger">پنهان</b> (هرگز نمایش داده نشود) ← برگشت به حالت عادی. همین گزینه‌ها در فرم ساخت کالا هم هست.</p>
    <div className="overflow-x-auto"><table className="gh-table mt-2 w-full text-12"><thead><tr className="bg-surface-2"><th className="p-2 text-right font-medium">کالا</th><th className="p-2 text-right font-medium">غنی‌آف</th>{pls.map((pl) => <th key={pl.id} className="p-2 text-center font-medium">{pl.name.replace(/\s*\(.*\)/, '')}</th>)}</tr></thead><tbody>
      {rows.map((p) => { const dl = d.merch.deals.find((x) => x.pid === p.id && ['live', 'scheduled', 'paused'].includes(dealStatus(x))); return <tr key={p.id} className="border-t border-line">
        <td className="p-2"><span className="flex items-center gap-2"><ProductImg pid={p.id} size={30} /><span className="max-w-56 truncate">{p.title}</span></span></td>
        <td className="p-2">{dl ? <button onClick={() => setDeal(dl.id)} className="text-right"><Badge tone={DEAL_LABEL[dealStatus(dl)][1]}>{DEAL_LABEL[dealStatus(dl)][0]}</Badge><span className="block text-[10px] text-t3">{rel(dealStatus(dl) === 'scheduled' ? dl.start : dl.end)}</span></button> : <Button size="sm" variant="ghost" icon={<Flame size={12} />} onClick={() => setDeal(`new:${p.id}`)}>زمان‌بندی</Button>}</td>
        {pls.map((pl) => { const st = placeState(pl, autoSets[pl.id]?.has(p.id), p.id); return <td key={pl.id} className="p-1 text-center"><button aria-label={`${pl.name} برای ${p.title}: ${st}`} onClick={() => cyclePlace(pl.id, p.id, st)} className={cx('h-7 min-w-16 rounded-full px-2 text-11', st === 'pin' ? 'bg-brand-solid text-white' : st === 'excl' ? 'bg-danger-bg text-danger line-through' : st === 'auto' ? 'bg-success-bg text-success' : 'border border-dashed border-line text-t3')}>{st === 'pin' ? 'سنجاق' : st === 'excl' ? 'پنهان' : st === 'auto' ? 'خودکار' : '—'}</button></td> })}
      </tr> })}</tbody></table></div>
    {deal && <DealForm init={deal.startsWith('new:') ? { pid: deal.slice(4) } : d.merch.deals.find((x) => x.id === deal)!} onClose={() => setDeal(null)} />}
  </Card>
}
