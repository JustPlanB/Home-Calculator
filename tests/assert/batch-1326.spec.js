// نسخهٔ ۱.۳.۲۶: ثبت گروهی پیامک بدون سؤال (حساب خودکار، تکراری‌ها، ردیف اختلاف، موجودی اول ماه از پیامک، خلاصه و برگرداندن)،
// موجودی حساب تازه از آخرین پیامک، همگام‌سازی با پیامک، پاک‌سازی تکراری‌های قدیمی، و رفع اشکال‌های کوچک
// (فلش ماه/سال، بانک دلخواه، باکس‌های منو، سطل باکس هوشمند، فلش درآمد ثابت، کندی پوشه‌ها). فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

/* پیامک مصنوعی: مبلغ‌ها به ریال در متن؛ روز d مهر ۱۴۰۵ = ۲۲+d سپتامبر ۲۰۲۶ */
function inboxScript(list) {
  return `(() => {
    const L = ${JSON.stringify(list)}, inbox = [];
    L.forEach(x => {
      const ts = x.m === 6 ? Date.UTC(2026, 8, 22 - (31 - x.d), 8) : Date.UTC(2026, 8, 22 + x.d, 8 + (x.h || 0));
      inbox.push({ address: '+98700', date: ts, body: 'بانک ' + x.bank + '\\n' + (x.t === 'i' ? 'واریز ' : 'برداشت ') + (x.a * 10).toLocaleString('en') + '\\nحساب 0000***' + x.acc + '\\nمانده ' + (x.b * 10).toLocaleString('en') });
    });
    inbox.sort((a, b) => b.date - a.date);
    window.__inbox = inbox;
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };
  })();`;
}

