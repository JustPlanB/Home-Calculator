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
            '<label class="family-label">نوع فعالیت</label>' + /* ۱.۳.۸۸: بالای دکمه‌ها، مثل برچسب «پروژه» */
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


