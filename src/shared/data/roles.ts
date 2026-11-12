// نقش‌های پایه؛ پس از اولین اجرا در پایگاه‌داده کپی می‌شوند و از «تیم و دسترسی» قابل ویرایش‌اند
export type Face = 'full' | 'simple' | 'partner'
export type RoleDef = { label: string; face: Face; modules: string[] | '*'; home: string; opens: string; custom?: boolean; desc?: string }
export const BASE_ROLES: Record<string, RoleDef> = {
  super: { label: 'مدیر کل', face: 'full', modules: '*', home: '/admin', opens: 'پنل کامل، همهٔ ماژول‌ها' },
  ops: { label: 'مدیر عملیات', face: 'full', modules: ['home', 'live', 'orders', 'warehouse', 'shipping', 'print', 'returns', 'catalog', 'team', 'trash'], home: '/admin/live', opens: 'سفارش‌ها، انبار، ارسال، مرجوعی' },
  simple: { label: 'اپراتور', face: 'simple', modules: [], home: '/simple', opens: 'حالت سریع (کامل، بدون نیاز به تأیید)' },
  partner: { label: 'شریک انبار مهاباد', face: 'partner', modules: [], home: '/partner', opens: 'پرتال شریک' },
  support: { label: 'کارشناس پشتیبانی', face: 'full', modules: ['home', 'support', 'customers', 'orders', 'reviews', 'returns'], home: '/admin/support', opens: 'صندوق ورودی' },
  finance: { label: 'کارشناس مالی', face: 'full', modules: ['home', 'finance', 'orders', 'pricing', 'returns', 'analytics'], home: '/admin/finance', opens: 'مالی و تسویه' },
  growth: { label: 'مارکتینگ، سئو و رشد', face: 'full', modules: ['home', 'marketing', 'seo', 'growth', 'analytics', 'content', 'channels', 'pricing', 'reviews'], home: '/admin/marketing', opens: 'مارکتینگ، سئو، رشد، تحلیل' },
  qc: { label: 'کارشناس کنترل کیفیت و انبار', face: 'full', modules: ['home', 'warehouse', 'catalog', 'print'], home: '/admin/warehouse', opens: 'صف‌های انبار (نسخهٔ iPad)' },
}

