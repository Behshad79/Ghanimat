// ممیزی کنتراست WCAG AA روی صفحات اصلی، در هر دو تم پنل و هر دو حالت سیستم‌عامل.
// اجرا: npm run build && npx vite preview --port 4173 (در یک ترمینال) و سپس node scripts/contrast-audit.cjs
const {chromium}=require('playwright');
const B='http://localhost:4173/#';
const pages=['/admin','/admin/live','/admin/orders','/admin/orders/GH-10481','/admin/orders/GH-10458','/admin/catalog','/admin/catalog?tab=units','/admin/catalog?tab=card','/admin/catalog/p2','/admin/catalog/unit/GU-20411','/admin/warehouse','/admin/returns','/admin/customers','/admin/support','/admin/reviews','/admin/pricing','/admin/finance?tab=bnpl','/admin/rules','/admin/settings?tab=seller','/admin/design?tab=status','/simple','/partner'];
(async()=>{const b=await chromium.launch();const fails={};let checked=0;
for(const os of ['light','dark'])for(const theme of ['light','dark']){
 const c=await b.newContext({viewport:{width:1440,height:900},colorScheme:os});const p=await c.newPage();
 await p.goto(B+'/login');await p.evaluate((t)=>{localStorage.clear();localStorage.setItem('ghanimat-demo-session-v1',JSON.stringify({userId:'u1',theme:t}))},theme);
 for(const r of pages){
  if(r==='/simple')await p.evaluate(()=>{const k='ghanimat-demo-session-v1';const o=JSON.parse(localStorage.getItem(k));o.userId='u3';localStorage.setItem(k,JSON.stringify(o))});
  if(r==='/partner')await p.evaluate(()=>{const k='ghanimat-demo-session-v1';const o=JSON.parse(localStorage.getItem(k));o.userId='u4';localStorage.setItem(k,JSON.stringify(o))});
  await p.goto(B+r);await p.reload();await p.waitForTimeout(350);
  const res=await p.evaluate(()=>{
   const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});const cache={};
   const parse=s=>{if(!s||s==='transparent')return{r:0,g:0,b:0,a:0};if(cache[s])return cache[s];cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=s;cx.fillRect(0,0,1,1);const[r,g,b,a]=cx.getImageData(0,0,1,1).data;return cache[s]={r,g,b,a:a/255}};
   const lum=({r,g,b})=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
   const blend=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
   const bgOf=el=>{const stack=[];let e=el;while(e){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none'&&!cs.backgroundImage.includes('gradient'))return null;const c=parse(cs.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break}e=e.parentElement}let base={r:255,g:255,b:255,a:1};if(stack.length&&stack[stack.length-1].a<1){base=parse(getComputedStyle(document.body).backgroundColor)}for(let i=stack.length-1;i>=0;i--)base=blend(stack[i],base);return base};
   const out=[];let n=0;
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   const seen=new Set();
   while(walker.nextNode()){const t=walker.currentNode;if(!t.textContent.trim())continue;const el=t.parentElement;if(!el||seen.has(el))continue;seen.add(el);
    const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
    if(el.closest('[aria-hidden="true"],svg,.print-area .shadow-float,option'))continue;
    if(el.closest('button:disabled,[disabled]'))continue;
    let fg=parse(cs.color);const bg=bgOf(el);if(!bg||!fg)continue;
    let op=1;let e=el;while(e){op*=+getComputedStyle(e).opacity;e=e.parentElement}fg={...fg,a:fg.a*op};fg=blend(fg,bg);
    const L1=lum(fg),L2=lum(bg);const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);n++;
    const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700;const large=size>=24||(size>=18.66&&bold);const need=large?3:4.5;
    if(ratio<need-0.01)out.push({text:t.textContent.trim().slice(0,40),ratio:+ratio.toFixed(2),need,fg:cs.color,bg:`rgb(${bg.r|0},${bg.g|0},${bg.b|0})`,size,cls:(el.className||'').toString().slice(0,90)})}
   return{n,out}});
  checked+=res.n;for(const f of res.out){const k=`${f.fg} on ${f.bg} (${f.ratio}<${f.need})`;(fails[k]??=[]).push(`${os}/${theme} ${r} «${f.text}» ${f.size}px`)}
 }await c.close()}
console.log('text nodes checked:',checked);const keys=Object.keys(fails);console.log('failing color pairs:',keys.length);for(const k of keys.sort((a,b)=>fails[b].length-fails[a].length)){console.log(`\n${k}  ×${fails[k].length}`);console.log('   '+[...new Set(fails[k])].slice(0,3).join('\n   '))}
await b.close()})();
