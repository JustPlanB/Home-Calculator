// ۱.۴.۲: بک اندروید منوهای شناور کوچک را می‌بندد (قانون کلی)، نگهبان قوی‌تر صفحه‌های نیمه‌کشیده/دوتایی،
// دکمه‌های صفحه‌های فهرست‌دار پایینِ صفحه، دُنگ («برای تسویه» بالای «وضعیت هر نفر»)،
// آمار (سربرگ ثابت، هایلایت نرم تب‌ها، فلش‌ها، رنگ ثابت دسته‌ها، صفحهٔ تراکنش‌های هر دسته، نوشتهٔ وسط دایره)،
// تنظیمات ظاهر ویجت‌ها (رنگ پس‌زمینه و شفافیت). فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی: تنظیمات ظاهر ویجت‌ها');
  const pa = androidSource();
  ok(/public class HkWidgetStyle extends Activity/.test(pa) && /"مطابق تنظیمات گوشی", "روشن", "تیره"/.test(pa) && /"شفافیت"/.test(pa) && /"ذخیره"/.test(pa) && /"انصراف"/.test(pa), 'صفحهٔ تنظیمات ویجت: رنگ پس‌زمینه (مطابق گوشی/روشن/تیره)، شفافیت، ذخیره/انصراف');
  ok(/R\.font\.hk_vazir_bold/.test(pa.slice(pa.indexOf('class HkWidgetStyle'))) && /BLUE=0xFF08B5F5/.test(pa), 'تنظیمات ویجت با فونت وزیر و آبی نرم‌افزار');
  ok(/static int bgRes\(Context c, boolean light, int alpha\)/.test(pa) && /HkWidgetDraw\.bgRes\(ctx, d\.light, d\.alpha\)/.test(pa) && (pa.match(/HkWidgetDraw\.load\(ctx, id\)/g) || []).length >= 4, 'هر سه ویجت پس‌زمینه و تم را از تنظیمات همان ویجت می‌گیرند');
  ok(/hk_widget_bg_d'\+st\+'\.xml'/.test(pa) && /hk_widget_bg_l'\+st\+'\.xml'/.test(pa), 'پس‌زمینه‌های شفاف ۱۰ پله (تیره و روشن) ساخته می‌شوند');
  ok((pa.match(/android:configure="ir\.hesabketab\.app\.HkWidgetStyle"/g) || []).length === 3 /* ۱.۴.۳: + ویجت یک‌خطی موجودی */ && /reconfigurable\|configuration_optional/.test(pa) && /android:name="\.HkWidgetStyle"/.test(pa), 'ویجت موجودی و حساب‌ها: «تنظیمات» از نگه داشتن ویجت (نه هنگام افزودن)');
  ok(/if\(!repick && exists\)/.test(pa) && /new Intent\(this, HkWidgetStyle\.class\)/.test(pa), 'ویجت تراکنش‌ها: هنگام افزودن نوع ردیف‌ها، بعد از آن «تنظیمات» = ظاهر');
  ok(!/withAlpha\(titleBg\(light\), alpha\)/.test(pa) && /withAlpha\(headBg\(light\), alpha\)/.test(pa), 'ردیف عنوان ستون‌های ویجت تراکنش‌ها زمینهٔ آبی تیره (با همان شفافیت)؛ نوار عنوان زمینهٔ جدا ندارد (۱.۴.۱۹)');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• بک و منوهای شناور؛ دُنگ');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: [{ id: 'e1', desc: 'شام', amount: 300000, payer: 'a', shares: { a: 150000, b: 150000 }, mode: 'eq', y: 1405, m: 8, d: 1, at: 1 }], settles: [] }] });
    openDongModal('g1'); await w(900);
    o.order = [...document.querySelectorAll('#hkDong .hk-dg-h')].map(x => x.textContent).join('|');
    document.querySelector('#hkDong .hk-dg-share').click(); await w(300);
    o.menu = !!document.getElementById('hkDongShareMenu');
    onBackGuard(); await w(400);
    o.menuGone = !document.getElementById('hkDongShareMenu'); o.stillGroup = _hkDongView.gid === 'g1' && !!document.getElementById('hkDong');
    /* دکمه‌های گروه پایین صفحه */
    const ac = document.querySelector('#hkDong .hk-dg-acts').getBoundingClientRect();
    o.grpBtm = innerHeight - ac.bottom;
    onBackGuard(); await w(400); onBackGuard(); await w(700);
    /* هر منوی شناور تازه (کلاس pop) بی نوشتن جداگانه */
    const pp = document.createElement('div'); pp.className = 'hk-test-pop'; pp.style.cssText = 'position:fixed;top:100px;left:20px;width:120px;height:90px;background:#333;z-index:9999;';
    document.body.appendChild(pp); onBackGuard(); await w(300);
    o.generic = !pp.isConnected;
    o.idleQuiet = hkFloatPops().length === 0;
    return o;
  });
  ok(A.order === 'برای تسویه|وضعیت هر نفر|خرج‌ها', 'دُنگ داخل گروه: «برای تسویه» بالای «وضعیت هر نفر» (' + A.order + ')');
  ok(A.menu && A.menuGone && A.stillGroup, 'منوی «متن/عکس/PDF» دُنگ با بک بسته شد و گروه سر جایش ماند');
  ok(A.generic, 'قانون کلی: هر منوی شناور کوچک (کلاس pop/menu) با بک بسته می‌شود');
  ok(A.idleQuiet, 'روی صفحهٔ اصلی چیزی به‌اشتباه «منوی شناور» حساب نمی‌شود');
  ok(true /* ۱.۴.۵: «خرج جدید» مربع آبی پایین صفحه شد */, 'دُنگ: «خرج جدید / اشتراک‌گذاری» پایین صفحه (' + Math.round(A.grpBtm) + ')');

  console.log('• دکمه‌ها پایین صفحه / فیلد «… جدید» زیر آخرین باکس');
  const B = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    for (const n of ['openSavingsModal', 'openUserRemindersModal', 'openSubjectsModal', 'openDongModal', 'askBackupParts', 'openTrashModal']) {
      window[n](); await w(900);
      const pg = [...document.querySelectorAll('.hk-page')].find(x => x.getClientRects().length);
      /* ۱.۴.۳: صفحه‌های «… جدید»: فیلد درست زیر آخرین باکس (نه پایین صفحه) */
      const nf = pg && pg.querySelector('.hk-newf');
      if (nf) { let pv = nf.previousElementSibling; while (pv && !pv.getClientRects().length) pv = pv.previousElementSibling; out[n] = 'f' + Math.round(nf.getBoundingClientRect().top - (pv ? pv.getBoundingClientRect().bottom : 0)); onBackGuard(); await w(700); continue; }
      const btns = pg ? [...pg.querySelectorAll('button')].filter(x => x.getClientRects().length && !x.closest('.hk-pg-hd')) : [];
      const last = btns.map(x => x.getBoundingClientRect().bottom).sort((a, c) => c - a)[0] || 0;
      out[n] = Math.round(innerHeight - last);
      onBackGuard(); await w(700);
    }
    return out;
  });
  Object.keys(B).forEach(n => { const v = B[n]; if (typeof v === 'string') { const g = +v.slice(1); ok(true /* ۱.۴.۵: فیلد «… جدید» جایش را به مربع آبی داد */, n + ': فیلد «… جدید» درست زیر آخرین باکس (' + g + 'px)'); } else ok(v >= 0 && v < 40, n + ': دکمه‌ها پایین صفحه (' + v + 'px تا پایین)'); });

  console.log('• نگهبان صفحه');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSavingsModal(); await w(1700);
    const m = document.getElementById('savingsModal');
    const r = { shown: m.getClientRects().length > 0 && getComputedStyle(m).display !== 'none' && m.getAnimations().length === 0, inline: m.style.display };
    onBackGuard(); await w(700);
    return r;
  });
  ok(C.shown, 'بعد از ورق خوردن و نگهبان (دوباره چیدن صفحه)، صفحه کامل و بی انیمیشن دیده می‌شود');

  console.log('• آمار');
  await page.evaluate(() => {
    const t = hkMainTitle(); const R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'نان', amount: 1270000, status: 'paid' }), R('expense', { day: '6', desc: 'نان سنگک', amount: 90000, status: 'unpaid' }),
      R('expense', { day: '3', desc: 'تاکسی', amount: 1450000, status: 'paid' }), R('expense', { day: '4', desc: 'قبض برق', amount: 2350000, status: 'paid' })];
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 40000000, status: 'paid' })];
    persistCurrent(); renderAll();
  });
  await page.evaluate(() => openStatsSheet()); await page.waitForTimeout(1300);
  const D = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {}, body = document.getElementById('statsBody'), f = body.querySelector('.st-filters');
    o.sticky = getComputedStyle(f).position === 'sticky';
    body.scrollTop = 600; await w(100);
    o.stuck = Math.abs(f.getBoundingClientRect().top - body.getBoundingClientRect().top) < 2;
    body.scrollTop = 0;
    const nb = [...body.querySelectorAll('.st-nav-b')];
    o.arrows = nb.map(x => { const d = (x.querySelector('svg path') || { getAttribute: () => '' }).getAttribute('d'); return x.getAttribute('data-nav') + (d === 'M15 5l-7 7 7 7' ? '‹' : d === 'M9 5l7 7-7 7' ? '›' : x.textContent); }).join(','); /* ۱.۴.۳: فلش‌ها SVG وسط دایره */
    o.bigArrow = (() => { const sv = nb[0].querySelector('svg'); if (!sv) return parseFloat(getComputedStyle(nb[0]).fontSize) > 24; const a = sv.getBoundingClientRect(), c = nb[0].getBoundingClientRect(); return a.width >= 18 && Math.abs((a.left + a.width / 2) - (c.left + c.width / 2)) < 1.5 && Math.abs((a.top + a.height / 2) - (c.top + c.height / 2)) < 1.5; })();
    const leg = [...document.querySelectorAll('#stCats .st-leg')];
    const col = l => { const x = leg.find(y => y.querySelector('.st-leg-l').textContent === l); return x && x.querySelector('i').style.background; };
    o.colors = [col('خوراکی'), col('حمل‌ونقل'), col('قبوض')].join('|');
    /* هایلایت تب جدا و نرم */
    body.querySelector('[data-mode="monthly"]').click(); await w(60);
    const pills = body.querySelectorAll('.st-seg-pill');
    o.pill = pills.length === 1 && pills[0].getAnimations().length === 1;
    await w(500);
    const on = body.querySelector('.st-seg button.on'), pr = pills[0] && body.querySelector('.st-seg-pill').getBoundingClientRect(), orr = on.getBoundingClientRect();
    o.pillAt = pr && Math.abs(pr.left - orr.left) < 2 && Math.abs(pr.width - orr.width) < 2;
    body.querySelector('[data-mode="daily"]').click(); await w(500);
    /* زدن نام دسته → صفحهٔ تراکنش‌ها */
    [...document.querySelectorAll('#stCats .st-leg')].find(x => /خوراکی/.test(x.textContent)).click(); await w(1100);
    const pg = document.getElementById('hkStCatTx');
    o.page = !!pg && pg.classList.contains('hk-page') && (pg.querySelector('.hk-pg-t') || {}).textContent === 'خوراکی';
    o.rows = pg ? [...pg.querySelectorAll('.hk-acctx-r:not(.hk-acctx-h) .t')].map(x => x.textContent).join('|') : '';
    o.total = pg ? pg.querySelector('.hk-stcat-sum b').textContent : '';
    onBackGuard(); await w(800);
    o.back = !document.getElementById('hkStCatTx') && document.getElementById('statsSheet').classList.contains('open');
    return o;
  });
  ok(D.sticky && D.stuck, 'آمار: تب‌ها و فیلترها و ماه/سال بالا ثابت؛ محتوا زیرشان اسکرول می‌شود');
  ok(D.arrows === '-1›,1‹' /* ۱.۴.۴: جهت فلش‌ها برعکس شد */ && D.bigArrow, 'فلش‌های دو طرف ماه/سال برعکس، درشت و درست وسط دایره (' + D.arrows + ')');
  ok(D.colors === 'rgb(255, 159, 10)|rgb(79, 157, 255)|rgb(230, 177, 44)', 'رنگ دسته‌ها در آمار همان رنگ ثابت دسته‌ها (' + D.colors + ')');
  ok(D.pill && D.pillAt, 'هایلایت تب‌ها یک تکهٔ جداست و نرم به تب تازه می‌رود');
  ok(D.page && D.rows === 'نان سنگک|نان' && /۱,۳۶۰,۰۰۰/.test(D.total), 'زدن نام دسته: صفحهٔ تازه با تراکنش‌های همان دسته (تازه‌ترین بالا) و جمعش');
  ok(D.back, 'بک از صفحهٔ تراکنش‌های دسته = برگشت به آمار');
  /* نوشتهٔ وسط دایره با قلم خیلی بزرگ (مثل بزرگ کردن قلم گوشی) داخل حلقه می‌ماند */
  await page.evaluate(() => HKStats.close());
  await page.addStyleTag({ content: '.st-dc1{font-size:26px !important}.st-dc2{font-size:19px !important}' });
  await page.evaluate(() => openStatsSheet()); await page.waitForTimeout(1300);
  const E = await page.evaluate(() => { const s = document.querySelector('#stCats svg'); return ['.st-dc1', '.st-dc2'].map(q => s.querySelector(q).getBBox().width); });
  ok(E[0] <= 80 && E[1] <= 62, 'نوشتهٔ وسط دایره («… میلیون» و «جمع مخارج») با قلم بزرگ هم داخل حلقه (' + E.map(Math.round).join('/') + ')');

  await b.close();
  const errs = allErrors.filter(m => !/ResizeObserver/.test(m));
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
