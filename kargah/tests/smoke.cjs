/* تست رفتار در مرورگر واقعی: تیک، افزودن، ویرایش دوضربه، حذف با تأیید، ماندگاری، تم.
   اجرا: (سرور روشن) NODE_PATH=$(npm root -g) node tests/smoke.cjs [آدرس] */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:8765';
const U = (h) => `${base}/index.html?today=1405-07-25#${h}`;

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('kargah:v1')));

  await p.goto(U('/daily')); await p.waitForSelector('.k-listrow');
  // ۱. تیک‌زدن یک کار ناتمام
  const before = (await state()).tasks.find((t) => t.id === 'k6');
  assert.equal(before.done, false);
  await p.locator('.k-listrow', { hasText: 'اجرای سردر پنجره‌ها' }).locator('.k-check').click();
  assert.equal((await state()).tasks.find((t) => t.id === 'k6').done, true, 'تیک ذخیره شود');
  assert.equal((await state()).tasks.find((t) => t.id === 'k6').doneDate, '1405-07-25');

  // ۲. همه‌ی کارهای امروز تیک بخورد ← بنر «همه انجام شد»
  for (;;) {
    const open = p.locator('.k-check[aria-checked="false"]');
    if (!(await open.count())) break;
    await open.first().click();
  }
  await p.waitForSelector('.k-banner--green');
  assert.match(await p.locator('.k-banner--green').innerText(), /همه‌ی کارهای محول‌شده/);

  // ۳. افزودن کار از شیت
  await p.locator('.k-pill', { hasText: 'کار جدید' }).click();
  await p.fill('.k-sheet input.k-input', 'تست کار تازه');
  await p.locator('.k-sheet .k-btn--primary').click();
  await p.waitForSelector('text=تست کار تازه');
  assert.ok((await state()).tasks.some((t) => t.title === 'تست کار تازه' && t.date === '1405-07-25'));
  assert.equal(await p.locator('.k-banner--green').count(), 0, 'با کار تازه بنر باید برود');

  // ۴. حذف با مودال تأیید: انصراف ← می‌ماند؛ بله ← می‌رود
  const row = p.locator('.k-listrow', { hasText: 'تست کار تازه' });
  await row.locator('.k-op--del').click(); await p.locator('.k-modal .k-btn:not(.k-btn--danger)').click();
  assert.ok((await state()).tasks.some((t) => t.title === 'تست کار تازه'));
  await row.locator('.k-op--del').click(); await p.locator('.k-modal .k-btn--danger').click();
  await p.waitForFunction(() => !document.body.innerText.includes('تست کار تازه'));

  // ۵. ویرایش درون‌خطی جدول با دو ضربه
  await p.goto(U('/orders')); await p.reload(); await p.waitForSelector('.k-tbl');
  const cell = p.locator('td.editable[data-key="qty"]').first();
  await cell.click(); assert.equal(await p.locator('td.editing').count(), 0, 'یک ضربه ویرایش نمی‌کند');
  await cell.dblclick(); await p.waitForSelector('td.editing input');
  await p.fill('td.editing input', '۷۵'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.body.innerText.includes('۷۵'));
  assert.equal((await state()).orders[0].qty, 75);
  // ورودی نامعتبر ← توست و مقدار قبلی
  await p.locator('td.editable[data-key="neededBy"]').first().dblclick();
  await p.fill('td.editing input', 'abc'); await p.keyboard.press('Enter');
  await p.waitForSelector('.k-toast'); assert.match(await p.locator('.k-toast').innerText(), /تاریخ/);
  assert.equal((await state()).orders[0].neededBy, '1405-07-28');

  // ۶. تغییر وضعیت با شیت انتخاب
  await p.locator('.k-tbl tbody tr').first().locator('td.c-status button').click();
  await p.locator('.k-sheet .k-menuitem', { hasText: 'تحویل شد' }).click();
  await p.waitForFunction(() => document.querySelector('.k-tbl tbody tr td.c-status')?.innerText.includes('تحویل شد'));
  assert.equal((await state()).orders[0].status, 'delivered');

  // ۷. حذف ردیف جدول و افزودن ردیف
  const n0 = (await state()).orders.length;
  await p.locator('.k-pill', { hasText: 'سفارش' }).click();
  assert.equal((await state()).orders.length, n0 + 1);
  await p.locator('.k-tbl tbody tr').last().locator('.k-op--del').click(); await p.locator('.k-modal .k-btn--danger').click();
  await p.waitForFunction((n) => document.querySelectorAll('.k-tbl tbody tr').length === n, n0);

  // ۸. ثبت گزارش ناظر با سفارش
  await p.goto(U('/reports')); await p.reload();
  await p.locator('.k-screenhead .k-op--add').click();
  await p.fill('.k-sheet textarea', 'گزارش آزمایشی');
  const inputs = p.locator('.k-sheet input.k-input');
  await inputs.nth(0).fill('۶۰'); await inputs.nth(1).fill('سیمان'); await inputs.nth(2).fill('۲۰'); await inputs.nth(3).fill('۱۴۰۵/۷/۳۰');
  await p.locator('.k-sheet .k-btn--primary').click();
  await p.waitForSelector('text=گزارش آزمایشی');
  const s = await state();
  assert.equal(s.reports.at(-1).progress, 60);
  assert.ok(s.orders.some((o) => o.item === 'سیمان' && o.neededBy === '1405-07-30' && o.qty === 20));
  assert.ok(s.reports.at(-1).tags.includes('سفارش'));

  // ۹. تم و ماندگاری بعد از بازگشایی
  await p.goto(U('/home')); await p.reload();
  await p.locator('.k-op--square').click(); await p.locator('.k-menuitem', { hasText: 'تم روز' }).click();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');
  await p.reload(); assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');

  // ۱۰. همه‌ی مسیرها بدون خطا
  for (const r of ['/home', '/daily', '/tomorrow', '/timeline', '/reports', '/orders', '/people', '/warehouse', '/finance', '/docs']) {
    await p.goto(U(r)); await p.reload(); await p.waitForSelector('#page > *');
  }
  assert.deepEqual(errs, [], 'خطای کنسول: ' + errs.join(' | '));
  await b.close(); console.log('SMOKE OK — ۱۰ سناریو');
})().catch((e) => { console.error('SMOKE FAIL:', e.message); process.exit(1); });
