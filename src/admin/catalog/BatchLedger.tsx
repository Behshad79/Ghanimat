import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera as Instagram, ChevronDown, FileText, PackagePlus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Progress, Select } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, pct, toman } from '@/shared/lib/fa'
import { fetchRate, type FxCur } from '@/shared/lib/fx'
import type { DB, Product } from '@/shared/data/seed'
import type { InBatch, InItem } from '@/shared/data/incoming'
import { ProductImg } from '../pages/_shared'

const CURS = ['دلار', 'درهم', 'دینار', 'تومان']
const money = (v?: number) => (v ? v.toLocaleString('en-US') : '')
const parse = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0

/** قیمت تمام‌شدهٔ هر قلم: قیمت خرید × نرخ + سهم از هزینه‌های محموله (به نسبت ارزش) */
export function batchCosts(b: InBatch) {
  const rate = b.currency === 'تومان' || !b.currency ? 1 : b.rate || 1; const extra = (b.freight ?? 0) + (b.customs ?? 0) + (b.other ?? 0)
  const value = b.items.reduce((a, it) => a + (it.unitCost ?? 0) * it.qty, 0)
  const unit = (it: InItem) => { const base = (it.unitCost ?? 0) * rate; const share = value ? (extra * (((it.unitCost ?? 0) * it.qty) / value)) / Math.max(1, it.qty) : 0; return Math.round(base + share) }
  return { rate, extra, valueFx: value, total: Math.round(value * rate + extra), unit }
}
/** فروش هر قلم از همین محموله (تخمینی، اول‌وارد‌اول‌خارج): سفارش‌های ثبت‌شده پس از رسیدن محموله، تا سقف تعداد رسیده */
export function itemSales(d: DB, b: InBatch, it: InItem) {
  const got = it.arrived?.qty ?? 0; if (!it.productId || !got || !b.receivedAt) return { got, sold: 0, revenue: 0 }
  const lines = d.orders.filter((o) => !['order.cancelled', 'order.returned'].includes(o.status) && o.createdAt >= b.receivedAt!).sort((a, c) => a.createdAt.localeCompare(c.createdAt)).flatMap((o) => o.shipments.flatMap((s) => s.items.filter((i) => i.productId === it.productId && !i.cancelled)))
  let sold = 0, revenue = 0; for (const l of lines) { const q = Math.min(Number(l.qty) || 1, got - sold); if (q <= 0) break; sold += q; revenue += l.price * q }
  return { got, sold, revenue }
}

