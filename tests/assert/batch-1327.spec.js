// نسخهٔ ۱.۳.۲۷: خواندن مقاوم پیامک‌ها (شمارهٔ حساب کامل، اطلاعیه، شمارهٔ شخصی، پیامک تکراری، زنجیرهٔ مانده)،
// موجودی اول ماه فقط از پیامک تازه، مقایسهٔ یکدست ردیف‌ها + توضیح در خلاصه، و اصلاحات ظاهری
// (منوی کشویی رو به بالا، «همه»، خلاصه وسط صفحه، فیلترهای جستجو، بسته شدن نرم). فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

/* متن پیامک‌های سپه به همان شکلی که بانک می‌فرستد (شماره و مبلغ‌ها ساختگی) */
const ACC = '3130100000128';
const sepah = {
  salary: 'بانک سپه\nپرداخت گروهي\nحساب:' + ACC + '\nمبلغ:112,984,427\nمانده:144,882,752\nزمان:1404/6/30\nواريز گروهي حقوق',
  paya: 'بانک سپه\nبرداشت از:' + ACC + '\nمبلغ:140,000,000ريال\nزمان:11:43-1404/7/2\nمانده:4,868,752\nانتقال وجه پايا',
  sood: (a, b, d) => 'بانک سپه\nواريز سود به: ' + ACC + '\nمبلغ: ' + a + 'ريال\nزمان: 2:36-' + d + '\nمانده: ' + b + 'ريال',
  notice: 'بانک سپه\nمشتري گرامي مبلغ 600,000 ريال بابت هزينه ي پيامک نيمه دوم سال 1404 و نيمه اول سال 1405 از حساب شماره ' + ACC + ' برداشت مي گردد.',
  fee: 'بانک سپه\nبرداشت:600,000\nحساب :' + ACC + '\nمانده:4,538,525\n7/21-15:23\nبرداشت کارمزد سرويس پيامک'
};

