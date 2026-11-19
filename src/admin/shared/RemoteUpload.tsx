import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Loader2, QrCode, Smartphone } from 'lucide-react'
import { Badge, Button, copyText, cx } from '@/shared/ui/base'
import { Modal, toast } from '@/shared/ui/overlay'
import { QR } from '@/shared/ui/codes'
import { BrandLogo } from '@/shared/ui/brandLogo'
import { getDB, mutate } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'

/**
 * بارگذاری از گوشی و فضای ابری:
 * - «از گوشی»: QR یک‌بارمصرف (۳۰ دقیقه، فقط برای همین مقصد) صفحهٔ بارگذاری موبایل را باز می‌کند؛ از دوربین، گالری،
 *   iCloud Photos / iCloud Drive (در آیفون) یا Google Photos / Files (در اندروید) انتخاب می‌شود و عکس‌ها همین‌جا ظاهر می‌شوند.
 * - Google Drive و OneDrive با پنجرهٔ انتخاب فایل خود آن سرویس (بعد از اتصال حساب در «یکپارچه‌سازی‌ها»).
 * در این نسخهٔ نمایشی، رسیدن عکس از گوشی با دکمهٔ «شبیه‌سازی» نشان داده می‌شود.
 */
export function RemoteUpload({ target, label, sample, onReceive, compact }: { target: string; label: string; sample?: string[]; onReceive: (srcs: string[], source: string) => void; compact?: boolean }) {
  const nav = useNavigate(); const [phone, setPhone] = useState(false); const [cloud, setCloud] = useState(false)
  const token = useMemo(() => Math.random().toString(36).slice(2, 10), [phone])
  const url = `https://ghanimat.ir/m/u/${token}?to=${encodeURIComponent(target)}`
  const [left, setLeft] = useState(1800); const [got, setGot] = useState(0)
  useEffect(() => { if (!phone) return; setLeft(1800); setGot(0); const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t) }, [phone])
  const conn = (k: string) => !!(getDB() as unknown as { cloudLinks?: Record<string, boolean> }).cloudLinks?.[k]
  const simulate = () => { const pool = sample?.length ? sample : ['./products/p1-500.webp']; const pick = [pool[got % pool.length]]; onReceive(pick, 'گوشی'); setGot((n) => n + pick.length); toast(`${fa(pick.length)} عکس از گوشی رسید و اضافه شد.`) }
  return (
    <>
      <span className={cx('flex flex-wrap gap-1.5', compact && 'flex-col')}>
        <Button size="sm" variant="ghost" icon={<Smartphone size={13} />} onClick={() => setPhone(true)}>از گوشی</Button>
        <Button size="sm" variant="ghost" icon={<Cloud size={13} />} onClick={() => setCloud(true)}>از فضای ابری</Button>
      </span>
      <Modal open={phone} onClose={() => setPhone(false)} title={<span className="flex items-center gap-1.5"><QrCode size={15} />بارگذاری از گوشی · {label}</span>}>
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="flex flex-col items-center gap-2"><QR value={url} size={140} /><button type="button" className="text-11 text-brand underline" onClick={() => { copyText(url); toast('لینک کپی شد؛ می‌توانید در پیام‌رسان برای خودتان بفرستید.') }}>کپی لینک</button></div>
          <div className="space-y-2 text-13">
            <ol className="list-decimal space-y-1 pr-4 text-12 leading-6">
              <li>با دوربین گوشی کد را اسکن کنید (ورود لازم نیست؛ لینک فقط برای همین {label} است).</li>
              <li>«گرفتن عکس» یا «انتخاب از گالری» را بزنید. در آیفون گالری شامل <b>iCloud Photos</b> و «Files» شامل <b>iCloud Drive</b> هم هست؛ در اندروید <b>Google Photos</b> و Drive.</li>
              <li>عکس‌ها خودکار کم‌حجم و همین‌جا اضافه می‌شوند؛ صفحه را ببندید یا عکس بعدی را بفرستید.</li>
            </ol>
            <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-12"><Loader2 size={14} className="animate-spin text-brand" />در انتظار عکس از گوشی… {got > 0 && <Badge tone="success">{fa(got)} عکس رسید</Badge>}<span className="mr-auto tnum text-t3">اعتبار {fa(Math.floor(left / 60))}:{fa(String(left % 60).padStart(2, '0'))}</span></p>
            <Button size="sm" onClick={simulate}>شبیه‌سازی رسیدن عکس از گوشی (نسخهٔ نمایشی)</Button>
            <p className="text-11 text-t3">بهتر از این: پنل را روی گوشی «افزودن به صفحهٔ اصلی» کنید؛ بعد از گالری هر عکسی را با «اشتراک‌گذاری ← غنیمت» مستقیم به سفارش یا کتابخانهٔ رسانه بفرستید.</p>
          </div>
        </div>
      </Modal>
      <Modal open={cloud} onClose={() => setCloud(false)} title={<span className="flex items-center gap-1.5"><Cloud size={15} />انتخاب از فضای ابری · {label}</span>}>
        <ul className="space-y-2">{([['gdrive', 'Google Drive', 'پنجرهٔ انتخاب فایل خود گوگل باز می‌شود؛ فقط فایل‌هایی که انتخاب کنید دیده می‌شوند.'], ['onedrive', 'OneDrive', 'با حساب مایکروسافت؛ پوشه‌ها و عکس‌های OneDrive و SharePoint.'], ['icloud', 'iCloud', 'اپل برای وب سرویس انتخاب فایل ندارد؛ از «از گوشی» استفاده کنید. در آیفون گالری و Files همان iCloud Photos و iCloud Drive است.']] as const).map(([k, n, desc]) => {
          const ok = k !== 'icloud' && conn(k)
          return <li key={k} className="flex items-start gap-3 rounded-xl border border-line p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2"><BrandLogo name={n} size={22} /></span><span className="flex-1"><b className="flex items-center gap-2 text-13">{n}{k !== 'icloud' && (ok ? <Badge tone="success">متصل</Badge> : <Badge>متصل نیست</Badge>)}</b><span className="text-12 text-t2">{desc}</span></span>
            {k === 'icloud' ? <Button size="sm" onClick={() => { setCloud(false); setPhone(true) }}>از گوشی</Button>
              : ok ? <Button size="sm" variant="primary" onClick={() => { onReceive(sample?.slice(0, 1) ?? [], n); setCloud(false); toast(`یک عکس از ${n} اضافه شد.`) }}>انتخاب فایل</Button>
              : <Button size="sm" onClick={() => { mutate((x) => { ((x as unknown as { cloudLinks?: Record<string, boolean> }).cloudLinks ??= {})[k] = true }, { action: `اتصال ${n} برای بارگذاری عکس`, target: n }); toast(`${n} متصل شد (نمایشی). در نسخهٔ نهایی ورود با حساب و اجازهٔ «فقط فایل‌های انتخاب‌شده» گرفته می‌شود.`) }}>اتصال حساب</Button>}</li> })}</ul>
        <p className="mt-3 text-11 text-t2">اتصال‌ها در <button type="button" className="text-brand underline" onClick={() => nav('/admin/integrations')}>یکپارچه‌سازی‌ها</button> هم مدیریت می‌شود. دسترسی فقط به فایل‌هایی است که خودتان انتخاب می‌کنید.</p>
      </Modal>
    </>
  )
}
