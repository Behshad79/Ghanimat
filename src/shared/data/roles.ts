// نقش‌های پایه؛ پس از اولین اجرا در پایگاه‌داده کپی می‌شوند و از «تیم و دسترسی» قابل ویرایش‌اند
export type Face = 'full' | 'simple' | 'partner'
export type RoleDef = { label: string; face: Face; modules: string[] | '*'; home: string; opens: string; custom?: boolean; desc?: string }
export const BASE_ROLES: Record<string, RoleDef> = {
  super: { label: 'مدیر کل', face: 'full', modules: '*', home: '/admin', opens: 'پنل کامل، همهٔ ماژول‌ها' },
  cofounder: { label: 'مدیر کل دوم (شریک انبار)', face: 'full', modules: '*', home: '/admin', opens: 'همهٔ بخش‌های پنل؛ مدیر کل هر بخش را بخواهد از «تیم و دسترسی» می‌بندد. کارهای حساس به تأیید مدیر کل می‌رود و همهٔ اقدام‌ها با سند در لاگ ممیزی ثبت می‌شود.', desc: 'برای شریکی مثل یاسین که بخشی از غنیمت است و انبار شهر خودش را می‌گرداند' },
  ops: { label: 'مدیر عملیات', face: 'full', modules: ['home', 'live', 'network', 'orders', 'packing', 'ownership', 'warehouse', 'shipping', 'print', 'returns', 'catalog', 'media', 'trade', 'readiness', 'team', 'trash'], home: '/admin/live', opens: 'سفارش‌ها، انبار، ارسال، مرجوعی' },
  simple: { label: 'اپراتور', face: 'simple', modules: [], home: '/simple', opens: 'حالت سریع (کامل، بدون نیاز به تأیید)' },
  partner: { label: 'شریک فروش (شعبه)', face: 'partner', modules: [], home: '/partner', opens: 'پرتال شریک' },
  support: { label: 'کارشناس پشتیبانی', face: 'full', modules: ['home', 'support', 'customers', 'orders', 'reviews', 'returns'], home: '/admin/support', opens: 'صندوق ورودی' },
  finance: { label: 'کارشناس مالی', face: 'full', modules: ['home', 'finance', 'ownership', 'people', 'orders', 'pricing', 'returns', 'analytics'], home: '/admin/finance', opens: 'مالی و تسویه' },
  growth: { label: 'مارکتینگ، سئو و رشد', face: 'full', modules: ['home', 'readiness', 'blog', 'marketing', 'seo', 'growth', 'analytics', 'content', 'channels', 'pricing', 'reviews', 'merch'], home: '/admin/marketing', opens: 'مارکتینگ، سئو، رشد، تحلیل' },
  branch: { label: 'مدیر شعبهٔ شریک (دسترسی گسترده)', face: 'full', modules: ['home', 'live', 'network', 'orders', 'packing', 'ownership', 'social', 'shipping', 'returns', 'print', 'catalog', 'media', 'warehouse', 'supply', 'readiness', 'support', 'calls', 'requests', 'reviews', 'conversations', 'customers', 'merch', 'pricing', 'channels', 'sellers', 'messaging', 'analytics'], home: '/admin/live', opens: 'تقریباً کل پنل جز تیم و دسترسی، حقوق، تنظیمات سیستم، قوانین و اتصالات؛ فروش‌ها و سهم خودش را می‌بیند', desc: 'برای شریکی مثل یاسین که شعبه را می‌گرداند' },
  qc: { label: 'کارشناس کنترل کیفیت و انبار', face: 'full', modules: ['home', 'warehouse', 'packing', 'catalog', 'media', 'trade', 'print'], home: '/admin/warehouse', opens: 'صف‌های انبار (نسخهٔ iPad)' },
}

