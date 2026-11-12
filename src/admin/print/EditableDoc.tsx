import { useRef, useState, type ReactNode } from 'react'
import { Pencil, RotateCcw, Save } from 'lucide-react'
import { Badge, Button } from '@/shared/ui/base'
import { confirm, toast } from '@/shared/ui/overlay'
import { mutate, useDB } from '@/shared/lib/store'
import { rel } from '@/shared/lib/fa'

/** ویرایش دستی هر سند چاپی: روی هر متن سند کلیک کنید و تغییر دهید؛ نسخهٔ ویرایش‌شده برای همان سند ذخیره و در لاگ ثبت می‌شود */
export function EditableDoc({ docKey, label, children }: { docKey: string; label: string; children: ReactNode }) {
  const d = useDB(); const ov = d.docOverrides[docKey]; const [edit, setEdit] = useState(false); const box = useRef<HTMLDivElement>(null)
  const save = () => { const html = box.current?.innerHTML ?? ''; mutate((x) => { x.docOverrides[docKey] = { html, at: new Date().toISOString() } }, { action: 'ویرایش دستی سند', target: `${label} · ${docKey.split(':')[1]}` }); setEdit(false); toast('نسخهٔ دستی این سند ذخیره شد و از این پس همین چاپ می‌شود.') }
  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        {!edit ? <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEdit(true)}>ویرایش دستی روی سند</Button> : <><Button size="sm" variant="primary" icon={<Save size={13} />} onClick={save}>ذخیرهٔ این نسخه</Button><Button size="sm" variant="ghost" onClick={() => setEdit(false)}>انصراف</Button><span className="text-12 text-t2">روی هر متن سند کلیک کنید و بنویسید؛ بعد ذخیره کنید.</span></>}
        {ov && !edit && <><Badge tone="warning">نسخهٔ ویرایش‌شدهٔ دستی · {rel(ov.at)}</Badge><Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={async () => { if (await confirm({ title: 'به نسخهٔ خودکار برگردد؟', body: 'تغییرهای دستی این سند پاک می‌شوند و سند دوباره از داده‌های سفارش ساخته می‌شود.', confirm: 'بازگشت به نسخهٔ خودکار' })) mutate((x) => { delete x.docOverrides[docKey] }, { action: 'حذف ویرایش دستی سند', target: docKey }) }}>بازگشت به نسخهٔ خودکار</Button></>}
      </div>
      <div ref={box} contentEditable={edit} suppressContentEditableWarning className={edit ? 'rounded-lg outline-2 outline-dashed outline-offset-4 outline-[#0000ff] [&_*]:cursor-text' : ''}>
        {ov ? <div dangerouslySetInnerHTML={{ __html: ov.html }} /> : children}
      </div>
    </div>
  )
}
