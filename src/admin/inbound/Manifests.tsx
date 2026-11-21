// حوالهٔ بین انبارها: فهرست چاپی با بارکد، جمع‌آوری با اسکن (چک‌لیست: نه چیزی جا بماند نه اشتباه برود)، ارسال، و تحویل با اسکن در مقصد
import { useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Clock, Eye, History, MapPin, PackageCheck, Plus, Printer, ScanLine, Send, Truck, X } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Progress, Segmented, Select } from '@/shared/ui/base'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { Barcode } from '@/shared/ui/codes'
import { printSolo } from '@/shared/lib/printSolo'
import { currentUser, getDB, myParty, mutate, notify, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { MANIFEST_STATUS, manifestPhase, PHASE, resolveCode, type Manifest } from '@/shared/data/inbound'
import { PartyChip, whName } from '../stock/common'
import { linesFromStock, manifestTotals, mid, now, receiveManifest } from './ops'

const me = () => currentUser()?.name ?? 'پنل'
/** صدای کوتاه برای اسکن: درست، اشتباه */
export function beep(ok: boolean) {
  try { const C = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext; const c = new C(); const o = c.createOscillator(); const g = c.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = ok ? 1250 : 220; g.gain.value = 0.06; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (ok ? 0.09 : 0.32)); setTimeout(() => c.close(), 500) } catch { /* بی‌صدا */ }
}
/** ورودی اسکن: بارکدخوان مثل کیبورد تایپ و Enter می‌زند */
export function ScanInput({ onScan, placeholder = 'بارکد را اسکن کنید یا کد را بنویسید و Enter بزنید', auto = true }: { onScan: (code: string) => void; placeholder?: string; auto?: boolean }) {
  const [v, setV] = useState('')
  return <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onScan(v.trim()); setV('') } }} className="flex gap-2">
    <span className="relative flex-1"><ScanLine size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" /><Input autoFocus={auto} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="ltr h-12 pr-10 text-left font-mono text-15 placeholder:font-sans placeholder:text-13 placeholder:[direction:rtl]" aria-label="کد اسکن" /></span>
    <Button type="submit" variant="primary" className="h-12">ثبت</Button>
  </form>
}

