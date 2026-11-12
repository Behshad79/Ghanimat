// مرکز اتصالات: آداپتورهای سرویس، وب‌هوک‌ها و جدول رویدادهای سمت سرور
export const EVENTS = ['order.created', 'order.paid', 'order.cancelled', 'order.delivered', 'shipment.handed', 'return.requested', 'user.registered', 'cart.abandoned', 'payment.failed', 'stock.low', 'review.created', 'ticket.created', 'newsletter.subscribed', 'c2c.receipt.suspicious']
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
export const makeHub = () => ({
  adapters: [
    { id: 'ad-zp', family: 'درگاه پرداخت', name: 'زرین‌پال', key: 'zp_live_••••a91c', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-mellat', family: 'درگاه پرداخت', name: 'به‌پرداخت ملت', key: 'terminal ••••7712', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-snap', family: 'اقساط', name: 'اسنپ‌پی', key: 'sp_••••0f3', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-kave', family: 'پیامک', name: 'کاوه‌نگار', key: 'kn_••••77ab', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-meli', family: 'پیامک', name: 'ملی‌پیامک', key: '', status: 'پشتیبان (غیرفعال)', env: 'آزمایشی' },
    { id: 'ad-najva', family: 'پوش‌نوتیفیکیشن', name: 'نجوا', key: 'nj_••••12', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-ga4', family: 'آنالیتیکس', name: 'Google Analytics 4', key: 'G-••••XK2', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-clarity', family: 'آنالیتیکس', name: 'Microsoft Clarity', key: 'cl_••••9', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-metabase', family: 'داشبورد داده', name: 'Metabase', key: '', status: 'وصل نشده', env: '—' },
    { id: 'ad-gsc', family: 'سئو', name: 'Google Search Console', key: 'sc-domain:ghanimat.example', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-sepidar', family: 'حسابداری', name: 'سپیدار', key: '', status: 'وصل نشده', env: '—' },
    { id: 'ad-holoo', family: 'حسابداری', name: 'هلو', key: '', status: 'وصل نشده', env: '—' },
    { id: 'ad-post', family: 'حمل', name: 'پست پیشتاز (API)', key: 'post_••••1', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-tipax', family: 'حمل', name: 'تیپاکس', key: 'tpx_••••3', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-snappbox', family: 'حمل', name: 'اسنپ‌باکس', key: 'sb_••••8', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-alopeyk', family: 'حمل', name: 'الوپیک', key: '', status: 'وصل نشده', env: '—' },
    { id: 'ad-claude', family: 'هوش مصنوعی', name: 'Claude API', key: 'sk-ant-••••', status: 'متصل', env: 'عملیاتی' },
    { id: 'ad-n8n', family: 'اتوماسیون', name: 'n8n / Make', key: '', status: 'از راه وب‌هوک', env: '—' },
  ],
  hooks: [
    { id: 'wh1', url: 'https://n8n.ghanimat.example/webhook/orders', events: ['order.created', 'order.paid'], secret: 'whsec_••••91', active: true },
    { id: 'wh2', url: 'https://hooks.slack.com/services/••••', events: ['stock.low', 'c2c.receipt.suspicious', 'payment.failed'], secret: 'whsec_••••12', active: true },
  ],
  deliveries: [
    { id: 'dl1', hook: 'wh1', event: 'order.paid', ref: 'GH-10481', status: 200, ms: 182, at: ago(18) },
    { id: 'dl2', hook: 'wh2', event: 'stock.low', ref: 'p8', status: 200, ms: 95, at: ago(60) },
    { id: 'dl3', hook: 'wh1', event: 'order.created', ref: 'GH-10480', status: 500, ms: 3012, at: ago(42) },
  ],
  serverEvents: [
    { id: 'se1', at: ago(5), event: 'page_view', path: '/p/airpods-max', customer: 'c2', first: 'instagram / bio', last: 'google / organic', session: 'S-c2-1' },
    { id: 'se2', at: ago(4), event: 'add_to_cart', path: '/p/airpods-max', customer: 'c2', first: 'instagram / bio', last: 'google / organic', session: 'S-c2-1' },
    { id: 'se3', at: ago(14), event: 'payment_failed', path: '/checkout/pay', customer: 'c1', first: 'torob / cpc', last: 'sms / yalda', session: 'S-c1-1' },
    { id: 'se4', at: ago(30), event: 'purchase', path: '/checkout/result', customer: 'c3', first: 'google / organic', last: 'telegram / channel', session: 'S-c3-2' },
    { id: 'se5', at: ago(52), event: 'search', path: '/search?q=ps5', customer: '', first: 'direct', last: 'direct', session: 'S-anon-9' },
  ],
})
export type Hub = ReturnType<typeof makeHub>
