const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  // todo list create
  const title = await p.evaluate(() => allPersonTitles()[0]);
  await p.evaluate(t => { saveTodoList(t, 'lx1', [{ t: 'خرید نان', done: false }]); refreshSmartPanelsFor(t, 'todo-lx1'); }, title); await p.waitForTimeout(600);
  const box = await p.evaluate(() => { const el = document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box'); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, key: el._spPages[el._spIdx].key }; });
  console.log('page', box.key);
  console.log('efp', await p.evaluate(b => { const e = document.elementFromPoint(b.x, b.y); window._lg=[]; ['pointerdown','pointercancel','pointerup','touchstart','touchend'].forEach(n=>document.addEventListener(n,ev=>window._lg.push(n+':'+(ev.target.closest&&ev.target.closest('.pc-smart-box')?'sb':ev.target.className)),true)); const sb=document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box'); return [e && e.className, sb.contains(e)]; }, box));
  // long press via touch: use CDP touch events
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
  await p.waitForTimeout(200);
  console.log('mid', await p.evaluate(()=>{const sb=document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box'); return [sb._spLpArmed, sb._spIdx, sb._spPages[sb._spIdx].key, typeof HomeCarousel!=='undefined'&&HomeCarousel.busy()];}));
  await p.waitForTimeout(450);
  console.log('mid2', await p.evaluate(()=>{const sb=document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box'); return [sb._spLpArmed, !!sb.querySelector('.sp-trash-ov'), !!document.querySelector('.sp-trash-ov')];}), errs);
  await p.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(300);
  console.log('lg', await p.evaluate(()=>window._lg.join(' ')));
  console.log('trash ov', await p.evaluate(() => !!document.querySelector('.sp-trash-ov')), 'reorder', await p.evaluate(() => document.body.classList.contains('card-reorder-mode')));
  await p.screenshot({ path: 'sptrash.png', clip: { x: 0, y: box.y - 120, width: 412, height: 240 } });
  const bb = await p.evaluate(() => { const r = document.querySelector('.sp-trash-btn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); await p.touchscreen.tap(bb.x, bb.y); await p.waitForTimeout(400);
  console.log('after', await p.evaluate(t => ({ lists: loadTodoLists(t).length, trash: (loadTrash(), trashItems.map(x => x.type + ':' + x.title)) }), title));
  await p.evaluate(() => { loadTrash(); const it = trashItems.find(x => x.type === 'todo_list'); restoreTrashData(it); }); await p.waitForTimeout(300);
  console.log('restored', await p.evaluate(t => loadTodoLists(t).length, title));
  // recurring editor date selects
  await p.evaluate(() => { try { openRecurringFromMenu(); } catch (e) {} }); await p.waitForTimeout(500);
  await p.evaluate(() => { try { editRecurringItem(-1); } catch (e) { console.log('ERR', e.message, e.stack); window._recErr = e.message + e.stack; } }); await p.waitForTimeout(500);
  console.log('recerr', await p.evaluate(() => window._recErr)); console.log('rec dates', await p.evaluate(() => document.querySelectorAll('.hk-date-sel').length)); await p.screenshot({ path: 'recdates.png' });
  await p.screenshot({ path: 'recdate.png' });
  // toast above modal
  await p.evaluate(() => { openBankAccountsModal(); showToast('تست'); }); await p.waitForTimeout(200);
  console.log('toast z', await p.evaluate(() => getComputedStyle(document.getElementById('toast')).zIndex));
  console.log(errs); await b.close(); })();
