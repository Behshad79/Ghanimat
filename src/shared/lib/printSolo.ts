/** چاپ فقط یک بخش از صفحه، بدون رفتن به صفحهٔ دیگر: یک کپی از آن بخش زیر body ساخته و بقیهٔ صفحه هنگام چاپ پنهان می‌شود */
export function printSolo(el: HTMLElement | null) {
  if (!el) return
  document.getElementById('print-solo-root')?.remove()
  const root = document.createElement('div'); root.id = 'print-solo-root'; root.innerHTML = el.innerHTML; root.dir = 'rtl'
  document.body.appendChild(root); document.body.classList.add('print-solo-mode')
  let cleaned = false
  const done = () => { if (cleaned) return; cleaned = true; root.remove(); document.body.classList.remove('print-solo-mode'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  try { window.print() } catch { done() }
  setTimeout(done, 60000)
}
