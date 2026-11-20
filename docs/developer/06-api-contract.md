# ۰۶ · قرارداد API و فهرست عملیات

پروتوتایپ بک‌اند ندارد. این سند می‌گوید سرور چه چیزی باید فراهم کند.

## اصول

1. **REST با JSON**، پیشوند `/api/v1`، احراز هویت با توکن حامل (JWT کوتاه‌عمر + refresh) پس از ورود با کد یکبارمصرف پیامکی.
2. **هر مجموعه در `04-data-model.md` یک منبع (resource) است**: `GET /api/v1/{collection}` با صفحه‌بندی (`page`، `size`)، مرتب‌سازی (`sort`)، جست‌وجو (`q`) و فیلتر وضعیت (`status` با کدهای `05-statuses-and-rules.md`)؛ `GET/PATCH/DELETE /api/v1/{collection}/{id}` و `POST /api/v1/{collection}`.
3. **هر عملیات دامنه یک endpoint فعل‌دار است** نه یک PATCH خام؛ مثلاً `POST /api/v1/orders/{id}/cancel` با بدنهٔ `{ reasonCode, reasonText }`. فهرست کامل عملیات‌ها پایین همین سند است (355 فراخوانی در کد، هر کدام با خط دقیق).
4. **دسترسی سمت سرور** با همان شناسه‌های ماژول `03-screens-and-routes.md` و جدول مجوز عملیات (`perms`: `allow` / `approve` / `deny`). عملیات نیازمند تأیید یک ردیف در `approvals` می‌سازد.
5. **لاگ ممیزی** برای همهٔ عملیات نوشتنی: کاربر، عملیات، هدف، مقدار قبل و بعد، زمان، IP. ساختار ردیف همان `audit` در دادهٔ نمونه.
6. **حذف نرم**: حذف به `trash` می‌رود و قابل بازگردانی است.
7. **رویدادها**: تغییر وضعیت سفارش، مرسوله، پرداخت و موجودی یک رویداد منتشر می‌کند (برای وب‌هوک‌ها `hub.webhooks`، پیامک‌ها `delivery`/`nudges` و ربات تلگرام `remote`).
8. **زمان‌ها** ISO-8601 با منطقهٔ تهران؛ نمایش شمسی فقط در کلاینت. **مبالغ** عدد صحیح به تومان.

- اسکیمای ماشینی: **`openapi.yaml`** (قابل باز کردن در Swagger UI، Postman، Stoplight یا تولید کد کلاینت با openapi-generator).
- دادهٔ نمونهٔ کامل برای seed پایگاه‌داده و تست: **`sample-db.json`**.

## فهرست عملیات نوشتنی به تفکیک فایل

