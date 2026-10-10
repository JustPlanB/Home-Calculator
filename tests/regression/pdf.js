const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  const info = await p.evaluate(async () => {
    const t = allPersonTitles()[0]; ensurePersonSections('کارت نمونه');
    selectedBankAccounts.push({ id: 'b1', bank: 'بانک ملت', label: 'ملت حقوق', openingBalance: 25000000 }, { id: 'b2', bank: 'بانک ملی', label: 'ملی', openingBalance: 4000000 }); normalizeSelectedBanks(); saveBankAccountsSelection();
    const descs = ['نان', 'بنزین', 'قبض برق', 'رستوران', 'داروخانه', 'کفش', 'اجاره', 'سینما', 'هدیه تولد', 'شارژ ساختمان', 'میوه', 'تعمیر ماشین'];
    let id = 0; const mk = (k, d, desc, a, st, acc) => Object.assign(emptyRow(k), { id: 'r' + (id++), day: String(d), desc, amount: a, status: st, account: acc || '' });
    findSectionByTitle('expense', t).rows = Array.from({ length: 26 }, (_, i) => mk('expense', 1 + (i * 3) % 29, descs[i % descs.length] + (i > 11 ? ' ماهانه' : ''), 50000 + (i * 137000) % 2400000, i % 4 ? 'paid' : 'unpaid', i % 2 ? 'ملت حقوق' : 'ملی'));
    findSectionByTitle('expense', 'کارت نمونه').rows = Array.from({ length: 14 }, (_, i) => mk('expense', 2 + i * 2, descs[(i + 3) % descs.length], 90000 + i * 45000, i % 3 ? 'paid' : 'unpaid', 'ملی'));
    findSectionByTitle('income', t).rows = [mk('income', 1, 'حقوق ماهانه', 38000000, 'paid', 'ملت حقوق'), mk('income', 15, 'پروژهٔ طراحی', 12000000, 'unpaid', 'ملی'), mk('income', 20, 'سود سپرده', 1800000, 'paid', 'ملی')];
    findSectionByTitle('income', 'کارت نمونه').rows = [mk('income', 5, 'حقوق', 21000000, 'paid', 'ملی')];
    const today = getTodayPersian();
    plans.push({ id: 'pa', name: 'وام مسکن', amount: 600000000, interestRate: 18, count: 60, paidCount: 14, startYear: today.y - 1, startMonth: 3, startDay: 5 });
    plans.push({ id: 'pb', name: 'وام خودرو', amount: 120000000, interestRate: 0, count: 24, paidCount: 23, startYear: today.y - 2, startMonth: 9, startDay: 12 });
    const L = ensureLedger(); L.sections.push({ id: 'ls1', personA: t, personB: 'شخص نمونه', rows: [{ id: 'l1', amount: 5000000, status: 'debt', desc: 'قرض برای خرید', day: '3' }, { id: 'l2', amount: 2000000, status: 'credit', desc: 'پس داد', day: '18' }] });
    recurringIncomes = [{ id: 'rc1', name: 'حقوق ماهانه', amount: 38000000, day: '1', sectionTitle: t }, { id: 'rc2', name: 'اجارهٔ مغازه', amount: 9000000, day: '10', sectionTitle: 'کارت نمونه' }]; saveRecurring();
    const subs = loadFinancialSubjects(); subs.push({ id: 'sproj', name: 'بازسازی آشپزخانه', highlightColor: '' }); saveFinancialSubjects();
    const fc = (amt, adv) => { const f = defaultFinancialContext(); f.classification = 'third_party'; f.accountType = 'project'; f.subjectId = 'sproj'; f.subjectName = 'بازسازی آشپزخانه'; f.fundingSource = 'subject'; f.projectAmount = amt; f.personalAdvanceAmount = adv || 0; return f; };
    findSectionByTitle('income', t).rows.push(Object.assign(mk('income', 6, 'واریز کارفرما', 30000000, 'paid', 'ملت حقوق'), { financialContext: fc(30000000) }));
    findSectionByTitle('income', t).rows.push(Object.assign(mk('income', 21, 'قسط دوم کارفرما', 15000000, 'paid', 'ملی'), { financialContext: fc(15000000) }));
    ['کابینت', 'سنگ اپن', 'دستمزد کاشی‌کار', 'شیرآلات'].forEach((d, i) => findSectionByTitle('expense', t).rows.push(Object.assign(mk('expense', 4 + i * 5, d, 8000000 + i * 3500000, 'paid', i % 2 ? 'ملی' : 'ملت حقوق'), { financialContext: fc(8000000 + i * 3500000) })));
    persistCurrent(); saveArchive();
    const html = await buildPdfFullDocument();
    const xb = await blobToBase64(buildXlsxWorkbook());
    const blob = await renderPdfPagesOffline();
    const b64 = await blobToBase64(blob);
    return { xb, html, pages: (html.match(/class="pdf-page"/g) || []).length, len: html.length, pdf: b64 };
  });
  fs.writeFileSync('report.html', info.html); fs.writeFileSync('report.pdf', Buffer.from(info.pdf, 'base64')); fs.writeFileSync('report.xlsx', Buffer.from(info.xb, 'base64'));
  console.log('pages', info.pages, 'len', info.len, errs.slice(0, 5));
  const pp = await b.newPage({ viewport: { width: 794, height: 1123 } });
  await pp.goto('file://' + process.cwd() + '/report.html'); await pp.waitForTimeout(800);
  const n = await pp.evaluate(() => document.querySelectorAll('.pdf-page').length);
  for (let i = 0; i < n; i++) {
    const el = (await pp.$$('.pdf-page'))[i];
    await el.screenshot({ path: 'rep-' + (i + 1) + '.png' });
  }
  const over = await pp.evaluate(() => [...document.querySelectorAll('.pdf-page')].map(pg => { const foot = pg.querySelector('.pdf-foot').getBoundingClientRect().top; let maxB = 0; [...pg.children].forEach(c => { if (!c.classList.contains('pdf-foot')) maxB = Math.max(maxB, c.getBoundingClientRect().bottom); }); return Math.round(foot - maxB); }));
  console.log('gap to footer per page', over);
  await b.close();
})();
