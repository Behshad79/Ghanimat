# ۰۴ · مدل داده

پروتوتایپ همهٔ داده را در یک شیء در `localStorage` نگه می‌دارد (`src/shared/lib/store.ts`، کلید `ghanimat-demo-db-vNN`). هر تغییر با `mutate(fn, log)` انجام می‌شود که هم داده را عوض می‌کند و هم یک ردیف در `audit` می‌نویسد. **در نسخهٔ تولید، هر «مجموعه» زیر یک جدول یا سرویس سمت سرور است** و `mutate` به فراخوانی API تبدیل می‌شود.

- تعریف دقیق تایپ‌ها: `src/shared/data/seed.ts` و فایل‌های هم‌کنار در `src/shared/data/` (مثلاً `partners.ts`، `merch.ts`، `incoming.ts`).
- دادهٔ نمونه: `makeSeed()` در `seed.ts` و تابع‌های `make*()` هر فایل.
- فیلدهای زیر از اجرای واقعی پنل با دادهٔ نمونه خوانده شده‌اند؛ تایپ دقیق را از فایل‌های بالا بگیرید.
- خروجی ماشینی همین مدل: `docs/developer/data-model.json` و اسکیمای API: `docs/developer/openapi.yaml`.

## فهرست مجموعه‌ها

