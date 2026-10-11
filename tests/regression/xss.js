const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '').slice(0, 60))); window.__x = function (f) { (window.__hits = window.__hits || {})[f] = ((window.__hits || {})[f] || 0) + 1; }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  const P = f => `<img src=x onerror="__x('${f}')">`;
  await p.evaluate((P) => {
    const X = f => P.replace('FIELD', f);
    // card / section title
    const t0 = allPersonTitles()[0];
    ensurePersonSections(X('card'));
    const T = X('card');
    const ex = findSectionByTitle('expense', T), inc = findSectionByTitle('income', T);
    const today = getTodayPersian();
    ex.rows = [Object.assign(emptyRow('expense'), { id: 'x1', day: '3', desc: X('rowdesc'), amount: 300000, status: 'paid', account: X('rowacc') })];
    inc.rows = [Object.assign(emptyRow('income'), { id: 'x2', day: '1', desc: X('incdesc'), amount: 900000, status: 'unpaid', account: X('incacc') })];
    try { selectedBankAccounts = [{ id: 'a1', bank: 'بانک ملی', label: X('acclabel') }]; saveBankAccounts && saveBankAccounts(); } catch (e) {}
    plans.push({ id: 'px', name: X('plan'), amount: 6000000, interestRate: 0, count: 12, paidCount: 0, startYear: today.y, startMonth: today.m, startDay: today.d, expenseSectionTitle: T });
    const L = ensureLedger(); L.sections.push({ id: 'lx', personA: X('ledA'), personB: X('ledB'), collapsed: false, rows: [{ id: 'l1', amount: 500000, status: 'debt', desc: X('leddesc'), day: '3', createdByName: X('ledby') }] });
    recurringIncomes = [{ id: 'rx', name: X('recname'), amount: 1000000, day: '1', sectionTitle: T, note: X('recnote') }]; saveRecurring();
    try { localStorage.setItem(STORAGE_KEY + '_userReminders', JSON.stringify([{ id: 'u1', title: X('remtitle'), note: X('remnote'), d: today.d, m: today.m, y: today.y, repeat: 'once', advanceDays: 3 }])); } catch (e) {}
    try { const subs = loadFinancialSubjects(); subs.push({ id: 'sx', name: X('project'), highlightColor: 'blue' }); saveFinancialSubjects(); } catch (e) {}
    try { HKCategorizer.addCustom && HKCategorizer.addCustom(X('catlabel'), ['تست']); } catch (e) {}
    try { trashItems = [{ id: 'tr1', type: 'row', title: X('trash'), data: {}, deletedAt: Date.now() }]; } catch (e) {}
    persistCurrent(); saveArchive();
  }, P('FIELD'));
  const steps = [
    ['home', () => { renderHomeCards(); }],
    ['detailExp', () => { openPersonDetail(allPersonTitles().find(t => t.indexOf('img') >= 0), 'expense'); }],
    ['detailInc', () => { try { closePersonDetail(); } catch (e) {} openPersonDetail(allPersonTitles().find(t => t.indexOf('img') >= 0), 'income'); }],
    ['install', () => { try { closePersonDetail(); } catch (e) {} switchTabFromMenu('install'); plans.forEach(p => p.collapsed = false); renderPlans(); }],
    ['ledger', () => { closeFeatureSheet(); switchTabFromMenu('ledger'); }],
    ['recurring', () => { closeFeatureSheet(); openRecurringFromMenu(); }],
    ['reminders', () => { closeFeatureSheet(); openUserRemindersModal(); checkUserReminders(true); }],
    ['subjects', () => { closeUserRemindersModal(); openSubjectsModal(); }],
    ['projReport', () => { closeSubjectsModal(); try { openProjectReport('sx'); } catch (e) { try { openSubjectReport('sx'); } catch (e2) {} } }],
    ['accounts', () => { try { openBankAccountsModal(); } catch (e) {} }],
    ['trash', () => { try { closeBankAccountsModal(); } catch (e) {} try { openTrashModal(); } catch (e) {} }],
    ['stats', () => { try { closeTrashModal(); } catch (e) {} openStatsSheet(); }],
    ['search', () => { try { closeStatsSheet(); } catch (e) {} try { openHomeMandeh(); } catch (e) {} try { document.getElementById('balanceSearchInput') && (document.getElementById('balanceSearchInput').value = 'img'); runBalanceSearch && runBalanceSearch(); } catch (e) {} }],
    ['instant', () => { try { openInstantBalance(allPersonTitles()[0]); } catch (e) {} }],
    ['pdf', async () => { await buildPdfPages(); }],
    ['sms', () => { try { enqueueBankSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000'); } catch (e) {} }],
  ];
  const out = {};
  for (const [name, fn] of steps) {
    await p.evaluate(`(${fn.toString()})()`).catch(e => out[name + '_err'] = String(e).slice(0, 80));
    await p.waitForTimeout(700);
    out[name] = await p.evaluate(() => JSON.stringify(window.__hits || {}));
  }
  out.escapedShown = await p.evaluate(() => { const h = document.body.innerHTML, o = []; const re = /__x\('([a-z]+)'\)/g; let m; while ((m = re.exec(h))) if (o.indexOf(m[1]) < 0) o.push(m[1]); return o; });
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img[src="x"]')].map(i => (i.parentElement && (i.parentElement.id || i.parentElement.className)) || '?').slice(0, 20));
  out.csp = await p.evaluate(() => window.__csp);
  console.log(JSON.stringify(out, null, 1)); console.log('img nodes in DOM:', JSON.stringify(imgs)); console.log(errs.slice(0, 5)); await b.close();
})();
