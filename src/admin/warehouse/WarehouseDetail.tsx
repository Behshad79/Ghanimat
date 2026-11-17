import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ExternalLink, MapPin, Pencil } from 'lucide-react'
import { Badge, Button, Card, Input } from '@/shared/ui/base'
import { KPI } from '@/shared/ui/page'
import { Area, Bars } from '@/shared/ui/charts'
import { Modal, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, toman } from '@/shared/lib/fa'
import { WAREHOUSE } from '@/shared/data/statuses'
import { binOf } from '@/shared/data/site'
import { ProductImg } from '../pages/_shared'

/** نمای یک انبار: موجودی، فروش، نمودار، کالاها با جای قفسه و ویرایش سریع قیمت و تعداد */
export function WarehouseDetail({ wh, onClose }: { wh: string | null; onClose: () => void }) {
  const d = useDB(); const nav = useNavigate(); const [edit, setEdit] = useState<{ pid: string; price: string; qty: string } | null>(null)
  if (!wh) return null
  const units = d.units.filter((u) => u.warehouse === wh && !['unit.sold'].includes(u.status))
  const ships = d.orders.flatMap((o) => o.shipments.filter((s) => s.warehouse === wh && s.status !== 'ship.cancelled').map((s) => ({ s, o })))
  const sales = ships.reduce((a, x) => a + x.s.items.reduce((b, i) => b + i.price * i.qty, 0), 0)
  const days = Array.from({ length: 14 }, (_, i) => { const from = Date.now() - (13 - i) * 864e5 - 864e5; return ships.filter((x) => { const t = new Date(x.o.createdAt).getTime(); return t >= from && t < from + 864e5 }).reduce((a, x) => a + x.s.items.reduce((b, it) => b + it.price * it.qty, 0), 0) })
  const prods = d.products.map((p) => { const u = units.filter((x) => x.productId === p.id); const q = p.mode === 'qty' ? (p.qty?.[wh as 'tehran'] ?? 0) : u.filter((x) => ['unit.published', 'unit.ready', 'unit.reserved'].includes(x.status)).length; const sold = ships.reduce((a, x) => a + x.s.items.filter((i) => i.productId === p.id).reduce((b, i) => b + i.qty, 0), 0); return { p, u, q, sold, value: (u.reduce((a, x) => a + x.cost, 0)) || q * (p.cost ?? 0) } }).filter((x) => x.q > 0 || x.sold > 0).sort((a, b) => b.sold - a.sold || b.q - a.q)
  const value = prods.reduce((a, x) => a + x.value, 0)
  const partner = d.partners?.find((x) => x.warehouse === wh)
  const cats = Object.entries(prods.reduce<Record<string, number>>((m, x) => { m[x.p.category] = (m[x.p.category] ?? 0) + x.q; return m }, {}))
  return (
    <Modal wide open={!!wh} onClose={onClose} title={<span className="flex items-center gap-2"><Building2 size={16} />{WAREHOUSE[wh] ?? wh}{partner && <Badge tone="brand" dot={false}>شریک: {partner.owner}</Badge>}</span>} footer={<><Button onClick={() => { onClose(); nav('/admin/warehouse?tab=map') }}>نقشهٔ قفسه‌ها</Button>{partner && <Button variant="ghost" icon={<ExternalLink size={13} />} onClick={() => { onClose(); nav('/admin/sellers') }}>قرارداد و تسویهٔ شعبه</Button>}</>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI featured label="فروش از این انبار" value={compactToman(sales)} spark={days.slice(-7).map((x) => x / 1e6)} />
          <KPI label="مرسوله" value={fa(ships.length)} note={`${fa(ships.filter((x) => !['ship.delivered'].includes(x.s.status)).length)} در جریان`} />
          <KPI label="موجودی قابل فروش" value={`${fa(prods.reduce((a, x) => a + x.q, 0))} عدد`} note={`${fa(prods.length)} کالا`} />
          <KPI label="ارزش موجودی" value={compactToman(value)} note="به قیمت تمام‌شده" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="فروش ۱۴ روز اخیر"><Area data={days.map((x) => x / 1e6)} fmt={(n) => `${fa(Math.round(n))} م`} /></Card>
          <Card title="موجودی به تفکیک دسته"><Bars data={cats.map(([label, value]) => ({ label, value }))} fmt={(n) => `${fa(n)} عدد`} /></Card>
        </div>
        <Card title="کالاهای این انبار" pad={false}>
          <div className="overflow-x-auto"><table className="gh-table w-full text-12"><thead><tr className="bg-surface-2">{['کالا', 'موجودی', 'فروخته', 'قیمت', 'جای قفسه', ''].map((h) => <th key={h} className="p-2 text-right font-medium">{h}</th>)}</tr></thead>
            <tbody>{prods.map((x) => { const price = x.u.find((u) => u.status === 'unit.published')?.price ?? x.p.price ?? x.p.priceNew; return <tr key={x.p.id} className="border-t border-line">
              <td className="p-2"><button className="flex items-center gap-2 text-right hover:text-brand" onClick={() => { onClose(); nav(`/admin/catalog/${x.p.id}`) }}><ProductImg pid={x.p.id} size={32} /><span className="max-w-56 truncate">{x.p.title}</span></button></td>
              <td className="tnum p-2">{fa(x.q)}</td><td className="tnum p-2">{fa(x.sold)}</td><td className="tnum p-2">{toman(price)}</td>
              <td className="p-2"><span className="flex flex-wrap gap-1">{[...new Set(x.u.map((u) => binOf(u.shelf)))].slice(0, 3).map((b) => <span key={b} className="ltr inline-flex items-center gap-0.5 rounded-md bg-neutral-bg px-1.5 font-mono text-11"><MapPin size={10} />{b}</span>)}</span></td>
              <td className="p-2"><Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setEdit({ pid: x.p.id, price: String(price), qty: String(x.q) })}>ویرایش</Button></td></tr> })}</tbody></table></div>
        </Card>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="ویرایش سریع کالا در این انبار" footer={<Button variant="primary" onClick={() => { const e = edit!; const p = d.products.find((y) => y.id === e.pid)!; const n = +e.price.replace(/\D/g, ''); mutate((x) => { const t = x.products.find((y) => y.id === e.pid)!; if (t.mode === 'qty') { t.price = n; t.qty = { ...(t.qty ?? { tehran: 0, mahabad: 0 }), [wh]: +e.qty || 0 } } x.units.filter((u) => u.productId === e.pid && u.warehouse === wh && u.status === 'unit.published').forEach((u) => (u.price = n)) }, { action: `ویرایش سریع کالا در ${WAREHOUSE[wh]}`, target: p.title, after: `${toman(n)}${p.mode === 'qty' ? ` · ${e.qty} عدد` : ''}` }); setEdit(null); toast('ذخیره شد و در سایت اعمال شد.') }}>ذخیره</Button>}>
        {edit && <div className="grid gap-3 sm:grid-cols-2"><label className="text-12">قیمت فروش (تومان)<Input className="ltr mt-1 text-left font-mono" inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value.replace(/\D/g, '') })} /></label>{d.products.find((p) => p.id === edit.pid)?.mode === 'qty' && <label className="text-12">تعداد در این انبار<Input className="ltr mt-1 text-left font-mono" inputMode="numeric" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value.replace(/\D/g, '') })} /></label>}<p className="text-11 text-t2 sm:col-span-2">برای ویرایش کامل (عکس، مشخصات، توضیحات) روی نام کالا بزنید.</p></div>}
      </Modal>
    </Modal>
  )
}
