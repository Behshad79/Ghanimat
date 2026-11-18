# ۰۵ · وضعیت‌ها، چرخهٔ عمر و قانون‌های کسب‌وکار

## وضعیت‌ها

منبع: `src/shared/data/statuses.ts`. هر وضعیت یک کد ماشینی (برای API و پایگاه‌داده) و یک برچسب فارسی و رنگ (`tone`) دارد. **کدها را عیناً در بک‌اند استفاده کنید.**

### `order`

| کد | برچسب | رنگ |
|---|---|---|
| `order.awaiting_payment` | در انتظار پرداخت | `neutral` |
| `order.awaiting_credit` | در انتظار تأیید اعتبار اقساطی | `warning` |
| `order.paid` | پرداخت‌شده | `info` |
| `order.needs_decision` | نیازمند تصمیم مشتری | `warning` |
| `order.preparing` | در حال آماده‌سازی | `info` |
| `order.shipped` | ارسال‌شده | `brand` |
| `order.pickup_ready` | آماده در شعبه، منتظر مراجعه | `warning` |
| `order.delivered` | تحویل‌شده | `success` |
| `order.cancelled` | لغوشده | `danger` |
| `order.returned` | مرجوع‌شده | `purple` |
| `order.suspicious` | مشکوک | `danger` |

### `ship`

| کد | برچسب | رنگ |
|---|---|---|
| `ship.pending` | در انتظار آماده‌سازی | `neutral` |
| `ship.partner_confirm` | در انتظار تأیید شریک | `warning` |
| `ship.picking` | در حال جمع‌آوری | `info` |
| `ship.packed` | بسته‌بندی‌شده | `info` |
| `ship.pickup_ready` | آماده در شعبه، منتظر مراجعه | `warning` |
| `ship.handed` | تحویل پیک شد | `brand` |
| `ship.in_transit` | در مسیر | `brand` |
| `ship.delivered` | تحویل‌شده | `success` |
| `ship.failed` | تحویل ناموفق | `danger` |
| `ship.cancelled` | لغوشده | `danger` |

### `unit`

| کد | برچسب | رنگ |
|---|---|---|
| `unit.in_transit` | در راه | `neutral` |
| `unit.received` | دریافت‌شده | `neutral` |
| `unit.qc` | در انتظار QC | `warning` |
| `unit.photo` | در انتظار عکاسی | `warning` |
| `unit.ready` | آمادهٔ انتشار | `info` |
| `unit.published` | منتشرشده | `success` |
| `unit.reserved` | رزروشده | `brand` |
| `unit.sold` | فروخته‌شده | `neutral` |
| `unit.returned` | مرجوع‌شده | `purple` |
| `unit.repair` | در تعمیر | `purple` |
| `unit.defective` | معیوب | `danger` |
| `unit.rejected` | ردشده در QC | `danger` |

### `product`

| کد | برچسب | رنگ |
|---|---|---|
| `product.published` | منتشرشده | `success` |
| `product.draft` | پیش‌نویس | `neutral` |
| `product.scheduled` | زمان‌بندی‌شده | `info` |
| `product.pending` | منتظر تأیید | `warning` |
| `product.incoming` | در راه (پیش‌ساخت) | `info` |
| `product.rejected` | ردشده | `danger` |
| `product.needs_fix` | نیازمند اصلاح | `warning` |

### `return`

| کد | برچسب | رنگ |
|---|---|---|
| `return.awaiting_customer` | در انتظار ارسال کالا توسط مشتری | `warning` |
| `return.awaiting_pickup` | در انتظار تحویل حضوری کالا | `warning` |
| `return.in_transit` | ارسال‌شده، در راه انبار غنیمت | `purple` |
| `return.inspecting` | در حال بررسی کالا | `purple` |
| `return.approved` | تأییدشده، منتظر تأیید مالی | `info` |
| `return.refunding` | تأییدشده، در حال واریز وجه | `info` |
| `return.approved_deducted` | تأییدشده با کسر هزینهٔ ارسال | `info` |
| `return.partial` | تأیید بخشی | `warning` |
| `return.rejected` | ردشده، ارسال مجدد کالا | `danger` |
| `return.refunded` | وجه واریز شد | `success` |
| `return.cancelled` | لغوشده توسط مشتری | `neutral` |
| `return.expired` | مهلت ارسال تمام شد | `danger` |

### `warranty`