| مجموعه | نوع | توضیح |
|---|---|---|
| `access` | شیء | دسترسی اختصاصی هر فرد (افزوده/گرفته). |
| `acct` | شیء | اطلاعات حساب کاربری مشتریان (ایمیل، دستگاه‌ها، درخواست حذف). |
| `alerts` | آرایه (5 رکورد نمونه) |  |
| `approvals` | آرایه (3 رکورد نمونه) |  |
| `articleBlocks` | شیء |  |
| `audit` | آرایه (7 رکورد نمونه) | لاگ ممیزی همهٔ تغییرها: چه کسی، چه کاری، قبل و بعد. |
| `axes` | آرایه (4 رکورد نمونه) | ویژگی‌های تنوع (رنگ، حافظه، سایز…). |
| `bank` | شیء | حساب‌ها و رسیدهای کارت‌به‌کارت. |
| `blog` | شیء | مقاله‌ها، ویدیوها، دسته‌ها و دیدگاه‌های وبلاگ. |
| `calls` | شیء | تلفن ابری: تماس‌ها، صف‌ها، کارشناس‌ها. |
| `cardBadges` | آرایه (5 رکورد نمونه) |  |
| `carrierLogos` | شیء |  |
| `codeFormat` | شیء |  |
| `codes` | آرایه (4 رکورد نمونه) | شمارنده‌های کد کالا و واحد. |
| `contentQueue` | آرایه (5 رکورد نمونه) | صف تولید محتوای اینستاگرام و ویدیو. |
| `customers` | آرایه (9 رکورد نمونه) | مشتریان حقیقی و حقوقی با کیف پول، بخش و سلامت. |
| `cx` | شیء |  |
| `delivery` | شیء | تنظیمات ارسال: پیک‌های تحویل سریع، قیمت پویا، تقسیم سبد، قالب پیامک‌ها. |
| `docOverrides` | شیء |  |
| `docSettings` | شیء | تنظیمات قالب هر سند چاپی (سبک، رنگ، قلم، حاشیه، فیلدها). |
| `docVersions` | شیء | نسخه‌های ذخیره‌شدهٔ قالب‌های چاپ. |
| `entities` | شیء | موجودیت‌های عمومی قابل مدیریت (دسته‌ها، برندها، کمپین‌ها، درخواست‌ها…). |
| `extReviews` | شیء |  |
| `flags` | شیء |  |
| `hub` | شیء | مرکز اتصالات: آداپتورها، وب‌هوک‌ها، رویدادها. |
| `incoming` | آرایه (2 رکورد نمونه) | خریدهای در راه برای پیش‌ساخت صفحه و محتوا و «به‌زودی». |
| `journey` | شیء | سفر مشتری: گفتگوهای دستیار و ویجت، پرداخت‌های ناموفق. |
| `layout` | شیء | نقشهٔ قفسه‌ها و خانه‌های هر انبار. |
| `lots` | آرایه (5 رکورد نمونه) | محموله‌های کالا نزد هر شعبه به تفکیک مدل سرمایه (امانی، کالای شریک، مشترک). |
| `merch` | شیء | ویترین: غنی‌آف‌های زمان‌دار (`deals`) و جایگاه‌های نمایش (`placements`). |
| `moves` | آرایه (4 رکورد نمونه) | گزارش جابه‌جایی کالا در انبار. |
| `network` | شیء | کنترل شبکهٔ شعب: تعطیلی فوری، توقف ارسال سریع، توقف شعبه، ترتیب برداشت موجودی. |
| `newsletter` | آرایه (8 رکورد نمونه) |  |
| `notifMatrix` | شیء |  |
| `nudges` | شیء | پیامک‌های پیگیری خودکار و ارسال گروهی. |
| `opts` | شیء |  |
| `orderEvents` | آرایه (4 رکورد نمونه) |  |
| `orders` | آرایه (21 رکورد نمونه) | سفارش‌ها؛ هر سفارش چند مرسوله (`shipments`) دارد. وضعیت سفارش و مرسوله جداست. |
| `packagingCost` | number |  |
| `pages` | آرایه (43 رکورد نمونه) | صفحه‌های صفحه‌ساز (پیش‌نویس). |
| `pagesPublished` | آرایه (0 رکورد نمونه) | صفحه‌های منتشرشده. |
| `partnerQueue` | آرایه (2 رکورد نمونه) | صف تأیید کالاهای تازهٔ شعب. |
| `partners` | آرایه (3 رکورد نمونه) | شعب و شرکای فروش با قرارداد، مدل سرمایه، ارسال سریع، پیک، تسویه و امتیاز. |
| `people` | آرایه (6 رکورد نمونه) | پرسنل، قرارداد، حقوق و پرداخت‌ها. |
| `peopleCfg` | شیء |  |
| `perms` | شیء |  |
| `pickups` | آرایه (6 رکورد نمونه) | تحویل‌های حضوری. |
| `printLog` | آرایه (24 رکورد نمونه) | سابقهٔ هر چاپ: سند، شماره، نسخه، کاغذ، چاپ‌کننده. |
| `products` | آرایه (11 رکورد نمونه) | کالاها (مدل). کالای سریال‌دار واحدهایش در `units` است؛ کالای تعدادی موجودی‌اش در `qty`. |
| `promos` | شیء | قانون‌های تخفیف شرطی و کمپین‌های UTM. |
| `providers` | آرایه (23 رکورد نمونه) | سرویس‌های بیرونی (درگاه، اقساط، پیامک، حمل، کانال فروش) و وضعیت هر کدام. |
| `questions` | آرایه (4 رکورد نمونه) | پرسش و پاسخ کالا. |
| `reasonPresets` | شیء |  |
| `reasons` | آرایه (2 رکورد نمونه) |  |
| `remote` | شیء | ربات تلگرام و فرمان پیامکی. |
| `returns` | آرایه (7 رکورد نمونه) | درخواست‌های مرجوعی. |
| `reviewMeta` | شیء |  |
| `reviews` | آرایه (4 رکورد نمونه) | دیدگاه‌های کالا. |
| `roleDefs` | شیء | تعریف نقش‌ها و ماژول‌های هر نقش. |
| `rules` | آرایه (20 رکورد نمونه) | قانون‌های کسب‌وکار قابل تنظیم (مهلت ارسال سریع، آستانه‌ها، کف سود…). |
| `seller` | شیء | اطلاعات حقوقی فروشنده برای فاکتور. |
| `settleDue` | شیء |  |
| `settlements` | شیء | تسویه‌ها. |
| `simpleDay` | شیء |  |
| `site` | شیء | پیش‌نویس تنظیمات سایت (سربرگ، منو، فوتر، کارت کالا، خط متحرک کارت). |
| `sitePublished` | شیء | نسخهٔ منتشرشدهٔ تنظیمات سایت. |
| `siteVersions` | آرایه (1 رکورد نمونه) |  |
| `smsLog` | آرایه (3 رکورد نمونه) | گزارش پیامک‌های ارسالی. |
| `storeCfg` | شیء | هویت فروشگاه، باشگاه مشتریان، قوانین پرداخت، فیدها و کلیدهای API. |
| `syncIssues` | آرایه (2 رکورد نمونه) |  |
| `team` | آرایه (8 رکورد نمونه) | اعضای تیم و نقش هر کدام. |
| `theme` | شیء |  |
| `tickets` | آرایه (5 رکورد نمونه) | تیکت‌ها و گفتگوهای پشتیبانی با پیام و پیوست. |
| `traffic` | شیء |  |
| `trash` | آرایه (0 رکورد نمونه) | سطل بازیافت. |
| `txns` | آرایه (15 رکورد نمونه) | تراکنش‌های پرداخت درگاه و اقساط. |
| `units` | آرایه (19 رکورد نمونه) | واحدهای فیزیکی کالا با سریال، گرید، قفسه و بهای تمام‌شده. |
| `vault` | آرایه (9 رکورد نمونه) | بایگانی اسناد و مجوزها با یادآوری انقضا. |
| `warehouses` | آرایه (2 رکورد نمونه) | انبارها. |
| `warranties` | آرایه (5 رکورد نمونه) | پرونده‌های گارانتی. |

