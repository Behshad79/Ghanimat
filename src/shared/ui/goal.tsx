import { useState } from 'react'
import { Target } from 'lucide-react'
import { Button, Field, Input } from './base'
import { Modal, toast } from './overlay'
import { currentUser, mutate, useDB } from '../lib/store'
import { fa, num, rel } from '../lib/fa'

/** هدف یک شاخص، همان‌جا قابل ویرایش؛ مقدار در «قوانین کسب‌وکار» ذخیره می‌شود و تاریخچه دارد */
export function GoalEdit({ k, compact }: { k: string; compact?: boolean }) {
  const d = useDB(); const r = d.rules.find((x) => x.key === k); const [v, setV] = useState<string | null>(null)
  if (!r) return null
  const show = (n: number) => r.unit === 'تومان' ? `${num(n)} تومان` : `${fa(n)} ${r.unit}`
  return <>
    <button type="button" onClick={(e) => { e.stopPropagation(); setV(String(r.value)) }} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-11 text-t2 hover:border-brand hover:text-brand"><Target size={11} />{compact ? 'تغییر هدف' : `هدف: ${show(+r.value)} · تغییر`}</button>
    <Modal open={v !== null} onClose={() => setV(null)} title={r.name} footer={<Button variant="primary" disabled={!+(v ?? 0)} onClick={() => { const n = +(v ?? '').replace(/\D/g, ''); mutate((x) => { const y = x.rules.find((z) => z.key === k)!; y.history.unshift({ by: currentUser()?.name ?? 'مدیر کل', at: new Date().toISOString(), from: y.value, to: n }); y.value = n }, { action: `تغییر ${r.name}`, target: r.name, before: String(r.value), after: String(n) }); setV(null); toast(`${r.name} به ${show(n)} تغییر کرد.`) }}>ذخیره</Button>}>
      <div className="space-y-3"><p className="text-12 text-t2">{r.desc}</p>
        <Field label={`مقدار (${r.unit})`} help={v && +v.replace(/\D/g, '') ? show(+v.replace(/\D/g, '')) : undefined}><Input className="ltr text-left font-mono" inputMode="numeric" value={v ?? ''} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} /></Field>
        <p className="text-11 text-t2">استفاده در: {r.usedIn.join('، ')} · همهٔ هدف‌ها در «قوانین کسب‌وکار ← اهداف» هم هستند.</p>
        {r.history.length > 0 && <ul className="text-11 text-t3">{r.history.slice(0, 3).map((h, i) => <li key={i}>{h.by}: {show(+h.from)} ← {show(+h.to)} · {rel(h.at)}</li>)}</ul>}</div>
    </Modal>
  </>
}
/** کلید هدف مرتبط با یک کارت شاخص (از روی عنوان) */
export const goalKeyOf = (label: string) => /فروش امروز|فروش روزانه/.test(label) ? 'daily_sales_goal' : /فروش (این )?ماه|فروش ماهانه/.test(label) ? 'monthly_sales_goal' : /تحویل به‌موقع/.test(label) ? 'ontime_goal' : /سود|حاشیه/.test(label) ? 'margin_goal' : null
