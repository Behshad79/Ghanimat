// برگشت موجودی پس از لغو دستی: به انتخاب ما کالا دوباره در سایت قابل فروش شود یا موجودی تغییر نکند
import { Field, Segmented } from '@/shared/ui/base'
import type { DB, Order } from '@/shared/data/seed'

export type RestockMode = 'site' | 'hold'
type Item = Order['shipments'][number]['items'][number]
/** اعمال انتخاب روی اقلام لغوشده؛ برای کالای سریال‌دار وضعیت واحد و برای کالای تعدادی موجودی همان انبار */
export function applyRestock(x: DB, items: { it: Item; warehouse: string }[], mode: RestockMode) {
  items.forEach(({ it, warehouse }) => {
    if (it.unitId) { const u = x.units.find((y) => y.id === it.unitId); if (u && ['unit.reserved', 'unit.sold'].includes(u.status)) u.status = mode === 'site' ? 'unit.published' : 'unit.ready' }
    else if (mode === 'site') { const p = x.products.find((y) => y.id === it.productId); if (p?.qty) (p.qty as Record<string, number>)[warehouse] = ((p.qty as Record<string, number>)[warehouse] ?? 0) + (Number(it.qty) || 1) }
  })
}
export const restockLabel = (m: RestockMode) => (m === 'site' ? 'موجودی به سایت برگشت' : 'موجودی سایت تغییر نکرد')

export function RestockChoice({ value, onChange }: { value: RestockMode; onChange: (v: RestockMode) => void }) {
  return <Field label="موجودی کالاهای لغوشده" help={value === 'site' ? 'کالا همین حالا دوباره در سایت قابل خرید می‌شود (واحد سریال‌دار «منتشرشده» می‌شود).' : 'موجودی سایت اضافه نمی‌شود؛ مثلاً کالا معیوب است، گم شده یا باید بررسی شود. واحد سریال‌دار به «آمادهٔ انتشار» می‌رود تا بعداً خودتان منتشرش کنید.'}>
    <Segmented value={value} onChange={onChange} options={[['site', 'به موجودی سایت برگردد'], ['hold', 'موجودی تغییر نکند']]} />
  </Field>
}
