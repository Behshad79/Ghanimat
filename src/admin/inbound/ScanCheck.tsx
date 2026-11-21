// ایستگاه اسکن و تفکیک: هر کالایی که اسکن شود می‌گوید مال کیست و باید دست چه کسی باشد (آبی: غنیمت، زرد: Ve1)،
// در حالت تفکیک محموله سهم هر انبار را می‌شمارد، و اگر صفحهٔ کالا ساخته نشده یا آمادهٔ انتشار است همان‌جا پیشنهاد می‌دهد.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Eye, Link2, PackageCheck, RotateCcw, Send, Sparkles } from 'lucide-react'
import { copyText } from '@/shared/ui/base'
import { storeUrl } from '../pages/_shared'
import { Badge, Button, Card, cx, Segmented, Select } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { getDB, myParty, mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import { resolveCode, type Resolved } from '@/shared/data/inbound'
import { partyLogo, whName } from '../stock/common'
import { beep, ScanInput } from './Manifests'
import { ensureProduct } from './ops'

type Hit = { at: string; code: string; r: Resolved | null; holder: string | null; dest?: string; note?: string; over?: boolean }
const HOLDER_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  gh: { bg: '#0000ff', fg: '#fff', label: 'غنیمت' }, ys: { bg: '#f7a23b', fg: '#10123d', label: 'Ve1 · یاسین' },
}

