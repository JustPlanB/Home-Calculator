/* عکس‌گیری از صفحه‌ها با Chromium (Playwright). اجرا:
   NODE_PATH=$(npm root -g) node tools/shots.cjs <پوشه‌ی خروجی> [آدرس پایه]
   روز «امروز» ثابت است تا عکس‌ها قابل مقایسه باشند. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const out = path.resolve(process.argv[2] || 'shots');
const base = process.argv[3] || 'http://localhost:8765';
const TODAY = '1405-07-25';
const SCREENS = [
  ['home', '/home'], ['daily', '/daily'], ['tomorrow', '/tomorrow'], ['timeline', '/timeline'],
  ['reports', '/reports'], ['orders', '/orders'], ['people', '/people'], ['soon', '/finance'],
];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const errors = [];
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fa-IR' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${theme}] pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${theme}] console: ${m.text()}`); });
    await page.goto(`${base}/index.html?today=${TODAY}#/home`);
    if (theme === 'light') {
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('kargah:v1')); s.theme = 'light'; localStorage.setItem('kargah:v1', JSON.stringify(s)); });
    }
    for (const [name, route] of SCREENS) {
      await page.goto(`${base}/index.html?today=${TODAY}#${route}`);
      await page.reload();
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(out, `${theme}-${name}.png`), fullPage: name !== 'home' });
    }
    await ctx.close();
  }
  await browser.close();
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
  console.log('OK — عکس‌ها در', out);
})();
