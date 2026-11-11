import { useState, type ChangeEvent } from 'react'
import { ImageUp, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Field, Input } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { mutate, snapshot, useDB } from '@/shared/lib/store'
import { makeSeed } from '@/shared/data/seed'

type Seller = ReturnType<typeof makeSeed>['seller']
type WH = ReturnType<typeof makeSeed>['warehouses'][number]
const MAX_IMG = 400 * 1024

/** بارگذاری تصویر (مهر، امضا، لوگوی شرکت حمل) به‌صورت داده در همین مرورگر */
function ImageSlot({ label, help, value, onChange }: { label: string; help: string; value: string; onChange: (v: string) => void }) {
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return toast('این فایل تصویر نیست. PNG، JPG، WebP یا SVG بارگذاری کنید.', { tone: 'err' })
    if (f.size > MAX_IMG) return toast('حجم تصویر بیشتر از ۴۰۰ کیلوبایت است. نسخهٔ کوچک‌تر بارگذاری کنید.', { tone: 'err' })
    const r = new FileReader(); r.onload = () => onChange(String(r.result)); r.readAsDataURL(f)
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line p-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-dashed border-line bg-surface-2">
        {value ? <img src={value} alt={label} className="size-full object-contain" /> : <ImageUp size={20} className="text-t3" />}
      </div>
      <div className="min-w-0 flex-1"><p className="text-13 font-medium">{label}</p><p className="text-11 text-t3">{help}</p></div>
      <label className="btn inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-line bg-surface px-3 text-12 font-medium hover:bg-surface-2">
        <ImageUp size={13} />{value ? 'جایگزینی' : 'بارگذاری'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={pick} />
      </label>
      {value && <Button size="sm" variant="ghost" aria-label={`حذف ${label}`} icon={<Trash2 size={13} />} onClick={() => onChange('')} />}
    </div>
  )
}

