import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, CreditCard, Eye, EyeOff, History, LayoutGrid, Megaphone, Monitor, PanelBottom, PanelTop, Plus, Rows3, RotateCcw, Smartphone, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, cx, Field, Input, Segmented, Select, Textarea, Toggle } from '@/shared/ui/base'
import { Page } from '@/shared/ui/page'
import { confirm, Modal, toast } from '@/shared/ui/overlay'
import { mutate, currentUser, useDB } from '@/shared/lib/store'
import { fa, rel } from '@/shared/lib/fa'
import type { Link, Site } from '@/shared/data/site'
import { REGION_LABEL, StorePreview, type Region } from '@/storefront/Preview'

export const HOME_KINDS = ['هیرو', 'ردیف دسته‌ها', 'کاروسل قانون‌محور', 'کاروسل دستی', 'کاروسل شخصی‌سازی‌شده', 'کاروسل دسته‌ای', 'تأمین کالا', 'برندها', 'اعتماد', 'وبلاگ', 'نظرات', 'سؤالات متداول', 'اینستاگرام', 'خبرنامه', 'بنر', 'بلوک متنی']
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const set = (fn: (s: Site) => void) => mutate((x) => fn(x.site))
const swap = <T,>(a: T[], i: number, j: number) => { if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]] }

const TABS: { id: Region | 'versions'; icon: ReactNode }[] = [
  { id: 'announce', icon: <Megaphone size={15} /> }, { id: 'header', icon: <PanelTop size={15} /> }, { id: 'menu', icon: <Rows3 size={15} /> },
  { id: 'home', icon: <LayoutGrid size={15} /> }, { id: 'card', icon: <CreditCard size={15} /> }, { id: 'listing', icon: <LayoutGrid size={15} /> },
  { id: 'footer', icon: <PanelBottom size={15} /> }, { id: 'versions', icon: <History size={15} /> },
]

