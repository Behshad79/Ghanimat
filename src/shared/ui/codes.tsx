import qrcode from 'qrcode-generator'
import { code128, ean13 } from '../lib/barcode'

/** بارکد خطی SVG؛ همیشه چپ‌به‌راست، با منطقهٔ سکوت در دو طرف تا اسکنر بخواند */
export function Barcode({ value, type = 'code128', height = 48, module = 2, showText = true, className }: { value: string; type?: 'code128' | 'ean13'; height?: number; module?: number; showText?: boolean; className?: string }) {
  let bars: { x: number; w: number }[] = []; let width = 0
  try {
    if (type === 'ean13') { const m = ean13(value); [...m].forEach((b, i) => b === '1' && bars.push({ x: i, w: 1 })); width = m.length }
    else { let x = 0; code128(value).forEach((w, i) => { if (i % 2 === 0) bars.push({ x, w }); x += w }); width = x }
  } catch { return <span className="text-11 text-danger">کد «{value}» برای این نوع بارکد معتبر نیست.</span> }
  const q = 10, W = (width + q * 2) * module, H = height + (showText ? 14 : 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} style={{ direction: 'ltr' }} role="img" aria-label={`بارکد ${value}`} preserveAspectRatio="none">
      <rect width={W} height={H} fill="#fff" />
      {bars.map((b, i) => <rect key={i} x={(b.x + q) * module} y={0} width={b.w * module} height={height} fill="#000" />)}
      {showText && <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={11} fontFamily="ui-monospace, Menlo, monospace" fill="#000" letterSpacing={1}>{value}</text>}
    </svg>
  )
}
export function QR({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const q = qrcode(0, 'M'); q.addData(value); q.make()
  const n = q.getModuleCount(); let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`
  return <svg viewBox={`0 0 ${n + 4} ${n + 4}`} width={size} height={size} className={className} shapeRendering="crispEdges" role="img" aria-label={`کد QR: ${value}`}><rect width={n + 4} height={n + 4} fill="#fff" /><path d={d} fill="#000" /></svg>
}
