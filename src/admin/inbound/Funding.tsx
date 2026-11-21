// پول و مالکیت محموله: چه کسی چقدر پول به خریدار داده، کالای هر نفر چقدر ارزش دارد، و اختلاف با دلیل (خرج سفر، برگشتی، برداشت شخصی و…) تطبیق می‌شود
import { useState } from 'react'
import { CheckCircle2, CircleAlert, HandCoins, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import type { StockDB } from '@/shared/data/stock'
import type { Fund, FundAdj, InBatch } from '@/shared/data/incoming'
import { ADJ_KINDS, fundRecon, isDebt, type ReconRow } from '@/shared/data/inbound'
import { PartyChip } from '../stock/common'

const me = () => currentUser()?.name ?? 'پنل'
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const num = (t: string) => Number(t.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[^\d.]/g, '')) || 0
const pname = (s: StockDB, id: string) => s.parties.find((p) => p.id === id)?.name ?? id
const cur = (b: InBatch) => b.currency ?? 'تومان'
export const money = (n: number, c: string) => c === 'تومان' ? toman(n) : `${fa(Math.round(n * 100) / 100)} ${c}`

/** در فرم محموله: پول از کجا آمده (جدا از خریدار و جدا از مالک کالا) */
export function FundingEditor({ b, set }: { b: InBatch; set: (b: InBatch) => void }) {
  const d = useDB(); const s = d.stock; const F = b.funding ?? []; const c = cur(b)
  const upd = (i: number, patch: Partial<Fund>) => set({ ...b, funding: F.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  return <div className="mt-3 space-y-2 rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-13 font-semibold"><HandCoins size={15} className="text-brand" />پول این خرید از کجا آمده</p>
      <Button size="sm" icon={<Plus size={13} />} onClick={() => set({ ...b, funding: [...F, { id: uid('f'), party: F.some((f) => f.party === 'gh') ? (b.buyer ?? 'ys') : 'gh', amount: 0, at: new Date().toISOString(), by: me() }] })}>افزودن پول‌دهنده</Button></div>
    <p className="text-11 leading-5 text-t2">خریدار کسی است که می‌رود و می‌خرد. پول‌دهنده‌ها اینجا ثبت می‌شوند و مالک هر کالا در قدم «مالکیت» کالا. مثلاً بهشاد ۶٬۰۰۰ دلار به یاسین می‌دهد و یاسین ۱٬۵۰۰ دلار از خودش می‌گذارد؛ بعد از ثبت کالاها، پنل جمع کالای هر نفر را با پولش مقایسه می‌کند.</p>
    {F.length === 0 && <p className="rounded-lg bg-neutral-bg px-3 py-2 text-12 text-t2">هنوز ثبت نشده. اگر خریدار با پول خودش خریده، همان را اضافه کنید.</p>}
    {F.map((f, i) => <div key={f.id} className="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto]">
      <Field label={'چه کسی'}><Select value={f.party} onChange={(v) => upd(i, { party: v })} other={false} options={s.parties.filter((p) => p.active).map((p) => [p.id, p.id === b.buyer ? `${p.name} (خود خریدار)` : p.name] as [string, string])} /></Field>
      <Field label={`مبلغ (${c})`}><Input className="ltr text-left font-mono" inputMode="decimal" value={f.amount ? String(f.amount) : ''} placeholder="0" onChange={(e) => upd(i, { amount: num(e.target.value) })} aria-label="مبلغ" /></Field>
      <Field label={'روش'}><Select value={f.via ?? 'نقد'} onChange={(v) => upd(i, { via: v })} options={['نقد', 'حوالهٔ صرافی اربیل', 'کارت به کارت', 'حواله بانکی', 'از طلب قبلی']} /></Field>
      <Field label={'یادداشت'}><Input value={f.note ?? ''} onChange={(e) => upd(i, { note: e.target.value })} placeholder="مثلاً برای سهم غنیمت" /></Field>
      <button type="button" aria-label="حذف پول‌دهنده" onClick={() => set({ ...b, funding: F.filter((_, j) => j !== i) })} className="mb-1 grid size-9 place-items-center rounded-lg text-t2 hover:bg-danger-bg hover:text-danger"><Trash2 size={14} /></button>
    </div>)}
    {F.length > 0 && <p className="text-12">جمع پول: <b>{money(F.reduce((a, f) => a + f.amount, 0), c)}</b>{c !== 'تومان' && b.rate ? <span className="text-t2"> · حدود {compactToman(F.reduce((a, f) => a + f.amount, 0) * b.rate)}</span> : null}</p>}
  </div>
}

function rowText(r: ReconRow, c: string, buyer: string, s: StockDB) {
  if (r.ok) return { t: 'پول و کالا یکی است', tone: 'success' as const }
  if (r.diff > 0) return { t: `${money(r.diff, c)} از پول ${pname(s, r.party)} هنوز دست ${pname(s, buyer)} است یا دلیلش ثبت نشده`, tone: 'warning' as const }
  return { t: r.party === buyer ? `${pname(s, buyer)} ${money(-r.diff, c)} بیشتر از پولی که ثبت شده کالا برای خودش آورده` : `کالای ${pname(s, r.party)} ${money(-r.diff, c)} بیشتر از پولش است؛ ${pname(s, buyer)} این مبلغ را از جای دیگری گذاشته`, tone: 'danger' as const }
}

/** داخل کارت محموله: سهم مالک‌ها، پول هر نفر، اختلاف و دلیل‌ها */
export function FundPanel({ b, onEdit }: { b: InBatch; onEdit: () => void }) {
  const d = useDB(); const s = d.stock; const c = cur(b); const R = fundRecon(b); const buyer = b.buyer ?? 'gh'; const [adj, setAdj] = useState<string | null>(null)
  const total = R.rows.reduce((a, r) => a + r.goods, 0)
  return <div className="space-y-3 border-t border-line p-4 text-12">
    <div className="flex flex-wrap items-center gap-2"><b className="flex items-center gap-1.5 text-13"><HandCoins size={15} className="text-brand" />پول و مالکیت</b>
      <span className="text-t2">ارزش خرید {money(total, c)}{c !== 'تومان' && b.rate ? ` · حدود ${compactToman(total * b.rate)}` : ''} · خریدار: {pname(s, buyer)}</span>
      {R.hasFunding ? (b.recon ? <Badge tone="success">تطبیق تأیید شد · {b.recon.by} · {rel(b.recon.at)}</Badge> : R.ok ? <Badge tone="success">پول و کالا یکی است</Badge> : <Badge tone="warning">مغایرت دارد</Badge>) : <Badge tone="neutral">پول‌دهنده ثبت نشده</Badge>}
      <span className="mr-auto flex gap-1.5"><Button size="sm" variant="ghost" onClick={onEdit}>{R.hasFunding ? 'ویرایش پول‌دهنده‌ها' : 'ثبت پول‌دهنده'}</Button><Button size="sm" icon={<Plus size={13} />} onClick={() => setAdj(R.rows.find((r) => !r.ok)?.party ?? buyer)}>ثبت دلیل اختلاف</Button>
        {R.hasFunding && !b.recon && <Button size="sm" variant={R.ok ? 'primary' : 'secondary'} icon={<CheckCircle2 size={13} />} onClick={() => mutate((x) => { x.incoming.find((q) => q.id === b.id)!.recon = { at: new Date().toISOString(), by: me(), note: R.ok ? undefined : `با مغایرت ${money(R.diff, c)}` } }, { action: 'تأیید تطبیق پول و کالای محموله', target: b.id, after: R.ok ? 'بدون مغایرت' : `مغایرت ${money(R.diff, c)}` })}>تأیید تطبیق</Button>}
        {b.recon && <Button size="sm" variant="ghost" onClick={() => mutate((x) => { delete x.incoming.find((q) => q.id === b.id)!.recon }, { action: 'باز کردن دوبارهٔ تطبیق محموله', target: b.id })}>باز کردن دوباره</Button>}</span></div>
    {/* سهم مالک‌ها از ارزش خرید */}
    {total > 0 && <div><div className="flex h-3 overflow-hidden rounded-full bg-neutral-bg">{R.rows.filter((r) => r.goods > 0).map((r) => { const p = s.parties.find((q) => q.id === r.party); return <span key={r.party} title={`${p?.name}: ${money(r.goods, c)}`} style={{ width: `${(r.goods / total) * 100}%`, background: p?.color ?? '#888' }} /> })}</div>
      <div className="mt-1.5 flex flex-wrap gap-3">{R.rows.filter((r) => r.goods > 0).map((r) => { const p = s.parties.find((q) => q.id === r.party); return <span key={r.party} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: p?.color }} />{p?.name} <b>{fa(Math.round((r.goods / total) * 100))}٪</b><span className="text-t2">({money(r.goods, c)} · {fa(r.qty)} عدد)</span></span> })}</div></div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="bg-surface-2 text-t2">{['نفر', 'پول داده', 'ارزش کالای مالکیتش', 'توضیح‌داده‌شده', 'مانده', 'تمام‌شده با حمل و گمرک', 'وضعیت'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {R.rows.map((r) => { const v = rowText(r, c, buyer, s); return <tr key={r.party} className="border-t border-line align-top">
        <td className="p-2"><span className="flex items-center gap-1.5"><PartyChip s={s} id={r.party} />{r.party === buyer && <span className="text-11 text-t3">خریدار</span>}</span></td>
        <td className="p-2 tnum">{r.paid ? money(r.paid, c) : <span className="text-t3">—</span>}</td>
        <td className="p-2 tnum">{r.goods ? money(r.goods, c) : <span className="text-t3">کالایی ندارد</span>}</td>
        <td className="p-2 tnum">{r.explained ? money(r.explained, c) : '—'}{r.debt > 0 && <span className="block text-11 text-danger">{money(r.debt, c)} بدهی خریدار</span>}</td>
        <td className={cx('p-2 font-semibold tnum', r.ok ? 'text-success' : r.diff > 0 ? 'text-warning' : 'text-danger')}>{r.ok ? '۰' : `${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff), c)}`}</td>
        <td className="p-2 tnum">{r.toman ? toman(r.toman) : '—'}{r.extra > 0 && <span className="block text-11 text-t3">سهم حمل و گمرک {compactToman(r.extra)}</span>}</td>
        <td className="p-2"><span className={cx('flex items-start gap-1', v.tone === 'success' ? 'text-success' : v.tone === 'warning' ? 'text-warning' : 'text-danger')}>{v.tone === 'success' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <CircleAlert size={13} className="mt-0.5 shrink-0" />}{v.t}</span>{!r.ok && <button type="button" className="mt-1 text-11 font-semibold text-brand" onClick={() => setAdj(r.party)}>دلیلش را ثبت کنید</button>}</td>
      </tr> })}
      {R.rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-t2">هنوز نه کالایی ثبت شده و نه پولی.</td></tr>}
    </tbody></table></div>
    {(b.adjusts ?? []).length > 0 && <ul className="space-y-1">{(b.adjusts ?? []).map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-bg/70 px-3 py-1.5"><Badge tone={isDebt(a) ? 'danger' : 'neutral'} dot={false}>{a.kind}</Badge><span>{pname(s, a.party)}</span><b className="tnum">{money(a.amount, c)}</b>{a.note && <span className="text-t2">{a.note}</span>}<span className="mr-auto text-11 text-t3">{a.by} · {rel(a.at)}</span>{!b.recon && <button type="button" aria-label="حذف دلیل" className="text-t3 hover:text-danger" onClick={() => mutate((x) => { const bb = x.incoming.find((q) => q.id === b.id)!; bb.adjusts = (bb.adjusts ?? []).filter((q) => q.id !== a.id) }, { action: 'حذف دلیل اختلاف محموله', target: `${b.id} · ${a.kind}` })}><Trash2 size={13} /></button>}</li>)}</ul>}
    {adj && <AdjModal b={b} party={adj} onClose={() => setAdj(null)} />}
  </div>
}

function AdjModal({ b, party, onClose }: { b: InBatch; party: string; onClose: () => void }) {
  const d = useDB(); const s = d.stock; const c = cur(b); const R = fundRecon(b); const row = R.rows.find((r) => r.party === party)
  const [f, setF] = useState<FundAdj>({ id: uid('a'), party, amount: row && row.diff > 0 ? row.diff : 0, kind: ADJ_KINDS[0].k, at: new Date().toISOString(), by: me() })
  const save = () => { if (!f.amount) return toast('مبلغ را بنویسید.', { tone: 'err' }); mutate((x) => { const bb = x.incoming.find((q) => q.id === b.id)!; bb.adjusts = [...(bb.adjusts ?? []), f]; delete bb.recon }, { action: 'ثبت دلیل اختلاف پول و کالا', target: `${b.id} · ${pname(s, f.party)}`, after: `${f.kind} · ${money(f.amount, c)}` }); toast('دلیل ثبت شد و جدول تطبیق به‌روز شد.'); onClose() }
  return <Modal open onClose={onClose} title={`دلیل اختلاف · ${b.title}`} footer={<><Button variant="primary" onClick={save}>ثبت</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="از سهم چه کسی"><Select value={f.party} onChange={(v) => setF({ ...f, party: v, amount: (() => { const r = R.rows.find((q) => q.party === v); return r && r.diff > 0 ? r.diff : f.amount })() })} other={false} options={R.rows.map((r) => [r.party, pname(s, r.party)] as [string, string])} /></Field>
      <Field label={`مبلغ (${c})`}><Input className="ltr text-left font-mono" inputMode="decimal" value={f.amount ? String(f.amount) : ''} onChange={(e) => setF({ ...f, amount: num(e.target.value) })} /></Field>
      <div className="sm:col-span-2"><Field label="دلیل"><div className="flex flex-wrap gap-1.5">{ADJ_KINDS.map((k) => <button key={k.k} type="button" aria-pressed={f.kind === k.k} onClick={() => setF({ ...f, kind: k.k })} className={cx('rounded-full border px-2.5 py-1 text-12', f.kind === k.k ? (k.debt ? 'border-danger bg-danger-bg font-semibold text-danger' : 'border-brand bg-brand-tint font-semibold text-brand') : 'border-line hover:border-brand/50')}>{k.k}</button>)}</div></Field></div>
      <div className="sm:col-span-2"><Field label="توضیح"><Input value={f.note ?? ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={f.kind.startsWith('خرج سفر') ? 'مثلاً هتل دو شب و کرایهٔ ماشین تا مرز' : 'جزئیات برای سوابق'} /></Field></div>
    </div>
    {row && <p className="mt-3 rounded-lg bg-neutral-bg px-3 py-2 text-12 text-t2">الان برای {pname(s, f.party)}: پول {money(row.paid, c)} · کالا {money(row.goods, c)} · توضیح‌داده‌شده {money(row.explained, c)} · مانده {money(row.diff, c)}</p>}
    {ADJ_KINDS.find((k) => k.k === f.kind)?.debt && <p className="mt-2 rounded-lg bg-danger-bg px-3 py-2 text-12 text-danger">این مبلغ به‌عنوان بدهی خریدار ({pname(s, b.buyer ?? 'gh')}) به {pname(s, f.party)} در جدول تطبیق و داده‌های خرید نمایش داده می‌شود.</p>}
  </Modal>
}

/** بالای لیست خرید: داده‌های همهٔ محموله‌ها، ارزش، سهم مالک‌ها، پول‌دهنده‌ها و مغایرت */
export function FundOverview() {
  const d = useDB(); const s = d.stock; const B = d.incoming.filter((b) => !b.single && b.items.length)
  const per = new Map<string, { paid: number; goods: number; debt: number; open: number }>()
  const rows = B.map((b) => { const R = fundRecon(b); const rate = cur(b) === 'تومان' ? 1 : b.rate || 0
    if (R.hasFunding) R.rows.forEach((r) => { const p = per.get(r.party) ?? { paid: 0, goods: 0, debt: 0, open: 0 }; p.paid += r.paid * rate; p.goods += r.goods * rate; p.debt += r.debt * rate; if (R.hasFunding && !r.ok) p.open += r.diff * rate; per.set(r.party, p) })
    return { b, R, rate } })
  return <Card title={<span className="flex items-center gap-1.5"><HandCoins size={15} />داده‌های خرید: پول و مالکیت</span>} defaultOpen pad={false}>
    <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-2 xl:grid-cols-4">{per.size === 0 && <p className="text-12 text-t2 sm:col-span-4">برای هیچ محموله‌ای پول‌دهنده ثبت نشده؛ از «محموله ← ویرایش» بنویسید چه کسی چقدر پول داده.</p>}{[...per].map(([id, p]) => <div key={id} className="rounded-xl border border-line p-3 text-12"><PartyChip s={s} id={id} /><div className="mt-2 grid grid-cols-2 gap-1"><span className="col-span-2 text-11 text-t3">فقط محموله‌هایی که پول‌دهنده دارند</span><span className="text-t2">پول داده</span><b className="tnum">{compactToman(p.paid)}</b><span className="text-t2">کالای مالکیتش</span><b className="tnum">{compactToman(p.goods)}</b>{p.debt > 0 && <><span className="text-danger">بدهی خریدار</span><b className="tnum text-danger">{compactToman(p.debt)}</b></>}<span className="text-t2">مغایرت باز</span><b className={cx('tnum', Math.abs(p.open) < 1 ? 'text-success' : 'text-warning')}>{Math.abs(p.open) < 1 ? 'ندارد' : compactToman(p.open)}</b></div></div>)}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-12"><thead><tr className="bg-surface-2 text-t2">{['محموله', 'خریدار', 'ارزش خرید', 'سهم مالک‌ها', 'پول‌دهنده‌ها', 'مانده', 'وضعیت'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>
      {rows.map(({ b, R }) => { const c = cur(b); return <tr key={b.id} className="border-t border-line">
        <td className="p-2"><b>{b.title}</b><span className="block text-11 text-t3">{b.id}</span></td>
        <td className="p-2">{b.buyer ? <PartyChip s={s} id={b.buyer} /> : '—'}</td>
        <td className="p-2 tnum">{money(R.goods, c)}</td>
        <td className="p-2">{R.rows.filter((r) => r.goods > 0).map((r) => <span key={r.party} className="block">{pname(s, r.party)} <b>{fa(Math.round((r.goods / (R.goods || 1)) * 100))}٪</b> <span className="text-t2">{money(r.goods, c)}</span></span>)}</td>
        <td className="p-2">{R.hasFunding ? R.rows.filter((r) => r.paid > 0).map((r) => <span key={r.party} className="block">{pname(s, r.party)} <span className="text-t2">{money(r.paid, c)}</span></span>) : <span className="text-t3">ثبت نشده</span>}</td>
        <td className={cx('p-2 font-semibold tnum', !R.hasFunding ? 'text-t3' : R.ok ? 'text-success' : 'text-warning')}>{!R.hasFunding ? '—' : R.ok ? '۰' : R.rows.filter((r) => !r.ok).map((r) => `${pname(s, r.party)} ${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff), c)}`).join('، ')}</td>
        <td className="p-2">{!R.hasFunding ? <Badge tone="neutral">پول‌دهنده ندارد</Badge> : b.recon ? <Badge tone="success">تأیید شد</Badge> : R.ok ? <Badge tone="info">آمادهٔ تأیید</Badge> : <Badge tone="warning">مغایرت</Badge>}</td>
      </tr> })}
      {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-t2">محموله‌ای با کالا ثبت نشده است.</td></tr>}
    </tbody></table></div>
    <p className="border-t border-line px-3 py-2 text-11 text-t3">ارزش‌ها به تومان با نرخ ارز هر محموله تبدیل شده‌اند. «مانده» یعنی پولی که نه به کالا رسیده و نه دلیلش ثبت شده؛ منفی یعنی کالای آن نفر بیشتر از پولش است.</p>
  </Card>
}
