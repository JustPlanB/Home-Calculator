    /* ===== ۱.۴.۳۷: دستیار هوشمند — تحلیل مالی، سال کوتاه و لحن خودمونی =====
       این فایل سه کار دارد: (۱) «۴۰۳» را «۱۴۰۳» می‌کند؛ (۲) ابزارهای تحلیلی (insights.*) که فقط می‌خوانند و با
       درآمد و مخارج خود کاربر وضعیت، روند، پیشنهاد، پیش‌بینی، بودجه و هدف پس‌انداز را حساب می‌کنند؛ (۳) متن پاسخ‌ها،
       با لحن خودمونی و چند قالب برای هر پاسخ. هیچ‌چیز را تغییر نمی‌دهد. به 18c (داده) و 18f (واژه‌نامه) وابسته است
       و از برنامه فقط hkAsstCY()، hkAsstCM()، getTodayPersian، daysInMonth، formatNum و toPersianDigits را می‌خواند. */

    /* ---------- سال کوتاه ---------- */
    /* ۴۰۳ ← ۱۴۰۳، ۰۳ ← ۱۴۰۳، ۹۹ ← ۱۳۹۹. عدد دورقمی تا سال جاری به‌علاوهٔ یک «چهارصدی» حساب می‌شود، بقیه «سیصدی». */
    function hkAsstFullYear(n) {
      n = parseInt(n, 10);
      if (!isFinite(n)) return 0;
      if (n >= 1300 && n <= 1499) return n;
      if (n >= 300 && n <= 499) return 1000 + n;
      if (n >= 0 && n <= 99) { var cur = hkAsstCY() % 100; return n <= cur + 1 ? 1400 + n : 1300 + n; }
      return 0;
    }
    var HK_ASST_MONTHRE = null;
    var HK_ASST_UNIT_RE = '(?:میلیون|هزار|میلیارد|ملیارد|تومان|تومن|ریال|تا|بار|مورد|روز|درصد|ماه)';
    function hkAsstMonthRe() {
      if (HK_ASST_MONTHRE) return HK_ASST_MONTHRE;
      var names = [];
      for (var k = 1; k <= 12; k++) (HK_ASST_PHRASES['MONTH_' + k] || []).forEach(function (p) { if (p.indexOf(' ') < 0) names.push(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); });
      names.sort(function (a, b) { return b.length - a.length; });
      HK_ASST_MONTHRE = new RegExp('(^|\\s)(' + names.join('|') + ')(?:\\s+ماه)?\\s+(\\d{2,4})(?=\\s|$)(?!\\s*' + HK_ASST_UNIT_RE + ')', 'g');
      return HK_ASST_MONTHRE;
    }
    /* متن نرمال‌شده (رقم لاتین) را می‌گیرد؛ سال‌های کوتاه را کامل می‌کند. عدد مبلغ را دست نمی‌زند (جلوی «میلیون» و… سال نیست) */
    function hkAsstNormYears(text) {
      var t = String(text);
      t = t.replace(new RegExp('(^|\\s)(سال|در|توی|تو|طی|برای|از|تا)\\s+(\\d{2,4})(?=\\s|$)(?!\\s*' + HK_ASST_UNIT_RE + ')', 'g'), function (m, pre, w, n) {
        if (w !== 'سال' && String(n).length < 3) return m;
        var y = hkAsstFullYear(n);
        return y ? pre + (w === 'سال' ? 'سال ' : w + ' ') + y : m;
      });
      t = t.replace(hkAsstMonthRe(), function (m, pre, name, n) {
        var v = parseInt(n, 10);
        if (String(n).length === 2 && !(v <= hkAsstCY() % 100 + 1 || v >= 90)) return m;   /* «آبان ۱۰» روز است نه سال */
        var y = hkAsstFullYear(n);
        return y ? pre + name + ' ' + y : m;
      });
      return t;
    }

    /* ---------- کمک‌های عمومی ---------- */
    var _hkAsstSayN = 0;
    /* یکی از قالب‌ها را برمی‌دارد؛ هر بار قالب بعدی، تا پاسخ‌ها تکراری نباشند */
    function hkAsstPick(list) { _hkAsstSayN++; return list[(_hkAsstSayN + new Date().getDate()) % list.length]; }
    function hkAsstFmt(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
    function hkAsstCompact(n) {
      n = Math.round(Number(n) || 0);
      var a = Math.abs(n), sign = n < 0 ? '-' : '';
      function dec(x) { var r = Math.round(x * 10) / 10; return toPersianDigits(String(r).replace('.', '٫')); }
      if (a >= 1e9) return sign + dec(a / 1e9) + ' میلیارد تومن';
      if (a >= 1e6) return sign + dec(a / 1e6) + ' میلیون تومن';
      return sign + toPersianDigits(formatNum(a)) + ' تومن';
    }
    function hkAsstPctText(n) { return toPersianDigits(String(Math.round(Math.abs(n)))) + '٪'; }
    function hkAsstNumFa(n) { return toPersianDigits(String(Math.round(Number(n) || 0))); }
    function hkAsstPctChange(cur, prev) { return prev > 0 ? Math.round((cur - prev) / prev * 100) : null; }
    function hkAsstAddMonths(y, m, k) { var i = y * 12 + (m - 1) + k; return { y: Math.floor(i / 12), m: i % 12 + 1 }; }
    function hkAsstMonthLabel(y, m) { return HK_ASST_MONTH_NAMES[m - 1] + ' ' + toPersianDigits(String(y)); }
    /* امروز در تقویم شمسی؛ اگر ماه نمایش‌داده‌شدهٔ برنامه ماه جاری نیست، کل ماه گذشته فرض می‌شود */
    /* ۱.۴.۳۹: «امروز» واقعی گوشی (نه سال/ماهی که کاربر در منوی انتخاب سال دیده است) */
    /* ۱.۴.۴۲: آیا تقویم شمسی دستگاه (Intl) واقعاً کار می‌کند؟ وگرنه «امروز» نامعتبر است و پاسخ‌های وابسته به ماه جاری عدد نمی‌دهند */
    function hkAsstIntlOk() {
      try { var pp = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).formatToParts(new Date()); return parseInt(toEnglishDigits((pp.find(function (q) { return q.type === 'year'; }) || {}).value || '0'), 10) > 1300; } catch (e) { return false; }
    }
    var _hkAsstRealC = { k: 0, y: 0, m: 0 };
    function hkAsstReal() {
      var k = Math.floor(Date.now() / 600000);
      if (_hkAsstRealC.k !== k) {
        var y = 0, m = 0;
        /* ۱.۴.۴۱: اگر تقویم شمسی دستگاه (Intl) کار نکند، تاریخ ساختگیِ جایگزین به‌عنوان «امروز» داده نمی‌شود؛ ماه باز در برنامه می‌ماند */
        var okI = hkAsstIntlOk();
        if (okI) { try { var g = getTodayPersian(); if (g && g.y) { y = g.y; m = g.m; } } catch (e) {} }
        if (!y) { y = currentYear; m = currentMonth; }
        _hkAsstRealC = { k: k, y: y, m: m };
      }
      return _hkAsstRealC;
    }
    function hkAsstCY() { return hkAsstReal().y; }
    function hkAsstCM() { return hkAsstReal().m; }
    function hkAsstToday() {
      var t = { y: hkAsstCY(), m: hkAsstCM(), d: 1 };
      try { var g = getTodayPersian(); if (g && g.y === hkAsstCY() && g.m === hkAsstCM()) t.d = g.d; else t.d = daysInMonth(hkAsstCY(), hkAsstCM()); } catch (e) { t.d = 15; }
      return t;
    }
    /* روزهای گذشتهٔ ماه جاری: امروز یا آخرین روزی که ردیف دارد (هرکدام بیشتر)، تا برآورد روزانه در اول ماه بی‌معنی نشود */
    function hkAsstElapsedDays(rows, t) {
      var mx = 0; rows.forEach(function (r) { if (r.d > mx) mx = r.d; });
      return Math.max(1, Math.min(daysInMonth(t.y, t.m), Math.max(t.d, mx)));
    }
    function hkAsstRowsIn(from, to, a) {
      a = a || {};
      return hkAsstFilter(hkAsstRows(), { dateFrom: from, dateTo: to, context: a.context, cats: a.cats, project: a.project });
    }
    function hkAsstMonthTotals(y, m, a) {
      var rows = hkAsstRowsIn(y + '-' + m + '-1', y + '-' + m + '-31', a), st = hkAsstStats(rows);
      return { y: y, m: m, label: hkAsstMonthLabel(y, m), rows: rows, income: st.incomeSum, expense: st.expenseSum, count: rows.length };
    }
    /* n ماه آخر (کهنه‌ترین اول) تا ماه جاری */
    function hkAsstRecentMonths(n, a) {
      var out = [];
      for (var i = n - 1; i >= 0; i--) { var ym = hkAsstAddMonths(hkAsstCY(), hkAsstCM(), -i); out.push(hkAsstMonthTotals(ym.y, ym.m, a)); }
      return out;
    }
    /* دسته‌های ساخت کاربر */
    function hkAsstCustomCats() {
      try { return (JSON.parse(localStorage.getItem(STORAGE_KEY + '_catCustom') || '[]') || []).filter(function (c) { return c && c.id; }); } catch (e) { return []; }
    }
    function hkAsstCatLabel(id) {
      if (HK_ASST_CAT_LABELS[id]) return HK_ASST_CAT_LABELS[id];
      var c = hkAsstCustomCats().filter(function (x) { return String(x.id) === String(id); })[0];
      return c && c.label ? String(c.label) : 'سایر';
    }
    /* دستهٔ یک ردیف: برچسب خود ردیف، بعد مترادف‌ها در شرح؛ وگرنه «سایر» */
    function hkAsstCatOf(r) {
      var ids = Object.keys(HK_ASST_CAT_LABELS), i;
      if (r.cats && r.cats.length) {
        for (i = 0; i < ids.length; i++) if (r.cats.indexOf(ids[i]) >= 0) return ids[i];
        return String(r.cats[0]);
      }
      for (i = 0; i < ids.length; i++) if (hkAsstCatHit(r, ids[i])) return ids[i];
      return 'other';
    }
    function hkAsstCatTotals(rows) {
      var m = {}, total = 0;
      rows.forEach(function (r) {
        if (r.tab !== 'expense') return;
        var id = hkAsstCatOf(r), o = m[id] || (m[id] = { id: id, label: hkAsstCatLabel(id), sum: 0, count: 0 });
        o.sum += r.amount; o.count++; total += r.amount;
      });
      var list = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.sum - a.sum; });
      list.forEach(function (o) { o.share = total > 0 ? o.sum / total : 0; });
      return { list: list, total: total };
    }
    /* بازهٔ پرسیده‌شده: ماه، سال، یا چند ماه اخیر؛ پیش‌فرض ماه جاری. «prev» بازهٔ هم‌اندازهٔ قبلی برای مقایسه است */
    function hkAsstPeriodOf(a) {
      a = a || {};
      var cy = hkAsstCY(), cm = hkAsstCM();
      if (a.dateFrom) {
        var df = String(a.dateFrom).split('-'), n = Math.max(1, (cy - (+df[0])) * 12 + (cm - (+df[1])) + 1);
        var s0 = hkAsstAddMonths(cy, cm, -(n - 1)), p1 = hkAsstAddMonths(cy, cm, -n), p0 = hkAsstAddMonths(cy, cm, -(2 * n - 1));
        return { kind: 'span', n: n, from: s0.y + '-' + s0.m + '-1', to: cy + '-' + cm + '-31', label: toPersianDigits(String(n)) + ' ماه اخیر',
          prev: { from: p0.y + '-' + p0.m + '-1', to: p1.y + '-' + p1.m + '-31', label: toPersianDigits(String(n)) + ' ماه قبلش' } };
      }
      if (a.year && a.month) {
        var pv = hkAsstAddMonths(a.year, a.month, -1);
        return { kind: 'month', y: a.year, m: a.month, n: 1, from: a.year + '-' + a.month + '-1', to: a.year + '-' + a.month + '-31', label: hkAsstMonthLabel(a.year, a.month),
          prev: { from: pv.y + '-' + pv.m + '-1', to: pv.y + '-' + pv.m + '-31', label: hkAsstMonthLabel(pv.y, pv.m) } };
      }
      if (a.year) {
        return { kind: 'year', y: a.year, n: 12, from: a.year + '-1-1', to: a.year + '-12-31', label: 'سال ' + toPersianDigits(String(a.year)),
          prev: { from: (a.year - 1) + '-1-1', to: (a.year - 1) + '-12-31', label: 'سال ' + toPersianDigits(String(a.year - 1)) } };
      }
      var pm = hkAsstAddMonths(cy, cm, -1);
      return { kind: 'month', y: cy, m: cm, n: 1, current: true, from: cy + '-' + cm + '-1', to: cy + '-' + cm + '-31', label: hkAsstMonthLabel(cy, cm),
        prev: { from: pm.y + '-' + pm.m + '-1', to: pm.y + '-' + pm.m + '-31', label: hkAsstMonthLabel(pm.y, pm.m) } };
    }
    function hkAsstAvgOver(months, key) {
      var live = months.filter(function (x) { return x.count > 0; });
      if (!live.length) return 0;
      var s = 0; live.forEach(function (x) { s += x[key]; });
      return s / live.length;
    }
    var HK_ASST_NEED_CATS = ['food', 'transport', 'bills', 'home', 'health', 'debt', 'education'];

    /* ---------- ابزارهای تحلیلی (فقط خواندنی) ---------- */
    var HK_ASST_INS_ARGS = ['year', 'month', 'dateFrom', 'context', 'cats', 'project'];
    HK_ASST_TOOLS['insights.overview'] = {
      readOnly: true, args: HK_ASST_INS_ARGS.concat(['short']),
      run: function (a) {
        if (a.short) { var sn = hkAsstMonthNet(a, 'status'); return Object.assign({ empty: !!sn.empty, short: sn, label: sn.label }, {}); }
        var p = hkAsstPeriodOf(a), rows = hkAsstRowsIn(p.from, p.to, a), prow = hkAsstRowsIn(p.prev.from, p.prev.to, a);
        var st = hkAsstStats(rows), ps = hkAsstStats(prow), ct = hkAsstCatTotals(rows);
        var exp = rows.filter(function (r) { return r.tab === 'expense'; }).sort(function (x, y) { return y.amount - x.amount; })[0];
        var days = p.kind === 'month' ? (p.current ? hkAsstElapsedDays(rows, hkAsstToday()) : daysInMonth(p.y, p.m)) : 0;
        return { label: p.label, kind: p.kind, prevLabel: p.prev.label, count: rows.length, empty: !rows.length,
          income: st.incomeSum, expense: st.expenseSum, balance: st.incomeSum - st.expenseSum,
          rate: st.incomeSum > 0 ? (st.incomeSum - st.expenseSum) / st.incomeSum : null,
          prev: { count: prow.length, income: ps.incomeSum, expense: ps.expenseSum },
          expenseChange: hkAsstPctChange(st.expenseSum, ps.expenseSum), incomeChange: hkAsstPctChange(st.incomeSum, ps.incomeSum),
          topCats: ct.list.slice(0, 3), biggest: exp ? { desc: exp.desc || exp.section || '—', amount: exp.amount, day: exp.d, month: exp.m } : null,
          days: days, dailyAvg: days > 0 ? Math.round(st.expenseSum / days) : null };
      }
    };
    /* ===== ۱.۴.۴۲: موجودی، پس‌انداز و وضعیت مالی: اول دقیقاً جواب همان سؤال، از منبع معتبر خود برنامه ===== */
    /* موجودی: همان عددی که کارت «موجودی آنی» نشان می‌دهد (globalAccountBalances / sumGlobalAccountBalances)؛ فقط وقتی ماه باز برنامه ماه جاری واقعی است */
    /* درآمد و خرج و مانده (درآمد منهای خرج) یک بازه: برای ماهِ بازِ برنامه همان عدد کارت اصلی، وگرنه جمع همهٔ ردیف‌ها (با برچسب مبنا) */
    function hkAsstMonthNet(a, mode) {
    var explicit = !!(a.year || a.month || a.dateFrom);
        if (!explicit && !hkAsstIntlOk()) return { mode: mode, unavailable: 'nodate' };
        var p = hkAsstPeriodOf(a), out = { mode: mode, label: p.label, kind: p.kind }, useCard = p.kind === 'month' && p.y === currentYear && p.m === currentMonth;
        if (useCard) {
          try { var t = personTotals(hkMainTitle()); out.basis = 'card'; out.income = Number(t.incomeTotal) || 0; out.expense = Number(t.expenseTotal) || 0; out.incUnpaid = Number(t.incomeUnpaid) || 0; out.expUnpaid = Number(t.expenseUnpaid) || 0; }
          catch (e2) { useCard = false; }
        }
        if (!useCard) {
          var rows = hkAsstRowsIn(p.from, p.to, {}), st = hkAsstStats(rows), ct = hkAsstCatTotals(rows);
          out.basis = 'all'; out.income = st.incomeSum; out.expense = st.expenseSum; out.incUnpaid = st.unpaidIncome; out.expUnpaid = st.unpaidExpense;
          out.top = ct.list[0] || null;
        }
        out.net = out.income - out.expense; out.rate = out.income > 0 ? out.net / out.income : null; out.empty = !out.income && !out.expense;
      return out;
    }
    HK_ASST_TOOLS['insights.balance'] = {
      readOnly: true, args: ['past'],
      run: function (a) {
        if (a && a.past) return { ok: false, reason: 'past' };
        if (!hkAsstIntlOk()) return { ok: false, reason: 'nodate' };
        var real = hkAsstReal();
        if (currentYear !== real.y || currentMonth !== real.m) return { ok: false, reason: 'othermonth', open: hkAsstMonthLabel(currentYear, currentMonth), now: hkAsstMonthLabel(real.y, real.m) };
        if (typeof globalAccountBalances !== 'function' || typeof sumGlobalAccountBalances !== 'function') return { ok: false, reason: 'unsupported' };
        var map = globalAccountBalances(), total = sumGlobalAccountBalances(), keys = Object.keys(map);
        if (!keys.length) return { ok: false, reason: 'noaccounts' };
        var accts = keys.map(function (k) { return { name: k, value: Math.round(Number(map[k]) || 0) }; }).sort(function (x, y) { return Math.abs(y.value) - Math.abs(x.value); });
        return { ok: true, total: Math.round(total), accounts: accts, label: hkAsstMonthLabel(real.y, real.m) };
      }
    };
    /* پس‌انداز: «ماهانه» = درآمد منهای خرج (تعریف خود کارت «پس‌انداز این ماه»)؛ «ارز و طلا» = بخش پس‌اندازِ برنامه؛ «وضعیت» = خلاصهٔ کوتاه همان ماه */
    HK_ASST_TOOLS['insights.savings'] = {
      readOnly: true, args: ['mode', 'year', 'month', 'dateFrom', 'alt'],
      run: function (a) {
        var mode = a.mode === 'stock' ? 'stock' : a.mode === 'status' ? 'status' : 'flow';
        if (mode === 'stock') {
          var G = []; try { G = typeof _savGroups === 'function' ? _savGroups() : []; } catch (e) { G = []; }
          var priced = G.filter(function (g) { return g.price; }), tv = 0; priced.forEach(function (g) { tv += g.value; });
          return { mode: 'stock', empty: !G.length, groups: G.slice(0, 6).map(function (g) { return { name: g.name, qty: g.qty, unit: g.unit, priced: !!g.price }; }),
            count: G.length, pricedCount: priced.length, totalValue: Math.round(tv), unpriced: G.filter(function (g) { return !g.price; }).map(function (g) { return g.name; }).slice(0, 3) };
        }
        var flowRes = hkAsstMonthNet(a, mode);
        if (a.alt && mode === 'flow') {
          try {
            var G2 = typeof _savGroups === 'function' ? _savGroups() : [], pr2 = G2.filter(function (g) { return g.price; }), tv2 = 0; pr2.forEach(function (g) { tv2 += g.value; });
            if (G2.length) flowRes.alt = { count: G2.length, pricedCount: pr2.length, totalValue: Math.round(tv2) };
          } catch (e3) {}
        }
        return flowRes;
      }
    };
    function hkAsstFinText(name, res) {
      var m = hkAsstMoney, L = [];
      if (name === 'balance') {
        if (!res.ok) {
          if (res.reason === 'past') return 'موجودیِ گذشته (مثلاً آخر ماه قبل) رو هنوز نمی‌تونم بگم؛ فقط موجودیِ الان رو می‌گم.';
          if (res.reason === 'nodate') return 'تقویم شمسی این گوشی در دسترس نیست و نمی‌تونم مطمئن بشم ماه جاری باز است؛ برای همین عدد موجودی نمی‌گم.';
          if (res.reason === 'othermonth') return 'الان ماه ' + res.open + ' باز است، نه ماه جاری (' + res.now + ')؛ موجودیِ الان فقط وقتی ماه جاری باز باشد قابل‌اتکاست. ماه جاری رو باز کن و دوباره بپرس.';
          if (res.reason === 'noaccounts') return 'هنوز حساب یا موجودی‌ای ثبت نشده که بشه جمعش کرد.';
          return 'موجودی رو از این نسخه نتونستم حساب کنم.';
        }
        L.push('موجودی حساب‌هات الان روی هم ' + m(res.total) + ' است (موجودی‌های ثبت‌شده + ردیف‌های پرداخت‌شدهٔ ' + res.label + ').');
        var shown = res.accounts.filter(function (x) { return x.name !== 'بدون حساب' || x.value !== 0; });
        if (shown.length > 1) {
          var top = shown.slice(0, 3).map(function (x) { return x.name + ': ' + m(x.value); }).join('، ');
          L.push(top + (shown.length > 3 ? ' و ' + hkAsstNum(shown.length - 3) + ' حساب دیگر.' : '.'));
        }
        return L.join('\n');
      }
      /* savings */
      if (res.unavailable === 'nodate') return 'تقویم شمسی این گوشی در دسترس نیست و نمی‌تونم «این ماه» رو مطمئن تشخیص بدم؛ ماه رو بنویس (مثلاً «پس‌انداز آذر»).';
      if (res.mode === 'stock') {
        if (res.empty) return 'توی بخش پس‌انداز (ارز و طلا) هنوز چیزی ثبت نشده.';
        if (res.pricedCount) {
          L.push('پس‌اندازِ ارز و طلات روی هم ' + m(res.totalValue) + ' ارزش داره (طبق قیمت‌هایی که خودت وارد کرده‌ای).');
          if (res.unpriced.length) L.push('برای ' + res.unpriced.map(function (x) { return '«' + x + '»'; }).join('، ') + ' قیمت وارد نشده و تو این جمع نیست.');
        } else {
          L.push('پس‌اندازت: ' + res.groups.slice(0, 3).map(function (g) { return g.name + ' ' + toPersianDigits(String(Math.round(g.qty * 1000) / 1000)) + ' ' + g.unit; }).join('، ') + (res.count > 3 ? ' و ' + hkAsstNum(res.count - 3) + ' مورد دیگه' : '') + '.');
          L.push('قیمت روز وارد نشده، برای همین ارزش تومانی نمی‌گم.');
        }
        return L.join('\n');
      }
      var basis = res.basis === 'card' ? 'طبق کارت اصلی' : 'طبق همهٔ ردیف‌ها';
      if (res.empty) return 'برای ' + res.label + ' هنوز درآمد یا هزینه‌ای ثبت نشده.';
      var un = [];
      if (res.incUnpaid > 0) un.push('دریافت‌نشده ' + m(res.incUnpaid));
      if (res.expUnpaid > 0) un.push('پرداخت‌نشده ' + m(res.expUnpaid));
      var unLine = un.length ? un.join(' و ') + ' هم توی این حساب هست.' : '';
      if (res.mode === 'status') {
        L.push(res.label + ': درآمد ' + m(res.income) + '، خرج ' + m(res.expense) + (res.net >= 0 ? '؛ ' + m(res.net) + ' بیشتر درآمد داشتی' : '؛ خرجت ' + m(-res.net) + ' از درآمدت بیشتره') + ' (' + basis + ').');
        if (res.rate != null) L.push('نرخ پس‌انداز: ' + (res.rate < 0 ? 'منفی ' : '') + hkAsstPctText(res.rate * 100) + ' — ' + hkAsstRateComment(res.rate));
        if (unLine) L.push(unLine);
        else if (res.top) L.push('بیشترین خرجت: ' + res.top.label + ' (' + m(res.top.sum) + ').');
        return L.join('\n');
      }
      if (res.net >= 0) L.push('پس‌اندازِ ' + res.label + ' (درآمد منهای خرج): ' + m(res.net) + '.');
      else L.push('توی ' + res.label + ' خرجت ' + m(-res.net) + ' از درآمدت بیشتر شده؛ پس‌اندازی نموند (کسری).');
      L.push('درآمد ' + m(res.income) + '، خرج ' + m(res.expense) + ' (' + basis + ').' + (unLine ? ' ' + unLine : ''));
      if (res.alt) L.push(res.alt.pricedCount ? 'پس‌اندازِ ارز و طلات هم جداست: ' + m(res.alt.totalValue) + ' (طبق قیمت‌هایی که خودت وارد کرده‌ای).' : 'پس‌اندازِ ارز و طلات هم جداست: ' + hkAsstNum(res.alt.count) + ' مورد ثبت شده ولی قیمت وارد نشده.');
      return L.join('\n');
    }
    HK_ASST_TOOLS['insights.top'] = {
      readOnly: true, args: HK_ASST_INS_ARGS,
      run: function (a) {
        var p = hkAsstPeriodOf(a), rows = hkAsstRowsIn(p.from, p.to, a), ct = hkAsstCatTotals(rows);
        return { label: p.label, empty: !ct.list.length, total: ct.total, cats: ct.list.slice(0, 5) };
      }
    };
    HK_ASST_TOOLS['insights.trend'] = {
      readOnly: true, args: HK_ASST_INS_ARGS.concat(['tab']),
      run: function (a) {
        var months = [], p = hkAsstPeriodOf(a);
        if (p.kind === 'year') { for (var m = 1; m <= 12; m++) months.push(hkAsstMonthTotals(p.y, m, a)); }
        else { months = hkAsstRecentMonths(p.kind === 'span' ? Math.min(p.n, 12) : 6, a); }
        months = months.map(function (x) { return { label: x.label, y: x.y, m: x.m, income: x.income, expense: x.expense, balance: x.income - x.expense, count: x.count }; });
        var live = months.filter(function (x) { return x.count > 0; }), focus = a.tab === 'income' ? 'income' : 'expense';
        var hi = null, lo = null;
        live.forEach(function (x) { if (!hi || x[focus] > hi[focus]) hi = x; if (!lo || x[focus] < lo[focus]) lo = x; });
        var change = null;
        if (live.length >= 3) {
          var last = live[live.length - 1][focus], before = live.slice(0, live.length - 1), s = 0; before.forEach(function (x) { s += x[focus]; });
          change = hkAsstPctChange(last, s / before.length);
        }
        return { focus: focus, months: months, live: live.length, highest: hi, lowest: lo, lastVsAvg: change, empty: live.length < 2, label: p.label };
      }
    };
    HK_ASST_TOOLS['insights.advice'] = {
      readOnly: true, args: ['year', 'month', 'context'],
      run: function (a) {
        var n = 3, months;
        if (a.year && a.month) { months = []; for (var i = n - 1; i >= 0; i--) { var ym = hkAsstAddMonths(a.year, a.month, -i); months.push(hkAsstMonthTotals(ym.y, ym.m, a)); } }
        else months = hkAsstRecentMonths(n, a);
        var live = months.filter(function (x) { return x.count > 0; });
        if (!live.length) return { empty: true, tips: [] };
        var allRows = []; live.forEach(function (x) { allRows = allRows.concat(x.rows); });
        var avgInc = hkAsstAvgOver(months, 'income'), avgExp = hkAsstAvgOver(months, 'expense');
        var rate = avgInc > 0 ? (avgInc - avgExp) / avgInc : null;
        var ct = hkAsstCatTotals(allRows), tips = [];
        var lastM = live[live.length - 1], prevM = live.slice(0, live.length - 1);
        if (avgInc <= 0) tips.push({ id: 'noIncome', w: 95 });
        else if (avgExp > avgInc) tips.push({ id: 'overspend', w: 100, diff: avgExp - avgInc });
        var debt = ct.list.filter(function (c) { return c.id === 'debt'; })[0];
        if (debt && avgInc > 0 && (debt.sum / live.length) / avgInc >= 0.3) tips.push({ id: 'debtHeavy', w: 90, share: (debt.sum / live.length) / avgInc });
        var top = ct.list[0];
        if (top && top.share >= 0.35 && top.id !== 'debt') tips.push({ id: 'topShare', w: 80, cat: top.label, share: top.share, save: Math.round(top.sum / live.length * 0.1) });
        if (prevM.length) {
          var lastCt = hkAsstCatTotals(lastM.rows), prevRows = []; prevM.forEach(function (x) { prevRows = prevRows.concat(x.rows); });
          var prevCt = hkAsstCatTotals(prevRows), best = null;
          lastCt.list.forEach(function (c) {
            var pc = prevCt.list.filter(function (x) { return x.id === c.id; })[0], base = pc ? pc.sum / prevM.length : 0;
            if (base > 0 && c.sum >= lastCt.total * 0.05 && (c.sum - base) / base >= 0.3 && (!best || c.sum - base > best.gain)) best = { cat: c.label, pct: Math.round((c.sum - base) / base * 100), gain: c.sum - base };
          });
          if (best) tips.push({ id: 'rising', w: 70, cat: best.cat, pct: best.pct, gain: best.gain });
        }
        var expRows = allRows.filter(function (r) { return r.tab === 'expense'; });
        if (expRows.length >= 12 && avgExp > 0) {
          var thr = avgExp * 0.02, small = expRows.filter(function (r) { return r.amount > 0 && r.amount < thr; }), ss = 0;
          small.forEach(function (r) { ss += r.amount; });
          if (small.length >= 10 && ss >= avgExp * live.length * 0.06) tips.push({ id: 'small', w: 60, n: small.length, sum: ss, thr: thr });
        }
        if (rate != null && rate >= 0 && rate < 0.1) tips.push({ id: 'lowSave', w: 65, rate: rate, need: Math.round(avgInc * 0.2 - (avgInc - avgExp)) });
        var big = lastM.rows.filter(function (r) { return r.tab === 'expense'; }).sort(function (x, y) { return y.amount - x.amount; })[0], lastExp = lastM.expense;
        if (big && lastExp > 0 && big.amount >= lastExp * 0.35 && lastM.rows.length >= 4) tips.push({ id: 'bigOne', w: 50, desc: big.desc || big.section || '—', amount: big.amount, share: big.amount / lastExp });
        var wants = 0; ct.list.forEach(function (c) { if (['fun', 'clothing', 'gift', 'tech'].indexOf(c.id) >= 0) wants += c.sum; });
        if (ct.total > 0 && wants / ct.total >= 0.3) tips.push({ id: 'wants', w: 45, share: wants / ct.total, save: Math.round(wants / live.length * 0.15) });
        if (rate != null && rate >= 0.2) tips.push({ id: 'goodSave', w: 20, rate: rate });
        tips.sort(function (x, y) { return y.w - x.w; });
        return { empty: false, months: live.length, avgIncome: avgInc, avgExpense: avgExp, rate: rate, tips: tips.slice(0, 4), topCats: ct.list.slice(0, 3) };
      }
    };
    HK_ASST_TOOLS['insights.forecast'] = {
      readOnly: true, args: ['context'],
      run: function (a) {
        var t = hkAsstToday(), dim = daysInMonth(t.y, t.m);
        var cur = hkAsstMonthTotals(t.y, t.m, a), prev = [], d = hkAsstElapsedDays(cur.rows, t);
        for (var i = 3; i >= 1; i--) { var ym = hkAsstAddMonths(t.y, t.m, -i); prev.push(hkAsstMonthTotals(ym.y, ym.m, a)); }
        var avgInc = hkAsstAvgOver(prev, 'income'), avgExp = hkAsstAvgOver(prev, 'expense');
        if (!cur.count && !prev.some(function (x) { return x.count > 0; })) return { empty: true };
        var rate = cur.expense / d, projExp = Math.max(cur.expense, Math.round(rate * dim)), early = d < 7 && prev.some(function (x) { return x.count > 0; });
        if (early) projExp = Math.max(cur.expense, Math.round(avgExp));      /* اوایل ماه، برآورد از روی میانگین ماه‌های قبل */
        var expIncome = Math.max(cur.income, avgInc), nextExp = Math.round(prev.some(function (x) { return x.count > 0; }) ? (projExp + avgExp) / 2 : projExp);
        return { empty: false, day: d, dim: dim, daysLeft: dim - d, spent: cur.expense, income: cur.income, expectedIncome: expIncome, projectedExpense: projExp,
          projectedBalance: expIncome - projExp, early: early, perDay: Math.round(rate), nextExpense: nextExp, nextIncome: Math.round(avgInc) || expIncome, hasHistory: prev.some(function (x) { return x.count > 0; }) };
      }
    };
    HK_ASST_TOOLS['insights.budget'] = {
      readOnly: true, args: ['context'],
      run: function (a) {
        var months = hkAsstRecentMonths(3, a), live = months.filter(function (x) { return x.count > 0; });
        if (!live.length) return { empty: true };
        var income = hkAsstAvgOver(months, 'income');
        var allRows = []; live.forEach(function (x) { allRows = allRows.concat(x.rows); });
        var ct = hkAsstCatTotals(allRows), needs = 0, wants = 0;
        ct.list.forEach(function (c) { var avg = c.sum / live.length; if (HK_ASST_NEED_CATS.indexOf(c.id) >= 0) needs += avg; else wants += avg; });
        var caps = ct.list.slice(0, 5).map(function (c) { var avg = c.sum / live.length; return { label: c.label, avg: Math.round(avg), cap: Math.round(avg * 0.9) }; });
        return { empty: false, months: live.length, income: income, hasIncome: income > 0, needs: Math.round(income * 0.5), wants: Math.round(income * 0.3), save: Math.round(income * 0.2),
          actualNeeds: Math.round(needs), actualWants: Math.round(wants), actualExpense: Math.round(needs + wants), caps: caps };
      }
    };
    HK_ASST_TOOLS['insights.goal'] = {
      readOnly: true, args: ['target', 'months'],
      run: function (a) {
        var target = Number(a.target) || 0, months = parseInt(a.months, 10) || 0;
        if (target <= 0) throw new Error('مبلغ هدف مشخص نیست');
        var ms = hkAsstRecentMonths(3), live = ms.filter(function (x) { return x.count > 0; });
        var surplus = live.length ? hkAsstAvgOver(ms, 'income') - hkAsstAvgOver(ms, 'expense') : 0;
        var out = { target: target, months: months, surplus: Math.round(surplus), hasHistory: live.length > 0 };
        if (months > 0) { out.needMonthly = Math.ceil(target / months); out.feasible = surplus >= out.needMonthly; out.gap = Math.max(0, out.needMonthly - Math.round(surplus)); }
        else if (surplus > 0) { out.monthsNeeded = Math.ceil(target / surplus); }
        return out;
      }
    };
    HK_ASST_TOOLS['insights.daily'] = {
      readOnly: true, args: ['context'],
      run: function (a) {
        var f = HK_ASST_TOOLS['insights.forecast'].run(a || {});
        if (f.empty) return { empty: true };
        var remaining = f.expectedIncome - f.spent;
        return { empty: false, day: f.day, dim: f.dim, daysLeft: f.daysLeft, spent: f.spent, expectedIncome: f.expectedIncome, remaining: remaining,
          perDay: f.daysLeft > 0 ? Math.round(remaining / f.daysLeft) : Math.round(remaining), avgSoFar: f.perDay };
      }
    };
    HK_ASST_TOOLS['insights.anomaly'] = {
      readOnly: true, args: ['context', 'cats'],
      run: function (a) {
        var ms = hkAsstRecentMonths(3, a), rows = [];
        ms.forEach(function (x) { rows = rows.concat(x.rows.filter(function (r) { return r.tab === 'expense' && r.amount > 0; })); });
        if (rows.length < 8) return { empty: true };
        var amts = rows.map(function (r) { return r.amount; }).sort(function (x, y) { return x - y; });
        var med = amts[Math.floor(amts.length / 2)], mean = 0; amts.forEach(function (v) { mean += v; }); mean /= amts.length;
        var sd = 0; amts.forEach(function (v) { sd += (v - mean) * (v - mean); }); sd = Math.sqrt(sd / amts.length);
        var thr = Math.max(med * 3, mean + 2 * sd);
        var odd = rows.filter(function (r) { return r.amount >= thr; }).sort(function (x, y) { return y.amount - x.amount; }).slice(0, 5);
        return { empty: false, median: Math.round(med), threshold: Math.round(thr), items: odd.map(hkAsstPublic), total: rows.length };
      }
    };
    HK_ASST_TOOLS['insights.recurring'] = {
      readOnly: true, args: ['context'],
      run: function (a) {
        var ms = hkAsstRecentMonths(6, a), groups = {};
        ms.forEach(function (x) {
          x.rows.forEach(function (r) {
            if (r.tab !== 'expense' || r.amount <= 0 || r.transfer) return;
            var k = hkAsstKey(r.desc || ''); if (k.length < 3) return;
            var g = groups[k] || (groups[k] = { desc: r.desc, months: {}, amounts: [] });
            g.months[x.y * 100 + x.m] = 1; g.amounts.push(r.amount);
          });
        });
        var list = [];
        Object.keys(groups).forEach(function (k) {
          var g = groups[k], n = Object.keys(g.months).length;
          if (n < 3) return;
          var mn = Math.min.apply(null, g.amounts), mx = Math.max.apply(null, g.amounts);
          if (mn <= 0 || mx / mn > 1.3) return;
          var sum = 0; g.amounts.forEach(function (v) { sum += v; });
          list.push({ desc: g.desc, months: n, avg: Math.round(sum / g.amounts.length) });
        });
        list.sort(function (x, y) { return y.avg - x.avg; });
        var total = 0; list.forEach(function (x) { total += x.avg; });
        return { empty: !list.length, items: list.slice(0, 8), monthlyTotal: total };
      }
    };

    /* ---------- متن پاسخ‌ها ---------- */
    function hkAsstRateComment(r) {
      if (r == null) return '';
      if (r >= 0.2) return hkAsstPick(['عالیه، از هدفِ ۲۰٪ هم بالاتری.', 'خیلی خوبه؛ دمت گرم.', 'وضعیتت توی پس‌انداز عالیه.']);
      if (r >= 0.1) return hkAsstPick(['بد نیست؛ با کمی جمع‌وجور کردن می‌شه به ۲۰٪ رسوند.', 'قابل قبوله، ولی جا برای بهتر شدن هست.']);
      if (r >= 0) return hkAsstPick(['کمه؛ بهتره حداقل ۱۰٪ کنار بذاری.', 'نزدیک صفره، باید حواست بیشتر باشه.']);
      return hkAsstPick(['منفیه؛ یعنی بیشتر از درآمدت خرج کردی.', 'خرجت از درآمدت بیشتر شده، حواست باشه.']);
    }
    function hkAsstInsightText(tool, res, cmd) {
      var L = [], name = tool.slice(9), money = hkAsstCompact;
      if (name === 'balance' || name === 'savings') return hkAsstFinText(name, res);
      if (name === 'overview' && res.short) return hkAsstFinText('savings', res.short);
      if (res.empty && name !== 'trend') {
        if (name === 'forecast' || name === 'daily') return hkAsstPick(['هنوز داده‌ای برای این ماه و ماه‌های قبلش ندارم؛ چند تا ردیف ثبت کن تا بتونم پیش‌بینی کنم.', 'برای پیش‌بینی کردن باید چند تا تراکنش ثبت شده باشه؛ هنوز چیزی ندارم.']);
        if (name === 'anomaly') return hkAsstPick(['هنوز تراکنش کافی ندارم تا بگم کدوم خرج غیرعادیه.', 'داده‌ات کمه؛ با چند ماه ثبت، می‌تونم خرج‌های غیرعادی رو نشونت بدم.']);
        if (name === 'recurring') return hkAsstPick(['خرج ثابتِ ماه‌به‌ماه پیدا نکردم؛ باید حداقل سه ماه یه خرج با مبلغ مشابه ثبت شده باشه.', 'فعلاً هزینهٔ تکراری مشخصی توی ثبت‌هات نمی‌بینم.']);
        return hkAsstPick(['برای این بازه هنوز چیزی ثبت نشده؛ چند تا ردیف ثبت کن تا برات تحلیلش کنم.', 'داده‌ای برای این بازه ندارم، پس چیزی برای تحلیل نیست.']);
      }
      if (name === 'overview') {
        L.push(hkAsstFmt(hkAsstPick(['خب، وضعیت {l} رو نگاه کردم:', 'بریم سراغ {l}:', 'اینم از {l}:']), { l: res.label }));
        L.push('درآمد: ' + money(res.income)); L.push('هزینه: ' + money(res.expense)); L.push('مانده: ' + money(res.balance));
        if (res.rate != null) L.push('نرخ پس‌انداز: ' + (res.rate < 0 ? 'منفی ' : '') + hkAsstPctText(res.rate * 100) + ' — ' + hkAsstRateComment(res.rate));
        if (res.expenseChange != null && res.prev.count) {
          var up = res.expenseChange > 0;
          var ex = Math.abs(res.expenseChange) < 3 ? 'هزینه‌هات تقریباً مثل ' + res.prevLabel + ' بوده' : hkAsstFmt('نسبت به {p}، هزینه‌هات {x} {d} شده', { p: res.prevLabel, x: hkAsstPctText(res.expenseChange), d: up ? 'بیشتر' : 'کمتر' });
          var inc = res.incomeChange == null ? '' : Math.abs(res.incomeChange) < 3 ? ' و درآمدت تقریباً ثابت مونده' : ' و درآمدت ' + hkAsstPctText(res.incomeChange) + (res.incomeChange > 0 ? ' بیشتر' : ' کمتر') + ' شده';
          L.push(ex + inc + '.');
        }
        if (res.topCats.length) L.push('بیشتر پولت رفته سمت: ' + res.topCats.map(function (c) { return c.label + ' (' + money(c.sum) + '، ' + hkAsstPctText(c.share * 100) + ')'; }).join('، '));
        if (res.biggest) L.push('بزرگ‌ترین خرجت «' + res.biggest.desc + '» بوده، ' + money(res.biggest.amount) + '.');
        if (res.dailyAvg != null && res.dailyAvg > 0) L.push('میانگین خرج روزانه: ' + money(res.dailyAvg));
        return L.join('\n');
      }
      if (name === 'top') {
        L.push(hkAsstFmt(hkAsstPick(['پولت توی {l} بیشتر از همه اینجاها رفته:', 'سهم هر دسته از خرج‌های {l}:']), { l: res.label }));
        res.cats.forEach(function (c, i) { L.push(toPersianDigits(String(i + 1)) + '. ' + c.label + ': ' + money(c.sum) + ' (' + hkAsstPctText(c.share * 100) + ')'); });
        L.push('روی هم ' + money(res.total) + ' خرج شده.');
        return L.join('\n');
      }
      if (name === 'trend') {
        if (res.empty) return hkAsstPick(['برای دیدن روند باید حداقل دو ماه داده داشته باشم؛ هنوز کافی نیست.', 'داده‌ی دو ماه لازمه تا روند رو نشون بدم؛ فعلاً کمه.']);
        L.push(hkAsstPick(['روند ' + (res.focus === 'income' ? 'درآمدت' : 'هزینه‌هات') + ' رو دیدم:', 'اینم از روند ' + (res.focus === 'income' ? 'درآمد' : 'هزینه') + ':']));
        res.months.forEach(function (x) { if (x.count) L.push('• ' + x.label + ': ' + (res.focus === 'income' ? money(x.income) : money(x.expense))); });
        if (res.lastVsAvg != null) {
          var v = res.lastVsAvg;
          L.push(Math.abs(v) < 10 ? 'ماه آخرت تقریباً مثل میانگین ماه‌های قبلیه.' : hkAsstFmt('ماه آخرت {x}٪ {d} از میانگین ماه‌های قبلیه.', { x: toPersianDigits(String(Math.abs(v))), d: v > 0 ? 'بیشتر' : 'کمتر' }));
        }
        if (res.highest && res.lowest && res.highest !== res.lowest) L.push('بیشترین: ' + res.highest.label + ' (' + money(res.highest[res.focus]) + ') — کمترین: ' + res.lowest.label + ' (' + money(res.lowest[res.focus]) + ')');
        return L.join('\n');
      }
      if (name === 'advice') {
        L.push(hkAsstFmt(hkAsstPick(['نگاهی به {n} ماه اخیرت انداختم؛ اینا به نظرم مهم‌ترن:', 'طبق خرج و درآمد {n} ماه اخیرت، این چند تا نکته رو می‌گم:', 'با توجه به {n} ماه اخیرت، پیشنهادم اینه:']), { n: toPersianDigits(String(res.months)) }));
        if (res.avgIncome > 0) L.push('(میانگین ماهانه: درآمد ' + money(res.avgIncome) + '، هزینه ' + money(res.avgExpense) + ')');
        if (!res.tips.length) L.push('• چیز نگران‌کننده‌ای نمی‌بینم؛ همین روند رو ادامه بده و هر ماه یه مقدار ثابت کنار بذار.');
        res.tips.forEach(function (t) { L.push('• ' + hkAsstTipText(t)); });
        return L.join('\n');
      }
      if (name === 'forecast') {
        L.push(hkAsstFmt('تا امروز ({d} از {m} روز ماه) ' + money(res.spent) + ' خرج کردی؛ یعنی روزی حدود ' + money(res.perDay) + '.', { d: toPersianDigits(String(res.day)), m: toPersianDigits(String(res.dim)) }));
        L.push(hkAsstFmt(res.early ? 'هنوز اوایل ماهیم، پس برآوردم از روی میانگین ماه‌های قبلته: آخر ماه حدود {x}.' : hkAsstPick(['اگه همین‌طور ادامه بدی آخر ماه حدود {x} خرج کرده‌ای.', 'با این روند، خرجِ آخر ماهت حدود {x} می‌شه.']), { x: money(res.projectedExpense) }));
        if (res.expectedIncome > 0) {
          L.push('با درآمد حدود ' + money(res.expectedIncome) + '، مانده‌ات آخر ماه ' + (res.projectedBalance < 0 ? 'منفی می‌شه (حدود ' + money(-res.projectedBalance) + ' کسری)' : 'حدود ' + money(res.projectedBalance) + ' می‌شه') + '.');
          if (res.projectedBalance < 0 && res.daysLeft > 0) L.push('برای جبرانش، تا آخر ماه باید روزی کمتر از ' + money(Math.max(0, Math.round((res.expectedIncome - res.spent) / res.daysLeft))) + ' خرج کنی.');
        }
        if (res.hasHistory) L.push('برای ماه بعد هم، طبق سابقه‌ات، حدود ' + money(res.nextExpense) + ' هزینه و ' + money(res.nextIncome) + ' درآمد انتظار دارم.');
        return L.join('\n');
      }
      if (name === 'budget') {
        if (!res.hasIncome) return hkAsstPick(['برای بودجه‌بندی باید درآمدی ثبت شده باشه؛ هنوز درآمدی نمی‌بینم.', 'بدون درآمد ثبت‌شده نمی‌تونم بودجه پیشنهاد بدم؛ اول درآمدهات رو ثبت کن.']);
        L.push(hkAsstFmt('با درآمد ماهانهٔ حدود {i} (میانگین {n} ماه اخیرت)، قاعدهٔ ۵۰/۳۰/۲۰ این می‌شه:', { i: money(res.income), n: toPersianDigits(String(res.months)) }));
        L.push('• نیازها (خوراک، قبض، اجاره، اقساط و…): ' + money(res.needs) + ' — الان: ' + money(res.actualNeeds));
        L.push('• خواسته‌ها (تفریح، پوشاک، هدیه و…): ' + money(res.wants) + ' — الان: ' + money(res.actualWants));
        L.push('• پس‌انداز: ' + money(res.save));
        if (res.caps.length) { L.push('برای شروع، سقف پیشنهادی (۱۰٪ کمتر از میانگینت):'); res.caps.forEach(function (c) { L.push('  - ' + c.label + ': ' + money(c.cap) + ' (الان ' + money(c.avg) + ')'); }); }
        return L.join('\n');
      }
      if (name === 'goal') {
        L.push('برای هدف ' + money(res.target) + (res.months ? ' در ' + toPersianDigits(String(res.months)) + ' ماه' : '') + ':');
        if (!res.hasHistory) { L.push('هنوز سابقهٔ کافی ندارم؛ حدوداً ماهی ' + money(Math.ceil(res.target / (res.months || 12))) + ' لازمه.'); return L.join('\n'); }
        L.push('الان ماهی حدود ' + (res.surplus >= 0 ? money(res.surplus) : 'منفی ' + money(-res.surplus)) + ' از درآمدت اضافه می‌آد.');
        if (res.months) {
          L.push('باید ماهی ' + money(res.needMonthly) + ' کنار بذاری.');
          L.push(res.feasible ? hkAsstPick(['با روند فعلی می‌رسی؛ فقط مرتب کنارش بذار.', 'شدنیه! فقط باید پیگیر باشی.']) : 'با روند فعلی نمی‌رسی؛ ماهی ' + money(res.gap) + ' بیشتر باید کنار بذاری یا خرج‌ها رو کم کنی.');
        } else if (res.monthsNeeded) {
          var yy = Math.floor(res.monthsNeeded / 12), mm = res.monthsNeeded % 12;
          L.push('با همین روند حدود ' + toPersianDigits(String(res.monthsNeeded)) + ' ماه' + (yy ? ' (' + toPersianDigits(String(yy)) + ' سال' + (mm ? ' و ' + toPersianDigits(String(mm)) + ' ماه' : '') + ')' : '') + ' طول می‌کشه.');
        } else L.push('با روند فعلی چیزی اضافه نمی‌آد؛ اول باید خرج‌ها رو از درآمد کمتر کنی تا بشه پس‌انداز کرد.');
        return L.join('\n');
      }
      if (name === 'daily') {
        L.push(hkAsstFmt('از درآمد انتظاری ' + money(res.expectedIncome) + '، تا حالا ' + money(res.spent) + ' خرج کردی و ' + money(res.remaining) + ' مونده.', {}));
        if (res.remaining <= 0) L.push(hkAsstPick(['یعنی دیگه چیزی از بودجهٔ این ماه نمونده؛ تا آخر ماه فقط خرج ضروری.', 'بودجهٔ این ماه تموم شده؛ حواست به خرج‌های باقی‌ماندهٔ ماه باشه.']));
        else if (res.daysLeft > 0) L.push('با ' + toPersianDigits(String(res.daysLeft)) + ' روز باقی‌مانده، می‌تونی روزی حدود ' + money(res.perDay) + ' خرج کنی (تا حالا روزی ' + money(res.avgSoFar) + ' بودی).');
        else L.push('امروز آخر ماهه؛ حدود ' + money(res.remaining) + ' مونده.');
        return L.join('\n');
      }
      if (name === 'anomaly') {
        L.push(hkAsstFmt('توی ' + toPersianDigits(String(res.total)) + ' خرجِ سه ماه اخیرت، اینا از بقیه خیلی بزرگ‌ترن (بالای {t}، در حالی که خرج وسطی {m} بوده):', { t: money(res.threshold), m: money(res.median) }));
        if (!res.items.length) return hkAsstPick(['خرج غیرعادی ندیدم؛ همه‌چیز توی یه محدودهٔ معمولیه.', 'خرجی که از بقیه جدا بیفته پیدا نکردم.']);
        res.items.forEach(function (it) { L.push('• ' + (it.desc || it.section || '—') + ' — ' + money(it.amount) + ' (' + toPersianDigits(it.month.replace('-', '/')) + ')'); });
        return L.join('\n');
      }
      if (name === 'recurring') {
        L.push(hkAsstPick(['اینا هر ماه با مبلغ تقریباً ثابت تکرار می‌شن:', 'خرج‌های ثابتی که پیدا کردم:']));
        res.items.forEach(function (it) { L.push('• ' + it.desc + ' — حدود ' + money(it.avg) + ' (' + toPersianDigits(String(it.months)) + ' ماه)'); });
        L.push('روی هم ماهی حدود ' + money(res.monthlyTotal) + ' خرج ثابت داری.');
        return L.join('\n');
      }
      return '';
    }
    function hkAsstTipText(t) {
      var m = hkAsstCompact;
      switch (t.id) {
        case 'noIncome': return 'درآمدی ثبت نشده؛ اول درآمدهات رو ثبت کن تا بتونم دقیق‌تر کمکت کنم.';
        case 'overspend': return 'ماهی حدود ' + m(t.diff) + ' بیشتر از درآمدت خرج می‌کنی. اولین قدم اینه که خرج‌های غیرضروری رو شناسایی کنی و سقفی براشون بذاری.';
        case 'debtHeavy': return 'اقساط و وام حدود ' + hkAsstPctText(t.share * 100) + ' از درآمدت رو می‌خوره؛ این زیاده. اگه می‌شه، قسط پرهزینه‌تر رو زودتر تسویه کن یا بازپرداخت رو تمدید کن.';
        case 'topShare': return 'سهم «' + t.cat + '» از خرج‌هات ' + hkAsstPctText(t.share * 100) + 'ه. اگه فقط ۱۰٪ کمش کنی، ماهی حدود ' + m(t.save) + ' صرفه‌جویی می‌شه.';
        case 'rising': return '«' + t.cat + '» ماه آخر ' + (t.pct >= 200 ? 'حدود ' + hkAsstNumFa(1 + t.pct / 100) + ' برابر' : hkAsstPctText(t.pct) + ' بیشتر از') + ' میانگین ماه‌های قبلت شده (حدود ' + m(t.gain) + ' بیشتر)؛ ببین دلیلش یه خرج یک‌باره بوده یا عادت شده.';
        case 'small': return toPersianDigits(String(t.n)) + ' تا خرج ریز (هر کدوم زیر ' + m(t.thr) + ') داشتی که روی هم ' + m(t.sum) + ' شده؛ ریزه‌خرج‌ها بی‌صدا جمع می‌شن، می‌شه بعضی‌هاشون رو حذف کرد.';
        case 'lowSave': return 'نرخ پس‌اندازت حدود ' + hkAsstPctText(t.rate * 100) + 'ه. برای رسیدن به ۲۰٪ باید ماهی حدود ' + m(Math.max(t.need, 0)) + ' بیشتر کنار بذاری؛ بهتره همون اول ماه جدا بشه.';
        case 'bigOne': return 'یه خرج «' + t.desc + '» به‌تنهایی ' + hkAsstPctText(t.share * 100) + ' از هزینه‌های ماه آخرت بوده (' + m(t.amount) + ')؛ این‌جور خرج‌ها رو از قبل برنامه‌ریزی کن.';
        case 'wants': return 'خرج‌های تفریح، پوشاک، هدیه و دیجیتالت ' + hkAsstPctText(t.share * 100) + ' از هزینه‌هاست؛ با ۱۵٪ کم کردنشون ماهی حدود ' + m(t.save) + ' کنار می‌ذاری.';
        case 'goodSave': return 'نرخ پس‌اندازت ' + hkAsstPctText(t.rate * 100) + ' شده که عالیه؛ پیشنهاد می‌کنم یه هدف مشخص (مثلاً صندوق اضطراری سه‌ماهه) براش تعریف کنی.';
        default: return '';
      }
    }

    /* ---------- گفتگوی عادی و احوال‌پرسی (۱.۴.۳۸) ----------
       جواب‌ها از قطعه‌های جدا ساخته می‌شوند و هر بار قطعهٔ تازه‌ای انتخاب می‌شود؛ پس «سلام، چطوری؟» همیشه یک جواب ثابت ندارد.
       تاریخ و ساعت از خود گوشی می‌آید؛ چیزی که دستیار نمی‌داند (هوا، تعطیلی…) را صادقانه می‌گوید. */
    var _hkAsstLastPick = {};
    /* تصادفی، ولی هرگز دو بار پشت‌سرهم یک قطعه */
    function hkAsstRand(key, list) {
      var i = Math.floor(Math.random() * list.length);
      if (list.length > 1 && i === _hkAsstLastPick[key]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
      _hkAsstLastPick[key] = i;
      return list[i];
    }
    function hkAsstNow(offsetDays) {
      var d = new Date(); if (offsetDays) d = new Date(d.getTime() + offsetDays * 86400000);
      var o = { hour: d.getHours(), minute: d.getMinutes(), weekday: '', day: '', month: '', year: '' };
      try {
        var parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(d);
        ['weekday', 'day', 'month', 'year'].forEach(function (k) { var p = parts.filter(function (x) { return x.type === k; })[0]; if (p) o[k] = p.value; });
      } catch (e) {}
      o.time = toPersianDigits((o.hour < 10 ? '0' : '') + o.hour + ':' + (o.minute < 10 ? '0' : '') + o.minute);
      o.pod = o.hour < 5 ? 'دل‌شب' : o.hour < 11 ? 'صبح' : o.hour < 14 ? 'ظهر' : o.hour < 17 ? 'بعدازظهر' : o.hour < 20 ? 'عصر' : 'شب';
      return o;
    }
    var HK_ASST_POD_GREET = {
      'دل‌شب': ['سلام. این وقت شب بیداری؟', 'سلام، شب‌بخیر.'],
      'صبح': ['صبح بخیر.', 'سلام، صبحت بخیر.'],
      'ظهر': ['ظهر بخیر.', 'سلام، ظهرت بخیر.'],
      'بعدازظهر': ['سلام، بعدازظهرت بخیر.', 'سلام. روزت چطور می‌گذره؟'],
      'عصر': ['عصر بخیر.', 'سلام، عصرت بخیر.'],
      'شب': ['شب بخیر.', 'سلام، شبت بخیر.']
    };
    var HK_ASST_HI_OPEN = ['سلام.', 'سلام، خوش اومدی.', 'درود.', 'سلام، در خدمتم.'];
    var HK_ASST_HI_INVITE = ['هر سؤالی دربارهٔ خرج و درآمدت داری بپرس؛ مثلاً «این ماه چقدر خرج کردم؟».', 'بگو چی رو می‌خوای ببینی.', 'از حساب‌کتاب ماه تا پیش‌بینی آخر ماه، هر چی خواستی بپرس.', 'بپرس تا برات حساب کنم.', 'کدوم بخش رو بررسی کنیم؟'];
    var HK_ASST_HRU_OPEN = ['ممنون که پرسیدی.', 'مرسی، خوبم.', 'خوبم، ممنون.', 'سرپام، ممنون.'];
    var HK_ASST_HRU_STATUS = ['آماده‌ام برای حساب‌کتاب.', 'مشکلی نیست، می‌تونیم شروع کنیم.', 'همه‌چیز مرتبه.'];
    var HK_ASST_HRU_INVITE = ['تو چطوری؟', 'تو چطوری؟ بگو چی لازم داری.', 'خب، چی رو بررسی کنیم؟', 'سؤالت چیه؟'];
    var HK_ASST_THX = ['خواهش می‌کنم.', 'قابلی نداشت. سؤال دیگه‌ای هست؟', 'خواهش می‌کنم، هر وقت لازم شد من هستم.', 'خوشحالم که به کارت اومد.', 'خواهش می‌کنم، کاری نکردم.', 'قابل شما رو نداشت.', 'خواهش می‌کنم؛ اگه چیز دیگه‌ای لازم داشتی بگو.', 'نوش جان. سؤال بعدی؟'];
    var HK_ASST_BYE = ['خداحافظ.', 'فعلاً، موفق باشی.', 'خدانگهدار. هر وقت لازم شد برگرد.', 'تا بعد.'];
    var HK_ASST_WHO = ['من دستیار حساب‌کتابم. داده‌های همین نرم‌افزار رو می‌خونم و برات حساب و تحلیل می‌کنم؛ چیزی رو تغییر نمی‌دم.', 'دستیار مالی داخل حساب‌کتابم. خرج و درآمدت رو می‌خونم، گزارش می‌دم و پیشنهاد می‌دم؛ فقط می‌خونم و چیزی رو عوض نمی‌کنم.'];
    var HK_ASST_CHG = ['من فقط داده‌ها رو می‌خونم و تحلیل می‌کنم؛ ثبت، حذف و ویرایش رو باید خودت از داخل نرم‌افزار انجام بدی. اگه بخوای، می‌برمت همون قسمت.', 'تغییر دادن داده‌ها دست من نیست (عمداً، برای امنیت اطلاعاتت). ردیف رو برات پیدا می‌کنم و اگه بخوای به صفحه‌اش هدایتت می‌کنم.'];
    var HK_ASST_TIME = ['ساعت {t} است.', 'الان ساعت {t} است ({pod}).', 'طبق ساعت گوشی، {t} است.', 'ساعت {t} شده.'];
    var HK_ASST_DATE = ['امروز {w} {d} {m} {y} است.', 'تاریخ امروز: {w}، {d} {m} {y}.', 'امروز {d} {m} {y} و روز {w} است.'];
    var HK_ASST_DATE_OFF = ['{lab} {w} {d} {m} {y} است.', '{lab} می‌شه {w}، {d} {m} {y}.', '{lab}: {w} {d} {m} {y}.'];
    var HK_ASST_WDAY = ['امروز {w} است.', 'روز هفته: {w}.', 'امروز {w} است؛ {d} {m}.', '{w}! امروز {d} {m} ماهه.'];
    var HK_ASST_MONTHQ = ['الان ماه {m} هستیم.', 'ماه {m} {y} هستیم.', 'توی ماه {m}ایم؛ {d} {m}.'];
    var HK_ASST_YEARQ = ['سال {y} هستیم.', 'الان سال {y} است.', 'سال {y}؛ {d} {m} ماه.'];
    var HK_ASST_DLEFT = ['تا آخر {m} {n} روز مونده.', '{n} روز دیگه تا پایان {m}.', 'فقط {n} روز تا آخر ماه باقی مونده.', 'حدود {n} روز دیگه ماه تموم می‌شه.'];
    var HK_ASST_DLEFT0 = ['امروز آخر ماهه!', 'امروز آخرین روز ماهه؛ حسابت رو ببند!', 'ماه تموم شد، امروز آخرشه.'];
    var HK_ASST_JOKE = [
      'به حسابدار می‌گن دو به‌علاوهٔ دو چنده؟ می‌گه: شما چقدر می‌خواید؟',
      'پس‌انداز مثل رژیمه؛ همه می‌گن از فردا شروع می‌کنم.',
      'بودجه‌بندی یعنی از قبل بدونی پولت کجا نمی‌ره، بعد ببینی کجا رفته.',
      'قسط مثل مهمون ناخونده‌ست؛ هر ماه بدون خبر قبلی می‌آد.',
      'اول ماه آدم خیال می‌کنه پولداره، آخر ماه می‌فهمه فقط خیال بوده.',
      'حقوق مثل مهمونیه؛ دیر می‌آد و زود می‌ره.',
      'ماشین‌حساب هیچ‌وقت دروغ نمی‌گه؛ فقط خبر بد رو سریع‌تر می‌ده.',
      'دخل و خرج مثل دوست‌ان؛ اگه حواست نباشه یکیشون زورش بیشتر می‌شه.',
      'می‌گن پول خوشبختی نمیاره؛ ولی دعوای سر پول رو که حتماً می‌آره.',
      'ریزه‌خرج‌ها مثل مهمون‌های بی‌صدان؛ آخر ماه صورت‌حسابشون میاد.',
      'تخفیف یعنی خرج کنی که پس‌انداز کرده باشی.'
    ];
    var HK_ASST_ABOUT = {
      age: ['سن ندارم، ولی هر ماه با داده‌های تو یه ماه بزرگ‌تر می‌شم.', 'سنم رو نمی‌دونم؛ همین‌قدر می‌دونم که از اولین ثبتت تا حالا همراهتم.', 'هیچ تولدی ندارم؛ جشنم وقتیه که حساب‌هات جمع می‌آد.'],
      where: ['همین‌جام، داخل برنامه. جای خیلی کمی می‌گیرم.', 'توی گوشی‌ات زندگی می‌کنم؛ بدون خونه و بدون اجاره!', 'همین‌جا کنارت؛ اجاره هم نمی‌دم.'],
      maker: ['داخل همین برنامهٔ حساب‌کتاب ساخته شدم تا به خرج و درآمدت کمک کنم.', 'سازنده‌های برنامه منو کنار حساب‌کتاب گذاشتن تا بتونی راحت‌تر از داده‌هات سؤال کنی.', 'یه تیم برنامه‌نویس منو به حساب‌کتاب اضافه کردن؛ بقیه‌اش با داده‌های خودته.'],
      human: ['آدم نیستم؛ یه دستیار نرم‌افزاری‌ام که حساب‌کتاب بلده.', 'نه، آدم نیستم؛ یه برنامه‌ام ولی دوست دارم مهربون باشم.', 'ربات هم نیستم به معنای قدیمی؛ یه دستیار هوشمندم برای عددهای تو.'],
      gender: ['جنسیت ندارم؛ فقط عدد و حساب دارم.', 'نه دخترم نه پسر؛ دستیارم و بس.', 'همین‌قدر که بتونم کمک کنم کافیه، جنسیتش مهم نیست.'],
      gen: ['من یه دستیار حساب‌کتابم؛ از خودم بیشتر دربارهٔ عددهای تو می‌دونم.', 'دربارهٔ خودم چیز زیادی نیست؛ دربارهٔ خرج‌های تو بیشتر می‌تونم بگم.', 'ساده‌ام: می‌خونم، حساب می‌کنم، توضیح می‌دم.']
    };
    var HK_ASST_LOVE = ['ممنون، لطف داری.', 'مرسی از لطفت؛ خوشحالم که کمکت می‌کنم.', 'ممنونم. هر وقت لازم داشتی من هستم.'];
    var HK_ASST_MOODN = ['متأسفم که حالت خوب نیست. اگه فکر مالی اذیتت می‌کنه، وضعیتت رو با هم بررسی کنیم؛ شاید بهتر از چیزی باشه که فکر می‌کنی.', 'امیدوارم زودتر بهتر بشی. اگه خواستی، یه نگاه به حساب‌هات بندازیم تا نگرانی‌ت کمتر بشه.'];
    var HK_ASST_MOODP = ['خوشحالم. اگه بخوای وضعیت مالی‌ات رو هم نگاه کنیم، بگو.', 'عالیه. می‌خوای حساب‌هات رو هم یه نگاه کنیم؟'];
    var HK_ASST_WEATH = ['به اطلاعات هوا دسترسی ندارم؛ فقط داده‌های مالی‌ات رو می‌بینم.', 'از هوا خبر ندارم چون به اینترنت وصل نیستم. اگه بخوای هزینه‌های این ماه رو بررسی کنیم، بگو.'];
    var HK_ASST_INSULT = ['اگه جوابم درست نبود، بگو چی رو اشتباه فهمیدم تا دقیق‌تر جواب بدم.', 'حق داری که ناراضی باشی. سؤالت رو یه جور دیگه بنویس تا بهتر بفهمم.', 'ببخشید اگه کمکی نکردم. بگو دقیقاً چی می‌خوای.'];
    var HK_ASST_MEAL = ['دربارهٔ غذا نظری ندارم، ولی اگه بخوای بدونی این ماه چقدر خرج خوراکی کردی، بپرس.', 'پیشنهاد غذا کار من نیست؛ اما خرج خوراکی‌ات رو می‌تونم حساب کنم. بپرس «خوراکی چقدر شد؟».'];
    var HK_ASST_HELP_TEXT = 'می‌تونم این کارها رو برات بکنم:\n• حساب‌کتاب: «این ماه چقدر خرج کردم؟»، «بنزین چند تا؟»، «جمع درآمد سال ۴۰۳»\n• پیدا کردن: «بیمه تویوتا را پیدا کن»، «تراکنش‌های بالای ده میلیون»\n• مقایسه و روند: «با ماه قبل مقایسه کن»، «روند هزینه‌هام چطوره؟»\n• تحلیل: «وضعیت مالی‌ام چطوره؟»، «پولم کجا میره؟»، «خرج غیرعادی داشتم؟»\n• پیشنهاد و برنامه: «چطور کمتر خرج کنم؟»، «آخر ماه چقدر خرج می‌کنم؟»، «بودجه پیشنهاد بده»\n• هدف: «برای ۲۰۰ میلیون پس‌انداز چند ماه طول می‌کشه؟»\n• بخش‌های نرم‌افزار: «قرض‌هام چقدره؟»، «دنگ‌هام چطوره؟»، «درآمد ثابتم چقدره؟»، «یادآور دارم؟»\n• راهنما: «چطور درآمد ثبت کنم؟» (توضیح می‌دم و اگه بخوای می‌برمت همون صفحه)\n• و گپ کوتاه: «ساعت چنده؟»، «امروز چندمه؟»';
    function hkAsstFmtV(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
    /* پاسخ گفتگوی عادی. codes برای ترکیب «سلام + حالت چطوره» و text برای فهمیدن نوع پرسش (تاریخ، ساعت، فردا…) */
    function hkAsstChatReply(kind, codes, text) {
      codes = codes || []; text = text || '';
      var n = hkAsstNow(), v = { t: n.time, pod: n.pod, w: n.weekday, d: n.day, m: n.month, y: n.year };
      var withHi = codes.indexOf('HI') >= 0;
      switch (kind) {
        case 'HELP': return HK_ASST_HELP_TEXT;
        case 'WHO': return hkAsstRand('who', HK_ASST_WHO);
        case 'CHG': return hkAsstRand('chg', HK_ASST_CHG);
        case 'THX': return hkAsstRand('thx', HK_ASST_THX);
        case 'BYE': return hkAsstRand('bye', HK_ASST_BYE);
        case 'LOVE': return hkAsstRand('love', HK_ASST_LOVE);
        case 'MOODN': return hkAsstRand('moodn', HK_ASST_MOODN);
        case 'MOODP': return hkAsstRand('moodp', HK_ASST_MOODP);
        case 'WEATH': return hkAsstRand('weath', HK_ASST_WEATH);
        case 'INSULT': return hkAsstRand('insult', HK_ASST_INSULT);
        case 'MEAL': return hkAsstRand('meal', HK_ASST_MEAL);
        case 'JOKE': return hkAsstRand('joke', HK_ASST_JOKE);
        case 'TIME': return hkAsstFmtV(hkAsstRand('time', HK_ASST_TIME), v);
        case 'DLEFT': {
          var t0 = hkAsstToday(), left = Math.max(0, daysInMonth(t0.y, t0.m) - t0.d);
          return left === 0 ? hkAsstRand('dleft0', HK_ASST_DLEFT0) : hkAsstFmtV(hkAsstRand('dleft', HK_ASST_DLEFT), { n: toPersianDigits(String(left)), m: HK_ASST_MONTH_NAMES[t0.m - 1] });
        }
        case 'DATE': {
          var off = /پس ?فردا/.test(text) ? 2 : /فردا/.test(text) ? 1 : /پریروز/.test(text) ? -2 : /دیروز/.test(text) ? -1 : 0;
          if (off) { var no = hkAsstNow(off); return hkAsstFmtV(hkAsstRand('dateoff', HK_ASST_DATE_OFF), { lab: { 2: 'پس‌فردا', 1: 'فردا', '-1': 'دیروز', '-2': 'پریروز' }[off], w: no.weekday, d: no.day, m: no.month, y: no.year }); }
          if (/چه ?روز(ی|یه)|روز هفته|چه روزی از هفته/.test(text) && !/چه ?تاریخ/.test(text)) return hkAsstFmtV(hkAsstRand('wday', HK_ASST_WDAY), v);
          if (/چه ?ماه(ی|یه)/.test(text)) return hkAsstFmtV(hkAsstRand('monthq', HK_ASST_MONTHQ), v);
          if (/چه ?سال(ی|یه)/.test(text)) return hkAsstFmtV(hkAsstRand('yearq', HK_ASST_YEARQ), v);
          return hkAsstFmtV(hkAsstRand('date', HK_ASST_DATE), v);
        }
        case 'ABOUT': {
          var sub = /سال|سن|تولد/.test(text) ? 'age' : /کجا/.test(text) ? 'where' : /ساخت|سازنده/.test(text) ? 'maker' : /آدم|ربات|واقعی/.test(text) ? 'human' : /دختر|پسر|جنس/.test(text) ? 'gender' : 'gen';
          return hkAsstRand('about-' + sub, HK_ASST_ABOUT[sub]);
        }
        case 'HRU': {
          var parts = [];
          parts.push(withHi ? hkAsstRand('hru-hi', HK_ASST_HI_OPEN.concat(HK_ASST_POD_GREET[n.pod] || [])) : hkAsstRand('hru-open', HK_ASST_HRU_OPEN));
          parts.push(hkAsstRand('hru-st', HK_ASST_HRU_STATUS)); parts.push(hkAsstRand('hru-inv', HK_ASST_HRU_INVITE));
          return parts.join(' ');
        }
        default: /* HI */
          return hkAsstRand('hi', HK_ASST_HI_OPEN.concat(HK_ASST_POD_GREET[n.pod] || [])) + ' ' + hkAsstRand('hi-inv', HK_ASST_HI_INVITE);
      }
    }

    /* ---------- تشخیص قصد ---------- */
    var HK_ASST_CHAT_CODES = ['HI', 'THX', 'BYE', 'WHO', 'HELP', 'HRU', 'TIME', 'DATE', 'DLEFT', 'ABOUT', 'JOKE', 'LOVE', 'MOODN', 'MOODP', 'WEATH', 'INSULT', 'MEAL'];
    var HK_ASST_SPECIAL_ORDER = ['GOL', 'BUD', 'DAY', 'FCS', 'ADV', 'ANOM', 'REC', 'TOP', 'TRD', 'OVW'];
    /* کدهای متن را (بدون غلط‌یاب) می‌خواند تا بدانیم سؤال تحلیلی یا گفتگوی عادی است */
    function hkAsstPreCodes(text) {
      var toks = text.split(' '), codes = [], i = 0;
      while (i < toks.length) {
        var matched = false;
        for (var len = 4; len >= 1 && !matched; len--) {
          if (i + len > toks.length) continue;
          var code = hkAsstLookup(hkAsstKey(toks.slice(i, i + len).join(' ')));
          if (code) { codes.push(code); i += len; matched = true; }
        }
        if (!matched) i++;
      }
      return codes;
    }
    /* «تا یک سال دیگه ۱۰۰ میلیون می‌خوام / داشته باشم»: هدف پس‌انداز، حتی بدون واژهٔ «پس‌انداز» */
    var HK_ASST_GOAL_RE = /(تا|طی)\s*(\d+|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|دوازده)\s*(ماه|سال)\s*(دیگه|دیگر|آینده|بعد)|(می‌?خوام|میخوام|لازم دارم|نیاز دارم|داشته باشم)/;
    /* ۱.۴.۴۲: تشخیص «موجودی / پس‌انداز / وضعیت مالی» (با تحمل غلط تایپی)؛ هر کدام فقط همان سؤال را می‌پرسد */
    function hkAsstFinFix(T) {
      var tg = [['موجودی', hkAsstKey('موجودی')], ['پس‌انداز', hkAsstKey('پس‌انداز')], ['وضعیت', hkAsstKey('وضعیت')]];
      return T.split(' ').map(function (t) {
        var k = hkAsstKey(t); if (k.length < 5) return t;
        var base = k.replace(/(هام|ام|م)$/, '');
        for (var i = 0; i < tg.length; i++) if (k !== tg[i][1] && (hkAsstDist(k, tg[i][1], 1) <= 1 || hkAsstDist(base, tg[i][1], 1) <= 1) && base !== tg[i][1]) return tg[i][0];
        return t;
      }).join(' ');
    }
    var HK_ASST_FIN_PAST = /(^| )(آخر ماه|پایان ماه|ماه قبل|ماه پیش|ماه گذشته|پارسال|سال قبل|دیروز|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|ابان|اذر|اسفند|بهمن|دی)( |$)/;
    function hkAsstFinKind(text) {
      var T = hkAsstFinFix(String(text || '').replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim());
      if (!T) return null;
      var PS = /(^| )پس ?انداز/, how = /(چطور(?!ه|ی|م| بود| گذشت| دارم| پیش|$)|چجوری|چگونه|چه جوری|پیشنهاد|راه |ایده|نکته|توصیه|بهتر|کمتر|بیشتر|هدف|نرخ|روند|مقایسه|گزارش|تحلیل|بودجه|برنامه|کنم|بکنم|بکنیم|کنیم|باید|لازمه|لازم|بهتره|بتونم|میتونم|می تونم)/;
      if (PS.test(T) && /(\d|میلیون|میلیارد|ملیارد|هزار)/.test(T)) return null;                  /* «برای ۲۰۰ میلیون پس‌انداز…» = هدف */
      if (how.test(T)) return null;
      var ACC = '(حساب|کارت|بانک)(م|ام|ها|هام| هام| من)?ه?';
      if (new RegExp('بیلانس|(^| )ته ?حساب|مانده( ?ی)? ?(حساب|کارت)|(^| )موجودی(م|ام)?(مو|و)( |$)').test(T) ||
          new RegExp('(^| )(تو|توی|داخل|در) ' + ACC + '( [^ ]+)* (چقد|چقدر|چقدره|چقده|چنده|چند تومن|هست|مونده|پوله|پول)( |$)').test(T) ||
          new RegExp('(^| )' + ACC + '( [^ ]+)* (چقد|چقدر|چقدره|چقده|چنده|چند تومن)( [^ ]+)* (پول|مونده|موجود|دارم|داره|هست)( |$)').test(T) ||
          new RegExp('(چقد|چقدر|چند تومن) پول( [^ ]+)* (تو|توی|داخل) ' + ACC).test(T) ||
          new RegExp('(چقد|چقدر|چقدره|چند تومن)( [^ ]+)? (تو|توی|داخل) ' + ACC + '( [^ ]+)? (دارم|داریم|هست|مونده|داره)( |$)').test(T) ||
          new RegExp('(چقد|چقدر) پول( [^ ]+)* ' + ACC + '( |$)').test(T)) return 'BAL';
      if (/(^| )موجودی(م|ام| من)?( |$)/.test(T) || /(پول(م| من)? (دارم|موجوده|هست)|چقدر پول دارم|چقد پول دارم|حساب(ها|هام|ام|های من| هام)? (چقدر|چقد|چنده|چقدره|چقده))/.test(T)) return 'BAL';
      if (/(^| )(ارز و طلا|طلا و ارز)/.test(T) && /(چقدر|چقد|چنده|چیه|چیا|دارم)/.test(T)) return 'SAVS';
      if (/(^| )(ارز و طلا|طلا و ارز)( ?(م|ام|ها|هام|هامو))?$/.test(T)) return 'SAVS';
      /* دلار/سکه/طلا… به‌عنوان دارایی («چقد دلار دارم»، «ارزش دلارام»)؛ نه وقتی خرید/خرج/فروش گفته شده */
      if (/(^| )(دلار|یورو|سکه|طلا|ارز|درهم|پوند|تتر)( ?(م|ام|ها|هام|هامو|ام))?( |$)/.test(T) && /(دارم|داریم|چقد|چقدر|چندتا|چند تا|چنده|چندتاست|ارزش|می ?ارزه)/.test(T) && !/(خرج|خرید|هزینه|پرداخت|فروش|فروختم|پول دادم|درآمد|واریز|برداشت)/.test(T)) return 'SAVS';
      if (PS.test(T) && /(^| )(دلار|یورو|سکه|طلا|ارز|درهم|پوند|تتر)/.test(T)) return 'SAVS';
      if (PS.test(T)) {
        if (/پس ?انداز(م| ام| من| هام| های من| هامو)?( چقدر| چقد| چنده| چیه| چیا| چی)|(چقدر|چقد) پس ?انداز (دارم|داریم)|پس ?انداز دارم|ارز و طلا|طلا و ارز|پس ?اندازهام|پس ?اندازهای من/.test(T)) return 'SAVS';
        return 'SAVF';
      }
      if (/کنار (گذاشتم|بذارم|بزارم|گذاشتی|بذاری)|(تونستم|تونستی) .*کنار|(ذخیره|سیو) (کردم|کردیم|شد)|(پول|چقد|چقدر) .*(ذخیره|سیو) |(چقد|چقدر) پول .*جمع کردم/.test(T + ' ')) return 'SAVF';
      if (!/(گزارش|تحلیل|کامل|جزئیات|بررسی|نمای کلی|مقایسه|روند)/.test(T) && T.split(' ').length <= 7 &&
          (/(^| )(وضعیت|وضع) ?(مالی|پولی)?( ?(م|ام|من))?( |$)/.test(T) || /از نظر (مالی|پولی|پول)|وضعی دارم|(^| )مالیم( [^ ]+){0,3} (چطور|چیه|چه)|مالی م چطور|حال مالی/.test(T))) return 'STAT';
      if (/(^| )دخل و? ?خرج/.test(T) && /(چطور|چیه|چه)/.test(T) && !/(گزارش|تحلیل|خلاصه|کامل|جزئیات|مقایسه|روند)/.test(T) && T.split(' ').length <= 6) return 'STAT';
      if (/(^| )مالی( |$)/.test(T) && /(خوب|بد|چطور|چیه|چه |پیش|وضع|اوضاع)/.test(T) && !/(تراکنش|هزینه|درآمد|خرج|مخارج|واریز|برداشت|پرداخت|اشتباه|مشکل|ایراد|غلط|بدهی|قرض|وام|کمبود|نصیحت|توصیه|راهنمایی|کمک|بکن)/.test(T) && T.split(' ').length <= 7) return 'STAT';
      return null;
    }
    function hkAsstSpecialKind(codes, text) {
      if (codes.indexOf('DLEFT') >= 0) codes = codes.filter(function (c) { return c !== 'DAY' && c !== 'FCS'; });   /* «چند روز تا آخر ماه مونده؟» گفتگوست، نه بودجه */
      if (codes.indexOf('CHG') >= 0) return 'CHG';
      if (text && HK_ASST_GOAL_RE.test(text) && /(\d+\s*(میلیون|میلیارد|ملیارد|هزار))|((یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|بیست|سی|پنجاه|صد)\s*(میلیون|میلیارد|ملیارد))/.test(text) && codes.indexOf('SRCH') < 0) return 'GOL';
      var fk = hkAsstFinKind(text); if (fk) return fk;
      var hasCmpGrp = codes.indexOf('CMP') >= 0 || codes.indexOf('GRP') >= 0;
      var money = !text || /(\d+\s*(میلیون|میلیارد|ملیارد|هزار))|((یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|بیست|سی|پنجاه|صد)\s*(میلیون|میلیارد|ملیارد|هزار))|\d{6,}/.test(text);
      for (var i = 0; i < HK_ASST_SPECIAL_ORDER.length; i++) {
        var k = HK_ASST_SPECIAL_ORDER[i];
        if (codes.indexOf(k) < 0) continue;
        if (k === 'GOL' && !money) { return 'ADV'; }          /* «چطور پس‌انداز کنم؟» بدون مبلغ: پیشنهاد، نه هدف */
        if (hasCmpGrp && (k === 'TRD' || k === 'OVW' || k === 'TOP')) continue;
        return k;
      }
      return null;
    }
    var HK_ASST_SPECIAL_TOOL = { ADV: 'insights.advice', FCS: 'insights.forecast', BUD: 'insights.budget', GOL: 'insights.goal', DAY: 'insights.daily', ANOM: 'insights.anomaly', REC: 'insights.recurring', TOP: 'insights.top', TRD: 'insights.trend', OVW: 'insights.overview', BAL: 'insights.balance', SAVF: 'insights.savings', SAVS: 'insights.savings', STAT: 'insights.overview' };
    var HK_ASST_FOLLOW = {
      OVW: ['پیشنهاد برای بهتر شدن وضعیتم', 'پولم کجا میره؟', 'آخر ماه چقدر خرج می‌کنم؟'],
      TOP: ['چطور کمتر خرج کنم؟', 'روند هزینه‌هام چطوره؟'],
      TRD: ['وضعیت مالی‌ام چطوره؟', 'چطور کمتر خرج کنم؟'],
      ADV: ['آخر ماه چقدر خرج می‌کنم؟', 'بودجه پیشنهاد بده', 'خرج غیرعادی داشتم؟'],
      FCS: ['امروز چقدر می‌تونم خرج کنم؟', 'بودجه پیشنهاد بده'],
      BUD: ['چطور کمتر خرج کنم؟', 'برای ۱۰۰ میلیون پس‌انداز چند ماه طول می‌کشه؟'],
      GOL: ['بودجه پیشنهاد بده', 'چطور کمتر خرج کنم؟'],
      DAY: ['آخر ماه چقدر خرج می‌کنم؟', 'وضعیت مالی‌ام چطوره؟'],
      ANOM: ['خرج‌های ثابتم کدوما هستن؟', 'چطور کمتر خرج کنم؟'],
      REC: ['خرج غیرعادی داشتم؟', 'چطور کمتر خرج کنم؟']
    };
    /* فرمان نهایی برای یک قصد ویژه؛ args همان آرگومان‌های زمان و دسته‌ای است که تفسیرگر ساخته */
    function hkAsstSpecialCmd(kind, codes, args, text, amts) {
      var chatOnly = HK_ASST_CHAT_CODES.indexOf(kind) >= 0;
      if (kind === 'CHG') return { ask: hkAsstChatReply('CHG'), final: true, understood: '' };
      var a = {};
      ['year', 'month', 'dateFrom', 'context', 'cats', 'project', 'tab'].forEach(function (k) { if (args[k] != null) a[k] = args[k]; });
      if (kind === 'GOL') {
        var big = amts.filter(function (x) { return x.value >= 100000; }).sort(function (x, y) { return y.value - x.value; })[0] || amts.slice().sort(function (x, y) { return y.value - x.value; })[0];
        if (!big || big.value < 1000) return { ask: 'می‌خوای چقدر جمع کنی؟ مثلاً بگو «برای ۲۰۰ میلیون پس‌انداز چند ماه طول می‌کشه؟» یا «تا یک سال دیگه ۱۰۰ میلیون می‌خوام».', final: true, understood: '' };
        var months = 0, mm = /(\d+)\s*(ماه|سال)/.exec(text);
        if (mm && !(+mm[1] >= 1300)) months = (+mm[1]) * (mm[2] === 'سال' ? 12 : 1);
        else { var nm = /(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|دوازده)\s*(ماه|سال)/.exec(text); if (nm) months = (HK_ASST_NUMWORDS[nm[1]] || (nm[1] === 'دوازده' ? 12 : 0)) * (nm[2] === 'سال' ? 12 : 1); }
        return { tool: 'insights.goal', args: { target: big.value, months: months || 0 }, explain: 'goal', understood: '', followUps: HK_ASST_FOLLOW.GOL, chipRaw: true };
      }
      if (kind === 'BAL') {
        var cyr = hkAsstCY(), cmo = hkAsstCM();
        var past = !!(a.dateFrom) || !!(a.year && a.month && !(a.year === cyr && a.month === cmo)) || !!(a.year && !a.month && a.year !== cyr) || HK_ASST_FIN_PAST.test(String(text || '').replace(/\u200c/g, ' ')) && !/(این ماه|ماه جاری|همین ماه)/.test(text || '');
        return { tool: 'insights.balance', args: past ? { past: true } : {}, explain: 'balance', understood: '', followUps: [], chipRaw: true };
      }
      if (kind === 'SAVF' || kind === 'SAVS' || kind === 'STAT') {
        var sa = {}; ['year', 'month', 'dateFrom'].forEach(function (k) { if (a[k] != null) sa[k] = a[k]; });
        /* «پس‌انداز» بی‌هیچ نشانه (ماهانه یا ارز و طلا؟): ماهانه می‌گوییم و اگر چیزی در بخش ارز و طلا ثبت شده، همان را جدا و کوتاه هم می‌آوریم */
        if (kind === 'SAVF' && !/(کردم|کردیم|کرده|شد|شده|بود|داشتم|کنار|ماه|امسال|پارسال|سال|هفته|روز|دارم|ارز|طلا|دلار|سکه|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|ابان|آذر|اذر|دی|بهمن|اسفند)/.test(String(text || '').replace(/\u200c/g, ' ')) && a.month == null && a.year == null && a.dateFrom == null) sa.alt = true;
        if (kind === 'STAT') { sa.short = true; return { tool: 'insights.overview', args: sa, explain: 'ovw', understood: '', followUps: [], chipRaw: true }; }
        sa.mode = kind === 'SAVS' ? 'stock' : 'flow';
        return { tool: 'insights.savings', args: sa, explain: kind.toLowerCase(), understood: '', followUps: [], chipRaw: true };
      }
      var cmd = { tool: HK_ASST_SPECIAL_TOOL[kind], args: a, explain: kind.toLowerCase(), understood: '', followUps: HK_ASST_FOLLOW[kind] || [], chipRaw: true };
      return cmd;
    }
    /* گفتگوی عادی: فقط وقتی هیچ نشانهٔ دادهٔ مالی در جمله نیست. کلمهٔ تنها («ساعت»، «تاریخ») هم گفتگوست */
    var HK_ASST_CHAT_PRI = ['HELP', 'DLEFT', 'TIME', 'DATE', 'WHO', 'JOKE', 'MOODN', 'MOODP', 'LOVE', 'INSULT', 'MEAL', 'WEATH', 'ABOUT', 'THX', 'BYE', 'HRU', 'HI'];
    function hkAsstChatKind(codes, textWords, amts, text) {
      if (text && /^(ساعت|تاریخ|زمان|وقت)( ?(رو|را))?( ?(بگو|بده|چنده))?$/.test(text)) return /^(تاریخ)/.test(text) ? 'DATE' : 'TIME';
      if (textWords.length || amts.length) return null;
      if (codes.indexOf('DLEFT') >= 0) codes = codes.filter(function (c) { return c !== 'DAY' && c !== 'FCS'; });
      var chat = codes.filter(function (c) { return HK_ASST_CHAT_CODES.indexOf(c) >= 0; });
      if (!chat.length || chat.length !== codes.length) return null;
      for (var i = 0; i < HK_ASST_CHAT_PRI.length; i++) if (chat.indexOf(HK_ASST_CHAT_PRI[i]) >= 0) return HK_ASST_CHAT_PRI[i];
      return null;
    }
