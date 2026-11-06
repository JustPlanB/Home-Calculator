    /* ========== حالت حرفه‌ای / موضوعات مالی / financialContext ========== */
    var PRO_MODE_KEY = 'hesabKetabProfessionalMode';
    var SUBJECTS_KEY = 'hesabKetabFinancialSubjects';
    var _financialSubjects = null;

    function isProfessionalMode() {
      /* حالت حرفه‌ای حذف شد — قابلیت پروژه برای همه فعال است */
      return true;
    }
    function setProfessionalMode(on) {
      try { localStorage.setItem(PRO_MODE_KEY, on ? 'true' : 'false'); } catch (e) {}
      try { updateProfessionalModeUI(); } catch (e2) {}
    }
    function toggleProfessionalMode() {
      setProfessionalMode(!isProfessionalMode());
    }

    /* pro-mode-boot */
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ try { updateProfessionalModeUI(); } catch(e){} });
      } else {
        updateProfessionalModeUI();
      }
    } catch (eBoot) {}

    function updateProfessionalModeUI() {
      var sw = document.getElementById('proModeSwitch');
      if (sw) {
        var row = sw.closest && sw.closest('.menu-pro-row');
        if (row) row.style.display = 'none';
        else sw.style.display = 'none';
      }
      var btn = document.getElementById('menuSubjectsBtn');
      if (btn) btn.style.display = '';
    }
    var PROJECT_HIGHLIGHT_PALETTE = [
      { id: 'purple', accent: '#d000ff', bg: 'rgba(208, 0, 255, 0.35)', glow: 'rgba(208, 0, 255, 0.35)' },
      /* ۱.۳.۴۶: اولویت رنگ دوم و سوم جابه‌جا */
      { id: 'blue', accent: '#00e8ff', bg: 'rgba(0, 232, 255, 0.35)', glow: 'rgba(0, 232, 255, 0.35)' },
      { id: 'yellow', accent: '#f5ff33', bg: 'rgba(245, 255, 51, 0.35)', glow: 'rgba(245, 255, 51, 0.35)' },
      { id: 'orange', accent: '#ff6a00', bg: 'rgba(255, 106, 0, 0.35)', glow: 'rgba(255, 106, 0, 0.35)' },
      { id: 'pink', accent: '#ff2d95', bg: 'rgba(255, 45, 149, 0.35)', glow: 'rgba(255, 45, 149, 0.35)' },
      { id: 'green', accent: '#b8ff00', bg: 'rgba(184, 255, 0, 0.35)', glow: 'rgba(184, 255, 0, 0.35)' },
      { id: 'lime', accent: '#66ff66', bg: 'rgba(102, 255, 102, 0.35)', glow: 'rgba(102, 255, 102, 0.35)' },
      { id: 'cyan', accent: '#00ffd0', bg: 'rgba(0, 255, 208, 0.35)', glow: 'rgba(0, 255, 208, 0.35)' },
      { id: 'magenta', accent: '#ff00aa', bg: 'rgba(255, 0, 170, 0.35)', glow: 'rgba(255, 0, 170, 0.35)' },
      { id: 'gold', accent: '#ffd000', bg: 'rgba(255, 208, 0, 0.35)', glow: 'rgba(255, 208, 0, 0.35)' }
    ];
    function accentToRgba(hex, alpha) {
      var h = String(hex || '').replace('#', '').trim();
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      if (h.length !== 6) return 'rgba(208,0,255,' + (alpha != null ? alpha : 0.28) + ')';
      var r = parseInt(h.slice(0, 2), 16);
      var g = parseInt(h.slice(2, 4), 16);
      var b = parseInt(h.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(208,0,255,' + (alpha != null ? alpha : 0.28) + ')';
      return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha != null ? alpha : 0.28) + ')';
    }
    function buildMarkerDataUrl(accentHex, alpha) {
      var fill = (typeof accentToRgba === 'function')
        ? accentToRgba(accentHex, alpha != null ? alpha : 0.26)
        : 'rgba(208,0,255,0.38)';
      // شکل ضربه ماژیک — لبه‌های نامنظم
      var path = 'M3,8 C14,2 32,3 52,5 C90,8 120,2 160,5 C200,8 240,2 280,6 C320,9 350,3 375,7 C386,8 395,6 399,10 L399,38 C390,44 375,42 360,41 C330,39 300,44 270,42 C230,40 190,45 150,43 C110,41 80,46 50,43 C32,42 14,44 2,38 Z';
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 48" preserveAspectRatio="none">'
        + '<path fill="' + fill + '" d="' + path + '"/></svg>';
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    }
    function applyProjectRowMarker(tr, accentHex) {
      if (!tr) return;
      var acc = accentHex || '#d000ff';
      tr.classList.add('project-row-hl');
      tr.style.setProperty('--proj-accent', acc);
      try {
        tr.style.setProperty('--proj-marker-img', buildMarkerDataUrl(acc, 0.26));
      } catch (e) {
        tr.style.setProperty('--proj-row-bg', (typeof accentToRgba === 'function') ? accentToRgba(acc, 0.28) : acc);
      }
    }

    function getProjectHighlightMeta(colorId) {
      var id = (colorId || '').trim();
      for (var i = 0; i < PROJECT_HIGHLIGHT_PALETTE.length; i++) {
        if (PROJECT_HIGHLIGHT_PALETTE[i].id === id) return PROJECT_HIGHLIGHT_PALETTE[i];
      }
      return PROJECT_HIGHLIGHT_PALETTE[0];
    }
    function nextProjectHighlightColor(list) {
      var used = {};
      (list || []).forEach(function(s) {
        if (s && s.highlightColor) used[s.highlightColor] = true;
      });
      for (var i = 0; i < PROJECT_HIGHLIGHT_PALETTE.length; i++) {
        if (!used[PROJECT_HIGHLIGHT_PALETTE[i].id]) return PROJECT_HIGHLIGHT_PALETTE[i].id;
      }
      return PROJECT_HIGHLIGHT_PALETTE[(list || []).length % PROJECT_HIGHLIGHT_PALETTE.length].id;
    }
    function loadFinancialSubjects() {
      if (_financialSubjects) return _financialSubjects;
      try {
        var raw = localStorage.getItem(SUBJECTS_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) arr = [];
        _financialSubjects = arr.map(function(s, idx) {
          if (!s) return null;
          if (typeof s === 'string') {
            return {
              id: 's' + Math.random().toString(36).slice(2,9),
              name: s,
              highlightColor: PROJECT_HIGHLIGHT_PALETTE[idx % PROJECT_HIGHLIGHT_PALETTE.length].id
            };
          }
          return {
            id: s.id || ('s' + Math.random().toString(36).slice(2,9)),
            name: String(s.name || '').trim(),
            highlightColor: s.highlightColor || PROJECT_HIGHLIGHT_PALETTE[idx % PROJECT_HIGHLIGHT_PALETTE.length].id
          };
        }).filter(function(s){ return s && s.name; });
        // اطمینان از ذخیره رنگ برای پروژه‌های قدیمی
        var dirty = false;
        _financialSubjects.forEach(function(s, idx) {
          if (!s.highlightColor) {
            s.highlightColor = PROJECT_HIGHLIGHT_PALETTE[idx % PROJECT_HIGHLIGHT_PALETTE.length].id;
            dirty = true;
          }
        });
        if (dirty) saveFinancialSubjects();
      } catch (e) { _financialSubjects = []; }
      return _financialSubjects;
    }
    function saveFinancialSubjects() {
      return hkStorageSet(SUBJECTS_KEY, JSON.stringify(_financialSubjects || []));
    }
    function getSubjectById(id) {
      if (!id || id === 'personal') return { id: 'personal', name: 'شخصی' };
      var list = loadFinancialSubjects();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function openSubjectsModal() {
      try { closeSideMenu(); } catch (e) {}
      renderSubjectsList();
      var m = document.getElementById('subjectsModal');
      if (m) m.style.display = 'flex';
    }
    function closeSubjectsModal() {
      try { if (typeof closeAllAppMenus === 'function') closeAllAppMenus(); } catch (eM) {}
      var m = document.getElementById('subjectsModal');
      if (m) m.style.display = 'none';
    }
    function renderSubjectsList() {
      var box = document.getElementById('subjectsList');
      if (!box) return;
      var list = loadFinancialSubjects();
      if (!list.length) {
        box.innerHTML = '<div style="opacity:0.7;padding:12px;font-size:0.85rem;text-align:center;">پروژه‌ای ثبت نشده.</div>';
        return;
      }
      box.innerHTML = '';
      list.forEach(function(s) {
        var meta = getProjectHighlightMeta(s.highlightColor);
        var rep = { received: 0, totalExpense: 0 };
        try { rep = computeSubjectReport(s.id) || rep; } catch (eR) {}
        var deposits = Number(rep.received) || 0;
        var expenses = Number(rep.totalExpense != null ? rep.totalExpense : rep.totalCost) || 0;
        var net = deposits - expenses;

        var card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = s.id;
        card.style.setProperty('--proj-accent', meta.accent);
        card.style.setProperty('--proj-bg', meta.bg);

        var body = document.createElement('div');
        body.className = 'project-card-body';

        var name = document.createElement('div');
        name.className = 'project-card-name';
        name.textContent = s.name;
        body.appendChild(name);

        var status = document.createElement('div');
        status.className = 'project-card-status';
        if (net > 0) {
          status.classList.add('credit');
          status.textContent = formatNum(net) + ' تومان طلب دارد';
        } else if (net < 0) {
          status.classList.add('debt');
          status.textContent = formatNum(Math.abs(net)) + ' تومان بدهکار است';
        } else {
          status.textContent = 'تسویه';
        }
        body.appendChild(status);
        card.appendChild(body);

        var actions = document.createElement('div');
        actions.className = 'person-card-actions project-card-actions';

        var btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-del-row';
        btnDel.textContent = '×';
        btnDel.title = 'حذف';
        btnDel.onclick = function(e) { e.preventDefault(); e.stopPropagation(); deleteSubject(s.id); };

        var btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'btn-edit-title';
        btnEdit.title = 'ویرایش';
        btnEdit.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        btnEdit.onclick = function(e) { e.preventDefault(); e.stopPropagation(); renameSubject(s.id); };

        actions.appendChild(btnDel);
        actions.appendChild(btnEdit);
        card.appendChild(actions);

        card.onclick = function(e) {
          if (e.target.closest && (e.target.closest('.btn-edit-title') || e.target.closest('.btn-del-row') || e.target.closest('.subject-rename-input') || e.target.closest('.modal-btn') || e.target.closest('.project-rename-stack'))) return;
          openProjectReportModal(s.id);
        };

        box.appendChild(card);
      });
    }
    function addSubjectFromModal() {
      var inp = document.getElementById('subjectNewName');
      var name = (inp && inp.value || '').trim();
      if (!name) { showToast('نام پروژه را وارد کنید'); return; }
      var list = loadFinancialSubjects();
      if (list.some(function(s){ return s.name === name; })) { showToast('این پروژه قبلاً ثبت شده'); return; }
      list.push({
        id: 's' + Date.now(),
        name: name,
        highlightColor: nextProjectHighlightColor(list)
      });
      _financialSubjects = list;
      saveFinancialSubjects();
      if (inp) inp.value = '';
      renderSubjectsList();
      showToast('پروژه اضافه شد');
    }
    function renameSubject(id) {
      var s = getSubjectById(id);
      if (!s || s.id === 'personal') return;
      var box = document.getElementById('subjectsList');
      var modal = document.getElementById('subjectsModal');
      if (!box) return;
      var card = box.querySelector('.project-card[data-id="' + id + '"]') ||
                 box.querySelector('.subject-list-item[data-id="' + id + '"]');
      if (!card) return;
      if (card.querySelector('.subject-rename-input')) return;

      var body = card.querySelector('.project-card-body') || card;
      var nameEl = card.querySelector('.project-card-name');
      var acts = card.querySelector('.project-card-actions');
      var statusEl = card.querySelector('.project-card-status');

      if (modal) modal.classList.add('project-rename-active');
      box.classList.add('project-editing');
      card.classList.add('project-card-editing');
      if (acts) acts.style.display = 'none';
      if (nameEl) nameEl.style.display = 'none';
      if (statusEl) statusEl.style.display = 'none';

      var stack = document.createElement('div');
      stack.className = 'project-rename-stack';

      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'family-input subject-rename-input';
      inp.value = s.name;
      inp.dir = 'rtl';
      inp.setAttribute('placeholder', 'نام پروژه');

      var btns = document.createElement('div');
      btns.className = 'project-rename-btns';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'modal-btn primary';
      saveBtn.textContent = 'ثبت';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'modal-btn';
      cancelBtn.textContent = 'انصراف';

      function clearDim() {
        try {
          if (modal) modal.classList.remove('project-rename-active');
          box.classList.remove('project-editing');
          card.classList.remove('project-card-editing');
        } catch (e) {}
      }
      function finish() {
        try { stack.remove(); } catch (e) {}
        if (nameEl) nameEl.style.display = '';
        if (statusEl) statusEl.style.display = '';
        if (acts) acts.style.display = '';
        clearDim();
      }
      saveBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var n = (inp.value || '').trim();
        if (!n) { showToast('نام پروژه را وارد کنید'); return; }
        var list = loadFinancialSubjects();
        if (list.some(function(x){ return x.id !== id && x.name === n; })) {
          showToast('نام پروژه تکراری است');
          return;
        }
        list.forEach(function(x){ if (x.id === id) x.name = n; });
        _financialSubjects = list;
        saveFinancialSubjects();
        clearDim();
        renderSubjectsList();
        showToast('نام پروژه به‌روز شد');
      };
      cancelBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        finish();
      };
      inp.onclick = function(e) { e.stopPropagation(); };
      stack.onclick = function(e) { e.stopPropagation(); };
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
        if (e.key === 'Escape') { e.preventDefault(); finish(); }
      };

      btns.appendChild(saveBtn);
      btns.appendChild(cancelBtn);
      stack.appendChild(inp);
      stack.appendChild(btns);
      body.appendChild(stack);
      try { inp.focus(); caretToEnd(inp); } catch (eF) {}
    }
    /* ردیف‌های درآمد/مخارجِ یک پروژه در همهٔ ماه‌ها */
    function hkProjectRows(id) {
      var out = [], curK = periodKey(currentYear, currentMonth);
      iterAllPeriodData(function (pd, key) {
        if (key === curK && pd !== periodData) return; /* نسخهٔ آرشیوِ ماه جاری تکراری است */
        ['income', 'expense'].forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            (sec.rows || []).forEach(function (r) {
              var fc = r && r.financialContext;
              if (fc && fc.subjectId === id) out.push({ pd: pd, key: key, tab: tab, sec: sec, row: r });
            });
          });
        });
      });
      return out;
    }
    function hkRowSig(key, tab, r) { return [key, tab, r.day || '', r.desc || '', Number(r.amount) || 0, r.account || ''].join('|'); }
    /* حذف پروژه: «با ردیف‌ها» (ردیف‌ها همراه پروژه به سطل زباله می‌روند) یا «ردیف‌ها بمانند» (اتصال به پروژه برداشته می‌شود و ردیف معمولی می‌شوند) */
    function deleteSubject(id) {
      var s = getSubjectById(id);
      if (!s || s.id === 'personal') return;
      var rows = hkProjectRows(id);
      var n = rows.length;
      /* همان شکل پنجره‌های تأیید (سؤال بولد و وسط) */
      /* انصراف = بازگشت یا زدن بیرون باکس */
      var btns = n ? [{ v: 'all', t: 'حذف با ردیف‌ها', cls: 'danger' }, { v: 'keep', t: 'حذف بدون ردیف‌ها', cls: 'danger' }]
        : [{ v: 'keep', t: 'حذف', cls: 'danger' }];
      hkAsk3('پروژهٔ «' + (s.name || '') + '» حذف شود؟', btns, function (v) {
        if (v !== 'all' && v !== 'keep') return;
        var data = { sourceLabel: 'پروژه‌ها', subject: JSON.parse(JSON.stringify(s)) };
        if (v === 'all') {
          data.rows = rows.map(function (x) { return { key: x.key, tab: x.tab, secTitle: (x.sec.title || '').trim(), row: JSON.parse(JSON.stringify(x.row)) }; });
          rows.forEach(function (x) {
            var i = (x.sec.rows || []).indexOf(x.row);
            if (i >= 0) x.sec.rows.splice(i, 1);
            if (!x.sec.rows.length) x.sec.rows = [emptyRow(x.tab)];
          });
        } else if (n) {
          data.unlinked = rows.map(function (x) { return { sig: hkRowSig(x.key, x.tab, x.row), fc: JSON.parse(JSON.stringify(x.row.financialContext)), recv: !!x.row.createsReceivable }; });
          rows.forEach(function (x) { x.row.financialContext = defaultFinancialContext(); delete x.row.createsReceivable; x.row.updatedAt = Date.now(); });
        }
        try { pushToTrash('project', s.name || 'پروژه', data); } catch (eTr) {}
        _financialSubjects = loadFinancialSubjects().filter(function (x) { return x.id !== id; });
        saveFinancialSubjects();
        try { persistCurrent(); saveArchive(); scheduleSave(); } catch (eS) {}
        try { renderSubjectsList(); } catch (eR) {}
        try { renderAll(); renderHomeCards(); } catch (eA) {}
        showToast(v === 'all' && n ? 'پروژه و ردیف‌هایش حذف شد' : 'پروژه حذف شد');
      });
    }
    function defaultFinancialContext() {
      return {
        classification: 'personal',
        accountType: 'personal',
        ownerId: '',
        ownerName: '',
        subjectId: 'personal',
        subjectName: 'شخصی',
        fundingSource: 'personal',
        projectAmount: 0,
        personalAdvanceAmount: 0
      };
    }
    function rowFinancialContext(r) {
      if (r && r.financialContext && typeof r.financialContext === 'object') {
        var fc = r.financialContext;
        var acct = fc.accountType === 'project' || fc.classification === 'third_party' ? 'project' : 'personal';
        if (fc.subjectId && fc.subjectId !== 'personal' && fc.classification === 'third_party') acct = 'project';
        return {
          classification: fc.classification === 'third_party' ? 'third_party' : 'personal',
          accountType: acct,
          ownerId: fc.ownerId || '',
          ownerName: fc.ownerName || '',
          subjectId: fc.subjectId || 'personal',
          subjectName: fc.subjectName || 'شخصی',
          fundingSource: fc.fundingSource === 'subject' ? 'subject' : (fc.fundingSource === 'mixed' ? 'mixed' : 'personal'),
          projectAmount: Number(fc.projectAmount) || 0,
          personalAdvanceAmount: Number(fc.personalAdvanceAmount) || 0
        };
      }
      return defaultFinancialContext();
    }
    function isPersonalIncomeRow(r) {
      var fc = rowFinancialContext(r);
      return fc.classification !== 'third_party' && fc.accountType !== 'project';
    }
    /** گزینه‌های قسط قابل پرداخت برای UI */
    /* شناختن پرداخت قسط از روی یک برداشت: مبلغ (برابر یا کمی بیشتر به‌خاطر دیرکرد تا ۱۰٪، یا ±۲٪)، نزدیکی به سررسید،
       کلمه‌های «قسط/اقساط/تسهیلات/وام» و حسابی که قسط‌های قبلی همین وام از آن پرداخت شده.
       - پرداخت چند قسط با هم: مبلغ ≈ ۲ یا ۳ برابر قسط = همان تعداد قسطِ پرداخت‌نشدهٔ پشت‌سرهم (مثلاً تیر و مرداد با هم).
       - دو وامِ هم‌مبلغ و هم‌سررسید: جای هم عوض‌پذیرند؛ اولین وامِ پرداخت‌نشده انتخاب می‌شود (پیامک بعدی به وام دیگر می‌رسد).
       خروجی: { plan, idx, idxs, k, extra, due, late } یا null */
    /* تشخیص پرداخت قسط (قانون ساده):
       ۱) پیامک کلمهٔ «قسط/اقساط/تسهیلات/وام» دارد → مبلغ (±۵٪ از ۱، ۲ یا ۳ برابر مبلغ هر قسط) و تاریخ (تا ۲۰ روز از سررسید) کافی است.
       ۲) کلمه ندارد → تلرانس کوچک: مبلغ از ۱٪ کمتر تا ۳٪ بیشتر (دیرکرد)، تاریخ از ۵ روز قبل تا ۱۵ روز بعد از سررسید.
       ضریب‌ها: ۲ یا ۳ برابر = قسط‌های پشت‌سرهم تا سررسید همین پرداخت (مثلاً معوقهٔ مرداد + سررسید شهریور).
       نامزد: قسطی که هنوز به پیامکی وصل نشده (پرداخت‌نشده، یا «پرداخت‌شده»ِ دستی که opts.paidFree تأیید کند).
       از بین نامزدها محتمل‌ترین: مبلغ دقیق‌تر، بعد سررسید نزدیک‌تر، بعد ضریب کمتر، بعد همان بانکِ پرداخت قبلی. */
    function hkMatchInstallment(amount, j, raw, account, opts) {
      if (!HK_INSTALLMENTS_ON) return null;
      opts = opts || {};
      var free = function (p, i, paid) { return i >= paid || (typeof opts.paidFree === 'function' && opts.paidFree(p, i)); };
      amount = Math.round(Number(amount) || 0);
      if (!amount || !j || !j.y) return null;
      var gj = null; try { gj = persianToDate(j.y, j.m, j.d || 1); } catch (e0) {}
      if (!gj) return null;
      var kw = /(قسط|اقساط|تسهیلات|وام)/.test(String(raw || '').replace(/ي/g, 'ی'));
      var lo = kw ? 0.95 : 0.99, hi = kw ? 1.05 : 1.03, dMin = kw ? -20 : -5, dMax = kw ? 20 : 15;
      var dayDiff = function (p, i) {
        var due = null; try { due = dueDateForInstallment(p, i); } catch (e1) {}
        if (!due) return null;
        var gd = null; try { gd = persianToDate(due.y, due.m, due.d || 1); } catch (e2) {}
        return gd ? { due: due, dd: Math.round((gj.getTime() - gd.getTime()) / 86400000) } : null;
      };
      var cands = [];
      (plans || []).forEach(function (p, pOrder) {
        if (!p || p.deletedAt) return;
        var cnt = Math.max(0, parseInt(p.count, 10) || 0), pa = Math.round(planInstallmentAmount(p) || 0), paid = Math.max(0, parseInt(p.paidCount, 10) || 0);
        if (!cnt || !pa) return;
        var accSc = account && p.lastPayAccount && hkNormAcc(p.lastPayAccount) === hkNormAcc(account) ? 1 : 0;
        for (var k = 1; k <= 3; k++) {
          var tgt = pa * k;
          if (amount < tgt * lo || amount > tgt * hi + 1) continue;
          /* آخرین قسطِ این پرداخت: سررسیدش در بازهٔ تاریخ؛ قبلی‌ها قسط‌های پشت‌سرهمِ پیش از آن (معوقه) */
          for (var last = k - 1; last < cnt; last++) {
            var x = dayDiff(p, last); if (!x) continue;
            if (x.dd < dMin) break;
            if (x.dd > dMax) continue;
            var idxs = [], okRun = true;
            for (var q = last - k + 1; q <= last; q++) { if (!free(p, q, paid)) { okRun = false; break; } idxs.push(q); }
            if (!okRun) continue;
            cands.push({ plan: p, order: pOrder, idx: last, idxs: idxs, wasPaid: idxs.map(function (ii) { return ii < paid; }), k: k,
              err: Math.abs(amount - tgt) / tgt, dd: x.dd, due: x.due, pa: pa, extra: amount - tgt, acc: accSc });
          }
        }
      });
      if (!cands.length) return null;
      cands.sort(function (a, b) {
        /* پیش‌پرداختِ قسط بعدی کم‌احتمال‌تر از پرداختِ قسطِ سررسیدگذشته است (فاصلهٔ قبل از سررسید ۲٫۵ برابر حساب می‌شود) */
        var ea = a.dd < 0 ? -a.dd * 2.5 : a.dd, eb = b.dd < 0 ? -b.dd * 2.5 : b.dd;
        return (Math.round(a.err * 1000) - Math.round(b.err * 1000)) || (ea - eb) || (a.k - b.k) || (b.acc - a.acc) || (a.idx - b.idx) || (a.order - b.order);
      });
      var best = cands[0];
      best.kw = kw;
      /* دیرکرد: پرداخت در ماهی غیر از ماه سررسید */
      best.late = best.idxs.map(function (i) { var d = null; try { d = dueDateForInstallment(best.plan, i); } catch (e) {} return !!(d && (d.y * 100 + d.m) < (j.y * 100 + j.m)); });
      return best;
    }
    function listPayableInstallments() {
      var out = [];
      (plans || []).forEach(function(p) {
        if (!p) return;
        var count = Math.max(0, parseInt(p.count, 10) || 0);
        var paid = Math.min(count, Math.max(0, parseInt(p.paidCount, 10) || 0));
        // چند قسط باز + یک پیش‌پرداخت آینده
        var start = Math.max(0, paid - 2);
        for (var i = start; i < Math.min(count, paid + 3); i++) {
          if (i < paid) continue; // فقط پرداخت‌نشده‌ها برای انتخاب اصلی
          var due = null;
          try { due = dueDateForInstallment(p, i); } catch (e) {}
          var status = 'سررسید';
          var today = (typeof getTodayPersian === 'function') ? getTodayPersian() : { y: currentYear, m: currentMonth, d: 1 };
          if (due) {
            if (due.y < today.y || (due.y === today.y && due.m < today.m) || (due.y === today.y && due.m === today.m && due.d < today.d)) {
              status = 'معوق';
            } else if (due.y > today.y || (due.y === today.y && due.m > today.m)) {
              status = 'پیش‌پرداخت';
            }
          }
          out.push({
            planId: p.id,
            planIndex: i,
            name: p.name || 'قسط',
            amount: planInstallmentAmount(p) || 0,
            due: due,
            status: status,
            label: planInstallmentDesc(p, i, count) + (status === 'معوق' ? ' (معوق)' : (status === 'پیش‌پرداخت' ? ' (پیش‌پرداخت)' : ''))
          });
        }
        // معوق‌های پرداخت‌نشده قبل از paid هم (اگر paid عقب است - معمولاً paid نشان‌دهنده پرداخت‌شده است)
      });
      return out;
    }


    
    
    function iterAllPeriodData(cb) {
      try {
        if (periodData) cb(periodData, periodKey(currentYear, currentMonth));
      } catch (e0) {}
      try {
        Object.keys(archive || {}).forEach(function(k) {
          var pd = archive[k];
          if (pd && pd !== periodData) cb(pd, k);
        });
      } catch (e1) {}
    }
    function computeSubjectReport(subjectId) {
      subjectId = (subjectId || '').trim();
      if (!subjectId || subjectId === 'personal') {
        return { received: 0, spentSubject: 0, spentPersonal: 0, totalExpense: 0, balance: 0, receivable: 0, totalCost: 0, rows: [] };
      }
      var received = 0, spentSubject = 0, spentPersonal = 0, totalExpense = 0;
      var rows = [];
      var seen = Object.create(null);
      var curKey = periodKey(currentYear, currentMonth);
      iterAllPeriodData(function(pd, key) {
        // از شمارش دوبارهٔ ماه جاری (آرشیو + periodData) جلوگیری کن
        if (key === curKey && pd !== periodData) return;
        ['income', 'expense'].forEach(function(tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function(sec) {
            (sec.rows || []).forEach(function(r, ri) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              var fc = rowFinancialContext(r);
              if (fc.subjectId !== subjectId) return;
              if (fc.classification !== 'third_party' && fc.accountType !== 'project') return;
              // amount canonical تومان — بدون تبدیل مجدد
              var amt = Number(r.amount) || 0;
              if (!amt) return;
              var bank = (r.account || '').trim() || '—';
              var day = r.day || '';
              var desc = r.desc || '';
              var dedupe = tab + '|' + key + '|' + day + '|' + bank + '|' + amt + '|' + desc + '|' + (r.id || ri);
              if (seen[dedupe]) return;
              seen[dedupe] = true;
              if (tab === 'income') {
                received += amt;
                rows.push({ tab: tab, amt: amt, desc: desc, key: key, bank: bank, day: day, time: r.time || '' });
              } else {
                totalExpense += amt;
                var pAmt = Number(fc.projectAmount) || 0;
                var aAmt = Number(fc.personalAdvanceAmount) || 0;
                if (!pAmt && !aAmt) {
                  if (fc.fundingSource === 'subject') pAmt = amt;
                  else if (fc.fundingSource === 'personal') aAmt = amt;
                  else pAmt = amt;
                }
                if (pAmt + aAmt > amt && amt > 0) {
                  var scale = amt / (pAmt + aAmt);
                  pAmt = Math.round(pAmt * scale);
                  aAmt = amt - pAmt;
                }
                spentSubject += pAmt;
                spentPersonal += aAmt;
                // یک ردیف با مبلغ کامل تراکنش بانکی — نه دو ردیف allocation
                rows.push({ tab: tab, amt: amt, desc: desc, key: key, bank: bank, day: day, time: r.time || '' });
              }
            });
          });
        });
      });
      return {
        received: received,
        spentSubject: spentSubject,
        spentPersonal: spentPersonal,
        totalExpense: totalExpense,
        balance: received - spentSubject,
        receivable: spentPersonal,
        totalCost: totalExpense,
        rows: rows
      };
    }
    function refreshOpenProjectViews(preferSubjectId, opts) {
      opts = opts || {};
      try {
        var sm = document.getElementById('subjectsModal');
        if (sm && sm.style.display === 'flex') {
          renderSubjectsList();
        }
      } catch (e1) {}
      /* گزارش را فقط وقتی صریحاً خواسته شده رفرش کن (ثبت تراکنش) تا اسکرول نپرد */
      if (opts.report !== false) {
        try {
          var prm = document.getElementById('projectReportModal');
          if (prm && prm.style.display === 'flex') {
            var sid = preferSubjectId || prm.dataset.subjectId || '';
            if (sid && typeof openProjectReportModal === 'function') {
              openProjectReportModal(sid);
            }
          }
        } catch (e2) {}
      }
    }

    function openProjectReportModal(subjectId) {
      var sub = getSubjectById(subjectId);
      if (!sub || sub.id === 'personal') {
        showToast('یک پروژه انتخاب کنید');
        return;
      }
      // هنگام باز بودن گزارش، لیست پروژه‌ها زیر آن نباشد
      try {
        var sm = document.getElementById('subjectsModal');
        if (sm) sm.style.display = 'none';
      } catch (eS) {}

      var rep = computeSubjectReport(sub.id);
      var title = document.getElementById('projectReportTitle');
      if (title) title.textContent = 'پروژه ' + sub.name;
      var body = document.getElementById('projectReportBody');
      if (body) {
        var deposits = Number(rep.received) || 0;
        var expenses = Number(rep.totalExpense != null ? rep.totalExpense : rep.totalCost) || 0;
        var net = deposits - expenses;
        var statusHtml;
        if (net > 0) {
          statusHtml = '<div class="proj-status proj-status-credit">پروژه ' + escapeHtml(sub.name) + ' ' + formatNum(net) + ' تومان طلب دارد</div>';
        } else if (net < 0) {
          statusHtml = '<div class="proj-status proj-status-debt">پروژه ' + escapeHtml(sub.name) + ' ' + formatNum(Math.abs(net)) + ' تومان بدهکار است</div>';
        } else {
          statusHtml = '<div class="proj-status proj-status-even">پروژه ' + escapeHtml(sub.name) + ' تسویه است</div>';
        }

        function formatRowDate(key, day) {
          var y = '', m = '';
          var parts = String(key || '').split('-');
          if (parts.length >= 2) { y = parts[0]; m = parts[1]; }
          var mm = parseInt(toEnglishDigits(String(m)), 10) || 0;
          var dd = parseInt(toEnglishDigits(String(day || '')), 10) || 0;
          if (!y) return '—';
          var out = y + '/' + String(mm).padStart(2, '0');
          if (dd >= 1 && dd <= 31) out += '/' + String(dd).padStart(2, '0');
          return toPersianDigits(out);
        }

        function txTable(list, caption) {
          var h = '<div class="proj-table-wrap">';
          h += '<div class="proj-table-caption">' + escapeHtml(caption) + '</div>';
          h += '<div class="proj-table-scroll">';
          h += '<table class="proj-table"><thead><tr>' +
            '<th>تاریخ</th><th>شرح</th><th>مبلغ</th><th>حساب</th>' +
            '</tr></thead><tbody>';
          (list || []).forEach(function(r) {
            var fullDesc = r.desc || '—';
            h += '<tr>' +
              '<td class="proj-td-date">' + formatRowDate(r.key, r.day) + '</td>' +
              '<td class="proj-td-desc" data-full-desc="' + escapeHtml(fullDesc).replace(/"/g, '&quot;') + '">' +
                '<span class="proj-desc-text">' + escapeHtml(fullDesc) + '</span></td>' +
              '<td class="proj-td-amt" data-full-amt="' + escapeHtml(String(formatNum(r.amt))).replace(/"/g, '&quot;') + '">' + formatNum(r.amt) + '</td>' +
              '<td class="proj-td-bank">' + escapeHtml(r.bank || '—') + '</td>' +
              '</tr>';
          });
          h += '</tbody></table></div></div>';
          return h;
        }

        /* ۱.۳.۶۸: به ترتیب تاریخ (اول ماه به آخر ماه، ماه‌های قبل بالاتر)، مثل بقیهٔ جدول‌ها */
        var inRows = hkSortRowsByDate((rep.rows || []).filter(function(x){ return x.tab === 'income'; }));
        var outRows = hkSortRowsByDate((rep.rows || []).filter(function(x){ return x.tab === 'expense'; }));

        body.innerHTML =
          '<div class="proj-summary">' +
            '<div class="proj-report-row"><span>جمع واریزی</span><span class="val">' + formatNum(deposits) + ' تومان</span></div>' +
            '<div class="proj-report-row"><span>جمع مخارج</span><span class="val">' + formatNum(expenses) + ' تومان</span></div>' +
            statusHtml +
          '</div>' +
          txTable(inRows, 'واریزی‌ها') +
          txTable(outRows, 'مخارج');

        try {
          body.querySelectorAll('.proj-td-desc').forEach(function(td) {
            td.addEventListener('click', function(ev) {
              ev.preventDefault();
              ev.stopPropagation();
              var full = td.getAttribute('data-full-desc') || (td.textContent || '');
              if (typeof showCellTextPopup === 'function') showCellTextPopup(td, full);
            });
          });
          body.querySelectorAll('.proj-td-amt').forEach(function(td) {
            td.addEventListener('click', function(ev) {
              ev.preventDefault();
              ev.stopPropagation();
              var full = (td.getAttribute('data-full-amt') || td.textContent || '').trim();
              if (full && typeof showCellTextPopup === 'function') showCellTextPopup(td, full);
            });
          });
        } catch (eTap) {}
      }
      var m = document.getElementById('projectReportModal');
      if (m) {
        m.dataset.subjectId = sub.id;
        m.style.display = 'flex';
      }
    }
    function closeProjectReportModal(opts) {
      opts = opts || {};
      try { if (typeof closeAllAppMenus === 'function') closeAllAppMenus(); } catch (eM) {}
      var m = document.getElementById('projectReportModal');
      if (m) m.style.display = 'none';
      /* بستن گزارش → برگشت به لیست پروژه‌ها */
      if (!opts.skipProjects) {
        try { openSubjectsModal(); } catch (eO) {}
      }
    }


    function enhanceSmsConfirmProUI(parsed) {
      try {
        var meta = document.getElementById('smsConfirmMeta');
        if (!meta) return;
        var pro = isProfessionalMode();
        var typeEl = document.getElementById('smsConfirmType');
        var curType = (typeEl && typeEl.value) || (parsed && parsed.type) || 'expense';

        var oldSeg = document.getElementById('smsExpenseSeg');
        if (oldSeg) oldSeg.remove();
        var oldPlanPick = document.getElementById('smsPlanPickBlock');
        if (oldPlanPick) oldPlanPick.remove();
        var oldPro = document.getElementById('smsProBlock');
        if (oldPro) oldPro.remove();
        var oldToggle = document.getElementById('smsProDetailsToggle');
        if (oldToggle) oldToggle.remove();

        if (curType === 'expense' && HK_INSTALLMENTS_ON) {
          var seg = document.createElement('div');
          seg.id = 'smsExpenseSeg';
          seg.className = 'sms-seg';
          seg.innerHTML = '<button type="button" data-mode="expense" class="active">مخارج</button>' +
            '<button type="button" data-mode="installment">پرداخت قسط</button>';
          var typeSel = document.getElementById('smsConfirmType');
          if (typeSel && typeSel.parentNode) {
            typeSel.parentNode.insertBefore(seg, typeSel.nextSibling);
          } else {
            meta.insertBefore(seg, meta.firstChild);
          }
          var planBlock = document.createElement('div');
          planBlock.id = 'smsPlanPickBlock';
          planBlock.style.display = 'none';
          planBlock.className = 'sms-pro-block';
          planBlock.innerHTML = '<label class="family-label">انتخاب قسط</label>' +
            '<select id="smsPlanPick" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;margin-bottom:6px;"></select>' +
            '<div id="smsPlanPickMeta" style="font-size:0.78rem;opacity:0.8;line-height:1.5;"></div>';
          meta.appendChild(planBlock);
          var pick = document.getElementById('smsPlanPick');
          var items = listPayableInstallments();
          if (pick) {
            pick.innerHTML = '<option value="">— انتخاب قسط —</option>';
            items.forEach(function(it) {
              var o = document.createElement('option');
              o.value = it.planId + '|' + it.planIndex;
              o.textContent = it.label;
              o.dataset.amount = String(it.amount || 0);
              pick.appendChild(o);
            });
            if (!items.length) {
              var o2 = document.createElement('option');
              o2.value = '';
              o2.textContent = 'قسط قابل پرداختی نیست';
              pick.appendChild(o2);
            }
            pick.onchange = function() {
              var v = pick.value || '';
              var desc = document.getElementById('smsConfirmDesc');
              if (!v) {
                if (desc) {
                  desc.removeAttribute('data-plan-id');
                  desc.removeAttribute('data-plan-index');
                }
                var pm = document.getElementById('smsPlanPickMeta');
                if (pm) pm.textContent = '';
                return;
              }
              var parts = v.split('|');
              var pid = parts[0], pidx = parseInt(parts[1], 10);
              var it = items.find(function(x){ return x.planId === pid && x.planIndex === pidx; });
              if (desc) {
                desc.setAttribute('data-plan-id', pid);
                desc.setAttribute('data-plan-index', String(pidx));
                if (it) desc.value = it.label.replace(/\s*\(پیش‌پرداخت\)\s*$/, '');
              }
              var amtEl = document.getElementById('smsConfirmAmount');
              if (amtEl && it && it.amount && !(parseAmount(amtEl.value) > 0)) {
                amtEl.value = formatNum(it.amount);
              }
              var pm = document.getElementById('smsPlanPickMeta');
              if (pm && it) {
                var dueTxt = '';
                if (it.due) dueTxt = 'سررسید: ' + toPersianDigits(it.due.d) + '/' + toPersianDigits(it.due.m) + '/' + toPersianDigits(it.due.y);
                pm.textContent = (it.status || '') + (dueTxt ? ' — ' + dueTxt : '');
              }
            };
            try { if (typeof enhanceSelectFont === 'function') enhanceSelectFont(pick); } catch (eFs) {}
          }
          seg.querySelectorAll('button').forEach(function(btn) {
            btn.onclick = function() {
              seg.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
              btn.classList.add('active');
              var mode = btn.getAttribute('data-mode');
              planBlock.style.display = mode === 'installment' ? 'block' : 'none';
              var desc = document.getElementById('smsConfirmDesc');
              if (mode !== 'installment' && desc) {
                desc.removeAttribute('data-plan-id');
                desc.removeAttribute('data-plan-index');
                desc.removeAttribute('data-plan-batch');
              }
            };
          });
          /* پیامکی که با کلمهٔ «قسط» شناسایی شده → پیش‌فرض تب «پرداخت قسط» (و اگر قسطی با همین مبلغ هست، همان انتخاب شود) */
          try {
            /* قسط به‌روشنی جور است (مبلغ برابر یا با دیرکرد، نزدیک سررسید، …) → خودکار «پرداخت قسط» با همان قسط */
            var _mt = parsed ? hkMatchInstallment(parsed.amount, { y: parseInt(parsed.year, 10) || getTodayPersian().y, m: parseInt(parsed.month, 10) || getTodayPersian().m, d: parseInt(parsed.day, 10) || getTodayPersian().d }, parsed.raw, parsed.bank) : null;
            var _ib = seg.querySelector('button[data-mode="installment"]');
            if (_mt) {
              if (_ib) _ib.click();
              var _v = _mt.plan.id + '|' + _mt.idxs[0];
              if (pick && [].some.call(pick.options, function (o) { return o.value === _v; })) { pick.value = _v; pick.onchange(); }
              var _pm = document.getElementById('smsPlanPickMeta');
              if (_pm) _pm.textContent = _mt.k > 1
                ? 'به نظر پرداخت ' + toPersianDigits(String(_mt.k)) + ' قسط با هم است: ' + _mt.idxs.map(function (ii) { return planInstallmentDesc(_mt.plan, ii, parseInt(_mt.plan.count, 10) || 0); }).join(' و ')
                : 'قسط شناخته شد: ' + planInstallmentDesc(_mt.plan, _mt.idx, parseInt(_mt.plan.count, 10) || 0) + ' — ' + formatNum(Number(_mt.plan.amount) || 0) + (_mt.extra > 0 ? ' + ' + formatNum(_mt.extra) + ' دیرکرد' : '');
            } else if (parsed && parsed.raw && /قسط/.test(String(parsed.raw))) {
              if (_ib) _ib.click();
            }
          } catch (eQs) {}
        }

        /* حساب: شخصی | پروژه — همیشه زیر بخش مقصد (بدون «جزئیات حرفه‌ای») */
        {
          var block = document.createElement('div');
          block.id = 'smsProBlock';
          block.className = 'sms-pro-block';
          block.style.display = 'block';
          block.innerHTML =
            '<label class="family-label">حساب</label>' +
            '<div class="sms-seg sms-acct-seg" id="smsAccountTypeSeg" role="group" aria-label="نوع حساب">' +
            '<button type="button" data-acct="personal" class="active">شخصی</button>' +
            '<button type="button" data-acct="project">پروژه</button>' +
            '</div>' +
            '<input type="hidden" id="smsAccountTypeSel" value="personal" />' +
            '<div id="smsProjectPickWrap" style="display:none;margin-top:8px;">' +
            '<label class="family-label">پروژه</label>' +
            '<select id="smsSubjectSel" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-weight:600;"></select>' +
            '</div>';
          meta.appendChild(block);

          var acctSel = document.getElementById('smsAccountTypeSel');
          var acctSeg = document.getElementById('smsAccountTypeSeg');
          var projWrap = document.getElementById('smsProjectPickWrap');
          var sel = document.getElementById('smsSubjectSel');
          function fillProjectOptions() {
            if (!sel) return;
            sel.innerHTML = '';
            var subjects = (typeof loadFinancialSubjects === 'function' ? loadFinancialSubjects() : []).filter(function(s) {
              return s && s.id && s.id !== 'personal';
            });
            if (!subjects.length) {
              var o0 = document.createElement('option');
              o0.value = '';
              o0.textContent = 'پروژه‌ای تعریف نشده';
              sel.appendChild(o0);
            } else {
              subjects.forEach(function(s) {
                var o = document.createElement('option');
                o.value = s.id;
                o.textContent = s.name;
                sel.appendChild(o);
              });
            }
            if (sel._fancyRender) {
              try { sel._fancyRender(); } catch (eR) {}
            }
          }
          function setProjectVisible(on) {
            if (!projWrap) return;
            if (on) {
              projWrap.classList.add('sms-proj-visible');
              projWrap.style.display = 'block';
              projWrap.removeAttribute('hidden');
              fillProjectOptions();
              /* فقط وقتی پروژه انتخاب شد منوی کشویی ساخته شود */
              if (sel && typeof enhanceSelectFont === 'function' && !sel._fancyRender) {
                try { enhanceSelectFont(sel); } catch (eS) {}
              }
              if (sel && sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) {
                sel.parentNode.style.display = '';
              }
              /* ۱.۳.۵۰: فیلد پروژه حتماً دیده شود (حتی با پیوست): باکس تا خودِ فیلد اسکرول می‌شود */
              setTimeout(function () { try { projWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (eV) {} }, 80);
            } else {
              projWrap.classList.remove('sms-proj-visible');
              projWrap.style.display = 'none';
              projWrap.setAttribute('hidden', 'hidden');
              if (sel && sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) {
                sel.parentNode.style.display = 'none';
              }
              /* بستن لیست باز احتمالی */
              try {
                document.querySelectorAll('.fancy-select-list.open').forEach(function(l) {
                  if (l._select === sel) l.classList.remove('open');
                });
              } catch (eC) {}
            }
          }
          function syncAcctUI() {
            var isProj = !!(acctSel && acctSel.value === 'project');
            if (acctSeg) {
              acctSeg.querySelectorAll('button').forEach(function(btn) {
                var on = btn.getAttribute('data-acct') === (acctSel ? acctSel.value : 'personal');
                btn.classList.toggle('active', on);
              });
            }
            setProjectVisible(isProj);
          }
          if (acctSeg) {
            acctSeg.querySelectorAll('button').forEach(function(btn) {
              btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var v = btn.getAttribute('data-acct') || 'personal';
                if (acctSel) acctSel.value = v;
                syncAcctUI();
              };
            });
          }
          if (acctSel) {
            acctSel.value = 'personal';
            acctSel.onchange = syncAcctUI;
          }
          /* دیفالت: شخصی — هیچ منوی پروژه‌ای نباشد */
          setProjectVisible(false);
          syncAcctUI();
        }

        if (typeEl && !typeEl._proBound) {
          typeEl._proBound = true;
          typeEl.addEventListener('change', function() {
            enhanceSmsConfirmProUI({ type: typeEl.value });
          });
        }
      } catch (e) { try { console.warn(e); } catch (e2) {} }
    }

    
    function readSmsFinancialContext(type) {
      var fc = defaultFinancialContext();
      var acctEl = document.getElementById('smsAccountTypeSel');
      var acct = (acctEl && acctEl.value === 'project') ? 'project' : 'personal';
      // سازگاری با UI قبلی (chips)
      if (!acctEl) {
        var active = document.querySelector('#smsIncomeClassRow .sms-chip.active');
        if (active && active.getAttribute('data-val') === 'third_party') acct = 'project';
        var selLegacy = document.getElementById('smsSubjectSel');
        if (selLegacy && selLegacy.value && selLegacy.value !== 'personal') acct = 'project';
      }
      fc.accountType = acct;
      if (acct !== 'project') return fc;
      var sel = document.getElementById('smsSubjectSel');
      var sid = sel ? (sel.value || '') : '';
      if (!sid || sid === 'personal') {
        // پروژه انتخاب نشده — شخصی بماند
        fc.accountType = 'personal';
        return fc;
      }
      var sub = getSubjectById(sid);
      fc.classification = 'third_party';
      fc.subjectId = sid;
      fc.subjectName = sub ? sub.name : '';
      fc.ownerName = fc.subjectName;
      if (type === 'income') {
        fc.fundingSource = 'subject';
        fc.projectAmount = 0;
        fc.personalAdvanceAmount = 0;
      } else {
        // تخصیص خودکار در confirmSmsEntry بعد از دانستن مبلغ انجام می‌شود
        fc.fundingSource = 'subject';
      }
      return fc;
    }

    /** موجودی فعلی پروژه = دریافتی‌های پروژه − هزینه‌های پرداخت‌شده از موجودی پروژه */
    
    /**
     * موجودی پروژه که الان روی کارت‌های مشخص‌شده نشسته است
     * (واریز پروژه − مخارج از محل پروژه روی همان حساب‌ها)
     * طلب/بدهیِ پرداخت‌نشده را حساب نمی‌کند.
     */
    
    /** آیا پروژه روی حداقل یکی از حساب‌های داده‌شده تراکنش دارد؟ */
    /* ۱.۳.۵۴: «<=1405-7» = همهٔ ماه‌ها تا همان ماه (بدهی/طلب و موجودی پروژه با ماه بعد از بین نمی‌رود) */
    function hkKeyIn(key, onlyKey) {
      if (String(onlyKey).indexOf('<=') !== 0) return key === onlyKey;
      var n = function (k) { var p = String(k).split('-'); return (parseInt(p[0], 10) || 0) * 100 + (parseInt(p[1], 10) || 0); };
      return n(key) <= n(String(onlyKey).slice(2));
    }
    function projectTouchesAccounts(subjectId, accountSet, onlyKey) {
      subjectId = (subjectId || '').trim();
      if (!subjectId || subjectId === 'personal') return false;
      if (!accountSet || typeof accountSet.has !== 'function' || accountSet.size === 0) return false;
      var seen = false;
      var curKey = (typeof periodKey === 'function' && typeof currentYear !== 'undefined')
        ? periodKey(currentYear, currentMonth) : '';
      if (typeof iterAllPeriodData !== 'function') return false;
      try {
        iterAllPeriodData(function(pd, key) {
          if (seen) return;
          if (key === curKey && pd !== periodData) return;
          if (onlyKey && !hkKeyIn(key, onlyKey)) return;   /* یک ماه، یا «<=ماه» = از ابتدا تا همان ماه */
          ['income', 'expense'].forEach(function(tab) {
            if (seen) return;
            ((pd[tab] && pd[tab].sections) || []).forEach(function(sec) {
              if (seen) return;
              (sec.rows || []).forEach(function(r) {
                if (seen) return;
                if (!r || (r.status || 'paid') !== 'paid') return;
                var fc = (typeof rowFinancialContext === 'function') ? rowFinancialContext(r) : null;
                if (!fc || fc.subjectId !== subjectId) return;
                if (fc.classification !== 'third_party' && fc.accountType !== 'project') return;
                var bank = (r.account || '').trim() || 'بدون حساب';
                if (accountSet.has(bank)) seen = true;
              });
            });
          });
        });
      } catch (e) {}
      return seen;
    }

function projectMoneyOnAccounts(subjectId, accountSet, onlyKey) {
      subjectId = (subjectId || '').trim();
      if (!subjectId || subjectId === 'personal') return 0;
      if (!accountSet || typeof accountSet.has !== 'function') return 0;
      var total = 0;
      var seen = Object.create(null);
      var curKey = (typeof periodKey === 'function' && typeof currentYear !== 'undefined')
        ? periodKey(currentYear, currentMonth) : '';
      if (typeof iterAllPeriodData !== 'function') return 0;
      iterAllPeriodData(function(pd, key) {
        if (key === curKey && pd !== periodData) return;
          if (onlyKey && !hkKeyIn(key, onlyKey)) return;   /* یک ماه، یا «<=ماه» = از ابتدا تا همان ماه */
        ['income', 'expense'].forEach(function(tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function(sec) {
            (sec.rows || []).forEach(function(r, ri) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              var fc = (typeof rowFinancialContext === 'function') ? rowFinancialContext(r) : null;
              if (!fc) return;
              if (fc.subjectId !== subjectId) return;
              if (fc.classification !== 'third_party' && fc.accountType !== 'project') return;
              var bank = (r.account || '').trim() || 'بدون حساب';
              if (!accountSet.has(bank)) return;
              var amt = Number(r.amount) || 0;
              if (!amt) return;
              var dedupe = tab + '|' + key + '|' + (r.day || '') + '|' + bank + '|' + amt + '|' + (r.desc || '') + '|' + (r.id || ri);
              if (seen[dedupe]) return;
              seen[dedupe] = true;
              if (tab === 'income') {
                total += amt;
              } else {
                var pAmt = Number(fc.projectAmount) || 0;
                var aAmt = Number(fc.personalAdvanceAmount) || 0;
                if (!pAmt && !aAmt) {
                  if (fc.fundingSource === 'subject') pAmt = amt;
                  else if (fc.fundingSource === 'personal') pAmt = 0;
                  else pAmt = amt;
                }
                if (pAmt + aAmt > amt && amt > 0) {
                  var scale = amt / (pAmt + aAmt);
                  pAmt = Math.round(pAmt * scale);
                }
                total -= pAmt;
              }
            });
          });
        });
      });
      return total;
    }

