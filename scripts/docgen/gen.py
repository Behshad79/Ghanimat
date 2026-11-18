# تولید خودکار مستندات توسعه از روی کد. اجرا: python3 scripts/docgen/gen.py
# پیش‌نیاز تصاویر: npm run build && npx vite preview --port 4174 ، سپس node scripts/docgen/shots.cjs
import re, json, os, datetime
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); OUT=R+'/docs/developer'; os.makedirs(OUT, exist_ok=True)
rd=lambda p: open(R+'/'+p, encoding='utf-8').read()
nav_src=rd('src/admin/shell/nav.ts'); app=rd('src/App.tsx'); roles_src=rd('src/shared/data/roles.ts'); st_src=rd('src/shared/data/statuses.ts'); seed=rd('src/shared/data/seed.ts'); css=rd('src/styles.css'); pc=rd('src/admin/print/PrintCenter.tsx')
db=json.load(open(R+'/docs/developer/sample-db.json',encoding='utf-8'))

# ── منو
NAV=[dict(id=m[0],label=m[1],path=m[2],group=m[3]) for m in re.findall(r"\{ id: '([^']+)', label: '([^']+)', icon: \w+, path: '([^']+)', group: '([^']+)'", nav_src)]
# ── مسیرها
routes=re.findall(r'<Route path="([^"]+)" element=\{<(\w+)', app)
imports={}
for names,src in re.findall(r"import \{([^}]+)\} from '([^']+)'", app):
    for n in names.split(','):
        n=n.strip().split(' as ')[-1].strip()
        if n: imports[n]=src.replace('./','src/')+'.tsx'
# ── نقش‌ها
ROLES=[]
for k,body in re.findall(r"^  (\w+): \{ (label: .+?) \},?$", roles_src, re.M):
    lab=re.search(r"label: '([^']+)'",body).group(1); face=re.search(r"face: '(\w+)'",body).group(1)
    mods=re.search(r"modules: (\[[^\]]*\]|'\*')",body).group(1); home=re.search(r"home: '([^']+)'",body).group(1)
    ROLES.append(dict(key=k,label=lab,face=face,modules='*' if mods=="'*'" else re.findall(r"'([^']+)'",mods),home=home))
# ── وضعیت‌ها
STAT=re.findall(r"^  '([a-z_]+\.[a-z_]+)': \{ label: '([^']+)', tone: '(\w+)' \}", st_src, re.M)
# ── قانون‌ها
RULES=re.findall(r"\{ key: '([^']+)', group: '([^']+)', name: '([^']+)', value: ([^,]+), unit: '([^']*)', desc: '([^']*)'", seed)
# ── اسناد چاپی
DOCS=re.findall(r"\{ id: '(\w+)', label: '([^']+)', src: '(\w+)', papers: \[([^\]]*)\]", pc)
# ── توکن‌ها
def vars_in(block): return dict(re.findall(r"--([a-z0-9-]+):\s*([^;]+);", block))
a=css.index(':root {'); b=css.index("[data-theme='dark'] {"); c=css.index('@theme inline')
light=vars_in(css[a:b]); dark=vars_in(css[b:c])
theme=vars_in(css[css.index('@theme inline'):css.index('}', css.index('@theme inline'))])
now=datetime.date.today().isoformat()
W=lambda name, txt: open(OUT+'/'+name,'w',encoding='utf-8').write(txt.strip()+'\n')

# ═══ 03 صفحه‌ها
rows=[]
seen=set()
for path,el in routes:
    if el=='Navigate' or path in seen: continue
    seen.add(path)
    full=path if path.startswith('/') else '/admin/'+path
    n=next((x for x in NAV if x['path']==full),None)
    who=[r['label'] for r in ROLES if n and (r['modules']=='*' or n['id'] in r['modules'])]
    shot=re.sub(r'[^a-z0-9]+','-',full.strip('/').replace(':id','id')) or 'root'
    rows.append(f"| `{full}` | {n['label'] if n else '—'} | {n['group'] if n else '—'} | `{el}` · `{imports.get(el,'?')}` | {'، '.join(who) if who else ('همهٔ نقش‌های دارای پنل کامل' if full.startswith('/admin') else '—')} | {'![](../screens/'+shot+'.jpg)' if os.path.exists(R+'/docs/screens/'+shot+'.jpg') else ''} |")
