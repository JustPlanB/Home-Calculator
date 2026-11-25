    /* ===== ۱.۴.۲۴: دستیار هوشمند — ابزارها (فقط خواندنی) =====
       مرز جداسازی: این فایل تنها بخشی از دستیار است که به داده‌های برنامه وصل است. آنچه از برنامه می‌خواند:
       archive، periodData، currentYear، currentMonth، periodKey، iterAllPeriodData، rowFinancialContext، loadFinancialSubjects، formatNum، toPersianDigits. (برای آواتار: hkAvatarGet، hkMainTitle در 18.)
       اگر دستیار جدا شود، همین فهرست باید از راه یک «درگاه داده» (شیء با تابع‌های rows و format) تأمین شود. 18f مستقل است.
       هر ابزار فقط می‌خواند؛ هیچ داده‌ای تغییر نمی‌کند. ردیف‌ها از iterAllPeriodData می‌آیند
       (ماه جاری یک بار، از periodData؛ ردیف‌های حذف‌شده کنار گذاشته می‌شوند).
       ورودی‌ها بر اساس HK_ASST_TOOLS اعتبارسنجی می‌شوند؛ ابزار ناشناس یا تغییردهنده اجرا نمی‌شود. */
    function hkAsstNorm(s) {
      return String(s == null ? '' : s)
        .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
        .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
        .replace(/‌/g, ' ').replace(/‏|‎/g, '')
        .replace(/\s+/g, ' ').trim().toLowerCase();
    }
    /* همهٔ ردیف‌های فعال مخارج و درآمد، همهٔ ماه‌ها. فقط فیلدهای لازم (بدون ارجاع به خود ردیف) */
    function hkAsstRows() {
      var out = [], curKey = periodKey(currentYear, currentMonth);
      iterAllPeriodData(function (pd, key) {
        var parts = String(key).split('-'), y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
        ['expense', 'income'].forEach(function (tab) {
          var side = pd && pd[tab];
          if (!side || !Array.isArray(side.sections)) return;
          side.sections.forEach(function (sec) {
            (sec && sec.rows || []).forEach(function (r, ri) {
              if (!r || typeof r !== 'object' || r.deletedAt) return;
              /* ۱.۴.۴۱: ردیف کاملاً خالی (جای‌نگهدار برنامه) هرگز ردیف حساب نمی‌شود */
              if (!String(r.desc || '').trim() && !(Number(r.amount) || 0) && !(parseInt(r.day, 10) || 0)) return;
              var d = parseInt(r.day, 10) || 0, ctx = null, ri = arguments[1];
              try { ctx = rowFinancialContext(r); } catch (eC) { ctx = null; }
              out.push({
                id: String(r.id || ''), key: key, y: y, m: m, d: d, dateKey: y * 10000 + m * 100 + d,
                tab: tab, section: String(sec.title || ''), secId: String(sec.id || ''), idx: ri, desc: String(r.desc || ''),
                amount: Number(r.amount) || 0, account: String(r.account || ''), status: String(r.status || ''),
                transfer: !!r.p2p, cats: Array.isArray(r.cats) ? r.cats.slice() : [], context: ctx && ctx.accountType === 'project' ? 'project' : 'personal', subjectId: ctx ? String(ctx.subjectId || 'personal') : 'personal',
                subject: ctx ? String(ctx.subjectName || '') : '', current: key === curKey
              });
            });
          });
        });
      });
      return out;
    }
    /* ۱.۴.۴۳: تطبیق «واژهٔ کامل» (نه زیررشته): «نان» با «دانانو» نمی‌خواند. شرح و بخش ردیف به واژه شکسته می‌شود و هر واژه با جمع/عامیانهٔ ساده (ها، های، ا، ای) پذیرفته می‌شود */
    function hkAsstRowTokens(r) {
      if (r._hkTok) return r._hkTok;
      var t = hkAsstNorm(String(r.desc || '') + ' ' + String(r.section || '')).replace(/[،,.؛:!؟?()\[\]\-_\/\\]/g, ' ').split(' ').map(hkAsstKey).filter(Boolean);
      try { r._hkTok = t; } catch (e) {}
      return t;
    }
    function hkAsstTokEq(tok, w) { return tok === w || (w.length >= 2 && (tok === w + 'ها' || tok === w + 'های' || tok === w + 'ا' || tok === w + 'ای')); }
    function hkAsstHasWord(tokens, w) { for (var i = 0; i < tokens.length; i++) if (hkAsstTokEq(tokens[i], w)) return true; return false; }
    /* عبارت چندواژه‌ای به‌صورت پشت‌سرهم (برای «بدون قبض آب») */
    function hkAsstHasPhrase(tokens, words) {
      if (!words.length) return false;
      for (var i = 0; i + words.length <= tokens.length; i++) { var ok = true; for (var j = 0; j < words.length; j++) if (!hkAsstTokEq(tokens[i + j], words[j])) { ok = false; break; } if (ok) return true; }
      return false;
    }
    function hkAsstFilter(rows, f) {
      f = f || {};
      var text = hkAsstNorm(f.text).split(' ').filter(Boolean);
      var acct = hkAsstNorm(f.account);
      /* هر عضو اجتماع مثل text است: همهٔ کلمه‌های همان عضو باید در ردیف باشند؛ ردیف با هر عضو بخواند عبور می‌کند */
      var anyT = (f.textAny || []).map(function (x) { return hkAsstNorm(x).split(' ').filter(Boolean).map(hkAsstKey); }).filter(function (ws) { return ws.length; });
      var exT = (f.excludeText || []).map(function (x) { return hkAsstNorm(x).split(' ').map(hkAsstKey).filter(Boolean); }).filter(function (w) { return w.length; }), exC = f.excludeCats || [];
      var from = f.dateFrom ? hkAsstDateKey(f.dateFrom) : null, to = f.dateTo ? hkAsstDateKey(f.dateTo) : null;
      return rows.filter(function (r) {
        /* ۱.۴.۴۱: فقط ردیف‌های دارای مبلغ تراکنش شمرده می‌شوند؛ ردیف ناقص (بی‌مبلغ) فقط با keepDrafts برای گزارش جدا می‌آید */
        if (!f.keepDrafts && r.amount === 0 && f.amountEq == null) return false;
        if (!f.includeTransfers && r.transfer) return false;
        if (exT.length || exC.length) {
          var rt = hkAsstRowTokens(r);
          for (var ei = 0; ei < exT.length; ei++) if (hkAsstHasPhrase(rt, exT[ei])) return false;
          for (var ci = 0; ci < exC.length; ci++) if (hkAsstCatHit(r, exC[ci])) return false;
        }
        if (text.length) {
          var tk = hkAsstRowTokens(r);
          for (var i = 0; i < text.length; i++) if (!hkAsstHasWord(tk, hkAsstKey(text[i]))) return false;
        }
        if (f.amountEq != null && r.amount !== Number(f.amountEq)) return false;
        if (f.amountMin != null && r.amount < Number(f.amountMin)) return false;
        if (f.amountMax != null && r.amount > Number(f.amountMax)) return false;
        if (f.amountGt != null && !(r.amount > Number(f.amountGt))) return false;
        if (f.amountLt != null && !(r.amount < Number(f.amountLt))) return false;
        if (f.year != null && r.y !== Number(f.year)) return false;
        if (f.month != null && r.m !== Number(f.month)) return false;
        if (from != null && r.dateKey < from) return false;
        if (to != null && r.dateKey > to) return false;
        if (f.tab && r.tab !== f.tab) return false;
        if (f.status === 'unpaid' && r.status !== 'unpaid') return false;
        if (f.transferOnly && !r.transfer) return false;
        if (f.context && r.context !== f.context) return false;
        /* ۱.۴.۴۵: «برنج و نان / برنج یا نان»: اجتماع (OR)؛ ردیفی که با هر دو می‌خواند فقط یک بار شمرده می‌شود. با unionCats دسته‌ها هم عضو همین اجتماع‌اند (نه اشتراک) */
        var anyHit = true;
        if (anyT.length) {
          var tkA = hkAsstRowTokens(r);
          anyHit = anyT.some(function (ws) { return ws.every(function (w) { return hkAsstHasWord(tkA, w); }); });
          if (!anyHit && f.unionCats && f.cats && f.cats.length) anyHit = f.cats.some(function (c) { return hkAsstCatHit(r, c); });
          if (!anyHit) return false;
        }
        if (f.cats && f.cats.length && !(anyT.length && f.unionCats) && !f.cats.some(function (c) { return hkAsstCatHit(r, c); })) return false;
        if (f.project && !hkAsstRowIsProject(r, f.project)) return false;
        if (acct && hkAsstNorm(r.account).indexOf(acct) < 0) return false;
        return true;
      });
    }
    /* آیا ردیف به دسته تعلق دارد؟ برچسب ذخیره‌شده روی ردیف، یا یکی از مترادف‌های دسته در شرح/بخش */
    var HK_ASST_CATKEYS = {};
    function hkAsstCatHit(r, catId) {
      if (r.cats && r.cats.indexOf(catId) >= 0) return true;
      /* کلیدهای مترادف‌ها یک بار ساخته می‌شود (تحلیل‌ها این تابع را برای هزاران ردیف صدا می‌زنند) */
      var keys = HK_ASST_CATKEYS[catId];
      if (!keys) { keys = HK_ASST_CATKEYS[catId] = (HK_ASST_PHRASES['CAT_' + catId] || []).map(hkAsstKey).filter(function (k) { return k.length >= 3; }); }
      var hay = hkAsstKey(r.desc + ' ' + r.section);
      for (var i = 0; i < keys.length; i++) if (hay.indexOf(keys[i]) >= 0) return true;
      return false;
    }
    /* پروژه‌های برنامه: [{id, name, key}] */
    function hkAsstSubjects() {
      var list = [];
      try { (loadFinancialSubjects() || []).forEach(function (s) { if (s && s.name) list.push({ id: String(s.id), name: String(s.name), key: hkAsstKey(s.name) }); }); } catch (e) {}
      return list;
    }
    /* آیا یک کلمه به نام یک پروژه اشاره دارد؟ (تطبیق کامل نام، یا یکی از کلمه‌های نام با طول کافی) */
    function hkAsstFindSubject(word) {
      var k = hkAsstKey(word); if (k.length < 3) return null;
      var subs = hkAsstSubjects(), hit = null;
      subs.forEach(function (s) {
        if (hit) return;
        if (s.key === k) hit = s;
        else if (s.name.split(/\s+/).some(function (x) { return hkAsstKey(x) === k && k.length >= 3; })) hit = s;
      });
      return hit;
    }
    /* ردیف به پروژهٔ داده‌شده (شناسه یا نام) تعلق دارد؟ */
    function hkAsstRowIsProject(r, project) {
      var pk = hkAsstKey(project);
      if (r.subjectId && r.subjectId !== 'personal' && (r.subjectId === project || hkAsstKey(r.subject) === pk)) return true;
      return hkAsstKey(r.subject) === pk && r.context === 'project';
    }
    /* واژه‌های یکتای شرح و بخش ردیف‌ها (برای اصلاح غلط‌تایپی جست‌وجو) */
    function hkAsstDataWords() {
      var seen = {}, out = [];
      hkAsstRows().forEach(function (r) {
        String(r.desc + ' ' + r.section).split(/[\s،,.؟?!()\-]+/).forEach(function (w) {
          var k = hkAsstKey(w);
          if (k.length < 3 || /\d/.test(k) || seen[k]) return;
          seen[k] = 1; out.push({ key: k, word: w });
        });
      });
      return out;
    }
    function hkAsstDateKey(v) {
      if (v && typeof v === 'object') return (+v.y) * 10000 + (+v.m) * 100 + (+v.d);
      var p = String(v).split('-');
      return (parseInt(p[0], 10) || 0) * 10000 + (parseInt(p[1], 10) || 0) * 100 + (parseInt(p[2], 10) || 0);
    }
    function hkAsstPublic(r) {
      return { id: r.id, month: r.y + '-' + r.m, y: r.y, m: r.m, day: r.d, tab: r.tab, section: r.section, secId: r.secId, idx: r.idx, desc: r.desc,
        amount: r.amount, account: r.account, context: r.context, subject: r.subject, transfer: r.transfer, status: r.status };
    }
    function hkAsstSum(rows) {
      var s = 0; rows.forEach(function (r) { s += r.amount; }); return s;
    }
    function hkAsstStats(rows) {
      var inc = 0, exp = 0, min = null, max = null, uI = 0, uE = 0, uN = 0, incomplete = 0, mat = [];
      rows.forEach(function (r) {
        if (r.amount === 0) { incomplete++; return; }
        mat.push(r);
        if (r.tab === 'income') inc += r.amount; else exp += r.amount;
        if (r.status === 'unpaid') { uN++; if (r.tab === 'income') uI += r.amount; else uE += r.amount; }
        if (min === null || r.amount < min) min = r.amount;
        if (max === null || r.amount > max) max = r.amount;
      });
      var n = mat.length;
      return { count: n, sum: hkAsstSum(mat), avg: n ? Math.round(hkAsstSum(mat) / n) : 0,
        min: min === null ? 0 : min, max: max === null ? 0 : max, incomeSum: inc, expenseSum: exp, balance: inc - exp,
        incomplete: incomplete, unpaidCount: uN, unpaidIncome: uI, unpaidExpense: uE };
    }

    /* ابزارهای ثبت‌شده. هر ابزار: کلیدهای مجاز ورودی، و تابع اجرا که فقط داده برمی‌گرداند. */
    /* ۱.۴.۴۱: عدد «کارت اصلی» (همان منطق داشبورد) فقط برای ماهی که برنامه الان نشان می‌دهد و بدون هیچ فیلتر دیگر؛ وگرنه null و پاسخ طبق همهٔ ردیف‌هاست */
    function hkAsstCardInfo(a, stats, rows) {
      try {
        if (!a || (a.tab !== 'expense' && a.tab !== 'income')) return null;
        if (a.text || (a.textAny && a.textAny.length) || (a.excludeText && a.excludeText.length) || (a.excludeCats && a.excludeCats.length) || (a.cats && a.cats.length) || a.project || a.account || a.context || a.status || a.transferOnly || a.includeTransfers ||
            a.amountEq != null || a.amountMin != null || a.amountMax != null || a.amountGt != null || a.amountLt != null || a.dateFrom || a.dateTo) return null;
        if (!a.year || !a.month || +a.year !== currentYear || +a.month !== currentMonth) return null;
        if (typeof personTotals !== 'function' || typeof hkMainTitle !== 'function') return null;
        var title = hkMainTitle(); if (!title) return null;
        var t = personTotals(title), isE = a.tab === 'expense';
        var total = Number(isE ? t.expenseTotal : t.incomeTotal) || 0, unpaid = Number(isE ? t.expenseUnpaid : t.incomeUnpaid) || 0;
        var all = isE ? stats.expenseSum : stats.incomeSum, nk = function (x) { return String(x || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c]+/g, ''); };
        var tk = nk(title), proj = 0, other = 0;
        rows.forEach(function (r) { if (r.amount === 0) return; if (r.context === 'project') proj++; if (nk(r.section) !== tk) other++; });
        return { total: total, unpaid: unpaid, allTotal: all, projectRows: proj, otherSectionRows: other };
      } catch (e) { return null; }
    }
    /* ۱.۴.۴۳: «واژهٔ ناشناخته» = واژه‌ای که نه کد واژه‌نامه (دسته/نوع/ماه…) است، نه نام پروژه، نه در هیچ شرح/بخش/حساب/پروژهٔ هیچ ردیفی هست.
       نبودِ نتیجه به‌تنهایی ناشناخته بودن نیست: دسته‌ای مثل «بهداشت» یا واژه‌ای مثل «اسنپ» که فقط در ماه‌های دیگر آمده، معتبر است. */
    function hkAsstHayAll() {
      var parts = [];
      try { hkAsstRows().forEach(function (r) { parts.push(r.desc + ' ' + r.section + ' ' + r.account + ' ' + r.subject); }); } catch (e) {}
      return hkAsstKey(parts.join(' | ').replace(/\s+/g, ' '));
    }
    function hkAsstTermKnown(w, hay) {
      var k = hkAsstKey(w); if (k.length < 2 || /\d/.test(w)) return true;
      try { var lk = hkAsstLookup(k); if (lk && !(lk === 'MAX' && hkAsstIsDegree(k))) return true; } catch (e) {}
      try { if (hkAsstFindSubject(w)) return true; } catch (e2) {}
      return hay.indexOf(k) >= 0;
    }
    /* فهرست واژه‌های ناشناختهٔ شرط متنی و شرط «بدون/به‌جز»؛ در جست‌وجوی صریح («پیدا کن/سرچ») شرط متنیِ مثبت ناشناخته مجاز است و «چیزی پیدا نکردم» درست است */
    function hkAsstUnknownTerms(cmd, explicitSearch) {
      if (!cmd || !cmd.args || !/^transactions\.(aggregate|search|group)$/.test(cmd.tool || '')) return [];
      var a = cmd.args, words = [], hay = null, out = [];
      if (a.text && !explicitSearch) String(a.text).split(/\s+/).forEach(function (w) { if (w) words.push(w); });
      (a.excludeText || []).forEach(function (t) { String(t).split(/\s+/).forEach(function (w) { if (w) words.push(w); }); });
      if (!explicitSearch) (a.textAny || []).forEach(function (t) { String(t).split(/\s+/).forEach(function (w) { if (w) words.push(w); }); });
      if (!words.length) return [];
      hay = hkAsstHayAll();
      words.forEach(function (w) { if (!hkAsstTermKnown(w, hay) && out.indexOf(w) < 0) out.push(w); });
      return out;
    }
    var HK_ASST_TOOLS = {
      'transactions.search': {
        readOnly: true, args: ['text', 'textAny', 'unionCats', 'excludeText', 'excludeCats', 'cats', 'project', 'account', 'tab', 'context', 'amountEq', 'amountMin', 'amountMax', 'amountGt', 'amountLt', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers', 'status', 'transferOnly', 'sort', 'limit'],
        run: function (a) {
          var rows = hkAsstFilter(hkAsstRows(), a);
          if (a.sort === 'amountDesc') rows.sort(function (x, y) { return y.amount - x.amount; });
          else if (a.sort === 'amountAsc') rows.sort(function (x, y) { return x.amount - y.amount; });
          else if (a.sort === 'dateAsc') rows.sort(function (x, y) { return x.dateKey - y.dateKey; });
          else rows.sort(function (x, y) { return y.dateKey - x.dateKey; });
          var lim = Math.min(Math.max(parseInt(a.limit, 10) || 50, 1), 200);
          var inc = hkAsstFilter(hkAsstRows(), Object.assign({}, a, { keepDrafts: true })).filter(function (r) { return r.amount === 0; }).length;
          return { count: rows.length, total: hkAsstSum(rows), incomplete: inc, items: rows.slice(0, lim).map(hkAsstPublic) };
        }
      },
      'transactions.get': {
        readOnly: true, args: ['id'],
        run: function (a) {
          var id = String(a.id || '');
          if (!id) throw new Error('شناسه داده نشده است');
          var hit = hkAsstRows().filter(function (r) { return r.id === id; })[0];
          return hit ? { found: true, item: hkAsstPublic(hit) } : { found: false };
        }
      },
      'transactions.aggregate': {
        readOnly: true, args: ['text', 'textAny', 'unionCats', 'excludeText', 'excludeCats', 'cats', 'project', 'account', 'tab', 'context', 'amountEq', 'amountMin', 'amountMax', 'amountGt', 'amountLt', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers', 'status', 'transferOnly'],
        run: function (a) {
          var rows = hkAsstFilter(hkAsstRows(), Object.assign({}, a, { keepDrafts: true }));
          var st = hkAsstStats(rows);
          st.card = hkAsstCardInfo(a, st, rows);
          return st;
        }
      },
      'transactions.group': {
        readOnly: true, args: ['by', 'text', 'textAny', 'unionCats', 'excludeText', 'excludeCats', 'cats', 'project', 'account', 'tab', 'context', 'amountMin', 'amountMax', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers', 'status', 'transferOnly'],
        run: function (a) {
          var by = a.by;
          if (['month', 'section', 'account', 'tab', 'context'].indexOf(by) < 0) throw new Error('گروه‌بندی نامعتبر');
          var groups = {};
          hkAsstFilter(hkAsstRows(), a).forEach(function (r) {
            var k = by === 'month' ? (r.y + '-' + (r.m < 10 ? '0' : '') + r.m) : (by === 'tab' ? r.tab : (r[by] || '—'));
            var g = groups[k] || (groups[k] = { key: k, count: 0, sum: 0 });
            g.count++; g.sum += r.amount;
          });
          var list = Object.keys(groups).map(function (k) { return { key: groups[k].key, count: groups[k].count, sum: groups[k].sum }; });
          list.sort(function (x, y) { return by === 'month' ? (x.key < y.key ? -1 : 1) : y.sum - x.sum; });
          return { by: by, groups: list.slice(0, 50) };
        }
      },
      'projects.list': {
        readOnly: true, args: [],
        run: function () {
          var rows = hkAsstRows().filter(function (r) { return !r.transfer && r.subjectId !== 'personal'; });
          return { projects: hkAsstSubjects().map(function (s) {
            var mine = rows.filter(function (r) { return r.subjectId === s.id; });
            var st = hkAsstStats(mine);
            return { id: s.id, name: s.name, count: st.count, expenseSum: st.expenseSum, incomeSum: st.incomeSum, balance: st.balance };
          }) };
        }
      },
      'projects.summary': {
        readOnly: true, args: ['project'],
        run: function (a) {
          var p = String(a.project || '').trim();
          if (!p) throw new Error('نام پروژه داده نشده است');
          var subs = hkAsstSubjects();
          var sub = subs.filter(function (s) { return s.id === p || s.key === hkAsstKey(p); })[0];
          if (!sub) throw new Error('پروژه‌ای با این نام پیدا نشد');
          var rows = hkAsstFilter(hkAsstRows(), { project: sub.name });
          return Object.assign({ id: sub.id, name: sub.name }, hkAsstStats(rows));
        }
      },
      'categories.summary': {
        readOnly: true, args: [],
        run: function () {
          var cats = [], hidden = [], custom = [];
          try { hidden = JSON.parse(localStorage.getItem(STORAGE_KEY + '_catHidden') || '[]') || []; } catch (e1) {}
          try { custom = (JSON.parse(localStorage.getItem(STORAGE_KEY + '_catCustom') || '[]') || []).map(function (c) { return String(c.label || ''); }).filter(Boolean); } catch (e2) {}
          Object.keys(HK_ASST_CAT_LABELS).forEach(function (id) { if (hidden.indexOf(id) < 0) cats.push(HK_ASST_CAT_LABELS[id]); });
          var used = {};
          hkAsstRows().forEach(function (r) { if (!r.transfer) Object.keys(HK_ASST_CAT_LABELS).forEach(function (id) { if (hkAsstCatHit(r, id)) used[id] = (used[id] || 0) + 1; }); });
          return { builtIn: cats, custom: custom, total: cats.length + custom.length, usedBuiltIn: Object.keys(used).length };
        }
      },
      'accounts.list': {
        readOnly: true, args: [],
        run: function () {
          var m = {};
          hkAsstRows().forEach(function (r) { if (!r.transfer && r.account) { var k = r.account.trim(); m[k] = (m[k] || 0) + 1; } });
          var list = Object.keys(m).map(function (k) { return { name: k, count: m[k] }; });
          list.sort(function (a, b) { return b.count - a.count; });
          return { accounts: list };
        }
      },
      'months.summary': {
        readOnly: true, args: [],
        run: function () {
          var months = {};
          hkAsstRows().forEach(function (r) { var k = r.y * 100 + r.m; months[k] = (months[k] || 0) + 1; });
          var keys = Object.keys(months).map(Number).sort(function (a, b) { return a - b; });
          return { count: keys.length, first: keys.length ? [Math.floor(keys[0] / 100), keys[0] % 100] : null, last: keys.length ? [Math.floor(keys[keys.length - 1] / 100), keys[keys.length - 1] % 100] : null };
        }
      },
      'reports.compare': {
        readOnly: true, args: ['a', 'b', 'tab', 'context', 'text', 'cats'],
        run: function (a) {
          function one(p) {
            var f = { year: p.year, month: p.month, tab: a.tab, context: a.context, text: a.text, cats: a.cats };
            var s = hkAsstStats(hkAsstFilter(hkAsstRows(), f));
            return { label: p.year + '-' + p.month, count: s.count, incomeSum: s.incomeSum, expenseSum: s.expenseSum, balance: s.balance };
          }
          if (!a.a || !a.b) throw new Error('دو ماه برای مقایسه لازم است');
          return { a: one(a.a), b: one(a.b) };
        }
      }
    };
    /* اعتبارسنجی و اجرای ابزار: فقط ابزار ثبت‌شدهٔ خواندنی، فقط کلیدهای مجاز */
    function hkAsstExec(name, args) {
      var t = Object.prototype.hasOwnProperty.call(HK_ASST_TOOLS, name) ? HK_ASST_TOOLS[name] : null;
      if (!t || !t.readOnly) return { ok: false, error: 'این ابزار مجاز نیست' };
      var a = {};
      Object.keys(args || {}).forEach(function (k) { if (t.args.indexOf(k) >= 0) a[k] = args[k]; });
      try { return { ok: true, tool: name, result: t.run(a) }; }
      catch (e) { return { ok: false, error: String(e && e.message || 'خطا') }; }
    }
