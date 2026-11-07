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

