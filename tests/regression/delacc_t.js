const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const add = async (bk, lb, v) => { await p.evaluate(([bk, lb]) => { openBankAccountsModal(); openBankNameEditor(null, -1, null, bk, lb); }, [bk, lb]); await p.waitForTimeout(300); await p.type('#bankAddBalInput', v); await p.click('#bankAddOk'); await p.waitForTimeout(300); };
  await add('بانک ملت', 'ملت', '1000000'); await add('بانک ملی', 'ملی', '2000000');
  const t = await p.evaluate(() => getTodayPersian()); const dt = `${String(t.y).slice(2)}/${String(t.m).padStart(2,'0')}/${String(t.d).padStart(2,'0')}`;
  for (const [bk, n, amt] of [['ملت','1111','1,000,000'],['ملت','1111','2,000,000'],['ملی','2222','3,000,000']]) {
    await p.evaluate(x => enqueueBankSms(x), `بانک ${bk}\nبرداشت ${amt}\nحساب 0000***${n}\n${dt}-10:00`); await p.waitForTimeout(1300);
    await p.evaluate(l => { const s = document.getElementById('smsConfirmBank'); s.value = l; confirmSmsEntry(); }, bk); await p.waitForTimeout(500);
  }
  const st = () => p.evaluate(() => ({ accs: selectedAccountLabels(), rows: hkCollectAccountRows('ملت').length, allRows: (periodData.expense.sections||[]).reduce((n,s)=>n+(s.rows||[]).filter(r=>r.amount).length,0), bal: JSON.stringify(globalAccountBalances()), trash: (loadTrash(), trashItems.map(x=>x.title)) }));
  console.log('before', JSON.stringify(await st()));
  await p.evaluate(() => { openBankAccountsModal(); renderBankAccountsList(); }); await p.waitForTimeout(300);
  // delete ملت with yes
  await p.evaluate(() => { const rows = [...document.querySelectorAll('#bankSelectedScroll button')].filter(b => b.textContent === '×'); rows[0].click(); }); await p.waitForTimeout(300);
  console.log('dlg', await p.evaluate(() => (document.getElementById('hkAsk3')||{}).innerText));
  await p.evaluate(() => [...document.querySelectorAll('#hkAsk3 button')].find(b => b.textContent === 'بلی').click()); await p.waitForTimeout(500);
  console.log('after yes', JSON.stringify(await st()));
  // restore from trash
  console.log('trash api', await p.evaluate(() => Object.keys(window).filter(k => /trash/i.test(k)).join(',')));
  await p.evaluate(() => { loadTrash(); const it = trashItems.find(x => x.type === 'bank_account'); if (it) { restoreTrashData(it); trashItems.splice(trashItems.indexOf(it),1); saveTrash(); } }); await p.waitForTimeout(500);
  console.log('after restore', JSON.stringify(await st()));
  // delete ملی with no
  await p.evaluate(() => { renderBankAccountsList(); const rows = [...document.querySelectorAll('#bankSelectedScroll button')].filter(b => b.textContent === '×'); const i = selectedAccountLabels().indexOf('ملی'); rows[i].click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('#hkAsk3 button')].find(b => b.textContent === 'خیر').click()); await p.waitForTimeout(500);
  console.log('after no', JSON.stringify(await st()));
  console.log(errs); await b.close(); })();
