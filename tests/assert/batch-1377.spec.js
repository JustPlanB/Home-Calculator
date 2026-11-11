// ۱.۳.۷۷: راهنمای جدول وسط فضای خالی؛ فلش اسکرول بی دایره؛ تاریخ فقط در صفحهٔ اصلی؛ جستجو با اسکرول خیلی سریع محو؛ زمینهٔ مات پشت «+» و میان‌برها؛
// پوشهٔ قسط (آیکون زرد، باز شدن آرام)، بانک‌های پیش‌فرض جمع‌وجور؛ باکس تغییر نام؛ ویرگول هم‌رنگ؛ اسلاید یادآورها؛ پروفایل؛ عکس در PDF. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

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
const sms = (amt, dt, to, n, ov, pen, tr) => `بانک مسکن\nواريز قسط به مبلغ:${amt}ريال\nزمان:${dt}\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-${to}\nتعداد اقساط پرداختي :${n}\nمانده معوق :${ov}\nمانده جريمه :${pen}\nشماره پيگيري:${tr}`;
const REM = JSON.stringify([{ id: 'r1', title: 'اجارهٔ خانه', y: 1405, m: 8, d: 13, repeat: 'monthly', advanceDays: 3 }, { id: 'r2', title: 'تمدید بیمه', y: 1405, m: 9, d: 20, repeat: 'once', advanceDays: 7 }]);

