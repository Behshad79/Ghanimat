import { Input, cx } from './base'
import { fa } from '../lib/fa'

/** مبلغ به حروف کوتاه و دقیق: «۲ میلیون و ۳۵۰ هزار تومان» */
export function moneyWords(n: number) {
  const b = Math.floor(n / 1e9); const m = Math.floor((n % 1e9) / 1e6); const k = Math.floor((n % 1e6) / 1e3); const r = Math.round(n % 1e3)
  const parts = [b && `${fa(b)} میلیارد`, m && `${fa(m)} میلیون`, k && `${fa(k)} هزار`, r && fa(r)].filter(Boolean)
  return parts.length ? `${parts.join(' و ')} تومان` : ''
}

/** ورودی مبلغ: سه‌رقم‌سه‌رقم جدا می‌شود، واحد (تومان) کنارش نوشته است و مبلغ به حروف کوتاه زیرش می‌آید تا صفرها اشتباه نشود */
export function MoneyInput({ value, onChange, unit = 'تومان', hint = true, className, placeholder, ...rest }: { value: number; onChange: (n: number) => void; unit?: string; hint?: boolean; className?: string; placeholder?: string; 'aria-label'?: string; autoFocus?: boolean }) {
  const show = value ? Math.round(value).toLocaleString('en-US') : ''
  return <span className={cx('block', className)}>
    <span className="relative block"><Input {...rest} inputMode="numeric" className="ltr pl-14 text-left font-mono" placeholder={placeholder ?? 'مثلاً 1,500,000'} value={show} onChange={(e) => { const n = Number(e.target.value.replace(/[^\d۰-۹]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))); onChange(Number.isFinite(n) ? n : 0) }} /><span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-11 text-t3">{unit}</span></span>
    {hint && value > 0 && unit === 'تومان' && <span className="mt-0.5 block text-[10px] text-t3">{moneyWords(value)}</span>}
  </span>
}
