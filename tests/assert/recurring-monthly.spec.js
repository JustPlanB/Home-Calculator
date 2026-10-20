// درآمد ثابت ماه‌به‌ماه: ساخت فقط از ماه جاری به بعد، پایان اختیاری، اتصال واریز موجود، قواعد ویرایش و حذف،
// تطبیق پیامک واریز، مهاجرت تعریف‌های قدیمی؛ و اسلاید «مقایسه با ماه قبل» با چهار لوله در یک کادر.
// فقط دادهٔ مصنوعی در پروفایل تازه؛ «امروز» با ساعت ساختگی Playwright تنظیم می‌شود.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

/* تاریخ‌های میلادیِ متناظر با روزهای شمسی ۱۴۰۵ (ظهر تهران) */
const G = {
  '1405-07-20': '2026-10-12T09:00:00Z', '1405-07-28': '2026-10-20T09:00:00Z', '1405-08-02': '2026-10-24T09:00:00Z',
  '1405-09-03': '2026-11-24T09:00:00Z', '1405-11-02': '2027-01-22T09:00:00Z'
};
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (seed) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
    await ctx.addInitScript((sd) => {
      localStorage.setItem('hesabKetabArchive_v5_tourDone', '1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1');
      localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone', '1'); localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
      /* زمان در این آزمون عقب و جلو می‌رود؛ پیشنهاد یک‌بارهٔ پاک‌سازی فقط در آزمون «تعریف قدیمی» سنجیده می‌شود */
      if (!sd) localStorage.setItem('hesabKetabArchive_v5_recCleanupAsked', '1');
      if (sd && !sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(sd).forEach(k => localStorage.setItem(k, sd[k])); }
    }, seed || null);
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.clock.setFixedTime(new Date(G['1405-07-20']));
    await p.goto(INDEX); await p.waitForTimeout(1500);
    return { ctx, p };
  };
  const setToday = async (p, k) => { await p.clock.setFixedTime(new Date(G[k])); };

  const A = await open();
  const p = A.p;
  /* داده: دو بخش درآمد، یک واریز ثبت‌شده در مهر، و ماه شهریور در آرشیو */
  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    const t = getTodayPersian();
    currentYear = t.y; currentMonth = t.m; loadCurrent();
    periodData.income.sections = [
      { id: 's1', title: 'اجاره', collapsed: false, rows: [Object.assign(emptyRow('income'), { day: '12', desc: 'واریز بانکی', amount: 10000000, status: 'paid', account: ACC })] },
      { id: 's2', title: 'حقوق', collapsed: false, rows: [emptyRow('income')] }
    ];
    periodData.income.nextId = 3;
    persistCurrent();
    archive[periodKey(1405, 6)] = { expense: { sections: [], nextId: 1 }, income: { sections: [{ id: 's1', title: 'اجاره', rows: [emptyRow('income')] }, { id: 's2', title: 'حقوق', rows: [emptyRow('income')] }], nextId: 3 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} };
    saveArchive();
  }, ACC);
  const today = await p.evaluate(() => getTodayPersian());
  ok(today.y === 1405 && today.m === 7 && today.d === 20, 'ساعت ساختگی: امروز ۲۰ مهر ۱۴۰۵');

  /* ساخت با شیت (همان دکمهٔ تأیید) */
  const create = async (ex) => p.evaluate(async (ex) => {
    openRecurringSheet(-1, ex);
    await new Promise(r => setTimeout(r, 120));
    const chk = document.getElementById('recHasEnd');
    if (chk && chk.checked !== !!ex.contractEnd) { chk.checked = !!ex.contractEnd; chk.onchange(); }
    const ds = document.querySelectorAll('#recurringSheet .dark-select');
    const sec = ds[ds.length - 2], acc = ds[ds.length - 1];
    if (ex.sectionId) sec.setValue(ex.sectionId);
    acc.setValue(ex.account || '');
    const keyField = !!document.getElementById('recSmsKey');
    [...document.querySelectorAll('#recurringSheet button')].find(x => x.textContent.trim() === 'تأیید').click();
    await new Promise(r => setTimeout(r, 200));
    /* پنجرهٔ «واریز مشابه … مربوط به همین قرارداد است؟» */
    let picker = null;
    const pm = document.getElementById('recPickModal');
    if (pm) {
      const opts = [...pm.querySelectorAll('.rec-pick-opt')];
      picker = { title: pm.textContent, opts: opts.map(o => o.textContent) };
      opts[ex.pick == null ? opts.length - 1 : ex.pick].click();
      await new Promise(r => setTimeout(r, 200));
    }
    return { toast: (document.querySelector('.toast, #toast') || {}).textContent || '', picker, keyField, sheetOpen: !!document.getElementById('recurringSheet') };
  }, ex);
  const rowsOf = (name) => p.evaluate((name) => {
    const it = recurringIncomes.find(r => r.name === name);
    return recRowsOf(it).map(x => ({ key: x.key, status: x.row.status, amount: x.row.amount, day: x.row.day, sec: x.sec.title, desc: x.row.desc }));
  }, name);
  const futureKeys = () => p.evaluate(() => Object.keys(archive).filter(k => { const [y, m] = k.split('-').map(Number); return y * 100 + m > recTodayKey(); }));

  console.log('• ساخت: بخش مقصد اجباری؛ شروع در گذشته → فقط از ماه جاری؛ واریز مشابه فقط با انتخاب کاربر وصل می‌شود');
  const c0 = await create({ name: 'بی‌بخش', amount: 1000, account: ACC, contractStart: { d: 12, m: 7, y: 1405 }, contractEnd: null });
  /* ۱.۳.۴۶ تک‌کاربره: منوی بخش مقصد حذف شد؛ درآمد ثابت خودش روی کارت اصلی می‌رود */
  ok(!c0.sheetOpen && await p.evaluate(() => { const it = recurringIncomes.find(r => r.name === 'بی‌بخش'); return !!it && it.sectionTitle === hkMainTitle(); }), 'بی منوی بخش مقصد: درآمد ثابت روی کارت اصلی ذخیره شد');
  await p.evaluate(() => {
    const it = recurringIncomes.find(r => r.name === 'بی‌بخش'); if (!it) return;
    recEachMonth((k, pd) => ['income', 'expense'].forEach(t => ((pd[t] || {}).sections || []).forEach(s => { s.rows = (s.rows || []).filter(x => x.fromRecurringId !== it.id); })));
    recurringIncomes.splice(recurringIncomes.indexOf(it), 1); saveRecurring(); persistCurrent(); saveArchive(); renderAll();
  });
  const cB = await create({ name: 'اجاره ب', amount: 10100000, account: ACC, sectionId: 's1', contractStart: { d: 14, m: 7, y: 1405 }, contractEnd: null, pick: null });
  let r = await rowsOf('اجاره ب');
  ok(cB.picker && /مربوط به همین قرارداد است/.test(cB.picker.title) && /هیچ‌کدام/.test(cB.picker.opts[cB.picker.opts.length - 1]) && /۱۲ مهر/.test(cB.picker.opts[0]), 'واریز مشابه ۱۲ مهر: خودکار وصل نشد؛ پرسید (واریز اول فهرست، «هیچ‌کدام» آخر)');
  ok(cB.keyField === false, 'فیلد «نشانهٔ پیامک» از فرم حذف شد');
  ok(r.length === 1 && r[0].status === 'unpaid' && r[0].day === '14', '«هیچ‌کدام»: ردیف «دریافت نشده» ساخته شد و واریز اجارهٔ دیگر دست نخورد');
  const c1 = await create({ name: 'اجاره', amount: 10200000, account: ACC, sectionId: 's1', contractStart: { d: 12, m: 1, y: 1405 }, contractEnd: null, pick: 0 });
  r = await rowsOf('اجاره');
  ok(r.length === 1 && r[0].key === 140507 && r[0].status === 'paid' && r[0].amount === 10000000, 'با انتخاب کاربر، واریز ۱۲ مهر اجارهٔ این ماه شد و ردیف تازه ساخته نشد');
  ok(/وصل شد/.test(c1.toast), 'پیام «واریز … به «اجاره» وصل شد»');
  const st1 = await p.evaluate(async () => {
    openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 400));
    const t = document.getElementById('recurringBox').textContent; closeFeatureSheet(); await new Promise(r => setTimeout(r, 200));
    return { kind: recTodayState(recurringIncomes.find(r => r.name === 'اجاره')).kind, list: t, tag: (() => { const tr = document.createElement('table'); const it = recurringIncomes.find(r => r.name === 'اجاره'); const row = recRowsOf(it)[0].row; const el = buildRowEl('s1', row, 0, 'دریافت شده', 'دریافت نشده'); return !!el.querySelector('.rec-row-tag') && el.querySelector('.rec-row-tag').textContent; })() };
  });
  ok(st1.kind === 'linked' && st1.list.includes('این ماه: دریافت شد (۱۲ مهر)') && !/وصل به واریز/.test(st1.list) && /اصلاح/.test(st1.list) && !/جدا کن|جابه‌جایی/.test(st1.list), 'فهرست: «این ماه: دریافت شد (۱۲ مهر)» به رنگ سبز با دکمهٔ «اصلاح»');
 ok(st1.list.includes('این ماه: دریافت نشده (۱۴ مهر)'), 'خط وضعیت برای «اجاره ب»: «این ماه: دریافت نشده (۱۴ مهر)»');
  ok(st1.tag === 'درآمد ثابت: اجاره', 'ردیف واریزِ وصل‌شده در جدول برچسب «درآمد ثابت: اجاره» دارد');
  ok(await p.evaluate(() => (archive[periodKey(1405, 6)].income.sections || []).every(s => s.rows.every(r => !r.fromRecurringId))), 'شهریور (گذشته) هیچ ردیفی نگرفت');
  ok(await p.evaluate(() => { const e = recurringIncomes.find(r => r.name === 'اجاره').contractEnd; return !!e && e.y === 1406 && e.m === 1 && e.d === 12; }), 'پایان قرارداد اجباری: پیش‌فرض یک سال بعد از شروع (۱۲ فروردین ۱۴۰۶)');
  ok(await p.evaluate(() => { openRecurringSheet(-1, {}); const ok = !document.getElementById('recHasEnd') && !!document.querySelector('#recurringSheet .rec-end-lab') && getComputedStyle(document.getElementById('recEndDate')).display !== 'none'; [...document.querySelectorAll('#recurringSheet button')].find(x => x.textContent.trim() === 'انصراف').click(); return ok; }), 'فرم: تیک «اختیاری» حذف شد و تاریخ پایان همیشه دیده می‌شود');
  ok((await futureKeys()).length === 0, 'هیچ ماه آینده‌ای پیشاپیش ساخته نشد');

  console.log('• شروع در آینده و قرارداد با پایان');
  await create({ name: 'حقوق', amount: 50000000, account: ACC, sectionId: 's2', contractStart: { d: 5, m: 9, y: 1405 }, contractEnd: null });
  ok((await rowsOf('حقوق')).length === 0, 'شروع آذر: در مهر ردیفی ساخته نشد');
  await create({ name: 'قرارداد کوتاه', amount: 1000000, account: ACC, sectionId: 's2', contractStart: { d: 10, m: 7, y: 1405 }, contractEnd: { d: 10, m: 8, y: 1405 } });
  r = await rowsOf('قرارداد کوتاه');
  ok(r.length === 1 && r[0].key === 140507 && r[0].status === 'unpaid' && r[0].day === '10', 'قرارداد مهر تا آبان: ردیف مهر «دریافت نشده» روز ۱۰');

  await setToday(p, '1405-08-02');
  await p.evaluate(() => ensureRecurringRows());
  ok((await rowsOf('حقوق')).length === 0 && (await rowsOf('قرارداد کوتاه')).map(x => x.key).join() === '140507,140508', 'آبان رسید: قرارداد کوتاه ردیف آبان گرفت؛ حقوق هنوز نه');
  await setToday(p, '1405-09-03');
  await p.evaluate(() => ensureRecurringRows());
  r = await rowsOf('حقوق');
  ok(r.length === 1 && r[0].key === 140509 && r[0].day === '5' && r[0].status === 'unpaid', 'آذر رسید: ردیف حقوق روز ۵ «دریافت نشده»');
  ok((await rowsOf('قرارداد کوتاه')).length === 2, 'بعد از پایان قرارداد (آبان) ردیف آذر ساخته نشد');
  await setToday(p, '1405-11-02');
  await p.evaluate(() => ensureRecurringRows());
  ok((await rowsOf('حقوق')).map(x => x.key).join() === '140509,140510,140511', 'بازشدن بعد از دو ماه: دی و بهمن جبران شدند (تا ماه جاری، نه جلوتر)');
  ok((await rowsOf('اجاره')).map(x => x.key).join() === '140507,140508,140509,140510,140511', 'اجارهٔ بی‌پایان هر ماه ادامه یافت');
  await p.evaluate(() => ensureRecurringRows());
  ok((await rowsOf('اجاره')).length === 5, 'اجرای دوباره ردیف تکراری نمی‌سازد');
  await setToday(p, '1405-07-20');

  console.log('• ویرایش: «از این ماه / از ماه بعد»، دریافت‌شده دست نمی‌خورد');
  await create({ name: 'پاره‌وقت', amount: 2000000, account: ACC, sectionId: 's2', contractStart: { d: 15, m: 7, y: 1405 }, contractEnd: null });
  const edit = async (name, patch, answers) => p.evaluate(async ({ name, patch, answers }) => {
    const i = recurringIncomes.findIndex(r => r.name === name);
    openRecurringSheet(i, Object.assign({}, recurringIncomes[i], patch));
    await new Promise(r => setTimeout(r, 120));
    [...document.querySelectorAll('#recurringSheet button')].find(x => x.textContent.trim() === 'تأیید').click();
    const asked = [];
    for (const a of answers) {
      await new Promise(r => setTimeout(r, 150));
      const m = document.getElementById('confirmModal');
      if (!m.classList.contains('open')) break;
      asked.push(document.getElementById('confirmMsg').textContent + ' [' + document.getElementById('confirmYes').textContent + '/' + document.getElementById('confirmNo').textContent + ']');
      document.getElementById(a ? 'confirmYes' : 'confirmNo').click();
    }
    await new Promise(r => setTimeout(r, 200));
    return { asked, open: document.getElementById('confirmModal').classList.contains('open'), def: recurringIncomes.find(r => r.name === (patch.name || name)) };
  }, { name, patch, answers });
  let e = await edit('پاره‌وقت', { amount: 2500000 }, [false]);
  r = await rowsOf('پاره‌وقت');
  ok(e.asked.length === 1 && /از این ماه\/از ماه بعد/.test(e.asked[0]), 'تغییر مبلغ: پرسیده شد «از این ماه / از ماه بعد»');
  ok(r[0].amount === 2000000 && e.def.amount === 2500000, '«از ماه بعد»: ردیف مهر همان ۲٬۰۰۰٬۰۰۰ ماند، تعریف ۲٬۵۰۰٬۰۰۰ شد');
  e = await edit('پاره‌وقت', { amount: 3000000 }, [true]);
  ok((await rowsOf('پاره‌وقت'))[0].amount === 3000000, '«از این ماه»: ردیف دریافت‌نشدهٔ مهر ۳٬۰۰۰٬۰۰۰ شد');
  await p.evaluate(() => { const it = recurringIncomes.find(r => r.name === 'پاره‌وقت'); recRowsOf(it)[0].row.status = 'paid'; });
  e = await edit('پاره‌وقت', { amount: 3500000 }, [true]);
  r = await rowsOf('پاره‌وقت');
  ok(e.asked.length === 0 && r[0].amount === 3000000 && r[0].status === 'paid', 'مهر دریافت شده: سؤالی نیامد، ردیف دریافت‌شده دست نخورد (از ماه بعد)');
  e = await edit('قرارداد کوتاه', { name: 'قرارداد کوتاه ۲', day: 18, contractStart: { d: 18, m: 7, y: 1405 }, account: ACC }, [true]);
  r = await rowsOf('قرارداد کوتاه ۲');
  ok(r.find(x => x.key === 140507).desc === 'قرارداد کوتاه ۲' && r.find(x => x.key === 140507).day === '18', 'نام و روز روی ردیف دریافت‌نشدهٔ این ماه اعمال شد (پیوند با شناسه، نه نام)');
  ok(r.find(x => x.key === 140508).desc === 'قرارداد کوتاه ۲', 'ردیف دریافت‌نشدهٔ ماه بعد هم تعریف تازه را گرفت');
  e = await edit('قرارداد کوتاه ۲', { contractEnd: { d: 18, m: 7, y: 1405 } }, [true]);
  r = await rowsOf('قرارداد کوتاه ۲');
  ok(e.asked.some(q => /بعد از پایان تازه/.test(q)) && r.map(x => x.key).join() === '140507', 'کوتاه‌کردن پایان: با تأیید، ردیف دریافت‌نشدهٔ بعد از پایان پاک شد');
  /* ردیف دریافت‌نشدهٔ گذشته فقط با پرسش */
  await p.evaluate(() => {
    const it = recurringIncomes.find(r => r.name === 'اجاره');
    const pd = archive[periodKey(1405, 6)];
    pd.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '12', desc: 'اجاره', amount: 10200000, status: 'unpaid', account: 'ملت مصنوعی', fromRecurringId: it.id })];
  });
  e = await edit('اجاره', { amount: 11000000 }, [false]);
  ok(e.asked.some(q => /ماه‌های قبل/.test(q)) && await p.evaluate(() => archive[periodKey(1405, 6)].income.sections[0].rows[0].amount) === 10200000, 'مبلغ ردیف دریافت‌نشدهٔ گذشته فقط با «بله» عوض می‌شود (این‌جا «نه»)');

  console.log('• حذف: گذشته و دریافت‌شده می‌مانند؛ دربارهٔ دریافت‌نشده‌های این ماه به بعد پرسیده می‌شود');
  const del = await p.evaluate(async () => {
    const it = recurringIncomes.find(r => r.name === 'اجاره');
    /* ردیف دریافت‌شدهٔ گذشته + ردیف دریافت‌نشدهٔ این ماه */
    archive[periodKey(1405, 6)].income.sections[0].rows[0].status = 'paid';
    /* یک ردیف «دریافت نشده» در آبان (آینده) برای سنجش پاک شدن دریافت‌نشده‌ها؛ واریز ۱۲ مهر دریافت‌شده می‌ماند */
    const pdA = recMonthData(140508, true); const secA = recSectionIn(pdA, it, true);
    if (!recRowsOf(it).some(x => x.key === 140508)) recPlaceRow(secA, recNewRow(it, 140508));
    openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 400));
    if (document.getElementById('confirmModal').classList.contains('open')) document.getElementById('confirmNo').click();
    await new Promise(r => setTimeout(r, 150));
    const idx = recurringIncomes.indexOf(it);
    document.querySelector('[data-rd="' + idx + '"]').click();
    await new Promise(r => setTimeout(r, 150));
    /* از ۱.۳.۲۴: یک پنجره با «حذف با ردیف‌ها / حذف بدون ردیف‌ها»؛ «بدون ردیف‌ها» = ردیف‌ها می‌مانند و ردیف معمولی می‌شوند */
    const q1 = (document.querySelector('#hkAsk3 .hk-ask3-txt') || {}).textContent || '';
    const q2 = [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].map(x => x.textContent).join('|');
    { const kb = [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].find(x => x.textContent === 'حذف بدون ردیف‌ها'); if (kb) kb.click(); }
    await new Promise(r => setTimeout(r, 250));
    let left = [];
    let stillLinked = 0;
    recEachMonth((k, pd) => (pd.income.sections || []).forEach(s => s.rows.forEach(r => {
      if (r.fromRecurringId === it.id) stillLinked++;
      if ((r.desc === 'اجاره' || r.desc === 'واریز بانکی') && Number(r.amount) > 0) left.push(k + ':' + r.status);
    })));
    left.stillLinked = stillLinked;
    return { q1, q2, gone: !recurringIncomes.includes(it), left, stillLinked: left.stillLinked, trash: (typeof trashItems !== 'undefined' ? trashItems : JSON.parse(localStorage.getItem('hesabKetabArchive_v5_trash') || '[]')).some(t => t.type === 'recurring' && (t.title === 'اجاره' || (t.data && t.data.name === 'اجاره'))) };
  });
  ok(del.gone && /^درآمد ثابت «اجاره» حذف شود؟$/.test(del.q1) && del.q2 === 'حذف با ردیف‌ها|حذف بدون ردیف‌ها', 'پنجرهٔ تأیید حذف: ' + del.q1 + ' (' + del.q2 + ')');
  ok(del.left.includes('140506:paid') && del.left.includes('140507:paid'), '«حذف بدون ردیف‌ها»: ردیف‌ها (شهریور و واریز ۱۲ مهر) ماندند (' + del.left.join('، ') + ')');
  ok(del.stillLinked === 0, 'ردیف‌های باقی‌مانده از قرارداد حذف‌شده آزاد شدند (به هیچ قراردادی وصل نیستند)');
  ok(del.trash, 'تعریف به سطل بازیافت رفت');
  await p.evaluate(() => closeFeatureSheet && closeFeatureSheet());
  /* قرارداد تازه: واریز آزادشدهٔ ۱۲ مهر دوباره پیشنهاد می‌شود */
  const cN = await create({ name: 'اجاره نو', amount: 10000000, account: ACC, sectionId: 's1', contractStart: { d: 12, m: 7, y: 1405 }, contractEnd: null, pick: 0 });
  r = await rowsOf('اجاره نو');
  ok(cN.picker && /۱۲ مهر/.test(cN.picker.opts[0]) && r.length === 1 && r[0].status === 'paid' && r[0].amount === 10000000, 'قرارداد تازه: واریز ۱۲ مهرِ قرارداد حذف‌شده پیشنهاد شد و وصل شد');
  /* واریز وصل به قرارداد موجود پیشنهاد نمی‌شود */
  const cX = await create({ name: 'اجاره سوم‌نو', amount: 10000000, account: ACC, sectionId: 's1', contractStart: { d: 12, m: 7, y: 1405 }, contractEnd: null });
  ok(!cX.picker || !/۱۲ مهر — ۱۰,۰۰۰,۰۰۰/.test(cX.picker.opts.join('|')), 'واریزی که به قرارداد موجود وصل است دیگر پیشنهاد نمی‌شود');
  /* «اصلاح» روی ردیف «دریافت نشده»: وصل کردن واریز ثبت‌شده با هر روزی از ماه */
  const lk = await p.evaluate(async (ACC) => {
    /* ۱.۳.۴۶ تک‌کاربره: یک بخش */ periodData.income.sections[periodData.income.sections.length - 1].rows.push(Object.assign(emptyRow('income'), { day: '27', desc: 'واریز دستی', amount: 10000000, status: 'paid', account: ACC }));
    persistCurrent();
    openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 400));
    const i = recurringIncomes.findIndex(r => r.name === 'اجاره سوم‌نو');
    const b = document.querySelector('[data-rec-link="' + i + '"]'); if (!b) return { btn: false };
    b.click(); await new Promise(r => setTimeout(r, 150));
    const opts = [...document.querySelectorAll('#recPickModal .rec-pick-opt')];
    const o = opts.find(x => /۲۷ مهر/.test(x.textContent)); if (o) o.click();
    await new Promise(r => setTimeout(r, 300));
    const it = recurringIncomes[i]; const rows = recRowsOf(it).map(x => x.row.status + ':' + x.row.day);
    closeFeatureSheet(); await new Promise(r => setTimeout(r, 200));
    return { btn: true, found: !!o, rows };
  }, ACC);
  ok(lk.btn && lk.found && lk.rows.join() === 'paid:27', '«اصلاح» زیر «دریافت نشده»: واریز دستی ۲۷ مهر وصل شد و ردیف دریافت‌نشده حذف شد');

  console.log('• پیامک واریز: پیشنهاد خودکار، پیش‌واریز، چند گزینه');
  await create({ name: 'اجارهٔ دوم', amount: 7000000, account: ACC, sectionId: 's1', contractStart: { d: 1, m: 7, y: 1405 }, contractEnd: null });
  const sms = async (amount, d, m, extra) => p.evaluate(async ({ amount, d, m, ACC, extra }) => {
    const raw = 'بانک ملت\nواریز ' + amount + '\nحساب 0000***1111' + (extra ? '\n' + extra : '');
    pendingSmsEntry = { raw, amount, type: 'income', bank: ACC, day: String(d), month: m, year: 1405 };
    openSmsConfirmModal({ type: 'income', amount, bank: ACC, day: String(d), month: m, year: 1405, raw });
    await new Promise(r => setTimeout(r, 250));
    const bs = document.getElementById('smsConfirmBank'); bs.value = ACC; bs.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 120));
    const sel = document.getElementById('smsRecMatchSel');
    return { has: !!sel, value: sel ? sel.value : null, opts: sel ? [...sel.options].map(o => o.textContent) : [], label: sel ? document.querySelector('#smsRecMatch label').textContent : '' };
  }, { amount, d, m, ACC, extra });
  let s1 = await sms(7000000, 3, 7);
  ok(s1.has && /اجارهٔ دوم/.test(s1.label) && s1.value.endsWith('|140507|0'), 'واریز ۳ مهر ۷٬۰۰۰٬۰۰۰: «این واریز مربوط به «اجارهٔ دوم» است؟» از پیش انتخاب شد');
  const before = await p.evaluate(() => periodData.income.sections.reduce((n, s) => n + s.rows.filter(r => r.amount > 0).length, 0));
  await p.evaluate(async () => { confirmSmsEntry(); await new Promise(r => setTimeout(r, 300)); });
  r = await rowsOf('اجارهٔ دوم');
  const after = await p.evaluate(() => periodData.income.sections.reduce((n, s) => n + s.rows.filter(r => r.amount > 0).length, 0));
  ok(r.length === 1 && r[0].status === 'paid' && r[0].day === '3' && after === before, 'تأیید: همان ردیف «دریافت‌شده» با روز ۳ شد و ردیف تازه‌ای اضافه نشد');
  s1 = await sms(7000000, 4, 7);
  ok(!s1.has, 'پیامک دوم با همان مبلغ: ردیف قبلاً پر شده؛ پیشنهادی نمی‌آید (هر ردیف فقط یک پیامک)');
  await p.evaluate(() => closeSmsConfirmModal());
  /* پیش‌واریز آخر مهر برای آبان */
  await create({ name: 'اجارهٔ سوم', amount: 5000000, account: ACC, sectionId: 's1', contractStart: { d: 2, m: 8, y: 1405 }, contractEnd: null });
  await setToday(p, '1405-07-28');
  s1 = await sms(5000000, 30, 7);
  ok(s1.has && s1.value.endsWith('|140508|1') && /پیش‌دریافت/.test(s1.opts.join()), 'واریز ۳۰ مهر برای اجارهٔ ۲ آبان: «پیش‌دریافت» پیشنهاد شد');
  await p.evaluate(async () => { confirmSmsEntry(); await new Promise(r => setTimeout(r, 300)); });
  await setToday(p, '1405-08-02');
  await p.evaluate(() => ensureRecurringRows());
  const ahead = await p.evaluate(() => { const it = recurringIncomes.find(r => r.name === 'اجارهٔ سوم'); let a = []; recEachMonth((k, pd) => (pd.income.sections || []).forEach(s => s.rows.forEach(r => { if (r.fromRecurringId === it.id) a.push(k + ':' + r.status + ':' + (r.recForKey || '')); }))); return a; });
  ok(ahead.length === 1 && ahead[0] === '140507:paid:140508', 'پیش‌دریافت در مهر ثبت شد و آبان ردیف «دریافت نشده» تکراری نگرفت');
  await setToday(p, '1405-07-20');
  /* دو گزینهٔ هم‌مبلغ → کاربر انتخاب می‌کند */
  await create({ name: 'الف', amount: 4000000, account: ACC, sectionId: 's2', contractStart: { d: 10, m: 7, y: 1405 }, contractEnd: null });
  await create({ name: 'ب', amount: 4000000, account: ACC, sectionId: 's2', contractStart: { d: 11, m: 7, y: 1405 }, contractEnd: null });
  s1 = await sms(4000000, 12, 7);
  const selTxt = await p.evaluate(() => { const sl = document.getElementById('smsRecMatchSel'); return sl && sl.value ? sl.options[sl.selectedIndex].textContent : ''; });
  ok(s1.has && s1.value !== '' && /^ب — /.test(selTxt) && s1.opts.length === 3, 'دو درآمد ثابت هم‌مبلغ: نزدیک‌ترین روز («ب»، سررسید ۱۱ مهر) از پیش انتخاب شد؛ کاربر می‌تواند عوض کند (' + selTxt + ')');
  ok(s1.opts.some(o => /سررسید ۱۰ مهر/.test(o)) && s1.opts.some(o => /سررسید ۱۱ مهر/.test(o)), 'گزینه‌ها روز سررسید هر قرارداد را نشان می‌دهند');
  ok(/خیر، تراکنش جدید/.test(s1.opts[s1.opts.length - 1]) && !/خیر/.test(s1.opts[0]), 'ترتیب: درآمدهای ثابت بالا، «خیر، تراکنش جدید ثبت شود» آخر');
  const ed = await p.evaluate(async () => {
    const sel = document.getElementById('smsRecMatchSel'), desc = document.getElementById('smsConfirmDesc');
    const v = n => [...sel.options].find(o => o.getAttribute('data-name') === n).value;
    sel.value = v('الف'); sel.dispatchEvent(new Event('change'));
    const pre = { ro: desc.readOnly, v: desc.value };
    sel.value = v('ب'); sel.dispatchEvent(new Event('change'));
    const swapped = desc.value;
    sel.value = ''; sel.dispatchEvent(new Event('change'));
    const cleared = desc.value;
    sel.value = v('الف'); sel.dispatchEvent(new Event('change'));
    desc.value = 'اجاره الف — مهر'; desc.dispatchEvent(new Event('input'));
    sel.value = v('ب'); sel.dispatchEvent(new Event('change'));
    const kept = desc.value;
    sel.value = v('الف'); sel.dispatchEvent(new Event('change'));
    desc.value = ''; desc.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 50));
    const sug = [...document.querySelectorAll('#smsPlanSuggest > div')].map(x => x.textContent);
    desc.value = 'اجاره الف — مهر';
    confirmSmsEntry(); await new Promise(r => setTimeout(r, 300));
    return { pre, swapped, cleared, kept, sug };
  });
  ok(!ed.pre.ro && ed.pre.v === 'الف', '«بابت چه بود» قفل نیست و پیش‌فرض نام درآمد ثابت (الف) نوشته شد');
  ok(ed.swapped === 'ب' && ed.cleared === '', 'تا کاربر چیزی ننوشته: با انتخاب دیگر نام عوض می‌شود و با «خیر» پاک می‌شود');
  ok(ed.kept === 'اجاره الف — مهر', 'نوشتهٔ خود کاربر با عوض کردن انتخاب دست نمی‌خورد');
  ok(ed.sug[0] === 'الف' && ed.sug[1] === 'ب', 'پیشنهادهای «بابت چه بود»: نام درآمدهای ثابت اول فهرست (' + ed.sug.slice(0, 3).join('، ') + ')');
  const rowA = await p.evaluate(() => { const it = recurringIncomes.find(r => r.name === 'الف'); const x = recRowsOf(it)[0]; return { desc: x.row.desc, st: x.row.status, linked: x.row.fromRecurringId === it.id }; });
  ok(rowA.st === 'paid' && rowA.desc === 'اجاره الف — مهر' && rowA.linked, 'ردیف با شرح نوشته‌شدهٔ کاربر ثبت شد و همچنان به «الف» وصل است');
  ok((await rowsOf('الف'))[0].status === 'paid', 'ثبت روی «الف»: ردیف دریافت‌شده شد');
  /* جابه‌جایی واریز به «ب» از خط وضعیت */
  const mv = await p.evaluate(async () => {
    openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 400));
    const ia = recurringIncomes.findIndex(r => r.name === 'الف');
    document.querySelector('[data-rec-unlink="' + ia + '"]').click(); await new Promise(r => setTimeout(r, 150));
    const pm = document.getElementById('recPickModal');
    const opts = [...pm.querySelectorAll('.rec-pick-opt')];
    opts.find(o => /«ب»/.test(o.textContent)).click(); await new Promise(r => setTimeout(r, 300));
    const list = document.getElementById('recurringBox') ? document.getElementById('recurringBox').innerText : '';
    closeFeatureSheet(); await new Promise(r => setTimeout(r, 200));
    return { list };
  });
  r = await rowsOf('ب');
  const ra = await rowsOf('الف');
  ok(r.length === 1 && r[0].status === 'paid' && ra.length === 1 && ra[0].status === 'unpaid', 'جابه‌جایی: واریز به «ب» منتقل شد (ردیف دریافت‌نشدهٔ ب جایش را داد) و «الف» دوباره «دریافت نشده» شد');
  s1 = await sms(2345678, 12, 7);
  ok(!s1.has, 'مبلغ نامرتبط: پیشنهادی نیست و مثل قبل ردیف تازه ثبت می‌شود');
  await p.evaluate(() => closeSmsConfirmModal());

  console.log('• اسلاید «مقایسه با ماه قبل»: چهار لوله در یک کادر');
  const cmp = await p.evaluate(() => {
    const html = spPageStats({ inc: 5000000, pInc: 0, exp: 2000000, pExp: 3000000 });
    const d = document.createElement('div'); d.innerHTML = html;
    return { labels: [...d.querySelectorAll('.sp-cmp-r .sp-l')].map(x => x.textContent), tubes: d.querySelectorAll('.sp-cmp .sp-bar').length, scroll: !!d.querySelector('.sp-scroll') };
  });
  ok(cmp.labels.join('|') === 'درآمد این ماه|درآمد ماه قبل|خرج این ماه|خرج ماه قبل' && cmp.tubes === 4 && !cmp.scroll, 'چهار ردیف «درآمد/خرج این ماه/ماه قبل» با ۴ لوله، بدون اسکرول');
  await A.ctx.close();

  console.log('• تعریف قدیمی بدون تاریخ شروع');
  {
    const recs = [{ id: 'rec_old', name: 'قدیمی', amount: 3000000, day: 5, account: ACC, sectionId: 's1', sectionTitle: 'اجاره' }];
    const row = (k, st) => ({ day: '5', desc: 'قدیمی', amount: 3000000, status: st, account: ACC, fromRecurringId: 'rec_old' });
    const pd = (rows) => ({ expense: { sections: [], nextId: 1 }, income: { sections: [{ id: 's1', title: 'اجاره', rows }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    const arc = { '1405-5': pd([row(5, 'paid')]), '1405-6': pd([row(6, 'unpaid')]), '1405-7': pd([row(7, 'unpaid')]), '1405-8': pd([row(8, 'unpaid')]), '1405-9': pd([row(9, 'unpaid')]) };
    const L = await open({ hesabKetabArchive_v5_recurring: JSON.stringify(recs), hesabKetabArchive_v5: JSON.stringify(arc), hesabKetabArchive_v5_meta: JSON.stringify({ currentYear: 1405, currentMonth: 7 }) });
    const lp = L.p;
    const st = await lp.evaluate(() => { const it = recurringIncomes[0]; return { fromKey: it.fromKey, rows: recRowsOf(it).length, stale: recStaleUnpaidRows().length }; });
    if (st.rows === 0) { console.log('  (آرشیو مصنوعی با کلید دیگری ذخیره می‌شود؛ آزمون مهاجرت با دادهٔ درون صفحه)'); }
    const res = await lp.evaluate(async (ACC) => {
      if (!recRowsOf(recurringIncomes[0]).length) {
        const mk = (st) => Object.assign(emptyRow('income'), { day: '5', desc: 'قدیمی', amount: 3000000, status: st, account: ACC, fromRecurringId: 'rec_old' });
        const P = (rows) => ({ expense: { sections: [], nextId: 1 }, income: { sections: [{ id: 's1', title: 'اجاره', rows }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
        archive['1405-5'] = P([mk('paid')]); archive['1405-6'] = P([mk('unpaid')]); archive['1405-8'] = P([mk('unpaid')]); archive['1405-9'] = P([mk('unpaid')]);
        periodData.income.sections = [{ id: 's1', title: 'اجاره', rows: [mk('unpaid')] }];
      }
      const n0 = ensureRecurringRows();
      openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 700));
      const legacyBadge = !!document.querySelector('#recurringBox .rec-legacy');
      const q = document.getElementById('confirmModal').classList.contains('open') ? document.getElementById('confirmMsg').textContent : '';
      if (q) document.getElementById('confirmYes').click();
      await new Promise(r => setTimeout(r, 200));
      const left = recRowsOf(recurringIncomes[0]).map(x => x.key + ':' + x.row.status).sort();
      return { n0, legacyBadge, q, left };
    }, ACC);
    ok(st.fromKey === 140507, 'مهاجرت: ماه ساخت = مهر');
    ok(res.n0 === 0, 'تا تاریخ شروع تنظیم نشود ردیف تازه ساخته نمی‌شود');
    ok(res.legacyBadge, 'در فهرست: «تاریخ شروع ندارد؛ برای ادامهٔ ساخت ماهانه ویرایش کنید»');
    ok(/ردیف «دریافت نشده» ساخته بود/.test(res.q), 'یک‌بار پیشنهاد پاک‌سازی ردیف‌های دریافت‌نشدهٔ ماه‌های دیگر (با تأیید)');
    ok(res.left.join() === '140505:paid,140507:unpaid', 'پس از تأیید: دریافت‌شدهٔ مرداد و ردیف ماه جاری ماندند؛ بقیه پاک شدند (' + res.left.join('، ') + ')');
    const again = await lp.evaluate(async () => { closeFeatureSheet(); await new Promise(r => setTimeout(r, 200)); openFeatureSheet('recurring'); await new Promise(r => setTimeout(r, 700)); return document.getElementById('confirmModal').classList.contains('open'); });
    ok(!again, 'پیشنهاد پاک‌سازی فقط یک بار');
    /* تنظیم تاریخ شروع */
    const set = await lp.evaluate(async () => {
      closeFeatureSheet(); await new Promise(r => setTimeout(r, 200));
      openRecurringSheet(0, recurringIncomes[0]);
      await new Promise(r => setTimeout(r, 120));
      const hint = document.querySelector('#recurringSheet .rec-date-lab .hk-info-btn').getAttribute('data-tip').includes('تاریخ شروع نداشت');
      [...document.querySelectorAll('#recurringSheet button')].find(x => x.textContent.trim() === 'انصراف').click();
      await new Promise(r => setTimeout(r, 120));
      openRecurringSheet(0, Object.assign({}, recurringIncomes[0], { contractStart: { d: 5, m: 1, y: 1404 } }));
      await new Promise(r => setTimeout(r, 120));
      [...document.querySelectorAll('#recurringSheet button')].find(x => x.textContent.trim() === 'تأیید').click();
      await new Promise(r => setTimeout(r, 300));
      if (document.getElementById('confirmModal').classList.contains('open')) document.getElementById('confirmNo').click();
      await new Promise(r => setTimeout(r, 200));
      const it = recurringIncomes[0];
      return { hint, start: recStartKey(it), fromKey: it.fromKey, keys: recRowsOf(it).map(x => x.key).sort() };
    });
    ok(set.hint && set.start === 140401 && set.fromKey === 140507 && set.keys.join() === '140505,140507', 'تاریخ شروع (۱۴۰۴) تنظیم شد: از همین ماه ادامه می‌دهد و ماه‌های گذشته ساخته نشد');
    await L.ctx.close();
  }

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nrecurring-monthly: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
