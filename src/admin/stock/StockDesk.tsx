import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Lock, Minus, PackagePlus, Pencil, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { MoneyInput } from '@/shared/ui/money'
import { can, canSecret, currentUser, mutate, myParty, notify, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import type { AdjustKind } from '@/shared/data/stock'
import { adjustStock, expired, OPEN_SHIP, reserved } from '@/shared/data/ledger'
import { PartyChip, partyName, pv, whName } from './common'

const KIND: [AdjustKind, string, string][] = [
  ['sale', 'فروختم (حضوری یا خارج از سایت)', 'از موجودی کم و فروش با قیمت ثبت می‌شود؛ سهم‌ها در تسویه می‌آید'],
  ['hold', 'کنار گذاشتم؛ فعلاً نمی‌فروشم', 'از موجودی سایت برداشته می‌شود ولی مال همان مالک و در همین انبار می‌ماند'],
  ['release', 'برگرداندن به فروش', 'کالای کنار گذاشته دوباره روی سایت قابل فروش می‌شود'],
  ['count', 'اصلاح شمارش', 'شمارش واقعی با پنل فرق داشت؛ مثبت یا منفی، با دلیل'],
  ['intake', 'ورود تازه', 'کالای تازه برای همین مالک در همین انبار'],
  ['loss', 'خراب یا مفقود', 'از موجودی کم می‌شود و در گردش کالا با دلیل می‌ماند'],
]
const KLABEL = Object.fromEntries(KIND.map(([k, l]) => [k, l])) as Record<AdjustKind, string>

/** چه کسی می‌تواند موجودی یک انبار را تغییر دهد: کارکنان غنیمت همهٔ انبارها؛ شریک فقط انبارهایی که خودش می‌گرداند (کالا دست خودش است)، چه مال خودش باشد چه مال غنیمت */
export const canEditWh = (d: DB, wh: string) => { const me = myParty(); return me === 'gh' || d.stock.warehouses.find((w) => w.id === wh)?.operator === me }

type Cell = { pid: string; vid?: string; owner: string; wh: string }
const sum = (d: DB, c: Cell, hold: boolean) => d.stock.lots.filter((l) => l.productId === c.pid && (l.variationId ?? '') === (c.vid ?? '') && l.owner === c.owner && l.warehouse === c.wh && l.qty > 0 && (hold ? l.hold || expired(l) : !l.hold && !expired(l))).reduce((a, l) => a + l.qty, 0)

/** میز موجودی: موجودی هر کالا × تنوع × انبار × مالک، با تغییر آنی (فروش حضوری، کنار گذاشتن، اصلاح، ورود، خرابی) */
export function StockDesk({ onIntake }: { onIntake?: () => void }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const me = myParty()
  const mine = s.warehouses.filter((w) => w.active && w.operator === me).map((w) => w.id)
  const [wh, setWh] = useState(me !== 'gh' && mine.length ? mine[0] : 'all'); const [owner, setOwner] = useState('all'); const [q, setQ] = useState(''); const [low, setLow] = useState(false); const [cell, setCell] = useState<Cell | null>(null)
  const whs = s.warehouses.filter((w) => w.active && (wh === 'all' || w.id === wh))
  const rows = useMemo(() => {
    const keys = new Map<string, { pid: string; vid?: string }>(); s.lots.forEach((l) => { const k = `${l.productId}|${l.variationId ?? ''}`; if (!keys.has(k)) keys.set(k, { pid: l.productId, vid: l.variationId }) })
    return [...keys.values()].map((r) => ({ ...r, name: pv(d, r.pid, r.vid).full })).filter((r) => (!q.trim() || r.name.includes(q.trim())) && (owner === 'all' || s.lots.some((l) => l.productId === r.pid && (l.variationId ?? '') === (r.vid ?? '') && l.owner === owner)))
      .filter((r) => !low || whs.some((w) => s.parties.some((p) => { const n = sum(d, { ...r, owner: p.id, wh: w.id }, false); return n > 0 && n <= 2 }) || s.lots.some((l) => l.productId === r.pid && (l.variationId ?? '') === (r.vid ?? '') && l.warehouse === w.id) && sum(d, { ...r, owner: owner === 'all' ? me : owner, wh: w.id }, false) === 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
  }, [d, q, owner, low, wh]) // eslint-disable-line react-hooks/exhaustive-deps
  const recent = (s.adjusts ?? []).slice(0, 6)
  const edit0 = can('catalog')
  // سفارش‌های باز بیش از موجودی زندهٔ یک انبار رزرو کرده‌اند: این سفارش‌ها بدون تأمین یا انتقال ارسال نمی‌شوند
  const over = (() => { const L: { pid: string; vid?: string; wh: string; live: number; res: number }[] = []; const seen = new Set<string>()
    s.lots.forEach((l) => { const k = `${l.productId}|${l.variationId ?? ''}|${l.warehouse}`; if (seen.has(k)) return; seen.add(k)
      const live = s.lots.filter((q) => q.productId === l.productId && (q.variationId ?? '') === (l.variationId ?? '') && q.warehouse === l.warehouse && q.qty > 0 && !q.hold && !expired(q)).reduce((a, q) => a + q.qty, 0)
      const res = reserved(d, l.productId, l.variationId, l.warehouse); if (res > live) L.push({ pid: l.productId, vid: l.variationId, wh: l.warehouse, live, res }) })
    return L })()
  /** سفارش‌های باز این کالا در این انبار (همان‌هایی که موجودی را رزرو کرده‌اند) */
  const waiting = (pid: string, vid: string | undefined, w: string) => d.orders.filter((o) => o.shipments.some((sh) => sh.warehouse === w && OPEN_SHIP.includes(sh.status) && sh.items.some((it) => !it.cancelled && it.productId === pid && (vid === undefined || (it.variationId ?? '') === (vid ?? '')))))
  const elsewhere = (pid: string, vid: string | undefined, w: string) => s.warehouses.filter((x) => x.id !== w && x.active).map((x) => ({ w: x, n: s.lots.filter((q) => q.productId === pid && (q.variationId ?? '') === (vid ?? '') && q.warehouse === x.id && q.qty > 0 && !q.hold && !expired(q)).reduce((a, q) => a + q.qty, 0) })).filter((x) => x.n > 0)
  return <>{over.length > 0 && <div role="alert" className="mb-3 overflow-hidden rounded-2xl border border-warning/40 bg-surface">
    <div className="flex flex-wrap items-center gap-2 bg-warning-bg px-4 py-2.5 text-warning"><AlertTriangle size={16} /><b className="text-13">کالا برای سفارش‌های ثبت‌شده کم است</b><span className="text-12">سفارش‌هایی که هنوز ارسال نشده‌اند، از این کالاها بیشتر از موجودی همان انبار خواسته‌اند. تا کمبود جبران نشود، این سفارش‌ها قابل بسته‌بندی کامل نیستند.</span></div>
    <ul className="divide-y divide-line">{over.map((x) => { const O = waiting(x.pid, x.vid, x.wh); const E = elsewhere(x.pid, x.vid, x.wh); const lack = x.res - x.live
      return <li key={`${x.pid}${x.vid}${x.wh}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-12">
        <span className="min-w-48 flex-1"><b className="block text-13">{pv(d, x.pid, x.vid).full}</b><span className="text-t2">{whName(s, x.wh)}: سفارش‌ها {fa(x.res)} عدد خواسته‌اند، {fa(x.live)} عدد در انبار است</span></span>
        <span className="rounded-full bg-danger-bg px-2.5 py-1 font-semibold text-danger">{fa(lack)} عدد کم</span>
        <span className="flex flex-wrap gap-1">{O.slice(0, 4).map((o) => <button key={o.id} type="button" onClick={() => nav(`/admin/orders/${o.id}`)} className="rounded-md bg-neutral-bg px-2 py-0.5 font-mono text-11 hover:text-brand"><bdi dir="ltr">{o.id}</bdi></button>)}{O.length > 4 && <span className="text-t3">+{fa(O.length - 4)}</span>}</span>
        <span className="flex flex-wrap gap-1.5">
          {E.length > 0 && <Button size="sm" variant="primary" onClick={() => nav('/admin/inbound?tab=manifests')} title={E.map((e) => `${e.w.name}: ${e.n} عدد`).join('، ')}>حواله از {E[0].w.name} ({fa(E[0].n)} عدد)</Button>}
          <Button size="sm" onClick={() => setCell({ pid: x.pid, vid: x.vid, owner: s.lots.find((l) => l.productId === x.pid && l.warehouse === x.wh)?.owner ?? 'gh', wh: x.wh })}>اصلاح موجودی</Button>
          {O[0] && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/orders/${O[0].id}`)}>{O.length > 1 ? 'دیدن سفارش‌ها' : 'دیدن سفارش'}</Button>}
        </span>
      </li> })}</ul>
    <p className="border-t border-line px-4 py-2 text-11 text-t3">سه راه: از انبار دیگر حواله بزنید، اگر شمارش اشتباه بوده موجودی را اصلاح کنید، یا در صفحهٔ سفارش آن را به «تصمیم مشتری» (صبر، جایگزین یا لغو) بفرستید.</p>
  </div>}
  <Card pad={false} title={<span className="flex items-center gap-1.5"><SlidersHorizontal size={15} />میز موجودی: تغییر آنی موجودی هر مالک در هر انبار</span>}
    hint="روی هر عدد بزنید: فروش حضوری، کنار گذاشتن از فروش، برگرداندن، اصلاح شمارش، ورود تازه یا خرابی. موجودی سایت همان لحظه به‌روز می‌شود."
    actions={<div className="flex flex-wrap gap-2"><Button size="sm" icon={<PackagePlus size={13} />} onClick={() => onIntake ? onIntake() : nav('/admin/ownership?tab=stock&intake=1')}>افزودن کالا به موجودی</Button><Button size="sm" variant="ghost" onClick={() => nav('/admin/catalog/new')}>کالای تازه در کاتالوگ</Button></div>}>
    <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
      <label className="text-12"><span className="mb-1 block text-t2">انبار</span><Select className="w-44" value={wh} onChange={setWh} options={[['all', 'همهٔ انبارها'], ...s.warehouses.filter((w) => w.active).map((w) => [w.id, `${w.name}${w.operator === me && me !== 'gh' ? ' (من)' : ''}`] as [string, string])]} /></label>
      <label className="text-12"><span className="mb-1 block text-t2">مالک</span><Select className="w-40" value={owner} onChange={setOwner} options={[['all', 'همهٔ مالک‌ها'], ...s.parties.filter((p) => p.active).map((p) => [p.id, p.name] as [string, string])]} /></label>
      <label className="relative text-12"><span className="mb-1 block text-t2">جست‌وجوی کالا</span><Search size={14} className="pointer-events-none absolute right-2.5 top-[30px] text-t3" /><Input className="w-56 pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام کالا یا رنگ" /></label>
      <Segmented value={low ? 'low' : 'all'} onChange={(v) => setLow(v === 'low')} options={[['all', 'همه'], ['low', 'کم یا تمام‌شده']]} />
      {me !== 'gh' && <p className="flex items-center gap-1 text-11 text-t2"><Lock size={12} />شما موجودی انبارهای خودتان را تغییر می‌دهید (هم کالای خودتان و هم کالای غنیمت که دست شماست)؛ بقیه فقط خواندنی است.</p>}
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-13">
      <thead><tr className="border-b border-line text-right text-12 text-t2"><th className="px-4 py-2.5 font-medium">کالا و تنوع</th>{whs.map((w) => <th key={w.id} className="px-3 py-2.5 font-medium">{w.name}<span className="block text-[10px] font-normal">گرداننده: {partyName(s, w.operator)}{canEditWh(d, w.id) ? '' : ' · فقط خواندنی'}</span></th>)}<th className="px-3 py-2.5 font-medium">روی سایت</th></tr></thead>
      <tbody>{rows.map((r) => { const P = d.products.find((p) => p.id === r.pid); const site = P?.variations?.length ? P.variations.find((v) => v.id === r.vid)?.qty : P?.qty; return <tr key={r.pid + (r.vid ?? '')} className="border-b border-line align-top last:border-0">
        <td className="px-4 py-3"><button type="button" onClick={() => nav(`/admin/catalog/${r.pid}`)} className="text-right font-medium hover:text-brand hover:underline">{pv(d, r.pid, r.vid).name}</button>{pv(d, r.pid, r.vid).vname && <p className="text-12 text-t2">{pv(d, r.pid, r.vid).vname}</p>}
          <p className="mt-1 flex flex-wrap gap-1.5"><button type="button" onClick={() => nav(`/admin/catalog/${r.pid}`)} className="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-11 text-t2 hover:border-brand hover:text-brand"><ExternalLink size={11} />صفحهٔ کالا</button>{edit0 && <button type="button" onClick={() => nav(`/admin/catalog/${r.pid}/edit?step=5`)} className="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-11 text-t2 hover:border-brand hover:text-brand"><Pencil size={11} />ویرایش کالا</button>}</p></td>
        {whs.map((w) => { const owners = s.parties.filter((p) => (owner === 'all' || p.id === owner) && s.lots.some((l) => l.productId === r.pid && (l.variationId ?? '') === (r.vid ?? '') && l.owner === p.id && l.warehouse === w.id)); const edit = canEditWh(d, w.id)
          return <td key={w.id} className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{owners.map((p) => { const c = { pid: r.pid, vid: r.vid, owner: p.id, wh: w.id }; const n = sum(d, c, false); const h = sum(d, c, true)
            return <button key={p.id} type="button" disabled={!edit} onClick={() => setCell(c)} title={edit ? 'تغییر موجودی' : 'فقط خواندنی؛ این انبار دست شما نیست'} className={cx('inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-12 transition-colors', edit ? 'border-line hover:border-brand hover:bg-brand-tint/40' : 'cursor-not-allowed border-line/60 opacity-70', n === 0 && 'border-danger/40 bg-danger-bg/30')}>
              <PartyChip s={s} id={p.id} /><b className={cx('font-mono text-14', n === 0 && 'text-danger')}>{fa(n)}</b>{h > 0 && <span className="text-[11px] text-warning">+{fa(h)} کنار</span>}{edit && <Plus size={12} className="text-t3" />}</button> })}
            {!owners.length && <span className="text-t3">—</span>}
            {edit && <button type="button" aria-label={`افزودن مالک دیگر در ${w.name}`} title="این کالا را برای مالک دیگری در این انبار ثبت کن" onClick={() => setCell({ pid: r.pid, vid: r.vid, owner: s.parties.find((p) => p.active && !owners.some((o) => o.id === p.id))?.id ?? me, wh: w.id })} className="grid size-7 place-items-center rounded-lg border border-dashed border-line text-t3 hover:border-brand hover:text-brand"><Plus size={13} /></button>}</div></td> })}
        <td className="px-3 py-3 text-12"><span className="font-mono">{fa((site?.tehran ?? 0) + (site?.mahabad ?? 0))}</span><span className="block text-[11px] text-t3">تهران {fa(site?.tehran ?? 0)} · مهاباد {fa(site?.mahabad ?? 0)}</span></td>
      </tr> })}</tbody>
    </table>{rows.length === 0 && <p className="p-5 text-12 text-t2">کالایی با این فیلترها نیست.</p>}</div>
    {recent.length > 0 && <div className="border-t border-line p-4"><p className="mb-2 text-12 font-semibold">آخرین تغییرهای دستی</p><ul className="space-y-1 text-12">{recent.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-1.5"><Badge tone={a.delta < 0 ? 'warning' : 'success'} dot={false}>{KLABEL[a.kind]}</Badge><span>{pv(d, a.productId, a.variationId).full}</span><span className="font-mono">{a.delta > 0 ? '+' : '−'}{fa(Math.abs(a.delta))}</span><PartyChip s={s} id={a.owner} /><span className="text-t2">در {whName(s, a.warehouse)} · {a.by} · {rel(a.at)}{a.note ? ` · ${a.note}` : ''}</span></li>)}</ul></div>}
    <CellEditor c={cell} onClose={() => setCell(null)} />
  </Card></>
}

function CellEditor({ c, onClose }: { c: Cell | null; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const [kind, setKind] = useState<AdjustKind>('sale'); const [qty, setQty] = useState(1); const [sign, setSign] = useState<1 | -1>(-1); const [price, setPrice] = useState(0); const [cost, setCost] = useState(0); const [note, setNote] = useState(''); const [owner, setOwner] = useState('')
  const [lastKey, setLastKey] = useState('')
  const key = c ? `${c.pid}|${c.vid}|${c.owner}|${c.wh}` : ''
  if (c && key !== lastKey) { setLastKey(key); setOwner(c.owner); setKind('sale'); setQty(1); setSign(-1); setNote(''); const P = d.products.find((p) => p.id === c.pid); const v = P?.variations?.find((x) => x.id === c.vid); setPrice(v?.price ?? P?.price ?? P?.priceNew ?? 0); setCost([...s.lots].reverse().find((l) => l.productId === c.pid && l.owner === c.owner)?.cost ?? P?.cost ?? 0) }
  if (!c) return null
  const cc = { ...c, owner: owner || c.owner }; const live = sum(d, cc, false); const held = sum(d, cc, true); const res = reserved(d, c.pid, c.vid, c.wh)
  const op = s.warehouses.find((w) => w.id === c.wh)?.operator ?? 'gh'; const ch = s.channels.find((x) => x.active && x.seller === op && x.collector === op && /حضوری/.test(x.name))?.id ?? s.channels.find((x) => x.seller === op)?.id ?? 'gh-store'
  const after = kind === 'sale' || kind === 'hold' || kind === 'loss' ? live - qty : kind === 'count' ? live + sign * qty : kind === 'release' ? live + qty : live + qty
  const afterHold = kind === 'hold' ? held + qty : kind === 'release' ? held - qty : held
  const bad = after < 0 || afterHold < 0 || !qty || (kind === 'sale' && !price) || ((kind === 'count' || kind === 'loss') && !note.trim())
  const apply = () => { const me = currentUser()?.name ?? 'پنل'; let msg = ''
    mutate((x) => { const r = adjustStock(x, { productId: c.pid, variationId: c.vid, owner: cc.owner, warehouse: c.wh, kind, qty: kind === 'count' ? sign * qty : qty, price, cost, note: note.trim() || undefined, by: me, channel: ch }); if (!r.ok) msg = r.msg ?? '' }, { action: `میز موجودی: ${KLABEL[kind]}`, target: `${pv(d, c.pid, c.vid).full} · ${partyName(s, cc.owner)} · ${whName(s, c.wh)}`, after: `${kind === 'count' && sign < 0 ? '−' : kind === 'sale' || kind === 'hold' || kind === 'loss' ? '−' : '+'}${qty}` })
    if (msg) return toast(msg, { tone: 'err' })
    if (cc.owner !== myParty()) notify(`${me} موجودی ${partyName(s, cc.owner)} را تغییر داد`, `${KLABEL[kind]} · ${pv(d, c.pid, c.vid).full} · ${fa(qty)} عدد در ${whName(s, c.wh)}${note ? ` · ${note}` : ''}`, '/admin/ownership?tab=stock', 'انبار', 'info')
    toast(`${KLABEL[kind]} ثبت شد؛ موجودی سایت همین لحظه به‌روز شد.`); onClose() }
  return <Modal open onClose={onClose} title={<span className="flex flex-wrap items-center gap-2">تغییر موجودی · {pv(d, c.pid, c.vid).full}</span>} wide footer={<><Button variant="primary" disabled={bad} onClick={apply}>اعمال همین الان</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-bg p-3 text-12"><span>انبار: <b>{whName(s, c.wh)}</b></span><span className="flex items-center gap-1.5">مالک: <Select className="w-36" value={cc.owner} onChange={setOwner} options={s.parties.filter((p) => p.active).map((p) => [p.id, p.name] as [string, string])} /></span><span>قابل فروش: <b className="font-mono">{fa(live)}</b></span><span>کنار گذاشته یا منقضی: <b className="font-mono">{fa(held)}</b></span>{res > 0 && <span className="text-warning">رزرو سفارش‌های باز این انبار: {fa(res)}</span>}</div>
      <div className="grid gap-2 sm:grid-cols-2">{KIND.map(([k, l, h]) => <button key={k} type="button" onClick={() => setKind(k)} className={cx('rounded-xl border p-2.5 text-right transition-colors', kind === k ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand/40')}><b className={cx('block text-13', kind === k && 'text-brand')}>{l}</b><span className="text-11 text-t2">{h}</span></button>)}</div>
      <div className="flex flex-wrap items-end gap-3">
        {kind === 'count' && <Segmented value={sign > 0 ? 'p' : 'm'} onChange={(v) => setSign(v === 'p' ? 1 : -1)} options={[['m', 'کمتر از پنل'], ['p', 'بیشتر از پنل']]} />}
        <Field label="تعداد"><div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="یکی کمتر" icon={<Minus size={14} />} onClick={() => setQty(Math.max(1, qty - 1))} /><Input type="number" min={1} className="ltr w-20 text-center font-mono" value={qty} onChange={(e) => setQty(Math.max(0, +e.target.value))} /><Button size="sm" variant="ghost" aria-label="یکی بیشتر" icon={<Plus size={14} />} onClick={() => setQty(qty + 1)} /></div></Field>
        {kind === 'sale' && <Field label="قیمت فروش هر عدد (تومان)"><MoneyInput value={price} onChange={setPrice} aria-label="قیمت فروش هر عدد" /></Field>}
        {kind === 'intake' && canSecret() && <Field label="بهای تمام‌شدهٔ هر عدد (تومان)"><MoneyInput value={cost} onChange={setCost} aria-label="بهای تمام‌شده" /></Field>}
        <Field label={kind === 'count' || kind === 'loss' ? 'دلیل (اجباری)' : 'توضیح (اختیاری)'}><Input className="w-64" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'sale' ? 'مثلاً فروش در مغازه به آقای کریمی' : kind === 'hold' ? 'مثلاً برای مشتری حضوری نگه داشتم' : kind === 'loss' ? 'مثلاً جعبه در حمل له شد' : ''} /></Field>
      </div>
      <p className={cx('rounded-lg px-3 py-2 text-12', after < 0 || afterHold < 0 ? 'bg-danger-bg text-danger' : 'bg-info-bg text-info')}>{after < 0 || afterHold < 0 ? 'این تعداد بیشتر از موجودی است.' : <>بعد از اعمال: قابل فروش <b>{fa(after)}</b>{afterHold ? ` · کنار گذاشته ${fa(afterHold)}` : ''}{kind === 'sale' ? ` · فروش ${toman(price * qty)} در ${s.channels.find((x) => x.id === ch)?.name ?? 'فروش حضوری'}` : ''}. موجودی سایت و سایت شریک (اگر وصل است) همان لحظه به‌روز می‌شود و در «گردش و کارت کالا» با نام شما می‌ماند.</>}</p>
    </div>
  </Modal>
}
