import { useEffect, useState } from 'react'
import { Check, ImagePlus, Star } from 'lucide-react'
import { Badge, Button, Card, cx, Input } from '@/shared/ui/base'
import { toast } from '@/shared/ui/overlay'
import { fakeCall, mutate, useDB } from '@/shared/lib/store'
import { fileToImage } from '@/shared/lib/image'
import { fa } from '@/shared/lib/fa'

export type ExtReview = { id: string; author: string; rating: number; text: string; textFa: string; date: string; country: string; verified: boolean; show: boolean }
const SAMPLE: Omit<ExtReview, 'show'>[] = [
  { id: 'ar1', author: 'Mike R.', rating: 5, text: 'Battery easily lasts a full workday. Screen is gorgeous.', textFa: 'باتری راحت یک روز کاری کامل دوام می‌آورد. صفحه‌نمایش فوق‌العاده است.', date: '2026-08-14', country: 'آمریکا', verified: true },
  { id: 'ar2', author: 'Sara K.', rating: 4, text: 'Great tablet, but the charger is sold separately.', textFa: 'تبلت عالی است، ولی شارژر جدا فروخته می‌شود.', date: '2026-07-02', country: 'امارات', verified: true },
  { id: 'ar3', author: 'J. Chen', rating: 2, text: 'Mine arrived with a scratch on the back.', textFa: 'مال من با یک خط روی پشت دستگاه رسید.', date: '2026-06-21', country: 'آمریکا', verified: false },
  { id: 'ar4', author: 'Ahmed', rating: 5, text: 'Fast, light and perfect for note-taking with the pencil.', textFa: 'سریع، سبک و برای یادداشت‌برداری با قلم عالی است.', date: '2026-05-30', country: 'عربستان', verified: true },
]

/** انتخاب تصاویر استخراج‌شده از منبع، به‌اضافهٔ عکس‌های خودتان */
export function ImagePicker({ value, onChange, source }: { value: string[]; onChange: (v: string[]) => void; source: string[] }) {
  const all = [...new Set([...source, ...value])]
  return <Card title="تصاویر استخراج‌شده" actions={<span className="flex gap-2 text-12"><button className="text-brand" onClick={() => onChange(all)}>همه</button><button className="text-t2" onClick={() => onChange([])}>هیچ‌کدام</button></span>}>
    <p className="-mt-1 mb-3 text-12 text-t2">کدام عکس‌ها اضافه شود؟ اولین انتخاب، عکس اصلی است. عکس منبع «تصویر مدل» است؛ برای استوک و جعبه‌باز عکس واقعی واحد جدا لازم است.</p>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{all.map((src) => { const i = value.indexOf(src); return <button key={src} type="button" onClick={() => onChange(i >= 0 ? value.filter((x) => x !== src) : [...value, src])} className={cx('relative aspect-square overflow-hidden rounded-xl border-2 bg-[#f5f6fa]', i >= 0 ? 'border-brand' : 'border-transparent opacity-60')}>
      <img src={src} alt="" className="size-full object-contain" />{i >= 0 && <span className="tnum absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-brand-solid text-11 font-bold text-white">{i === 0 ? 'اصلی' : fa(i + 1)}</span>}{i < 0 && <span className="absolute inset-0 grid place-items-center text-11 text-t2">انتخاب</span>}</button> })}
      <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-12 text-t2 hover:border-brand"><span className="flex flex-col items-center gap-1"><ImagePlus size={18} />عکس خودم</span><input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const files = [...(e.target.files ?? [])]; const imgs = await Promise.all(files.map((f) => fileToImage(f))); onChange([...value, ...imgs]) }} /></label></div>
    <p className="mt-2 text-11 text-t2">{fa(value.length)} عکس انتخاب شده</p>
  </Card>
}

