import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Check, ExternalLink, Lock, Package, Plus, Truck, Wallet } from 'lucide-react'
import { Badge, Button, Card, cx, EmptyState, Field, Input, Progress, Row, Segmented, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { mutate, notify, setSession, useDB } from '@/shared/lib/store'
import { compactToman, fa, pct, rel, toman } from '@/shared/lib/fa'
import { CAPITAL, statement, type Capital, type PartnerT } from '@/shared/data/partners'
import { ProductImg } from '../pages/_shared'
import { PartnerLedger, PartnerReviews } from './PartnerOps'
import { CityChips, NEAR } from './Network'

const ST_TONE = { 'فعال': 'success', 'در حال راه‌اندازی': 'warning', 'متوقف': 'danger', 'در انتظار تأیید': 'warning' } as const
const num = (v: string) => +v.replace(/[^\d.]/g, '') || 0

/** شعب و شرکای فروش: انبار، شهر، ارسال سریع، کالای امانی و کالای خود شریک، کمیسیون و تسویه */
export function PartnersAdmin() {
  const d = useDB(); const nav = useNavigate(); const [sp0] = useSearchParams(); const [sel, setSel] = useState<string | null>(sp0.get('p')); const [add, setAdd] = useState(sp0.get('add') === '1')
  const P = d.partners ?? []
  const all = P.map((p) => ({ p, s: statement(p, d.lots) }))
  const p = P.find((x) => x.id === sel)
  if (p) return <PartnerDetail p={p} onBack={() => setSel(null)} />
  return (
    <Page title="شرکای مستقل (پرتال جداگانه)" badge={<Badge tone="warning">در انتظار تأیید</Badge>} module="sellers" sub="هر شعبه انبار و شهر خودش را دارد؛ سهم هر طرف از روی «سرمایهٔ چه کسی» محاسبه می‌شود." primary={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setAdd(true)}>افزودن شعبه یا شریک</Button>}>
      <div className="mb-4 rounded-2xl border-2 border-warning/40 bg-warning-bg/60 p-4">
        <p className="flex items-center gap-2 text-14 font-bold text-warning"><Lock size={16} />پرتال شرکای مستقل فعلاً غیرفعال است · در انتظار تأیید</p>
        <p className="mt-1.5 text-13 leading-7 text-t1">این بخش برای شریک‌هایی است که در آینده با پنل جداگانهٔ خودشان (کالای امانی، کمیسیون و تسویهٔ دوره‌ای) به غنیمت می‌پیوندند. شریک‌هایی مثل یاسین که بخشی از خود غنیمت‌اند با حساب «مدیر کل دوم» کار می‌کنند و مالکیت کالا، فروش و تسویه‌شان در «مالکیت و تسویهٔ موجودی» ثبت می‌شود. موارد زیر فقط برای مرور ساختار نمایش داده می‌شوند و قابل تغییر نیستند.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" onClick={() => nav('/admin/ownership?tab=setup')}>شرکا و انبارها در مالکیت و تسویه</Button><Button onClick={() => nav('/admin/ownership?tab=statement')}>صورت‌حساب شرکا</Button></div>
        <ul className="mt-3 flex flex-wrap gap-2 text-12">{(d.stock?.parties ?? []).filter((x) => x.kind === 'partner').map((x) => <li key={x.id} className="rounded-full border border-line bg-surface px-3 py-1">{x.name} · {x.city ?? '—'} · {x.account === 'portal' ? 'پرتال جداگانه' : 'جزئی از غنیمت'} · {x.active ? 'فعال' : 'غیرفعال'}</li>)}</ul>
      </div>
      <div className="pointer-events-none select-none space-y-4 opacity-55" aria-disabled="true" inert>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="فروش شعب در این دوره" value={compactToman(all.reduce((a, x) => a + x.s.revenue, 0))} note={`${fa(P.filter((x) => x.status === 'فعال').length)} شعبهٔ فعال`} />
          <KPI label="ارزش کالای امانی غنیمت نزد شعب" value={compactToman(all.reduce((a, x) => a + x.s.byCap('hq').reduce((b, r) => b + r.stockValue, 0), 0))} note="سرمایهٔ شما در انبار شرکا" />
          <KPI label="بدهی غنیمت به شعب" value={compactToman(all.reduce((a, x) => a + Math.max(0, x.s.net), 0))} note="سهم فروش آنلاین" />
          <KPI label="بدهی شعب به غنیمت" value={compactToman(all.reduce((a, x) => a + Math.max(0, -x.s.net), 0))} note="سهم فروش حضوری" />
        </div>
        <Card title="سه مدل سرمایه">
          <div className="grid gap-3 md:grid-cols-3">{(Object.keys(CAPITAL) as Capital[]).map((k) => <div key={k} className="rounded-2xl border border-line p-3" style={{ borderTopColor: CAPITAL[k].color, borderTopWidth: 4 }}><b className="text-13">{CAPITAL[k].label}</b><p className="mt-1 text-12 leading-6 text-t2">{CAPITAL[k].desc}</p></div>)}</div>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{all.map(({ p, s }) => { const done = p.checklist.filter((c) => c.done).length; return (
          <Card key={p.id} onClick={() => setSel(p.id)} className="lift cursor-pointer">
            <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: p.color }}><Building2 size={20} /></span>
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-15 font-bold">{p.name}<Badge tone={ST_TONE[p.status]}>{p.status}</Badge></p><p className="text-12 text-t2">{p.owner} · انبار {p.city}</p></div></div>
            {p.status === 'در حال راه‌اندازی' ? <div className="mt-3"><p className="mb-1 flex justify-between text-12"><span>راه‌اندازی</span><span className="tnum">{fa(done)} از {fa(p.checklist.length)}</span></p><Progress value={done * 100 / p.checklist.length} tone="warning" /></div> :
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-11"><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">فروش</dt><dd className="tnum text-13 font-bold">{compactToman(s.revenue)}</dd></div><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">سهم شعبه</dt><dd className="tnum text-13 font-bold">{compactToman(s.partnerShare)}</dd></div><div className="rounded-xl bg-surface-2 p-2"><dt className="text-t2">{s.net >= 0 ? 'بدهی ما' : 'طلب ما'}</dt><dd className={cx('tnum text-13 font-bold', s.net < 0 && 'text-success')}>{compactToman(Math.abs(s.net))}</dd></div></dl>}
            <p className="mt-3 flex flex-wrap gap-1.5 text-11">{p.fast.on ? <Badge tone="success" dot={false}>ارسال سریع {p.fast.cities}</Badge> : <Badge dot={false}>بدون ارسال سریع</Badge>}{p.services.ownProducts && <Badge dot={false}>کالای خود شعبه</Badge>}{p.services.storeSales && <Badge dot={false}>فروش حضوری</Badge>}</p>
          </Card>) })}</div>
        <p className="text-12 text-t2">فروشگاه‌های حضوری خود غنیمت در «<button className="text-brand underline" onClick={() => nav('/admin/branches')}>شعب</button>» هستند؛ این صفحه برای شعبه‌هایی است که شریک اداره می‌کند.</p>
      </div>
      <AddPartner open={add} onClose={() => setAdd(false)} onDone={(id) => { setAdd(false); setSel(id) }} />
    </Page>
  )
}

