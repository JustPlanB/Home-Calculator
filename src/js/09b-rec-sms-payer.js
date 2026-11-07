    /* —— تطبیق پیامک واریز با ردیف «دریافت نشده» درآمد ثابت ——
       همان حساب، مبلغ برابر یا نزدیک (±۵٪)، روز در فاصلهٔ ۷ روز از روز واریز (پیش‌واریز آخر ماه قبل هم)،
       و نام واریزکننده اگر بانک بفرستد (به‌مرور یاد گرفته می‌شود). هر ردیف فقط با یک پیامک پر می‌شود. */
    function recSmsPayer(raw) {
      try {
        var t = normalizeSmsText(String(raw || ''));
        var m = t.match(/(?:واریز\s*کننده|نام\s*واریز\s*کننده|از\s*طرف|فرستنده|انتقال\s*از)\s*[:：]?\s*([؀-ۿ ]{3,40})/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : '';
      } catch (e) { return ''; }
    }
    function recHabitOffset(item) {
      try {
        var due = recDueDay(item), offs = [];
        recArchiveRows(item).forEach(function (x) {
          if (!recIsPaid(x.row)) return;
          var k = parseInt(x.row.recForKey, 10) || x.key, p = recPayDateOf(x);
          offs.push(recDayIndex(p.y, p.m, p.d) - recDayIndex(Math.floor(k / 100), k % 100, Math.min(due, recMonthLen(k % 100))));
        });
        if (!offs.length) return 0;
        offs.sort(function (a, b) { return a - b; });
        return Math.max(-10, Math.min(10, offs[Math.floor(offs.length / 2)]));
      } catch (e) { return 0; }
    }
    function recFindSmsCandidates(amount, bank, y, m, d, raw) {
      var out = [];
      amount = Number(amount) || 0;
      y = parseInt(y, 10) || 0; m = parseInt(m, 10) || 0; d = parseInt(d, 10) || 1;
      if (!amount || !y || !m) return out;
      var smsIdx = recDayIndex(y, m, d), smsK = recMonthKey(y, m), today = recTodayKey();
      var payer = recSmsPayer(raw);
      bank = (bank || '').trim();
      (recurringIncomes || []).forEach(function (item) {
        if (!item || item.deletedAt || !item.id) return;
        var hint = !!(payer && (item.payerHints || []).indexOf(payer) >= 0);
        var rows = recRowsOf(item);
        /* ۱.۳.۵۶: اولین واریز قرارداد (هنوز واریزی وصل نیست): ۱۰ روز قبل تا ۵۰ روز بعد از شروع؛ نوع قرارداد از همین واریز */
        var t0 = (item.contractStart && item.contractStart.y && !recPaysOf(item).length) ? recTimingFromFirst(item, { y: y, m: m, d: d }) : '';
        if (t0) {
          var exp0 = Number(item.amount) || 0, acc0 = (item.account || '').trim();
          if (exp0 && Math.abs(exp0 - amount) <= exp0 * 0.05 && !(acc0 && bank && acc0 !== bank)) {
            var sk0 = recStartKey(item), tk0 = t0 === 'end' ? recNextKey(sk0) : sk0;
            var x0 = rows.find(function (z) { return z.key === tk0 && !recIsPaid(z.row); });
            if (x0) {
              var dd0 = parseInt(toEnglishDigits(String(x0.row.day || '')), 10) || recDueDay(item);
              out.push({ recId: item.id, key: tk0, name: item.name || '', diff: smsIdx - recDayIndex(Math.floor(tk0 / 100), tk0 % 100, dd0), exact: exp0 === amount, hint: hint, due: dd0, ahead: false, late: smsK > tk0, early: smsK < tk0 });
              return;
            }
          }
        }
        /* عادت مستاجر: میانگین فاصلهٔ واریزهای قبلی تا سررسیدشان (بازهٔ ۱۰ روزه دور همین عادت) */
        var habit = recHabitOffset(item);
        rows.forEach(function (x) {
          if (recIsPaid(x.row)) return;
          var exp = Number(x.row.amount) || Number(item.amount) || 0;
          if (!exp || Math.abs(exp - amount) > exp * 0.05) return;
          var acc = (x.row.account || item.account || '').trim();
          if (acc && bank && acc !== bank) return;
          var dd = parseInt(toEnglishDigits(String(x.row.day || '')), 10) || parseInt(recDayFor(item, x.key), 10) || 1;
          var diff = smsIdx - recDayIndex(Math.floor(x.key / 100), x.key % 100, dd);
          /* ۱.۳.۵۵: تا ۱۰ روز قبل/بعد از سررسید (معوقه/پیش‌پرداخت)؛ ۱.۳.۵۶: دور عادت مستاجر */
          if (Math.abs(diff - habit) > 10) return;
          out.push({ recId: item.id, key: x.key, name: item.name || '', diff: diff, exact: exp === amount, hint: hint, due: dd, ahead: false, late: smsK > x.key, early: smsK < x.key });
        });
        /* پیش‌واریز برای ماه بعد که هنوز ردیفش ساخته نشده */
        var nk = recNextKey(smsK);
        if (nk > today && recInRange(item, nk) && !(item.paidAhead && item.paidAhead[String(nk)]) && !rows.some(function (x) { return x.key === nk; })) {
          var exp2 = Number(item.amount) || 0;
          var acc2 = (item.account || '').trim();
          if (exp2 && Math.abs(exp2 - amount) <= exp2 * 0.05 && !(acc2 && bank && acc2 !== bank)) {
            var dd2 = parseInt(recDayFor(item, nk), 10) || 1;
            var diff2 = smsIdx - recDayIndex(Math.floor(nk / 100), nk % 100, dd2);
            if (diff2 <= 0 && Math.abs(diff2 - habit) <= 10) out.push({ recId: item.id, key: nk, name: item.name || '', diff: diff2, exact: exp2 === amount, hint: hint, due: dd2, ahead: true });
          }
        }
      });
      out.sort(function (a, b) { return ((b.hint && b.exact) - (a.hint && a.exact)) || (b.exact - a.exact) || (b.hint - a.hint) || (Math.abs(a.diff) - Math.abs(b.diff)); });
      return out;
    }
    /* هر وقت دست‌کم یک درآمد ثابتِ احتمالی هست، بهترینش از پیش انتخاب می‌شود (حتی با بیش از ۲ روز فاصله):
       اول نام واریزکنندهٔ آموخته، بعد مبلغ دقیقاً برابر، بعد نزدیک‌ترین روز. «خیر» فقط وقتی هیچ موردی نیست پیش‌فرض است */
    function recSmsConfident(list) {
      return (list && list.length) ? list[0] : null;
    }
    /* فیلد «بابت چه بود»: با انتخاب درآمد ثابت، نام آن پیش‌فرض نوشته می‌شود ولی قابل ویرایش است؛
       متنی که کاربر خودش نوشته دست نمی‌خورد. با «خیر» فقط همان نام پیش‌فرض پاک می‌شود */
    function recSyncDescLock() {
      var desc = document.getElementById('smsConfirmDesc');
      if (!desc) return;
      var sel = document.getElementById('smsRecMatchSel');
      var on = !!(sel && sel.value && document.getElementById('smsRecMatch'));
      var name = '';
      if (on) { var opt = sel.options[sel.selectedIndex]; name = (opt && opt.getAttribute('data-name')) || ''; }
      var cur = desc.value || '';
      var untouched = !cur.trim() || (desc._recAuto && cur === desc._recAuto);
      if (on && untouched) { desc.value = name; desc._recAuto = name; }
      else if (!on && desc._recAuto && cur === desc._recAuto) { desc.value = ''; desc._recAuto = ''; }
    }
    /* نام درآمدهای ثابتِ پیشنهادشده برای این پیامک (برای بالای فهرست پیشنهاد «بابت چه بود») */
    function recSmsSuggestNames() {
      var sel = document.getElementById('smsRecMatchSel');
      if (!sel || !document.getElementById('smsRecMatch')) return [];
      var out = [];
      var first = sel.value ? sel.options[sel.selectedIndex] : null;
      if (first && first.getAttribute('data-name')) out.push(first.getAttribute('data-name'));
      [].forEach.call(sel.options, function (o) { var n = o.getAttribute('data-name'); if (n && out.indexOf(n) < 0) out.push(n); });
      return out;
    }
    function recRenderSmsMatch() {
      var meta = document.getElementById('smsConfirmMeta');
      var old = document.getElementById('smsRecMatch');
      var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
      var prevVal = old ? (old.querySelector('select') || {}).value : null;
      if (!meta) return;
      var list = [];
      try {
        if (g('smsConfirmType') === 'income') {
          var bank = String(g('smsConfirmBank') || '').trim();
          if (bank === '__add_account__') bank = '';
          list = recFindSmsCandidates(parseAmount(g('smsConfirmAmount')), bank, g('smsConfirmYear'), g('smsConfirmMonth'), g('smsConfirmDay'), pendingSmsEntry && pendingSmsEntry.raw);
        }
      } catch (e) { list = []; }
      if (!list.length) { if (old) old.remove(); recSyncDescLock(); return; }
      var box = old || document.createElement('div');
      box.id = 'smsRecMatch';
      box.style.cssText = 'margin:0 0 10px;padding:8px 10px;border:1px solid rgba(48,209,88,0.45);border-radius:10px;background:rgba(48,209,88,0.08);';
      var conf = recSmsConfident(list);
      var val = function (c) { return c.recId + '|' + c.key + '|' + (c.ahead ? 1 : 0); };
      var lab = document.createElement('label');
      lab.className = 'family-label';
      lab.textContent = conf ? ('این واریز مربوط به «' + conf.name + '» است؟') : 'این واریز مربوط به کدام درآمد ثابت است؟';
      var sel = document.createElement('select');
      sel.id = 'smsRecMatchSel';
      sel.style.cssText = 'width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;';
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = 'خیر، تراکنش جدید ثبت شود';
      list.forEach(function (c) {
        var o = document.createElement('option');
        o.value = val(c);
        o.setAttribute('data-name', c.name);
        o.textContent = c.name + ' — سررسید ' + toPersianDigits(String(c.due || '')) + ' ' + (MONTHS[(c.key % 100) - 1] || '') + ((c.ahead || c.early) ? ' (پیش‌پرداخت)' : c.late ? ' (معوقه)' : '');
        sel.appendChild(o);
      });
      sel.appendChild(o0);
      var keep = prevVal != null && (prevVal === '' || list.some(function (c) { return val(c) === prevVal; })) ? prevVal : null;
      sel.value = keep != null ? keep : (conf ? val(conf) : '');
      box.innerHTML = '';
      box.appendChild(lab);
      box.appendChild(sel);
      if (!old) meta.insertBefore(box, meta.firstChild);
      sel.addEventListener('change', recSyncDescLock);
      try { enhanceSelectFont(sel); } catch (e) {}
      recSyncDescLock();
    }
    function recBindSmsMatch() {
      ['smsConfirmType', 'smsConfirmAmount', 'smsConfirmBank', 'smsConfirmDay', 'smsConfirmMonth', 'smsConfirmYear'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el._recBound) { el._recBound = true; el.addEventListener('change', recRenderSmsMatch); }
        if (el && !el._rptBound) { el._rptBound = true; el.addEventListener('change', hkRptRender); }
      });
      recRenderSmsMatch();
      setTimeout(recRenderSmsMatch, 60);
      try { hkRptRender(); } catch (eR) {}
      setTimeout(function () { try { hkRptRender(); } catch (eR2) {} }, 60);
    }
    /* ۱.۳.۶۴: برداشت تکراری (مثل قسط): همان مبلغ، همان حساب و حدود همان روز در ماه‌های قبل → اسمی که آن ماه‌ها ثبت شده پیشنهاد می‌شود
       (همان شکل پیشنهاد درآمد ثابت، با قرمز برداشت). فقط شرح را پر می‌کند؛ در ثبت چیز دیگری عوض نمی‌شود */
    var HK_RPT_DAY_TOL = 3, HK_RPT_MIN_MONTHS = 2, HK_RPT_LOOKBACK = 12;
    function hkRptFindCandidates(amount, bank, y, m, day) {
      amount = Number(amount) || 0; bank = String(bank || '').trim(); y = parseInt(y, 10) || 0; m = parseInt(m, 10) || 0;
      var dd = parseInt(toEnglishDigits(String(day || '')), 10) || 0;
      if (!amount || !bank || !y || !m) return [];
      var by = {};
      for (var i = 1; i <= HK_RPT_LOOKBACK; i++) {
        var yy = y, mm = m - i; while (mm < 1) { mm += 12; yy--; }
        var pd = archive && archive[periodKey(yy, mm)];
        (((pd && pd.expense && pd.expense.sections) || [])).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || (r.status || 'paid') !== 'paid') return;
            var A = Number(r.amount) || 0;
            if (Math.abs(A - amount) > Math.max(A, amount) * 0.005) return;
            if (String(r.account || '').trim() !== bank) return;
            var rd = dayNum(r);
            if (dd && rd && Math.abs(rd - dd) > HK_RPT_DAY_TOL) return;
            var name = String(r.desc || '').trim();
            if (!name || name === 'برداشت بانکی') return;
            var o = by[name] || (by[name] = { name: name, months: {}, last: 0 });
            o.months[yy * 100 + mm] = 1; o.last = Math.max(o.last, yy * 100 + mm);
          });
        });
      }
      return Object.keys(by).map(function (k) { var o = by[k]; o.n = Object.keys(o.months).length; return o; })
        .filter(function (o) { return o.n >= HK_RPT_MIN_MONTHS; })
        .sort(function (a, b) { return (b.n - a.n) || (b.last - a.last); });
    }
    function hkRptSyncDesc() {
      var desc = document.getElementById('smsConfirmDesc');
      if (!desc) return;
      var sel = document.getElementById('smsRptMatchSel');
      var on = !!(sel && sel.value && document.getElementById('smsRptMatch'));
      var name = on ? sel.value : '';
      var cur = desc.value || '';
      var untouched = !cur.trim() || (desc._rptAuto && cur === desc._rptAuto);
      if (on && untouched) { desc.value = name; desc._rptAuto = name; }
      else if (!on && desc._rptAuto && cur === desc._rptAuto) { desc.value = ''; desc._rptAuto = ''; }
    }
    function hkRptRender() {
      var meta = document.getElementById('smsConfirmMeta');
      var old = document.getElementById('smsRptMatch');
      var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
      var prevVal = old ? (old.querySelector('select') || {}).value : null;
      if (!meta) return;
      var list = [];
      try {
        if (g('smsConfirmType') === 'expense') {
          var bank = String(g('smsConfirmBank') || '').trim();
          if (bank === '__add_account__') bank = '';
          list = hkRptFindCandidates(parseAmount(g('smsConfirmAmount')), bank, g('smsConfirmYear'), g('smsConfirmMonth'), g('smsConfirmDay'));
        }
      } catch (e) { list = []; }
      if (!list.length) { if (old) old.remove(); hkRptSyncDesc(); return; }
      var box = old || document.createElement('div');
      box.id = 'smsRptMatch';
      box.style.cssText = 'margin:0 0 10px;padding:8px 10px;border:1px solid rgba(255,107,74,0.5);border-radius:10px;background:rgba(255,107,74,0.08);';
      var lab = document.createElement('label');
      lab.className = 'family-label';
      lab.textContent = 'این برداشت «' + list[0].name + '» است؟';
      var sel = document.createElement('select');
      sel.id = 'smsRptMatchSel';
      sel.style.cssText = 'width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;';
      list.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.name;
        o.textContent = c.name + ' — ' + toPersianDigits(String(c.n)) + ' ماه قبل هم';
        sel.appendChild(o);
      });
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = 'خیر، شرح دیگر';
      sel.appendChild(o0);
      var keep = prevVal != null && (prevVal === '' || list.some(function (c) { return c.name === prevVal; })) ? prevVal : null;
      sel.value = keep != null ? keep : list[0].name;
      box.innerHTML = '';
      box.appendChild(lab);
      box.appendChild(sel);
      if (!old) meta.insertBefore(box, meta.firstChild);
      sel.addEventListener('change', hkRptSyncDesc);
      try { enhanceSelectFont(sel); } catch (e) {}
      hkRptSyncDesc();
    }
    /* ثبت پیامک روی ردیف انتخاب‌شده؛ true یعنی ثبت انجام شد */
    function recApplySmsMatch(v, info) {
      var p = String(v || '').split('|');
      var item = (recurringIncomes || []).find(function (r) { return r && r.id === p[0]; });
      var k = parseInt(p[1], 10) || 0;
      if (!item || !k) return false;
      var ahead = p[2] === '1';
      var smsK = recMonthKey(info.y, info.m);
      var targetK = k;
      /* ۱.۳.۵۵: واریز در ماه دیگری غیر از ماه سررسید: ردیف در ماه واریز ثبت می‌شود و بابت ماه سررسید حساب می‌شود */
      if (!ahead && smsK !== k) {
        var x0 = recRowsOf(item).find(function (z) { return z.key === k && !recIsPaid(z.row); });
        if (!x0) return false;
        recRemoveRows([x0]);
        ahead = true;
      }
      if (!ahead) {
        var x = recRowsOf(item).find(function (z) { return z.key === k && !recIsPaid(z.row); });
        if (!x) return false;
        x.row.status = 'paid';
        x.row.amount = info.amount;
        if (info.desc) x.row.desc = info.desc;
        if (info.day && smsK === k) x.row.day = String(info.day);
        if (smsK !== k) x.row.receivedOn = { y: info.y, m: info.m, d: parseInt(info.day, 10) || 0 };
        if (info.bank) x.row.account = info.bank;
        x.row.viaSms = true;
        hkSmsStamp(x.row);
        try { var _rl = hkSmsRialFor(info.amount); if (_rl) x.row.amountRial = _rl; else delete x.row.amountRial; } catch (eRl) {}
        x.row.updatedAt = Date.now();
      } else {
        var pd = recMonthData(smsK, true);
        var sec = recSectionIn(pd, item, true) || ensureSmsSection('income', 'واریز بانکی', pd);
        if (!sec) return false;
        recPlaceRow(sec, hkSmsStamp(Object.assign(emptyRow('income'), {
          day: info.day ? String(info.day) : '',
          desc: recDueDesc(item, k, smsK),
          amount: info.amount, status: 'paid', account: info.bank || item.account || '',
          fromRecurringId: item.id, recForKey: k, viaSms: true, amountRial: hkSmsRialFor(info.amount) || undefined, createdAt: Date.now(), updatedAt: Date.now()
        })));
        if (!item.paidAhead) item.paidAhead = {};
        item.paidAhead[String(k)] = true;
        targetK = smsK;
      }
      try { recInferTiming(item); } catch (eIt) {}
      var payer = recSmsPayer(info.raw);
      if (payer) {
        item.payerHints = (item.payerHints || []).filter(function (h) { return h !== payer; });
        item.payerHints.unshift(payer);
        item.payerHints = item.payerHints.slice(0, 5);
      }
      try { saveRecurring(); } catch (e) {}
      recPersist();
      closeSmsConfirmModal();
      try { if (typeof navigateToPeriod === 'function') navigateToPeriod(Math.floor(targetK / 100), targetK % 100); } catch (e) {}
      try { if (currentTab !== 'income') switchTab('income'); else renderAll(); } catch (e) {}
      try { showToast('واریز به‌عنوان «' + (item.name || '') + '» ' + recKeyLabel(k) + ' ثبت شد', 1400); } catch (e) {}
      return true;
    }

    function openSmsConfirmModal(parsed) {
      const m = document.getElementById('smsConfirmModal');
      if (!m) return;
      try { if (typeof hkSmsAttBegin === 'function') hkSmsAttBegin(parsed && parsed.amount, parsed && parsed.raw); } catch (eAt) {}
      /* ۱.۳.۴۷: عنوان کوتاه «ثبت برداشت/واریز» وسط‌چین در سلول تیره‌تر */
      const titleEl = document.getElementById('smsConfirmTitle');
      if (titleEl) titleEl.textContent = 'ثبت ' + (parsed.type === 'income' ? 'واریز' : 'برداشت');
      const meta = document.getElementById('smsConfirmMeta');
      if (meta) {
        /* ۱.۳.۴۶: مبلغ، نوع و تاریخ فقط برای دیدن (خلاصه)؛ بانک قابل تغییر */
        var _roT = (function () { try { return hkSmsTime(parsed.raw || '') || ''; } catch (e) { return ''; } })();
        var _roY = parseInt(parsed.year, 10) || getTodayPersian().y, _roM = parseInt(parsed.month, 10) || getTodayPersian().m, _roD = parseInt(String(parsed.day || '').replace(/[^0-9]/g, ''), 10) || getTodayPersian().d;
        meta.innerHTML =
          '<div class="sms-ro-sum">' +
            '<div class="sms-ro-amt ' + (parsed.type === 'income' ? 'inc' : 'exp') + '"><small>تومان</small><span>' + (parsed.amount ? formatNum(parsed.amount) : '—') + '</span></div>' +
            '<div class="sms-ro-line sms-ro-date"><span>' + toPersianDigits(String(_roD)) + ' ' + (MONTHS[_roM - 1] || '') + ' ' + toPersianDigits(String(_roY)) + (_roT ? ' · ساعت ' + toPersianDigits(_roT) : '') + '</span></div>' +
          '</div>' +
          '<div class="sms-ro-hide">' +
          '<label class="family-label">نوع:</label>' +
          '<select id="smsConfirmType" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;margin-bottom:10px;">' +
            '<option value="income"' + (parsed.type === 'income' ? ' selected' : '') + '>واریز (درآمد)</option>' +
            '<option value="expense"' + (parsed.type === 'expense' ? ' selected' : '') + '>برداشت (مخارج)</option>' +
          '</select>' +
          '<label class="family-label">مبلغ (تومان):</label>' +
          '<input id="smsConfirmAmount" type="text" inputmode="numeric" value="' + (parsed.amount ? formatNum(parsed.amount) : '') + '" ' +
            'style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:700;direction:ltr;text-align:left;margin-bottom:10px;">' +
          '</div>' +
          '<label class="family-label">بانک:</label>' +
          '<select id="smsConfirmBank" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;margin-bottom:10px;"></select>' +
          '<label class="family-label sms-ro-hide">تاریخ (روز / ماه / سال):</label>' +
          '<div class="sms-date-row sms-ro-hide" style="display:flex;flex-direction:row;gap:6px;direction:ltr;margin-bottom:10px;width:100%;max-width:100%;box-sizing:border-box;">' +
          (function(){
            var ty = (parsed.year != null) ? parseInt(parsed.year,10) : ((typeof getTodayPersian==='function' && getTodayPersian().y) || currentYear || 1405);
            var tm = (parsed.month != null) ? parseInt(parsed.month,10) : ((typeof getTodayPersian==='function' && getTodayPersian().m) || currentMonth || 1);
            var td = parsed.day ? parseInt(String(parsed.day).replace(/[^0-9]/g,''),10) : ((typeof getTodayPersian==='function' && getTodayPersian().d) || 1);
            if (!(ty >= 1300 && ty <= 1500)) ty = currentYear || 1405;
            if (!(tm >= 1 && tm <= 12)) tm = currentMonth || 1;
            if (!(td >= 1 && td <= 31)) td = 1;
            var y0 = 1390, y1 = 1420;
            var st = 'width:100%;box-sizing:border-box;padding:6px 4px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;font-size:12px;text-align:center;';
            var ds = '<select id="smsConfirmDay" style="'+st+'">';
            for (var di=1;di<=31;di++) ds += '<option value="'+di+'"'+(di===td?' selected':'')+'>'+toPersianDigits(String(di))+'</option>';
            ds += '</select>';
            var ms = '<select id="smsConfirmMonth" style="'+st+'">';
            for (var mi=1;mi<=12;mi++) ms += '<option value="'+mi+'"'+(mi===tm?' selected':'')+'>'+toPersianDigits(String(mi))+'</option>';
            ms += '</select>';
            var ys = '<select id="smsConfirmYear" style="'+st+'">';
            for (var y=y0;y<=y1;y++) ys += '<option value="'+y+'"'+(y===ty?' selected':'')+'>'+toPersianDigits(String(y))+'</option>';
            ys += '</select>';
            return ys + ms + ds;
          })() +
          '</div>' +
          
          '<label class="family-label sms-sec-lab" style="display:none">بخش مقصد</label>' +
          '<div id="smsConfirmSectionInner" style="display:none;margin-bottom:4px;"></div>';
        ['smsConfirmDay','smsConfirmMonth','smsConfirmYear'].forEach(function(id){
          try {
            var el = meta.querySelector('#'+id);
            if (el && typeof enhanceSelectFont === 'function') enhanceSelectFont(el);
          } catch (eD) {}
        });
        const bankSel = meta.querySelector('#smsConfirmBank');
        if (bankSel) {
          /* میان‌بر منوی انتخاب حساب — فقط حساب‌های کاربر + گزینه افزودن */
          const personalized = selectedAccountLabels();
          const preferred = (typeof getSmsBankPref === 'function' ? getSmsBankPref(parsed.raw || '') : '') || parsed.bank || '';
          const opts = [];
          const seen = new Set();
          personalized.forEach(n => {
            if (n && !seen.has(n)) { seen.add(n); opts.push(n); }
          });
          const ph = document.createElement('option');
          ph.value = '';
          ph.textContent = opts.length ? 'انتخاب حساب' : 'حسابی ثبت نشده';
          bankSel.appendChild(ph);
          opts.forEach(n => {
            const o = document.createElement('option');
            o.value = n;
            o.textContent = n;
            if (preferred && (n === preferred || n === bankShortLabel(preferred))) o.selected = true;
            bankSel.appendChild(o);
          });
          const addOpt = document.createElement('option');
          addOpt.value = '__add_account__';
          addOpt.textContent = '＋ افزودن حساب';
          bankSel.appendChild(addOpt);
          enhanceSelectFont(bankSel);
          bankSel.onchange = function() {
            if (bankSel.value !== '__add_account__') return;
            var keepPrev = '';
            try {
              for (var oi = 0; oi < bankSel.options.length; oi++) {
                var op = bankSel.options[oi];
                if (op.value && op.value !== '__add_account__') {
                  /* مقدار قبل از انتخاب + */
                }
              }
              if (bankSel.dataset.prevVal) keepPrev = bankSel.dataset.prevVal;
            } catch (e0) {}
            setTimeout(function() {
              try { bankSel.value = keepPrev || ''; } catch (e1) {}
              try { if (bankSel._fancyRender) bankSel._fancyRender(); } catch (eF) {}
              try { if (window.hkSmsInlineNewAcc) window.hkSmsInlineNewAcc(bankSel); } catch (eA) {}
            }, 0);
          };
          bankSel.addEventListener('focus', function() {
            try { bankSel.dataset.prevVal = bankSel.value || ''; } catch (eP) {}
          });
        }
        const typeSelEl = meta.querySelector('#smsConfirmType');
        if (typeSelEl) enhanceSelectFont(typeSelEl);
        const amtInp = meta.querySelector('#smsConfirmAmount');
        if (amtInp) {
          amtInp.oninput = () => {
            const digits = toEnglishDigits(amtInp.value).replace(/[^0-9]/g, '');
            if (!digits) { amtInp.value = ''; return; }
            amtInp.value = formatNum(parseInt(digits, 10) || 0);
          };
        }
      }
      const desc = document.getElementById('smsConfirmDesc');
      if (desc) {
        desc.value = '';
        desc._recAuto = '';
        /* ۱.۳.۶۴: «Done» کیبورد = دکمهٔ «ثبت» */
        if (!desc._hkDoneBound) {
          desc._hkDoneBound = true;
          desc.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Enter' || ev.isComposing || ev.keyCode === 229) return;
            ev.preventDefault();
            try { confirmSmsEntry(); } catch (e) { showToast(String(e)); }
          });
        }
        desc.removeAttribute('data-plan-id');
        desc.removeAttribute('data-plan-index');
        /* ساجست: اقساط (کلمه قسط) + شرح‌های پرتکرار درآمد/مخارج */
        let sugBox = document.getElementById('smsPlanSuggest');
        if (!sugBox) {
          sugBox = document.createElement('div');
          sugBox.id = 'smsPlanSuggest';
          sugBox.style.cssText = 'display:none;margin:4px 0 10px;border:1px solid rgba(255,255,255,0.12);border-radius:10px;background:#1c1c1e;max-height:180px;overflow:auto;position:relative;z-index:20;';
          /* بیرون از قاب میکروفون، تا با باز شدن پیشنهادها آیکون جابه‌جا/پنهان نشود */
          var _anc = desc._micWrap || desc;
          if (_anc.parentNode) _anc.parentNode.insertBefore(sugBox, _anc.nextSibling);
        }
        sugBox.style.display = 'none';
        sugBox.innerHTML = '';
        function renderSmsDescSuggest() {
          const t = (desc.value || '').trim();
          if (!/اقساط/.test(t)) {
            desc.removeAttribute('data-plan-batch');
          }
          desc.removeAttribute('data-plan-id');
          desc.removeAttribute('data-plan-index');
          sugBox.innerHTML = '';
          /* اقساط = پرداخت دسته‌ای | قسط = تک‌قسط — بدون همپوشانی */
          var isBatch = HK_INSTALLMENTS_ON && t && /اقساط/.test(t);
          var isSingle = HK_INSTALLMENTS_ON && t && !isBatch && /قسط/.test(t);
          if (isBatch || isSingle) {
            const list = (plans || []).filter(function(p){ return p && (p.name || p.count); });
            if (!list.length) {
              sugBox.style.display = 'none';
              return;
            }
            /* وضعیت تیک‌های قبلی برای حالت دسته‌ای */
            var prevBatch = [];
            try {
              prevBatch = JSON.parse(desc.getAttribute('data-plan-batch') || '[]') || [];
            } catch (eB0) { prevBatch = []; }
            function batchHas(pid, idx) {
              return prevBatch.some(function(x){ return x && x.id === pid && parseInt(x.index, 10) === idx; });
            }
            function writeBatch() {
              var boxes = sugBox.querySelectorAll('input[data-batch-plan]');
              var arr = [];
              boxes.forEach(function(cb) {
                if (!cb.checked) return;
                arr.push({ id: cb.getAttribute('data-batch-plan'), index: parseInt(cb.getAttribute('data-batch-idx'), 10) });
              });
              desc.setAttribute('data-plan-batch', JSON.stringify(arr));
              desc.removeAttribute('data-plan-id');
              desc.removeAttribute('data-plan-index');
              /* مقدار فیلد را عوض نکن تا oninput منو را نبندد/بازسازی نکند */
              sugBox.style.display = 'block';
              sugBox._keepOpen = true;
            }
            list.forEach(function(p) {
              const cnt = Math.max(0, parseInt(p.count, 10) || 0);
              const paid = Math.min(cnt, Math.max(0, parseInt(p.paidCount, 10) || 0));
              if (isSingle) {
                const unpaidIdx = earliestUnpaidPlanIndex(p);
                if (unpaidIdx < 0) return;
                const item = document.createElement('div');
                item.style.cssText = 'padding:10px 12px;cursor:pointer;text-align:right;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.88rem;';
                const due = dueDateForInstallment(p, unpaidIdx);
                const dueTxt = due ? (toPersianDigits(due.d) + ' ' + (MONTHS[due.m - 1] || '') + ' ' + toPersianDigits(due.y)) : '';
                var unNum = unpaidIdx + 1;
                var qName = (p.name || 'قسط').trim() || 'قسط';
                item.textContent = qName + ' — پرداخت‌نشده ' + toPersianDigits(unNum) + ' از ' + toPersianDigits(cnt) + (dueTxt ? (' — سررسید: ' + dueTxt) : '');
                item.onmousedown = function(ev) {
                  try { ev.preventDefault(); } catch (e0) {}
                  desc.value = planInstallmentDesc(p, unpaidIdx, cnt);
                  desc.setAttribute('data-plan-id', p.id);
                  desc.setAttribute('data-plan-index', String(unpaidIdx));
                  desc.removeAttribute('data-plan-batch');
                  sugBox.style.display = 'none';
                };
                sugBox.appendChild(item);
              } else {
                /* دسته‌ای: همه اقساط پرداخت‌نشده با چک‌باکس */
                for (var ui = paid; ui < cnt; ui++) {
                  (function(idx) {
                    const due = dueDateForInstallment(p, idx);
                    const dueTxt = due ? (toPersianDigits(due.d) + ' ' + (MONTHS[due.m - 1] || '') + ' ' + toPersianDigits(due.y)) : '';
                    var qName = (p.name || 'قسط').trim() || 'قسط';
                    const item = document.createElement('div');
                    item.style.cssText = 'padding:8px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.85rem;text-align:right;cursor:pointer;';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.setAttribute('data-batch-plan', p.id);
                    cb.setAttribute('data-batch-idx', String(idx));
                    cb.checked = batchHas(p.id, idx);
                    cb.style.cssText = 'width:18px;height:18px;flex-shrink:0;accent-color:#3b82f6;pointer-events:none;';
                    const lab = document.createElement('span');
                    lab.style.cssText = 'flex:1;';
                    lab.textContent = qName + ' — پرداخت‌نشده ' + toPersianDigits(idx + 1) + ' از ' + toPersianDigits(cnt) + (dueTxt ? (' — سررسید: ' + dueTxt) : '');
                    function toggleBatchRow(ev) {
                      try { if (ev) { ev.preventDefault(); ev.stopPropagation(); } } catch (eT) {}
                      sugBox._keepOpen = true;
                      cb.checked = !cb.checked;
                      writeBatch();
                      sugBox.style.display = 'block';
                      try { desc.focus(); } catch (eF) {}
                    }
                    item.onmousedown = function(ev) {
                      try { ev.preventDefault(); ev.stopPropagation(); } catch (eM) {}
                      sugBox._keepOpen = true;
                    };
                    item.onclick = toggleBatchRow;
                    item.appendChild(lab);
                    item.appendChild(cb);
                    sugBox.appendChild(item);
                  })(ui);
                }
              }
            });
            if (!sugBox.children.length) {
              sugBox.style.display = 'none';
              return;
            }
            if (isBatch) {
              sugBox.onmousedown = function(ev) {
                try { ev.preventDefault(); } catch (eK) {}
                sugBox._keepOpen = true;
              };
            }
            sugBox.style.display = 'block';
            sugBox._keepOpen = true;
            return;
          }
          /* در غیر این صورت — شرح‌های پرتکرار از درآمد و مخارج */
          var freq = [];
          try { freq = collectFrequentDescs(20) || []; } catch (eF) { freq = []; }
          /* ۱.۳.۴۸: شرح‌های خودکارِ ردیف اختلاف («مجموع … ثبت‌نشده در این بازه»، کارمزد) پیشنهاد نمی‌شوند */
          freq = freq.filter(function (s) { return !/ثبت‌نشده در این بازه|کارمزد \/ اختلاف جزئی/.test(String(s)); });
          if (t) {
            var tNorm = t.toLowerCase();
            freq = freq.filter(function(s) {
              return String(s).indexOf(t) >= 0 || String(s).toLowerCase().indexOf(tNorm) >= 0;
            });
          }
          /* درآمد ثابتِ شناخته‌شده برای این پیامک: نامش همیشه اول فهرست */
          try {
            var _rn = recSmsSuggestNames();
            if (_rn.length) freq = _rn.concat(freq.filter(function (x) { return _rn.indexOf(x) < 0; }));
          } catch (eRn) {}
          freq = freq.slice(0, 10);
          if (!freq.length) {
            sugBox.style.display = 'none';
            return;
          }
          freq.forEach(function(s) {
            const item = document.createElement('div');
            item.style.cssText = 'padding:10px 12px;cursor:pointer;text-align:right;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.88rem;';
            item.textContent = s;
            item.onmousedown = function(ev) {
              try { ev.preventDefault(); } catch (e0) {}
              desc.value = s;
              desc.removeAttribute('data-plan-id');
              desc.removeAttribute('data-plan-index');
              sugBox.style.display = 'none';
            };
            sugBox.appendChild(item);
          });
          sugBox.style.display = 'block';
        }
        desc.oninput = function() { renderSmsDescSuggest(); };
        desc.onfocus = function() {
          renderSmsDescSuggest();
          setTimeout(function() {
            try {
              var box = document.querySelector('#smsConfirmModal .modal-box');
              if (box && desc.scrollIntoView) {
                desc.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            } catch (eSc) {}
          }, 280);
        };
        desc.addEventListener('blur', function() {
          setTimeout(function() {
            try {
              if (sugBox._keepOpen) {
                sugBox._keepOpen = false;
                sugBox.style.display = 'block';
                return;
              }
              var ae = document.activeElement;
              if (ae && sugBox.contains(ae)) return;
              sugBox.style.display = 'none';
            } catch (eB) {}
          }, 220);
        });
      }
      const wrap = document.getElementById('smsConfirmSectionInner') || document.getElementById('smsConfirmSectionWrap');
      if (wrap) {
        wrap.innerHTML = '';
        const tab = parsed.type === 'income' ? 'income' : 'expense';
        const sections = (periodData[tab] && periodData[tab].sections) || [];
        const sel = document.createElement('select');
        sel.id = 'smsConfirmSectionSel';
        sel.style.cssText = 'width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;font-size:0.95rem;';
        // دیفالت: نام کاربر اولین کارت
        let defaultSecId = '';
        try {
          const titles = (typeof allPersonTitles === 'function') ? allPersonTitles() : [];
          const firstName = (titles && titles[0]) ? String(titles[0]).trim() : '';
          if (firstName) {
            const match = sections.find(function(s){ return ((s.title || '').trim() === firstName); });
            if (match) defaultSecId = match.id;
          }
          if (!defaultSecId && sections.length) defaultSecId = sections[0].id;
        } catch (eD) {}
        /* پنتا: دیفالت اولین کارت؛ گزینه خودکار در انتها */
        sections.forEach((s) => {
          const o = document.createElement('option');
          o.value = s.id;
          o.textContent = (s.title || '').trim() || 'بدون نام';
          if (defaultSecId && s.id === defaultSecId) o.selected = true;
          sel.appendChild(o);
        });
        const autoTitle = tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی';
        const optAuto = document.createElement('option');
        optAuto.value = '__auto__';
        optAuto.textContent = 'خودکار: ' + autoTitle;
        if (!defaultSecId) optAuto.selected = true;
        sel.appendChild(optAuto);
        wrap.appendChild(sel);
        enhanceSelectFont(sel);
        const typeSel = document.getElementById('smsConfirmType');
        if (typeSel) {
          typeSel.onchange = () => {
            const t = typeSel.value === 'income' ? 'income' : 'expense';
            const secs = (periodData[t] && periodData[t].sections) || [];
            sel.innerHTML = '';
            const at = t === 'income' ? 'واریز بانکی' : 'برداشت بانکی';
            let defId = '';
            try {
              const titles = (typeof allPersonTitles === 'function') ? allPersonTitles() : [];
              const firstName = (titles && titles[0]) ? String(titles[0]).trim() : '';
              if (firstName) {
                const match = secs.find(function(s){ return ((s.title || '').trim() === firstName); });
                if (match) defId = match.id;
              }
              if (!defId && secs.length) defId = secs[0].id;
            } catch (e2) {}
            const oa = document.createElement('option');
            oa.value = '__auto__';
            oa.textContent = 'خودکار: ' + at;
            sel.appendChild(oa);
            secs.forEach((s) => {
              const o = document.createElement('option');
              o.value = s.id;
              o.textContent = (s.title || '').trim() || 'بدون نام';
              if (defId && s.id === defId) o.selected = true;
              sel.appendChild(o);
            });
            if (!defId) oa.selected = true;
            if (sel._fancyRender) sel._fancyRender();
          };
        }
      }
      try { enhanceSmsConfirmProUI(parsed); } catch (ePro) {}
      try { recBindSmsMatch(); } catch (eRecM) {}
      try { enhanceAllSelectsIn(m); } catch (eAll) {}
      m.classList.add('open');
      try { syncModalOverlaysToViewport(); } catch (e) {}
    }

    
    
