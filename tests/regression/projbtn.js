const { chromium } = require('playwright');
const tag = process.argv[2] || 'J0';
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
    await p.addInitScript((t) => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabTheme', t); }, theme);
    await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
    await p.evaluate(() => { const L = loadFinancialSubjects(); L.push({ id: 'sx', name: 'ساختمان آسمان', highlightColor: PROJECT_HIGHLIGHT_PALETTE[0].id }); saveFinancialSubjects(); openSubjectsModal(); });
    await p.waitForTimeout(500);
    if (theme === 'dark') console.log(await p.evaluate(() => [...document.querySelectorAll('#subjectsList .project-card-actions button')].map(b => { const c = getComputedStyle(b); return b.className + ' bg=' + c.backgroundColor + ' bd=' + c.border + ' sh=' + c.boxShadow.slice(0, 50) + ' ' + Math.round(b.getBoundingClientRect().width); }).join('\n')));
    const r = await p.locator('#subjectsModal .modal-box').boundingBox();
    await p.screenshot({ path: tag + '-' + theme + '-proj.png', clip: r });
    await p.close();
  }
  await b.close();
})();
