import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarClock, Check, FileSignature, FileText, HandCoins, IdCard, NotebookPen, Paperclip, Plus, Printer, Trash2, UserPlus, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, Card, cx, Field, Input, Masked, Select, Tabs, Textarea, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import { CONTRACT_KINDS, PAY_METHODS, PAY_TYPES, type Employee, type PayItem } from '@/shared/data/people'
import type { DB } from '@/shared/data/seed'
import { useTab } from '../pages/_shared'

const fd = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
const days = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 864e5)
const ST: Record<Employee['status'], [string, 'success' | 'warning' | 'neutral']> = { active: ['فعال', 'success'], probation: ['دورهٔ آزمایشی', 'warning'], left: ['پایان همکاری', 'neutral'] }
const PS: Record<PayItem['status'], [string, 'success' | 'warning' | 'info']> = { paid: ['پرداخت شد', 'success'], due: ['سررسید / منتظر پرداخت', 'warning'], scheduled: ['زمان‌بندی‌شده', 'info'] }
const DEDUCT = ['قسط وام (کسر)', 'کسر از حقوق']

/** محاسبهٔ فیش: ناخالص، بیمهٔ سهم کارمند، مالیات، قسط وام، خالص و هزینهٔ کارفرما */
export function payslip(e: Employee, c: DB['peopleCfg']) {
  const s = e.salary; const gross = s.base + s.housing + s.bon + s.child + s.overtime + s.other
  const ins = e.insured ? Math.round((gross - s.bon) * c.insEmployee / 100) : 0
  const tax = Math.max(0, Math.round((gross - c.taxFree) * c.taxRate / 100))
  const loan = e.loans.filter((l) => l.paid < l.installments).reduce((a, l) => a + Math.round(l.amount / l.installments), 0)
  const employer = e.insured ? Math.round((gross - s.bon) * c.insEmployer / 100) : 0
  return { gross, ins, tax, loan, net: gross - ins - tax - loan, employer, cost: gross + employer }
}
const nextPay = (e: Employee) => e.pay.filter((p) => p.status !== 'paid').sort((a, b) => a.date.localeCompare(b.date))[0]
const contractEnd = (e: Employee) => e.contracts.map((c) => c.to).sort().at(-1) ?? ''

