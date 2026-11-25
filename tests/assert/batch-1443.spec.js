// ۱.۴.۴۵ — مرحلهٔ ۳: تطبیق ساختار استاندارد (hkAsstAnalyze) با دادهٔ واقعی (hkAsstMatch): هر شرط چگونه و روی چه داده‌ای اعمال شد؛ واژهٔ ناشناخته؛ دسته/ردیف؛ عبارت چندواژه‌ای؛ بدون جمع و بدون حذف بی‌صدا.
// فقط دادهٔ ساختگی؛ مرحلهٔ ۳ هیچ مبلغی جمع نمی‌زند: جمعِ ردیف‌های انتخاب‌شده فقط در خود آزمون و مستقل از ماتچر حساب می‌شود.
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
  /* تحلیل → تطبیق؛ جمع مبلغِ ردیف‌های انتخاب‌شده فقط اینجا (مستقل از ماتچر) */
  const mt = (qs) => page.evaluate((qs) => { const byRef = {}; hkAsstRows().forEach(r => { byRef[hkAsstMatchRefKey(r)] = [r.amount, r.desc, r.key]; });
    const rk = (r) => hkAsstMatchRefKey({ key: r.key, secId: r.sec, idx: r.idx, tab: r.tab, id: r.id });
    const sm = (refs) => refs.reduce((s, r) => s + (byRef[rk(r)] || [0])[0], 0), ds = (refs) => refs.map(r => (byRef[rk(r)] || [0, '?'])[1]);
    return qs.map(q => { let prev = null; const arr = Array.isArray(q) ? q : [q]; let sp, m; arr.forEach(t => { sp = hkAsstAnalyze(t, { prev }); m = hkAsstMatch(sp); if (m.resume && m.status === 'clarify') sp.resume = m.resume; prev = sp; });
      return { q: arr[arr.length - 1], sp, m, sum: sm(m.selection.refs), descs: ds(m.selection.refs), altSums: m.readings.alternatives.map(a => sm(a.refs)), altWords: m.readings.alternatives.map(a => a.word) }; }); }, qs);
  const before = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData) + JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
  const cond = (r, slot, value) => r.m.conditions.filter(c => c.slot === slot && (value === undefined || String(c.value) === String(value)))[0];
  // ۱) قرارداد خروجی
  const C = await mt(['خرج این ماه چقدر شد', 'نان چقدر شد', 'خرج بدون زرتی', 'برو به بخش قرض', 'سلام']);
  const KEYS = ['v', 'stage', 'status', 'source', 'exec', 'selection', 'conditions', 'readings', 'clarification', 'gaps', 'warnings', 'app_actions', 'data_coverage', 'closed_data_decisions', 'open_data_decisions', 'resume', 'trace'];
  ok(C.every(r => KEYS.every(k => k in r.m) && r.m.v === 1 && r.m.stage === 3), 'همهٔ کلیدهای قرارداد خروجی مرحلهٔ ۳ هست');
  ok(C.every(r => JSON.stringify(JSON.parse(JSON.stringify(r.m))) === JSON.stringify(r.m)), 'خروجی JSON-پذیر');
  ok(C.every(r => !('sum' in r.m) && !('total' in r.m) && !('average' in r.m) && !('count' in r.m) && !('sum' in r.m.selection) && !('total' in r.m.selection)), 'هیچ جمع/میانگین/تعداد مبلغی در خروجی ماتچر نیست؛ فقط مرجع ردیف‌ها');
  ok(C[0].m.status === 'ready' && C[0].m.exec.tool === 'transactions.aggregate' && C[0].m.selection.refs.length > 0 && C[0].m.selection.refs.every(r => 'id' in r && 'key' in r && 'sec' in r && 'idx' in r), 'ready + ابزار + مرجع ردیف‌ها');
  ok(C[2].m.status === 'clarify' && C[3].m.status === 'navigate' && C[4].m.status === 'chat', 'وضعیت‌های clarify / navigate / chat');
  ok(C.filter(r => r.m.status === 'ready').every(r => r.m.trace.length > 0 && r.m.conditions.length >= 1), 'ردیابی و شرط‌ها برای هر ready');
  // ۲) تطبیق و عدم تطبیق هر فیلتر + هیچ شرطی بی‌علامت حذف نمی‌شود
  const F = await mt(['خرج این ماه', 'درآمد این ماه', 'خرج ماه قبل', 'خرج زیر ۱۰۰ هزار این ماه', 'خرج بالای ۴۰۰ هزار', 'چقدر هنوز نپرداختم؟', 'فقط ردیف‌های بنزین', 'خرج بدون بنزین این ماه', 'خرج به‌جز قسط وام این ماه', 'خرج بدون دستهٔ حمل‌ونقل این ماه']);
  ok(F[0].sum === 100000 + 40000 + 35000 + 85000 + 300000 + 90000 + 500000 + 45000 + 250000 + 700000 + 200000 && F[0].m.selection.incomplete_refs.length === 1 && F[0].descs.indexOf('هدیه') < 0, 'نوع+زمان: هزینهٔ ماه جاری؛ ردیف بی‌مبلغ «هدیه» جدا در incomplete_refs');
  ok(F[1].sum === 10000000 && F[2].sum === 400000 + 30000 + 120000, 'درآمد ماه جاری؛ هزینهٔ ماه قبل (تطبیق زمان)');
  ok(F[3].descs.every(d => ['بنزین', 'نان', 'دانانو', 'اسنپ', 'تپسی', 'قبض آب'].indexOf(d) >= 0) && cond(F[3], 'amount.max').hits === 6 && F[4].descs.indexOf('نان') < 0 && cond(F[4], 'amount.min').hits >= 1, 'مبلغ: زیر/بالای مرز؛ عدم تطبیق کنار می‌رود');
  ok(F[5].descs.join() === 'تپسی' && cond(F[5], 'include.status', 'unpaid').hits === 1, '«نپرداختم»: فقط ردیف پرداخت‌نشده (تپسی)');
  ok(F[6].descs.join() === 'بنزین,بنزین' && cond(F[6], 'include.terms', 'بنزین').hits === 2, 'واژه: فقط ردیف‌های «بنزین» در همهٔ ماه‌ها');
  ok(F[7].descs.indexOf('بنزین') < 0 && cond(F[7], 'exclude.terms', 'بنزین').removed_hits === 1 && cond(F[7], 'exclude.terms', 'بنزین').outcome === 'applied', 'نفی: «بدون بنزین» کنار گذاشت و شمار کنارگذاشته‌شده ثبت شد');
  ok(F[8].descs.indexOf('قسط وام') < 0 && cond(F[8], 'exclude.terms', 'قسط وام').outcome === 'applied', 'استثنا: «به‌جز قسط وام» (عبارت دوکلمه‌ای)');
  ok(F[9].descs.indexOf('بنزین') < 0 && F[9].descs.indexOf('اسنپ') < 0 && F[9].descs.indexOf('تپسی') < 0 && F[9].descs.indexOf('بیمه‌ی ماشین') < 0 && cond(F[9], 'exclude.cats', 'transport').removed_hits === 4, 'استثنای دسته: همهٔ حمل‌ونقل کنار رفت');
  // هیچ شرطی بی‌علامت حذف نمی‌شود: هر شرطِ spec در conditions آمده
  const covered = (r) => { const s = r.sp.slots, c = r.m.conditions.map(x => x.slot + '|' + x.value); const need = []; (s.include.terms || []).forEach(t => need.push('include.terms|' + t)); (s.include.any_terms || []).forEach(t => need.push('include.any_terms|' + t)); (s.include.cats || []).forEach(t => need.push('include.cats|' + t)); (s.exclude.terms || []).forEach(t => need.push('exclude.terms|' + t)); (s.exclude.cats || []).forEach(t => need.push('exclude.cats|' + t)); if (s.include.status) need.push('include.status|' + s.include.status); Object.keys(s.amount).forEach(k => need.push('amount.' + k + '|' + s.amount[k])); return need.every(n => c.indexOf(n) >= 0) && (!r.sp.tab || r.m.conditions.some(x => x.slot === 'tab')) && (!r.sp.time.explicit || r.m.conditions.some(x => x.slot === 'time')); };
  ok(F.every(covered), 'هر شرط spec (واژه/دسته/نفی/مبلغ/وضعیت/نوع/زمان) با نتیجه در conditions آمده؛ هیچ شرطی بی‌علامت حذف نشد');
  // ۳) واژهٔ کامل و عبارت چندواژه‌ای
  const W = await mt(['فقط ردیف‌های نان این ماه', 'دانانو این ماه', 'خرج بدون نان این ماه', 'نان و دانانو این ماه', 'قبض برق این ماه', 'فقط ردیف‌های قبض', 'بیمه ماشین', 'فقط ردیف‌های نانا']);
  ok(W[0].descs.join() === 'نان' && W[0].sum === 40000, '«نان» ≠ «دانانو» (واژهٔ کامل)');
  ok(W[1].descs.join() === 'دانانو' && W[2].descs.indexOf('دانانو') >= 0 && W[2].descs.indexOf('نان') < 0, '«دانانو» جدا؛ «بدون نان» دانانو را نگه می‌دارد');
  ok(W[3].descs.slice().sort().join() === 'دانانو,نان', 'اجتماع «نان و دانانو» هر دو، هر ردیف یک بار');
  ok(W[4].descs.join() === 'قبض برق' && W[4].m.closed_data_decisions.some(c => /row_phrase:قبض برق/.test(c.decision) && c.outcome === 'phrase_in_rows'), 'عبارت چندواژه‌ای «قبض برق» با ردیف تطبیق خورد و تصمیم داده بسته شد');
  ok(W[5].descs.indexOf('قبض برق') >= 0 && W[5].descs.indexOf('قبض آب') >= 0, '«قبض» واژهٔ کامل در هر دو ردیف قبض');
  ok(W[6].descs.join() === 'بیمه‌ی ماشین', '«بیمه ماشین» با «بیمه‌ی ماشین» (نیم‌فاصله) تطبیق خورد');
  ok(W[7].descs.join() === 'نان,نان', 'عامیانهٔ «نانا» با ریشه «نان» تطبیق می‌خورد');
  // ۴) دسته در برابر ردیف (و نوع از مترادف)
  const D = await mt(['نان چقدر شد؟', 'بنزین این ماه', 'خوراکی این ماه', 'حقوق این ماهم', 'فقط ردیف‌های بنزین این ماه']);
  ok(D[0].m.readings.primary === 'category' && D[0].m.readings.alternatives.length === 1 && D[0].altWords[0] === 'نان' && D[0].altSums[0] === 70000 && D[0].m.readings.alternatives[0].disclose === true, '«نان»: پیش‌فرض دسته؛ خوانش ردیف «نان» (۷۰٬۰۰۰) برای افشا');
  ok(D[0].sum === 40000 + 35000 + 200000 + 30000 && D[0].descs.indexOf('خوراکی ماهانه') >= 0, 'دسته: ردیفِ دارای نام دسته در شرح («خوراکی ماهانه») هم هست');
  ok(D[1].m.readings.alternatives.length === 1 && D[1].altSums[0] === 100000 && D[1].sum === 100000 + 85000 + 45000 + 500000, '«بنزین این ماه»: دستهٔ حمل‌ونقل + جایگزین فقط بنزین ۱۰۰٬۰۰۰');
  ok(D[2].m.readings.alternatives.length === 0 && D[2].sum === 40000 + 35000 + 200000, '«خوراکی» نام خود دسته است: جایگزین ردیف ندارد');
  ok(D[3].m.readings.primary === 'tab_total' && D[3].altWords[0] === 'حقوق' && D[3].altSums[0] === 9000000 && D[3].sum === 10000000, '«حقوق»: پیش‌فرض کل درآمد؛ جایگزین فقط ردیف حقوق (۹٬۰۰۰٬۰۰۰)');
  ok(D[4].m.readings.alternatives.length === 0 && D[4].descs.join() === 'بنزین', 'با نشانهٔ «ردیف»: فقط ردیف بنزین، بی جایگزین');
  ok([D[0], D[1], D[3]].every(r => r.m.open_data_decisions.length === 0 && r.m.closed_data_decisions.length > 0), 'تصمیم‌های data_dependent بسته شد؛ هیچ‌کدام باز نماند');
  // ۵) واژهٔ ناشناخته، جست‌وجوی صریح، داده و زمان
  const U = await mt(['خرج بدون زرتی', 'فقط گلابتون', 'برنج و گلابتون', 'خرج بدون ماهی قرمز', 'سرچ کن گلابتون', 'خرج پارسال', 'ماه قبل درآمد', 'اسنب این ماه']);
  ok(U[0].m.status === 'clarify' && U[0].m.clarification.reason === 'unknown_term' && U[0].m.clarification.term === 'زرتی' && U[0].m.resume.term === 'زرتی' && U[0].m.selection.refs.length === 0, 'ناشناخته در «بدون»: clarify، بی ردیف، با resume');
  ok(U[1].m.clarification.term === 'گلابتون' && U[2].m.clarification.term === 'برنج' && U[2].m.exec === null, 'ناشناخته در «فقط» و در فهرست «و»: پرسش');
  ok(U[3].m.clarification.term === 'ماهی قرمز', 'عبارتِ کاملاً ناشناخته یک‌جا پرسیده می‌شود');
  ok(U[4].m.status === 'ready' && U[4].m.selection.empty && U[4].m.warnings.some(w => w.code === 'explicit_search_unknown_term'), 'جست‌وجوی صریح: ready با انتخاب خالی و هشدار (پاسخ «پیدا نکردم» با مرحلهٔ ۴)');
  ok(U[5].m.status === 'ready' && U[5].m.selection.empty && U[5].m.data_coverage.requested_period_has_rows === false && cond(U[5], 'time').outcome === 'no_rows', 'بازهٔ بی‌داده: ready با انتخاب خالی و علامت no_rows (نه عدد، نه پرسش)');
  ok(U[6].m.status === 'ready' && U[6].sum === 8000000 && U[6].m.data_coverage.periods_with_rows.length === 2, 'پوشش داده: ماه‌های دارای ردیف');
  ok(U[7].m.status === 'clarify' && U[7].m.clarification.reason === 'unknown_term' && U[7].m.clarification.term === 'اسنب', 'غلط املایی بی‌اصلاحِ داده: پرسش (اصلاح بی‌صدا نمی‌شود)');
  // ۶) دادهٔ خالی
  const E = await page.evaluate(() => { const a = archive, p = periodData; archive = {}; periodData = emptyPeriodData(); const o = ['خرج این ماه', 'نان چقدر شد', 'خرج بدون زرتی', 'سرچ کن نان'].map(t => { const m = hkAsstMatch(hkAsstAnalyze(t)); return { s: m.status, e: m.selection.empty, c: m.clarification && m.clarification.reason, any: m.data_coverage && m.data_coverage.has_any_rows }; }); archive = a; periodData = p; return o; });
  ok(E[0].s === 'ready' && E[0].e === true && E[0].any === false, 'دادهٔ خالی: ready با انتخاب خالی (نه خطا)');
  ok(E[2].s === 'clarify' && E[2].c === 'unknown_term' && E[3].s === 'ready', 'دادهٔ خالی: واژه ناشناخته می‌ماند؛ جست‌وجوی صریح خالی');
  // ۷) مرحلهٔ ۳ فقط spec را می‌خواند و متن خام را دوباره تفسیر نمی‌کند
  const R = await page.evaluate(() => { const sp = hkAsstAnalyze('خرج بدون بنزین این ماه'); const a = hkAsstMatch(sp); const sp2 = JSON.parse(JSON.stringify(sp)); sp2.text = 'چیز دیگری'; sp2.normalized = 'چیز دیگری'; const b = hkAsstMatch(sp2); const strip = (m) => JSON.stringify([m.status, m.exec, m.selection, m.conditions]); return strip(a) === strip(b); });
  ok(R, 'با عوض‌کردن کامل متنِ خام در spec، نتیجه عوض نمی‌شود (متن فقط برای ساخت پیشنهاد)');
  const H = await page.evaluate(() => { const base = hkAsstAnalyze('خرج این ماه'); const mk = (f) => { const s = JSON.parse(JSON.stringify(base)); f(s); return hkAsstMatch(s); };
    const acct = mk(s => { s.binding.args.account = 'ملی'; s.slots.include.account = 'ملی'; }), noAcct = mk(s => { s.binding.args.account = 'ناموجود'; s.slots.include.account = 'ناموجود'; }), noProj = mk(s => { s.binding.args.project = 'پروژهٔ خیالی'; s.slots.include.project = 'پروژهٔ خیالی'; }), gap = mk(s => { s.gaps.push({ code: 'multi_part' }); });
    return { acct: [acct.status, acct.selection.refs.length, acct.conditions.some(c => c.slot === 'include.account' && c.outcome === 'resolved')], noAcct: [noAcct.status, noAcct.clarification && noAcct.clarification.reason], noProj: [noProj.status, noProj.clarification && noProj.clarification.reason], gap: gap.gaps.map(g => g.code) }; });
  ok(H.acct[0] === 'ready' && H.acct[1] === 2 && H.acct[2], 'حساب (دستی‌ساخته): فقط ردیف‌های آن حساب (بنزین و اسنپ در «ملی» + بدون تپسی «ملت»)');
  ok(H.noAcct[0] === 'clarify' && H.noAcct[1] === 'unknown_account' && H.noProj[0] === 'clarify' && H.noProj[1] === 'unknown_project', 'حساب/پروژهٔ ناموجود: clarify');
  ok(H.gap.indexOf('multi_part') >= 0, 'gap تحلیل‌گر بی‌تغییر منتقل می‌شود');
  // ۸) پاس‌دادن وضعیت‌های بی‌نیاز از داده + ابزارهای تحلیلی
  const P = await mt(['موجودیم چقدره؟', 'قیمت دلار چنده؟', 'هر دسته چقدر خرج شد؟', 'خرجای کوچیک چقدر شد', 'این ماه رو با ماه قبل مقایسه کن']);
  ok(P[0].m.status === 'ready' && P[0].m.selection.basis === 'tool' && P[0].m.exec.tool === 'insights.balance', 'ابزار تحلیلی: ready، ردیف‌گزینی با خود ابزار');
  ok(P[1].m.status === 'refuse' && P[1].m.clarification.reason === 'market_price', 'بیرون از قابلیت: refuse با همان دلیل');
  ok(P[2].m.gaps.some(g => g.code === 'group_by_category') && P[3].m.status === 'clarify' && P[3].m.clarification.reason === 'vague_size', 'gap و پرسش vague_size منتقل شد');
  ok(P[4].m.exec.tool === 'reports.compare', 'مقایسه به ابزار خودش می‌رود');
  // ۹) ادامهٔ گفتگو و resume
  const Q = await mt([['خرج این ماه چقدر شد؟', 'فقط ردیف‌های بنزین'], ['بنزین این ماه چقدر شد؟', 'جمعش؟'], ['خرج بدون زرتی', 'نه منظورم اسنپ بود'], ['خرجای کوچیک بدون بنزین', 'زیر ۵۰ هزار']]);
  ok(Q[0].descs.join() === 'بنزین' && Q[0].sp.time.rel === 'this_month', 'ادامه: بازه حفظ، فقط ردیف‌های بنزین این ماه');
  ok(Q[1].m.readings.alternatives.length === 1 && Q[1].altWords[0] === 'بنزین' && Q[1].altSums[0] === 100000 && Q[1].sum === 730000, 'ادامهٔ «جمعش؟»: خوانش دسته/ردیف از spec قبلی ارث می‌رسد');
  ok(Q[2].m.status === 'ready' && Q[2].descs.indexOf('اسنپ') < 0 && Q[2].sum > 0, 'پاسخ «نه منظورم اسنپ بود» بعد از پرسش ماتچر: «بدون اسنپ»');
  ok(Q[3].m.status === 'ready' && Q[3].descs.indexOf('بنزین') < 0 && Q[3].descs.every(d => ['نان', 'دانانو', 'اسنپ', 'تپسی'].indexOf(d) >= 0), 'پاسخ «زیر ۵۰ هزار»: مرز و «بدون بنزین» با هم روی داده');
  // ۱۰) اثر جانبی و دادهٔ مالی
  const after = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData) + JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
  ok(before === after, 'دادهٔ مالی، ذخیره‌سازی و حالت برنامه تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1443: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
