// نرخ روز ارز: خواندن از API تنظیم‌شده در «تنظیمات ← پرداخت، سبد و مالی ← نرخ روز ارز»
// در نسخهٔ نهایی کلید API فقط سمت سرور می‌ماند و پنل از endpoint داخلی `GET /fx/today` می‌خواند.
import { getDB, mutate } from './store'

export type FxCur = 'دلار' | 'درهم' | 'دینار'
export const FX_CURS: FxCur[] = ['دلار', 'درهم', 'دینار']
export type FxResult = { rate: number; at: string; source: 'api' | 'demo' | 'saved'; error?: string }

/** خواندن مقدار با مسیر نقطه‌ای مثل data.usd.sell یا rates[0].price */
const pick = (o: unknown, path: string): unknown => path.split('.').filter(Boolean).reduce<unknown>((a, k) => {
  if (a == null) return undefined
  const m = k.match(/^(\w+)\[(\d+)\]$/)
  return m ? (a as Record<string, unknown[]>)[m[1]]?.[+m[2]] : (a as Record<string, unknown>)[k]
}, o)
const toNum = (v: unknown) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0

/** نرخ امروز یک ارز به تومان. اگر API خاموش یا در دسترس نباشد، آخرین نرخ ذخیره‌شده برمی‌گردد. */
export async function fetchRate(cur: FxCur): Promise<FxResult> {
  const fx = getDB().storeCfg.fx; const saved = { rate: fx.rates[cur], at: fx.updatedAt, source: 'saved' as const }
  if (!fx.api.on) return saved
  if (fx.api.mode === 'demo') {
    // حالت نمایشی: نوسان کوچک روزانه روی نرخ ذخیره‌شده، تا رفتار واقعی صفحه دیده شود
    const day = Math.floor(Date.now() / 864e5); const w = Math.sin(day * 1.3 + cur.length) * 0.012
    return { rate: Math.round((fx.rates[cur] * (1 + w)) / 10) * 10, at: new Date().toISOString(), source: 'demo' }
  }
  if (!fx.api.url.trim()) return { ...saved, error: 'نشانی API ثبت نشده است.' }
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000)
    const url = fx.api.url.replace('{cur}', fx.api.codes[cur])
    const r = await fetch(url, { headers: fx.api.keyHeader && fx.api.key ? { [fx.api.keyHeader]: fx.api.key } : {}, signal: ctrl.signal }); clearTimeout(t)
    if (!r.ok) throw new Error(`پاسخ ${r.status}`)
    const raw = toNum(pick(await r.json(), fx.api.paths[cur]))
    if (!raw) throw new Error(`مقداری در مسیر «${fx.api.paths[cur]}» نبود`)
    return { rate: Math.round(fx.api.unit === 'ریال' ? raw / 10 : raw), at: new Date().toISOString(), source: 'api' }
  } catch (e) {
    return { ...saved, error: (e as Error).name === 'AbortError' ? 'API در ۸ ثانیه پاسخ نداد.' : (e as Error).message }
  }
}

/** ذخیرهٔ نرخ‌های روز برای همهٔ ارزها (دکمهٔ «به‌روزرسانی از API») */
export async function refreshAll() {
  const res = await Promise.all(FX_CURS.map(async (c) => [c, await fetchRate(c)] as const))
  const ok = res.filter(([, r]) => r.source !== 'saved')
  if (ok.length) mutate((x) => { ok.forEach(([c, r]) => { x.storeCfg.fx.rates[c] = r.rate }); x.storeCfg.fx.updatedAt = new Date().toISOString(); x.storeCfg.fx.source = 'api' }, { action: 'به‌روزرسانی نرخ روز ارز از API', target: ok.map(([c, r]) => `${c}: ${r.rate}`).join('، ') })
  return res
}
