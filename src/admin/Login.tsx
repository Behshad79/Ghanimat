import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Button, Field, Input } from '@/shared/ui/base'
import { ROLES, setSession, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

const ERR: Record<string, string> = {
  code: 'کد واردشده درست نیست. کد نمونه ۱۱۱۱۱۱ است. ۲ تلاش دیگر دارید.',
  expired: 'کد منقضی شده است. کد تازه بخواهید.',
  inactive: 'این حساب غیرفعال است. برای فعال‌سازی با مدیر کل تماس بگیرید.',
  locked: 'به‌خاطر تلاش زیاد، ورود تا ۱۵ دقیقهٔ دیگر بسته است.',
  ip: 'ورود از این نشانی اینترنتی مجاز نیست. از شبکهٔ دفتر وارد شوید یا از مدیر کل بخواهید آن را اضافه کند.',
  phone: 'این شماره در تیم ثبت نشده است. شماره را بررسی کنید یا یکی از حساب‌های نمونه را انتخاب کنید.',
}
/** ورود با حساب‌های نمونه (بخش ۱۸.۳). حالت‌های خطای ورود از فهرست پایین قابل دیدن است. */
export function Login() {
  const d = useDB(); const nav = useNavigate()
  const [phone, setPhone] = useState(''); const [step, setStep] = useState<'phone' | 'code'>('phone'); const [code, setCode] = useState(''); const [err, setErr] = useState('')
  const user = d.team.find((u) => u.phone === phone)
  const enter = (id: string) => { const u = d.team.find((x) => x.id === id)!; setSession({ userId: id, viewAs: null, viewState: 'normal' }); nav(ROLES[u.role].home) }
  return (
    <div className="grid min-h-full place-items-center bg-bg p-4">
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-line bg-surface p-6">
          <img src="./brand/logo-full.png" alt="غنیمت" className="mb-1 h-10 rounded-sm bg-white p-0.5" />
          <p className="mb-6 text-12 text-t2">مرکز فرماندهی غنیمت</p>
          {step === 'phone' ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!user) return setErr(ERR.phone); setErr(''); setStep('code') }}>
              <Field label="شمارهٔ موبایل" error={err}><Input className="ltr text-left font-mono" inputMode="numeric" placeholder="مثلاً 09000000001" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Button variant="primary" size="lg" className="w-full">دریافت کد ورود</Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (code !== '111111') return setErr(ERR.code); enter(user!.id) }}>
              <p className="flex items-center gap-1.5 text-12 text-t2"><ShieldCheck size={14} className="text-success" />کد ۶ رقمی با پیامک به {fa(phone)} ارسال شد.</p>
              <Field label="کد ورود" error={err} help="کد ورود همیشه با پیامک ارسال می‌شود، نه پیام‌رسان."><Input autoFocus className="ltr text-center font-mono tracking-[0.4em]" inputMode="numeric" maxLength={6} placeholder="111111" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
              <Button variant="primary" size="lg" className="w-full">ورود به پنل</Button>
              <button type="button" className="w-full text-12 text-t2 hover:text-brand" onClick={() => { setStep('phone'); setErr('') }}>تغییر شماره</button>
            </form>
          )}
          <details className="mt-6 text-12 text-t2"><summary className="cursor-pointer">نمایش حالت‌های خطای ورود</summary>
            <div className="mt-2 flex flex-wrap gap-1">{Object.entries({ code: 'کد اشتباه', expired: 'کد منقضی', inactive: 'حساب غیرفعال', locked: 'قفل تلاش زیاد', ip: 'IP غیرمجاز' }).map(([k, l]) => <button key={k} onClick={() => setErr(ERR[k])} className="rounded-sm bg-neutral-bg px-2 py-1 hover:text-brand">{l}</button>)}</div>
          </details>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-14 font-semibold">حساب‌های نمونه</p>
          <p className="mb-3 text-12 text-t2">کد ورود نمونه برای همه: {fa('111111')}. در بالای پنل می‌توانید بدون خروج، نقش را عوض کنید.</p>
          <ul className="divide-y divide-line">
            {d.team.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><p className="text-13 font-medium">{ROLES[u.role].label}</p><p className="truncate text-11 text-t3"><span className="ltr font-mono">{fa(u.phone)}</span> · {ROLES[u.role].opens}</p></div>
                <Button size="sm" onClick={() => enter(u.id)}>ورود با این حساب</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
