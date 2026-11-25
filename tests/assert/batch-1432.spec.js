// ۱.۴.۴۱ — تصمیم‌های Q1/Q2/Q3 دستیار: شمارش فقط ردیف‌های دارای مبلغ، ردیف ناقص جدا، ردیف خالی نادیده،
// «خرج من» = عدد کارت اصلی با پرداخت‌نشدهٔ جدا و علت تفاوت با همهٔ ردیف‌ها، و مبنای عدد در ماه‌های دیگر (فقط دادهٔ ساختگی).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1', [P + '_asstEngine']: 'legacy' }; // ۱.۴.۴۵: این آزمون عبارت‌بندی موتور قبلی را می‌سنجد؛ موتور قبلی تا تأیید نهایی حفظ و با همین کلید آزموده می‌شود
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const R = await page.evaluate(() => {
    const row = (o) => Object.assign({ id: '', day: '1', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const title = hkMainTitle() || 'من';
    const mk = (exp, inc) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: title, rows: exp }]; pd.income.sections = [{ id: 'I', title: title, rows: inc || [] }]; return pd; };
    const proj = row({ id: 'e3', day: '4', desc: 'خرید پروژه', amount: 70000, financialContext: { classification: 'third_party', accountType: 'project', subjectId: 'p1', subjectName: 'پروژهٔ آزمون', fundingSource: 'subject', projectAmount: 70000, personalAdvanceAmount: 0 } });
    const cur = mk([
      row({ id: 'e1', day: '2', desc: 'بنزین', amount: 100000 }),
      row({ id: 'e2', day: '3', desc: 'نان', amount: 50000, status: 'unpaid' }),
      proj,
      row({ id: 'e4', day: '5', desc: 'یادداشت بدون مبلغ', amount: 0 }),
      row({ id: 'e5', day: '', desc: '', amount: 0 })
    ], [row({ id: 'i1', day: '1', desc: 'حقوق', amount: 900000 })]);
    const prev = mk([row({ id: 'p1', day: '2', desc: 'بنزین قبل', amount: 400000 }), row({ id: 'p2', day: '3', desc: 'نان قبل', amount: 0 })]);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev;
    const o = { cy, cm, py, pm };
    const agg = hkAsstExec('transactions.aggregate', { tab: 'expense', year: cy, month: cm }).result;
    o.count = agg.count; o.incomplete = agg.incomplete; o.unpaidE = agg.unpaidExpense; o.card = agg.card; o.sum = agg.sum;
    o.cardInc = hkAsstExec('transactions.aggregate', { tab: 'income', year: cy, month: cm }).result.card;
    const all = hkAsstExec('transactions.aggregate', { year: cy, month: cm }).result; o.allCount = all.count; o.minAmt = all.min;
    o.search = hkAsstExec('transactions.search', { year: cy, month: cm }).result;
    o.t1 = hkAsstAsk('این ماه چقدر خرج کردم؟'); o.t2 = hkAsstAsk('چند تا تراکنش دارم؟'); o.t3 = hkAsstAsk('ماه قبل چقدر خرج کردم؟'); o.t4 = hkAsstAsk('درآمد این ماه چقدره؟');
    o.prevAgg = hkAsstExec('transactions.aggregate', { tab: 'expense', year: py, month: pm }).result;
    o.real = hkAsstReal();
    // استثنا: «بدون / جز» شرط «نه» است، نه شرط مثبت
    o.n1 = hkAsstAsk('بدون بنزین چقد خرج کردم این ماه'); o.n2 = hkAsstAsk('بجز بنزین هزینه این ماه'); o.n3 = hkAsstAsk('جز درآمد');
    o.n4 = hkAsstAsk('جز حقوق درآمد این ماه'); o.n5 = hkAsstAsk('بدون نان و بنزین هزینه این ماه');
    const fu = (a, b) => { _hkAsstCtx = null; _hkAsstLastTarget = null; hkAsstAsk(a); return hkAsstAsk(b); };
    o.f1 = fu('این ماه چقدر خرج کردم', 'بدون بنزین'); o.f2 = fu('این ماه چقدر خرج کردم', 'نان رو حساب نکن'); o.f3 = fu('خرج خوراکی این ماه', 'همونو برا ماه قبل بگو');
    _hkAsstCtx = null; _hkAsstLastTarget = null; o.f4 = hkAsstAsk('بدون بنزین');
    o.c1 = hkAsstAsk('برا خوراک چقد دادم'); o.c2 = hkAsstAsk('دخل و خرجم چطوره'); o.c3 = hkAsstAsk('پولی که گرفتم این ماه');
    return o;
  });
  console.log('  شمارش:', R.count, 'ناقص:', R.incomplete);
  ok(R.count === 3, 'فقط ردیف‌های دارای مبلغ شمرده می‌شوند (۳ از ۵ ردیف)');
  ok(R.incomplete === 1, 'ردیف ناقص (شرح بدون مبلغ) جدا گزارش می‌شود و ردیف کاملاً خالی نه');
  ok(R.unpaidE === 50000, 'مبلغ پرداخت‌نشده جدا محاسبه می‌شود');
  ok(R.card && R.card.total === 150000 && R.card.unpaid === 50000, 'عدد کارت اصلی = همان personTotals (پرداخت‌شده+نشده، بدون ردیف پروژه‌ای)');
  ok(R.card && R.card.allTotal === 220000 && R.card.projectRows === 1, 'جمع همهٔ ردیف‌ها و تعداد ردیف پروژه‌ای برای توضیح تفاوت');
  ok(R.cardInc && R.cardInc.total === 900000 && R.cardInc.unpaid === 0, 'درآمد هم طبق کارت');
  ok(R.allCount === 4 && R.minAmt === 50000, 'کمترین مبلغ، ردیف صفر را به‌حساب نمی‌آورد');
  ok(R.search.count === 4 && R.search.incomplete === 1, 'جست‌وجو هم فقط ردیف‌های دارای مبلغ را می‌شمارد و ناقص را جدا می‌گوید');
  const T1 = R.t1.text || '';
  ok(/طبق کارت اصلی/.test(T1) && /پرداخت‌نشده/.test(T1), 'پاسخ «خرج من»: عدد کارت + پرداخت‌نشده جدا');
  ok(/ردیف پروژه‌ای/.test(T1) && /جمع همهٔ ردیف‌ها/.test(T1), 'علت تفاوت با همهٔ ردیف‌ها گفته می‌شود');
  ok(/ردیف ناقص/.test(T1), 'ردیف ناقص در پاسخ اعلام می‌شود');
  ok(/ردیف ناقص/.test(R.t2.text || '') && !/ردیف ناقص[^\n]*۰/.test(R.t2.text || ''), 'پاسخ تعداد: ردیف ناقص جدا (و فقط وقتی هست)');
  ok(/طبق همهٔ ردیف‌ها/.test(R.t3.text || '') && !/طبق کارت اصلی/.test(R.t3.text || ''), 'ماه غیر از ماه باز: مبنا صریح (همهٔ ردیف‌ها) و ادعای کارت نمی‌شود');
  ok(!/پرداخت‌نشده است/.test(R.t4.text || '') && /طبق کارت اصلی/.test(R.t4.text || ''), 'درآمد: عدد کارت، و بدون خط پرداخت‌نشدهٔ خالی');
  ok(R.real && R.real.y > 1300 && R.real.m >= 1 && R.real.m <= 12, 'تاریخ امروز دستیار معتبر است');
  ok(R.n1.data && R.n1.data.sum === 120000 && R.n1.cmd.args.excludeText[0] === 'بنزین', 'بدون بنزین: ردیف بنزین کنار می‌رود (۱۲۰٬۰۰۰ می‌ماند)، نه اینکه فقط بنزین حساب شود');
  ok(R.n2.data && R.n2.data.sum === 120000 && /بدون «بنزین»/.test(R.n2.text), 'به‌جز بنزین: همان استثنا و در پاسخ گفته می‌شود');
  ok(R.n3.cmd && R.n3.cmd.args.tab === 'expense', 'جز درآمد: فقط هزینه‌ها');
  ok(R.n4.data && R.n4.data.sum === 0 && R.n4.cmd.args.tab === 'income', 'جز حقوق: درآمد بدون ردیف حقوق');
  ok(R.n5.data && R.n5.data.sum === 70000 && R.n5.cmd.args.excludeText.length === 2, 'بدون نان و بنزین: هر دو کنار می‌روند');
  ok(R.n1.data && !R.n1.data.card, 'عدد «طبق کارت» وقتی استثنا هست ادعا نمی‌شود');
  ok(R.c1.cmd && R.c1.cmd.args.cats && R.c1.cmd.args.cats[0] === 'food' && !R.c1.cmd.args.text, 'محاوره: «برا خوراک چقد دادم» کلمهٔ اضافی را جست‌وجو نمی‌کند');
  ok(R.c2.tool === 'insights.overview', '«دخل و خرجم چطوره» = وضعیت مالی');
  ok(R.c3.cmd && R.c3.cmd.args.tab === 'income' && !R.c3.cmd.args.text, '«پولی که گرفتم این ماه» = درآمد این ماه');
  ok(R.f1.data && R.f1.data.sum === 120000 && R.f1.cmd.args.tab === 'expense' && R.f1.cmd.args.month === R.cm, 'ادامه: «بدون بنزین» روی همان سؤال قبلی (همان ماه و نوع) اعمال می‌شود');
  ok(R.f2.data && R.f2.data.sum === 170000 && R.f2.cmd.args.excludeText[0] === 'نان', 'ادامه: «نان رو حساب نکن»');
  ok(R.f3.cmd && R.f3.cmd.args.cats && R.f3.cmd.args.cats[0] === 'food' && R.f3.cmd.args.month === R.pm && !R.f3.cmd.args.text, 'ادامه: «همونو برا ماه قبل» فقط ماه را عوض می‌کند و بقیه می‌ماند');
  ok(R.f4.kind === 'text' && /بدون چی/.test(R.f4.text || ''), 'بدون سؤال قبلی، «بدون بنزین» حدس زده نمی‌شود؛ پرسیده می‌شود');
  const all = [R.t1, R.t2, R.t3, R.t4].map(x => x.text || '').join('\n');
  ok(!/(^|[^ء-ي])اپ([^ء-ي]|$)/.test(all), 'واژهٔ «اپ» در پاسخ‌ها نیست');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1432: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
