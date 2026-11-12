/** پایپ‌لاین رسانه: عکس را به بیشینهٔ اندازهٔ داده‌شده کوچک و به WebP فشرده می‌کند (اگر مرورگر پشتیبانی نکند JPEG) */
export function fileToImage(file: File, max = 900, quality = 0.82): Promise<string> {
  return new Promise((res, rej) => {
    if (!file.type.startsWith('image/')) return rej(new Error('این فایل تصویر نیست.'))
    const r = new FileReader()
    r.onerror = () => rej(new Error('خواندن فایل ناموفق بود.'))
    r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); const webp = c.toDataURL('image/webp', quality); res(webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', quality)) }; img.onerror = () => rej(new Error('تصویر باز نشد.')); img.src = String(r.result) }
    r.readAsDataURL(file)
  })
}