export function ScanCheck() {
  const d = useDB(); const s = d.stock; const nav = useNavigate()
  const myWh = s.warehouses.find((w) => w.operator === myParty())?.id ?? 'tehran'
  const [here, setHere] = useState(myWh); const [mode, setMode] = useState<'owner' | 'sort'>('owner')
  const openBatches = d.incoming.filter((b) => b.items.some((it) => it.code))
  const [batch, setBatch] = useState(openBatches[0]?.id ?? '')
  const [hits, setHits] = useState<Hit[]>([]); const [filter, setFilter] = useState<'all' | 'mine' | 'notmine'>('all')
  const operatorOf = (w: string) => s.warehouses.find((x) => x.id === w)?.operator ?? 'gh'
  const scan = (raw: string) => {
    const r = resolveCode(getDB(), raw); let holder: string | null = null; let dest: string | undefined; let note: string | undefined; let over = false
    if (!r) { beep(false); setHits([{ at: new Date().toISOString(), code: raw.toUpperCase(), r: null, holder: null, note: 'کد ناشناخته؛ برچسب را بررسی کنید' }, ...hits]); return }
    if (mode === 'sort' && r.batchId === batch && r.split) {
      // سهم هر انبار را به ترتیب پر می‌کنیم: اول سهم انبار فعلی (همین‌جا می‌ماند)، بعد بقیه
      const done = hits.filter((h) => h.r?.code === r.code && h.dest).reduce<Record<string, number>>((a, h) => { a[h.dest!] = (a[h.dest!] ?? 0) + 1; return a }, {})
      const order = [here, ...Object.keys(r.split).filter((w) => w !== here)]
      dest = order.find((w) => (done[w] ?? 0) < (r.split![w] ?? 0))
      if (!dest) { over = true; note = 'بیشتر از تعداد خریداری‌شده؛ عدد اضافه است' } else holder = operatorOf(dest)
    } else holder = r.owner
    beep(!over && (mode === 'owner' ? true : !!dest))
    setHits([{ at: new Date().toISOString(), code: r.code, r, holder, dest, note, over }, ...hits].slice(0, 200))
  }
  const last = hits[0]
  const shown = hits.filter((h) => filter === 'all' || (filter === 'mine' ? h.holder === operatorOf(here) : h.holder && h.holder !== operatorOf(here)))
  const tally = hits.reduce<Record<string, number>>((a, h) => { const k = h.holder ?? '?'; a[k] = (a[k] ?? 0) + 1; return a }, {})
  const build = (r: Resolved) => { let pid = r.productId; if (!pid && r.batchId) mutate((x) => { const b = x.incoming.find((q) => q.id === r.batchId)!; const it = b.items.find((q) => q.id === r.itemId)!; pid = ensureProduct(x, b, it).id }, { action: 'ساخت صفحهٔ کالا از اسکن', target: r.title }); if (pid) nav(`/admin/catalog/${pid}/edit?step=0&from=batch`) }
  const publish = (pid: string) => { mutate((x) => { const p = x.products.find((q) => q.id === pid); if (p) p.status = 'product.published' }, { action: 'انتشار کالا از ایستگاه اسکن', target: pid }); toast('کالا منتشر شد و در سایت دیده می‌شود.') }
  const st = last?.holder ? HOLDER_STYLE[last.holder] ?? { bg: s.parties.find((p) => p.id === last.holder)?.color ?? '#555', fg: '#fff', label: s.parties.find((p) => p.id === last.holder)?.name ?? last.holder } : null
  const p = last?.r?.productId ? d.products.find((x) => x.id === last.r!.productId) : undefined
  const lots = last?.r?.productId ? s.lots.filter((l) => l.productId === last.r!.productId && (l.variationId ?? '') === (last.r!.variationId ?? '') && l.qty > 0) : []
  const inHere = lots.filter((l) => l.warehouse === here && l.owner === last?.r?.owner).reduce((a, l) => a + l.qty, 0)
  const inbound = last?.r ? (s.manifests ?? []).find((m) => m.status === 'sent' && m.to === here && m.lines.some((ln) => ln.code === last.r!.code)) : undefined
  return <div className="space-y-4">
    <Card><div className="flex flex-wrap items-end gap-3">
      <label className="text-12"><span className="mb-1 block text-t2">من الان کجا هستم</span><Select className="w-44" value={here} onChange={setHere} options={s.warehouses.map((w) => [w.id, w.name] as [string, string])} other={false} /></label>
      <label className="text-12"><span className="mb-1 block text-t2">حالت</span><Segmented value={mode} onChange={setMode} options={[['owner', 'مالکیت: مال کیست؟'], ['sort', 'تفکیک محموله: کجا برود؟']]} /></label>
      {mode === 'sort' && <label className="text-12"><span className="mb-1 block text-t2">محموله</span><Select className="w-64" value={batch} onChange={setBatch} options={openBatches.map((b) => [b.id, `${b.id} · ${b.title}`] as [string, string])} other={false} /></label>}
      <span className="flex-1" /><Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setHits([])} disabled={!hits.length}>شروع دوباره</Button>
    </div>
    <p className="mt-2 text-11 text-t2">{mode === 'owner' ? 'هر کالا را اسکن کنید: آبی یعنی مال غنیمت است و باید دست بهشاد (انبار تهران) باشد؛ زرد یعنی مال یاسین (Ve1) است.' : `هنگام باز کردن بار در ${whName(s, here)}: هر عدد را اسکن کنید تا بگوید همین‌جا بماند یا کنار گذاشته شود برای انبار دیگر؛ سهم هر انبار طبق همان چیزی است که هنگام ثبت محموله گفته شد.`}</p></Card>
    <ScanInput onScan={scan} />
    {last && <div className="overflow-hidden rounded-3xl border-4 shadow-sm" style={{ borderColor: st?.bg ?? '#dc2626' }}>
      <div className="flex flex-wrap items-center gap-4 p-5" style={{ background: st?.bg ?? '#fee2e2', color: st?.fg ?? '#991b1b' }}>
        {last.holder && partyLogo(s.parties.find((q) => q.id === last.holder)) ? <span className="grid size-16 place-items-center rounded-2xl bg-white"><img src={partyLogo(s.parties.find((q) => q.id === last.holder))} alt="" className="size-12 object-contain" /></span> : <AlertTriangle size={44} />}
        <div className="min-w-0 flex-1"><p className="text-28 font-extrabold leading-tight">{last.over ? 'عدد اضافه' : !last.r ? 'ناشناخته' : mode === 'sort' && last.dest ? (last.dest === here ? `همین‌جا بماند · ${st?.label}` : `کنار بگذارید برای ${whName(s, last.dest)}`) : `باید دست ${st?.label} باشد`}</p>
          <p className="mt-1 text-14 opacity-90">{last.r ? `${last.r.title}${last.r.vname ? ` · ${last.r.vname}` : ''}` : last.code}{last.note ? ` · ${last.note}` : ''}</p></div>
        <bdi dir="ltr" className="rounded-lg bg-white/20 px-3 py-1 font-mono text-14">{last.code}</bdi>
      </div>
      {last.r && <div className="grid gap-3 bg-surface p-4 text-12 sm:grid-cols-[auto_1fr_auto]">
        {(last.r.image || p?.image) ? <img src={last.r.image || p?.image} alt="" className="size-20 rounded-xl object-cover" /> : <span className="grid size-20 place-items-center rounded-xl bg-neutral-bg text-t3"><Eye size={20} /></span>}
        <div className="space-y-1">
          <p><span className="text-t2">مالک:</span> <b>{s.parties.find((q) => q.id === last.r!.owner)?.name}{s.parties.find((q) => q.id === last.r!.owner)?.brandName ? ` (${s.parties.find((q) => q.id === last.r!.owner)?.brandName})` : ''}</b>{mode === 'owner' && <span className="text-t2"> · {last.r.owner === operatorOf(here) ? `درست است، مال ${whName(s, here)} است` : `مال شما نیست؛ باید به ${whName(s, s.warehouses.find((w) => w.operator === last.r!.owner)?.id ?? 'tehran')} برود`}</span>}</p>
          {last.r.batchId && <p><span className="text-t2">محموله:</span> {last.r.batchId}{last.r.split ? ` · سهم‌ها: ${Object.entries(last.r.split).filter(([, q]) => q).map(([w, q]) => `${whName(s, w)} ${fa(q)}`).join('، ')}` : ''}</p>}
          {p ? <p><span className="text-t2">صفحهٔ کالا:</span> {p.status === 'product.published' ? <span className="inline-flex flex-wrap items-center gap-1.5"><Badge tone="success">منتشر شده</Badge><a href={storeUrl(p)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"><ExternalLink size={12} />مشاهده در سایت</a><button type="button" className="inline-flex items-center gap-1 text-t2 hover:text-brand" onClick={() => { copyText(storeUrl(p)); toast('لینک صفحهٔ کالا کپی شد.') }}><Link2 size={12} />کپی لینک</button><button type="button" className="text-t2 hover:text-brand" onClick={() => nav(`/admin/catalog/${p.id}`)}>صفحه در پنل</button></span> : <Badge tone="warning">{p.status === 'product.incoming' ? 'در راه' : 'پیش‌نویس'} · آمادگی {fa(p.health)}٪</Badge>}{lots.length > 0 && <span className="mr-2 text-t2">موجودی این مالک در {whName(s, here)}: {fa(inHere)}</span>}</p> : <p className="font-semibold text-warning">برای این کالا هنوز صفحه ساخته نشده است.</p>}
          {inbound && <p className="font-semibold text-info">این کالا در حوالهٔ {inbound.id} در راه {whName(s, here)} است؛ با تحویل حواله ثبت می‌شود.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          {!p && <Button size="sm" variant="primary" icon={<Sparkles size={13} />} onClick={() => build(last.r!)}>بساز: صفحهٔ کالا</Button>}
          {p && p.status !== 'product.published' && inHere > 0 && <Button size="sm" variant="primary" icon={<Send size={13} />} disabled={!(p.image || p.images?.length) || !(p.price || p.priceNew)} title={!(p.image || p.images?.length) ? 'عکس ندارد' : ''} onClick={() => publish(p.id)}>انتشار همین حالا</Button>}
          {p && <Button size="sm" variant="ghost" onClick={() => nav(`/admin/catalog/${p.id}/edit?step=0&from=batch`)}>تکمیل صفحه</Button>}
          {inbound && <Button size="sm" icon={<PackageCheck size={13} />} onClick={() => nav(`/admin/inbound?tab=manifests&m=${inbound.id}`)}>تحویل حواله</Button>}
        </div>
      </div>}
    </div>}
    {hits.length > 0 && <Card pad={false} title={`اسکن‌های این نوبت · ${fa(hits.length)}`} actions={<Segmented size="sm" value={filter} onChange={setFilter} options={[['all', 'همه'], ['mine', `باید دست من باشد (${fa(tally[operatorOf(here)] ?? 0)})`], ['notmine', `مال من نیست (${fa(hits.filter((h) => h.holder && h.holder !== operatorOf(here)).length)})`]]} />}>
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5 text-12">{Object.entries(tally).map(([k, n]) => { const hs = HOLDER_STYLE[k]; return <span key={k} className="rounded-full px-2.5 py-0.5 font-semibold" style={{ background: hs?.bg ?? '#fee2e2', color: hs?.fg ?? '#991b1b' }}>{hs?.label ?? (k === '?' ? 'ناشناخته یا اضافه' : s.parties.find((q) => q.id === k)?.name ?? k)}: {fa(n)}</span> })}</div>
      <ul className="max-h-96 divide-y divide-line overflow-y-auto">{shown.map((h, i) => { const hs = h.holder ? HOLDER_STYLE[h.holder] : null; return <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2 text-12">
        <span className="h-6 w-1.5 rounded-full" style={{ background: hs?.bg ?? '#dc2626' }} />
        <span className="min-w-0 flex-1 truncate"><b>{h.r?.title ?? 'ناشناخته'}</b>{h.r?.vname && <span className="text-t2"> · {h.r.vname}</span>}</span>
        <span className={cx('rounded-full px-2 py-0.5 text-11 font-semibold', !hs && 'bg-danger-bg text-danger')} style={hs ? { background: hs.bg, color: hs.fg } : undefined}>{h.over ? 'اضافه' : !h.r ? 'ناشناخته' : h.dest ? (h.dest === here ? 'بماند' : `→ ${whName(s, h.dest)}`) : hs?.label}</span>
        <bdi dir="ltr" className="font-mono text-11 text-t3">{h.code}</bdi><span className="text-11 text-t3">{rel(h.at)}</span></li> })}</ul>
    </Card>}
  </div>
}
