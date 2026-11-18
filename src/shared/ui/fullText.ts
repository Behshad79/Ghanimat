// متن بریده‌شده هیچ‌جا گم نمی‌شود: با رفتن نشانگر یا فوکوس روی هر عنصر «truncate» یا «line-clamp» که واقعاً بریده شده، متن کامل به‌صورت راهنما نمایش داده می‌شود
export function installFullText() {
  const show = (e: Event) => {
    let el = e.target as HTMLElement | null
    for (let i = 0; el && i < 4; i++, el = el.parentElement) {
      if (!(el instanceof HTMLElement) || el.title) continue
      const cs = getComputedStyle(el)
      const clipped = (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 2)
      if (clipped) { el.title = (el.textContent ?? '').trim(); break }
    }
  }
  document.addEventListener('mouseover', show, { passive: true }); document.addEventListener('focusin', show)
}