## فیلدهای هر مجموعه

### `access`

دسترسی اختصاصی هر فرد (افزوده/گرفته).

| فیلد | نوع |
|---|---|
| `u5` | object |

### `acct`

اطلاعات حساب کاربری مشتریان (ایمیل، دستگاه‌ها، درخواست حذف).

| فیلد | نوع |
|---|---|
| `c1` | object |
| `c2` | object |
| `c3` | object |
| `c5` | object |
| `c6` | object |

### `alerts`



| فیلد | نوع |
|---|---|
| `id` | string |
| `cat` | string |
| `tone` | string |
| `title` | string |
| `body` | string |
| `to` | string |
| `at` | date-time |
| `read` | boolean |

### `approvals`



| فیلد | نوع |
|---|---|
| `id` | string |
| `type` | string |
| `title` | string |
| `ref` | string |
| `amount` | number |
| `by` | string |
| `byRole` | string |
| `status` | string |
| `at` | date-time |

### `audit`

لاگ ممیزی همهٔ تغییرها: چه کسی، چه کاری، قبل و بعد.

| فیلد | نوع |
|---|---|
| `at` | date-time |
| `who` | string |
| `before` | string |
| `after` | string |
| `ai` | boolean |
| `action` | string |
| `target` | string |

### `axes`

ویژگی‌های تنوع (رنگ، حافظه، سایز…).

| فیلد | نوع |
|---|---|
| `id` | string |
| `name` | string |
| `kind` | string |
| `values` | array |

### `bank`

حساب‌ها و رسیدهای کارت‌به‌کارت.

| فیلد | نوع |
|---|---|
| `cards` | array |
| `credits` | array |
| `receipts` | array |

### `blog`

مقاله‌ها، ویدیوها، دسته‌ها و دیدگاه‌های وبلاگ.

| فیلد | نوع |
|---|---|
| `posts` | array |
| `comments` | array |
| `videos` | array |
| `landing` | object |
| `cats` | array |
| `videoCats` | array |

### `calls`

تلفن ابری: تماس‌ها، صف‌ها، کارشناس‌ها.

| فیلد | نوع |
|---|---|
| `provider` | object |
| `ivr` | array |
| `hours` | object |
| `agents` | array |
| `calls` | array |

### `cardBadges`



| فیلد | نوع |
|---|---|
| `id` | string |
| `label` | string |
| `rule` | string |
| `on` | boolean |
| `rotate` | boolean |

### `carrierLogos`



| فیلد | نوع |
|---|---|
| `post` | string |
| `tipax` | string |

### `codeFormat`



| فیلد | نوع |
|---|---|
| `product` | string |
| `unit` | string |
| `pDigits` | number |
| `uDigits` | number |
| `nextProduct` | number |
| `nextUnit` | number |

### `codes`

شمارنده‌های کد کالا و واحد.

| فیلد | نوع |
|---|---|
| `id` | string |
| `type` | string |
| `value` | string |
| `used` | number |
| `limit` | number |
| `active` | boolean |
| `cond` | string |

### `contentQueue`

صف تولید محتوای اینستاگرام و ویدیو.

| فیلد | نوع |
|---|---|
| `id` | string |
| `productId` | string |
| `channel` | string |
| `kind` | string |
| `status` | string |
| `due` | date-time |
| `owner` | string |
| `note` | string |

