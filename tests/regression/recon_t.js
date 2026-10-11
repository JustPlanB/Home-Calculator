const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  await p.evaluate(() => { openBankAccountsModal(); openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); }); await p.waitForTimeout(300);
  await p.type('#bankAddBalInput', '1000000'); await p.click('#bankAddOk'); await p.waitForTimeout(400);
  await p.evaluate(() => { try { closeBankAccountsModal(); } catch (e) {} });
  console.log('parse', await p.evaluate(() => [extractBalanceFromSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000\n05/07/12-16:25'), extractBalanceFromSms('مانده: 1.234.567 تومان'), extractBalanceFromSms('موجودی:12,000,000-'), extractBalanceFromSms('مبلغ 5000 ریال')]));
  const sms = async (txt) => {
    await p.evaluate(t => enqueueBankSms(t), txt); await p.waitForTimeout(1500);
    await p.evaluate(() => { const s = document.getElementById('smsConfirmBank'); if (s) { s.value = 'ملت'; } });
    await p.evaluate(() => confirmSmsEntry()); await p.waitForTimeout(600);
    return p.evaluate(() => { const d = document.getElementById('hkReconDlg'); return d ? d.innerText.replace(/\n/g, ' | ') : null; });
  };
  const today = await p.evaluate(() => { const t = getTodayPersian(); return t; });
  const dt = `${String(today.y).slice(2)}/${String(today.m).padStart(2,'0')}/${String(today.d).padStart(2,'0')}`;
  // consistent: 1,000,000 - 250,000 = 750,000 toman = 7,500,000 rial
  console.log('ok-case', await sms(`بانک ملت\nبرداشت 2,500,000\nمانده 7,500,000\n${dt}-10:00`));
  // mismatch: after another 100,000 expense, app = 650,000, sms says 600,000 → diff -50,000
  console.log('mismatch', await sms(`بانک ملت\nبرداشت 1,000,000\nمانده 6,000,000\n${dt}-11:00`));
  await p.screenshot({ path: 'recon.png' });
  await p.click('.hk-recon-add'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const out = [];
    (periodData.expense.sections || []).forEach(s => (s.rows || []).forEach(r => { if (r.amount) out.push([r.desc, r.amount, r.day, r.account, !!r.reconGap]); }));
    return { rows: out, bal: globalAccountBalances()['ملت'], dom: [...document.querySelectorAll('tr.recon-gap .day-input')].map(i => i.value) };
  });
  console.log(JSON.stringify(r));
  await p.evaluate(() => { try { closeSideMenu(); } catch (e) {} openPersonDetail('نام کاربر', 'expense'); }); await p.waitForTimeout(800);
  console.log('pd', await p.evaluate(() => [...document.querySelectorAll('tr.recon-gap input')].map(i => i.value)));
  console.log('afterEdit', await p.evaluate(() => { const i = document.querySelector('tr.recon-gap input.pd-amt') || document.querySelectorAll('tr.recon-gap input')[1]; i.dispatchEvent(new Event('input', { bubbles: true })); let g = 0; (periodData.expense.sections||[]).forEach(s => (s.rows||[]).forEach(r => { if (r.reconGap) g++; })); return [document.querySelectorAll('tr.recon-gap').length, g]; }));
  await p.evaluate(() => document.querySelector('tr.recon-gap') && document.querySelector('tr.recon-gap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.screenshot({ path: 'recon2.png' });
  console.log('errs', errs); await b.close(); })();