| کد | برچسب | رنگ |
|---|---|---|
| `warranty.pending` | در انتظار بررسی | `warning` |
| `warranty.reviewing` | در حال بررسی | `purple` |
| `warranty.approved` | تأیید شد، منتظر ارسال کالا | `info` |
| `warranty.rejected` | رد شد | `danger` |
| `warranty.in_transit` | کالا در راه غنیمت | `purple` |
| `warranty.received` | دریافت و بررسی کالا در غنیمت | `purple` |
| `warranty.repairing` | در حال تعمیر | `purple` |
| `warranty.replaced` | تعویض شد | `info` |
| `warranty.shipping_back` | کالای تعمیرشده در راه مشتری | `info` |
| `warranty.refunded` | مبلغ بازگشت داده شد | `success` |
| `warranty.done` | خدمت تکمیل شد | `success` |
| `warranty.closed` | بسته شد، مهلت ارسال تمام شد | `neutral` |

### `ticket`

| کد | برچسب | رنگ |
|---|---|---|
| `ticket.new` | جدید | `brand` |
| `ticket.open` | در حال پیگیری | `info` |
| `ticket.needs_info` | نیازمند اطلاعات بیشتر | `warning` |
| `ticket.answered` | پاسخ داده‌شده | `success` |
| `ticket.closed` | بسته | `neutral` |
| `ticket.reopened` | بازگشایی‌شده | `warning` |

### `pay`

| کد | برچسب | رنگ |
|---|---|---|
| `pay.success` | موفق | `success` |
| `pay.failed` | ناموفق | `danger` |
| `pay.unknown` | نامشخص | `warning` |
| `pay.refunded` | برگشتی | `purple` |

### `approval`

| کد | برچسب | رنگ |
|---|---|---|
| `approval.pending` | منتظر تأیید | `warning` |
| `approval.approved` | تأییدشده | `success` |
| `approval.rejected` | ردشده | `danger` |

### `prov`

| کد | برچسب | رنگ |
|---|---|---|
| `prov.active` | فعال | `success` |
| `prov.testing` | آزمایشی | `info` |
| `prov.paused` | متوقف | `neutral` |
| `prov.error` | خطا | `danger` |
| `prov.slow` | کند | `warning` |
| `prov.retired` | بازنشسته | `neutral` |
| `prov.soon` | به‌زودی | `neutral` |

### `health`

| کد | برچسب | رنگ |
|---|---|---|
| `health.ok` | سالم | `success` |
| `health.warn` | هشدار | `warning` |
| `health.crit` | بحران | `danger` |

### `review`

| کد | برچسب | رنگ |
|---|---|---|
| `review.pending` | منتظر تأیید | `warning` |
| `review.approved` | تأییدشده | `success` |
| `review.rejected` | ردشده | `danger` |

## چرخهٔ عمر سفارش و مرسوله

- سفارش: `order.awaiting_payment` ← `order.paid` ← (`order.needs_decision` در کمبود موجودی، `order.suspicious` در ریسک بالا) ← `order.preparing` ← `order.shipped` ← `order.delivered`؛ لغو: `order.cancelled`.
- مرسوله (هر سفارش ممکن است چند مرسوله از چند انبار داشته باشد): `ship.pending` ← `ship.picking` ← **عکس بسته اجباری** ← `ship.packed` ← `ship.handed` / `ship.in_transit` ← `ship.delivered`. برای شعب: `ship.partner_confirm` پیش از آماده‌سازی.
- تحویل حضوری: `ship.pickup_ready` و ثبت تحویل با نام تحویل‌گیرنده (کد تحویل حذف شده است).
- یادداشت‌های سفارش (`customerNote`، `notes[]`): درخواست‌های «باید اعمال شود» تا «انجام شد» بالای سفارش، در پرتال شعبه، حالت ساده و برگهٔ جمع‌آوری نمایش داده می‌شوند.

## قانون‌های قابل تنظیم (`rules`)

