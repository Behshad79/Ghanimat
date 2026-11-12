import { useState } from 'react'
import { Flame, Plus, Trash2, Zap } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Tabs, Toggle } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Bars } from '@/shared/ui/charts'
import { DataTable } from '@/shared/ui/table'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, toman } from '@/shared/lib/fa'
import { ProductImg, useTab } from '../pages/_shared'

import { type Promo } from '@/shared/data/promos'
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const COND: [string, string][] = [['first', 'خرید اول مشتری'], ['cart', 'مبلغ سبد'], ['cat', 'دستهٔ کالا'], ['brand', 'برند'], ['seg', 'بخش مشتری (RFM)'], ['channel', 'کانال فروش'], ['pay', 'روش پرداخت'], ['city', 'شهر'], ['utm', 'منبع کمپین (UTM)']]
const ACT: [string, string][] = [['freeship', 'ارسال رایگان'], ['pct', 'تخفیف درصدی'], ['fixed', 'تخفیف مبلغی'], ['cashback', 'کش‌بک به کیف پول'], ['gift', 'کالای هدیه']]
/** موتور پروموشن شرطی، فروش ویژهٔ تایمردار، کش‌بک و سنجش کمپین‌ها با UTM و ROAS */
export function Promotions() {
  const d = useDB(); const M = d.promos; const [tab, setTab] = useTab('rules')
  const set = (fn: (x: typeof M) => void, log?: string) => mutate((x) => fn(x.promos), log ? { action: log, target: 'پروموشن' } : undefined)
  const label = (k: string, list: [string, string][]) => list.find((x) => x[0] === k)?.[1] ?? k
  const totals = M.utm.reduce((a, u) => ({ spend: a.spend + u.spend, rev: a.rev + u.revenue, nc: a.nc + u.newCustomers }), { spend: 0, rev: 0, nc: 0 })
  return (
    <Page title="موتور پروموشن و کمپین" module="marketing" sub="تخفیف‌های شرطی پیچیده، فروش ویژهٔ تایمردار، کش‌بک و اینکه کدام کمپین واقعاً سودآور بوده است."
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'rules', label: 'قانون‌های تخفیف', count: M.rules.filter((r) => r.active).length }, { id: 'flash', label: 'فروش ویژه (تایمردار)' }, { id: 'utm', label: 'کمپین‌ها، UTM و ROAS' }]} />}>
      {tab === 'rules' && <div className="space-y-3">
        <div className="flex justify-end"><Button variant="primary" icon={<Plus size={14} />} onClick={() => set((x) => { x.rules.unshift({ id: `pr${Date.now().toString(36)}`, name: 'قانون تازه', conds: [{ k: 'cart', op: '≥', v: '3000000' }], action: 'pct', value: 10, start: day(0), end: day(7), budget: 10000000, used: 0, stack: false, active: false }) }, 'ساخت قانون تخفیف')}>قانون تازه</Button></div>
        {M.rules.map((r, i) => <Card key={r.id} title={<Input aria-label="نام قانون" className="h-8 min-w-72 font-semibold" value={r.name} onChange={(e) => set((x) => { x.rules[i].name = e.target.value })} />} actions={<><Toggle on={r.active} label="فعال" onChange={(v) => set((x) => { x.rules[i].active = v }, v ? 'فعال‌سازی پروموشن' : 'توقف پروموشن')} /><button aria-label="حذف" className="mr-2 text-danger" onClick={() => set((x) => { x.rules.splice(i, 1) }, 'حذف پروموشن')}><Trash2 size={14} /></button></>}>
          <p className="mb-2 text-12 font-semibold">اگر همهٔ این شرط‌ها برقرار بود:</p>
          <div className="space-y-1.5">{r.conds.map((c, j) => <div key={j} className="flex flex-wrap items-center gap-1.5"><Badge dot={false}>{j === 0 ? 'اگر' : 'و'}</Badge><Select className="w-44" value={c.k} onChange={(v) => set((x) => { x.rules[i].conds[j].k = v })} options={COND} /><Select className="w-20" value={c.op} onChange={(v) => set((x) => { x.rules[i].conds[j].op = v })} options={['=', '≥', '≤', 'در', 'نه']} /><Input aria-label="مقدار" className="h-9 w-44" value={c.v} onChange={(e) => set((x) => { x.rules[i].conds[j].v = e.target.value })} /><button aria-label="حذف شرط" className="text-danger" onClick={() => set((x) => { x.rules[i].conds.splice(j, 1) })}><Trash2 size={13} /></button></div>)}
            <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.rules[i].conds.push({ k: 'cat', op: 'در', v: '' }) })}>افزودن شرط</Button></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5"><Field label="آنگاه"><Select value={r.action} onChange={(v) => set((x) => { x.rules[i].action = v })} options={ACT} /></Field><Field label={r.action === 'pct' || r.action === 'cashback' ? 'درصد' : 'مبلغ'}><Input type="number" value={r.value} onChange={(e) => set((x) => { x.rules[i].value = +e.target.value })} /></Field><Field label="از"><Input type="date" className="ltr" value={r.start} onChange={(e) => set((x) => { x.rules[i].start = e.target.value })} /></Field><Field label="تا"><Input type="date" className="ltr" value={r.end} onChange={(e) => set((x) => { x.rules[i].end = e.target.value })} /></Field><Field label="بودجه (تومان)"><Input type="number" value={r.budget} onChange={(e) => set((x) => { x.rules[i].budget = +e.target.value })} /></Field></div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-12"><span>مصرف بودجه: <b>{compactToman(r.used)}</b> از {compactToman(r.budget)}</span><div className="h-2 w-40 rounded-full bg-neutral-bg"><div className={cx('h-full rounded-full', r.used / r.budget > 0.8 ? 'bg-danger-solid' : 'bg-brand-solid')} style={{ width: `${Math.min(100, (r.used / r.budget) * 100)}%` }} /></div><label className="flex items-center gap-1.5">با تخفیف‌های دیگر جمع شود<Toggle on={r.stack} label="جمع‌پذیر" onChange={(v) => set((x) => { x.rules[i].stack = v })} /></label></div>
          <p className="mt-2 rounded-lg bg-neutral-bg px-2 py-1 text-12 text-t2">خلاصه: {r.conds.map((c) => `${label(c.k, COND)} ${c.op} ${c.v}`).join(' و ')} ← {label(r.action, ACT)}{r.value ? ` ${fa(r.value)}${['pct', 'cashback'].includes(r.action) ? '٪' : ' تومان'}` : ''}</p>
        </Card>)}
      </div>}
      {tab === 'flash' && <div className="space-y-3">
        <div className="flex justify-end"><Button variant="primary" icon={<Zap size={14} />} onClick={() => set((x) => { x.flash.unshift({ id: `fs${Date.now().toString(36)}`, name: 'فروش ویژهٔ تازه', products: [], pct: 15, start: new Date().toISOString(), end: new Date(Date.now() + 6 * 36e5).toISOString(), cap: 3, sold: 0, active: false }) }, 'ساخت فروش ویژه')}>فروش ویژهٔ تازه</Button></div>
        {M.flash.map((f, i) => <Card key={f.id} title={<span className="flex items-center gap-2"><Flame size={15} className="text-danger" /><Input aria-label="نام" className="h-8" value={f.name} onChange={(e) => set((x) => { x.flash[i].name = e.target.value })} /></span>} actions={<Toggle on={f.active} label="فعال" onChange={(v) => set((x) => { x.flash[i].active = v }, v ? 'شروع فروش ویژه' : 'توقف فروش ویژه')} />}>
          <div className="grid gap-2 sm:grid-cols-4"><Field label="تخفیف ٪"><Input type="number" value={f.pct} onChange={(e) => set((x) => { x.flash[i].pct = +e.target.value })} /></Field><Field label="شروع"><Input type="datetime-local" className="ltr" value={f.start.slice(0, 16)} onChange={(e) => set((x) => { x.flash[i].start = new Date(e.target.value).toISOString() })} /></Field><Field label="پایان (تایمر)"><Input type="datetime-local" className="ltr" value={f.end.slice(0, 16)} onChange={(e) => set((x) => { x.flash[i].end = new Date(e.target.value).toISOString() })} /></Field><Field label="سقف تعداد"><Input type="number" value={f.cap} onChange={(e) => set((x) => { x.flash[i].cap = +e.target.value })} /></Field></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{d.products.map((p) => { const on = f.products.includes(p.id); return <button key={p.id} onClick={() => set((x) => { const a = x.flash[i].products; x.flash[i].products = on ? a.filter((z) => z !== p.id) : [...a, p.id] })} className={cx('flex items-center gap-1 rounded-full border px-2 py-0.5 text-11', on ? 'border-danger bg-danger-bg text-danger' : 'border-line')}><ProductImg pid={p.id} size={18} rounded="rounded-full" />{p.en.split(' ').slice(0, 3).join(' ')}</button> })}</div>
          <p className="mt-2 text-12 text-t2">فروخته‌شده: {fa(f.sold)} از {fa(f.cap)} · در بخش «پیشنهاد شگفت‌انگیز» خانه و کارت کالا با تایمر غنی‌آف نمایش داده می‌شود.</p>
        </Card>)}
      </div>}
      {tab === 'utm' && <div className="space-y-4">
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI featured label="ROAS کل" value={`${fa((totals.rev / Math.max(1, totals.spend)).toFixed(1))}×`} /><KPI label="هزینهٔ تبلیغات" value={compactToman(totals.spend)} /><KPI label="CAC (هزینهٔ جذب)" value={toman(Math.round(totals.spend / Math.max(1, totals.nc)))} goodDown /><KPI label="LTV به CAC" value={`${fa(((d.customers.reduce((a, c) => a + c.ltv, 0) / d.customers.length) / Math.max(1, totals.spend / Math.max(1, totals.nc))).toFixed(1))}×`} /></div>
        <Card title="درآمد هر منبع"><Bars data={M.utm.map((u) => ({ label: `${u.source}/${u.medium}`, value: u.revenue }))} fmt={compactToman} /></Card>
        <DataTable name="کمپین‌ها" rows={M.utm} rowKey={(u) => u.id} empty={{ title: 'کمپینی ثبت نشده است.' }}
          cols={[{ key: 's', title: 'منبع / رسانه', render: (u) => <span className="ltr text-12">{u.source} / {u.medium}</span> }, { key: 'c', title: 'کمپین', render: (u) => <span className="ltr text-12">{u.campaign}</span> }, { key: 'k', title: 'کد تخفیف', render: (u) => u.code || '—' }, { key: 'sp', title: 'هزینه', align: 'left', render: (u) => compactToman(u.spend), sort: (u) => u.spend }, { key: 'o', title: 'سفارش', align: 'left', render: (u) => fa(u.orders), sort: (u) => u.orders }, { key: 'r', title: 'درآمد', align: 'left', render: (u) => compactToman(u.revenue), sort: (u) => u.revenue }, { key: 'roas', title: 'ROAS', align: 'left', render: (u) => (u.spend ? <b className={u.revenue / u.spend >= 10 ? 'text-success' : u.revenue / u.spend < 5 ? 'text-danger' : ''}>{fa((u.revenue / u.spend).toFixed(1))}×</b> : 'ارگانیک'), sort: (u) => (u.spend ? u.revenue / u.spend : 999) }, { key: 'cac', title: 'CAC', align: 'left', render: (u) => (u.spend ? compactToman(u.spend / Math.max(1, u.newCustomers)) : '—') }]}
          actions={(u) => [{ label: 'ساخت لینک UTM', onClick: () => { navigator.clipboard?.writeText(`https://ghanimat.example/?utm_source=${u.source}&utm_medium=${u.medium}&utm_campaign=${u.campaign}`); toast('لینک UTM کپی شد.') } }]} />
      </div>}
    </Page>
  )
}
