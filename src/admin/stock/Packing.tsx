import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle2, ExternalLink, CircleAlert, Keyboard, PackageCheck, PackageX, RotateCcw, ScanLine, Undo2, Volume2, VolumeX, XCircle } from 'lucide-react'
import { Badge, Button, Card, cx, Input, Select, StatusBadge, Tabs, Toggle } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { Modal } from '@/shared/ui/overlay'
import { Page } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { Barcode } from '@/shared/ui/codes'
import { currentUser, getDB, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import type { DB, Order, Shipment } from '@/shared/data/seed'
import { scanLookup } from '@/shared/data/stock'
import { codeFor, ownersAt, PartyChip, partyName, pv, syncQty, takeLots, whName } from './common'
import { shipBlocked } from '../orders/PayHold'
import { StartDecision } from '../orders/Decision'

type Scan = NonNullable<Shipment['pack']>['scans'][number]
type Line = { k: string; idx: number; productId: string; variationId?: string; unitId?: string; qty: number; price: number }
const OPEN = ['ship.pending', 'ship.picking']

/** کد خوانده‌شده ← کالا، تنوع، مالک (کد مالک‌دار، بارکد اختصاصی شریک، شناسهٔ واحد سریال‌دار، کد کالا یا EAN) */
export function resolveCode(d: DB, raw: string): { productId: string; variationId?: string; unitId?: string; owner: string } | null {
  const c = raw.trim(); if (!c) return null; const C = c.toUpperCase()
  const u = d.units.find((x) => x.id.toUpperCase() === C || (x as { code?: string }).code?.toUpperCase() === C || x.serial.toUpperCase() === C)
  if (u) return { productId: u.productId, variationId: u.variationId, unitId: u.id, owner: (u as { owner?: string }).owner ?? 'gh' }
  const hit = scanLookup(d.stock, d.products, c); if (hit) return hit
  for (const p of d.products) {
    if (p.code?.toUpperCase() === C || (p.ean && p.ean === c)) return { productId: p.id, variationId: p.variations?.length === 1 ? p.variations[0].id : undefined, owner: p.owner ?? 'gh' }
    const v = p.variations?.find((x) => x.ean === c); if (v) return { productId: p.id, variationId: v.id, owner: p.owner ?? 'gh' }
  }
  return null
}

function beep(ok: boolean) {
  try { const A = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); const o = A.createOscillator(); const g = A.createGain(); o.connect(g); g.connect(A.destination); o.type = ok ? 'sine' : 'square'; o.frequency.value = ok ? 1320 : 220; g.gain.value = 0.08; o.start(); o.stop(A.currentTime + (ok ? 0.09 : 0.35)) } catch { /* بدون صدا */ }
  try { navigator.vibrate?.(ok ? 40 : [80, 60, 80]) } catch { /* */ }
}

