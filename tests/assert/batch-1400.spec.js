// ۱.۴.۰: سربرگ صفحه‌ها (آیکون بک + نام)، زیرصفحه‌ها تمام‌صفحه با ورق خوردن، بازگشت به صفحهٔ اصلی بی ورق خوردن،
// صفحه‌های داخل‌باکسی تمام‌صفحه (پیامک‌های ثبت‌نشده، ماهی که گذشت، سطل زباله، پشتیبان‌گیری، آمار)، خروجی دوباره پنجره،
// «حساب‌های من» از نو، فیلدهای «… جدید»، یادآور در منو، باکس‌های یک‌شکل، درآمد ثابت مثل پروژه‌ها، قرض، رنگ پروژه‌ها،
// ویرایش ردیف، حساب‌های مسدود، جیب به جیب با کارمزد. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);
  return { ctx, page };
}
(async () => {
  const root = path.join(__dirname, '..', '..');
  const rd = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
  console.log('• کد');
  ok(!/<small>\(' \+ escapeHtml\(hit\.section\)/.test(rd('js/08b-render-sections-for-tab.js')), 'پنجرهٔ «احتمال ثبت تکراری»: نام جدول در پرانتز کنار شرح نیست');
  ok(/M9 5l7 7-7 7/.test(rd('js/17-pages.js')), 'آیکون بک: همان ‹ رو به راست (شکل فرستاده‌شده)');

  const b = await chromium.launch();
  const { page } = await fresh(b);

  console.log('• سربرگ صفحه‌ها و بازگشت');
  const H = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const vis = () => [...document.querySelectorAll('.hk-page')].filter(x => x.getClientRects().length);
    const hd = () => { const p = vis()[0]; const h = p && p.querySelector('.hk-pg-hd, .feature-sheet-bar'); const bk = h && h.querySelector('.hk-pg-back'), t = h && (h.querySelector('.hk-pg-t') || h.querySelector('.fs-title'));
      if (!bk || !t) return null; const rb = bk.getBoundingClientRect(), rt = t.getBoundingClientRect(); return { title: t.textContent.trim(), right: rb.right > innerWidth - 60, order: rb.left > rt.left, top: rb.top < 90 }; };
    for (const [n, a] of [['openPrefsModal'], ['openSubjectsModal'], ['openTrashModal'], ['openSavingsModal'], ['openUserRemindersModal'], ['openBankAccountsModal'], ['openStatsSheet'], ['openRecurringFromMenu'], ['askBackupParts'], ['openSmsLaterModal']]) {
      window[n](a); await w(900);
      out[n] = hd();
      /* زدن آیکون بک = همان بک */
      const p = vis()[0], bk = p && p.querySelector('.hk-pg-back'); if (bk) bk.click(); await w(700);
      out[n + '_closed'] = !vis().length;
      if (vis().length) { onBackGuard(); await w(500); }
    }
    /* از صفحهٔ اصلی: بازگشت بی ورق خوردن (تصویر کنار رونده ساخته نمی‌شود) */
    openTrashModal(); await w(800);
    onBackGuard(); await w(40);
    out.noGhostHome = !document.querySelector('.hk-mnav-ghost');
    await w(600);
    /* خروجی اکسل/PDF دوباره همان پنجرهٔ دو گزینه (نه صفحه) */
    askExport(); await w(500);
    const ex = document.getElementById('exportChoiceOverlay');
    out.exportBox = !!ex && !ex.classList.contains('hk-page') && ex.querySelector('.export-choice-box').getBoundingClientRect().width < innerWidth - 20;
    onBackGuard(); await w(400);
    return out;
  });
  const names = { openPrefsModal: 'شخصی‌سازی', openSubjectsModal: 'پروژه‌ها', openTrashModal: 'سطل زباله', openSavingsModal: 'پس‌انداز', openUserRemindersModal: 'یادآور', openBankAccountsModal: 'حساب‌های من', openStatsSheet: 'آمار', openRecurringFromMenu: 'درآمدهای ثابت', askBackupParts: 'از چه بخش‌هایی پشتیبان گرفته شود؟', openSmsLaterModal: 'پیامک‌های ثبت‌نشده' };
  const bad = Object.keys(names).filter(n => !(H[n] && H[n].title === names[n] && H[n].right && H[n].order && H[n].top && H[n + '_closed']));
  ok(!bad.length, 'بالای هر صفحه سمت راست: اول آیکون بک، جلویش نام صفحه؛ زدنش صفحه را می‌بندد' + (bad.length ? ' — ' + bad.map(n => n + ':' + JSON.stringify(H[n])).join(' ') : ''));
  ok(H.noGhostHome, 'بازگشت به صفحهٔ اصلی بی ورق خوردن (مثل قبل)');
  ok(H.exportBox, 'خروجی اکسل/PDF: فقط همان دو گزینه روی صفحه، بی صفحهٔ جدا');

  console.log('• زیرصفحه (یک پروژه) و صفحه‌های داخل‌باکسی');
  const Z = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    ['ویلا شمال', 'دفتر'].forEach(n => { document.getElementById('subjectNewName').value = n; addSubjectFromModal(); });
    openSubjectsModal(); await w(800);
    out.label = (document.querySelector('#subjectsModal .family-label') || {}).textContent;
    const card = document.querySelector('#subjectsList .project-card'); const cs = getComputedStyle(card);
    out.cardRaised = cs.boxShadow !== 'none' && !/inset/.test(cs.boxShadow.split(/,\s*(?=rgba)/)[0]);
    const cb = card.getBoundingClientRect(), body = card.querySelector('.project-card-body').getBoundingClientRect();
    out.centered = Math.abs((body.top - cb.top) - (cb.bottom - body.bottom)) <= 2;
    card.click(); await w(150);
    const rep = document.getElementById('projectReportModal');
    out.sub = { page: rep.classList.contains('hk-page'), anim: rep.getAnimations().length > 0 };
    await w(700);
    out.subTitle = (rep.querySelector('.hk-pg-t') || {}).textContent;
    const rr = rep.getBoundingClientRect(); out.subFull = rr.width >= innerWidth - 1 && rr.height >= innerHeight - 1;
    onBackGuard(); await w(700);
    out.backToList = document.getElementById('subjectsModal').getClientRects().length > 0 && !rep.getClientRects().length;
    onBackGuard(); await w(600);
    /* ماهی که گذشت: باکس بیرونی برداشته شد */
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 50000, status: 'paid' })]; persistCurrent();
    openMonthRecap(currentYear, currentMonth); await w(900);
    const rb = document.querySelector('#hkRecapOv .hk-rc-box'), rcs = getComputedStyle(rb);
    out.recap = rb.getBoundingClientRect().width >= innerWidth - 1 && rcs.boxShadow === 'none' && rcs.borderRadius === '0px' && /ماهی که گذشت/.test((document.querySelector('#hkRecapOv .hk-pg-t') || {}).textContent);
    onBackGuard(); await w(600);
    /* پیامک‌های ثبت‌نشده: کل صفحه */
    openSmsLaterModal(); await w(700);
    const sp = document.querySelector('#smsLaterOv .backup-pick-panel').getBoundingClientRect();
    out.later = sp.width >= innerWidth - 1 && sp.height >= innerHeight - 1;
    onBackGuard(); await w(600);
    /* سطل زباله: فهرست تا پایین */
    openTrashModal(); await w(700);
    out.trash = getComputedStyle(document.getElementById('trashList')).maxHeight === 'none';
    onBackGuard(); await w(600);
    /* آمار: پس‌زمینه مثل بقیه */
    openStatsSheet(); await w(900);
    out.stats = getComputedStyle(document.querySelector('#statsSheet .st-bg')).display === 'none';
    onBackGuard(); await w(600);
    return out;
  });
  ok(Z.label === 'پروژه جدید', 'پروژه‌ها: «نام پروژه» → «پروژه جدید»');
  ok(Z.cardRaised && Z.centered, 'باکس پروژه سایه‌دار (برجسته) و نام/وضعیت وسط عمودی (' + Z.cardRaised + '/' + Z.centered + ')');
  ok(Z.sub.page && Z.sub.anim && Z.subFull && /ویلا شمال|دفتر/.test(Z.subTitle || ''), 'زدن یک پروژه: صفحهٔ کامل با ورق خوردن و نام پروژه بالای آن (' + Z.subTitle + ')');
  ok(Z.backToList, 'بازگشت از پروژه: همان فهرست پروژه‌ها');
  ok(Z.recap, '«ماهی که گذشت»: باکس بزرگ بیرونی برداشته شد، کارت‌ها روی صفحه');
  ok(Z.later && Z.trash && Z.stats, 'پیامک‌های ثبت‌نشده کل صفحه؛ سطل زباله تا پایین؛ آمار با پس‌زمینهٔ بقیهٔ صفحه‌ها');

  console.log('• «حساب‌های من»، فیلدهای «… جدید»، یادآور، دکمه‌ها');
  const F = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    openBankAccountsModal(); await w(800);
    const bw = document.getElementById('bankBanksScroll').getBoundingClientRect();
    out.bankFull = bw.bottom >= innerHeight - 90 && !document.getElementById('bankBanksScroll').style.maxHeight;
    onBackGuard(); await w(40); out.bankNoFade = !document.querySelector('body > .modal-box'); await w(600);
    openSavingsModal(); await w(700);
    const sv = document.getElementById('savingsModal');
    out.svField = !!document.getElementById('svNewName') && /پس‌انداز جدید/.test(sv.textContent) && !/افزودن پس‌انداز/.test(sv.textContent);
    out.svBtnH = Math.max(...[...sv.querySelectorAll('.modal-btn')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect().height));
    document.getElementById('svNewName').value = 'سکه امامی'; hkSavNewFromField(); await w(300);
    out.svPre = (document.querySelector('#svAssetSelect .dark-select-btn') || {}).textContent;
    closeSavingsEditor(); await w(150); onBackGuard(); await w(600);
    openUserRemindersModal(); await w(700);
    const ur = document.getElementById('userRemindersModal');
    out.urField = !!document.getElementById('urNewName') && /یادآور جدید/.test(ur.textContent) && !/افزودن یادآور/.test(ur.textContent) && !/یک هفته/.test(ur.textContent);
    out.urBtnH = Math.max(...[...ur.querySelectorAll('.modal-btn')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect().height));
    document.getElementById('urNewName').value = 'بیمه بدنه'; hkUrNewFromField(); await w(300);
    out.urPre = (document.getElementById('urTitle') || {}).value;
    try { document.getElementById('urEditor').remove(); document.getElementById('urEditorDim').style.display = 'none'; } catch (e) {}
    onBackGuard(); await w(600);
    openDongModal(); await w(700);
    const dg = document.getElementById('hkDong');
    out.dgField = !!dg.querySelector('.hk-dg-newin') && /گروه جدید/.test(dg.textContent) && !/گروه تازه/.test(dg.textContent);
    dg.querySelector('.hk-dg-newin').value = 'سفر شمال'; dg.querySelector('.hk-dg-new').click(); await w(300);
    out.dgPre = [...document.querySelectorAll('.hk-dg-in')].map(x => x.value).indexOf('سفر شمال') >= 0;
    onBackGuard(); await w(300); onBackGuard(); await w(600);
    out.menuRem = !!document.getElementById('menuRemindersBtn') && /یادآور/.test(document.getElementById('menuRemindersBtn').textContent);
    return out;
  });
  ok(F.bankFull && F.bankNoFade, '«حساب‌های من»: فهرست تا پایین صفحه؛ بسته شدن مثل بقیهٔ صفحه‌ها (بی محو شدن جدا)');
  ok(F.svField && F.urField && F.dgField, 'فیلدهای «پس‌انداز جدید»، «یادآور جدید» و «گروه جدید» به‌جای دکمه‌های قبلی؛ راهنمای یادآور بی «یک هفته»');
  ok(F.svBtnH < 60 && F.urBtnH < 60, 'دکمه‌های پس‌انداز و یادآور اندازهٔ عادی (' + F.svBtnH + '/' + F.urBtnH + ')');
  ok(/سکه امامی/.test(F.svPre || '') && F.urPre === 'بیمه بدنه' && F.dgPre, 'نوشتهٔ فیلد در پنجرهٔ ساخت همان‌جا آمده');
  ok(F.menuRem, 'یادآور در «بخش‌ها»ی منوی همبرگری');

  console.log('• درآمد ثابت، قرض، رنگ پروژه‌ها');
  const R = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    for (let i = 1; i <= 9; i++) recurringIncomes.push({ id: 'r' + i, name: 'اجاره ' + i, amount: 1000000 * i, deposit: 0, day: String(i), account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140501, genKey: 140500 });
    saveRecurring();
    openRecurringFromMenu(); await w(1000);
    const bx = document.getElementById('recurringBox'), bcs = getComputedStyle(bx);
    const rl = bx.querySelector('.rec-list');
    out.recD = [bcs.boxShadow, bcs.backgroundColor, getComputedStyle(document.getElementById('recurringHead')).display, rl.scrollHeight, rl.clientHeight].join('|');
    out.rec = bcs.boxShadow === 'none' && bcs.backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(document.getElementById('recurringHead')).display === 'none' && rl.scrollHeight > rl.clientHeight + 20;
    const row = bx.querySelector('.recurring-row'); out.recRaised = !/inset/.test(getComputedStyle(row).boxShadow.split(/,\s*(?=rgba)/)[0]);
    document.getElementById('recExportBtn').click(); await w(900);
    const rx = document.getElementById('hkRecArcEx');
    out.raxPage = rx.classList.contains('hk-page') && !rx.querySelector('.hk-pf-x').getClientRects().length && /خروجی آرشیو/.test((rx.querySelector('.hk-pg-t') || {}).textContent);
    out.raxSwipe = !!rx.querySelector('.hk-rax-kind') && HK_SWIPE_TABS.indexOf('.hk-rax-kind') >= 0;
    onBackGuard(); await w(500); onBackGuard(); await w(600);
    /* قرض */
    const led = ensureLedger();
    const mk = (n, id, who) => { const rows = []; for (let i = 0; i < n; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth })); return { id, personA: 'من', personB: who, collapsed: true, rows }; };
    led.sections = [mk(1, 'A', 'علی'), mk(2, 'B', 'رضا'), mk(2, 'C', 'مینا'), mk(2, 'D', 'نرگس'), mk(2, 'E', 'حسن'), mk(2, 'F', 'حسین')];
    persistCurrent();
    openFeatureSheet('ledger'); await w(800);
    document.querySelector('#sections-ledger .section[data-sec-id="A"] > .section-header').click(); await w(1400);
    const list = document.getElementById('sections-ledger');
    out.ledList = getComputedStyle(list).overflowY === 'auto' && list.scrollHeight > list.clientHeight && !document.querySelector('#featureSheet.hk-led-page .feature-sheet-body').scrollTop;
    const body = document.querySelector('#sections-ledger .section[data-sec-id="A"] .section-body');
    out.ledLines = /linear-gradient/.test(getComputedStyle(body).backgroundImage) && body.querySelector('table').getBoundingClientRect().height < body.clientHeight - 30;
    const fab = document.querySelector('#sections-ledger .section[data-sec-id="A"] .ledger-row-fab');
    out.ledFab = /inset/.test(getComputedStyle(fab).boxShadow) && getComputedStyle(fab).opacity === '1';
    out.ledMask = getComputedStyle(document.querySelector('#featureSheet .feature-sheet-body')).maskImage;
    onBackGuard(); await w(600);
    /* رنگ پروژه‌ها: ۴ تای اول همان، بقیه پاستلی، بی تکرار */
    _financialSubjects = []; for (let i = 1; i <= 17; i++) { document.getElementById('subjectNewName').value = 'پ' + i; addSubjectFromModal(); }
    const L = loadFinancialSubjects().map(s => getProjectHighlightMeta(s.highlightColor).accent);
    out.colors = L.slice(0, 4).join(',') === '#d000ff,#00e8ff,#f5ff33,#ff6a00' && new Set(L).size === L.length;
    out.pastel = L.slice(4).every(h => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, bb = n & 255; return Math.min(r, g, bb) >= 140; });
    return out;
  });
  ok(R.rec && R.recRaised, 'درآمد ثابت مثل پروژه‌ها: باکس بیرونی دیده نمی‌شود، بیش از ۷ درآمد در همان فضا اسکرول، باکس‌ها سایه‌دار (' + R.recD + '/' + R.recRaised + ')');
  ok(R.raxPage && R.raxSwipe, 'خروجی درآمد ثابت: تمام‌صفحه، بی ضربدر، نام و بک بالا؛ اکسل/PDF با کشیدن افقی');
  ok(R.ledList, 'قرض: بیش از ۴ رابطه فقط فهرست روابط اسکرول می‌شود (صفحه ثابت)');
  ok(R.ledLines, 'قرض: خط‌کشی ستون‌ها تا پایین قاب جدول حتی با یک ردیف');
  ok(R.ledFab && (R.ledMask === 'none' || !R.ledMask), 'قرض: دکمهٔ ردیف تازه فرورفته و هیچ‌وقت کم‌رنگ');
  ok(R.colors && R.pastel, 'رنگ پروژه‌ها: ۴ رنگ اول همان، بعدی‌ها پاستلی و هیچ دو پروژه‌ای هم‌رنگ نیست');

  console.log('• ویرایش ردیف، حساب‌های مسدود، جیب به جیب');
  const E = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    selectedBankAccounts.push({ id: 'ba1', bank: 'بانک ملی', label: 'ملی', openingBalance: 5000000, createdAt: { y: 1400, m: 1 } }, { id: 'ba2', bank: 'بانک ملت', label: 'ملت', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t), inc = periodData.income.sections.find(s => s.title === t);
    const a = Object.assign(emptyRow('expense'), { day: '3', time: '10:00', desc: 'نان', amount: 100000, status: 'paid', account: 'ملی', viaSms: true });
    ex.rows = [a]; inc.rows = []; persistCurrent();
    hkOpenRowEdit({ row: a, tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    const bal = document.querySelector('#hkRowEdit .hk-re-bal'), l = getComputedStyle(bal.querySelector('.hk-re-rl')), v = getComputedStyle(bal.querySelector('.hk-re-rv'));
    out.bal = l.color === v.color && l.fontSize === v.fontSize && Number(v.fontWeight) < 600;
    const pills = [...document.querySelectorAll('#hkRowEdit .hk-re-pill')];
    out.lock = document.querySelectorAll('#hkRowEdit .hk-re-dtlk').length === 1 && pills.every(p => getComputedStyle(p.querySelector('b'), '::after').content === 'none');
    out.swipe = !!document.querySelector('#hkRowEdit .hk-re-stseg') && HK_SWIPE_TABS.indexOf('.hk-re-stseg') >= 0;
    pills[0].dispatchEvent(new PointerEvent('pointerdown')); await w(800);
    const cm = document.getElementById('confirmMsg'); out.confirm = cm.textContent; out.confirmLines = Math.round(cm.getBoundingClientRect().height / parseFloat(getComputedStyle(cm).lineHeight));
    try { document.querySelector('#confirmModal .modal-btn.no, #confirmModal [data-no], #confirmModal .no').click(); } catch (e) { try { closeConfirm(); } catch (e2) {} }
    await w(200);
    const re = document.getElementById('hkRowEdit'); if (re) { re._hkCancel ? re._hkCancel() : re.remove(); } await w(300);
    /* حساب‌های مسدود */
    hkBlockAccount('', 'پیامک شخصی', { senders: ['+989121234567'], personal: true });
    const L = hkBlockedLoad(); out.ltr = /^⁦\+۹۸۹۱۲۱۲۳۴۵۶۷⁩$/.test(hkBlockLabel(L[0]));
    hkBlockedNoteHit({ s: ['+989121234567'] }, 'برداشت 20,000\nکارت 1234', { ts: Date.now() - 86400000, amount: 2000, type: 'expense' });
    hkBlockedNoteHit({ s: ['+989121234567'] }, 'واریز 50,000', { ts: Date.now(), amount: 5000, type: 'income' });
    hkBlockedNoteHit({ s: ['+989121234567'] }, 'واریز 50,000', { ts: Date.now(), amount: 5000, type: 'income' }); /* تکراری شمرده نمی‌شود */
    hkBlockedMenuBadge();
    const bdg = document.querySelector('#menuBlockedBtn .hk-unread-n'); out.badgeRed = bdg && /rgb\(255, 69, 58\)|rgb\(255, 59, 48\)/.test(getComputedStyle(bdg).backgroundColor);
    hkOpenBlockedAccounts(); await w(600);
    document.querySelector('#hkBlockOv .hk-block-r').click(); await w(300);
    const ov = document.getElementById('hkBlockOv');
    out.hits = /پیامک‌های نادیده‌گرفته\s*۲/.test(ov.textContent) && ov.querySelectorAll('.hk-block-txr').length === 2;
    ov.querySelector('.hk-block-txr').click(); await w(100);
    out.raw = !!ov.querySelector('.hk-block-raw');
    out.titleLtr = /⁦\+۹۸۹/.test((ov.querySelector('.hk-pg-t') || {}).textContent || '');
    onBackGuard(); await w(300); onBackGuard(); await w(600);
    /* جیب به جیب با کارمزد */
    localStorage.setItem(STORAGE_KEY + '_p2pSince', '1');
    const now = Date.now();
    const i1 = Object.assign(emptyRow('income'), { day: '4', time: '10:00', desc: 'واریز', amount: 2000000, status: 'paid', account: 'ملت', createdAt: now });
    const e1 = Object.assign(emptyRow('expense'), { day: '4', time: '10:01', desc: 'انتقال', amount: 2000720, status: 'paid', account: 'ملی', createdAt: now + 1000 });
    inc.rows = [i1]; ex.rows = [e1];
    const before = JSON.stringify(globalAccountBalances());
    persistCurrent(); await w(1500);
    const ask = document.getElementById('hkP2PAsk');
    out.ask = !!ask && /۷۲۰ کارمزد/.test(ask.textContent);
    if (ask) ask.querySelector('.hk-p2p-yes').click(); await w(500);
    out.balSame = JSON.stringify(globalAccountBalances()) === before;
    out.split = ex.rows.length === 2 && e1.amount === 2000000 && e1.p2p && ex.rows[1].desc === 'کارمزد انتقال' && ex.rows[1].amount === 720 && !ex.rows[1].p2p;
    out.expTot = periodData.expense.sections.reduce((s, x) => s + sectionPaidUnpaidTotal(x).paid, 0);
    /* یک‌طرفه: واریز دستی جیب به جیب شده → طرف دیگرش پرسیده می‌شود */
    const i2 = Object.assign(emptyRow('income'), { day: '5', desc: 'واریز', amount: 300000, status: 'paid', account: 'ملی', createdAt: now + 5000, p2p: true });
    const e2 = Object.assign(emptyRow('expense'), { day: '5', desc: 'برداشت', amount: 300000, status: 'paid', account: 'ملت', createdAt: now + 6000 });
    inc.rows.push(i2); ex.rows.push(e2); persistCurrent(); await w(1500);
    out.oneSide = !!document.getElementById('hkP2PAsk');
    try { document.querySelector('#hkP2PAsk .hk-p2p-yes').click(); } catch (e) {} await w(300);
    out.oneSideDone = !!(e2.p2p && i2.p2p);
    /* ثبت گروهی: مسدود کردن، «ثبت» را فعال می‌کند */
    return out;
  });
  ok(E.bal, 'ویرایش ردیف: مبلغ «مانده» هم‌رنگ و هم‌اندازهٔ خود نوشتهٔ «مانده» و غیر بولد');
  ok(E.lock, 'ویرایش ردیف: یک قفل فقط جلوی «تاریخ و زمان» (دو قفل روی تاریخ و ساعت برداشته شد)');
  ok(E.confirm === 'تاریخ و ساعت از پیامک بانک آمده است. تغییرش می‌دهید؟' && E.confirmLines <= 2, 'پیام تأیید تغییر تاریخ دوخطی (' + E.confirmLines + ' خط)');
  ok(E.swipe, 'ویرایش ردیف: کشیدن افقی بین پرداخت/دریافت شده و نشده');
  ok(E.ltr && E.titleLtr, 'حساب مسدود: «+» اول شماره می‌ماند (نه آخرش)');
  ok(E.hits && E.raw, 'حساب مسدود: تعداد و خود تراکنش‌های نادیده‌گرفته (بی تکرار)؛ زدن هر کدام = متن پیامک');
  ok(E.badgeRed, 'دایرهٔ تعداد حساب‌های مسدود قرمز (مثل پیامک‌های ثبت‌نشده)');
  ok(E.ask && E.balSame && E.split && E.expTot === 720, 'جیب به جیب با کارمزد: پیدا شد؛ مبلغ واریز بیرون از جمع‌ها، کارمزد یک خرج جدا («کارمزد انتقال»)؛ موجودی‌ها دست‌نخورده');
  ok(E.oneSide && E.oneSideDone, 'جیب به جیب یک‌طرفه: طرف دیگرش پیدا و پرسیده می‌شود');

  const src = rd('js/11b-jalali-of-ts.js');
  ok(/fo\.checked \|\| fo\._blocked/.test(src) && /حساب مسدود شد'\); \}/.test(src), 'ثبت گروهی: بعد از مسدود کردن یک حساب، «ثبت» فعال است');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1400: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
