// تشخیص محدودهٔ ارسال از روی پین نقشهٔ مشتری (و در نبود پین، از متن نشانی)
import type { Delivery } from '../data/delivery'

type Fast = Delivery['fast']
export type Zone = Fast['zones'][number]
export type LatLng = [number, number]

/** فاصلهٔ دو نقطه روی زمین به کیلومتر (هاورساین) */
export function distKm(a: LatLng, b: LatLng) {
  const R = 6371; const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b[0] - a[0]); const dLng = r(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
/** آیا نقطه داخل چندضلعی است؟ (پرتو افقی) */
export function inPoly(p: LatLng, poly: LatLng[]) {
  if (poly.length < 3) return false
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]; const [yj, xj] = poly[j]
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi || 1e-12) + xi) inside = !inside
  }
  return inside
}
/** مساحت تقریبی چندضلعی (برای اولویت: محدودهٔ کوچک‌تر و دقیق‌تر اول بررسی می‌شود) */
const area = (poly: LatLng[]) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[1] * q[0] - q[1] * p[0] }, 0) / 2)
const zoneArea = (z: Zone) => (z.mode === 'radius' ? Math.PI * (z.radiusKm / 111) ** 2 : area(z.poly))

export function zoneHit(z: Zone, p: LatLng, origin: LatLng) {
  return z.mode === 'radius' ? distKm(origin, p) <= z.radiusKm : inPoly(p, z.poly)
}
/** محدوده‌ای که پین مشتری در آن است؛ اگر چند محدوده هم‌پوشان باشند، کوچک‌ترین (دقیق‌ترین) برنده است */
export function detectZone(f: Fast, p: LatLng): Zone | null {
  const o: LatLng = [f.origin.lat, f.origin.lng]
  return [...f.zones].filter((z) => z.on && zoneHit(z, p, o)).sort((a, b) => zoneArea(a) - zoneArea(b))[0] ?? null
}
/** پشتیبان: وقتی مشتری پین نگذاشته، نام شهر یا محله در متن نشانی با «محدوده»ی هر مقصد مقایسه می‌شود */
export function detectByText(f: Fast, address: string): Zone | null {
  const t = address.replace(/[،,]/g, ' ')
  const scored = f.zones.filter((z) => z.on).map((z) => ({ z, hit: [z.name, ...z.areas.split(/[،,]/)].map((w) => w.trim()).filter((w) => w.length > 1).filter((w) => t.includes(w)).sort((a, b) => b.length - a.length)[0] ?? '' })).filter((x) => x.hit)
  return scored.sort((a, b) => b.hit.length - a.hit.length)[0]?.z ?? null
}
