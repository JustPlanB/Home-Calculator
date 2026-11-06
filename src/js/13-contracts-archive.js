    /* —— ۱.۳.۵۵: جدول ماه‌به‌ماه آرشیو قرارداد ——
       نوع قرارداد: «ابتدای ماه» (اولین واریز همان روز شروع) یا «پایان ماه» (اولین واریز یک ماه بعد از شروع)؛
       از اولین واریز وصل‌شده خودکار تشخیص داده می‌شود. ردیف ماه k = سررسید ماه k؛ «بابت» در پایان ماه = ماه قبلِ سررسید */
    function recTiming(item) { return item && item.payTiming === 'end' ? 'end' : 'start'; }
    function recDueDay(item) { return parseInt(toEnglishDigits(String((item && (item.day || (item.contractStart && item.contractStart.d))) || '')), 10) || 1; }
    function recLastKeyOf(item, end) {
      if (!end || !end.y || !end.m) return 0;
      var e = recMonthKey(end.y, end.m), ed = parseInt(end.d, 10) || 0, due = recDueDay(item);
      if (!ed) return e;
      return ed >= due ? e : recPrevKey(e);
    }
    function recPayDateOf(x) {
      var r = x.row, ro = r.receivedOn;
      if (ro && ro.y && ro.m) return { y: ro.y, m: ro.m, d: ro.d || parseInt(r.day, 10) || 1 };
      return { y: Math.floor(x.key / 100), m: x.key % 100, d: parseInt(toEnglishDigits(String(r.day || '')), 10) || 1 };
    }
    /* از اولین پرداخت (وصل‌شده یا ثبت‌شده در آرشیو) نوع قرارداد را تعیین می‌کند؛ در «پایان ماه» ردیف دریافت‌نشدهٔ ماه شروع حذف می‌شود */
    /* ۱.۳.۵۶: از همان اولین واریز: کمتر از ۱۵ روز بعد از شروع = ابتدای ماه؛ ۱۵ تا ۵۰ روز = پایان ماه.
       از سومین واریز به بعد، اگر همهٔ واریزها با فرض دیگر خیلی جورترند، خودکار اصلاح می‌شود */
    function recTimingFromFirst(item, p) {
      var s = item.contractStart, diff = recDayIndex(p.y, p.m, p.d) - recDayIndex(s.y, s.m, s.d || 1);
      return (diff >= -10 && diff < 15) ? 'start' : (diff >= 15 && diff <= 50) ? 'end' : '';
    }
    function recPaysOf(item) {
      var paid = recArchiveRows(item).filter(function (x) { return recIsPaid(x.row); }).map(recPayDateOf);
      Object.keys(item.extPaid || {}).forEach(function (k) { var e = item.extPaid[k]; if (e && e.y) paid.push({ y: e.y, m: e.m, d: e.d }); });
      paid.sort(function (a, b) { return recDayIndex(a.y, a.m, a.d) - recDayIndex(b.y, b.m, b.d); });
      return paid;
    }
    /* سررسیدهای قرارداد با فرض نوع t */
    function recDueList(item, t, n) {
      var s = item.contractStart, due = recDueDay(item), k0 = recMonthKey(s.y, s.m), out = [];
      if (t === 'end') k0 = recNextKey(k0);
      for (var k = k0, g = 0; g < (n || 120); g++, k = recNextKey(k)) out.push({ k: k, i: recDayIndex(Math.floor(k / 100), k % 100, Math.min(due, recMonthLen(k % 100))) });
      return out;
    }
    /* هم‌ترازی به ترتیب (واریزها و سررسیدها هر دو به ترتیب زمان؛ ماه جاافتاده و واریز اضافه مجاز): [{cost, at:[اندیس سررسید یا -1]}] */
    function recAlign(pis, dues, lims) {
      var n = pis.length, m = dues.length, INF = 1e9, SKIP_P = 25, SKIP_D = 6;
      var D = [], B = [];
      for (var i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(INF)); B.push(new Array(m + 1).fill(0)); }
      D[0][0] = 0;
      for (var j = 1; j <= m; j++) { D[0][j] = D[0][j - 1] + SKIP_D; B[0][j] = 2; }
      for (i = 1; i <= n; i++) {
        D[i][0] = D[i - 1][0] + SKIP_P; B[i][0] = 1;
        for (j = 1; j <= m; j++) {
          var best = D[i - 1][j] + SKIP_P, how = 1;
          if (D[i][j - 1] + SKIP_D < best) { best = D[i][j - 1] + SKIP_D; how = 2; }
          var d = Math.abs(pis[i - 1] - dues[j - 1].i);
          if (d <= (lims ? lims[i - 1] : 20) && D[i - 1][j - 1] + d < best) { best = D[i - 1][j - 1] + d; how = 3; }
          D[i][j] = best; B[i][j] = how;
        }
      }
      /* پایان: هر تعداد سررسید آخر بی‌واریز رایگان (ماه‌های آینده) */
      var bj = 0, bc = INF; for (j = 0; j <= m; j++) if (D[n][j] < bc) { bc = D[n][j]; bj = j; }
      var at = new Array(n).fill(-1); i = n; j = bj;
      while (i > 0 || j > 0) { var h = B[i][j]; if (h === 3) { at[i - 1] = j - 1; i--; j--; } else if (h === 1) i--; else j--; }
      return { cost: bc, at: at };
    }
    function recTimingCost(item, pays, t) {
      var pis = pays.map(function (p) { return recDayIndex(p.y, p.m, p.d); });
      return recAlign(pis, recDueList(item, t, Math.max(24, pays.length + 6))).cost;
    }
    function recInferTiming(item, firstPay) {
      if (!item || !item.contractStart || !item.contractStart.y) return false;
      var pays = recPaysOf(item);
      if (firstPay && !pays.some(function (q) { return q.y === firstPay.y && q.m === firstPay.m && q.d === firstPay.d; })) { pays.push(firstPay); pays.sort(function (a, b) { return recDayIndex(a.y, a.m, a.d) - recDayIndex(b.y, b.m, b.d); }); }
      if (!pays.length) return false;
      var t = recTimingFromFirst(item, pays[0]) || item.payTiming || '';
      if (pays.length >= 3) { var cs = recTimingCost(item, pays, 'start'), ce = recTimingCost(item, pays, 'end'); if (ce + 15 < cs) t = 'end'; else if (cs + 15 < ce) t = 'start'; }
      if (!t || item.payTiming === t) return false;
      item.payTiming = t; item.updatedAt = Date.now();
      if (t === 'end') {
        var sk = recStartKey(item);
        try { recRemoveRows(recRowsOf(item).filter(function (z) { return z.key === sk && !recIsPaid(z.row); })); } catch (e0) {}
      }
      try { saveRecurring(); } catch (e1) {}
      return true;
    }
    /* ماه‌های سررسید یک دورهٔ قرارداد */
    function recTermDueKeys(item, t) {
      if (!t || !t.start || !t.start.y) return [];
      var f = recMonthKey(t.start.y, t.start.m);
      if (recTiming(item) === 'end') f = recNextKey(f);
      /* ۱.۳.۵۸: قرارداد بی‌پایان: سررسید بعدی هم دیده شود (مثلاً موعد فردا = «هنوز موعدش نرسیده») */
      var l = recLastKeyOf(item, t.end) || recNextKey(recTodayKey());
      var out = [], k = f, g = 0;
      while (k <= l && g++ < 120) { out.push(k); k = recNextKey(k); }
      return out;
    }
    function recSchedHtml(item, term, rows) {
      var keys = recTermDueKeys(item, term), today = getTodayPersian(), tIdx = recDayIndex(today.y, today.m, today.d), due = recDueDay(item);
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var dStr = function (d) { return toPersianDigits(String(d.y)) + '/' + p2(d.m) + '/' + p2(d.d); };
      var byKey = {}, extra = [];
      rows.forEach(function (x, i) {
        if (!recIsPaid(x.row)) return;
        var k = parseInt(x.row.recForKey, 10) || x.key;
        if (keys.indexOf(k) < 0) { extra.push({ k: k, x: x, i: i }); return; }
        (byKey[k] = byKey[k] || []).push({ x: x, i: i });
      });
      var stat = { paid: 0, miss: 0, sum: 0 };
      /* ۱.۳.۵۹: هنوز هیچ پرداختی نیامده = اول‌ماهی یا آخرماهی بودن معلوم نیست؛ هر ماه تا موعد دیرتر (آخر همان ماه) صبر می‌کند */
      var _amb = recTiming(item) === 'start' && !recPaysOf(item).length;
      var lab = function (k) { var b = recTiming(item) === 'end' ? recPrevKey(k) : k; return MONTHS[(b % 100) - 1] || ''; };
      var paidTr = function (k, z) {
        var r = z.x.row, d = recPayDateOf(z.x), tag = '';
        var _lb = recLabelFor(item, k, recMonthKey(d.y, d.m)); if (_lb) tag = _lb === 'late' ? 'معوقه' : 'پیش‌پرداخت';
        stat.sum += Number(r.amount) || 0;
        return '<tr class="rec-arch-row is-paid" data-i="' + z.i + '"><td class="rec-sch-k">' + lab(k) + '</td><td class="rec-arch-date">' + dStr(d) + (tag ? '<small class="rec-sch-tag">' + tag + '</small>' : '') + '</td>' +
          '<td class="rec-arch-dcell"><span class="rec-arch-desc">' + escapeHtml(r.desc || item.name || '') + '</span></td><td><span class="pd-amt status-paid">' + formatNum(Number(r.amount) || 0) + '</span></td><td class="rec-arch-acc">' + escapeHtml(r.account || '—') + '</td>' +
          '<td class="rec-arch-x"><button type="button" class="rec-arch-del" data-i="' + z.i + '" aria-label="جدا کردن">×</button></td></tr>';
      };
      /* ۱.۳.۵۵: ستون شرح (یک‌خطی؛ با زدن متن کامل) */
      var h = '<table class="person-detail-table rec-arch-table rec-sch-table"><colgroup><col style="width:19%"><col style="width:21%"><col><col style="width:20%"><col style="width:13%"><col style="width:1.8em"></colgroup>' +
        '<thead><tr><th>بابت</th><th>تاریخ تراکنش</th><th>شرح</th><th>مبلغ</th><th>بانک</th><th></th></tr></thead><tbody>';
      keys.forEach(function (k) {
        var list = byKey[k];
        if (list && list.length) { stat.paid++; list.forEach(function (z) { h += paidTr(k, z); }); return; }
        var ex = (item.extPaid || {})[String(k)];
        if (ex) {
          stat.paid++;
          if (ex.y) { stat.sum += Number(ex.amount) || 0; h += '<tr class="rec-arch-row is-paid rec-sch-ext" data-k="' + k + '"><td class="rec-sch-k">' + lab(k) + '</td><td class="rec-arch-date">' + dStr(ex) + '<small class="rec-sch-tag">فقط آرشیو</small></td><td class="rec-arch-dcell"><span class="rec-arch-desc">' + escapeHtml(item.name || '') + '</span></td><td><span class="pd-amt status-paid">' + formatNum(Number(ex.amount) || 0) + '</span></td><td class="rec-arch-acc">' + escapeHtml(ex.bank || '—') + '</td><td></td></tr>'; }
          else h += '<tr class="rec-arch-row is-paid rec-sch-ext" data-k="' + k + '"><td class="rec-sch-k">' + lab(k) + '</td><td colspan="5" class="rec-sch-st ok">پرداخت شده (بدون پیامک)</td></tr>';
          return;
        }
        var dk = _amb ? recNextKey(k) : k;
        var dIdx = recDayIndex(Math.floor(dk / 100), dk % 100, Math.min(due, recMonthLen(dk % 100)));
        var st, cls = '', btns = '';
        if (dIdx > tIdx) { st = 'هنوز موعدش نرسیده'; cls = 'future'; }
        else if (tIdx - dIdx <= 10) { st = 'در انتظار'; cls = 'wait'; }
        else { st = 'پیدا نشد'; cls = 'miss'; stat.miss++; btns = '<button type="button" class="rec-sch-btn" data-act="link" data-k="' + k + '">وصل دستی</button><button type="button" class="rec-sch-btn" data-act="mark" data-k="' + k + '">پرداخت شده</button>'; }
        h += '<tr class="rec-sch-empty ' + cls + '"><td class="rec-sch-k">' + lab(k) + '</td><td colspan="5" class="rec-sch-st"><span>' + st + '</span>' + btns + '</td></tr>';
      });
      extra.forEach(function (z) { h += paidTr(z.k, z); });
      h += '</tbody></table>';
      return { html: h, stat: stat };
    }
    /* قرارداد قدیمی‌تر از ثبت: واریزهای مربوط از پیامک‌های گوشی پیدا و با تیک تأیید می‌شوند */
    function recScanSmsHistory(item, done) {
      var B = hkBankSmsPlugin();
      done = done || function () {};
      if (!B || typeof B.readInbox !== 'function' || !item || !item.contractStart || !item.contractStart.y) { done(0); return; }
      var amt = Number(item.amount) || 0; if (!amt) { done(0); return; }
      var s = item.contractStart, sIdx = recDayIndex(s.y, s.m, s.d || 1) - 10, t0 = getTodayPersian(), tIdx = recDayIndex(t0.y, t0.m, t0.d);
      var eIdx = item.contractEnd && item.contractEnd.y ? Math.min(tIdx, recDayIndex(item.contractEnd.y, item.contractEnd.m, item.contractEnd.d || 1) + 10) : tIdx;
      B.readInbox({ from: 0, limit: 6000 }).then(function (res) {
        var cands = [], seen = {};
        ((res && res.items) || []).forEach(function (it) {
          try {
            var body = String(it.body || ''); if (!body || hkIsPersonalSender(it.address)) return;
            if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(body)) return;
            var p = parseBankSms(body); if (!p || p.type !== 'income') return;
            var a = Number(p.amount) || 0; if (!a || Math.abs(a - amt) > amt * 0.05) return;
            var j = (p.year && p.month && p.day) ? { y: p.year, m: p.month, d: parseInt(p.day, 10) || 1 } : hkJalaliOfTs(Number(it.date) || Date.now());
            var di = recDayIndex(j.y, j.m, j.d); if (di < sIdx || di > eIdx) return;
            var a4 = hkSmsAcc4(body) || '', bank = (a4 && hkAcc4Label(a4)) || matchSelectedBank(p.bank) || '';
            if (item.account && bank && bank !== item.account) return;
            var sig = j.y + '-' + j.m + '-' + j.d + '-' + a; if (seen[sig]) return; seen[sig] = 1;
            cands.push({ j: j, di: di, amount: a, bank: bank || item.account || '' });
          } catch (e) {}
        });
        if (!cands.length) { done(0); return; }
        cands.sort(function (a, b) { return a.di - b.di; });
        if (!item.payTiming) recInferTiming(item, cands[0].j);
        var keys = recTermDueKeys(item, { start: item.contractStart, end: item.contractEnd }), due = recDueDay(item);
        cands.forEach(function (c) {
          var best = 0, bd = 99;
          keys.forEach(function (k) { var d = Math.abs(c.di - recDayIndex(Math.floor(k / 100), k % 100, Math.min(due, recMonthLen(k % 100)))); if (d < bd) { bd = d; best = k; } });
          c.k = bd <= 10 ? best : 0;
        });
        cands = cands.filter(function (c) { return c.k; });
        if (!cands.length) { done(0); return; }
        recSmsHistoryBox(item, cands, done);
      }).catch(function () { done(0); });
    }
    function recSmsHistoryBox(item, cands, done) {
      var old = document.getElementById('recAddPrevModal'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'recAddPrevModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100450;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;';
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var lab = function (k) { var b = recTiming(item) === 'end' ? recPrevKey(k) : k; return MONTHS[(b % 100) - 1] || ''; };
      var h = '<div style="width:100%;max-width:460px;max-height:82vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:14px;direction:rtl;overflow:hidden;">' +
        '<div style="padding:12px;font-weight:800;font-size:0.9rem;text-align:center;line-height:1.7;">واریزهای «' + escapeHtml(item.name || '') + '» در پیامک‌های گوشی</div><div style="overflow:auto;flex:1;padding:0 8px 6px;">' +
        '<table class="person-detail-table rec-arch-table rec-sch-table"><colgroup><col style="width:2.2em"><col style="width:17%"><col style="width:28%"><col style="width:27%"><col></colgroup>' +
        '<thead><tr><th><input type="checkbox" class="rec-prev-allchk"></th><th>بابت</th><th>تاریخ تراکنش</th><th>مبلغ</th><th>بانک</th></tr></thead><tbody>';
      cands.forEach(function (c, i) {
        h += '<tr><td><input type="checkbox" data-i="' + i + '"></td><td class="rec-sch-k">' + lab(c.k) + '</td><td class="rec-arch-date">' + toPersianDigits(String(c.j.y)) + '/' + p2(c.j.m) + '/' + p2(c.j.d) + '</td><td><span class="pd-amt status-paid">' + formatNum(c.amount) + '</span></td><td class="rec-arch-acc">' + escapeHtml(c.bank || '—') + '</td></tr>';
      });
      h += '</tbody></table></div><div style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);">' +
        '<button type="button" data-act="ok" style="flex:1;padding:9px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">ثبت</button>' +
        '<button type="button" data-act="cancel" style="flex:1;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button></div></div>';
      ov.innerHTML = h; document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      ov._hkCancel = function () { close(); done(0); };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov._hkCancel(); });
      ov.querySelector('[data-act="cancel"]').onclick = ov._hkCancel;
      var items = ov.querySelectorAll('input[data-i]'), all = ov.querySelector('.rec-prev-allchk');
      all.onchange = function () { items.forEach(function (x) { x.checked = all.checked; }); };
      items.forEach(function (x) { x.addEventListener('change', function () { var n = [].filter.call(items, function (y) { return y.checked; }).length; all.checked = n === items.length; all.indeterminate = n > 0 && n < items.length; }); });
      ov.querySelector('[data-act="ok"]').onclick = function () {
        var picked = [];
        items.forEach(function (x) { if (x.checked) picked.push(cands[parseInt(x.getAttribute('data-i'), 10)]); });
        close();
        done(recApplySmsHistory(item, picked));
      };
    }
    /* ثبت واریزهای تأییدشده: اگر همان واریز در نرم‌افزار ثبت شده → وصل؛ اگر ماهش در نرم‌افزار داده دارد → ردیف تازه؛
       وگرنه (قبل از شروع استفاده) فقط در آرشیو قرارداد (بی اثر روی موجودی) */
    function recApplySmsHistory(item, picked) {
      var n = 0;
      picked.forEach(function (c) {
        var pk = recMonthKey(c.j.y, c.j.m), pd = recMonthData(pk, false), hit = null;
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (r) {
          if (hit || !r || r.deletedAt || !recIsPaid(r)) return;
          if (r.fromRecurringId && r.fromRecurringId !== item.id && recLiveItem(r.fromRecurringId)) return;
          if (Math.abs((Number(r.amount) || 0) - c.amount) <= 1 && (parseInt(toEnglishDigits(String(r.day || '')), 10) || 0) === c.j.d) hit = r;
        }); });
        var hasData = pd && ['income', 'expense'].some(function (t) { return ((pd[t] && pd[t].sections) || []).some(function (s) { return (s.rows || []).some(function (r) { return r && Number(r.amount) > 0; }); }); });
        if (!hit && hasData) {
          var sec = recSectionIn(pd, item, true) || ensureSmsSection('income', 'واریز بانکی', pd);
          hit = Object.assign(emptyRow('income'), { day: String(c.j.d), desc: item.name || '', amount: c.amount, status: 'paid', account: c.bank || '', createdAt: Date.now(), updatedAt: Date.now() });
          recPlaceRow(sec, hit);
        }
        if (hit) {
          recLinkRow(item, hit);
          if (c.k !== pk) { hit.recForKey = c.k; if (recIsAutoDesc(item, hit.desc)) hit.desc = recDueDesc(item, c.k, pk); if (!item.paidAhead) item.paidAhead = {}; item.paidAhead[String(c.k)] = true; }
        } else {
          if (!item.extPaid) item.extPaid = {};
          item.extPaid[String(c.k)] = { y: c.j.y, m: c.j.m, d: c.j.d, amount: c.amount, bank: c.bank || '' };
        }
        try { recRemoveRows(recRowsOf(item).filter(function (z) { return z.key === c.k && !recIsPaid(z.row); })); } catch (e0) {}
        n++;
      });
      if (n) { item.updatedAt = Date.now(); recPersist(); try { saveRecurring(); } catch (e1) {} try { recRefreshViews(); } catch (e2) {} }
      return n;
    }
    /* ===== ۱.۳.۵۶: ترمیم یک‌باره =====
       درآمد ثابت: نوع قرارداد (ابتدا/پایان ماه) از واریزها دوباره تشخیص داده می‌شود و «بابت» هر واریز وصل‌شده از نزدیک‌ترین سررسید؛
       برچسب‌هایی که خود نرم‌افزار گذاشته بود اصلاح می‌شوند (شرح نوشتهٔ کاربر دست نمی‌خورد)؛ واریز وصل‌نشده‌ای که شرحش دقیقاً اسم
       قرارداد است و در بازهٔ درست افتاده وصل می‌شود.
       قسط (غیرفعال): ردیف‌های پرداخت‌نشده حذف و پرداخت‌شده‌ها ردیف معمولی مخارج می‌شوند (موجودی عوض نمی‌شود) */
    function hkRecRepairItem(item) {
      if (!item || item.deletedAt || !item.id || !item.contractStart || !item.contractStart.y) return 0;
      var amt = Number(item.amount) || 0, name = String(item.name || '').trim(), changed = 0;
      var linked = recArchiveRows(item).filter(function (x) { return recIsPaid(x.row) && !(x.row.receivedOn && x.row.receivedOn.y); });
      var free = [];
      if (name && amt) recEachMonth(function (k, pd) {
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || !recIsPaid(r) || r.fromPlanId) return;
            if (r.fromRecurringId && (r.fromRecurringId === item.id || recLiveItem(r.fromRecurringId))) return;
            if (String(r.desc || '').trim() !== name || Math.abs((Number(r.amount) || 0) - amt) > amt * 0.05) return;
            free.push({ key: k, row: r, sec: sec, free: true });
          });
        });
      });
      var all = linked.concat(free).map(function (x) { var p = recPayDateOf(x); x.pi = recDayIndex(p.y, p.m, p.d); x.p = p; return x; });
      if (!all.length) return 0;
      all.sort(function (a, b) { return a.pi - b.pi; });
      var pays = all.map(function (x) { return x.p; });
      var t = recTimingFromFirst(item, pays[0]) || item.payTiming || 'start';
      if (pays.length >= 3) { var cs = recTimingCost(item, pays, 'start'), ce = recTimingCost(item, pays, 'end'); if (ce + 15 < cs) t = 'end'; else if (cs + 15 < ce) t = 'start'; }
      if (item.payTiming !== t) { item.payTiming = t; changed++; }
      var dues = recDueList(item, t, Math.max(24, all.length + 12)), pa = {};
      var al = recAlign(all.map(function (x) { return x.pi; }), dues, all.map(function (x) { return x.free ? 12 : 20; }));
      all.forEach(function (x, xi) {
        var best = al.at[xi];
        if (best < 0) { if (!x.free && x.row.recForKey) pa[String(x.row.recForKey)] = true; return; }
        var dk = dues[best].k, r = x.row;
        if (x.free) { recLinkRow(item, r); changed++; }
        if (dk === x.key) { if (r.recForKey) { delete r.recForKey; changed++; } }
        else { if (parseInt(r.recForKey, 10) !== dk) { r.recForKey = dk; changed++; } pa[String(dk)] = true; }
        if (recIsAutoDesc(item, r.desc)) { var nd = recDueDesc(item, dk, x.key); if (nd && nd !== r.desc) { r.desc = nd; changed++; } }
        r.updatedAt = Date.now();
      });
      var oldPa = JSON.stringify(item.paidAhead || {}); item.paidAhead = pa; if (JSON.stringify(pa) !== oldPa) changed++;
      /* ردیف «دریافت نشده»ای که سررسیدش حالا پرداخت‌شده است (یا ماه شروع در قرارداد پایان ماه) */
      var paidKeys = {}; recRowsOf(item).forEach(function (z) { if (recIsPaid(z.row)) paidKeys[z.key] = 1; });
      var sk = recStartKey(item);
      var stale = recRowsOf(item).filter(function (z) { return !recIsPaid(z.row) && (pa[String(z.key)] || paidKeys[z.key] || (t === 'end' && z.key === sk)); });
      if (stale.length) { recRemoveRows(stale); changed += stale.length; }
      if (changed) item.updatedAt = Date.now();
      return changed;
    }
    function hkInstRepair() {
      if (typeof HK_INSTALLMENTS_ON !== 'undefined' && HK_INSTALLMENTS_ON) return 0;
      var n = 0, curK = periodKey(currentYear, currentMonth);
      var each = function (pd) {
        ((pd && pd.expense && pd.expense.sections) || []).forEach(function (sec) {
          if (!Array.isArray(sec.rows)) return;
          var keep = [];
          sec.rows.forEach(function (r) {
            if (!r || !r.fromPlanId) { keep.push(r); return; }
            n++;
            if ((r.status || 'paid') !== 'paid') return;
            ['fromPlanId', 'fromPlanIndex', 'planCarried', 'planEarlyPay', 'planLockedAmt', 'planPaidLater', 'planLocked', 'planNote'].forEach(function (f) { delete r[f]; });
            r.updatedAt = Date.now();
            keep.push(r);
          });
          sec.rows = keep.length ? keep : [emptyRow('expense')];
        });
      };
      each(periodData);
      Object.keys(archive || {}).forEach(function (k) { if (k !== curK && archive[k]) each(archive[k]); });
      return n;
    }
    function hkMig1356() {
      var flag = STORAGE_KEY + '_mig1356';
      try { if (localStorage.getItem(flag)) return; } catch (e) { return; }
      var n = 0;
      try { (recurringIncomes || []).forEach(function (it) { n += hkRecRepairItem(it); }); } catch (e1) {}
      try { n += hkInstRepair(); } catch (e2) {}
      /* پرچم فقط وقتی داده‌ای برای ترمیم بوده (نصب تازه/بی‌داده چیزی در حافظه نمی‌نویسد) */
      if (n || (recurringIncomes || []).some(function (it) { return it && it.contractStart; })) { try { localStorage.setItem(flag, '1'); } catch (e3) {} }
      if (n) { recPersist(); try { saveRecurring(); } catch (e4) {} try { renderAll(); renderRecurringBar(); } catch (e5) {} }
      return n;
    }
    setTimeout(function () { try { hkMig1356(); } catch (eM) {} }, 2600);
    /* تمدید قرارداد: دورهٔ فعلی به دوره‌های قبلی می‌رود و دورهٔ تازه (پیش‌فرض: از پایان قبلی، یک سال، همان مبلغ) شروع می‌شود */
    function recRenewItem(item, start, end, amount, deposit) {
      var oldEndK = recEndKey(item);
      if (!Array.isArray(item.terms)) item.terms = [];
      item.terms.push({ contractStart: Object.assign({}, item.contractStart), contractEnd: Object.assign({}, item.contractEnd), amount: Number(item.amount) || 0, deposit: Number(item.deposit) || 0 });
      item.contractStart = { d: start.d, m: start.m, y: start.y };
      item.contractEnd = { d: end.d, m: end.m, y: end.y };
      item.amount = Number(amount) || 0;
      if (deposit !== undefined) item.deposit = Number(deposit) || 0;
      item.updatedAt = Date.now();
      /* ردیف‌های دریافت‌نشدهٔ ماه‌های دورهٔ تازه مبلغ تازه را می‌گیرند */
      recRowsOf(item).forEach(function (x) {
        if (recIsPaid(x.row) || x.key <= oldEndK) return;
        x.row.amount = item.amount; x.row.updatedAt = Date.now();
      });
      /* ماه‌های گذشتهٔ بعد از پایان قبلی ساخته نمی‌شوند؛ از همین ماه ادامه */
      var today = recTodayKey();
      item.genKey = Math.max(parseInt(item.genKey, 10) || 0, recPrevKey(today));
      recPersist();
    }
    function recRenewFlow(item, done) {
      var old = document.getElementById('recRenewModal'); if (old) old.remove();
      var s0 = item.contractEnd ? { d: item.contractEnd.d, m: item.contractEnd.m, y: item.contractEnd.y } : getTodayPersian();
      var e0 = { d: s0.d, m: s0.m, y: (parseInt(s0.y, 10) || 0) + 1 };
      var ov = document.createElement('div');
      ov.id = 'recRenewModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100420;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;';
      var box = document.createElement('div');
      box.style.cssText = 'width:100%;max-width:420px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;direction:rtl;box-shadow:0 12px 32px var(--shadow);';
      box.innerHTML = '<div style="font-weight:800;font-size:0.95rem;text-align:center;margin-bottom:4px;">تمدید «' + escapeHtml(item.name || '') + '»</div>' +
        '<div style="font-size:0.76rem;color:var(--muted);text-align:center;margin-bottom:10px;line-height:1.7;">دورهٔ فعلی (' + 'از ' + recFmtDate(item.contractStart) + ' تا ' + recFmtDate(item.contractEnd) + ') در آرشیو می‌ماند</div>' +
        '<div style="font-size:0.8rem;font-weight:700;margin:6px 0 4px;">شروع دورهٔ تازه</div><div data-slot="s"></div>' +
        '<div style="font-size:0.8rem;font-weight:700;margin:10px 0 4px;">پایان دورهٔ تازه</div><div data-slot="e"></div>' +
        '<div style="font-size:0.8rem;font-weight:700;margin:10px 0 4px;">مبلغ ماهانه (تومان)</div>' +
        '<input type="text" inputmode="numeric" id="recRenewAmt" style="width:100%;box-sizing:border-box;padding:9px;border-radius:9px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-size:0.9rem;text-align:center;">' +
        '<div style="font-size:0.8rem;font-weight:700;margin:10px 0 4px;">رهن (تومان)</div>' +
        '<input type="text" inputmode="numeric" id="recRenewDep" placeholder="مبلغ رهن/ودیعه، اختیاری" style="width:100%;box-sizing:border-box;padding:9px;border-radius:9px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-size:0.9rem;text-align:center;">' +
        '<div style="display:flex;gap:8px;margin-top:14px;">' +
        '<button type="button" data-act="ok" style="flex:1;padding:10px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">تمدید</button>' +
        '<button type="button" data-act="cancel" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button></div>';
      var endTouched = false, endSel;
      var startSel = hkCreateDateSelects(s0, { onChange: function (d) { if (!endTouched && endSel) endSel.setDate({ d: d.d, m: d.m, y: d.y + 1 }); } });
      endSel = hkCreateDateSelects(e0, { onChange: function () { endTouched = true; } });
      box.querySelector('[data-slot="s"]').appendChild(startSel);
      box.querySelector('[data-slot="e"]').appendChild(endSel);
      var amt = box.querySelector('#recRenewAmt');
      amt.value = formatNum(Number(item.amount) || 0);
      hkAmountInput(amt);
      var dep = box.querySelector('#recRenewDep');
      dep.value = Number(item.deposit) > 0 ? formatNum(item.deposit) : '';
      hkAmountInput(dep);
      ov.appendChild(box);
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      box.querySelector('[data-act="cancel"]').onclick = close;
      box.querySelector('[data-act="ok"]').onclick = function () {
        var st = startSel.getDate(), en = endSel.getDate();
        var n = parseInt(toEnglishDigits(amt.value).replace(/\D/g, ''), 10) || 0;
        if (!n) { showToast('مبلغ را وارد کنید'); return; }
        if (recMonthKey(en.y, en.m) * 100 + en.d <= recMonthKey(st.y, st.m) * 100 + st.d) { showToast('پایان دوره باید بعد از شروع آن باشد'); return; }
        close();
        recRenewItem(item, st, en, n, parseInt(toEnglishDigits(dep.value).replace(/\D/g, ''), 10) || 0);
        recOfferTodayRow(item, function () {
          if (done) done('قرارداد «' + (item.name || '') + '» تمدید شد');
        });
      };
    }
    /* واریزهای ثبت‌شدهٔ ماه‌های گذشته (همان حساب، مبلغ نزدیک، وصل‌نشده) با تیک به آرشیو اضافه می‌شوند؛ ردیف تازه ساخته نمی‌شود */
    function recAddPreviousFlow(item, done) {
      var amt = Number(item.amount) || 0, acc = (item.account || '').trim(), cands = [];
      recEachMonth(function (k, pd) {
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || r.fromPlanId || !recIsPaid(r)) return;
            if (r.fromRecurringId === item.id) return;
            var a = Number(r.amount) || 0;
            /* ۱.۳.۴۹: واریز تکه‌تکه هم پیدا شود (مبلغ کمتر از مبلغ ماهانه) */
            if (!a || !amt || a > amt * 1.05 || a < amt * 0.05) return;
            if (acc && (r.account || '').trim() !== acc) return;
            cands.push({ key: k, row: r, sec: sec });
          });
        });
      });
      cands.sort(function (a, b) { return (a.key - b.key) || ((parseInt(a.row.day, 10) || 0) - (parseInt(b.row.day, 10) || 0)); });
      if (!cands.length) { showToast('واریز ثبت‌شدهٔ دیگری با همین حساب و مبلغ نزدیک پیدا نشد'); return; }
      recCheckPick(item, 'کدام واریزها مربوط به «' + (item.name || '') + '» است؟', cands, function (picked) { recLinkPicked(item, picked, done); });
    }
    /* ۱.۳.۵۰: هر ردیف انتخاب‌شده جدا وصل می‌شود (بی جمع شدن) */
    function recLinkPicked(item, picked, done) {
      var n = 0;
      picked.forEach(function (c) { recLinkRow(item, c.row); n++; });
      if (n) recPersist();
      if (done) done(n);
    }
    /* وضعیت این ماه برای خط وضعیت فهرست */
    function recTodayState(item) {
      var today = recTodayKey();
      if (!recStartKey(item)) return { kind: 'legacy' };
      if (!(item.sectionTitle || item.sectionId)) return { kind: 'nosec' };
      var first = recFirstKey(item), end = recEndKey(item);
      if (first > today) return { kind: 'future', key: first };
      if (end && end < today) return { kind: 'ended' };
      var x = recRowsOf(item).find(function (z) { return z.key === today; });
      if (!x) {
        if (item.paidAhead && item.paidAhead[String(today)]) return { kind: 'ahead' };
        return { kind: 'none' };
      }
      var linked = recIsPaid(x.row) && (x.row.recLinked || ((x.row.desc || '').trim() && (x.row.desc || '').trim() !== (item.name || '').trim() && !x.row.viaSms));
      return { kind: linked ? 'linked' : (recIsPaid(x.row) ? 'paid' : 'unpaid'), x: x };
    }
    /* جدا کردن واریزِ وصل‌شدهٔ این ماه، یا انتقال آن به قرارداد دیگر */
    function recUnlinkFlow(item, done) {
      var st = recTodayState(item), today = recTodayKey();
      if (!st.x) return;
      var row = st.x.row;
      var others = (recurringIncomes || []).filter(function (r) { return r && r !== item && !r.deletedAt && recInRange(r, today) && (r.sectionTitle || r.sectionId); });
      var opts = [];
      others.forEach(function (r) { opts.push({ label: 'مربوط به «' + (r.name || '') + '» است', value: r.id }); });
      opts.push({ label: 'به هیچ درآمد ثابتی مربوط نیست (واریز عادی)', value: '__none__', primary: true });
      opts.push({ label: 'انصراف', value: null });
      recPickModal('واریز ' + recRowLabel(row, today) + ' الان به «' + (item.name || '') + '» وصل است.', opts, function (v) {
        if (v == null) return;
        delete row.fromRecurringId; delete row.recLinked; row.updatedAt = Date.now();
        var msg = 'واریز از «' + (item.name || '') + '» جدا شد';
        if (v !== '__none__') {
          var other = (recurringIncomes || []).find(function (r) { return r && r.id === v; });
          if (other) {
            /* ردیف «دریافت نشده»ٔ آن قرارداد در همین ماه جای خود را به این واریز می‌دهد */
            recRemoveRows(recRowsOf(other).filter(function (z) { return z.key === today && !recIsPaid(z.row); }));
            recLinkRow(other, row);
            msg = 'واریز به «' + (other.name || '') + '» منتقل شد';
          }
        }
        /* قرارداد اصلی ردیف «دریافت نشده»ٔ این ماه را می‌گیرد */
        recGenMonth(item, today);
        recPersist();
        try { saveRecurring(); } catch (e) {}
        if (done) done(msg);
      });
    }
    /* ساخت ردیف یک ماه برای یک تعریف. خروجی: 'created' | 'linked' | 'exists' | 'skip' */
    function recGenMonth(item, k, notes) {
      if (!item || !item.id || item.deletedAt || !recInRange(item, k)) return 'skip';
      if (!(item.sectionTitle || item.sectionId)) return 'skip';
      if (item.paidAhead && item.paidAhead[String(k)]) return 'exists';
      var pd = recMonthData(k, true);
      var exists = false;
      ((pd.income && pd.income.sections) || []).forEach(function (sec) {
        if ((sec.rows || []).some(function (r) { return r && r.fromRecurringId === item.id && !r.recForKey; })) exists = true;
      });
      if (exists) return 'exists';
      var sec = recSectionIn(pd, item, true);
      if (!sec) return 'skip';
      recPlaceRow(sec, recNewRow(item, k));
      return 'created';
    }
    /* پرکردن ماه‌های جاافتاده تا ماه جاری (بدون ساخت ماه‌های آینده) */
    function recEnsureItem(item, notes) {
      if (!item || !item.id || item.deletedAt) return 0;
      var first = recFirstKey(item);
      if (!first) return 0;
      var today = recTodayKey();
      var end = recEndKey(item);
      var upto = end ? Math.min(end, today) : today;
      var gen = parseInt(item.genKey, 10) || 0;
      var k = Math.max(first, gen ? recNextKey(gen) : first);
      var n = 0, guard = 0;
      while (k <= upto && guard++ < 240) {
        var r = recGenMonth(item, k, notes);
        if (r === 'created' || r === 'linked') n++;
        item.genKey = k;
        k = recNextKey(k);
      }
      return n;
    }
    function ensureRecurringRows(opts) {
      opts = opts || {};
      var notes = [], n = 0, touched = false;
      /* تعریف‌هایی که از پشتیبان/جای دیگر بی‌«ماه ساخت» آمده‌اند: از همین ماه */
      try { if (migrateRecurringItems()) touched = true; } catch (e) {}
      (recurringIncomes || []).forEach(function (item) {
        var before = item && item.genKey;
        n += recEnsureItem(item, notes);
        if (item && item.genKey !== before) touched = true;
      });
      if (touched) { try { saveRecurring(); } catch (e) {} }
      if (n) {
        recPersist();
        if (opts.render !== false) { try { renderAll(); } catch (e) {} }
      }
      if (notes.length && opts.toast !== false) { try { showToast(notes.length === 1 ? notes[0] : toPersianDigits(notes.length) + ' واریز ثبت‌شده به درآمدهای ثابت وصل شد'); } catch (e) {} }
      return n;
    }
    /* مهاجرت تعریف‌های قدیمی: شناسه، ماه ساخت؛ از این ماه به بعد ادامه می‌دهند */
    function migrateRecurringItems() {
      var today = recTodayKey(), changed = false;
      (recurringIncomes || []).forEach(function (r) {
        if (!r) return;
        if (!r.id) { r.id = newRecordId(); changed = true; }
        if (!r.fromKey) { r.fromKey = today; changed = true; }
        if (!r.genKey) { r.genKey = recPrevKey(today); changed = true; }
      });
      return changed;
    }
    function recLegacyItems() {
      return (recurringIncomes || []).filter(function (r) { return r && !r.deletedAt && !recStartKey(r); });
    }
    /* ردیف‌های «دریافت نشده» که نسخه‌های قبل در ماه‌های دیگر ساخته بودند */
    function recStaleUnpaidRows() {
      var today = recTodayKey(), out = [];
      (recurringIncomes || []).forEach(function (item) {
        if (!item || item.deletedAt) return;
        /* ۱.۳.۴۹: فقط ماه‌های آینده (دریافت‌نشدهٔ ماه‌های گذشته واقعی است و نباید پاک شود) */
        recRowsOf(item).forEach(function (x) { if (!recIsPaid(x.row) && x.key > today) out.push(x); });
      });
      return out;
    }
    function recRemoveRows(list) {
      list.forEach(function (x) {
        var i = (x.sec.rows || []).indexOf(x.row);
        if (i >= 0) x.sec.rows.splice(i, 1);
        if (!x.sec.rows.length) x.sec.rows = [emptyRow('income')];
      });
      if (list.length) recPersist();
    }
    function recRefreshViews() {
      try { renderHomeCards(); } catch (e) {}
      try { renderAll(); } catch (e) {}
      try {
        if (typeof _detailContext !== 'undefined' && _detailContext && _detailContext.kind === 'income') renderPersonDetailPanel('income', _detailContext.title);
      } catch (e) {}
    }
    /* یک‌بار: پاک‌سازی ردیف‌های «دریافت نشده»ای که نسخه‌های قبل در ماه‌های گذشته/آینده ساخته بودند */
    function recOfferCleanupOnce() {
      var flag = STORAGE_KEY + '_recCleanupAsked';
      try { if (localStorage.getItem(flag)) return; } catch (e) { return; }
      if (!recStaleUnpaidRows().length) return;
      setTimeout(function () {
        /* پنجرهٔ تأیید دیگری باز است (مثلاً پرسش ویرایش): این بار نه */
        var cm = document.getElementById('confirmModal');
        if (cm && cm.classList.contains('open')) return;
        if (!(_featureActive === 'recurring' || currentTab === 'recurring')) return;
        var stale = recStaleUnpaidRows();
        if (!stale.length) return;
        try { localStorage.setItem(flag, '1'); } catch (e) {}
        recAsk('نسخهٔ قبل برای درآمدهای ثابت در ماه‌های آینده هم ' + toPersianDigits(stale.length) + ' ردیف «دریافت نشده» ساخته بود. از این نسخه ردیف هر ماه فقط وقتی آن ماه برسد ساخته می‌شود. این ردیف‌ها پاک شوند؟ (ماه جاری و ماه‌های گذشته دست نمی‌خورند و پاک‌شده‌ها به سطل زباله می‌روند)',
          'پاک شوند', 'بمانند', function () {
            var list = recStaleUnpaidRows();
            list.forEach(function (x) { try { pushToTrash('row', (x.row.desc || 'ردیف') + (x.row.amount ? ' · ' + formatNum(x.row.amount) : ''), { tab: 'income', sectionId: x.sec.id, sectionTitle: x.sec.title, periodKey: periodKey(Math.floor(x.key / 100), x.key % 100), row: JSON.parse(JSON.stringify(x.row)), sourceLabel: 'درآمد ثابت / ماه‌های آینده' }); } catch (eT) {} });
            recRemoveRows(list);
            recRefreshViews();
            try { showToast(toPersianDigits(list.length) + ' ردیف پاک شد'); } catch (e) {}
          });
      }, 400);
    }
    /* پرسش دوگزینه‌ای با برچسب دلخواه روی همان پنجرهٔ تأیید */
    function recAsk(msg, yesLabel, noLabel, onYes, onNo) {
      var y = document.getElementById('confirmYes'), n = document.getElementById('confirmNo');
      var restore = function () { if (y) y.textContent = 'بلی'; if (n) n.textContent = 'خیر'; };
      askConfirm(msg, function () { restore(); if (onYes) onYes(); }, function () { restore(); if (onNo) onNo(); });
      if (y && yesLabel) y.textContent = yesLabel;
      if (n && noLabel) n.textContent = noLabel;
    }
    /* پرسش‌های پشت‌سرهم؛ هر سؤال { id, msg, yes, no }؛ پاسخ‌ها به‌صورت true/false */
    function recAskSeq(qs, done) {
      var ans = {}, i = 0;
      (function next() {
        if (i >= qs.length) { done(ans); return; }
        var q = qs[i++];
        recAsk(q.msg, q.yes, q.no, function () { ans[q.id] = true; next(); }, function () { ans[q.id] = false; next(); });
      })();
    }

    /* اعمال ویرایش تعریف روی ردیف‌ها:
       دریافت‌شده‌ها و ماه‌های گذشته دست نمی‌خورند؛ ردیف دریافت‌نشدهٔ این ماه و ماه‌های بعد تعریف تازه را می‌گیرند */
    function recApplyEdit(prev, item, opt) {
      opt = opt || {};
      var today = recTodayKey();
      var rows = recRowsOf(item);
      var kill = [];
      var newFirst = recStartKey(item), newEnd = recEndKey(item);
      rows.forEach(function (x) {
        if (recIsPaid(x.row)) return;
        if (opt.trimBefore && newFirst && x.key < newFirst) { kill.push(x); return; }
        if (opt.trimAfter && newEnd && x.key > newEnd) { kill.push(x); return; }
        if (x.key < today) {
          if (opt.pastAmount) { x.row.amount = Number(item.amount) || 0; x.row.updatedAt = Date.now(); }
          return;
        }
        x.row.desc = item.name || x.row.desc || '';
        x.row.day = recDayFor(item, x.key) || x.row.day || '';
        x.row.account = item.account || '';
        if (!(x.key === today && opt.amountFromNext)) x.row.amount = Number(item.amount) || 0;
        x.row.updatedAt = Date.now();
        /* جابه‌جایی به بخش تازه */
        var dest = recSectionIn(x.pd, item, true);
        if (dest && dest !== x.sec) {
          var i = x.sec.rows.indexOf(x.row);
          if (i >= 0) x.sec.rows.splice(i, 1);
          if (!x.sec.rows.length) x.sec.rows = [emptyRow('income')];
          recPlaceRow(dest, x.row);
        } else if (dest) recSortRows(dest);
      });
      recRemoveRows(kill);
      /* ردیف این ماه اگر نیست، جدا با recOfferTodayRow (با پرسش دربارهٔ واریزهای مشابه) ساخته می‌شود */
      if (rows.some(function (x) { return x.key === today; })) item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
      recPersist();
      return { removed: kill.length, notes: [] };
    }

    function batchAddRecurringToSection() {
      const idxs = Array.from(recurringSelected).sort((a, b) => a - b);
      if (!idxs.length) {
        showToast('موردی انتخاب نشده');
        return;
      }
      const secs = periodData.income.sections || [];
      if (!secs.length) { showToast('بخشی وجود ندارد'); return; }
      openSectionPicker(secs, (secId) => {
        const sec = secs.find(s => s.id === secId) || secs[0];
        let n = 0, skipped = 0;
        idxs.forEach(i => {
          const r = recurringIncomes[i];
          if (!r) return;
          if (sectionHasRecurringIncome(sec, r)) {
            skipped++;
            return;
          }
          r.sectionId = sec.id;
          r.sectionTitle = (sec.title || '').trim();
          try { recApplyEdit(r, r, {}); recGenMonth(r, recTodayKey()); r.genKey = Math.max(parseInt(r.genKey, 10) || 0, recTodayKey()); recPersist(); } catch (e) {}
          n++;
        });
        try { saveRecurring(); } catch (e) {}
        try { sortSectionRows(sec.id); } catch (e) {}
        clearRecurringSelection();
        try { renderSectionsForTab('income'); } catch (e) {}
        renderAll();
        scheduleSave();
        if (!n && skipped) {
          showToast(skipped === 1 ? 'تغییرات اعمال شد' : 'تغییرات اعمال شد');
        } else if (n && skipped) {
          showToast(toPersianDigits(n) + ' مورد اضافه شد؛ ' + toPersianDigits(skipped) + ' مورد قبلاً بود');
        } else {
          showToast(toPersianDigits(n) + ' مورد به «' + (sec.title || 'بخش') + '» اضافه شد');
        }
      });
    }

    function renderRecurringBar() {
      let box = document.getElementById('recurringBox');
      const inSheet = !!(_featureActive === 'recurring' || (document.getElementById('featureSheet') || {}).classList && document.getElementById('featureSheet').classList.contains('open') && document.getElementById('panel-recurring') && document.getElementById('panel-recurring').closest('#featureSheetBody'));
      if (currentTab !== 'recurring' && !inSheet && _featureActive !== 'recurring') {
        if (box) box.remove();
        try { var exb0 = document.getElementById('recExportBtn'); if (exb0) exb0.remove(); } catch (eX0) {}
        clearRecurringSelection();
        return;
      }
      const container = document.getElementById('recurringPanelInner') || document.getElementById('panel-recurring');
      if (!container) return;
      if (!box) {
        box = document.createElement('div');
        box.id = 'recurringBox';
        box.className = 'recurring-box shaped-card';
        container.appendChild(box);
      } else if (box.parentNode !== container) {
        container.appendChild(box);
      }
      const editSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      const plusSvgRec = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      /* منوی اصلی درآمدهای ثابت همیشه باز است (فقط تک‌تک موارد باز/بسته می‌شوند) */
      recurringCollapsed = false;
      let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;" id="recurringHead">' +
        '<h3 style="margin:0;flex:1;">درآمدهای ثابت</h3></div>';
      if (!recurringCollapsed) {
        // مرتب‌سازی بر اساس روز
        const sortedIdx = recurringIncomes.map((r, i) => ({ r, i }))
          .sort((a, b) => {
            const da = parseInt(a.r.day, 10) || 99;
            const db = parseInt(b.r.day, 10) || 99;
            return da - db;
          });
        /* ۱.۳.۷۳: بیش از ۷ درآمد ثابت → فهرست داخل باکس اسکرول می‌شود */
        html += '<div class="rec-list' + (sortedIdx.length > 7 ? ' rec-list-scroll' : '') + '">';
        sortedIdx.forEach(({ r, i }) => {
          const dayStr = r.day ? ('روز ' + toPersianDigits(r.day) + ' هر ماه') : 'بدون روز مشخص';
          const secName = (r.sectionTitle || r.sectionName || '').trim();
          const metaParts = [];
          if (r.account) metaParts.push(escapeHtml(r.account));
          /* ۱.۳.۴۸: تک‌کاربره: نام کارت دیگر نوشته نمی‌شود */
          const accLine = metaParts.length
            ? ('<div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">' + metaParts.join(' · ') + '</div>')
            : '';
          const fmtD = (d) => toPersianDigits(String(d.d || '')) + ' ' + (MONTHS[(d.m || 1) - 1] || '') + ' ' + toPersianDigits(String(d.y || ''));
          const rangeLine = recStartKey(r)
            ? ('<div class="rec-range" style="font-size:0.76rem;color:var(--muted);margin-top:2px;">از ' + fmtD(r.contractStart) + (recEndKey(r) ? ' تا ' + fmtD(r.contractEnd) : ' · <span style="color:#ff9f0a;">پایان قرارداد مشخص نیست</span>') + '</div>')
            : '<div class="rec-legacy" style="font-size:0.76rem;color:#ff9f0a;margin-top:2px;">تاریخ شروع ندارد؛ برای ادامهٔ ساخت ماهانه ویرایش کنید</div>';
          /* وضعیت این ماه */
          let statusLine = '';
          let pastUn = [];
          try { const tk0 = recTodayKey(); pastUn = recRowsOf(r).filter(function (x) { return x.key < tk0 && !recIsPaid(x.row); }).sort(function (a, b) { return a.key - b.key; }); } catch (ePu) {}
          try {
            const stt = recTodayState(r);
            const tk = recTodayKey(), mName = MONTHS[(tk % 100) - 1] || '';
            const dueTxt = toPersianDigits(recDayFor(r, tk) || '') + ' ' + mName;
            let txt = '', col = 'var(--muted)', act = '';
            if (stt.kind === 'nosec') { txt = 'بخش مقصد ندارد؛ برای ساخت ردیف ماهانه ویرایش کنید'; col = '#ff9f0a'; }
            else if (stt.kind === 'future') txt = 'از ' + recKeyLabel(stt.key) + ' شروع می‌شود';
            else if (stt.kind === 'ended') { txt = 'قرارداد ' + fmtD(r.contractEnd) + ' تمام شد'; col = '#ff9f0a'; }
            else if (stt.kind === 'ahead') { txt = 'این ماه: پیش‌دریافت شده'; col = '#30d158'; }
            else if (stt.kind === 'none') { txt = 'این ماه: ردیفی ندارد'; col = '#ff9f0a'; act = '<button type="button" class="rec-act" data-rec-make="' + i + '">ساخت ردیف</button>'; }
            /* ۱.۳.۴۹: «اصلاح» و نوشتهٔ «آرشیو» برداشته شد (آرشیو = آیکون پوشه کنار ادیت) */
            else if (stt.kind === 'unpaid') { txt = 'این ماه: دریافت نشده (' + dueTxt + ')'; col = ''; }
            else if (stt.kind === 'paid') { txt = 'این ماه: دریافت شد' + (stt.x.row.day ? ' (' + toPersianDigits(String(stt.x.row.day)) + ' ' + mName + ')' : ''); col = '#30d158'; }
            else if (stt.kind === 'linked') { txt = 'این ماه: دریافت شد' + (stt.x.row.day ? ' (' + toPersianDigits(String(stt.x.row.day)) + ' ' + mName + ')' : ''); col = '#30d158'; }
            /* دریافت‌نشدهٔ ماه‌های قبل: بالای «این ماه» */
            pastUn.slice(-3).forEach(function (x) {
              var pk = x.key, prevK = (Math.floor(tk / 100) * 12 + (tk % 100) - 2), pky = Math.floor(prevK / 12), pkm = prevK % 12 + 1;
              var lbl = (pk === pky * 100 + pkm) ? 'ماه قبل' : (MONTHS[(pk % 100) - 1] || '');
              statusLine += '<div class="rec-status rec-st-unpaid rec-st-past"><span>' + lbl + ': دریافت نشده (' + toPersianDigits(String(x.row.day || recDayFor(r, pk) || '')) + ' ' + (MONTHS[(pk % 100) - 1] || '') + ')</span></div>';
            });
            /* دریافت‌نشده: همان رنگ مبالغ پرداخت/دریافت‌نشده */
            statusLine += '<div class="rec-status' + (stt.kind === 'unpaid' ? ' rec-st-unpaid' : '') + '"' + (col ? ' style="color:' + col + ';"' : '') + '>' + (txt ? '<span>' + txt + '</span>' : '') + '</div>';
            /* ماه آخر قرارداد یا بعد از آن: پیام نارنجی و دکمهٔ «تمدید» */
            const ek = recEndKey(r);
            if (ek && tk >= ek && stt.kind !== 'ended') {
              statusLine += '<div class="rec-renew-note" style="color:#ff9f0a;font-size:0.76rem;margin-top:2px;">قرارداد ' + fmtD(r.contractEnd) + ' تمام می‌شود</div>';
            }
            if (ek && tk >= ek) act = '<button type="button" class="rec-act rec-renew-btn" data-rec-renew="' + i + '">تمدید</button>' + act;
            statusLine += '<div class="rec-acts' + (ek && tk >= ek ? '' : ' no-renew') + '">' + act + '</div>';
          } catch (eSt) {}
          const selected = recurringSelected.has(i);
          const open = recExpanded.has(r.id || i);
          const rowCls = 'recurring-row' + (open ? ' rec-open' : '');
          const termsN = (r.terms || []).length;
          html += '<div class="' + rowCls + '" data-rec-idx="' + i + '" style="display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;padding:8px 10px;border-radius:10px;cursor:pointer;">' +
            '<span class="rec-select-check" aria-hidden="true">' + (selected ? '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : '') + '</span>' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="rec-name" style="font-weight:bold;font-size:0.95rem;"><span class="rec-chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>' + escapeHtml(r.name || '—') + (pastUn.length ? '<i class="rec-late-dot" title="دریافت‌نشدهٔ ماه قبل"></i>' : '') + '</div>' +
              '<div class="rec-more">' +
                '<div style="font-size:0.8rem;color:var(--muted);margin-top:2px;">' + formatNum(r.amount || 0) + ' تومان · ' + dayStr + '</div>' +
                (Number(r.deposit) > 0 ? '<div class="rec-deposit" style="font-size:0.78rem;color:var(--muted);margin-top:2px;">رهن: ' + formatNum(r.deposit) + ' تومان</div>' : '') +
                accLine + rangeLine +
                (termsN ? '<div style="font-size:0.74rem;color:var(--muted);margin-top:2px;">' + toPersianDigits(String(termsN)) + ' دورهٔ قبلی در آرشیو</div>' : '') +
              '</div>' +
              statusLine +
            '</div>' +
            (recurringSelectMode ? '' : (
              '<div class="rec-tools">' +
              '<button class="rec-folder-btn" type="button" data-rec-arch="' + i + '" title="آرشیو" aria-label="آرشیو">' + HK_FOLDER_SVG + '</button>' +
              '<button class="btn-edit-title" type="button" data-re="' + i + '" title="ویرایش">' + editSvg + '</button>' +
              '<button class="btn btn-del-row" type="button" data-rd="' + i + '" title="حذف" style="color:#ff1744!important;-webkit-text-fill-color:#ff1744!important;text-shadow:0 0 4px rgba(255,23,68,0.55);-webkit-text-stroke:0.3px #ff1744;font-weight:900;font-size:1.4rem;background:transparent;border:none;line-height:1;">×</button>' +
              '</div>'
            )) +
            '</div>';
        });
        html += '</div>';
        /* + بیرون از باکس — بعد از innerHTML اضافه می‌شود */
      } // end !recurringCollapsed
      box.innerHTML = html;
      box.classList.add('shaped-card');
      box.classList.remove('frame-with-step');
      try { recOfferCleanupOnce(); } catch (eCl) {}
      
      try {
        if (box.parentNode) {
          box.parentNode.querySelectorAll(':scope > .table-add-tab-wrap[data-rec-tab]').forEach(el => el.remove());
        }
        const oldTab = box.querySelector(':scope > .table-add-tab, :scope > .table-tab-step');
        if (oldTab) oldTab.remove();
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'table-add-tab';
        addBtn.id = 'addRecurringBtn';
        addBtn.title = 'جدید';
        addBtn.setAttribute('aria-label', 'جدید');
        addBtn.innerHTML = '<svg class="tab-plus-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
        box.appendChild(addBtn);
        requestAnimationFrame(function() { ensureShapeFrame(box); });
      } catch (e) {}
      /* ۱.۳.۷۳: سقف ۷ ردیف (همان ارتفاع ۷ ردیف اول) و دکمهٔ «خروجی آرشیو» بیرون از باکس، همیشه ثابت زیرش */
      try {
        /* ۱.۳.۷۹: اندازهٔ ۷ ردیف بعد از چیدمان واقعی اندازه گرفته می‌شود (قبلاً وقتی صفحه هنوز پنهان بود فقط یک ردیف حساب می‌شد) */
        hkRecListFit();
        var exb = document.getElementById('recExportBtn');
        if (!exb) { exb = document.createElement('button'); exb.type = 'button'; exb.id = 'recExportBtn'; exb.className = 'rec-export-btn'; exb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h7.5l4.5 4.5v12A1.5 1.5 0 0 1 17 21H6.5A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M14 3v4.5h4.5M12 10.5v6M9.5 14l2.5 2.5 2.5-2.5"/></svg><span>خروجی آرشیو درآمدها</span>'; exb.onclick = function (e) { e.stopPropagation(); hkOpenRecArcExport(); }; }
        if (box.parentNode && exb.previousElementSibling !== box) box.parentNode.insertBefore(exb, box.nextSibling);
        exb.style.display = recurringIncomes.some(function (r) { return r && !r.deletedAt; }) ? '' : 'none';
      } catch (eEx) {}

      const head = document.getElementById('recurringHead');
      if (head) {
        head.onclick = (e) => {
          if (e.target.closest('#addRecurringBtn')) return;
          if (recurringSelectMode) {
            clearRecurringSelection();
            renderRecurringBar();
            return;
          }
          /* منوی اصلی جمع نمی‌شود */
        };
      }

      const batchAdd = document.getElementById('recBatchAdd');
      if (batchAdd) batchAdd.onclick = (e) => { e.stopPropagation(); batchAddRecurringToSection(); };
      const batchCancel = document.getElementById('recBatchCancel');
      if (batchCancel) batchCancel.onclick = (e) => {
        e.stopPropagation();
        clearRecurringSelection();
        renderRecurringBar();
      };

      // لانگ‌پرس: فقط انتخاب ردیف — بدون انتخاب متن / منوی کپی
      // روی کل جعبه هم منوی سیستم را ببند
      if (!box._recNoSelectBound) {
        box._recNoSelectBound = true;
        const blockSel = (e) => { e.preventDefault(); return false; };
        box.addEventListener('selectstart', blockSel);
        box.addEventListener('contextmenu', blockSel);
        box.addEventListener('dragstart', blockSel);
      }

      box.querySelectorAll('.recurring-row[data-rec-idx]').forEach(row => {
        const idx = parseInt(row.getAttribute('data-rec-idx'), 10);
        let lpTimer = null;
        let killIv = null;
        let lpFired = false;
        let startX = 0, startY = 0;
        const clearLp = () => {
          if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
          if (killIv) { clearInterval(killIv); killIv = null; }
        };
        const killTextSelection = () => {
          try {
            const sel = window.getSelection && window.getSelection();
            if (sel && sel.removeAllRanges) sel.removeAllRanges();
          } catch (e) {}
          try {
            if (document.activeElement && document.activeElement.blur &&
                document.activeElement !== document.body) {
              // فوکوس روی ورودی‌های خارج از ردیف را دست نزن
            }
          } catch (e) {}
        };
        const onStart = (e) => {
          if (e.target.closest('button')) return;
          lpFired = false;
          clearLp();
          killTextSelection();
          if (e.touches && e.touches[0]) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
          } else if (typeof e.clientX === 'number') {
            startX = e.clientX;
            startY = e.clientY;
          }
          // حین نگه‌داشتن، هر انتخاب متنی را فوراً پاک کن
          killIv = setInterval(killTextSelection, 40);
          lpTimer = setTimeout(() => {
            // انتخاب دسته‌ای حذف شد — لانگ‌پرس کاری نمی‌کند
            clearLp();
            killTextSelection();
          }, 480);
        };
        const onEnd = (e) => {
          clearLp();
          killTextSelection();
        };
        const onMove = (e) => {
          let x = startX, y = startY;
          if (e.touches && e.touches[0]) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
          } else if (typeof e.clientX === 'number') {
            x = e.clientX;
            y = e.clientY;
          }
          if (Math.abs(x - startX) > 12 || Math.abs(y - startY) > 12) {
            clearLp();
          }
        };
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        });
        row.addEventListener('selectstart', (e) => {
          e.preventDefault();
          return false;
        });
        row.addEventListener('dragstart', (e) => {
          e.preventDefault();
          return false;
        });
        row.addEventListener('touchstart', (e) => {
          if (e.target.closest('button')) return;
          onStart(e);
        }, { passive: true });
        row.addEventListener('touchend', onEnd, { passive: true });
        row.addEventListener('touchcancel', onEnd, { passive: true });
        row.addEventListener('touchmove', onMove, { passive: true });
        row.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          onStart(e);
        });
        row.addEventListener('mouseup', onEnd);
        row.addEventListener('mouseleave', onEnd);
        row.addEventListener('mousemove', onMove);

        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          if (lpFired) {
            e.preventDefault();
            e.stopPropagation();
            lpFired = false;
            killTextSelection();
            return;
          }
          if (recurringSelectMode) {
            e.preventDefault();
            e.stopPropagation();
            toggleRecurringSelect(idx);
            killTextSelection();
            return;
          }
          /* باز/بسته کردن جزئیات */
          const it = recurringIncomes[idx];
          if (!it) return;
          const key = it.id || idx;
          if (recExpanded.has(key)) recExpanded.delete(key); else recExpanded.add(key);
          /* فقط جزئیات (و دکمه‌هایی که در حالت بسته پنهان‌اند) جمع می‌شوند؛ «این ماه: …» همراه باکس آرام بالا می‌آید */
          hkSlideParts(row, function () {
            var out = [row.querySelector('.rec-more')], acts = row.querySelector('.rec-acts.no-renew');
            if (acts) out.push(acts);
            return out;
          }, recExpanded.has(key), function (o) { row.classList.toggle('rec-open', o); });
          try { ensureShapeFrame(box); } catch (eF) {}
        });
      });
      box.querySelectorAll('[data-rec-renew]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-renew'), 10)];
          if (!r) return;
          if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
          recRenewFlow(r, (msg) => { try { saveRecurring(); } catch (e2) {} recRefreshViews(); try { renderRecurringBar(); } catch (e3) {} if (msg) showToast(msg); });
        };
      });

      box.querySelectorAll('[data-ri]').forEach(btn => {
        btn.onclick = () => {
          const r = recurringIncomes[parseInt(btn.getAttribute('data-ri'), 10)];
          if (!r) return;
          const secs = periodData.income.sections || [];
          if (!secs.length) { showToast('بخشی وجود ندارد'); return; }
          // انتخاب هدر مقصد
          openSectionPicker(secs, (secId) => {
            const sec = secs.find(s => s.id === secId) || secs[0];
            if (sectionHasRecurringIncome(sec, r)) {
              showToast('تغییرات اعمال شد');
              return;
            }
            r.sectionId = sec.id;
            r.sectionTitle = (sec.title || '').trim();
            try { recApplyEdit(r, r, {}); } catch (e) {}
            recOfferTodayRow(r, (msg) => {
              try { saveRecurring(); } catch (e) {}
              try { renderSectionsForTab('income'); } catch (e) {}
              renderAll();
              try { renderRecurringBar(); } catch (e) {}
              scheduleSave();
              showToast(msg || ('به «' + (sec.title || 'بخش') + '» اضافه شد'));
            });
          });
        };
      });
      box.querySelectorAll('[data-rec-unlink]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-unlink'), 10)];
          if (!r) return;
          recUnlinkFlow(r, (msg) => { recRefreshViews(); try { renderRecurringBar(); } catch (e2) {} if (msg) showToast(msg); });
        };
      });
      /* ۱.۳.۴۵: اتصال‌ها: جدا کردن اتصال اشتباه یا وصل کردن دستی به ردیف یک ماه */
      box.querySelectorAll('[data-rec-links]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-links'), 10)];
          if (r) recLinksModal(r, () => { try { renderRecurringBar(); } catch (e2) {} });
        };
      });
      box.querySelectorAll('[data-rec-arch]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-arch'), 10)];
          if (r) recOpenArchive(r);
        };
      });
      box.querySelectorAll('[data-rec-link]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-link'), 10)];
          if (!r) return;
          recLinkExistingFlow(r, (msg) => { try { saveRecurring(); } catch (e2) {} recRefreshViews(); try { renderRecurringBar(); } catch (e3) {} if (msg) showToast(msg); });
        };
      });
      box.querySelectorAll('[data-rec-make]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const r = recurringIncomes[parseInt(btn.getAttribute('data-rec-make'), 10)];
          if (!r) return;
          recOfferTodayRow(r, (msg) => { try { saveRecurring(); } catch (e2) {} recRefreshViews(); try { renderRecurringBar(); } catch (e3) {} if (msg) showToast(msg); });
        };
      });
      box.querySelectorAll('[data-re]').forEach(btn => {
        btn.onclick = () => {
          const i = parseInt(btn.getAttribute('data-re'), 10);
          if (recurringIncomes[i] && !canEditRow(recurringIncomes[i])) { showToast(OWNERSHIP_LOCK_MSG); return; }
          box.querySelectorAll('.btn-edit-title.is-editing').forEach(b => b.classList.remove('is-editing'));
          btn.classList.add('is-editing');
          editRecurringItem(i);
        };
      });
      box.querySelectorAll('[data-rd]').forEach(btn => {
        btn.onclick = () => {
          const i = parseInt(btn.getAttribute('data-rd'), 10);
          const item = recurringIncomes[i];
          if (item && !canEditRow(item)) { showToast(OWNERSHIP_LOCK_MSG); return; }
          /* «حذف با ردیف‌ها»: همهٔ ردیف‌های وصل‌شده (دریافت‌شده و نشده، همهٔ ماه‌ها) همراه تعریف به سطل زباله می‌روند و با هم برمی‌گردند.
             «حذف بدون ردیف‌ها»: ردیف‌ها می‌مانند و ردیف معمولی می‌شوند */
          const linked = [];
          try {
            const rid = item && item.id;
            if (rid) recEachMonth(function (k, pd) { ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (row) { if (row && row.fromRecurringId === rid && ((Number(row.amount) || 0) > 0 || (row.desc || '').trim())) linked.push({ key: k, sec: sec, row: row }); }); }); });
          } catch (eL) {}
          const doDelete = (withRows) => {
            /* آرشیو (واریزهای وصل‌شده) همراه تعریف به سطل زباله می‌رود؛ با بازگردانی ردیف‌های موجود دوباره وصل و ردیف‌های حذف‌شده برگردانده می‌شوند */
            try { if (item) pushToTrash('recurring', (item.name || 'درآمد ثابت') + (withRows && linked.length ? ' + ' + toPersianDigits(String(linked.length)) + ' ردیف' : ''), Object.assign(JSON.parse(JSON.stringify(item)), { sourceLabel: 'درآمد ثابت', _archive: hkRecArchivePack([item]), _withRows: !!withRows })); } catch (e) {}
            try {
              if (item && withRows) recRemoveRows(linked);
              /* ردیف‌هایی که می‌مانند پاک نمی‌شوند ولی از این قرارداد آزاد می‌شوند تا به قرارداد تازه وصل شوند */
              if (item) recFreeRows(item);
              recRefreshViews();
            } catch (e) {}
            if (item && item.id && sharedAccountId) {
              item.deletedAt = Date.now();
              item.updatedAt = Date.now();
              try {
                enqueueSync('delete_record', {
                  id: item.id,
                  kind: 'recurring',
                  created_by: item.createdBy || currentUserId(),
                  deleted_at: new Date(item.deletedAt).toISOString(),
                  payload: item
                });
              } catch (e) {}
            }
            recurringIncomes.splice(i, 1);
            // اصلاح ایندکس‌های انتخاب‌شده
            const next = new Set();
            recurringSelected.forEach(x => {
              if (x === i) return;
              next.add(x > i ? x - 1 : x);
            });
            recurringSelected = next;
            if (!recurringSelected.size) recurringSelectMode = false;
            saveRecurring();
            renderRecurringBar();
          };
          /* همان پنجرهٔ تأیید حذف پروژه و حساب؛ انصراف = بازگشت یا زدن بیرون باکس */
          hkAsk3('درآمد ثابت «' + ((item && item.name) || '') + '» حذف شود؟',
            linked.length ? [{ v: 'all', t: 'حذف با ردیف‌ها', cls: 'danger' }, { v: 'keep', t: 'حذف بدون ردیف‌ها', cls: 'danger' }] : [{ v: 'keep', t: 'حذف', cls: 'danger' }],
            function (v) { if (v === 'all') doDelete(true); else if (v === 'keep') doDelete(false); });
        };
      });
      const addBtn = document.getElementById('addRecurringBtn');
      if (addBtn) addBtn.onclick = () => {
        editRecurringItem(-1);
      };
    }

    function openSectionPicker(secs, onPick) {
      /* ۱.۳.۴۶: یک کارت؛ منوی بخش مقصد لازم نیست */
      try { var _mn = hkSingleNorm(hkMainTitle()); var _ms = (secs || []).find(function (x) { return x && hkSingleNorm(x.title) === _mn; }) || (secs || [])[0]; if (_ms) { onPick(_ms.id); return; } } catch (eSp) {}
      let old = document.getElementById('sectionPickerSheet');
      if (old) old.remove();
      const bd = document.getElementById('textInputBackdrop');
      const _spScrollY = window.scrollY || window.pageYOffset || 0;
      if (bd) {
        bd.classList.add('open');
        bd.style.background = 'rgba(0,0,0,0.94)';
        bd.style.webkitBackdropFilter = 'blur(18px)';
        bd.style.backdropFilter = 'blur(18px)';
      }
      document.body.style.position = 'fixed';
      document.body.style.top = (-_spScrollY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';

      function releaseSectionPickerLock() {
        if (bd) {
          bd.classList.remove('open');
          bd.style.background = '';
          bd.style.webkitBackdropFilter = '';
          bd.style.backdropFilter = '';
        }
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, _spScrollY);
      }

      const box = document.createElement('div');
      box.id = 'sectionPickerSheet';
      box.style.cssText = [
        'position:fixed', 'left:16px', 'right:16px', 'z-index:460',
        'top:50%', 'transform:translateY(-50%)',
        'background:var(--card)', 'border:1px solid var(--border)',
        'border-radius:14px', 'padding:14px 12px',
        'box-shadow:0 12px 40px var(--shadow)',
        'max-height:70vh', 'overflow-y:auto', '-webkit-overflow-scrolling:touch'
      ].join(';');

      const title = document.createElement('div');
      title.style.cssText = 'text-align:center;font-weight:bold;font-size:1rem;margin-bottom:12px;color:var(--text);font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif;';
      title.textContent = 'نام کاربر را انتخاب کنید';
      box.appendChild(title);

      if (!secs || !secs.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;color:var(--muted);padding:12px;';
        empty.textContent = 'بخشی وجود ندارد';
        box.appendChild(empty);
      } else {
        secs.forEach(sec => {
          const b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = [
            'display:block', 'width:100%', 'margin-bottom:8px',
            'padding:12px 14px', 'text-align:right',
            'border:1px solid var(--border)', 'border-radius:10px',
            'background:var(--bg3)', 'color:var(--text)',
            'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif',
            'font-size:0.98rem', 'font-weight:bold', 'cursor:pointer'
          ].join(';');
          b.textContent = (sec.title || '').trim() || 'بدون نام';
          b.onclick = () => {
            box.remove();
            releaseSectionPickerLock();
            onPick(sec.id);
          };
          box.appendChild(b);
        });
      }

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.style.cssText = [
        'display:block', 'width:100%', 'margin-top:4px',
        'padding:11px 14px', 'border:1px solid var(--border)',
        'border-radius:10px', 'background:transparent',
        'color:var(--red-tx)', 'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif',
        'font-size:0.95rem', 'font-weight:bold', 'cursor:pointer'
      ].join(';');
      cancel.textContent = 'انصراف';
      cancel.onclick = () => {
        box.remove();
        releaseSectionPickerLock();
      };
      box.appendChild(cancel);

      document.body.appendChild(box);

      if (bd) {
        const closer = (ev) => {
          if (ev.target === bd) {
            box.remove();
            releaseSectionPickerLock();
            bd.removeEventListener('click', closer);
          }
        };
        bd.addEventListener('click', closer);
      }
    }


    /* انتخاب تاریخ با سه منوی کشویی (روز / ماه / سال) مثل منوی پس‌انداز — بدون تایپ.
       همان رابطِ createDateMaskInput را دارد: getDate() و isComplete() */
    function hkCreateDateSelects(initial, opts) {
      opts = opts || {};
      var t = getTodayPersian();
      var st = { d: (initial && parseInt(initial.d, 10)) || t.d, m: (initial && parseInt(initial.m, 10)) || t.m, y: (initial && parseInt(initial.y, 10)) || t.y };
      var wrap = document.createElement('div'); wrap.className = 'sv-date hk-date-sel';
      var mk = function (flex) { var d = document.createElement('div'); d.style.cssText = 'min-width:0;' + flex; wrap.appendChild(d); return d; };
      var wD = mk('flex:0 0 72px;'), wM = mk('flex:1.3;'), wY = mk('flex:0 0 88px;');
      var selD = null, selM = null, selY = null;
      var fire = function () { if (typeof opts.onChange === 'function') { try { opts.onChange({ d: st.d, m: st.m, y: st.y }); } catch (e) {} } };
      try {
        var dayOpts = []; for (var di = 1; di <= 31; di++) dayOpts.push({ value: di, label: toPersianDigits(String(di)) });
        wD.appendChild(selD = createDarkSelect({ listClassName: 'sv-dl', options: dayOpts, value: st.d, onChange: function (v) { st.d = parseInt(v, 10) || 1; fire(); } }));
        wM.appendChild(selM = createDarkSelect({ listClassName: 'sv-dl', options: (MONTHS || []).map(function (n, i) { return { value: i + 1, label: n }; }), value: st.m, onChange: function (v) { st.m = parseInt(v, 10) || 1; fire(); } }));
        /* ۱.۳.۴۶: همهٔ منوهای سال ۱۳۹۰ تا ۱۴۲۰ */
        var yo = []; for (var yi = 1390; yi <= 1420; yi++) yo.push({ value: yi, label: toPersianDigits(String(yi)) });
        if (st.y < 1390 || st.y > 1420) yo.push({ value: st.y, label: toPersianDigits(String(st.y)) });
        wY.appendChild(selY = createDarkSelect({ listClassName: 'sv-dl', options: yo, value: st.y, onChange: function (v) { st.y = parseInt(v, 10) || t.y; fire(); } }));
      } catch (e) {}
      wrap.getDate = function () { return { d: st.d, m: st.m, y: st.y }; };
      /* تنظیم برنامه‌ای (بدون فراخوانی onChange) */
      wrap.setDate = function (d) {
        if (!d) return;
        st.d = parseInt(d.d, 10) || st.d; st.m = parseInt(d.m, 10) || st.m; st.y = parseInt(d.y, 10) || st.y;
        try { if (selD && selD.setValue) selD.setValue(st.d); if (selM && selM.setValue) selM.setValue(st.m); if (selY && selY.setValue) selY.setValue(st.y); } catch (e) {}
      };
      wrap.isComplete = function () { return !!(st.d && st.m && st.y); };
      return wrap;
    }
    function createDateMaskInput(initial) {
      const wrap = document.createElement('div');
      wrap.className = 'date-mask-wrap';
      const d0 = initial && (initial.d || initial.day) ? String(initial.d || initial.day) : '';
      const m0 = initial && (initial.m || initial.month) ? String(initial.m || initial.month) : '';
      const y0 = initial && (initial.y || initial.year) ? String(initial.y || initial.year) : '';
      function seg(val, ph, maxLen) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.className = 'date-seg';
        inp.maxLength = maxLen || 2;
        inp.placeholder = ph;
        if (val) {
          const en = String(val).replace(/\D/g, '');
          if ((maxLen || 2) >= 4 && en.length >= 3) {
            inp.value = toPersianDigits(en.slice(-4).padStart(4, '0'));
          } else {
            const two = en.length >= 2 ? en.slice(-2) : en;
            inp.value = two ? toPersianDigits(two.padStart(2, '0')) : '';
          }
        } else inp.value = '';
        return inp;
      }
      // RTL: day (راست) / month / year کامل (چپ)
      const inpD = seg(d0, '––', 2);
      const inpM = seg(m0, '––', 2);
      let yFull = y0;
      if (yFull && String(yFull).length <= 2) yFull = String(1400 + parseInt(String(yFull), 10));
      const inpY = seg(yFull, '––––', 4);
      inpY.style.width = '3.4em';
      const s1 = document.createElement('span'); s1.className = 'date-sep'; s1.textContent = '/';
      const s2 = document.createElement('span'); s2.className = 'date-sep'; s2.textContent = '/';
      wrap.appendChild(inpD); wrap.appendChild(s1); wrap.appendChild(inpM); wrap.appendChild(s2); wrap.appendChild(inpY);

      function prevInput(inp) {
        var p = inp.previousElementSibling;
        while (p && p.tagName !== 'INPUT') p = p.previousElementSibling;
        return p;
      }
      // روز و ماه: صفر پیشرو مجاز (۰۵)، بعد از ۲ رقم برو بعدی
      function bindDM(inp, next, maxN) {
        inp.addEventListener('input', function() {
          let v = toEnglishDigits(inp.value).replace(/[^0-9]/g, '');
          if (v.length > 2) v = v.slice(0, 2);
          // حفظ صفر پیشرو — فقط وقتی ۲ رقم شد محدود کن
          if (v.length === 2) {
            let n = parseInt(v, 10);
            if (maxN && n > maxN) n = maxN;
            if (n < 1 && maxN) n = 1;
            v = String(n).padStart(2, '0');
          }
          inp.value = v ? toPersianDigits(v) : '';
          if (v.length >= 2 && next) {
            try { next.focus(); if (next.select) next.select(); } catch (e) {}
          }
        });
        inp.addEventListener('blur', function() {
          let v = toEnglishDigits(inp.value).replace(/[^0-9]/g, '');
          if (!v) return;
          let n = parseInt(v, 10) || 0;
          if (maxN && n > maxN) n = maxN;
          if (n < 1) n = 1;
          inp.value = toPersianDigits(String(n).padStart(2, '0'));
        });
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Backspace' && !(toEnglishDigits(inp.value).replace(/\D/g,''))) {
            var p = prevInput(inp);
            if (p) try { p.focus(); } catch (e2) {}
          }
        });
      }
      // سال: کاربر هر چهار رقم را خودش وارد می‌کند (مثل ۱۴۰۵)؛ تبدیل خودکار دو رقمی حذف شد
      inpY.addEventListener('input', function() {
        let v = toEnglishDigits(inpY.value).replace(/[^0-9]/g, '');
        if (v.length > 4) v = v.slice(0, 4);
        inpY.value = v ? toPersianDigits(v) : '';
      });
      inpY.addEventListener('focus', function() {
        try { inpY.select(); } catch (e) {}
      });
      inpY.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !(toEnglishDigits(inpY.value).replace(/\D/g,''))) {
          var p = prevInput(inpY);
          if (p) try { p.focus(); } catch (e2) {}
        }
      });

      bindDM(inpD, inpM, 31);
      bindDM(inpM, inpY, 12);

      wrap.getDate = function() {
        const d = parseInt(toEnglishDigits(inpD.value), 10) || 0;
        const m = parseInt(toEnglishDigits(inpM.value), 10) || 0;
        let y = parseInt(toEnglishDigits(inpY.value), 10) || 0;
        if (y > 0 && y < 100) y += 1400;
        return { d: d, m: m, y: y };
      };
      wrap.isComplete = function() {
        const g = wrap.getDate();
        return g.d >= 1 && g.d <= 31 && g.m >= 1 && g.m <= 12 && g.y >= 1300;
      };
      return wrap;
    }

    function editRecurringItem(index) {
      const existing = index >= 0 ? recurringIncomes[index] : { name: '', amount: 0, day: '' };
      openRecurringSheet(index, existing);
    }

    function openRecurringSheet(index, existing) {
      closeRemindBarIfOpen();
      closeDarkSelects();
      let sheet = document.getElementById('recurringSheet');
      if (sheet) sheet.remove();
      lockBodyScroll();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) {
        bd.style.top = '0';
        bd.style.height = '';
        bd.classList.add('open');
      }
      // حذف لیست‌های کشویی رهاشده از بازشدن‌های قبلی این شیت
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      sheet = document.createElement('div');
      sheet.id = 'recurringSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px;box-shadow:0 12px 32px var(--shadow);overflow-y:auto;-webkit-overflow-scrolling:touch;';
      function repositionSheet() {
        const vv2 = window.visualViewport;
        const vh = vv2 ? vv2.height : window.innerHeight;
        const vTop = vv2 ? vv2.offsetTop : 0;
        // پایین‌تر از لبه بالا تا زیر هدر شلوغ نباشد
        const topPad = Math.max(56, Math.floor(vh * 0.12));
        sheet.style.top = (vTop + topPad) + 'px';
        sheet.style.maxHeight = Math.max(160, vh - topPad - 16) + 'px';
      }
      repositionSheet();
      const vv = window.visualViewport;
      if (vv) vv.addEventListener('resize', repositionSheet);

      function field(labelText, inputEl) {
        const lab = document.createElement('div');
        lab.style.cssText = 'font-size:0.78rem;color:var(--muted);margin-bottom:3px;text-align:center;';
        lab.textContent = labelText;
        sheet.appendChild(lab);
        sheet.appendChild(inputEl);
      }
      const inpStyle = 'width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:0.95rem;margin-bottom:7px;text-align:center;box-sizing:border-box;';

      const inpName = document.createElement('input');
      inpName.type = 'text';
      inpName.value = existing.name || '';
      inpName.placeholder = 'نام را وارد کنید';
      inpName.style.cssText = inpStyle;
      field('نام درآمد ثابت', inpName);

      const inpAmt = document.createElement('input');
      inpAmt.type = 'text';
      inpAmt.inputMode = 'numeric';
      inpAmt.value = existing.amount ? formatNum(existing.amount) : '';
      inpAmt.placeholder = 'مبلغ را وارد کنید';
      inpAmt.style.cssText = inpStyle;
      hkAmountInput(inpAmt);
      field('مبلغ ماهانه (تومان)', inpAmt);
      /* رهن/ودیعه: فقط برای ثبت و دیدن؛ اختیاری و در هیچ حسابی اثر ندارد */
      const inpDep = document.createElement('input');
      inpDep.type = 'text';
      inpDep.inputMode = 'numeric';
      inpDep.className = 'rec-deposit-inp';
      inpDep.value = existing.deposit ? formatNum(existing.deposit) : '';
      inpDep.placeholder = 'مبلغ رهن/ودیعه، اختیاری';
      inpDep.style.cssText = inpStyle;
      hkAmountInput(inpDep);
      field('رهن (تومان)', inpDep);

      const startInit = existing.contractStart || (existing.day ? { d: existing.day, m: currentMonth, y: currentYear } : null);
      const endInit = existing.contractEnd || null;
      const labStart = document.createElement('div');
      labStart.className = 'date-mask-label rec-date-lab';
      labStart.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;';
      /* ۱.۳.۴۹: اینفوباکس برداشته شد؛ فقط برای مورد قدیمیِ بی‌تاریخ شروع، تذکر می‌ماند */
      labStart.innerHTML = '<span>شروع قرارداد</span>' + ((index >= 0 && !recStartKey(existing)) ? hkInfoBtnHtml('این مورد تاریخ شروع نداشت؛ آن را تأیید کنید تا ساخت ماهانه ادامه یابد.') : '');
      sheet.appendChild(labStart);
      let endTouched = !!existing.contractEnd;
      const plusYear = (d) => ({ d: d.d, m: d.m, y: d.y + 1 });
      const maskStart = hkCreateDateSelects(startInit, { onChange: (d) => { if (!endTouched && maskEnd && maskEnd.setDate) maskEnd.setDate(plusYear(d)); } });
      sheet.appendChild(maskStart);
      /* پایان قرارداد اجباری؛ پیش‌فرض یک سال بعد از شروع و تا دستی عوض نشده همراه شروع جابه‌جا می‌شود */
      const labEnd = document.createElement('div');
      labEnd.className = 'date-mask-label rec-end-lab';
      labEnd.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;';
      labEnd.innerHTML = '<span>پایان قرارداد</span>'; /* ۱.۳.۴۹: اینفوباکس برداشته شد */
      sheet.appendChild(labEnd);
      const maskEnd = hkCreateDateSelects(endInit || plusYear(maskStart.getDate()), { onChange: () => { endTouched = true; } });
      maskEnd.id = 'recEndDate';
      sheet.appendChild(maskEnd);

      // بخش‌های درآمد ماه جاری (اولویت) + عناوین یکتای آرشیو
      const secOpts = [];
      const seenTitles = new Set();
      const pushSec = (s, preferId) => {
        if (!s) return;
        const title = (s.title || '').trim();
        const key = title || s.id || '';
        if (!key || seenTitles.has(key)) return;
        seenTitles.add(key);
        // value = id ماه جاری اگر باشد، وگرنه title
        secOpts.push({
          value: preferId && s.id ? s.id : (title || s.id),
          label: title || 'بدون عنوان'
        });
      };
      ((periodData.income && periodData.income.sections) || []).forEach(s => pushSec(s, true));
      try {
        Object.keys(archive || {}).forEach(k => {
          const pd = archive[k];
          ((pd && pd.income && pd.income.sections) || []).forEach(s => pushSec(s, false));
        });
      } catch (e) {}
      const secOptionsRec = [{ value: '', label: 'کاربر بخش مقصد را انتخاب کنید' }].concat(secOpts);
      if (secOpts.length === 0) {
        secOptionsRec.push({ value: '__none__', label: 'ابتدا در تب درآمد یک بخش بسازید' });
      }
      const secSelRec = createDarkSelect({
        options: secOptionsRec,
        /* اگر فقط یک بخش هست، همان پیش‌فرض */
        value: existing.sectionId || (secOpts.length === 1 ? secOpts[0].value : '')
      });
      secSelRec.style.marginBottom = '7px';
      /* ۱.۳.۴۶: یک کارت؛ «بخش مقصد» نشان داده نمی‌شود (خودکار کارت اصلی) */
      secSelRec.style.display = 'none';
      sheet.appendChild(secSelRec);

      const accOptionsRec = [{ value: '', label: 'انتخاب حساب' }].concat(selectedAccountLabels().map(n => ({ value: n, label: n })));
      const accSelRec = createDarkSelect({
        options: accOptionsRec,
        value: existing.account || ''
      });
      if (accSelRec._list) {
        accSelRec._list.classList.add('bank-acc-list');
        accSelRec._list.classList.add('bank-acc-list-lg');
      }
      accSelRec.style.marginBottom = '7px';
            try {
        if (false && typeof inpDay !== 'undefined' && inpDay) {
          inpDay.setAttribute('enterkeyhint', 'next');
          inpDay.setAttribute('inputmode', 'numeric');
          inpDay.onkeydown = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
              e.preventDefault();
              try {
                const btn = secSelRec && (secSelRec.querySelector('.dark-select-btn') || secSelRec.querySelector('button'));
                if (btn) btn.click(); else if (secSelRec.click) secSelRec.click();
              } catch (err) {}
            }
          };
        }
        if (typeof secSelRec !== 'undefined' && secSelRec) {
          const secBtn = secSelRec.querySelector('.dark-select-btn') || secSelRec;
          secBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
              e.preventDefault();
              try {
                const btn = accSelRec && (accSelRec.querySelector('.dark-select-btn') || accSelRec.querySelector('button'));
                if (btn) btn.click();
              } catch (err) {}
            }
          });
        }
      } catch (e) {}
