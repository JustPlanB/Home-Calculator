// ۱.۴.۴۵ — زنجیرهٔ موجودی اول ماه کارت‌ها: ثبت/ویرایش ماه قبل، موجودی اول ماه‌های بعد را به‌روز می‌کند؛ اصلاح قدیمی‌ها (تبدیل ۵) و گزارش ردیف اختلاف جبرانی.
// فقط دادهٔ ساختگی؛ اعداد مرجع در خود آزمون و مستقل از لایهٔ محاسبه (از روی دادهٔ ساخته‌شده) حساب می‌شوند.
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
  const SEED = () => { // سه ماه: مهر ۱۴۰۵ (ماه ایجاد کارت)، آبان، آذر (ماه باز)
    const mkRow = (id, d, a, st, acc, extra) => Object.assign({ id, day: String(d), desc: 'x' + id, amount: a, status: st || 'paid', account: acc, deletedAt: null, createdAt: 1, updatedAt: 1 }, extra || {});
    const pdOf = (y, m, exp, inc, openMap) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: 'من', rows: exp }]; pd.income.sections = [{ id: 'I', title: 'من', rows: inc }]; pd.accountOpeningInstant = openMap || {}; return pd; };
    selectedBankAccounts = [{ id: 'ba_1', bank: 'ملت', label: 'ملت', openingBalance: 1000000, createdAt: { y: 1405, m: 7 } }];
    currentYear = 1405; currentMonth = 9;
    archive = {};
    archive['1405-7'] = pdOf(1405, 7, [mkRow('a1', 5, 100000, 'paid', 'ملت')], [], { 'ملت': 1000000 });
    archive['1405-8'] = pdOf(1405, 8, [mkRow('b1', 10, 50000, 'paid', 'ملت'), mkRow('b2', 30, 120000, 'paid', 'ملت')], [mkRow('b3', 15, 300000, 'paid', 'ملت')], { 'ملت': 900000 });
    // آذر با موجودی اول کهنه: پایان آبان درست = ۹۰۰۰۰۰−۵۰۰۰۰+۳۰۰۰۰۰−۱۲۰۰۰۰ = ۱٬۰۳۰٬۰۰۰ ولی ذخیره‌شده ۱٬۱۵۰٬۰۰۰ (بی ۱۲۰ هزار)
    periodData = pdOf(1405, 9, [], [], { 'ملت': 1150000 });
    archive['1405-9'] = JSON.parse(JSON.stringify(periodData));
    try { localStorage.setItem(STORAGE_KEY + '_dataVer', '5'); } catch (e) {}
  };
  await page.evaluate(`(${SEED.toString()})()`);
  // ۱) تشخیص
  const R1 = await page.evaluate(() => { const r = hkOpeningResync(false, true); return { n: r.changes.length, c: r.changes[0], stored: periodData.accountOpeningInstant['ملت'], bal: getAccountOpeningBalance('ملت') }; });
  ok(R1.n === 1 && R1.c.k === '1405-9' && R1.c.from === 1150000 && R1.c.to === 1030000, 'موجودی اول آذر کهنه تشخیص داده شد (۱٬۱۵۰٬۰۰۰ ← ۱٬۰۳۰٬۰۰۰)');
  ok(R1.stored === 1150000 && R1.bal === 1150000, 'حالت گزارش چیزی را عوض نمی‌کند');
  // ۲) اعمال
  const R2 = await page.evaluate(() => { const r = hkOpeningResync(true, true); return { n: r.changes.length, cur: periodData.accountOpeningInstant['ملت'], arc: archive['1405-9'].accountOpeningInstant['ملت'], bal: getAccountOpeningBalance('ملت'), m7: archive['1405-7'].accountOpeningInstant['ملت'], m8: archive['1405-8'].accountOpeningInstant['ملت'], total: sumGlobalAccountBalances() }; });
  ok(R2.cur === 1030000 && R2.arc === 1030000 && R2.bal === 1030000, 'موجودی اول آذر اصلاح شد (در ماه باز و آرشیو)');
  ok(R2.m7 === 1000000 && R2.m8 === 900000 - 0 + 0 + (1000000 - 100000 - 900000), 'ماه ایجاد کارت (مهر) دست نخورد؛ آبان = پایان مهر');
  ok(R2.total === 1030000, 'موجودی کل با آن درست شد');
  const R3 = await page.evaluate(() => hkOpeningResync(true).changes.length);
  ok(R3 === 0, 'اجرای دوباره چیزی را عوض نمی‌کند (ایدمپوتنت)');
  // ۲.۵) بی‌نشانه و بدون حالت قدیمی: دست نمی‌خورد
  const R2b = await page.evaluate(`(() => { (${SEED.toString()})(); const r = hkOpeningResync(false); return r.changes.length; })()`);
  ok(R2b === 0, 'بی‌نشانهٔ پایان ماه قبل (غیر از تبدیل قدیمی) هیچ عددی عوض نمی‌شود');
  await page.evaluate(`(${SEED.toString()})(); hkOpeningResync(true, true)`);
  // ۳) پخش زنجیره‌ای: ویرایش مهر، آبان و آذر را هم عوض می‌کند (ذخیره)
  const R4 = await page.evaluate(() => { archive['1405-7'].expense.sections[0].rows[0].amount = 150000; saveArchive(); return { m8: archive['1405-8'].accountOpeningInstant['ملت'], m9: periodData.accountOpeningInstant['ملت'], a9: archive['1405-9'].accountOpeningInstant['ملت'] }; });
  ok(R4.m8 === 850000 && R4.m9 === 980000 && R4.a9 === 980000, 'ویرایش ماه قدیمی‌تر: ماه‌های بعد هم‌زمان به‌روز شدند (آبان ۸۵۰٬۰۰۰، آذر ۹۸۰٬۰۰۰)');
  // ۴) ردیف جدید در ماه قبل (مثل پیامک دیرتأییدشده)
  const R5 = await page.evaluate(() => { archive['1405-8'].expense.sections[0].rows.push({ id: 'late', day: '30', desc: 'دیرهنگام', amount: 20000, status: 'paid', account: 'ملت', deletedAt: null, createdAt: 2, updatedAt: 2 }); saveArchive(); return periodData.accountOpeningInstant['ملت']; });
  ok(R5 === 960000, 'ثبت دیرهنگامِ ردیف در ماه قبل، موجودی اول ماه باز را کم کرد');
  // ۵) ردیف‌های پرداخت‌نشده و کارت دیگر روی زنجیره اثر ندارند
  const R6 = await page.evaluate(() => { archive['1405-8'].expense.sections[0].rows.push({ id: 'u1', day: '2', desc: 'u', amount: 777000, status: 'unpaid', account: 'ملت', deletedAt: null, createdAt: 3, updatedAt: 3 }, { id: 'o1', day: '3', desc: 'o', amount: 555000, status: 'paid', account: 'کارت دیگر', deletedAt: null, createdAt: 3, updatedAt: 3 }); saveArchive(); return periodData.accountOpeningInstant['ملت']; });
  ok(R6 === 960000, 'پرداخت‌نشده و ردیف کارت دیگر موجودی اول را عوض نمی‌کند');
  // ۵.۵) عدد دستیِ توضیح‌ناپذیر حفظ می‌شود و فقط جابه‌جایی‌ها اعمال می‌شود
  const RM = await page.evaluate(`(() => { (${SEED.toString()})(); periodData.accountOpeningInstant['ملت'] = 1175000; archive['1405-9'] = JSON.parse(JSON.stringify(periodData));
    const r = hkOpeningResync(true, true); const kept = periodData.accountOpeningInstant['ملت'];
    archive['1405-8'].expense.sections[0].rows[1].amount = 130000; saveArchive();
    return { n: r.changes.length, kept, after: periodData.accountOpeningInstant['ملت'] }; })()`);
  ok(RM.n === 0 && RM.kept === 1175000, 'اختلاف دستیِ توضیح‌ناپذیر (۱٬۱۷۵٬۰۰۰ در برابر ۱٬۰۳۰٬۰۰۰) در تبدیل قدیمی دست نخورد');
  ok(RM.after === 1165000, 'ولی تغییر بعدی ماه قبل (۱۰ هزار بیشتر) همان‌قدر روی آن اعمال شد');
  // ۶) پیش از تبدیل ۵ هیچ‌چیز به‌صورت خودکار عوض نمی‌شود
  const R7 = await page.evaluate(`(${SEED.toString()})(); localStorage.setItem(STORAGE_KEY + '_dataVer', '4'); archive['1405-7'].expense.sections[0].rows[0].amount = 150000; saveArchive(); periodData.accountOpeningInstant['ملت']`);
  ok(R7 === 1150000, 'تا تبدیل شمارهٔ ۵ اجرا نشده، ذخیره‌سازی موجودی را خودکار تغییر نمی‌دهد');
  // ۷) تبدیل قدیمی‌ها + ردیف اختلاف جبرانی
  const R8 = await page.evaluate(`(async () => { (${SEED.toString()})(); localStorage.setItem(STORAGE_KEY + '_dataVer', '4'); localStorage.removeItem(STORAGE_KEY + '_openingFixNotice');
    periodData.expense.sections[0].rows.push({ id: 'gap1', day: '4', desc: 'مجموع خرج‌های ثبت‌نشده', amount: 120000, status: 'paid', account: 'ملت', reconGap: true, deletedAt: null, createdAt: 5, updatedAt: 5 });
    archive['1405-9'] = JSON.parse(JSON.stringify(periodData));
    const before = JSON.stringify(archive);
    await hkRunMigrations();
    const note = localStorage.getItem(STORAGE_KEY + '_openingFixNotice');
    return { ver: hkDataVer(), open: periodData.accountOpeningInstant['ملت'], arcOpen: archive['1405-9'].accountOpeningInstant['ملت'], gapStill: periodData.expense.sections[0].rows.some(r => r.id === 'gap1'), confirm: document.getElementById('confirmMsg').textContent, note };
  })()`);
  ok(R8.ver >= 5 && R8.open === 1030000 && R8.arcOpen === 1030000, 'تبدیل ۵: موجودی اول کهنهٔ ماه‌های قبلی اصلاح شد');
  ok(R8.gapStill, 'ردیف اختلاف خودکار حذف نمی‌شود (داده‌ای پاک نمی‌شود)');
  await page.waitForTimeout(1600);
  const R9 = await page.evaluate(() => ({ msg: document.getElementById('confirmMsg').textContent, open: document.getElementById('confirmModal').classList.contains('open'), note: localStorage.getItem(STORAGE_KEY + '_openingFixNotice') }));
  ok(R9.open && /ملت/.test(R9.msg) && /اصلاح شد/.test(R9.msg) && /ردیف اختلاف/.test(R9.msg) && /حذفش کن/.test(R9.msg) && R9.note === null, 'یک‌بار به کاربر گفته می‌شود: کدام کارت اصلاح شد و ردیف اختلاف جبرانی را حذف کند');
  // ۸) داده‌های درست دست نمی‌خورند
  const R11 = await page.evaluate(`(() => { (${SEED.toString()})(); periodData.accountOpeningInstant['ملت'] = 1030000; archive['1405-9'] = JSON.parse(JSON.stringify(periodData)); const op = () => Object.keys(archive).map(k => JSON.stringify(archive[k].accountOpeningInstant)).join('|') + JSON.stringify(periodData.accountOpeningInstant); const snap = op(); const r = hkOpeningResync(true); return { n: r.changes.length, same: snap === op() }; })()`);
  ok(R11.n === 0 && R11.same, 'دادهٔ درست دست نمی‌خورد (فقط نشانهٔ پایان ماه قبل ثبت می‌شود)');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1446: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
