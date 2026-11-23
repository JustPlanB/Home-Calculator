// ۱.۴.۳۷ — دستیار: ضبط به متن (متن زنده، لمس دوباره = پایان، خطای مشخص) و گفتگوی صوتی دوطرفه تمام‌صفحه با گوی بزرگ
// (گوش دادن با تپش، فکر کردن، حرف زدن، حلقهٔ مکالمه، قطع با لمس گوی، سکوت، خطای مجوز، نبودن صدای فارسی). افزونهٔ گفتار و صدا ساختگی است.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => {
    if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); }
    window.__h = { listeners: {}, calls: [], nextStart: null, ttsMode: 'ok', spoken: [] };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: {
      start: (a) => { window.__h.calls.push('start'); return window.__h.nextStart ? window.__h.nextStart(a) : new Promise(() => {}); },
      stop: () => { window.__h.calls.push('stop'); return Promise.resolve(); },
      cancel: () => { window.__h.calls.push('cancel'); return Promise.resolve(); },
      isAvailable: () => Promise.resolve({ available: true }),
      addListener: (ev, fn) => { (window.__h.listeners[ev] = window.__h.listeners[ev] || []).push(fn); return Promise.resolve({ remove: () => { window.__h.listeners[ev] = (window.__h.listeners[ev] || []).filter(x => x !== fn); } }); }
    } } };
    /* صدای ساختگی: حالت ok فوراً حرف می‌زند؛ حالت none خطا می‌دهد (صدای فارسی نیست) */
    const fake = { speak(u) { window.__h.spoken.push(u.text); if (window.__h.ttsMode === 'ok') { setTimeout(() => u.onstart && u.onstart(), 5); setTimeout(() => u.onend && u.onend(), 30); } else setTimeout(() => u.onerror && u.onerror({ error: 'language-unavailable' }), 5); }, cancel() {}, getVoices() { return []; } };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);
  await page.evaluate(() => hkAsstOpen()); await page.waitForTimeout(300);
  const ev = (fn, ...a) => page.evaluate(fn, ...a);

  console.log('• ضبط به متن');
  await ev(() => { window.__h.calls = []; window.__h.nextStart = () => new Promise(r => { window.__h.finish = r; }); });
  await page.click('.hk-asst-rec'); await page.waitForTimeout(150);
  let r = await ev(() => ({ rec: document.querySelector('.hk-asst-form').classList.contains('recording'), n: window.__h.calls.filter(c => c === 'start').length }));
  ok(r.rec && r.n === 1, 'زدن ضبط: نوار ضبط باز و یک بار گوش دادن شروع می‌شود');
  await ev(() => (window.__h.listeners.partial || []).forEach(f => f({ text: 'وضعیت مالیم' })));
  r = await ev(() => ({ v: document.querySelector('.hk-asst-input').value, t: document.querySelector('.hk-asst-rc-t').textContent, ph: document.querySelector('.hk-asst-rc-t').classList.contains('is-ph') }));
  ok(r.v === 'وضعیت مالیم' && r.t === 'وضعیت مالیم' && !r.ph, 'متن نیمه‌کاره همان لحظه در ردیف بالای کادر ضبط نوشته می‌شود');
  await ev(() => (window.__h.listeners.level || []).forEach(f => f({ rms: 10 })));
  r = await ev(() => { const d = [...document.querySelectorAll('.hk-asst-rc-dots i')]; return { n: d.length, last: parseInt(d[d.length - 1].style.height, 10) }; });
  ok(r.n === 30 && r.last > 12, 'موج نقطه‌ای با شدت صدا بلند می‌شود (' + r.last + ' پیکسل)');
  await page.click('.hk-asst-rc-stop').catch(() => {}); await page.waitForTimeout(100);
  r = await ev(() => window.__h.calls.filter(c => c === 'stop').length);
  ok(r === 1, 'لمس دوبارهٔ ضبط (وقتی ضبط است) فقط «پایان گفتن» را می‌فرستد، ضبط دوم شروع نمی‌شود');
  await ev(() => window.__h.finish({ text: 'وضعیت مالیم چطوره' })); await page.waitForTimeout(150);
  r = await ev(() => ({ v: document.querySelector('.hk-asst-input').value, rec: document.querySelector('.hk-asst-form').classList.contains('recording'), left: (window.__h.listeners.partial || []).length }));
  ok(r.v === 'وضعیت مالیم چطوره' && !r.rec && r.left === 0, 'پایان ضبط: متن نهایی در کادر، نوار ضبط بسته، شنوندهٔ متن زنده برداشته شد');
  /* ۱.۴.۳۸: نام کاربر تا قبل از شنیدن، ✕ لغو، ↑ پایان و ارسال */
  await ev(() => { document.querySelector('.hk-asst-input').value = ''; document.querySelector('.hk-asst-form').classList.remove('typing'); window.__h.calls = []; window.__h.nextStart = () => new Promise(r => { window.__h.finish = r; }); });
  await page.click('.hk-asst-rec'); await page.waitForTimeout(150);
  r = await ev(() => { const t = document.querySelector('.hk-asst-rc-t'); let nm = ''; try { nm = String(hkMainTitle() || '').trim(); } catch (e) {} return { t: t.textContent, nm, ph: t.classList.contains('is-ph'), rowDir: getComputedStyle(document.querySelector('.hk-asst-rc-r')).direction, inputHidden: getComputedStyle(document.querySelector('.hk-asst-input')).display === 'none' }; });
  ok(r.t === r.nm && r.ph && r.rowDir === 'ltr' && r.inputHidden, 'ضبط: بالای کادر نام کاربر (کم‌رنگ) است و کادر دو ردیفی می‌شود');
  await page.click('.hk-asst-rc-x'); await page.waitForTimeout(100);
  r = await ev(() => window.__h.calls.filter(c => c === 'cancel').length);
  ok(r >= 1, '✕ ضبط را لغو می‌کند');
  await ev(() => window.__h.finish && window.__h.finish(null)); await page.waitForTimeout(100);
  await ev(() => { window.__h.nextStart = () => new Promise(r => { window.__h.finish = r; }); });
  await page.click('.hk-asst-rec').catch(() => {}); await page.waitForTimeout(150);
  await ev(() => { _hkAsstLog = []; });
  await page.click('.hk-asst-rc-go'); await page.waitForTimeout(100);
  await ev(() => window.__h.finish({ text: 'وضعیت مالیم چطوره' })); await page.waitForTimeout(300);
  r = await ev(() => ({ sent: _hkAsstLog.some(m => m.role === 'user' && /وضعیت/.test(m.text)), rec: document.querySelector('.hk-asst-form').classList.contains('recording') }));
  ok(r.sent && !r.rec, '↑ ضبط را تمام می‌کند و همان لحظه ارسال می‌کند');
  await ev(() => { document.querySelector('.hk-asst-input').value = ''; document.querySelector('.hk-asst-form').classList.remove('typing'); window.__h.nextStart = () => Promise.reject({ code: 'speech_error_9', message: 'speech_error_9' }); });
  await page.click('.hk-asst-rec'); await page.waitForTimeout(200);
  r = await ev(() => ({ toast: (document.getElementById('toast') || {}).textContent || '', rec: document.querySelector('.hk-asst-form').classList.contains('recording') }));
  ok(/اجازهٔ میکروفون/.test(r.toast) && !r.rec, 'خطای مجوز میکروفون: پیام مشخص و نوار ضبط بسته می‌شود');

  console.log('• گفتگوی صوتی');
  await ev(() => { window.__h.calls = []; window.__h.spoken = []; window.__h.ttsMode = 'ok'; let n = 0; window.__h.nextStart = () => { n++; return n === 1 ? new Promise(r => { window.__h.finish = r; }) : new Promise(() => {}); }; });
  await page.click('.hk-asst-vc'); await page.waitForTimeout(200);
  r = await ev(() => { const v = document.querySelector('.hk-asst-voice'), o = document.querySelector('.hk-asst-vorb'); const cs = getComputedStyle(v); const rc = v.getBoundingClientRect(); return { open: v.classList.contains('open'), s: o.getAttribute('data-s'), full: Math.round(rc.width) >= 380 && Math.round(rc.height) >= 740, orb: Math.round(o.getBoundingClientRect().width), onlyOrb: v.querySelectorAll('button').length === 2 }; });
  ok(r.open && r.s === 'listening' && r.full && r.orb >= 200, 'زدن ویس: صفحهٔ تمام‌صفحه با گوی بزرگ (' + r.orb + ' پیکسل) و حالت «گوش دادن»');
  await ev(() => (window.__h.listeners.level || []).forEach(f => f({ rms: 8 })));
  r = await ev(() => parseFloat(document.querySelector('.hk-asst-vorb').style.getPropertyValue('--lv')));
  ok(r > 0.5, 'شدت صدا گوی را تپش می‌دهد (--lv=' + r + ')');
  await ev(() => window.__h.finish({ text: 'وضعیت مالیم چطوره' }));
  await page.waitForTimeout(400);
  r = await ev(() => ({ log: [...document.querySelectorAll('.hk-asst-log .hk-asst-row')].map(x => x.textContent.trim()).filter(Boolean), spoken: window.__h.spoken.length, starts: window.__h.calls.filter(c => c === 'start').length, s: document.querySelector('.hk-asst-vorb').getAttribute('data-s') }));
  ok(r.log.length >= 2 && /وضعیت مالیم/.test(r.log[0]), 'حرف کاربر و پاسخ دستیار در گفتگوی چت ثبت می‌شوند');
  ok(r.spoken === 1 && r.starts >= 2 && r.s === 'listening', 'پاسخ با صدا خوانده می‌شود و بعد دوباره گوش می‌دهد (مکالمهٔ دوطرفه)');
  /* لمس گوی هنگام گوش دادن = پایان گفتن */
  await ev(() => { window.__h.calls = []; });
  await page.click('.hk-asst-vorb'); await page.waitForTimeout(100);
  r = await ev(() => window.__h.calls.filter(c => c === 'stop').length);
  ok(r === 1, 'لمس گوی هنگام گوش دادن: پایان گفتن');
  /* بازگشت سیستم: اول گفتگوی صوتی بسته می‌شود، نه کل پنجره */
  r = await ev(() => { const h = hkAsstBack(); return { h, voice: document.querySelector('.hk-asst-voice').classList.contains('open'), sheet: hkAsstIsOpen(), cancel: window.__h.calls.indexOf('cancel') >= 0 }; });
  ok(r.h && !r.voice && r.sheet && r.cancel, 'بازگشت: فقط گفتگوی صوتی بسته می‌شود (و گوش‌دادنِ افزونه لغو)، پنجرهٔ دستیار می‌ماند');

  console.log('• سکوت و خطا');
  await ev(() => { window.__h.calls = []; window.__h.nextStart = () => Promise.reject({ code: 'speech_error_7', message: 'speech_error_7' }); });
  await page.click('.hk-asst-vc'); await page.waitForTimeout(2400);
  r = await ev(() => ({ s: document.querySelector('.hk-asst-vorb').getAttribute('data-s'), t: document.querySelector('.hk-asst-vstat').textContent, n: window.__h.calls.filter(c => c === 'start').length }));
  ok(r.s === 'idle' && /صدایی نشنیدم/.test(r.t) && r.n === 3, 'سه بار سکوت پشت‌سرهم: حلقه می‌ایستد (نه بی‌نهایت) و می‌گوید روی گوی بزن (' + r.n + ' تلاش)');
  await ev(() => { window.__h.calls = []; window.__h.nextStart = () => new Promise(() => {}); });
  await page.click('.hk-asst-vorb'); await page.waitForTimeout(150);
  r = await ev(() => ({ s: document.querySelector('.hk-asst-vorb').getAttribute('data-s'), n: window.__h.calls.filter(c => c === 'start').length }));
  ok(r.s === 'listening' && r.n === 1, 'لمس گوی ساکن: دوباره شروع به گوش دادن');
  await ev(() => { hkAsstVoiceClose(); window.__h.nextStart = () => Promise.reject({ code: 'speech_error_9', message: 'speech_error_9' }); });
  await page.click('.hk-asst-vc'); await page.waitForTimeout(250);
  r = await ev(() => ({ s: document.querySelector('.hk-asst-vorb').getAttribute('data-s'), t: document.querySelector('.hk-asst-vstat').textContent }));
  ok(r.s === 'idle' && /اجازهٔ میکروفون/.test(r.t), 'خطای مجوز: حلقه می‌ایستد و علت دقیق گفته می‌شود');

  console.log('• نبودن صدای فارسی');
  await ev(() => { hkAsstVoiceClose(); window.__h.calls = []; window.__h.ttsMode = 'none'; let n = 0; window.__h.nextStart = () => { n++; return n === 1 ? Promise.resolve({ text: 'وضعیت مالیم چطوره' }) : new Promise(() => {}); }; });
  await page.click('.hk-asst-vc'); await page.waitForTimeout(900);
  r = await ev(() => ({ cap: document.querySelector('.hk-asst-vcap').textContent, st: document.querySelector('.hk-asst-vstat').textContent }));
  ok(r.cap.length > 10 && /صدای فارسی/.test(r.st), 'اگر صدای فارسی نصب نیست: پاسخ روی صفحه نوشته می‌شود و گفتگو ادامه دارد');
  await ev(() => { hkAsstVoiceClose(); hkAsstClose(); });
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join(' | '));
  await b.close();
  console.log('batch-1427: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