async function newPage(b, list) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
  });
  await ctx.addInitScript({ content: inboxScript(list) });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- الف) ثبت گروهی بدون سؤال ---------- */
  const SMS_A = [
    { bank: 'ملت', acc: '1111', m: 6, d: 30, t: 'e', a: 100000, b: 2000000 },
    { bank: 'ملت', acc: '1111', d: 3, t: 'e', a: 200000, b: 1800000 },
    { bank: 'ملت', acc: '1111', d: 5, t: 'i', a: 1000000, b: 2800000 },
    { bank: 'ملت', acc: '1111', d: 8, t: 'e', a: 300000, b: 2500000 },
    { bank: 'ملت', acc: '1111', d: 12, t: 'e', a: 150000, b: 2300000 },   /* ۵۰٬۰۰۰ برداشتِ بی‌پیامک قبلش */
    { bank: 'ملت', acc: '1111', d: 15, t: 'e', a: 40000, b: 2260000 },
    { bank: 'پاسارگاد', acc: '3333', d: 10, t: 'e', a: 70000, b: 930000 },
    { bank: 'پاسارگاد', acc: '3333', d: 11, t: 'e', a: 70000, b: 860000 },
    { bank: 'صادرات', acc: '4444', d: 6, t: 'i', a: 500000, b: 1500000 },
    { bank: 'ملی', acc: '2222', d: 7, t: 'e', a: 100000, b: 900000 },
    { bank: 'ملی', acc: '2222', d: 14, t: 'i', a: 50000, b: 950000 }
  ];
  const p = await newPage(b, SMS_A); p.on('pageerror', e => errors.push(e.message));
  await p.goto(INDEX); await p.waitForTimeout(1800);

  await p.evaluate(() => {
    const A = (id, bank, label, ob) => ({ id, bank, label, openingBalance: ob, createdAt: { y: 1405, m: 7, d: 10 } });
    selectedBankAccounts.push(A('ba1', 'بانک ملت', 'ملت', 5000000), A('ba2', 'بانک پاسارگاد', 'پاسارگاد من', 0), A('ba3', 'بانک صادرات', 'صادرات اصلی', 0), A('ba4', 'بانک صادرات', 'صادرات دوم', 0));
    saveBankAccountsSelection();
    smsAccountBankMap['L4:3333'] = 'پاسارگاد من'; saveSmsAccountBankMap();
    const R = (tab, d, desc, a, acc) => Object.assign(emptyRow(tab), { day: String(d), desc, amount: a, status: 'paid', account: acc });
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [R('expense', 3, 'نان', 200000, 'ملت'), R('expense', 9, 'میوه', 300000, 'ملت'), R('expense', 10, 'قهوه', 70000, 'پاسارگاد من'), R('expense', 12, 'تاکسی', 70000, 'پاسارگاد من'), emptyRow('expense')] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [R('income', 5, 'حقوق', 1000000, ''), emptyRow('income')] }];
    persistCurrent(); saveArchive(); renderAll();
  });

  console.log('• پوشه‌ها: همه، حساب خودکار، فهرست تنبل');
  const fo = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSmsBulkModal(); await w(200);
    await hkBulkRead(); await w(1000);
    /* از ۱.۳.۲۷ پیش‌فرض هیچ پوشه‌ای تیک ندارد؛ «همه» همه را انتخاب می‌کند */
    const def = { all: document.querySelector('.hk-bulk-allchk').checked, on: document.querySelectorAll('.hk-bulk-folder.on').length, need: document.querySelectorAll('.hk-bulk-folder.need').length };
    document.querySelector('.hk-bulk-allchk').click(); await w(100);
    const cards = [...document.querySelectorAll('.hk-bulk-folder')];
    const by = {}; cards.forEach((c, i) => { by[c.querySelector('.hk-bulk-fname').textContent] = { i, v: c.querySelector('.hk-bulk-dsel').getValue(), need: c.classList.contains('need'), on: c.classList.contains('on'), tx: c.querySelector('.hk-bulk-tx').children.length }; });
    const all = document.querySelector('.hk-bulk-allchk');
    return { by, all: all && all.checked, n: cards.length, def };
  });
  const F = k => Object.keys(fo.by).find(x => x.indexOf(k) >= 0);
  ok(fo.def.all === false && fo.def.on === 0 && fo.def.need === 0, 'پیش‌فرض: «همه» و هیچ پوشه‌ای تیک نخورده (کادر قرمزی هم نیست)');
  ok(fo.all === true && Object.values(fo.by).every(x => x.on), 'زدن «همه» → همهٔ پوشه‌ها انتخاب شدند');
  ok(fo.by[F('پاسارگاد')].v === 'پاسارگاد من', 'پوشهٔ با رقم‌های آموخته‌شده → همان حساب');
  ok(fo.by[F('ملت')].v === 'ملت', 'تنها حساب بانک → خودکار همان حساب');
  ok(fo.by[F('ملی')].v === 'ملی ۲۲۲۲', 'بانک بدون حساب → حساب تازهٔ «ملی ۲۲۲۲» پیشنهاد و انتخاب شد');
  ok(fo.by[F('صادرات')].v === '' && fo.by[F('صادرات')].need && Object.keys(fo.by).filter(k => fo.by[k].need).length === 1, 'دو حساب از یک بانک و رقم ناشناس → فقط کادر همان پوشه قرمز');
  ok(Object.values(fo.by).every(x => x.tx === 0), 'ردیف‌های تراکنش پوشه‌ها تا باز شدن ساخته نمی‌شوند');

  const lazy = await p.evaluate(async (i) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const c = document.querySelectorAll('.hk-bulk-folder')[i];
    c.querySelector('.hk-bulk-fhead').click(); await w(20);
    const r = { tx: c.querySelector('.hk-bulk-tx').children.length, open: c.classList.contains('open') };
    await w(600);
    c.querySelector('.hk-bulk-fhead').click(); await w(20);
    const ar = c.querySelector('.hk-bulk-arrow'); ar.style.transition = 'none';
    r.shut = c.classList.contains('shut'); r.arrow = getComputedStyle(ar).transform; r.stillOpen = c.classList.contains('open');
    await w(600); r.closed = !c.classList.contains('open');
    return r;
  }, fo.by[F('ملت')].i);
  ok(lazy.tx === 5 && lazy.open, 'با باز کردن پوشه، فهرست همان لحظه ساخته شد (' + lazy.tx + ' ردیف)');
  ok(lazy.shut && lazy.stillOpen && lazy.arrow === 'none' && lazy.closed, 'بستن پوشه: فلش همان لحظه برمی‌گردد و فهرست بعد از انیمیشن بسته می‌شود');

  console.log('• ثبت: کادر قرمز، بعد بدون هیچ سؤال');
  const sub1 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.hk-bulk-ok').click(); await w(200);
    return { sum: !!document.querySelector('.hk-bulk-sum'), need: document.querySelectorAll('.hk-bulk-folder.need').length };
  });
  ok(!sub1.sum && sub1.need === 1, 'با کادر قرمز، ثبت انجام نمی‌شود');
  const res = await p.evaluate(async (i) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const d = document.querySelectorAll('.hk-bulk-dsel')[i];
    [...d._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === 'صادرات دوم').click(); await w(100);
    const needAfter = document.querySelectorAll('.hk-bulk-folder.need').length;
    document.querySelector('.hk-bulk-ok').click(); await w(700);
    const rows = [];
    ['income', 'expense'].forEach(t => (periodData[t].sections || []).forEach(s => (s.rows || []).forEach(r => { if (r.amount) rows.push(t[0] + r.day + ':' + r.amount + ':' + (r.account || '-') + (r.reconGap ? ':gap' : '') + (r.fromSmsBulk ? ':sms' : '')); })));
    return {
      ask: !!document.getElementById('hkAsk3') || !!document.getElementById('hkReconDlg'),
      sum: (document.querySelector('.hk-bulk-sum') || {}).innerText || '',
      bal: globalAccountBalances(), accs: selectedAccountLabels(), map: Object.assign({}, smsAccountBankMap),
      melli: (selectedBankAccounts.find(a => a.label === 'ملی ۲۲۲۲') || {}).bank,
      open: Object.assign({}, periodData.accountOpeningInstant), rows, needAfter
    };
  }, fo.by[F('صادرات')].i);
  ok(res.needAfter === 0, 'انتخاب حساب برای پوشهٔ قرمز → رنگ قرمز رفت');
  ok(!res.ask, 'هیچ پنجرهٔ سؤالی (مغایرت/تکراری/اختلاف) باز نشد');
  ok(res.bal['ملت'] === 2260000, 'ملت: موجودی = ماندهٔ آخرین پیامک (' + res.bal['ملت'] + ')');
  ok(res.open['ملت'] === 2000000 && /موجودی اول مهر ملت طبق پیامک‌ها تنظیم شد/.test(res.sum), 'موجودی اول مهر ملت از زنجیرهٔ پیامک‌ها (۲٬۰۰۰٬۰۰۰) و گزارش در خلاصه');
  ok(res.rows.filter(r => /^e3:200000:ملت/.test(r)).length === 1 && res.rows.filter(r => /:300000:ملت/.test(r)).length === 1, 'تکراری قطعی و تکراریِ یک روز جابه‌جا دوباره ثبت نشدند');
  ok(res.rows.includes('i5:1000000:ملت') && !res.rows.some(r => /^i5:1000000:ملت:sms/.test(r)), 'ردیف «بدون حساب» با همان روز و مبلغ به حساب ملت وصل شد');
  ok(res.rows.includes('e12:50000:ملت:gap'), 'اختلاف بین دو پیامک → ردیف اختلاف خودکار (۵۰٬۰۰۰)');
  ok(res.rows.filter(r => /:70000:پاسارگاد من/.test(r)).length === 3 && res.bal['پاسارگاد من'] === 790000, 'یک روز جابه‌جای واقعاً جدا (طبق مانده) ثبت شد؛ پاسارگاد ' + res.bal['پاسارگاد من']);
  ok(res.accs.includes('ملی ۲۲۲۲') && res.melli === 'بانک ملی' && res.bal['ملی ۲۲۲۲'] === 950000, 'حساب تازهٔ «ملی ۲۲۲۲» خودکار با موجودی پیامک ساخته شد (' + res.bal['ملی ۲۲۲۲'] + ')');
  ok(res.bal['صادرات دوم'] === 1500000 && res.map['L4:4444'] === 'صادرات دوم', 'پوشهٔ صادرات → «صادرات دوم» و رقم‌ها برای دفعهٔ بعد آموخته شد');
  ok(/موجودی با پیامک بانک یکی است ✓/.test(res.sum) && !/کمتر از|بیشتر از/.test(res.sum) && /تراکنش ثبت شد/.test(res.sum) && /ردیف اختلاف/.test(res.sum), 'کارت خلاصه: تعدادها و «موجودی با پیامک بانک یکی است ✓»');
  await p.screenshot({ path: 'b1326_summary.png' });

  const und = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.hk-bulk-undo').click(); await w(300);
    const inc = periodData.income.sections[0].rows.find(r => r.desc === 'حقوق');
    let sms = 0; ['income', 'expense'].forEach(t => (periodData[t].sections || []).forEach(s => (s.rows || []).forEach(r => { if (r.fromSmsBulk || r.reconGap) sms++; })));
    return { accs: selectedAccountLabels(), bal: globalAccountBalances()['ملت'], inc: inc && inc.account, sms, ov: !!document.getElementById('smsBulkOv'), map: smsAccountBankMap['L4:4444'] || '' };
  });
  ok(!und.accs.includes('ملی ۲۲۲۲') && und.sms === 0 && und.inc === '' && und.map === '' && !und.ov, '«برگرداندن این ثبت»: ردیف‌ها، حساب تازه، وصل‌شدن‌ها و آموخته‌ها برگشتند');
  ok(und.bal === 5000000 - 200000 - 300000, 'موجودی ملت هم به قبل برگشت (' + und.bal + ')');

  const again = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const run = async () => {
      openSmsBulkModal(); await w(150); await hkBulkRead(); await w(1000);
      document.querySelector('.hk-bulk-allchk').click(); await w(50);
      const cards = [...document.querySelectorAll('.hk-bulk-folder')];
      cards.forEach((c, i) => { if (!_hkBulk.folders[i].account) { const ch = c.querySelector('.hk-bulk-chk'); ch.checked = false; ch.onchange(); } });
      document.querySelector('.hk-bulk-ok').click(); await w(600);
      const s = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
      document.querySelector('.hk-bulk-done').click(); await w(100);
      return s;
    };
    const s1 = await run(), s2 = await run();
    let gaps = 0; (periodData.expense.sections || []).forEach(s => (s.rows || []).forEach(r => { if (r.reconGap) gaps++; }));
    return { s1, s2, gaps, bal: globalAccountBalances()['ملت'] };
  });
  ok(/^۰ تراکنش ثبت شد/.test(again.s2) && !/ردیف اختلاف/.test(again.s2) && again.gaps === 1 && again.bal === 2260000, 'ثبت دوباره همان بازه: هیچ ردیف یا ردیف اختلاف تکراری اضافه نشد');

  console.log('• اشکال‌های کوچک');
  const ui = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const a = document.querySelector('#monthSelectWrap .dark-select-btn'), y = document.querySelector('#yearSelectWrap .dark-select-btn');
    out.arr = [a, y].map(e => e ? getComputedStyle(e, '::after').width : '');
    openBankAccountsModal(false); await w(200);
    const banks = document.getElementById('bankBanksScroll');
    const last = banks.lastElementChild;
    out.customLast = !!(last && last.querySelector('#bankCustomName'));
    document.getElementById('bankCustomAdd').click(); await w(100);
    out.noEditorEmpty = !document.getElementById('bankAddEditor');
    document.getElementById('bankCustomName').value = 'بانک آزمایشی';
    document.getElementById('bankCustomAdd').click(); await w(300);
    const ed = document.getElementById('bankAddEditor');
    out.editor = ed ? ed.textContent : '';
    out.name = ed ? ed.querySelector('#bankAddNameInput').value : '';
    out.manual = ed ? getComputedStyle(ed.querySelector('#bankAddBalInput')).display !== 'none' : false;
    if (ed) ed._hkClose();
    closeBankAccountsModal(); try { closeSideMenu(); } catch (e) {}
    /* درآمد ثابت: فلش همان لحظهٔ شروع بسته‌شدن برمی‌گردد */
    const row = document.createElement('div'); row.className = 'recurring-row rec-open'; row.style.cssText = 'height:120px';
    row.innerHTML = '<span class="rec-chev" style="transition:none"><svg viewBox="0 0 24 24"></svg></span>'; document.body.appendChild(row);
    hkSlideSet(row, false, o => { row.classList.toggle('rec-open', o); row.style.height = o ? '120px' : '30px'; });
    out.chev = getComputedStyle(row.querySelector('.rec-chev')).transform; out.stillOpen = row.classList.contains('rec-open');
    await w(550); out.closed = !row.classList.contains('rec-open') && !row.classList.contains('hk-shutting'); row.remove();
    return out;
  });
  ok(ui.arr[0] === '16px' && ui.arr[1] === '16px', 'فلش منوی ماه و سال همان شکل، بزرگ‌تر (۱۶px)');
  ok(ui.customLast && ui.noEditorEmpty, 'زیر فهرست بانک‌ها ردیف «بانک دیگر (نام دلخواه)»؛ بدون نام باز نمی‌شود');
  ok(/بانک آزمایشی/.test(ui.editor) && ui.name === 'آزمایشی' && ui.manual, 'نام دلخواه → ویرایشگر حساب با همان نام (بدون پیامک → کادر موجودی دستی)');
  ok(ui.chev === 'none' && ui.stillOpen && ui.closed, 'فلش درآمد ثابت همان لحظه برمی‌گردد و ردیف بعد از انیمیشن بسته می‌شود');

  const hb = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const box = document.querySelector('.home-box.hb-multi'); if (!box) return null;
    const track = box.querySelector('.hb-track'), W = box.clientWidth;
    const r = box.getBoundingClientRect(), cy = r.top + r.height / 2;
    const ev = (t, x, id) => box.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: cy, pointerId: id, button: 0, pointerType: 'touch' }));
    const n = track.querySelectorAll('.hb-slide:not(.hb-clone)').length;
    const res = [];
    for (let i = 0; i < 14; i++) {
      const x0 = r.left + W * 0.3;
      ev('pointerdown', x0, 50 + i); ev('pointermove', x0 + 20, 50 + i); ev('pointermove', x0 + 140, 50 + i); ev('pointerup', x0 + 140, 50 + i);
      await w(i % 3 === 0 ? 40 : 120);
    }
    await w(1000);
    const m = /translateX\((-?[\d.]+)px\)/.exec(track.style.transform);
    const pos = m ? Math.round(-parseFloat(m[1]) / W) : -1;
    return { pos, n };
  });
  ok(hb && hb.pos >= 1 && hb.pos <= hb.n, 'باکس منو بعد از ۱۴ کشیدن سریع پشت‌سرهم روی اسلاید واقعی است (نه خانهٔ خالی)');

  const sh = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const el = document.createElement('div'); el.style.cssText = 'position:fixed;left:20px;top:200px;width:300px;height:150px;'; el._spTitle = 'سارا'; document.body.appendChild(el);
    const btn = document.createElement('button'); btn.style.cssText = 'position:fixed;left:20px;top:600px;width:200px;height:60px;z-index:5'; let hits = 0; btn.onclick = () => hits++; document.body.appendChild(btn);
    spShowTodoTrash(el, { key: 'todo-x1' }); await w(50);
    const shield = document.querySelector('.sp-trash-shield');
    const at = (t, x, y) => document.elementFromPoint(x, y).dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9 }));
    const top = document.elementFromPoint(100, 630);
    at('pointerdown', 100, 630); at('pointerup', 100, 630);
    const ovGone = !el.querySelector('.sp-trash-ov');
    document.elementFromPoint(100, 630).click();   /* کلیکِ همان لمس */
    await w(450);
    const r1 = { shield: !!shield, coveredBtn: top === shield, closed: ovGone && !document.querySelector('.sp-trash-shield'), hits };
    spShowTodoTrash(el, { key: 'todo-x1' }); spShowTodoTrash(el, { key: 'todo-x1' }); await w(30);
    r1.single = document.querySelectorAll('.sp-trash-shield').length === 1;
    const tb = el.querySelector('.sp-trash-btn').getBoundingClientRect();
    at('pointerdown', tb.left + tb.width / 2, tb.top + tb.height / 2); at('pointerup', tb.left + tb.width / 2, tb.top + tb.height / 2);
    await w(450); r1.closed2 = !document.querySelector('.sp-trash-shield') && !el.querySelector('.sp-trash-ov');
    el.remove(); btn.remove();
    return r1;
  });
  ok(sh.shield && sh.coveredBtn && sh.closed && sh.hits === 0, 'سطل باکس هوشمند: لمس هر جای دیگر فقط لغو می‌کند (دکمهٔ زیرش زده نشد)');
  ok(sh.single && sh.closed2, 'باز شدن دوباره لایهٔ اضافه نمی‌سازد؛ لمس سطل هم لایه را می‌بندد');

  /* ---------- ب) حساب تازه از پیامک، همگام‌سازی، پاک‌سازی تکراری‌ها ---------- */
  console.log('• حساب تازه: موجودی از آخرین پیامک');
  const SMS_B = [
    { bank: 'ملت', acc: '1111', d: 4, t: 'e', a: 10000, b: 640000 },
    { bank: 'ملت', acc: '5555', d: 6, t: 'e', a: 20000, b: 1480000 },
    { bank: 'ملت', acc: '5555', d: 9, t: 'i', a: 20000, b: 1500000 }
  ];
  const q = await newPage(b, SMS_B); q.on('pageerror', e => errors.push(e.message));
  await q.goto(INDEX); await q.waitForTimeout(1800);
  const na = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openBankAccountsModal(false); await w(150);
    openBankNameEditor(null, -1, null, 'بانک ملت', 'ملت'); await w(300);
    const ed = document.getElementById('bankAddEditor'), bi = ed.querySelector('#bankAddBalInput');
    const out = { hidden: getComputedStyle(bi).display === 'none', chips: [...ed.querySelectorAll('.hk-card-chip')].map(c => c.textContent), note: (ed.querySelector('.bank-sms-bal') || {}).textContent || '' };
    ed.querySelector('#bankAddOk').click(); await w(100);
    out.blocked = selectedAccountLabels().length === 0 && !!document.getElementById('bankAddEditor');
    [...ed.querySelectorAll('.hk-card-chip')].find(c => /۵۵۵۵/.test(c.textContent)).click(); await w(50);
    out.val = bi.value; out.note2 = ed.querySelector('.bank-sms-bal').textContent;
    ed.querySelector('#bankAddOk').click(); await w(200);
    const acc = selectedBankAccounts[0] || {};
    out.acc = [acc.label, acc.openingBalance]; out.map = smsAccountBankMap['L4:5555'];
    openBankNameEditor(null, -1, null, 'بانک تجارت', 'تجارت'); await w(300);
    const ed2 = document.getElementById('bankAddEditor');
    out.manual = getComputedStyle(ed2.querySelector('#bankAddBalInput')).display !== 'none' && !ed2.querySelector('.bank-sms-bal');
    ed2._hkClose();
    return out;
  });
  ok(na.hidden && na.chips.length === 2 && /کارت این حساب را انتخاب کنید/.test(na.note), 'چند کارت ملت در پیامک‌ها → کادر دستی پنهان و انتخاب کارت با رقم‌های آخر');
  ok(na.blocked, 'بدون انتخاب کارت، حساب ساخته نمی‌شود');
  ok(na.val === '۱,۵۰۰,۰۰۰' && /کارت ۵۵۵۵/.test(na.note2) && na.acc[1] === 1500000 && na.map === na.acc[0], 'کارت ۵۵۵۵ → موجودی آخرین پیامک (۱٬۵۰۰٬۰۰۰) و رقم‌ها برای همین حساب آموخته شد');
  ok(na.manual, 'بانکی که پیامک ندارد → همان کادر موجودی دستی');

  console.log('• همگام‌سازی با آخرین پیامک');
  const sy = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const acc = selectedBankAccounts[0], lb = acc.label;
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '10', desc: 'خرید', amount: 100000, status: 'paid', account: lb })] }];
    persistCurrent(); saveArchive(); renderAll();
    const before = globalAccountBalances()[lb];
    openBankNameEditor(acc, 0, null); await w(200);
    const btn = document.querySelector('#bankAddEditor .bank-sync-btn');
    btn.click(); await w(300);
    const ask = (document.getElementById('hkAsk3') || {}).innerText || '';
    [...document.querySelectorAll('#hkAsk3 button')].find(x => x.textContent === 'همگام کن').click(); await w(300);
    const after = globalAccountBalances()[lb];
    document.getElementById('bankAddEditor')._hkClose();
    return { btn: !!btn, ask, before, after };
  });
  ok(sy.btn && /۱,۴۰۰,۰۰۰/.test(sy.ask) && /۱,۵۰۰,۰۰۰/.test(sy.ask), 'دکمهٔ «همگام‌سازی با آخرین پیامک» قبل/بعد را نشان می‌دهد');
  ok(sy.before === 1400000 && sy.after === 1500000, 'بعد از تأیید، موجودی حساب = ماندهٔ آخرین پیامک (' + sy.after + ')');

  console.log('• پاک‌سازی تکراری‌های قدیمی');
  const dc = await q.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const lb = selectedBankAccounts[0].label;
    const R = (tab, d, desc, a, x) => Object.assign(emptyRow(tab), { day: String(d), desc, amount: a, status: 'paid', account: lb }, x || {});
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [R('expense', 4, 'نان', 80000), R('expense', 5, '', 80000, { fromSmsBulk: true }), R('expense', 9, 'بنزین', 80000), R('expense', 20, 'کتاب', 45000)] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [R('income', 9, 'حقوق', 300000, { createdAt: 1 }), R('income', 9, 'حقوق مهر', 300000, { createdAt: 2 })] }];
    persistCurrent(); saveArchive(); loadTrash(); const t0 = trashItems.length;
    openDupCleanup(); await w(150);
    const rows = [...document.querySelectorAll('#hkDupOv .hk-dup-row')].map(r => r.innerText.replace(/\n/g, ' | '));
    document.querySelector('#hkDupOv .hk-dup-go').click(); await w(300);
    loadTrash();
    return { rows, trash: trashItems.length - t0, exp: periodData.expense.sections[0].rows.map(r => r.desc || '-'), inc: periodData.income.sections[0].rows.map(r => r.desc), ov: !!document.getElementById('hkDupOv') };
  });
  ok(dc.rows.length === 2 && /حذف: .*بی‌شرح، از پیامک/.test(dc.rows.join(' ')), 'دو جفت مشکوک با تیک پیدا شد (ردیف پیامکیِ بی‌شرح برای حذف)');
  ok(dc.trash === 2 && dc.exp.join(',') === 'نان,بنزین,کتاب' && dc.inc.join(',') === 'حقوق' && !dc.ov, 'حذف انتخاب‌شده‌ها → سطل زباله؛ ردیف‌های دیگر دست‌نخورده');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
