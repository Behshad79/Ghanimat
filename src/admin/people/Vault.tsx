import { useState } from 'react'
import { Archive, BellRing, Download, FileText, FolderLock, History, Lock, Plus, Upload } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Select, Textarea } from '@/shared/ui/base'
import { KPI, Page } from '@/shared/ui/page'
import { DataTable } from '@/shared/ui/table'
import { Drawer, toast } from '@/shared/ui/overlay'
import { askReason } from '@/shared/ui/reason'
import { currentUser, mutate, useDB } from '@/shared/lib/store'
import { fa } from '@/shared/lib/fa'
import { VAULT_CATS, type VaultDoc } from '@/shared/data/vault'

const fd = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
const left = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / 864e5) : null)
const ACCESS: Record<VaultDoc['access'], string> = { all: 'همهٔ تیم', managers: 'فقط مدیران', owner: 'فقط مدیر کل' }
const MAX = 4 * 1024 * 1024
const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })
const expTone = (v: VaultDoc) => { const l = left(v.expires); return l === null ? null : l < 0 ? 'danger' : l <= v.remind ? 'warning' : 'success' }

/** بایگانی اسناد سازمان: بارگذاری، دسته‌بندی، تاریخ انقضا و یادآوری تمدید، نسخه‌های قبلی و سطح دسترسی */
export function Vault() {
  const d = useDB(); const V = d.vault; const [open, setOpen] = useState<VaultDoc | null>(null); const [cat, setCat] = useState('همه')
  const blank = (): VaultDoc => ({ id: `vd${Date.now().toString(36)}`, title: '', cat: 'قراردادها', at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', remind: 30, tags: [], access: 'managers', versions: [] })
  const isNew = open && !V.some((v) => v.id === open.id)
  const attach = async (f: File) => { if (!open) return; if (f.size > MAX) return toast('در نسخهٔ نمایشی حداکثر ۴ مگابایت. در سرور واقعی محدودیتی جز سهمیهٔ فضای ذخیره‌سازی نیست.', { tone: 'err' }); const file = await readFile(f); setOpen({ ...open, file, fileName: f.name, size: f.size, title: open.title || f.name.replace(/\.[^.]+$/, ''), versions: open.file || open.fileName ? [{ at: open.at, by: open.by, fileName: open.fileName }, ...open.versions] : open.versions, at: new Date().toISOString(), by: currentUser()?.name ?? 'شما' }) }
  const save = () => { if (!open) return; if (!open.title.trim()) return toast('عنوان سند را بنویسید.', { tone: 'err' }); mutate((x) => { const i = x.vault.findIndex((v) => v.id === open.id); if (i >= 0) x.vault[i] = open; else x.vault.unshift(open) }, { action: isNew ? 'بارگذاری سند در بایگانی' : 'ویرایش سند بایگانی', target: open.title }); toast('سند در بایگانی ذخیره شد.'); setOpen(null) }
  const remove = async () => { if (!open) return; const why = await askReason({ kind: 'cancel', ref: open.title, status: 'حذف سند از بایگانی', title: 'دلیل حذف سند' }); if (!why) return; mutate((x) => { x.vault = x.vault.filter((v) => v.id !== open.id); x.trash.unshift({ id: `tr-${open.id}`, kind: 'سند بایگانی', ek: 'vault', label: open.title, data: open as never, at: new Date().toISOString() }) }, { action: 'انتقال سند به سطل بازیافت', target: open.title, after: why }); setOpen(null); toast('سند به سطل بازیافت رفت و تا ۳۰ روز قابل بازگشت است.') }
  const expiring = V.filter((v) => { const t = expTone(v); return t === 'warning' || t === 'danger' })
  const rows = cat === 'همه' ? V : V.filter((v) => v.cat === cat)
  return (
    <Page title="بایگانی اسناد و مجوزها" module="vault" sub="اسناد ثبتی، قراردادها، مجوزها و گواهی‌ها در یک جا، با یادآوری تمدید پیش از انقضا. فایل‌ها روی سرور غنیمت و با دسترسی کنترل‌شده نگه داشته می‌شوند."
      primary={<Button variant="primary" icon={<Upload size={14} />} onClick={() => setOpen(blank())}>بارگذاری سند</Button>}>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI featured icon={<Archive size={17} />} label="کل اسناد" value={fa(V.length)} note={`${fa(V.filter((v) => v.file || v.fileName).length)} با فایل پیوست`} />
        <KPI icon={<BellRing size={17} />} label="نیازمند تمدید" tone="danger" value={fa(expiring.length)} note={expiring[0] ? `${expiring[0].title}: ${fa(Math.max(0, left(expiring[0].expires)!))} روز مانده` : 'همه معتبرند'} />
        <KPI icon={<FileText size={17} />} label="بدون فایل پیوست" tone="warning" value={fa(V.filter((v) => !v.file && !v.fileName).length)} note="فقط مشخصات ثبت شده" />
        <KPI icon={<FolderLock size={17} />} label="محرمانه (فقط مدیر کل)" tone="info" value={fa(V.filter((v) => v.access === 'owner').length)} />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">{['همه', ...VAULT_CATS].map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cx('h-8 rounded-full border px-3 text-12', cat === c ? 'border-brand bg-brand-solid text-white' : 'border-line bg-surface hover:border-brand/50')}>{c} <span className="tnum opacity-80">{fa(c === 'همه' ? V.length : V.filter((v) => v.cat === c).length)}</span></button>)}</div>
      <DataTable name="اسناد" rows={rows} rowKey={(v) => v.id} onRow={(v) => setOpen(structuredClone(v))} empty={{ title: 'سندی در این دسته نیست.', action: <Button variant="primary" onClick={() => setOpen(blank())}>بارگذاری سند</Button> }}
        cols={[{ key: 't', title: 'سند', render: (v) => <span className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand"><FileText size={16} /></span><span><b className="block">{v.title}</b><span className="text-11 text-t2">{v.fileName ?? 'بدون فایل'}{v.versions.length ? ` · ${fa(v.versions.length + 1)} نسخه` : ''}</span></span></span>, text: (v) => `${v.title} ${v.fileName ?? ''}` },
          { key: 'c', title: 'دسته', render: (v) => v.cat }, { key: 'tags', title: 'برچسب', render: (v) => <span className="flex flex-wrap gap-1">{v.tags.map((t) => <Badge key={t} dot={false}>{t}</Badge>)}</span>, text: (v) => v.tags.join(' ') },
          { key: 'e', title: 'اعتبار', render: (v) => { const l = left(v.expires); const t = expTone(v); return l === null ? <span className="text-12 text-t2">بدون انقضا</span> : <Badge tone={t as 'danger'}>{l < 0 ? `${fa(-l)} روز منقضی` : `${fa(l)} روز مانده`}</Badge> }, sort: (v) => left(v.expires) ?? 1e9 },
          { key: 'a', title: 'دسترسی', render: (v) => <span className="flex items-center gap-1 text-12">{v.access !== 'all' && <Lock size={12} />}{ACCESS[v.access]}</span>, text: (v) => ACCESS[v.access] },
          { key: 'at', title: 'آخرین بارگذاری', render: (v) => <span className="text-12 text-t2">{fd(v.at)} · {v.by}</span>, sort: (v) => v.at }]} />
      <Drawer open={!!open} onClose={() => setOpen(null)} width={520} title={isNew ? 'بارگذاری سند تازه' : open?.title ?? ''} footer={<div className="flex w-full flex-wrap gap-2"><Button variant="primary" onClick={save}>ذخیره</Button>{open?.file && <a href={open.file} download={open.fileName} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-13"><Download size={14} />دانلود</a>}{!isNew && <Button variant="danger" className="mr-auto" onClick={() => void remove()}>حذف</Button>}</div>}>
        {open && <div className="space-y-3">
          <label className={cx('flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed p-5 text-center text-13', open.file || open.fileName ? 'border-success/40 bg-success-bg/40' : 'border-line hover:border-brand/50')}>
            <Upload size={20} className="text-brand" />{open.fileName ? <><b>{open.fileName}</b><span className="text-11 text-t2">{open.size ? `${fa((open.size / 1024 / 1024).toFixed(1))} مگابایت · ` : ''}برای جایگزینی و ساخت نسخهٔ تازه بزنید</span></> : <><b>فایل را بکشید یا انتخاب کنید</b><span className="text-11 text-t2">PDF، عکس، Word یا Excel</span></>}
            <input type="file" className="sr-only" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f) }} />
          </label>
          {open.file?.startsWith('data:image') && <img src={open.file} alt={open.title} className="max-h-64 w-full rounded-xl object-contain" />}
          <Field label="عنوان"><Input value={open.title} onChange={(e) => setOpen({ ...open, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="دسته"><Select value={open.cat} onChange={(v) => setOpen({ ...open, cat: v })} options={VAULT_CATS} /></Field><Field label="چه کسی ببیند"><Select value={open.access} onChange={(v) => setOpen({ ...open, access: v as VaultDoc['access'] })} options={Object.entries(ACCESS).map(([k, l]) => [k, l] as [string, string])} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="تاریخ انقضا (اختیاری)"><Input type="date" value={open.expires?.slice(0, 10) ?? ''} onChange={(e) => setOpen({ ...open, expires: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : undefined })} /></Field><Field label="یادآوری چند روز قبل"><Input type="number" min={0} value={open.remind} onChange={(e) => setOpen({ ...open, remind: Number(e.target.value) })} /></Field></div>
          <Field label="برچسب‌ها (با ویرگول جدا کنید)"><Input value={open.tags.join('، ')} onChange={(e) => setOpen({ ...open, tags: e.target.value.split(/[،,]/).map((t) => t.trim()).filter(Boolean) })} /></Field>
          <Field label="یادداشت"><Textarea rows={3} value={open.note ?? ''} onChange={(e) => setOpen({ ...open, note: e.target.value })} placeholder="شمارهٔ ثبت، مبلغ ودیعه، شرایط تمدید…" /></Field>
          {open.versions.length > 0 && <Card title={<span className="flex items-center gap-1.5"><History size={14} />نسخه‌های قبلی</span>}><ul className="space-y-1 text-12">{open.versions.map((v, i) => <li key={i} className="flex justify-between"><span>{v.fileName ?? 'نسخهٔ بدون فایل'}</span><span className="text-t2">{fd(v.at)} · {v.by}</span></li>)}</ul></Card>}
          <p className="text-11 text-t2">هر بارگذاری، مشاهده و دانلود در لاگ ممیزی ثبت می‌شود. در نسخهٔ واقعی فایل‌ها رمزگذاری‌شده روی فضای ذخیره‌سازی سرور نگه داشته می‌شوند و نسخهٔ پشتیبان روزانه دارند.</p>
          {isNew && <Button variant="ghost" icon={<Plus size={13} />} onClick={() => setOpen({ ...open, tags: [...open.tags, open.cat] })}>افزودن دسته به برچسب‌ها</Button>}
        </div>}
      </Drawer>
    </Page>
  )
}
