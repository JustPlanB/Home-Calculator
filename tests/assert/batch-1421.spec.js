// ۱.۴.۲۴ — دستیار هوشمند (نسخهٔ ۱): تفسیر فارسی، ابزارهای خواندنی، عدم تغییر داده، دکمه و پنجرهٔ گفتگو.
// فقط داده ساختگی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);

  // داده‌های ساختگی: این ماه و ماه قبل + یک ردیف حذف‌شده + یک انتقال خود کاربر
  await page.evaluate(() => {
    const cy = currentYear, cm = currentMonth;
    let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const row = (o) => Object.assign({ id: '', day: '1', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const mk = (secs) => { const pd = emptyPeriodData(); pd.expense.sections = []; pd.income.sections = []; secs.forEach(s => { pd[s.tab].sections.push({ id: s.id, title: s.title, rows: s.rows }); }); return pd; };
    const cur = mk([
      { tab: 'expense', id: 'E1', title: 'ماشین', rows: [row({ id: 'r_t1', day: '5', desc: 'بیمه تویوتا قسط', amount: 12000000, account: 'بانک ملی' }), row({ id: 'r_t3', day: '9', desc: 'بیمه تویوتا حذف', amount: 9000000, deletedAt: 1 })] },
      { tab: 'expense', id: 'E2', title: 'خوراکی', rows: [row({ id: 'r_f1', day: '7', desc: 'خرید نان', amount: 50000, account: 'کیف پول' })] },
      { tab: 'expense', id: 'E3', title: 'پروژه ساخت', rows: [row({ id: 'r_p1', day: '8', desc: 'مصالح', amount: 3000000, financialContext: { classification: 'third_party', accountType: 'project', subjectId: 's1', subjectName: 'پروژه الف' } })] },
      { tab: 'expense', id: 'E4', title: 'انتقال', rows: [row({ id: 'r_x1', day: '10', desc: 'انتقال به کارت', amount: 5000000, p2p: true })] },
      { tab: 'income', id: 'I1', title: 'حقوق', rows: [row({ id: 'r_i1', day: '1', desc: 'حقوق آبان', amount: 80000000, account: 'بانک ملی' })] }
    ]);
    const prev = mk([
      { tab: 'expense', id: 'E1', title: 'ماشین', rows: [row({ id: 'r_t2', day: '5', desc: 'بیمه تویوتا سال قبل', amount: 11000000 })] },
      { tab: 'expense', id: 'E2', title: 'خوراکی', rows: [row({ id: 'r_f2', day: '3', desc: 'خرید میوه', amount: 400000 })] }
    ]);
    periodData = cur;
    archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev;
  });

  const CM = await page.evaluate(() => currentMonth);
  const R = await page.evaluate(() => {
    const o = {};
    const cy = currentYear, cm = currentMonth;
    let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const ex = (t, a) => hkAsstExec(t, a);
    const P1 = (s) => hkAsstValidateCommand(hkAsstParse(s));
    // ابزارها
    o.searchTaw = ex('transactions.search', { text: 'بیمه تویوتا' }).result;
    o.searchBig = ex('transactions.search', { amountMin: 1e7 }).result;
    o.aggCurExp = ex('transactions.aggregate', { tab: 'expense', year: cy, month: cm }).result;
    o.aggProj = ex('transactions.aggregate', { context: 'project' }).result;
    o.groupCtx = ex('transactions.group', { by: 'context', tab: 'expense' }).result;
    o.cmp = ex('reports.compare', { a: { year: cy, month: cm }, b: { year: py, month: pm }, tab: 'expense' }).result;
    o.getOk = ex('transactions.get', { id: 'r_t1' }).result;
    o.getDeleted = ex('transactions.get', { id: 'r_t3' }).result;
    o.getMissing = ex('transactions.get', { id: 'zz' }).result;
    o.transferCount = ex('transactions.aggregate', { text: 'انتقال', includeTransfers: true }).result.count;
    o.transferHidden = ex('transactions.aggregate', { text: 'انتقال' }).result.count;
    o.denied = ex('transactions.delete', { id: 'r_t1' });
    o.unknownArg = ex('transactions.search', { text: 'بیمه', evil: 'x' }).ok;
    // تفسیر
    o.p_search = P1('بیمه تویوتا رو سرچ کن');
    o.p_big = P1('تراکنش‌های بالای ده میلیون رو پیدا کن');
    o.p_sumThisMonth = P1('جمع هزینه‌های این ماه چقدر شده؟');
    o.p_prevMonth = P1('ماه قبل چقدر خرج کردم؟');
    o.p_span = P1('هزینه خوراکی توی شش ماه گذشته چقدر بوده؟');
    o.p_groupProj = P1('مخارج پروژه‌ها رو جداگانه نشون بده');
    o.p_maxSpan = P1('بیشترین هزینه من توی سه ماه گذشته چی بوده؟');
    o.p_compare = P1('درآمد و هزینه این ماه رو با ماه قبل مقایسه کن');
    o.p_avg = P1('میانگین هزینه ماهانه من برای خوراکی چقدره؟');
    o.p_persianDigits = P1('تراکنش‌های بالای ۱۰ میلیون');
    o.p_range = P1('بین ۱۰ و ۲۰ میلیون');
    o.p_empty = P1('');
    o.p_greet = P1('سلام');
    o.p_unknown = P1('آسمون آبیه');
    o.p_cmpDefault = P1('مقایسه کن');
    // گفتگو (تابع پاسخ)
    o.ask1 = hkAsstAsk('جمع هزینه‌های این ماه چقدر شده؟');
    o.ask2 = hkAsstAsk('بیمه تویوتا رو سرچ کن');
    o.askNone = hkAsstAsk('سلام');
    return o;
  });
  console.log(JSON.stringify({ aggCur: R.aggCurExp, cmp: R.cmp }));

  // ابزارها
  ok(R.searchTaw.count === 2, 'جست‌وجوی شرح: دو تراکنش فعال (این ماه و ماه قبل)، حذف‌شده نیامد');
  ok(R.searchTaw.total === 23000000, 'جمع مبلغ جست‌وجوی شرح ۲۳ میلیون است (۱۲ + ۱۱)');
  ok(R.searchBig.count === 3, 'مبلغ بیشتر از ده میلیون: سه ردیف (۱۲، ۱۱ و حقوق ۸۰ میلیونی)');
  ok(R.aggCurExp.count === 3 && R.aggCurExp.sum === 15050000, 'هزینه این ماه: ۳ ردیف و جمع ۱۵٫۰۵ میلیون (انتقال خود کاربر کنار رفت)');
  ok(R.aggProj.sum === 3000000, 'مخارج پروژه: ۳ میلیون');
  ok(R.groupCtx.groups.length === 2, 'گروه‌بندی پروژه/شخصی دو گروه دارد');
  ok(R.cmp.a.expenseSum === 15050000 && R.cmp.b.expenseSum === 11400000, 'مقایسه: این ماه ۱۵٫۰۵ و ماه قبل ۱۱٫۴ میلیون');
  ok(R.getOk.found === true && R.getOk.item.desc === 'بیمه تویوتا قسط', 'دریافت با شناسه پایدار');
  ok(R.getDeleted.found === false, 'ردیف حذف‌شده با شناسه هم دیده نمی‌شود');
  ok(R.getMissing.found === false, 'شناسه ناموجود: پیدا نشد');
  ok(R.transferCount === 1 && R.transferHidden === 0, 'انتقال خود کاربر فقط با includeTransfers دیده می‌شود');
  ok(R.denied.ok === false && /مجاز/.test(R.denied.error), 'ابزار تغییردهنده/ناشناس اجرا نمی‌شود');
  ok(R.unknownArg === true, 'کلید ناشناس ورودی نادیده گرفته می‌شود');

  // تفسیر فارسی
  ok(R.p_search.tool === 'transactions.search' && R.p_search.args.text === 'بیمه تویوتا', 'تفسیر: «بیمه تویوتا رو سرچ کن» → جست‌وجوی شرح');
  ok(R.p_big.tool === 'transactions.search' && R.p_big.args.amountMin === 1e7, 'تفسیر: «بالای ده میلیون» → حداقل ۱۰ میلیون');
  ok(R.p_sumThisMonth.tool === 'transactions.aggregate' && R.p_sumThisMonth.args.tab === 'expense' && R.p_sumThisMonth.args.month === CM, 'تفسیر: جمع هزینهٔ این ماه');
  ok(R.p_prevMonth.tool === 'transactions.aggregate' && R.p_prevMonth.args.month === ((CM + 10) % 12) + 1, 'تفسیر: ماه قبل');
  ok(R.p_span.tool === 'transactions.aggregate' && (R.p_span.args.cats || []).indexOf('food') >= 0 && !!R.p_span.args.dateFrom, 'تفسیر: شش ماه گذشته + دستهٔ خوراکی');
  ok(R.p_groupProj.tool === 'transactions.group' && R.p_groupProj.args.by === 'context', 'تفسیر: مخارج پروژه‌ها جداگانه → گروه پروژه/شخصی');
  ok(R.p_maxSpan.tool === 'transactions.search' && R.p_maxSpan.args.sort === 'amountDesc' && R.p_maxSpan.args.limit === 1, 'تفسیر: بیشترین هزینه → مرتب نزولی، یک مورد');
  ok(R.p_compare.tool === 'reports.compare', 'تفسیر: مقایسه با ماه قبل');
  ok(R.p_avg.tool === 'transactions.aggregate' && R.p_avg.explain === 'avg' && (R.p_avg.args.cats || []).indexOf('food') >= 0, 'تفسیر: میانگین خوراکی');
  ok(R.p_persianDigits.args.amountMin === 1e7, 'تفسیر: عدد فارسی ۱۰ میلیون');
  ok(R.p_range.args.amountMin === 1e7 && R.p_range.args.amountMax === 2e7, 'تفسیر: بازهٔ مبلغ «بین ۱۰ و ۲۰ میلیون»');
  ok(!!R.p_empty.ask && !R.p_empty.tool, 'ورودی خالی: سؤال تکمیلی، بدون اجرای ابزار');
  ok(!!R.p_greet.ask && !R.p_greet.tool, 'سلام: پاسخ راهنما، بدون جست‌وجو');
  ok(R.p_unknown.tool === 'transactions.search' && R.p_unknown.args.text === 'آسمون آبیه' && !R.p_unknown.explain, 'متن بی‌کلیدواژه: جست‌وجوی شرح، بدون ساختن ابزار دیگر');
  ok(R.p_cmpDefault.tool === 'reports.compare', 'مقایسه بدون ماه: این ماه با ماه قبل');

  // پاسخ گفتگو
  ok(R.ask1.kind === 'result' && /۱۵٫۰۵۰٫۰۰۰|۱۵,۰۵۰,۰۰۰|۱۵٬۰۵۰٬۰۰۰|۱۵/.test(R.ask1.text), 'پاسخ: جمع هزینهٔ این ماه نمایش داده می‌شود');
  ok(R.ask2.data && R.ask2.data.items.length === 2 && R.ask2.data.items.every(i => i.id), 'پاسخ جست‌وجو: موارد با شناسه، بدون اطلاعات حذف‌شده');
  ok(R.askNone.kind === 'text', 'پاسخ متنی برای سلام');

  // عدم تغییر داده (تابع آرشیو و periodData قبل و بعد از همهٔ کارها)
  const before = await page.evaluate(() => JSON.stringify({ a: archive, p: periodData }));
  await page.evaluate(() => { hkAsstAsk('جمع هزینه‌های این ماه'); hkAsstAsk('بیمه تویوتا رو سرچ کن'); hkAsstAsk('مقایسه کن'); hkAsstAsk('مخارج پروژه‌ها جداگانه'); hkAsstExec('transactions.search', { text: 'نان' }); });
  const after = await page.evaluate(() => JSON.stringify({ a: archive, p: periodData }));
  ok(before === after, 'هیچ داده‌ای در اثر پرسش‌ها تغییر نکرد');

  // دکمه و پنجره
  const fab = await page.$('.hk-asst-fab');
  ok(!!fab, 'دکمهٔ دایره‌ای دستیار روی صفحه هست');
  if (fab) {
    const box = await fab.boundingBox();
    ok(box && box.width === 40 && box.height === 40 && box.x > 300 && box.y < 50, 'دکمه دایره‌ای ۴۰ پیکسلی در گوشهٔ بالا-راست، بیرون از دکمه‌های صفحه');
    await fab.click();
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById('hkAsstSheet').classList.contains('open')), 'با زدن دکمه، پنجرهٔ دستیار باز می‌شود');
    await page.click('.hk-asst-chip');
    await page.waitForTimeout(150);
    const cnt = await page.evaluate(() => document.querySelectorAll('.hk-asst-msg').length);
    ok(cnt >= 2, 'با زدن نمونه‌پرسش، پیام کاربر و پاسخ ظاهر می‌شود');
    await page.fill('.hk-asst-input', 'بیمه تویوتا رو سرچ کن');
    await page.click('.hk-asst-send');
    await page.waitForTimeout(200);
    const txt = await page.evaluate(() => document.querySelector('.hk-asst-log').textContent);
    ok(/بیمه تویوتا/.test(txt) && /تراکنش/.test(txt), 'جست‌وجو از کادر ورودی نتیجه می‌دهد');
    const item = await page.$('.hk-asst-item');
    const idShown = await page.evaluate(() => /r_[a-z0-9]+_[a-z0-9]+|شناسه/.test(document.querySelector('.hk-asst-log').textContent));
    ok(!idShown, 'شناسهٔ ردیف در پنجرهٔ دستیار نشان داده نمی‌شود');
    if (item) {
      await item.click(); await page.waitForTimeout(1600);
      const st = await page.evaluate(() => ({ open: document.getElementById('hkAsstSheet').classList.contains('open'), flashed: !!document.querySelector('.sp-flash') }));
      ok(!st.open && st.flashed, 'زدن روی نتیجه، پنجره را می‌بندد و ردیف را در صفحهٔ خودش هایلایت می‌کند');
      await page.click('.hk-asst-fab'); await page.waitForTimeout(200);
    }
    await page.click('.hk-asst-clear'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => !!document.querySelector('.hk-asst-empty')), 'پاک‌کردن گفتگو، صفحهٔ خالی را برمی‌گرداند');
    await page.click('.hk-asst-back'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => !document.getElementById('hkAsstSheet').classList.contains('open')), 'دکمهٔ بازگشت پنجره را می‌بندد');
  }
  ok(errs.length === 0, 'خطای صفحه نداریم' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
