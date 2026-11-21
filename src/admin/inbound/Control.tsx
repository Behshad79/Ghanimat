// کنترل شرکا و انبارها: توقف فوری (فروش، ارسال، همگام‌سازی سایت، ورود به پنل) با ازسرگیری یک‌کلیکی، و انتقال همهٔ موجودی به شعبهٔ تهران
import { useState } from 'react'
import { ArrowLeft, OctagonPause, Play, ShieldAlert, Truck } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, isChief, mutate, notify, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { PauseState } from '@/shared/data/stock'
import { syncQty } from '@/shared/data/ledger'
import { PartyChip, partyLogo, whName } from '../stock/common'
import { linesFromStock, mid, now } from './ops'

const me = () => currentUser()?.name ?? 'پنل'
const live = (p?: PauseState) => !!p && (!p.until || +new Date(p.until) > Date.now())
const SCOPES: [keyof Pick<PauseState, 'sell' | 'ship' | 'sync' | 'login'>, string, string][] = [
  ['sell', 'توقف فروش موجودی‌ها', 'موجودی‌های این شریک از سایت و همهٔ کانال‌ها خارج می‌شود (ناموجود)؛ سفارش‌های ثبت‌شده سر جایشان می‌مانند.'],
  ['ship', 'توقف ارسال از انبارهایش', 'انبار او برای ارسال سفارش تازه بسته می‌شود؛ سفارش‌ها از انبارهای دیگر تأمین می‌شوند.'],
  ['sync', 'توقف همگام‌سازی سایت شریک', 'ووکامرس او نه سفارش به ما می‌دهد نه موجودی از ما می‌گیرد.'],
  ['login', 'بستن ورود به پنل', 'حساب کاربری او موقتاً غیرفعال می‌شود؛ هیچ داده‌ای پاک نمی‌شود.'],
]