for path,lab,el,f in [('/simple','حالت ساده (اپراتور)','Simple','src/admin/simple/Simple.tsx'),('/partner','پرتال شعبهٔ همکار','Partner','src/admin/partner/Partner.tsx')]:
    shot=path.strip('/')
    rows.append(f"| `{path}` | {lab} | — | `{el}` · `{f}` | {'اپراتور (و مدیر کل/عملیات برای بازبینی)' if el=='Simple' else 'شریک فروش (شعبه)'} | {'![](../screens/'+shot+'.jpg)' if os.path.exists(R+'/docs/screens/'+shot+'.jpg') else ''} |")
W('03-screens-and-routes.md', f"""
# ۰۳ · صفحه‌ها، مسیرها و دسترسی

همهٔ مسیرهای پنل از `src/App.tsx` و منوی کناری از `src/admin/shell/nav.ts` استخراج شده‌اند. تصویر هر صفحه در `docs/screens/` است (دسکتاپ ۱۴۴۰ پیکسل، دادهٔ نمونه، نقش مدیر کل).

> مسیریابی با `HashRouter` است (`#/admin/...`) تا روی GitHub Pages بدون تنظیم سرور کار کند. در نسخهٔ تولید می‌توانید `BrowserRouter` بگذارید.

## منوی کناری به ترتیب اولویت

| گروه | بخش | مسیر | شناسهٔ دسترسی |
|---|---|---|---|
""" + '\n'.join(f"| {n['group']} | {n['label']} | `{n['path']}` | `{n['id']}` |" for n in NAV) + """

## همهٔ مسیرها

| مسیر | نام در منو | گروه | کامپوننت و فایل | نقش‌های دارای دسترسی | تصویر |
|---|---|---|---|---|---|
""" + '\n'.join(rows) + """

## نقش‌ها و چهرهٔ پنل

هر نقش یک «چهره» دارد: `full` (پنل کامل)، `simple` (حالت ساده برای اپراتور، مسیر `/simple`) یا `partner` (پرتال شعبهٔ همکار، مسیر `/partner`). نقش‌ها در پایگاه‌داده کپی می‌شوند و از «تیم و دسترسی» قابل ویرایش‌اند؛ دسترسی فردی (`access`) بر نقش مقدم است. منطق در `can()` در `src/shared/lib/store.ts`.

| کلید | نام | چهره | صفحهٔ شروع | ماژول‌ها |
|---|---|---|---|---|
""" + '\n'.join(f"| `{r['key']}` | {r['label']} | `{r['face']}` | `{r['home']}` | {'همه' if r['modules']=='*' else '، '.join('`'+m+'`' for m in r['modules']) or '—'} |" for r in ROLES))

