// ۱.۳.۸۷: منوی دنگ — گروه، اعضا، خرج مساوی/نامساوی، مانده هر نفر، کمترین پرداخت، «پرداخت شد»، اشتراک متن، پشتیبان. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• حساب دنگ');
  const m = await page.evaluate(() => {
    const o = {};
    /* ۱ به ۲ هزار، ۲ به ۳ هزار بدهکار ⇒ فقط ۱ به ۳ هزار */
    o.chain = hkDongTransfers({ a: -1000, b: 0, c: 1000 });
    o.split = hkDongSplitEq(100000, ['x', 'y', 'z']);
    const g = { members: [{ id: 'a', name: 'آرش' }, { id: 'b', name: 'بهار' }, { id: 'c', name: 'کاوه' }],
      expenses: [{ id: 'e1', amount: 1000, payer: 'b', shares: { a: 1000 } }, { id: 'e2', amount: 1000, payer: 'c', shares: { b: 1000 } }], settles: [] };
    o.bal = hkDongBalances(g); o.tr = hkDongTransfers(o.bal);
    g.settles.push({ id: 's1', from: 'a', to: 'c', amount: 1000 });
    o.after = hkDongTransfers(hkDongBalances(g));
    const g2 = { members: [{ id: 'a', name: 'آرش' }, { id: 'b', name: 'بهار' }, { id: 'c', name: 'کاوه' }, { id: 'd', name: 'دنیا' }],
      expenses: [{ id: 'e', amount: 400000, payer: 'a', shares: hkDongSplitEq(400000, ['a', 'b', 'c', 'd']) }, { id: 'f', amount: 120000, payer: 'b', shares: hkDongSplitEq(120000, ['a', 'b', 'c', 'd']) }], settles: [] };
    o.tr2 = hkDongTransfers(hkDongBalances(g2));
    o.sum2 = Object.values(hkDongBalances(g2)).reduce((t, v) => t + v, 0);
    return o;
  });
  ok(m.chain.length === 1 && m.chain[0].from === 'a' && m.chain[0].to === 'c' && m.chain[0].amount === 1000, '۱ به ۲ و ۲ به ۳ هزار تومان بدهکار ⇒ یک پرداخت: ۱ به ۳ هزار تومان');
  ok(m.split.x + m.split.y + m.split.z === 100000 && Math.max(m.split.x, m.split.y, m.split.z) - Math.min(m.split.x, m.split.y, m.split.z) <= 1, 'تقسیم مساوی به تومان درست؛ جمع سهم‌ها = مبلغ');
  ok(m.bal.a === -1000 && m.bal.b === 0 && m.bal.c === 1000 && m.tr.length === 1 && m.tr[0].from === 'a' && m.tr[0].to === 'c', 'از خرج‌ها: مانده‌ها و پرداخت مستقیم');
  ok(m.after.length === 0, 'بعد از «پرداخت شد» همه تسویه‌اند');
  ok(m.sum2 === 0 && m.tr2.length <= 3, 'چهار نفر: جمع مانده‌ها صفر، حداکثر سه پرداخت (' + m.tr2.length + ')');

  console.log('• منو و صفحه‌ها (۱.۳.۸۸: دُنگ، نام کاربر، نفرات ذخیره‌شده، تعداد نفر، پرداخت نشده/شد)');
  const ui = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    localStorage.setItem(STORAGE_KEY + '_dongPeople', JSON.stringify(['مریم']));
    const btn = [...document.querySelectorAll('#menuDropdown .hk-mg[data-g="sections"] .menu-item')].find(x => /دُنگ/.test(x.textContent));
    o.inMenu = !!btn;
    btn.click(); await w(200);
    o.open = !!document.getElementById('hkDong') && /دُنگ/.test(document.querySelector('#hkDong .hk-dg-t').textContent);
    o.empty = /هنوز گروهی/.test(document.querySelector('#hkDong').textContent);
    document.querySelector('#hkDong .hk-dg-new').click(); await w(150);
    const ed = document.getElementById('hkDongEd');
    o.meName = ed.querySelector('.hk-dg-chip').textContent.replace('×', '') === hkDongMe() && hkDongMe() !== 'من';
    const ins = ed.querySelectorAll('input.hk-dg-in');
    ins[0].value = 'سفر شمال';
    o.savedChip = !!ed.querySelector('.hk-dg-ppb') && ed.querySelector('.hk-dg-ppb').textContent === 'مریم';
    ed.querySelector('.hk-dg-ppx').click(); await w(50);
    o.savedRemoved = !ed.querySelector('.hk-dg-ppb') && hkDongPeople().indexOf('مریم') < 0;
    ins[1].focus();
    const add = n => { ins[1].value = n; ins[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); };
    add('سارا'); add('نیما'); add('سارا');
    o.keepFocus = document.activeElement === ins[1];
    o.dupErr = /این نام در گروه هست/.test(ed.querySelector('.sp-pick-err').textContent);
    o.chips = ed.querySelectorAll('.hk-dg-chip').length;
    const ab = ed.querySelector('.hk-dg-addb'), ai = ins[1];
    o.addFits = ab.scrollWidth <= ab.clientWidth + 1 && ab.getBoundingClientRect().left >= ed.querySelector('.hk-dg-box').getBoundingClientRect().left;
    ed.querySelector('.hk-dg-ok').click(); await w(150);
    o.groupView = /سفر شمال/.test(document.querySelector('#hkDong .hk-dg-t').textContent);
    o.peopleSaved = hkDongPeople().indexOf('سارا') >= 0 && hkDongPeople().indexOf('نیما') >= 0;
    /* خرج مساوی: کاربر ۳۰۰٬۰۰۰ بین هر سه نفر */
    document.querySelector('#hkDong .hk-dg-add').click(); await w(150);
    let e = document.getElementById('hkDongEd');
    e.querySelectorAll('input.hk-dg-in')[0].value = 'شام';
    const am = e.querySelector('.hk-dg-amt'); am.value = '300000'; am.dispatchEvent(new Event('input', { bubbles: true }));
    o.eqNote = e.querySelector('.hk-dg-note') ? e.querySelector('.hk-dg-note').textContent : '';
    o.amtDone = am.getAttribute('enterkeyhint') === 'done';
    e.querySelector('.hk-dg-ok').click(); await w(150);
    /* نامساوی با تعداد نفر: سارا ۹۰۰٬۰۰۰ — سارا ۱ نفر، نیما ۲ نفر */
    document.querySelector('#hkDong .hk-dg-add').click(); await w(150);
    e = document.getElementById('hkDongEd');
    e.querySelectorAll('input.hk-dg-in')[0].value = 'ویلا';
    const am2 = e.querySelector('.hk-dg-amt'); am2.value = '900000'; am2.dispatchEvent(new Event('input', { bubbles: true }));
    e.querySelectorAll('.hk-dg-chips')[0].querySelectorAll('.hk-dg-pick')[1].click();
    document.getElementById('hkDongEd').querySelectorAll('.hk-dg-chips')[1].querySelectorAll('.hk-dg-pick')[0].click();
    e.querySelector('.hk-dg-seg [data-v="uneq"]').click(); await w(50);
    const wn = e.querySelectorAll('.hk-dg-wn');
    o.noAmtInputs = !e.querySelector('.hk-dg-shin') && wn.length === 2;
    wn[1].value = '2'; wn[1].dispatchEvent(new Event('input', { bubbles: true })); await w(30);
    o.wv = [...e.querySelectorAll('.hk-dg-wv')].map(x => x.textContent);
    e.querySelector('.hk-dg-ok').click(); await w(150);
    o.saved = !document.getElementById('hkDongEd');
    const box = document.querySelector('#hkDong');
    o.bal = [...box.querySelectorAll('.hk-dg-bal .hk-dg-row')].map(r => r.textContent);
    o.hdr = [...box.querySelectorAll('.hk-dg-h')].map(x => x.textContent).join('|');
    o.pays = [...box.querySelectorAll('.hk-dg-pay')].map(r => r.textContent);
    o.defUnpaid = [...box.querySelectorAll('.hk-dg-paid')].every(b => !b.classList.contains('on') && b.textContent === 'پرداخت نشده');
    o.share = hkDongShareText(hkDongLoad().groups[0]);
    /* یک ضربه: پرداخت شد (بی تأیید)، ضربهٔ دوباره: پرداخت نشده */
    let confirmed = 0; const origAsk = window.askConfirm; window.askConfirm = () => { confirmed++; };
    document.querySelector('#hkDong .hk-dg-paid').click(); await w(100);
    const b1 = document.querySelector('#hkDong .hk-dg-paid');
    o.paid1 = b1.classList.contains('on') && b1.textContent === 'پرداخت شد' && confirmed === 0;
    o.noSettleRow = !document.querySelector('#hkDong .hk-dg-s');
    b1.click(); await w(100);
    o.unpaid2 = !document.querySelector('#hkDong .hk-dg-paid.on');
    document.querySelectorAll('#hkDong .hk-dg-paid').forEach(() => { const x = document.querySelector('#hkDong .hk-dg-paid:not(.on)'); if (x) x.click(); });
    await w(100);
    window.askConfirm = origAsk;
    o.allPaid = document.querySelectorAll('#hkDong .hk-dg-paid.on').length === 2 && [...document.querySelectorAll('#hkDong .hk-dg-bal b')].every(b => /تسویه/.test(b.textContent));
    o.noMain = !JSON.stringify(periodData).includes('سفر شمال');
    document.getElementById('hkDong')._hkCancel(); await w(80);
    o.backList = !!document.querySelector('#hkDong .hk-dg-card');
    document.getElementById('hkDong')._hkCancel(); await w(80);
    o.closed = !document.getElementById('hkDong');
    return o;
  });
  ok(ui.inMenu && ui.open && ui.empty, 'منو ← بخش‌ها ← «دُنگ» باز می‌شود');
  ok(ui.meName, 'عضو اول با نام کاربر (نه «من»)');
  ok(ui.savedChip && ui.savedRemoved, 'نفرات ذخیره‌شده بیضی آبی؛ × بالایش از فهرست پاک می‌کند');
  ok(ui.dupErr && ui.chips === 3 && ui.keepFocus && ui.addFits, 'افزودن نفر با Enter، صفحه‌کلید باز می‌ماند؛ نام تکراری نه؛ دکمهٔ افزودن جا می‌شود');
  ok(ui.groupView && ui.peopleSaved, 'با «ثبت» گروه ساخته و نفرات برای بعد ذخیره شدند');
  ok(/۱۰۰,۰۰۰/.test(ui.eqNote) && ui.amtDone, 'خرج مساوی: سهم هر نفر (' + ui.eqNote + ')');
  ok(ui.noAmtInputs && ui.wv.join('|') === '۳۰۰,۰۰۰|۶۰۰,۰۰۰' && ui.saved, 'نامساوی: تعداد نفرِ هر عضو، سهم به نسبت (' + ui.wv.join('|') + ')');
  ok(ui.bal.length === 3 && /طلبکار ۲۰۰,۰۰۰/.test(ui.bal[0]) && /طلبکار ۵۰۰,۰۰۰/.test(ui.bal[1]) && /بدهکار ۷۰۰,۰۰۰/.test(ui.bal[2]), 'وضعیت هر نفر (' + ui.bal.join(' | ') + ')');
  ok(/برای تسویه\|/.test(ui.hdr + '|') && !/\(/.test(ui.hdr), '«برای تسویه» بی پرانتز');
  ok(ui.pays.length === 2 && ui.defUnpaid, 'پرداخت‌ها پیش‌فرض نارنجی «پرداخت نشده» (' + ui.pays.join(' | ') + ')');
  ok(ui.paid1 && ui.noSettleRow && ui.unpaid2, 'یک ضربه = «پرداخت شد» سبز بی تأیید؛ جای دیگری تکرار نمی‌شود؛ ضربهٔ دوباره = برگشت');
  ok(ui.allPaid, 'همه پرداخت شد: وضعیت همه «تسویه»');
  ok(/دُنگ «سفر شمال»/.test(ui.share) && /خرج کل: ۱,۲۰۰,۰۰۰/.test(ui.share) && /برای تسویه:/.test(ui.share), 'متن اشتراک‌گذاری کامل');
  ok(ui.noMain, 'دُنگ جدا از حساب‌کتاب است');
  ok(ui.backList && ui.closed, 'بازگشت: از گروه به فهرست، سپس بستن');

  console.log('• پشتیبان');
  const bk = await page.evaluate(async () => {
    const o = {};
    o.exp = hkDongExport();
    const saved = JSON.stringify(o.exp);
    localStorage.removeItem(STORAGE_KEY + '_dong');
    hkDongRestore(JSON.parse(saved), 'merge');
    o.restored = hkDongLoad().groups.length === 1 && hkDongLoad().groups[0].name === 'سفر شمال';
    hkDongRestore(JSON.parse(saved), 'merge');
    o.noDup = hkDongLoad().groups.length === 1;
    return o;
  });
  ok(bk.exp && bk.exp.groups.length === 1 && bk.restored && bk.noDup, 'دنگ در پشتیبان می‌رود و بازیابی می‌شود (بدون تکرار)');

  console.log('• جدول: ضربه بدون نشانگر متن');
  await page.evaluate(async () => {
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان سنگک', amount: 30000, status: 'paid' })];
    persistCurrent(); renderAll(); openPersonDetail(t, 'expense'); await new Promise(r => setTimeout(r, 500));
  });
  const res = [];
  for (const sel of ['textarea.pd-desc', 'td:nth-child(2) input', 'input.pd-amt']) {
    await page.locator('.person-detail-box tbody tr').first().locator(sel).click();
    await page.waitForTimeout(150);
    res.push(await page.evaluate(s => { const el = document.querySelector('.person-detail-box tbody tr ' + s); return { focused: document.activeElement === el, caret: getComputedStyle(el).caretColor, pop: !!document.querySelector('.cell-text-popup') }; }, sel));
    await page.evaluate(() => { try { closeCellTextPopups(); } catch (e) {} });
  }
  ok(res.every(r => !r.focused && r.caret === 'rgba(0, 0, 0, 0)'), 'ضربه روی شرح/روز/مبلغ: خانه فوکوس نمی‌گیرد و نشانگر متن دیده نمی‌شود');
  ok(res[0].pop && res[2].pop, 'باکس شناور شرح و مبلغ همچنان باز می‌شود');

  console.log('• توضیح چندخطی، بانک جدول، باکس پیامک');
  const ex2 = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '3', desc: 'انتقال', amount: 500000, status: 'paid', p2p: true, account: 'ملت' }),
               Object.assign(emptyRow('expense'), { day: '4', desc: 'نان', amount: 30000, status: 'paid' })];
    persistCurrent(); closePersonDetail(); await w(200); openPersonDetail(t, 'expense'); await w(500);
    const trs = document.querySelectorAll('.person-detail-box tbody tr');
    trs[0].querySelector('td.pd-num-cell').click(); await w(150);
    const pp = document.querySelector('.cell-text-popup');
    const o = { wrap: pp && getComputedStyle(pp).whiteSpace === 'normal', lines: pp ? Math.round(pp.getBoundingClientRect().height / parseFloat(getComputedStyle(pp).lineHeight)) : 0 };
    try { closeCellTextPopups(); } catch (e) {}
    const acc = trs[1].querySelector('.pd-acc-btn');
    o.missing = acc.classList.contains('acc-missing') && acc.textContent.trim() === '—';
    acc.click(); await w(250);
    o.noMenu = !document.querySelector('.dark-select-list.open');
    closePersonDetail(); await w(200);
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت ۶۱۶۳', openingBalance: 5000000, createdAt: { y: 1405, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection(); smsAccountBankMap['L4:6292'] = 'ملت ۶۱۶۳'; saveSmsAccountBankMap();
    enqueueBankSms('کارت6292\nبرداشت300,000\nمانده6,684,526\n05/08/12-10:02', 'Bank Mellat'); await w(1200);
    const sel = document.getElementById('smsConfirmBank'), wr = sel.parentNode.classList.contains('fancy-select-wrap') ? sel.parentNode : sel;
    o.bankShow = (document.getElementById('smsBankShow') || {}).textContent || '';
    o.selHidden = getComputedStyle(wr).display === 'none' && sel.value === 'ملت ۶۱۶۳';
    o.rowAcct = getComputedStyle(document.querySelector('#smsConfirmMeta .sms-pro-block')).display === 'flex';
    try { closeSmsConfirmModal('reject'); } catch (e) {} await w(400);
    enqueueBankSms('کارت1111\nبرداشت45,000\nمانده1,000,000\n05/08/12-10:07', 'Bank Mellat'); await w(1200);
    const ni = document.getElementById('smsNewAccName');
    o.newBox = !!ni && ni.value === 'ملت ۱۱۱۱' && !!document.getElementById('smsPickExisting');
    document.getElementById('smsConfirmDesc').value = 'نانوایی';
    confirmSmsEntry(); await w(900);
    o.created = selectedAccountLabels().indexOf('ملت ۱۱۱۱') >= 0 && smsAccountBankMap['L4:1111'] === 'ملت ۱۱۱۱';
    enqueueBankSms('کارت1111\nبرداشت20,000\nمانده980,000\n05/08/12-11:00', 'Bank Mellat'); await w(1200);
    o.second = ((document.getElementById('smsBankShow') || {}).textContent || '') === 'ملت ۱۱۱۱' && !document.getElementById('smsNewAccName');
    try { closeSmsConfirmModal('reject'); } catch (e) {} await w(400);
    enqueueBankSms('کارت2222\nبرداشت10,000\nمانده500,000\n05/08/12-11:30', 'Bank Mellat'); await w(1200);
    document.getElementById('smsPickExisting').click(); await w(100);
    const sel2 = document.getElementById('smsConfirmBank'), wr2 = sel2.parentNode.classList.contains('fancy-select-wrap') ? sel2.parentNode : sel2;
    o.pickExisting = getComputedStyle(wr2).display !== 'none' && !document.getElementById('smsNewAccName');
    try { closeSmsConfirmModal('reject'); } catch (e) {}
    return o;
  });
  ok(ex2.wrap && ex2.lines >= 2, 'توضیح جیب به جیب چندخطی (' + ex2.lines + ' خط)');
  ok(ex2.missing && ex2.noMenu, 'بانک واردنشده: قاب زرد؛ ضربه منوی بانک باز نمی‌کند (فقط لانگ‌پرس ← ویرایش)');
  ok(ex2.bankShow === 'ملت ۶۱۶۳' && ex2.selHidden && ex2.rowAcct, 'باکس پیامک: نام بانک فقط نمایش (بی منو)؛ «حساب» در یک ردیف');