export function ControlTab() {
  const d = useDB(); const s = d.stock; const [pause, setPause] = useState<string | null>(null); const [move, setMove] = useState<string | null>(null)
  const partners = s.parties.filter((p) => p.kind !== 'self')
  const unitsOf = (owner: string) => s.lots.filter((l) => l.owner === owner && l.qty > 0).reduce((a, l) => a + l.qty, 0)
  const resume = (pid: string) => {
    mutate((x) => { const p = x.stock.parties.find((q) => q.id === pid)!; const was = p.pause; p.pause = undefined
      x.stock.warehouses.filter((w) => w.operator === pid).forEach((w) => { w.pause = undefined })
      x.stock.ext.filter((e) => e.partyId === pid).forEach((e) => { e.paused = false })
      if (was?.login) { const m = x.team.find((u) => u.id === p.userId) as { disabled?: boolean; status: string } | undefined; if (m) { m.disabled = false; if (m.status === 'غیرفعال') m.status = 'آفلاین' } }
      new Set(x.stock.lots.filter((l) => l.owner === pid || x.stock.warehouses.find((w) => w.id === l.warehouse)?.operator === pid).map((l) => l.productId)).forEach((id) => syncQty(x, id)) },
    { action: 'ازسرگیری شریک بعد از توقف فوری', target: pid })
    toast('همه‌چیز برگشت؛ موجودی دوباره در سایت است و انبار و همگام‌سازی باز شد.') }
  return <div className="space-y-4">
    <div className="flex items-start gap-2 rounded-xl bg-warning-bg px-4 py-3 text-12 text-warning"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><span>برای وقتی که شریکی مدتی نیست، اختلافی پیش آمده یا باید فوراً جلوی فروش یا ارسال را گرفت. هر بخش جدا قابل توقف است، می‌تواند تاریخ پایان داشته باشد، در لاگ ممیزی ثبت می‌شود و با یک کلیک برمی‌گردد. برای پایان کامل همکاری از «مالکیت و تسویه ← شرکا» غیرفعال‌سازی را بزنید.</span></div>
    <div className="grid gap-4 lg:grid-cols-2">{partners.map((p) => { const ps = p.pause; const on = live(ps); const whs = s.warehouses.filter((w) => w.operator === p.id)
      return <Card key={p.id} title={<span className="flex items-center gap-2">{partyLogo(p) && <img src={partyLogo(p)} alt="" className="size-6 object-contain" />}{p.name}{p.brandName && <span className="text-t2">({p.brandName})</span>}{on ? <Badge tone="danger">متوقف</Badge> : p.active ? <Badge tone="success">فعال</Badge> : <Badge>غیرفعال</Badge>}</span>}>
        <div className="space-y-3 text-12">
          <div className="grid grid-cols-2 gap-2">{SCOPES.map(([k, l]) => <div key={k} className={cx('rounded-lg border px-2.5 py-1.5', on && ps?.[k] ? 'border-danger/40 bg-danger-bg text-danger' : 'border-line')}><span className="block text-11 text-t2">{l.replace('توقف ', '').replace('بستن ', '')}</span><b>{on && ps?.[k] ? 'متوقف' : 'باز'}</b></div>)}</div>
          <p className="text-t2">موجودی این شریک: <b className="text-t1">{fa(unitsOf(p.id))}</b> عدد · انبار: {whs.map((w) => w.name).join('، ') || '—'}</p>
          {on && ps && <p className="rounded-lg bg-danger-bg/60 px-2.5 py-1.5 text-danger">توقف از {rel(ps.at)} توسط {ps.by}: {ps.why}{ps.until ? ` · تا ${new Date(ps.until).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}` : ' · تا اطلاع بعدی'}</p>}
          <div className="flex flex-wrap gap-2">
            {on ? <Button variant="primary" icon={<Play size={14} />} onClick={() => resume(p.id)}>ازسرگیری همه</Button> : <Button variant="danger" icon={<OctagonPause size={14} />} disabled={!isChief()} title={isChief() ? '' : 'فقط مدیر کل'} onClick={() => setPause(p.id)}>توقف فوری</Button>}
            {whs.map((w) => <Button key={w.id} icon={<Truck size={14} />} disabled={!isChief()} onClick={() => setMove(w.id)}>انتقال همهٔ موجودی {w.name} به تهران</Button>)}
          </div>
        </div>
      </Card> })}</div>
    <Card title="انبارها" pad={false}><ul className="divide-y divide-line">{s.warehouses.map((w) => { const on = live(w.pause); const units = s.lots.filter((l) => l.warehouse === w.id && l.qty > 0).reduce((a, l) => a + l.qty, 0)
      return <li key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-12"><b className="text-13">{w.name}</b><PartyChip s={s} id={w.operator} />{!w.active ? <Badge>بسته</Badge> : on ? <Badge tone="danger">ارسال متوقف</Badge> : <Badge tone="success">باز</Badge>}<span className="text-t2">{fa(units)} عدد موجودی</span>
        <span className="mr-auto flex gap-2">{on ? <Button size="sm" icon={<Play size={13} />} onClick={() => { mutate((x) => { x.stock.warehouses.find((q) => q.id === w.id)!.pause = undefined; new Set(x.stock.lots.filter((l) => l.warehouse === w.id).map((l) => l.productId)).forEach((id) => syncQty(x, id)) }, { action: 'بازگشایی ارسال انبار', target: w.name }); toast(`${w.name} دوباره ارسال می‌کند.`) }}>بازگشایی</Button>
          : <Button size="sm" variant="ghost" icon={<OctagonPause size={13} />} disabled={!isChief()} onClick={() => { mutate((x) => { x.stock.warehouses.find((q) => q.id === w.id)!.pause = { at: now(), by: me(), why: 'توقف دستی ارسال انبار', sell: false, ship: true, sync: false, login: false }; new Set(x.stock.lots.filter((l) => l.warehouse === w.id).map((l) => l.productId)).forEach((id) => syncQty(x, id)) }, { action: 'توقف ارسال انبار', target: w.name }); toast(`ارسال از ${w.name} متوقف شد؛ موجودی‌اش در سایت ناموجود حساب می‌شود.`) }}>توقف ارسال</Button>}
          {w.id !== 'tehran' && <Button size="sm" variant="ghost" icon={<Truck size={13} />} disabled={!isChief() || !units} onClick={() => setMove(w.id)}>انتقال همه به تهران</Button>}</span></li> })}</ul></Card>
    {pause && <PauseModal pid={pause} onClose={() => setPause(null)} />}
    {move && <MoveAll wh={move} onClose={() => setMove(null)} />}
  </div>
}

