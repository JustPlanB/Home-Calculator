// نسخهٔ ۱.۳.۳۱: منوی جستجو (بی منوی ماه/سال، فقط محور مبلغ زیر شرح با ۰ سمت چپ، دوازده ماه + جدول ماه‌ها)،
// ثبت گروهی (کارت مقصد سر جایش، حرکت نرم بازه، بک اندروید)، قسط‌های هم‌مبلغ و پرداخت چند قسط با هم،
// باکس هوشمند (کارهای انجام‌شده پایین، قرض، فاصلهٔ نکته‌ها)، پروژه فقط در ماه خودش، پیوست عکس/صدا. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts) => ({ address: 'Bank Melli', date: ts, body });

async function page(b, inbox) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox)}.sort((a, b) => b.date - a.date);
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };` });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- منوی جستجو ---------- */
  const p = await page(b, []); p.on('pageerror', e => errors.push(e.message));
  await p.goto(INDEX); await p.waitForTimeout(1600);
  console.log('• منوی جستجو');
  const se = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const rows = []; for (let i = 1; i <= 20; i++) rows.push(Object.assign(emptyRow('expense'), { day: String(i % 28 + 1), desc: 'خرید ' + i, amount: i * 700000, status: 'paid' }));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 50000000, status: 'paid' })] }];
    persistCurrent();
    archive['1405-6'] = JSON.parse(JSON.stringify(periodData));
    archive['1404-6'] = JSON.parse(JSON.stringify(periodData));
    saveArchive(); renderAll();
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
    const out = { before: vis('monthSelectWrap') && vis('yearSelectWrap') };
    openPersonDetail('سارا', 'balance'); await w(500);
    out.hidden = !vis('monthSelectWrap') && !vis('yearSelectWrap');
    out.amtHidden = [...document.querySelectorAll('.bs-amt-row')].every(c => getComputedStyle(c).display === 'none');
    const desc = document.querySelector('.bsr-desc'), sl = document.querySelector('.bs-arange-row');
    out.sliderBelow = sl.getBoundingClientRect().top >= desc.getBoundingClientRect().bottom - 1;
    const host = document.getElementById('balanceAmtRange'), tr = host.querySelector('.hk-ar-track').getBoundingClientRect();
    const ticks = [...host.querySelectorAll('.hk-ar-tick')], tc = t => { const r = t.getBoundingClientRect(); return r.left + r.width / 2; };
    out.zeroLeft = ticks[0].textContent === '۰' && Math.abs(tc(ticks[0]) - tr.left) < 4 && tc(ticks[ticks.length - 1]) > tc(ticks[0]);
    const hs = host.querySelectorAll('.hk-ar-h'), hc = h => { const r = h.getBoundingClientRect(); return r.left + r.width / 2; };
    out.handles = Math.abs(hc(hs[0]) - tr.left) < 3 && Math.abs(hc(hs[1]) - tr.right) < 3;
    out.opts = [...document.getElementById('balanceSearchRange').options].map(o => o.textContent);
    /* جدول ماه‌ها (همهٔ ماه‌های ۱۴۰۵) */
    const ms = document.getElementById('searchMonthSummary');
    out.msShown = !!ms && getComputedStyle(ms).display !== 'none';
    out.msTitle = ms ? ms.querySelector('.summary-header').textContent : '';
    out.msRows = ms ? [...ms.querySelectorAll('.bs-mrow')].map(r => [...r.children].map(td => td.textContent)) : [];
    out.msTotal = ms ? [...ms.querySelectorAll('.bs-mtotal td')].map(td => td.textContent) : [];
    out.msColor = ms ? getComputedStyle(ms.querySelector('.bs-mrow .bs-ci')).color : '';
    /* زدن ردیف شهریور = فیلتر شهریور؛ جمع درآمد و جمع مخارج همان ماه */
    ms.querySelector('.bs-mrow[data-m="6"]').click(); await w(150);
    out.picked = document.getElementById('balanceSearchRange').value;
    out.msHidden = getComputedStyle(ms).display === 'none';
    out.foot = [...document.querySelectorAll('#search-result-foot tr')].map(t => t.textContent);
    out.resN = document.querySelectorAll('#search-result-body tr').length;
    out.years = [...new Set([...document.querySelectorAll('#search-result-body td.sr-date')].map(t => t.textContent.slice(0, 4)))];
    closePersonDetail(); await w(200);
    out.after = vis('monthSelectWrap') && vis('yearSelectWrap');
    return out;
  });
  ok(se.before && se.hidden && se.after, 'منوی ماه و سال بالای صفحه در جستجو پنهان است و بعد از خروج برمی‌گردد');
  ok(se.amtHidden && se.sliderBelow, 'باکس‌های مبلغ حذف شدند؛ محور مبلغ زیر «جستجوی شرح»');
  ok(se.zeroLeft && se.handles, '۰ سمت چپ محور و حد آخر سمت راست');
  ok(se.opts.length === 13 && se.opts[0] === 'همهٔ ماه‌ها' && se.opts[1] === 'فروردین' && se.opts[12] === 'اسفند', '«ماه»: همهٔ ماه‌ها + فروردین تا اسفند');
  ok(se.msShown && /۱۴۰۵/.test(se.msTitle) && se.msRows.length === 2 && se.msRows[0][0] === 'شهریور' && se.msRows[1][0] === 'مهر', 'جدول ماه‌های ۱۴۰۵ (فقط ماه‌های دارای ردیف؛ ۱۴۰۴ نیامد): ' + se.msRows.map(r => r[0]).join('، '));
  ok(se.msRows[0][1] === '۵۰,۰۰۰,۰۰۰' && se.msRows[0][2] === '۱۴۷,۰۰۰,۰۰۰' && /۹۷,۰۰۰,۰۰۰/.test(se.msRows[0][3]) && se.msTotal[0] === 'جمع سال' && se.msTotal[1] === '۱۰۰,۰۰۰,۰۰۰' && se.msColor === 'rgb(158, 232, 88)', 'هر ماه: درآمد / مخارج / مانده؛ ردیف جمع سال');
  ok(se.picked === '6' && se.msHidden && se.foot.length === 2 && /جمع درآمد شهریور/.test(se.foot[0]) && /جمع مخارج شهریور/.test(se.foot[1]) && se.resN === 21 && se.years.join() === '۱۴۰۵', 'زدن ماه در جدول = فیلتر همان ماه؛ جمع درآمد و جمع مخارج همان ماه (' + se.resN + ' ردیف)');

  /* ---------- ثبت گروهی ---------- */
  console.log('• ثبت گروهی پیامک');
  const inbox1 = [];
  for (let i = 0; i < 8; i++) inbox1.push({ address: 'Bank Mellat', date: T(2026, 10, 3 + i), body: 'بانک ملت\nبرداشت 10,000\nحساب 0000***' + (1000 + i) + '\nمانده ' + (900000 - i * 1000).toLocaleString('en') });
  const q = await page(b, inbox1); q.on('pageerror', e => errors.push(e.message));
  await q.goto(INDEX); await q.waitForTimeout(1600);
  const bk = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.income.sections = [{ id: 's1', title: 'سپهر', rows: [] }, { id: 's2', title: 'علی', rows: [] }];
    periodData.expense.sections = [{ id: 's1', title: 'سپهر', rows: [] }, { id: 's2', title: 'علی', rows: [] }];
    persistCurrent(); renderAll();
    openSmsBulkModal(); await w(200);
    const ov = document.getElementById('smsBulkOv'), cw = document.getElementById('hkBulkCardWrap');
    const out = { cardIn: !!cw.closest('.hk-bulk-rwrap') && getComputedStyle(cw).display !== 'none', cardLbl: cw.querySelector('.hk-bulk-rlbl').textContent };
    const cr = cw.getBoundingClientRect(), rd = ov.querySelector('.hk-bulk-read').getBoundingClientRect(), bt = ov.querySelector('.hk-bulk-btns').getBoundingClientRect();
    out.cardAboveRead = cr.bottom <= rd.top + 1 && cr.bottom < bt.top;
    out.dupLbl = ov.querySelector('.hk-bulk-dupbtn').textContent;
    hkBulkRead(); await w(1000);
    const bar = ov.querySelector('.hk-bulk-rbar'), list = document.getElementById('hkBulkList');
    out.chev = getComputedStyle(bar.querySelector('.hk-chev')).color;
    out.allShadow = getComputedStyle(list.querySelector('.hk-bulk-all')).boxShadow;
    const run = async () => { const tops = []; bar.click(); const t0 = performance.now(); while (performance.now() - t0 < 650) { await new Promise(r => requestAnimationFrame(r)); tops.push(list.querySelector('.hk-bulk-folder').getBoundingClientRect().top); } return tops; };
    const mono = a => { let up = 0, dn = 0, mx = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; if (d > 0.5) up++; if (d < -0.5) dn++; mx = Math.max(mx, Math.abs(d)); } return { up, dn, mx: Math.round(mx), tot: Math.round(Math.abs(a[a.length - 1] - a[0])) }; };
    out.open = mono(await run()); out.openWrap = getComputedStyle(ov.querySelector('.hk-bulk-rwrap')).display !== 'none';
    out.close = mono(await run()); out.closeWrap = getComputedStyle(ov.querySelector('.hk-bulk-rwrap')).display === 'none';
    out.ghosts = ov.querySelectorAll('.hk-bulk-box > .hk-bulk-rwrap').length;
    /* بک اندروید: فقط همین پنجره بسته شود */
    onBackGuard(); await w(300);
    out.backClosed = !document.getElementById('smsBulkOv');
    out.stillHome = document.getElementById('panel-home').classList.contains('active');
    return out;
  });
  ok(bk.cardIn && bk.cardLbl === 'ثبت روی کارت' && bk.cardAboveRead, 'انتخاب کارت مقصد داخل بخش بازه و بالای «خواندن پیامک‌ها» (نه روی دکمه‌های پایین)');
  ok(bk.dupLbl === 'پیدا کردن ردیف‌های تکراری قبلی', 'اسم دکمهٔ تکراری‌ها روشن‌تر شد');
  ok(bk.open.dn === 0 && bk.open.up > 4 && bk.openWrap && bk.close.up === 0 && bk.close.dn > 4 && bk.closeWrap && bk.ghosts === 1, 'باز و بسته شدن بازه یک حرکت پیوسته (باز: ' + bk.open.up + ' فریم، بسته: ' + bk.close.dn + ' فریم)');
  ok(bk.open.mx <= Math.max(40, bk.open.tot * 0.25) && bk.close.mx <= Math.max(40, bk.close.tot * 0.25), 'بی‌پرش (بیشترین گام ' + bk.open.mx + '/' + bk.close.mx + 'px)');
  ok(bk.chev !== 'rgb(10, 132, 255)' && bk.allShadow === 'none', 'فلش نوار بازه هم‌رنگ بقیهٔ فلش‌ها؛ لبهٔ تیرهٔ زیر ردیف «همه» برداشته شد');
  ok(bk.backClosed && bk.stillHome, 'بک اندروید ثبت گروهی را می‌بندد و صفحهٔ زیرش سر جایش می‌ماند');

  /* ---------- قسط ---------- */
  console.log('• قسط: دو وام هم‌مبلغ و پرداخت دو قسط با هم');
  const inbox2 = [
    melli('بانك ملي ايران\nبرداشت:11,904,000-\nحساب:62002\nمانده:88,096,000\n0525-10:00', T(2026, 8, 16, 7)),
    melli('بانك ملي ايران\nبرداشت:11,904,000-\nحساب:62002\nمانده:76,192,000\n0525-10:05', T(2026, 8, 16, 8)),
    melli('بانك ملي ايران\nبرداشت:5,955,910-\nحساب:62002\nمانده:70,236,090\n0623-10:00', T(2026, 9, 14, 7)),
    melli('بانك ملي ايران\nبرداشت:6,000,000-\nحساب:62002\nمانده:64,236,090\n0623-10:05', T(2026, 9, 14, 8))
  ];
  const r2 = await page(b, inbox2); r2.on('pageerror', e => errors.push(e.message));
  await r2.goto(INDEX); await r2.waitForTimeout(1600);
  const ins = await r2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 4, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    plans.push({ id: 'pa', name: 'وام الف', count: 12, paidCount: 2, amount: 596328, startYear: 1405, startMonth: 2, startDay: 21, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    plans.push({ id: 'pb', name: 'وام ب', count: 12, paidCount: 2, amount: 596328, startYear: 1405, startMonth: 2, startDay: 21, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 2 });
    try { syncPlansToExpenseAll(); } catch (e) {}
    persistCurrent(); saveArchive();
    /* اعلان تکی: دو وام هم‌مبلغ عوض‌پذیرند → اولی */
    const one = hkMatchInstallment(595591, { y: 1405, m: 6, d: 23 }, 'برداشت', 'ملی');
    const two = hkMatchInstallment(1190400, { y: 1405, m: 5, d: 25 }, 'برداشت', 'ملی');
    const out = { one: one && one.plan.id + ':' + one.idx, two: two && two.plan.id + ':' + two.idxs.join('+') + ':' + two.late.join('/') };
    openSmsBulkModal(); await w(150);
    const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select');
    [...sels[1]._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === '5').click(); await w(50);
    await hkBulkRead(); await w(1000);
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(900);
    out.sum = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
    const rowsOf = m => { const pd = archive['1405-' + m]; return pd ? pd.expense.sections.flatMap(s => s.rows).filter(x => x.amount) : []; };
    out.mordad = rowsOf(5).map(x => x.fromPlanId + ':' + x.fromPlanIndex + ':' + x.status + ':' + x.amount + ':' + x.account);
    out.mordadDesc = rowsOf(5).map(x => x.desc);
    out.shahrivar = rowsOf(6).map(x => x.fromPlanId + ':' + x.fromPlanIndex + ':' + x.status + ':' + x.amount);
    out.paid = plans.map(x => x.paidCount); out.late = plans.map(x => Object.keys(x.paidLateMap || {}).join(','));
    out.extra = ['5', '6'].reduce((n, m) => n + rowsOf(m).filter(x => !x.fromPlanId).length, 0);
    return out;
  });
  ok(ins.one === 'pa:3', 'برداشت ۵۹۵٬۵۹۱ با دو وام هم‌مبلغ (۵۹۶٬۳۲۸ روز ۲۱): نامطمئن نیست؛ قدیمی‌ترین قسط پرداخت‌نشدهٔ وام اول');
  ok(ins.two === 'pa:2+3:true/false', '۱٬۱۹۰٬۴۰۰ ≈ دو قسط: قسط تیر (دیرکرد) و مرداد همان وام');
  ok(ins.mordad.length === 4 && ins.mordad.every(x => /:paid:/.test(x) && /:ملی$/.test(x)) && ins.mordad.filter(x => /^pa:/.test(x)).length === 2 && ins.mordad.filter(x => /^pb:/.test(x)).length === 2 && ins.mordadDesc.every(d => /۲ قسط با هم/.test(d)), 'مرداد: هر دو وام، هر کدام دو قسط پرداخت‌شده (تیر «معوق» + مرداد) با حساب ملی');
  ok(ins.mordad.filter(x => /^pa:/.test(x)).reduce((s2, x) => s2 + Number(x.split(':')[3]), 0) === 1190400, 'جمع دو ردیف هر وام = مبلغ واقعی پیامک (۱٬۱۹۰٬۴۰۰)');
  ok(ins.shahrivar.length === 2 && ins.shahrivar.some(x => /^pa:4:paid:595591$/.test(x)) && ins.shahrivar.some(x => /^pb:4:paid:600000$/.test(x)), 'شهریور: ۵۹۵٬۵۹۱ و ۶۰۰٬۰۰۰ هر کدام قسط یکی از دو وام');
  ok(ins.paid.join() === '5,5' && ins.late.join('|') === '2|2' && ins.extra === 0 && /۶ پرداخت قسط شناخته شد/.test(ins.sum), 'شمار قسط‌ها ۵ برای هر وام، ردیف اضافه ساخته نشد (' + ins.sum.split('\n')[1] + ')');

  /* ---------- باکس هوشمند، پروژه، پیوست ---------- */
  console.log('• باکس هوشمند، پروژه، پیوست');
  const s = await page(b, []); s.on('pageerror', e => errors.push(e.message));
  await s.goto(INDEX); await s.waitForTimeout(1600);
  const sm = await s.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'خرید یخچال', amount: 30000000, status: 'paid' })] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [] }];
    persistCurrent(); renderAll();
    /* کارها: انجام‌شده پایین */
    saveTodoList('سارا', 'l1', [{ t: 'نان', done: true }, { t: 'شیر', done: false }, { t: 'قبض', done: false }]);
    const pg = spPageTodo({ title: 'سارا' })[0];
    const d = document.createElement('div'); d.innerHTML = pg.html;
    out.slide = [...d.querySelectorAll('.sp-todo')].map(x => x.textContent + (x.classList.contains('done') ? '✓' : ''));
    openTodoEditor('سارا', 'l1'); await w(250);
    document.querySelectorAll('#todoEditorOverlay .todo-row')[1].querySelector('.todo-check').click(); await w(50);
    out.editor = [...document.querySelectorAll('#todoEditorOverlay .todo-row')].map(x => x.querySelector('.todo-text').textContent + (x.classList.contains('done') ? '✓' : ''));
    closeTodoEditor(); await w(250);
    /* قرض: نام‌ها با کارت جور نیستند → روی کارت اول */
    ensureLedger().sections.push({ id: 'lg1', personA: 'من', personB: 'علی', rows: [{ amount: 2000000, status: 'debt', desc: 'قرض' }] });
    const L = spLedger('سارا');
    const lp = spPageLedger({ led: L }) || '';
    out.ledger = { n: L.list.length, html: lp.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
    ensureLedger().sections.push({ id: 'lg2', personA: 'سارا ', personB: 'رضا', rows: [{ amount: 500000, status: 'debt', desc: 'قرض' }] });
    const L2 = spLedger('سارا');
    out.ledger2 = { debt: L2.debt, credit: L2.credit };
    /* فاصلهٔ نکته‌ها */
    const tp = document.createElement('div'); tp.className = 'sp-scroll sp-tips'; tp.innerHTML = '<div class="sp-tipbox">a</div><div class="sp-tipbox">b</div>'; document.body.appendChild(tp);
    out.tipGap = getComputedStyle(tp).rowGap; out.tipPad = getComputedStyle(tp.firstChild).paddingTop; tp.remove();
    /* پروژه فقط در ماه خودش */
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 1, d: 1 } }); saveBankAccountsSelection();
    loadFinancialSubjects().push({ id: 'pj1', name: 'ساختمان', highlightColor: PROJECT_HIGHLIGHT_PALETTE[0].id }); saveFinancialSubjects();
    const sh = JSON.parse(JSON.stringify(periodData));
    sh.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '5', desc: 'واریز پروژه', amount: 9000000, status: 'paid', account: 'ملی', financialContext: { subjectId: 'pj1', accountType: 'project', classification: 'third_party', fundingSource: 'subject' } })] }];
    sh.expense.sections = [{ id: 's1', title: 'سارا', rows: [] }];
    archive['1405-6'] = sh; saveArchive();
    out.projMehr = hkAccountProjectColors('ملی').length;
    out.cashMehr = projectMoneyOnAccounts('pj1', new Set(['ملی']), periodKey(1405, 7));
    navigateToPeriod(1405, 6); await w(250);
    out.projSh = hkAccountProjectColors('ملی').length;
    out.cashSh = projectMoneyOnAccounts('pj1', new Set(['ملی']), periodKey(1405, 6));
    navigateToPeriod(1405, 7); await w(250);
    /* پیوست */
    openPersonDetail('سارا', 'expense'); await w(500);
    document.querySelector('#panel-expense .pd-num-cell').click(); await w(200);
    const ov = document.getElementById('hkAttachOv');
    out.att = { open: !!ov, beta: ov ? ov.querySelector('.hk-att-beta').textContent : '', btns: ov ? [...ov.querySelectorAll('.hk-att-btn')].map(x => x.textContent.trim()) : [], cam: !!(ov && ov.querySelector('input[capture="environment"]')) };
    return out;
  });
  ok(sm.slide.join('،') === 'شیر،قبض،نان✓', 'اسلاید کارها: انجام‌نشده‌ها بالا، انجام‌شده پایین (' + sm.slide.join('، ') + ')');
  ok(sm.editor.join('،') === 'شیر،قبض✓،نان✓', 'تیک زدن در فهرست: کار انجام‌شده به پایین می‌رود (' + sm.editor.join('، ') + ')');
  ok(sm.ledger.n === 1 && /«علی» بدهکار به «من»|«من» بدهکار به «علی»/.test(sm.ledger.html) && /طلب و بدهی/.test(sm.ledger.html), 'قرضی که نامش با کارت جور نیست هم در باکس هوشمند دیده می‌شود');
  ok(sm.ledger2.debt === 500000, 'نام کارت با فاصلهٔ اضافه («سارا ») هم شناخته می‌شود (بدهی ' + sm.ledger2.debt + ')');
  ok(sm.tipGap === '18px' && sm.tipPad === '3px', 'بین نکته‌ها فاصله (۱۸px) تا حرکت/همزهٔ نکتهٔ بعد در نکتهٔ قبلی دیده نشود');
  ok(sm.projMehr === 0 && sm.cashMehr === 0 && sm.projSh === 1 && sm.cashSh === 9000000, 'پروژه فقط در ماه تراکنشش (شهریور) کنار موجودی ملی با دایرهٔ رنگی و مبلغ همان ماه');
  ok(sm.att.open && sm.att.beta === 'آزمایشی' && sm.att.btns.join('،') === 'گرفتن عکس،انتخاب از گالری،ضبط صدا' && sm.att.cam, 'زدن شمارهٔ ردیف: پنجرهٔ پیوست (آزمایشی) با گرفتن عکس / گالری / ضبط صدا');

  /* عکس بزرگ → فشرده */
  const big = await s.evaluate(() => { const c = document.createElement('canvas'); c.width = 4000; c.height = 3000; const g = c.getContext('2d'); for (let i = 0; i < 600; i++) { g.fillStyle = 'hsl(' + i + ',70%,50%)'; g.fillRect((i * 97) % 4000, (i * 53) % 3000, 260, 180); } return c.toDataURL('image/png').split(',')[1]; });
  const tmp = path.join(__dirname, '..', 'out'); fs.mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, 'att-big.png'); fs.writeFileSync(f, Buffer.from(big, 'base64'));
  await s.setInputFiles('#hkAttachOv input[accept="image/*"]:not([capture])', f);
  await s.waitForTimeout(1500);
  const at = await s.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const row = periodData.expense.sections[0].rows[0];
    const a = (row.att || [])[0];
    const blob = a ? await HKAttach.get(a.id) : null;
    const dims = blob ? await new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.src = URL.createObjectURL(blob); }) : [];
    const out = { n: (row.att || []).length, kind: a && a.kind, size: blob ? blob.size : 0, type: blob ? blob.type : '', dims, thumb: !!document.querySelector('#hkAttachOv .hk-att-media img'), ico: !!document.querySelector('#panel-expense .pd-att-ico') };
    onBackGuard(); await w(200);
    out.closed = !document.getElementById('hkAttachOv') && !!_detailContext;
    return out;
  });
  const orig = fs.statSync(f).size; fs.unlinkSync(f);
  ok(at.n === 1 && at.kind === 'img' && at.type === 'image/jpeg' && Math.max(...at.dims) === 1600 && at.size < orig / 2 && at.size < 500 * 1024, 'عکس ۴۰۰۰×۳۰۰۰ به ۱۶۰۰px و JPEG فشرده ذخیره شد (' + Math.round(orig / 1024) + ' → ' + Math.round(at.size / 1024) + ' کیلوبایت)');
  ok(at.thumb && at.ico, 'پیش‌نمایش عکس در پنجره و نشان گیره کنار شمارهٔ ردیف');
  ok(at.closed, 'بک اندروید پنجرهٔ پیوست را می‌بندد و صفحه سر جایش می‌ماند');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
