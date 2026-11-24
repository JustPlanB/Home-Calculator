// ۱.۴.۴۴ — تفاوت «دسته» و «ردیف» در جست‌وجوی محاوره‌ای: واژهٔ هم‌نام ردیف و نمایندهٔ دسته («بنزین»، «نان»): عدد پیش‌فرض همان دسته می‌ماند، پاسخ می‌گوید کل دسته است و خوانش «فقط ردیف‌ها» را هم از داده می‌دهد؛ «ردیف/تراکنش …» خوانش ردیف می‌شود.
// فقط دادهٔ ساختگی؛ عددها مستقل از دستیار از خودِ ردیف‌ها حساب می‌شوند و ابزار/آرگومان/متن هر دو بررسی می‌شود.
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
  // جمع مستقل از ردیف‌های ساختگی (بدون دستیار): بنزین همهٔ ماه‌ها، دستهٔ حمل‌ونقل، نان
  const ind = await page.evaluate(() => { const o = { bz: 0, tr: 0, nan: 0, bzCur: 0 }; const cy = currentYear, cm = currentMonth;
    Object.keys(archive).forEach(k => { const pd = archive[k]; pd.expense.sections.forEach(sc => sc.rows.forEach(r => { const a = Number(r.amount) || 0; if (/بنزین/.test(r.desc)) { o.bz += a; if (k === periodKey(cy, cm)) o.bzCur += a; } if (/بنزین|اسنپ|تپسی/.test(r.desc)) o.tr += a; if (/^نان$/.test(r.desc)) o.nan += a; })); }); return o; });
  const before = await page.evaluate(() => JSON.stringify(archive));
  // ۱) واژهٔ مبهم: پیش‌فرض دسته + افشا + خوانش ردیف
  const M = await ask(['بنزین چقدر شد', 'هزینهٔ بنزین چقدر شد', 'بنزینا چقدر شد', 'نان چقدر شد', 'بنزین چند تا شد', 'بنزینم این ماه چقد شد']);
  ok(M.every(r => !isAsk(r) && (A(r).cats || []).length === 1 && !A(r).text), 'پیش‌فرض همان دسته می‌ماند (cats، بی text)');
  ok(M[0].text.indexOf(fmt(ind.tr)) >= 0 && M[0].text.indexOf(fmt(ind.bz)) >= 0 && /نه فقط ردیف‌های «بنزین»/.test(M[0].text), 'عدد دسته و عدد ردیف‌های بنزین هر دو با جمع مستقل می‌خوانند و تفاوت گفته شده');
  ok(M[3].text.indexOf(fmt(ind.nan)) >= 0 && /دستهٔ «خوراکی»/.test(M[3].text), '«نان»: دستهٔ خوراکی + عدد فقط نان');
  ok(/نه فقط/.test(M[4].text) && M[4].text.indexOf('۵ تراکنش') >= 0, 'پرسش «چند تا» هم افشا دارد');
  ok(/نه فقط/.test(M[5].text), 'پسوند ملکی («بنزینم») هم همان افشا را دارد');
  // ۲) «کل/دسته» یا نام خودِ دسته یا برابری: بی افشای اضافه
  const C = await ask(['کل حمل‌ونقل چقدر شد', 'کل بنزین چقدر شد', 'خوراکی چقدر شد', 'قبض برق چقدر شد', 'فقط قبض برق رو بگو']);
  ok(C.every(r => !/نه فقط/.test(r.text)), 'کل/نام دسته/مجموع برابر: بی افشای اضافه');
  ok(C[0].text.indexOf(fmt(ind.tr)) >= 0 && ((A(C[3]).cats || [])[0] === 'bills' || A(C[3]).text === 'قبض برق') && C[3].text.indexOf(fmt(300000)) >= 0, 'اعداد دسته درست (۱.۴.۴۶: «قبض برق» عبارتِ نامِ ردیف است و ردیف خوانده می‌شود؛ عدد ۳۰۰٬۰۰۰ همان است)');
  // ۳) خوانش صریح ردیف
  const W = await ask(['فقط ردیف‌های بنزین رو حساب کن', 'تراکنش‌های بنزین چقدر شد', 'ردیف‌های نان چقدر شد', 'فقط ردیف‌های بنزین بدون اسنپ']);
  ok(W.every(r => A(r).text && !A(r).cats), 'خوانش ردیف: text هست، cats نیست');
  ok(W[0].text.indexOf(fmt(ind.bz)) >= 0 && W[2].text.indexOf(fmt(ind.nan)) >= 0 && W[3].text.indexOf(fmt(ind.bz)) >= 0 && (A(W[3]).excludeText || [])[0] === 'اسنپ', 'عدد ردیف‌ها با جمع مستقل می‌خواند و «بدون اسنپ» حفظ شد');
  // ۴) «بدون اسنپ» روی خوانش دسته: هر دو عدد
  const X = await ask(['بنزینا رو بدون اسنپ حساب کن']);
  ok((A(X[0]).cats || [])[0] === 'transport' && (A(X[0]).excludeText || [])[0] === 'اسنپ' && /نه فقط/.test(X[0].text) && X[0].text.indexOf(fmt(ind.bz)) >= 0, 'دسته + بدون اسنپ + خوانش ردیف');
  // ۵) ادامهٔ مکالمه
  const Q = await seq([['بنزین چقدر شد', 'ماه قبل'], ['بنزین چقدر شد', 'بدون اسنپ'], ['فقط ردیف‌های بنزین', 'ماه قبل'], ['خرجای کوچیک بدون بنزین', 'زیر ۵۰ هزار']]);
  const qa = (x) => x[1].args || {};
  ok((qa(Q[0]).cats || [])[0] === 'transport' && qa(Q[0]).month && /نه فقط/.test(Q[0][1].text), 'ماه قبل: دسته و افشا حفظ');
  ok((qa(Q[1]).excludeText || [])[0] === 'اسنپ' && /نه فقط/.test(Q[1][1].text), 'بدون اسنپ: شرط افزوده و افشا حفظ');
  ok(qa(Q[2]).text === 'بنزین' && !qa(Q[2]).cats && qa(Q[2]).month && Q[2][1].text.indexOf(fmt(400000)) >= 0, 'خوانش ردیف + ماه قبل: ۴۰۰٬۰۰۰');
  ok(qa(Q[3]).amountMax === 50000 && (qa(Q[3]).excludeText || [])[0] === 'بنزین' && qa(Q[3]).tab === 'expense', 'پاسخ «زیر ۵۰ هزار» همهٔ شرط‌ها را نگه داشت');
  // ۶) صفت اندازه بی مرز: سؤال روشن + چیپ مرز؛ چیپ اجرا می‌شود
  const D = await ask(['خرجای کوچیک چقدر شد', 'خرجای کوچیک بدون بنزین', 'خرج سنگین این ماه']);
  ok(D.every(isAsk) && D.every(r => !NUM.test(r.text) && /یعنی چه مبلغی/.test(r.text)), 'سؤال کوتاه «یعنی چه مبلغی؟» و بی عدد');
  ok(D[1].sug.some(s => /زیر ۵۰ هزار.*بدون بنزین/.test(s)) && D[2].sug.some(s => /بالای/.test(s)), 'چیپ‌های مرز، بقیهٔ جمله را حفظ می‌کنند');
  const chipRun = await ask([D[1].sug.filter(s => /زیر ۵۰ هزار/.test(s))[0]]);
  ok(A(chipRun[0]).amountMax === 50000 && (A(chipRun[0]).excludeText || [])[0] === 'بنزین', 'اجرای چیپ: مرز و «بدون بنزین» با هم اعمال می‌شود');
  // ۷) ایمنی: ناشناخته همچنان پرسیده می‌شود و خوانش جدید داده نمی‌نویسد
  const U = await ask(['خرج بدون زرتی', 'فقط گلابتون', 'بنزینِ گلابتون', 'ردیف‌های گلابتون']);
  ok(U.every(isAsk) && U.every(r => !NUM.test(r.text)), 'شرط ناشناخته: فقط پرسش، بی عدد');
  const after = await page.evaluate(() => JSON.stringify(archive));
  ok(before === after, 'هیچ داده‌ای تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1438: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
