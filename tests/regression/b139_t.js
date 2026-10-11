const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  // 1) trash overlay + back
  const title = await p.evaluate(() => allPersonTitles()[0]);
  await p.evaluate(t => { saveTodoList(t, 'lx1', [{ t: 'نان', done: false }]); refreshSmartPanelsFor(t, 'todo-lx1'); }, title); await p.waitForTimeout(500);
  await p.evaluate(() => { const el = document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box'); spShowTodoTrash(el, el._spPages[el._spIdx]); });
  const before = await p.evaluate(() => !!document.querySelector('.sp-trash-ov'));
  await p.waitForTimeout(300); await p.evaluate(() => onBackGuard()); await p.waitForTimeout(200);
  console.log('trash ov before/after back', before, await p.evaluate(() => !!document.querySelector('.sp-trash-ov')), 'lists', await p.evaluate(t => loadTodoLists(t).length, title));
  // 2) ledger default credit
  await p.evaluate(() => { switchTabFromMenu('ledger'); }); await p.waitForTimeout(400);
  await p.evaluate(() => { addLedgerSection(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const led = ensureLedger(); const s = led.sections[led.sections.length - 1]; s.personA = 'من'; s.personB = 'شخص نمونه'; s.collapsed = false;
    s.rows.push({ day: '', desc: '', amount: 0, status: 'debt' }); s.rows.push({ day: '3', desc: 'قرض', amount: 500000, status: 'debt' }); persistCurrent(); renderLedgerTab(); }); await p.waitForTimeout(400);
  console.log('ledger statuses', await p.evaluate(() => { const led = ensureLedger(); const s = led.sections[led.sections.length - 1]; return s.rows.map(r => r.status); }));
  // menu pick debt on empty row survives re-render
  console.log('emptyRow default', await p.evaluate(() => emptyLedgerRow().status));
  // 3) قسط → installment tab
  await p.evaluate(() => { try { switchTabFromMenu('income'); } catch (e) {} });
  const txt = 'بانک ملت\nقسط وام\nبرداشت 2,000,000\nحساب 0000***1111\nمانده 5,000,000';
  await p.evaluate(t => { const pr = parseBankSms(t); pr.raw = t; window.__pr = pr; openSmsConfirmModal(pr); }, txt); await p.waitForTimeout(500);
  console.log('qest', await p.evaluate(() => [window.__pr.type, (document.querySelector('#smsExpenseSeg .active') || {}).textContent, getComputedStyle(document.getElementById('smsPlanPickBlock') || document.body).display]));
  await p.evaluate(() => { try { closeSmsConfirmModal(); } catch (e) {} });
  const txt2 = 'بانک ملت\nخرید\nبرداشت 2,000,000\nحساب 0000***1111\nمانده 5,000,000';
  await p.evaluate(t => { const pr = parseBankSms(t); pr.raw = t; openSmsConfirmModal(pr); }, txt2); await p.waitForTimeout(500);
  console.log('normal', await p.evaluate(() => (document.querySelector('#smsExpenseSeg .active') || {}).textContent));
  console.log(errs); await b.close(); })();
