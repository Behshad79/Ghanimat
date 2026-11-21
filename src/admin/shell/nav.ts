import { FileBarChart, NotebookPen, Images, Landmark, Workflow, Zap, Flame, PhoneCall, Newspaper, ListChecks, Archive, IdCard, Trash2, PanelsTopLeft, Inbox, SlidersHorizontal, MessagesSquare, Share2 as SocialIcon, LayoutTemplate, Cable, BadgePercent, Activity, BarChart3, Bot, Boxes, Building2, CircleDollarSign, FileText, Headphones, Home, Megaphone, MessageSquareText, PackageSearch, Palette, Printer, Rocket, RotateCcw, Scale, Search, ServerCog, Settings, Share2, ShoppingBag, Store, Tags, Truck, Users, UsersRound, Warehouse, ScanLine, HandCoins, type LucideIcon } from 'lucide-react'
import type { DB } from '@/shared/data/seed'
import { minsLeft } from '@/shared/lib/fa'

export type NavItem = { id: string; label: string; icon: LucideIcon; path: string; group: string; soon?: boolean; urgent?: boolean; also?: string; count?: (d: DB) => number }
// منوی کناری: «امروز» پنج کار پرتکرار روزانه است و همیشه باز می‌ماند؛ بقیهٔ گروه‌ها آکاردئونی‌اند (یکی باز)، به ترتیب اولویت کار.
// شمارندهٔ قرمز فقط برای کار فوری (urgent)؛ بقیه خاکستری و اطلاعاتی.
export const NAV_CLOSED_DEFAULT = ['سیستم']
// آیکون‌ها جایگزین موقت خانوادهٔ Magicoon هستند.
export const NAV: NavItem[] = [
  { id: 'home', label: 'خانه', icon: Home, path: '/admin', group: 'امروز' },
  { id: 'live', urgent: true, also: 'سفارش و ارسال', label: 'مرکز عملیات زنده', icon: Activity, path: '/admin/live', group: 'امروز', count: (d) => d.orders.flatMap((o) => o.shipments).filter((s) => !['ship.delivered', 'ship.cancelled'].includes(s.status) && minsLeft(s.sla) < 45).length },
  { id: 'planner', label: 'یادداشت و برنامه‌ریزی', icon: NotebookPen, path: '/admin/planner', group: 'امروز', count: (d) => (d.planner?.notes ?? []).filter((n) => !n.done && n.kind !== 'note' && n.due && new Date(n.due).toDateString() === new Date().toDateString()).length },
  { id: 'orders', urgent: true, also: 'سفارش و ارسال', label: 'سفارش‌ها', icon: ShoppingBag, path: '/admin/orders', group: 'امروز', count: (d) => d.orders.filter((o) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(o.status) || d.orderEvents.some((e) => e.status === 'open' && e.orderId === o.id)).length },
  { id: 'packing', urgent: true, also: 'سفارش و ارسال', label: 'ایستگاه بسته‌بندی و اسکن', icon: ScanLine, path: '/admin/packing', group: 'امروز', count: (d) => d.orders.flatMap((o) => o.shipments).filter((s) => s.status === 'ship.picking').length },
  { id: 'support', urgent: true, also: 'مشتریان و پشتیبانی', label: 'پشتیبانی', icon: Headphones, path: '/admin/support', group: 'امروز', count: (d) => d.tickets.filter((t) => ['ticket.new', 'ticket.open'].includes(t.status)).length },
  { id: 'network', label: 'شعب و ارسال سریع', icon: Zap, path: '/admin/network', group: 'سفارش و ارسال', count: (d) => [d.network?.closed, d.network?.fastOff].filter((x) => x && new Date(x.until).getTime() > Date.now()).length },
  { id: 'shipping', label: 'ارسال، پیک و پست', icon: Truck, path: '/admin/shipping', group: 'سفارش و ارسال' },
  { id: 'social', urgent: true, label: 'فروش اجتماعی و کارت به کارت', icon: SocialIcon, path: '/admin/social', group: 'سفارش و ارسال', count: (d) => d.bank.receipts.filter((r) => r.status !== 'تطبیق شد').length },
  { id: 'returns', urgent: true, label: 'مرجوعی و گارانتی', icon: RotateCcw, path: '/admin/returns', group: 'سفارش و ارسال', count: (d) => d.returns.filter((r) => r.status === 'return.inspecting').length + d.warranties.filter((w) => w.status === 'warranty.pending').length },
  { id: 'print', label: 'چاپ برچسب و فاکتور', icon: Printer, path: '/admin/print', group: 'سفارش و ارسال' },
  { id: 'requests', urgent: true, label: 'درخواست‌های مشتری', icon: Inbox, path: '/admin/requests', group: 'مشتریان و پشتیبانی', count: (d) => ['contactMessages', 'productReports', 'branchInquiries', 'cancelRequests', 'withdrawals'].reduce((a, k) => a + (d.entities[k] ?? []).filter((r) => /جدید|انتظار|بررسی/.test(String(r.status))).length, 0) },
  { id: 'conversations', label: 'گفتگوها و دستیار خرید', icon: MessagesSquare, path: '/admin/conversations', group: 'مشتریان و پشتیبانی' },
  { id: 'calls', label: 'تلفن و تماس‌ها', icon: PhoneCall, path: '/admin/calls', group: 'مشتریان و پشتیبانی', count: (d) => (d.calls?.calls ?? []).filter((c) => c.status === 'از دست رفته' && !c.callbackDone).length },
  { id: 'reviews', label: 'دیدگاه‌ها و پرسش‌ها', icon: MessageSquareText, path: '/admin/reviews', group: 'مشتریان و پشتیبانی', count: (d) => d.reviews.filter((r) => r.status === 'review.pending').length },
  { id: 'customers', label: 'مشتریان', icon: Users, path: '/admin/customers', group: 'مشتریان و پشتیبانی' },
  { id: 'catalog', label: 'کالا و کاتالوگ', icon: PackageSearch, path: '/admin/catalog', group: 'کالا و کاتالوگ', count: (d) => d.partnerQueue.length },
  { id: 'readiness', label: 'آمادگی کالا و محتوا', icon: ListChecks, path: '/admin/readiness', group: 'کالا و کاتالوگ', count: (d) => d.contentQueue.filter((c) => c.status === 'آماده انتشار').length },
  { id: 'media', label: 'کتابخانهٔ رسانه', icon: Images, path: '/admin/media', group: 'کالا و کاتالوگ', count: (d) => d.media.filter((m) => !m.alt).length },
  { id: 'inbound', label: 'تأمین و ورود بار', icon: Truck, path: '/admin/inbound', group: 'انبار و تأمین', count: (d) => (d.stock?.manifests ?? []).filter((m) => ['draft', 'packing', 'sent'].includes(m.status)).length + d.incoming.filter((b) => !b.receivedAt).length },
  { id: 'warehouse', label: 'انبار و موجودی', icon: Warehouse, path: '/admin/warehouse', group: 'انبار و تأمین', count: (d) => d.units.filter((u) => ['unit.qc', 'unit.photo', 'unit.ready'].includes(u.status)).length },
  { id: 'ownership', label: 'مالکیت و تسویهٔ شرکا', icon: HandCoins, path: '/admin/ownership', group: 'انبار و تأمین' },
  { id: 'trade', label: 'امور بازرگانی', icon: Landmark, path: '/admin/trade', group: 'انبار و تأمین' },
  { id: 'pricing', label: 'قیمت‌گذاری و تخفیف‌ها', icon: Tags, path: '/admin/pricing', group: 'فروش و قیمت' },
  { id: 'promotions', label: 'موتور پروموشن و کمپین', icon: BadgePercent, path: '/admin/promotions', group: 'فروش و قیمت' },
  { id: 'merch', label: 'ویترین و غنی‌آف', icon: Flame, path: '/admin/merch', group: 'فروش و قیمت', count: (d) => (d.merch?.deals ?? []).filter((x) => !x.endedAt && x.sold < x.cap && !x.paused && +new Date(x.start) <= Date.now() && +new Date(x.end) > Date.now() && +new Date(x.end) - Date.now() < 2 * 36e5).length },
  { id: 'channels', label: 'کانال‌های فروش', icon: Share2, path: '/admin/channels', group: 'فروش و قیمت' },
  { id: 'sellers', label: 'شرکای مستقل (به‌زودی)', icon: Store, path: '/admin/sellers', group: 'فروش و قیمت' },
  { id: 'finance', urgent: true, label: 'مالی، درگاه‌ها و تسویه', icon: CircleDollarSign, path: '/admin/finance', group: 'مالی و حسابداری', count: (d) => d.txns.filter((t) => t.status === 'pay.unknown').length },
  { id: 'treasury', label: 'حسابداری و خزانه', icon: Landmark, path: '/admin/treasury', group: 'مالی و حسابداری', count: (d) => (d.treasury?.entries ?? []).filter((e) => e.status === 'approval').length + (d.treasury?.sms ?? []).filter((x) => !x.entry && x.dir === 'out').length },
  { id: 'investor', label: 'گزارش سرمایه‌گذار', icon: FileBarChart, path: '/admin/investor-report', group: 'مالی و حسابداری' },
  { id: 'marketing', label: 'مارکتینگ', icon: Megaphone, path: '/admin/marketing', group: 'بازاریابی' },
  { id: 'messaging', label: 'پیامک و پیگیری خودکار', icon: MessagesSquare, path: '/admin/messaging', group: 'بازاریابی', count: (d) => (d.nudges?.blasts ?? []).filter((b) => b.status === 'زمان‌بندی‌شده').length },
  { id: 'seo', label: 'سئو', icon: Search, path: '/admin/seo', group: 'بازاریابی' },
  { id: 'growth', label: 'رشد و آزمایش', icon: Rocket, path: '/admin/growth', group: 'بازاریابی' },
  { id: 'analytics', label: 'تحلیل و گزارش', icon: BarChart3, path: '/admin/analytics', group: 'گزارش و هوشمندسازی' },
  { id: 'ai', label: 'هوش مصنوعی', icon: Bot, path: '/admin/ai', group: 'گزارش و هوشمندسازی' },
  { id: 'agents', label: 'ایجنت‌ها و اتوماسیون', icon: Workflow, path: '/admin/agents', group: 'گزارش و هوشمندسازی', count: (d) => d.agents.tasks.filter((t) => t.status === 'needs_approval').length },
  { id: 'builder', label: 'صفحه‌ساز', icon: LayoutTemplate, path: '/admin/builder', group: 'سایت و محتوا' },
  { id: 'content', label: 'محتوا و صفحات سایت', icon: FileText, path: '/admin/content', group: 'سایت و محتوا' },
  { id: 'blog', label: 'وبلاگ و ویدیوها', icon: Newspaper, path: '/admin/blog', group: 'سایت و محتوا', count: (d) => d.blog.comments.filter((c) => c.status === 'pending').length },
  { id: 'site', label: 'سربرگ، منو و فوتر', icon: PanelsTopLeft, path: '/admin/site', group: 'سایت و محتوا', count: (d) => (JSON.stringify(d.site) !== JSON.stringify(d.sitePublished) ? 1 : 0) },
  { id: 'experience', label: 'تنظیمات سایت و پنل مشتری', icon: SlidersHorizontal, path: '/admin/experience', group: 'سایت و محتوا' },
  { id: 'team', label: 'تیم و دسترسی', icon: UsersRound, path: '/admin/team', group: 'سازمان و تیم' },
  { id: 'people', label: 'پرسنل، قرارداد و حقوق', icon: IdCard, path: '/admin/people', group: 'سازمان و تیم', count: (d) => d.people.flatMap((e) => e.pay).filter((p) => p.status === 'due').length },
  { id: 'branches', label: 'شعب غنیمت', icon: Building2, path: '/admin/branches', group: 'سازمان و تیم' },
  { id: 'vault', label: 'بایگانی اسناد و مجوزها', icon: Archive, path: '/admin/vault', group: 'سازمان و تیم', count: (d) => d.vault.filter((v) => v.expires && new Date(v.expires).getTime() - Date.now() < v.remind * 864e5).length },
  { id: 'rules', label: 'قوانین کسب‌وکار', icon: Scale, path: '/admin/rules', group: 'سازمان و تیم' },
  { id: 'settings', label: 'تنظیمات و سیستم', icon: Settings, path: '/admin/settings', group: 'سیستم' },
  { id: 'integrations', label: 'مرکز اتصالات و API', icon: Cable, path: '/admin/integrations', group: 'سیستم', count: (d) => d.hub.deliveries.filter((x) => x.status >= 300).length },
  { id: 'remote', label: 'ربات تلگرام و فرمان پیامکی', icon: Bot, path: '/admin/remote', group: 'سیستم', count: (d) => (d.remote?.telegram.on && d.remote?.sms.on ? 0 : 1) },
  { id: 'infra', label: 'زیرساخت و سرویس‌ها', icon: ServerCog, path: '/admin/infra', group: 'سیستم' },
  { id: 'design', label: 'سیستم طراحی', icon: Palette, path: '/admin/design', group: 'سیستم' },
  { id: 'trash', label: 'سطل بازیافت', icon: Trash2, path: '/admin/trash', group: 'سیستم', count: (d) => d.trash.length },
]

/** توضیح کوتاه هر گروه منو: کنار عنوان گروه دیده می‌شود تا معلوم باشد هر بخش برای چه کاری است */
export const GROUP_HINT: Record<string, string> = {
  'سفارش و ارسال': 'از ثبت سفارش تا تحویل و مرجوعی',
  'مشتریان و پشتیبانی': 'تیکت، درخواست، تماس و پروفایل مشتری',
  'کالا و کاتالوگ': 'صفحهٔ کالا، محتوا و رسانه',
  'انبار و تأمین': 'خرید، ورود بار، موجودی و سهم شرکا',
  'فروش و قیمت': 'قیمت، تخفیف، ویترین و کانال‌ها',
  'مالی و حسابداری': 'درگاه و تسویه، هزینه و خزانه',
  'بازاریابی': 'کمپین، پیامک، سئو و آزمایش',
  'گزارش و هوشمندسازی': 'تحلیل، هوش مصنوعی و اتوماسیون',
  'سایت و محتوا': 'صفحه‌ها، وبلاگ و ظاهر سایت',
  'سازمان و تیم': 'افراد، دسترسی، شعب و قوانین',
  'سیستم': 'تنظیمات، اتصال‌ها و زیرساخت',
}

