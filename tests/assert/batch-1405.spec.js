// ۱.۴.۵: منوی همبرگری خلوت (ردیف هر قسمت + صفحهٔ همان قسمت)، صفحهٔ اول (تاریخ برجسته بالای صفحه، فاصله‌های یکسان)،
// مربع آبی «افزودن»، آیکون‌های ویرایش/حذف یک‌جا، دُنگ (خرج در صفحه، خرج کل ثابت، اشتراک‌گذاری روی کارت، جای لمس + و −)،
// «دسته‌بندی برداشت» (زدن روی شرح، تم روز)، آمار بی چشمک، ویجت کپسولی و ویجت تراکنش‌ها. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const fs = require('fs'), path = require('path');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی ویجت‌ها');
  const pa = androidSource();
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/static int capColor\(int pct, boolean light\)/.test(pa) && /if\(pct<15\) return expC\(light\)/.test(pa) && /if\(pct<30\) return 0xFFFF9F0A/.test(pa) && /if\(pct<50\)/.test(pa), 'کپسول: زیر ۵۰ زرد، زیر ۳۰ نارنجی، زیر ۱۵ قرمز، وگرنه سبز');
  ok(/d\.pct=\(!sp\.contains\("balRaw"\) \|\| base<=0\) \? -1/.test(pa) && /monthSpentRaw/.test(pa), 'درصد = موجودی از «موجودی + خرج‌های پرداخت‌شدهٔ ماه»؛ بی داده = کپسول خالی');
  ok(/R-w\*0\.15f, L\+w\*0\.41f, L\+w\*0\.23f/.test(pa) && /Paint\.Align\.RIGHT\);\s*fitSize\(pd, date/.test(pa) && /Paint\.Align\.LEFT\);\s*fitSize\(pa, amount/.test(pa), 'ویجت تراکنش‌ها: شرح پهن‌تر، تاریخ راست‌چین، مبلغ چپ‌چین');
  ok(/\(pc&0x00FFFFFF\)\|0x59000000/.test(pa) && /o\.optString\("p", null\)/.test(pa), 'ردیف پروژه در ویجت با ۳۵٪ همان رنگ هایلایت پروژه');
  ok(/hk_wt_eye2/.test(pa) && /hk_w_eye2/.test(pa) && /android:id="@\+id\/hk_wt_eye2"/.test(patch) && /android:id="@\+id\/hk_w_eye2"/.test(patch), 'چشم ویجت: جای لمس بزرگ‌تر و تاریخ کنار آن هم همان کار');
  ok((patch.match(/android:targetCellWidth="5"/g) || []).length === 4, 'ویجت‌ها تا آخرین ستون صفحه پهن می‌شوند');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const t = hkMainTitle(); const R = (tab, o) => Object.assign(emptyRow(tab), o);
    const l = loadFinancialSubjects(); l.push({ id: 's1', name: 'ساختمان', highlightColor: 'purple' }); _financialSubjects = l; saveFinancialSubjects();
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'بنزین', amount: 400000, status: 'paid' }), R('expense', { day: '3', desc: 'تاکسی', amount: 100000, status: 'paid' }), R('expense', { day: '4', desc: 'نان', amount: 50000, status: 'paid' }),
      R('expense', { day: '5', desc: 'سیمان', amount: 900000, status: 'paid', financialContext: { subjectId: 's1', accountType: 'project', classification: 'third_party', fundingSource: 'subject' } })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 42000000, status: 'paid' })];
    const sv = loadSavings(); sv.items.push({ id: 'a1', asset: 'usd', qty: 1200, buy: 95000, y: 1405, m: 3, d: 12, note: '' }); saveSavings();
    loadUserReminders(); userReminders.push({ id: 'u1', title: 'بیمه', d: 20, m: 9, y: 1405, repeat: 'none', advanceDays: 7, note: '', lastNotified: '' }); saveUserReminders();
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: Array.from({ length: 9 }, (x, i) => ({ id: 'e' + i, desc: 'شام ' + i, amount: 300000, payer: 'a', shares: { a: 150000, b: 150000 }, mode: 'eq', y: 1405, m: 8, d: 1, at: i })), settles: [] }] });
    const led = ensureLedger(); led.sections = [{ id: 'L0', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '2', desc: 'شام', amount: 250000, ly: currentYear, lm: currentMonth })] }];
    recurringIncomes.push({ id: 'r1', name: 'اجاره', amount: 1000000, deposit: 0, day: '5', account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140501, genKey: 140500 }); saveRecurring();
    persistCurrent(); renderAll();
  });
  await page.waitForTimeout(800);

  console.log('• صفحهٔ اول');
  const H = await page.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const bar = r('#stickyChrome .top-bar'), cards = r('#homeCardsWrap'), sm = r('#homeSmartBox'), dock = r('#homeDock'), ln = document.getElementById('hkTodayLine'), lr = ln.getBoundingClientRect(), c = getComputedStyle(ln);
    return { gaps: [cards.top - bar.bottom, sm.top - cards.bottom, dock.top - sm.bottom].map(Math.round), hs: [bar.height, cards.height, sm.height, dock.height].map(Math.round), dateAbove: lr.bottom <= bar.top + 1 && lr.top >= 0, mid: Math.abs((lr.top + lr.bottom) / 2 - bar.top / 2), color: c.color, shadow: c.textShadow !== 'none', bg: c.backgroundColor, bottom: Math.round(innerHeight - dock.bottom), fits: ln.scrollWidth <= ln.clientWidth + 1 };
  });
  ok(H.dateAbove && H.mid <= 3 && H.fits, 'تاریخ شمسی/میلادی بالای صفحه، وسط فاصلهٔ لبهٔ بالا تا ردیف همبرگری/ماه/سال');
  ok(H.color === 'rgb(8, 181, 245)' && H.bg === 'rgba(0, 0, 0, 0)', 'تاریخ: آبیِ برجسته با سایه، بی باکس');
  ok(H.gaps[0] === H.gaps[1] && H.gaps[1] === H.gaps[2] && H.gaps[0] >= 10, 'فاصلهٔ عمودی چهار ردیف باکس‌ها یکسان (' + H.gaps.join(' / ') + ')');
  ok(H.hs[0] === 42 && Math.abs(H.hs[1] - H.hs[2]) <= 1 && Math.abs(H.hs[2] - H.hs[3]) <= 1 && H.bottom >= 6 && H.bottom <= 12, 'ردیف بالا ۴۲ و سه باکس هم‌ارتفاع؛ حاشیهٔ پایین مثل قبل (' + H.hs.join(' / ') + ' ، ' + H.bottom + ')');

  console.log('• منوی همبرگری خلوت');
  const M = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => !!e && e.getClientRects().length > 0;
    openSideMenu(); await w(700);
    const dd = document.getElementById('menuDropdown'), o = {};
    const rows = [...dd.querySelectorAll('.hk-mgr')].filter(vis);
    o.rows = rows.map(x => x.querySelector('b').textContent);
    o.sub = rows[0].querySelector('small').textContent;
    o.itemsHidden = ![...dd.querySelectorAll('.hk-mg-box > .menu-item')].some(vis);
    o.keep = vis(document.getElementById('menuUserName')) && vis(dd.querySelector('.hk-msearch'));
    rows[0].click(); await w(500);
    const its = [...dd.querySelectorAll('.hk-mg[data-g="sections"] .hk-mg-box > .menu-item')].filter(vis);
    o.inside = its.map(x => x.textContent.trim());
    o.lines = its.slice(1).every(x => parseFloat(getComputedStyle(x).borderTopWidth) >= 1);
    o.head = (dd.querySelector('.hk-mg-on .hk-mgh span') || {}).textContent; o.otherGone = ![...dd.querySelectorAll('.hk-mgr')].some(vis);
    onBackGuard(); await w(500);
    o.back = dd.classList.contains('open') && [...dd.querySelectorAll('.hk-mgr')].filter(vis).length === rows.length;
    hkMenuGroupEnter('sections'); await w(400); its[0].click(); await w(1300);
    o.opens = document.getElementById('featureSheet').classList.contains('open');
    onBackGuard(); await w(900);
    try { closeSideMenu(); } catch (e) {} await w(500);
    return o;
  });
  ok(M.rows.join('|') === 'بخش‌ها|حساب‌ها و پیامک|پشتیبان و داده|گزارش‌ها|تنظیمات|درباره' && M.itemsHidden, 'منو: فقط شش ردیف کلی (' + M.rows.length + ')');
  ok(/درآمدهای ثابت، پروژه‌ها، قرض/.test(M.sub) && M.keep, 'زیر هر ردیف نام چند منو با طوسی؛ باکس نام کاربر و جستجو سر جایشان');
  ok(M.inside.length === 6 && M.inside[0] === 'درآمدهای ثابت' && M.lines && M.head === 'بخش‌ها' && M.otherGone, 'زدن ردیف = صفحهٔ همان قسمت با همهٔ گزینه‌ها و خط باریک بینشان');
  ok(M.back, 'بک گوشی به فهرست قسمت‌ها برمی‌گردد (منو باز می‌ماند)');
  ok(M.opens, 'گزینه‌های داخل قسمت مثل قبل کار می‌کنند');

  console.log('• مربع آبی «افزودن» و جای آیکون‌ها');
  const F = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => !!e && e.getClientRects().length > 0;
    const out = {};
    const icons = (card, del, edit) => { const c = [...document.querySelectorAll(card)].find(vis); if (!c) return null; const cr = c.getBoundingClientRect(); const p = s => { const e = c.querySelector(s), r = e.getBoundingClientRect(); return [Math.round(r.left + r.width / 2 - cr.left), Math.round(r.top + r.height / 2 - cr.top - cr.height / 2)]; }; return [p(del), p(edit)]; };
    for (const [n, f, id, card, del, edit] of [['proj', openSubjectsModal, 'subjectsModal', '.project-card', '.btn-del-row', '.btn-edit-title'], ['sav', openSavingsModal, 'savingsModal', '.hk-sv-card', '.btn-del-row', '.btn-edit-title'], ['rem', openUserRemindersModal, 'userRemindersModal', '.ur-item', '.ur-del', '.ur-edit'], ['dong', openDongModal, 'hkDong', '.hk-dg-card', '.hk-dg-del', '.hk-dg-edit']]) {
      f(); await w(1100);
      const pg = document.getElementById(id), fab = pg.querySelector(':scope > .hk-fab'), r = fab && fab.getBoundingClientRect();
      out[n] = { fab: vis(fab) && Math.round(innerWidth - r.right) === 21 && innerHeight - r.bottom >= 10 && innerHeight - r.bottom <= 30 && Math.round(r.width) === 58, label: fab && fab.getAttribute('aria-label'), newf: [...pg.querySelectorAll('.hk-newf')].some(vis), ic: icons('#' + id + ' ' + card, del, edit), bg: fab && /inset/.test(getComputedStyle(fab).boxShadow) };
      if (n !== 'dong') { onBackGuard(); await w(700); }
    }
    /* دُنگ: اشتراک‌گذاری روی کارت، بعد داخل گروه */
    const shr = document.querySelector('#hkDong .hk-dg-card .hk-dg-shr'); shr.click(); await w(300);
    out.share = [...document.querySelectorAll('#hkDongShareMenu button')].map(x => x.textContent.trim()).join('|');
    onBackGuard(); await w(400);
    document.querySelector('#hkDong .hk-dg-card').click(); await w(900);
    const pg = document.getElementById('hkDong'), box = pg.querySelector('.modal-box'), fab = pg.querySelector(':scope > .hk-fab');
    out.grp = { label: fab.getAttribute('aria-label'), acts: vis(pg.querySelector('.hk-dg-acts')) };
    box.scrollTop = 200; await w(200);
    const sum = pg.querySelector('.hk-dg-sum').getBoundingClientRect(), hd = pg.querySelector('.hk-pg-hd').getBoundingClientRect();
    out.grp.sticky = box.scrollTop > 100 && Math.abs(sum.top - hd.bottom) <= 2;
    fab.click(); await w(1200);
    const ed = document.getElementById('hkDongEd');
    out.exp = { page: !!ed && ed.classList.contains('hk-page') && Math.round(ed.getBoundingClientRect().height) === innerHeight };
    ed.querySelector('.hk-dg-seg [data-v="uneq"]').click(); await w(500);
    const pb = ed.querySelector('.hk-dg-wplus').getBoundingClientRect();
    out.exp.touch = [Math.round(pb.width), Math.round(pb.height)];
    onBackGuard(); await w(700); onBackGuard(); await w(700); onBackGuard(); await w(700);
    /* قرض و درآمد ثابت */
    openFeatureSheet('ledger'); await w(1200);
    let fs = document.getElementById('featureSheet');
    out.led = { fab: vis(fs.querySelector(':scope > .hk-fab')), label: fs.querySelector(':scope > .hk-fab').getAttribute('aria-label'), top: vis(document.getElementById('featureSheetAdd')) };
    const n0 = ensureLedger().sections.length;
    document.querySelector('#sections-ledger .section > .section-header').click(); await w(1300);
    /* ۱.۴.۸: در صفحهٔ رابطه «ردیف جدید» همان مربع آبیِ گوشهٔ صفحه است */
    const rf = fs.querySelector(':scope > .hk-fab'), rr = rf.getBoundingClientRect();
    out.led.row = [Math.round(rr.width), Math.round(rr.height), true];
    onBackGuard(); await w(800);
    openRecurringFromMenu(); await w(1200);
    out.rec = { fab: vis(fs.querySelector(':scope > .hk-fab')), label: fs.querySelector(':scope > .hk-fab').getAttribute('aria-label'), top: vis(document.getElementById('featureSheetAdd')), ic: icons('.recurring-row', '.btn-del-row', '.btn-edit-title') };
    onBackGuard(); await w(800);
    out.gone = !vis(fs.querySelector(':scope > .hk-fab'));
    return out;
  });
  ok(['proj', 'sav', 'rem', 'dong'].every(k => F[k].fab && !F[k].newf && F[k].bg), 'پروژه‌ها، پس‌انداز، یادآور و دُنگ: مربع آبی گوشهٔ پایین راست؛ فیلد «… جدید» نیست');
  ok(F.proj.label === 'پروژه جدید' && F.sav.label === 'پس‌انداز جدید' && F.rem.label === 'یادآور جدید' && F.dong.label === 'گروه جدید' && F.grp.label === 'خرج جدید', 'هر مربع کار همان صفحه را می‌کند');
  ok(F.led.fab && !F.led.top && F.led.label === 'رابطهٔ جدید' && F.rec.fab && !F.rec.top && F.rec.label === 'درآمد ثابت جدید' && F.gone, 'قرض و درآمد ثابت: «+» بالای صفحه برداشته شد و مربع پایین آمد');
  ok(F.led.row[0] === 58 && F.led.row[1] === 58, 'قرض: «ردیف جدید» داخل رابطهٔ باز همان مربع آبی گوشهٔ صفحه (' + F.led.row.slice(0, 2).join('×') + ')');
  const icAll = ['proj', 'sav', 'rem', 'dong', 'rec'].map(k => F[k].ic);
  ok(icAll.every(i => i && i[0][0] === (i === F.dong.ic ? 22 : 26) && i[1][0] === (i === F.dong.ic ? 58 : 62) && i[0][1] <= -15 && i[1][1] <= -15), 'آیکون حذف و ویرایش روی همهٔ باکس‌ها (۱.۴.۱۲: ردیف نام، بالا، مثل قرض)، ۲۶ و ۶۲ پیکسل از لبهٔ چپ (' + JSON.stringify(icAll) + ')');
  ok(F.share === 'متن|عکس|PDF' && !F.grp.acts, 'دُنگ: اشتراک‌گذاری از روی کارت گروه؛ دکمه‌های پایین گروه نیستند');
  ok(F.grp.sticky, 'دُنگ: «خرج کل» بالا ثابت می‌ماند');
  ok(F.exp.page && F.exp.touch[0] === 26 && F.exp.touch[1] === 30, 'دُنگ: خرج در صفحهٔ کامل؛ جای لمس «+/−» فقط دور علامت (' + F.exp.touch.join('×') + ')');

  console.log('• دسته‌بندی برداشت، آمار، یادآور');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    openCategoryReviewSheet(hkMainTitle()); await w(1000);
    const row = [...document.querySelectorAll('.sp-cat-sheet .sp-cat-row')].find(x => /بنزین/.test(x.textContent));
    row.querySelector('.sp-cat-desc').click(); await w(1200);
    const tx = document.getElementById('hkStCatTx');
    o.tx = tx ? [...tx.querySelectorAll('.hk-acctx-r:not(.hk-acctx-h) .t')].map(x => x.textContent.trim()).sort().join('|') : '';
    o.tot = tx ? getComputedStyle(tx.querySelector('.hk-stcat-tot')).color : '';
    onBackGuard(); await w(800);
    row.querySelector('.sp-cat-chips').click(); await w(700);
    o.pick = !!document.querySelector('.sp-cat-sheet')._spPicking;
    onBackGuard(); await w(500);
    document.documentElement.setAttribute('data-theme', 'light');
    o.light = getComputedStyle(document.querySelector('.sp-cat-sheet .sp-cat-desc')).color;
    document.documentElement.removeAttribute('data-theme');
    onBackGuard(); await w(800);
    openStatsSheet(); await w(1200);
    const bd = document.getElementById('statsBody');
    [...bd.querySelectorAll('.st-seg button')].find(x => !x.classList.contains('on')).click();
    const g = document.querySelector('.st-turn-ghost');
    o.ghostAnim = [...g.querySelectorAll('*')].every(x => getComputedStyle(x).animationName === 'none');
    await w(800); onBackGuard(); await w(800);
    return o;
  });
  ok(C.tx === 'بنزین|تاکسی' && C.tot === 'rgb(255, 107, 74)', 'زدن روی یک شرح = همهٔ خرج‌های همان دسته (' + C.tx + ')؛ جمع نارنجی');
  ok(C.pick, 'زدن روی نام دسته مثل قبل انتخاب دسته را باز می‌کند');
  ok(C.light !== 'rgb(255, 255, 255)', '«دسته‌بندی برداشت» در تم روز خوانا (' + C.light + ')');
  ok(C.ghostAnim, 'آمار: کپی تب قبلی انیمیشن نمودار را دوباره اجرا نمی‌کند (بی چشمک)');
  const css = fs.readFileSync(INDEX.replace('file://', ''), 'utf8');
  ok(/@keyframes urHl145\s*\{\s*0%\s*\{\s*outline-color:\s*transparent/.test(css), 'قاب آبی یادآور نرم ظاهر می‌شود');

  console.log('• ردیف‌های ویجت');
  const W = await page.evaluate(() => { hkPrefSet('sort', 'old'); return hkWidgetTxRows('expense').map(x => x.t + ':' + (x.p || '')); });
  ok(W.join('|') === 'بنزین:|تاکسی:|نان:|سیمان:#d000ff', 'ردیف پروژه رنگ هایلایت خودش را به ویجت می‌دهد (' + W.join('، ') + ')');

  await b.close();
  const errs = allErrors.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'بدون خطای JS (' + errs.slice(0, 3).join(' | ') + ')');
  console.log('\n' + passed + ' موفق، ' + failed + ' ناموفق');
  process.exit(failed ? 1 : 0);
})();
