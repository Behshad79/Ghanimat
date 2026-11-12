// سفارش‌های دریافت حضوری: از آماده‌سازی تا تحویل با رسید امضاشده (بایگانی برای آینده)
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
const inH = (h: number) => new Date(Date.now() + h * 36e5).toISOString()
export type Pickup = { id: string; orderId: string; customerId: string; branch: string; status: 'preparing' | 'ready' | 'handed' | 'expired'; window: string; code: string; readyAt?: string; deadline: string; receiver?: string; receiverId?: string; relation?: string; handedAt?: string; by?: string; receipt?: string; note?: string; items: string[] }
export const makePickups = (): Pickup[] => [
  { id: 'PU-1201', orderId: 'GH-10480', customerId: 'c2', branch: 'شعبهٔ ونک', status: 'ready', window: 'امروز ساعت ۱۷ تا ۱۹', code: '4821', readyAt: ago(60 * 5), deadline: inH(60), items: ['p2'] },
  { id: 'PU-1199', orderId: 'GH-10476', customerId: 'c5', branch: 'شعبهٔ سعادت‌آباد', status: 'preparing', window: 'فردا ساعت ۹ تا ۱۷', code: '3907', deadline: inH(84), items: ['p4', 'p9'] },
  { id: 'PU-1187', orderId: 'GH-10466', customerId: 'c1', branch: 'شعبهٔ ونک', status: 'handed', window: 'یکشنبه ۳ آبان · ساعت ۹ تا ۱۷', code: '1550', readyAt: ago(60 * 52), deadline: ago(60 * 10), receiver: 'سروش رنجبران', receiverId: '۰۰۱۲۳۴۵۶۷۸', relation: 'خود مشتری', handedAt: ago(60 * 48), by: 'نیما', receipt: '', items: ['p9'] },
  { id: 'PU-1180', orderId: 'GH-10458', customerId: 'c4', branch: 'شعبهٔ سعادت‌آباد', status: 'handed', window: '۴ آبان، ساعت ۱۷ تا ۱۹', code: '7720', readyAt: ago(60 * 24 * 6), deadline: ago(60 * 24 * 3), receiver: 'مهدی کاظمی', receiverId: '۰۰۸۷۶۵۴۳۲۱', relation: 'نمایندهٔ شرکت (معرفی‌نامه)', handedAt: ago(60 * 24 * 5), by: 'آرش', receipt: '', items: ['p1', 'p2'] },
  { id: 'PU-1174', orderId: 'GH-10469', customerId: 'c7', branch: 'شعبهٔ ونک', status: 'expired', window: '۱ آبان، ساعت ۹ تا ۱۷', code: '6611', readyAt: ago(60 * 24 * 9), deadline: ago(60 * 24 * 6), note: 'مشتری مراجعه نکرد؛ سفارش لغو و مبلغ به کیف پول برگشت.', items: ['p8'] },
]