### `customers`

مشتریان حقیقی و حقوقی با کیف پول، بخش و سلامت.

| فیلد | نوع |
|---|---|
| `id` | string |
| `addr` | object |
| `name` | string |
| `mobile` | string |
| `referral` | string |
| `nid` | string |
| `email` | string |
| `city` | string |
| `orders` | number |
| `ltv` | number |
| `aov` | number |
| `lastOrder` | date-time |
| `segment` | string |
| `health` | number |
| `source` | string |
| `wallet` | number |
| `returnRate` | number |
| `churn` | number |
| `tags` | array |
| `blocked` | boolean |
| `legal` | object |

### `cx`



| فیلد | نوع |
|---|---|
| `auth` | object |
| `search` | object |
| `support` | object |
| `wallet` | object |
| `referral` | object |
| `reviews` | object |
| `notifications` | object |
| `checkout` | object |
| `assistant` | object |
| `newsletter` | object |

### `delivery`

تنظیمات ارسال: پیک‌های تحویل سریع، قیمت پویا، تقسیم سبد، قالب پیامک‌ها.

| فیلد | نوع |
|---|---|
| `openHour` | number |
| `fastCutoff` | number |
| `nightAfter` | number |
| `fastHours` | number |
| `closedDays` | array |
| `slots` | array |
| `booked` | object |
| `pickup` | object |
| `fast` | object |
| `split` | object |
| `templates` | object |

### `entities`

موجودیت‌های عمومی قابل مدیریت (دسته‌ها، برندها، کمپین‌ها، درخواست‌ها…).

| فیلد | نوع |
|---|---|
| `categories` | array |
| `brands` | array |
| `attrTemplates` | array |
| `collections` | array |
| `suppliers` | array |
| `purchaseOrders` | array |
| `inbound` | array |
| `zones` | array |
| `slots` | array |
| `giftCards` | array |
| `priceCampaigns` | array |
| `templates` | array |
| `campaigns` | array |
| `automations` | array |
| `homeBlocks` | array |
| `articles` | array |
| `faqs` | array |
| `legal` | array |
| `redirects` | array |
| `seoPages` | array |
| `branches` | array |
| `segments` | array |
| `experiments` | array |
| `incidents` | array |
| `shipMethods` | array |
| `reports` | array |
| `partnerSites` | array |
| `notifRules` | array |
| `contactMessages` | array |
| `contactSubjects` | array |
| `productReports` | array |
| `reportReasons` | array |
| `stockRequests` | array |
| `notifyMe` | array |
| `offerReminders` | array |
| `branchInquiries` | array |
| `withdrawals` | array |
| `bankAccounts` | array |
| `cancelRequests` | array |
| `ticketTopics` | array |
| `helpGuides` | array |
| `tutorialVideos` | array |
| `searchSynonyms` | array |
| `searchSuggestions` | array |
| `zeroResults` | array |
| `assistantPrompts` | array |
| `assistantFeedback` | array |
| `staticPages` | array |
| `errorPages` | array |
| `blogCategories` | array |
| `instagramPosts` | array |
| `testimonials` | array |
| `trustItems` | array |
| `sourcingRoutes` | array |
| `cartServices` | array |
| `panelCards` | array |

### `flags`



| فیلد | نوع |
|---|---|
| `shopAssistant` | boolean |
| `compare` | boolean |
| `wallet` | boolean |
| `storeFinder` | boolean |
| `aiSummary` | boolean |
| `referral` | boolean |
| `sellerLink` | boolean |
| `showSoon` | boolean |
| `maintenance` | boolean |
| `mahabadSales` | boolean |

### `hub`

مرکز اتصالات: آداپتورها، وب‌هوک‌ها، رویدادها.

| فیلد | نوع |
|---|---|
| `adapters` | array |
| `hooks` | array |
| `deliveries` | array |
| `serverEvents` | array |

### `incoming`

خریدهای در راه برای پیش‌ساخت صفحه و محتوا و «به‌زودی».

| فیلد | نوع |
|---|---|
| `id` | string |
| `title` | string |
| `route` | string |
| `supplier` | string |
| `orderedAt` | date-time |
| `eta` | date-time |
| `stage` | string |
| `note` | string |
| `items` | array |