function getProjectBalance(subjectId) {
      var rep = computeSubjectReport(subjectId);
      return Number(rep && rep.balance) || 0;
    }

    /** تخصیص خودکار مخارج پروژه نسبت به موجودی */
    /** طلب پروژه از کاربر (مخارج شخصی برای پروژه) فقط روی حساب‌های مشخص‌شده */
    function projectReceivableOnAccounts(subjectId, accountSet, onlyKey) {
      subjectId = (subjectId || '').trim();
      if (!subjectId || subjectId === 'personal') return 0;
      if (!accountSet || typeof accountSet.has !== 'function') return 0;
      var total = 0;
      var seen = Object.create(null);
      var curKey = (typeof periodKey === 'function' && typeof currentYear !== 'undefined')
        ? periodKey(currentYear, currentMonth) : '';
      if (typeof iterAllPeriodData !== 'function') return 0;
      try {
        iterAllPeriodData(function(pd, key) {
          if (key === curKey && pd !== periodData) return;
          if (onlyKey && !hkKeyIn(key, onlyKey)) return;   /* یک ماه، یا «<=ماه» = از ابتدا تا همان ماه */
          ((pd.expense && pd.expense.sections) || []).forEach(function(sec) {
            (sec.rows || []).forEach(function(r, ri) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              var fc = (typeof rowFinancialContext === 'function') ? rowFinancialContext(r) : null;
              if (!fc) return;
              if (fc.subjectId !== subjectId) return;
              if (fc.classification !== 'third_party' && fc.accountType !== 'project') return;
              var bank = (r.account || '').trim() || 'بدون حساب';
              if (!accountSet.has(bank)) return;
              var amt = Number(r.amount) || 0;
              if (!amt) return;
              var pAmt = Number(fc.projectAmount) || 0;
              var aAmt = Number(fc.personalAdvanceAmount) || 0;
              if (!pAmt && !aAmt) {
                if (fc.fundingSource === 'subject') pAmt = amt;
                else if (fc.fundingSource === 'personal') aAmt = amt;
                else aAmt = 0;
              }
              if (pAmt + aAmt > amt && amt > 0) {
                var scale = amt / (pAmt + aAmt);
                pAmt = Math.round(pAmt * scale);
                aAmt = amt - pAmt;
              }
              if (!aAmt) return;
              var dedupe = key + '|' + (r.day || '') + '|' + bank + '|' + amt + '|' + (r.desc || '') + '|' + (r.id || ri);
              if (seen[dedupe]) return;
              seen[dedupe] = true;
              total += aAmt;
            });
          });
        });
      } catch (e) {}
      return total;
    }


    function allocateProjectExpense(subjectId, amount) {
      amount = Math.max(0, Number(amount) || 0);
      var bal = Math.max(0, getProjectBalance(subjectId));
      var fromProject = Math.min(bal, amount);
      var fromPersonal = amount - fromProject;
      return {
        projectAmount: fromProject,
        personalAdvanceAmount: fromPersonal,
        fundingSource: fromPersonal > 0 && fromProject > 0 ? 'mixed' : (fromProject > 0 ? 'subject' : 'personal')
      };
    }


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

    
    
    function removeCarriedInstallmentRows(planId, planIndex, afterY, afterM) {
      planIndex = parseInt(planIndex, 10);
      afterY = afterY != null ? parseInt(afterY, 10) : null;
      afterM = afterM != null ? parseInt(afterM, 10) : null;
      function periodAfter(y, m) {
        if (afterY == null || afterM == null) return true;
        y = parseInt(y, 10); m = parseInt(m, 10);
        return (y > afterY) || (y === afterY && m > afterM);
      }
      function scrub(pd) {
        if (!pd || !pd.expense || !pd.expense.sections) return;
        pd.expense.sections.forEach(function(s) {
          if (!s.rows) return;
          s.rows = s.rows.filter(function(r) {
            if (!r || r.fromPlanId !== planId) return true;
            if (parseInt(r.fromPlanIndex, 10) !== planIndex) return true;
            if (r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0)) return false;
            return true;
          });
          if (!s.rows.length) s.rows = [emptyRow()];
        });
      }
      try {
        if (afterY == null || periodAfter(currentYear, currentMonth)) scrub(periodData);
      } catch (e0) {}
      try {
        Object.keys(archive || {}).forEach(function(k) {
          if (!archive[k]) return;
          var parts = String(k).split('-');
          var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
          if (afterY == null || periodAfter(y, m)) scrub(archive[k]);
        });
      } catch (e1) {}
    }


    function getWritablePeriodData(y, m) {
      y = parseInt(y, 10) || currentYear;
      m = parseInt(m, 10) || currentMonth;
      if (y === currentYear && m === currentMonth) return { data: periodData, isCurrent: true };
      if (!archive || typeof archive !== 'object') archive = {};
      const key = periodKey(y, m);
      let data = archive[key];
      if (!data) data = emptyPeriodData();
      else {
        try { data = JSON.parse(JSON.stringify(data)); } catch (e) { data = emptyPeriodData(); }
      }
      if (!data.expense) data.expense = { sections: [], nextId: 1 };
      if (!data.income) data.income = { sections: [], nextId: 1 };
      if (!data.expense.sections) data.expense.sections = [];
      if (!data.income.sections) data.income.sections = [];
      return { data: data, isCurrent: false, key: key };
    }
    function commitWritablePeriodData(ctx) {
      if (!ctx) return;
      if (ctx.isCurrent) {
        try { persistCurrent(); } catch (e) {}
      } else if (ctx.key) {
        archive[ctx.key] = ctx.data;
        try { if (typeof saveArchive === 'function') saveArchive(); } catch (e) {}
      }
    }

