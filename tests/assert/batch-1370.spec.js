// ۱.۳.۷۰: فاصلهٔ دایرهٔ موجودی تا لبهٔ فرورفتگی = فاصلهٔ عمودی دو باکس؛ پاک‌کنِ یادداشت دست‌نویس؛ رنگ‌های سبز/نارنجی/زرد.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
const SHOT = process.env.HK_SHOT_DIR || '';

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();

  console.log('• دایرهٔ موجودی و فرورفتگی');
  for (const th of ['dark', 'light']) {
    const H = await fresh(b, th);
    const g = await H.page.evaluate(() => {
      const top = document.getElementById('homeDockTop'), b4 = document.getElementById('homeBox4'), c = document.getElementById('homeBalanceCircle');
      const n = top.querySelector('.hk-notch'), n4 = b4.querySelector('.hk-notch');
      const rt = top.getBoundingClientRect(), r4 = b4.getBoundingClientRect(), rc = c.getBoundingClientRect(), rn = n.getBoundingClientRect(), rn4 = n4.getBoundingClientRect();
      return { vGap: r4.top - rt.bottom, ring: (rn.width - rc.width) / 2, ringH: (rn.height - rc.height) / 2, sameN: Math.abs(rn.left - rn4.left) < 0.6 && Math.abs((rn.top + rn.height / 2) - (rn4.top + rn4.height / 2)) < 0.6,
        center: Math.abs((rc.top + rc.height / 2) - (rt.bottom + r4.top) / 2) < 1, fitsTop: rn.top > rt.top + 2, fitsBot: rn4.bottom < r4.bottom - 2 };
    });
    ok(g.vGap > 0 && Math.abs(g.ring - g.vGap) < 0.6 && Math.abs(g.ringH - g.vGap) < 0.6 && g.sameN && g.center, th + ': فاصلهٔ دایره تا لبهٔ فرورفتگی = فاصلهٔ عمودی دو باکس (' + g.ring + ' / ' + g.vGap + ')');
    ok(g.fitsTop && g.fitsBot, th + ': فرورفتگی از لبهٔ بیرونی باکس‌ها بیرون نمی‌زند');
    if (SHOT) await H.page.screenshot({ path: SHOT + '/home-' + th + '.png' });
    await H.ctx.close();
  }

  console.log('• یادداشت دست‌نویس: پاک‌کن و رنگ‌ها');
  const N = await fresh(b);
  await N.page.evaluate(() => openInkEditor(hkMainTitle(), null)); await N.page.waitForTimeout(500);
  const ui = await N.page.evaluate(() => ({
    cols: [...document.querySelectorAll('#hkInkEd .hk-ink-colors button')].map(x => x.dataset.c).join(''),
    noClear: !document.querySelector('#hkInkEd .hk-ink-clear') && !/پاک کردن/.test(document.getElementById('hkInkEd').textContent),
    er: !!document.querySelector('#hkInkEd .hk-ink-eraser svg'),
    oneRow: (() => { const t = document.querySelector('#hkInkEd .hk-ink-tools'); const ys = [...t.children].map(c => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2)); return Math.max(...ys) - Math.min(...ys) <= 2 && t.scrollWidth <= t.clientWidth + 1; })(),
    sw: [...document.querySelectorAll('#hkInkEd .hk-ink-colors button i')].map(i => getComputedStyle(i).backgroundColor)
  }));
  ok(ui.cols === 'tbrgoy' && new Set(ui.sw).size === 6, 'رنگ‌ها: اصلی، آبی، قرمز، سبز، نارنجی، زرد (' + ui.sw.join(' ') + ')');
  ok(ui.noClear && ui.er, 'دکمهٔ «پاک کردن» برداشته شد و آیکن پاک‌کن جایش آمد');
  ok(ui.oneRow, 'ابزارها در یک ردیف جا می‌شوند');
  const cb = await N.page.locator('#hkInkEd canvas').boundingBox();
  const line = async (y, c) => {
    await N.page.click('#hkInkEd .hk-ink-colors button[data-c="' + c + '"]');
    await N.page.mouse.move(cb.x + 20, cb.y + y); await N.page.mouse.down();
    await N.page.mouse.move(cb.x + cb.width - 20, cb.y + y, { steps: 12 }); await N.page.mouse.up();
  };
  await line(40, 'g'); await line(110, 'o');
  /* پاک‌کن: یک کشیدن عمودی از وسط خط بالا (فقط خط بالا را می‌بُرد) */
  await N.page.click('#hkInkEd .hk-ink-eraser');
  const erOn = await N.page.evaluate(() => document.querySelector('#hkInkEd .hk-ink-eraser').classList.contains('on') && !document.querySelector('#hkInkEd .hk-ink-colors button.on'));
  const mx = cb.x + cb.width / 2;
  await N.page.mouse.move(mx, cb.y + 20); await N.page.mouse.down(); await N.page.mouse.move(mx, cb.y + 62, { steps: 6 }); await N.page.mouse.up();
  if (SHOT) await N.page.screenshot({ path: SHOT + '/ink-erased.png' });
  const st1 = await N.page.evaluate(() => {
    /* خط‌ها را با ذخیره می‌خوانیم */
    document.querySelector('#hkInkEd .todo-save').click();
    return new Promise(r => setTimeout(() => { const l = loadTodoLists(hkMainTitle())[0]; r(l ? l.ink.map(s => ({ c: s.c, n: s.p.length, x0: Math.min(...s.p.map(p => p[0])), x1: Math.max(...s.p.map(p => p[0])) })) : null); }, 500));
  });
  ok(erOn, 'با زدن پاک‌کن، حالت پاک کردن روشن و رنگ انتخاب‌شده خاموش می‌شود');
  const g1 = (st1 || []).filter(s => s.c === 'g'), o1 = (st1 || []).filter(s => s.c === 'o');
  ok(g1.length === 2 && g1[0].x1 < 500 && g1[1].x0 > 500 || g1.length === 2 && g1[1].x1 < 500 && g1[0].x0 > 500, 'پاک‌کن خط سبز را از وسط برید (دو تکه) (' + JSON.stringify(g1) + ')');
  ok(o1.length === 1, 'خط نارنجی که پاک‌کن از رویش رد نشد دست نخورد');
  const svg = await N.page.evaluate(() => [...document.querySelectorAll('#homeSmartBox .sp-ink path')].map(p => p.getAttribute('stroke')));
  ok(svg.length === 3 && svg.some(s => /--hk-income/.test(s)) && svg.some(s => /--hk-personal/.test(s)), 'اسلاید: سبز و نارنجی با رنگ تم کشیده می‌شوند');
  /* برگشت یک قدم بعد از پاک کردن، خط پاک‌شده را برمی‌گرداند */
  const und = await N.page.evaluate(async () => {
    const id = loadTodoLists(hkMainTitle())[0].id; openInkEditor(hkMainTitle(), id); await new Promise(r => setTimeout(r, 400));
    return id;
  });
  const cb2 = await N.page.locator('#hkInkEd canvas').boundingBox();
  await N.page.click('#hkInkEd .hk-ink-eraser');
  await N.page.mouse.move(cb2.x + 20, cb2.y + 110); await N.page.mouse.down(); await N.page.mouse.move(cb2.x + cb2.width - 20, cb2.y + 110, { steps: 14 }); await N.page.mouse.up();
  const mid = await N.page.evaluate(() => getComputedStyle(document.querySelector('#hkInkEd .hk-ink-hint')).display);
  await N.page.click('#hkInkEd .hk-ink-undo');
  await N.page.evaluate(() => document.querySelector('#hkInkEd .todo-save').click()); await N.page.waitForTimeout(500);
  const st2 = await N.page.evaluate(id => loadTodoLists(hkMainTitle()).find(l => l.id === id).ink.map(s => s.c).join(''), und);
  ok(mid === 'none' && st2.split('').sort().join('') === 'ggo', 'برگشت یک قدم، تکهٔ پاک‌شده را برمی‌گرداند (' + st2 + ')');
  await N.ctx.close();

  console.log('• یادداشت در حالت روز');
  const L = await fresh(b, 'light');
  await L.page.evaluate(() => openInkEditor(hkMainTitle(), null)); await L.page.waitForTimeout(500);
  if (SHOT) await L.page.screenshot({ path: SHOT + '/ink-light.png' });
  const lsw = await L.page.evaluate(() => [...document.querySelectorAll('#hkInkEd .hk-ink-colors button i')].map(i => getComputedStyle(i).backgroundColor));
  ok(new Set(lsw).size === 6, 'حالت روز: شش رنگ متمایز');
  await L.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1370: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
