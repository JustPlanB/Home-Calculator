    /* ===== ۱.۳.۶۵: راه‌اندازی بار اول: کارت‌ها و مانده‌هایشان از پیامک‌های بانکی (همه روی گوشی) =====
       ظاهر همان پنجرهٔ ثبت گروهی (قاب، عنوان، کارت پوشه، باکس «حساب جدید»، دکمه‌ها). تا «تأیید» زده نشود هیچ حسابی ساخته نمی‌شود. */
    var HK_SETUP_DAYS = 90, HK_SETUP_STALE_DAYS = 30;
    function hkSetupNeeded() {
      try { return localStorage.getItem(STORAGE_KEY + '_bankSetupDone') !== '1' && !(selectedBankAccounts || []).length; } catch (e) { return false; }
    }
    function hkSetupFinish() { try { localStorage.setItem(STORAGE_KEY + '_bankSetupDone', '1'); } catch (e) {} }
    function hkSetupDetect(items) {
      var map = {}, now = Date.now(), seen = {}, bctx = hkInboxBankCtx(items);
      (items || []).forEach(function (it) {
        try {
          var body = String(it.body || ''); if (!body) return;
          if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(body)) return;
          if (hkIsPersonalSender(it.address)) return;
          var p = parseBankSms(body); if (!p || !p.amount) return;
          if (hkIsSmsNotice(body, p)) return;
          var ts = Number(it.date) || 0, k0 = body + '|' + Math.round(ts / 60000);
          if (seen[k0]) return; seen[k0] = 1;
          var acc4 = hkSmsAcc4(body), bank = '';
          try { bank = hkBankOfSms(body, it.address, bctx) || ''; } catch (eB) {}
          if (!bank) return;
          var key = bank + '|' + (acc4 || '');
          var fo = map[key] || (map[key] = { key: key, bank: bank, acc4: acc4 || '', n: 0, lastTs: 0, bal: null, balTs: 0 });
          if (ts && now - ts <= HK_SETUP_DAYS * 86400000) fo.n++;
          if (ts > fo.lastTs) fo.lastTs = ts;
          if (p.balance != null && ts >= fo.balTs) { fo.bal = Number(p.balance); fo.balTs = ts; }
        } catch (e) {}
      });
      return Object.keys(map).map(function (k) { return map[k]; }).filter(function (fo) { return fo.n > 0; })
        .sort(function (a, b) { return b.lastTs - a.lastTs; });
    }
    function hkOpenSetup() {
      var old = document.getElementById('hkSetupOv'); if (old) old.remove();
      var B = hkBankSmsPlugin(), canRead = !!(B && typeof B.readInbox === 'function');
      var ov = document.createElement('div'); ov.id = 'hkSetupOv'; ov.className = 'hk-bulk-ov';
      ov.innerHTML = '<div class="hk-bulk-box">' +
        '<div class="hk-bulk-title">حساب‌هایت را پیدا کنیم</div>' +
        '<div class="hk-bulk-list" id="hkSetupList"><div class="hk-bulk-hint">' +
          (canRead ? 'نرم‌افزار پیامک‌های بانکی ' + toPersianDigits(String(HK_SETUP_DAYS)) + ' روز اخیر را روی همین گوشی می‌خواند (جایی فرستاده نمی‌شود) و کارت‌ها و ماندهٔ هر کدام را پیدا می‌کند. تا «تأیید» نزنید چیزی ساخته نمی‌شود.'
                   : 'حساب‌هایتان را با نام و ماندهٔ فعلی اضافه کنید.') +
        '</div></div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok">' + (canRead ? 'پیدا کن' : 'افزودن حساب') + '</button><button type="button" class="hk-bulk-close">بعداً</button></div>' +
      '</div>';
      document.body.appendChild(ov);
      var list = ov.querySelector('#hkSetupList'), okB = ov.querySelector('.hk-bulk-ok'), closeB = ov.querySelector('.hk-bulk-close');
      var close = function () { try { ov.remove(); } catch (e) {} hkSetupFinish(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      closeB.onclick = close;
      var cards = [], mode = 'today';
      var amtBox = function (val) {
        var box = document.createElement('div'); box.className = 'hk-bulk-newacc hk-setup-bal';
        box.innerHTML = '<span class="hk-bulk-newlab">مانده:</span><span class="hk-bulk-newsep" aria-hidden="true"></span>';
        var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'hk-bulk-newinp'; inp.dir = 'ltr'; inp.inputMode = 'numeric'; inp.placeholder = '۰';
        if (val != null) inp.value = formatNum(val);
        inp.addEventListener('input', function () { var d = toEnglishDigits(inp.value).replace(/[^0-9-]/g, ''); inp.value = d && d !== '-' ? formatNum(parseInt(d, 10) || 0) : d; });
        box.appendChild(inp);
        return { box: box, input: inp };
      };
      var addCard = function (fo) {
        var manual = !fo;
        fo = fo || { bank: '', acc4: '', bal: null, balTs: 0, n: 0 };
        var stale = !manual && (fo.bal == null || Date.now() - fo.balTs > HK_SETUP_STALE_DAYS * 86400000);
        var card = document.createElement('div'); card.className = 'hk-bulk-folder on' + (stale ? ' hk-setup-stale' : '');
        var short = String(fo.bank || '').replace(/^بانک\s*/, '');
        card.innerHTML = '<div class="hk-bulk-fhead"><input type="checkbox" class="hk-bulk-chk" checked aria-label="انتخاب">' +
          '<span class="hk-bulk-fico">' + HK_FOLDER_SVG + '</span>' +
          '<span class="hk-bulk-fname">' + (manual ? 'حساب دیگر' : escapeHtml(fo.bank) + (fo.acc4 ? ' · ' + toPersianDigits(fo.acc4) : '')) + '</span></div>' +
          (manual ? '' : '<div class="hk-bulk-fmeta">' + toPersianDigits(String(fo.n)) + ' تراکنش در ' + toPersianDigits(String(HK_SETUP_DAYS)) + ' روز اخیر' +
            (fo.bal != null ? '<br>آخرین مانده در پیامک‌ها: ' + formatNum(fo.bal) + ' (' + hkJStr(hkJalaliOfTs(fo.balTs)) + ')' : '<br>مانده در پیامک‌ها نیست') +
            (stale ? '<br><span class="hk-bulk-unsure">ماندهٔ فعلی را بنویسید (اختیاری)</span>' : '') + '</div>');
        var sug = manual ? '' : (short + (fo.acc4 ? ' ' + toPersianDigits(fo.acc4) : ''));
        var nb = hkNewAccBox(manual ? 'مثلاً نقدی' : sug, sug && !hkAccNameTaken(sug) && !cards.some(function (c) { return c.name.input.value === sug; }) ? sug : '');
        var bb = amtBox(fo.bal);
        var fields = document.createElement('div'); fields.className = 'hk-setup-fields';
        fields.appendChild(nb.wrap); fields.appendChild(bb.box);
        card.appendChild(fields);
        var chk = card.querySelector('.hk-bulk-chk');
        var c = { fo: fo, manual: manual, card: card, chk: chk, name: nb, bal: bb };
        var sync = function () { card.classList.toggle('on', chk.checked); fields.style.display = (chk.checked && mode === 'today') ? '' : 'none'; };
        chk.addEventListener('change', sync);
        card.querySelector('.hk-bulk-fhead').addEventListener('click', function (e) { if (e.target !== chk) { chk.checked = !chk.checked; sync(); } });
        c.sync = sync;
        cards.push(c);
        return c;
      };
      var renderList = function (found) {
        list.innerHTML = '';
        /* شروع: از امروز (پیش‌فرض) یا از اول همین ماه (با تراکنش‌ها، در ثبت گروهی) */
        var seg = document.createElement('div'); seg.className = 'hk-re-seg hk-setup-seg';
        seg.innerHTML = '<button type="button" class="hk-re-segb on" data-m="today">از امروز</button><button type="button" class="hk-re-segb" data-m="month">از اول همین ماه</button>';
        var note = document.createElement('div'); note.className = 'hk-bulk-hint hk-setup-note';
        var setMode = function (m) {
          mode = m;
          seg.querySelectorAll('.hk-re-segb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === m); });
          note.textContent = m === 'today' ? 'موجودی هر حساب همان ماندهٔ فعلی است؛ گذشته وارد نمی‌شود.' : 'تراکنش‌های این ماه در «ثبت گروهی» نشان داده می‌شوند تا تأیید کنید؛ حساب‌ها و موجودی اول ماه همان‌جا ساخته می‌شوند.';
          cards.forEach(function (c) { c.sync(); if (c.manual) c.card.style.display = m === 'today' ? '' : 'none'; });
          addB.style.display = m === 'today' ? '' : 'none';
          okB.textContent = m === 'today' ? 'تأیید و ساختن حساب‌ها' : 'ادامه در ثبت گروهی';
        };
        seg.querySelectorAll('.hk-re-segb').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-m')); }; });
        if (canRead && found.length) { list.appendChild(seg); list.appendChild(note); }
        else if (canRead) { var h = document.createElement('div'); h.className = 'hk-bulk-hint'; h.textContent = 'پیامک بانکی‌ای پیدا نشد؛ حساب‌ها را دستی اضافه کنید.'; list.appendChild(h); }
        found.forEach(function (fo) { list.appendChild(addCard(fo).card); });
        var addB = document.createElement('button'); addB.type = 'button'; addB.className = 'hk-bulk-read hk-setup-add'; addB.textContent = '＋ حساب دیگر';
        addB.onclick = function () { var c = addCard(null); list.insertBefore(c.card, addB); c.sync(); setTimeout(function () { try { c.name.input.focus(); } catch (e) {} }, 60); };
        list.appendChild(addB);
        if (!found.length) addB.onclick();
        setMode('today');
        okB.onclick = confirm;
      };
      var confirm = function () {
        var picked = cards.filter(function (c) { return c.chk.checked && c.card.style.display !== 'none'; });
        if (mode === 'month') {
          ov.remove(); hkSetupFinish();
          try {
            openSmsBulkModal();
            setTimeout(function () { try { var rb = document.querySelector('#smsBulkOv .hk-bulk-read'); if (rb) rb.click(); } catch (e) {} }, 250);
          } catch (eB) {}
          return;
        }
        if (!picked.length) { showToast('حسابی انتخاب نشده'); return; }
        var names = [];
        for (var i = 0; i < picked.length; i++) {
          var c = picked[i], nm = String(c.name.input.value || '').replace(/\s+/g, ' ').trim();
          if (!nm) { showToast('نام حساب را بنویسید'); try { c.name.input.focus(); } catch (e) {} return; }
          if (hkAccNameTaken(nm) || names.indexOf(nm) >= 0) { showToast('نام «' + nm + '» تکراری است'); try { c.name.input.focus(); } catch (e) {} return; }
          names.push(nm);
        }
        var t = getTodayPersian(), total = 0;
        picked.forEach(function (c, i) {
          var nm = names[i], d = toEnglishDigits(String(c.bal.input.value || '')).replace(/[^0-9-]/g, ''), bal = parseInt(d, 10) || 0;
          selectedBankAccounts.push({ id: 'ba_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6) + i, bank: c.fo.bank || '', label: nm,
            srcName: (c.fo.bank || '') + (c.fo.acc4 ? ' · ' + toPersianDigits(c.fo.acc4) : ''), openingBalance: bal, createdAt: { y: t.y, m: t.m, d: t.d } });
          if (c.fo.acc4) { try { smsAccountBankMap['L4:' + c.fo.acc4] = nm; } catch (eM) {} }
          total += bal;
        });
        try { normalizeSelectedBanks(); } catch (eN) {}
        try { saveBankAccountsSelection(); } catch (eS) {}
        try { saveSmsAccountBankMap(); } catch (eSm) {}
        ov.remove(); hkSetupFinish();
        try { renderAll(); } catch (eR) {}
        try { updateHomeBalanceCircle(true); } catch (eH) {}
        try { pushHomeWidget(); } catch (eW) {}
        showToast(toPersianDigits(String(picked.length)) + ' حساب با موجودی ' + formatNum(total) + ' آماده شد', 3200);
      };
      okB.onclick = function () {
        if (!canRead) { renderList([]); return; }
        okB.disabled = true;
        list.innerHTML = '<div class="hk-bulk-hint">در حال خواندن پیامک‌ها…</div>';
        B.readInbox({ from: 0, limit: 6000 }).then(function (res) {
          okB.disabled = false;
          renderList(hkSetupDetect((res && res.items) || []));
        }).catch(function (err) {
          okB.disabled = false;
          var m = String((err && (err.message || err.code)) || '');
          canRead = false;
          renderList([]);
          var h = document.createElement('div'); h.className = 'hk-bulk-hint';
          h.textContent = /permission/.test(m) ? 'اجازهٔ خواندن پیامک داده نشد؛ حساب‌ها را دستی اضافه کنید (بعداً از «ثبت گروهی» هم می‌شود).' : 'خواندن پیامک‌ها ممکن نشد؛ حساب‌ها را دستی اضافه کنید.';
          list.insertBefore(h, list.firstChild);
        });
      };
      return ov;
    }
    try { window.hkOpenSetup = hkOpenSetup; } catch (eWs) {}
    let _bankModalFromMenu = true;
    function refreshSmsConfirmBankSelect() {
      try {
        const bankSel = document.getElementById('smsConfirmBank');
        if (!bankSel) return;
        const prev = bankSel.value;
        const personalized = selectedAccountLabels();
        bankSel.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = personalized.length ? 'انتخاب حساب' : 'حسابی ثبت نشده';
        bankSel.appendChild(ph);
        personalized.forEach(function(n) {
          const o = document.createElement('option');
          o.value = n;
          o.textContent = n;
          bankSel.appendChild(o);
        });
        const addOpt = document.createElement('option');
        addOpt.value = '__add_account__';
        addOpt.textContent = '＋ افزودن حساب';
        bankSel.appendChild(addOpt);
        /* انتخاب قبلی را حفظ کن — حساب جدید را auto-select نکن */
        if (prev && prev !== '__add_account__' && personalized.indexOf(prev) >= 0) {
          bankSel.value = prev;
        } else {
          bankSel.value = '';
        }
        bankSel.onchange = function() {
          if (bankSel.value !== '__add_account__') return;
          var keepPrev = (prev && personalized.indexOf(prev) >= 0) ? prev : '';
          setTimeout(function() {
            try { bankSel.value = keepPrev; } catch (e1) {}
            try { if (bankSel._fancyRender) bankSel._fancyRender(); } catch (eF) {}
            /* ۱.۳.۶۵: همان باکس «حساب جدید» (مثل بار اول باز شدن باکس پیامک)، نه پنجرهٔ حساب‌ها */
            try { if (window.hkSmsInlineNewAcc) window.hkSmsInlineNewAcc(bankSel); } catch (eA) {}
          }, 0);
        };
        try { if (bankSel._fancyRender) bankSel._fancyRender(); } catch (eR) {}
      } catch (e) {}
    }
    function closeBankAccountsModal() {
      var bm = document.getElementById('bankAccountsModal');
      /* ۱.۳.۷۸: بسته شدن نرم (یک نسخهٔ تصویری محو می‌شود؛ وضعیت همان لحظه بسته است) */
      try {
        var bx0 = bm && bm.classList.contains('open') && bm.querySelector('.modal-box');
        if (bx0 && bx0.animate) {
          var r0 = bx0.getBoundingClientRect(), gh = bx0.cloneNode(true);
          gh.removeAttribute('id'); gh.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
          gh.style.cssText += ';position:fixed;left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;height:' + r0.height + 'px;margin:0;z-index:100500;pointer-events:none;';
          var shade = document.createElement('div'); shade.style.cssText = 'position:fixed;inset:0;z-index:100499;pointer-events:none;background:rgba(0,0,0,0.55);';
          document.body.appendChild(shade); document.body.appendChild(gh);
          var D = 380;
          gh.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(18px) scale(0.97)' }], { duration: D, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }).onfinish = function () { gh.remove(); };
          shade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D, easing: 'ease' }).onfinish = function () { shade.remove(); };
          setTimeout(function () { try { gh.remove(); shade.remove(); } catch (eG) {} }, D + 200);
        }
      } catch (eGh) {}
      if (bm) {
        bm.classList.remove('open');
        try { bm.style.zIndex = ''; } catch (eZ) {}
      }
      try { renderAll(); } catch (e) {}
      try { localStorage.setItem(STORAGE_KEY + '_bankSetupDone', '1'); } catch (e) {}
      /* برگشت به «ثبت گروهی» */
      if (window._returnToBulk) {
        window._returnToBulk = false; window._hkBulkAddCtx = null;
        _bankModalFromMenu = true;
        try { hkBulkRender(); } catch (eBk) {}
        return;
      }
      if (window._returnToSmsConfirm) {
        window._returnToSmsConfirm = false;
        _bankModalFromMenu = true;
        try {
          const sm = document.getElementById('smsConfirmModal');
          if (sm) sm.classList.add('open');
        } catch (eS) {}
        /* بعد از بستن منوی حساب: لیست بانک پیامک را با حساب‌های جدید پر کن؛ اگر همین‌جا حساب تازه ساخته شد، همان انتخاب شود */
        try { refreshSmsConfirmBankSelect(); } catch (eR) {}
        try {
          var _nl = window._hkSmsNewAccLabel; window._hkSmsNewAccLabel = null;
          var _bs = document.getElementById('smsConfirmBank');
          if (_nl && _bs && selectedAccountLabels().indexOf(_nl) >= 0) {
            _bs.value = _nl;
            try { if (_bs._fancyRender) _bs._fancyRender(); } catch (eF) {}
            var _w = (_bs.parentNode && _bs.parentNode.classList && _bs.parentNode.classList.contains('fancy-select-wrap')) ? _bs.parentNode : _bs;
            _w.classList.remove('sms-acc-need');
            var _nn = document.getElementById('smsAccNewNote'); if (_nn) _nn.remove();
          }
        } catch (eNs) {}
        return;
      }
      if (_bankModalFromMenu) {
        try { openSideMenu(); } catch (e) {}
      }
      _bankModalFromMenu = true;
    }
    /* ۱.۳.۴۳: حساب‌های ساخته‌شده بیشتر صفحه را می‌گیرند (تا ۴۴٪ ارتفاع) و فهرست همهٔ بانک‌ها کوتاه‌تر (۱۶٪) */
    /* ۱.۳.۴۶: پنجرهٔ تراکنش‌های یک حساب (جدیدترین بالا) در قاب ثابتِ قابل اسکرول؛ بالای آن نام اصلیِ پیداشده در ثبت گروهی */
    function hkOpenAccountTx(acc) {
      var lb = ''; try { lb = accountLabel(acc); } catch (e) { lb = (acc && acc.label) || ''; }
      var old = document.getElementById('hkAccTxOv'); if (old) old.remove();
      var rows = hkCollectAccountRows(lb).filter(function (x) { return Number(x.row.amount) > 0; });
      var key = function (x) { var p = String(x.k).split('-'); return (parseInt(p[0], 10) || 0) * 1e6 + (parseInt(p[1], 10) || 0) * 1e4 + (parseInt(x.row.day, 10) || 0) * 100 + (parseInt(String(x.row.time || '').replace(':', ''), 10) || 0) / 100; };
      rows.sort(function (a, b) { return key(b) - key(a); });
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var src = (acc && (acc.srcName || acc.bank)) || '';
      var _dgT = ''; try { _dgT = hkAccDigits(lb); } catch (eDg) {}
      var ov = document.createElement('div'); ov.id = 'hkAccTxOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="hk-bulk-box hk-acctx-box"><div class="hk-bulk-title">' + escapeHtml(lb) + '</div>' +
        /* ۱.۳.۷۵: زیر اسم کاربر: اسم در پیامک‌ها | رقم‌های حساب (همان شکل ردیف بستهٔ حساب) */
        ((src || _dgT) ? '<div class="hk-acctx-src hk-acc-hint">' + escapeHtml(src) + (src && _dgT ? '<i>|</i>' : '') + (_dgT ? '<span dir="ltr">' + escapeHtml(toPersianDigits(_dgT)) + '</span>' : '') + '</div>' : '') +
        '<div class="hk-acctx-list">' + (rows.length ? '<div class="hk-acctx-r hk-acctx-h"><span class="d">تاریخ</span><span class="t">شرح</span><span class="a">مبلغ</span></div>' : '<div class="hk-bulk-hint">هنوز تراکنشی با این حساب ثبت نشده</div>') + '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-close">بستن</button></div></div>';
      /* ۱.۳.۴۸: اول ۴۰ تراکنش؛ آخر فهرست «بیشتر» تا بقیه هم بیاید */
      var rowHtml = function (x) {
          var p = String(x.k).split('-'), inc = x.tab === 'income';
          return '<div class="hk-acctx-r"><span class="d">' + toPersianDigits(p[0]) + '/' + p2(p[1]) + (x.row.day ? '/' + p2(x.row.day) : '') + (x.row.time ? '<small> ' + toPersianDigits(x.row.time) + '</small>' : '') + '</span>' +
            '<span class="t">' + escapeHtml((x.row.desc || '').trim() || (inc ? 'واریز' : 'برداشت')) + '</span>' +
            '<span class="a ' + (inc ? 'inc' : 'exp') + '">' + (inc ? '+' : '−') + formatNum(Number(x.row.amount) || 0) + '</span></div>';
      };
      document.body.appendChild(ov);
      var listEl = ov.querySelector('.hk-acctx-list'), shown = 0, PAGE = 40;
      var more = function () {
        var old2 = listEl.querySelector('.hk-more'); if (old2) old2.remove();
        listEl.insertAdjacentHTML('beforeend', rows.slice(shown, shown + PAGE).map(rowHtml).join(''));
        shown = Math.min(rows.length, shown + PAGE);
        if (shown < rows.length) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-more'; b.textContent = 'بیشتر (' + toPersianDigits(String(rows.length - shown)) + ')';
          b.onclick = function (e) { e.stopPropagation(); more(); };
          listEl.appendChild(b);
        }
      };
      if (rows.length) more();
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.querySelector('.hk-bulk-close').onclick = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    }
    function hkAccDigits(label) {
      var out = [];
      try {
        Object.keys(smsAccountBankMap || {}).forEach(function (k) {
          if (smsAccountBankMap[k] !== label) return;
          var d = String(k).replace(/^L4:/, '').replace(/[^0-9]/g, '');
          if (d.length < 3) return;
          if (d.length > 6) d = d.slice(-4);
          if (out.indexOf(d) < 0 && !out.some(function (x) { return x.slice(-d.length) === d || d.slice(-x.length) === x; })) out.push(d);
        });
      } catch (e) {}
      return out.slice(0, 2).join('، ');
    }
    function renderBankAccountsList() {
      const box = document.getElementById('bankAccountsList');
      if (!box) return;
      normalizeSelectedBanks();
      let selectedWrap = document.getElementById('bankSelectedScroll');
      let banksWrap = document.getElementById('bankBanksScroll');
      if (!selectedWrap || !banksWrap) {
        box.innerHTML = '';
        selectedWrap = document.createElement('div');
        selectedWrap.id = 'bankSelectedScroll';
        selectedWrap.style.cssText = 'max-height:35vh;overflow-y:auto;-webkit-overflow-scrolling:touch;margin-bottom:0;padding-bottom:4px;';
        banksWrap = document.createElement('div');
        banksWrap.id = 'bankBanksScroll';
        banksWrap.style.cssText = 'max-height:35vh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-top:3px solid var(--border);padding-top:6px;margin-top:4px;';
        box.appendChild(selectedWrap);
        box.appendChild(banksWrap);
      }
      selectedWrap.innerHTML = '';
      banksWrap.innerHTML = '';

      // لیست حساب‌های ساخته‌شده
      if (!selectedBankAccounts.length) {
        selectedWrap.innerHTML = '<div style="padding:8px;color:var(--muted);font-size:0.85rem;">هنوز حسابی اضافه نشده</div>';
      } else {
        selectedBankAccounts.forEach((acc, idx) => {
          const row = document.createElement('div');
          const isLast = idx === selectedBankAccounts.length - 1;
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 4px;' +
            (isLast ? '' : 'border-bottom:1px solid var(--border);');
          const info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';
          /* ۱.۳.۷۴: زیر اسم: بانک · رقم‌های کارت/حساب (از پیامک‌ها) */
          var _dg = hkAccDigits(acc.label);
          info.innerHTML = '<div style="font-weight:700;font-size:0.9rem;">' + escapeHtml(acc.label) + '</div>' +
            '<div class="hk-acc-hint">' + escapeHtml(acc.bank) + (_dg ? '<i>|</i><span dir="ltr">' + escapeHtml(toPersianDigits(_dg)) + '</span>' : '') + '</div>';
          /* ۱.۳.۴۶: زدن روی نام حساب → تراکنش‌های این حساب از آخر به اول */
          info.style.cursor = 'pointer';
          info.onclick = (e) => { e.stopPropagation(); hkOpenAccountTx(acc); };
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.title = 'ویرایش نام';
          editBtn.className = 'btn-edit-title';
          editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
          editBtn.style.cssText = '';
          editBtn.onclick = (e) => {
            e.stopPropagation();
            openBankNameEditor(acc, idx, row);
          };
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = '×';
          delBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:8px;background:transparent;color:#ff453a;font-family:inherit;font-weight:800;font-size:1.25rem;line-height:1;';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            var _rmLb0 = ''; try { _rmLb0 = accountLabel(selectedBankAccounts[idx]); } catch (eL0) {}
            var _rowRefs = hkCollectAccountRows(_rmLb0);
            /* همان پنجرهٔ تأیید حذف پروژه؛ انصراف = بازگشت یا زدن بیرون باکس */
            hkAsk3('حساب «' + _rmLb0 + '» حذف شود؟',
              _rowRefs.length ? [{ v: 'yes', t: 'حذف با ردیف‌ها', cls: 'danger' }, { v: 'no', t: 'حذف بدون ردیف‌ها', cls: 'danger' }] : [{ v: 'no', t: 'حذف', cls: 'danger' }], function (ans) {
              if (ans !== 'yes' && ans !== 'no') return;
              var withRows = ans === 'yes';
              var removed = selectedBankAccounts[idx];
              var rmLabel = '';
              try {
                rmLabel = (typeof accountLabel === 'function') ? accountLabel(removed) : ((removed && removed.label) || '');
              } catch (eL) {}
              /* ترتیب امن: (۱) بستهٔ سطل زباله ذخیره شود؛ اگر نشد، هیچ چیزی حذف نمی‌شود.
                 (۲) حذف در حافظه و ذخیره؛ اگر ذخیره نشد، همه‌چیز در حافظه و حافظهٔ دستگاه برگردانده می‌شود. */
              var _openings = {}, _cur = periodKey(currentYear, currentMonth), _sms = {};
              try {
                if (rmLabel) {
                  Object.keys(archive || {}).forEach(function (k) { var pd = archive[k]; if (pd && pd.accountOpeningInstant && pd.accountOpeningInstant[rmLabel] != null) _openings[k] = pd.accountOpeningInstant[rmLabel]; });
                  if (periodData && periodData.accountOpeningInstant && periodData.accountOpeningInstant[rmLabel] != null) _openings[_cur] = periodData.accountOpeningInstant[rmLabel];
                }
                if (typeof smsAccountBankMap !== 'undefined') Object.keys(smsAccountBankMap).forEach(function (k) { if (smsAccountBankMap[k] === rmLabel || k === rmLabel) _sms[k] = smsAccountBankMap[k]; });
              } catch (eSm) {}
              /* «بلی»: ردیف‌های این حساب هم (به‌جز ردیف‌های خودکار اقساط) در همان بستهٔ سطل زباله — فعلاً فقط در حافظه */
              var _rowsPack = [];
              try { _rowsPack = withRows ? hkTakeAccountRows(rmLabel, { noSave: true }) : []; } catch (eTk) { _rowsPack = []; }
              var _trashed = false;
              try {
                _trashed = pushToTrash('bank_account', (rmLabel || 'حساب') + (_rowsPack.length ? ' + ' + toPersianDigits(String(_rowsPack.length)) + ' ردیف' : ''),
                  { sourceLabel: 'حساب‌های بانکی', account: JSON.parse(JSON.stringify(removed)), openings: _openings, smsMap: _sms, rows: _rowsPack });
              } catch (eTr) { _trashed = false; }
              if (!_trashed) {
                try { if (_rowsPack.length) hkPutBackAccountRows(_rowsPack, { noSave: true }); } catch (ePb) {}
                try { showToastLong('حذف حساب انجام نشد: نسخهٔ قابل بازگردانی در سطل زباله ذخیره نشد. حساب و موجودی‌هایش دست‌نخورده ماندند.'); } catch (eT0) {}
                try { renderBankAccountsList(); renderAll(); renderHomeCards(); } catch (eR0) {}
                return;
              }
              var _trashId = trashItems && trashItems[0] && trashItems[0].id;
              var _smsHad = !!(typeof smsAccountBankMap !== 'undefined' && rmLabel && Object.prototype.hasOwnProperty.call(smsAccountBankMap, rmLabel));
              var _smsVal = _smsHad ? smsAccountBankMap[rmLabel] : undefined;
              var _openingTargets = function (fn) {
                Object.keys(_openings).forEach(function (k) { var pd = k === _cur ? periodData : (archive && archive[k]); if (pd) fn(pd, k); });
              };
              /* حذف در حافظه */
              selectedBankAccounts.splice(idx, 1);
              _openingTargets(function (pd) { if (pd.accountOpeningInstant) delete pd.accountOpeningInstant[rmLabel]; });
              if (_smsHad) delete smsAccountBankMap[rmLabel];
              /* ذخیره؛ فقط وقتی همه موفق باشند حذف کامل حساب می‌شود */
              var _saved = saveBankAccountsSelection();
              try { persistCurrent(); } catch (ePc) {}
              _saved = saveArchive() && _saved;
              if (_smsHad) _saved = saveSmsAccountBankMap() && _saved;
              if (!_saved) {
                /* بازگرداندن کامل در حافظه و تلاش برای بازنویسی حالت قبل */
                selectedBankAccounts.splice(idx, 0, removed);
                _openingTargets(function (pd, k) {
                  if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
                  pd.accountOpeningInstant[rmLabel] = _openings[k];
                });
                if (_smsHad) smsAccountBankMap[rmLabel] = _smsVal;
                try { if (_rowsPack.length) hkPutBackAccountRows(_rowsPack, { noSave: true }); } catch (ePb2) {}
                _hkPersist.quiet++;
                var _rb = false;
                try {
                  _rb = saveBankAccountsSelection();
                  try { persistCurrent(); } catch (ePc2) {}
                  _rb = saveArchive() && _rb;
                  if (_smsHad) _rb = saveSmsAccountBankMap() && _rb;
                } finally { _hkPersist.quiet--; }
                if (_rb) {
                  /* حالت قبل کامل ذخیره شد: بستهٔ سطل زباله دیگر لازم نیست (وگرنه نسخهٔ تکراری می‌ماند) */
                  trashItems = (trashItems || []).filter(function (t) { return !(t && t.id === _trashId); });
                  _hkPersist.quiet++; try { saveTrash(); } finally { _hkPersist.quiet--; }
                  try { showToastLong('حذف حساب انجام نشد چون ذخیره‌سازی ناموفق بود؛ هیچ چیزی تغییر نکرد.'); } catch (eT1) {}
                } else {
                  try { showToastLong('حذف حساب ذخیره نشد و حالت قبل هم کامل ذخیره نشد. حساب روی صفحه برگردانده شد؛ یک نسخهٔ قابل بازگردانی در سطل زباله هست. پیش از بستن برنامه پشتیبان بگیرید.'); } catch (eT2) {}
                }
                try { renderBankAccountsList(); renderAll(); renderHomeCards(); } catch (eR1) {}
                return;
              }
              if (_rowsPack.length) { try { renderAll(); } catch (eRa) {} }
              /* هر موجودی اولیهٔ دیگری که دیگر صاحب ندارد (مثلاً با نام قدیمِ همین حساب) */
              try { cleanupOrphanedAccountOpenings({ allowEmpty: true }); } catch (eCl) {}
              try { renderHomeCards(); } catch (eRh) {}
              renderBankAccountsList();
            });
          };
          row.appendChild(info);
          row.appendChild(editBtn);
          row.appendChild(delBtn);
          selectedWrap.appendChild(row);
        });
      }
      /* ۱.۳.۷۵: کارت‌های قسط همه داخل یک پوشه «کارت‌های قسط»؛ زدن پوشه = باز/بسته؛ زدن کارت = تاریخچه */
      try {
        var _ic = hkInstCards();
        if (_ic.length) {
          var _bad = _ic.some(function (c) { var s1 = hkInstStatus(c); return s1 && s1.st === 'bad'; });
          var _fd = document.createElement('div'); _fd.className = 'hk-acc-fold' + (window._hkInstFoldOpen ? ' open' : '');
          _fd.innerHTML = '<span class="ic"><svg viewBox="0 0 24 24"><path d="M3.5 7.2A1.7 1.7 0 0 1 5.2 5.5h4l2 2.2h7.6a1.7 1.7 0 0 1 1.7 1.7v8.9a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/></svg></span>' +
            '<b>کارت‌های قسط</b><span class="n">' + toPersianDigits(String(_ic.length)) + '</span>' + (_bad ? '<i class="hk-inst-dot"></i>' : '') +
            '<span class="chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';
          var _fb = document.createElement('div'); _fb.className = 'hk-acc-fold-body'; if (!window._hkInstFoldOpen) _fb.style.display = 'none';
          /* ۱.۳.۷۷: باز/بسته شدن آرام (مثل رمز پشتیبان در منوی پشتیبان‌گیری) */
          /* ۱.۳.۷۹: پاسخ فوری به لمس — همان لحظهٔ برداشتن انگشت شروع می‌شود (نه بعد از کلیک) و جمع شدن از همان اول حرکت دارد؛ مدت همان */
          var _fdT = null;
          _fd.addEventListener('pointerdown', function (e) { _fdT = { x: e.clientX, y: e.clientY, t: Date.now() }; });
          _fd.addEventListener('pointerup', function (e) {
            if (!_fdT || Math.abs(e.clientX - _fdT.x) > 10 || Math.abs(e.clientY - _fdT.y) > 10 || Date.now() - _fdT.t > 700) { _fdT = null; return; }
            _fdT = null; _fd._hkFast = Date.now(); _fd.onclick(e);
          });
          _fd.onclick = function (e) {
            e.stopPropagation();
            if (e.type === 'click' && _fd._hkFast && Date.now() - _fd._hkFast < 600) return;
            var op = !window._hkInstFoldOpen; window._hkInstFoldOpen = op; _fd.classList.toggle('open', op);
            _fb._hkSlideMs = 780; /* ۱.۳.۷۸: آهسته‌تر */
            _fb._hkSlideEaseClose = 'cubic-bezier(0.2, 0.55, 0.3, 1)';
            hkSlideBox(_fb, op, function (o) { _fb.style.display = o ? '' : 'none'; });
          };
          selectedWrap.appendChild(_fd);
          _ic.forEach(function (c) {
            var s0 = hkInstStatus(c), r0 = document.createElement('div');
            r0.className = 'hk-acc-inst' + (s0 && s0.st === 'bad' ? ' bad' : ''); r0.setAttribute('data-inst', c.id);
            r0.innerHTML = '<div class="nm"><b>' + escapeHtml(hkInstName(c)) + (s0 && s0.st === 'bad' ? ' <i class="hk-inst-dot"></i>' : '') + '</b><div class="hk-acc-hint">' + escapeHtml(c.bank || '') + (c.bank ? '<i>|</i>' : '') + '<span dir="ltr">' + toPersianDigits(c.id) + '</span></div></div><div class="st">' + hkInstStatusHtml(s0, true) + '</div>';
            r0.onclick = function (e) { e.stopPropagation(); hkOpenInstHistory(c.id); };
            _fb.appendChild(r0);
          });
          selectedWrap.appendChild(_fb);
        }
      } catch (eIc) {}

      // لیست بانک‌ها برای افزودن
      const addTitle = document.createElement('div');
      addTitle.textContent = 'افزودن حساب بانکی';
      addTitle.style.cssText = 'font-weight:700;font-size:0.85rem;margin:4px 0 8px;color:var(--muted);';
      banksWrap.appendChild(addTitle);
      hkBankList().forEach((name) => {
        const row = document.createElement('div');
        row.className = 'hk-bank-add-row';
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid var(--border);cursor:pointer;';
        const span = document.createElement('span');
        span.textContent = name;
        span.style.flex = '1';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.setAttribute('aria-label', 'افزودن');
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
        addBtn.style.cssText = 'width:26px;height:26px;padding:0;border:none;border-radius:7px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        const doAdd = () => {
          const defaultLabel = bankShortLabel(name) || name;
          openBankNameEditor(null, -1, null, name, defaultLabel);
        };
        addBtn.onclick = (e) => { e.stopPropagation(); doAdd(); };
        /* ۱.۳.۴۸: زدن هر جای ردیف (نام بانک یا بعلاوه) = افزودن حساب */
        row.style.cursor = 'pointer';
        row.onclick = doAdd;
        row.appendChild(span);
        row.appendChild(addBtn);
        banksWrap.appendChild(row);
      });
      /* بانکی که در فهرست نیست: نام دلخواه کاربر */
      (function () {
        const row = document.createElement('div');
        row.className = 'bank-custom-row';
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;';
        const inp = document.createElement('input');
        inp.type = 'text'; inp.id = 'bankCustomName'; inp.maxLength = 30; inp.autocomplete = 'off';
        inp.placeholder = 'نام بانک (دلخواه)';
        inp.setAttribute('enterkeyhint', 'done');
        inp.style.cssText = 'flex:1;min-width:0;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-size:0.85rem;box-sizing:border-box;';
        const addBtn = document.createElement('button');
        addBtn.type = 'button'; addBtn.id = 'bankCustomAdd';
        addBtn.setAttribute('aria-label', 'افزودن بانک دیگر');
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
        addBtn.style.cssText = 'width:26px;height:26px;padding:0;border:none;border-radius:7px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
        const go = () => {
          const nm = hkCustomBankName(inp.value);
          if (!nm) { try { showToast('نام بانک را بنویسید'); } catch (e0) {} try { inp.focus(); } catch (e1) {} return; }
          try { inp.blur(); } catch (e2) {}
          /* بانک تازه جزو فهرست بانک‌ها می‌ماند */
          hkAddCustomBank(nm);
          openBankNameEditor(null, -1, null, nm, bankShortLabel(nm) || nm);
        };
        addBtn.onclick = (e) => { e.stopPropagation(); go(); };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        row.appendChild(inp); row.appendChild(addBtn);
        /* ۱.۳.۴۸: «نام بانک دلخواه» اولین گزینهٔ فهرست بانک‌ها */
        banksWrap.insertBefore(row, addTitle.nextSibling);
      })();
      /* ۱.۳.۴۸: هر بار باز شدن منو، فهرست‌ها از بالا */
      try { selectedWrap.scrollTop = 0; banksWrap.scrollTop = 0; } catch (eSc) {}
      /* ۱.۳.۷۷: از بانک‌ها فقط «نام بانک دلخواه» و سه بانک زیرش دیده می‌شود (بقیه با اسکرول)؛ بقیهٔ جا مال حساب‌ها و کارت‌های قسط */
      try { requestAnimationFrame(function () { hkBankListFit(selectedWrap, banksWrap); }); } catch (eFt) {}
    }
    function hkBankListFit(selectedWrap, banksWrap) {
      if (!selectedWrap || !banksWrap || !banksWrap.isConnected) return;
      var rows = banksWrap.querySelectorAll('.hk-bank-add-row');
      if (rows.length > 3) {
        var bt = banksWrap.getBoundingClientRect().top - banksWrap.scrollTop, r3 = rows[2].getBoundingClientRect();
        banksWrap.style.maxHeight = Math.ceil(r3.bottom - bt + 2) + 'px';
      }
      var box = banksWrap.closest('.modal-box') || banksWrap.parentElement;
      selectedWrap.style.maxHeight = 'none';
      var rest = box.getBoundingClientRect().height - selectedWrap.getBoundingClientRect().height;
      var avail = window.innerHeight - 40 - rest;
      selectedWrap.style.maxHeight = Math.max(120, Math.floor(avail)) + 'px';
    }
    /* نام دلخواه بانک: «درخت» → «بانک درخت»؛ «بانک درخت» همان (نه «بانک بانک درخت») */
    function hkCustomBankName(v) {
      var core = String(v || '').replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/\s+/g, ' ').trim().replace(/^(بانک\s*)+/, '').trim();
      return core ? 'بانک ' + core : '';
    }
    function hkCustomBanks() { try { var a = JSON.parse(localStorage.getItem(STORAGE_KEY + '_customBanks') || '[]'); return Array.isArray(a) ? a.filter(Boolean) : []; } catch (e) { return []; } }
    function hkAddCustomBank(nm) {
      var k = function (x) { return hkNormTitle(String(x || '').replace(/^بانک/, '')); };
      if (hkBankList().some(function (b) { return k(b) === k(nm); })) return;
      var a = hkCustomBanks(); a.push(nm);
      try { localStorage.setItem(STORAGE_KEY + '_customBanks', JSON.stringify(a)); } catch (e) {}
    }
    /* فهرست بانک‌ها: بانک‌های ایران + بانک‌های دلخواهی که کاربر ساخته (بی تکرار) */
    function hkBankList() {
      var out = [], seen = {};
      (ALL_IRAN_BANKS || []).concat(hkCustomBanks()).forEach(function (b) { var key = hkNormTitle(String(b || '').replace(/^بانک/, '')); if (!key || seen[key]) return; seen[key] = 1; out.push(b); });
      return out;
    }
    function openBankNameEditor(acc, idx, anchorRow, bankName, defaultLabel) {
      // مات پشت باکس
      let dim = document.getElementById('bankEditorDim');
      if (!dim) {
        dim = document.createElement('div');
        dim.id = 'bankEditorDim';
        dim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100250;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);';
        document.body.appendChild(dim);
      }
      dim.style.zIndex = '100250';
      dim.style.display = 'block';
      let editor = document.getElementById('bankAddEditor');
      if (editor) editor.remove();
      editor = document.createElement('div');
      editor.id = 'bankAddEditor';
      /* بالای صفحه ثابت (پیکسلی، نه درصدی) تا با باز/بسته شدن کیبورد جابه‌جا نشود و لمس‌ها جای درست بخورند */
      editor.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top, 0px) + 64px);z-index:100260;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--card);box-shadow:0 12px 40px rgba(0,0,0,0.4);';
      const isEdit = !!acc;
      const initial = isEdit ? acc.label : (defaultLabel || '');
      const initBal = isEdit ? (Number(acc.openingBalance) || 0) : 0;
      const initBalStr = initBal ? formatNum(initBal) : '';
      var createdDateStr = '';
      try {
        /* فقط بعد از ذخیره‌ی حساب و داشتن createdAt — برای حساب جدید تاریخ را نشان نده */
        if (isEdit && acc && acc.createdAt && acc.createdAt.y) {
          createdDateStr = formatAccountCreatedDate(acc);
        }
      } catch (eD) { createdDateStr = ''; }
      editor.innerHTML =
        '<div style="font-weight:700;font-size:0.9rem;margin-bottom:8px;">' + (isEdit ? 'ویرایش نام حساب' : ('نام حساب — ' + escapeHtml(bankName || ''))) + '</div>' +
        '<input id="bankAddNameInput" type="text" value="' + escapeHtml(initial) + '" placeholder="نام حساب را وارد کنید" ' +
        'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:700;margin-bottom:8px;">' +
        '<div style="font-weight:700;font-size:0.82rem;margin-bottom:6px;color:var(--muted);">' +
        'موجودی زمان اضافه کردن کارت' +
        (createdDateStr ? (' <span style="font-size:0.78em;font-weight:600;opacity:0.85;">(' + createdDateStr + ')</span>') : '') +
        ' ' + hkInfoBtnHtml(isEdit
          ? 'موجودی این حساب در روزی که آن را اضافه کردید؛ موجودی‌های بعدی از همین عدد حساب می‌شوند.\nبرای ویرایش، روی کادر مبلغ دوبار بزنید. با ثبت مبلغ جدید، موجودی اول ماه و ماه‌های بعد هم به همان اندازه جابه‌جا می‌شود و قبل از ثبت، تغییر دقیق نمایش داده می‌شود.'
          : 'موجودی فعلی این حساب را وارد کنید؛ موجودی‌های بعدی از همین عدد حساب می‌شوند.') +
        '</div>' +
        '<input id="bankAddBalInput" type="text" inputmode="numeric" value="' + escapeHtml(initBalStr) + '" placeholder="مبلغ را وارد کنید" ' +
        (isEdit ? 'readonly ' : '') +
        'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:700;margin-bottom:10px;direction:ltr;text-align:center;' +
        (isEdit ? 'opacity:0.9;cursor:pointer;' : '') + '">' +
        '<div style="display:flex;gap:8px;">' +
        '<button type="button" id="bankAddOk" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">ثبت</button>' +
        '<button type="button" id="bankAddCancel" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button>' +
        '</div>';
      document.body.appendChild(editor);
      const inp = editor.querySelector('#bankAddNameInput');
      const balInp = editor.querySelector('#bankAddBalInput');
      /* مغایرت: اگر موجودی اول ماهِ ذخیره‌شده با موجودی اولیهٔ این حساب فرق دارد، آشکارا نشان بده */
      try {
        if (isEdit && balInp) {
          const _lb = accountLabel(acc), _st = storedCreationOpening(acc, _lb), _cy = accountCreationYM(acc);
          if (_st != null && _st !== initBal) {
            const note = document.createElement('div');
            note.className = 'bank-open-mismatch';
            note.style.cssText = 'margin:-4px 0 10px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,197,49,0.45);background:rgba(255,197,49,0.08);color:var(--text);font-size:0.76rem;line-height:1.75;';
            note.textContent = 'نرم‌افزار برای اول ' + MONTHS[_cy.m - 1] + ' ' + toPersianDigits(String(_cy.y)) + ' موجودی این حساب را ' + formatNum(_st) +
              ' حساب می‌کند (نه ' + formatNum(initBal) + '). برای یکی شدن بدون تغییر موجودی‌ها، همان ' + formatNum(_st) + ' را ثبت کنید.';
            balInp.insertAdjacentElement('afterend', note);
          }
        }
      } catch (eMm) {}
      /* افزودن حساب از داخل باکس ثبت پیامک: موجودی اولیه از روی «مانده»ی پیامک حساب و قفل می‌شود
         (واریز: مانده − مبلغ، برداشت: مانده + مبلغ) تا بعد از ثبت همین تراکنش، موجودی حساب دقیقاً برابر مانده شود */
      try {
        var _pe = (typeof pendingSmsEntry !== 'undefined') ? pendingSmsEntry : null;
        if (!isEdit && balInp && window._returnToSmsConfirm && _pe && _pe.balance != null) {
          var _tEl = document.getElementById('smsConfirmType'), _aEl = document.getElementById('smsConfirmAmount');
          var _amt = parseAmount(_aEl ? _aEl.value : _pe.amount) || 0;
          var _isInc = _tEl ? _tEl.value === 'income' : _pe.type === 'income';
          var _open = (Number(_pe.balance) || 0) - (_isInc ? _amt : -_amt);
          if (_open >= 0) {
            balInp.value = formatNum(_open);
            balInp.readOnly = true;
            balInp.dataset.hkSmsLocked = '1';
            balInp.style.opacity = '0.9';
            var _hn = document.createElement('div');
            _hn.className = 'bank-open-from-sms';
            _hn.textContent = 'از روی پیامک حساب شد: مانده ' + formatNum(Number(_pe.balance) || 0) + (_isInc ? ' − واریز ' : ' + برداشت ') + formatNum(_amt) + '. بعد از ثبت همین تراکنش، موجودی حساب برابر ماندهٔ پیامک می‌شود.';
            balInp.insertAdjacentElement('afterend', _hn);
          }
        }
      } catch (eSmsOpen) {}
      /* افزودن حساب از «ثبت گروهی»: موجودی اولیه = آخرین ماندهٔ پیامک‌های همان پوشه (منهای اثر تراکنش‌های ماه جاریِ همین ورود) */
      try {
        if (!isEdit && balInp && window._returnToBulk && window._hkBulkAddCtx && _hkBulk) {
          var _fo = _hkBulk.folders[window._hkBulkAddCtx.folderIndex];
          var _op = hkBulkOpeningFor(_fo);
          if (_fo && _op != null && _op >= 0) {
            balInp.value = formatNum(_op); balInp.readOnly = true; balInp.dataset.hkSmsLocked = '1'; balInp.style.opacity = '0.9';
            var _hb = document.createElement('div'); _hb.className = 'bank-open-from-sms';
            _hb.textContent = 'از روی پیامک‌ها حساب شد: آخرین مانده ' + formatNum(_fo.latestBal) + (_op !== _fo.latestBal ? ' (منهای تراکنش‌های این ماه که الان ثبت می‌شوند)' : '') + '.';
            balInp.insertAdjacentElement('afterend', _hb);
          }
        }
      } catch (eBulkOpen) {}
      /* حساب تازه (از منوی حساب‌ها): موجودی از آخرین پیامک همان بانک خوانده می‌شود؛ کادر دستی فقط اگر پیامکی نبود */
      try {
        if (!isEdit && balInp && !balInp.dataset.hkSmsLocked && bankName && hkBankSmsPlugin()) {
          var _bl = balInp.previousElementSibling;
          var _sb = document.createElement('div'); _sb.className = 'bank-sms-bal'; _sb.textContent = 'در حال خواندن موجودی از پیامک‌های بانک…';
          var _ch = document.createElement('div'); _ch.className = 'hk-card-chips';
          var _hideMan = function (h) { balInp.style.display = h ? 'none' : ''; if (_bl) _bl.style.display = h ? 'none' : ''; };
          _hideMan(true);
          balInp.insertAdjacentElement('afterend', _sb); _sb.insertAdjacentElement('afterend', _ch);
          hkReadBankBalances(bankName).then(function (cards) {
            if (!editor.isConnected) return;
            var lbs = selectedAccountLabels(), mp = smsAccountBankMap || {};
            /* پیامکِ کهنه (بیش از ۶۰ روز) معیار موجودی امروز نیست → کادر دستی */
            cards = cards.filter(function (c) { return !(c.acc4 && mp['L4:' + c.acc4] && lbs.indexOf(mp['L4:' + c.acc4]) >= 0) && (!c.ts || Date.now() - c.ts <= 60 * 86400000); });
            if (!cards.length) { _sb.remove(); _ch.remove(); _hideMan(false); return; }
            var pick = function (c) {
              editor._smsPick = c; balInp.value = formatNum(c.balance);
              _sb.textContent = 'موجودی طبق آخرین پیامک بانک (' + hkJStr(c.j) + (c.acc4 ? '، کارت ' + toPersianDigits(c.acc4) : '') + '): ' + formatNum(c.balance);
            };
            if (cards.length === 1) { _ch.remove(); pick(cards[0]); return; }
            editor._smsNeedPick = true;
            _sb.textContent = 'چند کارت از این بانک پیامک دارد؛ کارت این حساب را انتخاب کنید:';
            hkCardChips(_ch, cards, pick);
          });
        }
      } catch (eSmsBal) {}
      /* ویرایش حساب: همگام‌سازی موجودی با آخرین پیامک */
      try {
        if (isEdit && balInp && hkBankSmsPlugin()) {
          var _sbtn = document.createElement('button'); _sbtn.type = 'button'; _sbtn.className = 'bank-sync-btn'; _sbtn.textContent = 'همگام‌سازی با آخرین پیامک';
          var _sch = document.createElement('div'); _sch.id = 'bankSyncChips'; _sch.className = 'hk-card-chips'; _sch.style.display = 'none';
          var _after = (balInp.nextElementSibling && balInp.nextElementSibling.classList.contains('bank-open-mismatch')) ? balInp.nextElementSibling : balInp;
          _after.insertAdjacentElement('afterend', _sbtn); _sbtn.insertAdjacentElement('afterend', _sch);
          _sbtn.onclick = function (ev) { ev.stopPropagation(); hkSyncAccountWithSms(acc, _sbtn); };
        }
      } catch (eSync) {}
      if (balInp) {
        balInp.addEventListener('input', function() {
          if (balInp.readOnly) return;
          const digits = toEnglishDigits(balInp.value || '').replace(/[^0-9]/g, '');
          if (!digits) { balInp.value = ''; return; }
          balInp.value = formatNum(parseInt(digits, 10) || 0);
        });
        if (isEdit) {
          balInp.readOnly = true;
          balInp.title = 'برای ویرایش دوبار ضربه بزنید';
          balInp.addEventListener('dblclick', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            askConfirm('تغییر موجودی، روی موجودی‌های محاسبه‌شده پس از این تاریخ تأثیر می‌گذارد. ادامه؟', function() {
              balInp.readOnly = false;
              balInp.style.opacity = '1';
              balInp.style.cursor = 'text';
              try { balInp.focus(); caretToEnd(balInp); } catch (eF) {}
            });
          });
        }
      }
      /* ویرایش: فوکوس خودکار روی نام نه (تا دوبار زدن روی مبلغ بدون لمس اضافه کار کند) */
      if (!isEdit) { try { inp.focus(); caretToEnd(inp); } catch (e) {} }
      /* تا باکس باز است، ارتفاع صفحهٔ حساب‌ها پشتش قفل شود تا باز شدن کیبورد آن را تکان ندهد */
      /* صفحهٔ حساب‌ها پشت باکس: موقعیت و اندازه‌اش با پیکسل ثابت قفل شود (نه وسط‌چین وابسته به ارتفاع صفحه)،
         تا وقتی کیبورد باز می‌شود و ارتفاع صفحه عوض می‌شود، تکان نخورد */
      const _bgLock = (function () {
        try {
          var bm = document.getElementById('bankAccountsModal'); var bx = bm && bm.querySelector('.modal-box');
          if (!bm || !bx || !bm.classList.contains('open')) return null;
          var r = bx.getBoundingClientRect();
          if (!(r.height > 0)) return null;
          var saved = { bx: bx, css: bx.getAttribute('style') || '' };
          bx.style.setProperty('position', 'fixed', 'important');
          bx.style.setProperty('top', r.top + 'px', 'important');
          bx.style.setProperty('left', r.left + 'px', 'important');
          bx.style.setProperty('width', r.width + 'px', 'important');
          bx.style.setProperty('height', r.height + 'px', 'important');
          bx.style.setProperty('max-height', r.height + 'px', 'important');
          bx.style.setProperty('margin', '0', 'important');
          bx.style.setProperty('transform', 'none', 'important');
          return saved;
        } catch (eL) { return null; }
      })();
      const closeEd = () => {
        try { editor.remove(); } catch (e) {}
        const d = document.getElementById('bankEditorDim');
        if (d) d.style.display = 'none';
        try { if (_bgLock) { if (_bgLock.css) _bgLock.bx.setAttribute('style', _bgLock.css); else _bgLock.bx.removeAttribute('style'); } } catch (eU) {}
      };
      editor._hkClose = closeEd;
      dim.onclick = closeEd;
      editor.querySelector('#bankAddCancel').onclick = (e) => { e.stopPropagation(); closeEd(); };
      // پیش‌فرض نام غیرتکراری در باکس (قابل ویرایش)
      if (!isEdit && defaultLabel) {
        let cand = defaultLabel;
        let n = 1;
        while (selectedBankAccounts.some(a => accountLabel(a) === cand)) {
          cand = defaultLabel + ' ' + toPersianDigits(String(n));
          n++;
        }
        inp.value = cand;
      } else if (!isEdit) {
        const base0 = (bankName || '').replace(/^بانک\s+/u, '') || 'حساب';
        let cand = base0;
        let n = 1;
        while (selectedBankAccounts.some(a => accountLabel(a) === cand)) {
          cand = base0 + ' ' + toPersianDigits(String(n));
          n++;
        }
        inp.value = cand;
      }
      if (!isEdit) { try { inp.focus(); caretToEnd(inp); } catch (e) {} }
      /* لمس کادر مبلغ: اگر نام در حال تایپ است، اول از آن خارج شو تا دوبار زدن روی مبلغ فوراً کار کند */
      if (balInp) balInp.addEventListener('pointerdown', function () { try { if (document.activeElement === inp) inp.blur(); } catch (eB) {} });
      /* لمس هر جای خالی باکس: نشانگر از نام خارج شود (کیبورد بسته شود) */
      editor.addEventListener('pointerdown', function (ev) {
        try {
          var t = ev.target;
          if (t && t.closest && t.closest('input, textarea, button, select, .hk-info-btn')) return;
          var ae = document.activeElement;
          if (ae && editor.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) ae.blur();
        } catch (eE) {}
      });
      /* لمس بیرون باکس وقتی نام در حال تایپ است: اول فقط کیبورد بسته شود، باکس نه */
      var _typingAtDown = false;
      dim.onpointerdown = function () {
        try { var ae = document.activeElement; _typingAtDown = !!(ae && editor.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && !ae.readOnly); } catch (eP) { _typingAtDown = false; }
      };
      dim.onclick = function () {
        if (_typingAtDown) { _typingAtDown = false; try { document.activeElement && document.activeElement.blur(); } catch (eD) {} return; }
        closeEd();
      };
      editor.querySelector('#bankAddOk').onclick = (e) => {
        e.stopPropagation();
        const name = (inp.value || '').trim();
        if (!name) { showToast('نام حساب را وارد کنید'); return; }
        const balDigits = toEnglishDigits((balInp && balInp.value) || '').replace(/[^0-9]/g, '');
        const openingBalance = balDigits ? (parseInt(balDigits, 10) || 0) : 0;
        if (isEdit) {
          const exists = selectedBankAccounts.some((a, i) => i !== idx && accountLabel(a) === name);
          if (exists) { showToast('نام تکراریست'); return; }
          const oldLabelForMigrate = accountLabel(acc);
          /* تغییر موجودی اولیه → موجودی‌های اول‌ماهِ ذخیره‌شده هم هم‌گام شوند (با نمایش دقیق و تأیید) */
          var _syncPlan = null;
          try { if (openingBalance !== (Number(acc.openingBalance) || 0)) _syncPlan = planAccountOpeningSync(acc, oldLabelForMigrate, openingBalance); } catch (ePl) { _syncPlan = null; }
          const _doEditSave = () => {
            acc.label = name;
            /* قبلاً فقط نام عوض می‌شد و موجودی اولیهٔ ثبت‌شده با نام قدیم «یتیم» می‌ماند (دوبار شمرده می‌شد) */
            try { if (oldLabelForMigrate && oldLabelForMigrate !== name) { saveBankAccountsSelection(); migrateAccountLabel(oldLabelForMigrate, name); } } catch (eMig) {}
            acc.openingBalance = openingBalance;
            if (!acc.createdAt || !acc.createdAt.y) {
              try {
                var _tEdit = getTodayPersian();
                acc.createdAt = { y: _tEdit.y, m: _tEdit.m, d: _tEdit.d };
              } catch (eE) {}
            }
            try { if (_syncPlan && _syncPlan.changes.length) applyAccountOpeningSync(name, _syncPlan); } catch (eAp) {}
            saveBankAccountsSelection();
            closeEd();
            renderBankAccountsList();
            try { renderHomeCards(); } catch (eR) {}
            try { updateHomeBalanceCircle(); } catch (eU) {}
            if (_syncPlan && _syncPlan.changes.length) showToast('موجودی اولیه و موجودی‌های بعد از آن به‌روز شد');
          };
          if (_syncPlan && _syncPlan.changes.length) {
            const d = _syncPlan.delta, first = _syncPlan.changes[0];
            const msg = 'موجودی اول ' + MONTHS[first.m - 1] + ' ' + toPersianDigits(String(first.y)) + ' این حساب از ' + formatNum(first.from) + ' به ' + formatNum(first.to) + ' تغییر می‌کند' +
              (_syncPlan.changes.length > 1 ? ' و موجودی اول ' + toPersianDigits(String(_syncPlan.changes.length - 1)) + ' ماه بعد هم به همین اندازه جابه‌جا می‌شود' : '') +
              '؛ موجودی فعلی حساب ' + formatNum(Math.abs(d)) + (d > 0 ? ' بیشتر' : ' کمتر') + ' می‌شود. ادامه؟';
            askConfirm(msg, () => { try { safetyBackupThen('bank-opening', _doEditSave); } catch (eB) { _doEditSave(); } });
            return;
          }
          _doEditSave();
          return;
        } else {
          const exists = selectedBankAccounts.some(a => accountLabel(a) === name);
          if (exists) { showToast('نام تکراریست'); return; }
          if (editor._smsNeedPick && !editor._smsPick) { showToast('کارت این حساب را انتخاب کنید'); return; }
          if (editor._smsPick && editor._smsPick.acc4) { try { smsAccountBankMap['L4:' + editor._smsPick.acc4] = name; saveSmsAccountBankMap(); } catch (eMp) {} }
          var _tNew = getTodayPersian();
          selectedBankAccounts.push({
            id: 'ba_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            bank: bankName,
            label: name,
            openingBalance: openingBalance,
            createdAt: { y: _tNew.y, m: _tNew.m, d: _tNew.d }
          });
        }
        saveBankAccountsSelection();
        closeEd();
        renderBankAccountsList();
        try { renderHomeCards(); } catch (eR) {}
        if (!isEdit) showToast('حساب اضافه شد');
        /* حساب از داخل باکس پیامک ساخته شد → بعد از بستن منوی حساب، همین حساب در باکس پیامک انتخاب شود */
        if (!isEdit && window._returnToSmsConfirm) window._hkSmsNewAccLabel = name;
        if (!isEdit && window._returnToBulk && _hkBulk && window._hkBulkAddCtx) {
          _hkBulk.newAccs[name] = true;
          var _bf = _hkBulk.folders[window._hkBulkAddCtx.folderIndex];
          if (_bf) { _bf.account = name; _bf.checked = true; }
        }
        /* به‌روزرسانی منوی پیامک فقط بعد از بستن منوی حساب (closeBankAccountsModal) */
      };
    }

    
    /* —— یادآورهای کاربر —— */
    let userReminders = [];
    function loadUserReminders() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_userReminders');
        userReminders = raw ? (JSON.parse(raw) || []) : [];
        if (!Array.isArray(userReminders)) userReminders = [];
      } catch (e) { userReminders = []; }
    }
    function saveUserReminders() {
      var ok = hkStorageSet(STORAGE_KEY + '_userReminders', JSON.stringify(userReminders || []));
      try { scheduleNativeReminders(); } catch (eS) {}
      /* ۱.۳.۷۷: اسلاید یادآورها همان لحظه به‌روز شود */
      try { clearTimeout(window._hkRemSpT); window._hkRemSpT = setTimeout(function () { try { var t = hkMainTitle(); var st = _smartPanelState[t]; renderHomeCards(); } catch (eR) {} }, 60); } catch (eRs) {}
      return ok;
    }
    /* نوتیف سیستمی یادآورها (افزونهٔ نیتیو HkReminders): برای ماه‌های آینده هم زمان‌بندی می‌شود
       و بعد از ری‌استارت گوشی دوباره تنظیم می‌گردد؛ با هر بار باز شدن نرم‌افزار از نو محاسبه می‌شود */
    var _nrTimer = 0;
    function reminderNotifyPlan(nowMs) {
      var now = nowMs || Date.now(), out = [], horizon = now + 400 * 86400000;
      var hash = function (str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return (Math.abs(h) % 2000000000) + 1000; };
      var at9 = function (y, m, d, minusDays) {
        var g = persianToDate(y, m, d);
        if (!g) return 0;
        var dt = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate() - (minusDays || 0), 9, 0, 0, 0);
        return dt.getTime();
      };
      ((typeof hkPrefs === 'function' && hkPrefs().nRemind === false) ? [] : (userReminders || [])).forEach(function (r) {
        if (!r) return;
        var y = parseInt(r.y, 10), m = parseInt(r.m, 10), d = parseInt(r.d, 10) || 1;
        if (!y || !m) return;
        var advN = parseInt(r.advanceDays, 10), adv = isNaN(advN) ? 7 : Math.max(0, advN);
        var title = (r.title || 'یادآور').trim();
        for (var k = 0; k < 14; k++) {
          var dd = Math.min(d, daysInMonth(y, m));
          var due = at9(y, m, dd, 0);
          if (due && due > horizon) break;
          var dueLbl = toPersianDigits(dd) + ' ' + MONTHS[m - 1] + ' ' + toPersianDigits(y);
          if (due && due > now + 30000) out.push({ id: hash((r.id || title) + '|' + y + '-' + m + '-' + dd + '|due'), at: due, target: 'reminders', title: 'یادآور: ' + title, body: 'امروز سررسید است (' + dueLbl + ')' + (r.note ? ' — ' + r.note : '') });
          if (adv > 0) {
            var pre = at9(y, m, dd, adv);
            if (pre && pre > now + 30000) out.push({ id: hash((r.id || title) + '|' + y + '-' + m + '-' + dd + '|pre'), at: pre, target: 'reminders', title: 'یادآور: ' + title, body: toPersianDigits(adv) + ' روز تا سررسید (' + dueLbl + ')' + (r.note ? ' — ' + r.note : '') });
          }
          if (r.repeat === 'monthly') { m++; if (m > 12) { m = 1; y++; } }
          else if (r.repeat === 'yearly') { y++; }
          else break;
        }
      });
      /* اقساط: روز سررسید و ۳ روز قبلش، ساعت ۹ صبح (لمس نوتیف → منوی اقساط) */
      try {
        (typeof plans !== 'undefined' && Array.isArray(plans) && HK_INSTALLMENTS_ON ? plans : []).forEach(function (pl) {
          if (!pl || pl.deletedAt) return;
          var cnt = Math.max(0, parseInt(pl.count, 10) || 0), paid = Math.max(0, parseInt(pl.paidCount, 10) || 0);
          var nm = (pl.name || pl.title || 'قسط').trim();
          for (var i = paid, n = 0; i < cnt && n < 6; i++) {
            if (pl.paidEarlyMap && pl.paidEarlyMap[String(i)]) continue;
            var du = null; try { du = dueDateForInstallment(pl, i); } catch (eD) { du = null; }
            if (!du || !du.y) continue;
            var dAt = at9(du.y, du.m, du.d, 0);
            if (dAt && dAt > horizon) break;
            n++;
            var lbl = toPersianDigits(du.d) + ' ' + MONTHS[du.m - 1];
            var amtTxt = Number(pl.amount) > 0 ? ' — ' + formatNum(Number(pl.amount)) + ' تومان' : '';
            if (dAt && dAt > now + 30000) out.push({ id: hash('plan|' + (pl.id || nm) + '|' + i + '|due'), at: dAt, target: 'install', title: 'قسط: ' + nm, body: 'امروز سررسید قسط ' + toPersianDigits(i + 1) + ' است (' + lbl + ')' + amtTxt });
            var pAt = at9(du.y, du.m, du.d, 3);
            if (pAt && pAt > now + 30000) out.push({ id: hash('plan|' + (pl.id || nm) + '|' + i + '|pre'), at: pAt, target: 'install', title: 'قسط: ' + nm, body: '۳ روز تا سررسید قسط ' + toPersianDigits(i + 1) + ' (' + lbl + ')' + amtTxt });
          }
        });
      } catch (ePl) {}
      out.sort(function (a, b) { return a.at - b.at; });
      return out.slice(0, 60);
    }
    /* لمس نوتیف قسط/یادآور در گوشی → همان منو باز شود */
    function hkTakeLaunchTarget() {
      try {
        var C = window.Capacitor, P = C && C.Plugins && C.Plugins.HkReminders;
        if (!P || typeof P.takeLaunchTarget !== 'function') return;
        P.takeLaunchTarget().then(function (r) {
          var t = r && r.target;
          if (t === 'install') { try { switchTabFromMenu('install'); } catch (e1) {} }
          else if (t === 'reminders') { try { openUserRemindersModal(); } catch (e2) {} }
        }).catch(function () {});
      } catch (e) {}
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(hkTakeLaunchTarget, 400); });
    setTimeout(hkTakeLaunchTarget, 3200);
    function scheduleNativeReminders() {
      clearTimeout(_nrTimer);
      _nrTimer = setTimeout(function () {
        try {
          var C = window.Capacitor, P = C && C.Plugins && C.Plugins.HkReminders;
          if (!P || typeof P.schedule !== 'function') return;
          if (!userReminders || !userReminders.length) loadUserReminders();
          P.schedule({ items: reminderNotifyPlan() }).catch(function () {});
        } catch (e) {}
      }, 400);
    }
    (function () {
      function go() { try { loadUserReminders(); scheduleNativeReminders(); } catch (e) {} }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 2500); });
      else setTimeout(go, 2500);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) go(); });
    })();
    /* یادآورهایی که نشان عددی داشتند: استروک قرمز چرخان (مثل اقساط) تا وقتی منو باز است */
    var _remindFlash = {};
    function openUserRemindersModal() {
      try { closeSideMenu(); } catch (e) {}
      try {
        var _seenR = {}; (JSON.parse(localStorage.getItem(REMIND_SEEN_KEY) || '[]') || []).forEach(function (k) { _seenR[k] = 1; });
        _remindFlash = {};
        remindAlertKeys().forEach(function (k) { if (!_seenR[k]) _remindFlash[k.slice(0, k.lastIndexOf(':'))] = 1; });
      } catch (eF) { _remindFlash = {}; }
      try { markRemindAlertsSeen(); } catch (eS) {}
      loadUserReminders();
      renderUserRemindersList();
      const m = document.getElementById('userRemindersModal');
      if (m) m.classList.add('open');
    }
    function closeUserRemindersModal() {
      _remindFlash = {};
      try { document.querySelectorAll('#userRemindersModal .ur-item.ur-alert').forEach(function (c) { c.classList.remove('ur-alert'); }); } catch (eC) {}
      const m = document.getElementById('userRemindersModal');
      if (m) m.classList.remove('open');
    }
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
          '<div>دریافت نشده<br><b style="color:var(--unpaid-c, #e6b12c);">' + toPersianDigits(String(unpaid.length)) + '</b></div>' +
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
