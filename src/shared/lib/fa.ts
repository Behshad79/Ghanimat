// قالب‌بندی فارسی: ارقام، تومان، تاریخ جلالی، زمان نسبی (بخش ۴.۳ قاعدهٔ ۹)
const D = '۰۱۲۳۴۵۶۷۸۹'
export const fa = (v: number | string) => String(v).replace(/\d/g, (d) => D[+d]).replace(/\./g, '٫')
export const num = (n: number) => String(Math.round(n).toLocaleString('en-US')).replace(/\d/g, (d) => D[+d]).replace(/,/g, '٬')
export const toman = (n: number) => `${num(n)} تومان`
export const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e9) return `${fa((n / 1e9).toFixed(1))} میلیارد`
  if (a >= 1e6) return `${fa((n / 1e6).toFixed(1))} میلیون`
  return num(n)
}
export const compactToman = (n: number) => `${compact(n)} تومان`
export const pct = (n: number, digits = 0) => `${fa(n.toFixed(digits))}٪`
export const signedPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fa(Math.abs(n).toFixed(1))}٪`

const dFull = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const dShort = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' })
export const jdate = (iso: string | number) => dFull.format(new Date(iso))
export const jday = (iso: string | number) => dShort.format(new Date(iso))

export const rel = (iso: string | number) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'همین حالا'
  if (m < 60) return `${fa(m)} دقیقه پیش`
  const h = Math.round(m / 60)
  if (h < 24) return `${fa(h)} ساعت پیش`
  const d = Math.round(h / 24)
  return d < 30 ? `${fa(d)} روز پیش` : jday(iso)
}
/** مهلت: «۴۲ دقیقه مانده» یا «۱۲ دقیقه گذشته» */
export const left = (iso: string | number) => {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  const a = Math.abs(m)
  const t = a < 60 ? `${fa(a)} دقیقه` : a < 1440 ? `${fa(Math.round(a / 60))} ساعت` : `${fa(Math.round(a / 1440))} روز`
  return m >= 0 ? `${t} مانده` : `${t} گذشته`
}
export const minsLeft = (iso: string | number) => Math.round((new Date(iso).getTime() - Date.now()) / 60000)
export const mask = (s: string, keepStart = 4, keepEnd = 2) => s.slice(0, keepStart) + '•'.repeat(Math.max(0, s.length - keepStart - keepEnd)) + s.slice(s.length - keepEnd)
export const csv = (rows: (string | number)[][]) => '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
export const download = (name: string, content: string, type = 'text/csv;charset=utf-8') => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** گرید «A+» در متن راست‌به‌چپ درست نمایش داده شود */
export const g = (grade: string) => grade + '\u200E'
