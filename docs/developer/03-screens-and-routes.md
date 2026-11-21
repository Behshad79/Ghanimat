# ۰۳ · صفحه‌ها، مسیرها و دسترسی

همهٔ مسیرهای پنل از `src/App.tsx` و منوی کناری از `src/admin/shell/nav.ts` استخراج شده‌اند. تصویر هر صفحه در `docs/screens/` است (دسکتاپ ۱۴۴۰ پیکسل، دادهٔ نمونه، نقش مدیر کل).

> مسیریابی با `HashRouter` است (`#/admin/...`) تا روی GitHub Pages بدون تنظیم سرور کار کند. در نسخهٔ تولید می‌توانید `BrowserRouter` بگذارید.

## منوی کناری به ترتیب اولویت

| گروه | بخش | مسیر | شناسهٔ دسترسی |
|---|---|---|---|
| امروز | خانه | `/admin` | `home` |
| امروز | یادداشت و برنامه‌ریزی | `/admin/planner` | `planner` |
| سفارش و ارسال | شعب و ارسال سریع | `/admin/network` | `network` |
| سفارش و ارسال | ارسال، پیک و پست | `/admin/shipping` | `shipping` |
| سفارش و ارسال | چاپ برچسب و فاکتور | `/admin/print` | `print` |
| مشتریان و پشتیبانی | گفتگوها و دستیار خرید | `/admin/conversations` | `conversations` |
| مشتریان و پشتیبانی | تلفن و تماس‌ها | `/admin/calls` | `calls` |
| مشتریان و پشتیبانی | دیدگاه‌ها و پرسش‌ها | `/admin/reviews` | `reviews` |
| مشتریان و پشتیبانی | مشتریان | `/admin/customers` | `customers` |
| کالا و کاتالوگ | کالا و کاتالوگ | `/admin/catalog` | `catalog` |
| کالا و کاتالوگ | آمادگی کالا و محتوا | `/admin/readiness` | `readiness` |
| کالا و کاتالوگ | کتابخانهٔ رسانه | `/admin/media` | `media` |
| انبار و تأمین | تأمین و ورود بار | `/admin/inbound` | `inbound` |
| انبار و تأمین | انبار و موجودی | `/admin/warehouse` | `warehouse` |
| انبار و تأمین | مالکیت و تسویهٔ شرکا | `/admin/ownership` | `ownership` |
| انبار و تأمین | امور بازرگانی | `/admin/trade` | `trade` |
| فروش و قیمت | قیمت‌گذاری و تخفیف‌ها | `/admin/pricing` | `pricing` |
| فروش و قیمت | موتور پروموشن و کمپین | `/admin/promotions` | `promotions` |
| فروش و قیمت | ویترین و غنی‌آف | `/admin/merch` | `merch` |
| فروش و قیمت | کانال‌های فروش | `/admin/channels` | `channels` |
| فروش و قیمت | شرکای مستقل (به‌زودی) | `/admin/sellers` | `sellers` |
| مالی و حسابداری | حسابداری و خزانه | `/admin/treasury` | `treasury` |
| مالی و حسابداری | گزارش سرمایه‌گذار | `/admin/investor-report` | `investor` |
| بازاریابی | مارکتینگ | `/admin/marketing` | `marketing` |
| بازاریابی | پیامک و پیگیری خودکار | `/admin/messaging` | `messaging` |
| بازاریابی | سئو | `/admin/seo` | `seo` |
| بازاریابی | رشد و آزمایش | `/admin/growth` | `growth` |
| گزارش و هوشمندسازی | تحلیل و گزارش | `/admin/analytics` | `analytics` |
| گزارش و هوشمندسازی | هوش مصنوعی | `/admin/ai` | `ai` |
| گزارش و هوشمندسازی | ایجنت‌ها و اتوماسیون | `/admin/agents` | `agents` |
| سایت و محتوا | صفحه‌ساز | `/admin/builder` | `builder` |
| سایت و محتوا | محتوا و صفحات سایت | `/admin/content` | `content` |
| سایت و محتوا | وبلاگ و ویدیوها | `/admin/blog` | `blog` |
| سایت و محتوا | سربرگ، منو و فوتر | `/admin/site` | `site` |
| سایت و محتوا | تنظیمات سایت و پنل مشتری | `/admin/experience` | `experience` |
| سازمان و تیم | تیم و دسترسی | `/admin/team` | `team` |
| سازمان و تیم | پرسنل، قرارداد و حقوق | `/admin/people` | `people` |
| سازمان و تیم | شعب غنیمت | `/admin/branches` | `branches` |
| سازمان و تیم | بایگانی اسناد و مجوزها | `/admin/vault` | `vault` |
| سازمان و تیم | قوانین کسب‌وکار | `/admin/rules` | `rules` |
| سیستم | تنظیمات و سیستم | `/admin/settings` | `settings` |
| سیستم | مرکز اتصالات و API | `/admin/integrations` | `integrations` |
| سیستم | ربات تلگرام و فرمان پیامکی | `/admin/remote` | `remote` |
| سیستم | زیرساخت و سرویس‌ها | `/admin/infra` | `infra` |
| سیستم | سیستم طراحی | `/admin/design` | `design` |
| سیستم | سطل بازیافت | `/admin/trash` | `trash` |

