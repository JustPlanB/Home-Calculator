// ۱.۴.۳۹ — دستیار: حافظهٔ گفتگو (آبان چطور؟)، «امروز» واقعی (نه سال انتخاب‌شده)، رفتن به بخش‌های نرم‌افزار و تم،
// بازگشت به گفتگو با بک، نمودار، کارت‌های قابل‌کلیک، حباب‌های دوطرفه با متن قابل‌انتخاب، و ردیف‌شدن کادر ورودی.
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
  const R = await page.evaluate(async () => {
    const o = {}, ask = (q) => hkAsstAsk(q), ar = (q) => hkAsstParse(q);
    /* حافظه */
    const a1 = ask('درآمد آذرم چقدر بوده؟'), a2 = ask('آبان چطور؟'), a3 = ask('پارسال چی؟'), a4 = ask('اسنپ چی؟');
    o.mem = [a1.cmd.args, a2.cmd.args, a3.cmd.args, a4.cmd.args]; o.memTool = a2.cmd.tool;
    o.fresh = ask('هزینه دی چقدره؟').cmd.args;       /* پرسش تازهٔ کامل، با حافظه قاطی نمی‌شود */
    /* امروز واقعی */
    const real = hkAsstCY(), rm = hkAsstCM(); const sy = currentYear; currentYear = real - 1;
    o.real = real; o.p1 = ar('تراکنشهای آذر رو نشون بده').args; o.p2 = ar('آبان امسال چند اسنپ گرفتم؟').args; o.p3 = ar('امسال چقدر خرج کردم').args; o.p4 = ar('پارسال چقدر خرج کردم').args;
    o.p5 = ar('سال بعد چقدر خرج می‌کنم؟').tool; currentYear = sy;
    /* سؤال‌های نفهمیده‌ی قبلی */
    o.u = ['آبان چند تا اسنپ گرفتم؟', 'آبان امسال چند اسنپ گرفتن؟', 'تعداد اسنپهای آبان امسال چند تاست؟'].map(q => { const c = ar(q); return [c.tool, c.args.text, c.args.month]; });
    o.date = ask('تاریخ و روز رو بگو').text;
    /* رفتن به بخش‌ها */
    window.__nav = [];
    window.openPrefsModal = () => window.__nav.push('prefs'); window.openDongModal = (g) => window.__nav.push('dong:' + (g || '')); window.switchTabFromMenu = (t) => window.__nav.push('tab:' + t);
    window.openUserRemindersModal = () => window.__nav.push('rem'); window.openHelpModal = () => window.__nav.push('help');
    o.n = ['برو به شخصی سازی', 'بروبه شحصی سازی', 'برو به منوی شخصی‌سازی', 'برو به شخصی سازی قسمت دسته ها', 'دنگ رو باز کن', 'برو به قرض', 'یادآورها رو باز کن'].map(q => ask(q).text);
    await new Promise(r => setTimeout(r, 900));
    o.nav = window.__nav.slice();
    o.navNo = ask('برو به قسمت ناشناخته‌ای').text;
    /* تم */
    o.th1 = ask('تم روز رو فعال کن').text; o.t1 = document.documentElement.getAttribute('data-theme');
    o.th2 = ask('حالت شب رو فعال کن').text; o.t2 = document.documentElement.getAttribute('data-theme');
    /* نمودار */
    const ch = ar('نمودار مخارج آبان رو بده'); o.ch = [ch.tool, ch.args.tab, ch.args.by, ch.args.month];
    const ch2 = ar('نمودار روزانه این ماه'); o.ch2 = [ch2.tool, ch2.args.by];
    const ch3 = ar('نمودار درآمد امسال'); o.ch3 = [ch3.tool, ch3.args.by, ch3.args.tab];
    return o;
  });
  ok(R.mem[0].month === 9 && R.mem[0].tab === 'income', 'سؤال اول: درآمد آذر');
  ok(R.mem[1].month === 8 && R.mem[1].tab === 'income' && R.memTool === 'transactions.aggregate', '«آبان چطور؟» ← درآمد آبان (نوع از سؤال قبل یادش می‌ماند)');
  ok(R.mem[2].tab === 'income' && R.mem[2].year === R.real - 1 && R.mem[2].month == null, '«پارسال چی؟» ← درآمد پارسال');
  ok(R.mem[3].tab === 'income' && R.mem[3].text === 'اسنپ' && R.mem[3].year === R.real - 1, '«اسنپ چی؟» ← درآمد اسنپ همان سال');
  ok(R.fresh.tab === 'expense' && R.fresh.month === 10, 'پرسش کامل تازه با حافظه قاطی نمی‌شود');
  ok(R.p1.year === R.real && R.p1.month === 9, 'ماه بی‌سال: سال واقعی امروز، نه سالی که در منو انتخاب شده (' + R.p1.year + ')');
  ok(R.p2.year === R.real && R.p2.month === 8 && R.p2.text === 'اسنپ', '«آبان امسال چند تا اسنپ گرفتم» ← امسالِ واقعی');
  ok(R.p3.year === R.real && R.p4.year === R.real - 1 && R.p5 !== undefined, '«امسال» و «پارسال» و «سال بعد» از امروز واقعی حساب می‌شوند');
  ok(R.u.every(x => x[0] === 'transactions.aggregate' && x[1] === 'اسنپ' && x[2] === 8), 'سؤال‌های نفهمیدهٔ اسنپ حالا فهمیده می‌شوند ' + JSON.stringify(R.u));
  ok(/[۰-۹]/.test(R.date) && /شنبه|جمعه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه/.test(R.date), '«تاریخ و روز رو بگو»: تاریخ و نام روز');
  ok(R.nav.join() === 'prefs,prefs,prefs,prefs,dong:,tab:ledger,rem', 'برو به … : شخصی‌سازی (با غلط‌تایپی و «قسمت دسته‌ها»)، دنگ، قرض، یادآور باز می‌شوند ← ' + R.nav.join());
  ok(/نشناختم/.test(R.navNo), 'بخش ناشناخته: جواب روشن');
  ok(R.t1 === 'light' && R.t2 === 'dark', 'تم روز/شب با دستور فعال می‌شود');
  ok(R.ch[0] === 'insights.chart' && R.ch[1] === 'expense' && R.ch[2] === 'cat' && R.ch[3] === 8 && R.ch2[1] === 'day' && R.ch3[1] === 'month' && R.ch3[2] === 'income', 'نمودار: نوع و ماه و شیوه (دسته/روز/ماه) درست تشخیص داده می‌شود');

  /* نمودار و کارت‌ها در پنجره */
  const U = await page.evaluate(async () => {
    const o = {};
    window.hkAsstRows = () => [['food', 'خوراکی', 3200000], ['transport', 'اسنپ', 1800000], ['bills', 'قبض برق', 900000]].map(([c, t, a], i) => ({ id: 'r' + i, key: '1405-8', y: 1405, m: 8, d: 3 + i, dateKey: 14050803 + i, tab: 'expense', section: 'روزمره', secId: 's', idx: i, desc: t, amount: a, account: 'ملی', status: 'paid', transfer: false, cats: [c], context: 'personal', subjectId: '', subject: '', current: false }));
    window.ledgerPairNets = () => [{ debtor: 'سعید', creditor: 'من', amount: 5000000 }];
    window.hkDongLoad = () => ({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'سارا' }], expenses: [{ id: 'e', amount: 100000, payer: 'a', shares: { a: 50000, b: 50000 } }], settles: [] }] });
    hkAsstOpen(); _hkAsstLog = []; document.querySelector('.hk-asst-log').textContent = '';
    ['نمودار مخارج آبان', 'قرض‌هام چقدره', 'دنگ هرکی رو بگو'].forEach(q => { hkAsstAppend({ role: 'user', kind: 'text', text: q }); hkAsstAppend(hkAsstAsk(q)); });
    await new Promise(r => setTimeout(r, 200));
    const sheet = document.querySelector('.hk-asst-sheet').getBoundingClientRect();
    const me = document.querySelector('.hk-asst-me .hk-asst-bub').getBoundingClientRect(), bot = document.querySelector('.hk-asst-bot .hk-asst-bub').getBoundingClientRect();
    o.donut = !!document.querySelector('.hk-asst-donut') && document.querySelectorAll('.hk-asst-leg').length === 3;
    o.cards = document.querySelectorAll('.hk-asst-card').length;
    o.noAv = document.querySelectorAll('.hk-asst-av').length === 0;
    o.sideMe = me.right > sheet.width - 40 && me.left > sheet.width * 0.3; o.sideBot = bot.left < 40 && bot.right < sheet.width - 10;
    o.sel = getComputedStyle(document.querySelector('.hk-asst-me .hk-asst-bub')).userSelect === 'text' && getComputedStyle(document.querySelector('.hk-asst-bot .hk-asst-txt')).userSelect === 'text';
    const i = document.querySelector('.hk-asst-input').getBoundingClientRect(), v = document.querySelector('.hk-asst-vc').getBoundingClientRect(), f = document.querySelector('.hk-asst-field').getBoundingClientRect();
    o.align = [Math.round(i.top + i.height / 2), Math.round(v.top + v.height / 2), Math.round(f.top + f.height / 2)];
    o.title = document.querySelector('.hk-asst-head .hk-asst-title').textContent.trim();
    /* انتخاب و کپی: اسکریپت‌های سراسری نباید جلوی انتخاب متن حباب را بگیرند */
    const txt = document.querySelector('.hk-asst-bot .hk-asst-txt'), btn = document.querySelector('.hk-asst-card');
    const ev = (t, type) => { const e = new Event(type, { bubbles: true, cancelable: true }); t.dispatchEvent(e); return e.defaultPrevented; };
    o.selPrevented = [ev(txt, 'selectstart'), ev(txt, 'contextmenu')]; o.btnPrevented = btn ? ev(btn, 'selectstart') : null;
    const rg = document.createRange(); rg.selectNodeContents(txt); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg);
    await new Promise(r => setTimeout(r, 200)); o.selKept = String(window.getSelection()).length > 0; sl.removeAllRanges();
    /* کلیک کارت دنگ ← باز شدن دنگ و بازگشت با بک به گفتگو */
    window.__nav = []; window.openDongModal = (g) => window.__nav.push('dong:' + g);
    document.querySelector('.hk-asst-card').click(); /* اولین کارت: قرض */
    await new Promise(r => setTimeout(r, 1000));
    o.closedAfterGo = !document.querySelector('.hk-asst-sheet').classList.contains('open');
    o.ret = window.hkAsstReturnCheck(); o.reopen = document.querySelector('.hk-asst-sheet').classList.contains('open'); o.logKept = document.querySelectorAll('.hk-asst-msg').length;
    o.ret2 = window.hkAsstReturnCheck();
    return o;
  });
  ok(U.donut, 'نمودار مخارج: دایره‌ای با راهنمای رنگی');
  ok(U.cards >= 2, 'قرض و دنگ به‌صورت کارت قابل‌کلیک نمایش داده می‌شوند (' + U.cards + ')');
  ok(U.noAv, 'عکس دو طرف چت برداشته شده');
  ok(U.sideMe && U.sideBot, 'حباب کاربر سمت راست و حباب دستیار سمت چپ');
  ok(U.sel && U.selPrevented.join() === 'false,false' && U.btnPrevented === true && U.selKept, 'انتخاب متن حباب‌ها واقعاً کار می‌کند: selectstart و contextmenu مسدود نیست، انتخاب باقی می‌ماند؛ دکمه‌ها همچنان انتخاب‌نشدنی‌اند');
  ok(Math.abs(U.align[0] - U.align[1]) <= 1 && Math.abs(U.align[1] - U.align[2]) <= 1, 'دکمهٔ ویس هم‌مرکز کادر و خط نوشتن است ' + U.align.join('/'));
  ok(U.title === 'دستیار', 'عنوان فقط «دستیار» است');
  ok(U.closedAfterGo && U.ret === true && U.reopen && U.logKept >= 6 && U.ret2 === false, 'زدن کارت ← رفتن به بخش؛ بک ← برگشت به همان گفتگو با پیام‌های قبلی (فقط یک بار)');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.join('|'));
  await b.close();
  console.log('batch-1430: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
