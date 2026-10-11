const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1');
    window.__st = { sms: true, notif: false }; window.__opened = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { permStatus: () => Promise.resolve(window.__st), requestNotif: () => Promise.resolve(), requestPermission: () => Promise.resolve({ granted: true }), openPermSettings: (o) => { window.__opened.push(o.which); return Promise.resolve(); }, getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve() } } }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(3000);
  await p.evaluate(() => openSideMenu()); await p.waitForTimeout(500);
  console.log(await p.evaluate(() => [document.getElementById('permRowSms').className, document.getElementById('permRowNotif').className]));
  await p.evaluate(() => hkPermToggle('notif')); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => window.__opened));
  await p.evaluate(() => document.getElementById('permRowSms').scrollIntoView()); 
  const bb = await (await p.$('#permRowSms')).boundingBox();
  await p.screenshot({ path: 'perm.png', clip: { x: 0, y: bb.y - 60, width: 412, height: 180 } });
  console.log(errs); await b.close(); })();
