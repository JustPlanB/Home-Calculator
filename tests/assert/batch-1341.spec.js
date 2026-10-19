// نسخهٔ ۱.۳.۴۱: پنجرهٔ پیوستِ منوی ثبت پیامک باریک (مستطیل عمودی) و همیشه چسبیده به گیره (با باز/بسته شدن کیبورد هم)؛
// گزینهٔ «صدا» به جای «ضبط صدا». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• پنجرهٔ پیوست منوی پیامک');
  const geo = () => p.evaluate(() => {
    const att = document.getElementById('smsConfirmDesc')._micWrap.querySelector('.desc-att-btn'), pop = document.querySelector('.hk-attpop');
    if (!pop) return null;
    const a = att.getBoundingClientRect(), r = pop.getBoundingClientRect();
    return { gap: Math.round(a.top - r.bottom), cx: Math.round((r.left + r.right) / 2 - (a.left + a.right) / 2), w: Math.round(r.width), h: Math.round(r.height), labels: [...pop.querySelectorAll('button span')].map(s => s.textContent) };
  });
  await p.evaluate(async () => {
    document.documentElement.classList.add('hk-voice');
    pendingSmsEntry = { raw: 'بانک ملت\nبرداشت 70,000', amount: 70000, type: 'expense' };
    openSmsConfirmModal({ type: 'expense', amount: 70000, raw: pendingSmsEntry.raw, bank: 'ملت', year: 1405, month: 7, day: 21 });
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('smsConfirmDesc')._micWrap.querySelector('.desc-att-btn').click();
    await new Promise(r => setTimeout(r, 300));
  });
  const g0 = await geo();
  ok(g0 && g0.labels.join('،') === 'دوربین،گالری،صدا', 'گزینه‌ها: دوربین، گالری، صدا (' + (g0 && g0.labels.join('،')) + ')');
  ok(g0 && g0.h > g0.w && g0.w <= 150, 'پنجره باریک است، مثل مستطیل عمودی (' + (g0 && g0.w + '×' + g0.h) + ')');
  ok(g0 && g0.gap >= 2 && g0.gap <= 10 && Math.abs(g0.cx) <= 2, 'پنجره درست بالای گیره است');
  /* باز شدن کیبورد: صفحه کوتاه می‌شود و منو جابه‌جا → پنجره همراه گیره */
  await p.setViewportSize({ width: 380, height: 420 }); await p.waitForTimeout(400);
  const g1 = await geo();
  await p.setViewportSize({ width: 380, height: 760 }); await p.waitForTimeout(400);
  const g2 = await geo();
  ok(g1 && g2 && [g1, g2].every(g => (g.gap >= 2 && g.gap <= 10 || g.gap <= -(g.h + 2)) && Math.abs(g.cx) <= 2), 'باز و بسته شدن کیبورد: پنجره از گیره جدا نمی‌شود (' + JSON.stringify([g1 && g1.gap, g2 && g2.gap]) + ')');
  /* پنجرهٔ پیوستِ ردیف درآمد/مخارج هم «صدا» */
  const rowBtns = await p.evaluate(async () => {
    try { hkCloseAttPop(); closeSmsConfirmModal('reject'); } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
    const row = Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 1000, status: 'paid', account: 'ملت' });
    periodData.expense.sections[0].rows.push(row);
    openRowAttachments(row); await new Promise(r => setTimeout(r, 200));
    const t = [...document.querySelectorAll('#hkAttachOv .hk-att-btn')].map(x => x.textContent.trim());
    hkCloseAttach();
    return t;
  });
  ok(rowBtns.join('،') === 'دوربین،گالری،صدا', 'پنجرهٔ پیوستِ ردیف: دوربین، گالری، صدا');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
