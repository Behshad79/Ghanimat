// رفتار و سوابق هر مشتری در سایت و پنل کاربری: جلسه‌ها و کلیک‌ها، سبد زنده، پرداخت ناموفق، آدرس‌ها، کیف پول، لیست‌ها، گفتگو با دستیار AI و ویجت پشتیبانی.
// همهٔ این داده‌ها در «پروندهٔ مشتری» دیده و ویرایش می‌شوند.
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
const IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']
const PAGES = ['خانه', 'فهرست هدفون', 'صفحهٔ کالا: AirPods Max', 'صفحهٔ کالا: iPhone 16 Pro', 'مقایسه', 'سبد خرید', 'آدرس و زمان ارسال', 'پرداخت', 'پنل › سفارش‌های جاری', 'پنل › کیف پول', 'وبلاگ: تشخیص کالای اصل']
const SRC = ['جست‌وجوی گوگل', 'اینستاگرام', 'ترب', 'مستقیم', 'پیامک کمپین', 'تلگرام']

export type Ev = { id: string; customerId: string; session: string; at: string; type: 'view' | 'click' | 'search' | 'add_to_cart' | 'checkout' | 'payment_fail' | 'payment_ok' | 'chat'; page: string; target?: string; utm?: string }
export const makeJourney = () => {
  let n = 0
  const events: Ev[] = []
  IDS.forEach((c, ci) => {
    for (let s = 0; s < 3 + (ci % 3); s++) {
      const session = `S-${c}-${s + 1}`; const base = 60 * 24 * (s * 2 + ci % 4) + 30 * ci; const utm = SRC[(ci + s) % SRC.length]
      const steps: [Ev['type'], string, string?][] = [['view', 'خانه'], ['click', 'خانه', 'بنر هیرو: دیدن تخفیف‌های امروز'], ['search', 'جست‌وجو', ['ایرپاد مکس', 'آیفون ۱۶ پرو', 'هدفون سونی'][ci % 3]], ['view', PAGES[2 + (ci % 2)]], ['click', PAGES[2 + (ci % 2)], 'گالری: ویدیوی باز کردن جعبه'], ['add_to_cart', PAGES[2 + (ci % 2)], 'افزودن به سبد خرید'], ['checkout', 'سبد خرید', 'ادامهٔ خرید'], ['checkout', 'آدرس و زمان ارسال', 'انتخاب روز و ساعت']]
      if (s === 0 && ci % 2 === 0) steps.push(['payment_fail', 'پرداخت', ['پایان زمان پرداخت', 'خطای درگاه زرین‌پال', 'انصراف کاربر'][ci % 3]])
      else if (s === 1) steps.push(['payment_ok', 'پرداخت', 'درگاه ملت'])
      if (ci % 3 === 1) steps.push(['chat', 'دستیار خرید', 'گفتگو با دستیار AI'])
      steps.forEach(([type, page, target], i) => events.push({ id: `ev${++n}`, customerId: c, session, at: ago(base + 40 - i * 2), type, page, target, utm }))
    }
  })
  return {
    events,
    carts: [
      { customerId: 'c1', step: 'پرداخت', error: 'پایان زمان پرداخت در درگاه', updatedAt: ago(14), items: [{ productId: 'p2', qty: 1, price: 15000000 }, { productId: 'p9', qty: 2, price: 1500000 }], address: 'تهران، ونک، ملاصدرا، پلاک ۴۵', slot: 'فردا ۸ تا ۱۰', method: 'تحویل سریع (اسنپ‌باکس)' },
      { customerId: 'c3', step: 'آدرس و زمان ارسال', error: 'ظرفیت تحویل ۲ ساعتهٔ امروز تمام شده است', updatedAt: ago(42), items: [{ productId: 'p5', qty: 1, price: 21900000 }], address: 'کرج، گوهردشت', slot: '', method: '' },
      { customerId: 'c5', step: 'سبد خرید', error: '', updatedAt: ago(60 * 5), items: [{ productId: 'p4', qty: 1, price: 38900000 }], address: '', slot: '', method: '' },
    ],
    failedPayments: [
      { id: 'PF-9012', customerId: 'c1', amount: 18000000, gateway: 'زرین‌پال', reason: 'پایان زمان پرداخت', at: ago(14), resolved: false },
      { id: 'PF-9007', customerId: 'c5', amount: 38900000, gateway: 'اسنپ‌پی', reason: 'اعتبار اقساطی کافی نیست', at: ago(60 * 26), resolved: false },
      { id: 'PF-8994', customerId: 'c3', amount: 21900000, gateway: 'ملت', reason: 'خطای درگاه', at: ago(60 * 50), resolved: true },
    ],
    addresses: [
      { id: 'ad1', customerId: 'c1', title: 'خانه', province: 'تهران', city: 'تهران', street: 'یوسف‌آباد، خیابان ولیعصر، خیابان فاطمی', plaque: '۱۲', unit: '۴', postal: '1414000000', recipient: 'سروش رنجبران', mobile: '09123456789', isDefault: true },
      { id: 'ad2', customerId: 'c1', title: 'محل کار', province: 'تهران', city: 'تهران', street: 'ونک، خیابان ملاصدرا', plaque: '۴۵', unit: '۸', postal: '1435000000', recipient: 'سروش رنجبران', mobile: '09123456789', isDefault: false },
      { id: 'ad3', customerId: 'c3', title: 'خانه', province: 'البرز', city: 'کرج', street: 'گوهردشت، بلوار موذن', plaque: '۷', unit: '۲', postal: '3156000000', recipient: 'کاوه مرادی', mobile: '09120000003', isDefault: true },
    ],
    walletTx: [
      { id: 'WT-501', customerId: 'c1', type: 'بازگشت وجه', amount: 2400000, at: ago(60 * 30), ref: 'GH-10412', status: 'انجام شد', note: 'لغو بخشی از سفارش' },
      { id: 'WT-498', customerId: 'c1', type: 'برداشت', amount: -2400000, at: ago(60 * 3), ref: 'WD-3120', status: 'در انتظار', note: '' },
      { id: 'WT-470', customerId: 'c2', type: 'افزایش موجودی', amount: 850000, at: ago(60 * 70), ref: 'ZP-44120', status: 'انجام شد', note: '' },
      { id: 'WT-455', customerId: 'c5', type: 'هدیهٔ دعوت', amount: 500000, at: ago(60 * 24 * 6), ref: 'REF-c1', status: 'انجام شد', note: '' },
    ],
    lists: [
      { id: 'ls1', customerId: 'c1', kind: 'علاقه‌مندی', name: 'علاقه‌مندی‌ها', items: ['p1', 'p3', 'p5'] },
      { id: 'ls2', customerId: 'c1', kind: 'اطلاع‌رسانی', name: 'لیست اطلاع‌رسانی', items: ['p8'] },
      { id: 'ls3', customerId: 'c1', kind: 'شخصی', name: 'هدیهٔ تولد', items: ['p4', 'p9'] },
      { id: 'ls4', customerId: 'c3', kind: 'علاقه‌مندی', name: 'علاقه‌مندی‌ها', items: ['p2'] },
    ],
    aiChats: [
      { id: 'AI-3301', customerId: 'c2', at: ago(95), intent: 'پیشنهاد کالا', resolved: true, handoff: false, feedback: 'مثبت', converted: true, messages: [{ role: 'user', text: 'یه هدفون نویزکنسلینگ خوب برای سفر تا ۲۵ میلیون می‌خوام' }, { role: 'ai', text: 'سه گزینهٔ اصل پیدا کردم؛ Sony WH-1000XM5 جعبه‌باز با ۱۲ ماه گارانتی بهترین قیمت را دارد.', products: ['p5', 'p2'] }, { role: 'user', text: 'فرق جعبه‌باز با اکبند چیه؟' }, { role: 'ai', text: 'هر دو نو هستند؛ جعبه‌باز بدون پلمپ است و عملکرد پایه‌اش در غنیمت تست شده.' }] },
      { id: 'AI-3298', customerId: 'c5', at: ago(60 * 7), intent: 'مقایسه', resolved: false, handoff: true, feedback: 'منفی', converted: false, messages: [{ role: 'user', text: 'لپ‌تاپ برای برنامه‌نویسی تا ۷۰ میلیون' }, { role: 'ai', text: 'MacBook Air M3 با ۱۶ گیگ رم گزینهٔ مناسبی است.', products: ['p3'] }, { role: 'user', text: 'گرون‌تر از بودجه‌ست. با یه آدم حرف بزنم.' }, { role: 'ai', text: 'شما را به کارشناس پشتیبانی وصل کردم.' }] },
      { id: 'AI-3290', customerId: 'c1', at: ago(60 * 30), intent: 'پیگیری سفارش', resolved: true, handoff: false, feedback: '', converted: false, messages: [{ role: 'user', text: 'سفارش GH-10458 کی می‌رسه؟' }, { role: 'ai', text: 'مرسولهٔ ۱ امروز ساعت ۱۶ تا ۱۸ با تحویل سریع غنیمت تحویل می‌شود.' }] },
      { id: 'AI-3281', customerId: 'c7', at: ago(60 * 52), intent: 'جست‌وجو با عکس', resolved: true, handoff: false, feedback: 'مثبت', converted: true, messages: [{ role: 'user', text: '[عکس جعبهٔ ساعت]' }, { role: 'ai', text: 'این Apple Watch Series 10 است؛ ۱ عدد اکبند موجود داریم.', products: ['p4'] }] },
    ],
    widgetChats: [
      { id: 'WC-771', customerId: 'c1', agent: 'سارا', at: ago(40), waitSec: 95, durationMin: 7, rating: 5, reason: 'پاسخ سریع', offHours: false, topic: 'سفارش و ارسال' },
      { id: 'WC-768', customerId: 'c5', agent: 'سارا', at: ago(60 * 7), waitSec: 240, durationMin: 12, rating: 3, reason: 'زمان انتظار طولانی', offHours: false, topic: 'مشاوره خرید' },
      { id: 'WC-760', customerId: 'c3', agent: '—', at: ago(60 * 23), waitSec: 0, durationMin: 0, rating: 0, reason: 'خارج از ساعت کاری؛ پیام گذاشت', offHours: true, topic: 'مرجوعی' },
      { id: 'WC-752', customerId: 'c2', agent: 'رضا', at: ago(60 * 30), waitSec: 60, durationMin: 5, rating: 4, reason: 'حل شد', offHours: false, topic: 'پرداخت' },
    ],
    notifPrefs: {} as Record<string, Record<string, { push: boolean; sms: boolean; email: boolean }>>,
    passwords: { c1: true, c2: false, c3: true, c4: true, c5: false, c6: false, c7: true } as Record<string, boolean>,
  }
}
export type Journey = ReturnType<typeof makeJourney>
