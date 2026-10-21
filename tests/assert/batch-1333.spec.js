// نسخهٔ ۱.۳.۳۳: ترمیم قسط‌ها (ردیف معمولیِ قبلی که پرداخت قسط بود)، کارت مقصد ثبت گروهی (همیشه، پیش‌فرض کارت اول، بی کارت تازه)،
// پخش‌کنندهٔ صدا، عکس تمام‌صفحه و × بزرگ‌تر، دایره فقط بعد از عکس، انتخاب از گالری با انتخابگر اندروید، کادر «جستجو»،
// جدول‌های ۱۱ردیفی با فاصله از لبه و عنوان وسط‌چین، نوشته‌های باکس هوشمند (خوانا، بی بیرون‌زدگی). فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts) => ({ address: 'Bank Melli', date: ts, body });

async function page(b, inbox, opts) {
  opts = opts || {};
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript((keep) => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].concat(keep ? [] : ['instRepair1335']).forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
  }, !!opts.keepRepair);
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox || [])}.sort((a, b) => b.date - a.date);
    window.__media = { photo: null, pick: null, mic: { granted: true }, pend: null };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) },
      HkMedia: {
        takePhoto: () => new Promise((res, rej) => { window.__media.pend = { res, rej }; }),
        pickImage: () => window.__media.pick ? Promise.resolve(window.__media.pick) : Promise.reject(new Error('cancelled')),
        micPermission: () => Promise.resolve(window.__media.mic), openAppSettings: () => Promise.resolve()
      }
    } };` });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];

  /* ---------- اندروید ---------- */
  console.log('• بخش اندرویدی');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/public void pickImage\(PluginCall call\)/.test(patch) && /ACTION_GET_CONTENT/.test(patch) && /ImageDecoder\.decodeBitmap/.test(patch) && /setTargetSize/.test(patch) && /inSampleSize=ss/.test(patch), 'انتخاب از گالری با انتخابگر اندروید: HEIC/عکس خیلی بزرگ با ImageDecoder (کوچک‌شده هنگام خواندن) و BitmapFactory برای نسخه‌های قدیمی');

  /* ---------- ثبت گروهی: ردیف معمولیِ قبلی که پرداخت قسط بود + کارت مقصد ---------- */
  console.log('• ثبت گروهی: تبدیل ردیف معمولی به قسط و کارت مقصد');
  const inbox1 = [melli('بانك ملي ايران\nبرداشت:11,904,000-\nحساب:62002\nمانده:88,096,000\n0520-10:00', T(2026, 8, 11, 7))];
  const p1 = await page(b, inbox1); p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(INDEX); await p1.waitForTimeout(1600);
  const bi = await p1.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 1, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    periodData.income.sections = [{ id: 'i1', title: 'سارا', rows: [emptyRow('income')] }];
    plans.push({ id: 'pa', name: 'وام الف', count: 12, paidCount: 4, amount: 7142856 /* 595238 × 12 */, startYear: 1405, startMonth: 1, startDay: 20, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    persistCurrent();
    /* مرداد: ردیف قسطِ دستی پرداخت‌شده (بی‌بانک) + ردیف معمولیِ بی‌شرح از ثبت گروهیِ نسخهٔ قبل؛ عنوان کارت با نیم‌فاصله (املای دیگر) */
    const pr = Object.assign(emptyRow('expense'), { day: '20', desc: 'قسط ۵', amount: 595238, status: 'paid', account: '', fromPlanId: 'pa', fromPlanIndex: 4 });
    const plain = Object.assign(emptyRow('expense'), { day: '20', desc: '', amount: 1190400, status: 'paid', account: 'ملی', fromSmsBulk: true });
    archive['1405-5'] = { income: { sections: [] }, expense: { sections: [{ id: 's9', title: 'سا‌را', rows: [pr, plain] }] } };
    saveArchive();
    openSmsBulkModal(); await w(150);
    const out = {};
    const cw = document.getElementById('hkBulkCardWrap');
    out.cardShown = !!cw && getComputedStyle(cw).display !== 'none';
    out.cardVal = hkBulkCardTitle();
    const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select');
    [...sels[1]._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === '5').click(); await w(50);
    await hkBulkRead(); await w(1000);
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(900);
    out.sum = (document.querySelector('.hk-bulk-sum') || {}).innerText || '';
    const secs = archive['1405-5'].expense.sections;
    out.secTitles = secs.map(s => s.title);
    const rows = secs.flatMap(s => s.rows).filter(x => x.amount);
    out.rows = rows.map(x => (x.fromPlanId || '-') + ':' + x.fromPlanIndex + ':' + x.account + ':' + (x.smsLinked ? 'L' : '') + ':' + (isPreAppPlanRow(x, 1405, 5) ? 'pre' : ''));
    out.noUser = !Object.keys(archive).some(k => (archive[k].expense.sections || []).some(s => s.title === 'نام کاربر'));
    return out;
  });
  /* ۱.۳.۴۶ تک‌کاربره: منوی کارت مقصد پنهان و روی کارت اصلی */ ok(!bi.cardShown && !!bi.cardVal, 'منوی کارت مقصد پنهان است و ثبت روی کارت اصلی می‌رود (' + bi.cardVal + ')');
  /* ۱.۳.۳۷: ثبت گروهی دیگر ردیف معمولی را به قسط تبدیل نمی‌کند: همان ردیف معمولی (تکراری) می‌ماند و ردیف قسط دست نمی‌خورد */
  /* ۱.۳.۴۶: اقساط خاموش؛ ردیف قسط ساخته نمی‌شود */ ok(bi.rows.some(x => /^-:undefined:ملی::$/.test(x)) && !/به قسطش وصل شد/.test(bi.sum), 'ردیف معمولیِ ۱٬۱۹۰٬۴۰۰ سر جایش ماند (تکراری) و به قسط وصل نشد (' + bi.rows.join(' | ') + ')');
  ok(bi.secTitles.length === 1 && bi.noUser, 'عنوان کارت با املای دیگر همان کارت شناخته شد؛ کارت تازه یا «نام کاربر» ساخته نشد');

  /* ---------- ۱.۳.۳۷: ترمیم قسط‌ها برداشته شد؛ «بررسی تکراری‌ها» مستقیم فقط تکراری‌ها ---------- */
  console.log('• بی پنجرهٔ ترمیم قسط');
  const p2 = await page(b, [], { keepRepair: true }); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(INDEX); await p2.waitForTimeout(1200);
  const rp = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    plans.push({ id: 'pa', name: 'وام الف', count: 12, paidCount: 6, amount: 7142856, startYear: 1405, startMonth: 1, startDay: 20, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    const pl = (amt, day) => Object.assign(emptyRow('expense'), { day: String(day), desc: '', amount: amt, status: 'paid', account: 'ملی ۲۰۰۲' });
    archive['1405-6'] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سارا', rows: [pl(600000, 23), pl(595591, 23)] }] } };
    persistCurrent(); saveArchive();
    openDupCleanup(); await w(150);
    const out = { repairDlg: !!document.getElementById('hkInstRepOv'), fns: typeof hkInstallmentRepair + '|' + typeof hkUndoWrongInstallmentLinks };
    out.plain = archive['1405-6'].expense.sections.flatMap(s => s.rows).filter(x => x.amount && !x.fromPlanId).length;
    if (document.getElementById('hkDupOv')) document.getElementById('hkDupOv').remove();
    return out;
  });
  ok(!rp.repairDlg && rp.fns === 'undefined|undefined' && rp.plain === 2, '«بررسی تکراری‌ها» دیگر پنجرهٔ ترمیم قسط باز نمی‌کند و ردیف‌های معمولی دست نمی‌خورند');

  /* ---------- پیوست ---------- */
  console.log('• پیوست: پخش صدا، عکس، دایره، گالری');
  const p3 = await page(b, []); p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(INDEX); await p3.waitForTimeout(1400);
  const at = await p3.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const c = document.createElement('canvas'); c.width = 800; c.height = 500; const g = c.getContext('2d'); g.fillStyle = '#e8c'; g.fillRect(0, 0, 800, 500);
    const img = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
    const sr = 8000, n = sr * 3, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    await HKAttach.put('i1', img); await HKAttach.put('a1', new Blob([buf], { type: 'audio/wav' }));
    const row = Object.assign(emptyRow('expense'), { desc: 'خرید', amount: 1000, att: [{ id: 'i1', kind: 'img', size: img.size, at: 1 }, { id: 'a1', kind: 'aud', size: 1000, at: 2, dur: 3 }] });
    openRowAttachments(row); await w(600);
    const out = {};
    const pill = document.querySelector('#hkAttachOv .hk-att-item.aud');
    out.pill = !!pill && !pill.querySelector('audio[controls]') && !!pill.querySelector('.hk-aud-play') && !!pill.querySelector('.hk-aud-sep') && pill.lastElementChild.classList.contains('hk-att-del');
    out.t0 = pill.querySelector('.hk-aud-time').textContent;
    const xi = document.querySelector('#hkAttachOv .hk-att-item:not(.aud) .hk-att-del').getBoundingClientRect(), xa = pill.querySelector('.hk-att-del').getBoundingClientRect();
    out.xAlign = Math.abs(xi.left - xa.left) <= 2 && Math.abs(xi.width - xa.width) <= 2 && xi.width >= 32;
    pill.querySelector('.hk-aud-play').click(); await w(1300);
    out.t1 = pill.querySelector('.hk-aud-time').textContent; out.fill = parseFloat(pill.querySelector('.hk-aud-fill').style.width) || 0;
    pill.querySelector('.hk-aud-play').click();
    /* عکس تمام‌صفحه، بی‌فاصله */
    document.querySelector('#hkAttachOv .hk-att-media img').click(); await w(300);
    const vi = document.querySelector('#hkImgView img').getBoundingClientRect(), vx = document.querySelector('#hkImgView .hk-img-x').getBoundingClientRect();
    out.view = [Math.round(vi.width), Math.round(vi.height), getComputedStyle(document.querySelector('#hkImgView img')).objectFit, Math.round(vx.width)];
    document.querySelector('#hkImgView .hk-img-x').click(); await w(100);
    /* دوربین: تا عکس برنگشته دایره‌ای نیست */
    document.querySelector('#hkAttachOv .hk-att-cam').click(); await w(300);
    out.ringBefore = !!document.querySelector('#hkAttachOv .hk-att-loading');
    const cc = document.createElement('canvas'); cc.width = 400; cc.height = 300; cc.getContext('2d').fillRect(0, 0, 400, 300);
    window.__media.pend.res({ data: cc.toDataURL('image/jpeg', 0.8).split(',')[1], mime: 'image/jpeg' });
    let sawRing = false; const t0 = performance.now();
    while (performance.now() - t0 < 1500) { await new Promise(r => requestAnimationFrame(r)); if (document.querySelector('#hkAttachOv .hk-att-loading')) sawRing = true; }
    out.ringAfter = sawRing;
    out.n1 = row.att.length;
    /* گالری با انتخابگر اندروید */
    window.__media.pick = { data: cc.toDataURL('image/jpeg', 0.8).split(',')[1], mime: 'image/jpeg' };
    document.querySelectorAll('#hkAttachOv .hk-att-btn')[1].click(); await w(1500);
    out.n2 = row.att.length;
    hkCloseAttach();
    return out;
  });
  ok(at.pill, 'صدا: پخش‌کنندهٔ ساده داخل قرص (پخش، نوار، زمان، جداکننده و × در انتهای چپ)');
  ok(at.xAlign, '× صدا هم‌راستا و هم‌اندازهٔ × عکس (بزرگ‌تر از قبل)');
  ok(at.t0 === '۰:۰۰ / ۰:۰۳' && at.t1.indexOf('۰:۰۱ / ۰:۰۳') === 0 && at.fill > 20 && at.fill < 80, 'نوار صدا از اولین پخش ثانیه‌به‌ثانیه جلو می‌رود و طول از مدت ضبط است (' + at.t0 + ' → ' + at.t1 + ')');
  ok(at.view[0] === 412 && at.view[1] === 915 && at.view[2] === 'contain' && at.view[3] >= 44, 'عکس در نمایش بزرگ لبه‌به‌لبه (بی‌فاصله، کامل دیده می‌شود) و × بزرگ‌تر');
  ok(!at.ringBefore && at.ringAfter && at.n1 === 3, 'دایرهٔ بارگذاری فقط بعد از برگشتن عکس از دوربین، نه پیش از باز شدن دوربین');
  ok(at.n2 === 4, '«انتخاب از گالری» با انتخابگر اندروید عکس را اضافه کرد');

  /* ---------- جستجو و جدول‌ها ---------- */
  console.log('• جستجو: کادر «جستجو»، جدول‌های ۱۱ ردیفی');
  const sr = await p3.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: Array.from({ length: 18 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: i % 3 ? 'خرید نان و شیر از فروشگاه محله' : 'بنزین', amount: 150000 * (i + 1), status: 'paid' })) }];
    periodData.income.sections = [{ id: 'i1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 40000000, status: 'paid' })] }];
    persistCurrent(); renderAll();
    openPersonDetail('سارا', 'balance'); await w(600);
    document.getElementById('balanceSearchAmtMin').value = '1'; renderBalanceSearch(); bsRenderMonthSummary(window._bsLastList || [], 'all'); await w(200); /* ۱.۳.۳۶: جدول ماه‌ها از منوی جستجو برداشته شد؛ آزمون خود جدول و پنجرهٔ جزئیات مستقیم */ 
    const out = {};
    const hd = document.querySelector('#balanceFixedHeader .bs-search-head'), fh = document.getElementById('balanceFixedHeader');
    out.head = hd && getComputedStyle(hd).display !== 'none' ? hd.textContent : '';
    out.card = parseFloat(getComputedStyle(fh).borderTopLeftRadius) >= 8 && getComputedStyle(fh).borderTopStyle === 'solid';
    out.thC = [...document.querySelectorAll('#searchResultBox th, #searchMonthSummary th')].every(th => getComputedStyle(th).textAlign === 'center');
    document.querySelector('#searchMonthSummary .bs-mrow').click(); await w(400);
    const sc = [...document.querySelectorAll('#bsMonthDetail .hk-scroll11')];
    const vis = el => { const r = el.getBoundingClientRect(), tb = el.querySelector('thead').getBoundingClientRect(); return [...el.querySelectorAll('tbody tr')].filter(tr => { const q = tr.getBoundingClientRect(); return q.top >= tb.bottom - 1 && q.bottom <= r.bottom + 1; }).length; };
    out.frames = document.querySelectorAll('#bsMonthDetail .hk-tframe').length;
    out.expVis = vis(sc[1]); out.expScroll = sc[1].scrollHeight > sc[1].clientHeight;
    out.cats = !!document.querySelector('#bsMonthDetail .hk-tframe table.bmd-cats');
    const td = document.querySelector('#bsMonthDetail tbody td'), th = document.querySelector('#bsMonthDetail thead th');
    out.pad = parseFloat(getComputedStyle(td).paddingLeft) >= 8 && parseFloat(getComputedStyle(td).paddingRight) >= 8;
    out.thMid = [...document.querySelectorAll('#bsMonthDetail th')].every(x => getComputedStyle(x).textAlign === 'center');
    bsCloseMonthDetail();
    return out;
  });
  ok(sr.head === 'جستجو' && sr.card, 'فیلترهای جستجو داخل کادر گرد با عنوان «جستجو» (مثل سایر منوها)');
  ok(sr.frames === 3 && sr.cats, 'جزئیات ماه: درآمدها، مخارج و جمع هر دسته هر کدام جدولِ کادردار');
  ok(sr.expVis === 11 && sr.expScroll, 'جدول ۱۸ ردیفی فقط ۱۱ ردیف اول را نشان می‌دهد و بقیه داخل جدول اسکرول می‌شود');
  ok(sr.pad && sr.thMid && sr.thC, JSON.stringify([sr.pad, sr.thMid, sr.thC]) + ' متن خانه‌ها از لبه فاصله دارد و عنوان ستون‌ها وسط‌چین است');

  /* ---------- باکس هوشمند ---------- */
  /* از ۱.۳.۴۷ اسلاید اقساط (تعهدات) برداشته شد */
  if (false) {
  console.log('• باکس هوشمند: اندازهٔ خوانا، بی بیرون‌زدگی');
  const sp = await p3.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closePersonDetail && closePersonDetail();
    plans.length = 0;
    ['وام مسکن بانک ملی شعبهٔ مرکزی تهران', 'وام خودرو', 'قسط گوشی موبایل'].forEach((nm, i) => plans.push({ id: 'q' + i, name: nm, count: 12, paidCount: 6, amount: 5952380 + i, startYear: 1405, startMonth: 1, startDay: 22 + i, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: i + 1 }));
    try { syncPlansToExpenseAll(); } catch (e) {}
    persistCurrent(); renderAll(); try { renderHomeCards(); } catch (e) {}
    await w(500);
    const el = [...document.querySelectorAll('.sp-panel')].find(x => x._spTitle === 'سارا') || document.querySelector('.sp-panel');
    const st = _smartPanelState[el._spTitle]; st.key = 'obligations'; st.nextAt = Date.now() + 99999; st.pausedUntil = Date.now() + 99999;
    mountSmartPanel(el, el._spTitle); fitSmartPanel(el); await w(300);
    const pg = el.querySelector('.sp-page:not(.sp-out)');
    const out = { key: pg.className, fs: parseFloat(pg.style.getPropertyValue('--sp-fs') || '1') };
    const pr = pg.getBoundingClientRect();
    out.wOver = [...pg.querySelectorAll('.sp-l, .sp-v, .sp-t, .sp-tip')].some(c => c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().right > pr.right + 1 || c.getBoundingClientRect().left < pr.left - 1);
    out.hOver = pg.scrollHeight > pg.clientHeight + 1;
    const fr = pg.querySelector('.sp-free'); out.scrolls = !!fr && fr.scrollHeight > fr.clientHeight;
    out.wrapped = [...pg.querySelectorAll('.sp-l')].some(c => c.getBoundingClientRect().height > parseFloat(getComputedStyle(c).lineHeight) * 1.5);
    out.minPx = Math.min(...[...pg.querySelectorAll('.sp-l, .sp-v')].map(c => parseFloat(getComputedStyle(c).fontSize)));
    return out;
  });
  ok(/sp-k-obligations/.test(sp.key) && !sp.wOver && !sp.hOver, 'اسلاید تعهدات با سه وام: هیچ نوشته‌ای از عرض یا ارتفاع اسلاید بیرون نمی‌زند');
  ok(sp.wrapped && sp.scrolls, 'اسم طولانی به سطر بعد می‌رود و محتوای اضافه داخل اسلاید اسکرول عمودی می‌شود');
  ok(sp.fs >= 0.9 && sp.minPx >= 9.5, 'نوشته‌ها ریز نمی‌شوند (کمینهٔ خوانا: ' + sp.minPx.toFixed(1) + 'px)');

  }
  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
