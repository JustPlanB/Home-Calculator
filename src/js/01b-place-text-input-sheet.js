    /* —— Text input (sheet at top — avoids keyboard covering buttons) —— */
    let textInputCallback = null;
    function placeTextInputSheet() {
      const sheet = document.getElementById('textInputModal');
      const vv = window.visualViewport;
      const offsetTop = vv ? vv.offsetTop : 0;
      const visH = vv ? vv.height : window.innerHeight;
      const top = offsetTop + Math.max(80, Math.floor(visH * 0.25));
      sheet.style.top = top + 'px';
      sheet.style.left = '12px';
      sheet.style.right = '12px';
    }
    function askTextInput(label, currentValue, onSave, placeholderHint) {
      closeRemindBarIfOpen();
      document.getElementById('textInputLabel').textContent = label || 'نام قسط';
      const field = document.getElementById('textInputField');
      field.oninput = null;
      field.inputMode = 'text';
      field.setAttribute('enterkeyhint', 'done');
      field.value = currentValue || '';
      field.placeholder = placeholderHint || label || 'بنویسید و تأیید کنید';
      textInputCallback = onSave;
      const sheet = document.getElementById('textInputModal');
      sheet.classList.add('open');
      placeTextInputSheet();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) bd.classList.add('open');
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', placeTextInputSheet);
        window.visualViewport.addEventListener('scroll', placeTextInputSheet);
      }
      setTimeout(() => {
        try { field.focus({ preventScroll: true }); } catch (e) { try { field.focus(); } catch (e2) {} }
        // سلکت‌آل تا با تایپ جایگزین شود
        try {
          if (field.value) caretToEnd(field);
          else field.setSelectionRange(0, 0);
        } catch (e) {}
        placeTextInputSheet();
      }, 50);
      setTimeout(placeTextInputSheet, 300);
    }
    /* ۱.۳.۴۸: آیکون ویرایشِ «فعال» (خاکستری) وقتی منوی ویرایش با برگشت یا زدن بیرون بسته شد، دوباره عادی شود */
    /* ۱.۳.۴۹: فقط وقتی خود پنجرهٔ ویرایش هنوز باز است خاکستری بماند (نه هر پنجرهٔ باز دیگری)؛ با «بازگشت» فوراً */
    function hkResetEditIcons() {
      try {
        var on = document.querySelectorAll('.btn-edit-title.is-editing'); if (!on.length) return;
        if (document.querySelector('#recurringSheet, #textInputModal.open, #nameSheetBackdrop.open, .hk-re-ov, .person-edit-sheet')) return;
        on.forEach(function (b) { if (b.closest && b.closest('.plan-card')) return; b.classList.remove('is-editing'); });
      } catch (e) {}
    }
    setInterval(hkResetEditIcons, 400);
    function closeTextInputModal() {
      document.getElementById('textInputModal').classList.remove('open');
      document.getElementById('textInputModal').style.zIndex = '';
      const bd = document.getElementById('textInputBackdrop');
      if (bd) { bd.classList.remove('open'); bd.style.zIndex = '450'; }
      textInputCallback = null;
      // آیکون ادیت درآمدهای ثابت و سایر‌ها را از حالت آبی دربیاور
      try {
        document.querySelectorAll('.btn-edit-title.is-editing').forEach(b => {
          // اقساط تا پایان ویرایش آبی می‌ماند
          if (b.closest && b.closest('.plan-card')) return;
          b.classList.remove('is-editing');
        });
      } catch (e) {}
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', placeTextInputSheet);
        window.visualViewport.removeEventListener('scroll', placeTextInputSheet);
      }
    }
    document.getElementById('textInputField').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Go' || e.key === 'Done') {
        e.preventDefault();
        const v = document.getElementById('textInputField').value;
        const cb = textInputCallback;
        closeTextInputModal();
        if (cb) cb(v);
      }
      if (e.key === 'Escape') closeTextInputModal();
    });
    const _tibd = document.getElementById('textInputBackdrop');
    if (_tibd) _tibd.addEventListener('click', () => closeTextInputModal());

    /* —— Tabs —— */
    function activatePanel(tab) {
      const all = ['home', 'income', 'expense', 'balance', 'install', 'ledger', 'recurring'];
      all.forEach(t => {
        const p = document.getElementById('panel-' + t);
        if (p) p.classList.toggle('active', t === tab);
      });
    }
    function switchTab(tab, force) {
      if (!force && tab === currentTab) return;
      // تب‌های اصلی حذف شده‌اند — به خانه برگرد مگر جزئیات کارت
      if ((tab === 'income' || tab === 'expense' || tab === 'balance') && !(typeof _detailContext !== 'undefined' && _detailContext)) {
        tab = 'home';
      }
      try { persistCurrent(); } catch (e) {}
      const prevY = window.scrollY || 0;
      currentTab = tab;
      activatePanel(tab);
      try { updateTabUI(); } catch (e) {}
      renderAll();
      try { saveArchive(); } catch (e) {}
      requestAnimationFrame(() => {
        const maxY = Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight);
        let y = Math.min(prevY, maxY);
        if (y < 0) y = 0;
        // تب‌های منو از بالا شروع شوند
        if (tab === 'install' || tab === 'ledger' || tab === 'recurring') y = 0;
        window.scrollTo(0, y);
        moveTabIndicator();
      });
    }
    let _featureReturnTab = 'expense';
    var _instFlashPlans = {};
    let _featureActive = null; // 'recurring' | 'install' | 'ledger'
    const FEATURE_TITLES = {
      recurring: 'درآمدهای ثابت',
      install: 'اقساط',
      ledger: 'قرض'
    };
    function openFeatureSheet(kind) {
      try { closeSideMenu(); } catch (e) {}
      /* ورود به منوی اقساط = اعلان‌های قسط «خوانده‌شده» */
      if (kind === 'install') {
        /* وام‌هایی که نشان عددی داشتند: استروک قرمز چرخان تا وقتی منو باز است */
        try {
          var _seenI = {}; loadInstallSeen().forEach(function (k) { _seenI[k] = 1; });
          _instFlashPlans = {};
          installAlertKeys().forEach(function (k) { if (!_seenI[k]) _instFlashPlans[k.slice(0, k.lastIndexOf(':'))] = 1; });
        } catch (eFl) { _instFlashPlans = {}; }
        try { markInstallAlertsSeen(); } catch (eIA) {}
      }
      const sheet = document.getElementById('featureSheet');
      const body = document.getElementById('featureSheetBody');
      const title = document.getElementById('featureSheetTitle');
      if (!sheet || !body) return;
      _featureReturnTab = 'home';
      _featureActive = kind;
      if (title) title.textContent = FEATURE_TITLES[kind] || '';
      try {
        var fsAdd = document.getElementById('featureSheetAdd');
        if (fsAdd) {
          var lbl = { install: 'قسط جدید', ledger: 'رابطهٔ جدید', recurring: 'درآمد ثابت جدید' }[kind];
          fsAdd.style.display = lbl ? '' : 'none';
          if (lbl) { fsAdd.setAttribute('aria-label', lbl); fsAdd.title = lbl; }
        }
      } catch (eAdd) {}
      const panelId = (kind === 'recurring') ? 'panel-recurring' : ('panel-' + kind);
      const panel = document.getElementById(panelId);
      if (panel) {
        if (panel.parentNode !== body) {
          body.innerHTML = '';
          body.appendChild(panel);
        }
        panel.classList.add('active');
        panel.style.display = 'block';
      }
      // رندر با currentTab موقت فقط برای توابع وابسته
      const savedTab = currentTab;
      currentTab = kind;
      try {
        if (kind === 'recurring') {
          recurringCollapsed = false;
          renderRecurringBar();
        } else if (kind === 'install') {
          try { (plans || []).forEach(function(p){ p.collapsed = true; }); } catch (eC) {}
          renderPlans();
          try { updateInstallSummary(); } catch (e) {}
        } else if (kind === 'ledger') {
          try {
            var _led = ensureLedger();
            (_led.sections || []).forEach(function(s){ s.collapsed = true; });
          } catch (eC2) {}
          renderLedgerTab();
        }
      } catch (err) { console.error(err); }
      // تب اصلی را دست نزن — فقط شیت باز است
      currentTab = savedTab;
      activatePanel(savedTab);
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      try { lockBodyScroll(); } catch (e) {}
      try { body.scrollTop = 0; } catch (e) {}
    }
    /* دکمهٔ + نوار بالای منوهای اقساط/قرض/درآمد ثابت (به‌جای دکمهٔ داخل جدول) */
    function featureSheetAdd() {
      try {
        if (_featureActive === 'install') addPlan();
        else if (_featureActive === 'ledger') addLedgerSection();
        else if (_featureActive === 'recurring') editRecurringItem(-1);
      } catch (e) { console.error(e); }
    }
    function closeFeatureSheet() {
      const sheet = document.getElementById('featureSheet');
      const body = document.getElementById('featureSheetBody');
      try {
        const was = _featureActive;
        if (was === 'install') {
          _instFlashPlans = {};
          document.querySelectorAll('.plan-card.inst-alert').forEach(function (c) { c.classList.remove('inst-alert'); });
          (plans || []).forEach(function(p){ p.collapsed = true; });
          try { scheduleSave(); } catch (e0) {}
        } else if (was === 'ledger') {
          var ledX = ensureLedger();
          /* ۱.۳.۶۶: فقط حالت نمایش؛ ذخیرهٔ کامل لازم نیست */
          (ledX.sections || []).forEach(function(s){ s.collapsed = true; });
        } else if (was === 'recurring') {
          try { recExpanded.clear(); } catch (e2) {}
        }
      } catch (eClose) {}
      if (sheet) {
        sheet.classList.remove('open');
        sheet.setAttribute('aria-hidden', 'true');
      }
      try {
        const track = document.getElementById('tabTrack');
        if (track && body) {
          Array.from(body.children).forEach(ch => {
            if (ch && ch.id && ch.id.indexOf('panel-') === 0) {
              track.appendChild(ch);
              ch.classList.remove('active');
              ch.style.display = '';
            }
          });
        }
      } catch (e) {}
      _featureActive = null;
      try { unlockBodyScroll(); } catch (e) {}
      // بازگشت یک مرحله: صفحه کارت (خانه)
      try {
        currentTab = 'home';
        _detailContext = null;
        activatePanel('home');
        renderHomeCards();
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e3) {}
      } catch (e) {
        try { switchTab('home', true); } catch (e2) {}
      }
      try { checkInstallReminders(); } catch (e) {}
    }
    function switchTabFromMenu(tab) {
      try { closeSideMenu(); } catch (e) {}
      /* ۱.۳.۴۶: منوی اقساط پنهان → جدول مخارج */
      if (tab === 'install' && !HK_INSTALLMENTS_ON) { try { openPersonDetail(allPersonTitles()[0], 'expense'); } catch (eI) {} return; }
      setTimeout(() => openFeatureSheet(tab), 40);
    }
    /* ۱.۳.۷۹: باکس درآمدهای ثابت: بیش از ۷ مورد فقط داخل خود باکس اسکرول؛ صفحه ثابت و بی‌اسکرول */
    function hkRecListFit(tries) {
      tries = tries || 0;
      var rl = document.querySelector('#recurringBox .rec-list-scroll'); if (!rl) return;
      var rs = rl.querySelectorAll(':scope > .recurring-row');
      if (!rs.length || !rs[0].offsetHeight || !rl.getBoundingClientRect().width) { if (tries < 40) setTimeout(function () { hkRecListFit(tries + 1); }, 120); return; }
      rl.style.maxHeight = 'none';
      var n = Math.min(7, rs.length), last = rs[n - 1];
      var hh = last.offsetTop + last.offsetHeight - rs[0].offsetTop + (parseFloat(getComputedStyle(last).marginBottom) || 0);
      var top = rl.getBoundingClientRect().top, ex = document.getElementById('recExportBtn');
      var reserve = 28 + (ex && ex.offsetHeight ? ex.offsetHeight + 24 : 0) + 34;
      var avail = Math.floor(window.innerHeight - top - reserve);
      rl.style.maxHeight = Math.max(120, Math.min(Math.round(hh), avail > 0 ? avail : hh)) + 'px';
    }
    window.addEventListener('resize', function () { try { hkRecListFit(); } catch (e) {} });
    function openRecurringFromMenu() {
      try { closeSideMenu(); } catch (e) {}
      setTimeout(() => openFeatureSheet('recurring'), 40);
    }

    const TAB_ORDER = ['income', 'expense', 'balance'];
    const ALL_TABS = ['income', 'expense', 'balance', 'install', 'ledger', 'recurring'];
    const TAB_IDS = { income: 'tabIncome', expense: 'tabExpense', balance: 'tabBalance', install: 'tabInstall', ledger: 'tabLedger' };
    function tabIndexOf(tab) {
      const i = TAB_ORDER.indexOf(tab);
      return i < 0 ? 0 : i;
    }
    function setTrackAtIndex(indexFloat, dragging) {
      // فقط نمایش یک تب — بدون سُر خوردن محتوا
      if (dragging) return;
      if (currentTab === 'home') { activatePanel('home'); return; }
      if (typeof _detailContext !== 'undefined' && _detailContext) {
        activatePanel(_detailContext.kind === 'balance' ? 'balance' : _detailContext.kind);
        return;
      }
      // تب‌های منو (اقساط / بده‌بستان / درآمد ثابت)
      if (currentTab === 'install' || currentTab === 'ledger' || currentTab === 'recurring') {
        activatePanel(currentTab);
        return;
      }
      const n = TAB_ORDER.length;
      const idx = Math.max(0, Math.min(n - 1, Math.round(indexFloat)));
      const tab = TAB_ORDER[idx];
      activatePanel(tab);
    }
    function setIndicatorAtIndex(indexFloat, dragging) {
      const bar = document.getElementById('tabsBar');
      const ind = document.getElementById('tabIndicator');
      if (!bar || !ind) return;
      const n = TAB_ORDER.length;
      const clamped = Math.max(0, Math.min(n - 1, indexFloat));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(n - 1, i0 + 1);
      const t = clamped - i0;
      const b0 = document.getElementById(TAB_IDS[TAB_ORDER[i0]]);
      const b1 = document.getElementById(TAB_IDS[TAB_ORDER[i1]]);
      if (!b0 || !b1) return;
      const br = bar.getBoundingClientRect();
      const r0 = b0.getBoundingClientRect();
      const r1 = b1.getBoundingClientRect();
      // وقتی روی یک تب ثابت است: باکس و کلمه عمودی و افقی وسط هم‌دیگر
      const settled = !dragging && Math.abs(clamped - Math.round(clamped)) < 0.02;
      let left, width, topRel, height;
      if (settled) {
        const btn = document.getElementById(TAB_IDS[TAB_ORDER[Math.round(clamped)]]);
        const r = btn.getBoundingClientRect();
        left = r.left - br.left;
        width = r.width;
        topRel = (r.top - br.top) + r.height / 2;
        height = r.height;
      } else {
        left = (r0.left - br.left) + ((r1.left - br.left) - (r0.left - br.left)) * t;
        width = r0.width + (r1.width - r0.width) * t;
        const h0 = r0.height, h1 = r1.height;
        height = h0 + (h1 - h0) * t;
        const c0 = (r0.top - br.top) + r0.height / 2;
        const c1 = (r1.top - br.top) + r1.height / 2;
        topRel = c0 + (c1 - c0) * t;
      }
      ind.classList.toggle('dragging', !!dragging);
      ind.style.left = left + 'px';
      ind.style.width = width + 'px';
      ind.style.height = height + 'px';
      ind.style.top = topRel + 'px';
      ind.style.marginTop = (-height / 2) + 'px';
      // فقط یک رنگ فعال — نزدیک‌ترین تب
      const nearestIdx = Math.round(clamped);
      const nearest = TAB_ORDER[nearestIdx];
      ind.classList.remove('neon-income', 'neon-expense', 'neon-balance', 'neon-install', 'neon-ledger');
      ind.classList.add('neon-' + nearest);
      TAB_ORDER.forEach((tab, i) => {
        const btn = document.getElementById(TAB_IDS[tab]);
        if (!btn) return;
        const on = i === nearestIdx;
        btn.classList.toggle('near', on);
        btn.classList.toggle('active', on);
        if (!on) {
          btn.style.color = '';
          btn.style.textShadow = '';
        }
      });
      if (!dragging) setTrackAtIndex(clamped, false);
    }

    function syncChromeHeight() {
      try {
        const chrome = document.getElementById('stickyChrome');
        if (!chrome) return;
        const bar = document.getElementById('remindBar');
        const body = document.getElementById('remindBanner');
        // موقع باز بودن اورلی، ارتفاع بدنه را از محاسبه حذف کن تا کارت جابه‌جا نشود
        let bodyDisp = '';
        let bodyVis = '';
        if (bar && bar.classList.contains('open-overlay') && body) {
          bodyDisp = body.style.display;
          bodyVis = body.style.visibility;
          body.style.display = 'none';
          body.style.visibility = 'hidden';
        }
        const h = Math.ceil(chrome.getBoundingClientRect().height || chrome.offsetHeight || 0);
        if (body && bodyDisp !== '') {
          body.style.display = bodyDisp;
          body.style.visibility = bodyVis;
        } else if (body && bar && bar.classList.contains('open-overlay')) {
          body.style.display = '';
          body.style.visibility = '';
        }
        if (h > 40) {
          document.documentElement.style.setProperty('--chrome-h', h + 'px');
          try { document.body.style.paddingTop = 'calc(' + h + 'px + env(safe-area-inset-top, 0px))'; } catch (e2) {}
        }
      } catch (e) {}
    }

    function syncMatchCardWidth() {
      // عرض کامل ناحیه محتوا (هم‌تراز نوار بالا) — بدون کوچک‌سازی اضافه
      let w = 0;
      const chrome = document.getElementById('stickyChrome');
      if (chrome) {
        const cs = window.getComputedStyle(chrome);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        w = chrome.clientWidth - pl - pr;
      }
      if (!w || w < 40) {
        const top = document.querySelector('.top-bar');
        if (top) w = top.getBoundingClientRect().width;
      }
      if (!w || w < 40) {
        w = document.documentElement.clientWidth - 24;
      }
      // حداکثر عرض قابل‌لمس بدون بیرون‌زدن از صفحه
      const maxW = Math.max(0, document.documentElement.clientWidth - 16);
      let wider = Math.round(w);
      if (wider > maxW) wider = maxW;
      if (wider < 40) wider = maxW;
      document.documentElement.style.setProperty('--match-card-w', wider + 'px');
    }
    function moveTabIndicator() {
      setIndicatorAtIndex(tabIndexOf(currentTab), false);
    }
    function updateTabUI() {
      const te = document.getElementById('tabExpense');
      const ti = document.getElementById('tabIncome');
      const tb = document.getElementById('tabBalance');
      const tins = document.getElementById('tabInstall');
      const tled = document.getElementById('tabLedger');
      if (te) te.classList.toggle('active', currentTab === 'expense');
      if (ti) ti.classList.toggle('active', currentTab === 'income');
      if (tb) tb.classList.toggle('active', currentTab === 'balance');
      if (tins) tins.classList.toggle('active', currentTab === 'install');
      if (tled) tled.classList.toggle('active', currentTab === 'ledger');
      // برای تب‌های اصلی ایندیکاتور؛ برای منو فقط پنل
      if (currentTab === 'install' || currentTab === 'ledger' || currentTab === 'recurring') {
        activatePanel(currentTab);
        // هیچ تب اصلی‌ای active نماند
        if (te) te.classList.remove('active', 'near');
        if (ti) ti.classList.remove('active', 'near');
        if (tb) tb.classList.remove('active', 'near');
      } else {
        setTrackAtIndex(tabIndexOf(currentTab), false);
      }
      requestAnimationFrame(() => requestAnimationFrame(moveTabIndicator));
    }

    let touchStartX = 0, touchStartY = 0;
    let swipeActive = false;
    let swipeLocked = false; // افقی قفل شده
    let swipeStartIdx = 0;
    let swipeTabW = 80;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.target;
      // فقط وقتی روی فیلد در حال تایپ هستیم سوایپ را قطع کن
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && document.activeElement === t) {
        touchStartX = 0;
        return;
      }
      if (t && t.closest && t.closest('.modal-overlay.open, .text-input-sheet.open, .title-menu, .status-menu, .dark-select-list.open')) {
        touchStartX = 0;
        return;
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      // در حالت خانه یا جزئیات کارت، سوایپ تب‌ها غیرفعال
      if (currentTab === 'home' || (typeof _detailContext !== 'undefined' && _detailContext)) {
        swipeActive = false;
        return;
      }
      swipeActive = true;
      swipeLocked = false;
      swipeStartIdx = tabIndexOf(currentTab);
      const bar = document.getElementById('tabsBar');
      if (bar) swipeTabW = Math.max(48, bar.getBoundingClientRect().width / TAB_ORDER.length);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!swipeActive || !touchStartX) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchStartX;
      const dy = y - touchStartY;
      if (!swipeLocked) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          // اسکرول عمودی
          swipeActive = false;
          setIndicatorAtIndex(swipeStartIdx, false);
          return;
        }
        if (Math.abs(dx) > 10) swipeLocked = true;
        else return;
      }
      // حرکت پیوسته شاخص: در RTL حرکت انگشت به راست → تب قبلی در آرایه؟ مطابق منطق قبلی dx>0 = بعدی
      // progress مثبت وقتی dx مثبت (انگشت به راست)
      const progress = dx / swipeTabW;
      let idx = swipeStartIdx + progress;
      idx = Math.max(0, Math.min(TAB_ORDER.length - 1, idx));
      setIndicatorAtIndex(idx, true);
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!touchStartX) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const wasSwipe = swipeActive && swipeLocked;
      touchStartX = 0;
      swipeActive = false;
      swipeLocked = false;
      if (!wasSwipe) {
        setIndicatorAtIndex(tabIndexOf(currentTab), false);
        setTrackAtIndex(tabIndexOf(currentTab), false);
        return;
      }
      if (Math.abs(dx) < Math.abs(dy) * 1.1) {
        setIndicatorAtIndex(tabIndexOf(currentTab), false);
        setTrackAtIndex(tabIndexOf(currentTab), false);
        updateTabUI();
        return;
      }
      // می‌تواند چند تب را یک‌جا رد کند
      const progress = dx / swipeTabW;
      let target = Math.round(swipeStartIdx + progress);
      target = Math.max(0, Math.min(TAB_ORDER.length - 1, target));
      if (TAB_ORDER[target] !== currentTab) switchTab(TAB_ORDER[target]);
      else {
        setIndicatorAtIndex(target, false);
        updateTabUI();
      }
    }, { passive: true });


    /* —— Custom dark select (لیست تیره به‌جای منوی سفید سیستم) —— */
    let openDarkList = null;
    function ensureDarkSelectBackdrop() {
      let bd = document.getElementById('darkSelectBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'darkSelectBackdrop';
        bd.style.cssText = 'display:none;position:fixed;inset:0;z-index:340;background:transparent;';
        bd.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeDarkSelects(); });
        bd.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); closeDarkSelects(); }, { passive: false });
        document.body.appendChild(bd);
      }
      return bd;
    }
    function closeDarkSelects() {
      document.querySelectorAll('.dark-select-list.open').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.dark-select.is-open').forEach(w => w.classList.remove('is-open'));
      openDarkList = null;
      const bd = document.getElementById('darkSelectBackdrop');
      if (bd) bd.style.display = 'none';
    }
    /* منوی کشویی باز: هر لمس بیرون آن (ضربه، نگه‌داشتن یا شروع کشیدن برای اسکرول) همان لحظه می‌بندد */
    (function () {
      var outside = function (t) { return !(t && t.closest && (t.closest('.dark-select-list') || t.closest('.dark-select'))); };
      var shut = function (e) { if (!openDarkList) return; if (outside(e.target)) closeDarkSelects(); };
      document.addEventListener('pointerdown', shut, true);
      document.addEventListener('touchstart', shut, { capture: true, passive: true });
      /* اسکرول با چرخ موس بیرون فهرست؛ اسکرولِ خودِ صفحه (مثلاً با بسته شدن کیبورد) منو را نمی‌بندد */
      document.addEventListener('wheel', shut, { capture: true, passive: true });
    })();
    function isDarkSelectTarget(t) {
      return !!(t && t.closest && (t.closest('.dark-select') || t.closest('.dark-select-list') || t.id === 'darkSelectBackdrop'));
    }
    function openAddRowCountMenu(anchorBtn, onPick) {
      closeDarkSelects();
      let list = document.getElementById('addRowCountList');
      if (list) list.remove();
      list = document.createElement('div');
      list.id = 'addRowCountList';
      list.className = 'dark-select-list add-row-count-list';
      for (let n = 1; n <= 5; n++) {
        const it = document.createElement('div');
        it.className = 'dark-select-item';
        it.textContent = toPersianDigits(n) + ' ردیف';
        it.onclick = (e) => {
          e.stopPropagation();
          try { list.remove(); } catch (err) {}
          const bd = document.getElementById('darkSelectBackdrop');
          if (bd) bd.style.display = 'none';
          openDarkList = null;
          onPick(n);
        };
        list.appendChild(it);
      }
      document.body.appendChild(list);
      const r = anchorBtn.getBoundingClientRect();
      list.style.top = Math.min(r.bottom + 4, window.innerHeight * 0.7) + 'px';
      list.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
      list.style.left = 'auto';
      list.classList.add('open');
      openDarkList = list;
      const bd = ensureDarkSelectBackdrop();
      bd.style.display = 'block';
    }
    /* ۱.۳.۷۱: وقتی ماهِ جاری باز است، زیر اسم ماه کوچک و آبی: «یکشنبه ۱۰» */
    var HK_WD_JS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    /* ۱.۳.۷۴: روز از داخل باکس ماه برداشته شد؛ تاریخ کامل امروز (شمسی + میلادی) در یک خط باریک بالای کارت،
       در فاصلهٔ خالی زیر نوار ماه/سال — همیشه در صفحهٔ اصلی دیده می‌شود و جای چیزی را نمی‌گیرد */
    var HK_EN_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], HK_EN_MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function hkTodayLineText() {
      var t = getTodayPersian(), d = new Date();
      return { fa: 'امروز ' + HK_WD_JS[d.getDay()] + ' ' + toPersianDigits(String(t.d)) + ' ' + MONTHS[t.m - 1] + ' ' + toPersianDigits(String(t.y)),
        en: HK_EN_WD[d.getDay()] + ', ' + d.getDate() + ' ' + HK_EN_MO[d.getMonth()] + ' ' + d.getFullYear() };
    }
    function hkMonthTodayMark() {
      try {
        var mw = document.getElementById('monthSelectWrap');
        var btn = mw && mw.querySelector('.dark-select-btn');
        if (btn) { var sm = btn.querySelector('.hk-mtoday'); if (sm) sm.remove(); btn.classList.remove('hk-has-today', 'hk-today-tight', 'hk-today-xtight', 'hk-today-xx'); }
        var bar = document.querySelector('.top-bar'); if (!bar) return;
        var ln = document.getElementById('hkTodayLine');
        if (!ln) { ln = document.createElement('div'); ln.id = 'hkTodayLine'; ln.className = 'hk-today-line'; ln.innerHTML = '<b></b><i aria-hidden="true">|</i><span dir="ltr"></span>'; bar.appendChild(ln); }
        var x = hkTodayLineText();
        if (ln.firstChild.textContent !== x.fa) ln.firstChild.textContent = x.fa;
        if (ln.lastChild.textContent !== x.en) ln.lastChild.textContent = x.en;
        hkTodayLinePlace();
      } catch (e) {}
    }
    /* ۱.۳.۸۰: تاریخ روز دقیقاً وسط ارتفاع فاصلهٔ لبهٔ پایین سه باکس بالا و لبهٔ بالای باکس کارت — از روی خود صفحه حساب می‌شود */
    function hkTodayLinePlace() {
      try {
        var ln = document.getElementById('hkTodayLine'), bar = document.querySelector('.top-bar'); if (!ln || !bar || !ln.offsetHeight) return;
        var card = null;
        document.querySelectorAll('#panel-home .person-card').forEach(function (c) { if (!card && c.offsetHeight && c.getBoundingClientRect().width) card = c; });
        if (!card) return;
        var br = bar.getBoundingClientRect(), bot = 0;
        ['menuBtn', 'monthSelectWrap', 'yearSelectWrap'].forEach(function (id) { var e = document.getElementById(id); if (e && e.offsetHeight) bot = Math.max(bot, e.getBoundingClientRect().bottom); });
        if (!bot) bot = br.bottom;
        var ct = card.getBoundingClientRect().top;
        if (!(ct > bot)) return;
        var b = ln.querySelector('b'), lr = ln.getBoundingClientRect(), tr = b ? b.getBoundingClientRect() : lr;
        var glyphOff = (tr.top + tr.height / 2) - (lr.top + lr.height / 2);
        var mid = (bot + ct) / 2;
        var top = mid - br.top - ln.offsetHeight / 2 - glyphOff;
        ln.style.top = (Math.round(top * 2) / 2) + 'px';
      } catch (e) {}
    }
    (function () {
      var sch = function () { clearTimeout(sch._t); sch._t = setTimeout(hkTodayLinePlace, 60); };
      window.addEventListener('resize', sch);
      var hook = function () {
        try {
          if (window.ResizeObserver && !hook._ro) {
            hook._ro = new ResizeObserver(sch);
            var bar = document.querySelector('.top-bar'), hc = document.getElementById('homeCards'); if (bar) hook._ro.observe(bar); if (hc) hook._ro.observe(hc);
          }
        } catch (e) {}
        sch();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(hook, 800); }); else setTimeout(hook, 800);
      setTimeout(sch, 2500);
    })();
    function hkMonthTodayWatch() {
      var mw = document.getElementById('monthSelectWrap'), yw = document.getElementById('yearSelectWrap');
      if (!mw || mw._hkTodayW) return; mw._hkTodayW = true;
      try {
        var mo = new MutationObserver(function () { hkMonthTodayMark(); });
        mo.observe(mw, { attributes: true, attributeFilter: ['data-value'], childList: true, subtree: true });
        if (yw) mo.observe(yw, { attributes: true, attributeFilter: ['data-value'] });
      } catch (e) {}
      document.addEventListener('visibilitychange', function () { if (!document.hidden) hkMonthTodayMark(); });
      setInterval(hkMonthTodayMark, 60000);
      hkMonthTodayMark();
    }
    (function () { var n = 0; var go = function () { if (document.getElementById('monthSelectWrap')) { try { hkMonthTodayWatch(); } catch (e) {} return; } if (++n < 60) setTimeout(go, 250); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0); })();
    function createDarkSelect({ options, value, onChange, id, align, listClassName, listMinWidth }) {
      const wrap = document.createElement('div');
      wrap.className = 'dark-select';
      if (id) wrap.id = id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dark-select-btn';
      const list = document.createElement('div');
      list.className = 'dark-select-list' + (listClassName ? (' ' + listClassName) : '');
      document.body.appendChild(list); // fixed to body for overflow

      function labelOf(v) {
        const o = options.find(x => String(x.value) === String(v));
        if (o) return o.label;
        // مقدار نامعتبر (مثلاً id انگلیسی قدیمی) → اولین/آخرین گزینه معتبر
        const none = options.find(x => x.value === '' || x.value == null);
        if (none) return none.label;
        return (options[0] && options[0].label) || '—';
      }
      function setValue(v, silent) {
        wrap.dataset.value = v;
        btn.textContent = labelOf(v);
        list.querySelectorAll('.dark-select-item').forEach(it => {
          it.classList.toggle('selected', String(it.dataset.value) === String(v));
        });
        if (!silent && onChange) onChange(v);
      }
      options.forEach(o => {
        const it = document.createElement('div');
        it.className = 'dark-select-item';
        it.dataset.value = o.value;
        it.textContent = o.label;
        it.onclick = (e) => {
          e.stopPropagation();
          setValue(o.value);
          closeDarkSelects();
        };
        list.appendChild(it);
      });
      setValue(value, true);
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = list.classList.contains('open');
        closeDarkSelects();
        if (wasOpen) return;
        const r = btn.getBoundingClientRect();
        // همیشه رو به پایین با ارتفاع کافی برای دیدن گزینه‌ها
        const top = r.bottom + 4;
        const spaceBelow = Math.max(120, window.innerHeight - top - 8);
        list.style.zIndex = '100920';
        list.style.top = top + 'px';
        list.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 140)) + 'px';
        list.style.maxHeight = Math.max(160, Math.min(spaceBelow, 280)) + 'px';
        list.style.overflowY = 'auto';
        const minW = (listMinWidth === undefined || listMinWidth === null) ? 120 : listMinWidth;
        list.style.width = Math.max(r.width, minW) + 'px';
        list.classList.add('open');
        /* پایین صفحه جا نیست → رو به بالا باز شود (مثلاً منوی حسابِ آخرین پوشهٔ ثبت گروهی) */
        try {
          const lh = list.offsetHeight, below = window.innerHeight - r.bottom - 8, above = r.top - 8;
          if (lh > below && above > below) {
            const h = Math.min(lh, Math.max(120, above - 4));
            list.style.maxHeight = h + 'px';
            list.style.top = Math.max(8, r.top - 4 - Math.min(lh, h)) + 'px';
            list.classList.add('dl-up');
          } else list.classList.remove('dl-up');
        } catch (eUp) {}
        wrap.classList.add('is-open');
        openDarkList = list;
        const bd = ensureDarkSelectBackdrop();
        bd.style.display = 'block';
        bd.style.zIndex = '100910';
        /* گزینهٔ انتخاب‌شده وسط فهرست؛ بدون scrollIntoView که صفحهٔ پشت را هم اسکرول می‌کرد و فهرست همان لحظه بسته می‌شد */
        const sel = list.querySelector('.selected');
        if (sel) try { list.scrollTop = Math.max(0, sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2); } catch (err) {}
        window._hkMenuOpenAt = Date.now();
      };
      wrap.appendChild(btn);
      wrap.getValue = () => wrap.dataset.value;
      wrap.setValue = (v) => setValue(v, true);
      wrap._list = list;
      wrap._btn = btn;
      return wrap;
    }

    /* —— Period —— */
    function initSelectors() {
      const topBar = document.querySelector('.top-bar');
      const oldMs = document.getElementById('monthSelect');
      const oldYs = document.getElementById('yearSelect');
      const menuBtn = document.getElementById('menuBtn');
      // فقط یک‌بار ارتقا — بعد از init، select مخفی هنوز SELECT است و نباید دوباره wrap بسازد
      const alreadyEnhanced = !!document.getElementById('monthSelectWrap');
      if (!alreadyEnhanced && oldMs && oldMs.tagName === 'SELECT' && oldMs.classList.contains('period-select')) {
        const monthOpts = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
        const yearOpts = [];
        for (let y = YEAR_START; y <= YEAR_END; y++) yearOpts.push({ value: y, label: toPersianDigits(y) });
        const ms = createDarkSelect({
          id: 'monthSelectWrap',
          options: monthOpts,
          value: currentMonth,
          onChange: (v) => {
            // فقط مقدار hidden را عوض کن — currentMonth بعد از persist در onPeriodChange عوض می‌شود
            document.getElementById('monthSelect').value = v;
            onPeriodChange();
          }
        });
        // hidden native for compatibility
        const hiddenM = document.createElement('select');
        hiddenM.id = 'monthSelect';
        hiddenM.style.display = 'none';
        monthOpts.forEach(o => {
          const op = document.createElement('option');
          op.value = o.value; op.textContent = o.label;
          hiddenM.appendChild(op);
        });
        hiddenM.value = currentMonth;
        const ys = createDarkSelect({
          id: 'yearSelectWrap',
          options: yearOpts,
          value: currentYear,
          onChange: (v) => {
            document.getElementById('yearSelect').value = v;
            onPeriodChange();
          }
        });
        const hiddenY = document.createElement('select');
        hiddenY.id = 'yearSelect';
        hiddenY.style.display = 'none';
        yearOpts.forEach(o => {
          const op = document.createElement('option');
          op.value = o.value; op.textContent = o.label;
          hiddenY.appendChild(op);
        });
        hiddenY.value = currentYear;
        oldMs.replaceWith(ms);
        oldYs.replaceWith(ys);
        topBar.appendChild(hiddenM);
        topBar.appendChild(hiddenY);
        // ترتیب بصری RTL: راست = همبرگر، بعد ماه، چپ = سال
        if (menuBtn) {
          topBar.insertBefore(menuBtn, topBar.firstChild);
          topBar.insertBefore(ms, menuBtn.nextSibling);
          topBar.insertBefore(ys, ms.nextSibling);
        }
      } else {
        // already enhanced — sync values + حذف wrap تکراری در صورت وجود
        const topBarEl = document.querySelector('.top-bar');
        if (topBarEl) {
          const wrapsM = topBarEl.querySelectorAll('#monthSelectWrap');
          const wrapsY = topBarEl.querySelectorAll('#yearSelectWrap');
          wrapsM.forEach((el, i) => { if (i > 0) try { el.remove(); } catch (e) {} });
          wrapsY.forEach((el, i) => { if (i > 0) try { el.remove(); } catch (e) {} });
        }
        const mw = document.getElementById('monthSelectWrap');
        const yw = document.getElementById('yearSelectWrap');
        if (mw && mw.setValue) mw.setValue(currentMonth);
        if (yw && yw.setValue) yw.setValue(currentYear);
        try { hkMonthTodayWatch(); } catch (eTw) {}
        const hm = document.getElementById('monthSelect');
        const hy = document.getElementById('yearSelect');
        if (hm) hm.value = currentMonth;
        if (hy) hy.value = currentYear;
      }
    }

        
    function navigateToPeriod(y, m) {
      y = parseInt(y, 10);
      m = parseInt(m, 10);
      if (!y || !m) return;
      try { persistCurrent(); } catch (e0) {}
      currentYear = y;
      currentMonth = m;
      try {
        var hm = document.getElementById('monthSelect');
        var hy = document.getElementById('yearSelect');
        var mw = document.getElementById('monthSelectWrap');
        var yw = document.getElementById('yearSelectWrap');
        if (hm) hm.value = String(m);
        if (hy) hy.value = String(y);
        /* سینک هایلایت آبی منوی کشویی ماه/سال */
        if (mw && typeof mw.setValue === 'function') {
          try { mw.setValue(m); } catch (eM) {}
        } else if (mw) {
          var btn = mw.querySelector('.dark-select-btn');
          if (btn) btn.textContent = MONTHS[m - 1] || String(m);
          try {
            (mw._list || document).querySelectorAll && (mw._list || { querySelectorAll: function(){ return []; } }).querySelectorAll('.dark-select-item').forEach(function(it) {
              it.classList.toggle('selected', String(it.dataset.value) === String(m));
            });
          } catch (eMl) {}
        }
        if (yw && typeof yw.setValue === 'function') {
          try { yw.setValue(y); } catch (eY) {}
        } else if (yw) {
          var ybtn = yw.querySelector('.dark-select-btn');
          if (ybtn) ybtn.textContent = (typeof toPersianDigits === 'function') ? toPersianDigits(String(y)) : String(y);
          try {
            if (yw._list) yw._list.querySelectorAll('.dark-select-item').forEach(function(it) {
              it.classList.toggle('selected', String(it.dataset.value) === String(y));
            });
          } catch (eYl) {}
        }
        if (typeof hm._fancyRender === 'function') try { hm._fancyRender(); } catch (e2) {}
        if (typeof hy._fancyRender === 'function') try { hy._fancyRender(); } catch (e4) {}
      } catch (eSel) {}
      try { loadCurrent(); } catch (eL) {}
      try { renderAll(); } catch (eR) {}
      try {
        if (typeof updateMonthYearUI === 'function') updateMonthYearUI();
      } catch (eU) {}
    }

