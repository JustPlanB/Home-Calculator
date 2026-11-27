    /* ===== ۱.۴.۲۴: دستیار هوشمند — مدیریت درخواست و پاسخ =====
       جریان: متن کاربر → adapter (تبدیل به فرمان) → اعتبارسنجی → hkAsstExec (ابزار خواندنی) → پیام پاسخ.
       تاریخچهٔ مکالمه فقط در حافظهٔ همین نشست است؛ هیچ‌جا ذخیره نمی‌شود. */
    function hkAsstMoney(n) { return toPersianDigits(formatNum(Math.round(Number(n) || 0))) + ' تومان'; }
    function hkAsstNum(n) { return toPersianDigits(String(Math.round(Number(n) || 0))); }
    /* ۱.۴.۴۲: خطوط تکمیلی فقط وقتی مرتبط‌اند؛ هر کدام کوتاه */
    function hkAsstAggExtra(res, cmd) {
      var a = (cmd && cmd.args) || {}, out = { inc: '', basis: '' };
      if (res.incomplete > 0) out.inc = hkAsstNum(res.incomplete) + ' ردیف ناقص (بدون مبلغ) شمرده نشد.';
      var plain = !(a.text || (a.textAny && a.textAny.length) || (a.excludeText && a.excludeText.length) || (a.excludeCats && a.excludeCats.length) || (a.cats && a.cats.length) || a.project || a.account || a.context || a.status || a.transferOnly || a.amountEq != null || a.amountMin != null || a.amountMax != null || a.dateFrom);
      /* عدد کارت فقط برای ماه باز است؛ برای ماه‌های دیگر مبنا (همهٔ ردیف‌ها) در همان جمله می‌آید، نه جمله‌ای جدا */
      if (!res.card && (a.tab === 'expense' || a.tab === 'income') && a.year && a.month && plain) out.basis = ' (طبق همهٔ ردیف‌ها)';
      return out;
    }
    /* برداشت از درخواست (بدون کلمهٔ نوع عملیات) برای جملهٔ اصلیِ پاسخ؛ برداشت و فرض‌ها یک بار و در همان جمله گفته می‌شود */
    function hkAsstQual(cmd) {
      var u = (cmd && cmd.understood) || '';
      if (!u) { try { u = hkAsstUnderstood((cmd && (cmd.intent || cmd.explain)) || 'sum', (cmd && cmd.args) || {}); } catch (e) { u = ''; } }
      return String(u).replace(/^(جمع|تعداد|میانگین|بیشترین|کمترین|جست‌وجو|مقایسه|گروه‌بندی)(،\s*|$)/, '').trim();
    }
    /* ۱.۴.۴۴: وقتی واژه هم نام ردیف و هم نمایندهٔ دسته است، عدد پیش‌فرض دسته می‌ماند؛ این خط می‌گوید کل دسته است و اگر با همان فیلترها قابل‌محاسبه باشد، خوانش «فقط ردیف‌ها» را هم می‌دهد */
    function hkAsstAmbNote(cmd, res) {
      try {
        var am = cmd && cmd.catAmb, a = (cmd && cmd.args) || {};
        if (!am || !a.cats || a.cats.indexOf(am.id) < 0 || a.cats.length !== 1 || a.text) return '';
        var a2 = Object.assign({}, a); delete a2.cats; a2.text = am.word;
        var o2 = hkAsstExec('transactions.aggregate', a2);
        if (!o2.ok) return '';
        var r2 = o2.result, lb = HK_ASST_CAT_LABELS[am.id] || am.id;
        if (r2.count === res.count && r2.sum === res.sum) return '';
        if (!r2.count) return 'این عدد کل دستهٔ «' + lb + '» است؛ در این بازه ردیفی با نام «' + am.word + '» نیست.';
        return 'این عدد کل دستهٔ «' + lb + '» است، نه فقط ردیف‌های «' + am.word + '». فقط ردیف‌های «' + am.word + '»: ' + hkAsstMoney(r2.sum) + ' (' + hkAsstNum(r2.count) + ' تراکنش).';
      } catch (e) { return ''; }
    }
    /* ۱.۴.۴۵: فهرست «و/یا»: سهم هر مورد جدا حساب می‌شود؛ اگر جمع سهم‌ها با اجتماع برابر بود تفکیک نشان داده می‌شود، وگرنه می‌گوید ردیف مشترک یک بار شمرده شده */
    function hkAsstUnionNote(cmd, res) {
      try {
        var a = (cmd && cmd.args) || {};
        if (!a.textAny || !a.textAny.length || cmd.tool !== 'transactions.aggregate') return '';
        var parts = [], sumC = 0, sumS = 0, items = [];
        a.textAny.forEach(function (w) { items.push({ lb: w, extra: { text: w } }); });
        if (a.unionCats && a.cats) a.cats.forEach(function (c) { items.push({ lb: 'دستهٔ ' + (HK_ASST_CAT_LABELS[c] || c), extra: { cats: [c] } }); });
        items.forEach(function (it) {
          var a2 = Object.assign({}, a); delete a2.textAny; delete a2.unionCats; delete a2.cats; delete a2.text;
          Object.keys(it.extra).forEach(function (k) { a2[k] = it.extra[k]; });
          var o = hkAsstExec('transactions.aggregate', a2);
          if (o.ok) { sumC += o.result.count; sumS += o.result.sum; parts.push(it.lb + ' ' + hkAsstMoney(o.result.sum)); }
        });
        if (parts.length !== items.length) return '';
        if (sumC === res.count && sumS === res.sum) return 'تفکیک: ' + parts.join(' + ') + '.';
        return 'تفکیک: ' + parts.join('، ') + ' (ردیف‌های مشترک فقط یک بار شمرده شدند).';
      } catch (e) { return ''; }
    }
    function hkAsstSummary(tool, res, cmd) {
      if (/^insights\.(ledger|dong|recincome|reminders|row)$/.test(tool)) return hkAsstAppText(tool, res);
      if (tool === 'insights.chart') return hkAsstChartText(res);
      if (/^insights\.(monthavg|share)$/.test(tool)) return hkAsstAppText2(tool, res);
      if (/^insights\./.test(tool)) return hkAsstInsightText(tool, res, cmd);
      if (tool === 'transactions.aggregate') {
        var ex = hkAsstAggExtra(res, cmd), q = hkAsstQual(cmd), lead = q ? q + ': ' : '';
        if (!res.count) {
          /* ۱.۴.۴۳: شرط‌ها همه شناخته‌شده‌اند و واقعاً ردیفی نیست؛ پس «ثبت نشده» (نه «نفهمیدم» و نه «پیدا نکردم») */
          return 'برای این شرط تراکنشی ثبت نشده است.' + (ex.inc ? ' ' + ex.inc : '');
        }
        /* ۱.۴.۴۲: جملهٔ اصلی = برداشت + عدد، یک بار؛ بعد حداکثر یک خط توضیح که فقط جمله‌های لازم را دارد */
        var more = ex.inc ? ' ' + ex.inc : '';
        var ambC = hkAsstAmbNote(cmd, res) || hkAsstUnionNote(cmd, res); if (ambC) more += '\n' + ambC;
        if (cmd.explain === 'count') return lead + hkAsstNum(res.count) + ' تراکنش.' + more;
        if (cmd.explain === 'avg') return lead + 'میانگین هر تراکنش ' + hkAsstMoney(res.avg) + ' (از ' + hkAsstNum(res.count) + ' تراکنش).' + more;
        var t, notes = [];
        if (res.card) {
          /* «خرج/درآمد من» = عدد کارت اصلی (پرداخت‌شده + پرداخت‌نشده)؛ پرداخت‌نشده جدا؛ تفاوت با همهٔ ردیف‌ها فقط اگر واقعی است */
          var isE = cmd.args.tab === 'expense';
          t = lead.replace(/:\s*$/, '') + ' — طبق کارت اصلی: ' + hkAsstMoney(res.card.total) + ' (' + hkAsstNum(res.count) + ' تراکنش).';
          if (res.card.unpaid > 0) notes.push(hkAsstMoney(res.card.unpaid) + ' از این ' + (isE ? 'پرداخت‌نشده' : 'دریافت‌نشده') + ' است.');
          if (res.card.allTotal !== res.card.total) {
            var why = [];
            if (res.card.projectRows) why.push(hkAsstNum(res.card.projectRows) + ' ردیف پروژه‌ای');
            if (res.card.otherSectionRows) why.push(hkAsstNum(res.card.otherSectionRows) + ' ردیف بخش‌های دیگر');
            notes.push('جمع همهٔ ردیف‌ها ' + hkAsstMoney(res.card.allTotal) + ' است' + (why.length ? ' (' + why.join(' و ') + ')' : '') + '.');
          }
        } else {
          /* ۱.۴.۴۶: بدون «نوع»، جمع ردیف‌های درآمد و هزینه با هم عددی بی‌معناست؛ فقط وقتی هر دو طرف مبلغ دارند سه خط درآمد/هزینه/مانده تنها می‌آید */
          var mixed = !!(cmd.args && !cmd.args.tab && res.incomeSum > 0 && res.expenseSum > 0);
          t = mixed ? lead.replace(/:\s*$/, '') + ' (' + hkAsstNum(res.count) + ' تراکنش)' + ex.basis + '.' : lead + hkAsstMoney(res.sum) + ' (' + hkAsstNum(res.count) + ' تراکنش)' + ex.basis + '.';
          if (cmd.args && !cmd.args.tab) t += '\nدرآمد: ' + hkAsstMoney(res.incomeSum) + '\nهزینه: ' + hkAsstMoney(res.expenseSum) + '\nمانده: ' + hkAsstMoney(res.balance);
          var up = cmd.args && cmd.args.tab === 'expense' ? res.unpaidExpense : cmd.args && cmd.args.tab === 'income' ? res.unpaidIncome : 0;
          if (up > 0) notes.push(hkAsstMoney(up) + ' از این ' + (cmd.args.tab === 'expense' ? 'پرداخت‌نشده' : 'دریافت‌نشده') + ' است.');
        }
        if (ambC) notes.push(ambC);
        if (ex.inc) notes.push(ex.inc);
        return notes.length ? t + '\n' + notes.join(' ') : t;
      }
      if (tool === 'transactions.search') {
        /* ۱.۴.۴۶: شرط‌های شناخته‌شده و واقعاً بی‌نتیجه (غیر از جست‌وجوی صریح «پیدا کن/سرچ») همان پیام جمع را می‌گیرد: «ثبت نشده» */
        if (!res.count) { var knownZero = false; try { knownZero = !!(cmd.args && (cmd.args.text || cmd.args.textAny || cmd.args.cats || cmd.args.excludeText)) && !hkAsstUnknownTerms(cmd, false).length && !/(سرچ|پیدا|بگرد|جستجو|جست‌وجو|دنبال)/.test(cmd.rawQ || ''); } catch (eK) {} if (knownZero) return 'برای این شرط تراکنشی ثبت نشده است.' + (res.incomplete > 0 ? ' ' + hkAsstNum(res.incomplete) + ' ردیف ناقص (بدون مبلغ) شمرده نشد.' : ''); }
        if (!res.count) return hkAsstPick(['تراکنشی با این مشخصات پیدا نکردم.', 'چیزی پیدا نکردم؛ شاید املای کلمه یا ماه فرق داره.', 'هیچ تراکنشی با این شرایط پیدا نکردم.']);
        if (cmd.explain) return cmd.explain === 'بیشترین' ? hkAsstPick(['اینم بیشترین‌ها:', 'بیشترین‌ها اینان:']) : hkAsstPick(['اینم کمترین‌ها:', 'کمترین‌ها اینان:']);
        return hkAsstNum(res.count) + ' تا تراکنش پیدا کردم؛ جمع مبلغشون ' + hkAsstMoney(res.total) + ' شده.' + (res.incomplete > 0 ? '\n' + hkAsstNum(res.incomplete) + ' ردیف ناقص (بدون مبلغ) شمرده نشد.' : '');
      }
      if (tool === 'transactions.get') return res.found ? 'اینم جزئیاتش:' : 'این تراکنش رو پیدا نکردم.';
      if (tool === 'projects.list') {
        if (!res.projects.length) return 'هنوز پروژه‌ای ثبت نشده.';
        return hkAsstNum(res.projects.length) + ' تا پروژه داری:\n' + res.projects.map(function (p) {
          return '• ' + p.name + ': ' + hkAsstNum(p.count) + ' تراکنش، هزینه ' + hkAsstMoney(p.expenseSum) + '، درآمد ' + hkAsstMoney(p.incomeSum);
        }).join('\n');
      }
      if (tool === 'categories.summary') {
        var t = hkAsstNum(res.total) + ' تا دستهٔ خرج داری.';
        t += '\nپیش‌فرض: ' + res.builtIn.join('، ');
        if (res.custom.length) t += '\nدلخواه: ' + res.custom.join('، ');
        return t;
      }
      if (tool === 'accounts.list') {
        if (!res.accounts.length) return 'هنوز حسابی توی ردیف‌ها ثبت نشده.';
        return hkAsstNum(res.accounts.length) + ' تا حساب داری:\n' + res.accounts.map(function (a) { return '• ' + a.name + ' (' + hkAsstNum(a.count) + ' ردیف)'; }).join('\n');
      }
      if (tool === 'months.summary') {
        if (!res.count) return 'هنوز ماهی با ردیف ثبت نشده.';
        return 'ردیف‌ها توی ' + hkAsstNum(res.count) + ' ماه ثبت شده، از ' + toPersianDigits(res.first[1] + '/' + res.first[0]) + ' تا ' + toPersianDigits(res.last[1] + '/' + res.last[0]) + '.';
      }
      if (tool === 'projects.summary') {
        if (!res.count) return 'برای پروژهٔ «' + res.name + '» هنوز تراکنشی ثبت نشده.';
        return 'پروژهٔ «' + res.name + '»: ' + hkAsstNum(res.count) + ' تا تراکنش\nهزینه: ' + hkAsstMoney(res.expenseSum) + '\nدرآمد: ' + hkAsstMoney(res.incomeSum) + '\nمانده: ' + hkAsstMoney(res.balance);
      }
      if (tool === 'transactions.group') {
        if (!res.groups.length) return 'تراکنشی برای گروه‌بندی پیدا نکردم.';
        var gtxt = 'اینم به تفکیک ' + ({ month: 'ماه', section: 'بخش', category: 'دسته', account: 'حساب', tab: 'نوع', context: 'پروژه/شخصی' })[res.by] + ':';
        if (cmd && /^(top|low)group$/.test(cmd.explain || '')) {
          var gl = res.groups.slice().sort(function (x, y) { return cmd.explain === 'topgroup' ? y.sum - x.sum : x.sum - y.sum; })[0];
          var gk = res.by === 'month' ? (function (k) { var q = String(k).split('-'); return HK_ASST_MONTH_NAMES[(+q[1]) - 1] + ' ' + hkAsstNum(+q[0]); })(gl.key) : gl.key;
          return (cmd.explain === 'topgroup' ? 'بیشترینش «' : 'کمترینش «') + gk + '» بوده، با ' + hkAsstMoney(gl.sum) + ' (' + hkAsstNum(gl.count) + ' ردیف).\n' + gtxt;
        }
        return gtxt;
      }
      if (tool === 'reports.compare') {
        var ml = function (x) { var p = String(x.label).split('-'); return HK_ASST_MONTH_NAMES[(+p[1]) - 1] ? HK_ASST_MONTH_NAMES[(+p[1]) - 1] + ' ' + hkAsstNum(+p[0]) : x.label; };
        /* ۱.۴.۴۶: وقتی نوع مشخص است (خرج/درآمد) جواب مستقیم و فقط همان نوع؛ «بیشتر/کمتر» را صریح می‌گوید */
        var ctab = cmd && cmd.args && cmd.args.tab, rq = String((cmd && cmd.rawQ) || '');
        if (ctab === 'expense' || ctab === 'income') {
          var va = ctab === 'income' ? res.a.incomeSum : res.a.expenseSum, vb = ctab === 'income' ? res.b.incomeSum : res.b.expenseSum, nm = ctab === 'income' ? 'درآمدت' : 'خرجت', diff = va - vb;
          var yn = /بیشتر/.test(rq) ? (diff > 0 ? 'بله، ' : diff < 0 ? 'نه، ' : '') : /کمتر/.test(rq) ? (diff < 0 ? 'بله، ' : diff > 0 ? 'نه، ' : '') : '';
          var lead = diff === 0 ? 'هر دو ماه ' + nm + ' برابر است: ' + hkAsstMoney(va) + '.' : yn + nm + ' در ' + ml(res.a) + ' ' + hkAsstMoney(Math.abs(diff)) + (diff > 0 ? ' بیشتر' : ' کمتر') + ' از ' + ml(res.b) + ' بوده.';
          return lead + '\n' + ml(res.a) + ': ' + hkAsstMoney(va) + '\n' + ml(res.b) + ': ' + hkAsstMoney(vb);
        }
        return 'مقایسهٔ ' + ml(res.a) + ' با ' + ml(res.b) + ':\n' +
          'درآمد: ' + hkAsstMoney(res.a.incomeSum) + ' در برابر ' + hkAsstMoney(res.b.incomeSum) + '\n' +
          'هزینه: ' + hkAsstMoney(res.a.expenseSum) + ' در برابر ' + hkAsstMoney(res.b.expenseSum) + hkAsstWhichText(res, cmd);
      }
      return '';
    }
    /* متن «فهمیدم» و غلط‌تایپی‌هایی که اصلاح شد */
    function hkAsstHeader(cmd, understoodInBody) {
      var lines = [];
      if (cmd.understood && !understoodInBody) lines.push(cmd.understood + '.');
      if (cmd.corrections && cmd.corrections.length) {
        lines.push(cmd.corrections.map(function (c) { return '«' + c.from + '» را «' + c.to + '» در نظر گرفتم'; }).join('، ') + '.');
      }
      return lines.join('\n');
    }
    /* ساخت پیام نهایی از یک فرمان اعتبارسنجی‌شده (مشترک بین قاعده‌ای و مدل محلی) */
    /* ۱.۴.۴۳: واژهٔ ناشناخته یا اصلاحِ حدسیِ نام ماه: عدد نمی‌دهیم؛ فقط همان ابهام را کوتاه می‌پرسیم (چیپ‌ها خودِ سؤالِ کامل با واژهٔ پیشنهادی‌اند) */
    function hkAsstRepl(rawQ, term, to) {
      var toks = String(rawQ || '').split(' '), tk = String(term || '').split(' ').map(function (x) { return hkAsstKey(x); }), n = tk.length;
      var clean = function (t) { return hkAsstKey(String(t).replace(/[،,؟?!.]+$/g, '')); };
      for (var i = 0; i + n <= toks.length; i++) {
        var ok = true; for (var j = 0; j < n; j++) if (clean(toks[i + j]) !== tk[j]) { ok = false; break; }
        if (ok) { var tail = (toks[i + n - 1].match(/[،,؟?!.]+$/) || [''])[0]; toks.splice(i, n, to + tail); return toks.join(' '); }
      }
      return String(rawQ || '');
    }
    function hkAsstGuard(cmd) {
      var rawQ = cmd.rawQ || '';
      /* فیلتر اجتماع (و/یا) فقط روی جمع/جست‌وجو/گروه تراکنش‌ها اجرا می‌شود؛ ابزار دیگر آن را بی‌صدا نادیده می‌گرفت */
      if (cmd.args && cmd.args.textAny && !/^transactions\.(aggregate|search|group)$/.test(cmd.tool || '')) return { role: 'bot', kind: 'text', text: 'ترکیب «و/یا» رو فقط برای جمع و جست‌وجوی تراکنش‌ها می‌تونم دقیق حساب کنم؛ هر مورد رو جدا بپرس.', suggestions: [], final: true, decision: 'ask' };
      /* «آذرم»، «آبانت»: پسوند ملکی روی نام درستِ ماه است، نه حدس */
      var clit = function (w) { var b = String(w || '').replace(/(مون|تون|شون|م|ت|ش)$/, ''); try { var c0 = hkAsstLookup(hkAsstKey(b)); return !!(c0 && c0.indexOf('MONTH_') === 0); } catch (e) { return false; } };
      var mf = (cmd.corrections || []).filter(function (c) { try { if (clit(c.from)) return false; var code = hkAsstLookup(hkAsstKey(c.to)); return code && code.indexOf('MONTH_') === 0; } catch (e) { return false; } })[0];
      if (mf) {
        var mcode = hkAsstLookup(hkAsstKey(mf.to)) || '', mname = HK_ASST_MONTH_NAMES[(parseInt(mcode.slice(6), 10) || 1) - 1];
        var fixed = hkAsstRepl(rawQ, mf.from, mname);
        return { role: 'bot', kind: 'text', text: '«' + mf.from + '» رو «' + mname + '» (نام ماه) فرض کنم؟ مطمئن نیستم درست فهمیده باشم.', suggestions: fixed && fixed !== rawQ ? [fixed] : [], chipRaw: true, final: true, decision: 'ask', unknown: [mf.from] };
      }
      /* جست‌وجوی صریح («سرچ/پیدا کن») یا چند واژهٔ خالی بی‌هیچ فیلتر و عملیات («بیمه تویتا»): «پیدا نکردم» پاسخ درست است؛ یک واژهٔ تنها یا واژه + «چقدر/جمع/فقط…» جست‌وجو حساب نمی‌شود */
      var onlyText = cmd.tool === 'transactions.search' && Object.keys(cmd.args || {}).every(function (k) { return k === 'text' || k === 'sort' || k === 'limit'; }) && String(cmd.args.text || '').split(/\s+/).length >= 2;
      var explicit = /(سرچ|پیدا|بگرد|جستجو|جست‌وجو|دنبال)/.test(rawQ) || onlyText;
      var unk = [];
      try { unk = hkAsstUnknownTerms(cmd, explicit); } catch (e2) { unk = []; }
      if (!unk.length) return null;
      /* صفت اندازه بی مرز مبلغ («خرجای کوچیک»): سؤال روشن با چیپ‌های مرز؛ نه «این اسم نیست» */
      if (unk.length === 1 && hkAsstIsDegree(hkAsstKey(unk[0]))) {
        var big = /^(درشت|سنگین|بزرگ|کلان|گنده)$/.test(unk[0]);
        var bounds = big ? ['بالای ۲۰۰ هزار تومن', 'بالای ۵۰۰ هزار تومن', 'بالای ۱ میلیون تومن'] : ['زیر ۱۰ هزار تومن', 'زیر ۵۰ هزار تومن', 'زیر ۱۰۰ هزار تومن'];
        var dchips = bounds.map(function (b) { return hkAsstRepl(rawQ, unk[0], b); }).filter(function (x) { return x && x !== rawQ; });
        return { role: 'bot', kind: 'text', text: '«' + unk[0] + '» یعنی چه مبلغی؟ یک مرز بگو (مثلاً «' + bounds[1] + '») تا همان را اعمال کنم.', suggestions: dchips, chipRaw: true, final: true, decision: 'ask', unknown: [unk[0]] };
      }
      var inEx = (cmd.args.excludeText || []).join(' ').indexOf(unk[0]) >= 0;
      var near = [];
      try { near = hkAsstSuggest(unk[0]) || []; } catch (e3) {}
      var phrase = unk.join(' ');
      var chips = near.map(function (n) { return hkAsstRepl(rawQ, phrase, n); }).filter(function (x) { return x && x !== rawQ; }).slice(0, 3);
      var txt = inEx ? 'نمی‌دونم «' + phrase + '» رو کجای ردیف‌ها، دسته‌ها یا پروژه‌هات پیدا کنم تا کنارش بذارم. منظورت چیه؟' : 'منظورت از «' + phrase + '» چیه؟ این اسم توی ردیف‌ها، دسته‌ها، پروژه‌ها و حساب‌هات نیست.';
      return { role: 'bot', kind: 'text', text: txt, suggestions: chips, chipRaw: true, final: true, decision: 'ask', unknown: [phrase] };
    }
    function hkAsstFinish(cmd) {
      if (cmd.ask) return { role: 'bot', kind: 'text', text: cmd.ask, suggestions: cmd.suggestions || [], final: !!cmd.final, chipRaw: !!cmd.chipRaw, decision: cmd.decision || '' };
      var gd = hkAsstGuard(cmd); if (gd) return gd;
      var out = hkAsstExec(cmd.tool, cmd.args);
      if (!out.ok) return { role: 'bot', kind: 'text', text: 'نشد انجامش بدم: ' + out.error };
      var summary = hkAsstSummary(cmd.tool, out.result, cmd);
      var head = hkAsstHeader(cmd, cmd.tool === 'transactions.aggregate' && out.result && out.result.count > 0);
      var msg = { role: 'bot', kind: 'result', tool: cmd.tool, head: head, text: (head ? head + '\n' : '') + summary, data: out.result, cmd: cmd, suggestions: [] };
      /* پیشنهاد گام بعدی برای پاسخ‌های تحلیلی؛ کلیک روی آن‌ها همان متن را می‌فرستد */
      if (cmd.followUps && cmd.followUps.length) { msg.suggestions = cmd.followUps; msg.chipRaw = true; }
      var empty = (cmd.tool === 'transactions.search' && out.result.count === 0) || (cmd.tool === 'transactions.aggregate' && out.result.count === 0);
      if (empty && cmd.args && cmd.args.text) {
        try { msg.suggestions = hkAsstSuggest(cmd.args.text); } catch (eS) { msg.suggestions = []; }
      }
      return msg;
    }
    /* ۱.۴.۳۸: سؤال‌هایی که دستیار نفهمید (فقط متن سؤال، روی همین گوشی؛ تا کاربر خودش نفرستد جایی نمی‌رود) */
    var HK_ASST_MISSED_KEY = STORAGE_KEY + '_asstMissed';
    function hkAsstMissedList() { try { var a = JSON.parse(localStorage.getItem(HK_ASST_MISSED_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hkAsstMissedLog(q, reply) {
      try {
        if (!reply || (reply.final && !(reply.unknown && reply.unknown.length))) return;
        var bad = reply.kind === 'text' || ((reply.tool === 'transactions.search' || reply.tool === 'transactions.aggregate') && reply.data && reply.data.count === 0 && reply.cmd && reply.cmd.args && reply.cmd.args.text);
        if (!bad) return;
        var t = String(q || '').replace(/\d{4,}/g, '#').trim().slice(0, 140); if (!t) return;
        var a = hkAsstMissedList().filter(function (x) { return x !== t; }); a.push(t);
        localStorage.setItem(HK_ASST_MISSED_KEY, JSON.stringify(a.slice(-100)));
      } catch (e) {}
    }
    function hkAsstMissedAdd(t) {
      try { t = String(t || '').replace(/\d{4,}/g, '#').trim().slice(0, 140); if (!t) return; var a = hkAsstMissedList().filter(function (x) { return x !== t; }); a.push(t); localStorage.setItem(HK_ASST_MISSED_KEY, JSON.stringify(a.slice(-100))); } catch (e) {}
    }
    function hkAsstMissedClear() { try { localStorage.removeItem(HK_ASST_MISSED_KEY); } catch (e) {} }
    var _hkAsstPending = null;
    function hkAsstPendingRewrite(q) {
      var P = _hkAsstPending; if (!P) return '';
      if (Date.now() - P.at > 600000) { _hkAsstPending = null; return ''; }
      var rep = String(q || '').replace(/[؟?!.]+$/g, '').replace(/^(نه|نخیر|یعنی)[\s،]*/, '').replace(/^(منظورم|منظور من)\s*/, '').replace(/\s*(بود|هست|است)$/, '').trim();
      if (!rep || rep.split(/\s+/).length > 3) return '';
      /* پاسخ مبلغ («زیر ۵۰ هزار») به پرسش دربارهٔ صفت اندازه («کوچیک»): همان صفت با این مرز عوض می‌شود */
      try {
        if (hkAsstIsDegree(hkAsstKey(P.term)) && hkAsstAmountAt(hkAsstNorm(rep)).length && (HK_ASST_GT_RE.test(rep) || HK_ASST_LT_RE.test(rep) || /بین/.test(rep))) {
          var o2 = hkAsstRepl(P.q, P.term, rep); _hkAsstPending = null; return o2 && o2 !== P.q ? o2 : '';
        }
      } catch (eD) {}
      /* اگر خودش یک دستور/سؤال مستقل است («سلام»، «موجودی»، «این ماه چقدر خرج کردم») پاسخِ واژه حساب نمی‌شود */
      var pr; try { pr = hkAsstSemantic(rep); } catch (e) { return ''; }
      if (!pr || !pr.__frame || pr.intentCode) return '';
      /* پاسخِ واژه فقط یک «موجودیت» است (کلمه/دسته/پروژه)؛ اگر زمان، نوع، مبلغ یا وضعیت دارد سؤال تازه است («ماه قبل چی؟») */
      if (Object.keys(pr.args || {}).some(function (k) { return ['text', 'textAny', 'unionCats', 'cats', 'project', 'context'].indexOf(k) < 0; })) return '';
      var out = hkAsstRepl(P.q, P.term, rep);
      _hkAsstPending = null;
      return out && out !== P.q ? out : '';
    }
    /* یک پیام کاربر را پردازش می‌کند؛ خروجی یک پیام دستیار است (بدون تغییر داده). حالت قاعده‌ای، همگام */
    function hkAsstAsk(text, engine) {
      var q = String(text || '').trim();
      if (!q) return { role: 'bot', kind: 'text', text: 'چیزی ننوشتی. مثلاً: «بیمه تویوتا را پیدا کن».' };
      var gs = hkAsstGuideStep(q);
      if (gs) return gs;
      /* ۱.۴.۴۵: موتور چهارمرحله‌ای (تحلیل ← تطبیق ← محاسبه ← پاسخ) پیش‌فرض است؛ جز در سؤال‌های گفتگو/ناوبری/عملیات که همان مسیر قبلی اجرایشان می‌کند.
         بازگشت به موتور قبلی: hkAsstSetEngine('legacy') (کلید داخلی، در رابط دیده نمی‌شود). */
      if ((engine || hkAsstEngine()) === 'chain') { var cr = hkAsstAskChain(q); if (cr) return cr; }
      return hkAsstAskLegacy(q);
    }
    /* مسیر قبلی دستیار (بی‌تغییر): پس از مرحلهٔ راهنمای گام‌به‌گام */
    function hkAsstAskLegacy(q) {
      /* پاسخ کوتاهِ کاربر به یک پرسش روشن‌کننده («بنزین»، «منظورم قبض بود»): واژهٔ ناشناخته با همین پاسخ عوض می‌شود و سؤال اصلی دوباره اجرا می‌شود */
      var rep = hkAsstPendingRewrite(q); if (rep) q = rep;
      var cmd;
      try { cmd = hkAsstValidateCommand(hkAsstCtxMerge(HK_ASST_ADAPTERS.rules.parse(q))); cmd.rawQ = q; }
      catch (eP) { return { role: 'bot', kind: 'text', text: 'در خواندن درخواست خطایی پیش آمد.' }; }
      var fr = hkAsstFinish(cmd);
      _hkAsstPending = (fr && fr.unknown && fr.unknown.length) ? { q: q, term: fr.unknown[0], at: Date.now() } : null;
      hkAsstCtxSave(cmd, fr); hkAsstSetTarget(fr);
      hkAsstMissedLog(q, fr);
      return fr;
    }
    /* حالت مدل محلی (۱.۴.۳۶): اول قاعده‌ای، همگام و فوری. اگر قاعده‌ای فهمید و چیزی پیدا کرد، همان پاسخ داده می‌شود و منتظر مدل
       نمی‌مانیم (مدل کوچک روی گوشی چند ثانیه طول می‌کشد). فقط وقتی قاعده‌ای نفهمید («دقیق‌تر بگو») یا چیزی پیدا نکرد
       (مثلاً کلمهٔ ناشناخته را جست‌وجوی متنی کرده) از مدل کمک گرفته می‌شود؛ اگر مدل هم نتوانست یا نتیجه‌اش خالی بود،
       همان پاسخ قاعده‌ای می‌ماند. */
    function hkAsstNeedsModel(r) {
      if (!r || r.final) return false;                /* گفتگوی عادی و درخواست تغییر: مدل لازم نیست */
      return r.kind === 'text';                         /* ۱.۴.۳۸: مدل هرگز جواب قاعده‌ها را عوض نمی‌کند */
    }
    function hkAsstAskAsync(text) {
      var q = String(text || '').trim();
      var first = hkAsstAsk(q);
      var ad = HK_ASST_ADAPTERS.local;
      if (!q || !ad.ready() || !hkAsstNeedsModel(first)) return Promise.resolve(first);
      return ad.parseAsync(q).then(function (cmd) {
        var v = hkAsstValidateCommand(cmd);
        if (v.tool && !v.understood) v.understood = 'مدل محلی: ' + (v.explain || v.tool);
        var m = hkAsstFinish(v);
        /* مدل هم چیزی پیدا نکرد: پاسخ قاعده‌ای (که کلمه‌ها را فهمیده) بهتر است */
        if (first.kind === 'result' && m.kind === 'result' && m.data && m.data.count === 0) return first;
        return m;
      }, function () { return first; });
    }
    /* برای کلمه‌ای که نتیجه نداد، کلمه‌های نزدیک از داده را پیشنهاد می‌کند */
    function hkAsstSuggest(text) {
      var data = hkAsstDataWords(), out = [];
      String(text).split(' ').forEach(function (w) {
        var k = hkAsstKey(w);
        if (k.length < 3) return;
        var n = hkAsstNearest(k, data, 3);
        if (n && out.indexOf(n.word) < 0) out.push(n.word);
      });
      return out.slice(0, 3);
    }
