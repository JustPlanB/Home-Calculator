// ۱.۴.۴۲ — پاسخ مستقیم و کوتاه به «موجودی»، «پس‌انداز» و «وضعیت مالی» (فقط دادهٔ ساختگی).
// جمله‌ها تازه‌اند و از بانک‌های قبلی کپی نشده‌اند؛ مقدارهای مورد انتظار از جمع مستقیم دادهٔ آزمایشی همین فایل می‌آیند،
// نه از تابع تولید پاسخ. «موجودی» فقط از تابع موجودی خود برنامه می‌آید و «پس‌انداز» طبق تعریف خود کارت (درآمد منهای خرج).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => (n < 0 ? '−' : '') + fa(Math.abs(n).toLocaleString('en-US'));
const BAL = ['موجودیم چقدره؟', 'الان چقدر پول دارم؟', 'موجودی حساب‌هام چقدره؟', 'موجودی؟', 'موجودی حسابم رو بگو', 'چقد پول دارم الان', 'تو حسابام چقد پول هست',
  'موجودی من چنده', 'موجوودیم چقده؟', 'موجودی کل رو بگو', 'یه نگاه به موجودیم بنداز', 'مبلغ موجودی حسابام چنده', 'موجودی الانم چقدره'];
const SAVF = ['چقدر پس‌انداز کردم؟', 'این ماه چقدر تونستم کنار بذارم؟', 'پس‌انداز این ماه', 'چقد پس انداز داشتم این ماه', 'پسانداز کردم چقدره؟', 'این ماه چقد کنار گذاشتم',
  'چقدر پس‌انداز شد؟', 'پس اندازم این ماه چقدر بوده', 'پس انداز ماهانه‌ام چقدره', 'چقدر پول کنار گذاشتم این ماه'];
const SAVS = ['پس‌اندازم چقدره؟', 'چقدر پس‌انداز دارم؟', 'پس اندازهام چقدره', 'ارز و طلام چقدره؟', 'پس‌انداز دارم؟', 'چقد پس انداز دارم', 'پس اندازم چنده',
  'پس‌اندازهای من چقدره؟', 'پس‌اندازم چیه؟', 'پس انداز ارز و طلام'];
const STAT = ['وضعیت مالیم چطوره؟', 'وضعم چطوره', 'از نظر مالی چه وضعی دارم؟', 'وضعیت مالی', 'وضعیت من چطوره', 'حال مالیم چطوره', 'وضعیت مالی این ماه', 'وضعیت مالیم چیه',
  'مالیم چطوره', 'وضعیتم؟', 'وضعیت مالی من خوبه؟', 'وضعیت مالی‌ام رو بگو'];
