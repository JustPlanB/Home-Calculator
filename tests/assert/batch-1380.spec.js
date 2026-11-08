// ۱.۳.۸۰: حباب‌ها (کم‌رنگ‌تر، برق متحرک، اعوجاج پشت، ماندن بعد از رها کردن، ترکاندن با لمس، محو با برگشت در حال حرکت)؛
// اسم کاربر فقط با باکس باز قابل ویرایش و برگشت = لغو؛ زوم عکس؛ جستجوی منو با بستن پاک؛ متن راهنمای جستجو؛ «نامشخص» آخر؛
// فلش اسکرول؛ راهنمای جدول وسط صفحه؛ تاریخ روز وسط فاصله؛ سرستون ویجت ردیف‌ها. فقط دادهٔ مصنوعی.
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
const seedAcc = () => {
  selectedBankAccounts = [{ label: 'ملت' }, { label: 'ملی' }, { label: 'سپه' }];
  periodData.income.sections[0].rows = [{ id: 'i1', day: '5', desc: 'حقوق', amount: 5000000, account: 'ملت', status: 'paid' }, { id: 'i2', day: '6', desc: 'واریز', amount: 1200000, account: 'ملی', status: 'paid' }];
  periodData.expense.sections[0].rows = [{ id: 'e1', day: '7', desc: 'خرید', amount: 800000, account: 'سپه', status: 'paid' }];
};
const cnt = () => ({ acc: document.querySelectorAll('#hkBubbles .hk-bub:not(.sm):not(.pop)').length, sm: document.querySelectorAll('#hkBubbles .hk-bub.sm:not(.pop)').length, ov: !!document.getElementById('hkBubbles') });

