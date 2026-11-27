    /* ===== ۱.۴.۴۵ (مرحلهٔ ۳): تطبیق ساختار درخواست با دادهٔ واقعی =====
       ورودی: فقط spec مرحلهٔ ۲ (hkAsstAnalyze)؛ متن خام دوباره تفسیر نمی‌شود (spec.text فقط برای ساختن پرسش/پیشنهاد به‌کار می‌رود).
       خروجی: «نتیجهٔ تطبیق» (match) با قرارداد روشن برای مرحلهٔ ۴: وضعیت، ابزار و آرگومان‌های نهایی، ردیف‌های انتخاب‌شده (مرجع)،
       هر شرط چگونه و روی چه داده‌ای اعمال شد، خوانش‌های جایگزین، ابهام/هشدار/شکاف، و trace.
       اصل‌ها: فقط خواندن؛ هیچ جمع/تعداد مبلغ/میانگینی حساب نمی‌شود (hits فقط تشخیصِ «این شرط روی چند ردیف نشست» است، نه نتیجهٔ مالی)؛
       هیچ شرطی بی‌صدا حذف یا عوض نمی‌شود؛ تصمیم‌های data_dependent بسته می‌شوند؛ مبهم = clarify با سؤال کوتاه؛ بیرون از قابلیت = gap. */
    var HK_ASST_MATCH_VERSION = 1;
    function hkAsstMatchRef(r) { return { id: r.id, key: r.key, tab: r.tab, sec: r.secId, idx: r.idx }; }
    function hkAsstMatchRefKey(r) { return r.key + '|' + r.secId + '|' + r.idx + '|' + r.tab + '|' + r.id; }
    /* واژه در دادهٔ کاربر شناخته است؟ (واژهٔ کامل، با جمع/عامیانهٔ ساده؛ فرهنگ لغت؛ پروژه) */
    function hkAsstMatchWordKnown(w, tokenPool) {
      var k = hkAsstKey(w); if (k.length < 2 || /\d/.test(w)) return 'number_or_short';
      try { if (hkAsstLookup(k)) return 'lexicon'; } catch (e) {}
      try { if (hkAsstFindSubject(w)) return 'project'; } catch (e2) {}
      if (hkAsstHasWord(tokenPool, k)) return 'row_word';
      return '';
    }
    function hkAsstMatch(spec, opts) {
      opts = opts || {};
      var M = { v: HK_ASST_MATCH_VERSION, stage: 3, status: 'clarify', source: { action: spec && spec.action, intent: spec && spec.intent, raw_text: spec && spec.text, explicit_search: !!(spec && spec.flags && spec.flags.explicit_search) }, exec: null,
        selection: { basis: 'none', refs: [], incomplete_refs: [], empty: true }, conditions: [], readings: { primary: null, alternatives: [] }, clarification: null,
        gaps: ((spec && spec.gaps) || []).slice(), warnings: ((spec && spec.warnings) || []).slice(), app_actions: ((spec && spec.app_actions) || []).slice(), data_coverage: null,
        closed_data_decisions: [], open_data_decisions: [], resume: (spec && spec.resume) || null, trace: [] };
      var T = function (step, detail) { M.trace.push({ step: step, detail: detail }); };
      try {
        if (!spec || spec.v !== HK_ASST_SPEC_VERSION) { M.clarification = { needed: true, reason: 'bad_spec', question: '', suggestions: [], term: null }; T('input', 'spec ناسازگار'); return M; }
        /* ۱) درخواست‌هایی که به داده نیاز ندارند: همان وضعیت تحلیل‌گر */
        if (spec.action !== 'run_tool') {
          M.status = spec.action === 'ask' ? 'clarify' : spec.action;
          if (spec.clarification) M.clarification = spec.clarification;
          T('passthrough', spec.action); return M;
        }
        var b = spec.binding;
        if (!b || !HK_ASST_TOOLS[b.tool]) { M.clarification = { needed: true, reason: 'not_understood', question: '', suggestions: [], term: null }; T('binding', 'ابزار نامعتبر'); return M; }
        var A = Object.assign({}, b.args || {}), isTx = /^transactions\.(aggregate|search|group)$/.test(b.tool);
        M.exec = { tool: b.tool, args: A, explain: b.explain || '', follow_ups: (b.followUps || []).slice(), intent: spec.intent, result_kind: spec.result_kind, operations: (spec.operations || []).slice(), order: spec.order || { sort: null, limit: null }, group_by: spec.group_by || null };
        var rows = hkAsstRows(), pool = [], seenK = {};
        rows.forEach(function (r) { hkAsstRowTokens(r).forEach(function (t) { if (!seenK[t]) { seenK[t] = 1; pool.push(t); } }); });
        var keysAll = {}; rows.forEach(function (r) { keysAll[r.key] = 1; });
        M.data_coverage = { periods_with_rows: Object.keys(keysAll).sort(), has_any_rows: rows.length > 0, requested_period_has_rows: null };
        /* ۷) بستن تصمیم‌های وابسته به داده */
        var closeDecisions = function () {
          (spec.data_dependent || []).forEach(function (d) {
            var kind = String(d).split(':')[0], val = String(d).slice(kind.length + 1), out = null;
            if (kind === 'typo_correction') { var to = val.split('→')[1] || ''; out = { outcome: to && hkAsstMatchWordKnown(to, pool) ? 'correction_confirmed' : 'correction_target_unknown' }; M.warnings.push({ code: 'typo_corrected', from: val.split('→')[0], to: to }); }
            else if (kind === 'row_phrase') { var pw = hkAsstNorm(val).split(' ').map(hkAsstKey), inRow = rows.some(function (r) { return hkAsstHasPhrase(hkAsstRowTokens(r), pw); }); out = { outcome: inRow ? 'phrase_in_rows' : 'phrase_not_in_rows' }; }
            else if (kind === 'row_word') out = { outcome: hkAsstHasWord(pool, hkAsstKey(val)) ? 'row_word_confirmed' : 'row_word_not_found' };
            else if (kind === 'project_name') out = { outcome: hkAsstFindSubject(val) ? 'project_exists' : 'project_missing' };
            else if (kind === 'category_via_synonym' || kind === 'category_vs_row' || kind === 'tab_via_synonym') out = { outcome: M.readings.alternatives.length ? 'closed_with_alternative' : (M.readings.primary ? 'closed_primary_only' : 'closed') };
            if (out) M.closed_data_decisions.push({ decision: d, outcome: out.outcome }); else M.open_data_decisions.push(d);
          });
        };
        /* ۲) واژه‌های ناشناخته (شرط مثبت و منفی): بی عدد پرسیده می‌شود، مگر جست‌وجوی صریح */
        var unknown = [];
        var termList = [].concat(
          (spec.slots.include.terms || []).map(function (t) { return { t: t, side: 'include.terms' }; }),
          (spec.slots.include.any_terms || []).map(function (t) { return { t: t, side: 'include.any_terms' }; }),
          (spec.slots.exclude.terms || []).map(function (t) { return { t: t, side: 'exclude.terms' }; }));
        termList.forEach(function (x) {
          String(x.t).split(/\s+/).filter(Boolean).forEach(function (w) {
            var how = hkAsstMatchWordKnown(w, pool);
            if (!how) unknown.push({ word: w, term: x.t, side: x.side });
          });
        });
        var explicitOK = !!(spec.flags && spec.flags.explicit_search);
        var blocking = unknown.filter(function (u) { return !(u.side === 'include.terms' && explicitOK); });
        if (blocking.length) {
          var u0 = blocking[0], near = [];
          /* اگر همهٔ واژه‌های یک عبارت ناشناخته‌اند («ماهی قرمز»)، دربارهٔ کل عبارت می‌پرسیم نه تکه‌ای از آن */
          var allWords = String(u0.term).split(/\s+/).filter(Boolean);
          if (allWords.length > 1 && allWords.every(function (w) { return blocking.some(function (u) { return u.term === u0.term && u.word === w; }); })) u0 = { word: u0.term, term: u0.term, side: u0.side };
          try { near = hkAsstSuggest(u0.word) || []; } catch (eS) {}
          var chips = near.map(function (n) { try { return hkAsstRepl(spec.text, u0.word, n); } catch (e3) { return ''; } }).filter(function (x) { return x && x !== spec.text; }).slice(0, 3);
          M.status = 'clarify';
          M.clarification = { needed: true, reason: 'unknown_term', term: u0.word, side: u0.side, question: (u0.side === 'exclude.terms' ? 'نمی‌دونم «' + u0.word + '» رو کجای ردیف‌ها، دسته‌ها یا پروژه‌هات پیدا کنم تا کنارش بذارم. منظورت چیه؟' : 'منظورت از «' + u0.word + '» چیه؟ این اسم توی ردیف‌ها، دسته‌ها، پروژه‌ها و حساب‌هات نیست.'), suggestions: chips };
          M.resume = { q: spec.text, term: u0.word };
          M.conditions.push({ slot: u0.side, value: u0.term, outcome: 'unknown', how: 'واژه در فرهنگ لغت، پروژه‌ها و واژه‌های ردیف‌ها (واژهٔ کامل) نیست', data_basis: 'همهٔ ماه‌ها' });
          T('unknown_term', u0); M.selection = { basis: 'none', refs: [], incomplete_refs: [], empty: true }; M.exec = null; return M;
        }
        if (unknown.length) { M.warnings.push({ code: 'explicit_search_unknown_term', terms: unknown.map(function (u) { return u.word; }) }); T('unknown_term', 'جست‌وجوی صریح؛ واژه‌های ناشناخته مجاز: ' + unknown.map(function (u) { return u.word; }).join('،')); }
        /* ۳) پروژه و حساب (فقط اگر تحلیل‌گر گذاشته باشد) */
        if (spec.slots.include.project) {
          var okP = false; try { okP = !!hkAsstFindSubject(spec.slots.include.project) || hkAsstSubjects().some(function (s) { return s.key === hkAsstKey(spec.slots.include.project); }); } catch (e4) {}
          if (!okP) { M.status = 'clarify'; M.clarification = { needed: true, reason: 'unknown_project', term: spec.slots.include.project, question: 'پروژه‌ای به نام «' + spec.slots.include.project + '» ندارم؛ کدام پروژه؟', suggestions: [] }; M.exec = null; T('project', 'ناشناخته'); return M; }
          M.conditions.push({ slot: 'include.project', value: spec.slots.include.project, outcome: 'resolved', how: 'نام پروژه در فهرست پروژه‌ها' , data_basis: 'پروژه‌ها' });
        }
        if (spec.slots.include.account) {
          var ak = hkAsstNorm(spec.slots.include.account), okA = rows.some(function (r) { return hkAsstNorm(r.account).indexOf(ak) >= 0; });
          if (!okA) { M.status = 'clarify'; M.clarification = { needed: true, reason: 'unknown_account', term: spec.slots.include.account, question: 'حسابی به نام «' + spec.slots.include.account + '» روی ردیف‌ها نیست؛ کدام حساب؟', suggestions: [] }; M.exec = null; T('account', 'ناشناخته'); return M; }
          M.conditions.push({ slot: 'include.account', value: spec.slots.include.account, outcome: 'resolved', how: 'نام حساب روی ردیف‌ها (شامل بودن)', data_basis: 'ردیف‌ها' });
        }
        /* ابزارهای غیرتراکنشی (تحلیل‌ها، مقایسه، فهرست‌ها): ابزار خودش داده را می‌خواند؛ ردیف‌گزینی ندارند */
        if (!isTx) { M.status = 'ready'; M.selection = { basis: 'tool', refs: [], incomplete_refs: [], empty: false, note: 'ردیف‌گزینی با خود ابزار (' + b.tool + ')' }; T('non_transaction_tool', b.tool); M.exec.args = A; closeDecisions(); return M; }
        /* ۴) دامنهٔ زمان و نوع، سپس هر شرط به‌تنهایی (تشخیص «چرا خالی شد») */
        var scopeF = { keepDrafts: true }; ['year', 'month', 'dateFrom', 'dateTo', 'tab'].forEach(function (k) { if (A[k] != null) scopeF[k] = A[k]; });
        var timeOnly = { keepDrafts: true }; ['year', 'month', 'dateFrom', 'dateTo'].forEach(function (k) { if (A[k] != null) timeOnly[k] = A[k]; });
        var inTime = hkAsstFilter(rows, timeOnly), inScope = hkAsstFilter(rows, scopeF);
        var has = function (arr) { return arr.some(function (r) { return r.amount !== 0; }); };
        if (spec.time && spec.time.explicit) M.data_coverage.requested_period_has_rows = has(inTime);
        var hit = function (f) { var m = hkAsstFilter(inScope, Object.assign({ keepDrafts: true }, f)); return { hits: m.filter(function (r) { return r.amount !== 0; }).length, incomplete_hits: m.filter(function (r) { return r.amount === 0; }).length }; };
        var addC = function (slot, value, how, f, extra) { var h = f ? hit(f) : { hits: null, incomplete_hits: null }; M.conditions.push(Object.assign({ slot: slot, value: value, outcome: h.hits === 0 ? 'no_rows' : 'applied', how: how, data_basis: 'ردیف‌های همین بازه و نوع', hits: h.hits, incomplete_hits: h.incomplete_hits }, extra || {})); };
        if (spec.tab) { var tabHits = hkAsstFilter(inTime, { keepDrafts: true, tab: spec.tab }).filter(function (r) { return r.amount !== 0; }).length; M.conditions.push({ slot: 'tab', value: spec.tab, outcome: tabHits ? 'applied' : 'no_rows', how: 'نوع ردیف (هزینه/درآمد) برابر مقدار', data_basis: 'همهٔ ردیف‌های بازه', hits: tabHits }); }
        if (spec.time && spec.time.explicit) M.conditions.push({ slot: 'time', value: spec.time, outcome: M.data_coverage.requested_period_has_rows ? 'applied' : 'no_rows', how: 'سال/ماه یا بازهٔ تاریخ ردیف', data_basis: 'همهٔ ماه‌های موجود: ' + M.data_coverage.periods_with_rows.join('، '), hits: inTime.filter(function (r) { return r.amount !== 0; }).length });
        (spec.slots.include.terms || []).forEach(function (t) { addC('include.terms', t, 'همهٔ واژه‌های عبارت در شرح یا بخش ردیف (واژهٔ کامل؛ جمع و عامیانهٔ ساده پذیرفته)', { text: t }); });
        (spec.slots.include.any_terms || []).forEach(function (t) { addC('include.any_terms', t, 'عضو اجتماع «و/یا»: واژهٔ کامل در شرح یا بخش ردیف', { text: t }); });
        (spec.slots.include.cats || []).forEach(function (c) { addC('include.cats', c, 'برچسب دستهٔ ذخیره‌شده روی ردیف یا مترادف دسته در شرح', { cats: [c] }, { cats_join: spec.slots.include.cats_join }); });
        if (spec.slots.include.status) addC('include.status', spec.slots.include.status, 'وضعیت پرداخت ردیف', { status: spec.slots.include.status });
        if (spec.slots.include.context) addC('include.context', spec.slots.include.context, 'ردیف شخصی/پروژه‌ای', { context: spec.slots.include.context });
        (spec.slots.exclude.terms || []).forEach(function (t) {
          var ws = hkAsstNorm(t).split(' ').map(hkAsstKey).filter(Boolean), gone = inScope.filter(function (r) { return hkAsstHasPhrase(hkAsstRowTokens(r), ws); });
          M.conditions.push({ slot: 'exclude.terms', value: t, outcome: gone.length ? 'applied' : 'no_rows', how: 'ردیفی که عبارت (پشت‌سرهم، واژهٔ کامل) را در شرح/بخش دارد کنار می‌رود', data_basis: 'ردیف‌های همین بازه و نوع', removed_hits: gone.filter(function (r) { return r.amount !== 0; }).length });
        });
        (spec.slots.exclude.cats || []).forEach(function (c) { var gone = inScope.filter(function (r) { return hkAsstCatHit(r, c); }); M.conditions.push({ slot: 'exclude.cats', value: c, outcome: gone.length ? 'applied' : 'no_rows', how: 'ردیف دارای این دسته کنار می‌رود', data_basis: 'ردیف‌های همین بازه و نوع', removed_hits: gone.filter(function (r) { return r.amount !== 0; }).length }); });
        var am = spec.slots.amount || {};
        Object.keys(am).forEach(function (k) { var f = {}; f['amount' + k.charAt(0).toUpperCase() + k.slice(1)] = am[k]; addC('amount.' + k, am[k], 'مبلغ ردیف ' + (k === 'min' ? '≥' : k === 'max' ? '≤' : k === 'eq' ? '=' : k === 'gt' ? '>' : '<') + ' مقدار', f); });
        /* ۵) انتخاب نهایی ردیف‌ها (بدون مرتب‌سازی/limit و بدون هیچ جمعی) */
        var selRows = hkAsstFilter(rows, Object.assign({}, A, { keepDrafts: true }));
        var refsOf = function (arr) { return arr.filter(function (r) { return r.amount !== 0; }).map(hkAsstMatchRef); };
        M.selection = { basis: 'transactions', refs: refsOf(selRows), incomplete_refs: selRows.filter(function (r) { return r.amount === 0; }).map(hkAsstMatchRef), empty: !has(selRows), applied_args: A };
        T('selection', 'ردیف‌های مطابق همهٔ شرط‌ها (مرجع)');
        /* ۶) دسته در برابر ردیف و نوع از مترادف: خوانش پیش‌فرض + جایگزین قابل‌افشا */
        var selKeys = {}; M.selection.refs.forEach(function (r) { selKeys[hkAsstMatchRefKey({ key: r.key, secId: r.sec, idx: r.idx, tab: r.tab, id: r.id })] = 1; });
        var sameSet = function (refs) { if (refs.length !== M.selection.refs.length) return false; return refs.every(function (r) { return selKeys[hkAsstMatchRefKey({ key: r.key, secId: r.sec, idx: r.idx, tab: r.tab, id: r.id })]; }); };
        var syn = (spec.slots.include.cats_synonym_words) || {}, doneW = {};
        Object.keys(syn).forEach(function (id) { (syn[id] || []).forEach(function (w) {
          if (doneW[w]) return; doneW[w] = 1;
          var altArgs = Object.assign({}, A); altArgs.cats = (altArgs.cats || []).filter(function (c) { return c !== id; }); if (!altArgs.cats.length) { delete altArgs.cats; delete altArgs.unionCats; }
          if (altArgs.text) { M.conditions.push({ slot: 'reading', value: w, outcome: 'not_evaluated', how: 'شرط متنی دیگری هست؛ خوانش ردیف جدا ساخته نشد' }); return; }
          altArgs.text = w;
          var altRows = hkAsstFilter(rows, Object.assign({}, altArgs, { keepDrafts: true })), altRefs = refsOf(altRows);
          M.readings.primary = 'category';
          if (!altRefs.length) { M.conditions.push({ slot: 'reading', value: w, outcome: 'no_row_named', how: 'ردیفی با نام «' + w + '» (واژهٔ کامل) نیست؛ فقط خوانش دسته', category: id }); }
          else if (sameSet(altRefs)) { M.conditions.push({ slot: 'reading', value: w, outcome: 'same_rows', how: 'ردیف‌های «' + w + '» و دستهٔ ' + id + ' یکی‌اند؛ افشای جایگزین لازم نیست', category: id }); }
          else { M.readings.alternatives.push({ reading: 'row', word: w, category: id, args: altArgs, refs: altRefs, disclose: true }); M.conditions.push({ slot: 'reading', value: w, outcome: 'alternative', how: 'پیش‌فرض: کل دستهٔ ' + id + '؛ جایگزین: فقط ردیف‌های «' + w + '»', category: id }); }
        }); });
        (spec.warnings || []).forEach(function (w) {
          if (w.code !== 'tab_via_synonym' || doneW[w.word]) return; doneW[w.word] = 1;
          var altArgs = Object.assign({}, A); if (altArgs.text) return; altArgs.text = w.word;
          var altRefs = refsOf(hkAsstFilter(rows, Object.assign({}, altArgs, { keepDrafts: true })));
          M.readings.primary = M.readings.primary || 'tab_total';
          if (!altRefs.length) M.conditions.push({ slot: 'reading', value: w.word, outcome: 'no_row_named', how: 'ردیفی با نام «' + w.word + '» نیست؛ فقط کل ' + spec.tab });
          else if (sameSet(altRefs)) M.conditions.push({ slot: 'reading', value: w.word, outcome: 'same_rows', how: 'ردیف‌های «' + w.word + '» همان کل ' + spec.tab + ' است' });
          else { M.readings.alternatives.push({ reading: 'row', word: w.word, category: null, args: altArgs, refs: altRefs, disclose: true }); M.conditions.push({ slot: 'reading', value: w.word, outcome: 'alternative', how: 'پیش‌فرض: کل ' + spec.tab + '؛ جایگزین: فقط ردیف‌های «' + w.word + '»' }); }
        });
        M.status = 'ready';
        closeDecisions();
        return M;
      } catch (e) {
        M.status = 'clarify'; M.clarification = { needed: true, reason: 'matcher_error', question: '', suggestions: [], term: null }; T('exception', String(e && e.message || e)); return M;
      }
    }