/** خواندن نظرات آمازون از لینک (اختیاری) و افزودن انتخاب‌ها به کالا با برچسب «نظرات آمازون» */
export function AmazonReviews({ pid, initialUrl = '', onPicked }: { pid?: string; initialUrl?: string; onPicked?: (r: ExtReview[]) => void }) {
  const d = useDB(); const [url, setUrl] = useState(initialUrl); const [busy, setBusy] = useState(false); const [list, setList] = useState<Omit<ExtReview, 'show'>[] | null>(null); const [pick, setPick] = useState<string[]>([])
  const saved = pid ? (d.extReviews?.[pid] ?? []) : []
  useEffect(() => { if (!pid && list) onPicked?.(list.filter((r) => pick.includes(r.id)).map((r) => ({ ...r, show: true }))) }, [pick, list]) // eslint-disable-line react-hooks/exhaustive-deps
  const read = async () => { if (!/amazon|^B0\w{8}$/i.test(url.trim())) return toast('لینک صفحهٔ کالا در آمازون یا ASIN را وارد کنید.', { tone: 'err' }); setBusy(true); try { await fakeCall(true, 900); setList(SAMPLE); setPick(SAMPLE.filter((r) => r.rating >= 4 && r.verified).map((r) => r.id)) } catch { toast('آمازون پاسخ نداد؛ کمی بعد دوباره تلاش کنید.', { tone: 'err' }) } setBusy(false) }
  return <Card title={<span className="flex items-center gap-2">نظرات آمازون<Badge dot={false}>اختیاری</Badge></span>}>
    <div className="flex gap-2"><Input className="ltr flex-1 text-left font-mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.amazon.com/dp/… یا ASIN" /><Button loading={busy} onClick={read}>خواندن نظرات</Button></div>
    {list && <><p className="mt-3 mb-2 text-12 text-t2">کدام نظرها در صفحهٔ کالا زیر عنوان «نظرات آمازون» نمایش داده شود؟ ترجمه قابل ویرایش است. نظر منفی را هم برای اعتماد بیشتر می‌توانید نگه دارید.</p>
      <ul className="space-y-2">{list.map((r) => { const on = pick.includes(r.id); return <li key={r.id}><button type="button" onClick={() => setPick(on ? pick.filter((x) => x !== r.id) : [...pick, r.id])} className={cx('w-full rounded-xl border p-3 text-right text-13', on ? 'border-brand bg-brand-tint/40' : 'border-line')}>
        <span className="flex items-center gap-2 text-12"><span className={cx('grid size-5 place-items-center rounded border', on ? 'border-transparent bg-brand-solid text-white' : 'border-line')}>{on && <Check size={12} />}</span><b className="ltr">{r.author}</b><span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < r.rating ? 'fill-[#ffc24b] text-[#ffc24b]' : 'text-line'} />)}</span><span className="text-t3">{r.country}</span>{r.verified && <Badge tone="success" dot={false}>خرید تأییدشده آمازون</Badge>}</span>
        <span className="mt-1 block">{r.textFa}</span><span className="ltr mt-0.5 block text-left text-11 text-t3">{r.text}</span></button></li> })}</ul>
      {pid ? <Button className="mt-3" variant="primary" disabled={!pick.length} onClick={() => { mutate((x) => { x.extReviews = x.extReviews ?? {}; x.extReviews[pid] = [...(x.extReviews[pid] ?? []).filter((y) => !pick.includes(y.id)), ...list.filter((r) => pick.includes(r.id)).map((r) => ({ ...r, show: true }))] }, { action: 'افزودن نظرات آمازون به کالا', target: pid, after: `${pick.length} نظر` }); toast(`${fa(pick.length)} نظر با برچسب «نظرات آمازون» اضافه شد.`) }}>افزودن {fa(pick.length)} نظر به کالا</Button>
        : <p className="mt-2 text-11 text-t2">نظرهای انتخاب‌شده با ذخیرهٔ پیش‌نویس به کالا اضافه می‌شوند.</p>}</>}
    {saved.length > 0 && <p className="mt-3 text-12 text-t2">این کالا الان {fa(saved.filter((x) => x.show).length)} نظر آمازون در صفحه دارد.</p>}
  </Card>
}
export const AMZ_SAMPLE = SAMPLE
