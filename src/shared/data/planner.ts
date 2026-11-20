// یادداشت، کار و برنامه‌ریزی شخصی هر عضو تیم: نمایش بالای صفحهٔ خانه از تاریخ دلخواه، یادآوری با اعلان پنل، پیامک یا ربات تلگرام، تکرار و همگام‌سازی با تقویم گوگل و لینک گوگل میت
export type Channel = 'panel' | 'sms' | 'telegram'
export type PNote = {
  id: string; owner: string; title: string; body?: string; kind: 'note' | 'task' | 'event'
  due?: string; allDay?: boolean; done?: boolean; doneAt?: string; pinned?: boolean; color?: string; tags?: string[]
  /** نمایش بالای صفحهٔ خانه از این روز (YYYY-MM-DD) تا انجام شدن یا تا روز until */
  home?: { from: string; until?: string }
  remind?: { at: string; ch: Channel[]; sent?: string }
  repeat?: 'daily' | 'weekly' | 'monthly'
  shared?: string[]
  gcal?: { on: boolean; meet?: string; synced?: string }
  link?: { label: string; to: string }
  createdAt: string; updatedAt?: string
}
export type PlannerDB = {
  notes: PNote[]
  google: { connected: boolean; account?: string; calendar: string; twoWay: boolean; meetDefault: boolean; lastSync?: string }
  defaults: { before: number; ch: Channel[]; digest: { on: boolean; at: string; ch: Channel[] } }
}

export const CH_LABEL: Record<Channel, string> = { panel: 'اعلان پنل', sms: 'پیامک', telegram: 'ربات تلگرام' }
export const COLORS = ['#0000ff', '#12733f', '#b45309', '#be123c', '#7c3aed', '#475569']

