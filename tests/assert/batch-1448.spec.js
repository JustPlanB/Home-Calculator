// ۱.۴.۴۷ — پیامک «واریز قسط»: از صف نیتیو پاک می‌شود و روی ویجت اعمال نمی‌شود (موجودی کل بیش‌ازحد / حساب منفی).
const { chromium } = require('playwright');
const path = require('path');
const androidSource = require('../lib/android-src.js');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const sms = (amt, dt, to, n, tr) => `بانک مسکن\nواريز قسط به مبلغ:${amt}ريال\nزمان:${dt}\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-${to}\nتعداد اقساط پرداختي :${n}\nمانده معوق :0\nمانده جريمه :0\nپيگيري:${tr}`;
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const R = await page.evaluate((txt) => {
    const o = {}; const calls = []; window.Capacitor = { Plugins: { BankSms: { markHandled: (a) => { calls.push(a && a.nid); return Promise.resolve(); } } } };
    const before = sumGlobalAccountBalances();
    o.parsed = !!hkParseInstallSms(txt);
    o.r1 = window.onBankSmsReceived(txt, { nid: 4242, sender: 'bank' });
    o.r2 = window.onBankSmsReceived(txt, { nid: 4242, sender: 'bank' });     /* دور بعدِ poll: همان پیامک دوباره می‌آید */
    o.calls = calls.slice(); o.done = !!(window._hkDoneSmsNids && window._hkDoneSmsNids[4242]); o.seen = hkWidgetSeenNids().indexOf(4242) >= 0;
    o.balSame = sumGlobalAccountBalances() === before; o.pending = (smsPendingQueue || []).length;
    return o;
  }, sms('18,500,000', '1405/08/06-09:05', '1037', 12, '90012'));
  ok(R.parsed, 'پیامک نمونهٔ «واریز قسط» همان الگوی قسط برنامه است');
  ok(R.r1 === true && R.r2 === true, 'پیامک قسط پذیرفته می‌شود (در کارت قسط ثبت)');
  ok(R.calls.length >= 1 && R.calls.every(n => n === 4242), 'markHandled روی صف نیتیو زده می‌شود (هر دو دور)');
  ok(R.done && R.seen, 'شناسه در «دیده‌شده‌ها»ی ویجت است (دوباره اعمال نمی‌شود)');
  ok(R.balSame && R.pending === 0, 'موجودی حساب‌ها تغییر نمی‌کند و چیزی در صف ثبت نمی‌ماند');
  const J = androidSource();
  const i = J.indexOf('static boolean applySmsTo'), seg = J.slice(i, i + 1400);
  ok(seg.indexOf('واریز\\\\s*قسط') > 0 && seg.indexOf('تعداد\\\\s*اقساط') > 0 && seg.indexOf('تعداد\\\\s*اقساط') < seg.indexOf('long amt=smsAmount(t)'), 'ویجت بومی: پیامک «واریز قسط … تعداد اقساط» را روی موجودی اعمال نمی‌کند');
  ok(errs.length === 0, 'بدون خطای صفحه' + (errs.length ? ' ' + errs[0] : ''));
  await b.close(); console.log('batch-1448: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();