function AddPartner({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const d = useDB(); const [f, setF] = useState({ name: '', city: '', owner: '', phone: '', color: '#0891b2', template: 'mahabad' })
  const colors = ['#0891b2', '#c2410c', '#7c3aed', '#be185d', '#0e9f6e', '#a16207']
  return <Modal open={open} onClose={onClose} title="افزودن شعبه یا شریک فروش" footer={<Button variant="primary" disabled={!f.name.trim() || !f.city.trim() || !f.owner.trim()} onClick={() => {
    const id = `pt${Date.now().toString(36)}`; const tpl = d.partners.find((x) => x.id === f.template) ?? d.partners[0]
    mutate((x) => { x.partners.push({ ...structuredClone(tpl), id, name: f.name.trim(), city: f.city.trim(), owner: f.owner.trim(), phone: f.phone, warehouse: id, address: '', status: 'در حال راه‌اندازی', color: f.color, since: new Date().toISOString(), userId: undefined, fast: { ...tpl.fast, on: false, cities: f.city.trim() }, checklist: tpl.checklist.map((c) => ({ t: c.t, done: false })), payouts: [], couriers: [], reviews: [], penalties: [], iban: '', metrics: { ontime: 0, noStock: 0, cancel: 0, prepMin: 0 } }) }, { action: 'افزودن شعبه یا شریک فروش', target: f.name })
    toast('شعبه ساخته شد؛ چک‌لیست راه‌اندازی را جلو ببرید.'); onDone(id) }}>ساخت</Button>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="نام شعبه"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثلاً شعبهٔ تبریز" /></Field>
      <Field label="شهر انبار"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
      <Field label="نام شریک"><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
      <Field label="موبایل شریک"><Input className="ltr text-left" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="قرارداد پایه از روی"><Select value={f.template} onChange={(v) => setF({ ...f, template: v })} options={d.partners.map((x) => [x.id, x.name])} /></Field>
      <Field label="رنگ پرتال شعبه"><div className="flex gap-2">{colors.map((c) => <button key={c} type="button" aria-label={c} onClick={() => setF({ ...f, color: c })} className={cx('size-8 rounded-full ring-offset-2', f.color === c && 'ring-2 ring-t1')} style={{ background: c }} />)}</div></Field>
    </div>
  </Modal>
}

function PartnerDetail({ p, onBack }: { p: PartnerT; onBack: () => void }) {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useState('overview'); const s = statement(p, d.lots)
  const upd = (fn: (x: PartnerT) => void, action: string, after?: string) => mutate((x) => fn(x.partners.find((y) => y.id === p.id)!), { action, target: p.name, after })
  const [lot, setLot] = useState<{ productId: string; capital: Capital; qty: string; cost: string; price: string } | null>(null)
  const openPortal = () => { setSession({ viewAs: 'partner', partnerId: p.id }); nav('/partner') }
  return (
    <Page title={p.name} back="/admin/sellers" sub={`${p.owner} · ${p.city} · از ${rel(p.since)}`} badge={<Badge tone={ST_TONE[p.status]}>{p.status}</Badge>}
      actions={<><Button variant="ghost" onClick={onBack}>همهٔ شعب</Button><Button icon={<ExternalLink size={14} />} onClick={openPortal}>مشاهدهٔ پرتال این شعبه</Button></>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'نمای کلی' }, { id: 'contract', label: 'قرارداد و کمیسیون' }, { id: 'stock', label: 'موجودی و سرمایه', count: d.lots.filter((l) => l.partnerId === p.id).length }, { id: 'fast', label: 'انبار و ارسال سریع' }, { id: 'settle', label: 'تسویه و دفتر حساب' }, { id: 'score', label: 'کارنامه و نظر مشتریان', count: p.reviews.filter((r) => r.rating <= 3).length }, { id: 'setup', label: 'راه‌اندازی', count: p.checklist.filter((c) => !c.done).length }]} />}>
      <div className="space-y-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI featured label="فروش این دوره" value={compactToman(s.revenue)} note={`${fa(s.rows.reduce((a, r) => a + r.sold, 0))} واحد`} />
            <KPI label="سهم شعبه" value={compactToman(s.partnerShare)} />
            <KPI label="سهم غنیمت" value={compactToman(s.hqShare)} />
            <KPI label={s.net >= 0 ? 'بدهی غنیمت به شعبه' : 'طلب غنیمت از شعبه'} value={compactToman(Math.abs(s.net))} tone={s.net >= 0 ? 'warning' : 'success'} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">{(Object.keys(CAPITAL) as Capital[]).map((k) => { const r = s.byCap(k); return <Card key={k} title={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: CAPITAL[k].color }} />{CAPITAL[k].label}</span>}><Row k="فروش">{toman(r.reduce((a, x) => a + x.revenue, 0))}</Row><Row k="سهم شعبه">{toman(r.reduce((a, x) => a + x.partnerShare, 0))}</Row><Row k="موجودی مانده (ارزش خرید)">{toman(r.reduce((a, x) => a + x.stockValue, 0))}</Row></Card> })}</div>
        </>}
        {tab === 'contract' && <ContractTab p={p} upd={upd} />}
        {tab === 'stock' && <Card title="محموله‌ها و مالکیت سرمایه" actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setLot({ productId: d.products[0].id, capital: 'hq', qty: '1', cost: '', price: '' })}>ثبت محموله</Button>} pad={false}>
          {s.rows.length === 0 ? <div className="p-5"><EmptyState title="هنوز محموله‌ای ثبت نشده است." desc="کالای امانی غنیمت که به این انبار می‌رود یا کالایی که خود شعبه می‌آورد را ثبت کنید." /></div> :
            <div className="overflow-x-auto"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['کالا', 'سرمایه', 'تعداد', 'فروش آنلاین', 'فروش حضوری', 'خرید / فروش هر واحد', 'سهم شعبه', 'مانده'].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead><tbody>{s.rows.map((r) => { const pr = d.products.find((x) => x.id === r.l.productId); return <tr key={r.l.id} className="border-t border-line">
              <td className="p-2"><span className="flex items-center gap-2"><ProductImg pid={r.l.productId} size={30} /><span className="max-w-48 truncate">{pr?.title}</span></span>{r.l.note && <span className="block text-11 text-t3">{r.l.note}</span>}</td>
              <td className="p-2"><Select className="w-36" value={r.l.capital} onChange={(v) => mutate((x) => { x.lots.find((y) => y.id === r.l.id)!.capital = v as Capital }, { action: 'تغییر مدل سرمایهٔ محموله', target: r.l.id, after: CAPITAL[v as Capital].label })} options={(Object.keys(CAPITAL) as Capital[]).map((k) => [k, CAPITAL[k].short])} /></td>
              <td className="tnum p-2">{fa(r.l.qty)}</td><td className="tnum p-2">{fa(r.l.soldOnline)}</td><td className="tnum p-2">{fa(r.l.soldStore)}</td>
              <td className="tnum p-2">{compactToman(r.l.unitCost)} / {compactToman(r.l.unitPrice)}</td><td className="tnum p-2 font-semibold">{compactToman(r.partnerShare)}</td><td className="tnum p-2">{fa(r.l.qty - r.sold)}</td></tr> })}</tbody></table></div>}
          <p className="border-t border-line px-4 py-2 text-11 text-t2">کالای امانی تا فروش مال غنیمت است؛ کسری در انبارگردانی به قیمت خرید از تسویهٔ شعبه کم می‌شود.</p>
        </Card>}
        {tab === 'fast' && <FastTab p={p} upd={upd} />}
        {tab === 'settle' && <><SettleTab p={p} s={s} upd={upd} /><PartnerLedger P={p} admin /></>}
        {tab === 'score' && <PartnerReviews P={p} admin />}
        {tab === 'setup' && <Card title="چک‌لیست راه‌اندازی شعبه">
          <ul className="space-y-2">{p.checklist.map((c, i) => <li key={c.t} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-13"><button aria-label={c.t} onClick={() => upd((x) => { x.checklist[i].done = !c.done }, c.done ? 'برگرداندن مرحلهٔ راه‌اندازی' : 'تکمیل مرحلهٔ راه‌اندازی', c.t)} className={cx('grid size-6 place-items-center rounded-full border', c.done ? 'border-transparent bg-success-solid text-white' : 'border-line')}>{c.done && <Check size={13} />}</button><span className={c.done ? 'text-t2 line-through' : ''}>{c.t}</span></li>)}</ul>
          <div className="mt-4 flex flex-wrap gap-2">{p.status !== 'فعال' && <Button variant="primary" disabled={p.checklist.some((c) => !c.done)} onClick={() => { upd((x) => { x.status = 'فعال' }, 'فعال‌سازی شعبه'); notify('شعبهٔ تازه فعال شد', `${p.name} از امروز سفارش می‌گیرد.`, '/admin/sellers', 'عملیات'); toast('شعبه فعال شد و در سایت و صفحهٔ پرداخت دیده می‌شود.') }}>فعال‌سازی شعبه</Button>}
            {p.status === 'فعال' && <Button variant="danger" onClick={async () => { const why = await askReason({ kind: 'order', ref: p.id, status: 'توقف شعبه', title: `دلیل توقف ${p.name}` }); if (!why) return; upd((x) => { x.status = 'متوقف'; x.fast.on = false }, 'توقف موقت شعبه', why); toast('فروش از این انبار متوقف شد؛ سفارش‌های ثبت‌شده ادامه پیدا می‌کنند.') }}>توقف موقت فروش</Button>}
            {p.status === 'متوقف' && <Button onClick={() => upd((x) => { x.status = 'فعال' }, 'ازسرگیری فروش شعبه')}>ازسرگیری فروش</Button>}</div>
          {p.checklist.some((c) => !c.done) && <p className="mt-2 text-11 text-t2">تا همهٔ مراحل کامل نشود، شعبه فعال نمی‌شود.</p>}
        </Card>}
      </div>
      <Modal open={!!lot} onClose={() => setLot(null)} title="ثبت محموله برای این شعبه" footer={<Button variant="primary" disabled={!lot || !+lot.qty || !num(lot.price)} onClick={() => { const L = lot!; mutate((x) => { x.lots.unshift({ id: `LT-${Date.now().toString(36).slice(-4).toUpperCase()}`, partnerId: p.id, productId: L.productId, capital: L.capital, qty: +L.qty, soldOnline: 0, soldStore: 0, unitCost: num(L.cost), unitPrice: num(L.price), at: new Date().toISOString() }) }, { action: 'ثبت محمولهٔ شعبه', target: p.name, after: `${L.qty} عدد · ${CAPITAL[L.capital].label}` }); setLot(null); toast('محموله ثبت شد.') }}>ثبت</Button>}>
        {lot && <div className="space-y-3">
          <Field label="کالا"><Select value={lot.productId} onChange={(v) => setLot({ ...lot, productId: v, price: String(d.products.find((x) => x.id === v)?.price ?? d.products.find((x) => x.id === v)?.priceNew ?? '') })} options={d.products.map((x) => [x.id, x.title])} /></Field>
          <Field label="سرمایهٔ چه کسی؟"><Segmented value={lot.capital} onChange={(v) => setLot({ ...lot, capital: v })} options={(Object.keys(CAPITAL) as Capital[]).map((k) => [k, CAPITAL[k].short])} /></Field>
          <p className="rounded-xl bg-surface-2 p-2 text-12 text-t2">{CAPITAL[lot.capital].desc}</p>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="تعداد"><Input className="ltr text-left" inputMode="numeric" value={lot.qty} onChange={(e) => setLot({ ...lot, qty: e.target.value.replace(/\D/g, '') })} /></Field><Field label="قیمت خرید هر واحد"><Input className="ltr text-left" inputMode="numeric" value={lot.cost} onChange={(e) => setLot({ ...lot, cost: e.target.value.replace(/\D/g, '') })} /></Field><Field label="قیمت فروش هر واحد"><Input className="ltr text-left" inputMode="numeric" value={lot.price} onChange={(e) => setLot({ ...lot, price: e.target.value.replace(/\D/g, '') })} /></Field></div>
        </div>}
      </Modal>
    </Page>
  )
}

