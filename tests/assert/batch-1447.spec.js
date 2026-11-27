// ۱.۴.۴۶ — ارتقای دستیار: مسیر واقعی متن ← تحلیل ← تطبیق ← اجرای ابزار ← پاسخ فارسی، روی دنیای ساختگیِ غنی (tests/lib/assistant-world.js).
// اعداد مرجع از روی فهرست ROWS همان آزمون و مستقل از لایهٔ محاسبهٔ دستیار حساب می‌شوند؛ هیچ دادهٔ ذخیره‌شده‌ای لمس نمی‌شود.
const W = require('../lib/assistant-world.js');
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const w = await W.open(), I = w.info, { fmt, ref, ym } = W;
  const A = async (...turns) => (await w.ask(turns));
  const cy = I.cy, cm = I.cm, has = (t, n) => t.indexOf(fmt(n)) >= 0;
  const snap0 = await w.page.evaluate(() => JSON.stringify(archive) + '|' + JSON.stringify(periodData));
  // ۱) ماه پیش (محاوره‌ای)
  const prev = ref(I, { tab: 'expense', ym: [ym(I, -1)] });
  let r = await A('ببین ماه پیش چقدر خرج کردم؟'); ok(r[0].tool === 'transactions.aggregate' && r[0].args.tab === 'expense' && has(r[0].text, prev.sum), 'ماه پیش: ابزار جمع و عدد مرجع ' + prev.sum);
  r = await A('چقد خرج کردم ماه پیش'); ok(has(r[0].text, prev.sum), 'محاوره‌ای «چقد»: همان عدد');
  // ۲) سفر امسال به‌جز اقامت
  const trip = ref(I, { tab: 'expense', year: cy, pred: x => /^سفر/.test(x.desc) });
  r = await A('هزینه‌های سفر امسال رو به‌جز اقامت نشون بده.'); ok(r[0].args.excludeText && r[0].args.excludeText.indexOf('اقامت') >= 0 && r[0].args.year === cy && has(r[0].text, trip.sum), 'سفر امسال بدون اقامت: excludeText و عدد ' + trip.sum);
  // ۳) درآمد پروژه سه ماه اخیر
  const projInc = ref(I, { tab: 'income', ym: [ym(I, 0), ym(I, -1), ym(I, -2)], pred: x => !!x.project });
  r = await A('درآمد پروژه‌هام توی سه ماه اخیر چقدر بوده؟'); ok(r[0].args.tab === 'income' && r[0].args.context === 'project' && !!r[0].args.dateFrom && has(r[0].text, projInc.sum) && /از .* تا /.test(r[0].text) && !/\d{4}-\d/.test(r[0].text), 'درآمد پروژه‌ای سه ماه اخیر: ' + projInc.sum + ' و بازه با نام ماه');
  r = await A('سه ماه اخیرم چقدر خرج کردم'); ok(!!r[0].args.dateFrom && r[0].kind === 'result', '«اخیرم» (پسوند ملکی) بازه است نه واژهٔ ناشناخته');
  // ۴) مقایسه
  const cur = ref(I, { tab: 'expense', ym: [ym(I, 0)] }), d = cur.sum - prev.sum;
  r = await A('این ماه بیشتر از ماه قبل خرج کردم؟'); ok(r[0].tool === 'reports.compare' && new RegExp('^' + (d > 0 ? 'بله' : 'نه')).test(r[0].text) && has(r[0].text, Math.abs(d)) && !/درآمد:/.test(r[0].text), 'مقایسه: پاسخ مستقیم بله/نه + اختلاف ' + Math.abs(d) + ' و بی‌درآمد');
  // ۵) کارت ملت از اول سال
  const acct = ref(I, { tab: 'expense', year: cy, pred: x => x.account === 'ملت', ym: undefined });
  r = await A('هزینه‌های کارت ملت رو از اول سال نشون بده.'); const aE = r[0].args; ok(aE.account === 'ملت' && /^\d{4}-1-1$/.test(aE.dateFrom || '') && has(r[0].text, ref(I, { tab: 'expense', pred: x => x.account === 'ملت' && x.y === cy && x.m <= cm }).sum), 'حساب ملت + از ابتدای سال');
  r = await A('با کارت پاسارگاد چقدر خرج کردم؟'); ok(r[0].kind === 'text' && !/\d{3},\d{3}/.test(r[0].text), 'حساب ناموجود: عدد نمی‌سازد و می‌پرسد');
  // ۶) تسویه‌نشده
  const unpaid = ref(I, { tab: 'expense', status: 'unpaid' });
  r = await A('فقط مخارجی که هنوز تسویه نکردم.'); ok(r[0].args.status === 'unpaid' && has(r[0].text, unpaid.sum) && r[0].engine === 'chain' && !/در نظر گرفتم/.test(r[0].text), 'پرداخت‌نشده: ' + unpaid.sum + ' (موتور جدید و بی‌«در نظر گرفتم»)');
  // ۷) رستوران و کافه
  const rc = ref(I, { tab: 'expense', pred: x => x.desc === 'رستوران' || x.desc === 'کافه' });
  r = await A('خرج‌های رستوران و کافه رو با هم جمع کن.'); ok(has(r[0].text, rc.sum), 'رستوران و کافه با هم: ' + rc.sum);
  // ۸) مکالمه چندمرحله‌ای: سفر → مهر ← مهر پارسال
  const my = 7 > cm ? cy - 1 : cy;
  r = await A('هزینه‌های سفر رو نشون بده', 'اون هزینه‌های سفر رو فقط برای مهر ماه نشون بده.', 'نه، منظورم مهر پارسال بود.');
  ok(r[1].args.month === 7 && r[1].args.year === my, 'ادامه: «فقط برای مهر» ماه ۷ همان سال');
  const tripPrevMehr = ref(I, { tab: 'expense', ym: [[my - 1, 7]], pred: x => /^سفر/.test(x.desc) });
  ok(r[2].args.month === 7 && r[2].args.year === my - 1 && has(r[2].text, tripPrevMehr.sum), 'اصلاح «نه، مهر پارسال»: سال قبل و عدد ' + tripPrevMehr.sum);
  // ۹) همین گزارش برای درآمدها
  const incCur = ref(I, { tab: 'income', ym: [ym(I, 0)] });
  r = await A('هزینه‌های این ماه رو بگو', 'حالا همین گزارش رو برای درآمدها بگیر.'); ok(r[1].tool === 'transactions.aggregate' && r[1].args.tab === 'income' && r[1].args.month === cm && has(r[1].text, incCur.sum), 'همین گزارش برای درآمدها: همان ماه، نوع درآمد، عدد ' + incCur.sum);
  r = await A('خرج این ماه', 'و درآمد؟'); ok(r[1].args.tab === 'income' && r[1].args.month === cm, '«و درآمد؟» بازهٔ قبلی را نگه می‌دارد');
  r = await A('خرج آذر', 'همون ماه برای رستوران چی؟'); ok(r[1].args.month === 9 && r[1].kind === 'result', '«همون ماه» به ماه سؤال قبلی ارجاع می‌دهد');
  // ۱۰) تفکیک
  r = await A('بنزین این ماه', 'حالا تفکیکش کن'); ok(r[1].tool === 'transactions.group' && r[1].args.month === cm, '«تفکیکش کن» شرط‌های قبلی را نگه می‌دارد (بی پرسش اضافه)');
  r = await A('خرج این ماه رو به تفکیک دسته بگو'); const gd = await w.page.evaluate(() => { const o = hkAsstExec('transactions.group', { by: 'category', tab: 'expense', year: currentYear, month: currentMonth }); return o.result; });
  ok(r[0].tool === 'transactions.group' && r[0].args.by === 'category' && gd.groups.reduce((t, g) => t + g.sum, 0) === cur.sum && gd.groups.length >= 3, 'گروه‌بندی بر اساس دسته: جمع گروه‌ها = کل خرج (' + cur.sum + ')');
  // ۱۱) مبلغ و بازه‌ها
  r = await A('خرج‌هایی که بیشتر از یه میلیون بودن'); const big = ref(I, { tab: 'expense', pred: x => x.amount >= 1000000 }); ok(r[0].args.amountMin === 1000000 && r[0].text.indexOf(fmt(big.sum)) >= 0, '«یه میلیون» ← ۱٬۰۰۰٬۰۰۰ و جمع ' + big.sum);
  r = await A('از مهر تا آبان درآمدم چقدر بوده'); ok(/^\d{4}-7-1$/.test(r[0].args.dateFrom || '') && /-8-\d+$/.test(r[0].args.dateTo || ''), 'از مهر تا آبان: بازهٔ دو ماه');
  r = await A('از فروردین تا الان چقدر خرج کردم'); ok(/^\d{4}-1-1$/.test(r[0].args.dateFrom || '') && r[0].args.dateTo === (cy + '-' + cm + '-' + (cm <= 6 ? 31 : cm <= 11 ? 30 : 29)) || /^\d{4}-1-1$/.test(r[0].args.dateFrom || ''), 'از فروردین تا الان');
  // ۱۱ب) واژه‌ها و بازه‌های بیشتر
  r = await A('میشه بگی تو دو ماه اخیر چقدر درآمد داشتم'); const inc2 = ref(I, { tab: 'income', ym: [ym(I, 0), ym(I, -1)] }); ok(!!r[0].args.dateFrom && has(r[0].text, inc2.sum), '«دو ماه اخیر»: بازهٔ ۲ ماه و عدد ' + inc2.sum);
  r = await A('آخرین خرجم چی بود'); ok(r[0].kind === 'result' && /^آخرین خرج/.test(r[0].text) && !/نتوانستم/.test(r[0].text), 'آخرین خرج: یک جملهٔ مستقیم');
  r = await A('هزینه های تفریحی'); ok(r[0].engine === 'chain' && r[0].args.cats && r[0].args.cats.indexOf('fun') >= 0 && !/در نظر گرفتم/.test(r[0].text), '«تفریحی» صفت دسته است نه غلط‌تایپی');
  r = await A('خرج‌هام نسبت به ماه پیش چطوره'); ok(r[0].tool === 'reports.compare' && r[0].args.a.month === cm && has(r[0].text, Math.abs(cur.sum - prev.sum)), '«نسبت به ماه پیش»: ماه جاری در برابر ماه قبل');
  r = await A('درآمد ماه پیش', 'نسبت به این ماه چطور؟'); ok(r[1].tool === 'reports.compare' && r[1].args.tab === 'income' && !/هزینه:/.test(r[1].text), 'مقایسهٔ ادامه‌ای نوع «درآمد» را نگه می‌دارد');
  r = await A('خرج سفر امسال', 'به تفکیک ماه'); ok(r[1].tool === 'transactions.group' && r[1].args.by === 'month' && r[1].args.year === cy && r[1].args.cats && r[1].args.cats.length === 1, '«به تفکیک ماه» شرط‌های سؤال قبلی (سال، دسته) را حفظ می‌کند');
  r = await A('موجودی کارت ملت'); ok(r[0].kind === 'text' && /نمی‌توانم/.test(r[0].text) && !/\d{3},\d{3}/.test(r[0].text), 'موجودی هر کارت: صادقانه می‌گوید نمی‌تواند و عدد کل را جای آن نمی‌دهد');
  r = await A('جمع درآمدها و خرج‌ها'); ok(r[0].tool === 'insights.overview', '«جمع درآمدها و خرج‌ها»: خلاصهٔ درآمد/هزینه');
  r = await A('خرج بنزین ماه پیش', 'جمع کن'); ok(r[1].kind === 'result' && r[1].args.month === (cm === 1 ? 12 : cm - 1), '«جمع کن» روی سؤال قبلی');
  r = await A('خرج دیروز'); ok(/برای \d+ \S+ \d+ هیچ ردیفی/.test(r[0].text) || r[0].kind === 'result', 'بازهٔ روز: برچسب خوانا (نه تاریخ خام)');
  // ۱۲) نفی، نتیجهٔ خالی، ابهام
  const exF = ref(I, { tab: 'expense', pred: x => x.desc !== 'نان' });
  r = await A('همه هزینه‌ها به‌جز خوراک'); ok(r[0].args.excludeCats && r[0].args.excludeCats.indexOf('food') >= 0 && r[0].kind === 'result', 'همه به‌جز خوراک: excludeCats');
  r = await A('خرج مهر ۱۳۸۰'); ok(/ثبت نشده|پیدا نکردم/.test(r[0].text) && !/\d{3},\d{3}/.test(r[0].text), 'سال بدون داده: «ثبت نشده» و عدد جعلی نمی‌دهد');
  r = await A('چقدر شد؟'); ok(r[0].kind === 'text' && /چقدرِ چی/.test(r[0].text), 'سؤال مبهم بی‌زمینه: می‌پرسد');
  r = await A('خرج زرتی'); ok(r[0].kind === 'text' && !/\d{3},\d{3}/.test(r[0].text), 'واژهٔ ناشناخته: عدد نمی‌دهد');
  // ۱۳) توضیح طبیعی از داده‌های واقعی
  r = await A('خرج این ماه'); ok(/بیشترین سهم مربوط به «/.test(r[0].text) && has(r[0].text, prev.sum), 'پاسخ طبیعی: سهم بزرگ‌ترین دسته + مقایسه با ماه قبل (' + prev.sum + ')');
  // ۱۴) جلوگیری از عملیات اشتباه + عدم تغییر داده
  r = await A('یه هزینه ۵۰ هزار تومنی نان ثبت کن'); ok(r[0].kind === 'text' && !r[0].tool, 'ثبت تراکنش از دستیار: انجام نمی‌شود');
  r = await A('قیمت دلار چنده'); ok(r[0].kind === 'text' && !r[0].tool, 'خارج از دامنه: ابزار نامربوط نمی‌زند');
  const snap1 = await w.page.evaluate(() => JSON.stringify(archive) + '|' + JSON.stringify(periodData)); ok(snap0 === snap1, 'هیچ دادهٔ دفتر تغییر نکرد');
  ok(w.errs.length === 0, 'بدون خطای صفحه' + (w.errs.length ? ' ' + w.errs[0] : ''));
  await w.close(); console.log('batch-1447: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();
