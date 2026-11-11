import { type ReactNode } from 'react'
import { Barcode, QR } from '@/shared/ui/codes'
import { cx } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa, num } from '@/shared/lib/fa'
import { CONDITION } from '@/shared/data/statuses'
import type { Order, Shipment } from '@/shared/data/seed'

export type DocOpts = { font: number; margin: number; footer: string; seal: boolean; hide: string[] }
const show = (o: DocOpts, k: string) => !o.hide.includes(k)
const jd = (iso?: string) => (iso ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso)) : '—')
const rial = (toman: number) => num(toman * 10)
const Sheet = ({ w, h, o, children, className }: { w: string; h?: string; o: DocOpts; children: ReactNode; className?: string }) => (
  <div className={cx('doc-sheet mx-auto bg-white text-black shadow-float', className)} style={{ width: w, minHeight: h, padding: `${o.margin}mm`, fontSize: `${o.font * 10}pt`, fontFamily: 'Vazirmatn', boxSizing: 'border-box' }}>{children}</div>
)
const Logo = ({ h = 34 }: { h?: number }) => <img src="./brand/logo-full.png" alt="غنیمت" style={{ height: h }} />
/** مهر پیش‌فرض فروشگاه، تا وقتی تصویر مهر واقعی در تنظیمات بارگذاری نشده است */
const DefaultStamp = () => (
  <svg viewBox="0 0 120 120" width="104" height="104" aria-label="مهر فروشگاه"><circle cx="60" cy="60" r="56" fill="none" stroke="#2b3fd1" strokeWidth="3" /><circle cx="60" cy="60" r="47" fill="none" stroke="#2b3fd1" strokeWidth="1.2" />
    <defs><path id="st" d="M 22 60 A 38 38 0 0 1 98 60" /><path id="sb" d="M 26 66 A 34 34 0 0 0 94 66" /></defs>
    <text fontSize="10" fill="#2b3fd1" fontFamily="Vazirmatn" fontWeight="700"><textPath href="#st" startOffset="50%" textAnchor="middle">فروشگاه اینترنتی</textPath></text>
    <text x="60" y="66" fontSize="18" textAnchor="middle" fill="#2b3fd1" fontFamily="Vazirmatn" fontWeight="900">غنیمت</text>
    <text fontSize="9" fill="#2b3fd1" fontFamily="Vazirmatn"><textPath href="#sb" startOffset="50%" textAnchor="middle">واحد فروش</textPath></text></svg>
)
const Boxes = ({ v, n = 10, size = 6 }: { v: string; n?: number; size?: number }) => (
  <span className="ltr inline-flex" style={{ direction: 'ltr' }}>{Array.from({ length: n }).map((_, i) => <span key={i} className="grid place-items-center border border-black font-mono font-bold" style={{ width: `${size}mm`, height: `${size * 1.25}mm`, marginLeft: i ? '-0.3mm' : 0, fontSize: `${size * 0.6}mm` }}>{v[i] ?? ''}</span>)}</span>
)
export const addrLine = (a?: { province: string; city: string; district: string; street: string; sub?: string; alley?: string; plaque?: string; floor?: string; unit?: string }) =>
  a ? [a.province, a.city, a.district, a.street, a.sub, a.alley, a.plaque && `پلاک ${a.plaque}`, a.floor && `طبقهٔ ${a.floor}`, a.unit && `واحد ${a.unit}`].filter(Boolean).join('، ') : 'نشانی ثبت نشده است'

function useParties(o: Order) {
  const d = useDB(); const c = d.customers.find((x) => x.id === o.customerId)!
  const legal = o.buyer === 'legal' ? d.customers.find((x) => x.id === o.legalId) : undefined
  return { d, c, legal, seller: d.seller }
}

