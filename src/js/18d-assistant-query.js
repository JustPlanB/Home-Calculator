    /* ===== ۱.۴.۲۴: دستیار هوشمند — تفسیر درخواست فارسی (Parser آزمایشی) =====
       متن فارسی را به یک فرمان ساختاریافته تبدیل می‌کند: {tool, args} یا {ask}. اگر مطمئن نباشد، فرمان نمی‌سازد و می‌پرسد. */
    var HK_ASST_NUMWORDS = { 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
      'بیست': 20, 'سی': 30, 'چهل': 40, 'پنجاه': 50, 'صد': 100, 'دویست': 200, 'پانصد': 500 };
    var HK_ASST_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    var HK_ASST_STOP = ['رو', 'را', 'که', 'کن', 'کنم', 'کنی', 'کنین', 'کنید', 'بده', 'بدم', 'بگو', 'بگین', 'ببین', 'ببینم', 'نشون', 'نشان', 'سرچ',
      'جست‌وجو', 'جستجو', 'پیدا', 'بگرد', 'گشتن', 'بگردم', 'چی', 'چیه', 'چه', 'چند', 'تا', 'تراکنش', 'تراکنش‌های', 'تراکنشهای', 'ها', 'های', 'این', 'اون', 'آن',
      'من', 'با', 'به', 'توی', 'تو', 'از', 'در', 'و', 'برای', 'مربوط', 'اسم', 'شرح', 'دارم', 'دارن', 'داشتم', 'شده', 'شد', 'است', 'هست', 'چقدر', 'مجموعشون',
      'مجموعش', 'مجموع', 'جمع', 'میانگین', 'بیشترین', 'کمترین', 'بوده', 'بود', 'چقدره', 'باشه', 'بالای', 'بالاتر', 'بیشتر', 'بیش', 'کمتر', 'زیر', 'پایین', 'بین', 'مبلغ', 'مبلغ‌های', 'ماه', 'ماهانه',
      'سال', 'امسال', 'گذشته', 'قبل', 'پیش', 'خرج', 'خرجی', 'هزینه', 'هزینه‌های', 'هزینه‌ها', 'مخارج', 'درآمد', 'درآمدهای', 'واریزی', 'برداشت', 'پرداخت',
      'دریافتی', 'پروژه', 'پروژه‌ها', 'پروژه‌های', 'پروژه‌ای', 'شخصی', 'جداگانه', 'نشون‌بده', 'گروه‌بندی', 'گروه', 'دسته', 'بر', 'اساس', 'به‌تفکیک', 'تفکیک',
      'مقایسه', 'کن', 'میلیون', 'میلیارد', 'هزار', 'تومان', 'ریال', 'حدود', 'تقریبا', 'تقریباً', 'روز', 'امروز', 'اسفند', 'منو', 'من', 'میخوام', 'می‌خوام', 'خوام',
      'بیشتر', 'نشون', 'بده', 'ببین', 'برای', 'تا', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'بیست', 'سی', 'صد'];
    function hkAsstTokens(s) { return hkAsstNorm(s).replace(/[،,؟?!.:؛"«»()]/g, ' ').split(' ').filter(Boolean); }
    /* عدد فارسی/لاتین با واحد: «۱۰ میلیون»، «ده میلیون»، «۱٫۵ میلیون»، «۲۰۰۰۰۰۰۰۰» */
    function hkAsstAmountAt(text) {
      var re = /(\d+(?:[.,٫]\d+)?)\s*(میلیارد|میلیون|هزار)?\s*(ریال|تومان)?/g, out = [], m;
      while ((m = re.exec(text))) {
        var raw = m[1].replace(/[,٫]/g, '.');
        var n = parseFloat(raw), mul = m[2] === 'میلیارد' ? 1e9 : m[2] === 'میلیون' ? 1e6 : m[2] === 'هزار' ? 1e3 : 1;
        if (!isFinite(n)) continue;
        var val = Math.round(n * mul);
        if (m[3] === 'ریال') val = Math.round(val / 10);
        out.push({ value: val, mul: mul, at: m.index, end: m.index + m[0].length, unit: !!m[2] || !!m[3], n: n, rial: m[3] === 'ریال' });
      }
      /* «بین ۱۰ و ۲۰ میلیون»: عدد بی‌واحد جلوی عدد با واحد، همان واحد را می‌گیرد */
      for (var j = 0; j < out.length - 1; j++) {
        var cur = out[j], nxt = out[j + 1];
        if (!cur.unit && nxt.unit && /^\s*(و|تا|-)\s*$/.test(text.slice(cur.end, nxt.at)) && !nxt.rial) {
          cur.value = Math.round(cur.n * nxt.mul); cur.unit = true;
        }
      }
      var words = text.split(' ');
      for (var i = 0; i < words.length - 1; i++) {
        var w = words[i].replace(/[،,]/g, '');
        if (HK_ASST_NUMWORDS[w] && (words[i + 1] === 'میلیون' || words[i + 1] === 'هزار' || words[i + 1] === 'میلیارد')) {
          var mm = words[i + 1] === 'میلیون' ? 1e6 : words[i + 1] === 'هزار' ? 1e3 : 1e9;
          out.push({ value: HK_ASST_NUMWORDS[w] * mm, at: text.indexOf(words[i]), end: text.indexOf(words[i + 1]) + words[i + 1].length, unit: true });
        }
      }
      return out;
    }
    function hkAsstParse(raw) {
      var text = hkAsstNorm(raw);
      if (!text) return { ask: 'چه چیزی را بگردم یا حساب کنم؟' };
      if (/^(سلام|درود|صبح بخیر|عصر بخیر|خوبی|ممنون|مرسی|تشکر)[\s!؟?.]*$/.test(text)) return { ask: 'سلام! دربارهٔ تراکنش‌ها و مبالغ حساب‌کتاب بپرس؛ مثلاً «جمع هزینه‌های این ماه».' };
      var cy = currentYear, cm = currentMonth;
      var args = {}, tokens = hkAsstTokens(text);
      var has = function (w) { return text.indexOf(w) >= 0; };
      var isCompare = /مقایسه|با ماه قبل|نسبت به ماه/.test(text);
      var isGroup = /گروه|تفکیک|به تفکیک|بر اساس|جداگانه|ماه به ماه/.test(text);
      var isAvg = /میانگین/.test(text);
      var isCount = /چند تا|چند|تعداد/.test(text);
      var isMax = /بیشترین/.test(text), isMin = /کمترین/.test(text);
      var isSum = /جمع|مجموع|چقدر|چقد|مانده|کل/.test(text);
      var isSearch = /سرچ|پیدا|بگرد|جست.?جو|ببین|نشون|نشان|لیست|فهرست/.test(text);

      /* تاریخ */
      var yearM = /(۱۳\d\d|۱۴\d\d|13\d\d|14\d\d)/.exec(text);
      if (/این ماه|همین ماه|ماه جاری/.test(text)) { args.year = cy; args.month = cm; }
      else if (/ماه قبل|ماه پیش|ماه گذشته/.test(text) && !/(سه|شش|دو)\s*ماه\s*(گذشته|اخیر)/.test(text)) {
        var pm = cm - 1, py = cy; if (pm < 1) { pm = 12; py = cy - 1; }
        args.year = py; args.month = pm;
      }
      if (/امسال|سال جاری|این سال/.test(text)) { args.year = cy; }
      if (yearM) args.year = parseInt(hkAsstNorm(yearM[1]).replace(/[^\d]/g, ''), 10);
      var mIdx = -1;
      HK_ASST_MONTHS.forEach(function (name, i) { if (text.indexOf(name) >= 0 && mIdx < 0) mIdx = i; });
      if (mIdx >= 0) { args.month = mIdx + 1; if (!args.year) args.year = cy; }
      var span = /(سه|شش|دو|سه‌ماه|شش‌ماه|۳|۶|۲|3|6|2)\s*ماه\s*گذشته|(سه|شش|دو)\s*ماه\s*اخیر/.exec(text);
      if (span) {
        var k = /سه|۳|3/.test(span[1]) ? 3 : /شش|۶|6/.test(span[1]) ? 6 : 2;
        var fy = cy, fm = cm - (k - 1); while (fm < 1) { fm += 12; fy--; }
        args.dateFrom = fy + '-' + fm + '-1'; args.dateTo = cy + '-' + cm + '-31';
        delete args.year; delete args.month;
      }

      /* نوع */
      if (/درآمد|واریزی|دریافتی|حقوق|واریز/.test(text) && !/هزینه|خرج|مخارج|برداشت/.test(text)) args.tab = 'income';
      if (/هزینه|خرج|مخارج|برداشت|پرداخت/.test(text) && !/درآمد|واریزی|دریافتی/.test(text)) args.tab = 'expense';
      if (/پروژه/.test(text) && !/شخصی/.test(text)) args.context = 'project';
      if (/شخصی/.test(text) && !/پروژه/.test(text)) args.context = 'personal';

      /* مبلغ */
      var amts = hkAsstAmountAt(text);
      if (amts.length) {
        var a0 = amts[0], before = text.slice(Math.max(0, a0.at - 14), a0.at);
        if (amts.length >= 2 && /بین/.test(text)) { args.amountMin = Math.min(amts[0].value, amts[1].value); args.amountMax = Math.max(amts[0].value, amts[1].value); }
        else if (/بالای|بالاتر|بیشتر|بیش از|حداقل/.test(before)) args.amountMin = a0.value;
        else if (/زیر|پایین|کمتر|کمتر از|حداکثر/.test(before)) args.amountMax = a0.value;
        else if (/مبلغ|دقیقا|دقیقاً|برابر/.test(text)) args.amountEq = a0.value;
        else args.amountEq = a0.value;
      }

      /* متن جست‌وجو: کلمه‌هایی که کلیدواژه یا عدد یا واحد نیستند */
      var rest = tokens.filter(function (t) {
        if (HK_ASST_STOP.indexOf(t) >= 0) return false;
        if (/^[\d.,٫]+$/.test(t)) return false;
        if (HK_ASST_MONTHS.indexOf(t) >= 0) return false;
        return true;
      });
      if (rest.length) args.text = rest.join(' ');

      var nothingSpecific = !args.text && args.amountEq == null && args.amountMin == null && args.amountMax == null && args.year == null && args.month == null && !args.dateFrom && !args.tab && !args.context;
      if (isCompare) {
        if (!args.year || !args.month) { /* مقایسهٔ پیش‌فرض: این ماه با ماه قبل */ }
        var pmC = cm - 1, pyC = cy; if (pmC < 1) { pmC = 12; pyC = cy - 1; }
        return { tool: 'reports.compare', args: { a: { year: cy, month: cm }, b: { year: pyC, month: pmC }, tab: args.tab, context: args.context, text: args.text } };
      }
      if (isGroup && (args.text || !nothingSpecific || args.tab || args.context || args.amountMin || args.year)) {
        var by = /پروژه/.test(text) ? 'context' : /حساب|کارت|بانک/.test(text) ? 'account' : /دسته|بخش/.test(text) ? 'section' : /درآمد و هزینه|درآمد و مخارج|نوع/.test(text) ? 'tab' : 'month';
        if (by === 'context' || by === 'tab') { delete args.context; }
        return { tool: 'transactions.group', args: Object.assign({ by: by }, args) };
      }
      if (isAvg || isSum || isCount || isMax || isMin) {
        if (isMax || isMin) {
          var s1 = Object.assign({}, args, { sort: 'amountDesc', limit: 1 });
          return { tool: 'transactions.search', args: s1, explain: isMax ? 'بیشترین' : 'کمترین' };
        }
        if (nothingSpecific && !isSum) return { ask: 'کدام تراکنش‌ها؟ مثلاً یک شرح، یک بازه تاریخی یا یک بازه مبلغ بگو.' };
        return { tool: 'transactions.aggregate', args: args, explain: isAvg ? 'avg' : (isCount ? 'count' : 'sum') };
      }
      if (isSearch || args.text || args.amountMin != null || args.amountMax != null || args.amountEq != null) {
        if (nothingSpecific) return { ask: 'دنبال چه تراکنشی بگردم؟ شرح، مبلغ یا بازه‌ای بگو.' };
        return { tool: 'transactions.search', args: args };
      }
      if (nothingSpecific) return { ask: 'منظورت را کمی دقیق‌تر بگو؛ مثلاً «بیمه تویوتا را پیدا کن» یا «جمع هزینه‌های این ماه».' };
      return { ask: 'این درخواست را متوجه نشدم. نمونه: «تراکنش‌های بالای ده میلیون را پیدا کن».' };
    }
