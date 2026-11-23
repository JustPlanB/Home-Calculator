// ۱.۴.۳۸ — دستیار: پاسخ به بخش‌های نرم‌افزار (قرض‌وطلب، دنگ، درآمد ثابت، یادآور، ردیف N، مقایسهٔ دو ماه، ده‌تای بزرگ)
// و سؤال دربارهٔ خود دستیار؛ فقط دادهٔ ساختگی. مدل محلی هرگز جواب قاعده‌ها را عوض نمی‌کند.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);
  const R = await page.evaluate(() => {
    const out = {}, ask = (q) => hkAsstAsk(q);
    /* خالی */
    out.emptyLedger = ask('قرض‌هام چقدره؟').text; out.emptyDong = ask('دنگ هرکی رو بگو').text;
    out.emptyRec = ask('درآمدهای ثابتم رو بگو').text; out.emptyRem = ask('یادآور دارم؟').text;
    /* دادهٔ ساختگی */
    window.ledgerPairNets = () => [{ debtor: 'سعید', creditor: 'من', amount: 5000000 }, { debtor: 'من', creditor: 'رضا', amount: 2000000 }];
    window.ledgerPeopleList = () => ['سعید', 'رضا'];
    window.hkDongLoad = () => ({ groups: [{ id: 'g', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'سارا' }], expenses: [{ id: 'e', amount: 100000, payer: 'a', shares: { a: 50000, b: 50000 } }], settles: [] }] });
    recurringIncomes.push({ id: 'r1', name: 'حقوق', amount: 30000000, day: 1 });
    userReminders.push({ id: 'u1', title: 'قسط بانک', d: 5, m: 9, y: 1405 });
    out.ledger = ask('قرض دایی سعید چقدره؟').text; out.ledgerAll = ask('به کی بدهکارم؟').text;
    out.dong = ask('دنگ هرکی رو بگو').text; out.rec = ask('درامد ثابتهام رو بگو').text; out.rem = ask('یادآور دارم؟').text;
    out.net = ask('تو به اینترنت وصلی؟').text; out.how = ask('چطور درامد دستی ثبت کنم؟').text;
    out.cmp = hkAsstParse('درآمد مهر بیشتر بوده یا آبان؟'); out.cmp2 = hkAsstParse('درآمد مهر و آبان رو مقایسه کن باهم');
    out.row = ask('ردیف ۱۰ مخارج آبان چیه؟').text; out.top = hkAsstParse('ده تا خرج بزرگم چی بوده؟');
    out.snap = hkAsstParse('بابت اسنپ چقدر پول دادم؟'); out.cuss = ask('کسخلی؟').text;
    out.read = JSON.stringify(Object.keys(HK_ASST_TOOLS).filter(n => /^insights\.(ledger|dong|recincome|reminders|row)$/.test(n) && HK_ASST_TOOLS[n].readOnly));
    return out;
  });
  ok(/ثبت نشده|تسویه/.test(R.emptyLedger) && /دنگ/.test(R.emptyDong) && /ثابت/.test(R.emptyRec) && /یادآور/.test(R.emptyRem), 'بدون داده: هر بخش جواب روشن می‌دهد');
  ok(/سعید/.test(R.ledger) && /[۵5][,٬]?[۰0]{3}[,٬]?[۰0]{3}/.test(R.ledger) && !/رضا/.test(R.ledger), 'قرض سعید: فقط حساب همان فرد');
  ok(/سعید/.test(R.ledgerAll) && /رضا/.test(R.ledgerAll), 'بدون نام: همهٔ قرض‌وطلب‌ها');
  ok(/سفر/.test(R.dong) && /علی|سارا/.test(R.dong), 'دنگ: گروه و پرداخت لازم');
  ok(/حقوق/.test(R.rec), 'درآمد ثابت: فهرست درآمدهای ثابت (نه هزینهٔ تکراری)');
  ok(/قسط بانک/.test(R.rem), 'یادآورها فهرست می‌شوند');
  ok(/گوشی|بیرون|اینترنت/.test(R.net), 'سؤال اینترنت: جواب دربارهٔ خود دستیار');
  ok(/ثبت درآمد|صفحهٔ درآمد/.test(R.how) && /ببرمت/.test(R.how), 'سؤال آموزشی: اول توضیح می‌دهد، بعد پیشنهاد می‌کند به همان بخش ببرد');
  const nav = await page.evaluate(async () => {
    const o = {}; window.__nav = [];
    window.openPersonDetail = (t, k) => window.__nav.push('person:' + k); window.openDongModal = () => window.__nav.push('dong'); window.openHelpModal = () => window.__nav.push('help');
    const a = hkAsstAsk('چطور درامد دستی ثبت کنم؟'); o.chips = a.suggestions; o.raw = a.chipRaw;
    const b = hkAsstAsk('آره ببر'); o.go = b.text;
    await new Promise(r => setTimeout(r, 450)); o.after1 = window.__nav.slice();
    hkAsstAsk('چطور یه دنگ بسازم؟'); const c = hkAsstAsk('نه ممنون'); o.no = c.text; await new Promise(r => setTimeout(r, 400)); o.after2 = window.__nav.slice();
    const d = hkAsstAsk('دنگ رو باز کن'); await new Promise(r => setTimeout(r, 450)); o.direct = d.text; o.after3 = window.__nav.slice();
    hkAsstAsk('چطور یه ردیف رو حذف کنم؟'); hkAsstAsk('اوکی'); await new Promise(r => setTimeout(r, 450)); o.after4 = window.__nav.slice();
    o.head = hkAsstAsk('جمع مخارج آبان').text;
    return o;
  });
  ok(nav.raw === true && nav.chips.length === 2, 'پیشنهاد هدایت با دو دکمهٔ آره/نه');
  ok(nav.after1.join() === 'person:income', 'با «آره»، صفحهٔ ثبت درآمد باز می‌شود');
  ok(nav.after2.join() === 'person:income', 'با «نه»، چیزی باز نمی‌شود');
  ok(nav.after3.join() === 'person:income,dong', '«دنگ رو باز کن» مستقیم باز می‌کند');
  ok(nav.after4.join() === 'person:income,dong,help', 'سؤال آموزشی بی‌بخش مشخص: با تأیید راهنما باز می‌شود');
  ok(!/فهمیدم/.test(nav.head), 'خط تفسیر بدون «فهمیدم»');
  ok(R.cmp.tool === 'reports.compare' && R.cmp.args.a.month === 7 && R.cmp.args.b.month === 8 && R.cmp.args.tab === 'income', '«مهر بیشتر بوده یا آبان» دو ماه را مقایسه می‌کند');
  ok(R.cmp2.tool === 'reports.compare' && R.cmp2.args.a.month === 7 && R.cmp2.args.b.month === 8, '«مقایسه کن باهم» ماه‌های درست را می‌گیرد');
  ok(/ردیف/.test(R.row), '«ردیف ۱۰» ردیف است نه مبلغ');
  ok(R.top.tool === 'transactions.search' && R.top.args.limit === 10 && R.top.args.sort === 'amountDesc', '«ده تا خرج بزرگم» ده بزرگ‌ترین');
  ok(R.snap.tool === 'transactions.aggregate' && R.snap.args.text === 'اسنپ' && R.snap.args.tab === 'expense', '«بابت اسنپ پول دادم» فقط اسنپ را می‌جوید');
  ok(R.cuss && R.cuss.length > 5, 'فحش با آرامش جواب داده می‌شود');
  ok(JSON.parse(R.read).length === 5, 'همهٔ ابزارهای تازه فقط‌خواندنی‌اند');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.join('|'));
  await b.close();
  console.log('batch-1428: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
