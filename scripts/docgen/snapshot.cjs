// خروجی گرفتن از پایگاه‌دادهٔ نمونهٔ واقعی پنل در docs/developer/sample-db.json (پیش‌نیاز: vite preview روی پورت 4174)
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const c=await b.newContext();await c.addInitScript(()=>{if(!sessionStorage.getItem('i')){localStorage.clear();localStorage.setItem('ghanimat-demo-session-v1',JSON.stringify({userId:'u1',theme:'light'}));sessionStorage.setItem('i','1')}});
const p=await c.newPage();await p.goto('http://localhost:4174/#/admin/catalog');await p.waitForTimeout(800);
// یک تغییر کوچک تا پایگاه‌داده در localStorage نوشته شود
await p.evaluate(()=>{});await p.getByRole('tab').nth(1).click().catch(()=>{});await p.waitForTimeout(300);
let db=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('ghanimat-demo-db'));return k?localStorage.getItem(k):null});
if(!db){await p.goto('http://localhost:4174/#/admin/team?tab=roles');await p.waitForTimeout(600);await p.getByRole('button',{name:'مرکز عملیات زنده برای مدیر عملیات: دارد'}).click().catch(()=>{});await p.waitForTimeout(300);db=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('ghanimat-demo-db'));return k?localStorage.getItem(k):null})}
fs.writeFileSync(require('path').join(__dirname,'../../docs/developer/sample-db.json'),db||'{}');console.log((db||'').length);await b.close()})();
