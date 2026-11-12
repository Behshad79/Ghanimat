import { Mail, Split as SplitIcon, Truck, Zap } from 'lucide-react'
import { Badge, Card, cx, Field, Select, Toggle } from '@/shared/ui/base'
import { mutate, useDB } from '@/shared/lib/store'
import { fa, toman } from '@/shared/lib/fa'
import { st, WAREHOUSE } from '@/shared/data/statuses'
import type { Order } from '@/shared/data/seed'

const fast = (m: string) => /سریع|پیک|اسنپ/.test(m)
const dot: Record<string, string> = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info', brand: 'bg-brand', neutral: 'bg-t3' }

/** چیپ هر مرسوله در فهرست سفارش‌ها: انبار، روش و وضعیت؛ سفارش چندمرسوله‌ای برچسب جدا دارد */
export function ShipChips({ o }: { o: Order }) {
  if (!o.shipments.length) return <span className="text-12 text-t3">—</span>
  return (
    <span className="flex flex-col gap-1">
      {o.shipments.length > 1 && <span className="w-fit rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold text-brand">{fa(o.shipments.length)} مرسوله</span>}
      {o.shipments.map((s) => <span key={s.id} className="flex items-center gap-1.5 whitespace-nowrap text-12"><span className={cx('size-1.5 shrink-0 rounded-full', dot[st(s.status).tone] ?? 'bg-t3')} title={st(s.status).label} />{fast(s.method) ? <Zap size={12} className="text-brand" /> : <Mail size={12} className="text-t2" />}<span className="text-t2">{WAREHOUSE[s.warehouse]}</span><span>·</span><span>{s.method}</span></span>)}
    </span>
  )
}

/** توضیح سفارش چندمرسوله‌ای در صفحهٔ سفارش: چرا تقسیم شد، هر مرسوله از کجا و با چه روشی و چه زمانی می‌رسد */
export function SplitBanner({ o }: { o: Order }) {
  const d = useDB(); const R = d.delivery.split
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-tint/50 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-14 font-semibold"><SplitIcon size={16} className="text-brand" />این سفارش در {fa(o.shipments.length)} مرسولهٔ جدا ارسال می‌شود</p>
      <p className="mb-3 text-12 leading-5 text-t2">اقلام سبد در انبارهای مختلف بودند. اقلام انبار تهران {R.consolidate ? 'و اقلامی که امکان انتقال داشتند' : ''} با روش انتخابی مشتری، و اقلام انبار مهاباد با {R.remoteMethod} ارسال می‌شوند. مشتری هر مرسوله را جدا در «سفارش‌های جاری» پیگیری می‌کند و برای هر کدام پیامک جدا می‌گیرد.</p>
      <ol className="grid gap-2 sm:grid-cols-2">{o.shipments.map((s, i) => <li key={s.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-2.5 text-12">
        <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-white', fast(s.method) ? 'bg-brand-solid' : 'bg-[#10123d]')}>{fast(s.method) ? <Zap size={14} /> : <Truck size={14} />}</span>
        <span className="min-w-0 flex-1"><b className="block">مرسولهٔ {fa(i + 1)} · {WAREHOUSE[s.warehouse]}</b><span className="text-t2">{s.method} · {fa(s.items.reduce((a, x) => a + Number(x.qty), 0))} قلم · {fast(s.method) ? 'همان روز' : '۲ تا ۵ روز کاری'}</span></span>
        <Badge tone={st(s.status).tone as 'info'}>{st(s.status).label}</Badge></li>)}</ol>
      <p className="mt-2 text-11 text-t2">هزینهٔ ارسال: {R.fee === 'both' ? 'هر مرسوله جدا محاسبه شده' : R.fee === 'first' ? 'فقط مرسولهٔ اول؛ دومی رایگان' : 'گران‌ترین روش، یک بار'} · {toman(o.shipments.reduce((a, s) => a + (s.shipFee ?? 0), 0))}</p>
    </div>
  )
}

/** قانون تقسیم سبد چندانباره در تنظیمات ارسال */
export function SplitRules() {
  const d = useDB(); const R = d.delivery.split
  const set = (patch: Partial<typeof R>, action: string) => mutate((x) => { Object.assign(x.delivery.split, patch) }, { action, target: 'تقسیم سبد چندانباره' })
  return (
    <Card title={<span className="flex items-center gap-1.5"><SplitIcon size={15} />سبدی که از چند انبار است</span>}>
      <p className="mb-3 text-12 leading-5 text-t2">اگر سبد هم کالای انبار تهران داشته باشد هم انبار مهاباد، سفارش خودکار به چند مرسوله تقسیم می‌شود. مشتری در صفحهٔ پرداخت هر مرسوله را با روش و زمان رسیدنش جدا می‌بیند.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="روش ارسال اقلام انبار مهاباد"><Select value={R.remoteMethod} onChange={(v) => set({ remoteMethod: v }, 'تغییر روش ارسال انبار مهاباد')} options={['پست پیشتاز', 'تیپاکس', 'باربری']} /></Field>
        <Field label="هزینهٔ ارسال سفارش چندمرسوله‌ای"><Select value={R.fee} onChange={(v) => set({ fee: v as typeof R.fee }, 'تغییر هزینهٔ ارسال چندمرسوله‌ای')} options={[['both', 'هر مرسوله جدا'], ['first', 'فقط مرسولهٔ اول'], ['max', 'گران‌ترین روش، یک بار']]} /></Field>
      </div>
      <div className="mt-3 space-y-2 text-12">
        <Toggle on={R.consolidate} onChange={(v) => set({ consolidate: v }, 'تغییر تجمیع در انبار تهران')} text="اگر مشتری صبر کند، اقلام مهاباد به تهران منتقل و یکجا ارسال شود (گزینه در صفحهٔ پرداخت)" />
        <Toggle on={R.notify} onChange={(v) => set({ notify: v }, 'تغییر پیامک چندمرسوله‌ای')} text="برای هر مرسوله پیامک و کد رهگیری جدا" />
      </div>
    </Card>
  )
}