| کلید | گروه | نام | مقدار نمونه | واحد | توضیح |
|---|---|---|---|---|---|
| `fast_delivery_hours` | ارسال | مدت وعدهٔ تحویل سریع | 2 | ساعت | از لحظهٔ پرداخت تا تحویل در محدودهٔ تحویل سریع. |
| `free_shipping_threshold` | ارسال | آستانهٔ ارسال رایگان | 10000000 | تومان | سبدهای بالاتر از این مبلغ ارسال رایگان دارند. |
| `cutoff_hour` | ارسال | ساعت قطع سفارش تحویل سریع | 19 | ساعت روز | سفارش‌های بعد از این ساعت، فردا تحویل می‌شوند. |
| `return_days` | مرجوعی | مهلت مرجوعی | 7 | روز | از زمان تحویل تا ثبت درخواست مرجوعی. |
| `inspection_hours` | مرجوعی | مهلت بازرسی مرجوعی | 48 | ساعت | از رسیدن بسته به انبار تا اعلام نتیجه. |
| `reserve_minutes` | موجودی و سبد | مدت رزرو واحد هنگام پرداخت | 15 | دقیقه | واحد از شروع پرداخت برای این مدت قفل می‌شود. |
| `low_stock_threshold` | موجودی و سبد | آستانهٔ «موجودی محدود» | 2 | عدد | کمتر یا مساوی این تعداد، بج «موجودی محدود» نمایش داده می‌شود. |
| `decision_hours` | سفارش | مهلت تصمیم مشتری در کمبود تأمین | 24 | ساعت | پس از پایان مهلت، قلم تأمین‌نشده خودکار لغو می‌شود. |
| `daily_sales_goal` | اهداف | هدف فروش روزانه | 600000000 | تومان | خط هدف نمودار «فروش روزانه در برابر هدف» و یادداشت کارت «فروش امروز». |
| `monthly_sales_goal` | اهداف | هدف فروش ماهانه | 15000000000 | تومان | پیشرفت ماه در داشبورد و گزارش‌های زمان‌بندی‌شده. |
| `ontime_goal` | اهداف | هدف تحویل به‌موقع | 95 | درصد | زیر این مقدار، کارت «تحویل به‌موقع» هشدار می‌دهد. |
| `margin_goal` | اهداف | هدف حاشیهٔ سود | 18 | درصد | حاشیهٔ هدف در میز قیمت‌گذاری و کارت سود. |
| `margin_floor` | قیمت | کف حاشیهٔ سود | 8 | درصد | قیمتی که حاشیه را زیر این مقدار ببرد، بدون تأیید مدیر ذخیره نمی‌شود. |
| `refund_cap` | پرداخت | سقف بازگشت وجه بدون تأیید دوم | 20000000 | تومان | بازگشت وجه بالاتر از این مبلغ به تأیید نفر دوم می‌رود. |
| `installments_shown` | پرداخت | تعداد اقساط نمایش‌داده‌شده | 4 | قسط | از سرویس اقساطی پیش‌فرض خوانده می‌شود. |
| `mahabad_buffer` | شریک انبار | ذخیرهٔ احتیاطی موجودی انبار مهاباد | 1 | عدد | موجودی انبار مهاباد با کسر این تعداد در سایت نمایش داده می‌شود. |
| `sync_stale_minutes` | شریک انبار | پنهان‌سازی خودکار پس از قدیمی‌شدن همگام‌سازی | 30 | دقیقه | اگر دادهٔ شریک قدیمی‌تر از این شود، کالاهای انبار مهاباد موقتاً ناموجود می‌شوند. |
| `vat_percent` | پرداخت | نرخ مالیات و عوارض ارزش افزوده | 0 | درصد | صفر یعنی روی فاکتور «طبق نرخ مصوب» چاپ شود؛ با وارد کردن نرخ، مبلغ محاسبه می‌شود. |
| `review_gift` | مشوق‌ها | هدیهٔ ثبت دیدگاه | 200000 | تومان | پس از پایان مهلت مرجوعی به کیف پول واریز می‌شود. |
| `otp_seconds` | حساب و امنیت | اعتبار کد یک‌بارمصرف | 120 | ثانیه | کد ورود همیشه با پیامک ارسال می‌شود. |

## قانون‌های دامنه که باید سمت سرور هم اجرا شوند

- **غنی‌آف** (`merch.deals`): یک کالا هم‌زمان دو غنی‌آف هم‌پوشان ندارد؛ با پایان زمان یا رسیدن `sold` به `cap` قیمت به `regular` برمی‌گردد؛ سقف خرید هر مشتری `perUser`. وضعیت از `dealStatus()` در `src/shared/data/merch.ts`.
- **جایگاه‌های ویترین** (`merch.placements`): قانون خودکار + سنجاق (`pins`) − پنهان (`excl`)؛ `placementItems()`.
- **ارسال سریع**: `fastOn()` در `src/shared/data/partners.ts` (تعطیلی فوری، توقف سراسری، توقف شعبه، فعال بودن ارسال سریع شعبه).
- **ترتیب برداشت موجودی**: `network.priority`؛ اولین نقطهٔ فعالِ دارای موجودی.
- **مدل سرمایهٔ شعب**: امانی (`hq`)، کالای شریک (`partner`)، مشترک (`shared`)؛ صورت‌حساب با `statement()`، امتیاز با `scorecard()`، دفتر حساب با `ledger()`.
- **کالای استوک و جعبه‌باز**: دست‌کم ۲ عکس واقعی همان واحد پیش از انتشار؛ کالای اکبند گرید ندارد.
- **حذف امن**: کالای دارای سفارش باز حذف نمی‌شود (پیشنهاد توقف فروش)؛ نقش دارای عضو با انتقال اعضا حذف می‌شود؛ دستهٔ دارای کالا با انتقال کالاها حذف می‌شود.
- **دلیل‌ها**: لغو، رد، مرجوعی و حذف همیشه با دلیل از فهرست قابل ویرایش (`reasonPresets`) و گزینهٔ «سایر» با متن اجباری.
