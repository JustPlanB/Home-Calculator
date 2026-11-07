    /* ===== بازیابی امن: عکس از وضعیت قبل، ثبت هر شکست نوشتن، و در صورت شکست بازگشت کامل و بررسی‌شده =====
       قبل از هر نوشتن، کل localStorage و دادهٔ اصلی حافظه کپی می‌شود. اگر هر نوشتنی (یا هر بخش بازیابی) شکست بخورد،
       همهٔ کلیدها به همان مقدار قبل برمی‌گردند، برابری بررسی می‌شود و نتیجه false است (پیام موفقیت نشان داده نمی‌شود). */
    var _hkRestoreAborted = false, _hkLastRestoreFailedParts = [];
    function hkSnapshotStorage() {
      var o = {};
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); }
      return o;
    }
    function hkRestoreStorage(snap) {
      var cur = hkSnapshotStorage();
      /* اول کلیدهای تازه و تغییرکرده برداشته می‌شوند (فضا آزاد شود)، بعد مقدارهای قبلی نوشته می‌شوند */
      Object.keys(cur).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(snap, k) || snap[k] !== cur[k]) { try { localStorage.removeItem(k); } catch (e) {} } });
      Object.keys(snap).forEach(function (k) { if (localStorage.getItem(k) !== snap[k]) { try { localStorage.setItem(k, snap[k]); } catch (e) {} } });
      /* ۱.۳.۶۳: نسخهٔ دوم (IndexedDB) هم به همان دادهٔ برگشتی برمی‌گردد */
      try { var fk = familyStorageKey(familyCode), mu = 0; try { mu = JSON.parse(snap[STORAGE_KEY + '_meta'] || '{}').localUpdatedAt; } catch (eU) {} if (snap[fk]) hkMirrorSchedule(snap[fk], mu); } catch (eM) {}
      var after = hkSnapshotStorage(), ka = Object.keys(after), ks = Object.keys(snap);
      return ka.length === ks.length && ks.every(function (k) { return after[k] === snap[k]; });
    }
    function hkSnapshotMemory() {
      var c = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
      return {
        archive: c(archive), periodData: c(periodData), plans: c(plans), recurringIncomes: c(recurringIncomes),
        selectedBankAccounts: c(selectedBankAccounts), trashItems: c(trashItems), smsAccountBankMap: c(smsAccountBankMap),
        userReminders: c(userReminders), financialSubjects: c(_financialSubjects), currentYear: currentYear, currentMonth: currentMonth,
        theme: document.documentElement.getAttribute('data-theme')
      };
    }
    function hkRestoreMemory(m) {
      archive = m.archive; periodData = m.periodData; plans = m.plans; recurringIncomes = m.recurringIncomes;
      selectedBankAccounts = m.selectedBankAccounts; trashItems = m.trashItems; smsAccountBankMap = m.smsAccountBankMap;
      userReminders = m.userReminders; _financialSubjects = m.financialSubjects; currentYear = m.currentYear; currentMonth = m.currentMonth;
      try { if (m.theme && m.theme !== document.documentElement.getAttribute('data-theme')) applyTheme(m.theme); } catch (eTh) {}
      try { initSelectors(); } catch (e1) {}
      try { updateTabUI(); } catch (e2) {}
      try { renderAll(); } catch (e3) {}
      try { _hbcLast = null; renderHomeCards(); } catch (e4) {}
    }
    function applyBackupData(data, mode) {
      if (!data || typeof data !== 'object') return false;
      _hkRestoreAborted = false; _hkLastRestoreFailedParts = [];
      var snap, mem;
      try { snap = hkSnapshotStorage(); mem = hkSnapshotMemory(); }
      catch (eSnap) {
        try { showToastLong('بازیابی شروع نشد (وضعیت فعلی قابل کپی نبود)؛ هیچ تغییری اعمال نشد.'); } catch (eT) {}
        return false;
      }
      var failedKeys = [], origSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        try { return origSet.call(this, k, v); }
        catch (e) { if (this === localStorage) failedKeys.push(String(k)); throw e; }
      };
      var res, threw = false;
      _hkPersist.quiet++;
      try { res = _applyBackupDataUnsafe(data, mode); }
      catch (eApply) { threw = true; try { console.warn('restore: apply failed:', eApply && eApply.name ? eApply.name : 'error'); } catch (eL) {} }
      finally { Storage.prototype.setItem = origSet; _hkPersist.quiet--; }
      var failed = threw || failedKeys.length > 0 || _hkLastRestoreFailedParts.length > 0;
      if (!failed) return res;
      /* شکست: بازگشت به وضعیت پیش از بازیابی */
      _hkRestoreAborted = true;
      var rolled = false;
      try { rolled = hkRestoreStorage(snap); } catch (eRb) { rolled = false; }
      try { hkRestoreMemory(mem); } catch (eRm) {}
      try {
        showToastLong(rolled
          ? 'بازیابی انجام نشد چون ذخیره‌سازی ناموفق بود؛ هیچ تغییری اعمال نشد و اطلاعات قبلی دست‌نخورده است.'
          : 'بازیابی ناموفق بود و برگرداندن کامل وضعیت قبل هم ممکن نشد. برنامه را نبندید و فوراً یک پشتیبان بگیرید؛ پشتیبان ایمنی پیش از بازیابی هم (در صورت فعال بودن) در حافظهٔ داخلی نرم‌افزار هست و «آخرین پشتیبان» در Downloads/HesabKetab.');
      } catch (eT2) {}
      return false;
    }
    function _applyBackupDataUnsafe(data, mode) {
      // mode: 'replace' | 'merge'
      if (!data || typeof data !== 'object') return false;
      /* کامل یا جزئی: فقط پشتیبان کامل حق جایگزینی کل داده را دارد؛ فایل جزئی/نامعلوم فقط بخش‌های خودش را عوض می‌کند */
      var _scope = bkBackupScope(data);
      var _fullReplace = mode === 'replace' && _scope.complete;
      /* اعتبارسنجی پیش از ادغام: ساختار، حساب‌های تکراری، موجودی‌های اولیهٔ یتیم، سطل زبالهٔ تکراری.
         اگر اعتبارسنجی شکست بخورد، هیچ چیزی اعمال نمی‌شود. */
      var _restoreReport = null;
      try { data = JSON.parse(JSON.stringify(data)); _restoreReport = sanitizeBackupData(data, mode); }
      catch (eSan) {
        try { console.warn('restore: validation failed:', eSan && eSan.name ? eSan.name : 'error'); } catch (e) {}
        try { showToastLong('فایل پشتیبان بررسی نشد و هیچ تغییری اعمال نشد.'); } catch (eT) {}
        return false;
      }
      /* خطای بازیابی هر بخش بی‌صدا رد نشود: نام بخش در گزارش پایان بازیابی و کنسول (بدون محتوای داده) */
      function bkRestoreFail(part, err) {
        if (!_restoreReport) _restoreReport = { orphanAccounts: 0, orphanEntries: 0, invalidRecords: 0, mergedAccounts: 0, dupTrash: 0, failedParts: [] };
        if (!_restoreReport.failedParts) _restoreReport.failedParts = [];
        if (_restoreReport.failedParts.indexOf(part) < 0) _restoreReport.failedParts.push(part);
        if (_hkLastRestoreFailedParts.indexOf(part) < 0) _hkLastRestoreFailedParts.push(part);
        try { console.warn('restore: part "' + part + '" failed:', err && err.name ? err.name : 'error'); } catch (e) {}
      }
      /* واریزهای آرشیو درآمد ثابت: فقط ردیف‌هایی که در داده نیستند اضافه می‌شوند (تکراری ساخته نمی‌شود) */
      var _restoreRecArchive = function () {
        try { if (Array.isArray(data.recurringArchive) && data.recurringArchive.length) hkRecArchiveUnpack(data.recurringArchive); } catch (eRa) { bkRestoreFail('recurringArchive', eRa); }
      };
      if (mode === 'replace') {
        if (data.archive && typeof data.archive === 'object') {
          if (_fullReplace) archive = data.archive;
          else { try { persistCurrent(); } catch (eP) {} archive = replaceArchiveScoped(archive, data.archive, _scope.cards); }
        }
        if (Array.isArray(data.plans)) plans = data.plans;
        if (Array.isArray(data.recurringIncomes)) {
          recurringIncomes = data.recurringIncomes;
          try { saveRecurring(); } catch (e) { bkRestoreFail('recurringIncomes', e); }
        }
        _restoreRecArchive();
      } else {
        // merge
        archive = mergeArchives(archive, data.archive || {});
        if (Array.isArray(data.plans)) plans = mergePlansList(plans, data.plans);
        if (Array.isArray(data.recurringIncomes)) {
          recurringIncomes = mergeRecurringList(recurringIncomes, data.recurringIncomes);
          try { saveRecurring(); } catch (e) { bkRestoreFail('recurringIncomes', e); }
        }
        _restoreRecArchive();
      }
      // cardMeta: هم روی periodData هم mirror در localStorage و داخل archive ماه جاری
      if (data.cardMeta && typeof data.cardMeta === 'object') {
        try {
          if (!periodData.cardMeta) periodData.cardMeta = {};
          Object.keys(data.cardMeta).forEach(k => {
            periodData.cardMeta[k] = data.cardMeta[k];
          });
          localStorage.setItem(STORAGE_KEY + '_cardMeta', JSON.stringify(periodData.cardMeta));
        } catch (e) { bkRestoreFail('cardMeta', e); }
      }
      if (Array.isArray(data.selectedBankAccounts)) {
        try {
          if (mode === 'replace') selectedBankAccounts = [].concat(data.selectedBankAccounts);
          else {
            /* افزودن: حساب تکراری (همان شناسه یا همان نام) دوباره اضافه نشود — وگرنه موجودی اولیه‌اش دو بار جمع می‌شد */
            const haveIds = new Set((selectedBankAccounts || []).map(function (a) { return a && a.id; }));
            const haveLabels = new Set((selectedBankAccounts || []).map(function (a) { try { return accountLabel(a); } catch (e) { return a && a.label; } }));
            const add = [];
            data.selectedBankAccounts.forEach(function (a) {
              if (!a) return;
              const lb = (typeof a === 'string') ? a : (a.label || '');
              if ((a.id && haveIds.has(a.id)) || (lb && haveLabels.has(lb))) return;
              add.push(a); if (lb) haveLabels.add(lb); if (a.id) haveIds.add(a.id);
            });
            selectedBankAccounts = [].concat(selectedBankAccounts || [], add);
          }
          normalizeSelectedBanks();
          saveBankAccountsSelection();
        } catch (e) { bkRestoreFail('selectedBankAccounts', e); }
      }
      /* موجودی‌های اول ماهِ کنارگذاشته در انبار؛ و حساب‌هایی که حالا وجود دارند موجودی‌هایشان را پس می‌گیرند */
      try { hkStashOrphanOpenings(_restoreReport && _restoreReport.removedOpenings); hkReviveOrphanOpenings(); }
      catch (eOp) { bkRestoreFail('accountOpenings', eOp); }
      if (Array.isArray(data.trash)) {
        try {
          loadTrash();
          if (_fullReplace) trashItems = [].concat(data.trash);
          else if (mode === 'replace') {
            /* فایل جزئی: سطل زبالهٔ محلی حفظ می‌شود و فقط موارد تازه اضافه می‌شوند */
            var _tIds = {}; (trashItems || []).forEach(function (t) { if (t && t.id) _tIds[t.id] = true; });
            trashItems = data.trash.filter(function (t) { return !(t && t.id && _tIds[t.id]); }).concat(trashItems || []);
          }
          else trashItems = [].concat(data.trash, trashItems || []);
          saveTrash();
        } catch (e) { bkRestoreFail('trash', e); }
      }
      /* کارهای من: جایگزینی = همان نقشهٔ فایل؛ افزودن = فهرست‌هایی که شناسه‌شان در همان کارت/ماه نیست */
      if (data.todos && typeof data.todos === 'object') {
        try {
          var tKey = STORAGE_KEY + '_todos', tMap = {};
          if (mode !== 'replace') {
            var tRaw = localStorage.getItem(tKey);
            if (tRaw) { tMap = JSON.parse(tRaw); if (!tMap || typeof tMap !== 'object' || Array.isArray(tMap)) tMap = {}; }
            Object.keys(data.todos).forEach(function (card) {
              var inc = data.todos[card], cur = tMap[card];
              if (cur == null) { tMap[card] = inc; return; }
              if (Array.isArray(inc) || Array.isArray(cur)) return; /* قالب قدیمی در یک طرف: فهرست محلی دست‌نخورده می‌ماند */
              Object.keys(inc).forEach(function (ym) {
                var lists = Array.isArray(cur[ym]) ? cur[ym] : (cur[ym] = []);
                var ids = {};
                lists.forEach(function (l) { if (l && l.id) ids[l.id] = true; });
                inc[ym].forEach(function (l) { if (!ids[l.id]) { lists.push(l); ids[l.id] = true; } });
              });
            });
          } else if (_fullReplace) tMap = data.todos;
          else {
            /* فایل جزئی: فقط کارت/ماه‌های داخل فایل عوض می‌شوند */
            var tRaw2 = localStorage.getItem(tKey);
            if (tRaw2) { tMap = JSON.parse(tRaw2); if (!tMap || typeof tMap !== 'object' || Array.isArray(tMap)) tMap = {}; }
            Object.keys(data.todos).forEach(function (card) {
              var inc = data.todos[card], cur = tMap[card];
              if (Array.isArray(inc) || cur == null || Array.isArray(cur)) { tMap[card] = inc; return; }
              Object.keys(inc).forEach(function (ym) { cur[ym] = inc[ym]; });
            });
          }
          localStorage.setItem(tKey, JSON.stringify(tMap));
        } catch (eTd) { bkRestoreFail('todos', eTd); }
      }
      /* بانکِ پیامک‌ها: جایگزینی = همان نقشهٔ فایل؛ افزودن = فقط کلیدهای تازه (انتخاب‌های فعلی کاربر حفظ می‌شود) */
      if (data.smsBankMap && typeof data.smsBankMap === 'object') {
        try {
          var sKey = STORAGE_KEY + '_smsBankMap', sMap = {};
          if (mode !== 'replace') {
            var sRaw = localStorage.getItem(sKey);
            if (sRaw) { sMap = JSON.parse(sRaw); if (!sMap || typeof sMap !== 'object' || Array.isArray(sMap)) sMap = {}; }
            Object.keys(data.smsBankMap).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(sMap, k)) sMap[k] = data.smsBankMap[k]; });
          } else sMap = data.smsBankMap;
          localStorage.setItem(sKey, JSON.stringify(sMap));
        } catch (eSb) { bkRestoreFail('smsBankMap', eSb); }
      }
      if (data.smsAccountBankMap && typeof data.smsAccountBankMap === 'object') {
        try {
          if (mode === 'replace') smsAccountBankMap = Object.assign({}, data.smsAccountBankMap);
          else Object.assign(smsAccountBankMap, data.smsAccountBankMap);
          saveSmsAccountBankMap();
        } catch (e) { bkRestoreFail('smsAccountBankMap', e); }
      }
      if (Array.isArray(data.attachments)) { try { hkRestoreAttachments(data.attachments); } catch (eAtR) {} }
      if (Array.isArray(data.customBanks)) { try { data.customBanks.forEach(function (b) { if (b) hkAddCustomBank(String(b)); }); } catch (eCb2) {} }
      if (Array.isArray(data.userReminders)) {
        try {
          loadUserReminders();
          if (mode === 'replace') userReminders = [].concat(data.userReminders);
          else {
            const ids = new Set((userReminders || []).map(function(x){ return x && x.id; }));
            data.userReminders.forEach(function(x) {
              if (x && x.id && !ids.has(x.id)) userReminders.push(x);
            });
          }
          saveUserReminders();
        } catch (e) { bkRestoreFail('userReminders', e); }
      }

      /* بازیابی پس‌انداز (ارز و طلا) */
      if (data.savings && typeof data.savings === 'object') {
        try { restoreSavings(data.savings, mode); } catch (eSv) { bkRestoreFail('savings', eSv); }
      }
      /* ۱.۳.۸۷: بازیابی دنگ */
      if (data.dong && typeof data.dong === 'object') {
        try { hkDongRestore(data.dong, mode); } catch (eDg) { bkRestoreFail('dong', eDg); }
      }

      /* بازیابی دسته‌بندی مخارج */
      if (data.categoryData && typeof data.categoryData === 'object') {
        try { HKCategorizer.importData(data.categoryData, mode); } catch (eCat) { bkRestoreFail('categories', eCat); }
      }
      /* بازیابی پروژه‌ها (financialSubjects) */
      if (Array.isArray(data.financialSubjects)) {
        try {
          if (mode === 'replace') {
            _financialSubjects = JSON.parse(JSON.stringify(data.financialSubjects));
          } else {
            try { loadFinancialSubjects(); } catch (eL) {}
            if (!Array.isArray(_financialSubjects)) _financialSubjects = [];
            var byId = {};
            _financialSubjects.forEach(function(s) {
              if (s && s.id) byId[s.id] = true;
            });
            data.financialSubjects.forEach(function(s) {
              if (!s || !s.id) return;
              if (byId[s.id]) return; /* id موجود → duplicate نساز */
              try {
                _financialSubjects.push(JSON.parse(JSON.stringify(s)));
                byId[s.id] = true;
              } catch (eP) {
                _financialSubjects.push(s);
                byId[s.id] = true;
              }
            });
          }
          saveFinancialSubjects();
        } catch (eFS) {
          bkRestoreFail('financialSubjects', eFS);
        }
      }
      /* ترتیب کارت‌های کاربر */
      if (Array.isArray(data.personCardOrder) && data.personCardOrder.length) {
        try {
          if (_fullReplace) {
            if (periodData) periodData.personCardOrder = data.personCardOrder.slice();
            if (typeof saveGlobalCardOrder === 'function') saveGlobalCardOrder(data.personCardOrder.slice());
          } else {
            var curOrder = [];
            try {
              if (periodData && Array.isArray(periodData.personCardOrder)) curOrder = periodData.personCardOrder.slice();
              else if (typeof loadGlobalCardOrder === 'function') curOrder = loadGlobalCardOrder();
            } catch (eO) {}
            var seen = {};
            curOrder.forEach(function(t) { seen[String(t || '').trim()] = true; });
            data.personCardOrder.forEach(function(t) {
              var k = String(t || '').trim();
              if (k && !seen[k]) { curOrder.push(k); seen[k] = true; }
            });
            if (periodData) periodData.personCardOrder = curOrder;
            if (typeof saveGlobalCardOrder === 'function') saveGlobalCardOrder(curOrder);
          }
        } catch (ePO) { bkRestoreFail('personCardOrder', ePO); }
      }

      if (data.currentYear) currentYear = parseInt(data.currentYear, 10) || currentYear;
      if (data.currentMonth) currentMonth = parseInt(data.currentMonth, 10) || currentMonth;
      if (mode === 'replace' && (data.theme === 'light' || data.theme === 'dark')) applyTheme(data.theme);
      /* همان مسیر بوت نرم‌افزار: نرمال‌سازی، همگام‌سازی اقساط، نام بانک‌ها و پیشروی ماه — تا موجودی از همان اول درست باشد */
      try {
        loadCurrent();
      } catch (eLC) {
        const key = periodKey(currentYear, currentMonth);
        if (archive[key]) {
          try { periodData = JSON.parse(JSON.stringify(archive[key])); } catch (e) { periodData = archive[key]; }
        } else {
          periodData = emptyPeriodData();
        }
      }
      try { migrateAllBankNamesInData(); } catch (eMB) {}
      /* دادهٔ محلیِ از قبل یتیم هم پاک‌سازی شود (همان مهاجرت بوت) */
      try { cleanupOrphanedAccountOpenings({ noSave: true }); } catch (eCl) {}
      try { autoAdvancePersianMonthIfNeeded(); } catch (eAA) {}
      // اگر cardMeta فقط در root بکاپ بود و داخل ماه نبود
      if (data.cardMeta && typeof data.cardMeta === 'object') {
        if (!periodData.cardMeta) periodData.cardMeta = {};
        Object.keys(data.cardMeta).forEach(k => { periodData.cardMeta[k] = data.cardMeta[k]; });
      }
      try { claimBackupOwnership(); } catch (e) {}
      try { persistCurrent(); } catch (e) { bkRestoreFail('archive', e); }
      try { saveArchive(); } catch (e) { bkRestoreFail('archive', e); }
      try { if (typeof saveRecurring === 'function') saveRecurring(); } catch (e) {}
      try { initSelectors(); } catch (e) {}
      try { updateTabUI(); } catch (e) {}
      try { renderAll(); } catch (e) {}
      try { checkInstallReminders(); } catch (e) {}
      try {
        _hbcLast = null;
        var _amtB = document.getElementById('homeBalanceAmt');
        if (_amtB) _amtB._hbcBusy = false;
        if (typeof renderHomeCards === 'function') renderHomeCards();
      } catch (eB1) {}
      try {
        requestAnimationFrame(function () {
          try {
            _hbcLast = null;
            var a2 = document.getElementById('homeBalanceAmt');
            if (a2) a2._hbcBusy = false;
            if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
          } catch (eB2) {}
          requestAnimationFrame(function () {
            try {
              _hbcLast = null;
              var a3 = document.getElementById('homeBalanceAmt');
              if (a3) a3._hbcBusy = false;
              if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
            } catch (eB3) {}
          });
        });
      } catch (eB4) {}
      /* اگر چیزی نادیده گرفته شد، کوتاه و آرام به کاربر بگو (دادهٔ سالم وارد شده است) */
      try {
        var _msg = backupReportText(_restoreReport);
        if (_msg) setTimeout(function () { if (_hkRestoreAborted) return; try { showToastLong(_msg); } catch (eT) {} }, 900);
      } catch (eMsg) {}
      /* بعد از ری‌استور، موجودی را چند بار با داده‌ی نهایی مقایسه کن تا هیچ تغییر دیرهنگامی جا نماند */
      [1600, 3400].forEach(function (ms) {
        setTimeout(function () {
          try { if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(); } catch (eS) {}
        }, ms);
      });

    }

    function openBackupRestoreChoice(data) {
      let old = document.getElementById('backupRestoreOverlay');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'backupRestoreOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--card);color:var(--text);border-radius:14px;padding:16px;max-width:360px;width:100%;border:1px solid var(--border);box-shadow:0 12px 32px rgba(0,0,0,0.35);font-family:Vazirmatn,Tahoma,sans-serif;';
      card.innerHTML =
        '<div style="font-weight:800;font-size:1.05rem;margin-bottom:14px;text-align:center;">بازیابی پشتیبان</div>' +
        '<button type="button" id="backupReplaceBtn" style="width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:10px;background:#ff3b30;color:#fff;font-weight:800;font-size:0.95rem;font-family:inherit;">جایگزین کردن اطلاعات فعلی</button>' +
        '<button type="button" id="backupMergeBtn" style="width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:10px;background:#08b5f5;color:#fff;font-weight:800;font-size:0.95rem;font-family:inherit;">افزودن به اطلاعات فعلی</button>' +
        '<button type="button" id="backupCancelBtn" style="width:100%;padding:10px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);font-weight:700;font-size:0.9rem;font-family:inherit;">انصراف</button>' +
        '<div id="bkRestoreScope" style="font-size:0.78rem;margin-top:10px;line-height:1.6;text-align:center;"></div>' +
        '<div class="bk-restore-hint" style="font-size:0.72rem;color:var(--muted);margin-top:10px;line-height:1.5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">در حالت افزودن، ردیف‌های تکراری وارد نمی‌شوند.</div>';
      overlay.appendChild(card);
      /* کامل یا جزئی بودن فایل و اثر «جایگزینی» پیش از انتخاب گفته شود */
      try {
        var sc = bkBackupScope(data), nm = Object.keys((data && data.archive) || {}).length;
        var info = (sc.complete ? 'پشتیبان کامل' : (sc.known ? 'پشتیبان جزئی' : 'کامل بودن این فایل مشخص نیست')) +
          ' · ' + toPersianDigits(String(nm)) + ' ماه' + (sc.cards ? ' · ' + toPersianDigits(String(sc.cards.length)) + ' کارت' : '') + '<br>' +
          (sc.complete ? 'جایگزینی، همهٔ اطلاعات فعلی را با این فایل عوض می‌کند.' : 'با جایگزینی فقط ماه‌ها و کارت‌های داخل فایل عوض می‌شوند؛ بقیهٔ اطلاعات حفظ می‌شود.');
        card.querySelector('#bkRestoreScope').innerHTML = info;
      } catch (eSc) {}
      document.body.appendChild(overlay);
      const close = () => { try { overlay.remove(); } catch (e) {} };
      document.getElementById('backupCancelBtn').onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.getElementById('backupReplaceBtn').onclick = () => {
        close();
        safetyBackupThen('restore', () => {
          try {
            if (applyBackupData(data, 'replace') !== false) showToast('بازیابی با جایگزینی انجام شد');
          } catch (err) {
            console.error(err);
            showToast('خطا در بازیابی');
          }
        });
      };
      document.getElementById('backupMergeBtn').onclick = () => {
        close();
        safetyBackupThen('restore', () => {
          try {
            if (applyBackupData(data, 'merge') !== false) showToast('بازیابی با ادغام انجام شد');
          } catch (err) {
            console.error(err);
            showToast('خطا در ادغام');
          }
        });
      };
    }

    /* امنیت: کلیدهای __proto__/constructor/prototype از فایل ورودی حذف شوند (جلوگیری از آلوده‌سازی prototype) */
    function hkSafeJsonParse(text) {
      return JSON.parse(text, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
    }
    function importFullBackup(ev) {
      const file = ev && ev.target && ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          let parsed0 = hkSafeJsonParse(reader.result);
          /* پشتیبان رمزدار قالب جدید (hk-backup-enc): بررسی ساختار ← بازکردن با کلید همین دستگاه یا رمز/کد بازیابی ← همان مسیر بازیابی */
          if (parsed0 && typeof parsed0 === 'object' && parsed0.format === HK_ENC_FORMAT) { hkOpenEncryptedBackup(parsed0); return; }
          /* فایل رمزدار: اول رمز، بعد همان مسیر بازیابی معمول */
          if (parsed0 && parsed0.enc === 'AES-256-GCM' && parsed0.data) {
            askBackupPassword(async function (pw) {
              try {
                const plain = await hkDecryptBackup(parsed0, pw);
                const d2 = hkSafeJsonParse(plain);
                if (!d2 || typeof d2 !== 'object') throw new Error('invalid');
                openBackupRestoreChoice(d2);
              } catch (eDec) { showToast('رمز نادرست است یا فایل آسیب دیده'); }
            });
            return;
          }
          const data = parsed0;
          if (!data || typeof data !== 'object') throw new Error('invalid');
          // پشتیبانی از فایل‌هایی که فقط archive هستند
          if (!data.archive && !data.plans && !data.recurringIncomes) {
            // شاید خود archive باشد
            if (typeof data === 'object' && Object.keys(data).some(k => /^\d{4}-\d{1,2}$/.test(k))) {
              openBackupRestoreChoice({ archive: data });
              return;
            }
            throw new Error('invalid');
          }
          openBackupRestoreChoice(data);
        } catch (e) {
          showToast('فایل پشتیبان نامعتبر است');
        }
      };
      reader.onerror = () => showToast('خواندن فایل ممکن نشد');
      reader.readAsText(file, 'utf-8');
    }

    function askExport() {
      closeSideMenu();
      let old = document.getElementById('exportChoiceOverlay');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = 'exportChoiceOverlay';
      overlay.className = 'modal-overlay open';
      overlay.style.zIndex = '310';

      const box = document.createElement('div');
      box.className = 'export-choice-box';
      box.innerHTML =
        '<div class="export-choice-title">خروجی گزارش</div>' +
        '<div class="export-choice-actions">' +
          '<button type="button" class="export-choice-btn excel" id="exportExcelBtn">' +
            '<span class="ex-ico" aria-hidden="true"><svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M14 5h16l9 9v27a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#fff"/>' +
              '<path d="M30 5v7a2 2 0 0 0 2 2h7z" fill="#cfe5d7"/>' +
              '<path d="M24 22h10M24 28h10M24 34h10" stroke="#7fb896" stroke-width="2.4" stroke-linecap="round"/>' +
              '<rect x="4" y="19" width="19" height="19" rx="3.5" fill="#12502d"/>' +
              '<path d="M9 24l9 9M18 24l-9 9" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>' +
            '</svg></span>' +
            '<span>اکسل</span>' +
          '</button>' +
          '<button type="button" class="export-choice-btn pdf" id="exportPdfBtn">' +
            '<span class="ex-ico" aria-hidden="true"><svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M14 5h16l9 9v27a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#fff"/>' +
              '<path d="M30 5v7a2 2 0 0 0 2 2h7z" fill="#f3d1cc"/>' +
              '<path d="M17 15h9M17 20h15" stroke="#e3a59c" stroke-width="2.4" stroke-linecap="round"/>' +
              '<rect x="4" y="25" width="31" height="14" rx="3.5" fill="#8e2318"/>' +
              '<text x="19.5" y="35.6" text-anchor="middle" fill="#fff" font-size="10" font-weight="800" font-family="Arial,sans-serif" letter-spacing="0.4">PDF</text>' +
            '</svg></span>' +
            '<span>PDF</span>' +
          '</button>' +
        '</div>';

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const close = () => { try { overlay.remove(); } catch (e) {} };
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      /* اول پنجرهٔ انتخاب بخش‌ها، کاربر و بازه */
      document.getElementById('exportExcelBtn').onclick = () => { close(); hkOpenExportDialog('excel'); };
      document.getElementById('exportPdfBtn').onclick = () => { close(); hkOpenExportDialog('pdf'); };
    }











    /* ===== خروجی آفلاین واقعی XLSX - سازگار با Excel/Android ===== */
    function xlsxEsc(v){
      let s=String(v==null?'':v);
      s=s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ');
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
    }
    function xlsxCol(n){ let x=''; n++; while(n){ let r=(n-1)%26; x=String.fromCharCode(65+r)+x; n=Math.floor((n-1)/26); } return x; }
    function xlsxBytes(str){ return new TextEncoder().encode(str); }
    function xlsxU16(n){ return new Uint8Array([n&255,(n>>>8)&255]); }
    function xlsxU32(n){ return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]); }
    function xlsxConcat(arrs){ let n=0; arrs.forEach(a=>n+=a.length); let o=new Uint8Array(n),p=0; arrs.forEach(a=>{o.set(a,p);p+=a.length;}); return o; }
    function xlsxCrc32(bytes){ let c=0xffffffff; for(let i=0;i<bytes.length;i++){ c^=bytes[i]; for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
    function xlsxZip(files){
      const locals=[],centrals=[]; let off=0;
      files.forEach(f=>{
        const name=xlsxBytes(f.name),data=typeof f.data==='string'?xlsxBytes(f.data):f.data,crc=xlsxCrc32(data);
        const lh=xlsxConcat([new Uint8Array([80,75,3,4]),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),name,data]);
        locals.push(lh);
        const ch=xlsxConcat([new Uint8Array([80,75,1,2]),xlsxU16(20),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(0),xlsxU32(off),name]);
        centrals.push(ch); off+=lh.length;
      });
      const cd=xlsxConcat(centrals),body=xlsxConcat(locals);
      const eocd=xlsxConcat([new Uint8Array([80,75,5,6]),xlsxU16(0),xlsxU16(0),xlsxU16(files.length),xlsxU16(files.length),xlsxU32(cd.length),xlsxU32(body.length),xlsxU16(0)]);
      return xlsxConcat([body,cd,eocd]);
    }
    /* ===== خروجی Excel (XLSX واقعی و آفلاین): مبالغ عددی با جداکنندهٔ هزارگان، سرستون پررنگ و ثابت، راست‌به‌چپ =====
       سلول: رشته/عدد یا {v, s} — s: 1 سرستون، 2 متن، 3 عدد، 4 جمع (متن)، 5 جمع (عدد)، 6 عنوان، 7 گروه */
    function xlsxCellXml(ref, c, sharedId) {
      var v = c, s = 0;
      if (c && typeof c === 'object' && 'v' in c) { v = c.v; s = c.s || 0; }
      if (v === null || v === undefined || v === '') return s ? '<c r="' + ref + '" s="' + s + '"/>' : '';
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '" t="s"' + (s ? ' s="' + s + '"' : '') + '><v>' + sharedId(v) + '</v></c>';
    }
    function xlsxSheetXml2(sh, sharedId) {
      var rows = sh.rows, max = 0;
      rows.forEach(function (r) { max = Math.max(max, r.length); });
      var cols = '';
      for (var i = 0; i < max; i++) cols += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + ((sh.widths && sh.widths[i]) || 16) + '" customWidth="1"/>';
      var pane = sh.freeze ? '<pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>' : '';
      var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
        '<dimension ref="A1:' + xlsxCol(Math.max(0, max - 1)) + Math.max(1, rows.length) + '"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1">' + pane + '</sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="18"/><cols>' + cols + '</cols><sheetData>';
      rows.forEach(function (r, ri) {
        out += '<row r="' + (ri + 1) + '">';
        r.forEach(function (c, ci) { out += xlsxCellXml(xlsxCol(ci) + (ri + 1), c, sharedId); });
        out += '</row>';
      });
      out += '</sheetData>' + (sh.merges && sh.merges.length ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') +
        '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>';
      return out;
    }
    /* پس‌انداز برای خروجی: خلاصهٔ هر نوع + ردیف‌های خرید (اگر چیزی ثبت نشده، null) */
    function savingsExportData() {
      var groups = [];
      try { groups = (typeof _savGroups === 'function') ? _savGroups() : []; } catch (e) { groups = []; }
      if (!groups.length) return null;
      var tot = { cost: 0, value: 0, pnl: 0, anyP: false, missing: 0 };
      groups.forEach(function (G) {
        tot.cost += G.cost;
        if (G.price) tot.value += G.value; else tot.missing++;
        if (G.pnl != null) { tot.pnl += G.pnl; tot.anyP = true; }
      });
      var dateOf = function (it) { return it.y ? toPersianDigits(String(it.y)) + '/' + toPersianPad2(it.m || 1) + '/' + toPersianPad2(it.d || 1) : ''; };
      return { groups: groups, tot: tot, dateOf: dateOf, unitOf: _savUnit, qty: _savFmtQty };
    }
    function buildXlsxSheets() {
      if (_hkRecArc) return { sheets: hkRecArcSheets() };
      var O = _hkExportOpts || {};
      var want = function (k) { return !O.sections || !!O.sections[k]; };
      var months = hkExportMonths(O.range || 'month');
      if (!months.length) months = [{ y: currentYear, m: currentMonth, pd: periodData, label: MONTHS[currentMonth - 1] + ' ' + toPersianDigits(currentYear) }];
      var multi = months.length > 1;
      var periodLabel = hkExportRangeLabel(O.range || 'month', months) + (O.user ? ' — ' + O.user : '');
      /* ۱.۳.۴۷: تک‌کاربره: نام کاربر فقط یک بار در عنوان؛ ستون و جمع‌های «کارت» نمی‌آیند */
      var ONE = true, UNAME = ''; try { UNAME = hkMainTitle(); } catch (eU) {}
      var dropCard = function (arr) { return ONE ? arr.slice(1) : arr; };
      var PD = periodData;
      var H = function (t) { return { v: t, s: 1 }; }, T = function (t) { return { v: t, s: 2 }; }, N = function (n) { return { v: Math.round(Number(n) || 0), s: 3 }; };
      var TT = function (t) { return { v: t, s: 4 }; }, TN = function (n) { return { v: Math.round(Number(n) || 0), s: 5 }; }, G = function (t) { return { v: t, s: 7 }; };
      var usable = function (r) { return r && !r.deletedAt && (r.desc || Number(r.amount) || r.day); };
      var secs = function (tab) { return ((PD[tab] && PD[tab].sections) || []).filter(function (sec) { return !O.user || (((sec.title || '').trim()) || '—') === O.user; }); };
      var dayNum = function (r) { var d = parseInt(toEnglishDigits(String(r.day || '')), 10); return d >= 1 && d <= 31 ? d : ''; };
      var sheets = [];
      /* خلاصه */
      var sum = [[{ v: 'گزارش مالی ' + (UNAME ? UNAME + ' — ' : '') + periodLabel, s: 6 }], []];
      var kpiAt = sum.length;  /* جای خلاصهٔ عددی (بعد از محاسبه پر می‌شود) */
      if (!ONE) sum.push([H('کارت'), H('درآمد'), H('دریافت‌نشده'), H('مخارج'), H('پرداخت‌نشده'), H('مانده')]);
      var by = {}, order = [], perMonth = [];
      months.forEach(function (mo) {
        PD = mo.pd;
        var pm = { label: mo.label, i: 0, e: 0 };
        ['income', 'expense'].forEach(function (tab) {
          secs(tab).forEach(function (sec) {
            var t = ((sec.title || '').trim()) || '—';
            if (!by[t]) { by[t] = { i: 0, iu: 0, e: 0, eu: 0 }; order.push(t); }
            (sec.rows || []).forEach(function (r) {
              if (!usable(r)) return;
              var a = pdfPersonalAmounts(tab, r);
              if (tab === 'income') { by[t].i += a.total; by[t].iu += a.unpaid; pm.i += a.total; } else { by[t].e += a.total; by[t].eu += a.unpaid; pm.e += a.total; }
            });
          });
        });
        perMonth.push(pm);
      });
      PD = periodData;
      var g = { i: 0, iu: 0, e: 0, eu: 0 };
      order.forEach(function (t) { var c = by[t]; g.i += c.i; g.iu += c.iu; g.e += c.e; g.eu += c.eu; if (!ONE) sum.push([T(t), N(c.i), N(c.iu), N(c.e), N(c.eu), N(c.i - c.e)]); });
      if (!ONE) sum.push([TT('جمع'), TN(g.i), TN(g.iu), TN(g.e), TN(g.eu), TN(g.i - g.e)]);
      if (multi) {
        sum.push([]); sum.push([H('ماه'), H('درآمد'), H('مخارج'), H('مانده')]);
        perMonth.forEach(function (pm) { sum.push([T(pm.label), N(pm.i), N(pm.e), N(pm.i - pm.e)]); });
        sum.push([TT('جمع'), TN(g.i), TN(g.e), TN(g.i - g.e)]);
      }
      var acc = {}; try { acc = globalAccountBalances() || {}; } catch (e) {}
      var as = 0; Object.keys(acc).forEach(function (k) { as += Number(acc[k]) || 0; });
      if (Object.keys(acc).length && want('accounts')) {
        sum.push([]); sum.push([H('حساب'), H('موجودی')]);
        Object.keys(acc).forEach(function (k) { sum.push([T(k), N(acc[k])]); });
        sum.push([TT('جمع'), TN(as)]);
      }
      /* خلاصهٔ عددی مثل سربرگ PDF */
      sum.splice(kpiAt, 0,
        [H('شاخص'), H('مبلغ'), H('توضیح')],
        [T('کل درآمد'), N(g.i), T('دریافت‌شده ' + formatNum(g.i - g.iu) + ' · مانده ' + formatNum(g.iu))],
        [T('کل مخارج'), N(g.e), T('پرداخت‌شده ' + formatNum(g.e - g.eu) + ' · مانده ' + formatNum(g.eu))],
        [T('درآمد منهای مخارج'), N(g.i - g.e), T((g.i - g.e >= 0 ? 'مازاد' : 'کسری') + (multi ? ' این بازه' : ' این ماه'))],
        [T('موجودی حساب‌ها'), N(as), T(toPersianDigits(Object.keys(acc).length) + ' حساب')],
        []);
      sheets.push({ name: 'خلاصه', rows: sum, widths: [26, 18, 18, 18, 18, 18], merges: ['A1:F1'] });
      /* درآمد و مخارج */
      ['income', 'expense'].forEach(function (tab) {
        if (!want(tab)) return;
        var inc = tab === 'income';
        var head = dropCard(inc ? [H('کارت'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('حساب'), H('مبلغ'), H('وضعیت'), H('پروژه')] : [H('کارت'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('دسته'), H('حساب'), H('مبلغ'), H('وضعیت'), H('پروژه')]);
        var rows = [head], gt = 0;
        /* بازهٔ چندماهه: ماه‌به‌ماه با عنوان هر ماه */
        months.forEach(function (mo) {
        PD = mo.pd;
        if (multi && secs(tab).some(function (sec) { return (sec.rows || []).some(usable); })) rows.push(head.map(function (c, ci) { return G(ci === 0 ? mo.label : ''); }));
        secs(tab).forEach(function (sec) {
          var list = (sec.rows || []).filter(usable);
          if (!list.length) return;
          var t = ((sec.title || '').trim()) || '—', st = 0;
          list.forEach(function (r) {
            var amt = Number(r.amount) || 0; if (!r.p2p) st += amt;
            var stat = r.status === 'paid' ? (inc ? 'دریافت‌شده' : 'پرداخت‌شده') : (inc ? 'دریافت‌نشده' : 'پرداخت‌نشده');
            var cat = ''; if (!inc) { try { var c = HKCategorizer.classify(r.desc, r); cat = c ? c.label : ''; } catch (e) {} }
            var pj = ''; try { var fc = rowFinancialContext(r); if (fc && fc.subjectName && fc.subjectId !== 'personal') pj = fc.subjectName; } catch (eP) {}
            var dx = hkExpDate(r, mo.y, mo.m), dTxt = dx.fa ? dx.fa + '  ·  ' + dx.en : '';
            rows.push(dropCard(inc ? [T(t), T(dTxt), T(hkExpTime(r)), T(r.desc || ''), T(r.account || ''), N(amt), T(stat), T(pj)] : [T(t), T(dTxt), T(hkExpTime(r)), T(r.desc || ''), T(cat), T(r.account || ''), N(amt), T(stat), T(pj)]));
          });
          gt += st;
          var tr = inc ? [TT('جمع ' + t), TT(''), TT(''), TT(''), TT(''), TN(st), TT(''), TT('')] : [TT('جمع ' + t), TT(''), TT(''), TT(''), TT(''), TT(''), TN(st), TT(''), TT('')];
          if (!ONE) rows.push(tr);
        });
        });
        PD = periodData;
        var gtr = inc ? [TT('جمع کل'), TT(''), TT(''), TT(''), TT(''), TN(gt), TT(''), TT('')] : [TT('جمع کل'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(gt), TT(''), TT('')];
        if (ONE) { gtr = gtr.slice(1); gtr[0] = TT('جمع کل'); }
        rows.push(gtr);
        sheets.push({ name: inc ? 'درآمد' : 'مخارج', rows: rows, widths: dropCard(inc ? [18, 26, 8, 34, 16, 16, 14, 18] : [18, 26, 8, 30, 14, 16, 16, 14, 18]), freeze: 1 });
      });
      /* اقساط */
      var ir = [[H('نام وام'), H('مبلغ هر قسط'), H('تعداد'), H('پرداخت‌شده'), H('سررسید بعدی'), H('جمع پرداختی'), H('باقی‌مانده'), H('جمع کل')]], ip = 0, irem = 0, itot = 0;
      (plans || []).filter(function (p) { return p && !p.deletedAt && (!O.user || (p.expenseSectionTitle || '').trim() === O.user); }).forEach(function (plan) {
        var count = Math.max(0, parseInt(plan.count, 10) || 0), paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0)), amt = 0, total = 0;
        try { amt = planInstallmentAmount(plan); total = planTotalPayable(plan); } catch (e) { amt = Number(plan.amount) || 0; total = amt * count; }
        var next = 'تسویه'; if (paid < count) { try { var d = dueDateForInstallment(plan, paid); next = toPersianDigits(d.d) + ' ' + MONTHS[d.m - 1] + ' ' + toPersianDigits(d.y); } catch (e2) { next = ''; } }
        ip += paid * amt; irem += total - paid * amt; itot += total;
        ir.push([T(plan.name || '—'), N(amt), N(count), N(paid), T(next), N(paid * amt), N(total - paid * amt), N(total)]);
      });
      ir.push([TT('جمع'), TT(''), TT(''), TT(''), TT(''), TN(ip), TN(irem), TN(itot)]);
      if (false && want('install')) sheets.push({ name: 'اقساط', rows: ir, widths: [22, 16, 9, 11, 18, 18, 18, 18], freeze: 1 });
      /* قرض (۱.۳.۷۳): همان دادهٔ PDF — همهٔ ردیف‌های هر رابطه با تاریخ کامل، ساعت، وضعیت و مانده */
      var lr = [[H('رابطه'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('بدهکار'), H('بستانکار'), H('مبلغ'), H('وضعیت'), H('ثبت‌کننده')]];
      var lgx = []; try { lgx = hkExpLedgerData(months); } catch (e) {}
      lgx.forEach(function (g) {
        g.rows.forEach(function (x) {
          var dx = hkExpDate(x.r, x.y, x.m);
          lr.push([T(g.title), T(dx.fa ? dx.fa + '  ·  ' + dx.en : ''), T(hkExpTime(x.r)), T(x.r.desc || ''), T(x.debtor), T(x.creditor), N(x.amt), T(x.r.settled ? 'تسویه‌شده' : 'باز'), T(x.r.createdByName || '')]);
        });
        lr.push([TT('مانده ' + g.title), TT(''), TT(''), TT(g.netTxt), TT(g.net > 0 ? g.a : g.net < 0 ? g.b : ''), TT(g.net > 0 ? g.b : g.net < 0 ? g.a : ''), TN(Math.abs(g.net)), TT(''), TT('')]);
      });
      var pairs = []; try { pairs = ledgerPairNets() || []; } catch (e) {}
      if (pairs.length) {
        lr.push([G('خلاصهٔ مانده‌ها (همهٔ رابطه‌ها، تا امروز)'), G(''), G(''), G(''), G(''), G(''), G(''), G(''), G('')]);
        pairs.forEach(function (p) { lr.push([TT((p.debtor || '') + ' به ' + (p.creditor || '') + ' بدهکار است'), TT(''), TT(''), TT(''), TT(p.debtor || ''), TT(p.creditor || ''), TN(p.amount), TT(''), TT('')]); });
      }
      if (want('ledger')) sheets.push({ name: 'قرض', rows: lr, widths: [22, 26, 8, 28, 14, 14, 16, 11, 13], freeze: 1 });
      /* درآمد ثابت + آرشیو واریزهای همین بازه */
      /* بالا: مشخصات هر قرارداد (به ترتیب روز)؛ پایین: واریزهای همین بازه (به ترتیب تاریخ) */
      var nd = function (d) { return (d && d.y) ? toPersianDigits(d.y + '/' + String(d.m).padStart(2, '0') + '/' + String(d.d).padStart(2, '0')) : ''; };
      var rr = [[H('نام'), H('مبلغ ماهانه'), H('رهن'), H('شروع قرارداد'), H('پایان قرارداد'), H('حساب')]], rs = 0, rd = 0;
      var recList = [];
      try { (recurringIncomes || []).forEach(function (r) { if (!r || r.deletedAt || (!r.name && !r.amount)) return; if (O.user && (r.sectionTitle || '').trim() !== O.user) return; recList.push(r); }); } catch (e) {}
      recList.slice().sort(function (a, b) { return (parseInt(toEnglishDigits(String(a.day || '')), 10) || 99) - (parseInt(toEnglishDigits(String(b.day || '')), 10) || 99); }).forEach(function (r) {
        rs += Number(r.amount) || 0; rd += Number(r.deposit) || 0;
        rr.push([T(r.name || '—'), N(r.amount), Number(r.deposit) > 0 ? N(r.deposit) : T('—'), T(nd(r.contractStart)), T(nd(r.contractEnd)), T(r.account || '')]);
      });
      rr.push([TT('جمع'), TN(rs), rd ? TN(rd) : TT('—'), TT(''), TT(''), TT('')]);
      var mk = {}; months.forEach(function (mo) { mk[mo.y * 100 + mo.m] = 1; });
      var arc = [];
      recList.forEach(function (it) {
        var xs = []; try { xs = recArchiveRows(it).filter(function (x) { return mk[x.key]; }); } catch (e) {}
        xs.forEach(function (x) { arc.push({ it: it, x: x, d: parseInt(toEnglishDigits(String(x.row.day || '')), 10) || 0 }); });
      });
      arc.sort(function (a, b) { return (a.x.key - b.x.key) || (a.d - b.d); });
      if (arc.length) {
        rr.push([]); rr.push([H('نام (شرح)'), H('تاریخ (شمسی · میلادی)'), H('مبلغ'), H('حساب'), H('وضعیت پرداخت'), H('ساعت')]);
        arc.forEach(function (o) {
          var y = Math.floor(o.x.key / 100), m = o.x.key % 100, dx = o.d ? hkExpDate({ day: o.d }, y, m) : null;
          rr.push([T(o.x.row.desc || o.it.name || ''), T(dx ? dx.fa + '  ·  ' + dx.en : toPersianDigits(y + '/' + String(m).padStart(2, '0'))), N(o.x.row.amount), T(o.x.row.account || ''), T(o.x.row.status === 'paid' ? 'دریافت‌شده' : 'دریافت‌نشده'), T(hkExpTime(o.x.row))]);
        });
      }
      if (want('recurring')) sheets.push({ name: 'درآمد ثابت', rows: rr, widths: [30, 26, 16, 14, 14, 10], freeze: 1 });
      /* پروژه‌ها (همهٔ ماه‌ها): خلاصه + واریزی‌ها و مخارج با تاریخ، شرح و بانک */
      var subs = []; try { subs = (loadFinancialSubjects() || []).filter(function (x) { return x && x.id && x.id !== 'personal'; }); } catch (e) {}
      if (subs.length && want('projects')) {
        var pr = [[H('پروژه'), H('نوع'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('حساب'), H('مبلغ')]];
        var pDate = function (r) { var pa = String(r.key || '').split('-'), y = parseInt(pa[0], 10) || 0, m = parseInt(pa[1], 10) || 0, d = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0; if (!y) return ''; if (d >= 1 && d <= 31) { var dx = hkExpDate({ day: d }, y, m); return dx.fa + '  ·  ' + dx.en; } return toPersianDigits(y + '/' + String(m).padStart(2, '0')); };
        var byDate = function (x, y) { return String(x.key).localeCompare(String(y.key)) || ((parseInt(x.day, 10) || 0) - (parseInt(y.day, 10) || 0)); };
        subs.forEach(function (sub) {
          var rep = null; try { rep = computeSubjectReport(sub.id); } catch (e) {}
          if (!rep) return;
          var dep = Number(rep.received) || 0, ex = Number(rep.totalExpense != null ? rep.totalExpense : rep.totalCost) || 0, net = dep - ex;
          pr.push([G('پروژهٔ ' + (sub.name || '—')), G(''), G(''), G(''), G(net > 0 ? 'طلب پروژه' : net < 0 ? 'بدهی پروژه' : 'تسویه'), G(''), { v: Math.abs(net), s: 5 }]);
          var ins = (rep.rows || []).filter(function (x) { return x.tab === 'income'; }).sort(byDate);
          var outs = (rep.rows || []).filter(function (x) { return x.tab === 'expense'; }).sort(byDate);
          ins.forEach(function (r) { pr.push([T(sub.name || ''), T('واریزی'), T(pDate(r)), T(hkExpTime(r)), T(r.desc || ''), T(r.bank || ''), N(r.amt)]); });
          pr.push([TT('جمع واریزی‌ها'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(dep)]);
          outs.forEach(function (r) { pr.push([T(sub.name || ''), T('مخارج'), T(pDate(r)), T(hkExpTime(r)), T(r.desc || ''), T(r.bank || ''), N(r.amt)]); });
          pr.push([TT('جمع مخارج'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(ex)]);
        });
        sheets.push({ name: 'پروژه‌ها', rows: pr, widths: [20, 10, 26, 8, 30, 16, 18], freeze: 1 });
      }
      /* پس‌انداز (ارز و طلا): خلاصهٔ هر نوع + ردیف‌های خرید */
      var sv = want('savings') ? savingsExportData() : null;
      if (sv) {
        var srows = [[H('نوع'), H('مقدار'), H('قیمت خرید کل'), H('قیمت روز هر واحد'), H('ارزش روز'), H('سود / زیان')]];
        sv.groups.forEach(function (G) {
          srows.push([T(G.name), T(sv.qty(G.qty) + ' ' + G.unit), G.cost ? N(G.cost) : T('—'), G.price ? N(G.price) : T('وارد نشده'), G.price ? N(G.value) : T('—'), G.pnl != null ? N(G.pnl) : T('—')]);
        });
        srows.push([TT('جمع'), TT(''), TN(sv.tot.cost), TT(''), TN(sv.tot.value), sv.tot.anyP ? TN(sv.tot.pnl) : TT('—')]);
        srows.push([]);
        srows.push([H('نوع'), H('تاریخ خرید'), H('مقدار'), H('قیمت خرید هر واحد'), H('قیمت خرید کل'), H('یادداشت')]);
        sv.groups.forEach(function (G) {
          G.items.forEach(function (it) {
            var q = Number(it.qty) || 0, b = Number(it.buy) || 0;
            srows.push([T(G.name), T(sv.dateOf(it)), T(sv.qty(q) + ' ' + sv.unitOf(it)), b ? N(b) : T('—'), b ? N(q * b) : T('—'), T(it.note || '')]);
          });
        });
        sheets.push({ name: 'پس‌انداز', rows: srows, widths: [20, 14, 16, 18, 18, 24], freeze: 1 });
      }
      return { sheets: sheets, periodLabel: periodLabel };
    }
    function buildXlsxWorkbook() {
      var built = buildXlsxSheets(), sheets = built.sheets;
      var map = new Map(), list = [];
      var sid = function (v) { var k = String(v); if (map.has(k)) return map.get(k); var n = list.length; map.set(k, n); list.push(k); return n; };
      var sheetFiles = [], rels = [];
      sheets.forEach(function (sh, i) {
        sheetFiles.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: xlsxSheetXml2(sh, sid) });
        rels.push('<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>');
      });
      var sst = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + list.length + '" uniqueCount="' + list.length + '">' +
        list.map(function (v) { return '<si><t xml:space="preserve">' + xlsxEsc(v) + '</t></si>'; }).join('') + '</sst>';
      var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><bookViews><workbookView xWindow="0" yWindow="0"/></bookViews><sheets>' +
        sheets.map(function (sh, i) { return '<sheet name="' + xlsxEsc(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><calcPr calcId="191029"/></workbook>';
      var n = sheets.length;
      var overrides = '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>';
      for (var i = 0; i < n; i++) overrides += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      var content = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' + overrides + '</Types>';
      var rootrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
      var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') +
        '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
      var bd = '<border><left style="thin"><color rgb="FFA6A6A6"/></left><right style="thin"><color rgb="FFA6A6A6"/></right><top style="thin"><color rgb="FFA6A6A6"/></top><bottom style="thin"><color rgb="FFA6A6A6"/></bottom><diagonal/></border>';
      var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>' +
        '<fonts count="4"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="14"/><name val="Tahoma"/></font></fonts>' +
        '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF333333"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6E6E6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + bd + '</borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="8">' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>' +
          '<xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>';
      var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">حساب کتاب — ' + xlsxEsc(built.periodLabel) + '</dc:title></cp:coreProperties>';
      var files = [{ name: '[Content_Types].xml', data: content }, { name: '_rels/.rels', data: rootrels }, { name: 'xl/workbook.xml', data: workbook }, { name: 'xl/_rels/workbook.xml.rels', data: wbRels }, { name: 'xl/styles.xml', data: styles }, { name: 'xl/sharedStrings.xml', data: sst }, { name: 'docProps/core.xml', data: core }].concat(sheetFiles);
      return new Blob([xlsxZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    async function nativeSaveBlobToDownloads(blob, filename, mimeType){
      const C=window.Capacitor, plugins=C&&C.Plugins, native=plugins&&plugins.NativeFileExport;
      if(!C || !native || typeof native.saveBase64ToDownloads !== 'function') return false;
      const bytes=new Uint8Array(await blob.arrayBuffer());
      let binary=''; const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+chunk,bytes.length)));
      const result=await native.saveBase64ToDownloads({filename:filename,mimeType:mimeType||blob.type||'application/octet-stream',data:btoa(binary)});
      return !!(result && result.uri);
    }

    async function shareExportFile(blob, filename, mimeType){
      if (typeof hkIsIos === 'function' && hkIsIos()) { try { return await hkIosSaveBlob(blob, filename, mimeType); } catch (eI) { return false; } }
      try{
        if(await nativeSaveBlobToDownloads(blob,filename,mimeType)) return true;
      }catch(e){console.warn('Native Downloads save failed:',e);}
      try{
        if(navigator.share&&typeof File!=='undefined'){
          const file=new File([blob],filename,{type:mimeType});
          if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({title:filename,files:[file]});return true;}
        }
      }catch(e){console.warn('Web share failed:',e);}
      return false;
    }

    async function exportExcel(){
      try{ persistCurrent(); showToast('در حال ساخت فایل Excel...'); const name=hkExportFileBase()+'.xlsx'; const blob=buildXlsxWorkbook(); const shared=await shareExportFile(blob,name,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); if(!shared) downloadBlob(blob,name); showToast(shared?'فایل Excel آماده است':'دانلود Excel شروع شد'); }
      catch(e){ console.error(e); showToast('ساخت Excel ناموفق بود'); }
    }

