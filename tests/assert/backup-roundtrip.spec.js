// رفت‌وبرگشت کامل بکاپ با دادهٔ مصنوعی: همهٔ کلیدهای ذخیره‌سازی با یک نشانهٔ یکتا پر می‌شوند،
// بکاپ کامل گرفته می‌شود، در یک پروفایل کاملاً تازه بازیابی می‌شود و برای هر کلید بررسی می‌شود
// که نشانه برگشته است یا نه. همچنین قالب‌های قدیمی بکاپ بازیابی می‌شوند.
//
// کلیدهایی که در KNOWN_GAPS هستند امروز عمداً در بکاپ نیستند (یافتهٔ S4 ممیزی). این تست وضعیت
// آن‌ها را دقیق گزارش می‌کند ولی تا اصلاح بکاپ (مرحلهٔ بعد، با تأیید) آن‌ها را شکست حساب نمی‌کند.
// اگر روزی پوشش داده شوند، خروجی «اکنون پوشش داده می‌شود» چاپ می‌کند تا از این فهرست حذف شوند.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const KNOWN_GAPS = [P + '_todos', P + '_trash', P + '_smsBankMap'];
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1' };

let failed = 0, passed = 0, gaps = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page, errors };
}

/* همهٔ داده‌ها با توابع خود اپ ساخته می‌شوند؛ هر کلید یک نشانهٔ یکتا دارد */
function populate(P) {
  const M = {}; let n = 0; const mark = k => (M[k] = 'MK' + (++n) + 'z' + Math.random().toString(36).slice(2, 6)); /* کوتاه: بعضی فیلدها (مثل دستهٔ دلخواه) تا ۲۴ نویسه بریده می‌شوند */
  const t = allPersonTitles()[0];
  // آرشیو: ماه جاری (درآمد، هزینه، قرض) + یک ماه قبل
  const inc = periodData.income.sections.find(s => s.title === t);
  const r1 = emptyRow('income'); r1.day = '3'; r1.desc = mark('archive_income'); r1.amount = 4100000; r1.status = 'paid'; inc.rows.unshift(r1);
  const exp = periodData.expense.sections.find(s => s.title === t);
  const r2 = emptyRow('expense'); r2.day = '4'; r2.desc = mark('archive_expense'); r2.amount = 230000; r2.status = 'paid'; exp.rows.unshift(r2);
  const led = ensureLedger(); const ls = emptyLedgerSection(); ls.personA = 'من'; ls.personB = mark('archive_ledger'); ls.rows[0].amount = 50000; led.sections.push(ls);
  const prevKey = '1400-1';
  archive[prevKey] = JSON.parse(JSON.stringify(periodData));
  archive[prevKey].income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '9', desc: mark('archive_prev_month'), amount: 999000, status: 'paid' }));
  // کلیدهای جانبی
  plans.push({ id: 'p_rt', name: mark('plans'), amount: 1000000, count: 10, paidCount: 1, startY: 1405, startM: 1, day: 5, updatedAt: Date.now() });
  recurringIncomes.push({ id: 'rc_rt', name: mark(P + '_recurring'), amount: 3000000, day: '1', sectionTitle: t, updatedAt: Date.now() }); saveRecurring();
  selectedBankAccounts.push({ id: 'ba_rt', bank: 'بانک ملت', label: mark(P + '_bankAccounts'), openingBalance: 1000 }); normalizeSelectedBanks(); saveBankAccountsSelection();
  const sv = loadSavings(); sv.items.push({ id: 'sv_rt', asset: 'other', label: mark(P + '_savings'), qty: 2, cost: 100 }); saveSavings();
  const subj = loadFinancialSubjects(); subj.push({ id: 'pj_rt', name: mark('hesabKetabFinancialSubjects'), highlightColor: 'purple' }); saveFinancialSubjects();
  userReminders.push({ id: 'ur_rt', title: mark(P + '_userReminders'), y: 1405, m: 12, d: 1 }); saveUserReminders();
  smsAccountBankMap['L4:' + mark(P + '_smsAccountBankMap')] = 'ملت'; saveSmsAccountBankMap();
  try { HKCategorizer.addCustom(mark(P + '_catCustom')); } catch (e) { M._catErr = String(e); }
  /* ترتیب کارت فقط برای کارت‌های موجود معتبر است: یک کارت واقعی دوم با نام نشانه ساخته می‌شود */
  const t2 = mark(P + '_cardOrder'); periodData.expense.sections.push({ id: 's_rt2', title: t2, color: '#888', collapsed: false, rows: [Object.assign(emptyRow('expense'), { day: '1', desc: 'x', amount: 1000, status: 'paid' })] });
  saveGlobalCardOrder([t2, t]); periodData.personCardOrder = [t2, t];
  saveTodoList(t, 'l_rt', [{ t: mark(P + '_todos'), done: false }]);
  pushToTrash('row', mark(P + '_trash'), { desc: 'x' });
  saveSmsBankPref(mark(P + '_smsBankMap') + ' بانک ملت پیامک', 'ملت');
  setCardBgIndex(t, 2); M[P + '_cardMeta'] = '"bg":2';
  persistCurrent(); saveArchive();
  return M;
}

/* محل جست‌وجوی هر نشانه بعد از بازیابی: هم localStorage و هم حافظهٔ اپ */
function snapshot() {
  const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  persistCurrent();
  return { ls, mem: {
    archive: JSON.stringify(archive), plans: JSON.stringify(plans || []),
    todosNow: JSON.stringify(loadTodoLists(allPersonTitles()[0]))
  } };
}