/** ۱) صورت‌حساب فروش کالا و خدمات — مطابق فاکتور رسمی فیگما، نسخهٔ حقیقی و حقوقی */
export function Invoice({ o, opts }: { o: Order; opts: DocOpts }) {
  const { d, c, legal, seller } = useParties(o)
  const vat = d.rules.find((r) => r.key === 'vat_percent')?.value ?? 0
  const rows = [...o.shipments.flatMap((s) => s.items.map((it) => { const p = d.products.find((x) => x.id === it.productId)!; const u = d.units.find((x) => x.id === it.unitId); return { code: u?.code ?? p.code ?? '—', desc: [p.title, u?.color, u ? (u.condition === 'sealed' ? 'اکبند' : CONDITION[u.condition]) : '', `گارانتی ${fa(u?.warrantyMonths ?? p.warrantyMonths ?? 6)} ماهه غنیمت`].filter(Boolean).join(' | ').replace(' | ', ' — '), qty: it.qty, unit: it.price } })),
    ...o.shipments.filter((s) => (s.shipFee ?? 0) > 0).map((s) => ({ code: '—', desc: `هزینهٔ ارسال — ${s.method.replace(' (پیک)', '').replace('تحویل سریع', `تحویل ${fa(d.rules[0].value)} ساعته`)}`, qty: 1, unit: s.shipFee! }))]
  const gross = rows.reduce((a, r) => a + r.qty * r.unit, 0); const tax = vat ? Math.round(((gross - o.discount) * vat) / 100) : 0; const payable = gross - o.discount + tax
  const isLegal = !!legal
  const Th = ({ children, w }: { children: ReactNode; w?: string }) => <th className="border border-[#9aa0b4] bg-[#f1f2f7] p-[1.6mm] text-center font-bold" style={{ width: w }}>{children}</th>
  const Td = ({ children, l }: { children: ReactNode; l?: boolean }) => <td className={cx('border border-[#9aa0b4] p-[1.6mm]', l ? 'text-right' : 'tnum text-center')}>{children}</td>
  const Ph = ({ v }: { v: string }) => <span className="text-[#8a90a2]">[{v}]</span>
  return (
    <Sheet w="210mm" h="297mm" o={opts}>
      <div className="flex items-start justify-between gap-4">
        <div className="w-[34%]"><Logo h={56} /></div>
        <div className="flex-1 pt-3 text-center"><p className="text-[15pt] font-black">صورت‌حساب فروش کالا و خدمات</p><p className="mt-1 text-[9pt] text-[#5a5e78]">خریدار {isLegal ? 'حقوقی' : 'حقیقی'} · {seller.brand === 'غنیمت' ? 'فروشگاه اینترنتی غنیمت' : seller.brand}</p></div>
        <table className="w-[36%] border border-[#9aa0b4] text-[8.5pt]"><tbody>{[['شماره فاکتور', o.invoiceNo ? o.invoiceNo : <Ph v="شمارهٔ فاکتور" />], ['شمارهٔ منحصربه‌فرد مالیاتی', <Ph v="شمارهٔ سامانهٔ مودیان" />], ['تاریخ صدور', jd(o.createdAt)], ['شماره سفارش', <span className="ltr font-mono">{o.id}</span>], ['تاریخ تحویل', jd(o.deliveredAt)]].map(([k, v], i) => <tr key={i}><td className="px-[2mm] py-[1.2mm] text-[#5a5e78]">{k}:</td><td className="px-[2mm] py-[1.2mm] text-left font-bold">{v}</td></tr>)}</tbody></table>
      </div>
      <div className="mt-[4mm] flex border border-[#9aa0b4]">
        <div className="grid w-[22mm] shrink-0 place-items-center border-l border-[#9aa0b4] bg-[#f1f2f7] font-bold">فروشنده</div>
        <div className="flex-1 space-y-[1.2mm] p-[2.4mm] text-[8.5pt]"><p><b>فروشنده:</b> فروشگاه اینترنتی {seller.brand} — {seller.assumed ? <Ph v="نام حقوقی شرکت" /> : seller.legalName}&nbsp;&nbsp;&nbsp;<b>شناسهٔ ملی:</b> {seller.assumed ? <Ph v="شناسهٔ ملی" /> : fa(seller.nationalId)}&nbsp;&nbsp;&nbsp;<b>شمارهٔ ثبت:</b> {seller.assumed ? <Ph v="شمارهٔ ثبت" /> : fa(seller.regNo)}</p>
          <p><b>نشانی:</b> {seller.assumed ? <Ph v="نشانی قانونی شرکت" /> : seller.address}&nbsp;&nbsp;&nbsp;<b>تلفن:</b> {seller.assumed ? <Ph v="تلفن رسمی" /> : fa(seller.phone)}&nbsp;&nbsp;&nbsp;<b>کد پستی:</b> {seller.assumed ? <Ph v="کد پستی" /> : fa(seller.postalCode)}&nbsp;&nbsp;&nbsp;<b>کد اقتصادی:</b> {seller.assumed ? <Ph v="کد اقتصادی" /> : fa(seller.economicCode)}</p></div>
      </div>
      <div className="mt-[2.4mm] flex border border-[#9aa0b4]">
        <div className="grid w-[22mm] shrink-0 place-items-center border-l border-[#9aa0b4] bg-[#f1f2f7] font-bold">خریدار</div>
        {isLegal ? <div className="flex-1 space-y-[1.2mm] p-[2.4mm] text-[8.5pt]"><p><b>خریدار:</b> {legal!.name}&nbsp;&nbsp;&nbsp;<b>شناسهٔ ملی:</b> {fa(legal!.legal?.nationalId ?? '')}&nbsp;&nbsp;&nbsp;<b>شمارهٔ ثبت:</b> {fa(legal!.legal?.regNo ?? '')}&nbsp;&nbsp;&nbsp;<b>کد اقتصادی:</b> {fa(legal!.legal?.economicCode ?? '')}</p><p><b>نشانی قانونی:</b> {legal!.legal?.address}&nbsp;&nbsp;&nbsp;<b>کد پستی:</b> {fa(legal!.legal?.postalCode ?? '')}&nbsp;&nbsp;&nbsp;<b>تلفن:</b> {fa(legal!.legal?.phone ?? '')}</p><p><b>نمایندهٔ خریدار / تحویل‌گیرنده:</b> {legal!.legal?.rep ?? c.name}&nbsp;&nbsp;&nbsp;<b>موبایل:</b> {fa(legal!.legal?.repMobile ?? c.mobile)}</p></div>
          : <div className="flex-1 space-y-[1.2mm] p-[2.4mm] text-[8.5pt]"><p><b>خریدار:</b> {c.name}&nbsp;&nbsp;&nbsp;{show(opts, 'nid') && <><b>کد ملی:</b> <span className="ltr">{fa(c.nid.slice(0, 3))}•••••{fa(c.nid.slice(-2))}</span>&nbsp;&nbsp;&nbsp;</>}<b>موبایل:</b> {fa(c.mobile)}</p><p><b>نشانی:</b> {addrLine(c.addr)}&nbsp;&nbsp;&nbsp;<b>کد پستی:</b> {fa(c.addr?.postal ?? '')}</p></div>}
      </div>
      <table className="mt-[3mm] w-full table-fixed border-collapse text-[7.5pt]">
        <thead><tr><Th w="7mm">ردیف</Th><Th w="17mm">شناسهٔ کالا</Th><Th>شرح کالا یا خدمت</Th><Th w="9mm">تعداد</Th><Th w="17mm">مبلغ واحد (ریال)</Th><Th w="17mm">مبلغ کل (ریال)</Th><Th w="12mm">تخفیف (ریال)</Th><Th w="17mm">مبلغ پس از تخفیف (ریال)</Th><Th w="16mm">مالیات و عوارض ارزش افزوده (ریال)</Th><Th w="18mm">جمع کل (ریال)</Th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><Td>{fa(i + 1)}</Td><Td><span className="ltr font-mono text-[7.5pt]">{r.code}</span></Td><Td l>{r.desc}</Td><Td>{fa(r.qty)}</Td><Td>{rial(r.unit)}</Td><Td>{rial(r.unit * r.qty)}</Td><Td>{fa(0)}</Td><Td>{rial(r.unit * r.qty)}</Td><Td>{vat ? rial(Math.round((r.unit * r.qty * vat) / 100)) : <span className="text-[#8a90a2]">[طبق نرخ مصوب]</span>}</Td><Td>{rial(r.unit * r.qty + (vat ? Math.round((r.unit * r.qty * vat) / 100) : 0))}</Td></tr>)}</tbody>
      </table>
      <div className="mt-[3mm] grid grid-cols-[1.1fr_1fr] gap-[3mm] text-[8.5pt]">
        {show(opts, 'paymentInfo') && <div className="space-y-[1.6mm] border border-[#9aa0b4] p-[3mm]">{[['معادل', `${num(payable)} تومان`], ['روش پرداخت', /اسنپ|ترب|دیجی|تارا/.test(o.pay) ? `اقساطی — پرداخت با ${o.pay}` : o.pay.includes('کیف') ? `ترکیبی — ${o.pay}` : `نقدی — ${o.pay}`], ['وضعیت', o.status === 'order.delivered' ? 'پرداخت‌شده و تحویل‌شده' : 'پرداخت‌شده'], ['نوع صورت‌حساب', isLegal ? 'الکترونیکی — نوع اول (با مشخصات خریدار)' : 'الکترونیکی — نوع دوم (بدون مشخصات کامل خریدار)'], ['نوع خریدار', isLegal ? 'حقوقی' : 'حقیقی']].map(([k, v]) => <p key={k}><span className="text-[#5a5e78]">{k}:</span> <b>{v}</b></p>)}</div>}
        <table className="border-collapse self-start"><tbody>{[['جمع کل (ریال)', rial(gross)], ['تخفیف (ریال)', <span className="text-[#12733f]">-{rial(o.discount)}</span>], ['مالیات و عوارض ارزش افزوده (ریال)', vat ? rial(tax) : <span className="text-[#8a90a2]">[طبق نرخ مصوب]</span>], ['مبلغ قابل پرداخت با احتساب مالیات (ریال)', <b className="text-[11pt] text-[#0000ff]">{rial(payable)}</b>]].map(([k, v], i) => <tr key={i}><td className={cx('border border-[#9aa0b4] p-[2mm] text-center font-bold', i === 3 ? 'bg-[#eef0ff]' : 'bg-[#f1f2f7]')}>{k}</td><td className={cx('tnum border border-[#9aa0b4] p-[2mm] text-center font-bold', i === 3 && 'bg-[#eef0ff]')}>{v}</td></tr>)}</tbody></table>
      </div>
      <div className="mt-[3mm] grid min-h-[44mm] grid-cols-2 border border-[#9aa0b4] p-[3mm] text-[8.5pt]">
        <div><p>مهر و امضای فروشنده:</p><div className="mt-[2mm] flex items-center gap-3">{opts.seal && (seller.seal ? <img src={seller.seal} alt="مهر فروشنده" style={{ height: 100 }} /> : <DefaultStamp />)}{seller.signature && <img src={seller.signature} alt="امضا" style={{ height: 60 }} />}</div></div>
        <div><p>مهر و امضای خریدار{isLegal ? ' (شرکت)' : ''}:</p></div>
      </div>
      {opts.footer && <p className="mt-[2mm] text-center text-[7.5pt] text-[#5a5e78]">{opts.footer}</p>}
    </Sheet>
  )
}

