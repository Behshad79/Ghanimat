import { Info, Plus, Trash2, Wand2 } from 'lucide-react'
import { Button, Field, Input, Select, Toggle } from '@/shared/ui/base'
import { useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { DB, Variation } from '@/shared/data/seed'
import { labelCode } from '@/shared/data/stock'
import { varLabel } from '@/shared/lib/variants'
import type { PAttr } from '@/shared/data/seed'
import { PartyChip } from './common'

export type SplitRow = { variationId?: string; owner: string; warehouse: string; qty: number; cost: number }
type F = { kind: 'simple' | 'variable'; mode: 'qty' | 'serial'; attrs: PAttr[]; variations: Variation[]; qtyTehran: number; qtyMahabad: number; code: string; owner?: string; ownSplit?: SplitRow[] }

/** مرحلهٔ موجودی در افزودن کالا: مالک پیش‌فرض و تقسیم موجودی میان چند مالک و چند انبار */
export function OwnerSplit({ f, set, cost }: { f: F; set: (p: Partial<F>) => void; cost: number }) {
  const d = useDB(); const s = d.stock; const owner = f.owner ?? 'gh'; const rows = f.ownSplit ?? []
  const vars = f.kind === 'variable' ? f.variations.filter((v) => v.enabled) : []
  const want = (vid: string | undefined, wh: string) => { if (wh !== 'tehran' && wh !== 'mahabad') return null; if (f.kind === 'variable') { const v = f.variations.find((x) => x.id === vid); return v ? v.qty[wh] : 0 } return wh === 'tehran' ? f.qtyTehran : f.qtyMahabad }
  const auto = (): SplitRow[] => (vars.length ? vars.flatMap((v) => (['tehran', 'mahabad'] as const).filter((w) => v.qty[w] > 0).map((w) => ({ variationId: v.id, owner, warehouse: w, qty: v.qty[w], cost }))) : (['tehran', 'mahabad'] as const).filter((w) => (w === 'tehran' ? f.qtyTehran : f.qtyMahabad) > 0).map((w) => ({ owner, warehouse: w, qty: w === 'tehran' ? f.qtyTehran : f.qtyMahabad, cost })))
  const up = (i: number, p: Partial<SplitRow>) => set({ ownSplit: rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const checks = (vars.length ? vars.map((v) => v.id as string | undefined) : [undefined]).flatMap((vid) => (['tehran', 'mahabad'] as const).map((w) => { const need = want(vid, w) ?? 0; const got = rows.filter((r) => (r.variationId ?? '') === (vid ?? '') && r.warehouse === w).reduce((a, r) => a + r.qty, 0); return { vid, w, need, got } })).filter((c) => rows.length && c.need !== c.got)
  const vname = (vid?: string) => { const v = f.variations.find((x) => x.id === vid); return v ? varLabel(d as Pick<DB, 'axes'>, f.attrs, v) : '' }
  if (f.mode === 'serial') return <div className="rounded-xl border border-line p-3 text-12"><Field label="مالک (تأمین‌کننده) این واحدها"><Select value={owner} onChange={(v) => set({ owner: v })} options={s.parties.filter((p) => p.active).map((p) => [p.id, `${p.name} (${p.prefix})`] as [string, string])} /></Field></div>
  return <div className="space-y-3 rounded-xl border border-line p-3">
    <div className="flex flex-wrap items-end gap-3"><Field label="مالک پیش‌فرض (تأمین‌کننده)" help="کسی که پول این کالا را داده؛ پیشوند کد برچسب از او می‌آید"><Select className="w-56" value={owner} onChange={(v) => set({ owner: v, ownSplit: rows.length ? rows : undefined })} options={s.parties.filter((p) => p.active).map((p) => [p.id, `${p.name} (${p.prefix})`] as [string, string])} /></Field>
      <p className="pb-2 text-12 text-t2">کد برچسب: <bdi dir="ltr" className="font-mono font-bold text-t1">{labelCode(s, owner, { id: 'new', code: f.code || 'GH-P-000000' }, vars[0] ?? null)}</bdi></p></div>
    <Toggle on={rows.length > 0} onChange={(v) => set({ ownSplit: v ? auto() : undefined })} text="موجودی میان چند مالک یا چند انبار تقسیم شده است" />
    {rows.length > 0 && <>
      <div className="space-y-2">{rows.map((r, i) => <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-bg p-2 sm:grid-cols-[1fr_1fr_1fr_.6fr_.9fr_auto] sm:items-end">
        {vars.length ? <Field label="تنوع"><Select value={r.variationId ?? ''} onChange={(v) => up(i, { variationId: v })} options={vars.map((v) => [v.id, vname(v.id)] as [string, string])} /></Field> : <div className="hidden sm:block" />}
        <Field label="مالک"><Select value={r.owner} onChange={(v) => up(i, { owner: v })} options={s.parties.filter((p) => p.active).map((p) => [p.id, p.name] as [string, string])} /></Field>
        <Field label="انبار"><Select value={r.warehouse} onChange={(v) => up(i, { warehouse: v })} options={s.warehouses.filter((w) => w.active).map((w) => [w.id, w.name] as [string, string])} /></Field>
        <Field label="تعداد"><Input type="number" min={0} className="ltr text-left font-mono" value={r.qty} onChange={(e) => up(i, { qty: Math.max(0, +e.target.value) })} /></Field>
        <Field label="بهای تمام‌شدهٔ واحد"><Input type="number" min={0} className="ltr text-left font-mono" value={r.cost || ''} onChange={(e) => up(i, { cost: Math.max(0, +e.target.value) })} /></Field>
        <Button variant="ghost" aria-label="حذف ردیف" icon={<Trash2 size={14} />} onClick={() => set({ ownSplit: rows.filter((_, j) => j !== i) })} />
      </div>)}</div>
      <div className="flex flex-wrap gap-2"><Button size="sm" icon={<Plus size={13} />} onClick={() => set({ ownSplit: [...rows, { variationId: vars[0]?.id, owner: s.parties.find((p) => p.id !== owner)?.id ?? owner, warehouse: 'mahabad', qty: 1, cost }] })}>افزودن ردیف</Button><Button size="sm" variant="ghost" icon={<Wand2 size={13} />} onClick={() => set({ ownSplit: auto() })}>ساخت دوباره از موجودی بالا</Button></div>
      <div className="flex flex-wrap gap-1.5">{s.parties.map((p) => { const n = rows.filter((r) => r.owner === p.id).reduce((a, r) => a + r.qty, 0); return n ? <PartyChip key={p.id} s={s} id={p.id} n={n} /> : null })}</div>
      {checks.length > 0 && <p className="flex items-start gap-1.5 rounded-lg bg-warning-bg px-3 py-2 text-12 text-warning"><Info size={14} className="mt-0.5 shrink-0" />جمع ردیف‌ها با موجودی واردشده نمی‌خواند: {checks.map((c) => `${vname(c.vid) || 'کالا'} در ${c.w === 'tehran' ? 'تهران' : 'مهاباد'} ${fa(c.got)} از ${fa(c.need)}`).join('؛ ')}. هنگام ثبت، موجودی تهران و مهاباد از روی همین ردیف‌ها تنظیم می‌شود.</p>}
      <p className="text-11 text-t2">ردیف انبارهای تازه (مثلاً شیراز) فقط در «مالکیت و تسویهٔ موجودی» شمرده می‌شود تا سایت آن شهر راه بیفتد.</p>
    </>}
  </div>
}
