// ۱.۴.۶ — تست «مسیر» (دائمی): همان کاری که کاربر روی گوشی می‌کند، یک‌جا.
// ۱) هر گزینهٔ منوی همبرگری از خود منو باز شود و «یک» بک صفحه را ببندد (منو و قسمتش سر جایش؛ تکه‌ای از صفحه نماند).
// ۲) هر مربع افزودن: باکسش بالاترین لایه است، با «یک» بک بسته می‌شود و صفحه سر جایش می‌ماند.
// ۳) قرض: رابطهٔ تازه بی نام پیش‌فرض، با شناسهٔ یکتا؛ انصراف چیزی نمی‌سازد. ۴) «ماهی که گذشت» از اولین فریم صفحهٔ کامل.
// ۵) کپی صفحه برای ورق خوردن ظاهر همان صفحه را دارد و بعد از انیمیشن پاک می‌شود. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const t = hkMainTitle(), R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'نان', amount: 400000, status: 'paid' })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 9000000, status: 'paid' })];
    const l = loadFinancialSubjects(); l.push({ id: 's1', name: 'ساختمان', highlightColor: 'purple' }); _financialSubjects = l; saveFinancialSubjects();
    const sv = loadSavings(); sv.items.push({ id: 'a1', asset: 'usd', qty: 100, buy: 95000, y: 1405, m: 3, d: 12, note: '' }); saveSavings();
    loadUserReminders(); userReminders.push({ id: 'u1', title: 'بیمه', d: 20, m: 9, y: 1405, repeat: 'none', advanceDays: 7, note: '', lastNotified: '' }); saveUserReminders();
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: [], settles: [] }] });
    recurringIncomes.push({ id: 'r1', name: 'اجاره', amount: 1000000, deposit: 0, day: '5', account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140501, genKey: 140500 }); saveRecurring();
    /* رابطهٔ قرض با شناسهٔ «l1» در این ماه و ماه قبل (مثل گوشی کاربر): شناسهٔ رابطهٔ تازه نباید تکراری شود */
    const led = ensureLedger(); led.nextId = 1;
    led.sections = [{ id: 'l1', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '2', desc: 'شام', amount: 250000, ly: currentYear, lm: currentMonth })] }];
    const tp = getTodayPersian(); let pm = tp.m - 1, py = tp.y; if (pm < 1) { pm = 12; py--; }
    const prev = JSON.parse(JSON.stringify(periodData)); prev.expense.sections.forEach(s => { if (s.title === t) s.rows = [R('expense', { day: '3', desc: 'نان', amount: 500000, status: 'paid' })]; });
    archive[periodKey(py, pm)] = prev;
    persistCurrent(); renderAll();
  });
  await page.waitForTimeout(800);

  console.log('• هر گزینهٔ منو: باز از منو، «یک» بک');
  const items = await page.evaluate(() => [...document.querySelectorAll('#menuDropdown .hk-mg[data-g]')].flatMap(g => [...g.querySelectorAll('.hk-mg-box > .menu-item')].filter(x => x.style.display !== 'none').map(x => ({ g: g.getAttribute('data-g'), t: x.textContent.trim().split('\n')[0].trim() }))));
  const skip = /بازیابی|نسخه|خروجی|ماهی که گذشت/;
  const bad = [];
  for (const it of items) {
    if (skip.test(it.t)) continue;
    const r = await page.evaluate(async it => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const vis = e => !!e && e.getClientRects().length > 0;
      openSideMenu(); await w(450); hkMenuGroupEnter(it.g); await w(350);
      [...document.querySelectorAll('#menuDropdown .hk-mg[data-g="' + it.g + '"] .hk-mg-box > .menu-item')].find(x => x.textContent.trim().indexOf(it.t) === 0).click();
      await w(1300);
      const opened = hkLayersShown().length;
      onBackGuard(); await w(1300);
      const dd = document.getElementById('menuDropdown');
      const o = { opened, left: hkLayersShown().length, menu: dd.classList.contains('open'), grp: dd.classList.contains('hk-mgv') && vis(dd.querySelector('.hk-mg-on')), ghosts: document.querySelectorAll('.hk-mnav-ghost, .st-turn-ghost').length };
      for (let i = 0; i < 4 && (hkLayersShown().length || dd.classList.contains('open')); i++) { onBackGuard(); await w(400); }
      try { closeSideMenu(); } catch (e) {} await w(300);
      return o;
    }, it);
    if (!(r.opened >= 1 && r.left === 0 && r.menu && r.grp && r.ghosts === 0)) bad.push(it.t + ' ' + JSON.stringify(r));
  }
  ok(bad.length === 0, 'همهٔ گزینه‌های منو (' + items.filter(x => !skip.test(x.t)).length + ' تا) با یک بک بسته می‌شوند و منو سر همان قسمت می‌ماند' + (bad.length ? ': ' + bad.join(' ؛ ') : ''));

  console.log('• هر مربع افزودن: باکس رو، یک بک');
  const F = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const cases = [['پروژه', () => openSubjectsModal(), 'subjectsModal'], ['پس‌انداز', () => openSavingsModal(), 'savingsModal'], ['یادآور', () => openUserRemindersModal(), 'userRemindersModal'], ['گروه دُنگ', () => openDongModal(), 'hkDong'], ['خرج دُنگ', () => openDongModal('g1'), 'hkDong'], ['رابطهٔ قرض', () => openFeatureSheet('ledger'), 'featureSheet'], ['درآمد ثابت', () => openRecurringFromMenu(), 'featureSheet']];
    for (const [n, f, id] of cases) {
      f(); await w(1200);
      const pg = document.getElementById(id), before = new Set([...document.body.children]);
      pg.querySelector(':scope > .hk-fab').click(); await w(800);
      const hit = document.elementFromPoint(innerWidth / 2, innerHeight * 0.35);
      const added = [...document.body.children].filter(x => !before.has(x) && x.getClientRects().length && x.offsetHeight > 30);
      const onTop = !!hit && !pg.contains(hit) && added.some(a => a.contains(hit));
      const ask = document.getElementById('hkFabAsk');
      const hint = ask ? ask.querySelector('input').placeholder : '';
      const sub = ask ? !/تأیید|بیرون زدن/.test(ask.textContent) : true;
      onBackGuard(); await w(800);
      const closed = added.every(a => !a.isConnected || !a.getClientRects().length);
      const still = pg.getClientRects().length > 0;
      out[n] = { onTop, closed, still, hint, sub };
      for (let i = 0; i < 3 && hkLayersShown().length; i++) { onBackGuard(); await w(450); }
    }
    return out;
  });
  const fbad = Object.keys(F).filter(k => !(F[k].onTop && F[k].closed && F[k].still && F[k].sub));
  ok(fbad.length === 0, 'باکس هر مربع افزودن روی همه است و با یک بک بسته می‌شود؛ صفحه می‌ماند' + (fbad.length ? ': ' + fbad.map(k => k + JSON.stringify(F[k])).join(' ؛ ') : ''));
  ok(/مثلاً/.test(F['پروژه'].hint) && /مثلاً/.test(F['گروه دُنگ'].hint), 'راهنمای داخل فیلد همان راهنمای قبلی؛ نوشتهٔ «تأیید/بیرون زدن» نیست (' + F['پروژه'].hint + ')');

  console.log('• قرض: رابطهٔ تازه');
  const Q = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openFeatureSheet('ledger'); await w(1200);
    const n0 = ensureLedger().sections.length, o = {};
    document.querySelector('#featureSheet > .hk-fab').click(); await w(500);
    o.prefill = [...document.querySelectorAll('#ledgerNameSheet input')].map(x => x.value).join('');
    o.whileOpen = ensureLedger().sections.length - n0;
    onBackGuard(); await w(500); o.cancel = ensureLedger().sections.length - n0;
    document.querySelector('#featureSheet > .hk-fab').click(); await w(500);
    const ins = document.querySelectorAll('#ledgerNameSheet input'); ins[0].value = 'من'; ins[1].value = 'سارا';
    [...document.querySelectorAll('#ledgerNameSheet button')].find(x => /ثبت|تأیید|ذخیره/.test(x.textContent)).click(); await w(800);
    const ids = ensureLedger().sections.map(s => s.id);
    o.unique = new Set(ids).size === ids.length && ensureLedger().sections.find(s => s.personB === 'سارا').id !== 'l1';
    o.ali = !!ensureLedger().sections.find(s => s.personB === 'علی');
    onBackGuard(); await w(800);
    return o;
  });
  ok(Q.prefill === '' && Q.whileOpen === 0 && Q.cancel === 0, 'رابطهٔ تازه: نام پیش‌فرض ندارد، پیش از نام ساخته نمی‌شود، انصراف چیزی نمی‌سازد');
  ok(Q.unique && Q.ali, 'شناسهٔ رابطهٔ تازه با رابطه‌های این ماه و ماه‌های قبل تکراری نیست (حذفش رابطهٔ دیگری را پاک نمی‌کند)');

  console.log('• «ماهی که گذشت»، کپی صفحه');
  const R2 = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(400); hkMenuGroupEnter('reports'); await w(350);
    document.getElementById('menuRecapBtn').click();
    await new Promise(r => requestAnimationFrame(r));
    const ov = document.getElementById('hkRecapOv'), bx = ov && ov.firstElementChild.getBoundingClientRect();
    const o = { first: !!bx && Math.round(bx.height) === innerHeight };
    await w(1000); onBackGuard(); await w(900);
    for (let i = 0; i < 3 && (hkLayersShown().length || document.getElementById('menuDropdown').classList.contains('open')); i++) { onBackGuard(); await w(400); }
    try { closeSideMenu(); } catch (e) {} await w(400);
    /* کپی صفحهٔ قرض همان ظاهر صفحه را دارد */
    openFeatureSheet('ledger'); await w(1200);
    const fs = document.getElementById('featureSheet'), g = hkMakeGhost(fs); document.body.appendChild(g); g.style.position = 'fixed';
    const sec = fs.querySelector('#sections-ledger .section'), gsec = g.querySelector('.section');
    o.look = Math.round(sec.getBoundingClientRect().height) === Math.round(gsec.getBoundingClientRect().height) && getComputedStyle(g.querySelector('#featureSheetAdd') || g).display === getComputedStyle(fs.querySelector('#featureSheetAdd') || fs).display;
    g.classList.add('hk-mnav-ghost'); await w(1700);
    o.swept = !g.isConnected;
    onBackGuard(); await w(800);
    return o;
  });
  ok(R2.first, '«ماهی که گذشت» از اولین فریم صفحهٔ کامل است (بی پرش)');
  ok(R2.look, 'کپی صفحه برای ورق خوردن همان ظاهر صفحه را دارد (بی یک لحظه صفحهٔ به‌هم‌ریخته)');
  ok(R2.swept, 'کپیِ جامانده بعد از انیمیشن خودبه‌خود پاک می‌شود');

  console.log('• کارت‌های قسط و خروجی');
  const K = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    /* کارت قسط: معوقِ آبان، بعد قسط آذر پرداخت شد (تعداد بالا رفت، بی معوق) ← حل‌شده */
    const st = hkInstLoad(); st.cards = st.cards || {};
    st.cards['1234'] = { id: '1234', bank: 'ملت', log: [
      { k: 'a', y: 1405, m: 7, d: 10, time: '10:00', amount: 5000000, count: 10, overdue: 0, penalty: 0 },
      { k: 'b', y: 1405, m: 8, d: 12, time: '10:00', amount: 5000000, count: 11, overdue: 5000000, penalty: 20000 },
      { k: 'c', y: 1405, m: 9, d: 11, time: '10:00', amount: 10000000, count: 13, overdue: 0, penalty: 0 }] };
    st.cards['5678'] = { id: '5678', bank: 'ملی', log: [{ k: 'd', y: 1405, m: 8, d: 12, time: '10:00', amount: 3000000, count: 4, overdue: 3000000, penalty: 0 }] };
    hkInstSave(st);
    const s1 = hkInstStatus(st.cards['1234']), s2 = hkInstStatus(st.cards['5678']);
    o.resolved = s1.st !== 'bad' && s2.st === 'bad';
    o.label = /۱۴۰۵/.test(hkInstStatusHtml(s1)) && /(Nov|Dec|Oct)/.test(hkInstStatusHtml(s1));
    hkOpenInstHistory('1234'); await w(500);
    o.chip = [...document.querySelectorAll('#hkInstOv .hk-inst-chip.bad')].map(x => x.textContent).join('|');
    onBackGuard(); await w(500);
    /* خروجی: هر بار از اول؛ دُنگ هست؛ دکمهٔ خروجی جدا در درآمد ثابت نیست */
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: [{ id: 'e1', desc: 'شام', amount: 300000, payer: 'a', shares: { a: 150000, b: 150000 }, mode: 'eq', y: 1405, m: 8, d: 1, at: 1 }], settles: [] }] });
    hkOpenExportDialog('pdf'); await w(500);
    const labs = () => [...document.querySelectorAll('#hkExportModal label')].map(l => l.textContent.trim());
    o.dong = labs().indexOf('دُنگ') >= 0;
    const c0 = document.querySelector('#hkExportModal input[data-k="dong"]'); c0.checked = false; c0.dispatchEvent(new Event('change'));
    onBackGuard(); await w(500);
    hkOpenExportDialog('pdf'); await w(500);
    o.reset = document.querySelector('#hkExportModal input[data-k="dong"]').checked;
    onBackGuard(); await w(500);
    _hkExportOpts = { range: 'all', user: '', sections: { dong: 1 } };
    const html = buildPdfBlocks().map(x => x.html).join(''), xs = buildXlsxSheets().sheets.map(s => s.name);
    _hkExportOpts = null;
    o.dongOut = /دُنگ — سفر/.test(html) && xs.indexOf('دنگ') >= 0;
    openRecurringFromMenu(); await w(1000);
    const rb = document.getElementById('recExportBtn'); o.recBtn = !rb || !rb.getClientRects().length;
    onBackGuard(); await w(700);
    return o;
  });
  ok(K.resolved, 'قسط: معوقی که بعدش در ماه بعد قسط پرداخت شد، دیگر «معوق» نیست؛ معوقِ باز می‌ماند');
  ok(K.label, 'تاریخ کارت‌های قسط با سال و تاریخ میلادی');
  ok(/معوق/.test(K.chip), 'تاریخچهٔ کارت: همان ماهِ معوق برچسب «معوق» دارد (' + K.chip + ')');
  ok(K.dong && K.reset, 'خروجی: «دُنگ» در فهرست؛ تنظیمات با هر بار بیرون آمدن از اول');
  ok(K.dongOut, 'دُنگ در PDF و اکسل خروجی اصلی');
  ok(K.recBtn, 'دکمهٔ «خروجی آرشیو درآمدها» از صفحهٔ درآمد ثابت برداشته شد');

  await b.close();
  const errs = allErrors.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'بدون خطای JS (' + errs.slice(0, 3).join(' | ') + ')');
  console.log('\n' + passed + ' موفق، ' + failed + ' ناموفق');
  process.exit(failed ? 1 : 0);
})();