const GUARD = [['چطور پس‌انداز کنم؟', 'insights.advice'], ['برای ۲۰۰ میلیون پس‌انداز چند ماه طول می‌کشه؟', 'insights.goal'], ['گزارش کامل وضعیت مالی', 'insights.overview'], ['نرخ پس‌اندازم چقدره', 'insights.overview']];
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const row = (o) => Object.assign({ id: '', day: '2', desc: '', amount: 0, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }, o);
    const cy = currentYear, cm = currentMonth, t = hkMainTitle() || 'من';
    selectedBankAccounts = [{ id: 'a1', label: 'ملی', bank: 'ملی' }, { id: 'a2', label: 'ملت', bank: 'ملت' }];
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e }]; pd.income.sections = [{ id: 'I', title: t, rows: i }]; return pd; };
    const cur = mk([row({ id: 'a', desc: 'بنزین', amount: 100000, account: 'ملی' }), row({ id: 'b', desc: 'نان', amount: 50000, account: 'ملت' }),
      row({ id: 'c', desc: 'قبض', amount: 70000, status: 'unpaid', account: 'ملی' }), row({ id: 'f', day: '', desc: '', amount: 0 })],
      [row({ id: 'i', desc: 'حقوق', amount: 9000000, account: 'ملی' })]);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur));
    _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; const r = hkAsstAsk(q); return { q, kind: r.kind, tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || '') }; }), qs);
  // مقدارهای مورد انتظار از جمع مستقیم دادهٔ بالا: ملی = ۹٬۰۰۰٬۰۰۰ − ۱۰۰٬۰۰۰ ؛ ملت = −۵۰٬۰۰۰ ؛ (ردیف پرداخت‌نشدهٔ ۷۰٬۰۰۰ در موجودی نیست)
  const BAL_TOTAL = 9000000 - 100000 - 50000, MELLI = 9000000 - 100000, MELLAT = -50000;
  const NET = 9000000 - (100000 + 50000 + 70000);
  const lines = (r) => r.text.split('\n').length;
  const nums = (t) => (t.match(/[۰-۹][۰-۹,]{3,}/g) || []);
  const bad = [];
  const mark = (grp, r, good) => { if (!good) bad.push(grp + ' ← ' + r.q + ' → ' + r.tool + JSON.stringify(r.args)); return good; };
  let tot = 0, hit = 0;
  // موجودی
  const B = await ask(BAL);
  B.forEach(r => { tot++; if (mark('BAL', r, r.tool === 'insights.balance' && !r.args.past)) hit++; });
  const B0 = B.filter(r => r.tool === 'insights.balance');
  ok(B0.every(r => r.text.indexOf(fmt(BAL_TOTAL)) >= 0 && r.text.split(fmt(BAL_TOTAL)).length === 2), 'موجودی: عدد کل درست و فقط یک‌بار (' + fmt(BAL_TOTAL) + ')');
  ok(B0.every(r => nums(r.text).every(n => [fmt(BAL_TOTAL), fmt(MELLI), fmt(-MELLAT)].indexOf(n) >= 0 || n === '۱۴۰۵')), 'موجودی: هیچ عدد دیگری جز مقدارهای حساب‌ها و جمع در پاسخ نیست');
  ok(B0.every(r => lines(r) <= 3 + (/در نظر گرفتم/.test(r.text) ? 1 : 0) && lines(r) - (/در نظر گرفتم/.test(r.text) ? 1 : 0) <= 3), 'موجودی: پاسخ اولیه حداکثر ۳ خط');
  ok(B0.every(r => /ملی/.test(r.text) && /ملت/.test(r.text)), 'موجودی: حساب‌ها به تفکیک آمده‌اند');
  ok(B0.every(r => !/درآمد|هزینه|پس‌انداز/.test(r.text)), 'موجودی: گزارش درآمد/هزینه/توصیه نمی‌آید');
  // موجودی: مرزها
  const past = (await ask(['موجودی آخر ماه قبل چقدر بود', 'موجودی پارسال چقدر بود']));
  ok(past.every(r => r.tool === 'insights.balance' && nums(r.text).length === 0 && /نمی‌تونم/.test(r.text)), 'موجودی گذشته: عدد نمی‌دهد و محدودیت را می‌گوید');
  const om = await page.evaluate(() => { const keep = currentMonth; currentMonth = (currentMonth % 12) + 1; try { _hkAsstCtx = null; const r = hkAsstAsk('موجودیم چقدره؟'); return { tool: r.tool, text: String(r.text) }; } finally { currentMonth = keep; } });
  ok(om.tool === 'insights.balance' && (om.text.match(/[۰-۹][۰-۹,]{3,}/g) || []).filter(n => n !== '۱۴۰۵').length === 0 && /باز است/.test(om.text), 'ماه باز ≠ ماه جاری: عدد موجودی نمی‌سازد و دلیل را می‌گوید');
  // تقویم شمسی دستگاه خراب: «ماه جاری» مطمئن نیست ← عدد نمی‌سازد
  const nd = await page.evaluate(() => { const D = Intl.DateTimeFormat; Intl.DateTimeFormat = function () { throw new Error('no persian'); }; try { _hkAsstCtx = null; const a = hkAsstAsk('موجودیم چقدره؟'), b = hkAsstAsk('چقدر پس‌انداز کردم؟'); return { a: String(a.text), b: String(b.text) }; } finally { Intl.DateTimeFormat = D; } });
  ok(/تقویم شمسی/.test(nd.a) && !/[۰-۹]{3,}/.test(nd.a) && /تقویم شمسی/.test(nd.b) && !/[۰-۹]{3,}/.test(nd.b), 'تقویم شمسی دستگاه خراب: موجودی و پس‌اندازِ «این ماه» عدد نمی‌دهند و دلیل را می‌گویند');
  // پس‌انداز ماهانه
  const F = await ask(SAVF);
  F.forEach(r => { tot++; if (mark('SAVF', r, r.tool === 'insights.savings' && r.args.mode === 'flow')) hit++; });
  const F0 = F.filter(r => r.tool === 'insights.savings' && r.args.mode === 'flow');
  ok(F0.every(r => r.text.split(fmt(NET)).length === 2), 'پس‌انداز ماهانه: عدد (درآمد منهای خرج) درست و فقط یک‌بار (' + fmt(NET) + ')');
  ok(F0.every(r => nums(r.text).every(n => [fmt(NET), fmt(9000000), fmt(220000), fmt(70000)].indexOf(n) >= 0 || n === '۱۴۰۵')), 'پس‌انداز ماهانه: هیچ عدد غیرمنشأدار نیست');
  ok(F0.every(r => lines(r) <= 3 + (/در نظر گرفتم/.test(r.text) ? 1 : 0)), 'پس‌انداز ماهانه: حداکثر ۳ خط');
  ok(F0.every(r => /درآمد منهای خرج/.test(r.text) && /طبق کارت اصلی/.test(r.text) && /پرداخت‌نشده/.test(r.text)), 'پس‌انداز ماهانه: تعریف و مبنا و پرداخت‌نشده گفته می‌شود');
  ok(F0.every(r => !/•|پیشنهاد|اگه فقط/.test(r.text)), 'پس‌انداز ماهانه: فهرست توصیه نمی‌آید');
  // پس‌انداز ارز و طلا: خالی، بدون قیمت، با قیمت
  const S1 = await ask(SAVS);
  S1.forEach(r => { tot++; if (mark('SAVS', r, r.tool === 'insights.savings' && r.args.mode === 'stock')) hit++; });
  ok(S1.filter(r => r.args.mode === 'stock').every(r => /هنوز چیزی ثبت نشده/.test(r.text) && nums(r.text).length === 0 && lines(r) <= 3), 'پس‌انداز ارز و طلا خالی: صادقانه «ثبت نشده» و بدون عدد');
  const S2 = await page.evaluate(() => { _savings = { v: 1, items: [{ id: 's1', asset: 'usd', qty: 100, buy: 0, y: 1405, m: 9, d: 1 }], prices: {} }; _hkAsstCtx = null; const r = hkAsstAsk('پس‌اندازم چقدره؟'); return { text: String(r.text) }; });
  ok(/قیمت روز وارد نشده/.test(S2.text) && !/تومان/.test(S2.text.replace(/ارزش تومانی/g, '')) && S2.text.split('\n').length <= 3, 'پس‌انداز بدون قیمت: ارزش تومانی نمی‌سازد و دلیل را می‌گوید');
  const S3 = await page.evaluate(() => { _savings = { v: 1, items: [{ id: 's1', asset: 'usd', qty: 100, buy: 0, y: 1405, m: 9, d: 1 }], prices: { usd: { p: 1000000, at: 1 } } }; _hkAsstCtx = null; const r = hkAsstAsk('چقدر پس‌انداز دارم؟'); return { text: String(r.text) }; });
  ok(S3.text.split(fmt(100 * 1000000)).length === 2 && S3.text.split('\n').length <= 3, 'پس‌انداز با قیمت: ارزش = مقدار × قیمتِ واردشده (۱۰۰ × ۱٬۰۰۰٬۰۰۰) یک‌بار و ≤ ۳ خط');
  await page.evaluate(() => { _savings = { v: 1, items: [], prices: {} }; });
  // وضعیت مالی
  const T = await ask(STAT);
  T.forEach(r => { tot++; if (mark('STAT', r, r.tool === 'insights.overview' && r.args.short === true)) hit++; });
  const T0 = T.filter(r => r.tool === 'insights.overview' && r.args.short === true);
  ok(T0.every(r => lines(r) <= 4), 'وضعیت مالی: پاسخ اولیه حداکثر ۴ خط');
  ok(T0.every(r => r.text.indexOf(fmt(9000000)) >= 0 && r.text.indexOf(fmt(220000)) >= 0 && r.text.indexOf(fmt(NET)) >= 0), 'وضعیت مالی: درآمد، خرج و مانده درست (از جمع مستقیم دادهٔ آزمایشی)');
  ok(T0.every(r => /طبق کارت اصلی/.test(r.text)), 'وضعیت مالی: مبنای عدد گفته می‌شود');
  ok(T0.every(r => !/•|بزرگ‌ترین خرجت|میانگین خرج روزانه/.test(r.text)), 'وضعیت مالی: گزارش بلند و فهرست نمی‌آید');
  // نگهبان‌ها: این‌ها نباید دزدیده شوند
  const G = await ask(GUARD.map(x => x[0]));
  G.forEach((r, i) => ok(r.tool === GUARD[i][1], 'نگهبان: «' + GUARD[i][0] + '» هنوز به ' + GUARD[i][1] + ' می‌رود'));
  const rate = hit / tot;
  console.log('  تشخیص درست: ' + hit + ' از ' + tot + ' (' + Math.round(rate * 1000) / 10 + '٪)');
  bad.forEach(x => console.log('    ✗ شکست تشخیص: ' + x));
  ok(rate >= 0.9, 'تشخیص درست مجموعهٔ تازه ≥ ۹۰٪');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1434: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