function PauseModal({ pid, onClose }: { pid: string; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const p = s.parties.find((q) => q.id === pid)!
  const [sc, setSc] = useState({ sell: true, ship: true, sync: true, login: false }); const [why, setWhy] = useState(''); const [until, setUntil] = useState<'none' | '24' | '72' | '168'>('none')
  const units = s.lots.filter((l) => l.owner === pid && l.qty > 0).reduce((a, l) => a + l.qty, 0)
  const value = s.lots.filter((l) => l.owner === pid && l.qty > 0).reduce((a, l) => a + l.qty * l.cost, 0)
  const openShips = d.orders.flatMap((o) => o.shipments).filter((x) => s.warehouses.find((w) => w.id === x.warehouse)?.operator === pid && ['ship.pending', 'ship.picking', 'ship.partner_confirm', 'ship.packed'].includes(x.status)).length
  const go = () => { if (!why.trim()) return toast('دلیل توقف را بنویسید؛ در سوابق می‌ماند.', { tone: 'err' })
    const ps: PauseState = { at: now(), by: me(), why: why.trim(), until: until === 'none' ? undefined : new Date(Date.now() + +until * 36e5).toISOString(), ...sc }
    mutate((x) => { const q = x.stock.parties.find((y) => y.id === pid)!; q.pause = ps
      if (sc.ship) x.stock.warehouses.filter((w) => w.operator === pid).forEach((w) => { w.pause = { ...ps, sell: false, sync: false, login: false } })
      if (sc.sync) x.stock.ext.filter((e) => e.partyId === pid).forEach((e) => { e.paused = true })
      if (sc.login) { const m = x.team.find((u) => u.id === q.userId) as { disabled?: boolean; status: string } | undefined; if (m) { m.disabled = true; m.status = 'غیرفعال' } }
      new Set(x.stock.lots.filter((l) => l.owner === pid || x.stock.warehouses.find((w) => w.id === l.warehouse)?.operator === pid).map((l) => l.productId)).forEach((id) => syncQty(x, id)) },
    { action: 'توقف فوری شریک', target: p.name, after: `${SCOPES.filter(([k]) => sc[k]).map(([, l]) => l).join('، ')} · ${why.trim()}` })
    notify(`توقف فوری ${p.name}`, `${SCOPES.filter(([k]) => sc[k]).map(([, l]) => l).join('، ')}. دلیل: ${why.trim()}`, '/admin/inbound?tab=control', 'عملیات', 'danger')
    toast(`${p.name} متوقف شد؛ هر وقت بخواهید «ازسرگیری همه» را بزنید.`); onClose() }
  return <Modal open onClose={onClose} title={`توقف فوری ${p.name}${p.brandName ? ` (${p.brandName})` : ''}`} footer={<><Button variant="danger" icon={<OctagonPause size={14} />} onClick={go}>توقف همین حالا</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3 text-12">
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-neutral-bg p-2"><b className="block text-16">{fa(units)}</b>عدد موجودی</div><div className="rounded-lg bg-neutral-bg p-2"><b className="block text-14">{toman(value)}</b>ارزش موجودی</div><div className="rounded-lg bg-neutral-bg p-2"><b className="block text-16">{fa(openShips)}</b>مرسولهٔ باز از انبارش</div></div>
      <div className="space-y-2">{SCOPES.map(([k, l, desc]) => <div key={k} className="rounded-lg border border-line p-2.5"><Toggle on={sc[k]} onChange={(v) => setSc({ ...sc, [k]: v })} text={l} /><p className="mt-1 pr-11 text-11 text-t2">{desc}</p></div>)}</div>
      <Field label="تا کی"><Segmented value={until} onChange={setUntil} options={[['none', 'تا اطلاع بعدی'], ['24', '۲۴ ساعت'], ['72', '۳ روز'], ['168', 'یک هفته']]} /></Field>
      <Field label="دلیل (در لاگ ممیزی می‌ماند)"><Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="مثلاً یاسین تا آخر هفته در سفر است" /></Field>
      {openShips > 0 && sc.ship && <p className="rounded-lg bg-warning-bg px-3 py-2 text-warning">{fa(openShips)} مرسولهٔ باز از انبار او هست؛ از «سفارش‌ها ← فیلتر انبار مهاباد» آن‌ها را به تهران منتقل کنید یا منتظر بمانید.</p>}
    </div>
  </Modal>
}

/** انتقال همهٔ موجودی یک انبار به تهران: با حوالهٔ اسکنی (پیشنهادی) یا انتقال دفتری فوری */
function MoveAll({ wh, onClose }: { wh: string; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [owner, setOwner] = useState(''); const [how, setHow] = useState<'scan' | 'book'>('scan')
  const lines = linesFromStock(d, wh, owner || undefined); const units = lines.reduce((a, l) => a + l.qty, 0)
  const go = () => { const id = mid('HV'); const by = me()
    mutate((x) => { x.stock.manifests = x.stock.manifests ?? []
      const m = { id, from: wh, to: 'tehran', status: 'draft' as const, createdAt: now(), by, reason: `انتقال همهٔ موجودی ${whName(s, wh)}${owner ? ` (کالای ${s.parties.find((p) => p.id === owner)?.name})` : ''} به تهران`, lines: lines.map((l) => ({ ...l, packed: 0, received: 0 })), issues: [], events: [{ at: now(), by, text: 'ساخت حوالهٔ انتقال همهٔ موجودی' }] }
      x.stock.manifests.unshift(m)
      if (how === 'book') { const M = x.stock.manifests[0]; M.lines.forEach((l) => { l.packed = l.qty; l.received = l.qty })
        M.lines.forEach((l) => { if (!l.productId) return; let left = l.qty; x.stock.lots.filter((q) => q.productId === l.productId && (q.variationId ?? '') === (l.variationId ?? '') && q.owner === l.owner && q.warehouse === wh && q.qty > 0).forEach((q) => { if (!left) return; const t = Math.min(q.qty, left); q.qty -= t; left -= t; x.stock.lots.unshift({ ...q, id: mid('L') + q.id, warehouse: 'tehran', qty: t, qty0: t, at: now(), ref: `حوالهٔ ${id} (انتقال فوری)` }) }) })
        M.status = 'received'; M.sentAt = now(); M.sentBy = by; M.receivedAt = now(); M.receivedBy = by; M.events.push({ at: now(), by, text: 'انتقال دفتری فوری بدون اسکن؛ کالا باید فیزیکی هم ارسال شود' })
        new Set(M.lines.map((l) => l.productId).filter(Boolean) as string[]).forEach((pid) => syncQty(x, pid)) } },
    { action: how === 'book' ? 'انتقال فوری همهٔ موجودی به تهران' : 'ساخت حوالهٔ انتقال همهٔ موجودی', target: `${whName(s, wh)} ← تهران`, after: `${units} عدد · ${id}` })
    toast(how === 'book' ? `${fa(units)} عدد همین حالا در دفاتر به انبار تهران رفت؛ حوالهٔ ${id} برای پیگیری ارسال فیزیکی ثبت شد.` : `حوالهٔ ${id} با ${fa(units)} عدد ساخته شد؛ ${whName(s, wh)} با اسکن جمع و ارسال می‌کند.`); onClose() }
  return <Modal open onClose={onClose} title={<span className="flex items-center gap-2">انتقال همهٔ موجودی {whName(s, wh)}<ArrowLeft size={15} />انبار تهران</span>} footer={<><Button variant="primary" disabled={!units} onClick={go}>{how === 'book' ? 'انتقال فوری' : 'ساخت حواله'} ({fa(units)} عدد)</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-3 text-12">
      <Field label="کدام کالاها"><Select value={owner} onChange={setOwner} options={[['', 'همهٔ موجودی این انبار'], ...s.parties.map((p) => [p.id, `فقط کالای ${p.name}`] as [string, string])]} other={false} /></Field>
      <Field label="روش"><Segmented value={how} onChange={setHow} options={[['scan', 'حوالهٔ اسکنی (پیشنهادی)'], ['book', 'انتقال دفتری فوری']]} /></Field>
      <p className="rounded-lg bg-neutral-bg px-3 py-2 text-t2">{how === 'scan' ? 'حواله ساخته می‌شود؛ انبار مبدأ با اسکن جمع و ارسال می‌کند و تهران با اسکن تحویل می‌گیرد. موجودی تا تحویل در مبدأ می‌ماند.' : 'موجودی همین حالا در دفاتر به تهران می‌رود (مالک و بها ثابت می‌ماند) و از مبدأ قابل فروش نیست. برای وقتی که شریک در دسترس نیست؛ ارسال فیزیکی را جدا پیگیری کنید.'}</p>
      <p>{fa(lines.length)} قلم · <b>{fa(units)}</b> عدد · مالکیت هیچ کالایی عوض نمی‌شود.</p>
    </div>
  </Modal>
}
