const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  await p.evaluate(() => { openBankAccountsModal(); openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); }); await p.waitForTimeout(300);
  await p.type('#bankAddBalInput', '20000000'); await p.click('#bankAddOk'); await p.waitForTimeout(400);
  const t = await p.evaluate(() => getTodayPersian());
  const dt = `${String(t.y).slice(2)}/${String(t.m).padStart(2,'0')}/${String(t.d).padStart(2,'0')}`;
  await p.evaluate(x => enqueueBankSms(x), `بانک ملت\nبرداشت 20,000,000\nمانده 230,000,000\n${dt}-10:00`); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); if (s) s.value = 'ملت'; confirmSmsEntry(); }); await p.waitForTimeout(600);
  console.log(await p.evaluate(() => (document.getElementById('hkReconDlg') || {}).innerText));
  await p.click('.hk-recon-add'); await p.waitForTimeout(600);
  console.log(JSON.stringify(await p.evaluate(() => ({
    inc: (periodData.income.sections || []).map(s => [s.title, (s.rows || []).filter(r => r.amount).map(r => [r.desc, r.amount, r.account])]),
    exp: (periodData.expense.sections || []).map(s => [s.title, (s.rows || []).filter(r => r.amount).map(r => [r.desc, r.amount])]),
    persons: typeof allPersonTitles === 'function' ? allPersonTitles() : null,
    bal: globalAccountBalances()['ملت'] }))), errs);
  await b.close(); })();