### `journey`

سفر مشتری: گفتگوهای دستیار و ویجت، پرداخت‌های ناموفق.

| فیلد | نوع |
|---|---|
| `events` | array |
| `carts` | array |
| `failedPayments` | array |
| `addresses` | array |
| `walletTx` | array |
| `lists` | array |
| `aiChats` | array |
| `widgetChats` | array |
| `notifPrefs` | object |
| `passwords` | object |

### `layout`

نقشهٔ قفسه‌ها و خانه‌های هر انبار.

| فیلد | نوع |
|---|---|
| `tehran` | array |
| `mahabad` | array |

### `lots`

محموله‌های کالا نزد هر شعبه به تفکیک مدل سرمایه (امانی، کالای شریک، مشترک).

| فیلد | نوع |
|---|---|
| `id` | string |
| `partnerId` | string |
| `productId` | string |
| `capital` | string |
| `qty` | number |
| `soldOnline` | number |
| `soldStore` | number |
| `unitCost` | number |
| `unitPrice` | number |
| `at` | date-time |
| `note` | string |

### `merch`

ویترین: غنی‌آف‌های زمان‌دار (`deals`) و جایگاه‌های نمایش (`placements`).

| فیلد | نوع |
|---|---|
| `deals` | array |
| `placements` | array |

### `moves`

گزارش جابه‌جایی کالا در انبار.

| فیلد | نوع |
|---|---|
| `id` | string |
| `at` | date-time |
| `who` | string |
| `kind` | string |
| `unit` | string |
| `product` | string |
| `from` | string |
| `to` | string |
| `read` | boolean |
| `qty` | number |

### `network`

کنترل شبکهٔ شعب: تعطیلی فوری، توقف ارسال سریع، توقف شعبه، ترتیب برداشت موجودی.

| فیلد | نوع |
|---|---|
| `closed` | null |
| `fastOff` | null |
| `hq` | object |
| `pausedBranches` | object |
| `priority` | array |
| `log` | array |

### `newsletter`



| فیلد | نوع |
|---|---|
| `id` | string |
| `contact` | string |
| `channel` | string |
| `interests` | array |
| `source` | string |
| `at` | date-time |
| `active` | boolean |

### `nudges`

پیامک‌های پیگیری خودکار و ارسال گروهی.

| فیلد | نوع |
|---|---|
| `policies` | array |
| `blasts` | array |
| `smsPrice` | number |
| `quiet` | object |

### `opts`



| فیلد | نوع |
|---|---|
| `source` | array |
| `condition` | array |
| `grade` | array |
| `importRoute` | array |
| `flawStatus` | array |

### `orderEvents`



| فیلد | نوع |
|---|---|
| `id` | string |
| `orderId` | string |
| `kind` | string |
| `title` | string |
| `body` | string |
| `at` | date-time |
| `by` | string |
| `status` | string |
| `payload` | object |

### `orders`

سفارش‌ها؛ هر سفارش چند مرسوله (`shipments`) دارد. وضعیت سفارش و مرسوله جداست.

| فیلد | نوع |
|---|---|
| `id` | string |
| `customerId` | string |
| `buyer` | string |
| `createdAt` | date-time |
| `deliveredAt` | date-time |
| `status` | string |
| `pay` | string |
| `total` | number |
| `discount` | number |
| `shippingFee` | number |
| `fee` | number |
| `margin` | number |
| `risk` | number |
| `channel` | string |
| `tags` | array |
| `lockedBy` | null / string |
| `shipments` | array |
| `customerNote` | string |
| `notes` | array |
| `legalId` | string |

### `pages`

صفحه‌های صفحه‌ساز (پیش‌نویس).

| فیلد | نوع |
|---|---|
| `id` | string |
| `title` | string |
| `group` | string |
| `path` | string |
| `figma` | string |
| `sections` | array |
| `node` | string |
| `ref` | string |

### `partnerQueue`

صف تأیید کالاهای تازهٔ شعب.

| فیلد | نوع |
|---|---|
| `id` | string |
| `productId` | string |
| `kind` | string |
| `status` | string |
| `note` | string |
| `at` | date-time |

### `partners`

شعب و شرکای فروش با قرارداد، مدل سرمایه، ارسال سریع، پیک، تسویه و امتیاز.

