// نسخهٔ ۱.۳.۲۲: نوشتهٔ پوشهٔ آرشیو، رنگ مبالغ جستجو و «ماه»، کارت جدید کامل وسط، پشتیبان و سطل زبالهٔ آرشیو درآمد ثابت،
// کلیدهای روشن/خاموش پشتیبان (خودکار، رمزنگاری، رمز فایل)، باز شدن منوی همبرگری با کشیدن از لبه.
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
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const inc = (d, desc, a) => Object.assign(emptyRow('income'), { day: String(d), desc, amount: a, status: 'paid', account: ACC });
    const P = (rows) => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }], nextId: 2 }, income: { sections: [{ id: 's1', title: 'سارا', rows }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 6)] = P([inc(4, 'اجاره شهریور', 15000000)]);
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '5', desc: 'نان', amount: 30000, status: 'paid', account: ACC })] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [inc(4, 'اجاره مهر', 15000000)] }];
    const item = { id: 'rec_k', name: 'پناهی', amount: 15000000, deposit: 200000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 7, y: 1404 }, contractEnd: { d: 4, m: 7, y: 1406 }, fromKey: 140406, genKey: 140407 };
    recurringIncomes.push(item);
    recLinkRow(item, archive[periodKey(1405, 6)].income.sections[0].rows[0]);
    recLinkRow(item, periodData.income.sections[0].rows[0]);
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• نوشتهٔ پوشهٔ آرشیو');
  const fl = await p.evaluate(() => {
    recOpenArchive(recurringIncomes[0]);
    const lab = document.querySelector('#recArchiveModal .rec-term-range');
    const cur = lab.querySelector('.rec-term-cur');
    const out = { t: lab.innerText.replace(/\s+/g, ' ').trim(), c: getComputedStyle(lab).color, cc: cur ? getComputedStyle(cur).color : '', dir: getComputedStyle(lab).direction };
    document.getElementById('recArchiveModal').remove();
    return out;
  });
  ok(/^۱۴۰۴\/۰۷\/۰۴ تا ۱۴۰۶\/۰۷\/۰۴/.test(fl.t) && fl.dir === 'rtl', '«تا» بین دو تاریخ: ' + fl.t);
  ok(fl.c === 'rgb(79, 195, 247)' && fl.cc === 'rgb(79, 195, 247)', 'نوشتهٔ بازه و «(فعلی)» هر دو آبی پوشه');

  console.log('• جستجو: رنگ مبالغ و منوی «ماه»');
  const sr = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail('سارا', 'balance'); await w(300);
    const lab = document.querySelector('label[for="balanceSearchRange"]').textContent;
    document.getElementById('balanceSearchRange').value = '7'; renderBalanceSearch(); await w(50);
    const rows = [...document.querySelectorAll('#search-result-body tr')].map(tr => ({ t: tr.textContent, c: getComputedStyle(tr.querySelector('td.val')).color }));
    const foot = [...document.querySelectorAll('#search-result-foot tr')].map(tr => ({ t: tr.textContent, c: getComputedStyle(tr.querySelector('td.val')).color }));
    resetBalanceSearch(); closePersonDetail(); await w(200);
    return { lab, rows, foot };
  });
  const inc = sr.rows.find(r => /اجاره/.test(r.t)), exp = sr.rows.find(r => /نان/.test(r.t));
  ok(/^ماه:?$/.test(sr.lab), 'برچسب «زمان» به «ماه» تغییر کرد (از ۱.۳.۲۷ داخل باکس، بی‌دونقطه)');
  ok(inc && inc.c === 'rgb(158, 232, 88)' && exp && exp.c === 'rgb(255, 107, 74)', 'جدول جستجو: واریز سبز، برداشت قرمز');
  ok(sr.foot.some(f => /درآمد کل/.test(f.t) && f.c === 'rgb(158, 232, 88)') && sr.foot.some(f => /مخارج کل/.test(f.t) && f.c === 'rgb(255, 107, 74)'), 'جمع درآمد سبز و جمع مخارج قرمز');

  /* از ۱.۳.۴۶ نرم‌افزار تک‌کاربره است و کارت جدید ساخته نمی‌شود */
  if (false) {
  console.log('• کارت جدید کامل وسط صفحه');
  const cd = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    for (const name of ['کارت دوم', 'کارت سوم']) {
      openPersonEditSheet('', true); await w(300);
      const ov = document.querySelector('.modal-overlay.person-edit-sheet');
      ov.querySelector('input').value = name;
      [...ov.querySelectorAll('button')].find(x => x.textContent.trim() === 'تأیید').click();
      await w(1600);
    }
    const box = document.getElementById('homeCards');
    const card = box.querySelector('.person-card:not(.hc-clone)[data-title="کارت سوم"]');
    const br = box.getBoundingClientRect(), cr = card.getBoundingClientRect();
    return { off: Math.round((cr.left + cr.width / 2) - (br.left + br.width / 2)), active: getActiveHomeCardTitle() };
  });
  ok(Math.abs(cd.off) <= 3 && cd.active === 'کارت سوم', 'بعد از ساختن کارت، کارت جدید کامل وسط است (فاصله از مرکز: ' + cd.off + 'px)');

  }
  console.log('• پشتیبان و سطل زبالهٔ آرشیو درآمد ثابت');
  const bk = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pay = buildBackupPayload({ recurringIncomes: true });
    const out = { hasArc: Array.isArray(pay.recurringArchive) && pay.recurringArchive.length === 2, depKept: (pay.recurringIncomes[0] || {}).deposit === 200000000 };
    /* بازیابی فقط «درآمدهای ثابت» روی داده‌ای که آن ردیف‌ها را ندارد */
    const shRows = archive[periodKey(1405, 6)].income.sections[0];
    shRows.rows = [emptyRow('income')]; saveArchive();
    out.added = hkRecArchiveUnpack(pay.recurringArchive);
    out.backInArchive = recArchiveRows(recurringIncomes[0]).length === 2;
    out.noDup = hkRecArchiveUnpack(pay.recurringArchive) === 0;
    /* حذف درآمد ثابت از منو → آرشیو هم به سطل زباله */
    openFeatureSheet('recurring'); await w(400);
    document.querySelector('[data-rd="0"]').click(); await w(300);
    /* از ۱.۳.۲۴: پنجرهٔ «حذف با ردیف‌ها / حذف بدون ردیف‌ها» */
    { const kb = [...document.querySelectorAll('#hkAsk3 .hk-ask3-btn')].find(x => x.textContent === 'حذف بدون ردیف‌ها'); if (kb) kb.click(); await w(300); }
    const pm = document.getElementById('recPickModal'); if (pm) pm._hkCancel(); await w(150);
    out.deleted = !recurringIncomes.some(r => r.id === 'rec_k' && !r.deletedAt);
    out.unlinked = !periodData.income.sections[0].rows.some(r => r.fromRecurringId === 'rec_k');
    const ti = trashItems.findIndex(t => t.type === 'recurring' && t.title === 'پناهی');
    out.trashHasArc = ti >= 0 && Array.isArray(trashItems[ti].data._archive) && trashItems[ti].data._archive.length === 2;
    out.restored = restoreTrashData(trashItems[ti]);
    const it = recurringIncomes.find(r => r.id === 'rec_k');
    out.relinked = it ? recArchiveRows(it).length : 0;
    out.noArcField = it && !('_archive' in it);
    closeFeatureSheet(); await w(200);
    return out;
  });
  ok(bk.hasArc && bk.depKept, 'پشتیبان «درآمدهای ثابت»: تعریف‌ها (با رهن و دوره‌ها) و آرشیو واریزهای وصل‌شده');
  ok(bk.added === 1 && bk.backInArchive && bk.noDup, 'بازیابی: واریز گم‌شدهٔ آرشیو برگشت و دوباره بازیابی تکراری نساخت');
  ok(bk.deleted && bk.unlinked && bk.trashHasArc, 'حذف درآمد ثابت: آرشیوش هم همراهش به سطل زباله رفت');
  ok(bk.restored && bk.relinked === 2 && bk.noArcField, 'بازگردانی از سطل زباله: آرشیو دوباره وصل شد');

  console.log('• کلیدهای روشن/خاموش پشتیبان');
  const sw = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const oC = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (oC && oC.Plugins) || {}, { NativeFileExport: { saveAutoBackup: async () => ({}), listAutoBackups: async () => ({ files: [] }), deleteAutoBackup: async () => ({}), readAutoBackup: async () => ({ data: '' }) } }) };
    askBackupParts(); await w(200);
    const out = {};
    const auto = document.getElementById('bkAutoOn');
    out.autoIsSwitch = auto.tagName === 'BUTTON' && auto.classList.contains('hk-switch') && !document.querySelector('#backupPickOverlay input#bkAutoOn');
    out.autoOff = !auto.classList.contains('on');
    const encRow = document.getElementById('bkEncRow');
    out.encDisabled = encRow.classList.contains('bk-enc-hide');
    auto.click(); await w(150);
    out.autoOn = auto.classList.contains('on') && autoBkState().enabled === true;
    out.encEnabled = !encRow.classList.contains('bk-enc-hide');
    const encSw = document.getElementById('bkEncBtn');
    out.encNoText = !encSw.textContent.trim();
    await w(300); const cs = getComputedStyle(auto);
    out.size = cs.width + 'x' + cs.height; out.onBg = cs.backgroundColor;
    out.sameAsNotif = (() => { const n = document.querySelector('#permRowNotif .perm-sw'); if (!n) return true; const ns = getComputedStyle(n); return ns.width === cs.width && ns.height === cs.height; })();
    /* رمز فایل پشتیبان */
    const pw = document.getElementById('bkPwdSw');
    out.pwSwitch = !!pw && pw.classList.contains('hk-switch') && !document.querySelector('#backupPickOverlay input[type=password]');
    pw.click(); await w(200);
    const box = document.getElementById('bkPwdBox');
    out.box = !!box && box.querySelectorAll('input[type=password]').length === 2;
    box.querySelector('#bkPwdA').value = 'abc12345'; box.querySelector('#bkPwdB').value = 'abc1234';
    box.querySelector('#bkPwdSetOk').click(); await w(100);
    out.mismatch = !!document.getElementById('bkPwdBox') && /یکسان نیستند/.test(box.querySelector('#bkPwdErr').textContent);
    box.querySelector('#bkPwdB').value = 'abc12345'; box.querySelector('#bkPwdSetOk').click(); await w(150);
    out.pwOn = !document.getElementById('bkPwdBox') && pw.classList.contains('on') && document.getElementById('bkPwd').value === 'abc12345';
    pw.click(); await w(100);
    out.pwOff = !pw.classList.contains('on') && document.getElementById('bkPwd').value === '';
    pw.click(); await w(200);
    onBackGuard(); await w(300);
    out.backCancel = !document.getElementById('bkPwdBox') && !pw.classList.contains('on') && !!document.getElementById('backupPickOverlay');
    auto.click(); await w(100);
    out.offAgain = encRow.classList.contains('bk-enc-hide');
    document.querySelectorAll('.backup-pick-overlay').forEach(x => x.remove());
    window.Capacitor = oC;
    return out;
  });
  ok(sw.autoIsSwitch && sw.autoOff, 'پشتیبان خودکار: به جای چک‌باکس، کلید روشن/خاموش');
  ok(sw.encDisabled && sw.autoOn && sw.encEnabled && sw.offAgain, 'رمزنگاری پشتیبان خودکار تا وقتی پشتیبان خودکار خاموش است پنهان است (از ۱.۳.۲۳)');
  ok(sw.encNoText, 'کلید رمزنگاری بدون نوشته');
  ok(sw.size === '38px x 22px'.replace(' x ', 'x') && sw.onBg === 'rgb(8, 181, 245)' && sw.sameAsNotif, 'اندازهٔ کلیدها مثل کلید اعلان‌ها و داخلشان آبی (' + sw.size + ', ' + sw.onBg + ')');
  ok(sw.pwSwitch && sw.box && sw.mismatch && sw.pwOn && sw.pwOff, '«رمز فایل پشتیبان»: کلید روشن/خاموش؛ روشن کردن باکس دو فیلد رمز باز می‌کند و رمز تکراری را می‌سنجد');
  ok(sw.backCancel, 'بازگشت روی باکس رمز: انصراف و کلید خاموش ماند');

  console.log('• منوی همبرگری با کشیدن از لبهٔ راست');
  const sm = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const fire = (type, x, y) => {
      const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y });
      document.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true }));
    };
    const W = window.innerWidth;
    /* کشیدن از وسط صفحه: باز نشود */
    fire('touchstart', W / 2, 400); fire('touchmove', W / 2 - 80, 402); fire('touchend', W / 2 - 80, 402); await w(200);
    const mid = document.body.classList.contains('menu-open');
    fire('touchstart', W - 6, 400); fire('touchmove', W - 30, 403); fire('touchmove', W - 90, 405); fire('touchend', W - 90, 405); await w(300);
    const edge = document.body.classList.contains('menu-open');
    closeSideMenu(); await w(200);
    return { mid, edge };
  });
  ok(!sm.mid && sm.edge, 'کشیدن از لبهٔ راست به چپ منو را باز می‌کند (از وسط صفحه نه)');

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbatch-1322: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
