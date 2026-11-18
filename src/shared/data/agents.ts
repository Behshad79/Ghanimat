// ایجنت‌های هوش مصنوعی متصل به پنل: حساب، دسترسی، کارهای روزانه، دستورالعمل‌ها و اتوماسیون‌ها
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString()

/** سطح دسترسی ایجنت در هر ماژول */
export type AgentLevel = 'none' | 'read' | 'draft' | 'approve' | 'auto'
export const LEVELS: [AgentLevel, string, string][] = [
  ['none', 'بدون دسترسی', 'این بخش را نمی‌بیند'],
  ['read', 'فقط خواندن', 'می‌بیند و گزارش می‌دهد'],
  ['draft', 'پیش‌نویس', 'پیشنهاد می‌سازد؛ انسان ثبت می‌کند'],
  ['approve', 'اجرا با تأیید', 'اقدام را آماده می‌کند و بعد از تأیید شما اجرا می‌شود'],
  ['auto', 'اجرای مستقیم', 'فقط برای کارهای کم‌خطر و برگشت‌پذیر'],
]
/** ماژول‌هایی که سطح «اجرای مستقیم» در آن‌ها ممنوع است (پول، قیمت، اصالت و حذف) */
export const LOCKED = ['finance', 'pricing', 'returns', 'team', 'settings', 'rules']

export type Agent = { id: string; name: string; desc: string; provider: string; conn: 'MCP' | 'REST API' | 'Webhook'; status: 'active' | 'paused'; scopes: Record<string, AgentLevel>
  limits: { perDay: number; maxDiscount: number; hours: string; refunds: boolean }; token?: { last4: string; created: string; expires: string }; lastActive?: string; actionsToday: number; playbooks: string[] }
export type Proposal = { id: string; kind: string; target: string; text: string; state: 'pending' | 'approved' | 'rejected' }
export type AgentTask = { id: string; agentId: string; title: string; schedule: 'once' | 'daily' | 'weekly'; at: string; status: 'queued' | 'running' | 'needs_approval' | 'done' | 'failed'; by: string; createdAt: string; result?: string; proposals?: Proposal[] }
export type Playbook = { id: string; title: string; area: string; body: string; good?: string; bad?: string; agents: string[]; updatedAt: string }
export type Automation = { id: string; name: string; trigger: string; condition: string; agentId: string; action: string; approval: boolean; on: boolean; runs: number; lastRun?: string }
export type AgentLog = { id: string; agentId: string; at: string; action: string; target: string; result: 'ok' | 'pending' | 'blocked'; note?: string }

/** محرک‌های قابل انتخاب در اتوماسیون؛ همان رویدادهای وب‌هوک پنل */
export const TRIGGERS = ['تیکت تازه ثبت شد', 'سفارش تازه با امتیاز ریسک بالا', 'موجودی کالا کمتر از حد شد', 'کالای تازه به‌صورت پیش‌نویس ذخیره شد', 'مرجوعی به مهلت ارسال نزدیک شد', 'دیدگاه تازه ثبت شد', 'سبد خرید رها شد', 'هر روز ساعت ۸ صبح', 'هر شنبه ساعت ۹ صبح']
export const TEMPLATES: { title: string; area: string; trigger: string; action: string; agent: string; approval: boolean }[] = [
  { title: 'پیش‌نویس پاسخ تیکت', area: 'پشتیبانی', trigger: 'تیکت تازه ثبت شد', action: 'پیش‌نویس پاسخ بر اساس دستورالعمل لحن و قوانین مرجوعی و ارجاع به کارشناس', agent: 'ag-support', approval: true },
  { title: 'بررسی سفارش مشکوک', area: 'سفارش‌ها', trigger: 'سفارش تازه با امتیاز ریسک بالا', action: 'خلاصهٔ دلایل ریسک و پیشنهاد «تأیید، تماس یا لغو» برای مدیر عملیات', agent: 'ag-ops', approval: true },
  { title: 'هشدار موجودی و پیشنهاد خرید', area: 'تأمین', trigger: 'موجودی کالا کمتر از حد شد', action: 'پیشنهاد تعداد سفارش بر اساس فروش ۳۰ روز و زمان رسیدن', agent: 'ag-ops', approval: true },
  { title: 'توضیح و سئوی کالای تازه', area: 'کاتالوگ', trigger: 'کالای تازه به‌صورت پیش‌نویس ذخیره شد', action: 'بازنویسی توضیح، عنوان سئو و برچسب‌ها؛ بدون دست زدن به قیمت، گرید و اصالت', agent: 'ag-content', approval: true },
  { title: 'یادآوری مرجوعی', area: 'مرجوعی', trigger: 'مرجوعی به مهلت ارسال نزدیک شد', action: 'پیامک یادآوری مهلت ارسال با قالب تأییدشده', agent: 'ag-support', approval: false },
  { title: 'گزارش صبحگاهی', area: 'مدیریت', trigger: 'هر روز ساعت ۸ صبح', action: 'خلاصهٔ دیروز: فروش، سود، سفارش‌های گیرکرده، تیکت‌های فوری و کارهای امروز', agent: 'ag-ops', approval: false },
  { title: 'پیش‌نویس پاسخ دیدگاه', area: 'دیدگاه‌ها', trigger: 'دیدگاه تازه ثبت شد', action: 'پیش‌نویس پاسخ محترمانه؛ دیدگاه منفی به کارشناس ارجاع می‌شود', agent: 'ag-support', approval: true },
  { title: 'پیگیری سبد رهاشده', area: 'بازاریابی', trigger: 'سبد خرید رها شد', action: 'پیامک یادآوری بدون کد تخفیف؛ کد تخفیف فقط با تأیید', agent: 'ag-content', approval: true },
]