(async () => {
  const b = await chromium.launch();
  const src = fs.readFileSync(process.env.HK_INDEX || path.join(__dirname, '../../index.html'), 'utf8');

  console.log('• حباب‌ها');
  const H = await fresh(b);
  await H.page.evaluate(seedAcc);
  const bx = await (await H.page.$('#homeBalanceCircle')).boundingBox();
  const press = async () => { await H.page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await H.page.mouse.down(); await H.page.waitForTimeout(1500); await H.page.mouse.up(); await H.page.waitForTimeout(400); };
  await press();
  const look = await H.page.evaluate(() => {
    const e = document.querySelector('#hkBubbles .hk-bub:not(.sm)');
    const ir = getComputedStyle(e.querySelector('.ir')), sh = getComputedStyle(e.querySelector('.sh')), wp = getComputedStyle(e.querySelector('.wp'));
    return { irOp: parseFloat(ir.opacity), sway: sh.animationName, warp: (wp.backdropFilter || wp.webkitBackdropFilter || ''), svg: !!document.querySelector('#hkBubWarpSvg filter#hkBubWarp feDisplacementMap') };
  });
  ok(look.irOp <= 0.5 && look.irOp >= 0.3, 'رنگ لبهٔ حباب‌ها کمی کم‌رنگ‌تر (' + look.irOp + ')');
  ok(look.sway === 'hkBubSway', 'برق داخل حباب آرام جابه‌جا می‌شود');
  ok(/url\(.*hkBubWarp/.test(look.warp) && look.svg, 'صفحهٔ پشت حباب کمی موج‌دار (مثل پشت حباب صابون)');
  const c0 = await H.page.evaluate(cnt);
  ok(c0.ov && c0.acc === 3 && c0.sm >= 4, 'با رها کردن نگه‌داشتن، حباب‌ها روی صفحه می‌مانند');
  await H.page.mouse.click(12, 420); await H.page.waitForTimeout(300);
  const c1 = await H.page.evaluate(() => Object.assign({ modal: !!document.querySelector('.modal-overlay.open, .detail-open') }, (() => ({ acc: document.querySelectorAll('#hkBubbles .hk-bub:not(.sm):not(.pop)').length, sm: document.querySelectorAll('#hkBubbles .hk-bub.sm:not(.pop)').length, ov: !!document.getElementById('hkBubbles') }))()));
  ok(c1.ov && c1.acc === 3 && c1.sm === c0.sm && !c1.modal, 'لمس جای خالی صفحه هیچ کاری نمی‌کند');
  const tapAcc = async () => { const p = await H.page.evaluate(() => { const e = document.querySelector('#hkBubbles .hk-bub:not(.sm):not(.pop)'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await H.page.mouse.click(p[0], p[1]); await H.page.waitForTimeout(900); return H.page.evaluate(cnt); };
  const c2 = await tapAcc();
  ok(c2.acc === 2 && c0.sm - c2.sm >= 2 && c0.sm - c2.sm <= 3, 'زدن حباب موجودی: همان و ' + (c0.sm - c2.sm) + ' حباب کوچک نزدیکش می‌ترکند');
  await H.page.waitForTimeout(10500);
  const c3 = await H.page.evaluate(cnt);
  ok(c3.ov && c3.acc === 2, 'بعد از رها کردن، ترکیدن خودکار ۱۰ ثانیه‌ای نیست (فقط با زدن یا برگشت)');
  await tapAcc();
  const c4 = await tapAcc();
  await H.page.waitForTimeout(900);
  const c5 = await H.page.evaluate(cnt);
  ok(c4.acc === 0 && !c5.ov, 'زدن آخرین حباب موجودی: همهٔ حباب‌های کوچک باقی‌مانده هم می‌ترکند');
  await press();
  const t1 = await H.page.evaluate(() => [...document.querySelectorAll('#hkBubbles .hk-bub')].map(e => e.style.transform).join());
  await H.page.evaluate(() => onBackGuard()); await H.page.waitForTimeout(350);
  const t2 = await H.page.evaluate(() => ({ t: [...document.querySelectorAll('#hkBubbles .hk-bub')].map(e => e.style.transform).join(), op: parseFloat(getComputedStyle(document.getElementById('hkBubbles')).opacity) }));
  await H.page.waitForTimeout(900);
  const gone = await H.page.evaluate(() => !document.getElementById('hkBubbles'));
  ok(t1 !== t2.t && t2.op < 1 && gone, '«برگشت»: همهٔ حباب‌ها در حال حرکت آرام محو می‌شوند (نه ایستاده)');
  await H.ctx.close();

  console.log('• پروفایل، جستجو، دسته‌ها');
  const M = await fresh(b);
  const m = await M.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(350);
    const pen = () => { const p = document.querySelector('#menuUserNameText .hk-mprof-pen'); return p && getComputedStyle(p).display !== 'none'; };
    const closedPen = pen();
    hkNameEditStart(); await w(50);
    const closedEdit = !!document.querySelector('#menuUserNameText input');
    document.getElementById('menuUserName').click(); await w(400);
    const openPen = pen();
    const old = hkMainTitle();
    document.querySelector('#menuUserNameText .hk-mprof-pen').click(); await w(100);
    const inp = document.querySelector('#menuUserNameText input'); inp.value = 'اسم تازه';
    onBackGuard(); await w(150);
    const cancelled = !document.querySelector('#menuUserNameText input') && hkMainTitle() === old && document.getElementById('menuDropdown').classList.contains('open');
    /* زوم عکس */
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').fillRect(0, 0, 64, 64);
    localStorage.setItem(STORAGE_KEY + '_avatar', c.toDataURL('image/jpeg', 0.8)); hkRenderMenuProfile();
    hkAvatarView(); await w(150);
    const big = document.querySelector('#hkAvView .hk-av-big'), r = big.getBoundingClientRect();
    const ev = (t) => big.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: r.left + 60, clientY: r.top + 60, bubbles: true, isPrimary: true }));
    ev('pointerdown'); ev('pointerup'); await w(80); ev('pointerdown'); ev('pointerup'); await w(300);
    const zoomed = big._hkZoom && big._hkZoom.get().z > 1.5;
    document.getElementById('hkAvView')._hkCancel();
    /* جستجوی منو */
    const si = document.getElementById('menuSearchInput'); si.value = 'پشتیبان'; hkMenuSearch('پشتیبان'); si.focus();
    const searching = document.querySelector('#menuDropdown .menu-scroll').classList.contains('hk-searching');
    closeSideMenu(); await w(200);
    const cleared = si.value === '' && !document.querySelector('#menuDropdown .menu-scroll').classList.contains('hk-searching') && document.activeElement !== si;
    openSideMenu(); await w(200); si.value = 'x'; hkMenuSearch('x'); closeSideMenu(); openSideMenu(); await w(150);
    const reopen = si.value === '';
    closeSideMenu();
    /* دسته‌ها */
    hkCatPickSheet(HKCategorizer.categories.filter(x => x && x.id), '', () => {}); await w(100);
    const cats = [...document.querySelectorAll('#hkCatPick .sms-cat')].map(x => x.textContent.trim());
    document.getElementById('hkCatPick').remove();
    return { closedPen, closedEdit, openPen, cancelled, zoomed, searching, cleared, reopen, last: cats[cats.length - 1], first: cats[0] };
  });
  ok(!m.closedPen && !m.closedEdit, 'باکس پروفایل بسته: اسم قابل ویرایش نیست و مداد دیده نمی‌شود');
  ok(m.openPen, 'باکس پروفایل باز: مداد ویرایش ظاهر می‌شود');
  ok(m.cancelled, 'برگشت هنگام ویرایش اسم: ویرایش لغو و اسم قبلی می‌ماند (منو باز می‌ماند)');
  ok(m.zoomed, 'عکس بزرگ پروفایل قابل زوم (دو بار زدن)');
  ok(m.searching && m.cleared && m.reopen, 'باز و بسته شدن منو جستجویش را همیشه غیرفعال و پاک می‌کند');
  ok(/نامشخص/.test(m.last) && !/نامشخص/.test(m.first), 'دستهٔ «نامشخص» آخرین دسته');
  ok(src.indexOf('برای دیدن نتایج، فیلتری انتخاب کنید یا کلمه‌ای بنویسید') > 0 && src.indexOf('برای دیدن ردیف‌ها، فیلتری انتخاب کنید') < 0, 'متن راهنمای جستجو: «برای دیدن نتایج، فیلتری انتخاب کنید یا کلمه‌ای بنویسید»');
  await M.ctx.close();

  console.log('• جدول، تاریخ روز');
  const T = await fresh(b);
  const t = await T.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const ln = document.getElementById('hkTodayLine'), lr = ln.querySelector('b').getBoundingClientRect();
    const bot = Math.max(...['menuBtn', 'monthSelectWrap', 'yearSelectWrap'].map(id => document.getElementById(id).getBoundingClientRect().bottom));
    const card = [...document.querySelectorAll('#panel-home .person-card')].find(c => c.offsetHeight), ct = card.getBoundingClientRect().top;
    const dateOff = (lr.top + lr.height / 2) - (bot + ct) / 2;
    const tt = hkMainTitle(), exp = findSectionByTitle('expense', tt);
    exp.rows = []; for (let i = 0; i < 30; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + (i % 28)), desc: 'خرج ' + i, amount: (i + 1) * 10000, status: 'paid' }));
    persistCurrent(); renderAll(); openPersonDetail(tt, 'expense'); await w(1200);
    const hint = document.querySelector('.person-detail-box .person-detail-hint'), rg = document.createRange(); rg.selectNodeContents(hint); const q = rg.getBoundingClientRect();
    const fab = document.getElementById('hkScrollFab'), fr = fab.getBoundingClientRect(), svg = fab.querySelector('svg').getBoundingClientRect();
    const hcT = rg.getClientRects()[0], hc = hcT.top + hcT.height / 2;
    return { dateOff, hintL: q.left, hintR: innerWidth - q.right, fab: Math.round(fr.width), svg: Math.round(svg.width), fabDown: (fr.top + fr.height / 2) - hc, overlap: fr.left < q.right };
  });
  ok(Math.abs(t.dateOff) <= 1.5, 'تاریخ روز دقیقاً وسط ارتفاع فاصلهٔ سه باکس بالا و باکس کارت (' + t.dateOff.toFixed(1) + 'px)');
  ok(Math.abs(t.hintL - t.hintR) < 2 && !t.overlap, 'راهنمای زیر جدول روی خط وسط صفحه (' + Math.round(t.hintL) + ' / ' + Math.round(t.hintR) + ')');
  ok(t.fab >= 33 && t.svg >= 26 && t.fabDown >= 5, 'فلش اسکرول کمی بزرگ‌تر و کمی پایین‌تر (' + t.svg + 'px، ' + Math.round(t.fabDown) + 'px پایین‌تر)');
  await T.ctx.close();

  const andr = require('../lib/android-src')();
  const hd = andr.slice(andr.indexOf('static Bitmap header('), andr.indexOf('static Bitmap row('));
  ok(/0xFF0A1628/.test(andr) && /0xFFEEF0F4/.test(andr) && /0xFF1B1B1B/.test(andr) && /0xFFE3E7EE/.test(andr), 'ویجت ردیف‌ها: زمینهٔ عنوان و سرستون‌ها همان رنگ جدول‌های نرم‌افزار');
  ok(/String ttl=all \? "همه" : \(inc \? "درآمدها" : "مخارج"\)/.test(hd) && /cv\.drawText\(ttl, W\/2f/.test(hd) && /all \? ALL_C : amt\(inc, light\), Paint\.Align\.CENTER/.test(hd), 'عنوان «مخارج/درآمدها» وسط با همان سبز و نارنجی');

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1380: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
