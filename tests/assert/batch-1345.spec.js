// نسخهٔ ۱.۳.۴۵: لانگ‌پرس ردیف درآمد/مخارج (مات + دو نیمه: حذف | ویرایش) و باکس ویرایش کامل با انتخاب‌گر چرخشی تاریخ و ساعت،
// یک ضربه روی مبلغ = عوض شدن وضعیت بی‌تأخیر، بانک فقط از ویرایش، حذف ستون ×، رنگ مبالغ، اتصال‌های درآمد ثابت (جدا کردن و وصل دستی)،
// پیامک شخصی کوتاه با شمارهٔ چپ‌به‌راست، اعلان و باکس شناور. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-20T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• اعلان و باکس شناور (کد اندروید)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/"پیامک شخصی \\\\u2066"\+sender/.test(patch) && !/"⚠️ پیامک شخصی از "\+sender/.test(patch), 'عنوان اعلان پیامک شخصی کوتاه و بی‌ایموجی، شماره چپ‌به‌راست (+ جلوی ۹۸)');
  ok(/R\.layout\.hk_done/.test(patch) && /DecoratedCustomViewStyle/.test(patch) && /hk_done\.xml/.test(patch) && /android:text="ثبت شد"[\s\S]{0,80}android:textSize="18sp"[\s\S]{0,40}android:textStyle="bold"/.test(patch) && /android:textSize="12\.5sp"/.test(patch),
    'پیام بعد از ثبت: «بابت: …» کوچک هم‌اندازهٔ نام نرم‌افزار و «ثبت شد» درشت و بولد');
  ok(/ph\.moveTo\(5\*u,13\*u\); ph\.lineTo\(9\*u,17\*u\); ph\.lineTo\(19\*u,7\*u\)/.test(patch) && !/cv\.drawCircle\(size\/2f/.test(patch) && !/setLargeIcon\(tick/.test(patch), 'تیک همان تیک نرم‌افزار است و دایرهٔ سبز بزرگ برداشته شد');
  ok(/private void rtl\(TextView v\)\{ v\.setGravity\(Gravity\.RIGHT\)/.test(patch) && /new LinearLayout\.LayoutParams\(0,dp\(50\),1f\); LinearLayout\.LayoutParams bl2=new LinearLayout\.LayoutParams\(0,dp\(50\),1f\)/.test(patch) && /round\(0xD99EE858,14\)/.test(patch) && /setTextCursorDrawable\(cur\)/.test(patch),
    'باکس شناور: راست‌چین، دو دکمهٔ هم‌اندازه، «ثبت» سبز مات مبالغ، نشانگر سفید');

  console.log('• ردیف‌های مخارج');
  const setup = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_a', bank: 'بانک ملی', label: 'ملی مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    selectedBankAccounts.push({ id: 'ba_b', bank: 'بانک ملت', label: 'ملت مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    periodData.expense.sections[0].rows = [
      Object.assign(emptyRow('expense'), { day: '5', time: '10:15', desc: 'نان', amount: 30000, status: 'paid', account: 'ملی مصنوعی' }),
      Object.assign(emptyRow('expense'), { day: '9', desc: 'میوه', amount: 80000, status: 'unpaid', account: 'ملی مصنوعی' })
    ];
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'expense'); await w(700);
    const ths = [...document.querySelectorAll('.person-detail-sticky .person-detail-table th, .person-detail-table thead th')].map(t => t.textContent.trim());
    const cols = document.querySelectorAll('.person-detail-scroll .person-detail-table col').length;
    const dels = document.querySelectorAll('.person-detail-scroll .pd-del').length;
    const hint = (document.querySelector('.person-detail-hint') || {}).textContent;
    return { ths, cols, dels, hint };
  });
  ok(!setup.ths.includes('') && setup.ths.join(',').startsWith('ردیف,روز,شرح,مبلغ,حساب,فایل') && setup.cols === 6 && setup.dels === 0, 'ستون × حذف شد (شش ستون) و عرضش به مبلغ و حساب رسید');
  ok(/انگشت را روی ردیف نگه دارید/.test(setup.hint), 'راهنمای زیر جدول: برای ویرایش یا حذف، انگشت را روی ردیف نگه دارید');

  const tap = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const rows = [...document.querySelectorAll('.person-detail-scroll tbody tr')];
    const amt = rows[0].querySelector('.pd-amt');
    const before = periodData.expense.sections[0].rows.find(r => r.desc === 'نان').status;
    const c0 = getComputedStyle(amt).color;
    amt.click(); await w(30);
    const after = periodData.expense.sections[0].rows.find(r => r.desc === 'نان').status;
    const c1 = getComputedStyle(amt).color;
    const menu = !!document.querySelector('.status-menu');
    amt.click(); await w(30);
    /* بانک پر: فقط باکس شناور نام، نه منو */
    rows[0].querySelector('.pd-acc-btn').click(); await w(100);
    const accMenu = !!document.querySelector('.dark-select-list.open');
    const pop = (document.querySelector('.cell-text-popup') || {}).textContent;
    try { closeCellTextPopups(); } catch (e) {}
    return { before, after, c0, c1, menu, accMenu, pop };
  });
  ok(tap.before === 'paid' && tap.after === 'unpaid' && !tap.menu, 'یک ضربه روی مبلغ همان لحظه وضعیت را عوض کرد (بی‌منو و بی‌صبر)');
  ok(tap.c0 === 'rgb(255, 107, 74)' && tap.c1 === 'rgb(255, 32, 32)', 'مخارج پرداخت‌شده قرمز نرم‌افزار، پرداخت‌نشده قرمز پررنگ (' + tap.c0 + ' → ' + tap.c1 + ')');
  ok(!tap.accMenu && tap.pop === 'ملی مصنوعی', 'بانکِ ثبت‌شده با یک ضربه فقط دیده می‌شود (عوض کردنش از ویرایش)');

  const lp = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tr = document.querySelectorAll('.person-detail-scroll tbody tr')[0];
    const cell = tr.querySelector('.pd-desc'), r = cell.getBoundingClientRect();
    const ev = (t) => cell.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 10, clientY: r.top + 8, pointerId: 3, button: 0, pointerType: 'touch' }));
    ev('pointerdown'); await w(600); ev('pointerup');
    tr.querySelector('.pd-amt').click(); /* کلیک بعد از رها کردن نباید وضعیت را عوض کند */
    const ov = document.querySelector('.hk-row-act');
    const out = { ov: !!ov, st: periodData.expense.sections[0].rows.find(x => x.desc === 'نان').status };
    if (ov) {
      const orr = ov.getBoundingClientRect(), trr = tr.getBoundingClientRect();
      const eb = ov.querySelector('.hk-ra-edit').getBoundingClientRect(), db = ov.querySelector('.hk-ra-del').getBoundingClientRect();
      out.cover = Math.abs(orr.top - trr.top) < 2 && Math.abs(orr.width - trr.width) < 2;
      out.blur = getComputedStyle(ov).backdropFilter;
      out.halves = Math.abs(eb.width - db.width) < 2 && eb.left > db.left;
    }
    /* بازگشت گوشی حالت را می‌بندد */
    onBackGuard(); await w(300);
    out.backClosed = !document.querySelector('.hk-row-act');
    return out;
  });
  ok(lp.ov && lp.cover && /blur/.test(lp.blur) && lp.halves, 'لانگ‌پرس: کل ردیف مات شد و دو نیمه شد (راست ویرایش، چپ ×)');
  /* قبل از لانگ‌پرس دو ضربه خورده بود (پرداخت‌نشده → پرداخت‌شده)؛ کلیکِ بعد از رها کردن نباید آن را عوض کند */
  ok(lp.st === 'paid', 'کلیکِ بعد از رها کردن لانگ‌پرس وضعیت مبلغ را عوض نکرد');
  ok(lp.backClosed, 'دکمهٔ بازگشت حالت حذف/ویرایش ردیف را می‌بندد');

  const ed = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tr = document.querySelectorAll('.person-detail-scroll tbody tr')[0];
    const cell = tr.querySelector('.pd-day, td:nth-child(2) input') || tr.children[1];
    const r = cell.getBoundingClientRect();
    const ev = (t) => cell.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 5, clientY: r.top + 8, pointerId: 4, button: 0, pointerType: 'touch' }));
    ev('pointerdown'); await w(600); ev('pointerup'); await w(80);
    document.querySelector('.hk-ra-edit').click(); await w(300);
    const box = document.getElementById('hkRowEdit');
    const out = { open: !!box };
    if (!box) return out;
    out.labels = [...box.querySelectorAll('.hk-re-l')].map(l => l.childNodes[0].textContent.trim());
    out.date = box.querySelectorAll('.hk-re-v')[0].textContent; out.time = box.querySelectorAll('.hk-re-v')[1].textContent;
    out.wheels = box.querySelectorAll('.hk-wheel').length;
    out.noClock = !box.querySelector('input[type="time"], input[type="date"]');
    out.desc = box.querySelector('.hk-re-desc').value; out.amt = box.querySelector('.hk-re-amt').value;
    const bb = [...box.querySelectorAll('.hk-re-btns > button')].map(x => Math.round(x.getBoundingClientRect().width));
    out.btns = bb; out.btnTxt = [...box.querySelectorAll('.hk-re-btns > button')].map(x => x.textContent);
    /* تغییر: روز ۷، ساعت ۱۸:۳۰، بانک ملت، شرح تازه، پرداخت شده */
    const wh = box.querySelectorAll('.hk-wheel');
    wh[0].querySelector('.hk-wheel-sc').scrollTop = 7 * 36;
    wh[3].querySelector('.hk-wheel-sc').scrollTop = 19 * 36;
    wh[4].querySelector('.hk-wheel-sc').scrollTop = 30 * 36;
    await w(250);
    out.date2 = box.querySelectorAll('.hk-re-v')[0].textContent; out.time2 = box.querySelectorAll('.hk-re-v')[1].textContent;
    box.querySelector('.hk-re-desc').value = 'نان سنگک تازه';
    box.querySelector('.hk-re-segb.is-paid').click();
    box.querySelectorAll('.hk-re-sel')[0].click(); await w(80);
    const opt = [...document.querySelectorAll('.hk-re-list .dark-select-option')].find(o => o.textContent === 'ملت مصنوعی');
    opt && opt.click(); await w(50);
    box.querySelector('.hk-re-ok').click(); await w(400);
    const row = periodData.expense.sections[0].rows.find(x => x.desc === 'نان سنگک تازه');
    out.saved = row ? [row.day, row.time, row.account, row.status, row.amount].join('|') : '';
    out.closed = !document.getElementById('hkRowEdit');
    return out;
  });
  ok(ed.open && ['تاریخ', 'زمان', 'مبلغ', 'وضعیت', 'بانک / حساب', 'شرح', 'فایل‌ها'].every(l => ed.labels.includes(l)), 'باکس ویرایش همهٔ اطلاعات ردیف را دارد (' + (ed.labels || []).join('، ') + ')');
  ok(ed.date === '۱۴۰۵/۰۷/۰۵' && ed.time === '۱۰:۱۵' && ed.desc === 'نان' && ed.amt === '۳۰,۰۰۰' || (ed.date === '۱۴۰۵/۰۷/۰۵' && ed.time === '۱۰:۱۵' && ed.desc === 'نان'), 'تاریخ ۱۴۰۵/۰۷/۰۵ و زمان ۱۰:۱۵ کامل نوشته شد (' + ed.date + ' ' + ed.time + ' ' + ed.amt + ')');
  ok(ed.wheels === 5 && ed.noClock, 'تاریخ و ساعت با ستون‌های چرخشی به سبک نرم‌افزار (نه ساعت گرد)');
  ok(ed.btns && ed.btns.length === 2 && Math.abs(ed.btns[0] - ed.btns[1]) <= 1 && ed.btnTxt.join('،') === 'ثبت،انصراف', '«ثبت» و «انصراف» هم‌اندازه');
  ok(ed.date2 === '۱۴۰۵/۰۷/۰۷' && ed.time2 === '۱۸:۳۰', 'چرخاندن ستون‌ها تاریخ و ساعت را عوض کرد (' + ed.date2 + ' ' + ed.time2 + ')');
  ok(ed.closed && ed.saved === '7|18:30|ملت مصنوعی|paid|30000', 'ثبت: روز، ساعت، بانک، وضعیت و شرح ذخیره شد (' + ed.saved + ')');

  const mv = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tr = [...document.querySelectorAll('.person-detail-scroll tbody tr')].find(t => /میوه/.test(t.querySelector('.pd-desc').value));
    const cell = tr.querySelector('.pd-desc'), r = cell.getBoundingClientRect();
    const ev = (t) => cell.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 5, clientY: r.top + 8, pointerId: 5, button: 0, pointerType: 'touch' }));
    ev('pointerdown'); await w(600); ev('pointerup'); await w(80);
    document.querySelector('.hk-ra-edit').click(); await w(300);
    const box = document.getElementById('hkRowEdit');
    box.querySelectorAll('.hk-wheel')[1].querySelector('.hk-wheel-sc').scrollTop = 7 * 36; /* آبان */
    await w(200);
    box.querySelector('.hk-re-ok').click(); await w(400);
    const here = periodData.expense.sections[0].rows.some(x => x.desc === 'میوه');
    const ab = archive[periodKey(1405, 8)];
    const there = !!(ab && ab.expense.sections.some(s => (s.rows || []).some(x => x.desc === 'میوه')));
    /* حذف از لانگ‌پرس → سطل زباله */
    const tr2 = document.querySelectorAll('.person-detail-scroll tbody tr')[0];
    const c2 = tr2.querySelector('.pd-desc'), r2 = c2.getBoundingClientRect();
    const ev2 = (t) => c2.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r2.left + 5, clientY: r2.top + 8, pointerId: 6, button: 0, pointerType: 'touch' }));
    ev2('pointerdown'); await w(600); ev2('pointerup'); await w(80);
    document.querySelector('.hk-ra-del').click(); await w(150);
    const conf = document.getElementById('confirmModal').classList.contains('open');
    document.getElementById('confirmYes').click(); await w(400);
    const gone = !periodData.expense.sections[0].rows.some(x => x.desc === 'نان سنگک تازه');
    const trash = JSON.stringify(typeof getTrashList === 'function' ? getTrashList() : (window.trashItems || localStorage.getItem('hesabKetabArchive_v5_trash') || '')).includes('نان سنگک تازه');
    try { closePersonDetail(); } catch (e) {}
    await w(300);
    return { here, there, conf, gone, trash };
  });
  ok(!mv.here && mv.there, 'عوض کردن ماه در باکس ویرایش ردیف را به همان بخشِ ماه دیگر برد');
  ok(mv.conf && mv.gone && mv.trash, '× لانگ‌پرس: با تأیید به سطل زباله رفت');

  console.log('• درآمد دریافت‌نشده');
  const inc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 900000, status: 'unpaid', account: 'ملی مصنوعی' })];
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'income'); await w(600);
    const c = getComputedStyle(document.querySelector('.person-detail-scroll .pd-amt')).color;
    try { closePersonDetail(); } catch (e) {}
    await w(300);
    return c;
  });
  ok(inc === 'rgb(255, 32, 32)', 'مبلغ درآمد دریافت‌نشده هم قرمز پررنگ');

  console.log('• اتصال‌های درآمد ثابت');
  const rec = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const title = allPersonTitles()[0];
    const item = { id: 'rec_syn', name: 'اجاره مصنوعی', amount: 500000, day: 1, sectionTitle: title, account: 'ملی مصنوعی', contractStart: { y: 1405, m: 1, d: 1 }, createdAt: Date.now() };
    recurringIncomes.push(item);
    periodData.income.sections[0].rows = [
      Object.assign(emptyRow('income'), { day: '2', desc: 'واریز اشتباه', amount: 500000, status: 'paid', account: 'ملی مصنوعی', fromRecurringId: 'rec_syn', recLinked: true }),
      Object.assign(emptyRow('income'), { day: '4', desc: 'واریز درست', amount: 500000, status: 'paid', account: 'ملی مصنوعی' })
    ];
    persistCurrent();
    const pick = async (re) => { await w(120); const m = document.getElementById('recPickModal'); const bt = m && [...m.querySelectorAll('button')].find(x => re.test(x.textContent)); if (bt) bt.click(); return !!bt; };
    recLinksModal(item); await w(200);
    const m = document.getElementById('recLinksModal');
    const out = { items: m.querySelectorAll('.hk-rl-it').length, btn: [...m.querySelectorAll('button')].map(x => x.textContent).filter(t => /وصل به ردیف/.test(t)).length };
    m.querySelector('.hk-rl-x').click();
    out.p1 = await pick(/فقط اتصال برداشته شود/); await w(150);
    const wrong = periodData.income.sections[0].rows.find(r => r.desc === 'واریز اشتباه');
    out.unlinked = wrong && !wrong.fromRecurringId;
    document.querySelector('#recLinksModal .hk-rl-add').click();
    out.p2 = await pick(/مهر ۱۴۰۵/);
    out.p3 = await pick(/واریز درست/); await w(200);
    const right = periodData.income.sections[0].rows.find(r => r.desc === 'واریز درست');
    out.linked = right && right.fromRecurringId === 'rec_syn';
    out.items2 = document.querySelectorAll('#recLinksModal .hk-rl-it').length;
    /* حذف همراه ردیف */
    document.querySelector('#recLinksModal .hk-rl-x').click();
    out.p4 = await pick(/اتصال و خود ردیف حذف شود/); await w(200);
    out.deleted = !periodData.income.sections[0].rows.some(r => r.desc === 'واریز درست');
    onBackGuard(); await w(200);
    out.backClosed = !document.getElementById('recLinksModal');
    return out;
  });
  ok(rec.items === 1 && rec.btn === 1, 'پنجرهٔ «اتصال‌ها» ردیف وصل‌شده و دکمهٔ «+ وصل به ردیف یک ماه» را دارد');
  ok(rec.p1 && rec.unlinked, '× → «فقط اتصال برداشته شود»: ردیف ماند و از درآمد ثابت جدا شد');
  ok(rec.p2 && rec.p3 && rec.linked && rec.items2 === 1, 'وصل دستی: انتخاب ماه و ردیف همان ماه → به درآمد ثابت وصل شد');
  ok(rec.p4 && rec.deleted, '× → «اتصال و خود ردیف حذف شود»: ردیف به سطل زباله رفت');
  ok(rec.backClosed, 'بازگشت پنجرهٔ اتصال‌ها را می‌بندد');

  console.log('• کارت، پیامک شخصی، شِیر');
  const misc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(300);
    const c = document.querySelector('#homeCards .person-card'), r = c.getBoundingClientRect();
    const pe = (t) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 40, clientY: r.top + 30, pointerId: 9, button: 0, pointerType: 'touch' }));
    pe('pointerdown'); await w(650); pe('pointerup');
    const jig = c.classList.contains('hk-jiggle');
    onBackGuard(); await w(300);
    const jigOff = !c.classList.contains('hk-jiggle') && !c.querySelector('.hk-jig-menu');
    window.onBankSmsReceived('بانک ملی\nبرداشت:70,000-\nحساب:62002\nمانده:500,000\n0728-11:30', { nid: 31, sender: '+989333666233' }); await w(500);
    const warn = (document.getElementById('smsSenderWarn') || {}).textContent || '';
    closeSmsConfirmModal('reject'); await w(200);
    const nb = getComputedStyle(document.createElement('button'));
    const t = document.createElement('button'); t.className = 'hk-share-new'; document.body.appendChild(t);
    const col = getComputedStyle(t).color; t.remove();
    return { jig, jigOff, warn, col };
  });
  ok(misc.jig && misc.jigOff, 'لرزش کارت با دکمهٔ بازگشت لغو می‌شود');
  ok(/^⚠️ پیامک شخصی از ⁦\+989333666233⁩ — از سرشمارهٔ بانک نیست$/.test(misc.warn), 'هشدار پیامک شخصی کوتاه و «+» جلوی ۹۸ (' + misc.warn + ')');
  ok(misc.col === 'rgb(0, 183, 255)', '«+ ردیف تازه در مخارج» همان آبی دکمه‌های + نرم‌افزار');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