type Upd = (fn: (x: PartnerT) => void, action: string, after?: string) => void
function ContractTab({ p, upd }: { p: PartnerT; upd: Upd }) {
  const C = p.contract; const ex = 50000000
  const n = (k: keyof typeof C, label: string, help: string, unit = '٪') => <Field label={label} help={help}><div className="flex items-center gap-2"><Input className="ltr w-36 text-left" inputMode="numeric" defaultValue={String(C[k])} onBlur={(e) => { const v = num(e.target.value); if (v !== C[k]) upd((x) => { (x.contract as any)[k] = v }, `تغییر ${label}`, `${v}`) }} /><span className="text-12 text-t2">{unit}</span></div></Field>
  return <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
    <Card title="شرایط مالی قرارداد">
      <div className="grid gap-4 md:grid-cols-2">
        {n('hqCommission', 'کمیسیون شعبه از فروش کالای امانی غنیمت', 'سرمایه با شماست؛ شعبه این درصد از مبلغ فروش را می‌گیرد.')}
        {n('platformFee', 'کارمزد غنیمت از فروش کالای خود شعبه', 'سرمایه با شعبه است؛ غنیمت این درصد را برمی‌دارد.')}
        {n('sharedSplit', 'سهم شعبه در کالای سرمایهٔ مشترک', 'هم از اصل سرمایه و هم از سود.')}
        {n('minMargin', 'حداقل حاشیهٔ سود قیمت‌گذاری شعبه', 'شعبه نمی‌تواند کالای خودش را زیر این حاشیه قیمت بگذارد.')}
        {n('settleDays', 'دورهٔ تسویه', 'هر چند روز یک بار صورت‌حساب بسته می‌شود.', 'روز')}
        {n('noStockPenalty', 'جریمهٔ «ندارم» پس از فروش', 'برای هر سفارشی که شعبه بعد از فروش ناموجود اعلام کند.', 'تومان')}
        {n('deposit', 'ودیعه یا ضمانت‌نامه', 'سقف ارزش کالای امانی نزد شعبه بیشتر از این مبلغ نمی‌شود.', 'تومان')}
        <Field label="هزینهٔ مرجوعی با چه کسی است؟"><Select value={C.returnsBy} onChange={(v) => upd((x) => { x.contract.returnsBy = v }, 'تغییر مسئول هزینهٔ مرجوعی', v)} options={['صاحب سرمایه', 'شعبه', 'غنیمت', 'به نسبت سهم']} /></Field>
      </div>
    </Card>
    <Card title={`مثال: فروش ${compactToman(ex)}`}>
      {(Object.keys(CAPITAL) as Capital[]).map((k) => { const ps = k === 'hq' ? ex * C.hqCommission / 100 : k === 'partner' ? ex * (1 - C.platformFee / 100) : ex * C.sharedSplit / 100; return <div key={k} className="mb-3 rounded-xl border border-line p-3 text-12"><b className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CAPITAL[k].color }} />{CAPITAL[k].label}</b><p className="mt-1 flex justify-between"><span>سهم شعبه</span><b className="tnum">{toman(ps)}</b></p><p className="flex justify-between"><span>سهم غنیمت</span><b className="tnum">{toman(ex - ps)}</b></p></div> })}
      <p className="text-11 text-t2">فروش آنلاین را غنیمت دریافت می‌کند و سهم شعبه را می‌پردازد؛ فروش حضوری را شعبه دریافت می‌کند و سهم غنیمت را می‌پردازد. خالص این دو در تسویه حساب می‌شود.</p>
    </Card>
  </div>
}

