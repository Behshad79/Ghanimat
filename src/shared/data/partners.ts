// شعب و شرکای فروش: هر شریک انبار و شهر خودش را دارد، کالای امانی غنیمت می‌فروشد، کالای خودش را اضافه می‌کند
// و سهم هر طرف بر اساس «سرمایهٔ چه کسی» محاسبه می‌شود.
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString()

/** مدل سرمایهٔ هر محموله */
export type Capital = 'hq' | 'partner' | 'shared'
export const CAPITAL: Record<Capital, { label: string; short: string; desc: string; color: string }> = {
  hq: { label: 'کالای امانی غنیمت', short: 'امانی غنیمت', desc: 'سرمایه و مالکیت با غنیمت است؛ شریک نگهداری و فروش می‌کند و کمیسیون می‌گیرد. کسری و آسیب در انبار شریک به عهدهٔ شریک است.', color: '#0000ff' },
  partner: { label: 'کالای خود شریک', short: 'کالای شریک', desc: 'سرمایه با شریک است؛ کالا با نام غنیمت در سایت فروخته می‌شود و غنیمت کارمزد پلتفرم برمی‌دارد.', color: '#0e9f6e' },
  shared: { label: 'سرمایهٔ مشترک', short: 'مشترک', desc: 'هر دو طرف سرمایه گذاشته‌اند؛ اصل سرمایه و سود به نسبت توافق‌شده تقسیم می‌شود.', color: '#ffc24b' },
}

export type Lot = { id: string; partnerId: string; productId: string; capital: Capital; qty: number; soldOnline: number; soldStore: number; unitCost: number; unitPrice: number; at: string; note?: string }
export type Contract = { hqCommission: number; platformFee: number; sharedSplit: number; settleDays: number; noStockPenalty: number; deposit: number; returnsBy: string; minMargin: number }
export type FastZone = { on: boolean; cities: string; hours: number; fee: number; cutoff: string; capacity: number; courier: string }
export type PartnerT = {
  id: string; name: string; city: string; owner: string; userId?: string; phone: string; warehouse: string; address: string
  status: 'فعال' | 'در حال راه‌اندازی' | 'متوقف'; color: string; since: string
  contract: Contract; fast: FastZone; services: { pickup: boolean; test: boolean; ownProducts: boolean; storeSales: boolean }
  checklist: { t: string; done: boolean }[]; payouts: { id: string; at: string; amount: number; status: 'پرداخت شد' | 'در انتظار تأیید' | 'ردشده'; note?: string }[]
}

const CHECK = ['قرارداد و ودیعه امضا شد', 'انبار بازدید و تأیید شد', 'کاربر پرتال و دسترسی‌ها ساخته شد', 'آموزش ثبت رهگیری و بسته‌بندی', 'محدودهٔ ارسال سریع و پیک تعیین شد', 'اولین محمولهٔ امانی تحویل شد', 'آزمون سفارش واقعی']

export function makePartners(): PartnerT[] {
  return [
    { id: 'mahabad', name: 'شعبهٔ مهاباد', city: 'مهاباد', owner: 'کاک هیوا', userId: 'u4', phone: '0914-000-0004', warehouse: 'mahabad', address: 'مهاباد، خیابان جمهوری، پاساژ نمونه', status: 'فعال', color: '#0e9f6e', since: ago(420),
      contract: { hqCommission: 9, platformFee: 12, sharedSplit: 50, settleDays: 7, noStockPenalty: 1500000, deposit: 800000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: true, cities: 'مهاباد، بوکان، میاندوآب', hours: 3, fee: 90000, cutoff: '17:00', capacity: 25, courier: 'پیک خود شعبه' },
      services: { pickup: true, test: true, ownProducts: true, storeSales: true },
      checklist: CHECK.map((t) => ({ t, done: true })),
      payouts: [{ id: 'PO-118', at: ago(9), amount: 74200000, status: 'پرداخت شد' }, { id: 'PO-112', at: ago(16), amount: 61800000, status: 'پرداخت شد' }] },
    { id: 'mashhad', name: 'شعبهٔ مشهد', city: 'مشهد', owner: 'آقای رضوی', phone: '0915-000-0010', warehouse: 'mashhad', address: 'مشهد، بلوار سجاد، نبش سجاد ۱۰', status: 'در حال راه‌اندازی', color: '#c2410c', since: ago(12),
      contract: { hqCommission: 8, platformFee: 10, sharedSplit: 40, settleDays: 7, noStockPenalty: 1500000, deposit: 500000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: false, cities: 'مشهد', hours: 3, fee: 95000, cutoff: '16:00', capacity: 15, courier: 'اسنپ‌باکس' },
      services: { pickup: true, test: false, ownProducts: true, storeSales: true },
      checklist: CHECK.map((t, i) => ({ t, done: i < 3 })), payouts: [] },
    { id: 'shiraz', name: 'شعبهٔ شیراز', city: 'شیراز', owner: 'خانم کریمی', phone: '0917-000-0020', warehouse: 'shiraz', address: 'شیراز، خیابان ملاصدرا', status: 'در حال راه‌اندازی', color: '#7c3aed', since: ago(4),
      contract: { hqCommission: 8, platformFee: 12, sharedSplit: 50, settleDays: 14, noStockPenalty: 2000000, deposit: 400000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: false, cities: 'شیراز', hours: 4, fee: 100000, cutoff: '15:00', capacity: 10, courier: 'پیک خود شعبه' },
      services: { pickup: false, test: false, ownProducts: false, storeSales: false },
      checklist: CHECK.map((t, i) => ({ t, done: i < 1 })), payouts: [] },
  ]
}

