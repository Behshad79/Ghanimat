// رزرو موجودی فقط داخل درگاه پرداخت: ورود به درگاه = رزرو؛ بازگشت ناموفق، انصراف یا پایان مهلت = آزادسازی فوری؛ پرداخت موفق = فروش
import { useEffect, useState } from 'react'
import { CheckCircle2, CircleX, Clock, CreditCard, ShoppingCart, Unlock } from 'lucide-react'
import { Badge, Button, Card } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { WithLogo } from '@/shared/ui/brandLogo'
import { getDB, mutate, useDB } from '@/shared/lib/store'
import { fa, rel, toman } from '@/shared/lib/fa'
import type { GatewayHold } from '@/shared/data/seed'
import { ProductImg } from '../pages/_shared'

const ST: Record<GatewayHold['status'], [string, 'brand' | 'success' | 'danger' | 'warning' | 'neutral']> = { in_gateway: ['داخل درگاه · رزرو', 'brand'], paid: ['پرداخت شد · فروخته شد', 'success'], failed: ['ناموفق · آزاد شد', 'danger'], cancelled: ['انصراف · آزاد شد', 'warning'], expired: ['پایان مهلت · آزاد شد', 'warning'], released: ['آزادسازی دستی', 'neutral'] }
const mins = () => Number(getDB().rules.find((r) => r.key === 'reserve_minutes')?.value ?? 15)

/** پایان رزرو: آزاد کردن موجودی یا نهایی کردن فروش */
export function endHold(id: string, status: Exclude<GatewayHold['status'], 'in_gateway'>, note?: string) {
  mutate((x) => {
    const h = x.gatewayHolds.find((y) => y.id === id); if (!h || h.status !== 'in_gateway') return
    h.status = status; h.endedAt = new Date().toISOString(); if (note) h.note = note
    h.items.forEach((it) => {
      if (it.unitId) { const u = x.units.find((y) => y.id === it.unitId); if (u) u.status = status === 'paid' ? 'unit.sold' : 'unit.published' }
      // کالای تعدادی هنگام ورود به درگاه از موجودی کم شده؛ در پرداخت موفق همان‌طور می‌ماند و در غیر این صورت برمی‌گردد
      else if (status !== 'paid') { const p = x.products.find((y) => y.id === it.productId); if (p?.qty) p.qty.tehran = (p.qty.tehran ?? 0) + it.qty }
    })
  }, { action: status === 'paid' ? 'پرداخت موفق؛ رزرو درگاه به فروش تبدیل شد' : 'آزادسازی رزرو درگاه', target: id, after: ST[status][0] })
}

export function GatewayHolds() {
  const d = useDB(); const [, tick] = useState(0); const M = mins()
  const H = [...(d.gatewayHolds ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  // رزروی که مهلتش تمام شده خودکار آزاد می‌شود
  useEffect(() => { const run = () => { getDB().gatewayHolds?.filter((h) => h.status === 'in_gateway' && Date.now() - +new Date(h.at) > mins() * 6e4).forEach((h) => endHold(h.id, 'expired', `پاسخی از درگاه نیامد؛ پس از ${fa(mins())} دقیقه خودکار آزاد شد`)); tick((n) => n + 1) }; run(); const t = setInterval(run, 15000); return () => clearInterval(t) }, [])
  const live = H.filter((h) => h.status === 'in_gateway')
  const left = (h: GatewayHold) => Math.max(0, Math.ceil((+new Date(h.at) + M * 6e4 - Date.now()) / 6e4))
  const sim = (h: GatewayHold, s: 'paid' | 'failed' | 'cancelled') => { endHold(h.id, s, s === 'failed' ? 'خطای بانک ‎-51: موجودی کافی نیست' : s === 'cancelled' ? 'انصراف مشتری داخل درگاه' : undefined); toast(s === 'paid' ? 'پرداخت موفق؛ کالا فروخته شد و سفارش ثبت می‌شود.' : 'مشتری از درگاه برگشت؛ کالا همان لحظه به موجودی سایت برگشت.') }
  return <Card title={<span className="flex items-center gap-2"><CreditCard size={16} />رزرو موجودی داخل درگاه پرداخت</span>} actions={<Badge tone={live.length ? 'brand' : 'neutral'}>{fa(live.length)} نفر همین حالا در درگاه</Badge>}>
    <ol className="mb-3 grid gap-2 text-12 md:grid-cols-3">
      <li className="rounded-xl bg-neutral-bg p-2.5"><b className="flex items-center gap-1.5"><ShoppingCart size={13} />سبد و صفحهٔ پرداخت</b><span className="text-t2">رزروی نیست؛ کالا برای همه قابل خرید است.</span></li>
      <li className="rounded-xl bg-brand-tint/60 p-2.5"><b className="flex items-center gap-1.5 text-brand"><Clock size={13} />داخل درگاه بانک</b><span className="text-t2">کالا تا {fa(M)} دقیقه برای همین مشتری رزرو می‌شود و در سایت از موجودی کم می‌شود.</span></li>
      <li className="rounded-xl bg-success-bg/60 p-2.5"><b className="flex items-center gap-1.5 text-success"><Unlock size={13} />بازگشت از درگاه</b><span className="text-t2">موفق: فروخته می‌شود. ناموفق، انصراف یا پایان مهلت: همان لحظه به موجودی سایت برمی‌گردد.</span></li>
    </ol>
    <ul className="divide-y divide-line rounded-xl border border-line">{H.slice(0, 8).map((h) => { const c = d.customers.find((x) => x.id === h.customerId); const [lab, tone] = ST[h.status]
      return <li key={h.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-12">
        <span className="flex items-center gap-1">{h.items.map((it, i) => <ProductImg key={i} pid={it.productId} size={28} />)}</span>
        <span className="min-w-0 flex-1"><b>{c?.name ?? h.customerId}</b> · <WithLogo name={h.gateway} /> · {toman(h.amount)}<span className="block text-11 text-t3">ورود به درگاه {rel(h.at)}{h.endedAt ? ` · پایان ${rel(h.endedAt)}` : ''}{h.note ? ` · ${h.note}` : ''}</span></span>
        <Badge tone={tone} dot={h.status === 'in_gateway'}>{lab}{h.status === 'in_gateway' ? ` · ${fa(left(h))} دقیقه مانده` : ''}</Badge>
        {h.status === 'in_gateway' && <span className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" icon={<CheckCircle2 size={12} />} onClick={() => sim(h, 'paid')}>شبیه‌سازی: موفق</Button>
          <Button size="sm" variant="ghost" icon={<CircleX size={12} />} onClick={() => sim(h, 'failed')}>شبیه‌سازی: ناموفق</Button>
          <Button size="sm" variant="ghost" icon={<Unlock size={12} />} onClick={() => { endHold(h.id, 'released', 'آزادسازی دستی از پنل'); toast('رزرو آزاد شد و کالا به موجودی سایت برگشت.') }}>آزاد کن</Button></span>}
      </li> })}</ul>
    <p className="mt-2 text-11 text-t3">مدت رزرو از «قوانین کسب‌وکار › موجودی و سبد» تغییر می‌کند. اگر کالای سریال‌دار باشد، همان واحد رزرو و آزاد می‌شود؛ کالای تعدادی از موجودی تهران کم یا به آن اضافه می‌شود.</p>
  </Card>
}