## همهٔ مسیرها

| مسیر | نام در منو | گروه | کامپوننت و فایل | نقش‌های دارای دسترسی | تصویر |
|---|---|---|---|---|---|
| `/login` | — | — | `Login` · `src/admin/Login.tsx` | — | ![](../screens/login.jpg) |
| `/admin/live` | — | — | `Live` · `src/admin/pages/Home.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-live.jpg) |
| `/admin/orders` | — | — | `Orders` · `src/admin/pages/Orders.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-orders.jpg) |
| `/admin/orders/:id` | — | — | `OrderDetail` · `src/admin/pages/Orders.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-orders-id.jpg) |
| `/admin/catalog` | کالا و کاتالوگ | کالا و کاتالوگ | `Catalog` · `src/admin/catalog/Catalog.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده)، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-catalog.jpg) |
| `/admin/blog` | وبلاگ و ویدیوها | سایت و محتوا | `Blog` · `src/admin/blog/Blog.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد | ![](../screens/admin-blog.jpg) |
| `/admin/blog/:id` | — | — | `ArticleEditor` · `src/admin/blog/ArticleEditor.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-blog-id.jpg) |
| `/admin/readiness` | آمادگی کالا و محتوا | کالا و کاتالوگ | `Readiness` · `src/admin/catalog/Readiness.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-readiness.jpg) |
| `/admin/catalog/import` | — | — | `ImportLink` · `src/admin/pages/Catalog.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-catalog-import.jpg) |
| `/admin/catalog/new` | — | — | `ProductWizard` · `src/admin/catalog/Wizard.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-catalog-new.jpg) |
| `/admin/catalog/:id/edit` | — | — | `ProductWizard` · `src/admin/catalog/Wizard.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-catalog-id-edit.jpg) |
| `/admin/labels` | — | — | `Labels` · `src/admin/catalog/Catalog.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-labels.jpg) |
| `/admin/trash` | سطل بازیافت | سیستم | `Trash` · `src/admin/catalog/Catalog.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات | ![](../screens/admin-trash.jpg) |
| `/admin/catalog/unit/:id` | — | — | `UnitDetail` · `src/admin/catalog/Catalog.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-catalog-unit-id.jpg) |
| `/admin/catalog/:id` | — | — | `ProductDetail` · `src/admin/catalog/Catalog.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-catalog-id.jpg) |
| `/admin/supply` | — | — | `SupplyRedirect` · `src/admin/inbound/Inbound.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-supply.jpg) |
| `/admin/insight/:key` | — | — | `Insight` · `src/admin/insight/Insight.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-insight-key.jpg) |
| `/admin/merch` | ویترین و غنی‌آف | فروش و قیمت | `Merch` · `src/admin/merch/Merch.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-merch.jpg) |
| `/admin/network` | شعب و ارسال سریع | سفارش و ارسال | `Network` · `src/admin/partner/Network.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-network.jpg) |
| `/admin/planner` | یادداشت و برنامه‌ریزی | امروز | `Planner` · `src/admin/planner/Planner.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، کارشناس پشتیبانی، کارشناس مالی، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده)، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-planner.jpg) |
| `/admin/treasury` | حسابداری و خزانه | مالی و حسابداری | `Treasury` · `src/admin/finance/Treasury.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس مالی | ![](../screens/admin-treasury.jpg) |
| `/admin/investor-report` | گزارش سرمایه‌گذار | مالی و حسابداری | `InvestorReport` · `src/admin/finance/InvestorReport.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) |  |
| `/admin/*` | — | — | `NotFound` · `src/admin/shell/NotFound.tsx` | همهٔ نقش‌های دارای پنل کامل |  |
| `/admin/warehouse` | انبار و موجودی | انبار و تأمین | `Warehouse` · `src/admin/pages/Ops.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده)، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-warehouse.jpg) |
| `/admin/ownership` | مالکیت و تسویهٔ شرکا | انبار و تأمین | `Ownership` · `src/admin/stock/Ownership.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، کارشناس مالی، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-ownership.jpg) |
| `/admin/inbound` | تأمین و ورود بار | انبار و تأمین | `Inbound` · `src/admin/inbound/Inbound.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) |  |
| `/admin/packing` | — | — | `Packing` · `src/admin/stock/Packing.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-packing.jpg) |
| `/admin/shipping` | ارسال، پیک و پست | سفارش و ارسال | `Shipping` · `src/admin/pages/Ops.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-shipping.jpg) |
| `/admin/print` | چاپ برچسب و فاکتور | سفارش و ارسال | `PrintCenter` · `src/admin/print/PrintCenter.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده)، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-print.jpg) |
| `/admin/returns` | — | — | `Returns` · `src/admin/pages/Ops.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-returns.jpg) |
| `/admin/agents` | ایجنت‌ها و اتوماسیون | گزارش و هوشمندسازی | `Agents` · `src/admin/agents/Agents.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-agents.jpg) |
| `/admin/media` | کتابخانهٔ رسانه | کالا و کاتالوگ | `MediaPage` · `src/admin/media/Media.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، مدیر شعبهٔ شریک (دسترسی گسترده)، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-media.jpg) |
| `/admin/trade` | امور بازرگانی | انبار و تأمین | `TradePage` · `src/admin/trade/Trade.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات، کارشناس کنترل کیفیت و انبار | ![](../screens/admin-trade.jpg) |
| `/admin/returns/w/:id` | — | — | `WarrantyCase` · `src/admin/returns/Case.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-returns-w-id.jpg) |
| `/admin/returns/:id` | — | — | `ReturnCase` · `src/admin/returns/Case.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-returns-id.jpg) |
| `/admin/customers` | مشتریان | مشتریان و پشتیبانی | `Customers` · `src/admin/pages/People.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس پشتیبانی، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-customers.jpg) |
| `/admin/customers/:id` | — | — | `Customer360` · `src/admin/customer/Customer360.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-customers-id.jpg) |
| `/admin/support` | — | — | `Support` · `src/admin/pages/People.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-support.jpg) |
| `/admin/reviews` | دیدگاه‌ها و پرسش‌ها | مشتریان و پشتیبانی | `Reviews` · `src/admin/pages/People.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس پشتیبانی، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-reviews.jpg) |
| `/admin/pricing` | قیمت‌گذاری و تخفیف‌ها | فروش و قیمت | `Pricing` · `src/admin/pages/Revenue.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس مالی، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-pricing.jpg) |
| `/admin/channels` | کانال‌های فروش | فروش و قیمت | `Channels` · `src/admin/pages/Revenue.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-channels.jpg) |
| `/admin/finance` | — | — | `Finance` · `src/admin/pages/Revenue.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-finance.jpg) |
| `/admin/content` | محتوا و صفحات سایت | سایت و محتوا | `Content` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد | ![](../screens/admin-content.jpg) |
| `/admin/site` | سربرگ، منو و فوتر | سایت و محتوا | `SiteEditor` · `src/admin/site/SiteEditor.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-site.jpg) |
| `/admin/builder` | صفحه‌ساز | سایت و محتوا | `Builder` · `src/admin/builder/Builder.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-builder.jpg) |
| `/admin/integrations` | مرکز اتصالات و API | سیستم | `Integrations` · `src/admin/pro/Integrations.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-integrations.jpg) |
| `/admin/promotions` | موتور پروموشن و کمپین | فروش و قیمت | `Promotions` · `src/admin/pro/Promotions.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-promotions.jpg) |
| `/admin/requests` | — | — | `CustomerRequests` · `src/admin/cx/Requests.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-requests.jpg) |
| `/admin/social` | — | — | `Social` · `src/admin/social/Social.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-social.jpg) |
| `/admin/conversations` | گفتگوها و دستیار خرید | مشتریان و پشتیبانی | `Conversations` · `src/admin/cx/Conversations.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-conversations.jpg) |
| `/admin/experience` | تنظیمات سایت و پنل مشتری | سایت و محتوا | `CxSettingsPage` · `src/admin/cx/CxSettings.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-experience.jpg) |
| `/admin/seo` | سئو | بازاریابی | `Seo` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد | ![](../screens/admin-seo.jpg) |
| `/admin/marketing` | مارکتینگ | بازاریابی | `Marketing` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد | ![](../screens/admin-marketing.jpg) |
| `/admin/growth` | رشد و آزمایش | بازاریابی | `Growth` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مارکتینگ، سئو و رشد | ![](../screens/admin-growth.jpg) |
| `/admin/analytics` | تحلیل و گزارش | گزارش و هوشمندسازی | `Analytics` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس مالی، مارکتینگ، سئو و رشد، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-analytics.jpg) |
| `/admin/ai` | هوش مصنوعی | گزارش و هوشمندسازی | `AiCenter` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-ai.jpg) |
| `/admin/branches` | شعب غنیمت | سازمان و تیم | `Branches` · `src/admin/pages/Insights.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-branches.jpg) |
| `/admin/sellers` | شرکای مستقل (به‌زودی) | فروش و قیمت | `PartnersAdmin` · `src/admin/partner/PartnersAdmin.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-sellers.jpg) |
| `/admin/messaging` | پیامک و پیگیری خودکار | بازاریابی | `Messaging` · `src/admin/cx/Messaging.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-messaging.jpg) |
| `/admin/calls` | تلفن و تماس‌ها | مشتریان و پشتیبانی | `Calls` · `src/admin/cx/Calls.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر شعبهٔ شریک (دسترسی گسترده) | ![](../screens/admin-calls.jpg) |
| `/admin/remote` | ربات تلگرام و فرمان پیامکی | سیستم | `Remote` · `src/admin/cx/Remote.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-remote.jpg) |
| `/admin/team` | تیم و دسترسی | سازمان و تیم | `Team` · `src/admin/pages/Org.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، مدیر عملیات | ![](../screens/admin-team.jpg) |
| `/admin/people` | پرسنل، قرارداد و حقوق | سازمان و تیم | `People` · `src/admin/people/People.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی)، کارشناس مالی | ![](../screens/admin-people.jpg) |
| `/admin/vault` | بایگانی اسناد و مجوزها | سازمان و تیم | `Vault` · `src/admin/people/Vault.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-vault.jpg) |
| `/admin/people/:id` | — | — | `PersonFile` · `src/admin/people/People.tsx` | همهٔ نقش‌های دارای پنل کامل | ![](../screens/admin-people-id.jpg) |
| `/admin/rules` | قوانین کسب‌وکار | سازمان و تیم | `Rules` · `src/admin/pages/Org.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-rules.jpg) |
| `/admin/settings` | تنظیمات و سیستم | سیستم | `Settings` · `src/admin/pages/Org.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-settings.jpg) |
| `/admin/infra` | زیرساخت و سرویس‌ها | سیستم | `Infra` · `src/admin/pages/Org.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-infra.jpg) |
| `/admin/design` | سیستم طراحی | سیستم | `Design` · `src/admin/pages/Org.tsx` | مدیر کل، مدیر کل دوم (شریک انبار)، دستیار مدیر کل (همکار اجرایی) | ![](../screens/admin-design.jpg) |
| `/simple` | حالت ساده (اپراتور) | — | `Simple` · `src/admin/simple/Simple.tsx` | اپراتور (و مدیر کل/عملیات برای بازبینی) | ![](../screens/simple.jpg) |
| `/partner` | پرتال شعبهٔ همکار | — | `Partner` · `src/admin/partner/Partner.tsx` | شریک فروش (شعبه) | ![](../screens/partner.jpg) |

## نقش‌ها و چهرهٔ پنل

هر نقش یک «چهره» دارد: `full` (پنل کامل)، `simple` (حالت ساده برای اپراتور، مسیر `/simple`) یا `partner` (پرتال شعبهٔ همکار، مسیر `/partner`). نقش‌ها در پایگاه‌داده کپی می‌شوند و از «تیم و دسترسی» قابل ویرایش‌اند؛ دسترسی فردی (`access`) بر نقش مقدم است. منطق در `can()` در `src/shared/lib/store.ts`.

| کلید | نام | چهره | صفحهٔ شروع | ماژول‌ها |
|---|---|---|---|---|
| `super` | مدیر کل | `full` | `/admin` | همه |
| `cofounder` | مدیر کل دوم (شریک انبار) | `full` | `/admin` | همه |
| `assistant` | دستیار مدیر کل (همکار اجرایی) | `full` | `/admin` | همه |
| `ops` | مدیر عملیات | `full` | `/admin/live` | `home`، `planner`، `live`، `network`، `orders`، `packing`، `ownership`، `warehouse`، `shipping`، `print`، `returns`، `catalog`، `media`، `trade`، `readiness`، `team`، `trash` |
| `simple` | اپراتور | `simple` | `/simple` | — |
| `partner` | شریک فروش (شعبه) | `partner` | `/partner` | — |
| `support` | کارشناس پشتیبانی | `full` | `/admin/support` | `home`، `planner`، `support`، `customers`، `orders`، `reviews`، `returns` |
| `finance` | کارشناس مالی | `full` | `/admin/finance` | `home`، `planner`، `finance`، `treasury`، `ownership`، `people`، `orders`، `pricing`، `returns`، `analytics` |
| `growth` | مارکتینگ، سئو و رشد | `full` | `/admin/marketing` | `home`، `planner`، `readiness`، `blog`، `marketing`، `seo`، `growth`، `analytics`، `content`، `channels`، `pricing`، `reviews`، `merch` |
| `branch` | مدیر شعبهٔ شریک (دسترسی گسترده) | `full` | `/admin/live` | `home`، `planner`، `live`، `network`، `orders`، `packing`، `ownership`، `social`، `shipping`، `returns`، `print`، `catalog`، `media`، `warehouse`، `supply`، `readiness`، `support`، `calls`، `requests`، `reviews`، `conversations`، `customers`، `merch`، `pricing`، `channels`، `sellers`، `messaging`، `analytics` |
| `qc` | کارشناس کنترل کیفیت و انبار | `full` | `/admin/warehouse` | `home`، `planner`، `warehouse`، `packing`، `catalog`، `media`، `trade`، `print` |
