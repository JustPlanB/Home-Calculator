const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  await p.evaluate(() => { ['دو','سه'].forEach(n => ensurePersonSections(n)); const t = allPersonTitles()[0]; const inc = findSectionByTitle('income', t); inc.rows=[Object.assign(emptyRow('income'),{id:'a',day:'1',desc:'حقوق',amount:5000000,status:'paid'})]; const e=findSectionByTitle('expense',t); e.rows=[Object.assign(emptyRow('expense'),{id:'b',day:'2',desc:'پیتزا',amount:500000,status:'paid'}),Object.assign(emptyRow('expense'),{id:'c',day:'3',desc:'بنزین',amount:300000,status:'paid'})]; renderHomeCards(); });
  await p.waitForTimeout(500);
  const S = () => p.evaluate(() => ({ sl: Math.round(document.getElementById('homeCards').scrollLeft), idx: (document.querySelector('#homeCardsWrap > .home-card-dots .on') ? [...document.querySelectorAll('#homeCardsWrap > .home-card-dots i')].findIndex(i => i.classList.contains('on')) : -1), sp: (document.querySelector('#homeCards .person-card .pc-smart-box') || {})._spIdx }));
  const drag = async (x0, y, x1, steps, wait) => { await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move(x1, y, { steps: steps || 8 }); await p.mouse.up(); await p.waitForTimeout(wait || 700); };
  const out = {};
  out.start = await S();
  // drag on stat box area (right side of card) to the right by 200 -> next card
  await drag(250, 250, 400, 10); out.afterCardSwipe = await S();
  await drag(400, 250, 250, 10); out.back = await S();
  // short swipe on smart panel (left part of card): 50px right -> panel page only
  const pb = await p.locator('#homeCards .person-card').first().locator('.pc-smart-box').boundingBox();
  await drag(pb.x + 20, pb.y + 80, pb.x + 75, 8); out.shortOnPanel = await S();
  // long swipe on smart panel: 220px right -> card changes
  await drag(pb.x + 10, pb.y + 80, pb.x + 230, 16); out.longOnPanel = await S();
  // eased animation samples
  await p.evaluate(() => HomeCarousel.animateTo(document.getElementById('homeCards'), 0));
  const samples = []; for (let i = 0; i < 8; i++) { await p.waitForTimeout(60); samples.push((await S()).sl); } out.easeSamples = samples;
  console.log(JSON.stringify(out), errs); await b.close();
})();
