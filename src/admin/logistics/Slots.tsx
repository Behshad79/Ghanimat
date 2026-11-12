import { useMemo, useState } from 'react'
import { CalendarClock, MessageSquareText, Plus, Store, Trash2 } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { DataTable } from '@/shared/ui/table'
import { toast } from '@/shared/ui/overlay'
import { mutate, sendSms, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'

import { DAYS, type Delivery } from '@/shared/data/delivery'
const hh = (h: number) => `${fa(h)}`

/** موتور بازهٔ ارسال: از زمان ثبت سفارش، بازهٔ تحویل را طبق ساعت قطع و ظرفیت محاسبه می‌کند */
export function computeSlot(D: Delivery, when: Date, fast: boolean) {
  const h = when.getHours() + when.getMinutes() / 60
  const dayName = DAYS[(when.getDay() + 1) % 7]
  const free = (day: 'today' | 'tomorrow', id: string, cap: number) => (D.booked[`${day}:${id}`] ?? 0) < cap
  if (fast && !D.closedDays.includes(dayName) && h >= D.openHour && h < D.fastCutoff) return { day: 'امروز', label: `حداکثر ${fa(D.fastHours)} ساعت بعد (تا ساعت ${fa(Math.min(23, Math.ceil(h + D.fastHours)))})`, why: `ثبت بین ساعت ${hh(D.openHour)} و ساعت قطع ${hh(D.fastCutoff)}؛ تحویل ${fa(D.fastHours)} ساعته.` }
  const todayLeft = D.slots.filter((s) => s.from >= h + 1 && free('today', s.id, s.cap))
  if (!fast && h < D.nightAfter && todayLeft.length && !D.closedDays.includes(dayName)) return { day: 'امروز', label: `ساعت ${hh(todayLeft[0].from)} تا ${hh(todayLeft[0].to)}`, why: 'اولین بازهٔ امروز که ظرفیت خالی دارد.' }
  const next = D.slots.find((s) => free('tomorrow', s.id, s.cap))
  return { day: 'فردا', label: next ? `ساعت ${hh(next.from)} تا ${hh(next.to)}` : 'ظرفیت فردا پر است؛ روز بعد', why: h >= D.nightAfter || h < D.openHour ? `ثبت بعد از ساعت ${hh(D.nightAfter)} یا پیش از ساعت ${hh(D.openHour)}؛ اولین بازهٔ آزاد صبح فردا.` : fast ? `بعد از ساعت قطع تحویل سریع (${hh(D.fastCutoff)})؛ اولین بازهٔ آزاد فردا.` : 'بازه‌های امروز پر شده‌اند.' }
}

export function SlotsEngine() {
  const d = useDB(); const D = d.delivery
  const set = (fn: (x: Delivery) => void, action?: string) => mutate((x) => fn(x.delivery), action ? { action, target: 'بازه‌های ارسال' } : undefined)
  const [t, setT] = useState('00:00'); const [fast, setFast] = useState(true)
  const sim = useMemo(() => { const [a, b] = t.split(':').map(Number); const dt = new Date(); dt.setHours(a || 0, b || 0, 0, 0); return computeSlot(D, dt, fast) }, [t, fast, D])
  return (
    <div className="space-y-4">
    <DayTimeline D={D} />
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card title="قانون‌های زمان ارسال">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="شروع کار روزانه (ساعت)"><Input type="number" min={0} max={23} value={D.openHour} onChange={(e) => set((x) => { x.openHour = +e.target.value })} /></Field>
            <Field label="ساعت قطع تحویل سریع" help="بعد از این ساعت، تحویل سریع به فردا می‌رود."><Input type="number" min={0} max={23} value={D.fastCutoff} onChange={(e) => set((x) => { x.fastCutoff = +e.target.value })} /></Field>
            <Field label="مدت تحویل سریع (ساعت)"><Input type="number" min={1} max={6} value={D.fastHours} onChange={(e) => set((x) => { x.fastHours = +e.target.value })} /></Field>
            <Field label="سفارش‌های بعد از ساعت … → صبح فردا" help="مثلاً سفارش ساعت ۱۲ شب برای فردا ۸ تا ۱۰ زمان‌بندی می‌شود."><Input type="number" min={0} max={23} value={D.nightAfter} onChange={(e) => set((x) => { x.nightAfter = +e.target.value })} /></Field>
          </div>
          <p className="mt-3 text-12 font-semibold">روزهای تعطیل ارسال</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{DAYS.map((x) => <button key={x} onClick={() => set((y) => { y.closedDays = y.closedDays.includes(x) ? y.closedDays.filter((z) => z !== x) : [...y.closedDays, x] }, 'تغییر روزهای تعطیل ارسال')} className={cx('rounded-full border px-3 py-1 text-12', D.closedDays.includes(x) ? 'border-transparent bg-danger-solid text-white' : 'border-line')}>{x}</button>)}</div>
        </Card>
        <Card title="بازه‌ها و ظرفیت (تایم‌های خالی)" actions={<Button size="sm" icon={<Plus size={13} />} onClick={() => set((x) => { const last = x.slots.at(-1); x.slots.push({ id: `sl${Date.now().toString(36)}`, from: last ? last.to : 8, to: (last ? last.to : 8) + 2, cap: 10 }) }, 'افزودن بازهٔ ارسال')}>افزودن بازه</Button>} pad={false}>
          <table className="gh-table w-full text-13"><thead><tr className="text-t2"><th className="px-4 py-2 text-right font-medium">بازه</th><th className="py-2 font-medium">ظرفیت</th><th className="py-2 font-medium">امروز</th><th className="py-2 font-medium">فردا</th><th /></tr></thead>
            <tbody>{D.slots.map((s, i) => { const bt = D.booked[`today:${s.id}`] ?? 0; const bm = D.booked[`tomorrow:${s.id}`] ?? 0; const cell = (n: number) => <span className={cx('tnum rounded-md px-2 py-0.5', n >= s.cap ? 'bg-danger-bg text-danger' : n / s.cap > 0.7 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')}>{fa(n)}/{fa(s.cap)}{n >= s.cap && ' · تکمیل ظرفیت'}</span>
              return <tr key={s.id} className="border-t border-line"><td className="px-4 py-2"><span className="flex items-center gap-1"><Input aria-label="از" type="number" className="w-14 text-center" value={s.from} onChange={(e) => set((x) => { x.slots[i].from = +e.target.value })} />تا<Input aria-label="تا" type="number" className="w-14 text-center" value={s.to} onChange={(e) => set((x) => { x.slots[i].to = +e.target.value })} /></span></td><td className="py-2 text-center"><Input aria-label="ظرفیت" type="number" className="mx-auto w-16 text-center" value={s.cap} onChange={(e) => set((x) => { x.slots[i].cap = +e.target.value })} /></td><td className="py-2 text-center">{cell(bt)}</td><td className="py-2 text-center">{cell(bm)}</td><td className="px-2"><button aria-label="حذف بازه" className="text-danger" onClick={() => set((x) => { x.slots.splice(i, 1) }, 'حذف بازهٔ ارسال')}><Trash2 size={14} /></button></td></tr> })}</tbody></table>
        </Card>
      </div>
      <Card title={<span className="flex items-center gap-2"><CalendarClock size={15} />شبیه‌ساز زمان تحویل</span>} className="h-fit lg:sticky lg:top-20">
        <Field label="ساعت ثبت سفارش"><Input type="time" className="ltr" value={t} onChange={(e) => setT(e.target.value)} /></Field>
        <div className="mt-3"><Segmented value={fast ? 'f' : 'n'} onChange={(v) => setFast(v === 'f')} options={[['f', 'ارسال سریع'], ['n', 'پیک روز و ساعت']]} /></div>
        <div className="mt-4 rounded-2xl bg-brand-tint p-4 text-center"><p className="text-12 text-t2">زمان تحویلی که به مشتری نشان داده می‌شود</p><p className="mt-1 text-18 font-bold text-brand">{sim.day} · {sim.label}</p></div>
        <p className="mt-2 text-12 text-t2">{sim.why}</p>
        <div className="mt-3 flex flex-wrap gap-1">{['00:00', '08:30', '12:00', '18:45', '19:30', '23:10'].map((x) => <button key={x} onClick={() => setT(x)} className="ltr rounded-full border border-line px-2 py-0.5 text-11 hover:border-brand">{x}</button>)}</div>
      </Card>
    </div>
    </div>
  )
}

export function PickupRules() {
  const d = useDB(); const P = d.delivery.pickup; const T = d.delivery.templates
  const set = (fn: (x: Delivery) => void, action?: string) => mutate((x) => fn(x.delivery), action ? { action, target: 'دریافت حضوری' } : undefined)
  const [test, setTest] = useState('')
  const preview = (tpl: string) => tpl.replace('{سفارش}', 'GH-10480').replace('{شعبه}', 'شعبهٔ ونک').replace('{زمان}', P.mode === 'window' ? `فردا ساعت ${fa(P.windowFrom)} تا ${fa(P.windowTo)}` : 'پس از همین پیامک').replace('{کد}', '۴۸۲۱').replace('{مهلت}', `${fa(P.holdDays)} روز`).replace('{مقصد}', 'کیف پول').replace('{تلفن}', '۰۲۱-۶۱۸۸۷۷۰۰').replace('{روش}', 'تحویل سریع')
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={<span className="flex items-center gap-2"><Store size={15} />قانون دریافت حضوری</span>}>
        <Field label="مشتری کی مراجعه کند؟"><Segmented value={P.mode} onChange={(v) => set((x) => { x.pickup.mode = v }, 'تغییر قانون مراجعهٔ حضوری')} options={[['after_sms', 'بعد از پیامک آماده‌شدن'], ['window', 'بازهٔ روز و ساعت مشخص'], ['call_first', 'اول تماس بگیرد']]} /></Field>
        <p className="mt-2 rounded-xl bg-neutral-bg px-3 py-2 text-12 text-t2">{P.mode === 'after_sms' ? 'طبق فایل طراحی: «آماده‌شدن سفارش در شعبه با پیامک اطلاع داده می‌شود؛ پیش از دریافت پیامک به شعبه مراجعه نکنید.»' : P.mode === 'window' ? 'در نتیجهٔ پرداخت و پیامک، «زمان مراجعه: روز … · ساعت … تا …» نمایش داده می‌شود.' : 'مشتری پیش از مراجعه تماس می‌گیرد تا سفارش آماده شود.'}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="زمان آماده‌سازی (ساعت)"><Input type="number" value={P.prepHours} onChange={(e) => set((x) => { x.pickup.prepHours = +e.target.value })} /></Field>
          <Field label="مهلت نگهداری در شعبه (روز)"><Input type="number" value={P.holdDays} onChange={(e) => set((x) => { x.pickup.holdDays = +e.target.value })} /></Field>
          {P.mode === 'window' && <><Field label="از ساعت"><Input type="number" value={P.windowFrom} onChange={(e) => set((x) => { x.pickup.windowFrom = +e.target.value })} /></Field><Field label="تا ساعت"><Input type="number" value={P.windowTo} onChange={(e) => set((x) => { x.pickup.windowTo = +e.target.value })} /></Field></>}
        </div>
        <Field label="اگر بخشی از کالاها در شعبه نبود"><Select value={P.partialStock} onChange={(v) => set((x) => { x.pickup.partialStock = v as Delivery['pickup']['partialStock'] }, 'تغییر قانون موجودی ناقص شعبه')} options={[['ask', 'از مشتری بپرس (طبق فیگما)'], ['ship_rest', 'موجودها در شعبه، بقیه ارسال شود'], ['wait_all', 'صبر تا همه در شعبه برسد']]} /></Field>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-line px-3 py-2 text-13">نمایش کد تحویل در نتیجهٔ پرداخت و پیامک<Toggle on={P.showCode} label="کد تحویل" onChange={(v) => set((x) => { x.pickup.showCode = v })} /></label>
      </Card>
      <Card title={<span className="flex items-center gap-2"><MessageSquareText size={15} />متن پیامک‌ها</span>}>
        {([['pickupReady', 'آماده‌شدن سفارش در شعبه'], ['pickupReminder', 'یادآوری مهلت'], ['pickupExpired', 'پایان مهلت و لغو'], ['callFirst', 'درخواست تماس پیش از مراجعه'], ['slotConfirmed', 'تأیید زمان ارسال']] as const).map(([k, l]) => <div key={k} className="mb-3"><Field label={l}><Textarea rows={2} value={T[k]} onChange={(e) => set((x) => { x.templates[k] = e.target.value })} /></Field><p className="mt-1 rounded-lg bg-neutral-bg px-2 py-1 text-11 text-t2">پیش‌نمایش: {preview(T[k])}</p></div>)}
        <div className="flex gap-2"><Input className="ltr text-left" placeholder="0912…" value={test} onChange={(e) => setTest(e.target.value)} /><Button disabled={!/^09\d{9}$/.test(test)} onClick={() => { sendSms(test, preview(T.pickupReady), 'آزمایش دریافت حضوری'); toast('پیامک آزمایشی ارسال شد.') }}>ارسال آزمایشی</Button></div>
      </Card>
    </div>
  )
}

export function SmsLog() {
  const d = useDB(); const [kind, setKind] = useState('all')
  const kinds = [...new Set(d.smsLog.map((m) => m.kind))]
  const rows = d.smsLog.filter((m) => kind === 'all' || m.kind === kind)
  return <DataTable name="گزارش پیامک‌ها" rows={rows} rowKey={(m) => m.id} empty={{ title: 'پیامکی ارسال نشده است.' }} search={(m) => `${m.to} ${m.text} ${m.ref}`}
    filters={<Select className="w-44" value={kind} onChange={setKind} options={[['all', 'همهٔ انواع'], ...kinds.map((k) => [k, k] as [string, string])]} />}
    cols={[{ key: 'k', title: 'نوع', render: (m) => <Badge dot={false}>{m.kind}</Badge> }, { key: 'to', title: 'گیرنده', render: (m) => <span className="ltr">{m.to}</span> }, { key: 'ref', title: 'مرجع', render: (m) => m.ref || '—' }, { key: 't', title: 'متن', wrap: true, render: (m) => <span className="text-12">{m.text}</span> }, { key: 's', title: 'وضعیت', render: (m) => <Badge tone={m.status === 'تحویل شد' ? 'success' : 'danger'}>{m.status}</Badge> }, { key: 'at', title: 'زمان', render: (m) => <span className="text-12 text-t2">{rel(m.at)}</span>, sort: (m) => m.at }]}
    actions={(m) => [{ label: 'ارسال دوباره', onClick: () => { sendSms(m.to, m.text, m.kind, m.ref, m.customerId); toast('دوباره ارسال شد.') } }]} />
}

/** نمایش سادهٔ یک روز: از کی تا کی سفارش «همان روز» می‌رسد، بازه‌ها و ظرفیتشان، و از کی به بعد به فردا می‌رود */
function DayTimeline({ D }: { D: Delivery }) {
  const H0 = 7, H1 = 24; const W = (h: number) => `${((h - H0) / (H1 - H0)) * 100}%`
  const now = new Date().getHours() + new Date().getMinutes() / 60
  return (
    <Card title="روز ارسال به زبان ساده">
      <ol className="mb-4 grid gap-2 text-13 sm:grid-cols-3">
        <li className="rounded-xl bg-success-bg/70 p-3"><b className="block text-success">۱. تحویل سریع همان روز</b>سفارش بین ساعت {hh(D.openHour)} و {hh(D.fastCutoff)} ثبت شود، حداکثر {fa(D.fastHours)} ساعت بعد می‌رسد.</li>
        <li className="rounded-xl bg-brand-tint/70 p-3"><b className="block text-brand">۲. بازهٔ انتخابی</b>مشتری یکی از بازه‌های ۲ ساعته را برای امروز (اگر جا داشته باشد) یا روزهای بعد انتخاب می‌کند. هر بازه ظرفیت مشخص دارد.</li>
        <li className="rounded-xl bg-warning-bg/70 p-3"><b className="block text-warning">۳. بعد از ساعت {hh(D.nightAfter)}</b>سفارش شب (مثلا ساعت ۱۲) خودکار برای فردا اولین بازه ({hh(D.slots[0]?.from ?? 8)} تا {hh(D.slots[0]?.to ?? 10)}) زمان‌بندی می‌شود. {D.closedDays.length ? `${D.closedDays.join('، ')} ارسال نداریم.` : ''}</li>
      </ol>
      <div className="relative h-24 rounded-xl bg-neutral-bg" aria-label="خط زمانی یک روز">
        <span className="absolute inset-y-0 rounded-r-xl bg-success/15" style={{ right: W(D.openHour), width: `calc(${W(D.fastCutoff)} - ${W(D.openHour)})` }} title="بازهٔ ثبت تحویل سریع همان روز" />
        <span className="absolute inset-y-0 bg-warning/15" style={{ right: W(D.nightAfter), left: 0 }} title="سفارش‌های این ساعت‌ها به فردا می‌روند" />
        {D.slots.map((sl) => { const b = D.booked[`today:${sl.id}`] ?? 0; const full = b >= sl.cap; return <span key={sl.id} className={cx('absolute top-8 flex h-9 flex-col items-center justify-center rounded-lg border text-[10px] leading-tight', full ? 'border-danger/40 bg-danger-bg text-danger' : 'border-brand/30 bg-surface text-t1')} style={{ right: `calc(${W(sl.from)} + 2px)`, width: `calc(${W(sl.to)} - ${W(sl.from)} - 4px)` }}><b>{hh(sl.from)}–{hh(sl.to)}</b><span>{full ? 'پر' : `${fa(b)}/${fa(sl.cap)}`}</span></span> })}
        <span className="absolute top-1 text-[10px] font-semibold text-success" style={{ right: `calc(${W(D.openHour)} + 4px)` }}>ثبت تحویل سریع</span>
        <span className="absolute top-1 text-[10px] font-semibold text-warning" style={{ right: `calc(${W(D.nightAfter)} + 4px)` }}>به فردا</span>
        {now >= H0 && now <= H1 && <span className="absolute inset-y-0 w-0.5 bg-danger" style={{ right: W(now) }}><span className="absolute -top-1 -right-1.5 size-3.5 rounded-full border-2 border-white bg-danger" /></span>}
        {[8, 10, 12, 14, 16, 18, 20, 22].map((h) => <span key={h} className="absolute bottom-0.5 -translate-x-1/2 text-[10px] text-t2" style={{ right: W(h) }}>{fa(h)}</span>)}
      </div>
      <p className="mt-2 text-11 text-t2">خط قرمز ساعت فعلی است. عدد هر بازه یعنی چند سفارش امروز در آن بازه رزرو شده از چند ظرفیت. همهٔ این عددها پایین همین صفحه قابل تغییرند.</p>
    </Card>
  )
}
