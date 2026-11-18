# ۰۷ · سیستم طراحی و کامپوننت‌ها

- **فونت**: Peyda نسخهٔ NoEn (`src/fonts/peyda/*.woff2`، تعریف در `src/fonts/peyda.css`)؛ متن لاتین روی Vazirmatn می‌افتد. اعداد فارسی با `fa()` در `src/shared/lib/fa.ts`.
- **جهت**: کل رابط RTL است (`dir="rtl"` روی `html`). در Tailwind از `ms-/me-/ps-/pe-/start/end` استفاده شده تا با جهت درست کار کند.
- **رنگ برند**: `#0000ff`؛ متن اصلی `#10123d`. تم تیره با `data-theme="dark"` روی `html`.
- **توکن‌ها**: همهٔ رنگ‌ها، فاصله‌ها و اندازهٔ قلم‌ها متغیر CSS در `src/styles.css` هستند و در `@theme inline` به کلاس‌های Tailwind وصل شده‌اند (مثلاً `bg-brand-solid`، `text-t2`، `border-line`، `text-13`). خروجی استاندارد: **`docs/developer/design-tokens.json`** (فرمت W3C DTCG، با حالت روشن و تیره) برای وارد کردن در Figma با افزونهٔ Tokens Studio.
- **صفحهٔ زندهٔ سیستم طراحی**: مسیر `/admin/design` (کامپوننت‌ها، حالت‌ها، رنگ‌ها و قلم‌ها در عمل).

## رنگ‌ها (حالت روشن / تیره)

| توکن | روشن | تیره |
|---|---|---|
| `--brand` | `متن، لینک، آیکون و حالت انتخاب. --brand-solid: پس‌زمینهٔ دکمه و سطح پر؛ متن روی آن همیشه سفید (۸٫۵۹ به ۱). */
  --brand: #0000ff` | `#8c9bff` |
| `--brand-pressed` | `#0000c4` | `#a9b4ff` |
| `--brand-tint` | `#eef0ff` | `#1c1f4a` |
| `--brand-solid` | `#0000ff` | `#0000ff` |
| `--brand-solid-pressed` | `#0000c4` | `#2b2bff` |
| `--on-brand` | `#ffffff` | `#ffffff` |
| `--success-solid` | `#12733f` | `#12733f` |
| `--danger-solid` | `#c42f2f` | `#c42f2f` |
| `--text-1` | `#10123d` | `#eceefa` |
| `--text-2` | `#5a5e78` | `#b1b6cd` |
| `--text-3` | `#5f6479` | `#9196b0` |
| `--bg` | `#f5f6fa` | `#0c0d1a` |
| `--surface` | `#ffffff` | `#15172a` |
| `--surface-2` | `#fafbfd` | `#1a1c33` |
| `--border` | `#e6e8f0` | `#282b47` |
| `--success` | `#12733f` | `#4ade80` |
| `--success-bg` | `#e8f7ee` | `#10291c` |
| `--warning` | `#a64b07` | `#fbbf24` |
| `--warning-bg` | `#fff3e8` | `#2e2110` |
| `--danger` | `#c42f2f` | `#f87171` |
| `--danger-bg` | `#fef2f2` | `#331616` |
| `--info` | `#0e7490` | `#38bdf8` |
| `--info-bg` | `#e6f4f7` | `#0d2a33` |
| `--purple` | `#6d28d9` | `#b79cff` |
| `--purple-bg` | `#f3eeff` | `#251a45` |
| `--neutral-bg` | `#eff0f5` | `#23263f` |
| `--shadow-float` | `0 8px 28px rgba(16, 18, 61, 0.14), 0 1px 3px rgba(16, 18, 61, 0.08)` | `0 8px 28px rgba(0, 0, 0, 0.55)` |
| `--zebra` | `#f6f7fa` | `#181a2f` |
| `--th-bg` | `#f1f2f7` | `#1b1d35` |

## اندازهٔ قلم

| کلاس | اندازه |
|---|---|
| `text-11` | 11px |
| `text-12` | 12px |
| `text-13` | 13px |
| `text-14` | 14px |
| `text-15` | 15px |
| `text-16` | 16px |
| `text-18` | 18px |
| `text-22` | 22px |
| `text-20` | 20px |
| `text-24` | 24px |
| `text-32` | 32px |

## کامپوننت‌های مشترک (`src/shared/ui/`)

