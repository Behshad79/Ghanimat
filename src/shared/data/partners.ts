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
export type FastZone = { on: boolean; cities: string; hours: number; fee: number; cutoff: string; capacity: number; courier: string; areas?: string; radiusKm?: number }
export type PartnerT = {
  id: string; name: string; city: string; owner: string; userId?: string; phone: string; warehouse: string; address: string
  status: 'فعال' | 'در حال راه‌اندازی' | 'متوقف' | 'در انتظار تأیید'; color: string; since: string
  contract: Contract; fast: FastZone; services: { pickup: boolean; test: boolean; ownProducts: boolean; storeSales: boolean }
  couriers: { name: string; phone: string; vehicle: string; active: boolean }[]; iban: string
  reviews: { id: string; orderId: string; customer: string; rating: number; text: string; tags: string[]; at: string; reply?: string }[]
  penalties: { id: string; at: string; reason: string; amount: number; orderId?: string }[]
  metrics: { ontime: number; noStock: number; cancel: number; prepMin: number }; stockCheckedAt?: string
  checklist: { t: string; done: boolean }[]; payouts: { id: string; at: string; amount: number; status: 'پرداخت شد' | 'در انتظار تأیید' | 'ردشده' | 'در انتظار واریز شعبه' | 'واریز شد'; note?: string }[]
}

const CHECK = ['قرارداد و ودیعه امضا شد', 'انبار بازدید و تأیید شد', 'کاربر پرتال و دسترسی‌ها ساخته شد', 'آموزش ثبت رهگیری و بسته‌بندی', 'محدودهٔ ارسال سریع و پیک تعیین شد', 'اولین محمولهٔ امانی تحویل شد', 'آزمون سفارش واقعی']

