// فاز ۴.۳: هرس پشتیبان خودکار هرگز فایل تازه و تأییدشده را پاک نمی‌کند (M1) + هشدار کلید قبلی هنگام راه‌اندازی (L2).
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا؛ افزونهٔ اندرویدی با شبیه‌ساز درون‌حافظه‌ای جایگزین می‌شود
// (قرارداد سمت JS سنجیده می‌شود، نه کد جاوا). در هر سناریو شناسه و محتوای فایل تازه و فایل مرجع بررسی می‌شود، نه فقط تعداد.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_autoBackup']: JSON.stringify({ enabled: false }) };
const PW = 'Synthetic-Prune-Pass-77';      /* رمز مصنوعی */
const MARK = 'SYN_PRUNE_MARKER_ROW';        /* نشانهٔ دادهٔ مالی مصنوعی */

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

/* شبیه‌ساز افزونه. modified فایل تازه با __nf.newModified تعیین می‌شود (مثلاً ۰ یا قدیمی‌تر از مرجع).
   __nf.listHook(names, callNo) می‌تواند فهرست را دست‌کاری کند؛ __nf.listFailFrom = شمارهٔ فراخوانی‌ای که از آن به بعد فهرست شکست می‌خورد؛
   __nf.delFail = همهٔ حذف‌ها شکست؛ __nf.delFailNames = فقط این نام‌ها؛ __nf.listExtra = نام‌هایی بیرون از الگو که فهرست برمی‌گرداند. */
function installMock(seedFiles) {
  const files = {}; let seq = 1000;
  window.__files = files; window.__log = []; window.__saved = {};
  window.__nf = { newModified: undefined, listCalls: 0, listFailFrom: 0, listHook: null, delFail: false, delFailNames: [], listExtra: [] };
  Object.keys(seedFiles || {}).forEach(k => { files[k] = Object.assign({ id: ++seq }, seedFiles[k]); });
  const safe = n => /^hesab-(auto|safety)-[0-9A-Za-z._-]{1,80}\.json$/.test(n);
  window.Capacitor = { isNativePlatform: () => true, Plugins: { NativeFileExport: {
    saveAutoBackup: async (o) => {
      window.__log.push('save:' + o.filename);
      if (!safe(o.filename)) throw new Error('bad_name');
      if (files[o.filename]) throw new Error('name_exists');
      const m = window.__nf.newModified;
      files[o.filename] = { id: ++seq, data: o.data, modified: m === undefined ? Math.floor(Date.now() / 1000) : m };
      window.__saved[o.filename] = o.data;
      return { ok: true, verified: true, filename: o.filename };
    },
    listAutoBackups: async () => {
      const c = ++window.__nf.listCalls;
      if (window.__nf.listFailFrom && c >= window.__nf.listFailFrom) throw new Error('list_failed');
      let names = Object.keys(files).filter(safe).concat(window.__nf.listExtra);
      if (window.__nf.listHook) names = window.__nf.listHook(names, c);
      return { files: names.map(n => ({ name: n, size: 1, modified: files[n] ? files[n].modified : 0 })) };
    },
    deleteAutoBackup: async (o) => {
      window.__log.push('del:' + o.name);
      if (!safe(o.name)) throw new Error('bad_name');
      if (window.__nf.delFail || window.__nf.delFailNames.indexOf(o.name) >= 0) throw new Error('delete_failed');
      delete files[o.name]; return { deleted: 1 };
    },
    readAutoBackup: async (o) => { if (!safe(o.name) || !files[o.name]) throw new Error('not_found'); return { data: files[o.name].data, size: 1 }; }
  }, App: { getInfo: async () => ({ version: '1.3.10', build: '1' }) } } };
}
async function fresh(b, seedFiles) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  await ctx.addInitScript(installMock, seedFiles || {});
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => { errors.push(e.message); allErrors.push(e.message); });
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(MARK => {
    const t = allPersonTitles()[0];
    periodData.income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '4', desc: MARK, amount: 1234567, status: 'paid' }));
    persistCurrent(); saveArchive();
    /* کمک‌کننده‌ها: روزهای قبل از امروز (تاریخ شمسی داخل نام)، عکس فوری یک فایل، و مقایسهٔ شناسه + محتوا */
    window.__dayMinus = function (k) {
      const p = _bkStamp().day.split('-').map(Number); let y = p[0], m = p[1], d = p[2] - k;
      while (d < 1) { m--; if (m < 1) { m = 12; y--; } d += m <= 6 ? 31 : 30; }
      return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    };
    window.__snap = n => __files[n] ? { id: __files[n].id, data: __files[n].data } : null;
    window.__same = (n, s) => !!(s && __files[n] && __files[n].id === s.id && __files[n].data === s.data);
    window.__dels = () => __log.filter(x => x.indexOf('del:') === 0).map(x => x.slice(4));
    window.__newName = () => { const s = __log.filter(x => x.indexOf('save:') === 0); return s.length ? s[s.length - 1].slice(5) : null; };
    window.__plain = n => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(__files[n].data), c => c.charCodeAt(0)))); } catch (e) { return null; } };
  }, MARK);
  return { ctx, page, errors };
}
const B64 = s => Buffer.from(s, 'utf8').toString('base64');
const REF = B64(JSON.stringify({ app: 'hesab-ketab', version: 1, archive: {}, note: 'synthetic-reference' }));
const OLD = B64(JSON.stringify({ app: 'hesab-ketab', version: 1, archive: {}, note: 'synthetic-old' }));

