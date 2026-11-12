import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Ban, Box, CircleAlert, LogIn, LogOut, MoveRight, PackageCheck, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CopyId, cx, EmptyState, Field, Input, Segmented, Select, StatusBadge, Toggle } from '@/shared/ui/base'
import { SegGauge } from '@/shared/ui/charts'
import { confirm, Drawer, Modal, toast } from '@/shared/ui/overlay'
import { currentUser, mutate, snapshot, useSession } from '@/shared/lib/store'
import { fa, pct, rel } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import { binOf, type Bin, type Section } from '@/shared/data/site'
import { FloorPlan } from './FloorPlan'
import { Cell, ProductImg, useLookup } from '../pages/_shared'

const SEC_COLORS = ['#0000ff', '#ffc24b', '#12a150', '#7c3aed', '#0ea5e9', '#f97316', '#c42f2f']
const LIVE = ['unit.qc', 'unit.photo', 'unit.ready', 'unit.published', 'unit.reserved']

/** نقشهٔ انبار: طبقه ← قفسه ← خانه. پرشدگی هر خانه از واحدهای سریال‌دار و کالاهای تعدادی محاسبه می‌شود. */
export function WarehouseMap() {
  const { d, product } = useLookup(); const s = useSession(); const nav = useNavigate()
  const [wh, setWh] = useState<string>(s.scope !== 'all' ? s.scope : 'tehran'); const floors = d.layout[wh as 'tehran'] ?? []
  const [fl, setFl] = useState(floors[0]?.id ?? ''); const floor = floors.find((f) => f.id === fl) ?? floors[0]
  const [bin, setBin] = useState<string | null>(null); const [edit, setEdit] = useState<Section | null | 'new'>(null); const [view, setView] = useState<'plan' | 'bins'>('plan'); const [flEdit, setFlEdit] = useState<{ id: string; name: string } | null>(null)
  const [moveU, setMoveU] = useState<string | null>(null); const [to, setTo] = useState(''); const [logF, setLogF] = useState('all')
  const units = d.units.filter((u) => u.warehouse === wh && LIVE.includes(u.status))
  const inBin = (b: Bin) => ({ units: units.filter((u) => binOf(u.shelf) === b.id), qty: Object.entries(b.qty ?? {}) })
  const used = (b: Bin) => { const c = inBin(b); return c.units.length + c.qty.reduce((a, [, n]) => a + n, 0) }
  const secUse = (sec: Section) => { const cap = sec.bins.filter((b) => !b.blocked).reduce((a, b) => a + b.cap, 0); const u = sec.bins.reduce((a, b) => a + used(b), 0); return { cap, u, p: cap ? (u / cap) * 100 : 0 } }
  const all = floors.flatMap((f) => f.sections)
  const tot = all.reduce((a, sec) => { const x = secUse(sec); return { cap: a.cap + x.cap, u: a.u + x.u } }, { cap: 0, u: 0 })
  const allBins = all.flatMap((sec) => sec.bins.map((b) => ({ ...b, sec: sec.name })))
  const cur = allBins.find((b) => b.id === bin); const curC = cur ? inBin(cur) : null
  const upd = (fn: (secs: Section[]) => void, log?: { action: string; target: string }) => mutate((x) => { const F = x.layout[wh as 'tehran'].find((f) => f.id === floor.id)!; fn(F.sections) }, log)
  const updBin = (id: string, fn: (b: Bin) => void, log?: { action: string; target: string }) => mutate((x) => { x.layout[wh as 'tehran'].forEach((f) => f.sections.forEach((sec) => sec.bins.forEach((b) => b.id === id && fn(b)))) }, log)
  const doMove = () => {
    const u = d.units.find((x) => x.id === moveU); if (!u || !to) return
    const target = allBins.find((b) => b.id === to); if (target && (target.blocked || used(target) >= target.cap)) return toast(`خانهٔ ${to} ${target.blocked ? 'مسدود است' : 'پر است'}.`, { tone: 'err' })
    const from = binOf(u.shelf); const undo = snapshot()
    mutate((x) => { x.units.find((y) => y.id === u.id)!.shelf = to; x.moves.unshift({ id: `mv${Date.now().toString(36)}`, at: new Date().toISOString(), who: currentUser()?.name ?? 'شما', kind: 'جابه‌جایی', unit: u.id, product: u.productId, from, to, read: false }) }, { action: 'جابه‌جایی واحد در انبار', target: u.code ?? u.id, before: from, after: to })
    toast(`واحد ${u.code ?? u.id} از ${from} به ${to} رفت.`, { undo }); setMoveU(null); setTo('')
  }
  const tone = (p: number, blocked?: boolean) => blocked ? 'blocked' : p >= 100 ? 'full' : p >= 70 ? 'high' : p > 0 ? 'mid' : 'empty'
  const moves = d.moves.filter((m) => logF === 'all' || (logF === 'unread' ? !m.read : m.kind === logF))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <Card title="نقشهٔ قفسه‌ها" actions={<div className="flex flex-wrap items-center gap-2"><Select className="w-36" value={wh} onChange={(v) => { setWh(v); setFl(d.layout[v as 'tehran'][0]?.id ?? '') }} options={Object.keys(d.layout).map((k) => [k, WAREHOUSE[k]] as [string, string])} /><Button size="sm" icon={<Plus size={13} />} onClick={() => setEdit('new')}>قفسهٔ تازه</Button></div>}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented size="sm" value={floor?.id ?? ''} onChange={setFl} options={floors.map((f) => [f.id, f.name] as [string, string])} />
            <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setFlEdit({ id: '', name: '' })}>طبقه یا سالن</Button>
            {floor && <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setFlEdit({ id: floor.id, name: floor.name })}>{floor.name}</Button>}
            <Segmented size="sm" value={view} onChange={setView} options={[['plan', 'نقشهٔ چیدمان'], ['bins', 'خانه‌ها']]} />
            <span className="mr-auto flex flex-wrap gap-3 text-11 text-t2">{[['empty', 'خالی'], ['mid', 'نیمه‌پر'], ['high', 'نزدیک به پر'], ['full', 'پر'], ['blocked', 'مسدود']].map(([k, l]) => <span key={k} className="flex items-center gap-1"><span className={cx('bin-swatch size-3 rounded-sm', `bin-${k}`)} />{l}</span>)}</span>
          </div>
          {view === 'plan' && floor && floor.sections.length > 0 ? <FloorPlan wh={wh} floor={floor} usage={(sec) => sec.bins.reduce((a, b) => a + used(b), 0)} onOpen={(sec) => { setView('bins'); setEdit(sec) }} /> : !floor || floor.sections.length === 0 ? <EmptyState title="این طبقه قفسه ندارد." desc="قفسه بسازید و خانه‌هایش را تعریف کنید تا واحدها جای مشخص داشته باشند." action={<Button variant="primary" onClick={() => setEdit('new')}>ساخت قفسه</Button>} /> : (
            <div className="grid gap-3 md:grid-cols-2">{floor.sections.map((sec) => { const x = secUse(sec); const hot = x.p >= 85; return (
              <div key={sec.id} className={cx('rounded-2xl border p-3 transition-colors', hot ? 'border-danger/40 bg-danger-bg' : 'border-line bg-surface-2')}>
                <div className="mb-2 flex items-center gap-2"><p className="text-13 font-bold">{sec.name}</p>{hot && <CircleAlert size={14} className="text-danger" />}<span className="truncate text-11 text-t2">{sec.zone}</span>
                  <button aria-label={`ویرایش ${sec.name}`} onClick={() => setEdit(sec)} className="mr-auto grid size-7 place-items-center rounded-md text-t2 hover:bg-surface hover:text-brand"><Pencil size={13} /></button></div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${sec.cols ?? 4}, minmax(0, 1fr))` }}>{sec.bins.map((b) => { const n = used(b); const p = (n / b.cap) * 100; const t = tone(p, b.blocked); return (
                  <button key={b.id} onClick={() => setBin(b.id)} title={`${b.id}: ${fa(n)} از ${fa(b.cap)}`} className={cx('bin relative h-12 overflow-hidden rounded-lg border text-12 font-semibold transition-transform hover:-translate-y-0.5', `bin-${t}`)}>
                    <span className="ltr relative z-10 font-mono">{b.id}</span><span className="tnum relative z-10 block text-[10px] font-normal opacity-80">{b.blocked ? 'مسدود' : `${fa(n)}/${fa(b.cap)}`}</span>
                    {!b.blocked && <span className="absolute inset-x-0 bottom-0 bg-brand-solid/15" style={{ height: `${Math.min(100, p)}%` }} />}
                  </button>) })}</div>
                <p className={cx('mt-2 text-11', hot ? 'font-medium text-danger' : 'text-t2')}>فضای آزاد: <span className="tnum">{fa(Math.max(0, x.cap - x.u))} از {fa(x.cap)}</span> · پرشدگی {pct(Math.round(x.p))}</p>
              </div>) })}</div>)}
        </Card>
        <div className="space-y-3">
          <Card title="ظرفیت انبار"><SegGauge sub="پرشدگی کل" center={pct(Math.round(tot.cap ? (tot.u / tot.cap) * 100 : 0))} data={all.map((sec, i) => ({ label: sec.name.replace('قفسهٔ ', ''), value: Math.max(0.01, secUse(sec).u), color: SEC_COLORS[i % SEC_COLORS.length] }))} /></Card>
          <Card title="خلاصه">
            <ul className="space-y-2 text-13">{[['خانهٔ تعریف‌شده', fa(allBins.length)], ['خانهٔ پر', fa(allBins.filter((b) => !b.blocked && used(b) >= b.cap).length)], ['خانهٔ مسدود', fa(allBins.filter((b) => b.blocked).length)], ['واحد بی‌جا', fa(units.filter((u) => !allBins.some((b) => b.id === binOf(u.shelf))).length)]].map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-t2">{k}</span><b className="tnum">{v}</b></li>)}</ul>
          </Card>
        </div>
      </div>

      <Card title="گزارش فعالیت انبار" actions={<Segmented size="sm" value={logF} onChange={setLogF} options={[['all', 'همه'], ['unread', 'خوانده‌نشده'], ['ورود', 'ورود'], ['جابه‌جایی', 'جابه‌جایی'], ['خروج', 'خروج']]} />} pad={false}>
        {moves.length === 0 ? <div className="p-5"><EmptyState title="فعالیتی با این فیلتر نیست." /></div> : <ul className="divide-y divide-line">{moves.map((m) => (
          <li key={m.id}><button onClick={() => { mutate((x) => { x.moves.find((y) => y.id === m.id)!.read = true }); if (m.unit) nav(`/admin/catalog/unit/${m.unit}`); else setBin(m.to) }} className="flex w-full items-center gap-3 px-5 py-3 text-right hover:bg-surface-2">
            {!m.read && <span className="size-2 shrink-0 rounded-full bg-brand-solid" aria-label="خوانده‌نشده" />}
            <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', m.kind === 'ورود' ? 'bg-success-bg text-success' : m.kind === 'خروج' ? 'bg-warning-bg text-warning' : 'bg-brand-tint text-brand')}>{m.kind === 'ورود' ? <LogIn size={15} /> : m.kind === 'خروج' ? <LogOut size={15} /> : <ArrowLeftRight size={15} />}</span>
            <ProductImg pid={m.product} size={36} />
            <span className="min-w-0 flex-1 text-13"><b>{m.who}</b> {m.qty ? `${fa(m.qty)} عدد` : `واحد ${m.unit}`} از «{product(m.product)?.en}» را {m.kind === 'ورود' ? 'وارد' : m.kind === 'خروج' ? 'خارج' : 'جابه‌جا'} کرد <span className="ltr inline-flex items-center gap-1 font-mono text-12 text-t2">{m.from}<MoveRight size={12} />{m.to}</span></span>
            <span className="shrink-0 text-11 text-t3">{rel(m.at)}</span>
          </button></li>))}</ul>}
      </Card>

      <Drawer open={!!cur} onClose={() => setBin(null)} title={cur ? <span className="flex items-center gap-2">خانهٔ <span className="ltr font-mono">{cur.id}</span><span className="text-12 font-normal text-t2">{cur.sec}</span></span> : ''}
        footer={cur && <><Button icon={<Printer size={14} />} onClick={() => nav(`/admin/labels?units=${curC!.units.map((u) => u.id).join(',')}`)} disabled={!curC!.units.length}>برچسب واحدها</Button><Button variant="ghost" onClick={() => setBin(null)}>بستن</Button></>}>
        {cur && curC && <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">{[['ظرفیت', fa(cur.cap)], ['پر', fa(used(cur))], ['آزاد', fa(Math.max(0, cur.cap - used(cur)))]].map(([k, v]) => <div key={k} className="rounded-xl bg-neutral-bg p-2"><p className="text-11 text-t2">{k}</p><p className="tnum text-16 font-bold">{v}</p></div>)}</div>
          <div className="flex items-center gap-3"><Field label="ظرفیت خانه"><Input type="number" min={1} className="w-24" value={cur.cap} onChange={(e) => updBin(cur.id, (b) => { b.cap = Math.max(1, +e.target.value || 1) })} /></Field>
            <label className="mt-5 flex items-center gap-2 text-13"><Toggle on={!!cur.blocked} label="مسدود" onChange={(v) => updBin(cur.id, (b) => { b.blocked = v }, { action: v ? 'مسدود کردن خانهٔ انبار' : 'آزاد کردن خانهٔ انبار', target: cur.id })} />مسدود (تعمیر یا قرنطینه)</label></div>
          <div><p className="mb-2 text-13 font-semibold">محتوای خانه</p>
            {curC.units.length + curC.qty.length === 0 ? <EmptyState icon={<Box size={20} />} title="این خانه خالی است." desc="واحدها را از خانه‌های دیگر به اینجا جابه‌جا کنید." /> : <ul className="space-y-2">
              {curC.units.map((u) => <li key={u.id} className="flex items-center gap-2 rounded-xl border border-line p-2"><button className="min-w-0 flex-1 text-right" onClick={() => nav(`/admin/catalog/unit/${u.id}`)}><Cell pid={u.productId} size={40} a={product(u.productId)?.en} b={<span className="ltr font-mono">{u.code ?? u.id} · {u.shelf}</span>} /></button><StatusBadge s={u.status} /><Button size="sm" icon={<ArrowLeftRight size={12} />} onClick={() => { setMoveU(u.id); setTo('') }}>جابه‌جایی</Button></li>)}
              {curC.qty.map(([pid, n]) => <li key={pid} className="flex items-center gap-2 rounded-xl border border-line p-2"><div className="min-w-0 flex-1"><Cell pid={pid} size={40} a={product(pid)?.en} b={`کالای تعدادی · ${fa(n)} عدد`} /></div><Badge tone="info" dot={false}>{fa(n)} عدد</Badge></li>)}
            </ul>}</div>
        </div>}
      </Drawer>

      <Modal open={!!moveU} onClose={() => setMoveU(null)} title="جابه‌جایی واحد" footer={<><Button variant="primary" disabled={!to} onClick={doMove}>جابه‌جا کن</Button><Button variant="ghost" onClick={() => setMoveU(null)}>انصراف</Button></>}>
        {moveU && <div className="space-y-3"><p className="text-13">واحد <CopyId v={d.units.find((u) => u.id === moveU)?.code ?? moveU} /> از خانهٔ <b className="ltr font-mono">{binOf(d.units.find((u) => u.id === moveU)!.shelf)}</b> به:</p>
          <div className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">{allBins.map((b) => { const n = used(b); const full = b.blocked || n >= b.cap; return <button key={b.id} disabled={full || b.id === binOf(d.units.find((u) => u.id === moveU)!.shelf)} onClick={() => setTo(b.id)} className={cx('ltr h-11 rounded-lg border font-mono text-12 disabled:opacity-35', to === b.id ? 'border-brand bg-brand-solid text-white' : 'border-line hover:border-brand')}>{b.id}<span className="tnum block text-[10px]">{fa(n)}/{fa(b.cap)}</span></button> })}</div>
          <p className="flex items-center gap-1 text-11 text-t2"><PackageCheck size={12} />جابه‌جایی در گزارش فعالیت انبار و تاریخچهٔ واحد ثبت می‌شود.</p></div>}
      </Modal>

      <Modal open={!!flEdit} onClose={() => setFlEdit(null)} title={flEdit?.id ? 'ویرایش طبقه یا سالن' : 'طبقه یا سالن تازه'} footer={<>{flEdit?.id && <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => { const F = floors.find((f) => f.id === flEdit.id); if (F && F.sections.some((sec) => sec.bins.some((b) => used(b) > 0))) return toast('این طبقه کالا دارد. اول قفسه‌هایش را خالی کنید.', { tone: 'err' }); if (floors.length <= 1) return toast('انبار دست‌کم یک طبقه لازم دارد.', { tone: 'err' }); mutate((x) => { x.layout[wh as 'tehran'] = x.layout[wh as 'tehran'].filter((f) => f.id !== flEdit.id) }, { action: 'حذف طبقهٔ انبار', target: flEdit.name }); setFl(floors.find((f) => f.id !== flEdit.id)?.id ?? ''); setFlEdit(null) }}>حذف</Button>}<Button variant="primary" onClick={() => { if (!flEdit?.name.trim()) return toast('نام را بنویسید.', { tone: 'err' }); if (flEdit.id) mutate((x) => { x.layout[wh as 'tehran'].find((f) => f.id === flEdit.id)!.name = flEdit.name }, { action: 'تغییر نام طبقهٔ انبار', target: flEdit.name }); else { const id = `f${Date.now().toString(36)}`; mutate((x) => { x.layout[wh as 'tehran'].push({ id, name: flEdit.name, sections: [] }) }, { action: 'ساخت طبقهٔ انبار', target: flEdit.name }); setFl(id) } setFlEdit(null) }}>ذخیره</Button></>}>
        {flEdit && <Field label="نام" help="مثلا «همکف»، «زیرزمین»، «سالن کالای سنگین» یا «انبار پشتی»."><Input value={flEdit.name} onChange={(e) => setFlEdit({ ...flEdit, name: e.target.value })} /></Field>}
      </Modal>
      <SectionModal key={edit === 'new' ? 'new' : edit?.id ?? 'x'} open={!!edit} sec={edit === 'new' ? null : edit} onClose={() => setEdit(null)} used={(sec) => sec.bins.reduce((a, b) => a + used(b), 0)} binUsed={used}
        onSave={(v, old) => { upd((secs) => { if (old) { const i = secs.findIndex((x) => x.id === old.id); secs[i] = v } else secs.push(v) }, { action: old ? 'ویرایش قفسه' : 'ساخت قفسه', target: v.name }); toast(old ? 'قفسه ذخیره شد.' : 'قفسه ساخته شد.'); setEdit(null) }}
        onDelete={(sec) => { upd((secs) => { secs.splice(secs.findIndex((x) => x.id === sec.id), 1) }, { action: 'حذف قفسه', target: sec.name }); toast('قفسه حذف شد.'); setEdit(null) }} />
    </div>
  )
}

function SectionModal({ open, sec, onClose, onSave, onDelete, used, binUsed }: { open: boolean; sec: Section | null; onClose: () => void; onSave: (v: Section, old: Section | null) => void; onDelete: (s: Section) => void; used: (s: Section) => number; binUsed: (b: Bin) => number }) {
  const [v, setV] = useState({ id: sec?.id ?? '', name: sec?.name ?? '', zone: sec?.zone ?? '', count: sec?.bins.length ?? 6, cap: sec?.bins[0]?.cap ?? 6, levels: sec?.levels ?? 1, cols: sec?.cols ?? (sec?.bins.length ?? 6) })
  const err = !v.id.trim() ? 'کد قفسه لازم است.' : !/^[A-Z]{1,3}$/.test(v.id) ? 'کد قفسه ۱ تا ۳ حرف بزرگ لاتین است، مثل E.' : null
  const save = () => {
    if (err) return
    const lost = (sec?.bins ?? []).slice(v.count).filter((b) => binUsed(b) > 0)
    if (lost.length) return toast(`خانهٔ ${lost.map((b) => b.id).join('، ')} خالی نیست. اول محتوایش را جابه‌جا کنید.`, { tone: 'err' })
    const bins = Array.from({ length: v.count }, (_, i) => { const id = `${v.id}-${String(i + 1).padStart(2, '0')}`; const old = sec?.bins.find((b) => b.id === id); return old ? { ...old, cap: old.cap === (sec?.bins[0]?.cap ?? old.cap) ? v.cap : old.cap } : { id, cap: v.cap } })
    onSave({ ...(sec ?? {}), id: v.id, name: v.name || `قفسهٔ ${v.id}`, zone: v.zone, bins, levels: v.levels, cols: v.cols }, sec)
  }
  return (
    <Modal open={open} onClose={onClose} title={sec ? `ویرایش ${sec.name}` : 'قفسهٔ تازه'} footer={<><Button variant="primary" disabled={!!err} onClick={save}>{sec ? 'ذخیره' : 'ساخت قفسه'}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button>
      {sec && <Button variant="danger" className="mr-auto" icon={<Trash2 size={14} />} onClick={async () => { if (used(sec) > 0) return toast(`${sec.name} خالی نیست. اول واحدها را جابه‌جا کنید.`, { tone: 'err' }); if (await confirm({ title: `${sec.name} حذف شود؟`, body: 'همهٔ خانه‌های این قفسه حذف می‌شوند.', danger: true, confirm: 'حذف قفسه' })) onDelete(sec) }}>حذف قفسه</Button>}</>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="کد قفسه" error={v.id ? err ?? undefined : undefined} help="روی برچسب خانه‌ها چاپ می‌شود."><Input className="ltr text-left font-mono" disabled={!!sec} value={v.id} onChange={(e) => setV({ ...v, id: e.target.value.toUpperCase().slice(0, 3) })} /></Field>
        <Field label="نام"><Input value={v.name} placeholder={`قفسهٔ ${v.id || 'E'}`} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="کاربری (دسته یا ناحیه)"><Input value={v.zone} onChange={(e) => setV({ ...v, zone: e.target.value })} /></Field>
        <Field label="تعداد طبقهٔ قفسه (ارتفاع)"><Input type="number" min={1} max={8} value={v.levels} onChange={(e) => { const l = Math.min(8, Math.max(1, +e.target.value || 1)); setV({ ...v, levels: l, count: Math.min(48, l * v.cols) }) }} /></Field>
        <Field label="خانه در هر طبقه (عرض)"><Input type="number" min={1} max={12} value={v.cols} onChange={(e) => { const c = Math.min(12, Math.max(1, +e.target.value || 1)); setV({ ...v, cols: c, count: Math.min(48, v.levels * c) }) }} /></Field>
        <Field label="جمع خانه‌ها"><Input type="number" min={1} max={48} value={v.count} onChange={(e) => setV({ ...v, count: Math.min(48, Math.max(1, +e.target.value || 1)) })} /></Field>
        <Field label="ظرفیت هر خانه"><Input type="number" min={1} value={v.cap} onChange={(e) => setV({ ...v, cap: Math.max(1, +e.target.value || 1) })} /></Field>
      </div>
      <p className="mt-3 flex items-center gap-1 text-11 text-t2"><Ban size={12} />خانهٔ پر حذف نمی‌شود؛ پیش از کم کردن تعداد خانه‌ها محتوایشان را جابه‌جا کنید.</p>
    </Modal>
  )
}
