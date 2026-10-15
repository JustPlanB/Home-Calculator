// نسخهٔ ۱.۳.۱۹: درآمد ثابت جمع‌شونده و تمدید قرارداد با پوشهٔ هر دوره، آرشیو (رنگ ردیف، ستون‌ها، زدن بی‌اثر)،
// پیش‌فرض پیامک، ترتیب و نشان پروژهٔ موجودی آنی، سطل زباله، منوی جستجو، قسط «پرداخت قبلی»، دقت ریالی، پنجرهٔ خروجی.
// فقط دادهٔ مصنوعی؛ «امروز» با ساعت ساختگی (۲۱ مهر ۱۴۰۵).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const inc = (day, desc, amount, st) => Object.assign(emptyRow('income'), { day: String(day), desc, amount, status: st || 'paid', account: ACC });
    const exp = (day, desc, amount) => Object.assign(emptyRow('expense'), { day: String(day), desc, amount, status: 'paid', account: ACC });
    const P = (e, i) => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: e }, { id: 's2', title: 'علی', rows: [] }], nextId: 3 }, income: { sections: [{ id: 's1', title: 'سارا', rows: i }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 5)] = P([exp(3, 'نان', 50000)], [inc(4, 'اجاره واحد ۲', 15000000)]);
    archive[periodKey(1405, 6)] = P([exp(2, 'بنزین', 300000)], [inc(4, 'اجاره واحد ۲', 15000000)]);
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [exp(5, 'نان بربری', 30000)] }, { id: 's2', title: 'علی', rows: [exp(6, 'کتاب', 200000)] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [inc(4, 'اجاره واحد ۲', 15000000)] }];
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• درآمد ثابت: جمع‌شده به‌طور پیش‌فرض، تمدید قرارداد');
  const rc = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* قرارداد ۴ مهر ۱۴۰۴ تا ۴ مهر ۱۴۰۵ → مهر ماه آخر است */
    const item = { id: 'rec_t', name: 'پناهی', amount: 15000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 7, y: 1404 }, contractEnd: { d: 4, m: 7, y: 1405 }, fromKey: 140406, genKey: 140407 };
    recurringIncomes.push(item);
    recLinkRow(item, archive[periodKey(1405, 6)].income.sections[0].rows[0]);
    recLinkRow(item, periodData.income.sections[0].rows[0]);
    recPersist();
    openFeatureSheet('recurring'); await w(400);
    const idx = recurringIncomes.indexOf(item);
    const row = () => document.querySelector('.recurring-row[data-rec-idx="' + idx + '"]');
    const out = {};
    out.closed = !row().classList.contains('rec-open') && !row().querySelector('.rec-more').offsetParent && !row().querySelector('.rec-arch-btn').offsetParent;
    out.statusVisible = !!row().querySelector('.rec-status').offsetParent;
    out.editVisible = !!row().querySelector('[data-re]').offsetParent && !!row().querySelector('[data-rd]').offsetParent;
    out.renewVisible = !!row().querySelector('.rec-renew-btn') && !!row().querySelector('.rec-renew-btn').offsetParent;
    out.note = (row().querySelector('.rec-renew-note') || {}).textContent || '';
    out.noteColor = row().querySelector('.rec-renew-note') ? getComputedStyle(row().querySelector('.rec-renew-note')).color : '';
    row().querySelector('.rec-name').click(); await w(80);
    out.opened = row().classList.contains('rec-open') && !!row().querySelector('.rec-arch-btn').offsetParent && !!row().querySelector('.rec-more').offsetParent;
    out.btnPad = parseFloat(getComputedStyle(row().querySelector('.rec-arch-btn')).paddingLeft);
    closeFeatureSheet(); await w(200);
    out.clearedOnLeave = recExpanded.size === 0;
    openFeatureSheet('recurring'); await w(400);
    out.closedAgain = !row().classList.contains('rec-open');
    /* تمدید */
    row().querySelector('.rec-renew-btn').click(); await w(150);
    const m = document.getElementById('recRenewModal');
    out.renewOpen = !!m;
    const ds = m.querySelectorAll('.hk-date-sel');
    out.startPre = ds[0].getDate(); out.endPre = ds[1].getDate();
    out.amtPre = m.querySelector('#recRenewAmt').value;
    m.querySelector('#recRenewAmt').value = '17,000,000';
    m.querySelector('[data-act="ok"]').click(); await w(400);
    const pm = document.getElementById('recPickModal'); if (pm) pm._hkCancel();
    await w(200);
    out.terms = JSON.parse(JSON.stringify(item.terms || []));
    out.after = { s: item.contractStart, e: item.contractEnd, a: item.amount };
    out.renewGone = !(row() && row().querySelector('.rec-renew-btn'));
    /* آرشیو: پوشهٔ هر دوره */
    recOpenArchive(item); await w(100);
    const am = () => document.getElementById('recArchiveModal');
    out.folders = [...am().querySelectorAll('.rec-term-folder')].map(f => f.innerText.replace(/\s+/g, ' '));
    am().querySelector('.rec-term-folder[data-t="0"]').click(); await w(100);
    out.head = [...am().querySelectorAll('thead th')].map(th => th.textContent).join('|');
    const trs = [...am().querySelectorAll('.rec-arch-row')];
    out.rows = trs.map(tr => tr.textContent);
    out.paidBg = trs[0] ? getComputedStyle(trs[0].querySelector('td')).backgroundColor : '';
    out.noSmallText = !/دریافت شد/.test(am().querySelector('tbody').textContent);
    /* زدن داخل آرشیو هیچ کاری نمی‌کند */
    const before = [currentYear, currentMonth, _featureActive];
    trs[0].click(); await w(150);
    out.tapNoop = !!am() && _featureActive === 'recurring' && currentMonth === before[1];
    onBackGuard(); await w(300);
    out.backToFolders = !!am() && am().querySelectorAll('.rec-term-folder').length === 2;
    onBackGuard(); await w(300);
    out.backClosed = !am() && _featureActive === 'recurring';
    /* ردیف دریافت‌نشده: قرمز */
    const it2 = { id: 'rec_u', name: 'مستاجر دوم', amount: 9000000, day: 25, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 25, m: 7, y: 1405 }, contractEnd: { d: 25, m: 7, y: 1406 }, fromKey: 140407, genKey: 140406 };
    recurringIncomes.push(it2); ensureRecurringRows({ toast: false }); renderRecurringBar(); await w(150);
    const r2 = document.querySelector('.recurring-row[data-rec-idx="' + recurringIncomes.indexOf(it2) + '"] .rec-status');
    out.unpaidColor = r2 ? getComputedStyle(r2).color : '';
    out.unpaidText = r2 ? r2.textContent : '';
    recOpenArchive(it2); await w(80);
    out.singleFolder = document.querySelectorAll('#recArchiveModal .rec-term-folder').length === 1 && !!document.querySelector('#recArchiveModal .rec-term-folder .rec-term-fico svg');
    document.querySelector('#recArchiveModal .rec-term-folder').click(); await w(80);
    const ur = document.querySelector('#recArchiveModal .rec-arch-row td');
    out.unpaidBg = ur ? getComputedStyle(ur).backgroundColor : '';
    document.getElementById('recArchiveModal')._hkCancel(); await w(80);
    out.cancelToFolders = !!document.querySelector('#recArchiveModal .rec-term-folder');
    document.getElementById('recArchiveModal')._hkCancel();
    closeFeatureSheet(); await w(200);
    return out;
  }, ACC);
  ok(rc.closed && rc.statusVisible && rc.editVisible, 'بسته (پیش‌فرض): نام، مداد و ×، و خط «این ماه»؛ جزئیات و دکمه‌ها پنهان');
  ok(rc.renewVisible && /قرارداد ۴ مهر ۱۴۰۵ تمام می‌شود/.test(rc.note) && rc.noteColor === 'rgb(255, 159, 10)', 'ماه آخر قرارداد: پیام نارنجی «قرارداد ۴ مهر ۱۴۰۵ تمام می‌شود» و دکمهٔ «تمدید» (' + rc.note + ')');
  ok(rc.opened && rc.btnPad >= 14, 'زدن روی مورد: جزئیات و دکمه‌های بزرگ‌تر «اصلاح» و «آرشیو» باز شد');
  ok(rc.clearedOnLeave && rc.closedAgain, 'خروج از منو: همه دوباره بسته شدند');
  ok(rc.renewOpen && rc.startPre.d === 4 && rc.startPre.m === 7 && rc.startPre.y === 1405 && rc.endPre.y === 1406 && rc.endPre.m === 7 && /۱۵,۰۰۰,۰۰۰/.test(rc.amtPre), 'فرم تمدید: شروع = پایان قبلی، پایان = یک سال بعد، مبلغ = مبلغ قبلی');
  ok(rc.terms.length === 1 && rc.terms[0].contractStart.y === 1404 && rc.terms[0].amount === 15000000 && rc.after.e.y === 1406 && rc.after.a === 17000000 && rc.renewGone, 'بعد از تمدید: دورهٔ قبلی نگه داشته شد، دورهٔ تازه با مبلغ ۱۷ میلیون، دکمهٔ تمدید رفت');
  ok(rc.folders.length === 2 && /۱۴۰۴\/۰۷\/۰۴ تا ۱۴۰۵\/۰۷\/۰۴/.test(rc.folders[0]) && /۱ دریافت/.test(rc.folders[0]) && /فعلی/.test(rc.folders[1]), 'آرشیو: هر دوره یک پوشه (بازه، مبلغ، تعداد دریافت)؛ قدیمی بالا (' + rc.folders.join(' / ') + ')');
  ok(rc.head === 'تاریخ|شرح|مبلغ|بانک', 'ستون‌های آرشیو: تاریخ کامل | شرح | مبلغ | بانک (ستون ماه حذف شد)');
  ok(rc.rows.length === 1 && /۱۴۰۵\/۰۶\/۰۴/.test(rc.rows[0]) && rc.paidBg.startsWith('rgba(158, 232, 88') && rc.noSmallText, 'پوشهٔ دورهٔ قبل: واریز شهریور با پس‌زمینهٔ سبز کل ردیف (بدون متن کوچک «دریافت شد»)');
  ok(rc.tapNoop, 'زدن روی ردیف آرشیو کاری نمی‌کند (به صفحهٔ اصلی نمی‌رود)');
  ok(rc.backToFolders && rc.backClosed, 'بازگشت: از داخل پوشه به فهرست دوره‌ها، بعد بستن آرشیو و ماندن در منو');
  ok(rc.unpaidColor === 'rgb(255, 107, 74)' && /دریافت نشده/.test(rc.unpaidText), '«این ماه: دریافت نشده» با همان قرمز مبالغ دریافت‌نشده (‎#ff6b4a)');
  ok(rc.cancelToFolders, 'بازگشت از داخل پوشهٔ تنها: به فهرست پوشه‌ها');
  ok(rc.singleFolder, 'قرارداد بدون تمدید هم پوشهٔ خودش را دارد (با آیکون پوشهٔ ثبت گروهی)');
  ok(rc.unpaidBg.startsWith('rgba(255, 107, 74'), 'آرشیو: ردیف دریافت‌نشده با قرمز مبالغ دریافت‌نشدهٔ درآمد');

  console.log('• پیامک: پیش‌فرض نزدیک‌ترین درآمد ثابت حتی با فاصلهٔ بیش از ۲ روز');
  const sm = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const run = async (amount, d) => {
      const raw = 'بانک ملت\nواریز ' + amount + '\nحساب 0000***1111';
      pendingSmsEntry = { raw, amount, type: 'income', bank: ACC, day: String(d), month: 7, year: 1405 };
      openSmsConfirmModal({ type: 'income', amount, bank: ACC, day: String(d), month: 7, year: 1405, raw });
      await w(250);
      const bs = document.getElementById('smsConfirmBank'); bs.value = ACC; bs.dispatchEvent(new Event('change'));
      await w(120);
      const sel = document.getElementById('smsRecMatchSel');
      const r = { has: !!sel, value: sel ? sel.value : null, text: sel && sel.value ? sel.options[sel.selectedIndex].textContent : '' };
      closeSmsConfirmModal(); await w(100);
      return r;
    };
    const far = await run(9000000, 30);   /* سررسید ۲۵ → ۵ روز فاصله */
    const none = await run(3333333, 30);
    return { far, none };
  }, ACC);
  ok(sm.far.has && sm.far.value !== '' && /مستاجر دوم/.test(sm.far.text), 'واریز ۳۰ مهر برای سررسید ۲۵ مهر (۵ روز): «مستاجر دوم» از پیش انتخاب شد');
  ok(!sm.none.has, 'بدون درآمد ثابت احتمالی: پیشنهادی نیست (پیش‌فرض همان تراکنش جدید)');

  console.log('• موجودی آنی: ترتیب ویجت و نشان پروژه');
  const ib = await p.evaluate(async () => {
    selectedBankAccounts.push({ id: 'ba_b', bank: 'بانک ب', label: 'ب حساب', openingBalance: 2000000, createdAt: { y: 1405, m: 1 } });
    selectedBankAccounts.push({ id: 'ba_a', bank: 'بانک الف', label: 'الف حساب', openingBalance: 1000000, createdAt: { y: 1405, m: 1 } });
    try { periodData.accountOpeningInstant = Object.assign({}, periodData.accountOpeningInstant || {}, { 'ب حساب': 2000000, 'الف حساب': 1000000 }); } catch (e) {}
    const oL = loadFinancialSubjects, oR = projectReceivableOnAccounts;
    loadFinancialSubjects = () => [{ id: 'pj1', name: 'پروژه آزمایشی', highlightColor: 'orange' }, { id: 'pj2', name: 'پروژه دوم', highlightColor: 'blue' }];
    projectReceivableOnAccounts = (id, set) => set.has('ب حساب') ? (id === 'pj1' ? 3000000 : 0) : (set.has('الف حساب') ? (id === 'pj1' ? -2000000 : -500000) : 0);
    openInstantBalance('');
    const rows = [...document.querySelectorAll('#instantBalPanel .ib-acc-row')];
    const out = { order: rows.map(r => r.getAttribute('data-acc')), badges: rows.map(r => { const bd = r.querySelector('.ib-proj-dots'); return bd ? [...bd.querySelectorAll('i')].map(i => getComputedStyle(i).backgroundColor).join(',') + '|' + bd.textContent : ''; }) };
    closeInstantBalance();
    /* ویجت: همان نقطه‌ها در دادهٔ حساب‌ها */
    window.__wd = null;
    const oC = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkWidget: { update: (o) => { window.__wd = o; } } } };
    pushHomeWidget(); await new Promise(r => setTimeout(r, 900));
    window.Capacitor = oC;
    try { out.widgetAccs = JSON.parse(window.__wd.accounts); } catch (e) { out.widgetAccs = null; }
    loadFinancialSubjects = oL; projectReceivableOnAccounts = oR;
    out.widget = selectedAccountLabels();
    return out;
  });
  const io = ib.order.filter(x => x === 'ب حساب' || x === 'الف حساب');
  ok(io.join('|') === 'ب حساب|الف حساب', 'ترتیب حساب‌ها مثل ویجت (ترتیب ساخت)، نه الفبایی (' + ib.order.join('، ') + ')');
  const bB = ib.badges[ib.order.indexOf('ب حساب')] || '', bA = ib.badges[ib.order.indexOf('الف حساب')] || '';
  ok(bB === 'rgb(255, 106, 0)|', 'حساب با یک پروژه: فقط یک نقطه به رنگ همان پروژه (نارنجی)، بدون مبلغ (' + bB + ')');
  ok(bA === 'rgb(255, 106, 0),rgb(0, 232, 255)|', 'حساب با دو پروژه: دو نقطه به رنگ هر پروژه (' + bA + ')');
  const wa = (ib.widgetAccs || []).reduce((m, a) => { m[a.l] = (a.p || []).join(','); return m; }, {});
  ok(wa['ب حساب'] === '#ff6a00' && wa['الف حساب'] === '#ff6a00,#00e8ff' && wa[ACC] === '', 'ویجت: رنگ پروژه‌های هر حساب برای نقطه‌ها فرستاده شد (' + JSON.stringify(wa) + ')');

  console.log('• سطل زباله: «انتخاب همه» ثابت بالای فهرست');
  const tr = await p.evaluate(async () => {
    for (let i = 0; i < 40; i++) pushToTrash('row', 'ردیف آزمایشی ' + i, { tab: 'expense', sectionTitle: 'سارا', row: emptyRow('expense') });
    openTrashModal(); await new Promise(r => setTimeout(r, 200));
    const list = document.getElementById('trashList'), tb = list.querySelector('.trash-toolbar');
    list.scrollTop = 600; await new Promise(r => setTimeout(r, 100));
    const lr = list.getBoundingClientRect(), tr = tb.getBoundingClientRect();
    const out = { pos: getComputedStyle(tb).position, atTop: Math.abs(tr.top - lr.top) < 3, scrolled: list.scrollTop > 0, opaque: !/rgba\(.*, 0\)$/.test(getComputedStyle(tb).backgroundColor) && getComputedStyle(tb).backgroundColor !== 'transparent' };
    closeTrashModal();
    return out;
  });
  ok(tr.pos === 'sticky' && tr.atTop && tr.scrolled && tr.opaque, 'با اسکرول فهرست، «انتخاب همه» بالای فهرست می‌ماند و پس‌زمینهٔ مات دارد');

  console.log('• منوی جستجو: بخش و زمان کشویی');
  const se = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(300);
    balanceSelectedTitles = []; balanceSectionAll = false;
    renderBalanceTab(); await w(50);
    const wrap = document.getElementById('balanceSectionWrap');
    const btnTxt = () => (wrap.querySelector('.dark-select-btn') || wrap).textContent.trim();
    const out = { def: btnTxt(), sel: balanceSelectedTitles.slice() };
    const ds = wrap.querySelector('.dark-select');
    out.opts = ds && ds._list ? [...ds._list.querySelectorAll('.dark-select-item')].map(x => x.textContent.trim()) : [];
    if (ds && ds.setValue) ds.setValue('__all__');
    const item = ds && ds._list ? [...ds._list.querySelectorAll('.dark-select-item')].find(x => x.textContent.trim() === 'همه') : null;
    if (item) item.click(); await w(50);
    out.afterAll = balanceSelectedTitles.slice();
    const rg = document.getElementById('balanceSearchRange');
    out.rangeOpts = [...rg.options].map(o => o.textContent);
    const dy = document.getElementById('balanceSearchDay');
    out.dayOpts = [...dy.options].map(o => o.textContent);
    const ty = document.getElementById('balanceSearchType');
    out.typeOpts = [...ty.options].map(o => o.textContent);
    const rows = () => [...document.querySelectorAll('#search-result-body tr')].map(t => t.textContent);
    /* نوع: واریز / برداشت */
    ty.value = 'income'; ty.dispatchEvent(new Event('change')); await w(80);
    out.incOnly = rows(); out.catOff = document.getElementById('balanceSearchCat').disabled;
    ty.value = 'expense'; ty.dispatchEvent(new Event('change')); await w(80);
    out.expOnly = rows(); out.catOn = !document.getElementById('balanceSearchCat').disabled;
    ty.value = ''; ty.dispatchEvent(new Event('change')); await w(50);
    /* روز ۴ با «همهٔ ماه‌ها»: روز ۴ هر ماه با جمع هر ماه */
    dy.value = '4'; dy.dispatchEvent(new Event('change')); await w(80);
    out.day4 = rows(); out.day4foot = [...document.querySelectorAll('#search-result-foot tr')].map(t => t.textContent);
    /* روز ۵ با «این ماه»: (از ۱.۳.۲۳) فقط همان جدول نتیجهٔ جستجو، بدون جدول جزئیات روز */
    rg.value = 'month'; rg.dispatchEvent(new Event('change')); dy.value = '5'; dy.dispatchEvent(new Event('change')); await w(80);
    out.dayBox = getComputedStyle(document.getElementById('dayDetailBox')).display === 'none' && document.getElementById('searchResultBox').style.display !== 'none';
    resetBalanceSearch(); renderBalanceTab(); await w(50);
    out.resetDay = document.getElementById('balanceDayFilter').value === '' && dy.value === '' && ty.value === '';
    const sizes = [...document.querySelectorAll('.bsr-grid > .bsr-cell:not(.bsr-wide)')].map(c => { const ctl = c.querySelector('.fancy-select-btn, .dark-select-btn'); const r = ctl ? ctl.getBoundingClientRect() : { width: 0, height: 0 }; return Math.round(r.width) + 'x' + Math.round(r.height); });
    out.sizes = sizes;
    /* چیدمان فشرده: ردیف ۱ بخش و زمان، ردیف ۲ حساب و دسته، ردیف ۳ شرح */
    const cells = [...document.querySelectorAll('.bsr-grid > .bsr-cell')].map(c => ({ t: c.querySelector('.balance-acc-label').textContent, y: Math.round(c.getBoundingClientRect().top) }));
    out.layout = cells;
    const lab = document.querySelector('label[for="balanceSearchCat"]');
    out.catLabelAlign = getComputedStyle(lab).textAlign;
    closePersonDetail(); await w(200);
    return out;
  });
  ok(se.def === 'سارا' && se.sel.join() === 'سارا' && se.opts.join('|') === 'سارا|علی|همه', 'بخش: پیش‌فرض اولین کاربر، فهرست کاربران + «همه» (بدون انتخاب چندتایی)');
  ok(se.afterAll.length === 0, 'انتخاب «همه»: همهٔ بخش‌ها');
  ok(se.rangeOpts.join('|') === 'همهٔ ماه‌ها|این ماه|۳ ماه اخیر|امسال', 'منوی «زمان»: همهٔ ماه‌ها / این ماه / ۳ ماه اخیر / امسال');
  ok(se.dayOpts.length === 32 && se.dayOpts[0] === 'همه روزها' && se.dayOpts[31] === '۳۱' && se.typeOpts.join('|') === 'همه|واریز|برداشت', 'منوی «روز» (همه روزها + ۱ تا ۳۱) و منوی «نوع» (همه / واریز / برداشت)');
  ok(se.incOnly.length > 0 && !se.incOnly.some(t => /نان|بنزین|کتاب/.test(t)) && se.catOff, 'نوع «واریز»: فقط درآمدها؛ منوی دسته غیرفعال');
  ok(se.expOnly.length > 0 && !se.expOnly.some(t => /اجاره/.test(t)) && se.catOn, 'نوع «برداشت»: فقط مخارج');
  ok(se.day4.length === 3 && se.day4.every(t => /\/۰۴$|اجاره/.test(t) || /۰۴/.test(t)) && se.day4foot.filter(t => /^جمع (مرداد|شهریور|مهر)/.test(t)).length === 3, 'روز ۴ با «همهٔ ماه‌ها»: روز ۴ هر ماه، با جمع هر ماه (' + se.day4.length + ' ردیف)');
  ok(se.dayBox && se.resetDay, 'روز با «این ماه»: فقط جدول نتیجهٔ جستجو؛ پاک کردن جستجو نوع و روز را هم برمی‌گرداند');
  const L = se.layout;
  ok(L.length === 7 && L[0].y === L[1].y && L[2].y === L[3].y && L[4].y === L[5].y && L[2].y > L[0].y && L[4].y > L[2].y && L[6].y > L[4].y && /بخش/.test(L[0].t) && /نوع/.test(L[1].t) && /ماه/.test(L[2].t) && /روز/.test(L[3].t) && /حساب/.test(L[4].t) && /دسته/.test(L[5].t) && /شرح/.test(L[6].t), 'چیدمان: [بخش][نوع] / [زمان][روز] / [حساب][دسته] / شرح');
  ok(se.sizes.length === 6 && se.sizes.every(x => x === se.sizes[0]) && !/^0x/.test(se.sizes[0]), 'همهٔ باکس‌ها به جز شرح یک اندازه (' + se.sizes.join('، ') + ')');
  ok(se.catLabelAlign === 'right', 'برچسب «دسته:» راست‌چین');

  console.log('• قسط‌های پرداخت‌شده پیش از شروع کار با نرم‌افزار');
  const pa = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    plans.push({ id: 'pl_t', name: 'وام مسکن', count: 12, paidCount: 6, amount: 2000000, startYear: 1405, startMonth: 1, startDay: 5, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: Date.now() });
    syncPlansToExpenseAll(); persistCurrent(); saveArchive();
    const shRow = (archive[periodKey(1405, 6)].expense.sections[0].rows || []).find(r => r.fromPlanId === 'pl_t');
    const out = { shPre: !!shRow && isPreAppPlanRow(shRow, 1405, 6) };
    const mehrRow = periodData.expense.sections[0].rows.find(r => r.fromPlanId === 'pl_t');
    out.mehrPre = !!mehrRow && isPreAppPlanRow(mehrRow, 1405, 7);
    out.paidCount = plans.find(x => x.id === 'pl_t').paidCount;
    document.getElementById('balanceSearchInput').value = 'وام';
    document.getElementById('balanceSearchRange').value = 'all';
    renderBalanceSearch(); await w(50);
    out.search = [...document.querySelectorAll('#search-result-body tr')].map(t => t.textContent);
    resetBalanceSearch();
    navigateToPeriod(1405, 6); await w(400);
    const prow = periodData.expense.sections[0].rows.find(r => r.fromPlanId === 'pl_t');
    const el = buildRowEl('s1', prow, 0, 'پرداخت شده', 'پرداخت نشده');
    out.mainRow = el.classList.contains('plan-preapp') && (el.querySelector('.preapp-tag') || {}).textContent === 'پرداخت قبلی';
    openPersonDetail('سارا', 'expense'); await w(400);
    const tr = document.querySelector('tr.plan-preapp');
    out.table = tr ? { op: getComputedStyle(tr.querySelector('td')).opacity, tag: (tr.querySelector('.preapp-tag') || {}).textContent } : null;
    closePersonDetail(); await w(200);
    navigateToPeriod(1405, 7); await w(400);
    return out;
  });
  ok(pa.shPre && !pa.mehrPre && pa.paidCount === 6, 'قسط شهریور (قبل از ماه ساخت قسط) «پرداخت قبلی» است؛ قسط مهر نه؛ تعداد پرداخت‌شده همان ۶ ماند');
  ok(pa.search.every(t => !/فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|\/0[1-6]\//.test(t)) && !pa.search.some(t => /1405\/06|۱۴۰۵\/۰۶/.test(t)), 'جستجو: قسط‌های «پرداخت قبلی» در نتیجه نیستند (' + pa.search.length + ' ردیف)');
  ok(pa.table && Number(pa.table.op) <= 0.6 && pa.table.tag === 'پرداخت قبلی', 'جدول شهریور: ردیف قسط کم‌رنگ با برچسب «پرداخت قبلی»');
  ok(pa.mainRow, 'جدول اصلی مخارج هم همان برچسب و کم‌رنگی را دارد');

  console.log('• دقت ریالی در تطبیق موجودی');
  const rl = await p.evaluate(() => {
    const parsed = parseBankSms('بانک ملت\nبرداشت از حساب\nمبلغ 12,345 ریال\nمانده 1,000,005 ریال');
    const L = 'حساب ریالی';
    selectedBankAccounts.push({ id: 'ba_r', bank: 'بانک ملت', label: L, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const ex = () => Object.assign(emptyRow('expense'), { day: '3', desc: 'خرید', amount: 1235, amountRial: 12345, status: 'paid', account: L });
    periodData.expense.sections[0].rows.push(ex(), ex(), ex());
    const b = hkAccountBalanceUpTo(L, 4);
    const snapR = { type: 'expense', amount: 1235, amountRial: 12345, balance: -4938, balanceRial: -49380, bank: L };
    const snapT = { type: 'expense', amount: 1235, balance: -4938, bank: L };
    const out = { parsed: { a: parsed && parsed.amount, ar: parsed && parsed.amountRial, br: parsed && parsed.balanceRial }, allR: b.allR, rial: hkReconCompare(snapR, b, false), toman: hkReconCompare(snapT, b, false) };
    periodData.expense.sections[0].rows = periodData.expense.sections[0].rows.filter(r => r.account !== L);
    selectedBankAccounts = selectedBankAccounts.filter(a => a.id !== 'ba_r');
    return out;
  });
  ok(rl.parsed.a === 1235 && rl.parsed.ar === 12345 && rl.parsed.br === 1000005, 'پیامک ریالی: مبلغ نمایشی تومان (۱۲۳۵) و مبلغ دقیق ریالی (۱۲۳۴۵) و ماندهٔ ریالی نگه داشته شد');
  ok(rl.allR === -37035 && rl.rial === null, 'سه خرید ۱۲٬۳۴۵ ریالی + این پیامک: با جمع دقیق ریالی مغایرتی نیست');
  ok(rl.toman && rl.toman.diff !== 0, 'بدون مبلغ ریالی (روش قبلی) همین مورد به خاطر گرد کردن مغایرت کاذب می‌داد');

  console.log('• پنجرهٔ خروجی PDF / Excel');
  const exd = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { localStorage.removeItem(STORAGE_KEY + '_exportOpts'); } catch (e) {}
    askExport();
    await w(100);
    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) pdfBtn.click(); else hkOpenExportDialog('pdf');
    await w(150);
    const m = document.getElementById('hkExportModal');
    const out = { open: !!m };
    out.labels = [...m.querySelectorAll('input[data-k]')].map(c => c.parentNode.textContent.trim());
    out.allChecked = [...m.querySelectorAll('input[data-k]')].every(c => c.checked) && m.querySelector('#hkExpAll').checked;
    out.allSticky = getComputedStyle(m.querySelector('.hk-exp-all')).position === 'sticky';
    out.rangeDefault = m.querySelector('[data-slot="range"] .dark-select-btn').textContent.trim();
    out.userDefault = m.querySelector('[data-slot="user"] .dark-select-btn').textContent.trim();
    m.querySelector('#hkExpAll').click(); await w(50);
    out.disabledWhenNone = m.querySelector('#hkExpGo').disabled;
    m.querySelector('input[data-k="expense"]').click(); await w(50);
    out.enabledWithOne = !m.querySelector('#hkExpGo').disabled;
    onBackGuard(); await w(300);
    out.backClosed = !document.getElementById('hkExportModal');
    /* محتوای PDF با گزینه‌ها */
    _hkExportOpts = { range: '3m', user: '', sections: { income: true, expense: true } };
    const B1 = buildPdfBlocks().map(x => x.html).join('');
    _hkExportOpts = { range: 'month', user: 'علی', sections: { expense: true, install: true } };
    const B2 = buildPdfBlocks().map(x => x.html).join('');
    _hkExportOpts = { range: '3m', user: '', sections: { expense: true, install: true } };
    const X = buildXlsxSheets().sheets.map(s => s.name);
    _hkExportOpts = null;
    const B0 = buildPdfBlocks().map(x => x.html).join('');
    out.b1 = { months: ['مرداد', 'شهریور', 'مهر'].every(mn => new RegExp('درآمدها <small>' + mn).test(B1)), perMonth: /جمع ماه‌به‌ماه/.test(B1), noInstall: !/class="st ins"/.test(B1), noAcc: !/موجودی حساب‌ها/.test(B1), title: /گزارش مالی مرداد ۱۴۰۵ تا مهر ۱۴۰۵/.test(B1) };
    out.b2 = { onlyAli: /کتاب/.test(B2) && !/نان بربری/.test(B2), noIncome: !/class="st inc"/.test(B2), title: /علی/.test(B2) };
    out.xl = X;
    out.b0 = /class="st inc"/.test(B0) && /موجودی حساب‌ها/.test(B0) && /class="st ins"/.test(B0);
    return out;
  });
  ok(exd.open && exd.labels.includes('درآمدها') && exd.labels.includes('مخارج') && exd.labels.includes('اقساط') && exd.labels.includes('درآمدهای ثابت (با آرشیو)') && exd.labels.includes('موجودی حساب‌ها') && !exd.labels.includes('پس‌انداز'), 'دکمهٔ PDF: پنجرهٔ تیک بخش‌ها فقط با بخش‌های دارای داده (' + exd.labels.join('، ') + ')');
  ok(exd.allChecked && exd.allSticky, '«انتخاب همه» بالای فهرست ثابت است و پیش‌فرض همه تیک دارند');
  ok(exd.rangeDefault === 'این ماه' && exd.userDefault === 'همه', 'پیش‌فرض‌ها: بازهٔ «این ماه» و بخش «همه»');
  ok(exd.disabledWhenNone && exd.enabledWithOne, '«ساخت PDF» بدون هیچ تیکی غیرفعال است');
  ok(exd.backClosed, 'بازگشت پنجرهٔ خروجی را می‌بندد');
  ok(exd.b1.months && exd.b1.perMonth && exd.b1.noInstall && exd.b1.noAcc && exd.b1.title, 'PDF سه‌ماهه: هر ماه جدا (مرداد، شهریور، مهر) + جمع ماه‌به‌ماه؛ بخش‌های تیک‌نخورده نیامدند');
  ok(exd.b2.onlyAli && exd.b2.noIncome && exd.b2.title, 'PDF فقط برای «علی»: فقط مخارج علی');
  ok(exd.xl.join('|') === 'خلاصه|مخارج|اقساط', 'Excel با همان گزینه‌ها: فقط برگه‌های خلاصه، مخارج و اقساط (' + exd.xl.join('، ') + ')');
  ok(exd.b0, 'بدون گزینه (فراخوانی قدیمی): همهٔ بخش‌ها مثل قبل');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1319: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
