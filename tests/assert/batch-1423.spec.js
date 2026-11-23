// ۱.۴.۲۹ — مدل محلی: دانلود مستقیم روی دیسک (OPFS) بدون جمع شدن در حافظه؛ انتقال مدل قبلی از IndexedDB؛
// رسیدن بارگذاری به موتور روی فایل واقعی مرورگر (بدون CSP/مسیر خطا). فقط داده ساختگی.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  // پوشهٔ موقت: نسخهٔ برنامه به‌همراه موتور اجرا، روی یک سرور محلی (OPFS فقط روی مبدأ امن کار می‌کند)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-llm-'));
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(dir, 'index.html'));
  fs.mkdirSync(path.join(dir, 'llm'));
  ['wllama.js', 'wllama.wasm'].forEach(f => fs.copyFileSync(path.join(ROOT, 'assets', 'llm', f), path.join(dir, 'llm', f)));
  const srv = http.createServer((q, s) => {
    const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(s);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(1500);

  const M = await page.evaluate(async () => {
    await HKStore.put(HK_ASST_MODEL.key, new Blob([new Uint8Array(3 * 1024 * 1024)]));
    await HKStore.put(HK_ASST_MODEL.key + '_meta', { size: 3 * 1024 * 1024 });
    const o = { statusBefore: await hkAsstModelStatus() };
    try { await hkAsstLocalLoad(); o.load = 'loaded'; } catch (e) { o.load = e.message || ''; }
    o.idbLeft = !!(await HKStore.get(HK_ASST_MODEL.key));
    const f = await hkAsstModelOpfsFile(); o.opfsSize = f ? f.size : -1;
    o.engineError = HK_ASST_ENGINE.error || '';
    return o;
  });
  ok(M.statusBefore === true, 'مدل ذخیره‌شدهٔ قبلی، آماده شناخته می‌شود');
  ok(M.idbLeft === false && M.opfsSize === 3 * 1024 * 1024, 'مدل قبلی بدون دانلود دوباره به دیسک (OPFS) منتقل و از IndexedDB پاک شد');
  ok(!/default is missing|Content Security|WebAssembly\.compile|abort/i.test(M.load + ' ' + M.engineError), 'بارگذاری به موتور رسید؛ خطای مسیر، CSP یا abort نیست (فایل آزمایشی GGUF نیست)');

  const body = Buffer.alloc(5 * 1024 * 1024, 7);
  await page.route('https://huggingface.co/**', route => route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'content-length': String(body.length) }, body }));
  const D = await page.evaluate(async () => {
    let last = 0;
    const size = await hkAsstModelDownload(function (frac) { last = frac; });
    const f = await hkAsstModelOpfsFile();
    return { size: size, opfsSize: f ? f.size : -1, last: last, status: await hkAsstModelStatus() };
  });
  ok(D.opfsSize === body.length && D.size === body.length, 'دانلود مستقیم روی دیسک نوشته شد (اندازه درست)');
  ok(D.last === 1 && D.status === true, 'پیشرفت دانلود به ۱۰۰٪ رسید و مدل آماده است');
  ok(errs.length === 0, 'خطای صفحه نداریم' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); srv.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
