const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  // existing account ملت 10M
  await p.evaluate(() => { openBankAccountsModal(); openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); }); await p.waitForTimeout(300);
  await p.type('#bankAddBalInput', '10000000'); await p.click('#bankAddOk'); await p.waitForTimeout(300);
  await p.evaluate(() => closeBankAccountsModal()); await p.waitForTimeout(300);
  const t = await p.evaluate(() => getTodayPersian());
  const dt = `${String(t.y).slice(2)}/${String(t.m).padStart(2,'0')}/${String(t.d).padStart(2,'0')}`;
  // Sepah deposit 1M, balance 5M, unknown account
  await p.evaluate(x => enqueueBankSms(x), `بانک سپه\nواریز 10,000,000\nحساب 0303***7777\nمانده 50,000,000\n${dt}-10:00`); await p.waitForTimeout(1500);
  console.log('open', await p.evaluate(() => ({ sel: document.getElementById('smsConfirmBank').value, note: (document.getElementById('smsAccNewNote')||{}).textContent, list: !!document.querySelector('.fancy-select-list.open') })));
  await p.evaluate(() => confirmSmsEntry()); await p.waitForTimeout(300);
  console.log('blocked', await p.evaluate(() => document.getElementById('smsConfirmModal').classList.contains('open')));
  // choose existing ملت → mismatch dialog with 3 buttons → back
  await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); s.value = 'ملت'; confirmSmsEntry(); }); await p.waitForTimeout(400);
  console.log('dlg', await p.evaluate(() => [...document.querySelectorAll('#hkReconDlg button')].map(x => x.textContent)));
  await p.click('.hk-recon-back'); await p.waitForTimeout(300);
  console.log('after back', await p.evaluate(() => ({ modal: document.getElementById('smsConfirmModal').classList.contains('open'), rows: (periodData.income.sections||[]).reduce((n,s)=>n+(s.rows||[]).filter(r=>r.amount).length,0) })));
  // add account via + option
  await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); s.value = '__add_account__'; s.onchange(); }); await p.waitForTimeout(400);
  await p.evaluate(() => openBankNameEditor(null, -1, null, 'بانک سپه', 'سپه')); await p.waitForTimeout(300);
  console.log('editor', await p.evaluate(() => { const i = document.getElementById('bankAddBalInput'); return [i.value, i.readOnly, (document.querySelector('.bank-open-from-sms')||{}).textContent]; }));
  await p.click('#bankAddOk'); await p.waitForTimeout(300);
  await p.evaluate(() => closeBankAccountsModal()); await p.waitForTimeout(400);
  console.log('back in sms', await p.evaluate(() => ({ modal: document.getElementById('smsConfirmModal').classList.contains('open'), sel: document.getElementById('smsConfirmBank').value, note: !!document.getElementById('smsAccNewNote') })));
  await p.evaluate(() => confirmSmsEntry()); await p.waitForTimeout(500);
  console.log('saved', await p.evaluate(() => ({ modal: document.getElementById('smsConfirmModal').classList.contains('open'), dlg: !!document.getElementById('hkReconDlg'), bal: globalAccountBalances()['سپه'], map: JSON.stringify(smsAccountBankMap) })));
  // withdrawal from new account case: Pasargad withdraw 1M balance 5M
  await p.evaluate(x => enqueueBankSms(x), `بانک پاسارگاد\nبرداشت 10,000,000\nکارت 5022-29**-****-4444\nمانده 50,000,000\n${dt}-11:00`); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); s.value = '__add_account__'; s.onchange(); }); await p.waitForTimeout(400);
  await p.evaluate(() => openBankNameEditor(null, -1, null, 'بانک پاسارگاد', 'پاسارگاد')); await p.waitForTimeout(300);
  console.log('editor2', await p.evaluate(() => document.getElementById('bankAddBalInput').value));
  await p.click('#bankAddOk'); await p.waitForTimeout(300); await p.evaluate(() => closeBankAccountsModal()); await p.waitForTimeout(400);
  await p.evaluate(() => confirmSmsEntry()); await p.waitForTimeout(500);
  console.log('saved2', await p.evaluate(() => globalAccountBalances()['پاسارگاد']));
  // mismatch + add gap
  await p.evaluate(x => enqueueBankSms(x), `بانک ملت\nبرداشت 1,000,000\nحساب 1111***2222\nمانده 80,000,000\n${dt}-12:00`); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); s.value = 'ملت'; confirmSmsEntry(); }); await p.waitForTimeout(400);
  await p.click('.hk-recon-add'); await p.waitForTimeout(600);
  console.log('gap', await p.evaluate(() => ({ modal: document.getElementById('smsConfirmModal').classList.contains('open'), bal: globalAccountBalances()['ملت'] })));
  console.log(errs); await b.close(); })();
