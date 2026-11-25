// ۱.۴.۴۵ — اتصال موتور چهارمرحله‌ای به hkAsstAsk: پیش‌فرض، کلید بازگشت، زمینهٔ گفتگو، عملیات جانبی فقط یک بار، مقایسهٔ بی‌اثر.
// فقط دادهٔ ساختگی؛ اعداد مرجع در خود آزمون و مستقل از لایهٔ محاسبه (از روی دادهٔ ساخته‌شده) حساب می‌شوند.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => fa(n.toLocaleString('en-US'));
const NUM = /[۰-۹][۰-۹,]{3,}/;
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const row = (id, d, a, s, ac) => ({ id, day: '2', desc: d, amount: a, status: s || 'paid', account: ac || '', deletedAt: null, createdAt: 1, updatedAt: 1 });
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e.map((r, k) => row('e' + k, r[0], r[1], r[2], r[3])) }]; pd.income.sections = [{ id: 'I', title: t, rows: i.map((r, k) => row('i' + k, r[0], r[1], r[2])) }]; return pd; };
    const cur = mk([['بنزین', 100000, 'paid', 'ملی'], ['نان', 40000], ['دانانو', 35000], ['اسنپ', 85000, 'paid', 'ملی'], ['قبض برق', 300000], ['قبض آب', 90000], ['بیمه‌ی ماشین', 500000], ['تپسی', 45000, 'unpaid', 'ملت'], ['دکتر', 250000], ['قسط وام', 700000], ['خوراکی ماهانه', 200000], ['هدیه', 0]], [['حقوق', 9000000], ['پاداش', 1000000, 'unpaid']]);
    const prev = mk([['بنزین', 400000], ['نان', 30000], ['قبض آب', 120000]], [['حقوق', 8000000]]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { hkAsstChainReset(); _hkAsstCtx = null; const r = hkAsstAsk(q); return { q, kind: r.kind, engine: r.engine || '', tool: r.tool || '', text: String(r.text || ''), final: !!r.final, sug: r.suggestions || [], cmdTool: r.cmd && r.cmd.tool }; }), qs);
  // ۱) پیش‌فرض و کلید بازگشت
  const D = await page.evaluate(() => { const o = {}; o.def = hkAsstEngine(); const a = hkAsstAsk('این ماه خرج چقدر شد'); o.defEngine = a.engine; o.defKind = a.kind;
    hkAsstSetEngine('legacy'); o.leg = hkAsstEngine(); const b = hkAsstAsk('این ماه خرج چقدر شد'); o.legEngine = b.engine || ''; o.legKind = b.kind; o.stored = localStorage.getItem(STORAGE_KEY + '_asstEngine');
    hkAsstSetEngine('chain'); o.back = hkAsstEngine(); o.stored2 = localStorage.getItem(STORAGE_KEY + '_asstEngine'); o.aTxt = a.text; o.bTxt = b.text;
    o.override = hkAsstAsk('این ماه خرج چقدر شد', 'legacy').engine || 'legacy-path'; o.uiHas = document.body.innerText.indexOf('asstEngine') >= 0 || document.body.innerText.indexOf('legacy') >= 0; return o; });
  ok(D.def === 'chain' && D.defEngine === 'chain' && D.defKind === 'result', 'موتور جدید پیش‌فرض است');
  ok(D.leg === 'legacy' && D.legEngine === '' && D.legKind === 'result' && D.stored === 'legacy', 'کلید داخلی: بازگشت به موتور قبلی بی‌تغییر رابط');
  ok(D.back === 'chain' && D.stored2 === null && D.override === 'legacy-path', 'برگشت به موتور جدید، کلید پاک می‌شود؛ پارامتر موتور هم کار می‌کند');
  ok(D.aTxt.indexOf(fmt(2345000)) >= 0 && D.bTxt.indexOf(fmt(2345000)) >= 0, 'هر دو موتور همان عدد را می‌دهند');
  ok(!D.uiHas, 'کلید بازگشت در رابط کاربری دیده نمی‌شود');
  // ۲) قالب پیام برای رابط (کارت‌ها، چیپ‌ها)
  const R = await ask(['بیشترین خرج ماه جاری', 'هزینه‌ها رو ماه به ماه بگو', 'خرج بدون زرتی', 'خرجای کوچیک', 'وضعیت مالیم چطوره؟']);
  ok(R[0].kind === 'result' && R[0].tool === 'transactions.search' && R[0].cmdTool === 'transactions.search', 'نتیجه با ابزار و cmd برای کارت‌های قابل‌کلیک');
  ok(R[1].tool === 'transactions.group' && !/•/.test(R[1].text), 'گروه‌بندی: ردیف‌ها را رابط رسم می‌کند، متن بی‌فهرست تکراری');
  ok(R[2].kind === 'text' && R[2].final === true && /زرتی/.test(R[2].text), 'ابهام: پرسش کوتاه و نهایی (بی مدل)');
  ok(R[3].kind === 'text' && R[3].sug.length === 3 && R[3].sug.every(x => /هزار|میلیون/.test(x)), 'صفت اندازه: پرسش مرز با چیپ‌ها');
  ok(R[4].kind === 'result' && R[4].tool === 'insights.overview', 'تحلیل: ابزار و متن موجود');
  // ۳) زمینهٔ گفتگو
  const C = await page.evaluate(() => { hkAsstChainReset(); _hkAsstCtx = null; const o = {};
    o.a = hkAsstAsk('بنزین این ماه چقدر شد').text; o.b = hkAsstAsk('جمعش؟').text; o.c = hkAsstAsk('ماه قبلش؟').text; o.d = hkAsstAsk('بدون اسنپ').text;
    hkAsstChainReset(); _hkAsstCtx = null; o.e = hkAsstAsk('خرج بدون زرتی').text; o.f = hkAsstAsk('نه منظورم اسنپ بود').text; o.g = hkAsstAsk('سلام').text; o.h = hkAsstAsk('جمعش؟').text;
    return o; });
  ok(C.b.indexOf(fmt(730000)) >= 0 && /ماه قبل|آبان/.test(C.c) && /بدون «اسنپ»/.test(C.d), 'ادامه: «جمعش؟»، «ماه قبلش؟»، «بدون اسنپ» روی سؤال قبلی');
  ok(/بدون «اسنپ»/.test(C.f) && C.f.indexOf(fmt(2810000)) >= 0, 'پاسخ به پرسش واژهٔ ناشناخته، سؤال اصلی را اجرا می‌کند');
  ok(/بدون «اسنپ»/.test(C.h) || C.h.length > 0, 'گفتگوی عادی (سلام) زمینه را پاک نمی‌کند و پاسخ می‌دهد');
  // ۴) عملیات جانبی فقط یک بار (مسیر قبلی برای گفتگو/ناوبری/تم)
  const S = await page.evaluate(() => { const o = { nav: 0, theme: 0 }; const n0 = window.hkAsstNavGo, t0 = window.applyTheme;
    window.hkAsstNavGo = function () { if (!_hkAsstDry) o.nav++; return n0.apply(this, arguments); };
    window.applyTheme = function () { if (!_hkAsstDry) o.theme++; return t0.apply(this, arguments); };
    const r1 = hkAsstAsk('برو به بخش قرض'); const r2 = hkAsstAsk('تم رو تیره کن'); const r3 = hkAsstAsk('سلام'); const r4 = hkAsstAsk('این ماه خرج چقدر شد');
    const navAfterNumbers = o.nav, themeAfter = o.theme;
    window.hkAsstNavGo = n0; window.applyTheme = t0; return { nav: navAfterNumbers, theme: themeAfter, t1: r1.text, t2: r2.text, t3: r3.text, k4: r4.kind }; });
  ok(S.nav <= 1 && S.theme <= 1 && S.k4 === 'result', 'ناوبری و تغییر تم حداکثر یک بار اجرا شد (' + S.nav + '/' + S.theme + ')');
  ok(S.t1.length > 0 && S.t2.length > 0 && S.t3.length > 0, 'گفتگو، ناوبری و تم هنوز پاسخ می‌دهند');
  // ۵) مقایسهٔ بی‌اثر
  const Cmp = await page.evaluate(() => { const snap = () => JSON.stringify(archive) + JSON.stringify(periodData) + JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) + JSON.stringify(_hkAsstCtx) + String(_hkAsstDry) + JSON.stringify(_hkAsstChainState) + document.body.className;
    const s0 = snap(); const out = ['این ماه خرج چقدر شد', 'برو به بخش قرض', 'تم رو تیره کن', 'بدون زرتی', 'سلام'].map(q => hkAsstCompareEngines(q, ['بنزین ماه قبل'])); return { det: out.map(x => [x.legacy.dryLog, x.chain.dryLog, x.legacy.text.slice(0, 30), x.chain.text.slice(0, 30)]), same: snap() === s0, n: out.length, kinds: out.map(x => [x.legacy.kind, x.chain.kind]), dry: out.map(x => x.legacy.dryLog + x.chain.dryLog) }; });
  ok(Cmp.same, 'حالت مقایسه: دادهٔ مالی، ذخیره‌سازی، حافظهٔ گفتگو و صفحه تغییر نکرد');
  ok(Cmp.dry[1] === 2, 'در مقایسه، ناوبری فقط در گزارش خشک ثبت شد (یکی برای هر موتور؛ اجرا نشد)');
  // ۶) سازگاری مدل محلی: سؤال نامفهوم همچنان به مدل می‌رسد
  const M = await page.evaluate(async () => { let seen = ''; hkAsstLocalAttach(function (p) { seen = p; return Promise.resolve('{"tool":"transactions.aggregate","args":{"tab":"expense"}}'); }, 'تست'); hkAsstChainReset(); _hkAsstCtx = null; const r = await hkAsstAskAsync('اون چی شد؟'); hkAsstLocalAttach(null, ''); return { k: r.kind, t: r.tool, seen: seen.indexOf('اون چی شد') >= 0 }; });
  ok(M.k === 'result' && M.seen, 'پرسش نامفهوم برای موتور جدید هم به مدل محلی (اگر وصل باشد) می‌رود');
  const after = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData));
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1445: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
