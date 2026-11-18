const {chromium}=require('playwright');const fs=require('fs');
const B='http://localhost:4174/#';const OUT=require('path').join(__dirname,'../../docs/screens');fs.mkdirSync(OUT,{recursive:true});
const app=fs.readFileSync(require('path').join(__dirname,'../../src/App.tsx'),'utf8');
const EX={':id':{'orders':'GH-10481','catalog':'p2','unit':'GU-20411','customers':'c1','blog':'a1','people':'pp1'},':key':'فروش امروز'};
let routes=[...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)/g)].map(m=>m[1]).filter(p=>p!=='/login'&&p!=='*');
routes=[...new Set(routes)].map(p=>p.startsWith('/')?p:'/admin/'+p);
routes.unshift('/admin');
const real=p=>p.replace(/(\w+)\/:id/,(m,k)=>k+'/'+(EX[':id'][k]||'x')).replace(':key',encodeURIComponent(EX[':key']));
const slug=p=>p.replace(/^\/+|\/+$/g,'').replace(':id','id').replace(/[^a-z0-9]+/g,'-')||'root';
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const p=await c.newPage();
 await p.goto(B+'/login');await p.screenshot({path:OUT+'/login.jpg',type:'jpeg',quality:62});
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('ghanimat-demo-session-v1',JSON.stringify({userId:'u1',theme:'light'}))});await p.reload();await p.waitForTimeout(600);
 const tall=async(pg,w,path,q)=>{const h=await pg.evaluate(()=>{let m=document.documentElement.scrollHeight;document.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+4){m=Math.max(m,e.scrollHeight+(e.getBoundingClientRect().top))}});return Math.ceil(m)});const H=Math.min(Math.max(h,900),7000);await pg.setViewportSize({width:w,height:H});await pg.waitForTimeout(250);await pg.screenshot({path,type:'jpeg',quality:q});await pg.setViewportSize({width:w,height:900})};
 const list=[];
 for(const r of routes){ if(r.includes('*'))continue;
  // blog id: pick first real article
  let url=real(r);
  if(r==='/admin/blog/:id')url='/admin/blog/ar1';
  if(r==='/admin/people/:id')url='/admin/people/e1';
  await p.goto(B+url);await p.waitForTimeout(700);
  const f=slug(r)+'.jpg';await tall(p,1440,OUT+'/'+f,62);list.push([r,url,f]);
 }
 for(const [u,r] of [['u3','/simple'],['u4','/partner']]){await p.evaluate(u=>{const k='ghanimat-demo-session-v1';const o=JSON.parse(localStorage.getItem(k));o.userId=u;localStorage.setItem(k,JSON.stringify(o))},u);await p.goto(B+r);await p.reload();await p.waitForTimeout(800);await tall(p,1440,OUT+'/'+r.slice(1)+'.jpg',62);list.push([r,r,r.slice(1)+'.jpg'])}
 // mobile samples
 const m=await b.newContext({...require('playwright').devices['iPhone 13']});const mp=await m.newPage();await mp.goto(B+'/login');await mp.evaluate(()=>{localStorage.clear();localStorage.setItem('ghanimat-demo-session-v1',JSON.stringify({userId:'u1',theme:'light'}))});await mp.reload();
 for(const r of ['/admin','/admin/orders','/admin/orders/GH-10481','/admin/catalog']){await mp.goto(B+r);await mp.waitForTimeout(700);await mp.screenshot({path:OUT+'/mobile-'+slug(r)+'.jpg',type:'jpeg',quality:60,fullPage:true})}
 // dark
 await p.evaluate(()=>{const k='ghanimat-demo-session-v1';const o=JSON.parse(localStorage.getItem(k));o.userId='u1';o.theme='dark';localStorage.setItem(k,JSON.stringify(o))});
 for(const r of ['/admin','/admin/orders']){await p.goto(B+r);await p.reload();await p.waitForTimeout(700);await tall(p,1440,OUT+'/dark-'+slug(r)+'.jpg',62)}
 fs.writeFileSync(OUT+'/index.json',JSON.stringify(list,null,1));console.log(list.length);await b.close()})();
