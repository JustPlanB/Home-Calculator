// ۱.۴.۴۳ — کاهش پرسش‌های بی‌جا بدون تضعیف ایمنی: صفت اندازه با مرز مبلغ و جمع محاوره‌ای شرط ناشناخته نیست؛ شرط واقعی و واژهٔ ناشناخته همچنان نگه داشته/پرسیده می‌شود.
// فقط دادهٔ ساختگی؛ ابزار، آرگومان و فیلترهای واقعاً اعمال‌شده بررسی می‌شوند، نه فقط متن.
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
    const row = (o) => Object.assign({ id: '', day: '2', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    selectedBankAccounts = [{ id: 'a1', label: 'ملی', bank: 'ملی' }, { id: 'a2', label: 'ملت', bank: 'ملت' }];
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e }]; pd.income.sections = [{ id: 'I', title: t, rows: i }]; return pd; };
    const cur = mk([row({ id: 'e1', desc: 'بنزین', amount: 100000, account: 'ملی' }), row({ id: 'e2', desc: 'نان', amount: 40000, account: 'ملت' }), row({ id: 'e3', desc: 'اسنپ', amount: 85000, account: 'ملی' }),
      row({ id: 'e4', desc: 'قبض برق', amount: 300000, account: 'ملی' }), row({ id: 'e5', desc: 'برنج', amount: 60000, account: 'ملت' }), row({ id: 'e6', desc: 'تپسی', amount: 45000, status: 'unpaid', account: 'ملی' })],
      [row({ id: 'i1', desc: 'حقوق', amount: 9000000, account: 'ملی' }), row({ id: 'i2', desc: 'فروش', amount: 500000, account: 'ملت' })]);
    const prev = mk([row({ id: 'p1', desc: 'بنزین', amount: 400000 }), row({ id: 'p2', desc: 'اسنپ', amount: 60000 })], [row({ id: 'pi', desc: 'حقوق', amount: 8000000 })]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const r = hkAsstAsk(q); return { q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }; }), qs);
  const seq = (pairs) => page.evaluate((pairs) => pairs.map(p => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const out = []; p.forEach(q => { const r = hkAsstAsk(q); out.push({ q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }); }); return out; }), pairs);
  const isAsk = (r) => r.decision === 'ask' && !r.tool;
  const A = (r) => r.args || {};
  // ۱) صفت اندازه + مرز مبلغ: بی پرسش، مرز اعمال می‌شود
  const G = await ask(['خرجای کوچیک زیر ۲۰ هزار', 'هزینه‌های ریز زیر ۱۰ هزار تومن', 'خرج‌های درشت بالای ۲۰۰ هزار', 'خرجای ریز زیر ۵۰ هزار بدون اسنپ', 'هزینه‌های کوچیک زیر ۱۰۰ هزار بدون برنج']);
  ok(G.every(r => !isAsk(r)), 'صفت اندازه همراه مبلغ مرزی پرسش بی‌جا نمی‌سازد');
  ok(A(G[0]).amountMax === 20000 && A(G[1]).amountMax === 10000 && A(G[2]).amountMin === 200000, 'مرز مبلغ واقعاً اعمال شده');
  ok(A(G[3]).amountMax === 50000 && (A(G[3]).excludeText || []).indexOf('اسنپ') >= 0, 'صفت اندازه + شرط «بدون» هر دو حفظ شده (مرز و بدون اسنپ)');
  ok(A(G[4]).amountMax === 100000 && (A(G[4]).excludeText || []).indexOf('برنج') >= 0, 'مرز و «بدون برنج» هر دو حفظ');
  // ۲) صفت اندازه بی مرز: هنوز پرسیده می‌شود، عددی نمی‌آید
  const V = await ask(['خرجای کوچیک این ماه', 'خرج سنگین', 'خرجای کوچیک بدون بنزین']);
  ok(V.every(isAsk) && V.every(r => !NUM.test(r.text)), 'صفت اندازه بدون مرز: فقط پرسش، بی عدد');
  // ۳) جمع محاوره‌ای به دستهٔ مربوط وصل می‌شود
  const P = await ask(['قبضا چقدر شد', 'قبضای این ماه چقدره', 'خرجا این ماه چقدره', 'اسنپای ماه پیش چقدر بود']);
  ok(P.every(r => !isAsk(r)), 'قبضا/قبضای/خرجا/اسنپای بی پرسش');
  ok((A(P[0]).cats || []).indexOf('bills') >= 0 && (A(P[1]).cats || []).indexOf('bills') >= 0, '«قبضا/قبضای» = دستهٔ قبوض');
  ok(A(P[2]).tab === 'expense' && A(P[3]).text === 'اسنپ', '«خرجا» = هزینه؛ «اسنپای» = متن اسنپ');
  ok(P[1].text.indexOf(fmt(300000)) >= 0, 'عدد قبض‌های این ماه درست (۳۰۰٬۰۰۰)');
  // ۴) شرط واقعی نگه داشته می‌شود و ناشناخته پرسیده می‌شود
  const R = await ask(['خرج بدون بنزین', 'فقط قبض‌ها', 'هزینه‌های زیر ۵۰ هزار بدون قبض']);
  ok((A(R[0]).excludeText || []).indexOf('بنزین') >= 0 && (A(R[1]).cats || []).indexOf('bills') >= 0, 'بدون بنزین و فقط قبض‌ها اعمال شد');
  ok(A(R[2]).amountMax === 50000 && (A(R[2]).excludeCats || []).indexOf('bills') >= 0, 'مرز مبلغ و حذف دستهٔ قبوض هر دو');
  const U = await ask(['خرج بدون زرتی', 'فقط گلابتون', 'خرجای کوچیک گلابتون زیر ۲۰ هزار', 'قبضای زرتی چقدر شد', 'فقط پاپیونا', 'بدون گلابتونا چقد خرج کردم']);
  ok(U.every(isAsk) && U.every(r => !NUM.test(r.text)), 'واژهٔ ناشناخته (حتی با صفت اندازه/جمع محاوره‌ای) پرسیده می‌شود و عددی نمی‌آید');
  // ۵) ادامه: پاسخ مبلغ به پرسش صفت اندازه، و پاسخ واژه
  const C = await seq([['خرجای کوچیک بدون بنزین', 'زیر ۵۰ هزار'], ['خرج بدون زرتی', 'قبض'], ['فقط گلابتون', 'منظورم اسنپ بود']]);
  const ca = (x) => x[1].args || {};
  ok(ca(C[0]).amountMax === 50000 && (ca(C[0]).excludeText || []).indexOf('بنزین') >= 0 && ca(C[0]).tab === 'expense', 'پاسخ «زیر ۵۰ هزار» به صفت اندازه: مرز + بدون بنزین + هزینه حفظ شد');
  ok((ca(C[1]).excludeCats || []).indexOf('bills') >= 0, 'پاسخ «قبض» به «بدون زرتی»: حذف دستهٔ قبوض');
  ok(ca(C[2]).text === 'اسنپ', 'پاسخ «منظورم اسنپ بود» اجرا شد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1437: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
