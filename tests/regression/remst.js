const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const t = getTodayPersian(); loadUserReminders(); userReminders.push({ id: 'u1', title: 'قبض گاز', y: t.y, m: t.m, d: t.d, repeat: 'monthly', advanceDays: 3 }, { id: 'u2', title: 'تمدید بیمه', y: t.y + 1, m: t.m, d: 1, repeat: 'once', advanceDays: 3 }); saveUserReminders(); updateRemindTileBadge();
    const badge = document.querySelector('#homeBox1 .hb-remind-tile .home-tile-badge'); const bt = badge && badge.textContent;
    openUserRemindersModal(); const items = [...document.querySelectorAll('#userRemindersModal .ur-item')].map(x => x.querySelector('.ur-title').textContent + ':' + x.classList.contains('ur-alert'));
    const after = !!document.querySelector('#homeBox1 .hb-remind-tile .home-tile-badge');
    return { bt, items, badgeAfter: after }; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'remst.png' });
  const r2 = await p.evaluate(() => { closeUserRemindersModal(); openUserRemindersModal(); return [...document.querySelectorAll('#userRemindersModal .ur-item.ur-alert')].length; });
  console.log(JSON.stringify(r), 'reopen alerts', r2, errs); await b.close();
})();
