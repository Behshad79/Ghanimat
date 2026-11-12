// پرونده‌های پرسنلی: اطلاعات هویتی، قراردادها، حقوق و بیمه، پرداخت‌ها، مساعده و وام، یادداشت‌های مکتوب (همهٔ داده‌ها نمونه است)
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString()

export type Contract = { id: string; title: string; kind: string; from: string; to: string; salary: number; file?: string; signed: boolean; note?: string }
export type PayItem = { id: string; date: string; type: string; amount: number; method: string; status: 'paid' | 'due' | 'scheduled'; note?: string; by?: string; loanId?: string }
export type Loan = { id: string; title: string; amount: number; installments: number; paid: number; start: string; note?: string }
export type Note = { id: string; at: string; by: string; text: string; kind: string }
export type Doc = { id: string; title: string; file?: string; at: string }
export type Employee = {
  id: string; teamId?: string; name: string; position: string; dept: string; status: 'active' | 'probation' | 'left'
  nationalId: string; birth: string; father: string; phone: string; address: string; emergency: string
  sheba: string; card: string; insuranceNo: string; start: string; contractType: string
  salary: { base: number; housing: number; bon: number; child: number; overtime: number; other: number }
  payDay: number; insured: boolean
  contracts: Contract[]; pay: PayItem[]; loans: Loan[]; notes: Note[]; docs: Doc[]
}
export const PAY_TYPES = ['حقوق ماهانه', 'مساعده', 'پاداش', 'کمک (هدیه یا اضطراری)', 'وام', 'قسط وام (کسر)', 'اضافه‌کار', 'عیدی و سنوات', 'بازپرداخت هزینه', 'کسر از حقوق']
export const PAY_METHODS = ['کارت به کارت', 'پایا (شبا)', 'ساتنا', 'نقدی', 'چک']
export const CONTRACT_KINDS = ['تمام‌وقت', 'پاره‌وقت', 'کارآموزی', 'پروژه‌ای', 'مشاوره']

export const makePeopleConfig = () => ({ insEmployee: 7, insEmployer: 23, taxFree: 24000000, taxRate: 10, minWage: 10399000, housing: 900000, bon: 2200000, child: 1039900 })

const emp = (id: string, teamId: string, name: string, position: string, dept: string, base: number, start: number, kind: string, extra: Partial<Employee> = {}): Employee => ({
  id, teamId, name, position, dept, status: 'active', nationalId: `00${id.replace(/\D/g, '').padStart(2, '0')}4512${id.length}93`, birth: '۱۳۷۲/۰۴/۱۲', father: 'محمد', phone: `0912000${id.replace(/\D/g, '').padStart(4, '0')}`,
  address: 'تهران، نمونهٔ نشانی', emergency: 'همسر · 09120000000', sheba: `IR06017000000${id.replace(/\D/g, '').padStart(2, '0')}12345678901`, card: `6037-99xx-xxxx-${id.replace(/\D/g, '').padStart(4, '0')}`,
  insuranceNo: `${1200 + Number(id.replace(/\D/g, ''))}88${id.replace(/\D/g, '')}`, start: d(-start), contractType: kind,
  salary: { base, housing: 900000, bon: 2200000, child: 0, overtime: 0, other: 0 }, payDay: 1, insured: true,
  contracts: [{ id: `${id}-c1`, title: `قرارداد ${kind} ۱۴۰۵`, kind, from: d(-Math.min(start, 230)), to: d(135), salary: base, signed: true }],
  pay: [
    { id: `${id}-p1`, date: d(-41), type: 'حقوق ماهانه', amount: Math.round(base * 1.08), method: 'پایا (شبا)', status: 'paid', by: 'مریم' },
    { id: `${id}-p2`, date: d(-11), type: 'حقوق ماهانه', amount: Math.round(base * 1.08), method: 'پایا (شبا)', status: 'paid', by: 'مریم' },
    { id: `${id}-p3`, date: d(19), type: 'حقوق ماهانه', amount: Math.round(base * 1.08), method: 'پایا (شبا)', status: 'scheduled' },
  ],
  loans: [], notes: [{ id: `${id}-n1`, at: d(-start), by: 'بهراد', kind: 'استخدام', text: 'شروع همکاری؛ مدارک هویتی و قرارداد امضاشده دریافت شد.' }], docs: [{ id: `${id}-d1`, title: 'کپی کارت ملی', at: d(-start) }, { id: `${id}-d2`, title: 'قرارداد امضاشده', at: d(-start) }],
  ...extra,
})

