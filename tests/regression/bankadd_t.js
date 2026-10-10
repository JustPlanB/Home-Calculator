const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  await p.evaluate(() => { openBankAccountsModal(); openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); }); await p.waitForTimeout(300);
  await p.type('#bankAddBalInput', '5000000'); await p.click('#bankAddOk'); await p.waitForTimeout(400);
  const r1 = await p.evaluate(() => ({ banks: selectedBankAccounts.map(a => accountLabel(a) + ':' + a.openingBalance), total: sumGlobalAccountBalances() }));
  // rename only (no balance change) → no confirm, balance same
  await p.evaluate(() => openBankNameEditor(selectedBankAccounts[0], 0, null)); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('bankAddNameInput').value = 'ملت اصلی'; }); await p.click('#bankAddOk'); await p.waitForTimeout(400);
  const r2 = await p.evaluate(() => ({ banks: selectedBankAccounts.map(a => accountLabel(a) + ':' + a.openingBalance), total: sumGlobalAccountBalances(), conf: document.getElementById('confirmModal').classList.contains('open') }));
  console.log(JSON.stringify({ r1, r2 }), errs); await b.close(); })();