/** هستهٔ اسکن یک مرسوله؛ هم در ایستگاه تمام‌صفحه و هم داخل صفحهٔ سفارش (زیر همان مرسوله) به کار می‌رود */
export function PackSession({ shipId, inline, sound = true, onDone, onClose, onOrderCode }: { shipId: string; inline?: boolean; sound?: boolean; onDone?: (next: boolean) => void; onClose?: () => void; onOrderCode?: (code: string) => boolean }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const me = currentUser()
  const [scans, setScans] = useState<Scan[]>([])
  const [code, setCode] = useState(''); const [flash, setFlash] = useState<{ ok: boolean; title: string; why?: string } | null>(null)
  const [cam, setCam] = useState(false); const [short, setShort] = useState<string[] | null>(null); const [tests, setTests] = useState(!inline)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { setScans([]); setFlash(null); setTimeout(() => input.current?.focus(), 30) }, [shipId])
  const cur = useMemo(() => { for (const o of d.orders) { const x = o.shipments.find((y) => y.id === shipId); if (x) return { o, x } } return null }, [d, shipId])
  if (!cur) return null
  const station = cur.x.warehouse
  const lines: Line[] = cur.x.items.map((it, idx) => ({ ...it, idx, k: `${cur.x.id}|${idx}`, unitId: it.unitId || undefined })).filter((it) => !cur.x.items[it.idx].cancelled)
  const okFor = (l: Line) => scans.filter((x) => x.ok && x.productId === l.productId && (x.variationId ?? '') === (l.variationId ?? '') && (!l.unitId || x.unitId === l.unitId)).length
  const done = lines.length > 0 && lines.every((l) => okFor(l) >= l.qty)
  const total = lines.reduce((a, l) => a + l.qty, 0); const got = lines.reduce((a, l) => a + Math.min(l.qty, okFor(l)), 0)
  const focus = () => setTimeout(() => input.current?.focus(), 30)

  const handle = (raw: string) => {
    const c = raw.trim(); setCode(''); if (!c) return
    const isOrder = d.orders.some((o) => o.id.toUpperCase() === c.toUpperCase() || o.shipments.some((x) => x.id.toUpperCase() === c.toUpperCase()))
    if (isOrder) { if (c.toUpperCase() === cur.x.id.toUpperCase() || c.toUpperCase() === cur.o.id.toUpperCase()) { setFlash({ ok: true, title: 'برچسب همین مرسوله است؛ اقلام را اسکن کنید' }); sound && beep(true); return } if (onOrderCode?.(c)) return; setFlash({ ok: false, title: 'این برچسب سفارش دیگری است', why: 'برچسب را روی جعبهٔ درست بچسبانید.' }); sound && beep(false); return }
    const r = resolveCode(d, c); const at = new Date().toISOString()
    const push = (sc: Scan, title: string) => { setScans((L) => [sc, ...L]); setFlash({ ok: sc.ok, title, why: sc.why }); sound && beep(sc.ok); focus() }
    if (!r) return push({ at, code: c, productId: '', owner: '', ok: false, why: 'این کد در سیستم تعریف نشده است.' }, 'کد ناشناخته')
    const name = pv(d, r.productId, r.variationId).full
    const same = lines.filter((l) => l.productId === r.productId)
    if (!same.length) { const brand = d.products.find((p) => p.id === r.productId)?.brand; const want = lines.map((l) => d.products.find((p) => p.id === l.productId)?.brand); return push({ at, code: c, ...r, ok: false, why: `«${name}» در این سفارش نیست.${brand && !want.includes(brand) ? ' برند هم فرق دارد.' : ''}` }, 'کالای اشتباه') }
    const line = same.find((l) => (l.variationId ?? '') === (r.variationId ?? ''))
    if (!line) return push({ at, code: c, ...r, ok: false, why: `این «${pv(d, r.productId, r.variationId).vname || 'تنوع دیگر'}» است؛ سفارش «${same.map((l) => pv(d, l.productId, l.variationId).vname).join('، ')}» می‌خواهد.` }, 'رنگ یا تنوع اشتباه')
    if (line.unitId && r.unitId && r.unitId !== line.unitId) return push({ at, code: c, ...r, ok: false, why: `این واحد ${r.unitId} است؛ برای این سفارش واحد ${line.unitId} (با سریال و گارانتی ثبت‌شده) تخصیص داده شده است.` }, 'سریال دیگر')
    if (okFor(line) >= line.qty) return push({ at, code: c, ...r, ok: false, why: `از این کالا فقط ${fa(line.qty)} عدد سفارش داده شده و همه اسکن شده است.` }, 'بیشتر از تعداد سفارش')
    const has = ownersAt(s, r.productId, r.variationId, station).get(r.owner) ?? 0
    const tracked = s.lots.some((l) => l.productId === r.productId)
    push({ at, code: c, ...r, ok: true, why: tracked && has <= 0 ? `در ${whName(s, station)} موجودی ثبت‌شده‌ای به نام ${partyName(s, r.owner)} نیست؛ پس از ارسال موجودی را بررسی کنید.` : undefined }, `درست: ${name}`)
  }

  const undo = () => { setScans((L) => L.slice(1)); setFlash(null); focus() }
  const finish = (next: boolean) => {
    if (!done) return; if (shipBlocked(cur.o.id)) return
    const ok = scans.filter((x) => x.ok); const by = me?.name ?? 'انباردار'; const chan = 'gh-site'
    mutate((x) => {
      const o = x.orders.find((y) => y.id === cur.o.id); const sh = o?.shipments.find((y) => y.id === cur.x.id); if (!o || !sh) return
      sh.status = 'ship.packed'; sh.pack = { at: new Date().toISOString(), by, station, scans: [...scans].reverse() }
      // هر قلم: از موجودی همان مالک در همین انبار کم می‌شود و یک ردیف فروش برای تسویه ساخته می‌شود
      const groups = new Map<string, Scan[]>(); ok.forEach((sc) => { const k = `${sc.productId}|${sc.variationId ?? ''}|${sc.owner}`; groups.set(k, [...(groups.get(k) ?? []), sc]) })
      groups.forEach((L) => { const f = L[0]; if (!x.stock.lots.some((l) => l.productId === f.productId)) return
        const t = takeLots(x, { productId: f.productId, variationId: f.variationId, owner: f.owner, warehouse: station }, L.length)
        const price = sh.items.find((i) => i.productId === f.productId && (i.variationId ?? '') === (f.variationId ?? ''))?.price ?? 0
        x.stock.sales.unshift({ id: `S-${Date.now().toString(36).slice(-4).toUpperCase()}${f.owner}`, at: new Date().toISOString(), productId: f.productId, variationId: f.variationId, owner: f.owner, warehouse: station, channel: chan, qty: L.length, price, cost: t.cost, orderId: o.id, code: f.code, by })
        syncQty(x, f.productId) })
    }, { action: 'تأیید بسته‌بندی با اسکن', target: `${cur.x.id} · ${fa(ok.length)} قلم` })
    toast(`مرسولهٔ ${cur.x.id} بسته‌بندی شد؛ موجودی و سهم شرکا به‌روز شد.${inline ? ' مرحلهٔ بعد: تحویل به پیک یا پست.' : ''}`)
    onDone?.(next)
  }

  const testCodes = lines.flatMap((l) => { const m = [...ownersAt(s, l.productId, l.variationId, station)].filter(([, n]) => n > 0).map(([o]) => o); const owners = m.length ? m : [d.products.find((p) => p.id === l.productId)?.owner ?? 'gh']; return l.unitId ? [{ c: l.unitId, t: 'برچسب واحد' }] : owners.map((o) => ({ c: codeFor(d, o, l.productId, l.variationId), t: `${pv(d, l.productId, l.variationId).vname || 'کالا'} · ${partyName(s, o)}` })) })
  const wrong = (() => { const L = lines[0]; const p = d.products.find((x) => x.id === L?.productId); const other = p?.variations?.find((v) => v.id !== L?.variationId); const otherP = d.products.find((x) => x.id !== L?.productId && x.mode !== 'serial' && x.code); return [other ? { c: codeFor(d, 'gh', p!.id, other.id), t: 'رنگ اشتباه' } : null, otherP ? { c: otherP.code!, t: 'کالای دیگر' } : null, { c: 'XX-0000', t: 'کد ناشناخته' }].filter(Boolean) as { c: string; t: string }[] })()

  const scanBox = <>
    <form onSubmit={(e) => { e.preventDefault(); handle(code) }} className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1"><ScanLine size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" /><Input {...({ ref: input } as object)} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="بارکد کالا را اسکن کنید…" className={cx('ltr pr-10 text-left font-mono', inline ? 'h-12 text-16' : 'h-14 text-18')} aria-label="ورودی بارکدخوان" /></div>
      <Button type="submit" size={inline ? 'md' : 'lg'} icon={<Keyboard size={16} />}>ثبت دستی</Button>
      <Button type="button" size={inline ? 'md' : 'lg'} variant="ghost" icon={<Camera size={16} />} onClick={() => setCam(!cam)}>دوربین</Button>
    </form>
    {!inline && <p className="mt-2 text-11 text-t2">بارکدخوان USB یا بلوتوث مثل کیبورد کار می‌کند: کد را می‌نویسد و Enter می‌زند؛ نیازی به نصب برنامه نیست. روی تبلت و گوشی بدون بارکدخوان، دکمهٔ «دوربین» را بزنید.</p>}
    {cam && <CameraScan onCode={(c) => handle(c)} onClose={() => setCam(false)} />}
    {flash && <div role="status" className={cx('mt-3 flex items-start gap-3 rounded-2xl text-white transition-colors', inline ? 'p-3' : 'p-4', flash.ok ? 'bg-[#12733f]' : 'bg-[#c42f2f]')}>{flash.ok ? <CheckCircle2 size={inline ? 24 : 30} className="shrink-0" /> : <XCircle size={inline ? 24 : 30} className="shrink-0" />}<div className="flex-1"><p className={cx('font-bold', inline ? 'text-14' : 'text-16')}>{flash.title}</p>{flash.why && <p className="mt-0.5 text-13 opacity-90">{flash.why}</p>}{!flash.ok && <p className="mt-1 text-12 opacity-80">این قلم را در جعبه نگذارید.</p>}</div>{scans.length > 0 && <button type="button" onClick={undo} className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-12"><Undo2 size={13} />برگرداندن اسکن آخر</button>}</div>}
  </>
  const lineList = <>
    <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full transition-all', done ? 'bg-success' : 'bg-brand')} style={{ width: `${total ? (got / total) * 100 : 0}%` }} /></div>
    <ul className="space-y-2">{lines.map((l) => { const n = okFor(l); const full = n >= l.qty; const { name, vname } = pv(d, l.productId, l.variationId); const owners = scans.filter((x) => x.ok && x.productId === l.productId && (x.variationId ?? '') === (l.variationId ?? '')).map((x) => x.owner); return (
      <li key={l.k} className={cx('flex flex-wrap items-center gap-3 rounded-xl border-2', inline ? 'p-2.5' : 'p-3', full ? 'border-success bg-success-bg' : n ? 'border-brand/40' : 'border-line')}>
        {full ? <CheckCircle2 size={22} className="text-success" /> : <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-line text-11 font-bold">{fa(l.qty - n)}</span>}
        <div className="min-w-0 flex-1"><p className="font-medium">{name}</p><p className="text-12 text-t2">{vname && <>{vname} · </>}تعداد {fa(l.qty)}{l.unitId && <> · واحد <bdi dir="ltr" className="font-mono">{l.unitId}</bdi></>}</p>{owners.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{[...new Set(owners)].map((o) => <PartyChip key={o} s={s} id={o} n={owners.filter((x) => x === o).length} />)}</div>}</div>
        <span className="font-mono text-15 font-bold">{fa(n)}/{fa(l.qty)}</span>
        {!full && <Button size="sm" variant="ghost" icon={<PackageX size={13} />} onClick={() => setShort([l.k])}>اینجا نیست</Button>}
      </li>) })}</ul>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button variant="primary" size={inline ? 'md' : 'lg'} icon={<PackageCheck size={16} />} disabled={!done} onClick={() => finish(true)}>{inline ? 'تأیید بسته‌بندی و رفتن به مرحلهٔ بعد' : 'تأیید بسته‌بندی و رفتن به بعدی'}</Button>
      {!inline && <Button disabled={!done} icon={<ExternalLink size={14} />} onClick={() => { finish(false); nav(`/admin/orders/${cur.o.id}`) }}>تأیید و رفتن به صفحهٔ سفارش</Button>}
      {!inline && <Button variant="ghost" icon={<ExternalLink size={14} />} onClick={() => nav(`/admin/orders/${cur.o.id}`)}>صفحهٔ سفارش {cur.o.id}</Button>}
      <Button variant="ghost" icon={<RotateCcw size={14} />} disabled={!scans.length} onClick={() => { setScans([]); setFlash(null); focus() }}>شروع دوباره</Button>
      {!done && <span className="text-12 text-t2">تا همهٔ اقلام سبز نشوند، تأیید فعال نمی‌شود.</span>}
    </div>
  </>
  const testBox = <div>
    <p className="mb-1 text-11 font-semibold text-success">کدهای درست این سفارش</p>
    <div className="mb-3 grid gap-2 sm:grid-cols-2">{testCodes.map((t) => <button key={t.c + t.t} type="button" onClick={() => handle(t.c)} className="rounded-xl border border-line bg-surface p-2 text-right hover:border-success"><Barcode value={t.c} height={30} module={1.4} className="h-12 w-full" /><span className="text-11 text-t2">{t.t}</span></button>)}</div>
    <p className="mb-1 text-11 font-semibold text-danger">کدهای اشتباه برای آزمایش</p>
    <div className="flex flex-wrap gap-1.5">{wrong.map((t) => <button key={t.c} type="button" onClick={() => handle(t.c)} className="rounded-lg border border-line bg-surface px-2 py-1 text-11 hover:border-danger">{t.t} · <bdi dir="ltr" className="font-mono">{t.c}</bdi></button>)}</div>
  </div>
  const scanLog = scans.length ? <ul className="max-h-72 divide-y divide-line overflow-y-auto">{scans.map((x, i) => <li key={i} className="flex items-start gap-2 px-4 py-2 text-12">{x.ok ? <CheckCircle2 size={15} className="mt-0.5 text-success" /> : <CircleAlert size={15} className="mt-0.5 text-danger" />}<div className="flex-1"><bdi dir="ltr" className="font-mono">{x.code}</bdi>{x.productId && <span className="text-t2"> · {pv(d, x.productId, x.variationId).full}</span>}{x.why && <p className={x.ok ? 'text-warning' : 'text-danger'}>{x.why}</p>}</div>{x.owner && <PartyChip s={s} id={x.owner} />}</li>)}</ul> : <p className="p-4 text-12 text-t2">هنوز اسکنی ثبت نشده است.</p>
  const decision = short && <StartDecision o={cur.o as Order} open onClose={() => { setShort(null); focus() }} preset={{ kind: 'out_of_stock', items: short, source: 'انبار', note: `هنگام بسته‌بندی در ${whName(s, station)} پیدا نشد.` }} onDone={() => { setShort(null); toast('کمبود ثبت شد و به صف تصمیم سفارش رفت.') }} />

  if (inline) return (
    <div id={`pack-${cur.x.id}`} className="anim-pop mb-3 rounded-2xl border-2 border-brand/40 bg-brand-tint/20 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2"><ScanLine size={16} className="text-brand" /><b className="text-13">بسته‌بندی با اسکن</b><Badge tone={done ? 'success' : 'info'}>{fa(got)} از {fa(total)}</Badge><span className="text-11 text-t2">ایستگاه {whName(s, station)}</span><span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => nav(`/admin/packing?ship=${cur.x.id}`)}>ایستگاه تمام‌صفحه</Button><Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={onClose}>بستن</Button></div>
      {scanBox}
      <div className="mt-3">{lineList}</div>
      {scans.some((x) => !x.ok) && <details className="mt-3 rounded-xl border border-line bg-surface"><summary className="cursor-pointer px-3 py-2 text-12 font-medium">اسکن‌ها ({fa(scans.length)}، {fa(scans.filter((x) => !x.ok).length)} اشتباه)</summary>{scanLog}</details>}
      <div className="mt-3"><button type="button" className="text-12 text-brand underline" onClick={() => setTests(!tests)}>{tests ? 'پنهان کردن کدهای آزمایشی' : 'بدون بارکدخوان؟ کدهای آزمایشی'}</button>{tests && <div className="mt-2">{testBox}</div>}</div>
      {decision}
    </div>
  )
  return (
    <div className="space-y-4">
      <Card>{scanBox}</Card>
      <Card title={<span className="flex items-center gap-2">مرسولهٔ <bdi dir="ltr" className="font-mono">{cur.x.id}</bdi><Badge tone={done ? 'success' : 'info'}>{fa(got)} از {fa(total)}</Badge></span>} actions={<Button size="sm" variant="ghost" onClick={() => nav(`/admin/orders/${cur.o.id}`)}>صفحهٔ سفارش</Button>}>{lineList}</Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="اسکن‌های این مرسوله" pad={false}>{scanLog}</Card>
        <Card title="آزمایش بدون بارکدخوان" hint="در این نسخهٔ نمایشی روی هر کد بزنید تا مثل اسکن عمل کند.">{testBox}</Card>
      </div>
      {decision}
    </div>
  )
}

/** ایستگاه بسته‌بندی تمام‌صفحه: صف انبار + اسکن پشت سر هم سفارش‌ها */
export function Packing() {
  const d = useDB(); const s = d.stock; const [sp, setSp] = useSearchParams()
  const [station, setStation] = useState(() => getDB().orders.flatMap((o) => o.shipments).find((x) => x.id === sp.get('ship'))?.warehouse ?? localStorage.getItem('gh-pack-station') ?? 'tehran')
  const [sid, setSid] = useState(sp.get('ship') ?? '')
  const [sound, setSound] = useState(true); const [code, setCode] = useState(''); const [flash, setFlash] = useState('')
  const [tab, setTab] = useState(sp.get('tab') === 'history' ? 'history' : 'queue'); const [fq, setFq] = useState(''); const [fm, setFm] = useState('all'); const [fs, setFs] = useState('all'); const [late, setLate] = useState(false)
  useEffect(() => { localStorage.setItem('gh-pack-station', station) }, [station])
  const all = d.orders.flatMap((o) => o.shipments.filter((x) => OPEN.includes(x.status) && x.warehouse === station).map((x) => ({ o, x }))).sort((a, b) => +new Date(a.x.sla) - +new Date(b.x.sla))
  const methodOf = (m: string) => (/حضوری/.test(m) ? 'pickup' : /پیک|سریع|اسنپ|تیپاکس/.test(m) ? 'courier' : 'post')
  const queue = all.filter(({ o, x }) => (fm === 'all' || methodOf(x.method) === fm) && (fs === 'all' || x.status === fs) && (!late || +new Date(x.sla) - Date.now() < 2 * 36e5) && (!fq.trim() || `${o.id} ${x.id} ${x.items.map((i) => d.products.find((p) => p.id === i.productId)?.title ?? '').join(' ')}`.toLowerCase().includes(fq.trim().toLowerCase())))
  const open = (id: string) => { setSid(id); setFlash(''); setSp((p) => { if (id) p.set('ship', id); else p.delete('ship'); return p }, { replace: true }) }
  const byLabel = (c: string) => {
    const ord = d.orders.find((o) => o.id.toUpperCase() === c.toUpperCase() || o.shipments.some((x) => x.id.toUpperCase() === c.toUpperCase())); if (!ord) { setFlash('این برچسب سفارش شناخته نشد.'); sound && beep(false); return false }
    const x = ord.shipments.find((y) => y.id.toUpperCase() === c.toUpperCase()) ?? ord.shipments.find((y) => OPEN.includes(y.status)); if (!x) return false
    if (!OPEN.includes(x.status)) { setFlash(`مرسولهٔ ${x.id} در وضعیت بسته‌بندی نیست.`); sound && beep(false); return true }
    if (x.warehouse !== station) { setFlash(`این مرسوله از ${whName(s, x.warehouse)} ارسال می‌شود؛ ایستگاه را عوض کنید.`); sound && beep(false); return true }
    open(x.id); sound && beep(true); return true
  }
  const cur = sid && d.orders.some((o) => o.shipments.some((x) => x.id === sid && OPEN.includes(x.status))) ? sid : ''
  return (
    <Page module="packing" title="ایستگاه بسته‌بندی و اسکن" sub="بارکدخوان را وصل کنید؛ هر قلم را قبل از گذاشتن در جعبه اسکن کنید"
      tabs={<Tabs value={tab} onChange={(v) => { setTab(v); setSp((p) => { p.set('tab', v); return p }, { replace: true }) }} tabs={[{ id: 'queue', label: 'صف بسته‌بندی', count: all.length || undefined }, { id: 'history', label: 'تاریخچهٔ بسته‌بندی' }]} />}
      actions={<><Select className="w-48" value={station} onChange={(v) => { setStation(v); open('') }} options={s.warehouses.filter((w) => w.active).map((w) => [w.id, `ایستگاه ${w.name}`] as [string, string])} /><Button variant="ghost" icon={sound ? <Volume2 size={14} /> : <VolumeX size={14} />} onClick={() => setSound(!sound)}>{sound ? 'صدا روشن' : 'بی‌صدا'}</Button></>}>
      {tab === 'history' ? <PackHistory station={station} /> : <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card pad={false} title={`صف ${whName(s, station)}`} hint="به ترتیب نزدیک‌ترین مهلت ارسال">
          <div className="space-y-2 border-b border-line p-3"><Input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="شمارهٔ سفارش یا نام کالا" aria-label="جست‌وجو در صف" className="h-9" />
            <div className="flex flex-wrap gap-1">{([['all', 'همه'], ['courier', 'پیک'], ['post', 'پست'], ['pickup', 'حضوری']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFm(k)} className={cx('h-7 rounded-full border px-2.5 text-11', fm === k ? 'border-brand bg-brand text-white' : 'border-line')}>{l}</button>)}</div>
            <div className="flex flex-wrap items-center gap-1">{([['all', 'همهٔ وضعیت‌ها'], ['ship.pending', 'در انتظار'], ['ship.picking', 'در حال جمع‌آوری']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFs(k)} className={cx('h-7 rounded-full border px-2.5 text-11', fs === k ? 'border-brand bg-brand text-white' : 'border-line')}>{l}</button>)}<button type="button" onClick={() => setLate(!late)} className={cx('h-7 rounded-full border px-2.5 text-11', late ? 'border-danger bg-danger text-white' : 'border-line')}>مهلت زیر ۲ ساعت</button></div>
            <p className="text-11 text-t2">{fa(queue.length)} از {fa(all.length)} مرسوله</p></div>
          {queue.length ? <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">{queue.map(({ o, x }) => <li key={x.id}><button className={cx('flex w-full flex-col gap-0.5 px-4 py-3 text-right hover:bg-neutral-bg', sid === x.id && 'bg-brand/5')} onClick={() => open(x.id)}>
            <span className="flex items-center justify-between"><b className="font-mono text-13">{x.id}</b><Badge>{fa(x.items.filter((i) => !i.cancelled).reduce((a, i) => a + i.qty, 0))} قلم</Badge></span>
            <span className="text-12 text-t2">{x.method} · مهلت {rel(x.sla)}</span>
            {shipBlocked(o.id, true) && <span className="text-11 text-danger">منتظر پرداخت مابه‌التفاوت</span>}
          </button></li>)}</ul> : <p className="p-4 text-12 text-t2">سفارشی برای بسته‌بندی در این انبار نیست.</p>}
        </Card>
        {cur ? <PackSession key={cur} shipId={cur} sound={sound} onOrderCode={byLabel} onDone={() => { const next = queue.find((q) => q.x.id !== cur); open(next?.x.id ?? '') }} />
          : <Card><form onSubmit={(e) => { e.preventDefault(); byLabel(code.trim()); setCode('') }} className="mx-auto max-w-lg py-8 text-center"><ScanLine size={40} className="mx-auto text-t3" /><p className="mt-3 font-semibold">برچسب سفارش را اسکن کنید</p><p className="mb-3 text-12 text-t2">یا یک مرسوله را از صف کنار صفحه انتخاب کنید.</p><Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثلاً GH-10511" className="ltr h-12 text-center font-mono text-16" aria-label="برچسب سفارش" />{flash && <p className="mt-2 text-12 text-danger">{flash}</p>}</form></Card>}
      </div>}
    </Page>
  )
}

