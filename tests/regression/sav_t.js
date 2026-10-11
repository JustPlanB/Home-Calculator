const { chromium } = require('playwright');
(async () => {
  const theme = process.argv[2] || 'dark';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((th) => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); if (th==='light') localStorage.setItem('hesabKetabTheme','light'); }, theme);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  if (theme === 'light') await p.evaluate(() => { if (document.documentElement.getAttribute('data-theme') !== 'light') toggleTheme(); });
  const r = {};
  // tile order in box2 slide 2
  r.slide2 = await p.evaluate(() => [...document.querySelectorAll('#homeBox2 .hb-slide')].map(s => [...s.querySelectorAll('.home-tile span:last-child')].map(x => x.textContent)));
  // open via tile
  await p.evaluate(() => { [...document.querySelectorAll('#homeBox2 .home-tile')].find(t => t.title === 'پس‌انداز').click(); });
  await p.waitForTimeout(300);
  r.open = await p.evaluate(() => document.getElementById('savingsModal').classList.contains('open'));
  await p.screenshot({ path: `sav-empty-${theme}.png` });
  // add usd
  await p.click('#savingsModal .modal-btn.yes'); await p.waitForTimeout(200);
  await p.screenshot({ path: `sav-editor-${theme}.png` });
  await p.fill('#svQty', '۵۰۰'); await p.type('#svBuy', '58000');
  r.buyFmt = await p.inputValue('#svBuy');
  await p.click('#svEditor .sv-ok'); await p.waitForTimeout(200);
  // add gold via API-ish: choose asset
  await p.click('#savingsModal .modal-btn.yes'); await p.waitForTimeout(200);
  await p.click('#svAssetSelect .dark-select-btn'); await p.waitForTimeout(200);
  await p.evaluate(() => { const it=[...document.querySelectorAll('.dark-select-list.sv-dl.open *')].find(e=>e.textContent.trim()==='طلای ۱۸ عیار' && e.children.length===0); it.click(); });
  await p.waitForTimeout(150);
  r.unitLbl = await p.textContent('#svUnitLbl');
  await p.fill('#svQty', '12/5'); await p.fill('#svNote', 'گردنبند');
  await p.click('#svEditor .sv-ok'); await p.waitForTimeout(200);
  // other w/o name -> blocked
  await p.click('#savingsModal .modal-btn.yes'); await p.waitForTimeout(150);
  await p.click('#svAssetSelect .dark-select-btn'); await p.waitForTimeout(150);
  await p.evaluate(() => { const it=[...document.querySelectorAll('.dark-select-list.sv-dl.open *')].find(e=>e.textContent.trim()==='سایر (نام دلخواه)' && e.children.length===0); it.click(); });
  await p.fill('#svQty', '3'); await p.click('#svEditor .sv-ok'); await p.waitForTimeout(150);
  r.otherBlocked = await p.evaluate(() => !!document.getElementById('svEditor'));
  await p.keyboard.press('Escape');
  await p.evaluate(() => closeSavingsEditor());
  r.listsLeft = await p.evaluate(() => document.querySelectorAll('.dark-select-list.sv-dl').length);
  // set price on usd
  await p.evaluate(() => document.querySelector('#savingsModal .sv-fx .sv-price-btn').click()); await p.waitForTimeout(150);
  await p.type('#svPrice', '61500'); await p.click('#svEditor .sv-ok'); await p.waitForTimeout(200);
  r.summary = await p.evaluate(() => document.getElementById('savingsSummary').innerText.replace(/\s+/g,' '));
  r.groups = await p.evaluate(() => [...document.querySelectorAll('#savingsModal .sv-group')].map(g => g.innerText.replace(/\s+/g,' ')));
  r.stored = await p.evaluate(() => JSON.parse(localStorage.getItem('hesabKetabArchive_v5_savings')).items.map(i=>[i.asset,i.qty,i.buy]));
  await p.screenshot({ path: `sav-list-${theme}.png` });
  // back closes editor then modal
  await p.evaluate(() => document.querySelector('#savingsModal .sv-edit').click()); await p.waitForTimeout(150);
  r.editQty = await p.inputValue('#svQty');
  r.back1 = await p.evaluate(() => { onBackGuard && onBackGuard(); return [!!document.getElementById('svEditor'), document.getElementById('savingsModal').classList.contains('open')]; });
  await p.waitForTimeout(350);
  r.back2 = await p.evaluate(() => { onBackGuard(); return document.getElementById('savingsModal').classList.contains('open'); });
  // balance untouched
  r.balanceUnrelated = await p.evaluate(() => typeof sumGlobalAccountBalances === 'function' ? sumGlobalAccountBalances() : 'n/a');
  // backup roundtrip (restoreSavings)
  r.restore = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(loadSavings())); restoreSavings({items:[{id:'x1',asset:'eur',qty:10}],prices:{}}, 'merge'); const n1 = loadSavings().items.length; restoreSavings(d,'replace'); return [n1, loadSavings().items.length]; });
  // search order
  r.searchHead = await p.evaluate(() => [...document.querySelectorAll('#searchResultBox thead th')].map(t => t.textContent + ':' + t.style.width));
  // update badge
  r.badge = await p.evaluate(() => { setUpdateBadge(true); const a=[document.getElementById('menuBtn').classList.contains('has-update'), getComputedStyle(document.getElementById('menuBtn'),'::after').backgroundColor]; setUpdateBadge(false); return a.concat(document.getElementById('menuBtn').classList.contains('has-update')); });
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();
