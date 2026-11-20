import { useState } from 'react'
import { FileSearch, ShieldAlert } from 'lucide-react'
import { Badge, Card, Select, Toggle } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { Drawer } from '@/shared/ui/overlay'
import { ROLES, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import type { AuditEntry } from '@/shared/data/seed'

const AREAS: [string, RegExp][] = [['مالکیت، موجودی و تسویهٔ شرکا', /شریک|تسویه|مالک|موجودی|انبار|برداشت|بسته‌بندی|فروش خارج/], ['سفارش و ارسال', /سفارش|مرسوله|پیک|رهگیری|تحویل|ارسال/], ['پول و بازگشت وجه', /بازگشت وجه|پرداخت|تراکنش|کارت|شبا|کیف پول/], ['قیمت و کالا', /قیمت|کالا|تخفیف|انتشار/], ['دسترسی و تیم', /دسترسی|نقش|عضو|غیرفعال|ورود/]]

/** لاگ ممیزی با سند: چه کسی، کی، چه کاری، روی چه چیزی، و دقیقاً چه داده‌ای از چه به چه تغییر کرد. قابل ویرایش یا حذف نیست. */
export function AuditLog() {
  const d = useDB(); const [who, setWho] = useState('all'); const [area, setArea] = useState('all'); const [sens, setSens] = useState(false); const [open, setOpen] = useState<(AuditEntry & { i: number }) | null>(null)
  const people = [...new Set(d.audit.map((a) => a.who))]
  const rows = d.audit.map((a, i) => ({ ...a, i })).filter((a) => (who === 'all' || a.who === who) && (area === 'all' || AREAS.find(([l]) => l === area)?.[1].test(`${a.action} ${a.target}`)) && (!sens || a.sensitive))
  const byPerson = people.map((p) => ({ p, n: d.audit.filter((a) => a.who === p).length, s: d.audit.filter((a) => a.who === p && a.sensitive).length, last: d.audit.find((a) => a.who === p)?.at })).sort((a, b) => b.n - a.n)
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{byPerson.slice(0, 4).map((x) => <button key={x.p} onClick={() => setWho(who === x.p ? 'all' : x.p)} className={who === x.p ? 'rounded-2xl border-2 border-brand bg-surface p-3 text-right' : 'rounded-2xl border border-line bg-surface p-3 text-right hover:border-brand'}>
      <p className="text-13 font-semibold">{x.p}</p><p className="mt-1 text-12 text-t2">{fa(x.n)} اقدام · {fa(x.s)} حساس · آخرین {x.last ? rel(x.last) : '—'}</p></button>)}</div>
    <Card pad={false} title={<span className="flex items-center gap-1.5"><FileSearch size={15} />لاگ ممیزی با سند</span>} hint="هر اقدام با نام فرد، نقش، زمان و فهرست دقیق داده‌های تغییرکرده ثبت می‌شود و قابل ویرایش یا حذف نیست. روی هر ردیف بزنید."
      actions={<div className="flex flex-wrap items-center gap-2"><Select className="w-40" value={who} onChange={setWho} options={[['all', 'همهٔ افراد'], ...people.map((p) => [p, p] as [string, string])]} /><Select className="w-56" value={area} onChange={setArea} options={[['all', 'همهٔ بخش‌ها'], ...AREAS.map(([l]) => [l, l] as [string, string])]} /><Toggle on={sens} onChange={setSens} text="فقط حساس" /></div>}>
      <DataTable name="لاگ ممیزی" rows={rows} rowKey={(a) => String(a.i)} onRow={setOpen} search={(a) => `${a.who} ${a.action} ${a.target} ${(a.changes ?? []).join(' ')}`} pageSize={15} empty={{ title: 'اقدامی با این فیلتر نیست.' }}
        cols={[{ key: 'at', title: 'زمان', render: (a) => <span title={new Date(a.at).toLocaleString('fa-IR')}>{rel(a.at)}</span>, sort: (a) => a.at, text: (a) => a.at },
          { key: 'w', title: 'چه کسی', render: (a) => <span className="flex flex-wrap items-center gap-1">{a.who}{a.role && <span className="text-11 text-t3">({ROLES[a.role]?.label ?? a.role})</span>}{a.ai && <Badge tone="brand" dot={false}>AI</Badge>}</span>, text: (a) => a.who },
          { key: 'a', title: 'اقدام', render: (a) => <span className="flex items-center gap-1">{a.sensitive && <ShieldAlert size={13} className="text-warning" />}{a.action}</span>, text: (a) => a.action },
          { key: 't', title: 'مورد', render: (a) => a.target, text: (a) => a.target },
          { key: 'c', title: 'سند تغییر', render: (a) => a.changes?.length ? <span className="text-12 text-t2">{fa(a.changes.length)} تغییر · {a.changes[0]}</span> : a.after !== '-' ? <span className="text-12 text-t2">{a.before !== '-' ? `${a.before} ← ` : ''}{a.after}</span> : '—', text: (a) => (a.changes ?? []).join(' | ') }]} />
    </Card>
    <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? open.action : ''}>
      {open && <div className="space-y-3 text-13">
        <dl className="grid grid-cols-2 gap-2">{[['چه کسی', `${open.who}${open.role ? ` · ${ROLES[open.role]?.label ?? open.role}` : ''}`], ['زمان', new Date(open.at).toLocaleString('fa-IR')], ['مورد', open.target], ['حساس', open.sensitive ? 'بله' : 'خیر']].map(([k, v]) => <div key={k} className="rounded-lg bg-neutral-bg px-2.5 py-1.5"><dt className="text-11 text-t2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
        {(open.before !== '-' || open.after !== '-') && <p className="rounded-lg border border-line p-2.5 text-12">قبل: <b>{open.before}</b> · بعد: <b>{open.after}</b></p>}
        <div><p className="mb-1.5 text-12 font-semibold">سند تغییر (خودکار)</p>{open.changes?.length ? <ol className="space-y-1 rounded-xl border border-line p-2.5 text-12">{open.changes.map((c, i) => <li key={i} className="border-b border-line pb-1 last:border-0" dir="auto">{fa(i + 1)}. {c}</li>)}</ol> : <p className="text-12 text-t2">برای این اقدام سند خودکار ثبت نشده است (اقدام‌های پیش از فعال شدن سند یا اقدام بدون تغییر داده).</p>}</div>
        <p className="text-11 text-t3">«←» یعنی مقدار قبلی به مقدار جدید تغییر کرد.</p>
      </div>}
    </Drawer>
  </div>
}
