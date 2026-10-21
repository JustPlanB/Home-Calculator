// نسخهٔ ۱.۳.۴۷: «ماهی که گذشت در یک نگاه»، رنگ گلبهی پرداخت/دریافت‌نشده، باکس ویرایش ردیف (تاریخ/زمان ساده، شمارهٔ ردیف، لینک فایل)،
// باکس ثبت تراکنش تازه (دسته‌های آیکونی، حساب تازه با نام تایپی)، نام کاربر در منوی کناری، اعلان رسمی اندروید، حذف منوهای «بخش». فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337', 'instOff1346'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-21T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• اعلان (کد اندروید)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  const post = patch.slice(patch.indexOf('static void postNotification'), patch.indexOf('static void postNotification') + 3000);
  ok(!/setCustomContentView|DecoratedCustomViewStyle/.test(post) && /baseBuilder\(c,title,text\)/.test(post), 'اعلان تراکنش دوباره با چیدمان رسمی اندروید (BigTextStyle)');
  ok(/setLabel\("بابت چی بود؟ \(شرح\)"\)/.test(patch) && /setHint\("بابت چی بود؟ \(شرح\)"\)/.test(patch), 'راهنمای فیلد اعلان و باکس شناور: «بابت چی بود؟ (شرح)»');

  const seed = () => p.evaluate(() => {
    const t = hkMainTitle();
    const R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'اجاره', amount: 7000000, status: 'paid' }), R('expense', { day: '5', desc: 'قبض برق', amount: 350000, status: 'unpaid' })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 20000000, status: 'paid' }), R('income', { day: '10', desc: 'اجاره دریافتی', amount: 5000000, status: 'unpaid' })];
    persistCurrent(); renderAll();
    return t;
  });
  const title = await seed();

  console.log('• رنگ‌ها');
  const col = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(200);
    const lines = [...document.querySelectorAll('.person-card .person-stat-box')];
    const c = (box, cls) => getComputedStyle(box.querySelector('.person-stat-line.' + cls)).color;
    const out = { incUnpaid: c(lines[0], 'unpaid'), incPaid: c(lines[0], 'paid'), expPaid: c(lines[1], 'paid'), expUnpaid: c(lines[1], 'unpaid') };
    out.nameHidden = getComputedStyle(document.querySelector('.person-card .person-card-top')).display === 'none';
    openPersonDetail(t, 'expense'); await w(500);
    const amts = [...document.querySelectorAll('#panel-expense .pd-amt')];
    out.tblPaid = getComputedStyle(amts[0]).color; out.tblUnpaid = getComputedStyle(amts[1]).color;
    /* زدن روی مبلغ: فقط مبلغ یک‌خطی در باکس شناور (بی منوی وضعیت) */
    amts[0].click(); await w(120);
    const pop = document.querySelector('.pd-amt-popup');
    out.pop = pop ? pop.textContent : ''; out.popNowrap = pop ? getComputedStyle(pop).whiteSpace : ''; out.statusMenu = !!document.querySelector('.status-menu');
    closeCellTextPopups(); closePersonDetail(); await w(200);
    return out;
  }, title);
  ok(col.incUnpaid === 'rgb(244, 143, 177)' && col.expUnpaid === 'rgb(244, 143, 177)', 'کارت: دریافت‌نشده و پرداخت‌نشده گلبهی پاستلی');
  ok(col.expPaid === 'rgb(255, 107, 74)' && col.incPaid === 'rgb(158, 232, 88)', 'کارت: پرداخت‌شدهٔ مخارج نارنجی، دریافت‌شدهٔ درآمد سبز');
  ok(col.nameHidden, 'نام کارت دیگر بالای کارت نیست');
  ok(col.tblPaid === 'rgb(255, 107, 74)' && col.tblUnpaid === 'rgb(244, 143, 177)', 'جدول مخارج: پرداخت‌شده نارنجی، پرداخت‌نشده گلبهی');
  ok(/۷,۰۰۰,۰۰۰ تومان/.test(col.pop) && col.popNowrap === 'nowrap' && !col.statusMenu, 'زدن روی مبلغ: مبلغ یک‌خطی در باکس شناور، بی منوی تغییر وضعیت');

  console.log('• باکس ویرایش ردیف');
  const ed = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sec = findSectionByTitle('expense', t);
    hkOpenRowEdit({ row: sec.rows[1], tab: 'expense', title: t, sec: sec, num: 2 });
    await w(200);
    const box = document.getElementById('hkRowEdit');
    const out = { title: box.querySelector('.hk-re-title').textContent };
    const pills = [...box.querySelectorAll('.hk-re-pill')];
    out.pills = pills.map(x => x.querySelector('span').textContent + '=' + x.querySelector('b').textContent);
    out.closed = [...box.querySelectorAll('.hk-re-pnl')].every(x => getComputedStyle(x).display === 'none');
    pills[0].click(); await w(100);
    out.dateOpen = getComputedStyle(box.querySelectorAll('.hk-re-pnl')[0]).display !== 'none' && getComputedStyle(box.querySelectorAll('.hk-re-pnl')[1]).display === 'none';
    pills[1].click(); await w(100);
    out.timeOpen = getComputedStyle(box.querySelectorAll('.hk-re-pnl')[1]).display !== 'none' && getComputedStyle(box.querySelectorAll('.hk-re-pnl')[0]).display === 'none';
    out.noChip = !box.querySelector('.hk-re-chip');
    const on = box.querySelector('.hk-re-segb.on');
    out.segOn = on.textContent + '|' + getComputedStyle(on).color;
    const paidB = box.querySelector('.hk-re-segb.is-paid'); paidB.click(); await w(50);
    out.segPaid = getComputedStyle(paidB).color;
    out.fileBtn = !!box.querySelector('.hk-re-fbtn');
    const fl = box.querySelector('.hk-re-flink'); out.fileTxt = fl ? fl.textContent : '';
    if (fl) fl.click(); await w(250);
    out.attOpen = !!document.getElementById('hkAttachOv');
    try { hkCloseAttach(); } catch (e) {}
    box._hkCancel(); await w(100);
    return out;
  }, title);
  ok(ed.title === 'ویرایش ردیف ۲ مخارج', 'عنوان با شمارهٔ ردیف: «' + ed.title + '»');
  ok(ed.pills.length === 2 && /^تاریخ=۱۴۰۵\/۰۷\/۰۵$/.test(ed.pills[0]) && /^زمان=/.test(ed.pills[1]) && ed.closed && ed.noChip, 'تاریخ و زمان: دو دکمهٔ ساده (' + ed.pills.join('، ') + ')؛ چرخ‌ها بسته');
  ok(ed.dateOpen && ed.timeOpen, 'زدن «تاریخ» یا «زمان» فقط چرخ‌های همان را باز می‌کند');
  ok(/پرداخت نشده\|rgb\(244, 143, 177\)/.test(ed.segOn) && ed.segPaid === 'rgb(255, 107, 74)', 'رنگ وضعیت‌ها: پرداخت‌نشده گلبهی، پرداخت‌شدهٔ مخارج نارنجی');
  ok(!ed.fileBtn && ed.fileTxt === 'افزودن فایل' && ed.attOpen, 'بی دکمهٔ «دیدن/افزودن»؛ زدن روی نوشتهٔ فایل پنجرهٔ پیوست را باز می‌کند');

  console.log('• لانگ‌پرس: رها کردن انگشت دکمهٔ زیرش را نمی‌زند');
  const lp = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail(t, 'expense'); await w(500);
    const tr = document.querySelector('#panel-expense tbody tr');
    const r = tr.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0 }));
    await w(560);
    const act = document.querySelector('.hk-row-act');
    const out = { act: !!act };
    /* انگشت رها می‌شود روی «ویرایش» که تازه زیرش باز شده → باکس ویرایش باز نشود */
    const eb = act && act.querySelector('.hk-ra-edit');
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    if (eb) eb.click(); await w(150);
    out.editAfterRelease = !!document.getElementById('hkRowEdit');
    await w(450);
    const eb2 = document.querySelector('.hk-row-act .hk-ra-edit'); if (eb2) eb2.click(); await w(200);
    out.editOnTap = !!document.getElementById('hkRowEdit');
    const re = document.getElementById('hkRowEdit'); if (re) re._hkCancel();
    try { hkCloseRowActions(); } catch (e) {}
    closePersonDetail(); await w(200);
    return out;
  }, title);
  ok(lp.act && !lp.editAfterRelease, 'بعد از لانگ‌پرس، کلیکِ رها کردن انگشت روی «ویرایش» کاری نمی‌کند');
  ok(lp.editOnTap, 'زدن بعدی روی «ویرایش» باکس ویرایش را باز می‌کند');

  console.log('• ردیف‌های قسط قدیمی قابل حذف');
  const inst = await p.evaluate(async (t) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sec = findSectionByTitle('expense', t);
    sec.rows.push(Object.assign(emptyRow('expense'), { day: '7', desc: 'قسط ۳ وام', amount: 1000000, status: 'paid', fromPlanId: 'old_pl' }));
    persistCurrent();
    openPersonDetail(t, 'expense'); await w(500);
    const trs = [...document.querySelectorAll('#panel-expense tbody tr')];
    const tr = trs.find(x => /قسط ۳ وام/.test(x.textContent) || [...x.querySelectorAll('input,textarea')].some(i => /قسط ۳ وام/.test(i.value)));
    const r = tr.getBoundingClientRect();
    tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 20, clientY: r.top + r.height / 2, button: 0 }));
    await w(560); window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await w(450);
    const del = document.querySelector('.hk-row-act .hk-ra-del');
    const out = { off: del ? del.classList.contains('hk-ra-off') : true };
    window.askConfirm = (m, fn) => fn();
    if (del) del.click(); await w(300);
    out.gone = !findSectionByTitle('expense', t).rows.some(x => x.fromPlanId === 'old_pl');
    closePersonDetail(); await w(200);
    return out;
  }, title);
  ok(!inst.off && inst.gone, 'ردیف قسطِ مانده از پشتیبان قبلی با لانگ‌پرس حذف شد');

  console.log('• منوی کناری، جستجو، قرض، پشتیبان، خروجی');
  const ui = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    toggleMenu(); await w(300);
    const out = { menuName: (document.getElementById('menuUserName') || {}).textContent || '', recapItem: !!document.getElementById('menuRecapBtn') };
    out.instHidden = [...document.querySelectorAll('#menuDropdown .menu-item')].filter(b => b.textContent.trim() === 'اقساط').every(b => getComputedStyle(b).display === 'none');
    closeSideMenu(); await w(200);
    openHomeMandeh(); await w(500);
    const sc = document.querySelector('.bsr-sec-cell');
    out.searchSec = sc ? getComputedStyle(sc).display : 'gone';
    closePersonDetail(); await w(200);
    switchTabFromMenu('ledger'); await w(300);
    const lf = document.getElementById('ledgerFilters');
    out.ledgerFilter = lf ? (getComputedStyle(lf).display === 'none' || !lf.children.length) : true;
    try { closeFeatureSheet(); } catch (e) {} await w(200);
    /* پشتیبان: سؤال «کدام کارت‌ها» پرسیده نمی‌شود */
    let exported = null; const orig = window.exportFullBackup; window.exportFullBackup = function (sel) { exported = sel; };
    try { askBackupUserCards({}); } catch (e) {}
    window.exportFullBackup = orig;
    out.backupDirect = !!exported && exported._allUserCards === true && !document.querySelector('[data-backup-step="cards"]');
    /* خروجی: بی منوی «بخش»؛ عنوان با نام کاربر یک بار */
    hkOpenExportDialog('pdf'); await w(200);
    const em = document.getElementById('hkExportModal');
    const us = em.querySelector('[data-slot="user"]');
    out.exportSec = us ? getComputedStyle(us.parentNode).display : 'gone';
    em._hkCancel();
    _hkExportOpts = { range: 'month', user: '', sections: null };
    const blocks = buildPdfBlocks().map(x => x.html).join('');
    const sheets = buildXlsxSheets().sheets;
    _hkExportOpts = null;
    const nm = hkMainTitle();
    out.pdfTitle = (blocks.match(/<h1>([^<]*)<\/h1>/) || [])[1] || '';
    out.pdfNameCount = blocks.split(nm).length - 1;
    out.xlsTitle = sheets[0].rows[0][0].v;
    const exp = sheets.find(s => s.name === 'مخارج');
    out.xlsHead = exp.rows[0].map(c => c.v).join('|');
    out.xlsTotal = exp.rows[exp.rows.length - 1][0].v;
    return out;
  });
  ok(ui.menuName.trim() === title && ui.recapItem && ui.instHidden, 'منوی کناری: نام کاربر بالای منو، «ماهی که گذشت» هست، «اقساط» پنهان');
  ok(ui.searchSec === 'none', 'جستجو: منوی «بخش» برداشته شد');
  ok(ui.ledgerFilter, 'قرض: فیلتر نام افراد برداشته شد');
  ok(ui.backupDirect, 'پشتیبان‌گیری: سؤال «کدام کارت‌ها» پرسیده نمی‌شود');
  ok(ui.exportSec === 'none', 'خروجی PDF/اکسل: منوی «بخش» برداشته شد');
  ok(ui.pdfTitle.indexOf(title) >= 0 && ui.pdfNameCount === 1, 'PDF: نام کاربر فقط یک بار، در عنوان (' + ui.pdfTitle + ')');
  ok(ui.xlsTitle.indexOf(title) >= 0 && !/^کارت/.test(ui.xlsHead) && ui.xlsTotal === 'جمع کل', 'اکسل: نام در عنوان؛ ستون «کارت» و جمع هر کارت نیست (' + ui.xlsHead + ')');

  console.log('• آرشیو درآمد ثابت: × فقط اتصال را برمی‌دارد');
  const ar = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle();
    const it = { id: 'rq1', name: 'اجاره واحد', amount: 5000000, account: '', sectionTitle: t, contractStart: { y: 1405, m: 1, d: 5 }, contractEnd: { y: 1406, m: 1, d: 5 }, createdAt: 1 };
    recurringIncomes.push(it); saveRecurring();
    const row = Object.assign(emptyRow('income'), { day: '5', desc: 'اجاره', amount: 5000000, status: 'paid', fromRecurringId: 'rq1', recLinked: true });
    archive['1405-5'] = { income: { sections: [{ id: 's1', title: t, rows: [row] }] }, expense: { sections: [] } };
    saveArchive();
    recOpenArchive(it, recTermsOf(it).length - 1); await w(250);
    const x = document.querySelector('#recArchiveModal .rec-arch-del') || document.querySelector('.rec-arch-del');
    const out = { has: !!x };
    if (x) x.click(); await w(150);
    const pm = document.getElementById('recPickModal');
    out.title = pm ? pm.firstElementChild.firstElementChild.textContent : '';
    out.opts = pm ? [...pm.querySelectorAll('.rec-pick-opt')].map(b => b.textContent).join('|') : '';
    /* زدن بیرون = انصراف */
    if (pm) pm.dispatchEvent(new MouseEvent('click', { bubbles: true })); await w(100);
    out.cancelKept = !!archive['1405-5'].income.sections[0].rows[0].fromRecurringId && !document.getElementById('recPickModal');
    const x2 = document.querySelector('.rec-arch-del'); if (x2) x2.click(); await w(150);
    const yes = [...document.querySelectorAll('#recPickModal .rec-pick-opt')].find(b => b.textContent === 'بلی'); if (yes) yes.click(); await w(200);
    const r2 = archive['1405-5'].income.sections[0].rows[0];
    out.unlinked = !!r2 && !r2.fromRecurringId && r2.amount === 5000000;
    try { const am = document.getElementById('recArchiveModal'); if (am) am.remove(); } catch (e) {}
    return out;
  });
  ok(ar.has && ar.title === '۱۴۰۵/۵/۵ از این آرشیو حذف شود؟' && ar.opts === 'بلی|خیر', 'پنجرهٔ × : «' + ar.title + '» با «بلی / خیر»');
  ok(ar.cancelKept, 'زدن بیرون پنجره = انصراف (اتصال می‌ماند)');
  ok(ar.unlinked, '«بلی»: فقط اتصال برداشته شد و ردیف سر جایش ماند');

  console.log('• باکس ثبت تراکنش');
  const sms = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.onBankSmsReceived('بانك ملي ايران\nبرداشت:2,000,000-\nحساب:9991234\nمانده:5,000,000\n0729-12:30', { nid: 0, sender: '+989121234567' });
    await w(900);
    const m = document.getElementById('smsConfirmModal');
    const out = { open: m.classList.contains('open') };
    const tt = document.getElementById('smsConfirmTitle');
    out.title = tt.textContent; out.titleAlign = getComputedStyle(tt).textAlign; out.titleBg = getComputedStyle(tt).backgroundColor;
    const warn = document.getElementById('smsSenderWarn');
    out.warn = warn ? warn.textContent.replace(/\s+/g, ' ').trim() : ''; out.warnColor = warn ? getComputedStyle(warn).color : ''; out.warnJustify = warn ? getComputedStyle(warn).justifyContent : '';
    const amt = document.querySelector('.sms-ro-amt');
    const sm = amt.querySelector('small').getBoundingClientRect(), num = amt.querySelector('span').getBoundingClientRect();
    out.tomanLeft = sm.right <= num.left + 1;
    out.noTypeChip = !document.querySelector('.sms-ro-type');
    const dl = document.querySelector('.sms-ro-date'); out.dateBold = dl ? parseInt(getComputedStyle(dl).fontWeight, 10) : 0;
    out.descLabel = [...m.querySelectorAll('.family-label')].map(l => l.textContent).find(x => /بابت/.test(x)) || '';
    const grid = document.getElementById('smsCatGrid');
    out.cats = grid ? grid.querySelectorAll('.sms-cat').length : 0;
    out.catRows = grid ? Math.ceil(out.cats / 5) : 0;
    out.icons = grid ? grid.querySelectorAll('.sms-cat i svg').length : 0;
    const nw = document.getElementById('smsNewAccWrap');
    out.newMsg = nw ? nw.querySelector('.sms-newacc-msg').textContent : '';
    out.newVal = (document.getElementById('smsNewAccName') || {}).value || '';
    const bs = document.getElementById('smsConfirmBank'); const aw = bs.parentNode.classList.contains('fancy-select-wrap') ? bs.parentNode : bs;
    out.dropHidden = getComputedStyle(aw).display === 'none';
    /* دسته + نام تکراری */
    grid.querySelector('[data-cat="food"]').click();
    selectedBankAccounts.push({ id: 'bx', bank: 'بانک ملت', label: 'ملت', openingBalance: 0, createdAt: getTodayPersian() });
    const ni = document.getElementById('smsNewAccName');
    ni.value = 'ملت'; ni.dispatchEvent(new Event('input'));
    out.dupHint = nw.querySelector('.hk-acc-dup').textContent;
    confirmSmsEntry(); await w(300);
    out.blockedDup = m.classList.contains('open') && !selectedBankAccounts.some(a => a.label === 'ملت' && a.id !== 'bx');
    ni.value = 'ملی ۱۲۳۴'; ni.dispatchEvent(new Event('input'));
    document.getElementById('smsConfirmDesc').value = 'نان بربری';
    confirmSmsEntry(); await w(900);
    const acc = selectedBankAccounts.find(a => a.label === 'ملی ۱۲۳۴');
    out.created = !!acc; out.opening = acc ? acc.openingBalance : null;
    out.closed = !m.classList.contains('open');
    out.mapped = smsAccountBankMap['L4:1234'];
    out.bal = (globalAccountBalances() || {})['ملی ۱۲۳۴'];
    const c = HKCategorizer.classify('نان بربری'); out.cat = c ? c.id : '';
    return out;
  });
  ok(sms.open && sms.title === 'ثبت برداشت' && sms.titleAlign === 'center' && sms.titleBg !== 'rgba(0, 0, 0, 0)', 'عنوان «ثبت برداشت» وسط‌چین در سلول تیره‌تر');
  ok(/پیامک شخصی از طرف «\+۹۸۹۱۲۱۲۳۴۵۶۷»/.test(sms.warn) && /⚠/.test(sms.warn) && sms.warnColor === 'rgb(255, 255, 255)' && sms.warnJustify === 'center', 'پیامک شخصی: «⚠ پیامک شخصی از طرف «شماره»» وسط‌چین با نوشتهٔ سفید');
  ok(sms.tomanLeft && sms.noTypeChip && sms.dateBold >= 700, '«تومان» سمت چپ عدد؛ بی آیکون نوع جلوی تاریخ؛ تاریخ و زمان پررنگ');
  ok(sms.descLabel === 'بابت چی بود؟ (شرح)', 'عنوان شرح: «بابت چی بود؟ (شرح)»');
  ok(sms.cats >= 10 && sms.icons === sms.cats && sms.catRows >= 2 && sms.catRows <= 3, 'دسته‌ها زیر شرح: ' + sms.cats + ' آیکون در ' + sms.catRows + ' ردیف');
  ok(sms.newMsg === 'حساب ملی ۱۲۳۴ هنوز ساخته نشده' && sms.dropHidden && sms.newVal === 'ملی ۱۲۳۴', 'حساب تازه: «' + sms.newMsg + '»؛ به‌جای منوی کشویی فیلد نام (پیشنهاد: ' + sms.newVal + ')');
  ok(/قبلاً هست|هست؛/.test(sms.dupHint) && sms.blockedDup, 'نام تکراری: هشدار و ثبت انجام نشد');
  ok(sms.created && sms.closed && sms.mapped === 'ملی ۱۲۳۴' && sms.opening === 700000 && sms.bal === 500000, 'با «ثبت» حساب «ملی ۱۲۳۴» با موجودیِ پیامک ساخته شد (موجودی ' + sms.bal + ')');
  ok(sms.cat === 'food', 'انتخاب دستهٔ «خوراکی» برای همین شرح یاد گرفته شد');

  console.log('• تشخیص حساب با اسم بانک');
  const bk = await p.evaluate(() => {
    const raw = 'بانك ملت\nبرداشت:1,000,000-\nحساب:5555\nمانده:9,000,000\n0729-12:30';
    const r1 = hkSmsAccountRoute({ raw: raw });
    return { label: r1.label, need: r1.need };
  });
  ok(bk.label === 'ملت' && !bk.need, 'رقم‌های تازه + تنها حساب همان بانک (ملت) → همان حساب پیش‌انتخاب شد');

  console.log('• ماهی که گذشت در یک نگاه');
  const rc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(); const R = (tab, o) => Object.assign(emptyRow(tab), o);
    archive['1405-6'] = { income: { sections: [{ id: 's1', title: t, rows: [R('income', { day: '1', desc: 'حقوق', amount: 30000000, status: 'paid' })] }] }, expense: { sections: [{ id: 's1', title: t, rows: [R('expense', { day: '3', desc: 'اجاره خانه', amount: 12000000, status: 'paid' }), R('expense', { day: '8', desc: 'بنزین', amount: 600000, status: 'unpaid' })] }] } };
    openMonthRecap(); await w(400);
    const ov = document.getElementById('hkRecapOv');
    const out = { open: !!ov };
    out.title = ov.querySelector('.hk-rc-title').textContent; out.month = ov.querySelector('.hk-rc-month').textContent;
    out.slides = ov.querySelectorAll('.hk-rc-slide').length; out.dots = ov.querySelectorAll('.hk-rc-dots i').length;
    out.first = ov.querySelector('.hk-rc-slide').textContent;
    const tr = ov.querySelector('.hk-rc-track'); tr.scrollLeft = -tr.clientWidth; await w(250);
    out.dot2 = ov.querySelectorAll('.hk-rc-dots i')[1].classList.contains('on') && !ov.querySelectorAll('.hk-rc-dots i')[0].classList.contains('on');
    ov._hkCancel(); await w(300);
    out.closed = !document.getElementById('hkRecapOv');
    out.seen = localStorage.getItem('hesabKetabArchive_v5_recapSeen');
    return out;
  });
  ok(rc.open && rc.title === 'ماهی که گذشت در یک نگاه' && rc.month === 'شهریور ۱۴۰۵', 'از منو: «ماهی که گذشت در یک نگاه» برای شهریور ۱۴۰۵');
  ok(rc.slides >= 4 && rc.dots === rc.slides && /۳۰,۰۰۰,۰۰۰/.test(rc.first) && /۱۲,۶۰۰,۰۰۰/.test(rc.first), rc.slides + ' اسلاید با همان تعداد دایره؛ اسلاید اول درآمد و خرج ماه');
  ok(rc.dot2 && rc.closed, 'با ورق زدن دایرهٔ بعدی روشن می‌شود؛ بستن کار می‌کند');
  ok(rc.seen === '1405-7', 'ماه جاری علامت خورده (بار اول نمایش خودکار ندارد)');

  /* اولین ورود در ماه تازه: نمایش خودکار */
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx2.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instOff1346'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('hesabKetabArchive_v5_recapSeen', '1405-6');
    }
  });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(e.message));
  await p2.clock.setFixedTime(new Date('2026-10-21T09:10:00Z'));
  await p2.goto(INDEX); await p2.waitForTimeout(800);
  await p2.evaluate(() => {
    const t = hkMainTitle();
    archive['1405-6'] = { income: { sections: [{ id: 's1', title: t, rows: [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 1000, status: 'paid' })] }] }, expense: { sections: [] } };
  });
  await p2.waitForTimeout(2200);
  const auto = await p2.evaluate(() => ({ open: !!document.getElementById('hkRecapOv'), month: (document.querySelector('.hk-rc-month') || {}).textContent || '', seen: localStorage.getItem('hesabKetabArchive_v5_recapSeen') }));
  ok(auto.open && auto.month === 'شهریور ۱۴۰۵' && auto.seen === '1405-7', 'اولین ورود در مهر: پنجرهٔ شهریور خودش باز شد');
  await ctx2.close();

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ' (' + errors.join(' | ') + ')' : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
