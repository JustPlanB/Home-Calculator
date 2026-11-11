// ۱.۳.۹۹: صفحه‌ها همیشه تمام‌صفحه (بی ضربدر و فلش برگشت؛ فقط بک)، ورق خوردن آرام‌تر، صفحهٔ «حساب‌های من» هم‌شکل بقیه،
// حساب‌های مسدود (بی undefined، اطلاعات حساب، دایرهٔ قرمز)، «مانده» در باکس ویرایش ردیف و صورت‌حساب حساب، قفل تاریخ ردیف پیامکی،
// یک ردیف خالص برای هر پروژه، اسکرول افقی بی ویبره. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const root = path.join(__dirname, '..', '..');
  const rd = f => fs.readFileSync(path.join(root, 'src', 'js', f), 'utf8');
  console.log('• کد');
  ok(!/appHaptic\(8\)/.test(rd('04c-open-plan-name-sheet.js')) && !/is-armed'\);\s*try \{ window\.appHaptic/.test(rd('13d-section-el-id.js')), 'کشیدن افقی (بین تب‌ها و کشیدن ردیف) بی ویبره');
  const ib = rd('05b-bubble-accounts.js');
  ok(/var net = \(Number\(pr\.cash\) \|\| 0\) - \(Number\(pr\.receivable\) \|\| 0\);/.test(ib) && /\(net > 0 \? 'موجودی پروژه ' : 'بدهی پروژه '\)/.test(ib) && !/'<span class="ib-name">بدهی پروژه ' \+ escapeHtml\(pr\.name\)/.test(ib), 'موجودی پروژه: برای هر پروژه یک ردیف خالص (موجودی منهای بدهی)');
  ok(/duration: 400/.test(rd('14-theme.js')), 'ورق خوردن صفحه‌ها آرام‌تر (۰٫۴ ثانیه)');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• صفحه‌های تمام‌صفحه');
  const PG = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    for (const n of ['openPrefsModal', 'openBankAccountsModal', 'hkOpenBlockedAccounts', 'openDongModal']) {
      window[n](); await w(700);
      const pg = [...document.querySelectorAll('.hk-page')].filter(x => x.getClientRects().length);
      const r = pg[0] && pg[0].getBoundingClientRect();
      const xIcon = pg.some(p => [...p.querySelectorAll('.hk-pf-x, .hk-pf-back, .hk-rc-x')].some(e => e.getClientRects().length));
      out[n] = { full: !!r && r.width >= innerWidth - 1 && r.height >= innerHeight - 1, xIcon };
      onBackGuard(); await w(700);
      out[n].closed = ![...document.querySelectorAll('.hk-page')].some(x => x.getClientRects().length);
    }
    out.fsClose = getComputedStyle(document.getElementById('featureSheetClose')).display === 'none';
    openBankAccountsModal(); await w(600);
    const sel = document.getElementById('bankBanksScroll'), cs = getComputedStyle(sel);
    out.bankLook = cs.borderTopWidth === '0px' && parseFloat(cs.borderTopLeftRadius) >= 12 && getComputedStyle(document.querySelector('#bankAccountsModal .modal-box > .modal-btn.no')).display === 'none';
    onBackGuard(); await w(600);
    return out;
  });
  ok(Object.keys(PG).filter(k => /^open|^hk/.test(k)).every(k => PG[k].full && !PG[k].xIcon && PG[k].closed), 'شخصی‌سازی، حساب‌های من، مسدودها و دنگ: تمام‌صفحه، بی ضربدر/فلش، بسته شدن با بک');
  ok(PG.fsClose, 'برگه‌های قرض/اقساط/آمار هم بی فلش برگشت (بستن با بک)');
  ok(PG.bankLook, '«حساب‌های من» هم‌شکل بقیهٔ صفحه‌ها (گروه گرد، بی خط ضخیم، بی «بستن»)');

  console.log('• حساب‌های مسدود');
  const BL = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    hkBlockAccount('', 'پیامک شخصی', { senders: ['+989121234567'], personal: true });
    hkBlockAccount('5555', 'بانک ملت');
    const raw = 'بانک ملت\nبرداشت 100,000\nکارت 5555\nمانده 1,000,000\n0807-11:00';
    const hit = hkSmsBlockedHit(raw, 'Bank Mellat'); hkBlockedNoteHit(hit, raw);
    const badge = (document.querySelector('#menuBlockedBtn .hk-unread-n') || {}).textContent;
    hkOpenBlockedAccounts(); await w(500);
    const ov = document.getElementById('hkBlockOv');
    const noUndef = !/undefined/.test(ov.textContent);
    const r = [...ov.querySelectorAll('.hk-block-r')].find(x => /ملت/.test(x.textContent)); r.click(); await w(200);
    const info = ov.querySelector('.hk-block-info'), it = info ? info.textContent : '';
    onBackGuard(); await w(300);
    const backList = !!document.querySelector('#hkBlockOv .hk-block-list');
    onBackGuard(); await w(500);
    return { badge, noUndef, info: !!info, hits: /پیامک‌های نادیده‌گرفته\s*۱/.test(it) && /۱۰,۰۰۰ برداشت/.test(it) /* ریال پیامک ← تومان */, backList, gone: !document.getElementById('hkBlockOv') };
  });
  ok(BL.badge === '۲', 'تعداد حساب‌های مسدود در دایرهٔ قرمز منو (' + BL.badge + ')');
  ok(BL.noUndef, 'زیر حساب مسدودِ بی‌شماره دیگر «undefined» نیست (فرستنده نوشته می‌شود)');
  ok(BL.info && BL.hits, 'زدن روی حساب مسدود: اطلاعاتش (تعداد پیامک نادیده و آخرینش)');
  ok(BL.backList && BL.gone, 'بازگشت: اول فهرست، بعد بستن');

  console.log('• مانده و قفل تاریخ');
  const M = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'ba1', bank: 'بانک ملی', label: 'ملی', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t), inc = periodData.income.sections.find(s => s.title === t);
    const a = Object.assign(emptyRow('expense'), { day: '3', time: '10:00', desc: 'نان', amount: 100000, status: 'paid', account: 'ملی', viaSms: true });
    const c = Object.assign(emptyRow('expense'), { day: '5', time: '09:00', desc: 'بنزین', amount: 200000, status: 'paid', account: 'ملی' });
    const bI = Object.assign(emptyRow('income'), { day: '4', time: '12:00', desc: 'حقوق', amount: 500000, status: 'paid', account: 'ملی' });
    ex.rows = [a, c]; inc.rows = [bI]; persistCurrent();
    const map = hkAccountRunningBalances('ملی');
    const out = { a: map.get(a), b: map.get(bI), c: map.get(c), total: globalAccountBalances()['ملی'] };
    hkOpenRowEdit({ row: a, tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    const balR = document.querySelector('#hkRowEdit .hk-re-bal');
    out.rowBal = balR ? balR.textContent : '';
    const pills = [...document.querySelectorAll('#hkRowEdit .hk-re-pill')];
    out.locked = pills.length === 2 && pills.every(p => p.classList.contains('hk-re-locked'));
    pills[0].click(); await w(200);
    out.noPanel = !document.querySelector('#hkRowEdit .hk-re-pnl.open');
    document.getElementById('hkRowEdit')._hkCancel ? document.getElementById('hkRowEdit')._hkCancel() : document.getElementById('hkRowEdit').remove(); await w(300);
    hkOpenRowEdit({ row: c, tab: 'expense', title: t, sec: ex, num: 2, onSaved: function () {} }); await w(400);
    out.manualOpen = ![...document.querySelectorAll('#hkRowEdit .hk-re-pill')].some(p => p.classList.contains('hk-re-locked'));
    document.getElementById('hkRowEdit')._hkCancel ? document.getElementById('hkRowEdit')._hkCancel() : document.getElementById('hkRowEdit').remove(); await w(300);
    hkOpenAccountTx(selectedBankAccounts.find(x => x.label === 'ملی')); await w(500);
    const hd = document.querySelector('#hkAccTxOv .hk-acctx-h .b');
    const rows = [...document.querySelectorAll('#hkAccTxOv .hk-acctx-r:not(.hk-acctx-h)')].map(r => ({ t: r.querySelector('.t').textContent, b: r.querySelector('.b').textContent }));
    out.stmt = { hd: hd && hd.textContent, rows };
    return out;
  });
  ok(M.a === 900000 && M.b === 1400000 && M.c === 1200000 && M.total === 1200000, 'مانده بعد از هر تراکنش به ترتیب روز و ساعت (۹۰۰ هزار، ۱٫۴ میلیون، ۱٫۲ میلیون)');
  ok(/^مانده/.test(M.rowBal) && /900,000|۹۰۰,۰۰۰/.test(M.rowBal), 'باکس ویرایش ردیف: «مانده» (' + M.rowBal + ')');
  ok(M.locked && M.noPanel, 'ردیف پیامکی: تاریخ و ساعت قفل (زدن، باز نمی‌کند)');
  ok(M.manualOpen, 'ردیف دستی: تاریخ و ساعت مثل قبل قابل ویرایش');
  ok(M.stmt.hd === 'مانده' && M.stmt.rows.length === 3 && /۱,۲۰۰,۰۰۰|1,200,000/.test(M.stmt.rows[0].b) && /۹۰۰,۰۰۰|900,000/.test(M.stmt.rows[2].b), 'صورت‌حساب حساب: ستون «مانده» (جدیدترین بالا)');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1399: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
