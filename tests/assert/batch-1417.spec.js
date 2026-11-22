// ۱.۴.۲۲ — فیلتر پیامک کیف پول/درگاه (دیجی‌پی)، پیامک بدون نشانهٔ بانکی؛ ویجت تک‌خطی بی هاله و وسط‌چین؛ فیلد «یادآوری چند روز قبل» در تم روز
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• فیلتر پیامک');
  const S = await page.evaluate(() => {
    const T = {
      digipay: 'دیجی‌پی / دیجی‌پی\nبازگشت به اعتبار: ۶۹٬۹۷۵٬۲۲۵ ریال\nواریز به کیف دیجی‌پی (بابت پرداخت از کارت بانکی): ۲۳٬۳۲۵٬۰۷۵ ریال\nمجموع: ۹۳٬۳۰۰٬۳۰۰ ریال\nبابت: مرجوع شدن خرید',
      digikala: 'دیجی‌کالا\nواریز مبلغ ۱۲۰٬۰۰۰ تومان به حساب شما انجام شد',
      melli: 'بانک ملی ایران\nواریز: ۲,۵۰۰,۰۰۰ ریال\nحساب: ...۴۳۲۱\nمانده: ۱۰,۰۰۰,۰۰۰ ریال\n۱۴۰۳/۰۸/۲۲-۱۴:۳۰',
      mellat: 'بانک ملت\nواریز: ۳,۰۰۰,۰۰۰ ریال\nکارت: ...۵۶۷۸\nمانده: ۱۵,۰۰۰,۰۰۰ ریال\n۱۴۰۳/۰۸/۲۲-۱۱:۲۰',
      saderat: 'بانک صادرات ایران\nواریز: ۴,۰۰۰,۰۰۰ ریال\nحساب: ...۹۸۷۶\nمانده: ۲۰,۰۰۰,۰۰۰ ریال\n۱۴۰۳/۰۸/۲۲-۱۰:۱۵',
      saman: 'بانک سامان\nواریز: ۶,۰۰۰,۰۰۰ ریال\nکارت: ...۱۱۲۲\nموجودی: ۲۵,۰۰۰,۰۰۰ ریال\n۱۴۰۳/۰۸/۲۲-۰۸:۳۰',
      pasargad: 'بانک پاسارگاد\nواریز: ۸,۰۰۰,۰۰۰ ریال\nحساب: ...۷۷۸۸\nمانده: ۴۰,۰۰۰,۰۰۰ ریال\n۱۴۰۳/۰۸/۲۲-۱۷:۴۵',
      noBankButCard: 'برداشت: ۵۰۰,۰۰۰ ریال\nکارت: ۶۰۳۷۹۹۷۱۲۳۴۵\n۱۴۰۴/۰۸/۱۰-۱۲:۰۰',
      noBankButBal: 'واریز ۲۰۰,۰۰۰ ریال\nمانده ۸۰۰,۰۰۰ ریال'
    };
    const o = {};
    Object.keys(T).forEach(k => { const p = parseBankSms(T[k]); o[k] = p ? { type: p.type, amount: p.amount } : null; });
    return o;
  });
  ok(S.digipay === null, 'پیامک دیجی‌پی (بازگشت به اعتبار / واریز به کیف) تراکنش حساب نیست');
  ok(S.digikala === null, 'پیامک دیجی‌کالا هم رد می‌شود');
  ok(S.melli && S.mellat && S.saderat && S.saman && S.pasargad && S.melli.type === 'income' && S.melli.amount === 250000, 'پیامک ملی، ملت، صادرات، سامان، پاسارگاد همچنان درست خوانده می‌شود');
  ok(S.noBankButCard && S.noBankButCard.type === 'expense' && S.noBankButBal && S.noBankButBal.type === 'income', 'بی اسم بانک ولی با شمارهٔ کارت یا مانده: همچنان تراکنش است');

  console.log('• فیلد یادآوری چند روز قبل در تم روز');
  const U = await page.evaluate(async () => {
    document.documentElement.setAttribute('data-theme', 'light'); try { applyTheme('light'); } catch (e) {}
    openUserReminderEditor(null, 'نمونه'); await new Promise(r => setTimeout(r, 400));
    const a = getComputedStyle(document.getElementById('urAdvance')).backgroundColor, n = getComputedStyle(document.getElementById('urNote')).backgroundColor;
    return { a, n };
  });
  ok(U.a === U.n && U.a !== 'rgb(27, 27, 27)', 'فیلد «یادآوری چند روز قبل» در تم روز روشن است مثل فیلد یادداشت (' + U.a + ')');

  console.log('• ویجت تک‌خطی');
  const dr = fs.readFileSync(path.join(__dirname, '../../android-src/HkWidgetDraw.java'), 'utf8');
  const ln = dr.slice(dr.indexOf('static Bitmap line('), dr.indexOf('static Bitmap full('));
  ok(!/setShadowLayer/.test(ln), 'پشت هیچ عدد یا نوشته‌ای هاله/سایه نیست');
  ok(/Paint vp=paint\(BOLD, vs, tc, Paint\.Align\.CENTER\)/.test(ln) && /Paint lp=paint\(REG, ls, [^;]*Paint\.Align\.CENTER\)/.test(ln) && /cv\.drawText\(v, cx, nb, vp\)/.test(ln) && /cv\.drawText\("موجودی کل", cx, /.test(ln), 'مبلغ و «موجودی کل» حول یک مرکز مشترک (وسط‌چین نسبت به هم)');
  ok(/hb\*0\.40f, 21\*k/.test(ln) && /hb\*0\.24f, 13\*k/.test(ln), 'مبلغ و «موجودی کل» کمی بزرگ‌تر شدند');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join('|').slice(0, 120));
  console.log('batch-1417: ' + passed + ' passed, ' + failed + ' failed');
  await b.close(); process.exit(failed ? 1 : 0);
})();
