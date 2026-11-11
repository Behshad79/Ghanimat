import { Barcode, QR } from '@/shared/ui/codes'
import { cx } from '@/shared/ui/base'
import { fa } from '@/shared/lib/fa'
import type { Product, Unit } from '@/shared/data/seed'

export const LABEL_SIZES: Record<string, { w: number; h: number; label: string }> = {
  '50x30': { w: 50, h: 30, label: '۵۰×۳۰ میلی‌متر' }, '40x25': { w: 40, h: 25, label: '۴۰×۲۵ میلی‌متر' }, '60x40': { w: 60, h: 40, label: '۶۰×۴۰ میلی‌متر' },
}
export const LABEL_BG: Record<string, { bg: string; label: string }> = { white: { bg: '#ffffff', label: 'سفید' }, yellow: { bg: '#ffc24b', label: 'زرد برند' }, thermal: { bg: '#ffffff', label: 'حرارتی سیاه‌وسفید' } }

/** برچسب کالا (مثل برچسب‌های انبار دیجی‌کالا): کد درشت، نام، شرح کوتاه، QR با حرف گرید، بارکد تمام‌عرض. اندازه به میلی‌متر واقعی. */
export function ProductLabel({ p, u, size = '50x30', bg = 'white', qty }: { p: Product; u?: Unit; size?: string; bg?: string; qty?: number }) {
  const s = LABEL_SIZES[size] ?? LABEL_SIZES['50x30']; const small = s.h < 30
  const code = u?.code ?? p.code ?? p.id
  const desc = u ? [u.color, u.condition === 'sealed' ? 'اکبند' : u.condition === 'openbox' ? 'جعبه‌باز' : 'استوک', `قفسه ${u.shelf}`].join(' · ') : [p.model ?? p.en, qty ? `${fa(qty)} عدد` : ''].filter(Boolean).join(' · ')
  return (
    <div className={cx('relative flex flex-col overflow-hidden text-black', bg === 'thermal' && 'grayscale')} style={{ width: `${s.w}mm`, height: `${s.h}mm`, background: LABEL_BG[bg]?.bg ?? '#fff', padding: '1.6mm', border: '0.2mm solid #000', boxSizing: 'border-box', fontFamily: 'Vazirmatn' }}>
      <div className="flex items-start justify-between gap-[1mm]">
        <div className="min-w-0 flex-1">
          <p className="ltr text-left font-mono font-bold leading-none" style={{ fontSize: small ? '3.2mm' : '4mm' }}>{code}</p>
          <p className="mt-[0.6mm] truncate font-bold leading-tight" style={{ fontSize: small ? '2.2mm' : '2.6mm' }}>{p.title}</p>
          <p className="truncate leading-tight" style={{ fontSize: small ? '1.9mm' : '2.2mm' }}>{desc}</p>
        </div>
        <div className="flex shrink-0 items-start gap-[0.6mm]">
          {u && <span className="grid place-items-center rounded-[0.6mm] bg-black font-bold text-white" style={{ width: small ? '3.6mm' : '4.4mm', height: small ? '3.6mm' : '4.4mm', fontSize: small ? '2.2mm' : '2.6mm' }}>{u.grade.replace('+', '')}</span>}
          <QR value={`https://ghanimat.example/u/${code}`} size={small ? 30 : 38} className="block" />
        </div>
      </div>
      <div className="mt-auto"><Barcode value={code} height={small ? 22 : 30} module={1.4} className="block h-auto w-full" /></div>
    </div>
  )
}
