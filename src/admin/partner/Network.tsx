// کنترل شعب و ارسال سریع: تعطیلی فوری، توقف ارسال سریع، توقف یا ویرایش هر شعبه، شهرهای ارسال سریع و ترتیب برداشت موجودی
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Ban, Pause, Play, Plus, Power, Store, Truck, X, Zap } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, notify, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { fastOn, isLive, type Pause as PauseT } from '@/shared/data/partners'
import type { DB } from '@/shared/data/seed'

type Node = { id: string; name: string; city: string; wh: string; status: string; fast: boolean; cities: string; hours: number; cutoff: string; paused?: PauseT | null; partner: boolean }
const nodes = (d: DB): Node[] => [
  { id: 'tehran', name: 'انبار مرکزی تهران', city: 'تهران', wh: 'tehran', status: 'فعال', fast: d.network.hq.fast, cities: d.network.hq.cities, hours: d.network.hq.hours, cutoff: d.network.hq.cutoff, paused: d.network.hq.paused, partner: false },
  ...d.partners.map((p) => ({ id: p.id, name: p.name, city: p.city, wh: p.warehouse, status: p.status, fast: p.fast.on, cities: p.fast.cities, hours: p.fast.hours, cutoff: p.fast.cutoff, paused: d.network.pausedBranches[p.id], partner: true })),
]
const UNTIL: [string, string][] = [['2', '۲ ساعت'], ['eod', 'تا پایان امروز'], ['tomorrow', 'تا فردا صبح ساعت ۹'], ['3d', '۳ روز'], ['manual', 'تا برداشتن دستی']]
const untilOf = (k: string) => { const t = new Date(); if (k === '2') return new Date(Date.now() + 2 * 36e5).toISOString(); if (k === 'eod') { t.setHours(23, 59, 0, 0); return t.toISOString() } if (k === 'tomorrow') { t.setDate(t.getDate() + 1); t.setHours(9, 0, 0, 0); return t.toISOString() } if (k === '3d') return new Date(Date.now() + 3 * 864e5).toISOString(); return new Date(Date.now() + 365 * 864e5).toISOString() }
const untilLabel = (iso: string) => (new Date(iso).getTime() - Date.now() > 300 * 864e5 ? 'تا برداشتن دستی' : `تا ${new Date(iso).toLocaleString('fa-IR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`)

