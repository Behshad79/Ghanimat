// خروجی چاپ: PDF با اندازهٔ کاغذ دلخواه برای هر سند، و چاپ در پنجرهٔ جدا (وقتی پنل داخل قاب است و چاپ مستقیم بسته است)
// تصویر هر صفحه با html-to-image ساخته می‌شود تا فونت فارسی و ظاهر سند عیناً همان پیش‌نمایش باشد.

/** اندازهٔ کاغذها به میلی‌متر؛ h=0 یعنی رول (ارتفاع به اندازهٔ محتوا) */
export const PAPERS: Record<string, { w: number; h: number; label: string }> = {
  A4: { w: 210, h: 297, label: 'A4 (۲۱۰×۲۹۷)' },
  'A4 افقی': { w: 297, h: 210, label: 'A4 افقی' },
  A5: { w: 148, h: 210, label: 'A5 (۱۴۸×۲۱۰)' },
  'A5 افقی': { w: 210, h: 148, label: 'A5 افقی (قانون پست)' },
  A6: { w: 105, h: 148, label: 'A6 (۱۰۵×۱۴۸)' },
  Letter: { w: 216, h: 279, label: 'Letter' },
  '100x150': { w: 100, h: 150, label: 'برچسب حرارتی ۱۰۰×۱۵۰' },
  '100x100': { w: 100, h: 100, label: 'برچسب حرارتی ۱۰۰×۱۰۰' },
  '80mm': { w: 80, h: 0, label: 'رول ۸۰ میلی‌متری (فیش)' },
  '58mm': { w: 58, h: 0, label: 'رول ۵۸ میلی‌متری' },
  'کارت ۸۵×۵۴': { w: 85.6, h: 54, label: 'کارت ۸۵×۵۴' },
  '50x30': { w: 50, h: 30, label: 'برچسب ۵۰×۳۰' },
}
/** نام کاغذهای قدیمی پنل به کلید استاندارد */
export const paperKey = (p: string) => (p === '۸۰ میلی‌متر' ? '80mm' : p === 'A4 و برچسب' ? 'A4' : PAPERS[p] ? p : 'A4')

export type OutPage = { el: HTMLElement; paper: string; name?: string }

async function snap(el: HTMLElement) {
  const { toJpeg } = await import('html-to-image')
  // در سند راست‌به‌چپ، محتوای پهن‌تر از برگه به سمت چپ بیرون می‌زند؛ کادر کامل همهٔ فرزندها اندازه گرفته می‌شود تا چیزی بریده نشود
  const r = el.getBoundingClientRect(); let minL = r.left, maxR = r.right, maxB = r.bottom
  el.querySelectorAll('*').forEach((c) => { const b = c.getBoundingClientRect(); if (b.width && b.height && !(c as HTMLElement).closest('.no-print')) { minL = Math.min(minL, b.left); maxR = Math.max(maxR, b.right); maxB = Math.max(maxB, b.bottom) } })
  const shift = Math.round(r.left - minL); const w = Math.ceil(maxR - minL); const h = Math.ceil(Math.max(el.scrollHeight, maxB - r.top))
  const url = await toJpeg(el, { quality: 0.92, pixelRatio: 2, backgroundColor: '#ffffff', width: w, height: h, cacheBust: true, style: { margin: '0', transform: shift ? `translateX(${shift}px)` : 'none', boxShadow: 'none' }, filter: (n) => !(n instanceof HTMLElement && n.classList.contains('no-print')) })
  return { url, w, h }
}

/** ساخت PDF از صفحه‌ها؛ هر صفحه با کاغذ خودش. تصویر بدون تغییر نسبت، در کاغذ جا داده می‌شود. */
export async function toPdf(pages: OutPage[], onProgress?: (i: number, n: number) => void): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  let pdf: InstanceType<typeof jsPDF> | null = null
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length)
    const P = PAPERS[paperKey(pages[i].paper)]; const s = await snap(pages[i].el)
    const m = P.h ? 4 : 2; const aw = P.w - m * 2
    const ph = P.h || (aw * s.h) / s.w + m * 2; const ah = ph - m * 2
    const k = Math.min(aw / s.w, ah / s.h); const iw = s.w * k, ih = s.h * k
    const fmt: [number, number] = [P.w, ph]; const ori = P.w > ph ? 'l' : 'p'
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: fmt, orientation: ori, compress: true }); else pdf.addPage(fmt, ori)
    pdf.addImage(s.url, 'JPEG', (P.w - iw) / 2, m, iw, ih, undefined, 'FAST')
  }
  if (!pdf) throw new Error('صفحه‌ای برای خروجی نیست.')
  return pdf.output('blob')
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click()
  setTimeout(() => a.remove(), 1500)
  return url
}

/** چاپ در پنجرهٔ جدا با اندازهٔ کاغذ؛ اگر مرورگر پنجره را ببندد false برمی‌گردد */
export async function printPages(pages: OutPage[]): Promise<boolean> {
  const w = window.open('', '_blank'); if (!w) return false
  const imgs = await Promise.all(pages.map(async (p) => ({ ...(await snap(p.el)), P: PAPERS[paperKey(p.paper)] })))
  const css = imgs.map((x, i) => `@page p${i} { size: ${x.P.w}mm ${x.P.h ? `${x.P.h}mm` : 'auto'}; margin: 0 } .p${i} { page: p${i}; width: ${x.P.w}mm; ${x.P.h ? `height: ${x.P.h}mm;` : ''} }`).join('\n')
  w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>چاپ</title><style>body{margin:0;background:#fff} .pg{display:flex;align-items:flex-start;justify-content:center;box-sizing:border-box;padding:3mm;break-after:page;page-break-after:always;overflow:hidden} .pg:last-child{break-after:auto} .pg img{max-width:100%;max-height:100%;object-fit:contain} ${css}</style></head><body>${imgs.map((x, i) => `<div class="pg p${i}"><img src="${x.url}"></div>`).join('')}<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script></body></html>`)
  w.document.close(); return true
}
