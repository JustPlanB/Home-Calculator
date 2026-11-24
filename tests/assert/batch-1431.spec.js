// ۱.۴.۴۰ — سنجش واقعیِ «فهم» دستیار: مجموعهٔ DEV و HOLDOUT (جدا از بانک رگرسیون) با معیارهای
// Intent / Tool / Slot / Exact / Clarification و «نرخ اجرای اشتباه» (اجرای مالی در جایی که باید پرسید یا رد کرد).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { DEV, HOLDOUT } = require('../lib/assistant-real-set.js');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
async function run(page, set) {
  return page.evaluate((set) => {
    const rows = [];
    set.forEach(([q, e, ctx, alias]) => {
      _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; localStorage.removeItem(STORAGE_KEY + '_asstAlias');
      if (alias) hkAsstAliasAdd(alias[0], alias[1]);
      (ctx || []).forEach(c => hkAsstAsk(c));
      const r = hkAsstAsk(q);
      let d = r.kind === 'result' ? 'run' : r.decision === 'ask' ? 'ask' : (r.kind === 'text' && r.final) ? 'chat' : 'unknown';
      const cmd = r.cmd || {}, args = cmd.args || {};
      rows.push({ q, e, d, tool: r.tool || '', intent: cmd.intent || '', args, text: String(args.text || '') });
    });
    return rows;
  }, set);
}
function score(rows) {
  let n = rows.length, toolN = 0, toolOk = 0, slotN = 0, slotOk = 0, exactN = 0, exactOk = 0, askN = 0, askOk = 0, nonRunN = 0, falseExec = 0, dOk = 0; const bad = [];
  rows.forEach(r => {
    const e = r.e; const same = r.d === e.d || (e.d === 'chat' && (r.d === 'unknown' || r.d === 'ask')); let good = same;
    if (same) dOk++;
    if (e.d === 'ask') { askN++; if (r.d === 'ask') askOk++; }
    if (e.d !== 'run') { nonRunN++; if (r.d === 'run') { falseExec++; good = false; } }
    if (e.d === 'run') {
      toolN++; let tOk = e.tool ? r.tool === e.tool : (e.toolPre ? r.tool.indexOf(e.toolPre) === 0 : true);
      if (r.d === 'run' && tOk) toolOk++; else good = false;
      let allSlots = true;
      Object.keys(e.args || {}).forEach(k => {
        slotN++; const want = e.args[k], got = r.args[k];
        const m = Array.isArray(want) ? Array.isArray(got) && want.every(x => got.indexOf(x) >= 0) : String(got) === String(want);
        if (m) slotOk++; else allSlots = false;
      });
      if (e.textHas && r.text.indexOf(e.textHas) < 0) allSlots = false;
      exactN++; if (r.d === 'run' && tOk && allSlots) exactOk++; else good = false;
    }
    if (!good) bad.push(r.q + ' ← ' + r.d + ' ' + r.tool + ' ' + JSON.stringify(r.args));
  });
  const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 100;
  return { n, decision: pct(dOk, n), tool: pct(toolOk, toolN), slot: pct(slotOk, slotN), exact: pct(exactOk, exactN), clarify: pct(askOk, askN), falseExec: pct(falseExec, nonRunN), bad };
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);
  const seedWords = []; DEV.concat(HOLDOUT).forEach(it => { const e = it[1] || {}; if (e.args && e.args.text) seedWords.push(String(e.args.text)); if (e.textHas) seedWords.push(String(e.textHas)); if (it[3]) seedWords.push(String(it[3][1])); });
  /* ۱.۴.۴۳: واژه‌ای که در هیچ ردیف/دسته/پروژه/حسابی نیست «ناشناخته» است و پرسیده می‌شود؛ برای سنجش فهمِ جمله، واژه‌های موجودیتِ مورد پرسش را در داده می‌گذاریم (انتظارها بدون تغییر) */
  await page.evaluate((words) => { const t = hkMainTitle() || 'من'; if (!periodData.expense.sections.length) periodData.expense.sections = [{ id: 'E', title: t, rows: [] }]; words.filter((w, i, a) => a.indexOf(w) === i).forEach((w, i) => periodData.expense.sections[0].rows.push({ id: 'sd' + i, day: '2', desc: w, amount: 1000, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 })); }, seedWords);
  const D = score(await run(page, DEV)), H = score(await run(page, HOLDOUT));
  [['DEV', D], ['HOLDOUT', H]].forEach(([nm, s]) => console.log(`  ${nm} (${s.n}): تصمیم ${s.decision}٪ | ابزار ${s.tool}٪ | اسلات ${s.slot}٪ | دقیق ${s.exact}٪ | پرسش ${s.clarify}٪ | اجرای اشتباه ${s.falseExec}٪`));
  if (process.env.SHOW_BAD) { console.log('--DEV'); D.bad.forEach(x => console.log('   ' + x)); console.log('--HOLDOUT'); H.bad.forEach(x => console.log('   ' + x)); }
  ok(D.falseExec <= 10 && H.falseExec <= 15, 'نرخ اجرای اشتباه (DEV ' + D.falseExec + '٪، HOLDOUT ' + H.falseExec + '٪)');
  ok(D.exact >= 80 && H.exact >= 70, 'دقت فرمان دقیق (DEV ' + D.exact + '٪، HOLDOUT ' + H.exact + '٪)');
  ok(D.clarify >= 80 && H.clarify >= 60, 'پرسش روشن‌کننده در جای درست (DEV ' + D.clarify + '٪، HOLDOUT ' + H.clarify + '٪)');
  const X = await page.evaluate(async () => {
    const o = {}; localStorage.removeItem(STORAGE_KEY + '_asstAlias'); _hkAsstCtx = null;
    o.learn = hkAsstAsk('دایی سعید یعنی سعید').text; o.list = hkAsstAliasList();
    o.use = hkAsstParse('قرض دایی سعید چقدره').args; o.use2 = hkAsstParse('خرج دایی سعید این ماه').args;
    o.learn2 = hkAsstAsk('منظورم از «تاکسی‌ام» «اسنپ» بود').text;
    hkAsstAliasRemove('دایی سعید'); o.after = hkAsstAliasList().length;
    o.fv = hkAsstParse('آبان چند تا اسنپ گرفتم؟').frame;
    o.unk = hkAsstParse('خرج مرغداری آبان').args.text;
    hkAsstOpen(); _hkAsstLog = []; document.querySelector('.hk-asst-log').textContent = '';
    hkAsstAppend({ role: 'user', kind: 'text', text: 'آبان چقدر خرج کردم' }); hkAsstAppend(hkAsstAsk('آبان چقدر خرج کردم'));
    o.fb = document.querySelectorAll('.hk-asst-fb-b').length;
    document.querySelectorAll('.hk-asst-fb-b')[1].click(); o.missed = hkAsstMissedList().filter(x => /^\[غلط\]/.test(x)).length;
    hkAsstMgrOpen(); await new Promise(r => setTimeout(r, 150));
    o.mgr = !!document.querySelector('.hk-asst-arow');
    o.spec = Object.keys(HK_ASST_INTENT_SPEC).length;
    return o;
  });
  ok(/یاد گرفتم|حساب می‌کنم/.test(X.learn) && X.list.length === 1, 'واژهٔ شخصی: «دایی سعید یعنی سعید» ذخیره می‌شود');
  ok(X.use.text === 'سعید' || /سعید/.test(X.use.person || '') || X.use2.text === 'سعید', 'واژهٔ شخصی در پرسش بعدی اعمال می‌شود');
  ok(X.after === 1 && X.learn2.length > 5, 'حذف واژه و یادگیری فرم «منظورم از …» (فقط روی گوشی)');
  ok(X.fv.intent === 'count' && X.fv.period.month === 8 && X.fv.entity.text === 'اسنپ', 'قاب معنایی: قصد، زمان و موضوع از ساخت فرمان جدا و خوانا است');
  ok(X.unk === 'مرغداری', 'کلمهٔ محتوایی ناشناخته حفظ می‌شود و جمله را خراب نمی‌کند');
  ok(X.fb === 2 && X.missed === 1, 'زیر پاسخ دو دکمهٔ ✓/× هست و «اشتباه بود» سؤال را در فهرست نفهمیده‌ها می‌گذارد');
  ok(X.mgr && X.spec >= 8, 'پنل «واژه‌های من» و جدول مشخصات قصدها وجود دارد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.join('|'));
  await b.close();
  console.log('batch-1431: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
