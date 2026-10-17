// نسخهٔ ۱.۳.۲۳: منوی جستجو فقط یک جدول (نتیجهٔ جستجو)، نوشتهٔ پوشهٔ آرشیو هم‌راستای آیکون، کلیدهای روشن/خاموش برعکس
// و کلید شب/روز مثل بقیه، چیدمان پنجرهٔ پشتیبان‌گیری، پنجرهٔ تأیید حذف پروژه، حرکت نرم و بی‌پرش به کارت جدید.
// فقط دادهٔ مصنوعی؛ «امروز» ۲۱ مهر ۱۴۰۵.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const inc = (d, desc, a) => Object.assign(emptyRow('income'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    const ex = (d, desc, a) => Object.assign(emptyRow('expense'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    const P = (irows, erows) => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: erows }], nextId: 2 }, income: { sections: [{ id: 's1', title: 'سارا', rows: irows }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 6)] = P([inc(4, 'اجاره شهریور', 15000000)], [ex(9, 'بنزین', 200000)]);
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [ex(5, 'نان', 30000)] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [inc(4, 'اجاره مهر', 15000000)] }];
    const item = { id: 'rec_k', name: 'پناهی', amount: 15000000, deposit: 200000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 7, y: 1404 }, contractEnd: { d: 4, m: 7, y: 1406 }, fromKey: 140406, genKey: 140407 };
    recurringIncomes.push(item);
    recLinkRow(item, archive[periodKey(1405, 6)].income.sections[0].rows[0]);
    recLinkRow(item, periodData.income.sections[0].rows[0]);
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• منوی جستجو: فقط جدول «نتیجهٔ جستجو»');
  const sr = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(300);
    resetBalanceSearch(); renderBalanceTab(); await w(80);
    const vis = el => !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
    const sb = document.getElementById('balanceScrollBody');
    const tables = [...sb.querySelectorAll('.summary-section')].filter(vis).map(s => s.id || (s.querySelector('.summary-header') || {}).textContent);
    const all = [...document.querySelectorAll('#search-result-body tr')].length;
    const title0 = document.getElementById('searchResultTitle').textContent;
    const ty = document.getElementById('balanceSearchType'); ty.value = 'expense'; ty.dispatchEvent(new Event('change')); await w(60);
    const exp = [...document.querySelectorAll('#search-result-body tr')].map(t => t.textContent);
    const dy = document.getElementById('balanceSearchDay'); dy.value = '5'; dy.dispatchEvent(new Event('change')); await w(80);
    const tables2 = [...sb.querySelectorAll('.summary-section')].filter(vis).map(s => s.id || 'x');
    const day5 = [...document.querySelectorAll('#search-result-body tr')].map(t => t.textContent);
    const hint = vis(sb.querySelector('.balance-hint'));
    resetBalanceSearch(); closePersonDetail(); await w(200);
    return { tables, all, title0, exp, tables2, day5, hint };
  });
  /* از ۱.۳.۳۱ جدول ماه‌های سال (searchMonthSummary) هم بالای نتیجه هست */
  ok(sr.tables.filter(t => t !== 'searchMonthSummary').join() === 'searchResultBox' && sr.tables2.filter(t => t !== 'searchMonthSummary').join() === 'searchResultBox' && !sr.hint, 'فقط جدول نتیجهٔ جستجو (و جدول ماه‌ها)؛ بدون «مانده به تفکیک بخش» و «جزئیات روز»');
  ok(sr.all === 1 && sr.title0 === 'نتیجهٔ جستجو', 'بدون فیلتر (از ۱.۳.۲۴): فقط چارچوب جدول، منتظر فیلتر یا کلمه');
  ok(sr.exp.length === 2 && sr.exp.every(t => /نان|بنزین/.test(t)), 'فیلتر «برداشت» روی همان جدول اعمال شد');
  ok(sr.day5.length === 1 && /نان/.test(sr.day5[0]), 'فیلتر روز ۵ + برداشت: همان جدول، یک ردیف');

  console.log('• نوشتهٔ جلوی پوشهٔ آرشیو');
  const fl = await p.evaluate(() => {
    recOpenArchive(recurringIncomes[0]);
    const ic = document.querySelector('#recArchiveModal .rec-term-fico').getBoundingClientRect();
    const lb = document.querySelector('#recArchiveModal .rec-term-range').getBoundingClientRect();
    const out = { d: Math.round(((ic.top + ic.height / 2) - (lb.top + lb.height / 2)) * 10) / 10 };
    document.getElementById('recArchiveModal').remove();
    return out;
  });
  ok(Math.abs(fl.d) <= 1.5, 'وسط نوشتهٔ زرد و وسط آیکون پوشه روی یک خط (اختلاف ' + fl.d + 'px)');

  console.log('• کلیدهای روشن/خاموش');
  const sw = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pos = (s) => { const r = s.getBoundingClientRect(), k = s.querySelector('i').getBoundingClientRect(); return (k.left + k.width / 2) > (r.left + r.width / 2) ? 'R' : 'L'; };
    const out = {};
    const ts = document.getElementById('themeSwitch');
    out.themeIsSwitch = ts.classList.contains('hk-switch') && !!ts.querySelector('i');
    const n = document.querySelector('#permRowNotif .perm-sw');
    const tcs = getComputedStyle(ts), ncs = getComputedStyle(n);
    out.themeSize = tcs.width + 'x' + tcs.height; out.notifSize = ncs.width + 'x' + ncs.height;
    applyTheme('dark'); await w(300);
    out.darkOn = ts.classList.contains('on') && pos(ts) === 'R' && getComputedStyle(ts).backgroundColor === 'rgb(10, 132, 255)';
    applyTheme('light'); await w(300);
    out.lightOff = !ts.classList.contains('on') && pos(ts) === 'L';
    applyTheme('dark'); await w(100);
    /* کلید نمونهٔ دسترسی‌ها و کلید عمومی (منوی کناری بسته است) */
    const tmp = document.createElement('div'); tmp.innerHTML = '<button class="menu-theme-row perm-row" style="position:fixed;top:0;left:0;"><span>x</span><span class="perm-sw"><i></i></span></button><button class="hk-switch" style="position:fixed;top:60px;left:0;"><i></i></button>';
    document.body.appendChild(tmp);
    const pr = tmp.querySelector('.perm-row'), ps = tmp.querySelector('.perm-sw'), hs = tmp.querySelector('.hk-switch');
    await w(300); out.notifOff = pos(ps) === 'L' && pos(hs) === 'L';
    pr.classList.add('on'); hs.classList.add('on'); await w(300);
    out.notifOn = pos(ps) === 'R' && pos(hs) === 'R';
    tmp.remove();
    return out;
  });
  ok(sw.themeIsSwitch && sw.themeSize === sw.notifSize, 'کلید شب/روز همان کلید بقیه (' + sw.themeSize + ')');
  ok(sw.darkOn && sw.lightOff, 'کلید شب/روز: روشن (شب) دایره راست و آبی، خاموش دایره چپ');
  ok(sw.notifOff && sw.notifOn, 'جای خاموش/روشن برعکس شد: خاموش دایره چپ، روشن دایره راست');

  console.log('• پنجرهٔ پشتیبان‌گیری');
  const bk = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const oC = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (oC && oC.Plugins) || {}, { NativeFileExport: { saveAutoBackup: async () => ({}), listAutoBackups: async () => ({ files: [] }), deleteAutoBackup: async () => ({}), readAutoBackup: async () => ({ data: '' }) } }) };
    askBackupParts(); await w(250);
    const out = {};
    const enc = document.getElementById('bkEncRow');
    out.encHiddenOff = enc.classList.contains('bk-enc-hide');
    document.getElementById('bkAutoOn').click(); await w(300);
    out.encShownOn = !enc.classList.contains('bk-enc-hide');
    const rows = ['bkAutoOn', 'bkEncBtn', 'bkPwdSw'].map(id => document.getElementById(id));
    const rr = rows.map(s => s.getBoundingClientRect());
    out.order = rr[0].top < rr[1].top && rr[1].top < rr[2].top;
    out.swX = rr.map(r => Math.round(r.left));
    const labs = rows.map(s => s.closest('.bk-sw-row').querySelector('.bk-ttl'));
    out.fw = labs.map(l => getComputedStyle(l).fontWeight);
    out.fs = labs.map(l => getComputedStyle(l).fontSize);
    out.labX = labs.map(l => Math.round(l.getBoundingClientRect().right));
    out.boldInside = labs.some(l => [...l.querySelectorAll('*')].some(x => !x.classList.contains('hk-info-btn') && !x.closest('.hk-info-btn') && Number(getComputedStyle(x).fontWeight) >= 600));
    const gap = (lab) => { const ib = lab.querySelector('.hk-info-btn'); if (!ib) return null; const rg = document.createRange(); rg.selectNodeContents(lab.firstChild); const tr = rg.getBoundingClientRect(); return Math.round(tr.left - ib.getBoundingClientRect().right); };
    out.gapAuto = gap(labs[0]); out.gapPwd = gap(labs[2]);
    document.getElementById('bkAutoOn').click(); await w(300);
    out.encHiddenAgain = enc.classList.contains('bk-enc-hide');
    document.querySelectorAll('.backup-pick-overlay').forEach(x => x.remove());
    window.Capacitor = oC;
    return out;
  });
  ok(bk.encHiddenOff && bk.encShownOn && bk.encHiddenAgain, 'پشتیبان خودکار خاموش: سطر رمزنگاری پنهان؛ روشن: زیر آن دیده می‌شود');
  ok(bk.order, 'ترتیب: پشتیبان خودکار روزانه، رمزنگاری پشتیبان خودکار، رمز فایل پشتیبان');
  ok(new Set(bk.swX).size === 1 && new Set(bk.labX).size === 1, 'کلیدها و نوشته‌ها دقیقاً زیر هم (کلید x=' + bk.swX.join('/') + '، نوشته=' + bk.labX.join('/') + ')');
  ok(bk.fw.every(x => Number(x) < 600) && new Set(bk.fs).size === 1 && !bk.boldInside, 'هیچ نوشته‌ای بولد نیست و اندازه‌ها یکی است (' + bk.fw.join('/') + '، ' + bk.fs.join('/') + ')');
  ok(bk.gapPwd != null && bk.gapPwd >= 4 && bk.gapPwd === bk.gapAuto, 'آیکون اطلاعات «رمز فایل پشتیبان» با همان فاصلهٔ بقیه (' + bk.gapPwd + 'px)');

  console.log('• تأیید حذف پروژه');
  const pj = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const L = loadFinancialSubjects(); L.push({ id: 'pjz', name: 'پروژه خالی', highlightColor: 'orange' }); _financialSubjects = L; saveFinancialSubjects();
    deleteSubject('pjz'); await w(100);
    const tx = document.querySelector('#hkAsk3 .hk-ask3-txt'), cs = getComputedStyle(tx);
    const btns = [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')];
    const r = btns.map(x => x.getBoundingClientRect());
    const out = { t: tx.textContent, bold: Number(cs.fontWeight) >= 700, center: cs.textAlign === 'center', labels: btns.map(x => x.textContent), row: r.length > 1 && Math.abs(r[0].top - r[1].top) < 1, delBg: getComputedStyle(btns[0]).backgroundColor };
    onBackGuard(); await w(100);
    out.closed = !document.getElementById('hkAsk3') && loadFinancialSubjects().some(s => s.id === 'pjz');
    return out;
  });
  ok(pj.bold && pj.center && pj.t === 'پروژهٔ «پروژه خالی» حذف شود؟', 'سؤال بولد و وسط: ' + pj.t);
  ok(pj.labels.join('|') === 'حذف', 'پروژهٔ بی‌ردیف: فقط «حذف» (انصراف = بازگشت یا زدن بیرون باکس)');
  ok(pj.closed, 'بازگشت = انصراف (پروژه حذف نشد)');

  console.log('• حرکت نرم به کارت جدید (پردازندهٔ کند)');
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const gl = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const res = [];
    for (const name of ['کارت دوم', 'کارت سوم']) {
      openPersonEditSheet('', true); await w(400);
      const ov = document.querySelector('.modal-overlay.person-edit-sheet');
      ov.querySelector('input').value = name;
      const box = document.getElementById('homeCards');
      const log = []; let run = true;
      (function f() { log.push(box.scrollLeft); if (run) requestAnimationFrame(f); })();
      [...ov.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click();
      /* رسم دوبارهٔ صفحه وسط حرکت هم نباید کارت را بپراند */
      setTimeout(() => renderHomeCards(), 600);
      await w(2600); run = false;
      const card = box.querySelector('.person-card:not(.hc-clone)[data-title="' + name + '"]');
      const br = box.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const d = []; for (let i = 1; i < log.length; i++) if (log[i] !== log[i - 1]) d.push(log[i] - log[i - 1]);
      const firstMove = d.length ? d[0] : 0;
      res.push({ name, off: Math.round(cr.left + cr.width / 2 - br.left - br.width / 2), steps: d.length, sameDir: d.every(x => Math.sign(x) === Math.sign(firstMove)), maxStep: Math.round(Math.max(0, ...d.map(Math.abs))), active: getActiveHomeCardTitle() });
    }
    return res;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  gl.forEach(g => {
    ok(g.steps >= 10 && g.sameDir && g.maxStep <= 60, g.name + ': حرکت پیوسته در یک جهت، بدون ایستادن و برگشتن یا پرش (' + g.steps + ' گام، بزرگ‌ترین گام ' + g.maxStep + 'px)');
    ok(Math.abs(g.off) <= 1 && g.active === g.name, g.name + ': در پایان دقیقاً وسط (' + g.off + 'px)');
  });

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1323: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
