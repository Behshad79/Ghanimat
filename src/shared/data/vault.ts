// بایگانی اسناد سازمان: سند ثبتی، قرارداد، مجوز، گواهی؛ با تاریخ انقضا و یادآوری تمدید (نمونه)
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString()
export type VaultDoc = { id: string; title: string; cat: string; file?: string; fileName?: string; size?: number; at: string; by: string; expires?: string; remind: number; tags: string[]; note?: string; access: 'all' | 'managers' | 'owner'; versions: { at: string; by: string; fileName?: string }[] }
export const VAULT_CATS = ['ثبتی و حقوقی', 'مجوزها', 'قراردادها', 'مالیاتی و بیمه', 'ملک و اجاره', 'بانکی', 'برند و مالکیت فکری', 'سایر']
export const makeVault = (): VaultDoc[] => [
  { id: 'vd1', title: 'اساسنامهٔ شرکت', cat: 'ثبتی و حقوقی', at: d(-700), by: 'بهشاد', remind: 0, tags: ['ثبت شرکت'], access: 'owner', versions: [], fileName: 'asasnameh.pdf' },
  { id: 'vd2', title: 'روزنامهٔ رسمی تأسیس و آخرین تغییرات', cat: 'ثبتی و حقوقی', at: d(-400), by: 'بهشاد', remind: 0, tags: ['روزنامه رسمی'], access: 'managers', versions: [{ at: d(-700), by: 'بهشاد', fileName: 'rooznameh-tasis.pdf' }], fileName: 'rooznameh-1404.pdf' },
  { id: 'vd3', title: 'نماد اعتماد الکترونیکی (اینماد)', cat: 'مجوزها', at: d(-340), by: 'مریم', expires: d(25), remind: 30, tags: ['اینماد', 'سایت'], access: 'managers', versions: [], fileName: 'enamad.pdf' },
  { id: 'vd4', title: 'جواز کسب صنف فروش اینترنتی', cat: 'مجوزها', at: d(-520), by: 'بهشاد', expires: d(210), remind: 60, tags: ['اتحادیه'], access: 'managers', versions: [] },
  { id: 'vd5', title: 'قرارداد اجارهٔ انبار تهران', cat: 'ملک و اجاره', at: d(-300), by: 'بهشاد', expires: d(64), remind: 90, tags: ['انبار تهران'], access: 'managers', versions: [], note: 'ودیعه ۲ میلیارد تومان؛ تمدید با افزایش حداکثر ۲۵٪', fileName: 'ejare-anbar.pdf' },
  { id: 'vd6', title: 'قرارداد همکاری اسنپ‌باکس', cat: 'قراردادها', at: d(-180), by: 'نیما', expires: d(185), remind: 30, tags: ['پیک', 'API'], access: 'managers', versions: [] },
  { id: 'vd7', title: 'گواهی ثبت‌نام ارزش افزوده', cat: 'مالیاتی و بیمه', at: d(-610), by: 'مریم', remind: 0, tags: ['مالیات'], access: 'managers', versions: [], fileName: 'arzesh-afzoodeh.pdf' },
  { id: 'vd8', title: 'گواهی ثبت علامت تجاری غنیمت', cat: 'برند و مالکیت فکری', at: d(-450), by: 'بهشاد', expires: d(3200), remind: 180, tags: ['برند'], access: 'owner', versions: [] },
  { id: 'vd9', title: 'قرارداد درگاه پرداخت زرین‌پال', cat: 'بانکی', at: d(-260), by: 'مریم', remind: 0, tags: ['درگاه'], access: 'managers', versions: [] },
]
