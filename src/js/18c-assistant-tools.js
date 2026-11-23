    /* ===== ۱.۴.۲۴: دستیار هوشمند — ابزارها (فقط خواندنی) =====
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
            (sec && sec.rows || []).forEach(function (r) {
              if (!r || typeof r !== 'object' || r.deletedAt) return;
              var d = parseInt(r.day, 10) || 0, ctx = null;
              try { ctx = rowFinancialContext(r); } catch (eC) { ctx = null; }
              out.push({
                id: String(r.id || ''), key: key, y: y, m: m, d: d, dateKey: y * 10000 + m * 100 + d,
                tab: tab, section: String(sec.title || ''), desc: String(r.desc || ''),
                amount: Number(r.amount) || 0, account: String(r.account || ''), status: String(r.status || ''),
                transfer: !!r.p2p, context: ctx && ctx.accountType === 'project' ? 'project' : 'personal',
                subject: ctx ? String(ctx.subjectName || '') : '', current: key === curKey
              });
            });
          });
        });
      });
      return out;
    }
    function hkAsstFilter(rows, f) {
      f = f || {};
      var text = hkAsstNorm(f.text).split(' ').filter(Boolean);
      var acct = hkAsstNorm(f.account);
      var from = f.dateFrom ? hkAsstDateKey(f.dateFrom) : null, to = f.dateTo ? hkAsstDateKey(f.dateTo) : null;
      return rows.filter(function (r) {
        if (!f.includeTransfers && r.transfer) return false;
        if (text.length) {
          var hay = hkAsstNorm(r.desc + ' ' + r.section);
          for (var i = 0; i < text.length; i++) if (hay.indexOf(text[i]) < 0) return false;
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
        if (f.context && r.context !== f.context) return false;
        if (acct && hkAsstNorm(r.account).indexOf(acct) < 0) return false;
        return true;
      });
    }
    function hkAsstDateKey(v) {
      if (v && typeof v === 'object') return (+v.y) * 10000 + (+v.m) * 100 + (+v.d);
      var p = String(v).split('-');
      return (parseInt(p[0], 10) || 0) * 10000 + (parseInt(p[1], 10) || 0) * 100 + (parseInt(p[2], 10) || 0);
    }
    function hkAsstPublic(r) {
      return { id: r.id, month: r.y + '-' + r.m, day: r.d, tab: r.tab, section: r.section, desc: r.desc,
        amount: r.amount, account: r.account, context: r.context, subject: r.subject, transfer: r.transfer, status: r.status };
    }
    function hkAsstSum(rows) {
      var s = 0; rows.forEach(function (r) { s += r.amount; }); return s;
    }
    function hkAsstStats(rows) {
      var inc = 0, exp = 0, min = null, max = null;
      rows.forEach(function (r) {
        if (r.tab === 'income') inc += r.amount; else exp += r.amount;
        if (min === null || r.amount < min) min = r.amount;
        if (max === null || r.amount > max) max = r.amount;
      });
      var n = rows.length;
      return { count: n, sum: hkAsstSum(rows), avg: n ? Math.round(hkAsstSum(rows) / n) : 0,
        min: min === null ? 0 : min, max: max === null ? 0 : max, incomeSum: inc, expenseSum: exp, balance: inc - exp };
    }

    /* ابزارهای ثبت‌شده. هر ابزار: کلیدهای مجاز ورودی، و تابع اجرا که فقط داده برمی‌گرداند. */
    var HK_ASST_TOOLS = {
      'transactions.search': {
        readOnly: true, args: ['text', 'account', 'tab', 'context', 'amountEq', 'amountMin', 'amountMax', 'amountGt', 'amountLt', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers', 'sort', 'limit'],
        run: function (a) {
          var rows = hkAsstFilter(hkAsstRows(), a);
          if (a.sort === 'amountDesc') rows.sort(function (x, y) { return y.amount - x.amount; });
          else rows.sort(function (x, y) { return y.dateKey - x.dateKey; });
          var lim = Math.min(Math.max(parseInt(a.limit, 10) || 50, 1), 200);
          return { count: rows.length, total: hkAsstSum(rows), items: rows.slice(0, lim).map(hkAsstPublic) };
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
        readOnly: true, args: ['text', 'account', 'tab', 'context', 'amountEq', 'amountMin', 'amountMax', 'amountGt', 'amountLt', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers'],
        run: function (a) { return hkAsstStats(hkAsstFilter(hkAsstRows(), a)); }
      },
      'transactions.group': {
        readOnly: true, args: ['by', 'text', 'account', 'tab', 'context', 'amountMin', 'amountMax', 'year', 'month', 'dateFrom', 'dateTo', 'includeTransfers'],
        run: function (a) {
          var by = a.by;
          if (['month', 'section', 'account', 'tab', 'context'].indexOf(by) < 0) throw new Error('گروه‌بندی نامعتبر');
          var groups = {};
          hkAsstFilter(hkAsstRows(), a).forEach(function (r) {
            var k = by === 'month' ? (r.y + '-' + (r.m < 10 ? '0' : '') + r.m) : (by === 'tab' ? r.tab : (r[by] || '—'));
            var g = groups[k] || (groups[k] = { key: k, count: 0, sum: 0, rows: [] });
            g.count++; g.sum += r.amount;
          });
          var list = Object.keys(groups).map(function (k) { return { key: groups[k].key, count: groups[k].count, sum: groups[k].sum }; });
          list.sort(function (x, y) { return by === 'month' ? (x.key < y.key ? -1 : 1) : y.sum - x.sum; });
          return { by: by, groups: list.slice(0, 50) };
        }
      },
      'reports.compare': {
        readOnly: true, args: ['a', 'b', 'tab', 'context', 'text'],
        run: function (a) {
          function one(p) {
            var f = { year: p.year, month: p.month, tab: a.tab, context: a.context, text: a.text };
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
