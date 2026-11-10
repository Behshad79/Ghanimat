import { useSyncExternalStore } from 'react'
import { makeSeed, type DB } from '../data/seed'

// ───── پایگاه‌دادهٔ نمونه: در مرورگر ذخیره می‌شود و با «بازنشانی دادهٔ نمونه» به حالت اول برمی‌گردد ─────
const DB_KEY = 'ghanimat-demo-db-v1'
const S_KEY = 'ghanimat-demo-session-v1'
const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }

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
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  dbSubs.forEach((f) => f())
}
/** برای Undo: عکس فوری از داده و تابع بازگردانی */
export function snapshot() { const prev = db; return () => { db = prev; localStorage.setItem(DB_KEY, JSON.stringify(db)); dbSubs.forEach((f) => f()) } }
export function resetDB() { db = makeSeed(); localStorage.setItem(DB_KEY, JSON.stringify(db)); dbSubs.forEach((f) => f()) }

// ───── نقش‌ها و حساب‌های نمونه (بخش ۱۸.۳) ─────
export type Face = 'full' | 'simple' | 'partner'
export const ROLES: Record<string, { label: string; face: Face; modules: string[] | '*'; home: string; opens: string }> = {
  super: { label: 'مدیر کل', face: 'full', modules: '*', home: '/admin', opens: 'پنل کامل، همهٔ ماژول‌ها' },
  ops: { label: 'مدیر عملیات', face: 'full', modules: ['home', 'live', 'orders', 'warehouse', 'shipping', 'print', 'returns', 'catalog', 'team'], home: '/admin/live', opens: 'سفارش‌ها، انبار، ارسال، مرجوعی' },
  simple: { label: 'اپراتور ساده', face: 'simple', modules: [], home: '/simple', opens: 'حالت ساده' },
  partner: { label: 'شریک انبار مهاباد', face: 'partner', modules: [], home: '/partner', opens: 'پرتال شریک' },
  support: { label: 'کارشناس پشتیبانی', face: 'full', modules: ['home', 'support', 'customers', 'orders', 'reviews', 'returns'], home: '/admin/support', opens: 'صندوق ورودی' },
  finance: { label: 'کارشناس مالی', face: 'full', modules: ['home', 'finance', 'orders', 'pricing', 'returns', 'analytics'], home: '/admin/finance', opens: 'مالی و تسویه' },
  growth: { label: 'مارکتینگ، سئو و رشد', face: 'full', modules: ['home', 'marketing', 'seo', 'growth', 'analytics', 'content', 'channels', 'pricing', 'reviews'], home: '/admin/marketing', opens: 'مارکتینگ، سئو، رشد، تحلیل' },
  qc: { label: 'کارشناس کنترل کیفیت و انبار', face: 'full', modules: ['home', 'warehouse', 'catalog', 'print'], home: '/admin/warehouse', opens: 'صف‌های انبار (نسخهٔ iPad)' },
}

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
let session: Session = { ...defaults, ...(read<Session>(S_KEY) ?? {}), viewState: 'normal' }
const sSubs = new Set<() => void>()
const subS = (f: () => void) => { sSubs.add(f); return () => sSubs.delete(f) }
export const getSession = () => session
export function useSession(): Session { return useSyncExternalStore(subS, getSession) }
export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  localStorage.setItem(S_KEY, JSON.stringify(session))
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
export const can = (module: string, s: Session = session) => { const m = ROLES[effectiveRole(s)]?.modules; return m === '*' || (m ?? []).includes(module) }
/** شبیه‌سازی سرویس بیرونی با نتیجهٔ قابل انتخاب از نوار نمایشی */
export const fakeCall = <T,>(ok: T, ms = 900) => new Promise<T>((res, rej) => setTimeout(() => (session.simulate === 'fail' ? rej(new Error('سرویس پاسخ نداد')) : res(ok)), session.simulate === 'slow' ? ms * 4 : ms))
