// نسخهٔ ۱.۳.۴۳: ثبت تراکنش از خود اعلان (پاسخ مستقیم «بابت چه بود؟»)، شمارهٔ ردیف در نتیجهٔ جستجو، رفتن به بخش مربوط با زدن
// اسلایدهای باکس هوشمند، و سهم بیشتر حساب‌های ساخته‌شده در منوی انتخاب حساب. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T14:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• ثبت از اعلان (پاسخ مستقیم)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/new RemoteInput\.Builder\(KEY_DESC\)\.setLabel\("بابت چه بود؟"\)/.test(patch) && /Action\.Builder\([^)]*"ثبت"/.test(patch) && /FLAG_MUTABLE/.test(patch),
    'اعلان تراکنش دکمهٔ «ثبت» با فیلد «بابت چه بود؟» دارد (PendingIntent قابل‌تغییر برای پاسخ)');
  ok(/class HkQuickReplyReceiver/.test(patch) && /x\.put\("quickDesc",desc\)/.test(patch) && /HkQuickReplyReceiver" android:exported="false"/.test(patch) && /r\.put\("quickDesc"/.test(patch),
    'گیرندهٔ پاسخ شرح را کنار همان پیامک در صف می‌گذارد، از بیرون صدا زده نمی‌شود و صف آن را به نرم‌افزار می‌دهد');
  const qk = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    /* بدون هیچ حساب: تکمیل لازم است → منوی ثبت با همان شرح دیده می‌شود */
    const raw0 = 'بانک ملی\nبرداشت:90,000-\nحساب:99887\n0727-17:20';
    window.onBankSmsReceived(raw0, { nid: 70, quick: true, quickDesc: 'میوه' });
    await w(1300);
    out.blk = { open: isSmsConfirmOpen(), vis: !document.getElementById('smsConfirmModal').classList.contains('hk-quick'), desc: document.getElementById('smsConfirmDesc').value };
    closeSmsConfirmModal('reject'); await w(300);
    /* حساب مشخص: بی‌سؤال ثبت می‌شود و منو اصلاً دیده نمی‌شود */
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملی', label: 'ملی مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    const raw = 'بانک ملی\nبرداشت:120,000-\nحساب:62002\n0727-17:40';
    smsAccountBankMap['L4:' + hkSmsAcc4(raw)] = 'ملی مصنوعی';
    window.onBankSmsReceived(raw, { nid: 77, quick: true, quickDesc: 'نان سنگک' });
    out.hidden = document.getElementById('smsConfirmModal').classList.contains('hk-quick');
    await w(1300);
    let row = null; periodData.expense.sections.forEach(s => s.rows.forEach(r => { if (Number(r.amount) === 12000) row = r; }));
    out.ok = { open: isSmsConfirmOpen(), row: row && row.desc + '|' + row.account + '|' + row.time };
    /* پیامکی که همین الان باز است و از اعلان «ثبت» شد */
    const raw2 = 'بانک ملی\nبرداشت:50,000-\nحساب:62002\n0727-17:50';
    window.onBankSmsReceived(raw2, { nid: 79 }); await w(400);
    out.liveOpen = isSmsConfirmOpen() && pendingSmsEntry.nid === 79;
    hkQuickApplyLive(79, 'شیر'); await w(1300);
    let row2 = null; periodData.expense.sections.forEach(s => s.rows.forEach(r => { if (Number(r.amount) === 5000) row2 = r; }));
    out.live = { open: isSmsConfirmOpen(), row: row2 && row2.desc };
    return out;
  });
  ok(qk.blk.open && qk.blk.vis && qk.blk.desc === 'میوه', 'حساب نامشخص: منوی ثبت با همان شرحِ نوشته‌شده در اعلان نمایان می‌ماند تا کاربر تکمیل کند');
  ok(qk.hidden && !qk.ok.open && qk.ok.row === 'نان سنگک|ملی مصنوعی|17:40', 'ثبت از اعلان: ردیف بی‌سؤال با شرح، حساب و ساعت ساخته شد و منو دیده نشد (' + qk.ok.row + ')');
  ok(qk.liveOpen && !qk.live.open && qk.live.row === 'شیر', 'پیامکی که همان لحظه در نرم‌افزار باز بود هم با «ثبت» اعلان ثبت شد');

  console.log('• شمارهٔ ردیف در نتیجهٔ جستجو');
  const sr = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 4 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'نان ' + i, amount: 10000 * (i + 1), status: 'paid', account: 'ملی مصنوعی' }));
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const i = document.getElementById('balanceSearchInput'); i.value = 'نان'; i.dispatchEvent(new Event('input')); await w(400);
    const ths = [...document.querySelectorAll('#searchResultBox thead th')];
    const out = { th: ths.map(t => t.textContent.trim() + ':' + t.style.width), nums: [...document.querySelectorAll('#search-result-body td.sr-num')].map(t => t.textContent),
      foot: [...document.querySelectorAll('#search-result-foot td.sec-name')].map(t => t.colSpan) };
    try { closePersonDetail(); } catch (e) {}
    await w(200);
    return out;
  });
  ok(sr.th.join(',') === 'ردیف:9%,تاریخ:24%,شرح:25%,بانک:17%,مبلغ:25%' && sr.nums.join(',') === '۱,۲,۳,۴', 'ستون اول «ردیف» (۱، ۲، ۳…) و عرض شرح به همان اندازه کم شد (' + sr.th.join(' ') + ')');
  ok(sr.foot.every(c => c === 4), 'ردیف‌های جمع پایین جدول هم با ستون تازه جور است');

  console.log('• زدن اسلایدهای باکس هوشمند');
  const sp = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const title = allPersonTitles()[0];
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '2', desc: 'حقوق', amount: 900000, status: 'paid', account: 'ملی مصنوعی' })];
    const led = ensureLedger();
    led.sections = [{ id: 'L1', title: 'علی', collapsed: false, personA: title, personB: 'علی', rows: [Object.assign(emptyRow('expense'), { day: '3', desc: 'قرض', amount: 50000, status: 'credit' })] }];
    persistCurrent(); try { renderAll(); renderHomeCards(); } catch (e) {}
    await w(600);
    const box = [...document.querySelectorAll('.pc-smart-box')].find(x => x._spPages && x._spPages.length && x._spTitle === title) || [...document.querySelectorAll('.pc-smart-box')].find(x => x._spPages && x._spPages.length);
    if (!box) return { err: 'no box' };
    const keys = box._spPages.map(x => x.key);
    const tap = async (key) => {
      const i = box._spPages.findIndex(x => x.key === key); if (i < 0) return 'missing';
      box._spIdx = i; box.dispatchEvent(new MouseEvent('click', { bubbles: true })); await w(500);
      return 'ok';
    };
    const out = { keys };
    out.ov = await tap('overview');
    out.ovRes = document.body.classList.contains('detail-open') && !!document.querySelector('#sections-expense .person-detail-scroll, #sections-expense table');
    try { closePersonDetail(); } catch (e) {} await w(400);
    out.st = await tap('stats');
    const fs = document.querySelector('.fs-sheet, #statsSheet, .hk-stats');
    out.stRes = !!document.querySelector('.fs-close') && getComputedStyle(document.querySelector('.fs-close').closest('[class]')).display !== 'none';
    try { HKStats.close(); } catch (e) {} await w(400);
    return out;
  });
  ok(sp.ov === 'ok' && sp.ovRes, 'اسلاید «وضعیت ماه» → جدول مخارج همان کاربر (' + (sp.keys || []).join('،') + ')');
  ok(sp.st !== 'ok' || sp.stRes, 'اسلاید «مقایسه با ماه قبل» → بخش آمار');
  const keysSrc = await p.evaluate(() => { const s = document.documentElement.outerHTML; return ['overview', 'stats', 'obligations', 'ledger', 'projects', 'upcoming', 'jump', 'biggest', 'insight'].filter(k => new RegExp("key: '" + k + "', build: \\w+, onTap").test(s)).length; });
  ok(keysSrc === 9, 'همهٔ اسلایدها مقصد دارند: وضعیت ماه، مقایسه، تعهدات→اقساط، طلب و بدهی→قرض، پروژه‌ها، ۷ روز آینده، جهش خرج، خرج‌های ماه، نکات');

  console.log('• منوی انتخاب حساب');
  const bk = await p.evaluate(async () => {
    openBankAccountsModal(); await new Promise(r => setTimeout(r, 300));
    const a = document.getElementById('bankSelectedScroll'), c = document.getElementById('bankBanksScroll');
    const out = { sel: parseFloat(a.style.maxHeight), all: parseFloat(c.style.maxHeight) };
    closeBankAccountsModal();
    return out;
  });
  ok(bk.sel === 44 && bk.all === 16, 'حساب‌های ساخته‌شده تا ۴۴٪ ارتفاع صفحه و فهرست همهٔ بانک‌ها ۱۶٪ (قبلاً ۲۲٪ و ۲۸٪)');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
