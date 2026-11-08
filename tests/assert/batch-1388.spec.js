// ۱.۳.۸۸: نشانگر بارگذاری، تب‌های اولویت دسته‌ها، باکس ثبت تراکنش (نوع فعالیت، سه ردیف پنج‌تایی، نام یک‌خطی کامل)،
// انتخاب کل متن با دوبار ضربه/نگه‌داشتن، ثبت تکی با صفحه‌کلید هم‌زمان، ویجت ردیف‌ها، فیلترهای جستجو. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• ویجت ردیف‌ها (کد بومی)');
  const pa = androidSource();
  ok(/cv\.drawText\("حساب‌کتاب", W-12\*k/.test(pa) && /HkWidgetDraw\.todayFa\(\)/.test(pa) && /hk_wt_eye/.test(pa), 'بالای ویجت: «حساب‌کتاب»، تاریخ امروز و آیکون چشم');
  ok(/unpaid \? unpaidC\(light\) : amt\(inc, light\)/.test(pa) && /0xFFFFEC0A/.test(pa) && /0xFFA87A00/.test(pa) && /o\.optInt\("u",0\)==1/.test(pa), 'ردیف پرداخت/دریافت‌نشده به زرد نرم‌افزار');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• نشانگر بارگذاری و اولویت دسته‌ها');
  const a = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const d = document.createElement('div'); d.innerHTML = hkLoadingHtml('در حال خواندن پیامک‌ها'); document.body.appendChild(d);
    const t = d.querySelector('.hk-loading-t'), dots = d.querySelectorAll('.hk-loading-dots i');
    const cs = getComputedStyle(t);
    o.tAnim = cs.animationName; o.tColor = cs.color; o.tSize = parseFloat(cs.fontSize);
    o.dots = dots.length; o.dotW = dots[0].getBoundingClientRect().width;
    o.dotAnims = [...dots].map(x => getComputedStyle(x).animationName).join(',');
    o.dotBorder = getComputedStyle(dots[0]).borderTopColor; o.dotDur = getComputedStyle(dots[0]).animationDuration;
    d.remove();
    openCatPriority(); await w(250);
    const m = document.getElementById('hkCatPriModal');
    const tabs = m.querySelector('.hk-pri-tabs'), tin = tabs.querySelector('[data-k="in"]'), tout = tabs.querySelector('[data-k="out"]');
    o.inColor = getComputedStyle(tin).color;
    const ind = tabs.querySelector('.hk-seg-ind'), x0 = ind ? ind.style.transform : '';
    tout.click(); await w(60);
    o.sameTabs = m.querySelector('.hk-pri-tabs') === tabs && tabs.querySelector('.hk-seg-ind') === ind;
    o.outColor = getComputedStyle(tout).color;
    o.indMoved = ind && ind.style.transform !== x0;
    o.indTrans = ind ? getComputedStyle(ind).transitionDuration : '';
    m.remove();
    return o;
  });
  ok(a.tAnim === 'none' && /152, 152, 159|142, 142, 147/.test(a.tColor) && a.tSize <= 17, 'نوشتهٔ «در حال خواندن پیامک‌ها» ثابت، طوسی و کوچک‌تر (' + a.tColor + '، ' + a.tSize + 'px)');
  ok(a.dots === 3 && a.dotW <= 8 && a.dotAnims === 'hkLoadDot,hkLoadDot2,hkLoadDot3' && a.dotBorder === 'rgb(8, 181, 245)' && a.dotDur === '1s', 'سه دایرهٔ کوچک آبی که تند یکی‌یکی پر می‌شوند و از اول (۱.۳.۸۹)');
  ok(a.inColor === 'rgb(158, 232, 88)' && a.outColor === 'rgb(255, 107, 74)', 'تب واریزی سبز، برداشت نارنجی');
  ok(a.sameTabs && a.indMoved && a.indTrans !== '0s', 'جابه‌جایی بین تب‌ها با افکت لغزشی (همان تب‌ها، خط زیر حرکت می‌کند)');

  console.log('• باکس ثبت تراکنش');
  const s = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت ۶۱۶۳', openingBalance: 5000000, createdAt: { y: 1405, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection(); smsAccountBankMap['L4:6292'] = 'ملت ۶۱۶۳'; saveSmsAccountBankMap();
    const o = {};
    const one = async (body) => {
      enqueueBankSms(body, 'Bank Mellat'); await w(1300);
      const g = document.getElementById('smsCatGrid'), box = document.querySelector('#smsConfirmModal .modal-box');
      const lab = document.querySelector('#smsConfirmMeta .sms-pro-block > .family-label'), seg = document.querySelector('#smsConfirmMeta .sms-pro-block > .sms-seg');
      const spans = [...g.querySelectorAll('.sms-cat > span')];
      const r = {
        h: Math.round(box.getBoundingClientRect().height), n: g.querySelectorAll('.sms-cat').length, more: !!g.querySelector('.sms-cat-more'),
        lab: lab.textContent, above: lab.getBoundingClientRect().bottom <= seg.getBoundingClientRect().top + 1, segW: Math.round(seg.getBoundingClientRect().width), metaW: Math.round(document.getElementById('smsConfirmMeta').getBoundingClientRect().width),
        bank: getComputedStyle(document.getElementById('smsBankShow'), '::before').content + document.getElementById('smsBankShow').textContent,
        twoLine: spans.every(sp => getComputedStyle(sp).textOverflow !== 'ellipsis' && Math.round(sp.getBoundingClientRect().height / parseFloat(getComputedStyle(sp).lineHeight)) <= 2) && spans.every(sp => !sp.style.fontSize),
        rows: new Set([...g.children].map(c => Math.round(c.getBoundingClientRect().top))).size,
        glow: getComputedStyle(document.getElementById('smsConfirmDesc')).animationName
      };
      closeSmsConfirmModal('reject'); await w(400);
      return r;
    };
    o.exp = await one('کارت6292\nبرداشت300,000\nمانده6,684,526');
    o.inc = await one('کارت6292\nواریز2,500,000\nمانده9,184,526');
    ['باغچه', 'ورزش باشگاه', 'حیوان خانگی', 'کافه', 'سفر', 'تعمیرات'].forEach(n => HKCategorizer.addCustom(n));
    o.many = await one('کارت6292\nبرداشت200,000\nمانده6,484,526');
    /* ۱.۳.۸۹: فیلد پروژه با باز و بسته شدن نرم */
    try { saveFinancialSubjects([{ id: 'p1', name: 'ساختمان' }]); } catch (eS) {}
    enqueueBankSms('کارت6292\nبرداشت100,000\nمانده6,384,526', 'Bank Mellat'); await w(1300);
    document.querySelector('#smsAccountTypeSeg [data-acct="project"]').click(); await w(60);
    const pw = document.getElementById('smsProjectPickWrap');
    o.projAnim = pw.getAnimations().length > 0; await w(900);
    o.projOpen = getComputedStyle(pw).display !== 'none';
    document.querySelector('#smsAccountTypeSeg [data-acct="personal"]').click(); await w(60);
    o.projAnim2 = pw.getAnimations().length > 0; await w(900);
    o.projClosed = getComputedStyle(pw).display === 'none';
    closeSmsConfirmModal('reject'); await w(400);
    return o;
  });
  ok(s.exp.lab === 'نوع فعالیت' && s.exp.above && s.exp.segW >= s.exp.metaW - 40, '«نوع فعالیت» بالای دکمه‌ها؛ «شخصی | پروژه» تمام‌عرض (' + s.exp.segW + '/' + s.exp.metaW + ')');
  ok(/حساب: ملت ۶۱۶۳/.test(s.exp.bank.replace(/"/g, '')), 'نام حساب: «حساب: ملت ۶۱۶۳»');
  ok(s.inc.h < s.exp.h && s.inc.rows === 2 && s.exp.rows === 3 && s.many.rows === 3, '۱.۳.۸۹: ارتفاع باکس به اندازهٔ تعداد دسته‌ها (واریز ' + s.inc.h + '، برداشت ' + s.exp.h + ')، حداکثر سه ردیف');
  ok(!s.exp.more && s.many.n === 15 && s.many.more, 'تا ۱۵ دسته در سه ردیف پنج‌تایی؛ بیشتر از آن خانهٔ پانزدهم «بیشتر…»');
  ok(s.exp.twoLine && s.many.twoLine, 'نام دسته‌ها با فونت عادی، کامل (بی «…»)، حداکثر دوخطی');
  ok(s.projAnim && s.projOpen && s.projAnim2 && s.projClosed, 'تب «پروژه»: فیلد زیرش نرم باز و بسته می‌شود');
  ok(s.exp.glow === 'none', '«بابت چی بود؟» ثابت (۱.۳.۸۹)');

  console.log('• انتخاب کل متن و ثبت تکی');
  const sel = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'خرید نان سنگک', amount: 30000, status: 'paid' })]; persistCurrent();
    hkOpenRowEdit({ row: ex.rows[0], tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    const ds = document.querySelector('#hkRowEdit .hk-re-desc');
    ds.focus(); ds.setSelectionRange(2, 2);
    const touch = (el) => { const r = el.getBoundingClientRect(); const tc = new Touch({ identifier: Date.now(), target: el, clientX: r.left + 10, clientY: r.top + 10 }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [tc], targetTouches: [tc], changedTouches: [tc] })); return tc; };
    const end = (el, tc) => el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [tc] }));
    /* ۱.۳.۸۹: انتخاب را خود گوشی شروع می‌کند (این‌جا شبیه‌سازی: لمس + انتخاب یک کلمه)؛ نرم‌افزار آن را تا کل متن گسترش می‌دهد */
    let tc = touch(ds); ds.setSelectionRange(5, 8); await w(80); end(ds, tc); await w(120);
    o.long = ds.selectionStart === 0 && ds.selectionEnd === ds.value.length;
    ds.setSelectionRange(2, 4); await w(80);
    o.free = ds.selectionStart === 2 && ds.selectionEnd === 4; /* بعد از آن، جابه‌جا کردن دستگیره‌ها آزاد است */
    tc = touch(ds); end(ds, tc); await w(80); tc = touch(ds); ds.setSelectionRange(0, 4); await w(80); end(ds, tc); await w(120);
    o.dbl = ds.selectionStart === 0 && ds.selectionEnd === ds.value.length;
    document.querySelector('#hkRowEdit .hk-re-no').click(); await w(200);
    openSmsImportModal();
    o.focusNow = document.activeElement === document.getElementById('smsImportText');
    o.top = document.getElementById('smsImportModal').classList.contains('hk-kb-top');
    closeSmsImportModal();
    return o;
  });
  ok(sel.long && sel.free, 'در حال ویرایش: انتخاب گوشی (نگه‌داشتن) تا کل شرح گسترش می‌یابد (با هایلایت و دستگیرهٔ خود گوشی)؛ بعد آزاد');
  ok(sel.dbl, 'در حال ویرایش: دوبار ضربه هم کل شرح را انتخاب می‌کند');
  ok(sel.focusNow && sel.top, 'ثبت تکی/گروهی: صفحه‌کلید همان لحظه با باکس (باکس بالای صفحه، بی پرش)');

  console.log('• ویجت و جستجو');
  const z = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t), inc = periodData.income.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid', account: 'ملت ۶۱۶۳' }),
               Object.assign(emptyRow('expense'), { day: '3', desc: 'قبض برق', amount: 120000, status: 'unpaid', account: 'کارت قدیمی' })];
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 9000000, status: 'unpaid' })];
    persistCurrent();
    const e = hkWidgetTxRows('expense'), a = hkWidgetTxRows('all');
    o.expUnpaid = e.some(x => x.u === 1 && /^−/.test(x.a)) && e.some(x => !x.u && !/^[+−]/.test(x.a));
    o.allUnpaidInc = a.some(x => x.u === 1 && x.x === 'i' && /^\+/.test(x.a));
    /* جستجو */
    switchTabFromMenu('balance'); await w(500);
    try { renderBalanceTab(); } catch (e2) {} await w(300);
    const grid = document.querySelector('.bsr-grid');
    o.order = [...grid.querySelectorAll('.bsr-cell > .balance-acc-label')].map(x => x.textContent.trim()).slice(0, 5).join('|');
    const lab = [...grid.querySelectorAll('.bsr-cell > .balance-acc-label')].find(x => x.textContent.trim() === 'روز');
    o.labColor = lab ? getComputedStyle(lab).color : '';
    const accDs = document.getElementById('balanceAccountFilterWrap').firstElementChild;
    const lst = accDs && accDs._list;
    const opts = lst ? [...lst.children].map(x => x.textContent.trim()) : [];
    o.opts = opts.join('|');
    return o;
  });
  ok(z.expUnpaid && z.allUnpaidInc, 'ویجت: ردیف‌های پرداخت/دریافت‌نشده با + / − (زرد در ویجت)');
  ok(/^نوع\|حساب\|روز\|ماه\|دسته/.test(z.order), 'جستجو: جای «ماه» و «حساب» عوض شد (' + z.order + ')');
  ok(z.labColor === 'rgb(8, 181, 245)', 'نام فیلترها آبی (' + z.labColor + ')');
  ok(/کارت قدیمی \(پاک‌شده\)/.test(z.opts), 'حساب پاک‌شده‌ای که ردیف دارد در فیلتر «حساب» (' + z.opts + ')');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
