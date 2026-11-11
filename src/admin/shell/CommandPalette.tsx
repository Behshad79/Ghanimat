import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { NAV } from './nav'
import { can, resetDB, setSession, useDB, useSession } from '@/shared/lib/store'
import { cx, Kbd } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'

type Item = { group: string; label: string; sub?: string; run: () => void }
/** جست‌وجوی سراسری و اجرای دستور (⌘K). متن آزاد مثل «GH-10481» یا «0912…» مستقیم به رکورد می‌رود (Smart Paste). */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate(); const d = useDB(); const s = useSession()
  const [q, setQ] = useState(''); const [i, setI] = useState(0)
  useEffect(() => { if (open) { setQ(''); setI(0) } }, [open])
  const items = useMemo<Item[]>(() => {
    const go = (p: string) => () => { nav(p); onClose() }
    const all: Item[] = [
      ...NAV.filter((n) => can(n.id, s)).map((n) => ({ group: 'صفحه‌ها', label: n.label, run: go(n.path) })),
      ...d.orders.map((o) => ({ group: 'سفارش', label: o.id, sub: d.customers.find((c) => c.id === o.customerId)?.name, run: go(`/admin/orders/${o.id}`) })),
      ...d.customers.map((c) => ({ group: 'مشتری', label: c.name, sub: c.mobile.slice(0, 4) + '•••', run: go(`/admin/customers?c=${c.id}`) })),
      ...d.products.map((p) => ({ group: 'محصول', label: p.title, sub: `${p.en} · ${p.code ?? ''}${p.ean ? ` · ${p.ean}` : ''}`, run: go(`/admin/catalog/${p.id}`) })),
      { group: 'دستور', label: 'افزودن کالا (ثبت دستی)', run: go('/admin/catalog/new') },
      { group: 'دستور', label: 'چاپ برچسب کالا', run: go('/admin/labels') },
      ...d.units.map((u) => ({ group: 'واحد', label: u.code ?? u.id, sub: `سریال ${u.serial}${u.ean ? ` · ${u.ean}` : ''}`, run: go(`/admin/catalog/unit/${u.id}`) })),
      ...d.tickets.map((t) => ({ group: 'تیکت', label: t.id, sub: t.subject, run: go(`/admin/support?t=${t.id}`) })),
      ...d.codes.map((c) => ({ group: 'کد تخفیف', label: c.id, sub: c.value, run: go('/admin/pricing?tab=codes') })),
      { group: 'دستور', label: 'ساخت کد تخفیف', run: go('/admin/pricing?tab=codes&new=1') },
      { group: 'دستور', label: 'واردکردن محصول از لینک', run: go('/admin/catalog/import') },
      { group: 'دستور', label: s.theme === 'dark' ? 'تم روشن' : 'تم تیره', run: () => { setSession({ theme: s.theme === 'dark' ? 'light' : 'dark' }); onClose() } },
      { group: 'دستور', label: 'بازنشانی دادهٔ نمونه', run: () => { resetDB(); toast('دادهٔ نمونه به حالت اول برگشت.'); onClose() } },
    ]
    const k = q.trim().toLowerCase()
    return (k ? all.filter((x) => `${x.label} ${x.sub ?? ''}`.toLowerCase().includes(k)) : all.filter((x) => ['صفحه‌ها', 'دستور'].includes(x.group))).slice(0, 14)
  }, [q, d, s])
  if (!open) return null
  const paste = /snapp|box/i.test(q) ? 'لینک اسنپ‌باکس تشخیص داده شد. آن را در کارت مرسولهٔ سفارش بچسبانید تا پیک ثبت شود.' : /^\d{20,24}$/.test(q.trim()) ? 'کد رهگیری پست تشخیص داده شد. در «ارسال › الحاق رهگیری» ثبت می‌شود.' : null
  return (
    <div className="anim-fade fixed inset-0 z-[70] bg-[#10123d]/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="anim-pop mx-auto max-w-xl overflow-hidden rounded-lg bg-surface shadow-float">
        <div className="flex items-center gap-2 border-b border-line px-4"><Search size={16} className="text-t3" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} placeholder="سفارش، مشتری، کالا، سریال، تیکت یا دستور…"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, items.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)) } if (e.key === 'Enter') items[i]?.run(); if (e.key === 'Escape') onClose() }}
            className="h-12 flex-1 bg-transparent text-14 outline-none placeholder:text-t3" /><Kbd>Esc</Kbd></div>
        {paste && <p className="border-b border-line bg-brand-tint px-4 py-2 text-12 text-brand">{paste}</p>}
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-13 text-t2">چیزی پیدا نشد. شمارهٔ سفارش، نام مشتری یا سریال را امتحان کنید.</li>}
          {items.map((x, idx) => (
            <li key={x.group + x.label}><button onMouseEnter={() => setI(idx)} onClick={x.run} className={cx('flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-right text-13', idx === i && 'bg-brand-tint')}>
              <span className="min-w-0 truncate"><span className="ml-2 text-11 text-t3">{x.group}</span>{x.label}{x.sub && <span className="mr-2 text-12 text-t3">{x.sub}</span>}</span>{idx === i && <CornerDownLeft size={13} className="text-brand" />}
            </button></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
