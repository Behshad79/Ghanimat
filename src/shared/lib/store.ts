import { useSyncExternalStore } from 'react'
import { makeSeed, type DB } from '../data/seed'
import { BASE_ROLES, type RoleDef } from '../data/roles'
import { CONDITION, SOURCE } from '../data/statuses'
import { ledgerHook } from '../data/ledger'

// ───── پایگاه‌دادهٔ نمونه: در مرورگر ذخیره می‌شود و با «بازنشانی دادهٔ نمونه» به حالت اول برمی‌گردد ─────
const DB_KEY = 'ghanimat-demo-db-v82'
const S_KEY = 'ghanimat-demo-session-v2'
const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
/** ذخیره‌سازی مرورگر ممکن است در دسترس نباشد؛ پنل بدون آن هم باید کار کند */
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* فقط در حافظه */ } }

let db: DB = read<DB>(DB_KEY) ?? makeSeed()
const dbSubs = new Set<() => void>()
const subDB = (f: () => void) => { dbSubs.add(f); return () => dbSubs.delete(f) }
export const getDB = () => db
export function useDB(): DB { return useSyncExternalStore(subDB, getDB) }
// ───── سند خودکار لاگ ممیزی: مقایسهٔ قبل و بعد هر اقدام، تا روشن باشد دقیقاً چه چیزی عوض شد ─────
const SENSITIVE = /تسویه|بازگشت وجه|قیمت|موجودی|دسترسی|نقش|حذف|لغو|غیرفعال|شریک|پرداخت|مالک/
const KEY_LABEL: Record<string, string> = { orders: 'سفارش', products: 'کالا', units: 'واحد', refunds: 'بازگشت وجه', team: 'عضو تیم', access: 'دسترسی', roleDefs: 'نقش', rules: 'قانون', txns: 'تراکنش', returns: 'مرجوعی', customers: 'مشتری' }
const STOCK_LABEL: Record<string, string> = { lots: 'موجودی شرکا', sales: 'فروش شرکا', settlements: 'تسویه', parties: 'شریک', warehouses: 'انبار', channels: 'کانال فروش', agreements: 'قرارداد سهم', codes: 'بارکد شریک', rules: 'قاعدهٔ تسویه' }
const FIELD: Record<string, string> = { status: 'وضعیت', qty: 'تعداد', price: 'قیمت', cost: 'بهای تمام‌شده', shipments: 'مرسوله', items: 'اقلام', warehouse: 'انبار', owner: 'مالک', amount: 'مبلغ', active: 'فعال', role: 'نقش', tracking: 'کد رهگیری', courier: 'پیک', pack: 'بسته‌بندی', priceNew: 'قیمت نو', discount: 'تخفیف', total: 'جمع', handlingFee: 'هزینهٔ ارسال', sellerPct: 'درصد فروشنده', title: 'عنوان', cancelled: 'لغو', variations: 'تنوع‌ها' }
const short = (v: unknown) => { const t = typeof v === 'string' ? v : JSON.stringify(v); return t === undefined ? '—' : t.length > 48 ? `${t.slice(0, 46)}…` : t }
function diffList(label: string, a: unknown, b: unknown, out: string[], depth = 0) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const keyOf = (x: Record<string, unknown>, i: number) => String(x?.id ?? x?.code ?? x?.key ?? i)
    const A = new Map(a.map((x, i) => [keyOf(x, i), x])); const B = new Map(b.map((x, i) => [keyOf(x, i), x]))
    B.forEach((v, k) => { if (!A.has(k)) out.push(`${label} ${k}: افزوده شد`) })
    A.forEach((v, k) => { if (!B.has(k)) out.push(`${label} ${k}: حذف شد`) })
    B.forEach((v, k) => { const o = A.get(k); if (!o || JSON.stringify(o) === JSON.stringify(v)) return
      if (typeof v !== 'object' || !v) { out.push(`${label} ${k}: ${short(o)} ← ${short(v)}`); return }
      const fields = Object.keys({ ...(o as object), ...(v as object) }).filter((f) => JSON.stringify((o as Record<string, unknown>)[f]) !== JSON.stringify((v as Record<string, unknown>)[f]))
      fields.slice(0, 5).forEach((f) => { const x = (o as Record<string, unknown>)[f]; const y = (v as Record<string, unknown>)[f]; if (depth < 2 && x && y && typeof x === 'object' && typeof y === 'object') diffList(`${label} ${k} › ${FIELD[f] ?? f}`, x, y, out, depth + 1); else out.push(`${label} ${k} · ${FIELD[f] ?? f}: ${short(x)} ← ${short(y)}`) }) })
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    Object.keys({ ...(a as object), ...(b as object) }).forEach((f) => { const x = (a as Record<string, unknown>)[f]; const y = (b as Record<string, unknown>)[f]; if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${label} · ${f}: ${short(x)} ← ${short(y)}`) })
  } else out.push(`${label}: ${short(a)} ← ${short(b)}`)
}
function diffDB(prev: DB, next: DB) {
  const out: string[] = []
  for (const k of Object.keys(next) as (keyof DB)[]) {
    if (k === 'audit' || (k as string) === 'drafts') continue
    if (k === 'stock') { for (const sk of Object.keys(next.stock) as (keyof DB['stock'])[]) if (JSON.stringify(prev.stock?.[sk]) !== JSON.stringify(next.stock[sk])) diffList(STOCK_LABEL[sk] ?? sk, prev.stock?.[sk], next.stock[sk], out); continue }
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) diffList(KEY_LABEL[k] ?? k, prev[k], next[k], out)
    if (out.length > 30) break
  }
  return out.slice(0, 30)
}
export function mutate(fn: (d: DB) => void, log?: { action: string; target: string; before?: string; after?: string; ai?: boolean }) {
  const next = structuredClone(db)
  fn(next)
  try { ledgerHook(db, next, currentUser()?.name ?? 'سیستم') } catch (e) { console.error('ledger', e) }
  if (log) { let changes: string[] = []; try { changes = diffDB(db, next) } catch { /* سند اختیاری است */ }
    const u = currentUser(); next.audit.unshift({ at: new Date().toISOString(), who: u?.name ?? 'سیستم', role: u?.role, before: '-', after: '-', ai: false, ...log, changes, sensitive: SENSITIVE.test(log.action) || changes.some((c) => /^(تسویه|موجودی شرکا|فروش شرکا|بازگشت وجه|قیمت|دسترسی|نقش)/.test(c)) }) }
  db = next
  syncRoles()
  write(DB_KEY, db)
  dbSubs.forEach((f) => f())
}
/** برای Undo: عکس فوری از داده و تابع بازگردانی */
export function snapshot() { const prev = db; return () => { db = prev; syncRoles(); write(DB_KEY, db); dbSubs.forEach((f) => f()) } }
export function resetDB() { db = makeSeed(); syncRoles(); write(DB_KEY, db); dbSubs.forEach((f) => f()) }

// ───── نقش‌ها و حساب‌های نمونه (بخش ۱۸.۳) ─────
export type { Face } from '../data/roles'
/** نقش‌ها از پایگاه‌داده خوانده می‌شوند تا مدیر کل بتواند نقش تازه بسازد و دسترسی هر نقش را تغییر دهد */
export const ROLES: Record<string, RoleDef> = {}
function syncRoles() {
  for (const k of Object.keys(ROLES)) delete ROLES[k]; Object.assign(ROLES, db.roleDefs ?? BASE_ROLES)
  // برچسب‌های منبع تأمین و وضعیت کالا از فهرست قابل ویرایش خوانده می‌شوند
  db.opts?.source.forEach((o) => { SOURCE[o.v] = o.l }); db.opts?.condition.forEach((o) => { CONDITION[o.v] = o.l })
}
syncRoles()

export type ViewState = 'normal' | 'empty' | 'loading' | 'error' | 'noaccess' | 'offline'
export type Session = {
  userId: string | null
  viewAs: string | null // «مشاهده به‌جای…» فقط برای مدیر کل
  partnerId?: string // پرتال کدام شریک نمایش داده شود
  theme: 'light' | 'dark'
  density: 'comfortable' | 'normal' | 'compact'
  collapsed: boolean
  hints: 'always' | 'hover' | 'off'
  askAI: boolean
  google: boolean
  level: 'تازه‌کار' | 'معمولی' | 'حرفه‌ای'
  viewState: ViewState
  simulate: 'success' | 'fail' | 'slow' // نتیجهٔ سرویس‌های بیرونی شبیه‌سازی‌شده
  scope: 'all' | 'tehran' | 'mahabad'
  revealed: string[]
  pinned: string[]
  navClosed?: string[]
  pinMig?: number
  ordersInsights?: boolean
}
const defaults: Session = { userId: null, viewAs: null, theme: 'light', density: 'normal', collapsed: false, hints: 'hover', askAI: true, google: true, level: 'معمولی', viewState: 'normal', simulate: 'success', scope: 'all', revealed: [], pinned: ['catalog', 'warehouse', 'ownership'], pinMig: 1 }
// تم پیش‌فرض از ترجیح سیستم‌عامل خوانده می‌شود؛ از لحظه‌ای که کاربر تم را عوض کند، انتخاب او منبع حقیقت است.
const stored = read<Session>(S_KEY)
/** تم پیش‌فرض همیشه روشن است و از تم سیستم پیروی نمی‌کند؛ تیره فقط با انتخاب کاربر */
let session: Session = { ...defaults, ...(stored ?? {}), viewState: 'normal' }
// «کالا و کاتالوگ» یک بار به سنجاق‌های کاربران قبلی هم اضافه می‌شود
if (!session.pinMig) session = { ...session, pinned: [...new Set(['catalog', ...session.pinned])], pinMig: 1 }
const sSubs = new Set<() => void>()
const subS = (f: () => void) => { sSubs.add(f); return () => sSubs.delete(f) }
export const getSession = () => session
export function useSession(): Session { return useSyncExternalStore(subS, getSession) }
export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  write(S_KEY, session)
  applyTheme()
  sSubs.forEach((f) => f())
}
export function applyTheme() {
  document.documentElement.dataset.theme = session.theme
  document.documentElement.dataset.density = session.density
}
export const currentUser = () => db.team.find((u) => u.id === session.userId) ?? null
/** نقش مؤثر: اگر مدیر کل «مشاهده به‌جای…» را روشن کرده باشد، نقش همان فرد */
export const effectiveRole = (s: Session = session) => s.viewAs ?? currentUser()?.role ?? 'super'
/** مدیر کل: کارهای حساس او بدون تأیید دوم اجرا می‌شود (خودش تأییدکنندهٔ نهایی است) */
export const isChief = (s: Session = session) => effectiveRole(s) === 'super'
export const can = (module: string, s: Session = session) => {
  // دسترسی اختصاصی هر فرد بر نقش او مقدم است (افزوده یا گرفته‌شده از نقش)
  const u = s.viewAs ? null : currentUser(); const ov = u ? db.access?.[u.id] : undefined
  if (ov?.remove.includes(module)) return false
  if (ov?.add.includes(module)) return true
  const R = ROLES[effectiveRole(s)]; if (R?.deny?.includes(module)) return false
  const m = R?.modules; return m === '*' || (m ?? []).includes(module)
}
/** دیدن دادهٔ محرمانهٔ مدیر کل (سود کل، بهای تمام‌شدهٔ کالای غنیمت، حاشیهٔ سود، صورت‌حساب دیگران): فقط مدیر کل، یا کسی که مدیر کل «secrets» را برایش باز کرده */
export const canSecret = (s: Session = session) => { if (effectiveRole(s) === 'super') return true; const u = s.viewAs ? null : currentUser(); return !!(u && db.access?.[u.id]?.add.includes('secrets')) }
/** طرف (شریک) کاربر فعلی در دفتر شرکا */
export const myParty = () => db.stock?.parties.find((p) => p.userId === currentUser()?.id)?.id ?? 'gh'
/** شبیه‌سازی سرویس بیرونی با نتیجهٔ قابل انتخاب از نوار نمایشی */
export const fakeCall = <T,>(ok: T, ms = 900) => new Promise<T>((res, rej) => setTimeout(() => (session.simulate === 'fail' ? rej(new Error('سرویس پاسخ نداد')) : res(ok)), session.simulate === 'slow' ? ms * 4 : ms))

// ───── ابزارهای مشترک ─────
/** اعلان درون‌پنل برای مدیر (و طبق قوانین اعلان، پیامک یا پیام‌رسان) */
/** ارسال پیامک (شبیه‌سازی‌شده) و ثبت در «گزارش پیامک‌ها» */
export function sendSms(to: string, text: string, kind: string, ref = '', customerId?: string) {
  mutate((x) => { x.smsLog.unshift({ id: `sm${Date.now().toString(36)}`, to, customerId, kind, ref, text, status: db.flags.maintenance ? 'در صف' : 'تحویل شد', at: new Date().toISOString() }) }, { action: `ارسال پیامک ${kind}`, target: ref || to })
}
export function notify(title: string, body: string, to: string, cat = 'عملیات', tone: 'info' | 'warning' | 'danger' | 'success' = 'info') {
  mutate((x) => { x.alerts.unshift({ id: `al-${Date.now()}`, cat, tone, title, body, to, at: new Date().toISOString(), read: false }) })
}
/** بازگردانی از سطل بازیافت به جای اصلی */
export function restoreTrash(id: string) {
  mutate((x) => {
    const t = x.trash.find((i) => i.id === id); if (!t) return
    if (t.ek === 'products') (x.products as any[]).unshift(t.data)
    else if (t.ek === 'units') (x.units as any[]).unshift(t.data)
    else if (t.ek === 'vault') (x.vault as any[]).unshift(t.data)
    else (x.entities[t.ek] ??= []).unshift(t.data)
    x.trash = x.trash.filter((i) => i.id !== id)
  }, { action: 'بازگردانی از سطل بازیافت', target: id })
}
/** کد داخلی بعدی محصول یا واحد (قالب و شمارنده از تنظیمات) */
export function takeCode(kind: 'product' | 'unit'): string {
  const f = getDB().codeFormat
  const n = kind === 'product' ? f.nextProduct : f.nextUnit
  mutate((x) => { if (kind === 'product') x.codeFormat.nextProduct++; else x.codeFormat.nextUnit++ })
  return `${kind === 'product' ? f.product : f.unit}${String(n).padStart(kind === 'product' ? f.pDigits : f.uDigits, '0')}`
}

/** مجوز سه‌حالته برای کاربر فعلی (مدیر کل همیشه مجاز) */
export function permOf(action: string): 'allow' | 'approve' | 'deny' {
  const u = currentUser(); if (!u || u.role === 'super' || u.role === 'ops') return 'allow'
  return getDB().perms[u.id]?.[action]?.mode ?? 'allow'
}
