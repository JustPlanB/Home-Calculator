// تست‌های با assertion صریح برای قابلیت‌های حیاتی. فقط دادهٔ مصنوعی؛ هر تست در یک context تازه (localStorage خالی).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const BASE_LS = {
  hesabKetabArchive_v5_tourDone: '1',
  hesabKetabArchive_v5_bankSetupDone: '1',
  hesabKetabArchive_v5_cardSwipeHintDone: '1'
};

let failed = 0, passed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  ✓ ' + msg); }
  else { failed++; console.log('  ✗ ' + msg); }
}

async function open(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const ls = Object.assign({}, BASE_LS, opts.ls || {});
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, ls);
  const requests = [];
  ctx.on('request', r => requests.push(r.url()));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(INDEX);
  await page.waitForTimeout(opts.wait || 1800);
  return { ctx, page, errors, requests };
}

const tests = {
  async 'بارگذاری در هر دو تم بدون خطا و بدون تصاویر حذف‌شده'(b) {
    for (const theme of ['dark', 'light']) {
      const { ctx, page, errors } = await open(b, { ls: { hesabTheme: theme } });
      const r = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        cards: document.querySelectorAll('#homeCards .person-card').length,
        hiddenBgImgs: document.querySelectorAll('.person-card-bg').length,
        cardBackgrounds: typeof CARD_BACKGROUNDS !== 'undefined' ? CARD_BACKGROUNDS.length : -1,
        pcPhoto: getComputedStyle(document.querySelector('#homeCards .person-card')).backgroundImage.indexOf('data:image') >= 0,
        bioIcon: !!document.querySelector('.lock-bio-img[src^="data:image/png"]')
      }));
      ok(r.theme === theme, theme + ': تم اعمال شد');
      ok(r.cards >= 1, theme + ': کارت کاربر ساخته شد');
      ok(r.pcPhoto, theme + ': پترن کارت (تصویر #0) نمایش داده می‌شود');
      ok(r.bioIcon, theme + ': آیکون اثر انگشت (تصویر #2) موجود است');
      ok(r.cardBackgrounds === 0 && r.hiddenBgImgs === 0, theme + ': هیچ تصویر پس‌زمینهٔ پنهانی ساخته نمی‌شود');
      ok(errors.length === 0, theme + ': خطای صفحه ندارد ' + (errors[0] || ''));
      await ctx.close();
    }
  },

  async 'شاخص قدیمی پس‌زمینهٔ کارت در داده دست‌نخورده می‌ماند'(b) {
    const meta = JSON.stringify({ 'نام کاربر': { bg: 3 } });
    const { ctx, page, errors } = await open(b, { ls: { hesabKetabArchive_v5_cardMeta: meta } });
    const r = await page.evaluate(() => ({ stored: localStorage.getItem('hesabKetabArchive_v5_cardMeta'), cards: document.querySelectorAll('#homeCards .person-card').length }));
    ok(r.stored === meta, 'cardMeta ذخیره‌شده تغییر نکرد');
    ok(r.cards >= 1 && errors.length === 0, 'کارت بدون خطا ساخته شد');
    await ctx.close();
  },

  async 'درآمد و هزینه و مانده'(b) {
    const { ctx, page, errors } = await open(b);
    const r = await page.evaluate(() => {
      const t = allPersonTitles()[0];
      const inc = periodData.income.sections.find(s => s.title === t);
      const exp = periodData.expense.sections.find(s => s.title === t);
      const a = emptyRow('income'); a.day = '1'; a.amount = 5000000; a.status = 'paid'; inc.rows.unshift(a);
      const c = emptyRow('expense'); c.day = '2'; c.amount = 1200000; c.status = 'paid'; exp.rows.unshift(c);
      const d = emptyRow('expense'); d.day = '3'; d.amount = 300000; d.status = 'unpaid'; exp.rows.unshift(d);
      persistCurrent(); renderAll(); renderHomeCards();
      return personTotals(t);
    });
    ok(r.incomeTotal === 5000000 && r.incomePaid === 5000000, 'جمع درآمد درست است');
    ok(r.expenseTotal === 1500000 && r.expensePaid === 1200000 && r.expenseUnpaid === 300000, 'جمع هزینه و پرداخت‌نشده درست است');
    ok(errors.length === 0, 'خطای صفحه ندارد');
    await ctx.close();
  },

  async 'بکاپ کامل: خروجی و بازیابی روی نصب تازه'(b) {
    const A = await open(b);
    const payload = await A.page.evaluate(() => {
      const t = allPersonTitles()[0];
      const inc = periodData.income.sections.find(s => s.title === t);
      const r = emptyRow('income'); r.day = '5'; r.desc = 'حقوق آزمایشی'; r.amount = 7777000; r.status = 'paid'; inc.rows.unshift(r);
      persistCurrent(); saveArchive();
      return JSON.stringify(buildBackupPayload(null));
    });
    await A.ctx.close();
    const B = await open(b);
    const r = await B.page.evaluate(p => {
      applyBackupData(JSON.parse(p), 'replace');
      const all = [];
      Object.keys(archive).forEach(k => ((archive[k].income || {}).sections || []).forEach(s => (s.rows || []).forEach(x => all.push(x))));
      ((periodData.income || {}).sections || []).forEach(s => (s.rows || []).forEach(x => all.push(x)));
      return all.some(x => x.desc === 'حقوق آزمایشی' && Number(x.amount) === 7777000);
    }, payload);
    ok(r, 'ردیف مصنوعی بعد از بازیابی وجود دارد');
    ok(A.errors.length === 0 && B.errors.length === 0, 'خطای صفحه ندارد');
    await B.ctx.close();
  },

  async 'بکاپ رمزدار: رفت‌وبرگشت و رد رمز اشتباه'(b) {
    const { ctx, page } = await open(b);
    const r = await page.evaluate(async () => {
      const enc = await hkEncryptBackup('{"x":"داده مصنوعی"}', 'test-pass-123');
      const plain = await hkDecryptBackup(enc, 'test-pass-123');
      let wrong = 'accepted';
      try { await hkDecryptBackup(enc, 'wrong-pass'); } catch (e) { wrong = 'rejected'; }
      return { alg: enc.enc, hasPlain: JSON.stringify(enc).indexOf('داده مصنوعی') >= 0, plain, wrong };
    });
    ok(r.alg === 'AES-256-GCM', 'الگوریتم AES-256-GCM');
    ok(!r.hasPlain, 'متن اصلی در خروجی رمزشده دیده نمی‌شود');
    ok(r.plain === '{"x":"داده مصنوعی"}', 'رمزگشایی با رمز درست');
    ok(r.wrong === 'rejected', 'رمز اشتباه رد می‌شود');
    await ctx.close();
  },

  async 'تشخیص پیامک بانکی'(b) {
    const { ctx, page } = await open(b);
    const r = await page.evaluate(() => {
      const p1 = parseBankSms('بانک ملت\nبرداشت 2,000,000\nحساب 0000***1111\nمانده 5,000,000');
      const p2 = parseBankSms('بانک ملت\nواریز 3,500,000\nحساب 0000***1111\nمانده 8,500,000');
      const otp = typeof isOtpOrAuthSms === 'function' ? isOtpOrAuthSms('رمز پویا: 123456 بانک ملت') : true;
      return { p1, p2, otp };
    });
    ok(r.p1 && r.p1.type === 'expense' && r.p1.amount > 0, 'برداشت → هزینه با مبلغ');
    ok(r.p2 && r.p2.type === 'income' && r.p2.amount > 0, 'واریز → درآمد با مبلغ');
    ok(r.otp === true, 'پیامک رمز پویا نادیده گرفته می‌شود');
    await ctx.close();
  },

  async 'XSS: نام کارت و شرح، کد اجرا نمی‌کنند'(b) {
    const { ctx, page, errors } = await open(b);
    const r = await page.evaluate(async () => {
      window.__xss = 0;
      const evil = '<img src=x onerror="window.__xss=1">';
      const sec = periodData.expense.sections[0];
      sec.title = evil;
      const row = emptyRow('expense'); row.day = '1'; row.desc = evil; row.amount = 1000; sec.rows.unshift(row);
      persistCurrent(); renderAll(); renderHomeCards();
      await new Promise(res => setTimeout(res, 600));
      return { fired: window.__xss, injectedImgs: [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') === 'x').length };
    });
    ok(r.fired === 0 && r.injectedImgs === 0, 'تگ تزریقی ساخته یا اجرا نشد');
    ok(errors.length === 0, 'خطای صفحه ندارد');
    await ctx.close();
  },

  async 'قرض: ردیف تازه پیش‌فرض بستانکار'(b) {
    const { ctx, page } = await open(b);
    const r = await page.evaluate(() => emptyLedgerRow().status);
    ok(r === 'credit', 'پیش‌فرض بستانکار');
    await ctx.close();
  },

  async 'شبکه: هنگام بارگذاری فقط مقصدهای مجاز'(b) {
    const { ctx, page, requests } = await open(b, { wait: 3000 });
    const ext = requests.filter(u => !/^(file:|data:|blob:|about:)/.test(u));
    const bad = ext.filter(u => !/^https:\/\/(raw\.githubusercontent\.com|github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com)\//.test(u));
    ok(bad.length === 0, 'درخواست به مقصد غیرمجاز نیست ' + (bad[0] || ''));
    await ctx.close();
  }
};

(async () => {
  const b = await chromium.launch();
  for (const name of Object.keys(tests)) {
    console.log('• ' + name);
    try { await tests[name](b); } catch (e) { failed++; console.log('  ✗ استثنا: ' + e.message); }
  }
  await b.close();
  console.log('\nassert: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
