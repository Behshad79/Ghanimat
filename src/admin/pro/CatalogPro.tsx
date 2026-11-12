import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Toggle } from '@/shared/ui/base'
import { Bars } from '@/shared/ui/charts'
import { toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, num } from '@/shared/lib/fa'
import type { Product } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'

type PX = Product & { metaTitle?: string; wf?: string; wfBy?: string; cross?: string[]; up?: string[]; alt?: string; webp?: boolean }
const priceOf = (d: ReturnType<typeof useDB>, p: Product) => d.units.find((u) => u.productId === p.id && u.status === 'unit.published')?.price ?? p.price ?? p.priceNew

/** ویرایش جدولی و گروهی (شبیه Excel): قیمت، قیمت قبل، موجودی و متاتگ مستقیم در جدول */
export function InlineTable() {
  const d = useDB(); const P = d.products as PX[]; const [sel, setSel] = useState<string[]>([]); const [pctV, setPctV] = useState('5'); const [tpl, setTpl] = useState('خرید {نام} اصل | غنیمت')
  const setP = (id: string, patch: Partial<PX>, log?: string) => mutate((x) => { Object.assign(x.products.find((y) => y.id === id)!, patch) }, log ? { action: log, target: P.find((y) => y.id === id)!.title } : undefined)
  const all = sel.length === P.length
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 text-13">
        <span className="font-semibold">{fa(sel.length)} انتخاب‌شده</span>
        <span className="flex items-center gap-1">تغییر قیمت<Input aria-label="درصد" className="h-8 w-16" type="number" value={pctV} onChange={(e) => setPctV(e.target.value)} />٪</span>
        <Button size="sm" disabled={!sel.length} onClick={() => { mutate((x) => sel.forEach((id) => { const p = x.products.find((y) => y.id === id)!; p.price = Math.round(((p.price ?? p.priceNew) * (1 + +pctV / 100)) / 1e4) * 1e4 }), { action: `تغییر گروهی قیمت ${pctV}٪`, target: `${sel.length} کالا` }); toast(`قیمت ${fa(sel.length)} کالا ${fa(+pctV)}٪ تغییر کرد.`) }}>اعمال</Button>
        <span className="mx-1 h-6 w-px bg-line" />
        <Input aria-label="الگوی عنوان متا" className="h-8 w-60" value={tpl} onChange={(e) => setTpl(e.target.value)} />
        <Button size="sm" disabled={!sel.length} onClick={() => { mutate((x) => sel.forEach((id) => { const p = x.products.find((y) => y.id === id)! as PX; p.metaTitle = tpl.replace('{نام}', p.title).replace('{برند}', p.brand) }), { action: 'تنظیم گروهی متاتگ', target: `${sel.length} کالا` }); toast('متاتگ‌ها تنظیم شد.') }}>اعمال متاتگ</Button>
        <Button size="sm" variant="ghost" disabled={!sel.length} onClick={() => { mutate((x) => sel.forEach((id) => { x.products.find((y) => y.id === id)!.status = 'product.published' }), { action: 'انتشار گروهی', target: `${sel.length} کالا` }) }}>انتشار</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="gh-table w-full text-13"><thead className="bg-surface-2 text-t2"><tr><th className="p-2"><input type="checkbox" aria-label="انتخاب همه" checked={all} onChange={() => setSel(all ? [] : P.map((p) => p.id))} /></th><th className="p-2 text-right font-medium">کالا</th><th className="p-2 font-medium">قیمت فروش</th><th className="p-2 font-medium">قیمت قبل</th><th className="p-2 font-medium">موجودی تهران</th><th className="p-2 text-right font-medium">عنوان متا</th><th className="p-2 font-medium">فعال</th></tr></thead>
          <tbody>{P.map((p) => <tr key={p.id} className={cx('border-t border-line', sel.includes(p.id) && 'bg-brand-tint/40')}>
            <td className="p-2 text-center"><input type="checkbox" aria-label={`انتخاب ${p.title}`} checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])} /></td>
            <td className="p-2"><span className="flex items-center gap-2"><ProductImg pid={p.id} size={32} /><span className="max-w-56 truncate">{p.title}</span></span></td>
            <td className="p-1"><Input aria-label="قیمت" className="ltr h-8 w-32 text-left font-mono" value={p.price ?? ''} placeholder={String(priceOf(d, p))} onChange={(e) => setP(p.id, { price: +e.target.value.replace(/\D/g, '') || undefined })} onBlur={() => mutate(() => {}, { action: 'ویرایش جدولی قیمت', target: p.title, after: String(p.price) })} /></td>
            <td className="p-1"><Input aria-label="قیمت قبل" className="ltr h-8 w-32 text-left font-mono" value={p.compareAt ?? ''} onChange={(e) => setP(p.id, { compareAt: +e.target.value.replace(/\D/g, '') || undefined })} /></td>
            <td className="p-1">{p.mode === 'qty' ? <Input aria-label="موجودی" type="number" className="h-8 w-20" value={p.qty?.tehran ?? 0} onChange={(e) => setP(p.id, { qty: { tehran: +e.target.value, mahabad: p.qty?.mahabad ?? 0 } }, 'ویرایش جدولی موجودی')} /> : <span className="text-11 text-t2">سریال‌دار</span>}</td>
            <td className="p-1"><Input aria-label="عنوان متا" className="h-8 min-w-60" value={p.metaTitle ?? ''} placeholder={`خرید ${p.title} | غنیمت`} onChange={(e) => setP(p.id, { metaTitle: e.target.value })} /></td>
            <td className="p-2 text-center"><span className="inline-flex"><Toggle on={p.status === 'product.published'} label="فعال" onChange={(v) => setP(p.id, { status: v ? 'product.published' : 'product.draft' }, v ? 'فعال‌سازی کالا' : 'غیرفعال‌سازی کالا')} /></span></td>
          </tr>)}</tbody></table>
      </div>
      <p className="text-11 text-t2">هر تغییر با نام شما و ساعت در لاگ ممیزی ثبت می‌شود.</p>
    </div>
  )
}

