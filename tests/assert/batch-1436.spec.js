// ۱.۴.۴۳ — «پاسخ اشتباهِ مطمئن خطرناک‌تر از نفهمیدم است»: واژهٔ ناشناخته و شرط ناشناخته نباید بی‌صدا حذف یا به شرط مثبت تبدیل شوند.
// فقط دادهٔ ساختگی؛ جمله‌ها تازه‌اند (از مجموعه‌های ارزیابی و بانک‌های قبلی کپی نشده‌اند)؛ مقدارهای مورد انتظار از جمع مستقیم دادهٔ همین فایل.
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
  // ۱) واژهٔ ناشناخته: نه جمع، نه «پیدا نکردم»
  const U = await ask(['ماه پیش برای قناری چقدر دادم', 'چقدر خرج سنجاقک کردم این ماه', 'هزینه این ماه بدون پاپیون چقد میشه', 'درآمدا به‌جز ساربان چقدر بوده', 'فقط هزینه‌های گلابتون چقدره', 'خرج این ماه به‌جز فلان مورد چقدره']);
  ok(U.every(isAsk), 'واژهٔ ناشناخته (در جمع، «بدون»، «به‌جز»، «فقط»): هیچ ابزاری اجرا نمی‌شود و فقط سؤال کوتاه پرسیده می‌شود');
  ok(U.every(r => !NUM.test(r.text)), 'در این موارد هیچ عددِ مالی نمایش داده نمی‌شود');
  ok(U.every(r => !/پیدا نکردم|ثبت نشده/.test(r.text)), '«پیدا نکردم/ثبت نشده» برای واژهٔ نامفهوم به کار نمی‌رود');
  ok(/قناری/.test(U[0].text) && /پاپیون/.test(U[2].text) && /ساربان/.test(U[3].text) && /گلابتون/.test(U[4].text), 'پرسش دقیقاً همان واژهٔ نامفهوم را نام می‌برد');
  ok(U[2].text.split('\n').length === 1 && U[2].text.length < 140, 'پرسش روشن‌کننده کوتاه است (یک خط)');
  // ۲) واژهٔ معتبر با نتیجهٔ صفر ≠ ناشناخته
  const Z = await ask(['خرج آموزش ماه قبل چقدر بود', 'اسنپ پارسال چقدر شد', 'هزینهٔ بهداشت این ماه چقده']);
  ok(Z.every(r => r.tool === 'transactions.aggregate' && /ثبت نشده/.test(r.text) && !/نفهمیدم|چیه؟/.test(r.text)), 'دستهٔ معتبر / کلمهٔ موجود در دادهٔ ماه‌های دیگر با نتیجهٔ صفر: «ثبت نشده است»، نه نفهمیدم');
  ok(Z[0].args.cats && Z[0].args.cats[0] === 'education' && Z[2].args.cats && Z[2].args.cats[0] === 'health' && Z[1].args.text === 'اسنپ', 'فیلترهای واقعاً اعمال‌شده: دستهٔ آموزش/سلامت و کلمهٔ اسنپ');
  // ۳) واژهٔ معتبر با نتیجهٔ غیرصفر
  const N = await ask(['بدون قبض این ماه چقد خرج کردم', 'فقط هزینه‌های اسنپ این ماه', 'به‌جز تپسی چقدر خرج کردم این ماه']);
  ok(N[0].args.excludeCats && N[0].args.excludeCats[0] === 'bills' && N[0].text.indexOf(fmt(630000 - 300000)) >= 0, '«بدون قبض»: دستهٔ قبوض کنار می‌رود (' + fmt(330000) + ')');
  ok(N[1].args.text === 'اسنپ' && N[1].text.indexOf(fmt(85000)) >= 0, '«فقط … اسنپ»: فقط اسنپ (' + fmt(85000) + ')');
  ok(N[2].args.excludeText && N[2].args.excludeText[0] === 'تپسی' && N[2].text.indexOf(fmt(630000 - 45000)) >= 0, '«به‌جز تپسی»: ' + fmt(585000));
  // ۴) نشانهٔ استثنای شناسایی‌نشده
  const Q = await ask(['هزینه این ماه منهای قبض', 'خرج این ماه به استثنای اسنپ', 'خرج این ماه مگر بنزین', 'خرج این ماه تپسی نباشه']);
  ok(Q.every(isAsk) && Q.every(r => !NUM.test(r.text)), 'نشانهٔ استثنای ناشناخته («منهای»، «به استثنای»، «مگر»، «نباشه»): عدد نمی‌دهد و می‌پرسد (نه شرط مثبت)');
  // ۵) کنار گذاشتن ماه / حساب پشتیبانی نمی‌شود: متوقف و گفته می‌شود
  const X = await ask(['خرج این ماه بدون آذر', 'هزینه‌ها به‌جز حساب ملت']);
  ok(X.every(isAsk) && X.every(r => !NUM.test(r.text)) && /نمی‌تونم/.test(X[0].text), 'کنار گذاشتن ماه/حساب: شرط بی‌صدا حذف نمی‌شود؛ عدد داده نمی‌شود');
  // ۶) «دسته» و «هیچ شرطی»
  const D = await ask(['هزینه‌ها بدون دستهٔ حمل‌ونقل چقدر میشه', 'کل خرج این ماه بدون هیچ شرطی']);
  ok(D[0].args.excludeCats && D[0].args.excludeCats[0] === 'transport' && !D[0].args.cats && D[0].text.indexOf(fmt(1090000 - 690000)) >= 0, '«بدون دستهٔ حمل‌ونقل»: کنار گذاشتن دسته، نه شمردن آن (' + fmt(400000) + ')');
  ok(D[1].tool === 'transactions.aggregate' && !D[1].args.excludeText && D[1].text.indexOf(fmt(630000)) >= 0, '«بدون هیچ شرطی»: هیچ استثنایی ساخته نمی‌شود (' + fmt(630000) + ')');
  // ۷) چند شرط، فقط یکی ناشناخته
  const M = (await ask(['خرج این ماه بدون اسنپ و پاپیون']))[0];
  ok(isAsk(M) && /پاپیون/.test(M.text) && !/اسنپ/.test(M.text), 'چند شرط با یک واژهٔ ناشناخته: فقط همان واژه پرسیده می‌شود');
  // ۸) واژهٔ ناشناخته شبیه ماه/دسته
  const S = await ask(['هزینه آبانک', 'خرج این ماه برای خوراکیه']);
  ok(isAsk(S[0]) && S[0].sug.some(x => /آبان/.test(x)) && !NUM.test(S[0].text), 'واژهٔ شبیه ماه («آبانک»): پیش از اجرا تأیید می‌گیرد و چیپ سؤالِ کامل با «آبان» است');
  ok(S[1].tool === 'transactions.aggregate' && S[1].args.cats && S[1].args.cats[0] === 'food' && /در نظر گرفتم/.test(S[1].text), 'غلط تایپیِ دسته («خوراکیه») اصلاح و در پاسخ گفته می‌شود');
  // ۹) اصلاح کاربر و ادامه پس از سؤال روشن‌کننده
  const R = await seq([['خرج این ماه بدون زرتی چقدره', 'قبض'], ['هزینه‌ها به‌جز فلان مورد چقدر بوده؟', 'منظورم اسنپ بود'], ['خرج این ماه بدون زرتی', 'سلام'], ['خرج این ماه بدون زرتی', 'موجودیم چقدره'],
    ['خرج این ماه فقط گلابتون', 'بنزین']]);
  ok(R[0][1].args.excludeCats && R[0][1].args.excludeCats[0] === 'bills' && R[0][1].text.indexOf(fmt(330000)) >= 0, 'پاسخ تایپی «قبض» به سؤال روشن‌کننده: همان پرسش با «بدون قبض» اجرا می‌شود (' + fmt(330000) + ')');
  ok(R[1][1].args.excludeText && R[1][1].args.excludeText[0] === 'اسنپ', '«منظورم اسنپ بود»: عبارت «فلان مورد» با اسنپ عوض می‌شود');
  ok(R[2][1].decision !== 'ask' || !/زرتی/.test(R[2][1].text), 'یک گفتهٔ مستقل («سلام») پاسخِ واژه حساب نمی‌شود');
  ok(R[3][1].tool === 'insights.balance', 'یک سؤال مستقل («موجودیم چقدره») پاسخِ واژه حساب نمی‌شود');
  ok(R[4][1].args.text === 'بنزین' || (R[4][1].args.cats && R[4][1].args.cats[0] === 'transport'), '«فقط گلابتون» ← پاسخ «بنزین»: شرط مثبت با واژهٔ معتبر اجرا می‌شود');
  // ۱۰) چیپ‌های پیشنهادی خودِ سؤالِ کامل‌اند و اجرا می‌شوند
  const C = (await ask(['خرج این ماه بدون بنزینی']))[0];
  ok(!isAsk(C) || C.sug.length > 0, 'غلط تایپیِ نزدیک به واژهٔ دادهٔ شما یا اصلاح می‌شود یا چیپ پیشنهاد می‌دهد');
  const chip = (S[0].sug || [])[0];
  if (chip) { const R2 = (await ask([chip]))[0]; ok(R2.tool === 'transactions.aggregate' && R2.args.month === 8 && !NUM.test(R2.text) === false, 'زدن چیپِ تأیید («' + chip + '»): سؤال کامل اجرا می‌شود'); } else ok(false, 'چیپ تأیید وجود دارد');
  // ۱۱) جست‌وجوی صریح با واژهٔ نبوده: «پیدا نکردم» درست است
  const E = (await ask(['سرچ کن قناری']))[0];
  ok(E.tool === 'transactions.search' && /پیدا نکردم/.test(E.text), 'جست‌وجوی صریح: واژهٔ نبوده «پیدا نکردم» می‌دهد، نه سؤال');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1436: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
