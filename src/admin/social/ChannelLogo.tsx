/** نشان رنگی هر کانال فروش (برای تشخیص سریع در پنل) */
export const CH_STYLE: Record<string, { bg: string; tint: string; fg: string }> = {
  'اینستاگرام دایرکت': { bg: 'linear-gradient(45deg,#f9a825 0%,#e91e63 50%,#7b1fa2 100%)', tint: '#fdf0f6', fg: '#b0125b' },
  واتساپ: { bg: '#1fa855', tint: '#eaf8ef', fg: '#137a3c' },
  تلگرام: { bg: '#229ed9', tint: '#e8f5fc', fg: '#0f6f9e' },
  بله: { bg: '#00a69c', tint: '#e6f7f6', fg: '#00756e' },
  تلفنی: { bg: '#10123d', tint: '#eef0f8', fg: '#10123d' },
  'حضوری در شعبه': { bg: '#0000ff', tint: '#eef0ff', fg: '#0000ff' },
}
export function ChannelLogo({ ch, size = 40 }: { ch: string; size?: number }) {
  const st = CH_STYLE[ch] ?? CH_STYLE['تلفنی']; const r = size * 0.28
  const glyph = (() => {
    switch (ch) {
      case 'اینستاگرام دایرکت': return <><rect x="6" y="6" width="12" height="12" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="15.6" cy="8.4" r="0.95" fill="#fff" /></>
      case 'واتساپ': return <><path d="M12 5.2a6.8 6.8 0 0 0-5.9 10.2L5.3 18.7l3.4-.9A6.8 6.8 0 1 0 12 5.2Z" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9.6 9.3c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.4.8 1.1 1.4 1.9 1.8.2.1.3.1.4 0l.5-.6c.1-.2.3-.2.5-.1l1.4.7c.2.1.3.2.3.4 0 .4-.2 1-.7 1.3-.5.3-1.3.4-2.6-.2a7.3 7.3 0 0 1-3.2-2.9c-.6-1-.6-1.8-.3-2.5.1-.3.2-.5.3-.6Z" fill="#fff" /></>
      case 'تلگرام': return <path d="M5.8 11.6 17 7.3c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.7-1 .5l-2.8-2.1-1.4 1.3c-.1.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1l-6.6 4.1-2.8-.9c-.6-.2-.6-.6.1-.9Z" fill="#fff" />
      case 'بله': return <><path d="M7 6.5h4.6c2.2 0 3.6 1.1 3.6 2.9 0 1.1-.6 1.9-1.5 2.3 1.3.3 2.2 1.3 2.2 2.7 0 2-1.6 3.1-4 3.1H7Z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /><path d="M7 12h5.3" stroke="#fff" strokeWidth="1.8" /></>
      case 'تلفنی': return <path d="M8.6 5.5c.4 0 .7.2.9.5l1.2 2.2c.2.4.1.9-.2 1.2l-.9.8c.7 1.5 1.9 2.7 3.4 3.4l.8-.9c.3-.3.8-.4 1.2-.2l2.2 1.2c.4.2.6.6.5 1-.2 1.4-1.4 2.4-2.8 2.3A10 10 0 0 1 5.7 8.4c-.1-1.4.9-2.6 2.3-2.8Z" fill="#fff" />
      default: return <><path d="M6 10.5 7.2 6.5h9.6l1.2 4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /><path d="M6.5 10.5v7h11v-7M10 17.5v-3.5h4v3.5" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" /></>
    }
  })()
  return <span className="grid shrink-0 place-items-center shadow-sm" style={{ width: size, height: size, borderRadius: r, background: st.bg }}><svg viewBox="0 0 24 24" width={size * 0.66} height={size * 0.66} aria-hidden="true">{glyph}</svg></span>
}
