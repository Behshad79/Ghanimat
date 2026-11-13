import { useState } from 'react'
import { AIButton, Button, cx, Field, Input, Segmented, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, num, toman } from '@/shared/lib/fa'

type F = { title: string; code: string; type: 'درصدی' | 'مبلغی' | 'ارسال رایگان'; value: string; cap: string; days: string; limit: string; perUser: string; minCart: string; audience: 'all' | 'one' | 'segment'; customerId: string; segment: string }
const blank: F = { title: '', code: '', type: 'درصدی', value: '', cap: '', days: '30', limit: '100', perUser: '1', minCart: '', audience: 'all', customerId: '', segment: 'VIP' }
const digits = (v: string) => v.replace(/[^\d]/g, '')

/** ساخت کد تخفیف: نوع، سقف مبلغ، انقضا، تعداد کل و هر نفر، حداقل سبد، و برای همه یا یک مشتری یا یک بخش */
export function CouponForm({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const d = useDB(); const [f, setF] = useState<F>(blank); const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }))
  const segs = [...new Set(d.customers.map((c) => c.segment))]
  const errs: Partial<Record<keyof F, string>> = {}
  if (f.code && !/^[A-Z0-9-]{3,}$/.test(f.code)) errs.code = 'حروف بزرگ انگلیسی، عدد و خط تیره؛ دست‌کم ۳ نویسه.'
  if (d.codes.some((c) => c.id === f.code)) errs.code = 'این کد قبلاً ساخته شده است.'
  if (f.type === 'درصدی' && f.value && (+f.value < 1 || +f.value > 90)) errs.value = 'درصد بین ۱ تا ۹۰'
  if (f.type === 'درصدی' && !f.cap) errs.cap = 'برای کالای گران‌قیمت سقف مبلغ لازم است.'
  if (f.audience === 'one' && !f.customerId) errs.customerId = 'مشتری را انتخاب کنید.'
  const ready = f.title.trim() && f.code && (f.type === 'ارسال رایگان' || f.value) && Object.keys(errs).length === 0
  const valueText = f.type === 'درصدی' ? `${fa(f.value || 0)}٪${f.cap ? ` تا سقف ${toman(+f.cap)}` : ''}` : f.type === 'مبلغی' ? toman(+f.value || 0) : 'ارسال رایگان'
  const who = f.audience === 'one' ? d.customers.find((c) => c.id === f.customerId)?.name ?? '' : f.audience === 'segment' ? `بخش ${f.segment}` : 'همهٔ مشتریان'
  const exp = new Date(Date.now() + (+f.days || 30) * 864e5)
  const close = () => { setF(blank); onClose() }
  return (
    <Modal wide open={open} onClose={close} title="ساخت کد تخفیف" footer={<><Button variant="primary" disabled={!ready} onClick={() => {
      mutate((x) => { x.codes.unshift({ id: f.code, title: f.title.trim(), type: f.type, value: valueText, used: 0, limit: +f.limit || 0, perUser: +f.perUser || 0, cap: +f.cap || undefined, minCart: +f.minCart || undefined, expires: exp.toISOString(), audience: f.audience, customerId: f.customerId || undefined, active: true, cond: [who, f.minCart ? `حداقل خرید ${toman(+f.minCart)}` : '', `تا ${exp.toLocaleDateString('fa-IR')}`].filter(Boolean).join(' · ') }) }, { action: 'ساخت کد تخفیف', target: f.code, after: `${valueText} · ${who}` })
      toast(`کد ${f.code} ساخته شد.`); close(); onDone() }}>ساخت کد {f.code}</Button><Button variant="ghost" onClick={close}>انصراف</Button></>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="عنوان" help="فقط برای تیم؛ مثلاً «جبران تأخیر ارسال»"><Input value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
            <Field label="کد" error={errs.code}><div className="flex gap-2"><Input className="ltr flex-1 text-left font-mono" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="AZAR5" /><Button size="sm" variant="ghost" onClick={() => set({ code: `GH${Math.random().toString(36).slice(2, 7).toUpperCase()}` })}>تصادفی</Button></div></Field>
          </div>
          <Field label="نوع"><Segmented value={f.type} onChange={(t) => set({ type: t })} options={[['درصدی', 'درصدی'], ['مبلغی', 'مبلغی'], ['ارسال رایگان', 'ارسال رایگان']]} /></Field>
          {f.type !== 'ارسال رایگان' && <div className="grid gap-3 sm:grid-cols-2">
            <Field label={f.type === 'درصدی' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'} error={errs.value} help={f.type === 'مبلغی' && f.value ? toman(+f.value) : undefined}><Input className="ltr text-left" inputMode="numeric" value={f.value} onChange={(e) => set({ value: digits(e.target.value) })} /></Field>
            {f.type === 'درصدی' && <Field label="سقف مبلغ تخفیف (تومان)" error={errs.cap} help={f.cap ? toman(+f.cap) : undefined}><Input className="ltr text-left" inputMode="numeric" value={f.cap} onChange={(e) => set({ cap: digits(e.target.value) })} /></Field>}
          </div>}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="اعتبار (روز)"><Input className="ltr text-left" inputMode="numeric" value={f.days} onChange={(e) => set({ days: digits(e.target.value) })} /></Field>
            <Field label="تعداد کل" help="۰ یعنی نامحدود"><Input className="ltr text-left" inputMode="numeric" value={f.limit} onChange={(e) => set({ limit: digits(e.target.value) })} /></Field>
            <Field label="برای هر مشتری"><Input className="ltr text-left" inputMode="numeric" value={f.perUser} onChange={(e) => set({ perUser: digits(e.target.value) })} /></Field>
            <Field label="حداقل سبد (تومان)"><Input className="ltr text-left" inputMode="numeric" value={f.minCart} onChange={(e) => set({ minCart: digits(e.target.value) })} /></Field>
          </div>
          <Field label="قابل استفاده برای"><div className="grid gap-2 sm:grid-cols-3">{([['all', 'همهٔ مشتریان'], ['one', 'یک مشتری'], ['segment', 'یک بخش مشتری']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => set({ audience: k })} className={cx('rounded-xl border px-3 py-2 text-13 transition-colors', f.audience === k ? 'border-transparent bg-success-solid text-white' : 'border-line bg-surface-2')}>{l}</button>)}</div></Field>
          {f.audience === 'one' && <Field label="مشتری" error={errs.customerId}><Select value={f.customerId} onChange={(v) => set({ customerId: v })} placeholder="جست‌وجوی نام یا موبایل…" options={d.customers.map((c) => [c.id, `${c.name} · ${c.mobile}`])} /></Field>}
          {f.audience === 'segment' && <Field label="بخش"><Select value={f.segment} onChange={(v) => set({ segment: v })} options={segs} /></Field>}
          {f.type === 'درصدی' && <AIButton size="sm" onClick={() => set({ title: 'فروش موجودی راکد', code: 'STOCK7', value: '7', cap: '3000000', days: '14' })}>پیشنهاد برای موجودی راکد</AIButton>}
        </div>
        <div className="h-fit rounded-2xl border border-dashed border-brand/40 bg-brand-tint/40 p-4 text-13">
          <p className="text-11 text-t2">پیش‌نمایش</p>
          <p className="ltr mt-1 text-right font-mono text-18 font-black text-brand">{f.code || 'CODE'}</p>
          <p className="mt-2 font-semibold">{valueText}</p>
          <ul className="mt-2 space-y-1 text-12 text-t2"><li>برای: {who || '—'}</li>{f.minCart && <li>حداقل خرید: {toman(+f.minCart)}</li>}<li>تا: {exp.toLocaleDateString('fa-IR')}</li><li>{+f.limit ? `${num(+f.limit)} بار` : 'نامحدود'} · هر نفر {fa(+f.perUser || 1)} بار</li></ul>
          {f.type === 'درصدی' && +f.value > 0 && f.cap && <p className="mt-2 text-11 text-t2">روی سبد ۵۰ میلیونی: {toman(Math.min(50000000 * +f.value / 100, +f.cap))} تخفیف</p>}
        </div>
      </div>
    </Modal>
  )
}
