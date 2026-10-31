// ۱.۳.۶۵: ساعت ردیف اختلاف (و اصلاح ردیف‌های قبلی)، راه‌اندازی بار اول (کارت‌ها و مانده‌ها از پیامک)، باکس «حساب جدید» مثل ثبت گروهی،
// نشانگر آخر متن/مبلغ هنگام ویرایش، باکس «+» عمودی و راست‌چین، و چهار رقم کارت که به سطر تاریخ بعدی نمی‌چسبد.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا؛ صندوق پیامک ساختگی با پلاگین شبیه‌سازی‌شده.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

(async () => {
  const b = await chromium.launch();

  console.log('• راه‌اندازی بار اول');
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    const now = Date.now(), d = 86400000;
    window.__inbox = [
      { address: 'Bank Mellat', date: now - 2 * d, body: 'بانک ملت\nبرداشت 500,000\nکارت 5555\nمانده 12,340,000\n0806-10:00' },
      { address: 'Bank Mellat', date: now - 1 * d, body: 'بانک ملت\nبرداشت 100,000\nکارت 5555\nمانده 12,240,000\n0807-11:00' },
      { address: 'Bank Melli', date: now - 3 * d, body: 'بانک ملی\nانتقال:2,000,000+\nحساب 0000***1234\nمانده:30,000,000+\n0805-09:00' },
      { address: 'Saderat', date: now - 50 * d, body: 'بانک صادرات\nخرید 80,000\nکارت 9999\nمانده 1,000,000\n0620-09:00' },
      { address: 'Saderat', date: now - 10 * d, body: 'بانک صادرات\nخرید 20,000\nکارت 9999\n0727-09:00' },
      { address: '+989121234567', date: now - 1 * d, body: 'واریز 1,000,000 مانده 5,000,000' },
    ];
  });
  await ctx.addInitScript(() => {
    const inbox = window.__inbox || [];
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { BankSms: { readInbox: async () => ({ items: window.__inbox || inbox }), requestPermission: async () => ({}), getAllPending: async () => ({ items: [] }), markHandled: async () => ({}) } } };
  });
  const p = await ctx.newPage(); p.on('pageerror', e => allErrors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(6000);
  const tourOn = await p.evaluate(() => !!document.getElementById('appTour'));
  ok(tourOn, 'نصب تازه: اول راهنما');
  if (tourOn) { await p.evaluate(() => document.querySelector('#appTour .tour-skip').click()); await p.waitForTimeout(1000); }
  const s1 = await p.evaluate(() => ({ open: !!document.getElementById('hkSetupOv'), title: (document.querySelector('#hkSetupOv .hk-bulk-title') || {}).textContent, sameBox: !!document.querySelector('#hkSetupOv.hk-bulk-ov .hk-bulk-box .hk-bulk-btns .hk-bulk-ok') }));
  ok(s1.open && s1.title === 'حساب‌هایت را پیدا کنیم' && s1.sameBox, 'بعد از راهنما «حساب‌هایت را پیدا کنیم» با ظاهر پنجرهٔ ثبت گروهی');
  const s2 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#hkSetupOv .hk-bulk-ok').click(); await w(500);
    return [...document.querySelectorAll('#hkSetupOv .hk-bulk-folder')].map(c => ({ t: c.querySelector('.hk-bulk-fname').textContent, name: (c.querySelector('.hk-bulk-newinp') || {}).value, bal: (c.querySelector('.hk-setup-bal input') || {}).value, lab: (c.querySelector('.hk-bulk-newlab') || {}).textContent }));
  });
  ok(s2.length === 3, 'سه کارت پیدا شد (پیامک شخصی کنار گذاشته شد): ' + s2.map(x => x.t).join('، '));
  ok(s2.some(x => /ملت/.test(x.t) && x.name === 'ملت ۵۵۵۵' && x.bal === '۱,۲۲۴,۰۰۰'), 'ملت ۵۵۵۵: نام پیشنهادی و جدیدترین مانده (ریال→تومان)');
  ok(s2.some(x => /ملی/.test(x.t) && x.bal === '۳,۰۰۰,۰۰۰'), 'ملی ۱۲۳۴: مانده از پیامک «انتقال:…+»');
  ok(s2.some(x => /صادرات · ۹۹۹۹/.test(x.t)) && !s2.some(x => /۲۷۰۹/.test(x.t)), 'چهار رقم کارت به سطر تاریخ بعدی (۰۷۲۷-۰۹:۰۰) نچسبید');
  ok(s2.every(x => x.lab === 'حساب جدید:'), 'هر کارت باکس «حساب جدید:» همان ثبت گروهی');
  const s3 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* صادرات را برنداریم؛ ماندهٔ قدیمی‌اش را عوض کنیم */
    const sad = [...document.querySelectorAll('#hkSetupOv .hk-bulk-folder')].find(c => /صادرات/.test(c.textContent));
    const bi = sad.querySelector('.hk-setup-bal input'); bi.value = '250000'; bi.dispatchEvent(new Event('input'));
    document.querySelector('#hkSetupOv .hk-bulk-ok').click(); await w(500);
    return { open: !!document.getElementById('hkSetupOv'), accs: selectedAccountLabels(), bal: globalAccountBalances(), map: smsAccountBankMap['L4:5555'], done: localStorage.getItem('hesabKetabArchive_v5_bankSetupDone') };
  });
  ok(!s3.open && s3.accs.length === 3 && s3.bal['ملت ۵۵۵۵'] === 1224000 && s3.bal['صادرات ۹۹۹۹'] === 250000, 'با «تأیید» سه حساب با همان مانده‌ها ساخته شد');
  ok(s3.map === 'ملت ۵۵۵۵' && s3.done === '1', 'پیامک‌های بعدی کارت ۵۵۵۵ به همین حساب می‌روند؛ راه‌اندازی دیگر تکرار نمی‌شود');
  await ctx.close();

  /* بدون اجازه/پلاگین: مسیر دستی، و «بعداً» */
  const ctxM = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctxM.addInitScript(() => { ['tourDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const pm = await ctxM.newPage(); pm.on('pageerror', e => allErrors.push(e.message));
  await pm.goto(INDEX); await pm.waitForTimeout(1800);
  const m1 = await pm.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    hkOpenSetup(); await w(100);
    document.querySelector('#hkSetupOv .hk-bulk-ok').click(); await w(200);
    const c = document.querySelector('#hkSetupOv .hk-bulk-folder');
    const out = { manual: !!c && /حساب دیگر/.test(c.textContent) };
    c.querySelector('.hk-bulk-newinp').value = 'نقدی';
    const bi = c.querySelector('.hk-setup-bal input'); bi.value = '۱۲۰۰۰۰'; bi.dispatchEvent(new Event('input'));
    out.fmt = bi.value;
    document.querySelector('#hkSetupOv .hk-bulk-ok').click(); await w(300);
    out.bal = globalAccountBalances()['نقدی'];
    hkOpenSetup(); await w(100);
    document.querySelector('#hkSetupOv .hk-bulk-close').click(); await w(100);
    out.later = !document.getElementById('hkSetupOv');
    return out;
  });
  ok(m1.manual && m1.fmt === '۱۲۰,۰۰۰' && m1.bal === 120000, 'بدون خواندن پیامک: حساب دستی با نام و مانده');
  ok(m1.later, '«بعداً» پنجره را می‌بندد');
  await ctxM.close();

  console.log('• ردیف اختلاف، باکس حساب جدید، نشانگر، دکمهٔ «+»');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx2.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const q = await ctx2.newPage(); q.on('pageerror', e => allErrors.push(e.message));
  await q.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await q.goto(INDEX); await q.waitForTimeout(1800);
  const r = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } });
    selectedBankAccounts.push({ id: 'a2', bank: 'بانک ملی', label: 'ملی', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), sec = periodData.expense.sections.find(s => s.title === t);
    sec.rows = [Object.assign(emptyRow('expense'), { day: '7', desc: 'شبا', amount: 200000, status: 'paid', account: 'ملت', time: '10:00' })];
    persistCurrent();
    hkInsertReconGapRow({ y: currentYear, m: currentMonth, day: 7, bank: 'ملت', type: 'expense', amount: 200000, time: '10:00' }, -4000);
    sec.rows.push(Object.assign(emptyRow('expense'), { day: '7', desc: 'خرید ملی', amount: 50000, status: 'paid', account: 'ملی', time: '11:00' }));
    out.gapTime = sec.rows.find(x => x.reconGap).time;
    out.order = hkSortRunsByTime(sec.rows).map(x => x.desc);
    const pd = JSON.parse(JSON.stringify(periodData)); const s2 = pd.expense.sections.find(s => s.title === t);
    s2.rows = [Object.assign(emptyRow('expense'), { day: '3', desc: 'اختلاف قدیم', amount: 4000, status: 'paid', account: 'ملت', reconGap: true }),
               Object.assign(emptyRow('expense'), { day: '3', desc: 'شبا قدیم', amount: 300000, status: 'paid', account: 'ملت', time: '09:15' }),
               Object.assign(emptyRow('expense'), { day: '3', desc: 'خرید ملی قدیم', amount: 10000, status: 'paid', account: 'ملی', time: '10:30' }),
               Object.assign(emptyRow('expense'), { day: '4', desc: 'اختلاف بی‌همسایه', amount: 1000, status: 'paid', account: 'ملت', reconGap: true })];
    archive[periodKey(currentYear, currentMonth - 1)] = pd; saveArchive();
    out.fixed = hkGapTimeFix();
    const s3 = archive[periodKey(currentYear, currentMonth - 1)].expense.sections.find(s => s.title === t);
    out.migTime = s3.rows[0].time; out.migOrder = hkSortRunsByTime(s3.rows).map(x => x.desc); out.untouched = !s3.rows[3].time;
    return out;
  });
  ok(r.gapTime === '10:00', 'ردیف اختلاف ساعت همان تراکنش را دارد');
  ok(JSON.stringify(r.order) === JSON.stringify(['مجموع خرج‌های ثبت‌نشده در این بازه', 'شبا', 'خرید ملی']), 'خرید ملیِ یک ساعت بعد زیر ردیف اختلاف ملت می‌ماند');
  ok(r.fixed === 1 && r.migTime === '09:15' && r.migOrder[0] === 'اختلاف قدیم' && r.migOrder[2] === 'خرید ملی قدیم', 'ردیف اختلافِ قبلی ساعت تراکنش کنارش را گرفت و درست مرتب شد');
  ok(r.untouched, 'ردیف اختلافی که تراکنش همسایه ندارد دست نخورد');

  const r2 = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), sec = periodData.expense.sections.find(s => s.title === t);
    hkOpenRowEdit({ row: sec.rows[0], tab: 'expense', title: t, sec: sec, num: 1, onSaved: function () {} }); await w(400);
    const accB = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /ملت|بدون حساب/.test(x.textContent));
    accB.click(); await w(150);
    [...document.querySelectorAll('.hk-re-list .dark-select-option')].pop().click(); await w(250);
    const box = document.querySelector('#hkRowEdit .hk-bulk-newacc');
    const out = { border: box && getComputedStyle(box).borderTopColor, label: box && box.querySelector('.hk-bulk-newlab').textContent, sep: !!(box && box.querySelector('.hk-bulk-newsep')), noLine: !document.querySelector('#hkRowEdit .sms-newacc-msg') };
    const amt = document.querySelector('#hkRowEdit .hk-re-amt');
    amt.blur(); await w(30); amt.focus(); amt.setSelectionRange(1, 1); await w(80);
    out.amt = [amt.selectionStart, amt.value.length];
    const ds = [...document.querySelectorAll('#hkRowEdit textarea, #hkRowEdit input')].find(x => x.value && /[آ-ی]/.test(x.value) && !x.classList.contains('hk-bulk-newinp'));
    if (ds) { ds.blur(); await w(30); ds.focus(); ds.setSelectionRange(0, 0); await w(80); out.txt = [ds.selectionStart, ds.value.length]; }
    document.querySelectorAll('#hkRowEdit').forEach(x => x.remove());
    document.querySelector('.home-circle-add').click(); await w(200);
    const bx = document.querySelector('.hk-add-pop').getBoundingClientRect();
    out.plus = { w: bx.width, h: bx.height, align: getComputedStyle(document.querySelector('.hk-add-it')).textAlign };
    return out;
  });
  ok(r2.border === 'rgb(8, 181, 245)' && r2.label === 'حساب جدید:' && r2.sep && r2.noLine, 'ویرایش ردیف: «حساب جدید:» داخل قاب آبی با خط تفکیک (بدون سطر متن جدا)');
  ok(r2.amt[0] === r2.amt[1], 'ویرایش مبلغ: نشانگر جلوی یکان');
  ok(r2.txt && r2.txt[0] === r2.txt[1], 'ویرایش نوشته: نشانگر بعد از آخرین کلمه');
  ok(r2.plus.h > r2.plus.w && r2.plus.align === 'right', 'باکس «+»: به اندازهٔ نوشته‌ها، مستطیل عمودی، راست‌چین (' + Math.round(r2.plus.w) + '×' + Math.round(r2.plus.h) + ')');
  await ctx2.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbatch-1365: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
