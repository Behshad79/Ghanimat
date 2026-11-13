import { useState } from 'react'
import { ChevronDown, Copy, KeyRound, Plus, Rss } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Toggle } from '@/shared/ui/base'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'

const BASE = 'https://ghanimat.example/api'
const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); toast('کپی شد.') }
const SCOPES: [string, string][] = [['products:read', 'خواندن کالاها'], ['units:read', 'خواندن واحدها و موجودی'], ['units:write', 'تغییر وضعیت واحد'], ['orders:read', 'خواندن سفارش‌ها'], ['orders:write', 'ثبت رهگیری و وضعیت ارسال']]

type Doc = { t: string; m: 'GET' | 'POST' | 'PATCH'; ep: string; scope: string; params: [string, string, boolean, string][]; body: string }
const DOCS: [string, Doc[]][] = [
  ['کالاها', [
    { t: 'فهرست کالاها', m: 'GET', ep: '/v1/products', scope: 'products:read', params: [['page', 'integer', false, 'شمارهٔ صفحه'], ['per_page', 'integer', false, 'تعداد در هر صفحه (پیش‌فرض ۵۰، حداکثر ۲۰۰)'], ['status', 'string', false, 'published یا draft'], ['in_stock', 'boolean', false, 'فقط کالاهای دارای واحد قابل فروش']], body: `{\n  "success": true,\n  "data": [{\n    "id": "p12",\n    "title": "iPhone 15 Pro 256GB",\n    "brand": "Apple",\n    "category": "گوشی موبایل",\n    "condition": "نو",\n    "min_price": 61900000,\n    "units_available": 3,\n    "url": "https://ghanimat.example/p/p12"\n  }],\n  "meta": { "page": 1, "per_page": 50, "total": 128 }\n}` },
    { t: 'جزئیات یک کالا', m: 'GET', ep: '/v1/products/{id}', scope: 'products:read', params: [['id', 'string', true, 'شناسهٔ کالا']], body: `{\n  "success": true,\n  "data": { "id": "p12", "title": "iPhone 15 Pro 256GB", "specs": { "storage": "256GB" }, "warranty": "ضمانت اصالت غنیمت", "import_route": "آمازون خاورمیانه" }\n}` },
  ]],
  ['واحدها و موجودی', [
    { t: 'واحدهای یک کالا', m: 'GET', ep: '/v1/products/{id}/units', scope: 'units:read', params: [['id', 'string', true, 'شناسهٔ کالا'], ['status', 'string', false, 'published، reserved، sold']], body: `{\n  "success": true,\n  "data": [{ "id": "U-1042", "grade": "A", "battery": 97, "price": 61900000, "status": "published", "warehouse": "تهران" }]\n}` },
    { t: 'تغییر وضعیت واحد', m: 'PATCH', ep: '/v1/units/{id}', scope: 'units:write', params: [['id', 'string', true, 'شناسهٔ واحد'], ['status', 'string', true, 'reserved یا published'], ['reason', 'string', true, 'دلیل تغییر؛ در لاگ ممیزی ثبت می‌شود']], body: `{ "success": true, "data": { "id": "U-1042", "status": "reserved" } }` },
  ]],
  ['سفارش‌ها', [
    { t: 'فهرست سفارش‌ها', m: 'GET', ep: '/v1/orders', scope: 'orders:read', params: [['from', 'date', false, 'از تاریخ (ISO)'], ['status', 'string', false, 'paid، preparing، shipped، delivered']], body: `{\n  "success": true,\n  "data": [{ "id": "GH-10481", "status": "preparing", "total": 147000000, "shipments": [{ "id": "GH-10481-1", "method": "پست پیشتاز" }] }]\n}` },
    { t: 'ثبت کد رهگیری مرسوله', m: 'POST', ep: '/v1/shipments/{id}/tracking', scope: 'orders:write', params: [['id', 'string', true, 'شناسهٔ مرسوله'], ['code', 'string', true, 'کد رهگیری ۲۴ رقمی پست'], ['url', 'string', false, 'لینک رهگیری؛ برای مشتری نمایش داده می‌شود']], body: `{ "success": true, "data": { "id": "GH-10481-1", "tracking": "۲۴ رقم", "notified": true } }` },
  ]],
]