export function Network() {
  const d = useDB(); const nav = useNavigate(); const N = d.network; const me = currentUser()?.name ?? 'مدیر'
  const [ask, setAsk] = useState<null | { kind: 'closed' | 'fastOff' | 'branch'; id?: string; name: string }>(null); const [why, setWhy] = useState(''); const [until, setUntil] = useState('eod'); const [msg, setMsg] = useState('')
  const log = (x: DB, text: string) => { x.network.log.unshift({ at: new Date().toISOString(), by: me, text }) }
  const list = nodes(d); const ordered = [...N.priority.map((id) => list.find((n) => n.id === id)).filter(Boolean) as Node[], ...list.filter((n) => !N.priority.includes(n.id))]
  const fastNow = list.filter((n) => fastOn(N, n.wh, d.partners))
  const apply = () => {
    if (!ask) return; const p: PauseT = { until: untilOf(until), reason: why.trim() || 'بدون توضیح', at: new Date().toISOString(), by: me, msg: msg.trim() || undefined }
    mutate((x) => { if (ask.kind === 'closed') { x.network.closed = p; log(x, `تعطیلی کامل ${untilLabel(p.until)}: ${p.reason}`) } else if (ask.kind === 'fastOff') { x.network.fastOff = p; log(x, `توقف ارسال سریع همهٔ شعب ${untilLabel(p.until)}: ${p.reason}`) } else if (ask.id === 'tehran') { x.network.hq.paused = p; log(x, `توقف انبار تهران ${untilLabel(p.until)}: ${p.reason}`) } else { x.network.pausedBranches[ask.id!] = p; log(x, `توقف ${ask.name} ${untilLabel(p.until)}: ${p.reason}`) } }, { action: ask.kind === 'closed' ? 'تعطیلی فوری کسب‌وکار' : ask.kind === 'fastOff' ? 'توقف سراسری ارسال سریع' : 'توقف شعبه', target: ask.name, after: p.reason })
    notify(ask.kind === 'closed' ? 'تعطیلی فوری اعمال شد' : ask.kind === 'fastOff' ? 'ارسال سریع متوقف شد' : `${ask.name} متوقف شد`, `${p.reason} · ${untilLabel(p.until)}`, '/admin/network', 'عملیات', 'warning')
    toast(ask.kind === 'branch' ? `${ask.name} متوقف شد؛ سفارش‌های تازه به شعبهٔ بعدی در اولویت می‌رود.` : 'همین لحظه در سایت اعمال شد: نشان و گزینهٔ ارسال سریع حذف شد.'); setAsk(null); setWhy(''); setMsg('')
  }
  const resume = (kind: 'closed' | 'fastOff' | 'branch', id?: string, name = '') => mutate((x) => { if (kind === 'closed') x.network.closed = null; else if (kind === 'fastOff') x.network.fastOff = null; else if (id === 'tehran') x.network.hq.paused = null; else delete x.network.pausedBranches[id!]; log(x, `ادامهٔ ${kind === 'closed' ? 'فعالیت کسب‌وکار' : kind === 'fastOff' ? 'ارسال سریع' : name}`) }, { action: 'برداشتن توقف', target: name || kind })
  const setFast = (n: Node, patch: Partial<{ on: boolean; cities: string; hours: number; cutoff: string }>) => mutate((x) => { if (n.id === 'tehran') { if (patch.on !== undefined) x.network.hq.fast = patch.on; if (patch.cities !== undefined) x.network.hq.cities = patch.cities; if (patch.hours !== undefined) x.network.hq.hours = patch.hours; if (patch.cutoff !== undefined) x.network.hq.cutoff = patch.cutoff } else Object.assign(x.partners.find((y) => y.id === n.id)!.fast, patch) }, { action: 'تنظیم ارسال سریع شعبه', target: n.name })
  const move = (id: string, dir: -1 | 1) => mutate((x) => { const a = ordered.map((n) => n.id); const i = a.indexOf(id); const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; x.network.priority = a; log(x, `ترتیب برداشت موجودی: ${a.map((k) => list.find((n) => n.id === k)?.city).join(' ← ')}`) }, { action: 'ترتیب برداشت موجودی', target: id })

  return <Page module="network" title="کنترل شعب و ارسال سریع" sub="هر تغییر همین لحظه روی سایت اعمال می‌شود: نشان «ارسال سریع» روی کارت کالا، گزینهٔ ارسال در سبد و انتخاب انبار برای سفارش‌های تازه." actions={<Button icon={<Plus size={14} />} onClick={() => nav('/admin/sellers?add=1')}>افزودن شعبه</Button>}>
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className={cx(isLive(N.closed) && 'border-danger bg-danger-bg/30')} title={<span className="flex items-center gap-2"><Power size={16} className="text-danger" />تعطیلی فوری کل کسب‌وکار</span>}>
          {isLive(N.closed) ? <div className="space-y-2 text-13"><Badge tone="danger">تعطیل · {untilLabel(N.closed!.until)}</Badge><p>دلیل: {N.closed!.reason} · {N.closed!.by} · {rel(N.closed!.at)}</p>{N.closed!.msg && <p className="rounded-lg bg-surface p-2 text-12">پیام سایت: «{N.closed!.msg}»</p>}<Button variant="primary" icon={<Play size={14} />} onClick={() => resume('closed')}>بازگشایی همین الان</Button></div>
            : <><p className="text-12 leading-6 text-t2">برای روز تعطیل یا اتفاق پیش‌بینی‌نشده: سفارش‌گیری ادامه دارد ولی ارسال سریع و دریافت حضوری از سایت برداشته می‌شود و بالای سایت پیام «سفارش‌ها از … ارسال می‌شود» نمایش داده می‌شود.</p><Button className="mt-3" variant="danger" icon={<Ban size={14} />} onClick={() => { setAsk({ kind: 'closed', name: 'کل کسب‌وکار' }); setUntil('tomorrow'); setMsg('امروز تعطیل هستیم؛ سفارش‌ها از فردا ارسال می‌شود.') }}>تعطیل کن</Button></>}
        </Card>
        <Card className={cx(isLive(N.fastOff) && 'border-warning bg-warning-bg/30')} title={<span className="flex items-center gap-2"><Zap size={16} className="text-warning" />ارسال سریع همهٔ شعب</span>}>
          {isLive(N.fastOff) ? <div className="space-y-2 text-13"><Badge tone="warning">متوقف · {untilLabel(N.fastOff!.until)}</Badge><p>دلیل: {N.fastOff!.reason} · {N.fastOff!.by}</p><Button variant="primary" icon={<Play size={14} />} onClick={() => resume('fastOff')}>ادامهٔ ارسال سریع</Button></div>
            : <><p className="text-12 leading-6 text-t2">الان ارسال سریع در <b>{fa(fastNow.length)}</b> نقطه فعال است: {fastNow.map((n) => n.city).join('، ') || 'هیچ‌جا'}. با توقف، نشان و گزینهٔ ارسال سریع همان لحظه از کل سایت برداشته می‌شود و با پایان زمان خودکار برمی‌گردد.</p><Button className="mt-3" icon={<Pause size={14} />} onClick={() => { setAsk({ kind: 'fastOff', name: 'ارسال سریع' }); setUntil('2') }}>توقف ارسال سریع</Button></>}
        </Card>
      </div>

      <Card title={<span className="flex items-center gap-2"><Store size={16} />شعب و انبارها</span>} pad={false}>
        <ul className="divide-y divide-line">{ordered.map((n, i) => { const paused = isLive(n.paused); const fOn = fastOn(N, n.wh, d.partners); return (
          <li key={n.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[auto_1fr_1.3fr_auto] lg:items-center">
            <div className="flex items-center gap-1"><span className="grid size-7 place-items-center rounded-full bg-brand-tint text-12 font-bold text-brand" title="اولویت برداشت موجودی">{fa(i + 1)}</span><div className="flex flex-col"><button aria-label={`اولویت بالاتر ${n.name}`} disabled={i === 0} onClick={() => move(n.id, -1)} className="text-t3 hover:text-brand disabled:opacity-30"><ArrowUp size={13} /></button><button aria-label={`اولویت پایین‌تر ${n.name}`} disabled={i === ordered.length - 1} onClick={() => move(n.id, 1)} className="text-t3 hover:text-brand disabled:opacity-30"><ArrowDown size={13} /></button></div></div>
            <div><p className="flex flex-wrap items-center gap-2 text-13 font-semibold">{n.name}<Badge tone={paused ? 'danger' : n.status === 'فعال' ? 'success' : 'warning'}>{paused ? `متوقف · ${untilLabel(n.paused!.until)}` : n.status}</Badge></p><p className="mt-0.5 text-11 text-t2">{paused ? `دلیل: ${n.paused!.reason}` : n.partner ? 'شعبهٔ همکار' : 'انبار مرکزی غنیمت'}</p></div>
            <div className="flex flex-wrap items-center gap-2 text-12"><label className="flex items-center gap-1.5"><Toggle on={n.fast} label={`ارسال سریع ${n.name}`} disabled={n.partner && n.status !== 'فعال'} onChange={(v) => setFast(n, { on: v })} /><Truck size={13} />ارسال سریع</label>
              <Input aria-label={`مهلت ارسال سریع ${n.name}`} className="h-8 w-16 text-center text-12" inputMode="numeric" value={String(n.hours)} onChange={(e) => setFast(n, { hours: +e.target.value.replace(/\D/g, '') || 1 })} /><span className="text-11 text-t3">ساعته · تا ساعت</span>
              <Input aria-label={`ساعت پایان سفارش ${n.name}`} className="h-8 w-20 ltr text-center text-12" value={n.cutoff} onChange={(e) => setFast(n, { cutoff: e.target.value })} />
              <Badge tone={fOn ? 'success' : 'neutral'} dot={false}>{fOn ? 'در سایت نمایش داده می‌شود' : 'در سایت نیست'}</Badge>
              <CityChips label={`شهرهای ارسال سریع ${n.name}`} value={n.cities} suggest={NEAR[n.wh] ?? []} onChange={(v) => setFast(n, { cities: v })} /></div>
            <div className="flex gap-1.5">{paused ? <Button size="sm" variant="primary" icon={<Play size={12} />} onClick={() => resume('branch', n.id, n.name)}>ادامه</Button> : <Button size="sm" icon={<Pause size={12} />} disabled={n.status === 'در حال راه‌اندازی'} onClick={() => { setAsk({ kind: 'branch', id: n.id, name: n.name }); setUntil('eod') }}>توقف</Button>}{n.partner && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/sellers?p=${n.id}`)}>جزئیات</Button>}</div>
          </li>) })}</ul>
        <p className="border-t border-line px-4 py-2.5 text-11 text-t2">ترتیب بالا «اولویت برداشت موجودی» است: سفارش تازه از اولین نقطهٔ فعالی که کالا را دارد برداشته می‌شود و اگر موجودی آن تمام شده یا متوقف است، از نقطهٔ بعدی. الان: {ordered.filter((n) => !isLive(n.paused) && n.status === 'فعال').map((n) => n.city).join(' ← ')}.</p>
      </Card>

      <Card title="سابقهٔ تغییرات">{N.log.length === 0 ? <p className="text-12 text-t2">هنوز تغییری ثبت نشده است.</p> : <ul className="space-y-1.5 text-12">{N.log.slice(0, 12).map((l, i) => <li key={i} className="flex justify-between gap-2"><span>{l.text}</span><span className="shrink-0 text-t3">{l.by} · {rel(l.at)}</span></li>)}</ul>}</Card>
    </div>
    <Modal open={!!ask} onClose={() => setAsk(null)} title={ask?.kind === 'closed' ? 'تعطیلی فوری کل کسب‌وکار' : ask?.kind === 'fastOff' ? 'توقف ارسال سریع همهٔ شعب' : `توقف ${ask?.name}`} footer={<><Button variant={ask?.kind === 'closed' ? 'danger' : 'primary'} disabled={!why.trim()} onClick={apply}>اعمال همین الان</Button><Button variant="ghost" onClick={() => setAsk(null)}>انصراف</Button></>}>
      <div className="space-y-3">
        <Field label="دلیل (در سابقه ثبت می‌شود)"><Input autoFocus value={why} onChange={(e) => setWhy(e.target.value)} placeholder={ask?.kind === 'closed' ? 'مثلاً تعطیلی رسمی' : 'مثلاً ترافیک شدید یا کمبود پیک'} /></Field>
        <Field label="تا کی"><Segmented value={until} onChange={setUntil} options={UNTIL} /></Field>
        {ask?.kind === 'closed' && <Field label="پیام بالای سایت"><Input value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>}
        <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">{ask?.kind === 'branch' ? 'سفارش‌های تازه به نقطهٔ بعدی در اولویت می‌رود و ارسال سریع این شعبه از سایت برداشته می‌شود. سفارش‌های در جریان همان‌جا می‌مانند.' : 'نشان «ارسال سریع» روی کارت‌ها و گزینهٔ آن در سبد همین لحظه برداشته می‌شود و با پایان زمان خودکار برمی‌گردد.'}</p>
      </div>
    </Modal>
  </Page>
}

/** شهرهای پیشنهادی نزدیک هر انبار برای افزودن سریع */
export const NEAR: Record<string, string[]> = {
  tehran: ['تهران', 'کرج', 'اسلامشهر', 'شهریار', 'قدس', 'پردیس', 'رباط‌کریم', 'ورامین', 'پاکدشت', 'لواسان', 'دماوند', 'هشتگرد'],
  mahabad: ['مهاباد', 'بوکان', 'میاندوآب', 'نقده', 'سردشت', 'پیرانشهر', 'اشنویه', 'ارومیه', 'سقز', 'شاهین‌دژ'],
}
const splitCities = (v: string) => v.split(/[،,]/).map((c) => c.trim()).filter(Boolean)

/** فهرست شهرهای تحت پوشش به‌صورت برچسب: همه دیده می‌شوند، با × حذف و با تایپ یا پیشنهاد اضافه می‌شوند */
export function CityChips({ label, value, suggest, onChange }: { label: string; value: string; suggest: string[]; onChange: (v: string) => void }) {
  const list = splitCities(value); const [q, setQ] = useState(''); const [open, setOpen] = useState(false)
  const add = (c: string) => { const t = c.trim(); if (!t) return; if (list.includes(t)) { toast(`«${t}» از قبل در فهرست است.`); return } onChange([...list, t].join('، ')); setQ('') }
  const rest = suggest.filter((c) => !list.includes(c) && (!q || c.includes(q.trim())))
  return <div className="w-full rounded-lg border border-line bg-neutral-bg/40 p-2" role="group" aria-label={label}>
    <p className="mb-1.5 flex items-center gap-1.5 text-11 text-t2">شهرهای تحت پوشش ارسال سریع<Badge dot={false}>{fa(list.length)} شهر</Badge></p>
    <div className="flex flex-wrap items-center gap-1.5">
      {list.length === 0 && <span className="text-11 text-warning">هنوز شهری ثبت نشده؛ ارسال سریع برای هیچ شهری نمایش داده نمی‌شود.</span>}
      {list.map((c) => <span key={c} className="inline-flex h-7 items-center gap-1 rounded-full border border-brand/30 bg-brand-tint/50 pr-2.5 pl-1 text-12 text-brand">{c}<button type="button" aria-label={`حذف ${c}`} title={`حذف ${c}`} onClick={() => onChange(list.filter((x) => x !== c).join('، '))} className="grid size-5 place-items-center rounded-full text-brand/70 hover:bg-brand/10 hover:text-danger"><X size={12} /></button></span>)}
      <span className="relative">
        <input aria-label={`افزودن شهر به ${label}`} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === '،' || e.key === ',') { e.preventDefault(); add(q) } if (e.key === 'Backspace' && !q && list.length) onChange(list.slice(0, -1).join('، ')) }}
          placeholder="+ افزودن شهر" className="h-7 w-32 rounded-full border border-dashed border-line bg-surface px-2.5 text-12 outline-none focus:border-brand" />
        {open && rest.length > 0 && <span className="absolute top-8 right-0 z-20 flex max-h-48 w-44 flex-col overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">{rest.map((c) => <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); add(c) }} className="rounded px-2 py-1.5 text-right text-12 hover:bg-neutral-bg">{c}</button>)}</span>}
      </span>
    </div>
  </div>
}
