// ۱.۳.۸۳: بانک از فرستنده (ملت)، رنگ‌های ثابت، ویجت پشته‌ای با کارت مات، ادغام و آیکون‌های تازهٔ دسته‌ها، دسته‌های درآمد در ویرایش ردیف،
// جیب به جیب (ⓘ، رنگ یکتا، در اسلاید دسته‌ها)، حذف دسته با نگه‌داشتن و لرزش، باکس ثبت تراکنش. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1',
  /* دیکشنری قدیمی با شناسه‌های ادغام‌شده */
  [P + '_catDict']: JSON.stringify({ phrases: { 'پرده اتاق': { c: 'housing', cs: ['housing'], s: 'user' }, 'ماسک صورت': { c: 'care', cs: ['care', 'health'], s: 'user' } }, words: { 'کابینت': { c: 'housing', n: 3 } } }) };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی و دستورات');
  const pa = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/static int incC\(boolean light\)\{ return light\?0xFF17834A:0xFF9EE858; \}/.test(pa) && /static int expC\(boolean light\)\{ return light\?0xFFDC2626:0xFFFF6B4A; \}/.test(pa), 'رنگ درآمد/مخارج ویجت‌ها همان رنگ‌های نرم‌افزار');
  ok(/btn\("مخارج", "exp", HkWidgetDraw\.expC\(light\)\)/.test(pa) && /btn\("درآمدها", "inc", HkWidgetDraw\.incC\(light\)\)/.test(pa) && !/0xFFFF7A6B|0xFF6FD08C|0xFFD93A1E|#3f9a5c/.test(pa), 'پنجرهٔ انتخاب مخارج/درآمدها با سبز و نارنجی نرم‌افزار');
  ok(/هر صفحه یک کارت مات کامل/.test(pa) && /cv\.drawRoundRect\(rc, rr, rr, bg\)/.test(pa) && /setBackgroundColor", 0\)/.test(pa) && /android:id="@\+id\/hk_ws_root"[\s\S]{0,200}android:background="@android:color\/transparent"/.test(pa), 'ویجت پشته‌ای: هر صفحه کارت مات، ریشه شفاف');
  const cl = fs.readFileSync(path.join(__dirname, '..', '..', 'CLAUDE.md'), 'utf8');
  ok(/## رنگ‌ها/.test(cl) && /#9ee858/.test(cl) && /#ff6b4a/.test(cl) && /جیب به جیب `#c9d6df`/.test(cl), 'قاعدهٔ رنگ‌ها در دستورات پروژه');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);

  console.log('• بانک از فرستنده');
  const bk = await page.evaluate(() => {
    const now = Date.now();
    const items = [
      { address: '+98700717', date: now - 86400000 * 3, body: 'بانك ملت\nبه سامانه همراه بانك ملت خوش آمديد.\n1405/08/08 - 09:17' },
      { address: '+98700717', date: now - 86400000 * 2, body: 'حساب1234567890\nبرداشت300,000\nمانده6,684,526\n05/08/10-06:02' },
      { address: 'BankMellat', date: now - 86400000, body: 'حساب9999888877\nواریز20,000\nمانده210,025\n05/08/11-06:02' },
      { address: '+9820004', date: now, body: 'بانک ملی ایران\nانتقال:2,000,000+\nحساب:5555\nمانده:9,000,000\n0811-1200' },
      { address: '09121234567', date: now, body: 'حساب1111222233\nبرداشت50,000\nمانده90,000\n05/08/11-06:02' }];
    const setup = hkSetupDetect(items).map(x => x.bank + '|' + x.acc4).sort();
    const noName = detectBankFromSms(items[1].body, true);
    const personal = hkSenderBank('09121234567');
    return { setup, noName, learned: hkSenderBank('+98700717'), byName: hkSenderBank('Bank Mellat') };
  });
  ok(bk.noName === '' && bk.setup.indexOf('بانک ملت|7890') >= 0, 'پیامک ملت بدون اسم بانک در متن: از فرستنده (یادگرفته از پیامک خوشامد) شناخته شد');
  ok(bk.setup.indexOf('بانک ملت|8877') >= 0 && bk.byName === 'بانک ملت', 'فرستندهٔ «Bank Mellat / BankMellat» خودش ملت است');
  ok(bk.setup.indexOf('بانک ملی|5555') >= 0 && bk.setup.length === 3, 'ملی مثل قبل؛ پیامک شمارهٔ شخصی وارد نشد (' + bk.setup.join('، ') + ')');
  ok(bk.learned === 'بانک ملت', 'یادگیری فرستنده روی همین گوشی ذخیره شد');

  console.log('• دسته‌ها');
  const ct = await page.evaluate(() => {
    const ids = HKCategorizer.categories.map(c => c.id);
    const lab = id => (HKCategorizer.byId[id] || {}).label;
    const all = HKCategorizer.categories.map(c => c.id).concat(HK_INCOME_CATS.map(c => c.id), ['p2p']);
    const shapes = {}, cols = {}; let dupS = [], dupC = [];
    all.forEach(id => {
      if (id === 'in_gift') return;
      const sh = HK_CAT_ICONS[id], co = HK_CAT_COLORS[id];
      if (shapes[sh]) dupS.push(shapes[sh] + '=' + id); else shapes[sh] = id;
      if (cols[co]) dupC.push(cols[co] + '=' + id); else cols[co] = id;
    });
    if (Object.values(shapes).some(id => HK_CAT_ICONS[id] === HK_CAT_TAG)) dupS.push('tag');
    return { ids, home: lab('home'), health: lab('health'), dupS, dupC,
      inGift: HK_INCOME_CATS.find(c => c.id === 'in_gift').label, giftSame: HK_CAT_ICONS.in_gift === HK_CAT_ICONS.gift && HK_CAT_COLORS.in_gift === HK_CAT_COLORS.gift,
      p2pArrows: /M4 8h14\.5l-3\.5-3\.5/.test(HK_CAT_ICONS.p2p) && /M20 16H5\.5L9 19\.5/.test(HK_CAT_ICONS.p2p),
      loan: HK_CAT_ICONS.in_loanback !== HK_CAT_ICONS.p2p, bonusStar: HK_CAT_ICONS.in_bonus === HK_CAT_ICONS.fun,
      book: /M12 6\.5C10 5/.test(HK_CAT_ICONS.education), spoon: /ellipse/.test(HK_CAT_ICONS.food), phone: /rect x="6\.5" y="2"/.test(HK_CAT_ICONS.tech),
      cart: /circle cx="9" cy="19"/.test(HK_CAT_ICONS.in_sale) && /M13\.2 12\.6V7\.8/.test(HK_CAT_ICONS.in_sale), medal: /circle cx="12" cy="9\.5" r="3\.6"/.test(HK_CAT_ICONS.in_bonus),
      house: /M10 20v-6h4v6/.test(HK_CAT_ICONS.home), heart: /M12 10v5M9\.5 12\.5h5/.test(HK_CAT_ICONS.health),
      mig1: (HKCategorizer.classify('پرده اتاق') || {}).id, mig2: ((HKCategorizer.classify('ماسک صورت') || {}).ids || []).join(','),
      kw1: (HKCategorizer.classify('اجاره خانه') || {}).id, kw2: (HKCategorizer.classify('آرایشگاه') || {}).id, p2pCol: HK_CAT_COLORS.p2p };
  });
  ok(ct.ids.indexOf('housing') < 0 && ct.ids.indexOf('care') < 0 && ct.home === 'لوازم خانه' && ct.health === 'سلامت و بهداشت', '«مسکن»→«لوازم خانه» و «آرایش و بهداشت»→«سلامت و بهداشت» یکی شدند');
  ok(ct.house && ct.heart, 'لوازم خانه با آیکون خانه، سلامت و بهداشت با آیکون قلب');
  ok(ct.mig1 === 'home' && ct.mig2 === 'health' && ct.kw1 === 'home' && ct.kw2 === 'health', 'شرح‌های یادگرفته و کلیدواژه‌های قبلی به دستهٔ تازه رفتند');
  ok(!ct.dupS.length, 'هیچ دو دسته‌ای (مخارج + درآمد) یک شکل نیستند' + (ct.dupS.length ? ': ' + ct.dupS.join('، ') : ''));
  ok(!ct.dupC.length && ct.p2pCol === '#c9d6df', 'هیچ دو دسته‌ای هم‌رنگ نیستند؛ جیب به جیب رنگ خودش' + (ct.dupC.length ? ': ' + ct.dupC.join('، ') : ''));
  ok(ct.inGift === 'هدیه و کمک' && ct.giftSame, '«هدیه و کمک» در درآمد و مخارج مشترک (اسم، آیکون، رنگ)');
  ok(ct.p2pArrows && ct.loan, 'جیب به جیب = ⇄؛ تسویه قرض آیکون دیگری دارد');
  ok(ct.book && ct.spoon && ct.phone && ct.medal && ct.cart && !ct.bonusStar, 'آموزش کتاب، خوراکی قاشق‌چنگال، دیجیتال موبایل، پاداش مدال، فروش چرخ خرید با فلش');

  console.log('• ویرایش ردیف درآمد');
  const re = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), sec = periodData.income.sections.find(s => s.title === t);
    sec.rows = [Object.assign(emptyRow('income'), { day: '3', desc: '', amount: 700000, status: 'paid' })];
    persistCurrent();
    const row = sec.rows[0];
    hkOpenRowEdit({ row, tab: 'income', title: t, sec, num: 1, onSaved: function () {} }); await w(400);
    [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).click(); await w(250);
    const tiles = [...document.querySelectorAll('#hkCatPick .sms-cat')].map(x => x.dataset.cat);
    const p2p = document.querySelector('#hkCatPick .sms-cat[data-cat="p2p"]');
    const info = p2p && p2p.querySelector('i .hk-p2p-info'), sub = !!(p2p && p2p.querySelector('.hk-p2p-sub'));
    let half = null;
    if (info) { const a = info.getBoundingClientRect(), c = p2p.querySelector('i').getBoundingClientRect(); half = a.left < c.left && a.right > c.left && a.top < c.top && a.bottom > c.top; }
    const span = p2p.querySelector('span'); const full = span.scrollWidth <= span.clientWidth + 1 && getComputedStyle(span).textOverflow !== 'ellipsis';
    document.querySelector('#hkCatPick .sms-cat[data-cat="in_bonus"]').click(); await w(150);
    const shown = document.querySelector('#hkRowEdit .hk-re-sel .hk-re-rv') ? [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).textContent : '';
    document.querySelector('#hkRowEdit .hk-re-ok').click(); await w(400);
    return { tiles, half, sub, full, shown, inCat: row.inCat, desc: row.desc };
  });
  ok(['in_salary', 'in_rent', 'in_loanback', 'in_bonus', 'in_gift', 'in_sale', 'in_profit', 'p2p', ''].every(x => re.tiles.indexOf(x) >= 0), 'دسته‌های درآمد همان دسته‌های باکس ثبت پیامک + جیب به جیب');
  ok(re.half === true && !re.sub && re.full, 'جیب به جیب: ⓘ گوشه (نیمی بیرون)، بی‌زیرنویس، اسم کامل');
  ok(/پاداش/.test(re.shown) && re.inCat === 'in_bonus' && re.desc === 'پاداش', 'انتخاب «پاداش» روی ردیف ماند (شرح خالی = اسم دسته)');

  console.log('• اسلاید دسته‌ها');
  const sp = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '5', desc: 'نان سنگک', amount: 40000, status: 'paid' }),
               Object.assign(emptyRow('expense'), { day: '6', desc: 'انتقال به پس‌انداز', amount: 300000, status: 'paid' }),
               Object.assign(emptyRow('expense'), { day: '7', desc: 'انتقال به پس‌انداز', amount: 200000, status: 'paid' })];
    persistCurrent(); renderAll(); await w(200);
    const tot0 = personTotals(t).expenseTotal;
    openCategoryReviewSheet(t); await w(250);
    const rows = [...document.querySelectorAll('.sp-cat-sheet .sp-cat-row')];
    rows.find(r => /انتقال/.test(r.textContent)).click(); await w(250);
    const g = document.querySelector('.sp-cat-sheet .sp-pick-grid');
    const p2p = g.querySelector('[data-id="p2p"]');
    const hasInfo = !!(p2p && p2p.querySelector('.hk-p2p-info'));
    const xVis0 = [...g.querySelectorAll('.sp-pick-x')].filter(x => getComputedStyle(x).display !== 'none').length;
    p2p.click(); await w(250);
    const intro = document.getElementById('hkP2PIntro'); if (intro) intro.querySelector('.hk-p2p-ok').click(); await w(100);
    const marked = ex.rows.filter(r => r.p2p).length;
    /* حذف: نگه‌داشتن → لرزش */
    const edu = g.querySelector('[data-id="education"]');
    edu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(650); edu.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); edu.click(); await w(80);
    const jig = g.classList.contains('hk-jiggle');
    const anim = getComputedStyle(edu.querySelector('i')).animationName;
    const xVis = [...g.querySelectorAll('.sp-pick-x')].filter(x => getComputedStyle(x).display !== 'none').length;
    const xP2P = !!g.querySelector('[data-id="p2p"] .sp-pick-x'), xUnk = !!g.querySelector('[data-id=""] .sp-pick-x');
    const eduOn = edu.classList.contains('on');
    edu.querySelector('.sp-pick-x').click(); await w(200);
    const cf = document.querySelector('#confirmModal.open #confirmYes');
    if (cf) cf.click(); await w(300);
    const gone = !g.querySelector('[data-id="education"]');
    const stillJig = g.classList.contains('hk-jiggle');
    categorySheetBack(); await w(100);
    const jigOff = !g.classList.contains('hk-jiggle');
    const addI = getComputedStyle(g.querySelector('.sp-pick-tadd i'));
    categorySheetBack(); await w(150);
    const chip = [...document.querySelectorAll('.sp-cat-sheet .sp-cat-chip')].map(x => x.textContent).join('|');
    closeCategoryReviewSheet(); await w(200);
    return { hasInfo, xVis0, marked, tot: personTotals(t).expenseTotal, tot0, jig, anim, xVis, xP2P, xUnk, eduOn, gone, stillJig, jigOff, addShadow: addI.boxShadow !== 'none' && addI.borderStyle !== 'dashed', chip, cf: !!cf };
  });
  ok(sp.hasInfo && sp.marked === 2 && sp.tot === sp.tot0 - 500000, '«جیب به جیب» در اسلاید دسته‌ها: همهٔ ردیف‌های آن شرح علامت خوردند و از جمع بیرون رفتند');
  ok(/جیب به جیب/.test(sp.chip), 'شرح جیب‌به‌جیب در فهرست دسته‌ها با برچسب خودش');
  ok(sp.xVis0 === 0, '× حذف دیگر گوشهٔ آیکون‌ها نیست');
  ok(sp.jig && sp.anim === 'hkCatJiggle' && sp.xVis > 0 && !sp.xP2P && !sp.xUnk && !sp.eduOn, 'نگه‌داشتن انگشت: کاشی‌ها می‌لرزند و × قرمز می‌آید (جیب به جیب و نامشخص نه)');
  ok(sp.cf && sp.gone, 'در حالت لرزش با × دسته حذف شد');
  ok(sp.jigOff, 'برگشت اول لرزش را تمام می‌کند');
  ok(sp.addShadow, '«دستهٔ جدید» با همان قاب سایه‌دار');

  console.log('• باکس ثبت تراکنش');
  const sm = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    enqueueBankSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000\n05/08/12-16:25'); await w(900);
    const d = document.getElementById('smsConfirmDesc');
    const amt = document.querySelector('#smsConfirmMeta .sms-ro-amt'), dt = document.querySelector('#smsConfirmMeta .sms-ro-date');
    const fig = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk-fs-figure')) || 0;
    const r = { anim: getComputedStyle(d).animationName, dur: getComputedStyle(d).animationDuration, amtFs: parseFloat(getComputedStyle(amt).fontSize), dtFs: parseFloat(getComputedStyle(dt).fontSize),
      bodyFs: parseFloat(getComputedStyle(document.body).fontSize) };
    const p2p = document.querySelector('#smsCatGrid [data-cat="p2p"]') || (document.querySelector('#smsCatGrid .sms-cat-more') && (document.querySelector('#smsCatGrid .sms-cat-more').click(), await w(200), document.querySelector('#smsCatMore [data-cat="p2p"]')));
    r.info = !!(p2p && p2p.querySelector('.hk-p2p-info'));
    const ell = [...document.querySelectorAll('#smsCatGrid .sms-cat span, #smsCatMore .sms-cat span')].filter(s => getComputedStyle(s).textOverflow === 'ellipsis' && !s.closest('.sms-cat-more')).length;
    r.ell = ell;
    return r;
  });
  ok(sm.anim === 'hkDescBreath' && sm.dur === '5.2s', 'پس‌زمینهٔ «بابت چی بود؟» آرام کم‌نور/پرنور می‌شود');
  ok(sm.amtFs > sm.dtFs * 1.9, 'مبلغ بزرگ‌تر از قبل و تاریخ و ساعت کوچک‌تر (' + sm.amtFs + ' / ' + sm.dtFs + ')');
  ok(sm.info, 'ⓘ جیب به جیب در باکس ثبت پیامک هم هست');
  ok(sm.ell === 0, 'اسم هیچ دسته‌ای «…» نمی‌خورد');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
