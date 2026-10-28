// ۱.۳.۶۳: آرشیو فقط یک بار در localStorage (کلید اصلی کوچک) + نسخهٔ دوم در IndexedDB و بازگشت خودکار از آن.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا. شکست ذخیره با جایگزین‌کردن موقت Storage.prototype.setItem تزریق می‌شود.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const FAM = P + '_fam_local';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
const MK = '1404-1'; // ماه گذشته (ماه جاری از periodData ساخته می‌شود)

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, extra) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const mark = (page, v) => page.evaluate(([mk, v]) => { touchLocal(); archive[mk] = archive[mk] || emptyPeriodData(); archive[mk].__probe = v; return saveArchive(); }, [MK, v]);
const memProbe = page => page.evaluate(mk => archive[mk] && archive[mk].__probe, MK);
const famProbe = page => page.evaluate(([k, mk]) => { const r = localStorage.getItem(k); return r ? (JSON.parse(r).archive[mk] || {}).__probe : null; }, [FAM, MK]);
const mirrorProbe = page => page.evaluate(mk => HKStore.get('archive').then(m => m ? (JSON.parse(m.v).archive[mk] || {}).__probe : null), MK);
const flag = page => page.evaluate(k => localStorage.getItem(k), P + '_mirrorAhead');

(async () => {
  const b = await chromium.launch();

  // ۱) ذخیرهٔ عادی: کلید اصلی کوچک، داده در کلید خانواده، نسخهٔ دوم در IndexedDB، علامتی نمی‌ماند
  const A = await fresh(b);
  ok(await mark(A.page, 'A') === true, 'ذخیرهٔ عادی موفق');
  await A.page.waitForTimeout(2200);
  const main = await A.page.evaluate(k => localStorage.getItem(k), P);
  ok(main && main.indexOf('"archive"') < 0 && main.length < 300, 'کلید اصلی دیگر نسخهٔ تکراری آرشیو نیست');
  ok(await famProbe(A.page) === 'A', 'داده در کلید خانواده');
  ok(await mirrorProbe(A.page) === 'A', 'نسخهٔ دوم در IndexedDB نوشته شد');
  ok(await flag(A.page) === null, 'پس از ذخیرهٔ موفق علامت «جلوتر» نمی‌ماند');
  await A.page.reload(); await A.page.waitForTimeout(1800);
  ok(await memProbe(A.page) === 'A', 'پس از باز شدن دوباره، داده سر جایش است');

  // ۲) شکست نوشتن کلید خانواده (حافظه پر) → علامت می‌ماند → بار بعد از نسخهٔ دوم برمی‌گردد
  await A.page.evaluate(k => {
    const o = Storage.prototype.setItem;
    Storage.prototype.setItem = function (kk, v) { if (this === localStorage && kk === k) throw new DOMException('synthetic full', 'QuotaExceededError'); return o.call(this, kk, v); };
  }, FAM);
  ok(await mark(A.page, 'B') === false, 'ذخیره زیر حافظهٔ پر: نتیجه false');
  await A.page.waitForTimeout(2200);
  ok(await flag(A.page) === '1' && await famProbe(A.page) === 'A' && await mirrorProbe(A.page) === 'B', 'علامت مانده، کلید خانواده قدیمی، نسخهٔ دوم تازه');
  await A.page.reload(); await A.page.waitForTimeout(2600);
  ok(await memProbe(A.page) === 'B', 'باز شدن دوباره: آخرین تغییر از نسخهٔ دوم برگشت');
  ok(await famProbe(A.page) === 'B' && await flag(A.page) === null, 'کلید خانواده به‌روز شد و علامت برداشته شد');

  // ۳) کلید داده گم شده → از نسخهٔ دوم برمی‌گردد
  await A.page.waitForTimeout(1800);
  await A.page.evaluate(k => { window.addEventListener('pagehide', () => localStorage.removeItem(k)); }, FAM);
  await A.page.reload(); await A.page.waitForTimeout(2600);
  ok(await memProbe(A.page) === 'B' && await famProbe(A.page) === 'B', 'کلید داده گم شده: از نسخهٔ دوم برگشت و دوباره نوشته شد');

  // ۴) پاک کردن نسخهٔ دوم (مسیر «حذف همه»)
  ok(await A.page.evaluate(() => hkMirrorClear().then(() => HKStore.get('archive')).then(m => !m)), 'hkMirrorClear نسخهٔ دوم را پاک می‌کند');
  await A.ctx.close();

  // ۵) ارتقا از قالب قدیمی (کل آرشیو در کلید اصلی، بدون کلید خانواده)
  const old = { archive: { [MK]: { __probe: 'OLD', expense: { sections: [], nextId: 1 }, income: { sections: [], nextId: 1 } } }, plans: [], recurringIncomes: [], currentYear: 1405, currentMonth: 7, updatedAt: 1000 };
  const O = await fresh(b, { [P]: JSON.stringify(old), [P + '_meta']: JSON.stringify({ familyCode: '', localUpdatedAt: 1000, currentYear: 1405, currentMonth: 7 }) });
  await O.page.waitForTimeout(1200);
  ok(await memProbe(O.page) === 'OLD', 'قالب قدیمی خوانده شد');
  ok(await famProbe(O.page) === 'OLD', 'و در کلید خانواده نوشته شد');
  ok(await O.page.evaluate(k => localStorage.getItem(k).indexOf('"archive"') < 0, P), 'کلید اصلی کوچک شد');
  await O.ctx.close();

  // ۶) کلید اصلیِ کوچک تنها (بدون کلید خانواده و بدون نسخهٔ دوم) دادهٔ خالی را جای آرشیو نمی‌نشاند
  const S = await fresh(b, { [P]: JSON.stringify({ currentYear: 1405, currentMonth: 7, currentTab: 'home', memberName: '' }) });
  ok(await S.page.evaluate(() => typeof archive === 'object' && archive !== null), 'کلید اصلی کوچک تنها: بالا آمدن بدون خطا');
  await S.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nstorage-mirror: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