/** ۲) برچسب مرسولهٔ پستی — مطابق قالب استاندارد نشانی‌نویسی پست، با لوگوی غنیمت و شرکت حمل */
export function PostLabel({ o, s, opts, paper }: { o: Order; s: Shipment; opts: DocOpts; paper: string }) {
  const { d, c } = useParties(o); const w = d.warehouses.find((x) => x.id === s.warehouse)!
  const carrier = /تیپاکس/.test(s.method) ? 'tipax' : 'post'; const logo = d.carrierLogos[carrier]
  const idx = o.shipments.findIndex((x) => x.id === s.id) + 1
  const weight = s.items.reduce((a, it) => a + (d.products.find((p) => p.id === it.productId)?.weight || 450) * it.qty, 0)
  const size = paper === 'A5' ? { w: '148mm', h: '210mm' } : paper === '100x150' ? { w: '100mm', h: '150mm' } : { w: '105mm', h: '148mm' }
  const a = c.addr
  const L = ({ k, v }: { k: string; v: ReactNode }) => <p className="flex gap-[1.4mm] border-b border-dotted border-black/60 pb-[0.8mm] leading-snug"><span className="shrink-0 font-bold">{k}:</span><span className="min-w-0">{v}</span></p>
  return (
    <Sheet w={size.w} h={size.h} o={{ ...opts, margin: Math.min(opts.margin, 5) }}>
      <div className="flex h-full flex-col rounded-[3mm] border-[0.9mm] border-double border-black p-[2.4mm]" style={{ minHeight: `calc(${size.h} - ${Math.min(opts.margin, 5) * 2}mm)` }}>
        <div className="flex items-center justify-between border-b border-black pb-[1.6mm]">
          <Logo h={26} />
          {show(opts, 'carrierLogo') && (logo ? <img src={logo} alt="لوگوی شرکت حمل" style={{ height: 30 }} /> : <span className="grid h-[11mm] w-[24mm] place-items-center border border-dashed border-black text-center text-[6.5pt] leading-tight">لوگوی شرکت حمل<br />(از تنظیمات بارگذاری کنید)</span>)}
        </div>
        <div className="mt-[2mm] space-y-[1.2mm] text-[7.5pt]">
          <p className="text-[8pt] font-black">نشانی فرستنده — FROM</p>
          <L k="فرستنده" v={`${d.seller.brand} · ${w.name}`} />
          <L k="نشانی" v={`${w.province}، ${w.city}، ${w.district}، ${w.street}، ${w.alley}، پلاک ${fa(w.plaque)}`} />
          <div className="flex items-center justify-between gap-2"><span>مبدأ: <b>{w.city}</b> · تلفن: <span className="ltr">{fa(w.phone)}</span></span><span className="flex items-center gap-1"><b>کد پستی:</b><Boxes v={w.postalCode} size={3.6} /></span></div>
        </div>
        <div className="mt-[2.4mm] flex-1 space-y-[1.4mm] rounded-[2mm] border-[0.5mm] border-black p-[2.4mm] text-[8.5pt]">
          <p className="text-[9pt] font-black">نشانی گیرنده — TO</p>
          <p className="text-[12pt] font-black">{o.buyer === 'legal' ? `${d.customers.find((x) => x.id === o.legalId)?.name} · ${c.name}` : c.name}</p>
          <L k="استان و شهر" v={<b>{a?.province}، {a?.city}</b>} />
          <L k="منطقه / محله" v={a?.district} />
          <L k="خیابان" v={[a?.street, a?.sub].filter(Boolean).join('، ')} />
          <L k="کوچه، پلاک، طبقه، واحد" v={[a?.alley, a?.plaque && `پلاک ${a.plaque}`, a?.floor && `طبقهٔ ${a.floor}`, a?.unit && `واحد ${a.unit}`].filter(Boolean).join('، ')} />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-[0.6mm]"><span>مقصد: <b>{a?.city}</b> · موبایل: <b className="ltr">{fa(c.mobile)}</b></span><span className="flex items-center gap-1"><b>کد پستی:</b><Boxes v={a?.postal ?? ''} size={4.4} /></span></div>
        </div>
        <div className="mt-[2mm] grid grid-cols-2 gap-x-2 gap-y-[0.6mm] text-[7pt]">
          <span>سفارش: <b className="ltr font-mono">{o.id}</b></span><span>مرسوله: <b className="ltr font-mono">{s.id}</b></span>
          <span>سرویس: <b>{s.method}</b></span><span>بسته: <b>{fa(idx)} از {fa(o.shipments.length)}</b> · وزن: <b>{fa(weight)} گرم</b></span>
          {show(opts, 'contents') && <span>محتوا: <b>کالای الکترونیک</b></span>}<span>تاریخ: <b>{jd(new Date().toISOString())}</b></span>
          {show(opts, 'fragile') && <span className="col-span-2 mt-[0.6mm] w-fit border border-black px-[1.6mm] font-black">⚠ شکستنی — با احتیاط حمل شود</span>}
        </div>
        {show(opts, 'barcode') && <div className="mt-[1.6mm] grid gap-[1mm]"><Barcode value={s.id} height={26} module={1.3} className="h-[11mm] w-full" />{s.tracking && <Barcode value={s.tracking} height={26} module={1} className="h-[11mm] w-full" />}</div>}
      </div>
    </Sheet>
  )
}

