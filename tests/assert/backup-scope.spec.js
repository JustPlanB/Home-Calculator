// کامل/جزئی بودن پشتیبان و امنیت «جایگزینی» — فقط دادهٔ مصنوعی، هر سناریو در پروفایل تازه و جدا.
// خروجی از مسیر واقعی رابط کاربری گرفته می‌شود (askBackupParts ← askBackupUserCards ← exportFullBackup) و
// فایل همان چیزی است که exportFullBackup برای دانلود می‌سازد (از URL.createObjectURL گرفته می‌شود).
// بازیابی هم از پنجرهٔ واقعی بازیابی (openBackupRestoreChoice و دکمه‌هایش) انجام می‌شود.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1' };
const ACC = 'حساب نمونه', CARD2 = 'کارت دوم نمونه';

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const same = (a, b) => canon(a) === canon(b);
const allErrors = [];

async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => { errors.push(e.message); allErrors.push(e.message); });
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page, errors };
}

/* دادهٔ مصنوعی: یک حساب، دو کارت، ماه جاری + دو ماه گذشته، موجودی اول ماه متفاوت از موجودی اولیهٔ حساب، کارها، سطل زباله، قرض */
function seed(arg) {
  const [ACC, CARD2] = arg;
  const t = allPersonTitles()[0];
  const cur = periodKey(currentYear, currentMonth);
  selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 500000, createdAt: { y: 1400, m: 1 } });
  normalizeSelectedBanks(); saveBankAccountsSelection();
  const mk = (tab, desc, amt) => Object.assign(emptyRow(tab), { day: '3', desc, amount: amt, status: 'paid', account: ACC });
  periodData.income.sections.find(s => s.title === t).rows.unshift(mk('income', 'C1_' + cur, 100000));
  periodData.expense.sections.push({ id: 's_c2', title: CARD2, color: '#888', collapsed: false, rows: [mk('expense', 'C2_' + cur, 5000)] });
  const led = ensureLedger(); const ls = emptyLedgerSection(); ls.personA = 'من'; ls.personB = 'شخص نمونه'; ls.rows[0].amount = 7000; led.sections.push(ls);
  periodData.accountOpeningInstant = { [ACC]: 700000 };
  persistCurrent();
  ['1400-1', '1400-2'].forEach((k, i) => {
    const pd = JSON.parse(JSON.stringify(periodData));
    pd.income.sections.find(s => s.title === t).rows[0].desc = 'C1_' + k;
    pd.expense.sections.find(s => s.title === CARD2).rows[0].desc = 'C2_' + k;
    pd.accountOpeningInstant = { [ACC]: 400000 + i };
    archive[k] = pd;
  });
  saveArchive();
  saveTodoList(t, 'l_cur', [{ t: 'کار ماه جاری', done: false }]);
  const m = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_todos'));
  m[t]['1400-1'] = [{ id: 'l_old', items: [{ t: 'کار ماه قدیم', done: true }] }];
  localStorage.setItem('hesabKetabArchive_v5_todos', JSON.stringify(m));
  pushToTrash('row', 'ردیف حذف‌شدهٔ نمونه', { desc: 'x' });
  pushToTrash('row', 'ردیف حذف‌شدهٔ دوم', { desc: 'y' });
  return { t, cur };
}
/* وضعیت قابل‌مقایسه (فقط دادهٔ مصنوعی) */
function state(ACC) {
  persistCurrent();
  const rows = {};
  Object.keys(archive).forEach(k => ['income', 'expense'].forEach(tab => ((archive[k][tab] || {}).sections || []).forEach(s => (s.rows || []).forEach(r => { if (r.desc) rows[r.desc] = (rows[r.desc] || 0) + 1; }))));
  const openings = {}; Object.keys(archive).forEach(k => { const v = (archive[k].accountOpeningInstant || {})[ACC]; if (v != null) openings[k] = v; });
  const ledger = {}; Object.keys(archive).forEach(k => { ledger[k] = ((archive[k].ledger || {}).sections || []).length; });
  return {
    months: Object.keys(archive).sort(), rows, openings, ledger,
    accounts: selectedAccountLabels().slice().sort(), balance: sumGlobalAccountBalances(),
    todos: JSON.parse(localStorage.getItem('hesabKetabArchive_v5_todos') || 'null'),
    trash: JSON.parse(localStorage.getItem('hesabKetabArchive_v5_trash') || 'null')
  };
}
const snapLs = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

