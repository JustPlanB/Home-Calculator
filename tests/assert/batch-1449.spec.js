// ۱.۴.۴۸ — دسته‌ها: فقط نوار چرخان (قاب ثابت حذف) و انتخاب درآمد مثل مخارج (انتخاب ← تأیید)؛ باکس بروزرسانی بی اسکرول؛
// شرح بلند زیر آیکون‌های میکروفون/پیوست نمی‌رود؛ حباب‌های چت دستیار گوشهٔ گردتر و بی دُم (رنگ‌ها بی‌تغییر).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 700 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  // ۱) انتخاب دستهٔ درآمد: فقط انتخاب؛ با «تأیید» اعمال
  const I = await page.evaluate(() => {
    const o = { picked: [] };
    hkCatPickSheet(HK_INCOME_CATS.slice(), '', v => o.picked.push(v), 'in', null);
    const q = id => document.querySelector('#hkCatPick .sms-cat[data-cat="' + id + '"]');
    q('in_bonus').click(); o.afterClick = o.picked.length; o.open1 = !!document.getElementById('hkCatPick'); o.on1 = q('in_bonus').classList.contains('on');
    q('in_gift').click(); o.onBonus = q('in_bonus').classList.contains('on'); o.onGift = q('in_gift').classList.contains('on'); o.onCount = document.querySelectorAll('#hkCatPick .sms-cat.on').length;
    o.hasOk = !!document.querySelector('#hkCatPick .hk-cp-ok');
    document.querySelector('#hkCatPick .hk-cp-ok').click(); o.picked2 = o.picked.slice(); o.closed = !document.getElementById('hkCatPick');
    return o;
  });
  ok(I.afterClick === 0 && I.open1 && I.on1, 'درآمد: زدن دسته فقط انتخاب می‌کند؛ چیزی اعمال نمی‌شود و باکس باز می‌ماند');
  ok(I.hasOk && I.onGift && !I.onBonus && I.onCount === 1, 'درآمد: تک‌انتخابی؛ دستهٔ دوم جای اول را می‌گیرد و دکمهٔ «تأیید» هست');
  ok(I.picked2.length === 1 && I.picked2[0] === 'in_gift' && I.closed, 'درآمد: «تأیید» دستهٔ انتخاب‌شده را اعمال و باکس را می‌بندد');
  const E = await page.evaluate(() => {
    const o = { picked: [] }; const cats = HKCategorizer.categories.filter(c => c && c.id);
    hkCatPickSheet(cats.concat([HK_P2P_CAT]), '', v => o.picked.push(v), 'out', []);
    const q = id => document.querySelector('#hkCatPick .sms-cat[data-cat="' + id + '"]');
    q(cats[0].id).click(); q(cats[1].id).click(); o.n = o.picked.length; document.querySelector('#hkCatPick .hk-cp-ok').click(); o.res = o.picked[0];
    return o;
  });
  ok(E.n === 0 && Array.isArray(E.res) && E.res.length === 2, 'مخارج: چندانتخابی و «تأیید» مثل قبل');
  // ۲) قاب ثابت حذف، نوار چرخان هست
  const R = await page.evaluate(() => {
    document.querySelectorAll('#hkCatPick').forEach(x => x.remove());
    const g = document.createElement('div'); g.className = 'sms-cat-grid hk-cat-colored'; g.style.cssText = 'position:fixed;top:10px;left:10px;width:300px;z-index:999999;background:#222';
    g.innerHTML = '<button class="sms-cat" style="--cc:#ff9f0a"><i><svg viewBox="0 0 10 10"/></i><span>الف</span></button><button class="sms-cat on" style="--cc:#ff9f0a"><i><svg viewBox="0 0 10 10"/></i><span>ب</span></button>';
    document.body.appendChild(g); const i0 = g.children[0].querySelector('i'), i1 = g.children[1].querySelector('i');
    const bc = x => getComputedStyle(x).borderTopColor, an = x => getComputedStyle(x, '::after').animationName;
    const o = { bOff: bc(i0), bOn: bc(i1), anOn: an(i1), anOff: an(i0) }; g.remove(); return o;
  });
  ok(R.bOn === R.bOff, 'دستهٔ انتخاب‌شده قاب ثابت ندارد (رنگ لبه مثل انتخاب‌نشده: ' + R.bOn + ')');
  ok(/hkCatSpin/.test(R.anOn) && !/hkCatSpin/.test(R.anOff), 'نوار چرخان فقط دور دستهٔ انتخاب‌شده می‌چرخد');
  // ۳) باکس بروزرسانی: بی اسکرول
  const U = await page.evaluate(() => {
    const notes = ['اصلاح مهم ویجت: موجودی کل ویجت گاهی بیشتر از موجودی واقعی کارت‌ها بود و بعضی بانک‌ها منفی می‌شدند و دلیلش پیامک قسط بود که هر بار دوباره اضافه می‌شد', 'پیامک‌های قسطِ مانده از قبل در صف، با اولین باز شدن نرم‌افزار پاک می‌شوند و ویجت خودبه‌خود درست می‌شود؛ هیچ ردیف یا موجودی ذخیره‌شده‌ای تغییر نمی‌کند', 'دستیار: فهم «از اول سال»، «از مهر تا آذر»، «کارت ملت»، ادامهٔ گفتگو و پاسخ‌های طبیعی‌تر با مقایسهٔ ماه قبل', 'یک خط دیگر برای اطمینان از بلند بودن متن و بررسی ارتفاع باکس که هیچ‌وقت اسکرول نخواهد'];
    showUpdatePrompt({ versionName: '1.4.48', versionCode: 999, notes }, { code: 1, name: '1.4.47' });
    const pn = document.querySelector('#updPrompt .upd-prompt-panel'); if (!pn) return null;
    const r = pn.getBoundingClientRect(); const o = { h: Math.round(r.height), vh: innerHeight, sc: pn.scrollHeight - pn.clientHeight, ov: getComputedStyle(pn).overflowY, notes: pn.querySelectorAll('.upd-notes li').length };
    document.getElementById('updPrompt').remove(); return o;
  });
  ok(U && U.sc <= 1 && U.h <= U.vh && U.ov !== 'auto' && U.ov !== 'scroll', 'باکس بروزرسانی: بی اسکرول و داخل صفحه (' + (U && U.h) + ' از ' + (U && U.vh) + '، ' + (U && U.notes) + ' توضیح)');
  // ۴) شرح بلند زیر آیکون‌ها نرود
  const D = await page.evaluate(() => { document.documentElement.classList.add('hk-voice'); const d = document.getElementById('smsConfirmDesc'); const w = d && d._micWrap; const pl = d ? parseFloat(getComputedStyle(d).paddingLeft) : 0; return { pl, wrap: !!w }; });
  ok(D.wrap && D.pl >= 84, 'فیلد «بابت چی بود»: حاشیهٔ چپ برای میکروفون و پیوست (' + D.pl + 'px)');
  // ۵) حباب‌های چت
  const B = await page.evaluate(() => {
    const mk = (cls) => { const r = document.createElement('div'); r.className = cls; r.innerHTML = '<div class="hk-asst-bub">سلام</div>'; r.style.cssText = 'position:fixed;top:0;left:0'; document.body.appendChild(r); const bub = r.querySelector('.hk-asst-bub'), cs = getComputedStyle(bub), af = getComputedStyle(bub, '::after'); const o = { rad: cs.borderRadius, bg: cs.backgroundColor, after: af.content }; r.remove(); return o; };
    return { me: mk('hk-asst-me'), bot: mk('hk-asst-bot') };
  });
  const rn = x => String(x).split(' ').map(v => parseFloat(v)); const exp = (a) => a.length === 3 ? [a[0], a[1], a[2], a[1]] : a;
  ok(JSON.stringify(exp(rn(B.me.rad))) === '[22,22,6,22]' && JSON.stringify(exp(rn(B.bot.rad))) === '[22,22,22,6]', 'حباب‌ها: گوشهٔ بزرگ ۲۲ و گوشهٔ دُم ۶ (کاربر پایین‌راست، دستیار پایین‌چپ)');
  ok((B.me.after === 'none' || B.me.after === 'normal') && (B.bot.after === 'none' || B.bot.after === 'normal'), 'حباب‌ها دُم جدا ندارند');
  ok(/rgba\(8, 181, 245, 0\.2\)/.test(B.me.bg), 'رنگ حباب کاربر بی‌تغییر (' + B.me.bg + ')');
  ok(errs.length === 0, 'بدون خطای صفحه' + (errs.length ? ' ' + errs[0] : ''));
  await b.close(); console.log('batch-1449: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();
