    /* ===== ۱.۴.۴۴ (مرحلهٔ ۲): تحلیل‌گر درخواست =====
       متن خام فارسی کاربر ← «ساختار استاندارد» (spec) که مرحله‌های بعد (تطبیق با داده، محاسبه، پاسخ) دیگر متن خام را تفسیر نمی‌کنند.
       اصل‌ها:
       ۱) فقط تفسیر؛ هیچ جمع/تعداد/میانگینی حساب نمی‌شود و هیچ ردیفی انتخاب نمی‌شود (آن‌ها کار منطق قطعی ابزارهاست).
       ۲) بدون اثر جانبی: رفتن به بخش، تغییر تم، ذخیرهٔ اصطلاح و ... در «حالت خشک» (_hkAsstDry) اجرا نمی‌شود و فقط در spec.app_actions می‌آید؛ وضعیت گفتگو دست‌نخورده برمی‌گردد.
       ۳) هیچ شرطی بی‌صدا حذف نمی‌شود: هر فیلتر در slots می‌آید؛ آنچه ابزار پشتیبانی نمی‌کند در gaps.
       ۴) مبهم = action:'ask' با clarification؛ بیرون از قابلیت‌ها = gaps (قابلیت تازه ساخته نمی‌شود).
       ۵) آفلاین؛ بدون مدل و شبکه. تحلیل‌گر روی همان تفسیرگر قاعده‌ای موجود (hkAsstSemantic) سوار است و خروجی‌اش را به شکل استاندارد درمی‌آورد.
       هر تصمیمی که به فهرست واژه‌های دادهٔ کاربر نگاه می‌کند (اصلاح املا به واژهٔ موجود در داده، عبارت دوکلمه‌ای ردیف، ابهام دسته/ردیف) در spec.data_dependent علامت می‌خورد تا مرحلهٔ ۳ مسئولش شود. */
    var HK_ASST_SPEC_VERSION = 1;
    var HK_ASST_SPEC_OPS = { CNT: 'count', SUM: 'sum', AVG: 'average', MAX: 'max', MIN: 'min' };
    function hkAsstSpecIntent(cmd) {
      var t = cmd.tool, ex = cmd.explain || '', it = cmd.intent || '', a = cmd.args || {};
      if (t === 'transactions.aggregate') return (ex === 'count' || it === 'count') ? 'count' : (ex === 'avg' || it === 'avg') ? 'average' : 'sum';
      if (t === 'transactions.search') return a.sort === 'amountDesc' ? 'max' : a.sort === 'amountAsc' ? 'min' : 'list_rows';
      var M = { 'transactions.group': 'group', 'transactions.get': 'row', 'reports.compare': 'compare', 'projects.list': 'projects', 'projects.summary': 'project_summary', 'categories.summary': 'categories', 'accounts.list': 'accounts', 'months.summary': 'months',
        'insights.overview': 'status', 'insights.balance': 'balance', 'insights.savings': 'savings', 'insights.top': 'top', 'insights.trend': 'trend', 'insights.advice': 'advice', 'insights.forecast': 'forecast', 'insights.budget': 'budget', 'insights.goal': 'goal', 'insights.daily': 'daily', 'insights.anomaly': 'anomaly', 'insights.recurring': 'recurring',
        'insights.ledger': 'ledger', 'insights.dong': 'dong', 'insights.recincome': 'recurring_income', 'insights.reminders': 'reminders', 'insights.row': 'row', 'insights.monthavg': 'month_average', 'insights.share': 'share', 'insights.chart': 'chart' };
      return M[t] || 'unknown';
    }
    function hkAsstSpecTime(a) {
      var cy = hkAsstCY(), cm = hkAsstCM(), pm = cm - 1, py = cy; if (pm < 1) { pm = 12; py = cy - 1; }
      a = a || {};
      if (a.dateFrom || a.dateTo) return { kind: 'range', dateFrom: a.dateFrom || null, dateTo: a.dateTo || null, explicit: true };
      if (a.month) { var y = a.year || cy; return { kind: 'month', year: y, month: a.month, rel: (y === cy && a.month === cm) ? 'this_month' : (y === py && a.month === pm) ? 'prev_month' : null, explicit: true }; }
      if (a.year) return { kind: 'year', year: a.year, rel: a.year === cy ? 'this_year' : a.year === cy - 1 ? 'prev_year' : null, explicit: true };
      return { kind: 'all', explicit: false };
    }
    function hkAsstSpecSlots(a, cmd) {
      a = a || {};
      var amount = {}; ['amountEq', 'amountMin', 'amountMax', 'amountGt', 'amountLt'].forEach(function (k) { if (a[k] != null) amount[k.slice(6).toLowerCase()] = Number(a[k]); });
      return {
        tab: a.tab || null,
        include: { terms: a.text ? [String(a.text)] : [], any_terms: (a.textAny || []).slice(), cats: (a.cats || []).slice(), cats_join: a.unionCats ? 'union_with_any_terms' : 'intersect', project: a.project || null, account: a.account || null, context: a.context || null, status: a.status || null },
        exclude: { terms: (a.excludeText || []).slice(), cats: (a.excludeCats || []).slice() },
        amount: amount,
        transfers: { include: !!a.includeTransfers, only: !!a.transferOnly },
        match_mode: 'whole_word'
      };
    }
    /* ask → دلیل استاندارد */
    function hkAsstSpecAskKind(r) {
      var w = String(r.why || ''), m = /^chat:(.+)$/.exec(w);
      if (m) { if (m[1] === 'CHG') return { action: 'refuse', reason: 'write_operation' }; return { action: 'chat', reason: 'chat:' + m[1] }; }
      var map = { out_of_domain: ['refuse', 'out_of_domain'], navigate: ['navigate', ''], nav_unknown: ['ask', 'unknown_nav_target'], 'app_action:theme': ['app_action', 'theme'], 'app_action:alias': ['app_action', 'alias'], app_info: ['chat', 'app_info'], app_help: ['chat', 'app_help'],
        unsupported_negation: ['ask', 'unsupported_exclusion'], unsupported_exception_cue: ['ask', 'unsupported_exception_cue'], missing_scope: ['ask', 'missing_scope'], missing_context: ['ask', 'missing_context'], unsupported_followup: ['ask', 'unsupported_followup'],
        contradiction: ['ask', 'contradiction'], ambiguous_union: ['ask', 'ambiguous_union'], ambiguous_reading: ['ask', 'ambiguous_reading'], not_understood: ['ask', 'not_understood'], empty: ['ask', 'empty'] };
      var x = map[w]; return x ? { action: x[0], reason: x[1] } : { action: 'ask', reason: 'not_understood' };
    }
    function hkAsstAnalyze(text, opts) {
      opts = opts || {};
      var raw = String(text == null ? '' : text).trim();
      var spec = { v: HK_ASST_SPEC_VERSION, resume: null, warnings: [], flags: { explicit_search: /(سرچ|پیدا|بگرد|جستجو|جست‌وجو|دنبال)/.test(hkAsstNorm(String(text == null ? '' : text))) }, text: raw, normalized: hkAsstNorm(raw), action: 'ask', intent: 'clarify', operations: [], result_kind: null, tab: null, time: { kind: 'all', explicit: false }, slots: hkAsstSpecSlots({}, null),
        order: { sort: null, limit: null }, group_by: null, compare: null, follow_up: { is_follow_up: false, uses_reference: false, inherits: [], overrides: [] }, clarification: null, gaps: [], app_actions: [], data_dependent: [], binding: null, trace: [] };
      var S = { dry: _hkAsstDry, log: _hkAsstDryLog, ctx: _hkAsstCtx, guide: _hkAsstGuide, target: _hkAsstLastTarget, pend: _hkAsstPending };
      try {
        _hkAsstDry = true; _hkAsstDryLog = []; _hkAsstGuide = null; _hkAsstLastTarget = null; _hkAsstPending = null;
        var P = opts.prev && opts.prev.binding ? opts.prev.binding : null;
        _hkAsstCtx = P ? { tool: P.tool, args: Object.assign({}, P.args || {}), explain: P.explain || '', intent: P.intent || '', yearExplicit: !!P.yearExplicit, catAmb: P.catAmb || null, at: Date.now() } : null;
        /* پاسخ کوتاه کاربر به یک پرسش روشن‌کننده («زیر ۵۰ هزار»، «نه منظورم اسنپ بود»): spec قبلی در resume نگه داشته است کدام واژه جایگزین شود */
        if (opts.prev && opts.prev.resume && raw) {
          _hkAsstPending = { q: opts.prev.resume.q, term: opts.prev.resume.term, at: Date.now() };
          var rw = hkAsstPendingRewrite(raw);
          if (rw) { spec.trace.push({ slot: 'follow_up', rule: 'pending_reply_rewrite', value: rw, replaced: opts.prev.resume.term }); raw = rw; spec.rewritten_from = text; spec.text = rw; spec.normalized = hkAsstNorm(rw); }
          _hkAsstPending = null;
        }
        if (!raw) { spec.clarification = { needed: true, reason: 'empty', question: '', suggestions: [], term: null }; spec.trace.push({ slot: 'action', rule: 'empty_text' }); return spec; }
        /* درخواست‌های بیرون از دامنه (قیمت بازار، توصیهٔ سرمایه‌گذاری، انجام پرداخت): قابلیت‌شان وجود ندارد؛ ابزار نامربوط انتخاب نمی‌شود */
        var NORM = spec.normalized, personal = /(خرج|هزینه|درآمد|دخل|پس ?انداز|تراکنش|ردیف|حقوق|قسط|مخارج)/.test(NORM);
        var oos = null;
        if (/(قیمت|نرخ|ارزش)/.test(NORM) && /(دلار|یورو|طلا|سکه|بیت ?کوین|ارز|سهام|بورس|ماشین)/.test(NORM) && !personal && !/(دلار|یورو|طلا|سکه|ارز|سهام|بیت ?کوین)(ها)?(م|ام|مون|مان)( |$)|دارم|دارایی/.test(NORM)) oos = ['market_price', 'قیمت یا نرخ بازار'];
        else if (/(سهام|سهم|بورس|سرمایه ?گذاری|بیت ?کوین|ارز دیجیتال)/.test(NORM) && /(بخرم|بفروشم|بخر|بفروش|بخریم|بهتره|کدوم)/.test(NORM)) oos = ['investment_advice', 'توصیهٔ سرمایه‌گذاری'];
        else if (/(کدوم بانک|بهترین بانک|نرخ (سود|وام|بهره)|سود (سپرده|وام|بانکی))/.test(NORM) && !personal) oos = ['out_of_domain', 'مقایسهٔ بانک‌ها و نرخ بهره'];
        else if (/(پرداخت کن|بپرداز|تسویه کن|واریز کن|انتقال بده|کارت به کارت کن)/.test(NORM)) oos = ['write_operation', 'انجام پرداخت یا تغییر دادهٔ مالی'];
        else if (/(حذف|پاک|ثبت|ویرایش|اضافه|بساز)( |‌)?(کن|کنم|کنید|کنین|بکن|بزن)( |$)/.test(NORM) && /(تراکنش|ردیف|خرج|هزینه|درآمد|مخارج)/.test(NORM) && !/(چطور|چجوری|چگونه|کجا|چطوری)/.test(NORM)) oos = ['write_operation', 'ثبت، حذف یا ویرایش دادهٔ مالی'];
        else if (/(تقویم|مناسبت|فال|طالع)/.test(NORM) && !personal) oos = ['out_of_domain', 'موضوع بیرون از دفتر مالی'];
        if (oos) {
          spec.action = 'refuse'; spec.intent = 'refuse'; spec.clarification = { needed: false, reason: oos[0], question: '', suggestions: [], term: null };
          spec.gaps.push({ code: 'out_of_scope', detail: oos[1] + ' پشتیبانی نمی‌شود', reason: oos[0] }); spec.trace.push({ slot: 'action', rule: 'out_of_scope_pattern', detail: oos[0] }); return spec;
        }
        if (/(^| )(اشتباه (فهمیدی|شد|گفتی|برداشت کردی)|درست نفهمیدی|اینطور نبود|این نبود)( |$)/.test(NORM) && !P) {
          spec.clarification = { needed: true, reason: 'correction_without_context', question: 'چه چیزی را اشتباه فهمیدم؟ اول یک سؤال بپرس.', suggestions: [], term: null };
          spec.trace.push({ slot: 'action', rule: 'correction_without_context' }); return spec;
        }
        var r = hkAsstAliasIntent(raw) || hkAsstSemantic(hkAsstAliasApply(raw));
        var frame = r && r.__frame ? r : null, cmd = frame ? (hkAsstDecide(frame) || hkAsstFrameToCommand(frame)) : r;
        var pre = cmd && cmd.tool ? { tool: cmd.tool, args: Object.assign({}, cmd.args || {}) } : null;
        var merged = hkAsstCtxMerge(cmd);
        spec.app_actions = _hkAsstDryLog.slice();
        (_hkAsstDataNotes || []).forEach(function (n) { if (spec.data_dependent.indexOf(n) < 0) spec.data_dependent.push(n); });
        /* --- ask / چت / رد / رفتن به بخش --- */
        if (merged && merged.ask) {
          var k = hkAsstSpecAskKind(merged);
          spec.action = k.action; spec.intent = k.action === 'ask' ? 'clarify' : k.action === 'refuse' ? 'refuse' : k.action === 'chat' ? 'chat' : k.action === 'navigate' ? 'navigate' : 'app_action';
          if (k.action === 'ask' || k.action === 'refuse') spec.clarification = { needed: k.action === 'ask', reason: k.reason, question: String(merged.ask || ''), suggestions: (merged.suggestions || []).slice(0, 5), term: null };
          else spec.trace.push({ slot: 'action', rule: 'non_data_request', detail: k.reason });
          spec.trace.push({ slot: 'action', rule: 'ask_site', detail: String(merged.why || '') });
          if (frame) spec.operations = []; return spec;
        }
        /* «دستهٔ حمل‌ونقل چنده؟» = مبلغِ همان دسته، نه فهرست دسته‌ها: واژهٔ «دسته» حذف و «چند/چنده» «چقدر» می‌شود و دوباره تحلیل می‌شود */
        if (!opts._retry && merged && merged.tool === 'categories.summary') {
          var tk0 = hkAsstNorm(raw).replace(/[،,.؟?!:؛]/g, ' ').split(' ').filter(Boolean), hasCat = tk0.some(function (w, i) { for (var L = 3; L >= 1; L--) { if (i + L > tk0.length) continue; var ph = tk0.slice(i, i + L).join(' '); if (/^دسته/.test(ph)) continue; var c = hkAsstLookup(hkAsstKey(ph)); if (c && c.indexOf('CAT_') === 0) return true; } return false; });
          if (hasCat && !/(چند (تا )?دسته|چندتا دسته|کدوم دسته|لیست|فهرست|اسم)/.test(hkAsstNorm(raw))) {
            var rw2 = tk0.filter(function (w) { return !/^دسته/.test(w); }).join(' ').replace(/(^| )(چنده|چند)( |$)/g, '$1چقدر$3');
            var sp2 = hkAsstAnalyze(rw2, { prev: opts.prev, _retry: true });
            sp2.rewritten_from = raw; sp2.text = raw; sp2.trace.push({ slot: 'intent', rule: 'category_amount_not_category_list', value: rw2 }); return sp2;
          }
        }
        if (!merged || !merged.tool || !HK_ASST_TOOLS[merged.tool]) { spec.clarification = { needed: true, reason: 'not_understood', question: '', suggestions: [], term: null }; return spec; }
        /* --- فرمان قابل‌اجرا --- */
        var A = Object.assign({}, merged.args || {}), cyN = hkAsstCY(), cmN = hkAsstCM();
        spec.action = 'run_tool'; spec.intent = hkAsstSpecIntent(merged);
        spec.result_kind = spec.intent === 'sum' ? 'sum' : spec.intent === 'count' ? 'count' : spec.intent === 'average' ? 'avg' : /^(list_rows|max|min)$/.test(spec.intent) ? 'rows' : null;
        spec.tab = A.tab || null; spec.time = hkAsstSpecTime(A); spec.slots = hkAsstSpecSlots(A, merged);
        spec.order = { sort: A.sort || null, limit: A.limit != null ? A.limit : null };
        if (merged.tool === 'transactions.group') spec.group_by = A.by || null;
        if (merged.tool === 'reports.compare') spec.compare = { a: A.a || null, b: A.b || null };
        spec.binding = { tool: merged.tool, args: A, explain: merged.explain || '', intent: merged.intent || '', yearExplicit: !!merged.yearExplicit, catAmb: merged.catAmb || null, followUps: Array.isArray(merged.followUps) ? merged.followUps.slice() : [] };
        /* عملیات‌ها: همهٔ فعل‌های درخواستی در متن (بیش از یکی = سؤال چندبخشی) */
        var codes = frame ? frame.codes : [];
        var ops = []; codes.forEach(function (c) { var o = HK_ASST_SPEC_OPS[c]; if (o && ops.indexOf(o) < 0) ops.push(o); });
        if (spec.intent === 'sum' || spec.intent === 'count' || spec.intent === 'average' || /^(max|min|list_rows)$/.test(spec.intent)) { if (ops.indexOf(spec.intent) < 0 && spec.intent !== 'list_rows') ops.unshift(spec.intent); }
        spec.operations = ops.length ? ops : [spec.intent];
        if (spec.operations.length > 1 && frame && frame.intent !== 'search') spec.gaps.push({ code: 'multi_part', detail: 'چند عملیات در یک جمله (' + spec.operations.join('، ') + '); اجرا فقط عملیات اصلی «' + spec.intent + '» است', ops: spec.operations.slice() });
        /* شرط‌هایی که ابزار انتخاب‌شده نمی‌شناسد: بی‌صدا حذف نمی‌شوند، به‌عنوان gap می‌آیند */
        var allowed = HK_ASST_TOOLS[merged.tool].args || [];
        Object.keys(A).forEach(function (kk) { if (allowed.indexOf(kk) < 0) spec.gaps.push({ code: 'arg_not_supported', detail: kk + ' برای ' + merged.tool + ' پشتیبانی نمی‌شود', arg: kk }); });
        /* ۱.۴.۴۶: گروه‌بندی بر اساس «دسته» اکنون پشتیبانی می‌شود (by=category)؛ بخش دفتر فقط وقتی «بخش» گفته شود */
        /* صفت اندازهٔ بی‌مرز («خرجای کوچیک»): شرط داده نیست و بی مرز مبلغ نمی‌شود اجرا کرد؛ پرسش روشن‌کننده (بدون نگاه به داده) */
        var degree = [], dropDeg = function (arr) { return arr.filter(function (t) { var w = String(t).split(' ').filter(function (x) { return hkAsstIsDegree(hkAsstKey(x)); }); if (w.length) { degree = degree.concat(w); return false; } return true; }); };
        spec.slots.include.terms = dropDeg(spec.slots.include.terms); spec.slots.include.any_terms = dropDeg(spec.slots.include.any_terms); spec.slots.exclude.terms = dropDeg(spec.slots.exclude.terms);
        if (degree.length && !Object.keys(spec.slots.amount).length) {
          spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'vague_size', question: '«' + degree[0] + '» یعنی چه مبلغی؟ یک مرز بگو (مثلاً «زیر ۵۰ هزار تومن»).', suggestions: [], term: degree[0] };
          spec.resume = { q: spec.text, term: degree[0] };
          spec.trace.push({ slot: 'action', rule: 'size_adjective_without_bound', evidence: degree }); return spec;
        }
        if (degree.length) spec.trace.push({ slot: 'include.terms', rule: 'size_adjective_with_bound_ignored', evidence: degree });
        /* «دو ماه پیش»، «۳ ماه اخیر»: عدد، تعداد ماه است نه مبلغ و نه «ماه قبل»؛ بازه از روی تقویم حساب می‌شود (نه از داده) */
        var NUMW = { یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10, یازده: 11, دوازده: 12 };
        var mN = /(^| )(\d+|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|یازده|دوازده) ?ماه ?(پیش|قبل|پیشتر|قبلتر|گذشته|اخیر)( |$)/.exec(hkAsstFaDigits(spec.normalized));
        if (mN) {
          var nM = /^\d+$/.test(mN[2]) ? +mN[2] : NUMW[mN[2]];
          if (nM >= 1 && nM <= 36) {
            if (A.amountEq === nM) delete A.amountEq;
            if (mN[3] === 'اخیر' || mN[3] === 'گذشته') { /* N ماه اخیر = بازهٔ N ماه تا امروز */
              if (A.dateFrom == null) { var fy = cyN, fm = cmN - (nM - 1); while (fm < 1) { fm += 12; fy--; } A.dateFrom = fy + '-' + fm + '-1'; A.dateTo = cyN + '-' + cmN + '-31'; delete A.year; delete A.month; }
              spec.trace.push({ slot: 'time', rule: 'last_n_months_range', value: nM });
            } else { /* N ماه پیش = یک ماهِ مشخص، N ماه قبل */
              var ty = cyN, tm = cmN - nM; while (tm < 1) { tm += 12; ty--; }
              A.year = ty; A.month = tm; delete A.dateFrom; delete A.dateTo;
              if (A.text && /^(پیش|قبل|پیشتر|قبلتر)$/.test(String(A.text))) delete A.text;
              spec.trace.push({ slot: 'time', rule: 'n_months_ago', value: nM });
            }
            spec.time = hkAsstSpecTime(A); spec.slots = hkAsstSpecSlots(A, merged); spec.binding.args = A;
          }
        }
        /* تناقض درون یک جمله («فقط بنزین بدون بنزین»): شرط مثبت و منفیِ یکسان؛ بی‌صدا نتیجهٔ صفر نمی‌دهیم */
        var nk = function (x) { return hkAsstKey(x); };
        var posK = spec.slots.include.terms.concat(spec.slots.include.any_terms).map(nk), clash = spec.slots.exclude.terms.filter(function (x) { return posK.indexOf(nk(x)) >= 0; })[0] || spec.slots.exclude.cats.filter(function (x) { return spec.slots.include.cats.indexOf(x) >= 0; })[0];
        if (!clash) { var tkc = spec.normalized.replace(/[،,.؟?!:؛]/g, ' ').split(' ').map(nk).filter(Boolean); clash = spec.slots.exclude.terms.filter(function (x) { var k = nk(x); return k.length >= 3 && tkc.filter(function (t) { return t === k; }).length >= 2; })[0]; }
        if (clash) {
          spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'contradiction', question: 'هم «' + clash + '» را خواستی و هم «بدون ' + clash + '»؛ کدام را بخواهم؟', suggestions: [], term: clash };
          spec.trace.push({ slot: 'action', rule: 'include_exclude_clash', evidence: [clash] }); return spec;
        }
        /* بازهٔ آینده («حقوق سال آینده»): دادهٔ ثبت‌شده ندارد و پیش‌بینی با این ابزار نیست */
        if ((spec.time.kind === 'year' && spec.time.year > cyN) || (spec.time.kind === 'month' && (spec.time.year > cyN || (spec.time.year === cyN && spec.time.month > cmN))) ) {
          spec.action = 'refuse'; spec.intent = 'refuse'; spec.clarification = { needed: false, reason: 'forecast_unsupported', question: '', suggestions: [], term: null };
          spec.gaps.push({ code: 'future_period', detail: 'برای بازهٔ آینده دادهٔ ثبت‌شده‌ای نیست و جمع پیش‌بینی با این ابزار پشتیبانی نمی‌شود' }); spec.trace.push({ slot: 'time', rule: 'future_period', value: spec.time }); return spec;
        }
        /* دسته‌هایی که از واژهٔ مترادف آمده‌اند نه نام خود دسته («بنزین» ← حمل‌ونقل): ممکن است اسم ردیف باشد؛ تصمیمش با داده است (مرحلهٔ ۳) */
        var tokKeys = spec.normalized.replace(/[،,.؟?!:؛()\[\]]/g, ' ').split(' ').map(hkAsstKey).filter(Boolean);
        var viaSyn = [];
        (spec.slots.include.cats || []).forEach(function (id) { var named = tokKeys.some(function (k) { return hkAsstIsCatName(id, k) || hkAsstIsCatName(id, k.replace(/(ها|های|ا|ای)$/, '')); }); if (!named) viaSyn.push(id); });
        spec.slots.include.cats_via_synonym = viaSyn;
        /* واژهٔ مترادفی که هر دستهٔ مترادف‌محور را آورده (برای تصمیم دسته/ردیف در مرحلهٔ ۳) */
        var wholeCat = /(^| )(کل|کلِ|همه|همهٔ|دسته|دستهٔ)( |$)/.test(spec.normalized), synWords = {}; viaSyn.forEach(function (id) { var rawT = spec.normalized.replace(/[،,.؟?!:؛()\[\]]/g, ' ').split(' ').filter(Boolean); synWords[id] = []; rawT.forEach(function (w, i) { for (var L = 3; L >= 1; L--) { if (i + L > rawT.length) continue; var ph = rawT.slice(i, i + L).join(' '); var vs = [ph.replace(/(مون|تون|شون|م|ت|ش)$/, ''), ph.replace(/(ها|های|ا|ای)$/, ''), ph], hv = vs.filter(function (v) { return v.length >= 3 && hkAsstLookup(hkAsstKey(v)) === 'CAT_' + id && !hkAsstIsCatName(id, hkAsstKey(v)); })[0]; if (hv && !wholeCat && synWords[id].indexOf(hv) < 0) { synWords[id].push(hv); break; } } }); });
        /* ادامهٔ گفتگو («جمعش؟» بعد از «بنزین ماه قبل»): دستهٔ ارثی هر چه در spec قبلی بود (مترادف یا نام دسته) همان می‌ماند */
        var PS = opts.prev && opts.prev.slots && opts.prev.slots.include ? opts.prev.slots.include : null;
        if (PS) (spec.slots.include.cats || []).forEach(function (id) {
          var named = tokKeys.some(function (k) { return hkAsstIsCatName(id, k) || hkAsstIsCatName(id, k.replace(/(ها|های|ا|ای)$/, '')); });
          if (named || (PS.cats || []).indexOf(id) < 0) return;
          var wasSyn = (PS.cats_via_synonym || []).indexOf(id) >= 0;
          if (!wasSyn) { spec.slots.include.cats_via_synonym = spec.slots.include.cats_via_synonym.filter(function (x) { return x !== id; }); spec.data_dependent = spec.data_dependent.filter(function (d) { return d !== 'category_via_synonym:' + id; }); delete synWords[id]; }
          else if (!(synWords[id] || []).length) synWords[id] = ((PS.cats_synonym_words || {})[id] || []).slice();
        });
        spec.slots.include.cats_synonym_words = synWords;
        viaSyn.forEach(function (id) { spec.data_dependent.push('category_via_synonym:' + id); });
        /* «کم‌خرج‌ترین/پرخرج‌ترین ماه»: مقایسهٔ ماه‌ها با یک ابزار نیست */
        if (/(ترین|بیشترین|کمترین).{0,14}ماه|ماه.{0,14}(ترین|بیشترین|کمترین)/.test(spec.normalized) && merged.tool !== 'transactions.group' && !/ماه (قبل|پیش|گذشته|جاری)|این ماه|همین ماه/.test(spec.normalized.replace(/(ترین|بیشترین|کمترین)[^ ]* ماه/g, ''))) {
          spec.gaps.push({ code: 'extreme_month', detail: 'پیدا کردن کم‌خرج‌ترین/پرخرج‌ترین ماه با یک ابزار پشتیبانی نمی‌شود' });
          spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'capability_gap', question: 'مقایسهٔ همهٔ ماه‌ها را یک‌جا نمی‌توانم؛ می‌خواهی هزینه‌ها را ماه‌به‌ماه ببینی؟', suggestions: ['هزینه‌ها ماه به ماه'], term: null };
          spec.trace.push({ slot: 'action', rule: 'extreme_month_unsupported' }); return spec;
        }
        /* نوعِ تراکنش از واژهٔ مترادف («حقوق» ← درآمد)، نه خودِ واژهٔ درآمد/هزینه: ممکن است نام ردیف باشد؛ تصمیمش با داده است */
        if (spec.tab) {
          var canon = spec.tab === 'income' ? /^(درآمد|درامد|دخل|واریز|دریافت|درآمدم|درآمدها)/ : /^(خرج|هزینه|مخارج|پرداخت|برداشت|مصرف)/;
          var synW = spec.normalized.replace(/[،,.؟?!:؛]/g, ' ').split(' ').filter(function (w) { var c = hkAsstLookup(hkAsstKey(w)); return c === (spec.tab === 'income' ? 'INC' : 'EXP') && !canon.test(w); });
          if (synW.length && !canon.test(spec.normalized.split(' ').join(' ').replace(/.*?((?:^| )(?:درآمد|دخل|واریز|دریافت|خرج|هزینه|مخارج|پرداخت)[^ ]*).*/, '$1').trim())) { spec.warnings.push({ code: 'tab_via_synonym', word: synW[0] }); spec.data_dependent.push('tab_via_synonym:' + synW[0]); }
        }
        /* «و/یا» میان دو شرطِ هم‌نوع که در ساختار نه اجتماع شده نه جدا: خطر AND پنهان (مثل «برنج ماه پیش و نان ماه پیش») */
        if (/(^| )(و|یا)( |$)/.test(spec.normalized) && spec.slots.include.cats.length && spec.slots.include.terms.length && !spec.slots.include.any_terms.length && spec.slots.include.cats_join === 'intersect' && merged.tool !== 'transactions.group') {
          spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'ambiguous_union', question: 'منظورت جمع هر دو مورد است یا فقط مواردی که هر دو شرط را دارند؟ هر مورد را جدا بنویس.', suggestions: [], term: null };
          spec.trace.push({ slot: 'action', rule: 'hidden_and_risk', evidence: { cats: spec.slots.include.cats, terms: spec.slots.include.terms } }); return spec;
        }
        /* گروه‌بندی: بُعدِ پیش‌فرض «ماه» وقتی در متن اشاره‌ای به ماه نیست حدس است؛ پرسیده می‌شود */
        if (merged.tool === 'transactions.group') {
          if (spec.slots.include.any_terms.length >= 2) {
            spec.gaps.push({ code: 'group_by_terms', detail: 'جمع جدای هر مورد فهرست (' + spec.slots.include.any_terms.join('، ') + ') با یک ابزار ممکن نیست' });
            spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'capability_gap', question: 'جمع جدای هر مورد را فعلاً با یک پرسش نمی‌توانم؛ هر مورد را جدا بپرس یا جمع هر دو را بخواه.', suggestions: spec.slots.include.any_terms.concat(['جمع هر دو']), term: null };
            spec.trace.push({ slot: 'action', rule: 'breakdown_by_terms_unsupported' }); return spec;
          }
          if (A.by === 'month' && !/ماه/.test(spec.normalized) && /درآمد/.test(spec.normalized) && /(خرج|هزینه)/.test(spec.normalized)) { A.by = 'tab'; spec.group_by = 'tab'; spec.binding.args = A; spec.trace.push({ slot: 'group_by', rule: 'income_and_expense_means_by_tab' }); }
          /* ۱.۴.۴۶: «حالا تفکیکش کن» بعد از یک جمع/فهرست: همان شرط‌ها می‌ماند و بُعد هوشمند انتخاب می‌شود (چندماهه ← ماه؛ یک ماهِ هزینه ← دسته؛ درآمد ← بخش؛ با دسته/کلمه ← حساب) نه پرسش بی‌مورد */
          var pureGroup = Object.keys(A).filter(function (k) { return k !== 'by'; }).length === 0 && /(تفکیک|گروه)/.test(spec.normalized);
          if (P && /^transactions\.(aggregate|search)$/.test(P.tool) && frame && (frame.anaphora || pureGroup) && (A.by !== 'month' || !/ماه/.test(spec.normalized) || pureGroup)) {
            var PA = Object.assign({}, P.args || {}); ['sort', 'limit', 'by'].forEach(function (k) { delete PA[k]; });
            var single = !!(PA.month && PA.year && !PA.dateFrom), narrow = !!(PA.cats || PA.text || PA.textAny), explicitDim = /(ماه|حساب|کارت|بانک|دسته|بخش)/.test(spec.normalized);
            PA.by = explicitDim ? A.by : (!single ? 'month' : narrow ? 'account' : (PA.tab === 'income' ? 'section' : 'category'));
            A = PA; spec.binding.args = A; spec.tab = A.tab || null; spec.time = hkAsstSpecTime(A); spec.slots = hkAsstSpecSlots(A, merged); spec.group_by = A.by;
            spec.trace.push({ slot: 'group_by', rule: 'follow_up_group_dimension', value: A.by });
          }
          if (A.by === 'month' && !/ماه/.test(spec.normalized) && !(P && frame && (frame.anaphora || pureGroup) && /^transactions\.(aggregate|search)$/.test(P.tool))) {
            spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'ambiguous_group_dimension', question: 'به تفکیک چه چیزی؟ ماه، نوع (درآمد/هزینه)، بخش یا حساب؟', suggestions: ['هزینه‌ها ماه به ماه', 'درآمد و هزینه جدا'], term: null };
            spec.trace.push({ slot: 'group_by', rule: 'default_dimension_is_a_guess', value: A.by }); return spec;
          }
        }
        /* ادامهٔ گفتگو */
        var fu = { is_follow_up: false, uses_reference: !!(frame && frame.anaphora), inherits: [], overrides: [] };
        if (P && (merged.memory || (pre && JSON.stringify(pre.args) !== JSON.stringify(A)))) {
          fu.is_follow_up = true;
          Object.keys(A).forEach(function (kk) { if (P.args && P.args[kk] !== undefined && JSON.stringify(P.args[kk]) === JSON.stringify(A[kk]) && !(pre && pre.args[kk] !== undefined && JSON.stringify(pre.args[kk]) === JSON.stringify(A[kk]))) fu.inherits.push(kk); });
          Object.keys(pre ? pre.args : {}).forEach(function (kk) { if (A[kk] !== undefined) fu.overrides.push(kk); });
        } else if (frame && frame.follow) fu.is_follow_up = !!P;
        spec.follow_up = fu;
        /* ردیابی تصمیم‌ها */
        var cc = codes || [];
        var ev = function (list) { return cc.filter(function (c) { return list.indexOf(c) >= 0; }); };
        if (spec.tab) spec.trace.push({ slot: 'tab', value: spec.tab, rule: ev(['EXP', 'INC']).length ? 'lexicon' : 'inferred_from_text', evidence: ev(['EXP', 'INC']) });
        if (spec.time.explicit) spec.trace.push({ slot: 'time', value: spec.time.rel || spec.time.kind, rule: 'time_phrase', evidence: ev(['THIS_M', 'PREV_M', 'THIS_Y', 'PREV_Y', 'NEXT_Y', 'SPAN3', 'SPAN6', 'SPAN12']).concat(cc.filter(function (c) { return /^MONTH_/.test(c); })) });
        if (spec.slots.exclude.terms.length || spec.slots.exclude.cats.length) spec.trace.push({ slot: 'exclude', value: spec.slots.exclude, rule: 'negation_cue', evidence: (spec.normalized.match(/(^| )(بدون|بجز|جز|به ?جز|غیر ?از)( |$)/) || [''])[0].trim() });
        if (spec.slots.include.any_terms.length) spec.trace.push({ slot: 'include.any_terms', value: spec.slots.include.any_terms, rule: 'conjunction_union', evidence: /(^| )یا( |$)/.test(spec.normalized) ? 'یا' : 'و' });
        if (Object.keys(spec.slots.amount).length) spec.trace.push({ slot: 'amount', value: spec.slots.amount, rule: 'amount_bound', evidence: ev(['OP_GT', 'OP_LT', 'OP_EQ', 'OP_BT']) });
        if (spec.order.sort) spec.trace.push({ slot: 'order', value: spec.order, rule: 'extreme_or_recency', evidence: ev(['MAX', 'MIN']) });
        if (spec.slots.include.status) spec.trace.push({ slot: 'status', value: spec.slots.include.status, rule: 'payment_status_phrase' });
        if (fu.is_follow_up) spec.trace.push({ slot: 'follow_up', value: { inherits: fu.inherits, overrides: fu.overrides }, rule: 'conversation_merge' });
        /* تصمیم‌هایی که به واژگان دادهٔ کاربر نگاه کرده‌اند */
        (frame && frame.corrections || []).forEach(function (c) { spec.data_dependent.push('typo_correction:' + c.from + '→' + c.to); spec.trace.push({ slot: 'include.terms', rule: 'typo_correction', from: c.from, to: c.to, data_dependent: true }); });
        if (merged.catAmb) { spec.data_dependent.push('category_vs_row:' + merged.catAmb.word); spec.trace.push({ slot: 'include.cats', rule: 'category_vs_row_ambiguity', word: merged.catAmb.word, category: merged.catAmb.id, data_dependent: true }); }
        if (spec.app_actions.length) spec.trace.push({ slot: 'app_actions', value: spec.app_actions, rule: 'dry_run_side_effects_suppressed' });
        return spec;
      } catch (e) {
        spec.action = 'ask'; spec.intent = 'clarify'; spec.clarification = { needed: true, reason: 'analyzer_error', question: '', suggestions: [], term: null }; spec.trace.push({ slot: 'action', rule: 'exception', detail: String(e && e.message || e) });
        return spec;
      } finally {
        _hkAsstDry = S.dry; _hkAsstDryLog = S.log; _hkAsstCtx = S.ctx; _hkAsstGuide = S.guide; _hkAsstLastTarget = S.target; _hkAsstPending = S.pend;
      }
    }