# ═══ 04 مدل داده
DESC={'orders':'سفارش‌ها؛ هر سفارش چند مرسوله (`shipments`) دارد. وضعیت سفارش و مرسوله جداست.','products':'کالاها (مدل). کالای سریال‌دار واحدهایش در `units` است؛ کالای تعدادی موجودی‌اش در `qty`.','units':'واحدهای فیزیکی کالا با سریال، گرید، قفسه و بهای تمام‌شده.','customers':'مشتریان حقیقی و حقوقی با کیف پول، بخش و سلامت.','txns':'تراکنش‌های پرداخت درگاه و اقساط.','returns':'درخواست‌های مرجوعی.','warranties':'پرونده‌های گارانتی.','tickets':'تیکت‌ها و گفتگوهای پشتیبانی با پیام و پیوست.','reviews':'دیدگاه‌های کالا.','questions':'پرسش و پاسخ کالا.','team':'اعضای تیم و نقش هر کدام.','roleDefs':'تعریف نقش‌ها و ماژول‌های هر نقش.','access':'دسترسی اختصاصی هر فرد (افزوده/گرفته).','audit':'لاگ ممیزی همهٔ تغییرها: چه کسی، چه کاری، قبل و بعد.','rules':'قانون‌های کسب‌وکار قابل تنظیم (مهلت ارسال سریع، آستانه‌ها، کف سود…).','partners':'شعب و شرکای فروش با قرارداد، مدل سرمایه، ارسال سریع، پیک، تسویه و امتیاز.','lots':'محموله‌های کالا نزد هر شعبه به تفکیک مدل سرمایه (امانی، کالای شریک، مشترک).','partnerQueue':'صف تأیید کالاهای تازهٔ شعب.','network':'کنترل شبکهٔ شعب: تعطیلی فوری، توقف ارسال سریع، توقف شعبه، ترتیب برداشت موجودی.','merch':'ویترین: غنی‌آف‌های زمان‌دار (`deals`) و جایگاه‌های نمایش (`placements`).','incoming':'خریدهای در راه برای پیش‌ساخت صفحه و محتوا و «به‌زودی».','printLog':'سابقهٔ هر چاپ: سند، شماره، نسخه، کاغذ، چاپ‌کننده.','docSettings':'تنظیمات قالب هر سند چاپی (سبک، رنگ، قلم، حاشیه، فیلدها).','docVersions':'نسخه‌های ذخیره‌شدهٔ قالب‌های چاپ.','site':'پیش‌نویس تنظیمات سایت (سربرگ، منو، فوتر، کارت کالا، خط متحرک کارت).','sitePublished':'نسخهٔ منتشرشدهٔ تنظیمات سایت.','pages':'صفحه‌های صفحه‌ساز (پیش‌نویس).','pagesPublished':'صفحه‌های منتشرشده.','delivery':'تنظیمات ارسال: پیک‌های تحویل سریع، قیمت پویا، تقسیم سبد، قالب پیامک‌ها.','providers':'سرویس‌های بیرونی (درگاه، اقساط، پیامک، حمل، کانال فروش) و وضعیت هر کدام.','hub':'مرکز اتصالات: آداپتورها، وب‌هوک‌ها، رویدادها.','remote':'ربات تلگرام و فرمان پیامکی.','calls':'تلفن ابری: تماس‌ها، صف‌ها، کارشناس‌ها.','nudges':'پیامک‌های پیگیری خودکار و ارسال گروهی.','smsLog':'گزارش پیامک‌های ارسالی.','blog':'مقاله‌ها، ویدیوها، دسته‌ها و دیدگاه‌های وبلاگ.','contentQueue':'صف تولید محتوای اینستاگرام و ویدیو.','warehouses':'انبارها.','layout':'نقشهٔ قفسه‌ها و خانه‌های هر انبار.','moves':'گزارش جابه‌جایی کالا در انبار.','vault':'بایگانی اسناد و مجوزها با یادآوری انقضا.','people':'پرسنل، قرارداد، حقوق و پرداخت‌ها.','entities':'موجودیت‌های عمومی قابل مدیریت (دسته‌ها، برندها، کمپین‌ها، درخواست‌ها…).','bank':'حساب‌ها و رسیدهای کارت‌به‌کارت.','pickups':'تحویل‌های حضوری.','journey':'سفر مشتری: گفتگوهای دستیار و ویجت، پرداخت‌های ناموفق.','storeCfg':'هویت فروشگاه، باشگاه مشتریان، قوانین پرداخت، فیدها و کلیدهای API.','acct':'اطلاعات حساب کاربری مشتریان (ایمیل، دستگاه‌ها، درخواست حذف).','promos':'قانون‌های تخفیف شرطی و کمپین‌های UTM.','codes':'شمارنده‌های کد کالا و واحد.','settlements':'تسویه‌ها.','trash':'سطل بازیافت.','seller':'اطلاعات حقوقی فروشنده برای فاکتور.','axes':'ویژگی‌های تنوع (رنگ، حافظه، سایز…).'}
def typ(v):
    if isinstance(v,bool): return 'boolean'
    if isinstance(v,(int,float)): return 'number'
    if isinstance(v,str): return 'date-time' if re.match(r'^\d{4}-\d\d-\d\dT',v) else 'string'
    if isinstance(v,list): return 'array'
    if v is None: return 'null'
    return 'object'
