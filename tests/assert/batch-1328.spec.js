// نسخهٔ ۱.۳.۲۸: پیامک‌های بی‌کلمهٔ آشنا (قبض برق)، موجودی اول هر ماهِ بازه از پیامک، شناختن خودکار پرداخت قسط
// (اعلان لحظه‌ای و ثبت گروهی، با دیرکرد)، جمع شدن بازه، بسته شدن منوی کشویی با هر لمس/اسکرول، پوشهٔ شخصی نارنجی، «انصراف». فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts, addr) => ({ address: addr || 'Bank Melli', date: ts, body });

async function page(b, inbox) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox)}.sort((a, b) => b.date - a.date);
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };` });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  console.log('• دروازهٔ پیامک (بخش اندرویدی)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/t\.contains\("قبض"\)/.test(patch) && /if\(hasBalance && \(bankHint \|\| bankName \|\| senderBank\)\) return true;/.test(patch), 'قانون کلی «مانده + مبلغ + نشانهٔ بانک» و کلمه‌های قبض/سود/کارمزد/… در دروازهٔ اندرویدی');

  /* شهریور و مهر یک حساب ملی؛ پیامک قبض برق؛ و یک قسط با دیرکرد */
  const inbox = [
    melli('بانك ملي ايران\nقبض برق:22,122,000-\nحساب:62002\nمانده:70,567,867\n0606-19:41', T(2026, 8, 28)),          /* ۶ شهریور */
    melli('بانك ملي ايران\nبرداشت:5,000,000-\nحساب:62002\nمانده:65,567,867\n0620-10:00', T(2026, 9, 11)),           /* ۲۰ شهریور */
    melli('بانك ملي ايران\nبرداشت:1,000,000-\nحساب:62002\nمانده:64,567,867\n0705-10:00', T(2026, 9, 27)),           /* ۵ مهر */
    melli('بانك ملي ايران\nبرداشت:6,000,000-\nحساب:62002\nمانده:58,567,867\n0721-08:00', T(2026, 10, 13, 5))         /* ۲۱ مهر: قسط ۵۹۰ هزار + ۱۰ هزار دیرکرد */
  ];
  const p = await page(b, inbox); p.on('pageerror', e => errors.push(e.message));
  await p.goto(INDEX); await p.waitForTimeout(1600);

  console.log('• ثبت گروهی: قبض برق، موجودی اول شهریور، قسط');
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 7, d: 10 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    plans.push({ id: 'pl1', name: 'وام مسکن', count: 12, paidCount: 4, amount: 7080000 /* 590000 × 12 */, startYear: 1405, startMonth: 3, startDay: 20, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    try { syncPlansToExpenseAll(); } catch (e) {}
    persistCurrent(); saveArchive(); renderAll();
    const planRow0 = periodData.expense.sections[0].rows.find(x => x.fromPlanId === 'pl1');
    openSmsBulkModal(); await w(150);
    /* از ۱ شهریور */
    const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select');
    [...sels[1]._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === '6').click(); await w(50);
    await hkBulkRead(); await w(1000);
    const out = { planRow0: planRow0 ? { st: planRow0.status, amt: planRow0.amount, day: planRow0.day } : null };
    const wrap = ov.querySelector('.hk-bulk-rwrap'), bar = ov.querySelector('.hk-bulk-rbar');
    out.collapsed = getComputedStyle(wrap).display === 'none' && getComputedStyle(bar).display !== 'none'; out.bar = bar.textContent;
    const fo = _hkBulk.folders[0]; out.n = fo ? fo.inRange.length : 0; out.firstType = fo && fo.inRange[0].type; out.firstAmt = fo && fo.inRange[0].amount;
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(800);
    out.sum = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
    const pr = periodData.expense.sections[0].rows.filter(x => x.fromPlanId === 'pl1');
    out.planRows = pr.map(x => ({ st: x.status, amt: x.amount, desc: x.desc, day: x.day, acc: x.account }));
    out.paidCount = plans.find(x => x.id === 'pl1').paidCount;
    out.extra600 = periodData.expense.sections.reduce((n, s) => n + s.rows.filter(x => Number(x.amount) === 600000 && !x.fromPlanId).length, 0);
    out.shOpen = ((archive['1405-6'] || {}).accountOpeningInstant || {})['ملی'];
    out.mehrOpen = (periodData.accountOpeningInstant || {})['ملی'];
    out.bal = globalAccountBalances()['ملی'];
    navigateToPeriod(1405, 6); await w(200);
    out.shEnd = globalAccountBalances()['ملی'];
    navigateToPeriod(1405, 7); await w(200);
    document.querySelector('.hk-bulk-done') && document.querySelector('.hk-bulk-done').click();
    return out;
  });
  ok(r.n === 4 && r.firstType === 'expense' && r.firstAmt === 2212200, 'پیامک «قبض برق:22,122,000-» برداشت ۲٬۲۱۲٬۲۰۰ خوانده و در پوشه آمد');
  ok(r.collapsed && /بازه: ۱ شهریور تا ۲۱ مهر/.test(r.bar), 'بعد از خواندن، بازه جمع شد و نوار «' + r.bar.replace('✎', '').trim() + '» ماند');
  ok(r.shOpen === 9268987 && /موجودی اول شهریور ملی طبق پیامک‌ها تنظیم شد/.test(r.sum), 'موجودی اول شهریور از پیامک‌های همان ماه (۹٬۲۶۸٬۷۸۷) و گزارش در خلاصه');
  ok(r.shEnd === 6556787 && r.mehrOpen === 6556787, 'پایان شهریور = ماندهٔ آخرین پیامک شهریور = اول مهر (' + r.shEnd + ')');
  /* ۱.۳.۳۷: پیدا کردن خودکار قسط از ثبت گروهی برداشته شد → برداشت ۶۰۰ هزار ردیف معمولی است و قسط دست نمی‌خورد */
  /* ۱.۳.۴۶: اقساط خاموش؛ ردیف قسط ساخته نمی‌شود */ ok(r.planRows.every(x => x.acc !== 'ملی' && x.amt !== 600000), 'ردیف قسط به پیامک وصل نشد (پیدا کردن خودکار قسط برداشته شد)');
  ok(r.paidCount === 4 && r.extra600 === 1 && !/پرداخت قسط شناخته شد/.test(r.sum), 'برداشت ۶۰۰ هزار یک ردیف معمولی شد؛ شمار قسط‌های پرداخت‌شده همان ۴ ماند');
  ok(r.bal === 5856787, 'موجودی ملی = ماندهٔ آخرین پیامک (' + r.bal + ')');

  console.log('• اعلان لحظه‌ای: قسط خودکار انتخاب شود');
  const live = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pl = plans.find(x => x.id === 'pl1');
    /* قسط بعدی (۲۰ آبان) را زودتر، همین ماه با دیرکرد نه، با مبلغ برابر */
    plans.push({ id: 'pl2', name: 'وام خودرو', count: 10, paidCount: 2, amount: 12500000 /* 1250000 × 10 */, startYear: 1405, startMonth: 5, startDay: 18, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 2 });
    window.onBankSmsReceived('بانك ملي ايران\nبرداشت:12,500,000-\nحساب:62002\nمانده:46,067,867\n0721-12:00', { nid: 0, sender: 'Bank Melli' });
    await w(800);
    const seg = document.getElementById('smsExpenseSeg'), pick = document.getElementById('smsPlanPick');
    return { inst: seg && seg.querySelector('button.active') && seg.querySelector('button.active').dataset.mode, pick: pick && pick.value, meta: (document.getElementById('smsPlanPickMeta') || {}).textContent || '', rej: (document.getElementById('smsConfirmReject') || {}).textContent };
  });
  /* ۱.۳.۴۶: اقساط خاموش است → باکس دیگر روی «پرداخت قسط» باز نمی‌شود */ ok(live.inst !== 'installment' && !/قسط شناخته شد/.test(live.meta), 'اقساط خاموش: باکس ثبت پیامک روی «پرداخت قسط» باز نشد');
  ok(live.rej === 'انصراف', 'دکمهٔ «رد» حالا «انصراف» است');

  /* ---------- منوی کشویی، پوشهٔ شخصی ---------- */
  console.log('• منوی کشویی و پوشهٔ شخصی');
  const inbox2 = [];
  for (let i = 0; i < 6; i++) inbox2.push(melli('بانک ملت\nبرداشت 10,000\nحساب 0000***' + (1000 + i) + '\nمانده ' + (900000 - i * 1000).toLocaleString('en'), T(2026, 10, 3 + i), 'Bank Mellat'));
  inbox2.push(melli('بانک ملت\nبرداشت 1,000,000\nحساب 0000***7777\nمانده 9,000,000', T(2026, 10, 10), '+989351112233'));
  const q = await page(b, inbox2); q.on('pageerror', e => errors.push(e.message));
  await q.goto(INDEX); await q.waitForTimeout(1600);
  const u = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    openSmsBulkModal(); await w(150); await hkBulkRead(); await w(1000);
    const ov = document.getElementById('smsBulkOv');
    ov.querySelector('.hk-bulk-rbar').click(); await w(600);
    out.reopened = getComputedStyle(ov.querySelector('.hk-bulk-rwrap')).display !== 'none';
    const pc = document.querySelector('.hk-bulk-folder.personal');
    out.pColor = getComputedStyle(pc.querySelector('.hk-bulk-fname')).color;
    out.pIcon = pc.querySelector('.hk-bulk-fico svg circle').getAttribute('stroke');
    const bdi = pc.querySelector('.hk-bulk-ptag bdi'); out.bdi = bdi && getComputedStyle(bdi).direction; out.num = bdi && bdi.textContent;
    const open = () => { const btn = document.querySelector('.hk-bulk-dsel .dark-select-btn'); btn.click(); return document.querySelector('.dark-select-list.open'); };
    const list = document.getElementById('hkBulkList');
    out.o1 = !!open(); await w(50);
    /* شروع کشیدن برای اسکرول روی فهرست پوشه‌ها (لمس و نگه‌داشتن) */
    const lr = list.getBoundingClientRect();
    list.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [new Touch({ identifier: 1, target: list, clientX: lr.left + 20, clientY: lr.top + 60 })] })); await w(30);
    out.closedByScroll = !document.querySelector('.dark-select-list.open');
    out.o2 = !!open(); await w(50);
    const m = document.querySelector('.hk-bulk-fmeta'); const r = m.getBoundingClientRect();
    m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5, pointerType: 'touch' })); await w(30);
    out.closedByTouch = !document.querySelector('.dark-select-list.open');
    out.o3 = !!open(); await w(50);
    const dl = document.querySelector('.dark-select-list.open'), dr = dl.getBoundingClientRect();
    dl.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [new Touch({ identifier: 2, target: dl, clientX: dr.left + 10, clientY: dr.top + 10 })] }));
    dl.dispatchEvent(new Event('scroll')); await w(30);
    out.listScrollKeeps = !!document.querySelector('.dark-select-list.open');
    closeDarkSelects();
    return out;
  });
  ok(u.reopened, 'زدن نوار بازه، بازه را دوباره باز می‌کند');
  ok(u.pColor === 'rgb(255, 159, 10)' && u.pIcon === '#ff9f0a', 'پوشهٔ شمارهٔ شخصی: آیکون و نوشته نارنجیِ «تمدید»');
  ok(u.bdi === 'ltr' && /^\+۹۸/.test(u.num), 'شماره چپ‌به‌راست، «+» پیش از ۹۸ (' + u.num + ')');
  ok(u.o1 && u.closedByScroll && u.o2 && u.closedByTouch, 'منوی حساب باز با شروع اسکرول یا لمس بیرون همان لحظه بسته شد');
  ok(u.o3 && u.listScrollKeeps, 'لمس و اسکرولِ خودِ فهرست منو آن را نمی‌بندد');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
