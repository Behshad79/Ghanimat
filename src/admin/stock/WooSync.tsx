// همگام‌سازی کالای ووکامرس شریک با API: SKU هر کالا در سایت او دقیقاً همان کد مالک‌داری است که غنیمت ساخته (از رسید محموله یا موجودی)،
// پس هر فروشی در سایت او، حتی کالایی که هنوز صفحه‌اش در غنیمت ساخته نشده، با کالا و مالک درست شناخته می‌شود.
import { useState } from 'react'
import { CheckCircle2, CircleAlert, CloudDownload, CloudUpload, RefreshCw } from 'lucide-react'
import { Badge, Button, cx, Segmented } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import type { ExtSite } from '@/shared/data/stock'
import { labelLines } from '@/shared/data/inbound'
import { PartyChip, partyName, pv } from './common'
import { partnerCodes } from './ExtSites'

export type WooRow = { code: string; name: string; owner: string; stock: number; price?: number; src: 'stock' | 'batch'; batch?: string; built: boolean }
/** همهٔ کدهایی که باید در سایت شریک باشد: موجودی انبارهای او + اقلام محموله‌هایی که سهمی برای انبار او یا مالکیت او دارند */
export function wooRows(d: DB, partner: string): WooRow[] {
  const whs = d.stock.warehouses.filter((w) => w.operator === partner).map((w) => w.id); const m = new Map<string, WooRow>()
  partnerCodes(d, partner).forEach((c) => { const p = d.products.find((x) => x.id === c.productId); m.set(c.code, { code: c.code, name: pv(d, c.productId, c.variationId).full, owner: c.owner, stock: c.stock, price: p?.priceNew || p?.price, src: 'stock', built: true }) })
  d.incoming.filter((b) => !b.receivedAt || b.items.some((it) => !it.productId)).forEach((b) => b.items.forEach((it) => labelLines(d.stock, it).forEach((ln) => {
    const mine = ln.owner === partner || Object.keys(ln.split).some((w) => whs.includes(w)); if (!mine || m.has(ln.code)) return
    m.set(ln.code, { code: ln.code, name: `${it.name}${ln.v ? ` · ${ln.v.label}` : ''}`, owner: ln.owner, stock: 0, price: it.sellPrice, src: 'batch', batch: b.id, built: !!it.productId })
  })))
  return [...m.values()].sort((a, b) => a.code.localeCompare(b.code))
}
type State = 'same' | 'qty' | 'missing' | 'remote'
const STATE: Record<State, { t: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = { same: { t: 'یکسان', tone: 'success' }, qty: { t: 'اختلاف موجودی', tone: 'warning' }, missing: { t: 'در سایت نیست', tone: 'danger' }, remote: { t: 'فقط در سایت', tone: 'info' } }

export function WooSync({ e, batch }: { e: ExtSite; batch?: string }) {
  const d = useDB(); const s = d.stock; const name = partyName(s, e.partyId); const [busy, setBusy] = useState<string | null>(null); const [f, setF] = useState<'all' | 'diff'>('diff')
  const rows = wooRows(d, e.partyId).filter((r) => !batch || r.batch === batch)
  const remote = e.remote ?? []; const rmap = new Map(remote.map((r) => [r.sku, r]))
  const stateOf = (r: WooRow): State => { const x = rmap.get(r.code); return !x ? 'missing' : x.stock !== r.stock ? 'qty' : 'same' }
  const onlyRemote = batch ? [] : remote.filter((x) => !rows.some((r) => r.code === x.sku) && !e.skuMap[x.sku])
  const list = rows.filter((r) => f === 'all' || stateOf(r) !== 'same')
  const up = (fn: (y: ExtSite) => void, action: string, after?: string) => mutate((x) => { const y = x.stock.ext.find((z) => z.partyId === e.partyId); if (y) fn(y) }, { action, target: `${name} · ${e.url}`, after })
  const pull = async () => { setBusy('pull'); try { await fakeCall(true, 900)
    // نسخهٔ نمایشی: آنچه قبلاً فرستاده شده در سایت هست، به‌علاوهٔ یک SKU دستی که فقط در سایت او ثبت شده
    up((y) => { const prev = new Map((y.remote ?? []).map((r) => [r.sku, r])); const base = Object.entries(y.pushed ?? {}).map(([sku, p]) => ({ sku, name: prev.get(sku)?.name ?? sku, stock: Math.max(0, p.qty - (sku.length % 3 === 0 ? 1 : 0)), id: p.wooId }))
      const extra = [{ sku: 'VE1-CASE-A55', name: 'قاب گوشی A55 (کالای خود سایت)', stock: 12, id: 9001 }]; y.remote = [...base, ...extra.filter((q) => !base.some((b) => b.sku === q.sku))]; y.remoteAt = new Date().toISOString() }, 'خواندن کالاهای سایت شریک با API', `${fa(Object.keys(e.pushed ?? {}).length + 1)} کالا`)
    toast(`فهرست کالاهای ${e.url} با API خوانده شد.`) } finally { setBusy(null) } }
  const push = async (R: WooRow[]) => { if (!R.length) return; setBusy('push'); try { await fakeCall(true, 1100)
    up((y) => { y.pushed = { ...(y.pushed ?? {}) }; const rm = new Map((y.remote ?? []).map((q) => [q.sku, q])); R.forEach((r, i) => { const id = y.pushed![r.code]?.wooId ?? 7000 + Object.keys(y.pushed!).length + i; y.pushed![r.code] = { at: new Date().toISOString(), qty: r.stock, price: r.price, wooId: id }; rm.set(r.code, { sku: r.code, name: r.name, stock: r.stock, id }) }); y.remote = [...rm.values()]; y.remoteAt = new Date().toISOString() },
      'ارسال کالا به سایت شریک با SKU یکسان', `${fa(R.length)} کد`)
    toast(`${fa(R.length)} کالا با همان SKU در ${e.url} ساخته یا به‌روز شد. موجودی هم فرستاده شد.`) } finally { setBusy(null) } }
  const diff = rows.filter((r) => stateOf(r) !== 'same')
  return <div className="space-y-2 rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-center gap-2"><b className="flex items-center gap-1.5 text-13"><RefreshCw size={14} className="text-brand" />همگام‌سازی با ووکامرس {name} (API)</b>
      <span className="text-11 text-t2">{e.remoteAt ? `آخرین خواندن ${rel(e.remoteAt)}` : 'هنوز فهرست سایت خوانده نشده'}</span>
      <span className="mr-auto flex flex-wrap gap-1.5"><Segmented size="sm" value={f} onChange={setF} options={[['diff', `ناهمگام (${fa(diff.length)})`], ['all', `همه (${fa(rows.length)})`]]} />
        <Button size="sm" icon={<CloudDownload size={13} />} loading={busy === 'pull'} disabled={!e.on} onClick={() => void pull()}>خواندن از سایت</Button>
        <Button size="sm" variant="primary" icon={<CloudUpload size={13} />} loading={busy === 'push'} disabled={!e.on || !diff.length} onClick={() => void push(diff)}>ارسال {fa(diff.length)} مورد به سایت</Button></span></div>
    {!e.on && <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning">اتصال سایت {name} خاموش است؛ از «شرکا و تسویه ← سایت و مغازهٔ شریک» روشنش کنید.</p>}
    <p className="text-11 leading-5 text-t2">SKU هر کالا در سایت {name} همان کد برچسبی است که این‌جا ساخته شده. کالایی که از محموله می‌آید، حتی پیش از ساخت صفحه در غنیمت، با همین کد در سایت او ساخته می‌شود. فروشش هم با همین کد به کالا و مالک درست وصل می‌شود.</p>
    <div className="max-h-80 overflow-auto rounded-lg border border-line"><table className="w-full min-w-[720px] text-12"><thead><tr className="sticky top-0 bg-surface-2 text-t2">{['SKU (کد غنیمت)', 'کالا', 'مالک', 'موجودی ما', 'در سایت', 'وضعیت', ''].map((h, i) => <th key={i} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {list.map((r) => { const st = stateOf(r); const x = rmap.get(r.code); return <tr key={r.code} className="border-t border-line">
        <td className="p-2"><bdi dir="ltr" className="font-mono font-semibold">{r.code}</bdi></td>
        <td className="p-2"><span className="block max-w-64 truncate">{r.name}</span><span className="text-11 text-t3">{r.src === 'batch' ? `از محمولهٔ ${r.batch}${r.built ? '' : ' · صفحه هنوز ساخته نشده'}` : 'موجودی انبار'}{r.price ? ` · ${toman(r.price)}` : ''}</span></td>
        <td className="p-2"><PartyChip s={s} id={r.owner} /></td>
        <td className="p-2 tnum">{fa(r.stock)}</td>
        <td className="p-2 tnum">{x ? fa(x.stock) : '—'}</td>
        <td className="p-2"><Badge tone={STATE[st].tone} dot={false}>{STATE[st].t}</Badge></td>
        <td className="p-2">{st !== 'same' && <Button size="sm" variant="ghost" disabled={!e.on || !!busy} onClick={() => void push([r])}>ارسال</Button>}</td>
      </tr> })}
      {list.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-t2"><CheckCircle2 size={16} className="mx-auto mb-1 text-success" />همهٔ کدها با سایت یکسان است.</td></tr>}
    </tbody></table></div>
    {onlyRemote.length > 0 && <div className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info"><p className="flex items-center gap-1 font-semibold"><CircleAlert size={13} />{fa(onlyRemote.length)} SKU فقط در سایت {name} هست و در غنیمت کدی برایش نیست</p>
      <ul className="mt-1 space-y-0.5">{onlyRemote.map((x) => <li key={x.sku}><bdi dir="ltr" className="font-mono">{x.sku}</bdi> · {x.name} · موجودی {fa(x.stock)}</li>)}</ul>
      <p className="mt-1 text-11">اگر این کالا مال غنیمت هم هست، در «نگاشت SKU» پایین همین کارت به کالای غنیمت وصلش کنید؛ وگرنه کالای خود سایت اوست و فروشش در دفتر ما ثبت نمی‌شود.</p></div>}
  </div>
}

/** یک خط خلاصه برای کارت محموله: چند کد از این محموله در سایت شریک هست */
export function WooBatchStrip({ batch }: { batch: string }) {
  const d = useDB(); const [open, setOpen] = useState(false)
  const E = d.stock.ext.filter((e) => e.on)
  const parts = E.map((e) => { const R = wooRows(d, e.partyId).filter((r) => r.batch === batch); const rm = new Set((e.remote ?? []).map((x) => x.sku)); return { e, n: R.length, on: R.filter((r) => rm.has(r.code)).length } }).filter((x) => x.n > 0)
  if (!parts.length) return null
  return <div className="border-t border-line px-4 py-2.5 text-12">
    <div className="flex flex-wrap items-center gap-2">{parts.map(({ e, n, on }) => <span key={e.partyId} className={cx('rounded-full px-2.5 py-1 font-semibold', on === n ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning')}>ووکامرس {partyName(d.stock, e.partyId)}: {fa(on)} از {fa(n)} کد در سایت</span>)}
      <button type="button" className="text-12 font-semibold text-brand" onClick={() => setOpen(!open)}>{open ? 'بستن' : 'همگام‌سازی'}</button></div>
    {open && <div className="mt-2 space-y-2">{parts.map(({ e }) => <WooSync key={e.partyId} e={e} batch={batch} />)}</div>}
  </div>
}
