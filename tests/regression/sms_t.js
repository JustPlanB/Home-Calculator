const { chromium } = require('playwright');
const samples = [
  ['melli-in', 'بانك ملي ايران\nانتقال:2,000,000+\nاز3456789012\nمانده:12,345,678\n0730-20:26', 'income', 200000],
  ['melli-out', 'بانك ملي ايران\nبرداشت:1,500,000-\nاز3456789012\nمانده:10,845,678\n0731-09:12', 'expense', 150000],
  ['mellat', 'بانک ملت\nحساب 1234567890\nبرداشت 2,500,000\nمانده 7,000,000\n05/07/12-16:25', 'expense', 250000],
  ['mellat-in', 'بانک ملت\nحساب 1234567890\nواریز 30,000,000\nمانده 37,000,000\n05/07/12-16:25', 'income', 3000000],
  ['saderat', 'بانك صادرات ايران\nبرداشت:500,000\nحساب:0123456789\nمانده:1,234,567\n1405/07/12_14:22', 'expense', 50000],
  ['tejarat-rial', 'بانک تجارت\nبرداشت از حساب 123456\nمبلغ:1,000,000 ريال\nمانده:9,000,000 ريال\n1405/07/10', 'expense', 100000],
  ['arabic-digits', 'بانك سپه\nواريز: ٢٬٥٠٠٬٠٠٠\nمانده: ٨٬٠٠٠٬٠٠٠\n١٤٠٥/٠٧/١١', 'income', 250000],
  ['persian-digits', 'بانک پاسارگاد\nخرید: ۴۵۰,۰۰۰\nمانده: ۳,۰۰۰,۰۰۰\n۱۴۰۵/۰۷/۰۹', 'expense', 45000],
  ['balance-first', 'بانک سامان\nمانده: 50,000,000\nبرداشت: 120,000\n1405/07/08', 'expense', 12000],
  ['refund', 'بانک رفاه\nبرگشت وجه: 300,000\nمانده: 1,300,000', 'income', 30000],
  ['otp', 'بانک ملت\nرمز پویا: 482913\nمبلغ: 1,500,000\nمحرمانه', null, 0],
  ['otp2', 'شناسه تایید برداشت از حساب: 55821\nمبلغ 2,000,000 ریال', null, 0],
  ['promo', 'مشتری گرامی بانک ملت، با نصب همراه بانک از 20% تخفیف بهره‌مند شوید www.bankmellat.ir لغو11', null, 0],
  ['promo2', 'جشنواره قرعه کشی حساب های قرض الحسنه بانک صادرات. جایزه 1,000,000,000 ریال', null, 0],
  ['failed', 'بانک ملی\nخرید ناموفق\nمبلغ: 500,000\nموجودی کافی نیست', null, 0],
  ['notice', 'یادآوری: سررسید قسط وام شما 1405/07/20 مبلغ 5,000,000 ریال', null, 0],
];
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const r = await p.evaluate((samples) => samples.map(([n, t, ty, amt]) => { const x = parseBankSms(t); const ok = ty === null ? x === null : (x && x.type === ty && x.amount === amt); return (ok ? 'OK  ' : 'FAIL') + ' ' + n + ' -> ' + (x ? x.type + ' ' + x.amount + ' ' + x.bank + ' d' + x.day + ' m' + x.month : 'null(' + (isOtpOrAuthSms(t) ? 'otp' : isNonTransactionSms(t)) + ')'); }), samples);
  console.log(r.join('\n')); await b.close();
})();
