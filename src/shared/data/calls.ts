// تلفن ابری: تماس‌های ورودی و خروجی، صف‌ها و منوی صوتی (IVR)، کارشناسان و ضبط مکالمه
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString()
export type Call = { id: string; dir: 'in' | 'out'; number: string; customerId?: string; agent: string; queue: string; status: 'پاسخ‌داده' | 'از دست رفته' | 'پیغام صوتی' | 'در صف'; waitSec: number; durSec: number; at: string; recording?: boolean; note?: string; callbackDone?: boolean; ticketId?: string; rating?: number }
export type Agent = { name: string; ext: string; state: 'آزاد' | 'در تماس' | 'استراحت' | 'آفلاین'; today: number }

export function makeCalls() {
  return {
    provider: { connected: false, name: '', did: '021-91000000', recordAll: true, announce: true },
    ivr: [
      { key: '1', label: 'پیگیری سفارش', queue: 'پشتیبانی سفارش' },
      { key: '2', label: 'مشاوره و خرید', queue: 'فروش' },
      { key: '3', label: 'مرجوعی و گارانتی', queue: 'پشتیبانی سفارش' },
      { key: '0', label: 'صحبت با اپراتور', queue: 'عمومی' },
    ],
    hours: { from: '09:00', to: '21:00', offMsg: 'ساعت کاری پشتیبانی تلفنی ۹ تا ۲۱ است. پیغام بگذارید؛ اول وقت تماس می‌گیریم.' },
    agents: [
      { name: 'سارا', ext: '101', state: 'در تماس', today: 18 }, { name: 'نیما', ext: '102', state: 'آزاد', today: 12 },
      { name: 'آرش', ext: '103', state: 'استراحت', today: 7 },
    ] as Agent[],
    calls: [
      { id: 'CL-9081', dir: 'in', number: '09123456789', customerId: 'c1', agent: 'سارا', queue: 'پشتیبانی سفارش', status: 'پاسخ‌داده', waitSec: 22, durSec: 312, at: ago(8), recording: true, note: 'پیگیری کابل شارژ AirPods؛ ارسال رایگان شد.', ticketId: 'TK-482106', rating: 5 },
      { id: 'CL-9080', dir: 'in', number: '09351112233', customerId: 'c2', agent: '—', queue: 'پشتیبانی سفارش', status: 'از دست رفته', waitSec: 140, durSec: 0, at: ago(26) },
      { id: 'CL-9079', dir: 'in', number: '09121110000', agent: 'نیما', queue: 'فروش', status: 'پاسخ‌داده', waitSec: 9, durSec: 488, at: ago(55), recording: true, note: 'مشتری تازه؛ استعلام آیفون ۱۶ پرو گرید A+.' },
      { id: 'CL-9078', dir: 'out', number: '09143334455', customerId: 'c3', agent: 'سارا', queue: 'پیگیری', status: 'پاسخ‌داده', waitSec: 0, durSec: 141, at: ago(80), recording: true, note: 'هماهنگی زمان تحویل' },
      { id: 'CL-9077', dir: 'in', number: '09194445566', customerId: 'c5', agent: '—', queue: 'مشاوره و خرید', status: 'پیغام صوتی', waitSec: 0, durSec: 34, at: ago(60 * 11), recording: true, note: 'خارج از ساعت کاری' },
      { id: 'CL-9076', dir: 'in', number: '09125556677', customerId: 'c6', agent: 'آرش', queue: 'پشتیبانی سفارش', status: 'پاسخ‌داده', waitSec: 65, durSec: 205, at: ago(60 * 14), recording: true, rating: 3 },
    ] as Call[],
  }
}
