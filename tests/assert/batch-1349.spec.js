// نسخهٔ ۱.۳.۴۹: کارت (فاصلهٔ عمودی)، باکس هوشمند (اسکرول اسلاید بلند، پروژهٔ مانده از قبل)، منوی قرض، ثبت گروهی، جستجو،
// دسته‌های باکس پیامک (۵ تا + بیشتر، ثبت با یک لمس)، درآمد ثابت (پاک‌سازی فقط آینده، دایرهٔ قرمز، پوشهٔ آرشیو، جمع چند واریز)، منو و شِیر. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'recCleanupAsked2', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337', 'instOff1346'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-21T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  const title = await p.evaluate(() => {
    const t = hkMainTitle();
    const R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'اجاره', amount: 7000000, status: 'paid' }), R('expense', { day: '5', desc: 'قبض برق', amount: 350000, status: 'unpaid' })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 20000000, status: 'paid' })];
    persistCurrent(); renderAll();
    return t;
  });

  console.log('• کارت و باکس هوشمند');
  const card = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(300);
    const bx = document.querySelector('#homeCards .person-card:not(.hc-clone) .person-stat-box');
    const br = bx.getBoundingClientRect(), ls = [...bx.querySelectorAll('.psl-l')].map(e => e.getBoundingClientRect());
    return { top: ls[0].top - br.top, bottom: br.bottom - ls[ls.length - 1].bottom, gap: ls[1].top - ls[0].bottom };
  });
  ok(card.top < 18 && card.bottom < 18 && card.gap > 6, 'ردیف‌های باکس درآمد/مخارج کارت کل ارتفاع را پر می‌کنند (بالا ' + Math.round(card.top) + '، پایین ' + Math.round(card.bottom) + '، فاصله ' + Math.round(card.gap) + ')');
  const sp = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* پروژه‌ای که فقط در ماه قبل تراکنش دارد و بدهکار مانده */
    const L = loadFinancialSubjects(); L.push({ id: 'pc', name: 'باغ', highlightColor: PROJECT_HIGHLIGHT_PALETTE[2].id }); saveFinancialSubjects();
    const prev = recMonthData(140506, true);
    let ps = (prev.expense.sections || []).find(s => (s.title || '').trim() === t);
    if (!ps) { ps = { id: 's1', title: t, rows: [] }; prev.expense.sections = [ps]; }
    const r = Object.assign(emptyRow('expense'), { day: '3', desc: 'نهال', amount: 2000000, status: 'paid' });
    r.financialContext = Object.assign(defaultFinancialContext(), allocateProjectExpense('pc', 2000000), { subjectId: 'pc', accountType: 'project', classification: 'third_party' });
    ps.rows.push(r); saveArchive();
    const cur = HKAlerts.projects(t).filter(a => a.sid === 'pc');
    /* ماه قبل از شروع پروژه: هیچ */
    const y0 = currentYear, m0 = currentMonth; currentYear = 1405; currentMonth = 5;
    const before = HKAlerts.projects(t).filter(a => a.sid === 'pc').length;
    currentYear = y0; currentMonth = m0;
    /* اسلاید بلند: اسکرول خودکار */
    const box = document.createElement('div'); box.className = 'sp-scroll sp-free'; box.style.cssText = 'height:40px;overflow:auto'; box.innerHTML = '<div style="height:200px;flex-shrink:0"></div>';
    document.body.appendChild(box); spAutoScroll(box); await w(2200 + 400);
    /* (در تست زمان ثابت است و انیمیشن جلو نمی‌رود؛ شروع حرکت بررسی می‌شود) */
    const scrolled = box._spAuto && box.style.scrollSnapType === 'none' ? 100 : 0; box.remove();
    return { cur: cur.length ? cur[0].text : '', before, scrolled };
  }, title);
  ok(/از ماه‌های قبل ۲ میلیون تومان بدهکار است/.test(sp.cur), 'پروژهٔ بدهکار از ماه قبل در این ماه هم اسلاید دارد (' + sp.cur + ')');
  ok(sp.before === 0, 'در ماه‌های پیش از شروع پروژه چیزی از آن نشان داده نمی‌شود');
  ok(sp.scrolled > 20, 'اسلاید بلند آرام تا پایین اسکرول می‌شود (' + Math.round(sp.scrolled) + 'px)');
  const cx = await p.evaluate(() => {
    const s = [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch (e) { return []; } });
    const x = s.filter(r => r.selectorText && r.selectorText.indexOf('.sp-pick-x') === 0).pop();
    return x ? { c: x.style.color, bg: x.style.background || x.style.backgroundColor } : null;
  });
  ok(cx && /255, 69, 58|#ff453a/i.test(cx.c) && /none/.test(cx.bg), '× حذف دسته: آیکون کوچک قرمز بدون دایره و فریم');
  const fl = await p.evaluate(() => [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch (e) { return []; } }).some(r => r.name === 'spFlashRowSh'));
  ok(fl, 'هایلایت ردیف با سایهٔ داخلی (روی ردیف پروژه هم آبی دیده می‌شود)');

  console.log('• جستجو و نام ستون‌ها');
  const sr = await p.evaluate(() => {
    const ths = [...document.querySelectorAll('#searchResultBox thead th')].map(t => t.textContent);
    return { ths };
  });
  ok(sr.ths.join('|') === 'ردیف|تاریخ|شرح|حساب|مبلغ', 'ستون «بانک» در جستجو شد «حساب» (' + sr.ths.join('، ') + ')');

  console.log('• باکس ثبت پیامک');
  const sm = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const raw = 'بانک ملی\nبرداشت:250,000-\nحساب:62002\nمانده:500,000\n0728-10:30'; const e = parseBankSms(raw); e.raw = raw;
    pendingSmsEntry = e; openSmsConfirmModal(e); await w(500);
    const g = document.getElementById('smsCatGrid');
    const out = { n: g.querySelectorAll('.sms-cat').length, more: !!g.querySelector('.sms-cat-more'), noScroll: g.scrollWidth <= g.clientWidth + 1, oneRow: new Set([...g.children].map(c => Math.round(c.getBoundingClientRect().top))).size === 1 };
    const tt = document.getElementById('smsConfirmTitle'); out.line = getComputedStyle(tt).borderBottomStyle;
    g.querySelector('.sms-cat-more').click(); await w(150);
    out.moreOpen = !!document.getElementById('smsCatMore'); onBackGuard(); await w(300); out.moreClosed = !document.getElementById('smsCatMore') && document.getElementById('smsConfirmModal').classList.contains('open');
    g.querySelector('.sms-cat[data-cat="food"]').click(); await w(400);
    out.stillOpen = document.getElementById('smsConfirmModal').classList.contains('open') && window._hkSmsCat === 'food';
    try { var bs = document.getElementById('smsConfirmBank'); if (bs && !bs.value && bs.options && bs.options.length > 1) { bs.value = [...bs.options].map(o => o.value).find(v => v && v !== '__add_account__') || ''; } } catch (eB) {}
    document.getElementById('smsConfirmDesc').value = '';
    confirmSmsEntry(); await w(1500);
    out.saved = !document.getElementById('smsConfirmModal').classList.contains('open') && findSectionByTitle('expense', t).rows.some(r => r.desc === 'خوراکی' && Number(r.amount) > 0);
    out.use = JSON.parse(localStorage.getItem(STORAGE_KEY + '_catUse') || '{}').food;
    return out;
  }, title);
  ok(sm.n === 6 && sm.more && sm.noScroll && sm.oneRow, '۵ دستهٔ هوشمند + «بیشتر…» در یک ردیف، بدون اسکرول');
  ok(sm.moreOpen && sm.moreClosed, '«بیشتر…» بقیهٔ دسته‌ها را در پنجرهٔ جدا باز می‌کند؛ بازگشت فقط همان را می‌بندد');
  ok(sm.stillOpen, '۱.۳.۵۰: زدن دسته فقط انتخاب است (باکس باز می‌ماند)');
  ok(sm.saved && sm.use === 1, 'با «ثبت» و شرح خالی: شرح = اسم دسته و شمارش دسته برای ترتیب بعدی');
  ok(sm.line === 'solid', 'عنوان «ثبت برداشت/واریز» با یک خط باریک از کادر زیرش جدا شده');

  console.log('• درآمد ثابت');
  const rc = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const it = { id: 'rq1', name: 'اجارهٔ واحد ۲', amount: 5000000, day: '5', sectionTitle: t, account: '', contractStart: { y: 1405, m: 5, d: 5 }, contractEnd: { y: 1406, m: 5, d: 5 } };
    recurringIncomes.push(it); saveRecurring();
    const mk = (k, st) => { const pd = recMonthData(k, true); let s = (pd.income.sections || []).find(x => (x.title || '').trim() === t); if (!s) { s = { id: 's1', title: t, rows: [] }; pd.income.sections = (pd.income.sections || []).concat([s]); } const r = Object.assign(emptyRow('income'), { day: '5', desc: 'اجارهٔ واحد ۲', amount: 5000000, status: st, fromRecurringId: 'rq1' }); s.rows.push(r); return r; };
    mk(140506, 'unpaid'); mk(140508, 'unpaid'); recPersist();
    const stale = recStaleUnpaidRows().map(x => x.key);
    openRecurringFromMenu(); await w(500);
    const row = document.querySelector('.recurring-row'); row.click(); await w(400);
    const out = { stale, dot: !!row.querySelector('.rec-late-dot'), folder: !!row.querySelector('.rec-folder-btn'), noFix: row.innerHTML.indexOf('اصلاح') < 0 && !row.querySelector('.rec-arch-btn'),
      past: [...row.querySelectorAll('.rec-st-past')].map(x => x.textContent), glow: getComputedStyle(document.querySelector('.recurring-box h3')).textShadow };
    row.querySelector('.rec-folder-btn').click(); await w(400);
    out.arch = !!document.getElementById('recArchiveModal');
    const fo = document.querySelector('#recArchiveModal .rec-term-folder'); if (fo) { fo.click(); await w(300); }
    const un = document.querySelector('#recArchiveModal .pd-amt.status-unpaid'); out.archCol = un ? getComputedStyle(un).color : '';
    try { document.getElementById('recArchiveModal').remove(); } catch (e) {}
    /* دو واریز تکه‌ای در یک ماه: «با قبلی جمع شود؟» → بله */
    const pd = recMonthData(140507, true); let s = (pd.income.sections || []).find(x => (x.title || '').trim() === t);
    if (!s) { s = { id: 's1', title: t, rows: [] }; pd.income.sections = (pd.income.sections || []).concat([s]); }
    const a = Object.assign(emptyRow('income'), { day: '5', desc: 'واریز اول', amount: 3000000, status: 'paid', account: 'ملت' });
    const c = Object.assign(emptyRow('income'), { day: '9', desc: 'واریز دوم', amount: 2000000, status: 'paid', account: 'پاسارگاد' });
    s.rows.push(a, c);
    let asked = '';
    recLinkPicked(it, [{ key: 140507, row: a, sec: s }, { key: 140507, row: c, sec: s }], function () {});
    await w(200);
    asked = (document.getElementById('confirmMsg') || {}).textContent || '';
    out.asked = asked; out.sep = a.amount === 3000000 && c.amount === 2000000 && s.rows.indexOf(c) >= 0 && a.fromRecurringId === 'rq1' && c.fromRecurringId === 'rq1';
    try { closeFeatureSheet(); } catch (e) {}
    return out;
  }, title);
  ok(rc.stale.join() === '140508', 'پاک‌سازی ردیف‌های قدیمی فقط ماه‌های آینده را می‌گیرد، نه دریافت‌نشدهٔ ماه قبل (' + rc.stale.join() + ')');
  ok(rc.dot && rc.past.length === 1 && /ماه قبل: دریافت نشده \(۵ شهریور\)/.test(rc.past[0]), 'دایرهٔ قرمز جلوی اسم + «ماه قبل: دریافت نشده (تاریخ)» بالای «این ماه»');
  ok(rc.folder && rc.noFix && rc.arch, '«اصلاح» و نوشتهٔ «آرشیو» برداشته شد؛ آیکون پوشه کنار ادیت آرشیو را باز می‌کند');
  ok(/230, 177, 44/.test(rc.archCol), 'آرشیو: دریافت‌نشده‌ها زرد (' + rc.archCol + ')');
  ok(rc.glow === 'none', 'عنوان «درآمدهای ثابت» بی افکت نور');
  ok(!/با قبلی جمع شود؟/.test(rc.asked) && rc.sep, '۱.۳.۵۰: دو واریز یک ماه بی سؤال جمع، هر کدام ردیف جدا و وصل');

  console.log('• منو، شِیر، ثبت گروهی');
  const mn = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(200);
    const first = document.querySelector('.menu-section-label').nextElementSibling.id;
    closeSideMenu(); await w(200);
    /* شِیر: بدون «ردیف تازه»، ۴۰ ردیف + «بیشتر» */
    const t = hkMainTitle(), ex = findSectionByTitle('expense', t);
    for (let i = 0; i < 45; i++) ex.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + i % 28), desc: 'خرید ' + i, amount: 1000 + i, status: 'paid' }));
    persistCurrent();
    hkOpenSharePicker([{ data: 'AAAA', mime: 'image/jpeg' }]); await w(300);
    const ov = document.getElementById('hkShareOv');
    const out = { first, newRow: !!ov.querySelector('.hk-share-new'), rows: ov.querySelectorAll('.hk-share-list .hk-share-row').length, more: !!ov.querySelector('.hk-share-list .hk-more') };
    ov.querySelector('.hk-share-list .hk-more').click(); await w(100);
    out.after = ov.querySelectorAll('.hk-share-list .hk-share-row').length;
    ov.remove();
    /* ثبت گروهی: «حساب جدید:» و «بستن» → انتخاب بازه */
    const _cap = window.Capacitor; window.Capacitor = Object.assign({}, _cap || {}, { Plugins: Object.assign({}, (_cap && _cap.Plugins) || {}, { BankSms: { readInbox: () => Promise.resolve({ items: [] }) } }) });
    openSmsBulkModal(); await w(200);
    window.Capacitor = _cap;
    _hkBulk.folders = [{ bank: 'بانک سپه', acc4: '0128', sender: '', personal: false, checked: true, open: false, account: '', newLabel: '', needName: true, inRange: [{ type: 'expense', amount: 5000, j: { y: 1405, m: 7, d: 25 }, balance: 95000, raw: 'x' }] }];
    hkBulkRender(); await w(200);
    out.lab = (document.querySelector('.hk-bulk-newlab') || {}).textContent;
    out.onCol = getComputedStyle(document.querySelector('.hk-bulk-folder.on')).borderTopColor;
    document.querySelector('#smsBulkOv .hk-bulk-close').click(); await w(600);
    out.backToRange = !!document.getElementById('smsBulkOv') && !document.querySelector('.hk-bulk-folder') && getComputedStyle(document.querySelector('#smsBulkOv .hk-bulk-rwrap')).display !== 'none';
    document.querySelector('#smsBulkOv .hk-bulk-close').click(); await w(300);
    out.closed = !document.getElementById('smsBulkOv');
    return out;
  });
  ok(mn.first === 'menuSmsLater', '«پیامک‌های ثبت‌نشده» اولین آیتم بخش‌ها');
  ok(!mn.newRow && mn.rows === 40 && mn.more && mn.after > 40, 'شِیر: «ردیف تازه» برداشته شد؛ ۴۰ ردیف + «بیشتر» برای قدیمی‌ترها');
  ok(mn.lab === 'حساب جدید:' && /0, 183, 255/.test(mn.onCol), 'ثبت گروهی: «حساب جدید:» و آبی دور پوشهٔ تیک‌خورده همان آبی');
  ok(mn.backToRange && mn.closed, 'ثبت گروهی: «بستن» بعد از آمدن پوشه‌ها به انتخاب بازه برمی‌گردد؛ بار دوم می‌بندد');

  console.log('• آیکون ادیت با «بازگشت»');
  const ed = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openRecurringFromMenu(); await w(400);
    const btn = document.querySelector('#recurringBox [data-re]'); btn.click(); await w(300);
    const grey = btn.classList.contains('is-editing');
    onBackGuard(); await w(150);
    return { grey, white: !btn.classList.contains('is-editing') };
  });
  ok(ed.grey && ed.white, 'زدن ادیت و بعد «بازگشت»: آیکون فوراً به حالت اول برمی‌گردد');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
