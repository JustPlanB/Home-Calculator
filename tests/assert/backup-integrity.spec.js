// یکپارچگی بکاپ برای سه کلیدی که قبلاً در بکاپ نبودند (_todos، _trash، _smsBankMap) — فقط دادهٔ مصنوعی،
// هر سناریو در یک پروفایل تازه و جدا. هیچ فایل بکاپ واقعی خوانده نمی‌شود.
// پوشش: رفت‌وبرگشت دقیق، بکاپ رمزدار و رد رمز اشتباه، ادغام تکراری بدون تکثیر، حفظ دادهٔ محلی در ادغام،
// بکاپ‌های قدیمی بدون این فیلدها، فیلدهای null/خالی/خراب، بکاپ جزئی، و گزارش خطای خواندن/نوشتن.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const K_TODO = P + '_todos', K_TRASH = P + '_trash', K_SMS = P + '_smsBankMap';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1' };

/* دادهٔ مصنوعی نماینده (کارت دوم با قالب قدیمیِ آرایه‌ای کارهای من) */
const CARD2 = 'کارت نمونه دوم';
function fixture(card1) {
  const todos = {
    [card1]: {
      '1405-1': [{ id: 'l_a', items: [{ t: 'خرید نمونه', done: false }, { t: 'پرداخت نمونه', done: true }] }],
      '1405-2': [{ id: 'l_b', items: [{ t: 'کار نمونهٔ ماه دوم', done: false }] }, { id: 'l_c', items: [{ t: 'فهرست دوم', done: false }] }]
    },
    [CARD2]: [{ t: 'قالب قدیمی', done: false }]
  };
  const trash = [
    { id: 'tr_syn1', type: 'row', title: 'ردیف نمونه', data: { desc: 'x', amount: 1000 }, sourceLabel: '', deletedAt: 1700000000000 },
    { id: 'tr_syn2', type: 'todo_list', title: 'فهرست نمونه', data: { id: 'l_z', title: card1, ym: '1405-1', items: [{ t: 'حذف‌شده', done: false }] }, sourceLabel: '', deletedAt: 1700000001000 },
    { id: 'tr_syn3', type: 'project', title: 'پروژهٔ نمونه', data: { subject: { id: 'pj_syn', name: 'پروژه' } }, sourceLabel: 'منبع', deletedAt: 1700000002000 }
  ];
  const sms = { 'بانک نمونه برداشت #NUM# مانده': 'ملت', 'واریز نمونه #NUM#': 'ملی', 'پیامک نمونهٔ سوم': 'تجارت' };
  return { todos, trash, sms };
}

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const same = (a, b) => canon(a) === canon(b);

async function fresh(b, extraLs) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, extraLs || {}));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page, errors };
}
const read3 = page => page.evaluate(ks => ks.map(k => { const r = localStorage.getItem(k); return r == null ? null : JSON.parse(r); }), [K_TODO, K_TRASH, K_SMS]);
const card1Of = page => page.evaluate(() => allPersonTitles()[0]);
function seedLs(f) { return { [K_TODO]: JSON.stringify(f.todos), [K_TRASH]: JSON.stringify(f.trash), [K_SMS]: JSON.stringify(f.sms) }; }
/* شمارش داده‌های دیگر برای اطمینان از اینکه ادغام تکراری چیزی را تکثیر یا حذف نمی‌کند */
const otherCounts = page => page.evaluate(() => {
  let rows = 0; Object.keys(archive).forEach(k => ['income', 'expense'].forEach(s => ((archive[k][s] || {}).sections || []).forEach(x => { rows += (x.rows || []).length; })));
  return { rows, plans: (plans || []).length, rec: (recurringIncomes || []).length, rem: (userReminders || []).length, acc: (selectedBankAccounts || []).length,
    subj: loadFinancialSubjects().length, smsAcc: Object.keys(smsAccountBankMap || {}).length };
});

