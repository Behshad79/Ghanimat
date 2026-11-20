import { confirm } from '@/shared/ui/overlay'
import { currentUser, getDB, myParty, notify } from '@/shared/lib/store'

/** انبارهایی که «مال من» است: انبارهایی که گردانندهٔ آن‌ها همان طرفِ کاربر فعلی است (بهشاد و دستیارش: تهران؛ یاسین: مهاباد) */
export const myWarehouses = () => { const d = getDB(); const p = myParty(); return (d.stock?.warehouses ?? []).filter((w) => w.operator === p).map((w) => w.id) }

/** پیش از اقدام روی مرسولهٔ انبار دیگر هشدار می‌دهد؛ اگر کاربر تأیید کند انجام می‌شود و گردانندهٔ آن انبار خبردار می‌شود */
export async function guardForeign(warehouse: string, action: string, ref: string) {
  const mine = myWarehouses(); if (!mine.length || mine.includes(warehouse)) return true
  const d = getDB(); const w = d.stock.warehouses.find((x) => x.id === warehouse); const op = d.stock.parties.find((p) => p.id === w?.operator)
  const ok = await confirm({ title: `این مرسوله مال ${w?.name ?? warehouse} است، نه شما`, body: <>ارسال <b>{ref}</b> با <b>{op?.name ?? 'انبار دیگر'}</b> است. اگر «{action}» را انجام دهید، به نام شما ({currentUser()?.name}) ثبت می‌شود و {op?.name ?? 'گردانندهٔ آن انبار'} با اعلان خبردار می‌شود. معمولاً این کار را خود او انجام می‌دهد؛ مطمئن هستید؟</>, confirm: 'بله، انجام بده', danger: true })
  if (ok) notify(`اقدام روی مرسولهٔ ${w?.name ?? warehouse}`, `${currentUser()?.name ?? 'کاربر'} «${action}» را روی ${ref} انجام داد.`, `/admin/orders/${ref.split('-').slice(0, 2).join('-')}`, 'عملیات', 'warning')
  return ok
}
