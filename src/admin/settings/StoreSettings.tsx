import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera as Instagram, Crown, Globe, ImageUp, Info, MapPin, Phone, Send, ShieldAlert, ShoppingCart, Wallet } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Textarea, Toggle } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa, num, pct, toman } from '@/shared/lib/fa'
import { tierOf, type StoreCfg } from '@/shared/data/storeCfg'

type Part = 'identity' | 'media' | 'social' | 'loyalty' | 'checkout'

/** پیش‌نویس محلی + نوار شناور «لغو / ذخیرهٔ تغییرات» */
function useDraft<K extends Part>(k: K) {
  const d = useDB(); const saved = d.storeCfg[k] as StoreCfg[K]
  const [v, setV] = useState<StoreCfg[K]>(() => structuredClone(saved))
  useEffect(() => { setV(structuredClone(saved)) }, [saved])
  const dirty = JSON.stringify(v) !== JSON.stringify(saved)
  const set = (patch: Partial<StoreCfg[K]>) => setV((p) => ({ ...p, ...patch }))
  return { v, set, setV, dirty, reset: () => setV(structuredClone(saved)), save: (label: string) => { mutate((x) => { (x.storeCfg as StoreCfg)[k] = structuredClone(v) }, { action: `ذخیرهٔ ${label}`, target: 'تنظیمات فروشگاه' }); toast(`${label} ذخیره شد.`) } }
}

function SaveBar({ dirty, onSave, onCancel }: { dirty: boolean; onSave: () => void; onCancel: () => void }) {
  if (!dirty) return null
  return <div className="sticky bottom-3 z-20 mt-4 flex w-fit items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg"><span className="px-2 text-12 text-t2">تغییرات ذخیره نشده است.</span><Button variant="ghost" onClick={onCancel}>لغو</Button><Button variant="primary" onClick={onSave}>ذخیرهٔ تغییرات</Button></div>
}

const Sec = ({ title, sub, children }: { title: ReactNode; sub?: string; children: ReactNode }) => <Card title={title}>{sub && <p className="-mt-1 mb-3 text-12 text-t2">{sub}</p>}{children}</Card>

function ImgSlot({ label, help, src, dark, onPick }: { label: string; help: string; src: string; dark?: boolean; onPick: (s: string) => void }) {
  return (
    <label className={cx('lift flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3', dark ? 'bg-[#10123d] text-white' : 'bg-surface-2')}>
      <img src={src} alt={label} className="size-14 rounded-xl bg-white/90 object-contain p-1" />
      <span className="min-w-0 flex-1"><b className="block text-13">{label}</b><span className={cx('block text-11', dark ? 'text-white/70' : 'text-t2')}>{help}</span></span>
      <span className={cx('flex items-center gap-1 text-12', dark ? 'text-white' : 'text-brand')}><ImageUp size={14} />انتخاب</span>
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onPick(await fileToImage(f, 400)) }} />
    </label>
  )
}

