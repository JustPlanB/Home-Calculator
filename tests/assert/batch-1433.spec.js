// ۱.۴.۴۲ — رگرسیون «کوتاهی و بی‌تکراری» پاسخ‌های جمع و شمارش دستیار (فقط دادهٔ ساختگی).
// این آزمون خروجی مورد انتظار را از تابع تولید پاسخ کپی نمی‌کند: عددها از جمع مستقیم مقدارهای دادهٔ آزمایشی، و ساختار پاسخ
// (تعداد خط، نبود خط برداشت جدا، نبود تکرار عدد/برچسب، نبود خط خالی/نامرتبط) با قاعده‌های جداگانه سنجیده می‌شود.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const QS = ['این ماه چقدر خرج کردم', 'خرج این ماه', 'مخارج ماه جاری', 'درآمد این ماه', 'ماه قبل چقدر خرج کردم', 'چند تا تراکنش دارم؟', 'تعداد تراکنش‌های این ماه',
  'میانگین خرجم', 'هزینه امسال', 'بدون اسنپ چقد خرج کردم', 'جز قبوض هزینه این ماه', 'هزینه خوراکی این ماه چقدره'];
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => fa(n.toLocaleString('en-US'));
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  // دادهٔ A: همه پرداخت‌شده، بدون ردیف ناقص، بدون ردیف پروژه‌ای؛ دادهٔ B: همه نوع تکمیلی
  const run = async (withExtras) => page.evaluate(({ QS, withExtras }) => {
    const row = (o) => Object.assign({ id: '', day: '2', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e }]; pd.income.sections = [{ id: 'I', title: t, rows: i || [] }]; return pd; };
    const e = [row({ id: 'a', desc: 'بنزین', amount: 100000 }), row({ id: 'b', desc: 'نان', amount: 50000, status: withExtras ? 'unpaid' : 'paid' }), row({ id: 'c', desc: 'اسنپ', amount: 85000 }), row({ id: 'd', desc: 'قبض برق', amount: 300000 }), row({ id: 'f', day: '', desc: '', amount: 0 })];
    if (withExtras) e.push(row({ id: 'g', desc: 'یادداشت بی مبلغ', amount: 0 }));
    const cur = mk(e, [row({ id: 'i', desc: 'حقوق', amount: 9000000 })]);
    const prev = mk([row({ id: 'p1', desc: 'بنزین', amount: 400000 }), row({ id: 'p2', desc: 'اسنپ', amount: 60000 })]);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev;
    return QS.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; const r = hkAsstAsk(q); return { q, kind: r.kind, tool: r.tool || '', text: String(r.text || ''), sum: r.data && r.data.sum, count: r.data && r.data.count }; });
  }, { QS, withExtras });
  const A = await run(false);
  const B = await run(true);
  const agg = (R) => R.filter(r => r.kind === 'result' && r.tool === 'transactions.aggregate' && r.count > 0);
  const HDR = /^(جمع|تعداد|میانگین|بیشترین|کمترین|جست‌وجو|مقایسه|گروه‌بندی)،/;
  const AA = agg(A), BB = agg(B);
  ok(AA.length >= 10, 'حداقل ۱۰ پاسخ جمع/شمارش بررسی شد (' + AA.length + ')');
  ok(AA.every(r => r.text.split('\n').length === 1), 'بدون پرداخت‌نشده/ردیف ناقص/تفاوت: هر پاسخ دقیقاً یک خط است');
  ok(AA.every(r => !HDR.test(r.text)), 'هیچ پاسخی با خط «برداشت»ِ جدا (جمع، هزینه‌ها، …) شروع نمی‌شود');
  ok(AA.every(r => !/پرداخت‌نشده|دریافت‌نشده|ردیف ناقص|ردیف پروژه‌ای|بخش‌های دیگر/.test(r.text)), 'وقتی چنین چیزی نیست، هیچ خط توضیحی اضافه نمی‌آید');
  // عدد از جمع مستقیم دادهٔ آزمایشی: هزینهٔ این ماه = ۱۰۰٬۰۰۰ + ۵۰٬۰۰۰ + ۸۵٬۰۰۰ + ۳۰۰٬۰۰۰
  const expTotal = 100000 + 50000 + 85000 + 300000, incTotal = 9000000;
  const q1 = A[0], q4 = A[3], q5 = A[4];
  ok(q1.sum === expTotal && q1.text.split(fmt(expTotal)).length === 2, 'هزینهٔ این ماه: عدد درست و فقط یک‌بار در متن (' + fmt(expTotal) + ')');
  ok(q4.sum === incTotal && q4.text.split(fmt(incTotal)).length === 2, 'درآمد این ماه: عدد درست و فقط یک‌بار در متن');
  ok(q5.sum === 460000 && q5.text.split(fmt(460000)).length === 2, 'ماه قبل: عدد درست و فقط یک‌بار در متن');
  ok(AA.every(r => { const nums = r.text.match(/[۰-۹][۰-۹,]{3,}/g) || []; return new Set(nums).size === nums.length; }), 'هیچ عدد چهاررقمی‌ای در یک پاسخ دوبار نمی‌آید');
  ok(AA.every(r => { const m = r.text.match(/(هزینه‌ها|درآمدها|همهٔ تراکنش‌ها|ماه [^\s،:—(]+)/g) || []; return new Set(m).size === m.length; }), 'برچسب نوع/ماه در یک پاسخ تکرار نمی‌شود');
  const B1 = B[0], B2 = B[1];
  ok(B1.text.split('\n').length <= 2 && B2.text.split('\n').length <= 2, 'با پرداخت‌نشده + ردیف ناقص: حداکثر دو خط (جملهٔ اصلی + یک خط توضیح)');
  ok(/۵۰٬?,?۰۰۰|۵۰,۰۰۰/.test(B1.text) && /ناقص/.test(B1.text), 'پرداخت‌نشده و ردیف ناقص هنوز اعلام می‌شوند (فقط فشرده‌تر)');
  ok(B1.sum === expTotal, 'عدد با وجود خط‌های اضافه تغییر نمی‌کند');
  const lines = (R) => R.reduce((s, r) => s + r.text.split('\n').length, 0) / R.length;
  ok(lines(AA) <= 1.0001, 'میانگین خط پاسخ‌های جمع/شمارش در حالت ساده ۱ است (' + lines(AA).toFixed(2) + ')');
  ok(lines(BB) <= 2.0001, 'میانگین خط در حالت پرتوضیح حداکثر ۲ است (' + lines(BB).toFixed(2) + ')');
  // برداشت و فرض‌ها پنهان نمی‌شوند
  const ex = A[9];
  ok(ex.kind === 'result' && /اسنپ/.test(ex.text) && /بدون/.test(ex.text), 'استثنا هنوز در جملهٔ اصلی گفته می‌شود');
  const cat = A[10];
  ok(cat.kind === 'result' && /قبوض/.test(cat.text), 'دستهٔ کنار گذاشته‌شده هنوز در جملهٔ اصلی گفته می‌شود');
  ok(AA.every(r => /ماه|سال|همهٔ ماه‌ها|امسال/.test(r.text) || /تراکنش/.test(r.text)), 'بازهٔ زمانی/برداشت در هر پاسخ آمده است');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1433: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
