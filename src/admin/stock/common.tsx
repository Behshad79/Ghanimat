import type { DB, Product } from '@/shared/data/seed'
import { labelCode, type Lot, type StockDB } from '@/shared/data/stock'
import { varLabel } from '@/shared/lib/variants'

export const partyOf = (s: StockDB, id: string) => s.parties.find((x) => x.id === id)
export const partyName = (s: StockDB, id: string) => partyOf(s, id)?.name ?? id
export const whName = (s: StockDB, id: string) => s.warehouses.find((w) => w.id === id)?.name ?? id
export const chName = (s: StockDB, id: string) => s.channels.find((c) => c.id === id)?.name ?? id

/** لوگوی هر طرف: لوگوی ثبت‌شده، یا برای خودِ غنیمت نشان برند */
export const partyLogo = (p?: { logo?: string; kind?: string } | null) => p?.logo ?? (p?.kind === 'self' ? './brand/logo-mark.png' : undefined)
/** برچسب رنگی مالک با پیشوند کدش */
export function PartyChip({ s, id, n }: { s: StockDB; id: string; n?: number }) {
  const p = partyOf(s, id); const c = p?.color ?? '#666'
  return <span className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-11 font-semibold" style={{ borderColor: `${c}55`, background: `${c}12`, color: c }}>{partyLogo(p) && <img src={partyLogo(p)} alt="" className="size-3.5 rounded-sm object-contain" />}<bdi dir="ltr" className="font-mono">{p?.prefix ?? id}</bdi>{p?.name ?? id}{n !== undefined && <b className="font-mono">×{n.toLocaleString('fa-IR')}</b>}</span>
}

/** نام کالا و تنوع */
export function pv(d: DB, pid: string, vid?: string) {
  const p = d.products.find((x) => x.id === pid && (!vid || x.variations?.some((v) => v.id === vid))) ?? d.products.find((x) => x.id === pid)
  const v = vid ? p?.variations?.find((x) => x.id === vid) : undefined
  if (!p && pid.startsWith('pending:')) { const t = 'کالای محموله (صفحه هنگام ثبت فروش ساخته می‌شود)'; return { p, v, name: t, vname: '', full: t } }
  return { p, v, name: p?.title ?? pid, vname: v && p ? varLabel(d, p.attrs ?? [], v) : '', full: `${p?.title ?? pid}${v && p ? ` · ${varLabel(d, p.attrs ?? [], v)}` : ''}` }
}
export const codeFor = (d: DB, owner: string, pid: string, vid?: string) => { const { p, v } = pv(d, pid, vid); return p ? labelCode(d.stock, owner, p, v ?? null) : pid }

export { syncQty, takeLots, suggestOwners, reserved } from '@/shared/data/ledger'

export const ownersAt = (s: StockDB, pid: string, vid: string | undefined, wh: string) => {
  const m = new Map<string, number>(); s.lots.filter((l) => l.productId === pid && (l.variationId ?? '') === (vid ?? '') && l.warehouse === wh).forEach((l) => m.set(l.owner, (m.get(l.owner) ?? 0) + l.qty)); return m
}
export const lotKey = (l: Pick<Lot, 'productId' | 'variationId'>) => `${l.productId}|${l.variationId ?? ''}`
export const productsWithLots = (d: DB): Product[] => { const ids = new Set(d.stock.lots.map((l) => l.productId)); const seen = new Set<string>(); return d.products.filter((p) => ids.has(p.id) && !seen.has(p.id) && !!seen.add(p.id)) }