export function SellerSettings() {
  const d = useDB()
  const [seller, setSeller] = useState<Seller>(d.seller)
  const [whs, setWhs] = useState<WH[]>(d.warehouses)
  const dirty = JSON.stringify(seller) !== JSON.stringify(d.seller) || JSON.stringify(whs) !== JSON.stringify(d.warehouses)
  const save = () => {
    if (!/^\d{10}$/.test(seller.postalCode) || whs.some((w) => !/^\d{10}$/.test(w.postalCode))) return toast('کد پستی باید ۱۰ رقم انگلیسی باشد. خانه‌های قرمز را اصلاح کنید.', { tone: 'err' })
    const undo = snapshot()
    mutate((x) => { x.seller = { ...seller, assumed: false }; x.warehouses = whs.map((w) => ({ ...w, assumed: false })) }, { action: 'ویرایش اطلاعات فروشنده و انبارها', target: 'تنظیمات' })
    setSeller({ ...seller, assumed: false }); setWhs(whs.map((w) => ({ ...w, assumed: false })))
    toast('اطلاعات فروشنده و انبارها ذخیره شد. فاکتورها و برچسب‌ها از همین حالا با این اطلاعات چاپ می‌شوند.', { undo })
  }
  const S = (k: keyof Seller, label: string, opt: { ltr?: boolean; help?: string; wide?: boolean } = {}) => (
    <div className={opt.wide ? 'sm:col-span-2' : ''}>
      <Field label={label} help={opt.help} error={k === 'postalCode' && !/^\d{10}$/.test(String(seller[k])) ? 'کد پستی ۱۰ رقم است.' : undefined}>
        <Input className={opt.ltr ? 'ltr text-left font-mono' : ''} value={String(seller[k])} onChange={(e) => setSeller({ ...seller, [k]: e.target.value })} />
      </Field>
    </div>
  )
  const W = (i: number, k: keyof WH, label: string, ltr?: boolean) => (
    <Field label={label} error={k === 'postalCode' && !/^\d{10}$/.test(String(whs[i][k])) ? 'کد پستی ۱۰ رقم است.' : undefined}>
      <Input className={ltr ? 'ltr text-left font-mono' : ''} value={String(whs[i][k])} onChange={(e) => setWhs(whs.map((w, j) => (j === i ? { ...w, [k]: e.target.value } : w)))} />
    </Field>
  )
  return (
    <div className="max-w-4xl space-y-4 pb-20">
      {d.seller.assumed && <p className="rounded-md bg-warning-bg px-3 py-2 text-12 text-warning">مقدارهای این صفحه فرضی‌اند. پیش از چاپ فاکتور رسمی، اطلاعات واقعی شرکت را وارد و ذخیره کنید.</p>}
      <Card title={<>اطلاعات فروشنده{d.seller.assumed && <Badge tone="warning" dot={false}>فرضی</Badge>}</>} actions={<span className="text-11 text-t3">در فاکتور، کارت گارانتی و نامه‌ها چاپ می‌شود</span>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {S('legalName', 'نام حقوقی', { wide: true })}{S('brand', 'نام تجاری')}{S('website', 'وب‌سایت', { ltr: true })}
          {S('nationalId', 'شناسهٔ ملی', { ltr: true })}{S('regNo', 'شمارهٔ ثبت', { ltr: true })}{S('economicCode', 'کد اقتصادی', { ltr: true })}{S('phone', 'تلفن', { ltr: true })}
          {S('address', 'نشانی قانونی', { wide: true })}{S('postalCode', 'کد پستی', { ltr: true, help: '۱۰ رقم، بدون خط تیره' })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ImageSlot label="تصویر مهر فروشنده" help="پایین فاکتور، کنار امضا · PNG با پس‌زمینهٔ شفاف" value={seller.seal} onChange={(v) => setSeller({ ...seller, seal: v })} />
          <ImageSlot label="تصویر امضا" help="پایین فاکتور · PNG با پس‌زمینهٔ شفاف" value={seller.signature} onChange={(v) => setSeller({ ...seller, signature: v })} />
        </div>
      </Card>
      {whs.map((w, i) => (
        <Card key={w.id} title={<>{w.name}{d.warehouses[i]?.assumed && <Badge tone="warning" dot={false}>فرضی</Badge>}</>} actions={<span className="text-11 text-t3">نشانی فرستنده روی برچسب پستی مرسوله‌های این انبار</span>}>
          <div className="grid gap-4 sm:grid-cols-3">
            {W(i, 'name', 'نام انبار')}{W(i, 'owner', 'مالک')}{W(i, 'manager', 'مسئول')}
            {W(i, 'province', 'استان')}{W(i, 'city', 'شهر')}{W(i, 'district', 'منطقه یا محله')}
            {W(i, 'street', 'خیابان')}{W(i, 'alley', 'کوچه')}{W(i, 'plaque', 'پلاک')}
            {W(i, 'postalCode', 'کد پستی', true)}{W(i, 'phone', 'تلفن', true)}{W(i, 'services', 'خدمات')}
          </div>
        </Card>
      ))}
      <Card title="لوگوی شرکت‌های حمل" actions={<span className="text-11 text-t3">کنار لوگوی غنیمت، بالای برچسب مرسوله</span>}>
        <p className="mb-3 text-12 text-t2">لوگوی رسمی هر شرکت را خودتان بارگذاری کنید. تا بارگذاری، روی برچسب یک کادر خالی با عنوان «لوگوی شرکت حمل» چاپ می‌شود.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([['post', 'ادارهٔ پست'], ['tipax', 'تیپاکس']] as const).map(([k, l]) => (
            <ImageSlot key={k} label={`لوگوی ${l}`} help="PNG یا SVG، حداکثر ۴۰۰ کیلوبایت" value={d.carrierLogos[k] ?? ''} onChange={(v) => { mutate((x) => { x.carrierLogos[k] = v }, { action: v ? 'بارگذاری لوگوی شرکت حمل' : 'حذف لوگوی شرکت حمل', target: l }); toast(v ? `لوگوی ${l} ذخیره شد.` : `لوگوی ${l} حذف شد.`) }} />
          ))}
        </div>
      </Card>
      {dirty && (
        <div className="no-print anim-pop fixed inset-x-0 bottom-20 z-30 mx-auto flex w-fit items-center gap-3 rounded-lg bg-[#10123d] px-4 py-2 text-12 text-white shadow-float lg:bottom-6">
          تغییرهای ذخیره‌نشده
          <Button size="sm" variant="primary" onClick={save}>ذخیرهٔ اطلاعات فروشنده و انبارها</Button>
          <button className="flex items-center gap-1 text-white/80 hover:text-white" onClick={() => { setSeller(d.seller); setWhs(d.warehouses) }}><RotateCcw size={12} />دور ریختن</button>
        </div>
      )}
    </div>
  )
}
