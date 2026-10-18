// فاز ۴.۵: پیش از جایگزینی یا حذف کلید محلیِ سالم، رمز یا کد بازیابی قبلی واقعاً آزموده می‌شود؛ ترمیم wrap بدون تعویض DEK.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا؛ افزونهٔ اندرویدی با شبیه‌ساز درون‌حافظه‌ای جایگزین می‌شود
// (قرارداد سمت JS سنجیده می‌شود، نه رفتار واقعی Android).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const KEY = P + '_autoBkEnc';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_autoBackup']: JSON.stringify({ enabled: false }) };
const PW = 'Synthetic-Guard-Pass-31';      /* رمز مصنوعی */
const PW_NEW = 'Synthetic-Guard-New-42';    /* رمز مصنوعی دوم */
const MARK = 'SYN_GUARD_MARKER_ROW';

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
const secrets = [PW, PW_NEW];               /* کدهای بازیابی مصنوعی هم در طول آزمون اضافه می‌شوند */

function installMock() {
  const files = {}; let seq = 1000;
  window.__files = files; window.__log = []; window.__toasts = []; window.__console = [];
  window.Capacitor = { isNativePlatform: () => true, Plugins: { NativeFileExport: {
    saveAutoBackup: async (o) => { window.__log.push('save:' + o.filename); if (files[o.filename]) throw new Error('name_exists'); files[o.filename] = { id: ++seq, data: o.data, modified: 0 }; return { ok: true, verified: true, filename: o.filename }; },
    listAutoBackups: async () => ({ files: Object.keys(files).map(n => ({ name: n, size: 1, modified: files[n].modified })) }),
    deleteAutoBackup: async (o) => { window.__log.push('del:' + o.name); delete files[o.name]; return { deleted: 1 }; },
    readAutoBackup: async (o) => { if (!files[o.name]) throw new Error('not_found'); return { data: files[o.name].data, size: 1 }; }
  }, App: { getInfo: async () => ({ version: '1.3.10', build: '1' }) } } };

  /* از ۱.۳.۳۲ پشتیبان‌های روزانه/ایمنی در حافظهٔ داخلی (store:'internal') و در Downloads فقط «آخرین پشتیبان»: فهرست بالا = حافظهٔ داخلی، Downloads جدا */
  { const P = window.Capacitor.Plugins.NativeFileExport, orig = Object.assign({}, P), dl = {}; window.__dl = dl; const isI = o => !!(o && o.store === 'internal');
    P.saveAutoBackup = async o => isI(o) ? orig.saveAutoBackup(o) : (dl[o.filename] = { data: o.data, modified: Math.floor(Date.now() / 1000) }, { ok: true, verified: true, filename: o.filename });
    P.listAutoBackups = async o => isI(o) ? orig.listAutoBackups(o) : { files: Object.keys(dl).map(n => ({ name: n, size: 1, modified: dl[n].modified })) };
    P.deleteAutoBackup = async o => isI(o) ? orig.deleteAutoBackup(o) : (delete dl[o.name], { deleted: 1 });
    P.readAutoBackup = async o => isI(o) ? orig.readAutoBackup(o) : { data: (dl[o.name] || {}).data, size: 1 }; }
  ['log', 'warn', 'error', 'info'].forEach(m => { const o = console[m]; console[m] = function () { try { window.__console.push([].map.call(arguments, String).join(' ')); } catch (e) {} return o.apply(this, arguments); }; });
}
async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  await ctx.addInitScript(installMock);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(MARK => {
    const t = allPersonTitles()[0];
    periodData.income.sections.find(s => s.title === t).rows.unshift(Object.assign(emptyRow('income'), { day: '4', desc: MARK, amount: 7654321, status: 'paid' }));
    persistCurrent(); saveArchive();
    const st = window.showToast, sl = window.showToastLong;
    window.showToast = function (m) { window.__toasts.push(String(m)); return st.apply(this, arguments); };
    window.showToastLong = function (m) { window.__toasts.push(String(m)); return sl.apply(this, arguments); };
    window.__ls = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])); };
    window.__fs = () => JSON.stringify(Object.keys(__files).sort().map(n => [n, __files[n].id, __files[n].data]));
    window.__wait = (fn, ms) => new Promise(res => { const t0 = Date.now(); (function w() { let v = false; try { v = fn(); } catch (e) {} if (v || Date.now() - t0 > (ms || 20000)) return res(!!v); setTimeout(w, 120); })(); });
    window.__el = id => document.getElementById(id);
    window.__txt = id => (document.getElementById(id) || {}).textContent || '';
    window.__env = n => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(__files[n].data), c => c.charCodeAt(0))));
    window.__closeAll = () => { document.querySelectorAll('.backup-pick-overlay').forEach(o => o.remove()); const cm = document.getElementById('confirmModal'); if (cm) cm.classList.remove('open'); };
  }, MARK);
  return { ctx, page };
}
/* کلید فعال + یک پشتیبان رمزدار واقعی در پوشه؛ کد بازیابی مصنوعی برگردانده می‌شود */
async function withKey(page) {
  const r = await page.evaluate(async PW => {
    const rc = hkGenRecoveryCode();
    const a = await hkAutoEncActivate(PW, rc);
    const w = await writeAutoBackup('daily');
    const name = autoBkState().lastName;
    return { a, w, rc, name, dekId: hkAutoEncState().dekId };
  }, PW);
  secrets.push(r.rc);
  return r;
}
/* خاموش‌کردن از مسیر UI تا پنجرهٔ آزمون */
async function toDisableGuard(page) {
  return page.evaluate(async () => {
    window.__doneCalls = 0; hkAutoEncDisable(() => { window.__doneCalls++; });
    await __wait(() => __el('confirmModal').classList.contains('open'));
    document.getElementById('confirmYes').click();
    return __wait(() => __el('bkEncGuard'));
  });
}
async function verifyIn(page, type, value) {
  return page.evaluate(async ([type, value]) => {
    __el('bkEncGIn').value = value; __el(type === 'password' ? 'bkEncGByPw' : 'bkEncGByRc').click();
    await __wait(() => !__el('bkEncGuard') || /درست نیست/.test(__txt('bkEncGErr')));
    return { open: !!__el('bkEncGuard'), err: __txt('bkEncGErr'), field: __el('bkEncGIn') ? __el('bkEncGIn').value : null };
  }, [type, value]);
}