| کامپوننت | فایل |
|---|---|
| `IconPicker` | `src/shared/ui/IconPicker.tsx` |
| `MagicIcon` | `src/shared/ui/MagicIcon.tsx` |
| `Button` | `src/shared/ui/base.tsx` |
| `Badge` | `src/shared/ui/base.tsx` |
| `Card` | `src/shared/ui/base.tsx` |
| `Field` | `src/shared/ui/base.tsx` |
| `Select` | `src/shared/ui/base.tsx` |
| `Toggle` | `src/shared/ui/base.tsx` |
| `Segmented` | `src/shared/ui/base.tsx` |
| `Tabs` | `src/shared/ui/base.tsx` |
| `EmptyState` | `src/shared/ui/base.tsx` |
| `copyText` | `src/shared/ui/base.tsx` |
| `ErrorState` | `src/shared/ui/base.tsx` |
| `NoAccess` | `src/shared/ui/base.tsx` |
| `CopyId` | `src/shared/ui/base.tsx` |
| `Masked` | `src/shared/ui/base.tsx` |
| `logoOf` | `src/shared/ui/brandLogo.tsx` |
| `BrandLogo` | `src/shared/ui/brandLogo.tsx` |
| `WithLogo` | `src/shared/ui/brandLogo.tsx` |
| `LineChart` | `src/shared/ui/charts.tsx` |
| `Bars` | `src/shared/ui/charts.tsx` |
| `Donut` | `src/shared/ui/charts.tsx` |
| `Funnel` | `src/shared/ui/charts.tsx` |
| `Waterfall` | `src/shared/ui/charts.tsx` |
| `Heat` | `src/shared/ui/charts.tsx` |
| `Columns` | `src/shared/ui/charts.tsx` |
| `Gauge` | `src/shared/ui/charts.tsx` |
| `IranTiles` | `src/shared/ui/charts.tsx` |
| `SegGauge` | `src/shared/ui/charts.tsx` |
| `Area` | `src/shared/ui/charts.tsx` |
| `AreaFunnel` | `src/shared/ui/charts.tsx` |
| `Attachments` | `src/shared/ui/chat.tsx` |
| `Composer` | `src/shared/ui/chat.tsx` |
| `Barcode` | `src/shared/ui/codes.tsx` |
| `QR` | `src/shared/ui/codes.tsx` |
| `useDateRange` | `src/shared/ui/datefilter.tsx` |
| `inRange` | `src/shared/ui/datefilter.tsx` |
| `DateFilter` | `src/shared/ui/datefilter.tsx` |
| `softDelete` | `src/shared/ui/entity.tsx` |
| `EntityManager` | `src/shared/ui/entity.tsx` |
| `ExportDialog` | `src/shared/ui/exportDialog.tsx` |
| `GoalEdit` | `src/shared/ui/goal.tsx` |
| `JDateInput` | `src/shared/ui/jdate.tsx` |
| `WhenPicker` | `src/shared/ui/jdate.tsx` |
| `KpiDetail` | `src/shared/ui/kpiDetail.tsx` |
| `kpiIcon` | `src/shared/ui/kpiMeta.tsx` |
| `kpiTone` | `src/shared/ui/kpiMeta.tsx` |
| `LineIcon` | `src/shared/ui/lineIcons.tsx` |
| `useIconKeys` | `src/shared/ui/lineIcons.tsx` |
| `RowMenu` | `src/shared/ui/menu.tsx` |
| `useCountUp` | `src/shared/ui/motion.tsx` |
| `CountUp` | `src/shared/ui/motion.tsx` |
| `Modal` | `src/shared/ui/overlay.tsx` |
| `Drawer` | `src/shared/ui/overlay.tsx` |
| `toast` | `src/shared/ui/overlay.tsx` |
| `ToastHost` | `src/shared/ui/overlay.tsx` |
| `ConfirmHost` | `src/shared/ui/overlay.tsx` |
| `Hint` | `src/shared/ui/overlay.tsx` |
| `Page` | `src/shared/ui/page.tsx` |
| `KPI` | `src/shared/ui/page.tsx` |
| `ActionChips` | `src/shared/ui/page.tsx` |
| `AISummary` | `src/shared/ui/page.tsx` |
| `resolve` | `src/shared/ui/quickview.tsx` |
| `QuickText` | `src/shared/ui/quickview.tsx` |
| `QuickHost` | `src/shared/ui/quickview.tsx` |
| `ReasonHost` | `src/shared/ui/reason.tsx` |
| `ReasonLog` | `src/shared/ui/reason.tsx` |
| `DataTable` | `src/shared/ui/table.tsx` |
| `PresetBar` | `src/shared/ui/table.tsx` |
| `OtherUpload` | `src/shared/ui/upload.tsx` |

## قانون‌های رابط کاربری که در کل پنل رعایت شده‌اند

1. **هر کارت شاخص کلیک‌خور است**: با `to` دقیق به نمای فیلترشده می‌رود، وگرنه به صفحهٔ جزئیات `/admin/insight/:label` (ریز موارد، نمودار روزانه، روش محاسبه). دکمهٔ «؟» منبع و فرمول را نشان می‌دهد.
2. **نمای فیلترشده همیشه نوار بازگشت دارد**: `?st=…&fl=…` روی هر `DataTable` فیلتر می‌کند و نوار «بازگشت / نمایش همه» نمایش داده می‌شود (`PresetBar`).
3. **هر میلهٔ نمودار کلیک‌خور است** و ریز موارد همان برچسب را باز می‌کند.
4. **نام مشتری و شمارهٔ سفارش در همهٔ جدول‌ها لینک است** (`CustLink`، `OrderLink`).
5. **انتخابگرها جست‌وجوپذیرند و «سایر» با متن اجباری دارند** (`Select`، `Segmented`).
6. **تاریخ‌ها شمسی‌اند** (`JDateInput`، `WhenPicker`).
7. **حالت‌های صفحه**: خالی، بارگذاری، خطا، بدون دسترسی و آفلاین برای همهٔ صفحه‌ها در `Page` پیاده شده و از نوار «نسخهٔ نمایشی» قابل امتحان است.
8. **عملیات برگشت‌ناپذیر** با تأیید (`confirm`) و دلیل (`askReason`) و ثبت در لاگ ممیزی؛ حذف به سطل بازیافت با امکان بازگردانی.
9. **متن بریده‌شده گم نمی‌شود**: عنوان کارت‌ها تا دو خط می‌شکند و هر متن کوتاه‌شده با نشانگر کامل دیده می‌شود (`fullText.ts`).
