// ۱.۳.۹۳: آیکون‌های بیشتر برای دسته‌ها (اسلایدهای ۶×۵ با دایره‌ها، رنگ‌های دو ردیف ۸تایی بی قرمز)، اسلاید دُنگ از همان باز شدن،
// اسلاید پس‌انداز، دُنگ: آیکون ویرایش/حذف گروه، «خرج جدید»، نارنجی تسویه‌نشده، منوی اشتراک مثل «پیوست». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  const page0 = await ctx.newPage();
  await page0.goto(INDEX); await page0.waitForTimeout(1500);
  const keys = await page0.evaluate(() => ({ dong: HK_DONG_KEY, sav: STORAGE_KEY + '_savings' }));
  await page0.close();
  /* داده از پیش (مثل کاربری که پیش از این نسخه دُنگ و پس‌انداز ساخته) */
  await ctx.addInitScript(([P, k]) => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    for (const s of ['_tourDone', '_bankSetupDone', '_cardSwipeHintDone', '_recCleanupAsked']) localStorage.setItem(P + s, '1');
    localStorage.setItem(k.dong, JSON.stringify({ groups: [{ id: 'g1', name: 'سفر شمال', members: [{ id: 'a', name: 'سپهر' }, { id: 'b', name: 'سارا' }], expenses: [{ id: 'e1', desc: 'شام', amount: 200000, payer: 'a', shares: { a: 100000, b: 100000 } }], settles: [] }] }));
    localStorage.setItem(k.sav, JSON.stringify({ v: 1, items: [{ id: 's1', asset: 'usd', qty: 100, buy: 60000, y: 1405, m: 7, d: 1 }], prices: { usd: { p: 70000, at: 1 } } }));
  }, [P, keys]);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2800);

  console.log('• باکس هوشمند از همان باز شدن');
  const sp = await page.evaluate(() => {
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    const ks = (el._spPages || []).map(p => p.key);
    const sv = (el._spPages || []).filter(p => p.key === 'savings')[0];
    return { ks: ks.join(','), sav: sv ? sv.html : '', labels: Object.keys(HK_SP_LABELS).join(',') };
  });
  ok(/(^|,)dong(,|$)/.test(sp.ks), 'بدهی دُنگی که پیش‌تر ساخته شده: اسلاید از همان باز شدن نرم‌افزار هست (' + sp.ks + ')');
  ok(/(^|,)savings(,|$)/.test(sp.ks) && /پس‌انداز/.test(sp.sav) && /۷ میلیون/.test(sp.sav) && /دلار/.test(sp.sav), 'پس‌اندازِ ساخته‌شده (حتی پیش از این نسخه): اسلاید با ارزش روز');
  ok(/dong/.test(sp.labels) && /savings/.test(sp.labels), '«دُنگ» و «پس‌انداز» در فهرست اسلایدهای شخصی‌سازی');

  console.log('• بدهی تازه: باکس روی اسلاید دُنگ می‌رود');
  const jump = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const D = hkDongLoad(); D.groups[0].expenses.push({ id: 'e2', desc: 'بنزین', amount: 300000, payer: 'b', shares: { a: 150000, b: 150000 } });
    hkDongSave(D); await w(700);
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    return el._spPages[el._spIdx].key;
  });
  ok(jump === 'dong', 'بعد از ثبت خرج تازه، باکس هوشمند روی «دُنگ» (' + jump + ')');

  console.log('• منوی دُنگ');
  const dg = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    openDongModal(); await w(250);
    o.cardCol = getComputedStyle(document.querySelector('#hkDong .hk-dg-st.open')).color;
    document.querySelector('#hkDong .hk-dg-card').click(); await w(250);
    const bx = document.querySelector('#hkDong .hk-dg-box');
    const top = bx.querySelector('.hk-dg-top');
    o.icons = !!(top && top.querySelector('.hk-dg-edit svg path[d="M12 20h9"]') && top.querySelector('.hk-dg-del.hk-del-x') && top.querySelector('.hk-dg-del').textContent === HK_DEL_X);
    o.oldBtns = !!bx.querySelector('.hk-dg-acts2');
    o.add = bx.querySelector('.hk-dg-add').textContent;
    o.shareIco = !!bx.querySelector('.hk-dg-share svg.hk-dg-shico circle');
    const e = bx.querySelector('.hk-dg-exp .hk-dg-e'), r = bx.querySelector('.hk-dg-bal .hk-dg-row');
    const alpha = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(',') : []; return p.length > 3 ? parseFloat(p[3]) : 1; };
    o.lighter = alpha(getComputedStyle(e).backgroundColor) < alpha(getComputedStyle(r).backgroundColor);
    bx.querySelector('.hk-dg-share').click(); await w(150);
    const m = document.getElementById('hkDongShareMenu');
    o.pop = m.classList.contains('hk-attpop') && [...m.querySelectorAll('button')].map(x => (x.querySelector('svg.hk-ico') ? 'i' : '') + x.textContent).join('|');
    m.remove();
    bx.querySelector('.hk-dg-add').click(); await w(250);
    o.edTitle = document.querySelector('#hkDongEd .hk-dg-t').textContent;
    document.getElementById('hkDongEd').remove();
    bx.querySelector('.hk-dg-edit').click(); await w(250);
    o.editOpens = !!document.getElementById('hkDongEd'); document.getElementById('hkDongEd').remove();
    document.getElementById('hkDong').remove();
    return o;
  });
  ok(dg.cardCol === 'rgb(255, 107, 74)', 'فهرست گروه‌ها: «تسویه‌نشده» نارنجی (' + dg.cardCol + ')');
  ok(dg.icons && !dg.oldBtns, 'گوشهٔ باکس گروه: مداد ویرایش و × حذف؛ دکمه‌های «اعضا و نام» و «حذف گروه» برداشته شد');
  ok(dg.editOpens, 'مداد = ویرایش اعضا و نام');
  ok(dg.add === 'خرج جدید' && dg.edTitle === 'خرج جدید', '«خرج جدید» (دکمه و عنوان پنجره)');
  ok(dg.shareIco, 'کنار «اشتراک‌گذاری» آیکون سه نقطهٔ به‌هم‌وصل');
  ok(dg.lighter, 'باکس خرج‌ها کم‌رنگ‌تر از باکس‌های بالایی');
  ok(dg.pop === 'iمتن|iعکس|iPDF', 'منوی اشتراک مثل پنجرهٔ «پیوست»: آیکون + نام (' + dg.pop + ')');

  console.log('• آیکون و رنگ دستهٔ تازه');
  const ic = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.bank = Object.keys(HK_ICON_BANK).length;
    const svgs = Object.values(HK_ICON_BANK); o.uniq = new Set(svgs).size === svgs.length;
    hkCatStyleSheet({ id: 'u_t1', label: 'تست' }, function () {}); await w(200);
    const st = document.getElementById('hkCatStyle');
    const pages = [...st.querySelectorAll('.hk-cst-sl .hk-cst-grid')];
    o.pages = pages.length; o.per = pages.slice(0, -1).every(g => g.children.length === 30);
    o.cols6 = getComputedStyle(pages[0]).gridTemplateColumns.split(' ').length;
    const ics = [...pages[0].children].map(x => x.getBoundingClientRect());
    o.rows5 = new Set(ics.map(r => Math.round(r.top))).size;
    o.dots = st.querySelectorAll('.hk-cst-dot').length;
    const cs = [...st.querySelectorAll('.hk-cst-col')];
    o.ncol = cs.length; o.colRows = new Set(cs.map(c => Math.round(c.offsetTop / 10))).size;
    o.noRed = cs.every(c => { const m = getComputedStyle(c).backgroundColor.match(/\d+/g).map(Number); return !(m[0] > 200 && m[1] < 120 && m[2] < 120); });
    /* ورق زدن: رنگ‌ها سر جایشان، دایرهٔ دوم روشن */
    const sl = st.querySelector('.hk-cst-sl'), c0 = cs[0].getBoundingClientRect().top;
    st.querySelectorAll('.hk-cst-dot')[1].click(); await w(700);
    o.dot2 = st.querySelectorAll('.hk-cst-dot')[1].classList.contains('on') && Math.abs(sl.scrollLeft) > 100;
    o.colsFixed = Math.abs(cs[0].getBoundingClientRect().top - c0) < 1;
    st.remove();
    return o;
  });
  ok(ic.bank >= 250 && ic.uniq, 'بانک آیکون بزرگ‌تر و بی تکرار (' + ic.bank + ' آیکون)');
  ok(ic.pages >= 8 && ic.per && ic.cols6 === 6 && ic.rows5 === 5, 'هر اسلاید ۶ ستون × ۵ ردیف (' + ic.pages + ' اسلاید)');
  ok(ic.dots === ic.pages && ic.dot2 && ic.colsFixed, 'دایره‌های زیر اسلایدها؛ ورق زدن فقط آیکون‌ها را جابه‌جا می‌کند و رنگ‌ها بالا ثابت می‌مانند');
  ok(ic.ncol === 16 && ic.colRows === 2 && ic.noRed, 'رنگ‌ها: دو ردیف ۸تایی، بی قرمز (' + ic.ncol + ')');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1393: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