/** ردیف قابل جابه‌جایی با دکمه‌های بالا/پایین، نمایش/پنهان و حذف */
function RowCtl({ i, n, onMove, hidden, onHide, onDel, children }: { i: number; n: number; onMove: (d: -1 | 1) => void; hidden?: boolean; onHide?: () => void; onDel: () => void; children: ReactNode }) {
  return (
    <div className={cx('flex items-start gap-1.5 rounded-xl border border-line bg-surface p-2', hidden && 'opacity-60')}>
      <div className="flex flex-col"><button aria-label="بالا" disabled={i === 0} onClick={() => onMove(-1)} className="grid size-6 place-items-center rounded-md text-t2 hover:bg-neutral-bg disabled:opacity-30"><ArrowUp size={13} /></button><button aria-label="پایین" disabled={i === n - 1} onClick={() => onMove(1)} className="grid size-6 place-items-center rounded-md text-t2 hover:bg-neutral-bg disabled:opacity-30"><ArrowDown size={13} /></button></div>
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
      <div className="flex flex-col">{onHide && <button aria-label={hidden ? 'نمایش' : 'پنهان'} title={hidden ? 'نمایش' : 'پنهان کردن'} onClick={onHide} className="grid size-6 place-items-center rounded-md text-t2 hover:bg-neutral-bg">{hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>}<button aria-label="حذف" title="حذف" onClick={onDel} className="grid size-6 place-items-center rounded-md text-danger hover:bg-danger-bg"><Trash2 size={13} /></button></div>
    </div>
  )
}

/** ویرایشگر فهرست لینک‌ها (با زیرمنو در صورت نیاز) */
function Links({ get, nested, badge, addLabel }: { get: (s: Site) => Link[]; nested?: boolean; badge?: boolean; addLabel: string }) {
  const d = useDB(); const list = get(d.site); const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      {list.map((l, i) => (
        <RowCtl key={l.id} i={i} n={list.length} hidden={l.hidden} onMove={(dir) => set((s) => swap(get(s), i, i + dir))} onHide={() => set((s) => { const t = get(s)[i]; t.hidden = !t.hidden })}
          onDel={async () => { if (await confirm({ title: `«${l.label}» حذف شود؟`, body: (l.children?.length ?? 0) > 0 ? `${fa(l.children!.length)} زیرمنو هم حذف می‌شود.` : 'از پیش‌نویس سایت حذف می‌شود و تا انتشار، مشتری تغییری نمی‌بیند.', danger: true, confirm: 'حذف' })) set((s) => { get(s).splice(i, 1) }) }}>
          <div className="flex gap-1.5"><Input aria-label="عنوان" className="h-8 flex-1 text-12" value={l.label} onChange={(e) => set((s) => { get(s)[i].label = e.target.value })} />{badge && <Input aria-label="برچسب" placeholder="برچسب" className="h-8 w-20 text-12" value={l.badge ?? ''} onChange={(e) => set((s) => { get(s)[i].badge = e.target.value })} />}</div>
          <Input aria-label="نشانی" className="ltr h-8 text-left font-mono text-11" value={l.to} onChange={(e) => set((s) => { get(s)[i].to = e.target.value })} />
          {nested && <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex items-center gap-1 text-11 text-brand"><ChevronLeft size={12} className={cx('transition-transform', open === l.id && '-rotate-90')} />زیرمنو ({fa(l.children?.length ?? 0)})</button>}
          {nested && open === l.id && <div className="border-r-2 border-brand-tint pr-2"><Links get={(s) => { const t = get(s)[i]; t.children ??= []; return t.children }} addLabel="افزودن زیرمنو" /></div>}
        </RowCtl>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((s) => { get(s).push({ id: uid('l'), label: 'آیتم تازه', to: '/', children: nested ? [] : undefined }) })}>{addLabel}</Button>
    </div>
  )
}

const Group = ({ title, children, desc }: { title: string; desc?: string; children: ReactNode }) => <div className="space-y-2.5 border-b border-line pb-4 last:border-0"><div><p className="text-13 font-semibold">{title}</p>{desc && <p className="text-11 text-t2">{desc}</p>}</div>{children}</div>
const Sw = ({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) => <label className="flex min-h-9 items-center justify-between gap-2 text-13">{label}<Toggle on={on} onChange={onChange} label={label} /></label>

export function SiteEditor() {
  const d = useDB(); const nav = useNavigate(); const s = d.site
  const [tab, setTab] = useState<Region | 'versions'>('header'); const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'); const [full, setFull] = useState(false)
  const [page, setPage] = useState<'home' | 'listing'>('home')
  const dirty = JSON.stringify(d.site) !== JSON.stringify(d.sitePublished)
  const blocks = [...(d.entities.homeBlocks ?? [])].sort((a, b) => a.order - b.order)
  const pick = (r: Region) => { setTab(r); if (r === 'listing') setPage('listing'); if (r === 'home') setPage('home') }
  const publish = async () => {
    if (!(await confirm({ title: 'تغییرات روی سایت منتشر شود؟', body: 'مشتری‌ها از همین لحظه نسخهٔ تازه را می‌بینند. نسخهٔ فعلی در «نسخه‌ها» نگه داشته می‌شود و هر وقت بخواهید برمی‌گردد.', confirm: 'انتشار' }))) return
    mutate((x) => { x.siteVersions.unshift({ id: uid('v'), at: new Date().toISOString(), by: currentUser()?.name ?? 'شما', note: 'پیش از انتشار تازه', data: structuredClone(x.sitePublished) }); x.sitePublished = structuredClone(x.site) }, { action: 'انتشار تغییرات سایت', target: 'سایت غنیمت' })
    toast('تغییرات روی سایت منتشر شد.')
  }
  const discard = async () => { if (await confirm({ title: 'تغییرات منتشرنشده دور ریخته شود؟', body: 'پیش‌نویس به نسخهٔ فعلی سایت برمی‌گردد.', danger: true, confirm: 'دور ریختن' })) { mutate((x) => { x.site = structuredClone(x.sitePublished) }, { action: 'دور ریختن پیش‌نویس سایت', target: 'سایت غنیمت' }); toast('پیش‌نویس به نسخهٔ منتشرشده برگشت.') } }

  const panel = (() => {
    switch (tab) {
      case 'announce': return <>
        <Group title="نوار اعلان بالای سایت" desc="چند پیام پشت‌سرهم و با انیمیشن عوض می‌شوند. {آستانه_ارسال_رایگان} از قوانین کسب‌وکار خوانده می‌شود.">
          <Sw label="نمایش نوار" on={s.announce.on} onChange={(v) => set((x) => { x.announce.on = v })} />
          <Field label="رنگ نوار"><Segmented value={s.announce.tone} onChange={(v) => set((x) => { x.announce.tone = v })} options={[['brand', 'آبی برند'], ['ink', 'سرمه‌ای'], ['yellow', 'زرد']]} /></Field>
          <Field label="فاصلهٔ چرخش (ثانیه)"><Input type="number" min={2} max={15} value={s.announce.interval} onChange={(e) => set((x) => { x.announce.interval = Math.max(2, +e.target.value || 4) })} /></Field>
        </Group>
        <Group title="پیام‌ها">{s.announce.items.map((a, i) => <RowCtl key={a.id} i={i} n={s.announce.items.length} hidden={!a.on} onHide={() => set((x) => { x.announce.items[i].on = !a.on })} onMove={(dir) => set((x) => swap(x.announce.items, i, i + dir))} onDel={() => set((x) => { x.announce.items.splice(i, 1) })}>
          <Textarea aria-label="متن پیام" rows={2} className="text-12" value={a.text} onChange={(e) => set((x) => { x.announce.items[i].text = e.target.value })} /><Input aria-label="لینک" className="ltr h-8 text-left font-mono text-11" value={a.to} onChange={(e) => set((x) => { x.announce.items[i].to = e.target.value })} /></RowCtl>)}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.announce.items.push({ id: uid('an'), text: 'پیام تازه', to: '/', on: true }) })}>افزودن پیام</Button></Group>
      </>
      case 'header': return <>
        <Group title="لوگو و جست‌وجو">
          <Field label="لوگو"><Segmented value={s.header.logo} onChange={(v) => set((x) => { x.header.logo = v })} options={[['full', 'لوگوی کامل'], ['mark', 'فقط نشان']]} /></Field>
          <Field label="متن راهنمای جست‌وجو"><Input value={s.header.search} onChange={(e) => set((x) => { x.header.search = e.target.value })} /></Field>
          <Field label="متن دکمهٔ ورود"><Input value={s.header.login} onChange={(e) => set((x) => { x.header.login = e.target.value })} /></Field>
        </Group>
        <Group title="رفتار و دکمه‌ها">
          <Sw label="سربرگ چسبان هنگام اسکرول" on={s.header.sticky} onChange={(v) => set((x) => { x.header.sticky = v })} />
          <Sw label="دکمهٔ علاقه‌مندی‌ها" on={s.header.showWishlist} onChange={(v) => set((x) => { x.header.showWishlist = v })} />
          <Sw label="زنگ اعلان‌ها (کاربر واردشده)" on={s.header.showNotifications} onChange={(v) => set((x) => { x.header.showNotifications = v })} />
          <Sw label="دکمهٔ شناور دستیار خرید AI" on={s.header.showAiButton} onChange={(v) => set((x) => { x.header.showAiButton = v })} />
          <Sw label="انتخاب آدرس در سربرگ" on={s.header.showAddress} onChange={(v) => set((x) => { x.header.showAddress = v })} />
          {s.header.showAddress && <Input aria-label="متن انتخاب آدرس" value={s.header.addressLabel} onChange={(e) => set((x) => { x.header.addressLabel = e.target.value })} />}
          <Sw label="نمایش تلفن پشتیبانی" on={s.header.showPhone} onChange={(v) => set((x) => { x.header.showPhone = v })} />
          {s.header.showPhone && <Input aria-label="تلفن" className="ltr text-left" value={s.header.phone} onChange={(e) => set((x) => { x.header.phone = e.target.value })} />}
        </Group>
        <Group title="لینک‌های بالای سربرگ" desc="فقط در دسکتاپ نمایش داده می‌شوند."><Links get={(x) => x.header.utility} addLabel="افزودن لینک" /></Group>
      </>
      case 'menu': return <Group title="منوی اصلی" desc="ترتیب، نام، نشانی، برچسب (مثل «جدید») و زیرمنوی هر آیتم. آیتمی که «مگامنو» دارد زیرمنویش را ستونی و با دسته‌ها نشان می‌دهد. در موبایل همین منو در کشوی کناری است.">
        {s.menu.map((m, i) => <Sw key={m.id} label={`مگامنو برای «${m.label}»`} on={!!(m as { mega?: boolean }).mega} onChange={(v) => set((x) => { (x.menu[i] as { mega?: boolean }).mega = v })} />)}<Links get={(x) => x.menu} nested badge addLabel="افزودن آیتم منو" />
        <Button size="sm" onClick={() => set((x) => { const have = new Set(x.menu.map((m) => m.to)); (d.entities.categories ?? []).filter((c) => c.active && !have.has(`/c/${c.slug}`)).forEach((c) => x.menu.push({ id: uid('m'), label: c.name, to: `/c/${c.slug}`, children: [] })) })}>افزودن خودکار دسته‌های فعال</Button></Group>
      case 'home': return <Group title="بلوک‌های صفحهٔ خانه" desc="ترتیب، عنوان و نوع هر بلوک. کاروسل‌ها از کارت محصول همین سایت استفاده می‌کنند.">
        {blocks.map((b, i) => <RowCtl key={b.id} i={i} n={blocks.length} hidden={!b.active} onHide={() => mutate((x) => { const t = x.entities.homeBlocks.find((y) => y.id === b.id)!; t.active = !t.active })}
          onMove={(dir) => mutate((x) => { const j = i + dir; if (j < 0 || j >= blocks.length) return; const A = x.entities.homeBlocks.find((y) => y.id === blocks[i].id)!; const B = x.entities.homeBlocks.find((y) => y.id === blocks[j].id)!; [A.order, B.order] = [B.order, A.order] })}
          onDel={async () => { if (await confirm({ title: `بلوک «${b.name}» حذف شود؟`, body: 'بلوک از صفحهٔ خانه برداشته می‌شود.', danger: true, confirm: 'حذف' })) mutate((x) => { x.entities.homeBlocks = x.entities.homeBlocks.filter((y) => y.id !== b.id) }, { action: 'حذف بلوک صفحهٔ خانه', target: b.name }) }}>
          <div className="flex gap-1.5"><Input aria-label="نام" className="h-8 w-28 text-12" value={b.name} onChange={(e) => mutate((x) => { x.entities.homeBlocks.find((y) => y.id === b.id)!.name = e.target.value })} /><Select className="h-8 flex-1 text-12" value={b.kind} onChange={(v) => mutate((x) => { x.entities.homeBlocks.find((y) => y.id === b.id)!.kind = v })} options={HOME_KINDS} /></div>
          <Input aria-label="عنوان" className="h-8 text-12" value={b.title} onChange={(e) => mutate((x) => { x.entities.homeBlocks.find((y) => y.id === b.id)!.title = e.target.value })} /></RowCtl>)}
        <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => mutate((x) => { x.entities.homeBlocks.push({ id: uid('hb'), name: 'بلوک تازه', kind: 'کاروسل دستی', title: 'پیشنهاد ما', order: Math.max(0, ...x.entities.homeBlocks.map((y) => y.order)) + 1, active: true }) }, { action: 'افزودن بلوک صفحهٔ خانه', target: 'بلوک تازه' })}>افزودن بلوک</Button>
        <p className="text-11 text-t2">بلوک‌های صفحهٔ خانه بلافاصله منتشر می‌شوند. زمان‌بندی و نسخه‌ها در «محتوا و صفحات سایت» است.</p>
      </Group>
      case 'card': return <>
        <Group title="خط متحرک کارت" desc="متن‌ها پشت‌سرهم و با انیمیشن عوض می‌شوند. شرط نمایش هر خط (مثلاً موجودی کم) در «قوانین کارت محصول» است.">
          {s.card.lines.map((l, i) => <RowCtl key={l.id} i={i} n={s.card.lines.length} hidden={!l.on} onHide={() => set((x) => { x.card.lines[i].on = !l.on })} onMove={(dir) => set((x) => swap(x.card.lines, i, i + dir))} onDel={() => set((x) => { x.card.lines.splice(i, 1) })}>
            <div className="flex items-center gap-1.5"><Badge dot={false}>{({ low: 'موجودی کم', origin: 'مبدأ آمازون', bnpl: 'اقساط', custom: 'همیشه' } as Record<string, string>)[l.kind]}</Badge><Input aria-label="متن" className="h-8 flex-1 text-12" value={l.text} onChange={(e) => set((x) => { x.card.lines[i].text = e.target.value })} /></div></RowCtl>)}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.card.lines.push({ id: uid('cl'), kind: 'custom', text: 'ضمانت اصالت کالا', on: true }) })}>افزودن خط همیشگی</Button>
          <Field label="سرعت چرخش (ثانیه)"><Input type="number" step={0.2} min={1.5} value={s.card.interval} onChange={(e) => set((x) => { x.card.interval = Math.max(1.5, +e.target.value || 2.6) })} /></Field>
        </Group>
        <Group title="ظاهر کارت">
          <Field label="نسبت تصویر"><Segmented value={s.card.ratio} onChange={(v) => set((x) => { x.card.ratio = v })} options={[['1/1', 'مربع'], ['4/5', 'عمودی']]} /></Field>
          <Field label="متن دکمهٔ خرید"><Input value={s.card.cta} onChange={(e) => set((x) => { x.card.cta = e.target.value })} /></Field>
          {([['showTimer', 'تایمر غنی‌آف'], ['showHot', 'نشان پرفروش'], ['showGrade', 'برچسب استوک/جعبه‌باز و گرید'], ['showRating', 'امتیاز'], ['showFast', 'برچسب تحویل سریع'], ['showCompare', 'قیمت قبل و درصد تخفیف']] as const).map(([k, l]) => <Sw key={k} label={l} on={s.card[k]} onChange={(v) => set((x) => { x.card[k] = v })} />)}
        </Group>
        <Group title="تعداد ستون">
          <Field label="دسکتاپ"><Segmented value={String(s.card.colsDesktop)} onChange={(v) => set((x) => { x.card.colsDesktop = +v })} options={[['3', '۳'], ['4', '۴'], ['5', '۵'], ['6', '۶']]} /></Field>
          <Field label="موبایل"><Segmented value={String(s.card.colsMobile)} onChange={(v) => set((x) => { x.card.colsMobile = +v })} options={[['1', '۱'], ['2', '۲']]} /></Field>
        </Group>
      </>
      case 'listing': return <>
        <Group title="نمایش فهرست محصولات">
          <Field label="نمای پیش‌فرض"><Segmented value={s.listing.view} onChange={(v) => set((x) => { x.listing.view = v })} options={[['grid', 'شبکه‌ای'], ['list', 'فهرستی']]} /></Field>
          <Field label="مرتب‌سازی پیش‌فرض"><Select value={s.listing.sort} onChange={(v) => set((x) => { x.listing.sort = v })} options={[['popular', 'محبوب‌ترین'], ['new', 'جدیدترین'], ['cheap', 'ارزان‌ترین'], ['expensive', 'گران‌ترین'], ['discount', 'بیشترین تخفیف']]} /></Field>
          <Field label="کالا در هر صفحه"><Select value={String(s.listing.perPage)} onChange={(v) => set((x) => { x.listing.perPage = +v })} options={['12', '24', '36', '48']} /></Field>
          <Sw label="ستون فیلتر" on={s.listing.showFilters} onChange={(v) => set((x) => { x.listing.showFilters = v })} />
          <Sw label="فیلتر چسبان هنگام اسکرول" on={s.listing.stickyFilters} onChange={(v) => set((x) => { x.listing.stickyFilters = v })} />
        </Group>
        <Group title="فیلترها" desc="ترتیب و نمایش هر فیلتر.">{s.listing.filters.map((f, i) => <RowCtl key={f.id} i={i} n={s.listing.filters.length} hidden={!f.on} onHide={() => set((x) => { x.listing.filters[i].on = !f.on })} onMove={(dir) => set((x) => swap(x.listing.filters, i, i + dir))} onDel={() => set((x) => { x.listing.filters.splice(i, 1) })}><Input aria-label="نام فیلتر" className="h-8 text-12" value={f.label} onChange={(e) => set((x) => { x.listing.filters[i].label = e.target.value })} /></RowCtl>)}</Group>
        <Group title="چیپ‌های میان‌بر بالای فهرست">{s.listing.chips.map((c, i) => <RowCtl key={c.id} i={i} n={s.listing.chips.length} hidden={!c.on} onHide={() => set((x) => { x.listing.chips[i].on = !c.on })} onMove={(dir) => set((x) => swap(x.listing.chips, i, i + dir))} onDel={() => set((x) => { x.listing.chips.splice(i, 1) })}><Input aria-label="متن چیپ" className="h-8 text-12" value={c.label} onChange={(e) => set((x) => { x.listing.chips[i].label = e.target.value })} /></RowCtl>)}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.listing.chips.push({ id: uid('ch'), label: 'چیپ تازه', on: true }) })}>افزودن چیپ</Button></Group>
      </>
      case 'footer': return <>
        <Group title="معرفی و تماس">
          <Field label="متن معرفی"><Textarea rows={3} value={s.footer.about} onChange={(e) => set((x) => { x.footer.about = e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="تلفن"><Input className="ltr text-left" value={s.footer.phone} onChange={(e) => set((x) => { x.footer.phone = e.target.value })} /></Field><Field label="ایمیل"><Input className="ltr text-left" value={s.footer.email} onChange={(e) => set((x) => { x.footer.email = e.target.value })} /></Field></div>
          <Field label="ساعت پاسخ‌گویی"><Input value={s.footer.hours} onChange={(e) => set((x) => { x.footer.hours = e.target.value })} /></Field>
          <Field label="نشانی"><Input value={s.footer.address} onChange={(e) => set((x) => { x.footer.address = e.target.value })} /></Field>
        </Group>
        <Group title="نوار اعتماد بالای فوتر">{s.footer.strip.map((it, i) => <RowCtl key={it.id} i={i} n={s.footer.strip.length} hidden={!it.on} onHide={() => set((x) => { x.footer.strip[i].on = !it.on })} onMove={(dir) => set((x) => swap(x.footer.strip, i, i + dir))} onDel={() => set((x) => { x.footer.strip.splice(i, 1) })}><Input aria-label="متن" className="h-8 text-12" value={it.text} onChange={(e) => set((x) => { x.footer.strip[i].text = e.target.value })} /></RowCtl>)}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.footer.strip.push({ id: uid('st'), text: 'مزیت تازه', on: true }) })}>افزودن مزیت</Button></Group>
        <Group title="ستون‌های لینک">{s.footer.columns.map((c, i) => <RowCtl key={c.id} i={i} n={s.footer.columns.length} onMove={(dir) => set((x) => swap(x.footer.columns, i, i + dir))} onDel={async () => { if (await confirm({ title: `ستون «${c.title}» حذف شود؟`, body: 'لینک‌های این ستون هم حذف می‌شوند.', danger: true, confirm: 'حذف' })) set((x) => { x.footer.columns.splice(i, 1) }) }}>
          <Input aria-label="عنوان ستون" className="h-8 text-12 font-semibold" value={c.title} onChange={(e) => set((x) => { x.footer.columns[i].title = e.target.value })} /><Links get={(x) => x.footer.columns[i].links} addLabel="افزودن لینک" /></RowCtl>)}
          {s.footer.columns.length < 5 && <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.footer.columns.push({ id: uid('f'), title: 'ستون تازه', links: [] }) })}>افزودن ستون</Button>}</Group>
        <Group title="شبکه‌های اجتماعی">{s.footer.socials.map((so, i) => <RowCtl key={so.id} i={i} n={s.footer.socials.length} hidden={!so.on} onHide={() => set((x) => { x.footer.socials[i].on = !so.on })} onMove={(dir) => set((x) => swap(x.footer.socials, i, i + dir))} onDel={() => set((x) => { x.footer.socials.splice(i, 1) })}>
          <div className="flex gap-1.5"><Input aria-label="شبکه" className="h-8 w-24 text-12" value={so.kind} onChange={(e) => set((x) => { x.footer.socials[i].kind = e.target.value })} /><Input aria-label="نشانی" className="ltr h-8 flex-1 text-left text-11" value={so.url} onChange={(e) => set((x) => { x.footer.socials[i].url = e.target.value })} /></div></RowCtl>)}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => set((x) => { x.footer.socials.push({ id: uid('s'), kind: 'شبکهٔ تازه', url: '', on: true }) })}>افزودن شبکه</Button></Group>
        <Group title="نمادها، خبرنامه و کپی‌رایت">
          <Sw label="نماد اعتماد الکترونیکی" on={s.footer.trust.enamad} onChange={(v) => set((x) => { x.footer.trust.enamad = v })} />
          <Sw label="نشان ساماندهی" on={s.footer.trust.samandehi} onChange={(v) => set((x) => { x.footer.trust.samandehi = v })} />
          <Sw label="نشان اتحادیه" on={s.footer.trust.union} onChange={(v) => set((x) => { x.footer.trust.union = v })} />
          <Sw label="عضویت در خبرنامه" on={s.footer.newsletter} onChange={(v) => set((x) => { x.footer.newsletter = v })} />
          {s.footer.newsletter && <Input aria-label="متن خبرنامه" value={s.footer.newsletterText} onChange={(e) => set((x) => { x.footer.newsletterText = e.target.value })} />}
          <Field label="عنوان متن سئوی پایین صفحه"><Input value={s.footer.seoTitle} onChange={(e) => set((x) => { x.footer.seoTitle = e.target.value })} /></Field>
          <Field label="متن سئو (با «مشاهدهٔ بیشتر» باز می‌شود)"><Textarea rows={4} value={s.footer.seoText} onChange={(e) => set((x) => { x.footer.seoText = e.target.value })} /></Field>
          <Sw label="دکمهٔ بازگشت به بالا" on={s.footer.backToTop} onChange={(v) => set((x) => { x.footer.backToTop = v })} />
          <Field label="متن کپی‌رایت"><Input value={s.footer.copyright} onChange={(e) => set((x) => { x.footer.copyright = e.target.value })} /></Field>
        </Group>
      </>
      case 'versions': return <Group title="نسخه‌های منتشرشده" desc="هر انتشار، نسخهٔ قبلی را اینجا نگه می‌دارد. بازگردانی فقط پیش‌نویس را عوض می‌کند تا پیش از انتشار ببینید.">
        <ul className="space-y-2">{d.siteVersions.map((v, i) => <li key={v.id} className="flex items-center gap-2 rounded-xl border border-line p-3"><span className="grid size-8 place-items-center rounded-full bg-brand-tint text-brand"><History size={14} /></span><div className="min-w-0 flex-1"><p className="text-13 font-medium">{v.note}{i === 0 && <span className="mr-1.5"><Badge tone="success">آخرین</Badge></span>}</p><p className="text-11 text-t2">{v.by} · {rel(v.at)}</p></div>
          <Button size="sm" icon={<RotateCcw size={13} />} disabled={!v.data} onClick={() => { mutate((x) => { x.site = structuredClone(v.data!) }, { action: 'بازگردانی نسخهٔ سایت به پیش‌نویس', target: v.note }); toast('نسخه در پیش‌نویس بازگردانی شد. برای اعمال روی سایت «انتشار» را بزنید.') }}>بازگردانی</Button></li>)}</ul>
      </Group>
    }
  })()

  return (
    <Page title="ویرایش سایت" module="content" sub="سربرگ، منو، صفحهٔ خانه، کارت و فهرست محصولات و فوتر. روی هر بخش پیش‌نمایش بزنید تا ویرایشش باز شود."
      actions={<><Button variant="ghost" icon={<RotateCcw size={14} />} disabled={!dirty} onClick={discard}>دور ریختن تغییرات</Button><Button icon={<Eye size={14} />} onClick={() => setFull(true)}>پیش‌نمایش کامل</Button><Button variant="ghost" onClick={() => nav('/admin/content')}>محتوا و صفحات</Button></>}
      primary={<Button variant="primary" icon={<Upload size={14} />} disabled={!dirty} onClick={publish}>{dirty ? 'انتشار تغییرات' : 'همه‌چیز منتشر شده'}</Button>}>
      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Card pad={false} className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          <div className="scroll-fade flex gap-1 overflow-x-auto border-b border-line p-2">{TABS.map((t) => <button key={t.id} onClick={() => t.id === 'versions' ? setTab('versions') : pick(t.id)} className={cx('flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-12 font-medium transition-colors', tab === t.id ? 'bg-brand-solid text-white' : 'text-t2 hover:bg-neutral-bg')}>{t.icon}{t.id === 'versions' ? 'نسخه‌ها' : REGION_LABEL[t.id]}</button>)}</div>
          <div key={tab} className="page-enter space-y-4 p-4">{panel}</div>
        </Card>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={device} onChange={setDevice} options={[['desktop', <span key="d" className="flex items-center gap-1"><Monitor size={14} />دسکتاپ</span>], ['mobile', <span key="m" className="flex items-center gap-1"><Smartphone size={14} />موبایل</span>]]} />
            <Segmented value={page} onChange={setPage} options={[['home', 'صفحهٔ خانه'], ['listing', 'فهرست محصولات']]} />
            <span className="mr-auto">{dirty ? <Badge tone="warning">تغییرات منتشرنشده</Badge> : <Badge tone="success">با سایت یکی است</Badge>}</span>
          </div>
          <div className={cx('mx-auto overflow-hidden border border-line shadow-sm transition-all duration-300', device === 'mobile' ? 'w-[390px] max-w-full rounded-[28px] border-[6px] border-[#10123d]' : 'w-full rounded-2xl')}>
            <div className={device === 'mobile' ? 'max-h-[760px] overflow-y-auto' : ''}><StorePreview site={s} device={device} page={page} active={tab === 'versions' ? undefined : tab} onPick={pick} /></div>
          </div>
        </div>
      </div>
      <Modal wide open={full} onClose={() => setFull(false)} title="پیش‌نمایش کامل (پیش‌نویس)"><div className="overflow-hidden rounded-xl border border-line"><StorePreview site={s} device={device} page={page} /></div></Modal>
    </Page>
  )
}
