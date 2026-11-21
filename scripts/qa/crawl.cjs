// پیمایش همهٔ مسیرها با همهٔ نقش‌ها: خطای اجرا، خطای کنسول، سرریز افقی، تصویر شکسته، صفحهٔ خالی، متن انگلیسی/undefined/NaN
const {chromium}=require('playwright');const fs=require('fs');
const B='http://localhost:4174/#';const app=fs.readFileSync(require('path').join(__dirname,'../../src/App.tsx'),'utf8');
const EX={orders:'GH-10481',catalog:'p2',unit:'GU-20411',customers:'c1',blog:'a1',people:'pp1',returns:'RT-840552',w:'GR-1843'};
let routes=[...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)/g)].map(m=>m[1]).filter(p=>p!=='/login'&&p!=='*');
routes=[...new Set(routes)].map(p=>p.startsWith('/')?p:'/admin/'+p);routes.unshift('/admin');
const real=p=>p.replace(/(\w+)\/:id/,(m,k)=>k+'/'+(EX[k]||'x')).replace(':key',encodeURIComponent('فروش امروز'));
const users=(process.env.USERS||'u1,u2,u3,u4,u5,u6,u7,u8,u9').split(',');const W=+(process.env.W||1440);
(async()=>{const b=await chromium.launch();const out=[];
 for(const u of users){const c=await b.newContext({viewport:{width:W,height:900},reducedMotion:'reduce'});const p=await c.newPage();let errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|net::|Failed to load resource/.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,200))});
  await p.goto(B+'/login');await p.evaluate((u)=>{localStorage.clear();localStorage.setItem('ghanimat-demo-session-v2',JSON.stringify({userId:u,theme:'light'}))},u);await p.reload();await p.waitForTimeout(700);
  for(const r of routes){errs=[];const url=real(r);try{await p.goto(B+url);await p.waitForTimeout(450);
   const info=await p.evaluate(()=>{const m=document.querySelector('main');const txt=(m||document.body).innerText;const ow=document.documentElement.scrollWidth>window.innerWidth+2;
     const broken=[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src&&!i.src.startsWith('data:')).map(i=>i.src.split('/').slice(-2).join('/')).slice(0,3);
     const bad=(txt.match(/undefined|NaN|\[object Object\]|Infinity/g)||[]).slice(0,3);
     const denied=/دسترسی ندارید|اجازهٔ دیدن|دسترسی به این بخش/.test(txt);const loc=location.hash;
     const wide=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>window.innerWidth+4||r.left<-4)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.overflow-x-auto,.overflow-auto,[class*=overflow-x]')}).slice(0,2).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,40));
     return {len:txt.length,ow,broken,bad,denied,loc,wide}});
   out.push({u,r:url,...info,errs:[...errs]});}catch(e){out.push({u,r:url,crash:String(e).slice(0,200)})}}
  await c.close()}
 fs.writeFileSync(process.env.OUT||'qa-crawl.json',JSON.stringify(out,null,1));
 const prob=out.filter(x=>x.crash||x.errs?.length||x.ow||x.broken?.length||x.bad?.length||x.len<60||x.wide?.length);
 console.log('total',out.length,'problems',prob.length);
 for(const x of prob.slice(0,400))console.log(x.u,x.r,JSON.stringify({crash:x.crash,errs:x.errs,ow:x.ow,broken:x.broken,bad:x.bad,len:x.len,wide:x.wide,loc:x.loc}).slice(0,400));
 await b.close()})();