/** تاریخچهٔ بسته‌بندی: چه کسی، کی، کدام ایستگاه، چه کدی، از کدام مالک و چند اسکن اشتباه جلوگیری شد */
function PackHistory({ station }: { station: string }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [only, setOnly] = useState(true); const [view, setView] = useState<{ o: Order; x: Shipment } | null>(null); const [bad, setBad] = useState(false)
  const rows = d.orders.flatMap((o) => o.shipments.filter((x) => x.pack && (!only || x.pack.station === station) && (!bad || x.pack.scans.some((q) => !q.ok))).map((x) => ({ o, x }))).sort((a, b) => +new Date(b.x.pack!.at) - +new Date(a.x.pack!.at))
  const owners = (x: Shipment) => [...new Set(x.pack!.scans.filter((q) => q.ok).map((q) => q.owner))]
  return <Card pad={false} title="تاریخچهٔ بسته‌بندی با اسکن" actions={<div className="flex flex-wrap gap-2"><Toggle on={only} onChange={setOnly} text={`فقط ${whName(s, station)}`} /><Toggle on={bad} onChange={setBad} text="فقط با اسکن اشتباه" /></div>}>
    <DataTable name="تاریخچهٔ بسته‌بندی" empty={{ title: 'هنوز بسته‌بندی با اسکن ثبت نشده است' }} rows={rows} rowKey={(r) => r.x.id} onRow={setView} search={(r) => `${r.o.id} ${r.x.id} ${r.x.pack!.by} ${r.x.pack!.scans.map((q) => q.code).join(' ')}`}
      cols={[{ key: 'id', title: 'مرسوله', render: (r) => <span className="font-mono text-12">{r.x.id}</span> },
        { key: 'at', title: 'زمان', render: (r) => <span className="text-12">{new Date(r.x.pack!.at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })}</span>, sort: (r) => +new Date(r.x.pack!.at) },
        { key: 'by', title: 'بسته‌بند', render: (r) => r.x.pack!.by, text: (r) => r.x.pack!.by },
        { key: 'st', title: 'ایستگاه', render: (r) => whName(s, r.x.pack!.station) },
        { key: 'n', title: 'اقلام', render: (r) => fa(r.x.pack!.scans.filter((q) => q.ok).length), sort: (r) => r.x.pack!.scans.filter((q) => q.ok).length },
        { key: 'bad', title: 'اسکن اشتباه', render: (r) => { const n = r.x.pack!.scans.filter((q) => !q.ok).length; return n ? <Badge tone="danger">{fa(n)} جلوگیری شد</Badge> : <Badge tone="success">بدون خطا</Badge> }, sort: (r) => r.x.pack!.scans.filter((q) => !q.ok).length },
        { key: 'own', title: 'مالک کالاها', render: (r) => <span className="flex flex-wrap gap-1">{owners(r.x).map((o) => <PartyChip key={o} s={s} id={o} />)}</span> },
        { key: 'now', title: 'وضعیت فعلی', render: (r) => <StatusBadge s={r.x.status} /> }]} />
    <Modal open={!!view} onClose={() => setView(null)} wide title={view ? `بسته‌بندی ${view.x.id}` : ''} footer={view && <Button variant="primary" icon={<ExternalLink size={14} />} onClick={() => nav(`/admin/orders/${view.o.id}`)}>رفتن به صفحهٔ سفارش</Button>}>
      {view?.x.pack && <div className="space-y-3 text-13">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['بسته‌بند', view.x.pack.by], ['ایستگاه', whName(s, view.x.pack.station)], ['زمان', new Date(view.x.pack.at).toLocaleString('fa-IR')], ['روش ارسال', view.x.method]].map(([k, v]) => <div key={k} className="rounded-lg bg-neutral-bg px-2.5 py-1.5"><dt className="text-11 text-t2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
        <ol className="divide-y divide-line rounded-xl border border-line">{view.x.pack.scans.map((q, i) => <li key={i} className="flex items-start gap-2 px-3 py-2 text-12"><span className="w-5 text-t3">{fa(i + 1)}</span>{q.ok ? <CheckCircle2 size={15} className="mt-0.5 text-success" /> : <CircleAlert size={15} className="mt-0.5 text-danger" />}<div className="flex-1"><bdi dir="ltr" className="font-mono">{q.code}</bdi>{q.productId && <span className="text-t2"> · {pv(d, q.productId, q.variationId).full}</span>}{q.why && <p className={q.ok ? 'text-warning' : 'text-danger'}>{q.why}</p>}</div>{q.owner && <PartyChip s={s} id={q.owner} />}<span className="text-11 text-t3">{new Date(q.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></li>)}</ol>
      </div>}
    </Modal>
  </Card>
}

/** اسکن با دوربین گوشی یا تبلت (BarcodeDetector مرورگر) */
function CameraScan({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null); const [err, setErr] = useState('')
  useEffect(() => {
    let stream: MediaStream | null = null; let t = 0; let last = ''; let stop = false
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BD) { setErr('مرورگر این دستگاه خواندن بارکد با دوربین را پشتیبانی نمی‌کند؛ Chrome اندروید یا بارکدخوان USB را به کار ببرید.'); return }
    const det = new BD({ formats: ['code_128', 'ean_13', 'qr_code'] })
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => { stream = s; if (v.current) { v.current.srcObject = s; v.current.play() }
      const tick = async () => { if (stop || !v.current) return; try { const r = await det.detect(v.current); const c = r[0]?.rawValue; if (c && c !== last) { last = c; onCode(c); setTimeout(() => { last = '' }, 1500) } } catch { /* */ } t = window.setTimeout(tick, 250) }; tick() })
      .catch(() => setErr('اجازهٔ دوربین داده نشد.'))
    return () => { stop = true; clearTimeout(t); stream?.getTracks().forEach((x) => x.stop()) }
  }, [onCode])
  return <div className="mt-3 rounded-xl border border-line p-2">{err ? <p className="p-2 text-12 text-danger">{err}</p> : <video ref={v} className="mx-auto max-h-64 rounded-lg" muted playsInline />}<div className="mt-2 text-left"><Button size="sm" variant="ghost" onClick={onClose}>بستن دوربین</Button></div></div>
}

