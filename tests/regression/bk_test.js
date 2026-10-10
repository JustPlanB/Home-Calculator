const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const toasts = [];
  const mk = async () => { const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message)); await p.exposeFunction('__t', t => toasts.push(t)); await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500); await p.evaluate(() => { const o = showToast; showToast = function (m) { window.__t(String(m)); return o.apply(this, arguments); }; }); return { p, ctx }; };
  const res = {};
  // ===== Test 1: device A – create card 150M, deps, advance, rename, delete
  const A = await mk();
  res.t1_deviceA = await A.p.evaluate(async () => {
    const W = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_x', bank: 'بانک ملت', label: 'ملت ۱', openingBalance: 150000000 }); normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = allPersonTitles()[0];
    findSectionByTitle('expense', t).rows = [Object.assign(emptyRow('expense'), { id: 'r1', day: '2', desc: 'خرید', amount: 1000000, status: 'paid', account: 'ملت ۱' })];
    persistCurrent(); saveArchive();
    const before = sumGlobalAccountBalances();
    const hm = document.getElementById('monthSelect'); let nm = currentMonth + 1, ny = currentYear; if (nm > 12) { nm = 1; ny++; } hm.value = String(nm); document.getElementById('yearSelect').value = String(ny); onPeriodChange(); await W(200);
    const afterAdvance = sumGlobalAccountBalances();
    openBankAccountsModal(); await W(300);
    const idx = selectedBankAccounts.findIndex(a => a.id === 'ba_x');
    openBankNameEditor(selectedBankAccounts[idx], idx, document.body); await W(200);
    [...document.querySelectorAll('input')].filter(i => i.value === 'ملت ۱')[0].value = 'ملت حقوق';
    document.querySelector('#bankAddOk').click(); await W(200);
    const afterRename = { total: sumGlobalAccountBalances(), map: JSON.stringify(periodData.accountOpeningInstant), rowAcc: archive[Object.keys(archive).sort()[0]] ? 'x' : '' };
    renderBankAccountsList(); await W(100);
    [...document.querySelectorAll('button')].find(x => x.textContent === '×' && x.closest('.modal-box')).click(); await W(200);
    document.querySelector('#confirmModal .modal-btn.yes').click(); await W(300);
    const leftovers = [];
    [periodData].concat(Object.keys(archive).map(k => archive[k])).forEach(pd => Object.keys((pd && pd.accountOpeningInstant) || {}).forEach(k => leftovers.push(k)));
    return { before, afterAdvance, afterRename, afterDelete: sumGlobalAccountBalances(), accounts: selectedAccountLabels(), openingLeftovers: leftovers };
  });
  // ===== backup from A, then inject an OLD-version orphan (as produced by the earlier bug) to simulate a real old backup
  const payloadA = await A.p.evaluate(() => { persistCurrent(); const arch = JSON.parse(JSON.stringify(archive)); const k = Object.keys(arch).sort().pop(); arch[k].accountOpeningInstant = Object.assign({}, arch[k].accountOpeningInstant, { 'ملت ۱': 149000000 }); return { archive: arch, selectedBankAccounts: JSON.parse(JSON.stringify(selectedBankAccounts)), trash: [], currentYear, currentMonth }; });
  // ===== Test 1b: restore into device B (own account ملی 10M)
  const B = await mk();
  res.t1_restoreB = await B.p.evaluate(async (payload) => {
    const W = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_b', bank: 'بانک ملی', label: 'ملی', openingBalance: 10000000 }); normalizeSelectedBanks(); saveBankAccountsSelection(); persistCurrent(); saveArchive();
    const before = sumGlobalAccountBalances();
    applyBackupData(payload, 'merge'); await W(1200);
    const leftovers = []; [periodData].concat(Object.keys(archive).map(k => archive[k])).forEach(pd => Object.keys((pd && pd.accountOpeningInstant) || {}).forEach(k => { if (k === 'ملت ۱') leftovers.push(k); }));
    return { before, after: sumGlobalAccountBalances(), accounts: selectedAccountLabels(), hiddenLeft: leftovers.length, month: currentYear + '-' + currentMonth };
  }, payloadA);
  res.t1_toasts = toasts.slice();
  // ===== Test 2: inverse – valid card in backup must be imported with its balance
  const A2 = await mk();
  const payload2 = await A2.p.evaluate(() => { selectedBankAccounts.push({ id: 'ba_v', bank: 'بانک ملت', label: 'ملت', openingBalance: 150000000 }); normalizeSelectedBanks(); saveBankAccountsSelection(); const t = allPersonTitles()[0]; findSectionByTitle('income', t).rows = [Object.assign(emptyRow('income'), { id: 'i1', day: '3', desc: 'حقوق', amount: 5000000, status: 'paid', account: 'ملت' })]; persistCurrent(); saveArchive(); return { total: sumGlobalAccountBalances(), payload: { archive: JSON.parse(JSON.stringify(archive)), selectedBankAccounts: JSON.parse(JSON.stringify(selectedBankAccounts)), currentYear, currentMonth } }; });
  const B2 = await mk();
  res.t2 = await B2.p.evaluate(async (pl) => { const W = ms => new Promise(r => setTimeout(r, ms)); applyBackupData(pl.payload, 'merge'); await W(800); return { srcTotal: pl.total, accounts: selectedAccountLabels(), total: sumGlobalAccountBalances() }; }, payload2);
  // ===== Test 3: mixed valid + orphan, then restore twice (duplicates)
  const B3 = await mk();
  res.t3 = await B3.p.evaluate(async () => {
    const W = ms => new Promise(r => setTimeout(r, ms));
    const k = currentYear + '-' + currentMonth; let pm = currentMonth - 1, py = currentYear; if (pm < 1) { pm = 12; py--; } const kp = py + '-' + pm;
    const t = allPersonTitles()[0];
    const R = (id, d, a, acc) => Object.assign(emptyRow('expense'), { id, day: String(d), desc: 'هزینه ' + id, amount: a, status: 'paid', account: acc });
    const payload = { selectedBankAccounts: [{ id: 'ba_s', bank: 'بانک سامان', label: 'سامان', openingBalance: 20000000 }],
      archive: { [kp]: { income: { sections: [] }, expense: { sections: [{ id: 'sx', title: t, rows: [R('e1', 4, 2000000, 'سامان'), R('e2', 5, 3000000, 'قدیمی')] }] }, accountOpeningInstant: { 'سامان': 20000000, 'قدیمی': 150000000 } },
                 'bad-key': { x: 1 } },
      trash: [{ id: 'tr1', type: 'row', title: 'x', data: {} }] };
    applyBackupData(payload, 'merge'); await W(800);
    const s1 = { accounts: selectedAccountLabels().slice(), total: sumGlobalAccountBalances(), rows: (archive[kp].expense.sections.find(s => s.title === t) || { rows: [] }).rows.length, trash: trashItems.length, hasOrphan: Object.keys(archive[kp].accountOpeningInstant || {}).indexOf('قدیمی') >= 0 };
    applyBackupData(payload, 'merge'); await W(800);
    const s2 = { accounts: selectedAccountLabels().slice(), total: sumGlobalAccountBalances(), rows: (archive[kp].expense.sections.find(s => s.title === t) || { rows: [] }).rows.length, trash: trashItems.length };
    return { first: s1, second: s2 };
  });
  res.t3_toasts = toasts.slice(res.t1_toasts.length);
  // ===== Test 4: boot migration of pre-existing orphan in stored data
  const C = await mk();
  res.t4 = await C.p.evaluate(() => { selectedBankAccounts.push({ id: 'ba_c', bank: 'بانک ملی', label: 'ملی', openingBalance: 5000000 }); normalizeSelectedBanks(); saveBankAccountsSelection(); periodData.accountOpeningInstant = { 'ملی': 5000000, 'حذف‌شده': 150000000 }; persistCurrent(); saveArchive(); return sumGlobalAccountBalances(); });
  await C.p.reload(); await C.p.waitForTimeout(2500);
  res.t4b = await C.p.evaluate(() => ({ total: sumGlobalAccountBalances(), map: periodData.accountOpeningInstant, recovery: localStorage.getItem('hesabKetabArchive_v5_orphanOpenings') }));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
