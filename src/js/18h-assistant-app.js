    /* ===== ۱.۴.۳۸: سؤال دربارهٔ بخش‌های نرم‌افزار و خود دستیار =====
       قرض و طلب، دنگ، درآمد ثابت، یادآور، «ردیف N»، مقایسهٔ دو ماه و سؤال‌هایی دربارهٔ خودِ دستیار.
       همه فقط خواندنی‌اند؛ تفسیرگر (hkAsstParse) پیش از حلقهٔ اصلی hkAsstAppIntent را صدا می‌زند. */
    function hkAsstMonthsIn(text) {
      var out = [];
      String(text || '').split(' ').forEach(function (t) {
        var i = HK_ASST_MONTH_NAMES.indexOf(t);
        if (i >= 0) out.push(i + 1);
      });
      return out;
    }
    function hkAsstYearFor(m) { return m > currentMonth ? currentYear - 1 : currentYear; }
    function hkAsstTabIn(text) {
      if (/مخارج|هزینه|خرج|برداشت|پرداخت/.test(text)) return 'expense';
      if (/درآمد|درامد|واریز|دریافت/.test(text)) return 'income';
      return undefined;
    }
    function hkAsstFaDigits(s) { return String(s).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); }
    function hkAsstSameName(a, b) { a = hkAsstKey(a || ''); b = hkAsstKey(b || ''); return !!a && !!b && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0); }

    /* ---- پاسخ‌های ثابت دربارهٔ خود دستیار ---- */
    var HK_ASST_NET = [
      'من برای حساب‌کتاب خودِ نرم‌افزار روی گوشی کار می‌کنم و برای جواب دادن به اینترنت نیازی ندارم؛ داده‌هات هم از گوشی بیرون نمیره. فقط گفتگوی صوتی ممکنه به اینترنت نیاز داشته باشه.',
      'نه، لازم نیست وصل باشم؛ همهٔ حساب‌کتاب‌ها روی خود گوشی انجام میشه و چیزی جایی فرستاده نمیشه. تنها جایی که شاید اینترنت بخواد، حالت صوتیه.',
      'من همین‌جا روی گوشی‌ات کار می‌کنم، بدون اینترنت. اطلاعات مالی‌ات هم از دستگاه بیرون نمیره.'
    ];
    var HK_ASST_HOWTO = [
      'من فقط می‌تونم داده‌هات رو بخونم و حساب کنم؛ ثبت و ویرایش رو باید خودت از صفحه‌های نرم‌افزار انجام بدی. قدم‌به‌قدمش رو توی بخش «راهنما» می‌بینی.',
      'ثبت یا تغییر دادن کار منه نیست، من فقط می‌خونم و تحلیل می‌کنم. از خود نرم‌افزار انجامش بده و اگه جایی گیر کردی بخش «راهنما» مرحله‌به‌مرحله نشونت میده.',
      'این یکی رو باید از خود صفحه‌های نرم‌افزار بزنی، من دستم به نوشتن نمی‌رسه (عمداً، که چیزی خراب نشه). برای آموزشش سری به «راهنما» بزن.'
    ];
    var HK_ASST_NOLEDGER = ['توی دفتر قرض‌وطلبت هنوز چیزی ثبت نشده یا همه‌چیز تسویه شده.', 'قرض یا طلب تسویه‌نشده‌ای پیدا نکردم؛ یا چیزی ثبت نشده یا همه صاف شده.'];
    var HK_ASST_NODONG = ['هنوز گروه دنگی نساختی.', 'دنگی ثبت نشده؛ توی بخش دنگ یه گروه بساز تا برات بخونمش.'];
    var HK_ASST_NOREC = ['هنوز درآمد ثابتی تعریف نکردی.', 'درآمد ثابتی ثبت نشده.'];
    var HK_ASST_NOREM = ['یادآوری برات ثبت نشده.', 'فعلاً هیچ یادآوری‌ای نداری.'];

    /* ---- ابزارها ---- */
    HK_ASST_TOOLS['insights.ledger'] = {
      readOnly: true, args: ['person'],
      run: function (a) {
        var nets = [];
        try { nets = ledgerPairNets() || []; } catch (e) { nets = []; }
        var p = String(a.person || '').trim();
        var list = nets.filter(function (n) { return !p || hkAsstSameName(n.debtor, p) || hkAsstSameName(n.creditor, p); });
        return { person: p, list: list.map(function (n) { return { debtor: n.debtor, creditor: n.creditor, amount: n.amount }; }), all: nets.length };
      }
    };
    HK_ASST_TOOLS['insights.dong'] = {
      readOnly: true, args: [],
      run: function () {
        var d = null; try { d = hkDongLoad(); } catch (e) { d = { groups: [] }; }
        var groups = (d.groups || []).map(function (g) {
          var bal = {}; try { bal = hkDongBalances(g); } catch (e) { bal = {}; }
          var name = {}; g.members.forEach(function (m) { name[m.id] = m.name; });
          var tr = []; try { tr = hkDongTransfers(bal); } catch (e) { tr = []; }
          return { name: g.name || '', members: g.members.length, spent: g.expenses.reduce(function (t, x) { return t + (Number(x.amount) || 0); }, 0),
            transfers: tr.map(function (t) { return { from: name[t.from] || '؟', to: name[t.to] || '؟', amount: t.amount }; }) };
        });
        return { groups: groups };
      }
    };
    HK_ASST_TOOLS['insights.recincome'] = {
      readOnly: true, args: [],
      run: function () {
        var list = (typeof recurringIncomes !== 'undefined' && Array.isArray(recurringIncomes) ? recurringIncomes : []).filter(function (r) { return r && !r.deletedAt; });
        return { items: list.map(function (r) { return { name: String(r.name || ''), amount: Number(r.amount) || 0, day: r.day || null }; }) };
      }
    };
    HK_ASST_TOOLS['insights.reminders'] = {
      readOnly: true, args: [],
      run: function () {
        var list = (typeof userReminders !== 'undefined' && Array.isArray(userReminders) ? userReminders : []);
        return { items: list.filter(function (r) { return r && r.title; }).map(function (r) { return { title: String(r.title), y: r.y, m: r.m, d: r.d, repeat: r.repeat || '' }; })
          .sort(function (x, y) { return ((x.y || 0) * 10000 + (x.m || 0) * 100 + (x.d || 0)) - ((y.y || 0) * 10000 + (y.m || 0) * 100 + (y.d || 0)); }) };
      }
    };
    /* ردیف N ام یک ماه/تب؛ ترتیب همان ترتیب ردیف‌ها در بخش‌ها */
    HK_ASST_TOOLS['insights.row'] = {
      readOnly: true, args: ['n', 'tab', 'year', 'month'],
      run: function (a) {
        var y = a.year || currentYear, m = a.month || currentMonth;
        var rows = hkAsstRows().filter(function (r) { return r.y === y && r.m === m && (!a.tab || r.tab === a.tab) && (r.desc || r.amount); });
        var n = Math.max(1, parseInt(a.n, 10) || 1);
        return { n: n, total: rows.length, y: y, m: m, tab: a.tab || '', row: rows[n - 1] ? hkAsstCompactRow(rows[n - 1]) : null };
      }
    };
    function hkAsstCompactRow(r) { return { desc: r.desc, amount: r.amount, d: r.d, section: r.section, tab: r.tab }; }

    /* ---- متن پاسخ ---- */
    function hkAsstAppText(tool, res) {
      var money = hkAsstMoney, L = [];
      if (tool === 'insights.ledger') {
        if (!res.list.length) return res.person ? hkAsstPick(['با «' + res.person + '» قرض یا طلب تسویه‌نشده‌ای نمی‌بینم.', 'حساب «' + res.person + '» صافه؛ چیزی ازش نیست.']) : hkAsstPick(HK_ASST_NOLEDGER);
        L.push(hkAsstPick(['اینم قرض‌وطلب‌هات:', 'طبق دفتر قرض‌وطلب:']));
        res.list.forEach(function (n) { L.push('• ' + n.debtor + ' به ' + n.creditor + ' ' + money(n.amount) + ' بدهکار است'); });
        return L.join('\n');
      }
      if (tool === 'insights.dong') {
        if (!res.groups.length) return hkAsstPick(HK_ASST_NODONG);
        res.groups.forEach(function (g) {
          L.push('گروه «' + g.name + '» (' + hkAsstNum(g.members) + ' نفر، کل خرج ' + money(g.spent) + '):');
          if (!g.transfers.length) L.push('  • حساب همه صافه');
          g.transfers.forEach(function (t) { L.push('  • ' + t.from + ' باید ' + money(t.amount) + ' به ' + t.to + ' بده'); });
        });
        return L.join('\n');
      }
      if (tool === 'insights.recincome') {
        if (!res.items.length) return hkAsstPick(HK_ASST_NOREC);
        L.push(hkAsstPick(['درآمدهای ثابتت:', 'اینا درآمد ثابتت هستن:']));
        res.items.forEach(function (r) { L.push('• ' + (r.name || 'بدون نام') + ': ' + money(r.amount) + (r.day ? ' (روز ' + hkAsstNum(r.day) + ' هر ماه)' : '')); });
        L.push('جمع ماهانه: ' + money(res.items.reduce(function (t, r) { return t + r.amount; }, 0)));
        return L.join('\n');
      }
      if (tool === 'insights.reminders') {
        if (!res.items.length) return hkAsstPick(HK_ASST_NOREM);
        L.push('یادآورهات (' + hkAsstNum(res.items.length) + ' تا):');
        res.items.slice(0, 15).forEach(function (r) { L.push('• ' + r.title + (r.m && r.d ? ' — ' + hkAsstNum(r.d) + ' ' + HK_ASST_MONTH_NAMES[r.m - 1] : '')); });
        return L.join('\n');
      }
      if (tool === 'insights.row') {
        var lab = (res.tab === 'income' ? 'درآمد ' : res.tab === 'expense' ? 'مخارج ' : '') + HK_ASST_MONTH_NAMES[res.m - 1] + ' ' + hkAsstNum(res.y);
        if (!res.row) return res.total ? 'توی ' + lab + ' فقط ' + hkAsstNum(res.total) + ' ردیف داری؛ ردیف ' + hkAsstNum(res.n) + ' وجود نداره.' : 'برای ' + lab + ' ردیفی ثبت نشده.';
        var r = res.row;
        return 'ردیف ' + hkAsstNum(res.n) + ' ' + lab + ': «' + (r.desc || 'بدون شرح') + '» به مبلغ ' + money(r.amount) + (r.d ? '، روز ' + hkAsstNum(r.d) : '') + (r.section ? '، بخش «' + r.section + '»' : '') + '.';
      }
      return '';
    }

    /* ---- تشخیص قصد ---- */
    function hkAsstAppIntent(text) {
      var T = hkAsstFaDigits(text);
      var fin = function (ask) { return { ask: ask, final: true, understood: '', corrections: [], suggestions: HK_ASST_EXAMPLES_TEXT() }; };
      var tool = function (name, args, follow) { return { tool: name, args: args || {}, explain: name.slice(9), understood: '', followUps: follow || [], chipRaw: true, corrections: [] }; };
      var money = /هزینه|خرج|مخارج|درآمد|درامد|واریز|برداشت|تراکنش|قبض|اسنپ|ماه|ردیف/.test(T);
      /* خودِ دستیار: اینترنت و امنیت داده */
      if (/(^| )(تو|شما|دستیار)( |$)/.test(T) && /اینترنت|آنلاین|آفلاین|وای ?فای|وصل/.test(T) && !/قبض|هزینه|خرج|پرداخت|ثبت/.test(T)) return fin(hkAsstPick(HK_ASST_NET));
      if (/(داده|اطلاعات)(ها|هام|م|های من)?( |$)/.test(T) && /امن|می ?فرست|فرستاده|ارسال|سرور|جایی|لو می|میره/.test(T) && !money) return fin(hkAsstPick(HK_ASST_NET));
      /* آموزش: «چطور ... ثبت کنم؟» */
      var how = /(چطور|چجوری|چگونه|چه جوری|از کجا|کجا|چی کار کنم|چیکار کنم)/.test(T) && /ثبت|اضافه|حذف|ویرایش|تغییر|وارد|پاک|بساز|درست|تعریف|فعال|خروجی|پشتیبان|بگیرم|ببینم|پیدا کنم|تنظیم|عوض/.test(T) && !/ثبت شده|چقدر|چند /.test(T);
      var gi = hkAsstGuideIntent(T, how);
      if (gi) return gi;
      /* مقایسهٔ دو ماه (یا «کدوم بیشتر بوده») */
      var ms = hkAsstMonthsIn(T);
      if (ms.length >= 2 && ms[0] !== ms[1] && /مقایسه|بیشتر|کمتر|فرق|تفاوت|بهتر|یا /.test(T)) {
        var tb = hkAsstTabIn(T);
        var c = tool('reports.compare', { a: { year: hkAsstYearFor(ms[0]), month: ms[0] }, b: { year: hkAsstYearFor(ms[1]), month: ms[1] }, tab: tb });
        c.explain = 'which';
        return c;
      }
      /* ردیف N */
      var rm = /ردیف ?(\d+)/.exec(T);
      if (rm && !/تراکنش|جمع|چند/.test(T)) {
        var rn = { n: +rm[1], tab: hkAsstTabIn(T) };
        if (ms.length) { rn.month = ms[0]; rn.year = hkAsstYearFor(ms[0]); }
        return tool('insights.row', rn);
      }
      var ai2 = hkAsstAppIntent2(T);
      if (ai2) return ai2;
      /* قرض و طلب */
      if (/قرض|بدهی|بدهکار|طلب|طلبکار|وام دادم|قرض دادم|ازم قرض/.test(T) && !/اقساط|وام ?(بانک|مسکن)|دسته/.test(T)) {
        var pm = /(?:به|از|پیش|دایی|عمو|خاله|عمه|آقای|خانم|دوستم)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:چقدر|چند|بدهکار|طلب|قرض|چی|چنده)/.exec(T) || /(?:قرض|بدهی|بدهکار|طلب)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:چقدر|چند|چیه|چنده|رو|را)/.exec(T);
        var person = pm ? pm[1].replace(/^(دایی|عمو|خاله|عمه|آقای|خانم)\s+/, '') : '';
        if (/^(من|ما|کل|همه|کی|کیا|کیه|چقدر|چند|هام|هایم|هایی|ها|ام)$/.test(person) || person.length < 3) person = '';
        var names = [];
        try { names = ledgerPeopleList() || []; } catch (e) { names = []; }
        var hit = names.filter(function (n) { return T.split(' ').some(function (w) { return w.length > 2 && hkAsstSameName(n, w); }); })[0];
        if (hit) person = hit;
        return tool('insights.ledger', person ? { person: person } : {}, ['دنگ‌هام چطوره؟', 'یادآور دارم؟']);
      }
      if (/(^| )دنگ/.test(T)) return tool('insights.dong', {}, ['قرض‌هام چقدره؟']);
      if (/(درآمد|درامد|حقوق|دریافتی).*ثابت|ثابت.*(درآمد|درامد|حقوق|دریافتی)/.test(T)) return tool('insights.recincome', {});
      if (/یادآور|یاداور|یادآوری|یادم بنداز|یادم باشه/.test(T)) return tool('insights.reminders', {});
      return null;
    }
    /* «کدوم بیشتر بوده؟»: جملهٔ نتیجه زیر مقایسه */
    function hkAsstWhichText(res, cmd) {
      if (!cmd || cmd.explain !== 'which') return '';
      var tb = cmd.args && cmd.args.tab, key = tb === 'income' ? 'incomeSum' : 'expenseSum', nm = tb === 'income' ? 'درآمد' : 'هزینه';
      function lab(x) { var p = String(x.label).split('-'); return HK_ASST_MONTH_NAMES[(+p[1]) - 1] || x.label; }
      var A = res.a[key], B = res.b[key];
      if (A === B) return '\nهر دو ماه ' + nm + ' برابره.';
      var hi = A > B ? res.a : res.b, lo = A > B ? res.b : res.a;
      return '\n' + nm + ' ' + lab(hi) + ' بیشتر بوده، ' + hkAsstMoney(Math.abs(A - B)) + ' بیشتر از ' + lab(lo) + '.';
    }

    /* ===== پرسش‌های روزانه و ترتیبی (۱.۴.۳۸): امروز/دیروز/این هفته، آخرین/اولین، کدوم ماه/دسته، میانگین ماهانه، سهم ===== */
    function hkAsstYMD(offsetDays) {
      var d = new Date(Date.now() + (offsetDays || 0) * 86400000), o = { y: currentYear, m: currentMonth, d: 1, wd: (d.getDay() + 1) % 7 };
      try {
        new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).forEach(function (p) {
          if (p.type === 'year') o.y = parseInt(p.value, 10); else if (p.type === 'month') o.m = parseInt(p.value, 10); else if (p.type === 'day') o.d = parseInt(p.value, 10);
        });
      } catch (e) {}
      return o;
    }
    function hkAsstYMDs(o) { return o.y + '-' + o.m + '-' + o.d; }
    HK_ASST_TOOLS['insights.monthavg'] = {
      readOnly: true, args: ['tab'],
      run: function (a) {
        var by = {}, tab = a.tab || 'expense';
        hkAsstRows().forEach(function (r) { if (r.tab !== tab || r.transfer) return; var k = r.y * 100 + r.m; by[k] = (by[k] || 0) + r.amount; });
        var ks = Object.keys(by).filter(function (k) { return by[k] > 0; });
        var sum = ks.reduce(function (t, k) { return t + by[k]; }, 0);
        return { tab: tab, months: ks.length, avg: ks.length ? Math.round(sum / ks.length) : 0, total: sum };
      }
    };
    HK_ASST_TOOLS['insights.share'] = {
      readOnly: true, args: ['text', 'cats', 'project', 'tab', 'context', 'year', 'month', 'dateFrom', 'dateTo'],
      run: function (a) {
        var tab = a.tab || 'expense', all = hkAsstRows();
        var base = { tab: tab, year: a.year, month: a.month, dateFrom: a.dateFrom, dateTo: a.dateTo };
        var tot = hkAsstSum(hkAsstFilter(all, base));
        var part = hkAsstSum(hkAsstFilter(all, Object.assign({}, base, { text: a.text, cats: a.cats, project: a.project, context: a.context })));
        return { tab: tab, total: tot, part: part, share: tot > 0 ? part / tot : 0 };
      }
    };
    function hkAsstAppText2(tool, res) {
      if (tool === 'insights.monthavg') {
        if (!res.months) return 'برای محاسبهٔ میانگین هنوز ماهی با ' + (res.tab === 'income' ? 'درآمد' : 'هزینه') + ' ثبت نشده.';
        return 'میانگین ' + (res.tab === 'income' ? 'درآمد' : 'هزینهٔ') + ' ماهانه‌ات ' + hkAsstMoney(res.avg) + ' است (از ' + hkAsstNum(res.months) + ' ماه).';
      }
      if (tool === 'insights.share') {
        if (!res.total) return 'برای این بازه هنوز چیزی ثبت نشده تا سهمی حساب کنم.';
        var pc = Math.round(res.share * 1000) / 10;
        return 'سهمش ' + hkAsstPctText(pc) + ' از کل ' + (res.tab === 'income' ? 'درآمد' : 'هزینه') + 'هاست (' + hkAsstMoney(res.part) + ' از ' + hkAsstMoney(res.total) + ').';
      }
      return '';
    }
    function hkAsstAppIntent2(T) {
      var tool = function (name, args, explain) { return { tool: name, args: args || {}, explain: explain || '', understood: '', followUps: [], corrections: [] }; };
      var tb = hkAsstTabIn(T);
      var asks = /چقدر|جمع|مجموع|چند|چه ?قدر|حساب/.test(T);
      var canSpend = /می ?تونم|میتونم|مجاز|بتونم|بودجه|باید|پیش ?بینی/.test(T);
      /* امروز / دیروز / پریروز */
      var dm = /(^| )(امروز|دیروز|پریروز)( |$)/.exec(T);
      if (dm && !canSpend && !hkAsstMonthsIn(T).length && (asks || /خرج|هزینه|درآمد|تراکنش|ردیف/.test(T)) && !/قسط|وضعیت|مونده|مانده|چندم|چنده|تاریخ|ساعت|چطور بود/.test(T)) {
        var o = hkAsstYMD({ 'امروز': 0, 'دیروز': -1, 'پریروز': -2 }[dm[2]]), ds = hkAsstYMDs(o);
        var a = { dateFrom: ds, dateTo: ds }; if (tb) a.tab = tb; else if (/خرج|هزینه|مخارج/.test(T)) a.tab = 'expense';
        var cd = asks ? tool('transactions.aggregate', a, 'sum') : tool('transactions.search', Object.assign(a, { sort: 'dateDesc', limit: 20 }));
        cd.understood = (a.tab === 'expense' ? 'هزینه‌های ' : a.tab === 'income' ? 'درآمدهای ' : 'تراکنش‌های ') + dm[2];
        return cd;
      }
      /* این هفته / هفتهٔ پیش (هفته از شنبه) */
      var wm = /(این|همین) هفته|هفته ?(ی|ٔ)? ?(پیش|قبل|گذشته)|هفته ?(پیش|قبل|گذشته)/.exec(T);
      if (wm && !canSpend && (asks || /خرج|هزینه|درآمد|تراکنش/.test(T))) {
        var last = /پیش|قبل|گذشته/.test(wm[0]), now = hkAsstYMD(0), start = hkAsstYMD(-now.wd - (last ? 7 : 0)), end = last ? hkAsstYMD(-now.wd - 1) : now;
        var a2 = { dateFrom: hkAsstYMDs(start), dateTo: hkAsstYMDs(end) }; if (tb) a2.tab = tb; else if (/خرج|هزینه|مخارج/.test(T)) a2.tab = 'expense';
        var cw = asks ? tool('transactions.aggregate', a2, 'sum') : tool('transactions.search', Object.assign(a2, { sort: 'dateDesc', limit: 30 }));
        cw.understood = (a2.tab === 'expense' ? 'هزینه‌های ' : a2.tab === 'income' ? 'درآمدهای ' : 'تراکنش‌های ') + (last ? 'هفتهٔ گذشته' : 'این هفته');
        return cw;
      }
      /* آخرین / اولین */
      var fl = /(آخرین|آخر|اولین|اول)( \d+| [^ ]+ تا| تا)? ?(تراکنش|خرج|هزینه|درآمد|ردیف|واریز|پرداخت|برداشت)/.exec(T);
      var nthN = /(\d+)\s*تا/.exec(T);
      if (fl && !/ماه|سال|هفته/.test(fl[0])) {
        var lim = nthN ? Math.min(30, +nthN[1]) : 1;
        var a3 = { sort: /^(آخر)/.test(fl[1]) ? 'dateDesc' : 'dateAsc', limit: lim }; if (tb) a3.tab = tb;
        return tool('transactions.search', a3, '');
      }
      if (/از کی (دارم )?(استفاده|ثبت)|اولین (بار|ثبت)|کی شروع کردم/.test(T)) return tool('transactions.search', { sort: 'dateAsc', limit: 1 }, '');
      /* کدوم ماه/دسته/حساب/پروژه بیشتر/کمتر */
      var gm = /(کدوم|چه|کدام) (ماه|حساب|کارت|پروژه)/.exec(T);
      if (gm && /بیشتر|کمتر|زیاد|کم|گرون|بیشترین|کمترین|بهتر|بدتر/.test(T)) {
        var by = { 'ماه': 'month', 'حساب': 'account', 'کارت': 'account', 'پروژه': 'context' }[gm[2]];
        var low = /کمتر|کم |کمترین/.test(T + ' ');
        var a4 = { by: by, tab: tb || 'expense' };
        var c4 = tool('transactions.group', a4, low ? 'lowgroup' : 'topgroup');
        return c4;
      }
      /* این ماه با ماه قبل: «خرج این ماهم از ماه قبل بیشتره؟» */
      if (/(این|همین) ماه|ماه جاری/.test(T) && /(ماه (قبل|پیش|گذشته))/.test(T) && /بیشتر|کمتر|یا |بهتر|بدتر/.test(T)) {
        var cm0 = currentMonth, pm0 = cm0 === 1 ? 12 : cm0 - 1, py0 = cm0 === 1 ? currentYear - 1 : currentYear;
        var c5 = tool('reports.compare', { a: { year: currentYear, month: cm0 }, b: { year: py0, month: pm0 }, tab: tb }, 'which');
        return c5;
      }
      /* قسط‌ها: بعدی و مانده */
      if (/قسط/.test(T) && /بعدی|بعد/.test(T) && /کی|کدوم|چقدر/.test(T)) return tool('transactions.search', { cats: ['debt'], status: 'unpaid', sort: 'dateAsc', limit: 1 }, '');
      if (/قسط/.test(T) && /مونده|باقی|مانده/.test(T) && /چند|چقدر/.test(T)) return tool('transactions.aggregate', { cats: ['debt'], status: 'unpaid', tab: 'expense' }, 'count');
      return null;
    }

    /* ===== راهنمای هدایتی (۱.۴.۳۸) =====
       «چطور درآمد ثبت کنم؟» ← توضیح کوتاه + پیشنهاد «ببرمت همون قسمت؟»؛ اگر کاربر موافقت کرد، نرم‌افزار همان صفحه را باز می‌کند.
       دستیار خودش چیزی ثبت یا تغییر نمی‌دهد؛ فقط صفحهٔ مربوط را باز می‌کند. */
    function hkAsstGoPerson(kind) { return function () { openPersonDetail(allPersonTitles()[0], kind); }; }
    var HK_ASST_GUIDES = [
      { id: 'recurring', re: /ثابت|تکراری|هر ماه|ماهانه/, name: 'درآمدهای ثابت', go: function () { openRecurringFromMenu(); },
        text: 'درآمدی که هر ماه تکرار می‌شه (مثل حقوق یا اجاره) رو از «درآمدهای ثابت» تعریف کن؛ مبلغ و روزش رو می‌نویسی و هر ماه ردیفش خودکار ساخته می‌شه.' },
      { id: 'income', re: /درآمد|درامد|واریز|حقوق|دریافتی/, name: 'ثبت درآمد', go: hkAsstGoPerson('income'),
        text: 'برای ثبت درآمد دستی، وارد صفحهٔ درآمد بشو و یه ردیف تازه اضافه کن؛ شرح، مبلغ، روز و حساب رو پر می‌کنی و همون‌جا ذخیره می‌شه.' },
      { id: 'expense', re: /هزینه|خرج|مخارج|برداشت|پرداخت|خرید/, name: 'ثبت هزینه', go: hkAsstGoPerson('expense'),
        text: 'برای ثبت هزینه، وارد صفحهٔ مخارج بشو و یه ردیف تازه اضافه کن؛ شرح، مبلغ، روز و حساب رو می‌نویسی. دسته‌اش هم خودش از روی شرح تشخیص داده می‌شه.' },
      { id: 'ledger', re: /قرض|بدهی|بدهکار|طلب/, name: 'قرض', go: function () { switchTabFromMenu('ledger'); },
        text: 'قرض و طلب‌ها توی بخش «قرض» ثبت می‌شن؛ یه ردیف با اسم فرد، مبلغ و جهتش (بدهکاری یا طلب) اضافه می‌کنی و بعد از تسویه علامتش می‌زنی.' },
      { id: 'dong', re: /دنگ/, name: 'دنگ', go: function () { openDongModal(); },
        text: 'برای تقسیم خرج مشترک، توی بخش «دنگ» یه گروه می‌سازی، نفرات رو اضافه می‌کنی و هر خرج رو با پرداخت‌کننده‌اش می‌نویسی؛ حساب هر نفر خودش درمیاد.' },
      { id: 'savings', re: /پس ?انداز|دارایی|طلا|سکه|سرمایه/, name: 'دارایی و پس‌انداز', go: function () { openSavingsModal(); },
        text: 'دارایی‌هات (مثل طلا یا سکه) رو توی بخش پس‌انداز با مقدار و قیمت خرید ثبت می‌کنی تا ارزش روزشون رو ببینی.' },
      { id: 'reminder', re: /یادآور|یاداور|یادآوری/, name: 'یادآور', go: function () { openUserRemindersModal(); },
        text: 'یادآورها توی بخش «یادآورها» ساخته می‌شن؛ عنوان و تاریخ رو می‌نویسی و می‌تونی تکرارش رو هم تنظیم کنی.' },
      { id: 'project', re: /پروژه/, name: 'پروژه‌ها', go: function () { openSubjectsModal(); },
        text: 'پروژه‌ها از بخش «پروژه‌ها» ساخته می‌شن؛ بعدش می‌تونی هزینه و درآمد هر ردیف رو به یک پروژه وصل کنی.' },
      { id: 'sms', re: /پیامک|اس ?ام ?اس/, name: 'پیامک بانکی', go: function () { openSmsImportModal(); },
        text: 'پیامک‌های بانکی رو از بخش «خواندن پیامک» می‌خونی تا تراکنش‌هاشون پیشنهاد بشه؛ هر کدوم رو خودت تأیید می‌کنی.' },
      { id: 'accounts', re: /کارت|حساب بانکی|بانک|حساب‌ها|حسابها/, name: 'حساب‌های بانکی', go: function () { openBankAccountsModal(); },
        text: 'حساب‌ها و کارت‌ها توی بخش «حساب‌های بانکی» اضافه و ویرایش می‌شن.' },
      { id: 'backup', re: /پشتیبان|بکاپ|بازیابی|ذخیره/, name: 'پشتیبان', go: function () { askBackupParts(); },
        text: 'برای پشتیبان‌گیری از داده‌ها از «پشتیبان‌گیری» توی منو استفاده کن؛ فایلش رو نگه دار و هر وقت خواستی با «بازیابی» برش گردون.' },
      { id: 'export', re: /خروجی|اکسل|پی ?دی ?اف|pdf/i, name: 'خروجی', go: function () { askExport(); },
        text: 'خروجی گرفتن (اکسل یا PDF) از «خروجی» توی منوئه؛ بازه و نوع داده رو انتخاب می‌کنی.' },
      { id: 'stats', re: /آمار|نمودار|گزارش/, name: 'آمار', go: function () { openStatsSheet(); },
        text: 'نمودارها و آمار هزینه و درآمد توی بخش «آمار» هستن.' },
      { id: 'security', re: /رمز|قفل|پین|اثر انگشت|امنیت/, name: 'امنیت', go: function () { openSecurityModal(); },
        text: 'رمز و قفل برنامه رو از بخش «امنیت» تنظیم می‌کنی.' },
      { id: 'trash', re: /سطل|حذف شده|پاک شده/, name: 'سطل بازیافت', go: function () { openTrashModal(); },
        text: 'ردیف‌های حذف‌شده توی «سطل بازیافت» می‌مونن و از همون‌جا برمی‌گردن.' },
      { id: 'prefs', re: /تنظیمات|تم|ظاهر|حالت شب/, name: 'تنظیمات', go: function () { closeSideMenu(); openPrefsModal(); },
        text: 'ظاهر و رفتار برنامه رو از «تنظیمات» عوض می‌کنی.' }
    ];
    var HK_ASST_HELPGUIDE = { id: 'help', name: 'راهنما', go: function () { openHelpModal(); }, text: '' };
    var _hkAsstGuide = null;
    function hkAsstGuideFor(T) {
      for (var i = 0; i < HK_ASST_GUIDES.length; i++) if (HK_ASST_GUIDES[i].re.test(T)) return HK_ASST_GUIDES[i];
      return null;
    }
    function hkAsstGuideGo(g) {
      try { if (typeof _hkVoice !== 'undefined' && _hkVoice.on) hkAsstVoiceClose(); } catch (e0) {}
      try { hkAsstClose(); } catch (e1) {}
      setTimeout(function () { try { g.go(); } catch (e2) { try { showToast('نتوانستم این بخش را باز کنم.'); } catch (e3) {} } }, 280);
    }
    var HK_ASST_YES = /^(آره|اره|بله|آری|اوکی|اوکیه|اوکی|باشه|باش|حتما|حتماً|حتمن|برو|ببر|ببرم|ببرش|بریم|برو دیگه|بزن|بله ببر|آره ببر|اره ببر|خب|خوبه|اوکی ببر|باشه ببر|ok|yes|بفرما|لطفا|لطفاً|لطفا ببر|آره لطفا)( .*)?$/i;
    var HK_ASST_NO = /^(نه|نخیر|نه ممنون|نه مرسی|نمی ?خوام|نمیخوام|بیخیال|لازم نیست|ولش کن|فعلا نه|فعلاً نه|no)( .*)?$/i;
    /* پاسخ به «آره/نه» بعد از پیشنهاد هدایت؛ خروجی null یعنی ربطی نداشت */
    function hkAsstGuideStep(q) {
      var g = _hkAsstGuide; if (!g) return null;
      _hkAsstGuide = null;
      var T = hkAsstNorm(q).replace(/[،,؟?!.؛]/g, ' ').replace(/\s+/g, ' ').trim();
      if (HK_ASST_YES.test(T)) {
        hkAsstGuideGo(g);
        return { role: 'bot', kind: 'text', text: hkAsstPick(['باشه، «' + g.name + '» رو باز می‌کنم.', 'حله، می‌برمت به «' + g.name + '».']), final: true, suggestions: [] };
      }
      if (HK_ASST_NO.test(T)) return { role: 'bot', kind: 'text', text: hkAsstPick(['باشه. اگه سؤال دیگه‌ای داشتی بپرس.', 'اشکالی نداره؛ هر وقت خواستی بگو.']), final: true, suggestions: [] };
      return null;
    }
    /* سؤال آموزشی یا درخواست رفتن به یک بخش: خروجی فرمان ask/final با پیشنهاد هدایت */
    function hkAsstGuideIntent(T, how) {
      var g = hkAsstGuideFor(T);
      var nav = /(^| )(برو|ببر|ببرم|باز کن|بازش کن|هدایت|منو ببر|ببرمت)( |$)/.test(T);
      if (!how && !(nav && g)) return null;
      if (nav && g && !how) { hkAsstGuideGo(g); return { ask: hkAsstPick(['باشه، «' + g.name + '» رو باز می‌کنم.', 'حله، «' + g.name + '» باز می‌شه.']), final: true, understood: '', corrections: [], suggestions: [] }; }
      if (!g) { _hkAsstGuide = HK_ASST_HELPGUIDE; return { ask: hkAsstPick(HK_ASST_HOWTO) + '\nمی‌خوای راهنما رو برات باز کنم؟', final: true, understood: '', corrections: [], suggestions: ['آره، باز کن', 'نه، ممنون'], chipRaw: true }; }
      _hkAsstGuide = g;
      return { ask: g.text + '\nمی‌خوای ببرمت به «' + g.name + '»؟', final: true, understood: '', corrections: [], suggestions: ['آره، ببر', 'نه، ممنون'], chipRaw: true };
    }
