import { createServer } from 'vite'
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null }, setItem(k, v) { this._s[k] = String(v) }, removeItem(k) { delete this._s[k] }, clear() { this._s = {} } }
globalThis.window = globalThis; globalThis.addEventListener = () => {}; globalThis.dispatchEvent = () => {}
const v = await createServer({ root: new URL('../..', import.meta.url).pathname, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
const L = (p) => v.ssrLoadModule(p)
const seed = await L('/src/shared/data/seed.ts'); const stock = await L('/src/shared/data/stock.ts'); const inbound = await L('/src/shared/data/inbound.ts'); const ledger = await L('/src/shared/data/ledger.ts'); const ops = await L('/src/admin/inbound/ops.ts')
const R = []; const ok = (name, cond, info = '') => R.push({ name, pass: !!cond, info: String(info).slice(0, 300) })
const clone = (x) => structuredClone(x)
let d = seed.makeSeed()
// 1. یکتایی کد برچسب‌ها
const codes = new Map(); d.products.forEach((p) => (p.variations?.length ? p.variations : [null]).forEach((vv) => d.stock.parties.forEach((o) => { const c = stock.labelCode(d.stock, o.id, p, vv); const k = c.toUpperCase(); if (codes.has(k)) codes.get(k).push(`${p.id}/${vv?.id}/${o.id}`); else codes.set(k, [`${p.id}/${vv?.id}/${o.id}`]) })))
const dup = [...codes].filter(([, a]) => a.length > 1); ok('برچسب‌های کالاهای کاتالوگ یکتا هستند', !dup.length, dup.slice(0, 3).map(([k, a]) => `${k}: ${a.join(' | ')}`).join(' ; '))
// 2. کد قلم محموله با کد کالاهای کاتالوگ تداخل ندارد
const bcodes = []; d.incoming.forEach((b) => b.items.forEach((it) => inbound.labelLines(d.stock, it).forEach((ln) => bcodes.push({ c: ln.code.toUpperCase(), b: b.id, it: it.id, built: !!it.productId }))))
const clash = bcodes.filter((x) => !x.built && codes.has(x.c)); ok('کد اقلام محموله با برچسب کالاهای موجود تداخل ندارد', !clash.length, clash.map((x) => `${x.c} (${x.b})`).join(', '))
const bdup = bcodes.filter((x, i) => bcodes.findIndex((y) => y.c === x.c) !== i); ok('کد اقلام محموله‌ها بین خودشان یکتاست', !bdup.length, bdup.map((x) => x.c).join(', '))
// 3. کد محصول تکراری در کاتالوگ
const pc = d.products.map((p) => p.code).filter(Boolean); const pcd = pc.filter((c, i) => pc.indexOf(c) !== i); ok('کد داخلی کالاها تکراری ندارد', !pcd.length, pcd.join(','))
// 4. رسید محموله دوبار
{ const x = clone(d); const b = x.incoming.find((q) => !q.receivedAt && q.items.length); const got = {}; b.items.forEach((it) => inbound.labelLines(x.stock, it).forEach((ln) => { got[`${it.id}|${ln.v?.id ?? ''}|${ln.owner}`] = ln.qty }))
  const lots0 = x.stock.lots.length; ops.landBatch(x, b.id, got, 'تست'); const lots1 = x.stock.lots.length; ops.landBatch(x, b.id, got, 'تست'); const lots2 = x.stock.lots.length
  ok('رسید دوبارهٔ یک محموله موجودی را دوبار ثبت نمی‌کند', lots2 === lots1, `lots ${lots0}→${lots1}→${lots2}`)
  const prods = b.items.map((it) => it.productId); ok('رسید محموله برای هر قلم صفحهٔ کالا می‌سازد', prods.every(Boolean))
  const totalGot = Object.values(got).reduce((a, q) => a + q, 0); const at = b.landing ?? 'tehran'; const inLanding = x.stock.lots.slice(0, lots1 - lots0).reduce((a, l) => a + l.qty, 0); ok('همهٔ رسیده‌ها در انبار ورودی ثبت شد', inLanding === totalGot, `${inLanding} از ${totalGot}`)
  // برچسب قبل و بعد از ساخت صفحه یکی است
  const mism = []; b.items.forEach((it) => inbound.labelLines(x.stock, it).forEach((ln) => { const p = x.products.find((q) => q.id === it.productId); const vv = ln.v ? p.variations?.find((q) => q.suffix === ln.v.suffix) : null; const after = stock.labelCode(x.stock, ln.owner, p, vv); if (after !== ln.code) mism.push(`${ln.code}≠${after}`) }))
  ok('کد برچسب بعد از ساخت صفحه همان کد چاپ‌شده است', !mism.length, mism.join(', '))
  const hv = x.stock.manifests.filter((m) => m.batchId === b.id); ok('برای سهم انبارهای دیگر حواله ساخته شد', hv.length > 0 || Object.values(got).length === 0, `${hv.length} حواله`)
  // تحویل حواله دوبار
  if (hv[0]) { const m = hv[0]; m.status = 'sent'; m.lines.forEach((l) => { l.packed = l.qty; l.received = l.qty }); const before = JSON.stringify(x.stock.lots.map((l) => [l.warehouse, l.qty])); ops.receiveManifest(x, m.id, 't'); const mid1 = x.stock.lots.length; ops.receiveManifest(x, m.id, 't'); const mid2 = x.stock.lots.length
    ok('تحویل دوبارهٔ یک حواله موجودی را دوبار منتقل نمی‌کند', mid1 === mid2, `lots ${mid1}→${mid2}`)
    const neg = x.stock.lots.filter((l) => l.qty < 0); ok('هیچ لاتی منفی نمی‌شود', !neg.length, neg.length) }
}
// 5. تحویل حوالهٔ «در حال جمع‌آوری» (ارسال‌نشده) ممنوع
{ const x = clone(d); const m = x.stock.manifests.find((q) => q.status === 'packing'); if (m) { m.lines.forEach((l) => { l.received = l.qty }); const before = x.stock.lots.length; try { ops.receiveManifest(x, m.id, 't') } catch {} ok('حوالهٔ ارسال‌نشده را نمی‌شود تحویل گرفت', x.stock.lots.length === before && m.status === 'packing', `status ${m.status}`) } }
// 6. انتقال بیش از موجودی مبدأ
{ const x = clone(d); const m = x.stock.manifests.find((q) => q.status === 'sent'); if (m) { const ln = m.lines[0]; const have = x.stock.lots.filter((l) => l.productId === ln.productId && (l.variationId ?? '') === (ln.variationId ?? '') && l.owner === ln.owner && l.warehouse === m.from).reduce((a, l) => a + l.qty, 0); ln.received = have + 5; ln.qty = have + 5; ops.receiveManifest(x, m.id, 't')
  const dst = x.stock.lots.filter((l) => l.productId === ln.productId && l.owner === ln.owner && l.warehouse === m.to && l.ref?.includes(m.id)).reduce((a, l) => a + l.qty, 0); ok('تحویل حواله بیش از موجودی مبدأ، موجودی از هیچ نمی‌سازد', dst <= have, `مبدأ ${have} · ثبت در مقصد ${dst}`) } }
// 7. تطبیق پول
{ const b = d.incoming.find((q) => q.funding?.length); const r = inbound.fundRecon(b); ok('تطبیق پول نمونه محاسبه می‌شود', r.rows.length >= 2, JSON.stringify(r.rows.map((q) => [q.party, q.paid, q.goods, q.diff]))) ; const z = inbound.fundIn({ amount: 34450000, cur: 'تومان', rate: 1 }, b); ok('تبدیل ارز ردیف تومانی به دلار محموله درست است', Math.abs(z - 500) < 0.01, z) ; const zz = inbound.fundIn({ amount: 100, cur: 'درهم' }, b); ok('ردیف ارزی بدون نرخ صفر حساب می‌شود و هشدار لازم دارد', zz === 0, zz) }
// 8. landed: محموله با جمع بهای صفر
{ const b = { currency: 'دلار', rate: 60000, freight: 1000, items: [{ id: 'a', name: 'x', qty: 2 }] }; const L1 = inbound.landed(b, b.items[0]); ok('محموله بدون بها خطای تقسیم بر صفر نمی‌دهد', Number.isFinite(L1.unit), JSON.stringify(L1)) }
// 9. takeLots بیش از موجودی
{ const x = clone(d); const l = x.stock.lots.find((q) => q.qty > 0); const t = ledger.takeLots(x, { productId: l.productId, variationId: l.variationId, owner: l.owner, warehouse: l.warehouse }, 99999); ok('برداشت بیش از موجودی، کم‌برداشت را گزارش می‌کند', t.taken < 99999, JSON.stringify({ taken: t.taken })) ; ok('بعد از برداشت بیش از موجودی، لات منفی نمی‌شود', !x.stock.lots.some((q) => q.qty < 0)) }
// 10. تراز تسویه
{ const bal = stock.balances(d.stock); ok('ترازهای تسویه عدد معتبرند', bal.every((q) => Number.isFinite(q.net)), JSON.stringify(bal.slice(0, 3))) }
// 11. split: فروش با مالک شریک و قرارداد ندارد
{ const s = d.stock.sales.find((q) => q.owner !== 'gh'); if (s) { const sp = stock.split(d.stock, s); ok('تقسیم سهم فروش کالای شریک اعداد معتبر دارد', [sp.revenue, sp.profit, sp.ownerTotal].every(Number.isFinite), JSON.stringify({ r: sp.revenue, o: sp.ownerTotal, m: sp.model })) } }
// 12. syncQty: موجودی نمایشی هر انبار = لات‌های زنده (بدون نگه‌داشته و منقضی) − رزرو، و هیچ‌وقت منفی نیست
{ const x = clone(d); const bad = []; const oversold = []; const now = Date.now(); x.products.filter((p) => p.mode !== 'serial' && !p.variations?.length).forEach((p) => { ledger.syncQty(x, p.id); if (!x.stock.lots.some((l) => l.productId === p.id)) return
  for (const w of ['tehran', 'mahabad']) { const live = x.stock.lots.filter((l) => l.productId === p.id && l.warehouse === w && l.qty > 0 && !l.hold && !(l.expiry && +new Date(l.expiry) < now)).reduce((a, l) => a + l.qty, 0); const res = ledger.reserved(x, p.id, undefined, w); const exp = Math.max(0, live - res); if ((p.qty?.[w] ?? 0) > exp) bad.push(`${p.id}/${w}: نمایش ${p.qty?.[w]} > ${exp}`); if (res > live) oversold.push(`${p.id}/${w}: رزرو ${res} > موجود ${live}`) } })
  ok('موجودی نمایشی از موجودی زندهٔ منهای رزرو بیشتر نیست (کالای منقضی فروخته نمی‌شود)', !bad.length, bad.slice(0, 4).join('; '))
  ok('هشدار: رزرو سفارش‌های باز از موجودی انبار بیشتر نیست', !oversold.length, oversold.slice(0, 4).join('; ')) }
// 13. resolveCode: کد ناشناخته، کد با فاصله و حروف کوچک
{ const c = bcodes[0]?.c; ok('اسکن کد با حروف کوچک و فاصله شناخته می‌شود', !!inbound.resolveCode(d, `  ${c?.toLowerCase()}  `), c); ok('کد ناشناخته null می‌دهد', inbound.resolveCode(d, 'ZZ-999999') === null) }
// 14. manifestPhase
{ ok('مرحلهٔ حوالهٔ ارسال‌شدهٔ بی‌اسکن «در راه» است', inbound.manifestPhase({ status: 'sent', lines: [{ received: 0 }] }) === 'transit'); ok('بعد از اولین اسکن «رسیده» است', inbound.manifestPhase({ status: 'sent', lines: [{ received: 1 }] }) === 'arrived') }
// 15. سفارش‌ها: جمع اقلام با total
{ const bad = d.orders.filter((o) => o.status !== 'order.cancelled').filter((o) => { const items = o.shipments.flatMap((s) => s.items).filter((i) => !i.cancelled).reduce((a, i) => a + i.price * i.qty, 0); return Math.abs(items + (o.shippingFee ?? 0) - (o.discount ?? 0) - o.total) > 1 }).map((o) => o.id); ok('مبلغ کل سفارش‌های لغونشده با جمع اقلام + ارسال − تخفیف می‌خواند', !bad.length, `${bad.length} سفارش: ${bad.slice(0, 6).join(', ')}`) }
// 16. وضعیت سفارش در برابر وضعیت مرسوله‌ها
{ const bad = d.orders.filter((o) => o.status === 'order.delivered' && o.shipments.some((s) => !['ship.delivered', 'ship.cancelled'].includes(s.status))).map((o) => o.id); ok('سفارش «تحویل‌شده» مرسولهٔ تحویل‌نشده ندارد', !bad.length, bad.join(',')) ; const bad2 = d.orders.filter((o) => o.status === 'order.cancelled' && o.shipments.some((s) => ['ship.handed', 'ship.in_transit'].includes(s.status))).map((o) => o.id); ok('سفارش لغوشده مرسولهٔ در راه ندارد', !bad2.length, bad2.join(',')) }
// 17. مرجوعی بیش از مبلغ سفارش
{ const bad = (d.refunds ?? []).filter((r) => { const o = d.orders.find((q) => q.id === r.orderId); return o && r.amount > o.total }).map((r) => r.id); ok('بازپرداخت از مبلغ سفارش بیشتر نیست', !bad.length, bad.join(',')) }
// 18. تراکنش‌های خزانه: حساب‌های ناموجود
{ const ids = new Set(d.treasury.accounts.map((a) => a.id)); const bad = d.treasury.entries.filter((e) => (e.from && !ids.has(e.from)) || (e.to && !ids.has(e.to))).map((e) => e.id); ok('ردیف‌های خزانه به حساب موجود اشاره می‌کنند', !bad.length, bad.join(',')) ; const neg = d.treasury.accounts.filter((a) => a.kind !== 'capital' && (() => { const T = d.treasury; return T.entries.filter((e) => e.status === 'paid').reduce((s2, e) => s2 + (e.to === a.id ? e.amount : 0) - (e.from === a.id ? e.amount : 0), a.opening) })() < 0).map((a) => a.name); ok('هیچ حسابی ماندهٔ منفی ندارد', !neg.length, neg.join(',')) }
// 19. شریک بدون قرارداد با دیگری
{ const P = d.stock.parties.filter((p) => p.active); const miss = []; P.forEach((a) => P.forEach((b) => { if (a.id !== b.id && !d.stock.agreements.some((g) => g.owner === a.id && g.seller === b.id)) miss.push(`${a.id}→${b.id}`) })); ok('هر جفت شریک فعال قرارداد سهم دارند', !miss.length, miss.join(',')) }
// 20. کانال‌ها و انبارها
{ const whs = new Set(d.stock.warehouses.map((w) => w.id)); const bad = d.stock.lots.filter((l) => !whs.has(l.warehouse)).length; ok('همهٔ لات‌ها در انبار موجودند', !bad, bad); const pids = new Set(d.products.map((p) => p.id)); const orphan = d.stock.lots.filter((l) => !pids.has(l.productId)).length; ok('همهٔ لات‌ها کالای موجود دارند', !orphan, orphan) }
// 21. شیپمنت از انبار شریک متوقف
{ const x = clone(d); const p = x.stock.parties.find((q) => q.id === 'ys'); p.pause = { sell: true, ship: true, at: new Date().toISOString(), by: 't' }; const l = x.stock.lots.find((q) => q.owner === 'ys' && q.qty > 0); const live = ledger.liveLot ? ledger.liveLot(x, l) : null; ok('با توقف شریک، لات او قابل فروش نیست', live === false || live === null || live === undefined ? true : !live, String(live)) }
// 22-30: سایت شریک (ووکامرس)
try { const ext = await L('/src/admin/stock/ExtSites.tsx'); const x = clone(d); const e = x.stock.ext[0]; const ch = x.stock.channels.find((c) => c.seller === e.partyId && c.brand !== 'غنیمت')?.id ?? 've1'
  const o = e.inbox.find((q) => q.id === 've1-5534'); ok('سفارش نمونه با کد قلم محموله در صندوق هست', !!o)
  const r0 = ext.resolveSku(x, e, 'YS-000402-V1'); ok('SKU قلم محموله (بدون صفحه) شناخته می‌شود', !!r0, JSON.stringify(r0 && { p: r0.productId, how: r0.how }))
  const np = x.products.length; const ok1 = ext.importExt(x, e.partyId, 've1-5534', ch, 'تست'); ok('ثبت سفارش سایت با کد محموله، صفحهٔ پیش‌نویس می‌سازد', ok1 && x.products.length === np + 1, `${np}→${x.products.length}`)
  const sale = x.stock.sales.find((q) => q.ext === 've1-5534'); ok('فروش به نام مالک درست (یاسین) ثبت شد', sale?.owner === 'ys', sale?.owner); ok('فروش به کالای ساخته‌شده وصل است، نه شناسهٔ موقت', sale && !String(sale.productId).startsWith('pending:'), sale?.productId)
  const p = x.products.find((q) => q.id === sale?.productId); const it = x.incoming.flatMap((b) => b.items).find((q) => q.productId === p?.id); ok('قلم محموله به همان صفحه وصل شد (ساخت دوباره نمی‌شود)', !!it, it?.id)
  const n2 = x.stock.sales.length; ext.importExt(x, e.partyId, 've1-5534', ch, 'تست'); ok('ثبت دوبارهٔ همان سفارش سایت، فروش تکراری نمی‌سازد', x.stock.sales.length === n2)
  ext.refundExt(x, e.partyId, 've1-5534', 'تست'); const n3 = x.stock.sales.length; ext.refundExt(x, e.partyId, 've1-5534', 'تست'); ok('برگشت دوبارهٔ سفارش سایت، دوبار برنمی‌گرداند', x.stock.sales.length === n3, `${n3}→${x.stock.sales.length}`)
  const unk = ext.resolveSku(x, e, 'NO-SUCH-SKU'); ok('SKU ناشناخته null است و سفارش «نامعلوم» می‌شود', unk === null)
  const lower = ext.resolveSku(x, e, ' gh-000201-1 '); ok('SKU با حروف کوچک و فاصله شناخته می‌شود', !!lower, JSON.stringify(lower && lower.productId))
  // کالای شریک سوم که از جای دیگری آمده (کد بدون پیشوند)
  const neutral = ext.resolveSku(x, e, '000201-1'); ok('کد بدون پیشوند مالک با قاعدهٔ «اول موجودی خود فروشنده» شناخته می‌شود', !!neutral && neutral.how === 'neutral', neutral?.how)
} catch (err) { ok('بارگذاری ماژول سایت شریک', false, err.message) }
console.log(JSON.stringify(R, null, 0)); await v.close(); process.exit(0)
