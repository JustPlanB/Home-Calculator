// ۱.۳.۷۱: بازگشت یکدست (هر لایهٔ باز بسته شود) و رفتن به پس‌زمینه در صفحهٔ اصلی؛ روزِ امروز زیر اسم ماه؛
// «+» با اسم پروژه‌ها و حذف دکمهٔ افزودن منوهای درآمد/مخارج؛ لانگ‌پرس میان‌برها؛ شخصی‌سازی تازه؛ پرش کادر اسم در قرض.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-01T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const PJ = () => { window.loadFinancialSubjects = () => [{ id: 'pj1', name: 'ساختمان آسمان', highlightColor: 'orange' }, { id: 'pj2', name: 'سهراب', highlightColor: 'blue' }]; };

(async () => {
  const b = await chromium.launch();

  console.log('• بازگشت');
  const A = await fresh(b);
  const bk = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    /* یادداشت دست‌نویس، باکس «اسلاید تازه»، شخصی‌سازی و پنجرهٔ انتخاب میان‌بر رویش */
    openInkEditor(hkMainTitle(), null); await w(300); onBackGuard(); await w(450); out.ink = !document.getElementById('hkInkEd');
    openTodoChooser(hkMainTitle()); await w(200); onBackGuard(); await w(300); out.pick = !document.getElementById('hkTodoPick');
    openPrefsModal(); await w(300);
    hkOpenDockPicker('L'); await w(200); onBackGuard(); await w(300);
    out.dockFirst = !document.getElementById('hkDockPick') && !!document.getElementById('hkPrefsModal');
    document.querySelector('#hkPrefsModal .hk-pf-row[data-k="slides"]').click(); await w(250);
    onBackGuard(); await w(300);
    out.subBack = !!document.getElementById('hkPrefsModal') && !document.querySelector('#hkPrefsModal .hk-pf-back');
    onBackGuard(); await w(300); out.prefsClosed = !document.getElementById('hkPrefsModal');
    /* صفحهٔ اصلی بدون لایه: یک بازگشت = پس‌زمینه (بسته نمی‌شود) */
    let min = 0, exit = 0;
    window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { minimizeApp: () => { min++; return Promise.resolve(); }, exitApp: () => { exit++; } } } };
    localStorage.removeItem('hk_lock_app_exit');
    onBackGuard(); await w(300);
    out.min = min; out.exit = exit; out.lockFlag = localStorage.getItem('hk_lock_app_exit') === '1';
    out.noToast = !/یک‌بار دیگر بازگشت/.test(document.body.innerText);
    delete window.Capacitor;
    return out;
  });
  ok(bk.ink, 'یادداشت دست‌نویس با بازگشت بسته می‌شود');
  ok(bk.pick, 'باکس «اسلاید تازه» با بازگشت بسته می‌شود');
  ok(bk.dockFirst, 'پنجرهٔ انتخاب میان‌بر روی شخصی‌سازی: بازگشت فقط همان را می‌بندد');
  ok(bk.subBack && bk.prefsClosed, 'شخصی‌سازی: بازگشت اول از صفحهٔ دوم به صفحهٔ اصلی، بعد بستن');
  ok(bk.min === 1 && bk.exit === 0 && bk.noToast, 'صفحهٔ اصلی: یک بازگشت = رفتن به پس‌زمینه (بدون بستن و بدون پیام «یک‌بار دیگر»)');
  ok(bk.lockFlag, 'قفل نرم‌افزار موقع برگشتن مثل خروج رمز می‌خواهد');

  console.log('• روزِ امروز زیر اسم ماه');
  const td = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const btn = () => document.querySelector('#monthSelectWrap .dark-select-btn');
    const now = (btn().querySelector('.hk-mtoday') || {}).textContent || '';
    const r = btn().getBoundingClientRect(), s = btn().querySelector('.hk-mtoday').getBoundingClientRect();
    const inside = s.top >= r.top && s.bottom <= r.bottom;
    navigateToPeriod(1405, 7); await w(300);
    const other = !btn().querySelector('.hk-mtoday') && btn().textContent === 'مهر';
    navigateToPeriod(1404, 8); await w(300);
    const otherYear = !btn().querySelector('.hk-mtoday');
    navigateToPeriod(1405, 8); await w(300);
    const back = ((btn().querySelector('.hk-mtoday') || {}).textContent || '') === now;
    return { now, inside, other, otherYear, back };
  });
  ok(td.now === 'یکشنبه ۱۰' && td.inside, 'ماه جاری: زیر «آبان» نوشته شده «یکشنبه ۱۰» و داخل دکمه جا می‌شود (' + td.now + ')');
  ok(td.other && td.otherYear && td.back, 'ماه/سال دیگر: فقط اسم ماه؛ با برگشت به ماه جاری دوباره می‌آید');
  await A.ctx.close();

  console.log('• «+» با پروژه‌ها');
  const B = await fresh(b);
  await B.page.evaluate(PJ);
  const ad = await B.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const btn = document.querySelector('.home-circle-add');
    hkHomeAddMenu(btn); await w(200);
    const chips = [...document.querySelectorAll('#hkAddPop .hk-add-chip')].map(c => c.textContent);
    const pop = document.querySelector('#hkAddPop .hk-add-pop').getBoundingClientRect(), bc = document.getElementById('homeBalanceCircle').getBoundingClientRect();
    const clear = pop.right <= bc.left || pop.bottom <= bc.top;
    document.querySelector('#hkAddPop .hk-add-chip[data-id="pj2"]').click(); await w(100);
    const on = [...document.querySelectorAll('#hkAddPop .hk-add-chip.on')].map(c => c.dataset.id).join();
    document.querySelector('#hkAddPop .hk-add-chip[data-id="pj2"]').click(); await w(100);
    const off = !document.querySelector('#hkAddPop .hk-add-chip.on');
    document.querySelector('#hkAddPop .hk-add-chip[data-id="pj2"]').click(); await w(100);
    document.querySelector('#hkAddPop .hk-add-it.exp').click(); await w(400);
    const r = [...document.querySelectorAll('#hkRowEdit .hk-re-group .hk-re-row')].find(x => /پروژه/.test((x.querySelector('.hk-re-rl') || {}).textContent || ''));
    const pj = r ? r.querySelector('.hk-re-rv').textContent : '';
    document.getElementById('hkRowEdit')._hkCancel(); await w(300);
    /* بار بعد پرکاربردتر اول */
    hkHomeAddMenu(btn); await w(200);
    const first = (document.querySelector('#hkAddPop .hk-add-chip') || {}).textContent;
    document.getElementById('hkAddPop')._hkCancel();
    /* بدون پروژه = مثل قبل */
    hkHomeAddMenu(btn); await w(150); document.querySelector('#hkAddPop .hk-add-it.inc').click(); await w(400);
    const r2 = [...document.querySelectorAll('#hkRowEdit .hk-re-group .hk-re-row')].find(x => /پروژه/.test((x.querySelector('.hk-re-rl') || {}).textContent || ''));
    const none = r2 ? r2.querySelector('.hk-re-rv').textContent : '';
    document.getElementById('hkRowEdit')._hkCancel(); await w(200);
    /* منوهای درآمد/مخارج دیگر دکمهٔ افزودن ندارند */
    openPersonDetail(hkMainTitle(), 'expense'); await w(600);
    const fab = !!document.querySelector('.person-detail-panel .row-add-fab, #personDetailPanel .row-add-fab, .row-add-fab');
    try { closePersonDetail(); } catch (e) {}
    return { chips, clear, on, off, pj, first, none, fab };
  });
  ok(ad.chips.join('|') === 'ساختمان آسمان|سهراب' && ad.clear, '«+»: اسم پروژه‌ها بالای «ثبت درآمد/خرج»، بی‌آنکه روی دایرهٔ موجودی بیفتد');
  ok(ad.on === 'pj2' && ad.off, 'زدن اسم پروژه پررنگش می‌کند و زدن دوباره برمی‌گرداند');
  ok(ad.pj === 'سهراب', 'ردیف تازه از قبل مال همان پروژه است (' + ad.pj + ')');
  ok(ad.first === 'سهراب', 'پروژهٔ تازه‌استفاده‌شده بار بعد اول می‌آید');
  ok(ad.none === 'ندارد', 'بدون انتخاب پروژه، ردیف معمولی ساخته می‌شود');
  ok(!ad.fab, 'دکمهٔ افزودن معمولی/پروژه از منوی مخارج برداشته شد');
  await B.ctx.close();

  console.log('• لانگ‌پرس میان‌برها');
  const D = await fresh(b);
  let vib = 0;
  await D.page.exposeFunction('__vib', () => { vib++; });
  await D.page.evaluate(() => { const o = window.appHaptic; window.appHaptic = function () { window.__vib(); try { return o.apply(this, arguments); } catch (e) {} }; window.__go = ''; HK_DOCK_ITEMS.projects.go = () => { window.__go = 'projects'; }; hkRenderDock(); });
  const L = await D.page.locator('#homeDockTop .hk-dock-L').boundingBox();
  await D.page.mouse.move(L.x + L.width / 2, L.y + L.height / 2); await D.page.mouse.down(); await D.page.waitForTimeout(650); await D.page.mouse.up(); await D.page.waitForTimeout(300);
  const dk = await D.page.evaluate(() => {
    const pop = document.querySelector('#hkDockPop .hk-dock-pop'), btn = document.querySelector('#homeDockTop .hk-dock-L');
    const items = [...pop.querySelectorAll('.hk-dock-pi')];
    const pr = pop.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { n: items.length, on: (pop.querySelector('.hk-dock-pi.on') || {}).dataset.k, off: (pop.querySelector('.hk-dock-pi.off') || {}).dataset.k,
      above: pr.bottom <= br.top, jig: btn.classList.contains('hk-dock-jig') && getComputedStyle(btn).animationName === 'hkDockJig', go: window.__go };
  });
  ok(dk.n === 12 && dk.on === 'projects' && dk.off === 'recurring', 'فهرست عمودی همهٔ گزینه‌ها؛ فعلی تیک دارد و میان‌بر سمت دیگر کم‌رنگ است');
  ok(dk.above && dk.jig && dk.go === '', 'فهرست بالای دکمه باز شد، دکمه می‌لرزد و میان‌بر اجرا نشد');
  ok(vib >= 1, 'ویبرهٔ کوتاه موقع باز شدن');
  await D.page.click('#hkDockPop .hk-dock-pi[data-k="ledger"]'); await D.page.waitForTimeout(300);
  const dk2 = await D.page.evaluate(() => ({ k: document.querySelector('#homeDockTop .hk-dock-L').dataset.k, closed: !document.getElementById('hkDockPop'), pref: hkPrefs().dockL }));
  ok(dk2.k === 'ledger' && dk2.pref === 'ledger' && dk2.closed, 'انتخاب از فهرست: میان‌بر همان لحظه عوض شد و فهرست بسته شد');
  await D.page.evaluate(() => { HK_DOCK_ITEMS.ledger.go = () => { window.__go = 'ledger'; }; hkRenderDock(); });
  await D.page.waitForTimeout(500);
  await D.page.click('#homeDockTop .hk-dock-L'); await D.page.waitForTimeout(200);
  ok(await D.page.evaluate(() => window.__go === 'ledger'), 'ضربهٔ کوتاه بعدی مثل قبل میان‌بر را باز می‌کند');
  await D.page.evaluate(() => hkPrefSet('dockL', 'projects'));
  await D.ctx.close();

  console.log('• شخصی‌سازی تازه');
  for (const th of ['dark', 'light']) {
    const F = await fresh(b, th);
    const pf = await F.page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      openPrefsModal(); await w(300);
      const m = document.getElementById('hkPrefsModal');
      const heads = [...m.querySelectorAll('.hk-pf-gh')].map(x => x.textContent);
      const noChk = !m.querySelector('input[type="checkbox"]') && !m.querySelector('.hk-prefs-chip') && !/^بستن$/.test([...m.querySelectorAll('button')].map(x => x.textContent).join('|'));
      const sws = m.querySelectorAll('.hk-pf-sw').length;
      const fit = m.querySelector('.hk-pf').getBoundingClientRect().height <= innerHeight * 0.87;
      /* کلید مخفی کردن مبلغ‌ها */
      m.querySelector('.hk-pf-row[data-k="privacy"]').click(); await w(100);
      const priv = hkPrefs().privacy === true && document.body.classList.contains('hk-privacy');
      m.querySelector('.hk-pf-row[data-k="privacy"] .hk-pf-sw').click(); await w(100);
      const priv2 = !hkPrefs().privacy;
      /* صفحهٔ دوم: صفحهٔ اول */
      m.querySelector('.hk-pf-row[data-k="start"]').click(); await w(250);
      const sub = m.querySelector('.hk-pf-t').textContent;
      m.querySelector('.hk-pf-radio[data-v="expense"]').click(); await w(250);
      const start = hkPrefs().startPage, mainVal = m.querySelector('.hk-pf-row[data-k="start"] .hk-pf-v').textContent;
      hkPrefSet('startPage', 'home');
      /* اسلایدها: خاموش کردن و جابه‌جایی */
      m.querySelector('.hk-pf-row[data-k="slides"]').click(); await w(250);
      const rows = [...m.querySelectorAll('.hk-pf-slides .hk-pf-row')];
      rows.find(r => r.dataset.k === 'jump').querySelector('.hk-pf-sw').click(); await w(100);
      const offJ = (hkPrefs().spOff || []).indexOf('jump') >= 0;
      return { heads, noChk, sws, fit, priv, priv2, sub, start, mainVal, n: rows.length, offJ, x: !!m.querySelector('.hk-pf-x'), back: !!m.querySelector('.hk-pf-back') };
    });
    ok(pf.heads.join('|') === 'نمایش|صفحهٔ خانه|دسته‌ها و حریم|اعلان‌ها' && pf.noChk && pf.sws === 4 && pf.fit, th + ': گروه‌ها با عنوان، کلید روشن/خاموش به‌جای چک‌باکس، بدون دکمه‌های آبی درهم و دکمهٔ «بستن» (' + pf.heads.join('، ') + ')');
    ok(pf.priv && pf.priv2, th + ': «مخفی کردن مبلغ‌ها» با کلید روشن و خاموش می‌شود');
    ok(pf.sub === 'صفحهٔ اول' && pf.start === 'expense' && pf.mainVal === 'مخارج', th + ': صفحهٔ دوم برای انتخاب و برگشت با مقدار تازه');
    ok(pf.n === 11 && pf.offJ && pf.x && pf.back, th + ': صفحهٔ اسلایدها: ۱۱ اسلاید با کلید؛ فلش برگشت و ضربدر');
    /* جابه‌جایی با دستگیره */
    const h = await F.page.locator('#hkPrefsModal .hk-pf-slides .hk-pf-row[data-k="overview"] .hk-pf-hnd').boundingBox();
    await F.page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await F.page.mouse.down();
    await F.page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + 60, { steps: 8 }); await F.page.mouse.up(); await F.page.waitForTimeout(200);
    const ord = await F.page.evaluate(async () => {
      const o = hkPrefs().spOrder || [];
      hkPrefSet('spOff', []);
      const all = hkSpOrderedPages().map(p => p.key);
      const keys = all.filter(k => HK_SP_LABELS[k]);
      return { o, keys, fixed: all[0] === 'warn' && all[all.length - 1] === 'todoAdd', same: keys.join() === hkSpOrderKeys().join() };
    });
    ok(ord.o[0] !== 'overview' && ord.o.indexOf('overview') > 0, th + ': کشیدن دستگیره ترتیب اسلایدها را عوض کرد (' + ord.o.slice(0, 3).join(',') + ')');
    ok(ord.same && ord.fixed && ord.keys[0] !== 'overview', th + ': باکس هوشمند به همان ترتیب تازه ساخته می‌شود؛ هشدار اول و «+» آخر می‌مانند (' + ord.keys.slice(0, 3).join(',') + ')');
    await F.ctx.close();
  }

  console.log('• قرض: کادر اسم دو نفر نمی‌پرد');
  const G = await fresh(b);
  const lg = await G.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger(); led.sections = [];
    for (let s = 0; s < 2; s++) { const rows = []; for (let i = 0; i < 5; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 100000 * (i + 1), ly: currentYear, lm: currentMonth })); led.sections.push({ id: 'S' + s, personA: 'من', personB: 'نفر ' + s, collapsed: true, rows }); }
    persistCurrent(); touchLocal(); await saveArchive(); openFeatureSheet('ledger'); await w(1800);
    const sec = document.querySelector('#sections-ledger .section[data-sec-id="S1"]'), hdr = sec.querySelector('.section-header');
    const seen = new Set(); let run = true;
    const snap = () => { const t = hdr.querySelector('.title-wrap').getBoundingClientRect(), d = hdr.querySelector('.title-display').getBoundingClientRect(); seen.add([t.width, t.height, d.width, d.height].map(v => Math.round(v)).join('/')); };
    const tick = () => { snap(); if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); hdr.click(); await w(800); hdr.click(); await w(800); run = false;
    return [...seen];
  });
  ok(lg.length === 1, 'باز و بسته شدن رابطه: اندازهٔ کادر اسم ثابت می‌ماند (' + lg.join(' ، ') + ')');
  await G.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1371: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
