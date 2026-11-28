// ۱.۴.۴۹ — پیامک رمز یک‌بارمصرف (OTP): فیلتر گسترده در وب و کد بومی؛ روز هفته در ویرایش ردیف؛ رنگ انتخاب متن دستیار؛ پشتیبان با/بدون پیوست
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const androidSrc = require('../lib/android-src');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const R = await page.evaluate(() => {
    const otp = ['بانک ملی رمز 2960715 انتقال به حساب مبلغ 500,000', 'رمز پویا: 123456 خرید از فروشگاه مبلغ 100,000 ریال', 'کد تایید شما 4821 است', 'کد ورود: 55123', 'Your OTP is 123456', 'رمز اینترنتی شما ۸۸۱۲۳۴ است', 'کد فعال‌سازی ۴۴۱۲۰', 'شناسه تایید برداشت 8821 مبلغ 1,000,000 هشدار محرمانه'];
    const tx = ['برداشت 500,000 ریال مانده 3,000,000 ریال کارت 1234', 'واریز 2,000,000 ریال کد پیگیری 889977 مانده 5,000,000', 'خرید 120,000 ریال از فروشگاه X موجودی 4,000,000'];
    const o = { otp: otp.map(isOtpOrAuthSms), tx: tx.map(isOtpOrAuthSms) };
    o.wd = [hkWeekdayFa(1405, 8, 1), hkWeekdayFa(1405, 9, 3)];
    const cs = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } });
    o.sel = cs.some(t => /hk-asst-bub.*::selection/.test(t));
    o.blk = String(blockAppTouchWhenMenuOpen).indexOf('#hkAsk3') >= 0;
    return o;
  });
  ok(R.otp.every(Boolean), 'همهٔ پیامک‌های رمز/کد تأیید فیلتر می‌شوند: ' + R.otp.join(','));
  ok(R.tx.every(v => !v), 'پیامک تراکنش واقعی (با کد پیگیری) فیلتر نمی‌شود');
  ok(R.wd[0] === 'جمعه' && R.wd[1] === 'سه‌شنبه', 'روز هفته از تاریخ شمسی: ' + R.wd.join('/'));
  ok(R.sel, 'رنگ انتخاب متن حباب دستیار تعریف شده');
  ok(R.blk, 'لمس روی پرسش «با/بدون پیوست» منوی همبرگری را نمی‌بندد (استثنای #hkAsk3)');
  const T = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    applyTheme('dark'); await w(100);
    const a = document.getElementById('homeBalanceAmt'), cs = el => getComputedStyle(el).color;
    o.d = cs(a);
    applyTheme('light'); await w(100); o.l = cs(a);
    a.classList.add('hbc-neg'); o.ln = cs(a); applyTheme('dark'); await w(100); o.dn = cs(a); a.classList.remove('hbc-neg');
    /* مبلغ ردیف درآمد: بی‌درنگ با تم عوض شود */
    const inp = document.querySelector('input.amount-input.status-paid');
    if (inp) { applyTheme('dark'); await w(60); o.rd = cs(inp); applyTheme('light'); await w(60); o.rl = cs(inp); }
    const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    applyTheme('dark'); await w(50); o.v1 = [v('--hk-income'), v('--hk-expense'), v('--hk-amt-deep'), v('--hk-amt-unpaid-red')].join();
    applyTheme('light'); await w(50); o.v2 = [v('--hk-income'), v('--hk-expense'), v('--hk-amt-deep'), v('--hk-amt-unpaid-red')].join();
    applyTheme('dark');
    return o;
  });
  ok(T.d === 'rgb(158, 232, 88)' && T.l === 'rgb(23, 131, 74)', 'دایرهٔ موجودی: رنگ مبلغ با تغییر تم بی‌درنگ عوض می‌شود (' + T.d + ' → ' + T.l + ')');
  ok(T.ln === 'rgb(220, 38, 38)' && T.dn === 'rgb(255, 107, 74)', 'موجودی منفی: قرمز مخصوص هر تم (' + T.ln + ' / ' + T.dn + ')');
  ok(!T.rd || T.rd !== T.rl, 'مبلغ ردیف‌ها با تم عوض می‌شود (' + T.rd + ' → ' + T.rl + ')');
  ok(T.v1 === '#9ee858,#ff6b4a,#ffec0a,#bc2402' && T.v2 === '#17834a,#dc2626,#a87a00,#dc2626', 'متغیرهای رنگ مبلغ ردیف‌ها در هر دو تم: ' + T.v1 + ' | ' + T.v2);
  const Pm = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}, td = getTodayPersian();
    const c = document.getElementById('homeBalanceCircle'), lab = () => c.querySelector('.hbc-label').textContent;
    updateHomeBalanceCircle(true); await w(300);
    o.nowCls = c.classList.contains('hbc-past'); o.nowLab = lab(); o.today = window._hkTodayBal;
    navigateToPeriod(td.y, td.m > 1 ? td.m - 1 : 12 ); await w(600); updateHomeBalanceCircle(true); await w(300);
    o.pastCls = c.classList.contains('hbc-past'); o.pastLab = lab();
    const af = getComputedStyle(c, '::after'); o.after = af.boxShadow.indexOf('255, 107, 74') >= 0;
    openInstantBalance('x'); await w(200);
    const pn = document.getElementById('instantBalPanel');
    o.head = pn.querySelector('.instant-bal-head').textContent; o.btn = !!pn.querySelector('.ib-gonow'); o.todayTxt = (pn.querySelector('.ib-past-today') || {}).textContent || '';
    pn.querySelector('.ib-gonow').click(); await w(700);
    o.back = currentYear * 100 + currentMonth === td.y * 100 + td.m; o.open = document.getElementById('instantBalOverlay').classList.contains('open');
    updateHomeBalanceCircle(true); await w(300); o.backCls = c.classList.contains('hbc-past');
    return o;
  });
  ok(!Pm.nowCls && Pm.nowLab === 'موجودی', 'ماه جاری: دایره عادی');
  ok(Pm.pastCls && /^پایان /.test(Pm.pastLab) && Pm.after, 'ماه گذشته: قرمز ملایم + برچسب «' + Pm.pastLab + '»');
  ok(/نه امروز/.test(Pm.head) && Pm.btn && (Pm.today == null || /موجودی امروز/.test(Pm.todayTxt)), 'پنجرهٔ موجودی: «' + Pm.head + '» و دکمهٔ رفتن به ماه جاری و موجودی امروز');
  ok(Pm.back && !Pm.open && !Pm.backCls, 'یک لمس: برگشت به ماه جاری و برداشتن حالت قرمز');
  const Cp = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; let got = 'none';
    hkCatPickSheet(HKCategorizer.categories.filter(c => c && c.id).slice(0, 6).concat([HK_P2P_CAT]), '', v => { got = JSON.stringify(v); }, 'out', []);
    await w(100);
    const el = id => id === '' ? [...document.querySelectorAll('#hkCatPick .sms-cat')].find(x => /نامشخص/.test(x.textContent)) : document.querySelector('#hkCatPick .sms-cat[data-cat="' + id + '"]');
    el('p2p').click(); await w(100);
    o.p2pOpen = !!document.getElementById('hkCatPick'); o.p2pOn = el('p2p').classList.contains('on'); o.gotBefore = got;
    const ids = [...document.querySelectorAll('#hkCatPick .sms-cat[data-cat]')].map(x => x.dataset.cat).filter(x => x && x !== 'p2p');
    el(ids[0]).click(); await w(50); o.p2pOff = !el('p2p').classList.contains('on'); o.catOn = el(ids[0]).classList.contains('on');
    el('').click(); await w(50); o.unOpen = !!document.getElementById('hkCatPick'); o.unOn = el('').classList.contains('on'); o.catOff = !el(ids[0]).classList.contains('on');
    document.querySelector('#hkCatPick .hk-cp-ok').click(); await w(100);
    o.gotAfter = got; o.closed = !document.getElementById('hkCatPick');
    return o;
  });
  ok(Cp.p2pOpen && Cp.p2pOn && Cp.gotBefore === 'none', 'جیب به جیب: فقط انتخاب می‌شود و پنجره باز می‌ماند');
  ok(Cp.p2pOff && Cp.catOn, 'انتخاب دستهٔ عادی جیب به جیب را برمی‌دارد');
  ok(Cp.unOpen && Cp.unOn && Cp.catOff, 'نامشخص: فقط انتخاب می‌شود');
  ok(Cp.gotAfter === '""' && Cp.closed, 'با «تأیید» اعمال می‌شود (' + Cp.gotAfter + ')');
  const j = androidSrc();
  ok(/static boolean isOtpSms\(/.test(j) && /if\(isOtpSms\(s\)\) return false;/.test(j), 'کد بومی: isOtpSms پیش از هر بررسی دیگر');
  ok(/BankSmsReceiver\.isOtpSms\(text\)\) return false;/.test(j), 'ویجت: applySmsTo هم رمز را رد می‌کند');
  ok(/static int contrastOn\(/.test(j) && /splitText\(cv, v, cx, nb, vp, fillR, onFill, tc\)/.test(j) && /splitText\(cv, ps, padX/.test(j), 'ویجت تک‌خطی: رنگ درصد و موجودی نسبت به پس‌زمینهٔ پشتشان (پُر/خالی) پرکنتراست انتخاب می‌شود');
  ok(!errs.length, 'بدون خطای صفحه ' + errs.join('|'));
  await b.close();
  console.log(passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();
