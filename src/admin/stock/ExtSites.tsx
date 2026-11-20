import { useState } from 'react'
import { MoneyInput } from '@/shared/ui/money'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CircleAlert, Globe, Link2, RefreshCw, ScanLine, ShoppingBag, Store, Trash2, Webhook } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, Toggle } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { currentUser, fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import type { ExtOrder, ExtSite } from '@/shared/data/stock'
import { reserved, syncQty, takeLots } from '@/shared/data/ledger'
import { chName, PartyChip, partyName, pv, whName } from './common'
import { resolveCode } from './Packing'

const by = () => currentUser()?.name ?? 'پنل'
const uid = (p: string) => `${p}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`

/** مالک کالای فروخته‌شده در سایت یا مغازهٔ شریک: اول موجودی خود فروشنده، بعد موجودی بقیه در انبارهای همان شریک */
export function detectOwner(d: DB, seller: string, pid: string, vid: string | undefined, qty: number) {
  const whs = d.stock.warehouses.filter((w) => w.operator === seller && w.active).map((w) => w.id)
  const L = d.stock.lots.filter((l) => l.productId === pid && (l.variationId ?? '') === (vid ?? '') && whs.includes(l.warehouse) && l.qty > 0 && !l.hold)
  const have = (o: string, wh: string) => L.filter((l) => l.owner === o && l.warehouse === wh).reduce((a, l) => a + l.qty, 0) - (o === seller ? 0 : 0)
  for (const wh of whs) { if (have(seller, wh) >= qty) return { owner: seller, warehouse: wh, why: `از موجودی خود ${partyName(d.stock, seller)} در ${whName(d.stock, wh)}` } }
  for (const wh of whs) { const other = [...new Set(L.filter((l) => l.warehouse === wh && l.owner !== seller).map((l) => l.owner))].find((o) => have(o, wh) >= qty); if (other) return { owner: other, warehouse: wh, why: `${partyName(d.stock, seller)} از این کالا موجودی کافی نداشت؛ کالای ${partyName(d.stock, other)} در ${whName(d.stock, wh)} فروخته شده و سهمش حساب می‌شود` } }
  return { owner: seller, warehouse: whs[0] ?? 'tehran', why: 'موجودی ثبت‌شده‌ای پیدا نشد؛ به نام خود فروشنده ثبت می‌شود. موجودی را بررسی کنید.' }
}

export function ExtTab() {
  const d = useDB(); const s = d.stock
  return <div className="space-y-4">
    {s.ext.map((e) => <ExtCard key={e.partyId} e={e} />)}
    <StoreSale />
  </div>
}

function ExtCard({ e }: { e: ExtSite }) {
  const d = useDB(); const s = d.stock; const nav = useNavigate(); const [busy, setBusy] = useState(false); const [sku, setSku] = useState({ code: '', pid: 'prx', vid: 'var-prx-blk' })
  const party = s.parties.find((p) => p.id === e.partyId); const chId = s.channels.find((c) => c.seller === e.partyId && c.collector === e.partyId && c.brand !== 'غنیمت')?.id ?? 've1'
  const up = (f: (x: ExtSite) => void, action: string) => mutate((x) => { const y = x.stock.ext.find((z) => z.partyId === e.partyId); if (y) f(y) }, { action, target: `${party?.name ?? e.partyId} · ${e.url}` })
  const mapOf = (code: string) => e.skuMap[code]
  const lineInfo = (l: ExtOrder['lines'][number]) => { const m = mapOf(l.sku); if (!m) return null; return { m, det: detectOwner(d, e.partyId, m.productId, m.variationId, l.qty) } }
  const importOrder = (o: ExtOrder) => {
    if (o.lines.some((l) => !mapOf(l.sku))) return toast('اول SKUهای وصل‌نشده را به کالای غنیمت وصل کنید.', { tone: 'err' })
    mutate((x) => { const at = new Date().toISOString(); o.lines.forEach((l) => { const m = mapOf(l.sku)!; const det = detectOwner(x, e.partyId, m.productId, m.variationId, l.qty); const t = takeLots(x, { productId: m.productId, variationId: m.variationId, owner: det.owner, warehouse: det.warehouse }, l.qty)
      x.stock.sales.unshift({ id: uid('S'), at, productId: m.productId, variationId: m.variationId, owner: det.owner, warehouse: det.warehouse, channel: chId, qty: l.qty, price: l.price, cost: t.cost, by: `${by()} (از ${e.url})`, ext: o.id, code: l.sku, note: det.why }); syncQty(x, m.productId) })
      const y = x.stock.ext.find((z) => z.partyId === e.partyId)!.inbox.find((z) => z.id === o.id)!; y.status = 'imported'; y.importedAt = at }, { action: 'ثبت سفارش سایت شریک در دفتر', target: `${o.id} · ${e.url}` })
    toast(`سفارش ${o.id} ثبت شد؛ موجودی کم و سهم‌ها حساب شد.`)
  }
  const sync = async () => { setBusy(true); try { await fakeCall(true, 900)
    const keys = Object.keys(e.skuMap); const k = keys[Math.floor(Math.random() * keys.length)]
    up((y) => { y.lastSync = new Date().toISOString(); if (y.pullOrders && k) y.inbox.unshift({ id: `ve1-${5524 + y.inbox.length}`, at: new Date().toISOString(), status: 'new', customer: 'مشتری سایت', lines: [{ sku: k, name: k, qty: 1, price: 2750000 }] }) }, 'همگام‌سازی سایت شریک')
    toast(`همگام‌سازی انجام شد${e.pullOrders ? '؛ سفارش تازه به صندوق ورودی اضافه شد' : ''}.`) } catch { toast('سایت شریک پاسخ نداد. کلید API یا دسترسی سرور را بررسی کنید.', { tone: 'err' }) } finally { setBusy(false) } }
  const stockFor = (m: { productId: string; variationId?: string }) => { const whs = s.warehouses.filter((w) => w.operator === e.partyId && w.active).map((w) => w.id); return whs.reduce((a, wh) => a + Math.max(0, s.lots.filter((l) => l.productId === m.productId && (l.variationId ?? '') === (m.variationId ?? '') && l.warehouse === wh && !l.hold).reduce((b, l) => b + l.qty, 0) - reserved(d, m.productId, m.variationId, wh)), 0) }
  const newCount = e.inbox.filter((o) => o.status !== 'imported' && o.status !== 'skipped').length
  return <Card title={<span className="flex flex-wrap items-center gap-2"><Globe size={15} />اتصال ووکامرس <bdi dir="ltr" className="font-mono text-13">{e.url}</bdi>{party && <PartyChip s={s} id={party.id} />}{e.on ? <Badge tone="success">متصل</Badge> : <Badge tone="danger">قطع</Badge>}</span>}
    hint="سایت شریک با REST API و وب‌هوک ووکامرس وصل می‌شود: هر سفارش آن‌جا خودکار این‌جا می‌آید، کالایش با SKU شناخته می‌شود و مالک (کالای خودش یا کالای غنیمت) تشخیص داده می‌شود."
    actions={<div className="flex gap-2"><Button size="sm" icon={<RefreshCw size={13} />} loading={busy} onClick={() => void sync()}>همگام‌سازی همین حالا</Button><Toggle on={e.on} onChange={(v) => up((y) => { y.on = v }, v ? 'وصل کردن سایت شریک' : 'قطع اتصال سایت شریک')} text={e.on ? 'روشن' : 'خاموش'} /></div>}>
    <div className="grid gap-3 lg:grid-cols-3">
      <Field label="نشانی سایت"><Input className="ltr text-left" value={e.url} onChange={(v) => up((y) => { y.url = v.target.value }, 'تغییر نشانی سایت شریک')} /></Field>
      <Field label="Consumer Key" help="از ووکامرس ← تنظیمات ← پیشرفته ← REST API با دسترسی خواندن و نوشتن"><Input className="ltr text-left font-mono" value={e.key} onChange={(v) => up((y) => { y.key = v.target.value }, 'تغییر کلید API سایت شریک')} /></Field>
      <Field label="Consumer Secret"><Input type="password" className="ltr text-left font-mono" value={e.secret} onChange={(v) => up((y) => { y.secret = v.target.value }, 'تغییر رمز API سایت شریک')} /></Field>
    </div>
    <div className="mt-3 flex flex-wrap gap-4 text-12">
      <Toggle on={e.pullOrders} onChange={(v) => up((y) => { y.pullOrders = v }, 'تغییر دریافت سفارش سایت شریک')} text="سفارش‌های سایت او خودکار این‌جا بیاید" />
      <Toggle on={e.pushStock} onChange={(v) => up((y) => { y.pushStock = v }, 'تغییر ارسال موجودی به سایت شریک')} text="موجودی انبار او از این‌جا به سایتش برود" />
      <Toggle on={e.webhook} onChange={(v) => up((y) => { y.webhook = v }, 'تغییر وب‌هوک سایت شریک')} text="وب‌هوک لحظه‌ای (به‌جای همگام‌سازی هر ۱۵ دقیقه)" />
    </div>
    <p className="mt-2 flex flex-wrap items-center gap-2 text-11 text-t2"><Webhook size={13} />نشانی وب‌هوک برای ووکامرس: <bdi dir="ltr" className="rounded bg-neutral-bg px-1.5 font-mono">https://api.ghanimat.ir/hooks/woo/{e.partyId}</bdi> · رویدادها: order.created، order.updated، order.refunded · آخرین همگام‌سازی {e.lastSync ? rel(e.lastSync) : '—'}</p>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-13 font-semibold"><ShoppingBag size={14} />صندوق سفارش‌های {e.url.replace(/^https?:\/\//, '')} {newCount > 0 && <Badge tone="warning">{fa(newCount)} منتظر ثبت</Badge>}</p>
        <ul className="space-y-2">{e.inbox.map((o) => <li key={o.id} className="rounded-xl border border-line p-3 text-12">
          <div className="flex flex-wrap items-center gap-2"><b className="font-mono">{o.id}</b><span className="text-t2">{o.customer} · {rel(o.at)}</span><span className="flex-1" />{o.status === 'imported' ? <Badge tone="success">در دفتر ثبت شد</Badge> : o.status === 'skipped' ? <Badge>رد شد</Badge> : o.lines.some((l) => !mapOf(l.sku)) ? <Badge tone="danger">SKU ناشناخته</Badge> : <Badge tone="info">آمادهٔ ثبت</Badge>}</div>
          <ul className="mt-2 space-y-1.5">{o.lines.map((l, i) => { const inf = lineInfo(l); return <li key={i} className="rounded-lg bg-neutral-bg px-2.5 py-1.5"><p className="flex flex-wrap items-center gap-1.5"><bdi dir="ltr" className="font-mono">{l.sku}</bdi><span>×{fa(l.qty)}</span><span className="text-t2">{toman(l.price)}</span>{inf ? <><span>← {pv(d, inf.m.productId, inf.m.variationId).full}</span><PartyChip s={s} id={inf.det.owner} /></> : <span className="text-danger">به کالای غنیمت وصل نشده</span>}</p>{inf && o.status !== 'imported' && <p className="mt-0.5 text-11 text-t2">{inf.det.why}</p>}</li> })}</ul>
          {o.status !== 'imported' && o.status !== 'skipped' && <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="primary" disabled={o.lines.some((l) => !mapOf(l.sku))} onClick={() => importOrder(o)}>ثبت در دفتر و کم کردن موجودی</Button><Button size="sm" variant="ghost" onClick={() => up((y) => { y.inbox.find((z) => z.id === o.id)!.status = 'skipped' }, `رد سفارش سایت شریک ${o.id}`)}>رد (تکراری یا آزمایشی)</Button>{o.lines.some((l) => !mapOf(l.sku)) && <Button size="sm" icon={<Link2 size={13} />} onClick={() => setSku({ ...sku, code: o.lines.find((l) => !mapOf(l.sku))!.sku })}>وصل کردن SKU</Button>}</div>}
        </li>)}</ul>
      </div>
      <div>
        <p className="mb-2 text-13 font-semibold">نگاشت SKU سایت او به کالای غنیمت</p>
        <ul className="space-y-1.5">{Object.entries(e.skuMap).map(([k, m]) => <li key={k} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg px-2.5 py-1.5 text-12"><bdi dir="ltr" className="font-mono">{k}</bdi><span>← {pv(d, m.productId, m.variationId).full}</span>{e.pushStock && <Badge dot={false}>موجودی ارسالی: {fa(stockFor(m))}</Badge>}<span className="flex-1" /><button aria-label={`حذف نگاشت ${k}`} className="text-t3 hover:text-danger" onClick={() => up((y) => { delete y.skuMap[k] }, `حذف نگاشت SKU ${k}`)}><Trash2 size={13} /></button></li>)}</ul>
        <div className="mt-2 space-y-2 rounded-xl border border-dashed border-line p-2.5"><Field label="SKU در سایت او"><Input className="ltr text-left font-mono" value={sku.code} onChange={(v) => setSku({ ...sku, code: v.target.value })} /></Field>
          <Field label="کالای غنیمت"><Select value={sku.pid} onChange={(v) => setSku({ ...sku, pid: v, vid: d.products.find((p) => p.id === v)?.variations?.[0]?.id ?? '' })} options={[...new Map(d.products.map((p) => [p.id, p.title])).entries()].map(([k, t]) => [k, t] as [string, string])} /></Field>
          {d.products.find((p) => p.id === sku.pid)?.variations?.length ? <Field label="تنوع"><Select value={sku.vid} onChange={(v) => setSku({ ...sku, vid: v })} options={d.products.find((p) => p.id === sku.pid)!.variations!.map((v) => [v.id, pv(d, sku.pid, v.id).vname] as [string, string])} /></Field> : null}
          <Button size="sm" variant="primary" disabled={!sku.code.trim()} onClick={() => { up((y) => { y.skuMap[sku.code.trim()] = { productId: sku.pid, variationId: d.products.find((p) => p.id === sku.pid)?.variations?.length ? sku.vid : undefined }; y.inbox.forEach((o) => { if (o.status === 'unmatched' && o.lines.every((l) => y.skuMap[l.sku])) o.status = 'new' }) }, `نگاشت SKU ${sku.code}`); setSku({ ...sku, code: '' }) }}>ذخیرهٔ نگاشت</Button></div>
        <p className="mt-2 text-11 text-t2">اگر کالایی هم در انبار او مال خودش باشد و هم مال غنیمت، اول موجودی خودش فروخته حساب می‌شود؛ وقتی موجودی خودش تمام شود، فروش از کالای غنیمت ثبت و سهم غنیمت در <button className="text-brand underline" onClick={() => nav('/admin/ownership?tab=statement')}>صورت‌حساب</button> حساب می‌شود.</p>
      </div>
    </div>
  </Card>
}

/** فروش حضوری با اسکن: شریک در مغازه برچسب جعبه را اسکن می‌کند؛ مالک از روی کد معلوم است و فروش با یک دکمه در دفتر می‌رود */
function StoreSale() {
  const d = useDB(); const s = d.stock; const me = s.parties.find((p) => p.userId === currentUser()?.id)?.id
  const stores = s.channels.filter((c) => c.active && c.id !== 'gh-site' && !s.ext.some((e) => s.channels.find((x) => x.seller === e.partyId && x.brand !== 'غنیمت')?.id === c.id))
  const [ch, setCh] = useState(stores.find((c) => c.seller === me)?.id ?? stores[0]?.id ?? ''); const [code, setCode] = useState(''); const [cart, setCart] = useState<{ code: string; productId: string; variationId?: string; owner: string; qty: number; price: number }[]>([]); const [err, setErr] = useState('')
  const channel = s.channels.find((c) => c.id === ch); const wh = s.warehouses.find((w) => w.operator === channel?.seller && w.active)?.id ?? 'tehran'
  const add = () => { const r = resolveCode(d, code); setCode(''); if (!r) { setErr('این کد شناخته نشد.'); return } setErr(''); const p = d.products.find((x) => x.id === r.productId); const price = p?.variations?.find((v) => v.id === r.variationId)?.price ?? p?.price ?? p?.priceNew ?? 0
    setCart((L) => { const i = L.findIndex((x) => x.productId === r.productId && (x.variationId ?? '') === (r.variationId ?? '') && x.owner === r.owner); if (i >= 0) return L.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)); return [...L, { code, productId: r.productId, variationId: r.variationId, owner: r.owner, qty: 1, price }] }) }
  const save = () => { if (!cart.length || !channel) return; mutate((x) => { const at = new Date().toISOString(); cart.forEach((l) => { const t = takeLots(x, { productId: l.productId, variationId: l.variationId, owner: l.owner, warehouse: wh }, l.qty); x.stock.sales.unshift({ id: uid('S'), at, productId: l.productId, variationId: l.variationId, owner: l.owner, warehouse: wh, channel: channel.id, qty: l.qty, price: l.price, cost: t.cost, by: by(), code: l.code, note: 'فروش حضوری با اسکن' }); syncQty(x, l.productId) }) }, { action: 'ثبت فروش حضوری با اسکن', target: `${channel.name} · ${fa(cart.reduce((a, l) => a + l.qty, 0))} قلم` }); toast('فروش حضوری ثبت شد؛ موجودی و سهم‌ها به‌روز شد.'); setCart([]) }
  return <Card title={<span className="flex items-center gap-1.5"><Store size={15} />فروش حضوری با اسکن</span>} hint="برچسب جعبه را اسکن کنید؛ مالک کالا از پیشوند کد (GH یا YS) معلوم است. فروش کالای دیگران در مغازه هم خودکار در صورت‌حساب می‌رود.">
    <div className="flex flex-wrap items-end gap-2"><Field label="کانال"><Select className="w-64" value={ch} onChange={setCh} options={stores.map((c) => [c.id, `${c.name} · فروشنده ${partyName(s, c.seller)}`] as [string, string])} /></Field>
      <form className="flex flex-1 items-end gap-2" onSubmit={(e) => { e.preventDefault(); add() }}><Field label="اسکن یا کد کالا" error={err || undefined}><div className="relative"><ScanLine size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" /><Input className="ltr h-11 min-w-[220px] pr-9 text-left font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="YS-000201-1" /></div></Field><Button type="submit">افزودن</Button></form></div>
    <p className="mt-1 text-11 text-t2">ارسال از {whName(s, wh)} · کانال {channel ? chName(s, channel.id) : '—'}</p>
    {cart.length > 0 && <ul className="mt-3 space-y-2">{cart.map((l, i) => <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5 text-12"><CheckCircle2 size={15} className="text-success" /><span className="flex-1">{pv(d, l.productId, l.variationId).full}</span><PartyChip s={s} id={l.owner} />
      <label className="flex items-center gap-1">تعداد<Input type="number" min={1} className="ltr h-8 w-16 text-center font-mono" value={l.qty} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, qty: Math.max(1, +e.target.value) } : x)))} /></label>
      <label className="flex items-center gap-1">قیمت<MoneyInput hint={false} className="w-40" value={l.price} onChange={(n) => setCart(cart.map((x, j) => (j === i ? { ...x, price: n } : x)))} /></label>
      <button aria-label="حذف" className="text-t3 hover:text-danger" onClick={() => setCart(cart.filter((_, j) => j !== i))}><Trash2 size={14} /></button></li>)}</ul>}
    {cart.length > 0 && <div className="mt-3 flex items-center gap-3"><Button variant="primary" onClick={save}>ثبت فروش {toman(cart.reduce((a, l) => a + l.qty * l.price, 0))}</Button>{cart.some((l) => l.owner !== channel?.seller) && <p className="flex items-center gap-1 text-12 text-warning"><CircleAlert size={13} />بعضی اقلام مال {partyName(s, cart.find((l) => l.owner !== channel?.seller)!.owner)} است؛ سهمش خودکار حساب می‌شود.</p>}</div>}
  </Card>
}