// ───────── فروشگاه و برند ─────────
export function StoreIdentity() {
  const id = useDraft('identity'); const md = useDraft('media'); const so = useDraft('social')
  const dirty = id.dirty || md.dirty || so.dirty
  const wm = md.v.watermark; const setWm = (p: Partial<typeof wm>) => md.set({ watermark: { ...wm, ...p } })
  const SOC: [string, string, string][] = [['instagram', 'اینستاگرام', 'https://instagram.com/…'], ['telegram', 'تلگرام', 'https://t.me/…'], ['bale', 'بله', 'https://ble.ir/…'], ['eitaa', 'ایتا', 'https://eitaa.com/…'], ['rubika', 'روبیکا', 'https://rubika.ir/…'], ['whatsapp', 'واتس‌اپ', 'https://wa.me/98…'], ['aparat', 'آپارات', 'https://aparat.com/…'], ['linkedin', 'لینکدین', 'https://linkedin.com/company/…']]
  const pos = ['بالا راست', 'بالا چپ', 'وسط', 'پایین راست', 'پایین چپ']
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Sec title="اطلاعات اصلی فروشگاه" sub="این متن‌ها در سربرگ، فوتر، فاکتور، پیامک‌ها و نتیجهٔ گوگل استفاده می‌شوند.">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="نام کامل فروشگاه"><Input value={id.v.full} onChange={(e) => id.set({ full: e.target.value })} /></Field>
            <Field label="نام کوتاه" help="در پیامک‌ها و عنوان تب مرورگر."><Input value={id.v.short} onChange={(e) => id.set({ short: e.target.value })} /></Field>
            <Field label="عنوان H1 صفحهٔ خانه"><Input value={id.v.h1} onChange={(e) => id.set({ h1: e.target.value })} /></Field>
          </div>
          <Field label="توضیح کوتاه فروشگاه" help={`${fa(id.v.desc.length)} نویسه · برای نتیجهٔ گوگل ۱۲۰ تا ۱۶۰ نویسه بهتر است.`}><Textarea rows={3} value={id.v.desc} onChange={(e) => id.set({ desc: e.target.value })} /></Field>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="ساعت پاسخ‌گویی"><Input value={id.v.hours} onChange={(e) => id.set({ hours: e.target.value })} /></Field>
            <Field label="تلفن پشتیبانی"><Input className="ltr text-left" value={id.v.phone} onChange={(e) => id.set({ phone: e.target.value })} /></Field>
            <Field label="ایمیل پشتیبانی"><Input className="ltr text-left" value={id.v.email} onChange={(e) => id.set({ email: e.target.value })} /></Field>
          </div>
          <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-13 font-semibold"><MapPin size={14} />آدرس دفتر مرکزی</h3>
          <Field label="آدرس کامل"><Input value={id.v.address} onChange={(e) => id.set({ address: e.target.value })} /></Field>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="استان"><Input value={id.v.province} onChange={(e) => id.set({ province: e.target.value })} /></Field>
            <Field label="شهر"><Input value={id.v.city} onChange={(e) => id.set({ city: e.target.value })} /></Field>
            <Field label="کد پستی" error={id.v.postal && !/^\d{10}$/.test(id.v.postal) ? 'کد پستی باید ۱۰ رقم باشد.' : undefined}><Input className="ltr text-left" value={id.v.postal} onChange={(e) => id.set({ postal: e.target.value.replace(/\D/g, '') })} /></Field>
          </div>
        </Sec>
        <Card title="پیش‌نمایش در نتیجهٔ گوگل">
          <div className="rounded-2xl border border-line bg-white p-4 text-right text-[#202124]">
            <p className="flex items-center gap-2 text-12"><img src={md.v.favicon} alt="" className="size-6 rounded-full border border-[#e6e8f0] object-contain p-0.5" /><span><b className="block text-[13px]">{id.v.short}</b><span className="ltr block text-[11px] text-[#4d5156]">https://ghanimat.example</span></span></p>
            <p className="mt-2 text-[18px] leading-6 text-[#1a0dab]">{id.v.full} | {id.v.h1}</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#4d5156]">{id.v.desc}</p>
          </div>
          <div className="mt-4 space-y-1.5 text-12 text-t2"><p className="flex items-center gap-1.5"><Phone size={13} />{id.v.phone} · {id.v.hours}</p><p className="flex items-center gap-1.5"><Send size={13} />{id.v.email}</p></div>
        </Card>
      </div>

      <Sec title="لوگو، فاوآیکن و واترمارک" sub="لوگو با پس‌زمینهٔ شفاف و نسبت ۲ به ۱. واترمارک فقط روی عکس‌های واقعی واحدها زده می‌شود تا عکس‌ها در کانال‌های دیگر بی‌نام استفاده نشوند.">
        <div className="grid gap-3 md:grid-cols-3">
          <ImgSlot label="لوگو" help="سربرگ سایت، فاکتور و برچسب" src={md.v.logo} onPick={(s) => md.set({ logo: s })} />
          <ImgSlot dark label="لوگوی حالت تیره" help="برای سایت در حالت تیره" src={md.v.logoDark} onPick={(s) => md.set({ logoDark: s })} />
          <ImgSlot label="فاوآیکن" help="مربع، کنار عنوان تب و در گوگل" src={md.v.favicon} onPick={(s) => md.set({ favicon: s })} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <Toggle on={wm.on} onChange={(on) => setWm({ on })} text="واترمارک خودکار فعال باشد" />
            <div className={cx('space-y-3', !wm.on && 'pointer-events-none opacity-50')}>
              <Field label="جای واترمارک"><Segmented size="sm" value={wm.pos} onChange={(p) => setWm({ pos: p })} options={pos.map((p) => [p, p])} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`شفافیت: ${pct(wm.opacity)}`}><input type="range" min={10} max={80} value={wm.opacity} onChange={(e) => setWm({ opacity: +e.target.value })} className="w-full accent-[var(--brand)]" /></Field>
                <Field label={`اندازه: ${pct(wm.size)} عرض عکس`}><input type="range" min={8} max={40} value={wm.size} onChange={(e) => setWm({ size: +e.target.value })} className="w-full accent-[var(--brand)]" /></Field>
              </div>
              <div className="flex flex-wrap gap-4 text-13"><Toggle on={wm.unitPhotos} onChange={(v) => setWm({ unitPhotos: v })} text="عکس واقعی واحدها" /><Toggle on={wm.catalog} onChange={(v) => setWm({ catalog: v })} text="عکس‌های کاتالوگ" /><Toggle on={wm.blog} onChange={(v) => setWm({ blog: v })} text="تصاویر وبلاگ" /></div>
              <p className="text-11 text-t2">عکس اصلی بدون واترمارک در کتابخانهٔ رسانه نگه داشته می‌شود؛ با تغییر این تنظیم، نسخهٔ نمایشی دوباره ساخته می‌شود.</p>
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f5f6fa]">
            <img src="./brand/logo-mark.png" alt="نمونهٔ عکس واحد" className="absolute inset-0 m-auto size-1/2 object-contain opacity-20" />
            <span className="absolute inset-x-0 top-3 text-center text-11 text-t3">نمونهٔ عکس واقعی واحد</span>
            {wm.on && <img src={md.v.logo} alt="واترمارک" style={{ width: `${wm.size}%`, opacity: wm.opacity / 100 }} className={cx('absolute object-contain', { 'بالا راست': 'top-3 right-3', 'بالا چپ': 'top-3 left-3', 'وسط': 'inset-0 m-auto', 'پایین راست': 'bottom-3 right-3', 'پایین چپ': 'bottom-3 left-3' }[wm.pos])} />}
          </div>
        </div>
      </Sec>

      <Sec title={<span className="flex items-center gap-1.5"><Instagram size={15} />شبکه‌های اجتماعی و پیام‌رسان‌ها</span>} sub="هر کدام پر باشد در فوتر و صفحهٔ تماس با ما نمایش داده می‌شود. خالی بگذارید تا پنهان شود.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{SOC.map(([k, l, ph]) => <Field key={k} label={l} error={so.v[k] && !/^https?:\/\//.test(so.v[k]) ? 'نشانی باید با https شروع شود.' : undefined}><Input className="ltr text-left" placeholder={ph} value={so.v[k] ?? ''} onChange={(e) => so.set({ [k]: e.target.value.trim() })} /></Field>)}</div>
        <p className="mt-2 text-11 text-t2">دکمهٔ شناور پشتیبانی و نمادهای اعتماد (اینماد، ساماندهی) در «سربرگ، منو و فوتر» تنظیم می‌شوند.</p>
      </Sec>
      <SaveBar dirty={dirty} onCancel={() => { id.reset(); md.reset(); so.reset() }} onSave={() => { if (id.dirty) id.save('اطلاعات فروشگاه'); if (md.dirty) md.save('لوگو و واترمارک'); if (so.dirty) so.save('شبکه‌های اجتماعی') }} />
    </div>
  )
}

