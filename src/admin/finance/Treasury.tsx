import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, BellPlus, Check, FileText, Landmark, MessageSquare, PiggyBank, Plus, Printer, Receipt, RefreshCw, Scale, TrendingDown, Wallet, X } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { MoneyInput } from '@/shared/ui/money'
import { printSolo } from '@/shared/lib/printSolo'
import { canSecret, currentUser, effectiveRole, mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, num, rel, toman } from '@/shared/lib/fa'
import { counted, orderProfit } from '@/shared/lib/profit'
import type { DB } from '@/shared/data/seed'
import { ACC_KIND, balanceOf, fxToman, KIND_LABEL, monthKey, nextDue, T_CATS, type TAccount, type TEntry, type TRecurring } from '@/shared/data/treasury'
import { useTab } from '../pages/_shared'

const uid = (p: string) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`
const me = () => currentUser()?.name ?? 'پنل'
const isChiefNow = () => effectiveRole() === 'super'
const day = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')
const mName = (k: string) => new Date(`${k}-15`).toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })
const months = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(15); d.setMonth(d.getMonth() - (n - 1 - i)); return monthKey(d) })
const usdRate = (d: DB) => Math.round(((d.storeCfg?.fx?.rates?.['دلار'] ?? 60000) * 1.12) / 100) * 100

/** حسابداری و خزانه */
export function Treasury() {
  const d = useDB(); const T = d.treasury; const [tab, setTab] = useTab('overview'); const [modal, setModal] = useState<null | { kind: TEntry['kind']; pre?: Partial<TEntry> }>(null)
  const pend = T.entries.filter((e) => e.status === 'approval'); const unmatched = T.sms.filter((s) => !s.entry && s.dir === 'out')
  const dueSoon = T.recurring.filter((r) => r.active && +new Date(r.next) - Date.now() < 14 * 864e5)
  return <Page module="treasury" title="حسابداری و خزانه" sub="پولِ خودِ کسب‌وکار: حساب‌ها، هزینه‌ها و مستندها، اشتراک‌ها، سرمایه و برداشت شرکا، بودجه و سود و زیان واقعی"
    actions={<><Button icon={<ArrowLeftRight size={14} />} onClick={() => setModal({ kind: 'transfer' })}>انتقال بین حساب‌ها</Button><Button icon={<PiggyBank size={14} />} onClick={() => setModal({ kind: 'capital' })}>ورود سرمایه</Button></>}
    primary={<Button variant="primary" icon={<Receipt size={14} />} onClick={() => setModal({ kind: 'expense' })}>ثبت هزینه</Button>}
    tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'نمای کلی' }, { id: 'accounts', label: 'حساب‌ها و پیامک بانک', count: unmatched.length || undefined }, { id: 'ledger', label: 'دفتر هزینه و درآمد', count: pend.length || undefined }, { id: 'recurring', label: 'اشتراک‌ها و پرداخت‌های تکراری', count: dueSoon.length || undefined }, { id: 'capital', label: 'سرمایه و شرکا' }, { id: 'budget', label: 'بودجه و برآورد' }, { id: 'pnl', label: 'سود و زیان' }]} />}>
    {tab === 'overview' && <Overview onAdd={(k, pre) => setModal({ kind: k, pre })} go={setTab} />}
    {tab === 'accounts' && <Accounts onAdd={(k, pre) => setModal({ kind: k, pre })} />}
    {tab === 'ledger' && <Ledger onAdd={(k) => setModal({ kind: k })} />}
    {tab === 'recurring' && <Recurring />}
    {tab === 'capital' && <Capital onAdd={(k) => setModal({ kind: k })} />}
    {tab === 'budget' && <Budget />}
    {tab === 'pnl' && <Pnl />}
    <EntryModal m={modal} onClose={() => setModal(null)} />
  </Page>
}

const liquid = (d: DB) => d.treasury.accounts.filter((a) => a.active && ['bank', 'card', 'cash', 'fx'].includes(a.kind)).reduce((s, a) => s + balanceOf(d.treasury, a.id), 0)
const burnOf = (d: DB, mk: string) => d.treasury.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && monthKey(e.at) === mk).reduce((s, e) => s + e.amount, 0)

function Overview({ onAdd, go }: { onAdd: (k: TEntry['kind'], pre?: Partial<TEntry>) => void; go: (t: string) => void }) {
  const d = useDB(); const T = d.treasury; const M = months(3); const burn = M.map((m) => burnOf(d, m)); const avg = Math.round(burn.reduce((a, b) => a + b, 0) / Math.max(1, burn.filter(Boolean).length))
  const cap = T.accounts.filter((a) => a.kind === 'capital').reduce((s, a) => s + balanceOf(T, a.id), 0); const liq = liquid(d); const runway = avg ? (liq + cap) / avg : 0
  const thisM = monthKey(new Date()); const budgetTot = Object.values(T.budgets).reduce((a, b) => a + b, 0); const spent = burnOf(d, thisM)
  const byCat = T_CATS.map((c) => ({ c, v: T.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && e.category === c && monthKey(e.at) === thisM).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v).sort((a, b) => b.v - a.v); const mx = Math.max(1, ...byCat.map((x) => x.v))
  const pend = T.entries.filter((e) => e.status === 'approval')
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-brand-solid p-5 text-white"><p className="text-12 text-white/80">نقد در دسترس</p><p className="mt-1 text-22 font-bold">{toman(liq)}</p><p className="text-11 text-white/75">حساب جاری، تنخواه، صندوق و کیف ارزی</p></div>
      <Card onClick={() => go('capital')}><p className="text-12 text-t2">حساب سرمایه (جدا)</p><p className="mt-1 text-22 font-bold text-success">{toman(cap)}</p><p className="text-11 text-t2">فقط با «انتقال» خرج می‌شود</p></Card>
      <Card onClick={() => go('budget')}><p className="text-12 text-t2">هزینهٔ این ماه</p><p className="mt-1 text-22 font-bold">{toman(spent)}</p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full', spent > budgetTot ? 'bg-danger' : 'bg-brand-solid')} style={{ width: `${Math.min(100, (spent / Math.max(1, budgetTot)) * 100)}%` }} /></div><p className="mt-1 text-11 text-t2">از بودجهٔ {compactToman(budgetTot)}</p></Card>
      <Card><p className="flex items-center gap-1 text-12 text-t2"><TrendingDown size={13} />سرعت خرج و دوام (Runway)</p><p className="mt-1 text-22 font-bold">{runway ? `${fa(runway.toFixed(1))} ماه` : '—'}</p><p className="text-11 text-t2">میانگین خرج ماهانه {compactToman(avg)} · نقد + سرمایه</p></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <Card title="موجودی هر حساب" actions={<button className="text-12 text-brand" onClick={() => go('accounts')}>مدیریت حساب‌ها</button>}><div className="grid gap-2 sm:grid-cols-2">{T.accounts.filter((a) => a.active).map((a) => <AccChip key={a.id} a={a} />)}</div></Card>
      <div className="space-y-4">
        {pend.length > 0 && <Card title={<span className="flex items-center gap-1.5">منتظر تأیید<Badge tone="warning">{fa(pend.length)}</Badge></span>}><ul className="space-y-2">{pend.map((e) => <Approve key={e.id} e={e} />)}</ul></Card>}
        <Card title="پرداخت‌های پیش رو (۱۴ روز)" actions={<button className="text-12 text-brand" onClick={() => go('recurring')}>همه</button>}>{(() => { const L = T.recurring.filter((r) => r.active && +new Date(r.next) - Date.now() < 14 * 864e5).sort((a, b) => a.next.localeCompare(b.next)); return L.length ? <ul className="space-y-1.5 text-12">{L.map((r) => <li key={r.id} className="flex items-center gap-2"><b className="flex-1">{r.title}</b><span className="text-t2">{rel(r.next)}</span><span className="font-medium">{r.fx ? `${fa(r.fx.amount)} دلار` : toman(r.amount)}</span></li>)}</ul> : <p className="text-12 text-t2">در دو هفتهٔ آینده پرداختی نیست.</p> })()}</Card>
        {T.sms.some((s) => !s.entry && s.dir === 'out') && <Card><p className="flex items-center gap-2 text-13"><MessageSquare size={15} className="text-warning" /><b>{fa(T.sms.filter((s) => !s.entry && s.dir === 'out').length)} برداشت کارت بی‌دسته</b><span className="flex-1" /><Button size="sm" onClick={() => go('accounts')}>دسته‌بندی</Button></p><p className="mt-1 text-11 text-t2">از پیامک بانک خوانده شد؛ فقط دسته و مستندش را کامل کنید.</p></Card>}
      </div>
    </div>
    <Card title={`هزینهٔ ${mName(thisM)} به تفکیک دسته`} actions={<Button size="sm" icon={<Plus size={13} />} onClick={() => onAdd('expense')}>ثبت هزینه</Button>}>{byCat.length ? <ul className="space-y-2">{byCat.map((x) => <li key={x.c} className="text-12"><div className="flex justify-between"><span>{x.c}</span><b>{toman(x.v)}</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-brand-solid" style={{ width: `${(x.v / mx) * 100}%` }} /></div></li>)}</ul> : <p className="text-12 text-t2">این ماه هزینه‌ای ثبت نشده است.</p>}</Card>
  </div>
}

function AccChip({ a }: { a: TAccount }) {
  const d = useDB(); const b = balanceOf(d.treasury, a.id)
  return <div className="rounded-xl border border-line p-3" style={{ borderInlineStartWidth: 4, borderInlineStartColor: a.color }}><p className="flex items-center gap-1.5 text-12 text-t2">{a.kind === 'capital' ? <PiggyBank size={13} /> : a.kind === 'gateway' ? <RefreshCw size={13} /> : <Landmark size={13} />}{ACC_KIND[a.kind]}{a.restricted && <Badge tone="success" dot={false}>محدود</Badge>}</p><p className="mt-0.5 text-13 font-semibold">{a.name}</p><p className={cx('mt-1 text-16 font-bold', b < 0 && 'text-danger')}>{toman(b)}</p><p className="text-11 text-t3">{[a.bank, a.last4 && `•••• ${a.last4}`].filter(Boolean).join(' · ')}</p></div>
}

function Approve({ e }: { e: TEntry }) {
  const chief = isChiefNow()
  const act = (ok: boolean) => mutate((x) => { const y = x.treasury.entries.find((q) => q.id === e.id)!; y.status = ok ? 'paid' : 'rejected'; y.approvedBy = me(); const ap = x.approvals.find((q) => q.ref === e.id); if (ap) ap.status = ok ? 'approval.approved' : 'approval.rejected' }, { action: ok ? 'تأیید هزینه' : 'رد هزینه', target: `${e.note ?? e.category} · ${toman(e.amount)}`, sensitive: true } as never)
  return <li className="rounded-lg border border-warning/40 bg-warning-bg/30 p-2.5 text-12"><p className="flex flex-wrap items-center gap-1.5"><b>{e.vendor ?? e.category}</b><span>{toman(e.amount)}</span><span className="text-t2">· {e.by} · {rel(e.at)}</span></p><p className="text-t2">{e.note}</p>{chief ? <div className="mt-1.5 flex gap-2"><Button size="sm" variant="primary" icon={<Check size={13} />} onClick={() => act(true)}>تأیید و پرداخت</Button><Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => act(false)}>رد</Button></div> : <p className="mt-1 text-11 text-warning">منتظر تأیید مدیر کل</p>}</li>
}

function Accounts({ onAdd }: { onAdd: (k: TEntry['kind'], pre?: Partial<TEntry>) => void }) {
  const d = useDB(); const T = d.treasury; const [edit, setEdit] = useState<TAccount | null>(null); const [rec, setRec] = useState<{ id: string; v: number } | null>(null)
  return <div className="space-y-4">
    <Card title="حساب‌ها" actions={<Button size="sm" icon={<Plus size={13} />} onClick={() => setEdit({ id: '', name: '', kind: 'bank', opening: 0, color: '#0000ff', active: true })}>حساب تازه</Button>}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{T.accounts.map((a) => { const b = balanceOf(T, a.id); const n = T.entries.filter((e) => e.status === 'paid' && (e.from === a.id || e.to === a.id)).length
        return <div key={a.id} className={cx('rounded-2xl border border-line p-3.5', !a.active && 'opacity-50')} style={{ borderTopWidth: 4, borderTopColor: a.color }}>
          <div className="flex items-start justify-between gap-2"><div><p className="text-12 text-t2">{ACC_KIND[a.kind]}{a.sms && ' · پیامک بانک وصل'}</p><p className="text-14 font-semibold">{a.name}</p></div><button className="text-12 text-brand" onClick={() => setEdit(a)}>ویرایش</button></div>
          <p className={cx('mt-2 text-20 font-bold', b < 0 && 'text-danger')}>{toman(b)}</p><p className="text-11 text-t3">{[a.bank, a.last4 && `کارت یا حساب •••• ${a.last4}`].filter(Boolean).join(' · ')} · {fa(n)} ردیف</p>
          {a.note && <p className="mt-1 text-11 text-t2">{a.note}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5"><Button size="sm" variant="ghost" onClick={() => onAdd('transfer', { from: a.id })}>انتقال از این حساب</Button><Button size="sm" variant="ghost" icon={<Scale size={12} />} onClick={() => setRec({ id: a.id, v: b })}>تطبیق با بانک</Button></div>
        </div> })}</div>
    </Card>
    <Card title={<span className="flex items-center gap-1.5"><MessageSquare size={15} />پیامک‌های بانک</span>} hint="پیامک واریز و برداشت حساب‌هایی که «پیامک بانک وصل» دارند خوانده می‌شود. هر برداشت بی‌دسته را با یک کلیک به هزینه تبدیل کنید تا هیچ خرجی از قلم نیفتد.">
      <ul className="space-y-2">{T.sms.map((s) => { const a = T.accounts.find((x) => x.id === s.account); return <li key={s.id} className={cx('flex flex-wrap items-start gap-3 rounded-xl border p-3 text-12', s.entry ? 'border-line opacity-70' : s.dir === 'out' ? 'border-warning/50 bg-warning-bg/20' : 'border-line')}>
        <pre className="min-w-48 whitespace-pre-wrap font-sans text-11 leading-5 text-t2">{s.text}</pre>
        <div className="flex-1"><p className="flex flex-wrap items-center gap-1.5"><Badge tone={s.dir === 'out' ? 'warning' : 'success'} dot={false}>{s.dir === 'out' ? 'برداشت' : 'واریز'}</Badge><b>{toman(s.amount)}</b><span className="text-t2">{a?.name} · {rel(s.at)}</span></p>{s.entry && <p className="mt-1 text-success">ثبت شد در دفتر ({s.entry})</p>}</div>
        {!s.entry && <div className="flex flex-wrap gap-1.5">{s.dir === 'out' ? <Button size="sm" variant="primary" onClick={() => onAdd('expense', { from: s.account, amount: s.amount, at: s.at, sms: s.id, vendor: s.text.split('\n')[3] ?? '' })}>ثبت به‌عنوان هزینه</Button> : <Button size="sm" variant="primary" onClick={() => onAdd('income', { to: s.account, amount: s.amount, at: s.at, sms: s.id })}>ثبت واریز</Button>}
          <MatchBtn s={s} /></div>}
      </li> })}</ul>
    </Card>
    {edit && <AccountModal a={edit} onClose={() => setEdit(null)} />}
    <Modal open={!!rec} onClose={() => setRec(null)} title="تطبیق با موجودی بانک" footer={<Button variant="ghost" onClick={() => setRec(null)}>بستن</Button>}>{rec && (() => { const b = balanceOf(T, rec.id); const diff = rec.v - b; return <div className="space-y-3 text-13"><p>موجودی این حساب در پنل: <b>{toman(b)}</b></p><Field label="موجودی واقعی در بانک (از همراه‌بانک یا صورت‌حساب)"><MoneyInput value={rec.v} onChange={(v) => setRec({ ...rec, v })} aria-label="موجودی بانک" /></Field>
      {diff === 0 ? <p className="rounded-lg bg-success-bg px-3 py-2 text-success">مطابق است.</p> : <div className="space-y-2"><p className={cx('rounded-lg px-3 py-2', diff < 0 ? 'bg-danger-bg text-danger' : 'bg-info-bg text-info')}>مغایرت {toman(Math.abs(diff))}: {diff < 0 ? 'در بانک کمتر است؛ احتمالاً هزینه‌ای ثبت نشده.' : 'در بانک بیشتر است؛ احتمالاً واریزی ثبت نشده.'}</p><Button variant="primary" onClick={() => { const ac = rec.id; setRec(null); onAdd(diff < 0 ? 'expense' : 'income', diff < 0 ? { from: ac, amount: -diff, category: 'سایر', note: 'مغایرت تطبیق با بانک' } : { to: ac, amount: diff, note: 'مغایرت تطبیق با بانک' }) }}>{diff < 0 ? 'ثبت هزینهٔ جاافتاده' : 'ثبت واریز جاافتاده'}</Button></div>}</div> })()}</Modal>
  </div>
}

function MatchBtn({ s }: { s: DB['treasury']['sms'][number] }) {
  const d = useDB(); const c = d.treasury.entries.find((e) => e.status === 'paid' && e.amount === s.amount && (e.from === s.account || e.to === s.account) && Math.abs(+new Date(e.at) - +new Date(s.at)) < 4 * 864e5)
  if (!c) return null
  return <Button size="sm" variant="ghost" onClick={() => mutate((x) => { x.treasury.sms.find((q) => q.id === s.id)!.entry = c.id }, { action: 'تطبیق پیامک بانک با ردیف دفتر', target: c.id })}>تطبیق با «{c.note?.slice(0, 22) ?? c.id}»</Button>
}

function AccountModal({ a, onClose }: { a: TAccount; onClose: () => void }) {
  const [f, setF] = useState(a); const set = (p: Partial<TAccount>) => setF({ ...f, ...p })
  const save = () => { if (!f.name.trim()) return toast('نام حساب را بنویسید.', { tone: 'err' }); mutate((x) => { const i = x.treasury.accounts.findIndex((y) => y.id === f.id); if (i >= 0) x.treasury.accounts[i] = f; else x.treasury.accounts.push({ ...f, id: uid('ACC') }) }, { action: f.id ? 'ویرایش حساب خزانه' : 'افزودن حساب خزانه', target: f.name }); toast('ذخیره شد.'); onClose() }
  return <Modal open onClose={onClose} title={f.id ? 'ویرایش حساب' : 'حساب تازه'} footer={<><Button variant="primary" onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="نام حساب"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً حساب جاری ملت" /></Field>
      <Field label="نوع"><Select value={f.kind} onChange={(v) => set({ kind: v as TAccount['kind'], restricted: v === 'capital' })} options={Object.entries(ACC_KIND) as [string, string][]} /></Field>
      <Field label="بانک"><Input value={f.bank ?? ''} onChange={(e) => set({ bank: e.target.value })} /></Field>
      <Field label="چهار رقم آخر کارت یا حساب"><Input className="ltr text-left" maxLength={4} value={f.last4 ?? ''} onChange={(e) => set({ last4: e.target.value })} /></Field>
      <Field label="شبا (اختیاری)"><Input className="ltr text-left font-mono" value={f.iban ?? ''} onChange={(e) => set({ iban: e.target.value })} /></Field>
      <Field label="مانده اول (تومان)"><MoneyInput value={f.opening} onChange={(v) => set({ opening: v })} aria-label="مانده اول" /></Field>
      <div className="flex flex-wrap gap-4 sm:col-span-2"><Toggle on={!!f.sms} onChange={(v) => set({ sms: v })} text="پیامک بانک این حساب خوانده شود" /><Toggle on={!!f.restricted} onChange={(v) => set({ restricted: v })} text="محدود: فقط انتقال (حساب سرمایه)" /><Toggle on={f.active} onChange={(v) => set({ active: v })} text="فعال" /></div>
      <Field label="یادداشت"><Input value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></Field>
    </div>
  </Modal>
}

function Ledger({ onAdd }: { onAdd: (k: TEntry['kind']) => void }) {
  const d = useDB(); const T = d.treasury; const [kind, setKind] = useState('all'); const [cat, setCat] = useState('all'); const [acc, setAcc] = useState('all'); const [m, setM] = useState('all'); const [open, setOpen] = useState<TEntry | null>(null)
  const rows = T.entries.filter((e) => (kind === 'all' || e.kind === kind) && (cat === 'all' || e.category === cat) && (acc === 'all' || e.from === acc || e.to === acc) && (m === 'all' || monthKey(e.at) === m)).sort((a, b) => b.at.localeCompare(a.at))
  const an = (id?: string) => T.accounts.find((a) => a.id === id)?.name ?? '—'
  return <div className="space-y-4">
    <Card><div className="flex flex-wrap items-end gap-3">
      <label className="text-12"><span className="mb-1 block text-t2">نوع</span><Select className="w-40" value={kind} onChange={setKind} options={[['all', 'همه'], ...Object.entries(KIND_LABEL)] as [string, string][]} /></label>
      <label className="text-12"><span className="mb-1 block text-t2">دسته</span><Select className="w-52" value={cat} onChange={setCat} options={[['all', 'همهٔ دسته‌ها'], ...T_CATS.map((c) => [c, c] as [string, string])]} /></label>
      <label className="text-12"><span className="mb-1 block text-t2">حساب</span><Select className="w-44" value={acc} onChange={setAcc} options={[['all', 'همهٔ حساب‌ها'], ...T.accounts.map((a) => [a.id, a.name] as [string, string])]} /></label>
      <label className="text-12"><span className="mb-1 block text-t2">ماه</span><Select className="w-40" value={m} onChange={setM} options={[['all', 'همهٔ ماه‌ها'], ...months(4).reverse().map((k) => [k, mName(k)] as [string, string])]} /></label>
      <span className="flex-1" /><div className="flex flex-wrap gap-1.5">{(['expense', 'income', 'transfer', 'capital', 'draw'] as TEntry['kind'][]).map((k) => <Button key={k} size="sm" variant={k === 'expense' ? 'primary' : 'ghost'} onClick={() => onAdd(k)}>{KIND_LABEL[k]}</Button>)}</div>
    </div></Card>
    <Card pad={false}><DataTable name="دفتر خزانه" rows={rows} rowKey={(e) => e.id} onRow={setOpen} search={(e) => `${e.id} ${e.vendor ?? ''} ${e.note ?? ''} ${e.category ?? ''}`} empty={{ title: 'ردیفی نیست.' }}
      cols={[{ key: 'at', title: 'تاریخ', render: (e) => <span className="text-12">{day(e.at)}</span>, sort: (e) => +new Date(e.at) },
        { key: 'k', title: 'نوع', render: (e) => <Badge tone={e.kind === 'expense' || e.kind === 'draw' ? 'warning' : e.kind === 'transfer' ? 'neutral' : 'success'} dot={false}>{KIND_LABEL[e.kind]}</Badge> },
        { key: 'd', title: 'شرح', render: (e) => <span className="text-12"><b>{e.vendor ?? e.category ?? KIND_LABEL[e.kind]}</b>{e.fx && <span className="mr-1 text-t3">({fa(e.fx.amount)} {e.fx.cur})</span>}<span className="block text-11 text-t2">{e.note}</span></span> },
        { key: 'c', title: 'دسته', render: (e) => <span className="text-12">{e.category ?? '—'}</span> },
        { key: 'a', title: 'حساب', render: (e) => <span className="text-12">{e.kind === 'transfer' ? `${an(e.from)} ← ${an(e.to)}` : an(e.from ?? e.to)}</span> },
        { key: 'm', title: 'مبلغ', render: (e) => <span className={cx('font-medium', e.kind === 'expense' || e.kind === 'draw' ? 'text-danger' : e.kind === 'transfer' ? '' : 'text-success')}>{e.kind === 'expense' || e.kind === 'draw' ? '−' : e.kind === 'transfer' ? '' : '+'}{toman(e.amount)}</span>, sort: (e) => e.amount },
        { key: 's', title: 'وضعیت', render: (e) => e.status === 'paid' ? <span className="flex items-center gap-1 text-12">{e.doc ? <FileText size={13} className="text-success" /> : <span className="text-11 text-warning">بی‌مستند</span>}{e.tax && <Badge dot={false}>قابل قبول مالیاتی</Badge>}</span> : <Badge tone={e.status === 'approval' ? 'warning' : 'danger'}>{e.status === 'approval' ? 'منتظر تأیید' : 'رد شد'}</Badge> }]} /></Card>
    <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? `${KIND_LABEL[open.kind]} · ${open.id}` : ''} footer={open && isChiefNow() && <Button variant="ghost" onClick={async () => { if (!(await confirm({ title: 'حذف این ردیف؟', body: 'به سطل بازیافت می‌رود و از موجودی حساب‌ها برداشته می‌شود.', confirm: 'حذف', danger: true }))) return; mutate((x) => { const e = x.treasury.entries.find((q) => q.id === open.id)!; x.trash.unshift({ id: e.id, type: 'ردیف خزانه', title: `${e.vendor ?? e.category ?? ''} ${toman(e.amount)}`, at: new Date().toISOString(), by: me() } as never); x.treasury.entries = x.treasury.entries.filter((q) => q.id !== open.id) }, { action: 'حذف ردیف خزانه', target: open.id }); setOpen(null); toast('به سطل بازیافت رفت.') }}>حذف</Button>}>
      {open && <div className="space-y-2 text-13">{([['مبلغ', toman(open.amount)], ['تاریخ', day(open.at)], ['از حساب', an(open.from)], ['به حساب', an(open.to)], ['دسته', open.category], ['طرف حساب', open.vendor], ['ارز', open.fx && `${fa(open.fx.amount)} ${open.fx.cur} × نرخ ${num(open.fx.rate)} + کارمزد ${fa(open.fx.fee)}٪`], ['سرمایه‌گذار', T.investors.find((v) => v.id === open.investor)?.name], ['مستند', open.doc], ['ثبت‌کننده', open.by], ['تأییدکننده', open.approvedBy], ['قابل قبول مالیاتی', open.tax ? 'بله' : undefined], ['توضیح', open.note]] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => <p key={k} className="flex justify-between gap-3 border-b border-line pb-1.5"><span className="text-t2">{k}</span><b className="text-left">{v}</b></p>)}</div>}
    </Drawer>
  </div>
}

function EntryModal({ m, onClose }: { m: null | { kind: TEntry['kind']; pre?: Partial<TEntry> }; onClose: () => void }) {
  const d = useDB(); const T = d.treasury; const [f, setF] = useState<TEntry | null>(null); const [fx, setFx] = useState(false); const [fxA, setFxA] = useState({ amount: 20, rate: 0, fee: 6 }); const [rec, setRec] = useState<'' | TRecurring['every']>(''); const [key, setKey] = useState('')
  const k = m ? `${m.kind}|${JSON.stringify(m.pre ?? {})}` : ''
  if (m && k !== key) { setKey(k); const pre = m.pre ?? {}; setF({ id: '', at: new Date().toISOString(), kind: m.kind, amount: 0, status: 'paid', by: me(), from: m.kind === 'expense' || m.kind === 'transfer' || m.kind === 'draw' ? 'ops' : undefined, to: m.kind === 'capital' ? 'cap' : m.kind === 'income' || m.kind === 'loan' ? 'ops' : m.kind === 'transfer' ? 'petty' : undefined, category: m.kind === 'expense' ? T_CATS[0] : undefined, ...pre }); setFx(false); setFxA({ amount: 20, rate: usdRate(d), fee: T.feePct }); setRec('') }
  if (!m || !f) return null
  const set = (p: Partial<TEntry>) => setF({ ...f, ...p }); const amount = fx ? fxToman(fxA.amount, fxA.rate, fxA.fee) : f.amount
  const accs = T.accounts.filter((a) => a.active).map((a) => [a.id, `${a.name} (${toman(balanceOf(T, a.id))})`] as [string, string])
  const needApproval = !isChiefNow() && m.kind !== 'transfer' && amount > T.cap
  const save = () => {
    if (!amount) return toast('مبلغ را وارد کنید.', { tone: 'err' })
    if ((m.kind === 'expense' || m.kind === 'draw') && T.accounts.find((a) => a.id === f.from)?.restricted) return toast('از حساب سرمایه مستقیم خرج نمی‌شود؛ اول به حساب جاری «انتقال» بدهید.', { tone: 'err' })
    if (m.kind === 'transfer' && f.from === f.to) return toast('حساب مبدأ و مقصد یکی است.', { tone: 'err' })
    const id = uid('TR'); const e: TEntry = { ...f, id, amount, fx: fx ? { amount: fxA.amount, cur: 'دلار', rate: fxA.rate, fee: fxA.fee } : undefined, status: needApproval ? 'approval' : 'paid', by: me() }
    mutate((x) => { x.treasury.entries.unshift(e); if (f.sms) { const s = x.treasury.sms.find((q) => q.id === f.sms); if (s) s.entry = id }
      if (needApproval) x.approvals.unshift({ id: `AP-${700 + x.approvals.length + 3}`, type: 'هزینهٔ خزانه', title: `${e.vendor ?? e.category} · ${e.note ?? ''}`, ref: id, amount, by: me(), byRole: effectiveRole(), status: 'approval.pending', at: e.at } as never)
      if (rec && m.kind === 'expense') x.treasury.recurring.push({ id: uid('RC'), title: e.vendor || e.note || e.category || 'پرداخت تکراری', category: e.category ?? 'سایر', amount, fx: e.fx ? { amount: e.fx.amount, cur: e.fx.cur, fee: e.fx.fee } : undefined, every: rec, next: nextDue(e.at, rec), account: e.from ?? 'ops', vendor: e.vendor, remind: 3, active: true }) },
      { action: `خزانه: ${KIND_LABEL[m.kind]}`, target: `${e.vendor ?? e.category ?? ''} · ${toman(amount)}`, sensitive: true } as never)
    toast(needApproval ? `ثبت شد و چون بیش از ${compactToman(T.cap)} است، منتظر تأیید مدیر کل ماند.` : 'ثبت شد؛ موجودی حساب‌ها به‌روز شد.'); onClose()
  }
  return <Modal open onClose={onClose} wide title={KIND_LABEL[m.kind]} footer={<><Button variant="primary" onClick={save}>{needApproval ? 'ثبت و ارسال برای تأیید' : 'ثبت'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></>}>
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {!fx && <Field label="مبلغ (تومان)"><MoneyInput value={f.amount} onChange={(v) => set({ amount: v })} aria-label="مبلغ" /></Field>}
        <Field label="تاریخ"><Input type="date" value={f.at.slice(0, 10)} onChange={(e) => e.target.value && set({ at: new Date(`${e.target.value}T12:00`).toISOString() })} /></Field>
        {(m.kind === 'expense' || m.kind === 'transfer' || m.kind === 'draw') && <Field label={m.kind === 'transfer' ? 'از حساب' : 'پرداخت از حساب'}><Select value={f.from ?? ''} onChange={(v) => set({ from: v })} options={accs} /></Field>}
        {(m.kind !== 'expense' && m.kind !== 'draw') && <Field label={m.kind === 'transfer' ? 'به حساب' : 'واریز به حساب'}><Select value={f.to ?? ''} onChange={(v) => set({ to: v })} options={accs} /></Field>}
        {(m.kind === 'expense' || m.kind === 'income') && <Field label="دسته"><Select value={f.category ?? ''} onChange={(v) => set({ category: v })} options={m.kind === 'income' ? ['سود سپرده', 'بازپرداخت', 'فروش دارایی', 'سایر'] : T_CATS} /></Field>}
        {(m.kind === 'capital' || m.kind === 'loan' || m.kind === 'draw') && <Field label={m.kind === 'draw' ? 'شریک' : 'سرمایه‌گذار یا وام‌دهنده'}><Select value={f.investor ?? ''} onChange={(v) => set({ investor: v })} options={[['', 'انتخاب…'], ...T.investors.map((v) => [v.id, v.name] as [string, string])]} /></Field>}
        {m.kind !== 'transfer' && <Field label={m.kind === 'expense' ? 'طرف حساب (فروشنده یا سرویس)' : 'طرف حساب'}><Input value={f.vendor ?? ''} onChange={(e) => set({ vendor: e.target.value })} placeholder={m.kind === 'expense' ? 'مثلاً ابر آروان، Anthropic، عکاس' : ''} /></Field>}
      </div>
      {m.kind === 'expense' && <div className="space-y-2 rounded-xl border border-line p-3">
        <Toggle on={fx} onChange={setFx} text="پرداخت ارزی (اشتراک خارجی از طریق واسط)" />
        {fx && <div className="grid gap-3 sm:grid-cols-4"><Field label="مبلغ ارزی (دلار)"><Input type="number" className="ltr text-left" value={fxA.amount} onChange={(e) => setFxA({ ...fxA, amount: +e.target.value })} /></Field><Field label="نرخ خرید واقعی از واسط (تومان)"><MoneyInput value={fxA.rate} onChange={(v) => setFxA({ ...fxA, rate: v })} aria-label="نرخ" /></Field><Field label="کارمزد واسط (٪)"><Input type="number" className="ltr text-left" value={fxA.fee} onChange={(e) => setFxA({ ...fxA, fee: +e.target.value })} /></Field><div className="pb-1.5 text-12"><span className="text-t2">مبلغ تومانی</span><p className="text-16 font-bold">{toman(amount)}</p></div></div>}
        {fx && <p className="text-11 text-t2">نرخ پیش‌فرض: نرخ مرجع دلار در تنظیمات + ۱۲٪ (اختلاف رایج خرید از واسط). اگر نرخ واقعی فرق داشت، همین‌جا اصلاح کنید.</p>}
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="توضیح"><Textarea rows={2} value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></Field>
        <Field label="مستند (فاکتور، رسید، قرارداد)"><label className="flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line text-12 text-t2 hover:border-brand"><FileText size={15} />{f.doc ?? 'انتخاب عکس یا PDF'}<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) set({ doc: fl.name }) }} /></label></Field>
      </div>
      {m.kind === 'expense' && <div className="flex flex-wrap items-center gap-4"><Toggle on={!!f.tax} onChange={(v) => set({ tax: v })} text="فاکتور رسمی دارد (قابل قبول مالیاتی)" /><span className="flex items-center gap-2 text-12">تکرار:<Segmented value={rec || 'none'} onChange={(v) => setRec(v === 'none' ? '' : v as TRecurring['every'])} options={[['none', 'یک‌باره'], ['monthly', 'ماهانه'], ['quarterly', 'سه‌ماهه'], ['yearly', 'سالانه']]} /></span></div>}
      {needApproval && <p className="rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning">این مبلغ از سقف {toman(T.cap)} بیشتر است؛ بعد از ثبت، منتظر تأیید مدیر کل می‌ماند و تا تأیید از موجودی کم نمی‌شود.</p>}
      {m.kind === 'capital' && <p className="rounded-lg bg-info-bg px-3 py-2 text-12 text-info">ورود سرمایه درآمد نیست و در سود و زیان نمی‌آید. پول سرمایه‌گذار به «حساب سرمایه» می‌رود و فقط با «انتقال» به حساب جاری خرج می‌شود؛ گزارش مصرف آن در تب «سرمایه و شرکا» است.</p>}
    </div>
  </Modal>
}

function Recurring() {
  const d = useDB(); const T = d.treasury; const R = [...T.recurring].sort((a, b) => a.next.localeCompare(b.next))
  const monthly = R.filter((r) => r.active).reduce((s, r) => s + (r.fx ? fxToman(r.fx.amount, usdRate(d), r.fx.fee) : r.amount) / (r.every === 'monthly' ? 1 : r.every === 'quarterly' ? 3 : 12), 0)
  const pay = (r: TRecurring) => { const amount = r.fx ? fxToman(r.fx.amount, usdRate(d), r.fx.fee) : r.amount; mutate((x) => { const id = uid('TR'); x.treasury.entries.unshift({ id, at: new Date().toISOString(), kind: 'expense', amount, from: r.account, category: r.category, vendor: r.vendor, note: `${r.title} · دورهٔ ${day(r.next)}`, fx: r.fx ? { amount: r.fx.amount, cur: r.fx.cur, rate: usdRate(d), fee: r.fx.fee } : undefined, status: 'paid', by: me(), recurring: r.id }); const y = x.treasury.recurring.find((q) => q.id === r.id)!; y.next = nextDue(y.next, y.every) }, { action: 'پرداخت دورهٔ اشتراک', target: `${r.title} · ${toman(amount)}`, sensitive: true } as never); toast(`پرداخت ${r.title} ثبت شد؛ سررسید بعدی تنظیم شد.`) }
  const remind = (r: TRecurring) => { mutate((x) => { const at = new Date(+new Date(r.next) - r.remind * 864e5); at.setHours(10, 0, 0, 0); x.planner.notes.unshift({ id: uid('PN'), owner: currentUser()?.id ?? 'u1', kind: 'task', title: `پرداخت ${r.title}`, body: `${r.fx ? `${fa(r.fx.amount)} دلار` : toman(r.amount)} از ${T.accounts.find((a) => a.id === r.account)?.name ?? ''}`, due: r.next, remind: { at: at.toISOString(), ch: ['panel', 'telegram'] }, home: { from: at.toISOString().slice(0, 10) }, link: { label: 'حسابداری و خزانه', to: '/admin/treasury?tab=recurring' }, tags: ['هزینه'], createdAt: new Date().toISOString() }) }, { action: 'یادآوری پرداخت تکراری در برنامه‌ریزی', target: r.title }); toast(`یادآوری ${fa(r.remind)} روز قبل از سررسید در «یادداشت و برنامه‌ریزی» ثبت شد.`) }
  return <Card pad={false} title="اشتراک‌ها و پرداخت‌های تکراری" hint="هاست، دامنه، اکانت‌های هوش مصنوعی، پیامک، حقوق؛ یک بار تعریف، هر دوره با یک کلیک پرداخت. اشتراک ارزی با نرخ روز به تومان حساب می‌شود." actions={<span className="text-12 text-t2">معادل ماهانه: <b className="text-t1">{toman(Math.round(monthly))}</b></span>}>
    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-13"><thead><tr className="border-b border-line text-right text-12 text-t2">{['عنوان', 'دسته', 'مبلغ', 'دوره', 'سررسید بعدی', 'از حساب', ''].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
      <tbody>{R.map((r) => { const soon = +new Date(r.next) - Date.now() < r.remind * 864e5; return <tr key={r.id} className={cx('border-b border-line/60', !r.active && 'opacity-50')}>
        <td className="px-3 py-2.5"><b>{r.title}</b><span className="block text-11 text-t3">{r.vendor}</span></td><td className="px-3 text-12">{r.category}</td>
        <td className="px-3">{r.fx ? <>{fa(r.fx.amount)} دلار<span className="block text-11 text-t2">≈ {toman(fxToman(r.fx.amount, usdRate(d), r.fx.fee))}</span></> : toman(r.amount)}</td>
        <td className="px-3 text-12">{({ monthly: 'ماهانه', quarterly: 'سه‌ماهه', yearly: 'سالانه' } as const)[r.every]}</td>
        <td className="px-3"><span className={cx('text-12', soon && 'font-semibold text-warning')}>{day(r.next)}</span><span className="block text-11 text-t3">{rel(r.next)}</span></td>
        <td className="px-3 text-12">{T.accounts.find((a) => a.id === r.account)?.name}</td>
        <td className="px-3"><div className="flex flex-wrap gap-1.5"><Button size="sm" variant={soon ? 'primary' : 'ghost'} onClick={() => pay(r)}>پرداخت این دوره</Button><Button size="sm" variant="ghost" aria-label={`یادآوری ${r.title}`} title="یادآوری در برنامه‌ریزی" icon={<BellPlus size={13} />} onClick={() => remind(r)} /><Toggle on={r.active} onChange={(v) => mutate((x) => { x.treasury.recurring.find((q) => q.id === r.id)!.active = v }, { action: v ? 'فعال کردن پرداخت تکراری' : 'توقف پرداخت تکراری', target: r.title })} label={`فعال ${r.title}`} /></div></td>
      </tr> })}</tbody></table></div>
    <p className="border-t border-line px-4 py-2.5 text-11 text-t2">برای افزودن، هنگام «ثبت هزینه» تکرار را «ماهانه، سه‌ماهه یا سالانه» بگذارید.</p>
  </Card>
}

function Capital({ onAdd }: { onAdd: (k: TEntry['kind']) => void }) {
  const d = useDB(); const T = d.treasury; const ref = useRef<HTMLDivElement>(null)
  const capAcc = T.accounts.filter((a) => a.kind === 'capital'); const capBal = capAcc.reduce((s, a) => s + balanceOf(T, a.id), 0)
  const inflow = (id: string) => T.entries.filter((e) => e.status === 'paid' && e.investor === id && (e.kind === 'capital' || e.kind === 'loan')).reduce((s, e) => s + e.amount, 0)
  const draws = (id: string) => T.entries.filter((e) => e.status === 'paid' && e.investor === id && e.kind === 'draw').reduce((s, e) => s + e.amount, 0)
  const first = T.entries.filter((e) => e.kind === 'capital').map((e) => e.at).sort()[0] ?? new Date().toISOString()
  const used = T.entries.filter((e) => e.status === 'paid' && e.kind === 'transfer' && capAcc.some((a) => a.id === e.from)).reduce((s, e) => s + e.amount, 0)
  const opex = T_CATS.map((c) => ({ c, v: T.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && e.category === c && e.at >= first).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v).sort((a, b) => b.v - a.v)
  const opexT = opex.reduce((s, x) => s + x.v, 0); const M = months(3); const avg = M.reduce((s, m) => s + burnOf(d, m), 0) / 3; const runway = avg ? (capBal + liquid(d)) / avg : 0
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-3">{T.investors.map((v) => { const got = inflow(v.id); return <Card key={v.id}><p className="text-12 text-t2">{({ equity: 'سرمایه (سهم)', loan: 'وام', founder: 'آوردهٔ مؤسس' } as const)[v.kind]}{v.share ? ` · ${fa(v.share)}٪ سهم` : ''}</p><p className="text-14 font-semibold">{v.name}</p><p className="mt-1 text-18 font-bold">{toman(got)}</p><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-success-solid" style={{ width: `${Math.min(100, (got / Math.max(1, v.committed)) * 100)}%` }} /></div><p className="mt-1 text-11 text-t2">از تعهد {compactToman(v.committed)}{draws(v.id) ? ` · برداشت ${compactToman(draws(v.id))}` : ''}</p>{v.note && <p className="mt-1 text-11 text-t3">{v.note}</p>}</Card> })}</div>
    <div className="flex flex-wrap gap-2"><Button variant="primary" icon={<PiggyBank size={14} />} onClick={() => onAdd('capital')}>ورود سرمایه</Button><Button icon={<Wallet size={14} />} onClick={() => onAdd('loan')}>دریافت وام</Button><Button icon={<ArrowLeftRight size={14} />} onClick={() => onAdd('transfer')}>برداشت از حساب سرمایه (انتقال)</Button><Button variant="ghost" onClick={() => onAdd('draw')}>برداشت شریک</Button><span className="flex-1" /><Button icon={<Printer size={14} />} onClick={() => printSolo(ref.current)}>چاپ گزارش مصرف سرمایه</Button></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="مصرف سرمایه از ابتدا"><div className="space-y-1.5 text-13"><p className="flex justify-between"><span>کل سرمایه و وام دریافتی</span><b>{toman(T.investors.reduce((s, v) => s + inflow(v.id), 0))}</b></p><p className="flex justify-between"><span>منتقل‌شده از حساب سرمایه به حساب جاری</span><b>{toman(used)}</b></p><p className="flex justify-between"><span>ماندهٔ حساب سرمایه</span><b className="text-success">{toman(capBal)}</b></p><p className="flex justify-between"><span>میانگین خرج ماهانه (سه ماه)</span><b>{toman(Math.round(avg))}</b></p><p className="flex justify-between border-t border-line pt-1.5"><span>دوام با همین سرعت (نقد + سرمایه)</span><b>{runway ? `${fa(runway.toFixed(1))} ماه` : '—'}</b></p></div></Card>
      <Card title="هزینه‌های عملیاتی از زمان ورود سرمایه">{opex.length ? <ul className="space-y-1.5 text-12">{opex.map((x) => <li key={x.c} className="flex justify-between gap-2"><span>{x.c}</span><span className="text-t2">{fa(Math.round((x.v / opexT) * 100))}٪</span><b>{toman(x.v)}</b></li>)}</ul> : <p className="text-12 text-t2">هزینه‌ای ثبت نشده است.</p>}</Card>
    </div>
    <div ref={ref} className="hidden"><div dir="rtl" style={{ width: '190mm', padding: '8mm', fontFamily: 'inherit', color: '#000', background: '#fff' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>گزارش مصرف سرمایهٔ غنیمت</h2><p style={{ fontSize: 11 }}>تاریخ: {new Date().toLocaleDateString('fa-IR')} · تهیه‌کننده: {me()}</p>
      <table style={{ width: '100%', fontSize: 11, marginTop: 10, borderCollapse: 'collapse' }}><tbody>{T.investors.map((v) => <tr key={v.id}><td style={{ padding: 4, borderBottom: '1px solid #ddd' }}>{v.name}</td><td style={{ padding: 4, borderBottom: '1px solid #ddd' }}>تعهد {num(v.committed)}</td><td style={{ padding: 4, borderBottom: '1px solid #ddd' }}>دریافتی {num(inflow(v.id))}</td></tr>)}</tbody></table>
      <p style={{ fontSize: 12, marginTop: 10 }}>منتقل‌شده به حساب جاری: <b>{num(used)}</b> · ماندهٔ حساب سرمایه: <b>{num(capBal)}</b> · میانگین خرج ماهانه: <b>{num(Math.round(avg))}</b> · دوام: <b>{runway ? fa(runway.toFixed(1)) : '—'} ماه</b></p>
      <table style={{ width: '100%', fontSize: 11, marginTop: 8, borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: 4 }}>دستهٔ هزینه</th><th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: 4 }}>مبلغ (تومان)</th><th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: 4 }}>سهم</th></tr></thead><tbody>{opex.map((x) => <tr key={x.c}><td style={{ padding: 4 }}>{x.c}</td><td style={{ padding: 4 }}>{num(x.v)}</td><td style={{ padding: 4 }}>{fa(Math.round((x.v / Math.max(1, opexT)) * 100))}٪</td></tr>)}</tbody></table>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, fontSize: 11 }}><span>امضای غنیمت: ......................</span><span>امضای سرمایه‌گذار: ......................</span></div>
    </div></div>
  </div>
}

function Budget() {
  const d = useDB(); const T = d.treasury; const thisM = monthKey(new Date()); const M = months(3)
  const act = (c: string, m = thisM) => T.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && e.category === c && monthKey(e.at) === m).reduce((s, e) => s + e.amount, 0)
  const recM = (c: string) => T.recurring.filter((r) => r.active && r.category === c).reduce((s, r) => s + (r.fx ? fxToman(r.fx.amount, usdRate(d), r.fx.fee) : r.amount) / (r.every === 'monthly' ? 1 : r.every === 'quarterly' ? 3 : 12), 0)
  const varAvg = (c: string) => M.reduce((s, m) => s + T.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && e.category === c && !e.recurring && monthKey(e.at) === m).reduce((t, e) => t + e.amount, 0), 0) / 3
  const rows = T_CATS.map((c) => ({ c, b: T.budgets[c] ?? 0, a: act(c), f: Math.round(recM(c) + varAvg(c)) })).filter((r) => r.b || r.a || r.f)
  const sum = (k: 'b' | 'a' | 'f') => rows.reduce((s, r) => s + r[k], 0)
  return <Card pad={false} title={`بودجهٔ ${mName(thisM)} و برآورد ماه‌های بعد`} hint="برآورد = پرداخت‌های تکراری (معادل ماهانه) + میانگین سه ماه هزینه‌های غیرتکراری همان دسته.">
    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-13"><thead><tr className="border-b border-line text-right text-12 text-t2">{['دسته', 'بودجهٔ ماهانه', 'هزینهٔ این ماه', 'مصرف بودجه', 'برآورد هر ماه بعد', 'سه ماه آینده'].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => { const p = r.b ? (r.a / r.b) * 100 : 0; return <tr key={r.c} className="border-b border-line/60">
        <td className="px-3 py-2.5 font-medium">{r.c}</td>
        <td className="px-3"><MoneyInput hint={false} value={r.b} onChange={(v) => mutate((x) => { x.treasury.budgets[r.c] = v }, { action: 'تغییر بودجهٔ دسته', target: `${r.c} · ${toman(v)}` })} aria-label={`بودجهٔ ${r.c}`} /></td>
        <td className="px-3">{toman(r.a)}</td>
        <td className="px-3"><div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full', p > 100 ? 'bg-danger' : p > 85 ? 'bg-warning' : 'bg-brand-solid')} style={{ width: `${Math.min(100, p)}%` }} /></div><span className={cx('text-11', p > 100 ? 'text-danger' : 'text-t2')}>{r.b ? `${fa(Math.round(p))}٪${p > 100 ? ' · بیش از بودجه' : p > 85 ? ' · نزدیک سقف' : ''}` : 'بدون بودجه'}</span></td>
        <td className="px-3">{toman(r.f)}</td><td className="px-3">{toman(r.f * 3)}</td></tr> })}</tbody>
      <tfoot><tr className="bg-neutral-bg/60 font-semibold"><td className="px-3 py-2.5">جمع</td><td className="px-3">{toman(sum('b'))}</td><td className="px-3">{toman(sum('a'))}</td><td /><td className="px-3">{toman(sum('f'))}</td><td className="px-3">{toman(sum('f') * 3)}</td></tr></tfoot></table></div>
  </Card>
}

function Pnl() {
  const d = useDB(); const T = d.treasury; const M = months(3); const sec = canSecret(); const nav = useNavigate()
  const data = useMemo(() => M.map((m) => { const O = d.orders.filter((o) => counted(o) && monthKey(o.createdAt) === m); const P = O.map((o) => orderProfit(d, o))
    const ex = T_CATS.map((c) => ({ c, v: T.entries.filter((e) => e.status === 'paid' && e.kind === 'expense' && e.category === c && monthKey(e.at) === m).reduce((s, e) => s + e.amount, 0) }))
    const inc = T.entries.filter((e) => e.status === 'paid' && e.kind === 'income' && e.category !== 'فروش (خلاصهٔ درگاه)' && monthKey(e.at) === m).reduce((s, e) => s + e.amount, 0)
    const rev = P.reduce((s, p) => s + p.revenue, 0); const gross = P.reduce((s, p) => s + p.profit, 0); const opex = ex.reduce((s, x) => s + x.v, 0)
    return { m, n: O.length, rev, gross, ex, opex, inc, net: gross + inc - opex } }), [d]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sec) return <Card><p className="text-13 text-t2">سود و زیان شامل سود ناخالص فروش است که دادهٔ محرمانه است؛ فقط مدیر کل یا کسی که دسترسی «secrets» دارد می‌بیند.</p></Card>
  const cell = 'tnum px-3 py-2 text-left'
  return <Card pad={false} title="سود و زیان واقعی (ماهانه)" hint="سود ناخالص از سفارش‌ها (فروش − بهای کالا − کارمزد − ارسال − بسته‌بندی − تخفیف) + درآمد غیرفروش − هزینه‌های عملیاتی این بخش. ورود سرمایه و وام در سود و زیان نیست." actions={<button className="text-12 text-brand" onClick={() => nav('/admin/finance?tab=profit')}>ریز سود فروش در «مالی»</button>}>
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-13"><thead><tr className="border-b border-line text-right text-12 text-t2"><th className="px-3 py-2.5 font-medium">شرح</th>{data.map((x) => <th key={x.m} className="px-3 py-2.5 text-left font-medium">{mName(x.m)}</th>)}</tr></thead>
      <tbody>
        <tr className="border-b border-line/60"><td className="px-3 py-2">فروش ({data.map((x) => fa(x.n)).join(' / ')} سفارش)</td>{data.map((x) => <td key={x.m} className={cell}>{num(x.rev)}</td>)}</tr>
        <tr className="border-b border-line bg-success-bg/30 font-semibold"><td className="px-3 py-2">سود ناخالص فروش</td>{data.map((x) => <td key={x.m} className={cell}>{num(x.gross)}</td>)}</tr>
        <tr className="border-b border-line/60"><td className="px-3 py-2">درآمد غیرفروش</td>{data.map((x) => <td key={x.m} className={cell}>{num(x.inc)}</td>)}</tr>
        {T_CATS.filter((c) => data.some((x) => x.ex.find((e) => e.c === c)!.v)).map((c) => <tr key={c} className="border-b border-line/40 text-12 text-t2"><td className="px-3 py-1.5 pr-6">− {c}</td>{data.map((x) => <td key={x.m} className={cell}>{num(x.ex.find((e) => e.c === c)!.v)}</td>)}</tr>)}
        <tr className="border-b border-line font-semibold"><td className="px-3 py-2">جمع هزینه‌های عملیاتی</td>{data.map((x) => <td key={x.m} className={cell}>{num(x.opex)}</td>)}</tr>
        <tr className="bg-neutral-bg/60 text-15 font-bold"><td className="px-3 py-2.5">سود (زیان) خالص</td>{data.map((x) => <td key={x.m} className={cx(cell, x.net < 0 ? 'text-danger' : 'text-success')}>{x.net < 0 ? '−' : ''}{num(Math.abs(x.net))}</td>)}</tr>
      </tbody></table></div>
  </Card>
}
