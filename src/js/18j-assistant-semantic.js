    /* ===== ۱.۴.۴۰: دستیار — لایهٔ تصمیم، قاب معنایی، واژه‌نامهٔ شخصی و بازخورد =====
       جریان: متن ← (واژه‌نامهٔ شخصی) ← hkAsstSemantic (فهم) ← hkAsstDecide (اجرا / پرسیدن / پیشنهاد جایگزین) ← hkAsstFrameToCommand (ساخت فرمان ابزار).
       همه‌چیز آفلاین و روی گوشی است؛ هیچ مدل یا شبکه‌ای در کار نیست. */

    /* ---------- مشخصات هر قصد: چه چیزی لازم است و چه چیزی در گفتگوی پیگیری منتقل می‌شود ---------- */
    var HK_ASST_INTENT_SPEC = {
      sum:     { req: [], opt: ['tab', 'time', 'entity', 'amount'], carry: ['tab', 'time', 'entity'] },
      count:   { req: [], opt: ['tab', 'time', 'entity', 'amount'], carry: ['tab', 'time', 'entity'] },
      avg:     { req: [], opt: ['tab', 'time', 'entity'], carry: ['tab', 'time', 'entity'] },
      max:     { req: [], opt: ['tab', 'time', 'entity', 'topN'], carry: ['tab', 'time', 'entity'] },
      min:     { req: [], opt: ['tab', 'time', 'entity', 'topN'], carry: ['tab', 'time', 'entity'] },
      search:  { req: [], opt: ['tab', 'time', 'entity', 'amount', 'status'], carry: ['tab', 'time', 'entity'] },
      group:   { req: ['by'], opt: ['tab', 'time', 'entity'], carry: ['tab', 'time'] },
      compare: { req: ['periods'], opt: ['tab', 'entity'], default: 'ماه قبل', carry: ['tab', 'entity'] },
      projsum: { req: ['project'], opt: ['time'], carry: [] },
      projlist: { req: [], opt: [], carry: [] }
    };

    /* ---------- واژه‌نامهٔ شخصی (فقط روی همین گوشی؛ قابل حذف؛ جایگزینیِ متن، نه اجرای فرمان) ---------- */
    var HK_ASST_ALIAS_KEY = STORAGE_KEY + '_asstAlias';
    function hkAsstAliasList() { try { var a = JSON.parse(localStorage.getItem(HK_ASST_ALIAS_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && x.from && x.to; }) : []; } catch (e) { return []; } }
    function hkAsstAliasSave(a) { try { localStorage.setItem(HK_ASST_ALIAS_KEY, JSON.stringify(a.slice(-100))); } catch (e) {} }
    function hkAsstAliasAdd(from, to) {
      from = String(from || '').trim(); to = String(to || '').trim();
      if (!from || !to || from.length > 40 || to.length > 40 || hkAsstKey(from) === hkAsstKey(to)) return false;
      var a = hkAsstAliasList().filter(function (x) { return hkAsstKey(x.from) !== hkAsstKey(from); });
      a.push({ from: from, to: to }); hkAsstAliasSave(a); return true;
    }
    function hkAsstAliasRemove(from) { hkAsstAliasSave(hkAsstAliasList().filter(function (x) { return x.from !== from; })); }
    /* «دایی سعید» ← «سعید» در متن پرسش (فقط تطبیق کامل کلمه‌ها) */
    function hkAsstAliasApply(raw) {
      var list = hkAsstAliasList(); if (!list.length) return raw;
      var t = ' ' + hkAsstNorm(raw).replace(/[،,؟?!.:؛]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
      list.slice().sort(function (x, y) { return y.from.length - x.from.length; }).forEach(function (al) {
        var f = ' ' + hkAsstNorm(al.from).replace(/\s+/g, ' ').trim() + ' ';
        var i = t.indexOf(f);
        while (i >= 0) { t = t.slice(0, i) + ' ' + hkAsstNorm(al.to) + ' ' + t.slice(i + f.length); i = t.indexOf(f, i + al.to.length + 2); }
      });
      return t.trim();
    }
    /* «X یعنی Y»، «منظورم از X، Y بود»، «منظورم از «X» «Y» بود»: فقط اصطلاح ذخیره می‌شود */
    function hkAsstAliasIntent(raw) {
      var q = String(raw || '').trim(), m = null;
      var Q = '[«"“]?', E = '[»"”]?';
      m = new RegExp('^' + Q + '([^«»"“”،,]{2,40}?)' + E + '\\s+یعنی\\s+' + Q + '([^«»"“”،,]{2,40}?)' + E + '$').exec(q)
        || new RegExp('^منظور(?:م)?\\s+(?:از\\s+)?' + Q + '([^«»"“”،,]{2,40}?)' + E + '\\s*(?:،|,)\\s*' + Q + '([^«»"“”،,]{2,40}?)' + E + '\\s*(?:بود|است|هست|باشه)?$').exec(q)
        || new RegExp('^منظور(?:م)?\\s+(?:از\\s+)?[«"“]([^«»"“”]{2,40})[»"”]\\s*[«"“]([^«»"“”]{2,40})[»"”]\\s*(?:بود|است|هست|باشه)?$').exec(q);
      if (!m) return null;
      if (!hkAsstAliasAdd(m[1], m[2])) return null;
      return { ask: hkAsstPick(['باشه، از این به بعد «' + m[1].trim() + '» رو «' + m[2].trim() + '» حساب می‌کنم. (برای حذفش: نگه داشتن عنوان دستیار ← «واژه‌های من»)', 'یاد گرفتم: «' + m[1].trim() + '» یعنی «' + m[2].trim() + '». هر وقت خواستی از «واژه‌های من» پاکش کن.']), final: true, understood: '', corrections: [], suggestions: [] };
    }

    /* ---------- نمای خوانا از قاب معنایی (برای آزمون و گزارش) ---------- */
    function hkAsstFrameView(f) {
      var a = f.args || {};
      return { intent: f.intent, tab: a.tab || null, period: { year: a.year || null, month: a.month || null, dateFrom: a.dateFrom || null, dateTo: a.dateTo || null },
        entity: { text: a.text || null, cats: a.cats || null, project: a.project || null }, amount: { eq: a.amountEq, min: a.amountMin, max: a.amountMax }, status: a.status || null, unknownContent: f.textWords || [] };
    }

    /* ---------- تصمیم: آماده / پیشنهاد جایگزین / پرسش روشن‌کننده ---------- */
    function hkAsstAsking(ask, chips) { return { ask: ask, final: true, understood: '', corrections: [], suggestions: chips || [], chipRaw: true, decision: 'ask' }; }
    function hkAsstPeriodLabel(a) {
      if (a.month) return HK_ASST_MONTH_NAMES[a.month - 1] + (a.year && a.year !== hkAsstCY() ? ' ' + toPersianDigits(String(a.year)) : '');
      if (a.year) return 'سال ' + toPersianDigits(String(a.year));
      return '';
    }
    function hkAsstCtxValid() { try { return !!(_hkAsstCtx && Date.now() - _hkAsstCtx.at <= 900000); } catch (e) { return false; } }
    function hkAsstDecide(f) {
      var a = f.args || {}, T = f.text, words = T.split(' ').filter(Boolean);
      var pronounOnly = a.text && a.text.split(' ').every(function (w) { return /^(اون|اونو|اینو|همون|همونو|همین|قبلی|اونجا|همونجا)$/.test(w); });
      var hasTime = !!(a.month || a.year || a.dateFrom);
      /* «همونو برا ماه قبل بگو»: ضمیر + زمان = همان سؤال قبلی با زمان تازه */
      if (pronounOnly && hasTime && hkAsstCtxValid()) { delete a.text; pronounOnly = false; }
      var hasEnt = !!((a.text && !pronounOnly) || a.cats || a.project || a.context);
      /* ۱) نیم‌جملهٔ بدون قصد و بدون گفتگوی قبلی: «آبان چطور؟»، «اسنپ چی؟» */
      var particle = /(^| )(چطور|چطوره|چطوری|چی|چیه|چنده|چند|چی شد|چی بود|چطور بود)( |$)/.test(T);
      if (f.follow && !hkAsstCtxValid() && (f.intent === 'sum' || f.intent === 'search') && !a.tab && words.length <= 3 && particle && (hasTime !== hasEnt)) {
        if (hasTime && !hasEnt) {
          var pl = hkAsstPeriodLabel(a);
          return hkAsstAsking('دربارهٔ ' + pl + ' چی رو می‌خوای؟', ['مخارج ' + pl, 'درآمد ' + pl, 'وضعیت مالی ' + pl]);
        }
        if (hasEnt && a.text && !a.cats && !a.project && particle) {
          return hkAsstAsking('دربارهٔ «' + a.text + '» چی رو می‌خوای؟', ['هزینهٔ ' + a.text + ' این ماه چقدر شده؟', 'تعداد ' + a.text + ' چندتاست؟', 'آخرین ' + a.text + ' کی بوده؟']);
        }
      }
      /* ۲) ارجاع به چیزی که معلوم نیست («اونو نشون بده»، «همونو») */
      if (!hasTime && !hasEnt && !a.tab && (pronounOnly || /(^| )(اون|اونو|همون|همونو|قبلی)( |$)/.test(T)) && !hkAsstCtxValid() && !_hkAsstLastTarget) {
        return hkAsstAsking('منظورت کدوم چیزه؟ اول یه سؤال بپرس تا بعدش بتونم دربارهٔ همون بگم.', ['این ماه چقدر خرج کردم؟', 'بزرگ‌ترین خرجم چی بوده؟']);
      }
      /* ۳) «ده تا … بزرگ» که هم دسته و هم تراکنش در آن آمده */
      if (/(^| )(\d+|ده|پنج|سه|بیست|دو|چهار|شش|هفت|هشت|نه)\s*تا/.test(hkAsstFaDigits(T)) && /(^| )دسته/.test(T) && /تراکنش|ردیف/.test(T)) {
        return hkAsstAsking('منظورت چند تراکنشِ بزرگه یا چند دستهٔ پرهزینه؟', ['ده تراکنش با بیشترین مبلغ', 'پولم بیشتر کجا رفته؟']);
      }
      return null;
    }

    /* ---------- ساخت فرمان از قاب معنایی ---------- */
    function hkAsstFrameToCommand(f) {
      var cmd = hkAsstBuildCommand(f.intent, f.args, f.codes, f.text);
      cmd.corrections = f.corrections;
      if (f.catAmb) cmd.catAmb = f.catAmb;
      cmd.understood = hkAsstUnderstood(f.intent, f.args);
      cmd.intent = f.intent; cmd.yearExplicit = f.yearExplicit; cmd.follow = f.follow; cmd.anaphora = !!f.anaphora;
      cmd.frame = hkAsstFrameView(f);
      /* پیشنهادهای جایگزین برای حالت‌هایی که یک برداشت دیگر هم ممکن است */
      var alts = [];
      if (f.intent === 'avg' && !/ماهانه|ماهیانه|هر ماه/.test(f.text)) alts.push('میانگین ماهانه‌ام چقدره؟');
      if ((f.intent === 'max' || f.intent === 'min') && cmd.args && cmd.args.limit > 1 && !f.args.cats) alts.push('پولم بیشتر کجا رفته؟');
      if (alts.length) { cmd.followUps = alts; cmd.chipRaw = true; }
      return cmd;
    }
    /* نقطهٔ ورود تفسیر قاعده‌ای */
    function hkAsstParse(raw) {
      var al = hkAsstAliasIntent(raw); if (al) return al;
      var r = hkAsstSemantic(hkAsstAliasApply(raw));
      if (!r.__frame) return r;
      var d = hkAsstDecide(r); if (d) return d;
      return hkAsstFrameToCommand(r);
    }

    /* ---------- بازخورد کاربر زیر پاسخ ---------- */
    var HK_ASST_FB_KEY = STORAGE_KEY + '_asstFeedback';
    function hkAsstFeedback(question, good) {
      try {
        var o = JSON.parse(localStorage.getItem(HK_ASST_FB_KEY) || '{"good":0,"bad":0}') || { good: 0, bad: 0 };
        if (good) o.good = (o.good || 0) + 1; else o.bad = (o.bad || 0) + 1;
        localStorage.setItem(HK_ASST_FB_KEY, JSON.stringify(o));
      } catch (e) {}
      if (!good) { try { hkAsstMissedAdd('[غلط] ' + question); } catch (e2) {} }
    }
