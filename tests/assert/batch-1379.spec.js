// ۱.۳.۷۹: آیکون‌های یکسان (مداد ویرایش و × حذف قدیمی)؛ پاسخ فوری پوشهٔ کارت‌های قسط؛ اندازهٔ قلم واقعاً کار می‌کند؛ عرض منوی میان‌برها؛
// باکس درآمد ثابت (۷ ردیف، صفحه بی‌اسکرول، آیکون‌ها هم‌تراز)؛ خروجی آرشیو (اسکرول، رنگ تب‌ها، پیش‌فرض PDF)؛ حباب‌های واقعی؛ ویجت ردیف‌ها. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const fs = require('fs');
const path = require('path');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b, extra, opts) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' }, opts || {}));
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const REM = JSON.stringify([{ id: 'r1', title: 'اجارهٔ خانه', y: 1405, m: 8, d: 13, repeat: 'monthly', advanceDays: 3 }]);
const REC = n => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: 'rc' + i, name: 'اجارهٔ واحد ' + (i + 1), amount: 12000000, day: String(1 + i * 2), contractStart: { y: 1405, m: 1, d: 1 }, contractEnd: { y: 1406, m: 1, d: 1 }, sectionTitle: 'اجاره' })));
const sms = (amt, dt, to, n, tr) => `بانک مسکن\nواريز قسط به مبلغ:${amt}ريال\nزمان:${dt}\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-${to}\nتعداد اقساط پرداختي :${n}\nمانده معوق :0\nمانده جريمه :0\nشماره پيگيري:${tr}`;