function confirmSmsEntry() {
      try {
      if (!pendingSmsEntry) {
        showToast('اطلاعات تراکنش ناقص است');
        return;
      }
      const typeEl = document.getElementById('smsConfirmType');
      const amtEl = document.getElementById('smsConfirmAmount');
      const bankEl = document.getElementById('smsConfirmBank');
      const dayEl = document.getElementById('smsConfirmDay');
      const type = (typeEl && typeEl.value === 'income') ? 'income' : 'expense';
      const amount = parseAmount(amtEl ? amtEl.value : pendingSmsEntry.amount);
      if (!amount) { showToast('مبلغ را وارد کنید'); return; }
      let bank = (bankEl && bankEl.value) ? String(bankEl.value).trim() : '';
      const _accLabels = (typeof selectedAccountLabels === 'function') ? selectedAccountLabels() : [];
      if (bank && _accLabels.indexOf(bank) < 0) {
        bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(bank) || '') : '';
      }
      if (!bank && pendingSmsEntry && pendingSmsEntry.bank) {
        bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(pendingSmsEntry.bank) || '') : '';
      }
      if (bank && pendingSmsEntry && pendingSmsEntry.raw) { try { saveSmsBankPref(pendingSmsEntry.raw, bank); } catch (e) {} }
      let day = '';
      if (dayEl && dayEl.value) {
        const d = parseInt(toEnglishDigits(dayEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (d >= 1 && d <= 31) day = String(d);
      } else if (pendingSmsEntry.day) day = pendingSmsEntry.day;

      const monthEl = document.getElementById('smsConfirmMonth');
      const yearEl = document.getElementById('smsConfirmYear');
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      if (monthEl && monthEl.value) {
        const mm = parseInt(toEnglishDigits(monthEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (mm >= 1 && mm <= 12) targetMonth = mm;
      } else if (pendingSmsEntry && pendingSmsEntry.month) {
        targetMonth = pendingSmsEntry.month;
      }
      if (yearEl && yearEl.value) {
        let yy = parseInt(toEnglishDigits(yearEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (yy > 0 && yy < 100) {
          const base = Math.floor((currentYear || 1400) / 100) * 100;
          yy = base + yy;
        }
        if (yy >= 1300 && yy <= 1500) targetYear = yy;
      } else if (pendingSmsEntry && pendingSmsEntry.year) {
        targetYear = pendingSmsEntry.year;
      }
      /* واریز مربوط به درآمد ثابت: همان ردیف «دریافت نشده» پر می‌شود و ردیف تازه ساخته نمی‌شود */
      try {
        var _recSel = document.getElementById('smsRecMatchSel');
        if (type === 'income' && _recSel && _recSel.value &&
            recApplySmsMatch(_recSel.value, { amount: amount, bank: bank, day: day, y: targetYear, m: targetMonth, raw: pendingSmsEntry && pendingSmsEntry.raw, desc: ((document.getElementById('smsConfirmDesc') || {}).value || '').trim() })) return;
      } catch (eRecMatch) {}
      const periodCtx = getWritablePeriodData(targetYear, targetMonth);
      const targetPd = periodCtx.data;

      const tab = type;
      const descInp = document.getElementById('smsConfirmDesc');
      let desc = ((descInp && descInp.value) || '').trim() || (type === 'income' ? 'واریز بانکی' : 'برداشت بانکی');
      /* تشخیص تکرار پیش از ثبت: همین مبلغ (±۱٪) در همان روز/روز مجاور و همان حساب قبلاً (دستی یا پیامکی) ثبت شده؟
         کاربر تصمیم می‌گیرد؛ چیزی خودکار دوباره ثبت نمی‌شود */
      try {
        var _pbAttr = descInp ? (descInp.getAttribute('data-plan-batch') || '') : '';
        var _isPlanPay = !!(descInp && descInp.getAttribute('data-plan-id')) || (_pbAttr && _pbAttr !== '[]');
        if (!window._smsDupBypass && !_isPlanPay) {
          var _dupHit = HKAlerts.findSimilarBeforeSave(targetPd, tab, amount, day, bank, desc);
          if (_dupHit) {
            var _dupYes = function () { window._smsDupBypass = true; try { confirmSmsEntry(); } finally { window._smsDupBypass = false; } };
            /* ۱.۳.۶۴: دو تراکنش زیر هم برای مقایسه (پیامک تازه / ثبت قبلی)؛ تفاوت‌ها پررنگ */
            try {
              hkAskDupCompare({ type: tab, amount: amount, day: day, y: targetYear, m: targetMonth, account: bank, raw: pendingSmsEntry && pendingSmsEntry.raw, at: pendingSmsEntry && pendingSmsEntry.receivedAt }, _dupHit, _dupYes);
            } catch (eDc) {
              askConfirm('احتمال ثبت تکراری: تراکنش «' + (_dupHit.row.desc || '—') + '» با مبلغ ' + formatNum(amount) + ' تومان' +
                (_dupHit.row.day ? ' (روز ' + toPersianDigits(_dupHit.row.day) + ')' : '') + ' قبلاً ثبت شده. باز هم ثبت شود؟', _dupYes);
            }
            return;
          }
        }
      } catch (eDupChk) {}
      const planIdLink = HK_INSTALLMENTS_ON && descInp && descInp.getAttribute('data-plan-id');
      const planIdxLink = descInp && descInp.getAttribute('data-plan-index');
      let batchItems = [];
      try {
        batchItems = JSON.parse((descInp && descInp.getAttribute('data-plan-batch')) || '[]') || [];
        if (!Array.isArray(batchItems)) batchItems = [];
        if (!HK_INSTALLMENTS_ON) batchItems = [];
      } catch (eBat) { batchItems = []; }
      let linkedPlan = null;
      let linkedIdx = -1;
      if (planIdLink && tab === 'expense' && !batchItems.length) {
        linkedPlan = (plans || []).find(function(p){ return p && p.id === planIdLink; }) || null;
        if (linkedPlan) {
          linkedIdx = (planIdxLink != null && planIdxLink !== '')
            ? parseInt(planIdxLink, 10)
            : earliestUnpaidPlanIndex(linkedPlan);
          if (isNaN(linkedIdx)) linkedIdx = -1;
        }
      }

      const sel = document.getElementById('smsConfirmSectionSel');
      let sec = null;
      let secTitleWanted = '';
      if (sel && sel.value && sel.value !== '__auto__') {
        /* اول در ماه هدف با id */
        sec = (targetPd[tab] && targetPd[tab].sections || []).find(function(s){ return s.id === sel.value; });
        /* اگر ماه هدف بخش با این id ندارد (آرشیو)، با عنوان گزینه پیدا/بساز */
        if (!sec) {
          try {
            var opt = sel.options[sel.selectedIndex];
            secTitleWanted = opt ? String(opt.textContent || '').trim() : '';
          } catch (eO) { secTitleWanted = ''; }
          if (secTitleWanted) {
            sec = (targetPd[tab] && targetPd[tab].sections || []).find(function(s){
              return (s.title || '').trim() === secTitleWanted;
            });
            if (!sec) {
              sec = ensureSmsSection(tab, secTitleWanted, targetPd);
            }
          }
        } else {
          secTitleWanted = (sec.title || '').trim();
        }
      }
      if (!sec) {
        sec = ensureSmsSection(tab, tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی', targetPd);
      }
      if (!sec) {
        showToast('بخش مقصد مشخص نیست. یک کاربر/بخش انتخاب کنید');
        return;
      }
      if (!targetPd[tab]) {
        showToast('خطا در داده‌ی ماه هدف');
        return;
      }
      if (!Array.isArray(sec.rows)) sec.rows = [];
      /* مطمئن شو sec داخل targetPd است */
      if (!(targetPd[tab].sections || []).some(function(s){ return s === sec || s.id === sec.id; })) {
        targetPd[tab].sections.push(sec);
      }

      /* ترجیح: حساب از لیست کاربر — حساب جدید خودکار نساز */
      if (bank && pendingSmsEntry.raw) {
        try {
          const acc = extractAccountFromSms(pendingSmsEntry.raw);
          if (acc && smsAccountBankMap[acc] !== bank) {
            smsAccountBankMap[acc] = bank;
            saveSmsAccountBankMap();
          }
        } catch (eMap) {}
      }

      if (batchItems.length && tab === 'expense') {
        /* پرداخت دسته‌ای اقساط — مبلغ تراکنش ÷ تعداد تیک‌خورده */
        var batchOk = 0;
        var validBatch = [];
        batchItems.forEach(function(bi) {
          if (!bi || !bi.id) return;
          var bp0 = (plans || []).find(function(p){ return p && p.id === bi.id; });
          if (!bp0) return;
          var bIdx0 = parseInt(bi.index, 10);
          if (isNaN(bIdx0) || bIdx0 < 0) return;
          validBatch.push({ bi: bi, bp: bp0, bIdx: bIdx0 });
        });
        var nSplit = validBatch.length || 1;
        var totalAmt = Number(amount) || 0;
        var baseShare = Math.floor(totalAmt / nSplit);
        var remShare = totalAmt - baseShare * nSplit;
        validBatch.forEach(function(item, iSplit) {
          var bi = item.bi;
          var bp = item.bp;
          var bIdx = item.bIdx;
          var bCnt = Math.max(0, parseInt(bp.count, 10) || 0);
          /* سهم مساوی؛ باقی‌مانده تقسیم به اولین قسط */
          var bAmt = baseShare + (iSplit === 0 ? remShare : 0);
          if (!bAmt && totalAmt) bAmt = totalAmt;
          var bDesc = planInstallmentDesc(bp, bIdx, bCnt);
          var dueB = null;
          try { dueB = dueDateForInstallment(bp, bIdx); } catch (eD) {}
          var isMoavaghB = dueB && ((dueB.y < targetYear) || (dueB.y === targetYear && dueB.m < targetMonth));
          var isFutureDue = dueB && ((dueB.y > targetYear) || (dueB.y === targetYear && dueB.m > targetMonth));
          /* همه در ماه/تاریخ تراکنش ثبت شوند — از جمله پیش‌پرداخت */
          var tRow = null, tSec = sec;
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (!(r && r.fromPlanId === bp.id && parseInt(r.fromPlanIndex, 10) === bIdx)) return;
              if (isFutureDue || r.planEarlyPay) {
                if (r.planEarlyPay || !tRow) { tRow = r; tSec = s; }
              } else if (isMoavaghB) {
                if (r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0)) { tRow = r; tSec = s; }
                else if (!tRow) { tRow = r; tSec = s; }
              } else {
                if (!r.planCarried) { tRow = r; tSec = s; }
                else if (!tRow) { tRow = r; tSec = s; }
              }
            });
          });
          if (!tRow && !isFutureDue) {
            try { syncPlansToExpensePeriod(targetPd, targetYear, targetMonth); } catch (eSy) {}
            (targetPd.expense.sections || []).forEach(function(s) {
              (s.rows || []).forEach(function(r) {
                if (r && r.fromPlanId === bp.id && parseInt(r.fromPlanIndex, 10) === bIdx && !tRow) {
                  tRow = r; tSec = s;
                }
              });
            });
          }
          if (!tRow) {
            tRow = emptyRow();
            tRow.fromPlanId = bp.id;
            tRow.fromPlanIndex = bIdx;
            if (!tSec) tSec = sec;
            if (!tSec.rows) tSec.rows = [];
            var ei = tSec.rows.findIndex(function(r){ return r && !r.desc && !r.amount && !r.day && !r.fromPlanId; });
            if (ei >= 0) tSec.rows[ei] = tRow;
            else tSec.rows.push(tRow);
          }
          tRow.status = 'paid';
          tRow.amount = bAmt;
          if (day) tRow.day = day;
          else if (dueB && !isFutureDue && !isMoavaghB) tRow.day = String(dueB.d);
          if (bank) tRow.account = bank;
          if (isFutureDue) {
            tRow.desc = bDesc + ' (پیش‌پرداخت)';
            tRow.planEarlyPay = true;
            tRow.planCarried = false;
            if (!bp.paidEarlyMap) bp.paidEarlyMap = {};
            bp.paidEarlyMap[String(bIdx)] = {
              y: targetYear, m: targetMonth,
              amount: bAmt, day: day || '', account: bank || ''
            };
            /* پیش‌پرداخت: paidCount بالا نرود تا ماه سررسید پرداخت‌نشده بماند */
          } else {
            tRow.desc = bDesc + (isMoavaghB ? ' (معوق)' : '');
            tRow.planCarried = !!isMoavaghB;
            tRow.planEarlyPay = false;
            if (isMoavaghB) setPlanIndexPaidLate(bp, bIdx, true);
            else setPlanIndexPaidLate(bp, bIdx, false);
            var need = bIdx + 1;
            var curPaid = Math.max(0, parseInt(bp.paidCount, 10) || 0);
            if (curPaid < need) bp.paidCount = Math.min(bCnt, need);
            try { clampPlanPaymentState(bp); } catch (eC) {}
            try { removeCarriedInstallmentRows(bp.id, bIdx, targetYear, targetMonth); } catch (eR) {}
          }
          tRow.allowPlanFieldEdit = true;
          tRow.fromPlanId = bp.id;
          tRow.fromPlanIndex = bIdx;
          batchOk++;
          sec = tSec || sec;
        });
        try {
          if (periodCtx.isCurrent && typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
          else syncPlansToExpensePeriod(targetPd, targetYear, targetMonth);
        } catch (eSy2) {}
        if (sec && sec.rows) {
          sec.rows.sort(function(a, b) {
            return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99);
          });
          sec.collapsed = false;
        }
        commitWritablePeriodData(periodCtx);
        try { persistCurrent(); } catch (eP) {}
        try { saveArchive(); } catch (eA) {}
        scheduleSave();
        closeSmsConfirmModal();
        try {
          if (typeof navigateToPeriod === 'function') navigateToPeriod(targetYear, targetMonth);
        } catch (eN) {}
        if (currentTab !== tab) switchTab(tab);
        else renderAll();
        showToast('پرداخت دسته‌ای: ' + toPersianDigits(batchOk) + ' قسط ثبت شد');
        return;
      }
      if (linkedPlan && linkedIdx >= 0) {
        const cnt = Math.max(0, parseInt(linkedPlan.count, 10) || 0);
        const baseDesc = planInstallmentDesc(linkedPlan, linkedIdx, cnt);
        /* پرداخت زودهنگام قسط ماه بعد: فقط ردیف در ماه جاری؛ ماه سررسید دست‌نخورده */
        var dueEarly = null;
        try { dueEarly = dueDateForInstallment(linkedPlan, linkedIdx); } catch (eDe) {}
        var isFutureDue = dueEarly && ((dueEarly.y > targetYear) || (dueEarly.y === targetYear && dueEarly.m > targetMonth));
        if (isFutureDue) {
          if (!linkedPlan.paidEarlyMap) linkedPlan.paidEarlyMap = {};
          linkedPlan.paidEarlyMap[String(linkedIdx)] = {
            y: targetYear, m: targetMonth,
            amount: amount, day: day || '', account: bank || ''
          };
          /* paidCount را بالا نبر — ماه سررسید پرداخت‌نشده بماند */
          let earlyRow = null;
          let earlySec = sec;
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (r && r.fromPlanId === linkedPlan.id && parseInt(r.fromPlanIndex, 10) === linkedIdx && r.planEarlyPay) {
                earlyRow = r; earlySec = s;
              }
            });
          });
          if (!earlyRow) {
            earlyRow = emptyRow();
            earlyRow.fromPlanId = linkedPlan.id;
            earlyRow.fromPlanIndex = linkedIdx;
            earlyRow.planEarlyPay = true;
            const emptyIdxE = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
            if (emptyIdxE >= 0) sec.rows[emptyIdxE] = earlyRow;
            else sec.rows.push(earlyRow);
            earlySec = sec;
          }
          earlyRow.status = 'paid';
          earlyRow.amount = amount;
          if (day) earlyRow.day = day;
          if (bank) earlyRow.account = bank;
          earlyRow.desc = baseDesc + ' (پیش‌پرداخت)';
          earlyRow.planEarlyPay = true;
          earlyRow.allowPlanFieldEdit = true;
          earlyRow.fromPlanId = linkedPlan.id;
          earlyRow.fromPlanIndex = linkedIdx;
          if (earlySec && earlySec.rows) {
            earlySec.rows.sort((a, b) => (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99));
            earlySec.collapsed = false;
          }
          sec = earlySec || sec;
          try { updateInstallSummary(); } catch (eU) {}
          try { checkInstallReminders(); } catch (eR) {}
          commitWritablePeriodData(periodCtx);
          persistCurrent();
          scheduleSave();
          closeSmsConfirmModal();
          try {
            if (typeof navigateToPeriod === 'function') navigateToPeriod(targetYear, targetMonth);
          } catch (eNavE) {}
          if (currentTab !== tab) switchTab(tab);
          else renderAll();
          showToast('پیش‌پرداخت قسط ثبت شد: ' + formatNum(amount));
          return;
        }
        /* هدف: همان ردیف قسط در ماه جاری (اولویت با معوق) */
        let target = null;
        let targetSec = null;
                var dueMatch = dueEarly && dueEarly.y === targetYear && dueEarly.m === targetMonth;
        (targetPd.expense.sections || []).forEach(function(s) {
          (s.rows || []).forEach(function(r) {
            if (!r || r.fromPlanId !== linkedPlan.id) return;
            if (parseInt(r.fromPlanIndex, 10) !== linkedIdx) return;
            const isMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
            if (dueMatch) {
              /* تاریخ پیامک = ماه سررسید → ردیف عادی همان ماه */
              if (!isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            } else {
              if (isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            }
          });
        });
        if (!target) {
          /* اگر هنوز ردیف ساخته نشده، اول همگام‌سازی ماه جاری */
          try { syncPlansToExpensePeriod(targetPd, targetYear, targetMonth); } catch (eS0) {}
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (!r || r.fromPlanId !== linkedPlan.id) return;
              if (parseInt(r.fromPlanIndex, 10) !== linkedIdx) return;
              const isMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
              if (isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            });
          });
        }
        if (target) {
          const keepMoavagh = !!target.planCarried || (target.desc && String(target.desc).indexOf('معوق') >= 0);
          /* پرداخت معوق: ماه قبل دست‌نخورده؛ غیرمعوق: همین ماه سررسید */
          if (keepMoavagh) setPlanIndexPaidLate(linkedPlan, linkedIdx, true);
          else setPlanIndexPaidLate(linkedPlan, linkedIdx, false);
          const need = linkedIdx + 1;
          const curPaid = Math.max(0, parseInt(linkedPlan.paidCount, 10) || 0);
          if (curPaid < need) linkedPlan.paidCount = Math.min(cnt, need);
          const snap = {
            amount: amount,
            day: day,
            account: bank,
            planCarried: keepMoavagh
          };
          try {
            if (periodCtx.isCurrent && typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
            else syncPlansToExpensePeriod(targetPd, targetYear, targetMonth);
            var applied = false;
            var appliedSec = null;
            (targetPd.expense.sections || []).forEach(function(s) {
              (s.rows || []).forEach(function(r) {
                if (!(r && r.fromPlanId === linkedPlan.id && parseInt(r.fromPlanIndex, 10) === linkedIdx)) return;
                const rowMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
                if (keepMoavagh) {
                  if (!rowMoavagh) return;
                } else {
                  if (rowMoavagh) return;
                }
                r.status = 'paid';
                r.amount = snap.amount;
                if (snap.day) r.day = snap.day;
                if (snap.account) r.account = snap.account;
                r.desc = planInstallmentDesc(linkedPlan, linkedIdx, cnt) + (keepMoavagh ? ' (معوق)' : '') + (Number(snap.amount) > (Number(linkedPlan.amount) || 0) && Number(linkedPlan.amount) > 0 ? ' — دیرکرد ' + formatNum(Number(snap.amount) - Number(linkedPlan.amount)) : '');
                r.planCarried = !!keepMoavagh;
                if (snap.account) linkedPlan.lastPayAccount = snap.account;
                r.allowPlanFieldEdit = true;
                hkSmsStamp(r);
                applied = true;
                appliedSec = s;
              });
            });
            /* اگر بعد از همگام‌سازی ردیف پیدا نشد، حتماً بساز تا در جدول دیده شود */
            if (!applied) {
              var fallSec = targetSec || sec;
              if (!fallSec) {
                fallSec = ensureSmsSection('expense', 'برداشت بانکی', targetPd);
              }
              if (fallSec) {
                if (!Array.isArray(fallSec.rows)) fallSec.rows = [];
                var nr = emptyRow();
                nr.fromPlanId = linkedPlan.id;
                nr.fromPlanIndex = linkedIdx;
                nr.status = 'paid';
                nr.amount = snap.amount;
                if (snap.day) nr.day = snap.day;
                if (snap.account) nr.account = snap.account;
                nr.desc = planInstallmentDesc(linkedPlan, linkedIdx, cnt) + (keepMoavagh ? ' (معوق)' : '');
                nr.planCarried = !!keepMoavagh;
                nr.allowPlanFieldEdit = true;
                hkSmsStamp(nr);
                var emptyIdxN = fallSec.rows.findIndex(function(r) {
                  return r && !r.desc && !r.amount && !r.day && !r.fromPlanId;
                });
                if (emptyIdxN >= 0) fallSec.rows[emptyIdxN] = nr;
                else fallSec.rows.push(nr);
                fallSec.collapsed = false;
                appliedSec = fallSec;
                applied = true;
              }
            }
            if (appliedSec) {
              sec = appliedSec;
              targetSec = appliedSec;
            }
          } catch (eSync) {
            try { showToast('خطا در همگام‌سازی قسط'); } catch (eT) {}
          }
          /* هر معوقِ این قسط در ماه‌های بعد از تاریخ پرداخت حذف شود (چندماهه هم) */
          try {
            removeCarriedInstallmentRows(linkedPlan.id, linkedIdx, targetYear, targetMonth);
          } catch (eRm) {}
          try {
            if (!periodCtx.isCurrent && typeof syncPlansToExpensePeriod === 'function') {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            } else if (typeof syncPlansToExpensePeriod === 'function') {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            }
          } catch (eSync2) {}
          try { if (typeof checkInstallReminders === 'function') checkInstallReminders(); } catch (eR2) {}
          try { updateInstallSummary(); } catch (eU) {}
          try { checkInstallReminders(); } catch (eR) {}
          sec = targetSec || sec;
        } else {
          /* ردیف پیدا نشد — ردیف جدید لینک‌شده به قسط */
          const row = emptyRow();
          row.day = day;
          row.amount = amount;
          row.status = 'paid';
          row.account = bank;
          row.fromPlanId = linkedPlan.id;
          row.fromPlanIndex = linkedIdx;
          row.desc = baseDesc;
          row.viaSms = true;
          try { var _rl2 = hkSmsRialFor(amount); if (_rl2) row.amountRial = _rl2; } catch (eRl2) {}
          row.allowPlanFieldEdit = true;
          hkSmsStamp(row);
          try { row.financialContext = readSmsFinancialContext('expense'); } catch (eFcP) {}
          const emptyIdx = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
          if (emptyIdx >= 0) sec.rows[emptyIdx] = row;
          else sec.rows.push(row);
          const need = linkedIdx + 1;
          const curPaid = Math.max(0, parseInt(linkedPlan.paidCount, 10) || 0);
          if (curPaid < need) linkedPlan.paidCount = Math.min(cnt, need);
        }
      } else {
        /* تراکنش عادی بدون لینک قسط — حساب جدید خودکار ساخته نشود */
        const row = emptyRow();
        row.day = day;
        row.desc = desc;
        row.amount = amount;
        row.status = 'paid';
        row.account = bank;
        row.viaSms = true; /* برای تشخیص «پیامک بانکی در برابر ثبت دستی» */
        hkSmsStamp(row);
        try { var _rl = hkSmsRialFor(amount); if (_rl) row.amountRial = _rl; } catch (eRl) {}
        try {
          row.financialContext = readSmsFinancialContext(tab);
          // تخصیص خودکار مخارج پروژه — amount همین تومان canonical است
          if (tab === 'expense' && row.financialContext && row.financialContext.accountType === 'project' &&
              row.financialContext.subjectId && row.financialContext.subjectId !== 'personal') {
            var alloc = allocateProjectExpense(row.financialContext.subjectId, amount);
            row.financialContext.projectAmount = alloc.projectAmount;
            row.financialContext.personalAdvanceAmount = alloc.personalAdvanceAmount;
            row.financialContext.fundingSource = alloc.fundingSource;
            if (alloc.personalAdvanceAmount > 0) row.createsReceivable = true;
          } else if (tab === 'income' && row.financialContext && row.financialContext.accountType === 'project') {
            row.financialContext.projectAmount = amount;
            row.financialContext.personalAdvanceAmount = 0;
            row.financialContext.fundingSource = 'subject';
          }
        } catch (eFc) { row.financialContext = defaultFinancialContext(); }
        const emptyIdx = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
        if (emptyIdx >= 0) sec.rows[emptyIdx] = row;
        else sec.rows.push(row);
      }
      if (sec && sec.rows) {
        sec.rows.sort((a, b) => {
          const da = parseInt(a.day, 10) || 99;
          const db = parseInt(b.day, 10) || 99;
          return da - db || hkTimeCmp(a, b);
        });
        sec.collapsed = false;
      }

      if (!sec || !Array.isArray(sec.rows)) {
        showToast('ثبت انجام نشد. بخش مقصد را بررسی کنید');
        return;
      }
      /* اگر ردیف هنوز اضافه نشده، همین‌جا بساز (ایمنی نهایی) */
      var hasMatching = sec.rows.some(function(r) {
        if (!r) return false;
        if (Number(r.amount) === Number(amount) && (r.desc || '') === (desc || '')) return true;
        if (r.fromPlanId && Number(r.amount) === Number(amount)) return true;
        return false;
      });
      if (!hasMatching) {
        var safety = emptyRow();
        safety.day = day || '';
        safety.desc = desc || (tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی');
        safety.amount = amount;
        safety.status = 'paid';
        safety.account = bank || '';
        safety.viaSms = true;
        hkSmsStamp(safety);
        try {
          safety.financialContext = readSmsFinancialContext(tab);
          if (tab === 'expense' && safety.financialContext && safety.financialContext.accountType === 'project' &&
              safety.financialContext.subjectId && safety.financialContext.subjectId !== 'personal') {
            var allocS = allocateProjectExpense(safety.financialContext.subjectId, amount);
            safety.financialContext.projectAmount = allocS.projectAmount;
            safety.financialContext.personalAdvanceAmount = allocS.personalAdvanceAmount;
            safety.financialContext.fundingSource = allocS.fundingSource;
          } else if (tab === 'income' && safety.financialContext && safety.financialContext.accountType === 'project') {
            safety.financialContext.projectAmount = amount;
            safety.financialContext.personalAdvanceAmount = 0;
            safety.financialContext.fundingSource = 'subject';
          }
        } catch (eSf) {}
        var emptyIdxS = sec.rows.findIndex(function(r) {
          return r && !r.desc && !r.amount && !r.day && !r.fromPlanId;
        });
        if (emptyIdxS >= 0) sec.rows[emptyIdxS] = safety;
        else sec.rows.push(safety);
      }
      sec.collapsed = false;
      try {
        if (!periodCtx.isCurrent) {
          archive[periodCtx.key] = targetPd;
        } else {
          periodData = targetPd;
        }
      } catch (eForce) {}
      commitWritablePeriodData(periodCtx);
      try { persistCurrent(); } catch (eP) {}
      try { saveArchive(); } catch (eA) {}
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('hesab_force_flush', String(Date.now()));
        }
      } catch (eL) {}
      scheduleSave();
      closeSmsConfirmModal();
      var periodNote = '';
      try {
        if (targetYear !== currentYear || targetMonth !== currentMonth) {
          periodNote = ' در ' + (MONTHS[targetMonth - 1] || '') + ' ' + toPersianDigits(targetYear);
        }
        /* همیشه بعد از ثبت به ماه تراکنش برو تا ردیف همان لحظه دیده شود */
        if (typeof navigateToPeriod === 'function') {
          navigateToPeriod(targetYear, targetMonth);
        } else {
          currentYear = targetYear;
          currentMonth = targetMonth;
          try { loadCurrent(); } catch (eL2) {}
        }
      } catch (eN) {}
      if (currentTab !== tab) switchTab(tab);
      else renderAll();
      var secNote = (sec && sec.title) ? (' — ' + sec.title) : '';
      /* کوتاه: تا انیمیشن چرخش عدد موجودی دیده شود */
      showToast((tab === 'income' ? 'واریز' : 'برداشت') + ' ثبت شد: ' + formatNum(amount) + periodNote + secNote, 900);
      try {
        if (sec) {
          const el = document.getElementById('sec-' + tab + '-' + sec.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {}
      try {
        var sidRefresh = '';
        try {
          var fcR = (typeof readSmsFinancialContext === 'function') ? null : null;
        } catch (e0) {}
        /* از ردیف ثبت‌شده subjectId را بردار */
        try {
          var lastRows = (sec && sec.rows) ? sec.rows : [];
          for (var ri = lastRows.length - 1; ri >= 0; ri--) {
            var rr = lastRows[ri];
            var fcr = rr && rr.financialContext;
            if (fcr && fcr.subjectId && fcr.subjectId !== 'personal') {
              sidRefresh = fcr.subjectId;
              break;
            }
          }
        } catch (eS) {}
        if (typeof refreshOpenProjectViews === 'function') refreshOpenProjectViews(sidRefresh, { report: true });
      } catch (eRef) {}
      } catch (eConfirm) {
        try { console.error('confirmSmsEntry', eConfirm); } catch (e0) {}
        try { showToast('خطا در ثبت: ' + (eConfirm && eConfirm.message ? eConfirm.message : 'نامشخص')); } catch (e1) {}
      }
    }

    // اگر نرم‌افزار داخل WebView با پل نیتیو باشد (مثلاً Capacitor)، از بیرون قابل فراخوانی است:
    // window.onBankSmsReceived(smsText)
    function isSmsConfirmOpen() {
      const m = document.getElementById('smsConfirmModal');
      return !!(m && m.classList.contains('open'));
    }