async function page(b, inbox) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox)}.sort((a, b) => b.date - a.date);
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };` });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  return p;
}
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const mk = (body, ts, addr) => ({ address: addr || 'Sepah Bank', date: ts, body });

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- الف) خواندن پیامک ---------- */
  const A = await page(b, []); A.on('pageerror', e => errors.push(e.message));
  await A.goto(INDEX); await A.waitForTimeout(1600);
  console.log('• خواندن پیامک');
  const rd = await A.evaluate(({ s, acc }) => ({
    acc4: [s.salary, s.paya, s.sood('21,456', '5,095,340', '1405/5/20'), s.fee].map(hkSmsAcc4),
    ref: hkSmsAcc4('بانک ملت\nخرید 250,000\nشماره پیگیری 1234567890123\nمانده 900,000'),
    amtNoComma: hkSmsAcc4('بانک ملی\nمبلغ:1129844270\nمانده 5,000'),
    notice: hkIsSmsNotice(s.notice, parseBankSms(s.notice)),
    feeNotice: hkIsSmsNotice(s.fee, parseBankSms(s.fee)),
    personal: ['09121234567', '+989121234567', '989351112233', 'Sepah Bank', '+98700', '30007123', '021-8888'].map(hkIsPersonalSender)
  }), { s: { salary: sepah.salary, paya: sepah.paya, sood: null, notice: sepah.notice, fee: sepah.fee }, acc: ACC }).catch(async () => null);
  /* sood تابع است؛ جداگانه */
  const rd2 = await A.evaluate((list) => list.map(hkSmsAcc4), [sepah.salary, sepah.paya, sepah.sood('21,456', '5,095,340', '1405/5/20'), sepah.fee]);
  const rd3 = await A.evaluate(({ notice, fee }) => ({
    ref: hkSmsAcc4('بانک ملت\nخرید 250,000\nشماره پیگیری 1234567890123\nمانده 900,000'),
    amtNoComma: hkSmsAcc4('بانک ملی\nمبلغ:1129844270\nمانده 5,000'),
    notice: hkIsSmsNotice(notice, parseBankSms(notice)),
    fee: hkIsSmsNotice(fee, parseBankSms(fee)),
    personal: ['09121234567', '+989121234567', '989351112233', 'Sepah Bank', '+98700', '30007123', '021-8888'].map(hkIsPersonalSender)
  }), { notice: sepah.notice, fee: sepah.fee });
  ok(rd2.every(x => x === '0128'), 'رقم‌های حساب از هر چهار شکل پیامک سپه خوانده شد (' + rd2.join('،') + ')');
  ok(rd3.ref === '' && rd3.amtNoComma === '', 'شمارهٔ پیگیری و مبلغِ بی‌کاما شمارهٔ حساب حساب نمی‌شوند');
  ok(rd3.notice === true && rd3.fee === false, '«… برداشت می‌گردد» اطلاعیه است؛ پیامک اصلی کارمزد تراکنش است');
  ok(JSON.stringify(rd3.personal) === JSON.stringify([true, true, true, false, false, false, false]), 'شمارهٔ موبایل شخصی از فرستندهٔ بانک جدا شد');

  const live = await A.evaluate(({ fee, notice }) => {
    window.cancelNativeSmsNotification = window.cancelNativeSmsNotification || function () {};
    return { personal: window.onBankSmsReceived(fee, { nid: 0, sender: '09121234567' }), notice: window.onBankSmsReceived(notice, { nid: 0, sender: 'Sepah Bank' }) };
  }, { fee: sepah.fee, notice: sepah.notice });
  ok(live.personal === false && live.notice === false, 'پیامک لحظه‌ای از شمارهٔ شخصی یا اطلاعیه، باکس ثبت تراکنش باز نمی‌کند');

  /* ---------- ب) حساب قدیمی سپه با همهٔ پیامک‌ها ---------- */
  console.log('• حساب قدیمی سپه');
  const inboxB = [
    mk(sepah.salary, T(2025, 9, 21)), mk(sepah.paya, T(2025, 9, 24)),
    mk(sepah.sood('20,676', '4,889,428', '1404/7/20'), T(2025, 10, 12)),
    mk(sepah.sood('21,456', '5,095,340', '1405/5/20'), T(2026, 8, 11)),
    mk(sepah.notice, T(2026, 10, 13, 6)), mk(sepah.fee, T(2026, 10, 13, 7)),
    mk(sepah.fee, T(2026, 10, 13, 7) + 30000, '09121234567'),                       /* فوروارد همان پیامک از شمارهٔ شخصی */
    mk('بانک ملت\nبرداشت 1,000,000\nحساب 0000***7777\nمانده 9,000,000', T(2026, 10, 10), '09351112233')   /* پیامک شخصی دیگر */
  ];
  const B = await page(b, inboxB); B.on('pageerror', e => errors.push(e.message));
  await B.goto(INDEX); await B.waitForTimeout(1600);
  const rb = await B.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bs', bank: 'بانک سپه', label: 'سپه', openingBalance: 14488275, createdAt: { y: 1404, m: 1, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:0128'] = 'سپه'; saveSmsAccountBankMap();
    openSmsBulkModal(); await w(150); await hkBulkRead(); await w(1000);
    const cards = [...document.querySelectorAll('.hk-bulk-folder')].map(c => ({ name: c.querySelector('.hk-bulk-fname').textContent, personal: c.classList.contains('personal'), on: c.classList.contains('on'), tag: (c.querySelector('.hk-bulk-ptag') || {}).textContent || '', v: c.querySelector('.hk-bulk-dsel').getValue() }));
    const fo = _hkBulk.folders.find(f => !f.personal);
    const allTx = fo ? fo.all.length : 0;
    document.querySelector('.hk-bulk-allchk').click(); await w(80);
    const onAfterAll = [...document.querySelectorAll('.hk-bulk-folder')].map(c => c.classList.contains('on'));
    document.querySelector('.hk-bulk-ok').click(); await w(700);
    const sum = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
    const ov = document.getElementById('smsBulkOv');
    const rows = []; periodData.expense.sections.forEach(s => s.rows.forEach(r => r.amount && rows.push(r.day + ':' + r.amount + ':' + r.account)));
    return { cards, allTx, onAfterAll, sum, rows, bal: globalAccountBalances()['سپه'], open: (periodData.accountOpeningInstant || {})['سپه'], center: ov && ov.classList.contains('hk-bulk-center') && getComputedStyle(ov).alignItems };
  });
  const bank = rb.cards.filter(c => !c.personal), pers = rb.cards.filter(c => c.personal);
  ok(bank.length === 1 && bank[0].v === 'سپه' && rb.allTx === 5, 'همهٔ پیامک‌های این حساب (حقوق، پایا، سودها، کارمزد) در یک پوشه؛ اطلاعیه کنار رفت (' + rb.allTx + ' پیامک)');
  ok(pers.length === 1 && /شمارهٔ شخصی/.test(pers[0].tag) && pers[0].v === '' && !pers[0].on, 'پیامک شمارهٔ شخصی: پوشهٔ جدا با برچسب «از شمارهٔ شخصی، نه بانک»، بی‌حساب و بی‌تیک؛ فوروارد همان پیامک بانک حذف شد');
  ok(rb.onAfterAll.filter(Boolean).length === 1 && rb.onAfterAll[rb.cards.findIndex(c => !c.personal)], '«همه» فقط پوشه‌های بانک را انتخاب می‌کند');
  ok(rb.open === 513853 && rb.bal === 453853, 'موجودی اول مهر از پیامک همین ماه (۵۱۳٬۸۵۳)، نه حقوق ۱۴۰۴؛ موجودی = ماندهٔ آخرین پیامک (' + rb.bal + ')');
  ok(rb.rows.filter(r => /^21:60000:سپه/.test(r)).length === 1, 'کارمزد فقط یک بار ثبت شد (اطلاعیه ثبت نشد)');
  ok(/پیامک اطلاع‌رسانی/.test(rb.sum) && /یکی است ✓/.test(rb.sum), 'خلاصه: اطلاعیهٔ نادیده‌گرفته و «موجودی با پیامک بانک یکی است ✓»');
  ok(rb.center === 'center', 'کارت خلاصه وسط صفحه');

  /* ---------- ج) پیامکِ کهنه: موجودی دست نخورد ---------- */
  console.log('• پیامک کهنه، پیامک تکراری، مقایسهٔ یکدست');
  const inboxC = [
    mk(sepah.salary, T(2025, 9, 21)),
    mk('بانک سپه\nبرداشت:600,000\nحساب :' + ACC + '\nکارمزد', T(2026, 10, 13, 7)),
    /* ملت: یک خرید دو بار پیامک شده (همان مبلغ، ماندهٔ تغییرنکرده) */
    mk('بانک ملت\nبرداشت 2,000,000\nحساب 0000***5555\nمانده 8,000,000', T(2026, 10, 5, 8)),
    mk('بانک ملت\nبرداشت 2,000,000\nحساب 0000***5555\nمانده 8,000,000', T(2026, 10, 5, 9)),
    mk('بانک ملت\nبرداشت 1,000,000\nحساب 0000***5555\nمانده 7,000,000', T(2026, 10, 9, 8)),
    mk('بانک ملت\nواریز 500,000\nحساب 0000***5555\nمانده 6,500,000', T(2026, 10, 11, 8))   /* «واریز» ولی مانده کم شده → برداشت */
  ];
  const C = await page(b, inboxC); C.on('pageerror', e => errors.push(e.message));
  await C.goto(INDEX); await C.waitForTimeout(1600);
  const rc = await C.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bs', bank: 'بانک سپه', label: 'سپه', openingBalance: 500000, createdAt: { y: 1404, m: 1, d: 1 } },
      { id: 'bm', bank: 'بانک ملت', label: 'ملت ۵۵۵۵', openingBalance: 0, createdAt: { y: 1404, m: 1, d: 1 } });
    saveBankAccountsSelection();
    smsAccountBankMap['L4:0128'] = 'سپه'; smsAccountBankMap['L4:5555'] = 'ملت ۵۵۵۵'; saveSmsAccountBankMap();
    const R = (d, desc, a, acc) => Object.assign(emptyRow('expense'), { day: d, desc, amount: a, status: 'paid', account: acc });
    /* روز با رقم فارسی و نام حساب با نیم‌فاصله/«ي» عربی → باز هم همان تراکنش؛ و یک ردیف با حساب دیگر برای توضیح */
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [R('۱۳', 'لباس', 200000, 'ملت‌ ۵۵۵۵'), R('17', 'کتاب', 100000, 'ملي ۵۵۵۵')] }];
    persistCurrent(); saveArchive();
    openSmsBulkModal(); await w(150); await hkBulkRead(); await w(1000);
    const mel = _hkBulk.folders.find(f => f.acc4 === '5555');
    const info = { n: mel.inRange.length, last: mel.inRange[mel.inRange.length - 1].type, unsure: mel.unsure, dup: mel.dupSms };
    document.querySelector('.hk-bulk-allchk').click(); await w(80);
    document.querySelector('.hk-bulk-ok').click(); await w(700);
    const sum = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
    const rows = periodData.expense.sections[0].rows.filter(r => r.amount).map(r => r.day + ':' + r.amount + ':' + r.account + ':' + (r.desc || '-'));
    return { info, sum, rows, sepahBal: globalAccountBalances()['سپه'], sepahOpen: (periodData.accountOpeningInstant || {})['سپه'] };
  });
  ok(rc.sepahOpen == null && rc.sepahBal === 440000 && /موجودی «سپه» از پیامک‌ها معلوم نشد/.test(rc.sum), 'فقط پیامک مانده‌دارِ کهنه (۱۴۰۴) → موجودی حساب دست نخورد و در خلاصه گفته شد (' + rc.sepahBal + ')');
  ok(rc.info.dup === 1 && rc.info.n === 3 && /پیامک تکراریِ بانک/.test(rc.sum), 'پیامک دوبارهٔ همان خرید (ماندهٔ تغییرنکرده) نادیده گرفته شد');
  ok(rc.info.last === 'expense', '«واریز»ی که مانده را کم کرده، با زنجیرهٔ مانده برداشت شناخته شد');
  ok(rc.rows.some(r => /^13:200000:ملت ۵۵۵۵:لباس$/.test(r)) && rc.rows.filter(r => /^13:200000:/.test(r)).length === 1, 'ردیف با روز فارسی و نیم‌فاصله همان تراکنش شناخته و به شکل درست اصلاح شد');
  ok(/ردیف «کتاب» شبیه بود ولی نام حسابش «ملي ۵۵۵۵» بود/.test(rc.sum), 'خلاصه می‌گوید ردیف شبیه چه فرقی داشت');

  /* ---------- د) ظاهر ---------- */
  console.log('• ظاهر');
  const inboxD = [];
  for (let i = 0; i < 9; i++) inboxD.push(mk('بانک ملت\nبرداشت 10,000\nحساب 0000***' + (1000 + i) + '\nمانده ' + (900000 - i * 1000).toLocaleString('en'), T(2026, 10, 3 + i)));
  const D = await page(b, inboxD); D.on('pageerror', e => errors.push(e.message));
  await D.goto(INDEX); await D.waitForTimeout(1600);
  const rdUi = await D.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    openSmsBulkModal(); await w(150); await hkBulkRead(); await w(1000);
    const list = document.getElementById('hkBulkList'), all = list.querySelector('.hk-bulk-all');
    out.sticky = getComputedStyle(all).position;
    list.scrollTop = 99999; await w(100);
    out.allTopStays = Math.abs(all.getBoundingClientRect().top - list.getBoundingClientRect().top) < 2;
    const cards = [...list.querySelectorAll('.hk-bulk-folder')], last = cards[cards.length - 1];
    /* منوی حسابِ آخرین پوشه پایین صفحه → رو به بالا */
    const btn = last.querySelector('.hk-bulk-dsel .dark-select-btn'); btn.click(); await w(80);
    const dl = last.querySelector('.hk-bulk-dsel')._list, br = btn.getBoundingClientRect(), lr = dl.getBoundingClientRect();
    out.up = dl.classList.contains('dl-up'); out.inView = lr.top >= 0 && lr.bottom <= innerHeight + 1 && lr.bottom <= br.top + 1;
    out.toggledByDsel = last.classList.contains('open');
    closeDarkSelects(); await w(50);
    /* زدن روی متن کارت (نه فقط عنوان) → باز؛ بستن بدون پرش آخر */
    const c0 = cards[0]; c0.querySelector('.hk-bulk-fmeta').click(); await w(560);
    out.openByMeta = c0.classList.contains('open');
    c0.querySelector('.hk-bulk-fmeta').click();
    let lastOpen = null, firstClosed = null;
    const t0 = performance.now();
    while (performance.now() - t0 < 900 && firstClosed == null) { await new Promise(r => requestAnimationFrame(r)); const h = c0.getBoundingClientRect().height; if (c0.classList.contains('open')) lastOpen = h; else firstClosed = h; }
    const maxStep = Math.abs((firstClosed || 0) - (lastOpen || 0));
    out.closed = !c0.classList.contains('open'); out.maxStep = Math.round(maxStep * 10) / 10;
    closeSmsBulkModal();
    return out;
  });
  ok(rdUi.sticky === 'sticky' && rdUi.allTopStays, '«همه» بالای فهرست ثابت می‌ماند و پوشه‌ها زیرش اسکرول می‌شوند');
  ok(rdUi.up && rdUi.inView, 'منوی حسابِ پوشهٔ پایین صفحه رو به بالا و کامل در صفحه باز شد');
  ok(!rdUi.toggledByDsel && rdUi.openByMeta, 'زدن هر جای کارت پوشه ریز تراکنش‌ها را باز می‌کند (منوی حساب نه)');
  ok(rdUi.closed && rdUi.maxStep < 4, 'بسته شدن پوشه تا آخر نرم، بدون پرش لحظهٔ آخر (' + rdUi.maxStep + 'px)');

  const ui2 = await A.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    /* فیلترهای جستجو */
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' })] }];
    persistCurrent(); renderAll();
    openPersonDetail('سارا', 'balance'); await w(400);
    const cells = [...document.querySelectorAll('#balanceFixedHeader .bsr-cell:not(.bsr-desc)')];
    out.widths = cells.map(c => Math.round(c.getBoundingClientRect().width));
    out.labelsInside = cells.every(c => { const l = c.querySelector('.balance-acc-label').getBoundingClientRect(), r = c.getBoundingClientRect(); return l.left >= r.left && l.right <= r.right && getComputedStyle(c.querySelector('.balance-acc-label')).position === 'absolute'; });
    out.names = cells.map(c => c.querySelector('.balance-acc-label').textContent);
    out.desc = !!document.querySelector('#balanceFixedHeader .bsr-desc #balanceSearchInput') && getComputedStyle(document.querySelector('.bsr-desc .balance-acc-label')).position !== 'absolute';
    closePersonDetail(); await w(200);
    return out;
  });
  ok(new Set(ui2.widths).size === 1 && ui2.widths.length === 8, 'هشت فیلتر جستجو هم‌اندازه (' + ui2.widths[0] + 'px)');
  /* از ۱.۳.۲۹ اسم فیلتر به‌جای برچسب جدا، متن خود باکس است (batch-1329) */
  ok(ui2.names.join('،') === 'بخش،نوع،ماه،روز،حساب،دسته،مبلغ از،مبلغ تا', 'هشت فیلتر با اسم‌های درست؛ «مبلغ از» و «مبلغ تا» دو باکس جدا');
  ok(ui2.desc, 'ردیف «شرح» دست نخورده');

  const rec = await A.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* درآمد ثابت: «این ماه: …» موقع بسته شدن پیوسته بالا می‌آید و آخرش نمی‌پرد */
    const row = document.createElement('div'); row.className = 'recurring-row rec-open'; row.style.cssText = 'display:flex;padding:8px 10px;width:300px';
    row.innerHTML = '<div style="flex:1"><div class="rec-name">اجاره</div><div class="rec-more"><div style="margin-top:2px">۱۰٬۰۰۰ تومان</div><div style="margin-top:2px">بانک</div><div style="margin-top:2px">از ۱ مهر</div></div><div class="rec-status"><span>این ماه: دریافت شد</span></div><div class="rec-acts no-renew"><button class="rec-act">اصلاح</button></div></div>';
    document.body.appendChild(row);
    const st = () => row.querySelector('.rec-status').getBoundingClientRect().top - row.getBoundingClientRect().top;
    const s0 = st();
    hkSlideParts(row, () => [row.querySelector('.rec-more'), row.querySelector('.rec-acts.no-renew')], false, o => row.classList.toggle('rec-open', o));
    /* پرشِ لحظهٔ آخر = فاصلهٔ آخرین فریمِ قبل از بسته شدن تا اولین فریمِ بعدش */
    let lastOpen = null, firstClosed = null, mid = null; const t0 = performance.now();
    while (performance.now() - t0 < 900 && firstClosed == null) { await new Promise(r => requestAnimationFrame(r)); const v = st(); if (row.classList.contains('rec-open')) lastOpen = v; else firstClosed = v; if (mid == null && performance.now() - t0 > 200) mid = v; }
    const maxStep = Math.abs((firstClosed == null ? st() : firstClosed) - (lastOpen == null ? s0 : lastOpen));
    const out = { s0: Math.round(s0), mid: Math.round(mid), end: Math.round(st()), maxStep: Math.round(maxStep * 10) / 10, closed: !row.classList.contains('rec-open'), statusVisible: row.querySelector('.rec-status').getBoundingClientRect().bottom <= row.getBoundingClientRect().bottom + 1 };
    row.remove();
    /* عنوان باکس موجودی */
    out.label = /موجودی با احتساب پروژه/.test(document.documentElement.innerHTML.match(/ib-bd-personal-row[\s\S]{0,200}/) ? 'x' : '') || /'موجودی با احتساب پروژه'|>موجودی با احتساب پروژه</.test(String(updateHomeBalanceCircle) + document.body.innerHTML + [...document.scripts].map(s => s.textContent).join(''));
    return out;
  });
  ok(rec.mid < rec.s0 && rec.mid > rec.end && rec.maxStep < 4 && rec.closed && rec.statusVisible, 'درآمد ثابت: «این ماه» همراه باکس آرام بالا آمد و آخرش نپرید (' + rec.s0 + '→' + rec.mid + '→' + rec.end + '، پرش آخر ' + rec.maxStep + ')');
  ok(rec.label, 'باکس موجودی: «موجودی با احتساب پروژه»');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
