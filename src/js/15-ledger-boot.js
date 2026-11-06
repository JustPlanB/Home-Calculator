    /* ===== ۱.۳.۵۶: قرض پیوسته =====
       هر ردیف در ماهِ تاریخ خودش ذخیره می‌شود (r.ly / r.lm / r.day)؛ جدول هر رابطه همهٔ ردیف‌های همان ماه + ردیف‌های
       تسویه‌نشدهٔ ماه‌های قبل را پشت‌سرهم نشان می‌دهد. «تسویه شد» ردیف را نگه می‌دارد ولی از جمع‌ها بیرون می‌برد */
    var _ledViewMap = {}, _ledFresh = new WeakSet();
    function hkLedKey(r, y, m) { var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10) || 0; if (!d) return 99999999; return (parseInt(r.ly, 10) || y) * 10000 + (parseInt(r.lm, 10) || m) * 100 + d; }
    function hkLedHasData(r) { return !!(r && !r.deletedAt && (Number(r.amount) || String(r.desc || '').trim())); }
    function hkLedCarried(secId) {
      var curN = currentYear * 100 + currentMonth, curK = periodKey(currentYear, currentMonth), out = [];
      Object.keys(archive || {}).forEach(function (k) {
        if (k === curK) return;
        var p = String(k).split('-'), y = +p[0], m = +p[1];
        if (!(y * 100 + m < curN)) return;
        var pd = archive[k];
        ((pd && pd.ledger && pd.ledger.sections) || []).forEach(function (s) {
          if (!s || s.id !== secId) return;
          (s.rows || []).forEach(function (r) {
            /* تسویه‌شده تا همان ماهی که تسویه شد دیده می‌شود (با تیک)، بعد از آن نه */
            if (!hkLedHasData(r) || (r.settled && !((parseInt(r.settledN, 10) || 0) >= curN))) return;
            out.push({ row: r, sec: s, pd: pd, k: k, y: y, m: m });
          });
        });
      });
      return out;
    }
    function hkLedViewRows(sec) {
      var curK = periodKey(currentYear, currentMonth);
      var own = (sec.rows || []).map(function (r) { return { row: r, sec: sec, pd: periodData, k: curK, y: currentYear, m: currentMonth }; });
      var all = hkLedCarried(sec.id).concat(own);
      return all.map(function (x, i) { x.i = i; return x; }).sort(function (a, b) { return (hkLedKey(a.row, a.y, a.m) - hkLedKey(b.row, b.y, b.m)) || (hkTimeCmp(a.row, b.row) || a.i - b.i); });
    }
    function hkLedResolve(secId, idx) {
      var v = _ledViewMap[secId];
      if (v && v[idx]) return v[idx];
      var sec = (ensureLedger().sections || []).find(function (s) { return s.id === secId; });
      return (sec && sec.rows && sec.rows[idx]) ? { row: sec.rows[idx], sec: sec, pd: periodData, k: periodKey(currentYear, currentMonth), y: currentYear, m: currentMonth } : null;
    }
    function hkLedDateNum(r, y, m) {
      var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10) || 0; if (!d) return '';
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      return toPersianDigits(String(parseInt(r.ly, 10) || y)) + '/' + p2(parseInt(r.lm, 10) || m) + '/' + p2(d);
    }
    function hkLedDateText(r, y, m) {
      var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10) || 0; if (!d) return '';
      var yy = parseInt(r.ly, 10) || y, mm = parseInt(r.lm, 10) || m;
      return toPersianDigits(String(d)) + ' ' + (MONTHS[mm - 1] || '') + (yy !== currentYear ? ' ' + toPersianDigits(String(yy).slice(2)) : '');
    }
    /* انتقال ردیف به ماه تاریخش (همان رابطه) */
    function hkLedPlace(x) {
      var r = x.row, y = parseInt(r.ly, 10) || x.y, m = parseInt(r.lm, 10) || x.m;
      if (y === x.y && m === x.m) return false;
      var tk = periodKey(y, m), tpd = (y === currentYear && m === currentMonth) ? periodData : recMonthData(recMonthKey(y, m), true);
      if (!tpd.ledger || !Array.isArray(tpd.ledger.sections)) tpd.ledger = { sections: [], nextId: 1 };
      var ts = tpd.ledger.sections.find(function (s) { return s && s.id === x.sec.id; });
      if (!ts) { ts = { id: x.sec.id, personA: x.sec.personA || '', personB: x.sec.personB || '', collapsed: false, rows: [] }; tpd.ledger.sections.push(ts); }
      if (!Array.isArray(ts.rows)) ts.rows = [];
      ts.rows = ts.rows.filter(hkLedHasData);
      var i = x.sec.rows.indexOf(r); if (i >= 0) x.sec.rows.splice(i, 1);
      ts.rows.push(r);
      return true;
    }
    /* باکس جمع‌وجور انتخاب تاریخ (چرخ‌های همان باکس ویرایش ردیف) */
    function hkLedDatePick(init, onPick) {
      var old = document.getElementById('hkLedDate'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkLedDate'; ov.className = 'hk-re-ov'; ov.setAttribute('data-hk-back', '1');
      var box = document.createElement('div'); box.className = 'hk-re-box hk-led-date-box';
      box.innerHTML = '<div class="hk-re-title">تاریخ</div>';
      var years = []; for (var yy = 1390; yy <= 1420; yy++) years.push(yy);
      var days = []; for (var dd = 1; dd <= 31; dd++) days.push(toPersianDigits(String(dd)));
      var wrap = document.createElement('div'); wrap.className = 'hk-re-wheels';
      var lab = document.createElement('div'); lab.className = 'hk-led-date-greg'; lab.dir = 'ltr';
      var upd = function () { try { lab.textContent = hkGregStr(years[wY.getIndex()], wM.getIndex() + 1, wD.getIndex() + 1); } catch (e) {} };
      var wD = hkWheel(days, Math.max(0, (init.d || 1) - 1), upd), wM = hkWheel(MONTHS.slice(), (init.m || 1) - 1, upd), wY = hkWheel(years.map(function (v) { return toPersianDigits(String(v)); }), Math.max(0, years.indexOf(init.y)), upd);
      wrap.appendChild(wD); wrap.appendChild(wM); wrap.appendChild(wY);
      box.appendChild(wrap); box.appendChild(lab);
      var btns = document.createElement('div'); btns.className = 'hk-re-btns';
      btns.innerHTML = '<button type="button" class="hk-re-ok">ثبت</button><button type="button" class="hk-re-no">انصراف</button>';
      box.appendChild(btns); ov.appendChild(box); document.body.appendChild(ov);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      btns.querySelector('.hk-re-no').onclick = close;
      btns.querySelector('.hk-re-ok').onclick = function () {
        var m = wM.getIndex() + 1, d = Math.min(wD.getIndex() + 1, recMonthLen(m));
        close(); onPick({ y: years[wY.getIndex()], m: m, d: d });
      };
      requestAnimationFrame(function () { [wD, wM, wY].forEach(function (w) { w._init(); }); upd(); });
    }
    function hkLedSetDate(secId, idx, dt) {
      var x = hkLedResolve(secId, idx); if (!x) return;
      if (!canEditRow(x.row)) { showToast(OWNERSHIP_LOCK_MSG); return; }
      x.row.day = String(dt.d); x.row.ly = dt.y; x.row.lm = dt.m; x.row.updatedAt = Date.now();
      stampRowOwner(x.row);
      var moved = hkLedPlace(x);
      try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e) {}
      if (moved && dt.y * 100 + dt.m > currentYear * 100 + currentMonth) showToast('ردیف به ' + MONTHS[dt.m - 1] + ' ' + toPersianDigits(String(dt.y)) + ' رفت و از همان ماه دیده می‌شود');
      try { renderLedgerTab(); } catch (eR) {}
    }
    function hkLedToggleSettled(secId, idx) {
      var x = hkLedResolve(secId, idx); if (!x) return;
      if (!canEditRow(x.row)) { showToast(OWNERSHIP_LOCK_MSG); return; }
      if (x.row.settled) { delete x.row.settled; delete x.row.settledN; } else { x.row.settled = true; x.row.settledN = currentYear * 100 + currentMonth; }
      x.row.updatedAt = Date.now();
      try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e) {}
      showToast(x.row.settled ? 'تسویه شد؛ ردیف می‌ماند ولی در جمع‌ها حساب نمی‌شود' : 'از حالت تسویه برگشت');
      try { renderLedgerTab(); } catch (eR) {}
    }
    /* یک‌بار: کپی‌های تکراری ردیف‌ها که با رفتن به ماه‌های بعد ساخته شده بود برداشته و ماه هر ردیف ثبت می‌شود */
    var _hkLedMigDone = false;
    function hkLedMigOnce() {
      if (_hkLedMigDone) return; _hkLedMigDone = true;
      var flag = STORAGE_KEY + '_ledMig1356';
      try { if (localStorage.getItem(flag)) return; } catch (e) { return; }
      try {
        var curK = periodKey(currentYear, currentMonth), list = [];
        Object.keys(archive || {}).forEach(function (k) { if (k !== curK && archive[k]) list.push({ k: k, pd: archive[k] }); });
        list.push({ k: curK, pd: periodData });
        var n = function (k) { var p = String(k).split('-'); return (+p[0]) * 100 + (+p[1]); };
        list.sort(function (a, b) { return n(a.k) - n(b.k); });
        var seen = {}, changed = 0;
        list.forEach(function (it) {
          var p = String(it.k).split('-'), y = +p[0], m = +p[1];
          ((it.pd && it.pd.ledger && it.pd.ledger.sections) || []).forEach(function (s) {
            if (!s || !Array.isArray(s.rows)) return;
            var sid = s.id || ((s.personA || '') + '|' + (s.personB || ''));
            var bag = seen[sid] || (seen[sid] = {});
            var keep = [];
            s.rows.forEach(function (r) {
              if (!hkLedHasData(r)) { keep.push(r); return; }
              var sig = r.id ? 'i' + r.id : r.createdAt ? 'c' + r.createdAt + '|' + (r.createdBy || '') : 'v' + [r.day || '', r.desc || '', Number(r.amount) || 0, r.status || ''].join('|');
              if (bag[sig]) {
                var e = bag[sig]; ['day', 'desc', 'amount', 'status', 'statusPicked', 'settled', 'updatedAt', 'time'].forEach(function (f) { if (r[f] !== undefined) e[f] = r[f]; });
                changed++; return;
              }
              if (!r.ly) { r.ly = y; r.lm = m; changed++; }
              bag[sig] = r; keep.push(r);
            });
            if (keep.length !== s.rows.length) s.rows = keep.length ? keep : [emptyLedgerRow()];
          });
        });
        var anyRows = Object.keys(seen).some(function (k) { return Object.keys(seen[k]).length; });
        if (anyRows || changed) localStorage.setItem(flag, '1');
        if (changed) { persistCurrent(); saveArchive(); }
      } catch (eM) {}
    }
    function ensureLedger() {
      try { hkLedMigOnce(); } catch (eLm) {}
      if (!periodData.ledger || typeof periodData.ledger !== 'object') {
        periodData.ledger = { sections: [], nextId: 1 };
      }
      // فقط یک‌بار مهاجرت/ترمیم ساختار — بدون بازسازی مداوم آبجکت‌ها
      if (!Array.isArray(periodData.ledger.sections)) {
        periodData.ledger = normalizeLedger(periodData.ledger);
      } else {
        if (!periodData.ledger.nextId) {
          periodData.ledger.nextId = periodData.ledger.sections.length + 1;
        }
        periodData.ledger.sections.forEach(s => {
          if (!s.id) s.id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          if (!Array.isArray(s.rows)) s.rows = [];
          if (s.collapsed !== true && s.collapsed !== false) {
            const hasData = (s.rows || []).some(r => r.desc || r.amount || r.day) ||
              (s.personA || '').trim() || (s.personB || '').trim();
            s.collapsed = !hasData;
          }
        });
      }
      return periodData.ledger;
    }

    function ledgerSectionTitle(sec) {
      const a = (sec.personA || '').trim();
      const b = (sec.personB || '').trim();
      if (a && b) return a + ' ↔ ' + b;
      if (a || b) return (a || b) + ' ↔ …';
      return 'نام دو نفر…';
    }

    function addLedgerSection() {
      closeRemindBarIfOpen();
      const led = ensureLedger();
      const sec = emptyLedgerSection();
      sec.id = 'l' + (led.nextId || 1);
      led.nextId = (led.nextId || 1) + 1;
      sec.collapsed = true;
      stampRowOwner(sec);
      led.sections.push(sec);
      pendingRenameLedgerId = sec.id;
      persistCurrent();
      renderLedgerTab();
      scheduleSave();
    }

    let pendingRenameLedgerId = null;

    function deleteLedgerSection(secId) {
      const led0 = ensureLedger();
      const sec0 = (led0.sections || []).find(s => s.id === secId);
      if (sec0 && !canEditRow(sec0)) { showToast(OWNERSHIP_LOCK_MSG); return; }
      askConfirm('این رابطه حذف شود؟', () => {
        /* ۱.۳.۶۶: رابطه از همهٔ ماه‌ها برداشته می‌شود (یک بستهٔ سطل زباله) + نشان «حذف‌شده» تا از ماه قبل دوباره نیاید */
        const cur = periodKey(currentYear, currentMonth), months = {};
        try {
          Object.keys(archive || {}).forEach(k => {
            const pd = k === cur ? periodData : archive[k];
            const s = pd && pd.ledger && Array.isArray(pd.ledger.sections) && pd.ledger.sections.find(x => x && x.id === secId);
            if (s) months[k] = JSON.parse(JSON.stringify(s));
          });
          const ledT = ensureLedger();
          const secT = ledT.sections.find(s => s.id === secId);
          if (secT) months[cur] = JSON.parse(JSON.stringify(secT));
          const first = secT || months[Object.keys(months)[0]];
          if (first) pushToTrash('ledger_section', first.title || ((first.personA || '') + (first.personB ? ' / ' + first.personB : '')) || 'بده‌بستان', { sourceLabel: 'بده‌بستان', section: JSON.parse(JSON.stringify(first)), months: months, curKey: cur });
        } catch (e) {}
        Object.keys(archive || {}).forEach(k => {
          const pd = archive[k];
          if (pd && pd.ledger && Array.isArray(pd.ledger.sections)) pd.ledger.sections = pd.ledger.sections.filter(s => !s || s.id !== secId);
        });
        const led = ensureLedger();
        led.sections = led.sections.filter(s => s.id !== secId);
        hkLedGoneSet(secId, true);
        persistCurrent();
        renderLedgerTab();
        scheduleSave();
      });
    }
    /* شناسهٔ رابطه‌های حذف‌شده (فقط برای جلوگیری از برگشتِ خودکار از ماه‌های قبل یا همگام‌سازی) */
    function hkLedGone() {
      try { const a = JSON.parse(localStorage.getItem(STORAGE_KEY + '_ledGone') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function hkLedGoneSet(id, on) {
      if (!id) return;
      try {
        let a = hkLedGone().filter(x => x !== id);
        if (on) a.push(id);
        if (a.length > 400) a = a.slice(-400);
        localStorage.setItem(STORAGE_KEY + '_ledGone', JSON.stringify(a));
      } catch (e) {}
    }

    function sortLedgerSectionRows(secId) {
      const led = ensureLedger();
      const sec = (led.sections || []).find(s => s.id === secId);
      if (!sec) return;
      sec.rows = sec.rows
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          const da = hkLedKey(a.r, currentYear, currentMonth), db = hkLedKey(b.r, currentYear, currentMonth);
          if (da !== db) return da - db;
          return hkTimeCmp(a.r, b.r) || a.i - b.i;
        })
        .map(x => x.r);
    }
    function scheduleLedgerRowSort(secId, row, tr) {
      const attempt = () => {
        try {
          const active = document.activeElement;
          if (tr && active && tr.contains(active)) { setTimeout(attempt, 280); return; }
          if (active && active.classList && active.classList.contains('unlocked')) { setTimeout(attempt, 280); return; }
          if (document.querySelector('.dark-select-list.open')) { setTimeout(attempt, 280); return; }
          // منوی وضعیت باز است — rebuild نکن (event listener سلول از بین می‌رود)
          if (document.querySelector('.status-menu')) { setTimeout(attempt, 280); return; }
        } catch (e) {}
        if (!(row && row.day && row.amount)) return;
        sortLedgerSectionRows(secId);
        renderLedgerTab();
        scheduleSave();
      };
      setTimeout(attempt, 280);
    }
    function focusLedgerNewRowDay(secId, countBack) {
      const container = document.getElementById('sections-ledger');
      if (!container) return false;
      const sectionEl = container.querySelector('.section[data-sec-id="' + secId + '"]');
      if (!sectionEl) return false;
      if (sectionEl._hkLedBuild) sectionEl._hkLedBuild();
      sectionEl.classList.remove('collapsed');
      const rows = sectionEl.querySelectorAll('tbody tr');
      const idx = Math.max(0, rows.length - Math.max(1, countBack || 1));
      const target = rows[idx];
      if (!target) return false;
      const dayInp = target.querySelector('.day-input, input.cell');
      if (!dayInp) return false;
      try { lockField(dayInp, false); } catch (e) {
        dayInp.classList.remove('is-empty', 'locked');
        dayInp.classList.add('unlocked');
        if (dayInp.tagName !== 'SELECT') dayInp.readOnly = false;
      }
      try { dayInp.focus({ preventScroll: true }); } catch (e) {
        try { dayInp.focus({ preventScroll: true }); } catch (e2) {}
      }
      // صفحه جابه‌جا نشود
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 100);
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 250);
      return true;
    }

    function addLedgerRow(secId, count) {
      closeRemindBarIfOpen();
      const led = ensureLedger();
      const sec = led.sections.find(s => s.id === secId);
      if (!sec) return;
      const n = Math.max(1, Math.min(5, parseInt(count, 10) || 1));
      /* ۱.۳.۵۸: ردیف تازه تاریخ امروز را می‌گیرد (در ماه دیگر: اول همان ماه) */
      const _t0 = getTodayPersian(), _isCur = currentYear === _t0.y && currentMonth === _t0.m;
      for (let i = 0; i < n; i++) { const nr = Object.assign(emptyLedgerRow(), { day: String(_isCur ? _t0.d : 1), ly: currentYear, lm: currentMonth }); _ledFresh.add(nr); sec.rows.push(nr); }
      sec.collapsed = false;
      // بدون فوکوس خودکار روی روز — فقط ردیف اضافه شود، باکس ثابت بماند
      try {
        const wrap = document.getElementById('sections-ledger');
        const prevScroll = wrap ? wrap.scrollTop : 0;
        const bodyEl = document.querySelector('#sections-ledger .section[data-id="' + secId + '"] .section-body')
          || document.querySelector('#sections-ledger .section .section-body');
        const bodyScroll = bodyEl ? bodyEl.scrollTop : 0;
        renderLedgerTab();
        requestAnimationFrame(() => {
          try {
            const w2 = document.getElementById('sections-ledger');
            if (w2) w2.scrollTop = prevScroll;
            const b2 = document.querySelector('#sections-ledger .section[data-id="' + secId + '"] .section-body');
            if (b2) b2.scrollTop = bodyScroll;
          } catch (e) {}
        });
      } catch (e) {
        renderLedgerTab();
      }
      scheduleSave();
    }

    function deleteLedgerRow(secId, idx) {
      const x0 = hkLedResolve(secId, idx);
      const row0 = x0 && x0.row;
      if (row0 && !canEditRow(row0)) { showToast(OWNERSHIP_LOCK_MSG); return; }
      askConfirm('این ردیف حذف شود؟', () => {
        try {
          if (row0) pushToTrash('ledger_row', row0.desc || 'ردیف بده‌بستان', { sourceLabel: 'بده‌بستان', sectionId: secId, row: JSON.parse(JSON.stringify(row0)) });
        } catch (e) {}
        /* ۱.۳.۵۶: ردیف ممکن است در ماه دیگری (ردیف منتقل‌شده) باشد */
        const sec = x0 && x0.sec;
        if (!sec) return;
        idx = sec.rows.indexOf(row0);
        if (idx < 0) return;
        const row = sec.rows[idx];
        if (row && row.id && sharedAccountId) {
          row.deletedAt = Date.now();
          row.updatedAt = Date.now();
          try {
            enqueueSync('delete_record', {
              id: row.id,
              kind: 'ledger_row',
              period_key: periodKey(currentYear, currentMonth),
              section_id: sec.id || secId,
              section_title: ledgerSectionTitle(sec),
              created_by: row.createdBy || currentUserId(),
              deleted_at: new Date(row.deletedAt).toISOString(),
              payload: row
            });
          } catch (e) {}
          sec.rows.splice(idx, 1);
        } else sec.rows.splice(idx, 1);
        renderLedgerTab();
        scheduleSave();
      });
    }

    function updateLedgerRowField(secId, idx, field, raw) {
      const _x = hkLedResolve(secId, idx);
      if (!_x || !_x.row) return;
      const row = _x.row;
      if (!canEditRow(row)) { showToast(OWNERSHIP_LOCK_MSG); return; }
      if (field === 'amount') {
        row.amount = typeof raw === 'number' ? raw : (parseAmount(raw) || 0);
      } else if (field === 'day') {
        let d = parseInt(toEnglishDigits(String(raw || '')).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (d < 0) d = 0;
        if (d > 31) d = 31;
        row.day = d ? String(d) : '';
        if (d && !row.ly) { row.ly = _x.y; row.lm = _x.m; }
      } else if (field === 'status') {
        row.status = (raw === 'credit') ? 'credit' : 'debt';
        if (row.status === 'debt') row.statusPicked = true;
      } else {
        row[field] = String(raw || '');
      }
      if (row.day || row.desc || row.amount) stampRowOwner(row);
      scheduleSave();
      renderLedgerSummaryOnly();
    }

    function ledgerPeopleList() {
      const set = new Set();
      ensureLedger().sections.forEach(sec => {
        const a = (sec.personA || '').trim();
        const b = (sec.personB || '').trim();
        if (a) set.add(a);
        if (b) set.add(b);
      });
      return Array.from(set).sort((x, y) => x.localeCompare(y, 'fa'));
    }

    function ledgerPairNets() {
      const nets = {};
      ensureLedger().sections.forEach(sec => {
        const a = (sec.personA || '').trim();
        const b = (sec.personB || '').trim();
        if (!a || !b || a === b) return;
        hkLedViewRows(sec).map(x => x.row).forEach(r => {
          const amt = Number(r.amount) || 0;
          if (!amt || r.settled || r.deletedAt) return;
          if (r.status === 'credit') {
            const key = b + '\t' + a;
            nets[key] = (nets[key] || 0) + amt;
          } else {
            const key = a + '\t' + b;
            nets[key] = (nets[key] || 0) + amt;
          }
        });
      });
      const merged = {};
      Object.keys(nets).forEach(key => {
        const parts = key.split('\t');
        const a = parts[0], b = parts[1];
        const amt = nets[key];
        const rev = b + '\t' + a;
        if (merged[rev] !== undefined) merged[rev] -= amt;
        else if (merged[key] !== undefined) merged[key] += amt;
        else merged[key] = amt;
      });
      const out = [];
      Object.keys(merged).forEach(key => {
        let amt = merged[key];
        if (!amt) return;
        const parts = key.split('\t');
        let debtor = parts[0], creditor = parts[1];
        if (amt < 0) {
          amt = -amt;
          const t = debtor; debtor = creditor; creditor = t;
        }
        out.push({ debtor: debtor, creditor: creditor, amount: amt });
      });
      out.sort((x, y) => (x.debtor + x.creditor).localeCompare(y.debtor + y.creditor, 'fa'));
      return out;
    }

    function renderLedgerFilters() {
      const filters = document.getElementById('ledgerFilters');
      if (!filters) return;
      /* ۱.۳.۴۷: فیلتر نام افراد برداشته شد */
      filters.innerHTML = ''; filters.style.display = 'none'; ledgerSelectedPerson = '';
      if (filters) return;
      const people = ledgerPeopleList();
      const allChip = document.createElement('button');
      allChip.type = 'button';
      allChip.className = 'filter-chip' + (!ledgerSelectedPerson ? ' active' : '');
      allChip.textContent = 'همه افراد';
      allChip.onclick = () => {
        ledgerSelectedPerson = '';
        renderLedgerFilters();
        renderLedgerSummaryOnly();
      };
      filters.appendChild(allChip);
      people.forEach(name => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'filter-chip' + (ledgerSelectedPerson === name ? ' active' : '');
        chip.textContent = name;
        chip.onclick = () => {
          ledgerSelectedPerson = (ledgerSelectedPerson === name) ? '' : name;
          renderLedgerFilters();
          renderLedgerSummaryOnly();
        };
        filters.appendChild(chip);
      });
    }

    function renderLedgerSummaryOnly() {
      const tbody = document.getElementById('ledger-summary-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      let pairs = ledgerPairNets();
      if (ledgerSelectedPerson) {
        pairs = pairs.filter(p => p.debtor === ledgerSelectedPerson || p.creditor === ledgerSelectedPerson);
      }
      if (!pairs.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="2" style="text-align:center;color:var(--muted);padding:12px;">موردی نیست</td>';
        tbody.appendChild(tr);
        return;
      }
      pairs.forEach(p => {
        const tr = document.createElement('tr');
        let relation;
        // ردیف‌های محاسبه‌شده خودکار: متن رابطه و مبلغ قرمز
        const color = '#ff6b4a';
        if (ledgerSelectedPerson) {
          if (p.debtor === ledgerSelectedPerson) {
            relation = escapeHtml(ledgerSelectedPerson) + ' به ' + escapeHtml(p.creditor) + ' بدهکار است';
          } else {
            relation = escapeHtml(ledgerSelectedPerson) + ' از ' + escapeHtml(p.debtor) + ' بستانکار است';
          }
        } else {
          relation = escapeHtml(p.debtor) + ' به ' + escapeHtml(p.creditor) + ' بدهکار است';
        }
        tr.innerHTML = '<td class="sec-name" style="color:' + color + ';font-weight:bold;">' + relation + '</td>' +
          '<td class="val" style="color:' + color + ';font-weight:bold;">' + formatNum(p.amount) + '</td>';
        tbody.appendChild(tr);
      });
    }

    function buildLedgerRowEl(sec, idx) {
      const r = sec.rows[idx];
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.style.textAlign = 'center';
      tdNum.style.color = 'var(--muted)';
      tdNum.style.fontSize = '0.75rem';
      tdNum.textContent = toPersianDigits(idx + 1);
      /* ۱.۳.۵۶: تسویه‌شده: تیک سبز در سلول ردیف (ردیف می‌ماند، در جمع‌ها نیست) */
      if (r.settled) { tdNum.innerHTML = '<svg class="hk-led-tick" viewBox="0 0 24 24" aria-label="تسویه شد"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; tr.classList.add('hk-led-settled'); }

      /* ۱.۳.۵۶: سلول «تاریخ» (روز + ماه، و سال اگر سال دیگری است)؛ زدن روی آن = باکس کوچک انتخاب تاریخ */
      const _xv = hkLedResolve(sec.id, idx) || { y: currentYear, m: currentMonth };
      const tdDay = document.createElement('td');
      tdDay.className = 'col-day';
      const dayInp = document.createElement('button');
      dayInp.type = 'button';
      dayInp.className = 'cell day-input hk-led-date' + (r.day ? '' : ' is-empty');
      dayInp.textContent = hkLedDateNum(r, _xv.y, _xv.m) || '';
      /* ۱.۳.۵۸: زدن روی تاریخ کاری نمی‌کند؛ تغییر فقط از لانگ‌پرس ← ویرایش */
      dayInp.onclick = (e) => { e.stopPropagation(); };
      tdDay.appendChild(dayInp);

      const tdDesc = document.createElement('td');
      tdDesc.className = 'col-desc';
      const descInp = document.createElement('textarea');
      descInp.className = 'cell desc-input';
      descInp.rows = 1;
      descInp.value = r.desc || '';
      descInp.title = r.desc || '';
      descInp.setAttribute('enterkeyhint', 'next');
      descInp.oninput = () => {
        if (!canEditRow(r)) return;
        updateLedgerRowField(sec.id, idx, 'desc', descInp.value);
        descInp.title = descInp.value;
        syncEmptyClass(descInp);
      };
      descInp.onblur = () => { syncEmptyClass(descInp); };
      descInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          const tr = descInp.closest('tr');
          const next = tr && tr.querySelector('.amount-input');
          if (next) {
            try { lockField(next, false); } catch (err) {
              next.classList.remove('is-empty', 'locked');
              next.classList.add('unlocked');
              if (next.tagName !== 'SELECT') next.readOnly = false;
            }
            try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e2) {} }
          } else {
            try { descInp.blur(); } catch (err) {}
          }
        }
      };
      tdDesc.appendChild(descInp);
      setupLockable(descInp, !!(r.desc && String(r.desc).trim()), !canEditRow(r), OWNERSHIP_LOCK_MSG);
      /* ۱.۳.۴۹: شرح پر و قفل: تک‌خطی با «…»؛ لمس → متن کامل در باکس شناور یک‌خطی (مثل بقیهٔ جدول‌ها) */
      /* ۱.۳.۵۱: روی گوشی click گاهی نمی‌رسد (قفلِ سلول لمس را می‌گیرد) → تشخیص ضربهٔ کوتاه با pointer */
      var _dTap = null, _dShown = 0;
      var dPop = function () { if (descInp.readOnly && String(descInp.value || '').trim() && Date.now() - _dShown > 500) { _dShown = Date.now(); try { showCellTextPopup(descInp, descInp.value); } catch (eP) {} } };
      descInp.addEventListener('pointerdown', (e) => { _dTap = { x: e.clientX, y: e.clientY, t: Date.now() }; });
      descInp.addEventListener('pointerup', (e) => { if (_dTap && Math.abs(e.clientX - _dTap.x) < 10 && Math.abs(e.clientY - _dTap.y) < 10 && Date.now() - _dTap.t < 450) dPop(); _dTap = null; });
      descInp.addEventListener('click', dPop);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'col-amount';
      const amtInp = document.createElement('input');
      amtInp.type = 'text';
      amtInp.className = 'cell amount-input';
      amtInp.inputMode = 'numeric';
      amtInp.setAttribute('enterkeyhint', 'done');
      amtInp.value = r.amount ? formatNum(r.amount) : '';
      amtInp.oninput = () => {
        if (!canEditRow(r)) return;
        const digits = toEnglishDigits(amtInp.value).replace(/[^0-9]/g, '');
        if (!digits) {
          amtInp.value = '';
          updateLedgerRowField(sec.id, idx, 'amount', 0);
          syncEmptyClass(amtInp);
          return;
        }
        const n = parseInt(digits, 10) || 0;
        amtInp.value = formatNum(n);
        updateLedgerRowField(sec.id, idx, 'amount', n);
        syncEmptyClass(amtInp);
      };
      amtInp.onblur = () => {
        syncEmptyClass(amtInp);
        const rowNow = (hkLedResolve(sec.id, idx) || {}).row;
        scheduleLedgerRowSort(sec.id, rowNow, amtInp.closest('tr'));
      };
      amtInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          try { amtInp.blur(); } catch (err) {}
        }
      };
      tdAmt.appendChild(amtInp);
      setupLockable(amtInp, !!(r.amount), !canEditRow(r), OWNERSHIP_LOCK_MSG);

      const isCredit = r.status === 'credit';
      function applyLedgerAmountColor(v) {
        const credit = v === 'credit';
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const green = theme === 'light' ? '#17834a' : '#9ee858';
        const red = theme === 'light' ? '#dc2626' : '#ff6b4a';
        const c = credit ? green : red;
        amtInp.style.setProperty('color', c, 'important');
        amtInp.style.setProperty('-webkit-text-fill-color', c, 'important');
        amtInp.style.setProperty('caret-color', c, 'important');
        amtInp.style.setProperty('font-weight', '800', 'important');
        amtInp.classList.toggle('status-paid', credit);
        amtInp.classList.toggle('status-unpaid', !credit);
      }
      applyLedgerAmountColor(isCredit ? 'credit' : 'debt');
      /* ۱.۳.۵۷: تسویه‌شده: مبلغ به رنگ تسویه */
      if (r.settled) { amtInp.style.setProperty('color', '#64748B', 'important'); amtInp.style.setProperty('-webkit-text-fill-color', '#64748B', 'important'); }
      function applyLedgerStatusVisual(v) {
        const credit = v === 'credit';
        r.status = credit ? 'credit' : 'debt';
        r.statusPicked = true;
        updateLedgerRowField(sec.id, idx, 'status', credit ? 'credit' : 'debt');
        applyLedgerAmountColor(credit ? 'credit' : 'debt');
        try { renderLedgerSummaryOnly(); } catch (e) {}
      }
      function openLedgerStatusMenu(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        document.querySelectorAll('.status-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'status-menu';
        menu.style.cssText = 'position:fixed;z-index:520;min-width:150px;box-sizing:border-box;margin:0;transform:none;';
        [
          { v: 'debt', label: 'بدهکار', cls: 'unpaid' },
          { v: 'credit', label: 'بستانکار', cls: 'paid' }
        ].forEach(opt => {
          const it = document.createElement('div');
          it.className = 'status-menu-item ' + opt.cls;
          it.textContent = opt.label;
          it.onclick = (ev) => {
            ev.stopPropagation();
            if (!canEditRow(r)) { menu.remove(); showToast(OWNERSHIP_LOCK_MSG); return; }
            applyLedgerStatusVisual(opt.v);
            menu.remove();
          };
          menu.appendChild(it);
        });
        document.body.appendChild(menu);
        const _sr2 = snapshotRect(tdAmt);
        positionStatusMenu(menu, tdAmt, null, _sr2);
        requestAnimationFrame(() => { try { positionStatusMenu(menu, tdAmt, null, _sr2); } catch (e3) {} });
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
      // فقط سلول مبلغ بده‌بستان: پیش‌فرض بستانکار + Done + منوی یک‌کلیکی
      if (!r.status || (r.status !== 'credit' && r.status !== 'debt')) {
        r.status = 'credit';
      }
      /* ردیف خالیِ قدیمی که فقط با پیش‌فرض قبلی «بدهکار» شده بود (کاربر انتخابش نکرده) → بستانکار */
      if (r.status === 'debt' && !r.statusPicked && !r.amount && !r.desc && !r.day) r.status = 'credit';
      applyLedgerAmountColor(r.status === 'credit' ? 'credit' : 'debt');
      try {
        amtInp.setAttribute('enterkeyhint', 'done');
        amtInp.setAttribute('inputmode', 'numeric');
      } catch (e) {}
      tdAmt.style.cursor = 'pointer';
      tdAmt.title = 'یک‌بار: بستانکار/بدهکار';
      function beginLedgerAmountEdit() {
        if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        if (tdAmt._ledTimer) { clearTimeout(tdAmt._ledTimer); tdAmt._ledTimer = null; }
        tdAmt._pendingToken = null;
        document.querySelectorAll('.status-menu').forEach(m => { try { m.remove(); } catch (e2) {} });
        try {
          amtInp.readOnly = false;
          amtInp.classList.remove('locked', 'is-empty');
          amtInp.classList.add('unlocked');
          amtInp.dataset.locked = '0';
          // پیش‌فرض بستانکار، مگر بدهکار از قبل ذخیره/انتخاب شده باشد
          if (r.status !== 'debt') {
            r.status = 'credit';
            try { updateLedgerRowField(sec.id, idx, 'status', 'credit'); } catch (eS0) {}
          }
          applyLedgerAmountColor(r.status === 'credit' ? 'credit' : 'debt');
          try { amtInp.focus({ preventScroll: true }); } catch (eF) { try { amtInp.focus(); } catch (eF2) {} }
          if (r.amount) {
            try { caretToEnd(amtInp); } catch (eS) {}
          }
        } catch (err) {}
      }
      function openLedgerStatusMenuForCell(cellEl, savedRect) {
        if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        document.querySelectorAll('.status-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'status-menu';
        menu.setAttribute('style',
          'position:fixed!important;z-index:99999!important;display:block!important;visibility:visible!important;opacity:1!important;' +
          'background:#1c1c1e;border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:6px 0;' +
          'min-width:96px;box-sizing:border-box;margin:0;transform:none;box-shadow:0 8px 24px rgba(0,0,0,0.5);'
        );
        menu.classList.add('hk-led-menu');
        [
          { v: 'credit', label: 'بستانکار', color: (document.documentElement.getAttribute('data-theme') === 'light' ? '#17834a' : '#9ee858') },
          { v: 'debt', label: 'بدهکار', color: '#ff6b4a' }
        ].forEach(opt => {
          const it = document.createElement('div');
          it.textContent = opt.label;
          it.setAttribute('style', 'padding:12px 16px;cursor:pointer;font-weight:700;color:' + opt.color + ';text-align:right;font-family:Vazirmatn,Tahoma,sans-serif;font-size:0.95rem;');
          it.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            r.status = opt.v;
            applyLedgerStatusVisual(opt.v);
            applyLedgerAmountColor(opt.v);
            try { menu.remove(); } catch (e2) {}
          };
          menu.appendChild(it);
        });
        document.body.appendChild(menu);
        function place() {
          let rect = null;
          try {
            const el = (cellEl && cellEl.isConnected) ? cellEl : tdAmt;
            if (el && el.getBoundingClientRect) {
              const live = el.getBoundingClientRect();
              if (live && live.width >= 1) rect = live;
            }
          } catch (e3) {}
          if (!rect && savedRect && savedRect.width >= 1) rect = savedRect;
          const menuW = Math.max(menu.offsetWidth || 0, 40);
          const menuH = Math.max(menu.offsetHeight || 0, 60);
          let top = 100, left = 20;
          if (rect) {
            /* ۱.۳.۴۹: سمت راستِ مبلغ، هم‌تراز وسط خانه؛ جا نبود → سمت چپ */
            /* ۱.۳.۵۰: «بستانکار» (گزینهٔ اول) دقیقاً روبه‌روی مبلغ */
            var _fi = menu.firstElementChild ? menu.firstElementChild.offsetHeight : 34;
            top = rect.top + rect.height / 2 - _fi / 2 - 3;
            left = rect.right + 2;
            if (left + menuW > window.innerWidth - 4) left = rect.left - menuW - 4;
            if (top + menuH > window.innerHeight - 8) top = window.innerHeight - menuH - 8;
          }
          if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
          if (left < 8) left = 8;
          if (top < 8) top = 8;
          menu.style.setProperty('top', Math.round(top) + 'px', 'important');
          menu.style.setProperty('left', Math.round(left) + 'px', 'important');
          menu.style.setProperty('position', 'fixed', 'important');
          menu.style.setProperty('z-index', '99999', 'important');
        }
        place();
        requestAnimationFrame(place);
        const closer = (ev) => {
          if (!menu.parentNode) {
            document.removeEventListener('mousedown', closer, true);
            document.removeEventListener('touchstart', closer, true);
            return;
          }
          if (menu.contains(ev.target)) return;
          if (ev.target === amtInp || ev.target === tdAmt || (tdAmt && tdAmt.contains && tdAmt.contains(ev.target))) return;
          try { menu.remove(); } catch (e4) {}
          document.removeEventListener('mousedown', closer, true);
          document.removeEventListener('touchstart', closer, true);
        };
        setTimeout(() => {
          document.addEventListener('mousedown', closer, true);
          document.addEventListener('touchstart', closer, true);
        }, 200);
      }
      // Android WebView: touchend اصلی؛ جلوگیری از click تکراری بعد از touch
      function snapshotLedRect() {
        try {
          const el = tdAmt || amtInp;
          const rr = el.getBoundingClientRect();
          if (rr && rr.width >= 1) {
            return { top: rr.top, left: rr.left, right: rr.right, bottom: rr.bottom, width: rr.width, height: rr.height };
          }
        } catch (e) {}
        return null;
      }
      function isLedEditing() {
        return !!(amtInp && document.activeElement === amtInp && !amtInp.readOnly && amtInp.classList.contains('unlocked'));
      }
      function onLedgerAmountTap(e) {
        if (!e) return;
        // جلوگیری از bubble به parentهای جدول
        try { e.stopPropagation(); } catch (err) {}
        if (e.cancelable) {
          try { e.preventDefault(); } catch (err2) {}
        }
        if (isLedEditing()) return;
        /* ۱.۳.۵۷: وضعیت فقط از «ویرایش»؛ زدن روی مبلغ پر کاری نمی‌کند */
        if (r.amount) return;

        const now = Date.now();
        const last = tdAmt._lastTapTs || 0;
        const delta = now - last;
        tdAmt._lastTapTs = now;

        // double within 500ms
        if (delta > 0 && delta < 500) {
          if (tdAmt._ledTimer) { clearTimeout(tdAmt._ledTimer); tdAmt._ledTimer = null; }
          tdAmt._pendingToken = null;
          document.querySelectorAll('.status-menu').forEach(m => { try { m.remove(); } catch (e2) {} });
          beginLedgerAmountEdit();
          return;
        }

        // empty → type red
        if (!(r.amount)) {
          if (tdAmt._ledTimer) { clearTimeout(tdAmt._ledTimer); tdAmt._ledTimer = null; }
          beginLedgerAmountEdit();
          return;
        }

        /* ۱.۳.۴۸: پر → منوی بستانکار/بدهکار همان لحظه (ضربهٔ دوم سریع = ویرایش مبلغ) */
        if (tdAmt._ledTimer) { clearTimeout(tdAmt._ledTimer); tdAmt._ledTimer = null; }
        if (document.querySelector('.status-menu')) { document.querySelectorAll('.status-menu').forEach(function (m) { m.remove(); }); return; }
        openLedgerStatusMenuForCell(tdAmt, snapshotLedRect());
      }
      // فقط یک مسیر event — touchend برای Android، click برای دسکتاپ (با قفل ضد دوبار)
      function bindLedTap(el) {
        if (!el) return;
        el.addEventListener('touchend', function(e) {
          tdAmt._fromTouch = true;
          onLedgerAmountTap(e);
          // بلاک click مصنوعی بعدی
          setTimeout(function() { tdAmt._fromTouch = false; }, 400);
        }, { capture: true, passive: false });
        el.addEventListener('click', function(e) {
          if (tdAmt._fromTouch) {
            try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
            return;
          }
          onLedgerAmountTap(e);
        }, true);
      }
      bindLedTap(amtInp);
      bindLedTap(tdAmt);
      // Done
      amtInp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          try { amtInp.blur(); } catch (err) {}
        }
      });
      amtInp.addEventListener('input', function() {
        if (r.status !== 'debt') r.status = 'credit';
        applyLedgerAmountColor(r.status === 'credit' ? 'credit' : 'debt');
      });
      amtInp.addEventListener('blur', function() {
        try {
          const digits = toEnglishDigits(amtInp.value || '').replace(/[^0-9]/g, '');
          const n = digits ? parseInt(digits, 10) : 0;
          updateLedgerRowField(sec.id, idx, 'amount', n || 0);
          if (!r.status || (r.status !== 'credit' && r.status !== 'debt')) {
            r.status = 'credit';
            updateLedgerRowField(sec.id, idx, 'status', 'credit');
          }
        } catch (eB) {}
      });

      const tdAct = document.createElement('td');
      tdAct.className = 'col-actions actions-cell';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-del-row';
      del.textContent = '×';
      del.onclick = () => {
        if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        deleteLedgerRow(sec.id, idx);
      };
      tdAct.appendChild(del);

      tr.appendChild(tdNum);
      tr.appendChild(tdDay);
      tr.appendChild(tdDesc);
      tr.appendChild(tdAmt);
      /* ۱.۳.۵۱: ویرایش/حذف ردیف قرض مثل برداشت/واریز: لانگ‌پرس روی ردیف (ضربدر برداشته شد) */
      try {
        hkBindRowLongPress(tr, function () {
          if (!canEditRow(r)) { showToast(OWNERSHIP_LOCK_MSG); return; }
          hkOpenRowActions(tr, { canDelete: true, onDelete: function () { deleteLedgerRow(sec.id, idx); }, onEdit: function () { hkOpenLedgerEdit(sec, idx); }, onSettle: function () { hkLedToggleSettled(sec.id, idx); }, settled: !!r.settled });
        });
      } catch (eLp) {}
      return tr;
    }
    (function () {
      var editing = function (t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && !t.readOnly && document.activeElement === t; };
      document.addEventListener('selectstart', function (e) { var t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement); if (!editing(t)) e.preventDefault(); }, true);
      document.addEventListener('contextmenu', function (e) { if (!editing(e.target)) e.preventDefault(); }, true);
    })();
    /* ۱.۳.۵۲: دکمهٔ شناور اسکرول جدول درآمد/مخارج (کانتینر واقعی = .person-detail-scroll):
       بالا یا وسط لیست → فلش دوتایی پایین (رفتن به انتهای واقعی)، در انتها → فلش بالا (رفتن به ابتدا)؛
       لیست کوتاه/خالی → پنهان. جایش گوشهٔ پایین کادر، کنار ردیف «+ پروژه» (روی مبلغ‌ها و دکمه‌ها نمی‌افتد) */
    (function () {
      var fab = null, raf = 0;
      var CHEV = '<span class="fab-rot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l5 5 5-5"/><path d="M7 12.5l5 5 5-5"/></svg></span>';
      var curSc = function () {
        if (!document.body.classList.contains('detail-open')) return null;
        var list = document.querySelectorAll('.person-detail-scroll');
        for (var i = 0; i < list.length; i++) { if (list[i].offsetParent && list[i].clientHeight > 0) return list[i]; }
        return null;
      };
      var ensure = function () {
        if (fab) return fab;
        fab = document.createElement('button'); fab.type = 'button'; fab.id = 'hkScrollFab'; fab.setAttribute('aria-label', 'رفتن به انتها'); fab.innerHTML = CHEV;
        fab.addEventListener('click', function (e) {
          e.stopPropagation();
          var sc = curSc(); if (!sc) return;
          var up = fab.classList.contains('up');
          /* ۱.۳.۵۳: جهت آیکون همان لحظه عوض می‌شود؛ تا پایان حرکت هیچ لانگ‌پرس/انتخابی در جدول نیست */
          fab.classList.toggle('up', !up); fab._lockUntil = Date.now() + 1400; fab._goal = up ? 'top' : 'end';
          document.body.classList.add('hk-autoscroll');
          clearTimeout(fab._unl); fab._unl = setTimeout(function () { document.body.classList.remove('hk-autoscroll'); }, 1400);
          try { sc.scrollTo({ top: up ? 0 : sc.scrollHeight, behavior: 'smooth' }); } catch (e2) { sc.scrollTop = up ? 0 : sc.scrollHeight; }
        });
        document.body.appendChild(fab);
        return fab;
      };
      /* ۱.۳.۷۲: جدول تا پایین صفحه؛ هر چند ردیف کامل که تا آنجا جا شود، بقیه داخل جدول اسکرول می‌شوند (به‌جای ۱۱ ردیف ثابت) */
      var fit = function (sc) {
        try {
          var box = sc.closest('.person-detail-box'); if (!box) return;
          var tr = sc.querySelector('tbody tr'); var rh = tr ? tr.getBoundingClientRect().height : 36; if (!(rh > 10)) rh = 36;
          var sb = 0; try { sb = homeSafeBottom(); } catch (e0) {}
          var pb = parseFloat(getComputedStyle(box).paddingBottom) || 0;
          /* ۱.۳.۷۳: دو ردیف کمتر از جای کامل (با ارتفاع پایهٔ ردیف راهنما)؛ جای آزادشده = فاصلهٔ بیشتر راهنما و دکمهٔ اسکرول از جدول */
          var avail = (window.innerHeight - sb - 12) - sc.getBoundingClientRect().top - 28 - pb - 2;
          var n = Math.max(6, Math.floor(avail / rh) - 2);
          var key = n + '|' + rh;
          if (sc._hkFitKey === key) return;
          sc._hkFitKey = key;
          sc.style.setProperty('max-height', Math.round(n * rh) + 'px', 'important');
          box.style.setProperty('max-height', 'none', 'important');
          /* ۱.۳.۷۶: باکس جدول تا پایین صفحه (بی ردیف اضافه)؛ فضای اضافه زیر راهنما */
          box.classList.add('hk-pd-fill');
          box.style.minHeight = '';
          var bt = box.getBoundingClientRect().top, want = (window.innerHeight - sb - 12) - bt;
          if (want > box.getBoundingClientRect().height) box.style.minHeight = Math.round(want) + 'px';
        } catch (e) {}
      };
      var update = function () {
        raf = 0;
        var sc = curSc();
        if (sc) fit(sc);
        if (!sc || sc.scrollHeight - sc.clientHeight < 8 || document.querySelector('.modal-overlay.open, .hk-re-ov, .hk-bulk-ov')) { if (fab) fab.classList.remove('show'); return; }
        ensure();
        var atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
        if (!(fab._lockUntil > Date.now())) fab.classList.toggle('up', atEnd);
        /* ۱.۳.۵۵: قفل فقط وقتی باز می‌شود که حرکت به مقصدش رسید (لحظهٔ شروع از بالا آیکون برنگردد) */
        else if ((fab._goal === 'end' && atEnd) || (fab._goal === 'top' && sc.scrollTop <= 2)) fab._lockUntil = 0;
        fab.setAttribute('aria-label', atEnd ? 'رفتن به ابتدا' : 'رفتن به انتها');
        var box = sc.closest('.person-detail-box') || sc, br = box.getBoundingClientRect();
        /* ۱.۳.۷۲: داخل خود جدول، هم‌ردیف «برای ویرایش یا حذف…» و سمت راست */
        var hint = box.querySelector('.person-detail-hint'), hr = hint && hint.getBoundingClientRect();
        var fs = fab.offsetWidth || 36;
        /* ۱.۳.۷۶: هم‌تراز خودِ نوشتهٔ راهنما؛ رنگ دایره همان زمینهٔ جدول */
        var hrT = null; try { if (hint && hint.firstChild) { var rg = document.createRange(); rg.selectNodeContents(hint); var rr = rg.getClientRects(); if (rr.length) hrT = rr[0]; } } catch (eRg) {}
        var hc = hrT ? hrT.top + hrT.height / 2 : (hr && hr.height ? hr.top + hr.height / 2 : 0);
        var top = hc ? hc - fs / 2 : Math.min(br.bottom - 57, window.innerHeight - 62);
        top += 7; /* ۱.۳.۸۰: کمی پایین‌تر */

        fab.style.top = Math.round(top) + 'px';
        fab.style.left = Math.round(br.right - 14 - fs) + 'px';
        fab.classList.add('show');
      };
      var sched = function () { if (!raf) raf = requestAnimationFrame(update); };
      document.addEventListener('scroll', sched, true);
      window.addEventListener('resize', sched);
      try { new MutationObserver(sched).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true }); } catch (eM) {}
      setTimeout(sched, 600);
    })();

    /* ===== ۱.۳.۵۳: شخصی‌سازی (منوی همبرگری) — تنظیم‌ها فقط روی نمایش/اولویت اثر دارند، نه روی داده‌ها ===== */
    var HK_PREF_KEY = STORAGE_KEY + '_prefs';
    function hkPrefs() { try { var o = JSON.parse(localStorage.getItem(HK_PREF_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
    function hkPrefSet(k, v) { var o = hkPrefs(); o[k] = v; try { localStorage.setItem(HK_PREF_KEY, JSON.stringify(o)); } catch (e) {} hkApplyPrefs(); }
    /* ترتیب ردیف‌ها فقط وقتی کاربر انتخاب کرده اعمال می‌شود (پیش‌فرض دست نمی‌خورد) */
    function hkSortDir() { return hkPrefs().sort === 'new' ? -1 : 1; }
    function hkApplyRowSort(sec) {
      var p = hkPrefs().sort; if (!p || !sec || !Array.isArray(sec.rows)) return;
      var dir = p === 'new' ? -1 : 1;
      sec.rows = sec.rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
        var da = dayNum(a.r), db = dayNum(b.r);
        if (!da && !db) return a.i - b.i; if (!da) return 1; if (!db) return -1;
        if (da !== db) return (da - db) * dir;
        return (hkTimeCmp(a.r, b.r) * dir) || a.i - b.i;
      }).map(function (x) { return x.r; });
    }
    /* اولویت دسته‌ها: دستی (ترتیب کاربر) یا خودکار (تعداد استفاده) */
    function hkCatPri(kind) { var o = hkPrefs().catOrder || {}; var a = o[kind]; return Array.isArray(a) && a.length ? a : null; }
    function hkCatScore(kind, id, use, i) {
      var pri = hkCatPri(kind);
      if (pri) { var k = pri.indexOf(id); return (k >= 0 ? (5000 - k) * 10 : 0) - i * 0.01; }
      return (use[id] || 0) * 10 - i * 0.01;
    }
    var HK_FS_BASE = [['caption', 11], ['label', 12], ['small', 13], ['body', 14], ['control', 15], ['title', 17], ['heading', 20], ['figure', 24], ['display', 32]];
    function hkApplyPrefs(init) {
      var p = hkPrefs(), b = document.body, h = document.documentElement;
      if (b) b.classList.toggle('hk-privacy', !!p.privacy);
      h.style.fontSize = p.font === 's' ? '14px' : p.font === 'l' ? '18px' : '';
      /* ۱.۳.۷۹: تقریباً همهٔ متن‌ها اندازهٔ پیکسلی متغیرهای --hk-fs-* را دارند؛ تغییر اندازهٔ پایه به تنهایی اثری نداشت */
      try {
        var _fsK = p.font === 's' ? 0.9 : p.font === 'l' ? 1.15 : 1;
        HK_FS_BASE.forEach(function (x) { if (_fsK === 1) h.style.removeProperty('--hk-fs-' + x[0]); else h.style.setProperty('--hk-fs-' + x[0], (Math.round(x[1] * _fsK * 2) / 2) + 'px'); });
        h.setAttribute('data-hk-font', p.font || 'm');
      } catch (eFs) {}
      if (init) return;
      try { hkSyncNotifCats(); } catch (e) {}
      try { renderHomeCards(); } catch (e2) {}
    }
    /* ===== ۱.۳.۶۸: انتخاب‌گرهای دوگزینه‌ای با نشانگر سُرخورنده =====
       هر .hk-re-seg که به صفحه اضافه شود یک نشانگر می‌گیرد؛ با عوض شدن گزینهٔ «on» نشانگر (زمینه + خط زیر و رنگش)
       با حرکت به گزینهٔ تازه می‌رود. منطق انتخاب‌ها دست نمی‌خورد؛ فقط ظاهر. */
    function hkSegRgba(c, a) { var m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return 'transparent'; var p = m[1].split(',').map(function (x) { return parseFloat(x); }); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
    function hkSegPlace(seg, instant) {
      var ind = seg._hkInd; if (!ind) return;
      var on = seg.querySelector(':scope > .hk-re-segb.on');
      if (!on || !(on.offsetWidth > 0)) { ind.classList.remove('on'); return; }
      if (instant) ind.classList.add('hk-seg-now');
      /* ۱.۳.۸۱: رنگ نهایی گزینه (بی ترنزیشن) — قبلاً وسط ترنزیشن رنگ قبلی خوانده می‌شد و خط زیر عوض نمی‌شد */
      var _tr = on.style.transition; on.style.transition = 'none'; var c = getComputedStyle(on).color; void on.offsetWidth; on.style.transition = _tr;
      ind.style.setProperty('--ind-c', c);
      ind.style.setProperty('--ind-bg', hkSegRgba(c, on.classList.contains('hk-re-pjb') ? 0.1 : 0.14));
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + on.offsetLeft + 'px)';
      ind.classList.add('on');
      if (instant) { void ind.offsetWidth; requestAnimationFrame(function () { ind.classList.remove('hk-seg-now'); }); }
    }
    function hkSegInit(seg) {
      if (!seg || seg._hkInd) return;
      var ind = document.createElement('i'); ind.className = 'hk-seg-ind'; ind.setAttribute('aria-hidden', 'true');
      seg.insertBefore(ind, seg.firstChild); seg._hkInd = ind; seg.classList.add('hk-seg-anim');
      try {
        new MutationObserver(function (ms) { for (var k = 0; k < ms.length; k++) if (ms[k].target !== ind && !(ms[k].type === 'childList' && ms[k].target === seg && [].every.call(ms[k].addedNodes, function (x) { return x === ind; }) && !ms[k].removedNodes.length)) { hkSegPlace(seg, false); return; } }).observe(seg, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
      } catch (e) {}
      requestAnimationFrame(function () { hkSegPlace(seg, true); setTimeout(function () { hkSegPlace(seg, true); }, 260); });
    }
    (function () {
      var scan = function (n) {
        if (!n || n.nodeType !== 1) return;
        if (n.classList && n.classList.contains('hk-re-seg')) hkSegInit(n);
        if (n.querySelectorAll && n.firstElementChild) n.querySelectorAll('.hk-re-seg').forEach(hkSegInit);
      };
      var start = function () {
        try { new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var a = ms[i].addedNodes; for (var j = 0; j < a.length; j++) scan(a[j]); } }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
        window.addEventListener('resize', function () { document.querySelectorAll('.hk-re-seg.hk-seg-anim').forEach(function (sg) { hkSegPlace(sg, true); }); });
      };
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    })();
    /* ===== ۱.۳.۶۸: دو میان‌بر بالای دایرهٔ موجودی (شخصی‌سازی‌شدنی) — فقط آیکن، هم‌سبک «+» و جستجو ===== */
    var HK_DOCK_ITEMS = {
      projects: { label: 'پروژه‌ها', go: function () { openSubjectsModal(); }, svg: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l1.8 2h8.8A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>' },
      recurring: { label: 'درآمد ثابت', go: function () { openRecurringFromMenu(); }, svg: '<path d="M19 9.5a7.5 7.5 0 0 0-13-3"/><path d="M5.6 3v3.6h3.6"/><path d="M5 14.5a7.5 7.5 0 0 0 13 3"/><path d="M18.4 21v-3.6h-3.6"/><circle cx="12" cy="12" r="2.8"/>' },
      ledger: { label: 'قرض', go: function () { switchTabFromMenu('ledger'); }, svg: '<path d="M4 8.5h14.5l-3.4-3.4"/><path d="M20 15.5H5.5l3.4 3.4"/>' },
      savings: { label: 'پس‌انداز', go: function () { openSavingsModal(); }, svg: '<ellipse cx="12" cy="6.5" rx="7" ry="2.6"/><path d="M5 6.5v5.2c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6.5"/><path d="M5 11.8V17c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-5.2"/>' },
      reminders: { label: 'یادآور', go: function () { openUserRemindersModal(); }, svg: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 21a2.1 2.1 0 0 0 4 0"/>' },
      stats: { label: 'آمار', go: function () { openStatsSheet(); }, svg: '<path d="M5 20v-7M10 20V6M15 20v-9.5M20 20V4"/>' },
      recap: { label: 'ماهی که گذشت', go: function () { openMonthRecap(); }, svg: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
      accounts: { label: 'انتخاب حساب', go: function () { openBankAccountsModal(); }, svg: '<rect x="3" y="6" width="18" height="12.5" rx="2.2"/><path d="M3 10.5h18M7 15h4"/>' },
      sms: { label: 'ثبت تکی و گروهی پیامک‌ها', go: function () { openSmsImportModal(); }, svg: '<path d="M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.2 3.5V17H4.5A1.5 1.5 0 0 1 3 15.5V6a1.5 1.5 0 0 1 1.5-1.5z"/>' },
      backup: { label: 'پشتیبان‌گیری', go: function () { askBackupParts(); }, svg: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9a4.5 4.5 0 0 1 .5 9.5z"/><path d="M12 16v-5.4M9.6 12.9 12 10.5l2.4 2.4"/>' },
      export: { label: 'خروجی', go: function () { askExport(); }, svg: '<path d="M6.5 3h7.5l4.5 4.5v12A1.5 1.5 0 0 1 17 21H6.5A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M14 3v4.5h4.5M8.5 12.5h7M8.5 16h5"/>' },
      trash: { label: 'سطل زباله', go: function () { openTrashModal(); }, svg: '<g class="hk-lid"><path d="M4 6.5h16M9.5 6V4.5h5V6"/></g><path d="M6.2 9l.9 10.6a1.5 1.5 0 0 0 1.5 1.4h6.8a1.5 1.5 0 0 0 1.5-1.4L17.8 9"/>' }
    };
    var HK_DOCK_DEFAULT = { L: 'projects', R: 'recurring' };
    function hkDockPick(side) {
      var p = hkPrefs(), k = side === 'L' ? p.dockL : p.dockR;
      return HK_DOCK_ITEMS[k] ? k : HK_DOCK_DEFAULT[side];
    }
    function hkRenderDock() {
      var top = document.getElementById('homeDockTop');
      if (!top) return;
      var mk = function (side) {
        var k = hkDockPick(side), it = HK_DOCK_ITEMS[k];
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'home-circle hk-dock-c hk-dock-' + side; b.dataset.k = k;
        b.setAttribute('aria-label', it.label); b.title = it.label;
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.svg + '</svg>';
        b.onclick = function (e) { e.stopPropagation(); if (b._hkLp) { b._hkLp = false; return; } try { it.go(); } catch (eG) {} };
        hkDockBindLongPress(b, side);
        return b;
      };
      /* همان ترتیب باکس پایین (چپ‌به‌راست): میان‌بر چپ روبه‌روی «+»، راست روبه‌روی جستجو */
      var key = hkDockPick('L') + '|' + hkDockPick('R');
      if (top._hkKey === key && top.querySelector('.hk-dock-c')) return;
      top._hkKey = key;
      top.querySelectorAll('.hk-dock-c').forEach(function (x) { x.remove(); });
      var notch = top.querySelector('.hk-notch');
      top.insertBefore(mk('L'), notch);
      top.insertBefore(mk('R'), notch);
    }
    /* ۱.۳.۷۱: لانگ‌پرس روی میان‌بر → ویبرهٔ کوتاه، دکمه می‌لرزد و فهرست عمودی گزینه‌ها بالایش باز می‌شود */
    function hkDockBindLongPress(b, side) {
      var t = 0, sx = 0, sy = 0;
      var clear = function () { clearTimeout(t); t = 0; };
      b.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return; sx = e.clientX; sy = e.clientY; clear();
        t = setTimeout(function () { t = 0; b._hkLp = true; hkDockOpenPop(b, side); }, 480);
      });
      b.addEventListener('pointermove', function (e) { if (t && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clear(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, clear); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    function hkDockOpenPop(btn, side) {
      var old = document.getElementById('hkDockPop'); if (old && old._hkCancel) old._hkCancel();
      try { window.appHaptic(25); } catch (eH) {}
      btn.classList.add('hk-dock-jig');
      var ov = document.createElement('div'); ov.id = 'hkDockPop'; ov.className = 'hk-dock-pov'; ov.setAttribute('data-hk-back', '1');
      var pop = document.createElement('div'); pop.className = 'hk-dock-pop'; pop.setAttribute('role', 'menu'); ov.appendChild(pop);
      var cur = hkDockPick(side), other = hkDockPick(side === 'L' ? 'R' : 'L');
      var close = function () { btn.classList.remove('hk-dock-jig'); ov.remove(); setTimeout(function () { btn._hkLp = false; }, 400); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      Object.keys(HK_DOCK_ITEMS).forEach(function (k) {
        var it = HK_DOCK_ITEMS[k];
        var o = document.createElement('button'); o.type = 'button'; o.setAttribute('role', 'menuitem'); o.dataset.k = k;
        o.className = 'hk-dock-pi' + (k === cur ? ' on' : '') + (k === other ? ' off' : '');
        o.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.svg + '</svg><span>' + it.label + '</span>' +
          (k === other ? '<small>' + (side === 'L' ? 'سمت راست' : 'سمت چپ') + '</small>' : '');
        if (k === other) o.disabled = true;
        o.onclick = function (e) {
          e.stopPropagation();
          if (k !== cur) { hkPrefSet(side === 'L' ? 'dockL' : 'dockR', k); try { hkRenderDock(); } catch (eR) {} try { window.appHaptic(10); } catch (eH2) {} }
          close();
        };
        pop.appendChild(o);
      });
      document.body.appendChild(ov);
      try {
        var r = btn.getBoundingClientRect(), pw = pop.offsetWidth;
        var top0 = Math.max(10, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0) + 10);
        /* ۱.۳.۷۲: پنج گزینه دیده می‌شود و بقیه با اسکرول؛ لبه‌ای که ادامه دارد کمی محو است */
        var it0 = pop.querySelector('.hk-dock-pi'), ih = it0 ? it0.offsetHeight : 42;
        pop.style.maxHeight = Math.min(Math.max(160, Math.round(r.top - 12 - top0)), Math.round(ih * 5.5 + 12)) + 'px';
        var fade = function () { var a = pop.scrollTop > 2, z = pop.scrollTop + pop.clientHeight < pop.scrollHeight - 2; pop.classList.toggle('fade-t', a); pop.classList.toggle('fade-b', z); };
        pop.addEventListener('scroll', fade, { passive: true });
        var ph = pop.offsetHeight;
        var left = side === 'L' ? r.left - 4 : r.right + 4 - pw;
        left = Math.max(8, Math.min(innerWidth - pw - 8, left));
        pop.style.left = Math.round(left) + 'px';
        pop.style.top = Math.round(Math.max(top0, r.top - 12 - ph)) + 'px';
        pop.style.setProperty('--hk-dp-arrow', Math.round(r.left + r.width / 2 - left) + 'px');
        /* ۱.۳.۷۳: همیشه از گزینهٔ اول باز می‌شود */
        pop.scrollTop = 0;
        fade();
      } catch (eP) {}
      requestAnimationFrame(function () { ov.classList.add('open'); });
    }
    /* انتخاب میان‌بر در شخصی‌سازی: فهرست با آیکن؛ بیرون یا دکمهٔ برگشت = بستن */
    function hkOpenDockPicker(side, after) {
      var old = document.getElementById('hkDockPick'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkDockPick'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs hk-dock-pick'; ov.appendChild(box);
      var close = function () { ov.remove(); if (after) after(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var cur = hkDockPick(side), other = hkDockPick(side === 'L' ? 'R' : 'L');
      box.innerHTML = '<div class="hk-prefs-t">' + (side === 'L' ? 'میان‌بر چپ' : 'میان‌بر راست') + '</div>';
      var list = document.createElement('div'); list.className = 'hk-dock-list';
      Object.keys(HK_DOCK_ITEMS).forEach(function (k) {
        if (k === other) return;
        var it = HK_DOCK_ITEMS[k];
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-dock-opt' + (k === cur ? ' on' : '');
        b.innerHTML = '<span class="home-circle hk-dock-c"><svg viewBox="0 0 24 24" aria-hidden="true">' + it.svg + '</svg></span><span class="hk-dock-opt-l">' + it.label + '</span>';
        b.onclick = function () { hkPrefSet(side === 'L' ? 'dockL' : 'dockR', k); try { hkRenderDock(); } catch (e) {} close(); };
        list.appendChild(b);
      });
      box.appendChild(list);
      document.body.appendChild(ov);
    }
    var HK_SP_LABELS = { overview: 'خلاصهٔ ماه', inst: 'کارت‌های قسط', reminders: 'یادآورها', stats: 'آمار', todo: 'کارهای من', ledger: 'قرض', categories: 'دسته‌ها', projects: 'پروژه‌ها', upcoming: 'سررسیدها', jump: 'بیشترین جهش', biggest: 'بزرگ‌ترین خرج', fix: 'تکمیل اطلاعات', insight: 'نکته‌ها' };
    /* ===== ۱.۳.۷۱: شخصی‌سازی تازه — هم‌سبک منوی ویرایش ردیف: گروه‌ها با عنوان کوچک، ردیف‌های یکدست با «مقدار ›»،
       کلید روشن/خاموش، و صفحهٔ دوم برای انتخاب‌ها و اسلایدها (فلش برگشت). تنظیم‌ها همان تنظیم‌های قبلی‌اند. ===== */
    var HK_PF_IC = {
      font: '<path d="M5 19L10 5l5 14M7 14h6M16 19l2.5-7 2.5 7"/>',
      start: '<path d="M4 11l8-6 8 6v8.5H4z"/>',
      sort: '<path d="M7 4v16M4 17l3 3 3-3M14 6h6M14 11h4M14 16h2"/>',
      dock: '<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>',
      slides: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M9 12h6"/>',
      cats: '<path d="M5 7h14M5 12h10M5 17h6"/>',
      privacy: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><path d="M4 4l16 16"/>',
      sms: '<path d="M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.2 3.5V17H4.5A1.5 1.5 0 0 1 3 15.5V6a1.5 1.5 0 0 1 1.5-1.5z"/>',
      remind: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 21a2.1 2.1 0 0 0 4 0"/>',
      recap: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
    };
    var HK_PF_COL = { font: '#5e5ce6', start: '#30b0c7', sort: '#8e8e93', dock: '#08b5f5', slides: '#34c759', cats: '#ff9f0a', privacy: '#636366', sms: '#ff6b4a', remind: '#e6b12c', recap: '#af52de' };
    /* ترتیب اسلایدهای باکس هوشمند (اولویت کاربر)؛ اسلایدهای ثابت مثل هشدار و «+» سر جایشان می‌مانند */
    function hkSpOrderKeys() {
      var o = hkPrefs().spOrder, all = Object.keys(HK_SP_LABELS);
      o = Array.isArray(o) ? o.filter(function (k) { return all.indexOf(k) >= 0; }) : [];
      all.forEach(function (k) { if (o.indexOf(k) < 0) o.push(k); });
      return o;
    }
    function hkSpOrderedPages() {
      var o = hkPrefs().spOrder;
      if (!Array.isArray(o) || !o.length) return SMART_PANEL_PAGES;
      var ord = hkSpOrderKeys(), out = SMART_PANEL_PAGES.slice(), slots = [], movable = [];
      SMART_PANEL_PAGES.forEach(function (pg, i) { if (HK_SP_LABELS[pg.key]) { slots.push(i); movable.push(pg); } });
      movable.sort(function (a, b) { return ord.indexOf(a.key) - ord.indexOf(b.key); });
      slots.forEach(function (si, n) { out[si] = movable[n]; });
      return out;
    }
    function openPrefsModal() {
      var old = document.getElementById('hkPrefsModal'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkPrefsModal'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:640;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs hk-pf'; ov.appendChild(box);
      var stack = [];
      var close = function () { ov.remove(); };
      /* بازگشت: اول از صفحهٔ دوم به صفحهٔ اصلی، بعد بستن */
      ov._hkCancel = function () { if (stack.length) { stack.pop(); render(); } else close(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var chev = '<i class="hk-pf-chev" aria-hidden="true"></i>';
      var ic = function (k) { return '<span class="hk-pf-ic" style="background:' + HK_PF_COL[k] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + HK_PF_IC[k] + '</svg></span>'; };
      var grp = function (parent, title) {
        if (title) { var h = document.createElement('div'); h.className = 'hk-pf-gh'; h.textContent = title; parent.appendChild(h); }
        var g = document.createElement('div'); g.className = 'hk-pf-grp'; parent.appendChild(g); return g;
      };
      var rowEl = function (g, k, label, tag) {
        var r = document.createElement(tag || 'div'); r.className = 'hk-pf-row'; if (tag === 'button') r.type = 'button';
        r.innerHTML = (k ? ic(k) : '') + '<span class="hk-pf-l">' + label + '</span>'; g.appendChild(r); return r;
      };
      var goRow = function (g, k, label, val, onGo, key) {
        var r = rowEl(g, k, label, 'button'); if (key) r.dataset.k = key;
        var v = document.createElement('span'); v.className = 'hk-pf-v'; v.innerHTML = val; r.appendChild(v);
        r.insertAdjacentHTML('beforeend', chev); r.onclick = onGo; return r;
      };
      var sw = function (on, onChange, label) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-pf-sw' + (on ? ' on' : ''); b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', on ? 'true' : 'false');
        if (label) b.setAttribute('aria-label', label);
        b.onclick = function (e) { e.stopPropagation(); var v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-checked', v ? 'true' : 'false'); onChange(v); };
        return b;
      };
      var swRow = function (g, k, label, on, onChange, key) {
        var r = rowEl(g, k, label); if (key) r.dataset.k = key; var b = sw(on, onChange, label); r.appendChild(b);
        r.onclick = function (e) { if (e.target !== b) b.click(); }; return r;
      };
      var miniSeg = function (opts, cur, onPick) {
        var sg = document.createElement('div'); sg.className = 'hk-re-seg hk-pf-seg';
        opts.forEach(function (o) {
          var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'hk-re-segb hk-re-pjb' + (String(cur) === String(o[0]) ? ' on' : ''); bt.textContent = o[1]; bt.dataset.v = o[0];
          bt.onclick = function (e) { e.stopPropagation(); sg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === bt); }); onPick(o[0]); };
          sg.appendChild(bt);
        });
        return sg;
      };
      var pickPage = function (title, opts, cur, onPick) {
        return { title: title, build: function (body) {
          var g = grp(body);
          opts.forEach(function (o) {
            var r = rowEl(g, null, o[1], 'button'); r.classList.add('hk-pf-radio'); r.classList.toggle('on', String(cur()) === String(o[0])); r.dataset.v = o[0];
            r.onclick = function () { onPick(o[0]); stack.pop(); render(); };
          });
        } };
      };
      var SORT = [['old', 'قدیمی بالا'], ['new', 'جدید بالا']], START = [['home', 'خانه'], ['expense', 'مخارج'], ['income', 'درآمد']];
      var lab = function (arr, v) { var f = arr.filter(function (x) { return x[0] === v; })[0]; return f ? f[1] : arr[0][1]; };
      var pages = {
        sort: function () { return pickPage('ترتیب ردیف‌ها', SORT, function () { return hkPrefs().sort || 'old'; }, function (v) {
          hkPrefSet('sort', v);
          try { renderAll(); if (typeof _detailContext !== 'undefined' && _detailContext && (_detailContext.kind === 'income' || _detailContext.kind === 'expense')) renderPersonDetailPanel(_detailContext.kind, _detailContext.title); } catch (e) {}
        }); },
        start: function () { return pickPage('صفحهٔ اول', START, function () { return hkPrefs().startPage || 'home'; }, function (v) { hkPrefSet('startPage', v); }); },
        dock: function () { return { title: 'میان‌برهای خانه', build: function (body) {
          var g = grp(body);
          ['L', 'R'].forEach(function (sd) {
            var it = HK_DOCK_ITEMS[hkDockPick(sd)];
            var r = goRow(g, null, sd === 'L' ? 'میان‌بر چپ' : 'میان‌بر راست', '<span class="hk-pf-dk"><svg viewBox="0 0 24 24" aria-hidden="true">' + it.svg + '</svg></span>' + it.label, function () { hkOpenDockPicker(sd, render); });
            r.classList.add('hk-dock-go'); r.dataset.side = sd;
          });
          var hn = document.createElement('div'); hn.className = 'hk-pf-note'; hn.textContent = 'روی صفحهٔ اصلی هم با نگه داشتن هر میان‌بر می‌توانید عوضش کنید.'; body.appendChild(hn);
        } }; },
        slides: function () { return { title: 'اسلایدهای باکس هوشمند', build: function (body) {
          var hn = document.createElement('div'); hn.className = 'hk-pf-gh'; hn.textContent = 'روشن/خاموش؛ برای جابه‌جایی، دستگیره را نگه دارید و بکشید'; body.appendChild(hn);
          var g = document.createElement('div'); g.className = 'hk-pf-grp hk-pf-slides'; body.appendChild(g);
          var off = hkPrefs().spOff || [];
          hkSpOrderKeys().forEach(function (k) {
            var r = rowEl(g, null, HK_SP_LABELS[k]); r.dataset.k = k;
            r.insertAdjacentHTML('afterbegin', '<i class="hk-pf-hnd" aria-label="جابه‌جایی"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14"/></svg></i>');
            var b = sw(off.indexOf(k) < 0, function (v) { var o2 = hkPrefs().spOff || []; var i = o2.indexOf(k); if (v && i >= 0) o2.splice(i, 1); if (!v && i < 0) o2.push(k); hkPrefSet('spOff', o2); }, HK_SP_LABELS[k]);
            r.appendChild(b);
            /* کشیدن با دستگیره */
            var h = r.querySelector('.hk-pf-hnd'), drag = null;
            h.addEventListener('pointerdown', function (e) { e.preventDefault(); try { h.setPointerCapture(e.pointerId); } catch (e1) {} drag = { y: e.clientY }; r.classList.add('drag'); });
            h.addEventListener('pointermove', function (e) {
              if (!drag) return; var dy = e.clientY - drag.y; r.style.transform = 'translateY(' + dy + 'px)';
              var hgt = r.offsetHeight;
              if (dy > hgt * 0.6 && r.nextElementSibling) { g.insertBefore(r.nextElementSibling, r); drag.y += hgt; r.style.transform = 'translateY(' + (e.clientY - drag.y) + 'px)'; }
              else if (dy < -hgt * 0.6 && r.previousElementSibling) { g.insertBefore(r, r.previousElementSibling); drag.y -= hgt; r.style.transform = 'translateY(' + (e.clientY - drag.y) + 'px)'; }
            });
            var end = function () { if (!drag) return; drag = null; r.classList.remove('drag'); r.style.transform = ''; hkPrefSet('spOrder', [].map.call(g.children, function (x) { return x.dataset.k; })); };
            h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
          });
        } }; }
      };
      var drawMain = function (body) {
        var p = hkPrefs();
        var g1 = grp(body, 'نمایش');
        var fr = rowEl(g1, 'font', 'اندازهٔ قلم'); fr.dataset.k = 'font';
        fr.appendChild(miniSeg([['s', 'کوچک'], ['m', 'معمولی'], ['l', 'بزرگ']], p.font || 'm', function (v) { hkPrefSet('font', v); }));
        goRow(g1, 'start', 'صفحهٔ اول', lab(START, p.startPage || 'home'), function () { stack.push('start'); render(); }, 'start');
        goRow(g1, 'sort', 'ترتیب ردیف‌ها', lab(SORT, p.sort || 'old'), function () { stack.push('sort'); render(); }, 'sort');
        var g2 = grp(body, 'صفحهٔ خانه');
        var dk = ['L', 'R'].map(function (sd) { return '<span class="hk-pf-dk"><svg viewBox="0 0 24 24" aria-hidden="true">' + HK_DOCK_ITEMS[hkDockPick(sd)].svg + '</svg></span>'; }).join('');
        goRow(g2, 'dock', 'میان‌برها', dk, function () { stack.push('dock'); render(); }, 'dock');
        var nOn = Object.keys(HK_SP_LABELS).filter(function (k) { return (p.spOff || []).indexOf(k) < 0; }).length;
        goRow(g2, 'slides', 'اسلایدهای باکس هوشمند', toPersianDigits(String(nOn)) + ' از ' + toPersianDigits(String(Object.keys(HK_SP_LABELS).length)), function () { stack.push('slides'); render(); }, 'slides');
        var g3 = grp(body, 'دسته‌ها و حریم');
        goRow(g3, 'cats', 'اولویت دسته‌ها', (hkCatPri('in') || hkCatPri('out')) ? 'دستی' : 'خودکار', function () { openCatPriority(render); }, 'cats');
        swRow(g3, 'privacy', 'مخفی کردن مبلغ‌ها', !!p.privacy, function (v) { hkPrefSet('privacy', v); }, 'privacy');
        var g4 = grp(body, 'اعلان‌ها');
        swRow(g4, 'sms', 'پیامک شخصی', p.nPersonal !== false, function (v) { hkPrefSet('nPersonal', v); }, 'nPersonal');
        swRow(g4, 'remind', 'یادآورها', p.nRemind !== false, function (v) { hkPrefSet('nRemind', v); try { scheduleNativeReminders(); } catch (e) {} }, 'nRemind');
        swRow(g4, 'recap', '«ماهی که گذشت» اول هر ماه', p.nRecap !== false, function (v) { hkPrefSet('nRecap', v); }, 'nRecap');
      };
      var render = function () {
        var top = stack.length ? pages[stack[stack.length - 1]]() : null;
        box.innerHTML = '';
        var hd = document.createElement('div'); hd.className = 'hk-pf-h';
        hd.innerHTML = (top ? '<button type="button" class="hk-pf-back" aria-label="برگشت"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>' : '') +
          '<div class="hk-prefs-t hk-pf-t">' + (top ? top.title : 'شخصی‌سازی') + '</div>' +
          '<button type="button" class="hk-pf-x" aria-label="بستن"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
        box.appendChild(hd);
        var body = document.createElement('div'); body.className = 'hk-pf-body' + (top ? ' sub' : ''); box.appendChild(body);
        hd.querySelector('.hk-pf-x').onclick = close;
        var bk = hd.querySelector('.hk-pf-back'); if (bk) bk.onclick = function () { stack.pop(); render(); };
        if (top) top.build(body); else drawMain(body);
      };
      render();
      document.body.appendChild(ov);
    }
    function openCatPriority(after) {
      var old = document.getElementById('hkCatPriModal'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkCatPriModal'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs'; ov.appendChild(box);
      var close = function () { ov.remove(); if (after) after(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var kind = 'out';
      var listOf = function (k) {
        var cats = k === 'in' ? HK_INCOME_CATS.slice() : HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); });
        var use = hkCatUseLoad();
        return cats.map(function (c, i) { return { c: c, s: hkCatScore(k, c.id, use, i) }; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.c; });
      };
      var save = function (ids) { var o = hkPrefs().catOrder || {}; o[kind] = ids; hkPrefSet('catOrder', o); };
      var draw = function () {
        var pri = hkCatPri(kind), L = listOf(kind);
        box.innerHTML = '<div class="hk-prefs-t">اولویت دسته‌بندی‌ها</div>';
        var tabs = document.createElement('div'); tabs.className = 'hk-re-seg';
        [['in', 'واریزی'], ['out', 'برداشت']].forEach(function (o) { var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-re-segb hk-re-pjb' + (kind === o[0] ? ' on' : ''); b.textContent = o[1]; b.onclick = function () { kind = o[0]; draw(); }; tabs.appendChild(b); });
        box.appendChild(tabs);
        var mode = document.createElement('div'); mode.className = 'hk-re-seg hk-pri-mode'; mode.style.marginTop = '8px';
        [['auto', 'خودکار'], ['man', 'دستی']].forEach(function (o) { var b = document.createElement('button'); b.type = 'button'; b.dataset.m = o[0]; b.className = 'hk-re-segb hk-re-pjb' + ((pri ? 'man' : 'auto') === o[0] ? ' on' : ''); b.textContent = o[1]; b.onclick = function () { save(o[0] === 'man' ? L.map(function (c) { return c.id; }) : null); draw(); }; mode.appendChild(b); });
        box.appendChild(mode);
        var hint = document.createElement('div'); hint.className = 'hk-prefs-hint'; hint.textContent = 'دستگیرهٔ کنار هر دسته را نگه دارید و بکشید؛ چهار تای اول روی اعلان می‌آیند';
        box.appendChild(hint);
        /* ۱.۳.۵۵: کشیدن و رها کردن (کشیدن در حالت خودکار = دستی شدن) */
        var ul = document.createElement('div'); ul.className = 'hk-pri-list';
        var renum = function () { [].forEach.call(ul.children, function (r, i) { r.classList.toggle('top', i < 4); r.querySelector('b').textContent = toPersianDigits(String(i + 1)); }); };
        L.forEach(function (c) {
          var r = document.createElement('div'); r.className = 'hk-pri-row'; r.dataset.id = c.id;
          r.innerHTML = '<b></b><span>' + escapeHtml(c.label) + '</span><i class="hk-pri-h" aria-label="جابه‌جایی"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg></i>';
          var h = r.querySelector('.hk-pri-h'), drag = null;
          h.addEventListener('pointerdown', function (e) {
            e.preventDefault(); try { h.setPointerCapture(e.pointerId); } catch (e1) {}
            drag = { y0: e.clientY }; r.classList.add('drag');
          });
          h.addEventListener('pointermove', function (e) {
            if (!drag) return;
            var sib = [].slice.call(ul.children).filter(function (x) { return x !== r; });
            var tgt = null;
            for (var q = 0; q < sib.length; q++) { var rc = sib[q].getBoundingClientRect(); if (e.clientY < rc.top + rc.height / 2) { tgt = sib[q]; break; } }
            if (tgt !== r.nextSibling) { ul.insertBefore(r, tgt); renum(); }
            var lr = ul.getBoundingClientRect(), bx = box.getBoundingClientRect();
            if (e.clientY < bx.top + 40) box.scrollTop -= 8; else if (e.clientY > bx.bottom - 40) box.scrollTop += 8;
          });
          var end = function () { if (!drag) return; drag = null; r.classList.remove('drag'); save([].map.call(ul.children, function (x) { return x.dataset.id; })); var m = box.querySelector('.hk-pri-mode button[data-m="man"]'); if (m) { box.querySelectorAll('.hk-pri-mode button').forEach(function (x) { x.classList.toggle('on', x === m); }); } };
          h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
          ul.appendChild(r);
        });
        renum();
        box.appendChild(ul);
        var bc = document.createElement('button'); bc.type = 'button'; bc.className = 'modal-btn'; bc.style.cssText = 'width:100%;margin-top:12px;'; bc.textContent = 'بستن'; bc.onclick = close;
        box.appendChild(bc);
      };
      draw();
      document.body.appendChild(ov);
    }
    try { window.openPrefsModal = openPrefsModal; } catch (eWp) {}
    (function () {
      /* اسلایدهای خاموش‌شده ساخته نمی‌شوند */
      try { SMART_PANEL_PAGES.forEach(function (pg) { var b0 = pg.build; pg.build = function (D) { if ((hkPrefs().spOff || []).indexOf(pg.key) >= 0) return null; return b0.apply(this, arguments); }; }); } catch (e) {}
      try { hkApplyPrefs(true); } catch (e2) {}
      /* صفحهٔ اول */
      setTimeout(function () { try { var sp = hkPrefs().startPage; if ((sp === 'expense' || sp === 'income') && !document.querySelector('.modal-overlay.open, #tourOverlay.open') && !document.body.classList.contains('detail-open')) openPersonDetail(hkMainTitle(), sp); } catch (e) {} }, 900);
    })();
    function hkOpenLedgerEdit(sec, idx) {
      var r = sec.rows[idx]; if (!r) return;
      var old = document.getElementById('hkLedEdit'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkLedEdit'; ov.className = 'hk-re-ov'; ov.setAttribute('data-hk-back', '1');
      var st = r.settled ? 'settled' : (r.status === 'debt' ? 'debt' : 'credit');
      ov.innerHTML = '<div class="hk-re-box"><div class="hk-re-title">ویرایش ردیف ' + toPersianDigits(String(idx + 1)) + '</div>' +
        '<div class="hk-re-f"><div class="hk-re-l">تاریخ</div><button type="button" class="hk-re-in hk-re-sel hk-led-day"></button></div>' +
        '<div class="hk-re-f"><div class="hk-re-l">شرح</div><textarea class="hk-re-in hk-led-desc" rows="1"></textarea></div>' +
        '<div class="hk-re-f"><div class="hk-re-l">مبلغ</div><input class="hk-re-in hk-led-amt" inputmode="numeric" dir="ltr"></div>' +
        '<div class="hk-re-f"><div class="hk-re-l">وضعیت</div><div class="hk-re-seg hk-led-seg"><button type="button" class="hk-re-segb is-paid is-inc" data-v="credit">بستانکار</button><button type="button" class="hk-re-segb hk-led-st-settled" data-v="settled">تسویه</button><button type="button" class="hk-re-segb is-paid is-exp" data-v="debt">بدهکار</button></div></div>' +
        '<div class="hk-re-btns"><button type="button" class="hk-re-ok">ثبت</button><button type="button" class="hk-re-no">انصراف</button></div></div>';
      var q = function (s) { return ov.querySelector(s); };
      /* ۱.۳.۵۶: کل تاریخ (روز، ماه، سال) قابل ویرایش */
      var _xe = hkLedResolve(sec.id, idx) || { y: currentYear, m: currentMonth };
      var t0e = getTodayPersian();
      var dt = r.day ? { y: parseInt(r.ly, 10) || _xe.y, m: parseInt(r.lm, 10) || _xe.m, d: parseInt(r.day, 10) || 1 } : ((currentYear === t0e.y && currentMonth === t0e.m) ? { y: t0e.y, m: t0e.m, d: t0e.d } : { y: currentYear, m: currentMonth, d: 1 });
      var dtTxt = function () { q('.hk-led-day').innerHTML = '<span>' + toPersianDigits(String(dt.d)) + ' ' + MONTHS[dt.m - 1] + ' ' + toPersianDigits(String(dt.y)) + '</span><small dir="ltr" class="hk-re-greg">' + hkGregStr(dt.y, dt.m, dt.d) + '</small>'; };
      dtTxt();
      q('.hk-led-day').onclick = function () { hkLedDatePick(dt, function (v) { dt = v; dtTxt(); }); };
      q('.hk-led-desc').value = r.desc || '';
      q('.hk-led-amt').value = r.amount ? formatNum(r.amount) : '';
      q('.hk-led-amt').addEventListener('input', function () { var d = toEnglishDigits(this.value).replace(/[^0-9]/g, ''); this.value = d ? formatNum(parseInt(d, 10)) : ''; });
      var sync = function () { ov.querySelectorAll('.hk-led-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st); }); };
      ov.querySelectorAll('.hk-led-seg button').forEach(function (b) { b.onclick = function () { st = b.dataset.v; sync(); }; });
      sync();
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      q('.hk-re-no').onclick = close;
      q('.hk-re-ok').onclick = function () {
        updateLedgerRowField(sec.id, idx, 'desc', q('.hk-led-desc').value);
        updateLedgerRowField(sec.id, idx, 'amount', parseAmount(q('.hk-led-amt').value) || 0);
        /* ۱.۳.۵۷: «تسویه» = ردیف می‌ماند و از جمع‌ها بیرون می‌رود؛ بستانکار/بدهکارِ قبلی نگه داشته می‌شود */
        if (st === 'settled') { if (!r.settled) { r.settled = true; r.settledN = currentYear * 100 + currentMonth; } }
        else { delete r.settled; delete r.settledN; updateLedgerRowField(sec.id, idx, 'status', st); }
        r.statusPicked = true;
        close();
        hkLedSetDate(sec.id, idx, dt);
      };
      document.body.appendChild(ov);
    }

    function openLedgerNameEditor(sec, titleDisplay, editBtn) {
      closeRemindBarIfOpen();
      try { editBtn.classList.add('is-editing'); } catch (e) {}
      let sheet = document.getElementById('ledgerNameSheet');
      if (sheet) sheet.remove();
      sheet = document.createElement('div');
      sheet.id = 'ledgerNameSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;box-shadow:0 12px 32px var(--shadow);';
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + Math.max(80, Math.floor((vv ? vv.height : window.innerHeight) * 0.22));
      sheet.style.top = top + 'px';

      const lab1 = document.createElement('div');
      lab1.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;';
      lab1.textContent = 'نفر اول';
      const inpA = document.createElement('input');
      inpA.type = 'text';
      inpA.value = sec.personA || '';
      inpA.placeholder = 'نام نفر اول';
      inpA.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:1rem;margin-bottom:10px;text-align:center;box-sizing:border-box;';

      const lab2 = document.createElement('div');
      lab2.style.cssText = lab1.style.cssText;
      lab2.textContent = 'نفر دوم';
      const inpB = document.createElement('input');
      inpB.type = 'text';
      inpB.value = sec.personB || '';
      inpB.placeholder = 'نام نفر دوم';
      inpB.style.cssText = inpA.style.cssText;

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

            const wasNew = !((sec.personA || '').trim() || (sec.personB || '').trim());
      const pairKey = (a, b) => {
        const x = (a || '').trim();
        const y = (b || '').trim();
        return [x, y].sort().join('\0');
      };
      const close = (fromCancel) => {
        try { sheet.remove(); } catch (e) {}
        hideNameSheetBackdrop();
        try { if (editBtn) editBtn.classList.remove('is-editing'); } catch (e) {}
        document.removeEventListener('mousedown', outside, true);
        if (fromCancel && wasNew) {
          const led = ensureLedger();
          led.sections = (led.sections || []).filter(s => s.id !== sec.id);
          persistCurrent();
          scheduleSave();
          renderLedgerTab();
        }
      };
      const save = () => {
        const a = (inpA.value || '').trim();
        const b = (inpB.value || '').trim();
        if (!a || !b) { showToast('نام هر دو نفر را وارد کنید'); return; }
        const key = pairKey(a, b);
        const led = ensureLedger();
        const dup = (led.sections || []).some(s => {
          if (s.id === sec.id) return false;
          return pairKey(s.personA, s.personB) === key;
        });
        if (dup) { showToast('این رابطه قبلاً ثبت شده است'); return; }
        sec.personA = a;
        sec.personB = b;
        if (titleDisplay) {
          titleDisplay.textContent = ledgerSectionTitle(sec);
          titleDisplay.style.opacity = '1';
        }
        persistCurrent();
        scheduleSave();
        close(false);
        renderLedgerTab();
      };
      ok.onclick = save;
      cancel.onclick = () => close(true);
      const outside = (e) => {
        if (!sheet.contains(e.target)) close(true);
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inpA.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); try { inpB.focus(); } catch (err) {} }
        if (e.key === 'Escape') { e.preventDefault(); close(true); }
      };
      inpB.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); close(true); }
      };
      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(lab1);
      sheet.appendChild(inpA);
      sheet.appendChild(lab2);
      sheet.appendChild(inpB);
      sheet.appendChild(actions);
      showNameSheetBackdrop(); sheet._hkCancel = () => close(true);
      document.body.appendChild(sheet);
      setTimeout(() => {
        try { inpA.focus(); if (inpA.value) caretToEnd(inpA); } catch (e) {}
      }, 50);
    }

    /* بیش از ۱۰ ردیف: ارتفاع = سرستون‌ها + ۱۰ ردیف اول (فقط وقتی باز است اندازه‌گیری می‌شود) */
    function hkLedCap(body, thead, tbody) {
      if (!body || !body.classList.contains('hk-led-scroll')) return;
      try { const trs = tbody.querySelectorAll('tr'); let h = thead.offsetHeight; for (let q = 0; q < 10 && q < trs.length; q++) h += trs[q].offsetHeight; if (h > 40) body.style.setProperty('max-height', h + 'px', 'important'); } catch (eH) {}
    }
    /* ۱.۳.۶۸: صف ساخت پیشاپیش ردیف‌های روابط بسته (یکی در هر نوبت بیکاری) */
    const hkLedPrebuildQ = [];
    let hkLedPrebuildT = 0;
    function hkLedPrebuildRun() {
      clearTimeout(hkLedPrebuildT);
      hkLedPrebuildT = setTimeout(function step() {
        const idle = window.requestIdleCallback || function (f) { return setTimeout(function () { f({ timeRemaining: function () { return 8; } }); }, 16); };
        idle(function () {
          const it = hkLedPrebuildQ.shift();
          if (!it) return;
          try {
            if (it.div.isConnected && it.div.classList.contains('collapsed')) {
              it.buildRows();
              if (it.body.classList.contains('hk-led-scroll') && !it.body.style.getPropertyValue('max-height')) hkLedCap(it.body, it.thead, it.tbody);
            }
          } catch (e) {}
          if (hkLedPrebuildQ.length) hkLedPrebuildT = setTimeout(step, 30);
        }, { timeout: 600 });
      }, 380);
    }
    function renderLedgerTab() {
      hkLedPrebuildQ.length = 0;
      const led = ensureLedger();
      renderLedgerFilters();
      const container = document.getElementById('sections-ledger');
      if (!container) return;
      container.innerHTML = '';

      // هدرها همیشه ثابت — فیلتر فقط روی خلاصه اعمال می‌شود
      (led.sections || []).forEach(sec => {
        if (sec.collapsed === undefined) {
          const hasData = (sec.rows || []).some(r => r.desc || r.amount || r.day) ||
            (sec.personA || '').trim() || (sec.personB || '').trim();
          sec.collapsed = !hasData;
        }

        const div = document.createElement('div');
        div.className = 'section bank-card' + (sec.collapsed ? ' collapsed' : '');
        div.dataset.secId = sec.id;
        div.id = 'sec-ledger-' + sec.id;

        const header = document.createElement('div');
        header.className = 'section-header';
        header.style.background = 'var(--header-tint)';
        header.style.color = 'var(--text)';

        const dragHandle = document.createElement('button');
        dragHandle.type = 'button';
        dragHandle.className = 'drag-handle';
        dragHandle.title = 'جابه‌جایی';
        dragHandle.setAttribute('aria-label', 'جابه‌جایی');
        dragHandle.innerHTML = DRAG_HANDLE_SVG;
        dragHandle.onclick = (e) => e.stopPropagation();

        const arrow = document.createElement('span');
        arrow.className = 'collapse-arrow';
        arrow.innerHTML = sec.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'title-wrap';
        titleWrap.style.cssText = 'flex:1;min-width:0;position:relative;';

        const titleDisplay = document.createElement('div');
        titleDisplay.className = 'title-display';
        titleDisplay.textContent = ledgerSectionTitle(sec);
        titleDisplay.style.cssText = 'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif;font-weight:bold;font-size:1.05rem;padding:5px 10px;border-radius:6px;border:none;background:transparent;color:var(--text);-webkit-text-fill-color:var(--text);display:block;visibility:visible;opacity:1;';
        if (!(sec.personA || '').trim() && !(sec.personB || '').trim()) titleDisplay.style.opacity = '0.5';
        titleWrap.appendChild(titleDisplay);

        const editTitleBtn = document.createElement('button');
        editTitleBtn.type = 'button';
        editTitleBtn.className = 'btn-edit-title';
        editTitleBtn.title = 'تغییر نام‌ها';
        editTitleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        const thisSecId = sec.id;
        editTitleBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const s = (ensureLedger().sections || []).find(x => x.id === thisSecId) || sec;
          if (!canEditRow(s)) { showToast(OWNERSHIP_LOCK_MSG); return; }
          openLedgerNameEditor(s, titleDisplay, editTitleBtn);
        };

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-del-row';
        btnDel.title = 'حذف رابطه';
        btnDel.textContent = '×';
        btnDel.onclick = (e) => { e.stopPropagation(); deleteLedgerSection(thisSecId); };

        header.appendChild(dragHandle);
        header.appendChild(arrow);
        header.appendChild(titleWrap);
        header.appendChild(editTitleBtn);
        header.appendChild(btnDel);

        // شناسه ثابت روی خود هدر تا هر کلیک فقط همان بخش را باز/بسته کند
        header.dataset.secId = sec.id;
        header.onclick = (e) => {
          if (div._skipClick || div.classList.contains('dragging')) return;
          if (e.target.closest && (
            e.target.closest('.btn-add-row') ||
            e.target.closest('.btn-del-row') ||
            e.target.closest('.btn-edit-title') ||
            e.target.closest('.drag-handle')
          )) return;
          const sid = header.dataset.secId;
          const ledNow = ensureLedger();
          const target = (ledNow.sections || []).find(s => s.id === sid);
          if (!target) return;
          target.collapsed = !target.collapsed;
          /* ۱.۳.۷۳: بازنویسی حرکت باز/بسته: ردیف‌ها (اگر هنوز ساخته نشده‌اند) و سقف ۱۰ ردیف پیش از شروع آماده می‌شوند؛
             بعد فقط کلاس عوض می‌شود و قابِ بدنه با یک انتقال CSS (بدون اندازه‌گیری و بدون جابه‌جایی بقیهٔ اجزا) باز یا بسته می‌شود.
             ضربهٔ دوباره وسط حرکت، همان‌جا جهت را برمی‌گرداند. داده و ذخیره دست نمی‌خورد. */
          if (!target.collapsed) {
            buildRows();
            if (body.classList.contains('hk-led-scroll') && !body.style.getPropertyValue('max-height')) hkLedCap(body, thead, tbody);
          }
          div.classList.toggle('collapsed', !!target.collapsed);
          arrow.innerHTML = target.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
          /* ۱.۳.۶۶: باز/بسته بودن فقط حالت نمایش است (منو همیشه بسته باز می‌شود) — هیچ ذخیره‌ای پشت این ضربه نیست */
        };

        // همیشه بدنه را بساز؛ جمع‌شدن فقط با کلاس CSS (مثل درآمد)
        const body = document.createElement('div');
        body.className = 'section-body';
        const table = document.createElement('table');
        /* ۱.۳.۵۹: عرض ستون‌ها مثل بقیهٔ جدول‌ها (ردیف باریک، بقیه برای شرح)؛ ستون حذف نداریم (حذف فقط با لانگ‌پرس) */
        const cg = document.createElement('colgroup');
        cg.innerHTML = '<col class="hk-lc-num"><col class="hk-lc-day"><col><col class="hk-lc-amt">';
        table.appendChild(cg);
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr class="hk-led-title-row"><th colspan="4">' + escapeHtml(ledgerSectionTitle(sec)) + '</th></tr><tr>' +
          '<th class="col-num">ردیف</th>' +
          '<th class="col-day">تاریخ</th>' +
          '<th class="col-desc th-desc">شرح</th>' +
          '<th class="col-amount">مبلغ</th></tr>';
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        const secRef = sec;
        /* ۱.۳.۵۶: جدول پیوسته: ردیف‌های این ماه + تسویه‌نشده‌های ماه‌های قبل، به ترتیب تاریخ */
        /* ۱.۳.۵۸: ردیف‌های خالی خودکار پاک می‌شوند (جز ردیفی که همین الان با + ساخته شده) */
        secRef.rows = (secRef.rows || []).filter(r => r && (r.amount || String(r.desc || '').trim() || _ledFresh.has(r)));
        const _view = hkLedViewRows(secRef);
        _ledViewMap[secRef.id] = _view;
        const vsec = Object.assign({}, secRef, { rows: _view.map(x => x.row) });
        /* ۱.۳.۶۶: رابطهٔ بسته ردیف نمی‌سازد؛ ساخت ردیف‌ها به اولین باز شدن موکول می‌شود */
        let rowsBuilt = false;
        const buildRows = () => { if (rowsBuilt) return; rowsBuilt = true; vsec.rows.forEach((_, i) => tbody.appendChild(buildLedgerRowEl(vsec, i))); };
        div._hkLedBuild = buildRows;
        if (!sec.collapsed) buildRows();
        /* ۱.۳.۶۸: رابطهٔ بسته در زمان بیکاری (بعد از باز شدن منو) ردیف‌هایش را می‌سازد و پنهان و بی‌ارتفاع چیده می‌شود؛
           لحظهٔ ضربه دیگر ساخت و چینش سنگینی نمی‌ماند و فقط حرکت باز شدن اجرا می‌شود */
        else hkLedPrebuildQ.push({ div, buildRows, body, thead, tbody });
        table.appendChild(tbody);
        body.appendChild(table);
        /* بیش از ۱۰ ردیف: جدول ثابت و از ردیف ۱۱ داخل خودش اسکرول */
        if (vsec.rows.length > 10) {
          body.classList.add('hk-led-scroll');
          if (!sec.collapsed) requestAnimationFrame(() => hkLedCap(body, thead, tbody));
        }
        // ＋ خارج از ناحیه اسکرول — پایین جدول ثابت
        div.classList.add('shaped-card', 'frame-step-sm');
        div.classList.remove('frame-with-step');
        const btnAddRow = document.createElement('button');
        btnAddRow.type = 'button';
        btnAddRow.className = 'ledger-add-row ledger-row-fab';
        btnAddRow.title = 'ردیف جدید';
        btnAddRow.setAttribute('aria-label', 'ردیف جدید');
        btnAddRow.innerHTML = '<svg viewBox="0 0 24 24"><path class="fab-plus" d="M12 5v14M5 12h14"/></svg>';
        btnAddRow.onclick = (e) => {
          e.stopPropagation();
          const bodyEl = div.querySelector('.section-body');
          const prevScroll = bodyEl ? bodyEl.scrollTop : 0;
          addLedgerRow(thisSecId, 1);
          requestAnimationFrame(() => {
            try {
              const b2 = div.querySelector('.section-body');
              if (b2) b2.scrollTop = prevScroll;
            } catch (err) {}
          });
        };

        div.appendChild(header);
        /* ۱.۳.۷۳: بدنه و دکمهٔ ردیف تازه داخل یک قاب که فقط ارتفاعش (۰ تا اندازهٔ واقعی) نرم عوض می‌شود */
        const lw = document.createElement('div'); lw.className = 'hk-lw';
        const lwIn = document.createElement('div'); lwIn.className = 'hk-lw-in';
        lwIn.appendChild(body); lwIn.appendChild(btnAddRow); lw.appendChild(lwIn);
        div.appendChild(lw);
        div.classList.add('hk-lv2');
        try { requestAnimationFrame(function() { ensureShapeFrame(div); }); } catch (e) {}
        container.appendChild(div);

        if (pendingRenameLedgerId && pendingRenameLedgerId === sec.id) {
          pendingRenameLedgerId = null;
          setTimeout(() => {
            try { div.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            openLedgerNameEditor(secRef, titleDisplay, editTitleBtn);
          }, 80);
        }
      });

      /* ۱.۳.۴۸: لانگ‌پرس در قرض هیچ کاری نمی‌کند (جابه‌جایی بخش‌ها برداشته شد) */
      if (false) enableLongPressReorder(container, '.section', (ids) => {
        const led2 = ensureLedger();
        const map = {};
        (led2.sections || []).forEach(s => { map[s.id] = s; });
        const ordered = (ids || []).map(id => map[id]).filter(Boolean);
        (led2.sections || []).forEach(s => {
          if (ordered.indexOf(s) < 0) ordered.push(s);
        });
        if (ordered.length) led2.sections = ordered;
        scheduleSave();
      });

      renderLedgerSummaryOnly();
      if (hkLedPrebuildQ.length) hkLedPrebuildRun();
    }

    function renderBalanceAccountFilter() {
      const wrap = document.getElementById('balanceAccountFilterWrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      const opts = [{ value: '', label: 'همهٔ حساب‌ها' }].concat(
        selectedAccountLabels().map(n => ({ value: n, label: n }))
      );
      const sel = createDarkSelect({
        options: opts,
        value: balanceSelectedAccount || '',
        onChange: (v) => {
          balanceSelectedAccount = v || '';
          renderBalanceTab();
        }
      });
      if (sel._list) { sel._list.classList.add('bank-acc-list'); sel._list.classList.add('bsr-list'); }
      wrap.appendChild(sel);
    }
    /* فیلترهای جستجو: در حالت پیش‌فرض فقط اسم فیلتر در باکس (bsr-def)، وگرنه گزینهٔ انتخاب‌شده */
    function bsrSyncFilterLabels() {
      var grid = document.querySelector('#balanceFixedHeader .bsr-grid'); if (!grid) return;
      var titles = []; try { titles = allSectionTitles(); } catch (eT) {}
      grid.querySelectorAll('.bsr-cell:not(.bsr-desc)').forEach(function (c) {
        var lab = c.querySelector('.balance-acc-label'), btn = c.querySelector('.fancy-select-btn, .dark-select-btn');
        if (!lab || !btn) return;
        var name = lab.textContent.replace(/[:：]\s*$/, ''), def = false;
        var sel = c.querySelector('select'), ds = c.querySelector('.dark-select');
        if (sel) {
          def = sel.id === 'balanceSearchRange' ? (sel.value === 'all' || !sel.value) : !sel.value;
          if (sel._fancyList) sel._fancyList.classList.add('bsr-flist');
        } else if (ds && ds.getValue) {
          var v = ds.getValue() || '';
          def = c.querySelector('#balanceSectionWrap') ? (v === (titles[0] || '') || (titles.length <= 1)) : !v;
        }
        if (btn.dataset.name !== name) btn.dataset.name = name;
        btn.classList.toggle('bsr-def', def);
      });
      grid.querySelectorAll('.bs-amt-row').forEach(function (c) { var i = c.querySelector('input'); c.classList.toggle('has-val', !!(i && i.value)); });
      var dq = grid.querySelector('.bsr-desc'), di = document.getElementById('balanceSearchInput');
      if (dq) dq.classList.toggle('has-q', !!(di && di.value));
      try { hkAmtRangeSync(); } catch (eAr) {}
    }
    /* ===== اسلایدر بازهٔ مبلغ (جستجو) =====
       درجه‌ها خودکار: ۰ و عددهای گرد تا top؛ top = کوچک‌ترین عدد گردِ ≥ صدک ۹۵ مبلغ ردیف‌های کاربر (حداقل ۱ میلیون).
       فاصلهٔ درجه‌ها برابر و نگاشت داخل هر بخش خطی؛ گام هر بخش گرد (۱/۲/۲٫۵/۵×۱۰^k). ۰ سمت چپ محور.
       دستگیرهٔ «از» روی ۰ = بی‌حداقل، دستگیرهٔ «تا» روی انتها = «و بیشتر» (بی‌حداکثر). */
    var HK_AR_NICE = [100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
    function hkNiceStep(x) {
      if (!(x > 0)) return 1;
      var k = Math.pow(10, Math.floor(Math.log10(x))), m = x / k, best = 1;
      [1, 2, 2.5, 5, 10].forEach(function (c) { if (Math.abs(c - m) < Math.abs(best - m)) best = c; });
      return best * k;
    }
    function hkAmtRangeTicks() {
      var vals = [];
      try { iterAllPeriodData(function (pd) { ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) { ((sec && sec.rows) || []).forEach(function (r) { var a = r && !r.deletedAt ? Math.abs(Number(r.amount) || 0) : 0; if (a > 0) vals.push(a); }); }); }); }); } catch (e) {}
      vals.sort(function (a, b) { return a - b; });
      var p95 = vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.95))] : 0;
      var need = Math.max(p95, 1000000), top = HK_AR_NICE[HK_AR_NICE.length - 1];
      for (var i = 0; i < HK_AR_NICE.length; i++) if (HK_AR_NICE[i] >= need) { top = HK_AR_NICE[i]; break; }
      var ticks = [0].concat(HK_AR_NICE.filter(function (v) { return v <= top; }));
      /* بیشتر از ۸ درجه جا نمی‌شود: درجه‌های کوچک کنار می‌روند */
      while (ticks.length > 7) ticks.splice(1, 1);
      return ticks;
    }
    function hkArValueAt(ticks, f) {
      var n = ticks.length - 1; if (f <= 0) return 0; if (f >= 1) return ticks[n];
      var seg = Math.min(n - 1, Math.floor(f * n)), t0 = ticks[seg], t1 = ticks[seg + 1], loc = f * n - seg;
      var st = hkNiceStep((t1 - t0) / 10), v = t0 + Math.round(loc * (t1 - t0) / st) * st;
      return Math.max(t0, Math.min(t1, v));
    }
    function hkArFracOf(ticks, v) {
      var n = ticks.length - 1; if (!(v > 0)) return 0; if (v >= ticks[n]) return 1;
      for (var i = 0; i < n; i++) if (v <= ticks[i + 1]) return (i + (v - ticks[i]) / (ticks[i + 1] - ticks[i])) / n;
      return 1;
    }
    function hkArShort(v) {
      var u = v >= 1e9 ? [1e9, 'میلیارد'] : v >= 1e6 ? [1e6, 'میلیون'] : v >= 1e3 ? [1e3, 'هزار'] : [1, ''];
      var x = Math.round(v / u[0] * 100) / 100;
      return { n: toPersianDigits(String(x)).replace('.', '٫'), u: u[1] };
    }
    var HK_AR_SHIELD = '<svg viewBox="0 0 22 26" aria-hidden="true"><path d="M2 8.5Q2 2 8.5 2h5Q20 2 20 8.5V14L11 24.5 2 14Z" fill="#08b5f5" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    function hkAmtRangeSync() {
      var host = document.getElementById('balanceAmtRange'); if (!host) return;
      var mnI = document.getElementById('balanceSearchAmtMin'), mxI = document.getElementById('balanceSearchAmtMax'); if (!mnI || !mxI) return;
      var ticks = hkAmtRangeTicks(), sig = ticks.join(',');
      if (host._sig !== sig) {
        host._sig = sig; host._ticks = ticks; host._tw = 0;
        var n = ticks.length - 1;
        host.innerHTML = '<div class="hk-ar-ticks">' + ticks.map(function (t, i) {
          var sh = hkArShort(t), left = i / n * 100;
          return '<span class="hk-ar-tick' + (i === 0 || i === n ? ' hk-ar-end' : '') + '" style="left:' + left + '%">' + (i === n ? '<bdi dir="ltr">+' + sh.n + '</bdi>' : sh.n) + (sh.u ? '<small>' + sh.u + '</small>' : '') + '</span>';
        }).join('') + '</div><div class="hk-ar-track"><div class="hk-ar-fill"></div></div>' +
          '<button type="button" class="hk-ar-h" data-k="min" aria-label="مبلغ از">' + HK_AR_SHIELD + '</button><button type="button" class="hk-ar-h" data-k="max" aria-label="مبلغ تا">' + HK_AR_SHIELD + '</button>' +
          '<span class="hk-ar-val" data-k="min"></span><span class="hk-ar-val" data-k="max"></span>';
        hkAmtRangeBind(host);
      }
      if (host._drag) return;
      var a = 0, b = 0;
      try { a = parseAmount(mnI.value || '') || 0; b = parseAmount(mxI.value || '') || 0; } catch (e) {}
      var fa = hkArFracOf(host._ticks, a), fb = b > 0 ? hkArFracOf(host._ticks, b) : 1;
      if (fb < fa) fb = fa;
      hkAmtRangePaint(host, fa, fb);
    }
    function hkAmtRangePaint(host, fa, fb) {
      host._fa = fa; host._fb = fb;
      var ticks = host._ticks, top = ticks[ticks.length - 1];
      var xa = fa * 100, xb = fb * 100;
      var fill = host.querySelector('.hk-ar-fill'); if (fill) { fill.style.left = xa + '%'; fill.style.right = (100 - xb) + '%'; }
      var hs = host.querySelectorAll('.hk-ar-h'), vs = host.querySelectorAll('.hk-ar-val');
      if (hs[0]) hs[0].style.left = xa + '%'; if (hs[1]) hs[1].style.left = xb + '%';
      var lab = function (f, isMax) {
        if (isMax && f >= 1) { var t = hkArShort(top); return t.n + ' ' + t.u + ' و بیشتر'; }
        var v = hkArValueAt(ticks, f); if (!v) return '۰'; var s2 = hkArShort(v); return s2.n + (s2.u ? ' ' + s2.u : '');
      };
      var la = lab(fa, false), lb = lab(fb, true);
      /* متن فقط اگر عوض شده (وگرنه MutationObserver فیلترها بی‌دلیل دوباره اجرا می‌شود) */
      var put = function (el, t) { if (el.textContent !== t || el.childElementCount) el.textContent = t; };
      /* ۱.۳.۳۹: برچسب یکی‌شده هم‌جهت با محور (چپ = کمتر، راست = بیشتر): ردیف flex چپ‌به‌راست، هر طرف راست‌به‌چپ */
      var putRange = function (el, a, b) {
        var h = a === b ? escapeHtml(a) : '<span class="hk-ar-rg"><span>' + escapeHtml(a) + '</span><span>–</span><span>' + escapeHtml(b) + '</span></span>';
        if (el.innerHTML !== h) el.innerHTML = h;
      };
      var setVis = function (el, v) { var x = v ? '' : 'hidden'; if (el.style.visibility !== x) el.style.visibility = x; };
      var W = host.clientWidth;
      var clampEl = function (el) {
        if (!W || el.style.display === 'none') return;
        var c = parseFloat(el.style.left) / 100 * W, hw = el.offsetWidth / 2, lo = hw - 12, hi = W - hw + 12;
        if (c < lo) el.style.left = (lo / W * 100) + '%'; else if (c > hi) el.style.left = (hi / W * 100) + '%';
      };
      var hit = function (a, b, g) { if (!a || !b) return false; var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width > 0 && rb.width > 0 && ra.left < rb.right + g && rb.left < ra.right + g; };
      /* دستگیره روی اول/آخر محور: عدد بالایش نمی‌آید (درجهٔ همان سر، زیر محور، نشان‌دهنده‌اش است) */
      var showA = fa > 0.001, showB = fb < 0.999;
      vs[1].style.display = '';
      vs[0].style.left = xa + '%'; put(vs[0], la); setVis(vs[0], showA);
      vs[1].style.left = xb + '%'; put(vs[1], lb); setVis(vs[1], showB);
      clampEl(vs[0]); clampEl(vs[1]);
      var merge = W ? (showA && showB && hit(vs[0], vs[1], 8)) : (showA && showB && fb - fa < 0.24);
      if (merge) {
        /* دو دستگیرهٔ نزدیک: یک برچسب «از – تا» وسطشان */
        vs[0].style.left = ((xa + xb) / 2) + '%'; putRange(vs[0], la, lb); setVis(vs[0], true); vs[1].style.display = 'none';
        clampEl(vs[0]);
      }
      /* درجه‌های زیر محور: اگر جا نیست درجه‌های میانی یکی در میان پنهان؛ اول و آخر همیشه می‌مانند */
      if (W && host._tw !== W) {
        host._tw = W;
        var all = [].slice.call(host.querySelectorAll('.hk-ar-tick')), lastEnd = all[all.length - 1], last = null;
        all.forEach(function (t) { t.classList.remove('hk-ar-thin', 'hk-ar-off'); });
        var endR = lastEnd ? lastEnd.getBoundingClientRect() : null;
        all.forEach(function (t, i) {
          var r = t.getBoundingClientRect();
          if (i === 0 || t === lastEnd) { last = r; return; }
          if ((last && r.left < last.right + 6) || (endR && r.right > endR.left - 6)) t.classList.add('hk-ar-thin'); else last = r;
        });
      }
    }
    function hkAmtRangeBind(host) {
      host.querySelectorAll('.hk-ar-h').forEach(function (h) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          try { h.setPointerCapture(e.pointerId); } catch (eC) {}
          var k = h.getAttribute('data-k'), r = host.getBoundingClientRect();
          host._drag = k; h.classList.add('drag');
          try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (eB) {}
          var move = function (ev) {
            var f = (ev.clientX - r.left) / r.width; f = Math.max(0, Math.min(1, f));
            var fa = host._fa, fb = host._fb;
            if (k === 'min') fa = Math.min(f, fb); else fb = Math.max(f, fa);
            /* هم‌قدم با گام گرد: دستگیره روی همان مقداری می‌نشیند که در باکس نوشته می‌شود */
            var snap = function (x, isMax) { if (x <= 0 || x >= 1) return x; var v = hkArValueAt(host._ticks, x); return v >= host._ticks[host._ticks.length - 1] && isMax ? 1 : hkArFracOf(host._ticks, v); };
            fa = snap(fa, false); fb = snap(fb, true);
            if (fb < fa) { if (k === 'min') fa = fb; else fb = fa; }
            hkAmtRangePaint(host, fa, fb);
            var id = k === 'min' ? 'balanceSearchAmtMin' : 'balanceSearchAmtMax', inp = document.getElementById(id);
            var fv = k === 'min' ? fa : fb, val = k === 'min' ? (fv <= 0 ? '' : formatNum(hkArValueAt(host._ticks, fv))) : (fv >= 1 ? '' : formatNum(hkArValueAt(host._ticks, fv)));
            if (inp && inp.value !== val) { inp.value = val; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          };
          var up = function () {
            host._drag = null; h.classList.remove('drag');
            h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          };
          h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        });
      });
    }
    (function () {
      var raf = 0, run = function () { raf = 0; try { bsrSyncFilterLabels(); } catch (e) {} };
      var queue = function () { if (!raf) raf = requestAnimationFrame(run); };
      var init = function () {
        var h = document.getElementById('balanceFixedHeader'); if (!h || h._bsrObs) return;
        h._bsrObs = new MutationObserver(queue);
        h._bsrObs.observe(h, { childList: true, subtree: true, characterData: true });
        h.addEventListener('input', queue, true);
        h.addEventListener('change', queue, true);
        /* «C» داخل باکس مبلغ: عدد پاک و جستجو به‌روز */
        /* زدن ضربدر شرح: فیلد فوکوسش را از دست ندهد (کیبورد بسته نشود) */
        /* ۱.۳.۳۷: در اندروید preventDefault روی touchstart کلیک را از بین می‌برد؛ پس پاک کردن روی touchend انجام می‌شود
           (touchstart فقط جلوی بسته شدن کیبورد را می‌گیرد) و کلیک برای ماوس/لمس‌های دیگر می‌ماند */
        var clearDesc = function () {
          var di = document.getElementById('balanceSearchInput');
          /* پاک کردن + فوکوس روی همان فیلد تا کیبورد بالا بیاید (یا بالا بماند) */
          if (di) { di.value = ''; di.dispatchEvent(new Event('input', { bubbles: true })); try { di.focus({ preventScroll: true }); } catch (eF2) { try { di.focus(); } catch (eF3) {} } }
          queue();
        };
        var onClr = function (e) { return e.target && e.target.closest && e.target.closest('.bs-desc-clr'); };
        h.addEventListener('touchstart', function (e) { if (onClr(e)) e.preventDefault(); }, { passive: false });
        h.addEventListener('touchend', function (e) { if (onClr(e)) { e.preventDefault(); e.stopPropagation(); clearDesc(); } }, { passive: false });
        h.addEventListener('mousedown', function (e) { if (onClr(e)) e.preventDefault(); });
        h.addEventListener('click', function (e) {
          if (onClr(e)) { e.preventDefault(); e.stopPropagation(); clearDesc(); return; }
          var b = e.target && e.target.closest && e.target.closest('.bs-amt-clr'); if (!b) return;
          e.preventDefault(); e.stopPropagation();
          var i = document.getElementById(b.getAttribute('data-for')); if (!i) return;
          i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true }));
          try { i.focus({ preventScroll: true }); } catch (eF) {}
          queue();
        });
        /* «تأیید» کیبورد روی مبلغ: فقط کیبورد بسته شود */
        ['balanceSearchAmtMin', 'balanceSearchAmtMax'].forEach(function (id) { var i = document.getElementById(id); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } }); });
        queue();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
      setTimeout(init, 800);
    })();
    /* ===== ۱.۳.۳۸: جمع و باز شدن کادر جستجو با اسکرول =====
       جمع: نتیجه هست، اسکرول رو به پایین (صفحه یا جدول بلند) و بعد از جمع شدن هنوز جا برای اسکرول هست (وگرنه باز/بسته پشت سر هم).
       باز: برگشت به بالای همه‌چیز. در طول انیمیشن تصمیم تازه گرفته نمی‌شود. */
    /* ۱.۳.۶۶: از نو: فقط یک ناحیهٔ اسکرول (balanceScrollBody) و کادر فیلترها بیرون از آن.
       جمع: نتیجه هست، اسکرول رو به پایین و بعد از جمع شدن هنوز جای اسکرول هست (وگرنه باز/بسته پشت سر هم).
       باز: برگشت به بالای ناحیه یا زدن فلش. جمع شدن کادر جای نوشته‌های داخل ناحیه را عوض نمی‌کند (اسکرول نمی‌پرد). */
    var hkSearchCollapse = (function () {
      var st = { c: false, lock: 0, last: 0 };
      var hdr = function () { return document.getElementById('balanceFixedHeader'); };
      var scroller = function () { return document.getElementById('balanceScrollBody'); };
      function set(c) {
        var h = hdr(); if (!h) return;
        if (st.c === c) return;
        st.c = c; st.lock = performance.now() + 680;
        /* ارتفاع واقعی هر بخش → انیمیشن از/تا همان اندازه؛ بعد از باز شدن سقف برداشته می‌شود */
        var parts = [].slice.call(h.querySelectorAll('.bs-search-head, .bsr-grid > .bsr-cell:not(.bsr-desc)'));
        parts.forEach(function (el) { el.style.maxHeight = el.scrollHeight + 'px'; });
        h.classList.add('bsr-anim');
        void h.offsetHeight;
        clearTimeout(st.t);
        st.t = setTimeout(function () {
          if (!st.c) { parts.forEach(function (el) { el.style.maxHeight = ''; }); }
          h.classList.remove('bsr-anim');
          /* اگر در طول انیمیشن به بالا برگشته بود (رویداد اسکرولش نادیده ماند)، همین حالا باز شود */
          setTimeout(function () { var sc = scroller(); if (st.c && sc && sc.scrollTop <= 2) set(false); }, 60);
        }, 650);
        h.classList.toggle('bsr-collapsed', c);
        if (c) { try { document.querySelectorAll('.dark-select-list.open, .fancy-select-list.open').forEach(function (l) { l.classList.remove('open'); }); document.querySelectorAll('.fancy-select-wrap.is-open').forEach(function (w) { w.classList.remove('is-open'); }); } catch (e) {} }
      }
      /* فهرست کوتاه جمع نمی‌شود: بعد از جمع شدن کادر (که ناحیه به همان اندازه بلندتر می‌شود) باید هنوز جای اسکرول بماند */
      function longEnough(sc) {
        var h = hdr(); if (!h) return false;
        var desc = h.querySelector('.bsr-desc'), shrink = Math.max(0, h.offsetHeight - (desc ? desc.offsetHeight : 0) - 30);
        return sc.scrollHeight - sc.clientHeight > shrink + 40;
      }
      function onScroll(e) {
        var sc = scroller();
        if (!sc || !e || e.target !== sc) return;
        if (!document.body.classList.contains('search-open')) { set(false); return; }
        var top = sc.scrollTop, down = top > st.last;
        st.last = top;
        if (performance.now() < st.lock) return;
        if (!st.c) {
          if (!down || top <= 6 || !document.querySelector('#search-result-body tr:not(.sr-wait)')) return;
          if (!longEnough(sc)) return;
          set(true);
        } else if (top <= 2) set(false);
      }
      document.addEventListener('scroll', onScroll, true);
      document.addEventListener('click', function (e) {
        var b = e.target && e.target.closest && e.target.closest('#balanceFixedHeader .bsr-handle'); if (!b) return;
        var sc = scroller(); if (!sc) return;
        try { sc.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e2) { sc.scrollTop = 0; }
        setTimeout(function () { set(false); }, 360);
      });
      return set;
    })();
    /* ===== سرچ باکس: جستجوی شرح در همهٔ ماه‌ها (با فیلتر بخش و حساب همین صفحه) ===== */
    /* دسته و بازهٔ زمانی جستجو */
    function bsCatOf(r) {
      try { var c = HKCategorizer.classify(r.desc, r); return c ? (c.ids || [c.id]) : []; } catch (e) { return []; }
    }
    /* «ماه» جستجو: ماه‌های سالی که در منوی اصلی انتخاب شده؛ «همهٔ ماه‌ها» = همهٔ ماه‌های همان سال */
    function bsInRange(range, y, m) {
      if (!range || range === 'all') return y === currentYear;
      if (/^\d+$/.test(String(range))) return y === currentYear && m === parseInt(range, 10);
      var t = getTodayPersian(), tk = t.y * 12 + t.m, k = y * 12 + m;
      if (range === 'month') return y === t.y && m === t.m;
      if (range === '3m') return k <= tk && k > tk - 3;
      if (range === 'year') return y === t.y;
      return true;
    }
    /* جدول ماه‌ها (همهٔ ماه‌ها): ماه / درآمد / مخارج / مانده با جمع سال؛ فقط ماه‌های دارای تراکنش؛ زدن ماه = فیلتر همان ماه */
    /* جدول بلند: ارتفاع کادر = عنوان ستون‌ها + ۱۱ ردیف اول (+ جمع پایین)؛ بقیه داخل جدول اسکرول؛ ردیف‌های جمع پایین چسبان */
    function hkFit11(sc) {
      if (!sc) return;
      try {
        var t = sc.querySelector('table'); if (!t) return;
        var th = t.tHead ? t.tHead.getBoundingClientRect().height : 0, rows = t.tBodies[0] ? t.tBodies[0].rows : [], h = 0;
        for (var i = 0; i < rows.length && i < 11; i++) h += rows[i].getBoundingClientRect().height;
        var fr = t.tFoot ? [].slice.call(t.tFoot.rows) : [], fh = 0;
        for (var k = fr.length - 1; k >= 0; k--) fh += fr[k].getBoundingClientRect().height;
        /* ردیف‌های جمع چسبان: هر ردیف بالای ردیف‌های جمعِ زیرش می‌نشیند */
        var acc = 0;
        for (var q = fr.length - 1; q >= 0; q--) {
          [].forEach.call(fr[q].cells, function (c) { c.style.bottom = acc + 'px'; });
          acc += fr[q].getBoundingClientRect().height;
        }
        /* ۱.۳.۶۶: داخل منوی جستجو جدول اسکرول داخلی ندارد (کل ناحیهٔ نتیجه یک اسکرول است) */
        var on = rows.length > 11 && !(sc.closest && sc.closest('#panel-balance'));
        sc.classList.toggle('on', on);
        sc.style.maxHeight = on ? Math.ceil(th + h + fh + 2) + 'px' : 'none';
      } catch (e) {}
    }
    function bsRenderMonthSummary(list, rangeF) {
      var box = document.getElementById('searchMonthSummary');
      if (!box) {
        var host = document.getElementById('searchResultBox'); if (!host) return;
        box = document.createElement('div'); box.id = 'searchMonthSummary'; box.className = 'summary-section';
        host.parentNode.insertBefore(box, host);
      }
      if (rangeF !== 'all') { box.style.display = 'none'; box.innerHTML = ''; return; }
      var by = {}, ti = 0, te = 0;
      list.forEach(function (it) { var b = by[it.m] || (by[it.m] = { i: 0, e: 0 }); if (it.tab === 'income') { b.i += it.amount; ti += it.amount; } else { b.e += it.amount; te += it.amount; } });
      var ms = Object.keys(by).map(Number).sort(function (a, b) { return a - b; });
      var net = function (v) { return '<bdi dir="ltr" class="' + (v < 0 ? 'bs-ce' : 'bs-ci') + '">' + (v < 0 ? '−' : '') + formatNum(Math.abs(v)) + '</bdi>'; };
      var html = '<div class="summary-header balance-h">ماه‌های ' + toPersianDigits(String(currentYear)) + '</div><div class="hk-scroll11"><table class="summary-table bs-month-table"><thead><tr><th>ماه</th><th>درآمد</th><th>مخارج</th><th>مانده</th></tr></thead><tbody>';
      if (!ms.length) html += '<tr class="sr-wait"><td colspan="4">در این سال ردیفی نیست</td></tr>';
      ms.forEach(function (m) { var b = by[m]; html += '<tr class="bs-mrow" data-m="' + m + '"><td class="bs-mname">' + MONTHS[m - 1] + '</td><td class="bs-ci">' + formatNum(b.i) + '</td><td class="bs-ce">' + formatNum(b.e) + '</td><td>' + net(b.i - b.e) + '</td></tr>'; });
      html += '</tbody>' + (ms.length ? '<tfoot><tr class="bs-mtotal"><td>جمع سال</td><td class="bs-ci">' + formatNum(ti) + '</td><td class="bs-ce">' + formatNum(te) + '</td><td>' + net(ti - te) + '</td></tr></tfoot>' : '') + '</table></div>';
      box.innerHTML = html; box.style.display = '';
      /* جدول ماه‌ها حداکثر ۱۲ ماه است: همه دیده می‌شود (بی اسکرول داخلی) */
      box._list = list;
      box.querySelectorAll('.bs-mrow').forEach(function (tr) {
        tr.onclick = function () { bsOpenMonthDetail(parseInt(tr.getAttribute('data-m'), 10), box._list || []); };
      });
    }
    /* پنجرهٔ جزئیات یک ماه (با فیلترهای فعلی): جمع درآمد/مخارج/مانده، ردیف‌ها به ترتیب روز، جمع هر دستهٔ مخارج.
       بک اندروید یا دکمهٔ بازگشت = برگشت به منوی جستجو */
    function bsCloseMonthDetail() { var o = document.getElementById('bsMonthDetail'); if (!o) return false; o.remove(); return true; }
    function bsOpenMonthDetail(m, list) {
      bsCloseMonthDetail();
      var rows = list.filter(function (it) { return it.m === m && it.y === currentYear; }).sort(function (a, b) { return a.d - b.d; });
      var inc = rows.filter(function (it) { return it.tab === 'income'; }), exp = rows.filter(function (it) { return it.tab === 'expense'; });
      var si = inc.reduce(function (a, it) { return a + it.amount; }, 0), se = exp.reduce(function (a, it) { return a + it.amount; }, 0);
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var tbl = function (arr, cls, ttl) {
        if (!arr.length) return '<div class="hk-tframe"><div class="bmd-ttl">' + ttl + '</div><div class="hk-bulk-hint" style="text-align:center;padding:10px">ردیفی نیست</div></div>';
        return '<div class="hk-tframe"><div class="bmd-ttl">' + ttl + '</div><div class="hk-scroll11"><table class="summary-table"><colgroup><col style="width:17%"><col><col style="width:32%"></colgroup><thead><tr><th>روز</th><th>شرح</th><th>مبلغ</th></tr></thead><tbody>' + arr.map(function (it, i) {
          return '<tr><td>' + (it.d ? p2(it.d) : '—') + '</td><td class="bmd-desc" data-i="' + cls + i + '">' + escapeHtml(it.desc || '—') + '</td><td class="' + cls + '">' + formatNum(it.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      };
      var cats = {};
      exp.forEach(function (it) { var ids = []; try { ids = bsCatOf(it.row); } catch (e) {} var id = ids[0] || '__none__'; cats[id] = (cats[id] || 0) + it.amount; });
      var catLbl = function (id) { if (id === '__none__') return 'بدون دسته'; var c = (HKCategorizer.categories || []).find(function (x) { return x.id === id; }); return c ? c.label : id; };
      var catKeys = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
      var catHtml = catKeys.length ? '<div class="hk-tframe"><div class="bmd-ttl">جمع هر دسته</div><div class="hk-scroll11"><table class="summary-table bmd-cats"><colgroup><col><col style="width:38%"></colgroup><thead><tr><th>دسته</th><th>جمع مخارج</th></tr></thead><tbody>' + catKeys.map(function (id) { return '<tr><td class="bmd-cname">' + escapeHtml(catLbl(id)) + '</td><td class="bs-ce">' + formatNum(cats[id]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '';
      var net = si - se;
      var o = document.createElement('div'); o.id = 'bsMonthDetail';
      o.innerHTML = '<div class="bmd-head"><button type="button" class="bmd-back" aria-label="بازگشت">›</button><div class="bmd-title">جزئیات ' + MONTHS[m - 1] + ' ' + toPersianDigits(String(currentYear)) + '</div></div>' +
        '<div class="bmd-body bs-month-table">' +
          '<div class="bmd-sum"><div>درآمد<b class="bs-ci">' + formatNum(si) + '</b></div><div>مخارج<b class="bs-ce">' + formatNum(se) + '</b></div><div>مانده<b class="' + (net < 0 ? 'bs-ce' : 'bs-ci') + '"><bdi dir="ltr">' + (net < 0 ? '−' : '') + formatNum(Math.abs(net)) + '</bdi></b></div></div>' +
          tbl(inc, 'bs-ci', 'درآمدها (' + toPersianDigits(String(inc.length)) + ')') +
          tbl(exp, 'bs-ce', 'مخارج (' + toPersianDigits(String(exp.length)) + ')') +
          catHtml +
        '</div>';
      document.body.appendChild(o);
      o.querySelectorAll('.hk-scroll11').forEach(hkFit11);
      o.querySelector('.bmd-back').onclick = bsCloseMonthDetail;
      o.querySelectorAll('td.bmd-desc').forEach(function (td) { td.onclick = function (e) { e.stopPropagation(); try { var pp = showCellTextPopup(td, td.textContent); if (pp) pp.style.zIndex = '100400'; } catch (eP) {} }; });
    }
    /* «واریز»: دسته‌بندی فقط مال مخارج است، پس منوی دسته غیرفعال می‌شود */
    function bsSyncTypeCat() {
      var ty = (document.getElementById('balanceSearchType') || {}).value || '';
      var cat = document.getElementById('balanceSearchCat');
      if (!cat) return;
      var off = ty === 'income';
      if (off && cat.value) cat.value = '';
      cat.disabled = off;
      var w = cat.closest ? cat.closest('.bsr-cell') : null;
      if (w) w.classList.toggle('bsr-off', off);
      try { if (cat._fancyRender) cat._fancyRender(); } catch (e) {}
    }
    /* فهرست دسته‌ها با تعداد ردیف‌های مخارج (فقط دسته‌هایی که ردیف دارند) */
    function bsFillCategories() {
      var sel = document.getElementById('balanceSearchCat');
      if (!sel) return;
      var keep = sel.value, counts = {}, none = 0;
      var range = (document.getElementById('balanceSearchRange') || {}).value || 'all';
      var curKey = periodKey(currentYear, currentMonth);
      iterAllPeriodData(function (pd, key) {
        if (key === curKey && pd !== periodData) return;
        var parts = String(key).split('-'), y = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
        if (!bsInRange(range, y, m)) return;
        ((pd.expense && pd.expense.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
            if (isPreAppPlanRow(r, y, m) || isFuturePlanRow(r, y, m)) return;
            var ids = bsCatOf(r);
            if (!ids.length) none++;
            ids.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
          });
        });
      });
      var html = '<option value="">همهٔ دسته‌ها</option>';
      (HKCategorizer.categories || []).forEach(function (c) {
        if (counts[c.id]) html += '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + ' (' + toPersianDigits(String(counts[c.id])) + ')</option>';
      });
      if (none) html += '<option value="__none__">بدون دسته (' + toPersianDigits(String(none)) + ')</option>';
      if (sel._bsHtml !== html) {
        sel.innerHTML = html; sel._bsHtml = html;
        sel.value = [].some.call(sel.options, function (o) { return o.value === keep; }) ? keep : '';
        try { if (sel._fancyRender) sel._fancyRender(); } catch (e) {}
      }
    }
    function renderBalanceSearch() {
      var inp = document.getElementById('balanceSearchInput');
      var boxR = document.getElementById('searchResultBox');
      var body = document.getElementById('search-result-body');
      var foot = document.getElementById('search-result-foot');
      if (!inp || !boxR || !body) return;
      var norm = (typeof HKCategorizer !== 'undefined') ? HKCategorizer.normalize : function (x) { return String(x || '').trim(); };
      var q = norm(inp.value);
      try { bsFillCategories(); } catch (eBs) {}
      var typeF = (document.getElementById('balanceSearchType') || {}).value || '';
      var catF = typeF === 'income' ? '' : ((document.getElementById('balanceSearchCat') || {}).value || '');
      var rangeF = (document.getElementById('balanceSearchRange') || {}).value || 'all';
      var dayF0 = 0;
      try { dayF0 = parseInt(toEnglishDigits((document.getElementById('balanceDayFilter') || {}).value || '').replace(/[^0-9]/g, '') || '0', 10) || 0; } catch (eD0) {}
      var sb = document.getElementById('balanceScrollBody');
      var balSec = sb ? sb.querySelector(':scope > .summary-section:not(#dayDetailBox):not(#searchResultBox):not(#searchMonthSummary)') : null;
      var hint = sb ? sb.querySelector(':scope > .balance-hint') : null;
      var dayBoxEl = document.getElementById('dayDetailBox');
      /* منوی جستجو فقط یک جدول دارد: «نتیجهٔ جستجو» با همهٔ فیلترها (بدون فیلتر = همهٔ ردیف‌ها) */
      if (balSec) balSec.style.display = 'none';
      if (hint) hint.style.display = 'none';
      if (dayBoxEl) dayBoxEl.style.display = 'none';
      /* روز انتخاب‌شده: فقط نتایج همان روز از ماه جاری */
      var dayF = dayF0;
      var accF = (typeof balanceSelectedAccount !== 'undefined' ? (balanceSelectedAccount || '') : '').trim();
      /* بازهٔ مبلغ (از / تا؛ هر کدام خالی = بی‌حد) */
      var amtMin = 0, amtMax = 0;
      try { amtMin = parseAmount((document.getElementById('balanceSearchAmtMin') || {}).value || '') || 0; amtMax = parseAmount((document.getElementById('balanceSearchAmtMax') || {}).value || '') || 0; } catch (eAm) {}
      /* بدون فیلتر و کلمه (عوض کردن «بخش» به‌تنهایی فیلتر حساب نمی‌شود): فقط چارچوب جدول، منتظر جستجو */
      var noFilter = !q && !catF && !typeF && rangeF === 'all' && !dayF && !accF && !amtMin && !amtMax;
      var sel = (typeof balanceSelectedTitles !== 'undefined' && balanceSelectedTitles) ? balanceSelectedTitles : [];
      var curKey = periodKey(currentYear, currentMonth);
      var list = [], titles = {};
      iterAllPeriodData(function (pd, key) {
        if (key === curKey && pd !== periodData) return;
        var parts = String(key).split('-'), y = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
        if (!bsInRange(rangeF, y, m)) return;
        /* با انتخاب دسته فقط مخارج (دسته‌بندی مال مخارج است) */
        (catF ? ['expense'] : (typeF ? [typeF] : ['income', 'expense'])).forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            var t = ((sec && sec.title) || '').trim();
            if (sel.length && sel.indexOf(t) < 0) return;
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (tab === 'expense' && (isPreAppPlanRow(r, y, m) || isFuturePlanRow(r, y, m))) return;
              if (accF && (r.account || '').trim() !== accF) return;
              if (q && norm(r.desc).indexOf(q) < 0) return;
              if (amtMin && Number(r.amount) < amtMin) return;
              if (amtMax && Number(r.amount) > amtMax) return;
              if (dayF && dayNum(r) !== dayF) return;
              if (catF) { var ids = bsCatOf(r); if (catF === '__none__' ? ids.length : ids.indexOf(catF) < 0) return; }
              titles[t] = 1;
              list.push({ y: y, m: m, d: dayNum(r) || 0, desc: r.desc || '—', amount: Number(r.amount) || 0, tab: tab, title: t, bank: (r.account || '').trim(), row: r });
            });
          });
        });
      });
      /* تاریخ زودتر بالای جدول */
      list.sort(function (a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); });
      /* منوی جستجو فقط یک جدول دارد: «نتیجهٔ جستجو» (جدول ماه‌ها برداشته شد) */
      try { window._bsLastList = list; } catch (eLl) {}
      try { bsRenderMonthSummary(list, 'none'); } catch (eMs) {}
      /* بدون فیلتر و کلمه: فقط جدول ماه‌ها؛ ردیف‌ها منتظر جستجو */
      if (noFilter) {
        body.innerHTML = '<tr class="sr-wait"><td colspan="5">برای دیدن نتایج، فیلتری انتخاب کنید یا کلمه‌ای بنویسید</td></tr>';
        if (foot) foot.innerHTML = '';
        document.getElementById('searchResultTitle').textContent = 'نتیجهٔ جستجو';
        boxR.style.display = '';
        return;
      }
      var many = Object.keys(titles).length > 1;
      body.innerHTML = '';
      var sumI = 0, sumE = 0;
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      list.forEach(function (it) {
        if (it.tab === 'income') sumI += it.amount; else sumE += it.amount;
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.className = 'sec-name';
        var full = it.desc + (many ? ' (' + it.title + ')' : '');
        td.textContent = full;
        td.title = full;
        td.onclick = function (e) {
          e.stopPropagation();
          /* جستجو فقط برای دیدن است؛ دستهٔ هر شرح از اسلاید «دسته‌بندی مخارج» باکس هوشمند عوض می‌شود */
          try { showCellTextPopup(td, full); } catch (err) {}
        };
        var tdB = document.createElement('td');
        tdB.className = 'sr-bank';
        tdB.textContent = it.bank ? toPersianDigits(it.bank) : '—';
        tdB.title = it.bank || '';
        var tdD = document.createElement('td');
        tdD.className = 'sr-date';
        tdD.textContent = toPersianDigits(String(it.y)) + '/' + p2(it.m) + (it.d ? '/' + p2(it.d) : '');
        var tdV = document.createElement('td');
        tdV.className = 'val';
        tdV.textContent = formatNum(it.amount);
        /* نتیجهٔ جستجو: واریز سبز و برداشت قرمز (همان رنگ مبالغ درآمد و مخارج) */
        tdV.classList.add(it.tab === 'income' ? 'sr-inc' : 'sr-exp');
        /* ۱.۳.۴۳: شمارهٔ ردیف ستون اول */
        var tdN = document.createElement('td');
        tdN.className = 'sr-num';
        tdN.textContent = toPersianDigits(String(body.children.length + 1));
        tr.appendChild(tdN); tr.appendChild(tdD); tr.appendChild(td); tr.appendChild(tdB); tr.appendChild(tdV);
        body.appendChild(tr);
      });
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.7;">نتیجه‌ای پیدا نشد</td></tr>';
      }
      if (foot) {
        foot.innerHTML = '';
        var addF = function (label, v, color) {
          var tr = document.createElement('tr');
          /* ۱.۳.۴۹: خانهٔ مبلغ جمع پهن‌تر (ستون حساب + مبلغ)؛ خط جداکننده زیر مرز شرح و حساب */
          tr.innerHTML = '<td class="sec-name" colspan="3">' + label + '</td><td class="val" colspan="2">' + formatNum(v) + '</td>';
          tr.querySelector('td.val').style.setProperty('color', color, 'important');
          /* متن طولانی: با زدن، باکس شناور یک‌خطی */
          tr.querySelectorAll('td').forEach(function (td) { td.style.cursor = 'pointer'; td.onclick = function (ev) { ev.stopPropagation(); try { showCellTextPopup(td, td.classList.contains('val') ? label + ': ' + formatNum(v) : label); } catch (eP) {} }; });
          foot.appendChild(tr);
        };
        var _lt = document.documentElement.getAttribute('data-theme') === 'light';
        /* یک ماه انتخاب شده: جمع درآمد و مخارج همان ماه؛ وگرنه اگر چند مورد پیدا شد، جمع کل آن‌ها */
        if (rangeF !== 'all') {
          var mName = MONTHS[parseInt(rangeF, 10) - 1] || '';
          if (typeF !== 'expense' && !catF) addF('درآمد کل ' + mName, sumI, _lt ? '#17834a' : '#9ee858');
          if (typeF !== 'income') addF('مخارج کل ' + mName, sumE, _lt ? '#dc2626' : '#ff6b4a');
        } else if (list.length > 1) {
          if (sumI > 0) addF('جمع درآمد (' + toPersianDigits(String(list.filter(function (x) { return x.tab === 'income'; }).length)) + ' مورد)', sumI, _lt ? '#17834a' : '#9ee858');
          if (sumE > 0) addF('جمع مخارج (' + toPersianDigits(String(list.filter(function (x) { return x.tab !== 'income'; }).length)) + ' مورد)', sumE, _lt ? '#dc2626' : '#ff6b4a');
        }
      }
      document.getElementById('searchResultTitle').textContent = 'نتیجهٔ جستجو (' + toPersianDigits(String(list.length)) + ' مورد)';
      boxR.style.display = '';
      hkFit11(document.getElementById('searchResultScroll'));
    }
    (function () {
      function bind() {
        var inp = document.getElementById('balanceSearchInput');
        if (!inp || inp._srBound) return;
        inp._srBound = true;
        var t = 0;
        inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(renderBalanceSearch, 150); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { inp.blur(); } catch (e2) {} } });
        ['balanceSearchAmtMin', 'balanceSearchAmtMax'].forEach(function (id) {
          var a = document.getElementById(id); if (!a) return;
          try { hkAmountInput(a); } catch (eH) {}
          var ta = 0;
          a.addEventListener('input', function () { clearTimeout(ta); ta = setTimeout(renderBalanceSearch, 250); });
          a.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { a.blur(); } catch (e2) {} } });
        });
        try { renderBalanceDayFilter(); } catch (eDf) {}
        ['balanceSearchType', 'balanceSearchRange', 'balanceSearchDay', 'balanceSearchCat'].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('change', function () {
            if (id === 'balanceSearchDay') {
              var hd = document.getElementById('balanceDayFilter'); if (hd) hd.value = el.value || '';
              try { renderBalanceTab(); } catch (eT) {}
            }
            if (id === 'balanceSearchType') bsSyncTypeCat();
            renderBalanceSearch();
          });
          try { enhanceSelectFont(el); } catch (eF) {}
        });
        try { bsFillCategories(); } catch (eB) {}
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
    })();
    function renderBalanceTab() {
      if (!document.getElementById('balanceFilters')) return;
      renderBalanceSectionFilter();
      renderBalanceDayFilter();
      renderBalanceAccountFilter();

      const dayF = parseInt(toEnglishDigits(document.getElementById('balanceDayFilter').value || '').replace(/[^0-9]/g, '') || '0', 10) || 0;
      const accF = (balanceSelectedAccount || '').trim();

      // recompute balance with filter
      const expMap = {}, incMap = {}, order = [];
      function addSec(tab, sec, isInc) {
        const title = (sec.title || '').trim() || '—';
        if (balanceSelectedTitles.length && !balanceSelectedTitles.includes(title)) return;
        /* همان قاعدهٔ «درآمد کل / خرج کل» کارت کاربر (sectionPaidUnpaidTotal)، با فیلتر روز و حساب */
        const fRows = (sec.rows || []).filter(r => r && (!dayF || dayNum(r) === dayF) && (!accF || (r.account || '').trim() === accF));
        const sum = sectionPaidUnpaidTotal({ rows: fRows }, isInc ? { personalIncomeOnly: true } : { personalExpenseOnly: true }).total;
        if (isInc) incMap[title] = (incMap[title] || 0) + sum;
        else expMap[title] = (expMap[title] || 0) + sum;
        if (!order.includes(title)) order.push(title);
      }
      (periodData.expense.sections || []).forEach(s => addSec('expense', s, false));
      (periodData.income.sections || []).forEach(s => addSec('income', s, true));

      const tbody = document.getElementById('balance-body');
      tbody.innerHTML = '';
      let gExp = 0;
      let gIncOnly = 0;
      const openingBal = (typeof sumFilteredOpeningBalance === 'function')
        ? sumFilteredOpeningBalance(accF)
        : 0;
      order.forEach(title => {
        /* موجودی کل هر بخش = جمع ردیف‌های درآمد همان بخش (با فیلتر حساب) */
        const bal = incMap[title] || 0;
        gIncOnly += bal;
        const exp = expMap[title] || 0;
        const remain = bal - exp;
        gExp += exp;
        const color = remain > 0 ? '#16a34a' : (remain < 0 ? '#dc2626' : 'var(--text)');
        const tr = document.createElement('tr');
        const tdSec = document.createElement('td');
        tdSec.className = 'sec-name';
        tdSec.textContent = title;
        tdSec.title = title;
        tdSec.onclick = (e) => {
          e.stopPropagation();
          if ((title || '').trim()) try { showCellTextPopup(tdSec, title); } catch (err) {}
        };
        tr.appendChild(tdSec);
        const tdInc = document.createElement('td');
        tdInc.className = 'val inc-cell';
        tdInc.style.color = 'var(--text)';
        tdInc.textContent = formatNum(bal);
        tr.appendChild(tdInc);
        const tdExp = document.createElement('td');
        tdExp.className = 'val exp-cell';
        tdExp.style.color = 'var(--text)';
        tdExp.textContent = formatNum(exp);
        tr.appendChild(tdExp);
        const tdRem = document.createElement('td');
        tdRem.className = 'val';
        tdRem.style.color = color;
        tdRem.textContent = formatNum(remain);
        tr.appendChild(tdRem);
        tbody.appendChild(tr);
      });
      /* جمع درآمد کل (بدون موجودی ماه قبل) − جمع خرج کل */
      const gBal = gIncOnly;
      const gRemain = gBal - gExp;
      document.getElementById('balIncome').textContent = formatNum(gBal);
      document.getElementById('balExpense').textContent = formatNum(gExp);
      document.getElementById('balIncome').style.color = 'var(--text)';
      document.getElementById('balExpense').style.color = 'var(--text)';
      const balEl = document.getElementById('balRemain');
      balEl.textContent = formatNum(gRemain);
      balEl.style.color = gRemain > 0 ? '#16a34a' : (gRemain < 0 ? '#dc2626' : 'var(--text)');

      // day detail
      const dayBox = document.getElementById('dayDetailBox');
      const dayBody = document.getElementById('day-detail-body');
      if (dayF) {
        dayBox.style.display = '';
        document.getElementById('dayDetailTitle').textContent = 'جزئیات روز ' + toPersianDigits(dayF);
        dayBody.innerHTML = '';
        function rowsForTitle(tab, title) {
          const out = [];
          (periodData[tab].sections || []).forEach(sec => {
            if ((sec.title || '').trim() !== title) return;
            sec.rows.forEach(r => {
              if (dayNum(r) !== dayF) return;
              if (accF && (r.account || '').trim() !== accF) return;
              if (!r.desc && !r.amount) return;
              out.push(r);
            });
          });
          return out;
        }
        const titlesOrdered = [];
        const seenTitles = new Set();
        ['income', 'expense'].forEach(tab => {
          (periodData[tab].sections || []).forEach(sec => {
            const t = (sec.title || '').trim();
            if (balanceSelectedTitles.length && !balanceSelectedTitles.includes(t)) return;
            if (!seenTitles.has(t)) { seenTitles.add(t); titlesOrdered.push(t); }
          });
        });
        function addRow(r, title, label) {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.className = 'sec-name';
          /* نام کاربر در پرانتز فقط وقتی «همه بخش‌ها» انتخاب است */
          const showTitle = title && !balanceSelectedTitles.length;
          const full = (r.desc || '—') + (showTitle ? (' (' + title + ')') : '');
          td.textContent = full;
          td.title = full;
          td.onclick = (e) => {
            e.stopPropagation();
            try { showCellTextPopup(td, full); } catch (err) {}
          };
          tr.appendChild(td);
          const tdL = document.createElement('td');
          tdL.textContent = label;
          tr.appendChild(tdL);
          const tdV = document.createElement('td');
          tdV.className = 'val';
          tdV.textContent = formatNum(r.amount || 0);
          /* مخارج پرداخت‌نشده قرمز؛ بقیه بدون تغییر */
          if (label === 'مخارج' && (r.status || 'paid') !== 'paid') tdV.style.setProperty('color', '#ff453a', 'important');
          tr.appendChild(tdV);
          dayBody.appendChild(tr);
          return tr;
        }
        let anyGroup = false;
        let lastTrOfGroup = null;
        titlesOrdered.forEach((title) => {
          const incRows = rowsForTitle('income', title);
          const expRows = rowsForTitle('expense', title);
          if (!incRows.length && !expRows.length) return;
          if (anyGroup && lastTrOfGroup) lastTrOfGroup.classList.add('day-detail-group-end');
          anyGroup = true;
          incRows.forEach(r => { lastTrOfGroup = addRow(r, title, 'درآمد'); });
          expRows.forEach(r => { lastTrOfGroup = addRow(r, title, 'مخارج'); });
        });
      } else {
        dayBox.style.display = 'none';
      }
      /* حین جستجو: جدول مانده و جزئیات روز پنهان؛ نتیجهٔ جستجو به‌جایشان */
      try { renderBalanceSearch(); } catch (eSr2) {}
      // ارتفاع/اسکرول balance-scroll-body بعد از تغییر فیلتر تازه شود
      try {
        const sb = document.getElementById('balanceScrollBody');
        if (sb) {
          void sb.offsetHeight;
          if (dayBox && dayBox.style.display !== 'none') {
            requestAnimationFrame(() => {
              try {
                const sbR = sb.getBoundingClientRect();
                const dR = dayBox.getBoundingClientRect();
                if (dR.bottom > sbR.bottom - 4) {
                  sb.scrollTop += Math.ceil(dR.bottom - sbR.bottom + 12);
                }
              } catch (e2) {}
            });
          }
        }
      } catch (e) {}
    }



    // اطمینان از دسترسی global برای onclick در WebView
    try {
      window.openTrashModal = openTrashModal;
      window.restoreSelectedTrash = restoreSelectedTrash;
      window.closeTrashModal = closeTrashModal;
      window.emptyTrashConfirm = emptyTrashConfirm;
      window.shareFullBackup = shareFullBackup;
      window.openBankAccountsModal = openBankAccountsModal;
      window.closeBankAccountsModal = closeBankAccountsModal;
      window.exportFullBackup = exportFullBackup;
      window.askBackupParts = askBackupParts;
      window.triggerImportBackup = triggerImportBackup;
      window.selectedAccountLabels = selectedAccountLabels;
      window.pushToTrash = pushToTrash;
    } catch (e) { console.warn('window export', e); }

    loadBankAccounts();
    try { loadTrash(); } catch (e) {}
    loadSmsAccountBankMap();
    loadRecurring();
    try { loadUserReminders(); } catch (e) {}
    try { checkUserReminders(true); } catch (e) {} /* بدون تأخیر: باکس یادآور هم‌زمان با بقیهٔ صفحه ظاهر شود */
    _hkBoot = true;
    loadArchive();
    loadCurrent();
    /* هر بار باز شدن: ماه نمایش‌داده‌شده = ماه امروز (اگر روی ماه آینده بسته شده بود، برمی‌گردد) */
    try {
      var _bt = getTodayPersian();
      /* ۱.۳.۵۱: ماه گذشته هم (مثلاً بسته شدن روی ۱۴۰۰) → همیشه ماه امروز */
      if (_bt && _bt.y && (currentYear * 100 + currentMonth) !== (_bt.y * 100 + _bt.m)) { currentYear = _bt.y; currentMonth = _bt.m; loadCurrent(); }
    } catch (eBootM) {}
    try { autoAdvancePersianMonthIfNeeded(); } catch (eAutoM) {}
    /* درآمدهای ثابت: ردیف ماه‌های رسیده (از آخرین بازشدن تا امروز) */
    try { ensureRecurringRows({ render: false }); } catch (eRec) {}
    try {
      var _hkLastTodayKey = recTodayKey();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        try {
          var nk = recTodayKey();
          if (nk !== _hkLastTodayKey) {
            if (recMonthKey(currentYear, currentMonth) === _hkLastTodayKey) { autoAdvancePersianMonthIfNeeded(); }
            _hkLastTodayKey = nk;
          }
        } catch (e) {}
        try { ensureRecurringRows(); } catch (e) {}
      });
    } catch (eRecV) {}
    try {
      var _recLegacy = recLegacyItems();
      if (_recLegacy.length) setTimeout(function () {
        try { showToast('درآمد ثابت «' + (_recLegacy[0].name || '') + '»' + (_recLegacy.length > 1 ? ' و ' + toPersianDigits(_recLegacy.length - 1) + ' مورد دیگر' : '') + ' تاریخ شروع ندارد؛ از منوی درآمد ثابت تنظیم کنید'); } catch (e) {}
      }, 4000);
    } catch (eRecL) {}
    try { migrateAllBankNamesInData(); } catch (e) {}
    /* مهاجرت ایمن: موجودی‌های اولیهٔ بی‌صاحب (حساب حذف/تغییرنام‌شده) کنار گذاشته و برای بازیابی نگه داشته می‌شوند */
    try { cleanupOrphanedAccountOpenings({ reason: 'boot' }); } catch (eOrph) {}
    initSelectors();
    updateTabUI();
    ensureLocalUid();
    /* ابر حذف شد — پاک‌سازی وضعیت حساب مشترک قدیمی */
    try {
      sharedAccountId = '';
      familyCode = '';
      localStorage.removeItem(STORAGE_KEY + '_sharedAccount');
      localStorage.removeItem(STORAGE_KEY + '_syncQueue');
    } catch (eCloudClr) {}
    /* بدون همگام‌سازی / بدون toast ابری */
    try { updateFamilyUI(); } catch (eFU) {}
    try {
      currentTab = 'home';
      _detailContext = null;
      activatePanel('home');
      renderHomeCards();
      /* home-scroll-stable */
      try { window.scrollTo(0, 0); } catch (e) {}
      try { syncMatchCardWidth(); } catch (e2) {}
    } catch (e) { console.error('home boot', e); }
    renderAll();
    _hkBoot = false;
    try { setTimeout(function () { Promise.resolve(hkMirrorRecover()).catch(function () {}).then(function () { return hkRunMigrations(); }).catch(function () {}); }, 600); } catch (eMr) {}
    /* بعد از بارگذاری کامل داده — فقط یک‌بار عدد نهایی موجودی */
    try {
      _hbcReady = true;
      _hbcLast = null;
      var _amtBoot = document.getElementById('homeBalanceAmt');
      if (_amtBoot) _amtBoot._hbcBusy = false;
      if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
    } catch (eHbcBoot) {}
    requestNotifPermission();
    try {
      // بعد از نوتیف (و پیامک در Capacitor)، منوی انتخاب حساب اولین‌بار
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BankSms) {
        const BankSms = window.Capacitor.Plugins.BankSms;
        Promise.resolve()
          .then(() => BankSms.requestPermission())
          .catch(() => {})
          .finally(() => {
            try { maybeShowFirstRunBankSetup(); } catch (e) {}
          });
      } else {
        maybeShowFirstRunBankSetup();
      }
    } catch (e) {
      try { maybeShowFirstRunBankSetup(); } catch (e2) {}
    }
    checkInstallReminders();
    try { checkUserReminders(true); } catch (eUr) {}
    /* startSyncLoop removed — بدون ابر */

    // ارتفاع هدر ثابت را با محتوا هم‌تراز کن
    requestAnimationFrame(() => {
      syncChromeHeight();
      moveTabIndicator();
      setTimeout(syncChromeHeight, 50);
      setTimeout(syncChromeHeight, 300);
    });
    if (!familyCode) {
      // اولین ورود — مودال خانواده را نشان بده (اختیاری)
      // کاربر می‌تواند بعداً از منو بسازد
    }
    // فونت وب ممکن است بعد از رندر اول بارگذاری شود و اندازه متن‌ها را عوض کند؛
    // بعد از آماده شدن فونت، اگر تب مانده باز است دوباره اندازه باکس «همه روزها» را با «همه بخش‌ها» هماهنگ کن
    if (window.document && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (currentTab === 'balance') renderBalanceTab();
      }).catch(() => {});
    }
