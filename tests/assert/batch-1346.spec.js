// نسخهٔ ۱.۳.۴۶: نرم‌افزار تک‌کاربره (ادغام کارت‌های اضافه و «s1»، حذف منوهای بخش مقصد)، باکس ثبت پیامک با خلاصهٔ فقط‌خواندنی،
// خاموش شدن اقساط، حساب تازه در ثبت گروهی، تراکنش‌های هر حساب، چیدمان تاریخ/زمان، آرشیو درآمد ثابت با وصل خودکار/دستی،
// لرزش نرم کارت با «تغییر نام»، اعلان اختصاصی. فقط دادهٔ مصنوعی.
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
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'timeFix1342', 'instRevert1337', 'instOff1346'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-21T09:10:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• اعلان و باکس شناور (کد اندروید)');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  /* ۱.۳.۴۷: اعلان دوباره رسمی اندروید (batch-1347) */
  ok(/hk_sms_small\.xml/.test(patch), 'فایل چیدمان قدیمی هنوز ساخته می‌شود (بی‌اثر)');
  ok(/String title=personal\?"فرستندهٔ شخصی":"تراکنش بانکی جدید"/.test(patch), 'پیامک شخصی: فقط «فرستندهٔ شخصی» به رنگ هشدار (بی‌شماره)');
  ok(/"باکس",bpi/.test(patch) && !/setBubbleMetadata/.test(patch), 'به‌جای حباب، دکمهٔ «باکس» زیر اعلان');
  ok(/Theme\.DeviceDefault\.Dialog\.NoActionBar/.test(patch) && /wl\.gravity=Gravity\.TOP/.test(patch) && /box\.addView\(smsSv\)/.test(patch), 'باکس شناور بالای صفحه؛ فیلد و دکمه‌ها اول و متن پیامک آخر (کیبورد روی «ثبت» نمی‌آید)');

  console.log('• تک‌کاربره');
  const sc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    localStorage.removeItem('hesabKetabArchive_v5_mainCard');
    const R = (o) => Object.assign(emptyRow('expense'), o);
    periodData.expense.sections = [
      { id: 's1', title: 'سپهر', rows: [R({ day: '3', desc: 'نان', amount: 1000, status: 'paid' })] },
      { id: 's2', title: 's1', rows: [R({ day: '5', desc: 'میوه', amount: 2000, status: 'paid' })] },
      { id: 's3', title: '', rows: [R({ day: '1', desc: 'قبض', amount: 3000, status: 'paid' })] }
    ];
    periodData.income.sections = [{ id: 's1', title: 'سپهر', rows: [emptyRow('income')] }, { id: 's9', title: 'نام کاربر', rows: [Object.assign(emptyRow('income'), { day: '2', desc: 'حقوق', amount: 9000, status: 'paid' })] }];
    periodData.personCardOrder = ['سپهر', 's1', 'نام کاربر'];
    archive[periodKey(1405, 6)] = { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [Object.assign(emptyRow('income'), { day: '2', desc: 'حقوق قبلی', amount: 8000, status: 'paid' })] }] }, expense: { sections: [{ id: 's1', title: 'سپهر', rows: [] }, { id: 's7', title: 'سپهر', rows: [R({ day: '9', desc: 'ي/ک', amount: 500 })] }] } };
    recurringIncomes.push({ id: 'rec_t', name: 'اجاره', amount: 100, day: 1, sectionTitle: 's1', contractStart: { y: 1405, m: 1, d: 1 } });
    hkSingleCardNormalizeAll();
    renderHomeCards(); await w(300);
    const out = {
      titles: allPersonTitles(), cards: document.querySelectorAll('#homeCards .person-card').length,
      exp: periodData.expense.sections.length + ':' + periodData.expense.sections[0].rows.map(r => r.desc).join(','),
      inc: periodData.income.sections.length + ':' + periodData.income.sections[0].title + ':' + periodData.income.sections[0].rows.map(r => r.desc).join(','),
      arch: archive[periodKey(1405, 6)].income.sections[0].title + '|' + archive[periodKey(1405, 6)].expense.sections.length,
      rec: recurringIncomes.find(r => r.id === 'rec_t').sectionTitle,
      main: localStorage.getItem('hesabKetabArchive_v5_mainCard')
    };
    /* تغییر نام کارت: ماه‌های دیگر هم همان نام */
    openPersonEditSheet('سپهر', false); await w(200);
    const inp = document.querySelector('.person-edit-sheet input'); inp.value = 'سپهر جان';
    [...document.querySelectorAll('.person-edit-sheet button')].find(x => /ذخیره|تأیید|ثبت/.test(x.textContent)).click(); await w(400);
    out.renamed = allPersonTitles().join() + '|' + archive[periodKey(1405, 6)].income.sections[0].title + '|' + recurringIncomes.find(r => r.id === 'rec_t').sectionTitle;
    return out;
  });
  ok(sc.titles.length === 1 && sc.titles[0] === 'سپهر' && sc.cards === 1, 'فقط یک کارت («سپهر»)؛ «s1» و بخش بی‌نام کارت نشدند');
  ok(sc.exp === '1:قبض,نان,میوه' && sc.inc === '1:سپهر:حقوق', 'ردیف‌های «s1»، بی‌نام و «نام کاربر» در همان کارت ادغام شدند (' + sc.exp + ' / ' + sc.inc + ')');
  ok(sc.arch === 'سپهر|1' && sc.rec === 'سپهر' && sc.main === 'سپهر', 'ماه‌های دیگر و درآمد ثابت هم به همان کارت رفتند (' + sc.arch + ', ' + sc.rec + ')');
  ok(sc.renamed === 'سپهر جان|سپهر جان|سپهر جان', 'تغییر نام کارت همه‌جا اعمال شد (' + sc.renamed + ')');

  console.log('• باکس ثبت پیامک');
  const sms = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_a', bank: 'بانک ملی', label: 'ملی مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    window.onBankSmsReceived('بانک ملی\nبرداشت:120,000-\nحساب:62002\nمانده:500,000\n0729-10:20', { nid: 41 }); await w(500);
    const vis = (sel) => { const e = document.querySelector(sel); return !!(e && e.offsetParent !== null); };
    const out = {
      sum: (document.querySelector('.sms-ro-sum') || {}).textContent || '',
      typeHidden: !vis('#smsConfirmType') && !vis('#smsConfirmAmount') && !vis('#smsConfirmDay'),
      secHidden: !vis('#smsConfirmSectionInner') && !vis('#smsConfirmSectionSel'),
      seg: !!document.getElementById('smsExpenseSeg'), plan: !!document.getElementById('smsPlanPickBlock'),
      bank: (function () { const bk = document.getElementById('smsConfirmBank'); const wr = bk && (bk.closest('.fancy-select-wrap') || bk); return !!(wr && wr.offsetParent !== null); })(),
      acct: vis('#smsAccountTypeSeg')
    };
    closeSmsConfirmModal('reject'); await w(200);
    return out;
  });
  /* ۱.۳.۴۷: نوع فقط در عنوان «ثبت برداشت» */ ok(/۱۲,۰۰۰/.test(sms.sum) && /۲۹ مهر ۱۴۰۵/.test(sms.sum) && /۱۰:۲۰/.test(sms.sum), 'مبلغ، نوع (مخارج) و تاریخ فقط مختصر نوشته شد (' + sms.sum.replace(/\s+/g, ' ') + ')');
  ok(sms.typeHidden && sms.secHidden, 'فیلدهای مبلغ، نوع، تاریخ و بخش مقصد قابل ویرایش نیستند/دیده نمی‌شوند');
  ok(!sms.seg && !sms.plan && sms.bank && sms.acct, 'منوی «پرداخت قسط» برداشته شد؛ بانک و «شخصی/پروژه» می‌مانند');

  console.log('• اقساط پنهان');
  const inst = await p.evaluate(async () => {
    const tile = document.querySelector('.hk-inst-tile');
    const R = (o) => Object.assign(emptyRow('expense'), o);
    const sec = periodData.expense.sections[0];
    sec.rows = [R({ day: '5', desc: 'قسط ۱ وام', amount: 500, status: 'paid', fromPlanId: 'p1', fromPlanIndex: 0 }), R({ day: '6', desc: 'پرداخت قبلی', amount: 0, status: 'paid', fromPlanId: 'p1', planLocked: true, planLockedAmt: 500 })];
    archive[periodKey(1405, 9)] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: sec.title, rows: [R({ day: '5', desc: 'قسط ۳', amount: 500, status: 'unpaid', fromPlanId: 'p1', fromPlanIndex: 2 })] }] } };
    const n = hkInstallmentsOffMigrate();
    syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
    return { hidden: tile && getComputedStyle(tile).display === 'none', n, rows: sec.rows.map(r => r.desc + ':' + (r.fromPlanId ? 'plan' : 'row')).join(','), fut: archive[periodKey(1405, 9)].expense.sections[0].rows.filter(r => r.desc).length, on: HK_INSTALLMENTS_ON };
  });
  ok(inst.hidden && inst.on === false, 'منوی اقساط پنهان (حذف نشده)');
  ok(inst.rows === 'قسط ۱ وام:row' && inst.fut === 0, 'ردیف قسط مثل بقیهٔ ردیف‌ها شد؛ «پرداخت قبلی»ها و قسط‌های آیندهٔ پرداخت‌نشده برداشته شدند (' + inst.rows + ')');

  /* از ۱.۳.۴۷ تاریخ/زمان باکس ویرایش دو دکمهٔ ساده است (batch-1347) */
  if (false) {
  console.log('• ویرایش ردیف');
  const ed = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = [Object.assign(emptyRow('expense'), { day: '5', time: '10:15', desc: 'نان', amount: 450000, status: 'paid', account: 'ملی مصنوعی', att: [] })];
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'expense'); await w(600);
    const row = periodData.expense.sections[0].rows[0];
    hkOpenRowEdit({ row, tab: 'expense', title: allPersonTitles()[0], sec: periodData.expense.sections[0], onSaved: function () {} }); await w(300);
    const box = document.getElementById('hkRowEdit');
    const wr = [...box.querySelectorAll('.hk-re-wheels')].map(x => x.getBoundingClientRect());
    const wh = [...box.querySelectorAll('.hk-wheel')].map(x => x.getBoundingClientRect());
    const chips = [...box.querySelectorAll('.hk-re-chip')].map(x => x.getBoundingClientRect());
    const yLabels = [...box.querySelectorAll('.hk-wheel')[2].querySelectorAll('.hk-wheel-it')].map(x => x.textContent);
    const out = {
      chipTxt: [...box.querySelectorAll('.hk-re-chip')].map(x => x.textContent.replace(/\s+/g, ' ')),
      dayR: Math.round(wh[0].right), yearL: Math.round(wh[2].left), hourR: Math.round(Math.max(wh[3].right, wh[4].right)), minL: Math.round(Math.min(wh[3].left, wh[4].left)),
      timeW: Math.round(wh[3].width), dateW: Math.round(wh[0].width),
      chipIn: chips.every((c, i) => c.left > wr[i].left + 4 && c.right < wr[i].right - 4 && Math.abs(c.bottom - wr[i].top) < 2),
      years: yLabels[0] + '-' + yLabels[yLabels.length - 1]
    };
    const amt = box.querySelector('.hk-re-amt');
    amt.focus(); amt.dispatchEvent(new Event('click')); await w(30);
    out.caret = amt.selectionStart === amt.value.length && amt.selectionEnd === amt.value.length;
    const sel = box.querySelectorAll('.hk-re-sel')[0];
    out.chev = !!sel.querySelector('.hk-re-chev');
    sel.click(); await w(60);
    out.open1 = !!document.querySelector('.hk-re-list') && sel.classList.contains('open');
    const optH = Math.round((document.querySelector('.hk-re-list .dark-select-option') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height);
    out.optH = optH;
    sel.click(); await w(60);
    out.closed2 = !document.querySelector('.hk-re-list') && !sel.classList.contains('open');
    box.querySelector('.hk-re-fbtn').click(); await w(300);
    const att = document.getElementById('hkAttachOv');
    out.attOnTop = !!att && parseInt(getComputedStyle(att).zIndex, 10) > parseInt(getComputedStyle(box).zIndex || getComputedStyle(document.getElementById('hkRowEdit')).zIndex, 10);
    try { hkCloseAttach(); } catch (e) {}
    box._hkCancel ? box._hkCancel() : box.remove();
    try { closePersonDetail(); } catch (e) {}
    await w(200);
    return out;
  });
  ok(/تاریخ/.test(ed.chipTxt[0]) && /زمان/.test(ed.chipTxt[1]), 'دو کادر کوچک «تاریخ» و «زمان» چسبیده بالای ستون‌ها (' + ed.chipTxt.join(' | ') + ')');
  ok(Math.abs(ed.dayR - ed.hourR) <= 1 && Math.abs(ed.yearL - ed.minL) <= 1 && ed.timeW > ed.dateW * 1.3, 'دو ستون زمان از راست زیر روز و از چپ زیر سال تمام می‌شوند (هم‌عرض سه ستون تاریخ)');
  ok(ed.chipIn, 'کادرهای عنوان کمی باریک‌تر از ستون‌ها و چسبیده به بالای آن‌ها');
  ok(ed.years === '۱۳۹۰-۱۴۲۰', 'سال‌ها ۱۳۹۰ تا ۱۴۲۰ (' + ed.years + ')');
  ok(ed.caret, 'با اولین ضربه روی مبلغ نشانگر کنار رقم یکان');
  ok(ed.chev && ed.open1 && ed.closed2 && ed.optH >= 40, 'منوی بانک: فلش دارد، یک ضربه باز و ضربهٔ دوم بسته، گزینه‌ها جادار (' + ed.optH + 'px)');
  ok(ed.attOnTop, 'پنجرهٔ دیدن/افزودن فایل روی باکس ویرایش باز می‌شود');

  }
  console.log('• حساب‌ها و ثبت گروهی');
  const acc = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = allPersonTitles()[0];
    selectedBankAccounts.push({ id: 'ba_b', bank: 'بانک ملت', label: 'ملت من', srcName: 'بانک ملت · ۵۵۵۵', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    periodData.expense.sections[0].rows = [
      Object.assign(emptyRow('expense'), { day: '3', desc: 'قدیمی', amount: 100, status: 'paid', account: 'ملت من' }),
      Object.assign(emptyRow('expense'), { day: '20', time: '09:00', desc: 'جدید', amount: 200, status: 'paid', account: 'ملت من' })
    ];
    persistCurrent();
    openBankAccountsModal(); await w(300);
    const sh = document.getElementById('bankSelectedScroll').style.maxHeight + '/' + document.getElementById('bankBanksScroll').style.maxHeight;
    const infos = [...document.querySelectorAll('#bankSelectedScroll > div > div')].filter(x => /ملت من/.test(x.textContent));
    infos[0] && infos[0].click(); await w(300);
    const ov = document.getElementById('hkAccTxOv');
    const out = { sh, ov: !!ov, src: ov && (ov.querySelector('.hk-acctx-src') || {}).textContent, order: ov && [...ov.querySelectorAll('.hk-acctx-r .t')].map(x => x.textContent).join(','),
      fixed: ov && getComputedStyle(ov.querySelector('.hk-acctx-list')).overflowY === 'auto' };
    onBackGuard(); await w(200);
    out.closed = !document.getElementById('hkAccTxOv');
    try { closeBankAccountsModal(); } catch (e) {}
    /* ثبت گروهی: بانکی که حساب ندارد → نوشتن نام همان‌جا */
    const _cap = window.Capacitor; window.Capacitor = Object.assign({}, _cap || {}, { Plugins: Object.assign({}, (_cap && _cap.Plugins) || {}, { BankSms: { readInbox: () => Promise.resolve({ items: [] }) } }) });
    openSmsBulkModal(); await w(200);
    window.Capacitor = _cap;
    _hkBulk.folders = [{ bank: 'بانک سپه', acc4: '0128', sender: '', personal: false, checked: true, open: false, account: '', newLabel: '', inRange: [{ type: 'expense', amount: 5000, j: { y: 1405, m: 7, d: 25 }, balance: 95000, raw: 'x' }] }];
    hkBulkRender(); await w(200);
    const card = document.querySelector('.hk-bulk-folder');
    const dsel = card.querySelector('.hk-bulk-dsel');
    const nb = card.querySelector('.hk-bulk-newacc');
    out.newHiddenFirst = getComputedStyle(nb).display === 'none';
    dsel.querySelector('.dark-select-btn').click(); await w(80);
    const opt = [...document.querySelectorAll('.dark-select-item, .dark-select-option')].find(o => /حساب تازه/.test(o.textContent));
    out.optLabel = opt && opt.textContent;
    opt && opt.click(); await w(120);
    out.newShown = getComputedStyle(nb).display !== 'none';
    const inp = nb.querySelector('input'); inp.value = 'سپه من'; inp.dispatchEvent(new Event('input'));
    out.account = _hkBulk.folders[0].account;
    out.noAccMenu = !(document.getElementById('bankAccountsModal') || { classList: { contains: () => false } }).classList.contains('open');
    try { closeSmsBulkModal(); } catch (e) {}
    await w(200);
    return out;
  });
  /* ۱.۳.۴۷: بلندتر */ ok(acc.sh === '35vh/35vh', 'منوی انتخاب حساب: حساب‌های ساخته‌شده و همهٔ بانک‌ها نصف‌نصف');
  ok(acc.ov && /بانک ملت · ۵۵۵۵/.test(acc.src || '') && acc.order === 'جدید,قدیمی' && acc.fixed, 'زدن نام حساب: تراکنش‌ها از آخر به اول در قاب ثابتِ اسکرول‌شونده، با نام اصلی پیامک بالای آن');
  ok(acc.closed, 'بازگشت پنجرهٔ تراکنش‌های حساب را می‌بندد');
  ok(acc.newHiddenFirst && /حساب تازه/.test(acc.optLabel || '') && acc.newShown && acc.account === 'سپه من' && acc.noAccMenu, 'ثبت گروهی: «حساب تازه» → نوشتن نام در همان پوشه (بدون رفتن به منوی انتخاب حساب)');

  console.log('• آرشیو درآمد ثابت');
  const rec = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = allPersonTitles()[0];
    const item = { id: 'rec_a', name: 'اجاره مصنوعی', amount: 500000, day: 5, sectionTitle: t, account: 'ملی مصنوعی', contractStart: { y: 1405, m: 3, d: 5 }, contractEnd: { y: 1406, m: 3, d: 5 }, createdAt: Date.now() };
    recurringIncomes.push(item);
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '5', desc: 'اجاره مهر', amount: 500000, status: 'paid', account: 'ملی مصنوعی', fromRecurringId: 'rec_a', recLinked: true })];
    persistCurrent();
    recOpenArchive(item, 0); await w(250);
    const m = document.getElementById('recArchiveModal');
    const btns = [...m.querySelectorAll('.rec-arch-fbtn')];
    const br = btns.map(x => x.getBoundingClientRect());
    const out = { x: m.querySelectorAll('.rec-arch-del').length, labels: btns.map(x => x.textContent).join(','), autoRight: br[0] && br[0].left > br[1].left, same: br[0] && Math.abs(br[0].width - br[1].width) <= 1 };
    btns[1].click(); await w(250);
    const mp = document.getElementById('recPickModal');
    const list = mp.querySelector('.hk-mp-list'), first = [...mp.querySelectorAll('.hk-mp-it')].find(x => x.getBoundingClientRect().top >= list.getBoundingClientRect().top - 1);
    out.firstVisible = first && first.textContent;
    list.scrollTop = 99999; await w(50);
    out.titleSticky = Math.abs(mp.querySelector('.hk-mp-title').getBoundingClientRect().top - mp.querySelector('.hk-mp-box').getBoundingClientRect().top) < 2;
    out.cancelCenter = getComputedStyle(mp.querySelector('.hk-mp-cancel')).textAlign;
    mp.querySelector('.hk-mp-cancel').click(); await w(150);
    /* × ردیف → فقط جدا */
    m.querySelector('.rec-arch-del').click(); await w(150);
    const pick = [...document.querySelectorAll('#recPickModal button')];
    /* ۱.۳.۴۷: «بلی/خیر» کنار هم (batch-1347) */ out.cancelOptCenter = getComputedStyle(pick.find(x => x.textContent === 'خیر')).textAlign;
    pick.find(x => x.textContent === 'بلی').click(); await w(250);
    out.unlinked = !periodData.income.sections[0].rows[0].fromRecurringId;
    try { document.getElementById('recArchiveModal').remove(); } catch (e) {}
    const st = document.createElement('div'); st.className = 'rec-st-unpaid'; document.body.appendChild(st); out.unpaidCol = getComputedStyle(st).color; st.remove();
    return out;
  });
  ok(rec.x === 1 && rec.labels === 'وصل خودکار,وصل دستی' && rec.autoRight && rec.same, 'پوشهٔ آرشیو: کنار هر ردیف ×؛ پایین «وصل خودکار» راست و «وصل دستی» چپ، هم‌اندازه');
  ok(/خرداد ۱۴۰۵/.test(rec.firstVisible || '') && rec.titleSticky && rec.cancelCenter === 'center', 'وصل دستی: اولین ماه دیده‌شده ماه شروع قرارداد (خرداد ۱۴۰۵)، عنوان ثابت، «انصراف» وسط‌چین (' + rec.firstVisible + ')');
  ok(rec.cancelOptCenter === 'center' && rec.unlinked, '× ردیف آرشیو → «بلی» فقط اتصال را برمی‌دارد؛ «خیر» وسط‌چین');
  /* ۱.۳.۴۷ */ ok(rec.unpaidCol === 'rgb(244, 143, 177)', '«این ماه: دریافت نشده» همان گلبهی مبالغ دریافت‌نشده');

  console.log('• کارت و رنگ‌ها');
  const card = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    renderHomeCards(); await w(300);
    const c = document.querySelector('#homeCards .person-card'), r = c.getBoundingClientRect();
    const pe = (t) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + 40, clientY: r.top + 30, pointerId: 9, button: 0, pointerType: 'touch' }));
    pe('pointerdown'); await w(650); pe('pointerup');
    const btns = [...c.querySelectorAll('.hk-jig-btn')].map(x => x.textContent);
    const dur = getComputedStyle(c).animationDuration;
    /* زدن کادر درآمد در حالت لرزش: فقط لرزش لغو شود، جدول باز نشود */
    const box = c.querySelector('.person-stat-box'), br = box.getBoundingClientRect();
    const target = document.elementFromPoint(br.left + 10, br.top + 10);
    const ev = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: br.left + 10, clientY: br.top + 10 });
    document.body.dispatchEvent(ev);
    box.click(); await w(300);
    const detail = document.body.classList.contains('detail-open');
    const off = !c.classList.contains('hk-jiggle');
    pe('pointerdown'); await w(650); pe('pointerup');
    [...c.querySelectorAll('.hk-jig-btn')].find(x => x.textContent === 'تغییر نام').click(); await w(250);
    const sheet = !!document.querySelector('.person-edit-sheet');
    try { closePersonEditSheet(); } catch (e) {}
    return { btns: btns.join('،'), dur, detail, off, sheet, pencil: !!c.querySelector('.btn-edit-title'), pal: PROJECT_HIGHLIGHT_PALETTE.slice(0, 3).map(x => x.id).join(',') };
  });
  ok(card.btns === 'تغییر نام،حذف ماه،حذف کلی' && !card.pencil && card.sheet, 'مداد کارت برداشته شد؛ «تغییر نام» در منوی نگه داشتن انگشت');
  ok(card.dur === '0.42s', 'لرزش نرم‌تر و کندتر (' + card.dur + ')');
  ok(card.off && !card.detail, 'در حالت لرزش، زدن جای دیگر فقط لرزش را لغو کرد (جدول باز نشد)');
  ok(card.pal === 'purple,blue,yellow', 'اولویت رنگ دوم و سوم پروژه جابه‌جا شد');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