/** «بها تا سود» هر محموله: اقلام، قیمت خرید ارزی، هزینه‌ها، قیمت تمام‌شده، پیش‌ساخت صفحه و محتوا، فروش و سود */
export function BatchLedger() {
  const d = useDB(); const nav = useNavigate(); const [open, setOpen] = useState<string | null>(d.incoming[0]?.id ?? null)
  const all = d.incoming.map((b) => { const c = batchCosts(b); const s = b.items.map((it) => ({ it, ...itemSales(d, b, it), unit: c.unit(it) })); const revenue = s.reduce((a, x) => a + x.revenue, 0); const cogs = s.reduce((a, x) => a + x.sold * x.unit, 0); const remain = s.reduce((a, x) => a + Math.max(0, (x.got || 0) - x.sold) * x.unit, 0); return { b, c, s, revenue, cogs, profit: revenue - cogs, remain } })
  const tot = all.reduce((a, x) => ({ inv: a.inv + x.c.total, rev: a.rev + x.revenue, pr: a.pr + x.profit, rem: a.rem + x.remain }), { inv: 0, rev: 0, pr: 0, rem: 0 })
  const upd = (id: string, fn: (b: InBatch) => void, action: string) => mutate((x) => { fn(x.incoming.find((y) => y.id === id)!) }, { action, target: id })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="سرمایهٔ خرید محموله‌ها" value={compactToman(tot.inv)} note={`${fa(d.incoming.length)} محموله · ${fa(d.incoming.filter((b) => !b.receivedAt).length)} در راه`} />
        <KPI label="فروش از محموله‌های رسیده" value={compactToman(tot.rev)} />
        <KPI label="سود ناخالص تا امروز" value={compactToman(tot.pr)} tone={tot.pr < 0 ? 'warning' : undefined} note={tot.rev ? `حاشیه ${pct((tot.pr / tot.rev) * 100, 1)}` : undefined} />
        <KPI label="ارزش موجودی باقی‌مانده" value={compactToman(tot.rem)} note="به قیمت تمام‌شده" />
      </div>
      {all.map(({ b, c, s, revenue, cogs, profit, remain }) => { const isOpen = open === b.id; const soldU = s.reduce((a, x) => a + x.sold, 0); const gotU = s.reduce((a, x) => a + (x.got || 0), 0); const qtyU = b.items.reduce((a, it) => a + it.qty, 0)
        return <Card key={b.id} pad={false}>
          <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-right">
            <span className="flex-1"><b className="text-14">{b.title}</b><span className="mr-2 text-11 text-t2 ltr">{b.id}</span><span className="block text-12 text-t2">{b.route} · {fa(qtyU)} عدد · {b.receivedAt ? `رسید ${new Date(b.receivedAt).toLocaleDateString('fa-IR')}` : `رسیدن حدود ${new Date(b.eta).toLocaleDateString('fa-IR')}`}</span></span>
            <Badge tone={b.receivedAt ? 'success' : 'info'}>{b.stage}</Badge>
            <span className="text-12">سرمایه <b className="tnum">{compactToman(c.total)}</b></span>
            {b.receivedAt && <span className="text-12">سود <b className={cx('tnum', profit < 0 ? 'text-danger' : 'text-success')}>{compactToman(profit)}</b></span>}
            <ChevronDown size={16} className={cx('text-t3 transition-transform', isOpen && 'rotate-180')} />
          </button>
          {isOpen && <div className="space-y-4 border-t border-line p-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Field label="ارز خرید"><Select value={b.currency ?? 'دلار'} other={false} onChange={(v) => upd(b.id, (x) => { x.currency = v }, 'تغییر ارز محموله')} options={CURS} /></Field>
              {b.currency !== 'تومان' && <Field label="نرخ روز خرید (تومان)" hint={<button type="button" className="text-11 text-brand" onClick={async () => { const r = await fetchRate((b.currency ?? 'دلار') as FxCur); upd(b.id, (x) => { x.rate = r.rate }, 'ثبت نرخ روز برای محموله'); toast(`نرخ ${b.currency} ${toman(r.rate)} گذاشته شد.`) }}><RefreshCw size={11} className="ml-0.5 inline" />نرخ روز</button>}><Input className="ltr text-left" inputMode="numeric" value={money(b.rate)} onChange={(e) => upd(b.id, (x) => { x.rate = parse(e.target.value) }, 'تغییر نرخ محموله')} /></Field>}
              {([['freight', 'حمل بین‌المللی'], ['customs', 'ترخیص و گمرک'], ['other', 'سایر (بیمه، انبار، QC)'], ['paid', 'پرداخت‌شده تا الان']] as const).map(([k, l]) => <Field key={k} label={`${l} (تومان)`}><Input className="ltr text-left" inputMode="numeric" value={money(b[k])} onChange={(e) => upd(b.id, (x) => { x[k] = parse(e.target.value) }, `تغییر ${l} محموله`)} /></Field>)}
            </div>
            <div className="overflow-x-auto rounded-xl border border-line"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['کالا', 'تعداد', `قیمت واحد (${b.currency ?? 'دلار'})`, 'جمع ارزی', 'تمام‌شدهٔ هر عدد', 'قیمت فروش فعلی', 'رسیده', 'فروخته', 'فروش', 'سود', 'مانده', ''].map((h) => <th key={h} className="p-2 text-right font-medium text-t2">{h}</th>)}</tr></thead>
              <tbody>{s.map(({ it, got, sold, revenue: rv, unit }) => { const p = it.productId ? d.products.find((x) => x.id === it.productId) : undefined; const sell = p?.price ?? (p ? d.units.find((u) => u.productId === p.id && u.price > 0)?.price : 0) ?? 0; const pr = rv - sold * unit; const content = it.productId ? d.contentQueue.filter((q) => q.productId === it.productId).length + d.blog.posts.filter((q) => q.related.includes(it.productId!)).length : 0
                const setIt = (patch: Partial<InItem>, a: string) => upd(b.id, (x) => { Object.assign(x.items.find((y) => y.id === it.id)!, patch) }, a)
                return <tr key={it.id} className="border-t border-line align-top">
                  <td className="p-2"><span className="flex items-center gap-2">{p && <ProductImg pid={p.id} size={30} />}<span><Input aria-label={`نام ${it.name}`} className="h-8 w-48 text-12" value={it.name} onChange={(e) => setIt({ name: e.target.value }, 'ویرایش نام قلم محموله')} />
                    <span className="mt-1 flex flex-wrap gap-1">{p ? <button type="button" className="text-11 text-brand underline" onClick={() => nav(`/admin/catalog/${p.id}/edit`)}>{p.status === 'product.incoming' ? 'صفحهٔ پیش‌ساخت' : 'صفحهٔ کالا'}</button> : <button type="button" className="flex items-center gap-0.5 text-11 text-brand underline" onClick={() => { const pid = `p${Date.now().toString(36)}`; mutate((x) => { x.products.unshift({ id: pid, image: '', images: [], title: it.name, en: it.name, brand: '', category: 'هدفون', status: b.receivedAt ? 'product.draft' : 'product.incoming', mode: 'qty', qty: { tehran: 0, mahabad: 0 }, priceNew: 0, rating: 0, reviews: 0, views: 0, cvr: 0, health: 20, fastEligible: false, seller: 'غنیمت', torob: false, incoming: b.id, currency: b.currency, costFx: it.unitCost, rate: b.rate, extraCost: unit - Math.round((it.unitCost ?? 0) * c.rate) } as unknown as Product); x.incoming.find((y) => y.id === b.id)!.items.find((y) => y.id === it.id)!.productId = pid }, { action: 'پیش‌ساخت صفحهٔ کالا از محموله', target: it.name }); nav(`/admin/catalog/${pid}/edit`) }}><PackagePlus size={11} />ساخت صفحهٔ پیش‌ساخت</button>}
                      {p && <><button type="button" className="flex items-center gap-0.5 text-11 text-t2 hover:text-brand" title="سناریوی معرفی پیش از رسیدن" onClick={() => { mutate((x) => { x.contentQueue.unshift({ id: `cq${Date.now().toString(36)}`, productId: p.id, channel: 'اینستاگرام', kind: 'ریلز', status: 'ایده', due: new Date(Math.max(Date.now() + 864e5, new Date(b.eta).getTime() - 864e5)).toISOString(), owner: 'پویا', note: `معرفی ${b.receivedAt ? '' : 'پیش از رسیدن '}· ${b.title}` } as never) }, { action: 'افزودن محتوای اینستاگرام از محموله', target: it.name }); toast('به صف تولید محتوا رفت.') }}><Instagram size={11} />محتوا</button>
                        <button type="button" className="flex items-center gap-0.5 text-11 text-t2 hover:text-brand" onClick={() => { const id = `ar${Date.now().toString(36)}`; mutate((x) => { x.blog.posts.unshift({ id, title: `معرفی ${it.name}`, slug: id, excerpt: '', cover: '', category: x.blog.cats[0], tags: ['به‌زودی'], author: 'تحریریهٔ غنیمت', status: 'پیش‌نویس', publishAt: new Date().toISOString(), views: 0, helpful: [0, 0], seo: { title: '', desc: '' }, related: [p.id], blocks: [{ id: `h${id}`, t: 'h2', v: '' }, { id: `p${id}`, t: 'p', html: '' }] } as never) }, { action: 'مقالهٔ معرفی از محموله', target: it.name }); nav(`/admin/blog/${id}`) }}><FileText size={11} />مقاله</button>{content > 0 && <Badge dot={false}>{fa(content)} محتوا</Badge>}</>}</span></span></span></td>
                  <td className="p-2"><Input aria-label={`تعداد ${it.name}`} className="ltr h-8 w-16 text-center" inputMode="numeric" value={it.qty} onChange={(e) => setIt({ qty: parse(e.target.value) }, 'تغییر تعداد قلم محموله')} /></td>
                  <td className="p-2"><Input aria-label={`قیمت واحد ${it.name}`} className="ltr h-8 w-24 text-left font-mono" inputMode="decimal" value={money(it.unitCost)} onChange={(e) => setIt({ unitCost: parse(e.target.value) }, 'تغییر قیمت خرید قلم محموله')} /></td>
                  <td className="tnum p-2">{fa((it.unitCost ?? 0) * it.qty)}</td>
                  <td className="tnum p-2 font-medium">{toman(unit)}</td>
                  <td className="tnum p-2">{sell ? <>{toman(sell)}<span className={cx('block text-11', sell > unit ? 'text-success' : 'text-danger')}>حاشیه {pct(((sell - unit) / sell) * 100, 1)}</span></> : <span className="text-t3">—</span>}</td>
                  <td className="tnum p-2">{b.receivedAt ? fa(got) : <span className="text-t3">در راه</span>}</td>
                  <td className="tnum p-2">{b.receivedAt ? fa(sold) : '—'}</td>
                  <td className="tnum p-2">{rv ? toman(rv) : '—'}</td>
                  <td className={cx('tnum p-2', pr < 0 ? 'text-danger' : pr > 0 ? 'text-success' : '')}>{sold ? toman(pr) : '—'}</td>
                  <td className="tnum p-2">{b.receivedAt ? fa(Math.max(0, got - sold)) : fa(it.qty)}</td>
                  <td className="p-2"><button type="button" aria-label={`حذف ${it.name}`} className="text-t3 hover:text-danger" onClick={async () => { if (await confirm({ title: `حذف «${it.name}» از محموله`, body: 'صفحهٔ کالای ساخته‌شده حذف نمی‌شود.', confirm: 'حذف', danger: true })) upd(b.id, (x) => { x.items = x.items.filter((y) => y.id !== it.id) }, 'حذف قلم از محموله') }}><Trash2 size={14} /></button></td>
                </tr> })}</tbody></table></div>
            <AddLine b={b} onAdd={(it) => upd(b.id, (x) => { x.items.push(it) }, 'افزودن قلم به محموله')} />
            <div className="grid gap-3 rounded-xl bg-surface-2 p-3 text-12 sm:grid-cols-2 lg:grid-cols-5">
              <p>ارزش خرید: <b className="tnum">{fa(c.valueFx)} {b.currency}</b><span className="block text-t2">× {toman(c.rate)} + هزینه‌ها {toman(c.extra)}</span></p>
              <p>سرمایهٔ کل محموله: <b className="tnum">{toman(c.total)}</b><span className="block text-t2">پرداخت‌شده {toman(b.paid ?? 0)} · مانده {toman(Math.max(0, c.total - (b.paid ?? 0)))}</span></p>
              <p>فروش: <b className="tnum">{toman(revenue)}</b><span className="block text-t2">{fa(soldU)} از {fa(gotU || qtyU)} عدد</span></p>
              <p>سود ناخالص: <b className={cx('tnum', profit < 0 ? 'text-danger' : 'text-success')}>{toman(profit)}</b><span className="block text-t2">{revenue ? `حاشیه ${pct((profit / revenue) * 100, 1)} · بهای فروش ${toman(cogs)}` : 'هنوز فروشی ثبت نشده'}</span></p>
              <p>مانده در انبار: <b className="tnum">{toman(remain)}</b><span className="block text-t2">بازگشت سرمایه {pct(c.total ? ((revenue) / c.total) * 100 : 0)}</span></p>
              <div className="sm:col-span-2 lg:col-span-5"><Progress value={c.total ? Math.min(100, (revenue / c.total) * 100) : 0} tone={revenue >= c.total ? 'success' : 'brand'} /><p className="mt-1 text-11 text-t2">{revenue >= c.total ? 'سرمایهٔ این محموله کامل برگشته است.' : `تا برگشت کامل سرمایه ${toman(Math.max(0, c.total - revenue))} فروش دیگر لازم است.`}</p></div>
            </div>
            <p className="text-11 text-t3">فروش هر قلم تخمینی است: سفارش‌های ثبت‌شده پس از رسیدن محموله تا سقف تعداد رسیده (اول‌وارد‌اول‌خارج). هزینه‌های حمل، ترخیص و سایر به نسبت ارزش هر قلم پخش می‌شود. برای ثبت رسید و انتشار، از «کالا و کاتالوگ ← در راه و پیش‌ساخت» استفاده کنید.</p>
          </div>}
        </Card> })}
    </div>
  )
}

