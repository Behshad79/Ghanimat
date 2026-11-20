import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, FilePen, Pencil, Send, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Progress, Segmented, StatusBadge } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, snapshot, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { DB, Product } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'
import { fillChecks } from './NewItemsQueue'

type P = Product & { scheduledAt?: string; pdp?: { amazonUrl?: string } }
/** پیش‌نویس از کجا آمده است */
const sourceOf = (p: P) => p.exclusive ? 'ورود موجودی (کالای تازه)' : p.pdp?.amazonUrl ? 'ورود از لینک' : /\(کپی\)$/.test(p.title) ? 'کپی کالا' : !p.image && p.health <= 30 ? 'ورود از اکسل' : 'ثبت دستی'
const isDraft = (p: Product) => p.status === 'product.draft' || p.status === 'product.scheduled'
export const draftCount = (d: DB) => d.products.filter(isDraft).length + Object.keys(((d as unknown as { drafts?: Record<string, unknown> }).drafts) ?? {}).filter((k) => k === 'new' || k === 'quick').length

/** همهٔ پیش‌نویس‌ها در یک جا: کالاهای ذخیره‌شده به‌صورت پیش‌نویس، زمان‌بندی‌شده و فرم‌های نیمه‌کارهٔ افزودن کالا */
export function DraftsTab() {
  const d = useDB(); const nav = useNavigate(); const [f, setF] = useState<'all' | 'draft' | 'scheduled' | 'stock'>('all')
  const all = d.products.filter(isDraft) as P[]
  const rows = all.filter((p) => f === 'all' || (f === 'draft' ? p.status === 'product.draft' : f === 'scheduled' ? p.status === 'product.scheduled' : !!p.exclusive))
  const forms = Object.entries(((d as unknown as { drafts?: Record<string, { title?: string }> }).drafts) ?? {})
  const ready = (p: Product) => fillChecks(p).filter((c) => c.k === 'img' || c.k === 'price').every((c) => c.ok)
  const publish = (ids: string[]) => { const ok = ids.filter((id) => ready(d.products.find((p) => p.id === id)!)); if (!ok.length) { toast('برای انتشار دست‌کم عکس و قیمت فروش لازم است.', { tone: 'err' }); return } const undo = snapshot(); mutate((x) => x.products.filter((p) => ok.includes(p.id)).forEach((p) => { p.status = 'product.published' }), { action: 'انتشار پیش‌نویس', target: `${fa(ok.length)} کالا` }); toast(`${fa(ok.length)} کالا منتشر شد${ok.length < ids.length ? `؛ ${fa(ids.length - ok.length)} کالا عکس یا قیمت ندارد و پیش‌نویس ماند` : ''}.`, { undo }) }
  const trash = async (ids: string[]) => { if (!(await confirm({ title: `${fa(ids.length)} پیش‌نویس به سطل بازیافت برود؟`, body: 'تا ۳۰ روز از سطل بازیافت قابل بازگردانی است.', confirm: 'انتقال به سطل بازیافت', danger: true }))) return; const undo = snapshot(); mutate((x) => { const gone = x.products.filter((p) => ids.includes(p.id)); x.products = x.products.filter((p) => !ids.includes(p.id)); gone.forEach((p) => x.trash.unshift({ id: `tr-${p.id}-${Date.now()}`, kind: 'کالا', ek: 'products', label: p.title, data: p as never, at: new Date().toISOString() })) }, { action: 'حذف پیش‌نویس', target: `${fa(ids.length)} کالا` }); toast('به سطل بازیافت رفت.', { undo }) }
  const formLink = (k: string) => k.startsWith('edit-') ? `/admin/catalog/${k.slice(5)}/edit` : k === 'quick' ? '/admin/catalog?add=1' : k.startsWith('partner-') ? '' : '/admin/catalog/new'
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-4">
      {([['پیش‌نویس', fa(all.filter((p) => p.status === 'product.draft').length), 'در سایت دیده نمی‌شود'], ['زمان‌بندی‌شده', fa(all.filter((p) => p.status === 'product.scheduled').length), 'خودکار منتشر می‌شود'], ['آمادهٔ انتشار', fa(all.filter(ready).length), 'عکس و قیمت دارد'], ['فرم نیمه‌کاره', fa(forms.length), 'ذخیرهٔ خودکار فرم افزودن کالا']] as const).map(([t, v, h]) => <Card key={t}><p className="text-12 text-t2">{t}</p><p className="mt-1 text-22 font-bold">{v}</p><p className="text-11 text-t3">{h}</p></Card>)}
    </div>
    {forms.length > 0 && <Card title={<span className="inline-flex items-center gap-1.5"><FilePen size={15} />فرم‌های نیمه‌کاره (ذخیرهٔ خودکار)</span>}>
      <ul className="divide-y divide-line">{forms.map(([k, v]) => { const p = k.startsWith('edit-') ? d.products.find((x) => x.id === k.slice(5)) : undefined; const to = formLink(k)
        return <li key={k} className="flex flex-wrap items-center gap-2 py-2 text-13"><span className="font-medium">{v?.title?.trim() || p?.title || 'کالای بدون عنوان'}</span><Badge dot={false}>{k.startsWith('edit-') ? 'ویرایش کالای موجود' : k === 'quick' ? 'افزودن سریع' : k.startsWith('partner-') ? 'فرم شریک' : 'افزودن کالای تازه'}</Badge>
          <span className="mr-auto flex gap-1.5">{to && <Button size="sm" icon={<Pencil size={13} />} onClick={() => nav(to)}>ادامه</Button>}<Button size="sm" variant="ghost" onClick={() => { mutate((x) => { delete ((x as unknown as { drafts?: Record<string, unknown> }).drafts ?? {})[k] }, { action: 'دور ریختن فرم نیمه‌کاره', target: k }); toast('فرم نیمه‌کاره پاک شد.') }}>دور ریختن</Button></span></li> })}</ul>
    </Card>}
    <Card pad={false} title="پیش‌نویس‌ها و زمان‌بندی‌شده‌ها" actions={<Segmented size="sm" value={f} onChange={setF} options={[['all', `همه (${fa(all.length)})`], ['draft', 'پیش‌نویس'], ['scheduled', 'زمان‌بندی‌شده'], ['stock', 'از ورود موجودی']]} />}>
      <p className="border-b border-line px-4 py-2.5 text-12 text-t2">هر کالایی که با «ذخیرهٔ پیش‌نویس»، ورود از لینک یا اکسل، کپی کالا یا ورود کالای تازه در موجودی ساخته شده و هنوز منتشر نشده است. پیش‌نویس در سایت و کانال‌ها دیده نمی‌شود.</p>
      <DataTable name="پیش‌نویس‌ها" rows={rows} rowKey={(p) => p.id} onRow={(p) => nav(`/admin/catalog/${p.id}/edit`)} search={(p) => `${p.title} ${p.en} ${p.code ?? ''} ${p.brand}`}
        empty={{ title: 'پیش‌نویسی نیست.', desc: 'کالای ذخیره‌شده با «ذخیرهٔ پیش‌نویس» اینجا می‌آید.', action: <Button variant="primary" onClick={() => nav('/admin/catalog/new')}>افزودن کالا</Button> }}
        cols={[
          { key: 'p', title: 'کالا', render: (p) => <span className="flex items-center gap-2.5"><ProductImg pid={p.id} size={40} /><span><span className="block font-medium">{p.title}</span><bdi dir="ltr" className="font-mono text-11 text-t3">{p.code}</bdi></span></span> },
          { key: 's', title: 'وضعیت', render: (p) => <span className="text-12"><StatusBadge s={p.status} />{p.status === 'product.scheduled' && p.scheduledAt && <span className="mt-0.5 flex items-center gap-1 text-t2"><CalendarClock size={11} />{new Date(p.scheduledAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</span>}</span> },
          { key: 'src', title: 'منبع', render: (p) => <span className="text-12">{sourceOf(p)}{p.exclusive && <span className="block text-t3">{p.exclusive.by} · {rel(p.exclusive.at)}</span>}</span>, sort: (p) => sourceOf(p) },
          { key: 'pr', title: 'قیمت', render: (p) => (p.price || p.priceNew ? toman(p.price || p.priceNew) : <span className="text-warning">بدون قیمت</span>) },
          { key: 'f', title: 'آمادگی', render: (p) => { const c = fillChecks(p); const n = c.filter((x) => x.ok).length; return <div className="w-32"><Progress value={Math.round((n / c.length) * 100)} tone={n === c.length ? 'success' : 'warning'} /><p className="mt-1 text-11 text-t2">{n === c.length ? 'کامل' : `${fa(c.length - n)} مورد کم: ${c.filter((x) => !x.ok).slice(0, 2).map((x) => x.label).join('، ')}`}</p></div> }, sort: (p) => fillChecks(p).filter((x) => x.ok).length },
          { key: 'x', title: '', render: (p) => <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}><Button size="sm" icon={<Pencil size={13} />} onClick={() => nav(`/admin/catalog/${p.id}/edit`)}>ادامهٔ ویرایش</Button><Button size="sm" variant="primary" icon={<Send size={13} />} disabled={!ready(p)} title={ready(p) ? '' : 'عکس و قیمت فروش لازم است'} onClick={() => publish([p.id])}>انتشار</Button><Button size="sm" variant="ghost" aria-label="سطل بازیافت" icon={<Trash2 size={13} />} onClick={() => trash([p.id])} /></div> },
        ]}
        bulk={(ids, clear) => <><Button size="sm" variant="primary" onClick={() => { publish(ids); clear() }}>انتشار آماده‌ها</Button><Button size="sm" variant="danger" onClick={() => { void trash(ids).then(clear) }}>سطل بازیافت</Button></>} />
    </Card>
  </div>
}