export function People() {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useTab('staff'); const [add, setAdd] = useState(false); const [f, setF] = useState({ name: '', position: '', dept: 'عملیات', base: '', kind: 'تمام‌وقت', teamId: '' })
  const P = d.people.filter((e) => e.status !== 'left'); const cfg = d.peopleCfg
  const all = d.people.flatMap((e) => e.pay.map((p) => ({ ...p, emp: e })))
  const upcoming = all.filter((p) => p.status !== 'paid' && days(p.date) <= 7)
  const expiring = d.people.flatMap((e) => e.contracts.filter((c) => days(c.to) <= 30 && days(c.to) >= -5).map((c) => ({ ...c, emp: e })))
  const loans = d.people.flatMap((e) => e.loans.map((l) => ({ ...l, emp: e })))
  const create = () => {
    if (!f.name.trim() || !f.position.trim()) return toast('نام و سمت را بنویسید.', { tone: 'err' })
    const id = `e${Date.now().toString(36)}`; const base = Number(f.base.replace(/\D/g, '')) || cfg.minWage
    mutate((x) => { x.people.unshift({ id, teamId: f.teamId || undefined, name: f.name, position: f.position, dept: f.dept, status: 'probation', nationalId: '', birth: '', father: '', phone: '', address: '', emergency: '', sheba: '', card: '', insuranceNo: '', start: new Date().toISOString(), contractType: f.kind, salary: { base, housing: cfg.housing, bon: cfg.bon, child: 0, overtime: 0, other: 0 }, payDay: 1, insured: f.kind !== 'پروژه‌ای', contracts: [], pay: [], loans: [], notes: [{ id: `n${Date.now()}`, at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', kind: 'استخدام', text: 'پروندهٔ پرسنلی ساخته شد.' }], docs: [] }) }, { action: 'ساخت پروندهٔ پرسنلی', target: f.name })
    setAdd(false); nav(`/admin/people/${id}`)
  }
  return (
    <Page title="پرسنل، قرارداد و حقوق" module="people" sub="پروندهٔ مکتوب هر همکار: مدارک هویتی، قرارداد، حقوق و بیمه، پرداخت‌ها، مساعده و وام. همهٔ تغییرها در لاگ ممیزی ثبت می‌شوند."
      primary={<Button variant="primary" icon={<UserPlus size={14} />} onClick={() => setAdd(true)}>پروندهٔ همکار تازه</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'staff', label: 'همکاران', count: P.length }, { id: 'pay', label: 'پرداخت‌ها و موعدها', count: upcoming.length }, { id: 'contracts', label: 'قراردادها', count: expiring.length }, { id: 'loans', label: 'مساعده و وام', count: loans.filter((l) => l.paid < l.installments).length }, { id: 'cfg', label: 'نرخ بیمه و مالیات' }]} />}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Wallet size={17} />} label="هزینهٔ حقوق این ماه" value={compactToman(P.reduce((a, e) => a + payslip(e, cfg).cost, 0))} note={`خالص پرداختی ${compactToman(P.reduce((a, e) => a + payslip(e, cfg).net, 0))}`} />
        <KPI label="پرداخت در ۷ روز آینده" icon={<CalendarClock size={17} />} tone="warning" value={fa(upcoming.length)} note={upcoming.length ? compactToman(upcoming.reduce((a, p) => a + p.amount, 0)) : 'موردی نیست'} to="/admin/people?tab=pay" />
        <KPI label="قرارداد رو به پایان (۳۰ روز)" icon={<FileSignature size={17} />} tone="danger" value={fa(expiring.length)} to="/admin/people?tab=contracts" />
        <KPI label="مانده وام و مساعده" icon={<HandCoins size={17} />} tone="info" value={compactToman(loans.reduce((a, l) => a + Math.round(l.amount / l.installments) * (l.installments - l.paid), 0))} to="/admin/people?tab=loans" />
      </div>
      {tab === 'staff' && <DataTable name="همکاران" rows={d.people} rowKey={(e) => e.id} onRow={(e) => nav(`/admin/people/${e.id}`)} empty={{ title: 'هنوز پرونده‌ای ساخته نشده است.' }}
        cols={[{ key: 'n', title: 'همکار', render: (e) => <span className="flex items-center gap-2"><Avatar name={e.name} /><span><b className="block">{e.name}</b><span className="text-11 text-t2">{e.position}</span></span></span>, text: (e) => `${e.name} ${e.position}` },
          { key: 'dept', title: 'واحد', render: (e) => e.dept }, { key: 'k', title: 'نوع همکاری', render: (e) => e.contractType }, { key: 's', title: 'وضعیت', render: (e) => <Badge tone={ST[e.status][1]}>{ST[e.status][0]}</Badge>, text: (e) => ST[e.status][0] },
          { key: 'net', title: 'خالص ماهانه', align: 'left', render: (e) => toman(payslip(e, cfg).net), sort: (e) => payslip(e, cfg).net },
          { key: 'ins', title: 'بیمه', render: (e) => e.insured ? <Badge tone="success">بیمه‌شده</Badge> : <Badge tone="warning">بدون بیمه</Badge>, text: (e) => (e.insured ? 'بیمه‌شده' : 'بدون بیمه') },
          { key: 'next', title: 'پرداخت بعدی', render: (e) => { const n = nextPay(e); return n ? <span className={cx('text-12', days(n.date) <= 3 && 'font-semibold text-danger')}>{n.type} · {fd(n.date)}</span> : '—' }, sort: (e) => nextPay(e)?.date ?? 'z' },
          { key: 'end', title: 'پایان قرارداد', render: (e) => { const t = contractEnd(e); return t ? <span className={cx('text-12', days(t) <= 30 && 'font-semibold text-warning')}>{fd(t)}</span> : <Badge tone="warning">قرارداد ندارد</Badge> }, sort: (e) => contractEnd(e) },
          { key: 'start', title: 'شروع همکاری', render: (e) => <span className="text-12 text-t2">{fd(e.start)}</span>, sort: (e) => e.start }]} />}
      {tab === 'pay' && <DataTable name="پرداخت‌ها" rows={[...all].sort((a, b) => b.date.localeCompare(a.date))} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/people/${p.emp.id}?tab=pay`)} empty={{ title: 'پرداختی ثبت نشده است.' }}
        cols={[{ key: 'date', title: 'تاریخ', render: (p) => fd(p.date), sort: (p) => p.date }, { key: 'e', title: 'همکار', render: (p) => p.emp.name }, { key: 't', title: 'نوع', render: (p) => p.type }, { key: 'a', title: 'مبلغ', align: 'left', render: (p) => <span className={DEDUCT.includes(p.type) ? 'text-danger' : ''}>{DEDUCT.includes(p.type) ? '−' : ''}{toman(p.amount)}</span>, sort: (p) => p.amount }, { key: 'm', title: 'روش', render: (p) => p.method }, { key: 's', title: 'وضعیت', render: (p) => <Badge tone={PS[p.status][1]}>{PS[p.status][0]}</Badge>, text: (p) => PS[p.status][0] }, { key: 'n', title: 'شرح', wrap: true, render: (p) => <span className="text-12 text-t2">{p.note || '—'}</span> }]} />}
      {tab === 'contracts' && <DataTable name="قراردادها" rows={d.people.flatMap((e) => e.contracts.map((c) => ({ ...c, emp: e })))} rowKey={(c) => c.id} onRow={(c) => nav(`/admin/people/${c.emp.id}?tab=contracts`)} empty={{ title: 'قراردادی ثبت نشده است.' }}
        cols={[{ key: 'e', title: 'همکار', render: (c) => c.emp.name }, { key: 't', title: 'قرارداد', render: (c) => c.title }, { key: 'k', title: 'نوع', render: (c) => c.kind }, { key: 'f', title: 'از', render: (c) => fd(c.from), sort: (c) => c.from }, { key: 'to', title: 'تا', render: (c) => <span className={cx(days(c.to) <= 30 && 'font-semibold text-danger')}>{fd(c.to)}{days(c.to) <= 30 && days(c.to) >= 0 && ` (${fa(days(c.to))} روز مانده)`}</span>, sort: (c) => c.to }, { key: 'sal', title: 'حقوق پایه', align: 'left', render: (c) => toman(c.salary), sort: (c) => c.salary }, { key: 'sg', title: 'امضا', render: (c) => c.signed ? <Badge tone="success">امضاشده</Badge> : <Badge tone="danger">امضا نشده</Badge>, text: (c) => (c.signed ? 'امضاشده' : 'امضا نشده') }]} />}
      {tab === 'loans' && <DataTable name="مساعده و وام" rows={loans} rowKey={(l) => l.id} onRow={(l) => nav(`/admin/people/${l.emp.id}?tab=loans`)} empty={{ title: 'وام یا مساعدهٔ فعالی نیست.' }}
        cols={[{ key: 'e', title: 'همکار', render: (l) => l.emp.name }, { key: 't', title: 'عنوان', render: (l) => l.title }, { key: 'a', title: 'مبلغ', align: 'left', render: (l) => toman(l.amount), sort: (l) => l.amount }, { key: 'i', title: 'اقساط', render: (l) => `${fa(l.paid)} از ${fa(l.installments)}` }, { key: 'r', title: 'مانده', align: 'left', render: (l) => toman(Math.round(l.amount / l.installments) * (l.installments - l.paid)), sort: (l) => l.installments - l.paid }]} />}
      {tab === 'cfg' && <Card title="نرخ‌های پایه برای محاسبهٔ فیش" className="max-w-2xl"><div className="grid gap-3 sm:grid-cols-2">{([['insEmployee', 'بیمهٔ سهم کارمند (٪)'], ['insEmployer', 'بیمهٔ سهم کارفرما (٪)'], ['taxFree', 'سقف معافیت مالیات (تومان)'], ['taxRate', 'نرخ مالیات مازاد (٪)'], ['minWage', 'حداقل دستمزد (تومان)'], ['housing', 'حق مسکن پیش‌فرض (تومان)'], ['bon', 'بن خواربار پیش‌فرض (تومان)'], ['child', 'حق اولاد هر فرزند (تومان)']] as [keyof DB['peopleCfg'], string][]).map(([k, l]) => <Field key={k} label={l}><Input inputMode="numeric" value={String(cfg[k])} onChange={(e) => mutate((x) => { x.peopleCfg[k] = Number(e.target.value.replace(/\D/g, '')) }, { action: 'تغییر نرخ حقوق و بیمه', target: l })} /></Field>)}</div><p className="mt-3 text-11 text-t2">این نرخ‌ها نمونه‌اند. پیش از استفاده، با بخشنامهٔ سال جاری تأمین اجتماعی و قانون مالیات تطبیق دهید.</p></Card>}
      <Modal open={add} onClose={() => setAdd(false)} title="پروندهٔ همکار تازه" footer={<><Button variant="primary" onClick={create}>ساخت پرونده</Button><Button variant="ghost" onClick={() => setAdd(false)}>انصراف</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="سمت"><Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
          <Field label="واحد"><Select value={f.dept} onChange={(v) => setF({ ...f, dept: v })} options={['عملیات', 'انبار', 'پشتیبانی', 'مالی', 'رشد', 'محتوا', 'فنی', 'شعبه']} /></Field>
          <Field label="نوع همکاری"><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={CONTRACT_KINDS} /></Field>
          <Field label="حقوق پایه (تومان)"><Input inputMode="numeric" placeholder={String(cfg.minWage)} value={f.base} onChange={(e) => setF({ ...f, base: e.target.value })} /></Field>
          <Field label="حساب پنل (اختیاری)"><Select value={f.teamId} onChange={(v) => setF({ ...f, teamId: v })} options={[['', 'بدون حساب پنل'], ...d.team.map((u) => [u.id, u.name] as [string, string])]} /></Field>
        </div>
      </Modal>
    </Page>
  )
}

/** پروندهٔ یک همکار: همه‌چیز مکتوب و قابل ویرایش */
export function PersonFile() {
  const { id = '' } = useParams(); const d = useDB(); const nav = useNavigate(); const e = d.people.find((x) => x.id === id); const [tab, setTab] = useTab('id')
  const [pay, setPay] = useState<PayItem | null>(null); const [slip, setSlip] = useState(false); const [note, setNote] = useState(''); const [loan, setLoan] = useState({ title: '', amount: '', n: '6' })
  if (!e) return <Page title="پرونده پیدا نشد" module="people"><Card><Button onClick={() => nav('/admin/people')}>بازگشت به فهرست</Button></Card></Page>
  const cfg = d.peopleCfg; const s = payslip(e, cfg)
  const up = (fn: (x: Employee) => void, action: string) => mutate((x) => fn(x.people.find((y) => y.id === id)!), { action, target: e.name })
  const txt = (k: keyof Employee, l: string, ltr?: boolean) => <Field label={l}><Input className={ltr ? 'ltr text-left font-mono' : ''} value={String(e[k] ?? '')} onChange={(ev) => up((x) => { (x[k] as string) = ev.target.value }, `ویرایش ${l}`)} /></Field>
  const money = (k: keyof Employee['salary'], l: string) => <Field label={l}><Input inputMode="numeric" value={String(e.salary[k])} onChange={(ev) => up((x) => { x.salary[k] = Number(ev.target.value.replace(/\D/g, '')) }, `تغییر ${l}`)} /></Field>
  const savePay = () => { if (!pay) return; if (!pay.amount) return toast('مبلغ را وارد کنید.', { tone: 'err' }); up((x) => { const i = x.pay.findIndex((p) => p.id === pay.id); if (i >= 0) x.pay[i] = pay; else x.pay.unshift(pay) }, `ثبت ${pay.type}`); setPay(null); toast(`${pay.type} ${toman(pay.amount)} برای ${e.name} ثبت شد.`) }
  const upload = async (file: File, title: string) => { const img = file.type.startsWith('image/') ? await fileToImage(file, 1400, 0.82) : URL.createObjectURL(file); up((x) => { x.docs.unshift({ id: `doc${Date.now()}`, title, file: img, at: new Date().toISOString() }) }, `بارگذاری ${title}`); toast(`«${title}» به پرونده اضافه شد.`) }
  return (
    <Page title={e.name} module="people" back="/admin/people" sub={`${e.position} · ${e.dept} · ${e.contractType} · از ${fd(e.start)}`} badge={<Badge tone={ST[e.status][1]}>{ST[e.status][0]}</Badge>}
      primary={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setPay({ id: `p${Date.now()}`, date: new Date().toISOString(), type: 'مساعده', amount: 0, method: 'کارت به کارت', status: 'paid', by: currentUser()?.name })}>ثبت پرداخت یا مساعده</Button>}
      actions={<Button icon={<Printer size={14} />} onClick={() => setSlip(true)}>فیش حقوقی</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'id', label: 'اطلاعات هویتی و بانکی' }, { id: 'contracts', label: 'قراردادها', count: e.contracts.length }, { id: 'salary', label: 'حقوق و بیمه' }, { id: 'pay', label: 'پرداخت‌ها', count: e.pay.length }, { id: 'loans', label: 'مساعده و وام', count: e.loans.length }, { id: 'notes', label: 'یادداشت و مدارک', count: e.notes.length + e.docs.length }]} />}>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="خالص ماهانه" icon={<Wallet size={17} />} value={toman(s.net)} note={`ناخالص ${toman(s.gross)}`} />
        <KPI label="هزینهٔ کامل برای غنیمت" value={toman(s.cost)} tone="info" note={`بیمهٔ کارفرما ${toman(s.employer)}`} />
        <KPI label="پرداخت بعدی" icon={<CalendarClock size={17} />} tone={nextPay(e) && days(nextPay(e)!.date) <= 3 ? 'warning' : 'brand'} value={nextPay(e) ? fd(nextPay(e)!.date) : '—'} note={nextPay(e)?.type} />
        <KPI label="پایان قرارداد" icon={<FileSignature size={17} />} tone={contractEnd(e) && days(contractEnd(e)) <= 30 ? 'danger' : 'brand'} priority={!!contractEnd(e) && days(contractEnd(e)) <= 30} value={contractEnd(e) ? fd(contractEnd(e)) : 'قرارداد ندارد'} note={contractEnd(e) ? `${fa(Math.max(0, days(contractEnd(e))))} روز مانده` : ''} />
      </div>
      {tab === 'id' && <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-1.5"><IdCard size={15} />هویتی</span>}><div className="grid gap-3 sm:grid-cols-2">{txt('name', 'نام و نام خانوادگی')}{txt('nationalId', 'کد ملی', true)}{txt('father', 'نام پدر')}{txt('birth', 'تاریخ تولد')}{txt('phone', 'موبایل', true)}{txt('emergency', 'تماس اضطراری')}<div className="sm:col-span-2">{txt('address', 'نشانی')}</div>{txt('position', 'سمت')}<Field label="وضعیت"><Select value={e.status} onChange={async (v) => { if (v === 'left') { const why = await askReason({ kind: 'cancel', ref: e.name, status: 'پایان همکاری', title: `دلیل پایان همکاری ${e.name}` }); if (!why) return; up((x) => { x.status = 'left'; x.notes.unshift({ id: `n${Date.now()}`, at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', kind: 'پایان همکاری', text: why }) }, 'پایان همکاری'); return } up((x) => { x.status = v as Employee['status'] }, 'تغییر وضعیت همکاری') }} options={Object.entries(ST).map(([k, [l]]) => [k, l] as [string, string])} /></Field></div></Card>
        <Card title="بانکی و بیمه"><div className="grid gap-3">{txt('sheba', 'شمارهٔ شبا', true)}{txt('card', 'شمارهٔ کارت', true)}{txt('insuranceNo', 'شمارهٔ بیمه', true)}<p className="text-12 text-t2">نمایش در فهرست‌ها: <Masked id={`emp-${e.id}`} value={e.nationalId || '—'} label={`کد ملی ${e.name}`} /></p><Toggle on={e.insured} onChange={(v) => up((x) => { x.insured = v }, v ? 'فعال کردن بیمه' : 'غیرفعال کردن بیمه')} text="بیمهٔ تأمین اجتماعی دارد" /></div></Card>
      </div>}
      {tab === 'contracts' && <div className="space-y-3">
        <div className="flex justify-end"><Button icon={<Plus size={14} />} onClick={() => up((x) => { x.contracts.unshift({ id: `c${Date.now()}`, title: `قرارداد ${x.contractType} تازه`, kind: x.contractType, from: new Date().toISOString(), to: new Date(Date.now() + 365 * 864e5).toISOString(), salary: x.salary.base, signed: false }) }, 'افزودن قرارداد')}>قرارداد یا تمدید تازه</Button></div>
        {e.contracts.map((c, i) => <Card key={c.id} title={<span className="flex items-center gap-2">{c.title}{c.signed ? <Badge tone="success">امضاشده</Badge> : <Badge tone="danger">امضا نشده</Badge>}</span>} actions={<button type="button" aria-label="حذف قرارداد" onClick={async () => { const why = await askReason({ kind: 'cancel', ref: c.title, status: 'حذف قرارداد', title: 'دلیل حذف قرارداد' }); if (why) up((x) => { x.contracts.splice(i, 1) }, `حذف قرارداد: ${why}`) }} className="text-t2 hover:text-danger"><Trash2 size={14} /></button>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="عنوان"><Input value={c.title} onChange={(ev) => up((x) => { x.contracts[i].title = ev.target.value }, 'ویرایش قرارداد')} /></Field>
            <Field label="نوع"><Select value={c.kind} onChange={(v) => up((x) => { x.contracts[i].kind = v }, 'ویرایش نوع قرارداد')} options={CONTRACT_KINDS} /></Field>
            <Field label="از تاریخ"><Input type="date" value={c.from.slice(0, 10)} onChange={(ev) => up((x) => { x.contracts[i].from = new Date(ev.target.value).toISOString() }, 'ویرایش تاریخ قرارداد')} /></Field>
            <Field label="تا تاریخ" hint={<span className="text-11 text-t2">{fd(c.to)}</span>}><Input type="date" value={c.to.slice(0, 10)} onChange={(ev) => up((x) => { x.contracts[i].to = new Date(ev.target.value).toISOString() }, 'ویرایش تاریخ قرارداد')} /></Field>
            <Field label="حقوق پایه در قرارداد (تومان)"><Input inputMode="numeric" value={String(c.salary)} onChange={(ev) => up((x) => { x.contracts[i].salary = Number(ev.target.value.replace(/\D/g, '')) }, 'ویرایش مبلغ قرارداد')} /></Field>
            <div className="sm:col-span-2"><Field label="شرایط و توضیح"><Textarea rows={2} value={c.note ?? ''} onChange={(ev) => up((x) => { x.contracts[i].note = ev.target.value }, 'ویرایش شرایط قرارداد')} /></Field></div>
            <div className="flex flex-col justify-end gap-2"><Toggle on={c.signed} onChange={(v) => up((x) => { x.contracts[i].signed = v }, v ? 'ثبت امضای قرارداد' : 'برداشتن امضای قرارداد')} text="امضا شده" />
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-12 hover:bg-neutral-bg"><Paperclip size={13} />{c.file ? 'جایگزینی فایل امضاشده' : 'بارگذاری فایل امضاشده'}<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={async (ev) => { const fl = ev.target.files?.[0]; if (!fl) return; const v = fl.type.startsWith('image/') ? await fileToImage(fl, 1400, 0.82) : URL.createObjectURL(fl); up((x) => { x.contracts[i].file = v; x.contracts[i].signed = true }, 'بارگذاری قرارداد امضاشده') }} /></label>
              {c.file && <a href={c.file} target="_blank" rel="noreferrer" className="text-12 text-brand underline">مشاهدهٔ فایل</a>}</div>
          </div>
        </Card>)}
        {e.contracts.length === 0 && <Card><p className="py-6 text-center text-13 text-t2">هنوز قراردادی برای {e.name} ثبت نشده است.</p></Card>}
      </div>}
      {tab === 'salary' && <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card title="اجزای حقوق ماهانه"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{money('base', 'حقوق پایه')}{money('housing', 'حق مسکن')}{money('bon', 'بن خواربار')}{money('child', 'حق اولاد')}{money('overtime', 'اضافه‌کار')}{money('other', 'سایر مزایا')}<Field label="روز پرداخت در ماه"><Input type="number" min={1} max={31} value={e.payDay} onChange={(ev) => up((x) => { x.payDay = Number(ev.target.value) }, 'تغییر روز پرداخت حقوق')} /></Field></div></Card>
        <Card title="خلاصهٔ فیش این ماه"><dl className="space-y-1.5 text-13">{([['ناخالص', s.gross], ['بیمهٔ سهم کارمند', -s.ins], ['مالیات', -s.tax], ['قسط وام', -s.loan]] as [string, number][]).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-t2">{k}</dt><dd className={cx('tnum', v < 0 && 'text-danger')}>{v < 0 ? '−' : ''}{toman(Math.abs(v))}</dd></div>)}<div className="flex justify-between border-t border-line pt-2 font-bold"><dt>خالص پرداختی</dt><dd className="tnum text-success">{toman(s.net)}</dd></div><div className="flex justify-between text-12 text-t2"><dt>بیمهٔ سهم کارفرما</dt><dd className="tnum">{toman(s.employer)}</dd></div></dl>
          <Button className="mt-3 w-full" variant="primary" icon={<Check size={14} />} onClick={() => up((x) => { x.pay.unshift({ id: `p${Date.now()}`, date: new Date().toISOString(), type: 'حقوق ماهانه', amount: s.net, method: 'پایا (شبا)', status: 'paid', by: currentUser()?.name, note: `ناخالص ${toman(s.gross)}، کسورات ${toman(s.ins + s.tax + s.loan)}` }); x.loans.forEach((l) => { if (l.paid < l.installments) l.paid++ }) }, 'پرداخت حقوق ماهانه')}>ثبت پرداخت حقوق این ماه</Button></Card>
      </div>}
      {tab === 'pay' && <DataTable name={`پرداخت‌های ${e.name}`} rows={[...e.pay].sort((a, b) => b.date.localeCompare(a.date))} rowKey={(p) => p.id} onRow={(p) => setPay({ ...p })} empty={{ title: 'پرداختی ثبت نشده است.' }}
        cols={[{ key: 'date', title: 'تاریخ', render: (p) => fd(p.date), sort: (p) => p.date }, { key: 't', title: 'نوع', render: (p) => p.type }, { key: 'a', title: 'مبلغ', align: 'left', render: (p) => <span className={DEDUCT.includes(p.type) ? 'text-danger' : ''}>{DEDUCT.includes(p.type) ? '−' : ''}{toman(p.amount)}</span>, sort: (p) => p.amount }, { key: 'm', title: 'روش', render: (p) => p.method }, { key: 's', title: 'وضعیت', render: (p) => <Badge tone={PS[p.status][1]}>{PS[p.status][0]}</Badge>, text: (p) => PS[p.status][0] }, { key: 'by', title: 'ثبت‌کننده', render: (p) => p.by ?? '—' }, { key: 'n', title: 'شرح', wrap: true, render: (p) => <span className="text-12 text-t2">{p.note || '—'}</span> }]} />}
      {tab === 'loans' && <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">{e.loans.map((l, i) => <Card key={l.id} title={l.title} actions={<Badge tone={l.paid >= l.installments ? 'success' : 'info'}>{l.paid >= l.installments ? 'تسویه شد' : `${fa(l.installments - l.paid)} قسط مانده`}</Badge>}><div className="mb-2 h-2 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full bg-brand" style={{ width: `${(l.paid / l.installments) * 100}%` }} /></div><p className="text-12 text-t2">{toman(l.amount)} در {fa(l.installments)} قسط {toman(Math.round(l.amount / l.installments))} · شروع {fd(l.start)}</p>{l.note && <p className="mt-1 text-12">{l.note}</p>}<div className="mt-2 flex gap-2"><Button size="sm" disabled={l.paid >= l.installments} onClick={() => up((x) => { x.loans[i].paid++; x.pay.unshift({ id: `p${Date.now()}`, date: new Date().toISOString(), type: 'قسط وام (کسر)', amount: Math.round(l.amount / l.installments), method: 'کسر از حقوق' as string, status: 'paid', loanId: l.id, by: currentUser()?.name }) }, 'ثبت قسط وام')}>ثبت یک قسط</Button><Button size="sm" variant="ghost" disabled={l.paid === 0} onClick={() => up((x) => { x.loans[i].paid-- }, 'برگرداندن قسط وام')}>برگرداندن قسط</Button></div></Card>)}{e.loans.length === 0 && <Card><p className="py-6 text-center text-13 text-t2">وام یا مساعدهٔ قسطی فعالی نیست.</p></Card>}</div>
        <Card title="وام یا مساعدهٔ قسطی تازه"><div className="space-y-3"><Field label="عنوان"><Input value={loan.title} onChange={(ev) => setLoan({ ...loan, title: ev.target.value })} placeholder="مثلاً وام ودیعهٔ مسکن" /></Field><Field label="مبلغ (تومان)"><Input inputMode="numeric" value={loan.amount} onChange={(ev) => setLoan({ ...loan, amount: ev.target.value })} /></Field><Field label="تعداد قسط"><Input type="number" min={1} value={loan.n} onChange={(ev) => setLoan({ ...loan, n: ev.target.value })} /></Field><Button variant="primary" className="w-full" onClick={() => { const a = Number(loan.amount.replace(/\D/g, '')); if (!loan.title || !a) return toast('عنوان و مبلغ را وارد کنید.', { tone: 'err' }); up((x) => { const lid = `l${Date.now()}`; x.loans.unshift({ id: lid, title: loan.title, amount: a, installments: Math.max(1, Number(loan.n)), paid: 0, start: new Date().toISOString() }); x.pay.unshift({ id: `p${Date.now()}`, date: new Date().toISOString(), type: 'وام', amount: a, method: 'پایا (شبا)', status: 'paid', loanId: lid, by: currentUser()?.name, note: loan.title }) }, 'ثبت وام'); setLoan({ title: '', amount: '', n: '6' }) }}>ثبت و پرداخت</Button></div></Card>
      </div>}
      {tab === 'notes' && <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-1.5"><NotebookPen size={15} />یادداشت‌های مکتوب</span>}>
          <Textarea rows={3} placeholder="توافق شفاهی، تشویق، تذکر، درخواست مرخصی…" value={note} onChange={(ev) => setNote(ev.target.value)} /><Button className="mt-2" size="sm" variant="primary" disabled={!note.trim()} onClick={() => { up((x) => { x.notes.unshift({ id: `n${Date.now()}`, at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', kind: 'یادداشت', text: note }) }, 'ثبت یادداشت پرسنلی'); setNote('') }}>ثبت در پرونده</Button>
          <ul className="mt-4 space-y-2">{e.notes.map((n) => <li key={n.id} className="rounded-lg border border-line p-2.5 text-13"><p className="mb-1 flex justify-between text-11 text-t2"><span>{n.kind} · {n.by}</span><span>{fd(n.at)}</span></p>{n.text}</li>)}</ul>
        </Card>
        <Card title={<span className="flex items-center gap-1.5"><FileText size={15} />مدارک</span>}>
          <div className="mb-3 flex flex-wrap gap-2">{['کپی کارت ملی', 'کپی شناسنامه', 'قرارداد امضاشده', 'سفته یا چک ضمانت', 'گواهی عدم سوءپیشینه', 'مدرک تحصیلی'].map((t) => <label key={t} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-line px-2.5 text-12 hover:bg-neutral-bg"><Paperclip size={12} />{t}<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(ev) => { const fl = ev.target.files?.[0]; if (fl) void upload(fl, t) }} /></label>)}</div>
          <ul className="divide-y divide-line">{e.docs.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-13"><span className="flex items-center gap-2">{x.file && x.file.startsWith('data:image') ? <img src={x.file} alt="" className="size-10 rounded object-cover" /> : <FileText size={16} className="text-t2" />}{x.title}</span><span className="flex items-center gap-2 text-11 text-t2">{rel(x.at)}{x.file && <a href={x.file} target="_blank" rel="noreferrer" className="text-brand underline">مشاهده</a>}</span></li>)}</ul>
        </Card>
      </div>}
      <Modal open={!!pay} onClose={() => setPay(null)} title={pay && e.pay.some((p) => p.id === pay.id) ? 'ویرایش پرداخت' : 'ثبت پرداخت تازه'} footer={<><Button variant="primary" onClick={savePay}>ذخیره</Button><Button variant="ghost" onClick={() => setPay(null)}>انصراف</Button></>}>
        {pay && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نوع"><Select value={pay.type} onChange={(v) => setPay({ ...pay, type: v })} options={PAY_TYPES} /></Field>
          <Field label="مبلغ (تومان)"><Input inputMode="numeric" value={pay.amount ? String(pay.amount) : ''} onChange={(ev) => setPay({ ...pay, amount: Number(ev.target.value.replace(/\D/g, '')) })} /></Field>
          <Field label="تاریخ"><Input type="date" value={pay.date.slice(0, 10)} onChange={(ev) => setPay({ ...pay, date: new Date(`${ev.target.value}T10:00:00`).toISOString() })} /></Field>
          <Field label="روش"><Select value={pay.method} onChange={(v) => setPay({ ...pay, method: v })} options={PAY_METHODS} /></Field>
          <Field label="وضعیت"><Select value={pay.status} onChange={(v) => setPay({ ...pay, status: v as PayItem['status'] })} options={Object.entries(PS).map(([k, [l]]) => [k, l] as [string, string])} /></Field>
          <div className="sm:col-span-2"><Field label="شرح (مکتوب در پرونده)"><Textarea rows={2} value={pay.note ?? ''} onChange={(ev) => setPay({ ...pay, note: ev.target.value })} /></Field></div>
        </div>}
      </Modal>
      <Modal open={slip} onClose={() => setSlip(false)} title="فیش حقوقی" footer={<Button icon={<Printer size={14} />} onClick={() => window.print()}>چاپ</Button>}>
        <div className="space-y-2 text-13"><p className="flex justify-between"><b>{e.name}</b><span className="text-t2">{e.position}</span></p><p className="text-12 text-t2">کد ملی {e.nationalId || '—'} · بیمه {e.insuranceNo || '—'}</p>
          <table className="gh-table mt-2 w-full text-13"><tbody>{([['حقوق پایه', e.salary.base], ['حق مسکن', e.salary.housing], ['بن خواربار', e.salary.bon], ['حق اولاد', e.salary.child], ['اضافه‌کار', e.salary.overtime], ['سایر مزایا', e.salary.other], ['بیمهٔ سهم کارمند', -s.ins], ['مالیات', -s.tax], ['قسط وام', -s.loan]] as [string, number][]).filter(([, v]) => v).map(([k, v]) => <tr key={k}><td className="px-3 py-1.5">{k}</td><td className={cx('tnum px-3 py-1.5 text-left', v < 0 && 'text-danger')}>{v < 0 ? '−' : ''}{toman(Math.abs(v))}</td></tr>)}<tr><td className="px-3 py-2 font-bold">خالص پرداختی</td><td className="tnum px-3 py-2 text-left font-bold">{toman(s.net)}</td></tr></tbody></table></div>
      </Modal>
    </Page>
  )
}
