// نسخهٔ ۱.۳.۴۸: رنگ زرد پرداخت/دریافت‌نشده، اسکرول ease-in-out، اسلاید پروژه‌ها (هر پروژه یک نما)، رفتن اسلایدها به ردیف/تب مرتبط،
// حذف دسته با ×، پنجرهٔ پروفایل، PDF/Excel بدون اقساط و ستون «نام» درآمد ثابت، باکس ویرایش ردیف (معمولی/پروژه). فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337', 'instOff1346'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-21T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  const title = await p.evaluate(() => {
    const t = hkMainTitle();
    const R = (tab, o) => Object.assign(emptyRow(tab), o);
    const L = loadFinancialSubjects();
    L.push({ id: 'pa', name: 'اشترانکوه', highlightColor: PROJECT_HIGHLIGHT_PALETTE[1].id });
    L.push({ id: 'pb', name: 'سفر شمال', highlightColor: PROJECT_HIGHLIGHT_PALETTE[3].id });
    saveFinancialSubjects();
    const fc = (sid, amt, tab) => Object.assign(defaultFinancialContext(), tab === 'expense' ? allocateProjectExpense(sid, amt) : { projectAmount: amt }, { subjectId: sid, accountType: 'project', classification: 'third_party' });
    const e1 = R('expense', { day: '4', desc: 'سیمان', amount: 4000000, status: 'paid' }); e1.financialContext = fc('pa', 4000000, 'expense');
    const e2 = R('expense', { day: '6', desc: 'بلیت', amount: 3000000, status: 'paid' }); e2.financialContext = fc('pb', 3000000, 'expense');
    const i1 = R('income', { day: '3', desc: 'واریز پروژه', amount: 9000000, status: 'paid' }); i1.financialContext = fc('pa', 9000000, 'income');
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'اجاره', amount: 7000000, status: 'paid' }), R('expense', { day: '5', desc: 'قبض برق', amount: 350000, status: 'unpaid' }), e1, e2, R('expense', { day: '9', desc: 'زرشکپلو', amount: 800000, status: 'paid' })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 20000000, status: 'paid' }), i1];
    persistCurrent(); renderAll();
    return t;
  });

  console.log('• رنگ زرد و اسکرول');
  const c = await p.evaluate(() => ({
    v: getComputedStyle(document.documentElement).getPropertyValue('--unpaid-c').trim(),
    ease: /4 \* t \* t \* t/.test(hkSlowScrollTo.toString()),
    bulk: (() => { const el = document.querySelector('.hk-bulk-open-btn'); return el ? getComputedStyle(el).backgroundColor : ''; })()
  }));
  ok(c.v === '#e6b12c', 'رنگ پرداخت/دریافت‌نشده: زرد کمی تیره (#e6b12c)');
  ok(c.ease, 'اسکرول خودکار با منحنی ease-in-out');
  ok(!c.bulk || c.bulk === 'rgb(230, 177, 44)', 'پس‌زمینهٔ دکمهٔ «ثبت گروهی» زرد');

  console.log('• اسلاید پروژه‌ها');
  const pj = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(200);
    const el = document.querySelector('#homeCards .person-card:not(.hc-clone) .pc-smart-box');
    _smartPanelState[t] = _smartPanelState[t] || {}; _smartPanelState[t].key = 'projects';
    mountSmartPanel(el, t); fitSmartPanel(el); await w(300);
    const boxes = [...el.querySelectorAll('.sp-projs .sp-tipbox')];
    const sc = el.querySelector('.sp-projs');
    return {
      n: boxes.length, full: boxes.every(x => Math.abs(x.clientHeight - sc.clientHeight) <= 2),
      first: boxes.map(x => x.querySelector('.sp-tip').textContent),
      second: boxes.map(x => (x.querySelectorAll('.sp-tip')[1] || {}).textContent),
      colored: boxes.every(x => /color/.test(x.querySelector('.sp-pj-t').getAttribute('style') || '')),
      sizes: [...new Set(boxes.flatMap(x => [...x.querySelectorAll('.sp-tip')].map(y => getComputedStyle(y).fontSize)))].length
    };
  }, title);
  ok(pj.n === 2 && pj.full, 'هر پروژه یک نمای کامل اسلاید (۲ پروژه، اسکرول عمودی)');
  ok(pj.first.every(s => /^پروژه /.test(s)) && pj.second.every(s => s === 'این ماه:'), 'اسم پروژه بالا، «این ماه:» در خط بعد');
  ok(pj.colored, 'عنوان «پروژه فلان» به رنگ همان پروژه');
  ok(pj.sizes === 1, 'همهٔ نوشته‌های اسلاید پروژه هم‌اندازه');

  console.log('• رفتن اسلایدها به ردیف/تب مرتبط');
  const nav = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pages = SMART_PANEL_PAGES.reduce((o, x) => { o[x.key] = x; return o; }, {});
    pages.fix.onTap(t); await w(2600);
    const sec = findSectionByTitle('expense', t);
    const trs = [...document.querySelectorAll('#sections-expense tbody tr')];
    const fl = trs.findIndex(tr => tr.classList.contains('sp-flash'));
    const flRow = fl >= 0 ? sec.rows[fl] : null;
    try { closePersonDetail(); } catch (e) {}
    return { fixDesc: flRow && flRow.desc, statsSrc: pages.stats.onTap.toString() };
  }, title);
  ok(nav.fixDesc === 'زرشکپلو', 'اسلاید «خرج بدون دسته» → اسکرول و هایلایت همان ردیف (' + nav.fixDesc + ')');
  ok(/mode: 'daily'/.test(nav.statsSrc) && /focus: 'stCmp'/.test(nav.statsSrc), 'اسلاید آمار → منوی آمار روی تب ماه و بخش مقایسه');
  const st = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    HKStats.open({ mode: 'daily', card: t, focus: 'stCmp' }); await w(1600);
    const on = document.querySelector('#statsBody [data-mode].on');
    const b = document.getElementById('statsBody');
    const r = { mode: on && on.getAttribute('data-mode'), scrolled: b.scrollTop > 0 };
    HKStats.close(); return r;
  }, title);
  ok(st.mode === 'daily' && st.scrolled, 'منوی آمار با تب روزانه باز و تا بخش مقایسه اسکرول شد');

  console.log('• حذف دسته با ×');
  const cx = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openCategoryReviewSheet(t); await w(200);
    document.querySelector('.sp-cat-sheet .sp-cat-row').click(); await w(200);
    const n = document.querySelectorAll('.sp-cat-sheet .sp-pick-x').length;
    const cat = HKCategorizer.addCustom('باغبانی');
    HKCategorizer.learn('کود گیاه', [cat.id]);
    const before = !!HKCategorizer.classify('کود گیاه');
    HKCategorizer.removeCat(cat.id);
    const after = HKCategorizer.classify('کود گیاه');
    HKCategorizer.removeCat('tech');
    const hidden = JSON.parse(localStorage.getItem(STORAGE_KEY + '_catHidden') || '[]');
    closeCategoryReviewSheet();
    return { n, before, after: !!after, custom: !HKCategorizer.byId[cat.id], hidden, techGone: !HKCategorizer.categories.some(x => x.id === 'tech') };
  }, title);
  ok(cx.n >= 10, 'هر دسته یک × کوچک برای حذف دارد');
  ok(cx.before && !cx.after && cx.custom, 'حذف دستهٔ دلخواه: شرح‌هایش «نامشخص» می‌شوند');
  ok(cx.techGone && cx.hidden.indexOf('tech') >= 0, 'حذف دستهٔ پیش‌فرض: پنهان و ماندگار');

  console.log('• پنجرهٔ پروفایل');
  await p.evaluate(() => closeSideMenu());
  await p.tap('#menuBtn'); await p.waitForTimeout(500);
  await p.tap('#menuUserName'); await p.waitForTimeout(400);
  const pf = await p.evaluate(() => {
    const ov = document.querySelector('.hk-prof-ov');
    return ov ? { txt: ov.innerText, btns: ['.hk-prof-rename', '.hk-prof-recap', '.hk-prof-bknow'].every(s => !!ov.querySelector(s)) } : null;
  });
  ok(!!pf, 'لمس نام کاربر در منو (لمس واقعی) پنجرهٔ پروفایل را باز می‌کند');
  ok(pf && pf.btns && /موجودی کل/.test(pf.txt) && /حساب‌ها/.test(pf.txt) && /شروع/.test(pf.txt) && /آخرین پشتیبان/.test(pf.txt), 'پروفایل: تغییر نام، خلاصهٔ سریع، ماهی که گذشت، آخرین پشتیبان + پشتیبان‌گیری الان');
  await p.tap('.hk-prof-rename'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('.person-edit-sheet') && !document.querySelector('.hk-prof-ov')), '«تغییر نام» پنجرهٔ تغییر نام را باز می‌کند');
  await p.evaluate(() => closePersonEditSheet());

  console.log('• PDF و Excel');
  const ex = await p.evaluate(() => {
    recurringIncomes.push({ id: 'rx', name: 'اجارهٔ واحد ۲', amount: 5000000, day: '5', sectionTitle: hkMainTitle(), account: '' });
    plans.push({ id: 'plx', name: 'وام مسکن', amount: 2000000, count: 12, expenseSectionTitle: hkMainTitle(), startYear: 1405, startMonth: 1, day: 5 });
    const blocks = buildPdfBlocks().map(x => x.html).join('');
    const xs = buildXlsxSheets();
    const sheets = (xs.sheets || xs);
    const rec = sheets.find(s => s.name === 'درآمد ثابت');
    return {
      noInstPdf: !/class="st ins"/.test(blocks), nameCol: /<th>نام<\/th><th style="width:15%">مبلغ ماهانه/.test(blocks),
      noUser: !/اجارهٔ واحد ۲ <span/.test(blocks), noInstXls: !sheets.some(s => s.name === 'اقساط'),
      recHead: rec && JSON.stringify(rec.rows[0][0]), recRow: rec && JSON.stringify(rec.rows[1][0]),
      noSection: !HK_EXPORT_SECTIONS.some(s => s[0] === 'install')
    };
  });
  ok(ex.noInstPdf && ex.noInstXls && ex.noSection, 'اقساط از PDF و Excel و گزینه‌های خروجی حذف شد');
  ok(ex.nameCol && ex.noUser, 'PDF درآمد ثابت: ستون اول «نام» بدون نام کاربر در پرانتز');
  ok(/"نام"/.test(ex.recHead || '') && !/\(/.test(ex.recRow || ''), 'Excel درآمد ثابت: ستون «نام» بدون پرانتز');

  console.log('• باکس ویرایش ردیف و پیامک');
  const re = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sec = findSectionByTitle('expense', t);
    const row = sec.rows[0];
    hkOpenRowEdit({ row: row, tab: 'expense', title: t, sec: sec, num: 1, onSaved: function () {} }); await w(200);
    const box = document.querySelector('#hkRowEdit .hk-re-box');
    const pj = box && [...box.querySelectorAll('.hk-re-pjb')].map(x => x.textContent);
    const fits = box && box.scrollHeight <= box.clientHeight + 2;
    try { document.getElementById('hkRowEdit').remove(); } catch (e) {}
    return { pj, fits };
  }, title);
  ok(re.pj && re.pj.join(',').indexOf('معمولی') >= 0 && re.pj.join(',').indexOf('پروژه') >= 0, 'ویرایش ردیف: نوع «معمولی/پروژه» قابل تغییر');
  ok(re.fits, 'ویرایش ردیف: همه‌چیز بدون اسکرول دیده می‌شود');
  const sm = await p.evaluate(() => ({ inc: HK_INCOME_CATS.map(x => x.label).join('،'), keep: !document.querySelector('.hk-share-keep') && !/نگه دار تا پیامک بیاید/.test(document.body.innerHTML.replace(/<style[\s\S]*?<\/style>/g, '')) }));
  ok(['حقوق', 'اجاره', 'اضافه‌کار', 'پاداش', 'هدیه', 'فروش', 'سود'].every(x => sm.inc.indexOf(x) >= 0), 'دسته‌های درآمد: حقوق، اجاره، اضافه‌کار، پاداش، هدیه، فروش، سود');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ' — ' + errors.join(' | ') : ''));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
