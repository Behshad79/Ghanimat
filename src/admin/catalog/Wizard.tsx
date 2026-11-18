import { AmazonReviews } from './LinkExtras'
import { VideoField } from './VideoField'
import { suggestBins } from '../warehouse/PutAway'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Camera, Check, CircleAlert, GripVertical, ImagePlus, Plus, RefreshCw, Sparkles, Star, Trash2 } from 'lucide-react'
import { AITag, Badge, Button, Card, cx, EmptyState, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { Hint, Modal, toast } from '@/shared/ui/overlay'
import { Barcode, QR } from '@/shared/ui/codes'
import { currentUser, getDB, mutate, notify, takeCode, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { ean13Check, isEan13 } from '@/shared/lib/barcode'
import { compactToman, fa, num, pct, toman } from '@/shared/lib/fa'
import type { Product, Unit, Pdp } from '@/shared/data/seed'
import type { PartnerT } from '@/shared/data/partners'
import { dealStatus, DEAL_LABEL, type Deal } from '@/shared/data/merch'
import { KIND_DEFAULT, LINE_COLORS, LINE_ICONS, LineIcon, readIcon, WEIGHT } from '@/shared/ui/lineIcons'
import { DealForm } from '../merch/Merch'
export type { Pdp }
import { ProductCard } from './ProductCard'
import { CategoryPicker } from './CategoryPicker'
import { FxRevalue, logPrice, QcLayers, RouteEditor } from './PdpExtras'
import { fetchRate, FX_CURS, type FxCur, type FxResult } from '@/shared/lib/fx'
import { EditableChoice, VariantEditor } from './Choices'
import { ProductLabel } from '../print/ProductLabel'

type UnitRow = { serial: string; color: string; warehouse: string; shelf: string; grade: string }
export type Draft = {
  id?: string; code: string; ean: string; category: string; subCats: string[]; brand: string; model: string; title: string; en: string
  specs: Record<string, string>; keyFeatures: string; images: string[]; video: string; pdp: Pdp
  short: string; long: string; box: string; pros: string; cons: string
  condition: string; grade: string; source: string; supplier: string
  mode: 'qty' | 'serial'; qtyTehran: number; qtyMahabad: number; shelf: string; units: UnitRow[]
  currency: string; costFx: number; rate: number; freight: number; customs: number; other: number; price: number; discount: number; priceNew: number
  weight: number; dims: string; shipClass: string; fastEligible: boolean; insurance: boolean; install: boolean
  warrantyType: string; warrantyMonths: number; warrantyTerms: string
  site: boolean; torob: boolean; metaTitle: string; metaDesc: string; slug: string; scheduledAt: string
  places?: Record<string, 'pin' | 'excl'>; dealDraft?: Omit<Deal, 'id' | 'pid'>
}
const CURRENCIES = ['تومان', ...FX_CURS]
type FxInfo = (FxResult & { manual?: boolean }) | { loading: true } | null
const STEPS = ['نوع و دسته', 'مشخصات', 'تصاویر و ویدیو', 'توضیحات', 'وضعیت و منبع', 'موجودی', 'قیمت و سود', 'ارسال و خدمات', 'گارانتی', 'کانال‌ها و سئو', 'بارکد و برچسب', 'مرور و انتشار']
const QUICK = [2, 0, 4, 5, 6, 11] // حالت سریع: عکس، نام، وضعیت، تعداد، قیمت، انتشار

export const blankPdp = (): Pdp => ({ videos: [], flaws: [{ zone: 'صفحه‌نمایش', status: 'سالم', note: '' }, { zone: 'قاب و بدنه', status: 'سالم', note: '' }, { zone: 'دوربین', status: 'سالم', note: '' }], importRoute: 'آمازون خاورمیانه', variantGroup: '', variantLabel: '', covered: 'ایراد کارکردی، عدم اصالت کالا', notCovered: 'آسیب پس از تحویل، تغییر نظر خریدار' })
const blank = (): Draft => ({ pdp: blankPdp(), code: '', ean: '', category: '', subCats: [], brand: 'اپل', model: '', title: '', en: '', specs: {}, keyFeatures: '', images: [], video: '', short: '', long: '', box: '', pros: '', cons: '', condition: 'sealed', grade: 'A+', source: 'amazon', supplier: 'دفتر اربیل', mode: 'qty', qtyTehran: 1, qtyMahabad: 0, shelf: '', units: [{ serial: '', color: '', warehouse: 'tehran', shelf: '', grade: 'A+' }], currency: 'تومان', costFx: 0, rate: 1, freight: 0, customs: 0, other: 0, price: 0, discount: 0, priceNew: 0, weight: 0, dims: '', shipClass: 'عادی', fastEligible: true, insurance: false, install: false, warrantyType: 'گارانتی اختصاصی غنیمت', warrantyMonths: 6, warrantyTerms: 'تعمیر یا تعویض در صورت ایراد فنی؛ آسیب فیزیکی و آب‌خوردگی شامل نمی‌شود.', site: true, torob: true, metaTitle: '', metaDesc: '', slug: '', scheduledAt: '' })
export const fromProduct = (p: Product, units: Unit[]): Draft => ({ ...blank(), pdp: { ...blankPdp(), ...(p.pdp ?? {}) }, id: p.id, code: p.code ?? '', ean: p.ean ?? '', category: p.category, subCats: p.subCats ?? [], brand: p.brand, model: p.model ?? '', title: p.title, en: p.en, specs: p.specs ?? {}, keyFeatures: p.keyFeatures ?? '', images: p.images?.length ? p.images : p.image ? [p.image] : [], video: p.video ?? '', short: p.short ?? '', long: p.long ?? '', box: p.box ?? '', pros: p.pros ?? '', cons: p.cons ?? '', condition: p.condition ?? units[0]?.condition ?? 'sealed', grade: p.grade ?? units[0]?.grade ?? 'A+', source: p.source ?? units[0]?.source ?? 'amazon', supplier: p.supplier ?? 'دفتر اربیل', mode: p.mode === 'serial' ? 'serial' : 'qty', qtyTehran: p.qty?.tehran ?? 0, qtyMahabad: p.qty?.mahabad ?? 0, units: units.map((u) => ({ serial: u.serial, color: u.color, warehouse: u.warehouse, shelf: u.shelf, grade: u.grade })), currency: p.currency ?? 'تومان', costFx: p.costFx ?? p.cost ?? units[0]?.cost ?? 0, rate: p.rate ?? 1, freight: 0, customs: 0, other: p.extraCost ?? 0, price: p.price ?? units[0]?.price ?? 0, discount: p.discount ?? 0, priceNew: p.priceNew, weight: p.weight ?? 0, dims: p.dims ?? '', shipClass: p.shipClass ?? 'عادی', fastEligible: p.fastEligible, insurance: !!p.insurance, install: !!p.install, warrantyType: p.warrantyType ?? 'گارانتی اختصاصی غنیمت', warrantyMonths: p.warrantyMonths ?? 6, warrantyTerms: p.warrantyTerms ?? blank().warrantyTerms, site: true, torob: p.torob, metaTitle: p.metaTitle ?? '', metaDesc: p.metaDesc ?? '', slug: p.slug ?? '', scheduledAt: p.scheduledAt ?? '' })

export const landedOf = (f: Draft) => Math.round(f.costFx * (f.currency === 'تومان' ? 1 : f.rate) + f.freight + f.customs + f.other)
const money = (v: number) => (v ? v.toLocaleString('en-US') : '')
const parseMoney = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const MoneyIn = ({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) => <Input className="ltr text-left font-mono" inputMode="numeric" placeholder={placeholder} value={money(value)} onChange={(e) => onChange(parseMoney(e.target.value))} />

/** ثبت دستی گام‌به‌گام کالا (۱۲ گام) — همچنین ویرایش کالای موجود و نسخهٔ کوتاه حالت سریع */
/** partner: ثبت کامل کالا از پرتال شعبه؛ به‌جای انتشار، برای تأیید نهایی غنیمت می‌رود و فقط به موجودی همان شعبه اضافه می‌شود */
type WizardProps = { quick?: boolean; onDone?: (id: string) => void; partner?: PartnerT; initialTitle?: string }
/** با عوض شدن کالا در نشانی، فرم از نو ساخته می‌شود تا داده‌های کالای قبلی در فرم نماند */
export function ProductWizard(props: WizardProps) { const { id } = useParams(); return <ProductWizardInner key={id ?? 'new'} {...props} /> }
function ProductWizardInner({ quick, onDone, partner, initialTitle }: WizardProps) {
  const d = useDB(); const nav = useNavigate(); const { id } = useParams(); const [sp] = useSearchParams()
  const editing = id ? d.products.find((p) => p.id === id) : undefined
  const missing0 = !!id && !editing
  const incoming = editing?.status === 'product.incoming'; const batch = incoming ? d.incoming.find((b) => b.id === editing?.incoming) : undefined
  const draftKey = editing ? `edit-${editing.id}` : partner ? `partner-${partner.id}` : quick ? 'quick' : 'new'
  const saved = (d as any).drafts?.[draftKey] as Draft | undefined
  const [f, setF] = useState<Draft>(() => saved ?? (editing ? fromProduct(editing, d.units.filter((u) => u.productId === editing.id)) : { ...blank(), ...(partner ? { qtyTehran: 0, qtyMahabad: 1 } : {}), title: initialTitle ?? sp.get('title') ?? '' }))
  const [step, setStep] = useState(() => Number(sp.get('step') ?? (quick ? QUICK[0] : 0))); const [sch, setSch] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(saved ? Date.now() : null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fx, setFx] = useState<FxInfo>(null)
  /** استعلام نرخ روز با انتخاب ارز؛ نرخ در فیلد «نرخ» می‌نشیند و دستی هم قابل تغییر است */
  const loadRate = async (cur: string) => { if (cur === 'تومان') { setFx(null); return set({ currency: cur, rate: 1 }) } set({ currency: cur }); setFx({ loading: true }); const r = await fetchRate(cur as FxCur); setF((x) => (x.currency === cur ? { ...x, rate: r.rate } : x)); setFx(r); if (r.error) toast(`نرخ روز دریافت نشد (${r.error})؛ آخرین نرخ ذخیره‌شده گذاشته شد.`, { tone: 'err' }) }
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
    if (s === 0) { if (!f.title.trim()) e.title = 'عنوان فارسی کالا را بنویسید.'; if (!f.category) e.category = 'دستهٔ اصلی کالا را انتخاب کنید.'; if (f.ean && !isEan13(f.ean)) e.ean = `بارکد EAN-13 نامعتبر است.${/^\d{12}$/.test(f.ean) ? ` رقم کنترل باید ${ean13Check(f.ean)} باشد.` : ''}` }
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

  const saveRef = useRef<(s: string) => void>(() => {})
  /** کالای در راه: همهٔ فیلدها ذخیره می‌شود ولی وضعیت «در راه» می‌ماند و موجودی صفر است تا محموله برسد */
  const saveIncoming = () => {
    const pid = editing!.id
    mutate((x) => { const p = x.products.find((y) => y.id === pid)!; Object.assign(p, { pdp: f.pdp, image: f.images[0] ?? '', images: f.images, title: f.title.trim(), en: f.en.trim() || f.title.trim(), brand: f.brand, category: f.category, subCats: f.subCats, mode: f.mode, priceNew: f.priceNew || f.price, price: finalPrice || undefined, compareAt: f.discount ? f.price : undefined, cost: landed, health: Math.min(100, 30 + f.images.length * 10 + (f.short ? 15 : 0) + (f.long ? 15 : 0) + (Object.keys(f.specs).length ? 10 : 0) + (f.metaDesc ? 10 : 0)), ean: f.ean, model: f.model, specs: f.specs, keyFeatures: f.keyFeatures, short: f.short, long: f.long, box: f.box, pros: f.pros, cons: f.cons, condition: f.condition, grade: f.grade, source: f.source, supplier: f.supplier, currency: f.currency, costFx: f.costFx, rate: f.rate, extraCost: f.freight + f.customs + f.other, discount: f.discount, weight: f.weight, dims: f.dims, shipClass: f.shipClass, warrantyType: f.warrantyType, warrantyMonths: f.warrantyMonths, warrantyTerms: f.warrantyTerms, metaTitle: f.metaTitle, metaDesc: f.metaDesc, slug: f.slug, video: f.video, torob: f.torob }); delete ((x as any).drafts ?? {})[draftKey] }, { action: 'پیش‌ساخت صفحهٔ کالای در راه', target: f.title })
    toast(`صفحهٔ «${f.title}» ذخیره شد. تا رسیدن محموله روی سایت نیست؛ هنگام رسید فقط بارکد، کد و رنگ را وارد و منتشر کنید.`)
    onDone ? onDone(pid) : nav('/admin/catalog?tab=incoming')
  }
  const save = (status0: string) => {
    if (partner) { const k = (t: string) => t.toLowerCase().replace(/[\s\-_]+/g, ''); const dup = getDB().products.find((p) => p.id !== f.id && ((f.ean && p.ean === f.ean) || k(p.title) === k(f.title) || (!!f.en.trim() && k(p.en) === k(f.en)) || (!!f.model.trim() && k(p.model ?? '') === k(f.model)))); if (dup) { setStep(0); return toast(`این کالا با نام «${dup.title}» در غنیمت هست؛ از «افزودن از کاتالوگ غنیمت» به موجودی خودتان اضافه کنید.`, { tone: 'err' }) } }
    const status = partner && status0 !== 'product.draft' ? 'product.pending' : status0 === 'product.published' && f.scheduledAt && new Date(f.scheduledAt).getTime() > Date.now() + 6e4 ? 'product.scheduled' : status0
    for (const s of incoming ? [0] : order) { const e = validate(s); if (Object.keys(e).length) { setErrors(e); setStep(s); return toast(Object.values(e)[0], { tone: 'err' }) } }
    if (incoming && status0 !== 'product.draft') return saveIncoming()
    if (status !== 'product.draft' && missing.length) { setStep(missing[0][2]); return toast(`برای انتشار کامل کنید: ${missing.map((m) => m[1]).join('، ')}`, { tone: 'err' }) }
    const isNew = !editing; const pid = editing?.id ?? `p${Date.now().toString(36)}`
    const code = f.code || takeCode('product')
    const prod: Product = { ...(editing ?? {} as Product), pdp: f.pdp, id: pid, image: f.images[0] ?? '', images: f.images, title: f.title.trim(), en: f.en.trim() || f.title.trim(), brand: f.brand, category: f.category, subCats: f.subCats, status, mode: f.mode, qty: f.mode === 'qty' ? (partner ? { tehran: 0, mahabad: f.qtyTehran + f.qtyMahabad } : { tehran: f.qtyTehran, mahabad: f.qtyMahabad }) : undefined, priceNew: f.priceNew || f.price, price: f.mode === 'qty' ? finalPrice : undefined, compareAt: f.discount ? f.price : undefined, cost: landed, rating: editing?.rating ?? 0, reviews: editing?.reviews ?? 0, views: editing?.views ?? 0, cvr: editing?.cvr ?? 0, health: Math.min(100, 30 + f.images.length * 10 + (f.short ? 15 : 0) + (f.long ? 15 : 0) + (Object.keys(f.specs).length ? 10 : 0) + (f.metaDesc ? 10 : 0)), fastEligible: partner ? partner.fast.on : f.fastEligible && tehranStock, seller: partner?.name ?? editing?.seller ?? 'غنیمت', partner: partner ? true : editing?.partner, torob: f.torob, code, ean: f.ean, model: f.model, specs: f.specs, keyFeatures: f.keyFeatures, short: f.short, long: f.long, box: f.box, pros: f.pros, cons: f.cons, condition: f.condition, grade: f.condition === 'sealed' ? '' : f.grade, source: f.source, originLabel: f.source === 'amazon' ? 'خریداری‌شده از آمازون' : 'خرید مستقیم اقلیم کردستان', supplier: f.supplier, currency: f.currency, costFx: f.costFx, rate: f.rate, extraCost: f.freight + f.customs + f.other, discount: f.discount, weight: f.weight, dims: f.dims, shipClass: f.shipClass, insurance: f.insurance, install: f.install, warrantyType: f.warrantyType, warrantyMonths: f.warrantyMonths, warrantyTerms: f.warrantyTerms, metaTitle: f.metaTitle, metaDesc: f.metaDesc, slug: f.slug, scheduledAt: f.scheduledAt, video: f.video }
    const existing = d.units.filter((u) => u.productId === pid)
    const newUnits: Unit[] = f.mode === 'serial' ? f.units.filter((r) => !existing.some((u) => u.serial === r.serial)).map((r) => { const c = takeCode('unit'); return { id: `GU-${c.replace(/\D/g, '').slice(-5)}`, code: c, productId: pid, serial: r.serial.trim(), condition: f.condition, grade: f.condition === 'sealed' ? '' : r.grade || f.grade, warehouse: r.warehouse, source: f.source, status: status === 'product.published' ? 'unit.published' : 'unit.ready', cost: landed, price: finalPrice, shelf: r.shelf || suggestBins(d, r.warehouse, { id: 'new', productId: pid, status: 'unit.ready', category: f.category, brand: f.brand }, 1)[0]?.bin.id || 'جدید', received: new Date().toISOString(), flaws: [], color: r.color, warrantyMonths: f.warrantyMonths } }) : []
    const by = currentUser()
    mutate((x) => {
      const i = x.products.findIndex((p) => p.id === pid); if (i >= 0) x.products[i] = prod; else x.products.unshift(prod)
      x.units.unshift(...newUnits)
      if (status !== 'product.draft') logPrice(x, pid, finalPrice, by?.name ?? 'پنل')
      if (!isNew) x.units.filter((u) => u.productId === pid && ['unit.published', 'unit.ready'].includes(u.status)).forEach((u) => { u.price = finalPrice; const r = f.units.find((q) => q.serial === u.serial); if (r) { u.color = r.color; u.shelf = r.shelf || u.shelf; u.warehouse = r.warehouse; u.grade = r.grade } })
      delete ((x as any).drafts ?? {})[draftKey]
      if (status === 'product.published') x.partnerQueue = x.partnerQueue.filter((q) => q.productId !== pid)
      if (f.places) x.merch.placements.forEach((pl) => { pl.pins = pl.pins.filter((y) => y !== pid); pl.excl = pl.excl.filter((y) => y !== pid); if (f.places![pl.id] === 'pin') pl.pins.push(pid); if (f.places![pl.id] === 'excl') pl.excl.push(pid) })
      if (f.dealDraft && !x.merch.deals.some((y) => y.pid === pid && y.start === f.dealDraft!.start)) x.merch.deals.unshift({ ...f.dealDraft, id: `dl${Date.now().toString(36)}`, pid, regular: f.dealDraft.regular || finalPrice })
      if (partner && status === 'product.pending') {
        const n = f.mode === 'qty' ? f.qtyTehran + f.qtyMahabad : f.units.length
        x.partnerQueue = x.partnerQueue.filter((q) => q.productId !== pid)
        x.partnerQueue.unshift({ id: `PQ-${Date.now().toString(36).slice(-3).toUpperCase()}`, productId: pid, kind: `کالای تازهٔ ${partner.name} (فرم کامل)`, status: 'product.pending', note: `${fa(n)} عدد · قیمت ${toman(finalPrice)} · ${f.images.length ? `${fa(f.images.length)} عکس` : 'بدون عکس'}${f.pdp.amazonUrl ? ' · لینک آمازون دارد' : ''} · فقط از انبار ${partner.city}`, at: new Date().toISOString() })
        if (isNew) x.lots.unshift({ id: `LT-${Date.now().toString(36).slice(-4).toUpperCase()}`, partnerId: partner.id, productId: pid, capital: 'partner', qty: n, soldOnline: 0, soldStore: 0, unitCost: landed, unitPrice: finalPrice, at: new Date().toISOString(), note: 'ثبت کامل از پرتال شعبه' })
      }
    }, { action: isNew ? (status === 'product.published' ? 'ثبت و انتشار کالا' : 'ثبت پیش‌نویس کالا') : 'ویرایش کالا', target: `${prod.title} (${code})` })
    if (partner && status === 'product.pending') { notify('کالای تازه از شعبه برای تأیید نهایی', `${partner.name}: «${prod.title}»`, '/admin/catalog?tab=partner', 'کاتالوگ'); toast('برای تأیید نهایی غنیمت رفت. تا تأیید، کالا روی سایت نیست و نتیجه با اعلان خبر داده می‌شود.'); return onDone?.(pid) }
    if (by && by.role !== 'super' && status === 'product.published') notify('کالای تازه منتشر شد', `${by.name}: «${prod.title}» با قیمت ${toman(finalPrice)} منتشر شد.`, `/admin/catalog/${pid}`, 'عملیات', 'info')
    toast(status !== 'product.draft' ? (status === 'product.scheduled' ? `انتشار «${prod.title}» برای ${new Date(f.scheduledAt).toLocaleString('fa-IR')} زمان‌بندی شد.` : `«${prod.title}» منتشر شد.`) : `پیش‌نویس «${prod.title}» ذخیره شد. پیش‌نویس‌ها در «کالا و کاتالوگ ← جدول ← پیش‌نویس» هستند و در سایت دیده نمی‌شوند.`)
    onDone ? onDone(pid) : nav(`/admin/catalog/${pid}`)
  }
  saveRef.current = save
  const addImages = async (files: FileList | null) => { if (!files) return; try { const imgs = await Promise.all([...files].slice(0, 10).map((fl) => fileToImage(fl))); set({ images: [...f.images, ...imgs].slice(0, 12) }); toast(`${fa(imgs.length)} تصویر اضافه شد.`) } catch (e) { toast((e as Error).message, { tone: 'err' }) } }
  const [drag, setDrag] = useState<number | null>(null)

  const body: Record<number, ReactNode> = {
    0: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="دسته‌بندی اصلی *" error={errors.category} help="قالب مشخصات از همین دسته خوانده می‌شود. دسته یا زیردستهٔ تازه را از داخل همین منو بسازید."><CategoryPicker label="دسته‌بندی اصلی" value={f.category} error={!!errors.category} onChange={(v) => set({ category: v, subCats: f.subCats.filter((x) => x !== v) })} /></Field>
      <Field label="دسته‌بندی‌های فرعی (اختیاری)" help="کالا در این دسته‌ها هم نمایش داده می‌شود."><CategoryPicker multi label="دسته‌بندی‌های فرعی" placeholder="انتخاب دسته‌بندی‌های فرعی" value={f.subCats} exclude={f.category ? [f.category] : []} onChange={(v) => set({ subCats: v })} /></Field>
      <Field label="برند"><Select value={f.brand} onChange={(v) => set({ brand: v })} options={(d.entities.brands ?? []).map((b) => b.name)} /></Field>
      <div className="sm:col-span-2"><Field label="عنوان فارسی *" error={errors.title} help="همان عنوانی که روی کارت محصول در دو خط نمایش داده می‌شود."><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً هدست بلوتوثی اپل مدل AirPods Max ۲۰۲۴" /></Field></div>
      <Field label="عنوان انگلیسی"><Input className="ltr text-left" value={f.en} onChange={(e) => set({ en: e.target.value })} placeholder="Apple AirPods Max 2024" /></Field>
      <Field label="مدل"><Input className="ltr text-left" value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder="A3184" /></Field>
      <Field label="کد داخلی کالا" help="هنگام ثبت خودکار ساخته می‌شود؛ قالب آن در تنظیمات قابل تغییر است."><div className="flex gap-2"><Input className="ltr text-left font-mono" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder={`${d.codeFormat.product}${String(d.codeFormat.nextProduct).padStart(d.codeFormat.pDigits, '0')}`} /><Button aria-label="ساخت کد تازه" icon={<RefreshCw size={14} />} onClick={() => set({ code: takeCode('product') })} /></div></Field>
      <Field label="بارکد کارخانه (EAN-13)" error={errors.ean} help="اختیاری؛ ۱۳ رقم روی جعبه."><Input className="ltr text-left font-mono" inputMode="numeric" maxLength={13} value={f.ean} onChange={(e) => set({ ean: e.target.value.replace(/\D/g, '') })} placeholder="0194253939535" /></Field>
    </div>,
    1: <div className="space-y-4"><p className="text-12 text-t2">فیلدها از قالب ویژگی دستهٔ «{f.category || '—'}» ({tpl?.name ?? 'پیش‌فرض'}) خوانده می‌شوند. ویژگی تازه را همین پایین اضافه کنید: فقط برای همین کالا، یا برای همهٔ کالاهای این قالب. حذف و ترتیب فیلدهای قالب در <button type="button" className="text-brand underline" onClick={() => nav('/admin/catalog?tab=attr')}>کالا و کاتالوگ › قالب ویژگی‌ها</button>.</p>
      <div className="grid gap-4 sm:grid-cols-2">{specFields.map((k) => <Field key={k} label={k}><Input value={f.specs[k] ?? ''} onChange={(e) => set({ specs: { ...f.specs, [k]: e.target.value } })} /></Field>)}
        {Object.keys(f.specs).filter((k) => !specFields.includes(k)).map((k) => <Field key={k} label={`${k} (فقط این کالا)`}><div className="flex gap-1.5"><Input value={f.specs[k] ?? ''} onChange={(e) => set({ specs: { ...f.specs, [k]: e.target.value } })} /><Button variant="ghost" aria-label={`حذف ویژگی ${k}`} icon={<Trash2 size={14} />} onClick={() => { const s = { ...f.specs }; delete s[k]; set({ specs: s }) }} /></div></Field>)}</div>
      <SpecAdder known={[...specFields, ...Object.keys(f.specs)]} tplName={tpl?.name} onAdd={(k, toTpl) => { set({ specs: { ...f.specs, [k]: f.specs[k] ?? '' } }); if (toTpl && tpl) { mutate((x) => { const t = x.entities.attrTemplates.find((y) => y.name === tpl.name); if (t) t.fields = `${t.fields}، ${k}` }, { action: 'افزودن ویژگی به قالب', target: `${tpl.name} › ${k}` }); toast(`«${k}» به قالب «${tpl.name}» اضافه شد و برای همهٔ کالاهای این قالب نمایش داده می‌شود.`) } else toast(`«${k}» فقط برای همین کالا اضافه شد.`) }} />
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
      <VideoField videos={f.pdp.videos} onChange={(v) => set({ pdp: { ...f.pdp, videos: v } })} /></div>,
    3: <div className="space-y-4">
      <Field label="لینک کالا در آمازون (اختیاری)" help="برای خواندن نظرات خریداران آمازون و نمایش انتخاب‌شده‌ها زیر «نظرات آمازون» در صفحهٔ کالا."><Input className="ltr text-left font-mono" value={f.pdp.amazonUrl ?? ''} onChange={(e) => set({ pdp: { ...f.pdp, amazonUrl: e.target.value } })} placeholder="https://www.amazon.com/dp/…" /></Field>
      {f.pdp.amazonUrl && f.id && <AmazonReviews pid={f.id} initialUrl={f.pdp.amazonUrl} />}
      {f.pdp.amazonUrl && !f.id && <p className="text-11 text-t2">بعد از اولین ذخیره، نظرات آمازون را از همین‌جا انتخاب و اضافه کنید.</p>}
      <div className="flex justify-end"><Button variant="ai" icon={<Sparkles size={14} />} onClick={() => { set({ short: f.short || `${f.title} با کنترل کیفیت دو مرحله‌ای و عکس واقعی همان واحد در غنیمت عرضه می‌شود.`, box: f.box || 'دستگاه، کابل شارژ، دفترچهٔ راهنما' }); toast('پیشنهاد AI در فیلدهای خالی گذاشته شد؛ پیش از انتشار بازبینی کنید.') }}>پیشنهاد بده (اختیاری)</Button></div>
      <Field label="معرفی کوتاه" help="اختصاصی بنویسید؛ متن منبع کپی نشود."><Textarea rows={3} value={f.short} onChange={(e) => set({ short: e.target.value })} /></Field>
      <Field label="معرفی کامل"><Textarea rows={6} value={f.long} onChange={(e) => set({ long: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="محتوای جعبه"><Textarea rows={3} value={f.box} onChange={(e) => set({ box: e.target.value })} /></Field><Field label="نکات مثبت"><Textarea rows={3} value={f.pros} onChange={(e) => set({ pros: e.target.value })} /></Field><Field label="نکات منفی"><Textarea rows={3} value={f.cons} onChange={(e) => set({ cons: e.target.value })} /></Field></div></div>,
    4: <div className="grid gap-4 sm:grid-cols-2">
      <Field label="وضعیت کالا"><EditableChoice list="condition" segmented value={f.condition} onChange={(v) => set(v === 'sealed' ? { condition: v, grade: '', units: f.units.map((u) => ({ ...u, grade: '' })) } : { condition: v, grade: f.grade || 'A' })} /></Field>
      {f.condition === 'sealed' ? <div className="flex items-center rounded-xl bg-neutral-bg px-3 py-2 text-12 text-t2">کالای اکبند گرید ظاهری ندارد؛ پلمپ کارخانه یعنی نو و دست‌نخورده. گرید فقط برای جعبه‌باز، استوک و بازسازی‌شده ثبت می‌شود.</div>
        : <Field label="گرید ظاهری" hint={<Hint k="grade" />}><EditableChoice list="grade" segmented value={f.grade} onChange={(v) => set({ grade: v })} /></Field>}
      <Field label="منبع تأمین" help="برچسب مبدأ روی کارت از همین ساخته می‌شود."><EditableChoice list="source" value={f.source} onChange={(v) => set({ source: v })} /></Field>
      <Field label="تأمین‌کننده"><Select value={f.supplier} onChange={(v) => set({ supplier: v })} options={(d.entities.suppliers ?? []).map((s) => s.name)} /></Field>
      <Field label="مبدأ و مسیر واردات" help="در صفحهٔ کالا: «تأمین‌شده از …»"><EditableChoice list="importRoute" value={f.pdp.importRoute} onChange={(v) => set({ pdp: { ...f.pdp, importRoute: v } })} /></Field>
      <div className="sm:col-span-2"><VariantEditor pdp={f.pdp} selfId={f.id} onChange={(pdp) => set({ pdp })} /></div>
      <div className="space-y-2 sm:col-span-2"><p className="text-13 font-semibold">بررسی جزئیات ظاهری (به تفکیک بخش)</p><p className="text-11 text-t2">هر بخش با وضعیت و توضیح در صفحهٔ کالا و کنار عکس واقعی همان بخش نمایش داده می‌شود.</p>
        {f.pdp.flaws.map((z, i) => <div key={i} className="grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_160px_2fr_auto]"><Input aria-label="بخش" value={z.zone} onChange={(e) => set({ pdp: { ...f.pdp, flaws: f.pdp.flaws.map((x, j) => j === i ? { ...x, zone: e.target.value } : x) } })} /><Select value={z.status} onChange={(v) => set({ pdp: { ...f.pdp, flaws: f.pdp.flaws.map((x, j) => j === i ? { ...x, status: v } : x) } })} options={d.opts.flawStatus.map((o) => o.l)} /><Input aria-label="توضیح" placeholder="مثلاً خط‌وخش سطحی ۳ میلی‌متری لبهٔ راست" value={z.note} onChange={(e) => set({ pdp: { ...f.pdp, flaws: f.pdp.flaws.map((x, j) => j === i ? { ...x, note: e.target.value } : x) } })} /><Button variant="ghost" aria-label="حذف بخش" icon={<Trash2 size={14} />} onClick={() => set({ pdp: { ...f.pdp, flaws: f.pdp.flaws.filter((_, j) => j !== i) } })} /></div>)}
        <Button size="sm" icon={<Plus size={13} />} onClick={() => set({ pdp: { ...f.pdp, flaws: [...f.pdp.flaws, { zone: 'بخش تازه', status: 'سالم', note: '' }] } })}>افزودن بخش</Button></div>
      <div className="sm:col-span-2"><RouteEditor pdp={f.pdp} onChange={(pdp) => set({ pdp })} /></div>
      <div className="sm:col-span-2"><QcLayers pdp={f.pdp} sealed={f.condition === 'sealed'} onChange={(pdp) => set({ pdp })} /></div>
      <p className="rounded-md bg-neutral-bg px-3 py-2 text-12 text-t2 sm:col-span-2">برچسب مبدأ روی کارت: <b className="text-t1">{d.opts.source.find((o) => o.v === f.source)?.note ?? d.opts.source.find((o) => o.v === f.source)?.l ?? '—'}</b></p></div>,
    5: <div className="space-y-4">
      <Field label="نوع نگهداری" hint={<Hint k="product_unit" />}><Segmented value={f.mode} onChange={(v) => set({ mode: v })} options={[['qty', 'موجودی تعدادی (اکبند هم‌مدل)'], ['serial', 'واحد سریال‌دار (هر واحد جدا)']]} /></Field>
      {f.mode === 'qty' && partner ? <div className="grid gap-4 sm:grid-cols-3"><Field label={`انبار ${partner.city} (عدد)`} error={errors.qty} help="فقط به موجودی شعبهٔ شما اضافه می‌شود."><Input type="number" min={0} className="ltr text-left font-mono" value={f.qtyTehran + f.qtyMahabad} onChange={(e) => set({ qtyTehran: 0, qtyMahabad: Math.max(0, +e.target.value) })} /></Field><Field label="قفسه در انبار شما (اختیاری)"><Input className="ltr text-left font-mono" value={f.shelf} onChange={(e) => set({ shelf: e.target.value })} /></Field></div> : f.mode === 'qty' ? <div className="grid gap-4 sm:grid-cols-3"><Field label="انبار تهران (عدد)" error={errors.qty}><Input type="number" min={0} className="ltr text-left font-mono" value={f.qtyTehran} onChange={(e) => set({ qtyTehran: Math.max(0, +e.target.value) })} /></Field><Field label="انبار مهاباد (عدد)"><Input type="number" min={0} className="ltr text-left font-mono" value={f.qtyMahabad} onChange={(e) => set({ qtyMahabad: Math.max(0, +e.target.value) })} /></Field><Field label="قفسه"><Input className="ltr text-left font-mono" value={f.shelf} onChange={(e) => set({ shelf: e.target.value })} placeholder="D-02-1" /></Field></div>
        : <div className="space-y-2">{errors.units && <p className="text-12 text-danger">{errors.units}</p>}
          {f.units.map((u, i) => <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_.8fr_.7fr_auto] sm:items-end">
            <Field label={`سریال یا IMEI واحد ${fa(i + 1)}`}><Input className="ltr text-left font-mono" value={u.serial} onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)) })} /></Field>
            <Field label="رنگ"><Input value={u.color} onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} /></Field>
            <Field label="انبار"><Select value={u.warehouse} onChange={(v) => set({ units: f.units.map((x, j) => (j === i ? { ...x, warehouse: v } : x)) })} options={d.warehouses.map((w) => [w.id, w.name])} /></Field>
            <Field label="قفسه" hint={!u.shelf ? <button type="button" className="text-11 text-brand" onClick={() => { const sg = suggestBins(d, u.warehouse || 'tehran', { id: `new${i}`, productId: f.id ?? '', status: 'unit.qc', category: f.category, brand: f.brand }, 1)[0]; if (!sg) return toast('خانهٔ خالی مناسبی پیدا نشد.', { tone: 'err' }); set({ units: f.units.map((x, j) => (j === i ? { ...x, shelf: sg.bin.id } : x)) }); toast(`پیشنهاد: ${sg.bin.id} · ${sg.why.slice(0, 2).join('، ')}`) }}>پیشنهاد جا</button> : undefined}><Input className="ltr text-left font-mono" value={u.shelf} placeholder="خالی = پیشنهاد خودکار" onChange={(e) => set({ units: f.units.map((x, j) => (j === i ? { ...x, shelf: e.target.value } : x)) })} /></Field>
            {f.condition !== 'sealed' && <Field label="گرید"><Select value={u.grade} onChange={(v) => set({ units: f.units.map((x, j) => (j === i ? { ...x, grade: v } : x)) })} options={['A+', 'A', 'B']} /></Field>}
            <Button variant="ghost" aria-label="حذف واحد" icon={<Trash2 size={14} />} onClick={() => set({ units: f.units.filter((_, j) => j !== i) })} />
          </div>)}
          <Button icon={<Plus size={14} />} onClick={() => set({ units: [...f.units, { serial: '', color: f.units.at(-1)?.color ?? '', warehouse: 'tehran', shelf: '', grade: f.grade }] })}>افزودن واحد</Button></div>}</div>,
    6: <div className="space-y-5"><div><p className="mb-2 text-13 font-semibold">مدل فروش</p><div className="grid gap-2 sm:grid-cols-2">{([['online', 'قیمت‌گذاری و فروش اینترنتی', 'قیمت در سایت دیده می‌شود و مشتری مستقیم پرداخت می‌کند.'], ['inquiry', 'استعلام موجودی و ثبت سفارش تلفنی', 'به‌جای دکمهٔ خرید «استعلام قیمت و موجودی» نمایش داده می‌شود؛ درخواست به «درخواست‌های مشتری» می‌رود.']] as const).map(([k, t, dsc]) => { const on = (f.pdp.saleMode ?? 'online') === k; return <button key={k} type="button" onClick={() => set({ pdp: { ...f.pdp, saleMode: k } })} className={cx('rounded-2xl border p-3 text-right transition-colors', on ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand/40')}><b className={cx('flex items-center gap-1.5 text-13', on && 'text-brand')}>{on && <Check size={14} />}{t}</b><span className="mt-1 block text-11 text-t2">{dsc}</span></button> })}</div>{f.pdp.saleMode === 'inquiry' && <p className="mt-2 text-11 text-warning">قیمت را همچنان ثبت کنید؛ برای محاسبهٔ سود و پاسخ کارشناس فروش لازم است ولی در سایت نمایش داده نمی‌شود.</p>}</div>
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="قیمت خرید"><MoneyIn value={f.costFx} onChange={(n) => set({ costFx: n })} placeholder="مثلاً 12,000,000" /></Field>
        <Field label="ارز خرید" help={f.currency !== 'تومان' ? 'با انتخاب ارز، نرخ امروز خودکار استعلام می‌شود.' : undefined}><Select value={f.currency} onChange={loadRate} options={CURRENCIES} /></Field>
        {f.currency !== 'تومان' && <Field label={`نرخ روز ${f.currency} (تومان)`} help={!fx ? 'برای گرفتن نرخ امروز «استعلام نرخ روز» را بزنید.' : 'loading' in fx ? 'در حال استعلام نرخ روز…' : fx.manual ? 'نرخ دستی وارد شده است.' : fx.source === 'api' ? `نرخ روز از API · ${new Date(fx.at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}` : fx.source === 'demo' ? 'نرخ روز (حالت نمایشی؛ API واقعی را در تنظیمات وصل کنید)' : `آخرین نرخ ذخیره‌شده (${new Date(fx.at).toLocaleDateString('fa-IR')})`}
          hint={<button type="button" disabled={!!fx && 'loading' in fx} onClick={() => loadRate(f.currency)} className="text-11 text-brand disabled:opacity-50">{fx && 'loading' in fx ? 'در حال استعلام…' : 'استعلام نرخ روز'}</button>}>
          <MoneyIn value={f.rate} onChange={(n) => { set({ rate: n }); setFx((x) => (x && !('loading' in x) ? { ...x, manual: true } : { rate: n, at: new Date().toISOString(), source: 'saved', manual: true })) }} /></Field>}
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
      </Card></div>
      {editing?.currency && editing.currency !== 'تومان' && <FxRevalue pid={editing.id} />}</div>,
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
      <Field label="پوشش داده می‌شود" help="با ویرگول جدا کنید؛ در صفحهٔ کالا تیک سبز می‌گیرد."><Textarea rows={2} value={f.pdp.covered} onChange={(e) => set({ pdp: { ...f.pdp, covered: e.target.value } })} /></Field>
      <Field label="پوشش داده نمی‌شود"><Textarea rows={2} value={f.pdp.notCovered} onChange={(e) => set({ pdp: { ...f.pdp, notCovered: e.target.value } })} /></Field>
      <div className="sm:col-span-2"><Field label="شرایط" help="روی کارت گارانتی چاپی خلاصه می‌شود."><Textarea rows={3} value={f.warrantyTerms} onChange={(e) => set({ warrantyTerms: e.target.value })} /></Field></div></div>,
    9: <div className="space-y-4">
      <WherePlaced f={f} set={set} />
      <CardLinesEditor f={f} set={set} preview={<ProductCard p={{ ...(editing ?? {}), id: f.id ?? 'preview', image: f.images[0] ?? '', title: f.title || 'عنوان کالا', en: f.en, brand: f.brand, category: f.category, status: 'product.published', mode: 'qty', qty: { tehran: Math.max(1, f.qtyTehran), mahabad: f.qtyMahabad }, priceNew: f.priceNew, price: finalPrice, compareAt: f.discount ? f.price : undefined, rating: 0, reviews: 0, views: 0, cvr: 0, health: 0, fastEligible: f.fastEligible, seller: 'غنیمت', torob: f.torob, source: f.source, pdp: f.pdp } as Product} />} />
      <div className="flex flex-wrap gap-6 rounded-xl bg-surface-2 p-3 text-13"><Toggle on={!!f.pdp.featured} onChange={(v) => set({ pdp: { ...f.pdp, featured: v } })} text="کالای ویژه (در بخش «پیشنهاد غنیمت»)" /><Toggle on={f.pdp.showQA ?? true} onChange={(v) => set({ pdp: { ...f.pdp, showQA: v } })} text="نمایش پرسش و پاسخ" /><Toggle on={f.pdp.showReviews ?? true} onChange={(v) => set({ pdp: { ...f.pdp, showReviews: v } })} text="نمایش دیدگاه‌ها" /><Toggle on={f.pdp.showPriceChart ?? d.storeCfg.pdp.priceChart.on} onChange={(v) => set({ pdp: { ...f.pdp, showPriceChart: v } })} text="نمایش نمودار قیمت" /></div>
      <div className="flex flex-wrap gap-6"><label className="flex items-center gap-2 text-13"><Toggle on={f.site} label="سایت" onChange={(v) => set({ site: v })} />نمایش در سایت</label><label className="flex items-center gap-2 text-13"><Toggle on={f.torob} label="ترب" onChange={(v) => set({ torob: v })} />نمایش در ترب</label></div>
      <Field label="عنوان متا" help={`${fa((f.metaTitle || `خرید ${f.title} | غنیمت`).length)} نویسه؛ هدف زیر ۶۰`}><Input value={f.metaTitle} onChange={(e) => set({ metaTitle: e.target.value })} placeholder={`خرید ${f.title || '…'} | غنیمت`} /></Field>
      <Field label="توضیح متا" help={`${fa(f.metaDesc.length)} نویسه؛ هدف ۱۲۰ تا ۱۶۰`}><Textarea rows={2} value={f.metaDesc} onChange={(e) => set({ metaDesc: e.target.value })} /></Field>
      <Field label="نشانی صفحه"><Input className="ltr text-left font-mono" value={f.slug} onChange={(e) => set({ slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} placeholder={(f.en || 'product').toLowerCase().replace(/\s+/g, '-')} /></Field>
      <div className="rounded-lg border border-line p-3"><p className="ltr text-left text-11 text-success">ghanimat.ir › product › {f.slug || (f.en || 'product').toLowerCase().replace(/\s+/g, '-')}</p><p className="text-14 text-brand">{f.metaTitle || `خرید ${f.title || '…'} | غنیمت`}</p><p className="text-12 text-t2">{f.metaDesc || f.short || 'توضیح متا هنوز نوشته نشده است.'}</p></div>
      <Field label="کد سفارشی Head (اختیاری)" help="برای اسکیمای اختصاصی یا متاتگ تأیید؛ بدون نیاز معمولاً خالی بماند."><textarea rows={4} value={f.pdp.headCode ?? ''} onChange={(e) => set({ pdp: { ...f.pdp, headCode: e.target.value } })} spellCheck={false} placeholder={'<script type="application/ld+json">…</script>'} className="ltr w-full rounded-xl border border-line bg-[#10123d] p-3 text-left font-mono text-12 text-[#cfd3ff] outline-none focus:border-brand" /></Field>
      <ul className="grid gap-2 text-12 sm:grid-cols-2">{['اسکیمای محصول با قیمت، موجودی و امتیاز برای گوگل', 'افزودن به sitemap.xml پس از انتشار', 'پیش‌نمایش اشتراک در شبکه‌های اجتماعی (OG)', 'تگ canonical و متاتگ‌های ضروری'].map((t) => <li key={t} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-success-bg text-success"><Check size={11} /></span>{t}<span className="text-t3">(خودکار)</span></li>)}</ul></div>,
    10: <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3"><p className="text-13">کد داخلی: <b className="ltr font-mono">{f.code || `${d.codeFormat.product}… (هنگام ثبت)`}</b></p>
        {f.code && <Barcode value={f.code} className="h-20 w-full max-w-sm rounded border border-line" />}
        {f.ean && isEan13(f.ean) && <><p className="text-13">بارکد کارخانه</p><Barcode value={f.ean} type="ean13" className="h-20 w-full max-w-sm rounded border border-line" /></>}
        {f.code && <div className="flex items-center gap-3"><QR value={`https://ghanimat.ir/p/${f.code}`} size={88} /><p className="text-12 text-t2">QR به صفحهٔ کالا در پنل و سایت می‌رود. اسکن هر کد در جست‌وجو، دریافت، جمع‌آوری، بسته‌بندی و مرجوعی همین کالا را باز می‌کند.</p></div>}
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
  if (missing0) return <Page title="کالا پیدا نشد" back="/admin/catalog"><Card><EmptyState title="کالایی با این شناسه برای ویرایش نیست." desc="ممکن است حذف شده یا به سطل بازیافت رفته باشد." action={<Button onClick={() => nav('/admin/catalog')}>فهرست کالاها</Button>} /></Card></Page>
  return (
    <Page title={partner ? 'ثبت کامل کالای تازه' : editing ? `ویرایش «${editing.title}»` : quick ? 'افزودن سریع کالا' : 'افزودن کالا'} module={quick || partner ? undefined : 'catalog'} back={partner ? undefined : editing ? `/admin/catalog/${editing.id}` : quick ? undefined : '/admin/catalog'}
      badge={savedAt ? <Badge tone="success">پیش‌نویس ذخیره شد</Badge> : undefined}
      actions={incoming ? <Button variant="ghost" onClick={() => nav('/admin/catalog?tab=incoming')}>کالاهای در راه</Button> : partner ? <span className="text-12 text-t2">پیش‌نویس خودکار ذخیره می‌شود · بعد از تأیید نهایی غنیمت روی سایت می‌رود</span> : <><Button variant="ghost" title="پیش‌نویس در سایت دیده نمی‌شود و در «کالا و کاتالوگ ← جدول ← پیش‌نویس» می‌ماند." onClick={() => save('product.draft')}>ذخیرهٔ پیش‌نویس</Button><Button variant="ghost" onClick={() => setSch(f.scheduledAt || (() => { const t = new Date(Date.now() + 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}T10:00` })())}>انتشار زمان‌بندی‌شده</Button><Button variant="ghost" onClick={() => nav('/admin/catalog?tab=products&view=drafts')}>پیش‌نویس‌ها ({fa(d.products.filter((p) => p.status === 'product.draft').length)})</Button></>}
      primary={incoming ? <Button variant="primary" onClick={() => save('product.published')}>ذخیره (منتظر رسیدن محموله)</Button> : partner ? <Button variant="primary" onClick={() => save('product.published')}>ارسال برای تأیید نهایی</Button> : <Button variant="primary" onClick={() => save('product.published')}>{editing ? 'ذخیره و انتشار' : f.scheduledAt ? 'زمان‌بندی انتشار' : 'انتشار الان'}</Button>}>
      {sp.get('from') === 'photo' && !f.images.length && <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-brand/50 bg-brand-tint/40 p-3 text-13"><Camera size={18} className="text-brand" /><span className="flex-1">از جعبهٔ کالا یا بارکد آن عکس بگیرید؛ عکس به گام تصاویر اضافه می‌شود و عنوان پیشنهادی برای تأیید شما در فرم می‌نشیند.</span><span className="btn rounded-md bg-brand-solid px-3 py-1.5 text-white">گرفتن عکس</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => { const fl = e.target.files?.[0]; if (!fl) return; try { const img = await fileToImage(fl); set({ images: [img], title: f.title || 'کالای تشخیص‌داده‌شده از عکس (عنوان را اصلاح کنید)' }); toast('عکس اضافه شد. عنوان پیشنهادی را بازبینی کنید.') } catch (er) { toast((er as Error).message, { tone: 'err' }) } }} /></label>}
      {incoming && <div className="mb-3 rounded-md border border-info/30 bg-info-bg px-3 py-2 text-12 text-info">این کالا در راه است{batch ? ` (${batch.title} · رسیدن حدود ${new Date(batch.eta).toLocaleDateString('fa-IR')})` : ''}. همهٔ فیلدها، عکس‌ها و توضیحات را از الان پر کنید؛ موجودی، بارکد، کد و رنگ نهایی هنگام رسید وارد می‌شود و تا آن موقع کالا روی سایت نیست{editing?.comingSoon ? '، جز در بخش «به‌زودی»' : ''}.</div>}
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
            {last ? <Button variant="primary" onClick={() => save('product.published')}>{incoming ? 'ذخیره (منتظر رسیدن محموله)' : partner ? 'ارسال برای تأیید نهایی' : f.scheduledAt ? 'زمان‌بندی انتشار' : 'انتشار الان'}</Button> : <Button variant="primary" onClick={() => go(order[pos + 1])}>بعدی<ArrowLeft size={14} /></Button>}
          </div>
        </Card>
      </div>
      <Modal open={sch !== null} onClose={() => setSch(null)} title="انتشار زمان‌بندی‌شده" footer={<Button variant="primary" disabled={!sch || new Date(sch).getTime() < Date.now()} onClick={() => { set({ scheduledAt: sch! }); setSch(null); setTimeout(() => saveRef.current('product.published')) }}>زمان‌بندی</Button>}>
        <Field label="زمان انتشار" help="تا این زمان کالا با وضعیت «زمان‌بندی‌شده» می‌ماند و در سایت دیده نمی‌شود؛ سر وقت خودکار منتشر می‌شود."><Input type="datetime-local" value={sch ?? ''} onChange={(e) => setSch(e.target.value)} /></Field>
      </Modal>
    </Page>
  )
}
export { STEPS as WIZARD_STEPS, Star }

/** کجای سایت نمایش داده شود: برای هر جایگاه ویترین «خودکار، سنجاق یا پنهان» و زمان‌بندی غنی‌آف؛ هم هنگام ساخت کالا، هم بعداً */
function WherePlaced({ f, set }: { f: Draft; set: (p: Partial<Draft>) => void }) {
  const d = useDB(); const [deal, setDeal] = useState<Partial<Deal> | null>(null)
  const cur = f.places ?? Object.fromEntries(d.merch.placements.flatMap((pl): [string, 'pin' | 'excl'][] => (f.id && pl.pins.includes(f.id) ? [[pl.id, 'pin']] : f.id && pl.excl.includes(f.id) ? [[pl.id, 'excl']] : []))) as Record<string, 'pin' | 'excl'>
  const setPl = (id: string, v: 'auto' | 'pin' | 'excl') => { const n = { ...cur }; if (v === 'auto') delete n[id]; else n[id] = v; set({ places: n }) }
  const deals = f.id ? d.merch.deals.filter((x) => x.pid === f.id && ['live', 'scheduled', 'paused'].includes(dealStatus(x))) : []
  return <div className="space-y-3 rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-13 font-semibold">کجای سایت نمایش داده شود</p><span className="text-11 text-t2">«خودکار» یعنی طبق قانون همان بخش؛ «سنجاق» یعنی حتماً و اول؛ «پنهان» یعنی هرگز</span></div>
    <div className="grid gap-2 sm:grid-cols-2">{d.merch.placements.filter((pl) => pl.id !== 'amazing').map((pl) => { const v = cur[pl.id] ?? 'auto'; return (
      <div key={pl.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-bg/60 px-2.5 py-1.5 text-12"><span className="min-w-0"><b className="block truncate">{pl.name}</b><span className="text-11 text-t3">{pl.page}</span></span>
        <Segmented size="sm" value={v} onChange={(x) => setPl(pl.id, x)} options={[['auto', 'خودکار'], ['pin', 'سنجاق'], ['excl', 'پنهان']]} /></div>) })}</div>
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-12"><b>غنی‌آف:</b>
      {deals.map((x) => <span key={x.id} className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1"><Badge tone={DEAL_LABEL[dealStatus(x)][1]}>{DEAL_LABEL[dealStatus(x)][0]}</Badge>{toman(x.price)} · {new Date(x.start).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<button className="text-brand" onClick={() => setDeal(x)}>ویرایش</button></span>)}
      {f.dealDraft && <span className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-tint/40 px-2 py-1">با ذخیره ثبت می‌شود: {toman(f.dealDraft.price)} از {new Date(f.dealDraft.start).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<button className="text-danger" onClick={() => set({ dealDraft: undefined })}>حذف</button></span>}
      {!deals.length && !f.dealDraft && <span className="text-t2">ندارد</span>}
      <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setDeal({ pid: f.id, regular: Math.round(f.price * (1 - f.discount / 100)) || f.priceNew })}>زمان‌بندی غنی‌آف</Button>
    </div>
    {deal && (f.id ? <DealForm init={deal} lockPid onClose={() => setDeal(null)} /> : <DealForm init={deal} lockPid onClose={() => setDeal(null)} onDraft={(x) => set({ dealDraft: { ...x, sold: 0 } as any })} />)}
  </div>
}

/** خط متحرک کارت همین کالا: مثل همهٔ کالاها، یا خط‌های عمومی + انتخاب‌های این کالا، یا فقط انتخاب‌های این کالا؛ با مدت و اهمیت هر خط */
function CardLinesEditor({ f, set, preview }: { f: Draft; set: (p: Partial<Draft>) => void; preview: ReactNode }) {
  const d = useDB(); const lib = d.site.card.lines; const cl = f.pdp.cardLines ?? { mode: 'inherit' as const, pick: [], custom: [], over: {} }
  const up = (patch: Partial<typeof cl>) => set({ pdp: { ...f.pdp, cardLines: { ...cl, ...patch } } })
  const over = (id: string, o: { dur?: number; weight?: number }) => up({ over: { ...(cl.over ?? {}), [id]: { ...(cl.over?.[id] ?? {}), ...o } } })
  return <div className="space-y-3 rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-13 font-semibold">خط متحرک کارت این کالا</p><span className="text-11 text-t2">خط‌های عمومی، آیکون، رنگ و سرعت را در «سربرگ، منو و فوتر ← کارت محصول» تعریف کنید</span></div>
    <Segmented size="sm" value={cl.mode} onChange={(v) => up({ mode: v })} options={[['inherit', 'مثل همهٔ کالاها'], ['add', 'عمومی + انتخاب‌های این کالا'], ['replace', 'فقط انتخاب‌های این کالا']]} />
    <div className="grid gap-3 lg:grid-cols-[1fr_250px]">
      <div className="space-y-2">{cl.mode === 'inherit' ? <p className="rounded-lg bg-neutral-bg p-2.5 text-12 text-t2">همان خط‌های عمومی با شرط‌هایشان نمایش داده می‌شود (مثلاً «موجودی محدود» فقط وقتی موجودی کم است).</p> : <>
        <p className="text-12 font-medium">از خط‌های آماده انتخاب کنید</p>
        <ul className="space-y-1.5">{lib.map((l) => { const def = KIND_DEFAULT[l.kind] ?? KIND_DEFAULT.custom; const on = cl.mode === 'add' && l.scope !== 'manual' ? true : cl.pick.includes(l.id); const forced = cl.mode === 'add' && l.scope !== 'manual'; const o = cl.over?.[l.id] ?? {}; return <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-12">
          <input type="checkbox" aria-label={l.text} checked={on} disabled={forced} onChange={() => up({ pick: cl.pick.includes(l.id) ? cl.pick.filter((x) => x !== l.id) : [...cl.pick, l.id] })} /><LineIcon k={l.icon ?? def.icon} color={l.color ?? def.color} /><span className="min-w-0 flex-1 truncate">{l.text}{forced && <span className="text-11 text-t3"> (عمومی)</span>}</span>
          {on && <><Input aria-label={`مدت ${l.text}`} className="h-7 w-14 text-center text-11" inputMode="decimal" placeholder={String(l.dur ?? d.site.card.interval)} value={o.dur ?? ''} onChange={(e) => { const v = parseFloat(e.target.value.replace(/[^\d.]/g, '')); over(l.id, { dur: isNaN(v) ? undefined : Math.max(0.25, v) }) }} /><span className="text-11 text-t3">ثانیه</span><Segmented size="sm" value={String(o.weight ?? l.weight ?? 1)} onChange={(v) => over(l.id, { weight: +v })} options={WEIGHT} /></>}
        </li> })}</ul>
        <p className="pt-1 text-12 font-medium">خط اختصاصی همین کالا</p>
        {cl.custom.map((c, i) => <div key={c.id} className="space-y-1.5 rounded-lg border border-brand/30 bg-brand-tint/20 p-2">
          <div className="flex items-center gap-1.5"><LineIcon k={c.icon} color={c.color} /><Input aria-label="متن خط اختصاصی" className="h-8 flex-1 text-12" value={c.text} onChange={(e) => up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} /><Button size="sm" variant="ghost" aria-label="حذف خط" icon={<Trash2 size={13} />} onClick={() => up({ custom: cl.custom.filter((_, j) => j !== i) })} /></div>
          <div className="flex flex-wrap items-center gap-1">{[...Object.entries(LINE_ICONS).map(([k, [, lb]]) => [k, lb]), ...(d.site.card.icons ?? []).map((u) => [`u:${u.id}`, u.name])].map(([k, lb]) => <button key={k} type="button" aria-label={`آیکون ${lb}`} aria-pressed={c.icon === k} onClick={() => up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, icon: k } : x)) })} className={cx('grid size-6 place-items-center rounded-md', c.icon === k ? 'bg-brand-tint ring-1 ring-brand' : 'hover:bg-neutral-bg')}><LineIcon k={k} color={c.color} size={13} /></button>)}</div>
          <div className="flex flex-wrap items-center gap-1.5">{LINE_COLORS.map((col) => <button key={col} type="button" aria-label={`رنگ ${col}`} aria-pressed={c.color === col} onClick={() => up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, color: col } : x)) })} className={cx('size-5 rounded-full border-2', c.color === col ? 'border-t1' : 'border-transparent')} style={{ background: col }} />)}<input type="color" aria-label="رنگ دلخواه" value={c.color} onChange={(e) => up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} className="size-6 cursor-pointer rounded" />
            <Input aria-label="مدت خط اختصاصی" className="mr-2 h-7 w-14 text-center text-11" inputMode="decimal" placeholder={String(d.site.card.interval)} value={c.dur ?? ''} onChange={(e) => { const v = parseFloat(e.target.value.replace(/[^\d.]/g, '')); up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, dur: isNaN(v) ? undefined : Math.max(0.25, v) } : x)) }) }} /><span className="text-11 text-t3">ثانیه</span><Segmented size="sm" value={String(c.weight ?? 1)} onChange={(v) => up({ custom: cl.custom.map((x, j) => (j === i ? { ...x, weight: +v } : x)) })} options={WEIGHT} /></div>
        </div>)}
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => up({ custom: [...cl.custom, { id: `cc${Date.now().toString(36)}`, text: 'فقط ۳ عدد با این قیمت', icon: 'flame', color: '#dc2626', weight: 2 }] })}>افزودن خط اختصاصی</Button><label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-12 text-t2 hover:bg-neutral-bg" title="SVG تک‌رنگ مربع زیر ۲۰ کیلوبایت، یا PNG/WebP شفاف ۹۶×۹۶ زیر ۵۰ کیلوبایت"><Plus size={12} />بارگذاری آیکون خودم<input type="file" accept=".svg,image/svg+xml,image/png,image/webp" className="sr-only" aria-label="بارگذاری آیکون خودم" onChange={async (e) => { const fl = e.target.files?.[0]; e.target.value = ''; if (!fl) return; try { const ic = await readIcon(fl); mutate((x) => { x.site.card.icons = [...(x.site.card.icons ?? []), ic]; x.sitePublished.card.icons = [...(x.sitePublished.card.icons ?? []), ic] }, { action: 'بارگذاری آیکون خط کارت', target: ic.name }); toast(`آیکون «${ic.name}» به فهرست آیکون‌ها اضافه شد.`) } catch (er) { toast((er as Error).message, { tone: 'err' }) } }} /></label></div>
      </>}</div>
      <div className="flex flex-col items-center gap-1 rounded-lg bg-neutral-bg p-2"><p className="text-11 text-t2">پیش‌نمایش زنده</p>{preview}</div>
    </div>
  </div>
}

/** افزودن ویژگی تازه از داخل فرم کالا: فقط برای همین کالا یا برای کل قالب ویژگی دسته */
function SpecAdder({ known, tplName, onAdd }: { known: string[]; tplName?: string; onAdd: (k: string, toTpl: boolean) => void }) {
  const [k, setK] = useState('')
  const go = (toTpl: boolean) => { const n = k.trim(); if (!n) return toast('نام ویژگی را بنویسید.', { tone: 'err' }); if (known.some((x) => x.trim() === n)) return toast(`ویژگی «${n}» از قبل هست.`, { tone: 'err' }); onAdd(n, toTpl); setK('') }
  return <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
    <Field label="ویژگی تازه"><Input value={k} onChange={(e) => setK(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(false) } }} placeholder="مثلاً نسخهٔ سیستم‌عامل" /></Field>
    <Button icon={<Plus size={14} />} onClick={() => go(false)}>فقط برای این کالا</Button>
    <Button variant="ghost" icon={<Plus size={14} />} disabled={!tplName} title={tplName ? undefined : 'این دسته قالب ویژگی ندارد'} onClick={() => go(true)}>{tplName ? `افزودن به قالب «${tplName}»` : 'افزودن به قالب'}</Button>
  </div>
}