(async () => {
  const b = await chromium.launch();
  const allErrors = [];

  // کارت اول پروفایل تازه برای ساخت داده
  const probe = await fresh(b); const card1 = await card1Of(probe.page); await probe.ctx.close();
  const F = fixture(card1);

  console.log('• خروجی بکاپ شامل سه کلید با همان ساختار واقعی');
  const A = await fresh(b, seedLs(F));
  const payload = await A.page.evaluate(() => {
    const t = allPersonTitles()[0];
    plans.push({ id: 'p_syn', name: 'قسط نمونه', amount: 1000000, count: 10, paidCount: 1, startY: 1405, startM: 1, day: 5, updatedAt: Date.now() });
    userReminders.push({ id: 'ur_syn', title: 'یادآور نمونه', y: 1405, m: 12, d: 1 }); saveUserReminders();
    const r = emptyRow('income'); r.day = '3'; r.desc = 'درآمد نمونه'; r.amount = 4100000; r.status = 'paid';
    periodData.income.sections.find(s => s.title === t).rows.unshift(r);
    persistCurrent(); saveArchive();
    return JSON.parse(JSON.stringify(buildBackupPayload(null)));
  });
  ok(same(payload.todos, F.todos), 'todos در فایل دقیقاً برابر دادهٔ ذخیره‌شده (شامل قالب قدیمی)');
  ok(same(payload.trash, F.trash), 'trash در فایل دقیقاً برابر دادهٔ ذخیره‌شده');
  ok(same(payload.smsBankMap, F.sms), 'smsBankMap در فایل دقیقاً برابر دادهٔ ذخیره‌شده');
  ok(!payload.backupWarnings, 'بدون هشدار خواندن');
  const stored = await read3(A.page);
  ok(same(stored, [F.todos, F.trash, F.sms]), 'خروجی‌گرفتن دادهٔ محلی را تغییر نداد');
  allErrors.push(...A.errors); await A.ctx.close();

  console.log('• بازیابی جایگزینی در پروفایل تازه: رفت‌وبرگشت دقیق');
  const B = await fresh(b);
  await B.page.evaluate(p => applyBackupData(p, 'replace'), payload); await B.page.waitForTimeout(400);
  const back = await read3(B.page);
  ok(same(back[0], F.todos), 'todos دقیقاً بازگشت');
  ok(same(back[1], F.trash), 'trash دقیقاً بازگشت');
  ok(same(back[2], F.sms), 'smsBankMap دقیقاً بازگشت');
  const cB = await otherCounts(B.page);
  ok(cB.plans >= 1 && cB.rem >= 1 && cB.rows >= 1, 'اقساط، یادآور و تراکنش هم بازگشتند');

  console.log('• ادغام تکراری همان فایل: بدون تکثیر و بدون حذف');
  await B.page.evaluate(p => { applyBackupData(p, 'merge'); applyBackupData(p, 'merge'); }, payload); await B.page.waitForTimeout(400);
  const back2 = await read3(B.page); const cB2 = await otherCounts(B.page);
  ok(same(back2, back), 'سه کلید بعد از دو بار ادغام تغییری نکردند');
  ok(same(cB2, cB), 'تعداد تراکنش، قسط، درآمد ثابت، یادآور، حساب، پروژه و نگاشت پیامک ثابت ماند');
  console.log('• جایگزینی دوباره: همان نتیجه');
  await B.page.evaluate(p => applyBackupData(p, 'replace'), payload); await B.page.waitForTimeout(300);
  ok(same(await read3(B.page), back), 'جایگزینی تکراری نتیجهٔ یکسان داد');
  allErrors.push(...B.errors); await B.ctx.close();

  console.log('• بکاپ رمزدار با سه کلید');
  const E = await fresh(b);
  const enc = await E.page.evaluate(async p => {
    const e = await hkEncryptBackup(JSON.stringify(p), 'synthetic-pass-1');
    const leaks = JSON.stringify(e).indexOf('خرید نمونه') >= 0;
    let wrong = false; try { await hkDecryptBackup(e, 'wrong-pass'); } catch (x) { wrong = true; }
    const plain = await hkDecryptBackup(e, 'synthetic-pass-1');
    applyBackupData(hkSafeJsonParse(plain), 'replace');
    return { leaks, wrong };
  }, payload);
  await E.page.waitForTimeout(300);
  ok(!enc.leaks, 'متن کارها در فایل رمزدار دیده نمی‌شود');
  ok(enc.wrong, 'رمز اشتباه رد شد');
  ok(same(await read3(E.page), [F.todos, F.trash, F.sms]), 'بعد از رمزگشایی هر سه کلید دقیقاً بازگشتند');
  allErrors.push(...E.errors); await E.ctx.close();

  console.log('• ادغام با دادهٔ محلی متفاوت: محلی حفظ، تازه افزوده، کلید هم‌نام دست‌نخورده');
  const localF = {
    todos: { [card1]: { '1405-1': [{ id: 'l_local', items: [{ t: 'کار محلی', done: false }] }] }, 'کارت محلی': { '1405-3': [{ id: 'l_m', items: [{ t: 'محلی', done: true }] }] } },
    trash: [{ id: 'tr_local', type: 'row', title: 'محلی', data: {}, sourceLabel: '', deletedAt: 1 }, F.trash[0]],
    sms: { 'بانک نمونه برداشت #NUM# مانده': 'سپه', 'کلید محلی': 'پاسارگاد' }
  };
  const M = await fresh(b, seedLs(localF));
  await M.page.evaluate(p => applyBackupData(p, 'merge'), payload); await M.page.waitForTimeout(300);
  const [mt, mtr, ms] = await read3(M.page);
  const ids = (mt[card1]['1405-1'] || []).map(x => x.id);
  ok(ids.includes('l_local') && ids.includes('l_a') && ids.length === 2, 'کارها: فهرست محلی ماند و فهرست فایل اضافه شد');
  ok(same(mt['کارت محلی'], localF.todos['کارت محلی']) && same(mt[CARD2], F.todos[CARD2]) && same(mt[card1]['1405-2'], F.todos[card1]['1405-2']), 'کارها: کارت فقط‌محلی دست‌نخورده، کارت‌ها و ماه‌های تازه اضافه شدند');
  const trIds = mtr.map(x => x.id);
  ok(trIds.length === 4 && ['tr_local', 'tr_syn1', 'tr_syn2', 'tr_syn3'].every(i => trIds.filter(x => x === i).length === 1), 'سطل زباله: بدون تکرار، محلی حفظ شد');
  ok(ms['بانک نمونه برداشت #NUM# مانده'] === 'سپه' && ms['کلید محلی'] === 'پاسارگاد' && ms['واریز نمونه #NUM#'] === 'ملی' && Object.keys(ms).length === 4, 'بانک پیامک: انتخاب محلی حفظ شد و کلیدهای تازه اضافه شدند');
  allErrors.push(...M.errors); await M.ctx.close();

  console.log('• بکاپ‌های قدیمی بدون این فیلدها: دادهٔ محلی این سه کلید دست‌نخورده می‌ماند');
  const OLD = {
    'فقط آرشیو': { archive: { '1401-2': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '2', desc: 'OLD_A', amount: 1, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } } },
    'نسخهٔ ۱': { version: 1, app: 'hesab-ketab', archive: { '1402-5': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '7', desc: 'OLD_V1', amount: 1, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } }, plans: [], recurringIncomes: [] }
  };
  for (const name of Object.keys(OLD)) {
    for (const mode of ['replace', 'merge']) {
      const O = await fresh(b, seedLs(F));
      const arch = await O.page.evaluate(([d, m]) => { applyBackupData(d, m); return JSON.stringify(archive); }, [OLD[name], mode]);
      await O.page.waitForTimeout(200);
      ok(/OLD_A|OLD_V1/.test(arch) && same(await read3(O.page), [F.todos, F.trash, F.sms]) && O.errors.length === 0, name + ' (' + mode + '): آرشیو بازیابی شد و سه کلید محلی دست‌نخورده ماند');
      await O.ctx.close();
    }
  }

  console.log('• فیلدهای null، خالی و خراب');
  const BAD = {
    'null': { todos: null, trash: null, smsBankMap: null },
    'نوع اشتباه': { todos: 'x', trash: { a: 1 }, smsBankMap: [1, 2] },
    'عدد/بولی': { todos: 5, trash: true, smsBankMap: 0 }
  };
  for (const name of Object.keys(BAD)) {
    const X = await fresh(b, seedLs(F));
    await X.page.evaluate(d => applyBackupData(Object.assign({ version: 1, app: 'hesab-ketab' }, d), 'replace'), BAD[name]);
    await X.page.waitForTimeout(200);
    ok(same(await read3(X.page), [F.todos, F.trash, F.sms]) && X.errors.length === 0, name + ': نادیده گرفته شد و دادهٔ محلی دست‌نخورده ماند');
    await X.ctx.close();
  }
  const EMPTY = await fresh(b, seedLs(F));
  await EMPTY.page.evaluate(() => applyBackupData({ version: 1, todos: {}, trash: [], smsBankMap: {} }, 'merge')); await EMPTY.page.waitForTimeout(200);
  ok(same(await read3(EMPTY.page), [F.todos, F.trash, F.sms]) && EMPTY.errors.length === 0, 'خالی در حالت ادغام: چیزی حذف نشد');
  await EMPTY.page.evaluate(() => applyBackupData({ version: 1, todos: {}, trash: [], smsBankMap: {} }, 'replace')); await EMPTY.page.waitForTimeout(200);
  ok(same(await read3(EMPTY.page), [{}, [], {}]) && EMPTY.errors.length === 0, 'خالی در حالت جایگزینی: همان مقدار خالی فایل اعمال شد');
  await EMPTY.ctx.close();

  const PART = await fresh(b);
  const partial = {
    version: 1,
    todos: { 'کارت سالم': { '1405-1': [{ id: 'ok1', items: [{ t: 'سالم', done: false }] }, { items: [] }, null], 'bad-month': [{ id: 'z', items: [] }], '1405-2': 'x' }, '   ': { '1405-1': [] }, 'کارت خراب': 7 },
    trash: [{ id: 'tr_ok', type: 'row', title: 'سالم', data: {}, deletedAt: 1 }, null, 'str', 5, ['arr']],
    smsBankMap: { 'کلید سالم': 'ملت', 'عددی': 5, 'خالی': '  ', 'شیء': { a: 1 } }
  };
  const pr = await PART.page.evaluate(d => {
    const rep = sanitizeBackupData(JSON.parse(JSON.stringify(d)), 'replace');
    let toast = ''; const orig = window.showToastLong; window.showToastLong = m => { toast = m; };
    applyBackupData(d, 'replace');
    return new Promise(res => setTimeout(() => { window.showToastLong = orig; res({ invalid: rep.invalidRecords, toast }); }, 1200));
  }, partial);
  const [pt, ptr, ps] = await read3(PART.page);
  ok(same(pt, { 'کارت سالم': { '1405-1': [{ id: 'ok1', items: [{ t: 'سالم', done: false }] }] } }), 'کارها: فقط بخش سالم بازیابی شد');
  ok(same(ptr, [partial.trash[0]]), 'سطل زباله: فقط آیتم سالم بازیابی شد');
  ok(same(ps, { 'کلید سالم': 'ملت' }), 'بانک پیامک: فقط ورودی سالم بازیابی شد');
  ok(pr.invalid === 13 && /ناسازگار/.test(pr.toast), 'تعداد رکوردهای ناسازگار (۱۳) شمرده و به کاربر گزارش شد');
  ok(PART.errors.length === 0, 'خطای صفحه ندارد');
  await PART.ctx.close();

  console.log('• بکاپ جزئی');
  const PB = await fresh(b, seedLs(F));
  const parts = await PB.page.evaluate(c2 => {
    const t = allPersonTitles()[0];
    const onlyPlans = buildBackupPayload({ plans: true });
    const onlyBanks = buildBackupPayload({ selectedBankAccounts: true });
    const oneCard = buildBackupPayload({ archive: true, selectedUserCards: [t] });
    const oneMonth = buildBackupPayload({ archive: true, selectedMonths: ['1405-2'] });
    const allSel = buildBackupPayload({ archive: true, plans: true, recurringIncomes: true, selectedBankAccounts: true, subjects: true, userReminders: true, savings: true, categories: true });
    return {
      plans: ['todos', 'trash', 'smsBankMap'].map(k => k in onlyPlans),
      banks: ['todos', 'trash', 'smsBankMap'].map(k => k in onlyBanks),
      cardKeys: Object.keys(oneCard.todos || {}), cardTrash: 'trash' in oneCard,
      month: oneMonth.todos, allTrash: Array.isArray(allSel.trash) && allSel.trash.length
    };
  }, CARD2);
  ok(same(parts.plans, [false, false, false]), 'فقط اقساط: هیچ‌کدام از سه کلید');
  ok(same(parts.banks, [false, false, true]), 'فقط حساب‌ها: فقط بانک پیامک');
  ok(same(parts.cardKeys, [card1]) && !parts.cardTrash, 'یک کارت: فقط کارهای همان کارت، بدون سطل زباله');
  ok(same(parts.month, { [card1]: { '1405-2': F.todos[card1]['1405-2'] }, [CARD2]: F.todos[CARD2] }), 'یک ماه: فقط کارهای همان ماه (قالب قدیمی بدون ماه دست‌نخورده)');
  ok(parts.allTrash === 3, 'همهٔ بخش‌ها تیک‌خورده: سطل زباله هست');
  allErrors.push(...PB.errors); await PB.ctx.close();

  console.log('• گزارش خطا (بی‌صدا نیست)');
  const W = await fresh(b, Object.assign(seedLs(F), { [K_TODO]: '{خراب' }));
  const w = await W.page.evaluate(() => { const p = buildBackupPayload(null); return { warn: p.backupWarnings || [], hasTodos: 'todos' in p, trash: (p.trash || []).length, sms: Object.keys(p.smsBankMap || {}).length }; });
  ok(same(w.warn, ['todos']) && !w.hasTodos && w.trash === 3 && w.sms === 3, 'JSON خراب کارها: هشدار در فایل، بقیهٔ بخش‌ها سالم');
  await W.ctx.close();
  const R = await fresh(b);
  const rf = await R.page.evaluate(p => {
    const set = Storage.prototype.setItem; let toast = '';
    Storage.prototype.setItem = function (k, v) { if (String(k).endsWith('_todos')) throw new Error('quota'); return set.call(this, k, v); };
    const orig = window.showToastLong; window.showToastLong = m => { toast = m; };
    let threw = false; try { applyBackupData(p, 'replace'); } catch (e) { threw = true; }
    Storage.prototype.setItem = set;
    return new Promise(res => setTimeout(() => { window.showToastLong = orig; res({ threw, toast, sms: localStorage.getItem('hesabKetabArchive_v5_smsBankMap') }); }, 1200));
  }, payload);
  ok(!rf.threw && /todos/.test(rf.toast) && same(JSON.parse(rf.sms), F.sms), 'خطای نوشتن کارها گزارش شد و بقیهٔ بخش‌ها بازیابی شدند');
  await R.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS در خروجی و بازیابی ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbackup-integrity: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
