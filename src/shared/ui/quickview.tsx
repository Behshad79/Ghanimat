import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Avatar, Badge, Button, Row, StatusBadge } from './base'
import { Drawer } from './overlay'
import { useDB } from '../lib/store'
import { compactToman, fa, mask, rel, toman } from '../lib/fa'
import type { DB } from '../data/seed'

type Hit = { kind: 'order' | 'customer' | 'product' | 'unit' | 'return' | 'ticket' | 'warranty' | 'staff'; id: string }
/** هر رشته (شماره سفارش، کد واحد، نام مشتری، نام کالا، نام همکار…) را به یک مورد قابل نمایش تبدیل می‌کند */
export function resolve(d: DB, raw: string): Hit | null {
  const v = String(raw ?? '').trim(); if (!v || v.length < 2) return null
  const id = v.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
  if (d.orders.some((o) => o.id === id)) return { kind: 'order', id }
  const sh = d.orders.find((o) => o.shipments.some((s) => s.id === id)); if (sh) return { kind: 'order', id: sh.id }
  if (d.returns.some((r) => r.id === id)) return { kind: 'return', id }
  if (d.tickets.some((t) => t.id === id)) return { kind: 'ticket', id }
  const w = d.warranties.find((x) => x.id === id || x.code === id); if (w) return { kind: 'warranty', id: w.id }
  const u = d.units.find((x) => x.id === id || x.code === id || x.serial === id); if (u) return { kind: 'unit', id: u.id }
  const p = d.products.find((x) => x.id === id || x.code === id || x.title === v || x.en === v); if (p) return { kind: 'product', id: p.id }
  const c = d.customers.find((x) => x.id === id || x.name === v || x.mobile === id); if (c) return { kind: 'customer', id: c.id }
  const t = d.team.find((x) => x.name === v || x.id === id); if (t) return { kind: 'staff', id: t.id }
  return null
}
/** باز کردن نمای سریع از هر جای پنل؛ اگر مورد شناخته نشود false برمی‌گرداند */
export const openQuick = (ref: string) => { const ev = new CustomEvent('quickview', { detail: { ref, handled: false } }); window.dispatchEvent(ev); return (ev.detail as { handled: boolean }).handled }

/** متن قابل کلیک: اگر قابل شناسایی باشد دکمه می‌شود و جزئیات را باز می‌کند */
export function QuickText({ v, children }: { v: string; children?: ReactNode }) {
  const d = useDB(); const hit = resolve(d, v)
  if (!hit) return <>{children ?? v}</>
  return <button type="button" onClick={(e: MouseEvent) => { e.stopPropagation(); openQuick(v) }} className="rounded-sm text-right underline decoration-dotted decoration-1 underline-offset-4 hover:text-brand">{children ?? v}</button>
}

const KIND: Record<Hit['kind'], string> = { order: 'سفارش', customer: 'مشتری', product: 'کالا', unit: 'واحد', return: 'مرجوعی', ticket: 'تیکت', warranty: 'گارانتی', staff: 'همکار' }