/* پشتیبان‌گیری از مسیر واقعی UI؛ cards: null = همهٔ کارت‌ها، یا فهرست نام کارت‌ها */
async function uiExport(page, cards) {
  return page.evaluate(cards => new Promise((res, rej) => {
    const orig = URL.createObjectURL;
    URL.createObjectURL = function (blob) { URL.createObjectURL = orig; blob.text().then(t => res(JSON.parse(t)), rej); return 'blob:captured'; };
    askBackupParts();
    setTimeout(() => {
      document.getElementById('bkDoExport').click();
      setTimeout(() => {
        const all = document.getElementById('bkCardAll');
        if (all && cards) {
          all.checked = false; all.dispatchEvent(new Event('change'));
          document.querySelectorAll('.bk-card').forEach(cb => { cb.checked = cards.indexOf(cb.getAttribute('data-card')) >= 0; });
        }
        const btn = document.getElementById('bkDoExportCards'); if (btn) btn.click();
      }, 300);
    }, 300);
    setTimeout(() => rej(new Error('export timeout')), 8000);
  }), cards);
}
/* بازیابی از پنجرهٔ واقعی؛ action: 'replace' | 'merge' | 'cancel'. متن خلاصهٔ پنجره هم برگردانده می‌شود */
async function uiRestore(page, data, action) {
  return page.evaluate(([d, action]) => new Promise(res => {
    openBackupRestoreChoice(d);
    const info = (document.getElementById('bkRestoreScope') || {}).textContent || '';
    const id = action === 'replace' ? 'backupReplaceBtn' : action === 'merge' ? 'backupMergeBtn' : 'backupCancelBtn';
    document.getElementById(id).click();
    setTimeout(() => res(info), 700);
  }), [data, action]);
}

