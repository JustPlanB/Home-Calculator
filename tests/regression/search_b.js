const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || 'search';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(3000);
  const info = await p.evaluate(async () => {
    const t = allPersonTitles()[0];
    const inc = findSectionByTitle('income', t), exp = findSectionByTitle('expense', t); let n=0;
    const R=(d,s,a)=>Object.assign(emptyRow('expense'),{id:'q'+(n++),day:String(d),desc:s,amount:a,status:'paid'});
    inc.rows=[R(1,'حقوق',48000000)]; exp.rows=[Object.assign(R(2,'پیتزا با دوستان',1800000),{account:'ملت 3106'}),R(3,'بنزین',900000),Object.assign(R(9,'پیتزا',700000),{account:'ملی 2002'})];
    const pv = prevYearMonth(currentYear, currentMonth); archive[periodKey(pv.y,pv.m)] = { income:{sections:[{title:t,rows:[]}]}, expense:{sections:[{title:t,rows:[R(5,'پیتزا خانواده',1200000)]}]} };
    renderHomeCards(); openHomeMandeh(); await new Promise(r=>setTimeout(r,800));
    return { tab: currentTab, ctx: _detailContext && _detailContext.kind, active: [...document.querySelectorAll('.tab-panel.active')].map(x=>x.id), sinput: !!document.getElementById('balanceSearchInput') };
  });
  await p.screenshot({ path: out + '.png' });
  if (process.argv[3]) { await p.fill('#balanceSearchInput', 'پیتزا'); await p.waitForTimeout(500); await p.screenshot({ path: out + '-q.png' }); }
  console.log(info, errs); await b.close();
})();