function FastTab({ p, upd }: { p: PartnerT; upd: Upd }) {
  const F = p.fast
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title={<span className="flex items-center gap-2"><Truck size={15} />ارسال سریع از انبار {p.city}</span>}>
      <Toggle on={F.on} onChange={(v) => upd((x) => { x.fast.on = v }, v ? 'فعال‌کردن ارسال سریع شعبه' : 'خاموش‌کردن ارسال سریع شعبه')} text="ارسال سریع از این انبار فعال باشد" />
      <div className={cx('mt-3 grid gap-3 sm:grid-cols-2', !F.on && 'opacity-50')}>
        <div className="sm:col-span-2"><CityChips label={`شهرهای ارسال سریع ${p.name}`} value={F.cities} suggest={NEAR[p.warehouse] ?? []} onChange={(v) => upd((x) => { x.fast.cities = v }, 'تغییر شهرهای ارسال سریع', v)} /></div>
        <Field label="محدوده داخل شهر" help="مناطق یا محله‌ها با ویرگول؛ خالی یعنی کل شهر."><Input defaultValue={F.areas ?? ''} placeholder="مثلاً مرکز شهر، شهرک‌های اطراف" onBlur={(e) => upd((x) => { x.fast.areas = e.target.value }, 'تغییر محدودهٔ ارسال سریع', e.target.value)} /></Field>
        <Field label="شعاع از انبار (کیلومتر)" help="۰ یعنی بدون محدودیت شعاع؛ نشانی بیرون از شعاع فقط ارسال پستی می‌گیرد."><Input className="ltr text-left" defaultValue={String(F.radiusKm ?? 0)} onBlur={(e) => upd((x) => { x.fast.radiusKm = num(e.target.value) }, 'تغییر شعاع ارسال سریع')} /></Field>
        <Field label="وعدهٔ تحویل (ساعت)"><Input className="ltr text-left" defaultValue={String(F.hours)} onBlur={(e) => upd((x) => { x.fast.hours = num(e.target.value) }, 'تغییر وعدهٔ تحویل شعبه')} /></Field>
        <Field label="هزینهٔ ارسال (تومان)"><Input className="ltr text-left" defaultValue={String(F.fee)} onBlur={(e) => upd((x) => { x.fast.fee = num(e.target.value) }, 'تغییر هزینهٔ ارسال سریع شعبه')} /></Field>
        <Field label="ساعت قطع سفارش"><Input className="ltr text-left" defaultValue={F.cutoff} onBlur={(e) => upd((x) => { x.fast.cutoff = e.target.value }, 'تغییر ساعت قطع شعبه')} /></Field>
        <Field label="ظرفیت روزانه (سفارش)"><Input className="ltr text-left" defaultValue={String(F.capacity)} onBlur={(e) => upd((x) => { x.fast.capacity = num(e.target.value) }, 'تغییر ظرفیت شعبه')} /></Field>
        <Field label="پیک"><Select value={F.courier} onChange={(v) => upd((x) => { x.fast.courier = v }, 'تغییر پیک شعبه', v)} options={['پیک خود شعبه', 'اسنپ‌باکس', 'الوپیک', 'تپسی پک']} /></Field>
      </div>
      <p className="mt-2 text-11 text-t2">{F.on ? <>مشتریان {F.cities}{F.areas ? ` (${F.areas})` : ''}{F.radiusKm ? ` تا شعاع ${fa(F.radiusKm)} کیلومتری انبار` : ''} در صفحهٔ کالا «تحویل {fa(F.hours)} ساعته از انبار {p.city}» می‌بینند؛ اگر کالا در انبار تهران هم باشد، نزدیک‌ترین انبار انتخاب می‌شود.</> : <>ارسال سریع از این انبار خاموش است؛ کالایی که فقط در انبار {p.city} موجود است در سایت فقط «ارسال پیشتاز» می‌گیرد. هر وقت پیک و محدوده آماده شد، روشنش کنید.</>}</p>
    </Card>
    <Card title={<span className="flex items-center gap-2"><Package size={15} />انبار و خدمات</span>}>
      <Row k="نشانی انبار">{p.address || '—'}</Row><Row k="تلفن">{p.phone}</Row>
      <div className="mt-3 space-y-2 text-13">{([['pickup', 'دریافت حضوری از شعبه'], ['test', 'تست حضوری کالا'], ['ownProducts', 'اجازهٔ افزودن کالای خود شعبه (با تأیید غنیمت)'], ['storeSales', 'فروش حضوری در شعبه']] as const).map(([k, l]) => <div key={k}><Toggle on={p.services[k]} onChange={(v) => upd((x) => { x.services[k] = v }, `${v ? 'فعال' : 'غیرفعال'}‌کردن ${l}`)} text={l} /></div>)}</div>
    </Card>
  </div>
}

