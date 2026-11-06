// ۱.۳.۷۸: اسلاید یادآورها ساده (بی نقطه)؛ پنجرهٔ یادآورها باکس جمع‌وجور با برچسب روزها و آیکن ویرایش/حذف، هایلایت بی نوار چرخان؛
// برش عکس پروفایل (کشیدن/بزرگ‌نمایی، ۵۱۲)؛ پوشه و «انتخاب حساب» آرام‌تر؛ زمینهٔ کم‌مات؛ حباب‌های حساب با نگه‌داشتن دایرهٔ موجودی؛ داده‌های ویجت ردیف‌ها. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const fs = require('fs');
const path = require('path');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b, extra) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const REM = JSON.stringify([{ id: 'r1', title: 'اجارهٔ خانه', y: 1405, m: 8, d: 13, repeat: 'monthly', advanceDays: 3 }, { id: 'r2', title: 'تمدید بیمه', y: 1405, m: 9, d: 20, repeat: 'once', advanceDays: 7, note: 'بیمهٔ بدنه' }]);

(async () => {
  const b = await chromium.launch();

  console.log('• اسلاید و پنجرهٔ یادآورها');
  const R = await fresh(b, { [P + '_userReminders']: REM });
  const r = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tt = hkMainTitle();
    _smartPanelState[tt] = { key: 'reminders', pausedUntil: Date.now() + 60000, nextAt: Date.now() + 60000 }; renderHomeCards(); await w(500);
    const pg = document.querySelector('#homeSmartBox .sp-page.sp-k-reminders');
    const rows = [...pg.querySelectorAll('.sp-rem-r')].map(x => ({ t: x.querySelector('b').textContent, s: x.querySelector('span').textContent }));
    const dots = pg.querySelectorAll('.hk-inst-dot, .sp-rem-dot').length;
    const hot = pg.querySelector('.sp-rem-r.hot');
    const snake = hot.classList.contains('hk-snake'), dur = parseFloat(getComputedStyle(hot, '::before').animationDuration);
    const due = getComputedStyle(hot.querySelector('.sp-rem-due')).color;
    window.spGo = fn => fn();
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    el._spPages.find(p => p.key === 'reminders').onTap(tt, pg.querySelector('[data-rem="r2"] b'));
    await w(1900);
    const list = document.getElementById('userRemindersList');
    const it = list.querySelector('.ur-item[data-ur-id="r2"]');
    const hl = it.classList.contains('ur-hl');
    const r1 = list.querySelector('.ur-item[data-ur-id="r1"]');
    /* هایلایت روی یادآور سررسیده: نوار چرخان دیده نشود */
    r1.classList.add('ur-hl'); const snakeHidden = getComputedStyle(r1, '::before').display === 'none'; r1.classList.remove('ur-hl');
    const snakeBack = getComputedStyle(r1, '::before').display !== 'none' && r1.classList.contains('hk-snake');
    const row1 = it.querySelector('.ur-row1'), nm = row1 && row1.querySelector('.ur-title').textContent, chip = row1 && row1.children.length >= 2;
    const meta = it.querySelector('.ur-meta').textContent, note = (it.querySelector('.ur-note') || {}).textContent || '';
    const icons = (it.querySelector('.ur-actions .ur-edit svg path[d="M12 20h9"]') ? 1 : 0) + (it.querySelector('.ur-actions .ur-del') && it.querySelector('.ur-actions .ur-del').textContent.trim() === '×' ? 1 : 0);
    const h = it.getBoundingClientRect().height;
    return { rows, dots, snake, dur, due, hl, snakeHidden, snakeBack, nm, chip, meta, note, icons, h, compact: it.classList.contains('ur-compact') };
  });
  ok(r.rows.length === 2 && r.rows[0].t === 'اجارهٔ خانه' && /^فردا، /.test(r.rows[0].s), 'اسلاید: همان ردیف ساده «اسم | فردا، تاریخ»');
  ok(r.dots === 0, 'اسلاید: نقطه‌های قرمز برداشته شد');
  ok(r.snake && r.dur >= 4, 'اسلاید: نوار قرمز چرخان آرام‌تر (' + r.dur + 's)');
  ok(/^rgb\((1[6-9]\d|2[0-2]\d), (2\d|3\d|4\d|5\d|6\d|7\d), (1\d|2\d|3\d|4\d|5\d|6\d)\)$/.test(r.due), 'اسلاید: متن یادآور سررسیده قرمز تیره‌تر (' + r.due + ')');
  ok(r.hl, 'زدن ردیف اسلاید: در پنجرهٔ یادآورها همان هایلایت می‌شود');
  ok(r.snakeHidden && r.snakeBack, 'هنگام هایلایت فقط آبی (بی نوار چرخان)؛ بعدش نوار برمی‌گردد');
  ok(r.compact && r.nm === 'تمدید بیمه' && r.chip, 'پنجره: اسم یادآور و برچسب روزهای مانده جلویش');
  ok(/^سررسید: /.test(r.meta) && r.note.indexOf('بیمهٔ بدنه') >= 0, 'زیرش سررسید و یادداشت (' + r.meta + ')');
  ok(r.icons === 2, 'آیکن ویرایش و حذف کنار باکس');
  ok(r.h > 0 && r.h <= 110, 'باکس بزرگ نشده (' + Math.round(r.h) + 'px)');
  await R.ctx.close();

  console.log('• برش عکس پروفایل');
  const C = await fresh(b);
  const c = await C.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 800; const g = cv.getContext('2d');
    g.fillStyle = '#d00'; g.fillRect(0, 0, 600, 800); g.fillStyle = '#00d'; g.fillRect(600, 0, 600, 800);
    const img = new Image(); img.src = cv.toDataURL('image/png'); await new Promise(r => img.onload = r);
    let out = null;
    hkAvatarCropUI(img, u => { out = u; }); await w(200);
    const ov = document.getElementById('hkAvCrop'), fr = ov.querySelector('.hk-crop-frame');
    const s0 = ov._hkState();
    const rc = fr.getBoundingClientRect();
    const fire = (t, x, y) => fr.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    fire('pointerdown', rc.left + 100, rc.top + 100); fire('pointermove', rc.left + 160, rc.top + 100); fire('pointerup', rc.left + 160, rc.top + 100);
    const s1 = ov._hkState();
    const z = ov.querySelector('.hk-crop-zoom'); z.value = '2'; z.dispatchEvent(new Event('input')); await w(50);
    const s2 = ov._hkState();
    const btns = [...ov.querySelectorAll('button')].map(x => x.textContent).join('|');
    ov.querySelector('.chg').click(); await w(100);
    const im2 = new Image(); im2.src = out || ''; await new Promise(r => { im2.onload = r; im2.onerror = r; });
    return { square: s0.F > 0 && Math.round(rc.width) === Math.round(rc.height), moved: s1.x !== s0.x, zoom: s2.z === 2, btns, jpeg: /^data:image\/jpeg/.test(out || ''), dims: [im2.naturalWidth, im2.naturalHeight], closed: !document.getElementById('hkAvCrop') };
  });
  ok(c.square && c.btns === 'ثبت|انصراف', 'پنجرهٔ برش: کادر مربعی با «ثبت / انصراف»');
  ok(c.moved && c.zoom, 'کشیدن عکس جابه‌جا می‌کند و بزرگ‌نمایی کار می‌کند');
  ok(c.jpeg && c.dims[0] === 512 && c.dims[1] === 512 && c.closed, 'خروجی ۵۱۲×۵۱۲ با کیفیت بهتر (' + c.dims.join('×') + ')');
  await C.ctx.close();

  console.log('• سرعت پوشه و «انتخاب حساب»، زمینهٔ کم‌مات');
  const S = await fresh(b);
  const s = await S.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const css = [...document.styleSheets].flatMap(ss => { try { return [...ss.cssRules]; } catch (e) { return []; } });
    const rule = sel => css.filter(x => x.selectorText && x.selectorText.split(',').map(t => t.trim()).includes(sel)).pop();
    const add = rule('.hk-add-ov'), bm = rule('#bankAccountsModal.open > .modal-box');
    openBankAccountsModal(); await w(60);
    const anim = document.querySelector('#bankAccountsModal .modal-box').getAnimations().length > 0;
    await w(600);
    closeBankAccountsModal(); await w(80);
    const ghost = !!document.querySelector('.hk-bm-ghost, [data-hk-bm-ghost]') || document.body.lastElementChild.classList.contains('modal-box') || [...document.body.children].some(x => x.getAnimations && x.getAnimations().length && /modal-box/.test(x.className));
    const modalClosed = !document.getElementById('bankAccountsModal').classList.contains('open');
    return { addBg: add && add.style.background, dur: bm && parseFloat(bm.style.animationDuration || bm.style.animation.match(/([\d.]+)s/)[1]), anim, ghost, modalClosed };
  });
  ok(/rgba\(0, 0, 0, 0\.1[0-9]?\)/.test(s.addBg || '') , 'پشت «+» و انتخاب میان‌بر کمتر مات (' + s.addBg + ')');
  ok(s.anim && s.dur >= 0.4, '«انتخاب حساب» آرام باز می‌شود (' + s.dur + 's)');
  ok(s.modalClosed && s.ghost, '«انتخاب حساب» آرام بسته می‌شود');
  const src = fs.readFileSync(process.env.HK_INDEX || path.join(__dirname, '../../index.html'), 'utf8');
  ok(/_hkSlideMs\s*=\s*780/.test(src), 'پوشهٔ کارت‌های قسط آهسته‌تر باز و بسته می‌شود');
  await S.ctx.close();

  console.log('• حباب‌های حساب‌ها');
  const H = await fresh(b);
  const setup = async () => H.page.evaluate(() => {
    selectedBankAccounts = [{ label: 'ملت' }, { label: 'ملی' }, { label: 'سپه' }];
    const sec = periodData.income.sections[0]; sec.rows = (sec.rows || []).filter(x => x.amount);
    sec.rows.push({ id: 'i1', day: '5', desc: 'حقوق', amount: 5000000, account: 'ملت', status: 'paid' });
    sec.rows.push({ id: 'i2', day: '6', desc: 'واریز', amount: 1200000, account: 'ملی', status: 'paid' });
    const ex = periodData.expense.sections[0]; ex.rows = (ex.rows || []).filter(x => x.amount);
    ex.rows.push({ id: 'e1', day: '7', desc: 'خرید', amount: 800000, account: 'سپه', status: 'paid' });
  });
  await setup();
  const circ = await H.page.$('#homeBalanceCircle');
  const bx = await circ.boundingBox();
  await H.page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await H.page.mouse.down();
  await H.page.waitForTimeout(1700);
  const h1 = await H.page.evaluate(() => {
    const bs = [...document.querySelectorAll('#hkBubbles .hk-bub:not(.sm)')];
    return { n: bs.length, names: bs.map(x => x.querySelector('.nm').textContent).join('|'), neg: bs.filter(x => x.classList.contains('neg')).map(x => x.querySelector('.nm').textContent).join('|'),
      negCol: (() => { const n = bs.find(x => x.classList.contains('neg')); return n ? getComputedStyle(n.querySelector('.am')).color : ''; })(),
      posCol: (() => { const n = bs.find(x => !x.classList.contains('neg')); return n ? getComputedStyle(n.querySelector('.am')).color : ''; })(),
      shine: bs.every(x => x.querySelector('.sh')), pe: getComputedStyle(document.getElementById('hkBubbles')).pointerEvents };
  });
  const p1 = await H.page.evaluate(() => [...document.querySelectorAll('#hkBubbles .hk-bub:not(.sm)')].map(x => x.style.transform).join(';'));
  await H.page.waitForTimeout(400);
  const p2 = await H.page.evaluate(() => [...document.querySelectorAll('#hkBubbles .hk-bub:not(.sm)')].map(x => x.style.transform).join(';'));
  await H.page.mouse.up();
  await H.page.waitForTimeout(150);
  /* ۱.۳.۸۰: با رها کردن روی صفحه می‌مانند؛ «برگشت» همه را آرام محو می‌کند */
  const stay = await H.page.evaluate(() => !!document.getElementById('hkBubbles') && !document.querySelector('#hkBubbles.out'));
  await H.page.evaluate(() => onBackGuard()); await H.page.waitForTimeout(150);
  const h2 = await H.page.evaluate(() => ({ fading: !!document.querySelector('#hkBubbles.out'), instant: !!(window._instantBalOpen) || !!document.querySelector('.instant-balance-modal.open, #instantBalanceModal.open') }));
  await H.page.waitForTimeout(1000);
  const gone = await H.page.evaluate(() => !document.getElementById('hkBubbles'));
  ok(h1.n === 3 && h1.names === 'ملت|ملی|سپه', 'به تعداد حساب‌ها حباب پخش می‌شود و اسم هر حساب داخلش (' + h1.names + ')');
  ok(h1.neg === 'سپه' && /^rgb\(2[0-5]\d, 1[0-6]\d, \d{1,2}\)$|^rgb\(2[0-5]\d, [5-9]\d, \d{1,2}\)$/.test(h1.negCol) && /^rgb\(\d{1,3}, (1[3-9]\d|2[0-5]\d), \d{1,3}\)$/.test(h1.posCol), 'منفی نارنجی، مثبت سبز (' + h1.negCol + ' / ' + h1.posCol + ')');
  ok(h1.shine && h1.pe === 'auto', 'حباب‌ها برق می‌زنند؛ تا روی صفحه‌اند لمس به صفحهٔ پشت نمی‌رسد');
  ok(p1 !== p2, 'حباب‌ها آرام و نامنظم حرکت می‌کنند');
  ok(stay && h2.fading && gone && !h2.instant, 'با رها کردن روی صفحه می‌مانند؛ «برگشت» آرام محوشان می‌کند؛ موجودی آنی باز نمی‌شود');
  /* بیش از ۱۰ ثانیه: ترکیدن */
  await H.page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await H.page.mouse.down();
  /* ۱.۳.۷۹: سر ۱۰ ثانیه آرام به هم می‌رسند؛ ترکیدن تا چند ثانیه بعد */
  await H.page.waitForTimeout(10000);
  await H.page.waitForFunction(() => !!document.querySelector('#hkBubbles .hk-bub.pop') || !document.getElementById('hkBubbles'), null, { timeout: 8000 }).catch(() => {});
  const pop = await H.page.evaluate(() => ({ popped: !!document.querySelector('#hkBubbles .hk-bub.pop') || !document.getElementById('hkBubbles'), drops: document.querySelectorAll('#hkBubbles .hk-bub-drop').length, done: !!(window._hkBubPress && window._hkBubPress.done) }));
  await H.page.waitForTimeout(3500);
  const after = await H.page.evaluate(() => !document.getElementById('hkBubbles'));
  await H.page.mouse.up();
  ok(pop.popped && pop.done && after, 'بیش از ۱۰ ثانیه: به هم می‌خورند، می‌ترکند و نگه‌داشتن رها می‌شود');
  /* ویجت ردیف‌ها */
  const wt = await H.page.evaluate(() => ({ e: hkWidgetTxRows('expense'), i: hkWidgetTxRows('income'), f: formatNum(800000) }));
  ok(wt.i.length === 2 && wt.i[0].t === 'واریز' && wt.i[1].t === 'حقوق' && /۶ /.test(wt.i[0].d), 'ویجت ردیف‌ها: درآمدها تازه‌ترین بالا (' + wt.i.map(x => x.d + ' ' + x.t).join('، ') + ')');
  ok(wt.e.length === 1 && wt.e[0].t === 'خرید' && wt.e[0].a === wt.f, 'ویجت ردیف‌ها: مخارج با مبلغ');
  await H.ctx.close();

  const andr = require('../lib/android-src')();
  ok(/HkWidgetTxConfig/.test(andr) && /APPWIDGET_CONFIGURE/.test(andr) && /"مخارج"/.test(andr) && /"درآمدها"/.test(andr) && /hk_widget_tx_info/.test(andr), 'ویجت ردیف‌ها: هنگام افزودن انتخاب «مخارج / درآمدها»');

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1378: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
