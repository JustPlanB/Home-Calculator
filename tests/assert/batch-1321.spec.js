// نسخهٔ ۱.۳.۲۱: فلش یکسان منوهای کشویی، فیلد «رهن»، منوی اصلی درآمد ثابت همیشه باز، PDF/Excel درآمد ثابت،
// رمزنگاری پشتیبان (کلید روشن/خاموش، توضیح در باکس اطلاعات، بستن با بازگشت/بیرون)، برچسب پوشهٔ آرشیو،
// ویرایش بدون ساخت خودکار ردیف، حذف پروژه با/بدون ردیف‌ها. فقط دادهٔ مصنوعی؛ «امروز» ۲۱ مهر ۱۴۰۵.
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
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '6', desc: 'اجاره واحد ۳', amount: 9000000, status: 'paid', account: ACC })] }];
    persistCurrent(); renderAll();
  }, ACC);

  console.log('• فلش یکسان منوهای کشویی');
  const ar = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(300);
    const dsBtn = document.querySelector('#balanceAccountFilterWrap .dark-select-btn');
    const fBtn = document.querySelector('#balanceSearchRange') ? document.getElementById('balanceSearchRange').parentNode.querySelector('.fancy-select-btn') : null;
    const mask = el => { const cs = getComputedStyle(el, '::after'); return (cs.webkitMaskImage || cs.maskImage || '') + '|' + cs.backgroundColor; };
    const out = { d: dsBtn ? mask(dsBtn) : '', f: fBtn ? mask(fBtn) : '' };
    dsBtn.click(); await w(250);
    out.dOpen = getComputedStyle(dsBtn, '::after').transform;
    closeDarkSelects(); await w(250);
    out.dClosed = getComputedStyle(dsBtn, '::after').transform;
    closePersonDetail(); await w(200);
    return out;
  });
  ok(/svg/.test(ar.d) && /svg/.test(ar.f) && ar.d.split('|')[0] === ar.f.split('|')[0], 'منوی حساب و منوهای دیگر جستجو یک فلش دارند (همان فلش درآمد ثابت)');
  ok(ar.dOpen !== ar.dClosed, 'فلش منوی کشویی با باز شدن می‌چرخد');

  console.log('• درآمد ثابت: منوی اصلی همیشه باز، فیلد «رهن»، ویرایش بدون ساخت ردیف');
  const rc = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openFeatureSheet('recurring'); await w(400);
    const out = {};
    const head = document.getElementById('recurringHead');
    out.noArrow = !head.querySelector('.collapse-arrow, svg');
    head.click(); await w(150);
    out.stillOpen = !!document.getElementById('addRecurringBtn') && document.getElementById('recurringBox').querySelectorAll('h3').length === 1 && !recurringCollapsed;
    document.getElementById('addRecurringBtn').click(); await w(300);
    const sh = document.getElementById('recurringSheet');
    const dep = sh.querySelector('.rec-deposit-inp');
    out.depPh = dep ? dep.placeholder : '';
    const ins = sh.querySelectorAll('input[type=text]');
    ins[0].value = 'اجاره رهنی'; ins[1].value = '12,000,000'; dep.value = '300,000,000';
    const ds = sh.querySelectorAll('.dark-select'); ds[ds.length - 1].setValue(ACC);
    [...sh.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click(); await w(600);
    const pm = document.getElementById('recPickModal'); if (pm) pm._hkCancel(); await w(200);
    const it = recurringIncomes.find(r => r.name === 'اجاره رهنی');
    out.saved = it && it.deposit;
    const idx = recurringIncomes.indexOf(it);
    const row = document.querySelector('.recurring-row[data-rec-idx="' + idx + '"]');
    row.querySelector('.rec-name').click(); await w(100);
    out.shown = (row.querySelector('.rec-deposit') || {}).textContent || '';
    /* بی‌رهن هم ذخیره می‌شود */
    document.getElementById('addRecurringBtn').click(); await w(300);
    const sh2 = document.getElementById('recurringSheet'); const i2 = sh2.querySelectorAll('input[type=text]');
    i2[0].value = 'بی‌رهن'; i2[1].value = '5,000,000';
    const ds2 = sh2.querySelectorAll('.dark-select'); ds2[ds2.length - 1].setValue(ACC);
    [...sh2.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click(); await w(600);
    const pm2 = document.getElementById('recPickModal'); if (pm2) pm2._hkCancel(); await w(200);
    out.noDep = recurringIncomes.some(r => r.name === 'بی‌رهن' && !r.deposit);
    /* ویرایش موردی که این ماه ردیف ندارد → ردیف ساخته نمی‌شود */
    const it3 = recurringIncomes.find(r => r.name === 'بی‌رهن');
    recRemoveRows(recRowsOf(it3)); it3.genKey = recTodayKey(); renderRecurringBar(); await w(100);
    out.before = recTodayState(it3).kind;
    document.querySelector('[data-re="' + recurringIncomes.indexOf(it3) + '"]').click(); await w(300);
    const sh3 = document.getElementById('recurringSheet'); sh3.querySelectorAll('input[type=text]')[0].value = 'بی‌رهن ۲';
    [...sh3.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click(); await w(600);
    out.pickAfterEdit = !!document.getElementById('recPickModal');
    const it4 = recurringIncomes.find(r => r.name === 'بی‌رهن ۲');
    out.after = recTodayState(it4).kind; out.rows = recRowsOf(it4).length;
    ensureRecurringRows({ toast: false }); out.rowsAfterEnsure = recRowsOf(it4).length;
    /* تمدید با رهن */
    it.contractEnd = { d: 4, m: 7, y: 1405 }; renderRecurringBar(); await w(100);
    document.querySelector('[data-rec-renew="' + recurringIncomes.indexOf(it) + '"]').click(); await w(150);
    const rm = document.getElementById('recRenewModal');
    out.renewDep = rm.querySelector('#recRenewDep').value;
    rm.querySelector('#recRenewDep').value = '350,000,000';
    rm.querySelector('[data-act="ok"]').click(); await w(400);
    const pm3 = document.getElementById('recPickModal'); if (pm3) pm3._hkCancel(); await w(150);
    out.terms = (it.terms || []).map(t => t.deposit); out.dep2 = it.deposit;
    recOpenArchive(it); await w(100);
    const lab = document.querySelector('#recArchiveModal .rec-term-range');
    out.lab = lab ? { t: lab.textContent, c: getComputedStyle(lab).color, w: getComputedStyle(lab).fontWeight } : null;
    out.folderText = [...document.querySelectorAll('#recArchiveModal .rec-term-folder')].map(f => f.innerText.replace(/\s+/g, ' '));
    document.getElementById('recArchiveModal').remove();
    closeFeatureSheet(); await w(200);
    return out;
  }, ACC);
  ok(rc.noArrow && rc.stillOpen, 'منوی اصلی درآمدهای ثابت فلش ندارد و با زدن روی عنوان جمع نمی‌شود');
  ok(rc.depPh === 'مبلغ رهن/ودیعه، اختیاری', 'فیلد رهن با متن «مبلغ رهن/ودیعه، اختیاری»');
  ok(rc.saved === 300000000 && /رهن: ۳۰۰,۰۰۰,۰۰۰ تومان/.test(rc.shown), 'رهن ذخیره و در جزئیات نشان داده شد (' + rc.shown + ')');
  ok(rc.noDep, 'بدون رهن هم ذخیره می‌شود (اختیاری)');
  ok(rc.before === 'none' && !rc.pickAfterEdit && rc.after === 'none' && rc.rows === 0 && rc.rowsAfterEnsure === 0, 'ویرایش موردی که این ماه ردیف ندارد: ردیفی ساخته نشد و وضعیت «ردیفی ندارد» ماند');
  ok(/۳۰۰,۰۰۰,۰۰۰/.test(rc.renewDep) && rc.terms.join() === '300000000' && rc.dep2 === 350000000, 'تمدید: رهن قبلی از پیش نوشته شد؛ رهن هر دوره جدا نگه داشته شد');
  ok(rc.lab && /^۱۴۰۴\/۰۷\/\d|^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2} تا/.test(rc.lab.t) && rc.lab.c === 'rgb(255, 197, 49)' && Number(rc.lab.w) >= 700, 'برچسب پوشه: پررنگ، هم‌رنگ آیکون پوشه، تاریخ عددی (' + (rc.lab && rc.lab.t) + ')');
  ok(rc.folderText.some(t => /رهن ۳۰۰,۰۰۰,۰۰۰/.test(t)) && rc.folderText.some(t => /رهن ۳۵۰,۰۰۰,۰۰۰/.test(t)), 'پوشهٔ هر دوره رهن همان دوره را نشان می‌دهد');

  console.log('• PDF و Excel درآمد ثابت');
  const pdf = await p.evaluate(() => {
    _hkExportOpts = { range: 'month', user: '', sections: { recurring: true } };
    const html = buildPdfBlocks().map(x => x.html).join('');
    const xs = buildXlsxSheets().sheets.find(s => s.name === 'درآمد ثابت');
    _hkExportOpts = null;
    const d = document.createElement('div'); d.innerHTML = html;
    const tables = [...d.querySelectorAll('table')];
    const heads = tables.map(t => [...t.querySelectorAll('thead th')].map(th => th.textContent).join('|'));
    const top = tables.find(t => /نام \(مقصد\)/.test(t.textContent));
    const names = top ? [...top.querySelectorAll('tbody tr')].map(tr => tr.cells[0].textContent) : [];
    return { heads, names, xl: xs ? xs.rows.filter(r => r.length && r[0] && /نام/.test(r[0].v || '')).map(r => r.map(c => c.v).join('|')) : [] };
  });
  ok(pdf.heads.includes('نام (مقصد)|مبلغ ماهانه|رهن|شروع قرارداد|پایان قرارداد|حساب'), 'PDF جدول بالا: نام (مقصد) | مبلغ ماهانه | رهن | شروع | پایان | حساب');
  ok(pdf.heads.includes('نام (شرح)|تاریخ|مبلغ|بانک|وضعیت پرداخت'), 'PDF جدول پایین: نام (شرح) | تاریخ | مبلغ | بانک | وضعیت پرداخت');
  const dayOrder = pdf.names.filter(n => !/جمع/.test(n));
  ok(dayOrder.length >= 2, 'جدول بالا به ترتیب روز (' + dayOrder.join('، ') + ')');
  ok(pdf.xl.some(r => /^نام \(مقصد\)\|مبلغ ماهانه\|رهن/.test(r)), 'Excel هم همان ستون‌ها را دارد');

  console.log('• رمزنگاری پشتیبان خودکار');
  const enc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const oC = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (oC && oC.Plugins) || {}, { NativeFileExport: { saveAutoBackup: async () => ({}), listAutoBackups: async () => ({ files: [] }), deleteAutoBackup: async () => ({}), readAutoBackup: async () => ({ data: '' }) } }) };
    askBackupParts(); await w(200);
    const out = {};
    const sw = document.getElementById('bkEncBtn');
    out.sw = !!sw && sw.classList.contains('hk-switch') && /خاموش/.test(sw.textContent) && /رمزنگاری پشتیبان خودکار/.test(sw.closest('.bk-enc-line').textContent) && !/فعال‌سازی/.test(document.getElementById('bkEncRow').textContent);
    sw.click(); await w(250);
    const ov = document.getElementById('bkEncSetup');
    out.setup = !!ov;
    out.titleInfo = !!(ov && ov.querySelector('.backup-pick-title .hk-info-btn'));
    out.tipHas = ov ? /کد بازیابی/.test(ov.querySelector('.backup-pick-title .hk-info-btn').getAttribute('data-tip')) && /رمز پشتیبان/.test(ov.querySelector('.backup-pick-title .hk-info-btn').getAttribute('data-tip')) : false;
    out.noLongText = ov ? !ov.querySelector('.bk-enc-txt') : false;
    onBackGuard(); await w(350);
    out.backClosed = !document.getElementById('bkEncSetup');
    out.backReopen = !!document.getElementById('bkEncBtn');
    document.getElementById('bkEncBtn').click(); await w(250);
    const ov2 = document.getElementById('bkEncSetup');
    ov2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await w(250);
    out.outsideClosed = !document.getElementById('bkEncSetup');
    try { document.querySelectorAll('.backup-pick-overlay').forEach(x => x.remove()); } catch (e) {}
    window.Capacitor = oC;
    return out;
  });
  ok(enc.sw, 'جلوی «رمزنگاری پشتیبان خودکار» کلید روشن/خاموش مستطیلی (به جای «فعال‌سازی…»)');
  ok(enc.setup && enc.titleInfo && enc.tipHas && enc.noLongText, 'پنجرهٔ فعال‌سازی: آیکون اطلاعات کنار عنوان با توضیح رمز پشتیبان و کد بازیابی؛ متن طولانی از پنجره برداشته شد');
  ok(enc.backClosed && enc.backReopen, 'دکمهٔ بازگشت پنجره را بست (انصراف) و منوی پشتیبان برگشت');
  ok(enc.outsideClosed, 'زدن بیرون باکس هم پنجره را می‌بندد');

  console.log('• حذف پروژه');
  const pj = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const L = loadFinancialSubjects(); L.push({ id: 'pjx', name: 'پروژه تست', highlightColor: 'orange' }); _financialSubjects = L; saveFinancialSubjects();
    const fc = { classification: 'third_party', accountType: 'project', subjectId: 'pjx', subjectName: 'پروژه تست', fundingSource: 'subject', projectAmount: 400000, personalAdvanceAmount: 0 };
    const mk = (desc, amt) => Object.assign(emptyRow('expense'), { day: '7', desc, amount: amt, status: 'paid', account: ACC, financialContext: JSON.parse(JSON.stringify(fc)) });
    periodData.expense.sections[0].rows = [mk('سیمان', 400000), mk('آجر', 250000)];
    persistCurrent();
    const pick = async (labelRe) => { await w(100); const o = [...document.querySelectorAll('#recPickModal .rec-pick-opt')]; const btn = o.find(x => labelRe.test(x.textContent)); const labels = o.map(x => x.textContent); if (btn) btn.click(); await w(200); return labels; };
    const out = {};
    deleteSubject('pjx');
    out.opts = await pick(/ردیف‌ها بمانند/);
    out.gone = !loadFinancialSubjects().some(s => s.id === 'pjx');
    out.kept = periodData.expense.sections[0].rows.filter(r => /سیمان|آجر/.test(r.desc)).map(r => r.financialContext && r.financialContext.subjectId);
    /* بازگردانی از سطل زباله: دوباره وصل می‌شوند */
    let ti = trashItems.findIndex(t => t.type === 'project' && t.title === 'پروژه تست');
    out.restored1 = restoreTrashData(trashItems[ti]);
    out.relinked = periodData.expense.sections[0].rows.filter(r => /سیمان|آجر/.test(r.desc)).map(r => r.financialContext && r.financialContext.subjectId);
    /* حذف با ردیف‌ها */
    deleteSubject('pjx');
    await pick(/^حذف پروژه و ۲ ردیف/);
    out.rowsGone = !periodData.expense.sections[0].rows.some(r => /سیمان|آجر/.test(r.desc));
    ti = trashItems.findIndex(t => t.type === 'project' && t.title === 'پروژه تست' && t.data && t.data.rows);
    out.restored2 = restoreTrashData(trashItems[ti]);
    out.rowsBack = periodData.expense.sections[0].rows.filter(r => /سیمان|آجر/.test(r.desc)).map(r => r.financialContext && r.financialContext.subjectId);
    return out;
  }, ACC);
  ok(pj.opts.some(t => /حذف پروژه و ۲ ردیف/.test(t)) && pj.opts.some(t => /ردیف‌ها بمانند/.test(t)) && pj.opts.some(t => /انصراف/.test(t)), 'هنگام حذف می‌پرسد: با ردیف‌ها / ردیف‌ها بمانند / انصراف');
  ok(pj.gone && pj.kept.join() === 'personal,personal', '«ردیف‌ها بمانند»: ردیف‌ها ماندند و ردیف معمولی (بدون هایلایت پروژه) شدند');
  ok(pj.restored1 && pj.relinked.join() === 'pjx,pjx', 'بازگردانی از سطل زباله: پروژه برگشت و ردیف‌ها دوباره به آن وصل شدند');
  ok(pj.rowsGone, '«با ردیف‌ها»: ردیف‌های درآمد و مخارج پروژه هم حذف شدند');
  ok(pj.restored2 && pj.rowsBack.join() === 'pjx,pjx', 'بازگردانی: پروژه و ردیف‌هایش با هم برگشتند');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1321: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