| فیلد | نوع |
|---|---|
| `id` | string |
| `name` | string |
| `city` | string |
| `owner` | string |
| `userId` | string |
| `phone` | string |
| `warehouse` | string |
| `address` | string |
| `status` | string |
| `color` | string |
| `since` | date-time |
| `contract` | object |
| `fast` | object |
| `services` | object |
| `couriers` | array |
| `iban` | string |
| `reviews` | array |
| `penalties` | array |
| `metrics` | object |
| `checklist` | array |
| `payouts` | array |

### `people`

پرسنل، قرارداد، حقوق و پرداخت‌ها.

| فیلد | نوع |
|---|---|
| `id` | string |
| `teamId` | string |
| `name` | string |
| `position` | string |
| `dept` | string |
| `status` | string |
| `nationalId` | string |
| `birth` | string |
| `father` | string |
| `phone` | string |
| `address` | string |
| `emergency` | string |
| `sheba` | string |
| `card` | string |
| `insuranceNo` | string |
| `start` | date-time |
| `contractType` | string |
| `salary` | object |
| `payDay` | number |
| `insured` | boolean |
| `contracts` | array |
| `pay` | array |
| `loans` | array |
| `notes` | array |
| `docs` | array |

### `peopleCfg`



| فیلد | نوع |
|---|---|
| `insEmployee` | number |
| `insEmployer` | number |
| `taxFree` | number |
| `taxRate` | number |
| `minWage` | number |
| `housing` | number |
| `bon` | number |
| `child` | number |

### `perms`



| فیلد | نوع |
|---|---|
| `u3` | object |
| `u4` | object |

### `pickups`

تحویل‌های حضوری.

| فیلد | نوع |
|---|---|
| `id` | string |
| `orderId` | string |
| `customerId` | string |
| `branch` | string |
| `status` | string |
| `window` | string |
| `code` | string |
| `readyAt` | date-time |
| `deadline` | date-time |
| `receiver` | string |
| `receiverId` | string |
| `relation` | string |
| `handedAt` | date-time |
| `by` | string |
| `receipt` | string |
| `items` | array |
| `note` | string |

### `printLog`

سابقهٔ هر چاپ: سند، شماره، نسخه، کاغذ، چاپ‌کننده.

| فیلد | نوع |
|---|---|
| `id` | string |
| `doc` | string |
| `label` | string |
| `ref` | string |
| `by` | string |
| `at` | date-time |
| `copy` | number |
| `paper` | string |

### `products`

کالاها (مدل). کالای سریال‌دار واحدهایش در `units` است؛ کالای تعدادی موجودی‌اش در `qty`.

| فیلد | نوع |
|---|---|
| `id` | string |
| `image` | string |
| `imagePos` | string |
| `title` | string |
| `en` | string |
| `brand` | string |
| `category` | string |
| `status` | string |
| `mode` | string |
| `priceNew` | number |
| `rating` | number |
| `reviews` | number |
| `views` | number |
| `cvr` | number |
| `health` | number |
| `fastEligible` | boolean |
| `seller` | string |
| `torob` | boolean |
| `code` | string |
| `warrantyType` | string |
| `warrantyMonths` | number |
| `supplier` | string |
| `source` | string |
| `short` | string |
| `long` | string |
| `keyFeatures` | string |
| `box` | string |
| `specs` | object |
| `pdp` | object |
| `compareAt` | number |
| `qty` | object |
| `price` | number |
| `cost` | number |
| `partner` | boolean |
| `comingSoon` | date-time |
| `incoming` | string |
| `ean` | string |

### `promos`

قانون‌های تخفیف شرطی و کمپین‌های UTM.

| فیلد | نوع |
|---|---|
| `rules` | array |
| `flash` | array |
| `utm` | array |

### `providers`

سرویس‌های بیرونی (درگاه، اقساط، پیامک، حمل، کانال فروش) و وضعیت هر کدام.

| فیلد | نوع |
|---|---|
| `id` | string |
| `family` | string |
| `name` | string |
| `status` | string |
| `share` | number |
| `installments` | number |
| `fee` | number |
| `settleDays` | number |
| `pending` | number |
| `isDefault` | boolean |
| `min` | number |
| `max` | number |
| `health` | number |
| `credit` | number |
| `burn` | number |

### `questions`

