// نسخهٔ ۱.۳.۴۲: ساعت درست پیامک‌های چندبخشی (گیرندهٔ اندروید تکه‌ها را با «\n» وصل می‌کرد: 0727-17:33 → ۰۷:۳۳) و اصلاح
// ساعت‌های خرابِ قبلی، رسید اشتراکی از برنامهٔ بانک → تراکنش ثبت‌نشده / «نگه دار تا پیامک بیاید»، و باز/بسته شدن باکس‌های قرض
// بدون بیرون‌زدن محتوا روی باکس بعدی. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const SMS = 'بانك ملي ايران\nانتقال:6,511,000-\nحساب:62002\nمانده:11,614,867\n0727-17:33';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T14:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• ساعت پیامک چندبخشی');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/body\.append\(m\.getMessageBody\(\)\);/.test(patch) && !/getMessageBody\(\)\)\.append\("\\\\n"\)/.test(patch), 'گیرندهٔ اندروید تکه‌های پیامک را بدون «\\n» وصل می‌کند');
  const tm = await p.evaluate((SMS) => {
    const broken = SMS.slice(0, 67) + '\n' + SMS.slice(67);   /* همان که نسخه‌های قبل ذخیره می‌کردند */
    const pr = parseBankSms(broken);
    return { ok: hkSmsTime(SMS, 0), broken: hkSmsTime(broken, 0), day: pr.day + '/' + pr.month, amt: pr.amount, same: hkSmsUnsplit(SMS) === SMS,
      lines: hkSmsUnsplit('بانک ملت\nبرداشت 70,000\nمانده 1,000\n12:30') === 'بانک ملت\nبرداشت 70,000\nمانده 1,000\n12:30' };
  }, SMS);
  ok(tm.ok === '17:33' && tm.broken === '17:33', 'پیامک «…0727-17:33» (حتی ذخیره‌شده با «\\n» وسطش) ساعت ۱۷:۳۳ می‌گیرد، نه ۰۷:۳۳');
  ok(tm.day === '27/7' && tm.amt === 651100, 'تاریخ و مبلغِ همان پیامک خراب هم درست خوانده می‌شود (' + tm.day + ')');
  ok(tm.same && tm.lines, 'متن سالم پیامک دست نمی‌خورد');

  const fx = await p.evaluate(async () => {
    const sec = periodData.expense.sections[0];
    const bad = Object.assign(emptyRow('expense'), { day: '27', desc: 'کارت به کارت', amount: 651100, status: 'paid', account: 'ملی', time: '07:33', viaSms: true });
    const early = Object.assign(emptyRow('expense'), { day: '27', desc: 'صبح', amount: 1000, status: 'paid', account: 'ملی', time: '09:00' });
    const right = Object.assign(emptyRow('expense'), { day: '27', desc: 'درست', amount: 2000, status: 'paid', account: 'ملی', time: '10:15' });
    sec.rows = [bad, early, right]; persistCurrent();
    const ts = new Date('2026-10-19T14:03:00Z').getTime();   /* ۲۷ مهر ۱۴۰۵ ساعت ۱۷:۳۳ تهران */
    const SMS = 'بانك ملي ايران\nانتقال:6,511,000-\nحساب:62002\nمانده:11,614,867\n0727-17:33';
    window.hkBankSmsPlugin = () => ({ readInbox: () => Promise.resolve({ items: [{ body: SMS, date: ts }, { body: 'بانک ملی\nبرداشت:20,000-\n0727-10:15', date: ts }] }) });
    const n = await hkBackfillTimes({ fix: true });
    return { n, rows: periodData.expense.sections[0].rows.map(r => r.desc + ':' + r.time).join('،') };
  });
  ok(fx.n === 1 && fx.rows === 'صبح:09:00،درست:10:15،کارت به کارت:17:33', 'ساعت خرابِ ردیف قبلی (۰۷:۳۳) از روی پیامک صندوق ۱۷:۳۳ شد و ترتیب روز درست شد؛ ساعت‌های درست دست نخورد (' + fx.rows + ')');

  console.log('• رسید اشتراکی → تراکنش ثبت‌نشده');
  const sh = await p.evaluate(async ({ PNG, SMS }) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملی', label: 'ملی مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    const items = [{ data: PNG, mime: 'image/png' }];
    const out = {};
    /* مرحلهٔ ثبت با همان پیامک بدون خط «مانده» (پیامک مانده‌دار اول وارد تطبیق موجودی می‌شود که موضوع این تست نیست) */
    SMS = SMS.replace('\nمانده:11,614,867', '');
    const pr = parseBankSms(SMS); pr.raw = SMS; pr.ts = Date.now() - 60000;
    smsPendingQueue.push(pr);
    hkOpenSharePicker(items); await w(150);
    const ov = document.getElementById('hkShareOv');
    out.unreg = [...ov.querySelectorAll('.hk-share-u')].map(b => b.textContent);
    out.firstHi = !!ov.querySelector('.hk-share-u.first');
    out.order = [...ov.querySelector('.hk-bulk-box').children].map(x => x.className.split(' ')[0]).join(',');
    ov.querySelector('.hk-share-u').click(); await w(500);
    out.modal = isSmsConfirmOpen() && pendingSmsEntry && pendingSmsEntry.raw === SMS;
    out.strip = _smsAtt.list.length;
    const bs = document.getElementById('smsConfirmBank'); bs.value = [...bs.options].find(o => o.value && o.value !== '__add_account__').value; bs.dispatchEvent(new Event('change'));
    document.getElementById('smsConfirmDesc').value = 'کارت به کارت';
    await w(100);
    confirmSmsEntry(); await w(700);
    let row = null; periodData.expense.sections.forEach(s => s.rows.forEach(r => { if (Number(r.amount) === 651100 && r.desc === 'کارت به کارت' && r.att) row = r; }));
    out.row = row ? { time: row.time, att: row.att.length } : null;
    out.queueLeft = smsPendingQueue.length;
    return out;
  }, { PNG, SMS });
  ok(sh.unreg.length === 1 && /۱۷:۳۳/.test(sh.unreg[0]) && /۶۵۱,۱۰۰/.test(sh.unreg[0]) && sh.firstHi, 'پنجرهٔ اشتراک: تراکنش ثبت‌نشده (ساعت و مبلغ) بالای همه و برجسته (' + sh.unreg.join(' | ') + ')');
  ok(sh.order.indexOf('hk-share-unreg') < sh.order.indexOf('hk-share-keep') && sh.order.indexOf('hk-share-keep') < sh.order.indexOf('hk-bulk-list'), 'ترتیب: ثبت‌نشده‌ها، «نگه دار…»، ردیف تازه، ثبت‌شده‌ها');
  ok(sh.modal && sh.strip === 1, 'زدن تراکنش ثبت‌نشده: منوی ثبت همان تراکنش باز شد و رسید زیر شرح پیوست شد');
  ok(sh.row && sh.row.att === 1 && sh.row.time === '17:33' && sh.queueLeft === 0, 'با «ثبت» هم تراکنش (ساعت ۱۷:۳۳) و هم رسید ثبت شد');

  const many = await p.evaluate(async (PNG) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mk = (amt, t) => { const raw = 'بانک ملی\nانتقال:' + amt.toLocaleString('en') + '-\nحساب:62002\n0727-' + t; const e = parseBankSms(raw); e.raw = raw; return e; };
    smsPendingQueue.push(mk(110000, '17:40'));
    smsLaterAdd({ raw: mk(220000, '17:42').raw, _laterAt: Date.now() - 30000 });
    smsLaterAdd({ raw: mk(330000, '17:44').raw, _laterAt: Date.now() - 10000 });
    hkOpenSharePicker([{ data: PNG, mime: 'image/png' }]); await w(150);
    const ov = document.getElementById('hkShareOv');
    const out = { n: ov.querySelectorAll('.hk-share-u').length, sub: ov.querySelector('.hk-share-sub').textContent };
    /* دومی را انتخاب می‌کند (از «پیامک‌های ثبت‌نشده») */
    const btn = [...ov.querySelectorAll('.hk-share-u')].find(b => /۲۲۰,۰۰۰|۲۲,۰۰۰/.test(b.textContent));
    btn.click(); await w(500);
    out.opened = isSmsConfirmOpen() && /220,000/.test(pendingSmsEntry.raw) && _smsAtt.list.length === 1;
    smsPendingQueue.length = 0;
    closeSmsConfirmModal('reject'); await w(300);
    return out;
  }, PNG);
  ok(many.n === 3 && /۳ تراکنش ثبت‌نشده/.test(many.sub) && many.opened, 'سه تراکنش ثبت‌نشده: هر سه در فهرست، کاربر هر کدام را بخواهد انتخاب می‌کند (' + many.sub + ')');

  console.log('• «نگه دار تا پیامک بیاید»');
  const kp = await p.evaluate(async (PNG) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    smsPendingQueue.length = 0; smsLaterSave([]);
    if (isSmsConfirmOpen()) closeSmsConfirmModal('reject');
    await w(300); smsPendingQueue.length = 0; smsLaterSave([]);
    hkOpenSharePicker([{ data: PNG, mime: 'image/png' }]); await w(150);
    const ov = document.getElementById('hkShareOv');
    const out = { noUnreg: !ov.querySelector('.hk-share-u') };
    ov.querySelector('.hk-share-keep').click(); await w(400);
    out.kept = hkRcptLoad().length;
    /* پیامک آمد → منوی ثبت: رسید خودکار زیر شرح */
    const raw = 'بانک ملی\nانتقال:440,000-\nحساب:62002\n0727-17:50', e = parseBankSms(raw); e.raw = raw;
    pendingSmsEntry = e; openSmsConfirmModal(e); await w(400);
    out.offered = _smsAtt.list.filter(a => a._rcpt).length; out.pendAfterOffer = hkRcptLoad().length;
    /* انصراف → رسید به صف برمی‌گردد (پاک نمی‌شود) */
    closeSmsConfirmModal('reject'); await w(300);
    const back = hkRcptLoad(); out.back = back.length; out.blob = !!(back[0] && await HKAttach.get(back[0].items[0].id));
    /* دوباره: این بار ثبت */
    pendingSmsEntry = e; openSmsConfirmModal(e); await w(400);
    const bs = document.getElementById('smsConfirmBank'); bs.value = [...bs.options].find(o => o.value && o.value !== '__add_account__').value; bs.dispatchEvent(new Event('change'));
    document.getElementById('smsConfirmDesc').value = 'رسید بعدی'; await w(100);
    confirmSmsEntry(); await w(700);
    let row = null; periodData.expense.sections.forEach(s => s.rows.forEach(r => { if (r.desc === 'رسید بعدی') row = r; }));
    out.row = row ? (row.att || []).length + ':' + (row.att || []).every(a => !('_rcpt' in a)) : '';
    out.pendEnd = hkRcptLoad().length;
    /* ۲۴ ساعت: رسیدِ کهنه پاک می‌شود */
    hkRcptSave([{ at: Date.now() - 25 * 3600 * 1000, items: [{ id: 'x_old', size: 1 }] }]);
    out.expired = hkRcptLoad().length;
    return out;
  }, PNG);
  ok(kp.noUnreg && kp.kept === 1, 'بدون تراکنش ثبت‌نشده: «نگه دار…» رسید را در صف رسیدهای در انتظار گذاشت');
  ok(kp.offered === 1 && kp.pendAfterOffer === 0, 'با آمدن پیامک و باز شدن منوی ثبت، رسید خودکار زیر شرح آمد');
  ok(kp.back === 1 && kp.blob, 'انصراف: رسید پاک نشد و به صف برگشت');
  ok(kp.row === '1:true' && kp.pendEnd === 0, 'ثبت: رسید روی همان ردیف نشست و صف خالی شد');
  ok(kp.expired === 0, 'رسیدِ در انتظارِ بیش از ۲۴ ساعت پاک می‌شود');

  console.log('• باکس‌های قرض');
  const ld = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger();
    led.sections = ['الف', 'ب', 'ج'].map((n, k) => ({ id: 'L' + k, title: n, collapsed: false, rows: Array.from({ length: 3 }, (_, i) => Object.assign(emptyLedgerRow(), { day: String(i + 1), desc: 'قرض ' + i, amount: 100000 * (i + 1) })) }));
    persistCurrent(); switchTabFromMenu('ledger'); await w(600);
    const secs = () => [...document.querySelectorAll('#sections-ledger .section')];
    const hit = () => { const s = secs(); let bad = 0; for (let i = 0; i < s.length - 1; i++) { const a = s[i].getBoundingClientRect(); s[i].querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.height && getComputedStyle(el).visibility !== 'hidden' && r.top < a.bottom - 1 === false && r.top < s[i + 1].getBoundingClientRect().bottom && r.bottom > s[i + 1].getBoundingClientRect().top && r.bottom > a.bottom + 1) { /* بیرون از باکس خودش و روی باکس بعدی */ const cs = getComputedStyle(s[i]); if (cs.overflow !== 'hidden') bad++; } }); } return bad; };
    const out = {};
    const s0 = secs()[0];
    s0.querySelector('.section-header').click(); await w(150);
    out.ovMid = getComputedStyle(s0).overflow; out.hitMid = hit();
    await w(600);
    out.ovEnd = s0.style.getPropertyValue('overflow'); out.hitEnd = hit();
    s0.querySelector('.section-header').click(); await w(150);
    out.ovMid2 = getComputedStyle(s0).overflow;
    await w(600);
    return out;
  });
  ok(ld.ovMid === 'hidden' && ld.ovMid2 === 'hidden' && ld.hitMid === 0, 'در حین باز/بسته شدن، محتوای باکس قرض داخل خود باکس می‌ماند و روی باکس بعدی نمی‌افتد');
  ok(ld.ovEnd === '' && ld.hitEnd === 0, 'بعد از انیمیشن، حالت عادی باکس برمی‌گردد');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
