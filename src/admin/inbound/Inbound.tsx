// ورود بار و حواله: محموله‌های خرید، صف ساخت صفحه، حواله‌های بین انبار، ایستگاه اسکن و تفکیک، توقف و انتقال، کارنامه
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Send, Sparkles } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Progress, Tabs } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import { itemQty, landed } from '@/shared/data/inbound'
import { useTab } from '../pages/_shared'
import { PartyChip, whName } from '../stock/common'
import { fillChecks } from '../catalog/NewItemsQueue'
import { BatchesTab } from './Batches'
import { ManifestsTab } from './Manifests'
import { ScanCheck } from './ScanCheck'
import { ControlTab } from './Control'
import { ReportTab } from './Report'
import { ensureProduct } from './ops'
import { BuyTab, SuppliersTab } from './SupplyBits'

export function Inbound() {
  const d = useDB(); const [tab, setTab] = useTab('batches'); const [sp] = useSearchParams()
  const M = d.stock.manifests ?? []
  const queue = d.incoming.flatMap((b) => b.items.map((it) => ({ b, it }))).filter(({ it }) => { const p = it.productId ? d.products.find((x) => x.id === it.productId) : undefined; return !p || p.status !== 'product.published' })
  return <Page title="تأمین و ورود بار" module="inbound" sub="یک مسیر از «چه بخریم» تا «منتشر شد»: لیست خرید، محموله با برچسب مالک‌دار، صف ساخت صفحه، حوالهٔ اسکنی بین انبارها، تفکیک با اسکن و کارنامهٔ هر انبار"
    tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'buy', label: 'لیست خرید', count: d.buyList.filter((b) => b.status === 'در لیست').length || undefined }, { id: 'batches', label: 'محموله‌های خرید', count: d.incoming.filter((b) => !b.receivedAt).length || undefined }, { id: 'queue', label: 'صف ساخت صفحه', count: queue.length || undefined }, { id: 'manifests', label: 'حواله‌ها', count: M.filter((m) => !['received', 'cancelled'].includes(m.status)).length || undefined }, { id: 'scan', label: 'اسکن و تفکیک' }, { id: 'control', label: 'توقف و انتقال', count: d.stock.parties.filter((p) => p.pause).length || undefined }, { id: 'report', label: 'کارنامهٔ انبار و شریک' }, { id: 'suppliers', label: 'تأمین‌کننده و ارز' }]} />}>
    {tab === 'buy' && <BuyTab />}
    {tab === 'suppliers' && <SuppliersTab />}
    {tab === 'batches' && <BatchesTab onManifests={() => setTab('manifests')} />}
    {tab === 'queue' && <BuildQueue />}
    {tab === 'manifests' && <ManifestsTab focus={sp.get('m') ?? undefined} />}
    {tab === 'scan' && <ScanCheck />}
    {tab === 'control' && <ControlTab />}
    {tab === 'report' && <ReportTab />}
  </Page>
}

