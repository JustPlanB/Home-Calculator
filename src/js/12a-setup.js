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
          var _bad = _ic.some(function (c) { return hkInstAlert(c); });
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
            r0.innerHTML = '<div class="nm"><b>' + escapeHtml(hkInstName(c)) + (hkInstAlert(c, s0) ? ' <i class="hk-inst-dot"></i>' : '') + '</b><div class="hk-acc-hint">' + escapeHtml(c.bank || '') + (c.bank ? '<i>|</i>' : '') + '<span dir="ltr">' + toPersianDigits(c.id) + '</span></div></div><div class="st">' + hkInstStatusHtml(s0, true) + '</div>';
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
