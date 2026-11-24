// ۱.۴.۴۶ — نوبت ۱۰: خطاهای قطعیِ ارزیابی نهایی: «به‌جز/بدون» + عبارت چندواژه‌ایِ ردیف («قسط وام»، «قبض آب») وارونه/خالی نمی‌شود؛ «قبض برق» ردیف است نه کل دستهٔ قبوض؛ جمع بی‌نوع درآمد+هزینه سرخط بی‌معنا ندارد؛ «چقدر شد؟» بی موضوع پرسیده می‌شود؛ پیام «نبودن نتیجه» یکسان؛ «دستهٔ» پیام تصحیح ندارد.
// فقط دادهٔ ساختگی؛ اعداد مرجع مستقل از دستیار از خودِ ردیف‌ها جمع زده می‌شوند.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => fa(n.toLocaleString('en-US'));
const NUM = /[۰-۹][۰-۹,]{3,}/;
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const row = (id, d, a, s) => ({ id, day: '2', desc: d, amount: a, status: s || 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 });
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e.map((r, k) => row('e' + k, r[0], r[1], r[2])) }]; pd.income.sections = [{ id: 'I', title: t, rows: i.map((r, k) => row('i' + k, r[0], r[1], r[2])) }]; return pd; };
    const cur = mk([['بنزین', 100000], ['اسنپ', 85000], ['قبض برق', 300000], ['قسط وام', 700000], ['دکتر', 250000], ['تپسی', 45000, 'unpaid']], [['حقوق', 9000000], ['پاداش', 1000000, 'unpaid']]);
    const prev = mk([['بنزین', 400000], ['قبض آب', 120000], ['برنج', 90000]], [['حقوق', 8000000]]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const r = hkAsstAsk(q); return { q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }; }), qs);
  const seq = (pairs) => page.evaluate((pairs) => pairs.map(p => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const out = []; p.forEach(q => { const r = hkAsstAsk(q); out.push({ q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }); }); return out; }), pairs);
  const isAsk = (r) => r.decision === 'ask' && !r.tool;
  const A = (r) => r.args || {};
  const before = await page.evaluate(() => JSON.stringify(archive));
  // ۱) «بدون/به‌جز» + عبارت چندواژه‌ای ردیف: فقط همان ردیف‌ها کنار می‌روند (نه «دستهٔ مثبت + حذف همان دسته» = خالی)
  const X = await ask(['به‌جز قسط وام چقدر خرج کردم', 'بدون قسط وام خرج این ماه', 'هزینه‌های ماه قبل به‌جز قبض آب', 'خرج بدون قبض برق']);
  ok(X.every(r => !(A(r).cats || []).length && (A(r).excludeText || []).length === 1), 'عبارت چندواژه‌ای: excludeText یک عبارت؛ هیچ دستهٔ مثبتی نمی‌ماند');
  ok(X[0].text.indexOf(fmt(100000 + 85000 + 300000 + 250000 + 45000 + 400000 + 120000 + 90000)) >= 0, '«به‌جز قسط وام»: جمع بقیهٔ هزینه‌ها (با پرداخت‌نشده) درست');
  ok(X[2].text.indexOf(fmt(400000 + 90000)) >= 0 && !/ثبت نشده/.test(X[2].text), '«ماه قبل به‌جز قبض آب»: ۴۹۰٬۰۰۰ (نه «ثبت نشده»)');
  ok(!X.some(r => /ثبت نشده/.test(r.text)), 'هیچ‌کدام به‌اشتباه «ثبت نشده» نمی‌دهد');
  // ۲) «قبض برق» ردیف است؛ «قبض‌ها» دسته
  const R = await ask(['قبض برق چقدر شد', 'فقط قبض برق رو بگو', 'قبظ برق چقدر شد', 'قبض‌ها چقدر شد']);
  ok(A(R[0]).text === 'قبض برق' && !A(R[0]).cats && R[0].text.indexOf(fmt(300000)) >= 0, '«قبض برق» = ردیف، ۳۰۰٬۰۰۰ (نه کل قبوض ۴۲۰٬۰۰۰)');
  ok(A(R[1]).text === 'قبض برق', '«فقط قبض برق»: ردیف');
  ok(A(R[2]).text === 'قبض برق' && R[2].text.indexOf(fmt(300000)) >= 0 && /«قبظ» را «قبض»/.test(R[2].text), 'غلط املایی: با نوشتهٔ واقعی داده اجرا شد و تصحیح گفته شد؛ «ثبت نشده» کاذب نیست');
  ok((A(R[3]).cats || [])[0] === 'bills' && R[3].text.indexOf(fmt(420000)) >= 0, '«قبض‌ها» همچنان دسته (۴۲۰٬۰۰۰)');
  // ۳) جمع بی‌نوع: سرخط عدد درآمد+هزینه ندارد؛ سه خط درآمد/هزینه/مانده
  const T = await ask(['تراز این ماه من چنده؟', 'جمع کل تراکنش‌ها']);
  ok(T.every(r => /درآمد:/.test(r.text) && /هزینه:/.test(r.text) && /مانده:/.test(r.text) && !/تومان \(\d+|[۰-۹]+ تراکنش\)\.\n/.test('') && !/: [۰-۹,]+ تومان \([۰-۹]+ تراکنش\)/.test(r.text.split('\n')[0])), 'سرخط جمع مختلط ندارد');
  ok(T[0].text.indexOf(fmt(10000000 - 1480000)) >= 0 || T[0].text.indexOf(fmt(10000000 - 1480000 - 0)) >= 0 || /مانده: [۰-۹,]+/.test(T[0].text), 'مانده در متن است');
  // ۴) بی موضوع: پرسش
  const P = await ask(['چقدر شد؟', 'جمعش؟']);
  ok(P.every(r => isAsk(r) && !NUM.test(r.text)), '«چقدر شد؟/جمعش؟» بی زمینه: پرسش، بی عدد');
  const Pc = await seq([['این ماه چقدر خرج کردم', 'جمعش؟']]);
  ok(!isAsk(Pc[0][1]) && Pc[0][1].tool === 'transactions.aggregate', 'همان با زمینه: ادامه می‌دهد');
  // ۵) پیام «نبودن نتیجه»
  const Z = await ask(['دکتر ماه قبل', 'تراکنش‌های دکتر ماه قبل', 'قبض برق ماه قبل', 'سرچ کن گلابتون', 'قبض برق ماه قبل رو پیدا کن']);
  ok(Z.slice(0, 3).every(r => /برای این شرط تراکنشی ثبت نشده/.test(r.text)), 'شرط شناخته‌شدهٔ بی‌نتیجه: همان «ثبت نشده» در جمع و جست‌وجو');
  ok(Z.slice(3).every(r => /پیدا نکردم/.test(r.text)), 'جست‌وجوی صریح: «پیدا نکردم» حفظ شد');
  const Q = await ask(['خرج بدون زرتی', 'فقط گلابتون']);
  ok(Q.every(r => isAsk(r) && !/ثبت نشده|پیدا نکردم/.test(r.text)), 'شرط ناشناخته هرگز «ثبت نشده» نمی‌شود');
  // ۶) «دستهٔ» بی پیام تصحیح
  const G = await ask(['دستهٔ خوراکی چقدر شد', 'هزینهٔ بنزین چقدر شد']);
  ok(G.every(r => !/را «دسته» در نظر گرفتم|را «هزینه» در نظر گرفتم/.test(r.text)), 'نویسهٔ اضافهٔ «ٔ» بی‌صدا نرمال می‌شود');
  // «چند تومن» = مبلغ (نه تعداد تراکنش)
  const H = await ask(['ماه پیش چند تومن خرجم شد', 'این ماه چند تا خرج دارم']);
  ok(H[0].text.indexOf(fmt(400000 + 120000 + 90000)) >= 0 && !/[۰-۹]+ تراکنش\.$/.test(H[0].text.split('\n')[0]), '«چند تومن»: مبلغ ۶۱۰٬۰۰۰');
  ok(/[۰-۹]+ تراکنش/.test(H[1].text), '«چند تا»: همچنان تعداد');
  const after = await page.evaluate(() => JSON.stringify(archive));
  ok(before === after, 'هیچ داده‌ای تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1440: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
