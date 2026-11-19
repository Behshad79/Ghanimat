// قیمت رقبا در ترب و ایمالز (نسخهٔ نمایشی: عدد ثابت و قابل تکرار برای هر کالا؛ در نسخهٔ نهایی از خزندهٔ «پایش قیمت» خوانده می‌شود)
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const r1e4 = (n: number) => Math.round(n / 1e4) * 1e4
export type Market = { torobMin: number; emallsMin: number; typical: number; sellers: number; at: string }
/** کمترین قیمت ترب و ایمالز و «قیمت عرف» (میانهٔ فروشندگان) برای یک کالا یا تنوع */
export function marketOf(key: string, ours: number): Market {
  const h = hash(key); const k = [1, 0.985, 1.01, 0.94, 1, 0.97, 0.99, 1.02, 0.96][h % 9]; const e = [1.01, 1, 0.975, 0.99, 0.95, 1, 1.03, 0.98, 1][(h >> 3) % 9]
  const torobMin = r1e4(ours * k * 1.04); const emallsMin = r1e4(ours * e * 1.05)
  return { torobMin, emallsMin, typical: r1e4(Math.max(torobMin, emallsMin) * 1.035), sellers: 3 + (h % 9), at: new Date(Date.now() - (h % 50) * 6e4).toISOString() }
}