export function makeLots(): Lot[] {
  return [
    { id: 'LT-201', partnerId: 'mahabad', productId: 'p2', capital: 'hq', qty: 4, soldOnline: 3, soldStore: 1, unitCost: 24800000, unitPrice: 29900000, at: ago(30) },
    { id: 'LT-202', partnerId: 'mahabad', productId: 'p3', capital: 'partner', qty: 6, soldOnline: 2, soldStore: 2, unitCost: 15200000, unitPrice: 18400000, at: ago(22), note: 'وارد شده توسط خود شعبه از اقلیم' },
    { id: 'LT-203', partnerId: 'mahabad', productId: 'p1', capital: 'shared', qty: 2, soldOnline: 1, soldStore: 0, unitCost: 112000000, unitPrice: 124500000, at: ago(18), note: 'سرمایهٔ ۵۰/۵۰' },
    { id: 'LT-204', partnerId: 'mahabad', productId: 'p5', capital: 'hq', qty: 3, soldOnline: 1, soldStore: 0, unitCost: 41000000, unitPrice: 48900000, at: ago(10) },
    { id: 'LT-211', partnerId: 'mashhad', productId: 'p2', capital: 'hq', qty: 2, soldOnline: 0, soldStore: 0, unitCost: 24800000, unitPrice: 29900000, at: ago(3), note: 'در راه مشهد (باربری)' },
  ]
}

/** صورت‌حساب: سهم هر طرف و جهت پرداخت. پول فروش آنلاین دست غنیمت است؛ پول فروش حضوری دست شریک. */
export function statement(p: PartnerT, lots: Lot[]) {
  const C = p.contract; const rows = lots.filter((l) => l.partnerId === p.id).map((l) => {
    const sold = l.soldOnline + l.soldStore; const revenue = sold * l.unitPrice; const cost = sold * l.unitCost
    const partnerShare = l.capital === 'hq' ? revenue * C.hqCommission / 100 : l.capital === 'partner' ? revenue * (1 - C.platformFee / 100) : cost * C.sharedSplit / 100 + (revenue - cost) * C.sharedSplit / 100
    const share = (n: number) => n / (sold || 1)
    const online = l.soldOnline * l.unitPrice; const store = l.soldStore * l.unitPrice
    // آنلاین: غنیمت پول را گرفته و سهم شریک را بدهکار است. حضوری: شریک پول را گرفته و سهم غنیمت را بدهکار است.
    const hqOwes = share(partnerShare) * l.soldOnline; const partnerOwes = (l.unitPrice - share(partnerShare)) * l.soldStore
    return { l, sold, revenue, cost, partnerShare, hqShare: revenue - partnerShare, online, store, hqOwes, partnerOwes, stockValue: (l.qty - sold) * l.unitCost }
  })
  const sum = (k: 'revenue' | 'partnerShare' | 'hqShare' | 'hqOwes' | 'partnerOwes' | 'stockValue') => rows.reduce((a, r) => a + r[k], 0)
  const byCap = (c: Capital) => rows.filter((r) => r.l.capital === c)
  return { rows, revenue: sum('revenue'), partnerShare: sum('partnerShare'), hqShare: sum('hqShare'), net: sum('hqOwes') - sum('partnerOwes'), stockValue: sum('stockValue'), byCap }
}
