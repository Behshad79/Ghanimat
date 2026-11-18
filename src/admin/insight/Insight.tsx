import { BrandLogo, WithLogo } from '@/shared/ui/brandLogo'
// صفحهٔ جزئیات هر کارت شاخص: ریز موارد پشت عدد، ردیف به ردیف، با لینک به صفحهٔ هر مورد، نمودار روزانه، روش محاسبه و خروجی
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUpLeft, Database, Lightbulb, Sigma } from 'lucide-react'
import { Badge, Button, Card, cx, Segmented, StatusBadge } from '@/shared/ui/base'
import { counted, orderProfit } from '@/shared/lib/profit'
import { NAV } from '../shell/nav'
import { Page } from '@/shared/ui/page'
import { DataTable, type Col } from '@/shared/ui/table'
import { kpiSource } from '@/shared/ui/kpiDetail'
import { useDB } from '@/shared/lib/store'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import type { DB } from '@/shared/data/seed'
import { DEAL_LABEL, dealStatus } from '@/shared/data/merch'
import { ProductImg, CustLink } from '../pages/_shared'

type Row = Record<string, any>
type DS = { id: string; noun: string; rows: (d: DB) => Row[]; key: (r: Row) => string; date?: (r: Row) => string; link: (r: Row) => string; cols: (d: DB) => Col<Row>[]; search: (r: Row, d: DB) => string; metric?: { label: string; val: (r: Row) => number; fmt: (n: number) => string; avg?: boolean } }
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const cust = (d: DB, id: string) => d.customers.find((c) => c.id === id)?.name ?? id
const prod = (d: DB, id: string) => d.products.find((p) => p.id === id)
const days = (n: number) => `${fa(Math.round(n * 10) / 10)} روز`