function SettleTab({ p, s, upd }: { p: PartnerT; s: ReturnType<typeof statement>; upd: Upd }) {
  return <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
    <Card title="صورت‌حساب دورهٔ جاری" pad={false}>
      <ul className="divide-y divide-line text-13">{s.rows.filter((r) => r.sold).map((r) => <li key={r.l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"><span><Badge dot={false}>{CAPITAL[r.l.capital].short}</Badge> {r.l.id} · {fa(r.l.soldOnline)} آنلاین، {fa(r.l.soldStore)} حضوری</span><span className="tnum text-12">{r.hqOwes > 0 && <span className="text-warning">بدهی ما {compactToman(r.hqOwes)}</span>}{r.partnerOwes > 0 && <span className="mr-2 text-success">طلب ما {compactToman(r.partnerOwes)}</span>}</span></li>)}</ul>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-14 font-bold"><span>{s.net >= 0 ? 'قابل پرداخت به شعبه' : 'قابل دریافت از شعبه'}</span><span className="tnum">{toman(Math.abs(s.net))}</span></div>
      <div className="flex flex-wrap gap-2 px-4 pb-4">{s.net > 0 && <Button variant="primary" icon={<Wallet size={14} />} onClick={async () => { if (!(await confirm({ title: `پرداخت ${toman(s.net)} به ${p.name}؟`, body: 'پرداخت پس از تأیید دوم مدیر مالی انجام می‌شود.', confirm: 'ارسال برای تأیید' }))) return; upd((x) => { x.payouts.unshift({ id: `PO-${Date.now().toString(36).slice(-3).toUpperCase()}`, at: new Date().toISOString(), amount: Math.round(s.net), status: 'در انتظار تأیید' }) }, 'درخواست تسویه با شعبه', toman(s.net)); toast('درخواست تسویه ثبت شد و برای تأیید دوم رفت.') }}>تسویه با شعبه</Button>}{s.net < 0 && <Button disabled={p.payouts.some((x) => x.status === 'در انتظار واریز شعبه')} onClick={() => { upd((x) => { x.payouts.unshift({ id: `IN-${Date.now().toString(36).slice(-3).toUpperCase()}`, at: new Date().toISOString(), amount: -s.net, status: 'در انتظار واریز شعبه', note: `صورت‌حساب دوره · پیامک به ${p.owner} (${p.phone})` }) }, 'درخواست واریز از شعبه'); notify('درخواست واریز از شعبه', `${p.name}: ${toman(-s.net)}`, '/admin/sellers', 'مالی', 'info'); toast(`صورت‌حساب ${toman(-s.net)} برای ${p.owner} پیامک شد و در «سابقهٔ تسویه» منتظر واریز ثبت شد.`) }}>{p.payouts.some((x) => x.status === 'در انتظار واریز شعبه') ? 'درخواست واریز ارسال شده' : 'درخواست واریز از شعبه'}</Button>}</div>
    </Card>
    <Card title="سابقهٔ تسویه">{p.payouts.length === 0 ? <EmptyState title="هنوز تسویه‌ای نشده است." /> : <ul className="space-y-2">{p.payouts.map((x) => <li key={x.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-12"><span><b className="ltr">{x.id}</b> · {rel(x.at)}</span><span className="flex items-center gap-2"><b className="tnum">{compactToman(x.amount)}</b><Badge tone={x.status === 'پرداخت شد' ? 'success' : x.status === 'ردشده' ? 'danger' : 'warning'}>{x.status}</Badge>{x.status === 'در انتظار تأیید' && <button className="text-brand" onClick={() => upd((y) => { y.payouts.find((z) => z.id === x.id)!.status = 'پرداخت شد' }, 'تأیید پرداخت تسویهٔ شعبه', x.id)}>تأیید</button>}</span></li>)}</ul>}
      <p className="mt-2 text-11 text-t2">دورهٔ تسویه: هر {fa(p.contract.settleDays)} روز · نرخ‌ها در «قرارداد و کمیسیون».</p></Card>
  </div>
}

export const capitalPct = (n: number) => pct(n)
