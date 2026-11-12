import { useRef, useState } from 'react'
import { DoorOpen, Grid3x3, Move, Package, Plus, ScanSearch, Trash2 } from 'lucide-react'
import { Button, cx, Field, Input, Select } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import type { Floor, Mark, Section } from '@/shared/data/site'

const COLORS = ['#0000ff', '#ffc24b', '#12a150', '#7c3aed', '#0ea5e9', '#f97316', '#c42f2f']
const MARK: Record<Mark['kind'], [string, string]> = { door: ['ورودی و خروجی', '#10123d'], pack: ['میز بسته‌بندی', '#12a150'], qc: ['ایستگاه QC', '#7c3aed'], aisle: ['راهرو', '#9aa0b8'], office: ['دفتر', '#0ea5e9'], other: ['سایر', '#5a5e78'] }
const CELL = 32

/** طراحی نقشهٔ چیدمان یک طبقه: قفسه‌ها و ناحیه‌ها را روی شبکه بکشید، اندازه بدهید و جابه‌جا کنید */
export function FloorPlan({ wh, floor, usage, onOpen }: { wh: string; floor: Floor; usage: (s: Section) => number; onOpen: (s: Section) => void }) {
  const gw = floor.gw ?? 24, gh = floor.gh ?? 14
  const [design, setDesign] = useState(false); const [sel, setSel] = useState<string | null>(null); const [mark, setMark] = useState<Mark | null>(null)
  const drag = useRef<{ id: string; kind: 'sec' | 'mark'; mode: 'move' | 'size'; sx: number; sy: number; o: { x: number; y: number; w: number; h: number } } | null>(null)
  const [, force] = useState(0)
  const live = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({})
  const save = (fn: (F: Floor) => void, action?: string) => mutate((x) => { const F = x.layout[wh as 'tehran'].find((f) => f.id === floor.id)!; fn(F) }, action ? { action, target: floor.name } : undefined)
  const posOf = (s: Section, i: number) => live.current[s.id] ?? s.pos ?? { x: 1 + (i % 4) * 6, y: 1 + Math.floor(i / 4) * 5, w: 5, h: 3 }
  const down = (e: React.PointerEvent, id: string, kind: 'sec' | 'mark', mode: 'move' | 'size', o: { x: number; y: number; w: number; h: number }) => { if (!design) return; e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { id, kind, mode, sx: e.clientX, sy: e.clientY, o }; setSel(id) }
  const move = (e: React.PointerEvent) => { const g = drag.current; if (!g) return; const dx = Math.round(-(e.clientX - g.sx) / CELL), dy = Math.round((e.clientY - g.sy) / CELL); const n = g.mode === 'move' ? { ...g.o, x: Math.max(0, Math.min(gw - g.o.w, g.o.x + dx)), y: Math.max(0, Math.min(gh - g.o.h, g.o.y + dy)) } : { ...g.o, w: Math.max(1, Math.min(gw - g.o.x, g.o.w + dx)), h: Math.max(1, Math.min(gh - g.o.y, g.o.h + dy)) }; live.current[g.id] = n; force((k) => k + 1) }
  const up = () => { const g = drag.current; if (!g) return; const n = live.current[g.id]; drag.current = null; if (!n) return; save((F) => { if (g.kind === 'sec') { const s = F.sections.find((x) => x.id === g.id); if (s) s.pos = { ...(s.pos ?? {}), ...n } } else { const m = (F.marks ?? []).find((x) => x.id === g.id); if (m) Object.assign(m, n) } }, g.mode === 'move' ? 'جابه‌جایی در نقشهٔ انبار' : 'تغییر اندازه در نقشهٔ انبار'); delete live.current[g.id] }
  const box = (p: { x: number; y: number; w: number; h: number }) => ({ right: p.x * CELL, top: p.y * CELL, width: p.w * CELL - 4, height: p.h * CELL - 4 })
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={design ? 'primary' : 'secondary'} icon={<Move size={13} />} onClick={() => { setDesign(!design); setSel(null) }}>{design ? 'پایان طراحی' : 'طراحی چیدمان'}</Button>
        {design && <><Button size="sm" icon={<Plus size={13} />} onClick={() => setMark({ id: `mk${Date.now().toString(36)}`, label: '', kind: 'pack', x: 0, y: 0, w: 3, h: 2 })}>افزودن ناحیه (ورودی، بسته‌بندی، QC…)</Button>
          <label className="flex items-center gap-1 text-12">اندازهٔ شبکه<Input type="number" min={8} max={40} className="h-8 w-14" value={gw} onChange={(e) => save((F) => { F.gw = Math.max(8, Math.min(40, +e.target.value || 24)) })} />×<Input type="number" min={6} max={30} className="h-8 w-14" value={gh} onChange={(e) => save((F) => { F.gh = Math.max(6, Math.min(30, +e.target.value || 14)) })} /></label></>}
        <span className="mr-auto text-11 text-t2">{design ? 'قفسه یا ناحیه را بکشید تا جابه‌جا شود؛ گوشهٔ پایین را بکشید تا اندازه‌اش عوض شود.' : 'روی هر قفسه بزنید تا خانه‌هایش باز شود.'}</span>
      </div>
      <div className="overflow-auto rounded-2xl border border-line bg-surface-2 p-2" onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <div className="relative" style={{ width: gw * CELL, height: gh * CELL, backgroundImage: design ? 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)' : undefined, backgroundSize: `${CELL}px ${CELL}px` }}>
          {(floor.marks ?? []).map((m) => { const p = live.current[m.id] ?? m; return (
            <div key={m.id} onPointerDown={(e) => down(e, m.id, 'mark', 'move', { x: m.x, y: m.y, w: m.w, h: m.h })} onDoubleClick={() => design && setMark(m)} className={cx('absolute flex items-center justify-center rounded-lg border-2 border-dashed text-11 font-medium', design && 'cursor-move', sel === m.id && 'ring-2 ring-brand')} style={{ ...box(p), borderColor: MARK[m.kind][1], color: MARK[m.kind][1], background: `${MARK[m.kind][1]}14` }}>
              {m.kind === 'door' ? <DoorOpen size={14} className="ml-1" /> : m.kind === 'qc' ? <ScanSearch size={14} className="ml-1" /> : m.kind === 'pack' ? <Package size={14} className="ml-1" /> : null}{m.label || MARK[m.kind][0]}
              {design && <span onPointerDown={(e) => down(e, m.id, 'mark', 'size', { x: m.x, y: m.y, w: m.w, h: m.h })} className="absolute -bottom-1 -left-1 size-3 cursor-nwse-resize rounded-sm bg-brand-solid" />}
            </div>) })}
          {floor.sections.map((s, i) => { const p = posOf(s, i); const color = s.pos?.color ?? COLORS[i % COLORS.length]; const u = usage(s); const cap = s.bins.filter((b) => !b.blocked).reduce((a, b) => a + b.cap, 0); const pc = cap ? Math.round((u / cap) * 100) : 0; return (
            <button key={s.id} type="button" onPointerDown={(e) => down(e, s.id, 'sec', 'move', posOf(s, i))} onClick={() => !design && onOpen(s)} className={cx('absolute overflow-hidden rounded-lg border-2 bg-surface text-right shadow-sm', design ? 'cursor-move' : 'lift cursor-pointer', sel === s.id && 'ring-2 ring-brand')} style={{ ...box(p), borderColor: color }}>
              <span className="absolute inset-x-0 bottom-0" style={{ height: `${Math.min(100, pc)}%`, background: `${color}22` }} />
              <span className="relative block px-1.5 pt-1 text-11 font-bold" style={{ color }}>{s.name.replace('قفسهٔ ', '') === s.id ? `قفسهٔ ${s.id}` : `${s.id} · ${s.name}`}</span>
              <span className="relative block px-1.5 text-[10px] text-t2">{fa(s.bins.length)} خانه{s.levels ? ` · ${fa(s.levels)} طبقه` : ''} · {fa(pc)}٪ پر</span>
              {design && <span onPointerDown={(e) => down(e, s.id, 'sec', 'size', posOf(s, i))} className="absolute -bottom-0.5 -left-0.5 size-3 cursor-nwse-resize rounded-sm bg-brand-solid" />}
            </button>) })}
        </div>
      </div>
      {design && sel && floor.sections.some((s) => s.id === sel) && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-12">رنگ قفسهٔ {sel}: {COLORS.map((c) => <button key={c} type="button" aria-label={`رنگ ${c}`} onClick={() => save((F) => { const s = F.sections.find((x) => x.id === sel)!; s.pos = { ...(s.pos ?? posOf(s, 0)), color: c } }, 'تغییر رنگ قفسه')} className="size-6 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}</div>}
      <Modal open={!!mark} onClose={() => setMark(null)} title="ناحیهٔ نقشه" footer={<>{mark && (floor.marks ?? []).some((m) => m.id === mark.id) && <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => { save((F) => { F.marks = (F.marks ?? []).filter((m) => m.id !== mark.id) }, 'حذف ناحیه از نقشه'); setMark(null) }}>حذف</Button>}<Button variant="primary" onClick={() => { if (!mark) return; save((F) => { const L = (F.marks ??= []); const i = L.findIndex((m) => m.id === mark.id); if (i >= 0) L[i] = mark; else L.push(mark) }, 'افزودن ناحیه به نقشه'); setMark(null); toast('ناحیه روی نقشه قرار گرفت؛ آن را بکشید تا جایش درست شود.') }}>ذخیره</Button></>}>
        {mark && <div className="grid gap-3 sm:grid-cols-2"><Field label="نوع"><Select value={mark.kind} onChange={(v) => setMark({ ...mark, kind: v as Mark['kind'] })} options={Object.entries(MARK).map(([k, [l]]) => [k, l] as [string, string])} /></Field><Field label="عنوان (اختیاری)"><Input value={mark.label} onChange={(e) => setMark({ ...mark, label: e.target.value })} placeholder={MARK[mark.kind][0]} /></Field></div>}
      </Modal>
      <p className="mt-2 flex items-center gap-1 text-11 text-t2"><Grid3x3 size={12} />دوبار زدن روی یک ناحیه در حالت طراحی آن را ویرایش می‌کند. چیدمان هر طبقه جدا ذخیره می‌شود.</p>
    </div>
  )
}
