// نسخهٔ ۱.۳.۴۰: ساعت پیامک همان لحظهٔ ساختن ردیف روی ردیف می‌نشیند (پیوست هم مستقیم)، ساعت ردیف‌های قبلی + ترتیب ساعتی،
// ردیف دستیِ امروز ساعت می‌گیرد (خانهٔ روز فقط ساعت را نشان می‌دهد)، ردیف‌های جمع چسبان و مات با خط‌های لب‌به‌لب، «جمع مخارج»،
// سرهای محور مبلغ زیر محور، و جمع نشدن کادر جستجو برای فهرست کوتاه. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'timeFill1340', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• ساعت پیامک همان لحظهٔ ساختن ردیف');
  const sm = await p.evaluate(async (PNG) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملی', label: 'ملی مصنوعی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    const raw = 'بانك ملي ايران\nبرداشت:70,000-\nحساب:62002\n0721-12:55';
    pendingSmsEntry = { raw, amount: 70000, type: 'expense', day: '21', month: 7, year: 1405 };
    openSmsConfirmModal({ type: 'expense', amount: 70000, raw, day: '21', month: 7, year: 1405 }); await w(250);
    await hkSmsAttAdd('img', hkB64Blob(PNG, 'image/png'));
    const bs = document.getElementById('smsConfirmBank');
    const opt = bs && [...bs.options].find(o => o.value);
    if (opt) { bs.value = opt.value; bs.dispatchEvent(new Event('change')); }
    const d = document.getElementById('smsConfirmDesc'); if (d) d.value = 'خرید';
    await w(100);
    confirmSmsEntry(); await w(600);
    let row = null;
    iterAllPeriodData(pd => (pd.expense.sections || []).forEach(s => (s.rows || []).forEach(r => { if (r && Number(r.amount) === 70000) row = r; })));
    return { found: !!row, time: row && row.time, att: row ? (row.att || []).length : -1, left: _smsAtt.list.length };
  }, PNG);
  ok(sm.found && sm.time === '12:55', 'ردیف پیامکی ساعت متن پیامک (۱۲:۵۵) را همان موقع ساختن گرفت (' + JSON.stringify(sm) + ')');
  ok(sm.att === 1 && sm.left === 0, 'پیوست پیامک مستقیم روی همان ردیف نشست (حدس بعدی لازم نیست)');

  console.log('• ساعت ردیف‌های قبلی + ترتیب ساعتی');
  const bf = await p.evaluate(async () => {
    const sec = periodData.expense.sections[0];
    const a = Object.assign(emptyRow('expense'), { day: '5', desc: 'بی‌ساعت', amount: 3300,   /* پیامک به ریال، ردیف به تومان */ status: 'paid', account: 'ملت' });
    const c = Object.assign(emptyRow('expense'), { day: '5', desc: 'ساعت‌دار', amount: 44000, status: 'paid', account: 'ملت', time: '09:00' });
    sec.rows = [a, c];
    persistCurrent();
    const ts = new Date('2026-09-27T05:00:00Z').getTime();   /* ۵ مهر ۱۴۰۵ */
    window.hkBankSmsPlugin = () => ({ readInbox: () => Promise.resolve({ items: [{ body: 'بانک ملت\nبرداشت 33,000\n0705-08:10', date: ts }] }) });
    const n = await hkBackfillTimes();
    const rows = periodData.expense.sections[0].rows.filter(r => r.amount > 0);
    return { n, order: rows.map(r => r.desc + ':' + (r.time || '')).join('،') };
  });
  ok(bf.n === 1 && bf.order === 'بی‌ساعت:08:10،ساعت‌دار:09:00', 'ردیف قبلی ساعت پیامکش را گرفت و روز به ترتیب ساعت چیده شد (' + bf.order + ')');

  console.log('• ردیف دستی امروز و باکس ساعت');
  const mt = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sec = periodData.expense.sections[0];
    sec.rows = [Object.assign(emptyRow('expense'), { day: '21', desc: 'صبح', amount: 1000, status: 'paid', account: 'ملت', time: '08:00' }), emptyRow('expense')];
    persistCurrent();
    openPersonDetail(sec.title, 'expense'); await w(500);
    const dayInputs = () => [...document.querySelectorAll('#sections-expense tbody tr td:nth-child(2) input')];
    const inp = dayInputs()[1];
    inp.readOnly = false; inp.focus(); inp.value = '۲۱'; inp.dispatchEvent(new Event('input')); inp.blur(); await w(300);
    const manual = sec.rows.find(r => r !== sec.rows.find(x => x.desc === 'صبح') && String(r.day) === '21');
    const out = { auto: manual && manual.time };
    try { renderPersonDetailPanel('expense', sec.title); } catch (e) {}
    await w(200);
    /* خانهٔ روز ردیف «صبح»: فقط باکس ساعت (۱.۳.۴۱: دکمهٔ تغییر ساعت برداشته شد) */
    const idx = sec.rows.findIndex(r => r.desc === 'صبح');
    dayInputs()[idx].click(); await w(150);
    const pop = document.querySelector('.cell-text-popup');
    out.pop = pop ? pop.textContent : '';
    out.noBtn = !!pop && !pop.querySelector('button, input');
    try { closePersonDetail(); } catch (e) {}
    return out;
  });
  ok(/^\d\d:\d\d$/.test(mt.auto || '') && mt.auto === '12:30', 'ردیف دستی با روز امروز ساعت همین لحظه را گرفت (' + mt.auto + ')');
  ok(mt.pop === 'ساعت ۰۸:۰۰' && mt.noBtn, 'زدن خانهٔ روز: فقط «ساعت ۰۸:۰۰» (بدون دکمهٔ تغییر ساعت)');

  console.log('• ردیف‌های جمع جدول نتیجه');
  const ft = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 30 }, (_, i) => Object.assign(emptyRow('expense'), { day: String((i % 28) + 1), desc: 'نان ' + i, amount: 10000 * (i + 1), status: 'paid', account: 'ملت' }));
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '3', desc: 'نان فروشی', amount: 500000, status: 'paid', account: 'ملت' })];
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const i = document.getElementById('balanceSearchInput'); i.value = 'نان'; i.dispatchEvent(new Event('input')); await w(400);
    /* ۱.۳.۶۶: ناحیهٔ اسکرول نتیجه balanceScrollBody است (جدول اسکرول داخلی ندارد) */
    const sc = document.getElementById('balanceScrollBody'), foot = document.getElementById('search-result-foot');
    sc.scrollTop = 150; await w(100);
    const scr = sc.getBoundingClientRect(), rows = [...foot.rows];
    const r0 = rows[0].cells[0].getBoundingClientRect(), r1 = rows[1].cells[0].getBoundingClientRect();
    const out = { labels: rows.map(r => r.cells[0].textContent), pos: getComputedStyle(rows[0].cells[0]).position };
    out.pinned = r1.bottom <= scr.bottom + 1 && r1.bottom >= scr.bottom - 4 && Math.abs(r0.bottom - r1.top) <= 1;
    /* ردیف‌ها زیر جمع رد می‌شوند و دیده نمی‌شوند (زمینهٔ مات) */
    const hitEl = document.elementFromPoint(r0.left + 20, r0.top + r0.height / 2);
    const fcs = getComputedStyle(rows[0].cells[0]);
    out.bgc = fcs.backgroundColor;
    out.opaque = !!(hitEl && hitEl.closest('#search-result-foot')) && /gradient/.test(fcs.backgroundImage) && /^rgb\(/.test(fcs.backgroundColor);
    const bf = getComputedStyle(rows[0].cells[1], '::before'), af = getComputedStyle(rows[0].cells[1], '::after');
    out.thick = parseFloat(bf.height) === 2 && bf.position === 'absolute' && getComputedStyle(rows[0].cells[0]).borderTopWidth === '0px';
    /* خط عمودی جمع‌ها از زیر خط ضخیم شروع می‌شود (داخلش نمی‌آید) */
    out.vert = parseFloat(af.top) >= 2 && parseFloat(af.width) === 1;
    return out;
  });
  ok(ft.labels.length === 2 && /^جمع درآمد/.test(ft.labels[0]) && /^جمع مخارج \(۳۰ مورد\)$/.test(ft.labels[1]), '«جمع مخارج» به جای «جمع خرج» (' + ft.labels.join('، ') + ')');
  ok(ft.pos === 'sticky' && ft.pinned, 'جمع درآمد و مخارج پایین جدول پین شده‌اند (با اسکرول جدول همیشه دیده می‌شوند)');
  ok(ft.opaque, 'زمینهٔ ردیف‌های جمع مات است و ردیف‌ها از زیرش رد می‌شوند (' + ft.bgc + ')');
  ok(ft.thick && ft.vert, 'خط ضخیم بالای جمع‌ها یک نوار است و خط عمودی داخلش نمی‌آید (لب‌به‌لب)');

  console.log('• محور مبلغ: سرها زیر محور');
  const sl = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    /* ۱.۳.۶۶: اسکرول جدول کادر را جمع کرده؛ برگشت به بالا تا محور کامل دیده شود */
    document.getElementById('balanceScrollBody').scrollTop = 0; await w(60); hkSearchCollapse(false); await w(800);
    const host = document.getElementById('balanceAmtRange'), tr = host.querySelector('.hk-ar-track').getBoundingClientRect();
    const mn = document.getElementById('balanceSearchAmtMin'), mx = document.getElementById('balanceSearchAmtMax');
    mn.value = '200,000'; mn.dispatchEvent(new Event('input', { bubbles: true })); mx.value = ''; mx.dispatchEvent(new Event('input', { bubbles: true })); await w(200);
    const ticks = [...host.querySelectorAll('.hk-ar-tick')], vis = el => { const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden'; };
    const vals = [...host.querySelectorAll('.hk-ar-val')].filter(vis);
    const out = {
      below: ticks.every(t => t.getBoundingClientRect().top >= tr.bottom - 1),
      endsShown: vis(ticks[0]) && vis(ticks[ticks.length - 1]),
      valsAbove: vals.length === 1 && vals[0].getBoundingClientRect().bottom <= tr.top + 1 && /۲۰۰/.test(vals[0].textContent)
    };
    mn.value = ''; mn.dispatchEvent(new Event('input', { bubbles: true })); await w(150);
    return out;
  });
  ok(sl.below && sl.endsShown, 'اول و آخر محور هم مثل بقیهٔ درجه‌ها زیر محور و همیشه دیده می‌شوند');
  ok(sl.valsAbove, 'عددی که با دستگیره جابه‌جا می‌شود بالای محور است (سرِ روی انتها عدد بالایی ندارد)');

  console.log('• فهرست کوتاه: کادر جستجو جمع نمی‌شود');
  await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { closePersonDetail(); } catch (e) {}
    await w(200);
    periodData.expense.sections[0].rows = Array.from({ length: 4 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'شیر ' + i, amount: 10000 * (i + 1), status: 'paid', account: 'ملت' }));
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const i = document.getElementById('balanceSearchInput'); i.value = 'شیر'; i.dispatchEvent(new Event('input')); await w(400);
  });
  await p.mouse.move(190, 600); await p.mouse.wheel(0, 200); await p.waitForTimeout(900);
  const sh = await p.evaluate(() => ({ c: document.getElementById('balanceFixedHeader').classList.contains('bsr-collapsed'), pad: document.getElementById('balanceScrollBody') ? document.getElementById('balanceScrollBody').style.paddingBottom : '' }));
  ok(!sh.c && !sh.pad, 'فهرست کوتاه (۴ مورد): با اسکرول کادر جستجو باز می‌ماند و جای خالی اضافه زیر جدول نیست');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
