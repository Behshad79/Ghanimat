import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Camera, Check, CircleAlert, GripVertical, ImagePlus, Plus, RefreshCw, Sparkles, Star, Trash2 } from 'lucide-react'
import { AITag, Badge, Button, Card, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { Hint, toast } from '@/shared/ui/overlay'
import { Barcode, QR } from '@/shared/ui/codes'
import { currentUser, getDB, mutate, notify, takeCode, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { ean13Check, isEan13 } from '@/shared/lib/barcode'
import { compactToman, fa, num, pct, toman } from '@/shared/lib/fa'
import type { Product, Unit } from '@/shared/data/seed'
import { ProductCard } from './ProductCard'
import { ProductLabel } from '../print/ProductLabel'

type UnitRow = { serial: string; color: string; warehouse: string; shelf: string; grade: string }
export type Draft = {
  id?: string; code: string; ean: string; category: string; brand: string; model: string; title: string; en: string
  specs: Record<string, string>; keyFeatures: string; images: string[]; video: string
  short: string; long: string; box: string; pros: string; cons: string
  condition: string; grade: string; source: string; supplier: string
  mode: 'qty' | 'serial'; qtyTehran: number; qtyMahabad: number; shelf: string; units: UnitRow[]
  currency: string; costFx: number; rate: number; freight: number; customs: number; other: number; price: number; discount: number; priceNew: number
  weight: number; dims: string; shipClass: string; fastEligible: boolean; insurance: boolean; install: boolean
  warrantyType: string; warrantyMonths: number; warrantyTerms: string
  site: boolean; torob: boolean; metaTitle: string; metaDesc: string; slug: string; scheduledAt: string
}
const RATES: Record<string, number> = { تومان: 1, دلار: 61500, درهم: 16700, دینار: 47 }
const STEPS = ['نوع و دسته', 'مشخصات', 'تصاویر و ویدیو', 'توضیحات', 'وضعیت و منبع', 'موجودی', 'قیمت و سود', 'ارسال و خدمات', 'گارانتی', 'کانال‌ها و سئو', 'بارکد و برچسب', 'مرور و انتشار']
const QUICK = [2, 0, 4, 5, 6, 11] // حالت سریع: عکس، نام، وضعیت، تعداد، قیمت، انتشار

const blank = (): Draft => ({ code: '', ean: '', category: 'هدفون', brand: 'اپل', model: '', title: '', en: '', specs: {}, keyFeatures: '', images: [], video: '', short: '', long: '', box: '', pros: '', cons: '', condition: 'sealed', grade: 'A+', source: 'amazon', supplier: 'دفتر اربیل', mode: 'qty', qtyTehran: 1, qtyMahabad: 0, shelf: '', units: [{ serial: '', color: '', warehouse: 'tehran', shelf: '', grade: 'A+' }], currency: 'تومان', costFx: 0, rate: 1, freight: 0, customs: 0, other: 0, price: 0, discount: 0, priceNew: 0, weight: 0, dims: '', shipClass: 'عادی', fastEligible: true, insurance: false, install: false, warrantyType: 'گارانتی اختصاصی غنیمت', warrantyMonths: 6, warrantyTerms: 'تعمیر یا تعویض در صورت ایراد فنی؛ آسیب فیزیکی و آب‌خوردگی شامل نمی‌شود.', site: true, torob: true, metaTitle: '', metaDesc: '', slug: '', scheduledAt: '' })
export const fromProduct = (p: Product, units: Unit[]): Draft => ({ ...blank(), id: p.id, code: p.code ?? '', ean: p.ean ?? '', category: p.category, brand: p.brand, model: p.model ?? '', title: p.title, en: p.en, specs: p.specs ?? {}, keyFeatures: p.keyFeatures ?? '', images: p.images?.length ? p.images : p.image ? [p.image] : [], video: p.video ?? '', short: p.short ?? '', long: p.long ?? '', box: p.box ?? '', pros: p.pros ?? '', cons: p.cons ?? '', condition: p.condition ?? units[0]?.condition ?? 'sealed', grade: p.grade ?? units[0]?.grade ?? 'A+', source: p.source ?? units[0]?.source ?? 'amazon', supplier: p.supplier ?? 'دفتر اربیل', mode: p.mode === 'serial' ? 'serial' : 'qty', qtyTehran: p.qty?.tehran ?? 0, qtyMahabad: p.qty?.mahabad ?? 0, units: units.map((u) => ({ serial: u.serial, color: u.color, warehouse: u.warehouse, shelf: u.shelf, grade: u.grade })), currency: p.currency ?? 'تومان', costFx: p.costFx ?? p.cost ?? units[0]?.cost ?? 0, rate: p.rate ?? 1, freight: 0, customs: 0, other: p.extraCost ?? 0, price: p.price ?? units[0]?.price ?? 0, discount: p.discount ?? 0, priceNew: p.priceNew, weight: p.weight ?? 0, dims: p.dims ?? '', shipClass: p.shipClass ?? 'عادی', fastEligible: p.fastEligible, insurance: !!p.insurance, install: !!p.install, warrantyType: p.warrantyType ?? 'گارانتی اختصاصی غنیمت', warrantyMonths: p.warrantyMonths ?? 6, warrantyTerms: p.warrantyTerms ?? blank().warrantyTerms, site: true, torob: p.torob, metaTitle: p.metaTitle ?? '', metaDesc: p.metaDesc ?? '', slug: p.slug ?? '', scheduledAt: p.scheduledAt ?? '' })

export const landedOf = (f: Draft) => Math.round(f.costFx * (f.currency === 'تومان' ? 1 : f.rate) + f.freight + f.customs + f.other)
const money = (v: number) => (v ? v.toLocaleString('en-US') : '')
const parseMoney = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const MoneyIn = ({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) => <Input className="ltr text-left font-mono" inputMode="numeric" placeholder={placeholder} value={money(value)} onChange={(e) => onChange(parseMoney(e.target.value))} />

/** ثبت دستی گام‌به‌گام کالا (۱۲ گام) — همچنین ویرایش کالای موجود و نسخهٔ کوتاه حالت سریع */
export function ProductWizard({ quick, onDone }: { quick?: boolean; onDone?: (id: string) => void }) {
  const d = useDB(); const nav = useNavigate(); const { id } = useParams(); const [sp] = useSearchParams()
  const editing = id ? d.products.find((p) => p.id === id) : undefined
  const draftKey = editing ? `edit-${editing.id}` : quick ? 'quick' : 'new'
  const saved = (d as any).drafts?.[draftKey] as Draft | undefined
  const [f, setF] = useState<Draft>(() => saved ?? (editing ? fromProduct(editing, d.units.filter((u) => u.productId === editing.id)) : { ...blank(), title: sp.get('title') ?? '' }))
  const [step, setStep] = useState(() => Number(sp.get('step') ?? (quick ? QUICK[0] : 0)))
  const [savedAt, setSavedAt] = useState<number | null>(saved ? Date.now() : null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const order = quick ? QUICK : STEPS.map((_, i) => i)
  const pos = order.indexOf(step)
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }))
  // ذخیرهٔ خودکار پیش‌نویس
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } const t = setTimeout(() => { mutate((x) => { ((x as any).drafts ??= {})[draftKey] = f }); setSavedAt(Date.now()) }, 500); return () => clearTimeout(t) }, [f])
  const landed = landedOf(f); const finalPrice = Math.round(f.price * (1 - f.discount / 100)); const profit = finalPrice - landed
  const marginPct = finalPrice ? (profit / finalPrice) * 100 : 0
  const floor = d.rules.find((r) => r.key === 'margin_floor')!.value
  const tpl = d.entities.attrTemplates?.find((t) => t.name === d.entities.categories?.find((c) => c.name === f.category)?.template)
  const specFields = String(tpl?.fields ?? 'رنگ، ابعاد').split('،').map((s) => s.trim()).filter(Boolean)
  const tehranStock = f.mode === 'qty' ? f.qtyTehran > 0 : f.units.some((u) => u.warehouse === 'tehran')

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {}
    if (s === 0) { if (!f.title.trim()) e.title = 'عنوان فارسی کالا را بنویسید.'; if (f.ean && !isEan13(f.ean)) e.ean = `بارکد EAN-13 نامعتبر است.${/^\d{12}$/.test(f.ean) ? ` رقم کنترل باید ${ean13Check(f.ean)} باشد.` : ''}` }
    if (s === 5) { if (f.mode === 'qty' && f.qtyTehran + f.qtyMahabad <= 0) e.qty = 'دست‌کم یک عدد موجودی وارد کنید.'; if (f.mode === 'serial') { if (!f.units.length) e.units = 'دست‌کم یک واحد اضافه کنید.'; const ser = f.units.map((u) => u.serial.trim()); if (ser.some((x) => !x)) e.units = 'سریال یا IMEI همهٔ واحدها را وارد کنید.'; const dup = ser.find((x, i) => x && ser.indexOf(x) !== i) ?? ser.find((x) => x && getDB().units.some((u) => u.serial === x && u.productId !== f.id)); if (dup) e.units = `سریال «${dup}» تکراری است.` } }
    if (s === 6) { if (!f.price) e.price = 'قیمت فروش را وارد کنید.'; else if (landed && finalPrice < landed) e.price = `قیمت نهایی (${toman(finalPrice)}) از قیمت تمام‌شده (${toman(landed)}) کمتر است.` }
    return e
  }
  const go = (to: number) => { const e = validate(step); setErrors(e); if (Object.keys(e).length && order.indexOf(to) > pos) return toast('موارد قرمز این گام را کامل کنید.', { tone: 'err' }); setStep(to); window.scrollTo?.(0, 0) }
  const missing = useMemo(() => [
    [!f.title.trim(), 'عنوان کالا', 0], [f.images.length === 0, 'دست‌کم یک تصویر', 2], [!f.price, 'قیمت فروش', 6],
    [f.mode === 'qty' ? f.qtyTehran + f.qtyMahabad <= 0 : f.units.some((u) => !u.serial.trim()), 'موجودی یا سریال واحدها', 5],
    [(f.condition !== 'sealed') && f.images.length < 2, 'برای کالای استوک یا جعبه‌باز دست‌کم ۲ عکس واقعی همان واحد', 2],
  ].filter((x) => x[0]) as [boolean, string, number][], [f])

  const save = (status: string) => {
    for (const s of order) { const e = validate(s); if (Object.keys(e).length) { setErrors(e); setStep(s); return toast(Object.values(e)[0], { tone: 'err' }) } }
    if (status === 'product.published' && missing.length) { setStep(missing[0][2]); return toast(`برای انتشار کامل کنید: ${missing.map((m) => m[1]).join('، ')}`, { tone: 'err' }) }
    const isNew = !editing; const pid = editing?.id ?? `p${Date.now().toString(36)}`
    const code = f.code || takeCode('product')
    const prod: Product = { ...(editing ?? {} as Product), id: pid, image: f.images[0] ?? '', images: f.images, title: f.title.trim(), en: f.en.trim() || f.title.trim(), brand: f.brand, category: f.category, status, mode: f.mode, qty: f.mode === 'qty' ? { tehran: f.qtyTehran, mahabad: f.qtyMahabad } : undefined, priceNew: f.priceNew || f.price, price: f.mode === 'qty' ? finalPrice : undefined, compareAt: f.discount ? f.price : undefined, cost: landed, rating: editing?.rating ?? 0, reviews: editing?.reviews ?? 0, views: editing?.views ?? 0, cvr: editing?.cvr ?? 0, health: Math.min(100, 30 + f.images.length * 10 + (f.short ? 15 : 0) + (f.long ? 15 : 0) + (Object.keys(f.specs).length ? 10 : 0) + (f.metaDesc ? 10 : 0)), fastEligible: f.fastEligible && tehranStock, seller: 'غنیمت', torob: f.torob, code, ean: f.ean, model: f.model, specs: f.specs, keyFeatures: f.keyFeatures, short: f.short, long: f.long, box: f.box, pros: f.pros, cons: f.cons, condition: f.condition, grade: f.grade, source: f.source, originLabel: f.source === 'amazon' ? 'خریداری‌شده از آمازون' : 'خرید مستقیم اقلیم کردستان', supplier: f.supplier, currency: f.currency, costFx: f.costFx, rate: f.rate, extraCost: f.freight + f.customs + f.other, discount: f.discount, weight: f.weight, dims: f.dims, shipClass: f.shipClass, insurance: f.insurance, install: f.install, warrantyType: f.warrantyType, warrantyMonths: f.warrantyMonths, warrantyTerms: f.warrantyTerms, metaTitle: f.metaTitle, metaDesc: f.metaDesc, slug: f.slug, scheduledAt: f.scheduledAt, video: f.video }
    const existing = d.units.filter((u) => u.productId === pid)
    const newUnits: Unit[] = f.mode === 'serial' ? f.units.filter((r) => !existing.some((u) => u.serial === r.serial)).map((r) => { const c = takeCode('unit'); return { id: `GU-${c.replace(/\D/g, '').slice(-5)}`, code: c, productId: pid, serial: r.serial.trim(), condition: f.condition, grade: r.grade || f.grade, warehouse: r.warehouse, source: f.source, status: status === 'product.published' ? 'unit.published' : 'unit.ready', cost: landed, price: finalPrice, shelf: r.shelf || 'جدید', received: new Date().toISOString(), flaws: [], color: r.color, warrantyMonths: f.warrantyMonths } }) : []
    const by = currentUser()
    mutate((x) => {
      const i = x.products.findIndex((p) => p.id === pid); if (i >= 0) x.products[i] = prod; else x.products.unshift(prod)
      x.units.unshift(...newUnits)
      if (!isNew) x.units.filter((u) => u.productId === pid && ['unit.published', 'unit.ready'].includes(u.status)).forEach((u) => { u.price = finalPrice; const r = f.units.find((q) => q.serial === u.serial); if (r) { u.color = r.color; u.shelf = r.shelf || u.shelf; u.warehouse = r.warehouse; u.grade = r.grade } })
      delete ((x as any).drafts ?? {})[draftKey]
    }, { action: isNew ? (status === 'product.published' ? 'ثبت و انتشار کالا' : 'ثبت پیش‌نویس کالا') : 'ویرایش کالا', target: `${prod.title} (${code})` })
    if (by && by.role !== 'super' && status === 'product.published') notify('کالای تازه منتشر شد', `${by.name}: «${prod.title}» با قیمت ${toman(finalPrice)} منتشر شد.`, `/admin/catalog/${pid}`, 'عملیات', 'info')
    toast(status === 'product.published' ? (f.scheduledAt ? `انتشار «${prod.title}» برای ${new Date(f.scheduledAt).toLocaleString('fa-IR')} زمان‌بندی شد.` : `«${prod.title}» منتشر شد.`) : `پیش‌نویس «${prod.title}» ذخیره شد.`)
    onDone ? onDone(pid) : nav(`/admin/catalog/${pid}`)
  }
  const addImages = async (files: FileList | null) => { if (!files) return; try { const imgs = await Promise.all([...files].slice(0, 10).map((fl) => fileToImage(fl))); set({ images: [...f.images, ...imgs].slice(0, 12) }); toast(`${fa(imgs.length)} تصویر اضافه شد.`) } catch (e) { toast((e as Error).message, { tone: 'err' }) } }
  const [drag, setDrag] = useState<number | null>(null)

  const body: Record<number, ReactNode> = {
    0: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="دسته *"><Select value={f.category} onChange={(v) => set({ category: v })} options={(d.entities.categories ?? []).map((c) => c.name)} /></Field>
      <Field label="برند"><Select value={f.brand} onChange={(v) => set({ brand: v })} options={(d.entities.brands ?? []).map((b) => b.name)} /></Field>
      <div className="sm:col-span-2"><Field label="عنوان فارسی *" error={errors.title} help="همان عنوانی که روی کارت محصول در دو خط نمایش داده می‌شود."><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً هدست بلوتوثی اپل مدل AirPods Max ۲۰۲۴" /></Field></div>
      <Field label="عنوان انگلیسی"><Input className="ltr text-left" value={f.en} onChange={(e) => set({ en: e.target.value })} placeholder="Apple AirPods Max 2024" /></Field>
      <Field label="مدل"><Input className="ltr text-left" value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder="A3184" /></Field>
      <Field label="کد داخلی کالا" help="هنگام ثبت خودکار ساخته می‌شود؛ قالب آن در تنظیمات قابل تغییر است."><div className="flex gap-2"><Input className="ltr text-left font-mono" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder={`${d.codeFormat.product}${String(d.codeFormat.nextProduct).padStart(d.codeFormat.pDigits, '0')}`} /><Button aria-label="ساخت کد تازه" icon={<RefreshCw size={14} />} onClick={() => set({ code: takeCode('product') })} /></div></Field>
      <Field label="بارکد کارخانه (EAN-13)" error={errors.ean} help="اختیاری؛ ۱۳ رقم روی جعبه."><Input className="ltr text-left font-mono" inputMode="numeric" maxLength={13} value={f.ean} onChange={(e) => set({ ean: e.target.value.replace(/\D/g, '') })} placeholder="0194253939535" /></Field>
    </div>,
    1: <div className="space-y-4"><p className="text-12 text-t2">فیلدها از قالب ویژگی دستهٔ «{f.category}» ({tpl?.name ?? 'پیش‌فرض'}) خوانده می‌شوند. قالب‌ها در «کالا و کاتالوگ › قالب ویژگی‌ها» قابل ویرایش‌اند.</p>
      <div className="grid gap-4 sm:grid-cols-2">{specFields.map((k) => <Field key={k} label={k}><Input value={f.specs[k] ?? ''} onChange={(e) => set({ specs: { ...f.specs, [k]: e.target.value } })} /></Field>)}</div>
      <Field label="ویژگی‌های کلیدی" help="هر خط یک ویژگی؛ بالای صفحهٔ کالا نمایش داده می‌شود."><Textarea rows={4} value={f.keyFeatures} onChange={(e) => set({ keyFeatures: e.target.value })} placeholder={'حذف نویز فعال\nصدای فضایی\n۲۰ ساعت شارژدهی'} /></Field></div>,
    2: <div className="space-y-4">
      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files) }} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface-2 px-4 py-10 text-center transition-colors hover:border-brand">
        <span className="grid size-12 place-items-center rounded-full bg-brand-tint text-brand"><ImagePlus size={22} /></span>
        <span className="text-14 font-semibold">عکس‌ها را اینجا رها کنید یا انتخاب کنید</span><span className="text-12 text-t2">تا ۱۲ تصویر؛ روی موبایل دوربین باز می‌شود. اولین تصویر کاور است.</span>
        <input type="file" accept="image/*" multiple capture="environment" className="sr-only" onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
      </label>
      {f.condition !== 'sealed' && <p className="flex items-center gap-1.5 rounded-md bg-warning-bg px-3 py-2 text-12 text-warning"><CircleAlert size={14} />برای کالای استوک یا جعبه‌باز، عکس واقعی همان واحد الزامی است. ایراد ظاهری روتوش نشود.</p>}
      {f.images.length > 0 && <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{f.images.map((src, i) => (
        <li key={i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag === null || drag === i) return; const a = [...f.images]; const [m] = a.splice(drag, 1); a.splice(i, 0, m); set({ images: a }); setDrag(null) }} className={cx('group relative aspect-square overflow-hidden rounded-lg border bg-white', i === 0 ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
          <img src={src} alt={`تصویر ${fa(i + 1)}`} className="size-full object-cover" />
          {i === 0 && <span className="absolute top-1.5 right-1.5 rounded-sm bg-brand-solid px-1.5 py-0.5 text-11 text-white">کاور</span>}
          <span className="absolute top-1.5 left-1.5 cursor-grab rounded-sm bg-white/90 p-0.5 text-t2"><GripVertical size={14} /></span>
          <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            {i > 0 ? <button onClick={() => { const a = [...f.images]; a.splice(i, 1); a.unshift(src); set({ images: a }) }} className="rounded-sm bg-white/95 px-1.5 py-0.5 text-11 font-medium text-t1 shadow">کاور کن</button> : <span />}
            <button aria-label="حذف تصویر" onClick={() => set({ images: f.images.filter((_, j) => j !== i) })} className="grid size-6 place-items-center rounded-sm bg-white/95 text-danger shadow"><Trash2 size={13} /></button>
          </div>
        </li>))}</ul>}
      <Field label="ویدیو (نشانی)" help="اختیاری؛ معرفی، بررسی یا باز کردن جعبه."><Input className="ltr text-left" value={f.video} onChange={(e) => set({ video: e.target.value })} placeholder="https://…" /></Field></div>,
    3: <div className="space-y-4">
      <div className="flex justify-end"><Button variant="ai" icon={<Sparkles size={14} />} onClick={() => { set({ short: f.short || `${f.title} با کنترل کیفیت دو مرحله‌ای و عکس واقعی همان واحد در غنیمت عرضه می‌شود.`, box: f.box || 'دستگاه، کابل شارژ، دفترچهٔ راهنما' }); toast('پیشنهاد AI در فیلدهای خالی گذاشته شد؛ پیش از انتشار بازبینی کنید.') }}>پیشنهاد بده (اختیاری)</Button></div>
      <Field label="معرفی کوتاه" help="اختصاصی بنویسید؛ متن منبع کپی نشود."><Textarea rows={3} value={f.short} onChange={(e) => set({ short: e.target.value })} /></Field>
      <Field label="معرفی کامل"><Textarea rows={6} value={f.long} onChange={(e) => set({ long: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="محتوای جعبه"><Textarea rows={3} value={f.box} onChange={(e) => set({ box: e.target.value })} /></Field><Field label="نکات مثبت"><Textarea rows={3} value={f.pros} onChange={(e) => set({ pros: e.target.value })} /></Field><Field label="نکات منفی"><Textarea rows={3} value={f.cons} onChange={(e) => set({ cons: e.target.value })} /></Field></div></div>,
    4: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="وضعیت کالا"><Segmented value={f.condition} onChange={(v) => set({ condition: v })} options={[['sealed', 'اکبند'], ['openbox', 'جعبه‌باز'], ['used', 'استوک']]} /></Field>
      <Field label="گرید ظاهری" hint={<Hint k="grade" />}><Segmented value={f.grade} onChange={(v) => set({ grade: v })} options={[['A+', 'A+‎'], ['A', 'A'], ['B', 'B']]} /></Field>
      <Field label="منبع تأمین" help="برچسب مبدأ روی کارت از همین ساخته می‌شود."><Select value={f.source} onChange={(v) => set({ source: v })} options={[['amazon', 'انبارگردانی آمازون'], ['kurdistan', 'خرید مستقیم اقلیم کردستان']]} /></Field>
      <Field label="تأمین‌کننده"><Select value={f.supplier} onChange={(v) => set({ supplier: v })} options={(d.entities.suppliers ?? []).map((s) => s.name)} /></Field>
      <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2 sm:col-span-2">برچسب مبدأ روی کارت: <b className="text-t1">{f.source === 'amazon' ? 'ارسال از مبدأ آمازون' : 'خرید مستقیم اقلیم کردستان'}</b></p></div>,
    5: <div className="space-y-4">
      <Field label="نوع نگهداری" hint={<Hint k="product_unit" />}><Segmented value={f.mode} onChange={(v) => set({ mode: v })} options={[['qty', 'موجودی تعدادی (اکبند هم‌مدل)'], ['serial', 'واحد سریال‌دار (هر واحد جدا)']]} /></Field>
      {f.mode === 'qty' ? <div className="grid gap-4 sm:grid-cols-3"><Field label="انبار تهران (عدد)" error={errors.qty}><Input type="number" min={0} className="ltr text-left font-mono" value={f.qtyTehran} onChange={(e) => set({ qtyTehran: Math.max(0, +e.target.value) })} /></Field><Field label="انبار مهاباد (عدد)"><Input type="number" min={0} className="ltr text-left font-mono" value={f.qtyMahabad} onChange={(e) => set({ qtyMahabad: Math.max(0, +e.target.value) })} /></Field><Field label="قفسه"><Input className="ltr text-left font-mono" value={f.shelf} onChange={(e) => set({ shelf: e.target.value })} placeholder="D-02-1" /></Field></div>
        : <div className="space-y-2">{errors.units && <p className="text-12 text-danger">{errors.units}</p>}
          {f.units.map((u, i) => <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_.8fr_.7fr_auto] sm:items-end">
            <Field label={`سریال یا IMEI واحد ${fa(i + 1)}`}><Input className="ltr text-left font-mono" value={u.serial} onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)) })} /></Field>
            <Field label="رنگ"><Input value={u.color} onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} /></Field>
            <Field label="انبار"><Select value={u.warehouse} onChange={(v) => set({ units: f.units.map((x, j) => (j === i ? { ...x, warehouse: v } : x)) })} options={d.warehouses.map((w) => [w.id, w.name])} /></Field>
            <Field label="قفسه"><Input className="ltr text-left font-mono" value={u.shelf} onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, shelf: e.target.value } : x)) })} /></Field>
            <Field label="گرید"><Select value={u.grade} onChange={(v) => set({ units: f.units.map((x, j) => (j === i ? { ...x, grade: v } : x)) })} options={['A+', 'A', 'B']} /></Field>
            <Button variant="ghost" aria-label="حذف واحد" icon={<Trash2 size={14} />} onClick={() => set({ units: f.units.filter((_, j) => j !== i) })} />
          </div>)}
          <Button icon={<Plus size={14} />} onClick={() => set({ units: [...f.units, { serial: '', color: f.units.at(-1)?.color ?? '', warehouse: 'tehran', shelf: '', grade: f.grade }] })}>افزودن واحد</Button></div>}</div>,
    6: <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="قیمت خرید"><MoneyIn value={f.costFx} onChange={(n) => set({ costFx: n })} placeholder="مثلاً 12,000,000" /></Field>
        <Field label="ارز خرید"><Select value={f.currency} onChange={(v) => set({ currency: v, rate: RATES[v] })} options={Object.keys(RATES)} /></Field>
        {f.currency !== 'تومان' && <Field label={`نرخ ${f.currency} (تومان)`} help="پیش‌فرض: نرخ مرجع امروز در تأمین و خرید"><MoneyIn value={f.rate} onChange={(n) => set({ rate: n })} /></Field>}
        <Field label="حمل بین‌المللی (تومان)"><MoneyIn value={f.freight} onChange={(n) => set({ freight: n })} /></Field>
        <Field label="ترخیص (تومان)"><MoneyIn value={f.customs} onChange={(n) => set({ customs: n })} /></Field>
        <Field label="سایر هزینه‌ها (QC، عکاسی)"><MoneyIn value={f.other} onChange={(n) => set({ other: n })} /></Field>
        <Field label="قیمت فروش *" error={errors.price}><MoneyIn value={f.price} onChange={(n) => set({ price: n })} placeholder="مثلاً 15,000,000" /></Field>
        <Field label="تخفیف (درصد)"><Input type="number" min={0} max={90} className="ltr text-left font-mono" value={f.discount} onChange={(e) => set({ discount: Math.min(90, Math.max(0, +e.target.value)) })} /></Field>
        <Field label="قیمت مرجع کالای نو" help="ردیف «قیمت نو» و درصد ارزان‌تر روی کارت."><MoneyIn value={f.priceNew} onChange={(n) => set({ priceNew: n })} /></Field>
      </div>
      <Card className="self-start bg-surface-2 xl:sticky xl:top-20" title={<>سود هر واحد<Hint k="margin" /></>}>
        {[['قیمت خرید', f.costFx * (f.currency === 'تومان' ? 1 : f.rate)], ['هزینه‌های جانبی', f.freight + f.customs + f.other]].map(([l, v]) => <div key={l as string} className="flex justify-between py-1 text-13"><span className="text-t2">{l}</span><span className="tnum">{toman(v as number)}</span></div>)}
        <div className="flex justify-between border-t border-line py-1.5 text-13 font-semibold"><span>قیمت تمام‌شده</span><span className="tnum">{toman(landed)}</span></div>
        <div className="flex justify-between py-1 text-13"><span className="text-t2">قیمت نهایی فروش</span><span className="tnum">{toman(finalPrice)}</span></div>
        <div className={cx('mt-2 rounded-lg p-3 text-center', profit >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}><p className="text-11">سود هر واحد</p><p className="tnum text-20 font-bold">{toman(profit)}</p><p className="tnum text-12">{landed ? pct(marginPct, 1) : 'قیمت خرید ثبت نشده'}</p></div>
        {landed > 0 && marginPct < floor && profit >= 0 && <p className="mt-2 text-11 text-warning">حاشیه زیر کف {pct(floor)} است؛ انتشار به تأیید مدیر نیاز دارد مگر مجوز شما اجازه بدهد.</p>}
      </Card></div>,
    7: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="وزن (گرم)"><Input type="number" className="ltr text-left font-mono" value={f.weight || ''} onChange={(e) => set({ weight: +e.target.value })} /></Field>
      <Field label="ابعاد (سانتی‌متر)"><Input className="ltr text-left font-mono" value={f.dims} onChange={(e) => set({ dims: e.target.value })} placeholder="20 × 18 × 9" /></Field>
      <Field label="کلاس ارسال"><Select value={f.shipClass} onChange={(v) => set({ shipClass: v })} options={['عادی', 'سنگین']} /></Field>
      <Field label="واجد تحویل سریع" help={tehranStock ? 'موجودی در انبار تهران هست.' : 'فقط کالای انبار تهران می‌تواند تحویل سریع داشته باشد.'}><div className="flex h-9 items-center"><Toggle on={f.fastEligible && tehranStock} disabled={!tehranStock} label="تحویل سریع" onChange={(v) => set({ fastEligible: v })} /></div></Field>
      <Field label="بیمه"><div className="flex h-9 items-center"><Toggle on={f.insurance} label="بیمه" onChange={(v) => set({ insurance: v })} /></div></Field>
      <Field label="نصب در محل"><div className="flex h-9 items-center"><Toggle on={f.install} label="نصب" onChange={(v) => set({ install: v })} /></div></Field></div>,
    8: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="نوع گارانتی"><Select value={f.warrantyType} onChange={(v) => set({ warrantyType: v })} options={['گارانتی اختصاصی غنیمت', 'گارانتی شرکتی', 'بدون گارانتی']} /></Field>
      <Field label="مدت (ماه)"><Input type="number" min={0} className="ltr text-left font-mono" value={f.warrantyMonths} onChange={(e) => set({ warrantyMonths: Math.max(0, +e.target.value) })} /></Field>
      <div className="sm:col-span-2"><Field label="شرایط" help="روی کارت گارانتی چاپی خلاصه می‌شود."><Textarea rows={3} value={f.warrantyTerms} onChange={(e) => set({ warrantyTerms: e.target.value })} /></Field></div></div>,
    9: <div className="space-y-4">
      <div className="flex flex-wrap gap-6"><label className="flex items-center gap-2 text-13"><Toggle on={f.site} label="سایت" onChange={(v) => set({ site: v })} />نمایش در سایت</label><label className="flex items-center gap-2 text-13"><Toggle on={f.torob} label="ترب" onChange={(v) => set({ torob: v })} />نمایش در ترب</label></div>
      <Field label="عنوان متا" help={`${fa((f.metaTitle || `خرید ${f.title} | غنیمت`).length)} نویسه؛ هدف زیر ۶۰`}><Input value={f.metaTitle} onChange={(e) => set({ metaTitle: e.target.value })} placeholder={`خرید ${f.title || '…'} | غنیمت`} /></Field>
      <Field label="توضیح متا" help={`${fa(f.metaDesc.length)} نویسه؛ هدف ۱۲۰ تا ۱۶۰`}><Textarea rows={2} value={f.metaDesc} onChange={(e) => set({ metaDesc: e.target.value })} /></Field>
      <Field label="نشانی صفحه"><Input className="ltr text-left font-mono" value={f.slug} onChange={(e) => set({ slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} placeholder={(f.en || 'product').toLowerCase().replace(/\s+/g, '-')} /></Field>
      <div className="rounded-lg border border-line p-3"><p className="ltr text-left text-11 text-success">ghanimat.example › product › {f.slug || (f.en || 'product').toLowerCase().replace(/\s+/g, '-')}</p><p className="text-14 text-brand">{f.metaTitle || `خرید ${f.title || '…'} | غنیمت`}</p><p className="text-12 text-t2">{f.metaDesc || f.short || 'توضیح متا هنوز نوشته نشده است.'}</p></div></div>,
    10: <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3"><p className="text-13">کد داخلی: <b className="ltr font-mono">{f.code || `${d.codeFormat.product}… (هنگام ثبت)`}</b></p>
        {f.code && <Barcode value={f.code} className="h-20 w-full max-w-sm rounded border border-line" />}
        {f.ean && isEan13(f.ean) && <><p className="text-13">بارکد کارخانه</p><Barcode value={f.ean} type="ean13" className="h-20 w-full max-w-sm rounded border border-line" /></>}
        {f.code && <div className="flex items-center gap-3"><QR value={`https://ghanimat.example/p/${f.code}`} size={88} /><p className="text-12 text-t2">QR به صفحهٔ کالا در پنل و سایت می‌رود. اسکن هر کد در جست‌وجو، دریافت، جمع‌آوری، بسته‌بندی و مرجوعی همین کالا را باز می‌کند.</p></div>}
        {!f.code && <Button icon={<RefreshCw size={14} />} onClick={() => set({ code: takeCode('product') })}>ساخت کد داخلی الان</Button>}</div>
      <div><p className="mb-2 text-13 font-medium">پیش‌نمایش برچسب کالا (۵۰×۳۰)</p><div className="inline-block rounded-lg bg-neutral-bg p-4"><ProductLabel p={{ ...blank(), id: 'x', image: '', title: f.title || 'عنوان کالا', en: f.en, brand: f.brand, category: f.category, status: '', mode: f.mode, priceNew: 0, rating: 0, reviews: 0, views: 0, cvr: 0, health: 0, seller: '', code: f.code || 'GH-P-000000', model: f.model } as unknown as Product} qty={f.mode === 'qty' ? f.qtyTehran + f.qtyMahabad : undefined} /></div><p className="mt-2 text-11 text-t2">برچسب واحدها پس از ثبت از فهرست واحدها یا صفحهٔ هر واحد چاپ می‌شود (تکی یا گروهی).</p></div></div>,
    11: <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <Card title="چک‌لیست انتشار">{missing.length === 0 ? <p className="flex items-center gap-2 text-13 text-success"><Check size={16} />همه‌چیز برای انتشار آماده است.</p> : <ul className="space-y-1.5">{missing.map(([, l, s]) => <li key={l}><button onClick={() => setStep(s)} className="flex items-center gap-2 text-13 text-danger hover:underline"><CircleAlert size={14} />{l}<span className="text-11 text-t2">(رفتن به گام {fa(order.indexOf(s) + 1)})</span></button></li>)}</ul>}</Card>
        <Card title="خلاصه"><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-13">{[['دسته', f.category], ['وضعیت', f.condition === 'sealed' ? 'اکبند' : f.condition === 'openbox' ? 'جعبه‌باز' : 'استوک'], ['موجودی', f.mode === 'qty' ? `${fa(f.qtyTehran + f.qtyMahabad)} عدد` : `${fa(f.units.length)} واحد`], ['قیمت نهایی', toman(finalPrice)], ['سود هر واحد', landed ? `${toman(profit)} (${pct(marginPct, 1)})` : 'نامعلوم'], ['گارانتی', `${f.warrantyType} · ${fa(f.warrantyMonths)} ماه`]].map(([k, v]) => <div key={k}><dt className="text-11 text-t2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl></Card>
        <Field label="زمان‌بندی انتشار (اختیاری)" help="خالی بماند تا همین الان منتشر شود."><Input type="datetime-local" className="ltr text-left font-mono sm:w-64" value={f.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-4"><div><p className="mb-1 text-center text-11 text-t2">دسکتاپ</p><ProductCard p={{ ...(editing ?? {}), id: f.id ?? 'preview', image: f.images[0] ?? '', title: f.title || 'عنوان کالا', en: f.en, brand: f.brand, category: f.category, status: 'product.published', mode: 'qty', qty: { tehran: f.mode === 'qty' ? f.qtyTehran : f.units.filter((u) => u.warehouse === 'tehran').length, mahabad: f.mode === 'qty' ? f.qtyMahabad : f.units.filter((u) => u.warehouse !== 'tehran').length }, priceNew: f.priceNew, price: finalPrice, compareAt: f.discount ? f.price : undefined, rating: 0, reviews: 0, views: 0, cvr: 0, health: 0, fastEligible: f.fastEligible && tehranStock, seller: 'غنیمت', torob: f.torob, source: f.source } as Product} /></div>
        <div><p className="mb-1 text-center text-11 text-t2">موبایل</p><ProductCard mini p={{ ...(editing ?? {}), id: f.id ?? 'preview', image: f.images[0] ?? '', title: f.title || 'عنوان کالا', en: f.en, brand: f.brand, category: f.category, status: 'product.published', mode: 'qty', qty: { tehran: f.qtyTehran, mahabad: f.qtyMahabad }, priceNew: f.priceNew, price: finalPrice, compareAt: f.discount ? f.price : undefined, rating: 0, reviews: 0, views: 0, cvr: 0, health: 0, fastEligible: f.fastEligible && tehranStock, seller: 'غنیمت', torob: f.torob, source: f.source } as Product} /></div></div></div>,
  }
  const last = pos === order.length - 1
  return (
    <Page title={editing ? `ویرایش «${editing.title}»` : quick ? 'افزودن سریع کالا' : 'افزودن کالا'} module={quick ? undefined : 'catalog'} back={editing ? `/admin/catalog/${editing.id}` : quick ? undefined : '/admin/catalog'}
      badge={savedAt ? <Badge tone="success">پیش‌نویس ذخیره شد</Badge> : undefined}
      actions={<Button variant="ghost" onClick={() => save('product.draft')}>ذخیرهٔ پیش‌نویس</Button>}
      primary={<Button variant="primary" onClick={() => save('product.published')}>{editing ? 'ذخیره و انتشار' : f.scheduledAt ? 'زمان‌بندی انتشار' : 'انتشار الان'}</Button>}>
      {sp.get('from') === 'photo' && !f.images.length && <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-brand/50 bg-brand-tint/40 p-3 text-13"><Camera size={18} className="text-brand" /><span className="flex-1">از جعبهٔ کالا یا بارکد آن عکس بگیرید؛ عکس به گام تصاویر اضافه می‌شود و عنوان پیشنهادی برای تأیید شما در فرم می‌نشیند.</span><span className="btn rounded-md bg-brand-solid px-3 py-1.5 text-white">گرفتن عکس</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => { const fl = e.target.files?.[0]; if (!fl) return; try { const img = await fileToImage(fl); set({ images: [img], title: f.title || 'کالای تشخیص‌داده‌شده از عکس (عنوان را اصلاح کنید)' }); toast('عکس اضافه شد. عنوان پیشنهادی را بازبینی کنید.') } catch (er) { toast((er as Error).message, { tone: 'err' }) } }} /></label>}
      {saved && <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-info-bg px-3 py-2 text-12 text-info">پیش‌نویس قبلی بارگذاری شد.<button className="font-semibold underline" onClick={() => { mutate((x) => { delete ((x as any).drafts ?? {})[draftKey] }); setF(editing ? fromProduct(editing, d.units.filter((u) => u.productId === editing.id)) : blank()); setStep(order[0]); setSavedAt(null) }}>شروع از نو</button></div>}
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav aria-label="گام‌ها" className="scroll-fade flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {order.map((s, i) => { const done = i < pos; const cur = s === step; return (
            <button key={s} onClick={() => go(s)} className={cx('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-right text-13 transition-colors', cur ? 'bg-brand-tint font-semibold text-brand' : 'text-t2 hover:bg-neutral-bg')}>
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-11 font-bold', done ? 'bg-success-solid text-white' : cur ? 'bg-brand-solid text-white' : 'bg-neutral-bg text-t2')}>{done ? <Check size={13} /> : fa(i + 1)}</span>{STEPS[s]}
            </button>) })}
        </nav>
        <Card title={<span className="flex items-center gap-2">گام {fa(pos + 1)} از {fa(order.length)}: {STEPS[step]}</span>} actions={step === 2 ? <span className="flex items-center gap-1 text-11 text-t2"><Camera size={12} />دوربین در موبایل</span> : step === 6 && landed ? <Badge tone={profit >= 0 ? 'success' : 'danger'}>سود {compactToman(profit)}</Badge> : undefined}>
          <div key={step} className="page-enter">{body[step]}</div>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <Button variant="ghost" icon={<ArrowRight size={14} />} disabled={pos === 0} onClick={() => go(order[pos - 1])}>قبلی</Button>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-bg"><div className="h-full rounded-full bg-brand-solid transition-all" style={{ width: `${((pos + 1) / order.length) * 100}%` }} /></div>
            {last ? <Button variant="primary" onClick={() => save('product.published')}>{f.scheduledAt ? 'زمان‌بندی انتشار' : 'انتشار الان'}</Button> : <Button variant="primary" onClick={() => go(order[pos + 1])}>بعدی<ArrowLeft size={14} /></Button>}
          </div>
        </Card>
      </div>
    </Page>
  )
}
export { STEPS as WIZARD_STEPS, Star }
