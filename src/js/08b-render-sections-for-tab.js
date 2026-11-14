    function renderSectionsForTab(tab) {
      const container = document.getElementById(tab === 'income' ? 'sections-income' : 'sections-expense');
      if (!container) return;
      const prev = currentTab;
      currentTab = tab;
      const frag = document.createDocumentFragment();
      (periodData[tab].sections || []).forEach(sec => frag.appendChild(buildSectionEl(sec)));
      container.innerHTML = '';
      container.appendChild(frag);
      updateSummaryForTab(tab);
      currentTab = prev;
      enableLongPressReorder(container, '.section', (ids) => {
        const t = tab;
        const secs = periodData[t].sections || [];
        const map = {};
        secs.forEach(s => { map[s.id] = s; });
        const ordered = ids.map(id => map[id]).filter(Boolean);
        // اگر چیزی جا مانده بود اضافه کن
        secs.forEach(s => { if (!ids.includes(s.id)) ordered.push(s); });
        periodData[t].sections = ordered;
        updateSummaryForTab(t);
        scheduleSave();
      });
    }
    function preRenderAdjacentTabs() {
      // همه تب‌ها برای سوایپ چندتایی
      TAB_ORDER.forEach(t => {
        if (t === 'income' || t === 'expense') renderSectionsForTab(t);
        else if (t === 'install') renderPlans();
        else if (t === 'balance') renderBalanceTab();
        else if (t === 'ledger') renderLedgerTab();
      });
      if (currentTab === 'recurring') renderRecurringBar();
      else {
        const rb = document.getElementById('recurringBox');
        if (rb) rb.remove();
      }
    }
    function renderAll() {
      // اگر داخل جزئیات کارت هستیم فقط همان را رندر کن — نه لیست قدیمی bank-card
      try {
        if (typeof _detailContext !== 'undefined' && _detailContext) {
          if (_detailContext.kind === 'income' || _detailContext.kind === 'expense') {
            try { renderPersonDetailPanel(_detailContext.kind, _detailContext.title); } catch (e) {}
          } else if (_detailContext.kind === 'balance') {
            try { renderBalanceTab(); } catch (e) {}
          }
          // از رندر sections قدیمی خارج شو
          document.querySelectorAll('body > .dark-select-list').forEach(el => {
            const wraps = document.querySelectorAll('.dark-select');
            let used = false;
            wraps.forEach(w => { if (w._list === el) used = true; });
            if (!used) el.remove();
          });
          return;
        }
      } catch (e) {}
      try { if (typeof renderHomeCards === 'function' && currentTab === 'home') renderHomeCards(); } catch (e) {}
      try {
        if (currentTab === 'income' || currentTab === 'expense') {
          // فقط اگر نه در حالت خانه هستیم (نباید برسد)
          if (currentTab !== 'home') {
            /* no full section list in home-ui */
          }
        }
      } catch (e) {}
      // حذف لیست‌های کشویی رهاشده (مثلاً از ردیف‌هایی که دیگر وجود ندارند)
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      // درآمد ثابت دیگر روی تب درآمد نیست — فقط پنل جدا
      const rbOld = document.getElementById('recurringBox');
      if (rbOld && currentTab !== 'recurring') {
        try { rbOld.remove(); } catch (e) {}
      }
      if (currentTab === 'install') {
        renderPlans();
      } else if (currentTab === 'balance') {
        renderBalanceTab();
      } else if (currentTab === 'ledger') {
        renderLedgerTab();
      } else if (currentTab === 'recurring') {
        renderRecurringBar();
      }
      if (currentTab === 'home') {
        activatePanel('home');
        try { renderHomeCards(); } catch (e) {}
      } else {
        activatePanel(currentTab);
      }
      checkInstallReminders();
      try { moveTabIndicator(); } catch (e) {}
    
      try { if (typeof refreshOpenProjectViews === 'function') refreshOpenProjectViews(null, { report: false }); } catch (eRV) {}
    }

    /* —— حساب‌های بانکی —— */
    const ALL_IRAN_BANKS = [
      'بانک ملی', 'بانک ملت', 'بانک مسکن', 'بانک صادرات', 'بلوبانک',
      'بانک سپه', 'بانک صنعت و معدن', 'بانک توسعه صادرات', 'بانک کشاورزی',
      'بانک توسعه تعاون', 'بانک تجارت', 'بانک رفاه کارگران',
      'پست بانک', 'بانک اقتصاد نوین', 'بانک پارسیان', 'بانک پاسارگاد',
      'بانک کارآفرین', 'بانک سینا', 'بانک شهر', 'بانک دی',
      'بانک گردشگری', 'بانک آینده', 'بانک ایران‌زمین', 'بانک خاورمیانه',
      'موسسه اعتباری ملل', 'بانک قرض‌الحسنه مهر', 'بانک قرض‌الحسنه رسالت'
    ];

    /* —— ثبت از پیامک بانکی —— */
    let pendingSmsEntry = null;
    let smsPendingQueue = [];

    const BANK_SMS_ALIASES = [
      { keys: ['ملی', 'bmi', 'bam'], name: 'بانک ملی' },
      { keys: ['ملت', 'mellat', 'behpardakht'], name: 'بانک ملت' },
      { keys: ['صادرات', 'bsi'], name: 'بانک صادرات' },
      { keys: ['مسکن', 'maskan'], name: 'بانک مسکن' },
      { keys: ['سپه', 'sepah'], name: 'بانک سپه' },
      { keys: ['تجارت', 'tejarat'], name: 'بانک تجارت' },
      { keys: ['رفاه', 'refah'], name: 'بانک رفاه کارگران' },
      { keys: ['کشاورزی', 'bki'], name: 'بانک کشاورزی' },
      { keys: ['پاسارگاد', 'pasargad', 'bpi'], name: 'بانک پاسارگاد' },
      { keys: ['پارسیان', 'parsian'], name: 'بانک پارسیان' },
      { keys: ['سامان', 'saman'], name: 'بانک سامان' },
      { keys: ['اقتصاد نوین', 'enbank'], name: 'بانک اقتصاد نوین' },
      { keys: ['آینده', 'ayandeh'], name: 'بانک آینده' },
      { keys: ['شهر', 'shahr'], name: 'بانک شهر' },
      { keys: ['سینا', 'sina'], name: 'بانک سینا' },
      { keys: ['دی', 'daybank', 'bank day'], name: 'بانک دی' },
      { keys: ['کارآفرین', 'karafarin'], name: 'بانک کارآفرین' },
      { keys: ['گردشگری', 'tourism'], name: 'بانک گردشگری' },
      { keys: ['ایران زمین', 'ایران‌زمین', 'izbank'], name: 'بانک ایران‌زمین' },
      { keys: ['خاورمیانه', 'middle east'], name: 'بانک خاورمیانه' },
      { keys: ['رسالت', 'resalat'], name: 'بانک قرض‌الحسنه رسالت' },
      { keys: ['مهر ایران', 'قرض‌الحسنه مهر', 'مهر'], name: 'بانک قرض‌الحسنه مهر' },
      { keys: ['بلو', 'blubank', 'bluebank'], name: 'بلوبانک' },
      { keys: ['پست بانک', 'postbank'], name: 'پست بانک' },
      { keys: ['ملل'], name: 'موسسه اعتباری ملل' }
    ];

    /* ۱.۳.۹۵: ارتفاع صفحه‌کلید گوشی یادگرفته می‌شود تا پنجره‌هایی که صفحه‌کلید می‌خواهند از همان لحظهٔ اول
       طوری چیده شوند که انگار صفحه‌کلید باز است (با آمدن صفحه‌کلید هیچ چیز جلوی چشم نپرد) */
    var HK_KB_KEY = STORAGE_KEY + '_kbH';
    var _hkFullH = 0;
    function hkViewH() { var vv = window.visualViewport; return Math.round(vv ? vv.height : window.innerHeight); }
    function hkTypingNow() { var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && !a.readOnly); }
    function hkKbTrack() {
      var h = hkViewH();
      if (!_hkFullH || (!hkTypingNow() && h > _hkFullH - 100) || h > _hkFullH) _hkFullH = Math.max(h, hkTypingNow() ? 0 : h);
      if (hkTypingNow() && _hkFullH - h > 140) { try { localStorage.setItem(HK_KB_KEY, String(_hkFullH - h)); } catch (e) {} }
    }
    try { _hkFullH = hkViewH(); (window.visualViewport || window).addEventListener('resize', hkKbTrack); window.addEventListener('orientationchange', function () { _hkFullH = 0; setTimeout(hkKbTrack, 400); }); } catch (eKb) {}
    /* پایین جای آزاد بالای صفحه‌کلید (اگر هنوز نیامده: ارتفاع یادگرفته یا حدود ۴۲٪ صفحه) */
    function hkKbFreeBottom() {
      var vv = window.visualViewport, h = hkViewH(), full = Math.max(_hkFullH, h);
      if (full - h > 140) return (vv ? vv.offsetTop : 0) + h;
      var kb = parseInt(localStorage.getItem(HK_KB_KEY) || '0', 10);
      if (!(kb > 140 && kb < full * 0.7)) kb = Math.round(full * 0.42);
      return (vv ? vv.offsetTop : 0) + full - kb;
    }
    function openSmsImportModal() {
      // قفل اسکرول قبل از بستن منو تا پرش پشت مودال رخ ندهد
      lockBodyScroll();
      closeSideMenu();
      const ta = document.getElementById('smsImportText');
      if (ta) { ta.value = ''; ta.style.height = ''; }
      const m = document.getElementById('smsImportModal');
      if (m) {
        m.style.top = '0';
        m.style.height = '';
        /* ۱.۳.۸۸: باکس از اول بالای صفحه (جای صفحه‌کلید آزاد) و فوکوس همان لحظهٔ ضربه، تا باکس و صفحه‌کلید با هم بیایند و باکس نپرد */
        m.classList.add('hk-kb-top');
        m.classList.add('open');
        m.scrollTop = 0;
        /* ۱.۳.۹۵: همان لحظهٔ باز شدن، اندازهٔ نهایی (با صفحه‌کلید باز)
           ۱.۴.۰: چیدمان صفحه (تمام‌صفحه + سربرگ بک و نام) همین‌جا، پیش از اندازه‌گیری، تا بعداً چیزی جابه‌جا نشود */
        try { if (typeof window.hkPageDecorate === 'function') { m.classList.add('hk-page'); window.hkPageDecorate(m); } } catch (ePg) {}
        try {
          const box = m.querySelector('.modal-box'), over = hkBoxContentBottom(box) - (hkKbFreeBottom() - 8);
          if (ta && over > 0) ta.style.height = Math.max(56, Math.round(ta.getBoundingClientRect().height - over)) + 'px';
        } catch (eSz) {}
      }
      /* ۱.۴.۱: بی صفحه‌کلید باز می‌شود؛ صفحه‌کلید فقط با زدن روی جای متن (چیدمان از قبل برای آن آماده است، چیزی نمی‌پرد) */
      /* ۱.۳.۸۹: با آمدن صفحه‌کلید، جای متن کوتاه‌تر می‌شود تا همهٔ دکمه‌ها (و «ثبت گروهی») بالای صفحه‌کلید دیده شوند */
      hkSmsImportFit(true);
    }
    /* ۱.۳.۹۹: پایین محتوای باکس؛ در صفحهٔ تمام‌صفحه خود باکس تا پایین صفحه است، پس پایینِ آخرین چیزِ داخلش ملاک است */
    function hkBoxContentBottom(box) {
      if (!box) return 0;
      if (!box.closest('.hk-page')) return box.getBoundingClientRect().bottom;
      var b = 0; Array.prototype.forEach.call(box.children, function (c) { var r = c.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); });
      return b + 12;
    }
    function hkSmsImportFit(on) {
      const vv = window.visualViewport, m = document.getElementById('smsImportModal'), ta = document.getElementById('smsImportText');
      if (!m || !ta) return;
      /* ۱.۳.۹۵: فقط کوچک‌تر می‌شود (اگر صفحه‌کلید واقعی بلندتر از حدس بود)، هرگز بزرگ‌تر و دوباره کوچک؛ پنجره هم اسکرول نمی‌خورد */
      const fit = () => {
        try {
          if (!m.classList.contains('open')) return;
          m.scrollTop = 0;
          const box = m.querySelector('.modal-box'); if (!box) return;
          const viewBottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
          const over = hkBoxContentBottom(box) - (viewBottom - 8);
          if (over > 0) ta.style.height = Math.max(56, ta.getBoundingClientRect().height - over) + 'px';
        } catch (e) {}
      };
      if (m._hkFit) { if (vv) { vv.removeEventListener('resize', m._hkFit); vv.removeEventListener('scroll', m._hkFit); } window.removeEventListener('resize', m._hkFit); m._hkFit = null; }
      if (!on) { ta.style.height = ''; return; }
      m._hkFit = fit;
      if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
      window.addEventListener('resize', fit);
      [150, 350, 700].forEach(t => setTimeout(fit, t));
    }
    function closeSmsImportModal() {
      try { hkSmsImportFit(false); } catch (eF) {}
      const m = document.getElementById('smsImportModal');
      if (m) {
        m.classList.remove('open');
        m.style.top = '';
        m.style.height = '';
      }
      unlockBodyScroll();
    }
    /* ===== پیامک‌های ثبت‌نشده («بعداً») =====
       بستن باکس ثبت تراکنش با بازگشت یا زدن بیرون باکس = «بعداً»: پیامک گم نمی‌شود و در «پیامک‌های ثبت‌نشده» (منوی کناری) می‌ماند.
       فقط «ثبت» یا «رد» پیامک را از این فهرست برمی‌دارد. */
    var SMS_LATER_KEY = STORAGE_KEY + '_smsLater';
    function smsLaterLoad() {
      var a = [];
      try { a = JSON.parse(localStorage.getItem(SMS_LATER_KEY) || '[]'); a = Array.isArray(a) ? a.filter(function (x) { return x && x.raw; }) : []; } catch (e) { return []; }
      /* ۱.۳.۷۴: پیامک‌های واریز قسط ثبت‌نشده نمی‌مانند؛ به تاریخچهٔ کارت قسط می‌روند */
      try {
        var keep = a.filter(function (x) { var p = hkParseInstallSms(x.raw); if (p) { hkInstIngest(p, x.raw); return false; } return true; });
        if (keep.length !== a.length) { localStorage.setItem(SMS_LATER_KEY, JSON.stringify(keep)); a = keep; }
      } catch (eI) {}
      return a;
    }
    function smsLaterSave(list) {
      try { localStorage.setItem(SMS_LATER_KEY, JSON.stringify(list || [])); } catch (e) {}
      try { updateSmsLaterBadge(); } catch (e2) {}
    }
    function smsLaterAdd(entry) {
      if (!entry || !entry.raw) return;
      var raw = String(entry.raw).trim(), list = smsLaterLoad();
      if (list.some(function (x) { return String(x.raw).trim() === raw; })) return;
      list.unshift({ raw: String(entry.raw), sender: entry.sender || '', at: entry._laterAt || Date.now() });
      smsLaterSave(list.slice(0, 200));
    }
    function smsLaterRemove(raw) {
      raw = String(raw || '').trim(); if (!raw) return;
      var list = smsLaterLoad(), next = list.filter(function (x) { return String(x.raw).trim() !== raw; });
      if (next.length !== list.length) smsLaterSave(next);
    }
    function updateSmsLaterBadge() {
      var n = smsLaterLoad().length, b = document.getElementById('smsLaterBadge');
      if (b) { b.textContent = n ? toPersianDigits(String(n)) : ''; b.style.display = n ? '' : 'none'; }
    }
    /* فهرست «پیامک‌های ثبت‌نشده»: با زدن هر مورد همان باکس ثبت تراکنش باز می‌شود */
    function openSmsLaterModal() {
      try { if (typeof closeSideMenu === 'function') closeSideMenu(); } catch (eC) {}
      var old = document.getElementById('smsLaterOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'smsLaterOv'; ov.className = 'backup-pick-overlay hk-enc-ov';
      ov._hkCancel = function () { ov.remove(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      var list = smsLaterLoad();
      var html = '<div class="backup-pick-panel sms-later-panel" role="dialog"><div class="backup-pick-title">پیامک‌های ثبت‌نشده</div>';
      if (!list.length) html += '<div class="sms-later-empty">پیامک ثبت‌نشده‌ای نیست</div>';
      else {
        html += '<div class="sms-later-hint">پیامک‌هایی که باکس ثبتشان با بازگشت یا زدن بیرون باکس بسته شد. با زدن هر مورد، باکس ثبت تراکنش باز می‌شود.</div><div class="sms-later-list">';
        list.forEach(function (x, i) {
          var pr = null; try { pr = parseBankSms(x.raw); } catch (eP) {}
          var inc = pr && pr.type === 'income';
          var d = new Date(Number(x.at) || Date.now()), j = '';
          try { j = hkJStr(hkJalaliOfTs(d.getTime())); } catch (eJ) {}
          var hm = toPersianDigits(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
          var bank = ''; try { bank = (pr && (matchSelectedBank(pr.bank) || pr.bank)) || ''; } catch (eB) {}
          html += '<button type="button" class="sms-later-item" data-i="' + i + '"><span class="sli-top"><span class="sli-bank">' + escapeHtml(bank || 'پیامک بانکی') + ' · ' + (inc ? 'واریز' : 'برداشت') + '</span>' +
            '<span class="sli-amt ' + (inc ? 'inc' : 'exp') + '">' + (pr && pr.amount ? formatNum(pr.amount) : '—') + '</span></span>' +
            '<span class="sli-date">' + (j ? j + ' · ' : '') + hm + '</span></button>';
        });
        html += '</div>';
      }
      html += '<div class="backup-pick-actions"><button type="button" class="backup-pick-cancel" id="smsLaterClose">بستن</button></div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      ov.querySelector('#smsLaterClose').onclick = function () { ov.remove(); };
      ov.querySelectorAll('.sms-later-item').forEach(function (b) {
        b.onclick = function () {
          var x = list[parseInt(b.getAttribute('data-i'), 10)];
          ov.remove();
          if (x) smsLaterOpen(x);
        };
      });
    }
    function smsLaterOpen(x) {
      if (!x || !x.raw) return;
      if (typeof isSmsConfirmOpen === 'function' && isSmsConfirmOpen()) return;
      var parsed = null;
      try { parsed = parseBankSms(x.raw); } catch (e) {}
      if (!parsed || !parsed.amount) { smsLaterRemove(x.raw); try { showToast('این پیامک قابل تشخیص نبود'); } catch (e2) {} return; }
      try { parsed.bank = matchSelectedBank(parsed.bank); } catch (e3) {}
      parsed.raw = String(x.raw); if (x.sender) parsed.sender = x.sender;
      parsed._laterAt = x.at;
      pendingSmsEntry = parsed;
      openSmsConfirmModal(parsed);
      try { showSmsSenderWarning(parsed); } catch (eW) {}
    }
    (function () {
      function bindLater() {
        try { updateSmsLaterBadge(); } catch (e) {}
        /* زدن بیرون باکس ثبت تراکنش = «بعداً» (اگر همان لحظه فهرست کشویی یا باکس اطلاعات باز نبود) */
        var m = document.getElementById('smsConfirmModal');
        if (!m || m._hkLaterBound) return;
        m._hkLaterBound = true;
        var downOut = false;
        m.addEventListener('pointerdown', function (e) {
          downOut = e.target === m && !document.querySelector('.fancy-select-list.open, .dark-select-list.open') && !document.getElementById('hkInfoTip');
        });
        m.addEventListener('click', function (e) {
          if (e.target !== m || !downOut) return;
          downOut = false;
          if (isSmsConfirmOpen()) closeSmsConfirmModal('later');
        });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindLater); else bindLater();
    })();
    /* پیامک‌های ثبت‌شدهٔ اخیر (برای تشخیص ثبت جابه‌جا در تطبیق موجودی) */
    var SMS_DONE_KEY = STORAGE_KEY + '_smsDoneLog';
    function smsDoneLogLoad() { try { var a = JSON.parse(localStorage.getItem(SMS_DONE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function smsDoneLogAdd(pe) {
      try {
        if (!pe || !pe.raw || !pe.amount) return;
        var raw = String(pe.raw).trim(), list = smsDoneLogLoad().filter(function (x) { return x && x.raw !== raw; });
        list.unshift({ raw: raw, acc4: hkSmsAcc4(raw) || '', bank: (matchSelectedBank(pe.bank) || ''), y: parseInt(pe.year, 10) || currentYear, m: parseInt(pe.month, 10) || currentMonth, d: parseInt(pe.day, 10) || 0, v: pe.type === 'income' ? Number(pe.amount) : -Number(pe.amount) });
        localStorage.setItem(SMS_DONE_KEY, JSON.stringify(list.slice(0, 60)));
      } catch (e) {}
    }
    /* ۱.۳.۶۴: پنجرهٔ «احتمال ثبت تکراری» با دو کارت زیر هم: پیامک تازه و ثبت قبلی (متن پیامکش اگر در دفتر پیامک‌های ثبت‌شده باشد) */
    function hkDupFindPrevSms(cur, row) {
      try {
        var raw = String(cur.raw || '').trim(), A = Number(row.amount) || 0, rd = parseInt(toEnglishDigits(String(row.day || '')), 10) || 0;
        var sg = cur.type === 'income' ? 1 : -1, hit = null;
        smsDoneLogLoad().forEach(function (x) {
          if (hit || !x || !x.raw || String(x.raw).trim() === raw) return;
          var v = Number(x.v) || 0; if ((v > 0 ? 1 : -1) !== sg) return;
          if (Math.abs(Math.abs(v) - A) > Math.max(A, 1) * 0.01) return;
          if ((x.y && x.y !== cur.y) || (x.m && x.m !== cur.m)) return;
          if (rd && x.d && Math.abs(x.d - rd) > 1) return;
          if (row.account && x.bank && x.bank !== row.account) return;
          hit = x;
        });
        return hit;
      } catch (e) { return null; }
    }
    function hkAskDupCompare(cur, hit, onYes) {
      var row = hit.row || {}, prev = hkDupFindPrevSms(cur, row);
      var nTime = cur.raw ? hkSmsTime(cur.raw, Number(cur.at) || 0) : '';
      var oTime = row.time || (prev ? hkSmsTime(prev.raw, 0) : '');
      var nDay = parseInt(toEnglishDigits(String(cur.day || '')), 10) || 0, oDay = parseInt(toEnglishDigits(String(row.day || '')), 10) || 0;
      var nAcc = String(cur.account || '').trim(), oAcc = String(row.account || '').trim();
      var nAmt = Number(cur.amount) || 0, oAmt = Number(row.amount) || 0;
      function f(lbl, val, diff) { return '<span class="hk-dc-f' + (diff ? ' hk-dc-diff' : '') + '"><i>' + lbl + '</i> ' + escapeHtml(val || '—') + '</span>'; }
      function card(title, amt, day, time, acc, body, other) {
        return '<div class="hk-dc-card"><div class="hk-dc-h">' + title + '</div><div class="hk-dc-meta">' +
          f('مبلغ', formatNum(amt), amt !== other.amt) +
          f('روز', day ? toPersianDigits(String(day)) + ' ' + MONTHS[(cur.m || currentMonth) - 1] : '', day !== other.day) +
          f('ساعت', time ? toPersianDigits(time) : '', !!(time && other.time && time !== other.time)) +
          f('حساب', acc, !!(acc && other.acc && acc !== other.acc)) +
          '</div>' + body + '</div>';
      }
      var nBody = cur.raw ? '<div class="hk-dc-sms">' + escapeHtml(String(cur.raw).trim()) + '</div>' : '';
      /* ۱.۴.۰: نام جدول (در پرانتز) دیگر کنار شرح نوشته نمی‌شود */
      var oBody = (row.desc ? '<div class="hk-dc-desc">' + escapeHtml(row.desc) + '</div>' : '') +
        (prev ? '<div class="hk-dc-sms">' + escapeHtml(String(prev.raw).trim()) + '</div>' : '<div class="hk-dc-none">ثبت دستی یا بدون متن پیامک</div>');
      askConfirm('احتمال ثبت تکراری؛ دو تراکنش را مقایسه کنید. باز هم ثبت شود؟', onYes);
      var cc = document.getElementById('confirmCmp'), cm = document.getElementById('confirmModal');
      if (!cc) return;
      cc.innerHTML = card('پیامک تازه', nAmt, nDay, nTime, nAcc, nBody, { amt: oAmt, day: oDay, time: oTime, acc: oAcc }) +
        card('ثبت قبلی', oAmt, oDay, oTime, oAcc, oBody, { amt: nAmt, day: nDay, time: nTime, acc: nAcc });
      cc.style.display = '';
      if (cm) cm.classList.add('hk-dup-open');
    }
    /* mode: (خالی) ثبت شد | 'reject' رد شد | 'later' بعداً */
    function closeSmsConfirmModal(mode) {
      try { hkPendingRefresh(); } catch (ePr) {}
      try { if (typeof closeAllAppMenus === 'function') closeAllAppMenus(); } catch (eM) {}
      /* پیوست‌های در انتظار: ثبت → روی ردیف تازه؛ رد/بعداً → پاک */
      try { if (typeof hkSmsAttFinish === 'function') hkSmsAttFinish(!mode); } catch (eAt) {}
      const m = document.getElementById('smsConfirmModal');
      if (m) m.classList.remove('open');
      var _pe = pendingSmsEntry;
      try {
        if (_pe) {
          if (mode === 'later') { smsLaterAdd(_pe); try { showToast('در «پیامک‌های ثبت‌نشده» ماند'); } catch (eT) {} }
          else smsLaterRemove(_pe.raw);
          if (!mode) smsDoneLogAdd(_pe);
        }
      } catch (eL) {}
      /* پیامک تعیین تکلیف شد (ثبت، رد یا «بعداً» که حالا در فهرست خود نرم‌افزار است) → از صف نیتیو پاک شود و در این نوبت دوباره نیاید */
      try {
        var _nid = _pe && _pe.nid;
        if (_nid) { window._hkDoneSmsNids = window._hkDoneSmsNids || {}; window._hkDoneSmsNids[_nid] = 1; }
        var _B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BankSms;
        if (_nid && _B && typeof _B.getAllPending === 'function' && typeof _B.markHandled === 'function') _B.markHandled({ nid: _nid }).catch(function () {});
      } catch (eH) {}
      pendingSmsEntry = null;
      setTimeout(function () { try { processNextSmsInQueue(); } catch (e) {} try { cancelHandledSmsNotifications(); } catch (e3) {} }, 150);
    }
    async function pasteSmsFromClipboard() {
      try {
        const t = await navigator.clipboard.readText();
        const ta = document.getElementById('smsImportText');
        if (ta) ta.value = t || '';
        if (t && t.trim()) showToast('متن از کلیپ‌بورد چسبانده شد');
        else showToast('کلیپ‌بورد خالی است');
      } catch (e) {
        showToast('دسترسی به کلیپ‌بورد ممکن نشد — دستی بچسبانید');
      }
    }

    function normalizeSmsText(text) {
      let t = String(text || '');
      // یکسان‌سازی حروف عربی/فارسی رایج در پیامک بانک‌ها (برخی بانک‌ها «بانك ملي» با ك/ي عربی می‌فرستند)
      t = t.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/ۀ/g, 'ه')
        .replace(/[أإٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ـ/g, '');
      // جداکنندهٔ هزارگان/اعشار عربی
      t = t.replace(/\u066C/g, ',').replace(/\u066B/g, '.');
      t = t.replace(/\u200c/g, '').replace(/[\u200f\u200e\u202a-\u202e\u2066-\u2069]/g, '');
      t = toEnglishDigits(t);
      return t;
    }
    /* واژه‌های برچسب تراکنش در قالب پیامک بانک‌ها (برداشت:… / واریز:… / انتقال:…+ / خرید:…) */
    var SMS_TX_LABEL = '(?:برداشت(?:\\s*وجه)?|واریز(?:\\s*وجه)?|انتقال(?:\\s*وجه)?|خرید(?:\\s*کالا)?|پرداخت(?:\\s*قبض)?|کسر(?:\\s*از\\s*حساب)?|دریافت|برگشت(?:\\s*وجه)?|استرداد|سود|قسط(?:\\s*وام)?)';
    /* پیامک‌هایی که نرم‌افزار نباید به آن‌ها واکنش نشان دهد: تبلیغ، اطلاعیه/یادآوری، تراکنش ناموفق (رمز/OTP جدا بررسی می‌شود) */
    function smsHasTxStructure(t) {
      var hasTx = new RegExp(SMS_TX_LABEL + '\\s*[:：]?\\s*(?:مبلغ\\s*)?[+\\-]?\\s*[0-9]').test(t) || /مبلغ\s*[:：]?\s*[0-9]/.test(t);
      var hasBal = /مانده|موجودی/.test(t);
      return hasTx && hasBal;
    }
    function isNonTransactionSms(text) {
      var t = normalizeSmsText(text);
      if (!t) return 'empty';
      if (/ناموفق|عدم\s*موفق|انجام\s*نشد|رد\s*شد|موجودی\s*(?:حساب\s*)?کافی\s*نیست|عدم\s*کفایت\s*موجودی|کافی\s*نمی\s*باشد/.test(t)) return 'failed';
      var tx = smsHasTxStructure(t);
      if (tx) return false;
      if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:ir|com|me|ly)\/|لغو\s*[0-9]+|انصراف\s*[0-9]+/i.test(t)) return 'promo';
      if (/تخفیف|جایزه|قرعه\s*کشی|جشنواره|هدیه|کمپین|باشگاه\s*مشتریان|امتیاز|ثبت\s*نام|عضویت|دانلود|نصب\s*(?:اپ|برنامه|همراه)|اپلیکیشن|فرصت|پیشنهاد\s*ویژه|شگفت\s*انگیز|بسته\s*اینترنت|مشترک\s*گرامی/.test(t)) return 'promo';
      if (/یادآوری|سررسید|اطلاعیه|به\s*اطلاع\s*می\s*رساند|مهلت|معوق|دعوت|تبریک|تسلیت/.test(t)) return 'notice';
      return false;
    }

