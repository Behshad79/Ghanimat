// بخش‌های تأمین که به «تأمین و ورود بار» آمدند: لیست خرید با فرصت‌های خرید، و تأمین‌کننده‌ها با نرخ ارز روز
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button, Card, Field, Input } from '@/shared/ui/base'
import { EntityManager } from '@/shared/ui/entity'
import { toast } from '@/shared/ui/overlay'
import { currentUser, getDB, mutate, useDB } from '@/shared/lib/store'
import { refreshAll } from '@/shared/lib/fx'
import { BuyList } from '../catalog/BuyList'

const OPPS: [string, string, number][] = [['AirPods Pro 2', '۱۴ نفر منتظر «خبرم کن» · حاشیهٔ برآوردی ۱۹٪', 6], ['PlayStation 5 Slim', '۹ جست‌وجوی بی‌نتیجه در ۷ روز', 3], ['iPhone 16 Pro Max', '۱۱ درخواست از دستیار خرید', 3]]

export function BuyTab() {
  const d = useDB()
  const inList = (n: string) => d.buyList.some((b) => b.name === n && b.status === 'در لیست')
  return <div className="space-y-4">
    <Card title="فرصت‌های خرید" hint="از «خبرم کن»، جست‌وجوی بی‌نتیجه و دستیار خرید؛ با یک کلیک به لیست خرید می‌رود." pad={false}>
      <ul className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-x-reverse">{OPPS.map(([t, desc, q]) => <li key={t} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-13 font-medium">{t}</p><p className="text-11 text-t2">{desc}</p></div>
        <Button size="sm" variant={inList(t) ? 'ghost' : 'primary'} icon={<Plus size={13} />} disabled={inList(t)} onClick={() => { mutate((x) => { x.buyList.unshift({ id: `bl${Date.now().toString(36)}`, name: t, qty: q, must: true, reason: 'فرصت خرید', status: 'در لیست', addedAt: new Date().toISOString(), by: currentUser()?.name ?? 'کاربر' }) }, { action: 'افزودن فرصت خرید به لیست', target: t }); toast(`«${t}» به لیست خرید اضافه شد.`) }}>{inList(t) ? 'در لیست' : 'به لیست خرید'}</Button></li>)}</ul>
    </Card>
    <BuyList />
  </div>
}

export function SuppliersTab() {
  const d = useDB(); const [fx, setFx] = useState<Record<string, number>>(() => ({ ...getDB().storeCfg.fx.rates }))
  return <div className="space-y-4">
    <Card title="نرخ ارز امروز" actions={<span className="text-11 text-t2">نرخ پیش‌فرض محموله‌های تازه</span>}>
      <div className="grid gap-4 sm:grid-cols-3">{Object.entries(fx).map(([k, v]) => <Field key={k} label={`${k} (تومان)`}><Input className="ltr text-left font-mono" value={v.toLocaleString('en-US')} onChange={(e) => setFx({ ...fx, [k]: Number(e.target.value.replace(/\D/g, '')) })} /></Field>)}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="primary" onClick={() => { mutate((x) => { Object.assign(x.storeCfg.fx.rates, fx); x.storeCfg.fx.updatedAt = new Date().toISOString(); x.storeCfg.fx.source = 'manual' }, { action: 'ثبت دستی نرخ ارز روز', target: Object.entries(fx).map(([k, v]) => `${k}: ${v}`).join('، ') }); toast('نرخ‌های امروز ثبت شد.') }}>ثبت نرخ‌ها</Button>
        <Button icon={<RefreshCw size={14} />} onClick={async () => { const res = await refreshAll(); setFx({ ...getDB().storeCfg.fx.rates }); const bad = res.filter(([, r]) => r.source === 'saved'); toast(bad.length ? `برای ${bad.map(([c]) => c).join('، ')} نرخ از API نیامد؛ نرخ ذخیره‌شده ماند.` : 'نرخ‌ها از API به‌روز شد.', bad.length ? { tone: 'err' } : undefined) }}>استعلام از API</Button>
        <span className="text-11 text-t2">آخرین به‌روزرسانی: {new Date(d.storeCfg.fx.updatedAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} · {d.storeCfg.fx.source === 'api' ? 'از API' : 'دستی'}</span></div>
    </Card>
    <EntityManager ek="suppliers" kind="تأمین‌کننده" fields={[{ k: 'name', label: 'نام', required: true }, { k: 'city', label: 'شهر' }, { k: 'channel', label: 'مسیر تأمین', type: 'select', options: ['انبارگردانی آمازون', 'خرید مستقیم اقلیم کردستان', 'خرید داخلی'] }, { k: 'currency', label: 'ارز', type: 'select', options: ['دلار', 'درهم', 'دینار', 'تومان'] }, { k: 'terms', label: 'شرایط پرداخت' }, { k: 'quality', label: 'کیفیت (٪)', type: 'number' }, { k: 'leadDays', label: 'زمان تحویل (روز)', type: 'number' }, { k: 'phone', label: 'تماس', ltr: true }, { k: 'active', label: 'فعال', type: 'toggle' }]} />
  </div>
}
