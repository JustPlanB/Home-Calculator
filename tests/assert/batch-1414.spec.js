// ۱.۴.۱۶ — قرض ۱۲ ردیف + هینت جای ردیف ۱۳؛ رنگ مبالغ گزارش پروژه؛ فیلد «پروژه» در سرچ؛ ویجت: صفحهٔ تمام‌صفحه و کپسول کوتاه‌تر
const { chromium } = require('playwright');
const fs = require('fs');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• جدول رابطهٔ قرض');
  const L = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const led = ensureLedger(); const rows = []; for (let i = 0; i < 30; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + (i % 28)), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth }));
    led.sections = [{ id: 'S1', personA: 'من', personB: 'علی', collapsed: false, rows }];
    persistCurrent(); touchLocal(); await saveArchive();
    openFeatureSheet('ledger'); await w(700);
    document.querySelector('#sections-ledger .section > .section-header').click(); await w(1200);
    const sec = document.querySelector('#sections-ledger .section.hk-lrel'), body = sec.querySelector('.section-body'), hint = sec.querySelector('.hk-lrel-hint');
    const trs = [...body.querySelectorAll('tbody tr')];
    const bb = body.getBoundingClientRect(), hr = hint.getBoundingClientRect(), tr12 = trs[11].getBoundingClientRect(), tr13 = trs[12].getBoundingClientRect();
    o.visible12 = tr12.bottom <= bb.bottom + 1 && tr13.top >= bb.bottom - 2;
    o.hintH = Math.round(hr.height);
    o.hintBelow = hr.top >= bb.bottom - 1;
    return o;
  });
  ok(L.visible12, 'فقط ۱۲ ردیف دیده می‌شود (ردیف ۱۳ بیرون جدول)');
  ok(L.hintH === 35 && L.hintBelow, 'هینت و اتواسکرول جای ردیف ۱۳ (۲ پیکسل کوتاه‌تر از ردیف ۳۷)');

  console.log('• گزارش پروژه');
  const R = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const t = hkMainTitle();
    const l = loadFinancialSubjects(); l.push({ id: 'pj1', name: 'ساختمان آسمان', highlightColor: nextProjectHighlightColor(l) }); _financialSubjects = l; saveFinancialSubjects();
    const fc = defaultFinancialContext(); fc.classification = 'third_party'; fc.accountType = 'project'; fc.subjectId = 'pj1'; fc.subjectName = 'ساختمان آسمان';
    const se = findSectionByTitle('expense', t), si = findSectionByTitle('income', t);
    se.rows = [Object.assign(emptyRow('expense'), { status: 'paid', day: '3', desc: 'سیمان', amount: 500000, financialContext: fc })];
    si.rows = [Object.assign(emptyRow('income'), { status: 'paid', day: '4', desc: 'واریز کارفرما', amount: 900000, financialContext: fc })];
    persistCurrent();
    openProjectReportModal('pj1'); await w(300);
    const m = document.getElementById('projectReportModal');
    const c = sel => getComputedStyle(m.querySelector(sel)).color;
    o.inTd = c('.proj-td-amt.proj-amt-in'); o.outTd = c('.proj-td-amt.proj-amt-out');
    o.inSum = c('.proj-summary .proj-amt-in'); o.outSum = c('.proj-summary .proj-amt-out');
    m.style.display = 'none';
    /* سرچ: فیلد پروژه */
    openPersonDetail('سارا', 'balance'); await w(300);
    const proj = document.getElementById('balanceSearchProj'), cat = document.getElementById('balanceSearchCat'), ty = document.getElementById('balanceSearchType');
    o.opts = [...proj.options].map(x => x.textContent);
    const wc = cat.closest('.bsr-cell').getBoundingClientRect(), wt = ty.closest('.bsr-cell').getBoundingClientRect(), wp = proj.closest('.bsr-cell').getBoundingClientRect();
    o.sameW = Math.abs(wc.width - wt.width) <= 1 && Math.abs(wp.width - wt.width) <= 1;
    o.sameH = Math.abs(wc.height - wt.height) <= 2 && Math.abs(wp.height - wt.height) <= 2;
    o.sameRow = Math.abs(wc.top - wp.top) <= 1;
    proj.value = 'pj1'; proj.dispatchEvent(new Event('change')); await w(120);
    const rows = [...document.querySelectorAll('#search-result-body tr')].filter(r => !r.classList.contains('sr-wait'));
    o.n = rows.length;
    resetBalanceSearch(); await w(60);
    o.reset = proj.value === '';
    return o;
  });
  ok(R.inTd === 'rgb(158, 232, 88)' && R.inSum === 'rgb(158, 232, 88)', 'واریزی‌ها سبز (ردیف و جمع)');
  ok(R.outTd === 'rgb(255, 107, 74)' && R.outSum === 'rgb(255, 107, 74)', 'مخارج نارنجی (ردیف و جمع)');
  ok(R.opts[0] === 'ندارد' && R.opts.includes('ساختمان آسمان'), 'فیلد پروژه: پیش‌فرض «ندارد» و فهرست پروژه‌ها');
  ok(R.sameW && R.sameH && R.sameRow, 'دسته و پروژه هم‌اندازهٔ فیلدهای بالا و کنار هم');
  ok(R.n === 2 && R.reset, 'انتخاب پروژه: فقط ردیف‌های همان پروژه؛ بازنشانی «ندارد»');

  console.log('• ویجت');
  const dr = fs.readFileSync(require('path').join(__dirname, '../../android-src/HkWidgetDraw.java'), 'utf8');
  const st = fs.readFileSync(require('path').join(__dirname, '../../android-src/HkWidgetStyle.java'), 'utf8');
  const pa = fs.readFileSync(require('path').join(__dirname, '../../scripts/patch-android.js'), 'utf8');
  ok(/LINE_H=154f\/180f/.test(dr) && /float hb=H\*LINE_H/.test(dr), 'ارتفاع کپسول تک‌خطی = ۱۵۴/۱۸۰ (هم‌اندازهٔ ویجت موزیک)');
  ok(/Theme\.Wallpaper\.NoTitleBar/.test(pa) && /"حساب‌کتاب", 26/.test(st) && !/"تنظیمات ویجت"/.test(st), 'صفحهٔ تنظیمات ویجت تمام‌صفحه با اسم نرم‌افزار');
  ok(/class HoleView/.test(st) && /getWidth\(\)\*0\.70f/.test(st) && /HkWidgetTxDraw\.row\(/.test(st), 'پنجرهٔ پیش‌نمایش شفاف با خود ویجت (هر نوع)، حاشیهٔ ۱۵٪');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join('|').slice(0, 120));
  console.log('batch-1414: ' + passed + ' passed, ' + failed + ' failed');
  await b.close(); process.exit(failed ? 1 : 0);
})();