(async () => {
  const b = await chromium.launch();

  console.log('• ۱) خاموش‌کردن با رمز قبلی درست / کد بازیابی قبلی درست');
  for (const [type, label] of [['password', 'رمز'], ['recovery', 'کد بازیابی']]) {
    const X = await fresh(b); const k = await withKey(X.page);
    const before = await X.page.evaluate(() => ({ fs: __fs(), raw: localStorage.getItem('hesabKetabArchive_v5_autoBkEnc') }));
    const shown = await toDisableGuard(X.page);
    const txt = await X.page.evaluate(() => __txt('bkEncGTxt'));
    const v = await verifyIn(X.page, type, type === 'password' ? PW : k.rc.toLowerCase().replace(/(.{5})/g, '$1 '));
    const after = await X.page.evaluate(() => ({ raw: localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'), st: hkAutoEncState(), enc: autoBkState().encEnabled, fs: __fs(), done: window.__doneCalls }));
    ok(k.a && k.w && before.raw && shown && /رمز پشتیبان یا کد بازیابیِ همین کلید/.test(txt), label + ': پیش از پاک‌کردن کلید، پنجرهٔ آزمون نمایش داده شد');
    ok(!v.open && after.raw === null && after.st === null && after.enc === false && after.done === 1, label + ' قبلی درست بود: کلید پاک و رمزنگاری خاموش شد');
    ok(after.fs === before.fs, label + ': هیچ فایل پشتیبانی تغییر نکرد یا پاک نشد');
    await X.ctx.close();
  }

  console.log('• ۲) هر دو نادرست، کد بدقالب، و انصراف: هیچ تغییری');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    const ls0 = await X.page.evaluate(() => __ls()), fs0 = await X.page.evaluate(() => __fs());
    await toDisableGuard(X.page);
    const w1 = await verifyIn(X.page, 'password', 'Wrong-Synthetic-Pass-9');
    const wrongRc = (k.rc[0] === 'A' ? 'B' : 'A') + k.rc.slice(1);
    const w2 = await verifyIn(X.page, 'recovery', wrongRc);
    const w3 = await verifyIn(X.page, 'recovery', 'not-a-code');
    const w4 = await verifyIn(X.page, 'password', k.rc);            /* کد درست در جای رمز */
    const mid = await X.page.evaluate(() => ({ ls: __ls(), fs: __fs() }));
    ok(w1.open && w2.open && w3.open && w4.open && /هیچ تغییری اعمال نشد/.test(w1.err), 'رمز نادرست، کد نادرست، کد بدقالب و کد به‌جای رمز: پنجره باز ماند و خطا نمایش داده شد');
    ok(w1.field === '' && w2.field === '', 'ورودی پس از هر تلاش از فیلد پاک شد');
    ok(mid.ls === ls0 && mid.fs === fs0, 'پس از تلاش‌های نادرست: localStorage بایت‌به‌بایت و فایل‌ها بدون تغییر');
    const c = await X.page.evaluate(async () => { __el('bkEncGCancel').click(); await new Promise(r => setTimeout(r, 200)); return { ls: __ls(), fs: __fs(), open: !!__el('bkEncGuard'), done: window.__doneCalls }; });
    ok(!c.open && c.ls === ls0 && c.fs === fs0 && c.done === 1, 'انصراف در پنجرهٔ آزمون: هیچ تغییری');
    const c2 = await X.page.evaluate(async () => { hkAutoEncDisable(() => {}); await __wait(() => __el('confirmModal').classList.contains('open')); document.getElementById('confirmNo').click(); await new Promise(r => setTimeout(r, 200)); return { ls: __ls(), guard: !!__el('bkEncGuard') }; });
    ok(c2.ls === ls0 && !c2.guard, 'انصراف در تأیید اول خاموش‌کردن: هیچ تغییری و پنجرهٔ آزمون باز نشد');
    await X.ctx.close();
  }

  console.log('• ۳) «هیچ‌کدام را ندارم»: هشدار و تأیید جداگانه');
  {
    const X = await fresh(b); await withKey(X.page);
    const ls0 = await X.page.evaluate(() => __ls()), fs0 = await X.page.evaluate(() => __fs());
    await toDisableGuard(X.page);
    const l = await X.page.evaluate(async () => {
      __el('bkEncGLost').click(); await new Promise(r => setTimeout(r, 100));
      const txt = __txt('bkEncGLostTxt'), disabled = __el('bkEncGLostGo').disabled;
      __el('bkEncGLostGo').click(); await new Promise(r => setTimeout(r, 200));   /* بدون تیک: نباید کاری کند */
      return { txt, disabled, stillOpen: !!__el('bkEncGuard'), ls: __ls() };
    });
    ok(/ممکن است دسترسی به آن‌ها برای همیشه از بین برود/.test(l.txt) && /هیچ راه تضمین‌شده‌ای/.test(l.txt) && /هیچ فایل پشتیبانی پاک نمی‌شود/.test(l.txt), 'متن هشدار: احتمال از دست رفتن دسترسی، بدون هیچ ادعای بازیابی تضمینی');
    ok(l.disabled && l.stillOpen && l.ls === ls0, 'بدون تیک تأیید جداگانه، دکمهٔ ادامه غیرفعال است و چیزی تغییر نکرد');
    const c = await X.page.evaluate(async () => { __el('bkEncGCancel2').click(); await new Promise(r => setTimeout(r, 200)); return __ls(); });
    ok(c === ls0, 'انصراف در پنجرهٔ هشدار: هیچ تغییری');
    await toDisableGuard(X.page);
    const g = await X.page.evaluate(async () => { __el('bkEncGLost').click(); await new Promise(r => setTimeout(r, 100)); const a = __el('bkEncGAck'); a.checked = true; a.dispatchEvent(new Event('change')); __el('bkEncGLostGo').click(); await new Promise(r => setTimeout(r, 300)); return { raw: localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'), enc: autoBkState().encEnabled, fs: __fs() }; });
    ok(g.raw === null && g.enc === false && g.fs === fs0, 'پس از تیک صریح و ادامه: کلید پاک شد، فایل‌ها دست نخوردند');
    await X.ctx.close();
  }

  console.log('• ۴) تنظیم دوباره: آزمون کد قبلی، ساخت کلید جدید، فایل قدیمی هنوز با راز قبلی باز می‌شود');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    /* پشتیبان کلید قبلی را به یک روز قبل‌تر می‌بریم: پشتیبانِ همان روزِ کلید تازه طبق سیاست موجود جای فایلِ همان روز را می‌گیرد (رفتار هرس تغییر نکرده) */
    k.name = await X.page.evaluate(n => { const m = n.replace(/hesab-auto-\d{4}-\d{2}-\d{2}/, 'hesab-auto-1404-01-01'); __files[m] = __files[n]; delete __files[n]; return m; }, k.name);
    const fs0 = await X.page.evaluate(() => __fs());
    const r = await X.page.evaluate(async ([rc, PW_NEW, oldName]) => {
      hkAutoEncSetup(() => {});
      await __wait(() => __el('bkEncPriorGo')); __el('bkEncPriorGo').click();
      await __wait(() => __el('bkEncGuard'));
      const noRepair = !__el('bkEncGRepair');                /* کلید سالم: ترمیم پیشنهاد نمی‌شود */
      const formBefore = !!__el('bkEncPw1');
      __el('bkEncGIn').value = rc; __el('bkEncGByRc').click();
      await __wait(() => __el('bkEncPw1'));
      __el('bkEncPw1').value = PW_NEW; __el('bkEncPw2').value = PW_NEW; __el('bkEncNext').click();
      await __wait(() => __el('bkEncCode'));
      const code = __el('bkEncCode').value; __el('bkEncRc2').value = code; __el('bkEncOn').click();
      await __wait(() => !__el('bkEncSetup'));
      const st = hkAutoEncState(), env = __env(oldName);
      const oldByRc = JSON.parse(await hkEncOpen(env, await hkEncUnwrapDek(env, 'recovery', rc))).app === 'hesab-ketab';
      let newOnOld = false; try { await hkEncUnwrapDek(env, 'password', PW_NEW); newOnOld = true; } catch (e) {}
      return { noRepair, formBefore, code, healthy: !!(st && !st.broken), newDek: st && st.dekId, oldByRc, newOnOld };
    }, [k.rc, PW_NEW, k.name]);
    secrets.push(r.code, r.code.replace(/-/g, ''));
    const fs1 = await X.page.evaluate(n => __files[n] ? JSON.stringify([__files[n].id, __files[n].data]) : null, k.name);
    ok(r.noRepair && !r.formBefore, 'تنظیم دوباره روی کلید سالم: فرم رمز فقط پس از آزمون باز می‌شود؛ گزینهٔ ترمیم نیست');
    ok(r.healthy && r.newDek !== k.dekId, 'پس از آزمون موفق کد قبلی، کلید جدید ساخته و فعال شد');
    ok(r.oldByRc && !r.newOnOld && fs1 && JSON.parse(fs0).some(e => e[0] === k.name && JSON.stringify([e[1], e[2]]) === fs1), 'پشتیبان قدیمی دست‌نخورده است و با کد قبلی (نه رمز جدید) باز می‌شود');
    await X.ctx.close();
  }

  console.log('• ۵) آزمون واقعی است، نه فقط قالب: wrap محلی دست‌کاری‌شده');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    const r = await X.page.evaluate(async ([PW, name]) => {
      const rec = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'));
      const w = rec.wraps.find(x => x.type === 'password');
      const d = atob(w.data); w.data = btoa(String.fromCharCode(d.charCodeAt(0) ^ 1) + d.slice(1));   /* قالب سالم، محتوا خراب */
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', JSON.stringify(rec));
      const shapeHealthy = !!(hkAutoEncState() && !hkAutoEncState().broken);
      const K = hkAutoEncRaw();
      const viaFile = await hkAutoEncVerifyOld(K, 'password', PW);           /* wrap سالمِ داخل فایل پشتیبان */
      const saved = __files[name]; delete __files[name];
      const noFile = await hkAutoEncVerifyOld(K, 'password', PW);            /* فقط wrap خراب محلی */
      __files[name] = saved;
      /* فایل پشتیبانی که با کلید دیگری (dekId متفاوت) ساخته شده، آزمون را موفق نمی‌کند */
      const other = await hkAutoEncCreateKey('Other-Synthetic-Key-5', hkGenRecoveryCode());
      const otherEnv = await hkEncSeal('{"app":"hesab-ketab"}', other);
      delete __files[name]; __files['hesab-auto-1405-06-30-120000-000aa-enc.json'] = { id: 9, data: btoa(JSON.stringify(otherEnv)), modified: 0 };
      const otherKey = await hkAutoEncVerifyOld(K, 'password', 'Other-Synthetic-Key-5');
      return { shapeHealthy, viaFile, noFile, otherKey };
    }, [PW, k.name]);
    ok(r.shapeHealthy, 'رکورد با قالب سالم ولی wrap خراب از نظر ساختار سالم دیده می‌شود (پس قالب به‌تنهایی کافی نیست)');
    ok(r.viaFile, 'رمز قبلی از طریق wrap داخل پشتیبان رمزدار همین کلید تأیید شد (همان مسیری که روی گوشی دیگر به کار می‌رود)');
    ok(!r.noFile, 'بدون فایل و با wrap محلی خراب، آزمون رد شد');
    ok(!r.otherKey, 'رمزِ کلید دیگری که پشتیبانش در پوشه است، کلید این دستگاه را تأیید نکرد');
    await X.ctx.close();
  }

  console.log('• ۶) کلید سالم با wrap خراب: ترمیم بدون تعویض DEK و dekId');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    k.name = await X.page.evaluate(n => { const m = n.replace(/hesab-auto-\d{4}-\d{2}-\d{2}/, 'hesab-auto-1404-01-01'); __files[m] = __files[n]; delete __files[n]; return m; }, k.name);
    const r = await X.page.evaluate(async ([PW_NEW, oldName]) => {
      const rec = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'));
      rec.wraps = rec.wraps.filter(w => w.type !== 'recovery');        /* یک wrap گم شده */
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', JSON.stringify(rec));
      const dek0 = rec.dek, id0 = rec.dekId;
      const st0 = hkAutoEncState();
      const noPlain = await writeAutoBackup('daily');                    /* حالت ناسالم: نه رمزدار، نه بی‌رمز */
      const plainSaved = __log.filter(x => /^save:/.test(x) && !/-enc\.json$/.test(x)).length;
      askBackupParts(); await __wait(() => __el('bkEncFix'));
      const label = __el('bkEncFix').textContent.trim(); __el('bkEncFix').click();
      await __wait(() => __el('bkEncPriorGo')); __el('bkEncPriorGo').click();
      await __wait(() => __el('bkEncGuard'));
      const hasRepair = !!__el('bkEncGRepair');
      __el('bkEncGRepair').click();
      await __wait(() => __el('bkEncPw1'));
      /* توضیح ترمیم حالا داخل باکس اطلاعاتِ کنار عنوان است */
      const rtxt = (document.querySelector('#bkEncSetup .backup-pick-title .hk-info-btn') || { getAttribute: () => '' }).getAttribute('data-tip') || '';
      __el('bkEncPw1').value = PW_NEW; __el('bkEncPw2').value = PW_NEW; __el('bkEncNext').click();
      await __wait(() => __el('bkEncCode'));
      const code = __el('bkEncCode').value; __el('bkEncRc2').value = code; __el('bkEncOn').click();
      await __wait(() => !__el('bkEncSetup'));
      const after = JSON.parse(localStorage.getItem('hesabKetabArchive_v5_autoBkEnc'));
      const st = hkAutoEncState();
      const oldEnv = __env(oldName);
      const oldLocal = JSON.parse(await hkEncOpen(oldEnv, _bytesFromB64(st.dek))).app === 'hesab-ketab' && oldEnv.dekId === st.dekId;
      const w = await writeAutoBackup('daily'); const nn = autoBkState().lastName, nEnv = __env(nn);
      const newByPw = JSON.parse(await hkEncOpen(nEnv, await hkEncUnwrapDek(nEnv, 'password', PW_NEW))).app === 'hesab-ketab';
      const newByRc = JSON.parse(await hkEncOpen(nEnv, await hkEncUnwrapDek(nEnv, 'recovery', code))).app === 'hesab-ketab';
      return { broken: !!(st0 && st0.broken), noPlain, plainSaved, label, hasRepair, rtxt, code, sameDek: after.dek === dek0 && after.dekId === id0, healthy: !!(st && !st.broken), oldLocal, w, newEnc: /-enc\.json$/.test(nn), newByPw, newByRc };
    }, [PW_NEW, k.name]);
    secrets.push(r.code, r.code.replace(/-/g, ''));
    ok(r.broken && r.noPlain === false && r.plainSaved === 0, 'wrap گم‌شده: حالت ناسالم، پشتیبان گرفته نشد و هیچ فایل بی‌رمزی جایگزین نشد');
    ok(r.label === 'تنظیم دوباره…' && r.hasRepair, 'در «تنظیم دوباره»ی کلیدِ دارای DEK سالم، گزینهٔ «رمز و کد تازه برای همین کلید» هست');
    ok(/خود کلید عوض نمی‌شود/.test(r.rtxt) && /فقط با رمز یا کد بازیابی قبلی باز می‌شوند/.test(r.rtxt), 'متن ترمیم: کلید عوض نمی‌شود؛ فایل‌های قبلی روی گوشی دیگر فقط با راز قبلی');
    ok(r.sameDek && r.healthy, 'پس از ترمیم: DEK و dekId دقیقاً همان قبلی و کلید سالم');
    ok(r.oldLocal, 'پشتیبان قدیمی روی همین دستگاه با کلید محلی (بدون رمز) باز می‌شود');
    ok(r.w && r.newEnc && r.newByPw && r.newByRc, 'پشتیبان تازه رمزدار است و هم با رمز تازه و هم با کد تازه باز می‌شود');
    await X.ctx.close();
  }

  console.log('• ۷) کلید واقعاً ناسالم (DEK نامعتبر) و کلید نسخهٔ جدیدتر: هرگز بی‌سروصدا پاک نمی‌شود');
  {
    const X = await fresh(b);
    const r = await X.page.evaluate(async () => {
      const out = {};
      const bad = '{"v":1,"dekId":"AAAAAAAAAAAA","dek":"c2hvcnQ=","wraps":[]}';
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', bad);
      const s = autoBkState(); s.encEnabled = true; autoBkSave(s);
      const ls0 = __ls();
      /* خاموش‌کردن */
      hkAutoEncDisable(() => {}); await __wait(() => __el('confirmModal').classList.contains('open')); __el('confirmYes').click();
      await __wait(() => __el('bkEncGuard'));
      out.disTxt = __txt('bkEncGTxt'); out.disVerify = !!__el('bkEncGIn');
      __el('bkEncGCancel').click(); await new Promise(r => setTimeout(r, 150));
      out.disCancelSame = __ls() === ls0;
      /* تنظیم دوباره */
      hkAutoEncSetup(() => {}); await __wait(() => __el('bkEncPriorGo')); __el('bkEncPriorGo').click();
      await __wait(() => __el('bkEncGuard'));
      out.resTxt = __txt('bkEncGTxt'); out.resForm = !!__el('bkEncPw1');
      __el('bkEncGCancel').click(); await new Promise(r => setTimeout(r, 150));
      out.resCancelSame = __ls() === ls0;
      /* ادامهٔ صریح در خاموش‌کردن */
      hkAutoEncDisable(() => {}); await __wait(() => __el('confirmModal').classList.contains('open')); __el('confirmYes').click();
      await __wait(() => __el('bkEncGBrokenGo')); __el('bkEncGBrokenGo').click(); await new Promise(r => setTimeout(r, 150));
      out.goneAfterExplicit = localStorage.getItem('hesabKetabArchive_v5_autoBkEnc') === null;
      /* JSON خراب */
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', '{not json');
      const ls1 = __ls();
      hkAutoEncSetup(() => {}); await __wait(() => __el('bkEncPriorGo')); __el('bkEncPriorGo').click();
      await __wait(() => __el('bkEncGBrokenGo'));
      out.junkPanel = !!__el('bkEncGBrokenGo'); __el('bkEncGCancel').click(); await new Promise(r => setTimeout(r, 150));
      out.junkSame = __ls() === ls1;
      /* نسخهٔ جدیدتر */
      localStorage.setItem('hesabKetabArchive_v5_autoBkEnc', '{"v":2,"dekId":"BBBBBBBBBBBB","dek":"x"}');
      const ls2 = __ls(); __toasts.length = 0;
      hkAutoEncDisable(() => {}); await __wait(() => __el('confirmModal').classList.contains('open')); __el('confirmYes').click();
      await new Promise(r => setTimeout(r, 300));
      out.v2Same = __ls() === ls2 && !__el('bkEncGuard'); out.v2Toast = __toasts.join('|');
      return out;
    });
    ok(!r.disVerify && /آسیب دیده و قابل بررسی نیست/.test(r.disTxt) && /هیچ فایل پشتیبانی پاک نمی‌شود/.test(r.disTxt), 'خاموش‌کردن با DEK نامعتبر: پنجرهٔ صریح «قابل استفاده نیست» به‌جای حذف بی‌صدا');
    ok(r.disCancelSame && r.resCancelSame && !r.resForm, 'انصراف در هر دو مسیر: رکورد آسیب‌دیده و وضعیت بایت‌به‌بایت بدون تغییر');
    ok(/با کلید جدید جایگزین می‌شود/.test(r.resTxt), 'تنظیم دوباره با DEK نامعتبر: پیش از جایگزینی پیام صریح');
    ok(r.goneAfterExplicit, 'فقط پس از «ادامه»ی صریح، رکورد آسیب‌دیده پاک شد');
    ok(r.junkPanel && r.junkSame, 'JSON خراب: همان پنجرهٔ صریح؛ انصراف = بدون تغییر');
    ok(r.v2Same && /نسخهٔ جدیدتر/.test(r.v2Toast), 'رکورد نسخهٔ جدیدتر: هیچ تغییری و پیام به‌روزرسانی');
    await X.ctx.close();
  }

  console.log('• ۸) خطای ذخیره‌سازی: هیچ کلید یا فایلی بی‌دلیل از دست نمی‌رود');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    const r = await X.page.evaluate(async ([PW, PW_NEW, rc]) => {
      const out = {}, K = 'hesabKetabArchive_v5_autoBkEnc';
      const raw0 = localStorage.getItem(K), fs0 = __fs();
      const orig = Storage.prototype.setItem, origRm = Storage.prototype.removeItem;
      /* الف) نوشتن کلید جدید شکست می‌خورد */
      Storage.prototype.setItem = function (k, v) { if (k === K) throw new Error('QuotaExceededError'); return orig.call(this, k, v); };
      out.actFail = await hkAutoEncActivate(PW_NEW, hkGenRecoveryCode());
      out.repFail = await hkAutoEncRepair(PW_NEW, hkGenRecoveryCode());
      Storage.prototype.setItem = orig;
      out.rawSameA = localStorage.getItem(K) === raw0 && !!(hkAutoEncState() && !hkAutoEncState().broken);
      /* ب) بررسی پس از نوشتن شکست می‌خورد: رکورد قبلی برگردانده می‌شود (نه حذف) */
      const realState = window.hkAutoEncState; let n = 0;
      window.hkAutoEncState = function () { n++; return { broken: true }; };
      out.actPostFail = await hkAutoEncActivate(PW_NEW, hkGenRecoveryCode());
      window.hkAutoEncState = realState;
      out.rawSameB = localStorage.getItem(K) === raw0 && n > 0 && autoBkState().encEnabled === true;
      /* ج) حذف کلید در خاموش‌کردن شکست می‌خورد (پس از آزمون موفق رمز) */
      Storage.prototype.removeItem = function (k) { if (k === K) throw new Error('remove_failed'); return origRm.call(this, k); };
      hkAutoEncDisable(() => {}); await __wait(() => __el('confirmModal').classList.contains('open')); __el('confirmYes').click();
      await __wait(() => __el('bkEncGuard')); __el('bkEncGIn').value = PW; __el('bkEncGByPw').click();
      await __wait(() => !__el('bkEncGuard'));
      Storage.prototype.removeItem = origRm;
      out.rawSameC = localStorage.getItem(K) === raw0 && autoBkState().encEnabled === true;
      out.toast = __toasts.slice(-1)[0] || '';
      out.fsSame = __fs() === fs0;
      return out;
    }, [PW, PW_NEW, k.rc]);
    ok(r.actFail === false && r.repFail === false && r.rawSameA, 'شکست نوشتن در فعال‌سازی و ترمیم: false و کلید قبلی دست‌نخورده و سالم');
    ok(r.actPostFail === false && r.rawSameB, 'شکست بررسی پس از نوشتن: کلید قبلی و وضعیت دقیقاً برگردانده شد (قبلاً حذف می‌شد)');
    ok(r.rawSameC && /ممکن نشد؛ هیچ تغییری/.test(r.toast), 'شکست حذف در خاموش‌کردن: کلید و وضعیت بدون تغییر، پیام صریح');
    ok(r.fsSame, 'در هیچ‌کدام از خطاها فایلی تغییر نکرد یا پاک نشد');
    await X.ctx.close();
  }

  console.log('• ۹) هیچ رمز یا کد بازیابی در localStorage، کنسول یا پیام‌ها');
  {
    const X = await fresh(b); const k = await withKey(X.page);
    await toDisableGuard(X.page);
    await verifyIn(X.page, 'password', 'Wrong-Synthetic-Pass-9');
    await verifyIn(X.page, 'recovery', k.rc);
    const dump = await X.page.evaluate(() => __ls() + '\n' + window.__console.join('\n') + '\n' + window.__toasts.join('\n') + '\n' + document.body.innerHTML);
    const leaks = secrets.concat([k.rc, 'Wrong-Synthetic-Pass-9']).filter(x => x && dump.indexOf(x) >= 0);
    ok(leaks.length === 0, 'هیچ رمز یا کد بازیابی (درست یا نادرست) در localStorage، کنسول، پیام‌ها یا DOM باقی نماند');
    await X.ctx.close();
  }

  await b.close();
  ok(allErrors.length === 0, 'هیچ خطای JS در صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  console.log('\nautoenc-keyguard: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.message); process.exit(1); });
