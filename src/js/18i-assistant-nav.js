    /* ===== ۱.۴.۳۹: دستیار — رفتن به بخش‌های نرم‌افزار، حافظهٔ گفتگو، نمودار، تم ===== */
    var _hkAsstLastTarget = null;   /* آخرین چیزی که نشان داده شد و «ببر» به آن می‌رود */
    var _hkAsstCtx = null;          /* آخرین پرسش داده‌ای (برای «آبان چطور؟») */

    /* ---------- هدف‌های قابل‌کلیک ---------- */
    function hkAsstOpenTarget(t) {
      if (!t) return false;
      if (t.type === 'row') { hkAsstJump(t.item); return true; }
      var go = null;
      if (t.type === 'dong') go = function () { openDongModal(t.gid); };
      else if (t.type === 'ledger') go = function () { switchTabFromMenu('ledger'); };
      else if (t.type === 'recincome') go = function () { openRecurringFromMenu(); };
      else if (t.type === 'reminders') go = function () { openUserRemindersModal(); };
      else if (t.type === 'project') go = function () { if (t.id && typeof openProjectReportModal === 'function') openProjectReportModal(t.id); else openSubjectsModal(); };
      else if (t.type === 'nav') { hkAsstNavGo(t.nav); return true; }
      if (!go) return false;
      hkAsstGoAway();
      setTimeout(function () { try { go(); } catch (e) { try { showToast('نتوانستم این بخش را باز کنم.'); } catch (e2) {} } }, 280);
      return true;
    }
    /* پاسخ را بررسی می‌کند و اگر یک چیز مشخص نشان داده بود، «ببر» به همان می‌رود */
    function hkAsstSetTarget(reply) {
      try {
        if (!reply || reply.kind !== 'result') return;
        var d = reply.data || {}, t = null;
        if ((reply.tool === 'transactions.search') && d.items && d.items.length) t = { type: 'row', item: d.items[0] };
        else if (reply.tool === 'transactions.get' && d.found) t = { type: 'row', item: d.item };
        else if (reply.tool === 'insights.row' && d.row) t = { type: 'row', item: d.row };
        else if (reply.tool === 'insights.dong' && d.groups && d.groups.length) t = { type: 'dong', gid: d.groups[0].id };
        else if (reply.tool === 'insights.ledger') t = { type: 'ledger' };
        else if (reply.tool === 'insights.recincome') t = { type: 'recincome' };
        else if (reply.tool === 'insights.reminders') t = { type: 'reminders' };
        else if (reply.tool === 'projects.summary' && d.id) t = { type: 'project', id: d.id, name: d.name };
        if (t) _hkAsstLastTarget = t;
      } catch (e) {}
    }

    /* ---------- بخش‌های نرم‌افزار (به ترتیب: خاص‌ترها اول) ---------- */
    var HK_ASST_NAVS = [
      { id: 'prefs-cats', re: /(شخصی ?سازی|تنظیمات).*دسته|^دسته ?(ها|بندی|بندی ها)?$|دسته ?(ها|بندی)? (در|توی)? ?(شخصی ?سازی|تنظیمات)/, name: 'شخصی‌سازی › دسته‌ها', go: function () { closeSideMenu(); openPrefsModal(); }, sub: /دسته/ },
      { id: 'prefs-order', re: /(شخصی ?سازی|تنظیمات).*ترتیب|ترتیب ردیف/, name: 'شخصی‌سازی › ترتیب ردیف‌ها', go: function () { closeSideMenu(); openPrefsModal(); }, sub: /ترتیب/ },
      { id: 'prefs-font', re: /(شخصی ?سازی|تنظیمات).*(فونت|اندازه)|اندازه فونت|فونت/, name: 'شخصی‌سازی › اندازهٔ فونت', go: function () { closeSideMenu(); openPrefsModal(); }, sub: /فونت/ },
      { id: 'prefs', re: /شخصی ?سازی|تنظیمات|^ظاهر$/, name: 'شخصی‌سازی', go: function () { closeSideMenu(); openPrefsModal(); } },
      { id: 'recap', re: /ماهی که گذشت|مرور ماه|خلاصه ماه/, name: 'ماهی که گذشت', go: function () { closeSideMenu(); openMonthRecap(); } },
      { id: 'blocked', re: /مسدود/, name: 'حساب‌های مسدود شده', go: function () { hkOpenBlockedAccounts(); } },
      { id: 'smslater', re: /نفهمیده|ثبت ?نشده|پیامک.*دیرتر|بعدا/, name: 'پیامک‌های ثبت‌نشده', go: function () { openSmsLaterModal(); } },
      { id: 'home', re: /^(خانه|صفحه اصلی|اصلی|هوم|اول)$/, name: 'صفحهٔ اصلی', go: function () { closeSideMenu(); switchTab('home', true); } },
      { id: 'help', re: /راهنما|آموزش/, name: 'راهنما', go: function () { openHelpModal(); } }
    ];
    var HK_ASST_NAV_FILL = {}; ['برو', 'ببر', 'بریم', 'ببرم', 'ببرمت', 'باز', 'کن', 'بکن', 'بازکن', 'بازش', 'به', 'تو', 'توی', 'قسمت', 'بخش', 'منوی', 'منو', 'صفحه', 'صفحهٔ', 'اون', 'این', 'همون', 'لطفا', 'رو', 'را', 'دیگه', 'بیا', 'هدایت', 'برام', 'می', 'خوام', 'میخوام', 'بشه', 'بیار', 'نشونم', 'بده', 'یه', 'نگاه', 'بنداز', 'وارد', 'شو', 'ورود', 'از', 'در', 'ی', 'کجاست', 'ببینم'].forEach(function (w) { HK_ASST_NAV_FILL[w] = 1; });
    function hkAsstFindNav(P) {
      var i;
      for (i = 0; i < HK_ASST_NAVS.length; i++) if (HK_ASST_NAVS[i].re.test(P)) return HK_ASST_NAVS[i];
      var g = hkAsstGuideFor(P);
      return g ? { id: g.id, name: g.name, go: g.go } : null;
    }
    /* ردیف/دکمه‌ای با این برچسب را داخل صفحهٔ باز شده پیدا می‌کند و می‌زند */
    function hkAsstClickInside(re, tries) {
      tries = tries || 0;
      var els = document.querySelectorAll('button, [role="button"], [onclick], .hk-prefs-row, .hk-row, li, label');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.closest('.hk-asst-sheet') || !el.getClientRects().length) continue;
        var tx = (el.textContent || '').trim();
        if (tx.length < 60 && re.test(tx)) { try { el.click(); } catch (e) {} return true; }
      }
      if (tries < 16) setTimeout(function () { hkAsstClickInside(re, tries + 1); }, 150);
      return false;
    }
    function hkAsstNavGo(nav) {
      hkAsstGoAway();
      setTimeout(function () {
        try { nav.go(); } catch (e) { try { showToast('نتوانستم این بخش را باز کنم.'); } catch (e2) {} return; }
        if (nav.sub) setTimeout(function () { hkAsstClickInside(nav.sub); }, 450);
      }, 280);
    }
    /* «برو به …»، «ببر»، «برو به اون ردیف» */
    function hkAsstNavIntent(T) {
      T = T.replace(/(^| )بروبه( |$)/g, ' برو به ').replace(/شحصی|شخصیی/g, 'شخصی').replace(/\s+/g, ' ').trim();
      var navRe = /(^| )(برو|ببر|بریم|ببرم|ببرمت|باز کن|بازکن|بازش کن|بازش|هدایت کن|هدایتم کن|منو ببر|نشونم بده|بیا|بیار)( |$)/;
      if (!navRe.test(T)) return null;
      var words = T.split(' ').filter(function (w) { return w && !HK_ASST_NAV_FILL[w]; }), P = words.join(' ');
      var fin = function (ask) { return { ask: ask, final: true, understood: '', corrections: [], suggestions: [] }; };
      /* «نشونم بده/بیار» همراه اسم یک چیز دادهٔ مالی، پرسش است نه رفتن؛ فقط وقتی بخش شناخته‌شده باشد می‌رویم */
      if (!P || /^(اونجا|همونجا|اینجا|ردیف|تراکنش|ردیفش|اونو|اینو|مورد|اولی|اول)$/.test(P)) {
        if (/^(بیار|بیا|نشونم بده)$/.test(T)) return null;
        if (_hkAsstLastTarget) { var t = _hkAsstLastTarget; hkAsstOpenTarget(t); return fin(hkAsstPick(['باشه، بازش می‌کنم.', 'حله، می‌برمت اونجا.'])); }
        return fin('هنوز چیزی نشونت ندادم که ببرمت سراغش. اسم بخش رو بگو، مثلاً «برو به شخصی‌سازی» یا «برو به قرض».');
      }
      var nav = hkAsstFindNav(P);
      if (!nav) {
        if (/^(بیار|بیا|نشونم بده)$/.test((navRe.exec(T) || [])[2] || '')) return null;
        return fin('این بخش رو نشناختم. بگو کدوم قسمت؟ مثلاً شخصی‌سازی، قرض، دنگ، یادآورها، پس‌انداز یا آمار.');
      }
      hkAsstNavGo(nav);
      return fin(hkAsstPick(['باشه، «' + nav.name + '» رو باز می‌کنم.', 'حله، می‌برمت به «' + nav.name + '».']));
    }
    /* تم روز/شب (تنها تغییری که دستیار روی ظاهر نرم‌افزار می‌دهد) */
    function hkAsstThemeIntent(T) {
      if (!/(^| )تم|حالت (روز|شب)|ظاهر/.test(T) || !/روز|شب|روشن|تاریک|سفید|مشکی|دارک|لایت|عوض|تغییر/.test(T)) return null;
      if (/(چطور|چجوری|کجا)/.test(T)) return null;
      var light = /روز|روشن|سفید|لایت/.test(T), dark = /شب|تاریک|مشکی|دارک/.test(T), cur = document.documentElement.getAttribute('data-theme');
      var want = light && !dark ? 'light' : dark && !light ? 'dark' : (cur === 'dark' ? 'light' : 'dark');
      try { applyTheme(want); } catch (e) { return { ask: 'نتوانستم تم را عوض کنم.', final: true, understood: '', corrections: [], suggestions: [] }; }
      return { ask: want === 'light' ? hkAsstPick(['تم روز فعال شد.', 'حله، تم روشن شد.']) : hkAsstPick(['تم شب فعال شد.', 'حله، تم تاریک شد.']), final: true, understood: '', corrections: [], suggestions: [] };
    }

    /* ---------- حافظهٔ گفتگو ---------- */
    var HK_ASST_CTX_TOOLS = /^(transactions\.(aggregate|search|group)|insights\.(overview|top|trend|chart|monthavg|share))$/;
    function hkAsstCtxSave(cmd, reply) {
      try {
        if (!reply || reply.kind !== 'result' || !cmd || !cmd.tool || !HK_ASST_CTX_TOOLS.test(cmd.tool)) return;
        _hkAsstCtx = { tool: cmd.tool, args: Object.assign({}, cmd.args || {}), explain: cmd.explain || '', intent: cmd.intent || '', yearExplicit: !!cmd.yearExplicit, at: Date.now() };
      } catch (e) {}
    }
    function hkAsstCtxMerge(raw) {
      try {
        var L = _hkAsstCtx;
        if (!L || Date.now() - L.at > 900000 || !raw || !raw.tool || !raw.follow || !/^transactions\.(aggregate|search)$/.test(raw.tool)) return raw;
        var N = raw.args || {}, M = Object.assign({}, L.args), TK = ['year', 'month', 'dateFrom', 'dateTo'], EK = ['text', 'cats', 'project', 'context'];
        var hasT = TK.some(function (k) { return N[k] != null; }), hasE = EK.some(function (k) { return N[k] != null; });
        if (!hasT && !hasE) return raw;
        if (hasT) { TK.forEach(function (k) { delete M[k]; }); TK.forEach(function (k) { if (N[k] != null) M[k] = N[k]; }); if (N.month && !raw.yearExplicit && L.args.year && L.yearExplicit) M.year = L.args.year; }
        if (hasE) { EK.forEach(function (k) { delete M[k]; }); EK.forEach(function (k) { if (N[k] != null) M[k] = N[k]; }); }
        var out = { tool: L.tool, args: M, explain: L.explain, corrections: raw.corrections || [], intent: L.intent, yearExplicit: raw.yearExplicit || L.yearExplicit, follow: false, memory: true };
        out.understood = L.intent ? hkAsstUnderstood(L.intent, M) : '';
        return out;
      } catch (e) { return raw; }
    }

    /* ---------- نمودار ---------- */
    HK_ASST_TOOLS['insights.chart'] = {
      readOnly: true, args: ['tab', 'year', 'month', 'dateFrom', 'by', 'context', 'cats', 'project'],
      run: function (a) {
        var tab = a.tab === 'income' ? 'income' : 'expense', by = a.by || 'cat', per = hkAsstPeriodOf(a), rows;
        var base = { context: a.context, cats: a.cats, project: a.project };
        var items = [], total = 0;
        if (by === 'month') {
          var y = a.year || hkAsstCY();
          for (var m = 1; m <= 12; m++) { var mr = hkAsstFilter(hkAsstRows(), Object.assign({ year: y, month: m, tab: tab }, base)); var sm = hkAsstSum(mr); items.push({ label: HK_ASST_MONTH_NAMES[m - 1], key: m, sum: sm }); total += sm; }
          return { tab: tab, by: by, label: 'سال ' + toPersianDigits(String(y)), total: total, items: items };
        }
        rows = hkAsstRowsIn(per.from, per.to, base).filter(function (r) { return r.tab === tab && !r.transfer; });
        if (by === 'day') {
          var dm = {}; rows.forEach(function (r) { dm[r.d] = (dm[r.d] || 0) + r.amount; total += r.amount; });
          var last = per.kind === 'month' ? daysInMonth(per.y, per.m) : 31;
          for (var d = 1; d <= last; d++) items.push({ label: String(d), key: d, sum: dm[d] || 0 });
          return { tab: tab, by: by, label: per.label, total: total, items: items };
        }
        if (tab === 'expense') {
          var ct = hkAsstCatTotals(rows); total = ct.total;
          items = ct.list.map(function (o) { return { label: o.label, id: o.id, sum: o.sum, share: o.share, color: (typeof hkCatColor === 'function' ? hkCatColor(o.id) : '#08b5f5') }; });
        } else {
          var gm = {}; rows.forEach(function (r) { var k = r.section || r.desc || '—'; gm[k] = (gm[k] || 0) + r.amount; total += r.amount; });
          var pal = ['#9ee858', '#32d74b', '#30d5c8', '#4f9dff', '#bf5af2', '#ffd60a', '#ff9f0a', '#8e8e93'];
          items = Object.keys(gm).map(function (k) { return { label: k, sum: gm[k], share: total ? gm[k] / total : 0 }; }).sort(function (x, y2) { return y2.sum - x.sum; }).map(function (o, i) { o.color = pal[i % pal.length]; return o; });
        }
        if (items.length > 8) { var rest = items.slice(7), rs = rest.reduce(function (t, o) { return t + o.sum; }, 0); items = items.slice(0, 7).concat([{ label: 'سایر', sum: rs, share: total ? rs / total : 0, color: '#8e8e93' }]); }
        return { tab: tab, by: 'cat', label: per.label, total: total, items: items };
      }
    };
    function hkAsstChartText(res) {
      var nm = res.tab === 'income' ? 'درآمد' : 'هزینه';
      if (!res.total) return 'برای ' + res.label + ' هنوز ' + nm + 'ای ثبت نشده که نمودارش رو بکشم.';
      return hkAsstPick(['اینم نمودار ' + nm + ' ' + res.label + '؛ جمعش ' + hkAsstMoney(res.total) + ' شده.', 'نمودار ' + nm + ' ' + res.label + ' آماده‌ست. جمع کل: ' + hkAsstMoney(res.total) + '.']);
    }
    function hkAsstChartIntent(T) {
      if (!/نمودار|چارت|گراف|نمایش گرافیکی|پای چارت/.test(T)) return null;
      var tb = hkAsstTabIn(T) || 'expense', ms = hkAsstMonthsIn(T), a = { tab: tb, by: 'cat' };
      var yearM = /(^| )(\d{4})( |$)/.exec(hkAsstFaDigits(T));
      if (/امسال|این سال/.test(T)) a.year = hkAsstCY();
      else if (/پارسال|سال (قبل|گذشته|پیش)/.test(T)) a.year = hkAsstCY() - 1;
      else if (yearM && +yearM[2] > 1300) a.year = +yearM[2];
      if (ms.length) { a.month = ms[0]; a.year = a.year || hkAsstYearFor(ms[0]); }
      else if (/(این|همین) ماه|ماه جاری/.test(T) || (!a.year && !/سال|ماهانه|هر ماه/.test(T))) { a.month = hkAsstCM(); a.year = hkAsstCY(); }
      else if (/ماه (قبل|پیش|گذشته)/.test(T)) { var pm = hkAsstCM() === 1 ? 12 : hkAsstCM() - 1; a.month = pm; a.year = hkAsstCM() === 1 ? hkAsstCY() - 1 : hkAsstCY(); }
      if (/روزانه|هر روز|روزها|روز به روز|روز ?به ?روز/.test(T)) a.by = 'day';
      else if (/ماهانه|هر ماه|ماه ?به ?ماه|سالانه/.test(T) || (a.year && !a.month)) { a.by = 'month'; delete a.month; }
      return { tool: 'insights.chart', args: a, explain: 'chart', understood: '', followUps: [], corrections: [] };
    }