/** PIM: تنوع‌ها، کالاهای مکمل (Cross-sell)، ارتقا (Up-sell) و باندل‌ها */
export function PimPanel() {
  const d = useDB(); const P = d.products as PX[]; const [pid, setPid] = useState(P[0].id); const p = P.find((x) => x.id === pid)!
  const bundles = (d.entities.bundles ?? []) as { id: string; name: string; items: string[]; discount: number; active: boolean }[]
  const toggleRel = (k: 'cross' | 'up', q: string) => mutate((x) => { const t = x.products.find((y) => y.id === pid)! as PX; const arr = t[k] ?? []; t[k] = arr.includes(q) ? arr.filter((z) => z !== q) : [...arr, q] }, { action: k === 'cross' ? 'تغییر کالای مکمل' : 'تغییر کالای ارتقا', target: p.title })
  const groups = [...new Set(P.map((x) => x.pdp?.variantGroup).filter(Boolean))] as string[]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="ارتباط کالاها">
        <Field label="کالا"><Select value={pid} onChange={setPid} options={P.map((x) => [x.id, x.title])} /></Field>
        {(['cross', 'up'] as const).map((k) => <div key={k} className="mt-3"><p className="mb-1 text-12 font-semibold">{k === 'cross' ? 'کالاهای مکمل (با این بخرید)' : 'کالاهای ارتقا (نسخهٔ بهتر)'}</p><div className="flex flex-wrap gap-1.5">{P.filter((x) => x.id !== pid).map((x) => { const on = (p[k] ?? []).includes(x.id); return <button key={x.id} onClick={() => toggleRel(k, x.id)} className={cx('flex items-center gap-1 rounded-full border px-2 py-0.5 text-11', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}><ProductImg pid={x.id} size={18} rounded="rounded-full" />{x.en.split(' ').slice(0, 3).join(' ')}</button> })}</div></div>)}
      </Card>
      <div className="space-y-4">
        <Card title="گروه‌های تنوع (رنگ، حافظه، سایز)">{groups.length === 0 ? <p className="text-12 text-t2">در فرم کالا، گام «وضعیت و منبع»، «گروه تنوع» را پر کنید تا کالاهای هم‌خانواده اینجا جمع شوند.</p> : groups.map((g) => <div key={g} className="mb-2"><b className="ltr text-12">{g}</b><div className="mt-1 flex flex-wrap gap-1">{P.filter((x) => x.pdp?.variantGroup === g).map((x) => <Badge key={x.id} dot={false}>{x.pdp?.variantLabel || x.en}</Badge>)}</div></div>)}</Card>
        <Card title="باندل‌ها" actions={<Button size="sm" icon={<Plus size={13} />} onClick={() => mutate((x) => { x.entities.bundles = [...(x.entities.bundles ?? []), { id: `bn${Date.now().toString(36)}`, name: 'باندل تازه', items: [P[0].id, P[P.length - 1].id], discount: 5, active: true }] }, { action: 'ساخت باندل', target: 'باندل تازه' })}>باندل تازه</Button>}>
          {bundles.length === 0 ? <p className="text-12 text-t2">مثلاً «آیفون + شارژر انکر» با ۵٪ تخفیف.</p> : bundles.map((b, i) => <div key={b.id} className="mb-3 rounded-xl border border-line p-3"><div className="flex items-center gap-2"><Input aria-label="نام باندل" className="h-8" value={b.name} onChange={(e) => mutate((x) => { x.entities.bundles[i].name = e.target.value })} /><Input aria-label="تخفیف" type="number" className="h-8 w-20" value={b.discount} onChange={(e) => mutate((x) => { x.entities.bundles[i].discount = +e.target.value })} />٪<Toggle on={b.active} label="فعال" onChange={(v) => mutate((x) => { x.entities.bundles[i].active = v })} /><button aria-label="حذف" className="text-danger" onClick={() => mutate((x) => { x.entities.bundles.splice(i, 1) }, { action: 'حذف باندل', target: b.name })}><Trash2 size={14} /></button></div>
            <div className="mt-2 flex flex-wrap gap-1">{P.map((x) => { const on = b.items.includes(x.id); return <button key={x.id} onClick={() => mutate((y) => { const it = y.entities.bundles[i].items; y.entities.bundles[i].items = on ? it.filter((z: string) => z !== x.id) : [...it, x.id] })} className={cx('rounded-full border px-2 py-0.5 text-11', on ? 'border-brand bg-brand-tint text-brand' : 'border-line')}>{x.en.split(' ').slice(0, 2).join(' ')}</button> })}</div>
            <p className="mt-1 text-11 text-t2">جمع: {num(b.items.reduce((a, id) => a + priceOf(d, P.find((x) => x.id === id)!), 0) * (1 - b.discount / 100))} تومان</p></div>)}
        </Card>
      </div>
    </div>
  )
}

