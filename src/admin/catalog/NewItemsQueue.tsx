import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, Send, Sparkles } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Progress, Segmented, Select } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB, Product } from '@/shared/data/seed'
import { partyName, whName } from '../stock/common'

/** چه چیزی برای انتشار کالای تازه کم است */
export function fillChecks(p: Product) {
  const x = p as Product & { specs?: Record<string, string>; long?: string }
  return [
    { k: 'img', label: 'عکس', ok: !!(p.images?.length || p.image) },
    { k: 'price', label: 'قیمت فروش', ok: !!(p.price || p.priceNew) },
    { k: 'brand', label: 'برند', ok: !!p.brand && p.brand !== 'بدون برند' },
    { k: 'specs', label: 'مشخصات فنی', ok: !!x.specs && Object.keys(x.specs).length > 0 && p.health > 40 },
    { k: 'desc', label: 'توضیح صفحه', ok: !!x.long },
    ...(p.needsExpiry ? [{ k: 'irc', label: 'شناسهٔ سلامت IRC', ok: !!p.irc }] : []),
  ]
}

export const fillQueue = (d: DB) => d.products.filter((p) => p.exclusive && p.status === 'product.draft')

const onHand = (d: DB, pid: string) => d.stock.lots.filter((l) => l.productId === pid).reduce((a, l) => a + l.qty, 0)