export function ManifestsTab({ focus }: { focus?: string }) {
  const d = useDB(); const s = d.stock; const M = s.manifests ?? []
  const [open, setOpen] = useState<string | null>(focus ?? null); const [make, setMake] = useState(false); const [f, setF] = useState<'open' | 'history'>('open')
  const mine = s.warehouses.filter((w) => w.operator === myParty()).map((w) => w.id)
  const isOpen = (m: Manifest) => !['received', 'partial', 'cancelled'].includes(m.status)
  const list = M.filter(isOpen).sort((a, b) => ['arrived', 'transit', 'origin'].indexOf(manifestPhase(a)) - ['arrived', 'transit', 'origin'].indexOf(manifestPhase(b)))
  const phases = (['origin', 'transit', 'arrived'] as const).map((p) => [p, list.filter((m) => manifestPhase(m) === p).length] as const)
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-2.5">
      <Segmented size="sm" value={f} onChange={setF} options={[['open', `باز (${fa(list.length)})`], ['history', `سوابق (${fa(M.length - list.length)})`]]} />
      {f === 'open' && <span className="flex flex-wrap gap-1.5 text-11">{phases.map(([p, n]) => <span key={p} className={cx('ph-chip rounded-full px-2.5 py-1 font-semibold', PHASE[p].cls)}>{PHASE[p].label}: {fa(n)}</span>)}</span>}
      <Button variant="primary" className="mr-auto" icon={<Plus size={14} />} onClick={() => setMake(true)}>حوالهٔ تازه</Button>
    </div>
    {f === 'open' && <>
      <p className="px-1 text-12 text-t2">مبدأ با اسکن جمع می‌کند، ارسال می‌کند و مقصد با اسکن تحویل می‌گیرد. موجودی با همان مالک و بها جابه‌جا می‌شود. رنگ هر کارت مرحلهٔ حواله را نشان می‌دهد.</p>
      {list.length === 0 ? <Card><EmptyState title="حوالهٔ بازی نیست." desc="با رسید محموله، حوالهٔ سهم انبارهای دیگر خودکار ساخته می‌شود؛ یا دستی از موجودی یک انبار حواله بسازید." action={<Button onClick={() => setMake(true)}>حوالهٔ تازه</Button>} /></Card> :
        <div className="grid gap-3 lg:grid-cols-2">{list.map((m) => { const t = manifestTotals(m); const ph = manifestPhase(m); const my = mine.includes(m.from) ? 'pack' : mine.includes(m.to) ? 'recv' : null
          const pct = Math.round(((ph === 'origin' ? t.packed : t.received) / Math.max(1, t.qty)) * 100)
          return <button key={m.id} type="button" onClick={() => setOpen(m.id)} className={cx('ph-card lift overflow-hidden rounded-2xl border text-right', PHASE[ph].cls)}>
            <div className="ph-band flex items-center gap-2 px-4 py-2 text-12 font-bold text-white">{ph === 'origin' ? <Send size={14} /> : ph === 'transit' ? <Truck size={14} /> : <MapPin size={14} />}{PHASE[ph].label}<span className="mr-auto font-mono text-11 opacity-90">{m.id}</span></div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">{my === 'pack' && ph === 'origin' && <Badge tone="warning" dot={false}>نوبت شماست: جمع‌آوری</Badge>}{my === 'recv' && ph !== 'origin' && <Badge tone="warning" dot={false}>نوبت شماست: تحویل با اسکن</Badge>}{m.issues.length > 0 && <Badge tone="danger" dot={false}>{fa(m.issues.length)} مغایرت</Badge>}{m.carrier && ph !== 'origin' && <span className="flex items-center gap-1 text-11 text-t2"><Truck size={11} />{m.carrier}</span>}</div>
              <p className="mt-2 flex items-center gap-2 text-14 font-semibold">{whName(s, m.from)}<ArrowLeft size={14} className="text-t3" />{whName(s, m.to)}</p>
              <p className="mt-1 text-12 text-t2">{m.reason ?? '—'} · {fa(m.lines.length)} قلم · {fa(t.qty)} عدد · {ph === 'origin' ? `ساخت ${rel(m.createdAt)}` : m.arrivedAt ? `رسید ${rel(m.arrivedAt)}` : m.sentAt ? `ارسال ${rel(m.sentAt)}` : rel(m.createdAt)}</p>
              <div className="mt-3"><div className="ph-track h-2 overflow-hidden rounded-full"><div className="ph-fill h-full rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                <p className="mt-1 text-11 text-t2">{ph === 'origin' ? `اسکن جمع‌آوری ${fa(t.packed)} از ${fa(t.qty)}` : `اسکن تحویل ${fa(t.received)} از ${fa(t.qty)}`}</p></div>
            </div>
          </button> })}</div>}
    </>}
    {f === 'history' && <ManifestHistory onOpen={setOpen} />}
    {make && <NewManifest onClose={(id) => { setMake(false); if (id) setOpen(id) }} />}
    {open && <ManifestView id={open} onClose={() => setOpen(null)} />}
  </div>
}