/** خلاصهٔ اسکن بسته‌بندی در صفحهٔ سفارش: هر قلم از کدام مالک و کدام انبار رفت */
export function PackRecord({ s: sh }: { s: Shipment }) {
  const d = getDB(); const st = d.stock
  if (!sh.pack) return null
  const ok = sh.pack.scans.filter((x) => x.ok)
  return <div className="mb-3 rounded-lg border border-success/40 bg-success-bg px-3 py-2 text-12"><p className="mb-1 flex flex-wrap items-center gap-1.5 font-semibold text-success"><PackageCheck size={14} />بسته‌بندی با اسکن · {sh.pack.by} · {whName(st, sh.pack.station)} · {rel(sh.pack.at)}{sh.pack.scans.length > ok.length && <span className="font-normal text-danger">({fa(sh.pack.scans.length - ok.length)} اسکن اشتباه جلوگیری شد)</span>}</p>
    <ul className="space-y-0.5">{ok.map((x, i) => <li key={i} className="flex flex-wrap items-center gap-1.5"><bdi dir="ltr" className="font-mono">{x.code}</bdi><span>{pv(d, x.productId, x.variationId).full}</span><PartyChip s={st} id={x.owner} /></li>)}</ul></div>
}

export const isOpenForPack = (x: Shipment) => OPEN.includes(x.status)
