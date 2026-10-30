// نسخهٔ ۱.۳.۳۹: جمع شدن آرام و کامل کادر جستجو (و باز شدن مطمئن با برگشت سریع به بالا)، محور مبلغ داخل کادر، برچسب‌های بازهٔ مبلغ
// (هر سر همیشه نوشته دارد؛ «از – تا» هم‌جهت با محور)، خط‌های سفید ردیف‌های جمع، پیوست‌های پیامک بعد از دوباره باز شدن همان پیامک،
// موج صدا در گفتار به متن و برگرداندن «س***». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__vo = {};
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: {
      isAvailable: () => Promise.resolve({ available: true }),
      addListener: (ev, fn) => { window.__vo[ev] = fn; return Promise.resolve({ remove() {} }); },
      start: () => new Promise(res => { window.__voDone = res; }), stop: () => Promise.resolve()
    } } };` });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• کادر جستجو و محور مبلغ');
  const s = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 20 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'اجاره ' + i, amount: 3000000 * (i + 1), status: 'paid', account: 'ملت' }));
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '3', desc: 'اجاره ورودی', amount: 9000000, status: 'paid', account: 'ملت' })];
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const h = document.getElementById('balanceFixedHeader'), host = document.getElementById('balanceAmtRange');
    const out = {};
    /* محور (با درجه‌هایش) کامل داخل کادر جستجو */
    const hr = h.getBoundingClientRect(), ticks = [...host.querySelectorAll('.hk-ar-tick')].map(t => t.getBoundingClientRect().bottom);
    out.inside = Math.max(...ticks) <= hr.bottom - 2;
    /* برچسب‌ها */
    const mn = document.getElementById('balanceSearchAmtMin'), mx = document.getElementById('balanceSearchAmtMax');
    const setR = async (a, c) => { mn.value = a; mn.dispatchEvent(new Event('input', { bubbles: true })); mx.value = c; mx.dispatchEvent(new Event('input', { bubbles: true })); await w(200); };
    const vis = el => { const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && el.getBoundingClientRect().width > 0; };
    const ends = [...host.querySelectorAll('.hk-ar-end')], vals = [...host.querySelectorAll('.hk-ar-val')];
    const shot = () => ({ e0: vis(ends[0]), e1: vis(ends[1]), v: vals.filter(vis).map(v => { const rg = v.querySelector('.hk-ar-rg'); return rg ? [...rg.children].map(x => Math.round(x.getBoundingClientRect().left) + ':' + x.textContent).join('|') : v.textContent; }) });
    await setR('25,000,000', ''); out.minOnly = shot();      /* «تا» روی انتها: درجهٔ «+…» دیده شود */
    await setR('5,500,000', '10,000,000'); out.near = shot(); /* دو دستگیرهٔ نزدیک: «از – تا» چپ‌به‌راست */
    await setR('', '200,000'); out.low = shot();             /* «از» روی ۰ و «تا» نزدیکش: «۰ – ۲۰۰ هزار» */
    await setR('', ''); out.full = shot();
    /* خط‌های ردیف‌های جمع سفید */
    const i = document.getElementById('balanceSearchInput'); i.value = 'اجاره'; i.dispatchEvent(new Event('input')); await w(300);
    const ftd = document.querySelector('#search-result-foot td');
    /* ۱.۳.۴۰: خط‌ها با ::before (افقی) و ::after (عمودی) کشیده می‌شوند */
    out.footBorder = getComputedStyle(document.querySelector('#search-result-foot td.val'), '::after').backgroundColor + '|' + getComputedStyle(document.querySelectorAll('#search-result-foot tr')[1].cells[0], '::before').backgroundColor;
    return out;
  });
  ok(s.inside, 'محور مبلغ با درجه‌هایش کامل داخل کادر جستجو (نه روی جدول نتیجه)');
  ok(s.minOnly.e1 && s.minOnly.v.length === 1 && /۲۵/.test(s.minOnly.v[0]), '«تا» روی انتها: درجهٔ آخر دیده می‌شود و «از» برچسب خودش را دارد (' + JSON.stringify(s.minOnly) + ')');
  const nearParts = (s.near.v[0] || '').split('|').map(x => ({ x: +x.split(':')[0], t: x.split(':').slice(1).join(':') }));
  ok(nearParts.length === 3 && /۵٫۵/.test(nearParts[0].t) && /۱۰/.test(nearParts[2].t) && nearParts[0].x < nearParts[2].x, 'دو دستگیرهٔ نزدیک: «۵٫۵ میلیون – ۱۰ میلیون»، کمتر سمت چپ مثل محور (' + s.near.v[0] + ')');
  /* ۱.۳.۴۰: سرها زیر محورند؛ «از» روی ۰ برچسب بالایی ندارد (درجهٔ ۰ زیر محور نشانش است) */
  ok(s.low.e0 && s.low.v.length === 1 && /۲۰۰/.test(s.low.v[0]), '«از» روی ۰ و «تا» نزدیکش: درجهٔ ۰ زیر محور و فقط «۲۰۰ هزار» بالا (' + JSON.stringify(s.low) + ')');
  ok(s.full.e0 && s.full.e1 && s.full.v.length === 0, 'کل بازه: فقط درجهٔ اول و آخر');
  ok(/rgba\(255, 255, 255, 0\.4\)/.test(s.footBorder.split('|')[0]) && /rgba\(255, 255, 255, 0\.4\)/.test(s.footBorder.split('|')[1]), 'خط‌های بین ردیف‌های جمع و بین ستون‌ها سفید (' + s.footBorder + ')');

  /* جمع آرام و کامل، باز شدن مطمئن حتی با برگشت سریع به بالا */
  const st = () => p.evaluate(() => { const h = document.getElementById('balanceFixedHeader'); const c = h.querySelector('.bsr-grid > .bsr-cell:not(.bsr-desc)'); return { c: h.classList.contains('bsr-collapsed'), h: Math.round(c.getBoundingClientRect().height) }; });
  await p.mouse.move(190, 650); await p.mouse.wheel(0, 150); await p.waitForTimeout(250);
  const mid = await st();
  await p.waitForTimeout(700);
  const done = await st();
  await p.mouse.wheel(0, 200); await p.waitForTimeout(100);
  /* ۱.۳.۶۶: ناحیهٔ اسکرول نتیجه balanceScrollBody است */
  await p.evaluate(() => { document.getElementById('balanceScrollBody').scrollTop = 0; });
  await p.waitForTimeout(1300);
  const back = await st();
  ok(mid.c && mid.h > 0 && done.h === 0, 'جمع شدن آرام (نیمه‌راه هنوز ' + mid.h + 'px) و کامل (۰)');
  ok(!back.c && back.h >= 30, 'برگشت سریع به بالا (وسط انیمیشن): کادر حتماً باز می‌شود');

  console.log('• پیوست پیامک بعد از دوباره باز شدن همان پیامک');
  const sm = await p.evaluate(async (PNG) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { closePersonDetail(); } catch (e) {}
    await w(200);
    const raw = 'بانک ملت\nبرداشت 70,000';
    pendingSmsEntry = { raw, amount: 70000, type: 'expense' };
    openSmsConfirmModal({ type: 'expense', amount: 70000, raw, bank: 'ملت', year: 1405, month: 7, day: 21 }); await w(200);
    await hkSmsAttAdd('img', hkB64Blob(PNG, 'image/png'));
    const id = _smsAtt.list[0].id;
    /* برگشت از دوربین: همان پیامک دوباره باز شد → پیوست نمی‌ماند پاک شود */
    openSmsConfirmModal({ type: 'expense', amount: 70000, raw, bank: 'ملت', year: 1405, month: 7, day: 21 }); await w(200);
    const out = { kept: _smsAtt.list.length, stored: !!(await HKAttach.get(id)) };
    /* فایل در این فاصله از حافظه پاک شده باشد: با ثبت دوباره نوشته می‌شود */
    await HKAttach.del(id);
    const row = Object.assign(emptyRow('expense'), { day: '21', desc: 'خرید', amount: 70000, status: 'paid', account: 'ملت', viaSms: true });
    periodData.expense.sections[0].rows.push(row);
    closeSmsConfirmModal(); await w(500);
    out.att = (row.att || []).length; out.back = !!(await HKAttach.get(id));
    return out;
  }, PNG);
  ok(sm.kept === 1 && sm.stored, 'دوباره باز شدن همان پیامک (برگشت از دوربین/گالری) پیوست در انتظار را پاک نمی‌کند');
  ok(sm.att === 1 && sm.back, 'با ثبت، پیوست روی ردیف نشست و فایلش (حتی اگر پاک شده بود) دوباره ذخیره شد');

  console.log('• گفتار به متن');
  const vo = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const inp = document.getElementById('smsConfirmDesc');
    openVoiceInput(inp); await w(300);
    const ov = document.querySelector('.voice-overlay'), rects = ov ? [...ov.querySelectorAll('.vo-wave rect')] : [];
    const out = { n: rects.length, color: ov ? getComputedStyle(ov.querySelector('.vo-mic')).backgroundImage + '|' + getComputedStyle(ov.querySelector('.vo-mic')).backgroundColor : '', fill: rects.map(r => getComputedStyle(r).fill).filter((x, i, a) => a.indexOf(x) === i).join('|') };
    const hs = () => rects.map(r => parseFloat(r.style.height) || 0);   /* ۱.۳.۴۱: ارتفاع خط (نه scale) */
    window.__vo.level({ rms: -2 }); await w(1200); out.quiet = hs();
    window.__vo.level({ rms: 10 }); await w(1200); out.loud = hs();
    out.round = rects.every(r => r.getAttribute('rx') === '4' && r.getAttribute('width') === '8');
    window.__vo.partial({ text: 'خرید س*** مارکت' }); await w(30); out.partial = ov.querySelector('.vo-text').textContent;
    window.__voDone({ text: 'خرید س*** مارکت' }); await w(200);
    out.final = inp.value;
    out.unmask = _voiceUnmask('س***');
    return out;
  });
  ok(vo.n === 9 && /^none\|rgba\(0, 0, 0, 0\)$/.test(vo.color) && vo.fill === 'rgb(47, 155, 255)|rgb(124, 196, 255)', 'هنگام شنیدن (۱.۳.۴۰): فقط ۹ خط آبی در دو رنگ، بدون هیچ دایره‌ای (' + vo.color + ' / ' + vo.fill + ')');
  ok(Math.max(...vo.loud) > Math.max(...vo.quiet) + 10 && vo.round, 'ارتفاع خط‌ها با شدت صدا تغییر می‌کند؛ خط‌ها باریک با سر کاملاً گرد (' + Math.max(...vo.quiet) + '→' + Math.max(...vo.loud) + ')');
  ok(vo.partial === 'خرید سوپر مارکت' && vo.final === 'خرید سوپر مارکت' && vo.unmask === 'سوپر', '«س***» (فیلتر سرویس گفتار) به «سوپر» برمی‌گردد');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/MASK_OFFENSIVE_WORDS",false/.test(patch), 'اندروید ۱۳+: ستاره‌دار کردن کلمه‌ها در سرویس گفتار خاموش');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
