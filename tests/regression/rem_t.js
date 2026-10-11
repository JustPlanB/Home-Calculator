const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ timezoneId: 'Asia/Tehran' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const leaps = [1399, 1400, 1403, 1404, 1407, 1408, 1412].map(y => y + ':' + isPersianLeapYear(y));
    const t = getTodayPersian();
    userReminders = [
      { id: 'a', title: 'اجاره', d: 5, m: t.m, y: t.y, repeat: 'monthly', advanceDays: 2 },
      { id: 'b', title: 'بیمه', d: t.d, m: t.m, y: t.y, repeat: 'once', advanceDays: 0 },
      { id: 'c', title: 'تمدید', d: 30, m: 12, y: 1404, repeat: 'yearly', advanceDays: 3 }
    ];
    const plan = reminderNotifyPlan().map(x => new Date(x.at).toISOString().slice(0, 16) + ' ' + x.title + ' | ' + x.body);
    const due = getUserRemindDueSoon().map(x => x.r.title + ':' + x.days);
    return { today: t, leaps, n: plan.length, plan: plan.slice(0, 8), due, db: daysBetweenPersian({ y: 1407, m: 12, d: 29 }, { y: 1408, m: 1, d: 1 }) + ' / ' + daysBetweenPersian({ y: 1408, m: 12, d: 29 }, { y: 1409, m: 1, d: 1 }) };
  });
  console.log(JSON.stringify(r, null, 1), errs); await b.close();
})();
