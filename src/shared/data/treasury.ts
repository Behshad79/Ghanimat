// حسابداری و خزانه: پولِ خودِ کسب‌وکار (نه پول فروش)؛ حساب‌ها، هزینه‌ها و مستندها، اشتراک‌های تکرارشونده، سرمایه و برداشت شرکا، بودجه و سود و زیان واقعی
export type TAccount = { id: string; name: string; kind: 'bank' | 'card' | 'cash' | 'gateway' | 'capital' | 'fx'; bank?: string; last4?: string; iban?: string; opening: number; color: string; restricted?: boolean; sms?: boolean; note?: string; active: boolean }
/** هر ردیف دفتر: from = حسابی که پول از آن رفت، to = حسابی که پول به آن آمد. هزینه فقط from، درآمد و سرمایه فقط to، انتقال هر دو */
export type TEntry = {
  id: string; at: string; kind: 'expense' | 'income' | 'transfer' | 'capital' | 'loan' | 'draw'; amount: number; from?: string; to?: string
  category?: string; vendor?: string; note?: string; doc?: string; fx?: { amount: number; cur: string; rate: number; fee: number }
  status: 'paid' | 'approval' | 'rejected'; by: string; approvedBy?: string; tax?: boolean; investor?: string; recurring?: string; sms?: string
  /** سابقهٔ ویرایش‌ها: چه کسی، کی، چه چیزی را عوض کرد */
  edits?: { at: string; by: string; changes: string }[]
}
export type TRecurring = { id: string; title: string; category: string; amount: number; fx?: { amount: number; cur: string; fee: number }; every: 'monthly' | 'quarterly' | 'yearly'; next: string; account: string; vendor?: string; remind: number; active: boolean }
export type TInvestor = { id: string; name: string; kind: 'equity' | 'loan' | 'founder'; committed: number; share?: number; note?: string }
export type TSms = { id: string; at: string; account: string; amount: number; dir: 'out' | 'in'; text: string; entry?: string }
export type TreasuryDB = { accounts: TAccount[]; entries: TEntry[]; recurring: TRecurring[]; investors: TInvestor[]; budgets: Record<string, number>; sms: TSms[]; cap: number; feePct: number }

export const T_CATS = ['هاست، دامنه و سرور', 'اشتراک هوش مصنوعی و نرم‌افزار', 'تولید محتوا و عکاسی', 'تبلیغات و بازاریابی', 'حقوق و دستمزد', 'بسته‌بندی و ملزومات', 'حمل و پیک (هزینهٔ عمومی)', 'اجاره و قبوض', 'مالیات، عوارض و مجوزها', 'خدمات حسابداری و حقوقی', 'پیامک و تلفن', 'کارمزد بانکی', 'سایر']
export const KIND_LABEL: Record<TEntry['kind'], string> = { expense: 'هزینه', income: 'درآمد غیرفروش', transfer: 'انتقال بین حساب‌ها', capital: 'ورود سرمایه', loan: 'دریافت وام', draw: 'برداشت شریک' }
export const ACC_KIND: Record<TAccount['kind'], string> = { bank: 'حساب بانکی', card: 'کارت پرداخت (تنخواه)', cash: 'صندوق نقدی', gateway: 'موجودی درگاه', capital: 'حساب سرمایه', fx: 'کیف ارزی (واسط)' }

