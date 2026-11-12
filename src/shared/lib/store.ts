import { useSyncExternalStore } from 'react'
import { makeSeed, type DB } from '../data/seed'
import { BASE_ROLES, type RoleDef } from '../data/roles'

// ───── پایگاه‌دادهٔ نمونه: در مرورگر ذخیره می‌شود و با «بازنشانی دادهٔ نمونه» به حالت اول برمی‌گردد ─────
const DB_KEY = 'ghanimat-demo-db-v19'
const S_KEY = 'ghanimat-demo-session-v1'
const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
/** ذخیره‌سازی مرورگر ممکن است در دسترس نباشد؛ پنل بدون آن هم باید کار کند */
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* فقط در حافظه */ } }

let db: DB = read<DB>(DB_KEY) ?? makeSeed()
const dbSubs = new Set<() => void>()
const subDB = (f: () => void) => { dbSubs.add(f); return () => dbSubs.delete(f) }
export const getDB = () => db
export function useDB(): DB { return useSyncExternalStore(subDB, getDB) }
export function mutate(fn: (d: DB) => void, log?: { action: string; target: string; before?: string; after?: string; ai?: boolean }) {
  const next = structuredClone(db)
  fn(next)
  if (log) next.audit.unshift({ at: new Date().toISOString(), who: currentUser()?.name ?? 'سیستم', before: '-', after: '-', ai: false, ...log })
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
function syncRoles() { for (const k of Object.keys(ROLES)) delete ROLES[k]; Object.assign(ROLES, db.roleDefs ?? BASE_ROLES) }
syncRoles()

export type ViewState = 'normal' | 'empty' | 'loading' | 'error' | 'noaccess' | 'offline'
export type Session = {
  userId: string | null
  viewAs: string | null // «مشاهده به‌جای…» فقط برای مدیر کل
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
}
const defaults: Session = { userId: null, viewAs: null, theme: 'light', density: 'normal', collapsed: false, hints: 'hover', askAI: true, google: true, level: 'معمولی', viewState: 'normal', simulate: 'success', scope: 'all', revealed: [], pinned: ['orders', 'warehouse'] }
// تم پیش‌فرض از ترجیح سیستم‌عامل خوانده می‌شود؛ از لحظه‌ای که کاربر تم را عوض کند، انتخاب او منبع حقیقت است.
const systemTheme = (): Session['theme'] => { try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' } catch { return 'light' } }
const stored = read<Session>(S_KEY)
let session: Session = { ...defaults, theme: systemTheme(), ...(stored ?? {}), viewState: 'normal' }
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
export const can = (module: string, s: Session = session) => {
  // دسترسی اختصاصی هر فرد بر نقش او مقدم است (افزوده یا گرفته‌شده از نقش)
  const u = s.viewAs ? null : currentUser(); const ov = u ? db.access?.[u.id] : undefined
  if (ov?.remove.includes(module)) return false
  if (ov?.add.includes(module)) return true
  const m = ROLES[effectiveRole(s)]?.modules; return m === '*' || (m ?? []).includes(module)
}
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
