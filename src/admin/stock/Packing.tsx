import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle2, CircleAlert, Keyboard, PackageCheck, PackageX, RotateCcw, ScanLine, Undo2, Volume2, VolumeX, XCircle } from 'lucide-react'
import { Badge, Button, Card, cx, Input, Select } from '@/shared/ui/base'
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

/** ایستگاه بسته‌بندی با بارکدخوان: هر قلم اسکن می‌شود؛ سبز یعنی درست، قرمز یعنی اشتباه */
export function Packing() {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [sp, setSp] = useSearchParams()
  const me = currentUser()
  const [station, setStation] = useState(() => getDB().orders.flatMap((o) => o.shipments).find((x) => x.id === sp.get('ship'))?.warehouse ?? localStorage.getItem('gh-pack-station') ?? 'tehran')
  const [sid, setSid] = useState(sp.get('ship') ?? '')
  const [scans, setScans] = useState<Scan[]>([])
  const [code, setCode] = useState(''); const [flash, setFlash] = useState<{ ok: boolean; title: string; why?: string } | null>(null)
  const [sound, setSound] = useState(true); const [cam, setCam] = useState(false); const [short, setShort] = useState<string[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { localStorage.setItem('gh-pack-station', station) }, [station])

  const queue = d.orders.flatMap((o) => o.shipments.filter((x) => OPEN.includes(x.status) && x.warehouse === station).map((x) => ({ o, x }))).sort((a, b) => +new Date(a.x.sla) - +new Date(b.x.sla))
  const cur = useMemo(() => { for (const o of d.orders) { const x = o.shipments.find((y) => y.id === sid); if (x) return { o, x } } return null }, [d, sid])
  const lines: Line[] = cur ? cur.x.items.map((it, idx) => ({ ...it, idx, k: `${cur.x.id}|${idx}`, unitId: it.unitId || undefined })).filter((it) => !cur.x.items[it.idx].cancelled) : []
  const okFor = (l: Line) => scans.filter((x) => x.ok && x.productId === l.productId && (x.variationId ?? '') === (l.variationId ?? '') && (!l.unitId || x.unitId === l.unitId)).length
  const done = lines.length > 0 && lines.every((l) => okFor(l) >= l.qty)
  const total = lines.reduce((a, l) => a + l.qty, 0); const got = lines.reduce((a, l) => a + Math.min(l.qty, okFor(l)), 0)

  const focus = () => setTimeout(() => input.current?.focus(), 30)
  const open = (id: string) => { setSid(id); setScans([]); setFlash(null); setSp((p) => { p.set('ship', id); return p }, { replace: true }); focus() }

  const handle = (raw: string) => {
    const c = raw.trim(); setCode(''); if (!c) return
    // اسکن برچسب سفارش یا مرسوله، سفارش را باز می‌کند
    const ord = d.orders.find((o) => o.id.toUpperCase() === c.toUpperCase() || o.shipments.some((x) => x.id.toUpperCase() === c.toUpperCase()))
    if (ord) { const x = ord.shipments.find((y) => y.id.toUpperCase() === c.toUpperCase()) ?? ord.shipments.find((y) => OPEN.includes(y.status)); if (x) { if (!OPEN.includes(x.status)) { setFlash({ ok: false, title: `مرسولهٔ ${x.id} در وضعیت بسته‌بندی نیست` }); sound && beep(false); return } if (x.warehouse !== station) { setFlash({ ok: false, title: `این مرسوله از ${whName(s, x.warehouse)} ارسال می‌شود`, why: 'ایستگاه را عوض کنید یا مرسوله را به انبار درست بفرستید.' }); sound && beep(false); return } open(x.id); sound && beep(true); return } }
    if (!cur) { setFlash({ ok: false, title: 'اول سفارش را انتخاب یا برچسب سفارش را اسکن کنید' }); sound && beep(false); return }
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
  const finish = () => {
    if (!cur || !done) return; if (shipBlocked(cur.o.id)) return
    const ok = scans.filter((x) => x.ok); const by = me?.name ?? 'انباردار'; const chan = /سایت|ترب|دیجی|اسنپ|اینستا|تلگرام/.test(cur.o.channel ?? 'سایت') ? 'gh-site' : 'gh-site'
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
    toast(`مرسولهٔ ${cur.x.id} بسته‌بندی شد؛ موجودی و سهم شرکا به‌روز شد.`)
    const next = queue.find((q) => q.x.id !== cur.x.id); if (next) open(next.x.id); else { setSid(''); setScans([]) }
  }

  const testCodes = cur ? lines.flatMap((l) => { const m = [...ownersAt(s, l.productId, l.variationId, station)].filter(([, n]) => n > 0).map(([o]) => o); const owners = m.length ? m : [d.products.find((p) => p.id === l.productId)?.owner ?? 'gh']; return l.unitId ? [{ c: l.unitId, t: 'برچسب واحد' }] : owners.map((o) => ({ c: codeFor(d, o, l.productId, l.variationId), t: `${pv(d, l.productId, l.variationId).vname || 'کالا'} · ${partyName(s, o)}` })) }) : []
  const wrong = cur ? (() => { const L = lines[0]; const p = d.products.find((x) => x.id === L?.productId); const other = p?.variations?.find((v) => v.id !== L?.variationId); const otherP = d.products.find((x) => x.id !== L?.productId && x.mode !== 'serial' && x.code); return [other ? { c: codeFor(d, 'gh', p!.id, other.id), t: 'رنگ اشتباه' } : null, otherP ? { c: otherP.code!, t: 'کالای دیگر' } : null, { c: 'XX-0000', t: 'کد ناشناخته' }].filter(Boolean) as { c: string; t: string }[] })() : []

  return (
    <Page module="packing" title="ایستگاه بسته‌بندی و اسکن" sub="بارکدخوان را وصل کنید؛ هر قلم را قبل از گذاشتن در جعبه اسکن کنید"
      actions={<><Select className="w-48" value={station} onChange={(v) => { setStation(v); setSid(''); setScans([]) }} options={s.warehouses.filter((w) => w.active).map((w) => [w.id, `ایستگاه ${w.name}`] as [string, string])} /><Button variant="ghost" icon={sound ? <Volume2 size={14} /> : <VolumeX size={14} />} onClick={() => setSound(!sound)}>{sound ? 'صدا روشن' : 'بی‌صدا'}</Button></>}>
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card pad={false} title={`صف ${whName(s, station)}`} hint="به ترتیب نزدیک‌ترین مهلت ارسال">
          {queue.length ? <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">{queue.map(({ o, x }) => <li key={x.id}><button className={cx('flex w-full flex-col gap-0.5 px-4 py-3 text-right hover:bg-neutral-bg', sid === x.id && 'bg-brand/5')} onClick={() => open(x.id)}>
            <span className="flex items-center justify-between"><b className="font-mono text-13">{x.id}</b>{x.pack ? <Badge tone="info">اسکن شده</Badge> : <Badge>{fa(x.items.filter((i) => !i.cancelled).reduce((a, i) => a + i.qty, 0))} قلم</Badge>}</span>
            <span className="text-12 text-t2">{x.method} · مهلت {rel(x.sla)}</span>
            {shipBlocked(o.id, true) && <span className="text-11 text-danger">منتظر پرداخت مابه‌التفاوت</span>}
          </button></li>)}</ul> : <p className="p-4 text-12 text-t2">سفارشی برای بسته‌بندی در این انبار نیست.</p>}
        </Card>

        <div className="space-y-4">
          <Card>
            <form onSubmit={(e) => { e.preventDefault(); handle(code) }} className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px] flex-1"><ScanLine size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" /><Input {...({ ref: input } as object)} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder={cur ? 'بارکد کالا را اسکن کنید…' : 'برچسب سفارش را اسکن کنید یا از صف انتخاب کنید…'} className="ltr h-14 pr-10 text-left font-mono text-18" aria-label="ورودی بارکدخوان" /></div>
              <Button type="submit" size="lg" icon={<Keyboard size={16} />}>ثبت دستی</Button>
              <Button type="button" size="lg" variant="ghost" icon={<Camera size={16} />} onClick={() => setCam(!cam)}>دوربین</Button>
            </form>
            <p className="mt-2 text-11 text-t2">بارکدخوان USB یا بلوتوث مثل کیبورد کار می‌کند: کد را می‌نویسد و Enter می‌زند؛ نیازی به نصب برنامه نیست. روی تبلت و گوشی بدون بارکدخوان، دکمهٔ «دوربین» را بزنید.</p>
            {cam && <CameraScan onCode={(c) => handle(c)} onClose={() => setCam(false)} />}
            {flash && <div role="status" className={cx('mt-3 flex items-start gap-3 rounded-2xl p-4 text-white transition-colors', flash.ok ? 'bg-[#12733f]' : 'bg-[#c42f2f]')}>{flash.ok ? <CheckCircle2 size={30} className="shrink-0" /> : <XCircle size={30} className="shrink-0" />}<div className="flex-1"><p className="text-16 font-bold">{flash.title}</p>{flash.why && <p className="mt-0.5 text-13 opacity-90">{flash.why}</p>}{!flash.ok && <p className="mt-1 text-12 opacity-80">این قلم را در جعبه نگذارید.</p>}</div>{scans.length > 0 && <button type="button" onClick={undo} className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-12"><Undo2 size={13} />برگرداندن اسکن آخر</button>}</div>}
          </Card>

          {cur ? <Card title={<span className="flex items-center gap-2">مرسولهٔ <bdi dir="ltr" className="font-mono">{cur.x.id}</bdi><Badge tone={done ? 'success' : 'info'}>{fa(got)} از {fa(total)}</Badge></span>} actions={<Button size="sm" variant="ghost" onClick={() => nav(`/admin/orders/${cur.o.id}`)}>صفحهٔ سفارش</Button>}>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full transition-all', done ? 'bg-success' : 'bg-brand')} style={{ width: `${total ? (got / total) * 100 : 0}%` }} /></div>
            <ul className="space-y-2">{lines.map((l) => { const n = okFor(l); const full = n >= l.qty; const { name, vname } = pv(d, l.productId, l.variationId); const owners = scans.filter((x) => x.ok && x.productId === l.productId && (x.variationId ?? '') === (l.variationId ?? '')).map((x) => x.owner); return (
              <li key={l.k} className={cx('flex flex-wrap items-center gap-3 rounded-xl border-2 p-3', full ? 'border-success bg-success-bg' : n ? 'border-brand/40' : 'border-line')}>
                {full ? <CheckCircle2 size={22} className="text-success" /> : <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-line text-11 font-bold">{fa(l.qty - n)}</span>}
                <div className="min-w-0 flex-1"><p className="font-medium">{name}</p><p className="text-12 text-t2">{vname && <>{vname} · </>}تعداد {fa(l.qty)}{l.unitId && <> · واحد <bdi dir="ltr" className="font-mono">{l.unitId}</bdi></>}</p>{owners.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{[...new Set(owners)].map((o) => <PartyChip key={o} s={s} id={o} n={owners.filter((x) => x === o).length} />)}</div>}</div>
                <span className="font-mono text-15 font-bold">{fa(n)}/{fa(l.qty)}</span>
                {!full && <Button size="sm" variant="ghost" icon={<PackageX size={13} />} onClick={() => setShort([l.k])}>اینجا نیست</Button>}
              </li>) })}</ul>
            <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="primary" size="lg" icon={<PackageCheck size={16} />} disabled={!done} onClick={finish}>تأیید بسته‌بندی و رفتن به بعدی</Button><Button variant="ghost" icon={<RotateCcw size={14} />} disabled={!scans.length} onClick={() => { setScans([]); setFlash(null); focus() }}>شروع دوباره</Button>{!done && <span className="text-12 text-t2">تا همهٔ اقلام سبز نشوند، تأیید فعال نمی‌شود.</span>}</div>
          </Card> : <Card><div className="py-10 text-center"><ScanLine size={40} className="mx-auto text-t3" /><p className="mt-3 font-semibold">برچسب سفارش را اسکن کنید</p><p className="text-12 text-t2">یا یک مرسوله را از صف کنار صفحه انتخاب کنید.</p></div></Card>}

          {cur && <div className="grid gap-4 lg:grid-cols-2">
            <Card title="اسکن‌های این مرسوله" pad={false}>{scans.length ? <ul className="max-h-72 divide-y divide-line overflow-y-auto">{scans.map((x, i) => <li key={i} className="flex items-start gap-2 px-4 py-2 text-12">{x.ok ? <CheckCircle2 size={15} className="mt-0.5 text-success" /> : <CircleAlert size={15} className="mt-0.5 text-danger" />}<div className="flex-1"><bdi dir="ltr" className="font-mono">{x.code}</bdi>{x.productId && <span className="text-t2"> · {pv(d, x.productId, x.variationId).full}</span>}{x.why && <p className={x.ok ? 'text-warning' : 'text-danger'}>{x.why}</p>}</div>{x.owner && <PartyChip s={s} id={x.owner} />}</li>)}</ul> : <p className="p-4 text-12 text-t2">هنوز اسکنی ثبت نشده است.</p>}</Card>
            <Card title="آزمایش بدون بارکدخوان" hint="در این نسخهٔ نمایشی روی هر کد بزنید تا مثل اسکن عمل کند.">
              <p className="mb-1 text-11 font-semibold text-success">کدهای درست این سفارش</p>
              <div className="mb-3 grid gap-2 sm:grid-cols-2">{testCodes.map((t) => <button key={t.c + t.t} type="button" onClick={() => handle(t.c)} className="rounded-xl border border-line p-2 text-right hover:border-success"><Barcode value={t.c} height={30} module={1.4} className="h-12 w-full" /><span className="text-11 text-t2">{t.t}</span></button>)}</div>
              <p className="mb-1 text-11 font-semibold text-danger">کدهای اشتباه برای آزمایش</p>
              <div className="flex flex-wrap gap-1.5">{wrong.map((t) => <button key={t.c} type="button" onClick={() => handle(t.c)} className="rounded-lg border border-line px-2 py-1 text-11 hover:border-danger">{t.t} · <bdi dir="ltr" className="font-mono">{t.c}</bdi></button>)}</div>
            </Card>
          </div>}
        </div>
      </div>
      {cur && short && <StartDecision o={cur.o as Order} open onClose={() => { setShort(null); focus() }} preset={{ kind: 'out_of_stock', items: short, source: 'انبار', note: `هنگام بسته‌بندی در ${whName(s, station)} پیدا نشد.` }} onDone={() => { setShort(null); toast('کمبود ثبت شد و به صف تصمیم سفارش رفت.') }} />}
    </Page>
  )
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
