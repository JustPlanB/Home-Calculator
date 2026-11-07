    /* =====================================================================
       یکپارچگی دادهٔ حساب‌های بانکی
       مرجع هر «موجودی اولیه/انتقالی» (accountOpeningInstant ماه‌ها) فقط یک حساب موجود در
       selectedBankAccounts است (کلید = برچسب حساب). ورودیِ این نقشه برای برچسبی که حسابش
       وجود ندارد «یتیم» است: در UI دیده نمی‌شود ولی قبلاً وارد جمع موجودی می‌شد.
       تراکنش‌ها (ردیف‌ها) هرگز حذف نمی‌شوند؛ فقط موجودی‌های اولیهٔ بی‌صاحب کنار گذاشته می‌شوند.
       ===================================================================== */
    function liveAccountLabelSet() {
      var set = Object.create(null);
      selectedAccountLabels().forEach(function (l) { set[l] = true; });
      return set;
    }
    function isLiveAccountLabel(lb) {
      lb = (lb || '').trim();
      return !!lb && selectedAccountLabels().indexOf(lb) >= 0;
    }
    /** حذف ورودی‌های یتیم از نقشهٔ موجودی اولیهٔ همهٔ ماه‌ها؛ مقادیر حذف‌شده برای بازیابی نگه داشته می‌شوند */
    function cleanupOrphanedAccountOpenings(opts) {
      opts = opts || {};
      var live = liveAccountLabelSet();
      /* ایمنی: اگر هیچ حسابی بارگذاری نشده، چیزی پاک نکن (فقط محاسبات آن‌ها را نادیده می‌گیرند) */
      if (!Object.keys(live).length && !opts.allowEmpty) return { labels: 0, entries: 0 };
      var removed = {}, labels = Object.create(null), entries = 0;
      var walk = function (pd, key) {
        if (!pd || !pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') return;
        Object.keys(pd.accountOpeningInstant).forEach(function (lb) {
          if (live[(lb || '').trim()]) return;
          (removed[key] = removed[key] || {})[lb] = pd.accountOpeningInstant[lb];
          delete pd.accountOpeningInstant[lb];
          labels[lb] = true; entries++;
        });
      };
      try { walk(periodData, periodKey(currentYear, currentMonth)); } catch (e0) {}
      try { Object.keys(archive || {}).forEach(function (k) { walk(archive[k], k); }); } catch (e1) {}
      if (entries) {
        var stashed = false;
        try {
          var KEY = STORAGE_KEY + '_orphanOpenings';
          var prev = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
          Object.keys(removed).forEach(function (k) { prev[k] = Object.assign(prev[k] || {}, removed[k]); });
          stashed = hkStorageSet(KEY, JSON.stringify(prev));
        } catch (eS) { stashed = false; }
        /* اگر نسخهٔ قابل بازیابی ذخیره نشد، چیزی هم برداشته نشود */
        if (!stashed) {
          var cur0 = periodKey(currentYear, currentMonth);
          Object.keys(removed).forEach(function (k) {
            var pd = k === cur0 ? periodData : (archive && archive[k]);
            if (!pd) return;
            if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
            Object.keys(removed[k]).forEach(function (lb) { pd.accountOpeningInstant[lb] = removed[k][lb]; });
          });
          return { labels: 0, entries: 0, failed: true };
        }
        if (!opts.noSave) { try { persistCurrent(); saveArchive(); } catch (eP) {} }
      }
      return { labels: Object.keys(labels).length, entries: entries };
    }
    /** تغییر نام حساب: همهٔ ارجاع‌های برچسب قدیم (موجودی اولیهٔ ماه‌ها، تراکنش‌ها، درآمد ثابت، نگاشت پیامک) منتقل می‌شوند */
    function migrateAccountLabel(oldLb, newLb) {
      oldLb = (oldLb || '').trim(); newLb = (newLb || '').trim();
      if (!oldLb || !newLb || oldLb === newLb) return;
      var fix = function (pd) {
        if (!pd) return;
        var m = pd.accountOpeningInstant;
        if (m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, oldLb)) {
          if (m[newLb] == null || m[newLb] === '') m[newLb] = m[oldLb];
          delete m[oldLb];
        }
        ['income', 'expense'].forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            (sec && sec.rows || []).forEach(function (r) { if (r && (r.account || '').trim() === oldLb) r.account = newLb; });
          });
        });
      };
      try { fix(periodData); } catch (e0) {}
      try { Object.keys(archive || {}).forEach(function (k) { fix(archive[k]); }); } catch (e1) {}
      try { (recurringIncomes || []).forEach(function (r) { if (r && (r.account || '').trim() === oldLb) r.account = newLb; }); if (typeof saveRecurring === 'function') saveRecurring(); } catch (e2) {}
      try {
        var ch = false;
        Object.keys(smsAccountBankMap || {}).forEach(function (k) { if (smsAccountBankMap[k] === oldLb) { smsAccountBankMap[k] = newLb; ch = true; } });
        if (ch) saveSmsAccountBankMap();
      } catch (e3) {}
      try { persistCurrent(); saveArchive(); } catch (e4) {}
    }
    /** اعتبارسنجی فایل پشتیبان قبل از ادغام؛ فقط دادهٔ واقعاً نامعتبر/یتیم کنار گذاشته می‌شود */
    function sanitizeBackupData(data, mode) {
      var rep = { orphanAccounts: 0, orphanEntries: 0, invalidRecords: 0, mergedAccounts: 0, dupTrash: 0, failedParts: [], removedOpenings: {} };
      if (!data || typeof data !== 'object') return rep;
      var lbOf = function (a) { return accountLabel(a); };
      /* ۱) حساب‌های فایل: بدون برچسب = نامعتبر؛ هم‌شناسه یا هم‌برچسب با حساب موجود = ادغام (بدون تکرار موجودی اولیه) */
      var incomingAccounts = [];
      if (Array.isArray(data.selectedBankAccounts)) {
        var localIds = Object.create(null), localLabels = Object.create(null);
        if (mode !== 'replace') (selectedBankAccounts || []).forEach(function (a) { if (a && a.id) localIds[a.id] = true; var l = lbOf(a); if (l) localLabels[l] = true; });
        var seenL = Object.create(null);
        data.selectedBankAccounts.forEach(function (a) {
          var l = lbOf(a);
          if (!a || !l) { rep.invalidRecords++; return; }
          if (seenL[l]) { rep.mergedAccounts++; return; }
          seenL[l] = true;
          if (typeof a === 'object' && a.id && localIds[a.id]) return;           /* همان حساب، قبلاً موجود */
          if (localLabels[l]) { rep.mergedAccounts++; return; }                   /* هم‌نام → حساب محلی حفظ می‌شود */
          incomingAccounts.push(a);
        });
        data.selectedBankAccounts = incomingAccounts;
      }
      /* برچسب‌های معتبر بعد از ادغام */
      var valid = Object.create(null);
      /* ادغام: حساب‌های فعلی + حساب‌های پذیرفته‌شدهٔ فایل · جایگزینی: فقط حساب‌های فایل (اگر فایل حساب ندارد، حساب‌های فعلی می‌مانند) */
      if (mode !== 'replace' || !Array.isArray(data.selectedBankAccounts)) selectedAccountLabels().forEach(function (l) { valid[l] = true; });
      (Array.isArray(data.selectedBankAccounts) ? data.selectedBankAccounts : []).forEach(function (a) { var l = lbOf(a); if (l) valid[l] = true; });
      /* ۲) ساختار ماه‌ها + جداکردن موجودی‌های اولیهٔ یتیم.
         اگر فایل فهرست حساب ندارد، یتیم بودن قابل تشخیص نیست (حساب‌ها ممکن است بعداً بازیابی شوند): هیچ موجودی‌ای کنار گذاشته نمی‌شود.
         موارد کنارگذاشته هم دور ریخته نمی‌شوند و در _orphanOpenings نگه داشته می‌شوند. */
      var fileHasAccounts = Array.isArray(data.selectedBankAccounts);
      var orphanLabels = Object.create(null);
      if (data.archive && typeof data.archive === 'object') {
        Object.keys(data.archive).forEach(function (k) {
          var pd = data.archive[k];
          if (!/^\d{4}-\d{1,2}$/.test(k) || !pd || typeof pd !== 'object') { delete data.archive[k]; rep.invalidRecords++; return; }
          ['income', 'expense'].forEach(function (tab) {
            var side = pd[tab];
            if (side == null) return;
            if (typeof side !== 'object' || !Array.isArray(side.sections)) { pd[tab] = { sections: [], nextId: 1 }; rep.invalidRecords++; return; }
            side.sections = side.sections.filter(function (sec) {
              if (!sec || typeof sec !== 'object') { rep.invalidRecords++; return false; }
              if (!Array.isArray(sec.rows)) sec.rows = [];
              sec.rows = sec.rows.filter(function (r) {
                if (!r || typeof r !== 'object') { rep.invalidRecords++; return false; }
                if (r.amount != null && r.amount !== '' && !isFinite(Number(r.amount))) { rep.invalidRecords++; return false; }
                return true;
              });
              return true;
            });
          });
          var m = pd.accountOpeningInstant;
          if (m && typeof m === 'object') {
            if (fileHasAccounts) Object.keys(m).forEach(function (lb) {
              if (valid[(lb || '').trim()]) return;
              orphanLabels[lb] = true; rep.orphanEntries++;
              (rep.removedOpenings[k] = rep.removedOpenings[k] || {})[lb] = m[lb];
              delete m[lb];
            });
          } else if (m != null) { delete pd.accountOpeningInstant; }
        });
      }
      rep.orphanAccounts = Object.keys(orphanLabels).length;
      /* ۳) سطل زباله: فقط آیتم‌های شیء معتبر؛ در ادغام، موارد هم‌شناسه دوباره اضافه نشوند */
      if (data.trash != null && !Array.isArray(data.trash)) { delete data.trash; rep.invalidRecords++; }
      if (Array.isArray(data.trash)) {
        data.trash = data.trash.filter(function (t) {
          if (!t || typeof t !== 'object' || Array.isArray(t)) { rep.invalidRecords++; return false; }
          return true;
        });
      }
      /* ۴) کارهای من: { کارت: { «سال-ماه»: [ {id, items:[...]} ] } } یا قالب قدیمی { کارت: [موارد] } */
      if (data.todos != null) {
        if (typeof data.todos !== 'object' || Array.isArray(data.todos)) { delete data.todos; rep.invalidRecords++; }
        else {
          Object.keys(data.todos).forEach(function (card) {
            var v = data.todos[card];
            if (Array.isArray(v)) return; /* قالب قدیمی؛ خود نرم‌افزار هنگام خواندن به ماه جاری منتقل می‌کند */
            if (!card.trim() || !v || typeof v !== 'object') { delete data.todos[card]; rep.invalidRecords++; return; }
            Object.keys(v).forEach(function (ym) {
              if (!/^\d{4}-\d{1,2}$/.test(ym) || !Array.isArray(v[ym])) { delete v[ym]; rep.invalidRecords++; return; }
              v[ym] = v[ym].filter(function (l) {
                if (!l || typeof l !== 'object' || !l.id || !Array.isArray(l.items)) { rep.invalidRecords++; return false; }
                return true;
              });
              if (!v[ym].length) delete v[ym];
            });
            if (!Object.keys(v).length) delete data.todos[card];
          });
        }
      }
      /* ۵) بانکِ پیامک‌ها: فقط متن ← نام بانک (رشته) */
      if (data.smsBankMap != null) {
        if (typeof data.smsBankMap !== 'object' || Array.isArray(data.smsBankMap)) { delete data.smsBankMap; rep.invalidRecords++; }
        else Object.keys(data.smsBankMap).forEach(function (k) {
          var b = data.smsBankMap[k];
          if (!k || typeof b !== 'string' || !b.trim()) { delete data.smsBankMap[k]; rep.invalidRecords++; }
        });
      }
      if (Array.isArray(data.trash) && mode !== 'replace') {
        var tIds = Object.create(null);
        try { loadTrash(); } catch (eT) {}
        (trashItems || []).forEach(function (t) { if (t && t.id) tIds[t.id] = true; });
        data.trash = data.trash.filter(function (t) {
          if (t && t.id && tIds[t.id]) { rep.dupTrash++; return false; }
          if (t && t.id) tIds[t.id] = true;
          return !!t;
        });
      }
      return rep;
    }
    function backupReportText(rep) {
      if (!rep) return '';
      var parts = [];
      if (rep.orphanAccounts) parts.push(toPersianDigits(String(rep.orphanAccounts)) + ' حساب حذف‌شده' + (rep.orphanEntries ? ' و ' + toPersianDigits(String(rep.orphanEntries)) + ' رکورد وابسته' : ''));
      if (rep.invalidRecords) parts.push(toPersianDigits(String(rep.invalidRecords)) + ' رکورد ناسازگار');
      var failed = (rep.failedParts && rep.failedParts.length) ? 'بازیابی این بخش‌ها ناموفق بود: ' + rep.failedParts.join('، ') + '.' : '';
      if (!parts.length) return failed;
      return 'بخشی از اطلاعات فایل پشتیبان ناسازگار بود و وارد نشد: ' + parts.join('، ') + ' نادیده گرفته شد.' + (failed ? ' ' + failed : '');
    }

    function ensureBankAccountSelected(nameOrLabel) {
      const label = (nameOrLabel || '').trim();
      if (!label) return label;
      if (!Array.isArray(selectedBankAccounts)) selectedBankAccounts = [];
      normalizeSelectedBanks();
      const labels = selectedAccountLabels();
      if (labels.indexOf(label) >= 0) return label;
      /* فقط تطبیق با حساب موجود — حساب جدید خودکار ساخته نشود */
      const full = (ALL_IRAN_BANKS || []).find(b =>
        b === label || (bankShortLabel(b) || b) === label || b.indexOf(label) >= 0 || label.indexOf(bankShortLabel(b) || b) >= 0
      ) || label;
      const short = bankShortLabel(full) || label;
      if (labels.indexOf(short) >= 0) return short;
      if (labels.indexOf(full) >= 0) return full;
      for (var li = 0; li < labels.length; li++) {
        if (labels[li] && (label.indexOf(labels[li]) >= 0 || labels[li].indexOf(label) >= 0)) return labels[li];
      }
      return label;
    }

    function extractAccountFromSms(text) {
      const t = normalizeSmsText(text);
      const m = t.match(/حساب\s*[:：]?\s*([0-9]{3,})/i) || t.match(/کارت\s*[:：]?\s*([0-9]{4,})/i);
      return m ? m[1] : '';
    }
    function loadSmsAccountBankMap() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_smsAccountBankMap');
        smsAccountBankMap = raw ? (JSON.parse(raw) || {}) : {};
      } catch (e) { smsAccountBankMap = {}; }
    }
    function saveSmsAccountBankMap() {
      return hkStorageSet(STORAGE_KEY + '_smsAccountBankMap', JSON.stringify(smsAccountBankMap));
    }
    function migrateBankName(n) {
      if (!n) return n;
      if (typeof BANK_NAME_MIGRATE === 'object' && BANK_NAME_MIGRATE[n]) return BANK_NAME_MIGRATE[n];
      return n;
    }
    function migrateAllBankNamesInData() {
      function walk(pd) {
        if (!pd) return;
        ['expense', 'income'].forEach(tab => {
          (pd[tab] && pd[tab].sections || []).forEach(sec => {
            (sec.rows || []).forEach(r => {
              if (r.account) r.account = migrateBankName(r.account);
            });
          });
        });
      }
      walk(periodData);
      Object.keys(archive || {}).forEach(k => walk(archive[k]));
      (recurringIncomes || []).forEach(r => {
        if (r.account) r.account = migrateBankName(r.account);
      });
    }
    function loadBankAccounts() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_bankAccounts');
        if (raw) selectedBankAccounts = JSON.parse(raw) || [];
      } catch (e) { selectedBankAccounts = []; }
      normalizeSelectedBanks();
    }
    function saveBankAccountsSelection() {
      return hkStorageSet(STORAGE_KEY + '_bankAccounts', JSON.stringify(selectedBankAccounts));
    }

    function loadTrash() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_trash');
        trashItems = raw ? (JSON.parse(raw) || []) : [];
        if (!Array.isArray(trashItems)) trashItems = [];
      } catch (e) { trashItems = []; }
    }
    function saveTrash() {
      return hkStorageSet(STORAGE_KEY + '_trash', JSON.stringify(trashItems));
    }
    function pushToTrash(type, title, data) {
      loadTrash();
      const src = (data && data.sourceLabel) ? data.sourceLabel : '';
      trashItems.unshift({
        id: 'tr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        type: type,
        title: title || type,
        data: data,
        sourceLabel: src,
        deletedAt: Date.now()
      });
      // سقف ۵۰۰ آیتم
      if (trashItems.length > 500) trashItems = trashItems.slice(0, 500);
      /* اگر ذخیره نشد، در حافظه هم نماند (وگرنه به‌دروغ «در سطل زباله» دیده می‌شود) و فراخوان باخبر شود */
      if (saveTrash()) return true;
      loadTrash();
      return false;
    }
    function openTrashModal() {
      try { closeSideMenu(); } catch (e) {}
      loadTrash();
      renderTrashList();
      const m = document.getElementById('trashModal');
      if (m) {
        m.classList.add('open');
        try { document.body.classList.add('modal-scroll-lock'); } catch (e) {}
        m.onclick = (e) => {
          if (e.target === m) closeTrashModal();
        };
      }
    }
    function closeTrashModal() {
      const m = document.getElementById('trashModal');
      if (m) m.classList.remove('open');
      try { document.body.classList.remove('modal-scroll-lock'); } catch (e) {}
    }
    function renderTrashList() {
      const box = document.getElementById('trashList');
      if (!box) return;
      box.innerHTML = '';
      if (!trashItems.length) {
        box.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:0.9rem;">سطل زباله خالی است</div>';
        return;
      }
      const typeFa = { row: 'ردیف', section: 'بخش', plan: 'قسط', ledger_row: 'ردیف قرض', ledger_section: 'قرض', recurring: 'درآمد ثابت', period_month: 'ماه کامل', full_backup: 'کل اطلاعات', person_card: 'کارت کاربر', bank_account: 'حساب بانکی', project: 'پروژه', reminder: 'یادآور', savings_item: 'پس‌انداز' };
      function trashSourceLabel(item) {
        if (item.sourceLabel) return item.sourceLabel;
        const d = item.data || {};
        if (item.type === 'row') {
          const tab = d.tab === 'income' ? 'درآمد' : (d.tab === 'expense' ? 'مخارج' : (d.tab || ''));
          const sec = (d.sectionTitle || '').trim();
          if (tab && sec) return 'بخش ' + tab + ' / ' + sec;
          if (tab) return 'بخش ' + tab;
          if (sec) return 'بخش ' + sec;
          return 'ردیف جدول';
        }
        if (item.type === 'section') {
          const tab = d.tab === 'income' ? 'درآمد' : (d.tab === 'expense' ? 'مخارج' : (d.tab || ''));
          return tab ? ('بخش ' + tab) : 'بخش';
        }
        if (item.type === 'plan') return 'اقساط';
        if (item.type === 'recurring') return 'درآمد ثابت';
        if (item.type === 'ledger_row' || item.type === 'ledger_section') return 'قرض';
        if (item.type === 'period_month') return 'پاک کردن ماه';
        if (item.type === 'full_backup') return 'پاک کردن همه آرشیو';
        return typeFa[item.type] || item.type || '';
      }

      const toolbar = document.createElement('div');
      toolbar.className = 'trash-toolbar';
      /* «همه» بالای فهرست می‌ماند و فهرست زیرش اسکرول می‌شود */
      toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 4px 10px;border-bottom:1px solid var(--border);margin-bottom:4px;position:sticky;top:0;z-index:2;background:var(--card);';
      toolbar.innerHTML = '<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;cursor:pointer;">' +
        '<input type="checkbox" id="trashSelectAll" style="width:18px;height:18px;accent-color:var(--accent);">' +
        'همه</label>';
      box.appendChild(toolbar);
      try {
        /* پس‌زمینهٔ مات هم‌رنگ پنجره تا ردیف‌های زیرش دیده نشوند */
        for (let el = box; el && el !== document.body; el = el.parentElement) {
          const bgc = getComputedStyle(el).backgroundColor;
          if (bgc && bgc !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bgc)) { toolbar.style.background = bgc.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)'); break; }
        }
      } catch (eBg) {}
      const selAll = toolbar.querySelector('#trashSelectAll');
      if (selAll) {
        selAll.addEventListener('change', () => {
          box.querySelectorAll('input.trash-cb').forEach(cb => { cb.checked = selAll.checked; });
        });
      }

      trashItems.forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid var(--border);font-size:0.88rem;';
        const when = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('fa-IR') : '';
        var tTitle = toPersianDigits(String(item.title || '—'));
        var tMeta = toPersianDigits(String(
          trashSourceLabel(item) +
          (typeFa[item.type] ? (' · ' + typeFa[item.type]) : '') +
          (when ? ' · ' + when : '')
        ));
        row.innerHTML =
          '<input type="checkbox" class="trash-cb" data-idx="' + idx + '" style="width:18px;height:18px;margin-top:3px;flex-shrink:0;accent-color:var(--accent);">' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;margin-bottom:2px;">' + escapeHtml(tTitle) + '</div>' +
          '<div style="color:var(--muted);font-size:0.78rem;">' +
          escapeHtml(tMeta) + '</div></div>';
        box.appendChild(row);
      });
    }
    function getSelectedTrashIndices() {
      const box = document.getElementById('trashList');
      if (!box) return [];
      return Array.from(box.querySelectorAll('input.trash-cb:checked'))
        .map(cb => parseInt(cb.getAttribute('data-idx'), 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a); // از آخر به اول تا splice خراب نشود
    }
    function findRestoreNameConflict(item) {
      if (!item || !item.data) return null;
      if (item.type === 'section') {
        const d = item.data;
        const tab = d.tab || currentTab;
        const title = ((d.section && d.section.title) || item.title || '').trim();
        if (!title) return null;
        const exists = (periodData[tab] && periodData[tab].sections || []).some(s => (s.title || '').trim() === title);
        return exists ? { kind: 'section', name: title, tab: tab } : null;
      }
      if (item.type === 'plan') {
        const name = ((item.data && item.data.name) || item.title || '').trim();
        if (!name) return null;
        const exists = (plans || []).some(p => (p.name || '').trim() === name);
        return exists ? { kind: 'plan', name: name } : null;
      }
      if (item.type === 'recurring') {
        const name = ((item.data && item.data.name) || item.title || '').trim();
        if (!name) return null;
        const exists = (recurringIncomes || []).some(r => (r.name || '').trim() === name);
        return exists ? { kind: 'recurring', name: name } : null;
      }
      return null;
    }
    function applyRestoreConflict(item, mode, newName) {
      if (mode === 'skip') return false;
      if (mode === 'replace') {
        if (item.type === 'section') {
          const d = item.data;
          const tab = d.tab || currentTab;
          const title = ((d.section && d.section.title) || '').trim();
          periodData[tab].sections = (periodData[tab].sections || []).filter(s => (s.title || '').trim() !== title);
        } else if (item.type === 'plan') {
          const name = ((item.data && item.data.name) || '').trim();
          plans = (plans || []).filter(p => (p.name || '').trim() !== name);
        } else if (item.type === 'recurring') {
          const name = ((item.data && item.data.name) || '').trim();
          recurringIncomes = (recurringIncomes || []).filter(r => (r.name || '').trim() !== name);
          try { saveRecurring(); } catch (e) {}
        }
      } else if (mode === 'rename' && newName) {
        if (item.type === 'section' && item.data.section) item.data.section.title = newName;
        else if (item.type === 'plan' && item.data) item.data.name = newName;
        else if (item.type === 'recurring' && item.data) item.data.name = newName;
        item.title = newName;
      }
      return restoreTrashData(item);
    }
    function askRestoreConflict(item, onDone) {
      const conf = findRestoreNameConflict(item);
      if (!conf) { onDone('ok'); return; }
      // مودال ساده سه گزینه
      let ov = document.getElementById('restoreConflictOverlay');
      if (ov) ov.remove();
      ov = document.createElement('div');
      ov.id = 'restoreConflictOverlay';
      ov.className = 'modal-overlay open';
      ov.style.zIndex = '480';
      ov.innerHTML =
        '<div class="modal-box" style="max-width:320px;text-align:right;">' +
        '<div class="modal-msg" style="margin-bottom:8px;">نام تکراری</div>' +
        '<p class="family-help" style="margin-bottom:12px;">«' + escapeHtml(conf.name) + '» از قبل وجود دارد. چه کار کنیم؟</p>' +
        '<button type="button" class="modal-btn yes" id="rcSkip" style="width:100%;margin-bottom:8px;background:var(--bg3);color:var(--text);">رد کردن</button>' +
        '<button type="button" class="modal-btn yes" id="rcReplace" style="width:100%;margin-bottom:8px;background:#c0392b;">جایگزینی</button>' +
        '<button type="button" class="modal-btn yes" id="rcRename" style="width:100%;margin-bottom:8px;background:#08b5f5;">تغییر نام</button>' +
        '</div>';
      document.body.appendChild(ov);
      const close = () => { try { ov.remove(); } catch (e) {} };
      ov.querySelector('#rcSkip').onclick = () => { close(); onDone('skip'); };
      ov.querySelector('#rcReplace').onclick = () => { close(); onDone('replace'); };
      ov.querySelector('#rcRename').onclick = () => {
        const box = ov.querySelector('.modal-box');
        if (!box) return;
        box.innerHTML =
          '<div class="modal-msg" style="margin-bottom:8px;">تغییر نام</div>' +
          '<input id="rcRenameInput" type="text" value="' + escapeHtml(conf.name) + ' ۲" ' +
          'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:700;margin-bottom:10px;">' +
          '<div style="display:flex;gap:8px;">' +
          '<button type="button" class="modal-btn yes" id="rcRenameOk" style="flex:1;">ثبت</button>' +
          '<button type="button" class="modal-btn no" id="rcRenameCancel" style="flex:1;">انصراف</button>' +
          '</div>';
        const inp = box.querySelector('#rcRenameInput');
        try { inp.focus(); caretToEnd(inp); } catch (e) {}
        box.querySelector('#rcRenameCancel').onclick = () => { close(); onDone('skip'); };
        box.querySelector('#rcRenameOk').onclick = () => {
          const n = (inp.value || '').trim();
          if (!n) { showToast('نام را وارد کنید'); return; }
          if (n === conf.name) { showToast('نام تکراریست'); return; }
          // بررسی وجود نام جدید
          const probe = JSON.parse(JSON.stringify(item));
          if (probe.type === 'section' && probe.data && probe.data.section) probe.data.section.title = n;
          else if (probe.type === 'plan' && probe.data) probe.data.name = n;
          else if (probe.type === 'recurring' && probe.data) probe.data.name = n;
          probe.title = n;
          if (findRestoreNameConflict(probe)) { showToast('نام تکراریست'); return; }
          close();
          onDone('rename', n);
        };
      };
    }
    function restoreSelectedTrash() {
      const indices = getSelectedTrashIndices();
      if (!indices.length) { showToast('موردی انتخاب نشده'); return; }
      const selected = indices.map(i => trashItems[i]).filter(Boolean);
      // حذف از trash (نزولی) — موقتاً نگه می‌داریم تا conflict حل شود
      const runNext = (list, okCount) => {
        if (!list.length) {
          try { persistCurrent(); saveArchive(); renderAll(); renderPlans(); } catch (e) {}
          renderTrashList();
          showToast(okCount ? (toPersianDigits(okCount) + ' مورد بازگردانی شد') : 'موردی بازگردانی نشد');
          return;
        }
        const item = list.shift();
        const idx = trashItems.indexOf(item);
        askRestoreConflict(item, (mode, newName) => {
          let ok = false;
          try {
            if (mode === 'skip') {
              // هیچ اقدامی — آیتم در سطل می‌ماند
              ok = false;
            } else {
              if (idx >= 0) { trashItems.splice(idx, 1); saveTrash(); }
              if (mode === 'ok') ok = restoreTrashData(item);
              else ok = applyRestoreConflict(item, mode, newName);
              if (!ok && idx >= 0) {
                // اگر بازگردانی شکست خورد برگردان به سطل
                trashItems.splice(idx, 0, item);
                saveTrash();
              }
            }
          } catch (e) { console.error(e); }
          runNext(list, okCount + (ok ? 1 : 0));
        });
      };
      runNext(selected.slice(), 0);
    }


    function purgeTrashItem(idx) {
      askConfirm('این مورد برای همیشه حذف شود؟', () => {
        trashItems.splice(idx, 1);
        saveTrash();
        renderTrashList();
        showToast('حذف دائم شد');
      });
    }
    function emptyTrashConfirm() {
      if (!trashItems.length) { showToast('سطل خالی است'); return; }
      const indices = getSelectedTrashIndices();
      // اگر چیزی انتخاب نشده → راهنما
      if (!indices.length) {
        showToast('موردی برای پاک کردن انتخاب نشده');
        return;
      }
      const msg = 'اطلاعات برای همیشه پاک شوند؟';
      askConfirm(msg, () => {
        // نزولی تا splice خراب نشود
        indices.sort((a, b) => b - a).forEach(i => {
          if (i >= 0 && i < trashItems.length) trashItems.splice(i, 1);
        });
        saveTrash();
        renderTrashList();
        showToast(allSelected ? 'سطل زباله خالی شد' : 'موارد انتخاب‌شده پاک شدند');
      });
    }
    function restoreTrashData(item) {
      if (!item || !item.data) return false;
      if (item.type === 'row') {
        const d = item.data;
        const tab = d.tab || 'expense';
        const pk = d.periodKey || periodKey(currentYear, currentMonth);
        if (pk === periodKey(currentYear, currentMonth)) {
          let sec = (periodData[tab].sections || []).find(s => s.id === d.sectionId);
          if (!sec && d.sectionTitle) {
            sec = (periodData[tab].sections || []).find(s => (s.title || '') === d.sectionTitle);
          }
          if (!sec) return false;
          const row = d.row || {};
          row.deletedAt = null;
          sec.rows = sec.rows || [];
          sec.rows.push(row);
          return true;
        }
        if (!archive[pk]) return false;
        const pd = archive[pk];
        let sec = (pd[tab] && pd[tab].sections || []).find(s => s.id === d.sectionId);
        if (!sec && d.sectionTitle) sec = (pd[tab].sections || []).find(s => (s.title || '') === d.sectionTitle);
        if (!sec) return false;
        const row = d.row || {};
        row.deletedAt = null;
        sec.rows = sec.rows || [];
        sec.rows.push(row);
        return true;
      }
      if (item.type === 'section') {
        const d = item.data;
        const tab = d.tab || currentTab;
        const sec = d.section;
        if (!sec) return false;
        sec.deletedAt = null;
        periodData[tab].sections = periodData[tab].sections || [];
        periodData[tab].sections.push(sec);
        return true;
      }
      if (item.type === 'plan') {
        const plan = item.data;
        if (!plan) return false;
        plan.deletedAt = null;
        plans = plans || [];
        plans.push(plan);
        try { syncPlansToExpenseAll(); } catch (e) {}
        return true;
      }
      if (item.type === 'period_month') {
        const d = item.data || {};
        const pk = d.periodKey || periodKey(d.year || currentYear, d.month || currentMonth);
        if (d.periodData) {
          if (pk === periodKey(currentYear, currentMonth)) {
            periodData = JSON.parse(JSON.stringify(d.periodData));
          } else {
            archive[pk] = JSON.parse(JSON.stringify(d.periodData));
          }
          return true;
        }
        return false;
      }
      if (item.type === 'full_backup') {
        const d = item.data || {};
        if (d.archive) archive = JSON.parse(JSON.stringify(d.archive));
        if (d.plans) plans = JSON.parse(JSON.stringify(d.plans));
        if (d.periodData) periodData = JSON.parse(JSON.stringify(d.periodData));
        if (d.recurringIncomes) {
          recurringIncomes = JSON.parse(JSON.stringify(d.recurringIncomes));
          try { saveRecurring(); } catch (e) {}
        }
        return true;
      }
            if (item.type === 'ledger_section') {
        const d = item.data || {};
        const sec = d.section;
        if (!sec) return false;
        try { hkLedGoneSet(sec.id, false); } catch (e) {}
        /* ۱.۳.۶۶: بستهٔ همهٔ ماه‌ها به ماه‌های خودش برمی‌گردد */
        const cur = periodKey(currentYear, currentMonth);
        if (d.months && typeof d.months === 'object') {
          Object.keys(d.months).forEach(k => {
            if (k === cur) return;
            const pd = archive[k];
            if (!pd) return;
            if (!pd.ledger) pd.ledger = { sections: [], nextId: 1 };
            pd.ledger.sections = (pd.ledger.sections || []).filter(s => !s || s.id !== sec.id);
            pd.ledger.sections.push(JSON.parse(JSON.stringify(d.months[k])));
          });
          if (!d.months[cur] && d.curKey !== cur) return true;
        }
        const led = ensureLedger();
        led.sections = (led.sections || []).filter(s => !s || s.id !== sec.id);
        led.sections.push(d.months && d.months[cur] ? JSON.parse(JSON.stringify(d.months[cur])) : sec);
        return true;
      }
      if (item.type === 'ledger_row') {
        const d = item.data || {};
        const led = ensureLedger();
        const sec = (led.sections || []).find(s => s.id === d.sectionId);
        if (!sec) return false;
        sec.rows = sec.rows || [];
        sec.rows.push(d.row || {});
        return true;
      }
if (item.type === 'recurring') {
        let r = item.data;
        if (!r) return false;
        try { r = JSON.parse(JSON.stringify(r)); } catch (e) { r = item.data; }
        const _arc = Array.isArray(r._archive) ? r._archive : [];
        delete r._archive; delete r.sourceLabel;
        if (!r.id) r.id = 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
        r.deletedAt = null;
        /* بازگردانی از سطل: فقط از ماه جاری به بعد ادامه دهد (ماه‌های گذشته ساخته نشوند) */
        try { var _tk = recTodayKey(); r.fromKey = Math.max(parseInt(r.fromKey, 10) || 0, _tk); r.genKey = Math.max(parseInt(r.genKey, 10) || 0, recPrevKey(_tk)); } catch (eRk) {}
        recurringIncomes = recurringIncomes || [];
        // جلوگیری از تکراری
        recurringIncomes = recurringIncomes.filter(x => x && x.id !== r.id);
        recurringIncomes.push(r);
        /* آرشیو: ردیف‌های آزادشده دوباره وصل می‌شوند؛ ردیف‌هایی که دیگر نیستند برگردانده می‌شوند */
        try {
          if (_arc.length) {
            const curK = periodKey(currentYear, currentMonth);
            const sig = (x) => [x.day || '', Number(x.amount) || 0, x.desc || '', x.account || ''].join('|');
            const missing = [];
            _arc.forEach((x) => {
              if (!x || !x.row) return;
              const pd = x.key === curK ? periodData : archive[x.key];
              let hit = null;
              if (pd && pd.income) (pd.income.sections || []).forEach((sec) => { (sec.rows || []).forEach((row) => {
                if (hit || !row || (row.fromRecurringId && row.fromRecurringId !== r.id && recLiveItem(row.fromRecurringId))) return;
                if ((x.row.id && row.id === x.row.id) || sig(row) === sig(x.row)) hit = row;
              }); });
              if (hit) { hit.fromRecurringId = r.id; if (x.row.recLinked) hit.recLinked = true; if (x.row.recForKey) hit.recForKey = x.row.recForKey; }
              else { const cp = JSON.parse(JSON.stringify(x)); cp.row.fromRecurringId = r.id; missing.push(cp); }
            });
            if (missing.length) hkRecArchiveUnpack(missing);
            persistCurrent(); saveArchive();
          }
        } catch (eArc) {}
        try { saveRecurring(); } catch (e) {}
        try { if (typeof renderRecurringBar === 'function') renderRecurringBar(); } catch (e) {}
        return true;
      }
      if (item.type === 'person_card') {
        const d = item.data || {};
        const title = (d.title || item.title || '').trim();
        if (!title) return false;
        // بازگردانی بخش درآمد
        if (d.income) {
          const sec = JSON.parse(JSON.stringify(d.income));
          sec.deletedAt = null;
          sec.title = title;
          periodData.income = periodData.income || { sections: [], nextId: 1 };
          periodData.income.sections = periodData.income.sections || [];
          // حذف تکراری هم‌نام
          periodData.income.sections = periodData.income.sections.filter(s => (s.title || '').trim() !== title);
          periodData.income.sections.push(sec);
        }
        if (d.expense) {
          const sec = JSON.parse(JSON.stringify(d.expense));
          sec.deletedAt = null;
          sec.title = title;
          periodData.expense = periodData.expense || { sections: [], nextId: 1 };
          periodData.expense.sections = periodData.expense.sections || [];
          periodData.expense.sections = periodData.expense.sections.filter(s => (s.title || '').trim() !== title);
          periodData.expense.sections.push(sec);
        }
        if (d.cardMeta) {
          const m = getCardMetaMap();
          m[title] = d.cardMeta;
          periodData.cardMeta = m;
        }
        return true;
      }
      /* حساب بانکی: خود حساب + موجودی‌های اول ماهِ ذخیره‌شده‌اش برمی‌گردد */
      if (item.type === 'bank_account') {
        const d = item.data || {}, acc = d.account;
        if (!acc) return false;
        const lb = accountLabel(acc);
        if (selectedBankAccounts.some(a => accountLabel(a) === lb)) { showToast('حسابی با همین نام وجود دارد'); return false; }
        selectedBankAccounts.push(JSON.parse(JSON.stringify(acc)));
        saveBankAccountsSelection();
        const cur = periodKey(currentYear, currentMonth);
        Object.keys(d.openings || {}).forEach(function (k) {
          const pd = k === cur ? periodData : archive[k];
          if (!pd) return;
          if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
          if (pd.accountOpeningInstant[lb] == null || pd.accountOpeningInstant[lb] === '') pd.accountOpeningInstant[lb] = d.openings[k];
        });
        try { if (d.smsMap && typeof smsAccountBankMap !== 'undefined') { Object.keys(d.smsMap).forEach(function (k) { if (smsAccountBankMap[k] == null) smsAccountBankMap[k] = d.smsMap[k]; }); if (typeof saveSmsAccountBankMap === 'function') saveSmsAccountBankMap(); } } catch (eS) {}
        /* ردیف‌هایی که همراه حساب حذف شده بودند هم برگردند */
        try { if (Array.isArray(d.rows) && d.rows.length) hkPutBackAccountRows(d.rows); } catch (eRw) {}
        try { renderBankAccountsList(); renderHomeCards(); } catch (eR) {}
        try { if (Array.isArray(d.rows) && d.rows.length) renderAll(); } catch (eRa) {}
        return true;
      }
      /* فهرست «کارهای من» باکس هوشمند */
      if (item.type === 'todo_list') {
        const d = item.data || {};
        if (!d.id || !(Array.isArray(d.items) || Array.isArray(d.ink))) return false;
        try {
          const m = loadTodoMap(), k = (d.title || '').trim(), ym = d.ym || todoYm();
          if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = {};
          const lists = Array.isArray(m[k][ym]) ? m[k][ym] : [];
          if (!lists.some(function (x) { return x && x.id === d.id; })) lists.push(Array.isArray(d.ink) ? { id: d.id, ink: d.ink, at: Date.now() } : { id: d.id, items: d.items });
          m[k][ym] = lists;
          localStorage.setItem(TODO_KEY, JSON.stringify(m));
          refreshSmartPanelsFor(k, 'todo-' + d.id);
        } catch (eT) { return false; }
        return true;
      }
      if (item.type === 'project') {
        const sub = item.data && item.data.subject; if (!sub || !sub.id) return false;
        const L = loadFinancialSubjects();
        if (L.some(x => x.id === sub.id || (x.name || '').trim() === (sub.name || '').trim())) { showToast('پروژه‌ای با همین نام وجود دارد'); return false; }
        L.push(JSON.parse(JSON.stringify(sub))); _financialSubjects = L; saveFinancialSubjects();
        /* ردیف‌هایی که همراه پروژه حذف شده بودند برمی‌گردند؛ ردیف‌هایی که معمولی شده بودند دوباره به پروژه وصل می‌شوند */
        try {
          var curK = periodKey(currentYear, currentMonth);
          (item.data.rows || []).forEach(function (x) {
            var pd = x.key === curK ? periodData : archive[x.key];
            if (!pd) return;
            if (!pd[x.tab]) pd[x.tab] = { sections: [], nextId: 1 };
            var secs = pd[x.tab].sections || (pd[x.tab].sections = []);
            var sec = secs.find(function (q) { return (q.title || '').trim() === x.secTitle; }) || secs[0];
            if (!sec) { sec = { id: 's' + (secs.length + 1), title: x.secTitle, rows: [] }; secs.push(sec); }
            var ei = (sec.rows || []).findIndex(function (r) { return r && !r.desc && !r.amount && !r.day && !r.fromPlanId && !r.fromRecurringId; });
            if (ei >= 0) sec.rows[ei] = x.row; else (sec.rows = sec.rows || []).push(x.row);
          });
          var un = {}; (item.data.unlinked || []).forEach(function (u) { (un[u.sig] = un[u.sig] || []).push(u); });
          if (Object.keys(un).length) iterAllPeriodData(function (pd, key) {
            if (key === curK && pd !== periodData) return;
            ['income', 'expense'].forEach(function (tab) {
              ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
                (sec.rows || []).forEach(function (r) {
                  var l = r && un[hkRowSig(key, tab, r)];
                  if (!l || !l.length || (r.financialContext && r.financialContext.subjectId && r.financialContext.subjectId !== 'personal')) return;
                  var u = l.shift(); r.financialContext = u.fc; if (u.recv) r.createsReceivable = true;
                });
              });
            });
          });
          persistCurrent(); saveArchive();
          try { renderAll(); renderHomeCards(); } catch (eA) {}
        } catch (eRows) {}
        try { renderSubjectsList(); } catch (eR) {}
        return true;
      }
      if (item.type === 'reminder') {
        const r = item.data && item.data.reminder; if (!r) return false;
        loadUserReminders();
        if (userReminders.some(x => x.id === r.id)) return false;
        userReminders.push(JSON.parse(JSON.stringify(r))); saveUserReminders();
        try { renderUserRemindersList(); } catch (eR) {}
        return true;
      }
      if (item.type === 'savings_item') {
        const it = item.data && item.data.item; if (!it) return false;
        const sv = loadSavings(); sv.items = sv.items || [];
        if (sv.items.some(x => x.id === it.id)) return false;
        sv.items.push(JSON.parse(JSON.stringify(it))); saveSavings();
        try { renderSavings(); } catch (eR) {}
        return true;
      }
      return false;
    }
    function restoreTrashItem(idx) {
      const item = trashItems[idx];
      if (!item || !item.data) return;
      askRestoreConflict(item, (mode, newName) => {
        try {
          if (mode === 'skip') {
            renderTrashList();
            return;
          }
          let ok = false;
          if (mode === 'ok') ok = restoreTrashData(item);
          else ok = applyRestoreConflict(item, mode, newName);
          if (ok) {
            const i = trashItems.indexOf(item);
            if (i >= 0) trashItems.splice(i, 1);
            saveTrash();
            persistCurrent();
            saveArchive();
            renderAll();
            try { renderPlans(); } catch (e) {}
            showToast('بازگردانی شد');
          } else {
            showToast('بازگردانی ممکن نشد');
          }
        } catch (e) {
          console.error(e);
          showToast('بازگردانی ناموفق بود');
        }
        renderTrashList();
      });
    }

    /* ردیف‌های یک حساب در همهٔ ماه‌ها (به‌جز ردیف‌های خودکار اقساط) */
    function hkCollectAccountRows(label) {
      var out = []; label = (label || '').trim(); if (!label) return out;
      var cur = periodKey(currentYear, currentMonth);
      var keys = Object.keys(archive || {}); if (keys.indexOf(cur) < 0) keys.push(cur);
      keys.forEach(function (k) {
        var pd = k === cur ? periodData : archive[k]; if (!pd) return;
        ['income', 'expense'].forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            ((sec && sec.rows) || []).forEach(function (r, i) {
              if (r && !r.fromPlanId && (r.account || '').trim() === label) out.push({ k: k, tab: tab, secId: sec.id, secTitle: sec.title || '', secColor: sec.color || '', index: i, row: r });
            });
          });
        });
      });
      return out;
    }
    function hkTakeAccountRows(label, opts) {
      var refs = hkCollectAccountRows(label), cur = periodKey(currentYear, currentMonth), pack = [];
      /* از آخر به اول حذف شود تا اندیس‌ها جابه‌جا نشوند */
      refs.slice().reverse().forEach(function (ref) {
        var pd = ref.k === cur ? periodData : archive[ref.k]; if (!pd) return;
        var sec = ((pd[ref.tab] && pd[ref.tab].sections) || []).find(function (s2) { return s2 && s2.id === ref.secId; });
        if (!sec || !sec.rows) return;
        var i = sec.rows.indexOf(ref.row); if (i < 0) return;
        sec.rows.splice(i, 1);
        pack.unshift({ k: ref.k, tab: ref.tab, secId: ref.secId, secTitle: ref.secTitle, secColor: ref.secColor, index: ref.index, row: JSON.parse(JSON.stringify(ref.row)) });
      });
      if (opts && opts.noSave) return pack;   /* فراخوان بعد از ذخیرهٔ سطل زباله خودش ذخیره می‌کند */
      try { persistCurrent(); } catch (e1) {}
      try { saveArchive(); } catch (e2) {}
      try { scheduleSave(); } catch (e3) {}
      return pack;
    }
    function hkPutBackAccountRows(pack, opts) {
      var cur = periodKey(currentYear, currentMonth);
      pack.forEach(function (ref) {
        var pd = ref.k === cur ? periodData : archive[ref.k];
        if (!pd) { if (!archive) return; archive[ref.k] = emptyPeriodData(); pd = archive[ref.k]; }
        if (!pd[ref.tab]) pd[ref.tab] = { sections: [], nextId: 1 };
        if (!Array.isArray(pd[ref.tab].sections)) pd[ref.tab].sections = [];
        var secs = pd[ref.tab].sections;
        var sec = secs.find(function (s2) { return s2 && s2.id === ref.secId; }) || secs.find(function (s2) { return s2 && (s2.title || '').trim() === (ref.secTitle || '').trim() && ref.secTitle; });
        if (!sec) { sec = { id: ref.secId || ('s' + Date.now().toString(36)), title: ref.secTitle || '', color: ref.secColor || tabAccentColor(ref.tab), collapsed: false, rows: [] }; secs.push(sec); }
        if (!Array.isArray(sec.rows)) sec.rows = [];
        var at = Math.max(0, Math.min(sec.rows.length, ref.index | 0));
        sec.rows.splice(at, 0, ref.row);
      });
      if (opts && opts.noSave) return;
      try { persistCurrent(); } catch (e1) {}
      try { saveArchive(); } catch (e2) {}
      try { scheduleSave(); } catch (e3) {}
    }
    /* پرسش سه‌گزینه‌ای ساده */
    function hkAsk3(msg, opts, cb) {
      var old = document.getElementById('hkAsk3'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkAsk3'; ov.className = 'hk-recon-ov';
      var box = document.createElement('div'); box.className = 'hk-recon-box hk-ask3-box';
      var t = document.createElement('div'); t.className = 'hk-ask3-txt' + (String(msg).length > 90 ? ' long' : ''); t.textContent = msg; box.appendChild(t);
      var row = document.createElement('div'); row.className = 'hk-recon-btns';
      var done = function (v) { try { ov.remove(); } catch (e) {} try { cb(v); } catch (e2) {} };
      opts.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o.t; b.className = 'hk-ask3-btn' + (o.cls ? ' ' + o.cls : '');
        b.onclick = function (e) { e.stopPropagation(); done(o.v); };
        row.appendChild(b);
      });
      box.appendChild(row); ov.appendChild(box);
      ov.addEventListener('click', function (e) { if (e.target === ov) done('cancel'); });
      ov._hkCancel = function () { done('cancel'); };
      document.body.appendChild(ov);
    }
    /* ===== کلیدهای دسترسی در منوی همبرگری =====
       روشن/خاموش بودن از وضعیت واقعی گوشی خوانده می‌شود. لمس کلید خاموش: اول درخواست دسترسی، اگر گوشی دیگر اجازهٔ
       پرسیدن نداد → صفحهٔ همان دسترسی در تنظیمات. لمس کلید روشن: تنظیمات (خاموش کردن فقط از آن‌جا ممکن است). */
    function hkBankSmsPlugin() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.BankSms; }
    function hkPermRefresh() {
      var B = hkBankSmsPlugin();
      if (!B || typeof B.permStatus !== 'function') { ['permRowSms', 'permRowNotif'].forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }); return Promise.resolve(null); }
      return B.permStatus().then(function (r) {
        var set = function (id, on) { var el = document.getElementById(id); if (el) el.classList.toggle('on', !!on); };
        set('permRowSms', r && r.sms); set('permRowNotif', r && r.notif);
        return r;
      }).catch(function () { return null; });
    }
    function hkPermToggle(which) {
      var B = hkBankSmsPlugin(); if (!B) return;
      hkPermRefresh().then(function (r) {
        var on = r && r[which];
        if (on) { try { B.openPermSettings({ which: which }); } catch (e) {} showToast('برای خاموش کردن، در تنظیمات گوشی دسترسی را بردارید'); return; }
        var ask = which === 'sms' ? (B.requestPermission && B.requestPermission()) : (B.requestNotif && B.requestNotif());
        Promise.resolve(ask).catch(function () {}).then(function () {
          setTimeout(function () {
            hkPermRefresh().then(function (r2) {
              if (r2 && r2[which]) { showToast('دسترسی داده شد'); return; }
              try { B.openPermSettings({ which: which }); } catch (e2) {}
              showToast(which === 'sms' ? 'در تنظیمات: مجوزها › پیامک را روشن کنید' : 'در تنظیمات: اعلان‌ها را روشن کنید');
            });
          }, 900);
        });
      });
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { try { hkPermRefresh(); } catch (e) {} } });
    setTimeout(function () { try { hkPermRefresh(); } catch (e) {} }, 2500);
