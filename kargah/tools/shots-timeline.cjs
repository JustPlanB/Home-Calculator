/* عکس از چهار سطح زوم محور زمان + ورق مقایسه. اجرا: NODE_PATH=$(npm root -g) node tools/shots-timeline.cjs <پوشه> [آدرس] */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const out = path.resolve(process.argv[2] || 'shots'), base = process.argv[3] || 'http://localhost:8765';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
    await p.goto(`${base}/index.html?today=1405-07-25#/timeline`);
    await p.evaluate((t) => { localStorage.clear(); }, theme); await p.reload(); await p.waitForTimeout(500);
    if (theme === 'light') { await p.locator('.k-op--square').click(); await p.locator('.k-menuitem', { hasText: 'تم روز' }).click(); await p.waitForTimeout(200); }
    const clip = { x: 0, y: 60, width: 390, height: 700 };
    const zoom = async (n) => { for (let i = 0; i < n; i++) { await p.locator('[aria-label="نزدیک کردن"]').click(); await p.waitForTimeout(140); } };
    const pan = (dx) => p.evaluate((d) => { document.querySelector('.k-tl__scroll').scrollLeft += d; }, dx);
    await p.locator('.k-tl__fit').click(); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(out, `${theme}-tl-0-month.png`), clip });
    await p.evaluate(() => 0); await p.reload(); await p.waitForTimeout(500);   // نمای اولیه‌ی هفته
    if (theme === 'light') { /* تم ذخیره شده است */ }
    await p.screenshot({ path: path.join(out, `${theme}-tl-1-week.png`), clip });
    await zoom(3); await pan(120); await p.screenshot({ path: path.join(out, `${theme}-tl-2-day.png`), clip });
    await zoom(2); await pan(500); await p.screenshot({ path: path.join(out, `${theme}-tl-3-detail.png`), clip: { ...clip, height: 700 } });
    await p.close();
  }
  await b.close();
  const { execFileSync } = require('child_process');
  for (const theme of ['dark', 'light']) {
    execFileSync('python3', ['-c', `
from PIL import Image
n=['0-month','1-week','2-day','3-detail']
ims=[Image.open('${out}/${theme}-tl-'+x+'.png') for x in n]
W=sum(i.width for i in ims)+30*3; H=max(i.height for i in ims)
s=Image.new('RGB',(W,H),(${theme === 'dark' ? '40,40,42' : '200,200,205'})); x=0
for i in ims: s.paste(i,(x,0)); x+=i.width+30
s.resize((W//2,H//2)).save('${out}/timeline-zoom-${theme}.png')`]);
  }
  console.log('OK', out);
})();
