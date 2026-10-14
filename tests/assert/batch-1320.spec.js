// نسخهٔ ۱.۳.۲۰: قسط آتی در جستجو نیست، فلش باز/بسته و هم‌ترازی مداد و × درآمد ثابت، «تمدید» از اول ماه پایان،
// فیلد مبلغ (نشانگر آخر عدد و پاک کردن رقم آخر)، فهرست کشویی تاریخ با یک کلیک باز می‌ماند.
// فقط دادهٔ مصنوعی؛ «امروز» با ساعت ساختگی (۲۱ مهر ۱۴۰۵).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: false });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const P = () => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }], nextId: 2 }, income: { sections: [{ id: 's1', title: 'سارا', rows: [emptyRow('income')] }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 6)] = P();
    archive[periodKey(1405, 8)] = P();
    archive[periodKey(1405, 9)] = P();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 5000000, status: 'paid', account: ACC })] }];
    /* وام از مرداد، ساخته‌شده در مهر */
    plans.push({ id: 'pl_f', name: 'وام خودرو', count: 10, paidCount: 2, amount: 3000000, startYear: 1405, startMonth: 5, startDay: 10, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: Date.now() });
    syncPlansToExpenseAll(); persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• جستجو: قسط‌های آتی نشان داده نمی‌شوند');
  const fs = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const abanRow = (archive[periodKey(1405, 8)].expense.sections[0].rows || []).find(r => r.fromPlanId === 'pl_f');
    document.getElementById('balanceSearchInput').value = 'وام';
    document.getElementById('balanceSearchRange').value = 'all';
    renderBalanceSearch(); await w(50);
    const rows = [...document.querySelectorAll('#search-result-body tr')].map(t => t.textContent);
    resetBalanceSearch();
    return { hasAban: !!abanRow, rows };
  });
  ok(fs.hasAban, 'ردیف قسط آبان (ماه آینده) در داده هست');
  ok(fs.rows.length > 0 && !fs.rows.some(t => /۱۴۰۵\/۰[89]/.test(t)) && fs.rows.some(t => /۱۴۰۵\/۰۷/.test(t)), 'نتیجهٔ جستجو: قسط مهر هست، قسط‌های آبان و آذر (آتی) نیستند (' + fs.rows.length + ' ردیف)');

  console.log('• درآمد ثابت: فلش، هم‌ترازی آیکون‌ها، «تمدید» از اول ماه پایان');
  const rc = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* پایان قرارداد ۲۸ مهر (روز ۲۸)؛ امروز ۲۱ مهر */
    const item = { id: 'rec_d', name: 'اجاره ۲۸', amount: 8000000, day: 28, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 28, m: 7, y: 1404 }, contractEnd: { d: 28, m: 7, y: 1405 }, fromKey: 140407, genKey: 140406 };
    const item2 = { id: 'rec_n', name: 'اجاره آبان', amount: 6000000, day: 2, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 2, m: 8, y: 1404 }, contractEnd: { d: 2, m: 8, y: 1405 }, fromKey: 140407, genKey: 140406 };
    recurringIncomes.push(item, item2);
    ensureRecurringRows({ toast: false });
    openFeatureSheet('recurring'); await w(400);
    const row = (it) => document.querySelector('.recurring-row[data-rec-idx="' + recurringIncomes.indexOf(it) + '"]');
    const r = row(item);
    const out = {};
    const chev = r.querySelector('.rec-name .rec-chev');
    out.chev = !!chev && !!chev.offsetParent;
    out.chevClosed = getComputedStyle(chev).transform;
    r.querySelector('.rec-name').click(); await w(300);
    out.chevOpen = getComputedStyle(chev).transform;
    const e = r.querySelector('[data-re]').getBoundingClientRect(), d = r.querySelector('[data-rd]').getBoundingClientRect();
    out.align = { eb: Math.round(e.bottom), db: Math.round(d.bottom), et: Math.round(e.top), dt: Math.round(d.top), eh: Math.round(e.height), dh: Math.round(d.height) };
    out.renew28 = !!r.querySelector('.rec-renew-btn');
    out.renewNext = !!row(item2).querySelector('.rec-renew-btn');
    /* فیلد مبلغ فرم تمدید */
    r.querySelector('.rec-renew-btn').click(); await w(150);
    return out;
  }, ACC);
  ok(rc.chev && rc.chevClosed !== rc.chevOpen, 'کنار نام هر درآمد ثابت فلش باز/بسته هست و با باز شدن می‌چرخد');
  ok(rc.align.eb === rc.align.db && rc.align.et === rc.align.dt && rc.align.eh === rc.align.dh, 'مداد و × هم‌اندازه و بالا/پایینشان هم‌تراز (' + JSON.stringify(rc.align) + ')');
  ok(rc.renew28, 'قرارداد ۲۸ مهر: از اول مهر (امروز ۲۱ مهر) «تمدید» نشان داده می‌شود');
  ok(!rc.renewNext, 'قرارداد ۲ آبان: هنوز «تمدید» نشان داده نمی‌شود (ماه پایان نرسیده)');

  console.log('• فیلد مبلغ: نشانگر آخر عدد، پاک کردن رقم آخر');
  await p.click('#recRenewAmt');
  await p.waitForTimeout(100);
  const c1 = await p.evaluate(() => { const i = document.getElementById('recRenewAmt'); return { v: i.value, s: i.selectionStart, n: i.value.length, dir: getComputedStyle(i).direction }; });
  await p.keyboard.press('Backspace');
  await p.keyboard.press('Backspace');
  const c2 = await p.evaluate(() => document.getElementById('recRenewAmt').value);
  await p.keyboard.type('55');
  const c3 = await p.evaluate(() => { const i = document.getElementById('recRenewAmt'); return { v: i.value, s: i.selectionStart, n: i.value.length }; });
  ok(c1.s === c1.n && c1.dir === 'ltr', 'با زدن روی مبلغ، نشانگر آخر عدد است (' + c1.v + ')');
  ok(c2 === '۸۰,۰۰۰' || c2 === '80,000', 'دو بار «پاک کردن» کیبورد دو رقم آخر را پاک کرد (' + c2 + ')');
  ok((c3.v === '۸,۰۰۰,۰۵۵' || c3.v === '8,000,055') && c3.s === c3.n, 'تایپ دوباره: رقم‌ها آخر عدد اضافه شدند و نشانگر آخر ماند (' + c3.v + ')');
  await p.evaluate(() => { const m = document.getElementById('recRenewModal'); if (m) m._hkCancel(); });

  console.log('• فهرست کشویی روز/ماه/سال درآمد ثابت با یک کلیک باز می‌ماند');
  await p.evaluate(async () => { document.getElementById('addRecurringBtn').click(); await new Promise(r => setTimeout(r, 300)); });
  /* فیلد نام فوکوس دارد (کیبورد باز)، بعد روی روز شروع زده می‌شود */
  await p.click('#recurringSheet input[type=text]');
  const dayBtn = await p.$('#recurringSheet .hk-date-sel .dark-select-btn');
  await dayBtn.click();
  await p.waitForTimeout(50);
  /* بسته شدن کیبورد = تغییر ارتفاع صفحه؛ و اسکرول جزئی پشت */
  await p.setViewportSize({ width: 412, height: 760 });
  await p.evaluate(() => { document.dispatchEvent(new Event('scroll')); });
  await p.waitForTimeout(300);
  const open1 = await p.evaluate(() => !!document.querySelector('.dark-select-list.open'));
  await p.setViewportSize({ width: 412, height: 915 });
  await p.waitForTimeout(800);
  const open2 = await p.evaluate(() => !!document.querySelector('.dark-select-list.open'));
  /* انتخاب یک روز */
  await p.evaluate(() => { const it = [...document.querySelectorAll('.dark-select-list.open .dark-select-item')].find(x => x.textContent.trim() === '۱۵'); if (it) it.click(); });
  const picked = await p.evaluate(() => document.querySelectorAll('#recurringSheet .hk-date-sel')[0].getDate().d);
  ok(open1 && open2, 'با یک کلیک باز شد و با بسته شدن کیبورد/اسکرول بسته نشد');
  ok(picked === 15, 'انتخاب روز از همان فهرست کار کرد');
  const amtSheet = await p.evaluate(() => { const i = document.querySelectorAll('#recurringSheet input[type=text]')[1]; return { dir: getComputedStyle(i).direction, hk: !!i._hkAmt }; });
  ok(amtSheet.dir === 'ltr' && amtSheet.hk, 'فیلد مبلغ فرم درآمد ثابت هم همین رفتار را دارد');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1320: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
