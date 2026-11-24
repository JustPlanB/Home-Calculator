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
    /* ۱.۴.۴۰: لایهٔ «فهم» (hkAsstSemantic) از لایهٔ «ساخت فرمان» جداست: این تابع فقط مفهوم‌ها را درمی‌آورد (قصد، نوع، زمان، موضوع، کلمه‌های ناشناخته)
       و یا برای قصدهای ویژه مستقیماً فرمان برمی‌گرداند؛ در حالت عادی یک «قاب معنایی» (__frame) می‌دهد که hkAsstDecide و hkAsstFrameToCommand (۱۸j) به فرمان تبدیلش می‌کنند. */
    /* ۱.۴.۴۱: کلمه‌های «کنار گذاشته‌شده» (بعد از بدون/جز/غیر از) را به شرط «نه» تبدیل می‌کند */
    function hkAsstNegArgs(negWords, curTab) {
      var exT = [], exC = [], negFlow = '', dataWords = hkAsstDataWords();
      var _plural = function (w) { var t = w.replace(/(ها|های|هام|هایم|هایی|هاش)$/, ''); return t.length >= 3 && t !== w ? t : w; };
      negWords.forEach(function (w) {
        var kk = hkAsstKey(w), cc = hkAsstLookup(kk);
        if (!cc) { var fz2 = hkAsstFuzzyCode(kk); if (fz2) cc = fz2.code; }
        /* فقط اگر خودِ نام دسته گفته شده («جز قبوض») کل دسته کنار می‌رود؛ «بجز بنزین» فقط همان کلمه را کنار می‌گذارد، نه کل حمل‌ونقل */
        var catName = cc && cc.indexOf('CAT_') === 0 && (function (id) { var lb = HK_ASST_CAT_LABELS[id]; return !!lb && (hkAsstKey(lb) === kk || lb.split(/[\s\u200c]+/).some(function (x) { return x.length >= 3 && hkAsstKey(x) === kk; })); })(cc.slice(4));
        if (catName) { var cid = cc.slice(4); if (exC.indexOf(cid) < 0) exC.push(cid); }
        else if (cc === 'EXP' && curTab !== 'expense') negFlow = 'income';
        else if (cc === 'INC' && curTab !== 'income') negFlow = 'expense';
        /* «جز حقوق» در «درآمد این ماه»: حقوق نوعی از همان طرف است، نه خودِ طرف؛ پس کلمهٔ حذفی */
        else if (!cc || cc.indexOf('MONTH_') !== 0) {
          var multi = /\s/.test(w), ex2 = multi ? null : dataWords.filter(function (d) { return d.key === kk; })[0], nr2 = (ex2 || multi) ? null : hkAsstNearest(kk, dataWords, 2);
          var wd = ex2 ? ex2.word : nr2 ? nr2.word : (multi ? w : _plural(w));
          if (exT.indexOf(wd) < 0) exT.push(wd);
        }
      });
      var out = {}; if (exT.length) out.excludeText = exT; if (exC.length) out.excludeCats = exC; if (negFlow) out.tab = negFlow;
      return out;
    }
    function hkAsstSemantic(raw) {
      hkAsstBuildLex();
      var text = hkAsstNorm(raw).replace(/[،,؟?!.:؛"«»()\/]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text) return { ask: 'چه چیزی را بگردم یا حساب کنم؟', suggestions: HK_ASST_EXAMPLES_TEXT(), final: true };
      /* ۱.۴.۳۷: «سال ۴۰۳» و «آذر ۰۳» را «۱۴۰۳» می‌کند */
      text = hkAsstNormYears(text);
      /* ۱.۴.۳۷: «ثبت شده/ثبت‌شده/ثبت شد…» فعلِ همان تراکنش است نه کلمهٔ جست‌وجو (مثلاً «چند تراکنش براش ثبت شده؟») */
      text = text.replace(/ثبت[ \u200c]*(شده|شدن|شد|کردم|کردیم|کرده|داره|دارد)/g, ' ').replace(/\s+/g, ' ').trim();
      /* ۱.۴.۳۸: «این ماهم»، «خرجام»: پسوند ملکی از ماه/هفته/سال جدا شود؛ «پرداخت‌نشده» و «جیب‌به‌جیب» فیلتر هستند نه کلمهٔ جست‌وجو */
      var unpaidFlag = false, unpaidTab = '', transferFlag = false;
      text = text.replace(/(^| )(ماه|هفته|سال|امروز|دیروز)(م|ت|ش|مون|تون)(?= |$)/g, '$1$2');
      text = text.replace(/(پرداخت|دریافت|تسویه|وصول)[ \u200c]*(نشده|نشدن|نکردم|نکرده|نگرفتم|نگرفته)|هنوز [^ ]+ نشده|هنوز نشده|معوق(ه)?|نگرفتم/g, function (m) { unpaidFlag = true; if (/^دریافت|نگرفتم/.test(m)) unpaidTab = 'income'; else if (/^پرداخت|نکردم/.test(m)) unpaidTab = 'expense'; return ' '; });
      text = text.replace(/جیب[ \u200c]*به[ \u200c]*جیب([ \u200c]*(ها|های))?/g, function () { transferFlag = true; return ' '; });
      text = text.replace(/\s+/g, ' ').trim();
      /* ۱.۴.۴۱: «بدون اسنپ»، «جز قبوض»، «به‌جز هزینه‌ها»، «غیر از X»، «X رو حساب نکن»: بخش کنار گذاشته‌شده از متن جدا و بعداً به شرط «نه» تبدیل می‌شود (نه شرط مثبت) */
      var negWords = [];
      var negJoin = function (first, more) { negWords.push(first); String(more || '').split(/\s+و\s+/).forEach(function (x) { x = x.trim(); if (x) negWords.push(x); }); };
      /* کلمهٔ منفی‌ساز + یک یا دو کلمهٔ بعدش (مثل «دیجی کالا») + زنجیرهٔ «و …» */
      (function () {
        var toks = text.split(' '), out = [], NEG = { 'بدون': 1, 'بجز': 1, 'جز': 1, 'بهجز': 1 };
        var isNeg = function (i) { var t = hkAsstKey(toks[i] || ''); return NEG[t] || (t === 'به' && hkAsstKey(toks[i + 1] || '') === 'جز') || (t === 'غیر' && hkAsstKey(toks[i + 1] || '') === 'از') || t === 'غیراز'; };
        var negLen = function (i) { var t = hkAsstKey(toks[i] || ''); return ((t === 'به' && hkAsstKey(toks[i + 1] || '') === 'جز') || (t === 'غیر' && hkAsstKey(toks[i + 1] || '') === 'از')) ? 2 : 1; };
        var boundary = function (j) { var t = toks[j]; if (!t) return true; var k = hkAsstKey(t); return /\d/.test(t) || hkAsstIsStop(k) || !!hkAsstLookup(k) || isNeg(j); };
        for (var i = 0; i < toks.length; i++) {
          if (!isNeg(i)) { out.push(toks[i]); continue; }
          var j = i + negLen(i);
          if (!toks[j]) { out.push(toks[i]); continue; }
          var phrase = toks[j]; j++;
          if (!boundary(j)) { phrase += ' ' + toks[j]; j++; }
          negWords.push(phrase);
          while (toks[j] === 'و' && toks[j + 1]) { var p2 = toks[j + 1]; j += 2; if (!boundary(j)) { p2 += ' ' + toks[j]; j++; } negWords.push(p2); }
          i = j - 1;
        }
        text = out.join(' ');
      })();
      text = text.replace(/(^| )([^ ]+)((?:\s+و\s+[^ ]+)*)\s+(?:رو|را)?\s*(?:حساب\s+نکن|حساب\s+نکنی|نشمار|نذار|نزار|کنار\s+بذار)(?= |$)/g, function (all, pre, first, more) { negJoin(first, more); return pre; });
      text = text.replace(/\s+/g, ' ').trim();
      /* فقط یک استثنا گفته شده («بدون اسنپ»، «جز خوراکی»): ادامهٔ سؤال قبلی است؛ در حافظهٔ گفتگو روی همان اعمال می‌شود */
      if (negWords.length && !text.split(' ').filter(function (t) { return t && !hkAsstIsStop(hkAsstKey(t)) && !/^(ولی|اما|پس|هم|و)$/.test(t); }).length) {
        var ngo = hkAsstNegArgs(negWords, '');
        return { tool: 'transactions.aggregate', args: ngo, explain: 'sum', understood: '', followUps: [], corrections: [], follow: true, negFollow: true };
      }
      var appCmd = hkAsstAppIntent(text);
      if (appCmd) return appCmd;
      var cy = hkAsstCY(), cm = hkAsstCM();
      /* سؤال دربارهٔ خود داده‌ها (نه تراکنش): دسته‌ها، حساب‌ها، ماه‌ها، پروژه‌ها */
      var preCodes = hkAsstPreCodes(text), special = (unpaidFlag || transferFlag) ? null : hkAsstSpecialKind(preCodes, text);
      var asksCount = /چند|تعداد|چندتا|چن تا|چنتا|چند تا/.test(text), asksHave = /داری|داریم|دارم|دارید|دارن|چی(?!ز)|کدوم|کدام|لیست|فهرست|اسم/.test(text);
      /* «دستهٔ حمل‌ونقل چند تراکنش دارد؟» دربارهٔ تراکنش‌های همان دسته است، نه فهرست دسته‌ها */
      var listish = /نشون|نشان|لیست|فهرست|کدوم|اسم|هام|هایم|های من/.test(text);
      if (!special && /دسته/.test(text) && (asksCount || asksHave || listish) && !/تراکنش|ردیف|هزینه|مخارج|خرج|درآمد|واریز|برداشت|گروه|تفکیک|بر اساس/.test(text)) return { tool: 'categories.summary', args: {}, explain: 'categories' };
      if (!special && /حساب/.test(text) && (asksCount || asksHave) && !/آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر/.test(text)) return { tool: 'accounts.list', args: {}, explain: 'accounts' };
      if (!special && /ماه/.test(text) && !/(این|همین|جاری|قبل|پیش|گذشته|ماه) ماه|ماه (جاری|قبل|پیش|گذشته|قبلی)/.test(text) && asksCount && /ثبت|داده|اطلاعات|دارم|داریم|داری|داره/.test(text) && !/ردیف|تراکنش|هزینه|درآمد|خرج|مخارج/.test(text)) return { tool: 'months.summary', args: {}, explain: 'months' };
      if (!special && /پروژه/.test(text) && (asksCount || listish) && !/هزینه|مخارج|خرج|درآمد|تراکنش|ردیف/.test(text)) return { tool: 'projects.list', args: {}, explain: 'projlist' };
      if (!special && /اطلاعات|داده/.test(text) && /از کی|کی تا کی|چه ماه|کدوم ماه|چند ماه/.test(text) && !/ردیف|تراکنش|هزینه|درآمد|خرج|مخارج/.test(text)) return { tool: 'months.summary', args: {}, explain: 'months' };
      var codes = [], words = [], corrections = [];
      var _plural = function (w) { var t = w.replace(/(ها|های|هام|هایم|هایی|هاش)$/, ''); return t.length >= 3 && t !== w ? t : w; };
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
        words.push(_plural(t));
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
      /* سال کامل (۱۳xx/۱۴xx بی‌واحد) مبلغ نیست */
      var amts = hkAsstAmountAt(text.replace(/(^|\s)(13|14)\d\d(?=\s|$)(?!\s*(میلیون|هزار|میلیارد|ملیارد|تومان|تومن|ریال))/g, ' '));
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
      var yy = hkAsstPersianDate(text);
      if (yy && !mk && !args.year) args.year = yy;                 /* «سال ۱۴۰۳ چقدر خرج کردم؟» */
      if (codes.indexOf('THIS_Y') >= 0) args.year = cy;
      if (codes.indexOf('PREV_Y') >= 0) args.year = cy - 1;
      if (codes.indexOf('NEXT_Y') >= 0) args.year = cy + 1;
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
      /* شرط‌های «نه»: دسته → excludeCats؛ «درآمد/هزینه» → فقط طرف دیگر؛ هر چیز دیگر → کلمهٔ حذفی */
      if (negWords.length) { var ng = hkAsstNegArgs(negWords, args.tab); if (ng.excludeText) args.excludeText = ng.excludeText; if (ng.excludeCats) args.excludeCats = ng.excludeCats; if (ng.tab && !args.tab) args.tab = ng.tab; }
      if (subj) args.project = subj.name;
      if (unpaidFlag) { args.status = 'unpaid'; if (!args.tab && unpaidTab) args.tab = unpaidTab; }
      if (transferFlag) { args.includeTransfers = true; args.transferOnly = true; }
      /* «میانگین خرج ماهانه‌ام» (بدون دسته و کلمه): میانگین جمع هر ماه */
      if (codes.indexOf('AVG') >= 0 && /ماهانه|ماهیانه|هر ماه|در ماه|ماهی/.test(text) && !args.cats && !args.text && !args.project) {
        return { tool: 'insights.monthavg', args: { tab: args.tab === 'income' ? 'income' : 'expense' }, explain: 'monthavg', understood: '', followUps: [], corrections: corrections };
      }
      /* «سهم خوراکی از کل خرجم»، «چند درصد خرجم قبضه؟» */
      if (/(^| )(سهم|درصد)( |$)/.test(text) && (args.cats || args.text || args.project || args.context)) {
        var shA = { tab: args.tab || 'expense' }; ['cats', 'text', 'project', 'context', 'year', 'month', 'dateFrom', 'dateTo'].forEach(function (k) { if (args[k] != null) shA[k] = args[k]; });
        return { tool: 'insights.share', args: shA, explain: 'share', understood: '', followUps: [], corrections: corrections };
      }

      /* ۱.۴.۳۷: گفتگوی عادی و قصدهای تحلیلی (وضعیت، روند، پیشنهاد، پیش‌بینی، بودجه، هدف…) */
      if (!special && !unpaidFlag && !transferFlag) special = hkAsstSpecialKind(codes, text);       /* غلط‌یاب هم ممکن است نشانهٔ تحلیلی پیدا کرده باشد («عجیبی» ← عجیب) */
      var chatK = hkAsstChatKind(codes, textWords, amts, text);
      if (chatK) return { ask: hkAsstChatReply(chatK, codes, text), final: true, understood: '', corrections: [], suggestions: (chatK === 'HI' || chatK === 'HELP' || chatK === 'WHO') ? HK_ASST_EXAMPLES_TEXT() : [] };
      if (special) {
        var sc = hkAsstSpecialCmd(special, codes, args, text, amts);
        if (sc) { sc.corrections = corrections; return sc; }
      }
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
      if (args.status && /(^| )(کدوم|کدام|لیست|فهرست|نشون|نشان)/.test(text)) intent = 'search';
      var hasFilter = !!(args.tab || args.year || args.month || args.dateFrom || args.cats || args.context || args.project);
      if (!intent) {
        if (hasFilter && !args.text && args.amountEq == null && args.amountMin == null && args.amountMax == null) intent = 'sum';
        else if (args.text || args.amountEq != null || args.amountMin != null || args.amountMax != null) intent = 'search';
        else if (hasFilter) intent = 'sum';
      }
      if (!intent) return { ask: hkAsstPick(['منظورت رو کامل نگرفتم؛ می‌شه یه کم دقیق‌تر بگی؟ مثلاً «بیمه تویوتا را پیدا کن» یا «جمع هزینه‌های آبان».', 'این یکی رو نفهمیدم. یه جور دیگه بپرس؛ مثلاً «این ماه چقدر خرج کردم؟» یا «وضعیت مالی‌ام چطوره؟».', 'هنوز نتونستم بفهمم چی می‌خوای. اگه نمونه می‌خوای بگو «چه کارایی بلدی؟».']), suggestions: HK_ASST_EXAMPLES_TEXT() };

      var _ic = ['CMP', 'GRP', 'AVG', 'MAX', 'MIN', 'CNT', 'SUM', 'SRCH', 'EXP', 'INC'].some(function (c) { return codes.indexOf(c) >= 0; });
      return {
        __frame: true, raw: raw, text: text, intent: intent, args: args, codes: codes, corrections: corrections,
        textWords: textWords, hasProject: !!subj, intentCode: _ic,
        yearExplicit: !!(typeof explicitY !== 'undefined' && explicitY) || !!yy,
        follow: !_ic && !args.tab && !args.status && args.amountEq == null && args.amountMin == null && args.amountMax == null && text.split(' ').filter(function (t) { return t && !hkAsstIsStop(hkAsstKey(t)); }).length <= 4
      };
    }
    /* فرمان نهایی به ابزار؛ «فهمیدم» متن قابل‌فهم برای کاربر است */
    function hkAsstBuildCommand(intent, args, codes, text) {
      if (intent === 'projsum') return { tool: 'projects.summary', args: { project: args.project }, explain: 'projsum' };
      if (intent === 'projlist') return { tool: 'projects.list', args: {}, explain: 'projlist' };
      if (intent === 'compare') {
        var cy = hkAsstCY(), cm = hkAsstCM(), pm = cm - 1, py = cy; if (pm < 1) { pm = 12; py = cy - 1; }
        var a = { year: cy, month: cm }, b = { year: py, month: pm };
        if (args.month) { a = { year: args.year || cy, month: args.month }; b = { year: a.month === 1 ? a.year - 1 : a.year, month: a.month === 1 ? 12 : a.month - 1 }; }
        return { tool: 'reports.compare', args: { a: a, b: b, tab: args.tab, context: args.context, text: args.text, cats: args.cats } };
      }
      if (intent === 'group') {
        var by = codes.indexOf('PROJ') >= 0 ? 'context' : /حساب|کارت|بانک/.test(text) ? 'account' : /(^| )(دسته|بخش)/.test(text) ? 'section' : /درآمد و هزینه|نوع/.test(text) ? 'tab' : 'month';
        var g = Object.assign({}, args);
        if (by === 'context') delete g.context;
        return { tool: 'transactions.group', args: Object.assign({ by: by }, g) };
      }
      if (intent === 'max' || intent === 'min') {
        var topN = 1, nm = /(\d+)\s*تا/.exec(hkAsstFaDigits(text)) || /(?:^| )(دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|پانزده|بیست)\s*تا/.exec(text);
        if (nm) topN = Math.min(50, Math.max(1, +nm[1] || HK_ASST_NUMWORDS[nm[1]] || ({ پانزده: 15, بیست: 20 })[nm[1]] || 1));
        return { tool: 'transactions.search', args: Object.assign({}, args, { sort: intent === 'max' ? 'amountDesc' : 'amountAsc', limit: topN }), explain: intent === 'max' ? 'بیشترین' : 'کمترین' };
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
        var df = String(args.dateFrom).split('-'), n = (hkAsstCY() - (+df[0])) * 12 + (hkAsstCM() - (+df[1])) + 1;
        parts.push(toPersianDigits(String(n)) + ' ماه گذشته');
      }
      else parts.push('از همهٔ ماه‌ها');
      if (args.text) parts.push('شامل «' + args.text + '»');
      if (args.excludeText && args.excludeText.length) parts.push('بدون «' + args.excludeText.join('، ') + '»');
      if (args.excludeCats && args.excludeCats.length) parts.push('به‌جز دستهٔ ' + args.excludeCats.map(function (c) { return HK_ASST_CAT_LABELS[c] || c; }).join('، '));
      if (args.amountEq != null) parts.push('مبلغ ' + toPersianDigits(formatNum(args.amountEq)) + ' تومان');
      if (args.amountMin != null && args.amountMax != null) parts.push('مبلغ بین ' + toPersianDigits(formatNum(args.amountMin)) + ' و ' + toPersianDigits(formatNum(args.amountMax)) + ' تومان');
      else if (args.amountMin != null) parts.push('مبلغ بیشتر از ' + toPersianDigits(formatNum(args.amountMin)) + ' تومان');
      else if (args.amountMax != null) parts.push('مبلغ کمتر از ' + toPersianDigits(formatNum(args.amountMax)) + ' تومان');
      return parts.join('، ');
    }
    /* نمونه‌پرسش‌ها برای راهنمایی وقتی متوجه نمی‌شود */
    function HK_ASST_EXAMPLES_TEXT() {
      return ['این ماه چقدر خرج کردم؟', 'بیمه تویوتا را پیدا کن', 'وضعیت مالی‌ام چطوره؟', 'چطور کمتر خرج کنم؟', 'درآمد و هزینه این ماه را با ماه قبل مقایسه کن'];
    }
