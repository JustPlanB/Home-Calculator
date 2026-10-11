// فاز ۲: شکست ذخیره‌سازی بی‌صدا نیست؛ حذف حساب و بازیابی پشتیبان نیمه‌کاره نمی‌مانند.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا. شکست ذخیره با جایگزین‌کردن موقت Storage.prototype.setItem
// تزریق می‌شود (هیچ حافظه‌ای واقعاً پر نمی‌شود).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1' };
const ACC = 'حساب نمونه';

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => { errors.push(e.message); allErrors.push(e.message); });
  await page.goto(INDEX); await page.waitForTimeout(1800);
  /* ابزار آزمایش: ثبت پیام‌ها و هشدارهای کنسول، و تزریق شکست نوشتن */
  await page.evaluate(() => {
    window.__toasts = []; window.__warns = [];
    const st = window.showToast, sl = window.showToastLong;
    /* showToastLong خودش showToast را صدا می‌زند: هر پیام فقط یک بار ثبت شود */
    let inLong = false;
    window.showToast = function (m) { if (!inLong) window.__toasts.push(String(m)); return st.apply(this, arguments); };
    window.showToastLong = function (m) { window.__toasts.push(String(m)); inLong = true; try { return sl.apply(this, arguments); } finally { inLong = false; } };
    const w = console.warn; console.warn = function () { window.__warns.push([].map.call(arguments, String).join(' ')); return w.apply(this, arguments); };
    window.__origSet = Storage.prototype.setItem;
    window.__failOn = function (match, times, kind) {
      let left = times == null ? Infinity : times;
      Storage.prototype.setItem = function (k, v) {
        const key = String(k);
        const hit = typeof match === 'function' ? match(key) : (match === key);
        if (this === localStorage && hit && left > 0) { left--; throw kind === 'error' ? new Error('synthetic failure') : new DOMException('synthetic full', 'QuotaExceededError'); }
        return window.__origSet.call(this, k, v);
      };
    };
    window.__failOff = function () { Storage.prototype.setItem = window.__origSet; };
    window.__lsSnap = function () { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; };
    window.__lsSame = function (a, b) { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => a[k] === b[k]); };
  });
  await page.evaluate('window.accState = ' + accState.toString());
  return { ctx, page, errors };
}

/* دادهٔ مصنوعی: یک حساب با موجودی اول ماه، دو ماه، ردیف‌هایی که به حساب وصل‌اند */
function seed(ACC) {
  const t = allPersonTitles()[0];
  selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 500000, createdAt: { y: 1400, m: 1 } });
  normalizeSelectedBanks(); saveBankAccountsSelection();
  periodData.income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '2', desc: 'ROW_CUR', amount: 100000, status: 'paid', account: ACC }));
  periodData.accountOpeningInstant = { [ACC]: 700000 };
  persistCurrent();
  const pd = JSON.parse(JSON.stringify(periodData)); pd.income.sections.find(s => s.title === t).rows[0].desc = 'ROW_OLD'; pd.accountOpeningInstant = { [ACC]: 400000 };
  archive['1400-1'] = pd;
  smsAccountBankMap[ACC] = ACC; smsAccountBankMap['L4:9999'] = ACC; saveSmsAccountBankMap();
  saveArchive();
  return periodKey(currentYear, currentMonth);
}
/* وضعیت حساب در حافظه و در حافظهٔ دستگاه (فقط نشانه‌های مصنوعی) */
function accState(ACC) {
  persistCurrent();
  const countRows = arch => { let n = 0; Object.keys(arch || {}).forEach(k => ['income', 'expense'].forEach(tab => (((arch[k] || {})[tab] || {}).sections || []).forEach(s => (s.rows || []).forEach(r => { if (r && r.account === ACC) n++; })))); return n; };
  const openings = arch => { const o = {}; Object.keys(arch || {}).forEach(k => { const v = ((arch[k] || {}).accountOpeningInstant || {})[ACC]; if (v != null) o[k] = v; }); return o; };
  const stored = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_fam_' + (familyCode || 'local')) || '{}');
  const storedAcc = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_bankAccounts') || '[]');
  const storedTrash = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_trash') || '[]');
  const bankTrash = storedTrash.filter(t => t && t.type === 'bank_account');
  return {
    memAcc: selectedAccountLabels().indexOf(ACC) >= 0, memRows: countRows(archive), memOpen: openings(archive), memSms: smsAccountBankMap[ACC] === ACC,
    stAcc: storedAcc.some(a => a && a.label === ACC), stRows: countRows(stored.archive), stOpen: openings(stored.archive),
    stSms: (JSON.parse(localStorage.getItem('hesabKetabArchive_v5_smsAccountBankMap') || '{}'))[ACC] === ACC,
    memTrash: (trashItems || []).filter(t => t && t.type === 'bank_account').length,
    stTrash: bankTrash.length, trashPack: bankTrash[0] ? { openings: bankTrash[0].data.openings, rows: (bankTrash[0].data.rows || []).length, acc: bankTrash[0].data.account && bankTrash[0].data.account.label } : null
  };
}
/* حذف حساب از مسیر واقعی UI (پنجرهٔ حساب‌ها ← × ← «بلی» = همراه ردیف‌ها) */
async function uiDeleteAccount(page, ACC) {
  await page.evaluate(ACC => new Promise(res => {
    openBankAccountsModal(); renderBankAccountsList();
    setTimeout(() => {
      const btn = [...document.querySelectorAll('button')].find(x => x.textContent === '×' && x.parentElement && x.parentElement.textContent.indexOf(ACC) >= 0);
      if (!btn) return res('no-button');
      btn.click();
      setTimeout(() => { const yes = [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].find(x => x.textContent === 'بلی'); if (yes) yes.click(); setTimeout(res, 500); }, 300);
    }, 300);
  }), ACC);
}

