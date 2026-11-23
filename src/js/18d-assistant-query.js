    /* ===== ۱.۴.۲۴: دستیار هوشمند — تفسیر درخواست فارسی =====
       متن را با واژه‌نامهٔ 18f به کدهای معنایی تبدیل می‌کند، غلط‌تایپی‌ها را اصلاح می‌کند و یک فرمان ساختاریافته می‌سازد.
       خروجی: {tool, args, explain, corrections, understood} یا {ask, suggestions}.
       اگر مطمئن نباشد، فرمان نمی‌سازد و می‌پرسد. این فایل فقط به 18c (داده و ابزار) و 18f (واژه‌نامه) وابسته است. */
    function hkAsstTokens(s) { return hkAsstNorm(s).replace(/[،,؟?!.:؛"«»()\/\-–—]/g, ' ').split(' ').filter(Boolean); }
    /* عدد فارسی/لاتین با واحد: «۱۰ میلیون»، «ده میلیون»، «۵۰ هزار تومن»، «۱٫۵ میلیون» */
    function hkAsstAmountAt(text) {
      var re = /(\d+(?:[.,٫]\d+)?)\s*(میلیارد|ملیارد|میلیون|هزار)?\s*(ریال|تومان|تومن)?/g, out = [], m;
      while ((m = re.exec(text))) {
        var raw = m[1].replace(/[,٫]/g, '.');
        var n = parseFloat(raw);
        if (!isFinite(n)) continue;
        var mul = /میلیارد|ملیارد/.test(m[2] || '') ? 1e9 : m[2] === 'میلیون' ? 1e6 : m[2] === 'هزار' ? 1e3 : 1;
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
      /* «ده میلیون» با عدد فارسی به حروف */
      var words = text.split(' ');
      for (var i = 0; i < words.length - 1; i++) {
        var w = words[i].replace(/[،,]/g, '');
        if (HK_ASST_NUMWORDS[w] && /^(میلیون|هزار|میلیارد|ملیارد)$/.test(words[i + 1])) {
          var mm = /میلیارد|ملیارد/.test(words[i + 1]) ? 1e9 : words[i + 1] === 'میلیون' ? 1e6 : 1e3;
          out.push({ value: HK_ASST_NUMWORDS[w] * mm, mul: mm, at: text.indexOf(words[i]), end: text.indexOf(words[i + 1]) + words[i + 1].length, unit: true, n: HK_ASST_NUMWORDS[w], rial: false });
        }
      }
      out.sort(function (a, b) { return a.at - b.at; });
      return out;
    }
    /* عبارت‌های عملگر مبلغ، روی متنِ پیش از عدد جست‌وجو می‌شوند */
    var HK_ASST_GT_RE = /(بالای|بالاتر|بیشتر|بیش از|حداقل|بزرگ‌?تر|بزرگتر|سنگین|گران‌?تر|گرون‌?تر|بالا\s)/;
    var HK_ASST_LT_RE = /(زیر|کمتر|کم‌?تر|پایین|حداکثر|سقف|ارزان|کوچک‌?تر)/;
    var HK_ASST_EQ_RE = /(دقیق|برابر|مساوی)/;
    /* تشخیص محدودهٔ زمانی و نوع از کدها؛ نام ماه از کد MONTH_k می‌آید */
    function hkAsstMonthFromCodes(codes) {
      for (var k = 1; k <= 12; k++) if (codes.indexOf('MONTH_' + k) >= 0) return k;
      return 0;
    }
    /* پارسال/سال قبل را جدا از سال جاری می‌گیرد */
    function hkAsstPersianDate(text) {
      var y = /(۱۳\d\d|۱۴\d\d|13\d\d|14\d\d)/.exec(hkAsstNorm(text));
      return y ? parseInt(String(y[1]).replace(/[^\d]/g, ''), 10) : 0;
    }
    function hkAsstParse(raw) {
      hkAsstBuildLex();
      var text = hkAsstNorm(raw).replace(/[،,؟?!.:؛"«»()\/]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text) return { ask: 'چه چیزی را بگردم یا حساب کنم؟', suggestions: HK_ASST_EXAMPLES_TEXT() };
      if (/^(سلام|درود|صبح بخیر|عصر بخیر|خوبی|ممنون|مرسی|تشکر)[\s!؟?.]*$/.test(text)) {
        return { ask: 'سلام! دربارهٔ تراکنش‌ها و مبالغ حساب‌کتاب بپرس؛ مثلاً «جمع هزینه‌های این ماه».', suggestions: HK_ASST_EXAMPLES_TEXT() };
      }
      var cy = currentYear, cm = currentMonth;
      /* سؤال دربارهٔ خود داده‌ها (نه تراکنش): دسته‌ها، حساب‌ها، ماه‌ها، پروژه‌ها */
      var asksCount = /چند|تعداد|چندتا|چن تا|چنتا|چند تا/.test(text), asksHave = /داری|داریم|دارم|دارید|دارن|چی|کدوم|کدام|لیست|فهرست|اسم/.test(text);
      if (/دسته/.test(text) && (asksCount || asksHave)) return { tool: 'categories.summary', args: {}, explain: 'categories' };
      if (/حساب/.test(text) && (asksCount || asksHave) && !/آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر/.test(text)) return { tool: 'accounts.list', args: {}, explain: 'accounts' };
      if (/ماه/.test(text) && asksCount && /ثبت|داده|اطلاعات|دارم|داریم|داری|داره/.test(text) && !/ردیف|تراکنش|هزینه|درآمد|خرج|مخارج/.test(text)) return { tool: 'months.summary', args: {}, explain: 'months' };
      if (/پروژه/.test(text) && asksCount && !/هزینه|مخارج|خرج|درآمد|تراکنش|ردیف/.test(text)) return { tool: 'projects.list', args: {}, explain: 'projlist' };
      var codes = [], words = [], corrections = [];
      /* مرحلهٔ ۱: عبارت‌های چندکلمه‌ای و کلمه‌های شناخته‌شده (طولانی‌ترین تطبیق اول) */
      var toks = text.split(' ');
      var i = 0;
      while (i < toks.length) {
        var matched = false;
        for (var len = 4; len >= 1 && !matched; len--) {
          if (i + len > toks.length) continue;
          var phrase = toks.slice(i, i + len).join(' ');
          var code = hkAsstLookup(hkAsstKey(phrase));
          if (code) { codes.push(code); i += len; matched = true; }
        }
        if (matched) continue;
        var t = toks[i], key = hkAsstKey(t);
        i++;
        if (/\d/.test(t)) continue;               /* عدد: جداگانه از متن مبلغ خوانده می‌شود */
        if (hkAsstIsStop(key)) continue;
        var fz = hkAsstFuzzyCode(key);
        if (fz) { codes.push(fz.code); corrections.push({ from: t, to: fz.word }); continue; }
        words.push(t);
      }
      /* مرحلهٔ ۲: کلمه‌های متنی که در داده نیستند، اگر به یک کلمهٔ داده بسیار نزدیک باشند، اصلاح می‌شوند (مثل «تویتا» → «تویوتا») */
      var dataWords = hkAsstDataWords();
      var subj = null, textWords = [];
      words.forEach(function (w) {
        if (!subj) { var sm = hkAsstFindSubject(w); if (sm) { subj = sm; return; } }
        var k = hkAsstKey(w);
        var exact = dataWords.filter(function (d) { return d.key === k; })[0];
        if (exact || !dataWords.length) { textWords.push(exact ? exact.word : w); return; }
        var near = hkAsstNearest(k, dataWords, 2);
        if (near) { corrections.push({ from: w, to: near.word }); textWords.push(near.word); }
        else textWords.push(w);
      });
      /* مرحلهٔ ۳: مبلغ و عملگر آن */
      var amts = hkAsstAmountAt(text);
      var args = {};
      if (amts.length) {
        var a0 = amts[0], before = text.slice(Math.max(0, a0.at - 22), a0.at);
        var inRange = codes.indexOf('OP_BT') >= 0 || /بین/.test(text);
        if (amts.length >= 2 && inRange) { args.amountMin = Math.min(amts[0].value, amts[1].value); args.amountMax = Math.max(amts[0].value, amts[1].value); }
        else if (HK_ASST_GT_RE.test(before)) args.amountMin = a0.value;
        else if (HK_ASST_LT_RE.test(before)) args.amountMax = a0.value;
        else if (HK_ASST_EQ_RE.test(before) || codes.indexOf('OP_EQ') >= 0) args.amountEq = a0.value;
        else args.amountEq = a0.value;
      }
      /* مرحلهٔ ۴: زمان */
      if (codes.indexOf('THIS_M') >= 0) { args.year = cy; args.month = cm; }
      if (codes.indexOf('PREV_M') >= 0) { var pm = cm - 1, py = cy; if (pm < 1) { pm = 12; py = cy - 1; } args.year = py; args.month = pm; }
      var mk = hkAsstMonthFromCodes(codes);
      if (mk) {
        var explicitY = hkAsstPersianDate(text);
        args.month = mk;
        args.year = explicitY || (mk > cm ? cy - 1 : cy);
      }
      if (codes.indexOf('THIS_Y') >= 0) args.year = cy;
      if (codes.indexOf('PREV_Y') >= 0) args.year = cy - 1;
      var span = codes.indexOf('SPAN3') >= 0 ? 3 : codes.indexOf('SPAN6') >= 0 ? 6 : codes.indexOf('SPAN12') >= 0 ? 12 : 0;
      if (span) {
        var fy = cy, fm = cm - (span - 1); while (fm < 1) { fm += 12; fy--; }
        args.dateFrom = fy + '-' + fm + '-1'; args.dateTo = cy + '-' + cm + '-31';
        delete args.year; delete args.month;
      }
      /* مرحلهٔ ۵: نوع، بخش، دسته */
      var hasE = codes.indexOf('EXP') >= 0, hasI = codes.indexOf('INC') >= 0;
      if (hasE && !hasI) args.tab = 'expense';
      if (hasI && !hasE) args.tab = 'income';
      var catIds = [];
      codes.forEach(function (c) { if (c.indexOf('CAT_') === 0) { var id = c.slice(4); if (catIds.indexOf(id) < 0) catIds.push(id); } });
      if (catIds.length) args.cats = catIds;
      if (codes.indexOf('PROJ') >= 0 && codes.indexOf('PERS') < 0) args.context = 'project';
      if (codes.indexOf('PERS') >= 0 && codes.indexOf('PROJ') < 0) args.context = 'personal';
      if (textWords.length) args.text = textWords.join(' ');
      if (subj) args.project = subj.name;

      /* مرحلهٔ ۶: قصد (intent) */
      var intent = null;
      if (codes.indexOf('CMP') >= 0) intent = 'compare';
      else if (codes.indexOf('GRP') >= 0) intent = 'group';
      else if (codes.indexOf('AVG') >= 0) intent = 'avg';
      else if (codes.indexOf('MAX') >= 0) intent = 'max';
      else if (codes.indexOf('MIN') >= 0) intent = 'min';
      else if (codes.indexOf('CNT') >= 0) intent = 'count';
      else if (codes.indexOf('SUM') >= 0) intent = 'sum';
      else if (codes.indexOf('SRCH') >= 0) intent = 'search';
      /* پروژه: اگر نام پروژه آمده باشد خلاصهٔ همان؛ اگر فقط «پروژه‌ها» آمده باشد فهرست پروژه‌ها */
      if (args.project && (!intent || intent === 'sum')) intent = 'projsum';
      if (!intent && codes.indexOf('PROJ') >= 0 && !args.project) intent = 'projlist';
      var hasFilter = !!(args.tab || args.year || args.month || args.dateFrom || args.cats || args.context || args.project);
      if (!intent) {
        if (hasFilter && !args.text && args.amountEq == null && args.amountMin == null && args.amountMax == null) intent = 'sum';
        else if (args.text || args.amountEq != null || args.amountMin != null || args.amountMax != null) intent = 'search';
        else if (hasFilter) intent = 'sum';
      }
      if (!intent) return { ask: 'منظورت را کمی دقیق‌تر بگو؛ مثلاً «بیمه تویوتا را پیدا کن» یا «جمع هزینه‌های آبان».', suggestions: HK_ASST_EXAMPLES_TEXT() };

      var cmd = hkAsstBuildCommand(intent, args, codes, text);
      cmd.corrections = corrections;
      cmd.understood = hkAsstUnderstood(intent, args);
      return cmd;
    }
    /* فرمان نهایی به ابزار؛ «فهمیدم» متن قابل‌فهم برای کاربر است */
    function hkAsstBuildCommand(intent, args, codes, text) {
      if (intent === 'projsum') return { tool: 'projects.summary', args: { project: args.project }, explain: 'projsum' };
      if (intent === 'projlist') return { tool: 'projects.list', args: {}, explain: 'projlist' };
      if (intent === 'compare') {
        var cy = currentYear, cm = currentMonth, pm = cm - 1, py = cy; if (pm < 1) { pm = 12; py = cy - 1; }
        var a = { year: cy, month: cm }, b = { year: py, month: pm };
        if (args.month) { a = { year: args.year || cy, month: args.month }; b = { year: a.month === 1 ? a.year - 1 : a.year, month: a.month === 1 ? 12 : a.month - 1 }; }
        return { tool: 'reports.compare', args: { a: a, b: b, tab: args.tab, context: args.context, text: args.text, cats: args.cats } };
      }
      if (intent === 'group') {
        var by = codes.indexOf('PROJ') >= 0 ? 'context' : /حساب|کارت|بانک/.test(text) ? 'account' : /دسته|بخش/.test(text) ? 'section' : /درآمد و هزینه|نوع/.test(text) ? 'tab' : 'month';
        var g = Object.assign({}, args);
        if (by === 'context') delete g.context;
        return { tool: 'transactions.group', args: Object.assign({ by: by }, g) };
      }
      if (intent === 'max' || intent === 'min') {
        return { tool: 'transactions.search', args: Object.assign({}, args, { sort: intent === 'max' ? 'amountDesc' : 'amountAsc', limit: 1 }), explain: intent === 'max' ? 'بیشترین' : 'کمترین' };
      }
      if (intent === 'avg') return { tool: 'transactions.aggregate', args: args, explain: 'avg' };
      if (intent === 'count') return { tool: 'transactions.aggregate', args: args, explain: 'count' };
      if (intent === 'sum') return { tool: 'transactions.aggregate', args: args, explain: 'sum' };
      return { tool: 'transactions.search', args: args };
    }
    /* جملهٔ «فهمیدم» */
    function hkAsstUnderstood(intent, args) {
      var parts = [];
      var what = { sum: 'جمع', count: 'تعداد', avg: 'میانگین', max: 'بیشترین', min: 'کمترین', search: 'جست‌وجو', compare: 'مقایسه', group: 'گروه‌بندی', projsum: 'خلاصهٔ پروژه', projlist: 'فهرست پروژه‌ها' }[intent] || '';
      parts.push(what);
      if (args.tab) parts.push(args.tab === 'expense' ? 'هزینه‌ها' : 'درآمدها');
      else parts.push('همهٔ تراکنش‌ها');
      if (args.cats && args.cats.length) parts.push('دستهٔ ' + args.cats.map(function (c) { return HK_ASST_CAT_LABELS[c] || c; }).join('، '));
      if (args.project) parts.push('پروژهٔ «' + args.project + '»');
      if (args.context) parts.push(args.context === 'project' ? 'مربوط به پروژه' : 'شخصی');
      if (args.month) parts.push('ماه ' + HK_ASST_MONTH_NAMES[args.month - 1] + ' ' + toPersianDigits(String(args.year)));
      else if (args.year && !args.dateFrom) parts.push('سال ' + toPersianDigits(String(args.year)));
      else if (args.dateFrom) {
        var df = String(args.dateFrom).split('-'), n = (currentYear - (+df[0])) * 12 + (currentMonth - (+df[1])) + 1;
        parts.push(toPersianDigits(String(n)) + ' ماه گذشته');
      }
      else parts.push('از همهٔ ماه‌ها');
      if (args.text) parts.push('شامل «' + args.text + '»');
      if (args.amountEq != null) parts.push('مبلغ ' + toPersianDigits(formatNum(args.amountEq)) + ' تومان');
      if (args.amountMin != null && args.amountMax != null) parts.push('مبلغ بین ' + toPersianDigits(formatNum(args.amountMin)) + ' و ' + toPersianDigits(formatNum(args.amountMax)) + ' تومان');
      else if (args.amountMin != null) parts.push('مبلغ بیشتر از ' + toPersianDigits(formatNum(args.amountMin)) + ' تومان');
      else if (args.amountMax != null) parts.push('مبلغ کمتر از ' + toPersianDigits(formatNum(args.amountMax)) + ' تومان');
      return parts.join('، ');
    }
    /* نمونه‌پرسش‌ها برای راهنمایی وقتی متوجه نمی‌شود */
    function HK_ASST_EXAMPLES_TEXT() {
      return ['جمع هزینه‌های این ماه', 'بیمه تویوتا را پیدا کن', 'تراکنش‌های بالای ده میلیون', 'بنزین چند تا؟', 'درآمد و هزینه این ماه را با ماه قبل مقایسه کن'];
    }