const WF = ['پیش‌نویس', 'نیاز به عکاسی', 'نیاز به بررسی سئو', 'آماده برای انتشار', 'منتشرشده']
/** جریان کار محتوا: ستون‌های وضعیت و بهره‌وری هر کارمند */
export function ContentWorkflow() {
  const d = useDB(); const nav = useNavigate(); const P = d.products as PX[]
  const stage = (p: PX) => p.wf ?? (p.status === 'product.published' ? 'منتشرشده' : !p.image ? 'نیاز به عکاسی' : p.health < 70 ? 'نیاز به بررسی سئو' : 'پیش‌نویس')
  const staff = d.team.map((t) => t.name)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 overflow-x-auto lg:grid-cols-5">{WF.map((w) => { const list = P.filter((p) => stage(p) === w); return <div key={w} className="min-w-52 rounded-2xl bg-neutral-bg/60 p-2"><p className="mb-2 flex justify-between px-1 text-13 font-semibold">{w}<Badge dot={false}>{fa(list.length)}</Badge></p><div className="space-y-2">{list.map((p) => <div key={p.id} className="rounded-xl border border-line bg-surface p-2 text-12"><button className="flex w-full items-center gap-2 text-right" onClick={() => nav(`/admin/catalog/${p.id}/edit`)}><ProductImg pid={p.id} size={28} /><span className="truncate">{p.en}</span></button>
        <div className="mt-2 flex gap-1"><Select className="h-7 flex-1 text-11" value={stage(p)} onChange={(v) => mutate((x) => { (x.products.find((y) => y.id === p.id)! as PX).wf = v }, { action: `انتقال به «${v}»`, target: p.title })} options={WF} /><Select className="h-7 w-24 text-11" value={p.wfBy ?? ''} placeholder="مسئول" onChange={(v) => mutate((x) => { (x.products.find((y) => y.id === p.id)! as PX).wfBy = v }, { action: 'تعیین مسئول محتوا', target: p.title, after: v })} options={staff} /></div></div>)}</div></div> })}</div>
      <Card title="بهره‌وری تیم محتوا (کالای تکمیل‌شده در هفته)"><Bars data={staff.map((s) => ({ label: s, value: P.filter((p) => p.wfBy === s && stage(p) !== 'پیش‌نویس').length + d.audit.filter((a) => a.who === s && /کالا|محتوا|متا/.test(a.action)).length }))} /></Card>
    </div>
  )
}

