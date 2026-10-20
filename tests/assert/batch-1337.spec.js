// نسخهٔ ۱.۳.۳۷: منوی جستجو (بازهٔ مبلغ بی‌هم‌پوشانی، ردیف‌های جمع پایین جدول با زمینهٔ جدا، فیلترهای «برچسب | منو»،
// ضربدر شرح با لمس، ترتیب ستون‌ها، اسکرول یک‌تکه)، برگشت پیدا کردن خودکار قسط و قفل قسط‌های گذشته، و پیوست از «اشتراک‌گذاری». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

async function page(b, extra) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 840 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  if (extra) await ctx.addInitScript({ content: extra });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  console.log('• منوی جستجو');
  const p = await page(b); p.on('pageerror', e => errors.push(e.message));
  await p.goto(INDEX); await p.waitForTimeout(1500);
  const s = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = allPersonTitles()[0];
    periodData.expense.sections[0].rows = Array.from({ length: 16 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'نان ' + i, amount: 20000 * (i + 1), status: 'paid', account: 'ملت' }));
    persistCurrent();
    openPersonDetail(t, 'balance'); await w(500);
    const out = {};
    out.th = [...document.querySelectorAll('#searchResultBox thead th')].map(x => x.textContent.trim());
    const i = document.getElementById('balanceSearchInput'); i.value = 'نان'; i.dispatchEvent(new Event('input')); await w(300);
    const tr = document.querySelector('#search-result-body tr');
    out.firstCells = [...tr.children].map(td => td.className);
    /* ردیف جمع (۱.۳.۴۰): پایین جدول چسبان، زمینهٔ مات و جدا، خط ضخیم بالا */
    const ftd = document.querySelector('#search-result-foot td'), btd = document.querySelector('#search-result-body td');
    const cs = getComputedStyle(ftd);
    out.foot = { pos: cs.position, bg: cs.backgroundImage + cs.backgroundColor, bodyBg: getComputedStyle(btd).backgroundImage + getComputedStyle(btd).backgroundColor, bt: parseFloat(getComputedStyle(ftd, '::before').height) };
    const sc = document.getElementById('searchResultScroll');
    sc.scrollTop = 0; await w(50);
    const fr = ftd.getBoundingClientRect(), scr = sc.getBoundingClientRect();
    out.footBelow = fr.bottom <= scr.bottom + 1 && fr.top < scr.bottom - 10;   /* ۱۶ ردیف: جمع پایین کادر جدول دیده می‌شود (ردیف‌ها زیرش رد می‌شوند) */
    sc.scrollTop = 99999; await w(50);
    const lastRow = [...document.querySelectorAll('#search-result-body tr')].pop().getBoundingClientRect();
    out.footAfterLast = ftd.getBoundingClientRect().top >= lastRow.bottom - 1;
    /* اسکرول یک‌تکه: کادر فیلترها همراه صفحه بالا می‌رود */
    const panel = document.getElementById('panel-balance'), head = document.getElementById('balanceFixedHeader');
    out.panelOv = getComputedStyle(panel).overflowY;
    const h0 = head.getBoundingClientRect().top;
    panel.scrollTop = 200; await w(80);
    out.headMoved = Math.round(h0 - head.getBoundingClientRect().top); out.scrolled = Math.round(panel.scrollTop);
    panel.scrollTop = 0; await w(50);
    /* بازهٔ مبلغ: هیچ دو برچسبِ دیده‌شده روی هم نمی‌افتند */
    const mn = document.getElementById('balanceSearchAmtMin'), mx = document.getElementById('balanceSearchAmtMax');
    const host = document.getElementById('balanceAmtRange');
    const vis = el => { const c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && el.getBoundingClientRect().width > 0; };
    const overl = () => {
      const els = [...host.querySelectorAll('.hk-ar-tick, .hk-ar-val')].filter(vis).map(el => el.getBoundingClientRect());
      let n = 0;
      for (let a = 0; a < els.length; a++) for (let c = a + 1; c < els.length; c++) { const A = els[a], B = els[c]; if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) n++; }
      return n;
    };
    const cases = [['', ''], ['20,000', ''], ['', '900,000'], ['200,000', '400,000'], ['100,000', '150,000'], ['500,000', ''], ['', '50,000'], ['0', '1,000,000']];
    out.overlaps = [];
    for (const [a, c] of cases) {
      mn.value = a; mn.dispatchEvent(new Event('input', { bubbles: true }));
      mx.value = c; mx.dispatchEvent(new Event('input', { bubbles: true }));
      await w(120);
      out.overlaps.push(overl());
    }
    mn.value = ''; mx.value = ''; mn.dispatchEvent(new Event('input', { bubbles: true })); mx.dispatchEvent(new Event('input', { bubbles: true }));
    await w(100);
    const clr = document.querySelector('.bs-desc-clr').getBoundingClientRect();
    out.clr = { x: clr.left + clr.width / 2, y: clr.top + clr.height / 2 };
    i.focus();
    return out;
  });
  /* ضربدر شرح با لمس واقعی (touchstart/touchend) */
  await p.touchscreen.tap(s.clr.x, s.clr.y); await p.waitForTimeout(250);
  const clr = await p.evaluate(() => { const i = document.getElementById('balanceSearchInput'); return { v: i.value, f: document.activeElement === i }; });
  /* ۱.۳.۴۳: شمارهٔ ردیف ستون اول */
  ok(s.th.join('،') === 'ردیف،تاریخ،شرح،بانک،مبلغ' && s.firstCells[0] === 'sr-num' && s.firstCells[1] === 'sr-date' && s.firstCells[2] === 'sec-name', 'ستون‌های نتیجه به ترتیب: ردیف، تاریخ، شرح، بانک، مبلغ');
  ok(s.foot.pos === 'sticky' && s.foot.bg !== s.foot.bodyBg && s.foot.bt >= 2 && s.footBelow && s.footAfterLast, 'ردیف جمع پایین جدول چسبان (همیشه دیده می‌شود)، زمینهٔ جدا و خط ضخیم بالا (' + s.foot.bg + ')');
  /* ۱.۳.۳۸: کادر جستجو بالای صفحه می‌چسبد و با اسکرول جمع می‌شود (batch-1338) */
  ok(s.panelOv === 'auto' && s.scrolled > 20, 'منوی جستجو یک‌تکه اسکرول می‌شود (' + s.scrolled + 'px)');
  ok(s.overlaps.every(n => n === 0), 'بازهٔ مبلغ: در هیچ حالتی برچسب‌ها روی هم نمی‌افتند (' + s.overlaps.join(',') + ')');
  ok(clr.v === '' && clr.f, 'ضربدر شرح با لمس کار می‌کند: نوشته پاک و فیلد فعال می‌ماند');

  /* از ۱.۳.۴۶ اقساط خاموش است (batch-1346) */
  if (false) {
  console.log('• قسط: قسط‌های گذشته قفل');
  const q = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closePersonDetail && closePersonDetail(); await w(200);
    const t = allPersonTitles()[0];
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملت', label: 'ملت', openingBalance: 10000000 }); saveBankAccountsSelection();
    periodData.expense.sections = [{ id: 's1', title: t, rows: [emptyRow('expense')] }];
    /* قسط تازه: شروع بازپرداخت فروردین ۱۴۰۵، ۱۲ قسط ۱ میلیونی؛ موقع ساخت «تعداد قسط پرداخت شده» = ۴ (فروردین تا تیر) */
    const plan = emptyPlan();
    Object.assign(plan, { id: 'pl1', name: 'وام ماشین', count: 12, paidCount: 4, lockedCount: 4, amount: 12000000, startYear: 1405, startMonth: 1, startDay: 10, expenseSectionId: 's1', expenseSectionTitle: t, createdAt: Date.now(), isNew: false, editing: false });
    plans.push(plan);
    for (const m of [3, 4, 5, 6]) { archive['1405-' + m] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: t, rows: [emptyRow('expense')] }] } }; }
    /* تیر: ردیف قسط با بانکِ دستی + همان پرداخت از پیامک (ردیف معمولی) */
    archive['1405-4'].expense.sections[0].rows = [Object.assign(emptyRow('expense'), { day: '10', desc: 'قسط ۴', amount: 1000000, status: 'paid', account: 'ملت', fromPlanId: 'pl1', fromPlanIndex: 3 }), Object.assign(emptyRow('expense'), { day: '10', desc: '', amount: 1000000, status: 'paid', account: 'ملت', fromSmsBulk: true })];
    syncPlansToExpenseAll(); persistCurrent(); saveArchive();
    const out = {};
    const rowsOf = m => (m === 7 ? periodData : archive['1405-' + m]).expense.sections.flatMap(s => s.rows).filter(x => x.fromPlanId || x.amount);
    out.tir = rowsOf(4).map(x => (x.fromPlanId ? 'P' + x.fromPlanIndex : '-') + ':' + x.amount + ':' + (x.account || '') + ':' + (x.planLocked ? 'L' : ''));
    out.mordad = rowsOf(5).map(x => (x.fromPlanId ? 'P' + x.fromPlanIndex : '-') + ':' + x.status + ':' + x.amount);
    out.mehr = rowsOf(7).map(x => (x.fromPlanId ? 'P' + x.fromPlanIndex : '-') + ':' + x.status + ':' + (x.planCarried ? 'C' : ''));
    out.tirTotal = archive['1405-4'].expense.sections.reduce((s2, sc) => s2 + sectionPaidUnpaidTotal(sc).total, 0);
    const lr = archive['1405-4'].expense.sections[0].rows.find(x => x.planLocked);
    out.canEdit = canEditRow(lr);
    /* نمایش: تیر، جدول کارت */
    navigateToPeriod(1405, 4); await w(300);
    openPersonDetail(t, 'expense'); await w(400);
    const tr = document.querySelector('tr.plan-locked');
    out.ui = tr ? { amt: tr.querySelector('.pd-amt').value, acc: tr.querySelector('.pd-acc-btn').textContent, tag: (tr.querySelector('.preapp-tag') || {}).textContent, lock: !!tr.querySelector('.preapp-tag svg') } : null;
    if (tr) { tr.querySelector('.pd-acc-btn').click(); await w(150); }
    out.menuOpened = !!document.querySelector('.dark-select-list.open, .pd-acc-menu, .acc-menu.open');
    const pop = document.querySelector('.cell-text-popup'); out.pop = pop ? pop.textContent : ''; if (pop) pop.remove();
    closePersonDetail(); await w(200);
    navigateToPeriod(1405, 7); await w(300);
    /* ویرایش دستی «تعداد قسط پرداخت شده» = مرز قفل؛ پرداخت از تب اقساط مرز را جابه‌جا نمی‌کند */
    markPlanInstallmentPaid('pl1', 4);
    out.afterPay = { paid: plan.paidCount, locked: planLockedCount(plan) };
    return out;
  });
  ok(q.tir.length === 2 && q.tir.includes('P3:0::L') && q.tir.includes('-:1000000:ملت:'), 'تیر (قسط گذشته): ردیف قسط قفل، مبلغ صفر و بی بانک؛ پرداخت پیامکی ردیف معمولی می‌ماند (' + q.tir.join(' | ') + ')');
  ok(q.tirTotal === 1000000, 'خرج کل تیر فقط همان یک پرداخت واقعی است (قسط قفل دوبار حساب نمی‌شود)');
  ok(q.mordad.join() === 'P4:unpaid:1000000' && q.mehr.some(x => /^P4:unpaid:C$/.test(x)) && q.mehr.some(x => /^P6:unpaid:$/.test(x)), 'ماه‌های بعد از مرز: عادی؛ مرداد پرداخت‌نشده و در مهر معوق (' + q.mehr.join(' | ') + ')');
  ok(q.canEdit === false && q.ui && q.ui.amt === '۱,۰۰۰,۰۰۰' && q.ui.acc === '—' && q.ui.lock && /پرداخت قبلی/.test(q.ui.tag), 'ردیف قفل در جدول: مبلغ قسط کم‌رنگ، بانک «—»، نشان قفل و «پرداخت قبلی»؛ قابل ویرایش نیست');
  ok(!q.menuOpened && /فقط برای دیدن/.test(q.pop), 'زدن بانکِ ردیف قفل منوی بانک را باز نمی‌کند (' + q.pop + ')');
  ok(q.afterPay.paid === 5 && q.afterPay.locked === 4, 'پرداخت قسط بعدی از تب اقساط: پرداخت‌شده ۵، مرز قفل همان ۴');

  }
  console.log('• پیوست از اشتراک‌گذاری');
  const fake = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const p2 = await page(b, `window.__shared = [{ data: ${JSON.stringify(fake)}, mime: 'image/jpeg', pdf: false }, { data: ${JSON.stringify(fake)}, mime: 'image/jpeg', pdf: true }];
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkMedia: { takeShared: () => { const it = window.__shared; window.__shared = []; return Promise.resolve({ items: it }); } } } };`);
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(INDEX); await p2.waitForTimeout(800);
  const sh = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = [Object.assign(emptyRow('expense'), { day: '5', desc: 'کارت به کارت علی', amount: 2500000, status: 'paid', account: 'ملت' }), Object.assign(emptyRow('expense'), { day: '9', desc: 'خرید', amount: 90000, status: 'paid' })];
    persistCurrent();
    await w(2400);
    const ov = document.getElementById('hkShareOv'), out = {};
    out.open = !!ov; out.title = ov ? ov.querySelector('.hk-bulk-title').textContent : '';
    out.hint = ov ? ov.querySelector('.hk-bulk-hint').textContent : '';
    out.rows = ov ? [...ov.querySelectorAll('.hk-share-row .hk-sr-t')].map(x => x.textContent) : [];
    const btn = ov && [...ov.querySelectorAll('.hk-share-row')].find(x => /کارت به کارت/.test(x.textContent));
    if (btn) btn.click();
    await w(600);
    const r = periodData.expense.sections[0].rows.find(x => /کارت به کارت/.test(x.desc));
    out.att = (r.att || []).map(a => a.kind + ':' + a.src);
    out.attWin = !!document.getElementById('hkAttachOv');
    try { hkCloseAttach(); } catch (e) {}
    /* بار دوم: «ردیف تازه» */
    window.__shared = [{ data: 'iVBORw0KGgo=', mime: 'image/jpeg' }];
    window.dispatchEvent(new Event('hkShareAttach')); await w(600);
    const ov2 = document.getElementById('hkShareOv'); out.open2 = !!ov2;
    if (ov2) ov2.querySelector('.hk-share-new').click();
    await w(600);
    const nr = periodData.expense.sections.flatMap(s => s.rows).find(x => !x.amount && Array.isArray(x.att) && x.att.length);
    out.newRow = nr ? nr.day + ':' + nr.att.length : '';
    try { hkCloseAttach(); } catch (e) {}
    return out;
  });
  ok(sh.open && sh.title === 'پیوست به کدام ردیف؟' && /۱ عکس و ۱ PDF/.test(sh.hint) && sh.rows[0] === 'خرید', 'عکس/PDF اشتراکی: پنجرهٔ «پیوست به کدام ردیف؟» با ردیف‌های این ماه (تازه‌ترها بالا) (' + sh.hint + ')');
  ok(sh.att.join() === 'img:share,img:pdf' && sh.attWin, 'با انتخاب ردیف، هر دو فایل پیوست آن ردیف شدند و پنجرهٔ پیوست‌ها باز شد');
  ok(sh.open2 && sh.newRow === '21:1', '«ردیف تازه»: ردیف امروز در مخارج با همان پیوست ساخته شد (' + sh.newRow + ')');

  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/hk-share-attach/.test(patch) && /android\.intent\.action\.SEND_MULTIPLE/.test(patch) && /mimeType="image\/\*"/.test(patch) && /mimeType="application\/pdf"/.test(patch), 'اندروید: نرم‌افزار در فهرست «اشتراک‌گذاری» عکس و PDF (تکی و چندتایی)');
  ok(/captureShared\(this,getIntent\(\)\)/.test(patch) && /triggerWindowJSEvent\("hkShareAttach"\)/.test(patch) && /PdfRenderer/.test(patch) && /decodeScaled\(getContext\(\),us\.get\(i\),1600\)/.test(patch), 'اندروید: عکس کوچک (۱۶۰۰px، JPEG) و صفحهٔ اول PDF به عکس؛ فایل پشتیبان اشتراکی مثل قبل');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
