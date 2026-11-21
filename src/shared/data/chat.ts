// پیام‌رسان درون‌تیمی: گفت‌وگوی دونفره و گروهی بین اعضای تیم، با فایل، پاسخ به پیام، واکنش و وضعیت خوانده‌شدن
export type ChatFile = { name: string; size: number; type: string; url?: string }
export type ChatMsg = { id: string; thread: string; from: string; at: string; text?: string; files?: ChatFile[]; replyTo?: string; reactions?: Record<string, string[]>; readBy: string[]; edited?: boolean; system?: boolean }
export type ChatThread = { id: string; kind: 'dm' | 'group'; name?: string; members: string[]; pinnedBy?: string[]; mutedBy?: string[]; createdBy?: string; at: string }
export type ChatDB = { threads: ChatThread[]; messages: ChatMsg[] }

const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
export function makeChat(): ChatDB {
  return {
    threads: [
      { id: 'th-ys', kind: 'dm', members: ['u1', 'u4'], at: ago(60 * 30), pinnedBy: ['u1', 'u4'] },
      { id: 'th-team', kind: 'group', name: 'تیم غنیمت', members: ['u1', 'u4', 'u9', 'u2'], at: ago(60 * 48), createdBy: 'u1', pinnedBy: ['u1'] },
      { id: 'th-as', kind: 'dm', members: ['u1', 'u9'], at: ago(60 * 20) },
      { id: 'th-ops', kind: 'group', name: 'انبار و ارسال', members: ['u1', 'u4', 'u2', 'u3'], at: ago(60 * 72), createdBy: 'u1' },
    ],
    messages: [
      { id: 'm1', thread: 'th-ys', from: 'u4', at: ago(95), text: 'سلام بهشاد، بار اربیل از مرز رد شد. فردا عصر مهابادم.', readBy: ['u4', 'u1'] },
      { id: 'm2', thread: 'th-ys', from: 'u1', at: ago(90), text: 'عالیه. سهم تهران رو با حوالهٔ اسکنی بفرست که چیزی جا نمونه.', readBy: ['u1', 'u4'] },
      { id: 'm3', thread: 'th-ys', from: 'u4', at: ago(14), text: 'حوالهٔ HV-1405-031 رو دارم جمع می‌کنم؛ یه Kindle مال خودم اشتباهی اسکن شد، کنار گذاشتمش.', readBy: ['u4'], reactions: {} },
      { id: 'm4', thread: 'th-ys', from: 'u4', at: ago(13), text: 'عکس کارتن‌ها رو هم گذاشتم 👇', files: [{ name: 'کارتن‌ها-مهاباد.jpg', size: 412000, type: 'image/jpeg', url: './products/p8-500.webp' }], readBy: ['u4'] },
      { id: 'm5', thread: 'th-team', from: 'u9', at: ago(180), text: 'سفارش GH-10458 مرجوعی ثبت کرده؛ پیگیرش هستم.', readBy: ['u9', 'u1', 'u4'] },
      { id: 'm6', thread: 'th-team', from: 'u2', at: ago(170), text: 'تیپاکس امروز ساعت ۵ میاد دنبال بسته‌ها.', readBy: ['u2', 'u1'], reactions: { '👍': ['u1', 'u9'] } },
      { id: 'm7', thread: 'th-team', from: 'u4', at: ago(35), text: '@بهشاد قیمت گلکسی A55 رو برای سایت تأیید می‌کنی؟', readBy: ['u4', 'u9'] },
      { id: 'm8', thread: 'th-as', from: 'u9', at: ago(40), text: 'فاکتورهای هفتهٔ پیش رو در خزانه پیوست کردم. سه تا بی‌مستند مونده.', readBy: ['u9', 'u1'] },
      { id: 'm9', thread: 'th-ops', from: 'u3', at: ago(300), text: 'قفسهٔ D-02 پر شد؛ کالاهای تازه رو کجا بذارم؟', readBy: ['u3', 'u1', 'u2'] },
      { id: 'm10', thread: 'th-ops', from: 'u2', at: ago(290), text: 'فعلاً D-05، پیشنهاد نقشهٔ قفسه هم همونو می‌گه.', readBy: ['u2', 'u1', 'u3'], replyTo: 'm9' },
    ],
  }
}