const pad = (n: number) => String(n).padStart(2, '0')
/** کلید روز محلی YYYY-MM-DD */
export const dayKey = (d: Date | string = new Date()) => { const x = typeof d === 'string' ? new Date(d) : d; return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
/** مقدار ورودی datetime-local از ISO و برعکس */
export const toLocalInput = (iso?: string) => { if (!iso) return ''; const x = new Date(iso); return `${dayKey(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}` }
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined)
export const nextRepeat = (iso: string, r: NonNullable<PNote['repeat']>) => { const x = new Date(iso); if (r === 'daily') x.setDate(x.getDate() + 1); else if (r === 'weekly') x.setDate(x.getDate() + 7); else x.setMonth(x.getMonth() + 1); return x.toISOString() }
export const meetLink = () => { const a = 'abcdefghijkmnopqrstuvwxyz'; const r = (n: number) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join(''); return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}` }

/** آیا این یادداشت برای این کاربر دیده می‌شود (مال خودش یا با او به اشتراک گذاشته شده) */
export const visibleTo = (n: PNote, uid: string) => n.owner === uid || !!n.shared?.includes(uid)
/** آیا امروز بالای صفحهٔ خانه نمایش داده شود */
export const onHome = (n: PNote, now = new Date()) => {
  if (n.done) return false; const k = dayKey(now)
  if (n.home && n.home.from <= k && (!n.home.until || n.home.until >= k)) return true
  return !!n.due && n.kind !== 'note' && dayKey(n.due) <= k
}

const FA = '۰۱۲۳۴۵۶۷۸۹'; const AR = '٠١٢٣٤٥٦٧٨٩'
const latin = (s: string) => s.replace(/[۰-۹]/g, (c) => String(FA.indexOf(c))).replace(/[٠-٩]/g, (c) => String(AR.indexOf(c)))
const WEEK: [RegExp, number][] = [[/یک\s?‌?شنبه/, 0], [/دو\s?‌?شنبه/, 1], [/سه\s?‌?شنبه/, 2], [/چهار\s?‌?شنبه/, 3], [/پنج\s?‌?شنبه/, 4], [/جمعه/, 5], [/(^|\s)شنبه/, 6]]

/** نوشتن آزاد: «فردا ساعت ۱۰ تماس با یوسف با پیامک یادم بنداز» ← عنوان، زمان، کانال یادآوری و نمایش در خانه */
export function parseQuick(raw: string, now = new Date()) {
  let t = ' ' + latin(raw) + ' '; let day: Date | null = null; let hasTime = false; let h = 9; let m = 0
  const take = (re: RegExp) => { const mm = t.match(re); if (mm) t = t.replace(mm[0], ' '); return mm }
  if (take(/پس\s?‌?فردا/)) day = addDays(now, 2)
  else if (take(/فردا/)) day = addDays(now, 1)
  else if (take(/امروز|امشب/)) day = new Date(now)
  else for (const [re, wd] of WEEK) { if (take(re)) { const diff = (wd - now.getDay() + 7) % 7 || 7; day = addDays(now, diff); break } }
  const inDays = take(/(\d{1,2})\s*روز\s*(دیگه|دیگر|بعد)/); if (inDays) day = addDays(now, +inDays[1])
  const tm = take(/ساعت\s*(\d{1,2})(?:[:٫.](\d{2}))?/) ?? take(/(\d{1,2}):(\d{2})/)
  if (tm) { hasTime = true; h = +tm[1]; m = tm[2] ? +tm[2] : 0 }
  if (take(/(بعد\s?از\s?ظهر|عصر|شب)/) && h < 12) h += 12
  take(/صبح/)
  const sms = !!take(/(با|از\s?طریق)\s*پیامک|پیامک\s*(بده|بزن|کن)/); const tg = !!take(/(با|از\s?طریق|توی|تو)\s*(ربات\s*)?تلگرام/)
  const rm = !!take(/یادم\s*(بنداز|بیار)|یادآوری\s*(کن)?|خبرم\s*کن|پوش\s*(بده|کن)/); const remind = sms || tg || rm
  const home = !!take(/(بالای|روی)\s*(صفحه(ٔ|ی)?\s*)?(اصلی|خانه)(\s*(نشون|نمایش)\s*(بده|بده‌ش))?/)
  if (!day && hasTime) { day = new Date(now); if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) day = addDays(day, 1) }
  let due: string | undefined
  if (day) { const x = new Date(day); x.setHours(h, m, 0, 0); due = x.toISOString() }
  const title = t.replace(/\s+/g, ' ').replace(/^[\s،,.-]+|[\s،,.-]+$/g, '').trim()
  const ch: Channel[] = ['panel', ...(sms ? ['sms' as const] : []), ...(tg ? ['telegram' as const] : [])]
  return { title: title || raw.trim(), due, allDay: !!day && !hasTime, remind: remind || (!!due && hasTime), ch, home: home || (!!day && !hasTime) }
}

export function makePlanner(): PlannerDB {
  const now = new Date(); const at = (dd: number, hh: number, mm = 0) => { const x = addDays(now, dd); x.setHours(hh, mm, 0, 0); return x.toISOString() }
  const c = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
  const soon = new Date(Date.now() + 3 * 6e4).toISOString()
  const nextSat = addDays(now, ((6 - now.getDay() + 7) % 7) || 7)
  return {
    notes: [
      { id: 'PN-01', owner: 'u1', kind: 'task', title: 'پیگیری درخواست نماد اعتماد (اینماد)', body: 'مدارک آپلود شده؛ کد رهگیری را از پنل اینماد چک کنم. اگر نقص مدرک خواستند، اجاره‌نامه را دوباره بفرستم.', due: at(0, 12), home: { from: dayKey(now) }, remind: { at: at(0, 11, 30), ch: ['panel', 'telegram'] }, tags: ['حقوقی'], color: '#be123c', createdAt: c(30) },
      { id: 'PN-02', owner: 'u1', kind: 'event', title: 'جلسه با یاسین: تسویهٔ ماهانه و برنامهٔ انبار مهاباد', body: 'دستور جلسه:\n- گزارش گردش و کارت کالای یاسین (چاپ از مالکیت و تسویه)\n- مغایرت دو قلم شیائومی\n- برنامهٔ ارسال سریع به بوکان و میاندوآب', due: at(1, 11), remind: { at: at(1, 10, 30), ch: ['panel', 'sms', 'telegram'] }, shared: ['u4'], gcal: { on: true, meet: 'https://meet.google.com/ghn-ysqm-tsv', synced: c(2) }, link: { label: 'گردش و کارت کالا', to: '/admin/ownership?tab=ledger' }, color: '#12733f', createdAt: c(20) },
      { id: 'PN-03', owner: 'u1', kind: 'task', title: 'تمدید هاست و دامنهٔ ghanimat.ir', body: 'هاست سالانه و دامنه هر دو در یک هفته منقضی می‌شوند. قبل از تمدید، پلن بزرگ‌تر را هم قیمت بگیرم.', due: at(6, 10), remind: { at: at(5, 10), ch: ['panel', 'sms'] }, tags: ['زیرساخت', 'هزینه'], color: '#b45309', createdAt: c(48) },
      { id: 'PN-04', owner: 'u1', kind: 'task', title: 'تماس با یوسف برای بچ جدید گلوتاتیون', body: 'بچ MCH-2409A یک بستهٔ آسیب‌دیده داشت؛ برای ورود بعدی بسته‌بندی محکم‌تر بخواهم.', due: soon, remind: { at: soon, ch: ['panel', 'telegram'] }, link: { label: 'کارت کالای یوسف', to: '/admin/ownership?tab=ledger' }, createdAt: c(1) },
      { id: 'PN-05', owner: 'u1', kind: 'note', title: 'ایده‌های کمپین یلدا', body: '- باندل هدفون + پاوربانک با ۸٪ تخفیف\n- ارسال رایگان بالای ۵ میلیون فقط تا ۳۰ آذر\n- استوری «کالای اصل، فاکتور رسمی» با ویدیوی جعبه‌گشایی\n- کد تخفیف اختصاصی برای خریداران آبان', pinned: true, tags: ['مارکتینگ'], color: '#7c3aed', createdAt: c(72) },
      { id: 'PN-06', owner: 'u1', kind: 'task', title: 'بررسی مغایرت موجودی انبار تهران', due: (() => { const x = new Date(nextSat); x.setHours(9, 30, 0, 0); return x.toISOString() })(), repeat: 'weekly', remind: { at: (() => { const x = new Date(nextSat); x.setHours(9, 0, 0, 0); return x.toISOString() })(), ch: ['panel'] }, link: { label: 'انبار و موجودی', to: '/admin/warehouse' }, tags: ['انبار'], createdAt: c(200) },
      { id: 'PN-07', owner: 'u1', kind: 'task', title: 'تأیید عکس‌های کالاهای استوک تازه', due: at(-1, 17), done: true, doneAt: c(14), createdAt: c(40) },
      { id: 'PN-08', owner: 'u4', kind: 'note', title: 'چک‌لیست باز کردن انبار مهاباد هر صبح', body: '- چک پیامک‌های شب\n- چاپ برچسب سفارش‌های دیشب\n- شمارش سریع کالاهای تک‌عددی', shared: ['u1'], pinned: true, color: '#12733f', createdAt: c(100) },
      { id: 'PN-09', owner: 'u1', kind: 'note', title: 'شمارهٔ پیک‌های همکار', body: 'حمید زارعی: پیک موتوری، صبح‌ها\nرضا احمدی: عصرها و جمعه‌ها', home: { from: dayKey(addDays(now, 1)), until: dayKey(addDays(now, 1)) }, createdAt: c(5) },
    ],
    google: { connected: true, account: 'تقویم کاری غنیمت', calendar: 'غنیمت · جلسه‌ها و سررسیدها', twoWay: true, meetDefault: true, lastSync: c(2) },
    defaults: { before: 30, ch: ['panel', 'telegram'], digest: { on: true, at: '08:00', ch: ['telegram'] } },
  }
}
