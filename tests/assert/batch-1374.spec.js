// ۱.۳.۷۴: منوی همبرگری باکسی (ترتیب و اسم‌های تازه، جستجوی ثابت، پروفایل با عکس و اسم قابل ویرایش)؛ خط تاریخ بالای کارت؛
// کارت‌های قسط (پیامک «واریز قسط»: تاریخچه، پیش‌پرداخت، معوق، اسلاید، بیرون از موجودی، انتقال ردیف‌های اشتباه قبلی)؛
// حساب‌های مسدود شده؛ راهنمای بانک زیر اسم حساب و ردیف عنوان جدول حساب؛ «یادآور» در «+» باکس هوشمند.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const sms = (amt, dt, to, n, ov, pen, tr) => `بانک مسکن\nواريز قسط به مبلغ:${amt}ريال\nزمان:${dt}\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-${to}\nتعداد اقساط پرداختي :${n}\nمانده معوق :${ov}\nمانده جريمه :${pen}\nشماره پيگيري:${tr}`;

(async () => {
  const b = await chromium.launch();

  console.log('• منوی همبرگری');
  for (const th of ['dark', 'light']) {
    const A = await fresh(b, th);
    const m = await A.page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      openSideMenu(); await w(400);
      const groups = [...document.querySelectorAll('#menuDropdown .hk-mg')].map(g => ({
        t: g.querySelector('.menu-section-label').textContent.trim(),
        items: [...g.querySelectorAll('.hk-mg-box > .menu-item, .hk-mg-box > .menu-theme-row')].filter(x => x.style.display !== 'none').map(x => (x.classList.contains('menu-theme-row') ? x.querySelector('span').textContent : x.textContent).trim())
      }));
      const box = document.querySelector('#menuDropdown .hk-mg-box'), menu = document.getElementById('menuDropdown');
      const bg = getComputedStyle(box).backgroundColor, mbg = getComputedStyle(menu).backgroundColor;
      const items = [...box.children].filter(x => x.style.display !== 'none');
      const lines = items.slice(1).every(x => parseFloat(getComputedStyle(x).borderTopWidth) >= 1) && parseFloat(getComputedStyle(items[0]).borderTopWidth) === 0;
      const lab = document.querySelector('#menuDropdown .hk-mg .menu-section-label').getBoundingClientRect(), br = box.getBoundingClientRect();
      const icons = [...document.querySelectorAll('#menuDropdown .hk-mg-box .hk-mi')].length;
      const resets = /پاک کردن/.test(menu.textContent);
      /* جستجو ثابت پایین */
      const sw = document.querySelector('#menuDropdown .hk-msearch-wrap'), sc = document.querySelector('#menuDropdown .menu-scroll');
      const s0 = sw.getBoundingClientRect().top; sc.scrollTop = 9999; await w(50); const s1 = sw.getBoundingClientRect().top;
      const field = document.querySelector('#menuDropdown .hk-msearch'), fr = getComputedStyle(field);
      const order = [...field.children].map(x => x.tagName === 'INPUT' ? 'in' : x.classList.contains('hk-msearch-mic') ? 'mic' : 'ic');
      const ic = field.querySelector('.hk-msearch-ic').getBoundingClientRect(), mic = field.querySelector('.hk-msearch-mic').getBoundingClientRect();
      const inp = document.getElementById('menuSearchInput'); inp.value = 'پشتیبان'; hkMenuSearch('پشتیبان'); await w(50);
      const res = [...document.querySelectorAll('#menuSearchRes .hk-sr-item')].map(x => x.querySelector('span:not(.hk-sr-path)').textContent);
      const hidden = getComputedStyle(document.querySelector('#menuDropdown .hk-mg')).display === 'none';
      const clrShown = getComputedStyle(field.querySelector('.clr')).display !== 'none' && getComputedStyle(field.querySelector('.mic')).display === 'none';
      inp.value = 'تنظیمات'; hkMenuSearch('تنظیمات'); await w(30);
      const byGroup = document.querySelectorAll('#menuSearchRes .hk-sr-item').length;
      hkMenuSearchMic(); await w(30);
      const cleared = inp.value === '' && !document.querySelector('.menu-scroll.hk-searching') && getComputedStyle(document.querySelector('#menuDropdown .hk-mg')).display !== 'none';
      return { groups, bg, mbg, lines, labelAbove: lab.bottom <= br.top + 1, icons, resets, pinned: Math.abs(s0 - s1) < 1, radius: parseFloat(fr.borderRadius), order, icRight: ic.left > mic.left, res, hidden, clrShown, byGroup, cleared };
    });
    const G = m.groups.map(g => g.t).join('|');
    ok(G === 'بخش‌ها|حساب‌ها و پیامک|پشتیبان و داده|گزارش‌ها|تنظیمات|درباره', th + ': ترتیب منوهای اصلی (' + G + ')');
    const it = t => (m.groups.find(g => g.t === t) || { items: [] }).items.join('|');
    /* ۱.۴.۰: «یادآور» به بخش‌ها برگشت (به خواست کاربر) */
    ok(it('بخش‌ها') === 'درآمدهای ثابت|پروژه‌ها|قرض|دُنگ|پس‌انداز (ارز و طلا)|یادآور', th + ': بخش‌ها: ' + it('بخش‌ها'));
    ok(/^پیامک‌های ثبت‌نشده/.test(it('حساب‌ها و پیامک')) && /\|ثبت تکی و گروهی پیامک‌ها\|انتخاب حساب بانکی\|حساب‌های مسدود شده$/.test(it('حساب‌ها و پیامک')), th + ': حساب‌ها و پیامک: ' + it('حساب‌ها و پیامک'));
    ok(it('پشتیبان و داده') === 'پشتیبان‌گیری|بازیابی از پشتیبان|سطل زباله', th + ': پشتیبان و داده');
    ok(it('گزارش‌ها') === 'آمار|ماهی که گذشت|خروجی (اکسل / PDF)', th + ': گزارش‌ها');
    ok(/^امنیت و قفل برنامه\|شخصی‌سازی\|حالت شب \/ روز/.test(it('تنظیمات')), th + ': تنظیمات: امنیت، شخصی‌سازی و کلیدهای روشن/خاموش (' + it('تنظیمات') + ')');
    ok(it('درباره') === 'راهنما', th + ': درباره: راهنما + نسخه');
    ok(!m.resets && JSON.stringify(m.groups).split('یادآور').length === 2, th + ': «پاک کردن این ماه/همه» در منو نیست؛ «یادآور» فقط یک بار (در بخش‌ها)');
    ok(m.bg !== m.mbg && m.labelAbove && m.lines && m.icons >= 18, th + ': هر منو یک باکس با رنگ جدا، اسم بالای باکس، خط بین گزینه‌ها، آیکون رنگی');
    ok(m.pinned && m.radius >= 12 && m.radius < 20 && m.order.join(',') === 'ic,in,mic' && m.icRight, th + ': جستجو پایین ثابت، گوشه‌گرد مثل باکس‌ها (نه بیضی)، ذره‌بین راست و میکروفون چپ');
    ok(m.hidden && m.res.length >= 2 && m.res.indexOf('پشتیبان‌گیری') >= 0 && m.res.indexOf('آمار') < 0 && m.clrShown, th + ': جستجو: فقط نتیجه‌ها، با ✕ به‌جای میکروفون (' + m.res.join('، ') + ')');
    ok(m.byGroup >= 3 && m.cleared, th + ': جستجو با اسم دسته؛ ✕ همه را برمی‌گرداند');
    await A.ctx.close();
  }

  console.log('• پروفایل منو');
  const R = await fresh(b);
  const pr = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(300);
    const old = hkMainTitle();
    const av0 = document.getElementById('menuUserAvatar').textContent.trim()[0];
    hkAvatarMenu(document.getElementById('menuUserAvatar')); await w(50);
    const pop0 = [...document.querySelectorAll('#hkAvPop button')].map(x => x.textContent).join('|');
    document.getElementById('hkAvPop')._hkCancel();
    const c = document.createElement('canvas'); c.width = 400; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#e33'; g.fillRect(0, 0, 400, 240);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const url = await new Promise(r => hkAvatarFromFile(blob, r));
    localStorage.setItem(STORAGE_KEY + '_avatar', url); hkRenderMenuProfile();
    const img = document.querySelector('#menuUserAvatar img');
    const dims = await new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = url; });
    hkAvatarMenu(document.getElementById('menuUserAvatar')); await w(50);
    const pop1 = [...document.querySelectorAll('#hkAvPop button')].map(x => x.textContent).join('|');
    document.querySelector('#hkAvPop .del').click(); await w(50);
    const removed = !document.querySelector('#menuUserAvatar img') && !localStorage.getItem(STORAGE_KEY + '_avatar');
    /* ۱.۳.۸۰: ویرایش اسم فقط با باکس پروفایل باز */
    hkToggleProfile(true); await w(50);
    hkNameEditStart(); await w(50);
    const inp = document.querySelector('#menuUserNameText input');
    const inline = !!inp && !document.querySelector('.person-edit-sheet');
    inp.value = 'سارا آزمون'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await w(200);
    return { old, av0, pop0, pop1, img: !!img, dims, removed, inline, now: hkMainTitle(), shown: document.querySelector('#menuUserNameText .hk-mprof-t').textContent, sec: !!findSectionByTitle('expense', 'سارا آزمون') };
  });
  ok(pr.av0 === pr.old.trim()[0] && pr.pop0 === 'انتخاب عکس', 'بی عکس: حرف اول اسم؛ زدن عکس → «انتخاب عکس»');
  ok(pr.img && pr.dims[0] === 512 && pr.dims[1] === 512 && pr.pop1 === 'تغییر عکس|حذف عکس' && pr.removed, 'عکس مربعی ۵۱۲×۵۱۲ (برش و فشرده)؛ منو «تغییر عکس / حذف عکس»؛ حذف کار می‌کند');
  ok(pr.inline && pr.now === 'سارا آزمون' && pr.shown === 'سارا آزمون' && pr.sec, 'زدن اسم: همان‌جا ویرایش؛ Enter نام کاربر را عوض می‌کند (' + pr.now + ')');
  await R.ctx.close();

  console.log('• کارت‌های قسط');
  const S = [sms('18,500,000', '1405/07/06-10:11', '1037', 11, 0, 0, '90011'), sms('18,500,000', '1405/08/06-09:05', '1037', 12, 0, 0, '90012'), sms('2,000,000', '1405/08/12-11:40', '1037', 12, 0, 0, '90013'),
    sms('21,652,000', '1405/08/06-14:02', '4412', 22, '20,000,000', '1,500,000', '90021'), sms('21,652,000', '1405/08/06-08:30', '2979', 36, 0, 0, '90031')];
  const I = await fresh(b);
  const ins = await I.page.evaluate(async (S) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), inc = findSectionByTitle('income', t);
    /* ردیف اشتباه قدیمی: همان پیامک قبلاً «درآمد» ثبت شده بود */
    inc.rows = [Object.assign(emptyRow('income'), { id: 'wr1', day: '6', desc: 'واریز', amount: 1850000, status: 'paid' }), Object.assign(emptyRow('income'), { id: 'ok1', day: '6', desc: 'حقوق', amount: 30000000, status: 'paid' })];
    persistCurrent(); touchLocal(); await saveArchive(); renderAll();
    const p = hkParseInstallSms(S[2]);
    const rIn = parseBankSms(S[0]);
    S.forEach(x => enqueueBankSms(x)); enqueueBankSms(S[1]);
    await w(900);
    const st = id => { const c = hkInstCards().find(x => x.id === id); const s = hkInstStatus(c); return { st: s.st, pre: s.pre, count: s.count, n: c.log.length, kinds: hkInstEntries(c).map(e => e.kind).join(',') }; };
    const out = { p, rIn, confirm: isSmsConfirmOpen(), c1037: st('1037'), c4412: st('4412'), c2979: st('2979'), incAfter: findSectionByTitle('income', t).rows.length };
    out.mig = hkInstMigrateFind().map(x => x.row.id);
    /* اسلاید */
    _smartPanelState[t] = { key: 'inst', pausedUntil: Date.now() + 60000, nextAt: Date.now() + 60000 }; renderHomeCards(); await w(600);
    const pg = document.querySelector('#homeSmartBox .sp-page.sp-k-inst');
    out.slide = pg ? [...pg.querySelectorAll('.sp-inst-r')].map(r => r.getAttribute('data-inst') + ':' + r.textContent.replace(/\s+/g, ' ').trim()) : [];
    out.slideBad = !!(pg && pg.querySelector('.sp-inst-r.bad .hk-inst-dot'));
    const el = document.querySelector('#homeSmartBox .pc-smart-box'); const page = el._spPages.find(x => x.key === 'inst');
    page.onTap(t, pg.querySelector('[data-inst="2979"] b')); await w(200);
    out.histTitle = (document.querySelector('#hkInstOv .hk-bulk-title') || {}).textContent;
    document.getElementById('hkInstOv')._hkCancel();
    hkOpenInstHistory('1037'); await w(200);
    const ov = document.getElementById('hkInstOv');
    out.head = [...ov.querySelectorAll('.hk-acctx-h span')].map(x => x.textContent).join('|');
    out.rows = [...ov.querySelectorAll('.hk-inst-r:not(.hk-acctx-h)')].map(r => [...r.children].map(c => c.textContent.trim()).join(' / '));
    ov._hkCancel();
    hkOpenInstHistory('4412'); await w(100);
    out.warn = (document.querySelector('#hkInstOv .hk-inst-warn') || {}).textContent || '';
    document.getElementById('hkInstOv')._hkCancel();
    /* انتخاب حساب */
    openBankAccountsModal(); await w(300);
    out.accSec = ((document.querySelector('#bankSelectedScroll .hk-acc-fold b') || {}).textContent) || ''; /* ۱.۳.۷۵: داخل پوشه */
    out.accInst = [...document.querySelectorAll('#bankSelectedScroll .hk-acc-inst')].map(x => x.getAttribute('data-inst'));
    document.getElementById('bankAccountsModal').classList.remove('open');
    return out;
  }, S);
  ok(ins.p && ins.p.to === '1037' && ins.p.from === '7711' && ins.p.amount === 200000 && ins.p.count === 12 && ins.p.d === 12 && ins.p.time === '11:40', 'پیامک قسط: حساب = «به کارت» (۱۰۳۷)، مبلغ ریال → تومان، شمارهٔ قسط، تاریخ و ساعت');
  ok(ins.rIn === null && !ins.confirm && ins.incAfter === 2, 'پیامک قسط دیگر درآمد نیست: باکس ثبت باز نمی‌شود و ردیفی ساخته نمی‌شود');
  ok(ins.c1037.n === 3 && ins.c1037.kinds === 'pay,pay,pre' && ins.c1037.st === 'pre' && ins.c1037.pre === 200000, 'تعداد اقساط بیشتر = قسط؛ همان تعداد (۱۲ آبان) = پیش‌پرداخت ۲۰۰٬۰۰۰؛ پیامک تکراری دوباره ثبت نمی‌شود');
  ok(ins.c4412.st === 'bad' && ins.c2979.st === 'ok', 'معوق/جریمه از آخرین پیامک = وضعیت قرمز؛ بقیه پرداخت‌شده');
  ok(ins.slide.length === 3 && /^1037:قسط مسکن ۱۰۳۷.*پیش‌پرداخت/.test(ins.slide[0]) && /4412:.*معوق ۲,۰۰۰,۰۰۰.*جریمه ۱۵۰,۰۰۰/.test(ins.slide[1].replace(/٬/g, ',')) && /^2979:/.test(ins.slide[2]) && ins.slideBad, 'اسلاید «کارت‌های قسط»: همهٔ کارت‌ها با وضعیت کامل؛ معوق با نقطهٔ قرمز (' + ins.slide.join(' ‖ ') + ')');
  ok(ins.histTitle === 'قسط مسکن ۲۹۷۹', 'زدن ردیف اسلاید = تاریخچهٔ همان کارت');
  ok(ins.head === 'تاریخ|ساعت|مبلغ|قسط|نوع' && ins.rows.length === 3 && /^۱۴۰۵\/۰۸\/۱۲3 Nov 2026 \/ ۱۱:۴۰ \/ .*۲۰۰.* \/ ۱۲ \/ پیش‌پرداخت$/.test(ins.rows[0]), 'تاریخچه: ردیف عنوان؛ تازه‌ترین بالا با تاریخ شمسی و میلادی (' + ins.rows[0] + ')');
  ok(/معوق ۲[,٬]۰۰۰[,٬]۰۰۰ تومان/.test(ins.warn) && /جریمه ۱۵۰[,٬]۰۰۰/.test(ins.warn), 'کادر قرمز معوق و جریمه بالای تاریخچه');
  ok(ins.accSec === 'کارت‌های قسط' && ins.accInst.join(',') === '1037,4412,2979', '«انتخاب حساب»: بخش جدای کارت‌های قسط');
  ok(ins.mig.join(',') === 'wr1', 'ردیف درآمد اشتباه قبلی (همان روز و مبلغ) پیدا می‌شود؛ ردیف دیگر نه');
  const mg = await I.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.safetyBackupThen = (tag, fn) => fn();
    hkInstMigrateCheck(); await w(100);
    const ov = document.getElementById('hkInstMigOv'); const n = ov ? ov.querySelectorAll('.hk-dup-chk').length : 0;
    ov.querySelector('.hk-dup-go').click(); await w(200);
    const ids = findSectionByTitle('income', hkMainTitle()).rows.map(r => r.id);
    const tr = (trashItems || []).some(x => x.type === 'row' && x.data && x.data.row && x.data.row.id === 'wr1' && x.data.sourceLabel === 'پیامک قسط');
    hkInstMigrateCheck(); await w(50);
    return { n, ids, tr, again: !!document.getElementById('hkInstMigOv') };
  });
  ok(mg.n === 1 && mg.ids.join(',') === 'ok1' && mg.tr && !mg.again, 'با تأیید: ردیف اشتباه به سطل زباله (قابل بازگردانی)؛ دوباره پرسیده نمی‌شود');
  const bal = await I.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ bank: 'بانک ملت', label: 'ملت' }, { bank: 'بانک مسکن', label: 'مسکن ۲۹۷۹' }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2979'] = 'مسکن ۲۹۷۹'; smsAccountBankMap['L4:4021'] = 'ملت';
    const t = hkMainTitle(), inc = findSectionByTitle('income', t);
    inc.rows.push(Object.assign(emptyRow('income'), { day: '2', desc: 'الف', amount: 500000, status: 'paid', account: 'ملت' }), Object.assign(emptyRow('income'), { day: '2', desc: 'ب', amount: 700000, status: 'paid', account: 'مسکن ۲۹۷۹' }));
    persistCurrent(); renderAll();
    openInstantBalance(t); await w(200);
    const names = [...document.querySelectorAll('#instantBalPanel .ib-acc-row')].map(x => x.getAttribute('data-acc'));
    document.getElementById('instantBalOverlay').classList.remove('open');
    openBankAccountsModal(); await w(300);
    const hint = [...document.querySelectorAll('#bankSelectedScroll .hk-acc-hint')].map(x => x.textContent.replace(/\s+/g, ' ').trim())[0];
    document.getElementById('bankAccountsModal').classList.remove('open');
    hkOpenAccountTx({ bank: 'بانک ملت', label: 'ملت' }); await w(100);
    const head = [...document.querySelectorAll('#hkAccTxOv .hk-acctx-h span')].map(x => x.textContent).join('|');
    document.getElementById('hkAccTxOv')._hkCancel();
    return { names, hint, head };
  });
  ok(bal.names.indexOf('ملت') >= 0 && bal.names.indexOf('مسکن ۲۹۷۹') < 0, 'موجودی آنی: حساب وصل‌شده به کارت قسط نمی‌آید (' + bal.names.join('، ') + ')');
  ok(bal.hint.replace(/\s/g, '') === 'بانکملت|۴۰۲۱', 'زیر اسم حساب: بانک | رقم‌های کارت (' + bal.hint + ')');
  ok(bal.head === 'تاریخ|شرح|مبلغ|مانده', 'جدول تراکنش‌های حساب ردیف عنوان دارد (۱.۳.۹۹: با «مانده»)');
  await I.ctx.close();

  console.log('• حساب‌های مسدود شده');
  const K = await fresh(b);
  const bk = await K.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const raw = 'بانک ملت\nبرداشت:250,000\nحساب:6104-33**-****-5512\nمانده:1,200,000\n1405/08/12-10:00';
    hkBlockAccount('5512', 'بانک ملت');
    const r1 = enqueueBankSms(raw, { silent: true }); await w(100);
    const blockedSkip = r1 === false && !isSmsConfirmOpen();
    hkOpenBlockedAccounts(); await w(100);
    const list = [...document.querySelectorAll('#hkBlockOv .hk-block-r')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
    document.querySelector('#hkBlockOv .hk-block-un').click(); await w(100);
    const empty = !!document.querySelector('#hkBlockOv .hk-block-empty') && hkBlockedLoad().length === 0;
    document.getElementById('hkBlockOv')._hkCancel();
    const r2 = enqueueBankSms(raw, { silent: true }); await w(300);
    const back = r2 === true && isSmsConfirmOpen();
    try { closeSmsConfirmModal('cancel'); } catch (e) {}
    return { blockedSkip, list, empty, back };
  });
  ok(bk.blockedSkip, 'پیامک حساب مسدود: نه باکس ثبت، نه اعلان');
  ok(bk.list.length === 1 && /بانک ملت/.test(bk.list[0]) && /۵۵۱۲/.test(bk.list[0]) && bk.empty, 'منوی «حساب‌های مسدود شده»: فهرست و «برداشتن»');
  ok(bk.back, 'بعد از برداشتن، پیامک‌های آن حساب دوباره مثل قبل');
  await K.ctx.close();

  console.log('• «+» باکس هوشمند و نام تازهٔ ثبت پیامک');
  const N = await fresh(b);
  const pl = await N.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    let opened = false; window.openUserRemindersModal = () => { opened = true; };
    openTodoChooser(hkMainTitle()); await w(50);
    const ks = [...document.querySelectorAll('#hkTodoPick .hk-tp-opt')].map(x => x.dataset.k).join(',');
    document.querySelector('#hkTodoPick [data-k="remind"]').click(); await w(50);
    return { ks, opened, title: document.querySelector('#smsImportModal .modal-msg').textContent };
  });
  ok(pl.ks === 'ink,todo,remind' && pl.opened, '«+» باکس هوشمند: گزینهٔ سوم «یادآور»');
  ok(pl.title === 'ثبت تکی و گروهی پیامک‌ها', 'نام تازهٔ «ثبت تکی و گروهی پیامک‌ها»');
  await N.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1374: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