def fields(arr):
    f={}
    for r in arr[:60]:
        if isinstance(r,dict):
            for k,v in r.items():
                f.setdefault(k,set()).add(typ(v))
    return f
lines=[]; sections=[]
for k in sorted(db.keys()):
    v=db[k]
    if isinstance(v,list):
        kind=f'آرایه ({len(v)} رکورد نمونه)'; fl=fields(v)
    elif isinstance(v,dict):
        kind='شیء'; fl={kk:{typ(vv)} for kk,vv in v.items()}
    else: kind=typ(v); fl={}
    lines.append(f"| `{k}` | {kind} | {DESC.get(k,'')} |")
    if fl:
        sections.append(f"### `{k}`\n\n{DESC.get(k,'')}\n\n| فیلد | نوع |\n|---|---|\n"+'\n'.join(f"| `{a}` | {' / '.join(sorted(t))} |" for a,t in list(fl.items())[:60]))
W('04-data-model.md', f"""
# ۰۴ · مدل داده

پروتوتایپ همهٔ داده را در یک شیء در `localStorage` نگه می‌دارد (`src/shared/lib/store.ts`، کلید `ghanimat-demo-db-vNN`). هر تغییر با `mutate(fn, log)` انجام می‌شود که هم داده را عوض می‌کند و هم یک ردیف در `audit` می‌نویسد. **در نسخهٔ تولید، هر «مجموعه» زیر یک جدول یا سرویس سمت سرور است** و `mutate` به فراخوانی API تبدیل می‌شود.

- تعریف دقیق تایپ‌ها: `src/shared/data/seed.ts` و فایل‌های هم‌کنار در `src/shared/data/` (مثلاً `partners.ts`، `merch.ts`، `incoming.ts`).
- دادهٔ نمونه: `makeSeed()` در `seed.ts` و تابع‌های `make*()` هر فایل.
- فیلدهای زیر از اجرای واقعی پنل با دادهٔ نمونه خوانده شده‌اند؛ تایپ دقیق را از فایل‌های بالا بگیرید.
- خروجی ماشینی همین مدل: `docs/developer/data-model.json` و اسکیمای API: `docs/developer/openapi.yaml`.

## فهرست مجموعه‌ها

| مجموعه | نوع | توضیح |
|---|---|---|
""" + '\n'.join(lines) + "\n\n## فیلدهای هر مجموعه\n\n" + '\n\n'.join(sections))
json.dump({k:(dict((a,sorted(t)) for a,t in fields(v).items()) if isinstance(v,list) else ({kk:typ(vv) for kk,vv in v.items()} if isinstance(v,dict) else typ(v))) for k,v in db.items()}, open(OUT+'/data-model.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)

# ═══ 05 وضعیت‌ها و قانون‌ها
grp={}
for code,lab,tone in STAT: grp.setdefault(code.split('.')[0],[]).append((code,lab,tone))
W('05-statuses-and-rules.md', """
# ۰۵ · وضعیت‌ها، چرخهٔ عمر و قانون‌های کسب‌وکار

## وضعیت‌ها

منبع: `src/shared/data/statuses.ts`. هر وضعیت یک کد ماشینی (برای API و پایگاه‌داده) و یک برچسب فارسی و رنگ (`tone`) دارد. **کدها را عیناً در بک‌اند استفاده کنید.**

""" + '\n\n'.join(f"### `{g}`\n\n| کد | برچسب | رنگ |\n|---|---|---|\n"+'\n'.join(f"| `{c}` | {l} | `{t}` |" for c,l,t in v) for g,v in grp.items()) + """

## چرخهٔ عمر سفارش و مرسوله

- سفارش: `order.awaiting_payment` ← `order.paid` ← (`order.needs_decision` در کمبود موجودی، `order.suspicious` در ریسک بالا) ← `order.preparing` ← `order.shipped` ← `order.delivered`؛ لغو: `order.cancelled`.
- مرسوله (هر سفارش ممکن است چند مرسوله از چند انبار داشته باشد): `ship.pending` ← `ship.picking` ← **عکس بسته اجباری** ← `ship.packed` ← `ship.handed` / `ship.in_transit` ← `ship.delivered`. برای شعب: `ship.partner_confirm` پیش از آماده‌سازی.
- تحویل حضوری: `ship.pickup_ready` و ثبت تحویل با نام تحویل‌گیرنده (کد تحویل حذف شده است).
- یادداشت‌های سفارش (`customerNote`، `notes[]`): درخواست‌های «باید اعمال شود» تا «انجام شد» بالای سفارش، در پرتال شعبه، حالت ساده و برگهٔ جمع‌آوری نمایش داده می‌شوند.

## قانون‌های قابل تنظیم (`rules`)

| کلید | گروه | نام | مقدار نمونه | واحد | توضیح |
|---|---|---|---|---|---|
""" + '\n'.join(f"| `{k}` | {g} | {n} | {v} | {u} | {d} |" for k,g,n,v,u,d in RULES) + """

## قانون‌های دامنه که باید سمت سرور هم اجرا شوند

- **غنی‌آف** (`merch.deals`): یک کالا هم‌زمان دو غنی‌آف هم‌پوشان ندارد؛ با پایان زمان یا رسیدن `sold` به `cap` قیمت به `regular` برمی‌گردد؛ سقف خرید هر مشتری `perUser`. وضعیت از `dealStatus()` در `src/shared/data/merch.ts`.
- **جایگاه‌های ویترین** (`merch.placements`): قانون خودکار + سنجاق (`pins`) − پنهان (`excl`)؛ `placementItems()`.
- **ارسال سریع**: `fastOn()` در `src/shared/data/partners.ts` (تعطیلی فوری، توقف سراسری، توقف شعبه، فعال بودن ارسال سریع شعبه).
- **ترتیب برداشت موجودی**: `network.priority`؛ اولین نقطهٔ فعالِ دارای موجودی.
- **مدل سرمایهٔ شعب**: امانی (`hq`)، کالای شریک (`partner`)، مشترک (`shared`)؛ صورت‌حساب با `statement()`، امتیاز با `scorecard()`، دفتر حساب با `ledger()`.
- **کالای استوک و جعبه‌باز**: دست‌کم ۲ عکس واقعی همان واحد پیش از انتشار؛ کالای اکبند گرید ندارد.
- **حذف امن**: کالای دارای سفارش باز حذف نمی‌شود (پیشنهاد توقف فروش)؛ نقش دارای عضو با انتقال اعضا حذف می‌شود؛ دستهٔ دارای کالا با انتقال کالاها حذف می‌شود.
- **دلیل‌ها**: لغو، رد، مرجوعی و حذف همیشه با دلیل از فهرست قابل ویرایش (`reasonPresets`) و گزینهٔ «سایر» با متن اجباری.
""")

# ═══ 07 توکن‌ها
def dtcg(vs):
    o={}
    for k,v in vs.items():
        v=v.strip()
        if re.match(r'^#[0-9a-fA-F]{3,8}$',v): o[k]={'$type':'color','$value':v}
        elif re.match(r'^\d+px$',v): o[k]={'$type':'dimension','$value':v}
        elif k.startswith('shadow'): o[k]={'$type':'shadow','$value':v}
        else: o[k]={'$value':v}
    return o
fontsz={k:v for k,v in theme.items() if re.match(r'^text-\d+$',k)}
tokens={'$description':'Ghanimat design tokens (W3C DTCG). Import with Tokens Studio for Figma → Figma Variables (light/dark modes).','light':dtcg(light),'dark':dtcg(dark),'typography':{'font-family':{'$type':'fontFamily','$value':['Peyda','Vazirmatn','system-ui','sans-serif']},**{k:{'$type':'dimension','$value':v} for k,v in fontsz.items()}},'radius':{'sm':{'$type':'dimension','$value':'6px'},'md':{'$type':'dimension','$value':'8px'},'lg':{'$type':'dimension','$value':'12px'},'xl':{'$type':'dimension','$value':'16px'},'2xl':{'$type':'dimension','$value':'20px'}}}
json.dump(tokens, open(OUT+'/design-tokens.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
ui_exports=[]
for f in sorted(os.listdir(R+'/src/shared/ui')):
    if f.endswith('.tsx'):
        for name in re.findall(r'^export function (\w+)', rd('src/shared/ui/'+f), re.M): ui_exports.append((name,f))
W('07-design-system.md', """
# ۰۷ · سیستم طراحی و کامپوننت‌ها

- **فونت**: Peyda نسخهٔ NoEn (`src/fonts/peyda/*.woff2`، تعریف در `src/fonts/peyda.css`)؛ متن لاتین روی Vazirmatn می‌افتد. اعداد فارسی با `fa()` در `src/shared/lib/fa.ts`.
- **جهت**: کل رابط RTL است (`dir="rtl"` روی `html`). در Tailwind از `ms-/me-/ps-/pe-/start/end` استفاده شده تا با جهت درست کار کند.
- **رنگ برند**: `#0000ff`؛ متن اصلی `#10123d`. تم تیره با `data-theme="dark"` روی `html`.
- **توکن‌ها**: همهٔ رنگ‌ها، فاصله‌ها و اندازهٔ قلم‌ها متغیر CSS در `src/styles.css` هستند و در `@theme inline` به کلاس‌های Tailwind وصل شده‌اند (مثلاً `bg-brand-solid`، `text-t2`، `border-line`، `text-13`). خروجی استاندارد: **`docs/developer/design-tokens.json`** (فرمت W3C DTCG، با حالت روشن و تیره) برای وارد کردن در Figma با افزونهٔ Tokens Studio.
- **صفحهٔ زندهٔ سیستم طراحی**: مسیر `/admin/design` (کامپوننت‌ها، حالت‌ها، رنگ‌ها و قلم‌ها در عمل).

## رنگ‌ها (حالت روشن / تیره)

| توکن | روشن | تیره |
|---|---|---|
""" + '\n'.join(f"| `--{k}` | `{light[k].strip()}` | `{dark.get(k,'—').strip()}` |" for k in light if not k.startswith(('row-','sidebar'))) + """

## اندازهٔ قلم

| کلاس | اندازه |
|---|---|
""" + '\n'.join(f"| `text-{k[5:]}` | {v} |" for k,v in fontsz.items()) + """

## کامپوننت‌های مشترک (`src/shared/ui/`)

| کامپوننت | فایل |
|---|---|
""" + '\n'.join(f"| `{n}` | `src/shared/ui/{f}` |" for n,f in ui_exports) + """

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
""")

PAP=lambda p: ', '.join(re.findall(r"'([^']+)'",p))
# ═══ 08 اسناد چاپی
W('08-print-documents.md', """
# ۰۸ · اسناد چاپی

منبع: `src/admin/print/PrintCenter.tsx` (فهرست اسناد و ویرایش قالب) و `src/admin/print/docs.tsx` (طرح هر سند). اندازه‌ها با میلی‌متر و برای چاپگر واقعی تنظیم شده‌اند.

| شناسه | سند | منبع داده | اندازه‌های کاغذ |
|---|---|---|---|
""" + '\n'.join(f"| `{i}` | {l} | `{s}` | {PAP(p)} |" for i,l,s,p in DOCS) + """

- **قالب هر سند** در `docSettings[docId]`: سبک (`classic`/`modern`/`minimal`)، رنگ اصلی، اندازهٔ قلم، حاشیه، مهر، فیلدهای نمایشی و پانویس. «اعمال روی همهٔ اسناد» سبک را برای همه کپی می‌کند. هر ذخیره در `docVersions` نسخه می‌خورد.
- **سابقهٔ چاپ** در `printLog` (سند، شماره، نسخهٔ چندم، کاغذ، چاپ‌کننده، زمان). بایگانی: `/admin/print?view=archive`.
- **چاپگرهای هدف**: حرارتی ۴ اینچ برای ۱۰۰×۱۵۰ و ۱۰۰×۱۰۰؛ انتقال حرارتی برای برچسب کالا ۵۰×۳۰؛ لیزری A4؛ رسید ۸۰ میلی‌متری.
- در تولید: تولید PDF سمت سرور (یا چاپ مستقیم ZPL برای Zebra) پیشنهاد می‌شود؛ طرح‌های HTML/CSS فعلی مرجع دقیق ابعاد و فیلدها هستند.
""")

# ═══ 06 قرارداد API: کاتالوگ عملیات نوشتنی + OpenAPI
acts={}
for root,_,fs in os.walk(R+'/src'):
    for f in fs:
        if not f.endswith(('.ts','.tsx')): continue
        p=os.path.join(root,f); rel=os.path.relpath(p,R)
        for i,line in enumerate(open(p,encoding='utf-8'),1):
            for a in re.findall(r"action: '([^']+)'", line): acts.setdefault(rel,[]).append((a,i))
MOD={'orders':'orders','catalog':'products','partner':'partners','print':'print','merch':'merch','blog':'blog','site':'site','builder':'pages','cx':'cx','people':'people','team':'team','warehouse':'warehouse','finance':'finance','social':'social','pro':'integrations','customer':'customers','simple':'ops','logistics':'shipping','settings':'settings','pages':'(چند ماژول)','shared':'(مشترک)','home':'home','insight':'insight','analytics':'analytics'}
def mod(rel):
    parts=rel.split('/'); return MOD.get(parts[2] if parts[1]=='admin' else parts[1], parts[-2])
tot=sum(len(v) for v in acts.values())
body=[]
for rel in sorted(acts):
    seen2=[]; 
    for a,i in acts[rel]:
        if a not in [x for x,_ in seen2]: seen2.append((a,i))
    body.append(f"### `{rel}` — ماژول `{mod(rel)}`\n\n| عملیات (ثبت در لاگ ممیزی) | خط |\n|---|---|\n"+'\n'.join(f"| {a} | [{i}](../../{rel}#L{i}) |" for a,i in seen2))
W('06-api-contract.md', f"""
# ۰۶ · قرارداد API و فهرست عملیات

پروتوتایپ بک‌اند ندارد. این سند می‌گوید سرور چه چیزی باید فراهم کند.

## اصول

1. **REST با JSON**، پیشوند `/api/v1`، احراز هویت با توکن حامل (JWT کوتاه‌عمر + refresh) پس از ورود با کد یکبارمصرف پیامکی.
2. **هر مجموعه در `04-data-model.md` یک منبع (resource) است**: `GET /api/v1/{{collection}}` با صفحه‌بندی (`page`، `size`)، مرتب‌سازی (`sort`)، جست‌وجو (`q`) و فیلتر وضعیت (`status` با کدهای `05-statuses-and-rules.md`)؛ `GET/PATCH/DELETE /api/v1/{{collection}}/{{id}}` و `POST /api/v1/{{collection}}`.
3. **هر عملیات دامنه یک endpoint فعل‌دار است** نه یک PATCH خام؛ مثلاً `POST /api/v1/orders/{{id}}/cancel` با بدنهٔ `{{ reasonCode, reasonText }}`. فهرست کامل عملیات‌ها پایین همین سند است ({tot} فراخوانی در کد، هر کدام با خط دقیق).
4. **دسترسی سمت سرور** با همان شناسه‌های ماژول `03-screens-and-routes.md` و جدول مجوز عملیات (`perms`: `allow` / `approve` / `deny`). عملیات نیازمند تأیید یک ردیف در `approvals` می‌سازد.
5. **لاگ ممیزی** برای همهٔ عملیات نوشتنی: کاربر، عملیات، هدف، مقدار قبل و بعد، زمان، IP. ساختار ردیف همان `audit` در دادهٔ نمونه.
6. **حذف نرم**: حذف به `trash` می‌رود و قابل بازگردانی است.
7. **رویدادها**: تغییر وضعیت سفارش، مرسوله، پرداخت و موجودی یک رویداد منتشر می‌کند (برای وب‌هوک‌ها `hub.webhooks`، پیامک‌ها `delivery`/`nudges` و ربات تلگرام `remote`).
8. **زمان‌ها** ISO-8601 با منطقهٔ تهران؛ نمایش شمسی فقط در کلاینت. **مبالغ** عدد صحیح به تومان.

- اسکیمای ماشینی: **`openapi.yaml`** (قابل باز کردن در Swagger UI، Postman، Stoplight یا تولید کد کلاینت با openapi-generator).
- دادهٔ نمونهٔ کامل برای seed پایگاه‌داده و تست: **`sample-db.json`**.

## فهرست عملیات نوشتنی به تفکیک فایل

{chr(10).join(body)}
""")
def sch(v):
    t=sorted(v) if isinstance(v,list) else [v]
    t=[x for x in t if x!='null'] or ['string']
    x=t[0]
    if x=='date-time': return {'type':'string','format':'date-time'}
    if x in('array',): return {'type':'array','items':{}}
    if x=='object': return {'type':'object'}
    return {'type':x}
dm=json.load(open(OUT+'/data-model.json',encoding='utf-8'))
Y=['openapi: 3.0.3','info:','  title: Ghanimat Admin API','  version: 1.0.0','  description: Generated from the prototype data model (docs/developer/data-model.json). Each array collection is a REST resource; domain actions are listed in 06-api-contract.md.','servers:','  - url: /api/v1','security:','  - bearer: []','paths:','  /auth/otp:','    post:','      summary: Send one-time login code by SMS','      security: []','      requestBody: {content: {application/json: {schema: {type: object, properties: {mobile: {type: string}}}}}}','      responses: {"204": {description: sent}}','  /auth/verify:','    post:','      summary: Verify code and return tokens','      security: []','      requestBody: {content: {application/json: {schema: {type: object, properties: {mobile: {type: string}, code: {type: string}}}}}}','      responses: {"200": {description: tokens}}']
cols=[k for k,v in dm.items() if isinstance(v,dict) and db.get(k) is not None and isinstance(db[k],list)]
for k in sorted(cols):
    Y+= [f'  /{k}:','    get:',f'      tags: [{k}]',f'      summary: List {k}','      parameters:','        - {name: page, in: query, schema: {type: integer}}','        - {name: size, in: query, schema: {type: integer}}','        - {name: q, in: query, schema: {type: string}}','        - {name: status, in: query, schema: {type: string}}','        - {name: sort, in: query, schema: {type: string}}',f'      responses: {{"200": {{description: ok, content: {{application/json: {{schema: {{type: object, properties: {{items: {{type: array, items: {{$ref: "#/components/schemas/{k}"}}}}, total: {{type: integer}}}}}}}}}}}}}}','    post:',f'      tags: [{k}]',f'      requestBody: {{content: {{application/json: {{schema: {{$ref: "#/components/schemas/{k}"}}}}}}}}','      responses: {"201": {description: created}}',f'  /{k}/{{id}}:','    parameters: [{name: id, in: path, required: true, schema: {type: string}}]','    get:',f'      tags: [{k}]',f'      responses: {{"200": {{description: ok, content: {{application/json: {{schema: {{$ref: "#/components/schemas/{k}"}}}}}}}}}}','    patch:',f'      tags: [{k}]',f'      requestBody: {{content: {{application/json: {{schema: {{$ref: "#/components/schemas/{k}"}}}}}}}}','      responses: {"200": {description: updated}}','    delete:',f'      tags: [{k}]','      description: Soft delete to trash','      responses: {"204": {description: moved to trash}}']
Y+=['components:','  securitySchemes:','    bearer: {type: http, scheme: bearer, bearerFormat: JWT}','  schemas:']
for k in sorted(cols):
    Y.append(f'    {k}:'); Y.append('      type: object'); Y.append('      properties:')
    for f_,t in dm[k].items():
        Y.append(f'        {json.dumps(f_)}: {json.dumps(sch(t))}')
open(OUT+'/openapi.yaml','w',encoding='utf-8').write('\n'.join(Y)+'\n')
print('ok', len(NAV), len(routes), len(ROLES), len(STAT), len(RULES), len(DOCS), len(ui_exports))
