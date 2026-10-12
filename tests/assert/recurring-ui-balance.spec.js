// منوی درآمد ثابت بعد از ویرایش خالی نمی‌شود، پیش‌فرض یک‌سالهٔ تاریخ پایان، آیکون‌های اطلاعات؛
// و موجودی ماه‌های آینده «—» (بدون ذخیرهٔ موجودی اول ماه برای ماه آینده). فقط دادهٔ مصنوعی؛ «امروز» با ساعت ساختگی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z')); /* ۲۱ مهر ۱۴۰۵ */
  await p.goto(INDEX); await p.waitForTimeout(1500);
  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 1000000, createdAt: { y: 1405, m: 1 } });
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 5000000, status: 'paid', account: ACC })] }];
    persistCurrent(); renderAll();
  }, ACC);
  const w = (ms) => p.waitForTimeout(ms);

  console.log('• فرم درآمد ثابت');
  const form = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openFeatureSheet('recurring'); await w(400);
    document.getElementById('addRecurringBtn').click(); await w(300);
    const sh = document.getElementById('recurringSheet');
    const ds = sh.querySelectorAll('.dark-select');
    const out = {
      secDefault: ds[ds.length - 2].getValue(),
      infos: sh.querySelectorAll('.hk-info-btn').length,
      startInfo: !!sh.querySelector('.rec-date-lab .hk-info-btn'),
      endInfo: !!sh.querySelector('.rec-end-toggle .hk-info-btn'),
      hintText: /ماه‌های گذشته ساخته نمی‌شوند/.test(sh.innerText)
    };
    /* شروع ۲۴ مهر ۱۴۰۵ → تیک پایان → ۲۴ مهر ۱۴۰۶ */
    const st = document.querySelectorAll('#recurringSheet .hk-date-sel')[0];
    const pick = async (sel, label) => { sel.querySelector('button').click(); await w(120); const o = [...document.querySelectorAll('.dark-select-list *')].find(e => e.textContent.trim() === label && !e.children.length && e.offsetParent); if (o) o.click(); await w(120); };
    await pick(st.children[0], '۲۴');
    const chk = document.getElementById('recHasEnd'); chk.checked = true; chk.onchange(); await w(100);
    const endSel = document.getElementById('recEndDate');
    out.endDefault = endSel.getDate();
    await pick(st.children[1], 'آبان');
    out.endFollows = endSel.getDate();
    /* نام/مبلغ و ثبت */
    const ins = sh.querySelectorAll('input[type=text]'); ins[0].value = 'اجاره سارا'; ins[1].value = '7,000,000';
    ds[ds.length - 1].setValue('ملت مصنوعی');
    [...sh.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click(); await w(500);
    out.boxAfterCreate = !!document.getElementById('recurringBox') && /اجاره سارا/.test(document.getElementById('recurringBox').innerText);
    /* ویرایش و بلافاصله دیدن فهرست */
    const i = recurringIncomes.findIndex(r => r.name === 'اجاره سارا');
    document.querySelector('[data-re="' + i + '"]').click(); await w(300);
    const sh2 = document.getElementById('recurringSheet');
    sh2.querySelectorAll('input[type=text]')[0].value = 'اجاره سارا ۲';
    [...sh2.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click(); await w(600);
    const box = document.getElementById('recurringBox');
    out.boxAfterEdit = !!box && document.body.contains(box) && /اجاره سارا ۲/.test(box.innerText);
    out.status = box ? box.innerText : '';
    closeFeatureSheet(); await w(200);
    return out;
  });
  ok(form.secDefault === 's1', 'فقط یک بخش درآمد هست: همان پیش‌فرض بخش مقصد شد');
  ok(form.startInfo && form.endInfo && !form.hintText, 'توضیح‌ها داخل آیکون اطلاعات کنار «شروع قرارداد» و «پایان قرارداد» (متن شلوغ زیر تاریخ‌ها حذف شد)');
  ok(form.endDefault.d === 24 && form.endDefault.m === 7 && form.endDefault.y === 1406, 'تیک پایان: پیش‌فرض یک سال بعد از شروع (۲۴ مهر ۱۴۰۶)');
  ok(form.endFollows.m === 8 && form.endFollows.y === 1406, 'تا پایان دستی عوض نشده، با تغییر شروع جابه‌جا می‌شود (۲۴ آبان ۱۴۰۶)');
  ok(form.boxAfterCreate, 'بعد از ثبت، فهرست درآمدهای ثابت دیده می‌شود');
  ok(form.boxAfterEdit, 'بعد از ویرایش، فهرست خالی نمی‌شود و نام تازه دیده می‌شود');

  console.log('• موجودی ماه‌های آینده');
  const bal = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    updateHomeBalanceCircle(true); await w(1600);
    const now = document.getElementById('homeBalanceCircle').getAttribute('aria-label');
    /* رفتن به آبان */
    navigateToPeriod(1405, 8); await w(400);
    updateHomeBalanceCircle(true); await w(300);
    const fut = document.getElementById('homeBalanceAmt').textContent;
    openInstantBalance(''); await w(200);
    const ib = document.getElementById('instantBalPanel').innerText;
    closeInstantBalance();
    const storedFuture = JSON.stringify((periodData.accountOpeningInstant) || {});
    navigateToPeriod(1405, 7); await w(400);
    updateHomeBalanceCircle(true); await w(1600);
    const back = document.getElementById('homeBalanceCircle').getAttribute('aria-label');
    const arcAban = archive[periodKey(1405, 8)];
    return { now, fut, ib, storedFuture, back, abanOpen: JSON.stringify((arcAban && arcAban.accountOpeningInstant) || {}) };
  });
  ok(/[۰-۹0-9]/.test(bal.now) && bal.now !== '—', 'مهر (ماه جاری): موجودی عددی (' + bal.now + ')');
  ok(bal.fut === '—', 'آبان (ماه آینده): به‌جای موجودی «—»');
  ok(/هنوز مشخص نیست/.test(bal.ib) && /—/.test(bal.ib) && !/[۱-۹]/.test(bal.ib.replace(/[^۰-۹]/g, '')), 'موجودی آنی در آبان: هر حساب «—» با توضیح «موجودی ماه آینده هنوز مشخص نیست»');
  ok(!/ملت مصنوعی/.test(bal.abanOpen), 'رفتن به آبان موجودی اول ماهی برای آبان ذخیره نکرد (عدد کهنه نمی‌ماند)');
  ok(bal.back === bal.now, 'برگشت به مهر: همان موجودی قبلی');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nrecurring-ui-balance: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
