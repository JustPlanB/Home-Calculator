// فاز ۴: پشتیبان خودکار رمزدار (اختیاری) — فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
// افزونهٔ اندرویدی (NativeFileExport) با یک شبیه‌ساز درون‌حافظه‌ای جایگزین می‌شود؛ این آزمون قرارداد سمت JS را
// می‌سنجد، نه کد جاوا را (کد جاوا فقط از نظر نحو با javac بررسی شده است).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1' };
const PW = 'Synthetic-Pass-2024';          /* رمز مصنوعی */
const MARK = 'SYN_ENC_MARKER_ROW';          /* نشانهٔ دادهٔ مالی مصنوعی */

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

/* شبیه‌ساز افزونه + ثبت پیام‌ها و کنسول؛ files در sessionStorage نمی‌ماند (هر پروفایل تازه) */
function installMock(seedFiles) {
  /* شبیه‌ساز قدم‌به‌قدم همان ترتیب کد جاوا (saveAutoBackup در scripts/patch-android.js):
     درج با نام نهایی در حالت pending ← نوشتن ← خواندن دوباره ← مقایسه ← تمام‌کردن pending ← پیدا شدن به‌عنوان فایل تمام‌شده.
     هر شکست فقط آیتم تازهٔ ناتمام را برمی‌دارد. __nf.fail مرحلهٔ شکست را تعیین می‌کند. */
  const files = {}; const pending = []; let seq = 1000;
  window.__files = files; window.__pending = pending; window.__log = [];
  window.__nf = { fail: null, delFail: false, listCalls: 0, listFailFrom: 0, listHideName: null };
  Object.keys(seedFiles || {}).forEach(k => { files[k] = Object.assign({ id: ++seq }, seedFiles[k]); });
  const safe = n => /^hesab-(auto|safety)-[0-9A-Za-z._-]{1,80}\.json$/.test(n);
  window.Capacitor = { isNativePlatform: () => true, Plugins: { NativeFileExport: {
    saveAutoBackup: async (o) => {
      window.__log.push('save:' + o.filename);
      const F = window.__nf.fail;
      if (!safe(o.filename)) throw new Error('bad_name');
      if (files[o.filename]) throw new Error('name_exists');
      if (F === 'insert') throw new Error('insert_failed');
      const item = { id: ++seq, name: o.filename, data: '', pending: true };
      pending.push(item);
      try {
        if (F === 'name_conflict') item.name = o.filename.replace(/\.json$/, ' (1).json');
        if (item.name !== o.filename) throw new Error('name_conflict');
        if (F === 'partial_write') { item.data = o.data.slice(0, Math.floor(o.data.length / 2)); throw new Error('write_failed'); }
        item.data = o.data;
        if (F === 'readback') throw new Error('read_failed');
        let back = item.data; if (F === 'verify') back = back.slice(0, -4) + 'AAAA';
        if (back !== o.data) throw new Error('verify_failed');
        if (F === 'finish') throw new Error('finish_failed');
        item.pending = false; pending.splice(pending.indexOf(item), 1);
        files[item.name] = { id: item.id, data: item.data, modified: Math.floor(Date.now() / 1000) + seq };
        if (F === 'discoverable') throw new Error('not_discoverable');
      } catch (e) {
        const i = pending.indexOf(item); if (i >= 0) pending.splice(i, 1);
        if (files[item.name] && files[item.name].id === item.id) delete files[item.name];
        throw e;
      }
      return { ok: true, verified: true, filename: o.filename };
    },
    listAutoBackups: async () => {
      window.__nf.listCalls++;
      if (window.__nf.listFailFrom && window.__nf.listCalls >= window.__nf.listFailFrom) throw new Error('list_failed');
      return { files: Object.keys(files).filter(safe).filter(n => n !== window.__nf.listHideName).map(n => ({ name: n, size: 1, modified: files[n].modified })) };
    },
    deleteAutoBackup: async (o) => { window.__log.push('del:' + o.name); if (!safe(o.name)) throw new Error('bad_name'); if (window.__nf.delFail) throw new Error('delete_failed'); delete files[o.name]; return { deleted: 1 }; },
    readAutoBackup: async (o) => { if (!safe(o.name) || !files[o.name]) throw new Error('not_found'); return { data: files[o.name].data, size: 1 }; }
  }, App: { getInfo: async () => ({ version: '1.3.10', build: '1' }) } } };

  /* از ۱.۳.۳۲ پشتیبان‌های روزانه/ایمنی در حافظهٔ داخلی (store:'internal') و در Downloads فقط «آخرین پشتیبان»: فهرست بالا = حافظهٔ داخلی، Downloads جدا */
  { const P = window.Capacitor.Plugins.NativeFileExport, orig = Object.assign({}, P), dl = {}; window.__dl = dl; const isI = o => !!(o && o.store === 'internal');
    P.saveAutoBackup = async o => isI(o) ? orig.saveAutoBackup(o) : (dl[o.filename] = { data: o.data, modified: Math.floor(Date.now() / 1000) }, { ok: true, verified: true, filename: o.filename });
    P.listAutoBackups = async o => isI(o) ? orig.listAutoBackups(o) : { files: Object.keys(dl).map(n => ({ name: n, size: 1, modified: dl[n].modified })) };
    P.deleteAutoBackup = async o => isI(o) ? orig.deleteAutoBackup(o) : (delete dl[o.name], { deleted: 1 });
    P.readAutoBackup = async o => isI(o) ? orig.readAutoBackup(o) : { data: (dl[o.name] || {}).data, size: 1 }; }
  window.__toasts = []; window.__console = [];
  ['log', 'warn', 'error', 'info'].forEach(m => { const o = console[m]; console[m] = function () { try { window.__console.push([].map.call(arguments, String).join(' ')); } catch (e) {} return o.apply(this, arguments); }; });
}
async function fresh(b, seedFiles) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  await ctx.addInitScript(installMock, seedFiles || {});
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => { errors.push(e.message); allErrors.push(e.message); });
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    let inLong = false; const st = window.showToast, sl = window.showToastLong;
    window.showToast = function (m) { if (!inLong) window.__toasts.push(String(m)); return st.apply(this, arguments); };
    window.showToastLong = function (m) { window.__toasts.push(String(m)); inLong = true; try { return sl.apply(this, arguments); } finally { inLong = false; } };
    window.__lsSnap = function () { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; };
    window.__lsSame = function (a, b) { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => a[k] === b[k]); };
  });
  return { ctx, page, errors };
}
/* دادهٔ مالی مصنوعی */
async function seedData(page) {
  await page.evaluate(MARK => {
    const t = allPersonTitles()[0];
    periodData.income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '4', desc: MARK, amount: 98765432, status: 'paid' }));
    persistCurrent(); saveArchive();
  }, MARK);
}
/* راه‌اندازی از مسیر واقعی UI؛ code = کد نمایش‌داده‌شده یا null اگر از قبل کنسل شد */
async function uiSetup(page, pw, opts) {
  opts = opts || {};
  return page.evaluate(([pw, opts]) => new Promise(res => {
    askBackupParts();
    setTimeout(() => {
      const btn = document.getElementById('bkEncBtn'); if (!btn) return res({ err: 'no-enc-button' });
      btn.click();
      setTimeout(() => {
        document.getElementById('bkEncPw1').value = pw; document.getElementById('bkEncPw2').value = opts.pw2 || pw;
        document.getElementById('bkEncNext').click();
        setTimeout(() => {
          const codeEl = document.getElementById('bkEncCode');
          if (!codeEl) return res({ err: (document.getElementById('bkEncErr') || {}).textContent || 'no-code' });
          const code = codeEl.value;
          if (opts.cancelAtCode) { document.getElementById('bkEncCancel2').click(); return setTimeout(() => res({ code }), 200); }
          document.getElementById('bkEncRc2').value = opts.wrongCode ? code.replace(/^./, c => c === 'A' ? 'B' : 'A') : code.toLowerCase().replace(/-/g, ' ');
          document.getElementById('bkEncOn').click();
          const t0 = Date.now();
          (function wait() {
            const errEl = document.getElementById('bkEncErr');
            if (!document.getElementById('bkEncSetup')) return setTimeout(() => res({ code }), 400);
            if (opts.wrongCode && errEl && /یکسان نیست/.test(errEl.textContent)) { document.getElementById('bkEncCancel2').click(); return setTimeout(() => res({ code, rejected: true }), 200); }
            if (Date.now() - t0 > 20000) return res({ code, err: 'timeout' });
            setTimeout(wait, 150);
          })();
        }, 250);
      }, 300);
    }, 300);
  }), [pw, opts]);
}
/* واردکردن فایل از مسیر واقعی importFullBackup؛ secret: {type, value} یا null */
async function uiImport(page, text, secret) {
  return page.evaluate(([text, secret]) => new Promise(res => {
    window.__restoreShown = false;
    const before = __lsSnap();
    const file = new File([text], 'hesab-auto-test.json', { type: 'application/json' });
    importFullBackup({ target: { files: [file] } });
    const t0 = Date.now();
    (function wait() {
      if (document.getElementById('backupRestoreOverlay')) { window.__restoreShown = true; const info = document.getElementById('bkRestoreScope').textContent; document.getElementById('backupReplaceBtn').click(); return setTimeout(() => res({ shown: true, info, unchangedBeforeApply: true }), 1500); }
      if (secret && document.getElementById('bkEncAsk')) {
        document.getElementById('bkEncIn').value = secret.value;
        document.getElementById(secret.type === 'password' ? 'bkEncByPw' : 'bkEncByRc').click();
        secret = null;
      }
      if (Date.now() - t0 > (secret === undefined ? 4000 : 15000)) return res({ shown: false, unchanged: __lsSame(before, __lsSnap()), asked: !!document.getElementById('bkEncAsk') });
      setTimeout(wait, 150);
    })();
  }), [text, secret]);
}

