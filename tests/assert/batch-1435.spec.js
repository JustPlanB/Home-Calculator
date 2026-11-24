// ۱.۴.۴۲ — بازگشت‌ناپذیری خطاهای کشف‌شده در ارزیابی اکتشافی فهم (نوبت ۵): موجودی محاوره‌ای، دارایی ارز و طلا، وضعیت مالی،
// ادامهٔ مکالمه با ضمیرِ پسوندی، استثنا با «حساب کن»، واژه‌های نزدیک به نام ماه و «ماه گذشتم».
// جمله‌ها از مجموعه‌های ارزیابی کپی نشده‌اند؛ مقدارهای مورد انتظار از جمع مستقیم دادهٔ ساختگی همین فایل می‌آیند (فقط دادهٔ ساختگی).
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
      [row({ id: 'i1', desc: 'حقوق', amount: 9000000, account: 'ملی' })]);
    const prev = mk([row({ id: 'p1', desc: 'بنزین', amount: 400000 }), row({ id: 'p2', desc: 'اسنپ', amount: 60000 })], [row({ id: 'pi', desc: 'حقوق', amount: 8000000 })]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; const r = hkAsstAsk(q); return { q, tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), count: r.data && r.data.count, corr: ((r.cmd && r.cmd.corrections) || []).length }; }), qs);
  const seq = (pairs) => page.evaluate((pairs) => pairs.map(p => { _hkAsstCtx = null; _hkAsstLastTarget = null; hkAsstAsk(p[0]); const r = hkAsstAsk(p[1]); return { q: p[0] + ' ⇒ ' + p[1], tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), count: r.data && r.data.count }; }), pairs);
  const lines = (r) => r.text.split('\n').length;
  const BAL_TOTAL = 9000000 - (100000 + 40000 + 85000 + 300000 + 60000), MELLI = 9000000 - (100000 + 85000 + 300000);
  // ۱) موجودیِ محاوره‌ای
  const B = await ask(['الان چقد تو بانکم دارم', 'بیلانس کارتام', 'مانده حسابم چقده', 'ته حساب ملتم چقد پوله', 'چقدر پول تو کارت دارم', 'موجودیمو نشونم بده', 'کل پولی که تو حسابام دارم چقدره']);
  ok(B.every(r => r.tool === 'insights.balance'), 'موجودیِ محاوره‌ای: هر ۷ جمله به ابزار موجودی می‌رسد (' + B.filter(r => r.tool !== 'insights.balance').map(r => r.q).join('|') + ')');
  ok(B.every(r => r.text.indexOf(fmt(BAL_TOTAL)) >= 0 && lines(r) <= 3), 'موجودیِ محاوره‌ای: عدد از جمع مستقیم (' + fmt(BAL_TOTAL) + ') و ≤ ۳ خط');
  // ۲) دارایی ارز و طلا
  const S = await ask(['چندتا سکه دارم', 'ارزش یوروهام', 'چقد طلا دارم', 'دلارم چقدره', 'پس‌انداز طلا و ارزم']);
  ok(S.every(r => r.tool === 'insights.savings' && r.args.mode === 'stock'), 'ارز و طلا: هر ۵ جمله حالت دارایی (' + S.filter(r => r.args.mode !== 'stock').map(r => r.q).join('|') + ')');
  ok(S.every(r => /هنوز چیزی ثبت نشده/.test(r.text) && !/[۰-۹]{3,}/.test(r.text)), 'ارز و طلای خالی: بدون عدد و صادقانه');
  // ۳) وضعیت مالی کوتاه
  const T = await ask(['اوضاع مالی من چطوره', 'مالیم چطور پیش میره', 'از نظر پول وضعم چطوره']);
  ok(T.every(r => r.tool === 'insights.overview' && r.args.short === true && lines(r) <= 4), 'وضعیت مالی: کوتاه (≤ ۴ خط) برای ۳ جملهٔ تازه');
  const T2 = (await ask(['وضعیت مالی ماه پیشم چطور بود']))[0];
  ok(T2.args.short === true && T2.text.indexOf(fmt(460000)) >= 0 && T2.text.indexOf(fmt(8000000)) >= 0, '«ماه پیشم»: ماه قبل (نه ماه باز) و عددهای درست');
  const G = (await ask(['خرج ماه گذشتم', 'خرج ماه گذشته‌م']));
  ok(G.every(r => r.tool === 'transactions.aggregate' && r.text.indexOf(fmt(460000)) >= 0), '«ماه گذشتم/گذشته‌م» = ماه قبل (جمع ۴۶۰٬۰۰۰)');
  // ۴) ادامهٔ مکالمه با ضمیر پسوندی و استثنا
  const C = await seq([['خرج خوراکی این ماه', 'جمعشو بگو'], ['اسنپ این ماه', 'تعدادشو بگو'], ['خرج این ماه', 'منظورم درآمد بود'], ['خرج این ماه', 'نه، منظورم ماه پیش بود'],
    ['خرج خوراکی این ماه', 'حالا بدون برنج حساب کن'], ['هزینه این ماه', 'همونو برای ماه پیش بگو'], ['خرج این ماه', 'اسنپ و تپسی رو حساب نکن']]);
  ok(C[0].args.cats && C[0].args.cats[0] === 'food' && C[0].args.month && C[0].text.indexOf(fmt(100000)) >= 0, 'جمعشو: شرط دسته و ماه قبلی حفظ می‌شود (' + fmt(100000) + ')');
  ok(C[1].count === 1 && C[1].args.month, 'تعدادشو: همان کلمه و ماه (۱ تراکنش)');
  ok(C[2].args.tab === 'income' && C[2].args.month && C[2].text.indexOf(fmt(9000000)) >= 0, '«منظورم درآمد بود»: نوع عوض می‌شود، ماه می‌ماند');
  ok(C[3].args.month && C[3].text.indexOf(fmt(460000)) >= 0 && !C[3].args.text, '«نه، منظورم ماه پیش بود»: ماه قبل، بدون کلمهٔ جست‌وجوی اضافه (' + fmt(460000) + ')');
  ok(C[4].args.cats && C[4].args.excludeText && C[4].args.excludeText[0] === 'برنج' && C[4].text.indexOf(fmt(40000)) >= 0, '«بدون برنج حساب کن»: «حساب» جزو کلمهٔ کنارگذاشته نمی‌شود (' + fmt(40000) + ')');
  ok(C[5].args.tab === 'expense' && C[5].text.indexOf(fmt(460000)) >= 0, '«همونو برای ماه پیش»: همان سؤال با ماه قبل');
  const sum6 = 100000 + 40000 + 300000 + 60000 + 45000 + 85000 - 85000 - 45000;   // بدون اسنپ و تپسی
  ok(C[6].args.excludeText && C[6].args.excludeText.indexOf('اسنپ') >= 0 && C[6].args.excludeText.indexOf('تپسی') >= 0 && C[6].text.indexOf(fmt(sum6)) >= 0, '«اسنپ و تپسی رو حساب نکن» روی ادامه: ' + fmt(sum6));
  // ۵) واژه‌های نزدیک به ماه، تغییر ماه نمی‌دهند
  const H = await ask(['شهریار چقدر خرج کردم', 'مرداب چقدر خرج کردم', 'مهران چقدر خرج کردم', 'الانم چقدر خرج کردم']);
  ok(H.every(r => !r.args.month && r.corr === 0), 'نام‌های نزدیک به ماه (شهریار، مرداب، مهران) و «الانم» به ماه تبدیل نمی‌شوند');
  // ۶) ابهام «پس‌انداز»: برداشت دوم فقط وقتی ارز و طلا ثبت شده
  await page.evaluate(() => { _savings = { v: 1, items: [{ id: 's1', asset: 'usd', qty: 10, buy: 0, y: 1405, m: 9, d: 1 }], prices: { usd: { p: 1000000, at: 1 } } }; });
  const A = await ask(['پس‌انداز؟', 'پس‌انداز این ماه']);
  ok(A[0].args.mode === 'flow' && A[0].text.indexOf(fmt(10 * 1000000)) >= 0 && lines(A[0]) <= 3, 'پس‌انداز بی‌نشانه: ماهانه + یک خط جدا برای ارز و طلا (' + fmt(10000000) + ')، ≤ ۳ خط');
  ok(A[1].args.mode === 'flow' && A[1].text.indexOf(fmt(10 * 1000000)) < 0, '«پس‌انداز این ماه»: صریح است، خط ارز و طلا نمی‌آید');
  await page.evaluate(() => { _savings = { v: 1, items: [], prices: {} }; });
  const A0 = (await ask(['پس‌انداز؟']))[0];
  ok(A0.args.mode === 'flow' && !/ارز و طلات هم/.test(A0.text), 'بدون ارز و طلای ثبت‌شده: خط اضافه نمی‌آید');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1435: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