/** صف ساخت صفحه: هر کالایی که خریده شده و صفحه‌اش هنوز منتشر نشده؛ با رسیدن به انبار تهران همان‌جا منتشر می‌شود */
function BuildQueue() {
  const d = useDB(); const s = d.stock; const nav = useNavigate()
  const rows = d.incoming.flatMap((b) => b.items.map((it) => ({ b, it, p: it.productId ? d.products.find((x) => x.id === it.productId) : undefined }))).filter((r) => !r.p || r.p.status !== 'product.published')
  const build = (bid: string, iid: string) => { let pid = ''; mutate((x) => { const b = x.incoming.find((q) => q.id === bid)!; pid = ensureProduct(x, b, b.items.find((q) => q.id === iid)!).id }, { action: 'ساخت صفحهٔ کالا از صف', target: iid }); nav(`/admin/catalog/${pid}/edit?step=0&from=batch`) }
  const inTehran = (pid?: string) => pid ? s.lots.filter((l) => l.productId === pid && l.warehouse === 'tehran' && l.qty > 0).reduce((a, l) => a + l.qty, 0) : 0
  if (!rows.length) return <Card><EmptyState title="صف خالی است." desc="کالاهای محموله‌ها اینجا می‌آیند تا صفحه‌شان روزبه‌روز ساخته و با رسیدن منتشر شود." /></Card>
  return <Card pad={false} title={`صف ساخت صفحه · ${fa(rows.length)} کالا`}>
    <p className="border-b border-line px-4 py-2.5 text-12 text-t2">هر روز چند کالا را جلو ببرید: «ساخت صفحه» فرم کالا را با نام، لینک، عکس، مشخصات، تنوع‌ها، مالک، بها و قیمت پیشنهادی پر می‌کند. وقتی کالا به انبار تهران رسید، «انتشار» همین‌جا فعال می‌شود.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-12"><thead><tr className="bg-surface-2 text-t2">{['کالا', 'محموله', 'مالک', 'تعداد و محل', 'بها / قیمت پیشنهادی', 'آمادگی صفحه', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {rows.map(({ b, it, p }) => { const c = p ? fillChecks(p) : []; const n = c.filter((x) => x.ok).length; const tq = inTehran(p?.id); const L = landed(b, it)
        return <tr key={`${b.id}${it.id}`} className="border-t border-line">
          <td className="p-2"><span className="flex items-center gap-2">{(it.photos?.[0] || p?.image) ? <img src={it.photos?.[0] || p?.image} alt="" className="size-10 rounded-lg object-cover" /> : <span className="grid size-10 place-items-center rounded-lg bg-neutral-bg text-t3"><Sparkles size={14} /></span>}<span><b className="block max-w-56 truncate">{p?.title ?? it.name}</b>{it.amazonUrl && <a href={it.amazonUrl} target="_blank" rel="noreferrer" className="text-11 text-brand">لینک خرید</a>}</span></span></td>
          <td className="p-2"><span className="font-mono">{b.id}</span><span className="block text-11 text-t2">{b.receivedAt ? 'رسیده' : b.stage}</span></td>
          <td className="p-2"><PartyChip s={s} id={it.owner ?? 'gh'} /></td>
          <td className="p-2">{fa(itemQty(it))} عدد{it.landedAt && <span className="block text-11 text-success">{Object.entries(it.landedAt).map(([w, q]) => `${whName(s, w)} ${fa(q)}`).join('، ')}</span>}{tq > 0 && <Badge tone="success" dot={false}>در تهران: {fa(tq)}</Badge>}</td>
          <td className="p-2">{toman(L.unit)}<span className="block text-11 text-t2">{it.sellPrice ? toman(it.sellPrice) : '—'}</span></td>
          <td className="p-2">{p ? <div className="w-32"><Progress value={Math.round((n / Math.max(1, c.length)) * 100)} tone={n === c.length ? 'success' : 'warning'} /><span className="text-11 text-t2">{n === c.length ? 'کامل' : `کم: ${c.filter((x) => !x.ok).slice(0, 2).map((x) => x.label).join('، ')}`}</span></div> : <span className="text-warning">صفحه ساخته نشده</span>}</td>
          <td className="p-2"><span className="flex gap-1.5">{p ? <Button size="sm" icon={<Pencil size={12} />} onClick={() => nav(`/admin/catalog/${p.id}/edit?step=0&from=batch`)}>ادامه</Button> : <Button size="sm" variant="primary" icon={<Sparkles size={12} />} onClick={() => build(b.id, it.id)}>ساخت صفحه</Button>}
            {p && <Button size="sm" variant={tq > 0 ? 'primary' : 'ghost'} icon={<Send size={12} />} disabled={!tq || !(p.image || p.images?.length) || !(p.price || p.priceNew)} title={!tq ? 'هنوز به انبار تهران نرسیده' : !(p.image || p.images?.length) ? 'عکس ندارد' : ''} onClick={() => { mutate((x) => { x.products.find((q) => q.id === p.id)!.status = 'product.published' }, { action: 'انتشار کالای محموله', target: p.title }); toast(`«${p.title}» منتشر شد.`) }}>انتشار</Button>}</span></td>
        </tr> })}
    </tbody></table></div>
  </Card>
}

/** نشانی قدیمی «تأمین و خرید» به همین صفحه می‌آید و تب معادل باز می‌شود */
export function SupplyRedirect() {
  const [sp] = useSearchParams(); const t = sp.get('tab') ?? 'buy'
  const map: Record<string, string> = { buy: 'buy', opps: 'buy', ledger: 'batches', po: 'batches', inbound: 'batches', suppliers: 'suppliers', fx: 'suppliers' }
  return <Navigate to={`/admin/inbound?tab=${map[t] ?? 'buy'}`} replace />
}