field('حساب بانکی', accSelRec);

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.textContent = 'تأیید';
      ok.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:bold;cursor:pointer;';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'انصراف';
      cancel.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;cursor:pointer;';

      const clearEditIcons = () => {
        try {
          document.querySelectorAll('#recurringBox .btn-edit-title.is-editing').forEach(b => b.classList.remove('is-editing'));
        } catch (e) {}
      };
      const close = () => {
        try { sheet.remove(); } catch (e) {}
        try { if (accSelRec._list) accSelRec._list.remove(); } catch (e) {}
        try { if (secSelRec._list) secSelRec._list.remove(); } catch (e) {}
        try { if (window.visualViewport) window.visualViewport.removeEventListener('resize', repositionSheet); } catch (e) {}
        const bd2 = document.getElementById('textInputBackdrop');
        if (bd2) {
          bd2.classList.remove('open');
          bd2.style.top = '';
          bd2.style.height = '';
        }
        document.removeEventListener('mousedown', outside, true);
        clearEditIcons();
        unlockBodyScroll();
      };
      const save = () => {
        if (index >= 0 && recurringIncomes[index] && !canEditRow(recurringIncomes[index])) {
          showToast(OWNERSHIP_LOCK_MSG);
          return;
        }
        const name = (inpName.value || '').trim();
        if (!name) { showToast('نام را وارد کنید'); try { inpName.focus(); } catch (e) {} return; }
        const amtDigits = toEnglishDigits(inpAmt.value || '').replace(/[^0-9]/g, '');
        const amount = amtDigits ? (parseInt(amtDigits, 10) || 0) : 0;
        const st = maskStart.getDate();
        const hasEnd = true;
        const en = maskEnd.getDate();
        let day = st.d || 0;
        if (day > 31) day = 31;
        if (!maskStart.isComplete()) { showToast('تاریخ شروع قرارداد را کامل وارد کنید'); return; }
        if (hasEnd && !maskEnd.isComplete()) { showToast('پایان قرارداد را کامل وارد کنید'); return; }
        if (hasEnd && recMonthKey(en.y, en.m) < recMonthKey(st.y, st.m)) { showToast('پایان قرارداد باید بعد از شروع باشد'); return; }
        const depDigits = toEnglishDigits(inpDep.value || '').replace(/[^0-9]/g, '');
        const deposit = depDigits ? (parseInt(depDigits, 10) || 0) : 0;
        const item = {
          name: name,
          amount: amount,
          deposit: deposit,
          day: day || '',
          account: accSelRec.getValue() || '',
          contractStart: { d: st.d, m: st.m, y: st.y },
          contractEnd: hasEnd ? { d: en.d, m: en.m, y: en.y } : null
        };
        // اگر بخش مقصد انتخاب شده، نام بخش را روی رکورد نگه دار
        const destSecId = (secSelRec.getValue && secSelRec.getValue()) || '';
        if (destSecId && destSecId !== '__none__') {
          const secs0 = (periodData.income && periodData.income.sections) || [];
          const sec0 = secs0.find(s => s.id === destSecId);
          if (sec0) {
            item.sectionId = sec0.id;
            item.sectionTitle = (sec0.title || '').trim();
          } else {
            /* بخشی که فقط در ماه‌های دیگر هست (مقدار = عنوان) */
            item.sectionTitle = String(destSecId).trim();
          }
        } else if (index >= 0 && recurringIncomes[index]) {
          // حفظ بخش قبلی اگر عوض نشده
          if (recurringIncomes[index].sectionId) item.sectionId = recurringIncomes[index].sectionId;
          if (recurringIncomes[index].sectionTitle) item.sectionTitle = recurringIncomes[index].sectionTitle;
        }
        if (!(item.sectionTitle || item.sectionId)) { item.sectionTitle = hkMainTitle(); try { var _cs = ((periodData.income && periodData.income.sections) || [])[0]; if (_cs) item.sectionId = _cs.id; } catch (eCs) {} }
        const today = recTodayKey();
        const finish = (toastMsg) => {
          saveRecurring();
          try { renderSectionsForTab('income'); } catch (e) {}
          recRefreshViews();
          // بعد از تأیید، لیست همه درآمدهای ثابت را نشان بده (بعد از رسم بقیهٔ صفحه، تا پاک نشود)
          try {
            recurringCollapsed = false;
            if (_featureActive !== 'recurring') {
              openFeatureSheet('recurring');
            } else {
              renderRecurringBar();
            }
          } catch (e) {
            try { renderRecurringBar(); } catch (e2) {}
          }
          try { scheduleSave(); } catch (e) {}
          if (toastMsg) { try { showToast(toastMsg); } catch (e) {} }
        };
        if (index >= 0 && recurringIncomes[index]) {
          // شناسه و مالکیت رکورد قبلی حفظ شود تا با Sync قبلی تداخل نکند
          const prev = recurringIncomes[index];
          item.id = prev.id || newRecordId();
          item.createdBy = prev.createdBy;
          item.createdByName = prev.createdByName;
          item.createdAt = prev.createdAt;
          item.deletedAt = prev.deletedAt || null;
          item.updatedAt = Date.now();
          item.fromKey = parseInt(prev.fromKey, 10) || today;
          item.genKey = parseInt(prev.genKey, 10) || recPrevKey(today);
          if (prev.paidAhead) item.paidAhead = prev.paidAhead;
          if (prev.payerHints) item.payerHints = prev.payerHints;
          /* دوره‌های قبلی قرارداد (بعد از تمدید) با ویرایش عادی دست نمی‌خورند */
          if (Array.isArray(prev.terms) && prev.terms.length) item.terms = prev.terms;
          const wasLegacy = !recStartKey(prev);
          /* تعریف قدیمیِ بدون تاریخ شروع: از همین ماه ادامه می‌دهد */
          if (wasLegacy) item.fromKey = today;
          const rows = recRowsOf(prev);
          const curRow = rows.find(x => x.key === today);
          const amountChanged = (Number(prev.amount) || 0) !== amount;
          const newFirst = recStartKey(item), newEnd = recEndKey(item);
          const beforeStart = rows.filter(x => newFirst && x.key < newFirst && recStartKey(prev) && newFirst > recStartKey(prev));
          const afterEnd = rows.filter(x => newEnd && x.key > newEnd && (!recEndKey(prev) || newEnd < recEndKey(prev)));
          const pastUnpaid = rows.filter(x => x.key < today && !recIsPaid(x.row) && !(newFirst && x.key < newFirst));
          const qs = [];
          const notes = [];
          if (amountChanged && curRow && !recIsPaid(curRow.row)) {
            qs.push({ id: 'fromThis', msg: 'مبلغ جدید (' + formatNum(amount) + ' تومان) از کدام ماه اعمال شود؟', yes: 'از این ماه', no: 'از ماه بعد' });
          } else if (amountChanged && curRow && recIsPaid(curRow.row)) {
            notes.push('این ماه دریافت شده؛ مبلغ جدید از ماه بعد اعمال می‌شود');
          }
          if (beforeStart.some(x => !recIsPaid(x.row))) {
            qs.push({ id: 'trimBefore', msg: toPersianDigits(beforeStart.filter(x => !recIsPaid(x.row)).length) + ' ردیف «دریافت نشده» قبل از شروع تازه هست. پاک شوند؟', yes: 'پاک شوند', no: 'بمانند' });
          }
          if (beforeStart.some(x => recIsPaid(x.row))) notes.push('ردیف‌های دریافت‌شدهٔ قبل از شروع تازه نگه داشته شدند');
          if (afterEnd.some(x => !recIsPaid(x.row))) {
            qs.push({ id: 'trimAfter', msg: toPersianDigits(afterEnd.filter(x => !recIsPaid(x.row)).length) + ' ردیف «دریافت نشده» بعد از پایان تازه هست. پاک شوند؟', yes: 'پاک شوند', no: 'بمانند' });
          }
          if (amountChanged && pastUnpaid.length) {
            qs.push({ id: 'pastAmount', msg: 'ماه‌های قبل ' + toPersianDigits(pastUnpaid.length) + ' ردیف «دریافت نشده» دارند. مبلغ آن‌ها هم ' + formatNum(amount) + ' تومان شود؟', yes: 'بله', no: 'نه، بماند' });
          }
          close();
          recAskSeq(qs, (ans) => {
            const res = recApplyEdit(prev, item, {
              amountFromNext: ans.fromThis === false,
              trimBefore: !!ans.trimBefore,
              trimAfter: !!ans.trimAfter,
              pastAmount: !!ans.pastAmount
            });
            const i2 = recurringIncomes.indexOf(prev);
            if (i2 >= 0) recurringIncomes[i2] = item; else recurringIncomes.push(item);
            if (res.removed) notes.push(toPersianDigits(res.removed) + ' ردیف دریافت‌نشده پاک شد');
            /* این ماه ردیفی نداشت: ویرایش وضعیت این ماه را عوض نمی‌کند و خودکار ردیف نمی‌سازد
               (کاربر در صورت نیاز با «ساخت ردیف» می‌سازد) */
            if (!curRow && recInRange(item, today)) item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
            finish(notes[0] || 'تغییرات اعمال شد');
          });
          return;
        }
        stampRowOwner(item);
        if (!item.id) item.id = newRecordId();
        item.fromKey = today;
        item.genKey = recPrevKey(today);
        recurringIncomes.push(item);
        close();
        const first = recFirstKey(item);
        recOfferTodayRow(item, (msg) => {
          finish(msg || (first > today ? 'ردیف‌ها از ' + recKeyLabel(first) + ' ساخته می‌شوند' : ''));
          /* ۱.۳.۵۵: قرارداد از قبل شروع شده: واریزهای قبلی از پیامک‌های گوشی پیدا و با تیک تأیید می‌شوند */
          if (recStartKey(item) && recStartKey(item) < today) setTimeout(() => { try { recScanSmsHistory(item, (n) => { if (n) showToast(toPersianDigits(String(n)) + ' واریز قبلی به آرشیو «' + (item.name || '') + '» اضافه شد'); }); } catch (eSc) {} }, 500);
        });
      };
      ok.onclick = save;
      cancel.onclick = close;
      const outside = (e) => {
        if (isDarkSelectTarget(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('#hkInfoTip, #hkInfoShield')) return;
        if (!sheet.contains(e.target)) close();
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inpName.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); inpAmt.focus(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      };
      inpAmt.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); try { maskStart.querySelector('input').focus(); } catch (e2) {} }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(actions);
      document.body.appendChild(sheet);
      setTimeout(() => {
        try {
          inpName.focus({ preventScroll: true });
          if (inpName.value) caretToEnd(inpName);
        } catch (e) {
          try { inpName.focus(); if (inpName.value) caretToEnd(inpName); } catch (e2) {}
        }
      }, 50);
    }

    function askAmountInput(label, currentValue, onSave, placeholderHint) {
      document.getElementById('textInputLabel').textContent = label || 'مبلغ';
      const field = document.getElementById('textInputField');
      field.inputMode = 'numeric';
      field.value = currentValue ? formatNum(currentValue) : '';
      field.placeholder = placeholderHint || label || 'مبلغ را وارد کنید';
      textInputCallback = (raw) => {
        field.inputMode = 'text';
        field.placeholder = 'بنویسید و تأیید کنید';
        onSave(parseAmount(raw));
      };
      document.getElementById('textInputModal').classList.add('open');
      placeTextInputSheet();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) bd.classList.add('open');
      // جداکننده زنده هنگام تایپ
      field.oninput = function amountLiveFormat() {
        const digits = toEnglishDigits(field.value).replace(/[^0-9]/g, '');
        if (!digits) { field.value = ''; return; }
        const n = parseInt(digits, 10) || 0;
        field.value = formatNum(n);
        try { field.setSelectionRange(field.value.length, field.value.length); } catch (e) {}
      };
      setTimeout(() => {
        try { field.focus(); caretToEnd(field); } catch (e) {}
        placeTextInputSheet();
      }, 50);
    }


    function buildSectionEl(sec) {
      // اگر داده دارد، پیش‌فرض باز باشد
      if (sec.collapsed === undefined) {
        const hasData = (sec.rows || []).some(r => r.desc || r.amount || r.day);
        sec.collapsed = !hasData;
      }
      sec.headerBg = colorForTitle(sec.title);
      sec.color = tabAccentColor(currentTab);

      const div = document.createElement('div');
      div.className = 'section bank-card' + (sec.collapsed ? ' collapsed' : '');
      // شناسه یکتا برای هر تب (جلوگیری از تداخل درآمد/مخارج)
      const tabPrefix = (currentTab === 'income' || currentTab === 'expense') ? currentTab : 'x';
      div.id = 'sec-' + tabPrefix + '-' + sec.id;
      div.dataset.secId = sec.id;
      div.dataset.tab = tabPrefix;

      const header = document.createElement('div');
      header.className = 'section-header bank-card-header';
      const cardStyle = pastelCardForTitle(sec.title);
      // رنگ تیره یکدست + پترن CSS روی کل کارت
      div.style.setProperty('--card-solid', cardStyle.solid || cardStyle.cssBg);
      div.style.backgroundColor = cardStyle.solid || cardStyle.cssBg;
      header.style.background = 'transparent';
      header.style.color = '#fff';

      const arrowBox = document.createElement('div');
      arrowBox.className = 'collapse-arrow-box';
      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      function setArrowIcon(collapsed) {
        arrow.innerHTML = collapsed
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
      }
      setArrowIcon(!!sec.collapsed);
      arrowBox.appendChild(arrow);

      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.display = 'none';

      // عنوان: نمایش + منوی کشویی
      const titleWrap = document.createElement('div');
      titleWrap.className = 'title-wrap';
      titleWrap.style.cssText = 'flex:1;min-width:0;position:relative;';

      const titleDisplay = document.createElement('div');
      titleDisplay.className = 'title-display';
      titleDisplay.textContent = (sec.title || '').trim() || 'نام کاربر';
      titleDisplay.style.cssText = 'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif;font-weight:800;font-size:3.6rem;padding:0;border:none;background:transparent;display:block;visibility:visible;opacity:1;color:#fff;-webkit-text-fill-color:#fff;line-height:1.05;';
      if (!(sec.title || '').trim()) titleDisplay.style.opacity = '0.55';

      const titleMenu = document.createElement('div');
      titleMenu.className = 'title-menu';
      titleMenu.style.cssText = 'display:none;position:absolute;top:100%;right:0;left:0;z-index:40;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow-y:auto;-webkit-overflow-scrolling:touch;max-height:60vh;margin-top:4px;';

      function closeTitleMenu() {
        titleMenu.style.display = 'none';
        titleMenu.style.pointerEvents = 'none';
        div.classList.remove('menu-open');
        try { editTitleBtn.classList.remove('is-editing'); } catch (err) {}
        document.removeEventListener('mousedown', outsideClose);
        document.removeEventListener('click', outsideClose);
        if (window.visualViewport && titleMenu._vvHandler) {
          window.visualViewport.removeEventListener('resize', titleMenu._vvHandler);
          window.visualViewport.removeEventListener('scroll', titleMenu._vvHandler);
          titleMenu._vvHandler = null;
        }
        if (titleMenu.parentNode === document.body) titleWrap.appendChild(titleMenu);
        const sy = parseInt(document.body.dataset.scrollLock || '0', 10) || 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        delete document.body.dataset.scrollLock;
        if (sy) window.scrollTo(0, sy);
        try {
          editTitleBtn.disabled = false;
          editTitleBtn.style.pointerEvents = 'auto';
          editTitleBtn.style.opacity = '1';
        } catch (err) {}
      }
      function outsideClose(e) {
        // اسکرول صفحه منو را نببندد — فقط کلیک واقعی بیرون
        if (e.type === 'touchstart') return;
        if (!titleWrap.contains(e.target) && !titleMenu.contains(e.target)) closeTitleMenu();
      }
      function keepTitleMenuAboveKeyboard() {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const topReserve = 100; // sticky top bar + tabs
        titleMenu.style.maxHeight = Math.max(160, vh - topReserve) + 'px';
        try {
          const rect = header.getBoundingClientRect();
          if (rect.top < topReserve || rect.bottom > vh) {
            const targetY = window.scrollY + rect.top - topReserve;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        } catch (err) {}
      }
      function openTitleMenu(e) {
        if (e) e.stopPropagation();
        closeRemindBarIfOpen();
        div.classList.add('menu-open');
        try { editTitleBtn.classList.add('is-editing'); } catch (err) {}
        titleMenu.innerHTML = '';
        if (titleMenu.parentNode !== document.body) document.body.appendChild(titleMenu);

        // یک مستطیل باریک — بدون قاب تو در تو
        titleMenu.style.cssText = 'display:block;position:fixed;z-index:300;background:transparent;border:none;box-shadow:none;overflow:visible;left:12px;right:12px;padding:0;margin:0;pointer-events:auto;';

        const newBox = document.createElement('div');
        newBox.className = 'title-menu-input-wrap';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'عنوان را بنویسید';
        inp.value = (sec.title || '').trim();
        inp.setAttribute('enterkeyhint', 'done');
        inp.setAttribute('inputmode', 'text');
        inp.autocomplete = 'off';
        inp.onmousedown = (ev) => ev.stopPropagation();
        inp.onclick = (ev) => ev.stopPropagation();

        let committed = false;
        const unlockBody = () => {
          const sy = parseInt(document.body.dataset.scrollLock || '0', 10) || 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.width = '';
          delete document.body.dataset.scrollLock;
          if (sy) window.scrollTo(0, sy);
        };
        const commit = () => {
          if (committed) return;
          committed = true;
          const v = (inp.value || '').trim();
          if (v) applyTitle(v);
          closeTitleMenu();
          unlockBody();
          // اطمینان از فعال بودن دکمه ادیت
          try { editTitleBtn.disabled = false; editTitleBtn.style.pointerEvents = 'auto'; editTitleBtn.style.opacity = '1'; } catch (err) {}
        };
        const onGo = (ev) => {
          if (ev.key === 'Enter' || ev.keyCode === 13 || ev.key === 'Go' || ev.key === 'Done') {
            ev.preventDefault();
            ev.stopPropagation();
            commit();
          }
          if (ev.key === 'Escape') { committed = true; closeTitleMenu(); unlockBody(); }
        };
        inp.onkeydown = onGo;
        inp.onkeyup = onGo;
        inp.addEventListener('blur', () => {
          setTimeout(() => {
            if (!committed && titleMenu.style.display !== 'none') commit();
          }, 150);
        });
        newBox.appendChild(inp);
        titleMenu.appendChild(newBox);

        function placeTitleMenuAboveKeyboard() {
          const vv = window.visualViewport;
          const offsetTop = vv ? vv.offsetTop : 0;
          const visH = vv ? vv.height : window.innerHeight;
          const top = offsetTop + Math.max(80, Math.floor(visH * 0.25));
          titleMenu.style.top = top + 'px';
          titleMenu.style.left = '12px';
          titleMenu.style.right = '12px';
        }
        placeTitleMenuAboveKeyboard();

        titleMenu._vvHandler = placeTitleMenuAboveKeyboard;
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', titleMenu._vvHandler);
          window.visualViewport.addEventListener('scroll', titleMenu._vvHandler);
        }

        setTimeout(() => {
          document.addEventListener('mousedown', outsideClose);
          document.addEventListener('click', outsideClose);
          try { inp.focus({ preventScroll: true }); } catch (err) { try { inp.focus(); } catch (e2) {} }
          // سلکت‌آل تا با تایپ متن قبلی پاک شود
          try {
            if (inp.value) caretToEnd(inp);
            else inp.setSelectionRange(0, 0);
          } catch (err) {}
          placeTitleMenuAboveKeyboard();
        }, 40);
        setTimeout(placeTitleMenuAboveKeyboard, 300);
        setTimeout(placeTitleMenuAboveKeyboard, 600);
      }

      function applyTitle(t) {
        const trimmed = (t || '').trim();
        if (!trimmed) return;
        const dup = (periodData[currentTab].sections || []).some(
          s => s.id !== sec.id && (s.title || '').trim() === trimmed
        );
        if (dup) {
          showToast('اسم تکراری است');
          return;
        }
        sec.title = trimmed;
        stampRowOwner(sec);
        titleDisplay.textContent = trimmed;
        titleDisplay.style.opacity = '1';
        const card = pastelCardForTitle(trimmed);
        const d = dotForTitle(trimmed);
        sec.headerBg = card.solid || card.cssBg;
        sec.color = d;
        div.style.setProperty('--card-solid', card.solid || card.cssBg);
        div.style.backgroundColor = card.solid || card.cssBg;
        header.style.background = 'transparent';
        header.style.color = '#fff';
        titleDisplay.style.color = '#fff';
        titleDisplay.style.webkitTextFillColor = '#fff';
        dot.style.background = d;
        syncTitleColors(trimmed);
        // اگر اقساطی به این بخش وصل‌اند، عنوان لینک را به‌روز کن
        if (currentTab === 'expense') {
          (plans || []).forEach(p => {
            if (p.expenseSectionId === sec.id) p.expenseSectionTitle = trimmed;
          });
          syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
        }
        updateSummary();
        updateBalance();
        scheduleSave();
      }

      // کلیک روی عنوان → باز/بسته بخش (مثل بقیه هدر)
      // برای تغییر عنوان: دکمه کوچک ✎
      const editTitleBtn = document.createElement('button');
      editTitleBtn.type = 'button';
      editTitleBtn.className = 'btn-edit-title';
      editTitleBtn.title = 'تغییر عنوان';
      editTitleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      editTitleBtn.onclick = (e) => {
        e.stopPropagation();
        if (!canEditRow(sec)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        try { editTitleBtn.classList.add('is-editing'); } catch (err) {}
        openSectionNameSheet(sec, (v) => {
          try { editTitleBtn.classList.remove('is-editing'); } catch (err) {}
          if (v && (currentTab === 'income' || currentTab === 'expense')) {
            try { propagateSectionToAllMonths(currentTab, v); } catch (err) {}
          }
        });
      };
      if (pendingRenameSecId && pendingRenameSecId === sec.id) {
        pendingRenameSecId = null;
        setTimeout(() => {
          try {
            const el = document.getElementById(div.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {}
          openSectionNameSheet(sec, null);
        }, 80);
      }

      titleWrap.appendChild(titleDisplay);
      titleWrap.appendChild(titleMenu);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-del-row';
      btnDel.title = 'حذف بخش';
      btnDel.textContent = '×';
      btnDel.onclick = (e) => { e.stopPropagation(); askDeleteSection(sec.id); };

      // چیدمان کارت: راست عنوان+فلش، چپ ادیت/حذف (بدون آیکون سواپ)
      const topRow = document.createElement('div');
      topRow.className = 'bank-card-top';
      const titleSide = document.createElement('div');
      titleSide.className = 'bank-card-title-side';
      titleSide.appendChild(arrowBox);
      titleSide.appendChild(titleWrap);
      const actions = document.createElement('div');
      actions.className = 'bank-card-actions';
      actions.appendChild(editTitleBtn);
      actions.appendChild(btnDel);
      topRow.appendChild(titleSide);
      topRow.appendChild(actions);
      header.appendChild(topRow);
      header.appendChild(dot);

      // آمار روی کارت
      const statsBox = document.createElement('div');
      statsBox.className = 'bank-card-stats';
      const isIncomeCard = currentTab === 'income';
      const labTotal = isIncomeCard ? 'درآمد کل' : 'خرج کل';
      const labPaid = isIncomeCard ? 'دریافت شده' : 'پرداخت شده';
      const labUnpaid = isIncomeCard ? 'دریافت نشده' : 'پرداخت نشده';
      const elTotal = document.createElement('div');
      elTotal.className = 'bank-card-stat total';
      const elPaid = document.createElement('div');
      elPaid.className = 'bank-card-stat paid';
      const elUnpaid = document.createElement('div');
      elUnpaid.className = 'bank-card-stat unpaid';
      function refreshCardStats() {
        const t = sectionPaidUnpaidTotal(sec);
        elTotal.textContent = labTotal + ': ' + formatNum(t.total);
        elPaid.textContent = labPaid + ': ' + formatNum(t.paid);
        elUnpaid.textContent = labUnpaid + ': ' + formatNum(t.unpaid);
      }
      refreshCardStats();
      statsBox.appendChild(elTotal);
      statsBox.appendChild(elPaid);
      statsBox.appendChild(elUnpaid);
      header.appendChild(statsBox);
      div._refreshCardStats = refreshCardStats;

      // کل هدر شامل اسم → جمع/باز
      header.onclick = (e) => {
        if (div._skipClick || div.classList.contains('dragging')) return;
        if (e.target === btnDel || e.target === editTitleBtn) return;
        if (btnDel.contains(e.target) || editTitleBtn.contains(e.target)) return;
        if (actions.contains(e.target) && (e.target.closest('.btn-edit-title') || e.target.closest('.btn-del-row') || e.target.closest('.drag-handle'))) return;
        if (titleMenu.contains(e.target)) return;
        sec.collapsed = !sec.collapsed;
        div.classList.toggle('collapsed', sec.collapsed);
        setArrowIcon(!!sec.collapsed);
        persistCurrent();
        scheduleSave();
      };

      div.appendChild(header);

      const body = document.createElement('div');
      body.className = 'section-body';

      const paidLabel = currentTab === 'income' ? 'دریافت‌شده' : 'پرداخت‌شده';
      const unpaidLabel = currentTab === 'income' ? 'دریافت‌نشده' : 'پرداخت‌نشده';

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th class="col-num"><span class="status-only">ردیف</span></th>
            <th class="col-day">روز</th>
            <th class="col-desc th-desc">شرح</th>
            <th class="col-amount">مبلغ</th>
            <th class="col-acc">حساب</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');
      (sec.rows || []).forEach((row, idx) => {
        tbody.appendChild(buildRowEl(sec.id, row, idx, paidLabel, unpaidLabel));
      });
      table.appendChild(tbody);

      const rowsScroll = document.createElement('div');
      rowsScroll.className = 'section-rows-scroll';
      rowsScroll.appendChild(table);
      body.appendChild(rowsScroll);

      function measureRowH() {
        const tr = tbody.querySelector('tr');
        const h = tr ? tr.getBoundingClientRect().height : 0;
        return h > 8 ? h : 44;
      }
      function setupLocalRowScroll() {
        const n = (sec.rows || []).length;
        const rh = measureRowH();
        document.documentElement.style.setProperty('--sec-row-h', rh + 'px');
        if (n <= 5) {
          rowsScroll.style.maxHeight = '';
          rowsScroll.style.overflowY = 'visible';
          rowsScroll.style.webkitMaskImage = 'none';
          rowsScroll.style.maskImage = 'none';
          return;
        }
        rowsScroll.style.maxHeight = (rh * 5.5) + 'px';
        rowsScroll.style.overflowY = 'auto';
        // بازگرداندن موقعیت اسکرول — بعد از layout تا نپرد بالا
        var saved = null;
        try {
          var _sk = String(tab || '') + '|' + String(title || '');
          if (window._detailRowScroll && typeof window._detailRowScroll[_sk] === 'number')
            saved = window._detailRowScroll[_sk];
        } catch (eSk) {}
        if (saved == null && typeof sec._rowScrollTop === 'number') saved = sec._rowScrollTop;
        try {
          if (saved == null && window._secRowScroll && sec && sec.id != null)
            saved = window._secRowScroll[sec.id];
        } catch (eS) {}
        if (typeof saved === 'number' && saved >= 0) {
          var apply = function() {
            try { if (rowsScroll && rowsScroll.isConnected) rowsScroll.scrollTop = saved; } catch (eA) {}
          };
          apply();
          requestAnimationFrame(function() {
            apply();
            requestAnimationFrame(function() { apply(); requestAnimationFrame(apply); });
          });
          setTimeout(apply, 30);
          setTimeout(apply, 80);
          setTimeout(apply, 160);
          setTimeout(apply, 280);
          setTimeout(apply, 450);
          setTimeout(apply, 700);
        }
      }
      function persistRowScroll() {
        var t = rowsScroll.scrollTop || 0;
        sec._rowScrollTop = t;
        try {
          window._secRowScroll = window._secRowScroll || {};
          if (sec && sec.id != null) window._secRowScroll[sec.id] = t;
          window._detailRowScroll = window._detailRowScroll || {};
          window._detailRowScroll[String(tab || '') + '|' + String(title || '')] = t;
        } catch (eP) {}
      }
      rowsScroll.addEventListener('scroll', () => {
        persistRowScroll();
        rowsScroll.classList.toggle('scrolled-down', rowsScroll.scrollTop > 2);
      }, { passive: true });

      // چرخ‌ماوس: فقط این باکس اسکرول شود، نه کل صفحه
      rowsScroll.addEventListener('wheel', (e) => {
        const n = (sec.rows || []).length;
        if (n <= 5) return;
        const el = rowsScroll;
        const maxTop = el.scrollHeight - el.clientHeight;
        if (maxTop <= 1) return;
        const atTop = el.scrollTop <= 0;
        const atBot = el.scrollTop >= maxTop - 1;
        // اگر هنوز داخل باکس جا هست، اسکرول صفحه را بگیر
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBot) || (!atTop && !atBot)) {
          e.stopPropagation();
          // اسکرول نرم دستی
          e.preventDefault();
          el.scrollTop = Math.max(0, Math.min(maxTop, el.scrollTop + e.deltaY));
          persistRowScroll();
          el.classList.toggle('scrolled-down', el.scrollTop > 2);
        }
      }, { passive: false });

      // لمس: از انتقال اسکرول به صفحه جلوگیری کن وقتی داخل لیست حرکت می‌کنیم
      let touchY = 0;
      rowsScroll.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) touchY = e.touches[0].clientY;
      }, { passive: true });
      rowsScroll.addEventListener('touchmove', (e) => {
        const n = (sec.rows || []).length;
        if (n <= 5 || !e.touches || !e.touches[0]) return;
        const el = rowsScroll;
        const maxTop = el.scrollHeight - el.clientHeight;
        if (maxTop <= 1) return;
        const y = e.touches[0].clientY;
        const dy = y - touchY;
        touchY = y;
        const atTop = el.scrollTop <= 0;
        const atBot = el.scrollTop >= maxTop - 1;
        if ((dy > 0 && !atTop) || (dy < 0 && !atBot) || (!atTop && !atBot)) {
          // اجازه اسکرول داخلی؛ از bubbling به body جلوگیری
          e.stopPropagation();
        }
      }, { passive: true });

      body._rowsScroll = rowsScroll;
      requestAnimationFrame(() => { try { setupLocalRowScroll(); } catch (e) {} });
      setTimeout(() => { try { setupLocalRowScroll(); } catch (e) {} }, 40);

      const addRowWrap = document.createElement('div');
      addRowWrap.className = 'add-row-wrap';
      /* دکمه + : TAP=شخصی | کشیدن افقی=پروژه */
      var fabWrap = document.createElement('div');
      fabWrap.className = 'row-add-fab-wrap';
      fabWrap.innerHTML =
        '<div class="row-add-track" aria-hidden="true"><span class="row-add-track-label">پروژه</span>' +
          window.rowAddArrowSvg() + '</div>' +
        '<button type="button" class="row-add-fab" aria-label="افزودن ردیف">' +
          '<svg viewBox="0 0 24 24"><path class="fab-plus" d="M12 5v14M5 12h14"/><path class="fab-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
        '</button>';
      bindVerticalProjectAdd(fabWrap, {
        threshold: 100,
        onTap: function() {
          try { addRow(sec.id, 1); } catch (eA) {}
        },
        onProject: function() {
          try {
            var fn = window.openProjectRowPicker || openProjectRowPicker;
            if (typeof fn === 'function') fn(sec.id);
            else showToast('انتخاب پروژه در دسترس نیست', 'warn');
          } catch (eP) {}
        }
      });
      /* ۱.۳.۷۱: افزودن ردیف فقط از «+» صفحهٔ اصلی */
      body.appendChild(addRowWrap);
      const hint = document.createElement('div');
      hint.className = 'tap-hint';
      hint.textContent = 'برای ویرایش فیلد پرشده دو بار روی آن بزنید';
      body.appendChild(hint);
      div.appendChild(body);
      return div;
    }

    function buildRowEl(secId, row, idx, paidLabel, unpaidLabel) {
      const tr = document.createElement('tr');
      if (!canEditRow(row) && (row.createdBy || '').trim()) tr.classList.add('row-readonly');

      const tdNum = document.createElement('td');
      tdNum.className = 'num col-num';
      const numWrap = document.createElement('div');
      numWrap.className = 'status-num';
      numWrap.textContent = toPersianDigits(idx + 1);
      tdNum.appendChild(numWrap);

      const tdDay = document.createElement('td');
      tdDay.className = 'col-day';
      const dayInp = document.createElement('input');
      dayInp.type = 'text';
      dayInp.className = 'cell day-input';
      dayInp.inputMode = 'numeric';
      dayInp.pattern = '[0-9]*';
      dayInp.maxLength = 2;
      dayInp.placeholder = '';
      dayInp.setAttribute('enterkeyhint', 'next');
      dayInp.value = row.day ? toPersianDigits(row.day) : '';
      /* ردیف «اختلاف موجودی» (تطبیق با پیامک): پس‌زمینهٔ زرد */
      if (row.reconGap) tr.classList.add('recon-gap');
      dayInp.oninput = () => {
        if (row.reconGap) row.reconGapDayEdited = true;
        if (!row.fromPlanId && !canEditRow(row)) return;
        if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) return;
        let v = toEnglishDigits(dayInp.value).replace(/[^0-9]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        let num = v ? parseInt(v, 10) : 0;
        const maxD = daysInMonth(currentYear, currentMonth);
        if (num > maxD) num = maxD;
        row.day = num ? String(num) : '';
        dayInp.value = row.day ? toPersianDigits(row.day) : '';
        if (!row.fromPlanId && (row.day || row.desc || row.amount)) stampRowOwner(row);
        scheduleSave();
      };
      dayInp.onblur = () => {
        scheduleSave();
        scheduleRowSort(secId, row, dayInp.closest('tr'));
      };
      dayInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          // برو به شرح
          const tr = dayInp.closest('tr');
          const next = tr && tr.querySelector('.desc-input');
          if (next && next.dataset.permaLocked === '1') {
            dayInp.blur();
          } else if (next) {
            next.classList.remove('is-empty', 'locked');
            next.classList.add('unlocked');
            if (next.tagName !== 'SELECT') next.readOnly = false;
            try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e2) {} }
          } else dayInp.blur();
        }
      };
      tdDay.appendChild(dayInp);
      const rowOwned = canEditRow(row);
      const OTHER_OWNER_MSG = OWNERSHIP_LOCK_MSG;
      const dayPermaLock = !rowOwned; /* ردیف اقساط قابل ویرایش؛ حذف جداگانه */
      setupLockable(dayInp, !!(row.day), dayPermaLock, OTHER_OWNER_MSG);

      const tdDesc = document.createElement('td');
      tdDesc.className = 'col-desc';
      const descInp = document.createElement('textarea');
      descInp.className = 'cell desc-input';
      descInp.rows = 1;
      descInp.value = row.desc || '';
      descInp.placeholder = '';
      descInp.setAttribute('enterkeyhint', 'next');
      descInp.title = row.desc || '';
      descInp.oninput = () => {
        if (!canEditRow(row)) return;
        row.desc = descInp.value;
        descInp.title = descInp.value;
        if (row.day || row.desc || row.amount) stampRowOwner(row);
        scheduleSave();
      };
      descInp.onblur = () => {
        scheduleRowSort(secId, row, descInp.closest('tr'));
      };
      descInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          const tr = descInp.closest('tr');
          const next = tr && tr.querySelector('.amount-input');
          if (next && next.dataset.permaLocked === '1') {
            descInp.blur();
          } else if (next) {
            next.classList.remove('is-empty', 'locked');
            next.classList.add('unlocked');
            if (next.tagName !== 'SELECT') next.readOnly = false;
            try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e2) {} }
          } else descInp.blur();
        }
      };
      tdDesc.appendChild(descInp);
      /* واریزی که به درآمد ثابت وصل شده (شرحش با نام آن فرق دارد): برچسب کوچک */
      try {
        if (row.fromRecurringId) {
          const _ri = (recurringIncomes || []).find(x => x && x.id === row.fromRecurringId);
          if (_ri && ((row.desc || '').trim() !== (_ri.name || '').trim())) {
            const tag = document.createElement('span');
            tag.className = 'rec-row-tag';
            tag.textContent = 'درآمد ثابت: ' + (_ri.name || '');
            tdDesc.style.position = 'relative';
            tdDesc.appendChild(tag);
          }
        }
        /* قسطی که پیش از شروع کار با نرم‌افزار پرداخت شده */
        if (isLockedPlanRow(row)) {
          tr.classList.add('plan-preapp', 'plan-locked');
          const tg = document.createElement('span');
          tg.className = 'rec-row-tag preapp-tag';
          tg.innerHTML = HK_LOCK_SVG + '<span>پرداخت قبلی</span>';
          tdDesc.style.position = 'relative';
          tdDesc.appendChild(tg);
        }
      } catch (eTag) {}
      /* ارتفاع ثابت — ردیف‌های آمده از قسط / غیرمالک قابل ویرایش نیستند */
      setupLockable(descInp, !!(row.desc && row.desc.trim()), !canEditRow(row), OTHER_OWNER_MSG);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'col-amount';
      const amtInp = document.createElement('input');
      amtInp.type = 'text';
      amtInp.className = 'cell amount-input';
      amtInp.inputMode = 'numeric';
      amtInp.pattern = '[0-9]*';
      amtInp.setAttribute('enterkeyhint', 'done');
      amtInp.value = row.amount ? formatNum(row.amount) : '';
      /* قسط قفل: مبلغ قسط فقط کم‌رنگ (مبلغ ردیف صفر است) */
      if (isLockedPlanRow(row)) { amtInp.value = row.planLockedAmt ? formatNum(row.planLockedAmt) : ''; amtInp.style.setProperty('color', 'var(--muted, #8e8e93)', 'important'); amtInp.style.setProperty('-webkit-text-fill-color', 'var(--muted, #8e8e93)', 'important'); }
      amtInp.placeholder = '';
      amtInp.oninput = () => {
        if (!canEditRow(row)) return;
        const cursorPos = amtInp.selectionStart || 0;
        const oldVal = amtInp.value;
        const digitsBefore = toEnglishDigits(oldVal.slice(0, cursorPos)).replace(/[^0-9]/g, '').length;
        const digitsOnly = toEnglishDigits(oldVal).replace(/[^0-9]/g, '');
        const n = digitsOnly ? parseInt(digitsOnly, 10) : 0;
        row.amount = n;
        if (row.day || row.desc || row.amount) stampRowOwner(row);
        if (!digitsOnly) amtInp.value = '';
        else {
          const formatted = formatNum(n);
          amtInp.value = formatted;
          let count = 0, newPos = formatted.length;
          for (let i = 0; i < formatted.length; i++) {
            if (/[0-9۰-۹]/.test(formatted[i])) {
              count++;
              if (count >= digitsBefore) { newPos = i + 1; break; }
            }
          }
          try { amtInp.setSelectionRange(newPos, newPos); } catch (e) {}
        }
        scheduleSummaryUpdate(); scheduleSave();
      };
      amtInp.onblur = () => {
        const n = parseAmount(amtInp.value);
        row.amount = n;
        amtInp.value = n ? formatNum(n) : '';
        scheduleSummaryUpdate();
        scheduleSave();
        scheduleRowSort(secId, row, amtInp.closest('tr'));
      };
      amtInp.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // برو به شرح اگر خالی است
          const tr = amtInp.closest('tr');
          const desc = tr && tr.querySelector('.desc-input');
          if (desc && desc.dataset.permaLocked === '1') {
            amtInp.blur();
          } else if (desc && !(row.desc && row.desc.trim())) {
            lockField(desc, false);
            desc.focus();
          } else {
            amtInp.blur();
          }
        }
      };
      tdAmt.appendChild(amtInp);
      setupLockable(amtInp, !!(row.amount), !canEditRow(row), OTHER_OWNER_MSG);

      const st0 = row.status || 'paid';
      function applyAmountStatusColor(v) {
        const paid = v === 'paid';
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const green = theme === 'light' ? '#17834a' : '#9ee858';
        const red = theme === 'light' ? '#dc2626' : '#bc2402';
        const c = paid ? green : red;
        amtInp.style.setProperty('color', c, 'important');
        amtInp.style.setProperty('-webkit-text-fill-color', c, 'important');
        amtInp.style.setProperty('caret-color', c, 'important');
        amtInp.style.setProperty('font-weight', '800', 'important');
        amtInp.classList.toggle('status-paid', paid);
        amtInp.classList.toggle('status-unpaid', !paid);
      }
      applyAmountStatusColor(st0);
      function applyStatusVisual(v) {
        row.status = v;
        applyAmountStatusColor(v);
      }
      /** اگر ردیف از قسط آمده و پرداخت شد → در اقساط هم پرداخت‌شده حساب شود */
      function syncPlanFromExpenseStatus(newStatus) {
        if (!row.fromPlanId) return;
        const plan = (plans || []).find(p => p.id === row.fromPlanId);
        if (!plan) return;
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        if (!count) return;
        let idx = parseInt(row.fromPlanIndex, 10);
        if (isNaN(idx) || idx < 0) idx = 0;
        let paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
        if (newStatus === 'paid') {
          const need = idx + 1;
          if (paid < need) {
            plan.paidCount = Math.min(count, need);
          }
          /* اگر ردیف معوق/حمل‌شده باشد، ماه سررسید را دست نزن */
          if (row.planCarried || (row.desc && String(row.desc).indexOf('معوق') >= 0)) {
            setPlanIndexPaidLate(plan, idx, true);
          } else {
            setPlanIndexPaidLate(plan, idx, false);
          }
          try {
            if (typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
            else syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
          } catch (eSync) {
            syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
          }
          updateInstallSummary();
          checkInstallReminders();
          if (currentTab === 'install') renderPlans();
          showToast('قسط در بخش اقساط هم "پرداخت شده" شد');
        } else if (newStatus === 'unpaid') {
          // برگشت به پرداخت‌نشده: اگر آخرین پرداخت‌شده همین قسط بود، یکی کم کن
          if (paid === idx + 1) {
            plan.paidCount = Math.max(0, paid - 1);
            try {
              if (typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
              else syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            } catch (eSync2) {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            }
            updateInstallSummary();
            checkInstallReminders();
            if (currentTab === 'install') renderPlans();
            showToast('قسط در بخش اقساط هم "پرداخت نشده" شد');
          }
        }
      }

    function snapshotRect(el) {
      try {
        if (!el || !el.getBoundingClientRect) return null;
        const r = el.getBoundingClientRect();
        if (!r || r.width < 2 || r.height < 2) return null;
        return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      } catch (err) { return null; }
    }
    function positionStatusMenu(menu, anchorEl, e, savedRect) {
      // اولویت: 1) element زنده متصل  2) snapshot لحظه کلیک  3) fallback
      let r = null;
      try {
        if (anchorEl && anchorEl.isConnected && anchorEl.getBoundingClientRect) {
          const live = anchorEl.getBoundingClientRect();
          if (live && live.width >= 2 && live.height >= 2) {
            r = { top: live.top, left: live.left, right: live.right, bottom: live.bottom, width: live.width, height: live.height };
          }
        }
      } catch (err) {}
      if (!r && savedRect && savedRect.width >= 2) r = savedRect;
      if (!r) {
        try {
          if (anchorEl && anchorEl.getBoundingClientRect) {
            const live2 = anchorEl.getBoundingClientRect();
            if (live2 && live2.width >= 2) r = live2;
          }
        } catch (err2) {}
      }
      // اندازه منو بعد از قرار گرفتن در DOM
      let menuW = 160, menuH = 100;
      try {
        const mw = menu.offsetWidth || menu.getBoundingClientRect().width;
        const mh = menu.offsetHeight || menu.getBoundingClientRect().height;
        if (mw > 10) menuW = mw;
        if (mh > 10) menuH = mh;
      } catch (err3) {}
      let top = 80, left = 16;
      if (r && r.width >= 2) {
        // پائین سمت راست همان سلول مبلغ
        top = r.bottom + 4;
        left = r.right - menuW;
        if (top + menuH > window.innerHeight - 8) {
          top = Math.max(8, r.top - menuH - 4);
        }
      }
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
      if (left < 8) left = 8;
      if (top < 8) top = 8;
      // همیشه fixed روی body — مختصات viewport
      if (menu.parentNode !== document.body) {
        try { document.body.appendChild(menu); } catch (err4) {}
      }
      menu.style.setProperty('position', 'fixed', 'important');
      menu.style.setProperty('top', Math.round(top) + 'px', 'important');
      menu.style.setProperty('left', Math.round(left) + 'px', 'important');
      menu.style.setProperty('right', 'auto', 'important');
      menu.style.setProperty('bottom', 'auto', 'important');
      menu.style.setProperty('z-index', '520', 'important');
      menu.style.setProperty('margin', '0', 'important');
      menu.style.setProperty('transform', 'none', 'important');
    }
      function openStatusMenu(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!canEditRow(row)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        document.querySelectorAll('.status-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'status-menu';
        menu.style.cssText = 'position:fixed;z-index:520;min-width:150px;box-sizing:border-box;margin:0;transform:none;';
        [
          { v: 'paid', label: paidLabel },
          { v: 'unpaid', label: unpaidLabel }
        ].forEach(opt => {
          const it = document.createElement('div');
          it.className = 'status-menu-item ' + opt.v;
          it.textContent = opt.label;
          it.onclick = (ev) => {
            ev.stopPropagation();
            if (!canEditRow(row)) { menu.remove(); showToast(OWNERSHIP_LOCK_MSG); return; }
            applyStatusVisual(opt.v);
            menu.remove();
            syncPlanFromExpenseStatus(opt.v);
            scheduleSummaryUpdate(); scheduleSave();
          };
          menu.appendChild(it);
        });
        document.body.appendChild(menu);
        const _sr = snapshotRect(tdAmt);
        positionStatusMenu(menu, tdAmt, null, _sr);
        requestAnimationFrame(() => { try { positionStatusMenu(menu, tdAmt, null, _sr); } catch (e3) {} });
        const closer = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== amtInp && ev.target !== tdAmt) {
            menu.remove();
            document.removeEventListener('click', closer);
            document.removeEventListener('touchstart', closer);
          }
        };
        setTimeout(() => {
          document.addEventListener('click', closer);
          document.addEventListener('touchstart', closer, { passive: true });
        }, 10);
      }
      // یک‌بار کلیک روی سلول مبلغ (وقتی قفل/پر است) → منوی وضعیت
      // دوبار کلیک → ویرایش مبلغ (setupLockable)
      // سلول خالی → تایپ عادی بدون منو
      tdAmt.style.cursor = 'pointer';
      tdAmt.title = 'برای تغییر وضعیت یک‌بار بزنید';
      const isAmtEditing = () => (
        document.activeElement === amtInp &&
        !amtInp.readOnly &&
        amtInp.classList.contains('unlocked')
      );
      const shouldOpenStatus = () => {
        if (isAmtEditing()) return false;
        // خالی: اجازه تایپ
        if (amtInp.classList.contains('is-empty') && !row.amount) return false;
        return true;
      };
      tdAmt.addEventListener('pointerup', (e) => {
        if (e.button != null && e.button !== 0) return;
        if (!shouldOpenStatus()) return;
        if (e.detail && e.detail >= 2) return;
        const token = {};
        tdAmt._statusToken = token;
        setTimeout(() => {
          if (tdAmt._statusToken !== token) return;
          if (!shouldOpenStatus()) return;
          openStatusMenu(e);
        }, 250);
      });
      tdAmt.addEventListener('dblclick', () => { tdAmt._statusToken = null; }, true);
      amtInp.addEventListener('dblclick', () => { tdAmt._statusToken = null; }, true);

      const tdAcc = document.createElement('td');
      tdAcc.className = 'col-acc';
      const accOptions = [{ value: '', label: '' }].concat(selectedAccountLabels().map(n => ({ value: n, label: n })));
      const accSel = createDarkSelect({
        options: accOptions,
        value: row.account || '',
        onChange: (v) => {
          if (!row.fromPlanId && !canEditRow(row)) return;
          if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) return;
          row.account = v;
          if (accSel._btn) {
            accSel._btn.title = v || 'انتخاب حساب';
            if (v) accSel._btn.classList.remove('is-empty-acc');
            else accSel._btn.classList.add('is-empty-acc');
          }
          syncAccMissing();
          if (!row.fromPlanId && (row.day || row.desc || row.amount || row.account)) stampRowOwner(row);
          scheduleSave();
        }
      });
      if (accSel._list) accSel._list.classList.add('bank-acc-list');
      /* حسابِ حذف‌شده: نامش روی همین ردیف دیده شود ولی در فهرست انتخاب نیست */
      try { if (accSel._btn && (row.account || '').trim() && selectedAccountLabels().indexOf(row.account.trim()) < 0) { accSel._btn.textContent = row.account; accSel._btn.classList.add('acc-dead'); } } catch (eDead) {}
      if (accSel._btn) {
        accSel._btn.title = row.account || 'انتخاب حساب';
        if (!(row.account || '').trim()) accSel._btn.classList.add('is-empty-acc');
        accSel._btn.addEventListener('click', function (e) {
          if (!row.fromPlanId && !canEditRow(row)) {
            e.preventDefault(); e.stopImmediatePropagation(); showToast(OTHER_OWNER_MSG); return;
          }
          if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) {
            e.preventDefault(); e.stopImmediatePropagation(); showToast(OTHER_OWNER_MSG); return;
          }
        }, true);
      }
      tdAcc.appendChild(accSel);
      /* مبلغ ثبت شده ولی حساب انتخاب نشده → قاب زرد دور منوی حساب */
      function syncAccMissing() {
        try { if (accSel._btn) accSel._btn.classList.toggle('acc-missing', (Number(row.amount) || 0) > 0 && !(row.account || '').trim()); } catch (eAm) {}
      }
      syncAccMissing();
      try { amtInp.addEventListener('blur', function () { setTimeout(syncAccMissing, 60); }); } catch (eAb) {}

      const tdAct = document.createElement('td');
      tdAct.className = 'actions-cell col-actions';
      if (canEditRow(row) && !row.fromPlanId) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-del-row';
        btn.textContent = '×';
        btn.onclick = () => {
          if (row.fromPlanId) { showToast('برای حذف این ردیف از بخش اقساط اقدام کنید'); return; }
          if (!canEditRow(row)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
          deleteRow(secId, idx);
        };
        tdAct.appendChild(btn);
      }

      tr.appendChild(tdNum);
      tr.appendChild(tdDay);
      tr.appendChild(tdDesc);
      tr.appendChild(tdAmt);
      tr.appendChild(tdAcc);
      tr.appendChild(tdAct);
      /* Highlight پروژه — فقط پس‌زمینه ماژیکی؛ رنگ مبلغ حفظ می‌شود */
      try {
        var fcRow = rowFinancialContext(row);
        if (fcRow && (fcRow.accountType === 'project' || fcRow.classification === 'third_party') &&
            fcRow.subjectId && fcRow.subjectId !== 'personal') {
          var subH = getSubjectById(fcRow.subjectId);
          var colorId = (subH && subH.highlightColor) || (row.financialContext && row.financialContext.highlightColor) || '';
          var metaH = getProjectHighlightMeta(colorId);
          if (typeof applyProjectRowMarker === 'function') applyProjectRowMarker(tr, metaH.accent || '#d000ff');
          else {
            tr.classList.add('project-row-hl');
            tr.style.setProperty('--proj-accent', metaH.accent || '#d000ff');
          }
          tr.dataset.projectId = fcRow.subjectId;
        }
      } catch (eHl) {}
      return tr;
    }

    function sectionElId(secId, tab) {
      const t = tab || currentTab;
      const prefix = (t === 'income' || t === 'expense') ? t : 'x';
      return 'sec-' + prefix + '-' + secId;
    }

    function focusNewRowDay(secId, countBack) {
      const sectionEl = document.getElementById(sectionElId(secId));
      if (!sectionEl) return false;
      sectionEl.classList.remove('collapsed');
      const rows = sectionEl.querySelectorAll('tbody tr');
      const idx = Math.max(0, rows.length - Math.max(1, countBack || 1));
      const target = rows[idx];
      if (!target) return false;
      const dayInp = target.querySelector('.day-input');
      if (!dayInp) return false;
      dayInp.classList.remove('is-empty', 'locked');
      dayInp.classList.add('unlocked');
      if (dayInp.tagName !== 'SELECT') dayInp.readOnly = false;
      dayInp.dataset.locked = '0';
      try { dayInp.focus({ preventScroll: true }); } catch (e) {
        try { dayInp.focus({ preventScroll: true }); } catch (e2) {}
      }
      // صفحه جابه‌جا نشود
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 100);
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 250);
      return true;
    }


    function closeProjectRowPicker() {
      var ov = document.getElementById('projectRowPickerOverlay');
      if (ov) ov.remove();
    }
    
    /** دکمه +: بیضی بنفش ثابت. TAP ساده روی + = ردیف عادی | اسلاید دایره تا انتهای بیضی = ردیف پروژه.
     * هر اسلایدی (حتی اگر برگردد) هرگز ردیف عادی نمی‌سازد. */
    function bindVerticalProjectAdd(wrap, opts) {
      opts = opts || {};
      if (!wrap || wrap._vpaBound) return;
      var fab = wrap.querySelector('.row-add-fab');
      if (!fab) return;
      wrap._vpaBound = true;
      var TAP_SLOP = 10;     /* بیشتر از این جابه‌جایی = دیگر «ضربه» نیست */
      var INSET = 2;         /* فاصلهٔ دایره از لبهٔ بیضی */
      var active = false, dragging = false, moved = false;
      var startX = 0, startY = 0, dx = 0, pid = null;

      function travel() {
        var w = wrap.clientWidth || 118;
        var fw = fab.offsetWidth || 38;
        return Math.max(30, w - INSET * 2 - fw);
      }
      function place(x, animate) {
        fab.style.transition = animate
          ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease, background 0.15s ease'
          : 'none';
        fab.style.transform = 'translateX(' + x + 'px)';
      }
      function resetVisual(animate) {
        try {
          place(0, !!animate);
          wrap.classList.remove('is-dragging', 'is-armed');
        } catch (eR) {}
      }

      function onDown(e) {
        if (e.button != null && e.button !== 0) return;
        active = true;
        dragging = false;
        moved = false;
        dx = 0;
        startX = e.clientX;
        startY = e.clientY;
        pid = (e.pointerId != null) ? e.pointerId : null;
        try { fab.style.transition = 'none'; } catch (eT) {}
        try {
          if (fab.setPointerCapture && pid != null) fab.setPointerCapture(pid);
        } catch (eC) {}
        try { e.preventDefault(); e.stopPropagation(); } catch (eP) {}
      }

      function onMove(e) {
        if (!active) return;
        if (pid != null && e.pointerId != null && e.pointerId !== pid) return;
        var ddx = e.clientX - startX;   /* راست مثبت */
        var ddy = e.clientY - startY;
        if (!moved && Math.sqrt(ddx * ddx + ddy * ddy) > TAP_SLOP) moved = true;
        if (!dragging && ddx > 5 && ddx >= Math.abs(ddy) * 0.85) {
          dragging = true;
          moved = true;
          wrap.classList.add('is-dragging');
        }
        if (dragging) {
          try { e.preventDefault(); e.stopPropagation(); } catch (eP) {}
          var T = travel();
          dx = Math.max(0, Math.min(ddx, T));
          place(dx, false);
          if (dx >= T - 4) {
            if (!wrap.classList.contains('is-armed')) {
              wrap.classList.add('is-armed');
              try { window.appHaptic(12); } catch (eV) {}
            }
          } else {
            wrap.classList.remove('is-armed');
          }
        }
      }

      function finish(e) {
        if (!active) return;
        if (pid != null && e && e.pointerId != null && e.pointerId !== pid) return;
        active = false;
        try {
          if (fab.releasePointerCapture && pid != null) fab.releasePointerCapture(pid);
        } catch (eR) {}
        pid = null;
        var wasDrag = dragging;
        var wasMoved = moved;
        var armed = wrap.classList.contains('is-armed');
        dragging = false;
        moved = false;

        if (wasDrag) {
          resetVisual(true);
          /* فقط اگر تا انتها رسیده و همان‌جا رها شده → ردیف پروژه. برگشتن = هیچ ردیفی */
          if (armed && typeof opts.onProject === 'function') {
            try { opts.onProject(); } catch (eP) {}
          }
          return;
        }
        resetVisual(false);
        if (wasMoved) return;   /* حرکت غیرافقی/بیش از حد → نه ضربه است نه اسلاید */
        if (typeof opts.onTap === 'function') {
          try { opts.onTap(); } catch (eT) {}
        }
      }

      fab.addEventListener('pointerdown', onDown);
      fab.addEventListener('pointermove', onMove);
      fab.addEventListener('pointerup', finish);
      fab.addEventListener('pointercancel', function() {
        active = false;
        pid = null;
        dragging = false;
        moved = false;
        dx = 0;
        resetVisual(true);
      });
      fab.addEventListener('click', function(e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (eC) {}
      }, true);
    }
    try { window.bindVerticalProjectAdd = bindVerticalProjectAdd; } catch (eW) {}

