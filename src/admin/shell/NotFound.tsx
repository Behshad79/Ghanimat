// صفحهٔ «پیدا نشد» داخل پنل: نشانی اشتباه به‌جای رفتن بی‌صدا به خانه، توضیح و راه‌های رسیدن به مقصد را نشان می‌دهد
import { useLocation, useNavigate } from 'react-router-dom'
import { Compass, Search } from 'lucide-react'
import { Button, Card } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { can, useSession } from '@/shared/lib/store'
import { NAV } from './nav'

export function NotFound() {
  const loc = useLocation(); const nav = useNavigate(); const s = useSession()
  const words = loc.pathname.split('/').filter(Boolean).slice(1).join(' ')
  const near = NAV.filter((n) => can(n.id, s)).filter((n) => words && (n.path.includes(words.split(' ')[0]) || n.label.includes(words))).slice(0, 4)
  const pins = NAV.filter((n) => s.pinned.includes(n.id) && can(n.id, s)).slice(0, 4)
  return <Page title="این صفحه پیدا نشد">
    <Card><div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brand-tint text-brand"><Compass size={26} /></span>
      <p className="text-16 font-semibold">نشانی <span className="ltr font-mono text-13">{loc.pathname}</span> در پنل وجود ندارد.</p>
      <p className="max-w-md text-13 text-t2">ممکن است لینک قدیمی باشد یا بخش جابه‌جا شده باشد. از گزینه‌های زیر یا جست‌وجوی سراسری (Ctrl+K) استفاده کنید.</p>
      <div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={() => nav('/admin')}>رفتن به خانه</Button><Button icon={<Search size={14} />} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>جست‌وجوی سراسری</Button><Button variant="ghost" onClick={() => nav(-1)}>بازگشت</Button></div>
      {[...near, ...pins].length > 0 && <div className="mt-2 flex flex-wrap justify-center gap-2">{[...new Map([...near, ...pins].map((n) => [n.id, n])).values()].map((n) => <button key={n.id} onClick={() => nav(n.path)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-12 hover:border-brand hover:text-brand"><n.icon size={13} />{n.label}</button>)}</div>}
    </div></Card>
  </Page>
}