(async () => {
  const b = await chromium.launch();

  console.log('• ۱) پشتیبان دستی کامل از مسیر UI');
  const A = await fresh(b);
  const meta = await A.page.evaluate(seed, [ACC, CARD2]);
  const srcState = await A.page.evaluate(state, ACC);
  const full = await uiExport(A.page, null);
  ok(same(Object.keys(full.archive).sort(), srcState.months) && srcState.months.length >= 3, 'همهٔ ماه‌ها در فایل هستند (' + srcState.months.join('، ') + ')');
  ok(full.backupScope && full.backupScope.complete === true && full.backupScope.allMonths && full.backupScope.allCards, 'backupScope: کامل، همهٔ ماه‌ها، همهٔ کارت‌ها');
  ok(Array.isArray(full.trash) && full.trash.length === 2, 'سطل زباله در فایل هست (۲ مورد)');
  ok(same(full.todos, srcState.todos) && full.todos[meta.t]['1400-1'], 'کارهای همهٔ ماه‌ها در فایل هستند');
  ok(Array.isArray(full.selectedBankAccounts) && full.selectedBankAccounts.length === 1, 'حساب در فایل هست');

  console.log('• ۲) بازیابی کامل در پروفایل تازه');
  const B = await fresh(b);
  const infoFull = await uiRestore(B.page, full, 'replace');
  const restored = await B.page.evaluate(state, ACC);
  ok(/پشتیبان کامل/.test(infoFull), 'پنجرهٔ بازیابی «پشتیبان کامل» را نشان داد');
  ok(same(restored.months, srcState.months) && same(restored.rows, srcState.rows), 'همهٔ ماه‌ها و ردیف‌های هر دو کارت برگشتند');
  ok(same(restored.openings, srcState.openings), 'موجودی‌های اول ماه همهٔ ماه‌ها دقیقاً برگشتند');
  ok(restored.balance === srcState.balance && same(restored.accounts, srcState.accounts), 'حساب و موجودی کل برابر منبع (' + srcState.balance + ')');
  ok(same(restored.todos, srcState.todos) && same(restored.trash, srcState.trash), 'کارها و سطل زباله دقیقاً برگشتند');
  ok(same(restored.ledger, srcState.ledger), 'قرض‌ها برگشتند');
  await B.ctx.close();

  console.log('• ۳) فایل یک‌ماهه (قالب پشتیبان دستی نسخه‌های قبل) ماه‌های دیگر را پاک نمی‌کند');
  const oneMonth = await A.page.evaluate(([ACC, cur]) => {
    const sel = { archive: true, plans: true, recurringIncomes: true, selectedBankAccounts: true, subjects: true, userReminders: true, savings: true, categories: true, selectedMonths: [cur], _allMonths: false, _allUserCards: true };
    const p = JSON.parse(JSON.stringify(buildBackupPayload(sel)));
    delete p.backupScope; /* دقیقاً مثل فایل‌های قدیمی: فقط backupParts */
    const t = allPersonTitles()[0];
    /* ۱.۳.۴۶: نام کارت اصلی ممکن است با عنوان بخش‌های ادغام‌نشدهٔ فایل فرق کند؛ ردیف C1 خود ماه را پیدا کن */
    const sec = p.archive[cur].income.sections.find(s => s.title === t && s.rows[0] && /^C1_/.test(s.rows[0].desc)) || p.archive[cur].income.sections.find(s => s.rows.some(r => r.desc === 'C1_' + cur));
    sec.rows.find(r => r.desc === 'C1_' + cur || /^C1_/.test(r.desc)).desc = 'FILE_' + cur;
    return p;
  }, [ACC, meta.cur]);
  ok(same(Object.keys(oneMonth.archive), [meta.cur]) && !oneMonth.backupScope, 'فایل آزمایشی فقط ماه جاری را دارد و فراداده‌اش قدیمی است');
  const C = await fresh(b);
  await C.page.evaluate(seed, [ACC, CARD2]);
  const cBefore = await C.page.evaluate(state, ACC);
  const infoPart = await uiRestore(C.page, oneMonth, 'replace');
  const cState = await C.page.evaluate(state, ACC);
  ok(/پشتیبان جزئی/.test(infoPart), 'پنجرهٔ بازیابی «پشتیبان جزئی» را نشان داد');
  ok(same(cState.months, srcState.months), 'هیچ ماهی حذف نشد');
  ok(cState.rows['C1_1400-1'] === 1 && cState.rows['C1_1400-2'] === 1 && cState.rows['C2_1400-1'] === 1, 'ردیف‌های ماه‌های گذشته دست‌نخورده ماندند');
  ok(cState.rows['FILE_' + meta.cur] === 1 && !cState.rows['C1_' + meta.cur], 'ماه جاری با نسخهٔ فایل جایگزین شد');
  ok(cState.openings['1400-1'] === 400000 && cState.openings['1400-2'] === 400001, 'موجودی‌های اول ماه گذشته حفظ شدند');
  ok(cState.todos && cState.todos[meta.t] && cState.todos[meta.t]['1400-1'], 'کارهای ماه قدیم حفظ شد');
  ok(same(cState.trash, cBefore.trash), 'سطل زبالهٔ محلی حفظ شد');
  await C.ctx.close();

  /* از ۱.۳.۴۶ نرم‌افزار تک‌کاربره است و «کارت دوم» در کارت اصلی ادغام می‌شود؛ پشتیبانِ محدود به یک کارت دیگر معنا ندارد */
  if (false) {
  console.log('• ۴) پشتیبان محدود به یک کارت (مسیر UI) کارت‌های دیگر را پاک نمی‌کند');
  const D0 = await fresh(b);
  await D0.page.evaluate(seed, [ACC, CARD2]);
  await D0.page.evaluate(CARD2 => { Object.keys(archive).forEach(k => { const s = archive[k].expense.sections.find(x => x.title === CARD2); if (s) s.rows[0].desc = 'FILE2_' + k; }); loadCurrent(); saveArchive(); }, CARD2);
  const cardFile = await uiExport(D0.page, [CARD2]);
  await D0.ctx.close();
  ok(cardFile.backupScope && cardFile.backupScope.complete === false && cardFile.backupScope.allCards === false && same(cardFile.backupScope.cards, [CARD2]), 'backupScope: جزئی، فقط ' + CARD2);
  ok(cardFile.backupScope.allMonths === true && Object.keys(cardFile.archive).length === srcState.months.length, 'همهٔ ماه‌ها در فایل کارت‌محدود هستند');
  ok(!('trash' in cardFile), 'فایل جزئی سطل زباله ندارد');
  const D = await fresh(b);
  await D.page.evaluate(seed, [ACC, CARD2]);
  const dBefore = await D.page.evaluate(state, ACC);
  const seeded = ['1400-1', '1400-2', meta.cur];
  const infoCard = await uiRestore(D.page, cardFile, 'replace');
  const dState = await D.page.evaluate(state, ACC);
  ok(/پشتیبان جزئی/.test(infoCard) && /کارت/.test(infoCard), 'پنجرهٔ بازیابی جزئی بودن و تعداد کارت را نشان داد');
  ok(seeded.every(k => dState.rows['C1_' + k] === 1), 'ردیف‌های کارت اول در همهٔ ماه‌ها دست‌نخورده ماندند');
  ok(seeded.every(k => dState.rows['FILE2_' + k] === 1 && !dState.rows['C2_' + k]), 'کارت دوم در همهٔ ماه‌ها با نسخهٔ فایل جایگزین شد');
  ok(same(dState.months, srcState.months) && same(dState.openings, srcState.openings) && dState.balance === srcState.balance, 'ماه‌ها، موجودی‌های اول ماه و موجودی کل حفظ شدند');
  ok(same(dState.ledger, srcState.ledger), 'قرض‌ها تکثیر یا حذف نشدند');
  ok(same(dState.trash, dBefore.trash) && same(dState.todos, dBefore.todos), 'سطل زباله و کارهای محلی حفظ شدند');
  await D.ctx.close();
  }

  console.log('• ۵) فایل بدون فهرست حساب، موجودی اول ماه را از دست نمی‌دهد (بازسازی خطای 700000 → 500000)');
  const files = await A.page.evaluate(() => ({
    arch: JSON.parse(JSON.stringify(buildBackupPayload({ archive: true }))),
    banks: JSON.parse(JSON.stringify(buildBackupPayload({ selectedBankAccounts: true })))
  }));
  const legacy = { archive: JSON.parse(JSON.stringify(files.arch.archive)) }; /* قدیمی‌ترین قالب: فقط آرشیو، بدون فراداده */
  for (const [name, steps, pre] of [
    ['آرشیو بعد حساب‌ها (پروفایل تازه)', [['arch', 'replace'], ['banks', 'merge']], false],
    ['حساب‌ها بعد آرشیو (پروفایل تازه)', [['banks', 'merge'], ['arch', 'replace']], false],
    ['فایل قدیمی فقط‌آرشیو، روی دستگاهی با حساب دیگر، بعد حساب‌ها', [['legacy', 'replace'], ['banks', 'merge']], true]
  ]) {
    const X = await fresh(b);
    const r = await X.page.evaluate(([f, steps, pre, ACC]) => {
      if (pre) { selectedBankAccounts.push({ id: 'ba_other', bank: 'بانک ملی', label: 'حساب دیگر', openingBalance: 1000 }); normalizeSelectedBanks(); saveBankAccountsSelection(); }
      const mid = [];
      let seen = false;
      steps.forEach(([k, m]) => { applyBackupData(f[k], m); if (k !== 'banks') seen = true; if (!seen) return; const store = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_orphanOpenings') || '{}'); let inArch = false; Object.keys(archive).forEach(mk => { if ((archive[mk].accountOpeningInstant || {})[ACC] === 700000) inArch = true; }); let inStore = false; Object.keys(store).forEach(mk => { if ((store[mk] || {})[ACC] === 700000) inStore = true; }); mid.push(inArch || inStore); });
      return { mid, opening: (periodData.accountOpeningInstant || {})[ACC], balance: sumGlobalAccountBalances(), other: pre ? 1000 : 0 };
    }, [Object.assign({ legacy }, files), steps, pre, ACC]);
    ok(r.mid.every(Boolean), name + ': مقدار 700000 در هیچ مرحله‌ای گم نشد (در آرشیو یا انبار قابل بازیابی)');
    ok(r.opening === 700000 && r.balance === srcState.balance + r.other, name + ': موجودی اول ماه 700000 و موجودی کل ' + (srcState.balance + r.other) + ' (به‌دست‌آمده: ' + r.balance + ')');
    await X.ctx.close();
  }

  console.log('• ۶) حالت افزودن: تکرار، چیزی را تکثیر نمی‌کند');
  const E = await fresh(b);
  await E.page.evaluate(seed, [ACC, CARD2]);
  const before = await E.page.evaluate(state, ACC);
  const own = await uiExport(E.page, null);
  await uiRestore(E.page, own, 'merge'); await uiRestore(E.page, own, 'merge');
  const afterM = await E.page.evaluate(state, ACC);
  ok(same(afterM.rows, before.rows) && same(afterM.months, before.months) && afterM.balance === before.balance, 'دو بار افزودن همان فایل: ردیف، ماه و موجودی ثابت ماند');
  ok(same(afterM.todos, before.todos) && same(afterM.trash, before.trash), 'کارها و سطل زباله تکثیر نشدند');

  console.log('• ۷) انصراف و خطای اعتبارسنجی هیچ تغییری اعمال نمی‌کنند');
  const ls0 = await snapLs(E.page); const st0 = await E.page.evaluate(state, ACC);
  await uiRestore(E.page, oneMonth, 'cancel');
  ok(same(await snapLs(E.page), ls0) && same(await E.page.evaluate(state, ACC), st0), 'انصراف: localStorage و داده‌ها بدون تغییر');
  const v = await E.page.evaluate(d => {
    const orig = window.sanitizeBackupData; let toast = '';
    const origToast = window.showToastLong; window.showToastLong = m => { toast = m; };
    window.sanitizeBackupData = function () { throw new Error('synthetic validation failure'); };
    let ret; try { ret = applyBackupData(d, 'replace'); } finally { window.sanitizeBackupData = orig; window.showToastLong = origToast; }
    return { ret, toast };
  }, { archive: { '1399-1': { income: { sections: [] }, expense: { sections: [] } } }, selectedBankAccounts: [] });
  ok(v.ret === false && /هیچ تغییری/.test(v.toast), 'خطای اعتبارسنجی: بازیابی متوقف شد و به کاربر گفته شد');
  ok(same(await snapLs(E.page), ls0) && same(await E.page.evaluate(state, ACC), st0), 'خطای اعتبارسنجی: localStorage و داده‌ها بدون تغییر');
  await E.ctx.close();
  await A.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbackup-scope: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
