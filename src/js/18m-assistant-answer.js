    /* ===== ۱.۴.۴۵ (مرحلهٔ ۴): محاسبهٔ قطعی و تولید پاسخ طبیعی فارسی =====
       ورودی: فقط خروجی hkAsstMatch (مرحلهٔ ۳). متن خام دوباره تحلیل نمی‌شود.
       دو لایهٔ جدا:
         hkAsstCompute(match)  → اعداد: فقط از ردیف‌های تأییدشدهٔ match.selection (با مرجع) یا ابزار خواندنیِ موجود برای تحلیل‌ها؛ هیچ تولید متنی ندارد.
         hkAsstRender(match, calc) → متن فارسی از روی همان اعداد؛ هر عددی که در متن می‌آید از واژهٔ ثبت‌شده می‌گذرد و hkAsstAnswerCheck آن را می‌سنجد.
       hkAsstChain(text, state) = متن ← hkAsstAnalyze ← hkAsstMatch ← محاسبه ← پاسخ (هنوز به مسیر اصلی دستیار وصل نیست).
       اصل‌ها: بدون API/مدل؛ بدون قابلیت مالی تازه؛ درآمد و هزینه هیچ‌گاه در یک جمع نمی‌آیند؛ ردیف بی‌مبلغ شمرده نمی‌شود و گزارش می‌شود. */
    var HK_ASST_ANSWER_VERSION = 1;
    /* ---------- لایهٔ ۱: محاسبهٔ قطعی ---------- */
    function hkAsstCalcStats(rows) {
      var o = { count: 0, sum: 0, avg: 0, min: null, max: null, incomeSum: 0, expenseSum: 0, incomeCount: 0, expenseCount: 0, unpaidCount: 0, unpaidSum: 0 };
      rows.forEach(function (r) {
        o.count++; o.sum += r.amount;
        if (r.tab === 'income') { o.incomeSum += r.amount; o.incomeCount++; } else { o.expenseSum += r.amount; o.expenseCount++; }
        if (r.status === 'unpaid') { o.unpaidCount++; o.unpaidSum += r.amount; }
        if (o.min === null || r.amount < o.min) o.min = r.amount;
        if (o.max === null || r.amount > o.max) o.max = r.amount;
      });
      o.avg = o.count ? Math.round(o.sum / o.count) : 0;
      o.balance = o.incomeSum - o.expenseSum;
      return o;
    }
    function hkAsstCalcRowView(r) { return { id: r.id, tab: r.tab, y: r.y, m: r.m, d: r.d, desc: r.desc, amount: r.amount, status: r.status, section: r.section, account: r.account, context: r.context }; }
    function hkAsstCalcOp(ex) {
      var i = ex.intent, k = ex.result_kind;
      if (ex.group_by || ex.tool === 'transactions.group') return 'group';
      if (i === 'max' || i === 'min') return i;
      if (i === 'average' || k === 'avg') return 'avg';
      if (i === 'count' || k === 'count') return 'count';
      if (i === 'list_rows' || k === 'rows' || ex.tool === 'transactions.search') return 'list';
      return 'sum';
    }
    function hkAsstCompute(match) {
      var C = { v: HK_ASST_ANSWER_VERSION, ok: false, kind: 'none', reason: '', op: null, tab: null, stats: null, incomplete: 0, rows: [], groups: null, alternatives: [], extremes: null, mixed: false, card: null, tool_result: null, numbers_backed_by: null };
      if (!match || match.stage !== 3) { C.reason = 'bad_match'; return C; }
      if (match.status !== 'ready' || !match.exec) { C.reason = 'not_ready:' + match.status; return C; }
      var ex = match.exec, sel = match.selection || {};
      if (!/^transactions\.(aggregate|search|group)$/.test(ex.tool)) {
        /* تحلیل‌ها/مقایسه/فهرست‌ها: همان ابزار خواندنیِ موجود (بدون ابزار یا فرمول تازه) */
        var o = hkAsstExec(ex.tool, ex.args || {});
        if (!o.ok) { C.reason = 'tool_error'; C.error = o.error; return C; }
        C.ok = true; C.kind = 'tool'; C.op = 'tool'; C.tool_result = o.result; C.numbers_backed_by = 'existing_tool'; return C;
      }
      var all = hkAsstRows(), byKey = {};
      all.forEach(function (r) { byKey[hkAsstMatchRefKey(r)] = r; });
      var resolve = function (refs) { var out = []; for (var i = 0; i < refs.length; i++) { var r = byKey[hkAsstMatchRefKey({ key: refs[i].key, secId: refs[i].sec, idx: refs[i].idx, tab: refs[i].tab, id: refs[i].id })]; if (!r) return null; out.push(r); } return out; };
      var rows = resolve(sel.refs || []), inc = resolve(sel.incomplete_refs || []);
      if (!rows || !inc) { C.reason = 'ref_missing'; return C; }
      if (rows.some(function (r) { return r.amount === 0; })) { C.reason = 'zero_amount_in_selection'; return C; }
      var tab = (ex.args && ex.args.tab) || null;
      C.ok = true; C.kind = 'tx'; C.op = hkAsstCalcOp(ex); C.tab = tab; C.incomplete = inc.length; C.numbers_backed_by = 'selected_rows';
      C.stats = hkAsstCalcStats(rows);
      C.mixed = !tab && C.stats.incomeCount > 0 && C.stats.expenseCount > 0;
      C.eff = tab || (C.stats.count ? (C.stats.incomeCount === 0 ? 'expense' : C.stats.expenseCount === 0 ? 'income' : null) : null);
      C.ops = (ex.operations || []).filter(function (x) { return /^(sum|count|average|avg)$/.test(x); });
      C.rows_all = rows.length;
      if (C.op === 'max' || C.op === 'min' || C.op === 'list') {
        var asc = C.op === 'min' || (ex.order && ex.order.sort === 'amountAsc'), srt = ex.order && ex.order.sort;
        var cmp = function (x, y) { return srt === 'dateAsc' ? x.dateKey - y.dateKey : srt === 'dateDesc' ? y.dateKey - x.dateKey : asc ? x.amount - y.amount || y.dateKey - x.dateKey : y.amount - x.amount || y.dateKey - x.dateKey; };
        var lim = ex.order && ex.order.limit > 0 ? Math.max(1, parseInt(ex.order.limit, 10) || 1) : (C.op === 'list' ? 10 : 1);
        var groupsT = C.mixed ? ['expense', 'income'] : [null];
        C.extremes = [];
        groupsT.forEach(function (tb) {
          var part = rows.filter(function (r) { return !tb || r.tab === tb; }); if (!part.length) return;
          var sorted = part.slice().sort(cmp), shown = sorted.slice(0, lim), ties = 0, isTies = false;
          if ((C.op === 'max' || C.op === 'min') && !(ex.order && ex.order.limit > 1)) { var top = sorted[0].amount; shown = sorted.filter(function (r) { return r.amount === top; }); ties = shown.length; isTies = ties > 1; shown = shown.slice(0, 10); }
          C.extremes.push({ tab: tb || (tab || sorted[0].tab), ties: isTies, rows: shown.map(hkAsstCalcRowView), more: Math.max(0, (ties || part.length) - shown.length), total_in_tab: part.length });
        });
        C.rows = [].concat.apply([], C.extremes.map(function (e) { return e.rows; }));
      }
      if (C.op === 'group') {
        var by = (ex.args && ex.args.by) || ex.group_by || null, gm = {};
        if (['month', 'section', 'account', 'tab', 'context', 'category'].indexOf(by) < 0) { C.ok = false; C.reason = 'bad_group_by'; return C; }
        rows.forEach(function (r) {
          var k = by === 'month' ? (r.y + '-' + (r.m < 10 ? '0' : '') + r.m) : (by === 'tab' ? r.tab : by === 'category' ? (r.tab === 'income' ? 'income' : hkAsstCatOf(r)) : (r[by] || '—'));
          var g = gm[k] || (gm[k] = { key: k, rows: [] }); g.rows.push(r);
        });
        C.by = by; C.groups = Object.keys(gm).map(function (k) { var s = hkAsstCalcStats(gm[k].rows); return { key: k, count: s.count, sum: s.sum, incomeSum: s.incomeSum, expenseSum: s.expenseSum, mixed: s.incomeCount > 0 && s.expenseCount > 0 }; });
        C.groups.sort(function (x, y) { return by === 'month' ? (x.key < y.key ? -1 : 1) : y.sum - x.sum; });
      }
      /* ترکیب «و/یا»: سهم هر مورد جدا از همان ردیف‌های انتخاب‌شده (همان تفکیک قبلی دستیار) */
      if (ex.args && ex.args.textAny && ex.args.textAny.length && rows.length) {
        C.union = ex.args.textAny.map(function (w) { var sub = hkAsstFilter(rows, { text: w, keepDrafts: true }); var st2 = hkAsstCalcStats(sub); return { term: w, count: st2.count, sum: st2.sum }; });
        C.union_overlap = C.union.reduce(function (n, u) { return n + u.count; }, 0) > rows.length;
      }
      /* خوانش‌های جایگزین (همان ردیف‌های مرحلهٔ ۳؛ فقط محاسبه) */
      (match.readings && match.readings.alternatives || []).forEach(function (al) {
        var ar = resolve(al.refs || []); if (!ar) return;
        var s = hkAsstCalcStats(ar); C.alternatives.push({ word: al.word, category: al.category, count: s.count, sum: s.sum, incomeSum: s.incomeSum, expenseSum: s.expenseSum, mixed: s.incomeCount > 0 && s.expenseCount > 0 });
      });
      try { C.card = hkAsstCardInfo(ex.args || {}, { expenseSum: C.stats.expenseSum, incomeSum: C.stats.incomeSum }, rows); } catch (eC) { C.card = null; }
      /* ۱.۴.۴۶: توضیح طبیعی از همان داده‌های واقعی: سهم بزرگ‌ترین دسته و مقایسه با ماه قبل (فقط برای جمع ساده بدون شرط اضافه) */
      try {
        var ea = ex.args || {};
        var plain = C.op === 'sum' && tab === 'expense' && !C.mixed && rows.length >= 3 && !ea.cats && !ea.text && !ea.textAny && !ea.excludeText && !ea.excludeCats && !ea.status && !ea.project && !ea.account && ea.amountEq == null && ea.amountMin == null && ea.amountMax == null && ea.amountGt == null && ea.amountLt == null;
        if (plain) {
          var ct = hkAsstCatTotals(rows);
          if (ct.list.length >= 2 && ct.total > 0) C.catTop = { label: ct.list[0].label, share: Math.round(ct.list[0].share * 100), sum: ct.list[0].sum };
          if (ea.month && ea.year && !ea.dateFrom && !ea.dateTo) {
            var pmm = ea.month - 1, pyy = ea.year; if (pmm < 1) { pmm = 12; pyy--; }
            var pr = hkAsstFilter(hkAsstRows(), { tab: 'expense', year: pyy, month: pmm, context: ea.context });
            if (pr.length) C.prev = { y: pyy, m: pmm, sum: hkAsstSum(pr), count: pr.length, partial: ea.year === hkAsstCY() && ea.month === hkAsstCM() };
          }
        }
      } catch (eIn) {}
      return C;
    }
    /* ---------- لایهٔ ۲: تولید پاسخ ---------- */
    function hkAsstAnsDigits(s) { return String(s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }); }
    function hkAsstAnsTimeLabel(a) {
      a = a || {};
      /* ۱.۴.۴۶: بازهٔ ماه‌های کامل را با نام ماه می‌گوید («از مهر تا آذر ۱۴۰۵») نه با تاریخ خام */
      if (a.dateFrom && a.dateTo) {
        var pd = function (s) { var p = String(s).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }, df = pd(a.dateFrom), dt = pd(a.dateTo), MN = HK_ASST_MONTH_NAMES, fy = function (y) { return toPersianDigits(String(y)); };
        if (df.y && df.m && dt.y && dt.m && df.d === 1 && dt.d >= 28) {
          if (df.m === 1 && df.y === dt.y) return 'از ابتدای سال ' + fy(df.y) + ' تا ' + MN[dt.m - 1];
          if (df.y === dt.y) return 'از ' + MN[df.m - 1] + ' تا ' + MN[dt.m - 1] + ' ' + fy(dt.y);
          return 'از ' + MN[df.m - 1] + ' ' + fy(df.y) + ' تا ' + MN[dt.m - 1] + ' ' + fy(dt.y);
        }
      }
      if (a.dateFrom && a.dateTo) {
        var pd2 = function (s) { var p = String(s).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }, d1 = pd2(a.dateFrom), d2 = pd2(a.dateTo), fd = function (x, withY) { return toPersianDigits(String(x.d)) + ' ' + HK_ASST_MONTH_NAMES[x.m - 1] + (withY ? ' ' + toPersianDigits(String(x.y)) : ''); };
        if (d1.y && d1.m && d1.d && d2.y && d2.m && d2.d) {
          if (a.dateFrom === a.dateTo) return 'در ' + fd(d1, true);
          return 'از ' + fd(d1, d1.y !== d2.y) + ' تا ' + fd(d2, true);
        }
      }
      if (a.dateFrom || a.dateTo) { var f = function (d) { return d ? toPersianDigits(String(d)) : ''; }; return 'از ' + (f(a.dateFrom) || 'ابتدا') + ' تا ' + (f(a.dateTo) || 'انتها'); }
      if (a.month) return 'در ' + HK_ASST_MONTH_NAMES[a.month - 1] + (a.year ? ' ' + toPersianDigits(String(a.year)) : '');
      if (a.year) return 'در سال ' + toPersianDigits(String(a.year));
      return 'در همهٔ ماه‌ها';
    }
    var HK_ASST_STATUS_FA = { unpaid: 'پرداخت‌نشده/دریافت‌نشده', paid: 'پرداخت‌شده/دریافت‌شده' };
    function hkAsstRender(match, calc) {
      var out = { v: HK_ASST_ANSWER_VERSION, stage: 4, status: 'answer', kind: 'text', text: '', notes: [], suggestions: [], figures: {}, applied: [], disclosed: [], gaps: [], warnings: [], app_actions: [], source: { match_status: match && match.status, tool: match && match.exec ? match.exec.tool : null, numbers_backed_by: calc ? calc.numbers_backed_by : null }, trace: [] };
      var allow = {}, T = function (s, d) { out.trace.push({ step: s, detail: d }); };
      var reg = function (n) { allow[String(Math.round(Number(n)))] = 1; return n; };
      var N = function (n) { reg(n); return toPersianDigits(String(Math.round(Number(n) || 0))); };
      var M = function (n) { reg(n); return hkAsstMoney(n); };
      var scan = function (s) { (hkAsstAnsDigits(s).match(/\d+/g) || []).forEach(function (d) { allow[String(parseInt(d, 10))] = 1; }); return s; };
      var fin = function () { out.text = [out.text].concat(out.notes).filter(Boolean).join('\n'); out.allowed_numbers = Object.keys(allow).map(Number); return out; };
      if (!match || match.stage !== 3) { out.status = 'error'; out.text = 'ورودی این مرحله نتیجهٔ تطبیق معتبر نیست.'; return fin(); }
      var st = match.status, a = (match.exec && match.exec.args) || {};
      /* ۱) وضعیت‌های غیرمحاسباتی */
      if (st === 'clarify') {
        var cl = match.clarification || {};
        out.status = 'clarify'; out.kind = 'question'; out.text = cl.question || 'منظورت دقیقاً چیه؟ یک‌کم بیشتر توضیح بده.'; out.suggestions = (cl.suggestions || []).slice(); out.clarification = { reason: cl.reason || null, term: cl.term || null }; if (match.resume) out.resume = match.resume;
        (match.gaps || []).forEach(function (g) { out.gaps.push(g); }); T('clarify', cl.reason); scan(out.text); return fin();
      }
      if (st === 'refuse') {
        var rs = (match.clarification && match.clarification.reason) || ((match.gaps[0] && match.gaps[0].reason) || '');
        var RF = { market_price: 'قیمت و نرخ بازار (مثل دلار یا طلا) را نمی‌دونم؛ فقط با ردیف‌های خودت کار می‌کنم.', investment_advice: 'توصیهٔ سرمایه‌گذاری نمی‌کنم؛ فقط درباره ردیف‌های ثبت‌شدهٔ خودت می‌تونم کمک کنم.', write_operation: 'من فقط می‌تونم داده‌هات رو بخونم و حساب کنم؛ ثبت، حذف و ویرایش رو باید خودت از صفحه‌های نرم‌افزار انجام بدی. قدم‌به‌قدمش رو توی بخش «راهنما» می‌بینی.', out_of_domain: 'مقایسهٔ بانک‌ها و نرخ سود و وام رو نمی‌دونم؛ فقط دربارهٔ ردیف‌های حساب‌کتابت می‌تونم جواب بدم.' };
        out.status = 'refuse'; out.kind = 'refusal'; out.text = RF[rs] || (match.gaps[0] && match.gaps[0].detail ? 'این را نمی‌توانم انجام دهم: ' + match.gaps[0].detail + '.' : 'این کار در توان من نیست؛ فقط دربارهٔ ردیف‌های حساب‌کتابت می‌توانم جواب بدهم.');
        (match.gaps || []).forEach(function (g) { out.gaps.push(g); }); T('refuse', rs); scan(out.text); return fin();
      }
      if (st === 'chat') { out.status = 'chat'; out.kind = 'chat'; out.text = 'سلام! از من دربارهٔ خرج، درآمد و ردیف‌هایت بپرس؛ مثلاً «این ماه چقدر خرج کردم؟»'; T('chat', 'passthrough'); return fin(); }
      if (st === 'navigate' || st === 'app_action') {
        out.status = st; out.kind = st; out.app_actions = (match.app_actions || []).slice();
        out.text = out.app_actions.length ? 'باشه، همین کار را از مسیر اصلی برنامه انجام می‌دهم (در این مرحله اجرا نمی‌شود).' : 'این کار از مسیر اصلی برنامه انجام می‌شود.'; T(st, out.app_actions.length); scan(out.text); return fin();
      }
      if (st !== 'ready' || !calc || !calc.ok) {
        out.status = 'error'; out.kind = 'error';
        var why = calc && calc.reason || ('status:' + st);
        out.text = 'نتوانستم این را با اطمینان حساب کنم' + (why === 'ref_missing' ? ' (ردیف‌ها بین دو مرحله تغییر کرده بودند؛ دوباره بپرس)' : '') + '؛ عدد نمی‌دهم تا اشتباه نباشد.'; out.error = why; T('error', why); return fin();
      }
      /* ۲) ابزار تحلیلی موجود */
      if (calc.kind === 'tool') {
        var tx = '';
        try { tx = hkAsstSummary(match.exec.tool, calc.tool_result, { tool: match.exec.tool, args: a, explain: match.exec.explain, intent: match.exec.intent, rawQ: match.source && match.source.raw_text }) || ''; } catch (eT) { tx = ''; }
        if (!tx) { out.status = 'error'; out.kind = 'error'; out.text = 'نتیجهٔ این تحلیل را نتوانستم بسازم.'; out.error = 'empty_summary'; return fin(); }
        out.kind = 'tool'; out.text = tx; out.figures = { tool: match.exec.tool }; (match.gaps || []).forEach(function (g) { out.gaps.push(g); out.notes.push('نکته: ' + (g.detail || g.code) + '.'); });
        T('tool', match.exec.tool); out.allowed_numbers = null; out.text = [out.text].concat(out.notes).join('\n'); return out;
      }
      /* ۳) پاسخ ردیف‌محور */
      var S = calc.stats, tab = calc.eff, isInc = tab === 'income';
      var subj = tab === 'income' ? 'درآمدت' : tab === 'expense' ? 'خرجت' : 'ردیف‌ها';
      var when = hkAsstAnsTimeLabel(a), tm = match.conditions.filter(function (c) { return c.slot === 'time'; })[0];
      /* شرط‌های اعمال‌شده به‌صورت عبارت کوتاه */
      var q = [];
      var anyDone = false, anyAll = match.conditions.filter(function (c) { return c.slot === 'include.any_terms'; }).map(function (c) { return '«' + c.value + '»'; }).join(' یا ');
      match.conditions.forEach(function (c) {
        var v = c.value, txt = null;
        if (c.slot === 'include.terms') txt = 'فقط «' + v + '»';
        else if (c.slot === 'include.any_terms') { if (anyDone) { out.applied.push({ slot: c.slot, value: v, outcome: c.outcome, text: 'بخشی از «' + anyAll + '»' }); return; } anyDone = true; txt = 'فقط ' + anyAll; }
        else if (c.slot === 'include.cats') txt = 'دستهٔ «' + (HK_ASST_CAT_LABELS[v] || v) + '»';
        else if (c.slot === 'exclude.terms') txt = 'بدون «' + v + '»';
        else if (c.slot === 'exclude.cats') txt = 'بدون دستهٔ «' + (HK_ASST_CAT_LABELS[v] || v) + '»';
        else if (c.slot === 'include.status') txt = v === 'unpaid' ? (tab === 'income' ? 'دریافت‌نشده' : 'پرداخت‌نشده') : 'پرداخت‌شده';
        else if (c.slot === 'include.account') txt = 'حساب «' + v + '»';
        else if (c.slot === 'include.project') txt = 'پروژهٔ «' + v + '»';
        else if (c.slot === 'include.context') txt = v === 'project' ? 'فقط پروژه‌ای' : 'فقط شخصی';
        else if (/^amount\./.test(c.slot)) { var mp = { min: 'حداقل', max: 'حداکثر', eq: 'دقیقاً', gt: 'بیشتر از', lt: 'کمتر از' }; txt = mp[c.slot.slice(7)] + ' ' + M(v); }
        if (txt) { scan(txt); q.push(txt); out.applied.push({ slot: c.slot, value: v, outcome: c.outcome, text: txt }); }
      });
      scan(when);
      var qual = q.length ? ' (' + q.join('، ') + ')' : '', statusApplied = match.conditions.some(function (c) { return c.slot === 'include.status' && c.value === 'unpaid'; });
      var det = function (n) { return ' (' + q.concat([N(n) + ' تراکنش']).join('، ') + ')'; };
      var catAlt = calc.alternatives, hasAlt = catAlt.length > 0;
      /* صفر: «ثبت نشده» در برابر «با این شرط‌ها ردیفی نیست» */
      if (S.count === 0) {
        var noPeriod = (match.data_coverage && match.data_coverage.requested_period_has_rows === false) || !(match.data_coverage && match.data_coverage.has_any_rows);
        var uw = (match.warnings || []).filter(function (w) { return w.code === 'explicit_search_unknown_term'; })[0];
        out.kind = 'empty'; out.figures = { count: 0 };
        if (!(match.data_coverage && match.data_coverage.has_any_rows)) out.text = 'هنوز هیچ ردیفی ثبت نشده؛ چیزی برای حساب‌کردن نیست.';
        else if (noPeriod) out.text = 'برای ' + when.replace(/^(در|از) /, '') + ' هیچ ردیفی ثبت نشده، پس چیزی برای حساب نیست (این «صفر» نیست، «بدون داده» است).';
        else if (uw) out.text = 'ردیفی با «' + uw.terms.join('، ') + '» پیدا نکردم' + (tm ? ' ' + when : '') + '.';
        else if (match.source && match.source.explicit_search) out.text = 'چیزی با این مشخصات پیدا نکردم' + qual + (tm ? ' ' + when : '') + '.';
        else out.text = 'برای این شرط تراکنشی' + (calc.incomplete ? ' دارای مبلغ' : '') + ' ثبت نشده است' + (q.length || tm ? ' (' + q.concat(tm ? [when] : []).join('، ') + ')' : '') + '؛ پس مبلغی هم ندارد.';
        if (S.count === 0 && calc.incomplete) out.notes.push(N(calc.incomplete) + ' ردیف مطابق شرط‌ها هست ولی مبلغ ندارد، برای همین چیزی جمع نشد.');
        scan(out.text); T('empty', noPeriod ? 'no_data' : 'filters');
      } else if (calc.op === 'count') {
        out.figures = { count: S.count };
        out.text = N(S.count) + ' تراکنش ' + (tab === 'income' ? 'درآمد ' : tab === 'expense' ? 'خرج ' : '') + when + ' ثبت شده' + qual + '.'; out.text = out.text.replace(/\s+/g, ' ');
        if (calc.ops.indexOf('sum') >= 0 && !calc.mixed) { out.notes.push('جمعشان ' + M(S.sum) + ' است.'); out.figures.sum = S.sum; }
      } else if (calc.op === 'avg') {
        out.figures = { avg: S.avg, count: S.count };
        if (calc.mixed) { out.text = 'میانگین درآمد و هزینه را جدا بگویم: هزینه ' + M(Math.round(S.expenseSum / S.expenseCount)) + '، درآمد ' + M(Math.round(S.incomeSum / S.incomeCount)) + ' (' + when + ').'; out.figures.expenseAvg = Math.round(S.expenseSum / S.expenseCount); out.figures.incomeAvg = Math.round(S.incomeSum / S.incomeCount); }
        else out.text = 'میانگین هر تراکنش ' + (tab === 'income' ? 'درآمد ' : tab === 'expense' ? 'خرج ' : '') + when + ' ' + M(S.avg) + ' است' + det(S.count).replace(' (', '، از ').replace(')', '') + '.';
        out.text = out.text.replace(/\s+/g, ' ');
      } else if (calc.op === 'max' || calc.op === 'min') {
        var word = calc.op === 'max' ? 'بیشترین' : 'کمترین';
        out.figures = { extremes: calc.extremes.map(function (e) { return { tab: e.tab, amount: e.rows[0].amount, rows: e.rows.length }; }) };
        var lines = [];
        calc.extremes.forEach(function (e) {
          var r0 = e.rows[0], tn = e.tab === 'income' ? 'درآمد' : 'خرج';
          var dl = function (r) { return (r.d ? N(r.d) + ' ' : '') + HK_ASST_MONTH_NAMES[r.m - 1] + ' ' + N(r.y); };
          if (e.rows.length > 1 && !e.ties) { lines.push(N(e.rows.length) + ' ' + word.replace('بیشترین', 'بزرگ‌ترین').replace('کمترین', 'کوچک‌ترین') + ' ' + tn + ' ' + when + qual + ':'); e.rows.forEach(function (r) { lines.push('• «' + scan(r.desc) + '» — ' + M(r.amount) + ' (' + dl(r) + ')'); }); }
          else if (e.rows.length === 1) lines.push(word + ' ' + tn + ' ' + when + qual + ': «' + scan(r0.desc) + '» با ' + M(r0.amount) + ' (' + dl(r0) + ').');
          else { lines.push(word + ' ' + tn + ' ' + when + qual + ' ' + M(r0.amount) + ' است و ' + N(e.rows.length + e.more) + ' ردیف هم‌مبلغ دارد:'); e.rows.forEach(function (r) { lines.push('• «' + scan(r.desc) + '» (' + dl(r) + ')'); }); if (e.more) lines.push('و ' + N(e.more) + ' ردیف دیگر.'); }
        });
        out.text = lines.join('\n');
      } else if (calc.op === 'list') {
        var e0 = calc.extremes[0], tot = calc.rows_all, shownN = calc.rows.length;
        out.figures = { count: S.count, shown: shownN };
        var dl2 = function (r) { return (r.d ? N(r.d) + ' ' : '') + HK_ASST_MONTH_NAMES[r.m - 1] + ' ' + N(r.y); };
        var exO = match.exec && match.exec.order;
        if (shownN === 1 && exO && exO.limit === 1 && (!exO.sort || exO.sort === 'dateDesc') && !calc.mixed) {
          var r1 = calc.rows[0], tn1 = r1.tab === 'income' ? 'درآمد' : 'خرج';
          out.text = 'آخرین ' + tn1 + (when === 'در همهٔ ماه‌ها' ? '' : ' ' + when) + qual + ': «' + scan(r1.desc) + '» با ' + M(r1.amount) + ' (' + dl2(r1) + ').';
          out.figures.last = r1.amount; var lastDone = true;
        }
        var head = N(tot) + ' ردیف ' + when + (qual || '') + (calc.mixed ? '' : ' با جمع ' + M(S.sum)) + (shownN < tot ? '؛ ' + N(shownN) + ' تای اول:' : ':');
        if (!lastDone) out.text = head + '\n' + calc.rows.map(function (r) { return '• «' + scan(r.desc) + '» — ' + M(r.amount) + ' (' + dl2(r) + ')'; }).join('\n');
        if (calc.mixed) out.figures.mixed = true;
      } else if (calc.op === 'group') {
        var by = calc.by, BY = { month: 'ماه', section: 'بخش', account: 'حساب', tab: 'نوع', context: 'پروژه/شخصی', category: 'دسته' };
        var gl = function (g) { if (by === 'month') { var p = g.key.split('-'); return HK_ASST_MONTH_NAMES[(+p[1]) - 1] + ' ' + N(+p[0]); } if (by === 'tab') return g.key === 'income' ? 'درآمد' : 'هزینه'; if (by === 'context') return g.key === 'project' ? 'پروژه‌ای' : 'شخصی'; if (by === 'category') return g.key === 'income' ? 'درآمد' : scan(hkAsstCatLabel(g.key)); return scan(g.key); };
        out.figures = { groups: calc.groups.map(function (g) { return { key: g.key, sum: g.sum, count: g.count }; }) };
        var gline = function (g) { return '• ' + gl(g) + ': ' + (g.mixed ? 'هزینه ' + M(g.expenseSum) + ' و درآمد ' + M(g.incomeSum) : M(g.sum)) + ' (' + N(g.count) + ' ردیف)'; };
        var ex0 = match.exec.explain;
        var lead = 'به تفکیک ' + BY[by] + ' ' + when + qual + ':';
        if (/^(top|low)group$/.test(ex0 || '') && calc.groups.length) { var pick = calc.groups.filter(function (g) { return !g.mixed; }).sort(function (x, y) { return ex0 === 'topgroup' ? y.sum - x.sum : x.sum - y.sum; })[0]; if (pick) lead = (ex0 === 'topgroup' ? 'بیشترین' : 'کمترین') + ' «' + gl(pick) + '» با ' + M(pick.sum) + ' است. ' + lead; }
        out.text = lead + '\n' + calc.groups.map(gline).join('\n');
      } else {
        /* sum */
        if (calc.mixed) {
          out.figures = { count: S.count, incomeSum: S.incomeSum, expenseSum: S.expenseSum, balance: S.balance };
          out.text = when + ' (' + N(S.count) + ' تراکنش)' + qual + '؛ درآمد و هزینه را با هم جمع نمی‌زنم:\nدرآمد: ' + M(S.incomeSum) + '\nهزینه: ' + M(S.expenseSum) + '\nمانده: ' + M(S.balance);
        } else {
          out.figures = { sum: S.sum, count: S.count };
          var who = tab === 'income' ? when + ' درآمدت ' + M(S.sum) + ' شده' : tab === 'expense' ? when + ' خرجت ' + M(S.sum) + ' شده' : 'جمع ردیف‌ها ' + when + ' ' + M(S.sum) + ' شده';
          out.text = who + det(S.count) + '.';
          if (calc.catTop && calc.catTop.share >= 25) out.notes.push('بیشترین سهم مربوط به «' + scan(calc.catTop.label) + '» بوده (' + N(calc.catTop.share) + '٪ از کل؛ ' + M(calc.catTop.sum) + ').');
          if (calc.prev && calc.prev.sum > 0) {
            var pct = Math.round((S.sum - calc.prev.sum) / calc.prev.sum * 100), pl = HK_ASST_MONTH_NAMES[calc.prev.m - 1] + (calc.prev.y !== hkAsstCY() ? ' ' + toPersianDigits(String(calc.prev.y)) : '');
            out.notes.push(Math.abs(pct) < 3 ? 'تقریباً هم‌اندازهٔ ' + pl + ' است (' + M(calc.prev.sum) + ').' : 'نسبت به ' + pl + ' (' + M(calc.prev.sum) + ') حدود ' + N(Math.abs(pct)) + '٪ ' + (pct > 0 ? 'بیشتر' : 'کمتر') + ' شده' + (calc.prev.partial ? ' (این ماه هنوز تمام نشده)' : '') + '.');
            out.figures.prevSum = calc.prev.sum;
          }
          if (calc.ops.indexOf('avg') >= 0 || calc.ops.indexOf('average') >= 0) { out.notes.push('میانگین هر تراکنش ' + M(S.avg) + ' است.'); out.figures.avg = S.avg; }
          if (calc.ops.indexOf('count') >= 0) { /* تعداد همین جا آمده است */ }
        }
        var std = [];
        if (S.unpaidCount && tab && !statusApplied) { std.push(M(S.unpaidSum) + ' از این ' + (isInc ? 'دریافت‌نشده' : 'پرداخت‌نشده') + ' است (' + N(S.unpaidCount) + ' ردیف).'); out.figures.unpaidSum = S.unpaidSum; out.figures.unpaidCount = S.unpaidCount; }
        if (calc.card && calc.card.total !== S.sum) { var why = []; if (calc.card.projectRows) why.push(N(calc.card.projectRows) + ' ردیف پروژه‌ای'); if (calc.card.otherSectionRows) why.push(N(calc.card.otherSectionRows) + ' ردیف بخش‌های دیگر'); std.push('طبق کارت اصلی برنامه ' + M(calc.card.total) + ' است؛ جمع همهٔ ردیف‌ها ' + M(S.sum) + (why.length ? ' (' + why.join(' و ') + ')' : '') + '.'); out.figures.cardTotal = calc.card.total; }
        out.__std = std;
      }
      if (calc.union && calc.union.length > 1 && !calc.mixed) {
        out.notes.push('تفکیک: ' + calc.union.map(function (u) { return '«' + scan(u.term) + '» ' + M(u.sum); }).join(calc.union_overlap ? '، ' : ' + ') + (calc.union_overlap ? ' (ردیف‌های مشترک فقط یک بار شمرده شدند).' : '.'));
        out.figures.union = calc.union.map(function (u) { return { term: u.term, sum: u.sum, count: u.count }; });
      }
      /* ۴) برداشت جایگزین (افشای صریح) */
      calc.alternatives.forEach(function (al) {
        var base = match.readings.primary === 'category' ? 'عدد بالا کل دستهٔ «' + (HK_ASST_CAT_LABELS[al.category] || al.category) + '» است' : 'عدد بالا کل ' + (tab === 'income' ? 'درآمد' : 'هزینه') + ' است';
        var altTxt = al.mixed ? 'هزینه ' + M(al.expenseSum) + ' و درآمد ' + M(al.incomeSum) : M(al.sum);
        var line = base + '، نه فقط ردیف‌های «' + scan(al.word) + '». فقط ردیف‌های «' + scan(al.word) + '»: ' + altTxt + ' (' + N(al.count) + ' تراکنش).';
        out.notes.push(line); out.disclosed.push({ reading: 'row', word: al.word, sum: al.sum, count: al.count }); (out.figures.alternatives = out.figures.alternatives || []).push({ word: al.word, sum: al.sum, count: al.count });
      });
      /* ۵) ردیف بی‌مبلغ، هشدارها، شکاف‌ها، شرط‌های بی‌اثر */
      var stdAll = (out.__std || []).slice(); delete out.__std;
      if (calc.incomplete && S.count > 0) { stdAll.push(N(calc.incomplete) + ' ردیف ناقص (بدون مبلغ) شمرده نشد.'); out.figures.incomplete = calc.incomplete; }
      if (stdAll.length) out.notes.unshift(stdAll.join(' '));
      (match.warnings || []).forEach(function (w) {
        out.warnings.push(w);
        if (w.code === 'typo_corrected') out.notes.push('«' + scan(w.from) + '» را «' + scan(w.to) + '» در نظر گرفتم.');
        else if (w.code === 'explicit_search_unknown_term') { if (S.count) out.notes.push('«' + w.terms.join('، ') + '» در ردیف‌ها پیدا نشد.'); }
        else if (w.code === 'tab_via_synonym') { /* با خوانش جایگزین افشا شده است */ }
        else if (w.detail) out.notes.push('نکته: ' + scan(String(w.detail)) + '.');
      });
      (match.gaps || []).forEach(function (g) { out.gaps.push(g); out.notes.push('نکته: ' + scan(String(g.detail || g.code)) + '.'); });
      match.conditions.forEach(function (c) { if (c.outcome === 'no_rows' && /^exclude\./.test(c.slot)) out.notes.push('هیچ ردیفی «' + scan(String(c.value)) + '» نداشت، پس چیزی کنار نرفت.'); });
      T('render', calc.op + (S.count === 0 ? ':empty' : ''));
      scan(out.text); out.notes.forEach(scan);
      return fin();
    }
    /* بررسی «هر عدد پشتوانه دارد»: هر رقمِ متن باید از واژهٔ ثبت‌شده یا خود پرسش/نام‌ها آمده باشد */
    function hkAsstAnswerCheck(ans) {
      if (!ans || !ans.allowed_numbers) return { ok: true, skipped: true, bad: [] };
      var ok = {}; ans.allowed_numbers.forEach(function (n) { ok[String(n)] = 1; });
      var bad = [];
      hkAsstAnsDigits(ans.text).replace(/[٬,،]/g, '').split(/[^0-9]+/).forEach(function (d) { if (d && !ok[String(parseInt(d, 10))]) bad.push(d); });
      return { ok: bad.length === 0, skipped: false, bad: bad };
    }
    function hkAsstAnswer(match) {
      var calc = null, ans;
      try { calc = hkAsstCompute(match); ans = hkAsstRender(match, calc); } catch (e) { ans = { v: HK_ASST_ANSWER_VERSION, stage: 4, status: 'error', kind: 'error', text: 'نتوانستم این را با اطمینان حساب کنم؛ عدد نمی‌دهم تا اشتباه نباشد.', notes: [], figures: {}, applied: [], disclosed: [], gaps: [], warnings: [], app_actions: [], suggestions: [], source: {}, trace: [{ step: 'exception', detail: String(e && e.message || e) }], error: 'exception' }; }
      var chk = hkAsstAnswerCheck(ans);
      if (!chk.ok) { ans.trace.push({ step: 'number_guard', detail: chk.bad.join(',') }); ans = { v: HK_ASST_ANSWER_VERSION, stage: 4, status: 'error', kind: 'error', text: 'نتوانستم عدد را با اطمینان بسازم؛ ترجیح دادم نگویم تا اشتباه نباشد.', notes: [], figures: {}, applied: [], disclosed: [], gaps: [], warnings: [], app_actions: [], suggestions: [], source: ans.source, trace: ans.trace, error: 'unbacked_number' }; }
      ans.calc = calc;
      return ans;
    }
    /* زنجیرهٔ چهارمرحله‌ای؛ state = {prev} برای ادامهٔ گفتگو. اثر جانبی ندارد (حالت dry در تحلیل‌گر/تطبیق). */
    function hkAsstChain(text, state) {
      state = state || {};
      var spec = hkAsstAnalyze(text, { prev: state.prev || null }), match = hkAsstMatch(spec);
      if (match.resume && match.status === 'clarify') spec.resume = match.resume;
      /* ۱.۴.۴۶: پرسش روشن‌کننده/گفتگو/رد (بی‌ابزار) زمینهٔ سؤال قبلی را پاک نمی‌کند؛ «جمع کن» بعد از یک پرسش هنوز به همان سؤال برمی‌گردد */
      var prevB = state.prev && state.prev.binding;
      state.prev = (!spec.binding && prevB && !spec.resume && /^(ask|chat|refuse)$/.test(spec.action)) ? Object.assign({}, spec, { binding: prevB }) : spec;
      var ans = hkAsstAnswer(match);
      return { text: text, spec: spec, match: match, calc: ans.calc, answer: ans };
    }

    /* ===== ۱.۴.۴۵: اتصال به دستیار (hkAsstAsk) =====
       موتور پیش‌فرض «chain» است؛ کلید بازگشت به موتور قبلی (فقط داخلی، در رابط دیده نمی‌شود):
         hkAsstSetEngine('legacy')  ← موتور قبلی؛  hkAsstSetEngine('chain') ← موتور جدید (پیش‌فرض)
       گفتگو/ناوبری/عملیات برنامه/امتناع همچنان با مسیر قبلی اجرا می‌شوند (فقط یک‌بار: تحلیل‌گر حالت خشک است)؛
       پرسش‌های دادهای (جمع، تعداد، فهرست، تحلیل) و پرسش‌های روشن‌کننده با موتور جدید پاسخ داده می‌شوند. */
    var HK_ASST_ENGINE_KEY = STORAGE_KEY + '_asstEngine';
    var _hkAsstChainState = { prev: null, at: 0 };
    function hkAsstEngine() { try { return localStorage.getItem(HK_ASST_ENGINE_KEY) === 'legacy' ? 'legacy' : 'chain'; } catch (e) { return 'chain'; } }
    function hkAsstSetEngine(v) {
      try { if (v === 'legacy') localStorage.setItem(HK_ASST_ENGINE_KEY, 'legacy'); else localStorage.removeItem(HK_ASST_ENGINE_KEY); } catch (e) {}
      _hkAsstChainState = { prev: null, at: 0 };
      return hkAsstEngine();
    }
    function hkAsstChainReset() { _hkAsstChainState = { prev: null, at: 0 }; }
    function hkAsstChainStripRows(text) { var L = String(text).split('\n').filter(function (l) { return l.indexOf('• ') !== 0; }); L[0] = L[0].replace(/[:؛]\s*$/, '.'); return L.join('\n'); }
    function hkAsstAskChain(q) {
      var st = _hkAsstChainState;
      /* زمینهٔ گفتگو با حافظهٔ قبلی هم‌عمر است (۱۵ دقیقه یا پاک‌شدن آن)؛ spec در انتظار پاسخ روشن‌کننده (resume) تا همان مدت می‌ماند */
      if (st.prev && (Date.now() - st.at > 900000 || (!hkAsstCtxValid() && !st.prev.resume))) st.prev = null;
      var keep = st.prev, c;
      try { c = hkAsstChain(q, st); } catch (e) { st.prev = keep; return null; }
      var m = c.match, a = c.answer;
      _hkAsstPending = null;
      if (m.status === 'ready' && (m.warnings || []).some(function (w) { return w.code === 'typo_corrected'; })) { st.prev = keep; return null; } /* اصلاح غلط‌تایپی (به‌ویژه نام ماه) را مسیر قبلی با تأیید می‌پرسد */
      if (m.status === 'clarify' && (!m.clarification || !m.clarification.question || /^(not_understood|analyzer_error|bad_spec|matcher_error|empty)$/.test(m.clarification.reason))) { st.prev = keep; return null; }
      if (m.status === 'clarify') {
        st.at = Date.now();
        var cl = m.clarification || {}, term = cl.reason === 'unknown_term' && cl.term ? [cl.term] : null;
        var chips = (a.suggestions || []).slice();
        if (cl.reason === 'vague_size' && !chips.length) {
          try {
            var dw = (m.clarification.question.match(/«([^»]+)»/) || [])[1] || '', big = /^(درشت|سنگین|بزرگ|کلان|گنده)$/.test(dw);
            var bounds = big ? ['بالای ۲۰۰ هزار تومن', 'بالای ۵۰۰ هزار تومن', 'بالای ۱ میلیون تومن'] : ['زیر ۱۰ هزار تومن', 'زیر ۵۰ هزار تومن', 'زیر ۱۰۰ هزار تومن'];
            chips = bounds.map(function (bd) { return hkAsstRepl(q, dw, bd); }).filter(function (x) { return x && x !== q; });
          } catch (eV) {}
        }
        var fr = { role: 'bot', kind: 'text', text: a.text, suggestions: chips, chipRaw: true, final: true, decision: 'ask', why: cl.reason || 'ask', engine: 'chain' };
        if (term) fr.unknown = term;
        hkAsstMissedLog(q, fr);
        return fr;
      }
      if (a.status === 'refuse') { st.prev = keep; return { role: 'bot', kind: 'text', text: a.text, suggestions: [], final: true, decision: 'refuse', why: (m.clarification && m.clarification.reason) || 'refuse', engine: 'chain' }; }
      if (a.status === 'error') { st.prev = keep; return { role: 'bot', kind: 'text', text: a.text, suggestions: [], final: true, decision: 'ask', why: a.error || 'error', engine: 'chain' }; }
      if (a.status !== 'answer' || m.status !== 'ready' || !m.exec) { st.prev = keep; return null; }
      var ex = m.exec, out = hkAsstExec(ex.tool, ex.args);
      if (!out.ok) { st.prev = keep; return { role: 'bot', kind: 'text', text: 'نشد انجامش بدم: ' + out.error, engine: 'chain' }; }
      var b = c.spec.binding || {}, cmd = { tool: ex.tool, args: Object.assign({}, ex.args), explain: ex.explain || '', intent: b.intent || '', understood: '', corrections: [], followUps: ex.follow_ups || [], chipRaw: true, yearExplicit: !!b.yearExplicit, catAmb: b.catAmb || null, rawQ: q };
      var text = /^transactions\.(search|group)$/.test(ex.tool) && out.result && (out.result.items || out.result.groups) ? hkAsstChainStripRows(a.text) : a.text;
      var msg = { role: 'bot', kind: 'result', tool: ex.tool, head: '', text: text, data: out.result, cmd: cmd, suggestions: [], engine: 'chain' };
      if (cmd.followUps.length) { msg.suggestions = cmd.followUps; msg.chipRaw = true; }
      if (m.selection && m.selection.empty && ex.args && ex.args.text) { try { msg.suggestions = hkAsstSuggest(ex.args.text); } catch (eS) { msg.suggestions = []; } }
      st.at = Date.now();
      hkAsstCtxSave(cmd, msg); hkAsstSetTarget(msg); hkAsstMissedLog(q, msg);
      return msg;
    }
    /* مقایسهٔ دو موتور بدون اثر جانبی (برای آزمون): هر موتور با زمینهٔ گفتگوی خودش؛ حالت خشک + بازگرداندن همهٔ حالت‌ها */
    function hkAsstCompareEngines(q, context) {
      var S = { dry: _hkAsstDry, log: _hkAsstDryLog, ctx: _hkAsstCtx, target: _hkAsstLastTarget, pend: _hkAsstPending, guide: _hkAsstGuide, chain: _hkAsstChainState, missed: null };
      try { S.missed = localStorage.getItem(HK_ASST_MISSED_KEY); } catch (e0) {}
      var one = function (engine) {
        _hkAsstDry = true; _hkAsstDryLog = []; _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; _hkAsstGuide = null; _hkAsstChainState = { prev: null, at: 0 };
        var r = null;
        (context || []).forEach(function (cq) { hkAsstAsk(cq, engine); });
        r = hkAsstAsk(q, engine);
        var d = r && r.data || {};
        return { kind: r && r.kind, tool: r && r.tool || null, text: r && r.text || '', engine: r && r.engine || (engine === 'legacy' ? 'legacy' : 'legacy-path'), count: d.count != null ? d.count : null, sum: d.sum != null ? d.sum : (d.total != null ? d.total : null), dryLog: _hkAsstDryLog.length };
      };
      try { return { legacy: one('legacy'), chain: one('chain') }; }
      finally {
        _hkAsstDry = S.dry; _hkAsstDryLog = S.log; _hkAsstCtx = S.ctx; _hkAsstLastTarget = S.target; _hkAsstPending = S.pend; _hkAsstGuide = S.guide; _hkAsstChainState = S.chain;
        try { if (S.missed == null) localStorage.removeItem(HK_ASST_MISSED_KEY); else localStorage.setItem(HK_ASST_MISSED_KEY, S.missed); } catch (e1) {}
      }
    }
