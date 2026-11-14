// ۱.۴.۱: نگهبان صفحهٔ نیمه‌کشیده، توضیح صفحه‌ها در ⓘ کنار نام، باکس‌های فرورفته مثل قرض، «حساب‌های من» نصف‌نصف،
// ثبت پیامک بی صفحه‌کلید، ورق خوردن نرم تب‌های آمار، شخصی‌سازی (اسلایدها با سر ثابت، اولویت تمام‌صفحه، راهنما بالا)،
// قرض (خلاصه در همان اسکرول، جدول بزرگ)، مسدود کردن پیامک شخصی برای همهٔ حساب‌هایش، روز ردیف اختلاف (خرید بی‌پیامک)،
// ترتیب و بی‌پرشی ویجت تراکنش‌ها، ویبرهٔ لانگ‌پرس تاریخ، قاب یادآور از اسلاید، پس‌انداز. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی ویجت تراکنش‌ها');
  const pa = androidSource();
  ok(/if\(!force && sg\.equals\(LAST_SIG\.get\(id\)\)\) return;/.test(pa) && /render\(ctx, mgr, id, false\)/.test(pa), 'ویجت: به‌روزرسانی از نرم‌افزار فقط وقتی چیزی عوض شده (بی پرش)');
  ok(/public boolean hasStableIds\(\)\{ return true; \}/.test(pa), 'ویجت: شناسهٔ ثابت ردیف‌ها');
  const root = path.join(__dirname, '..', '..');
  ok(/window\.appHaptic\(20\)/.test(fs.readFileSync(path.join(root, 'src', 'js', '07b-close-row-actions.js'), 'utf8')), 'لانگ‌پرس روی تاریخ قفل: ویبره');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• صفحه‌ها');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    /* توضیح صفحه‌ها → ⓘ کنار نام */
    const info = {};
    for (const n of ['openSavingsModal', 'openUserRemindersModal', 'openBankAccountsModal', 'openDongModal', 'openTrashModal', 'hkOpenBlockedAccounts']) {
      window[n](); await w(800);
      const p = [...document.querySelectorAll('.hk-page')].find(x => x.getClientRects().length);
      const ib = p && p.querySelector('.hk-pg-hd .hk-info-btn'), hid = p && p.querySelector('.hk-pg-intro-hid');
      info[n] = !!(ib && hid && !hid.getClientRects().length && (ib.getAttribute('data-tip') || '').length > 30);
      onBackGuard(); await w(600);
    }
    out.info = info;
    /* نگهبان: بعد از ورق خوردن صفحه، انیمیشن تمام و صفحه کامل */
    openTrashModal(); await w(900);
    const tm = document.getElementById('trashModal');
    out.repaint = tm.getAnimations().length === 0 && getComputedStyle(tm).transform === 'none' && typeof window.hkPageDecorate === 'function';
    onBackGuard(); await w(600);
    /* باکس‌ها فرورفته مثل باکس روابط قرض */
    ['ویلا'].forEach(n => { document.getElementById('subjectNewName').value = n; addSubjectFromModal(); });
    openSubjectsModal(); await w(700);
    const pc = getComputedStyle(document.querySelector('#subjectsList .project-card'));
    out.sunken = /inset/.test(pc.boxShadow.split(/,\s*(?=rgba)/)[0]) && pc.backgroundColor === 'rgb(27, 27, 27)';
    onBackGuard(); await w(600);
    /* «حساب‌های من» نصف‌نصف */
    selectedBankAccounts.push({ id: 'ba1', bank: 'بانک ملی', label: 'ملی', openingBalance: 5000000, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    openBankAccountsModal(); await w(800);
    const h1 = document.getElementById('bankSelectedScroll').getBoundingClientRect().height, h2 = document.getElementById('bankBanksScroll').getBoundingClientRect().height;
    out.half = Math.abs(h1 - h2) <= 3 && h1 > 150;
    onBackGuard(); await w(600);
    /* ثبت تکی/گروهی بی صفحه‌کلید */
    openSmsImportModal(); await w(300);
    out.noKb = document.activeElement !== document.getElementById('smsImportText');
    closeSmsImportModal(); await w(300);
    /* فیلدهای «… جدید» وسط */
    openSavingsModal(); await w(600);
    out.lblC = getComputedStyle(document.querySelector('#savingsModal .family-label')).textAlign === 'center';
    out.sum = !!document.querySelector('#savingsSummary') ;
    onBackGuard(); await w(600);
    return out;
  });
  const bi = Object.keys(A.info).filter(k => !A.info[k]);
  ok(!bi.length, 'توضیح بالای صفحه‌ها به آیکون ⓘ کنار نام رفت' + (bi.length ? ' — ' + bi.join('، ') : ''));
  ok(A.repaint, 'بعد از ورق خوردن، صفحه کامل و بی انیمیشن نیمه‌کاره (نگهبان صفحهٔ نیمه‌کشیده)');
  ok(A.sunken, 'باکس‌های منوها فرورفته، مثل باکس روابط قرض');
  ok(A.half, '«حساب‌های من» از وسط نصف: بالا حساب‌ها، پایین افزودن حساب بانکی');
  ok(A.noKb, 'ثبت تکی/گروهی بی صفحه‌کلید باز می‌شود');
  ok(A.lblC, 'نام فیلد «پس‌انداز جدید» وسط، مثل «پروژه جدید»');

  console.log('• آمار، شخصی‌سازی، یادآور');
  const B = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    openStatsSheet(); await w(1000);
    document.querySelector('#statsBody [data-mode="weekly"]').click(); await w(60);
    out.turn = !!document.querySelector('.st-turn-ghost') && [...document.getElementById('statsBody').children].some(c => c.getAnimations().length);
    await w(700); out.turnDone = !document.querySelector('.st-turn-ghost');
    onBackGuard(); await w(600);
    openPrefsModal(); await w(700);
    document.querySelector('#hkPrefsModal [data-k="slides"]').click(); await w(500);
    const bx = document.querySelector('#hkPrefsModal .modal-box'), sl = bx.querySelector('.hk-pf-slides');
    out.slidesFix = bx.classList.contains('hk-pf-fixpg') && getComputedStyle(sl).overflowY === 'auto' && getComputedStyle(bx).overflowY === 'hidden';
    onBackGuard(); await w(400);
    document.querySelector('#hkPrefsModal [data-k="dock"]').click(); await w(500);
    const nt = document.querySelector('#hkPrefsModal .hk-pf-note'), gr = document.querySelector('#hkPrefsModal .hk-pf-body .hk-pf-grp');
    out.noteTop = nt && gr && nt.getBoundingClientRect().top < gr.getBoundingClientRect().top;
    onBackGuard(); await w(400);
    document.querySelector('#hkPrefsModal [data-k="cats"]').click(); await w(900);
    const cp = document.getElementById('hkCatPriModal'), r = cp.getBoundingClientRect();
    out.priFull = cp.classList.contains('hk-page') && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
    onBackGuard(); await w(500); onBackGuard(); await w(600);
    /* یادآور از اسلاید: قاب آبی */
    loadUserReminders(); userReminders.push({ id: 'urA', title: 'بیمه', d: 20, m: 9, y: 1405, repeat: 'none', advanceDays: 7, note: '', lastNotified: '' }); saveUserReminders();
    hkRemindersFocus('urA'); await w(1300);
    const it = document.querySelector('#userRemindersList .ur-item[data-ur-id="urA"]');
    out.hl = it && it.classList.contains('ur-hl') && /8, 181, 245/.test(getComputedStyle(it).outlineColor);
    onBackGuard(); await w(600);
    return out;
  });
  ok(B.turn && B.turnDone, 'آمار: عوض شدن تب با ورق خوردن نرم');
  ok(B.slidesFix, 'اسلایدهای باکس هوشمند: راهنما و سر جدول ثابت، فقط ردیف‌ها اسکرول');
  ok(B.noteTop, 'میان‌برها: راهنما بالای باکس');
  ok(B.priFull, 'اولویت دسته‌ها تمام‌صفحه');
  ok(B.hl, 'یادآور زده‌شده از اسلاید: دوباره چند لحظه قاب آبی');

  console.log('• قرض، مسدود شخصی، خرید بی‌پیامک، ویجت');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const led = ensureLedger();
    const mk = (n, id, who) => { const rows = []; for (let i = 0; i < n; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth })); return { id, personA: 'من', personB: who, collapsed: true, rows }; };
    led.sections = [mk(12, 'A', 'علی'), mk(2, 'B', 'رضا'), mk(2, 'C', 'مینا'), mk(2, 'D', 'نرگس'), mk(2, 'E', 'حسن'), mk(2, 'F', 'حسین')];
    persistCurrent();
    openFeatureSheet('ledger'); await w(800);
    document.querySelector('#sections-ledger .section[data-sec-id="A"] > .section-header').click(); await w(1500);
    const body = document.querySelector('#sections-ledger .section[data-sec-id="A"] .section-body'), rh = body.querySelector('tbody tr').getBoundingClientRect().height, th = body.querySelector('thead').getBoundingClientRect().height;
    out.rowsVis = Math.floor((body.clientHeight - th) / rh);
    const pl = document.getElementById('panel-ledger'), sum = pl.querySelector('.ledger-summary');
    out.sumIn = pl.contains(sum) && getComputedStyle(pl).overflowY === 'auto' && sum.scrollHeight <= sum.clientHeight + 2;
    onBackGuard(); await w(600);
    /* پیامک شخصی با چند حساب: مسدود = هر حساب یک مسدود، با هم */
    hkBlockAccount('', 'پیامک شخصی', { senders: ['+989120000000'], pd: '1111', personal: true });
    hkBlockAccount('', 'پیامک شخصی', { senders: ['+989120000000'], pd: '2222', personal: true });
    const L = hkBlockedLoad();
    out.perAcc = L.length === 2;
    out.hit2 = (hkSmsBlockedHit('برداشت 10,000\nکارت 2222', '+989120000000') || {}).pd === '2222';
    out.hitNew = !!hkSmsBlockedHit('برداشت 10,000\nکارت 9999', '09120000000');
    hkBlockedMenuBadge(); out.badge = (document.querySelector('#menuBlockedBtn .hk-unread-n') || {}).textContent;
    hkUnblockSender(['09120000000']); out.unblockAll = !hkBlockedLoad().length;
    /* مغایرت: خرید بی‌پیامک با روز انتخابی */
    selectedBankAccounts.push({ id: 'ba2', bank: 'بانک ملت', label: 'ملت', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } }); normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t);
    const a = Object.assign(emptyRow('expense'), { day: '3', time: '10:00', desc: 'نان', amount: 100000, status: 'paid', account: 'ملت', viaSms: true });
    const c = Object.assign(emptyRow('expense'), { day: '5', time: '18:00', desc: 'خرید', amount: 50000, status: 'paid', account: 'ملت', viaSms: true });
    ex.rows = [a, c]; persistCurrent();
    const snap = { bank: 'ملت', type: 'expense', amount: 50000, balance: 830000, day: 5, time: '18:00', y: currentYear, m: currentMonth };
    hkSmsReconcile(snap); await w(300);
    const dlg = document.getElementById('hkReconDlg');
    out.range = !!dlg && /بین ۳ .* ساعت ۱۰:۰۰ و ۵ /.test(dlg.textContent) && /زیر ۳۰ هزار/.test(dlg.textContent);
    const sel = dlg.querySelector('.hk-recon-day'); out.pickDef = sel && sel.value === '3' && sel.options.length === 3;
    sel.value = '4'; sel.dispatchEvent(new Event('change'));
    dlg.querySelector('.hk-recon-add').click(); await w(300);
    const g = ex.rows.find(r => r.reconGap);
    out.gap = !!g && g.day === '4' && g.amount === 20000 && /خرید بی‌پیامک/.test(g.desc);
    /* ویجت: ترتیب ردیف‌ها مثل شخصی‌سازی */
    hkPrefSet('sort', 'old'); const o1 = hkWidgetTxRows('expense').slice(0, 3).map(x => x.t);
    hkPrefSet('sort', 'new'); const o2 = hkWidgetTxRows('expense').slice(0, 3).map(x => x.t);
    out.order = o1.join() !== o2.join() && o1[0] === 'نان' && o2[0] === 'خرید';
    return out;
  });
  ok(C.rowsVis >= 8, 'قرض: جدول رابطهٔ باز تقریباً کل صفحه (' + C.rowsVis + ' ردیف بی اسکرول)');
  ok(C.sumIn, 'قرض: خلاصه کامل و در همان اسکرول روابط');
  ok(C.perAcc && C.hit2 && C.hitNew && C.badge === '۲' && C.unblockAll, 'پیامک شخصی: هر حساب یک مسدود جدا، عدد دایره به تعداد آن‌ها؛ حساب تازهٔ همان شماره هم نادیده؛ برداشتن همه با هم');
  ok(C.range && C.pickDef, 'مغایرت: بازهٔ «بین … و …» و انتخاب روز (پیش‌فرض روز آخرین ثبت)');
  ok(C.gap, 'ردیف اختلاف در روز انتخاب‌شده با نام «خرید بی‌پیامک»');
  ok(C.order, 'ویجت تراکنش‌ها به همان ترتیب شخصی‌سازی');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1401: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