// ───────── باشگاه مشتریان ─────────
export function LoyaltyClub() {
  const d = useDB(); const nav = useNavigate(); const L = useDraft('loyalty'); const v = L.v
  const sample = 48000000; const earned = Math.floor(sample / v.perAmount) * v.points
  const dist = v.tiers.map((t) => ({ ...t, n: d.customers.filter((c) => tierOf({ ...d.storeCfg, loyalty: v }, v.balances[c.id] ?? 0).name === t.name).length }))
  const owed = Object.values(v.balances).reduce((a, b) => a + b, 0) * v.pointValue
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dist.map((t) => <KPI key={t.name} label={`مشتریان ${t.name}`} value={fa(t.n)} note={`از ${fa(t.min)} امتیاز`} />)}
        <KPI label="ارزش امتیازهای خرج‌نشده" value={toman(owed)} note="بدهی باشگاه به مشتریان" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Sec title={<span className="flex items-center gap-1.5"><Crown size={15} />قانون امتیازدهی</span>} sub="امتیاز بعد از پایان مهلت مرجوعی قطعی می‌شود تا با مرجوعی یا لغو، امتیاز بی‌پشتوانه نماند.">
          <Toggle on={v.on} onChange={(on) => L.set({ on })} text="باشگاه مشتریان فعال باشد" />
          <div className={cx('mt-3 grid gap-3 md:grid-cols-2', !v.on && 'pointer-events-none opacity-50')}>
            <Field label="به ازای هر … تومان خرید" help={`${num(v.perAmount)} تومان`}><Input className="ltr text-left" inputMode="numeric" value={v.perAmount} onChange={(e) => L.set({ perAmount: +e.target.value.replace(/\D/g, '') || 0 })} /></Field>
            <Field label="امتیاز داده شود"><Input className="ltr text-left" inputMode="numeric" value={v.points} onChange={(e) => L.set({ points: +e.target.value.replace(/\D/g, '') || 0 })} /></Field>
            <Field label="ارزش هر امتیاز هنگام خرج (تومان)"><Input className="ltr text-left" inputMode="numeric" value={v.pointValue} onChange={(e) => L.set({ pointValue: +e.target.value.replace(/\D/g, '') || 0 })} /></Field>
            <Field label="انقضای امتیاز (روز)" help="۰ یعنی بدون انقضا"><Input className="ltr text-left" inputMode="numeric" value={v.expireDays} onChange={(e) => L.set({ expireDays: +e.target.value.replace(/\D/g, '') || 0 })} /></Field>
            <Field label="امتیاز کی قطعی شود"><Segmented size="sm" value={v.earnAfter} onChange={(x) => L.set({ earnAfter: x })} options={[['تحویل سفارش', 'تحویل سفارش'], ['پایان مهلت مرجوعی', 'پایان مهلت مرجوعی']]} /></Field>
            <div className="flex items-end pb-2"><Toggle on={v.excludeDiscounted} onChange={(x) => L.set({ excludeDiscounted: x })} text="خرید با کد تخفیف امتیاز نگیرد" /></div>
          </div>
        </Sec>
        <Card title="مثال برای مشتری">
          <p className="text-13 leading-7">خرید <b>{toman(sample)}</b> ← <b className="text-brand">{fa(earned)} امتیاز</b></p>
          <p className="text-13 leading-7">ارزش این امتیاز هنگام خرید بعدی: <b>{toman(earned * v.pointValue)}</b> ({pct((earned * v.pointValue) / sample * 100, 1)} بازگشت)</p>
          <p className="mt-2 rounded-xl bg-info-bg p-2 text-12 text-info"><Info size={12} className="ml-1 inline" />بازگشت بیشتر از ۲٪ روی کالای گران‌قیمت وارداتی حاشیهٔ سود را جدی می‌خورد.</p>
        </Card>
      </div>
      <Sec title="سطح‌بندی مشتریان" sub="با رسیدن امتیاز به حد هر سطح، مشتری خودکار ارتقا پیدا می‌کند و پیامک تبریک می‌گیرد.">
        <div className="grid gap-3 md:grid-cols-3">{v.tiers.map((t, i) => <div key={t.name} className="rounded-2xl border border-line p-3" style={{ borderTopColor: t.color, borderTopWidth: 4 }}>
          <p className="flex items-center gap-2 text-14 font-bold"><span className="size-3 rounded-full" style={{ background: t.color }} />{t.name}</p>
          <Field label="حداقل امتیاز">{i === 0 ? <Input disabled value="سطح پیش‌فرض" /> : <Input className="ltr text-left" inputMode="numeric" value={t.min} onChange={(e) => L.set({ tiers: v.tiers.map((x, j) => j === i ? { ...x, min: +e.target.value.replace(/\D/g, '') || 0 } : x) })} />}</Field>
          <Field label="مزایا"><Textarea rows={2} value={t.perks} onChange={(e) => L.set({ tiers: v.tiers.map((x, j) => j === i ? { ...x, perks: e.target.value } : x) })} /></Field>
        </div>)}</div>
        {v.tiers.some((t, i) => i > 0 && t.min <= v.tiers[i - 1].min) && <p className="mt-2 text-12 text-danger">حد هر سطح باید از سطح قبلی بیشتر باشد.</p>}
        <Button className="mt-3" variant="ghost" onClick={() => nav('/admin/customers')}>مشاهدهٔ مشتریان و امتیازها</Button>
      </Sec>
      <SaveBar dirty={L.dirty} onCancel={L.reset} onSave={() => { if (v.tiers.some((t, i) => i > 0 && t.min <= v.tiers[i - 1].min)) return toast('حد سطح‌ها را درست کنید.', { tone: 'err' }); L.save('باشگاه مشتریان') }} />
    </div>
  )
}