export function QuickHost() {
  const d = useDB(); const nav = useNavigate(); const [hit, setHit] = useState<Hit | null>(null)
  useEffect(() => { const f = (e: Event) => { const det = (e as CustomEvent).detail as { ref: string; handled: boolean }; const h = resolve(d, det.ref); if (h) { det.handled = true; setHit(h) } }; window.addEventListener('quickview', f); return () => window.removeEventListener('quickview', f) }, [d])
  const go = (to: string) => { setHit(null); nav(to) }
  const reasons = (kind: string, ref: string) => (d.reasons ?? []).filter((r) => r.kind === kind && r.ref === ref)
  const body = (() => {
    if (!hit) return null
    if (hit.kind === 'order') { const o = d.orders.find((x) => x.id === hit.id || x.shipments.some((s) => s.id === hit.id))!; const c = d.customers.find((x) => x.id === o.customerId)
      return <><div className="flex flex-wrap items-center gap-2"><StatusBadge s={o.status} /><span className="text-12 text-t2">{rel(o.createdAt)}</span></div>
        <Row k="مشتری"><QuickText v={c?.name ?? ''} /></Row><Row k="مبلغ">{toman(o.total)}</Row><Row k="پرداخت">{o.pay}</Row>
        <div className="space-y-2">{o.shipments.map((s) => <div key={s.id} className="rounded-xl border border-line p-2.5 text-12"><div className="flex items-center justify-between"><span className="ltr font-mono">{s.id}</span><StatusBadge s={s.status} /></div><p className="mt-1 text-t2">{s.method}</p>{s.items.map((i) => <p key={i.unitId + i.productId}><QuickText v={d.products.find((p) => p.id === i.productId)?.title ?? i.productId} /> · {compactToman(i.price)}</p>)}</div>)}</div>
        {reasons('order', o.id).map((r) => <p key={r.id} className="rounded-lg bg-warning-bg px-2 py-1 text-12 text-warning">{r.status}: {r.reason}</p>)}
        <div className="flex gap-2"><Button variant="primary" onClick={() => go(`/admin/orders/${o.id}`)}>جزئیات کامل</Button><Button onClick={() => go(`/admin/print?orders=${o.id}`)}>چاپ</Button></div></> }
    if (hit.kind === 'customer') { const c = d.customers.find((x) => x.id === hit.id)!; const os = d.orders.filter((o) => o.customerId === c.id)
      return <><div className="flex items-center gap-3"><Avatar name={c.name} size={44} /><div><p className="text-15 font-bold">{c.name}</p><p className="text-12 text-t2">{c.city} · {c.segment}</p></div></div>
        <Row k="موبایل"><span className="ltr">{mask(c.mobile)}</span></Row><Row k="سفارش‌ها">{fa(os.length)} · {compactToman(os.reduce((a, o) => a + o.total, 0))}</Row><Row k="کیف پول">{toman(c.wallet)}</Row><Row k="حساب حقوقی">{c.legal ? (c.legal.verified ? 'تأییدشده' : 'در انتظار بررسی') : 'ندارد'}</Row>
        <div className="space-y-1">{os.slice(0, 5).map((o) => <p key={o.id} className="flex justify-between text-12"><QuickText v={o.id} /><StatusBadge s={o.status} /></p>)}</div>
        <Button variant="primary" onClick={() => go(`/admin/customers/${c.id}`)}>پروندهٔ کامل مشتری</Button></> }
    if (hit.kind === 'product') { const p = d.products.find((x) => x.id === hit.id)!; const stock = p.mode === 'qty' ? (p.qty?.tehran ?? 0) + (p.qty?.mahabad ?? 0) : d.units.filter((u) => u.productId === p.id && u.status === 'unit.published').length
      return <>{p.image && <img src={p.image} alt={p.title} className="aspect-video w-full rounded-xl object-cover" style={{ objectPosition: p.imagePos }} />}<p className="font-bold">{p.title}</p>
        <Row k="کد"><span className="ltr font-mono">{p.code}</span></Row><Row k="وضعیت"><StatusBadge s={p.status} /></Row><Row k="موجودی">{fa(stock)}</Row><Row k="قیمت">{toman(d.units.find((u) => u.productId === p.id && u.status === 'unit.published')?.price ?? p.price ?? p.priceNew)}</Row><Row k="بازدید / تبدیل">{fa(p.views)} · {fa(p.cvr)}٪</Row>
        <div className="flex gap-2"><Button variant="primary" onClick={() => go(`/admin/catalog/${p.id}`)}>صفحهٔ کالا</Button><Button onClick={() => go(`/admin/catalog/${p.id}/edit`)}>ویرایش</Button></div></> }
    if (hit.kind === 'unit') { const u = d.units.find((x) => x.id === hit.id)!
      return <><p className="font-bold"><QuickText v={d.products.find((p) => p.id === u.productId)?.title ?? ''} /></p><Row k="کد"><span className="ltr font-mono">{u.code ?? u.id}</span></Row><Row k="سریال"><span className="ltr font-mono">{u.serial}</span></Row><Row k="وضعیت"><StatusBadge s={u.status} /></Row><Row k="قفسه">{u.shelf}</Row><Row k="گرید">{u.grade}</Row><Row k="قیمت / بهای تمام‌شده">{compactToman(u.price)} / {compactToman(u.cost)}</Row>
        <Button variant="primary" onClick={() => go(`/admin/catalog/unit/${u.id}`)}>جزئیات واحد</Button></> }
    if (hit.kind === 'return') { const r = d.returns.find((x) => x.id === hit.id)!
      return <><StatusBadge s={r.status} /><Row k="سفارش"><QuickText v={r.orderId} /></Row><Row k="مشتری"><QuickText v={d.customers.find((c) => c.id === r.customerId)?.name ?? ''} /></Row><Row k="دلیل">{r.reason}</Row><Row k="مبلغ">{toman(r.amount)}</Row>
        {reasons('return', r.id).map((x) => <p key={x.id} className="rounded-lg bg-neutral-bg px-2 py-1 text-12">{x.status}: {x.reason}</p>)}<Button variant="primary" onClick={() => go('/admin/returns')}>رفتن به مرجوعی‌ها</Button></> }
    if (hit.kind === 'ticket') { const t = d.tickets.find((x) => x.id === hit.id)!
      return <><StatusBadge s={t.status} /><Row k="موضوع">{t.subject}</Row><Row k="مشتری"><QuickText v={d.customers.find((c) => c.id === t.customerId)?.name ?? ''} /></Row><Row k="کانال">{t.channel}</Row><Row k="اولویت">{t.priority}</Row><Button variant="primary" onClick={() => go(`/admin/support?t=${t.id}`)}>باز کردن تیکت</Button></> }
    if (hit.kind === 'warranty') { const w = d.warranties.find((x) => x.id === hit.id)!
      return <><StatusBadge s={w.status} /><Row k="کد">{w.code}</Row><Row k="مشتری"><QuickText v={d.customers.find((c) => c.id === w.customerId)?.name ?? ''} /></Row><Row k="مشکل">{w.issue}</Row>{reasons('warranty', w.id).map((x) => <p key={x.id} className="rounded-lg bg-neutral-bg px-2 py-1 text-12">{x.status}: {x.reason}</p>)}<Button variant="primary" onClick={() => go('/admin/returns?tab=warranty')}>رفتن به گارانتی</Button></> }
    const m = d.team.find((x) => x.id === hit.id)!; const acts = d.audit.filter((a) => a.who === m.name)
    return <><div className="flex items-center gap-3"><Avatar name={m.name} size={44} /><div><p className="text-15 font-bold">{m.name}</p><p className="text-12 text-t2">{m.role} · {m.status}</p></div></div>
      <Row k="تلفن"><span className="ltr">{mask(m.phone)}</span></Row><Row k="ورود دومرحله‌ای">{m.twoFA ? 'فعال' : 'غیرفعال'}</Row><Row k="اقدام‌های ثبت‌شده">{fa(acts.length)}</Row>
      <ul className="space-y-1 text-12">{acts.slice(0, 8).map((a, i) => <li key={i} className="flex justify-between gap-2"><span>{a.action} · <QuickText v={a.target} /></span><span className="shrink-0 text-t3">{rel(a.at)}</span></li>)}</ul>
      <Button variant="primary" onClick={() => go('/admin/team?tab=audit')}>لاگ کامل</Button></>
  })()
  return <Drawer open={!!hit} onClose={() => setHit(null)} width={440} title={hit ? <span className="flex items-center gap-2"><Badge dot={false}>{KIND[hit.kind]}</Badge><span className="ltr font-mono text-13">{hit.id}</span><ExternalLink size={13} className="text-t3" /></span> : ''}><div className="space-y-3">{body}</div></Drawer>
}
