// تنظیمات پایهٔ فروشگاه: هویت و برند، باشگاه مشتریان، قوانین پرداخت و سبد، فیدها و کلید API
export type Tier = { name: string; min: number; color: string; perks: string }
export type ApiKey = { id: string; label: string; scope: string[]; created: string; last?: string; masked: string; active: boolean }

export function makeStoreCfg() {
  return {
    identity: {
      full: 'فروشگاه اینترنتی غنیمت', short: 'غنیمت', h1: 'خرید کالای اصل وارداتی با ضمانت اصالت',
      desc: 'غنیمت کالای اصل وارداتی را با مشخصات دقیق هر واحد، عکس واقعی، ضمانت اصالت و ارسال سریع در تهران عرضه می‌کند.',
      hours: 'شنبه تا چهارشنبه ۹ تا ۱۸ · پنجشنبه ۹ تا ۱۳', phone: '021-91000000', email: 'support@ghanimat.example',
      province: 'تهران', city: 'تهران', address: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک', postal: '1994834567',
    },
    media: {
      logo: './brand/logo-mark.png', logoDark: './brand/logo-mark.png', favicon: './brand/logo-mark.png',
      watermark: { on: true, pos: 'پایین چپ', opacity: 30, size: 16, unitPhotos: true, catalog: false, blog: false },
    },
    social: { instagram: 'https://instagram.com/ghanimat', telegram: 'https://t.me/ghanimat', bale: 'https://ble.ir/ghanimat', eitaa: '', rubika: '', whatsapp: '', aparat: '', linkedin: '' } as Record<string, string>,
    loyalty: {
      on: true, perAmount: 1000000, points: 10, pointValue: 1000, expireDays: 365, earnAfter: 'پایان مهلت مرجوعی',
      excludeDiscounted: false,
      tiers: [
        { name: 'برنزی', min: 0, color: '#b0703c', perks: 'سطح پیش‌فرض همهٔ مشتریان' },
        { name: 'نقره‌ای', min: 2000, color: '#9aa0b8', perks: 'یک ارسال رایگان در ماه' },
        { name: 'طلایی', min: 5000, color: '#e0a100', perks: 'پشتیبانی اختصاصی، خبر زودتر از واحدهای تازه' },
      ] as Tier[],
      balances: { c1: 4120, c2: 610, c3: 1880, c4: 2980, c5: 220, c6: 1430, c7: 1040 } as Record<string, number>,
    },
    checkout: {
      minCart: 0, maxCart: 500000000, vpnWarn: true, reserveMin: 15, socialProof: false,
      autoDeliverDays: 7, vat: 10, cashback: 0, walletMinWithdraw: 100000, walletMaxCharge: 50000000,
    },
    feeds: { torob: true, emalls: true, snapppay: true, torobpay: true, onlyInStock: true },
    apiKeys: [
      { id: 'key1', label: 'همگام‌سازی موجودی شریک', scope: ['products:read', 'units:read'], created: new Date(Date.now() - 864e5 * 40).toISOString(), last: new Date(Date.now() - 36e5 * 2).toISOString(), masked: 'gk_live_••••••••3f9a', active: true },
    ] as ApiKey[],
  }
}
export type StoreCfg = ReturnType<typeof makeStoreCfg>

/** سطح باشگاه بر اساس امتیاز */
export const tierOf = (cfg: StoreCfg, pts: number) => [...cfg.loyalty.tiers].sort((a, b) => b.min - a.min).find((t) => pts >= t.min) ?? cfg.loyalty.tiers[0]