(async () => {
  const b = await chromium.launch();

  /* ---------- M1: مسیر واقعی writeAutoBackup ---------- */
  console.log('• ۱) فایل تازه با modified=0؛ فایل قبلیِ همان روز با modified خیلی جدیدتر');
  {
    const X = await fresh(b);
    const r2 = await X.page.evaluate(async REF => {
      Object.keys(__files).forEach(k => delete __files[k]); __log.length = 0;
      const today = _bkStamp().day, y1 = __dayMinus(1);
      const sameDay = 'hesab-auto-' + today + '-000001-000aa.json', ref = 'hesab-auto-' + y1 + '-235959-999zz.json';
      __files[sameDay] = { id: 1, data: 'U0FNRURBWQ==', modified: 4000000000 };
      __files[ref] = { id: 2, data: REF, modified: 4000000000 };
      const refSnap = __snap(ref);
      __nf.newModified = 0;
      const w = await writeAutoBackup('daily');
      const nn = __newName();
      return { w, nn, newKept: !!__files[nn] && __files[nn].data === __saved[nn] && __files[nn].modified === 0,
        newHasMark: JSON.stringify(__plain(nn) || {}).indexOf('SYN_PRUNE_MARKER_ROW') >= 0,
        refSame: __same(ref, refSnap), sameDayGone: !__files[sameDay], dels: __dels(), sameDay };
    }, REF);
    ok(r2.w === true && r2.newKept && r2.newHasMark, 'فایل تازه (modified=0) با همان شناسه و همان محتوای ذخیره‌شده ماند و دادهٔ مصنوعی در آن هست');
    ok(r2.refSame, 'فایل مرجع (دیروز) با همان شناسه و محتوا ماند');
    ok(r2.sameDayGone && r2.dels.length === 1 && r2.dels[0] === r2.sameDay && r2.dels.indexOf(r2.nn) < 0, 'فقط فایل قدیمی‌ترِ همان روز (بر اساس زمان نام) حذف شد؛ فایل تازه هرگز در فهرست حذف نبود');
    await X.ctx.close();
  }

  console.log('• ۲) پشتیبان ایمنی تازه با modified=0؛ ۶ ایمنی قبلی با modified بزرگ، یکی با modified=0، و ایمنی با زمان نامعتبر');
  {
    const X = await fresh(b);
    const r2 = await X.page.evaluate(async ([REF, OLD]) => {
      const y1 = __dayMinus(1), y2 = __dayMinus(2);
      const s = [];
      for (let i = 0; i < 6; i++) { const n = 'hesab-safety-' + y2 + '-1' + i + '0000-000a' + i + '-restore.json'; s.push(n); __files[n] = { id: 10 + i, data: REF, modified: i === 2 ? 0 : 4000000000 - i }; }
      const legacy = 'hesab-safety-' + y1 + '-120000-import.json';
      __files[legacy] = { id: 30, data: REF, modified: 1 };
      const badTime = 'hesab-safety-' + y1 + '-restore.json';
      __files[badTime] = { id: 31, data: OLD, modified: 0 };
      const refSnap = __snap(legacy), badSnap = __snap(badTime);
      __nf.newModified = 0;
      const w = await writeAutoBackup('safety', 'restore');
      const nn = __newName(), dels = __dels();
      return { w, nn, newKept: !!__files[nn] && __files[nn].data === __saved[nn] && __files[nn].modified === 0, refSame: __same(legacy, refSnap), badSame: __same(badTime, badSnap),
        dels: dels.slice().sort(), expectDel: s.slice(0, 3).sort(), left: Object.keys(__files).filter(n => /^hesab-safety-/.test(n) && n !== badTime).length };
    }, [REF, OLD]);
    ok(r2.w === true && r2.newKept && r2.dels.indexOf(r2.nn) < 0, 'ایمنی تازه (modified=0) با همان شناسه و محتوا ماند');
    ok(r2.refSame, 'ایمنی مرجع با نام قدیمی (بدون میلی‌ثانیه، modified=1) چون از نظر زمان نام جدیدتر است ماند');
    ok(JSON.stringify(r2.dels) === JSON.stringify(r2.expectDel) && r2.left === 5, 'فقط ۳ ایمنیِ قدیمی‌تر بر اساس زمان نام حذف شدند (modified بزرگ یا صفر بی‌اثر)؛ ۵ ایمنی ماند');
    ok(r2.badSame, 'ایمنی با زمان نامعتبر در نام حذف نشد');
    await X.ctx.close();
  }

  console.log('• ۳) فایل تازه در فهرستِ هرس نیست / شکست فهرست / شکست حذف / هرس ناقص');
  {
    const X = await fresh(b);
    const r = await X.page.evaluate(async ([REF, OLD]) => {
      const out = {};
      const setup = () => {
        Object.keys(__files).forEach(k => delete __files[k]); __log.length = 0; __nf.listCalls = 0;
        __nf.listHook = null; __nf.listFailFrom = 0; __nf.delFail = false; __nf.delFailNames = []; __nf.newModified = 0;
        const today = _bkStamp().day;
        const olds = [1, 2].map(i => 'hesab-auto-' + today + '-00000' + i + '-000aa.json');
        olds.forEach((n, i) => { __files[n] = { id: 50 + i, data: OLD, modified: 4000000000 }; });
        const ref = 'hesab-auto-' + __dayMinus(1) + '-120000-000bb.json'; __files[ref] = { id: 60, data: REF, modified: 4000000000 };
        return { olds, ref, refSnap: __snap(ref), oldSnaps: olds.map(__snap) };
      };
      const check = (c, w) => { const nn = __newName(); return { w, newKept: !!__files[nn] && __files[nn].data === __saved[nn], refSame: __same(c.ref, c.refSnap), oldsSame: c.olds.map((n, i) => __same(n, c.oldSnaps[i])), dels: __dels(), nn }; };
      /* الف) فهرستِ دوم (داخل هرس) فایل تازه را نشان نمی‌دهد */
      let c = setup(); __nf.listHook = (names, call) => call >= 2 ? names.filter(n => n !== __newName()) : names;
      out.hidden = check(c, await writeAutoBackup('daily'));
      /* ب) فهرستِ داخل هرس شکست می‌خورد */
      c = setup(); __nf.listFailFrom = 2;
      out.listFail = check(c, await writeAutoBackup('daily'));
      /* ج) همهٔ حذف‌ها شکست می‌خورند */
      c = setup(); __nf.delFail = true;
      out.delFail = check(c, await writeAutoBackup('daily'));
      /* د) هرس ناقص: حذف فقط یکی از دو فایل قدیمی شکست می‌خورد */
      c = setup(); __nf.delFailNames = [c.olds[0]];
      out.partial = check(c, await writeAutoBackup('daily')); out.partial.olds = c.olds;
      return out;
    }, [REF, OLD]);
    ok(r.hidden.w === true && r.hidden.newKept && r.hidden.refSame && r.hidden.oldsSame.every(Boolean) && r.hidden.dels.length === 0, 'فایل تازه در فهرست هرس نبود: هیچ حذفی انجام نشد؛ تازه، مرجع و قدیمی‌ها با همان شناسه و محتوا ماندند');
    ok(r.listFail.w === true && r.listFail.newKept && r.listFail.refSame && r.listFail.oldsSame.every(Boolean) && r.listFail.dels.length === 0, 'شکست فهرست در هرس: هیچ حذفی؛ همه با همان شناسه و محتوا ماندند');
    ok(r.delFail.w === true && r.delFail.newKept && r.delFail.refSame && r.delFail.oldsSame.every(Boolean) && r.delFail.dels.indexOf(r.delFail.nn) < 0, 'شکست حذف: نتیجهٔ ذخیره موفق ماند، تازه و مرجع دست نخوردند، فایل تازه هرگز درخواست حذف نشد');
    ok(r.partial.w === true && r.partial.newKept && r.partial.refSame && r.partial.oldsSame[0] && !r.partial.oldsSame[1] && r.partial.dels.indexOf(r.partial.nn) < 0, 'هرس ناقص: یک قدیمی ماند، دیگری حذف شد؛ تازه و مرجع با همان شناسه و محتوا ماندند');
    await X.ctx.close();
  }

  /* ---------- M1: فراخوانی مستقیم pruneAutoBackups با فهرست‌های ساختگی ---------- */
  console.log('• ۴) تساوی زمان، modified قدیمی‌تر از مرجع، نام قدیمی در برابر نام زمان‌دار، استخرها، نام‌های نامعتبر');
  {
    const X = await fresh(b);
    const r = await X.page.evaluate(async ([REF, OLD]) => {
      const NF = window.Capacitor.Plugins.NativeFileExport, out = {};
      const reset = (map) => { Object.keys(__files).forEach(k => delete __files[k]); __log.length = 0; __nf.listExtra = []; let id = 100; Object.keys(map).forEach(k => { __files[k] = Object.assign({ id: ++id }, map[k]); }); };
      const snaps = names => names.map(__snap);
      const sameAll = (names, s) => names.every((n, i) => __same(n, s[i]));
      /* الف) modified فایل تازه قدیمی‌تر از فایل قبلیِ همان روز و از مرجع */
      let nw = 'hesab-auto-1405-06-20-120000-000aa.json', prev = 'hesab-auto-1405-06-20-090000-000bb.json', ref = 'hesab-auto-1405-06-19-120000-000cc.json';
      reset({ [nw]: { data: 'TkVX', modified: 100 }, [prev]: { data: OLD, modified: 900 }, [ref]: { data: REF, modified: 950 } });
      let s = snaps([nw, ref]); await pruneAutoBackups(NF, false, nw);
      out.older = { keep: sameAll([nw, ref], s), dels: __dels() , prev };
      /* ب) تساوی کامل modified بین تازه و قبلی‌های همان روز */
      reset({ [nw]: { data: 'TkVX', modified: 500 }, [prev]: { data: OLD, modified: 500 }, [ref]: { data: REF, modified: 500 } });
      s = snaps([nw, ref]); await pruneAutoBackups(NF, false, nw);
      out.equal = { keep: sameAll([nw, ref], s), dels: __dels(), prev };
      /* ج) تساوی کلید نام (نام قدیمی بدون ساعت = ابتدای روز) با فایل تازهٔ ۰۰۰۰۰۰: هر دو نگه داشته می‌شوند (محافظه‌کارانه) */
      const tieNew = 'hesab-auto-1405-06-20-000000-000.json', tieLegacy = 'hesab-auto-1405-06-20.json';
      reset({ [tieNew]: { data: 'TkVX', modified: 1 }, [tieLegacy]: { data: OLD, modified: 999 }, [ref]: { data: REF, modified: 1 } });
      s = snaps([tieNew, tieLegacy, ref]); await pruneAutoBackups(NF, false, tieNew);
      out.tie = { keep: sameAll([tieNew, tieLegacy, ref], s), dels: __dels() };
      /* د) نام‌های قدیمی (بدون ساعت) در برابر زمان‌دار: ۹ روز قدیمی + فایل تازه؛ قدیمیِ همان روز جای تازه را نمی‌گیرد */
      const map = {}; const legacy = [];
      for (let d = 1; d <= 20; d++) { const n = 'hesab-auto-1405-06-' + String(d).padStart(2, '0') + '.json'; legacy.push(n); map[n] = { data: OLD, modified: 3000000000 }; }
      const nw2 = 'hesab-auto-1405-06-20-235900-123xy.json'; map[nw2] = { data: 'TkVX', modified: 0 };
      reset(map); s = snaps([nw2, legacy[18]]); await pruneAutoBackups(NF, false, nw2);
      const dels = __dels();
      /* روزها: ۲۰ (تازه) تا ۱۴ = ۷ روز؛ هفته‌ها از روی تاریخ نام برای ۱۳..۱ (حداکثر ۴ هفته) */
      const weekOf = d => Math.floor((1405 * 372 + 5 * 31 + d) / 7);
      const expectKeep = new Set([nw2]); for (let d = 14; d <= 19; d++) expectKeep.add(legacy[d - 1]);
      const seenW = {}; let nwk = 0; for (let d = 13; d >= 1; d--) { const w = weekOf(d); if (!seenW[w] && nwk < 4) { seenW[w] = 1; nwk++; expectKeep.add(legacy[d - 1]); } }
      const expectDel = legacy.filter(n => !expectKeep.has(n)).sort();
      out.legacy = { keep: sameAll([nw2, legacy[18]], s), dels: dels.slice().sort(), expectDel, legacySameDayDeleted: dels.indexOf(legacy[19]) >= 0, newDeleted: dels.indexOf(nw2) >= 0, kept: Object.keys(__files).length, expectKept: expectKeep.size };
      /* ه) استخرها: هرس رمزدار به بی‌رمزها دست نمی‌زند و برعکس */
      const pm = {}, encOld = [], plainOld = [];
      for (let d = 1; d <= 15; d++) { const dd = String(d).padStart(2, '0'); const p = 'hesab-auto-1405-05-' + dd + '-120000-000aa.json', e = 'hesab-auto-1405-05-' + dd + '-120000-000aa-enc.json'; plainOld.push(p); encOld.push(e); pm[p] = { data: OLD, modified: 5 }; pm[e] = { data: OLD, modified: 5 }; }
      const newEnc = 'hesab-auto-1405-06-20-120000-000zz-enc.json'; pm[newEnc] = { data: 'RU5D', modified: 0 };
      reset(pm); s = snaps(plainOld.concat([newEnc])); await pruneAutoBackups(NF, true, newEnc);
      const d1 = __dels();
      out.poolEnc = { plainUntouched: sameAll(plainOld.concat([newEnc]), s), onlyEnc: d1.length > 0 && d1.every(n => /-enc\.json$/.test(n)) };
      const newPlain = 'hesab-auto-1405-06-20-120000-000zz.json'; pm[newPlain] = { data: 'UExO', modified: 0 }; delete pm[newEnc];
      reset(pm); s = snaps(encOld.concat([newPlain])); await pruneAutoBackups(NF, false, newPlain);
      const d2 = __dels();
      out.poolPlain = { encUntouched: sameAll(encOld.concat([newPlain]), s), onlyPlain: d2.length > 0 && d2.every(n => !/-enc\.json$/.test(n)) };
      /* و) نام‌های نامعتبر و فایل‌های دستی، حتی اگر فهرست آن‌ها را برگرداند */
      const bad = ['hesab-auto-backup-final.json', 'hesab-auto-1405-6-1.json', 'hesab-auto-1405-06-01-1200.json', 'hesab-safety-old.json', 'hesab-auto-1405-06-01 (1).json'];
      const manual = ['hesab-ketab-backup-1405-06-01.json', 'my-backup.json', '../hesab-auto-1405-06-01.json'];
      const bm = {}; bad.forEach(n => { bm[n] = { data: OLD, modified: 1 }; }); manual.forEach(n => { bm[n] = { data: OLD, modified: 1 }; });
      const nw3 = 'hesab-auto-1405-06-20-120000-000qq.json'; bm[nw3] = { data: 'TkVX', modified: 0 };
      reset(bm); __nf.listExtra = manual.concat(['hesab-auto-1405-06-01 (1).json']);
      s = snaps(bad.concat(manual, [nw3])); await pruneAutoBackups(NF, false, nw3);
      out.invalid = { allSame: sameAll(bad.concat(manual, [nw3]), s), dels: __dels() };
      return out;
    }, [REF, OLD]);
    ok(r.older.keep && r.older.dels.length === 1 && r.older.dels[0] === r.older.prev, 'modified فایل تازه قدیمی‌تر از مرجع و قبلی: تازه و مرجع با همان شناسه و محتوا ماندند؛ فقط قبلیِ همان روز حذف شد');
    ok(r.equal.keep && r.equal.dels.length === 1 && r.equal.dels[0] === r.equal.prev, 'modified برابر: ترتیب از روی زمان نام؛ تازه و مرجع ماندند، قبلیِ همان روز حذف شد');
    ok(r.tie.keep && r.tie.dels.length === 0, 'کلید نام برابر (نام قدیمی بدون ساعت با تازهٔ ۰۰۰۰۰۰): هیچ‌کدام حذف نشد؛ تازه صریحاً نگه داشته شد');
    ok(r.legacy.keep && !r.legacy.newDeleted && r.legacy.legacySameDayDeleted, 'نام قدیمیِ همان روز (modified بزرگ) حذف شد و فایل تازه (modified=0) ماند؛ مرجعِ دیروز با همان شناسه و محتوا ماند');
    ok(JSON.stringify(r.legacy.dels) === JSON.stringify(r.legacy.expectDel) && r.legacy.kept === r.legacy.expectKept, 'سیاست نگهداری حفظ شد: ۷ روز آخر + حداکثر ۴ هفته از روی تاریخ نام (' + r.legacy.kept + ' فایل ماند)');
    ok(r.poolEnc.plainUntouched && r.poolEnc.onlyEnc, 'هرس رمزدار: بی‌رمزها و فایل تازهٔ رمزدار دست نخوردند؛ فقط رمزدارهای قدیمی حذف شدند');
    ok(r.poolPlain.encUntouched && r.poolPlain.onlyPlain, 'هرس بی‌رمز: رمزدارها و فایل تازهٔ بی‌رمز دست نخوردند؛ فقط بی‌رمزهای قدیمی حذف شدند');
    ok(r.invalid.allSame && r.invalid.dels.length === 0, 'نام‌های نامعتبر، فایل‌های دستی و نام بیرون از پوشه حتی اگر در فهرست باشند حذف نشدند');
    await X.ctx.close();
  }

  console.log('• ۵) مسیر واقعی رمزدار: فایل تازهٔ رمزدار با modified=0 حذف نمی‌شود و باز می‌شود؛ بی‌رمزها دست نمی‌خورند');
  {
    const X = await fresh(b);
    const r = await X.page.evaluate(async ([PW, REF, OLD]) => {
      const code = hkGenRecoveryCode();
      const act = await hkAutoEncActivate(PW, code);
      Object.keys(__files).forEach(k => delete __files[k]); __log.length = 0;
      const today = _bkStamp().day;
      const prevEnc = 'hesab-auto-' + today + '-000001-000aa-enc.json', refEnc = 'hesab-auto-' + __dayMinus(1) + '-120000-000bb-enc.json', plain = 'hesab-auto-' + today + '-000001-000aa.json';
      __files[prevEnc] = { id: 1, data: OLD, modified: 4000000000 }; __files[refEnc] = { id: 2, data: REF, modified: 4000000000 }; __files[plain] = { id: 3, data: OLD, modified: 1 };
      const sRef = __snap(refEnc), sPlain = __snap(plain);
      __nf.newModified = 0;
      const w = await writeAutoBackup('daily');
      const nn = __newName();
      let opened = false;
      try { const env = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(__files[nn].data), c => c.charCodeAt(0)))); const st = hkAutoEncState(); opened = (await hkEncOpen(env, _bytesFromB64(st.dek))).indexOf('SYN_PRUNE_MARKER_ROW') >= 0; } catch (e) { opened = false; }
      return { act, w, enc: /-enc\.json$/.test(nn), newKept: !!__files[nn] && __files[nn].data === __saved[nn] && __files[nn].modified === 0, opened, refSame: __same(refEnc, sRef), plainSame: __same(plain, sPlain), dels: __dels(), prevEnc };
    }, [PW, REF, OLD]);
    ok(r.act && r.w === true && r.enc && r.newKept && r.opened, 'فایل تازهٔ رمزدار با همان شناسه و محتوا ماند و با کلید باز می‌شود');
    ok(r.refSame && r.plainSame && r.dels.length === 1 && r.dels[0] === r.prevEnc, 'مرجع رمزدار و فایل بی‌رمز همان روز دست نخوردند؛ فقط رمزدارِ قدیمی‌ترِ همان روز حذف شد');
    await X.ctx.close();
  }

  /* ---------- L2: هشدار کلید قبلی ---------- */
  console.log('• ۶) هشدار کلید قبلی در راه‌اندازی اول و «تنظیم دوباره»، با امکان انصراف');
  {
    const X = await fresh(b);
    const openSetup = () => X.page.evaluate(() => new Promise(res => {
      askBackupParts();
      setTimeout(() => { const btn = document.getElementById('bkEncFix') || document.getElementById('bkEncBtn'); const label = btn && btn.textContent.trim(); if (btn) btn.click();
        setTimeout(() => res({ label, prior: !!document.getElementById('bkEncPriorTxt'), priorTxt: (document.getElementById('bkEncPriorTxt') || {}).textContent || '',
          form: !!document.getElementById('bkEncPw1'), formTxt: ((document.querySelector('#bkEncSetup .backup-pick-title .hk-info-btn') || { getAttribute: () => '' }).getAttribute('data-tip') || '') }), 300); }, 300);
    }));
    const WARN = ['پشتیبان‌های رمزدارِ قبلی با رمز و کد جدید باز نمی‌شوند', 'همان رمز پشتیبان یا کد بازیابیِ قبلی لازم است', 'رمز و کد قبلی را جایگزین نمی‌کند', 'فایل‌های قبلی را دوباره رمزنگاری نمی‌کند'];
    const hasAll = t => WARN.every(w => t.indexOf(w) >= 0);
    const first = await openSetup();
    ok(first.label === 'خاموش' && !first.prior && first.form && hasAll(first.formTxt), 'راه‌اندازی اول: فرم با همان متن قبلی و بند هشدار کلید قبلی نمایش داده شد (بدون پنجرهٔ اضافی)');
    ok(['اگر هر دو را گم کنید', 'پشتیبان‌های بی‌رمز قبلی خودبه‌خود پاک نمی‌شوند', 'قفل برنامه و قفل گوشی', 'رمز پشتیبان» یا «کد بازیابی» لازم است'].every(t => first.formTxt.indexOf(t) >= 0), 'متن‌های قبلی راه‌اندازی حذف یا کم نشده‌اند');
    await X.page.evaluate(() => { document.getElementById('bkEncCancel').click(); });
    /* کلید فعال بساز، بعد حالت «کلید محلی ناسالم» (روشن ولی رکورد نامعتبر) */
    const pre = await X.page.evaluate(async PW => {
      document.querySelectorAll('.backup-pick-overlay').forEach(o => o.remove());
      const ok1 = await hkAutoEncActivate(PW, hkGenRecoveryCode());
      const rec = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'));
      rec.wraps = rec.wraps.filter(w => w.type !== 'recovery');       /* ناسالم ولی موجود */
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', JSON.stringify(rec));
      __files['hesab-auto-1405-06-01-120000-000aa-enc.json'] = { id: 77, data: 'T0xERU5D', modified: 1 };
      return { ok1, broken: !!(hkAutoEncState() || {}).broken };
    }, PW);
    const lsBefore = await X.page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])); });
    const re = await openSetup();
    ok(pre.ok1 && pre.broken && re.label === 'تنظیم دوباره…' && re.prior && !re.form && hasAll(re.priorTxt) && /کلید قبلیِ ذخیره‌شده روی همین گوشی هم جایگزین می‌شود/.test(re.priorTxt) && /هیچ فایل پشتیبانی پاک نمی‌شود/.test(re.priorTxt), '«تنظیم دوباره»: پیش از فرم رمز، پنجرهٔ هشدار کامل نمایش داده شد');
    const cancelled = await X.page.evaluate(() => new Promise(res => { document.getElementById('bkEncPriorCancel').click(); setTimeout(() => {
      const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
      res({ gone: !document.getElementById('bkEncSetup'), ls: JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])), file: !!__files['hesab-auto-1405-06-01-120000-000aa-enc.json'], dels: __log.filter(x => x.indexOf('del:') === 0).length });
    }, 300); }));
    ok(cancelled.gone && cancelled.ls === lsBefore && cancelled.file && cancelled.dels === 0, 'انصراف در پنجرهٔ هشدار: هیچ تغییری در حافظه (کلید قبلی دست‌نخورده) و هیچ فایلی پاک نشد');
    await X.page.evaluate(() => document.querySelectorAll('.backup-pick-overlay').forEach(o => o.remove()));
    const re2 = await openSetup();
    /* از ۴.۵: پس از «ادامه»، رمز قبلی باید واقعاً آزموده شود؛ بعد فرم باز می‌شود */
    const goForm = await X.page.evaluate(PW => new Promise(res => { document.getElementById('bkEncPriorGo').click(); setTimeout(() => { document.getElementById('bkEncGIn').value = PW; document.getElementById('bkEncGByPw').click();
      (function wait(t0) { if (!document.getElementById('bkEncPw1') && Date.now() - t0 < 20000) return setTimeout(() => wait(t0), 150); res({ form: !!document.getElementById('bkEncPw1'), txt: ((document.querySelector('#bkEncSetup .backup-pick-title .hk-info-btn') || { getAttribute: () => '' }).getAttribute('data-tip') || '') }); })(Date.now()); }, 200); }), PW);
    ok(re2.prior && goForm.form && hasAll(goForm.txt), 'ادامه: فرم رمز همراه با بند هشدار باز شد');
    const cancel2 = await X.page.evaluate(() => new Promise(res => { document.getElementById('bkEncCancel').click(); setTimeout(() => {
      const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
      res(JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]))); }, 300); }));
    ok(cancel2 === lsBefore, 'انصراف در فرم رمز پس از هشدار: کلید قبلی و وضعیت بدون تغییر');
    /* پس از خاموش‌کردن (کلید محلی برداشته شده) هم هشدار نشان داده می‌شود، چون قبلاً روشن بوده */
    const off = await X.page.evaluate(() => { document.querySelectorAll('.backup-pick-overlay').forEach(o => o.remove()); localStorage.removeItem('hesabKetabArchive_v5_autoBkEnc'); const s = autoBkState(); s.encEnabled = false; autoBkSave(s); return { st: hkAutoEncState(), ever: autoBkState().encEverEnabled }; });
    const afterOff = await openSetup();
    ok(off.st === null && off.ever === true && afterOff.label === 'خاموش' && afterOff.prior && hasAll(afterOff.priorTxt), 'پس از خاموش‌کردن، فعال‌سازی دوباره هم پنجرهٔ هشدار کلید قبلی را نشان داد');
    await X.ctx.close();
  }

  await b.close();
  ok(allErrors.length === 0, 'هیچ خطای JS در صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  console.log('\nautobackup-prune: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
