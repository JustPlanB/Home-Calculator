const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  await p.evaluate(() => { ['دو','سه'].forEach(n => ensurePersonSections(n)); renderHomeCards(); });
  await p.waitForTimeout(400);
  const S = () => p.evaluate(() => ({ sl: Math.round(document.getElementById('homeCards').scrollLeft), clones: document.querySelectorAll('.hc-clone').length, active: getActiveHomeCardTitle() }));
  const ok = s => [0,-412,-824].includes(s.sl) && (s.clones === 0 || (s.sl === -824 && s.clones === 1));
  const res = []; let fails = 0;
  const check = async (name) => { await p.waitForTimeout(900); const s = await S(); if (!ok(s)) fails++; res.push(name + ':' + JSON.stringify(s) + (ok(s) ? '' : ' <<FAIL')); };
  const swipe = async (x0, x1, steps=6) => { await p.mouse.move(x0, 250); await p.mouse.down(); await p.mouse.move(x1, 250, { steps }); await p.mouse.up(); };
  // 1 tap mid-animation
  await swipe(200, 380); await p.waitForTimeout(120); await p.mouse.move(200,250); await p.mouse.down(); await p.mouse.up(); await check('tapMid');
  // 2 rapid swipes forward x5 (through wrap)
  for (let i=0;i<5;i++){ await swipe(150, 330, 4); await p.waitForTimeout(90); } await check('rapid5');
  // 3 rapid backward x4
  for (let i=0;i<4;i++){ await swipe(330, 150, 4); await p.waitForTimeout(110); } await check('rapidBack');
  // 4 vertical gesture mid-animation
  await swipe(200, 380); await p.waitForTimeout(100); await p.mouse.move(200,250); await p.mouse.down(); await p.mouse.move(203, 330, {steps:5}); await p.mouse.up(); await check('verticalMid');
  // 5 renderHomeCards mid-animation
  await swipe(200, 380); await p.waitForTimeout(100); await p.evaluate(() => renderHomeCards()); await check('renderMid');
  // 6 go to last, swipe forward (clone), tap mid -> stays consistent
  for (let k=0;k<6;k++){ const s=await S(); if (s.sl===-824) break; await swipe(200,380); await p.waitForTimeout(900); }
  await swipe(200, 380); await p.waitForTimeout(110); const midc = await S(); await p.mouse.move(200,250); await p.mouse.down(); await p.mouse.up(); await check('tapMidClone(mid=' + JSON.stringify(midc) + ')');
  // 7 last card, swipe forward, grab mid & drag back
  for (let k=0;k<6;k++){ const s=await S(); if (s.sl===-824) break; await swipe(200,380); await p.waitForTimeout(900); }
  await swipe(200, 380); await p.waitForTimeout(110); await swipe(200, 150, 5); await check('grabCloneDragBack');
  // 8 small drag (half) and release slowly
  await p.mouse.move(200,250); await p.mouse.down(); await p.mouse.move(260,250,{steps:10}); await p.waitForTimeout(300); await p.mouse.up(); await check('halfSlow');
  // 9 pointercancel mid-drag via dispatch
  await p.mouse.move(200,250); await p.mouse.down(); await p.mouse.move(300,250,{steps:6});
  await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))); await p.mouse.up(); await check('cancel');
  // 10 wrap forward from last lands on first, smooth (monotone)
  for (let k=0;k<6;k++){ const s=await S(); if (s.sl===-824) break; await swipe(200,380); await p.waitForTimeout(900); }
  await swipe(200, 380); const seq=[]; for (let i=0;i<10;i++){ await p.waitForTimeout(40); seq.push((await S()).sl); } await check('wrap seq=' + seq.join(','));
  console.log(res.join('\n')); console.log('fails', fails, errs); await b.close();
})();
