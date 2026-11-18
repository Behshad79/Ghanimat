import { useEffect, useState } from 'react'
import { Pipette } from 'lucide-react'
import { cx, Input } from './base'

/** حدس رنگ از نام فارسی یا انگلیسی (برای مقدار تازهٔ ویژگی رنگ) */
const NAMES: [RegExp, string][] = [[/قرمز|red/i, '#e53935'], [/صورتی|pink/i, '#f48fb1'], [/نارنجی|orange/i, '#fb8c00'], [/زرد|yellow/i, '#f2c230'], [/سبز|green/i, '#43a047'], [/فیروزه|turquoise|teal/i, '#26a69a'], [/آبی روشن|light ?blue|sky/i, '#64b5f6'], [/سرمه|navy|midnight/i, '#1a237e'], [/آبی|blue/i, '#1e63d6'], [/بنفش|purple|violet/i, '#7e57c2'], [/قهوه|brown/i, '#795548'], [/طلایی|gold/i, '#d4af37'], [/نقره|silver/i, '#c9ccd1'], [/خاکستری|gray|grey/i, '#8e8e93'], [/مشکی|سیاه|black/i, '#1d1d1f'], [/سفید|white/i, '#f5f5f7'], [/کرم|beige|cream/i, '#efe3c8']]
export const guessHex = (name: string) => NAMES.find(([r]) => r.test(name))?.[1] ?? '#1e63d6'
const PRESETS = ['#1d1d1f', '#f5f5f7', '#8e8e93', '#c9ccd1', '#e53935', '#f48fb1', '#fb8c00', '#f2c230', '#43a047', '#26a69a', '#64b5f6', '#1e63d6', '#1a237e', '#7e57c2', '#795548', '#d4af37']

const toHsl = (hex: string): [number, number, number] => { const m = hex.replace('#', '').match(/.{2}/g); if (!m) return [210, 75, 48]; const [r, g, b] = m.map((x) => parseInt(x, 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; if (mx === mn) return [0, 0, Math.round(l * 100)]; const dd = mx - mn; const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)] }
const toHex = (h: number, s: number, l: number) => { const S = s / 100, L = l / 100; const k = (n: number) => (n + h / 30) % 12; const a = S * Math.min(L, 1 - L); const f = (n: number) => Math.round(255 * (L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0'); return `#${f(0)}${f(8)}${f(4)}` }
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

/** انتخاب رنگ با گرادیان طیف (فام، اشباع، روشنایی)، انتخابگر مرورگر، کد HEX و رنگ‌های آماده */
export function ColorPicker({ value, onChange, label = 'رنگ' }: { value: string; onChange: (hex: string) => void; label?: string }) {
  const [hsl, setHsl] = useState(() => toHsl(isHex(value) ? value : '#1e63d6')); const [txt, setTxt] = useState(value)
  useEffect(() => { if (isHex(value)) { setTxt(value); setHsl(toHsl(value)) } }, [value])
  const [h, s, l] = hsl
  const set = (n: [number, number, number]) => { setHsl(n); const hex = toHex(...n); setTxt(hex); onChange(hex) }
  const track = 'h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:bg-[var(--thumb)]'
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex items-center gap-2">
        <span className="size-10 shrink-0 rounded-xl border border-line shadow-inner" style={{ background: isHex(txt) ? txt : value }} />
        <Input aria-label={`کد ${label}`} className="ltr h-9 w-28 text-left font-mono uppercase" value={txt} maxLength={7} onChange={(e) => { const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`; setTxt(v); if (isHex(v)) { setHsl(toHsl(v)); onChange(v.toLowerCase()) } }} />
        <label className="relative grid size-9 cursor-pointer place-items-center rounded-lg border border-line text-t2 hover:border-brand hover:text-brand" title="انتخابگر رنگ مرورگر"><Pipette size={15} /><input type="color" aria-label={`انتخابگر ${label}`} className="absolute inset-0 cursor-pointer opacity-0" value={isHex(txt) ? txt : '#1e63d6'} onChange={(e) => { setTxt(e.target.value); setHsl(toHsl(e.target.value)); onChange(e.target.value) }} /></label>
      </div>
      <div className="space-y-2" dir="ltr">
        <input type="range" aria-label="فام رنگ" min={0} max={360} value={h} onChange={(e) => set([+e.target.value, s, l])} className={track} style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)', ['--thumb' as string]: toHex(h, 100, 50) }} />
        <input type="range" aria-label="اشباع رنگ" min={0} max={100} value={s} onChange={(e) => set([h, +e.target.value, l])} className={track} style={{ background: `linear-gradient(90deg,${toHex(h, 0, l)},${toHex(h, 100, l)})`, ['--thumb' as string]: toHex(h, s, l) }} />
        <input type="range" aria-label="روشنایی رنگ" min={4} max={96} value={l} onChange={(e) => set([h, s, +e.target.value])} className={track} style={{ background: `linear-gradient(90deg,#000,${toHex(h, s, 50)},#fff)`, ['--thumb' as string]: toHex(h, s, l) }} />
      </div>
      <div className="flex flex-wrap gap-1.5">{PRESETS.map((c) => <button key={c} type="button" aria-label={`رنگ ${c}`} onClick={() => { setTxt(c); setHsl(toHsl(c)); onChange(c) }} className={cx('size-6 rounded-full border', txt.toLowerCase() === c ? 'border-brand ring-2 ring-brand/40' : 'border-line')} style={{ background: c }} />)}</div>
    </div>
  )
}