export function makeAgents() {
  const agents: Agent[] = [
    { id: 'ag-ops', name: 'دستیار عملیات', desc: 'سفارش‌های گیرکرده، ریسک، موجودی و گزارش روزانه', provider: 'مدل زبانی (قابل تعویض)', conn: 'MCP', status: 'active',
      scopes: { home: 'read', orders: 'approve', shipping: 'draft', warehouse: 'read', supply: 'draft', catalog: 'read', analytics: 'read', returns: 'read' },
      limits: { perDay: 200, maxDiscount: 0, hours: '۰۸ تا ۲۲', refunds: false }, token: { last4: '7Q2K', created: ago(60 * 24 * 6), expires: new Date(Date.now() + 864e5 * 24).toISOString() }, lastActive: ago(7), actionsToday: 46, playbooks: ['pb-ops', 'pb-escalate'] },
    { id: 'ag-support', name: 'دستیار پشتیبانی', desc: 'پیش‌نویس پاسخ تیکت، دیدگاه و یادآوری مرجوعی', provider: 'مدل زبانی (قابل تعویض)', conn: 'MCP', status: 'active',
      scopes: { support: 'approve', reviews: 'approve', customers: 'read', orders: 'read', returns: 'draft', messaging: 'approve' },
      limits: { perDay: 300, maxDiscount: 0, hours: '۰۹ تا ۲۱', refunds: false }, token: { last4: 'M8VD', created: ago(60 * 24 * 3), expires: new Date(Date.now() + 864e5 * 27).toISOString() }, lastActive: ago(2), actionsToday: 83, playbooks: ['pb-tone', 'pb-returns', 'pb-escalate'] },
    { id: 'ag-content', name: 'دستیار محتوا', desc: 'توضیح کالا، سئو، وبلاگ و پیامک بازاریابی', provider: 'مدل زبانی (قابل تعویض)', conn: 'REST API', status: 'paused',
      scopes: { catalog: 'draft', readiness: 'draft', seo: 'draft', blog: 'draft', marketing: 'draft' },
      limits: { perDay: 120, maxDiscount: 0, hours: '۲۴ ساعته', refunds: false }, lastActive: ago(60 * 26), actionsToday: 0, playbooks: ['pb-tone', 'pb-product'] },
  ]
  const tasks: AgentTask[] = [
    { id: 'tk-1', agentId: 'ag-support', title: 'تیکت‌های بی‌پاسخ بیش از ۲ ساعت را پیش‌نویس کن و فوری‌ها را اول بیاور', schedule: 'daily', at: '۱۰:۰۰', status: 'needs_approval', by: 'بهشاد', createdAt: ago(80), result: '۳ پیش‌نویس آماده است.',
      proposals: [{ id: 'p1', kind: 'پاسخ تیکت', target: 'TK-482106', text: 'سلام آقای رنجبران، از کم بودن کابل شارژ پوزش می‌خواهیم. کابل اصل همین امروز با پیک برایتان ارسال می‌شود و هزینه‌ای ندارد.', state: 'pending' },
        { id: 'p2', kind: 'پاسخ تیکت', target: 'TK-482093', text: 'سلام، سفارش شما در حال آماده‌سازی است و تا حدود ۴۵ دقیقهٔ دیگر تحویل پیک می‌شود. پیامک رصد پیک را همان لحظه دریافت می‌کنید.', state: 'pending' },
        { id: 'p3', kind: 'ارجاع', target: 'TK-482071', text: 'مشتری دربارهٔ زمان واریز مرجوعی می‌پرسد؛ پرونده در مرحلهٔ بررسی کالاست. پیشنهاد: ارجاع به کارشناس مرجوعی.', state: 'pending' }] },
    { id: 'tk-2', agentId: 'ag-ops', title: 'گزارش صبحگاهی دیروز', schedule: 'daily', at: '۰۸:۰۰', status: 'done', by: 'اتوماسیون', createdAt: ago(60 * 3), result: 'فروش دیروز ۱۴۷ میلیون تومان (۶٪ بالاتر از میانگین هفته). ۲ مرسوله از مهلت ارسال گذشته. ۱ تیکت فوری. موجودی AirPods Max به ۲ عدد رسیده است.' },
    { id: 'tk-3', agentId: 'ag-ops', title: 'سفارش‌های با ریسک بالای ۶۰ را بررسی کن و پیشنهاد بده', schedule: 'once', at: 'اکنون', status: 'queued', by: 'بهشاد', createdAt: ago(5) },
  ]
  const playbooks: Playbook[] = [
    { id: 'pb-tone', title: 'لحن و نگارش غنیمت', area: 'همه', body: 'فارسی رسمی ولی گرم، بدون اغراق و بدون ایموجی. همیشه پوزش کوتاه وقتی خطا از ماست. وعده‌ای که پنل پشتیبانی نمی‌کند نده (مثل زمان تحویل دقیق بدون رصد پیک). نام مشتری را با «آقا» یا «خانم» فقط اگر در پرونده هست به کار ببر.', good: 'سلام، از تأخیر پوزش می‌خواهیم. سفارش شما ساعت ۱۴ تحویل پیک می‌شود.', bad: 'سلام دوست عزیز! نگران نباش، زودی می‌رسه 😊', agents: ['ag-support', 'ag-content'], updatedAt: ago(60 * 24 * 2) },
    { id: 'pb-returns', title: 'قوانین مرجوعی و گارانتی', area: 'پشتیبانی', body: 'مهلت مرجوعی ۷ روز پس از تحویل. دلیل‌ها: ایراد کارکردی، مغایرت با صفحهٔ کالا، کالای غیراصل، آسیب حین حمل، انصراف. انصراف: هزینهٔ ارسال برگشت با مشتری. ثبت مرجوعی فقط از پنل کاربری. هرگز وعدهٔ بازگشت وجه پیش از بررسی کالا نده.', agents: ['ag-support'], updatedAt: ago(60 * 24 * 5) },
    { id: 'pb-escalate', title: 'چه زمانی به انسان ارجاع بدهی', area: 'همه', body: 'شکایت از اصالت، تهدید به شکایت قانونی، مبلغ بالای ۲۰ میلیون، مشتری VIP، هر درخواست بازگشت وجه، هر تغییر قیمت یا تخفیف، و هر جا مطمئن نیستی.', agents: ['ag-ops', 'ag-support'], updatedAt: ago(60 * 24 * 1) },
    { id: 'pb-product', title: 'نوشتن توضیح کالا', area: 'کاتالوگ', body: 'وضعیت کالا (آکبند، جعبه‌باز، استوک و گرید) را تغییر نده. ایرادهای ظاهری ثبت‌شده را حذف نکن. مشخصات فنی فقط از منبع رسمی. بدون ادعای «ارزان‌ترین» یا «بهترین».', agents: ['ag-content'], updatedAt: ago(60 * 24 * 4) },
    { id: 'pb-ops', title: 'بررسی سفارش و ریسک', area: 'سفارش‌ها', body: 'نشانه‌های ریسک: نشانی ناقص، سفارش گران اول، تطابق نداشتن نام گیرنده با پرداخت‌کننده، چند سفارش پشت سر هم. پیشنهادت باید یکی از «تأیید»، «تماس برای تأیید» یا «لغو با دلیل» باشد، با دلیل کوتاه.', agents: ['ag-ops'], updatedAt: ago(60 * 24 * 3) },
  ]
  const automations: Automation[] = TEMPLATES.slice(0, 6).map((t, i) => ({ id: `au-${i + 1}`, name: t.title, trigger: t.trigger, condition: i === 1 ? 'امتیاز ریسک ≥ ۶۰' : i === 2 ? 'کمتر از ۳ عدد' : '—', agentId: t.agent, action: t.action, approval: t.approval, on: i !== 3, runs: [42, 7, 5, 0, 12, 18][i], lastRun: i === 3 ? undefined : ago([15, 90, 300, 0, 600, 180][i]) }))
  const log: AgentLog[] = [
    { id: 'l1', agentId: 'ag-support', at: ago(2), action: 'پیش‌نویس پاسخ تیکت', target: 'TK-482106', result: 'pending' },
    { id: 'l2', agentId: 'ag-ops', at: ago(7), action: 'خواندن سفارش‌های گیرکرده', target: '۲ مرسوله', result: 'ok' },
    { id: 'l3', agentId: 'ag-support', at: ago(25), action: 'ارسال پیامک یادآوری مرجوعی', target: 'RT-841880', result: 'ok' },
    { id: 'l4', agentId: 'ag-ops', at: ago(40), action: 'تلاش برای تغییر قیمت', target: 'p2', result: 'blocked', note: 'قیمت‌گذاری برای ایجنت قفل است.' },
    { id: 'l5', agentId: 'ag-ops', at: ago(60 * 3), action: 'گزارش صبحگاهی', target: 'خانه', result: 'ok' },
  ]
  return { agents, tasks, playbooks, automations, log }
}
