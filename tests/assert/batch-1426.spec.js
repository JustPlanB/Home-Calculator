// ۱.۴.۳۷ — مجموعهٔ سؤال‌های روزمره: هزاران سؤال فارسی (نیت × عبارت × جای خالی، از tests/lib/assistant-corpus.js)
// باید به ابزار و آرگومان‌های درست برسند. همچنین چند ابزار تحلیلی روی دادهٔ ساختگی جواب معنادار می‌دهند. فقط داده ساختگی.
const { chromium } = require('playwright');
const path = require('path');
const { build } = require('../lib/assistant-corpus');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const items = build();
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);

  console.log('• مجموعهٔ سؤال‌ها (' + items.length + ' سؤال)');
  const res = await page.evaluate((items) => {
    const cy = currentYear, cm = currentMonth, pm = cm === 1 ? 12 : cm - 1, pmy = cm === 1 ? cy - 1 : cy;
    const R = v => v === '$cy' ? cy : v === '$cm' ? cm : v === '$py' ? cy - 1 : v === '$pm' ? pm : v === '$py_m' ? pmy : v;
    const norm = s => String(s).replace(/[‌]/g, ' ');
    const fails = [];
    items.forEach(it => {
      let c; try { c = hkAsstParse(it.q); } catch (e) { fails.push({ q: it.q, kind: it.kind, why: 'throw ' + e.message }); return; }
      if (it.tool === 'ask') { if (!(c.ask && c.final)) fails.push({ q: it.q, kind: it.kind, why: 'got ' + (c.tool || 'ask-nonfinal') }); else if (it.re && !new RegExp(it.re).test(c.ask)) fails.push({ q: it.q, kind: it.kind, why: 'reply ' + c.ask.slice(0, 60) }); return; }
      if (c.tool !== it.tool) { fails.push({ q: it.q, kind: it.kind, why: 'tool ' + (c.tool || 'ask') }); return; }
      for (const k of Object.keys(it.a)) {
        const want = R(it.a[k]), got = (c.args || {})[k];
        let good;
        if (want === '*') good = got != null;
        else if (Array.isArray(want)) good = Array.isArray(got) && want.every(x => got.indexOf(x) >= 0);
        else good = norm(got) === norm(want);
        if (!good) { fails.push({ q: it.q, kind: it.kind, why: 'arg ' + k + ' want ' + want + ' got ' + JSON.stringify(got) }); return; }
      }
    });
    return { n: items.length, fails };
  }, items);
  const kinds = {}; items.forEach(i => { kinds[i.kind] = (kinds[i.kind] || 0) + 1; });
  const rate = 1 - res.fails.length / res.n;
  res.fails.slice(0, 12).forEach(f => console.log('    ✗ [' + f.kind + '] ' + f.q + ' ← ' + f.why));
  ok(res.n >= 2000 && Object.keys(kinds).length >= 14, 'مجموعه بزرگ و متنوع است: ' + res.n + ' سؤال در ' + Object.keys(kinds).length + ' دسته (' + Object.keys(kinds).map(k => k + ':' + kinds[k]).join('، ') + ')');
  ok(res.fails.length === 0, 'همهٔ سؤال‌ها به ابزار و آرگومان درست می‌رسند (' + (res.n - res.fails.length) + ' از ' + res.n + ')');

  console.log('• ابزارهای تحلیلی روی دادهٔ ساختگی');
  const A = await page.evaluate(() => {
    const cy = currentYear, cm = currentMonth;
    archive = {};
    const mk = (inc, exps, y, m) => {
      const pd = emptyPeriodData();
      if (!pd.expense.sections.length) pd.expense.sections.push({ id: 'S1', title: 'خرج', rows: [] });
      if (!pd.income.sections.length) pd.income.sections.push({ id: 'I1', title: 'درآمد', rows: [] });
      inc.forEach((r, i) => pd.income.sections[0].rows.push(Object.assign(emptyRow('income'), { id: 'i' + y + m + i, desc: r[0], amount: r[1], day: r[2], status: 'paid' })));
      exps.forEach((r, i) => pd.expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { id: 'e' + y + m + i, desc: r[0], amount: r[1], day: r[2], status: 'paid' })));
      return pd;
    };
    for (let k = 3; k >= 0; k--) {
      const i = cy * 12 + cm - 1 - k, y = Math.floor(i / 12), m = i % 12 + 1;
      const exps = [['قسط وام', 8000000, 5], ['خرید سوپرمارکت', 3000000 + (3 - k) * 400000, 7], ['بنزین', 1200000, 9], ['قبض برق', 900000, 12], ['اشتراک ماهانه', 450000, 14], ['سینما', 600000 + (3 - k) * 300000, 18], ['لباس', 2500000, 20]];
      for (let j = 0; j < 12; j++) exps.push(['خرید ریز ' + j, 60000 + j * 5000, 1 + j]);
      if (k === 0) exps.push(['خرید گوشی موبایل', 25000000, 10]);
      const pd = mk([['حقوق', 50000000, 1]], exps, y, m);
      if (k === 0) periodData = pd; else archive[periodKey(y, m)] = pd;
    }
    const q = t => hkAsstAsk(t);
    return { ov: q('گزارش کامل وضعیت مالیم'), adv: q('چطور می‌تونم کمتر خرج کنم؟'), fc: q('آخر ماه چقدر خرج می‌کنم؟'), top: q('پولم کجا میره؟'), tr: q('روند هزینه‌هام چطوره؟'),
      bud: q('بودجه پیشنهاد بده'), goal: q('برای ۲۰۰ میلیون پس‌انداز چند ماه طول می‌کشه؟'), goal2: q('تا یک سال دیگه ۱۰۰ میلیون می‌خوام'), day: q('امروز چقدر می‌تونم خرج کنم؟'),
      an: q('خرج غیرعادی داشتم؟'), rec: q('خرج‌های ثابتم کدوما هستن؟'), hi: q('سلام. خوبی؟'), chg: q('این ردیف رو پاک کن'), help: q('چه کارایی بلدی؟'),
      yr: q('سال ۴۰۳ چقدر خرج کردم؟'), empty: q('بنزین پارسال چقدر شد؟') };
  });
  const T = k => (A[k] && A[k].text) || '';
  ok(A.ov.kind === 'result' && /درآمد: ۵۰ میلیون/.test(T('ov')) && /هزینه:/.test(T('ov')) && /نرخ پس‌انداز/.test(T('ov')), 'وضعیت مالی: درآمد، هزینه و نرخ پس‌انداز با عدد درست');
  ok(/دیجیتال|اقساط/.test(T('ov')) && /بزرگ‌ترین خرجت «خرید گوشی موبایل»/.test(T('ov')), 'وضعیت مالی: بیشترین دسته‌ها و بزرگ‌ترین خرج را می‌گوید');
  ok(/•/.test(T('adv')) && /(صرفه‌جویی|کنار|خرج)/.test(T('adv')) && (A.adv.suggestions || []).length >= 2, 'پیشنهاد: چند نکتهٔ مشخص با عدد و گام‌های بعدی (چیپ) دارد');
  ok(/تا امروز/.test(T('fc')) && /آخر ماه/.test(T('fc')) && /مانده/.test(T('fc')), 'پیش‌بینی آخر ماه: خرج تا امروز، برآورد و مانده');
  ok(/۱\./.test(T('top')) && /٪/.test(T('top')), 'پولم کجا میره: فهرست دسته‌ها با درصد');
  ok(/•/.test(T('tr')) && /(ماه آخرت|روند)/.test(T('tr')), 'روند: چند ماه با مبلغ و مقایسهٔ ماه آخر');
  ok(/۵۰\/۳۰\/۲۰/.test(T('bud')) && /پس‌انداز/.test(T('bud')) && /سقف/.test(T('bud')), 'بودجه: قاعدهٔ ۵۰/۳۰/۲۰ و سقف پیشنهادی دسته‌ها');
  ok(/ماه/.test(T('goal')) && /۲۰۰ میلیون/.test(T('goal')) && /طول می‌کشه/.test(T('goal')), 'هدف بی‌مدت: چند ماه طول می‌کشد');
  ok(/ماهی/.test(T('goal2')) && /(شدنیه|می‌رسی)/.test(T('goal2')) && /۱۲ ماه/.test(T('goal2')), 'هدف با مدت: چقدر ماهانه لازم است و شدنی هست یا نه');
  ok(/(مونده|نمونده)/.test(T('day')) && /خرج/.test(T('day')), 'امروز چقدر می‌تونم خرج کنم: مانده و سهم روزانه');
  ok(/خرید گوشی موبایل/.test(T('an')), 'خرج غیرعادی: خرج بسیار بزرگ را پیدا می‌کند');
  ok(/(قسط وام|اشتراک ماهانه)/.test(T('rec')) && /ثابت/.test(T('rec')), 'خرج‌های ثابت: قسط و اشتراکِ هر ماه را پیدا می‌کند');
  ok(A.hi.kind === 'text' && T('hi').length > 15 && A.hi.final === true, 'سلام و احوال‌پرسی: پاسخ خودمونی بی‌نیاز از مدل');
  ok(/(بخونم|می‌خونم|دست من نیست|اجازهٔ تغییر|نگاه می‌کنم)/.test(T('chg')) && A.chg.final === true, 'درخواست حذف/ثبت: مؤدبانه رد می‌شود (با قالب‌های متنوع)');
  ok(/می‌تونم این کارها رو/.test(T('help')) && /تحلیل/.test(T('help')), 'چه کارایی بلدی: فهرست قابلیت‌ها');
  ok(A.yr.kind === 'result' && /۱۴۰۳/.test(T('yr')), '«سال ۴۰۳» یعنی ۱۴۰۳');
  ok(/پیدا نشد/.test(T('empty')) || A.empty.kind === 'result', 'سؤال بی‌نتیجه جواب انسانی می‌دهد');
  console.log('• احوال‌پرسی: جواب زنده و متنوع');
  const V = await page.evaluate(() => {
    const uniq = (kind, codes, text, n) => { const s = {}; for (let i = 0; i < n; i++) s[hkAsstChatReply(kind, codes, text)] = 1; return Object.keys(s).length; };
    const now = hkAsstNow();
    const fmt = (o, k) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', o).formatToParts(new Date()).filter(p => p.type === k)[0].value;
    let streak = 0, last = '', repeats = 0;
    for (let i = 0; i < 60; i++) { const r = hkAsstChatReply('HRU', ['HI', 'HRU'], ''); if (r === last) repeats++; last = r; }
    return {
      hru: uniq('HRU', ['HI', 'HRU'], 'سلام چطوری', 120), hruNoHi: uniq('HRU', ['HRU'], 'چطوری', 120), hi: uniq('HI', ['HI'], 'سلام', 60), thx: uniq('THX', [], '', 40), joke: uniq('JOKE', [], '', 60),
      repeats, timeReply: hkAsstChatReply('TIME', [], 'ساعت چنده'), now, date: hkAsstChatReply('DATE', [], 'تاریخ امروز'), year: fmt({ year: 'numeric' }, 'year'), wd: fmt({ weekday: 'long' }, 'weekday'),
      tomorrow: hkAsstChatReply('DATE', [], 'فردا چه روزیه'), dleft: hkAsstChatReply('DLEFT', [], 'چند روز تا آخر ماه')
    };
  });
  ok(V.hru >= 25, '«سلام چطوری؟» هر بار جواب تازه می‌دهد: ' + V.hru + ' جوابِ متفاوت در ۱۲۰ بار');
  ok(V.hruNoHi >= 20 && V.hi >= 15 && V.thx >= 6 && V.joke >= 10, 'جواب‌های احوال‌پرسی، سلام، تشکر و جوک متنوع‌اند (' + [V.hruNoHi, V.hi, V.thx, V.joke].join('، ') + ')');
  ok(V.repeats === 0, 'هرگز دو بار پشت‌سرهم یک جواب تکراری نمی‌دهد');
  ok(V.timeReply.indexOf(V.now.time) >= 0, 'ساعت از خود گوشی می‌آید: ' + V.timeReply);
  ok(V.date.indexOf(V.year) >= 0 && V.date.indexOf(V.wd) >= 0, 'تاریخ امروز: روز هفته و سال درست: ' + V.date);
  ok(/فردا/.test(V.tomorrow) && V.tomorrow.indexOf(V.year) >= 0, '«فردا چه روزیه؟» تاریخ فردا را می‌گوید: ' + V.tomorrow);
  ok(/روز|تموم|ماهه/.test(V.dleft), 'چند روز تا آخر ماه: ' + V.dleft);
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join(' | '));
  await b.close();
  console.log('batch-1426: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