### `src/admin/agents/Agents.tsx` — ماژول `agents`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| صدور کلید دسترسی ایجنت | [53](../../src/admin/agents/Agents.tsx#L53) |
| ابطال کلید ایجنت | [71](../../src/admin/agents/Agents.tsx#L71) |
| ذخیرهٔ دسترسی ایجنت | [89](../../src/admin/agents/Agents.tsx#L89) |
| دستور تازه به ایجنت | [116](../../src/admin/agents/Agents.tsx#L116) |
| اجرای کار ایجنت | [134](../../src/admin/agents/Agents.tsx#L134) |
| ذخیرهٔ دستورالعمل ایجنت | [169](../../src/admin/agents/Agents.tsx#L169) |
| اتوماسیون تازه | [192](../../src/admin/agents/Agents.tsx#L192) |
### `src/admin/analytics/Traffic.tsx` — ماژول `analytics`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ارسال جست‌وجوی بی‌نتیجه به تأمین | [51](../../src/admin/analytics/Traffic.tsx#L51) |
| افزودن مترادف جست‌وجو | [54](../../src/admin/analytics/Traffic.tsx#L54) |
| خروج از نشست از راه دور | [65](../../src/admin/analytics/Traffic.tsx#L65) |
| خروج از همهٔ نشست‌های دیگر | [73](../../src/admin/analytics/Traffic.tsx#L73) |
| حذف استوری | [86](../../src/admin/analytics/Traffic.tsx#L86) |
| ذخیرهٔ استوری | [86](../../src/admin/analytics/Traffic.tsx#L86) |
### `src/admin/blog/Blog.tsx` — ماژول `blog`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت مقالهٔ تازه | [21](../../src/admin/blog/Blog.tsx#L21) |
| تغییر مقالهٔ ویژه | [41](../../src/admin/blog/Blog.tsx#L41) |
| تکثیر مقاله | [41](../../src/admin/blog/Blog.tsx#L41) |
| حذف مقاله | [41](../../src/admin/blog/Blog.tsx#L41) |
| تغییر مطالب ترند | [55](../../src/admin/blog/Blog.tsx#L55) |
| تغییر بخش صفحهٔ وبلاگ | [57](../../src/admin/blog/Blog.tsx#L57) |
| تغییر ویدیوی ویژه | [62](../../src/admin/blog/Blog.tsx#L62) |
| تأیید دیدگاه وبلاگ | [71](../../src/admin/blog/Blog.tsx#L71) |
| رد دیدگاه وبلاگ | [71](../../src/admin/blog/Blog.tsx#L71) |
| پاسخ به دیدگاه وبلاگ | [72](../../src/admin/blog/Blog.tsx#L72) |
| ساخت مقاله از جست‌وجوی بی‌نتیجه | [77](../../src/admin/blog/Blog.tsx#L77) |
| افزودن برچسب پرطرفدار | [77](../../src/admin/blog/Blog.tsx#L77) |
| حذف دسته | [88](../../src/admin/blog/Blog.tsx#L88) |
| افزودن دسته | [89](../../src/admin/blog/Blog.tsx#L89) |
| ذخیرهٔ ویدیو | [91](../../src/admin/blog/Blog.tsx#L91) |
| حذف ویدیو | [91](../../src/admin/blog/Blog.tsx#L91) |
| انتقال محتوا و حذف دسته | [106](../../src/admin/blog/Blog.tsx#L106) |
### `src/admin/builder/Builder.tsx` — ماژول `pages`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتشار صفحه‌ساز | [44](../../src/admin/builder/Builder.tsx#L44) |
### `src/admin/builder/BuilderTabs.tsx` — ماژول `pages`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تعویض بنر | [33](../../src/admin/builder/BuilderTabs.tsx#L33) |
| افزودن دسته | [80](../../src/admin/builder/BuilderTabs.tsx#L80) |
| جابه‌جایی دسته | [82](../../src/admin/builder/BuilderTabs.tsx#L82) |
| حذف دسته | [87](../../src/admin/builder/BuilderTabs.tsx#L87) |
| انتقال کالاها و حذف دسته | [89](../../src/admin/builder/BuilderTabs.tsx#L89) |
| افزودن نشان کارت | [103](../../src/admin/builder/BuilderTabs.tsx#L103) |
| حذف نشان کارت | [104](../../src/admin/builder/BuilderTabs.tsx#L104) |
| ساخت مقاله | [130](../../src/admin/builder/BuilderTabs.tsx#L130) |
| انتشار مقاله | [131](../../src/admin/builder/BuilderTabs.tsx#L131) |
| تغییر اشتراک خبرنامه | [161](../../src/admin/builder/BuilderTabs.tsx#L161) |
### `src/admin/catalog/BatchLedger.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| پیش‌ساخت صفحهٔ کالا از محموله | [76](../../src/admin/catalog/BatchLedger.tsx#L76) |
| افزودن محتوای اینستاگرام از محموله | [77](../../src/admin/catalog/BatchLedger.tsx#L77) |
| مقالهٔ معرفی از محموله | [78](../../src/admin/catalog/BatchLedger.tsx#L78) |
### `src/admin/catalog/BuyList.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن به لیست خرید | [33](../../src/admin/catalog/BuyList.tsx#L33) |
| حذف از لیست خرید | [56](../../src/admin/catalog/BuyList.tsx#L56) |
| ثبت سفارش خرید | [99](../../src/admin/catalog/BuyList.tsx#L99) |
### `src/admin/catalog/Catalog.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| کپی کالا | [39](../../src/admin/catalog/Catalog.tsx#L39) |
| انتقال کالا به سطل بازیافت | [44](../../src/admin/catalog/Catalog.tsx#L44) |
| تعدیل موجودی | [75](../../src/admin/catalog/Catalog.tsx#L75) |
| ویرایش واحد | [86](../../src/admin/catalog/Catalog.tsx#L86) |
| تغییر وضعیت فروش واحد | [119](../../src/admin/catalog/Catalog.tsx#L119) |
| انتقال واحد به سطل بازیافت | [121](../../src/admin/catalog/Catalog.tsx#L121) |
| انتشار گروهی | [161](../../src/admin/catalog/Catalog.tsx#L161) |
| توقف فروش گروهی | [162](../../src/admin/catalog/Catalog.tsx#L162) |
| حذف گروهی کالا | [164](../../src/admin/catalog/Catalog.tsx#L164) |
| چاپ برچسب کالا | [281](../../src/admin/catalog/Catalog.tsx#L281) |
| حذف دائمی | [302](../../src/admin/catalog/Catalog.tsx#L302) |
### `src/admin/catalog/Choices.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن مقدار تنوع | [78](../../src/admin/catalog/Choices.tsx#L78) |
| ساخت ویژگی تنوع | [81](../../src/admin/catalog/Choices.tsx#L81) |
### `src/admin/catalog/CsvImport.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ورود گروهی کالا از اکسل | [37](../../src/admin/catalog/CsvImport.tsx#L37) |
### `src/admin/catalog/Incoming.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| شروع پیش‌ساخت صفحهٔ کالای در راه | [42](../../src/admin/catalog/Incoming.tsx#L42) |
| سناریوی اینستاگرام برای کالای در راه | [45](../../src/admin/catalog/Incoming.tsx#L45) |
| مقالهٔ پیش از رسیدن | [46](../../src/admin/catalog/Incoming.tsx#L46) |
| حذف خرید در راه | [90](../../src/admin/catalog/Incoming.tsx#L90) |
| افزودن اقلام به خرید در راه | [107](../../src/admin/catalog/Incoming.tsx#L107) |
| رسید خرید در راه و انتشار | [139](../../src/admin/catalog/Incoming.tsx#L139) |
### `src/admin/catalog/LinkExtras.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن نظرات آمازون به کالا | [41](../../src/admin/catalog/LinkExtras.tsx#L41) |
### `src/admin/catalog/PdpExtras.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت قیمت فعلی در تاریخچه | [90](../../src/admin/catalog/PdpExtras.tsx#L90) |
| به‌روزرسانی قیمت با نرخ روز ارز | [123](../../src/admin/catalog/PdpExtras.tsx#L123) |
### `src/admin/catalog/Readiness.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر وضعیت محتوا | [75](../../src/admin/catalog/Readiness.tsx#L75) |
| افزودن به صف محتوا | [76](../../src/admin/catalog/Readiness.tsx#L76) |
### `src/admin/catalog/Repricing.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| بازقیمت‌گذاری با نرخ ارز | [53](../../src/admin/catalog/Repricing.tsx#L53) |
### `src/admin/catalog/VariableEditor.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن مقدار ویژگی | [42](../../src/admin/catalog/VariableEditor.tsx#L42) |
| ویرایش مقدار ویژگی سراسری | [46](../../src/admin/catalog/VariableEditor.tsx#L46) |
| حذف مقدار ویژگی سراسری | [54](../../src/admin/catalog/VariableEditor.tsx#L54) |
| تعدیل موجودی تنوع‌ها | [185](../../src/admin/catalog/VariableEditor.tsx#L185) |
### `src/admin/catalog/VariantMatrix.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت تنوع‌های کالا | [37](../../src/admin/catalog/VariantMatrix.tsx#L37) |
### `src/admin/catalog/VariantProfit.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| به‌روزرسانی قیمت تنوع‌ها با نرخ روز | [66](../../src/admin/catalog/VariantProfit.tsx#L66) |
### `src/admin/catalog/Wizard.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| پیش‌ساخت صفحهٔ کالای در راه | [127](../../src/admin/catalog/Wizard.tsx#L127) |
| بارگذاری تصویر کالا | [174](../../src/admin/catalog/Wizard.tsx#L174) |
| افزودن ویژگی به قالب | [195](../../src/admin/catalog/Wizard.tsx#L195) |
| بارگذاری آیکون خط کارت | [401](../../src/admin/catalog/Wizard.tsx#L401) |
### `src/admin/customer/Customer360.tsx` — ماژول `customers`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر دستی امتیاز باشگاه | [126](../../src/admin/customer/Customer360.tsx#L126) |
### `src/admin/cx/Calls.tsx` — ماژول `cx`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر وضعیت کارشناس تلفن | [51](../../src/admin/cx/Calls.tsx#L51) |
| ویرایش منوی صوتی | [53](../../src/admin/cx/Calls.tsx#L53) |
| ویرایش صف منوی صوتی | [53](../../src/admin/cx/Calls.tsx#L53) |
| ویرایش پیغام خارج از ساعت | [55](../../src/admin/cx/Calls.tsx#L55) |
| اتصال تلفن ابری | [61](../../src/admin/cx/Calls.tsx#L61) |
| ساخت تیکت از تماس | [64](../../src/admin/cx/Calls.tsx#L64) |
### `src/admin/cx/CxSettings.tsx` — ماژول `cx`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت مترادف از جست‌وجوی بی‌نتیجه | [48](../../src/admin/cx/CxSettings.tsx#L48) |
| تغییر کانال اعلان مشتری | [65](../../src/admin/cx/CxSettings.tsx#L65) |
### `src/admin/cx/Messaging.tsx` — ماژول `cx`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ارسال پیام دستی | [58](../../src/admin/cx/Messaging.tsx#L58) |
### `src/admin/cx/ReviewExtras.tsx` — ماژول `cx`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| بررسی گزارش دیدگاه: بدون مشکل | [29](../../src/admin/cx/ReviewExtras.tsx#L29) |
| حذف دیدگاه گزارش‌شده | [30](../../src/admin/cx/ReviewExtras.tsx#L30) |
| حذف پاسخ رسمی دیدگاه | [33](../../src/admin/cx/ReviewExtras.tsx#L33) |
| پاسخ رسمی به دیدگاه | [34](../../src/admin/cx/ReviewExtras.tsx#L34) |
| حذف پاسخ | [62](../../src/admin/cx/ReviewExtras.tsx#L62) |
| پاسخ کارشناس به پرسش | [64](../../src/admin/cx/ReviewExtras.tsx#L64) |
| پرسیدن از خریداران قبلی | [65](../../src/admin/cx/ReviewExtras.tsx#L65) |
### `src/admin/cx/TicketExtras.tsx` — ماژول `cx`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| درخواست اطلاعات بیشتر | [37](../../src/admin/cx/TicketExtras.tsx#L37) |
| پیشنهاد ثبت مرجوعی در تیکت | [54](../../src/admin/cx/TicketExtras.tsx#L54) |
| بستن تیکت به‌دلیل پاسخ ندادن مشتری | [79](../../src/admin/cx/TicketExtras.tsx#L79) |
### `src/admin/finance/Money.tsx` — ماژول `finance`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر دستی موعد تسویه | [56](../../src/admin/finance/Money.tsx#L56) |
| ثبت واریز سرویس پرداخت | [59](../../src/admin/finance/Money.tsx#L59) |
### `src/admin/logistics/ZoneMap.tsx` — ماژول `shipping`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر شهرهای منطقهٔ ارسال | [21](../../src/admin/logistics/ZoneMap.tsx#L21) |
### `src/admin/media/Media.tsx` — ماژول `media`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| بارگذاری در کتابخانهٔ رسانه | [35](../../src/admin/media/Media.tsx#L35) |
| ویرایش تصویر | [71](../../src/admin/media/Media.tsx#L71) |
| حذف از کتابخانهٔ رسانه | [121](../../src/admin/media/Media.tsx#L121) |
| افزودن تصویر از کتابخانه به کالا | [143](../../src/admin/media/Media.tsx#L143) |
| نوشتن عنوان سئو با AI برای فایل‌های بدون عنوان | [159](../../src/admin/media/Media.tsx#L159) |
### `src/admin/merch/Merch.tsx` — ماژول `merch`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| حذف غنی‌آف از صف | [101](../../src/admin/merch/Merch.tsx#L101) |
| تغییر جایگاه نمایش کالا | [203](../../src/admin/merch/Merch.tsx#L203) |
### `src/admin/orders/Decision.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| اعلام کمبود تأمین به مشتری | [111](../../src/admin/orders/Decision.tsx#L111) |
### `src/admin/orders/DeliverConfirm.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت تحویل به مشتری | [34](../../src/admin/orders/DeliverConfirm.tsx#L34) |
### `src/admin/orders/History.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| برگرداندن وضعیت مرسوله | [33](../../src/admin/orders/History.tsx#L33) |
### `src/admin/orders/OrderEvents.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ارسال گزینه‌های جایگزین به مشتری | [34](../../src/admin/orders/OrderEvents.tsx#L34) |
| تغییر مقصد بازگشت وجه به کیف پول | [122](../../src/admin/orders/OrderEvents.tsx#L122) |
### `src/admin/orders/OrderTools.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت سفارش دستی | [40](../../src/admin/orders/OrderTools.tsx#L40) |
| ویرایش سفارش | [131](../../src/admin/orders/OrderTools.tsx#L131) |
| ویرایش نشانی سفارش | [210](../../src/admin/orders/OrderTools.tsx#L210) |
| تماس تلفنی | [231](../../src/admin/orders/OrderTools.tsx#L231) |
### `src/admin/orders/PaymentInfo.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| استعلام وضعیت تراکنش از درگاه | [48](../../src/admin/orders/PaymentInfo.tsx#L48) |
### `src/admin/orders/Progress.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت مأمور ارسال و پلاک | [45](../../src/admin/orders/Progress.tsx#L45) |
| ثبت کد رهگیری پستی | [93](../../src/admin/orders/Progress.tsx#L93) |
| تغییر روش ارسال | [118](../../src/admin/orders/Progress.tsx#L118) |
### `src/admin/orders/Refunds.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| حذف پروندهٔ بازگشت وجه | [57](../../src/admin/orders/Refunds.tsx#L57) |
| واریز بازگشت وجه به کیف پول | [71](../../src/admin/orders/Refunds.tsx#L71) |
### `src/admin/orders/ReturnTools.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت دستی مرجوعی | [71](../../src/admin/orders/ReturnTools.tsx#L71) |
| ثبت دستی درخواست گارانتی | [78](../../src/admin/orders/ReturnTools.tsx#L78) |
### `src/admin/pages/Catalog.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تعریف بج کارت محصول | [36](../../src/admin/pages/Catalog.tsx#L36) |
| ساخت پیش‌نویس از لینک | [57](../../src/admin/pages/Catalog.tsx#L57) |
### `src/admin/pages/Home.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر ویجت‌های خانه | [36](../../src/admin/pages/Home.tsx#L36) |
| حذف ویجت سنجاق‌شده | [94](../../src/admin/pages/Home.tsx#L94) |
| باز کردن رخداد | [126](../../src/admin/pages/Home.tsx#L126) |
### `src/admin/pages/Insights.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تخصیص هزینهٔ محموله | [44](../../src/admin/pages/Insights.tsx#L44) |
| دریافت محموله | [44](../../src/admin/pages/Insights.tsx#L44) |
| ثبت دستی نرخ ارز روز | [46](../../src/admin/pages/Insights.tsx#L46) |
| ساخت سفارش خرید از فرصت | [47](../../src/admin/pages/Insights.tsx#L47) |
| جابه‌جایی بلوک خانه | [56](../../src/admin/pages/Insights.tsx#L56) |
| ذخیرهٔ نوار بالا | [66](../../src/admin/pages/Insights.tsx#L66) |
| ساخت نسخهٔ تازهٔ متن حقوقی | [71](../../src/admin/pages/Insights.tsx#L71) |
| تأیید حقوقی متن | [71](../../src/admin/pages/Insights.tsx#L71) |
| نوشتن توضیح متا با AI | [86](../../src/admin/pages/Insights.tsx#L86) |
| رفع خطای سئو | [87](../../src/admin/pages/Insights.tsx#L87) |
| ساخت بریف محتوا | [89](../../src/admin/pages/Insights.tsx#L89) |
| ساخت کمپین | [110](../../src/admin/pages/Insights.tsx#L110) |
| اعمال نسخهٔ برنده | [132](../../src/admin/pages/Insights.tsx#L132) |
| افزودن ویجت به داشبورد | [153](../../src/admin/pages/Insights.tsx#L153) |
| زمان‌بندی گزارش | [153](../../src/admin/pages/Insights.tsx#L153) |
| تغییر سطح خودمختاری AI | [165](../../src/admin/pages/Insights.tsx#L165) |
### `src/admin/pages/Ops.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| اصلاح موجودی طبق سایت شریک | [85](../../src/admin/pages/Ops.tsx#L85) |
| بازنشستگی ارائه‌دهنده | [149](../../src/admin/pages/Ops.tsx#L149) |
| تست اتصال | [158](../../src/admin/pages/Ops.tsx#L158) |
| تغییر پیش‌فرض | [159](../../src/admin/pages/Ops.tsx#L159) |
| فعال‌سازی ارائه‌دهنده | [160](../../src/admin/pages/Ops.tsx#L160) |
| افزودن ارائه‌دهنده | [165](../../src/admin/pages/Ops.tsx#L165) |
| توقف موقت ارائه‌دهنده | [169](../../src/admin/pages/Ops.tsx#L169) |
| نامعتبر کردن گارانتی | [234](../../src/admin/pages/Ops.tsx#L234) |
| معتبر کردن دوبارهٔ گارانتی | [235](../../src/admin/pages/Ops.tsx#L235) |
| الحاق کد رهگیری با اسکن | [284](../../src/admin/pages/Ops.tsx#L284) |
| ثبت کد رهگیری از فایل باجه | [313](../../src/admin/pages/Ops.tsx#L313) |
### `src/admin/pages/Orders.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تخصیص سفارش به انباردار | [97](../../src/admin/pages/Orders.tsx#L97) |
| الحاق کد رهگیری | [117](../../src/admin/pages/Orders.tsx#L117) |
| ثبت پیک با لینک | [138](../../src/admin/pages/Orders.tsx#L138) |
| لغو مرسوله | [185](../../src/admin/pages/Orders.tsx#L185) |
| درخواست بازگشت وجه | [193](../../src/admin/pages/Orders.tsx#L193) |
| بازگشت وجه | [194](../../src/admin/pages/Orders.tsx#L194) |
| تأیید سفارش مشکوک | [253](../../src/admin/pages/Orders.tsx#L253) |
| یادداشت داخلی | [312](../../src/admin/pages/Orders.tsx#L312) |
| ساخت تیکت | [322](../../src/admin/pages/Orders.tsx#L322) |
### `src/admin/pages/Org.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر مجوز | [45](../../src/admin/pages/Org.tsx#L45) |
| درخواست تغییر قانون | [60](../../src/admin/pages/Org.tsx#L60) |
| تغییر قانون کسب‌وکار | [62](../../src/admin/pages/Org.tsx#L62) |
| تعریف پارامتر کسب‌وکار | [71](../../src/admin/pages/Org.tsx#L71) |
| ارسال پیامک آزمایشی | [99](../../src/admin/pages/Org.tsx#L99) |
| آزمایش زنجیرهٔ اعلان | [102](../../src/admin/pages/Org.tsx#L102) |
| ارسال گزارش وضعیت فنی | [127](../../src/admin/pages/Org.tsx#L127) |
### `src/admin/pages/People.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| شارژ کیف پول | [29](../../src/admin/pages/People.tsx#L29) |
| ساخت کمپین از بخش | [40](../../src/admin/pages/People.tsx#L40) |
| افزودن مدرک حقوقی | [48](../../src/admin/pages/People.tsx#L48) |
| تأیید حساب حقوقی | [50](../../src/admin/pages/People.tsx#L50) |
| درخواست تکمیل مدارک حقوقی | [50](../../src/admin/pages/People.tsx#L50) |
| رد حساب حقوقی | [50](../../src/admin/pages/People.tsx#L50) |
| اهدای کد تخفیف | [79](../../src/admin/pages/People.tsx#L79) |
| ورود به‌جای مشتری (فقط مشاهده) | [79](../../src/admin/pages/People.tsx#L79) |
| مسدودسازی مشتری | [79](../../src/admin/pages/People.tsx#L79) |
| ارجاع به شریک انبار | [113](../../src/admin/pages/People.tsx#L113) |
| تخصیص تیکت به من | [116](../../src/admin/pages/People.tsx#L116) |
| درخواست بارگذاری دوبارهٔ مدرک | [176](../../src/admin/pages/People.tsx#L176) |
### `src/admin/pages/Revenue.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر قیمت گروهی (مدیر کل) | [28](../../src/admin/pages/Revenue.tsx#L28) |
| درخواست تغییر قیمت گروهی | [29](../../src/admin/pages/Revenue.tsx#L29) |
| استعلام تراکنش | [66](../../src/admin/pages/Revenue.tsx#L66) |
| تأیید درخواست | [87](../../src/admin/pages/Revenue.tsx#L87) |
| رد درخواست | [87](../../src/admin/pages/Revenue.tsx#L87) |
| بازسازی فید کانال | [102](../../src/admin/pages/Revenue.tsx#L102) |
### `src/admin/pages/SellerSettings.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش اطلاعات فروشنده و انبارها | [44](../../src/admin/pages/SellerSettings.tsx#L44) |
### `src/admin/partner/Network.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| برداشتن توقف | [34](../../src/admin/partner/Network.tsx#L34) |
| تنظیم ارسال سریع شعبه | [35](../../src/admin/partner/Network.tsx#L35) |
| ترتیب برداشت موجودی | [36](../../src/admin/partner/Network.tsx#L36) |
### `src/admin/partner/Partner.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تحویل به پست و ثبت رهگیری (شریک) | [35](../../src/admin/partner/Partner.tsx#L35) |
| ثبت فروش حضوری در شعبه | [36](../../src/admin/partner/Partner.tsx#L36) |
| ثبت اختلاف تسویه | [102](../../src/admin/partner/Partner.tsx#L102) |
| اصلاح ناهماهنگی (شریک) | [122](../../src/admin/partner/Partner.tsx#L122) |
| اعلام «ندارم» پس از فروش (شریک) | [129](../../src/admin/partner/Partner.tsx#L129) |
| ارسال کالای جدید شریک برای تأیید | [132](../../src/admin/partner/Partner.tsx#L132) |
### `src/admin/partner/PartnerOps.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| توضیح شعبه دربارهٔ نظر مشتری | [106](../../src/admin/partner/PartnerOps.tsx#L106) |
| ثبت کالای تازهٔ شعبه برای تأیید | [157](../../src/admin/partner/PartnerOps.tsx#L157) |
### `src/admin/partner/PartnersAdmin.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن شعبه یا شریک فروش | [62](../../src/admin/partner/PartnersAdmin.tsx#L62) |
| تغییر مدل سرمایهٔ محموله | [99](../../src/admin/partner/PartnersAdmin.tsx#L99) |
| ثبت محمولهٔ شعبه | [115](../../src/admin/partner/PartnersAdmin.tsx#L115) |
### `src/admin/people/People.tsx` — ماژول `people`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت پروندهٔ پرسنلی | [46](../../src/admin/people/People.tsx#L46) |
| تغییر نرخ حقوق و بیمه | [73](../../src/admin/people/People.tsx#L73) |
### `src/admin/people/Vault.tsx` — ماژول `people`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتقال سند به سطل بازیافت | [27](../../src/admin/people/Vault.tsx#L27) |
### `src/admin/print/BatchPrint.tsx` — ماژول `print`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| چاپ گروهی | [72](../../src/admin/print/BatchPrint.tsx#L72) |
### `src/admin/print/EditableDoc.tsx` — ماژول `print`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش دستی سند | [11](../../src/admin/print/EditableDoc.tsx#L11) |
| حذف ویرایش دستی سند | [16](../../src/admin/print/EditableDoc.tsx#L16) |
### `src/admin/print/PrintCenter.tsx` — ماژول `print`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| چاپ سند | [54](../../src/admin/print/PrintCenter.tsx#L54) |
| ذخیرهٔ قالب چاپ | [100](../../src/admin/print/PrintCenter.tsx#L100) |
| اعمال سبک روی همهٔ اسناد | [100](../../src/admin/print/PrintCenter.tsx#L100) |
| بازگردانی نسخهٔ قالب چاپ | [108](../../src/admin/print/PrintCenter.tsx#L108) |
### `src/admin/pro/CatalogPro.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تنظیم گروهی متاتگ | [30](../../src/admin/pro/CatalogPro.tsx#L30) |
| انتشار گروهی | [31](../../src/admin/pro/CatalogPro.tsx#L31) |
| ویرایش جدولی قیمت | [38](../../src/admin/pro/CatalogPro.tsx#L38) |
| تغییر کالای مشابه | [61](../../src/admin/pro/CatalogPro.tsx#L61) |
| ساخت باندل | [66](../../src/admin/pro/CatalogPro.tsx#L66) |
| حذف باندل | [67](../../src/admin/pro/CatalogPro.tsx#L67) |
| تعیین مسئول محتوا | [85](../../src/admin/pro/CatalogPro.tsx#L85) |
| اجرای پایپ‌لاین رسانه | [97](../../src/admin/pro/CatalogPro.tsx#L97) |
| ساخت Alt با AI | [106](../../src/admin/pro/CatalogPro.tsx#L106) |
| افزودن تصویر از کتابخانهٔ رسانه | [110](../../src/admin/pro/CatalogPro.tsx#L110) |
### `src/admin/pro/CouponForm.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت کد تخفیف | [28](../../src/admin/pro/CouponForm.tsx#L28) |
### `src/admin/pro/Integrations.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر وضعیت وب‌هوک | [31](../../src/admin/pro/Integrations.tsx#L31) |
| حذف وب‌هوک | [32](../../src/admin/pro/Integrations.tsx#L32) |
| ارسال دوبارهٔ وب‌هوک | [34](../../src/admin/pro/Integrations.tsx#L34) |
| افزودن وب‌هوک | [40](../../src/admin/pro/Integrations.tsx#L40) |
| اتصال سرویس | [49](../../src/admin/pro/Integrations.tsx#L49) |
| قطع اتصال سرویس | [49](../../src/admin/pro/Integrations.tsx#L49) |
### `src/admin/pro/PriceWatch.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| هم‌قیمت شدن با رقیب | [47](../../src/admin/pro/PriceWatch.tsx#L47) |
### `src/admin/pro/Promotions.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| pct | [26](../../src/admin/pro/Promotions.tsx#L26) |
### `src/admin/pro/SeoPro.tsx` — ماژول `integrations`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ذخیرهٔ متای کالا | [24](../../src/admin/pro/SeoPro.tsx#L24) |
| ذخیرهٔ اسکیما و ایندکس | [60](../../src/admin/pro/SeoPro.tsx#L60) |
| ساخت صفحهٔ فرود سئو | [88](../../src/admin/pro/SeoPro.tsx#L88) |
### `src/admin/returns/Case.tsx` — ماژول `returns`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| نتیجهٔ بازرسی مرجوعی | [197](../../src/admin/returns/Case.tsx#L197) |
| تأیید بازگشت وجه | [233](../../src/admin/returns/Case.tsx#L233) |
| ارسال مجدد کالای ردشدهٔ مرجوعی | [259](../../src/admin/returns/Case.tsx#L259) |
| تعویض واحد گارانتی | [398](../../src/admin/returns/Case.tsx#L398) |
| دریافت واحد مرجوعی | [427](../../src/admin/returns/Case.tsx#L427) |
| بازگشت وجه | [455](../../src/admin/returns/Case.tsx#L455) |
### `src/admin/settings/FeedsApi.tsx` — ماژول `settings`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ابطال کلید API | [54](../../src/admin/settings/FeedsApi.tsx#L54) |
| ساخت کلید API | [70](../../src/admin/settings/FeedsApi.tsx#L70) |
### `src/admin/shared/PackPhotos.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت عکس پیش از ارسال | [21](../../src/admin/shared/PackPhotos.tsx#L21) |
| حذف عکس پیش از ارسال | [33](../../src/admin/shared/PackPhotos.tsx#L33) |
### `src/admin/shell/Copilot.tsx` — ماژول `shell`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| کاهش قیمت گروهی ۵٪ | [25](../../src/admin/shell/Copilot.tsx#L25) |
| افزودن ویجت از دستیار | [29](../../src/admin/shell/Copilot.tsx#L29) |
### `src/admin/simple/Simple.tsx` — ماژول `ops`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| درخواست از مدیر | [102](../../src/admin/simple/Simple.tsx#L102) |
| تأیید سفارش (حالت سریع) | [127](../../src/admin/simple/Simple.tsx#L127) |
| لغو سفارش (حالت سریع) | [128](../../src/admin/simple/Simple.tsx#L128) |
| بسته آماده شد (حالت سریع) | [138](../../src/admin/simple/Simple.tsx#L138) |
| پاسخ به مشتری (حالت سریع) | [168](../../src/admin/simple/Simple.tsx#L168) |
| کاهش موجودی (حالت سریع) | [187](../../src/admin/simple/Simple.tsx#L187) |
| افزایش موجودی (حالت سریع) | [187](../../src/admin/simple/Simple.tsx#L187) |
| تغییر قیمت (حالت سریع) | [188](../../src/admin/simple/Simple.tsx#L188) |
| ثبت سفارش تلفنی (حالت سریع) | [207](../../src/admin/simple/Simple.tsx#L207) |
| دریافت مرجوعی (حالت سریع) | [232](../../src/admin/simple/Simple.tsx#L232) |
| مغایرت مرجوعی با عکس ارسال (حالت سریع) | [233](../../src/admin/simple/Simple.tsx#L233) |
| تأیید دیدگاه (حالت سریع) | [244](../../src/admin/simple/Simple.tsx#L244) |
| رد دیدگاه (حالت سریع) | [244](../../src/admin/simple/Simple.tsx#L244) |
### `src/admin/site/SiteEditor.tsx` — ماژول `site`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتشار تغییرات سایت | [66](../../src/admin/site/SiteEditor.tsx#L66) |
| دور ریختن پیش‌نویس سایت | [69](../../src/admin/site/SiteEditor.tsx#L69) |
| حذف بلوک صفحهٔ خانه | [107](../../src/admin/site/SiteEditor.tsx#L107) |
| افزودن بلوک صفحهٔ خانه | [110](../../src/admin/site/SiteEditor.tsx#L110) |
| بازگردانی نسخهٔ سایت به پیش‌نویس | [184](../../src/admin/site/SiteEditor.tsx#L184) |
### `src/admin/social/Social.tsx` — ماژول `social`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تطبیق خودکار کارت به کارت | [45](../../src/admin/social/Social.tsx#L45) |
| تأیید دستی کارت به کارت | [73](../../src/admin/social/Social.tsx#L73) |
| رد رسید کارت به کارت | [73](../../src/admin/social/Social.tsx#L73) |
| ثبت واریز بانکی | [80](../../src/admin/social/Social.tsx#L80) |
| تغییر روش اتصال کارت | [88](../../src/admin/social/Social.tsx#L88) |
| افزودن کارت بانکی | [92](../../src/admin/social/Social.tsx#L92) |
### `src/admin/stock/ExtSites.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت سفارش سایت شریک در دفتر | [46](../../src/admin/stock/ExtSites.tsx#L46) |
| ثبت فروش حضوری با اسکن | [100](../../src/admin/stock/ExtSites.tsx#L100) |
### `src/admin/stock/Inspect.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر قیمت از استعلام اسکن | [30](../../src/admin/stock/Inspect.tsx#L30) |
| افزودن کالا به سفارش از استعلام اسکن | [82](../../src/admin/stock/Inspect.tsx#L82) |
### `src/admin/stock/OrderLedger.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر کانال تسویهٔ سفارش | [18](../../src/admin/stock/OrderLedger.tsx#L18) |
### `src/admin/stock/Ownership.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ورود موجودی با مالک مشخص | [95](../../src/admin/stock/Ownership.tsx#L95) |
| انتقال موجودی بین انبارها | [114](../../src/admin/stock/Ownership.tsx#L114) |
| ثبت فروش خارج از سایت | [149](../../src/admin/stock/Ownership.tsx#L149) |
| ثبت پرداخت تسویه بین شرکا | [188](../../src/admin/stock/Ownership.tsx#L188) |
| تغییر قاعدهٔ کد تنوع | [204](../../src/admin/stock/Ownership.tsx#L204) |
| حذف بارکد اختصاصی | [211](../../src/admin/stock/Ownership.tsx#L211) |
| ثبت بارکد اختصاصی شریک | [212](../../src/admin/stock/Ownership.tsx#L212) |
| تغییر قرارداد سهم | [222](../../src/admin/stock/Ownership.tsx#L222) |
| تغییر قاعدهٔ اولویت برداشت | [228](../../src/admin/stock/Ownership.tsx#L228) |
| تغییر قاعدهٔ تخفیف در تسویه | [229](../../src/admin/stock/Ownership.tsx#L229) |
| تغییر قاعدهٔ کارمزد در تسویه | [230](../../src/admin/stock/Ownership.tsx#L230) |
| نگاشت کانال سفارش به کانال تسویه | [234](../../src/admin/stock/Ownership.tsx#L234) |
| افزودن انبار تازه | [240](../../src/admin/stock/Ownership.tsx#L240) |
| افزودن کانال فروش | [245](../../src/admin/stock/Ownership.tsx#L245) |
| تغییر مدل قرارداد سهم | [250](../../src/admin/stock/Ownership.tsx#L250) |
| افزودن قاعدهٔ زمان رسیدن پول | [261](../../src/admin/stock/Ownership.tsx#L261) |
| تغییر زمان رسیدن پول روش پرداخت | [285](../../src/admin/stock/Ownership.tsx#L285) |
| حذف قاعدهٔ زمان رسیدن پول | [290](../../src/admin/stock/Ownership.tsx#L290) |
| برگشت کالا به مالک | [318](../../src/admin/stock/Ownership.tsx#L318) |
### `src/admin/stock/Packing.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تأیید بسته‌بندی با اسکن | [97](../../src/admin/stock/Packing.tsx#L97) |
### `src/admin/stock/Parties.tsx` — ماژول `stock`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| حذف شریک | [32](../../src/admin/stock/Parties.tsx#L32) |
| فعال‌سازی دوبارهٔ شریک | [36](../../src/admin/stock/Parties.tsx#L36) |
| ویرایش شریک | [60](../../src/admin/stock/Parties.tsx#L60) |
| غیرفعال‌سازی شریک | [92](../../src/admin/stock/Parties.tsx#L92) |
| پیوستن شریک تازه | [130](../../src/admin/stock/Parties.tsx#L130) |
### `src/admin/team/Access.tsx` — ماژول `team`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش نقش | [52](../../src/admin/team/Access.tsx#L52) |
| ساخت نقش تازه | [53](../../src/admin/team/Access.tsx#L53) |
| حذف نقش | [59](../../src/admin/team/Access.tsx#L59) |
| انتقال اعضا و حذف نقش | [86](../../src/admin/team/Access.tsx#L86) |
| تغییر نقش عضو | [110](../../src/admin/team/Access.tsx#L110) |
| برگرداندن دسترسی به نقش | [118](../../src/admin/team/Access.tsx#L118) |
| دعوت عضو تیم | [134](../../src/admin/team/Access.tsx#L134) |
### `src/admin/warehouse/PutAway.tsx` — ماژول `warehouse`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| جانمایی واحد در انبار | [55](../../src/admin/warehouse/PutAway.tsx#L55) |
### `src/admin/warehouse/WarehouseMap.tsx` — ماژول `warehouse`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| جابه‌جایی واحد در انبار | [39](../../src/admin/warehouse/WarehouseMap.tsx#L39) |
| حذف طبقهٔ انبار | [109](../../src/admin/warehouse/WarehouseMap.tsx#L109) |
| تغییر نام طبقهٔ انبار | [109](../../src/admin/warehouse/WarehouseMap.tsx#L109) |
| ساخت طبقهٔ انبار | [109](../../src/admin/warehouse/WarehouseMap.tsx#L109) |
| حذف قفسه | [114](../../src/admin/warehouse/WarehouseMap.tsx#L114) |
### `src/shared/data/agents.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| پیش‌نویس پاسخ بر اساس دستورالعمل لحن و قوانین مرجوعی و ارجاع به کارشناس | [27](../../src/shared/data/agents.ts#L27) |
| خلاصهٔ دلایل ریسک و پیشنهاد «تأیید، تماس یا لغو» برای مدیر عملیات | [28](../../src/shared/data/agents.ts#L28) |
| پیشنهاد تعداد سفارش بر اساس فروش ۳۰ روز و زمان رسیدن | [29](../../src/shared/data/agents.ts#L29) |
| بازنویسی توضیح، عنوان سئو و برچسب‌ها؛ بدون دست زدن به قیمت، گرید و اصالت | [30](../../src/shared/data/agents.ts#L30) |
| پیامک یادآوری مهلت ارسال با قالب تأییدشده | [31](../../src/shared/data/agents.ts#L31) |
| خلاصهٔ دیروز: فروش، سود، سفارش‌های گیرکرده، تیکت‌های فوری و کارهای امروز | [32](../../src/shared/data/agents.ts#L32) |
| پیش‌نویس پاسخ محترمانه؛ دیدگاه منفی به کارشناس ارجاع می‌شود | [33](../../src/shared/data/agents.ts#L33) |
| پیامک یادآوری بدون کد تخفیف؛ کد تخفیف فقط با تأیید | [34](../../src/shared/data/agents.ts#L34) |
| پیش‌نویس پاسخ تیکت | [66](../../src/shared/data/agents.ts#L66) |
| خواندن سفارش‌های گیرکرده | [67](../../src/shared/data/agents.ts#L67) |
| ارسال پیامک یادآوری مرجوعی | [68](../../src/shared/data/agents.ts#L68) |
| تلاش برای تغییر قیمت | [69](../../src/shared/data/agents.ts#L69) |
| گزارش صبحگاهی | [70](../../src/shared/data/agents.ts#L70) |
### `src/shared/data/cx.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| مترادف ساخته شد | [103](../../src/shared/data/cx.ts#L103) |
### `src/shared/data/promos.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| freeship | [7](../../src/shared/data/promos.ts#L7) |
| cashback | [8](../../src/shared/data/promos.ts#L8) |
### `src/shared/data/seed.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر وضعیت مرسوله | [306](../../src/shared/data/seed.ts#L306) |
| پیش‌نویس پاسخ تیکت | [307](../../src/shared/data/seed.ts#L307) |
| درخواست بازگشت وجه | [308](../../src/shared/data/seed.ts#L308) |
| مشاهدهٔ دادهٔ حساس | [309](../../src/shared/data/seed.ts#L309) |
| تغییر موجودی | [310](../../src/shared/data/seed.ts#L310) |
### `src/shared/lib/fx.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| به‌روزرسانی نرخ روز ارز از API | [44](../../src/shared/lib/fx.ts#L44) |
### `src/shared/lib/store.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| بازگردانی از سطل بازیافت | [154](../../src/shared/lib/store.ts#L154) |
### `src/shared/ui/base.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| درخواست از مدیر | [199](../../src/shared/ui/base.tsx#L199) |
| مشاهدهٔ دادهٔ حساس | [227](../../src/shared/ui/base.tsx#L227) |
### `src/shared/ui/entity.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتقال به سطل بازیافت | [39](../../src/shared/ui/entity.tsx#L39) |
### `src/shared/ui/exportDialog.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| خروجی گرفتن | [30](../../src/shared/ui/exportDialog.tsx#L30) |
### `src/shared/ui/reason.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش دلیل | [41](../../src/shared/ui/reason.tsx#L41) |
### `src/shared/ui/table.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| خروجی گرفتن | [102](../../src/shared/ui/table.tsx#L102) |
