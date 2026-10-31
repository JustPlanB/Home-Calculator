// سیستم طراحی: یک آبی (#08b5f5) در هر دو حالت، دکمه/پنجرهٔ یکدست، کمترین نوشته ۱۱px، تسویه‌نشده یک رنگ،
// قرمز برداشت در روشن همان #dc2626، و امضای بصری خانه (سایهٔ فرورفته) دست‌نخورده. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
const BLUE = 'rgb(8, 181, 245)';

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(t => { if (sessionStorage.getItem('__s')) return; sessionStorage.setItem('__s', '1'); ['_tourDone', '_bankSetupDone', '_cardSwipeHintDone', '_recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5' + k, '1')); localStorage.setItem('hesabTheme', t); }, theme);
  const page = await ctx.newPage(); page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1500);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    console.log('• حالت ' + (theme === 'dark' ? 'تیره' : 'روشن'));
    const { ctx, page } = await fresh(b, theme);
    const t = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return { p: cs.getPropertyValue('--hk-primary').trim(), acc: cs.getPropertyValue('--accent').trim(), exp: cs.getPropertyValue('--hk-expense').trim(), red: cs.getPropertyValue('--red-tx').trim(), uns: cs.getPropertyValue('--hk-unsettled').trim() }; });
    ok(t.p === '#08b5f5' && /#08b5f5|var\(--hk-primary\)/.test(t.acc), 'آبی اصلی ' + t.p + ' (accent: ' + t.acc + ')');
    if (theme === 'light') ok(t.red === 'var(--hk-expense)' || t.red === '#dc2626', 'برداشت در روشن = #dc2626 (' + t.red + ')');
    const tr = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      openTrashModal(); await w(400);
      const box = document.querySelector('#trashModal .modal-box') || document.querySelector('.modal-overlay.open .modal-box');
      const btns = [...box.querySelectorAll('.modal-btn')].filter(x => x.getBoundingClientRect().height > 0).map(x => { const c = getComputedStyle(x); return { t: x.textContent.trim(), h: Math.round(x.getBoundingClientRect().height), r: c.borderRadius, fs: c.fontSize, bg: c.backgroundColor, fg: c.color }; });
      const r = getComputedStyle(box).borderRadius;
      try { closeTrashModal(); } catch (e) {}
      return { btns, r };
    });
    const restore = tr.btns.find(x => /بازگردانی/.test(x.t)), purge = tr.btns.find(x => /پاک کردن/.test(x.t));
    ok(restore && restore.bg === BLUE && restore.fg === 'rgb(255, 255, 255)', 'دکمهٔ اصلی پنجره همان آبی با متن سفید (' + (restore && restore.bg) + ')');
    ok(purge && purge.bg !== BLUE && /rgb\((2[0-5]\d|1\d\d), \d{1,2}, \d{1,2}\)/.test(purge.bg), 'دکمهٔ مخرب قرمز می‌ماند (' + (purge && purge.bg) + ')');
    ok(tr.btns.every(x => x.h === 44 && x.r === '10px' && x.fs === '15px'), 'دکمه‌های پنجره ۴۴px، گردی ۱۰px، نوشته ۱۵px (' + tr.btns.map(x => x.h + '/' + x.r + '/' + x.fs).join(' ') + ')');
    ok(tr.r === '16px', 'گردی قاب پنجره ۱۶px (' + tr.r + ')');
    const sec = await page.evaluate(async () => {
      openSecurityModal(); await new Promise(r => setTimeout(r, 400));
      const p = document.querySelector('#securityModal .sec-btn-primary'), c = p && getComputedStyle(p);
      const out = c ? { bg: c.backgroundColor, h: Math.round(p.getBoundingClientRect().height), fs: c.fontSize, ff: c.fontFamily } : null;
      document.querySelectorAll('.modal-overlay.open').forEach(o => o.classList.remove('open'));
      return out;
    });
    ok(sec && sec.bg === BLUE && sec.fs === '15px' && /Vazirmatn/.test(sec.ff), '«فعال کردن قفل برنامه» همان آبی و فونت نرم‌افزار (' + JSON.stringify(sec) + ')');
    const home = await page.evaluate(() => {
      let min = 99, where = ''; const w = document.createTreeWalker(document.getElementById('panel-home') || document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement, r = el.getBoundingClientRect(); if (!r.width || r.top > innerHeight) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < min) { min = fs; where = el.className + ':' + n.textContent.trim().slice(0, 10); } }
      const tile = document.querySelector('.home-tile .ti-disc, .home-circle'); const sh = tile ? getComputedStyle(tile).boxShadow : '';
      return { min, where, inset: /inset/.test(sh) };
    });
    ok(home.min >= 11, 'صفحهٔ خانه: کوچک‌ترین نوشته ' + home.min + 'px (' + home.where + ')');
    ok(home.inset, 'سایهٔ فرورفتهٔ کاشی‌ها/دایره‌های خانه سر جایش است');
    const un = await page.evaluate(() => {
      const d = document.createElement('td'); d.className = 'unpaid-cell'; const tb = document.createElement('table'); const trr = document.createElement('tr'); trr.appendChild(d); tb.appendChild(trr); document.body.appendChild(tb); d.textContent = '1';
      const c = getComputedStyle(d).color; tb.remove();
      const v = getComputedStyle(document.documentElement).getPropertyValue('--hk-unsettled').trim();
      return { c, v };
    });
    const hex = un.v.replace('#', ''); const rgb = 'rgb(' + [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16)).join(', ') + ')';
    ok(un.c === rgb, 'تسویه‌نشده در جدول همان رنگ تسویه‌نشده (' + un.c + ' = ' + un.v + ')');
    await ctx.close();
  }
  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\ndesign-system: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