function openProjectRowPicker(secId) {
      closeProjectRowPicker();
      var projects = [];
      try {
        projects = (typeof loadFinancialSubjects === 'function' ? loadFinancialSubjects() : []).filter(function(s) {
          return s && s.id && s.id !== 'personal';
        });
      } catch (e) { projects = []; }
      if (!projects.length) {
        try { showToast('ابتدا از منوی پروژه‌ها یک پروژه بسازید', 'warn'); } catch (eT) {}
        return;
      }
      var ov = document.createElement('div');
      ov.id = 'projectRowPickerOverlay';
      ov.className = 'proj-row-picker-overlay';
      ov.innerHTML = '<div class="proj-row-picker-panel" role="dialog" aria-label="انتخاب پروژه">' +
        '<div class="proj-row-picker-title">انتخاب پروژه</div>' +
        '<div class="proj-row-picker-list" id="projRowPickerList"></div>' +
        '<button type="button" class="proj-row-picker-cancel" id="projRowPickerCancel">انصراف</button>' +
        '</div>';
      document.body.appendChild(ov);
      var list = ov.querySelector('#projRowPickerList');
      projects.forEach(function(s) {
        var meta = (typeof getProjectHighlightMeta === 'function')
          ? getProjectHighlightMeta(s.highlightColor) : null;
        var accent = (meta && meta.accent) || '#d000ff';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'proj-row-picker-item';
        btn.style.setProperty('--proj-accent', accent);
        btn.innerHTML = '<span>' + escapeHtml(s.name || 'پروژه') + '</span>';
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var fc = defaultFinancialContext();
          fc.classification = 'third_party';
          fc.accountType = 'project';
          fc.subjectId = s.id;
          fc.subjectName = s.name || '';
          fc.ownerName = fc.subjectName;
          var tab = (typeof currentTab !== 'undefined') ? currentTab : 'expense';
          if (tab === 'income') {
            fc.fundingSource = 'subject';
            fc.projectAmount = 0;
            fc.personalAdvanceAmount = 0;
          } else {
            fc.fundingSource = 'subject';
            fc.projectAmount = 0;
            fc.personalAdvanceAmount = 0;
          }
          closeProjectRowPicker();
          addRow(secId, 1, { financialContext: fc });
          /* بعد از ثبت ردیف پروژه، سوئیچ روی پروژه می‌ماند تا کاربر برگرداند */
        });
        list.appendChild(btn);
      });
      ov.querySelector('#projRowPickerCancel').onclick = function(e) {
        e.preventDefault();
        closeProjectRowPicker();
      };
      ov.addEventListener('click', function(e) {
        if (e.target === ov) closeProjectRowPicker();
      });
      requestAnimationFrame(function() { ov.classList.add('open'); });
    }
    try { window.openProjectRowPicker = openProjectRowPicker; window.closeProjectRowPicker = closeProjectRowPicker; } catch (eEx) {}

    function bindLongPress(el, onLong, onShort, ms) {
      if (!el) return;
      ms = (typeof ms === 'number' && ms > 0) ? ms : 1000;
      var timer = null;
      var longFired = false;
      var tracking = false;
      var startX = 0, startY = 0;
      var ptrId = null;
      function clearTimer() {
        if (timer) { clearTimeout(timer); timer = null; }
      }
      function fireLong(e) {
        if (longFired) return;
        longFired = true;
        tracking = false;
        clearTimer();
        try { window.appHaptic(20); } catch (eV) {}
        try { if (typeof onLong === 'function') onLong(e); } catch (eL) {
          try { console.warn('longpress', eL); } catch (e2) {}
          try { showToast('خطا در باز کردن پروژه‌ها', 'warn'); } catch (e3) {}
        }
      }
      function arm(e, x, y, id) {
        longFired = false;
        tracking = true;
        startX = x || 0;
        startY = y || 0;
        ptrId = (id != null) ? id : null;
        clearTimer();
        timer = setTimeout(function() {
          if (!tracking) return;
          fireLong(e);
        }, ms);
      }
      function onMove(x, y) {
        if (!tracking || longFired) return;
        var dx = (x || 0) - startX;
        var dy = (y || 0) - startY;
        /* آستانه بالاتر تا لرزش انگشت قطع نکند (~36px) */
        if (dx * dx + dy * dy > 1300) {
          tracking = false;
          clearTimer();
        }
      }
      function release(e) {
        var wasLong = longFired;
        var wasTracking = tracking;
        tracking = false;
        clearTimer();
        ptrId = null;
        if (!wasLong && wasTracking && typeof onShort === 'function') {
          try { onShort(e); } catch (eS) {}
        }
        longFired = false;
      }
      try {
        el.style.touchAction = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';
        el.style.webkitTouchCallout = 'none';
      } catch (eSt) {}
      el.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); });

      /* Pointer Events — مسیر اصلی */
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', function(e) {
          if (e.button != null && e.button !== 0) return;
          e.stopPropagation();
          try { e.preventDefault(); } catch (ePd) {}
          try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (eC) {}
          arm(e, e.clientX, e.clientY, e.pointerId);
        });
        el.addEventListener('pointermove', function(e) {
          if (ptrId != null && e.pointerId !== ptrId) return;
          onMove(e.clientX, e.clientY);
        });
        el.addEventListener('pointerup', function(e) {
          if (ptrId != null && e.pointerId !== ptrId) return;
          e.stopPropagation();
          release(e);
        });
        el.addEventListener('pointercancel', function(e) {
          /* نزدیک به آستانه بود → باز هم long در نظر نگیر؛ فقط رها کن بدون short اگر زمان کم بوده */
          tracking = false;
          clearTimer();
          longFired = false;
          ptrId = null;
        });
      } else {
        el.addEventListener('touchstart', function(e) {
          e.stopPropagation();
          var t = e.touches && e.touches[0];
          if (!t) return;
          arm(e, t.clientX, t.clientY, null);
        }, { passive: true });
        el.addEventListener('touchmove', function(e) {
          var t = e.touches && e.touches[0];
          if (!t) return;
          onMove(t.clientX, t.clientY);
        }, { passive: true });
        el.addEventListener('touchend', function(e) {
          e.stopPropagation();
          release(e);
        }, { passive: true });
        el.addEventListener('touchcancel', function() {
          tracking = false;
          clearTimer();
          longFired = false;
        }, { passive: true });
        el.addEventListener('mousedown', function(e) {
          if (e.button !== 0) return;
          e.stopPropagation();
          arm(e, e.clientX, e.clientY, null);
        });
        el.addEventListener('mousemove', function(e) { onMove(e.clientX, e.clientY); });
        el.addEventListener('mouseup', function(e) {
          e.stopPropagation();
          release(e);
        });
        el.addEventListener('mouseleave', function() {
          tracking = false;
          clearTimer();
        });
      }
    }


    function addRow(secId, count, opts) {
      closeRemindBarIfOpen();
      const sec = findSection(secId);
      if (!sec) return;
      opts = opts || {};
      const n = Math.max(1, Math.min(5, parseInt(count, 10) || 1));
      for (let i = 0; i < n; i++) {
        var row = emptyRow();
        if (opts.financialContext && typeof opts.financialContext === 'object') {
          try {
            row.financialContext = JSON.parse(JSON.stringify(opts.financialContext));
          } catch (eFc) {
            row.financialContext = opts.financialContext;
          }
        }
        sec.rows.push(row);
      }
      sec.collapsed = false;
      // موقعیت اسکرول فعلی را از DOM بخوان
      try {
        var liveScroll = document.querySelector('.section-rows-scroll');
        if (liveScroll && typeof liveScroll.scrollTop === 'number') {
          var st = liveScroll.scrollTop;
          sec._rowScrollTop = st;
          window._secRowScroll = window._secRowScroll || {};
          if (sec.id != null) window._secRowScroll[sec.id] = st;
          try {
            window._detailRowScroll = window._detailRowScroll || {};
            var _dt = (typeof _detailContext !== 'undefined' && _detailContext) ? _detailContext : null;
            if (_dt && _dt.title) {
              var _tb = (currentTab === 'income' || currentTab === 'expense') ? currentTab : (_dt.kind || 'income');
              window._detailRowScroll[String(_tb) + '|' + String(_dt.title)] = st;
            }
          } catch (eK) {}
        } else if (typeof sec._rowScrollTop !== 'number') {
          sec._rowScrollTop = (window._secRowScroll && sec.id != null) ? (window._secRowScroll[sec.id] || 0) : 0;
        }
      } catch (e) {}
      // مثل قبل: رندر کامل تا ردیف حتماً دیده شود (هر دو تب)
      window._pdNewRowAt = Date.now();
      renderAll();
      scheduleSave();
      setTimeout(() => focusNewRowDay(secId, n), 60);
      setTimeout(() => focusNewRowDay(secId, n), 180);
      setTimeout(() => focusNewRowDay(secId, n), 350);
    }
    function deleteRow(secId, idx) {
      const sec0 = findSection(secId);
      const row0 = sec0 && sec0.rows && sec0.rows[idx];
      if (row0 && !canEditRow(row0)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
      askConfirm('این ردیف به سطل زباله منتقل شود؟', () => {
        const sec = findSection(secId);
        if (!sec) return;
        const row = sec.rows[idx];
        if (row) {
          try {
            pushToTrash('row', (row.desc || sec.title || 'ردیف') + (row.amount ? ' · ' + formatNum(row.amount) : ''), {
              tab: currentTab,
              periodKey: periodKey(currentYear, currentMonth),
              sectionId: sec.id || secId,
              sectionTitle: sec.title || '',
              sourceLabel: (currentTab === 'income' ? 'بخش درآمد' : 'بخش مخارج') + (sec.title ? (' / ' + sec.title) : ''),
              row: JSON.parse(JSON.stringify(row))
            });
          } catch (e) {}
        }
        if (row && row.id && sharedAccountId) {
          row.deletedAt = Date.now();
          row.updatedAt = Date.now();
          try {
            enqueueSync('delete_record', {
              id: row.id,
              kind: (currentTab === 'income' ? 'income_row' : 'expense_row'),
              period_key: periodKey(currentYear, currentMonth),
              section_id: sec.id || secId,
              section_title: sec.title || '',
              created_by: row.createdBy || currentUserId(),
              deleted_at: new Date(row.deletedAt).toISOString(),
              payload: row
            });
          } catch (e) {}
          sec.rows.splice(idx, 1);
          if (!sec.rows.length) sec.rows.push(emptyRow());
        } else if (sec.rows.length <= 1) {
          sec.rows[0] = emptyRow();
        } else {
          sec.rows.splice(idx, 1);
        }
        // پنجره ردیف را حفظ کن تا صفحه نپرد
        const sy = window.scrollY || window.pageYOffset || 0;
        // موقعیت اسکرول داخل بخش حفظ می‌شود (sec._rowScrollTop)
        renderAll();
        try { window.scrollTo(0, sy); } catch (e) {}
        scheduleSave();
        showToast('به سطل زباله منتقل شد');
      });
    }
    function nextNewSectionTitle() {
      const sections = periodData[currentTab].sections || [];
      const existing = new Set(sections.map(s => (s.title || '').trim()));
      let n = 1;
      while (true) {
        const fa = 'بخش جدید ' + toPersianDigits(n);
        const en = 'بخش جدید ' + n;
        if (!existing.has(fa) && !existing.has(en) && !existing.has('بخش جدید')) {
          return fa;
        }
        n++;
        if (n > 200) return 'بخش جدید ' + toPersianDigits(Date.now() % 10000);
      }
    }
    function ensureYearMonthsInArchive(year) {
      const y = year || currentYear;
      if (!archive || typeof archive !== 'object') archive = {};
      for (let m = 1; m <= 12; m++) {
        const k = periodKey(y, m);
        if (!archive[k]) {
          archive[k] = emptyPeriodData();
        }
      }
    }
    function propagateSectionToAllMonths(tab, title) {
      const t = (title || '').trim();
      if (!t) return;
      if (tab !== 'income' && tab !== 'expense') return;
      persistCurrent();
      // برای هر ۱۲ ماه سال جاری (و ماه‌های موجود در آرشیو)
      ensureYearMonthsInArchive(currentYear);
      const keys = new Set(Object.keys(archive || {}));
      for (let m = 1; m <= 12; m++) keys.add(periodKey(currentYear, m));
      keys.forEach(k => {
        if (k === periodKey(currentYear, currentMonth)) {
          // ماه جاری از periodData است؛ فقط مطمئن شو عنوان هست
          return;
        }
        let pd = archive[k];
        if (!pd) {
          pd = emptyPeriodData();
          archive[k] = pd;
        }
        if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
        if (!pd[tab].sections) pd[tab].sections = [];
        const exists = pd[tab].sections.some(s => (s.title || '').trim() === t);
        if (exists) return;
        const nid = pd[tab].nextId || (pd[tab].sections.length + 1);
        pd[tab].sections.push({
          id: 's' + nid + '_' + Date.now().toString(36),
          title: t,
          color: tabAccentColor(tab),
          collapsed: true,
          rows: [emptyRow()]
        });
        pd[tab].nextId = nid + 1;
      });
      saveArchive();
    }
    function showNameSheetBackdrop() {
      lockBodyScroll();
      let bd = document.getElementById('nameSheetBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'nameSheetBackdrop';
        bd.className = 'menu-backdrop open';
        bd.style.background = 'rgba(0,0,0,0.72)';
        document.body.appendChild(bd);
      } else {
        bd.classList.add('open');
        bd.style.background = 'rgba(0,0,0,0.72)';
      }
      return bd;
    }
    function hideNameSheetBackdrop() {
      const bd = document.getElementById('nameSheetBackdrop');
      if (bd) bd.remove();
      unlockBodyScroll();
    }
    let pendingRenameSecId = null;
    function openSectionNameSheet(sec, onDone) {
      closeRemindBarIfOpen();
      let sheet = document.getElementById('sectionNameSheet');
      if (sheet) sheet.remove();
      sheet = document.createElement('div');
      sheet.id = 'sectionNameSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;box-shadow:0 12px 32px var(--shadow);';
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + Math.max(80, Math.floor((vv ? vv.height : window.innerHeight) * 0.22));
      sheet.style.top = top + 'px';

      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;text-align:center;';
      lab.textContent = 'نام کاربر';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = (sec.title || '').trim();
      inp.placeholder = 'نام کاربر را وارد کنید';
      inp.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:1rem;margin-bottom:10px;text-align:center;box-sizing:border-box;';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.textContent = 'تأیید';
      ok.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:bold;cursor:pointer;';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'انصراف';
      cancel.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;cursor:pointer;';

      const clearEditIcons = () => {
        try {
          document.querySelectorAll('.btn-edit-title.is-editing').forEach(b => {
            b.classList.remove('is-editing');
          });
        } catch (e) {}
      };
      const wasNew = !((sec.title || '').trim());
      const originalTitle = (sec.title || '').trim();
      const discardNew = () => {
        if (!wasNew) return;
        const tab = currentTab;
        if (tab !== 'income' && tab !== 'expense') return;
        const list = periodData[tab].sections || [];
        const i = list.findIndex(s => s.id === sec.id);
        if (i < 0) return;
        // فقط اگر هنوز اسم واقعی نگرفته
        if ((list[i].title || '').trim() && (list[i].title || '').trim() === originalTitle && originalTitle) return;
        if ((list[i].title || '').trim() && !wasNew) return;
        list.splice(i, 1);
        persistCurrent();
        scheduleSave();
        renderAll();
      };
      const close = (fromCancel) => {
        try { sheet.remove(); } catch (e) {}
        hideNameSheetBackdrop();
        document.removeEventListener('mousedown', outside, true);
        clearEditIcons();
        if (fromCancel) discardNew();
      };
      const save = () => {
        const v = (inp.value || '').trim();
        if (!v) { showToast('نام کاربر را وارد کنید'); return; }
        const tab = currentTab;
        if (tab === 'income' || tab === 'expense') {
          const dup = (periodData[tab].sections || []).some(
            s => s.id !== sec.id && (s.title || '').trim() === v
          );
          if (dup) { showToast('اسم تکراری است'); return; }
        }
        sec.title = v;
        if (typeof onDone === 'function') onDone(v);
        persistCurrent();
        scheduleSave();
        close(false);
        renderAll();
      };
      ok.onclick = save;
      cancel.onclick = () => close(true);
      const outside = (e) => {
        if (!sheet.contains(e.target)) close(true);
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); close(true); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(lab);
      sheet.appendChild(inp);
      sheet.appendChild(actions);
      showNameSheetBackdrop();
      document.body.appendChild(sheet);
      setTimeout(() => {
        try {
          inp.focus({ preventScroll: true });
          if (inp.value) caretToEnd(inp);
        } catch (e) {
          try { inp.focus(); if (inp.value) caretToEnd(inp); } catch (e2) {}
        }
      }, 50);
    }

    function addSection() {
      closeRemindBarIfOpen();
      const sections = periodData[currentTab].sections;
      const color = tabAccentColor(currentTab);
      const nid = periodData[currentTab].nextId;
      const newId = 's' + nid;
      const sec = { id: newId, title: '', color, collapsed: true, rows: [emptyRow()] };
      stampRowOwner(sec);
      sections.push(sec);
      periodData[currentTab].nextId = nid + 1;
      pendingRenameSecId = null;
      persistCurrent();
      renderAll();
      scheduleSave();
      setTimeout(() => {
        openSectionNameSheet(sec, (v) => {
          propagateSectionToAllMonths(currentTab, v);
        });
      }, 60);
    }
    function askDeleteSection(secId) {
      askConfirm('این بخش به سطل زباله منتقل شود؟', () => {
        const sec = (periodData[currentTab].sections || []).find(s => s.id === secId);
        if (sec) {
          try {
            pushToTrash('section', sec.title || 'بخش', {
              tab: currentTab,
              periodKey: periodKey(currentYear, currentMonth),
              sourceLabel: (currentTab === 'income' ? 'بخش درآمد' : 'بخش مخارج') + (sec.title ? (' / ' + sec.title) : ''),
              section: JSON.parse(JSON.stringify(sec))
            });
          } catch (e) {}
        }
        periodData[currentTab].sections = periodData[currentTab].sections.filter(s => s.id !== secId);
        renderAll();
        scheduleSave();
        showToast('به سطل زباله منتقل شد');
      });
    }
    function cycleColor(secId) {
      const sec = findSection(secId);
      const idx = COLORS.indexOf(sec.color);
      sec.color = COLORS[(idx + 1) % COLORS.length];
      renderAll();
      scheduleSave();
    }

    function updateSummary() {
      if (currentTab === 'income' || currentTab === 'expense') updateSummaryForTab(currentTab);
    }
    function updateSummaryForTab(tab) {
      if (tab !== 'income' && tab !== 'expense') return;
      const tbody = document.getElementById('summary-body-' + tab);
      if (!tbody) return;
      tbody.innerHTML = '';
      let gPaid = 0, gUnpaid = 0;
      (periodData[tab].sections || []).forEach(sec => {
        let paid = 0, unpaid = 0;
        (sec.rows || []).forEach(r => {
          if (r && r.p2p) return;
          const a = Number(r.amount) || 0;
          if (r.status === 'paid') paid += a; else unpaid += a;
        });
        gPaid += paid; gUnpaid += unpaid;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="sec-name">${escapeHtml(sec.title) || '—'}</td>
          <td class="val paid-cell">${formatNum(paid)}</td>
          <td class="val unpaid-cell">${formatNum(unpaid)}</td>
          <td class="val total-cell">${formatNum(paid + unpaid)}</td>`;
        tbody.appendChild(tr);
      });
      const gp = document.getElementById('grand-paid-' + tab);
      const gu = document.getElementById('grand-unpaid-' + tab);
      const gt = document.getElementById('grand-total-' + tab);
      if (gp) gp.textContent = formatNum(gPaid);
      if (gu) gu.textContent = formatNum(gUnpaid);
      if (gt) gt.textContent = formatNum(gPaid + gUnpaid);
    }

    function updateBalance() {
      if (currentTab !== 'income') return;
      const expMap = {}, incMap = {}, expOrder = [], incOrder = [];
      (periodData.expense.sections || []).forEach(sec => {
        const title = (sec.title || '').trim() || '—';
        expMap[title] = (expMap[title] || 0) + sectionTotal(sec);
        if (!expOrder.includes(title)) expOrder.push(title);
      });
      (periodData.income.sections || []).forEach(sec => {
        const title = (sec.title || '').trim() || '—';
        incMap[title] = (incMap[title] || 0) + sectionTotal(sec);
        if (!incOrder.includes(title)) incOrder.push(title);
      });
      const titles = [];
      expOrder.forEach(t => { if (!titles.includes(t)) titles.push(t); });
      incOrder.forEach(t => { if (!titles.includes(t)) titles.push(t); });
      const tbody = document.getElementById('balance-body');
      tbody.innerHTML = '';
      let gExp = 0;
      let gIncOnly = 0;
      const accFBal = (typeof balanceSelectedAccount !== 'undefined' ? (balanceSelectedAccount || '') : '').trim();
      const openingBal = (typeof sumFilteredOpeningBalance === 'function')
        ? sumFilteredOpeningBalance(accFBal)
        : 0;
      titles.forEach(title => {
        const bal = (typeof incMap !== 'undefined' && incMap[title] != null) ? (incMap[title] || 0) : 0;
        gIncOnly += bal;
        const exp = expMap[title] || 0;
        const remain = bal - exp;
        gExp += exp;
        const color = remain > 0 ? '#16a34a' : (remain < 0 ? '#dc2626' : '#1a1a1a');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="sec-name">${escapeHtml(title)}</td>
          <td class="val inc-cell" style="color:var(--text);">${formatNum(bal)}</td>
          <td class="val exp-cell" style="color:var(--text);">${formatNum(exp)}</td>
          <td class="val" style="color:${color};">${formatNum(remain)}</td>`;
        tbody.appendChild(tr);
      });
      /* جمع کل موجودی = جمع درآمدها + موجودی ماه قبل */
      const gBal = gIncOnly + openingBal;
      const gRemain = gBal - gExp;
      document.getElementById('balIncome').textContent = formatNum(gBal);
      document.getElementById('balExpense').textContent = formatNum(gExp);
      document.getElementById('balIncome').style.color = '#1a1a1a';
      document.getElementById('balExpense').style.color = '#1a1a1a';
      const balEl = document.getElementById('balRemain');
      balEl.textContent = formatNum(gRemain);
      balEl.style.color = gRemain > 0 ? '#16a34a' : (gRemain < 0 ? '#dc2626' : '#1a1a1a');
    }

    /* متن پیام‌ها: «اپ» → «نرم‌افزار»؛ شمارهٔ تلفن (+98…) همیشه چپ‌به‌راست تا «+» اول شماره بماند */
    function hkMsgFix(msg) {
      var m = String(msg == null ? '' : msg);
      try {
        m = m.replace(/(^|[^\u0600-\u06FF])اپ(?![\u0621-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC])/g, '$1نرم‌افزار');
        m = m.replace(/\+[0-9۰-۹][0-9۰-۹\s\-]{5,}[0-9۰-۹]/g, function (x) { return '\u2066' + x + '\u2069'; });
      } catch (e) {}
      return m;
    }
    function showToast(msg, opt) {
      const t = document.getElementById('toast');
      if (!t) return;
      try {
        var _m = String(msg || '');
        if (/supabase|firebase|همگام|ابر|sync|offline|آنلاین|آفلاین —|در صف همگام/i.test(_m)) return;
      } catch (eFilt) {}
      t.textContent = hkMsgFix(msg);
      t.classList.remove('toast-long');
      /* ۱.۳.۶۴: پیام ثبت واریز/برداشت به رنگ همان عملیات */
      try { var _tm = String(msg || ''); t.classList.toggle('toast-inc', /^واریز ثبت شد/.test(_tm)); t.classList.toggle('toast-exp', /^برداشت ثبت شد/.test(_tm)); } catch (eTc) {}
      t.style.fontSize = '';
      // همیشه بالاتر از مودال‌های مات
      try {
        t.style.zIndex = '2147483000';  /* همیشه روی همان صفحه‌ای که باز است، نه پشت منوها */
        if (t.parentNode !== document.body) document.body.appendChild(t);
        else document.body.appendChild(t); // به انتهای DOM ببر
      } catch (e) {}
      t.classList.add('show');
      /* یک‌خطی و کامل: اگر جا نشد، فونت کم‌کم کوچک شود (بدون «…») */
      try {
        var fs = parseFloat(getComputedStyle(t).fontSize) || 14, guard = 0;
        while (t.scrollWidth > t.clientWidth + 1 && fs > 9 && guard++ < 14) { fs -= 0.5; t.style.fontSize = fs + 'px'; }
      } catch (eFit) {}
      clearTimeout(window._toastTimer);
      /* opt عددی = مدت نمایش (میلی‌ثانیه) */
      window._toastTimer = setTimeout(() => t.classList.remove('show'), (typeof opt === 'number' && opt > 0) ? opt : 2500);
    }

    /* پیام چندخطی (کامل و بدون «…») برای گزارش‌های بلندتر مثل نتیجهٔ بازیابی */
    function showToastLong(msg) {
      showToast(msg);
      const t = document.getElementById('toast');
      if (!t) return;
      t.style.fontSize = '';
      t.classList.add('toast-long');
      clearTimeout(window._toastTimer);
      const ms = Math.min(9000, 2500 + String(msg || '').length * 45);
      window._toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.remove('toast-long'), 350); }, ms);
    }
    window.addEventListener('resize', () => {
      moveTabIndicator();
      syncChromeHeight();
    });
    window.addEventListener('beforeunload', () => {
      clearTimeout(saveTimer);
      persistCurrent();
      saveArchive();
      // بدون هشدار ترک صفحه
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(saveTimer);
        persistCurrent();
        saveArchive();
      }
    });


    // کیبورد: برای فیلدهای داخل جدول، scrollIntoView نکن (Next نباید جدول را بپراند)
    function scrollFieldAboveKeyboard(el) {
      if (!el) return;
      // ناوبری داخل جدول درآمد/مخارج/بده‌بستان — بدون اسکرول خودکار
      if (el.closest && el.closest('.person-detail-scroll, .person-detail-table, #sections-ledger, .ledger-rows, .section-rows-scroll')) {
        return;
      }
      setTimeout(() => {
        try {
          const r = el.getBoundingClientRect();
          const vv = window.visualViewport;
          const vh = (vv && vv.height) ? vv.height : (window.innerHeight || 600);
          if (r.top < 80 || r.bottom > vh - 120) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } catch (e) {}
      }, 280);
    }
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!t || !t.tagName) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
          (t.isContentEditable) ||
          (t.closest && (t.closest('#textInputModal') || t.closest('.title-menu')))) {
        closeRemindBarIfOpen();
      }
      if (t.closest && (t.closest('.title-menu') || t.closest('#textInputModal'))) return;
      // حفظ scrollTop ظرف جدول هنگام focus (ضد اسکرول مرورگر/اندروید)
      if (t.closest && t.closest('.person-detail-scroll, #sections-ledger')) {
        const sc = t.closest('.person-detail-scroll') || t.closest('#sections-ledger');
        const y = sc ? sc.scrollTop : 0;
        requestAnimationFrame(() => {
          try { if (sc && Math.abs((sc.scrollTop || 0) - y) > 2) sc.scrollTop = y; } catch (e) {}
        });
        setTimeout(() => {
          try { if (sc && Math.abs((sc.scrollTop || 0) - y) > 2) sc.scrollTop = y; } catch (e) {}
        }, 50);
        return; // بدون scrollIntoView
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        scrollFieldAboveKeyboard(t);
      }
    });
    // تایپ واقعی روی فیلدها هم یادآور را می‌بندد (حتی اگر فوکوس از قبل بوده)
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t || !t.tagName) return;
      if (['INPUT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable) {
        closeRemindBarIfOpen();
      }
    }, true);


