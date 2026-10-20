// نسخهٔ ۱.۳.۴۴: پیامک شخصی با هشدار (نه دور انداختن)، «ثبت سریع» و «بابت چی بود؟» در اعلان، پیام «ثبت شد» سبز با تیک،
// باکس شناور ثبت (حباب اعلان)، یک کارت حذف‌نشدنی با لرزش و «حذف ماه/حذف کلی»، باکس‌های رفت‌وبرگشتی، ستون ردیف جستجو،
// فهرست تراکنش ثبت‌نشده در شِیر رسید. فقط دادهٔ مصنوعی.
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
  await p.clock.setFixedTime(new Date('2026-10-20T07:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• اعلان (کد اندروید)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/Action\.Builder\([^)]*"ثبت سریع"/.test(patch) && /setLabel\("بابت چی بود؟"\)/.test(patch), 'دکمهٔ اعلان «ثبت سریع» و فیلدش «بابت چی بود؟»');
  ok(/static boolean isPersonal\(String sender\)/.test(patch) && /"پیامک شخصی \\\\u2066"\+sender/.test(patch), 'پیامک از شمارهٔ شخصی در اعلان «پیامک شخصی …» معرفی می‌شود (از ۱.۳.۴۵ کوتاه و بی‌ایموجی)');
  ok(/"بابت: "\+desc/.test(patch) && /new SpannableString\("ثبت شد ✔"\)/.test(patch) && /ForegroundColorSpan\(0xFF30D158\)/.test(patch) && /setImageViewBitmap\(R\.id\.hk_done_tick/.test(patch),
    'بعد از ثبت: بالا «بابت: …» و پایین‌ترین خط «ثبت شد» سبز با تیک (از ۱.۳.۴۵ تیک نرم‌افزار، batch-1345)');
  ok(/BubbleMetadata\.Builder\(bpi,ic\)/.test(patch) && /class HkQuickActivity extends Activity/.test(patch) && /HkQuickActivity" android:exported="false" android:allowEmbedded="true" android:resizeableActivity="true"/.test(patch) && /setHint\("بابت چی بود؟"\)/.test(patch) && /setText\("ثبت"\)/.test(patch),
    'آیکن حباب کنار اعلان باکس شناور ثبت را باز می‌کند (فیلد «بابت چی بود؟» و دکمهٔ «ثبت»)');
  ok(/catch\(Throwable t\)\{ try\{ nm\.notify\(nid,baseBuilder\(c,title,text\)\.build\(\)\); \}/.test(patch), 'اگر شکل گفتگو/حباب روی گوشی خطا داد، اعلان ساده حتماً می‌آید');

  console.log('• پیامک شخصی');
  const per = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const raw = 'بانك ملي ايران\nانتقال:120,000-\nحساب:62002\nمانده:91,614,867\n0728-10:20';
    const r = window.onBankSmsReceived(raw, { nid: 91, sender: '+989121234567' });
    await w(500);
    const warn = document.getElementById('smsSenderWarn');
    const out = { r, open: isSmsConfirmOpen(), warn: warn ? warn.textContent : '' };
    closeSmsConfirmModal('reject'); await w(300);
    return out;
  });
  ok(per.r === true && per.open && /پیامک شخصی از/.test(per.warn) && /۰?۹۱۲|9121234567|۹۱۲۱۲۳۴۵۶۷/.test(per.warn), 'پیامک شمارهٔ شخصی دور انداخته نشد؛ منوی ثبت با هشدار و شمارهٔ فرستنده باز شد');

  console.log('• کارت کاربر');
  const card = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(300);
    const c = document.querySelector('#homeCards .person-card');
    const out = { del: !!c.querySelector('.btn-del-row'), edit: !!c.querySelector('.btn-edit-title'), dots: !!document.querySelector('.home-card-dots') };
    const n0 = allPersonTitles().length;
    addPersonCard(); await w(300);
    out.noNew = allPersonTitles().length === n0 && !document.querySelector('.person-edit-sheet.open, #personEditSheet.open');
    const r = c.getBoundingClientRect();
    const pe = (t) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 40, clientY: r.top + 30, pointerId: 7, button: 0, pointerType: 'touch' }));
    pe('pointerdown'); await w(650); pe('pointerup');
    out.jig = c.classList.contains('hk-jiggle');
    out.anim = getComputedStyle(c).animationName;
    out.btns = [...c.querySelectorAll('.hk-jig-btn')].map(x => x.textContent);
    const del = [...c.querySelectorAll('.hk-jig-btn')].find(x => x.textContent === 'حذف ماه');
    del && del.click(); await w(200);
    out.confirm = document.getElementById('confirmModal').classList.contains('open') && document.getElementById('confirmMsg').textContent;
    out.jigOff = !c.classList.contains('hk-jiggle') && !c.querySelector('.hk-jig-menu');
    document.getElementById('confirmModal').classList.remove('open');
    /* دوباره لرزش و بستن با زدن بیرون */
    pe('pointerdown'); await w(650); pe('pointerup'); await w(100);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 700 }));
    await w(50);
    out.outside = !c.classList.contains('hk-jiggle');
    return out;
  });
  ok(!card.del && card.edit, 'کارت اصلی دکمهٔ حذف ندارد و نامش با مداد ویرایش می‌شود');
  ok(!card.dots, 'نقطه‌های زیر کارت حذف شد');
  ok(card.noNew, 'دکمهٔ + دیگر کارت تازه نمی‌سازد');
  ok(card.jig && card.anim === 'hkJiggle' && card.btns.join('،') === 'حذف ماه،حذف کلی', 'لانگ‌پرس: کارت می‌لرزد و «حذف ماه» و «حذف کلی» روی آن می‌آیند');
  ok(card.confirm === 'اطلاعات این ماه حذف شود؟' && card.jigOff, '«حذف ماه» اول تأیید می‌گیرد (و به سطل زباله می‌رود)');
  ok(card.outside, 'زدن بیرون کارت لرزش را تمام می‌کند');

  console.log('• باکس‌های زیر کارت');
  const hb = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const box = document.getElementById('homeBox2'), track = box.querySelector('.hb-track');
    const r = box.getBoundingClientRect(), cy = r.top + r.height / 2, W = box.clientWidth;
    const swipe = async (dx, id) => {
      const x0 = r.left + W / 2;
      const ev = (t, x) => box.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: cy, pointerId: id, button: 0, pointerType: 'touch' }));
      ev('pointerdown', x0); ev('pointermove', x0 + Math.sign(dx) * 12); ev('pointermove', x0 + dx); ev('pointerup', x0 + dx);
      await w(750);
      return box._hbIdx();
    };
    const visible = () => { const k = box._hbIdx(); const sl = [...track.children]; return sl[sl.length - 1 - k].textContent.replace(/\s+/g, ' ').trim(); };
    const out = { first: visible(), clones: track.querySelectorAll('.hb-clone').length };
    out.s1 = await swipe(140, 1); out.second = visible();
    out.s2 = await swipe(140, 2);   /* بن‌بست */
    out.s3 = await swipe(140, 3);
    out.back = await swipe(-140, 4);
    out.s5 = await swipe(-140, 5);  /* بن‌بست سمت دیگر */
    return out;
  });
  ok(/پس‌انداز/.test(hb.first) && /انتخاب حساب/.test(hb.first) && /ثبت دستی/.test(hb.first) && /پشتیبان/.test(hb.second) && /بازیابی/.test(hb.second) && /خروجی/.test(hb.second),
    'باکس دوم: اول پس‌انداز، انتخاب حساب، ثبت دستی؛ دوم پشتیبان‌گیری، بازیابی، خروجی');
  ok(hb.clones === 0 && hb.s1 === 1 && hb.s2 === 1 && hb.s3 === 1 && hb.back === 0 && hb.s5 === 0, 'رفت و برگشتی: بعد از اسلاید دوم بن‌بست است و باید برعکس کشید تا برگردد (' + [hb.s1, hb.s2, hb.s3, hb.back, hb.s5].join('→') + ')');

  console.log('• ستون ردیف و شرح نتیجهٔ جستجو');
  const sr = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 3 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'نان سنگک و پنیر و سبزی خوردن از بازار محله ' + i, amount: 10000 * (i + 1), status: 'paid', account: 'ملی' }));
    persistCurrent();
    const t = allPersonTitles()[0];
    openPersonDetail(t, 'expense'); await w(600);
    const pw = document.querySelector('.person-detail-table th').getBoundingClientRect().width;
    closePersonDetail(); await w(400);
    openPersonDetail(t, 'balance'); await w(500);
    const i = document.getElementById('balanceSearchInput'); i.value = 'نان'; i.dispatchEvent(new Event('input')); await w(400);
    const nw = document.querySelector('#searchResultBox thead th').getBoundingClientRect().width;
    const d = document.querySelector('#search-result-body td.sec-name');
    const out = { pw, nw, trunc: d.scrollWidth > d.clientWidth, one: getComputedStyle(d).whiteSpace };
    d.click(); await w(200);
    const pop = document.querySelector('.cell-text-popup');
    out.pop = pop ? pop.textContent : '';
    try { closeCellTextPopups(); closePersonDetail(); } catch (e) {}
    await w(200);
    return out;
  });
  ok(Math.abs(sr.pw - sr.nw) <= 2, 'ستون «ردیف» نتیجهٔ جستجو هم‌عرض ستون ردیف جدول مخارج (' + Math.round(sr.nw) + ' و ' + Math.round(sr.pw) + 'px)');
  ok(sr.trunc && sr.one === 'nowrap' && /بازار محله ۰|بازار محله 0/.test(sr.pop), 'شرح طولانی یک‌خطی و کوتاه‌شده؛ با زدن، متن کامل در باکس شناور');

  console.log('• شِیر رسید: تراکنش ثبت‌نشده');
  const sh = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.onBankSmsReceived('بانک ملی\nبرداشت:70,000-\nحساب:62002\nمانده:500,000\n0728-10:30', { nid: 95 }); await w(500);
    hkOpenSharePicker([{ data: 'AAAA', mime: 'image/jpeg' }]); await w(300);
    const u = document.querySelector('.hk-share-u'), ur = u.getBoundingClientRect();
    const keep = document.querySelector('.hk-share-keep').getBoundingClientRect();
    const box = document.querySelector('.hk-share-unreg').getBoundingClientRect();
    const top = document.elementFromPoint(ur.left + ur.width / 2, ur.bottom - 3);
    const out = { uh: ur.height, boxH: box.height, gap: keep.top - ur.bottom, topIsRow: !!(top && top.closest('.hk-share-u')) };
    document.getElementById('hkShareOv').remove();
    closeSmsConfirmModal('reject');
    return out;
  });
  ok(sh.uh >= 36 && sh.boxH >= sh.uh - 1 && sh.gap >= 0 && sh.topIsRow, 'ردیف «تراکنش ثبت‌نشده» کامل و واضح دیده می‌شود و زیر دکمهٔ بعدی نمی‌رود (' + Math.round(sh.boxH) + 'px)');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