/** صف تکمیل کالای تازه: کالاهایی که در ورود موجودی ساخته شده‌اند و هنوز صفحه و مشخصات ندارند */
export function NewItemsQueue() {
  const d = useDB(); const nav = useNavigate(); const s = d.stock
  const [who, setWho] = useState('all'); const [view, setView] = useState<'open' | 'done'>('open')
  const all = d.products.filter((p) => p.exclusive)
  const rows = useMemo(() => all.filter((p) => (view === 'open' ? p.status === 'product.draft' : p.status !== 'product.draft')).filter((p) => who === 'all' || (who === 'none' ? !p.exclusive!.assignee : p.exclusive!.assignee === who)).sort((a, b) => +new Date(b.exclusive!.at) - +new Date(a.exclusive!.at)), [d, view, who])
  const team = d.team.filter((u) => u.role !== 'cofounder')
  const open = all.filter((p) => p.status === 'product.draft')
  const ready = open.filter((p) => fillChecks(p).filter((c) => c.k === 'img' || c.k === 'price').every((c) => c.ok))
  const assign = (ids: string[], uid: string) => { const name = team.find((u) => u.id === uid)?.name ?? ''; mutate((x) => x.products.filter((p) => ids.includes(p.id)).forEach((p) => { if (p.exclusive) p.exclusive.assignee = uid || undefined }), { action: 'واگذاری تکمیل کالای تازه', target: `${fa(ids.length)} کالا`, after: name || 'بدون مسئول' }); toast(uid ? `${fa(ids.length)} کالا به ${name} واگذار شد.` : 'مسئول برداشته شد.') }
  const publish = (ids: string[]) => { const okIds = ids.filter((id) => { const p = d.products.find((y) => y.id === id)!; return fillChecks(p).filter((c) => c.k === 'img' || c.k === 'price').every((c) => c.ok) }); if (!okIds.length) { toast('برای انتشار دست‌کم عکس و قیمت فروش لازم است.', { tone: 'err' }); return } mutate((x) => x.products.filter((p) => okIds.includes(p.id)).forEach((p) => { p.status = 'product.published' }), { action: 'انتشار کالای تازه از صف تکمیل', target: `${fa(okIds.length)} کالا` }); toast(`${fa(okIds.length)} کالا منتشر شد${okIds.length < ids.length ? `؛ ${fa(ids.length - okIds.length)} کالا عکس یا قیمت ندارد و در صف ماند` : ''}.`) }
  const batches = new Set(open.map((p) => p.exclusive!.batchId)).size
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-4">
      {[['در صف تکمیل', fa(open.length), `${fa(batches)} بار ورود`], ['آمادهٔ انتشار', fa(ready.length), 'عکس و قیمت دارند'], ['بدون مسئول', fa(open.filter((p) => !p.exclusive!.assignee).length), 'واگذار کنید'], ['موجودی منتظر فروش', fa(open.reduce((a, p) => a + onHand(d, p.id), 0)), 'عدد در انبار، هنوز در سایت نیست']].map(([t, v, h]) => <Card key={t}><p className="text-12 text-t2">{t}</p><p className="mt-1 text-22 font-bold">{v}</p><p className="text-11 text-t3">{h}</p></Card>)}
    </div>
    <Card pad={false} title={<span className="inline-flex items-center gap-1.5"><Sparkles size={15} className="text-brand" />صف تکمیل کالای تازه</span>} actions={<div className="flex flex-wrap items-center gap-2"><Segmented size="sm" value={view} onChange={setView} options={[['open', `در صف (${fa(open.length)})`], ['done', 'تکمیل‌شده']]} /><Select className="w-40" value={who} onChange={setWho} options={[['all', 'همهٔ مسئول‌ها'], ['none', 'بدون مسئول'], ...team.map((u) => [u.id, u.name] as [string, string])]} /></div>}>
      <p className="border-b border-line px-4 py-2.5 text-12 text-t2">کالاهایی که شریک یا انباردار در «ورود موجودی ← کالای تازه» فقط با نام، مشخصات کوتاه، تعداد و بها وارد کرده است. موجودی‌شان ثبت شده و کد دارند، ولی تا عکس، مشخصات و صفحه کامل نشود در سایت دیده نمی‌شوند.</p>
      {rows.length === 0 ? <EmptyState title={view === 'open' ? 'صف تکمیل خالی است.' : 'هنوز کالایی از این صف منتشر نشده است.'} desc="کالای تازه از «مالکیت و تسویه» یا «انبار و موجودی» با دکمهٔ «ورود موجودی» و گزینهٔ «کالای تازه، یکی یا گروهی» ساخته می‌شود." action={<Button onClick={() => nav('/admin/ownership?tab=stock')}>رفتن به ورود موجودی</Button>} /> :
        <DataTable name="صف تکمیل کالای تازه" empty={{ title: 'موردی با این فیلتر نیست.' }} rows={rows} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/catalog/${p.id}/edit?step=0&from=stock`)} search={(p) => `${p.title} ${p.code} ${p.exclusive?.specs ?? ''} ${p.exclusive?.by ?? ''}`}
          cols={[
            { key: 'p', title: 'کالا', render: (p) => <div><p className="font-medium">{p.title}</p><bdi dir="ltr" className="font-mono text-11 text-t3">{p.code}</bdi>{p.exclusive?.specs && <p className="text-12 text-t2">{p.exclusive.specs}</p>}{p.exclusive?.note && <p className="text-11 text-info">یادداشت: {p.exclusive.note}</p>}</div> },
            { key: 'o', title: 'مالک و انبار', render: (p) => <span className="text-12">{partyName(s, p.exclusive!.owner)}<span className="block text-t2">{whName(s, p.exclusive!.warehouse ?? '')}</span></span> },
            { key: 'q', title: 'موجودی', render: (p) => fa(onHand(d, p.id)), sort: (p) => onHand(d, p.id) },
            { key: 'c', title: 'بها / قیمت پیشنهادی', render: (p) => <span className="text-12">{p.cost ? toman(p.cost) : '—'}<span className="block text-t2">{p.priceNew ? toman(p.priceNew) : 'بدون قیمت'}</span></span> },
            { key: 'by', title: 'واردکننده', render: (p) => <span className="text-12">{p.exclusive!.by}<span className="block text-t3">{rel(p.exclusive!.at)}</span></span>, sort: (p) => +new Date(p.exclusive!.at) },
            { key: 'f', title: 'آمادگی صفحه', render: (p) => { const c = fillChecks(p); const n = c.filter((x) => x.ok).length; return <div className="w-32"><Progress value={Math.round((n / c.length) * 100)} tone={n === c.length ? 'success' : 'warning'} /><p className="mt-1 text-11 text-t2">{n === c.length ? 'کامل' : `${fa(c.length - n)} مورد کم: ${c.filter((x) => !x.ok).slice(0, 2).map((x) => x.label).join('، ')}${c.length - n > 2 ? '…' : ''}`}</p></div> }, sort: (p) => fillChecks(p).filter((x) => x.ok).length },
            { key: 'a', title: 'مسئول', render: (p) => <div onClick={(e) => e.stopPropagation()}><Select className="w-28" value={p.exclusive!.assignee ?? ''} onChange={(v) => assign([p.id], v)} options={[['', 'بدون مسئول'], ...team.map((u) => [u.id, u.name] as [string, string])]} /></div> },
            { key: 'x', title: '', render: (p) => <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}><Button size="sm" icon={<Pencil size={13} />} onClick={() => nav(`/admin/catalog/${p.id}/edit?step=0&from=stock`)}>تکمیل</Button>{p.status === 'product.draft' ? <Button size="sm" variant="primary" icon={<Send size={13} />} onClick={() => publish([p.id])}>انتشار</Button> : <Badge tone="success"><Check size={12} />منتشر شد</Badge>}</div> },
          ]}
          bulk={(ids, clear) => <><Select className="w-40" value="" onChange={(v) => { assign(ids, v); clear() }} options={[['', `واگذاری ${fa(ids.length)} کالا به…`], ...team.map((u) => [u.id, u.name] as [string, string])]} /><Button size="sm" variant="primary" onClick={() => { publish(ids); clear() }}>انتشار آماده‌ها</Button></>} />}
    </Card>
  </div>
}
