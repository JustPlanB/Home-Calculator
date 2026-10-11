const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const cases = [
    'بانک ملت\nقسط: 5,000,000\nحساب 1234***5678\nمانده: 20,000,000\n1405/07/16',
    'بانک تجارت\nقسط وام 12,500,000-\nحساب 0177029475268\nمانده 3,000,000\n07/16',
    'مشتری گرامی قسط وام شما به مبلغ 5,000,000 ریال در تاریخ 1405/07/20 سررسید می شود',
    'قسط',
    'قسط ماهانه کلاس زبان 2,000,000 تومان'
  ];
  for (const c of cases) console.log(JSON.stringify(await p.evaluate(t => { const r = parseBankSms(t); return r ? [r.type, r.amount, r.balance] : null; }, c)), '<-', c.replace(/\n/g,' | ').slice(0,50));
  await b.close(); })();