/** پایپ‌لاین رسانه: تبدیل به WebP، برش در سه اندازهٔ استاندارد، و Alt با هوش مصنوعی */
export function MediaLibrary() {
  const d = useDB(); const P = (d.products as PX[]).filter((p) => p.image)
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); await new Promise((r) => setTimeout(r, 700)); mutate((x) => (x.products as PX[]).forEach((p) => { if (p.image) { p.webp = true; p.alt = p.alt || `${p.title}، عکس واقعی همین کالا در انبار غنیمت` } }), { action: 'اجرای پایپ‌لاین رسانه', target: `${P.length} تصویر` }); setBusy(false); toast('تصویرها به WebP تبدیل، در ۳ اندازه برش و Alt پیشنهادی ساخته شد.') }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Button variant="primary" icon={<Wand2 size={14} />} loading={busy} onClick={run}>اجرای پایپ‌لاین روی همه</Button><p className="text-12 text-t2">اندازه‌ها: کوچک ۲۰۰، کارت ۵۰۰، بزرگ‌نمایی ۱۲۰۰ پیکسل · کیفیت WebP ۸۲ · Alt فارسی با AI</p></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{P.map((p) => <Card key={p.id}><div className="flex gap-3"><img src={p.image} alt={p.alt ?? ''} className="size-24 rounded-xl object-cover" style={{ objectPosition: p.imagePos }} /><div className="min-w-0 flex-1 space-y-1 text-12"><p className="truncate font-bold">{p.en}</p><p>{p.webp ? <Badge tone="success">WebP · ۳ اندازه</Badge> : <Badge tone="warning">پردازش‌نشده</Badge>}</p>
        <Field label="متن Alt"><Input className="h-8 text-12" value={p.alt ?? ''} placeholder="Alt ندارد" onChange={(e) => mutate((x) => { (x.products.find((y) => y.id === p.id)! as PX).alt = e.target.value })} /></Field>
        <Button size="sm" variant="ai" icon={<Sparkles size={12} />} onClick={() => mutate((x) => { (x.products.find((y) => y.id === p.id)! as PX).alt = `${p.title}، ${p.category}، عکس واقعی همین واحد` }, { action: 'ساخت Alt با AI', target: p.title })}>Alt با AI</Button></div></div></Card>)}
        <Card><button className="flex h-full w-full flex-col items-center justify-center gap-2 py-6 text-12 text-t2" onClick={() => toast('در فرم کالا گام «تصاویر» آپلود کنید؛ همین پایپ‌لاین خودکار اجرا می‌شود.')}><ImagePlus size={22} />آپلود تصویر تازه</button></Card>
      </div>
    </div>
  )
}
