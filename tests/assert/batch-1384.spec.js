// ۱.۳.۸۴: رنگ سلامت و جیب به جیب، آیکون بزرگ‌تر، لرزش تند؛ نسخهٔ ساختار داده و تبدیل‌ها؛ دسته روی خود ردیف؛
// «پیامک‌های نفهمیده» با یادگیری؛ کد جاوا در android-src. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const root = path.join(__dirname, '..', '..');
  console.log('• کد بومی در فایل‌های جاوا');
  const pa = fs.readFileSync(path.join(root, 'scripts', 'patch-android.js'), 'utf8');
  const jav = fs.readdirSync(path.join(root, 'android-src')).filter(f => f.endsWith('.java'));
  ok(jav.length === 22 && jav.every(f => /^package ir\.hesabketab\.app;/.test(fs.readFileSync(path.join(root, 'android-src', f), 'utf8'))), '۲۲ کلاس جاوا (۱.۳.۸۶: دو کلاس ویجت پشته‌ای حذف شد) در android-src با بستهٔ درست');
  ok(!/=`package \$\{pkg\}/.test(pa) && (pa.match(/readJava\('/g) || []).length === 22 && pa.split('\n').length < 800, 'patch-android.js دیگر کد جاوا را در متن ندارد (فقط کپی می‌کند)');
  const cl = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  ok(/android-src/.test(cl) && /HK_MIGRATIONS/.test(cl) && /سلامت و بهداشت `#16a34a`/.test(cl) && /جیب به جیب `#ff453a`/.test(cl), 'دستورات پروژه: جای کد بومی، تبدیل‌های داده، رنگ‌های تازه');
  ok(fs.existsSync(path.join(root, 'docs', 'android-device-checklist-fa.md')), 'فهرست چک روی گوشی واقعی');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  /* دادهٔ ماه قبل بدون دسته روی ردیف (مثل نسخه‌های قبل) */
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• رنگ و اندازه');
  const vis = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const s = [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch (e) { return []; } });
    const kf = s.filter(r => r.name === 'hkCatJiggle').pop();
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان سنگک', amount: 30000, status: 'paid' })]; persistCurrent(); renderAll();
    openCategoryReviewSheet(t); await w(200); document.querySelector('.sp-cat-sheet .sp-cat-row').click(); await w(250);
    const g = document.querySelector('.sp-cat-sheet .sp-pick-grid');
    const svg = g.querySelector('.sms-cat[data-id="food"] svg').getBoundingClientRect().width;
    const edu = g.querySelector('[data-id="education"]');
    edu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(650); edu.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); edu.click(); await w(60);
    const cs = getComputedStyle(edu.querySelector('i'));
    const r = { health: HK_CAT_COLORS.health, p2p: HK_CAT_COLORS.p2p, svg, anim: cs.animationName, dur: parseFloat(cs.animationDuration), kfRot: kf ? kf.cssText : '',
      info: getComputedStyle(g.querySelector('[data-id="p2p"] .hk-p2p-info')).backgroundColor };
    categorySheetBack(); categorySheetBack(); closeCategoryReviewSheet(); await w(100);
    return r;
  });
  ok(vis.health === '#16a34a', 'سلامت و بهداشت سبز پررنگ');
  ok(vis.p2p === '#ff453a' && /255, 69, 58/.test(vis.info), 'جیب به جیب قرمز (ⓘ هم قرمز)');
  ok(vis.svg >= 26, 'آیکون داخل مربع دسته بزرگ‌تر (' + vis.svg + 'px)');
  ok(vis.anim === 'hkCatJiggle' && vis.dur <= 0.27 && /1\.6deg/.test(vis.kfRot), 'لرزش تند و ریز مثل آیفون (' + vis.dur + 's)');

  console.log('• نسخهٔ ساختار داده و دسته روی ردیف');
  const mg = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = { boot: hkDataVer(), migs: HK_MIGRATIONS.map(m => m.v).join(','), last: Math.max.apply(null, HK_MIGRATIONS.map(m => m.v)) };
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'هایپر استار', amount: 100000, status: 'paid' })]; persistCurrent();
    o.stamped = JSON.stringify(ex.rows[0].cats) + '|' + ex.rows[0].catKey;
    /* ماه قبل با ردیف بی‌دسته (دادهٔ قدیمی) */
    const pk = periodKey(currentYear, currentMonth - 1); const pd = JSON.parse(JSON.stringify(periodData));
    const r0 = pd.expense.sections.find(q => q.title === t).rows[0]; delete r0.cats; delete r0.catKey; archive[pk] = pd; saveArchive();
    localStorage.setItem(STORAGE_KEY + '_dataVer', '1');
    o.ran = await hkRunMigrations();
    const old = archive[pk].expense.sections.find(q => q.title === t).rows[0];
    o.oldStamped = JSON.stringify(old.cats);
    const snap = await HKStore.get('preMig_' + o.last); o.snap = !!(snap && snap.v && JSON.parse(snap.v).archive && snap.from === 1 && snap.to === o.last);
    o.again = await hkRunMigrations();
    /* عوض کردن دستهٔ همین شرح در این ماه → ماه قبل دست نمی‌خورد */
    HKCategorizer.learn('هایپر استار', ['home']);
    const cur = periodData.expense.sections.find(q => q.title === t).rows[0];
    const old2 = archive[pk].expense.sections.find(q => q.title === t).rows[0];
    o.cur = (HKCategorizer.classify(cur.desc, cur) || {}).id; o.old = (HKCategorizer.classify(old2.desc, old2) || {}).id;
    /* تغییر شرح = دستهٔ تازه */
    cur.desc = 'داروخانه'; persistCurrent(); o.re = (HKCategorizer.classify(cur.desc, cur) || {}).id;
    /* ویرایش ردیف: انتخاب دسته روی خود ردیف می‌ماند */
    hkOpenRowEdit({ row: cur, tab: 'expense', title: t, sec: periodData.expense.sections.find(q => q.title === t), num: 1, onSaved: function () {} }); await w(400);
    [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).click(); await w(250);
    document.querySelector('#hkCatPick .sms-cat[data-cat="tech"]').click(); await w(100);
    document.querySelector('#hkRowEdit .hk-re-ok').click(); await w(400);
    const cur2 = periodData.expense.sections.find(q => q.title === t).rows[0];
    o.edit = JSON.stringify(cur2.cats);
    return o;
  });
  ok(mg.boot === mg.last && /^1,2(,|$)/.test(mg.migs), 'بالا آمدن: تبدیل‌ها به ترتیب اجرا شدند (نسخهٔ داده ' + mg.boot + ')');
  ok(/\["food"\]\|/.test(mg.stamped), 'ردیف تازه دسته‌اش را روی خودش گرفت (' + mg.stamped + ')');
  ok(mg.ran === mg.last && mg.oldStamped === '["food"]' && mg.snap, 'تبدیل ۲: ردیف‌های قدیمی دسته گرفتند؛ پیش از آن نسخهٔ کامل داده نگه داشته شد');
  ok(mg.again === 0, 'تبدیل دوباره اجرا نمی‌شود');
  ok(mg.cur === 'home' && mg.old === 'food', 'عوض کردن دستهٔ یک شرح فقط همین ماه را عوض کرد؛ ماه قبل همان «خوراکی» ماند');
  ok(mg.re === 'health', 'عوض شدن شرح ردیف = دستهٔ تازه');
  ok(mg.edit === '["tech"]', 'دستهٔ انتخابی در ویرایش ردیف روی خود ردیف ماند');

  console.log('• پیامک‌های نفهمیده');
  const un = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const txt = 'بانک نمونه\nبرداشت\n45 هزار تومان\nمانده 900 هزار';
    const o = { parsed: !!(parseBankSms(txt) || {}).amount };
    o.enq = enqueueBankSms(txt, { sender: '+98700999', silent: true });
    o.otp = hkSmsUnreadAdd('کد تایید شما 12345 است'); o.promo = hkSmsUnreadAdd('جشنواره تخفیف 50000 تومان');
    o.n = hkSmsUnreadLoad().length;
    openSideMenu(); await w(300);
    const mi = document.getElementById('menuSmsUnread'); o.menu = mi ? mi.textContent : '';
    o.menuAfter = mi && mi.previousElementSibling && mi.previousElementSibling.id;
    closeSideMenu(); await w(200);
    hkOpenSmsUnread(); await w(200);
    const card = document.querySelector('#hkSmsUnread .hk-unr-card'); o.card = !!card && /45 هزار/.test(card.textContent);
    card.querySelector('[data-ty="expense"]').click();
    const a = card.querySelector('.hk-unr-amt'); a.value = '45000'; a.dispatchEvent(new Event('input')); o.fmt = a.value;
    card.querySelector('.hk-unr-ok').click(); await w(700);
    o.modal = document.getElementById('smsConfirmModal').classList.contains('open');
    o.amt = (document.querySelector('#smsConfirmMeta .sms-ro-amt span') || {}).textContent;
    o.left = hkSmsUnreadLoad().length; o.menuGone = !document.getElementById('menuSmsUnread');
    try { closeSmsConfirmModal('reject'); } catch (e) {} await w(300);
    const lp = hkSmsLearnedParse('بانک نمونه\nبرداشت\n120 هزار تومان\nمانده 7 هزار');
    o.learned = lp && lp.amount + '|' + lp.type;
    o.next = enqueueBankSms('بانک نمونه\nبرداشت\n80 هزار تومان\nمانده 5 هزار', { silent: true });
    o.left2 = hkSmsUnreadLoad().length;
    hkSmsUnreadAdd('بانک دیگر\nواریز\n500 هزار تومان'); hkOpenSmsUnread(); await w(200);
    document.querySelector('#hkSmsUnread .hk-unr-del').click(); await w(100);
    o.dismiss = hkSmsUnreadLoad().length;
    document.querySelector('#hkSmsUnread .hk-unr-close').click();
    return o;
  });
  ok(!un.parsed && un.enq === false && un.n === 1 && !un.otp && !un.promo, 'پیامک تراکنشیِ نفهمیده نگه داشته شد؛ رمز و تبلیغ نه');
  ok(/پیامک‌های نفهمیده/.test(un.menu) && /۱/.test(un.menu) && un.menuAfter === 'menuSmsLater', 'آیتم «پیامک‌های نفهمیده» با شمار، زیر «پیامک‌های ثبت‌نشده»');
  ok(un.card && un.modal && /۴۵/.test(un.amt || '') && un.left === 0 && un.menuGone, 'گفتن نوع و مبلغ → باکس ثبت همیشگی باز شد و پیامک از فهرست رفت');
  ok(un.learned === '120000|expense' && un.next === true && un.left2 === 0, 'همان شکل پیامک دفعهٔ بعد خودش خوانده شد');
  ok(un.dismiss === 0, '«تراکنش نیست» پیامک را از فهرست برداشت');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
