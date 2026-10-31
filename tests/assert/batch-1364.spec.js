// ۱.۳.۶۴: باکس پیامک (هایلایت آبی شرح، Done = ثبت، پیشنهاد برداشت تکراری قرمز، مقایسهٔ دو تراکنش در هشدار تکراری)،
// «＋ افزودن حساب» در ویرایش ردیف، رنگ پیام ثبت واریز/برداشت، و شناسه‌های پیامکِ حساب‌شده برای ویجت.
// فقط دادهٔ مصنوعی در پروفایل تازه و جدا؛ ساعت ثابت (۵ آبان ۱۴۰۵).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-27T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1800);

  console.log('• باکس پیامک');
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_m', bank: 'بانک ملت', label: 'ملت', openingBalance: 50000000, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    [[1405, 6], [1405, 7]].forEach(([y, m]) => {
      const pd = JSON.parse(JSON.stringify(periodData));
      pd.expense.sections.forEach(s => s.rows = []);
      pd.expense.sections[0].rows = [Object.assign(emptyRow('expense'), { day: '5', desc: 'قسط وام', amount: 2500000, status: 'paid', account: 'ملت' })];
      archive[periodKey(y, m)] = pd;
    });
    saveArchive();
    const out = {};
    window.onBankSmsReceived('بانک ملت\nبرداشت 25,000,000\n05/08/05-10:00', { nid: 11 }); await w(700);
    const d = document.getElementById('smsConfirmDesc');
    const cs = getComputedStyle(d);
    out.blue = cs.borderTopColor === 'rgb(8, 181, 245)' && /rgba\(8, 181, 245, 0\.1/.test(cs.backgroundColor);
    out.hint = d.getAttribute('enterkeyhint');
    out.rpt = !!document.getElementById('smsRptMatch');
    out.rptRed = out.rpt && /255, 107, 74/.test(getComputedStyle(document.getElementById('smsRptMatch')).borderTopColor);
    out.rptLabel = (document.querySelector('#smsRptMatch label') || {}).textContent || '';
    out.descAuto = d.value;
    /* «خیر» → شرح خودکار پاک می‌شود؛ دوباره انتخاب → پر */
    const sel = document.getElementById('smsRptMatchSel');
    sel.value = ''; sel.dispatchEvent(new Event('change')); out.descOff = d.value;
    sel.value = 'قسط وام'; sel.dispatchEvent(new Event('change')); out.descOn = d.value;
    /* Done کیبورد = ثبت */
    const toasts = []; const _st = window.showToast; window.showToast = function (m) { toasts.push(String(m)); return _st.apply(this, arguments); };
    d.focus(); d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); await w(800);
    window.showToast = _st;
    out.saved = periodData.expense.sections.flatMap(s => s.rows).filter(x => x.amount === 2500000 && x.desc === 'قسط وام').length;
    out.toastExp = document.getElementById('toast').classList.contains('toast-exp') || toasts.some(t => /^برداشت ثبت شد/.test(t));
    return out;
  });
  ok(r.blue, 'فیلد «بابت چی بود؟» هایلایت آبی دارد');
  ok(r.hint === 'done', 'کیبورد دکمهٔ Done دارد');
  ok(r.rpt && r.rptRed && /قسط وام/.test(r.rptLabel), 'برداشت تکراری (همان مبلغ، حساب و روز در ۲ ماه قبل): پیشنهاد قرمز «قسط وام»');
  ok(r.descAuto === 'قسط وام' && r.descOff === '' && r.descOn === 'قسط وام', 'پیشنهاد شرح خالی را پر می‌کند و با «خیر» برمی‌دارد');
  ok(r.saved === 1, 'Done کیبورد تراکنش را ثبت کرد');
  ok(r.toastExp, 'پیام ثبت برداشت به رنگ برداشت');

  console.log('• هشدار تکراری با مقایسهٔ دو تراکنش');
  const d = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.onBankSmsReceived('بانک ملت\nبرداشت 25,000,000\n05/08/05-10:04', { nid: 12 }); await w(800);
    document.getElementById('smsConfirmDesc').value = 'تست';
    confirmSmsEntry(); await w(400);
    const cc = document.getElementById('confirmCmp');
    const out = { shown: cc.style.display !== 'none', cards: cc.querySelectorAll('.hk-dc-card').length,
      sms: [...cc.querySelectorAll('.hk-dc-sms')].map(x => x.textContent), diff: [...cc.querySelectorAll('.hk-dc-diff')].map(x => x.textContent) };
    document.getElementById('confirmNo').click(); await w(100);
    askConfirm('پرسش معمولی'); out.plainHidden = cc.style.display === 'none' && !cc.innerHTML;
    document.getElementById('confirmNo').click();
    try { closeSmsConfirmModal('reject'); } catch (e) {}
    return out;
  });
  ok(d.shown && d.cards === 2, 'دو کارت زیر هم: پیامک تازه و ثبت قبلی');
  ok(d.sms.length === 2 && /10:04/.test(d.sms[0]) && /10:00/.test(d.sms[1]), 'متن هر دو پیامک (قبلی از دفتر پیامک‌های ثبت‌شده)');
  ok(d.diff.length === 2 && d.diff.every(t => /ساعت/.test(t)), 'فقط تفاوت (ساعت) پررنگ است');
  ok(d.plainHidden, 'پرسش‌های معمولی بدون بخش مقایسه');

  console.log('• ویرایش ردیف: ＋ افزودن حساب');
  const e = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = allPersonTitles()[0];
    const sec = periodData.expense.sections.find(s => s.title === t);
    sec.rows.unshift(Object.assign(emptyRow('expense'), { day: '3', desc: 'نان', amount: 30000, status: 'paid' }));
    persistCurrent();
    hkOpenRowEdit({ row: sec.rows[0], tab: 'expense', title: t, sec: sec, num: 1, onSaved: function () {} }); await w(400);
    const accB = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /بدون حساب/.test(x.textContent));
    accB.click(); await w(150);
    const items = [...document.querySelectorAll('.hk-re-list .dark-select-option')].map(x => x.textContent);
    [...document.querySelectorAll('.hk-re-list .dark-select-option')].pop().click(); await w(200);
    const inp = document.querySelector('#hkRowEdit .hk-bulk-newinp');
    const out = { last: items[items.length - 1], inp: !!inp, hidden: accB.style.display === 'none' };
    const okBtn = [...document.querySelectorAll('#hkRowEdit button')].find(x => x.textContent.trim() === 'ثبت');
    inp.value = 'ملت'; okBtn.click(); await w(200);
    out.dupBlocked = !!document.getElementById('hkRowEdit') && !selectedAccountLabels().includes('ملت ') && selectedAccountLabels().filter(x => x === 'ملت').length === 1;
    inp.value = 'رسالت'; okBtn.click(); await w(400);
    out.created = selectedAccountLabels().includes('رسالت');
    out.rowAcc = periodData.expense.sections.find(s => s.title === t).rows[0].account;
    out.closed = !document.getElementById('hkRowEdit');
    return out;
  });
  ok(e.last === '＋ افزودن حساب', 'آخرین گزینهٔ منوی حساب «＋ افزودن حساب»');
  ok(e.inp && e.hidden, 'مثل باکس پیامک: منو پنهان و فیلد «حساب جدید» جایش');
  ok(e.dupBlocked, 'نام تکراری پذیرفته نمی‌شود');
  ok(e.created && e.rowAcc === 'رسالت' && e.closed, 'حساب تازه ساخته و برای همین ردیف انتخاب شد');

  console.log('• ویجت: شناسهٔ پیامک‌های حساب‌شده');
  const s = await p.evaluate(() => {
    window._hkDoneSmsNids = { 11: 1, 12: 1 };
    smsPendingQueue = [{ nid: 21, amount: 1000, type: 'expense' }];
    const a = hkWidgetSeenNids().sort();
    smsPendingQueue = [];
    return a;
  });
  ok(JSON.stringify(s) === JSON.stringify([11, 12, 21]), 'پیامک‌های در صف و تعیین‌تکلیف‌شده به ویجت گفته می‌شوند');

  console.log('• دایرهٔ «+» صفحهٔ اصلی: ثبت درآمد / ثبت خرج');
  const h = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { closeSmsConfirmModal('reject'); } catch (e) {}
    document.querySelectorAll('#hkRowEdit').forEach(x => x.remove());
    const out = {};
    document.querySelector('.home-circle-add').click(); await w(200);
    const its = [...document.querySelectorAll('#hkAddPop .hk-add-it')];
    out.items = its.map(x => x.textContent);
    out.colors = its.map(x => getComputedStyle(x).color);
    document.documentElement.setAttribute('data-theme', 'light');
    out.lightColors = its.map(x => getComputedStyle(x).color);
    document.documentElement.setAttribute('data-theme', 'dark');
    const sec = periodData.expense.sections.find(s => s.title === hkMainTitle());
    const n0 = sec.rows.length;
    document.querySelector('#hkAddPop .hk-add-it.exp').click(); await w(400);
    out.title = (document.querySelector('#hkRowEdit .hk-re-title') || {}).textContent;
    const btn = t => [...document.querySelectorAll('#hkRowEdit button')].find(x => x.textContent.trim() === t);
    btn('ثبت').click(); await w(150);
    out.needAmount = !!document.getElementById('hkRowEdit');
    btn('انصراف').click(); await w(150);
    out.cancelNoRow = sec.rows.length === n0;
    document.querySelector('.home-circle-add').click(); await w(200);
    document.querySelector('#hkAddPop .hk-add-it.inc').click(); await w(400);
    const amt = document.querySelector('#hkRowEdit .hk-re-amt'); amt.value = '1,200,000'; amt.dispatchEvent(new Event('input'));
    btn('ثبت').click(); await w(500);
    const isec = periodData.income.sections.find(s => s.title === hkMainTitle());
    out.saved = isec.rows.filter(r => Number(r.amount) === 1200000).map(r => r.day + '|' + r.status);
    return out;
  });
  ok(JSON.stringify(h.items) === '["ثبت درآمد","ثبت خرج"]', 'باکس کوچک: بالا «ثبت درآمد»، پایین «ثبت خرج»');
  ok(h.colors[0] === 'rgb(158, 232, 88)' && h.colors[1] === 'rgb(255, 107, 74)' && h.lightColors[0] === 'rgb(63, 154, 92)' && h.lightColors[1] === 'rgb(220, 38, 38)', 'سبز و قرمز خود نرم‌افزار در هر دو تم');
  ok(h.title === 'ثبت خرج' && h.needAmount, 'باکس ثبت ردیف با عنوان «ثبت خرج»؛ بی‌مبلغ ثبت نمی‌شود');
  ok(h.cancelNoRow, 'انصراف: ردیفی اضافه نمی‌شود');
  ok(h.saved.length === 1 && h.saved[0] === '5|paid', 'ثبت درآمد با تاریخ امروز ذخیره شد');

  ok(errors.length === 0, 'هیچ خطای JS ' + (errors[0] || ''));
  await b.close();
  console.log('\nbatch-1364: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
