// نسخهٔ ۱.۳.۲۴: جستجو با هر بار خروج از نو و پیش‌فرض خالی، رنگ نام پوشه‌های ثبت گروهی، باز شدن نرم سطر رمزنگاری،
// باکس رمز فایل بدون آیکون اطلاعات، تأییدیه‌های حذف یکسان (پروژه/حساب/درآمد ثابت) بدون «انصراف»،
// پیامک‌های ثبت‌نشده («بعداً» با بازگشت یا زدن بیرون باکس، دکمهٔ «رد») و نمایش دوبارهٔ پیامک در بازگشت به نرم‌افزار،
// رفتن به خانهٔ بعد جدول بدون لحظهٔ بی‌فوکوس (صفحه‌کلید بسته و باز نمی‌شود).
// فقط دادهٔ مصنوعی؛ «امروز» ۲۱ مهر ۱۴۰۵.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
    /* صف پیامک نیتیو مصنوعی */
    window.__q = []; window.__handled = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      BankSms: {
        getAllPending: () => Promise.resolve({ items: window.__q.slice() }),
        getPendingSms: () => Promise.resolve({ has: false }),
        markHandled: (o) => { window.__handled.push(o && o.nid); window.__q = window.__q.filter(x => x.nid !== (o && o.nid)); return Promise.resolve(); },
        cancelNotification: () => Promise.resolve(), cancelHandledNotifications: () => Promise.resolve(),
        requestPermission: () => Promise.resolve({ granted: true }), permStatus: () => Promise.resolve({ sms: true, notif: true })
      },
      NativeFileExport: { saveAutoBackup: async () => ({}), listAutoBackups: async () => ({ files: [] }), deleteAutoBackup: async () => ({}), readAutoBackup: async () => ({ data: '' }) }
    } };
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1800);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    try { saveBankAccountsSelection(); } catch (e) {}
    const inc = (d, desc, a) => Object.assign(emptyRow('income'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    const ex = (d, desc, a) => Object.assign(emptyRow('expense'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [ex(5, 'نان', 30000), emptyRow('expense')] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [inc(4, 'حقوق', 15000000)] }];
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• منوی جستجو');
  const sr = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(300);
    const rows = () => [...document.querySelectorAll('#search-result-body tr')];
    const out = {};
    out.empty = rows().length === 1 && rows()[0].classList.contains('sr-wait') && getComputedStyle(document.getElementById('searchResultBox')).display !== 'none' && document.getElementById('searchResultTitle').textContent === 'نتیجهٔ جستجو';
    /* فقط عوض کردن «بخش» نتیجه نشان نمی‌دهد */
    balanceSectionAll = true; balanceSelectedTitles = []; renderBalanceTab(); await w(60);
    out.sectionOnly = rows().length === 1 && rows()[0].classList.contains('sr-wait');
    /* یک فیلتر: نتیجه می‌آید */
    const ty = document.getElementById('balanceSearchType'); ty.value = 'expense'; ty.dispatchEvent(new Event('change')); await w(60);
    out.filtered = rows().length === 1 && /نان/.test(rows()[0].textContent);
    document.getElementById('balanceSearchInput').value = 'نان';
    balanceSelectedAccount = ACC;
    const dy = document.getElementById('balanceSearchDay'); dy.value = '5'; dy.dispatchEvent(new Event('change')); await w(80);
    /* خروج و ورود دوباره: همهٔ فیلدها از نو */
    closePersonDetail(); await w(250);
    openPersonDetail('سارا', 'balance'); await w(300);
    out.reset = document.getElementById('balanceSearchInput').value === '' && document.getElementById('balanceSearchType').value === '' && document.getElementById('balanceSearchRange').value === 'all' &&
      (document.getElementById('balanceDayFilter').value || '') === '' && (document.getElementById('balanceSearchCat').value || '') === '' && balanceSelectedAccount === '';
    out.emptyAgain = rows().length === 1 && rows()[0].classList.contains('sr-wait');
    closePersonDetail(); await w(200);
    return out;
  }, ACC);
  ok(sr.empty, 'پیش‌فرض: چارچوب جدول «نتیجهٔ جستجو» بدون نتیجه، منتظر فیلتر یا کلمه');
  ok(sr.sectionOnly, 'عوض کردن «بخش» به‌تنهایی نتیجه نشان نمی‌دهد');
  ok(sr.filtered, 'با انتخاب یک فیلتر، نتیجه در همان جدول می‌آید');
  ok(sr.reset && sr.emptyAgain, 'با هر بار خروج از منو همهٔ فیلدها (شرح، نوع، ماه، روز، دسته، حساب) از نو می‌شوند');

  console.log('• ثبت گروهی پیامک: رنگ نام پوشه');
  const fc = await p.evaluate(() => {
    const d = document.createElement('div'); d.innerHTML = '<span class="hk-bulk-fname">ملت · ۱۲۳۴</span>'; document.body.appendChild(d);
    const c = getComputedStyle(d.firstChild).color; d.remove(); return c;
  });
  ok(fc === 'rgb(255, 197, 49)', 'نام پوشه هم‌رنگ آیکون پوشه (زرد) — ' + fc);

  console.log('• پنجرهٔ پشتیبان‌گیری');
  const bk = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    askBackupParts(); await w(250);
    const enc = document.getElementById('bkEncRow'), panel = document.querySelector('#backupPickOverlay .backup-pick-panel');
    const out = { h0: Math.round(enc.getBoundingClientRect().height), p0: Math.round(panel.getBoundingClientRect().height) };
    document.getElementById('bkAutoOn').click();
    await w(150);
    out.hMid = Math.round(enc.getBoundingClientRect().height); out.pMid = Math.round(panel.getBoundingClientRect().height);
    await w(500);
    out.h1 = Math.round(enc.getBoundingClientRect().height); out.p1 = Math.round(panel.getBoundingClientRect().height);
    out.op = getComputedStyle(enc).opacity;
    document.getElementById('bkPwdSw').click(); await w(250);
    out.pwdInfo = !!document.querySelector('#bkPwdBox .hk-info-btn');
    out.pwdTitle = (document.querySelector('#bkPwdBox .backup-pick-title') || {}).textContent;
    document.getElementById('bkPwdBox')._hkCancel(); await w(150);
    document.getElementById('bkAutoOn').click(); await w(600);
    out.h2 = Math.round(enc.getBoundingClientRect().height);
    document.querySelectorAll('.backup-pick-overlay').forEach(x => x.remove());
    return out;
  });
  ok(bk.h0 === 0 && bk.hMid > 0 && bk.hMid < bk.h1 && bk.p0 < bk.pMid && bk.pMid < bk.p1 && bk.op === '1', 'روشن کردن پشتیبان خودکار: سطر رمزنگاری آرام باز شد و پنجره نرم بزرگ شد (ارتفاع ' + bk.h0 + '→' + bk.hMid + '→' + bk.h1 + '، پنجره ' + bk.p0 + '→' + bk.pMid + '→' + bk.p1 + ')');
  ok(bk.h2 === 0, 'خاموش کردن: سطر رمزنگاری دوباره بسته شد');
  ok(!bk.pwdInfo && bk.pwdTitle === 'رمز فایل پشتیبان', 'باکس دو فیلد رمز فایل پشتیبان آیکون اطلاعات ندارد');

  console.log('• تأییدیه‌های حذف');
  const dl = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const btns = () => [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].map(x => x.textContent);
    const txt = () => (document.querySelector('#hkAsk3 .hk-ask3-txt') || {}).textContent || '';
    const out = {};
    /* پروژه با ردیف */
    const L = loadFinancialSubjects(); L.push({ id: 'pjq', name: 'پروژه تست', highlightColor: 'orange' }); _financialSubjects = L; saveFinancialSubjects();
    periodData.expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { day: '7', desc: 'سیمان', amount: 400000, status: 'paid', account: ACC, financialContext: { classification: 'third_party', accountType: 'project', subjectId: 'pjq', subjectName: 'پروژه تست' } }));
    persistCurrent();
    deleteSubject('pjq'); await w(100);
    out.pj = { t: txt(), b: btns().join('|') };
    onBackGuard(); await w(150);
    out.pjBack = !document.getElementById('hkAsk3') && loadFinancialSubjects().some(s => s.id === 'pjq');
    /* حساب */
    openBankAccountsModal(); renderBankAccountsList(); await w(300);
    const x = [...document.querySelectorAll('button')].find(q => q.textContent === '×' && q.parentElement && q.parentElement.textContent.indexOf(ACC) >= 0);
    if (x) x.click(); await w(200);
    out.acc = { t: txt(), b: btns().join('|') };
    const ov = document.getElementById('hkAsk3'); if (ov) ov.click(); await w(150);
    out.accOutside = !document.getElementById('hkAsk3') && selectedAccountLabels().indexOf(ACC) >= 0;
    try { closeBankAccountsModal(); } catch (e) {}
    await w(150);
    /* درآمد ثابت با ردیف‌های وصل‌شده (دریافت‌شده و نشده، دو ماه) */
    const item = { id: 'rec_z', name: 'اجاره تست', amount: 5000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 6, y: 1405 }, contractEnd: { d: 4, m: 6, y: 1406 }, fromKey: 140406, genKey: 140407 };
    recurringIncomes.push(item);
    const P = () => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }], nextId: 2 }, income: { sections: [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '4', desc: 'اجاره تست', amount: 5000000, status: 'paid', account: ACC })] }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 6)] = P();
    recLinkRow(item, archive[periodKey(1405, 6)].income.sections[0].rows[0]);
    const r2 = Object.assign(emptyRow('income'), { day: '4', desc: 'اجاره تست', amount: 5000000, status: 'unpaid', account: ACC });
    periodData.income.sections[0].rows.push(r2); recLinkRow(item, r2);
    persistCurrent(); saveArchive(); saveRecurring();
    const linked = () => { let n = 0; recEachMonth((k, pd) => ((pd.income && pd.income.sections) || []).forEach(s => (s.rows || []).forEach(r => { if (r && r.desc === 'اجاره تست' && Number(r.amount) > 0) n++; }))); return n; };
    out.before = linked();
    openFeatureSheet('recurring'); await w(400);
    document.querySelector('[data-rd="' + recurringIncomes.indexOf(item) + '"]').click(); await w(200);
    out.rec = { t: txt(), b: btns().join('|') };
    [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].find(q => q.textContent === 'حذف با ردیف‌ها').click(); await w(300);
    out.afterDel = linked();
    out.gone = !recurringIncomes.some(r => r.id === 'rec_z');
    const ti = trashItems.findIndex(t => t.type === 'recurring' && t.data && t.data.id === 'rec_z');
    out.trashTitle = ti >= 0 ? trashItems[ti].title : '';
    out.restored = ti >= 0 && restoreTrashData(trashItems[ti]);
    out.afterRestore = linked();
    out.relinked = recArchiveRows(recurringIncomes.find(r => r.id === 'rec_z') || {}).length;
    try { closeFeatureSheet(); } catch (e) {}
    await w(200);
    return out;
  }, ACC);
  ok(dl.pj.t === 'پروژهٔ «پروژه تست» حذف شود؟' && dl.pj.b === 'حذف با ردیف‌ها|حذف بدون ردیف‌ها', 'پروژه: «حذف با ردیف‌ها | حذف بدون ردیف‌ها» بدون «انصراف»');
  ok(dl.pjBack, 'پروژه: بازگشت = انصراف');
  ok(dl.acc.t === 'حساب «' + ACC + '» حذف شود؟' && dl.acc.b === 'حذف با ردیف‌ها|حذف بدون ردیف‌ها', 'حساب: دقیقاً مثل پروژه — ' + dl.acc.t + ' (' + dl.acc.b + ')');
  ok(dl.accOutside, 'حساب: زدن بیرون باکس = انصراف');
  ok(dl.rec.t === 'درآمد ثابت «اجاره تست» حذف شود؟' && dl.rec.b === 'حذف با ردیف‌ها|حذف بدون ردیف‌ها', 'درآمد ثابت: همان پنجره — ' + dl.rec.t);
  ok(dl.before === 2 && dl.afterDel === 0 && dl.gone && /\+ ۲ ردیف/.test(dl.trashTitle), '«حذف با ردیف‌ها»: هر دو ردیف (دریافت‌شده و نشده، دو ماه) همراهش به سطل زباله رفتند (' + dl.trashTitle + ')');
  ok(dl.restored && dl.afterRestore === 2 && dl.relinked === 2, 'بازگردانی: درآمد ثابت و ردیف‌هایش با هم برگشتند و وصل شدند');

  console.log('• پیامک‌های ثبت‌نشده');
  const sm = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const isOpen = () => document.getElementById('smsConfirmModal').classList.contains('open');
    const out = {};
    out.rejectLabel = (document.getElementById('smsConfirmReject') || {}).textContent;
    window.__q.push({ text: 'بانک ملت\nبرداشت 250,000\nمانده 9,000,000\n05/07/21-10:15', sender: '+98700', nid: 501 });
    document.dispatchEvent(new Event('visibilitychange')); await w(900);
    out.shown = isOpen() && pendingSmsEntry && pendingSmsEntry.nid === 501;
    /* بازگشت = بعداً */
    onBackGuard(); await w(400);
    out.later = !isOpen() && smsLaterLoad().length === 1 && window.__handled.indexOf(501) >= 0;
    out.badge = (document.getElementById('smsLaterBadge') || {}).textContent;
    document.dispatchEvent(new Event('visibilitychange')); await w(900);
    out.notAgain = !isOpen();
    /* باز کردن از فهرست */
    openSmsLaterModal(); await w(200);
    out.listItems = document.querySelectorAll('#smsLaterOv .sms-later-item').length;
    out.itemText = (document.querySelector('#smsLaterOv .sms-later-item') || {}).textContent || '';
    document.querySelector('#smsLaterOv .sms-later-item').click(); await w(400);
    out.reopened = isOpen() && smsLaterLoad().length === 1;
    /* زدن بیرون باکس = بعداً (هنوز در فهرست) */
    const m = document.getElementById('smsConfirmModal');
    m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); m.click(); await w(300);
    out.outsideLater = !isOpen() && smsLaterLoad().length === 1;
    /* «رد»: از فهرست برداشته می‌شود */
    openSmsLaterModal(); await w(150); document.querySelector('#smsLaterOv .sms-later-item').click(); await w(300);
    document.getElementById('smsConfirmReject').click(); await w(300);
    out.rejected = !isOpen() && smsLaterLoad().length === 0 && (document.getElementById('smsLaterBadge') || {}).style.display === 'none';
    /* پیامکی که در پس‌زمینه رسید و در صف ماند، با آمدن نرم‌افزار نشان داده می‌شود */
    window.__q.push({ text: 'بانک ملت\nواریز 1,000,000\nمانده 10,000,000\n05/07/21-11:00', sender: '+98700', nid: 502 });
    document.dispatchEvent(new Event('visibilitychange')); await w(900);
    out.second = isOpen() && pendingSmsEntry && pendingSmsEntry.nid === 502;
    closeSmsConfirmModal('reject'); await w(200);
    return out;
  });
  ok(sm.rejectLabel === 'انصراف', 'دکمهٔ دوم باکس ثبت تراکنش (از ۱.۳.۲۸ «انصراف»، قبلاً «رد»)');
  ok(sm.shown, 'پیامک نیتیو با آمدن نرم‌افزار (از ویجت/نوتیف) باکس ثبت را باز کرد');
  ok(sm.later && sm.badge === '۱', 'بازگشت = «بعداً»: پیامک در «پیامک‌های ثبت‌نشده» ماند و عدد قرمز ۱ در منو');
  ok(sm.notAgain, 'همان پیامک در بازگشت بعدی دوباره خودبه‌خود باز نشد (در فهرست است)');
  ok(sm.listItems === 1 && /ملت/.test(sm.itemText) && /۲۵,۰۰۰/.test(sm.itemText), 'فهرست پیامک‌های ثبت‌نشده: ' + sm.itemText.replace(/\s+/g, ' ').trim());
  ok(sm.reopened, 'زدن روی مورد فهرست، همان باکس ثبت تراکنش را باز کرد');
  ok(sm.outsideLater, 'زدن بیرون باکس هم «بعداً» است و پیامک در فهرست می‌ماند');
  ok(sm.rejected, '«رد» پیامک را از فهرست برداشت');
  ok(sm.second, 'پیامک بعدی هم در بازگشت به نرم‌افزار نشان داده شد');

  console.log('• جدول: رفتن به خانهٔ بعد بدون بسته شدن صفحه‌کلید');
  const kb = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'expense'); await w(500);
    const gaps = []; const seq = [];
    const onOut = e => { if (!e.relatedTarget) gaps.push((e.target.className || e.target.tagName) + ''); };
    const onIn = e => seq.push((e.target.className || '').split(' ')[0]);
    document.addEventListener('focusout', onOut, true); document.addEventListener('focusin', onIn, true);
    const tr = [...document.querySelectorAll('.person-detail-table tbody tr')].find(t => { const d = t.querySelector('input'); return d && !d.value; });
    const day = tr.querySelector('input');
    day.click(); day.focus(); day.value = '۹';
    day.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(120);
    const a1 = document.activeElement && document.activeElement.className;
    document.activeElement.value = 'شیر';
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(120);
    const a2 = document.activeElement && document.activeElement.className;
    document.removeEventListener('focusout', onOut, true); document.removeEventListener('focusin', onIn, true);
    return { gaps, seq, a1, a2 };
  });
  ok(/pd-desc/.test(kb.a1) && /pd-amt/.test(kb.a2), 'روز ← «بعدی» ← شرح ← «بعدی» ← مبلغ (' + kb.seq.join(' → ') + ')');
  ok(kb.gaps.length === 0, 'هیچ لحظه‌ای بدون خانهٔ فعال نماند (صفحه‌کلید بسته و باز نمی‌شود)' + (kb.gaps.length ? ': ' + kb.gaps.join(', ') : ''));

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1324: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
