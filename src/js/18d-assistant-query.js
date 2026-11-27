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
    /* ۱.۴.۴۳: کنار گذاشتنِ ماه/پروژه/حساب هنوز پشتیبانی نمی‌شود؛ به‌جای نادیده گرفتنِ بی‌صدا، همان‌جا متوقف می‌شود و عددی داده نمی‌شود */
    function hkAsstNegUnsupported(list) {
      var one = list[0];
      return { why: 'unsupported_negation', ask: 'کنار گذاشتنِ «' + one.w + '» (' + one.kind + ') رو هنوز نمی‌تونم انجام بدم؛ فقط دسته یا کلمه‌ای از شرح ردیف‌ها رو می‌تونم کنار بذارم، مثلاً «بدون بنزین» یا «به‌جز قبوض».', final: true, decision: 'ask', understood: '', corrections: [], suggestions: [], chipRaw: true };
    }
    function hkAsstNegArgs(negWords, curTab) {
      var exT = [], exC = [], negFlow = '', unsup = [], dataWords = hkAsstDataWords();
      var _plural = function (w) { var t = w.replace(/(ها|های|هام|هایم|هایی|هاش)$/, ''); return t.length >= 3 && t !== w ? t : w; };
      var accKeys = {}; try { selectedAccountLabels().forEach(function (l) { accKeys[hkAsstKey(l)] = 1; }); } catch (eA) {}
      negWords.forEach(function (w0) {
        var forceCat = w0.charAt(0) === '\u0001', w = forceCat ? w0.slice(1) : w0;
        var kk = hkAsstKey(w), cc = hkAsstLookup(kk);
        if (!cc) { var fz2 = hkAsstFuzzyCode(kk); if (fz2) cc = fz2.code; }
        if (cc && cc.indexOf('MONTH_') === 0) { unsup.push({ w: w, kind: 'ماه' }); return; }
        if (hkAsstFindSubject(w) && !(cc && cc.indexOf('CAT_') === 0)) { unsup.push({ w: w, kind: 'پروژه' }); return; }
        if (accKeys[kk] || accKeys[hkAsstKey(w.replace(/^(حساب|کارت|بانک) /, ''))]) { unsup.push({ w: w, kind: 'حساب' }); return; }
        /* فقط اگر خودِ نام دسته گفته شده («جز قبوض»، «بدون دستهٔ سفر») کل دسته کنار می‌رود؛ «بجز بنزین» فقط همان کلمه را کنار می‌گذارد، نه کل حمل‌ونقل */
        var catName = cc && cc.indexOf('CAT_') === 0 && (forceCat || hkAsstIsCatName(cc.slice(4), kk));
        if (catName) { var cid = cc.slice(4); if (exC.indexOf(cid) < 0) exC.push(cid); }
        else if (cc === 'EXP' && curTab !== 'expense') negFlow = 'income';
        else if (cc === 'INC' && curTab !== 'income') negFlow = 'expense';
        /* «جز حقوق» در «درآمد این ماه»: حقوق نوعی از همان طرف است، نه خودِ طرف؛ پس کلمهٔ حذفی */
        else {
          var multi = /\s/.test(w), ex2 = multi ? null : dataWords.filter(function (d) { return d.key === kk; })[0], nr2 = (ex2 || multi) ? null : hkAsstNearest(kk, dataWords, 2);
          var wd = ex2 ? ex2.word : nr2 ? nr2.word : (multi ? w : _plural(w));
          if (exT.indexOf(wd) < 0) exT.push(wd);
        }
      });
      var out = {}; if (exT.length) out.excludeText = exT; if (exC.length) out.excludeCats = exC; if (negFlow) out.tab = negFlow; if (unsup.length) out.unsupported = unsup;
      return out;
    }
    /* آیا دو واژهٔ پشت‌سرهم، با هم، عبارتی‌اند که در شرح یکی از ردیف‌ها آمده؟ («قسط وام»، «قبض آب») */
    /* دو واژهٔ پشت‌سرهم که هر دو از مترادف‌های «یک» دسته‌اند («قسط وام»، «قبض آب»، «قبض برق») یک عبارت‌اند؛ برای این تصمیم به داده نیازی نیست */
    function hkAsstSameCatPair(a, b) { try { var x = hkAsstLookup(hkAsstKey(a)), y = hkAsstLookup(hkAsstKey(b)); return !!x && x === y && x.indexOf('CAT_') === 0; } catch (e) { return false; } }
    var _hkAsstJoinHay = null;
    /* تصمیم‌هایی که به واژگان دادهٔ کاربر نگاه می‌کنند را اینجا ثبت می‌کنیم تا تحلیل‌گر (۱.۴.۴۴) آن‌ها را «وابسته به داده» علامت بزند */
    var _hkAsstDataNotes = [];
    function hkAsstJoinedInData(a, b) {
      try { if (_hkAsstJoinHay === null) _hkAsstJoinHay = hkAsstHayAll(); var ok = _hkAsstJoinHay.indexOf(hkAsstKey(String(a) + ' ' + String(b))) >= 0; if (ok) _hkAsstDataNotes.push('row_phrase:' + a + ' ' + b); return ok; } catch (e) { return false; }
    }
    var _hkAsstByAcct = false;
    function hkAsstSemantic(raw) {
      _hkAsstJoinHay = null; _hkAsstDataNotes = []; _hkAsstByAcct = false;
      hkAsstBuildLex();
      var text = hkAsstNorm(raw).replace(/[،,؟?!.:؛"«»()\/]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text) return { why: 'empty', ask: 'چه چیزی را بگردم یا حساب کنم؟', suggestions: HK_ASST_EXAMPLES_TEXT(), final: true };
      /* ۱.۴.۳۷: «سال ۴۰۳» و «آذر ۰۳» را «۱۴۰۳» می‌کند */
      text = hkAsstNormYears(text);
      /* ۱.۴.۴۶: «یه میلیون»، «نیم میلیون»، «دو و نیم میلیون» ← عدد (وگرنه شرط مبلغ بی‌صدا حذف می‌شد) */
      text = text.replace(/(^| )(یه|یک|یکی|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده) و نیم (میلیون|میلیارد|هزار)(?= |$)/g, function (a, p0, w, u) { var n = w === 'یه' || w === 'یکی' ? 1 : (HK_ASST_NUMWORDS[w] || 0); return p0 + (n + 0.5) + ' ' + u; });
      text = text.replace(/(^| )نیم (میلیون|میلیارد|هزار)(?= |$)/g, '$10.5 $2').replace(/(^| )(یه|یکی) (میلیون|میلیارد|هزار)(?= |$)/g, '$11 $3');
      /* «سه ماه اخیرم»، «اخیرشو»: پسوند ملکی/ضمیر به «اخیر» چسبیده؛ خودِ بازه است نه واژهٔ ناشناخته */
      text = text.replace(/(^| )(اخیر|گذشته)(م|ت|ش|شو|مون|تون|شون)(?= |$)/g, '$1$2');
      /* «از اول سال (تا الان)»، «از ابتدای امسال»: از ۱ فروردینِ امسال تا پایان ماه جاری */
      var ytdFlag = false;
      text = text.replace(/(^| )(از )?(اول|ابتدای|ابتدا|شروع)( | ?)(امسال|این سال|سال جاری|سال)( جاری)?( تا (الان|حالا|اکنون|امروز|این ماه|حال))?(?= |$)/g, function (a, p0) { ytdFlag = true; return p0; });
      /* «دو ماه اخیر»، «۴ ماه گذشته»، «پنج ماهِ اخیر»: بازهٔ N ماه تا ماه جاری (۳/۶/۱۲ را فرهنگ لغت می‌شناسد) */
      var spanN = 0;
      text = text.replace(/(^| )(\d+|دو|چهار|پنج|هفت|هشت|نه|ده|یازده|9|یه) ?ماه(?:ه|ِ)? (?:اخیر|گذشته|اخیرا)(?= |$)/g, function (a, p0, w) { var n = /^\d+$/.test(w) ? parseInt(w, 10) : (HK_ASST_NUMWORDS[w] || (w === 'یه' ? 1 : 0)); if (n >= 2 && n <= 12 && n !== 3 && n !== 6 && n !== 12) { spanN = n; return p0; } return a; });
      /* «هزینه‌های تفریحی»: صفت «ی» روی واژهٔ دستهٔ شناخته‌شده؛ غلط‌تایپی نیست */
      (function () {
        var tk = text.split(' '), ch = false;
        for (var ai2 = 0; ai2 < tk.length; ai2++) {
          var t0 = tk[ai2]; if (!/^[^ ]{4,}ی$/.test(t0)) continue; var k0 = hkAsstKey(t0); if (hkAsstLookup(k0)) continue;
          var b0 = hkAsstLookup(hkAsstKey(t0.replace(/ی$/, ''))); if (b0 && b0.indexOf('CAT_') === 0) { tk[ai2] = t0.replace(/ی$/, ''); ch = true; }
        }
        if (ch) text = tk.join(' ');
      })();
      /* «نانی که خریدم»، «بنزینی که زدم»: «ی» نکره روی واژهٔ موجود (فرهنگ لغت یا داده) نشانهٔ «که» است؛ خود واژه می‌ماند */
      (function () {
        var tk = text.split(' '), ch = false, dw = null;
        for (var ni = 0; ni < tk.length - 1; ni++) {
          if (tk[ni + 1] !== 'که' || !/[^ ]{3,}ی$/.test(tk[ni])) continue;
          var base = tk[ni].replace(/ی$/, ''), bk = hkAsstKey(base);
          if (!dw) { try { dw = hkAsstDataWords(); } catch (eD) { dw = []; } }
          if (hkAsstLookup(bk) || dw.some(function (d) { return d.key === bk; })) { tk[ni] = base; ch = true; }
        }
        if (ch) text = tk.join(' ');
      })();
      /* «مخارجی که / هزینه‌ای که / خرجی که»: «ی/ای» نشانهٔ نکره است نه غلط املایی */
      text = text.replace(/(^| )(مخارج|هزینه|خرج|درآمد|دخل)(?:‌?ای|ی)(?= که)/g, '$1$2');
      /* «بر اساس حساب/کارت»، «به تفکیک بانک»: بُعد گروه‌بندی است نه واژهٔ جست‌وجو */
      text = text.replace(/(^| )(?:بر ?اساس|براساس|به ?تفکیک|تفکیک)( ?)(?:حساب|کارت|بانک)(?:‌?ها)?(?= |$)/g, function (a, p0) { _hkAsstByAcct = true; return p0 + 'تفکیک'; });
      /* «از مهر تا آذر»، «بین مهر و آذر»، «از مهر تا الان»: بازهٔ ماه‌ها */
      var rangeM = null;
      (function () {
        var tk = text.split(' '), mon = function (w) { var c = hkAsstLookup(hkAsstKey(w || '')); return c && c.indexOf('MONTH_') === 0 ? parseInt(c.slice(6), 10) : 0; };
        for (var ri = 0; ri < tk.length - 3; ri++) {
          var h0 = hkAsstKey(tk[ri]);
          if ((h0 === 'از' || h0 === 'بین') && mon(tk[ri + 1]) && /^(تا|و)$/.test(hkAsstKey(tk[ri + 2]))) {
            var m1 = mon(tk[ri + 1]), m2 = mon(tk[ri + 3]), nowTo = /^(الان|حالا|اکنون|امروز)$/.test(hkAsstKey(tk[ri + 3]));
            if (m2 || nowTo) { rangeM = { m1: m1, m2: nowTo ? 0 : m2 }; tk.splice(ri, 4); text = tk.join(' '); break; }
          }
        }
      })();
      /* ارجاع به سؤال قبلی: «همین گزارش رو برای درآمدها بگیر»، «همون ماه برای رستوران چی؟» (فقط «همون/اون»؛ «همین ماه» یعنی ماه جاری) */
      var anaphoraEarly = false;
      text = text.replace(/(^| )(همین|همون|اون) (گزارش|آمار|ارقام|اعداد|حساب|محاسبه|موارد|مورد)( رو| را)?( برای| برا| واسه)?(?= |$)/g, function (a, p0) { anaphoraEarly = true; return p0; });
      text = text.replace(/(^| )(همون|اون) (ماه|بازه|دوره|سال|مدت|تاریخ)( رو| را)?(?= |$)/g, function (a, p0) { anaphoraEarly = true; return p0; });
      text = text.replace(/(^| )(بگیر|بده|بگو|درآر|دربیار|بکش)(?= |$)/g, function (a, p0, v) { return anaphoraEarly ? p0 : a; }).replace(/\s+/g, ' ').trim();
      /* ۱.۴.۴۶: «چند تومن/چند تومان» یعنی «چقدر» (مبلغ)، نه «چند تا» (تعداد) */
      text = text.replace(/(^| )چند ?(تومن|تومان|ریال)( |$)/g, '$1چقدر$3');
      /* ۱.۴.۳۷: «ثبت شده/ثبت‌شده/ثبت شد…» فعلِ همان تراکنش است نه کلمهٔ جست‌وجو (مثلاً «چند تراکنش براش ثبت شده؟») */
      text = text.replace(/ثبت[ \u200c]*(شده|شدن|شد|کردم|کردیم|کرده|داره|دارد)/g, ' ').replace(/\s+/g, ' ').trim();
      /* ۱.۴.۳۸: «این ماهم»، «خرجام»: پسوند ملکی از ماه/هفته/سال جدا شود؛ «پرداخت‌نشده» و «جیب‌به‌جیب» فیلتر هستند نه کلمهٔ جست‌وجو */
      var unpaidFlag = false, unpaidTab = '', transferFlag = false;
      text = text.replace(/(^| )(ماه|هفته|سال|امروز|دیروز)(م|ت|ش|مون|تون)(?= |$)/g, '$1$2');
      /* ۱.۴.۴۲: ارجاع به سؤال قبلی: «جمعش»، «تعدادش»، «درآمدشم»، «ماه قبلشو»، «ماه پیشش»، «همونو»، «منظورم …»؛ پسوند جدا می‌شود و پیام «ادامه» حساب می‌شود */
      text = text.replace(/(^| )(ماه|سال|هفته) (گذشت|گذشته|قبل|قبلی|پیش)(م|ت|ش|مون|تون)(?= |$)/g, function (a, p0, u, w) { return p0 + u + ' ' + (w === 'گذشت' ? 'گذشته' : w); });
      var anaphora = false; if (anaphoraEarly) anaphora = true;
      /* «جمع کن»، «جمع بزن»، «حساب کن» تنها: جمعِ همان سؤال قبلی */
      if (/^(حالا |خب |پس )?(جمع( کل)? ?(کن|بزن|بکن|کنش|بزنش)|حساب کن)( لطفا)?$/.test(text)) anaphora = true;
      text = text.replace(/(^| )(قبل|پیش|بعد|جمع|تعداد|درآمد|خرج|هزینه|مخارج|برداشت|واریز|میانگین|بیشترین|کمترین|تفکیک|گروه‌?بندی)(ش|شو|شم|شون|شونو)(?= |$)/g, function (a, pre, w) { anaphora = true; return pre + w; });
      text = text.replace(/(^| )(تراکنش|ردیف|خرید|هزینه|مخارج|درآمد|واریزی|برداشتی|خرج)(ام|هام|هامو)(?= |$)/g, '$1$2');
      text = text.replace(/(^| )(همونو|همونا|همینو|همینا|اونو|اونا|اون یکی)(?= |$)/g, function (a) { anaphora = true; return a; });
      if (/(^| )منظورم( |$)/.test(text)) { anaphora = true; text = text.replace(/(^| )(نه |نخیر )?(اشتباه فهمیدی |اشتباه شد )?منظورم ?/, '$1').replace(/ بود$/, '').trim(); }
      text = text.replace(/(^| )نپرداخت(?:ه|م|ی|یم|ن|ید)?(?= |$)|(پرداخت|دریافت|تسویه|وصول)[ \u200c]*(نشده|نشدن|نکردم|نکرده|نگرفتم|نگرفته)|هنوز [^ ]+ نشده|هنوز نشده|معوق(ه)?|نگرفتم/g, function (m) { unpaidFlag = true; /* ۱.۴.۴۳: «نپرداختم» نفی «پرداخت» است (هزینهٔ پرداخت‌نشده) و هرگز «پرداختم» حساب نمی‌شود */ if (/نپرداخت/.test(m)) unpaidTab = 'expense'; else if (/^دریافت|نگرفتم/.test(m)) unpaidTab = 'income'; else if (/^پرداخت|نکردم/.test(m)) unpaidTab = 'expense'; return ' '; });
      text = text.replace(/جیب[ \u200c]*به[ \u200c]*جیب([ \u200c]*(ها|های))?/g, function () { transferFlag = true; return ' '; });
      text = text.replace(/\s+/g, ' ').trim();
      /* ۱.۴.۴۶: حساب/کارت: «کارت ملت»، «با بانک ملی»، «از حساب پس‌انداز»؛ فقط اگر در ردیف‌های واقعی چنین حسابی باشد شرط حساب می‌شود (وگرنه مثل قبل واژهٔ ناشناخته پرسیده می‌شود) */
      var acctArg = null;
      try {
        var AN = hkAsstAccountNames();
        if (AN.length) {
          var at0 = text.split(' ');
          outerA: for (var ai = 0; ai < at0.length; ai++) {
            for (var al = 3; al >= 1; al--) {
              if (ai + al > at0.length) continue;
              var ph = at0.slice(ai, ai + al).join(' '), pk = hkAsstKey(ph), hasMark = ai > 0 && /^(کارت|بانک|حساب)$/.test(hkAsstKey(at0[ai - 1]));
              var hit = AN.filter(function (a) { return a.key === pk && (hasMark || (pk.length >= 4 && !hkAsstLookup(pk) && !hkAsstIsStop(pk))); })[0];
              if (hit) { acctArg = hit.norm; at0.splice(hasMark ? ai - 1 : ai, al + (hasMark ? 1 : 0)); text = at0.join(' '); break outerA; }
            }
          }
        }
      } catch (eAc) { acctArg = null; }
      /* ۱.۴.۴۱: «بدون اسنپ»، «جز قبوض»، «به‌جز هزینه‌ها»، «غیر از X»، «X رو حساب نکن»: بخش کنار گذاشته‌شده از متن جدا و بعداً به شرط «نه» تبدیل می‌شود (نه شرط مثبت) */
      var negWords = [];
      var negJoin = function (first, more) { negWords.push(first); String(more || '').split(/\s+و\s+/).forEach(function (x) { x = x.trim(); if (x) negWords.push(x); }); };
      /* کلمهٔ منفی‌ساز + یک یا دو کلمهٔ بعدش (مثل «دیجی کالا») + زنجیرهٔ «و …» */
      (function () {
        var toks = text.split(' '), out = [], NEG = { 'بدون': 1, 'بجز': 1, 'جز': 1, 'بهجز': 1 };
        var isNeg = function (i) { var t = hkAsstKey(toks[i] || ''); return NEG[t] || (t === 'به' && hkAsstKey(toks[i + 1] || '') === 'جز') || (t === 'غیر' && hkAsstKey(toks[i + 1] || '') === 'از') || t === 'غیراز'; };
        var negLen = function (i) { var t = hkAsstKey(toks[i] || ''); return ((t === 'به' && hkAsstKey(toks[i + 1] || '') === 'جز') || (t === 'غیر' && hkAsstKey(toks[i + 1] || '') === 'از')) ? 2 : 1; };
        var boundary = function (j) { var t = toks[j]; if (!t) return true; var k = hkAsstKey(t); return /\d/.test(t) || hkAsstIsStop(k) || !!hkAsstLookup(k) || isNeg(j) || /^(حساب|محاسبه|حسابش|بحساب)$/.test(k); };
        for (var i = 0; i < toks.length; i++) {
          if (!isNeg(i)) { out.push(toks[i]); continue; }
          var j = i + negLen(i);
          if (!toks[j]) { out.push(toks[i]); continue; }
          /* «بدون هیچ شرطی» یعنی هیچ استثنایی نیست؛ «بدون دستهٔ X»: «دسته» فقط نشانهٔ نوع است و X یک دسته است */
          var f1 = hkAsstKey(toks[j]);
          if (f1 === 'هیچ' || f1 === 'هیچی') { j++; if (toks[j] && !boundary(j)) j++; i = j - 1; continue; }
          var catMark = '';
          if (/^دسته[\u0654\u06c0ی]*(ای|ها)?$/.test(f1.replace(/[\u0654\u0670]/g, '')) || /^دسته/.test(f1) && f1.length <= 6) { catMark = '\u0001'; j++; if (!toks[j]) { out.push(toks[i]); continue; } }
          var phrase = catMark + toks[j]; j++;
          /* ۱.۴.۴۶: «به‌جز قسط وام / بدون قبض آب»: اگر دو واژه با هم نام یک ردیف‌اند، جدا نشوند (وگرنه واژهٔ دوم که در فرهنگ لغت دسته است شرط «مثبت» می‌ماند و جواب وارونه/خالی می‌شود) */
          if (toks[j] && (!boundary(j) || hkAsstJoinedInData(toks[j - 1], toks[j]) || hkAsstSameCatPair(toks[j - 1], toks[j]))) { phrase += ' ' + toks[j]; j++; }
          negWords.push(phrase);
          while (toks[j] === 'و' && toks[j + 1]) { var p2 = toks[j + 1]; j += 2; if (toks[j] && (!boundary(j) || hkAsstJoinedInData(toks[j - 1], toks[j]) || hkAsstSameCatPair(toks[j - 1], toks[j]))) { p2 += ' ' + toks[j]; j++; } negWords.push(p2); }
          i = j - 1;
        }
        text = out.join(' ');
      })();
      text = text.replace(/(^| )([^ ]+)((?:\s+و\s+[^ ]+)*)\s+(?:رو|را)?\s*(?:حساب\s+نکن|حساب\s+نکنی|نشمار|نذار|نزار|کنار\s+بذار)(?= |$)/g, function (all, pre, first, more) { negJoin(first, more); return pre; });
      text = text.replace(/\s+/g, ' ').trim();
      /* فقط یک استثنا گفته شده («بدون اسنپ»، «جز خوراکی»): ادامهٔ سؤال قبلی است؛ در حافظهٔ گفتگو روی همان اعمال می‌شود */
      if (negWords.length && !/(^| )(چقد|چقدر|چند|چنده|میشه|می شه|جمع|کل|تعداد)( |$)/.test(raw) && !text.split(' ').filter(function (t) { return t && !hkAsstIsStop(hkAsstKey(t)) && !/^(ولی|اما|پس|هم|و|حساب|محاسبه)$/.test(t); }).length) {
        var ngo = hkAsstNegArgs(negWords, '');
        if (ngo.unsupported && ngo.unsupported.length) return hkAsstNegUnsupported(ngo.unsupported);
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
      var codes = [], words = [], corrections = [], catSrc = [], ents = [], conj = {};
      var hasBound = false;
      try { hasBound = hkAsstAmountAt(text).length > 0 && (HK_ASST_GT_RE.test(text) || HK_ASST_LT_RE.test(text) || /بین/.test(text)); } catch (eB) {}
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
          /* ۱.۴.۴۵: «بزرگ» بی‌شمارنده («ده تا خرج بزرگم») صفت اندازه است نه «بیشترین»؛ با مرز مبلغ شرط نیست و بی مرز پرسیده می‌شود */
          if (code === 'MAX' && len === 1 && hkAsstIsDegree(hkAsstKey(phrase)) && !/(\d+|ده|پنج|سه|بیست|دو|چهار|شش|هفت|هشت|نه|چند)\s*تا/.test(text)) code = hasBound ? 'DEG_SKIP' : null;
          if (code === 'DEG_SKIP') { i += len; matched = true; break; }
          if (code) { codes.push(code); if (code.indexOf('CAT_') === 0) { catSrc.push({ id: code.slice(4), phrase: phrase }); ents.push({ s: i, e: i + len, kind: 'cat', id: code.slice(4), phrase: phrase, code: code }); } i += len; matched = true; }
        }
        if (matched) continue;
        var t = toks[i], key = hkAsstKey(t), i0 = i;
        i++;
        /* «و/یا» بین دو واژهٔ شرط: اجتماع؛ جایش ثبت می‌شود (پس از حلقه زنجیره ساخته می‌شود) */
        if (key === 'و' || key === 'یا') { conj[i0] = key; continue; }
        if (/\d/.test(t)) continue;               /* عدد: جداگانه از متن مبلغ خوانده می‌شود */
        if (hkAsstIsStop(key)) continue;
        /* صفت اندازه («کوچیک/ریز/درشت»): با مبلغ مرزیِ همین جمله شرط نیست؛ بی مبلغ همان‌طور که بود می‌ماند و پرسیده می‌شود */
        if (hkAsstIsDegree(key) && hasBound) continue;
        /* جمع محاوره‌ای «قبضا/خرجای»: اگر ریشه‌اش واژهٔ شناخته‌شدهٔ فرهنگ است همان کد را می‌گیرد */
        var stem = key.replace(/(ای|ا)$/, '');
        if (stem !== key && stem.length >= 3) { var sc = hkAsstLookup(stem); if (sc) { codes.push(sc); if (sc.indexOf('CAT_') === 0) { catSrc.push({ id: sc.slice(4), phrase: stem }); ents.push({ s: i0, e: i0 + 1, kind: 'cat', id: sc.slice(4), phrase: stem, code: sc }); } continue; } }
        /* ۱.۴.۴۶: «دستهٔ/هزینهٔ»: فقط علامت (همزهٔ بالا/اعراب) اضافه است؛ بی‌صدا همان واژه حساب می‌شود، نه «تصحیح» */
        var keyN = key.replace(/[\u0654\u0670\u064B-\u065F]/g, '');
        if (keyN !== key) { var cN = hkAsstLookup(keyN); if (cN) { codes.push(cN); if (cN.indexOf('CAT_') === 0) { catSrc.push({ id: cN.slice(4), phrase: keyN }); ents.push({ s: i0, e: i0 + 1, kind: 'cat', id: cN.slice(4), phrase: keyN, code: cN }); } continue; } }
        var fz = hkAsstFuzzyCode(key);
        /* ۱.۴.۴۳: غلط‌یاب هرگز نفی را مثبت نمی‌کند («نپرداختم» ← «پرداختم») */
        if (fz && key.charAt(0) === 'ن' && hkAsstKey(fz.word) === key.slice(1)) fz = null;
        if (fz) { codes.push(fz.code); corrections.push({ from: t, to: fz.word }); continue; }
        ents.push({ s: i0, e: i0 + 1, kind: 'text', raw: t, wis: [words.length] });
        words.push(_plural(t));
      }
      /* مرحلهٔ ۲: کلمه‌های متنی که در داده نیستند، اگر به یک کلمهٔ داده بسیار نزدیک باشند، اصلاح می‌شوند (مثل «تویتا» → «تویوتا») */
      var dataWords = hkAsstDataWords();
      /* نوشتهٔ واقعیِ داده برای یک واژه (نبودِ تفاوت املایی مثل ض/ظ): فیلتر باید با همان نوشته اجرا شود نه با تایپ کاربر */
      var dataSurface = function (w) { var k = hkAsstKey(w), ex = dataWords.filter(function (d) { return d.key === k; })[0]; if (ex && ex.word !== w) corrections.push({ from: w, to: ex.word }); return ex ? ex.word : w; };
      var subj = null, textWords = [];
      /* ۱.۴.۴۵: زنجیرهٔ «A و B / A یا B»: واژه‌های هم‌نوعِ پیوسته با «و/یا» یک اجتماع می‌سازند (نه اشتراک). فقط یک زنجیره پشتیبانی می‌شود؛ چیزی که به‌طور دقیق قابل‌اجرا نباشد پرسیده می‌شود. */
      var grp = null, grpWi = {}, chainAsk = '';
      if (Object.keys(conj).length) {
        var merged = [];
        var hayM = ''; try { hayM = hkAsstHayAll(); } catch (eM) {}
        ents.forEach(function (e) {
          var L = merged[merged.length - 1];
          if (L && L.kind === 'text' && !L.fixed && e.kind === 'text' && L.e === e.s) { L.e = e.e; L.wis = L.wis.concat(e.wis); return; }
          /* «قبض برق» که هر دو واژه‌اش در فرهنگ لغت دسته‌اند ولی نام یک ردیف است: یک عنصر متنی */
          if (L && L.e === e.s && !conj[L.e] && (L.kind === 'cat' || L.fixed) && (e.kind === 'cat' || e.kind === 'text')) {
            var j = (L.fixed || L.phrase) + ' ' + (e.kind === 'cat' ? e.phrase : words[e.wis[0]]);
            if (hayM.indexOf(hkAsstKey(j)) >= 0) { _hkAsstDataNotes.push('row_phrase:' + j); merged[merged.length - 1] = { kind: 'text', s: L.s, e: e.e, wis: (L.wis || []).concat(e.kind === 'text' ? e.wis : []), fixed: j.split(' ').map(dataSurface).join(' '), rmCodes: (L.rmCodes || [L.code]).concat(e.kind === 'cat' ? [e.code] : []) }; return; }
          }
          merged.push(e);
        });
        var chains = [], curCh = null;
        merged.forEach(function (e, k) {
          var prevE = merged[k - 1];
          if (prevE && conj[prevE.e] && e.s === prevE.e + 1) { if (!curCh) { curCh = [prevE]; chains.push(curCh); } curCh.push(e); } else curCh = null;
        });
        if (chains.length > 1) chainAsk = 'چند ترکیب «و/یا» جدا توی یک جمله هست؛ می‌شه یکی‌یکی بپرسی؟';
        else if (chains.length === 1) grp = chains[0];
      }
      var resolveTxt = function (w) {
        var k = hkAsstKey(w);
        var exact = dataWords.filter(function (d) { return d.key === k; })[0];
        if (!exact) { var k2 = k.replace(/(ای|ا)$/, ''); if (k2 !== k && k2.length >= 3) exact = dataWords.filter(function (d) { return d.key === k2; })[0]; }
        /* «اقامتش»، «بنزینم»: پسوند ضمیری روی واژهٔ موجود در داده؛ غلط‌تایپی نیست و بی‌صدا حذف می‌شود */
        if (!exact) { var k3 = k.replace(/(مون|تون|شون|شو|م|ت|ش)$/, ''); if (k3 !== k && k3.length >= 3) exact = dataWords.filter(function (d) { return d.key === k3; })[0]; }
        if (exact || !dataWords.length) return exact ? exact.word : w;
        var near = hkAsstNearest(k, dataWords, 2);
        if (near) { corrections.push({ from: w, to: near.word }); return near.word; }
        return w;
      };
      /* ۱.۴.۴۶: «قبض برق» که هر دو واژه‌اش در فرهنگ لغت دسته‌اند ولی با هم نام یک ردیف‌اند، یک عبارت متنی (ردیف) است، نه کل دستهٔ قبوض */
      var fixedTexts = [], fixedWi = {};
      if (!grp && ents.length >= 2) {
        for (var ek = 0; ek < ents.length - 1; ek++) {
          var A1 = ents[ek], B1 = ents[ek + 1];
          if (A1.e === B1.s && !conj[A1.e] && (A1.kind === 'cat' || B1.kind === 'cat') && !A1.fixed) {
            var wa = A1.kind === 'cat' ? A1.phrase : words[A1.wis[0]], wb = B1.kind === 'cat' ? B1.phrase : words[B1.wis[0]];
            if (hkAsstJoinedInData(wa, wb)) {
              [A1, B1].forEach(function (x) { if (x.kind === 'cat') { var ci1 = codes.indexOf(x.code); if (ci1 >= 0) codes.splice(ci1, 1); catSrc = catSrc.filter(function (c) { return c.id !== x.id || c.phrase !== x.phrase; }); } else (x.wis || []).forEach(function (wi) { fixedWi[wi] = true; }); });
              var fx = dataSurface(wa) + ' ' + dataSurface(wb);
              fixedTexts.push(fx);
              ents.splice(ek, 2, { kind: 'text', s: A1.s, e: B1.e, wis: [], fixed: fx });
              ek--;
            }
          }
        }
      }
      var anyList = [], anyCats = [], catsOut = [];
      if (grp) {
        var hayG = ''; try { hayG = hkAsstHayAll(); } catch (eG) {}
        grp.forEach(function (m) {
          if (chainAsk) return;
          if (m.kind === 'text') {
            m.wis.forEach(function (wi) { grpWi[wi] = true; });
            if (m.fixed) {
              (m.rmCodes || []).forEach(function (cd) { var ci0 = codes.indexOf(cd); if (ci0 >= 0) codes.splice(ci0, 1); catSrc = catSrc.filter(function (c) { return 'CAT_' + c.id !== cd; }); });
              if (anyList.indexOf(m.fixed) < 0) anyList.push(m.fixed);
              return;
            }
            var ws = m.wis.map(function (wi) { return words[wi]; });
            if (ws.some(function (w) { return hkAsstFindSubject(w); })) { chainAsk = 'ترکیب «و/یا» با نام پروژه رو هنوز نمی‌تونم دقیق حساب کنم؛ هر کدوم رو جدا بپرس.'; return; }
            var rw = ws.map(resolveTxt).join(' '); if (anyList.indexOf(rw) < 0) anyList.push(rw);
          } else {
            var pk = hkAsstKey(m.phrase), cands = [[pk, m.phrase]], plr = /(ها|های|ا|ای)$/, clt = /(مون|تون|شون|م|ت|ش)$/;
            if (clt.test(pk)) cands.push([pk.replace(clt, ''), String(m.phrase).replace(clt, '')]);
            if (plr.test(pk)) cands.push([pk.replace(plr, ''), String(m.phrase).replace(plr, '')]);
            var isName = cands.some(function (c) { return hkAsstIsCatName(m.id, c[0]); });
            var hit = !isName ? cands.filter(function (c) { return c[0].length >= 3 && hayG.indexOf(c[0]) >= 0; })[0] : null;
            /* تحلیل‌گر (حالت خشک): در فهرست «و/یا» واژهٔ مترادفِ دسته (نه نام دسته) یک «مورد» است؛ برای این تصمیم به داده نگاه نمی‌کنیم */
            if (hit) _hkAsstDataNotes.push('row_word:' + hit[1]);
            if (!hit && !isName && _hkAsstDry) hit = cands[cands.length - 1];
            if (hit) {
              /* واژه‌ای مثل «بنزین/نان» که ردیف هم هست: در فهرست «و/یا» یعنی همان ردیف‌ها، نه کل دسته */
              var dwG = dataWords.filter(function (d) { return d.key === hit[0]; })[0], wG = dwG ? dwG.word : hit[1];
              if (anyList.indexOf(wG) < 0) anyList.push(wG);
              var ci = codes.indexOf(m.code); if (ci >= 0) codes.splice(ci, 1);
              catSrc = catSrc.filter(function (c) { return c.id !== m.id || c.phrase !== m.phrase; });
            } else if (anyCats.indexOf(m.id) < 0) anyCats.push(m.id);
          }
        });
        catSrc = catSrc.filter(function (c) { return anyCats.indexOf(c.id) < 0; });
        /* دستهٔ دیگری بیرون از زنجیره (AND با اجتماع) یا واژهٔ متنیِ آزاد کنارش: ترکیب مبهم است */
        if (!chainAsk) {
          var allCat = []; codes.forEach(function (c) { if (c.indexOf('CAT_') === 0 && allCat.indexOf(c.slice(4)) < 0) allCat.push(c.slice(4)); });
          if (allCat.some(function (id) { return anyCats.indexOf(id) < 0; }) && (anyList.length || anyCats.length)) chainAsk = 'دسته و فهرست «و/یا» با هم قاطی شده؛ دقیق‌تر بگو (مثلاً «برنج و نان» یا «دستهٔ خوراکی»).';
        }
      }
      words.forEach(function (w, wi) {
        if (grpWi[wi] || fixedWi[wi]) return;
        if (!subj) { var sm = hkAsstFindSubject(w); if (sm) { _hkAsstDataNotes.push('project_name:' + w); subj = sm; return; } }
        textWords.push(resolveTxt(w));
      });
      fixedTexts.forEach(function (ft) { textWords.push(ft); });
      if (grp && !chainAsk && textWords.length && anyList.length) chainAsk = 'کنار «' + anyList.join(' و ') + '» واژهٔ «' + textWords.join(' ') + '» هم آمده؛ منظورت کدام ترکیب است؟ (مثلاً هر دو را جدا بنویس)';
      if (chainAsk) return { why: 'ambiguous_union', ask: chainAsk, final: true, understood: '', corrections: [], suggestions: [], decision: 'ask' };
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
        args.dateFrom = fy + '-' + fm + '-1'; args.dateTo = cy + '-' + cm + '-' + daysInMonth(cy, cm);
        delete args.year; delete args.month;
      }
      if (spanN && !span) {
        var fyN = cy, fmN = cm - (spanN - 1); while (fmN < 1) { fmN += 12; fyN--; }
        args.dateFrom = fyN + '-' + fmN + '-1'; args.dateTo = cy + '-' + cm + '-' + daysInMonth(cy, cm); delete args.year; delete args.month;
      }
      if (rangeM && !span) {
        var yBase = codes.indexOf('PREV_Y') >= 0 ? cy - 1 : (hkAsstPersianDate(text) || cy), tmM = rangeM.m2 || cm, tyM = (!rangeM.m2 || (rangeM.m2 <= cm) || codes.indexOf('THIS_Y') >= 0 || yBase !== cy) ? yBase : yBase - 1, fyM = rangeM.m1 <= tmM ? tyM : tyM - 1;
        args.dateFrom = fyM + '-' + rangeM.m1 + '-1'; args.dateTo = tyM + '-' + tmM + '-' + daysInMonth(tyM, tmM); delete args.year; delete args.month;
      }
      if (ytdFlag && !args.month && !span) { args.dateFrom = cy + '-1-1'; args.dateTo = cy + '-' + cm + '-' + daysInMonth(cy, cm); delete args.year; }
      /* مرحلهٔ ۵: نوع، بخش، دسته */
      var hasE = codes.indexOf('EXP') >= 0, hasI = codes.indexOf('INC') >= 0;
      if (hasE && !hasI) args.tab = 'expense';
      if (hasI && !hasE) args.tab = 'income';
      /* ۱.۴.۴۳: «بیشترین خرج/هزینه»، «کمترین هزینه»، «بزرگ‌ترین خرج»: عبارت فرهنگ لغت واژهٔ خرج/هزینه را می‌بلعد؛ نوع باید از خود متن گرفته شود تا ردیف درآمد وارد نتیجه نشود */
      if (!args.tab && (codes.indexOf('MAX') >= 0 || codes.indexOf('MIN') >= 0)) {
        var wExp = /(^| )(خرج|هزینه|مخارج)/.test(text), wInc = /(^| )(درآمد|دخل|واریز)/.test(text);
        if (wExp && !wInc) args.tab = 'expense'; else if (wInc && !wExp) args.tab = 'income';
      }
      /* ۱.۴.۴۵: «دستهٔ خوراکی / مجموع دستهٔ قبوض» = جمع همان دسته؛ فقط تفکیک/دسته‌ها/دسته‌بندی/هر دسته گزارش گروه‌بندی‌شده است */
      if (codes.indexOf('GRP') >= 0 && codes.some(function (c) { return c.indexOf('CAT_') === 0; }) && /(^| )دسته( |$)/.test(text.replace(/\u0654/g, '')) && !/(تفکیک|دسته[\s\u200c]*(ها|های|بندی)|گروه|هر[\s\u200c]*(دسته|ماه)|بر[\s\u200c]*اساس|جدا|ماه به ماه)/.test(text)) {
        var gi = codes.indexOf('GRP'); if (gi >= 0) codes.splice(gi, 1);
      }
      var catIds = [];
      codes.forEach(function (c) { if (c.indexOf('CAT_') === 0) { var id = c.slice(4); if (catIds.indexOf(id) < 0) catIds.push(id); } });
      if (catIds.length) args.cats = catIds;
      /* ۱.۴.۴۴: واژه‌ای که هم نام ردیف‌ها و هم نمایندهٔ یک دسته است («بنزین»، «نان»): عدد پیش‌فرض همان دسته می‌ماند؛ فقط اگر کاربر «ردیف/تراکنش …» بگوید خوانش ردیف می‌شود، و اگر «کل/همه/دسته» بگوید دسته؛ در غیر این صورت پاسخ تفاوت را می‌گوید */
      var catAmb = null;
      if (catSrc.length === 1 && catIds.length === 1 && !textWords.length && !anyList.length) {
        var cs = catSrc[0], pk = hkAsstKey(cs.phrase), pw = String(cs.phrase);
        var cands = [[pk, pw]], plr = /(ها|های|ا|ای)$/, clt = /(مون|تون|شون|م|ت|ش)$/;
        if (clt.test(pk)) cands.push([pk.replace(clt, ''), pw.replace(clt, '')]);
        if (plr.test(pk)) cands.push([pk.replace(plr, ''), pw.replace(plr, '')]);
        var isName = cands.some(function (c) { return hkAsstIsCatName(cs.id, c[0]); });
        if (!isName && !/(^| )(کل|کلِ|همه|همهٔ|مجموع|دسته|دستهٔ)( |$)/.test(text)) {
          var hayA = ''; try { hayA = hkAsstHayAll(); } catch (eAm) {}
          var hit = cands.filter(function (c) { return c[0].length >= 3 && hayA.indexOf(c[0]) >= 0; })[0];
          /* تحلیل‌گر (حالت خشک): نشانهٔ صریح «ردیف/تراکنش …» خودش کافی است و به وجود ردیف در داده بستگی ندارد؛ ردیفِ نبوده را مرحلهٔ تطبیق با داده «ثبت نشده» می‌گوید */
          if (hit) _hkAsstDataNotes.push('row_word:' + hit[1]);
          if (!hit && _hkAsstDry && /(^| )(ردیف|تراکنش|اسم|عنوان)(ها|های|ای)?( |$)/.test(text)) hit = cands[cands.length - 1];
          if (hit) {
            var dwA = dataWords.filter(function (d) { return d.key === hit[0]; })[0], wordA = dwA ? dwA.word : hit[1];
            if (/(^| )(ردیف|تراکنش|اسم|عنوان)(ها|های|ای)?( |$)/.test(text)) { delete args.cats; args.text = wordA; catIds = []; }
            else catAmb = { id: cs.id, word: wordA };
          }
        }
      }
      if (codes.indexOf('PROJ') >= 0 && codes.indexOf('PERS') < 0) args.context = 'project';
      if (codes.indexOf('PERS') >= 0 && codes.indexOf('PROJ') < 0) args.context = 'personal';
      if (textWords.length) args.text = textWords.join(' ');
      if (anyList.length) { args.textAny = anyList; if (anyCats.length) args.unionCats = true; }
      /* شرط‌های «نه»: دسته → excludeCats؛ «درآمد/هزینه» → فقط طرف دیگر؛ هر چیز دیگر → کلمهٔ حذفی */
      if (negWords.length) { var ng = hkAsstNegArgs(negWords, args.tab); if (ng.unsupported && ng.unsupported.length) return hkAsstNegUnsupported(ng.unsupported); if (ng.excludeText) args.excludeText = ng.excludeText; if (ng.excludeCats) args.excludeCats = ng.excludeCats; if (ng.tab && !args.tab) args.tab = ng.tab; }
      if (subj) args.project = subj.name;
      if (acctArg) args.account = acctArg;
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
      if (chatK) return { why: 'chat:' + chatK, ask: hkAsstChatReply(chatK, codes, text), final: true, understood: '', corrections: [], suggestions: (chatK === 'HI' || chatK === 'HELP' || chatK === 'WHO') ? HK_ASST_EXAMPLES_TEXT() : [] };
      if (special && acctArg && /^(OVW|BAL)$/.test(special)) return hkAsstAsking('موجودی جدا برای هر کارت را نمی‌توانم بگویم؛ فقط مجموع همهٔ حساب‌ها را دارم. می‌خوای همان را بگویم؟', ['موجودی کل چقدره؟', 'هزینه‌های کارت ' + acctArg + ' این ماه'], 'capability_gap');
      if (special) {
        var sc = hkAsstSpecialCmd(special, codes, args, text, amts);
        if (sc) { sc.corrections = corrections; return sc; }
      }
      /* ۱.۴.۴۳: نشانهٔ استثنای شناسایی‌نشده («به استثنای قبض»، «منهای اسنپ»، «مگر قبوض»، «قبض نباشه»): اگر این‌جا ادامه بدهیم، کلمهٔ بعدش شرط «مثبت» می‌شود و معنا برعکس؛ پس عدد نمی‌دهیم */
      if (/(^| )(به ?استثنای|استثنای|استثنا|منهای|منها|مگر|نباشه|نباشد|نباشن|نباشند)( |$)|(^| )غیر( |$)/.test(text)) return { why: 'unsupported_exception_cue', ask: 'منظورت کنار گذاشتنِ چیزیه؟ دقیق‌تر بگو، مثلاً «بدون X» یا «به‌جز X»، تا عددی که می‌گم همون چیزی باشه که می‌خوای.', final: true, decision: 'ask', understood: '', corrections: [], suggestions: [], chipRaw: true };
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
      if (args.project && (!intent || intent === 'sum') && !(args.tab || args.year != null || args.month != null || args.dateFrom || args.cats || args.text || args.textAny || args.status || args.account)) intent = 'projsum';
      if (!intent && codes.indexOf('PROJ') >= 0 && !args.project) intent = 'projlist';
      if (args.status && /(^| )(کدوم|کدام|لیست|فهرست|نشون|نشان)/.test(text)) intent = 'search';
      var hasFilter = !!(args.tab || args.year || args.month || args.dateFrom || args.cats || args.context || args.project || args.textAny);
      if (!intent) {
        if (hasFilter && !args.text && !args.textAny && args.amountEq == null && args.amountMin == null && args.amountMax == null) intent = 'sum';
        else if (args.text || args.textAny || args.amountEq != null || args.amountMin != null || args.amountMax != null) intent = 'search';
        else if (hasFilter) intent = 'sum';
      }
      /* ۱.۴.۴۶: «چقدر شد؟» / «جمعش؟» بی‌هیچ موضوع، نوع، بازه یا شرط: جمع همهٔ داده‌ها یک عدد بی‌معنا می‌شود؛ پرسیده می‌شود */
      if (intent === 'sum' && !hasFilter && !transferFlag && !unpaidFlag && !args.text && !args.textAny && args.amountEq == null && args.amountMin == null && args.amountMax == null && !args.status && !args.excludeText && !args.excludeCats && !/(تراکنش|ردیف|همه|کل|مجموع|حساب|پروژه|ماه|سال)/.test(text.replace(/جمعش/g, '')) && !(anaphora && _hkAsstCtx && Date.now() - _hkAsstCtx.at < 900000)) {
        return { why: 'missing_scope', ask: 'چقدرِ چی؟ بگو دربارهٔ چی می‌پرسی (مثلاً «این ماه چقدر خرج کردم؟» یا «بنزین چقدر شد؟»).', final: true, understood: '', corrections: [], suggestions: ['این ماه چقدر خرج کردم؟', 'درآمد این ماه چقدره؟'], chipRaw: true, decision: 'ask' };
      }
      if (!intent) return { why: 'not_understood', ask: hkAsstPick(['منظورت رو کامل نگرفتم؛ می‌شه یه کم دقیق‌تر بگی؟ مثلاً «بیمه تویوتا را پیدا کن» یا «جمع هزینه‌های آبان».', 'این یکی رو نفهمیدم. یه جور دیگه بپرس؛ مثلاً «این ماه چقدر خرج کردم؟» یا «وضعیت مالی‌ام چطوره؟».', 'هنوز نتونستم بفهمم چی می‌خوای. اگه نمونه می‌خوای بگو «چه کارایی بلدی؟».']), suggestions: HK_ASST_EXAMPLES_TEXT() };

      /* ۱.۴.۴۵: «فقط ردیف‌های بنزین رو حساب کن» بعد از «بنزین این ماه»: پالایش همان سؤال است؛ فقط موجودیت عوض می‌شود و بازه و شرط‌های دیگر می‌ماند */
      var refine = false;
      try {
        var refCue = /(^| )(فقط|تنها)( |$)|(^| )(ردیف|تراکنش)(ها|های|ای)?( |$)/.test(text);
        var noScope = !args.tab && args.year == null && args.month == null && !args.dateFrom && !args.status && !args.context && args.amountEq == null && args.amountMin == null && args.amountMax == null;
        var ctoks = text.split(' ').filter(function (t) { var k0 = hkAsstKey(t); if (!t || hkAsstIsStop(k0)) return false; var c0 = hkAsstLookup(k0); return !(c0 === 'SUM' || c0 === 'SRCH'); });
        refine = refCue && noScope && !!(args.text || args.textAny || args.cats) && ctoks.length <= 4 && intent !== 'compare';
      } catch (eR) { refine = false; }
      var _ic = ['CMP', 'GRP', 'AVG', 'MAX', 'MIN', 'CNT', 'SUM', 'SRCH', 'EXP', 'INC'].some(function (c) { return codes.indexOf(c) >= 0; });
      /* «و درآمد؟»، «حالا درآمدها»: فقط نوع عوض می‌شود و بازه/حساب/پروژهٔ سؤال قبلی می‌ماند */
      var tabSwap = false;
      try { tabSwap = !!args.tab && !args.text && !args.textAny && !args.cats && !args.project && !args.context && !args.account && args.year == null && args.month == null && !args.dateFrom && !args.status && args.amountEq == null && args.amountMin == null && args.amountMax == null && !args.excludeText && !args.excludeCats && !ytdFlag && ['CMP', 'GRP', 'AVG', 'MAX', 'MIN', 'CNT', 'SRCH'].every(function (c) { return codes.indexOf(c) < 0; }) && text.split(' ').filter(function (t) { return t && !hkAsstIsStop(hkAsstKey(t)); }).length <= 3; } catch (eTs) { tabSwap = false; }
      return {
        tabSwap: tabSwap,
        __frame: true, raw: raw, text: text, intent: intent, args: args, codes: codes, corrections: corrections, anaphora: anaphora,
        textWords: textWords, catAmb: catAmb, hasProject: !!subj, intentCode: _ic,
        yearExplicit: !!(typeof explicitY !== 'undefined' && explicitY) || !!yy,
        follow: refine || (anaphora || (!_ic && !args.tab)) && !args.status && args.amountEq == null && args.amountMin == null && args.amountMax == null && text.split(' ').filter(function (t) { return t && !hkAsstIsStop(hkAsstKey(t)); }).length <= 4
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
        /* ۱.۴.۴۶: «ماه پیش و این ماه»، «نسبت به ماه پیش»: مبنا ماه جاری است و با ماه قبل سنجیده می‌شود (نه ماه قبل با دو ماه پیش) */
        var hasThisM = codes.indexOf('THIS_M') >= 0, hasPrevM = codes.indexOf('PREV_M') >= 0;
        if ((hasThisM && hasPrevM) || (hasPrevM && !hasThisM && /(نسبت به|در مقایسه با|مقایسه با|به نسبت)/.test(text))) { a = { year: cy, month: cm }; b = { year: py, month: pm }; }
        return { tool: 'reports.compare', args: { a: a, b: b, tab: args.tab, context: args.context, text: args.text, cats: args.cats } };
      }
      if (intent === 'group') {
        var by = codes.indexOf('PROJ') >= 0 ? 'context' : (_hkAsstByAcct || /حساب|کارت|بانک/.test(text)) ? 'account' : /(^| )دسته/.test(text) ? 'category' : /(^| )بخش/.test(text) ? 'section' : /درآمد و هزینه|نوع/.test(text) ? 'tab' : 'month';
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
      var anyQ = (args.textAny || []).map(function (w) { return '«' + w + '»'; });
      if (args.cats && args.cats.length) parts.push('دستهٔ ' + args.cats.map(function (c) { return HK_ASST_CAT_LABELS[c] || c; }).join(' یا ') + (args.unionCats && anyQ.length ? ' یا ردیف‌های ' + anyQ.join(' یا ') : ''));
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
      if (anyQ.length && !(args.unionCats && args.cats && args.cats.length)) parts.push('شامل ' + anyQ.join(' یا '));
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
