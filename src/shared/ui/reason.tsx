import { useEffect, useState } from 'react'
import { MessageSquareText, Pencil, Plus } from 'lucide-react'
import { Badge, Button, cx, isOther, Textarea, Toggle } from './base'
import { Modal, toast } from './overlay'
import { currentUser, mutate, useDB } from '../lib/store'
import { rel } from '../lib/fa'

/** دلیل‌های آماده هر نوع اقدام (طبق متن‌های فایل فیگما)؛ در «تنظیمات سایت و پنل مشتری» قابل ویرایش است */
export { REASON_PRESETS } from '../data/reasons'
import { REASON_PRESETS } from '../data/reasons'
export type { ReasonKind } from '../data/reasons'
import type { ReasonKind } from '../data/reasons'

type Ask = { kind: ReasonKind; ref: string; status: string; title: string; resolve: (r: string | null) => void }
let pending: Ask | null = null; const subs = new Set<() => void>()
/** پنجرهٔ ثبت دلیل. دلیل در «سوابق دلیل‌ها» ذخیره و (اگر خواستید) برای مشتری نمایش داده می‌شود. */
export const askReason = (o: Omit<Ask, 'resolve'>) => new Promise<string | null>((resolve) => { pending = { ...o, resolve }; subs.forEach((f) => f()) })

export function ReasonHost() {
  const d = useDB(); const [, tick] = useState(0); const [text, setText] = useState(''); const [visible, setVisible] = useState(true)
  useEffect(() => { const f = () => { tick((x) => x + 1); setText(''); setVisible(true) }; subs.add(f); return () => { subs.delete(f) } }, [])
  const p = pending
  const close = (val: string | null) => { if (!p) return; if (val) mutate((x) => { x.reasons.unshift({ id: `rs${Date.now().toString(36)}`, kind: p.kind, ref: p.ref, status: p.status, reason: val, visible, by: currentUser()?.name ?? 'شما', at: new Date().toISOString() }) }); p.resolve(val); pending = null; tick((x) => x + 1) }
  return (
    <Modal open={!!p} onClose={() => close(null)} title={p?.title ?? ''} footer={<><Button variant="primary" disabled={text.trim().length < 3} onClick={() => close(text.trim())}>ثبت دلیل و ادامه</Button><Button variant="ghost" onClick={() => close(null)}>انصراف</Button></>}>
      {p && <div className="space-y-3">
        <p className="text-12 text-t2">{d.reasonPresets?.[p.kind]?.other === false ? 'یکی از دلیل‌های آماده را انتخاب کنید (متن آزاد در تنظیمات خاموش است).' : 'دلیل را بنویسید یا از گزینه‌های آماده انتخاب کنید. بعداً هم از «سوابق دلیل‌ها» قابل ویرایش است.'}</p>
        <div className="flex flex-wrap gap-1.5">{(d.reasonPresets?.[p.kind]?.items.filter((x) => x.on).map((x) => x.text) ?? REASON_PRESETS[p.kind] ?? []).map((r) => <button key={r} type="button" onClick={() => { if (isOther(r)) { setText(''); setTimeout(() => (document.querySelector('[aria-label="متن دلیل"]') as HTMLTextAreaElement | null)?.focus()) } else setText(r) }} className={cx('rounded-full border px-2.5 py-1 text-12', text === r ? 'border-transparent bg-brand-solid text-white' : 'border-line hover:border-brand')}>{r}</button>)}</div>
        <Textarea aria-label="متن دلیل" rows={3} value={text} readOnly={d.reasonPresets?.[p.kind]?.other === false && !isOther(text)} onChange={(e) => setText(e.target.value)} placeholder="مثلاً: بر اساس تصاویر ارسالی، ایراد ناشی از آسیب فیزیکی پس از تحویل است." />
        <label className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-13">نمایش این دلیل برای مشتری (پنل کاربری و پیامک)<Toggle on={visible} onChange={setVisible} label="نمایش برای مشتری" /></label>
      </div>}
    </Modal>
  )
}

/** سوابق دلیل‌های یک مورد؛ قابل ویرایش و افزودن توضیح بعدی */
export function ReasonLog({ kind, refId, status = 'توضیح تکمیلی' }: { kind: ReasonKind; refId: string; status?: string }) {
  const d = useDB(); const rows = (d.reasons ?? []).filter((r) => r.kind === kind && r.ref === refId)
  const [edit, setEdit] = useState<string | null>(null); const [val, setVal] = useState('')
  const save = (id: string) => { mutate((x) => { const r = x.reasons.find((y) => y.id === id)!; r.reason = val; r.editedAt = new Date().toISOString() }, { action: 'ویرایش دلیل', target: refId, after: val }); setEdit(null); toast('دلیل ویرایش شد و نسخهٔ تازه برای مشتری نمایش داده می‌شود.') }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-13 font-semibold"><MessageSquareText size={14} />سوابق دلیل‌ها و توضیح برای مشتری</p>
        <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={async () => { const r = await askReason({ kind, ref: refId, status, title: 'افزودن توضیح برای مشتری' }); if (r) toast('توضیح ثبت شد.') }}>افزودن توضیح</Button></div>
      {rows.length === 0 ? <p className="rounded-xl bg-neutral-bg px-3 py-2 text-12 text-t2">هنوز دلیلی ثبت نشده است. اگر یادتان رفته، «افزودن توضیح» را بزنید.</p> : <ul className="space-y-1.5">{rows.map((r) => <li key={r.id} className="rounded-xl border border-line p-2.5">
        <div className="flex items-center gap-2 text-11 text-t2"><Badge dot={false}>{r.status}</Badge>{r.visible ? <Badge tone="info" dot={false}>برای مشتری نمایش داده می‌شود</Badge> : <Badge dot={false}>داخلی</Badge>}<span className="mr-auto">{r.by} · {rel(r.editedAt ?? r.at)}{r.editedAt && ' (ویرایش‌شده)'}</span>
          <button aria-label="ویرایش دلیل" onClick={() => { setEdit(r.id); setVal(r.reason) }} className="grid size-6 place-items-center rounded-md hover:bg-neutral-bg"><Pencil size={12} /></button>
          <span className="inline-flex"><Toggle on={r.visible} label="نمایش برای مشتری" onChange={(v) => mutate((x) => { x.reasons.find((y) => y.id === r.id)!.visible = v })} /></span></div>
        {edit === r.id ? <div className="mt-2 space-y-2"><Textarea aria-label="ویرایش دلیل" rows={2} value={val} onChange={(e) => setVal(e.target.value)} /><div className="flex gap-2"><Button size="sm" variant="primary" disabled={val.trim().length < 3} onClick={() => save(r.id)}>ذخیره</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>انصراف</Button></div></div> : <p className="mt-1 text-13">{r.reason}</p>}
      </li>)}</ul>}
    </div>
  )
}
