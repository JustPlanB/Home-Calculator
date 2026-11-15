// پیش‌نمایش ویجت‌ها در فهرست ویجت‌های گوشی (resources/widget-previews/*.png).
// ۱.۴.۴: عکس‌ها پهن‌تر از خانهٔ ویجت‌اند (۴×۲ ← ۲ به ۱، ۴×۱ ← ۴ به ۱) تا در فهرست از دو طرف تا انتهای جای خودشان کشیده شوند.
// اجرا (فقط وقتی ظاهر ویجت‌ها عوض شد):  node scripts/make-widget-previews.js  (Playwright لازم است؛ همان که تست‌ها دارند)
const path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const font = f => 'file://' + path.join(root, 'src', 'css', f);
const head = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="${font('01b-font-vazir.css')}"><link rel="stylesheet" href="${font('01c-font-vazir.css')}"><style>
html,body{margin:0;background:transparent}
.w{box-sizing:border-box;width:720px;background:#1b1b1b;border-radius:44px;font-family:'Vazirmatn';color:#f2f2f7;overflow:hidden;position:relative}
.h2{height:360px}.h1{height:180px}
.top{display:flex;justify-content:space-between;align-items:center;padding:26px 32px 0}
.app{font-weight:700;font-size:32px}.mo{font-size:25px;color:#98989f}
.pad{padding:0 32px}.mut{color:#98989f;font-size:27px}.big{font-weight:700;font-size:54px;direction:ltr;text-align:left;line-height:1.15}
.g{color:#9ee858}.r{color:#ff6b4a}
.row{display:flex;justify-content:space-between;align-items:center;font-size:31px;height:65px}.row b{font-size:33px}
.tbar{height:96px;display:flex;align-items:center;justify-content:space-between;padding:0 30px}
.band{background:#0a1628;height:54px;border-bottom:1px solid #3a3a3c;display:flex;font-weight:700;font-size:24px;align-items:center}
.cols{display:flex;align-items:center;margin:0 20px}.cols>*{text-align:center;box-sizing:border-box}
.c1{width:19%}.c2{width:34%;text-align:right!important;padding-right:12px}.c3{width:22%}.c4{width:25%}
.tr{height:70px;border-bottom:1px solid rgba(255,255,255,.14);font-size:27px}.tr .c1,.tr .c3{color:#98989f;font-size:24px}.tr .c4{font-weight:700}
.band .cols{width:100%}.band .c2{text-align:center!important;padding:0}
.line{display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 44px}
</style></head><body>`;
const P = {
  hk_prev_main: [360, `<div class="w h2"><div class="top"><span class="app">حساب‌کتاب</span><span class="mo">آبان ۱۴۰۵</span></div>
    <div class="pad" style="margin-top:22px"><div class="mut">موجودی</div><div class="big g">۴۸,۷۵۰,۰۰۰</div><div class="mut" style="margin-top:8px">خرج امروز</div><div class="big r">۳۸۰,۰۰۰</div></div></div>`],
  hk_prev_accounts: [360, `<div class="w h2"><div class="top"><span class="app">حساب‌کتاب</span><span class="mo">آبان ۱۴۰۵</span></div>
    <div class="pad" style="margin-top:8px"><div class="row"><span>ملت</span><b class="g">۲۱,۴۰۰,۰۰۰</b></div><div class="row"><span>ملی</span><b class="g">۱۵,۲۰۰,۰۰۰</b></div><div class="row"><span>سامان</span><b class="g">۱۲,۱۵۰,۰۰۰</b></div><div class="row"><span class="mut" style="font-size:31px">خرج امروز</span><b class="r">۳۸۰,۰۰۰</b></div></div></div>`],
  hk_prev_tx: [360, `<div class="w h2"><div class="tbar"><span class="app">حساب‌کتاب</span><span class="r" style="font-weight:700;font-size:32px">مخارج ▾</span><span class="mo">۱۹ آبان</span></div>
    <div class="band"><div class="cols"><span class="c1">تاریخ</span><span class="c2">شرح</span><span class="c3">حساب</span><span class="c4">مبلغ</span></div></div>
    ${[['۱۹', 'نان', 'ملت', '۸۰,۰۰۰'], ['۱۹', 'بنزین', 'ملی', '۳۰۰,۰۰۰'], ['۱۸', 'داروخانه', 'سامان', '۲۴۵,۰۰۰']].map(x => `<div class="cols tr"><span class="c1">${x[0]}</span><span class="c2">${x[1]}</span><span class="c3">${x[2]}</span><span class="c4 r">${x[3]}</span></div>`).join('')}</div>`],
  hk_prev_line: [180, `<div class="w h1"><div class="line"><span style="font-weight:700;font-size:50px">موجودی</span><span class="g" style="font-weight:700;font-size:62px">۴۸,۷۵۰,۰۰۰</span></div></div>`]
};
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 720, height: 360 }, deviceScaleFactor: 1 });
  for (const name of Object.keys(P)) {
    await page.setViewportSize({ width: 720, height: P[name][0] });
    await page.setContent(head + P[name][1] + '</body></html>'); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(root, 'resources', 'widget-previews', name + '.png'), omitBackground: true });
    console.log(name);
  }
  await b.close();
})();