ok(ex2.newBox && ex2.created, 'بار اول از یک کارت: باکس «حساب جدید» با نام پیشنهادی؛ با «ثبت» حساب ساخته و وصل شد');
  ok(ex2.second, 'پیامک بعدی همان کارت: فقط نام حساب');
  ok(ex2.pickExisting, '«این حساب را قبلاً ساخته‌اید؟»: انتخاب از حساب‌ها');

  console.log('• ماهی که گذشت و هشدار تکراری');
  const rc = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [
      Object.assign(emptyRow('expense'), { day: '10', desc: 'قسط', amount: 1850000, status: 'paid', account: 'ملت', time: '09:05' }),
      Object.assign(emptyRow('expense'), { day: '10', desc: 'قسط', amount: 1850000, status: 'paid', account: 'ملت', time: '09:06' }),
      Object.assign(emptyRow('expense'), { day: '12', desc: 'قسط', amount: 2400000, status: 'paid', account: 'ملی', time: '10:00' }),
      Object.assign(emptyRow('expense'), { day: '12', desc: 'قسط', amount: 2400000, status: 'paid', account: 'ملی', time: '10:01' }),
      Object.assign(emptyRow('expense'), { day: '14', desc: 'قسط', amount: 900000, status: 'paid', account: 'ملت', instTag: 'وام الف · ۳' }),
      Object.assign(emptyRow('expense'), { day: '14', desc: 'قسط', amount: 900000, status: 'paid', account: 'ملت', instTag: 'وام ب · ۷' })];
    persistCurrent(); renderAll(); await w(500);
    const D = HKAlerts.duplicates(t);
    o.n = D.length; o.texts = D.map(x => x.text);
    const html = spPageWarn({ alerts: HKAlerts.forCard(t) });
    o.btns = (html.match(/data-act="dismiss" data-dup-id=/g) || []).length;
    const origAsk = window.askConfirm; window.askConfirm = (m, y) => y();
    spDismissDupPrompt(t, D[1].id); window.askConfirm = origAsk;
    o.left = HKAlerts.duplicates(t).map(x => x.id);
    o.keptFirst = o.left.length === 1 && o.left[0] === D[0].id;
    /* شرح عوض شود: «تکراری نیست» باید بماند */
    ex.rows[2].desc = 'قسط وام ماشین'; ex.rows[3].desc = 'قسط وام ماشین'; persistCurrent();
    o.stillGone = HKAlerts.duplicates(t).length === 1;
    o.allBtn = /data-dup-id="__all__"/.test(html);
    window.askConfirm = (m, y) => y(); spDismissDupPrompt(t, '__all__'); window.askConfirm = origAsk;
    renderAll(); await w(300);
    o.noneLeft = HKAlerts.duplicates(t).length === 0 && !document.querySelector('.sp-tip[data-dup]');
    ex.rows = [Object.assign(emptyRow('expense'), { day: '3', desc: 'نان', amount: 250000, status: 'paid' })]; persistCurrent(); renderAll();
    openMonthRecap(currentYear, currentMonth); await w(500);
    const b = document.querySelector('.hk-rc-row b');
    o.dir = b ? getComputedStyle(b).direction : 'none:' + !!document.querySelector('.hk-rc-box');
    o.firstIsAmt = b ? /^[۰-۹0-9]/.test(b.textContent.trim()) && /تومان$/.test(b.textContent.trim()) : false;
    try { document.querySelector('.hk-rc-x').click(); } catch (e) {}
    return o;
  });
  ok(rc.n === 2 && rc.texts[0] !== rc.texts[1] && /ملت/.test(rc.texts[0]) && /۱۰ /.test(rc.texts[0]), 'هشدار تکراری با مبلغ، بانک و روز؛ دو قسط کارت‌های جدا تکراری نیست (' + rc.texts.join(' | ') + ')');
  ok(rc.stillGone && rc.allBtn && rc.noneLeft, '«تکراری نیست» با هر شرحی (حتی بعد از تغییر شرح) ماندگار؛ «هیچ‌کدام تکراری نیست» اسلاید را برمی‌دارد');
  ok(rc.btns >= 2 && rc.keptFirst, 'هر مورد «تکراری نیست» خودش را دارد و فقط همان برداشته می‌شود');
  ok(rc.dir === 'rtl' && rc.firstIsAmt, '«ماهی که گذشت»: «تومان» بعد از مبلغ');

  console.log('• معوق دیده‌شده، آیکون اولویت دسته‌ها، دستهٔ تازه در ویرایش ردیف');
  const z = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    /* کارت قسط با معوق */
    const st = hkInstLoad(); st.cards['2979'] = { id: '2979', bank: 'بانک مسکن', name: 'وام مسکن', seq: 1, at: Date.now(), log: [{ y: 1405, m: 8, d: 6, time: '09:05', amount: 1850000, count: 36, overdue: 1850000, penalty: 0, at: Date.now() }] };
    hkInstSave(st);
    const c = hkInstLoad().cards['2979'];
    o.alert0 = hkInstAlert(c);
    const h0 = spPageInst();
    o.ring0 = /hk-snake/.test(h0) && /hk-inst-dot/.test(h0);
    hkOpenInstHistory('2979'); await w(200);
    const ov = document.getElementById('hkInstOv'); if (ov) ov.remove();
    const h1 = spPageInst();
    o.ring1 = /hk-snake|hk-inst-dot/.test(h1);
    o.label1 = /hk-inst-bad/.test(h1) && /معوق/.test(h1);
    /* پیامک تازه با معوق بیشتر: دوباره هشدار */
    const st2 = hkInstLoad(); st2.cards['2979'].log.push({ y: 1405, m: 9, d: 6, time: '09:00', amount: 0, count: 36, overdue: 3700000, penalty: 50000, at: Date.now() + 1 }); hkInstSave(st2);
    o.alert2 = hkInstAlert(hkInstLoad().cards['2979']);
    /* اولویت دسته‌ها: آیکون */
    openCatPriority(); await w(200);
    const pm = document.getElementById('hkCatPriModal');
    o.priIcons = pm ? pm.querySelectorAll('.hk-pri-row .hk-pri-ci svg, .hk-pri-row .hk-pri-ci img').length : -1;
    o.priRows = pm ? pm.querySelectorAll('.hk-pri-row').length : -1;
    if (pm) pm.remove();
    /* ویرایش ردیف درآمد: دستهٔ تازه */
    const t = hkMainTitle(), inc = periodData.income.sections.find(q => q.title === t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '2', desc: 'کار آزاد', amount: 4000000, status: 'paid' })]; persistCurrent();
    hkOpenRowEdit({ row: inc.rows[0], tab: 'income', title: t, sec: inc, num: 1, onSaved: function () {} }); await w(400);
    [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).click(); await w(250);
    const add = document.querySelector('#hkCatPick .hk-cp-add');
    o.addTile = !!add;
    add.click(); await w(80);
    const inp = document.querySelector('#hkCatPick .sp-pick-new input');
    inp.value = 'حقوق'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    o.dupMsg = /دسته‌ای با این اسم/.test(document.querySelector('#hkCatPick .sp-pick-err').textContent);
    inp.value = 'تدریس خصوصی'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(200);
    o.styleOpen = !!document.getElementById('hkCatStyle') && !document.getElementById('hkCatPick');
    document.querySelector('#hkCatStyle .hk-cst-ok').click(); await w(150);
    o.catBtn = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent)).textContent;
    const nc = HK_INCOME_CATS.find(x => x.label === 'تدریس خصوصی');
    o.stored = !!nc && /^in_u_/.test(nc.id) && hkInCustomLoad().some(x => x.id === nc.id);
    o.inBackup = (HKCategorizer.exportData().inCustom || []).some(x => x.label === 'تدریس خصوصی');
    o.hasColor = nc && hkCatColor(nc.id) !== '#08b5f5';
    document.querySelector('#hkRowEdit .hk-re-no').click(); await w(200);
    return o;
  });
  ok(z.alert0 && z.ring0, 'کارت قسط معوق: دایرهٔ قرمز و نوار چرخان');
  ok(!z.ring1 && z.label1, 'بعد از باز کردن کارت: دایره و نوار چرخان رفت، برچسب قرمز «معوق» ماند');
  ok(z.alert2, 'پیامک تازه با معوق: دوباره هشدار');
  ok(z.priRows > 0 && z.priIcons === z.priRows, 'اولویت دسته‌ها: آیکون هر دسته (' + z.priIcons + '/' + z.priRows + ')');
  ok(z.addTile && z.dupMsg && z.styleOpen, 'ویرایش ردیف درآمد: «دستهٔ جدید» در انتخاب دسته؛ اسم تکراری پذیرفته نمی‌شود؛ بعد آیکون و رنگ');
  ok(/تدریس خصوصی/.test(z.catBtn) && z.stored && z.inBackup && z.hasColor, 'دستهٔ تازه روی همان ردیف نشست، ذخیره و در پشتیبان است (' + z.catBtn + ')');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
