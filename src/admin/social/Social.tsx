import { DateFilter, inRange, useDateRange } from '@/shared/ui/datefilter'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Camera as Instagram, CreditCard, MessageCircle, Phone, Plus, ScanLine, Send, ShieldAlert, Store } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Tabs, Textarea } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { Bars } from '@/shared/ui/charts'
import { DataTable } from '@/shared/ui/table'
import { Modal, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { QuickText } from '@/shared/ui/quickview'
import { mutate, useDB } from '@/shared/lib/store'
import { compactToman, fa, rel, toman } from '@/shared/lib/fa'
import { parseBankSms } from '@/shared/data/bank'
import { CHANNELS, ManualOrder } from '../orders/OrderTools'
import { useTab } from '../pages/_shared'
import { ChannelLogo, CH_STYLE } from './ChannelLogo'

const ICON: Record<string, ReactNode> = { 'اینستاگرام دایرکت': <Instagram size={16} />, واتساپ: <MessageCircle size={16} />, تلگرام: <Send size={16} />, بله: <MessageCircle size={16} />, تلفنی: <Phone size={16} />, 'حضوری در شعبه': <Store size={16} /> }
const TONE = (s: string) => (s === 'تطبیق شد' ? 'success' : /مشکوک|تکراری|مغایرت|رد/.test(s) ? 'danger' : 'warning')

/** فروش بیرون از سایت (اینستاگرام، واتساپ، تلگرام، بله، تلفن) و تطبیق کارت به کارت پیش از ارسال */
export function Social() {
  const d = useDB(); const nav = useNavigate(); const [tab, setTab] = useTab('orders')
  const [order, setOrder] = useState<string | null>(null); const [sms, setSms] = useState(''); const [card, setCard] = useState(d.bank.cards[0]?.id ?? '')
  const [dr, setDr] = useDateRange(); const socialAll = d.orders.filter((o) => CHANNELS.slice(1).includes(o.channel)); const social = socialAll.filter((o) => inRange(o.createdAt, dr))
  const B = d.bank
  const parsed = sms ? parseBankSms(sms) : null
  /** موتور تطبیق: مبلغ یکسان، فاصلهٔ زمانی، شمارهٔ پیگیری تکراری */
  const runMatch = () => {
    let ok = 0, bad = 0
    mutate((x) => {
      x.bank.receipts.filter((r) => r.status === 'در انتظار تطبیق').forEach((r) => {
        const dup = x.bank.receipts.some((o) => o.id !== r.id && o.ref && o.ref === r.ref && o.status === 'تطبیق شد')
        if (dup) { r.status = 'رسید تکراری'; r.note = 'این شمارهٔ پیگیری قبلاً برای سفارش دیگری استفاده شده است.'; bad++; return }
        const cands = x.bank.credits.filter((c) => !c.matched && c.amount === r.amount)
        if (!cands.length) { const near = x.bank.credits.find((c) => !c.matched && Math.abs(c.amount - r.amount) / r.amount < 0.05); r.status = near ? 'مغایرت مبلغ' : 'مشکوک: واریز در بانک پیدا نشد'; r.note = near ? `واریز ${toman(near.amount)} نزدیک به مبلغ رسید است.` : 'هیچ واریزی با این مبلغ در کارت‌های غنیمت ثبت نشده؛ ممکن است رسید جعلی باشد.'; bad++; return }
        const c = cands.find((k) => !r.last4 || k.from.endsWith(r.last4)) ?? cands[0]
        if (r.last4 && !c.from.endsWith(r.last4)) { r.status = 'مغایرت کارت مبدأ'; r.note = `کارت مبدأ در بانک ${c.from.slice(-4)} است، نه ${r.last4}.`; bad++; return }
        r.status = 'تطبیق شد'; r.note = c.id; c.matched = r.orderId; ok++
        const o = x.orders.find((y) => y.id === r.orderId); if (o && o.status === 'order.awaiting_payment') o.status = 'order.paid'
        const t = x.txns.find((y) => y.orderId === r.orderId); if (t) { t.status = 'pay.success'; t.ref = c.ref }
      })
    }, { action: 'تطبیق خودکار کارت به کارت', target: 'رسیدها' })
    toast(`${fa(ok)} رسید تطبیق شد${bad ? `؛ ${fa(bad)} مورد مشکوک برای بررسی ماند.` : '.'}`)
  }
  const byCh = CHANNELS.slice(1).map((c) => ({ label: c, value: social.filter((o) => o.channel === c).reduce((a, o) => a + o.total, 0) }))
  return (
    <Page title="فروش اجتماعی و کارت به کارت" module="orders" sub="سفارش‌های دایرکت اینستاگرام، واتساپ، تلگرام، بله و تلفن؛ صدور فوری فاکتور، ثبت هم‌زمان در مالی و تطبیق کارت به کارت پیش از ارسال."
      primary={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setOrder('اینستاگرام دایرکت')}>ثبت سفارش از شبکه‌های اجتماعی</Button>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'سفارش‌ها', count: social.length }, { id: 'receipts', label: 'رسیدهای کارت به کارت', count: B.receipts.filter((r) => r.status !== 'تطبیق شد').length }, { id: 'bank', label: 'واریزهای بانک' }, { id: 'cards', label: 'کارت‌های غنیمت' }]} />}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured label="فروش اجتماعی" value={compactToman(social.reduce((a, o) => a + o.total, 0))} note={`${fa(social.length)} سفارش`} />
        <KPI label="در انتظار تطبیق" value={fa(B.receipts.filter((r) => r.status === 'در انتظار تطبیق').length)} note="ارسال تا تطبیق قفل است" />
        <KPI label="رسید مشکوک" value={fa(B.receipts.filter((r) => TONE(r.status) === 'danger').length)} goodDown />
        <KPI label="واریز تطبیق‌نشده" value={fa(B.credits.filter((c) => !c.matched).length)} />
      </div>
      {tab === 'orders' && <div className="space-y-4">
        <DateFilter r={dr} set={setDr} count={social.length} total={socialAll.length} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{CHANNELS.slice(1).map((c) => { const list = social.filter((o) => o.channel === c); const st = CH_STYLE[c]; return <button key={c} onClick={() => setOrder(c)} className="lift group flex flex-col gap-2 rounded-2xl border border-line p-3 text-right" style={{ background: st?.tint }}><span className="flex items-center justify-between"><ChannelLogo ch={c} size={42} /><span className="rounded-full bg-white px-2 py-0.5 text-11 font-bold shadow-sm" style={{ color: st?.fg }}>{fa(list.length)} سفارش</span></span><b className="text-13 text-[#10123d]">{c}</b><span className="tnum text-12 text-[#5a5e78]">{compactToman(list.reduce((a, o) => a + o.total, 0))}</span><span className="mt-auto flex h-8 items-center justify-center gap-1 rounded-lg bg-white text-12 font-medium shadow-sm group-hover:shadow" style={{ color: st?.fg }}><Plus size={13} />ثبت سفارش</span></button> })}</div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <DataTable name="سفارش‌های شبکه‌های اجتماعی" noDate rows={social} rowKey={(o) => o.id} onRow={(o) => nav(`/admin/orders/${o.id}`)} empty={{ title: 'هنوز سفارشی از شبکه‌های اجتماعی ثبت نشده است.', action: <Button variant="primary" onClick={() => setOrder('اینستاگرام دایرکت')}>ثبت اولین سفارش</Button> }}
            cols={[{ key: 'id', title: 'سفارش', render: (o) => <QuickText v={o.id} /> }, { key: 'ch', title: 'کانال', render: (o) => <span className="flex items-center gap-2"><ChannelLogo ch={o.channel} size={24} />{o.channel}</span> }, { key: 'c', title: 'مشتری', render: (o) => <QuickText v={d.customers.find((c) => c.id === o.customerId)?.name ?? ''} /> }, { key: 'p', title: 'پرداخت', render: (o) => o.pay }, { key: 't', title: 'مبلغ', align: 'left', render: (o) => toman(o.total) }, { key: 's', title: 'وضعیت', render: (o) => <Badge tone={o.status === 'order.awaiting_payment' ? 'warning' : 'success'}>{o.status === 'order.awaiting_payment' ? 'در انتظار پرداخت/تطبیق' : 'پرداخت‌شده'}</Badge> }]}
            actions={(o) => [{ label: 'فاکتور', onClick: () => nav(`/admin/print?doc=invoice&orders=${o.id}`) }, { label: 'جزئیات و ارسال', onClick: () => nav(`/admin/orders/${o.id}`) }]} />
          <Card title="فروش هر کانال"><Bars data={byCh} fmt={compactToman} /></Card>
        </div>
      </div>}
      {tab === 'receipts' && <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><Button variant="primary" icon={<BadgeCheck size={14} />} onClick={runMatch}>تطبیق خودکار با واریزهای بانک</Button><p className="text-12 text-t2">قانون: مبلغ برابر، کارت مبدأ یکسان، شمارهٔ پیگیری تکراری نباشد. سفارش تا «تطبیق شد» قابل ارسال نیست.</p></div>
        <DataTable name="رسیدهای کارت به کارت" rows={B.receipts} rowKey={(r) => r.id} empty={{ title: 'رسیدی ثبت نشده است.' }}
          cols={[{ key: 'id', title: 'رسید', render: (r) => <span className="ltr font-mono text-12">{r.id}</span> }, { key: 'o', title: 'سفارش', render: (r) => <QuickText v={r.orderId} /> }, { key: 'c', title: 'مشتری', render: (r) => <QuickText v={r.customer} /> }, { key: 'a', title: 'مبلغ', align: 'left', render: (r) => toman(r.amount) }, { key: 'l', title: 'کارت مبدأ / پیگیری', render: (r) => <span className="ltr text-12">****{r.last4} · {r.ref}</span> }, { key: 's', title: 'وضعیت', render: (r) => <Badge tone={TONE(r.status)}>{r.status}</Badge> }, { key: 'n', title: 'توضیح', wrap: true, render: (r) => <span className="text-12 text-t2">{r.note}</span> }]}
          actions={(r) => [{ label: 'تأیید دستی (با دلیل)', onClick: async () => { const why = await askReason({ kind: 'order', ref: r.orderId, status: 'تأیید دستی کارت به کارت', title: 'چرا دستی تأیید می‌کنید؟' }); if (!why) return; mutate((x) => { const y = x.bank.receipts.find((z) => z.id === r.id)!; y.status = 'تطبیق شد'; y.note = `دستی: ${why}`; const o = x.orders.find((z) => z.id === r.orderId); if (o && o.status === 'order.awaiting_payment') o.status = 'order.paid' }, { action: 'تأیید دستی کارت به کارت', target: r.id }) } }, { label: 'رد رسید و اطلاع به مشتری', danger: true, onClick: async () => { const why = await askReason({ kind: 'order', ref: r.orderId, status: 'رد رسید کارت به کارت', title: 'دلیل رد رسید' }); if (!why) return; mutate((x) => { const y = x.bank.receipts.find((z) => z.id === r.id)!; y.status = 'رد شد'; y.note = why }, { action: 'رد رسید کارت به کارت', target: r.id }) } }]} />
      </div>}
      {tab === 'bank' && <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card title={<span className="flex items-center gap-2"><ScanLine size={15} />خواندن پیامک یا رسید بانک</span>}>
          <Field label="کارت مقصد"><Select value={card} onChange={setCard} options={B.cards.map((c) => [c.id, `${c.bank} · ${c.number}`])} /></Field>
          <Field label="متن پیامک واریز" help="پیامک بانک را اینجا بچسبانید؛ اپ خوانندهٔ پیامک روی گوشی مالی همین را خودکار می‌فرستد."><Textarea rows={4} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="بانک ملت واریز: 82,000,000 ریال کارت مبدا 7788 ساعت 11:05 پیگیری: 991100" /></Field>
          {sms && <p className={cx('mt-2 rounded-xl px-3 py-2 text-12', parsed ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>{parsed ? `مبلغ ${toman(parsed.amount)} · ساعت ${parsed.time || '—'} · کارت مبدأ ${parsed.last4 || '—'} · پیگیری ${parsed.ref || '—'}` : 'مبلغ در متن پیدا نشد.'}</p>}
          <Button variant="primary" className="mt-3 w-full" disabled={!parsed} onClick={() => { const p = parsed!; mutate((x) => { x.bank.credits.unshift({ id: `CR-${Date.now().toString(36).slice(-4)}`, cardId: card, amount: p.amount, at: new Date().toISOString(), ref: p.ref, from: `****-${p.last4}`, raw: sms, matched: '' }) }, { action: 'ثبت واریز بانکی', target: toman(p.amount) }); setSms(''); toast('واریز ثبت شد. «تطبیق خودکار» را بزنید.') }}>ثبت واریز</Button>
        </Card>
        <DataTable name="واریزهای بانک" rows={B.credits} rowKey={(c) => c.id} empty={{ title: 'واریزی ثبت نشده است.' }}
          cols={[{ key: 'id', title: 'شناسه', render: (c) => <span className="ltr font-mono text-12">{c.id}</span> }, { key: 'k', title: 'کارت', render: (c) => B.cards.find((x) => x.id === c.cardId)?.bank ?? '—' }, { key: 'a', title: 'مبلغ', align: 'left', render: (c) => toman(c.amount) }, { key: 'f', title: 'کارت مبدأ', render: (c) => <span className="ltr text-12">{c.from}</span> }, { key: 'm', title: 'تطبیق با', render: (c) => (c.matched ? <QuickText v={c.matched} /> : <Badge tone="warning">تطبیق‌نشده</Badge>) }, { key: 'at', title: 'زمان', render: (c) => <span className="text-12 text-t2">{rel(c.at)}</span> }]} />
      </div>}
      {tab === 'cards' && <div className="grid gap-4 md:grid-cols-2">{B.cards.map((c, i) => <Card key={c.id} title={<span className="flex items-center gap-2"><CreditCard size={15} />{c.bank}</span>}>
        <Field label="شمارهٔ کارت"><Input className="ltr text-left" value={c.number} onChange={(e) => mutate((x) => { x.bank.cards[i].number = e.target.value })} /></Field>
        <Field label="صاحب حساب"><Input value={c.holder} onChange={(e) => mutate((x) => { x.bank.cards[i].holder = e.target.value })} /></Field>
        <Field label="روش اتصال"><Select value={c.method} onChange={(v) => mutate((x) => { x.bank.cards[i].method = v }, { action: 'تغییر روش اتصال کارت', target: c.bank })} options={['اپ خوانندهٔ پیامک روی گوشی مالی', 'API بانک (بانکداری باز)', 'بارگذاری صورتحساب (Excel)', 'ورود دستی']} /></Field>
        <Field label="فرستندهٔ پیامک بانک"><Input className="ltr text-left" value={c.smsSender} onChange={(e) => mutate((x) => { x.bank.cards[i].smsSender = e.target.value })} /></Field>
        <p className="mt-2 flex items-center gap-1 text-11 text-t2"><ShieldAlert size={12} />کلید API بانک در «زیرساخت و سرویس‌ها › یکپارچه‌سازی‌ها» ذخیره می‌شود، نه اینجا.</p>
      </Card>)}
        <Card><Button icon={<Plus size={14} />} onClick={() => mutate((x) => { x.bank.cards.push({ id: `bk${Date.now().toString(36)}`, bank: 'بانک تازه', number: '', holder: 'شرکت غنیمت تجارت نوین', smsSender: '', method: 'ورود دستی', active: true }) }, { action: 'افزودن کارت بانکی', target: 'کارت تازه' })}>افزودن کارت</Button></Card></div>}
      <ManualOrder key={order ?? 'x'} open={!!order} onClose={() => setOrder(null)} channel={order ?? undefined} />
    </Page>
  )
}