function AddLine({ b, onAdd }: { b: InBatch; onAdd: (it: InItem) => void }) {
  const d = useDB(); const [n, setN] = useState(''); const [q, setQ] = useState('1'); const [u, setU] = useState(''); const [pid, setPid] = useState('')
  return <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
    <Field label="قلم تازه"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="نام کالا یا مدل" className="w-56" /></Field>
    <Field label="یا کالای موجود"><Select value={pid} onChange={(v) => { setPid(v); const p = d.products.find((x) => x.id === v); if (p && !n) setN(p.title) }} other={false} placeholder="انتخاب از کاتالوگ…" options={[['', '—'], ...d.products.map((p) => [p.id, p.title] as [string, string])]} className="w-56" /></Field>
    <Field label="تعداد"><Input className="ltr w-20 text-center" inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))} /></Field>
    <Field label={`قیمت واحد (${b.currency ?? 'دلار'})`}><Input className="ltr w-28 text-left" inputMode="decimal" value={u} onChange={(e) => setU(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
    <Button icon={<Plus size={14} />} onClick={() => { if (!n.trim() || !Number(q)) return toast('نام و تعداد را بنویسید.', { tone: 'err' }); onAdd({ id: `ii${Date.now().toString(36)}`, name: n.trim(), qty: Number(q), unitCost: Number(u) || undefined, productId: pid || undefined }); setN(''); setQ('1'); setU(''); setPid(''); toast('به محموله اضافه شد.') }}>افزودن</Button>
  </div>
}
