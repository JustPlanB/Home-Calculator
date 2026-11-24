// ۱.۴.۴۵ — ترکیب «و/یا» (اجتماع، نه اشتراک)، «دستهٔ X» = جمع همان دسته (نه گروه‌بندی)، «بزرگ» = صفت اندازه (نه بیشترین)، و حفظ بازه در پالایش ادامهٔ مکالمه.
// فقط دادهٔ ساختگی؛ عددها مستقل از دستیار از خودِ ردیف‌ها (با یک ردیف مشترک «نان برنج ارگانیک» برای دوبارشماری) حساب می‌شوند؛ ابزار/آرگومان/عدد/متن بررسی می‌شود.
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
  // ردیف مشترک برای دوبارشماری
  await page.evaluate(() => { const k = periodKey(currentYear, currentMonth); const r = { id: 'e7', day: '2', desc: 'نان برنج ارگانیک', amount: 20000, status: 'paid', account: 'ملت', deletedAt: null, createdAt: 1, updatedAt: 1 }; try { hkCatStampRow(r, true); } catch (e) {} periodData.expense.sections[0].rows.push(r); archive[k] = JSON.parse(JSON.stringify(periodData)); });
  const isAsk = (r) => r.decision === 'ask' && !r.tool;
  const A = (r) => r.args || {};
  const ind = await page.evaluate(() => { const o = { rice: 0, nan: 0, either: 0, bz: 0, snap: 0, bzSnap: 0, food: 0 }; Object.keys(archive).forEach(k => archive[k].expense.sections.forEach(sc => sc.rows.forEach(r => { const a = Number(r.amount) || 0, d = r.desc; const R = /برنج/.test(d), N = /نان/.test(d); if (R) o.rice += a; if (N) o.nan += a; if (R || N) o.either += a; if (/بنزین/.test(d)) o.bz += a; if (/اسنپ/.test(d)) o.snap += a; if (/بنزین|اسنپ/.test(d)) o.bzSnap += a; if (/^(نان|برنج|نان برنج ارگانیک)$/.test(d)) o.food += a; }))); return o; });
  const before = await page.evaluate(() => JSON.stringify(archive));
  // ۱) و / یا = اجتماع؛ ردیف مشترک یک بار
  const O = await ask(['برنج و نان چقدر شد', 'برنج یا نان چقدر شد', 'بنزین و اسنپ چقدر شد', 'فقط برنج و نان', 'بنزین و اسنپ و برنج ماه پیش']);
  ok(O.slice(0, 2).every(r => (A(r).textAny || []).join() === 'برنج,نان' && !A(r).text && !A(r).cats), '«برنج و نان / یا نان»: textAny (اجتماع)، نه text+cats');
  ok(O[0].text.indexOf(fmt(ind.either)) >= 0 && ind.either < ind.rice + ind.nan, 'عدد اجتماع از ردیف‌ها (' + ind.either + ') و ردیف مشترک دوبار شمرده نشده');
  ok(/«برنج» یا «نان»/.test(O[0].text) && /تفکیک/.test(O[0].text), 'متن همهٔ موارد جمع‌شده و تفکیک را نشان می‌دهد');
  ok((A(O[2]).textAny || []).join() === 'بنزین,اسنپ' && !A(O[2]).cats && O[2].text.indexOf(fmt(ind.bzSnap)) >= 0, '«بنزین و اسنپ»: هر دو ردیف (نه کل دستهٔ حمل‌ونقل)');
  ok(A(O[4]).month && (A(O[4]).textAny || []).length === 3, 'سه‌تایی + ماه');
  // ۲) دسته‌ها و ترکیب با شرط‌ها
  const M = await ask(['خوراکی و حمل‌ونقل چقدر شد', 'خوراکی و اسنپ چقدر شد', 'برنج و نان بدون ارگانیک', 'برنج و نان زیر ۵۰ هزار', 'بدون برنج و نان چقدر خرج کردم']);
  ok((A(M[0]).cats || []).length === 2 && !A(M[0]).textAny, 'دو دستهٔ مختلف: هر دو (cats)');
  ok((A(M[1]).textAny || [])[0] === 'اسنپ' && A(M[1]).unionCats === true && (A(M[1]).cats || [])[0] === 'food' && M[1].text.indexOf(fmt(ind.food + ind.snap)) >= 0, 'دستهٔ خوراکی ∪ ردیف‌های اسنپ، عدد مستقل');
  ok((A(M[2]).excludeText || []).join() === 'ارگانیک' && (A(M[2]).textAny || []).length === 2, 'اجتماع + «بدون»');
  ok(A(M[3]).amountMax === 50000 && (A(M[3]).textAny || []).length === 2, 'اجتماع + مرز مبلغ');
  ok((A(M[4]).excludeText || []).join() === 'برنج,نان' && !A(M[4]).textAny, '«بدون برنج و نان» همچنان دو حذف است');
  // ۳) ناشناخته و ابهام: سؤال، بی عدد
  const U = await ask(['برنج و گلابتون چقدر شد', 'خرج برنج و پاپیون', 'بنزین و اسنپ و زرتی چقدر شد']);
  ok(U.every(isAsk) && U.every(r => !NUM.test(r.text)), 'واژهٔ ناشناخته در فهرست «و/یا»: فقط پرسش، بی عدد');
  // ۴) «دستهٔ X» ≠ تفکیک
  const C = await ask(['دستهٔ خوراکی چقدر شد', 'مجموع دستهٔ حمل‌ونقل چقدر بوده', 'کل دستهٔ قبوض رو بگو', 'هزینه‌ها رو به تفکیک دسته نشون بده', 'هر دسته چقدر خرج داشته', 'خرج دسته‌ها چقدر شد']);
  ok(C.slice(0, 3).every(r => r.tool === 'transactions.aggregate' && (A(r).cats || []).length === 1), '«دستهٔ X»: جمع همان دسته');
  ok(C[0].text.indexOf(fmt(ind.food)) >= 0 && C[2].text.indexOf(fmt(300000)) >= 0, 'اعداد دسته با جمع مستقل');
  ok(C.slice(3).every(r => r.tool === 'transactions.group'), 'تفکیک/هر دسته/دسته‌ها: همچنان گروه‌بندی');
  // ۵) بزرگ
  const B = await ask(['هزینه‌های بزرگ چقدر شد', 'خرجای بزرگ این ماه', 'هزینه‌های بزرگ بالای ۵۰ هزار', 'بزرگ‌ترین هزینه چیه', 'بیشترین خرج این ماه']);
  ok(B.slice(0, 2).every(r => isAsk(r) && /یعنی چه مبلغی/.test(r.text) && !NUM.test(r.text)) && B[0].sug.some(s => /بالای/.test(s)), '«بزرگ» بی مرز: پرسش مرز با چیپ، نه «بیشترین»');
  ok(A(B[2]).amountMin === 50000 && A(B[2]).tab === 'expense' && !A(B[2]).limit, '«بزرگ» + مرز: فقط مرز اعمال می‌شود');
  ok(B[3].tool === 'transactions.search' && A(B[3]).sort === 'amountDesc' && B[4].tool === 'transactions.search' && A(B[4]).sort === 'amountDesc', '«بزرگ‌ترین/بیشترین» همچنان MAX');
  // ۶) ادامهٔ مکالمه: بازه حفظ می‌شود، فقط بُعد تغییرکرده عوض می‌شود
  const Q = await seq([['بنزین این ماه چقدر شد', 'فقط ردیف‌های بنزین رو حساب کن'], ['برنج این ماه چقدر شد', 'فقط ردیف‌های نان رو بگو'], ['خرج این ماه چقدر شد', 'فقط قبض‌ها'], ['اسنپ ماه پیش چقدر شد', 'فقط ردیف‌های بنزین'], ['بنزین این ماه چقدر شد', 'برنج چقدر شد'], ['بنزین این ماه چقدر شد', 'فقط ردیف‌های بنزین', 'بدون بنزین']]);
  const qa = (x) => x[x.length - 1].args || {}, qt = (x) => x[x.length - 1].text;
  ok(qa(Q[0]).text === 'بنزین' && qa(Q[0]).month && !qa(Q[0]).cats && qt(Q[0]).indexOf(fmt(100000)) >= 0, 'بنزین این ماه ⇒ فقط ردیف‌های بنزین: بازه حفظ، ۱۰۰٬۰۰۰');
  ok(qa(Q[1]).text === 'نان' && qa(Q[1]).month, 'تعویض ردیف: بازه حفظ');
  ok((qa(Q[2]).cats || [])[0] === 'bills' && qa(Q[2]).month && qa(Q[2]).tab === 'expense', 'تعویض دسته: بازه و نوع حفظ');
  ok(qa(Q[3]).text === 'بنزین' && qa(Q[3]).month && qt(Q[3]).indexOf(fmt(400000)) >= 0, 'ماه پیش حفظ: ۴۰۰٬۰۰۰');
  ok(qa(Q[4]).text === 'برنج' && !qa(Q[4]).month, 'پرسش مستقل (بی «فقط/ردیف») ادامه حساب نمی‌شود');
  ok(isAsk(Q[5][2]) && /بنزین/.test(qt(Q[5])), 'متناقض («فقط بنزین» سپس «بدون بنزین»): پرسش، نه نتیجهٔ صفر');
  ok(Q[5].length === 3, 'ساختار توالی');
  // ۷) شرط‌های قبلی حفظ و داده بدون تغییر
  const K = await ask(['فقط قبض‌ها', 'خرج بدون بنزین', 'فقط گلابتون', 'خرج بدون زرتی']);
  ok((A(K[0]).cats || [])[0] === 'bills' && (A(K[1]).excludeText || [])[0] === 'بنزین' && isAsk(K[2]) && isAsk(K[3]), 'فقط/بدون/ناشناخته مثل قبل');
  const after = await page.evaluate(() => JSON.stringify(archive));
  ok(before === after, 'هیچ داده‌ای تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1439: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
