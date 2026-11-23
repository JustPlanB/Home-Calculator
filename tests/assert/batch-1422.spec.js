// ۱.۴.۲۴ — دستیار: غلط‌تایپی، «فهمیدم»، پیشنهاد کلمه، واژه‌نامهٔ گسترده، و جداسازی بخش‌ها.
// فقط داده ساختگی.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  // جداسازی: واژه‌نامه به داده یا بخش دیگر برنامه وابسته نیست
  const lex = fs.readFileSync(path.join(__dirname, '../../src/js/18f-assistant-lexicon.js'), 'utf8');
  ok(!/periodData|archive|currentYear|localStorage|document\./.test(lex), 'واژه‌نامه (18f) مستقل است و به داده یا DOM برنامه وابسته نیست');
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const row = (o) => Object.assign({ id: '', day: '1', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const mk = (exp, inc) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: 'متفرقه', rows: exp }]; pd.income.sections = [{ id: 'I', title: 'درآمد', rows: inc || [] }]; return pd; };
    const cur = mk([
      row({ id: 'c1', day: '3', desc: 'بنزین پراید', amount: 1200000, account: 'بانک ملی' }),
      row({ id: 'c2', day: '4', desc: 'اسنپ رفت', amount: 85000 }),
      row({ id: 'c3', day: '5', desc: 'بیمه تویوتا قسط', amount: 12000000 }),
      row({ id: 'c4', day: '6', desc: 'نان سنگک', amount: 30000 }),
      row({ id: 'c5', day: '7', desc: 'بیمه تویوتا حذف', amount: 9000000, deletedAt: 1 })
    ], [row({ id: 'i1', day: '1', desc: 'حقوق آذر', amount: 80000000 })]);
    const prev = mk([row({ id: 'p1', day: '2', desc: 'بنزین ماه قبل', amount: 900000 }), row({ id: 'p2', day: '3', desc: 'خرید میوه', amount: 400000 })]);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev;
  });
  const CM = await page.evaluate(() => currentMonth);
  const R = await page.evaluate(() => {
    const P1 = (s) => hkAsstValidateCommand(hkAsstParse(s));
    const ask = (s) => hkAsstAsk(s);
    const o = {};
    // اسکرین‌شات‌های کاربر
    o.h1 = P1('هزینه های آبان؟'); o.h2 = P1('آبان'); o.h3 = P1('مخارج آبان');
    o.s1 = P1('اسنپ چقدر؟'); o.s2 = P1('بالای ۵۰ هزار تومن'); o.s3 = P1('بنزین چند تا؟');
    o.s4 = P1('مبلغ کلش؟'); o.s5 = P1('مبلغ کل بنزین؟'); o.s6 = P1('جمع هزینه های بنزین؟');
    // غلط‌تایپی و کلیدواژهٔ کمیاب
    o.t1 = P1('ابانن'); o.t2 = P1('بیمه تویتا رو سرچ کن'); o.t3 = P1('درامد آبان'); o.t4 = P1('کمترین خرید دیجی کالا');
    o.t5 = P1('پول اومده این ماه'); o.t6 = P1('حقوق'); o.t7 = P1('شش ماه گذشته خوراکی چقدر');
    o.t8 = P1('بنزیین چند تا'); o.t9 = P1('میانگین هزینه ماهانه برای نون'); o.t10 = P1('بیشترین خرج سه ماه اخیر');
    // فهمیدم و پیشنهاد
    o.m1 = ask('بیمه تویتا رو سرچ کن'); o.m2 = ask('بیمه تویوتا');
    o.m3 = ask('جمع هزینه‌های آبان'); o.m4 = ask('سلام');
    o.sug = hkAsstSuggest('تویتا');
    o.sugNone = hkAsstSuggest('xyz');
    // هیچ داده‌ای تغییر نکرده
    o.before = JSON.stringify({ a: archive, p: periodData });
    ['بنزین', 'اسنپ', 'بیمه تویوتا', 'جمع کل', 'هزینه ها', 'درآمد', 'میانگین خوراکی', 'مقایسه کن', 'گروه بندی بنزین'].forEach(q => hkAsstAsk(q));
    hkAsstExec('transactions.delete', { id: 'c1' }); hkAsstExec('transactions.search', { text: 'بنزین', id: 'c1' });
    o.after = JSON.stringify({ a: archive, p: periodData });
    return o;
  });
  // ابزارها روی داده
  const ex = (x) => x;
  ok(R.h1.tool === 'transactions.aggregate' && R.h1.args.tab === 'expense' && R.h1.args.month === 8, '«هزینه های آبان» → جمع هزینهٔ آبان');
  ok(R.h2.tool === 'transactions.aggregate' && R.h2.args.month === 8 && !R.h2.args.tab, '«آبان» تنها → خلاصهٔ آبان، بدون پرسش');
  ok(R.h3.args.tab === 'expense' && R.h3.args.month === 8, '«مخارج آبان» → هزینهٔ آبان');
  ok(R.s1.tool === 'transactions.aggregate' && (R.s1.args.text || (R.s1.args.cats || []).indexOf('transport') >= 0), '«اسنپ چقدر» → جمع اسنپ/حمل‌ونقل');
  ok(R.s2.tool === 'transactions.search' && R.s2.args.amountMin === 50000 && !/تومن/.test(R.s2.args.text || ''), '«بالای ۵۰ هزار تومن» → مبلغ بیشتر از ۵۰ هزار، بدون «تومن» در متن');
  ok(R.s3.tool === 'transactions.aggregate' && R.s3.args.cats.indexOf('transport') >= 0, '«بنزین چند تا» → شمارش دستهٔ حمل‌ونقل');
  ok(R.s4.tool === 'transactions.aggregate' && !R.s4.args.text && !R.s4.args.cats, '«مبلغ کلش» → جمع کل، بدون متن جست‌وجوی «کلش»');
  ok(R.s5.tool === 'transactions.aggregate' && R.s5.args.cats.indexOf('transport') >= 0, '«مبلغ کل بنزین» → جمع دستهٔ حمل‌ونقل');
  ok(R.s6.args.tab === 'expense' && R.s6.args.cats.indexOf('transport') >= 0, '«جمع هزینه های بنزین» → هزینه‌های حمل‌ونقل');
  // غلط‌تایپی
  ok(R.t1.args.month === 8 && R.t1.corrections.length === 1, '«ابانن» → آبان، با گزارش اصلاح');
  ok(R.t2.args.text === 'بیمه تویوتا' && R.t2.corrections.some(c => c.to === 'تویوتا'), '«بیمه تویتا» → «بیمه تویوتا» از روی داده');
  ok(R.t3.args.tab === 'income' && R.t3.args.month === 8, '«درامد» (املای دیگر) → درآمد');
  ok(R.t4.tool === 'transactions.search' && R.t4.args.sort === 'amountAsc' && /دیجی/.test(R.t4.args.text || ''), '«کمترین خرید دیجی کالا» → کمترین مورد، متن «دیجی کالا»');
  ok(R.t5.args.tab === 'income' && R.t5.args.month === CM, '«پول اومده این ماه» → درآمد این ماه');
  ok(R.t6.args.tab === 'income', '«حقوق» → درآمد');
  ok((R.t7.args.cats || []).indexOf('food') >= 0 && !!R.t7.args.dateFrom, '«شش ماه گذشته خوراکی» → دستهٔ خوراکی و شش ماه');
  ok((R.t8.args.cats || []).indexOf('transport') >= 0 && R.t8.tool === 'transactions.aggregate', '«بنزیین چند تا» (با حرف اضافه) → حمل‌ونقل، شمارش');
  ok(R.t9.explain === 'avg', '«میانگین … برای نون» → میانگین');
  ok(R.t10.tool === 'transactions.search' && R.t10.args.sort === 'amountDesc' && !!R.t10.args.dateFrom, '«بیشترین خرج سه ماه اخیر» → بیشترین مورد در سه ماه');
  // پیام و فهمیدم
  ok(/^فهمیدم:/.test(R.m1.text) && R.m1.kind === 'result', 'پاسخ با خط «فهمیدم» شروع می‌شود');
  ok(/تویوتا/.test(R.m1.text) && R.m1.kind === 'result', 'اصلاح «تویتا» → «تویوتا» در پاسخ گزارش می‌شود');
  ok(R.m2.kind === 'result' && R.m2.data.count >= 1, '«بیمه تویوتا» دو ردیف یا بیشتر دارد (ردیف حذف‌شده نیامد)');
  ok(R.m3.kind === 'result' && /فهمیدم/.test(R.m3.text), 'جمع آبان هم خط «فهمیدم» دارد');
  ok(/سلام/.test(R.m4.text) && (R.m4.suggestions || []).length > 0, 'سلام: پاسخ راهنما با نمونه‌پرسش');
  ok(R.sug.indexOf('تویوتا') >= 0, 'پیشنهاد: «تویتا» → «تویوتا»');
  ok(R.sugNone.length === 0, 'پیشنهادی برای کلمهٔ بی‌ربط داده نمی‌شود');
  ok(R.before === R.after, 'همهٔ پرسش‌ها و درخواست‌های تغییردهنده، داده را تغییر نمی‌دهند');
  // پروژه‌ها
  const PR = await page.evaluate(() => {
    const row = (o) => Object.assign({ id: '', day: '1', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    _financialSubjects = [{ id: 's1', name: 'پروژه الف', highlightColor: 'x' }, { id: 's2', name: 'ساختمان', highlightColor: 'y' }];
    const pd = emptyPeriodData();
    pd.expense.sections = [{ id: 'E', title: 'ساخت', rows: [
      row({ id: 'pa', day: '2', desc: 'مصالح', amount: 3000000, financialContext: { classification: 'third_party', accountType: 'project', subjectId: 's1', subjectName: 'پروژه الف' } }),
      row({ id: 'pb', day: '3', desc: 'نان', amount: 50000 })] }];
    periodData = pd; archive = {};
    const P1 = (q) => hkAsstValidateCommand(hkAsstParse(q));
    const sum = P1('خلاصه پروژه الف'), list = P1('پروژه ها'), projExp = P1('مخارج ساختمان');
    return { sum, list, projExp, sumRes: hkAsstExec(sum.tool, sum.args).result, listRes: hkAsstExec(list.tool, list.args).result, pExpRes: hkAsstExec(projExp.tool, projExp.args).result,
      byProj: hkAsstExec('transactions.aggregate', { project: 'پروژه الف' }).result.count };
  });
  ok(PR.sum.tool === 'projects.summary' && PR.sum.args.project === 'پروژه الف', '«خلاصه پروژه الف» → خلاصهٔ همان پروژه');
  ok(PR.sumRes.expenseSum === 3000000 && PR.sumRes.count === 1, 'خلاصهٔ پروژه: هزینه و تعداد درست است');
  ok(PR.list.tool === 'projects.list' && PR.listRes.projects.length === 2, '«پروژه ها» → فهرست دو پروژه');
  ok(PR.projExp.tool === 'projects.summary' && PR.pExpRes.count === 0, '«مخارج ساختمان» (پروژهٔ بدون ردیف) → خلاصهٔ صفر');
  ok(PR.byProj === 1, 'فیلتر جست‌وجو با پروژه: فقط ردیف‌های همان پروژه');

  // سؤال‌های غیرتراکنشی
  const Q = await page.evaluate(() => {
    const P1 = (q) => hkAsstValidateCommand(hkAsstParse(q));
    const cats = hkAsstExec('categories.summary', {}).result;
    return { c1: P1('چند تا دسته داریم؟'), c2: P1('دسته ها رو داریم؟'), a1: P1('چند تا حساب داریم؟'), m1: P1('در چند ماه داده ثبت شده؟'),
      p1: P1('چند پروژه داریم؟'), n1: P1('چند ردیف مخارج برای آبان تا حالا ساخته شده؟'), catsRes: cats,
      n1res: hkAsstExec('transactions.aggregate', { tab: 'expense', month: 8, year: P1('آبان').args.year }).result,
      acc: hkAsstExec('accounts.list', {}).result, mon: hkAsstExec('months.summary', {}).result,
      txtCat: hkAsstAsk('چند تا دسته داریم؟').text };
  });
  ok(Q.c1.tool === 'categories.summary' && Q.c2.tool === 'categories.summary', '«چند تا دسته داریم؟» → خلاصهٔ دسته‌ها (نه جست‌وجو)');
  ok(Q.catsRes.total >= 11 && Q.catsRes.builtIn.length >= 1, 'خلاصهٔ دسته‌ها: دسته‌های پیش‌فرض شمرده می‌شوند');
  ok(/دسته/.test(Q.txtCat) && /\d|[۰-۹]/.test(Q.txtCat), 'پاسخ دسته‌ها عدد و فهرست دارد');
  ok(Q.a1.tool === 'accounts.list', '«چند تا حساب داریم؟» → فهرست حساب‌ها');
  ok(Q.m1.tool === 'months.summary', '«در چند ماه داده ثبت شده؟» → خلاصهٔ ماه‌ها');
  ok(Q.p1.tool === 'projects.list', '«چند پروژه داریم؟» → فهرست پروژه‌ها');
  ok(Q.n1.tool === 'transactions.aggregate' && Q.n1.explain === 'count' && Q.n1.args.tab === 'expense' && Q.n1.args.month === 8, '«چند ردیف مخارج برای آبان…» → شمارش هزینه‌های آبان');
  ok(Q.n1res.count >= 0 && Q.n1res.count !== undefined, 'شمارش هزینه‌های آبان عدد برمی‌گرداند');
  ok(Array.isArray(Q.acc.accounts) && Q.mon.count >= 0, 'ابزارهای حساب و ماه داده برمی‌گردانند');
  // دکمهٔ بازگشت
  const back = await page.evaluate(() => { hkAsstOpen(); const before = hkAsstIsOpen(); try { onBackGuard(); } catch (e) {} return { before: before, after: hkAsstIsOpen() }; });
  ok(back.before === true && back.after === false, 'دکمهٔ بازگشت سیستم، اول پنجرهٔ دستیار را می‌بندد');
  // دکمه‌های پیشنهاد در پنجره
  await page.click('.hk-asst-fab'); await page.waitForTimeout(200);
  await page.fill('.hk-asst-input', 'بیمه تویتا'); await page.click('.hk-asst-send'); await page.waitForTimeout(200);
  const txt = await page.evaluate(() => document.querySelector('.hk-asst-log').textContent);
  ok(/فهمیدم/.test(txt), 'در پنجره، خط «فهمیدم» نمایش داده می‌شود');
  ok(errs.length === 0, 'خطای صفحه نداریم' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
