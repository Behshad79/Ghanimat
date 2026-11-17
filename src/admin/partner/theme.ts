import type { CSSProperties } from 'react'

/** رنگ‌بندی پرتال شریک: همان چیدمان پنل مدیریت، با رنگ اصلی خود شعبه به‌جای آبی غنیمت */
export const partnerTheme = (c: string): CSSProperties => {
  const tint = `color-mix(in srgb, ${c} 10%, white)`; const pressed = `color-mix(in srgb, ${c} 82%, black)`
  return { '--brand': c, '--brand-solid': c, '--brand-pressed': pressed, '--brand-solid-pressed': pressed, '--brand-tint': tint,
    '--color-brand': c, '--color-brand-solid': c, '--color-brand-pressed': pressed, '--color-brand-solid-pressed': pressed, '--color-brand-tint': tint } as CSSProperties
}
