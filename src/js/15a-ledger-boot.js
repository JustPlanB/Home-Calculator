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
      if (r.settled) { tdNum.innerHTML = '<svg class="hk-led-tick" viewBox="0 0 24 24" aria-label="تسویه شد"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; tr.classList.add('hk-led-settled');
        /* ۱.۳.۸۶: ضربه روی تیک = باکس شناور با توضیح */
        tdNum.onclick = function (e) { try { e.stopPropagation(); } catch (eSp) {} try { showCellTextPopup(tdNum.firstChild, 'تسویه شد: این ردیف تسویه شده؛ در جدول می‌ماند ولی در جمع‌ها و مانده حساب نمی‌شود.', { wrap: true }); } catch (eP) {} };
      }

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

