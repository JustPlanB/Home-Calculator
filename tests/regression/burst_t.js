const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1');
    window.__q = []; window.__handled = []; window.__cancelled = [];
    for (let i = 1; i <= 5; i++) window.__q.push({ text: 'بانک ملت\nبرداشت ' + (i * 100) + ',000\nمانده ' + (90 - i) + ',000,000\n05/07/12-16:2' + i, sender: '+98700', nid: 1000 + i });
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: {
      getAllPending: () => Promise.resolve({ items: window.__q.slice() }),
      getPendingSms: () => Promise.resolve({ has: false }),
      markHandled: (o) => { window.__handled.push(o && o.nid); window.__q = window.__q.filter(x => x.nid !== (o && o.nid)); return Promise.resolve(); },
      cancelNotification: (o) => { window.__cancelled.push(o.id); return Promise.resolve(); },
      cancelHandledNotifications: () => Promise.resolve(),
      requestPermission: () => Promise.resolve({ granted: true })
    } } };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(3000);
  const st = () => p.evaluate(() => ({ open: document.getElementById('smsConfirmModal').classList.contains('open'), cur: pendingSmsEntry && pendingSmsEntry.nid, queued: smsPendingQueue.length, handled: window.__handled.slice(), nativeLeft: window.__q.length, cancelled: window.__cancelled.slice() }));
  console.log('after load', JSON.stringify(await st()));
  await p.waitForTimeout(4500); // another poll: no duplicates
  console.log('after poll2', JSON.stringify(await st()));
  for (let i = 0; i < 5; i++) {
    await p.evaluate((i) => { if (i % 2) closeSmsConfirmModal(); else { const s = document.getElementById('smsConfirmBank'); confirmSmsEntry(); if (document.getElementById('smsConfirmModal').classList.contains('open')) closeSmsConfirmModal(); } document.getElementById('hkReconDlg') && document.getElementById('hkReconDlg').remove(); }, i);
    await p.waitForTimeout(500);
  }
  console.log('end', JSON.stringify(await st()));
  console.log(errs); await b.close(); })();