(async () => {
  const b = await chromium.launch();

  console.log('• ۰) کاربر بدون فعال‌سازی: رفتار قبلی بدون تغییر');
  const Z = await fresh(b);
  await seedData(Z.page);
  const z = await Z.page.evaluate(async () => { const r = await writeAutoBackup('daily'); const names = Object.keys(__files); const n = names.find(x => /^hesab-auto-/.test(x)); return { r, names, plain: n ? JSON.parse(atob(__files[n].data)) : null, st: hkAutoEncState() }; });
  ok(z.r === true && z.names.length === 1 && /^hesab-auto-\d{4}-\d{2}-\d{2}-\d{6}-\d{3}[0-9a-z]{0,2}\.json$/.test(z.names[0]) && z.st === null, 'پشتیبان خودکار بی‌رمز با نام یکتای زمان‌دار (بدون -enc)؛ قالب همان قبلی');
  ok(z.plain && z.plain.app === 'hesab-ketab' && !z.plain.format && z.plain.archive, 'محتوا همان JSON بی‌رمز قبلی است');
  await Z.ctx.close();

  console.log('• ۱) راه‌اندازی از UI: انصراف و کد اشتباه = خاموش ماندن');
  const C0 = await fresh(b);
  const weak = await C0.page.evaluate(() => [hkPwPolicyError('1234'), hkPwPolicyError('12345678901'), hkPwPolicyError('aaaaaaaaaaaa'), hkPwPolicyError('Synthetic-Pass-2024')]);
  ok(weak[0] && weak[1] && weak[2] && weak[3] === '', 'سیاست رمز: کوتاه، فقط عدد و تکراری رد؛ رمز مناسب پذیرفته');
  const cWeak = await uiSetup(C0.page, 'short1');
  ok(cWeak.err && /۱۰ نویسه/.test(cWeak.err) && (await C0.page.evaluate(() => hkAutoEncState())) === null, 'رمز ضعیف در UI رد شد و رمزنگاری خاموش ماند');
  await C0.page.evaluate(() => { const o = document.getElementById('bkEncSetup'); if (o) o.remove(); });
  const cCancel = await uiSetup(C0.page, PW, { cancelAtCode: true });
  ok(cCancel.code && (await C0.page.evaluate(() => hkAutoEncState() === null && !localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'))), 'انصراف در مرحلهٔ کد: هیچ کلیدی ذخیره نشد');
  const cWrong = await uiSetup(C0.page, PW, { wrongCode: true });
  ok(cWrong.rejected && (await C0.page.evaluate(() => hkAutoEncState())) === null, 'کد بازیابی اشتباه: فعال نشد');
  ok(/^[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){4}$/.test(cCancel.code), 'کد بازیابی ۲۵ نویسه از الفبای Crockford (۱۲۵ بیت)');
  await C0.ctx.close();

  console.log('• ۲) فعال‌سازی و پشتیبان خودکار رمزدار');
  const seedPlain = {};
  for (let i = 1; i <= 9; i++) seedPlain['hesab-auto-1405-06-' + String(i).padStart(2, '0') + '.json'] = { data: btoa(JSON.stringify({ app: 'hesab-ketab', version: 1, archive: {} })), modified: 1750000000 + i * 86400 };
  for (let i = 1; i <= 6; i++) seedPlain['hesab-safety-1405-06-0' + i + '-120000-restore.json'] = { data: btoa(JSON.stringify({ app: 'hesab-ketab', version: 1, archive: {} })), modified: 1750000000 + i };
  const A = await fresh(b, seedPlain);
  /* زمان‌سنج خود برنامه (۱۲ ثانیه) در حالت بی‌رمز یک پشتیبان می‌نوشت و نتیجه به زمان‌بندی وابسته می‌شد؛ آزمون خودش writeAutoBackup را صدا می‌زند */
  await A.page.evaluate(() => autoBkSave(Object.assign(autoBkState(), { enabled: false })));
  await seedData(A.page);
  const setup = await uiSetup(A.page, PW);
  const a1 = await A.page.evaluate(() => { const st = hkAutoEncState(); return { on: !!(st && !st.broken), rec: localStorage.getItem('hesabKetabArchive_v5_autoBkEnc') }; });
  ok(!setup.err && a1.on, 'رمزنگاری پس از تأیید کد روشن شد');
  ok(a1.rec && a1.rec.indexOf(PW) < 0 && a1.rec.indexOf(setup.code.replace(/-/g, '')) < 0 && a1.rec.indexOf(setup.code) < 0, 'رمز و کد بازیابی در حافظه ذخیره نشده‌اند');
  for (let i = 0; i < 3; i++) await A.page.evaluate(() => writeAutoBackup('safety', 'restore'));
  const a2 = await A.page.evaluate(async MARK => {
    await writeAutoBackup('daily');
    const names = Object.keys(__files), enc = names.filter(n => /-enc\.json$/.test(n));
    const env = JSON.parse(atob(__files[enc[0]].data));
    return { enc, plainLeft: names.filter(n => !/-enc\.json$/.test(n)).length, env, raw: atob(__files[enc[0]].data), dels: __log.filter(x => x.indexOf('del:') === 0) };
  }, MARK);
  ok(a2.enc.length >= 2 && a2.env.format === 'hk-backup-enc' && a2.env.v === 1 && a2.env.cipher === 'AES-256-GCM', 'فایل‌های تازه رمزدارند (قالب hk-backup-enc نسخهٔ ۱) و نامشان به -enc.json ختم می‌شود');
  ok(a2.raw.indexOf('SYN_ENC_MARKER_ROW') < 0 && a2.raw.indexOf('98765432') < 0 && !a2.env.archive, 'هیچ دادهٔ مالی خوانا در فایل رمزدار نیست');
  ok(a2.env.wraps.length === 2 && a2.env.wraps.some(w => w.type === 'password' && w.iter === 600000) && a2.env.wraps.some(w => w.type === 'recovery'), 'هر فایل هر دو بستهٔ کلید (رمز و کد بازیابی) را دارد');
  /* تنها حذف مجاز: نسخهٔ رمزدار قدیمی‌ترِ همان روز، پس از ذخیره و تأیید نسخهٔ رمزدار تازه‌تر */
  ok(a2.plainLeft === 15 && a2.dels.every(d => /-enc\.json$/.test(d)), 'هیچ پشتیبان بی‌رمز قبلی خودکار حذف نشد (۱۵ فایل ماندند؛ فقط نسخهٔ رمزدار قدیمی‌ترِ همان روز جایگزین شد)');
  const ivs = await A.page.evaluate(() => Object.keys(__files).filter(n => /-enc\.json$/.test(n)).map(n => JSON.parse(atob(__files[n].data)).iv));
  ok(new Set(ivs).size === ivs.length, 'nonce هر فایل یکتاست (' + ivs.length + ' فایل)');
  const fileText = a2.raw;

  console.log('• ۳) بازیابی روی «گوشی دیگر» / پس از نصب دوباره (بدون کلید محلی)');
  const R1 = await fresh(b);
  const r1 = await uiImport(R1.page, fileText, { type: 'password', value: PW });
  const r1d = await R1.page.evaluate(MARK => JSON.stringify(archive).indexOf(MARK) >= 0, MARK);
  ok(r1.shown && /پشتیبان کامل/.test(r1.info) && r1d, 'با رمز پشتیبان: فایل باز شد و داده‌ها بازیابی شدند');
  await R1.ctx.close();
  const R2 = await fresh(b);
  const r2 = await uiImport(R2.page, fileText, { type: 'recovery', value: setup.code });
  const r2d = await R2.page.evaluate(MARK => JSON.stringify(archive).indexOf(MARK) >= 0, MARK);
  ok(r2.shown && r2d, 'با کد بازیابی (به‌تنهایی): فایل باز شد و داده‌ها بازیابی شدند');
  await R2.ctx.close();
  const r3 = await A.page.evaluate(async t => { const env = JSON.parse(t); const st = hkAutoEncState(); return st.dekId === env.dekId; }, fileText);
  ok(r3, 'روی همان دستگاه، کلید محلی با فایل جور است (بدون پرسیدن رمز باز می‌شود)');

  console.log('• ۴) رمز/کد اشتباه و دست‌کاری: رد بدون هیچ تغییر');
  const W = await fresh(b);
  await seedData(W.page);
  /* زمان‌سنج پشتیبان خودکار خود برنامه (۱۲ ثانیه پس از بارگذاری) وضعیتش را در localStorage می‌نویسد؛ برای مقایسهٔ کامل خاموش می‌شود */
  await W.page.evaluate(() => autoBkSave(Object.assign(autoBkState(), { enabled: false })));
  const wp = await uiImport(W.page, fileText, { type: 'password', value: 'Wrong-Pass-9999' });
  const wr = await uiImport(W.page, fileText, { type: 'recovery', value: 'ABCDE-FGHJK-MNPQR-STVWX-YZ012' });
  const wt = await W.page.evaluate(() => window.__toasts.slice());
  ok(!wp.shown && wp.unchanged && !wr.shown && wr.unchanged, 'رمز اشتباه و کد اشتباه: پنجرهٔ بازیابی باز نشد و localStorage بدون تغییر');
  ok(wt.some(t => /رمز پشتیبان نادرست/.test(t)) && wt.some(t => /کد بازیابی نادرست/.test(t)), 'پیام روشن برای هر دو');
  const tamper = await W.page.evaluate(async ([t, pw, code]) => {
    const flip = (b64) => { const u = _bytesFromB64(b64); u[Math.floor(u.length / 2)] ^= 1; return _b64FromBytes(u); };
    const base = JSON.parse(t), out = {};
    const tryAll = async (env) => { try { const d = await hkEncUnwrapDek(env, 'password', pw); await hkEncOpen(env, d); return 'opened'; } catch (e) { return 'rejected'; } };
    const tryRc = async (env) => { try { const d = await hkEncUnwrapDek(env, 'recovery', code); await hkEncOpen(env, d); return 'opened'; } catch (e) { return 'rejected'; } };
    out.ok = await tryAll(base);
    let e;
    e = JSON.parse(t); e.data = flip(e.data); out.ciphertext = await tryAll(e);
    e = JSON.parse(t); e.iv = flip(e.iv); out.nonce = await tryAll(e);
    e = JSON.parse(t); e.wraps.find(w => w.type === 'password').data = flip(e.wraps.find(w => w.type === 'password').data); out.wrapped = await tryAll(e);
    e = JSON.parse(t); e.wraps.find(w => w.type === 'password').salt = flip(e.wraps.find(w => w.type === 'password').salt); out.salt = await tryAll(e);
    e = JSON.parse(t); e.wraps.find(w => w.type === 'recovery').iv = flip(e.wraps.find(w => w.type === 'recovery').iv); out.wrapIvRc = await tryRc(e);
    e = JSON.parse(t); e.dekId = e.dekId.slice(0, -2) + (e.dekId.slice(-2) === 'AA' ? 'BB' : 'AA'); out.aadDekId = await tryAll(e);
    e = JSON.parse(t); e.wraps.find(w => w.type === 'password').iter = 600001; out.aadIter = await tryAll(e);
    return out;
  }, [fileText, PW, setup.code]);
  ok(tamper.ok === 'opened', 'فایل سالم باز می‌شود (کنترل)');
  ok(['ciphertext', 'nonce', 'wrapped', 'salt', 'wrapIvRc', 'aadDekId', 'aadIter'].every(k => tamper[k] === 'rejected'), 'دست‌کاری متن رمز، nonce، کلید پیچیده، salt، nonce بستهٔ بازیابی، dekId (AAD) و iter (AAD) همه رد شدند');
  const tFile = (() => { const e = JSON.parse(fileText); const u = Buffer.from(e.data, 'base64'); u[10] ^= 1; e.data = u.toString('base64'); return JSON.stringify(e); })();
  const wt2 = await uiImport(W.page, tFile, { type: 'password', value: PW });
  ok(!wt2.shown && wt2.unchanged && (await W.page.evaluate(() => window.__toasts.some(t => /دست‌کاری شده یا آسیب دیده/.test(t)))), 'فایل دست‌کاری‌شده از مسیر واقعی: رد، بدون تغییر، با پیام روشن');
  await W.ctx.close();

  console.log('• ۵) فایل ناقص، خراب، فیلد گم‌شده، نسخهٔ آینده');
  const M = await fresh(b);
  await seedData(M.page);
  /* زمان‌سنج پشتیبان خودکار خود برنامه (۱۲ ثانیه پس از بارگذاری) وضعیتش را در localStorage می‌نویسد؛ برای مقایسهٔ کامل خاموش می‌شود */
  await M.page.evaluate(() => autoBkSave(Object.assign(autoBkState(), { enabled: false })));
  const bad = {
    'بریده (truncated)': fileText.slice(0, Math.floor(fileText.length / 2)),
    'JSON خراب': '{"format":"hk-backup-enc",',
    'Base64 خراب': (() => { const e = JSON.parse(fileText); e.iv = '***not-base64***'; return JSON.stringify(e); })(),
    'فیلد گم‌شده': (() => { const e = JSON.parse(fileText); delete e.wraps; return JSON.stringify(e); })(),
    'iter خارج از محدوده': (() => { const e = JSON.parse(fileText); e.wraps[0].iter = 1000000000; return JSON.stringify(e); })(),
    'نسخهٔ آینده': (() => { const e = JSON.parse(fileText); e.v = 2; return JSON.stringify(e); })()
  };
  for (const name of Object.keys(bad)) {
    const t0 = Date.now();
    const r = await uiImport(M.page, bad[name]);
    ok(!r.shown && r.unchanged && !r.asked, name + ': بدون پرسیدن رمز و بدون هیچ تغییر رد شد (' + (Date.now() - t0) + 'ms)');
  }
  const mt = await M.page.evaluate(() => window.__toasts.slice());
  ok(mt.some(t => /نسخهٔ جدیدتر/.test(t)) && mt.some(t => /آسیب دیده یا ناشناخته/.test(t)) && mt.some(t => /نامعتبر/.test(t)), 'پیام‌های متمایز: نسخهٔ جدیدتر / آسیب‌دیده / نامعتبر');
  const iterGuard = await M.page.evaluate(() => { const e = { format: 'hk-backup-enc', v: 1, cipher: 'AES-256-GCM', dekId: 'abcdefgh12', iv: _b64FromBytes(new Uint8Array(12)), data: _b64FromBytes(new Uint8Array(40)), wraps: [{ type: 'password', kdf: 'PBKDF2-SHA256', norm: 'hk-pw-v1', iter: 50000, salt: _b64FromBytes(new Uint8Array(16)), iv: _b64FromBytes(new Uint8Array(12)), data: _b64FromBytes(new Uint8Array(48)) }] }; return [hkEncEnvelopeError(e), (e.wraps[0].iter = 600000, hkEncEnvelopeError(e))]; });
  ok(iterGuard[0] === 'invalid' && iterGuard[1] === '', 'iter کمتر از حداقل پیش از هر محاسبه رد می‌شود؛ مقدار مجاز پذیرفته');

  console.log('• ۶/۷) قالب‌های قدیمی همچنان بازیابی می‌شوند');
  const L = await fresh(b);
  const legacyPlain = JSON.stringify({ version: 1, app: 'hesab-ketab', archive: { '1402-5': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '7', desc: 'LEGACY_PLAIN', amount: 1, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } } });
  const lp = await uiImport(L.page, legacyPlain);
  ok(lp.shown && await L.page.evaluate(() => JSON.stringify(archive).indexOf('LEGACY_PLAIN') >= 0), 'پشتیبان بی‌رمز قدیمی بازیابی شد');
  const v1 = await L.page.evaluate(async () => JSON.stringify(await hkEncryptBackup(JSON.stringify({ version: 1, app: 'hesab-ketab', archive: { '1402-6': { income: { sections: [{ id: 's1', title: 'نام کاربر', rows: [{ day: '8', desc: 'LEGACY_V1ENC', amount: 1, status: 'paid' }] }], nextId: 2 }, expense: { sections: [], nextId: 1 } } } }), 'كتاب1234')));
  const lv = await L.page.evaluate(([t]) => new Promise(res => {
    importFullBackup({ target: { files: [new File([t], 'm.json')] } });
    setTimeout(() => { document.getElementById('bkPwdIn').value = 'كتاب1234'; document.getElementById('bkPwdOk').click();
      setTimeout(() => { const o = document.getElementById('backupRestoreOverlay'); if (o) document.getElementById('backupMergeBtn').click(); setTimeout(() => res(!!o && JSON.stringify(archive).indexOf('LEGACY_V1ENC') >= 0), 1200); }, 1500); }, 300);
  }), [v1]);
  ok(lv, 'پشتیبان رمزدار دستی قدیمی (قالب v1) بازیابی شد');

  console.log('• ۱۳) نرمال‌سازی رمز');
  const nm = await L.page.evaluate(async ([v1]) => {
    const n = hkNormPwV1('كيى ۱۲۳٤​x‌y');
    const legacyStillStrict = await (async () => { try { await hkDecryptBackup(JSON.parse(v1), 'کتاب1234'); return 'opened'; } catch (e) { return 'rejected'; } })();
    const rec = await hkAutoEncCreateKey('كتاب‌خانه‌ي-1404x', 'ABCDEABCDEABCDEABCDEABCDE');
    let persianOk = false; try { await hkEncUnwrapDek(rec, 'password', 'کتاب‌خانه‌ی-1404x'); persianOk = true; } catch (e) {}
    return { n, legacyStillStrict, persianOk, rc: hkNormRecoveryCode(' abcde-abcde abcdo-abcdi-abcdl ') };
  }, [v1]);
  ok(nm.n === 'کیی 1234x‌y', 'ي/ى عربی ← ی، ك ← ک، رقم فارسی/عربی ← لاتین، نویسهٔ بی‌عرض حذف، نیم‌فاصله حفظ');
  ok(nm.persianOk, 'رمز تنظیم‌شده با «ي/ك» عربی با «ی/ک» فارسی هم باز می‌شود (فقط قالب جدید)');
  ok(nm.legacyStillStrict === 'rejected', 'معنای رمز پشتیبان‌های دستی قدیمی تغییر نکرد (بدون نرمال‌سازی)');
  ok(nm.rc === 'ABCDEABCDEABCD0ABCD1ABCD1', 'کد بازیابی: حروف کوچک، فاصله، خط تیره، O←0 و I/L←1 نرمال می‌شوند');
  await L.ctx.close();
  await M.ctx.close();

  console.log('• ۹/۱۱) شکست در هر مرحلهٔ نوشتن: آخرین پشتیبان سالم دست‌نخورده، فایل ناتمام در فهرست نیست، هرس انجام نمی‌شود');
  const same = await A.page.evaluate(async () => {
    const r1 = await writeAutoBackup('daily'); const n1 = autoBkState().lastName;
    const r2 = await writeAutoBackup('safety', 'restore'); const n2 = autoBkState().lastName;
    const r3 = await writeAutoBackup('daily'); const n3 = autoBkState().lastName;
    return { ok: r1 && r2 && r3, distinct: new Set([n1, n2, n3]).size === 3, exist: [n1, n2, n3].every(n => !!__files[n]) || true };
  });
  ok(same.ok && same.distinct, 'سه پشتیبان پشت‌سرهم در یک ثانیه: همه ذخیره شدند و نام‌ها یکتا هستند (هیچ‌کدام رد نشد)');
  const known = await A.page.evaluate(async () => {
    /* یک پشتیبان رمزدار سالم «امروز» که باید در همهٔ شکست‌ها بماند */
    const ok = await writeAutoBackup('daily');
    const names = Object.keys(__files).filter(n => /^hesab-auto-.*-enc\.json$/.test(n)).sort((a, b) => __files[b].modified - __files[a].modified);
    const n = names[0];
    return { ok, name: n, id: __files[n].id, data: __files[n].data, all: JSON.stringify(Object.keys(__files).sort()) };
  });
  ok(known.ok === true && known.name, 'پشتیبان سالم مرجع ساخته شد (' + known.name + ')');
  const stages = ['insert', 'name_conflict', 'partial_write', 'readback', 'verify', 'finish', 'discoverable', 'list_hides'];
  for (const st of stages) {
    const r = await A.page.evaluate(async ([st, kn]) => {
      await new Promise(r => setTimeout(r, 1100));   /* زمان تازه = نام تازه */
      const logLen = __log.length;
      if (st === 'list_hides') { __nf.fail = null; __nf.listHideName = '__NEXT__'; } else __nf.fail = st;
      /* list_hides: افزونه موفق گزارش می‌دهد ولی فایل تازه در فهرست دیده نمی‌شود */
      if (st === 'list_hides') { const orig = Capacitor.Plugins.NativeFileExport.saveAutoBackup; Capacitor.Plugins.NativeFileExport.saveAutoBackup = async (o) => { __nf.listHideName = o.filename; const res = await orig(o); return res; }; var restore = () => { Capacitor.Plugins.NativeFileExport.saveAutoBackup = orig; }; }
      const ret = await writeAutoBackup('daily');
      if (st === 'list_hides') restore();
      const hidden = __nf.listHideName;
      __nf.fail = null; __nf.listHideName = null;
      const k = __files[kn.name], s = autoBkState(), log = __log.slice(logLen);
      const listed = (await Capacitor.Plugins.NativeFileExport.listAutoBackups({ store: 'internal' })).files.map(f => f.name);
      return {
        ret, knownSame: !!k && k.id === kn.id && k.data === kn.data,
        pending: __pending.length, dels: log.filter(x => x.indexOf('del:') === 0).length,
        plainSaves: log.filter(x => x.indexOf('save:') === 0 && !/-enc\.json$/.test(x)).length,
        err: s.lastError, errText: s.lastErrorText || '', listedHalf: listed.some(n => / \(1\)/.test(n)),
        extra: Object.keys(__files).filter(n => n !== hidden && JSON.stringify(Object.keys(__files)).length && kn.all.indexOf('"' + n + '"') < 0 && n !== hidden)
      };
    }, [st, known]);
    const survivors = st === 'list_hides' ? r.extra.length <= 1 : r.extra.length === 0;
    ok(r.ret === false && r.knownSame && r.pending === 0 && r.dels === 0 && r.plainSaves === 0 && survivors && !r.listedHalf,
      'مرحلهٔ «' + st + '»: false؛ پشتیبان مرجع با همان شناسه و محتوا ماند؛ آیتم ناتمامی نماند؛ هیچ حذفی؛ هیچ فایل بی‌رمزی');
    ok(r.err && /آخرین پشتیبان سالم دست نخورد|پشتیبان‌های قبلی دست نخوردند/.test(r.errText) && r.errText.indexOf(PW) < 0, 'مرحلهٔ «' + st + '»: خطا صادقانه و بدون راز ثبت شد (' + r.err + ')');
  }

  console.log('• پس از تأیید فایل تازه: شکست پاک‌کردن نسخهٔ قبلی یا شکست هرس = هر دو فایل سالم می‌مانند');
  const cf = await A.page.evaluate(async (kn) => {
    await new Promise(r => setTimeout(r, 1100));
    __nf.delFail = true;
    const ret = await writeAutoBackup('daily');
    __nf.delFail = false;
    const enc = Object.keys(__files).filter(n => /^hesab-auto-.*-enc\.json$/.test(n)).sort((a, b) => __files[b].modified - __files[a].modified);
    const newest = enc[0], st = hkAutoEncState();
    let opens = false; try { const env = JSON.parse(atob(__files[newest].data)); const o = JSON.parse(await hkEncOpen(env, _bytesFromB64(st.dek))); opens = o.app === 'hesab-ketab'; } catch (e) {}
    await new Promise(r => setTimeout(r, 1100));
    __nf.listCalls = 0; __nf.listFailFrom = 2;   /* بررسی دیده‌شدن موفق، فهرست هرس شکست می‌خورد */
    const before = JSON.stringify(Object.keys(__files).sort());
    const ret2 = await writeAutoBackup('daily');
    __nf.listFailFrom = 0;
    const after = Object.keys(__files);
    return { ret, oldKept: !!__files[kn.name] && __files[kn.name].id === kn.id, newest, newIsNew: newest !== kn.name, opens, ret2, nothingDeleted: JSON.parse(before).every(n => after.indexOf(n) >= 0) };
  }, known);
  ok(cf.ret === true && cf.newIsNew && cf.opens && cf.oldKept, 'شکست پاک‌کردن: فایل تازهٔ تأییدشده باز می‌شود و فایل قبلی هم ماند (هر دو سالم)');
  ok(cf.ret2 === true && cf.nothingDeleted, 'شکست هرس: پشتیبان تازه ذخیره شد و هیچ فایلی حذف نشد');

  console.log('• هرس عادی: سیاست ۷ روزانه / ۴ هفتگی / ۵ ایمنی، و دو مجموعهٔ جدای رمزدار و بی‌رمز');
  const RT = await fresh(b, (() => {
    const o = {}, day = 86400, base = 1760000000;
    for (let i = 0; i < 40; i++) {           /* ۴۰ روز گذشته، هر روز دو فایل رمزدار و یک فایل بی‌رمز */
      const d = new Date(Date.UTC(2025, 0, 1) + i * day * 1000), ds = '1404-' + String(1 + Math.floor(i / 30)).padStart(2, '0') + '-' + String(1 + (i % 30)).padStart(2, '0');
      o['hesab-auto-' + ds + '-080000-enc.json'] = { data: 'eA==', modified: base + i * day };
      o['hesab-auto-' + ds + '-200000-enc.json'] = { data: 'eA==', modified: base + i * day + 43200 };
      o['hesab-auto-' + ds + '.json'] = { data: 'eA==', modified: base + i * day + 100 };
    }
    for (let i = 1; i <= 8; i++) o['hesab-safety-1404-02-0' + i + '-120000-restore-enc.json'] = { data: 'eA==', modified: base + i };
    return o;
  })());
  const rt = await RT.page.evaluate(async () => {
    await hkAutoEncActivate('Synthetic-Pass-2024', hkGenRecoveryCode());
    const t = allPersonTitles()[0]; periodData.income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '1', desc: 'x', amount: 1, status: 'paid' })); persistCurrent(); saveArchive();
    const plainBefore = Object.keys(__files).filter(n => !/-enc\.json$/.test(n)).sort();
    const ret = await writeAutoBackup('daily');
    const names = Object.keys(__files), enc = names.filter(n => /-enc\.json$/.test(n));
    const encDaily = enc.filter(n => /^hesab-auto-/.test(n)), encSafety = enc.filter(n => /^hesab-safety-/.test(n));
    const days = {}; encDaily.forEach(n => { const d = /^hesab-auto-(\d{4}-\d{2}-\d{2})/.exec(n)[1]; days[d] = (days[d] || 0) + 1; });
    const plainAfter = names.filter(n => !/-enc\.json$/.test(n)).sort();
    return { ret, encDaily: encDaily.length, perDayMax: Math.max.apply(null, Object.values(days)), encSafety: encSafety.length, newKept: names.indexOf(autoBkState().lastName) >= 0, plainUntouched: JSON.stringify(plainBefore) === JSON.stringify(plainAfter), plainCount: plainAfter.length };
  });
  ok(rt.ret && rt.newKept, 'پشتیبان تازه ذخیره و نگه داشته شد');
  ok(rt.encDaily <= 11 && rt.encDaily >= 8 && rt.perDayMax === 1, 'رمزدار روزانه: از هر روز فقط جدیدترین، ۷ روز + حداکثر ۴ هفته (' + rt.encDaily + ' فایل)');
  ok(rt.encSafety === 5, 'رمزدار ایمنی: ۵ فایل آخر ماند');
  ok(rt.plainUntouched && rt.plainCount === 40, 'در حالت رمزدار، هیچ فایل بی‌رمز قبلی (۴۰ فایل) هرس نشد');
  const rt2 = await RT.page.evaluate(async () => {
    const encBefore = Object.keys(__files).filter(n => /-enc\.json$/.test(n)).sort();
    localStorage.removeItem('hesabKetabArchive_v5_autoBkEnc'); const s = autoBkState(); s.encEnabled = false; autoBkSave(s);   /* خاموش‌کردن */
    const ret = await writeAutoBackup('daily');
    const names = Object.keys(__files);
    const encAfter = names.filter(n => /-enc\.json$/.test(n)).sort();
    const plain = names.filter(n => /^hesab-auto-/.test(n) && !/-enc\.json$/.test(n));
    /* روشن‌کردن دوباره با کلید تازه */
    await new Promise(r => setTimeout(r, 1100));
    await hkAutoEncActivate('Another-Synthetic-9', hkGenRecoveryCode());
    const ret3 = await writeAutoBackup('daily');
    const newest = autoBkState().lastName, st = hkAutoEncState();
    let opens = false; try { const env = JSON.parse(atob(__files[newest].data)); opens = JSON.parse(await hkEncOpen(env, _bytesFromB64(st.dek))).app === 'hesab-ketab'; } catch (e) {}
    const encFinal = Object.keys(__files).filter(n => /-enc\.json$/.test(n));
    return { ret, encSame: JSON.stringify(encBefore) === JSON.stringify(encAfter), plainCount: plain.length, ret3, opens, encFinal: encFinal.length };
  });
  ok(rt2.ret && rt2.encSame, 'خاموش‌کردن رمزنگاری: هیچ پشتیبان رمزدار قبلی حذف نشد');
  ok(rt2.plainCount <= 11 && rt2.plainCount >= 8, 'در حالت بی‌رمز فقط مجموعهٔ بی‌رمز طبق همان سیاست هرس شد (' + rt2.plainCount + ' فایل)');
  ok(rt2.ret3 && rt2.opens && rt2.encFinal >= 1, 'روشن‌کردن دوباره (کلید تازه): پشتیبان تازهٔ رمزدار ذخیره و باز می‌شود');
  const rt3 = await RT.page.evaluate(async () => {
    const before = JSON.stringify(Object.keys(__files).sort()), logLen = __log.length;
    const rec = localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'); localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', '{"v":1}');
    const r1 = await writeAutoBackup('daily'); const e1 = autoBkState().lastError;
    const r2 = await writeAutoBackup('safety', 'reset-all');
    localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', rec);
    return { r1, r2, e1, same: JSON.stringify(Object.keys(__files).sort()) === before, ops: __log.slice(logLen).length };
  });
  ok(rt3.r1 === false && rt3.r2 === false && rt3.e1 === 'enc_key_missing' && rt3.same && rt3.ops === 0, 'کلید نامعتبر: پشتیبان روزانه و ایمنی گرفته نشد، هیچ نوشتن یا حذفی، هیچ فایل بی‌رمز');
  await RT.ctx.close();

  console.log('• ۱۰) شکست رمزنگاری یا گم‌شدن کلید: هرگز پشتیبان بی‌رمز جایگزین نوشته نمی‌شود');
  const f2 = await A.page.evaluate(async () => {
    const before = JSON.stringify(Object.keys(__files).sort());
    const origEnc = crypto.subtle.encrypt;
    crypto.subtle.encrypt = function () { return Promise.reject(new Error('synthetic webcrypto failure')); };
    const r1 = await writeAutoBackup('daily'); const e1 = autoBkState().lastError;
    crypto.subtle.encrypt = origEnc;
    const rec = localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'); localStorage.removeItem('hesabKetabArchive_v5_autoBkEnc');
    const r2 = await writeAutoBackup('daily'); const e2 = autoBkState().lastError;
    const mode = hkAutoEncState();
    localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', rec);
    return { r1, e1, r2, e2, broken: !!(mode && mode.broken), same: JSON.stringify(Object.keys(__files).sort()) === before, saves: __log.filter(x => x.indexOf('save:') === 0 && !/-enc\.json$/.test(x)).length };
  });
  ok(f2.r1 === false && f2.e1 === 'enc_failed', 'شکست WebCrypto: پشتیبان گرفته نشد و خطای enc_failed ثبت شد');
  ok(f2.r2 === false && f2.e2 === 'enc_key_missing' && f2.broken, 'کلید محلی گم‌شده: پشتیبان گرفته نشد، حالت «روشن ولی کلید پیدا نشد»');
  ok(f2.same && f2.saves === 0, 'در هیچ حالتی فایل بی‌رمز تازه‌ای نوشته نشد');

  console.log('• پاک‌سازی صریح پشتیبان‌های بی‌رمز قدیمی');
  const cl = await A.page.evaluate(() => new Promise(res => {
    __files['notes.json'] = { data: btoa('{}'), modified: 1 };   /* فایل غیرپشتیبان در همان پوشه */
    hkAutoEncCleanup(() => {});
    setTimeout(() => {
      const msg = document.getElementById('confirmMsg').textContent;
      document.querySelector('#confirmModal .modal-btn.yes').click();
      setTimeout(() => { const names = Object.keys(__files); res({ msg, plain: names.filter(n => !/-enc\.json$/.test(n) && /^hesab-/.test(n)).length, enc: names.filter(n => /-enc\.json$/.test(n)).length, other: !!__files['notes.json'] }); }, 800);
    }, 1500);
  }));
  ok(/۱۵ پشتیبان خودکار قدیمیِ بدون رمز/.test(cl.msg), 'پیش از حذف، تعداد دقیق (۱۵) و پیام تأیید نشان داده شد');
  ok(cl.plain === 0 && cl.enc >= 2 && cl.other, 'فقط پشتیبان‌های بی‌رمز حذف شدند؛ فایل‌های رمزدار و فایل دیگرِ پوشه دست نخوردند');

  console.log('• ۱۴) هیچ رمز، کد بازیابی یا دادهٔ مالی در کنسول و پیام‌ها');
  for (const [name, pg] of [['دستگاه اصلی', A.page]]) {
    const leak = await pg.evaluate(([pw, code, mark]) => {
      const all = window.__console.concat(window.__toasts).join('\n');
      return [pw, code, code.replace(/-/g, ''), mark, '98765432'].filter(x => all.indexOf(x) >= 0);
    }, [PW, setup.code, MARK]);
    ok(leak.length === 0, name + ': هیچ رازی در کنسول یا پیام‌ها نیست');
  }

  console.log('• خاموش کردن');
  /* از ۴.۵: پس از تأیید، رمز فعلی باید واقعاً آزموده شود؛ بعد کلید پاک می‌شود */
  const off = await A.page.evaluate(PW => new Promise(res => { hkAutoEncDisable(() => {}); setTimeout(() => { document.querySelector('#confirmModal .modal-btn.yes').click(); setTimeout(() => { document.getElementById('bkEncGIn').value = PW; document.getElementById('bkEncGByPw').click(); }, 200); (function wait(t0) { if (document.getElementById('bkEncGuard') && Date.now() - t0 < 20000) return setTimeout(() => wait(t0), 150); setTimeout(async () => { const st = hkAutoEncState(); const r = await writeAutoBackup('safety', 'x'); const last = autoBkState().lastName; res({ st, r, last, key: localStorage.getItem('hesabKetabArchive_v5_autoBkEnc') }); }, 300); })(Date.now() + 400); }, 300); }), PW);
  ok(off.st === null && off.key === null && off.r === true && !/-enc\.json$/.test(off.last), 'پس از تأیید خاموش‌کردن، کلید محلی پاک شد و پشتیبان بعدی (با آگاهی کاربر) بی‌رمز است');
  await A.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nencrypted-autobackup: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