export function FeedsApi() {
  const d = useDB(); const F = d.storeCfg.feeds; const keys = d.storeCfg.apiKeys
  const [open, setOpen] = useState<string | null>('فهرست کالاها'); const [nk, setNk] = useState<{ label: string; scope: string[] } | null>(null); const [shown, setShown] = useState<string | null>(null)
  const inStock = new Set(d.units.filter((u) => u.status === 'unit.published').map((u) => u.productId)).size
  const count = F.onlyInStock ? inStock : d.products.filter((p) => p.status === 'product.published').length
  const FEEDS: [keyof typeof F, string, string, string][] = [['torob', 'ترب', '/v3/torob/products', 'قیمت ارزان‌ترین واحد قابل فروش و لینک کالا'], ['emalls', 'ایمالز', '/v1/emalls/products', 'هم‌ساختار با استاندارد ایمالز'], ['snapppay', 'اسنپ‌پی', '/v1/snapppay/products', 'برای نمایش «قابل خرید اقساطی» در اسنپ‌پی'], ['torobpay', 'ترب‌پی', '/v1/torobpay/products', 'برای فروش اقساطی از ترب']]
  const setF = (k: keyof typeof F, v: boolean) => mutate((x) => { x.storeCfg.feeds[k] = v }, { action: v ? 'روشن‌کردن فید' : 'خاموش‌کردن فید', target: String(k) })
  return (
    <div className="space-y-4">
      <Card title={<span className="flex items-center gap-1.5"><Rss size={15} />فید مقایسهٔ قیمت و اقساطی</span>} actions={<Toggle on={F.onlyInStock} onChange={(v) => setF('onlyInStock', v)} text="فقط کالای دارای واحد قابل فروش" />}>
        <p className="-mt-1 mb-3 text-12 text-t2">این نشانی‌ها را در پنل هر سرویس ثبت کنید. هر بار که واحدی فروخته یا قیمتش عوض شود، فید همان لحظه به‌روز است. الان {fa(count)} کالا در فید است.</p>
        <div className="grid gap-3 md:grid-cols-2">{FEEDS.map(([k, n, ep, note]) => <div key={k} className={cx('rounded-2xl border p-3', F[k] ? 'border-line' : 'border-dashed border-line opacity-60')}>
          <div className="flex items-center justify-between"><b className="text-14">{n}</b><Toggle on={F[k]} onChange={(v) => setF(k, v)} label={`فید ${n}`} /></div>
          <p className="mt-1 text-11 text-t2">{note}</p>
          <button onClick={() => copy(BASE + ep)} className="ltr mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-info-bg px-3 py-2 text-left font-mono text-11 text-info"><span className="truncate">{BASE + ep}</span><Copy size={13} className="shrink-0" /></button>
        </div>)}</div>
        <p className="mt-3 text-11 text-t2">جایگاه قیمت ما در ترب و ایمالز در «قیمت‌گذاری ← جایگاه قیمت ترب و ایمالز» پایش می‌شود.</p>
      </Card>

      <Card title={<span className="flex items-center gap-1.5"><KeyRound size={15} />کلیدهای API</span>} actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setNk({ label: '', scope: ['products:read'] })}>ساخت کلید</Button>}>
        <p className="-mt-1 mb-3 text-12 text-t2">هر کلید فقط به همان بخش‌هایی دسترسی دارد که انتخاب می‌کنید. کلید فقط یک بار نمایش داده می‌شود؛ اگر گم شد، باطلش کنید و کلید تازه بسازید.</p>
        {keys.length === 0 ? <p className="text-13 text-t2">هنوز کلیدی ساخته نشده است.</p> : <ul className="divide-y divide-line">{keys.map((k) => <li key={k.id} className="flex flex-wrap items-center gap-3 py-2.5 text-13">
          <b className="min-w-40">{k.label}</b><span className="ltr font-mono text-12 text-t2">{k.masked}</span>
          <span className="flex flex-wrap gap-1">{k.scope.map((s) => <Badge key={s} dot={false}>{SCOPES.find(([x]) => x === s)?.[1] ?? s}</Badge>)}</span>
          <span className="mr-auto text-11 text-t3">ساخت {rel(k.created)}{k.last && ` · آخرین استفاده ${rel(k.last)}`}</span>
          {k.active ? <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { if (await confirm({ title: `کلید «${k.label}» باطل شود؟`, body: 'سرویسی که با این کلید وصل است فوراً قطع می‌شود.', danger: true, confirm: 'باطل کن' })) mutate((x) => { x.storeCfg.apiKeys.find((y) => y.id === k.id)!.active = false }, { action: 'ابطال کلید API', target: k.label }) }}>باطل کن</Button> : <Badge tone="danger">باطل‌شده</Badge>}
        </li>)}</ul>}
      </Card>

      <Card title="مستندات API" pad={false}>
        <p className="px-4 pt-3 text-12 text-t2">همهٔ درخواست‌ها با سرآیند <span className="ltr font-mono text-danger">X-API-KEY: YOUR_API_KEY</span> به نشانی پایهٔ <span className="ltr font-mono">{BASE}</span> فرستاده می‌شوند.</p>
        {DOCS.map(([g, list]) => <div key={g} className="p-4"><h3 className="mb-2 text-14 font-semibold">{g}</h3><div className="divide-y divide-line rounded-2xl border border-line">{list.map((x) => <div key={x.t}>
          <button onClick={() => setOpen(open === x.t ? null : x.t)} className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-13"><Badge tone={x.m === 'GET' ? 'success' : x.m === 'POST' ? 'brand' : 'warning'} dot={false}>{x.m}</Badge><b className="flex-1">{x.t}</b><span className="ltr hidden font-mono text-11 text-t2 sm:block">{x.ep}</span><ChevronDown size={15} className={cx('transition-transform', open === x.t && 'rotate-180')} /></button>
          {open === x.t && <div className="space-y-3 border-t border-line bg-surface-2 p-3">
            <table className="gh-table w-full text-12"><tbody>{[['Method', x.m], ['Endpoint', x.ep], ['Scope', x.scope]].map(([k, v]) => <tr key={k} className="border-b border-line last:border-0"><td className="w-28 p-2 font-semibold">{k}</td><td className="ltr p-2 text-left font-mono">{v}</td></tr>)}</tbody></table>
            <table className="gh-table w-full text-12"><thead><tr className="bg-surface"><th className="p-2 text-right">پارامتر</th><th className="p-2 text-right">نوع</th><th className="p-2">اجباری</th><th className="p-2 text-right">توضیح</th></tr></thead><tbody>{x.params.map(([n, t, r, desc]) => <tr key={n} className="border-t border-line"><td className="ltr p-2 text-right font-mono">{n}</td><td className="ltr p-2 text-right font-mono text-t2">{t}</td><td className="p-2 text-center">{r ? <b className="text-danger">بله</b> : <span className="text-t3">خیر</span>}</td><td className="p-2">{desc}</td></tr>)}</tbody></table>
            <div className="relative"><pre className="ltr max-h-72 overflow-auto rounded-xl bg-[#10123d] p-3 text-left font-mono text-11 leading-5 text-[#cfd3ff]">{x.body}</pre><button aria-label="کپی نمونه" onClick={() => copy(x.body)} className="absolute top-2 left-2 rounded-md bg-white/10 p-1.5 text-white"><Copy size={13} /></button></div>
          </div>}
        </div>)}</div></div>)}
      </Card>

      <Modal open={!!nk} onClose={() => setNk(null)} title="ساخت کلید API" footer={<Button variant="primary" disabled={!nk?.label.trim() || !nk?.scope.length} onClick={() => { const raw = `gk_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`; const k = nk!; mutate((x) => { x.storeCfg.apiKeys.unshift({ id: `key${Date.now().toString(36)}`, label: k.label.trim(), scope: k.scope, created: new Date().toISOString(), masked: `gk_live_••••••••${raw.slice(-4)}`, active: true }) }, { action: 'ساخت کلید API', target: k.label, after: k.scope.join('، ') }); setNk(null); setShown(raw) }}>ساخت</Button>}>
        {nk && <div className="space-y-3"><Field label="نام کلید" help="مثلاً «حسابداری» یا «همگام‌سازی شریک»"><Input value={nk.label} onChange={(e) => setNk({ ...nk, label: e.target.value })} /></Field>
          <Field label="دسترسی‌ها"><div className="flex flex-wrap gap-2">{SCOPES.map(([s, l]) => { const on = nk.scope.includes(s); return <button key={s} onClick={() => setNk({ ...nk, scope: on ? nk.scope.filter((y) => y !== s) : [...nk.scope, s] })} className={cx('rounded-full border px-3 py-1 text-12', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{l}</button> })}</div></Field>
          {nk.scope.some((s) => s.endsWith(':write')) && <p className="rounded-xl bg-warning-bg p-2 text-12 text-warning">این کلید می‌تواند داده را تغییر دهد؛ فقط به سرویس مطمئن بدهید.</p>}</div>}
      </Modal>
      <Modal open={!!shown} onClose={() => setShown(null)} title="کلید ساخته شد" footer={<Button variant="primary" onClick={() => { copy(shown!); setShown(null) }}>کپی و بستن</Button>}>
        <p className="text-13">این کلید فقط همین یک بار نمایش داده می‌شود.</p><p className="ltr mt-2 rounded-xl bg-neutral-bg p-3 text-left font-mono text-13">{shown}</p>
      </Modal>
    </div>
  )
}