پرسش و پاسخ کالا.

| فیلد | نوع |
|---|---|
| `id` | string |
| `productId` | string |
| `customerId` | string |
| `text` | string |
| `status` | string |
| `at` | date-time |
| `askedBuyers` | number |
| `answers` | array |

### `reasonPresets`



| فیلد | نوع |
|---|---|
| `order` | object |
| `return` | object |
| `warranty` | object |
| `review` | object |
| `legal` | object |
| `withdrawal` | object |
| `cancel` | object |
| `ticket` | object |
| `ticketNeedInfo` | object |
| `custCancel` | object |
| `custReturn` | object |
| `productReport` | object |
| `orgType` | object |
| `deleteAccount` | object |
| `branchRequest` | object |
| `account` | object |
| `deleteReject` | object |
| `addressError` | object |

### `reasons`



| فیلد | نوع |
|---|---|
| `id` | string |
| `kind` | string |
| `ref` | string |
| `status` | string |
| `reason` | string |
| `visible` | boolean |
| `by` | string |
| `at` | date-time |

### `remote`

ربات تلگرام و فرمان پیامکی.

| فیلد | نوع |
|---|---|
| `telegram` | object |
| `sms` | object |
| `events` | object |
| `log` | array |

### `returns`

درخواست‌های مرجوعی.

| فیلد | نوع |
|---|---|
| `id` | string |
| `orderId` | string |
| `customerId` | string |
| `unitId` | string |
| `reason` | string |
| `note` | string |
| `status` | string |
| `amount` | number |
| `dest` | string |
| `createdAt` | date-time |
| `deadline` | date-time |
| `method` | string |
| `tracking` | string |
| `receipt` | object |
| `events` | array |
| `photos` | array |
| `courierName` | string |

### `reviewMeta`



| فیلد | نوع |
|---|---|
| `RV-1` | object |
| `RV-2` | object |
| `RV-3` | object |
| `RV-4` | object |

### `reviews`

دیدگاه‌های کالا.

| فیلد | نوع |
|---|---|
| `id` | string |
| `productId` | string |
| `customerId` | string |
| `rating` | number |
| `text` | string |
| `status` | string |
| `verified` | boolean |
| `at` | date-time |
| `ai` | string |
| `media` | array |

### `roleDefs`

تعریف نقش‌ها و ماژول‌های هر نقش.

| فیلد | نوع |
|---|---|
| `super` | object |
| `ops` | object |
| `simple` | object |
| `partner` | object |
| `support` | object |
| `finance` | object |
| `growth` | object |
| `qc` | object |

### `rules`

قانون‌های کسب‌وکار قابل تنظیم (مهلت ارسال سریع، آستانه‌ها، کف سود…).

| فیلد | نوع |
|---|---|
| `key` | string |
| `group` | string |
| `name` | string |
| `value` | number |
| `unit` | string |
| `desc` | string |
| `sensitive` | boolean |
| `usedIn` | array |
| `history` | array |

### `seller`

اطلاعات حقوقی فروشنده برای فاکتور.

| فیلد | نوع |
|---|---|
| `legalName` | string |
| `brand` | string |
| `nationalId` | string |
| `regNo` | string |
| `economicCode` | string |
| `address` | string |
| `postalCode` | string |
| `phone` | string |
| `website` | string |
| `seal` | string |
| `signature` | string |
| `assumed` | boolean |

### `settlements`

تسویه‌ها.

| فیلد | نوع |
|---|---|
| `GH-10458` | object |
| `GH-10412` | object |

### `simpleDay`



| فیلد | نوع |
|---|---|
| `started` | boolean |
| `done` | array |

### `site`

پیش‌نویس تنظیمات سایت (سربرگ، منو، فوتر، کارت کالا، خط متحرک کارت).

| فیلد | نوع |
|---|---|
| `theme` | object |
| `announce` | object |
| `header` | object |
| `menu` | array |
| `footer` | object |
| `card` | object |
| `listing` | object |

### `sitePublished`

نسخهٔ منتشرشدهٔ تنظیمات سایت.

| فیلد | نوع |
|---|---|
| `theme` | object |
| `announce` | object |
| `header` | object |
| `menu` | array |
| `footer` | object |
| `card` | object |
| `listing` | object |

### `siteVersions`



