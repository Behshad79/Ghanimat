// کارت‌های بانکی غنیمت، واریزهای خوانده‌شده از پیامک/صورتحساب بانک و رسیدهای کارت به کارت مشتریان
const ago = (m: number) => new Date(Date.now() - m * 6e4).toISOString()
export const makeBank = () => ({
  cards: [
    { id: 'bk1', bank: 'ملت', number: '6104-3377-****-4321', holder: 'شرکت غنیمت تجارت نوین', smsSender: '+98300012', method: 'اپ خوانندهٔ پیامک روی گوشی مالی', active: true },
    { id: 'bk2', bank: 'سامان', number: '6219-8610-****-9087', holder: 'شرکت غنیمت تجارت نوین', smsSender: '+9820001', method: 'بارگذاری صورتحساب (Excel)', active: true },
  ],
  credits: [
    { id: 'CR-1', cardId: 'bk1', amount: 15000000, at: ago(35), ref: '784512', from: '5022-29**-****-4410', raw: 'بانک ملت واریز: 150,000,000 ریال کارت مبدا 4410 ساعت 14:20', matched: '' },
    { id: 'CR-2', cardId: 'bk1', amount: 3000000, at: ago(90), ref: '784401', from: '6037-99**-****-1234', raw: 'واریز:30,000,000 ریال کارت 1234', matched: 'GH-10466' },
  ],
  receipts: [
    { id: 'RC-301', orderId: 'GH-10470', customer: 'کاوه مرادی', amount: 15000000, last4: '4410', ref: '784512', time: '14:20', channel: 'اینستاگرام دایرکت', status: 'در انتظار تطبیق', note: '', at: ago(30) },
    { id: 'RC-298', orderId: 'GH-10469', customer: 'الهام کریمی', amount: 8200000, last4: '7788', ref: '991100', time: '11:05', channel: 'واتساپ', status: 'در انتظار تطبیق', note: '', at: ago(60 * 3) },
    { id: 'RC-290', orderId: 'GH-10466', customer: 'سروش رنجبران', amount: 3000000, last4: '1234', ref: '784401', time: '13:00', channel: 'تلگرام', status: 'تطبیق شد', note: 'CR-2', at: ago(60 * 2) },
  ],
})
export type Bank = ReturnType<typeof makeBank>
/** خواندن پیامک واریز بانک: مبلغ (ریال یا تومان)، ساعت، ۴ رقم آخر کارت مبدأ، شمارهٔ پیگیری */
export function parseBankSms(raw: string) {
  const t = raw.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٬،]/g, ',')
  const m = t.match(/(?:واریز|انتقال|مبلغ|\+)\s*[:：]?\s*([\d,]{4,})\s*(ریال|تومان)?/)
  if (!m) return null
  const n = +m[1].replace(/,/g, ''); const amount = m[2] === 'تومان' ? n : Math.round(n / 10)
  const time = t.match(/(\d{1,2}:\d{2})/)?.[1] ?? ''
  const last4 = t.match(/(?:کارت|مبدا|مبدأ)[^\d]{0,12}(?:[\d*-]{0,15})?(\d{4})(?!\d)/)?.[1] ?? ''
  const ref = t.match(/(?:پیگیری|مرجع|سند)\s*[:：]?\s*(\d{4,})/)?.[1] ?? ''
  return { amount, time, last4, ref }
}
