    /* ===== ۱.۴.۲۴: دستیار هوشمند — مدیریت درخواست و پاسخ =====
       جریان: متن کاربر → adapter (تبدیل به فرمان) → اعتبارسنجی → hkAsstExec (ابزار خواندنی) → پیام پاسخ.
       تاریخچهٔ مکالمه فقط در حافظهٔ همین نشست است؛ هیچ‌جا ذخیره نمی‌شود. */
    function hkAsstMoney(n) { return toPersianDigits(formatNum(Math.round(Number(n) || 0))) + ' تومان'; }
    function hkAsstNum(n) { return toPersianDigits(String(Math.round(Number(n) || 0))); }
    function hkAsstSummary(tool, res, cmd) {
      if (/^insights\.(ledger|dong|recincome|reminders|row)$/.test(tool)) return hkAsstAppText(tool, res);
      if (tool === 'insights.chart') return hkAsstChartText(res);
      if (/^insights\.(monthavg|share)$/.test(tool)) return hkAsstAppText2(tool, res);
      if (/^insights\./.test(tool)) return hkAsstInsightText(tool, res, cmd);
      if (tool === 'transactions.aggregate') {
        if (cmd.explain === 'count') return 'تعداد تراکنش‌ها: ' + hkAsstNum(res.count) + '.';
        if (cmd.explain === 'avg') return res.count ? 'میانگین هر تراکنش: ' + hkAsstMoney(res.avg) + ' (از ' + hkAsstNum(res.count) + ' تراکنش).' : 'تراکنشی پیدا نشد.';
        if (!res.count) return hkAsstPick(['تراکنشی پیدا نشد.', 'چیزی با این مشخصات پیدا نشد؛ شاید بشه ماه یا کلمه رو عوض کرد.', 'تراکنشی پیدا نشد، دست‌کم با این شرایط.']);
        var t = 'تعداد: ' + hkAsstNum(res.count) + ' تراکنش\nجمع: ' + hkAsstMoney(res.sum);
        if (cmd.args && !cmd.args.tab) t += '\nدرآمد: ' + hkAsstMoney(res.incomeSum) + '\nهزینه: ' + hkAsstMoney(res.expenseSum) + '\nمانده: ' + hkAsstMoney(res.balance);
        return t;
      }
      if (tool === 'transactions.search') {
        if (!res.count) return hkAsstPick(['تراکنشی با این مشخصات پیدا نشد.', 'چیزی با این مشخصات پیدا نشد؛ شاید املای کلمه یا ماه فرق داره.', 'هیچ تراکنشی با این شرایط پیدا نشد.']);
        if (cmd.explain) return (cmd.explain === 'بیشترین' ? 'بیشترین' : 'کمترین') + ' تراکنش:';
        return hkAsstNum(res.count) + ' تراکنش پیدا شد. جمع مبلغ: ' + hkAsstMoney(res.total) + '.';
      }
      if (tool === 'transactions.get') return res.found ? 'جزئیات تراکنش:' : 'این تراکنش پیدا نشد.';
      if (tool === 'projects.list') {
        if (!res.projects.length) return 'هنوز پروژه‌ای ثبت نشده است.';
        return 'پروژه‌ها (' + hkAsstNum(res.projects.length) + '):\n' + res.projects.map(function (p) {
          return '• ' + p.name + ': ' + hkAsstNum(p.count) + ' تراکنش، هزینه ' + hkAsstMoney(p.expenseSum) + '، درآمد ' + hkAsstMoney(p.incomeSum);
        }).join('\n');
      }
      if (tool === 'categories.summary') {
        var t = 'دسته‌های خرج: ' + hkAsstNum(res.total) + ' دسته';
        t += '\nپیش‌فرض: ' + res.builtIn.join('، ');
        if (res.custom.length) t += '\nدلخواه: ' + res.custom.join('، ');
        return t;
      }
      if (tool === 'accounts.list') {
        if (!res.accounts.length) return 'هنوز حسابی در ردیف‌ها ثبت نشده است.';
        return 'حساب‌ها (' + hkAsstNum(res.accounts.length) + '):\n' + res.accounts.map(function (a) { return '• ' + a.name + ' (' + hkAsstNum(a.count) + ' ردیف)'; }).join('\n');
      }
      if (tool === 'months.summary') {
        if (!res.count) return 'هنوز ماهی با ردیف ثبت نشده است.';
        return 'ردیف‌ها در ' + hkAsstNum(res.count) + ' ماه ثبت شده‌اند، از ' + toPersianDigits(res.first[1] + '/' + res.first[0]) + ' تا ' + toPersianDigits(res.last[1] + '/' + res.last[0]) + '.';
      }
      if (tool === 'projects.summary') {
        if (!res.count) return 'برای پروژهٔ «' + res.name + '» تراکنشی ثبت نشده است.';
        return 'پروژهٔ «' + res.name + '»\nتعداد: ' + hkAsstNum(res.count) + ' تراکنش\nهزینه: ' + hkAsstMoney(res.expenseSum) + '\nدرآمد: ' + hkAsstMoney(res.incomeSum) + '\nمانده: ' + hkAsstMoney(res.balance);
      }
      if (tool === 'transactions.group') {
        if (!res.groups.length) return 'تراکنشی برای گروه‌بندی پیدا نشد.';
        var gtxt = 'گروه‌بندی بر اساس ' + ({ month: 'ماه', section: 'دسته', account: 'حساب', tab: 'نوع', context: 'پروژه/شخصی' })[res.by] + ':';
        if (cmd && /^(top|low)group$/.test(cmd.explain || '')) {
          var gl = res.groups.slice().sort(function (x, y) { return cmd.explain === 'topgroup' ? y.sum - x.sum : x.sum - y.sum; })[0];
          var gk = res.by === 'month' ? (function (k) { var q = String(k).split('-'); return HK_ASST_MONTH_NAMES[(+q[1]) - 1] + ' ' + hkAsstNum(+q[0]); })(gl.key) : gl.key;
          return (cmd.explain === 'topgroup' ? 'بیشترین: «' : 'کمترین: «') + gk + '» با ' + hkAsstMoney(gl.sum) + ' (' + hkAsstNum(gl.count) + ' ردیف).\n' + gtxt;
        }
        return gtxt;
      }
      if (tool === 'reports.compare') {
        var ml = function (x) { var p = String(x.label).split('-'); return HK_ASST_MONTH_NAMES[(+p[1]) - 1] ? HK_ASST_MONTH_NAMES[(+p[1]) - 1] + ' ' + hkAsstNum(+p[0]) : x.label; };
        return 'مقایسهٔ ' + ml(res.a) + ' با ' + ml(res.b) + ':\n' +
          'درآمد: ' + hkAsstMoney(res.a.incomeSum) + ' در برابر ' + hkAsstMoney(res.b.incomeSum) + '\n' +
          'هزینه: ' + hkAsstMoney(res.a.expenseSum) + ' در برابر ' + hkAsstMoney(res.b.expenseSum) + hkAsstWhichText(res, cmd);
      }
      return '';
    }
    /* متن «فهمیدم» و غلط‌تایپی‌هایی که اصلاح شد */
    function hkAsstHeader(cmd) {
      var lines = [];
      if (cmd.understood) lines.push(cmd.understood + '.');
      if (cmd.corrections && cmd.corrections.length) {
        lines.push(cmd.corrections.map(function (c) { return '«' + c.from + '» را «' + c.to + '» در نظر گرفتم'; }).join('، ') + '.');
      }
      return lines.join('\n');
    }
    /* ساخت پیام نهایی از یک فرمان اعتبارسنجی‌شده (مشترک بین قاعده‌ای و مدل محلی) */
    function hkAsstFinish(cmd) {
      if (cmd.ask) return { role: 'bot', kind: 'text', text: cmd.ask, suggestions: cmd.suggestions || [], final: !!cmd.final, chipRaw: !!cmd.chipRaw };
      var out = hkAsstExec(cmd.tool, cmd.args);
      if (!out.ok) return { role: 'bot', kind: 'text', text: 'نتوانستم انجام دهم: ' + out.error };
      var summary = hkAsstSummary(cmd.tool, out.result, cmd);
      var head = hkAsstHeader(cmd);
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
        if (!reply || reply.final) return;
        var bad = reply.kind === 'text' || ((reply.tool === 'transactions.search' || reply.tool === 'transactions.aggregate') && reply.data && reply.data.count === 0 && reply.cmd && reply.cmd.args && reply.cmd.args.text);
        if (!bad) return;
        var t = String(q || '').replace(/\d{4,}/g, '#').trim().slice(0, 140); if (!t) return;
        var a = hkAsstMissedList().filter(function (x) { return x !== t; }); a.push(t);
        localStorage.setItem(HK_ASST_MISSED_KEY, JSON.stringify(a.slice(-100)));
      } catch (e) {}
    }
    function hkAsstMissedClear() { try { localStorage.removeItem(HK_ASST_MISSED_KEY); } catch (e) {} }
    /* یک پیام کاربر را پردازش می‌کند؛ خروجی یک پیام دستیار است (بدون تغییر داده). حالت قاعده‌ای، همگام */
    function hkAsstAsk(text) {
      var q = String(text || '').trim();
      if (!q) return { role: 'bot', kind: 'text', text: 'چیزی ننوشتی. مثلاً: «بیمه تویوتا را پیدا کن».' };
      var gs = hkAsstGuideStep(q);
      if (gs) return gs;
      var cmd;
      try { cmd = hkAsstValidateCommand(hkAsstCtxMerge(HK_ASST_ADAPTERS.rules.parse(q))); }
      catch (eP) { return { role: 'bot', kind: 'text', text: 'در خواندن درخواست خطایی پیش آمد.' }; }
      var fr = hkAsstFinish(cmd);
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
