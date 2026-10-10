const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1');
    localStorage.setItem('hesabKetabArchive_v5_todos', JSON.stringify({ 'نام کاربر': [{ t: 'قدیمی', done: false }] })); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  const keys = () => p.evaluate(() => document.querySelector('.sp-panel')._spPages.map(x => x.key));
  const out = { migrated: await keys() };
  const tapPage = async (pred) => {
    await p.evaluate((pred) => { const el = document.querySelector('.sp-panel'); const i = el._spPages.findIndex(x => new RegExp(pred).test(x.key)); el._spIdx = i - 1; smartPanelGo(el, 1); }, pred);
    await p.waitForTimeout(450);
    const c = await p.evaluate(() => { const r = document.querySelector('.sp-panel').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.mouse.click(c[0], c[1]); await p.waitForTimeout(350);
  };
  // + → new list (editor empty)
  await tapPage('^todoAdd$');
  out.newEmpty = await p.evaluate(() => document.querySelectorAll('.todo-row').length);
  await p.fill('.todo-input', 'کار الف'); await p.click('.todo-save'); await p.waitForTimeout(500);
  await tapPage('^todoAdd$');
  out.newEmpty2 = await p.evaluate(() => document.querySelectorAll('.todo-row').length);
  await p.fill('.todo-input', 'کار ب'); await p.click('.todo-save'); await p.waitForTimeout(500);
  out.afterTwo = await keys();
  // tap existing list "کار الف" → edit same list
  const firstNew = out.afterTwo.filter(k => k.startsWith('todo-'))[1];
  await tapPage('^' + firstNew + '$');
  out.editRows = await p.evaluate(() => [...document.querySelectorAll('.todo-text')].map(x => x.textContent));
  await p.fill('.todo-input', 'کار الف ۲'); await p.click('.todo-save'); await p.waitForTimeout(500);
  out.afterEdit = await p.evaluate(() => JSON.parse(localStorage.getItem('hesabKetabArchive_v5_todos')));
  // next month → no lists
  await p.evaluate(() => { const hm = document.getElementById('monthSelect'); let nm = currentMonth + 1, ny = currentYear; if (nm > 12) { nm = 1; ny++; } hm.value = String(nm); document.getElementById('yearSelect').value = String(ny); onPeriodChange(); });
  await p.waitForTimeout(600);
  out.nextMonth = await keys();
  console.log(JSON.stringify(out, null, 1), errs); await b.close();
})();