function onPeriodChange() {
      // اول ماه فعلی را با دادهٔ فعلی ذخیره کن + موجودی آنی نمایش‌داده‌شده
      const endingPeople = (typeof computePersonEndingInstants === 'function') ? computePersonEndingInstants() : {};
      const endingAcc = (typeof computeAccountEndingBalances === 'function') ? computeAccountEndingBalances() : {};
      const prevKey = (currentYear || 0) * 100 + (currentMonth || 0);
      persistCurrent();
      const hm = document.getElementById('monthSelect');
      const hy = document.getElementById('yearSelect');
      const newM = hm ? parseInt(hm.value, 10) : currentMonth;
      const newY = hy ? parseInt(hy.value, 10) : currentYear;
      if (newM === currentMonth && newY === currentYear) {
        renderAll();
        return;
      }
      const nextKey = (newY || 0) * 100 + (newM || 0);
      currentMonth = newM || currentMonth;
      currentYear = newY || currentYear;
      loadCurrent();
      // اگر به ماه جلوتر رفتیم، موجودی آنی نمایش‌داده‌شده‌ی ماه قبل را به‌عنوان ورودی اولیه بنشان
      // (نه برای ماه‌های آینده: موجودی آن‌ها هنوز معلوم نیست و عدد کهنه وقتی ماه برسد اشتباه می‌شد)
      var _tdy = getTodayPersian();
      if (nextKey > prevKey && nextKey <= _tdy.y * 100 + _tdy.m) {
        try {
          if (!periodData.personOpeningInstant || typeof periodData.personOpeningInstant !== 'object')
            periodData.personOpeningInstant = {};
          if (!periodData.accountOpeningInstant || typeof periodData.accountOpeningInstant !== 'object')
            periodData.accountOpeningInstant = {};
          /* انتقال موجودی پایان ماه قبل → اول ماه جدید (فقط کلیدهای خالی؛ ذخیره‌شده‌های آرشیو حفظ شوند) */
          Object.keys(endingPeople || {}).forEach(function(k) {
            if (periodData.personOpeningInstant[k] == null || periodData.personOpeningInstant[k] === '')
              periodData.personOpeningInstant[k] = endingPeople[k];
          });
          Object.keys(endingAcc || {}).forEach(function(k) {
            if (periodData.accountOpeningInstant[k] == null || periodData.accountOpeningInstant[k] === '')
              periodData.accountOpeningInstant[k] = endingAcc[k];
          });
          /* اگر اصلاً opening حساب نداریم، کل endingAcc را بنشان */
          if (!Object.keys(periodData.accountOpeningInstant).length && endingAcc && Object.keys(endingAcc).length) {
            periodData.accountOpeningInstant = Object.assign({}, endingAcc);
          }
          /* موجودی زمان ایجاد کارت قفل است — با پایان ماه عوض نشود */
        } catch (eC) {}
      }
      // ماه جدید را هم در آرشیو ثبت کن (اگر فقط هدر کپی شده)
      persistCurrent();
      renderAll();
      try { if (typeof renderHomeCards === 'function') renderHomeCards(); } catch (eR) {}
      saveArchive();
    }

    /* —— Storage —— */
    function persistCurrent() {
      /* ۱.۳.۸۴: ردیف‌های تازهٔ مخارج دستهٔ خودشان را روی خود ردیف می‌گیرند */
      try { if (periodData && periodData.expense && typeof HKCategorizer !== 'undefined') hkCatStampSide(periodData.expense); } catch (eSt) {}
      archive[periodKey(currentYear, currentMonth)] = JSON.parse(JSON.stringify(periodData));
    }

    function normalizeSide(side) {
      if (!side || !side.sections) return { sections: [], nextId: 1 };
      // کپی عمیق — تا ماه‌ها به هم وصل نباشند
      const copy = JSON.parse(JSON.stringify(side));
      (copy.sections || []).forEach(sec => {
        if (!sec.rows) sec.rows = [emptyRow()];
        sec.rows.forEach(r => {
          if (r.day === undefined) r.day = '';
          if (!r.status) r.status = 'paid';
        });
      });
      if (!copy.nextId) copy.nextId = (copy.sections.length || 0) + 1;
      return copy;
    }

    function findHeaderTemplate() {
      // نزدیک‌ترین ماه قبلی که هدر دارد
      const keys = Object.keys(archive || {});
      let best = null, bestScore = -1;
      const cur = currentYear * 100 + currentMonth;
      keys.forEach(k => {
        const parts = k.split('-');
        const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
        if (!y || !m) return;
        const score = y * 100 + m;
        if (score >= cur) return;
        const pd = archive[k];
        if (!pd) return;
        const has = ['expense', 'income'].some(tab =>
          (pd[tab] && pd[tab].sections || []).some(s => (s.title || '').trim())
        );
        if (!has) return;
        if (score > bestScore) { bestScore = score; best = pd; }
      });
      return best; // فقط ماه‌های قبل — نه کپی از ماه‌های جلو
    }
    function cloneHeadersOnly(src) {
      const out = emptyPeriodData();
      out.ledger = { sections: [], nextId: 1 };
      ['expense', 'income'].forEach(tab => {
        const secs = (src[tab] && src[tab].sections) || [];
        const named = secs.filter(s => (s.title || '').trim());
        if (!named.length) return;
        out[tab].sections = named.map((s, i) => ({
          id: 's' + (i + 1),
          title: (s.title || '').trim(),
          color: s.color || tabAccentColor(tab),
          headerBg: s.headerBg,
          collapsed: true,
          rows: [emptyRow()]
        }));
        out[tab].nextId = named.length + 1;
      });
      return out;
    }
    function loadCurrent() {
      const raw = archive[periodKey(currentYear, currentMonth)];
      // cardMeta را از آرشیو ماه یا localStorage جداگانه نگه دار
      let savedCardMeta = {};
      try {
        if (raw && raw.cardMeta && typeof raw.cardMeta === 'object') {
          savedCardMeta = JSON.parse(JSON.stringify(raw.cardMeta));
        }
      } catch (e) {}
      try {
        if (!savedCardMeta || !Object.keys(savedCardMeta).length) {
          const cm = localStorage.getItem(STORAGE_KEY + '_cardMeta');
          if (cm) savedCardMeta = JSON.parse(cm) || {};
        }
      } catch (e) {}
      if (raw) {
        if (raw.sections && !raw.expense) {
          periodData = {
            expense: { sections: raw.sections, nextId: raw.nextId || 3 },
            income: { sections: emptySections(), nextId: 3 },
            ledger: normalizeLedger(raw.ledger),
            cardMeta: savedCardMeta || {}
          };
        } else {
          periodData = {
            expense: normalizeSide(raw.expense),
            income: normalizeSide(raw.income),
            ledger: normalizeLedger(raw.ledger),
            cardMeta: savedCardMeta || {}
          };
        }
        /* بازگردانی موجودی‌های اولیه ماه از آرشیو — جلوی بازنویسی اشتباه هنگام برگشت به ماه */
        try {
          if (raw.accountOpeningInstant && typeof raw.accountOpeningInstant === 'object') {
            periodData.accountOpeningInstant = JSON.parse(JSON.stringify(raw.accountOpeningInstant));
          }
          if (raw.personOpeningInstant && typeof raw.personOpeningInstant === 'object') {
            periodData.personOpeningInstant = JSON.parse(JSON.stringify(raw.personOpeningInstant));
          }
        } catch (eRest) {}
      } else {
        // ماه جدید: فقط هدرها از ماه‌های قبل، بدون ردیف
        const tmpl = findHeaderTemplate();
        periodData = tmpl ? cloneHeadersOnly(tmpl) : emptyPeriodData();
        if (savedCardMeta && Object.keys(savedCardMeta).length) {
          periodData.cardMeta = savedCardMeta;
        }
      }
      if (!periodData.ledger) periodData.ledger = { sections: [], nextId: 1 };
      else periodData.ledger = normalizeLedger(periodData.ledger);
      /* ۱.۳.۵۰: رابطهٔ قرض از ماه ساختش به بعد در همهٔ ماه‌ها: رابطه‌های نزدیک‌ترین ماه قبلیِ دارای قرض که این ماه ندارد، اینجا هم می‌آیند
         (ماه‌های قبل از ساخت رابطه دست نمی‌خورند) */
      try {
        var _curN = currentYear * 100 + currentMonth, _bestK = null, _bestN = -1;
        Object.keys(archive || {}).forEach(function (k) {
          var p = String(k).split('-'), n = (+p[0]) * 100 + (+p[1]), pd0 = archive[k];
          if (!(n < _curN) || n <= _bestN || !pd0 || !pd0.ledger || !Array.isArray(pd0.ledger.sections)) return;
          if (!pd0.ledger.sections.some(function (s) { return (s.personA || '').trim() || (s.personB || '').trim(); })) return;
          _bestN = n; _bestK = k;
        });
        if (_bestK) {
          var _have = {}; (periodData.ledger.sections || []).forEach(function (s) { if (s && s.id) _have[s.id] = 1; });
          try { hkLedGone().forEach(function (id) { _have[id] = 1; }); } catch (eG) {}
          var _add = archive[_bestK].ledger.sections.filter(function (s) { return s && s.id && !_have[s.id] && ((s.personA || '').trim() || (s.personB || '').trim()); });
          if (_add.length) {
            var _sec = periodData.ledger.sections.filter(function (s) { return (s.personA || '').trim() || (s.personB || '').trim() || (s.rows || []).some(function (r) { return r && (r.amount || r.desc); }); });
            /* ۱.۳.۵۶: فقط خود رابطه (ردیف‌های تسویه‌نشدهٔ قبلی در جدول پیوسته از ماه خودشان نشان داده می‌شوند) */
            periodData.ledger.sections = _sec.concat(_add.map(function (s) { return { id: s.id, personA: s.personA || '', personB: s.personB || '', collapsed: s.collapsed, createdBy: s.createdBy, createdByName: s.createdByName, rows: [] }; }));
          }
        }
      } catch (eLc) {}
      if (!periodData.cardMeta || typeof periodData.cardMeta !== 'object') periodData.cardMeta = savedCardMeta || {};
      // همگام‌سازی persistent mirror
      try {
        if (periodData.cardMeta && Object.keys(periodData.cardMeta).length) {
          localStorage.setItem(STORAGE_KEY + '_cardMeta', JSON.stringify(periodData.cardMeta));
        }
      } catch (e) {}
      ['expense', 'income'].forEach(tab => {
        const prev = currentTab;
        currentTab = tab;
        (periodData[tab].sections || []).forEach(sec => {
          sec.color = tabAccentColor(tab);
          sortSectionRows(sec.id);
        });
        currentTab = prev;
      });
      // بخش‌های متصل به اقساط تا آخرین سررسید + ردیف خودکار این ماه
      ensureAllLinkedPlanSections();
      syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
      try { syncCardOrderForPeriod(); } catch (eOrd) {}
    }

    /* رفرش سنگین UI (کارت‌های صفحهٔ اصلی، خلاصهٔ اقساط) هنگام تایپ پشت‌سرهم یک‌جا و با تأخیر کوتاه؛
       وقتی منویی روی صفحهٔ اصلی باز است، کارت‌ها همان موقع بستن منو رندر می‌شوند (closeFeatureSheet) */
    var _uiFlushTimer = 0;
    function flushUiAfterChange() {
      try {
        if (typeof scheduleSummaryUpdate === 'function') scheduleSummaryUpdate();
      } catch (e0) {}
      clearTimeout(_uiFlushTimer);
      _uiFlushTimer = setTimeout(_flushUiHeavy, 220);
    }
    function _flushUiHeavy() {
      try {
        if (typeof checkInstallReminders === 'function') checkInstallReminders();
      } catch (e1) {}
      try {
        if (typeof updateInstallSummary === 'function') updateInstallSummary();
      } catch (e2) {}
      try {
        var hc = document.getElementById('homeCards');
        var sheetOpen = (typeof _featureActive !== 'undefined' && _featureActive);
        if (hc && !sheetOpen && typeof renderHomeCards === 'function') {
          /* صفحه اصلی کارت‌ها — موجودی آنی و مانده */
          renderHomeCards();
        }
      } catch (e3) {}
    }
    function _flushPendingSave() {
      if (!saveTimer) return;
      clearTimeout(saveTimer); saveTimer = null;
      try { persistCurrent(); } catch (e) {}
      try { saveArchive(); } catch (e) {}
    }
    function scheduleSave() {
      touchLocal();
      try { flushUiAfterChange(); } catch (eF) {}
      clearTimeout(saveTimer);
      /* ذخیره بعد از مکث کوتاه در تایپ (نه بعد از هر حرف)؛ هنگام رفتن نرم‌افزار به پس‌زمینه فوراً ذخیره می‌شود */
      saveTimer = setTimeout(() => {
        saveTimer = null;
        try { persistCurrent(); } catch (e) {}
        try { saveArchive(); } catch (e) {}
      }, 450);
    }
    try {
      document.addEventListener('visibilitychange', function () { if (document.hidden) _flushPendingSave(); });
      window.addEventListener('pagehide', _flushPendingSave);
      window.addEventListener('beforeunload', _flushPendingSave);
    } catch (eFS) {}

    /* —— به‌روزرسانی خلاصه با debounce برای جلوگیری از لگ هنگام تایپ —— */
    let _summaryTimer = null;
    function scheduleSummaryUpdate() {
      if (_summaryTimer) cancelAnimationFrame(_summaryTimer);
      _summaryTimer = requestAnimationFrame(() => {
        _summaryTimer = null;
        try {
          if (currentTab === 'income' || currentTab === 'expense') updateSummaryForTab(currentTab);
          if (currentTab === 'balance') updateBalance();
        } catch (e) {}
      });
    }


