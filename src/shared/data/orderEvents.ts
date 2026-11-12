// رویدادهای تازهٔ سفارش که باید فوری دیده و تصمیم‌گیری شوند: درخواست لغو، کمبود موجودی، تغییر از طرف مشتری، مشکل پرداخت
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
export type OrderEvent = { id: string; orderId: string; kind: 'cancel' | 'stock' | 'change' | 'payment'; title: string; body: string; at: string; by: string; status: 'open' | 'done' | 'rejected'; payload?: Record<string, string>; result?: string }
export const makeOrderEvents = (): OrderEvent[] => [
  { id: 'EV-31', orderId: 'GH-10494', kind: 'change', title: 'مشتری نشانی تحویل را عوض کرد', body: 'الهام کریمی از پنل خود درخواست تغییر نشانی داد: «شیراز، معالی‌آباد، کوچهٔ ۱۴، پلاک ۸، واحد ۳». مرسوله هنوز تحویل پست نشده است.', at: ago(9), by: 'مشتری (پنل کاربری)', status: 'open', payload: { address: 'شیراز، معالی‌آباد، کوچهٔ ۱۴، پلاک ۸، واحد ۳' } },
  { id: 'EV-30', orderId: 'GH-10479', kind: 'cancel', title: 'درخواست لغو یک قلم', body: 'مشتری تلفنی گفت قلم انبار مهاباد را نمی‌خواهد و فقط مرسولهٔ تهران ارسال شود. بازگشت وجه به کیف پول.', at: ago(26), by: 'تماس تلفنی (سارا)', status: 'open', payload: { scope: 'یک قلم', refundTo: 'کیف پول' } },
  { id: 'EV-29', orderId: 'GH-10480', kind: 'cancel', title: 'درخواست لغو کل سفارش', body: 'نگار امینی: «از خرید منصرف شدم.» بازگشت وجه به کیف پول خواسته شده. (درخواست CR-501)', at: ago(40), by: 'مشتری (پنل کاربری)', status: 'open', payload: { scope: 'کل سفارش', refundTo: 'کیف پول', cr: 'CR-501' } },
  { id: 'EV-28', orderId: 'GH-10493', kind: 'stock', title: 'موجودی تمام شد', body: 'هنگام جمع‌آوری مشخص شد هدفون سونی WH-1000XM5 در انبار تهران ناموجود است (واحد رزروشده در QC معیوب درآمد). انبار مهاباد ۱ عدد دارد.', at: ago(14), by: 'سیستم انبار (آرش)', status: 'open' },
]
