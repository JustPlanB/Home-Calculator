// ۱.۳.۸۷: منوی دنگ — گروه، اعضا، خرج مساوی/نامساوی، مانده هر نفر، کمترین پرداخت، «پرداخت شد»، اشتراک متن، پشتیبان. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• حساب دنگ');
  const m = await page.evaluate(() => {
    const o = {};
    /* ۱ به ۲ هزار، ۲ به ۳ هزار بدهکار ⇒ فقط ۱ به ۳ هزار */
    o.chain = hkDongTransfers({ a: -1000, b: 0, c: 1000 });
    o.split = hkDongSplitEq(100000, ['x', 'y', 'z']);
    const g = { members: [{ id: 'a', name: 'آرش' }, { id: 'b', name: 'بهار' }, { id: 'c', name: 'کاوه' }],
      expenses: [{ id: 'e1', amount: 1000, payer: 'b', shares: { a: 1000 } }, { id: 'e2', amount: 1000, payer: 'c', shares: { b: 1000 } }], settles: [] };
    o.bal = hkDongBalances(g); o.tr = hkDongTransfers(o.bal);
    g.settles.push({ id: 's1', from: 'a', to: 'c', amount: 1000 });
    o.after = hkDongTransfers(hkDongBalances(g));
    const g2 = { members: [{ id: 'a', name: 'آرش' }, { id: 'b', name: 'بهار' }, { id: 'c', name: 'کاوه' }, { id: 'd', name: 'دنیا' }],
      expenses: [{ id: 'e', amount: 400000, payer: 'a', shares: hkDongSplitEq(400000, ['a', 'b', 'c', 'd']) }, { id: 'f', amount: 120000, payer: 'b', shares: hkDongSplitEq(120000, ['a', 'b', 'c', 'd']) }], settles: [] };
    o.tr2 = hkDongTransfers(hkDongBalances(g2));
    o.sum2 = Object.values(hkDongBalances(g2)).reduce((t, v) => t + v, 0);
    return o;
  });
  ok(m.chain.length === 1 && m.chain[0].from === 'a' && m.chain[0].to === 'c' && m.chain[0].amount === 1000, '۱ به ۲ و ۲ به ۳ هزار تومان بدهکار ⇒ یک پرداخت: ۱ به ۳ هزار تومان');
  ok(m.split.x + m.split.y + m.split.z === 100000 && Math.max(m.split.x, m.split.y, m.split.z) - Math.min(m.split.x, m.split.y, m.split.z) <= 1, 'تقسیم مساوی به تومان درست؛ جمع سهم‌ها = مبلغ');
  ok(m.bal.a === -1000 && m.bal.b === 0 && m.bal.c === 1000 && m.tr.length === 1 && m.tr[0].from === 'a' && m.tr[0].to === 'c', 'از خرج‌ها: مانده‌ها و پرداخت مستقیم');
  ok(m.after.length === 0, 'بعد از «پرداخت شد» همه تسویه‌اند');
  ok(m.sum2 === 0 && m.tr2.length <= 3, 'چهار نفر: جمع مانده‌ها صفر، حداکثر سه پرداخت (' + m.tr2.length + ')');

  console.log('• منو و صفحه‌ها');
  const ui = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const btn = [...document.querySelectorAll('#menuDropdown .hk-mg[data-g="sections"] .menu-item')].find(x => /دنگ/.test(x.textContent));
    o.inMenu = !!btn;
    btn.click(); await w(200);
    o.open = !!document.getElementById('hkDong');
    o.empty = /هنوز گروهی/.test(document.querySelector('#hkDong').textContent);
    document.querySelector('#hkDong .hk-dg-new').click(); await w(150);
    const ed = document.getElementById('hkDongEd');
    const ins = ed.querySelectorAll('input.hk-dg-in');
    ins[0].value = 'سفر شمال';
    const add = n => { ins[1].value = n; ed.querySelector('.hk-dg-addb').click(); };
    add('سارا'); add('نیما'); add('سارا');
    o.dupErr = /این نام در گروه هست/.test(ed.querySelector('.sp-pick-err').textContent);
    o.chips = ed.querySelectorAll('.hk-dg-chip').length;
    ed.querySelector('.hk-dg-ok').click(); await w(150);
    o.groupView = /سفر شمال/.test(document.querySelector('#hkDong .hk-dg-t').textContent);
    /* خرج مساوی: «من» ۳۰۰٬۰۰۰ بین هر سه نفر */
    document.querySelector('#hkDong .hk-dg-add').click(); await w(150);
    let e = document.getElementById('hkDongEd');
    e.querySelectorAll('input.hk-dg-in')[0].value = 'شام';
    const am = e.querySelector('.hk-dg-amt'); am.value = '300000'; am.dispatchEvent(new Event('input', { bubbles: true }));
    o.eqNote = e.querySelector('.hk-dg-note') ? e.querySelector('.hk-dg-note').textContent : '';
    o.amtDone = am.getAttribute('enterkeyhint') === 'done';
    e.querySelector('.hk-dg-ok').click(); await w(150);
    /* خرج نامساوی: سارا ۹۰٬۰۰۰ — نیما ۶۰٬۰۰۰، سارا ۳۰٬۰۰۰ */
    document.querySelector('#hkDong .hk-dg-add').click(); await w(150);
    e = document.getElementById('hkDongEd');
    e.querySelectorAll('input.hk-dg-in')[0].value = 'بنزین';
    const am2 = e.querySelector('.hk-dg-amt'); am2.value = '90000'; am2.dispatchEvent(new Event('input', { bubbles: true }));
    const payers = e.querySelectorAll('.hk-dg-chips')[0].querySelectorAll('.hk-dg-pick'); payers[1].click();
    const parts = () => document.getElementById('hkDongEd').querySelectorAll('.hk-dg-chips')[1].querySelectorAll('.hk-dg-pick');
    parts()[0].click();
    e.querySelector('.hk-dg-seg [data-v="uneq"]').click(); await w(50);
    const sh = e.querySelectorAll('.hk-dg-shin');
    o.uneqInputs = sh.length;
    sh[0].value = '30000'; sh[0].dispatchEvent(new Event('input', { bubbles: true }));
    sh[1].value = '50000'; sh[1].dispatchEvent(new Event('input', { bubbles: true }));
    o.restBad = e.querySelector('.hk-dg-rest').classList.contains('bad');
    e.querySelector('.hk-dg-ok').click(); await w(100);
    o.blocked = !!document.getElementById('hkDongEd') && /برابر/.test(e.querySelector('.sp-pick-err').textContent);
    sh[1].value = '60000'; sh[1].dispatchEvent(new Event('input', { bubbles: true }));
    e.querySelector('.hk-dg-ok').click(); await w(150);
    o.saved = !document.getElementById('hkDongEd');
    const box = document.querySelector('#hkDong');
    o.bal = [...box.querySelectorAll('.hk-dg-bal .hk-dg-row')].map(r => r.textContent);
    o.pays = [...box.querySelectorAll('.hk-dg-pay')].map(r => r.textContent);
    o.share = hkDongShareText(hkDongLoad().groups[0]);
    /* «پرداخت شد» */
    const origAsk = window.askConfirm; window.askConfirm = (m, y) => y();
    box.querySelectorAll('.hk-dg-paid').forEach(() => { const b2 = document.querySelector('#hkDong .hk-dg-paid'); if (b2) b2.click(); });
    await w(150);
    window.askConfirm = origAsk;
    o.settled = !document.querySelector('#hkDong .hk-dg-paid') && /همه تسویه‌اند/.test(document.querySelector('#hkDong .hk-dg-tr').textContent);
    o.settleRows = document.querySelectorAll('#hkDong .hk-dg-s').length;
    /* جدا از حساب‌کتاب */
    o.noMain = !JSON.stringify(periodData).includes('سفر شمال');
    /* بازگشت: گروه → فهرست → بسته */
    document.getElementById('hkDong')._hkCancel(); await w(80);
    o.backList = !!document.querySelector('#hkDong .hk-dg-card');
    document.getElementById('hkDong')._hkCancel(); await w(80);
    o.closed = !document.getElementById('hkDong');
    return o;
  });
  ok(ui.inMenu && ui.open && ui.empty, 'منو ← بخش‌ها ← «دنگ» باز می‌شود');
  ok(ui.dupErr && ui.chips === 3 && ui.groupView, 'گروه تازه با اعضا (نام تکراری اضافه نمی‌شود)');
  ok(/۱۰۰,۰۰۰/.test(ui.eqNote) && ui.amtDone, 'خرج مساوی: سهم هر نفر نمایش داده می‌شود (' + ui.eqNote + ')');
  ok(ui.uneqInputs === 2 && ui.restBad && ui.blocked && ui.saved, 'خرج نامساوی: تا جمع سهم‌ها برابر مبلغ نشود ثبت نمی‌شود');
  ok(ui.bal.length === 3 && /طلبکار ۲۰۰,۰۰۰/.test(ui.bal[0]) && /بدهکار ۴۰,۰۰۰/.test(ui.bal[1]) && /بدهکار ۱۶۰,۰۰۰/.test(ui.bal[2]), 'وضعیت هر نفر (' + ui.bal.join(' | ') + ')');
  ok(ui.pays.length === 2 && ui.pays.every(t => /به من/.test(t)), 'کمترین پرداخت: هر دو مستقیم به «من» (' + ui.pays.join(' | ') + ')');
  ok(/دنگ «سفر شمال»/.test(ui.share) && /خرج کل: ۳۹۰,۰۰۰/.test(ui.share) && /برای تسویه:/.test(ui.share), 'متن اشتراک‌گذاری کامل');
  ok(ui.settled && ui.settleRows === 2, '«پرداخت شد» تسویه را ثبت می‌کند و همه صاف می‌شوند');
  ok(ui.noMain, 'دنگ جدا از حساب‌کتاب است (در درآمد/مخارج نمی‌آید)');
  ok(ui.backList && ui.closed, 'بازگشت: از گروه به فهرست، سپس بستن');

  console.log('• پشتیبان');
  const bk = await page.evaluate(async () => {
    const o = {};
    o.exp = hkDongExport();
    const saved = JSON.stringify(o.exp);
    localStorage.removeItem(STORAGE_KEY + '_dong');
    hkDongRestore(JSON.parse(saved), 'merge');
    o.restored = hkDongLoad().groups.length === 1 && hkDongLoad().groups[0].name === 'سفر شمال';
    hkDongRestore(JSON.parse(saved), 'merge');
    o.noDup = hkDongLoad().groups.length === 1;
    return o;
  });
  ok(bk.exp && bk.exp.groups.length === 1 && bk.restored && bk.noDup, 'دنگ در پشتیبان می‌رود و بازیابی می‌شود (بدون تکرار)');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
