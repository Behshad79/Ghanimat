// جزئیات تکمیلی دیدگاه‌ها و پرسش و پاسخ کالاها
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString()

export type RevMeta = { pros: string[]; cons: string[]; recommend: 'yes' | 'no' | 'unsure'; likes: number; dislikes: number; reports: { by: string; reason: string; at: string }[]; reply?: { by: string; text: string; at: string } }
export type Answer = { id: string; by: string; customerId?: string; staff?: boolean; text: string; status: 'pending' | 'approved' | 'rejected'; at: string; likes: number; dislikes: number }
export type Question = { id: string; productId: string; customerId: string; text: string; status: 'pending' | 'approved' | 'rejected'; at: string; answers: Answer[]; askedBuyers?: number }

export function makeReviewMeta(): Record<string, RevMeta> {
  return {
    'RV-1': { pros: ['مطابق عکس‌های واقعی واحد', 'خط ریز همان‌قدر که نوشته شده بود'], cons: [], recommend: 'yes', likes: 18, dislikes: 1, reports: [] },
    'RV-2': { pros: ['ارسال سریع'], cons: ['رنگ با عکس فرق داشت'], recommend: 'no', likes: 6, dislikes: 2, reports: [] },
    'RV-3': { pros: [], cons: [], recommend: 'unsure', likes: 0, dislikes: 4, reports: [{ by: 'بازدیدکننده', reason: 'تبلیغ یا شمارهٔ تماس', at: ago(60 * 20) }, { by: 'نگار امینی', reason: 'اسپم', at: ago(60 * 12) }] },
    'RV-4': { pros: ['بسته‌بندی محکم', 'برگهٔ کنترل کیفیت داخل جعبه'], cons: ['جعبهٔ بیرونی کمی خط داشت'], recommend: 'yes', likes: 9, dislikes: 0, reports: [{ by: 'امیرحسین صادقی', reason: 'نامرتبط با کالا', at: ago(60 * 50) }], reply: { by: 'پشتیبانی غنیمت', text: 'ممنون از بازخوردتان. جعبهٔ بیرونی کالای وارداتی گاهی در حمل خط برمی‌دارد؛ وضعیت جعبه را از این به بعد در مشخصات هر واحد هم می‌نویسیم.', at: ago(60 * 40) } },
  }
}

export function makeQuestions(): Question[] {
  return [
    { id: 'Q-301', productId: 'p1', customerId: 'c2', text: 'این گوشی نسخهٔ دو سیم‌کارت است یا eSIM؟ رجیستری انجام شده؟', status: 'approved', at: ago(60 * 30), askedBuyers: 4, answers: [
      { id: 'A-1', by: 'پشتیبانی غنیمت', staff: true, text: 'نسخهٔ یک نانوسیم و eSIM است. رجیستری با کد فعال‌سازی گمرکی انجام شده و مدارکش همراه کالا ارسال می‌شود.', status: 'approved', at: ago(60 * 28), likes: 12, dislikes: 0 },
      { id: 'A-2', by: 'سروش رنجبران', customerId: 'c1', text: 'من خریدم؛ رجیستری بدون مشکل بود.', status: 'pending', at: ago(60 * 3), likes: 0, dislikes: 0 },
    ] },
    { id: 'Q-302', productId: 'p2', customerId: 'c5', text: 'جعبه‌باز یعنی استفاده شده؟ کابل و کیف اصلی همراهش هست؟', status: 'pending', at: ago(60 * 2), answers: [] },
    { id: 'Q-303', productId: 'p3', customerId: 'c7', text: 'گارانتی این کالا چقدر است و کجا باید مراجعه کنم؟', status: 'approved', at: ago(60 * 24 * 2), answers: [] },
    { id: 'Q-304', productId: 'p5', customerId: 'c6', text: 'رنگ واقعی با عکس فرق دارد؟', status: 'approved', at: ago(60 * 24 * 4), answers: [
      { id: 'A-3', by: 'کاوه مرادی', customerId: 'c3', text: 'زیر نور مهتابی کمی روشن‌تر دیده می‌شود.', status: 'approved', at: ago(60 * 24 * 3), likes: 5, dislikes: 1 },
    ] },
  ]
}