export function makePartners(): PartnerT[] {
  return [
    { id: 'mahabad', name: 'شعبهٔ مهاباد', city: 'مهاباد', owner: 'یاسین', userId: 'u4', phone: '0914-000-0004', warehouse: 'mahabad', address: 'مهاباد، خیابان جمهوری، پاساژ نمونه', status: 'فعال', color: '#0e9f6e', since: ago(420),
      contract: { hqCommission: 9, platformFee: 12, sharedSplit: 50, settleDays: 7, noStockPenalty: 1500000, deposit: 800000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: false, cities: 'مهاباد', hours: 3, fee: 90000, cutoff: '17:00', capacity: 25, courier: 'پیک خود شعبه', areas: '', radiusKm: 0 },
      services: { pickup: true, test: true, ownProducts: true, storeSales: true },
      couriers: [{ name: 'کاوه احمدی', phone: '09141110000', vehicle: 'موتور', active: true }, { name: 'سیروان', phone: '09142220000', vehicle: 'خودرو', active: true }], iban: 'IR12 0170 0000 0012 3456 7890 01',
      reviews: [
        { id: 'PR-1', orderId: 'GH-10458', customer: 'سروش رنجبران', rating: 5, text: 'بسته‌بندی عالی بود و زودتر از وعده رسید.', tags: ['بسته‌بندی خوب', 'زودتر از وعده'], at: ago(3) },
        { id: 'PR-2', orderId: 'GH-10475', customer: 'امیرحسین صادقی', rating: 2, text: 'سفارش لغو شد چون کالا موجود نبود؛ کاش زودتر خبر می‌دادند.', tags: ['ناموجودی بعد از خرید'], at: ago(6) },
        { id: 'PR-3', orderId: 'GH-10433', customer: 'هیمن رسولی', rating: 4, text: 'پیک مؤدب بود ولی ۲۰ دقیقه دیرتر رسید.', tags: ['تأخیر کوتاه', 'پیک مؤدب'], at: ago(9) },
        { id: 'PR-4', orderId: 'GH-10427', customer: 'شیلان کریمی', rating: 5, text: 'تست حضوری در شعبه خیلی کمک کرد.', tags: ['تست حضوری'], at: ago(14) },
      ],
      penalties: [{ id: 'PN-7', at: ago(6), reason: 'اعلام «ندارم» پس از فروش', amount: 1500000, orderId: 'GH-10475' }],
      metrics: { ontime: 93, noStock: 2.1, cancel: 1.4, prepMin: 38 },
      checklist: CHECK.map((t) => ({ t, done: true })),
      payouts: [{ id: 'PO-118', at: ago(9), amount: 74200000, status: 'پرداخت شد' }, { id: 'PO-112', at: ago(16), amount: 61800000, status: 'پرداخت شد' }] },
    { id: 'mashhad', name: 'شعبهٔ مشهد', city: 'مشهد', owner: 'آقای رضوی', phone: '0915-000-0010', warehouse: 'mashhad', address: 'مشهد، بلوار سجاد، نبش سجاد ۱۰', status: 'در حال راه‌اندازی', color: '#c2410c', since: ago(12),
      contract: { hqCommission: 8, platformFee: 10, sharedSplit: 40, settleDays: 7, noStockPenalty: 1500000, deposit: 500000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: false, cities: 'مشهد', hours: 3, fee: 95000, cutoff: '16:00', capacity: 15, courier: 'اسنپ‌باکس' },
      services: { pickup: true, test: false, ownProducts: true, storeSales: true },
      couriers: [], iban: '', reviews: [], penalties: [], metrics: { ontime: 0, noStock: 0, cancel: 0, prepMin: 0 },
      checklist: CHECK.map((t, i) => ({ t, done: i < 3 })), payouts: [] },
    { id: 'shiraz', name: 'شعبهٔ شیراز', city: 'شیراز', owner: 'خانم کریمی', phone: '0917-000-0020', warehouse: 'shiraz', address: 'شیراز، خیابان ملاصدرا', status: 'در حال راه‌اندازی', color: '#7c3aed', since: ago(4),
      contract: { hqCommission: 8, platformFee: 12, sharedSplit: 50, settleDays: 14, noStockPenalty: 2000000, deposit: 400000000, returnsBy: 'صاحب سرمایه', minMargin: 6 },
      fast: { on: false, cities: 'شیراز', hours: 4, fee: 100000, cutoff: '15:00', capacity: 10, courier: 'پیک خود شعبه' },
      services: { pickup: false, test: false, ownProducts: false, storeSales: false },
      couriers: [], iban: '', reviews: [], penalties: [], metrics: { ontime: 0, noStock: 0, cancel: 0, prepMin: 0 },
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

/** کارنامهٔ شعبه: امتیاز مشتری، تحویل به‌موقع، ناموجودی و لغو؛ با آستانه‌هایی که پیامد دارند */
export function scorecard(p: PartnerT) {
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : 0
  const rows: { k: string; v: string; ok: boolean; rule: string }[] = [
    { k: 'امتیاز مشتریان', v: rating ? rating.toFixed(1) : '—', ok: !rating || rating >= 4, rule: 'زیر ۴: هشدار · زیر ۳٫۵: ارسال سریع موقتاً خاموش می‌شود' },
    { k: 'تحویل به‌موقع', v: `${p.metrics.ontime}٪`, ok: !p.metrics.ontime || p.metrics.ontime >= 92, rule: 'هدف ۹۵٪ · زیر ۹۰٪: سفارش سریع کمتری به شعبه می‌رسد' },
    { k: 'ناموجودی بعد از فروش', v: `${p.metrics.noStock}٪`, ok: p.metrics.noStock <= 2, rule: 'بالای ۲٪: جریمه طبق قرارداد · بالای ۵٪: توقف فروش' },
    { k: 'لغو از سمت شعبه', v: `${p.metrics.cancel}٪`, ok: p.metrics.cancel <= 2, rule: 'بالای ۲٪: بازبینی همکاری' },
    { k: 'میانگین آماده‌سازی', v: `${p.metrics.prepMin} دقیقه`, ok: !p.metrics.prepMin || p.metrics.prepMin <= 45, rule: 'برای ارسال سریع زیر ۴۵ دقیقه' },
  ]
  return { rating, rows, ok: rows.every((r) => r.ok) }
}

/** دفتر حساب شعبه: هر فروش، کمیسیون، جریمه و تسویه با ماندهٔ جاری (مثبت یعنی غنیمت بدهکار است) */
export function ledger(p: PartnerT, lots: Lot[]) {
  const st = statement(p, lots); const items: { at: string; title: string; ref: string; amount: number }[] = []
  st.rows.forEach((r) => {
    if (r.l.soldOnline) items.push({ at: r.l.at, title: `سهم شعبه از فروش آنلاین (${r.l.soldOnline} عدد)`, ref: r.l.id, amount: Math.round(r.hqOwes) })
    if (r.l.soldStore) items.push({ at: r.l.at, title: `سهم غنیمت از فروش حضوری (${r.l.soldStore} عدد)`, ref: r.l.id, amount: -Math.round(r.partnerOwes) })
  })
  p.penalties.forEach((x) => items.push({ at: x.at, title: `جریمه: ${x.reason}`, ref: x.orderId ?? x.id, amount: -x.amount }))
  p.payouts.filter((x) => x.status === 'پرداخت شد').forEach((x) => items.push({ at: x.at, title: 'تسویه به حساب شعبه', ref: x.id, amount: -x.amount }))
  items.sort((a, b) => a.at.localeCompare(b.at)); let bal = 0
  return items.map((x) => { bal += x.amount; return { ...x, bal } })
}

/** کنترل شبکهٔ شعب: تعطیلی فوری، توقف ارسال سریع، شهرهای ارسال سریع انبار مرکزی و ترتیب برداشت موجودی */
export type Pause = { until: string; reason: string; at: string; by: string; msg?: string }
export function makeNetwork() {
  return {
    closed: null as Pause | null, fastOff: null as Pause | null,
    hq: { fast: true, cities: 'تهران، کرج', hours: 3, cutoff: '18:00', paused: null as Pause | null, areas: 'همهٔ مناطق ۲۲گانهٔ تهران، کرج (عظیمیه، گوهردشت، مهرشهر)', radiusKm: 0 },
    pausedBranches: {} as Record<string, Pause>,
    priority: ['tehran', 'mahabad', 'shiraz', 'mashhad'],
    log: [] as { at: string; by: string; text: string }[],
  }
}
export type NetworkT = ReturnType<typeof makeNetwork>
const live = (p: Pause | null | undefined) => !!p && new Date(p.until).getTime() > Date.now()
/** آیا ارسال سریع همین الان در سایت نمایش داده شود؟ (بدون تعطیلی، بدون توقف سراسری و با شعبهٔ فعال) */
export function fastOn(n: NetworkT | undefined, wh = 'tehran', partners: PartnerT[] = []): boolean {
  if (!n) return true
  if (live(n.closed) || live(n.fastOff)) return false
  if (wh === 'tehran') return n.hq.fast && !live(n.hq.paused)
  const p = partners.find((x) => x.warehouse === wh || x.id === wh)
  return !!p && p.status === 'فعال' && p.fast.on && !live(n.pausedBranches[p.id])
}
export const isLive = live
