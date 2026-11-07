    /* ===== پس‌انداز (ارز و طلا) — بخش مستقل؛ به موجودی کل و درآمد وصل نیست =====
       ذخیره: STORAGE_KEY + '_savings' = { v, items: [{ id, asset, label, unit, qty, buy, y, m, d, note }], prices: { key: { p, at } } } */
    var SAVINGS_KEY = STORAGE_KEY + '_savings';
    var SAVINGS_ASSETS = [
      { k: 'usd', n: 'دلار آمریکا', u: 'دلار', g: 'fx' },
      { k: 'eur', n: 'یورو', u: 'یورو', g: 'fx' },
      { k: 'aed', n: 'درهم امارات', u: 'درهم', g: 'fx' },
      { k: 'gbp', n: 'پوند انگلیس', u: 'پوند', g: 'fx' },
      { k: 'try', n: 'لیر ترکیه', u: 'لیر', g: 'fx' },
      { k: 'usdt', n: 'تتر', u: 'تتر', g: 'fx' },
      { k: 'coin_emami', n: 'سکه امامی', u: 'عدد', g: 'gold' },
      { k: 'coin_bahar', n: 'سکه بهار آزادی', u: 'عدد', g: 'gold' },
      { k: 'coin_half', n: 'نیم‌سکه', u: 'عدد', g: 'gold' },
      { k: 'coin_quarter', n: 'ربع‌سکه', u: 'عدد', g: 'gold' },
      { k: 'coin_gerami', n: 'سکه گرمی', u: 'عدد', g: 'gold' },
      { k: 'gold18', n: 'طلای ۱۸ عیار', u: 'گرم', g: 'gold' },
      { k: 'gold24', n: 'طلای ۲۴ عیار', u: 'گرم', g: 'gold' },
      { k: 'gold_mesghal', n: 'طلای آب‌شده', u: 'مثقال', g: 'gold' },
      { k: 'other', n: 'سایر (نام دلخواه)', u: 'واحد', g: 'other' }
    ];
    var _savings = null;
    function _savAsset(k) { for (var i = 0; i < SAVINGS_ASSETS.length; i++) if (SAVINGS_ASSETS[i].k === k) return SAVINGS_ASSETS[i]; return SAVINGS_ASSETS[SAVINGS_ASSETS.length - 1]; }
    function _savNormalize(o) {
      var d = (o && typeof o === 'object') ? o : {};
      var items = Array.isArray(d.items) ? d.items.filter(function (x) { return x && typeof x === 'object' && x.id; }) : [];
      var prices = (d.prices && typeof d.prices === 'object' && !Array.isArray(d.prices)) ? d.prices : {};
      return { v: 1, items: items, prices: prices };
    }
    function loadSavings() {
      if (_savings) return _savings;
      try { _savings = _savNormalize(JSON.parse(localStorage.getItem(SAVINGS_KEY) || 'null')); } catch (e) { _savings = _savNormalize(null); }
      return _savings;
    }
    function saveSavings() {
      return hkStorageSet(SAVINGS_KEY, JSON.stringify(loadSavings()));
    }
    function restoreSavings(src, mode) {
      var inc = _savNormalize(src), cur = loadSavings();
      if (mode === 'replace') { _savings = inc; saveSavings(); return; }
      var ids = {}; cur.items.forEach(function (x) { ids[x.id] = 1; });
      inc.items.forEach(function (x) { if (!ids[x.id]) cur.items.push(x); });
      Object.keys(inc.prices).forEach(function (k) {
        var a = inc.prices[k], b = cur.prices[k];
        if (a && (!b || (+a.at || 0) > (+b.at || 0))) cur.prices[k] = a;
      });
      saveSavings();
    }
    /* کلید گروه: نوع دارایی، و برای «سایر» نام دلخواه */
    function _savGroupKey(it) { return it.asset === 'other' ? 'other:' + String(it.label || '').trim() : String(it.asset || 'other'); }
    function _savGroupName(it) { return it.asset === 'other' ? (String(it.label || '').trim() || 'سایر') : _savAsset(it.asset).n; }
    function _savUnit(it) { return it.asset === 'other' ? (String(it.unit || '').trim() || 'واحد') : _savAsset(it.asset).u; }
    function _savQty(v) {
      var s = toEnglishDigits(String(v == null ? '' : v)).replace(/[٫/]/g, '.').replace(/[,،\s]/g, '');
      var n = parseFloat(s); return isFinite(n) && n > 0 ? n : 0;
    }
    function _savFmtQty(n) {
      var r = Math.round(n * 1000) / 1000;
      var s = r.toLocaleString('en-US', { maximumFractionDigits: 3 });
      return toPersianDigits(s).replace(/\./g, '٫');
    }
    function _savGroups() {
      var sv = loadSavings(), map = {}, order = [];
      sv.items.forEach(function (it) {
        var k = _savGroupKey(it);
        if (!map[k]) { map[k] = { key: k, name: _savGroupName(it), unit: _savUnit(it), g: it.asset === 'other' ? 'other' : _savAsset(it.asset).g, ai: SAVINGS_ASSETS.indexOf(_savAsset(it.asset)), items: [], qty: 0, cost: 0, qtyCost: 0 }; order.push(k); }
        var G = map[k], q = Number(it.qty) || 0, b = Number(it.buy) || 0;
        G.items.push(it); G.qty += q;
        if (b > 0) { G.cost += q * b; G.qtyCost += q; }
      });
      return order.map(function (k) {
        var G = map[k], pr = sv.prices[k];
        G.price = pr && Number(pr.p) > 0 ? Number(pr.p) : 0;
        G.priceAt = pr ? (+pr.at || 0) : 0;
        G.value = G.price ? G.qty * G.price : 0;
        G.pnl = (G.price && G.cost > 0) ? (G.qtyCost * G.price - G.cost) : null;
        G.items.sort(function (a, b) { return ((b.y || 0) - (a.y || 0)) || ((b.m || 0) - (a.m || 0)) || ((b.d || 0) - (a.d || 0)); });
        return G;
      }).sort(function (a, b) { return (a.ai - b.ai) || a.name.localeCompare(b.name, 'fa'); });
    }
    function _savPnlHtml(v) {
      if (v == null) return '';
      var cls = v > 0 ? 'sv-up' : (v < 0 ? 'sv-down' : '');
      return '<span class="sv-pnl ' + cls + '">' + (v > 0 ? 'سود ' : (v < 0 ? 'زیان ' : '')) + formatNum(Math.abs(Math.round(v))) + '</span>';
    }
    function renderSavings() {
      var list = document.getElementById('savingsList'), sum = document.getElementById('savingsSummary');
      if (!list || !sum) return;
      var groups = _savGroups();
      var tv = 0, tc = 0, tp = 0, anyP = false, missing = 0;
      groups.forEach(function (G) { if (G.price) { tv += G.value; } else missing++; if (G.pnl != null) { tp += G.pnl; anyP = true; } tc += G.cost; });
      if (!groups.length) {
        sum.innerHTML = '';
        list.innerHTML = '<div class="sv-empty">هنوز چیزی ثبت نشده است.<br>با «افزودن پس‌انداز» دلار، سکه یا طلای خود را ثبت کنید.</div>';
        return;
      }
      sum.innerHTML = '<div class="sv-sum">' +
        '<div class="sv-sum-row"><span>ارزش روز کل</span><b>' + (tv ? formatNum(Math.round(tv)) + ' <small>تومان</small>' : '—') + '</b></div>' +
        (tc ? '<div class="sv-sum-row"><span>قیمت خرید ثبت‌شده</span><b>' + formatNum(Math.round(tc)) + ' <small>تومان</small></b></div>' : '') +
        (anyP ? '<div class="sv-sum-row"><span>سود / زیان</span>' + _savPnlHtml(tp) + '</div>' : '') +
        (missing ? '<div class="sv-sum-hint">قیمت روز ' + toPersianDigits(String(missing)) + ' مورد وارد نشده؛ ارزش آن‌ها در جمع نیامده است.</div>' : '') +
        '</div>';
      list.innerHTML = '';
      groups.forEach(function (G) {
        var box = document.createElement('div');
        box.className = 'sv-group sv-' + G.g;
        var head = '<div class="sv-g-head"><div class="sv-g-name">' + escapeHtml(G.name) + '</div>' +
          '<div class="sv-g-qty">' + _savFmtQty(G.qty) + ' ' + escapeHtml(G.unit) + '</div></div>' +
          '<div class="sv-g-line"><span>قیمت روز هر ' + escapeHtml(G.unit) + '</span>' +
          '<button type="button" class="sv-price-btn' + (G.price ? '' : ' empty') + '">' + (G.price ? formatNum(G.price) + ' تومان' : 'وارد کنید') + '</button></div>' +
          (G.price ? '<div class="sv-g-line"><span>ارزش روز</span><b>' + formatNum(Math.round(G.value)) + ' تومان</b></div>' : '') +
          (G.pnl != null ? '<div class="sv-g-line"><span>نسبت به قیمت خرید</span>' + _savPnlHtml(G.pnl) + '</div>' : '');
        box.innerHTML = head + '<div class="sv-lots"></div>';
        box.querySelector('.sv-price-btn').onclick = function (e) { e.stopPropagation(); openSavingsPriceEditor(G); };
        var lots = box.querySelector('.sv-lots');
        G.items.forEach(function (it) {
          var row = document.createElement('div');
          row.className = 'sv-lot';
          var date = it.y ? toPersianDigits(String(it.y)) + '/' + toPersianPad2(it.m || 1) + '/' + toPersianPad2(it.d || 1) : '';
          var meta = [];
          if (date) meta.push(date);
          if (Number(it.buy) > 0) meta.push('خرید هر ' + escapeHtml(_savUnit(it)) + ' ' + formatNum(Number(it.buy)));
          row.innerHTML = '<div class="sv-lot-main"><div class="sv-lot-qty">' + _savFmtQty(Number(it.qty) || 0) + ' ' + escapeHtml(_savUnit(it)) + '</div>' +
            (meta.length ? '<div class="sv-lot-meta">' + meta.join(' · ') + '</div>' : '') +
            (it.note ? '<div class="sv-lot-meta">' + escapeHtml(it.note) + '</div>' : '') + '</div>' +
            '<div class="sv-lot-actions"><button type="button" class="btn-edit-title sv-edit" title="ویرایش" aria-label="ویرایش"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>' +
            '<button type="button" class="btn btn-del-row sv-del" title="حذف" aria-label="حذف">×</button></div>';
          row.querySelector('.sv-edit').onclick = function (e) { e.stopPropagation(); openSavingsEditor(it.id); };
          row.querySelector('.sv-del').onclick = function (e) {
            e.stopPropagation();
            var go = function () {
              var sv = loadSavings();
              try { pushToTrash('savings_item', (it.label || it.asset || 'پس‌انداز') + (it.qty ? ' · ' + toPersianDigits(String(it.qty)) : ''), { sourceLabel: 'پس‌انداز', item: JSON.parse(JSON.stringify(it)) }); } catch (eTr) {}
              sv.items = sv.items.filter(function (x) { return x.id !== it.id; });
              saveSavings(); renderSavings();
            };
            askConfirm('این مورد از پس‌انداز حذف شود؟', go);
          };
          lots.appendChild(row);
        });
        list.appendChild(box);
      });
    }
    function openSavingsModal() {
      try { closeSideMenu(); } catch (e) {}
      loadSavings();
      renderSavings();
      var m = document.getElementById('savingsModal');
      if (m) m.classList.add('open');
    }
    function closeSavingsModal() {
      closeSavingsEditor();
      var m = document.getElementById('savingsModal');
      if (m) m.classList.remove('open');
    }
    function closeSavingsEditor() {
      var ed = document.getElementById('svEditor'); if (ed) ed.remove();
      var dim = document.getElementById('svEditorDim'); if (dim) dim.remove();
      try { document.querySelectorAll('.dark-select-list.sv-dl').forEach(function (l) { l.remove(); }); } catch (e) {}
    }
    function _savEditorShell(title, bodyHtml) {
      closeSavingsEditor();
      var dim = document.createElement('div');
      dim.id = 'svEditorDim';
      dim.className = 'sv-dim';
      dim.onclick = closeSavingsEditor;
      document.body.appendChild(dim);
      var ed = document.createElement('div');
      ed.id = 'svEditor';
      ed.className = 'sv-editor';
      ed.innerHTML = '<div class="sv-ed-title">' + title + '</div>' + bodyHtml +
        '<div class="sv-ed-actions"><button type="button" class="sv-ok">ثبت</button><button type="button" class="sv-cancel">انصراف</button></div>';
      document.body.appendChild(ed);
      ed.querySelector('.sv-cancel').onclick = closeSavingsEditor;
      return ed;
    }
    /* ورودی مبلغ با جداکنندهٔ هزارگان */
    function _savMoneyInput(inp) {
      inp.addEventListener('input', function () {
        var n = toEnglishDigits(inp.value).replace(/[^0-9]/g, '');
        inp.value = n ? toPersianDigits(Number(n).toLocaleString('en-US')) : '';
      });
    }
    /* ورودی مقدار: ارقام فارسی، جداکنندهٔ هزارگان و ممیز «٫» */
    function _savQtyInput(inp) {
      inp.addEventListener('input', function () {
        var raw = toEnglishDigits(inp.value).replace(/[٫/.]/g, '.').replace(/[^0-9.]/g, '');
        var i = raw.indexOf('.');
        var ip = i >= 0 ? raw.slice(0, i) : raw, fp = i >= 0 ? raw.slice(i + 1).replace(/\./g, '').slice(0, 3) : null;
        ip = ip.replace(/^0+(?=\d)/, '');
        var out = ip ? toPersianDigits(Number(ip).toLocaleString('en-US')) : (fp !== null ? '۰' : '');
        if (fp !== null) out += '٫' + toPersianDigits(fp);
        inp.value = out;
      });
    }
    function openSavingsEditor(id) {
      var sv = loadSavings();
      var ex = id ? sv.items.find(function (x) { return x.id === id; }) : null;
      var t = getTodayPersian();
      var init = ex || { asset: 'usd', label: '', unit: '', qty: '', buy: 0, y: t.y, m: t.m, d: t.d, note: '' };
      var body =
        '<div class="sv-lbl">نوع</div><div id="svAssetWrap" class="sv-field-wrap"></div>' +
        '<div id="svOtherRow" class="sv-two"' + (init.asset === 'other' ? '' : ' hidden') + '>' +
          '<div><div class="sv-lbl">نام</div><input id="svLabel" class="sv-inp" type="text" maxlength="40" placeholder="مثلاً فرانک سوئیس" value="' + escapeHtml(init.label || '') + '"></div>' +
          '<div><div class="sv-lbl">واحد</div><input id="svUnit" class="sv-inp" type="text" maxlength="12" placeholder="مثلاً فرانک" value="' + escapeHtml(init.unit || '') + '"></div>' +
        '</div>' +
        '<div class="sv-lbl">مقدار (<span id="svUnitLbl"></span>)</div>' +
        '<input id="svQty" class="sv-inp sv-num" type="text" inputmode="decimal" placeholder="مثلاً ۵۰۰ یا ۲٫۵" value="' + (init.qty ? _savFmtQty(Number(init.qty)) : '') + '">' +
        '<div class="sv-lbl">قیمت خرید هر واحد — تومان (اختیاری)</div>' +
        '<input id="svBuy" class="sv-inp sv-num" type="text" inputmode="numeric" placeholder="برای محاسبهٔ سود و زیان" value="' + (Number(init.buy) > 0 ? toPersianDigits(Number(init.buy).toLocaleString('en-US')) : '') + '">' +
        '<div class="sv-lbl">تاریخ خرید</div>' +
        '<div class="sv-date"><div id="svDayWrap" style="flex:0 0 72px;min-width:0;"></div><div id="svMonthWrap" style="flex:1.3;min-width:0;"></div><div id="svYearWrap" style="flex:0 0 88px;min-width:0;"></div></div>' +
        '<div class="sv-lbl">یادداشت (اختیاری)</div>' +
        '<input id="svNote" class="sv-inp" type="text" maxlength="80" placeholder="مثلاً نزد صرافی / گاوصندوق" value="' + escapeHtml(init.note || '') + '">';
      var ed = _savEditorShell(ex ? 'ویرایش پس‌انداز' : 'پس‌انداز جدید', body);
      var st = { asset: init.asset || 'usd', y: parseInt(init.y, 10) || t.y, m: parseInt(init.m, 10) || t.m, d: parseInt(init.d, 10) || t.d };
      var unitLbl = ed.querySelector('#svUnitLbl'), otherRow = ed.querySelector('#svOtherRow'), unitInp = ed.querySelector('#svUnit');
      var syncUnit = function () {
        otherRow.hidden = st.asset !== 'other';
        unitLbl.textContent = st.asset === 'other' ? (unitInp.value.trim() || 'واحد') : _savAsset(st.asset).u;
      };
      unitInp.addEventListener('input', syncUnit);
      var put = function (wrapSel, el) { var w = ed.querySelector(wrapSel); if (w) { w.innerHTML = ''; w.appendChild(el); } };
      try {
        put('#svAssetWrap', createDarkSelect({ id: 'svAssetSelect', listClassName: 'sv-dl', options: SAVINGS_ASSETS.map(function (a) { return { value: a.k, label: a.n }; }), value: st.asset, onChange: function (v) { st.asset = String(v); syncUnit(); } }));
        var dayOpts = []; for (var di = 1; di <= 31; di++) dayOpts.push({ value: di, label: toPersianDigits(String(di)) });
        put('#svDayWrap', createDarkSelect({ id: 'svDaySelect', listClassName: 'sv-dl', options: dayOpts, value: st.d, onChange: function (v) { st.d = parseInt(v, 10) || 1; } }));
        put('#svMonthWrap', createDarkSelect({ id: 'svMonthSelect', listClassName: 'sv-dl', options: (MONTHS || []).map(function (n, i) { return { value: i + 1, label: n }; }), value: st.m, onChange: function (v) { st.m = parseInt(v, 10) || 1; } }));
        var yo = []; for (var yi = t.y - 15; yi <= t.y; yi++) yo.push({ value: yi, label: toPersianDigits(String(yi)) });
        if (st.y < t.y - 15 || st.y > t.y) yo.push({ value: st.y, label: toPersianDigits(String(st.y)) });
        put('#svYearWrap', createDarkSelect({ id: 'svYearSelect', listClassName: 'sv-dl', options: yo, value: st.y, onChange: function (v) { st.y = parseInt(v, 10) || t.y; } }));
      } catch (eS) {}
      syncUnit();
      _savMoneyInput(ed.querySelector('#svBuy'));
      _savQtyInput(ed.querySelector('#svQty'));
      ed.querySelector('.sv-ok').onclick = function () {
        var qty = _savQty(ed.querySelector('#svQty').value);
        if (!qty) { try { showToast('مقدار را وارد کنید'); } catch (e) {} return; }
        var label = (ed.querySelector('#svLabel').value || '').trim();
        if (st.asset === 'other' && !label) { try { showToast('نام را وارد کنید'); } catch (e) {} return; }
        var rec = {
          id: ex ? ex.id : ('sv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
          asset: st.asset, label: st.asset === 'other' ? label : '', unit: st.asset === 'other' ? (unitInp.value || '').trim() : '',
          qty: qty, buy: parseAmount(ed.querySelector('#svBuy').value) || 0,
          y: st.y, m: st.m, d: st.d, note: (ed.querySelector('#svNote').value || '').trim(),
          updatedAt: Date.now()
        };
        if (ex) { var i = sv.items.indexOf(ex); if (i >= 0) sv.items[i] = Object.assign({}, ex, rec); }
        else { rec.createdAt = Date.now(); sv.items.push(rec); }
        saveSavings(); closeSavingsEditor(); renderSavings();
      };
    }
    function openSavingsPriceEditor(G) {
      var ed = _savEditorShell('قیمت روز ' + escapeHtml(G.name),
        '<div class="sv-lbl">قیمت هر ' + escapeHtml(G.unit) + ' — تومان</div>' +
        '<input id="svPrice" class="sv-inp sv-num" type="text" inputmode="numeric" placeholder="قیمت امروز بازار" value="' + (G.price ? toPersianDigits(G.price.toLocaleString('en-US')) : '') + '">' +
        (G.priceAt ? '<div class="sv-hint">آخرین ثبت: ' + escapeHtml(_savAgo(G.priceAt)) + '</div>' : '') +
        '<div class="sv-hint">قیمت را از صرافی یا سایت‌های قیمت طلا و ارز بردارید؛ این بخش قیمت را خودکار نمی‌گیرد.</div>');
      var inp = ed.querySelector('#svPrice');
      _savMoneyInput(inp);
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
      ed.querySelector('.sv-ok').onclick = function () {
        var p = parseAmount(inp.value) || 0;
        var sv = loadSavings();
        if (p > 0) sv.prices[G.key] = { p: p, at: Date.now() }; else delete sv.prices[G.key];
        saveSavings(); closeSavingsEditor(); renderSavings();
      };
    }
    function _savAgo(ts) {
      var h = Math.floor((Date.now() - ts) / 3600000);
      if (h < 1) return 'کمتر از یک ساعت پیش';
      if (h < 24) return toPersianDigits(String(h)) + ' ساعت پیش';
      return toPersianDigits(String(Math.floor(h / 24))) + ' روز پیش';
    }
    function reminderRepeatLabel(r) {
      if (!r) return '';
      if (r.repeat === 'monthly') return 'ماهانه';
      if (r.repeat === 'yearly') return 'سالانه';
      return 'یک‌بار';
    }
    function reminderNextDue(r) {
      if (!r) return null;
      const t = getTodayPersian();
      let y = parseInt(r.y, 10) || t.y;
      let m = parseInt(r.m, 10) || t.m;
      let d = parseInt(r.d, 10) || 1;
      const maxD = daysInMonth(y, m);
      if (d > maxD) d = maxD;
      if (r.repeat === 'once') return { y: y, m: m, d: d };
      // ماهانه / سالانه: نزدیک‌ترین سررسید آینده (یا امروز)
      let guard = 0;
      while (guard < 30) {
        const max2 = daysInMonth(y, m);
        const dd = Math.min(d, max2);
        if (y > t.y || (y === t.y && m > t.m) || (y === t.y && m === t.m && dd >= t.d)) {
          return { y: y, m: m, d: dd };
        }
        if (r.repeat === 'monthly') {
          m += 1;
          if (m > 12) { m = 1; y += 1; }
        } else {
          y += 1;
        }
        guard++;
      }
      return { y: y, m: m, d: d };
    }
    function daysBetweenPersian(a, b) {
      // تقریبی بر اساس اختلاف ماه/روز شمسی
      if (!a || !b) return 9999;
      try {
        const ga = persianToDate(a.y, a.m, a.d), gb = persianToDate(b.y, b.m, b.d);
        if (ga && gb) return Math.round((gb - ga) / 86400000);
      } catch (eG) {}
      const toAbs = (p) => {
        let days = 0;
        for (let yy = 1400; yy < p.y; yy++) {
          days += ((yy % 4) === 3) ? 366 : 365;
        }
        for (let mm = 1; mm < p.m; mm++) days += daysInMonth(p.y, mm);
        days += p.d;
        return days;
      };
      return toAbs(b) - toAbs(a);
    }
    function formatReminderDue(due) {
      if (!due) return '—';
      const mon = (MONTHS && MONTHS[due.m - 1]) ? MONTHS[due.m - 1] : String(due.m);
      return toPersianDigits(due.d) + ' ' + mon + ' ' + toPersianDigits(due.y);
    }
    function renderUserRemindersList() {
      const box = document.getElementById('userRemindersList');
      if (!box) return;
      loadUserReminders();
      if (!userReminders.length) {
        box.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:0.85rem;text-align:center;">هنوز یادآوری ثبت نشده</div>';
        return;
      }
      const today = getTodayPersian();
      const sorted = userReminders.slice().map(function(r, i) {
        return { r: r, i: i, due: reminderNextDue(r) };
      }).sort(function(a, b) {
        return daysBetweenPersian(today, a.due) - daysBetweenPersian(today, b.due);
      });
      box.innerHTML = '';
      sorted.forEach(function(item) {
        const r = item.r;
        const due = item.due;
        const days = daysBetweenPersian(today, due);
        const adv = parseInt(r.advanceDays, 10) || 7;
        let badge = '';
        if (days < 0) badge = '<span class="ur-badge warn">گذشته</span>';
        else if (days === 0) badge = '<span class="ur-badge warn">امروز</span>';
        else if (days <= adv) badge = '<span class="ur-badge warn">' + toPersianDigits(days) + ' روز مانده</span>';
        else badge = '<span class="ur-badge">' + toPersianDigits(days) + ' روز مانده</span>';
        const el = document.createElement('div');
        el.className = 'ur-item';
        el.setAttribute('data-ur-id', r.id || '');
        /* ۱.۳.۷۷: موعدرسیده = نوار قرمز چرخان دور باکس، هر بار که پنجره باز می‌شود */
        if (days >= 0 && days <= adv) el.classList.add('hk-snake', 'ur-due');
        try { if (_remindFlash[String(r.id || r.title || 'r')]) el.classList.add('ur-alert'); } catch (eUA) {}
        /* ۱.۳.۷۸: باکس جمع‌وجور: اسم و برچسب روزهای مانده جلویش؛ زیرش سررسید و یادداشت؛ کنارش آیکون ویرایش و حذف */
        el.classList.add('ur-compact');
        el.innerHTML =
          '<div class="ur-main"><div class="ur-row1"><span class="ur-title">' + escapeHtml(r.title || 'بدون عنوان') + '</span>' + badge + '</div>' +
          '<div class="ur-meta">سررسید: ' + formatReminderDue(due) + ' · ' + reminderRepeatLabel(r) + '</div>' +
          (r.note ? '<div class="ur-note">' + escapeHtml(r.note) + '</div>' : '') + '</div>' +
          '<div class="ur-actions">' +
            '<button type="button" class="ur-edit" aria-label="ویرایش">' + HK_EDIT_SVG + '</button>' +
            '<button type="button" class="ur-del hk-del-x" aria-label="حذف">' + HK_DEL_X + '</button>' +
          '</div>';
        el.querySelector('.ur-edit').onclick = function() { openUserReminderEditor(r.id); };
        el.querySelector('.ur-del').onclick = function() {
          askConfirm('این یادآور حذف شود؟', function() {
            try { pushToTrash('reminder', r.title || 'یادآور', { sourceLabel: 'یادآور', reminder: JSON.parse(JSON.stringify(r)) }); } catch (eTr) {}
            userReminders = userReminders.filter(function(x) { return x.id !== r.id; });
            saveUserReminders();
            renderUserRemindersList();
            showToast('حذف شد');
          });
        };
        box.appendChild(el);
      });
    }
    function openUserReminderEditor(id) {
      const existing = id ? userReminders.find(function(x) { return x.id === id; }) : null;
      let dim = document.getElementById('urEditorDim');
      if (!dim) {
        dim = document.createElement('div');
        dim.id = 'urEditorDim';
        dim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:470;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);';
        document.body.appendChild(dim);
      }
      dim.style.display = 'block';
      let editor = document.getElementById('urEditor');
      if (editor) editor.remove();
      editor = document.createElement('div');
      editor.id = 'urEditor';
      editor.style.cssText = 'position:fixed;left:16px;right:16px;top:12%;z-index:480;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--card);box-shadow:0 12px 40px rgba(0,0,0,0.4);max-height:78vh;overflow-y:auto;font-family:Vazirmatn,Tahoma,sans-serif;';
      const t = getTodayPersian();
      const init = existing || { title: '', note: '', repeat: 'yearly', y: t.y, m: t.m, d: t.d, advanceDays: 7 };
      const monthsOpts = (MONTHS || []).map(function(name, i) {
        const v = i + 1;
        return '<option value="' + v + '"' + (parseInt(init.m, 10) === v ? ' selected' : '') + '>' + name + '</option>';
      }).join('');
      editor.innerHTML =
        '<div style="font-weight:800;font-size:1rem;margin-bottom:10px;">' + (existing ? 'ویرایش یادآور' : 'یادآور جدید') + '</div>' +
        '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px;">عنوان</div>' +
        '<input id="urTitle" type="text" value="' + escapeHtml(init.title || '') + '" placeholder="مثلاً بیمه شخص ثالث" style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:700;margin-bottom:8px;">' +
        '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px;">تاریخ سررسید</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:8px;align-items:stretch;">' +
          '<div id="urDayWrap" style="flex:0 0 72px;min-width:0;"></div>' +
          '<div id="urMonthWrap" style="flex:1.3;min-width:0;"></div>' +
          '<div id="urYearWrap" style="flex:0 0 88px;min-width:0;"></div>' +
        '</div>' +
        '<input type="hidden" id="urDay" value="' + String(init.d || 1) + '">' +
        '<input type="hidden" id="urYear" value="' + String(init.y || '') + '">' +
        '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px;">تکرار</div>' +
        '<div id="urRepeatWrap" style="width:100%;margin-bottom:8px;"></div>' +
        '<input type="hidden" id="urMonth" value="' + String(init.m || 1) + '">' +
        '<input type="hidden" id="urRepeat" value="' + escapeHtml(init.repeat || 'yearly') + '">' +
        '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px;">یادآوری چند روز قبل</div>' +
        '<input id="urAdvance" type="text" inputmode="numeric" value="' + escapeHtml(toPersianDigits(String(init.advanceDays != null ? init.advanceDays : 7))) + '" style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:#1b1b1b;color:var(--text);font-family:Vazirmatn,Tahoma,sans-serif;font-weight:700;margin-bottom:8px;text-align:center;">' +
        '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:6px;">یادداشت (اختیاری)</div>' +
        '<input id="urNote" type="text" value="' + escapeHtml(init.note || '') + '" placeholder="توضیح کوتاه" style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;margin-bottom:12px;">' +
        '<div style="display:flex;gap:8px;">' +
          '<button type="button" id="urOk" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">ثبت</button>' +
          '<button type="button" id="urCancel" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button>' +
        '</div>';
      document.body.appendChild(editor);
      /* منوهای سفارشی ماه و تکرار — هماهنگ با نرم‌افزار */
      try {
        var dayOpts = [];
        for (var di = 1; di <= 31; di++) {
          dayOpts.push({ value: di, label: toPersianDigits(String(di)) });
        }
        var ds = createDarkSelect({
          id: 'urDaySelect',
          options: dayOpts,
          value: parseInt(init.d, 10) || 1,
          onChange: function(v) {
            var h = editor.querySelector('#urDay');
            if (h) h.value = v;
          }
        });
        var dw = editor.querySelector('#urDayWrap');
        if (dw) { dw.innerHTML = ''; dw.appendChild(ds); }

        var monthOpts2 = (MONTHS || []).map(function(name, i) { return { value: i + 1, label: name }; });
        var ms = createDarkSelect({
          id: 'urMonthSelect',
          options: monthOpts2,
          value: parseInt(init.m, 10) || 1,
          onChange: function(v) {
            var h = editor.querySelector('#urMonth');
            if (h) h.value = v;
          }
        });
        var mw = editor.querySelector('#urMonthWrap');
        if (mw) { mw.innerHTML = ''; mw.appendChild(ms); }

        var ty = getTodayPersian();
        var baseY = parseInt(init.y, 10) || ty.y;
        var yearOpts = [];
        for (var yi = baseY - 2; yi <= baseY + 12; yi++) {
          yearOpts.push({ value: yi, label: toPersianDigits(String(yi)) });
        }
        var ys = createDarkSelect({
          id: 'urYearSelect',
          options: yearOpts,
          value: baseY,
          onChange: function(v) {
            var h = editor.querySelector('#urYear');
            if (h) h.value = v;
          }
        });
        var yw = editor.querySelector('#urYearWrap');
        if (yw) { yw.innerHTML = ''; yw.appendChild(ys); }

        var repOpts = [
          { value: 'once', label: 'یک‌بار' },
          { value: 'monthly', label: 'ماهانه' },
          { value: 'yearly', label: 'سالانه' }
        ];
        var rs = createDarkSelect({
          id: 'urRepeatSelect',
          options: repOpts,
          value: init.repeat || 'yearly',
          onChange: function(v) {
            var h = editor.querySelector('#urRepeat');
            if (h) h.value = v;
          }
        });
        var rw = editor.querySelector('#urRepeatWrap');
        if (rw) { rw.innerHTML = ''; rw.appendChild(rs); }
      } catch (eSel) {}
      function bindPersianNumInput(el) {
        if (!el || el._urBound) return;
        el._urBound = true;
        el.addEventListener('input', function() {
          var digits = toEnglishDigits(el.value || '').replace(/[^0-9]/g, '');
          el.value = digits ? toPersianDigits(digits) : '';
        });
      }
      bindPersianNumInput(editor.querySelector('#urAdvance'));
      const closeEd = function() {
        try { editor.remove(); } catch (e) {}
        const d = document.getElementById('urEditorDim');
        if (d) d.style.display = 'none';
      };
      dim.onclick = closeEd;
      editor.querySelector('#urCancel').onclick = function(e) { e.stopPropagation(); closeEd(); };
      editor.querySelector('#urOk').onclick = function(e) {
        e.stopPropagation();
        const title = (editor.querySelector('#urTitle').value || '').trim();
        if (!title) { showToast('عنوان را وارد کنید'); return; }
        let d = parseInt(toEnglishDigits(editor.querySelector('#urDay').value || ''), 10) || 0;
        let m = parseInt(toEnglishDigits(String(editor.querySelector('#urMonth').value || '')), 10) || 1;
        let y = parseInt(toEnglishDigits(editor.querySelector('#urYear').value || ''), 10) || 0;
        if (y > 0 && y < 100) y += 1400;
        if (!d || !m || !y) { showToast('تاریخ سررسید را کامل وارد کنید'); return; }
        const maxD = daysInMonth(y, m);
        if (d > maxD) d = maxD;
        if (d < 1) d = 1;
        let adv = parseInt(toEnglishDigits(editor.querySelector('#urAdvance').value || ''), 10);
        if (!adv || adv < 0) adv = 7;
        if (adv > 90) adv = 90;
        const repeat = editor.querySelector('#urRepeat').value || 'once';
        const note = (editor.querySelector('#urNote').value || '').trim();
        if (existing) {
          existing.title = title;
          existing.d = d; existing.m = m; existing.y = y;
          existing.repeat = repeat;
          existing.advanceDays = adv;
          existing.note = note;
        } else {
          userReminders.push({
            id: 'ur_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            title: title,
            d: d, m: m, y: y,
            repeat: repeat,
            advanceDays: adv,
            note: note,
            lastNotified: ''
          });
        }
        saveUserReminders();
        try { (window._remindDismissed = window._remindDismissed || {}).user = false; } catch (eD) {}
        closeEd();
        renderUserRemindersList();
        showToast(existing ? 'ذخیره شد' : 'یادآور اضافه شد');
        try { checkUserReminders(true); } catch (e2) {}
      };
      setTimeout(function() {
        try { editor.querySelector('#urTitle').focus(); } catch (e) {}
      }, 80);
    }
    function getUserRemindDueSoon() {
      loadUserReminders();
      const today = getTodayPersian();
      const list = [];
      (userReminders || []).forEach(function(r) {
        const due = reminderNextDue(r);
        const days = daysBetweenPersian(today, due);
        const advN = parseInt(r.advanceDays, 10);
        const adv = isNaN(advN) ? 7 : Math.max(0, advN);  /* «همان روز» (۰) قبلاً ۷ روز حساب می‌شد */
        if (days >= 0 && days <= adv) {
          list.push({ r: r, days: days, due: due });
        }
      });
      list.sort(function(a, b) { return a.days - b.days; });
      return list;
    }
    /* بسته شدن باکس‌ها فقط تا خروج از نرم‌افزار معتبر است؛ با ورود دوباره اگر موعدشان باشد دوباره نمایش داده می‌شوند */
    window._remindDismissed = window._remindDismissed || { install: false, user: false };
    function isUserRemindHomeDismissed() {
      return !!(window._remindDismissed && window._remindDismissed.user);
    }

    /* بستن باکس‌ها با کشیدن به چپ/راست (مستقل از هم) + بالا آمدن نرم محتوای زیر */
    var _REMIND_BAR_PROPS = ['height', 'min-height', 'max-height', 'margin-top', 'margin-bottom',
      'padding-top', 'padding-bottom', 'overflow', 'transition', 'transform', 'opacity', 'pointer-events'];
    function resetRemindBarInline(bar) {
      if (!bar) return;
      _REMIND_BAR_PROPS.forEach(function (pn) { try { bar.style.removeProperty(pn); } catch (e) {} });
      bar._dismissing = false;
    }
    function collapseRemindBar(bar, kind, dir, onDone) {
      if (!bar || bar._dismissing) return;
      bar._dismissing = true;
      window._remindDismissed = window._remindDismissed || { install: false, user: false };
      window._remindDismissed[kind] = true;
      var w = bar.getBoundingClientRect().width || 300;
      var imp = function (el, pn, v) { el.style.setProperty(pn, v, 'important'); };
      var inChrome = !!(bar.closest && bar.closest('#stickyChrome'));
      /* ۱) پرواز به کنار */
      void bar.offsetWidth; /* موقعیت فعلی (حین کشیدن) را ثبت کن */
      imp(bar, 'transition', 'transform 0.26s cubic-bezier(.2,.7,.4,1), opacity 0.26s ease-out');
      imp(bar, 'transform', 'translateX(' + (dir * (w + 40)) + 'px)');
      imp(bar, 'opacity', '0');
      imp(bar, 'pointer-events', 'none');
      setTimeout(function () {
        var ease = 'cubic-bezier(.4,0,.2,1)', dur = 0.34;
        if (!inChrome) {
          /* ۲-الف) باکس داخل صفحهٔ خانه: عناصر زیرش را فقط با transform (GPU) بالا می‌بریم؛
             فاصلهٔ gap و margin هم در مسافت حساب می‌شود تا در پایان هیچ پرشی نباشد */
          var cs = getComputedStyle(bar), parent = bar.parentNode;
          var pcs = parent ? getComputedStyle(parent) : null;
          var gap = (pcs && /flex|grid/.test(pcs.display)) ? (parseFloat(pcs.rowGap) || 0) : 0;
          var dist = bar.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0) + gap;
          var sibs = [];
          for (var n = bar.nextElementSibling; n; n = n.nextElementSibling) {
            var ncs = getComputedStyle(n);
            if (ncs.display === 'none' || ncs.position === 'fixed' || ncs.position === 'absolute') continue;
            sibs.push(n);
          }
          sibs.forEach(function (n) {
            n.style.willChange = 'transform';
            n.style.transition = 'transform ' + dur + 's ' + ease;
          });
          void bar.offsetHeight;
          sibs.forEach(function (n) { n.style.transform = 'translate3d(0,' + (-dist) + 'px,0)'; });
          setTimeout(function () {
            /* هم‌زمان: حذف باکس از جریان صفحه و برداشتن transform‌ها → بدون پرش */
            bar.style.display = 'none';
            try { bar.classList.remove('open'); bar.classList.remove('open-overlay'); } catch (e) {}
            sibs.forEach(function (n) {
              n.style.transition = 'none';
              n.style.transform = '';
              n.style.willChange = '';
            });
            void (sibs[0] && sibs[0].offsetHeight);
            sibs.forEach(function (n) { n.style.transition = ''; });
            resetRemindBarInline(bar);
            try { if (onDone) onDone(); } catch (e) {}
          }, dur * 1000 + 40);
          return;
        }
        /* ۲-ب) باکس داخل sticky-chrome (اقساط): جمع شدن ارتفاع؛ صفحه با همان سرعت بالا می‌آید */
        var cs2 = getComputedStyle(bar);
        var h = bar.offsetHeight;
        imp(bar, 'overflow', 'hidden');
        imp(bar, 'transition', 'none');
        imp(bar, 'height', h + 'px'); imp(bar, 'min-height', h + 'px'); imp(bar, 'max-height', h + 'px');
        imp(bar, 'margin-top', cs2.marginTop); imp(bar, 'margin-bottom', cs2.marginBottom);
        void bar.offsetHeight; /* reflow */
        imp(bar, 'transition', ['height', 'min-height', 'max-height', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom']
          .map(function (pn) { return pn + ' ' + dur + 's ' + ease; }).join(', '));
        imp(bar, 'height', '0px'); imp(bar, 'min-height', '0px'); imp(bar, 'max-height', '0px');
        imp(bar, 'margin-top', '0px'); imp(bar, 'margin-bottom', '0px');
        imp(bar, 'padding-top', '0px'); imp(bar, 'padding-bottom', '0px');
        var t0 = Date.now();
        (function tick() {
          try { syncChromeHeight(); } catch (e) {}
          if (Date.now() - t0 < 380) requestAnimationFrame(tick);
        })();
        setTimeout(function () {
          bar.style.display = 'none';
          try { bar.classList.remove('open'); bar.classList.remove('open-overlay'); } catch (e) {}
          resetRemindBarInline(bar);
          try { if (onDone) onDone(); } catch (e) {}
          try { syncChromeHeight(); } catch (e) {}
        }, 390);
      }, 270);
    }
    window.collapseRemindBar = collapseRemindBar;

    function bindBarSwipeDismiss(barId, kind) {
      var flag = '_swipeBound_' + barId;
      if (window[flag]) return;
      window[flag] = true;
      var startX = 0, startY = 0, dx = 0, active = false, decided = false;
      function barEl() { return document.getElementById(barId); }
      function usable(bar) {
        return bar && bar.style.display !== 'none' && !bar._dismissing &&
          !bar.classList.contains('open') && !bar.classList.contains('open-overlay');
      }
      function onStart(e) {
        var bar = barEl();
        if (!usable(bar)) return;
        var t = e.touches && e.touches[0];
        if (!t) return;
        startX = t.clientX; startY = t.clientY; dx = 0; active = true; decided = false;
        bar.classList.add('ur-swiping');
        bar.style.setProperty('transition', 'none', 'important');
      }
      function reset(bar) {
        if (!bar) return;
        bar.classList.remove('ur-swiping');
        if (!bar._dismissing) {
          bar.style.removeProperty('transition');
          bar.style.removeProperty('transform');
          bar.style.removeProperty('opacity');
        }
      }
      function onMove(e) {
        if (!active) return;
        var bar = barEl();
        if (!bar) return;
        var t = e.touches && e.touches[0];
        if (!t) return;
        var x = t.clientX - startX, y = t.clientY - startY;
        if (!decided) {
          if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
          if (Math.abs(y) > Math.abs(x)) { active = false; reset(bar); return; }
          decided = true;
        }
        dx = x;
        try { e.preventDefault(); } catch (eP) {}
        bar.style.setProperty('transform', 'translateX(' + dx + 'px)', 'important');
        bar.style.setProperty('opacity', String(Math.max(0.25, 1 - Math.abs(dx) / 220)), 'important');
      }
      function onEnd() {
        var bar = barEl();
        if (!active) { return; }
        active = false;
        if (!bar) return;
        if (!decided) { reset(bar); return; }
        bar.classList.remove('ur-swiping');
        var w = bar.getBoundingClientRect().width || 300;
        if (Math.abs(dx) > w * 0.38 || Math.abs(dx) > 110) {
          var dir = dx > 0 ? 1 : -1;
          /* transform/opacity فعلیِ حین کشیدن دست‌نخورده می‌ماند تا باکس از همان نقطه به مسیرش ادامه دهد (بدون برگشت به عقب) */
          collapseRemindBar(bar, kind, dir, function () {
            if (kind === 'user') {
              try {
                var bd = document.getElementById('remindBackdrop');
                var rb = document.getElementById('remindBar');
                var installOpen = rb && (rb.classList.contains('open') || rb.classList.contains('open-overlay'));
                if (bd && !installOpen) bd.classList.remove('open');
              } catch (eBd) {}
            }
          });
        } else {
          bar.style.setProperty('transition', 'transform 0.2s ease-out, opacity 0.2s ease-out', 'important');
          bar.style.setProperty('transform', 'translateX(0)', 'important');
          bar.style.setProperty('opacity', '1', 'important');
          setTimeout(function () { reset(bar); }, 220);
        }
        dx = 0; decided = false;
      }
      document.addEventListener('touchstart', function (e) {
        var bar = barEl();
        if (!usable(bar)) return;
        if (e.target && bar.contains(e.target)) onStart(e);
      }, { passive: true, capture: true });
      document.addEventListener('touchmove', function (e) { if (active) onMove(e); }, { passive: false, capture: true });
      document.addEventListener('touchend', onEnd, { passive: true, capture: true });
      document.addEventListener('touchcancel', onEnd, { passive: true, capture: true });
    }
    function bindUserRemindSwipe() {
      bindBarSwipeDismiss('userRemindBar', 'user');
      bindBarSwipeDismiss('remindBar', 'install');
    }
    try { bindUserRemindSwipe(); } catch (eSw) {}

    /* ورود دوباره به نرم‌افزار: هر دو باکس (اگر موعدشان باشد) دوباره ظاهر شوند */
    function resetRemindDismissals() {
      window._remindDismissed = { install: false, user: false };
      ['remindBar', 'userRemindBar'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) resetRemindBarInline(b);
      });
      try { checkInstallReminders(); } catch (e1) {}
      try { renderUserRemindHomeBar(); } catch (e2) {}
      try { syncChromeHeight(); } catch (e3) {}
    }
    (function () {
      var hiddenAt = 0;
      function goneAway() { if (!hiddenAt) hiddenAt = Date.now(); }
      function cameBack() {
        var away = hiddenAt ? (Date.now() - hiddenAt) : 0;
        hiddenAt = 0;
        if (away >= 3000) resetRemindDismissals();
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) goneAway(); else cameBack();
      });
      try {
        var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
        if (CapApp && typeof CapApp.addListener === 'function') {
          CapApp.addListener('appStateChange', function (st) {
            if (st && st.isActive) cameBack(); else goneAway();
          });
        }
      } catch (eCap) {}
    })();

    function dismissUserRemindBar(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      try {
        window._remindDismissed = window._remindDismissed || { install: false, user: false };
        window._remindDismissed.user = true;
      } catch (e) {}
      const bar = document.getElementById('userRemindBar');
      if (bar) {
        bar.style.display = 'none';
        bar.classList.remove('open');
        bar.classList.remove('open-overlay');
      }
      try {
        const bd = document.getElementById('remindBackdrop');
        const rb = document.getElementById('remindBar');
        const installOpen = rb && (rb.classList.contains('open') || rb.classList.contains('open-overlay'));
        if (bd && !installOpen) bd.classList.remove('open');
      } catch (eBd) {}
      try { syncChromeHeight(); } catch (e2) {}
    }
    function closeUserRemindBar() {
      try {
        const bar = document.getElementById('userRemindBar');
        const bd = document.getElementById('remindBackdrop');
        if (bar) {
          bar.classList.remove('open');
          bar.classList.remove('open-overlay');
        }
        /* فقط اگر اقساط باز نیست بک‌دراپ را ببند */
        const rb = document.getElementById('remindBar');
        const installOpen = rb && (rb.classList.contains('open') || rb.classList.contains('open-overlay'));
        if (bd && !installOpen) bd.classList.remove('open');
        try { syncChromeHeight(); } catch (e) {}
      } catch (e) {}
    }
    function toggleUserRemindBar(ev) {
      if (ev && ev.target && ev.target.closest && ev.target.closest('.ur-dismiss')) return;
      const bar = document.getElementById('userRemindBar');
      if (!bar || bar.style.display === 'none') return;
      const willOpen = !bar.classList.contains('open') && !bar.classList.contains('open-overlay');
      if (willOpen) {
        try { syncChromeHeight(); } catch (e) {}
        bar.classList.add('open');
        bar.classList.add('open-overlay');
        const bd = document.getElementById('remindBackdrop');
        if (bd) bd.classList.add('open');
      } else {
        closeUserRemindBar();
      }
    }
    function renderUserRemindHomeBar() {
      const bar = document.getElementById('userRemindBar');
      const body = document.getElementById('userRemindBanner');
      if (!bar || !body) return;
      if (bar._dismissing) return; /* در حال انیمیشن بسته شدن */
      const dueSoon = getUserRemindDueSoon();
      if (!dueSoon.length || isUserRemindHomeDismissed()) {
        bar.style.display = 'none';
        bar.classList.remove('open');
        bar.classList.remove('open-overlay');
        try { syncChromeHeight(); } catch (e) {}
        return;
      }
      bar.style.display = '';
      body.innerHTML = '';
      dueSoon.forEach(function(x) {
        const row = document.createElement('div');
        row.className = 'user-remind-row';
        row.setAttribute('data-ur-id', x.r.id || '');
        const when = x.days === 0 ? 'امروز' : (toPersianDigits(x.days) + ' روز مانده');
        row.innerHTML =
          '<div class="ur-rt">' + escapeHtml(x.r.title || 'یادآور') + '</div>' +
          '<div class="ur-rm">' + when + ' · سررسید ' + formatReminderDue(x.due) +
          (x.r.note ? (' — ' + escapeHtml(x.r.note)) : '') + '</div>';
        body.appendChild(row);
      });
      try { syncChromeHeight(); } catch (e) {}
    }
    function openUserReminderFromHome(id) {
      try {
        openUserRemindersModal();
        setTimeout(function() {
          try {
            if (id) openUserReminderEditor(id);
          } catch (e) {}
        }, 180);
      } catch (e) {
        try { openUserRemindersModal(); } catch (e2) {}
      }
    }
    function checkUserReminders(silent) {
      loadUserReminders();
      if (!userReminders.length) {
        renderUserRemindHomeBar();
        return;
      }
      const today = getTodayPersian();
      const todayKey = today.y + '-' + today.m + '-' + today.d;
      let changed = false;
      const dueSoon = getUserRemindDueSoon();
      dueSoon.forEach(function(x) {
        if (x.r.lastNotified !== todayKey) {
          x.r.lastNotified = todayKey;
          changed = true;
        }
      });
      if (changed) saveUserReminders();
      renderUserRemindHomeBar();
      if (silent) return;
      if (!dueSoon.length) return;
      if (dueSoon.length === 1) {
        const x = dueSoon[0];
        const when = x.days === 0 ? 'امروز' : (toPersianDigits(x.days) + ' روز دیگر');
        showToast('یادآور: ' + (x.r.title || '') + ' — ' + when);
      } else {
        showToast(toPersianDigits(dueSoon.length) + ' یادآور نزدیک است');
      }
    }

    /* —— درآمدهای ثابت —— */
    let recurringIncomes = [];
    function loadRecurring() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_recurring');
        if (raw) recurringIncomes = JSON.parse(raw) || [];
      } catch (e) { recurringIncomes = []; }
      try { if (migrateRecurringItems()) hkStorageSet(STORAGE_KEY + '_recurring', JSON.stringify(recurringIncomes)); } catch (e) {}
    }
    function saveRecurring() {
      var ok = hkStorageSet(STORAGE_KEY + '_recurring', JSON.stringify(recurringIncomes));
      try { scheduleSharedSync(); } catch (e) {}
      return ok;
    }
    let recurringCollapsed = false;
    try { recurringCollapsed = localStorage.getItem('hesabRecCollapsed') === '1'; } catch (e) {}

    let recurringSelectMode = false;
    let recurringSelected = new Set(); // indices in recurringIncomes
    const recExpanded = new Set(); // شناسهٔ درآمدهای ثابتِ باز در فهرست؛ با خروج از منو همه بسته می‌شوند

    function clearRecurringSelection() {
      recurringSelectMode = false;
      recurringSelected = new Set();
      try { document.body.classList.remove('rec-selecting'); } catch (e) {}
      try {
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
      } catch (e) {}
    }

    function toggleRecurringSelect(idx) {
      return; // انتخاب دسته‌ای حذف شد
    }

    function enterRecurringSelect(idx) {
      return; // انتخاب دسته‌ای حذف شد
    }

    function sectionHasRecurringIncome(sec, rec) {
      const rid = rec && rec.id;
      if (!rid) return false;
      return (sec.rows || []).some(row => row && row.fromRecurringId === rid);
    }

    /* —— درآمد ثابت: ساخت ماه‌به‌ماه ——
       ردیف هر ماه فقط وقتی آن ماه برسد (یا نرم‌افزار باز شود) ساخته می‌شود: از ماه شروع قرارداد یا ماهی که تعریف ساخته شد
       (هرکدام دیرتر) تا ماه پایان قرارداد (اگر باشد). ماه‌های گذشته ساخته نمی‌شوند و ردیف‌های دریافت‌شده دست نمی‌خورند.
       اتصال ردیف به تعریف فقط با fromRecurringId است.
       item.fromKey = ماه ساخت تعریف، item.genKey = آخرین ماهی که ردیفش ساخته شد، item.paidAhead = ماه‌هایی که پیش‌دریافت شده‌اند */
    function recMonthKey(y, m) { return (parseInt(y, 10) || 0) * 100 + (parseInt(m, 10) || 0); }
    function recTodayKey() { var t = getTodayPersian(); return recMonthKey(t.y, t.m); }
    function recNextKey(k) { var y = Math.floor(k / 100), m = k % 100 + 1; if (m > 12) { m = 1; y++; } return y * 100 + m; }
    function recPrevKey(k) { var y = Math.floor(k / 100), m = k % 100 - 1; if (m < 1) { m = 12; y--; } return y * 100 + m; }
    function recStartKey(item) { return (item && item.contractStart && item.contractStart.y && item.contractStart.m) ? recMonthKey(item.contractStart.y, item.contractStart.m) : 0; }
    function recEndKey(item) { return (item && item.contractEnd && item.contractEnd.y && item.contractEnd.m) ? recMonthKey(item.contractEnd.y, item.contractEnd.m) : 0; }
    function recFirstKey(item) { var s = recStartKey(item); if (s && item.payTiming === 'end') s = recNextKey(s); return s ? Math.max(s, parseInt(item.fromKey, 10) || 0) : 0; }
    function recInRange(item, k) { var f = recFirstKey(item); if (!f || k < f) return false; var e = recEndKey(item); return !e || k <= e; }
    function recMonthLen(m) { return m <= 6 ? 31 : (m === 12 ? 29 : 30); }
    function recDayFor(item, k) {
      var d = parseInt(toEnglishDigits(String((item && (item.day || (item.contractStart && item.contractStart.d))) || '')), 10) || 0;
      if (!d) return '';
      return String(Math.min(d, recMonthLen(k % 100)));
    }
    function recKeyLabel(k) { return (MONTHS[(k % 100) - 1] || '') + ' ' + toPersianDigits(String(Math.floor(k / 100))); }
    /* شمارهٔ روز تقریبی برای فاصلهٔ دو تاریخ شمسی (کبیسه نادیده) */
    function recDayIndex(y, m, d) { y = parseInt(y, 10) || 0; m = parseInt(m, 10) || 1; d = parseInt(d, 10) || 1; return y * 365 + (m <= 6 ? (m - 1) * 31 : 186 + (m - 7) * 30) + d; }

    /* همهٔ ماه‌های موجود: ماه نمایش‌داده‌شده از periodData (زنده) و بقیه از آرشیو */
    function recEachMonth(fn) {
      var curK = recMonthKey(currentYear, currentMonth);
      fn(curK, periodData);
      Object.keys(archive || {}).forEach(function (k) {
        var p = String(k).split('-');
        var kk = recMonthKey(p[0], p[1]);
        if (!kk || kk === curK || !archive[k]) return;
        fn(kk, archive[k]);
      });
    }
    function recRowsOf(item) {
      var out = [], rid = item && item.id;
      if (!rid) return out;
      recEachMonth(function (k, pd) {
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (row) {
            if (row && row.fromRecurringId === rid && !row.recForKey) out.push({ key: k, pd: pd, sec: sec, row: row });
          });
        });
      });
      return out;
    }
    function recIsPaid(row) { return !!row && row.status === 'paid'; }
    function recPersist() {
      try { persistCurrent(); } catch (e) {}
      try { saveArchive(); } catch (e) {}
      try { scheduleSave(); } catch (e) {}
    }
    function recHeaderTemplateBefore(k) {
      var best = null, bestScore = -1;
      Object.keys(archive || {}).forEach(function (key) {
        var p = String(key).split('-');
        var s = recMonthKey(p[0], p[1]);
        if (!s || s >= k || s <= bestScore) return;
        var pd = archive[key];
        if (pd && ['expense', 'income'].some(function (t) { return ((pd[t] && pd[t].sections) || []).some(function (x) { return (x.title || '').trim(); }); })) { best = pd; bestScore = s; }
      });
      return best;
    }
    function recMonthData(k, create) {
      var y = Math.floor(k / 100), m = k % 100;
      if (y === currentYear && m === currentMonth) return periodData;
      var key = periodKey(y, m);
      if (archive[key]) return archive[key];
      if (!create) return null;
      var tmpl = recHeaderTemplateBefore(k);
      var pd = tmpl ? cloneHeadersOnly(tmpl) : emptyPeriodData();
      archive[key] = pd;
      return pd;
    }
    function recSectionIn(pd, item, create) {
      if (!pd) return null;
      if (!pd.income) pd.income = { sections: [], nextId: 1 };
      if (!Array.isArray(pd.income.sections)) pd.income.sections = [];
      var secs = pd.income.sections;
      var title = (item.sectionTitle || '').trim();
      var sec = title ? secs.find(function (s) { return (s.title || '').trim() === title; }) : null;
      if (!sec && item.sectionId) sec = secs.find(function (s) { return s.id === item.sectionId && (!title || !(s.title || '').trim()); }) || null;
      if (!sec && create && title) {
        var n = parseInt(pd.income.nextId, 10) || (secs.length + 1);
        while (secs.some(function (s) { return s.id === 's' + n; })) n++;
        sec = { id: 's' + n, title: title, color: tabAccentColor('income'), collapsed: true, rows: [] };
        secs.push(sec);
        pd.income.nextId = n + 1;
      }
      return sec;
    }
    function recSortRows(sec) {
      sec.rows = (sec.rows || []).map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
        var da = parseInt(String((a.r && a.r.day) || ''), 10) || 0, db = parseInt(String((b.r && b.r.day) || ''), 10) || 0;
        if (!da && !db) return a.i - b.i;
        if (!da) return 1;
        if (!db) return -1;
        return da !== db ? da - db : a.i - b.i;
      }).map(function (x) { return x.r; });
    }
    function recPlaceRow(sec, row) {
      if (!Array.isArray(sec.rows)) sec.rows = [];
      var ei = sec.rows.findIndex(function (r) { return r && !r.desc && !r.amount && !r.day && !r.fromPlanId && !r.fromRecurringId; });
      if (ei >= 0) sec.rows[ei] = row; else sec.rows.push(row);
      recSortRows(sec);
    }
    function recNewRow(item, k) {
      return Object.assign(emptyRow('income'), {
        day: recDayFor(item, k),
        desc: item.name || '',
        amount: Number(item.amount) || 0,
        status: 'unpaid',
        account: item.account || '',
        fromRecurringId: item.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    /* واریزهای ثبت‌شدهٔ همین ماه که شاید مربوط به این تعریف باشند (همان حساب، مبلغ ±۵٪، روز تا ۷ روز با سررسید،
       به هیچ تعریفی وصل نیستند). هیچ‌وقت خودکار وصل نمی‌شوند؛ فقط به کاربر پیشنهاد می‌شوند. */
    function recLiveItem(id) {
      return (recurringIncomes || []).find(function (x) { return x && x.id === id && !x.deletedAt; }) || null;
    }
    function recLinkCandidates(pd, item, k, opts) {
      var amt = Number(item.amount) || 0, out = [];
      if (!amt || !pd || !pd.income) return out;
      var acc = (item.account || '').trim();
      var due = parseInt(recDayFor(item, k), 10) || 0;
      (pd.income.sections || []).forEach(function (sec) {
        (sec.rows || []).forEach(function (r) {
          if (!r || r.deletedAt || r.fromPlanId || !recIsPaid(r)) return;
          /* وصل به قرارداد موجود = پیشنهاد نمی‌شود؛ وصل به قرارداد حذف‌شده = آزاد */
          if (r.fromRecurringId && recLiveItem(r.fromRecurringId)) return;
          var a = Number(r.amount) || 0;
          if (!a || Math.abs(a - amt) > amt * 0.05) return;
          if (acc && (r.account || '').trim() !== acc) return;
          var d = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0;
          if (!(opts && opts.anyDay) && due && d && Math.abs(d - due) > 7) return;
          out.push({ row: r, sec: sec, score: (due && d) ? Math.abs(d - due) : 8 });
        });
      });
      out.sort(function (x, y) { return x.score - y.score; });
      return out;
    }
    /* «۶ فروردین ۱۴۰۵ — مبلغ — بانک — «شرح»» (سال کنار روز و ماه) */
    /* ۱.۳.۵۵: «اسم قرارداد _ معوقه ۲۰ مهر» / «اسم قرارداد _ پیش‌پرداخت ۱ آبان» (تاریخ سررسید) */
    function recOtherDueDesc(item, k, kind) {
      var d = recDayFor(item, k);
      return (item.name || '') + ' _ ' + (kind === 'late' ? 'معوقه ' : 'پیش‌پرداخت ') + (d ? toPersianDigits(String(d)) + ' ' : '') + (MONTHS[(k % 100) - 1] || '');
    }
    /* ۱.۳.۵۶: برچسب فقط وقتی ماه واریز نه ماه «بابت» است نه ماه سررسید (برای هر دو نوع قرارداد) */
    function recLabelFor(item, dueK, payK) {
      var bab = recTiming(item) === 'end' ? recPrevKey(dueK) : dueK;
      if (payK === bab || payK === dueK) return '';
      return payK > dueK ? 'late' : 'ahead';
    }
    function recDueDesc(item, dueK, payK) { var l = recLabelFor(item, dueK, payK); return l ? recOtherDueDesc(item, dueK, l) : (item.name || ''); }
    /* شرحی که خود نرم‌افزار گذاشته (اسم قرارداد، «اسم _ معوقه …»، «اسم (پیش‌دریافت …)») — شرح نوشتهٔ کاربر دست نمی‌خورد */
    function recIsAutoDesc(item, desc) {
      var d = String(desc || '').trim(), n = String((item && item.name) || '').trim();
      if (!d) return true;
      if (!n) return false;
      return d === n || d.indexOf(n + ' _ معوقه') === 0 || d.indexOf(n + ' _ پیش‌پرداخت') === 0 || d.indexOf(n + ' (پیش‌دریافت') === 0;
    }
    function recRowLabel(r, k) {
      return (r.day ? toPersianDigits(String(r.day)) + ' ' : '') + (MONTHS[(k % 100) - 1] || '') + ' ' + toPersianDigits(String(Math.floor(k / 100))) + ' — ' + formatNum(Number(r.amount) || 0) +
        (r.account ? ' — ' + r.account : '') + (r.desc ? ' — «' + r.desc + '»' : '');
    }
    /* پنجرهٔ انتخاب یکی از چند گزینه؛ onPick(value) — value=null یعنی بستن بدون انتخاب */
    function recPickModal(title, options, onPick) {
      var old = document.getElementById('recPickModal'); if (old) old.remove();
      var ov = document.createElement('div');
      ov.id = 'recPickModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100400;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
      var box = document.createElement('div');
      box.style.cssText = 'width:100%;max-width:420px;max-height:80vh;overflow:auto;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 12px 32px var(--shadow);direction:rtl;';
      var h = document.createElement('div');
      h.style.cssText = 'font-weight:800;font-size:0.9rem;line-height:1.7;margin-bottom:10px;text-align:center;color:var(--text);';
      h.textContent = title;
      box.appendChild(h);
      var done = false;
      var finish = function (v) { if (done) return; done = true; ov.remove(); try { onPick(v); } catch (e) {} };
      /* دو گزینهٔ کوتاه (بلی/خیر): کنار هم */
      var inlineRow = options.length === 2 && options.every(function (o) { return o.short; }) ? document.createElement('div') : null;
      if (inlineRow) { inlineRow.style.cssText = 'display:flex;gap:8px;'; box.appendChild(inlineRow); }
      options.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rec-pick-opt';
        b.textContent = o.label;
        b.style.cssText = 'display:block;width:100%;margin:0 0 8px;padding:10px;border-radius:10px;border:1px solid ' + (o.primary ? 'var(--accent)' : 'var(--border)') + ';background:' + (o.primary ? 'var(--accent)' : 'var(--bg3)') + ';color:' + (o.primary ? '#fff' : 'var(--text)') + ';font-family:inherit;font-weight:700;font-size:0.84rem;text-align:' + (o.value == null ? 'center' : 'right') + ';line-height:1.6;cursor:pointer;';
        b.onclick = function () { finish(o.value); };
        if (inlineRow) { b.style.flex = '1 1 0'; b.style.margin = '0'; b.style.textAlign = 'center'; inlineRow.appendChild(b); }
        else box.appendChild(b);
      });
      ov.appendChild(box);
      ov._hkCancel = function () { finish(null); };
      ov.addEventListener('click', function (e) { if (e.target === ov) finish(null); });
      document.body.appendChild(ov);
      return ov;
    }
    function recFreeRows(item) {
      var rid = item && item.id;
      if (!rid) return 0;
      var n = 0;
      recEachMonth(function (k, pd) {
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (r && r.fromRecurringId === rid) { delete r.fromRecurringId; delete r.recLinked; delete r.recForKey; r.updatedAt = Date.now(); n++; }
          });
        });
      });
      if (n) recPersist();
      return n;
    }
    function recLinkRow(item, row) {
      row.fromRecurringId = item.id;
      row.recLinked = true;
      /* واریز بی‌شرح (مثلاً از پیامک) اسم همان درآمد ثابت را می‌گیرد */
      if (!(row.desc || '').trim() && (item.name || '').trim()) row.desc = item.name.trim();
      row.updatedAt = Date.now();
    }
    /* یک‌بار پس از هر اجرا: واریزهایی که قبلاً به درآمد ثابتی وصل شده‌اند و شرح ندارند، اسم همان درآمد ثابت را می‌گیرند */
    function hkRecDescMigrate() {
      try {
        var changed = false;
        recEachMonth(function (k, pd) {
          ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || !r.fromRecurringId || (r.desc || '').trim()) return;
              if (!(Number(r.amount) > 0) || !recIsPaid(r)) return;
              var it = recLiveItem(r.fromRecurringId);
              if (it && (it.name || '').trim()) { r.desc = it.name.trim(); r.updatedAt = Date.now(); changed = true; }
            });
          });
        });
        if (changed) { recPersist(); try { renderAll(); } catch (eR) {} }
      } catch (e) {}
    }
    setTimeout(hkRecDescMigrate, 1800);
    /* ردیف این ماه برای یک تعریف (اگر لازم است): اگر واریز مشابهی ثبت شده، از کاربر می‌پرسد؛ پیش‌فرض ساخت ردیف «دریافت نشده» */
    function recOfferTodayRow(item, done) {
      var today = recTodayKey();
      done = done || function () {};
      if (!item || !recInRange(item, today) || !(item.sectionTitle || item.sectionId) || (item.paidAhead && item.paidAhead[String(today)])) { done(''); return; }
      if (recRowsOf(item).some(function (x) { return x.key === today; })) { done(''); return; }
      var pd = recMonthData(today, true);
      var cands = recLinkCandidates(pd, item, today);
      var make = function () {
        var r = recGenMonth(item, today);
        item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
        recPersist();
        done(r === 'created' ? 'ردیف این ماه با وضعیت «دریافت نشده» اضافه شد' : '');
      };
      if (!cands.length) { make(); return; }
      var opts = [];
      cands.slice(0, 6).forEach(function (c, i) { opts.push({ label: recRowLabel(c.row, today), value: String(i) }); });
      opts.push({ label: 'هیچ‌کدام؛ ردیف «دریافت نشده» ساخته شود', value: '', primary: true });
      recPickModal('در این ماه واریزی شبیه «' + (item.name || '') + '» ثبت شده. مربوط به همین قرارداد است؟', opts, function (v) {
        if (v == null || v === '') { make(); return; }
        var c = cands[parseInt(v, 10)];
        if (!c) { make(); return; }
        recLinkRow(item, c.row);
        item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
        recPersist();
        done('واریز ' + recRowLabel(c.row, today).split(' — ')[0] + ' به «' + (item.name || '') + '» وصل شد');
      });
    }
    /* ردیف «دریافت نشده»ٔ این ماه: انتخاب واریزی که قبلاً ثبت شده (هر روزی از همین ماه) به‌جای آن */
    function recLinkExistingFlow(item, done) {
      var today = recTodayKey();
      var pd = recMonthData(today, false);
      var cands = pd ? recLinkCandidates(pd, item, today, { anyDay: true }) : [];
      if (!cands.length) { if (done) done('واریز ثبت‌شده‌ای با همین حساب و مبلغ نزدیک در این ماه پیدا نشد'); return; }
      var opts = [];
      cands.slice(0, 8).forEach(function (c, i) { opts.push({ label: recRowLabel(c.row, today), value: String(i) }); });
      opts.push({ label: 'انصراف', value: null, primary: true });
      recPickModal('کدام واریز ثبت‌شده مربوط به «' + (item.name || '') + '» است؟', opts, function (v) {
        if (v == null) return;
        var c = cands[parseInt(v, 10)];
        if (!c) return;
        recRemoveRows(recRowsOf(item).filter(function (z) { return z.key === today && !recIsPaid(z.row); }));
        recLinkRow(item, c.row);
        item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
        recPersist();
        if (done) done('واریز ' + recRowLabel(c.row, today).split(' — ')[0] + ' به «' + (item.name || '') + '» وصل شد');
      });
    }
    /* بستهٔ آرشیو درآمدهای ثابت (برای پشتیبان و سطل زباله): ردیف‌های وصل‌شده با ماه و بخش */
    function hkRecArchivePack(items) {
      var out = [];
      (items || recurringIncomes || []).forEach(function (it) {
        if (!it || !it.id) return;
        recArchiveRows(it).forEach(function (x) {
          out.push({ key: periodKey(Math.floor(x.key / 100), x.key % 100), secTitle: ((x.sec && x.sec.title) || '').trim(), row: JSON.parse(JSON.stringify(x.row)) });
        });
      });
      return out;
    }
    function hkRecArchiveUnpack(list) {
      var curK = periodKey(currentYear, currentMonth), added = 0;
      var sig = function (r) { return [r.fromRecurringId || '', r.day || '', Number(r.amount) || 0, r.desc || '', r.account || ''].join('|'); };
      (list || []).forEach(function (x) {
        if (!x || !x.row || !x.key) return;
        var pd = x.key === curK ? periodData : archive[x.key];
        if (!pd) { pd = archive[x.key] = emptyPeriodData(); }
        if (!pd.income) pd.income = { sections: [], nextId: 1 };
        var secs = pd.income.sections || (pd.income.sections = []);
        var exists = secs.some(function (sec) { return (sec.rows || []).some(function (r) { return r && ((x.row.id && r.id === x.row.id) || sig(r) === sig(x.row)); }); });
        if (exists) return;
        var sec = secs.find(function (q) { return (q.title || '').trim() === x.secTitle; });
        if (!sec) { var n = parseInt(pd.income.nextId, 10) || (secs.length + 1); sec = { id: 's' + n, title: x.secTitle, collapsed: true, rows: [] }; secs.push(sec); pd.income.nextId = n + 1; }
        recPlaceRow(sec, JSON.parse(JSON.stringify(x.row)));
        added++;
      });
      if (added) { try { persistCurrent(); saveArchive(); } catch (e) {} }
      return added;
    }
    /* —— آرشیو هر درآمد ثابت: همهٔ واریزهای وصل‌شده، به ترتیب ماه (قدیمی‌تر بالا) —— */
    function recArchiveRows(item) {
      var out = [], rid = item && item.id;
      if (!rid) return out;
      recEachMonth(function (k, pd) {
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (r && !r.deletedAt && r.fromRecurringId === rid && (Number(r.amount) || 0) > 0) out.push({ key: k, row: r, sec: sec });
          });
        });
      });
      out.sort(function (a, b) { return (a.key - b.key) || ((parseInt(a.row.day, 10) || 0) - (parseInt(b.row.day, 10) || 0)); });
      return out;
    }
    /* دوره‌های قرارداد: دوره‌های قبلی (بعد از هر تمدید) + دورهٔ فعلی */
    function recTermsOf(item) {
      var list = (item.terms || []).map(function (t) { return { start: t.contractStart, end: t.contractEnd, amount: t.amount, deposit: Number(t.deposit) || 0 }; });
      list.push({ start: item.contractStart, end: item.contractEnd, amount: item.amount, deposit: Number(item.deposit) || 0, current: true });
      return list;
    }
    /* واریز ماه k (روز day) مال کدام دوره است؟ ماه مرزی: قبل از روز شروع دورهٔ تازه = دورهٔ قبل */
    function recTermIndexFor(terms, k, day) {
      var idx = 0;
      terms.forEach(function (t, i) {
        var sk = (t.start && t.start.y) ? recMonthKey(t.start.y, t.start.m) : 0;
        if (!sk) return;
        if (k > sk || (k === sk && (i === 0 || !day || day >= (parseInt(t.start.d, 10) || 1)))) idx = i;
      });
      return idx;
    }
    function recFmtDate(d) { return d ? toPersianDigits(String(d.d)) + ' ' + (MONTHS[d.m - 1] || '') + ' ' + toPersianDigits(String(d.y)) : '—'; }
    function recOpenArchive(item, termIdx) {
      var old = document.getElementById('recArchiveModal'); if (old) old.remove();
      var terms = recTermsOf(item);
      /* همیشه پوشه‌ای: حتی قرارداد فعلی پیش از اولین تمدید پوشهٔ خودش را دارد */
      var multi = true;
      var all = recArchiveRows(item).map(function (x) { x.term = recTermIndexFor(terms, x.key, parseInt(toEnglishDigits(String(x.row.day || '')), 10) || 0); return x; });
      var folderView = multi && termIdx == null;
      var ti = termIdx == null ? terms.length - 1 : termIdx;
      var term = terms[ti];
      var rows = folderView ? all : all.filter(function (x) { return x.term === ti; });
      var paid = rows.filter(function (x) { return recIsPaid(x.row); });
      var unpaid = rows.filter(function (x) { return !recIsPaid(x.row); });
      var sum = paid.reduce(function (s, x) { return s + (Number(x.row.amount) || 0); }, 0);
      /* ۱.۳.۵۵: داخل هر دوره، همهٔ ماه‌های قرارداد (پرداخت‌شده / در انتظار / پیدا نشد / هنوز موعدش نرسیده) */
      var sched = null, termStats = null;
      /* ۱.۳.۵۸: همه‌جا ماه شمرده می‌شود (چند واریزِ یک ماه = ۱)؛ فهرست پوشه‌ها = جمع ماه‌های همهٔ دوره‌ها */
      if (folderView && recStartKey(item)) {
        try { recInferTiming(item); } catch (eIt0) {}
        termStats = terms.map(function (t, i) { return recSchedHtml(item, t, all.filter(function (x) { return x.term === i; })).stat; });
        sum = 0; var pm = 0, mm = 0; termStats.forEach(function (s) { sum += s.sum; pm += s.paid; mm += s.miss; });
        paid = { length: pm }; unpaid = { length: mm };
      }
      if (!folderView && recStartKey(item)) {
        try { recInferTiming(item); } catch (eIt) {}
        sched = recSchedHtml(item, term, rows);
        sum = sched.stat.sum; paid = { length: sched.stat.paid }; unpaid = { length: sched.stat.miss };
      }
      var ov = document.createElement('div');
      ov.id = 'recArchiveModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100350;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;';
      var box = document.createElement('div');
      box.style.cssText = 'width:100%;max-width:520px;max-height:88vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 12px 32px var(--shadow);direction:rtl;overflow:hidden;';
      /* تاریخ‌ها کاملاً عددی: ۱۴۰۴/۰۷/۰۴ تا ۱۴۰۵/۰۷/۰۴ */
      /* هر تاریخ جدا چپ‌به‌راست؛ خود عبارت راست‌به‌چپ تا «تا» بین دو تاریخ بماند */
      var numD = function (d) { return d ? '<bdi dir="ltr">' + toPersianDigits(String(d.y)) + '/' + toPersianDigits(String(d.m).padStart(2, '0')) + '/' + toPersianDigits(String(d.d).padStart(2, '0')) + '</bdi>' : '—'; };
      var rangeOf = function (t) { return numD(t.start) + (t.end ? ' تا ' + numD(t.end) : ''); };
      var depOf = function (t) { return Number(t.deposit) > 0 ? ' · رهن ' + formatNum(t.deposit) : ''; };
      var head = '<div style="padding:12px 14px 8px;border-bottom:1px solid var(--border);">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        (multi && !folderView ? '<button type="button" id="recArchBack" style="border:none;background:transparent;color:var(--accent);font-family:inherit;font-weight:700;font-size:0.8rem;cursor:pointer;padding:0;">‹ همهٔ دوره‌ها</button>' : '') +
        '<div style="flex:1;font-weight:800;font-size:1rem;">آرشیو «' + escapeHtml(item.name || '') + '»</div>' +
        '<button type="button" id="recArchClose" style="border:none;background:transparent;color:var(--muted);font-size:1.4rem;line-height:1;cursor:pointer;">×</button></div>' +
        '<div style="font-size:0.78rem;color:var(--muted);margin-top:4px;line-height:1.7;">' +
        (folderView ? toPersianDigits(String(terms.length)) + ' دورهٔ قرارداد · روز ' + toPersianDigits(String(item.day || '')) + ' هر ماه' + (item.account ? ' · ' + escapeHtml(item.account) : '')
          : formatNum(term.amount || 0) + ' تومان' + depOf(term) + ' · روز ' + toPersianDigits(String(item.day || '')) + ' هر ماه' + (item.account ? ' · ' + escapeHtml(item.account) : '') + '<br>' + rangeOf(term)) + '</div>' +
        '<div class="rec-arch-sum">' +
          '<div>جمع دریافتی<br><b class="rec-green">' + formatNum(sum) + '</b></div>' +
          '<div>دریافت‌شده<br><b class="rec-green">' + toPersianDigits(String(paid.length)) + '</b></div>' +
          '<div>دریافت نشده<br><b style="color:var(--unpaid-c, #ffec0a);">' + toPersianDigits(String(unpaid.length)) + '</b></div>' +
        '</div></div>';
      var body = '<div style="overflow:auto;flex:1;padding:4px 10px 8px;">';
      if (folderView) {
        /* هر دوره یک پوشه؛ قدیمی‌تر بالا */
        terms.forEach(function (t, i) {
          var tr = all.filter(function (x) { return x.term === i; });
          var tp = termStats ? { length: termStats[i].paid } : tr.filter(function (x) { return recIsPaid(x.row); });
          body += '<button type="button" class="rec-term-folder" data-t="' + i + '" style="display:block;width:100%;margin:8px 0 0;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;text-align:right;cursor:pointer;">' +
            /* آیکون پوشه و برچسب زرد در یک ردیف، وسطشان روی یک خط */
            '<span class="rec-term-head"><span class="rec-term-fico">' + HK_FOLDER_SVG + '</span>' +
            '<b class="rec-term-range">' + rangeOf(t) + (t.current ? ' <span class="rec-term-cur">(فعلی)</span>' : '') + '</b></span>' +
            '<span class="rec-term-sub">' + formatNum(t.amount || 0) + ' تومان' + depOf(t) + ' · ' + toPersianDigits(String(tp.length)) + (termStats ? ' ماه دریافت' : ' دریافت') + '</span></button>';
        });
      } else if (sched) body += sched.html;
      else if (!rows.length) body += '<div style="text-align:center;color:var(--muted);padding:18px 6px;font-size:0.85rem;">هنوز واریزی به این ' + (multi ? 'دوره' : 'درآمد ثابت') + ' وصل نشده</div>';
      else {
        /* همان ظاهر جدول درآمد/مخارج: ردیف تایتل سرمه‌ای، خطوط جدول، مبلغ سبز (دریافت‌شده) / قرمز (دریافت‌نشده)؛
           شرح یک‌خطی و با زدن رویش کامل */
        body += '<table class="person-detail-table rec-arch-table">' +
          '<colgroup><col style="width:23%"><col><col style="width:23%"><col style="width:17%"><col style="width:1.8em"></colgroup>' +
          '<thead><tr><th>تاریخ</th><th>شرح</th><th>مبلغ</th><th>حساب</th><th></th></tr></thead><tbody>';
        rows.forEach(function (x, i) {
          var y = Math.floor(x.key / 100), m = x.key % 100, ok = recIsPaid(x.row);
          var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
          var dd = parseInt(toEnglishDigits(String(x.row.day || '')), 10) || 0;
          body += '<tr class="rec-arch-row ' + (ok ? 'is-paid' : 'is-unpaid') + '" data-i="' + i + '">' +
            '<td class="rec-arch-date">' + toPersianDigits(String(y)) + '/' + p2(m) + (dd ? '/' + p2(dd) : '') + '</td>' +
            '<td class="rec-arch-dcell"><span class="rec-arch-desc">' + escapeHtml(x.row.desc || item.name || '') + '</span></td>' +
            '<td><span class="pd-amt ' + (ok ? 'status-paid' : 'status-unpaid') + '">' + formatNum(Number(x.row.amount) || 0) + '</span></td>' +
            '<td class="rec-arch-acc">' + escapeHtml(x.row.account || '—') + '</td>' +
            '<td class="rec-arch-x"><button type="button" class="rec-arch-del" data-i="' + i + '" aria-label="جدا کردن">×</button></td></tr>';
        });
        body += '</tbody></table>';
      }
      body += '</div>';
      /* ۱.۳.۴۶: دو دکمهٔ هم‌اندازه: «وصل خودکار» راست (پیدا کردن واریزهای قبلی) و «وصل دستی» چپ */
      /* ۱.۳.۵۷: فهرست پوشه‌ها: بی‌دکمه؛ داخل پوشه: فقط «وصل خودکار» (وصل دستی کنار هر ماه) */
      var foot = folderView ? '' : '<div class="rec-arch-foot" style="padding:8px 10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;">' +
        '<button type="button" id="recArchAddPrev" class="rec-arch-fbtn">وصل خودکار</button>' +
        (sched ? '' : '<button type="button" id="recArchManual" class="rec-arch-fbtn">وصل دستی</button>') + '</div>';
      box.innerHTML = head + body + foot;
      ov.appendChild(box);
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      /* بازگشت از داخل یک دوره = فهرست دوره‌ها */
      ov._hkCancel = (multi && !folderView) ? function () { recOpenArchive(item); } : close;
      /* زدن داخل آرشیو کاری نمی‌کند؛ فقط ×، بازگشت و زدن بیرون می‌بندد */
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      box.querySelector('#recArchClose').onclick = close;
      var bk = box.querySelector('#recArchBack'); if (bk) bk.onclick = function () { recOpenArchive(item); };
      box.querySelectorAll('.rec-term-folder').forEach(function (b) { b.onclick = function () { recOpenArchive(item, parseInt(b.getAttribute('data-t'), 10)); }; });
      /* شرح: مثل بقیهٔ سلول‌ها با یک ضربه متن کامل یک‌خطی در باکس شناور (بالای این پنجره) */
      box.querySelectorAll('.rec-arch-desc').forEach(function (d) { d.onclick = function (e) { e.stopPropagation(); try { var pp = showCellTextPopup(d, d.textContent); if (pp) pp.style.zIndex = '100400'; } catch (eP) {} }; });
      if (box.querySelector('#recArchAddPrev')) box.querySelector('#recArchAddPrev').onclick = function () { recAddPreviousFlow(item, function (n) { if (n) { recOpenArchive(item, termIdx); try { renderRecurringBar(); } catch (e) {} showToast(toPersianDigits(String(n)) + ' واریز به آرشیو اضافه شد'); } }); };
      if (box.querySelector('#recArchManual')) box.querySelector('#recArchManual').onclick = function () { recManualLinkFlow(item, function () { recOpenArchive(item, termIdx); try { renderRecurringBar(); } catch (e) {} }); };
      /* ۱.۳.۴۷: × هر ردیف فقط اتصال را برمی‌دارد (ردیف سر جایش می‌ماند)؛ برگشت یا زدن بیرون = انصراف */
      var reopen = function () { try { saveRecurring(); } catch (eS) {} try { recRefreshViews(); renderRecurringBar(); } catch (eR) {} recOpenArchive(item, termIdx); };
      box.querySelectorAll('.rec-sch-btn').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var k = parseInt(b.getAttribute('data-k'), 10);
          if (b.getAttribute('data-act') === 'link') { recLinkForDue(item, k, reopen); return; }
          recPickModal('سررسید ' + recKeyLabel(k) + ' بدون پیامک پرداخت شده؟ (فقط در آرشیو علامت می‌خورد و در موجودی اثری ندارد)', [
            { label: 'بلی', value: 'y', primary: true, short: true }, { label: 'خیر', value: null, short: true }
          ], function (v) { if (!v) return; if (!item.extPaid) item.extPaid = {}; item.extPaid[String(k)] = { manual: true }; item.updatedAt = Date.now(); reopen(); });
        };
      });
      box.querySelectorAll('.rec-sch-ext').forEach(function (tr) {
        tr.onclick = function () {
          var k = tr.getAttribute('data-k');
          recPickModal('علامت پرداختِ ' + recKeyLabel(parseInt(k, 10)) + ' از آرشیو برداشته شود؟', [
            { label: 'بلی', value: 'y', primary: true, short: true }, { label: 'خیر', value: null, short: true }
          ], function (v) { if (!v) return; delete item.extPaid[k]; item.updatedAt = Date.now(); reopen(); });
        };
      });
      function bindDel(b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var x = rows[parseInt(b.getAttribute('data-i'), 10)]; if (!x) return;
          var dLab = toPersianDigits(Math.floor(x.key / 100) + '/' + (x.key % 100) + (parseInt(x.row.day, 10) ? '/' + parseInt(x.row.day, 10) : ''));
          recPickModal(dLab + ' از این آرشیو حذف شود؟', [
            { label: 'بلی', value: 'unlink', primary: true, short: true },
            { label: 'خیر', value: null, short: true }
          ], function (v) {
            if (!v) return;
            if (v === 'del') {
              try { pushToTrash('row', (x.row.desc || item.name || 'ردیف') + (x.row.amount ? ' · ' + formatNum(x.row.amount) : ''), { tab: 'income', sectionId: x.sec.id, sectionTitle: x.sec.title, periodKey: periodKey(Math.floor(x.key / 100), x.key % 100), row: JSON.parse(JSON.stringify(x.row)), sourceLabel: 'درآمد ثابت / ' + (item.name || '') }); } catch (eT) {}
              recRemoveRows([x]);
            } else {
              delete x.row.fromRecurringId; delete x.row.recLinked; delete x.row.recForKey; x.row.updatedAt = Date.now();
              recPersist();
            }
            try { saveRecurring(); } catch (eS) {}
            try { recRefreshViews(); renderRecurringBar(); } catch (eR) {}
            showToast(v === 'del' ? 'ردیف به سطل زباله رفت' : 'اتصال برداشته شد');
            recOpenArchive(item, termIdx);
          });
        };
      }
      box.querySelectorAll('.rec-arch-del').forEach(bindDel);
    }