(async () => {
  const b = await chromium.launch();
  const src = fs.readFileSync(process.env.HK_INDEX || path.join(__dirname, '../../index.html'), 'utf8');
  const claude = fs.readFileSync(path.join(__dirname, '../../CLAUDE.md'), 'utf8');

  console.log('• آیکون‌ها، اندازهٔ قلم، منوی میان‌برها');
  const A = await fresh(b, { [P + '_userReminders']: REM });
  const a = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openUserRemindersModal(); await w(400);
    const it = document.querySelector('#userRemindersList .ur-item');
    const ed = it.querySelector('.ur-edit svg path'), del = it.querySelector('.ur-del');
    const remEdit = !!ed && ed.getAttribute('d') === 'M12 20h9', remDel = !!del && del.textContent.trim() === '×' && /255, 23, 68/.test(getComputedStyle(del).color);
    try { closeUserRemindersModal(); } catch (e) { document.getElementById('userRemindersModal').classList.remove('open'); }
    hkRenderMenuProfile();
    const pen = document.querySelector('#menuUserNameText .hk-mprof-pen svg path');
    const profEdit = !!pen && pen.getAttribute('d') === 'M12 20h9';
    /* اندازهٔ قلم */
    const fs = () => getComputedStyle(document.documentElement).getPropertyValue('--hk-fs-body').trim();
    const cell = () => { const e = document.createElement('div'); e.style.fontSize = 'var(--hk-fs-body)'; document.body.appendChild(e); const v = getComputedStyle(e).fontSize; e.remove(); return v; };
    hkPrefSet('font', 'l'); const L = [fs(), cell()]; hkPrefSet('font', 's'); const S = [fs(), cell()]; hkPrefSet('font', 'm'); const M = [fs(), cell()];
    /* منوی میان‌برها */
    const btn = document.querySelector('#homeDock .hk-dock-c') || document.querySelector('#homeDock button');
    hkDockOpenPop(btn, 'L'); await w(300);
    const pop = document.querySelector('#hkDockPop .hk-dock-pop');
    const items = [...pop.querySelectorAll('.hk-dock-pi')];
    const sms = items.find(x => /ثبت تکی و گروهی/.test(x.textContent));
    const one = items.every(x => { const s = x.querySelector('span'); return s && s.getBoundingClientRect().height < parseFloat(getComputedStyle(s).fontSize) * 2; });
    const fit = sms ? sms.scrollWidth <= sms.clientWidth + 1 : false;
    const f = getComputedStyle(items[0]).fontSize, pw = Math.round(pop.getBoundingClientRect().width);
    document.getElementById('hkDockPop')._hkCancel();
    return { remEdit, remDel, profEdit, L, S, M, one, fit, f, w: pw, hasSms: !!sms };
  });
  ok(a.remEdit && a.remDel, 'پنجرهٔ یادآورها: همان مداد ویرایش و × قرمز حذف قبلی');
  ok(a.profEdit, 'ویرایش اسم کاربر: همان مداد ویرایش قبلی');
  ok(!/M4 20h4L19 9l-4-4L4 16z/.test(src), 'مداد شکل دیگر در هیچ جای نرم‌افزار نمانده');
  ok(/آیکون‌ها/.test(claude) && /HK_EDIT_SVG/.test(claude), 'قاعدهٔ یکسانی آیکون‌ها در CLAUDE.md ثبت شد');
  ok(a.L[0] === '16px' && a.L[1] === '16px' && a.S[1] === '12.5px' && (a.M[0] === '14px') && a.M[1] === '14px', 'اندازهٔ قلم واقعاً متن‌ها را بزرگ/کوچک می‌کند (' + a.S[1] + ' / ' + a.M[1] + ' / ' + a.L[1] + ')');
  ok(a.hasSms && a.one && a.fit, 'منوی میان‌برها هم‌عرض طولانی‌ترین گزینه و همه تک‌خطی (' + a.w + 'px)');
  ok(a.f === '13px', 'قلم منوی میان‌برها یک درجه کوچک‌تر (' + a.f + ')');
  await A.ctx.close();

  console.log('• پوشهٔ کارت‌های قسط');
  const F = await fresh(b);
  const f = await F.page.evaluate(async (S) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    S.forEach(x => enqueueBankSms(x, { silent: true })); await w(600);
    window._hkInstFoldOpen = true; openBankAccountsModal(); await w(700);
    const fold = document.querySelector('#bankSelectedScroll .hk-acc-fold'), body = document.querySelector('#bankSelectedScroll .hk-acc-fold-body');
    const r = fold.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    fold.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
    fold.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true }));
    const now = body.getAnimations().length > 0 && window._hkInstFoldOpen === false;
    fold.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    const still = window._hkInstFoldOpen === false;
    await w(120);
    const h1 = body.getBoundingClientRect().height;
    await w(900);
    return { now, still, early: h1, closed: getComputedStyle(body).display === 'none' };
  }, [sms('18,500,000', '1405/08/06-09:05', '1037', 12, '90012')]);
  ok(f.now && f.still, 'پوشه همان لحظهٔ برداشتن انگشت جمع می‌شود (کلیک بعدی دوباره بازش نمی‌کند)');
  ok(f.closed, 'جمع شدن کامل با همان سرعت آرام');
  await F.ctx.close();

  console.log('• درآمد ثابت و خروجی آرشیو');
  const R = await fresh(b, { [P + '_recurring']: REC(10) }, { hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const r = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openFeatureSheet('recurring'); await w(1300);
    const rl = document.querySelector('#recurringBox .rec-list-scroll'), rows = [...rl.querySelectorAll('.recurring-row')];
    const lb = rl.getBoundingClientRect();
    const full = rows.filter(x => { const q = x.getBoundingClientRect(); return q.top >= lb.top - 1 && q.bottom <= lb.bottom + 1; }).length;
    const se = document.scrollingElement, pageFixed = se.scrollHeight <= se.clientHeight + 1;
    const ex = document.getElementById('recExportBtn').getBoundingClientRect(), exVis = ex.bottom <= innerHeight;
    const tools = rows.slice(0, 3).map(x => [...x.querySelectorAll('.rec-tools > button')].map(btn => { const q = btn.getBoundingClientRect(); return Math.round(q.left); }).join(','));
    const t0 = rows[0].querySelectorAll('.rec-tools > button');
    const cy = el => { const q = el.getBoundingClientRect(); return q.top + q.height / 2; };
    const xc = (() => { const del = t0[2], rng = document.createRange(); rng.selectNodeContents(del); const q = rng.getBoundingClientRect(); return q.top + q.height / 2; })();
    const align = Math.abs(xc - cy(t0[1])) <= 3;
    /* خروجی */
    hkOpenRecArcExport(); await w(300);
    const bx = document.querySelector('#hkRecArcEx .hk-rax');
    const on = bx.querySelector('.hk-rax-kind .hk-re-segb.on').dataset.k;
    await w(400); const pdfCol = getComputedStyle(bx.querySelector('.hk-rax-kind [data-k="pdf"]')).color;
    bx.querySelector('.hk-rax-kind [data-k="excel"]').click(); await w(500);
    const xlCol = getComputedStyle(bx.querySelector('.hk-rax-kind [data-k="excel"]')).color;
    const list = bx.querySelector('.hk-rax-list'), ov = getComputedStyle(list).overflowY;
    const lr = list.getBoundingClientRect();
    return { full, n: rows.length, pageFixed, exVis, tools, align, on, pdfCol, xlCol, ov, scrollable: list.scrollHeight > list.clientHeight, lx: lr.left + lr.width / 2, ly: lr.bottom - 24 };
  });
  ok(r.n === 10 && r.full === 7, 'باکس درآمد ثابت: ۷ ردیف کامل دیده می‌شود و بقیه داخل باکس اسکرول (' + r.full + ')');
  ok(r.pageFixed && r.exVis, 'صفحهٔ درآمد ثابت ثابت و بی‌اسکرول؛ دکمهٔ خروجی زیر باکس دیده می‌شود');
  ok(new Set(r.tools).size === 1 && r.align, 'آیکون‌های پوشه، ویرایش و حذف هر ردیف دقیقاً زیر ردیف بالایی و هم‌تراز (' + r.tools[0] + ')');
  ok(r.on === 'pdf', 'خروجی آرشیو: پیش‌فرض PDF');
  ok(/229, 72, 59/.test(r.pdfCol) && /33, 163, 102/.test(r.xlCol), 'تب PDF قرمز و تب اکسل سبز اکسل (' + r.pdfCol + ' / ' + r.xlCol + ')');
  ok(r.ov === 'auto' && r.scrollable, 'فهرست گزینه‌ها اسکرول‌پذیر');
  {
    const c = await R.ctx.newCDPSession(R.page);
    const tp = (type, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: r.lx, y }] });
    await tp('touchStart', r.ly); for (let k = 1; k <= 10; k++) { await tp('touchMove', r.ly - k * 12); await R.page.waitForTimeout(20); } await tp('touchEnd'); await R.page.waitForTimeout(300);
    const st = await R.page.evaluate(() => document.querySelector('#hkRecArcEx .hk-rax-list').scrollTop);
    ok(st > 40, 'با کشیدن انگشت گزینه‌ها اسکرول می‌شوند (' + st + 'px)');
  }
  await R.ctx.close();

  console.log('• حباب‌ها');
  const H = await fresh(b);
  await H.page.evaluate(() => {
    selectedBankAccounts = [{ label: 'ملت' }, { label: 'ملی' }, { label: 'سپه' }];
    const sec = periodData.income.sections[0];
    sec.rows = [{ id: 'i1', day: '5', desc: 'حقوق', amount: 5000000, account: 'ملت', status: 'paid' }, { id: 'i2', day: '6', desc: 'واریز', amount: 1200000, account: 'ملی', status: 'paid' }];
    periodData.expense.sections[0].rows = [{ id: 'e1', day: '7', desc: 'خرید', amount: 800000, account: 'سپه', status: 'paid' }];
  });
  const bx = await (await H.page.$('#homeBalanceCircle')).boundingBox();
  await H.page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await H.page.mouse.down();
  const gaps = []; let info = null, popAt = 0;
  const t0 = Date.now();
  for (let t = 0; t < 34; t++) {
    await H.page.waitForTimeout(500);
    const g = await H.page.evaluate(() => {
      const bs = [...document.querySelectorAll('#hkBubbles .hk-bub')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2, e]; });
      let m = 1e9; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) m = Math.min(m, Math.hypot(bs[i][0] - bs[j][0], bs[i][1] - bs[j][1]) - bs[i][2] - bs[j][2]);
      const acc = bs.filter(x => !x[3].classList.contains('sm')).map(x => x[3]);
      return { n: bs.length, sm: bs.filter(x => x[3].classList.contains('sm')).length, m: Math.round(m), pop: !!document.querySelector('.hk-bub.pop'), gone: !document.getElementById('hkBubbles'),
        rims: [...new Set(acc.map(e => getComputedStyle(e).boxShadow + '|' + getComputedStyle(e).backgroundImage))].length, ir: acc.every(e => e.querySelector('.ir')), smEmpty: bs.filter(x => x[3].classList.contains('sm')).every(x => !x[3].querySelector('.nm')) };
    });
    const sec = (Date.now() - t0) / 1000;
    if (!info && g.n) info = g;
    if (sec > 2 && sec < 9.6 && !g.pop && g.n) gaps.push(g.m);
    if ((g.pop || g.gone) && !popAt) { popAt = sec; break; }
  }
  await H.page.mouse.up();
  ok(info && info.n - info.sm === 3 && info.sm >= 4 && info.smEmpty, 'بین حباب‌های حساب‌ها چند حباب کوچک خالی (' + (info && info.sm) + ')');
  ok(info && info.rims === 1 && info.ir, 'دور همهٔ حباب‌ها یکسان (لبهٔ رنگین‌کمانی حباب واقعی)؛ پروژه فقط با نقطه‌های داخل');
  ok(!/\.hk-bub[^{]*\{[^}]*--pc/.test(src) && !/hkBubShine/.test(src), 'خط صافِ براق و رنگ دور پروژه برداشته شد');
  ok(gaps.length > 8 && Math.min(...gaps) >= 0, 'پیش از ۱۰ ثانیه حباب‌ها به هم نمی‌خورند (کمترین فاصله ' + Math.min(...gaps) + 'px)');
  ok(popAt >= 10 && popAt <= 17.5, 'سر ۱۰ ثانیه آرام به هم می‌رسند و می‌ترکند (' + popAt.toFixed(1) + 's)');
  const wt = await H.page.evaluate(() => hkWidgetTxRows('income'));
  ok(wt[0] && wt[0].b === 'ملی' && wt[1].b === 'ملت', 'ویجت ردیف‌ها: اسم حساب هر ردیف هم فرستاده می‌شود');
  await H.ctx.close();

  const andr = require('../lib/android-src')();
  ok(/final class HkWidgetTxDraw/.test(andr) && /R\.font\.hk_vazir_regular/.test(andr.slice(andr.indexOf('final class HkWidgetTxDraw'))), 'ویجت ردیف‌ها با فونت وزیرمتن نرم‌افزار کشیده می‌شود');
  ok(/String\[\] lb=\{"تاریخ","شرح","حساب","مبلغ"\}/.test(andr), 'ردیف عنوان با ترتیب ستون‌های نرم‌افزار: تاریخ | شرح | حساب | مبلغ');
  ok(/static void grid\(/.test(andr) && /14\.5f\*k/.test(andr), 'خط‌کشی ستون‌ها و ردیف‌ها؛ قلم بزرگ‌تر');

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1379: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