/** سوابق حواله‌های بسته‌شده: مسیر، زمان در راه، رسیده در برابر ارسال‌شده، مغایرت؛ با فیلتر و بازبینی هر حواله */
function ManifestHistory({ onOpen }: { onOpen: (id: string) => void }) {
  const d = useDB(); const s = d.stock; const [q, setQ] = useState(''); const [st, setSt] = useState<'all' | 'received' | 'partial' | 'cancelled'>('all'); const [route, setRoute] = useState('')
  const H = (s.manifests ?? []).filter((m) => ['received', 'partial', 'cancelled'].includes(m.status)).sort((a, b) => (b.receivedAt ?? b.createdAt).localeCompare(a.receivedAt ?? a.createdAt))
  const routes = [...new Set(H.map((m) => `${m.from}>${m.to}`))]
  const L = H.filter((m) => (st === 'all' || m.status === st) && (!route || `${m.from}>${m.to}` === route) && (!q.trim() || `${m.id} ${m.reason ?? ''} ${m.lines.map((l) => `${l.title} ${l.code}`).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())))
  const hrs = (m: Manifest) => (m.sentAt && m.receivedAt ? (+new Date(m.receivedAt) - +new Date(m.sentAt)) / 36e5 : null)
  const done = L.filter((m) => m.status !== 'cancelled'); const moved = done.reduce((a, m) => a + manifestTotals(m).received, 0); const T = done.map(hrs).filter((x): x is number => x !== null)
  const issueRate = done.length ? done.filter((m) => m.status === 'partial' || m.issues.length).length / done.length : 0
  return <div className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-4">{[['حوالهٔ بسته‌شده', fa(L.length)], ['عدد جابه‌جاشده', fa(moved)], ['میانگین زمان در راه', T.length ? `${fa(Math.round(T.reduce((a, x) => a + x, 0) / T.length))} ساعت` : '—'], ['حواله با مغایرت', `${fa(Math.round(issueRate * 100))}٪`]].map(([l, v]) => <div key={l} className="rounded-xl border border-line bg-surface p-3"><p className="text-11 text-t2">{l}</p><b className="text-16">{v}</b></div>)}</div>
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-9 w-60 text-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="شمارهٔ حواله، نام یا کد کالا" aria-label="جست‌وجو در سوابق حواله" />
      <Segmented size="sm" value={st} onChange={setSt} options={[['all', 'همه'], ['received', 'کامل'], ['partial', 'با مغایرت'], ['cancelled', 'لغو']]} />
      <Select className="w-56" value={route} onChange={setRoute} other={false} options={[['', 'همهٔ مسیرها'], ...routes.map((r) => { const [a, b] = r.split('>'); return [r, `${whName(s, a)} ← ${whName(s, b)}`] as [string, string] })]} />
    </div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[860px] text-12"><thead><tr className="bg-surface-2 text-t2">{['حواله', 'مسیر', 'ارسال', 'تحویل', 'زمان در راه', 'ارسال‌شده', 'رسیده', 'مغایرت', 'وضعیت', ''].map((h, i) => <th key={i} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {L.map((m) => { const t = manifestTotals(m); const h = hrs(m); const ph = manifestPhase(m); return <tr key={m.id} className="border-t border-line align-top">
        <td className="p-2"><b className="font-mono">{m.id}</b><span className="block max-w-48 truncate text-11 text-t3">{m.reason ?? '—'}</span></td>
        <td className="p-2"><span className="flex items-center gap-1">{whName(s, m.from)}<ArrowLeft size={12} className="text-t3" />{whName(s, m.to)}</span>{m.carrier && <span className="text-11 text-t3">{m.carrier}{m.tracking ? ` · ${m.tracking}` : ''}</span>}</td>
        <td className="p-2">{m.sentAt ? <>{rel(m.sentAt)}<span className="block text-11 text-t3">{m.sentBy}</span></> : '—'}</td>
        <td className="p-2">{m.receivedAt ? <>{rel(m.receivedAt)}<span className="block text-11 text-t3">{m.receivedBy}</span></> : '—'}</td>
        <td className="p-2 tnum">{h !== null ? <span className={cx(h > 72 && 'text-warning')}><Clock size={11} className="ml-0.5 inline" />{fa(Math.round(h))} ساعت</span> : '—'}</td>
        <td className="p-2 tnum">{fa(t.qty)}</td>
        <td className={cx('p-2 font-semibold tnum', t.received < t.qty ? 'text-warning' : 'text-success')}>{fa(t.received)}</td>
        <td className="p-2">{m.issues.length ? <span className="text-danger">{fa(m.issues.length)} مورد</span> : <span className="text-t3">ندارد</span>}</td>
        <td className="p-2"><span className={cx('ph-chip rounded-full px-2 py-0.5 text-11 font-semibold', PHASE[ph].cls)}>{PHASE[ph].label}</span></td>
        <td className="p-2"><Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => onOpen(m.id)}>بررسی</Button></td>
      </tr> })}
      {L.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-t2"><History size={18} className="mx-auto mb-1 text-t3" />حواله‌ای با این فیلتر نیست.</td></tr>}
    </tbody></table></div>
  </div>
}

function NewManifest({ onClose }: { onClose: (id?: string) => void }) {
  const d = useDB(); const s = d.stock; const mine = s.warehouses.find((w) => w.operator === myParty())?.id ?? 'tehran'
  const [f, setF] = useState({ from: mine, to: s.warehouses.find((w) => w.id !== mine)?.id ?? 'tehran', owner: '', reason: '', all: false })
  const avail = linesFromStock(d, f.from, f.owner || undefined)
  const [pick, setPick] = useState<Record<string, number>>({})
  const lines = f.all ? avail : avail.filter((l) => (pick[l.key] ?? 0) > 0).map((l) => ({ ...l, qty: Math.min(l.qty, pick[l.key]) }))
  const go = () => { const id = mid('HV'); mutate((x) => { x.stock.manifests = x.stock.manifests ?? []; x.stock.manifests.unshift({ id, from: f.from, to: f.to, status: 'draft', createdAt: now(), by: me(), reason: f.reason || (f.all ? 'انتقال همهٔ موجودی' : 'انتقال بین انبارها'), lines: lines.map((l) => ({ ...l, packed: 0, received: 0 })), issues: [], events: [{ at: now(), by: me(), text: 'ساخت حواله' }] }) }, { action: 'ساخت حوالهٔ انتقال', target: `${id} · ${whName(s, f.from)} ← ${whName(s, f.to)}`, after: `${lines.reduce((a, l) => a + l.qty, 0)} عدد` }); toast(`حوالهٔ ${id} ساخته شد؛ با اسکن جمع‌آوری کنید.`); onClose(id) }
  return <Modal open onClose={() => onClose()} wide title="حوالهٔ تازه" footer={<><Button variant="primary" disabled={!lines.length || f.from === f.to} onClick={go}>ساخت حواله ({fa(lines.reduce((a, l) => a + l.qty, 0))} عدد)</Button><Button variant="ghost" onClick={() => onClose()}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-4">
      <Field label="از انبار"><Select value={f.from} onChange={(v) => { setF({ ...f, from: v }); setPick({}) }} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} other={false} /></Field>
      <Field label="به انبار"><Select value={f.to} onChange={(v) => setF({ ...f, to: v })} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} other={false} /></Field>
      <Field label="فقط کالای مالک"><Select value={f.owner} onChange={(v) => { setF({ ...f, owner: v }); setPick({}) }} options={[['', 'همهٔ مالک‌ها'], ...s.parties.map((p) => [p.id, p.name] as [string, string])]} other={false} /></Field>
      <Field label="دلیل"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="مثلاً تأمین موجودی تهران" /></Field>
    </div>
    <label className="mt-3 flex items-center gap-2 text-12"><input type="checkbox" checked={f.all} onChange={(e) => setF({ ...f, all: e.target.checked })} />همهٔ موجودی این انبار{f.owner ? ' (همین مالک)' : ''} منتقل شود</label>
    <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-line"><table className="w-full text-12"><thead><tr className="sticky top-0 bg-surface-2 text-t2">{['کالا', 'مالک', 'موجود', 'انتقال'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {avail.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-t2">در این انبار موجودی‌ای نیست.</td></tr> : avail.map((l) => <tr key={l.key} className="border-t border-line"><td className="p-2">{l.title}{l.vname && <span className="text-t2"> · {l.vname}</span>}<bdi dir="ltr" className="block font-mono text-11 text-t3">{l.code}</bdi></td><td className="p-2"><PartyChip s={s} id={l.owner} /></td><td className="p-2 tnum">{fa(l.qty)}</td><td className="p-2">{f.all ? <span className="tnum">{fa(l.qty)}</span> : <Input type="number" min={0} max={l.qty} className="ltr w-20 text-center" value={pick[l.key] ?? 0} onChange={(e) => setPick({ ...pick, [l.key]: Math.min(l.qty, Math.max(0, +e.target.value)) })} />}</td></tr>)}
    </tbody></table></div>
  </Modal>
}

/** جزئیات حواله با حالت جمع‌آوری یا تحویل با اسکن */
export function ManifestView({ id, onClose }: { id: string; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const m = (s.manifests ?? []).find((q) => q.id === id); const sheet = useRef<HTMLDivElement>(null)
  const [last, setLast] = useState<null | { ok: boolean; text: string; sub?: string }>(null); const [ship, setShip] = useState(false)
  if (!m) return null
  const t = manifestTotals(m); const st = MANIFEST_STATUS[m.status]
  const mode: 'pack' | 'recv' | null = ['draft', 'packing'].includes(m.status) ? 'pack' : m.status === 'sent' ? 'recv' : null
  const done = mode === 'recv' ? t.received : t.packed
  const left = m.lines.filter((l) => (mode === 'recv' ? l.received : l.packed) < l.qty); const full = m.lines.filter((l) => !left.includes(l))
  const op = (w: string) => s.warehouses.find((x) => x.id === w)?.operator
  const th = mode === 'recv' ? { role: 'صفحهٔ تحویل‌گیرنده', title: `تحویل بار در ${whName(s, m.to)}`, party: op(m.to) } : mode === 'pack' ? { role: 'صفحهٔ ارسال‌کننده', title: `جمع‌آوری و ارسال از ${whName(s, m.from)}`, party: op(m.from) } : null
  const upd = (fn: (q: Manifest) => void, action: string) => mutate((x) => fn(x.stock.manifests!.find((q) => q.id === id)!), { action, target: id })
  const scan = (raw: string) => {
    const code = raw.toUpperCase(); const field = mode === 'pack' ? 'packed' : 'received'
    const ln = m.lines.find((l) => l.code.toUpperCase() === code)
    if (!ln) { const r = resolveCode(getDB(), raw); beep(false)
      setLast({ ok: false, text: r ? `«${r.title}${r.vname ? ` · ${r.vname}` : ''}» در این حواله نیست` : 'کد ناشناخته است', sub: r ? `مالک: ${s.parties.find((p) => p.id === r.owner)?.name ?? r.owner}. کنار بگذارید و نفرستید.` : 'برچسب را دوباره اسکن کنید یا کالا را جدا کنید.' })
      upd((q) => { q.issues.push({ at: now(), by: me(), code, kind: r ? 'wrong' : 'unknown', note: r ? `${r.title} در حواله نیست` : undefined }) }, 'اسکن کالای خارج از حواله'); return }
    if (ln[field] >= ln.qty) { beep(false); setLast({ ok: false, text: `«${ln.title}» کامل شده است (${fa(ln.qty)} از ${fa(ln.qty)})`, sub: 'این عدد اضافه است؛ کنار بگذارید.' }); upd((q) => { q.issues.push({ at: now(), by: me(), code, kind: 'extra' }) }, 'اسکن عدد اضافه'); return }
    beep(true); setLast({ ok: true, text: `${ln.title}${ln.vname ? ` · ${ln.vname}` : ''}`, sub: `${fa(ln[field] + 1)} از ${fa(ln.qty)} · مالک ${s.parties.find((p) => p.id === ln.owner)?.name}` })
    upd((q) => { const L = q.lines.find((l) => l.key === ln.key)!; L[field] += 1; if (field === 'received' && !q.arrivedAt) { q.arrivedAt = now(); q.arrivedBy = me() } if (q.status === 'draft') { q.status = 'packing'; q.events.push({ at: now(), by: me(), text: 'شروع جمع‌آوری با اسکن' }) } }, mode === 'pack' ? 'اسکن جمع‌آوری حواله' : 'اسکن تحویل حواله')
  }
  const send = async (carrier: string, tracking: string) => {
    if (t.packed < t.qty && !(await confirm({ title: `${fa(t.qty - t.packed)} عدد هنوز اسکن نشده است`, body: `${m.lines.filter((l) => l.packed < l.qty).map((l) => `${l.title}${l.vname ? ` · ${l.vname}` : ''}: ${fa(l.qty - l.packed)} عدد`).join('، ')}. با ارسال، همین تعدادها از حواله کم می‌شود.`, confirm: 'ارسال با همین تعداد', danger: true }))) return
    upd((q) => { q.lines.forEach((l) => { if (l.packed < l.qty) { q.issues.push({ at: now(), by: me(), code: l.code, kind: 'missing', note: `${l.qty - l.packed} عدد ارسال نشد` }); l.qty = l.packed } }); q.lines = q.lines.filter((l) => l.qty > 0); q.status = 'sent'; q.sentAt = now(); q.sentBy = me(); q.carrier = carrier; q.tracking = tracking || undefined; q.events.push({ at: now(), by: me(), text: `ارسال با ${carrier}${tracking ? ` · کد ${tracking}` : ''} · ${t.packed} عدد اسکن شد` }) }, 'ارسال حواله')
    notify('حوالهٔ تازه در راه است', `${m.id}: ${fa(t.packed)} عدد از ${whName(s, m.from)} برای ${whName(s, m.to)} ارسال شد. هنگام رسیدن با اسکن تحویل بگیرید.`, `/admin/inbound?tab=manifests&m=${m.id}`, 'عملیات', 'info')
    toast('حواله ارسال شد و برای انبار مقصد اعلان رفت.'); setShip(false) }
  const finish = async () => {
    if (t.received < t.qty && !(await confirm({ title: `${fa(t.qty - t.received)} عدد هنوز اسکن نشده است`, body: 'با ثبت، کسری به‌عنوان مغایرت در حواله ثبت می‌شود و موجودی همان تعداد در انبار مبدأ می‌ماند تا پیگیری شود.', confirm: 'ثبت با مغایرت', danger: true }))) return
    let short = false; mutate((x) => { short = receiveManifest(x, id, me()).short }, { action: 'تحویل حواله در مقصد', target: id, after: `${t.received} از ${t.qty}` })
    if (short) notify('حواله با مغایرت تحویل شد', `${m.id}: ${fa(t.qty - t.received)} عدد کمتر رسید.`, `/admin/inbound?tab=manifests&m=${m.id}`, 'عملیات', 'warning')
    toast(short ? 'تحویل با مغایرت ثبت شد؛ کسری در حواله و لاگ ماند.' : 'تحویل کامل شد؛ موجودی با همان مالک و بها به انبار مقصد آمد.') }
  return <Drawer open onClose={onClose} width={780} title={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{m.id}</span><Badge tone={st.tone}>{st.label}</Badge></span>}
    footer={<div className="flex w-full flex-wrap gap-2">
      {mode === 'pack' && <Button variant="primary" icon={<Send size={14} />} disabled={!t.packed} onClick={() => setShip(true)}>ارسال ({fa(t.packed)} از {fa(t.qty)})</Button>}
      {mode === 'recv' && <Button variant="primary" className="recv-solid" icon={<PackageCheck size={14} />} disabled={!t.received} onClick={() => void finish()}>ثبت تحویل ({fa(t.received)} از {fa(t.qty)})</Button>}
      <Button variant="ghost" icon={<Printer size={14} />} onClick={() => printSolo(sheet.current)}>چاپ حواله و بارکدها</Button>
      {['draft', 'packing'].includes(m.status) && <Button variant="ghost" className="mr-auto" icon={<X size={14} />} onClick={async () => { if (await confirm({ title: 'حواله لغو شود؟', body: 'موجودی جابه‌جا نشده است؛ فقط حواله بسته می‌شود.', confirm: 'لغو حواله', danger: true })) { upd((q) => { q.status = 'cancelled'; q.events.push({ at: now(), by: me(), text: 'لغو حواله' }) }, 'لغو حواله'); onClose() } }}>لغو</Button>}
    </div>}>
    <div className="space-y-4">
      {/* نقش روشن: تحویل‌گیرنده (سبز) یا ارسال‌کننده (آبی)؛ هر کس فقط کار خودش را می‌بیند */}
      {th ? <div className={cx('manifest-hero overflow-hidden rounded-2xl text-white', mode === 'recv' ? 'is-recv' : 'is-pack')}>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">{mode === 'recv' ? <PackageCheck size={24} /> : <Send size={22} />}</span>
          <div className="min-w-0 flex-1"><p className="text-11 opacity-80">{th.role}</p><p className="text-16 font-extrabold">{th.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-12 opacity-90">{whName(s, m.from)}<ArrowLeft size={13} />{whName(s, m.to)}{m.reason ? ` · ${m.reason}` : ''}</p></div>
          {th.party && <span className="rounded-xl bg-white px-2 py-1"><PartyChip s={s} id={th.party} /></span>}
        </div>
        <div className="grid grid-cols-3 border-t border-white/15 text-center">
          <div className="p-2.5"><b className="block text-22 tnum">{fa(done)}</b><span className="text-11 opacity-80">{mode === 'recv' ? 'رسید و اسکن شد' : 'در کارتن'}</span></div>
          <div className="border-x border-white/15 p-2.5"><b className="block text-22 tnum">{fa(t.qty - done)}</b><span className="text-11 opacity-80">مانده</span></div>
          <div className="p-2.5"><b className={cx('block text-22 tnum', m.issues.length > 0 && 'text-[#ffc24b]')}>{fa(m.issues.length)}</b><span className="text-11 opacity-80">مغایرت</span></div>
        </div>
        <div className="h-1.5 bg-white/15"><div className="h-full bg-[#ffc24b] transition-all" style={{ width: `${Math.round((done / Math.max(1, t.qty)) * 100)}%` }} /></div>
      </div> : <p className="flex items-center gap-2 text-14 font-semibold">{whName(s, m.from)}<ArrowLeft size={15} className="text-t3" />{whName(s, m.to)}<span className="text-12 font-normal text-t2">· {m.reason}</span></p>}
      {mode === 'recv' && !m.arrivedAt && t.received === 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[#0f766e]/40 px-3 py-2 text-12"><span className="text-t2">بار هنوز «در راه» ثبت شده است. اگر رسیده و فعلاً وقت اسکن ندارید، رسیدنش را ثبت کنید تا کارت به «منتظر اسکن نهایی» برود.</span><Button size="sm" className="recv-solid" icon={<MapPin size={13} />} onClick={() => upd((q) => { q.arrivedAt = now(); q.arrivedBy = me(); q.events.push({ at: now(), by: me(), text: `بار به ${whName(s, q.to)} رسید؛ منتظر اسکن نهایی` }) }, 'ثبت رسیدن حواله به مقصد')}>بار رسید</Button></div>}
      {m.carrier && <p className="flex items-center gap-1.5 text-12 text-t2"><Truck size={13} />{m.carrier}{m.tracking && <> · کد <bdi dir="ltr" className="font-mono">{m.tracking}</bdi></>}{m.sentAt && ` · ارسال ${rel(m.sentAt)} توسط ${m.sentBy}`}</p>}
      {mode && <div className={cx('space-y-2 rounded-2xl border-2 p-3', mode === 'recv' ? 'border-[#0f766e]/35 bg-[#e8f6f3] dark:bg-[#0f766e]/15' : 'border-brand/30 bg-brand-tint/30')}>
        <p className="flex items-center gap-1.5 text-13 font-bold"><ScanLine size={16} className={mode === 'recv' ? 'text-[#0f766e]' : 'text-brand'} />{mode === 'pack' ? 'هر کالا را که در کارتن می‌گذارید اسکن کنید' : 'هر کالا را که از کارتن درمی‌آورید اسکن کنید'}</p>
        <ScanInput onScan={scan} />
        {last && <div className={cx('anim-pop flex items-start gap-2.5 rounded-xl px-3 py-3', last.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>{last.ok ? <Check size={22} className="mt-0.5 shrink-0" /> : <AlertTriangle size={22} className="mt-0.5 shrink-0" />}<span><b className="block text-14">{last.text}</b>{last.sub && <span className="text-12">{last.sub}</span>}</span></div>}
      </div>}
      {/* مانده‌ها اول، کامل‌شده‌ها پایین و کم‌رنگ */}
      {mode && left.length > 0 && <p className="text-12 font-semibold text-t2">مانده برای اسکن ({fa(left.length)} ردیف)</p>}
      <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full text-12"><thead><tr className="bg-surface-2 text-t2">{(mode === 'recv' ? ['', 'کالا', 'مالک', 'ارسال‌شده', 'رسیده'] : mode === 'pack' ? ['', 'کالا', 'مالک', 'تعداد', 'در کارتن'] : ['', 'کالا', 'مالک', 'تعداد', 'جمع‌آوری', 'تحویل']).map((h, i) => <th key={i} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
        {[...left, ...full].map((l) => { const got = mode === 'recv' ? l.received : l.packed; const ok = mode ? got >= l.qty : true; return <tr key={l.key} className={cx('border-t border-line', mode && ok && 'bg-success-bg/30 text-t2')}>
          <td className="w-8 p-2">{ok && mode ? <Check size={15} className="text-success" /> : mode ? <span className="block size-3.5 rounded-sm border-2 border-line" /> : null}</td>
          <td className="p-2"><b className={cx(mode && ok && 'font-medium')}>{l.title}</b>{l.vname && <span className="text-t2"> · {l.vname}</span>}<bdi dir="ltr" className="block font-mono text-11 text-t3">{l.code}</bdi></td>
          <td className="p-2"><PartyChip s={s} id={l.owner} /></td>
          <td className="p-2 tnum">{fa(l.qty)}</td>
          {mode ? <td className="p-2"><span className={cx('tnum font-semibold', ok ? 'text-success' : got ? 'text-warning' : 'text-t3')}>{fa(got)} از {fa(l.qty)}</span></td> : <><td className="p-2 tnum">{fa(l.packed)}</td><td className={cx('p-2 tnum', l.received < l.qty && 'text-warning')}>{fa(l.received)}</td></>}
        </tr> })}
      </tbody></table></div>
      {m.issues.length > 0 && <details open={mode === 'recv'} className="rounded-xl border border-danger/30"><summary className="cursor-pointer px-3 py-2 text-12 font-semibold text-danger">مغایرت‌های ثبت‌شده ({fa(m.issues.length)})</summary><ul className="space-y-1 border-t border-danger/20 p-2 text-12">{m.issues.slice().reverse().map((i, k) => <li key={k} className="rounded-lg bg-danger-bg/50 px-2.5 py-1.5"><b>{({ wrong: 'کالای خارج از حواله', extra: 'عدد اضافه', unknown: 'کد ناشناخته', missing: 'ارسال‌نشده', damaged: 'آسیب‌دیده', short: 'کسری در تحویل' } as const)[i.kind]}</b> · <bdi dir="ltr" className="font-mono">{i.code}</bdi>{i.note ? ` · ${i.note}` : ''} · {i.by} · {rel(i.at)}</li>)}</ul></details>}
      <details className="rounded-xl border border-line"><summary className="cursor-pointer px-3 py-2 text-12 font-semibold text-t2">سابقهٔ حواله ({fa(m.events.length)})</summary><ol className="space-y-1 border-t border-line p-3 text-12">{m.events.map((e, i) => <li key={i}><span className="text-t3">{rel(e.at)} · {e.by}:</span> {e.text}</li>)}</ol></details>
    </div>
    <div ref={sheet} className="hidden print:block"><h2>حوالهٔ {m.id}: {whName(s, m.from)} ← {whName(s, m.to)}</h2><p>{m.reason} · {new Date(m.createdAt).toLocaleString('fa-IR')} · {m.by}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th>✓</th><th>کالا</th><th>مالک</th><th>تعداد</th><th>بارکد</th></tr></thead><tbody>{m.lines.map((l) => <tr key={l.key}><td style={{ width: 24, border: '1px solid #999' }} /><td>{l.title}{l.vname ? ` · ${l.vname}` : ''}</td><td>{s.parties.find((p) => p.id === l.owner)?.name}</td><td>{l.qty}</td><td><Barcode value={l.code} height={30} module={1.4} /></td></tr>)}</tbody></table>
      <p style={{ marginTop: 24 }}>امضای ارسال‌کننده: ................ امضای تحویل‌گیرنده: ................</p></div>
    {ship && <ShipModal m={m} onSend={send} onClose={() => setShip(false)} />}
  </Drawer>
}

function ShipModal({ m, onSend, onClose }: { m: Manifest; onSend: (carrier: string, tracking: string) => void; onClose: () => void }) {
  const [c, setC] = useState(m.carrier ?? 'تیپاکس'); const [tr, setTr] = useState(m.tracking ?? '')
  return <Modal open onClose={onClose} title={`ارسال حوالهٔ ${m.id}`} footer={<><Button variant="primary" icon={<Send size={14} />} onClick={() => onSend(c, tr.trim())}>ثبت ارسال</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="روش ارسال"><Select value={c} onChange={setC} options={['تیپاکس', 'پست (تاپین)', 'باربری', 'همراه شخص', 'پیک بین‌شهری']} /></Field><Field label="کد رهگیری یا بارنامه (اختیاری)"><Input className="ltr text-left font-mono" value={tr} onChange={(e) => setTr(e.target.value)} /></Field></div>
  </Modal>
}
