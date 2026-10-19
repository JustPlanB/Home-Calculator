// نسخهٔ ۱.۳.۳۸: برچسب ثابت فیلترهای جستجو با منوی باز هم دیده می‌شود، پیوست در منوی ثبت پیامک (گیرهٔ طوسی کنار میکروفون،
// پنجرهٔ رو به بالا با آیکون، پیش‌نمایش زیر شرح، ثبت → روی ردیف / انصراف → پاک)، آیکون گزینه‌های پیوست، جمع و باز شدن کادر جستجو. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRepair1335', 'timeFill1335', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  console.log('• فیلترهای جستجو: برچسب با منوی باز');
  const f = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 30 }, (_, i) => Object.assign(emptyRow('expense'), { day: String((i % 28) + 1), desc: 'نان ' + i, amount: 10000 * (i + 1), status: 'paid', account: 'ملت' }));
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const out = [];
    const cells = [...document.querySelectorAll('#balanceFixedHeader .bsr-cell')].filter(c => c.querySelector('.fancy-select-btn, .dark-select-btn'));
    for (const c of cells) {
      const btn = c.querySelector('.fancy-select-btn, .dark-select-btn'), lab = c.querySelector('.balance-acc-label');
      btn.click(); await w(200);
      const wrap = c.querySelector('.fancy-select-wrap, .dark-select');
      const lz = parseInt(getComputedStyle(lab).zIndex, 10) || 0, wz = parseInt(getComputedStyle(wrap).zIndex, 10) || 0;
      out.push(lab.textContent + ':' + (lz > wz && getComputedStyle(lab).visibility === 'visible' && getComputedStyle(lab).display !== 'none'));
      document.querySelectorAll('.dark-select-list.open, .fancy-select-list.open').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.fancy-select-wrap.is-open').forEach(x => x.classList.remove('is-open'));
      document.querySelectorAll('.dark-select.open').forEach(x => x.classList.remove('open'));
      await w(80);
    }
    return out;
  });
  ok(f.length === 6 && f.every(x => /:true$/.test(x)), 'با باز شدن هر منو، برچسب ثابت بالای آن می‌ماند (' + f.join('، ') + ')');

  console.log('• جمع و باز شدن کادر جستجو');
  await p.evaluate(async () => { const i = document.getElementById('balanceSearchInput'); i.value = 'نان'; i.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 300)); });
  const st = () => p.evaluate(() => {
    const h = document.getElementById('balanceFixedHeader'), cell = h.querySelector('.bsr-grid > .bsr-cell:not(.bsr-desc)'), desc = h.querySelector('.bsr-desc');
    return { c: h.classList.contains('bsr-collapsed'), cellH: Math.round(cell.getBoundingClientRect().height), descH: Math.round(desc.getBoundingClientRect().height), top: Math.round(h.getBoundingClientRect().top), pTop: document.getElementById('panel-balance').scrollTop };
  });
  const s0 = await st();
  await p.mouse.move(190, 600); await p.mouse.wheel(0, 140); await p.waitForTimeout(900);
  const s1 = await st();
  await p.mouse.wheel(0, 300); await p.waitForTimeout(400);
  const s2 = await st();
  await p.mouse.wheel(0, -3000); await p.waitForTimeout(1000);
  const s3 = await st();
  /* فلش زیر حالت بسته: رفتن به بالا و باز شدن */
  await p.mouse.wheel(0, 200); await p.waitForTimeout(900);
  const s4 = await st();
  await p.evaluate(() => document.querySelector('#balanceFixedHeader .bsr-handle').click()); await p.waitForTimeout(1400);
  const s5 = await st();
  ok(!s0.c && s0.cellH >= 30, 'پیش از اسکرول کادر جستجو باز است');
  ok(s1.c && s1.cellH === 0 && s1.descH >= 30, 'با اولین اسکرول رو به پایین کادر جمع شد و فقط «جستجوی شرح» ماند');
  ok(s2.c && Math.abs(s2.top - s1.top) <= 1, 'ادامهٔ اسکرول: کادرِ جمع‌شده بالای صفحه ثابت می‌ماند (باز و بسته نمی‌شود)');
  ok(!s3.c && s3.cellH >= 30 && s3.pTop === 0, 'برگشت به بالای جدول: کادر دوباره باز شد');
  ok(s4.c && !s5.c && s5.pTop === 0, 'فلش زیر کادرِ جمع‌شده: رفتن به بالا و باز شدن');

  console.log('• پیوست در منوی ثبت پیامک');
  const sm = await p.evaluate(async (PNG) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { closePersonDetail(); } catch (e) {}
    await w(200);
    document.documentElement.classList.add('hk-voice');
    const out = {};
    pendingSmsEntry = { raw: 'بانک ملت\nبرداشت 70,000', amount: 70000, type: 'expense' };
    openSmsConfirmModal({ type: 'expense', amount: 70000, raw: pendingSmsEntry.raw, bank: 'ملت', year: 1405, month: 7, day: 21 });
    await w(300);
    const wrap = document.getElementById('smsConfirmDesc')._micWrap;
    const mic = wrap.querySelector('.desc-mic-btn'), att = wrap.querySelector('.desc-att-btn'), sep = wrap.querySelector('.desc-att-sep');
    const mr = mic.getBoundingClientRect(), ar = att.getBoundingClientRect(), sr = sep.getBoundingClientRect();
    out.layout = { order: mr.right <= sr.left + 1 && sr.right <= ar.left + 1, sepShown: getComputedStyle(sep).display !== 'none', grey: getComputedStyle(att).color };
    att.click(); await w(250);
    const pop = document.querySelector('.hk-attpop');
    out.pop = pop ? [...pop.querySelectorAll('button')].map(x => x.textContent.trim() + (x.querySelector('svg.hk-ico') ? '+ico' : '')) : [];
    out.popAbove = pop ? pop.getBoundingClientRect().bottom <= ar.top + 1 : false;
    /* آیکون صدا موج است، نه میکروفون گفتار به متن */
    out.waveNotMic = pop ? pop.querySelector('[data-a="rec"] svg').innerHTML !== mic.querySelector('svg').innerHTML : false;
    onBackGuard(); await w(100);
    out.backClosed = !document.querySelector('.hk-attpop') && document.getElementById('smsConfirmModal').classList.contains('open');
    /* پیش‌نمایش و حذف */
    await hkSmsAttAdd('img', hkB64Blob(PNG, 'image/png'));
    await hkSmsAttAdd('aud', new Blob([new Uint8Array(64)], { type: 'audio/webm' }), { dur: 3.4 });
    await hkSmsAttAdd('img', hkB64Blob(PNG, 'image/png'));
    const strip = document.getElementById('smsAttStrip');
    out.strip = [...strip.querySelectorAll('.sa-it')].map(x => x.querySelector('img') ? 'img' : x.textContent.replace('×', '').trim());
    out.badge = att.classList.contains('has') && att.querySelector('.desc-att-n').textContent;
    const delId = _smsAtt.list[2].id;
    strip.querySelectorAll('.sa-x')[2].click(); await w(150);
    out.afterDel = strip.querySelectorAll('.sa-it').length + ':' + (await HKAttach.get(delId) ? 'kept' : 'gone');
    /* ثبت (شبیه‌سازی ردیف تازهٔ پیامک) → پیوست‌ها روی همان ردیف */
    const row = Object.assign(emptyRow('expense'), { day: '21', desc: 'خرید', amount: 70000, status: 'paid', account: 'ملت', viaSms: true, createdAt: Date.now() });
    periodData.expense.sections[0].rows.push(row);
    closeSmsConfirmModal(); await w(300);
    out.saved = (row.att || []).map(a => a.kind + (a._blob ? '!blob' : ''));
    out.stripAfter = strip.classList.contains('on');
    /* انصراف → پیوست‌ها پاک */
    pendingSmsEntry = { raw: 'بانک ملت\nبرداشت 80,000', amount: 80000, type: 'expense' };
    openSmsConfirmModal({ type: 'expense', amount: 80000, raw: pendingSmsEntry.raw, bank: 'ملت', year: 1405, month: 7, day: 21 });
    await w(200);
    await hkSmsAttAdd('img', hkB64Blob(PNG, 'image/png'));
    const cid = _smsAtt.list[0].id;
    closeSmsConfirmModal('reject'); await w(300);
    out.cancel = (await HKAttach.get(cid)) ? 'kept' : 'gone';
    /* پنجرهٔ پیوستِ ردیف: سه گزینه با آیکون خودشان */
    openRowAttachments(row); await w(200);
    out.rowBtns = [...document.querySelectorAll('#hkAttachOv .hk-att-btn')].map(x => x.textContent.trim() + (x.querySelector('svg.hk-ico') ? '+ico' : ''));
    hkCloseAttach();
    return out;
  }, PNG);
  ok(sm.layout.order && sm.layout.sepShown && /142, 142, 147|142, 142, 142|rgb\(1[0-9]{2}, 1[0-9]{2}, 1[0-9]{2}\)/.test(sm.layout.grey), 'فیلد شرح: میکروفون | خط تفکیک | گیرهٔ طوسی (' + sm.layout.grey + ')');
  ok(sm.pop.join('،') === 'دوربین+ico،گالری+ico،ضبط صدا+ico' && sm.popAbove && sm.waveNotMic, 'زدن گیره: پنجرهٔ کوچک رو به بالا با سه گزینه و آیکون مخصوص هر کدام (ضبط صدا = موج، نه میکروفون)');
  ok(sm.backClosed, 'بک اندروید فقط پنجرهٔ کوچک را می‌بندد، منوی پیامک باز می‌ماند');
  ok(sm.strip.join(',') === 'img,۰:۰۳,img' && sm.badge === '۳' && sm.afterDel === '2:gone', 'پیش‌نمایش پیوست‌ها زیر شرح با ×؛ گیره آبی با شمار؛ × فایل را پاک می‌کند');
  ok(sm.saved.join(',') === 'img,aud' && !sm.stripAfter, 'با ثبت، پیوست‌ها روی ردیف تازه نشستند');
  ok(sm.cancel === 'gone', 'با انصراف، پیوست‌های در انتظار پاک شدند');
  ok(sm.rowBtns.join('،') === 'دوربین+ico،گالری+ico،ضبط صدا+ico', 'پنجرهٔ پیوستِ ردیف: آیکون کنار هر سه گزینه');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