| فیلد | نوع |
|---|---|
| `id` | string |
| `at` | date-time |
| `by` | string |
| `note` | string |

### `smsLog`

گزارش پیامک‌های ارسالی.

| فیلد | نوع |
|---|---|
| `id` | string |
| `to` | string |
| `customerId` | string |
| `kind` | string |
| `ref` | string |
| `text` | string |
| `status` | string |
| `at` | date-time |

### `storeCfg`

هویت فروشگاه، باشگاه مشتریان، قوانین پرداخت، فیدها و کلیدهای API.

| فیلد | نوع |
|---|---|
| `identity` | object |
| `media` | object |
| `social` | object |
| `loyalty` | object |
| `checkout` | object |
| `feeds` | object |
| `apiKeys` | array |

### `syncIssues`



| فیلد | نوع |
|---|---|
| `id` | string |
| `product` | string |
| `ours` | number |
| `theirs` | number |
| `source` | string |
| `at` | date-time |

### `team`

اعضای تیم و نقش هر کدام.

| فیلد | نوع |
|---|---|
| `id` | string |
| `name` | string |
| `role` | string |
| `phone` | string |
| `status` | string |
| `twoFA` | boolean |

### `theme`



| فیلد | نوع |
|---|---|
| `brand` | string |
| `ink` | string |
| `accent` | string |
| `danger` | string |
| `success` | string |
| `bg` | string |
| `surface` | string |
| `radius` | number |
| `logoHeight` | number |
| `logoHeightMobile` | number |
| `font` | string |

### `tickets`

تیکت‌ها و گفتگوهای پشتیبانی با پیام و پیوست.

| فیلد | نوع |
|---|---|
| `id` | string |
| `topic` | string |
| `reason` | string |
| `items` | array |
| `customerId` | string |
| `orderId` | string |
| `subject` | string |
| `channel` | string |
| `status` | string |
| `priority` | string |
| `sla` | date-time |
| `assignee` | string |
| `sentiment` | string |
| `messages` | array |
| `replyBy` | date-time |
| `csat` | string |

### `traffic`



| فیلد | نوع |
|---|---|
| `searches` | array |
| `synonyms` | array |
| `sessions` | array |
| `stories` | array |

### `txns`

تراکنش‌های پرداخت درگاه و اقساط.

| فیلد | نوع |
|---|---|
| `id` | string |
| `orderId` | string |
| `amount` | number |
| `gateway` | string |
| `ref` | string |
| `status` | string |
| `at` | date-time |

### `units`

واحدهای فیزیکی کالا با سریال، گرید، قفسه و بهای تمام‌شده.

| فیلد | نوع |
|---|---|
| `id` | string |
| `productId` | string |
| `serial` | string |
| `condition` | string |
| `grade` | string |
| `warehouse` | string |
| `source` | string |
| `status` | string |
| `cost` | number |
| `price` | number |
| `shelf` | string |
| `received` | date-time |
| `flaws` | array |
| `color` | string |
| `code` | string |
| `warrantyMonths` | number |

### `vault`

بایگانی اسناد و مجوزها با یادآوری انقضا.

| فیلد | نوع |
|---|---|
| `id` | string |
| `title` | string |
| `cat` | string |
| `at` | date-time |
| `by` | string |
| `remind` | number |
| `tags` | array |
| `access` | string |
| `versions` | array |
| `fileName` | string |
| `expires` | date-time |
| `note` | string |

### `warehouses`

انبارها.

| فیلد | نوع |
|---|---|
| `id` | string |
| `name` | string |
| `owner` | string |
| `province` | string |
| `city` | string |
| `district` | string |
| `street` | string |
| `alley` | string |
| `plaque` | string |
| `postalCode` | string |
| `phone` | string |
| `manager` | string |
| `services` | string |
| `assumed` | boolean |

### `warranties`

پرونده‌های گارانتی.

| فیلد | نوع |
|---|---|
| `id` | string |
| `code` | string |
| `customerId` | string |
| `unitId` | string |
| `type` | string |
| `months` | number |
| `status` | string |
| `issue` | string |
| `owner` | string |
| `deadline` | date-time |
| `method` | string |
| `diagnosis` | string |
| `resolution` | string |
| `receipt` | object |
| `events` | array |
| `orderId` | string |
| `back` | object |
