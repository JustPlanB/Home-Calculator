// نسخهٔ ۱.۳.۲۵: آیکون اطلاعات «رمزنگاری پشتیبان خودکار»، باز/بسته شدن نرم (۰٫۴۵ ثانیه) در بخش‌های دیگر،
// شرح یک‌خطی که فقط در صورت نیاز بلند می‌شود، منوی بانک بعد از «بعدی» روی مبلغ، تطبیق موجودی با ترتیب جابه‌جای ثبت پیامک‌ها،
// جستجو بر اساس بازهٔ مبلغ. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  /* بدون ساعت ثابت: محافظ زمانی منوها با Date.now واقعی آزموده شود */
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: true }));
    window.Capacitor = { isNativePlatform: () => true, Plugins: { NativeFileExport: { saveAutoBackup: async () => ({}), listAutoBackups: async () => ({ files: [] }), deleteAutoBackup: async () => ({}), readAutoBackup: async () => ({ data: '' }) } } };
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(INDEX); await p.waitForTimeout(1800);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_m', bank: 'بانک ملت', label: ACC, openingBalance: 10000000, createdAt: { y: 1400, m: 1 } });
    try { saveBankAccountsSelection(); } catch (e) {}
    const ex = (d, desc, a) => Object.assign(emptyRow('expense'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [ex(2, 'نان', 30000), ex(3, 'میوه', 450000), ex(5, 'کرایه', 1200000), emptyRow('expense')] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('income')] }];
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• پنجرهٔ پشتیبان‌گیری');
  const bk = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    askBackupParts(); await w(250);
    const lab = document.querySelector('#bkEncRow .bk-ttl');
    const ib = lab && lab.querySelector('.hk-info-btn');
    const out = { has: !!ib, tip: ib ? ib.getAttribute('data-tip') : '' };
    if (ib) { const rg = document.createRange(); rg.selectNodeContents(lab.firstChild); out.gap = Math.round(rg.getBoundingClientRect().left - ib.getBoundingClientRect().right); }
    const auto = document.querySelector('.bk-auto-row .hk-info-btn'), alab = document.querySelector('.bk-auto-row .bk-ttl');
    if (auto) { const rg = document.createRange(); rg.selectNodeContents(alab.firstChild); out.gapAuto = Math.round(rg.getBoundingClientRect().left - auto.getBoundingClientRect().right); }
    document.querySelectorAll('.backup-pick-overlay').forEach(x => x.remove());
    return out;
  });
  ok(bk.has && /کد بازیابی/.test(bk.tip) && bk.gap === bk.gapAuto, 'جلوی «رمزنگاری پشتیبان خودکار» آیکون اطلاعات با همان فاصلهٔ بقیه (' + bk.gap + 'px)');

  console.log('• جدول جزئیات کارت: شرح و منوی بانک');
  const tb = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'expense'); await w(500);
    const tr = [...document.querySelectorAll('.person-detail-table tbody tr')].find(t => { const d = t.querySelector('input'); return d && !d.value; });
    const day = tr.querySelector('input'), desc = tr.querySelector('textarea.pd-desc');
    const h0 = Math.round(desc.getBoundingClientRect().height);
    day.click(); day.focus(); day.value = '۹';
    day.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(120);
    const out = { h0, focusedDesc: document.activeElement === desc };
    out.hFocus = Math.round(desc.getBoundingClientRect().height);
    desc.value = 'شیر'; desc.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    out.hShort = Math.round(desc.getBoundingClientRect().height);
    desc.value = 'خرید شیر و ماست و پنیر و کره و نان سنگک و تخم‌مرغ از فروشگاه سر کوچه برای صبحانهٔ هفته'; desc.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    out.hLong = Math.round(desc.getBoundingClientRect().height);
    /* «بعدی» روی شرح ← مبلغ ← «بعدی» ← منوی بانک */
    desc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(120);
    out.hAfter = Math.round(desc.getBoundingClientRect().height);
    const amt = tr.querySelector('.pd-amt');
    out.focusedAmt = document.activeElement === amt;
    amt.value = '۸۵,۰۰۰';
    amt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(100);
    /* بسته شدن صفحه‌کلید: جابه‌جایی و تغییر ارتفاع صفحه */
    window.dispatchEvent(new Event('scroll')); document.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize')); await w(300);
    window.dispatchEvent(new Event('scroll')); await w(300);
    const menu = document.querySelector('.dark-select-list.open');
    out.menuOpen = !!menu && getComputedStyle(menu).display !== 'none';
    const opt = menu && [...menu.querySelectorAll('.dark-select-option')].find(o => o.textContent.trim() === 'ملت');
    if (opt) opt.click(); await w(200);
    out.picked = (periodData.expense.sections[0].rows.find(r => /شیر/.test(r.desc || '')) || {}).account;
    /* یک بار زدن روی شرح پرشده: کل متن یک‌خطی در باکس نمایش */
    const tr2 = [...document.querySelectorAll('.person-detail-table tbody tr')].find(t => /شیر/.test((t.querySelector('textarea.pd-desc') || {}).value || ''));
    const d2 = tr2.querySelector('textarea.pd-desc');
    d2.click(); await w(200);
    const pop = document.querySelector('.pd-desc-popup, .cell-text-popup, #cellTextPopup');
    out.popup = !!pop && /صبحانهٔ هفته/.test(pop.textContent);
    out.h2 = Math.round(d2.getBoundingClientRect().height);
    document.querySelectorAll('.pd-desc-popup, .cell-text-popup, #cellTextPopup').forEach(x => x.remove());
    closePersonDetail(); await w(200);
    return out;
  });
  ok(tb.focusedDesc && tb.hFocus === tb.h0 && tb.hShort === tb.h0, 'شرح بعد از «بعدی»: همان باکس یک‌خطی (' + tb.h0 + 'px)');
  ok(tb.hLong > tb.h0, 'متن بلند که در یک خط جا نشد: باکس به اندازهٔ لازم بلند شد (' + tb.hLong + 'px)');
  ok(tb.focusedAmt && tb.hAfter === tb.h0, 'با رفتن به مبلغ، شرح دوباره یک‌خطی شد');
  ok(tb.menuOpen && tb.picked === 'ملت', '«بعدی» روی مبلغ: منوی انتخاب بانک باز ماند (با بسته شدن صفحه‌کلید بسته نشد) و انتخاب کار کرد');
  ok(tb.popup && tb.h2 === tb.h0, 'یک بار زدن روی شرح پرشده: کل متن یک‌خطی در باکس نمایش، خانه یک‌خطی ماند');

  console.log('• باز/بسته شدن نرم');
  const sl = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    /* درآمد ثابت */
    recurringIncomes.push({ id: 'rec_s', name: 'اجاره', amount: 5000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 1, y: 1405 }, contractEnd: { d: 4, m: 1, y: 1406 }, fromKey: 140407, genKey: 140406 });
    openFeatureSheet('recurring'); await w(400);
    const row = document.querySelector('.recurring-row[data-rec-idx="' + (recurringIncomes.length - 1) + '"]');
    const h0 = row.getBoundingClientRect().height;
    row.querySelector('.rec-name').click(); await w(200);
    const hMid = row.getBoundingClientRect().height; await w(400);
    const h1 = row.getBoundingClientRect().height;
    out.rec = { h0: Math.round(h0), hMid: Math.round(hMid), h1: Math.round(h1) };
    row.querySelector('.rec-name').click(); await w(200);
    out.recCloseMid = Math.round(row.getBoundingClientRect().height); await w(400);
    out.recClosed = Math.round(row.getBoundingClientRect().height);
    try { closeFeatureSheet(); } catch (e) {}
    await w(200);
    /* پوشهٔ ثبت گروهی (کارت ساختگی با همان تابع) */
    const card = document.createElement('div'); card.className = 'hk-bulk-folder'; card.style.cssText = 'position:fixed;top:0;left:0;width:300px;';
    card.innerHTML = '<div class="hk-bulk-fhead">پوشه</div><div class="hk-bulk-tx">' + '<div>ردیف</div>'.repeat(6) + '</div>';
    document.body.appendChild(card);
    const b0 = card.getBoundingClientRect().height;
    hkSlideSet(card, true, o => card.classList.toggle('open', o)); await w(200);
    const bMid = card.getBoundingClientRect().height; await w(400);
    out.bulk = { b0: Math.round(b0), bMid: Math.round(bMid), b1: Math.round(card.getBoundingClientRect().height) };
    card.remove();
    return out;
  }, ACC);
  ok(sl.rec.hMid > sl.rec.h0 && sl.rec.hMid < sl.rec.h1, 'درآمد ثابت: جزئیات نرم باز شد (' + sl.rec.h0 + '→' + sl.rec.hMid + '→' + sl.rec.h1 + ')');
  ok(sl.recCloseMid < sl.rec.h1 && sl.recCloseMid > sl.recClosed && sl.recClosed === sl.rec.h0, 'درآمد ثابت: نرم بسته شد (' + sl.rec.h1 + '→' + sl.recCloseMid + '→' + sl.recClosed + ')');
  ok(sl.bulk.bMid > sl.bulk.b0 && sl.bulk.bMid < sl.bulk.b1, 'پوشهٔ ثبت گروهی: نرم باز شد (' + sl.bulk.b0 + '→' + sl.bulk.bMid + '→' + sl.bulk.b1 + ')');

  console.log('• جستجو بر اساس بازهٔ مبلغ');
  const sa = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(400);
    const rows = () => [...document.querySelectorAll('#search-result-body tr:not(.sr-wait)')].map(t => t.textContent);
    const mn = document.getElementById('balanceSearchAmtMin'), mx = document.getElementById('balanceSearchAmtMax');
    const out = { exists: !!mn && !!mx, order: mn && document.getElementById('balanceSearchInput') && (mn.compareDocumentPosition(document.getElementById('balanceSearchInput')) & Node.DOCUMENT_POSITION_FOLLOWING) };
    mn.focus(); mn.value = '100000'; mn.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    out.fmt = mn.value; out.min = rows();
    mx.value = '500000'; mx.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    out.range = rows();
    mn.value = ''; mn.dispatchEvent(new Event('input', { bubbles: true })); await w(400);
    out.max = rows();
    closePersonDetail(); await w(200);
    openPersonDetail('سارا', 'balance'); await w(300);
    out.reset = document.getElementById('balanceSearchAmtMin').value === '' && document.getElementById('balanceSearchAmtMax').value === '';
    closePersonDetail(); await w(200);
    return out;
  });
  ok(sa.exists && sa.order, 'سطر «مبلغ» (از / تا) بالای خانهٔ شرح');
  ok(/^[۰-۹0-9]{3},[۰-۹0-9]{3}$/.test(sa.fmt), 'خانهٔ مبلغ با جداکنندهٔ سه‌رقمی (' + sa.fmt + ')');
  ok(sa.min.length === 2 && sa.min.some(t => /میوه/.test(t)) && sa.min.some(t => /کرایه/.test(t)), '«از ۱۰۰٬۰۰۰»: فقط مبالغ بزرگ‌تر — میوه و کرایه (' + sa.min.length + ' ردیف)');
  ok(sa.range.length === 1 && /میوه/.test(sa.range[0]), '«از ۱۰۰٬۰۰۰ تا ۵۰۰٬۰۰۰»: فقط میوه');
  ok(sa.max.length === 3 && sa.max.some(t => /نان/.test(t)) && sa.max.some(t => /میوه/.test(t)) && sa.max.some(t => /شیر/.test(t)) && !sa.max.some(t => /کرایه/.test(t)), 'فقط «تا ۵۰۰٬۰۰۰»: نان، شیر و میوه (بدون کرایه)');
  ok(sa.reset, 'با خروج از منو، بازهٔ مبلغ هم پاک می‌شود');

  console.log('• تطبیق موجودی با ترتیب جابه‌جای ثبت پیامک‌ها');
  /* ردیف‌های نمونه روزهای ۲ تا ۵ ماه‌اند و ردیف ۸۵٬۰۰۰ بالا روز ۹ ثبت شده؛ تا روز ۹ (ساعت واقعی) پیامک امروز قبل از آن‌ها می‌افتد → این بخش آن روزها اجرا نمی‌شود */
  const _dayNow = await p.evaluate(() => getTodayPersian().d);
  if (_dayNow > 9) {
  const rc = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* موجودی واقعی: ۱۰٬۰۰۰٬۰۰۰ − ردیف‌های این ماه (۱٬۶۸۰٬۰۰۰) − ۸۵٬۰۰۰ = ۸٬۲۳۵٬۰۰۰ */
    const t = getTodayPersian();
    const dt = String(t.y).slice(2) + '/' + String(t.m).padStart(2, '0') + '/' + String(Math.min(t.d, 28)).padStart(2, '0');
    const base = (globalAccountBalances() || {})[ACC];
    const rial = n => (n * 10).toLocaleString('en-US');
    const s1 = 'بانک ملت\nبرداشت ' + rial(100000) + '\nمانده ' + rial(base - 100000) + '\n' + dt + '-10:00';
    const s2 = 'بانک ملت\nبرداشت ' + rial(200000) + '\nمانده ' + rial(base - 300000) + '\n' + dt + '-11:00';
    const s3 = 'بانک ملت\nبرداشت ' + rial(300000) + '\nمانده ' + rial(base - 600000) + '\n' + dt + '-12:00';
    const toasts = []; const _st = window.showToast; window.showToast = function (m) { toasts.push(String(m)); try { return _st.apply(this, arguments); } catch (e) {} };
    const confirm = async () => { const s = document.getElementById('smsConfirmBank'); if (s && !s.value) s.value = ACC; confirmSmsEntry(); await w(500); };
    const dlg = () => !!document.getElementById('hkReconDlg');
    const out = { base };
    enqueueBankSms(s1); enqueueBankSms(s2); enqueueBankSms(s3); await w(400);
    out.first = pendingSmsEntry && pendingSmsEntry.raw === s1;
    await confirm(); out.d1 = dlg();
    /* دومی «بعداً»، سومی ثبت */
    out.second = pendingSmsEntry && pendingSmsEntry.raw === s2;
    closeSmsConfirmModal('later'); await w(400);
    out.third = pendingSmsEntry && pendingSmsEntry.raw === s3;
    await confirm(); out.d3 = dlg(); out.t3 = toasts.slice(-3).join(' | ');
    /* دومی از فهرست ثبت‌نشده‌ها */
    smsLaterOpen(smsLaterLoad()[0]); await w(400);
    await confirm(); out.d2 = dlg(); out.t2 = toasts.slice(-3).join(' | ');
    out.end = (globalAccountBalances() || {})[ACC];
    /* مغایرت واقعی هنوز هشدار می‌دهد */
    const s4 = 'بانک ملت\nبرداشت ' + rial(50000) + '\nمانده ' + rial(base - 600000 - 50000 - 7000) + '\n' + dt + '-13:00';
    enqueueBankSms(s4); await w(400); await confirm(); out.d4 = dlg();
    const dd = document.getElementById('hkReconDlg'); if (dd) dd.remove();
    window.showToast = _st;
    return out;
  }, ACC);
  ok(rc.first && !rc.d1 && rc.second && rc.third, 'صف به ترتیب پیامک‌ها؛ اولی بدون مغایرت ثبت شد');
  ok(!rc.d3 && /قبلی این حساب هنوز ثبت نشده/.test(rc.t3), 'سومی قبل از دومی: هشدار مغایرت نیامد، فقط پیام کوتاه «' + rc.t3.split(' | ').find(x => /قبلی/.test(x)) + '»');
  ok(!rc.d2 && /جابه‌جا/.test(rc.t2), 'دومی بعد از سومی: هشدار نیامد، پیام کوتاه «' + rc.t2.split(' | ').find(x => /جابه‌جا/.test(x)) + '»');
  ok(rc.end === rc.base - 600000, 'موجودی نهایی درست است (بدون ردیف اختلاف اضافه)');
  ok(rc.d4, 'مغایرت واقعی همچنان هشدار می‌دهد');
  } else console.log('  (روز ' + _dayNow + ' ماه: بخش تطبیق ترتیب پیامک‌ها رد شد)');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1325: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
