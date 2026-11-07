// ۱.۳.۸۵: تشخیص بانک با امتیازدهی؛ عکس دلخواه دستهٔ ساخت کاربر؛ آیکون جیب به جیب در ستون ردیف؛ اولویت دسته‌ها با یک کلید «خودکار». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1',
  /* یادگرفتهٔ اشتباه نسخهٔ قبل (تبدیل ۳ باید پاکش کند) */
  [P + '_senderBank']: JSON.stringify({ bankmellat: 'بانک دی' }), [P + '_dataVer']: '2' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• تشخیص بانک با امتیاز');
  const bk = await page.evaluate(() => {
    const now = Date.now(), o = { ver: hkDataVer(), cleared: !localStorage.getItem(STORAGE_KEY + '_senderBank') || !/دی/.test(localStorage.getItem(STORAGE_KEY + '_senderBank')) };
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت ۶۱۶۳', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    smsAccountBankMap['L4:6292'] = 'ملت ۶۱۶۳'; saveSmsAccountBankMap();
    const items = [
      { address: 'Bank Mellat', date: now, body: 'کارت6292\nبرداشت300,000\nمانده6,684,526\n05/08/10-06:02' },
      { address: 'Bank Mellat', date: now - 1000, body: 'رمز جدید شما در سامانه همراه فعال شد' },
      { address: '+9820004', date: now, body: 'بانک ملی ایران\nانتقال:2,000,000+\nحساب:5555\nمانده:9,000,000' },
      { address: '+98700717', date: now, body: 'حساب1234567890\nبرداشت300,000\nمانده6,684,526' },
      { address: '09121234567', date: now, body: 'بانک ملت\nبرداشت 50,000\nمانده 90,000' }];
    const c = hkInboxBankCtx(items);
    const sc = items.map(i => hkBankScore(i.body, i.address, c));
    o.mellatCard = sc[0].bank; o.why0 = sc[0].why.join(','); o.notice = sc[1].bank; o.melli = sc[2].bank; o.unknown = sc[3].bank;
    o.personalSender = hkSenderNameBank('09121234567'); o.personalBody = sc[4].bank;
    o.learned = JSON.stringify(c.sender);
    o.words = ['رمز جدید', 'شهریور ۱۴۰۵', 'سامانه همراه', 'دیروز', 'عملیات موفق', 'در آینده'].map(t => detectBankFromSms(t, true));
    o.full = ['بانک ملت\nبرداشت', 'بانك ملت', 'Bank Mellat', 'ملت'].map(t => detectBankFromSms(t, true));
    o.tie = hkBankPick({ 'بانک ملت': 50, 'بانک ملی': 45 });
    /* پیامک تازه از Bank Mellat */
    o.live = (function () { try { const p = parseBankSms(items[0].body); return hkBankOfSms(items[0].body, 'Bank Mellat') + '|' + (p && p.amount); } catch (e) { return e.message; } })();
    return o;
  });
  ok(bk.ver >= 3 && bk.cleared, 'تبدیل ۳: یادگرفته‌های اشتباه قبلی (Bank Mellat→بانک دی) پاک شد');
  ok(bk.mellatCard === 'بانک ملت' && /sender:بانک ملت\+50/.test(bk.why0) && /acc:بانک ملت\+60/.test(bk.why0), 'کارت ملت: فرستنده ۵۰ + رقم‌های وصل‌شده ۶۰ ⇒ ملت (' + bk.why0 + ')');
  ok(bk.notice === 'بانک ملت', 'پیامک «رمز جدید … سامانه» از Bank Mellat هم ملت (نه دی/سامان)');
  ok(bk.melli === 'بانک ملی' && bk.unknown === '', 'ملی از اسم کامل در متن؛ بی‌هیچ نشانه = نامشخص (حدس نمی‌زند)');
  ok(bk.personalSender === '' && !/09121234567/.test(bk.learned), 'شمارهٔ موبایل شخصی هرگز از فرستنده امتیاز نمی‌گیرد و یاد گرفته نمی‌شود');
  ok(bk.words.every(x => x === ''), 'تکهٔ وسط کلمه (جدید، شهریور، سامانه، دیروز، عملیات، آینده) بانک حساب نمی‌شود');
  ok(bk.full.slice(0, 3).every(x => x === 'بانک ملت') && bk.full[3] === '', 'اسم کامل (فارسی/عربی/انگلیسی) شناخته می‌شود؛ اسم کوتاه به‌تنهایی کافی نیست');
  ok(bk.tie === '', 'دو بانک با امتیاز نزدیک ⇒ نامشخص (انتخاب با کاربر)');
  ok(/^بانک ملت\|/.test(bk.live), 'پیامک تازه از «Bank Mellat»: بانک ملت');

  console.log('• عکس دستهٔ ساخت کاربر');
  const im = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    const c = HKCategorizer.addCustom('باغچه');
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان سنگک', amount: 30000, status: 'paid' })]; persistCurrent(); renderAll();
    openCategoryReviewSheet(t); await w(200); document.querySelector('.sp-cat-sheet .sp-cat-row').click(); await w(250);
    const g = document.querySelector('.sp-cat-sheet .sp-pick-grid');
    const tile = g.querySelector('[data-id="' + c.id + '"]'), food = g.querySelector('[data-id="food"]');
    const o = { edCustom: !!tile.querySelector('.sp-pick-ed'), edBuiltin: !!food.querySelector('.sp-pick-ed'), edVis0: getComputedStyle(tile.querySelector('.sp-pick-ed')).display };
    tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(650); tile.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); tile.click(); await w(80);
    const ir = tile.querySelector('i').getBoundingClientRect(), xr = tile.querySelector('.sp-pick-x').getBoundingClientRect(), er = tile.querySelector('.sp-pick-ed').getBoundingClientRect();
    o.edVis = getComputedStyle(tile.querySelector('.sp-pick-ed')).display; o.xLeft = xr.left < ir.left + ir.width / 2; o.edRight = er.right > ir.left + ir.width / 2;
    o.edIcon = /M12 20h9/.test(tile.querySelector('.sp-pick-ed').innerHTML);
    /* انتخاب عکس (شبیه‌سازی گالری): عکس بزرگ ۸۰۰×۵۰۰ → مربع ۱۲۸ */
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 500; const x = cv.getContext('2d'); x.fillStyle = '#2a9d8f'; x.fillRect(0, 0, 800, 500);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'garden.png', { type: 'image/png' });
    const origClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () { if (this.type === 'file') { const dt = new DataTransfer(); dt.items.add(file); this.files = dt.files; this.dispatchEvent(new Event('change')); } else origClick.call(this); };
    tile.querySelector('.sp-pick-ed').click(); await w(800);
    HTMLInputElement.prototype.click = origClick;
    const img = tile.querySelector('i img.hk-cat-img');
    o.img = !!img; o.stored = (hkCatImgMap()[c.id] || '').slice(0, 15);
    if (img) { const im2 = new Image(); im2.src = img.src; await new Promise(r => { im2.onload = r; im2.onerror = r; }); o.size = im2.naturalWidth + 'x' + im2.naturalHeight; o.bytes = img.src.length; }
    o.inBackup = !!(HKCategorizer.exportData().img || {})[c.id];
    categorySheetBack(); categorySheetBack(); closeCategoryReviewSheet(); await w(100);
    /* همه‌جا همان عکس: پنجرهٔ دستهٔ ویرایش ردیف */
    hkOpenRowEdit({ row: ex.rows[0], tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).click(); await w(250);
    o.inSheet = !!document.querySelector('#hkCatPick .sms-cat[data-cat="' + c.id + '"] img.hk-cat-img');
    document.getElementById('hkCatPick').remove(); document.querySelector('#hkRowEdit .hk-re-no').click(); await w(200);
    HKCategorizer.removeCat(c.id); o.cleaned = !hkCatImgMap()[c.id];
    return o;
  });
  ok(im.edCustom && !im.edBuiltin && im.edVis0 === 'none', 'مداد فقط روی دسته‌های ساخت کاربر، و فقط در حالت لرزش');
  ok(im.edVis === 'flex' && im.xLeft && im.edRight && im.edIcon, 'نگه‌داشتن: × حذف سمت چپ، مداد ویرایش (همان آیکون همیشگی) لبهٔ راست');
  ok(im.img && /^data:image\//.test(im.stored) && im.size === '128x128' && im.bytes < 40000, 'عکس گالری مربع ۱۲۸ پیکسلی شد (اندازهٔ آیکون) و جای آیکون نشست (' + im.size + '، ' + im.bytes + ' بایت)');
  ok(im.inBackup && im.inSheet, 'عکس دسته در پشتیبان هست و در پنجرهٔ دستهٔ ویرایش ردیف هم دیده می‌شود');
  ok(im.cleaned, 'حذف دسته عکسش را هم پاک می‌کند');

  console.log('• جیب به جیب در جدول و اولویت دسته‌ها');
  const tb = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' }), Object.assign(emptyRow('expense'), { day: '3', desc: 'انتقال', amount: 500000, status: 'paid', p2p: true })];
    persistCurrent(); renderAll();
    openPersonDetail(t, 'expense'); await w(600);
    const tr = document.querySelector('tr.hk-p2p-row'), num = tr && tr.querySelector('.pd-num-cell');
    const ic = num && num.querySelector('svg.hk-p2p-rowic');
    const o = { ic: !!ic, w: ic ? ic.getBoundingClientRect().width : 0, same: ic ? /M4 8h14\.5l-3\.5-3\.5/.test(ic.innerHTML) && /M20 16H5\.5L9 19\.5/.test(ic.innerHTML) : false, noNum: num ? !/[۰-۹0-9]/.test(num.textContent) : false,
      amtAfter: getComputedStyle(tr.querySelector('.pd-amt').parentNode, '::after').content, firstNum: document.querySelector('tr:not(.hk-p2p-row) .pd-num').textContent };
    try { closePersonDetail(); } catch (e) {} await w(300);
    openCatPriority(); await w(300);
    const box = document.getElementById('hkCatPriModal');
    o.tab = (box.querySelector('.hk-re-segb.on') || {}).textContent;
    o.oldBtns = box.querySelectorAll('.hk-pri-mode button[data-m]').length;
    const sw = box.querySelector('.hk-pri-mode .hk-switch'); o.swOn = sw && sw.classList.contains('on');
    o.auto = box.querySelector('.hk-pri-list').classList.contains('hk-pri-auto');
    o.handleOff = getComputedStyle(box.querySelector('.hk-pri-h')).pointerEvents === 'none';
    sw.click(); await w(100);
    const box2 = document.getElementById('hkCatPriModal');
    o.swOff = !box2.querySelector('.hk-pri-mode .hk-switch').classList.contains('on'); o.manual = !box2.querySelector('.hk-pri-list').classList.contains('hk-pri-auto') && !!hkCatPri('in');
    box2.querySelector('.hk-pri-mode .hk-switch').click(); await w(100);
    o.backAuto = !hkCatPri('in');
    document.getElementById('hkCatPriModal').remove();
    return o;
  });
  ok(tb.ic && tb.same && tb.noNum && tb.w >= 18, 'جیب به جیب: به‌جای عدد ردیف، همان آیکون دسته، درشت (' + tb.w + 'px)');
  ok(!/⇄/.test(tb.amtAfter || '') && tb.firstNum === '۱', 'کنار مبلغ دیگر ⇄ نیست؛ ردیف‌های دیگر شماره دارند');
  ok(tb.tab === 'واریزی', 'اولویت دسته‌ها: پیش‌فرض «واریزی»');
  ok(tb.oldBtns === 0 && tb.swOn && tb.auto && tb.handleOff, 'به‌جای دو دکمهٔ خودکار/دستی یک کلید «خودکار» (روشن؛ کشیدن غیرفعال)');
  ok(tb.swOff && tb.manual && tb.backAuto, 'خاموش کردن کلید = چیدن دستی فعال؛ روشن کردن دوباره = خودکار');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