(async () => {
  const b = await chromium.launch();

  console.log('• جدول، تاریخ، جستجو، زمینهٔ مات');
  const A = await fresh(b);
  const a = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ln = document.getElementById('hkTodayLine'), homeVis = getComputedStyle(ln).display !== 'none';
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    exp.rows = []; for (let i = 0; i < 30; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + (i % 28)), desc: 'خرج ' + i, amount: (i + 1) * 10000, status: 'paid' }));
    persistCurrent(); renderAll(); openPersonDetail(t, 'expense'); await w(1200);
    const detailHidden = getComputedStyle(ln).display === 'none';
    const box = document.querySelector('.person-detail-box'), hint = box.querySelector('.person-detail-hint'), sc = box.querySelector('.person-detail-scroll'), fab = document.getElementById('hkScrollFab');
    const rg = document.createRange(); rg.selectNodeContents(hint); const q = rg.getBoundingClientRect(), br = box.getBoundingClientRect(), fr = fab.getBoundingClientRect();
    const fcs = getComputedStyle(fab);
    const out = { homeVis, detailHidden, sides: [q.left, innerWidth - q.right] /* ۱.۳.۸۰: وسط خود صفحه (فاصلهٔ دو طرف تا لبه‌های صفحه) */, gap: rg.getClientRects()[0].top - sc.getBoundingClientRect().bottom, noCircle: fcs.backgroundColor === 'rgba(0, 0, 0, 0)' && fcs.boxShadow === 'none' };
    closePersonDetail ? closePersonDetail() : 0; await w(300);
    hkHomeAddMenu(document.querySelector('.home-circle-add')); await w(250);
    const ao = getComputedStyle(document.getElementById('hkAddPop'));
    out.addDim = ao.backgroundColor !== 'rgba(0, 0, 0, 0)' && /blur/.test(ao.backdropFilter || ao.webkitBackdropFilter || '');
    document.getElementById('hkAddPop')._hkCancel();
    hkDockOpenPop(document.querySelector('#homeDockTop .hk-dock-L'), 'L'); await w(250);
    const dp = getComputedStyle(document.getElementById('hkDockPop'));
    out.dockDim = dp.backgroundColor !== 'rgba(0, 0, 0, 0)';
    try { document.getElementById('hkDockPop')._hkCancel(); } catch (e) { document.getElementById('hkDockPop').remove(); }
    /* جستجو: اسکرول متوسط محو نمی‌کند، خیلی سریع محو می‌کند */
    openSideMenu(); await w(300);
    const sw = document.querySelector('#menuDropdown .hk-msearch-wrap'), msc = document.querySelector('#menuDropdown .menu-scroll');
    msc.scrollTop = 0; msc.dispatchEvent(new Event('scroll')); await w(100); msc.scrollTop = 80; msc.dispatchEvent(new Event('scroll'));
    out.midHide = sw.classList.contains('hk-ms-hide');
    await w(400);
    msc.scrollTop = 0; msc.dispatchEvent(new Event('scroll')); await w(16); msc.scrollTop = 600; msc.dispatchEvent(new Event('scroll'));
    out.fastHide = sw.classList.contains('hk-ms-hide');
    return out;
  });
  ok(a.homeVis && a.detailHidden, 'تاریخ روز فقط در صفحهٔ اصلی (در جدول درآمد/مخارج پنهان)');
  ok(Math.abs(a.sides[0] - a.sides[1]) < 2 && a.gap < 20, 'راهنمای جدول: فضای خالی دو طرف نوشته یکی (' + a.sides.map(Math.round).join(' / ') + ')، فاصله تا جدول همان');
  ok(a.noCircle, 'فلش اسکرول بی دایره');
  ok(a.addDim && a.dockDim, 'پشت باکس «+» و انتخاب میان‌بر مات');
  ok(!a.midHide && a.fastHide, 'جستجوی منو فقط با اسکرول خیلی سریع محو می‌شود');
  await A.ctx.close();

  console.log('• انتخاب حساب و کارت‌های قسط');
  const B = await fresh(b);
  const bb = await B.page.evaluate(async (S) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    S.forEach(x => enqueueBankSms(x, { silent: true })); await w(600);
    window._hkInstFoldOpen = false; openBankAccountsModal(); await w(400);
    const fold = document.querySelector('#bankSelectedScroll .hk-acc-fold'), ic = fold.querySelector('.ic');
    const icBg = getComputedStyle(ic).backgroundColor, title = getComputedStyle(fold.querySelector('b')).color;
    const body = document.querySelector('#bankSelectedScroll .hk-acc-fold-body');
    fold.click(); await w(150);
    const mid = body.getBoundingClientRect().height, anim = body.getAnimations().length > 0;
    await w(900);
    const full = body.getBoundingClientRect().height;
    const bw = document.getElementById('bankBanksScroll'), rows = bw.querySelectorAll('.hk-bank-add-row');
    const vis = [...rows].filter(r => r.getBoundingClientRect().bottom <= bw.getBoundingClientRect().bottom + 1).length;
    const plus = rows[0].querySelector('button').getBoundingClientRect().height;
    const sep = getComputedStyle(bw).borderTopWidth;
    document.getElementById('bankAccountsModal').classList.remove('open');
    hkOpenInstHistory('1037'); await w(100);
    document.querySelector('#hkInstOv .hk-inst-ren').click(); await w(150);
    const rb = document.getElementById('hkInstRen');
    const inp = rb.querySelector('input'); inp.value = 'قسط خانه';
    rb.querySelector('.hk-re-ok').click(); await w(200);
    const renamed = hkInstCards().find(c => c.id === '1037').name;
    try { document.getElementById('hkInstOv')._hkCancel(); } catch (e) {}
    const st = hkInstStatusHtml(hkInstStatus(hkInstCards().find(c => c.id === '2979')), false);
    const d = document.createElement('div'); d.innerHTML = st;
    const comma = d.querySelector('.hk-inst-ok').textContent.trim().endsWith('،');
    return { icBg, title, anim, mid, full, vis, plus, sep, renamed, comma };
  }, [sms('18,500,000', '1405/08/06-09:05', '1037', 12, 0, 0, '90012'), sms('2,000,000', '1405/08/12-11:40', '1037', 12, 0, 0, '90013'), sms('21,652,000', '1405/08/06-08:30', '2979', 36, 0, 0, '90031')]);
  ok(bb.icBg === 'rgba(0, 0, 0, 0)' && /255, 197, 49|201, 138, 0/.test(bb.title), 'پوشه: فقط آیکون پوشهٔ زرد بی زمینه؛ اسم زرد');
  ok(bb.anim && bb.mid < bb.full, 'پوشه آرام باز می‌شود (افکت مثل رمز پشتیبان)');
  ok(bb.vis === 3 && bb.plus <= 26.5, 'بانک‌ها: «نام بانک دلخواه» و سه بانک دیده می‌شود، بقیه با اسکرول؛ «+» کوچک‌تر (' + bb.vis + ')');
  ok(bb.sep === '0px', '۱.۳.۹۹: «حساب‌های من» هم‌شکل بقیهٔ صفحه‌ها: به‌جای خط تفکیک کلفت، گروه گرد جدا');
  ok(bb.renamed === 'قسط خانه', 'تغییر نام کارت قسط در باکس ویرایش با «ثبت»');
  ok(bb.comma, 'اسلاید قسط: ویرگول هم‌رنگ جمله');
  await B.ctx.close();

  console.log('• اسلاید یادآورها');
  const R = await fresh(b, { [P + '_userReminders']: REM });
  const r = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tt = hkMainTitle();
    const show = async () => { _smartPanelState[tt] = { key: 'reminders', pausedUntil: Date.now() + 60000, nextAt: Date.now() + 60000 }; renderHomeCards(); await w(500); return document.querySelector('#homeSmartBox .sp-page.sp-k-reminders'); };
    let pg = await show();
    const rows = [...pg.querySelectorAll('.sp-rem-r')];
    const box = rows.map(x => ({ t: x.querySelector('b').textContent, when: x.querySelector('span').textContent, acts: x.querySelectorAll('button').length }));
    const dots = pg.querySelectorAll('.hk-inst-dot').length;
    const hot = pg.querySelector('.sp-rem-r.hot'), dur = parseFloat(getComputedStyle(hot, '::before').animationDuration), col = getComputedStyle(hot.querySelector('b')).color;
    /* ویرایش آنی */
    loadUserReminders(); userReminders[1].title = 'تمدید بیمهٔ ماشین'; userReminders.push({ id: 'r3', title: 'قبض گاز', y: 1405, m: 8, d: 25, repeat: 'monthly', advanceDays: 2 }); saveUserReminders(); await w(400);
    pg = document.querySelector('#homeSmartBox .sp-page.sp-k-reminders');
    const live = pg ? [...pg.querySelectorAll('.sp-rem-r b')].map(x => x.textContent) : [];
    /* زدن = رفتن روی همان یادآور و هایلایت (بی ویرایش) */
    window.spGo = fn => fn();
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    el._spPages.find(p => p.key === 'reminders').onTap(tt, pg.querySelector('[data-rem="r2"] b'));
    await w(1500);
    const hl = !!document.querySelector('#userRemindersList .ur-item.ur-hl[data-ur-id="r2"]'), noEditor = !document.getElementById('urEditor') || getComputedStyle(document.getElementById('urEditor')).display === 'none';
    const dueSnake = !!document.querySelector('#userRemindersList .ur-item.hk-snake[data-ur-id="r1"]');
    return { box, dots, dur, col, live, hl, noEditor, dueSnake };
  });
  ok(r.box.length === 2 && /^فردا، /.test(r.box[0].when) && r.box.every(x => x.acts === 0), 'اسلاید یادآورها همان ردیف ساده: اسم | «فردا، تاریخ» (بی دکمه)');
  ok(r.dots === 0, 'نقطه‌های قرمز برداشته شد');
  ok(r.dur >= 4 && /^rgb\((19\d|2[0-2]\d), (3\d|4\d|5\d|6\d|7\d), (2\d|3\d|4\d|5\d|6\d)\)$/.test(r.col), 'نوار چرخان آرام‌تر (' + r.dur + 's) و رنگ سررسیده قرمز تیره‌تر (' + r.col + ')');
  ok(r.live.join('|') === 'اجارهٔ خانه|قبض گاز|تمدید بیمهٔ ماشین', 'ویرایش یا یادآور تازه همان لحظه در اسلاید (' + r.live.join('، ') + ')');
  ok(r.hl && r.noEditor, 'زدن یادآور: در پنجرهٔ یادآورها روی همان می‌رود و هایلایت می‌کند (بی ورود به ویرایش)');
  ok(r.dueSnake, 'در پنجرهٔ یادآورها هم دور یادآور سررسیده نوار قرمز می‌چرخد');
  await R.ctx.close();

  console.log('• پروفایل منو و عکس در PDF');
  const M = await fresh(b);
  const m = await M.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(300);
    document.getElementById('menuUserAvatar').click(); await w(200);
    const view = document.getElementById('hkAvView'), big = view && view.querySelector('.hk-av-big').getBoundingClientRect().width;
    const acts = view ? [...view.querySelectorAll('.hk-av-acts button')].map(x => x.textContent) : [];
    const menuOpen = document.getElementById('menuDropdown').classList.contains('open');
    view._hkCancel();
    const panel = document.getElementById('menuUserPanel');
    document.querySelector('#menuUserNameText .hk-mprof-t').click(); await w(400);
    const nameToggles = panel.classList.contains('open');
    document.getElementById('menuUserName').click(); await w(400);
    const boxToggles = !panel.classList.contains('open');
    /* ۱.۳.۸۰: مداد فقط با باکس پروفایل باز */
    document.getElementById('menuUserName').click(); await w(400);
    document.querySelector('#menuUserNameText .hk-mprof-pen').click(); await w(100);
    const edit = document.querySelector('#menuUserNameText input'), focused = document.activeElement === edit;
    edit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    /* PDF */
    const c = document.createElement('canvas'); c.width = 50; c.height = 50; c.getContext('2d').fillRect(0, 0, 50, 50);
    localStorage.setItem(STORAGE_KEY + '_avatar', c.toDataURL('image/jpeg', 0.8));
    const html = buildPdfBlocks().map(x => x.html).join('');
    return { big, acts, menuOpen, nameToggles, boxToggles, focused, pdf: /<img class="hd-av"[^>]+src="data:image\/jpeg;base64,/.test(html) };
  });
  ok(m.big >= 240 && m.acts.join('|') === 'انتخاب عکس' && m.menuOpen, 'زدن عکس: نمای بزرگ با گزینه‌ها زیرش؛ منو باز می‌ماند');
  ok(m.nameToggles && m.boxToggles, 'زدن اسم یا هر جای باکس (به‌جز عکس): نوار زیرش باز/بسته');
  ok(m.focused, 'مداد کنار اسم: ویرایش با نشانگر فعال');
  ok(m.pdf, 'خروجی PDF: عکس کوچک کاربر کنار اسمش');
  await M.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1377: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
