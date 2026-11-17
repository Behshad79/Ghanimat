// کنترل از راه دور: ربات تلگرام اختصاصی و فرمان پیامکی برای خبر گرفتن و جلو بردن سفارش‌ها بدون باز کردن پنل
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString()
export type RemoteMsg = { id: string; ch: 'تلگرام' | 'پیامک'; dir: 'out' | 'in'; to: string; text: string; at: string; orderId?: string; ok?: boolean }
export const SMS_MENU: [string, string][] = [['1', 'تأیید و شروع آماده‌سازی'], ['2', 'بسته‌بندی شد'], ['3', 'تحویل به پیک یا پست'], ['4', 'تحویل شد'], ['5', 'شمارهٔ مشتری (با رمز)'], ['9', 'لغو با دلیل'], ['0', 'راهنما']]

export function makeRemote() {
  return {
    telegram: { on: true, bot: '@GhanimatOpsBot', token: 'تنظیم‌شده', lastSeen: ago(1), chats: [{ name: 'بهشاد', chatId: '81423301', role: 'مدیر کل', on: true }, { name: 'گروه عملیات تهران', chatId: '-1002281123', role: 'گروه', on: true }, { name: 'کاک هیوا (شعبهٔ مهاباد)', chatId: '76611290', role: 'شریک', on: true }] },
    sms: { on: true, line: '3000 4412', pin: '1234', lastSeen: ago(4), allowed: [{ name: 'بهشاد', phone: '09000000001', on: true }, { name: 'سارا', phone: '09000000002', on: false }] },
    events: { newOrder: true, fastOnly: false, slaWarn: true, payFail: true, noStock: true, returns: false, dailySummary: true },
    log: [
      { id: 'rm1', ch: 'تلگرام', dir: 'out', to: 'بهشاد', text: 'سفارش تازه GH-10481 · iPhone 16 Pro ۲۵۶ (تیتانیوم طبیعی) و هدفون سونی · تحویل سریع · ۲ ساعت و ۱۰ دقیقه مهلت', at: ago(18), orderId: 'GH-10481', ok: true },
      { id: 'rm2', ch: 'تلگرام', dir: 'in', to: 'بهشاد', text: '[دکمه] تأیید و آماده‌سازی', at: ago(17), orderId: 'GH-10481', ok: true },
      { id: 'rm3', ch: 'پیامک', dir: 'out', to: '09000000001', text: 'غنیمت: سفارش GH-10480 پرداخت شد. ۱=تأیید ۲=بسته‌بندی ۳=تحویل پیک ۵=شماره مشتری ۰=راهنما', at: ago(42), orderId: 'GH-10480', ok: true },
    ] as RemoteMsg[],
  }
}
