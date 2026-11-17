// وضعیت حساب مشتری مطابق «حساب کاربری» پنل کاربری: ایمیل، قفل کد ملی پس از تأیید کارت، دستگاه‌های فعال و درخواست حذف حساب
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString()
export type Device = { id: string; name: string; os: string; city: string; at: string; current?: boolean }
export type Acct = { emailVerified: boolean; nidLocked: boolean; devices: Device[]; deleteReq?: { at: string; reason: string; status: 'pending' | 'done' | 'rejected'; note?: string } }

export function makeAcct(): Record<string, Acct> {
  return {
    c1: { emailVerified: true, nidLocked: true, devices: [{ id: 'dv1', name: 'iPhone 15', os: 'iOS 18 · Safari', city: 'تهران', at: ago(12), current: true }, { id: 'dv2', name: 'MacBook Air', os: 'macOS · Chrome', city: 'تهران', at: ago(60 * 26) }, { id: 'dv3', name: 'Samsung A54', os: 'Android 14 · Chrome', city: 'کرج', at: ago(60 * 24 * 9) }] },
    c2: { emailVerified: false, nidLocked: false, devices: [{ id: 'dv4', name: 'Xiaomi Note 13', os: 'Android 14 · Chrome', city: 'کرج', at: ago(60 * 3), current: true }] },
    c3: { emailVerified: true, nidLocked: true, devices: [{ id: 'dv5', name: 'Windows PC', os: 'Windows 11 · Edge', city: 'تبریز', at: ago(60 * 50), current: true }] },
    c5: { emailVerified: false, nidLocked: false, devices: [{ id: 'dv6', name: 'iPhone 13', os: 'iOS 17 · Safari', city: 'اصفهان', at: ago(60 * 24 * 40), current: true }], deleteReq: { at: ago(60 * 7), reason: 'پیامک و اعلان زیاد است', status: 'pending' } },
    c6: { emailVerified: true, nidLocked: true, devices: [{ id: 'dv7', name: 'Galaxy S24', os: 'Android 14 · Samsung Internet', city: 'تهران', at: ago(42), current: true }, { id: 'dv8', name: 'Galaxy S24', os: 'Android 14 · Chrome', city: 'استانبول', at: ago(60 * 5) }] },
  }
}
export const acctOf = (all: Record<string, Acct> | undefined, id: string): Acct => all?.[id] ?? { emailVerified: false, nidLocked: false, devices: [] }
