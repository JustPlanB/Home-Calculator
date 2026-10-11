const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');
    const day = 86400000, now = Date.now(), inbox = [];
    // Mellat ***1111: start 10M (rial 100,000,000); 6 tx over 40 days; one missing tx between #3 and #4
    let bal = 10000000; const mk = (ts, bank, acc, type, amt, b2) => inbox.push({ address: '+98700', date: ts, body: 'بانک ' + bank + '\n' + (type === 'i' ? 'واریز ' : 'برداشت ') + (amt * 10).toLocaleString('en') + '\nحساب 0000***' + acc + '\nمانده ' + (b2 * 10).toLocaleString('en') });
    const tx = [[-40,'e',500000],[-30,'i',2000000],[-20,'e',300000],[-10,'e',100000],[-5,'i',50000],[-1,'e',200000]];
    tx.forEach((t, i) => { if (i === 3) bal -= 777000; bal += t[1] === 'i' ? t[2] : -t[2]; mk(now + t[0] * day, 'ملت', '1111', t[1], t[2], bal); });
    let b2v = 3000000; [[-25,'e',100000],[-3,'i',400000]].forEach(t => { b2v += t[1] === 'i' ? t[2] : -t[2]; mk(now + t[0] * day, 'ملی', '2222', t[1], t[2], b2v); });
    inbox.sort((a, b) => b.date - a.date);
    window.__inbox = inbox; window.__mellatLatest = bal; window.__melliLatest = b2v;
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  // existing Mellat account with correct latest balance? set opening such that app balance == latest → no mismatch prompt
  const latest = await p.evaluate(() => [window.__mellatLatest, window.__melliLatest]); console.log('latest', latest);
  await p.evaluate(() => { openBankAccountsModal(); openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); }); await p.waitForTimeout(300);
  await p.type('#bankAddBalInput', '1000000'); await p.click('#bankAddOk'); await p.waitForTimeout(300); await p.evaluate(() => closeBankAccountsModal());

  await p.evaluate(() => { periodData.expense.sections.push({ id: 'sK2', title: 'کارت دوم', color: '#f00', collapsed: false, rows: [emptyRow('expense')] }); persistCurrent(); renderAll(); });
  console.log('titles', await p.evaluate(() => allPersonTitles()));
  const run = async (ans, card) => {
    await p.evaluate(() => openSmsBulkModal()); await p.waitForTimeout(300);
    console.log('cardWrap', await p.evaluate(() => getComputedStyle(document.getElementById('hkBulkCardWrap')).display));
    if (card) await p.evaluate(c => { const d = document.querySelector('#hkBulkCardWrap .dark-select'); [...d._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === c).click(); }, card);
    await p.evaluate(() => { const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select'); const t = getTodayPersian(); const items = sels[1]._list.querySelectorAll('.dark-select-item'); items[(t.m + 9) % 12].click(); });
    await p.click('.hk-bulk-read'); await p.waitForTimeout(800);
    await p.evaluate(() => { const c = document.querySelectorAll('.hk-bulk-chk')[0]; c.checked = true; c.onchange(); const d = document.querySelectorAll('.hk-bulk-dsel')[0]; [...d._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === 'ملت').click(); });
    await p.waitForTimeout(200);
    console.log('folder', await p.evaluate(() => { const f = document.querySelector('.hk-bulk-folder'); return [f.className, getComputedStyle(f).borderColor, f.querySelector('.hk-bulk-fdup').textContent]; }));
    await p.screenshot({ path: 'bdup_' + ans + '.png' });
    await p.click('.hk-bulk-ok'); await p.waitForTimeout(400);
    for (let k = 0; k < 4; k++) {
      const a3 = await p.evaluate(() => (document.getElementById('hkAsk3') || {}).innerText || '');
      if (!a3) break;
      console.log('ask:', a3.replace(/\n/g, ' | '));
      if (/مغایرت موجودی/.test(a3)) await p.evaluate(() => [...document.querySelectorAll('#hkAsk3 button')].find(b => b.textContent === 'ثبت').click());
      else await p.evaluate(t => [...document.querySelectorAll('#hkAsk3 button')].find(b => b.textContent === t).click(), ans === 'skip' ? 'فقط ثبت‌نشده‌ها' : 'همه را ثبت کن');
      await p.waitForTimeout(400);
    }
    while (await p.evaluate(() => !!document.getElementById('hkReconDlg'))) { await p.click('.hk-recon-skip'); await p.waitForTimeout(200); }
    await p.waitForTimeout(300);
    console.log('rows', await p.evaluate(() => Object.keys(archive).concat(['cur']).map(k => { const pd = k === 'cur' ? periodData : archive[k]; const o = {}; ['income','expense'].forEach(t => ((pd[t]||{}).sections||[]).forEach(s => (s.rows||[]).forEach(r => { if (r.fromSmsBulk) o[s.title] = (o[s.title] || 0) + 1; }))); return k + ':' + JSON.stringify(o); }).filter(x => !/\{\}$/.test(x))));
  };
  await run('first', 'کارت دوم');
  await run('skip');
  await run('all');
  console.log(errs); await b.close(); })();
