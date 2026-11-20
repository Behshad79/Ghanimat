import { CheckCheck, CircleDollarSign, FileText, HandCoins, Headphones, MessageSquare, Package, RotateCcw, ScanLine, ShoppingBag, Store } from 'lucide-react'
import type { DB } from '@/shared/data/seed'
import { balances } from '@/shared/data/stock'
import { can, getSession } from '@/shared/lib/store'
import { NAV } from '../shell/nav'
import type { WaitItem } from './Pulse'

/** «کارهای من»: هر چیزی که همین حالا منتظر اقدام است، فقط از بخش‌هایی که نقش فعلی به آن دسترسی دارد */
export function waitItems(d: DB, all = false): (WaitItem & { module: string })[] {
  const cnt = (id: string) => NAV.find((n) => n.id === id)?.count?.(d) ?? 0
  const L: (WaitItem & { module: string })[] = [
    { module: 'orders', label: 'سفارش منتظر اقدام', count: cnt('orders'), to: '/admin/orders?tab=action', icon: ShoppingBag, urgent: true },
    { module: 'packing', label: 'مرسولهٔ منتظر بسته‌بندی', count: cnt('packing'), to: '/admin/packing', icon: ScanLine, urgent: true },
    { module: 'finance', label: 'تراکنش نامشخص', count: cnt('finance'), to: '/admin/finance?tab=txns&st=pay.unknown&fl=تراکنش‌های نامشخص', icon: CircleDollarSign, urgent: true },
    { module: 'warehouse', label: 'واحد منتظر QC، عکاسی یا انتشار', count: cnt('warehouse'), to: '/admin/warehouse?tab=qc', icon: Package },
    { module: 'returns', label: 'مرجوعی و گارانتی منتظر بررسی', count: cnt('returns'), to: '/admin/returns?st=return.inspecting|warranty.pending&fl=مرجوعی و گارانتی منتظر بررسی', icon: RotateCcw },
    { module: 'support', label: 'تیکت باز', count: cnt('support'), to: '/admin/support?fl=تیکت‌های باز', icon: Headphones },
    { module: 'reviews', label: 'دیدگاه و پرسش منتظر تأیید', count: cnt('reviews') + d.questions.filter((q) => q.status === 'pending' || q.answers.some((a) => a.status === 'pending')).length + d.blog.comments.filter((c) => c.status === 'pending').length, to: '/admin/reviews?tab=pending&fl=دیدگاه‌ها و پرسش‌های منتظر تأیید', icon: MessageSquare },
    { module: 'blog', label: 'مقالهٔ منتظر انتشار', count: d.blog.posts.filter((p) => p.status === 'در بازبینی').length, to: '/admin/blog?tab=posts&st=در بازبینی&fl=مقاله‌های منتظر انتشار', icon: FileText },
    { module: 'catalog', label: 'کالای شریک منتظر تأیید', count: d.partnerQueue.length, to: '/admin/catalog?tab=partner', icon: Store },
    { module: 'ownership', label: 'تسویهٔ باز با شرکا', count: balances(d.stock).filter((b) => Math.abs(b.net) > 0).length, to: '/admin/ownership?tab=settle', icon: HandCoins },
    { module: 'team', label: 'تأیید منتظر من', count: d.approvals.filter((a) => a.status === 'approval.pending').length, to: '/admin/team?tab=approvals', icon: CheckCheck },
  ]
  return all ? L : L.filter((x) => can(x.module, getSession()))
}