/** ۳) برچسب مرسولهٔ پیک */
export function CourierLabel({ o, s, opts }: { o: Order; s: Shipment; opts: DocOpts }) {
  const { c } = useParties(o); const code = String(1000 + (parseInt(s.id.replace(/\D/g, '').slice(-4)) % 9000))
  return (
    <Sheet w="100mm" h="100mm" o={{ ...opts, margin: 4 }}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2"><Logo h={24} /><b className="text-[11pt]">{s.method}</b></div>
      <p className="mt-2 text-[13pt] font-black">{c.name}</p><p className="text-[9pt]">موبایل: <b className="ltr">{fa(c.mobile)}</b></p>
      <p className="mt-1 text-[9pt] leading-6">{addrLine(c.addr)}</p>
      <div className="mt-2 flex items-end justify-between"><div className="text-[8.5pt]"><p>سفارش <b className="ltr font-mono">{o.id}</b></p><p>بازهٔ تحویل: <b>امروز تا {new Date(s.sla).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</b></p><p className="mt-1">کد تأیید تحویل: <b className="text-[14pt] tracking-widest">{fa(code)}</b></p></div><QR value={`https://ghanimat.example/deliver/${s.id}/${code}`} size={84} /></div>
      <Barcode value={s.id} height={26} module={1.4} className="mt-2 h-[10mm] w-full" />
    </Sheet>
  )
}

/** ۴) کارت گارانتی — هم‌سبک کارت‌های گارانتی پنل مشتری: زمینهٔ تیره، عدد بزرگ مدت، نشان «گارانتی رسمی» */
export function WarrantyCard({ unitId, opts, bw }: { unitId: string; opts: DocOpts; bw?: boolean }) {
  const d = useDB(); const u = d.units.find((x) => x.id === unitId); const p = u ? d.products.find((x) => x.id === u.productId) : undefined
  if (!u || !p) return <p className="text-13 text-danger">واحدی برای کارت گارانتی انتخاب نشده است.</p>
  const order = d.orders.find((o) => o.shipments.some((s) => s.items.some((i) => i.unitId === u.id)))
  const start = order?.deliveredAt ?? order?.createdAt ?? new Date().toISOString(); const months = u.warrantyMonths ?? p.warrantyMonths ?? 6
  const end = new Date(new Date(start).getTime() + months * 30.4 * 864e5).toISOString()
  const wcode = d.warranties.find((w) => w.unitId === u.id)?.code ?? `GW-${u.id.replace(/\D/g, '').padStart(6, '8')}`
  const dark = !bw
  const card = (children: ReactNode) => <div className={cx('relative overflow-hidden rounded-[3.2mm]', dark ? 'bg-[#10123d] text-white' : 'border-[0.4mm] border-black bg-white text-black')} style={{ width: '85.6mm', height: '54mm', padding: '4mm', fontFamily: 'Vazirmatn' }}>{children}</div>
  return (
    <div className="flex flex-wrap justify-center gap-[6mm]">
      {card(<>
        {dark && <div className="pointer-events-none absolute -top-10 -left-10 size-40 rounded-full bg-[#0000ff] opacity-40 blur-2xl" />}
        <div className="relative flex items-start justify-between">
          <div><p className="text-[7pt] opacity-80">کارت گارانتی</p><p className="text-[10pt] font-black">{d.seller.brand}</p></div>
          <span className={cx('rounded-full px-[2.4mm] py-[0.6mm] text-[6.5pt] font-bold', dark ? 'bg-[#0000ff] text-white' : 'border border-black')}>گارانتی رسمی</span>
        </div>
        <div className="relative mt-[2mm] flex items-end gap-[3mm]">
          <div className="leading-none"><span className="text-[30pt] font-black">{fa(months)}</span><span className="mr-1 text-[9pt] font-bold">ماه</span></div>
          <div className="min-w-0 flex-1 pb-1 text-[6.8pt] leading-[1.45]"><p className="truncate text-[7.5pt] font-bold">{p.title}</p><p className="truncate opacity-85">{[u.color, CONDITION[u.condition], `گرید ${u.grade}‎`].join(' · ')}</p><p className="truncate opacity-85">سریال: <span className="ltr font-mono">{u.serial}</span></p></div>
        </div>
        <div className="relative mt-[1.6mm] flex items-end justify-between text-[6.5pt]">
          <div className="space-y-[0.4mm]"><p>کد کالا: <b className="ltr font-mono">{u.code ?? p.code}</b></p><p>کد گارانتی: <b className="ltr font-mono">{wcode}</b></p><p>از {jd(start)} تا {jd(end)}</p></div>
          <div className="rounded-[1mm] bg-white p-[0.8mm]"><QR value={`https://ghanimat.example/warranty/${wcode}`} size={50} /></div>
        </div>
      </>)}
      {card(<div className="flex h-full flex-col text-[6.6pt] leading-[1.55]">
        <p className="mb-[1mm] text-[8pt] font-black">شرایط گارانتی</p>
        <p className="opacity-90">{p.warrantyTerms ?? 'تعمیر یا تعویض در صورت ایراد فنی؛ آسیب فیزیکی، آب‌خوردگی و باز کردن دستگاه شامل نمی‌شود.'}</p>
        <p className="mt-[1mm] opacity-90">برای استعلام، QR روی کارت را اسکن کنید یا کد گارانتی را در «پنل کاربری › گارانتی‌ها» وارد کنید.</p>
        <div className="mt-auto flex items-end justify-between"><Barcode value={u.code ?? p.code ?? u.id} height={20} module={1} showText={false} className="h-[8mm] w-[46mm] rounded-[0.6mm]" /><span className="text-[6pt] opacity-80">{d.seller.website}</span></div>
      </div>)}
    </div>
  )
}

/** ۵) برگهٔ کنترل کیفیت (داخل بسته) */
export function QCSheet({ unitId, opts }: { unitId: string; opts: DocOpts }) {
  const d = useDB(); const u = d.units.find((x) => x.id === unitId); const p = u && d.products.find((x) => x.id === u.productId)
  if (!u || !p) return <p className="text-13 text-danger">واحدی انتخاب نشده است.</p>
  const items = ['روشن‌شدن و بوت', 'نمایشگر و لمس', 'سلامت باتری', 'دوربین و میکروفون', 'اتصال‌ها', 'تطبیق سریال با جعبه', 'اقلام داخل جعبه']
  return (
    <Sheet w="148mm" h="210mm" o={opts}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2"><Logo h={30} /><div className="text-left"><p className="font-black">برگهٔ کنترل کیفیت</p><p className="ltr font-mono text-[8pt]">{u.code}</p></div></div>
      {p.image && <img src={p.image} alt="" className="float-left mt-3 h-[26mm] w-[26mm] rounded object-cover" />}
      <p className="mt-3 text-[11pt] font-bold">{p.title}</p><p className="text-[9pt]">سریال: <span className="ltr font-mono">{u.serial}</span> · {u.color} · {CONDITION[u.condition]}</p>
      <p className="mt-2 text-[9pt]">گرید ظاهری: <b className="text-[14pt]">{u.grade}{'‎'}</b></p>
      <table className="mt-3 w-full border-collapse text-[9pt]"><tbody>{items.map((it) => <tr key={it}><td className="border border-black p-[1.6mm]">{it}</td><td className="w-[22mm] border border-black p-[1.6mm] text-center font-bold">✓ سالم</td></tr>)}</tbody></table>
      <p className="mt-3 text-[9pt]"><b>ایرادهای ظاهری:</b> {u.flaws.length ? u.flaws.join('، ') : 'ندارد'}</p>
      <div className="mt-6 flex items-end justify-between text-[9pt]"><div><p>بازرس مرحلهٔ دوم (انبار تهران): هستی</p><p className="mt-6">امضا: ............................</p></div><QR value={`https://ghanimat.example/u/${u.code}`} size={80} /></div>
    </Sheet>
  )
}

/** ۶) لیست جمع‌آوری (مرتب بر اساس قفسه) */
export function PickList({ ships, opts }: { ships: (Shipment & { order: Order })[]; opts: DocOpts }) {
  const d = useDB()
  const rows = ships.flatMap((s) => s.items.map((it) => ({ s, it, u: d.units.find((x) => x.id === it.unitId), p: d.products.find((x) => x.id === it.productId)! }))).sort((a, b) => (a.u?.shelf ?? 'Z').localeCompare(b.u?.shelf ?? 'Z'))
  return (
    <Sheet w="210mm" h="297mm" o={opts}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2"><Logo h={30} /><div className="text-left"><p className="font-black">لیست جمع‌آوری</p><p className="text-[8pt]">{jd(new Date().toISOString())} · {fa(rows.length)} قلم</p></div></div>
      <table className="mt-3 w-full border-collapse text-[9pt]"><thead><tr className="bg-[#f1f2f7]">{['✓', 'قفسه', 'تصویر', 'کالا', 'کد واحد', 'تعداد', 'مرسوله'].map((h) => <th key={h} className="border border-black p-[1.6mm]">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td className="w-[8mm] border border-black text-center">☐</td><td className="ltr border border-black p-[1.6mm] text-center font-mono font-bold">{r.u?.shelf ?? 'تعدادی'}</td><td className="w-[14mm] border border-black p-[1mm]">{r.p.image && <img src={r.p.image} alt="" className="h-[11mm] w-[11mm] rounded object-cover" />}</td><td className="border border-black p-[1.6mm]">{r.p.title}<br /><span className="text-[7.5pt]">{r.u ? `${r.u.color} · ${CONDITION[r.u.condition]}` : ''}</span></td><td className="border border-black p-[1mm]"><Barcode value={r.u?.code ?? r.p.code ?? r.p.id} height={22} module={0.9} className="h-[9mm] w-[34mm]" /></td><td className="border border-black text-center font-bold">{fa(r.it.qty)}</td><td className="ltr border border-black p-[1.6mm] text-center font-mono text-[8pt]">{r.s.id}</td></tr>)}</tbody></table>
      {!rows.length && <p className="mt-6 text-center">مرسولهٔ منتظر جمع‌آوری نیست.</p>}
    </Sheet>
  )
}

/** ۷) مانیفست تحویل گروهی به پست یا تیپاکس */
export function Manifest({ ships, opts }: { ships: (Shipment & { order: Order })[]; opts: DocOpts }) {
  const d = useDB()
  return (
    <Sheet w="210mm" h="297mm" o={opts}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2"><Logo h={30} /><div className="text-left"><p className="font-black">بارنامهٔ تحویل گروهی (مانیفست)</p><p className="text-[8pt]">{jd(new Date().toISOString())} · {fa(ships.length)} مرسوله</p></div></div>
      <table className="mt-3 w-full border-collapse text-[8.5pt]"><thead><tr className="bg-[#f1f2f7]">{['ردیف', 'مرسوله', 'گیرنده', 'شهر مقصد', 'کد پستی', 'سرویس', 'کد رهگیری'].map((h) => <th key={h} className="border border-black p-[1.6mm]">{h}</th>)}</tr></thead>
        <tbody>{ships.map((s, i) => { const c = d.customers.find((x) => x.id === s.order.customerId)!; return <tr key={s.id}><td className="border border-black text-center">{fa(i + 1)}</td><td className="ltr border border-black p-[1.6mm] text-center font-mono">{s.id}</td><td className="border border-black p-[1.6mm]">{c.name}</td><td className="border border-black p-[1.6mm]">{c.addr?.city}</td><td className="ltr border border-black p-[1.6mm] text-center font-mono">{c.addr?.postal}</td><td className="border border-black p-[1.6mm]">{s.method}</td><td className="ltr border border-black p-[1.6mm] text-center font-mono text-[7.5pt]">{s.tracking || '—'}</td></tr> })}</tbody></table>
      <div className="mt-10 grid grid-cols-2 text-[9pt]"><p>تحویل‌دهنده (انبار): ............................</p><p>تحویل‌گیرنده (مأمور پست): ............................</p></div>
    </Sheet>
  )
}

/** ۸) برچسب و فرم مرجوعی */
export function ReturnForm({ retId, opts }: { retId: string; opts: DocOpts }) {
  const d = useDB(); const r = d.returns.find((x) => x.id === retId)
  if (!r) return <p className="text-13 text-danger">مرجوعی‌ای انتخاب نشده است.</p>
  const c = d.customers.find((x) => x.id === r.customerId)!; const w = d.warehouses[0]; const u = d.units.find((x) => x.id === r.unitId); const p = u && d.products.find((x) => x.id === u.productId)
  return (
    <Sheet w="148mm" h="210mm" o={opts}>
      <div className="flex items-center justify-between border-b-2 border-black pb-2"><Logo h={28} /><div className="text-left"><p className="font-black">فرم و برچسب مرجوعی</p><p className="ltr font-mono text-[9pt]">{r.id}</p></div></div>
      <div className="mt-3 rounded border-2 border-black p-3 text-[9pt]"><p className="font-black">ارسال به: {w.name} — واحد مرجوعی</p><p>{w.province}، {w.city}، {w.district}، {w.street}، {w.alley}، پلاک {fa(w.plaque)}</p><p className="mt-1 flex items-center gap-1">کد پستی: <Boxes v={w.postalCode} size={4} /></p></div>
      <div className="mt-3 text-[9pt]"><p>فرستنده: <b>{c.name}</b> · موبایل {fa(c.mobile)}</p><p>{addrLine(c.addr)}</p><p className="mt-2">کالا: <b>{p?.title ?? 'موجودی تعدادی'}</b>{u && <> · کد <span className="ltr font-mono">{u.code}</span> · سریال <span className="ltr font-mono">{u.serial}</span></>}</p><p>دلیل: {r.reason}</p><p>سفارش: <span className="ltr font-mono">{r.orderId}</span></p></div>
      <ol className="mt-3 list-decimal space-y-1 pr-5 text-[8.5pt]"><li>کالا را با همهٔ متعلقات، برگهٔ کنترل کیفیت و کارت گارانتی در جعبهٔ اصلی بگذارید.</li><li>این برگه را روی بسته بچسبانید.</li><li>بسته را به پست تحویل دهید و کد رهگیری را در پنل کاربری ثبت کنید.</li></ol>
      <div className="mt-4 flex items-center justify-between"><Barcode value={r.id} height={30} module={1.4} className="h-[12mm] w-[70mm]" /><QR value={`https://ghanimat.example/return/${r.id}`} size={76} /></div>
    </Sheet>
  )
}

/** ۹) رسید دریافت حضوری */
export function PickupReceipt({ o, opts }: { o: Order; opts: DocOpts }) {
  const { d, c } = useParties(o)
  return (
    <Sheet w="80mm" o={{ ...opts, margin: 4 }}>
      <div className="text-center"><Logo h={26} /><p className="mt-1 font-black">رسید دریافت حضوری</p><p className="text-[8pt]">{jd(new Date().toISOString())}</p></div>
      <div className="mt-2 border-y border-dashed border-black py-2 text-[8.5pt]"><p>سفارش: <b className="ltr font-mono">{o.id}</b></p><p>تحویل‌گیرنده: <b>{c.name}</b></p>{o.shipments.flatMap((s) => s.items).map((it, i) => <p key={i}>• {d.products.find((p) => p.id === it.productId)?.title} × {fa(it.qty)}</p>)}</div>
      <p className="mt-2 text-[8.5pt]">کالا را سالم و کامل تحویل گرفتم.</p><p className="mt-6 text-[8.5pt]">امضای مشتری: ......................</p>
      <Barcode value={o.id} height={24} module={1.2} className="mt-3 h-[9mm] w-full" />
    </Sheet>
  )
}