/** موجودی هر حساب = مانده اول + ورودی‌ها − خروجی‌ها (فقط ردیف‌های پرداخت‌شده) */
export const balanceOf = (t: TreasuryDB, acc: string, until = Infinity) => {
  const a = t.accounts.find((x) => x.id === acc); if (!a) return 0
  return t.entries.filter((e) => e.status === 'paid' && +new Date(e.at) <= until).reduce((s, e) => s + (e.to === acc ? e.amount : 0) - (e.from === acc ? e.amount : 0), a.opening)
}
export const monthKey = (iso: string | Date) => { const d = typeof iso === 'string' ? new Date(iso) : iso; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
export const nextDue = (iso: string, every: TRecurring['every']) => { const d = new Date(iso); d.setMonth(d.getMonth() + (every === 'monthly' ? 1 : every === 'quarterly' ? 3 : 12)); return d.toISOString() }
/** مبلغ تومانی هزینهٔ ارزی: مبلغ × نرخ خرید واقعی از واسط × (۱ + کارمزد) */
export const fxToman = (amount: number, rate: number, fee: number) => Math.round((amount * rate * (1 + fee / 100)) / 1000) * 1000

export function makeTreasury(usd: number): TreasuryDB {
  const now = Date.now(); const day = (n: number, h = 11) => { const d = new Date(now - n * 864e5); d.setHours(h, 0, 0, 0); return d.toISOString() }
  const fut = (n: number) => new Date(now + n * 864e5).toISOString()
  let i = 0; const id = () => `TR-${String(++i).padStart(4, '0')}`
  const rate = Math.round(usd * 1.12 / 100) * 100 // نرخ خرید واقعی از واسط معمولاً بالاتر از نرخ مرجع است
  const E: TEntry[] = []
  const add = (e: Omit<TEntry, 'id' | 'status' | 'by'> & Partial<Pick<TEntry, 'status' | 'by'>>) => E.push({ id: id(), status: 'paid', by: 'بهشاد', ...e })
  // سرمایه
  add({ at: day(88), kind: 'capital', amount: 1_500_000_000, to: 'cap', investor: 'inv1', note: 'مرحلهٔ اول سرمایهٔ فرشته؛ طبق تفاهم‌نامه', doc: 'تفاهم‌نامه-سرمایه-۱۴۰۵.pdf' })
  add({ at: day(90), kind: 'capital', amount: 400_000_000, to: 'ops', investor: 'inv2', note: 'آوردهٔ نقدی مؤسس برای راه‌اندازی' })
  add({ at: day(70), kind: 'loan', amount: 300_000_000, to: 'ops', investor: 'inv3', note: 'وام قرض‌الحسنه؛ بازپرداخت ۱۲ قسط از دی', doc: 'قرارداد-وام.pdf' })
  // برداشت تدریجی از حساب سرمایه
  ;[85, 55, 25].forEach((n, k) => add({ at: day(n), kind: 'transfer', amount: [250_000_000, 200_000_000, 200_000_000][k], from: 'cap', to: 'ops', note: `برداشت ماه ${['اول', 'دوم', 'سوم'][k]} برای خرید کالا و هزینه‌های جاری` }))
  ;[80, 50, 20].forEach((n) => add({ at: day(n), kind: 'transfer', amount: 15_000_000, from: 'ops', to: 'petty', note: 'شارژ کارت تنخواه' }))
  ;[60, 30].forEach((n) => add({ at: day(n), kind: 'transfer', amount: 7_000_000, from: 'ops', to: 'fxw', note: 'شارژ کیف ارزی واسط برای اشتراک‌های خارجی' }))
  // تسویهٔ درگاه به حساب جاری
  ;[75, 45, 15, 3].forEach((n, k) => add({ at: day(n), kind: 'transfer', amount: [180_000_000, 260_000_000, 310_000_000, 95_000_000][k], from: 'zp', to: 'ops', note: 'تسویهٔ درگاه زرین‌پال' }))
  // هزینه‌های ماهانه در سه ماه
  for (const [m, base] of [[0, 2], [1, 32], [2, 62]] as [number, number][]) {
    add({ at: day(base + 1), kind: 'expense', amount: 1_850_000, from: 'ops', category: T_CATS[0], vendor: 'ابر آروان', note: 'سرور ابری و CDN ماهانه', tax: true, recurring: 'RC-1' })
    add({ at: day(base + 2), kind: 'expense', amount: fxToman(20, rate, 6), from: 'fxw', category: T_CATS[1], vendor: 'OpenAI', note: 'ChatGPT Plus', fx: { amount: 20, cur: 'دلار', rate, fee: 6 }, recurring: 'RC-2' })
    add({ at: day(base + 2), kind: 'expense', amount: fxToman(20, rate, 6), from: 'fxw', category: T_CATS[1], vendor: 'Anthropic', note: 'Claude Pro', fx: { amount: 20, cur: 'دلار', rate, fee: 6 }, recurring: 'RC-3' })
    add({ at: day(base + 3), kind: 'expense', amount: fxToman(15, rate, 6), from: 'fxw', category: T_CATS[1], vendor: 'Figma', note: 'Figma Professional (یک صندلی)', fx: { amount: 15, cur: 'دلار', rate, fee: 6 }, recurring: 'RC-4' })
    add({ at: day(base + 5), kind: 'expense', amount: [26_000_000, 22_000_000, 18_000_000][m], from: 'ops', category: T_CATS[3], vendor: 'تبلیغات اینستاگرام', note: 'کمپین استوری و پیج‌های تخصصی' })
    add({ at: day(base + 6), kind: 'expense', amount: [12_000_000, 9_500_000, 14_000_000][m], from: 'ops', category: T_CATS[2], vendor: 'استودیو عکاسی محصول', note: 'عکاسی کالاهای تازه و ویدیوی جعبه‌گشایی', tax: true })
    add({ at: day(base + 8), kind: 'expense', amount: [5_400_000, 6_100_000, 4_800_000][m], from: 'petty', category: T_CATS[5], vendor: 'لوازم بسته‌بندی بازار', note: 'کارتن، پلاستیک حباب‌دار، چسب برند' })
    add({ at: day(base + 10), kind: 'expense', amount: 3_000_000, from: 'ops', category: T_CATS[10], vendor: 'پنل پیامک', note: 'شارژ خط خدماتی', tax: true, recurring: 'RC-6' })
    add({ at: day(base + 12), kind: 'expense', amount: 46_000_000, from: 'ops', category: T_CATS[4], note: 'حقوق پارسا (سرپرست تیم) و کارآموزان: نسترن، معصومه، بنیامین، زینب', recurring: 'RC-7' })
    add({ at: day(base + 14), kind: 'expense', amount: 4_000_000, from: 'ops', category: T_CATS[9], vendor: 'دفتر حسابداری', note: 'خدمات حسابداری ماهانه و اظهارنامه', tax: true })
    add({ at: day(base + 15), kind: 'expense', amount: [2_300_000, 1_900_000, 2_600_000][m], from: 'petty', category: T_CATS[6], vendor: 'پیک محلی', note: 'رفت‌وآمد خرید و تحویل اسناد' })
  }
  add({ at: day(40), kind: 'expense', amount: 950_000, from: 'ops', category: T_CATS[0], vendor: 'ایرنیک', note: 'تمدید دامنهٔ ghanimat.ir (یک‌ساله)', tax: true, recurring: 'RC-5' })
  add({ at: day(66), kind: 'expense', amount: 7_800_000, from: 'ops', category: T_CATS[8], vendor: 'اتحادیه و اینماد', note: 'هزینهٔ مجوز کسب‌وکار اینترنتی و اینماد', tax: true })
  add({ at: day(9), kind: 'income', amount: 2_400_000, to: 'ops', category: 'سایر', note: 'سود سپردهٔ کوتاه‌مدت حساب سرمایه' })
  add({ at: day(4), kind: 'draw', amount: 20_000_000, from: 'ops', investor: 'inv2', note: 'برداشت شخصی مؤسس (علی‌الحساب)' })
  add({ at: day(1), kind: 'expense', amount: 38_000_000, from: 'ops', category: T_CATS[3], vendor: 'آژانس تبلیغاتی', note: 'کمپین یلدا (پیش‌پرداخت ۵۰٪)', status: 'approval', by: 'دستیار بهشاد' })
  return {
    accounts: [
      { id: 'ops', name: 'حساب جاری اصلی', kind: 'bank', bank: 'بانک ملت', last4: '۴۴۱۲', iban: 'IR12 0120 0000 0000 0000 4412', opening: 0, color: '#0000ff', sms: true, active: true },
      { id: 'cap', name: 'حساب سرمایه (جدا)', kind: 'capital', bank: 'بانک پاسارگاد', last4: '۹۰۳۱', opening: 0, color: '#12733f', restricted: true, note: 'پول سرمایه‌گذار فقط با «انتقال» به حساب جاری خرج می‌شود', active: true },
      { id: 'petty', name: 'کارت تنخواه', kind: 'card', bank: 'بانک ملت', last4: '۷۷۰۶', opening: 0, color: '#b45309', sms: true, note: 'پیامک برداشت این کارت خودکار «هزینهٔ بی‌دسته» می‌سازد', active: true },
      { id: 'zp', name: 'موجودی درگاه زرین‌پال', kind: 'gateway', opening: 0, color: '#7c3aed', note: 'فروش‌های تسویه‌نشده؛ از «مالی» تغذیه می‌شود', active: true },
      { id: 'fxw', name: 'کیف ارزی واسط', kind: 'fx', opening: 0, color: '#475569', note: 'شارژ ریالی برای پرداخت اشتراک‌های خارجی', active: true },
      { id: 'cash', name: 'صندوق نقدی دفتر', kind: 'cash', opening: 3_000_000, color: '#be123c', active: true },
    ],
    entries: E.concat([{ id: id(), at: day(10), kind: 'income', amount: 845_000_000, to: 'zp', category: 'فروش (خلاصهٔ درگاه)', note: 'جمع فروش سه ماه از درگاه؛ ریز آن در «مالی»', status: 'paid', by: 'سیستم' }]),
    recurring: [
      { id: 'RC-1', title: 'سرور ابری و CDN', category: T_CATS[0], amount: 1_850_000, every: 'monthly', next: fut(3), account: 'ops', vendor: 'ابر آروان', remind: 3, active: true },
      { id: 'RC-2', title: 'ChatGPT Plus', category: T_CATS[1], amount: fxToman(20, rate, 6), fx: { amount: 20, cur: 'دلار', fee: 6 }, every: 'monthly', next: fut(6), account: 'fxw', vendor: 'OpenAI', remind: 3, active: true },
      { id: 'RC-3', title: 'Claude Pro', category: T_CATS[1], amount: fxToman(20, rate, 6), fx: { amount: 20, cur: 'دلار', fee: 6 }, every: 'monthly', next: fut(6), account: 'fxw', vendor: 'Anthropic', remind: 3, active: true },
      { id: 'RC-4', title: 'Figma Professional', category: T_CATS[1], amount: fxToman(15, rate, 6), fx: { amount: 15, cur: 'دلار', fee: 6 }, every: 'monthly', next: fut(1), account: 'fxw', vendor: 'Figma', remind: 3, active: true },
      { id: 'RC-5', title: 'دامنهٔ ghanimat.ir', category: T_CATS[0], amount: 950_000, every: 'yearly', next: fut(325), account: 'ops', vendor: 'ایرنیک', remind: 14, active: true },
      { id: 'RC-6', title: 'شارژ پنل پیامک', category: T_CATS[10], amount: 3_000_000, every: 'monthly', next: fut(8), account: 'ops', vendor: 'پنل پیامک', remind: 2, active: true },
      { id: 'RC-7', title: 'حقوق تیم', category: T_CATS[4], amount: 46_000_000, every: 'monthly', next: fut(10), account: 'ops', remind: 3, active: true },
    ],
    investors: [
      { id: 'inv1', name: 'سرمایه‌گذار فرشتهٔ مرحلهٔ اول', kind: 'equity', committed: 3_000_000_000, share: 12, note: 'تعهد ۳ میلیارد در دو مرحله؛ گزارش مصرف سرمایه ماهانه' },
      { id: 'inv2', name: 'آوردهٔ مؤسس (بهشاد)', kind: 'founder', committed: 400_000_000 },
      { id: 'inv3', name: 'وام قرض‌الحسنهٔ بانکی', kind: 'loan', committed: 300_000_000, note: '۱۲ قسط ۲۵ میلیونی از دی' },
    ],
    budgets: { [T_CATS[0]]: 3_000_000, [T_CATS[1]]: 6_000_000, [T_CATS[2]]: 12_000_000, [T_CATS[3]]: 30_000_000, [T_CATS[4]]: 50_000_000, [T_CATS[5]]: 6_000_000, [T_CATS[6]]: 3_000_000, [T_CATS[9]]: 5_000_000, [T_CATS[10]]: 3_500_000 },
    sms: [
      { id: 'SMS-1', at: day(0, 9), account: 'petty', amount: 1_250_000, dir: 'out', text: 'بانک ملت\nبرداشت: ۱,۲۵۰,۰۰۰\nکارت ۷۷۰۶\nفروشگاه لوازم التحریر\nمانده: ۲,۴۱۰,۰۰۰' },
      { id: 'SMS-2', at: day(1, 18), account: 'petty', amount: 480_000, dir: 'out', text: 'بانک ملت\nبرداشت: ۴۸۰,۰۰۰\nکارت ۷۷۰۶\nاسنپ\nمانده: ۳,۶۶۰,۰۰۰' },
      { id: 'SMS-3', at: day(2, 12), account: 'ops', amount: 95_000_000, dir: 'in', text: 'بانک ملت\nواریز: ۹۵,۰۰۰,۰۰۰\nحساب ۴۴۱۲\nتسویه شاپرک' },
    ],
    cap: 20_000_000, feePct: 6,
  }
}
