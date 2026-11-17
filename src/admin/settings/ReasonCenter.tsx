import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Input, Segmented, Toggle } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { REASON_META, type ReasonKind } from '@/shared/data/reasons'

type Side = 'all' | 'پنل مدیریت' | 'سایت و پنل کاربری'

/** همهٔ دراپ‌داون‌ها و دلیل‌های آماده در یک جا: هم دلیل اقدام‌های پنل، هم گزینه‌هایی که مشتری در سایت انتخاب می‌کند */
export function ReasonCenter() {
  const d = useDB(); const [side, setSide] = useState<Side>('all'); const [q, setQ] = useState(''); const [add, setAdd] = useState<Record<string, string>>({})
  const P = d.reasonPresets
  const used = (k: string, t: string) => (d.reasons ?? []).filter((r) => r.kind === k && r.reason === t).length
  const kinds = (Object.keys(REASON_META) as ReasonKind[]).filter((k) => P[k] && (side === 'all' || REASON_META[k].side === side) && (!q || REASON_META[k].title.includes(q) || P[k].items.some((i) => i.text.includes(q))))
  const edit = (k: ReasonKind, fn: (l: (typeof P)[ReasonKind]) => void, action: string) => mutate((x) => fn(x.reasonPresets[k]), { action, target: REASON_META[k].title })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={side} onChange={setSide} options={[['all', 'همه'], ['پنل مدیریت', 'دلیل اقدام‌های پنل'], ['سایت و پنل کاربری', 'گزینه‌های سایت و پنل کاربری']]} />
        <div className="relative min-w-56 flex-1"><Search size={14} className="absolute top-1/2 right-3 -translate-y-1/2 text-t3" /><Input className="pr-8" placeholder="جست‌وجو در دلیل‌ها و گزینه‌ها…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <p className="text-12 text-t2">گزینهٔ خاموش در دراپ‌داون نمایش داده نمی‌شود ولی سوابق قبلی آن حفظ می‌شود. ترتیب همین فهرست، ترتیب نمایش است.</p>
      <div className="grid gap-4 xl:grid-cols-2">{kinds.map((k) => { const L = P[k]; const M = REASON_META[k]; return (
        <Card key={k} title={<span className="flex flex-wrap items-center gap-2">{M.title}<Badge tone={M.side === 'پنل مدیریت' ? 'neutral' : 'brand'} dot={false}>{M.side}</Badge></span>}>
          <p className="-mt-1 mb-3 text-11 text-t2">{M.where}</p>
          <ul className="space-y-1.5">{L.items.map((it, i) => <li key={i} className={cx('flex items-center gap-2 rounded-xl border border-line px-2 py-1.5', !it.on && 'opacity-50')}>
            <Toggle on={it.on} label={`نمایش ${it.text}`} onChange={(v) => edit(k, (l) => { l.items[i].on = v }, v ? 'روشن‌کردن گزینه' : 'خاموش‌کردن گزینه')} />
            <input aria-label="متن گزینه" className="min-w-0 flex-1 bg-transparent text-13 outline-none" defaultValue={it.text} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== it.text) edit(k, (l) => { l.items[i].text = v }, 'ویرایش متن گزینه') }} />
            {used(k, it.text) > 0 && <span className="shrink-0 text-11 text-t3">{fa(used(k, it.text))} بار</span>}
            <button aria-label="بالاتر" disabled={i === 0} className="text-t3 hover:text-brand disabled:opacity-30" onClick={() => edit(k, (l) => { [l.items[i - 1], l.items[i]] = [l.items[i], l.items[i - 1]] }, 'تغییر ترتیب گزینه')}><ArrowUp size={14} /></button>
            <button aria-label="پایین‌تر" disabled={i === L.items.length - 1} className="text-t3 hover:text-brand disabled:opacity-30" onClick={() => edit(k, (l) => { [l.items[i + 1], l.items[i]] = [l.items[i], l.items[i + 1]] }, 'تغییر ترتیب گزینه')}><ArrowDown size={14} /></button>
            <button aria-label="حذف گزینه" className="text-t3 hover:text-danger" onClick={async () => { if (used(k, it.text) > 0 && !(await confirm({ title: 'این گزینه حذف شود؟', body: `${fa(used(k, it.text))} بار استفاده شده است. سوابق قبلی حفظ می‌شود؛ بهتر است به‌جای حذف خاموشش کنید.`, danger: true, confirm: 'حذف' }))) return; edit(k, (l) => { l.items.splice(i, 1) }, 'حذف گزینه') }}><Trash2 size={14} /></button>
          </li>)}</ul>
          <div className="mt-2 flex gap-2"><Input className="flex-1" placeholder="گزینهٔ تازه…" value={add[k] ?? ''} onChange={(e) => setAdd({ ...add, [k]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click() }} />
            <Button icon={<Plus size={13} />} disabled={!(add[k] ?? '').trim()} onClick={() => { const v = add[k].trim(); if (L.items.some((x) => x.text === v)) return toast('این گزینه از قبل هست.', { tone: 'err' }); edit(k, (l) => { l.items.push({ text: v, on: true }) }, 'افزودن گزینه'); setAdd({ ...add, [k]: '' }) }}>افزودن</Button></div>
          <div className="mt-3 border-t border-line pt-2"><Toggle on={L.other} onChange={(v) => edit(k, (l) => { l.other = v }, v ? 'اجازهٔ متن آزاد' : 'حذف متن آزاد')} text={M.side === 'پنل مدیریت' ? 'نوشتن دلیل آزاد هم مجاز باشد' : 'گزینهٔ «سایر» با کادر توضیح نمایش داده شود'} /></div>
        </Card>) })}</div>
      {kinds.length === 0 && <Card><p className="text-13 text-t2">چیزی پیدا نشد.</p></Card>}
    </div>
  )
}