(async () => {
  const b = await chromium.launch();

  console.log('• رفت‌وبرگشت کامل همهٔ کلیدها');
  const A = await fresh(b);
  const M = await A.page.evaluate(populate, P);
  const snapA = await A.page.evaluate(snapshot);
  const payload = await A.page.evaluate(() => JSON.stringify(buildBackupPayload(null)));
  await A.ctx.close();

  const B = await fresh(b);
  await B.page.evaluate(p => { applyBackupData(JSON.parse(p), 'replace'); }, payload);
  await B.page.waitForTimeout(400);
  const snapB = await B.page.evaluate(snapshot);

  const inPayload = k => payload.indexOf(M[k]) >= 0;
  const restored = k => {
    const m = M[k];
    if (k.startsWith('archive_')) return snapB.mem.archive.indexOf(m) >= 0;
    if (k === 'plans') return snapB.mem.plans.indexOf(m) >= 0;
    if (k === P + '_cardMeta') return (snapB.ls[k] || '').indexOf(m) >= 0;
    return (snapB.ls[k] || '').indexOf(m) >= 0;
  };
  const rows = [];
  for (const k of Object.keys(M).filter(x => !x.startsWith('_'))) {
    const was = k.startsWith('archive_') || k === 'plans' ? true : ((snapA.ls[k] || '').indexOf(M[k]) >= 0);
    const inP = k === P + '_cardMeta' ? payload.indexOf('"bg":2') >= 0 : inPayload(k);
    const back = restored(k);
    rows.push({ key: k, storedBeforeBackup: was, inBackupFile: inP, restored: back });
    if (KNOWN_GAPS.includes(k)) {
      if (back) console.log('  ★ ' + k + ' — اکنون پوشش داده می‌شود (از KNOWN_GAPS حذف شود)');
      else { gaps++; console.log('  ⚠ شکاف شناخته‌شده: ' + k + ' (در فایل بکاپ: ' + (inP ? 'بله' : 'خیر') + '، بازیابی: خیر)'); }
    } else {
      ok(was && back, k + ' — ذخیره: ' + (was ? 'بله' : 'خیر') + '، در فایل: ' + (inP ? 'بله' : 'خیر') + '، بازیابی: ' + (back ? 'بله' : 'خیر'));
    }
  }
  if (M._catErr) console.log('  (addCustom: ' + M._catErr + ')');
  /* cardMeta ماه جاری داخل آرشیو هست؛ این را جدا گزارش می‌کنیم */
  const cmInArchive = /"cardMeta":\{[^}]*"bg":2/.test(payload);
  console.log('  ℹ cardMeta ماه جاری داخل آرشیوِ فایل بکاپ: ' + (cmInArchive ? 'بله' : 'خیر'));
  ok(A.errors.length === 0 && B.errors.length === 0, 'خطای صفحه ندارد ' + (A.errors[0] || B.errors[0] || ''));
  await B.ctx.close();

  console.log('• سازگاری با قالب‌های قدیمی بکاپ');
  const OLD = {
    'فقط آرشیو (قدیمی‌ترین قالب)': () => ({ archive: { '1401-2': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '2', desc: 'OLD_ARCHIVE_ONLY', amount: 120000, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } } }),
    'نسخهٔ ۱ بدون فیلدهای جدید': () => ({ version: 1, app: 'hesab-ketab', archive: { '1402-5': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '7', desc: 'OLD_V1', amount: 330000, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } }, plans: [], recurringIncomes: [] })
  };
  for (const name of Object.keys(OLD)) {
    const C = await fresh(b);
    const marker = name.indexOf('آرشیو') >= 0 ? 'OLD_ARCHIVE_ONLY' : 'OLD_V1';
    const back = await C.page.evaluate(d => { applyBackupData(d, 'replace'); return JSON.stringify(archive); }, OLD[name]());
    ok(back.indexOf(marker) >= 0 && C.errors.length === 0, name + ' بازیابی شد');
    await C.ctx.close();
  }
  // بکاپ رمزدار قالب فعلی (AES-GCM) — با رمز درست، و رمز اشتباه رد شود
  const E = await fresh(b);
  const enc = await E.page.evaluate(async () => {
    const d = { version: 1, app: 'hesab-ketab', archive: { '1403-3': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '1', desc: 'OLD_ENC', amount: 50000, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } } };
    const e = await hkEncryptBackup(JSON.stringify(d), 'synthetic-pass');
    const plain = await hkDecryptBackup(e, 'synthetic-pass');
    applyBackupData(hkSafeJsonParse(plain), 'replace');
    let wrong = false; try { await hkDecryptBackup(e, 'nope'); } catch (x) { wrong = true; }
    return { ok: JSON.stringify(archive).indexOf('OLD_ENC') >= 0, wrong };
  });
  ok(enc.ok && enc.wrong && E.errors.length === 0, 'بکاپ رمزدار بازیابی شد و رمز اشتباه رد شد');
  await E.ctx.close();

  await b.close();
  console.log('\nbackup-roundtrip: ' + passed + ' passed, ' + failed + ' failed, ' + gaps + ' known gaps');
  console.log('BACKUP_COVERAGE ' + JSON.stringify(rows));
  process.exit(failed ? 1 : 0);
})();
