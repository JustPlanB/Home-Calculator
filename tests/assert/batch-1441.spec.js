// ۱.۴.۴۳ — هات‌فیکس: (۱) «بیشترین/کمترین خرج/هزینه» فقط هزینه‌ها؛ (۲) «نپرداختم» نفی است نه «پرداختم»؛ (۳) تطبیق واژهٔ کامل («نان» ≠ «دانانو»)، با حفظ عبارت چندواژه‌ای و شرح ردیف.
// فقط دادهٔ ساختگی؛ عددها مستقل از دستیار از خودِ ردیف‌ها حساب می‌شوند.
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
    const cur = mk([['بنزین', 100000], ['نان', 40000], ['دانانو', 35000], ['اسنپ', 85000], ['قبض برق', 300000], ['قبض آب', 90000], ['بیمه‌ی ماشین', 500000], ['تپسی', 45000, 'unpaid'], ['دکتر', 250000]], [['حقوق', 9000000], ['پاداش', 1000000, 'unpaid']]);
    const prev = mk([['بنزین', 400000], ['نان', 30000], ['قبض آب', 120000]], [['حقوق', 8000000]]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const r = hkAsstAsk(q); return { q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }; }), qs);
  const seq = (pairs) => page.evaluate((pairs) => pairs.map(p => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const out = []; p.forEach(q => { const r = hkAsstAsk(q); out.push({ q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }); }); return out; }), pairs);
  const isAsk = (r) => r.decision === 'ask' && !r.tool;
  const A = (r) => r.args || {};
  const before = await page.evaluate(() => JSON.stringify(archive));
  /* سطرهای ردیف‌های برگشتی از ابزار (برای بررسی «فقط هزینه») */
  const top = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const r = hkAsstAsk(q); return { q, args: (r.cmd && r.cmd.args) || {}, tool: r.tool || '', rows: ((r.data && r.data.items) || []).map(i => [i.desc, i.amount, i.tab]) }; }), qs);
  // ۱) بیشترین/کمترین: فقط هزینه (یا فقط درآمد وقتی درآمد گفته شده)
  const E = await top(['بیشترین خرج این ماه چی بوده؟', 'کمترین هزینه این ماه کدومه؟', 'بزرگ‌ترین هزینه چیه', 'گران‌ترین خرج ماه قبل', 'بیشترین مخارج کلاً', 'کمترین خرج ماه پیش چی بوده']);
  ok(E.every(r => r.tool === 'transactions.search' && A(r).tab === 'expense'), 'بیشترین/کمترین/بزرگ‌ترین خرج یا هزینه: tab=expense');
  ok(E[0].rows.length === 1 && E[0].rows[0][0] === 'بیمه‌ی ماشین' && E[0].rows[0][2] === 'expense', 'بیشترین خرج این ماه = بیمه ماشین ۵۰۰٬۰۰۰ (نه حقوق ۹٬۰۰۰٬۰۰۰ درآمد)');
  ok(E[1].rows[0][0] === 'دانانو' && E[1].rows[0][2] === 'expense', 'کمترین هزینه این ماه = دانانو ۳۵٬۰۰۰');
  ok(E[2].rows[0][2] === 'expense' && E[3].rows[0][2] === 'expense' && E[5].rows[0][2] === 'expense', 'هیچ ردیف درآمدی وارد نتیجه نمی‌شود');
  const I = await top(['بیشترین درآمد این ماه', 'کمترین واریزی ماه قبل', 'بیشترین مبلغ این ماه', 'ده تا خرج بزرگم', 'سه تا بزرگ‌ترین هزینه']);
  ok(A(I[0]).tab === 'income' && I[0].rows[0][0] === 'حقوق', 'بیشترین درآمد: فقط درآمد (حقوق)');
  ok(A(I[1]).tab === 'income', 'کمترین واریزی: درآمد');
  ok(A(I[2]).tab === undefined, '«بیشترین مبلغ» بی نوع مثل قبل (هم درآمد هم هزینه)');
  ok(A(I[3]).tab === 'expense' && A(I[3]).limit === 10 && A(I[4]).tab === 'expense' && A(I[4]).limit === 3, '«ده تا خرج بزرگم» و «سه تا بزرگ‌ترین هزینه» همچنان N برتر هزینه');
  // ۲) پرداخت‌نشده: «نپرداختم» نفی است
  const U = await ask(['چقدر هنوز نپرداختم؟', 'هنوز نپرداخته‌ام چقدره', 'آقا چقدر نپرداختم', 'چقدر هنوز نگرفتم؟']);
  ok(U.slice(0, 3).every(r => A(r).status === 'unpaid' && A(r).tab === 'expense'), '«نپرداختم/نپرداخته‌ام»: status=unpaid و tab=expense');
  ok(U.slice(0, 3).every(r => r.text.indexOf(fmt(45000)) >= 0 && r.text.indexOf(fmt(45000)) < 80 && !/را «پرداختم»/.test(r.text) && r.text.indexOf(fmt(1850000 - 0)) < 0), 'عدد اصلی ۴۵٬۰۰۰ است (نه کل هزینه‌ها) و تصحیح «پرداختم» نمی‌آید');
  ok(A(U[3]).status === 'unpaid' && A(U[3]).tab === 'income' && U[3].text.indexOf(fmt(1000000)) >= 0, '«نگرفتم»: دریافت‌نشدهٔ درآمد ۱٬۰۰۰٬۰۰۰ (مثل قبل)');
  const Pm = await ask(['چقدر پرداختم؟', 'هزینه‌هایی که پرداخت کردم این ماه']);
  ok(Pm.every(r => A(r).status !== 'unpaid'), '«پرداختم» مثبت، unpaid نیست');
  // ۳) تطبیق واژهٔ کامل
  const W = await ask(['فقط ردیف‌های نان این ماه', 'دانانو این ماه چقدر شد؟', 'خرج بدون نان این ماه', 'نان و دانانو این ماه', 'فقط ردیف‌های نان ماه قبل']);
  ok(A(W[0]).text === 'نان' && W[0].text.indexOf(fmt(40000)) >= 0 && W[0].text.indexOf(fmt(75000)) < 0, '«نان» فقط ردیف نان (۴۰٬۰۰۰)، دانانو شمرده نشد');
  ok(W[1].text.indexOf(fmt(35000)) >= 0, '«دانانو» فقط خودش (۳۵٬۰۰۰)');
  ok((A(W[2]).excludeText || [])[0] === 'نان' && A(W[2]).tab === 'expense', '«بدون نان»: excludeText=[نان]');
  const noBread = 100000 + 35000 + 85000 + 300000 + 90000 + 500000 + 45000 + 250000;
  ok(W[2].text.indexOf(fmt(noBread)) >= 0, '«بدون نان»: دانانو در جمع می‌ماند (' + noBread + ')');
  ok(W[3].text.indexOf(fmt(75000)) >= 0, '«نان و دانانو» = ۷۵٬۰۰۰');
  ok(W[4].text.indexOf(fmt(30000)) >= 0, 'نان ماه قبل ۳۰٬۰۰۰');
  // عبارت چندواژه‌ای و شرح ردیف خراب نشده باشد
  const M = await ask(['قبض برق چقدر شد', 'بدون قبض آب چقدر خرج کردم', 'بیمه چقدر شد', 'بیمه ماشین چقدر شد', 'فقط ردیف‌های نانا', 'قبض‌ها چقدر شد']);
  ok(A(M[0]).text === 'قبض برق' && M[0].text.indexOf(fmt(300000)) >= 0, '«قبض برق» عبارت چندواژه‌ای هنوز کار می‌کند');
  ok((A(M[1]).excludeText || [])[0] === 'قبض آب' && !(A(M[1]).cats || []).length, '«بدون قبض آب»: عبارت دوکلمه‌ای یک حذف است و دستهٔ مثبتی نمی‌ماند');
  const exQ = 100000 + 40000 + 35000 + 85000 + 300000 + 500000 + 45000 + 250000 + 400000 + 30000;
  ok(M[1].text.indexOf(fmt(exQ)) >= 0, '«بدون قبض آب»: فقط قبض آب کنار رفت (' + exQ + ')');
  ok(M[2].text.indexOf(fmt(500000)) >= 0 && M[3].text.indexOf(fmt(500000)) >= 0, '«بیمه» و «بیمه ماشین» ردیف «بیمه‌ی ماشین» (با نیم‌فاصله) را می‌گیرند');
  ok(A(M[4]).text === 'نان' && M[4].text.indexOf(fmt(70000)) >= 0, 'عامیانهٔ «نانا» با ریشه «نان» تطبیق می‌خورد (همهٔ ماه‌ها: ۴۰٬۰۰۰ + ۳۰٬۰۰۰)');
  ok((A(M[5]).cats || [])[0] === 'bills' && M[5].text.indexOf(fmt(300000 + 90000 + 120000)) >= 0, '«قبض‌ها» همچنان دسته (۵۱۰٬۰۰۰)');
  const after = await page.evaluate(() => JSON.stringify(archive));
  ok(before === after, 'هیچ داده‌ای تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1441: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