/* مجموعه‌داده‌ها: هر کدام ردیف‌ها، ستون‌ها و لینک صفحهٔ جزئیات هر ردیف */
const DS: Record<string, DS> = {
  orders: { id: 'orders', noun: 'سفارش', rows: (d) => d.orders.map((o) => ({ ...o, profit: orderProfit(d, o).profit, counted: counted(o) })), key: (r) => r.id, date: (r) => r.createdAt, link: (r) => `/admin/orders/${r.id}`, search: (r, d) => `${r.id} ${cust(d, r.customerId)} ${r.channel}`,
    cols: (d) => [{ key: 'id', title: 'سفارش', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} /> }, { key: 'ch', title: 'کانال', render: (r) => r.channel, hideMobile: true }, { key: 'at', title: 'زمان', render: (r) => rel(r.createdAt), sort: (r) => +new Date(r.createdAt) }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 't', title: 'مبلغ', render: (r) => toman(r.total), sort: (r) => r.total, text: (r) => r.total }, { key: 'm', title: 'سود', render: (r) => <span className={r.profit < 0 ? 'text-danger' : ''}>{compactToman(r.profit)}</span>, sort: (r) => r.profit, text: (r) => r.profit, hideMobile: true }],
    metric: { label: 'جمع مبلغ', val: (r) => r.total, fmt: compactToman } },
  units: { id: 'units', noun: 'واحد', rows: (d) => d.units, key: (r) => r.id, date: (r) => r.received, link: (r) => `/admin/catalog/unit/${r.id}`, search: (r, d) => `${r.id} ${r.serial} ${prod(d, r.productId)?.title} ${r.shelf}`,
    cols: (d) => [{ key: 'p', title: 'کالا', render: (r) => <span className="flex items-center gap-2"><ProductImg pid={r.productId} size={30} /><span className="max-w-56 truncate">{prod(d, r.productId)?.title}</span></span> }, { key: 'id', title: 'واحد', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'w', title: 'انبار و قفسه', render: (r) => `${d.warehouses.find((w) => w.id === r.warehouse)?.name ?? r.warehouse} · ${r.shelf}`, hideMobile: true }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'age', title: 'در انبار', render: (r) => days((Date.now() - +new Date(r.received)) / 864e5), sort: (r) => +new Date(r.received) }, { key: 'c', title: 'بهای تمام‌شده', render: (r) => compactToman(r.cost), sort: (r) => r.cost, text: (r) => r.cost }],
    metric: { label: 'ارزش (بهای تمام‌شده)', val: (r) => r.cost, fmt: compactToman } },
  intake: { id: 'intake', noun: 'واحد', rows: (d) => d.units.map((u) => { const h = hash(u.id); const pub = ['unit.published', 'unit.sold', 'unit.reserved'].includes(u.status); const dd = pub ? 0.4 + (h % 40) / 10 : (Date.now() - +new Date(u.received)) / 864e5; const steps = pub ? { qc: Math.round(dd * 0.25 * 10) / 10, photo: Math.round(dd * 0.35 * 10) / 10, content: Math.round(dd * 0.4 * 10) / 10 } : null; return { ...u, dd, pub, steps } }),
    key: (r) => r.id, date: (r) => r.received, link: (r) => `/admin/catalog/unit/${r.id}`, search: (r, d) => `${r.id} ${prod(d, r.productId)?.title}`,
    cols: (d) => [{ key: 'p', title: 'کالا', render: (r) => <span className="flex items-center gap-2"><ProductImg pid={r.productId} size={30} /><span className="max-w-56 truncate">{prod(d, r.productId)?.title}</span></span> }, { key: 'id', title: 'واحد', render: (r) => <span className="ltr font-mono">{r.id}</span>, hideMobile: true }, { key: 'in', title: 'ورود به انبار', render: (r) => new Date(r.received).toLocaleDateString('fa-IR'), sort: (r) => +new Date(r.received) }, { key: 'dd', title: 'ورود تا انتشار', render: (r) => <b className={r.dd > 3 ? 'text-danger' : r.dd > 2 ? 'text-warning' : 'text-success'}>{days(r.dd)}{!r.pub && ' (هنوز منتشر نشده)'}</b>, sort: (r) => r.dd, text: (r) => Math.round(r.dd * 10) / 10 }, { key: 'st', title: 'کجا ماند؟', render: (r) => r.steps ? <span className="text-11 text-t2">کنترل کیفیت {fa(r.steps.qc)} · عکاسی {fa(r.steps.photo)} · محتوا {fa(r.steps.content)} روز</span> : <StatusBadge s={r.status} /> }],
    metric: { label: 'میانگین ورود تا انتشار', val: (r) => r.dd, fmt: days, avg: true } },
  products: { id: 'products', noun: 'کالا', rows: (d) => d.products, key: (r) => r.id, link: (r) => `/admin/catalog/${r.id}`, search: (r) => `${r.title} ${r.en} ${r.code ?? ''}`,
    cols: () => [{ key: 'p', title: 'کالا', render: (r) => <span className="flex items-center gap-2"><ProductImg pid={r.id} size={30} /><span className="max-w-64 truncate">{r.title}</span></span> }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'q', title: 'موجودی', render: (r) => fa((r.qty?.tehran ?? 0) + (r.qty?.mahabad ?? 0)), sort: (r) => (r.qty?.tehran ?? 0) + (r.qty?.mahabad ?? 0) }, { key: 'v', title: 'بازدید', render: (r) => fa(r.views), sort: (r) => r.views, hideMobile: true }, { key: 'cvr', title: 'نرخ تبدیل', render: (r) => `${fa(r.cvr)}٪`, sort: (r) => r.cvr, hideMobile: true }, { key: 'pr', title: 'قیمت', render: (r) => toman(r.price || r.priceNew), sort: (r) => r.price || r.priceNew }] },
  customers: { id: 'customers', noun: 'مشتری', rows: (d) => d.customers, key: (r) => r.id, date: (r) => r.lastOrder, link: (r) => `/admin/customers/${r.id}`, search: (r) => `${r.name} ${r.mobile} ${r.city}`,
    cols: () => [{ key: 'n', title: 'مشتری', render: (r) => r.name }, { key: 'city', title: 'شهر', render: (r) => r.city, hideMobile: true }, { key: 'seg', title: 'بخش', render: (r) => <Badge dot={false}>{r.segment}</Badge> }, { key: 'o', title: 'سفارش', render: (r) => fa(r.orders), sort: (r) => r.orders }, { key: 'ltv', title: 'ارزش طول عمر', render: (r) => compactToman(r.ltv), sort: (r) => r.ltv, text: (r) => r.ltv }, { key: 'last', title: 'آخرین خرید', render: (r) => rel(r.lastOrder), sort: (r) => +new Date(r.lastOrder), hideMobile: true }],
    metric: { label: 'جمع ارزش طول عمر', val: (r) => r.ltv, fmt: compactToman } },
  tickets: { id: 'tickets', noun: 'تیکت', rows: (d) => d.tickets.map((t) => ({ ...t, at: t.messages[0]?.at ?? t.sla })), key: (r) => r.id, date: (r) => r.at, link: (r) => `/admin/support?t=${r.id}`, search: (r, d) => `${r.id} ${r.subject} ${cust(d, r.customerId)}`,
    cols: (d) => [{ key: 'id', title: 'تیکت', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'sub', title: 'موضوع', render: (r) => <span className="max-w-64 truncate">{r.subject}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} />, hideMobile: true }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'pr', title: 'اولویت', render: (r) => r.priority, hideMobile: true }, { key: 'csat', title: 'رضایت', render: (r) => (r.csat === 'yes' ? '👍' : r.csat === 'no' ? '👎' : '—') }] },
  ai: { id: 'ai', noun: 'گفتگو', rows: (d) => d.journey.aiChats, key: (r) => r.id, date: (r) => r.at, link: (r) => `/admin/conversations?open=${r.id}`, search: (r, d) => `${r.id} ${r.intent} ${cust(d, r.customerId)} ${r.messages.map((m: any) => m.text).join(' ')}`,
    cols: (d) => [{ key: 'id', title: 'گفتگو', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} /> }, { key: 'i', title: 'نیت', render: (r) => r.intent }, { key: 'q', title: 'پرسش اول', render: (r) => <span className="line-clamp-1 max-w-72 text-12 text-t2">{r.messages[0]?.text}</span>, hideMobile: true }, { key: 'r', title: 'نتیجه', render: (r) => r.handoff ? <Badge tone="warning">انتقال به انسان</Badge> : r.resolved ? <Badge tone="success">حل‌شده بدون انسان</Badge> : <Badge tone="danger">حل‌نشده</Badge> }, { key: 'b', title: 'خرید', render: (r) => (r.converted ? <Badge tone="success">خرید کرد</Badge> : '—') }, { key: 'at', title: 'زمان', render: (r) => rel(r.at), sort: (r) => +new Date(r.at), hideMobile: true }] },
  returns: { id: 'returns', noun: 'مرجوعی', rows: (d) => d.returns, key: (r) => r.id, date: (r) => r.createdAt, link: (r) => `/admin/returns?r=${r.id}`, search: (r, d) => `${r.id} ${r.orderId} ${r.reason} ${cust(d, r.customerId)}`,
    cols: (d) => [{ key: 'id', title: 'مرجوعی', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'o', title: 'سفارش', render: (r) => <span className="ltr font-mono">{r.orderId}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} />, hideMobile: true }, { key: 'why', title: 'دلیل', render: (r) => r.reason }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'a', title: 'مبلغ', render: (r) => toman(r.amount), sort: (r) => r.amount }],
    metric: { label: 'جمع مبلغ', val: (r) => r.amount, fmt: compactToman } },
  reviews: { id: 'reviews', noun: 'دیدگاه', rows: (d) => d.reviews, key: (r) => r.id, date: (r) => r.at ?? r.createdAt, link: () => '/admin/reviews', search: (r, d) => `${r.text} ${prod(d, r.productId)?.title}`,
    cols: (d) => [{ key: 'p', title: 'کالا', render: (r) => <span className="max-w-48 truncate">{prod(d, r.productId)?.title}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} />, hideMobile: true }, { key: 'r', title: 'امتیاز', render: (r) => `${fa(r.rating)} از ۵`, sort: (r) => r.rating }, { key: 't', title: 'متن', render: (r) => <span className="line-clamp-1 max-w-80 text-12">{r.text}</span> }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }],
    metric: { label: 'میانگین امتیاز', val: (r) => r.rating, fmt: (n) => `${fa(Math.round(n * 10) / 10)} از ۵`, avg: true } },
  txns: { id: 'txns', noun: 'تراکنش', rows: (d) => d.txns, key: (r) => r.id, date: (r) => r.at, link: (r) => (r.orderId ? `/admin/orders/${r.orderId}` : '/admin/finance'), search: (r) => `${r.id} ${r.orderId} ${r.ref} ${r.gateway}`,
    cols: () => [{ key: 'id', title: 'تراکنش', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'o', title: 'سفارش', render: (r) => <span className="ltr font-mono">{r.orderId}</span> }, { key: 'g', title: 'درگاه', render: (r) => <WithLogo name={r.gateway} /> }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'a', title: 'مبلغ', render: (r) => toman(r.amount), sort: (r) => r.amount }, { key: 'at', title: 'زمان', render: (r) => rel(r.at), sort: (r) => +new Date(r.at), hideMobile: true }],
    metric: { label: 'جمع مبلغ', val: (r) => r.amount, fmt: compactToman } },
  deals: { id: 'deals', noun: 'غنی‌آف', rows: (d) => d.merch.deals.map((x) => ({ ...x, st: dealStatus(x) })), key: (r) => r.id, date: (r) => r.start, link: () => '/admin/merch', search: (r, d) => `${prod(d, r.pid)?.title} ${r.note ?? ''}`,
    cols: (d) => [{ key: 'p', title: 'کالا', render: (r) => <span className="flex items-center gap-2"><ProductImg pid={r.pid} size={30} /><span className="max-w-56 truncate">{prod(d, r.pid)?.title}</span></span> }, { key: 'st', title: 'وضعیت', render: (r) => <Badge tone={DEAL_LABEL[r.st as keyof typeof DEAL_LABEL][1]}>{DEAL_LABEL[r.st as keyof typeof DEAL_LABEL][0]}</Badge> }, { key: 'w', title: 'بازه', render: (r) => `${new Date(r.start).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} تا ${new Date(r.end).toLocaleString('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, sort: (r) => +new Date(r.start) }, { key: 'pr', title: 'قیمت', render: (r) => <span><s className="text-t3">{compactToman(r.regular)}</s> {toman(r.price)}</span>, sort: (r) => r.price }, { key: 's', title: 'فروش از سقف', render: (r) => `${fa(r.sold)} از ${fa(r.cap)}`, sort: (r) => r.sold }],
    metric: { label: 'تخفیف داده‌شده', val: (r) => (r.regular - r.price) * r.sold, fmt: compactToman } },
  shipments: { id: 'shipments', noun: 'مرسوله', rows: (d) => d.orders.flatMap((o) => o.shipments.map((s) => ({ ...s, orderId: o.id, customerId: o.customerId, createdAt: o.createdAt, late: !['ship.delivered', 'ship.cancelled'].includes(s.status) && +new Date(s.sla) < Date.now() }))), key: (r) => r.id, date: (r) => r.createdAt, link: (r) => `/admin/orders/${r.orderId}`, search: (r, d) => `${r.id} ${r.method} ${cust(d, r.customerId)}`,
    cols: (d) => [{ key: 'id', title: 'مرسوله', render: (r) => <span className="ltr font-mono">{r.id}</span> }, { key: 'c', title: 'مشتری', render: (r) => <CustLink v={cust(d, r.customerId)} id={r.customerId} />, hideMobile: true }, { key: 'm', title: 'روش ارسال', render: (r) => r.method }, { key: 's', title: 'وضعیت', render: (r) => <StatusBadge s={r.status} /> }, { key: 'sla', title: 'مهلت', render: (r) => <span className={r.late ? 'font-semibold text-danger' : ''}>{r.late ? 'دیر شده' : rel(r.sla)}</span>, sort: (r) => +new Date(r.sla) }] },
}

type Spec = { ds: string; only?: (r: Row, d: DB) => boolean; why: string; metric?: DS['metric'] }
/** کدام ردیف‌ها پشت کدام عدد هستند (بر اساس عنوان کارت؛ ترتیب مهم است) */
const SPECS: [RegExp, Spec][] = [
  [/غنی‌آف.*(اجرا)/, { ds: 'deals', only: (r) => r.st === 'live' || r.st === 'paused', why: 'غنی‌آف‌هایی که الان روی سایت هستند.' }],
  [/صف آینده/, { ds: 'deals', only: (r) => r.st === 'scheduled', why: 'غنی‌آف‌های زمان‌بندی‌شده برای آینده.' }],
  [/غنی‌آف|تخفیف داده‌شده/, { ds: 'deals', why: 'همهٔ غنی‌آف‌ها با فروش و تخفیف هر کدام.' }],
  [/حل‌شده بدون انسان/, { ds: 'ai', only: (r) => r.resolved && !r.handoff, why: 'گفتگوهایی که دستیار بدون دخالت پشتیبان به نتیجه رساند.' }],
  [/انتقال به پشتیبانی|انتقال به انسان/, { ds: 'ai', only: (r) => r.handoff, why: 'گفتگوهایی که دستیار به پشتیبان انسانی سپرد.' }],
  [/خرید پس از گفتگو/, { ds: 'ai', only: (r) => r.converted, why: 'گفتگوهایی که به خرید رسید.' }],
  [/^گفتگو/, { ds: 'ai', why: 'همهٔ گفتگوهای دستیار خرید.' }],
  [/ورود تا انتشار/, { ds: 'intake', why: 'برای هر واحد، فاصلهٔ رسیدن به انبار تا انتشار در سایت و سهم هر مرحله.' }],
  [/راکد/, { ds: 'units', only: (r) => r.status === 'unit.published' && Date.now() - +new Date(r.received) > 30 * 864e5, why: 'واحدهای منتشرشده‌ای که بیش از ۳۰ روز فروش نرفته‌اند.' }],
  [/QC|کنترل کیفیت/, { ds: 'units', only: (r) => r.status === 'unit.qc', why: 'واحدهای منتظر کنترل کیفیت.' }],
  [/عکاسی/, { ds: 'units', only: (r) => r.status === 'unit.photo', why: 'واحدهای منتظر عکاسی.' }],
  [/منتظر انتشار|آمادهٔ انتشار/, { ds: 'units', only: (r) => r.status === 'unit.ready', why: 'واحدهای آماده که هنوز منتشر نشده‌اند.' }],
  [/موجودی|واحد|انبار/, { ds: 'units', only: (r) => ['unit.published', 'unit.ready', 'unit.reserved'].includes(r.status), why: 'واحدهای موجود در انبارها.' }],
  [/لغو/, { ds: 'orders', only: (r) => /cancel/.test(r.status), why: 'سفارش‌های لغوشده.' }],
  [/مشکوک/, { ds: 'orders', only: (r) => r.status === 'order.suspicious' || r.risk > 60, why: 'سفارش‌های با ریسک بالا.' }],
  [/سفارش.*(منتظر|معوق|اقدام)|منتظر اقدام/, { ds: 'orders', only: (r) => ['order.paid', 'order.needs_decision', 'order.suspicious'].includes(r.status), why: 'سفارش‌هایی که منتظر اقدام انسانی هستند.' }],
  [/تحویل به‌موقع|مهلت|SLA|دیرکرد|تأخیر/, { ds: 'shipments', why: 'مرسوله‌ها با مهلت تحویل؛ دیرشده‌ها قرمزند.' }],
  [/مرجوعی/, { ds: 'returns', why: 'درخواست‌های مرجوعی.' }],
  [/تراکنش|پرداخت|درگاه|نامشخص/, { ds: 'txns', why: 'تراکنش‌های پرداخت.' }],
  [/دیدگاه|پرسش|امتیاز/, { ds: 'reviews', why: 'دیدگاه‌ها و امتیازهای کالاها.' }],
  [/تیکت|پشتیبانی|پاسخ|رضایت/, { ds: 'tickets', why: 'تیکت‌های پشتیبانی.' }],
  [/مشتری|LTV|وفادار|ریزش|VIP/, { ds: 'customers', why: 'مشتریان مرتبط با این شاخص.' }],
  [/سود|حاشیه/, { ds: 'orders', only: (r) => r.counted, why: 'سود هر سفارش: مبلغ فروش منهای بهای تمام‌شده، کارمزدها و هزینهٔ ارسال.', metric: { label: 'جمع سود', val: (r) => r.profit, fmt: compactToman } }],
  [/AOV|میانگین سبد|میانگین سفارش/, { ds: 'orders', only: (r) => !/cancel/.test(r.status), why: 'میانگین مبلغ سفارش‌های پرداخت‌شده.', metric: { label: 'میانگین مبلغ سفارش', val: (r) => r.total, fmt: compactToman, avg: true } }],
  [/فروش|درآمد|سفارش|سبد|تبدیل/, { ds: 'orders', only: (r) => r.counted, why: 'سفارش‌های پرداخت‌شده‌ای که این عدد از آن‌ها ساخته شده است.' }],
  [/کالا|محصول|بازدید/, { ds: 'products', why: 'کالاهای پشت این عدد.' }],
]
const BY_PATH: [RegExp, string][] = [[/merch/, 'deals'], [/orders|live|social/, 'orders'], [/warehouse|catalog|readiness|supply/, 'units'], [/customers|growth|marketing/, 'customers'], [/support|calls|requests/, 'tickets'], [/conversations/, 'ai'], [/returns/, 'returns'], [/finance|pricing/, 'txns'], [/reviews/, 'reviews'], [/shipping/, 'shipments']]
export function resolveSpec(label: string, from = ''): Spec { return SPECS.find(([r]) => r.test(label))?.[1] ?? { ds: BY_PATH.find(([r]) => r.test(from))?.[1] ?? 'orders', why: 'داده‌های همین بخش.' } }

const PERIODS: [string, string][] = [['1', '۲۴ ساعت'], ['7', '۷ روز'], ['30', '۳۰ روز'], ['0', 'همه']]
const dayKey = (t: number | string) => new Date(t).toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' })
/** نمودار ستونی فشرده؛ هر ستون یک روز و کلیک روی آن جدول را به همان روز محدود می‌کند */
function Columns({ data, pick, onPick }: { data: { k: string; v: number }[]; pick: string | null; onPick: (k: string | null) => void }) {
  const max = Math.max(1, ...data.map((x) => x.v))
  return <div className="flex h-36 items-end gap-1" role="list">{data.map((x) => <button key={x.k} role="listitem" title={`${x.k}: ${fa(x.v)}`} aria-label={`${x.k}: ${fa(x.v)} مورد`} aria-pressed={pick === x.k} onClick={() => onPick(pick === x.k ? null : x.k)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
    <span className={cx('tnum text-[10px]', x.v ? 'text-t2' : 'text-transparent')}>{fa(x.v)}</span>
    <span className={cx('w-full rounded-t-md transition-colors', pick === x.k ? 'bg-brand-solid' : x.v ? 'bg-brand/40 group-hover:bg-brand/70' : 'bg-neutral-bg')} style={{ height: `${Math.max(4, (x.v / max) * 100)}%` }} />
    <span className={cx('text-[10px] whitespace-nowrap', pick === x.k ? 'font-semibold text-brand' : 'text-t3')}>{x.k.split(' ')[0]}</span>
  </button>)}</div>
}

export function Insight() {
  const d = useDB(); const nav = useNavigate(); const { key = '' } = useParams(); const [sp] = useSearchParams()
  const label = decodeURIComponent(key); const from = sp.get('from') ?? ''; const q = sp.get('q') ?? ''; const shown = sp.get('v') ?? ''; const to = sp.get('to') ?? ''
  const spec = resolveSpec(label, from); const ds = DS[spec.ds]; const src = kpiSource(label)
  const fromLabel = NAV.filter((n) => n.path !== '/admin' && from.startsWith(n.path)).sort((a, b) => b.path.length - a.path.length)[0]?.label ?? 'خانه'
  const def = /امروز/.test(label) ? '1' : /هفته|۷ روز/.test(label) ? '7' : /ماه|۳۰ روز/.test(label) ? '30' : '0'
  const [per, setPer] = useState(def); const period = +per; const [day, setDay] = useState<string | null>(null)
  // «امروز» همان تعریف کارت خانه است: ۲۴ ساعت اخیر
  const since = Date.now() - period * 864e5
  const all = useMemo(() => ds.rows(d), [d, ds])
  const inSpec = useMemo(() => all.filter((r) => !spec.only || spec.only(r, d)), [all, spec, d])
  const subAll = useMemo(() => inSpec.filter((r) => !period || !ds.date || +new Date(ds.date(r)) >= since), [inSpec, period, since, ds])
  const periodAll = useMemo(() => all.filter((r) => !period || !ds.date || +new Date(ds.date(r)) >= since), [all, period, since, ds])
  const qHits = useMemo(() => (q ? subAll.filter((r) => ds.search(r, d).includes(q)) : subAll), [subAll, q, ds, d]); const sub = q && qHits.length ? qHits : subAll
  const [scope, setScope] = useState<'kpi' | 'all'>('kpi'); const base = scope === 'kpi' ? sub : all
  const rows = day && ds.date ? base.filter((r) => dayKey(ds.date!(r)) === day) : base
  const m = spec.metric ?? ds.metric; const mv = m && rows.length ? (m.avg ? rows.reduce((a, r) => a + m.val(r), 0) / rows.length : rows.reduce((a, r) => a + m.val(r), 0)) : null
  const span = period === 1 || period === 0 ? 14 : period
  const byDay = useMemo(() => { if (!ds.date) return []; const b = new Map<string, number>(); for (let i = span - 1; i >= 0; i--) b.set(dayKey(Date.now() - i * 864e5), 0); inSpec.forEach((r) => { const k = dayKey(ds.date!(r)); if (b.has(k)) b.set(k, b.get(k)! + 1) }); return [...b.entries()].map(([k, v]) => ({ k, v })) }, [inSpec, ds, span])
  const prev = useMemo(() => (period && ds.date ? inSpec.filter((r) => { const t = +new Date(ds.date!(r)); return t < since && t >= since - period * 864e5 }).length : null), [inSpec, period, since, ds])
  const cols: Col<Row>[] = [...ds.cols(d), { key: 'go', title: '', render: () => <span className="inline-flex items-center gap-1 text-11 text-brand">جزئیات<ArrowUpLeft size={12} /></span> }]
  const delta = prev !== null && prev > 0 ? Math.round(((sub.length - prev) / prev) * 100) : null
  return <Page title={label} back={from || '/admin'} sub={<span className="flex flex-wrap items-center gap-1 text-12"><button className="hover:text-brand" onClick={() => nav(from || '/admin')}>{fromLabel}</button><span className="text-t3">›</span><span>{label}</span><span className="text-t3">·</span><span>{spec.why}</span></span>}
    badge={shown ? <Badge tone="brand" dot={false}>عدد روی کارت: {shown}</Badge> : undefined}
    actions={<><Segmented size="sm" value={per} onChange={(v) => { setPer(v); setDay(null) }} options={PERIODS} />{(to || src.to) && <Button variant="primary" icon={<ArrowUpLeft size={14} />} onClick={() => nav(to || src.to)}>رفتن به صفحهٔ منبع</Button>}</>}>
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card><p className="text-12 text-t2">{ds.noun} پشت این عدد</p><p className="mt-1 flex items-baseline gap-2 text-24 font-bold">{fa(sub.length)}{delta !== null && <span className={cx('rounded-full px-2 py-0.5 text-11 font-medium', delta >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>{delta >= 0 ? '+' : ''}{fa(delta)}٪</span>}</p>{spec.only && periodAll.length > 0 && <p className="mt-1 rounded-lg bg-brand-tint/50 px-2 py-1 text-12 text-brand">{fa(sub.length)} از {fa(periodAll.length)} {ds.noun} = {fa(Math.round((sub.length / periodAll.length) * 100))}٪</p>}<p className="text-11 text-t3">{period ? `${PERIODS.find(([k]) => k === per)![1]} اخیر` : 'همهٔ زمان‌ها'} · از {fa(all.length)} {ds.noun} در کل{prev !== null ? ` · دورهٔ قبل ${fa(prev)}` : ''}</p></Card>
        {m && <Card><p className="text-12 text-t2">{m.label}</p><p className="mt-1 text-24 font-bold">{mv !== null ? m.fmt(mv) : '—'}</p><p className="text-11 text-t3">{day ? `فقط ${day}` : scope === 'kpi' ? 'موارد همین شاخص در بازهٔ انتخابی' : 'همهٔ موارد'}</p></Card>}
        <Card className={m ? '' : 'md:col-span-2'}><p className="flex items-center gap-1.5 text-12 text-t2"><Sigma size={13} />روش محاسبه</p><p className="mt-1 text-12 leading-6">{src.formula}</p><p className="mt-1 flex items-center gap-1.5 text-11 text-t3"><Database size={12} />{src.source}</p></Card>
      </div>
      {byDay.length > 0 && <Card title={`${ds.noun}‌ها در ${fa(byDay.length)} روز اخیر`} actions={day ? <Button size="sm" variant="ghost" onClick={() => setDay(null)}>برداشتن فیلتر {day}</Button> : <span className="text-11 text-t3">روی هر روز بزنید تا جدول همان روز را نشان دهد</span>}><Columns data={byDay} pick={day} onPick={setDay} /></Card>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{q && <span className="flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-12 text-brand">فیلتر: {q}{!qHits.length && ' (موردی پیدا نشد؛ همه نمایش داده می‌شود)'}<button aria-label="برداشتن فیلتر" onClick={() => nav(`/admin/insight/${encodeURIComponent(label)}?from=${encodeURIComponent(from)}`, { replace: true })}>×</button></span>}
          <Segmented value={scope} onChange={setScope} options={[['kpi', `فقط موارد این شاخص (${fa(sub.length)})`], ['all', `همه (${fa(all.length)})`]]} /></div>
        <span className="text-11 text-t2">روی هر ردیف بزنید تا صفحهٔ همان {ds.noun} باز شود.</span>
      </div>
      <DataTable name={label} rows={rows} rowKey={ds.key} cols={cols} onRow={(r) => nav(ds.link(r))} search={(r) => ds.search(r, d)} empty={{ title: `${ds.noun}ی در این بازه نیست.`, desc: 'بازهٔ بالای صفحه را به «۳۰ روز» یا «همه» تغییر دهید.', action: <Button size="sm" onClick={() => { setPer('0'); setDay(null) }}>نمایش همهٔ زمان‌ها</Button> }} />
      {src.tips.length > 0 && <Card title={<span className="flex items-center gap-2"><Lightbulb size={15} />برای بهتر شدن این عدد</span>}><ul className="list-disc space-y-1 pr-5 text-13">{src.tips.map((t) => <li key={t}>{t}</li>)}</ul></Card>}
    </div>
  </Page>
}
export type { ReactNode }