// ───────── پرداخت، سبد و مالی ─────────
export function CheckoutRules() {
  const nav = useNavigate(); const C = useDraft('checkout'); const v = C.v
  const numIn = (k: keyof typeof v) => <Input className="ltr text-left" inputMode="numeric" value={v[k] as number} onChange={(e) => C.set({ [k]: +e.target.value.replace(/\D/g, '') || 0 } as Partial<typeof v>)} />
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Sec title={<span className="flex items-center gap-1.5"><ShoppingCart size={15} />سبد خرید</span>} sub="سقف و کف سبد با محدودیت درگاه‌ها و سرویس‌های اقساطی هماهنگ باشد.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="حداقل مبلغ سبد (تومان)" help={v.minCart ? toman(v.minCart) : 'بدون حداقل'}>{numIn('minCart')}</Field>
            <Field label="حداکثر مبلغ سبد (تومان)" help={toman(v.maxCart)}>{numIn('maxCart')}</Field>
            <Field label="نگه‌داشتن واحد هنگام پرداخت (دقیقه)" help="هر واحد یکتاست؛ تا این مدت برای خریدار دیگر رزرو نمی‌شود.">{numIn('reserveMin')}</Field>
          </div>
          <div className="mt-3 space-y-2 text-13">
            <Toggle on={v.socialProof} onChange={(x) => C.set({ socialProof: x })} text="نمایش «تعداد فروش و بازدید» در صفحهٔ کالا" />
            <p className="text-11 text-t2">فقط عدد واقعی نمایش داده می‌شود؛ برای کالای تک‌واحدی معمولاً «۱ واحد باقی مانده» گویاتر است.</p>
            <p className="text-12">یادآوری سبد رهاشده با پیامک در <button className="text-brand underline" onClick={() => nav('/admin/marketing?tab=automations')}>مارکتینگ ← اتوماسیون‌ها</button> تنظیم می‌شود.</p>
          </div>
        </Sec>
        <Sec title={<span className="flex items-center gap-1.5"><ShieldAlert size={15} />هشدار فیلترشکن هنگام پرداخت</span>} sub="درگاه‌های بانکی با آی‌پی خارج از ایران پرداخت را رد می‌کنند. اگر فیلترشکن مشتری روشن باشد، قبل از رفتن به درگاه هشدار می‌گیرد.">
          <Toggle on={v.vpnWarn} onChange={(x) => C.set({ vpnWarn: x })} text="هشدار فیلترشکن فعال باشد" />
          <div className={cx('mt-3 rounded-2xl border border-warning/40 bg-warning-bg p-3 text-13 text-warning', !v.vpnWarn && 'opacity-40')}>
            <b className="block">فیلترشکن شما روشن است</b>
            <span className="text-12">برای پرداخت موفق، لطفاً فیلترشکن را خاموش کنید و دوباره روی «پرداخت» بزنید. سبد خرید شما حفظ می‌شود.</span>
          </div>
          <p className="mt-2 text-11 text-t2">پرداخت‌های ناموفق با این علت در پروندهٔ مشتری و «پرداخت‌های ناموفق» جدا شمرده می‌شوند.</p>
        </Sec>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Sec title={<span className="flex items-center gap-1.5"><Wallet size={15} />کیف پول و بازگشت وجه</span>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="حداقل موجودی قابل برداشت (تومان)" help={toman(v.walletMinWithdraw)}>{numIn('walletMinWithdraw')}</Field>
            <Field label="سقف شارژ کیف پول (تومان)" help={toman(v.walletMaxCharge)}>{numIn('walletMaxCharge')}</Field>
            <Field label={`کش‌بک: ${pct(v.cashback)}`} help="۰ یعنی خاموش. بعد از پایان مهلت مرجوعی به کیف پول می‌نشیند."><input type="range" min={0} max={10} value={v.cashback} onChange={(e) => C.set({ cashback: +e.target.value })} className="w-full accent-[var(--brand)]" /></Field>
          </div>
        </Sec>
        <Sec title="مالیات و تحویل">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`مالیات بر ارزش افزوده: ${pct(v.vat)}`} help="روی فاکتور رسمی جدا نمایش داده می‌شود."><input type="range" min={0} max={15} value={v.vat} onChange={(e) => C.set({ vat: +e.target.value })} className="w-full accent-[var(--brand)]" /></Field>
            <Field label="تحویل‌شده فرض‌کردن مرسولهٔ پستی بعد از (روز)" help="فقط وقتی رهگیری پست تحویل را اعلام نکرده و مشتری شکایتی ثبت نکرده است.">{numIn('autoDeliverDays')}</Field>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-11 text-t2"><Globe size={12} />تحویل سریع و پیک همیشه با کد تحویل یا عکس تحویل بسته می‌شود و این قاعده شامل آن‌ها نیست.</p>
        </Sec>
      </div>
      <Card><p className="flex flex-wrap items-center gap-2 text-12 text-t2"><Badge tone="info" dot={false}>مرتبط</Badge>درگاه‌ها و سرویس‌های اقساطی در <button className="text-brand underline" onClick={() => nav('/admin/finance?tab=gateways')}>مالی ← درگاه‌ها</button>، روش‌ها و هزینهٔ ارسال در <button className="text-brand underline" onClick={() => nav('/admin/shipping?tab=methods')}>ارسال ← روش‌ها</button>.</p></Card>
      <SaveBar dirty={C.dirty} onCancel={C.reset} onSave={() => { if (v.minCart && v.maxCart && v.minCart >= v.maxCart) return toast('حداقل سبد باید از حداکثر کمتر باشد.', { tone: 'err' }); C.save('قوانین پرداخت و سبد') }} />
    </div>
  )
}
