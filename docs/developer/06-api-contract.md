# ۰۶ · قرارداد API و فهرست عملیات

پروتوتایپ بک‌اند ندارد. این سند می‌گوید سرور چه چیزی باید فراهم کند.

## اصول

1. **REST با JSON**، پیشوند `/api/v1`، احراز هویت با توکن حامل (JWT کوتاه‌عمر + refresh) پس از ورود با کد یکبارمصرف پیامکی.
2. **هر مجموعه در `04-data-model.md` یک منبع (resource) است**: `GET /api/v1/{collection}` با صفحه‌بندی (`page`، `size`)، مرتب‌سازی (`sort`)، جست‌وجو (`q`) و فیلتر وضعیت (`status` با کدهای `05-statuses-and-rules.md`)؛ `GET/PATCH/DELETE /api/v1/{collection}/{id}` و `POST /api/v1/{collection}`.
3. **هر عملیات دامنه یک endpoint فعل‌دار است** نه یک PATCH خام؛ مثلاً `POST /api/v1/orders/{id}/cancel` با بدنهٔ `{ reasonCode, reasonText }`. فهرست کامل عملیات‌ها پایین همین سند است (296 فراخوانی در کد، هر کدام با خط دقیق).
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
| ساخت مقالهٔ تازه | [20](../../src/admin/blog/Blog.tsx#L20) |
| تغییر مقالهٔ ویژه | [40](../../src/admin/blog/Blog.tsx#L40) |
| تکثیر مقاله | [40](../../src/admin/blog/Blog.tsx#L40) |
| حذف مقاله | [40](../../src/admin/blog/Blog.tsx#L40) |
| تغییر مطالب ترند | [54](../../src/admin/blog/Blog.tsx#L54) |
| تغییر بخش صفحهٔ وبلاگ | [56](../../src/admin/blog/Blog.tsx#L56) |
| تغییر ویدیوی ویژه | [61](../../src/admin/blog/Blog.tsx#L61) |
| تأیید دیدگاه وبلاگ | [70](../../src/admin/blog/Blog.tsx#L70) |
| رد دیدگاه وبلاگ | [70](../../src/admin/blog/Blog.tsx#L70) |
| پاسخ به دیدگاه وبلاگ | [71](../../src/admin/blog/Blog.tsx#L71) |
| ساخت مقاله از جست‌وجوی بی‌نتیجه | [76](../../src/admin/blog/Blog.tsx#L76) |
| افزودن برچسب پرطرفدار | [76](../../src/admin/blog/Blog.tsx#L76) |
| حذف دسته | [87](../../src/admin/blog/Blog.tsx#L87) |
| افزودن دسته | [88](../../src/admin/blog/Blog.tsx#L88) |
| ذخیرهٔ ویدیو | [90](../../src/admin/blog/Blog.tsx#L90) |
| حذف ویدیو | [90](../../src/admin/blog/Blog.tsx#L90) |
| انتقال محتوا و حذف دسته | [105](../../src/admin/blog/Blog.tsx#L105) |
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
### `src/admin/catalog/Catalog.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| کپی کالا | [34](../../src/admin/catalog/Catalog.tsx#L34) |
| انتقال کالا به سطل بازیافت | [39](../../src/admin/catalog/Catalog.tsx#L39) |
| تعدیل موجودی | [66](../../src/admin/catalog/Catalog.tsx#L66) |
| ویرایش واحد | [77](../../src/admin/catalog/Catalog.tsx#L77) |
| تغییر وضعیت فروش واحد | [110](../../src/admin/catalog/Catalog.tsx#L110) |
| انتقال واحد به سطل بازیافت | [112](../../src/admin/catalog/Catalog.tsx#L112) |
| انتشار گروهی | [152](../../src/admin/catalog/Catalog.tsx#L152) |
| توقف فروش گروهی | [153](../../src/admin/catalog/Catalog.tsx#L153) |
| حذف گروهی کالا | [155](../../src/admin/catalog/Catalog.tsx#L155) |
| چاپ برچسب کالا | [268](../../src/admin/catalog/Catalog.tsx#L268) |
| حذف دائمی | [289](../../src/admin/catalog/Catalog.tsx#L289) |
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
| ثبت قیمت فعلی در تاریخچه | [88](../../src/admin/catalog/PdpExtras.tsx#L88) |
### `src/admin/catalog/Readiness.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر وضعیت محتوا | [75](../../src/admin/catalog/Readiness.tsx#L75) |
| افزودن به صف محتوا | [76](../../src/admin/catalog/Readiness.tsx#L76) |
### `src/admin/catalog/VariantMatrix.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت تنوع‌های کالا | [37](../../src/admin/catalog/VariantMatrix.tsx#L37) |
### `src/admin/catalog/Wizard.tsx` — ماژول `products`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| پیش‌ساخت صفحهٔ کالای در راه | [99](../../src/admin/catalog/Wizard.tsx#L99) |
| بارگذاری آیکون خط کارت | [343](../../src/admin/catalog/Wizard.tsx#L343) |
### `src/admin/customer/Customer360.tsx` — ماژول `customers`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر دستی امتیاز باشگاه | [125](../../src/admin/customer/Customer360.tsx#L125) |
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
| تغییر دستی موعد تسویه | [55](../../src/admin/finance/Money.tsx#L55) |
| ثبت واریز سرویس پرداخت | [58](../../src/admin/finance/Money.tsx#L58) |
### `src/admin/logistics/ZoneMap.tsx` — ماژول `shipping`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر شهرهای منطقهٔ ارسال | [21](../../src/admin/logistics/ZoneMap.tsx#L21) |
### `src/admin/merch/Merch.tsx` — ماژول `merch`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| حذف غنی‌آف از صف | [101](../../src/admin/merch/Merch.tsx#L101) |
| تغییر جایگاه نمایش کالا | [203](../../src/admin/merch/Merch.tsx#L203) |
### `src/admin/orders/Decision.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| اعلام کمبود تأمین به مشتری | [88](../../src/admin/orders/Decision.tsx#L88) |
### `src/admin/orders/OrderEvents.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ارسال گزینه‌های جایگزین به مشتری | [30](../../src/admin/orders/OrderEvents.tsx#L30) |
| تغییر مقصد بازگشت وجه به کیف پول | [109](../../src/admin/orders/OrderEvents.tsx#L109) |
### `src/admin/orders/OrderTools.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت سفارش دستی | [37](../../src/admin/orders/OrderTools.tsx#L37) |
| ویرایش سفارش | [87](../../src/admin/orders/OrderTools.tsx#L87) |
| ویرایش نشانی سفارش | [117](../../src/admin/orders/OrderTools.tsx#L117) |
| تماس تلفنی | [138](../../src/admin/orders/OrderTools.tsx#L138) |
### `src/admin/orders/Progress.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت مأمور ارسال و پلاک | [34](../../src/admin/orders/Progress.tsx#L34) |
| ثبت کد رهگیری پستی | [78](../../src/admin/orders/Progress.tsx#L78) |
| تغییر روش ارسال | [103](../../src/admin/orders/Progress.tsx#L103) |
### `src/admin/orders/ReturnTools.tsx` — ماژول `orders`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت دستی مرجوعی | [70](../../src/admin/orders/ReturnTools.tsx#L70) |
| ثبت دستی درخواست گارانتی | [77](../../src/admin/orders/ReturnTools.tsx#L77) |
### `src/admin/pages/Catalog.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تعریف بج کارت محصول | [36](../../src/admin/pages/Catalog.tsx#L36) |
| ساخت پیش‌نویس از لینک | [57](../../src/admin/pages/Catalog.tsx#L57) |
### `src/admin/pages/Home.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر ویجت‌های خانه | [34](../../src/admin/pages/Home.tsx#L34) |
| حذف ویجت سنجاق‌شده | [102](../../src/admin/pages/Home.tsx#L102) |
| باز کردن رخداد | [134](../../src/admin/pages/Home.tsx#L134) |
### `src/admin/pages/Insights.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تخصیص هزینهٔ محموله | [37](../../src/admin/pages/Insights.tsx#L37) |
| دریافت محموله | [37](../../src/admin/pages/Insights.tsx#L37) |
| ثبت نرخ ارز روز | [39](../../src/admin/pages/Insights.tsx#L39) |
| ساخت سفارش خرید از فرصت | [40](../../src/admin/pages/Insights.tsx#L40) |
| جابه‌جایی بلوک خانه | [49](../../src/admin/pages/Insights.tsx#L49) |
| ذخیرهٔ نوار بالا | [59](../../src/admin/pages/Insights.tsx#L59) |
| ساخت نسخهٔ تازهٔ متن حقوقی | [64](../../src/admin/pages/Insights.tsx#L64) |
| تأیید حقوقی متن | [64](../../src/admin/pages/Insights.tsx#L64) |
| نوشتن توضیح متا با AI | [79](../../src/admin/pages/Insights.tsx#L79) |
| رفع خطای سئو | [80](../../src/admin/pages/Insights.tsx#L80) |
| ساخت بریف محتوا | [82](../../src/admin/pages/Insights.tsx#L82) |
| ساخت کمپین | [103](../../src/admin/pages/Insights.tsx#L103) |
| اعمال نسخهٔ برنده | [125](../../src/admin/pages/Insights.tsx#L125) |
| افزودن ویجت به داشبورد | [146](../../src/admin/pages/Insights.tsx#L146) |
| زمان‌بندی گزارش | [146](../../src/admin/pages/Insights.tsx#L146) |
| تغییر سطح خودمختاری AI | [158](../../src/admin/pages/Insights.tsx#L158) |
### `src/admin/pages/Ops.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| اصلاح موجودی طبق سایت شریک | [76](../../src/admin/pages/Ops.tsx#L76) |
| بازنشستگی ارائه‌دهنده | [140](../../src/admin/pages/Ops.tsx#L140) |
| تست اتصال | [149](../../src/admin/pages/Ops.tsx#L149) |
| تغییر پیش‌فرض | [150](../../src/admin/pages/Ops.tsx#L150) |
| فعال‌سازی ارائه‌دهنده | [151](../../src/admin/pages/Ops.tsx#L151) |
| افزودن ارائه‌دهنده | [156](../../src/admin/pages/Ops.tsx#L156) |
| توقف موقت ارائه‌دهنده | [160](../../src/admin/pages/Ops.tsx#L160) |
| نامعتبر کردن گارانتی | [225](../../src/admin/pages/Ops.tsx#L225) |
| معتبر کردن دوبارهٔ گارانتی | [226](../../src/admin/pages/Ops.tsx#L226) |
| الحاق کد رهگیری با اسکن | [274](../../src/admin/pages/Ops.tsx#L274) |
| ثبت کد رهگیری از فایل باجه | [302](../../src/admin/pages/Ops.tsx#L302) |
### `src/admin/pages/Orders.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تخصیص سفارش به انباردار | [76](../../src/admin/pages/Orders.tsx#L76) |
| الحاق کد رهگیری | [95](../../src/admin/pages/Orders.tsx#L95) |
| ثبت پیک با لینک | [115](../../src/admin/pages/Orders.tsx#L115) |
| لغو مرسوله | [157](../../src/admin/pages/Orders.tsx#L157) |
| درخواست بازگشت وجه | [165](../../src/admin/pages/Orders.tsx#L165) |
| بازگشت وجه | [166](../../src/admin/pages/Orders.tsx#L166) |
| تأیید سفارش مشکوک | [188](../../src/admin/pages/Orders.tsx#L188) |
| یادداشت داخلی | [230](../../src/admin/pages/Orders.tsx#L230) |
| ساخت تیکت | [240](../../src/admin/pages/Orders.tsx#L240) |
### `src/admin/pages/Org.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تغییر مجوز | [46](../../src/admin/pages/Org.tsx#L46) |
| درخواست تغییر قانون | [61](../../src/admin/pages/Org.tsx#L61) |
| تغییر قانون کسب‌وکار | [63](../../src/admin/pages/Org.tsx#L63) |
| تعریف پارامتر کسب‌وکار | [72](../../src/admin/pages/Org.tsx#L72) |
| ارسال پیامک آزمایشی | [100](../../src/admin/pages/Org.tsx#L100) |
| آزمایش زنجیرهٔ اعلان | [103](../../src/admin/pages/Org.tsx#L103) |
| ارسال گزارش وضعیت فنی | [128](../../src/admin/pages/Org.tsx#L128) |
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
| درخواست تغییر قیمت گروهی | [27](../../src/admin/pages/Revenue.tsx#L27) |
| استعلام تراکنش | [64](../../src/admin/pages/Revenue.tsx#L64) |
| تأیید درخواست | [83](../../src/admin/pages/Revenue.tsx#L83) |
| رد درخواست | [83](../../src/admin/pages/Revenue.tsx#L83) |
| بازسازی فید کانال | [98](../../src/admin/pages/Revenue.tsx#L98) |
### `src/admin/pages/SellerSettings.tsx` — ماژول `(چند ماژول)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش اطلاعات فروشنده و انبارها | [43](../../src/admin/pages/SellerSettings.tsx#L43) |
### `src/admin/partner/Network.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| برداشتن توقف | [34](../../src/admin/partner/Network.tsx#L34) |
| تنظیم ارسال سریع شعبه | [35](../../src/admin/partner/Network.tsx#L35) |
| ترتیب برداشت موجودی | [36](../../src/admin/partner/Network.tsx#L36) |
### `src/admin/partner/Partner.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| تحویل به پست و ثبت رهگیری (شریک) | [33](../../src/admin/partner/Partner.tsx#L33) |
| ثبت فروش حضوری در شعبه | [34](../../src/admin/partner/Partner.tsx#L34) |
| ثبت اختلاف تسویه | [100](../../src/admin/partner/Partner.tsx#L100) |
| اصلاح ناهماهنگی (شریک) | [120](../../src/admin/partner/Partner.tsx#L120) |
| اعلام «ندارم» پس از فروش (شریک) | [127](../../src/admin/partner/Partner.tsx#L127) |
| ارسال کالای جدید شریک برای تأیید | [130](../../src/admin/partner/Partner.tsx#L130) |
### `src/admin/partner/PartnerOps.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| توضیح شعبه دربارهٔ نظر مشتری | [106](../../src/admin/partner/PartnerOps.tsx#L106) |
| ثبت کالای تازهٔ شعبه برای تأیید | [157](../../src/admin/partner/PartnerOps.tsx#L157) |
### `src/admin/partner/PartnersAdmin.tsx` — ماژول `partners`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| افزودن شعبه یا شریک فروش | [56](../../src/admin/partner/PartnersAdmin.tsx#L56) |
| تغییر مدل سرمایهٔ محموله | [93](../../src/admin/partner/PartnersAdmin.tsx#L93) |
| ثبت محمولهٔ شعبه | [109](../../src/admin/partner/PartnersAdmin.tsx#L109) |
### `src/admin/people/People.tsx` — ماژول `people`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ساخت پروندهٔ پرسنلی | [45](../../src/admin/people/People.tsx#L45) |
| تغییر نرخ حقوق و بیمه | [72](../../src/admin/people/People.tsx#L72) |
### `src/admin/people/Vault.tsx` — ماژول `people`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتقال سند به سطل بازیافت | [26](../../src/admin/people/Vault.tsx#L26) |
### `src/admin/print/EditableDoc.tsx` — ماژول `print`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش دستی سند | [11](../../src/admin/print/EditableDoc.tsx#L11) |
| حذف ویرایش دستی سند | [16](../../src/admin/print/EditableDoc.tsx#L16) |
### `src/admin/print/PrintCenter.tsx` — ماژول `print`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| چاپ سند | [52](../../src/admin/print/PrintCenter.tsx#L52) |
| ذخیرهٔ قالب چاپ | [94](../../src/admin/print/PrintCenter.tsx#L94) |
| اعمال سبک روی همهٔ اسناد | [94](../../src/admin/print/PrintCenter.tsx#L94) |
| بازگردانی نسخهٔ قالب چاپ | [102](../../src/admin/print/PrintCenter.tsx#L102) |
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
| نتیجهٔ بازرسی مرجوعی | [195](../../src/admin/returns/Case.tsx#L195) |
| تأیید بازگشت وجه | [231](../../src/admin/returns/Case.tsx#L231) |
| ارسال مجدد کالای ردشدهٔ مرجوعی | [257](../../src/admin/returns/Case.tsx#L257) |
| تعویض واحد گارانتی | [396](../../src/admin/returns/Case.tsx#L396) |
| دریافت واحد مرجوعی | [425](../../src/admin/returns/Case.tsx#L425) |
| بازگشت وجه | [449](../../src/admin/returns/Case.tsx#L449) |
### `src/admin/settings/FeedsApi.tsx` — ماژول `settings`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ابطال کلید API | [53](../../src/admin/settings/FeedsApi.tsx#L53) |
| ساخت کلید API | [69](../../src/admin/settings/FeedsApi.tsx#L69) |
### `src/admin/shared/PackPhotos.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ثبت عکس پیش از ارسال | [20](../../src/admin/shared/PackPhotos.tsx#L20) |
| حذف عکس پیش از ارسال | [32](../../src/admin/shared/PackPhotos.tsx#L32) |
### `src/admin/shell/Copilot.tsx` — ماژول `shell`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| کاهش قیمت گروهی ۵٪ | [25](../../src/admin/shell/Copilot.tsx#L25) |
| افزودن ویجت از دستیار | [29](../../src/admin/shell/Copilot.tsx#L29) |
### `src/admin/simple/Simple.tsx` — ماژول `ops`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| درخواست از مدیر | [101](../../src/admin/simple/Simple.tsx#L101) |
| تأیید سفارش (حالت سریع) | [126](../../src/admin/simple/Simple.tsx#L126) |
| لغو سفارش (حالت سریع) | [127](../../src/admin/simple/Simple.tsx#L127) |
| بسته آماده شد (حالت سریع) | [137](../../src/admin/simple/Simple.tsx#L137) |
| پاسخ به مشتری (حالت سریع) | [167](../../src/admin/simple/Simple.tsx#L167) |
| کاهش موجودی (حالت سریع) | [186](../../src/admin/simple/Simple.tsx#L186) |
| افزایش موجودی (حالت سریع) | [186](../../src/admin/simple/Simple.tsx#L186) |
| تغییر قیمت (حالت سریع) | [187](../../src/admin/simple/Simple.tsx#L187) |
| ثبت سفارش تلفنی (حالت سریع) | [206](../../src/admin/simple/Simple.tsx#L206) |
| دریافت مرجوعی (حالت سریع) | [231](../../src/admin/simple/Simple.tsx#L231) |
| مغایرت مرجوعی با عکس ارسال (حالت سریع) | [232](../../src/admin/simple/Simple.tsx#L232) |
| تأیید دیدگاه (حالت سریع) | [243](../../src/admin/simple/Simple.tsx#L243) |
| رد دیدگاه (حالت سریع) | [243](../../src/admin/simple/Simple.tsx#L243) |
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
### `src/admin/team/Access.tsx` — ماژول `team`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش نقش | [51](../../src/admin/team/Access.tsx#L51) |
| ساخت نقش تازه | [52](../../src/admin/team/Access.tsx#L52) |
| حذف نقش | [58](../../src/admin/team/Access.tsx#L58) |
| انتقال اعضا و حذف نقش | [85](../../src/admin/team/Access.tsx#L85) |
| تغییر نقش عضو | [107](../../src/admin/team/Access.tsx#L107) |
| برگرداندن دسترسی به نقش | [115](../../src/admin/team/Access.tsx#L115) |
| دعوت عضو تیم | [130](../../src/admin/team/Access.tsx#L130) |
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
| تغییر وضعیت مرسوله | [290](../../src/shared/data/seed.ts#L290) |
| پیش‌نویس پاسخ تیکت | [291](../../src/shared/data/seed.ts#L291) |
| درخواست بازگشت وجه | [292](../../src/shared/data/seed.ts#L292) |
| مشاهدهٔ دادهٔ حساس | [293](../../src/shared/data/seed.ts#L293) |
| تغییر موجودی | [294](../../src/shared/data/seed.ts#L294) |
### `src/shared/lib/store.ts` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| بازگردانی از سطل بازیافت | [111](../../src/shared/lib/store.ts#L111) |
### `src/shared/ui/base.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| درخواست از مدیر | [195](../../src/shared/ui/base.tsx#L195) |
| مشاهدهٔ دادهٔ حساس | [223](../../src/shared/ui/base.tsx#L223) |
### `src/shared/ui/entity.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| انتقال به سطل بازیافت | [38](../../src/shared/ui/entity.tsx#L38) |
### `src/shared/ui/exportDialog.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| خروجی گرفتن | [30](../../src/shared/ui/exportDialog.tsx#L30) |
### `src/shared/ui/reason.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| ویرایش دلیل | [40](../../src/shared/ui/reason.tsx#L40) |
### `src/shared/ui/table.tsx` — ماژول `(مشترک)`

| عملیات (ثبت در لاگ ممیزی) | خط |
|---|---|
| خروجی گرفتن | [101](../../src/shared/ui/table.tsx#L101) |