(async () => {
  const b = await chromium.launch();

  console.log('• ۱) شکست ذخیره گزارش می‌شود، تکرار نمی‌شود و دادهٔ حافظه حفظ می‌شود');
  const S = await fresh(b);
  await S.page.evaluate(seed, ACC);
  const s1 = await S.page.evaluate(() => {
    const famKey = 'hesabKetabArchive_v5_fam_' + (familyCode || 'local');
    const before = __lsSnap(); window.__toasts = []; window.__warns = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0;
    __failOn(famKey, null, 'quota');
    periodData.income.sections[0].rows.unshift(Object.assign(emptyRow('income'), { day: '9', desc: 'MEM_ONLY_SECRET', amount: 123456789, status: 'paid' }));
    persistCurrent();
    const r = [saveArchive(), saveArchive(), saveArchive()];
    __failOff();
    const after = __lsSnap();
    return { r, toasts: window.__toasts.slice(), warns: window.__warns.slice(), unchanged: __lsSame(before, after),
      inMemory: JSON.stringify(archive).indexOf('MEM_ONLY_SECRET') >= 0 };
  });
  ok(s1.r.every(x => x === false), 'saveArchive نتیجهٔ false برمی‌گرداند');
  ok(s1.toasts.length === 1 && /حافظهٔ ذخیره‌سازی پر است/.test(s1.toasts[0]), 'خطای پر بودن حافظه: دقیقاً یک پیام (نه سه پیام)');
  ok(s1.unchanged, 'با شکست کلید اول، بقیهٔ کلیدهای آرشیو هم نوشته نشدند (ذخیره‌ها ناهمسان نشدند)');
  ok(s1.inMemory, 'دادهٔ حافظه دست‌نخورده ماند');
  ok(s1.warns.length >= 1 && s1.warns.every(w => w.indexOf('MEM_ONLY_SECRET') < 0 && w.indexOf('123456789') < 0), 'در کنسول فقط نام کلید و نوع خطا؛ هیچ دادهٔ مالی');
  const s2 = await S.page.evaluate(() => {
    window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0;
    __failOn('hesabKetabArchive_v5_recurring', null, 'error');
    const a = saveRecurring(), t = saveTrash(), c = saveBankAccountsSelection();
    __failOff();
    return { a, t, c, toasts: window.__toasts.slice() };
  });
  ok(s2.a === false && s2.t === true && s2.c === true, 'نتیجهٔ هر تابع ذخیره جداگانه و درست است');
  ok(s2.toasts.length === 1 && /ذخیرهٔ اطلاعات ناموفق بود/.test(s2.toasts[0]), 'خطای عمومی: پیام عمومی (نه پیام پر بودن حافظه)');
  const s3 = await S.page.evaluate(() => new Promise(res => {
    window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0;
    __failOn(k => k.indexOf('hesabKetabArchive_v5') === 0 && k.indexOf('_fam_') > 0, null, 'quota');
    scheduleSave();
    setTimeout(() => { __failOff(); res(window.__toasts.slice()); }, 900);
  }));
  ok(s3.length === 1, 'ذخیرهٔ زمان‌بندی‌شده (scheduleSave) هم شکست را گزارش کرد');
  const s4 = await S.page.evaluate(() => { window.__toasts = []; return { a: saveArchive(), t: saveTrash(), toasts: window.__toasts.length }; });
  ok(s4.a === true && s4.t === true && s4.toasts === 0, 'مسیر عادی: true و بدون پیام خطا');
  await S.ctx.close();

  console.log('• ۲) حذف حساب');
  // (الف) ذخیرهٔ سطل زباله شکست بخورد → هیچ چیزی حذف نشود
  const D1 = await fresh(b);
  await D1.page.evaluate(seed, ACC);
  const d1Before = await D1.page.evaluate(accState, ACC);
  await D1.page.evaluate(() => { window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0; __failOn('hesabKetabArchive_v5_trash', null, 'quota'); });
  await uiDeleteAccount(D1.page, ACC);
  const d1 = await D1.page.evaluate(ACC => { __failOff(); return { st: accState(ACC), toasts: window.__toasts.slice() }; }, ACC);
  ok(d1Before.memAcc && d1Before.memRows === 2 && Object.keys(d1Before.memOpen).length === 2, 'دادهٔ آزمایشی آماده است (حساب، ۲ ردیف، ۲ موجودی اول ماه)');
  ok(d1.st.memAcc && d1.st.stAcc, 'شکست سطل زباله: حساب در حافظه و دستگاه ماند');
  ok(d1.st.memRows === 2 && d1.st.stRows === 2, 'شکست سطل زباله: ردیف‌های حساب حذف نشدند (حافظه و دستگاه)');
  ok(JSON.stringify(d1.st.memOpen) === JSON.stringify(d1Before.memOpen) && JSON.stringify(d1.st.stOpen) === JSON.stringify(d1Before.stOpen), 'شکست سطل زباله: موجودی‌های اول ماه دست‌نخورده');
  ok(d1.st.memSms && d1.st.stSms && d1.st.memTrash === 0 && d1.st.stTrash === 0, 'شکست سطل زباله: نگاشت پیامک ماند و مورد دروغینی در سطل زباله نیست');
  ok(d1.toasts.some(t => /حذف حساب انجام نشد/.test(t)), 'شکست سطل زباله: پیام روشن به کاربر');
  await D1.ctx.close();

  // (ب) سطل زباله ذخیره شود ولی ذخیرهٔ آرشیو یک بار شکست بخورد → بازگشت کامل
  const D2 = await fresh(b);
  await D2.page.evaluate(seed, ACC);
  const d2Before = await D2.page.evaluate(accState, ACC);
  await D2.page.evaluate(() => { window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0; __failOn('hesabKetabArchive_v5_fam_' + (familyCode || 'local'), 1, 'quota'); });
  await uiDeleteAccount(D2.page, ACC);
  const d2 = await D2.page.evaluate(ACC => { __failOff(); return { st: accState(ACC), toasts: window.__toasts.slice() }; }, ACC);
  ok(d2.st.memAcc && d2.st.stAcc && d2.st.memRows === 2 && d2.st.stRows === 2, 'شکست آرشیو: حساب و ردیف‌ها در حافظه و دستگاه برگشتند');
  ok(JSON.stringify(d2.st.memOpen) === JSON.stringify(d2Before.memOpen) && JSON.stringify(d2.st.stOpen) === JSON.stringify(d2Before.stOpen) && d2.st.memSms && d2.st.stSms, 'شکست آرشیو: موجودی‌های اول ماه و نگاشت پیامک برگشتند');
  ok(d2.st.memTrash === 0 && d2.st.stTrash === 0, 'شکست آرشیو: بستهٔ اضافی سطل زباله برداشته شد (نسخهٔ تکراری نمی‌ماند)');
  ok(d2.toasts.some(t => /هیچ چیزی تغییر نکرد/.test(t)) && !d2.toasts.some(t => /حذف شد/.test(t)), 'شکست آرشیو: پیام «تغییری نکرد»، بدون پیام موفقیت');
  await D2.ctx.close();

  // (ج) ذخیرهٔ آرشیو مدام شکست بخورد → حساب روی صفحه می‌ماند و نسخهٔ قابل بازگردانی در سطل زباله هست
  const D3 = await fresh(b);
  await D3.page.evaluate(seed, ACC);
  await D3.page.evaluate(() => { window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0; __failOn('hesabKetabArchive_v5_fam_' + (familyCode || 'local'), null, 'quota'); });
  await uiDeleteAccount(D3.page, ACC);
  const d3 = await D3.page.evaluate(ACC => { __failOff(); return { st: accState(ACC), toasts: window.__toasts.slice() }; }, ACC);
  ok(d3.st.memAcc && d3.st.memRows === 2, 'شکست دائمی آرشیو: حساب و ردیف‌ها در حافظه برگشتند');
  ok(d3.st.stTrash === 1 && d3.st.trashPack && d3.st.trashPack.acc === ACC && d3.st.trashPack.rows === 2 && Object.keys(d3.st.trashPack.openings).length === 2, 'شکست دائمی آرشیو: بستهٔ کامل قابل بازگردانی (حساب، ردیف‌ها، موجودی‌ها) در سطل زبالهٔ دستگاه هست');
  ok(d3.toasts.some(t => /سطل زباله/.test(t) && /پشتیبان/.test(t)), 'شکست دائمی آرشیو: پیام روشن دربارهٔ وضعیت و راه بازگردانی');
  await D3.ctx.close();

  // (د) مسیر عادی: حذف موفق و بازگردانی از سطل زباله
  const D4 = await fresh(b);
  await D4.page.evaluate(seed, ACC);
  const d4Before = await D4.page.evaluate(accState, ACC);
  await uiDeleteAccount(D4.page, ACC);
  const d4 = await D4.page.evaluate(accState, ACC);
  ok(!d4.memAcc && !d4.stAcc && d4.memRows === 0 && d4.stRows === 0 && !d4.stSms, 'حذف موفق: حساب، ردیف‌ها و نگاشت پیامک از حافظه و دستگاه برداشته شدند');
  ok(Object.keys(d4.stOpen).length === 0 && d4.stTrash === 1 && d4.trashPack.rows === 2 && JSON.stringify(d4.trashPack.openings) === JSON.stringify(d4Before.memOpen), 'حذف موفق: موجودی‌ها و ردیف‌ها در بستهٔ سطل زباله ذخیره شدند');
  const d4r = await D4.page.evaluate(ACC => { const it = trashItems.find(t => t.type === 'bank_account'); const okR = restoreTrashData(it); trashItems.splice(trashItems.indexOf(it), 1); saveTrash(); persistCurrent(); saveArchive(); return { okR, st: accState(ACC) }; }, ACC);
  ok(d4r.okR && d4r.st.memAcc && d4r.st.stAcc && d4r.st.stRows === 2 && JSON.stringify(d4r.st.stOpen) === JSON.stringify(d4Before.stOpen), 'بازگردانی از سطل زباله: حساب، ردیف‌ها و موجودی‌های اول ماه برگشتند');
  await D4.ctx.close();

  console.log('• ۳) بازیابی پشتیبان: شکست در هر نقطه = بازگشت کامل');
  const SRC = await fresh(b);
  await SRC.page.evaluate(seed, 'حساب فایل');
  const file = await SRC.page.evaluate(() => {
    saveTodoList(allPersonTitles()[0], 'l_f', [{ t: 'کار فایل', done: false }]);
    pushToTrash('row', 'حذف‌شدهٔ فایل', { desc: 'z' });
    return JSON.parse(JSON.stringify(buildBackupPayload(null)));
  });
  await SRC.ctx.close();
  ok(file && file.backupScope && file.backupScope.complete, 'فایل آزمایشی کامل است');

  const points = [
    ['کلید غیرآرشیوی زودتر (حساب‌ها)', 'replace', k => k === 'hesabKetabArchive_v5_bankAccounts', 1],
    ['کلید غیرآرشیوی (درآمد ثابت)', 'replace', k => k === 'hesabKetabArchive_v5_recurring', 1],
    ['کلید آرشیو خانواده', 'replace', k => k.indexOf('hesabKetabArchive_v5_fam_') === 0, 1],
    ['کلید اصلی آرشیو (آخرین نوشتن)', 'replace', k => k === 'hesabKetabArchive_v5', 1],
    ['کارهای من', 'replace', k => k === 'hesabKetabArchive_v5_todos', 1],
    ['حالت افزودن، سطل زباله', 'merge', k => k === 'hesabKetabArchive_v5_trash', 1]
  ];
  for (const [name, mode, match, times] of points) {
    const R = await fresh(b);
    await R.page.evaluate(seed, ACC);
    const r = await R.page.evaluate(([f, mode, matchSrc, times, ACC]) => new Promise(res => {
      const before = __lsSnap(); const stBefore = JSON.stringify(accState(ACC)); const archBefore = JSON.stringify(archive);
      window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0;
      __failOn(eval('(' + matchSrc + ')'), times, 'quota');
      openBackupRestoreChoice(f);
      document.getElementById(mode === 'replace' ? 'backupReplaceBtn' : 'backupMergeBtn').click();
      setTimeout(() => {
        __failOff();
        res({ toasts: window.__toasts.slice(), same: __lsSame(before, __lsSnap()), stSame: JSON.stringify(accState(ACC)) === stBefore, archSame: JSON.stringify(archive) === archBefore });
      }, 1500);
    }), [file, mode, match.toString(), times, ACC]);
    ok(r.same, name + ': localStorage دقیقاً به وضعیت پیش از بازیابی برگشت');
    ok(r.stSame && r.archSame, name + ': دادهٔ حافظه هم به وضعیت قبل برگشت');
    ok(r.toasts.some(t => /هیچ تغییری اعمال نشد/.test(t)) && !r.toasts.some(t => /انجام شد/.test(t)), name + ': پیام «هیچ تغییری»، بدون پیام موفقیت');
    await R.ctx.close();
  }
  // شکست دائمی روی کلیدی که پیش از آن تغییر کرده: برگرداندن کامل ممکن نیست → صادقانه گفته شود
  // (اگر کلید شکست‌خورده اصلاً تغییر نکرده باشد، بازگشت واقعاً کامل است و پیام «هیچ تغییری» درست است — مورد قبل)
  const RP = await fresh(b);
  await RP.page.evaluate(seed, ACC);
  const rp = await RP.page.evaluate(f => {
    window.__toasts = []; if (typeof _hkPersist !== 'undefined') _hkPersist.lastToastAt = 0;
    let nAcc = 0;
    __failOn(k => { if (k === 'hesabKetabArchive_v5_bankAccounts') return ++nAcc > 1; return k.indexOf('hesabKetabArchive_v5_fam_') === 0; }, null, 'quota');
    const ret = applyBackupData(f, 'replace');
    __failOff();
    return { ret, toasts: window.__toasts.slice() };
  }, file);
  ok(rp.ret === false && rp.toasts.some(t => /برگرداندن کامل وضعیت قبل هم ممکن نشد/.test(t)) && !rp.toasts.some(t => /انجام شد/.test(t)), 'شکست دائمی: نتیجه false و پیام صادقانه که برگشت کامل ممکن نشد');
  await RP.ctx.close();
  // مسیر عادی پس از همهٔ این‌ها: بازیابی کامل موفق با پیام موفقیت
  const RS = await fresh(b);
  await RS.page.evaluate(seed, ACC);
  const rs = await RS.page.evaluate(f => new Promise(res => {
    window.__toasts = [];
    openBackupRestoreChoice(f); document.getElementById('backupReplaceBtn').click();
    setTimeout(() => res({ toasts: window.__toasts.slice(), acc: selectedAccountLabels().slice(), todos: localStorage.getItem('hesabKetabArchive_v5_todos') }), 1500);
  }), file);
  ok(rs.toasts.some(t => /بازیابی با جایگزینی انجام شد/.test(t)) && rs.acc.indexOf('حساب فایل') >= 0 && /کار فایل/.test(rs.todos || ''), 'مسیر عادی: بازیابی کامل انجام شد و پیام موفقیت آمد');
  await RS.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\npersistence-safety: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
