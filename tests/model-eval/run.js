// ارزیابی دستی مدل محلی دستیار (فقط با workflow_dispatch؛ بخشی از تست‌های همیشگی نیست).
// مدل واقعی GGUF را با همان موتور و همان تنظیم‌های برنامه (فقط CPU) در Chromium بارگذاری می‌کند، چند سؤال فارسی ساختگی می‌پرسد
// و می‌سنجد: اعتبار JSON، درستی ابزار و کلیدها، و زمان پاسخ. داده‌ی ساختگی؛ هیچ داده‌ی مالی یا شخصی در کار نیست.
// استفاده: HK_MODEL_FILE=مسیر.gguf node model-eval/run.js   (HK_INDEX برای نسخهٔ ساخته‌شده)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let modelFile = '';
if (process.env.HK_EVAL_STUB && !process.env.HK_MODEL_FILE) process.env.HK_MODEL_FILE = __filename;
modelFile = process.env.HK_MODEL_FILE ? path.resolve(process.env.HK_MODEL_FILE) : '';
if (!modelFile || !fs.existsSync(modelFile)) { console.error('HK_MODEL_FILE یافت نشد'); process.exit(2); }

// سؤال، ابزارهای قابل‌قبول، و کلیدهای لازم (زیرمجموعه)
const CASES = [
  ['جمع هزینه‌های آبان چقدر شد؟', ['transactions.aggregate'], { tab: 'expense', month: 8 }],
  ['آبان چقدر درآمد داشتم؟', ['transactions.aggregate'], { tab: 'income', month: 8 }],
  ['این ماه چقدر بابت اسنپ خرج کردم؟', ['transactions.aggregate', 'transactions.search'], { tab: 'expense', text: 'اسنپ' }],
  ['بنزین چند تا؟', ['transactions.aggregate', 'transactions.search'], { text: 'بنزین' }],
  ['تراکنش‌های بالای ده میلیون را پیدا کن', ['transactions.search'], { amountMin: 10000000 }],
  ['بیمه شخص ثالث را پیدا کن', ['transactions.search'], { text: 'بیمه' }],
  ['هزینه‌های امسال به تفکیک ماه', ['transactions.group'], {}],
  ['درآمد و هزینه این ماه را با ماه قبل مقایسه کن', ['reports.compare'], {}],
  ['پروژه‌ها را نشان بده', ['projects.list'], {}],
  ['چه حساب‌هایی دارم؟', ['accounts.list'], {}],
  ['دسته‌ها چی هستند؟', ['categories.summary'], {}],
  ['قسط‌های دی ماه را بگو', ['transactions.aggregate', 'transactions.search'], { month: 10 }],
  ['میانگین خرج خوراکی در مهر', ['transactions.aggregate'], { month: 7 }],
  ['خرج هر دسته چقدر بوده؟', ['transactions.group', 'categories.summary'], {}],
  ['سلام خوبی؟', ['ask'], {}],
  ['هوا امروز چطوره؟', ['ask'], {}],
  ['اسم تو چیه؟', ['ask'], {}],
  ['یک ردیف را پاک کن', ['ask'], {}]
];

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-eval-'));
  fs.copyFileSync(process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'), path.join(dir, 'index.html'));
  fs.mkdirSync(path.join(dir, 'llm'));
  ['wllama.js', 'wllama.wasm'].forEach(f => fs.copyFileSync(path.join(ROOT, 'assets', 'llm', f), path.join(dir, 'llm', f)));
  fs.symlinkSync(modelFile, path.join(dir, 'model.gguf'));
  const srv = http.createServer((q, s) => {
    const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream', 'Content-Length': fs.statSync(f).size });
    fs.createReadStream(f).pipe(s);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(1500);
  const lines = [];
  const say = t => { console.log(t); lines.push(t); };
  let exitCode = 0;

  // ۱) ذخیرهٔ مدل روی OPFS مثل دانلود برنامه (از سرور محلی)، ۲) بارگذاری با همان تنظیم‌ها
  const L = await page.evaluate(async ([url, stub]) => {
    const o = {};
    if (stub) { /* آزمایش خودِ اسکریپت بدون مدل واقعی */
      hkAsstLocalAttach(function (p) { return Promise.resolve('{"tool":"transactions.aggregate","args":{"tab":"expense","month":8}}'); }, 'ساختگی');
      return { ok: true, size: 0, storeMs: 0, loadMs: 0, profile: 0 };
    }
    try {
      HK_ASST_MODEL.url = url;
      const t0 = performance.now(); o.size = await hkAsstModelDownload(); o.storeMs = Math.round(performance.now() - t0);
      const t1 = performance.now(); await hkAsstLocalLoad(); o.loadMs = Math.round(performance.now() - t1); o.ok = true;
      o.profile = hkAsstProfileFor();
    } catch (e) { o.ok = false; o.err = String(e && e.message || e); o.stage = HK_ASST_ENGINE.stage; }
    return o;
  }, [base + '/model.gguf', !!process.env.HK_EVAL_STUB]);
  say('## ارزیابی مدل محلی دستیار');
  if (!L.ok) {
    say('بارگذاری شکست خورد در مرحلهٔ «' + L.stage + '»: ' + L.err);
    exitCode = 1;
  } else {
    say('- فایل مدل: ' + (L.size / 1048576).toFixed(0) + ' مگابایت، ذخیره: ' + L.storeMs + ' میلی‌ثانیه');
    say('- بارگذاری موتور: ' + (L.loadMs / 1000).toFixed(1) + ' ثانیه (تنظیم شمارهٔ ' + L.profile + ')');
    const rows = [];
    for (const [q, tools, want] of CASES) {
      const r = await page.evaluate(async (q) => {
        const o = { q };
        const rules = hkAsstAsk(q); o.rulesKind = rules.kind; o.rulesTool = rules.tool || '';
        const t0 = performance.now();
        try {
          const out = await HK_ASST_LOCAL.runner(hkAsstLocalPrompt(q));
          o.ms = Math.round(performance.now() - t0); o.raw = String(out).slice(0, 220);
          const cmd = hkAsstLocalParse(out); o.valid = !!cmd;
          if (cmd) { o.tool = cmd.ask ? 'ask' : (cmd.tool || ''); o.args = cmd.args || {}; o.toolKnown = cmd.ask ? true : Object.prototype.hasOwnProperty.call(HK_ASST_TOOLS, cmd.tool); }
        } catch (e) { o.ms = Math.round(performance.now() - t0); o.err = String(e && e.message || e); }
        return o;
      }, q);
      r.toolOk = !!(r.valid && tools.indexOf(r.tool) >= 0);
      r.argsOk = r.toolOk && Object.keys(want).every(k => r.args && String(r.args[k]) === String(want[k]) || (k === 'text' && r.args && typeof r.args.text === 'string' && r.args.text.indexOf(want.text) >= 0) || (k === 'amountMin' && r.args && Number(r.args.amountMin) === want.amountMin));
      rows.push(r);
    }
    const n = rows.length, valid = rows.filter(r => r.valid).length, toolOk = rows.filter(r => r.toolOk).length, argsOk = rows.filter(r => r.argsOk).length;
    const ms = rows.map(r => r.ms).filter(Number.isFinite), avg = ms.reduce((a, c) => a + c, 0) / (ms.length || 1);
    say('- JSON معتبر: ' + valid + ' از ' + n + ' | ابزار درست: ' + toolOk + ' از ' + n + ' | ابزار و کلیدها درست: ' + argsOk + ' از ' + n);
    say('- زمان پاسخ: اولین ' + (ms[0] / 1000).toFixed(1) + ' ثانیه، میانگین ' + (avg / 1000).toFixed(1) + ' ثانیه، بیشترین ' + (Math.max.apply(null, ms) / 1000).toFixed(1) + ' ثانیه');
    say('');
    say('| سؤال | قاعده‌ای | مدل | ابزار | کلیدها | ثانیه |');
    say('|---|---|---|---|---|---|');
    rows.forEach(r => say('| ' + r.q + ' | ' + (r.rulesKind === 'result' ? r.rulesTool || 'نتیجه' : 'نفهمید') + ' | `' + String(r.raw || r.err || '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 90) + '` | ' + (r.toolOk ? '✓' : '✗') + ' | ' + (r.argsOk ? '✓' : '✗') + ' | ' + (r.ms / 1000).toFixed(1) + ' |'));
  }
  if (errs.length) say('\nخطای صفحه: ' + errs.join(' | '));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'tests', 'out', 'model-eval.md'), lines.join('\n') + '\n');
  await b.close(); srv.close();
  process.exit(exitCode);
})();
