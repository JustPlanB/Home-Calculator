// ۱.۳.۹۲: سهم نامساوی دُنگ به شکل جدول (− و + بی قاب با جای لمس کافی)، اسلاید بدهی‌های دُنگ در باکس هوشمند،
// منوی انتخاب نوع ردیف‌ها از روی نام بالای ویجت. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• ویجت ردیف‌ها: منوی نوع از روی نام بالای ویجت (کد بومی)');
  const pa = androidSource();
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/android:id="@\+id\/hk_wt_pick"[\s\S]*?layout_gravity="top\|center_horizontal"/.test(patch) && /setOnClickPendingIntent\(R\.id\.hk_wt_pick, pickIntent\(ctx, id\)\)/.test(pa), 'روی نام نوع ردیف‌ها (وسط بالای ویجت) قابل زدن است');
  ok(/new Intent\(ctx, HkWidgetTxConfig\.class\)[\s\S]*?EXTRA_REPICK, true/.test(pa) && /HkWidgetTxConfig" android:exported="true" android:excludeFromRecents="true" android:taskAffinity=""/.test(patch) && !/FLAG_ACTIVITY_CLEAR_TASK/.test(pa.slice(pa.indexOf('static android.app.PendingIntent pickIntent'), pa.indexOf('static android.app.PendingIntent pickIntent') + 800)), 'همان پنجرهٔ «مخارج / درآمدها / همه» در تسک جدا باز می‌شود (نرم‌افزار باز بسته نمی‌شود)');
  ok(/boolean on=repick && type\.equals\(cur\)/.test(pa) && /"✓  "\+label/.test(pa), 'گزینهٔ فعلی در منو تیک دارد');
  ok(/فلش کوچک کنار نام/.test(pa) && /cv\.drawPath\(ch, chp\)/.test(pa), 'کنار نام بالای ویجت یک فلش کوچک (یعنی منو)');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• دُنگ: جدول سهم نامساوی');
  const t = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر شمال', members: [{ id: 'a', name: 'سپهر' }, { id: 'b', name: 'سارا' }, { id: 'c', name: 'نیما' }, { id: 'd', name: 'مریم' }], expenses: [], settles: [] }] });
    openDongModal(); await w(250);
    document.querySelector('#hkDong .hk-dg-card').click(); await w(200);
    document.querySelector('#hkDong .hk-dg-add').click(); await w(250);
    const ed = document.getElementById('hkDongEd');
    ed.querySelectorAll('input.hk-dg-in')[0].value = 'ویلا';
    const am = ed.querySelector('.hk-dg-amt'); am.value = '1000000'; am.dispatchEvent(new Event('input', { bubbles: true }));
    ed.querySelector('.hk-dg-seg [data-v="uneq"]').click(); await w(600);
    const tb = ed.querySelector('table.hk-dg-wt');
    o.head = tb ? [...tb.querySelectorAll('thead th')].map(x => x.textContent).join('|') : '';
    const rows = [...tb.querySelectorAll('tr.hk-dg-shr')];
    o.n = rows.length;
    rows[0].querySelector('.hk-dg-wplus').click(); await w(50);
    o.vals = rows.map(r => r.querySelector('.hk-dg-wv').textContent).join('|');
    o.tot = tb.querySelector('.hk-dg-shtn').textContent + '|' + tb.querySelector('.hk-dg-shta').textContent;
    const pb = rows[0].querySelector('.hk-dg-wplus'), mb = rows[0].querySelector('.hk-dg-wminus'), cs = getComputedStyle(pb), pr = pb.getBoundingClientRect(), mr = mb.getBoundingClientRect();
    o.noBox = cs.borderTopWidth === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    o.touch = Math.round(pr.width) >= 40 && Math.round(pr.height) >= 40;
    o.plusRight = pr.left > mr.left;
    o.blue = cs.color === 'rgb(8, 181, 245)';
    ed.querySelector('.hk-dg-ok').click(); await w(400);
    document.getElementById('hkDong').remove();
    return o;
  });
  ok(t.head === 'نام|تعداد (نفر)|مبلغ' && t.n === 4, 'جدول سه ستون: نام | تعداد (نفر) | مبلغ، یک ردیف برای هر نفر');
  ok(t.vals === '۴۰۰,۰۰۰|۲۰۰,۰۰۰|۲۰۰,۰۰۰|۲۰۰,۰۰۰' && t.tot === '۵ نفر|۱,۰۰۰,۰۰۰', 'سهم هر ردیف و ردیف «جمع» (۵ نفر، ۱,۰۰۰,۰۰۰) (' + t.vals + ' / ' + t.tot + ')');
  ok(t.noBox && t.touch && t.blue && t.plusRight, '«−» و «+» بی قاب، آبی، با جای لمس ۴۰ پیکسل؛ «+» سمت راست');

  console.log('• اسلاید دُنگ در باکس هوشمند');
  const s = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.html = spPageDong() || '';
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    renderHomeCards(); await w(400);
    o.inPages = ((el && el._spPages) || document.querySelector('#homeSmartBox .pc-smart-box')._spPages || []).map(p => p.key).indexOf('dong') >= 0;
    /* زدن خط = همان گروه */
    const d = document.createElement('div'); d.innerHTML = o.html; document.body.appendChild(d);
    spTapDong('', d.querySelector('[data-dong]')); await w(300);
    o.opened = !!document.getElementById('hkDong') && /سفر شمال/.test(document.querySelector('#hkDong .hk-dg-t').textContent);
    d.remove(); document.getElementById('hkDong').remove();
    /* همه پرداخت شد → اسلاید نیست */
    const D = hkDongLoad(), g = D.groups[0];
    g.settles = hkDongPlan(g).map((x, i) => ({ id: 's' + i, from: x.from, to: x.to, amount: x.amount }));
    hkDongSave(D); await w(500);
    o.none = spPageDong() === null;
    const el2 = document.querySelector('#homeSmartBox .pc-smart-box');
    o.gone = ((el2 && el2._spPages) || []).map(p => p.key).indexOf('dong') < 0;
    return o;
  });
  ok(/دُنگ — بدهی‌های تسویه‌نشده/.test(s.html) && /تسویه‌نشده/.test(s.html) && /سفر شمال/.test(s.html) && /«نیما» به «سپهر»/.test(s.html) && /۲۰۰,۰۰۰/.test(s.html) && s.inPages, 'اسلاید «دُنگ — بدهی‌های تسویه‌نشده»: جمع و هر بدهی با نام گروه');
  ok(s.opened, 'زدن خط اسلاید: همان گروه دُنگ باز می‌شود');
  ok(s.none && s.gone, 'وقتی بدهی تسویه‌نشده‌ای نیست، اسلاید نشان داده نمی‌شود');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1392: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
