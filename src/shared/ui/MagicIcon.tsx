import { MAGICOON } from '../icons/magicoon'
/** آیکون Magicoon یا تصویر جایگزین. `name` با پیشوند «img:» یعنی تصویر آپلودشده. */
export function MagicIcon({ name, size = 20, className, color = 'currentColor' }: { name?: string; size?: number; className?: string; color?: string }) {
  if (!name) return null
  if (name.startsWith('img:') || name.startsWith('data:') || name.startsWith('./')) return <img src={name.replace(/^img:/, '')} alt="" width={size} height={size} className={className} style={{ objectFit: 'contain', width: size, height: size }} />
  const d = MAGICOON[name]
  if (!d) return null
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true"><path d={d} fill={color} fillRule="evenodd" /></svg>
}