export const makePeople = (): Employee[] => [
  emp('e1', 'u2', 'نیما', 'مدیر عملیات', 'عملیات', 32000000, 640, 'تمام‌وقت', {
    loans: [{ id: 'e1-l1', title: 'وام خرید خودرو', amount: 60000000, installments: 12, paid: 5, start: d(-150), note: 'قسط ماهانه از حقوق کسر می‌شود.' }],
    pay: [
      { id: 'e1-p1', date: d(-41), type: 'حقوق ماهانه', amount: 34560000, method: 'پایا (شبا)', status: 'paid', by: 'مریم' },
      { id: 'e1-p0', date: d(-33), type: 'مساعده', amount: 8000000, method: 'کارت به کارت', status: 'paid', by: 'بهراد', note: 'هزینهٔ درمان پدر؛ از حقوق ماه بعد کسر شد.' },
      { id: 'e1-p2', date: d(-11), type: 'حقوق ماهانه', amount: 34560000, method: 'پایا (شبا)', status: 'paid', by: 'مریم' },
      { id: 'e1-p4', date: d(-9), type: 'کمک (هدیه یا اضطراری)', amount: 5000000, method: 'کارت به کارت', status: 'paid', by: 'بهراد', note: 'هدیهٔ تولد فرزند' },
      { id: 'e1-p3', date: d(19), type: 'حقوق ماهانه', amount: 34560000, method: 'پایا (شبا)', status: 'scheduled' },
    ],
  }),
  emp('e2', 'u3', 'آرش', 'اپراتور انبار و بسته‌بندی', 'انبار', 14500000, 300, 'تمام‌وقت', { pay: [{ id: 'e2-p1', date: d(-11), type: 'حقوق ماهانه', amount: 15660000, method: 'پایا (شبا)', status: 'paid', by: 'مریم' }, { id: 'e2-p2', date: d(-2), type: 'مساعده', amount: 3000000, method: 'کارت به کارت', status: 'due', note: 'درخواست مساعده؛ منتظر تأیید' }, { id: 'e2-p3', date: d(19), type: 'حقوق ماهانه', amount: 15660000, method: 'پایا (شبا)', status: 'scheduled' }] }),
  emp('e3', 'u5', 'سارا', 'کارشناس پشتیبانی', 'پشتیبانی', 17000000, 410, 'تمام‌وقت'),
  emp('e4', 'u6', 'مریم', 'کارشناس مالی', 'مالی', 24000000, 820, 'تمام‌وقت', { contracts: [{ id: 'e4-c1', title: 'قرارداد تمام‌وقت ۱۴۰۴', kind: 'تمام‌وقت', from: d(-340), to: d(12), salary: 24000000, signed: true, note: 'تمدید با افزایش ۲۰٪ در دست بررسی' }] }),
  emp('e5', 'u7', 'پویا', 'مارکتینگ و سئو', 'رشد', 26000000, 180, 'پاره‌وقت', { status: 'probation', salary: { base: 26000000, housing: 0, bon: 0, child: 0, overtime: 0, other: 0 }, insured: false }),
  emp('e6', 'u8', 'هستی', 'کنترل کیفیت', 'انبار', 9000000, 75, 'کارآموزی', { status: 'probation', contracts: [{ id: 'e6-c1', title: 'قرارداد کارآموزی ۳ ماهه', kind: 'کارآموزی', from: d(-75), to: d(15), salary: 9000000, signed: false, note: 'نسخهٔ امضاشده هنوز بارگذاری نشده' }] }),
]
