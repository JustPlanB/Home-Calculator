    /* —— Theme —— */
    /* —— جدول جزئیات درآمد/مخارج: نمایش ردیف در محدودهٔ دید (داخل جدول + بالای کیبورد) —— */
    window.pdEnsureRowVisible = function (tr, smooth) {
      try {
        if (!tr || !tr.isConnected) return;
        var sc = tr.closest && tr.closest('.person-detail-scroll');
        if (!sc) return;
        /* ۱) داخل خود جدول اسکرولی */
        var s = sc.getBoundingClientRect(), r = tr.getBoundingClientRect();
        var d = 0;
        if (r.bottom > s.bottom - 6) d = r.bottom - (s.bottom - 6);
        else if (r.top < s.top + 12) d = r.top - (s.top + 12);
        if (d) {
          var t = Math.max(0, sc.scrollTop + d);
          if (smooth && sc.scrollTo) { try { sc.scrollTo({ top: t, behavior: 'smooth' }); } catch (e0) { sc.scrollTop = t; } }
          else sc.scrollTop = t;
          if (smooth) return; /* بعد از اسکرول نرم، تنظیم نهایی در فراخوانی بعدی انجام می‌شود */
        }
        /* ۲) نسبت به صفحه/کیبورد: پایین ردیف درست بالای کیبورد */
        var vv = window.visualViewport;
        var vTop = vv ? vv.offsetTop : 0;
        var vBottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
        r = tr.getBoundingClientRect();
        var m = 10, dy = 0;
        if (r.bottom > vBottom - m) dy = r.bottom - (vBottom - m);
        else if (r.top < vTop + m) dy = r.top - (vTop + m);
        if (dy) {
          var before = window.pageYOffset || 0;
          window.scrollBy(0, dy);
          var moved = (window.pageYOffset || 0) - before;
          var rest = dy - moved;
          if (rest > 1) sc.scrollTop = sc.scrollTop + rest; /* صفحه بیشتر اسکرول نمی‌شود؛ ردیف را داخل جدول بالا ببر */
        }
      } catch (e) {}
    };
    (function () {
      var activeEl = null, timers = [];
      function clearT() { timers.forEach(clearTimeout); timers = []; }
      function isEditable(el) {
        return el && el.tagName && /^(INPUT|TEXTAREA)$/.test(el.tagName) && !el.readOnly &&
               el.closest && el.closest('.person-detail-table tbody');
      }
      function run() {
        if (!activeEl || document.activeElement !== activeEl || !activeEl.isConnected || activeEl.readOnly) return;
        var tr = activeEl.closest('tr');
        if (tr) window.pdEnsureRowVisible(tr, false);
      }
      function schedule() {
        clearT();
        /* بعد از قفل موقعیت focusin (۵۰ms) و هم‌زمان با باز شدن کیبورد */
        timers = [130, 300, 550, 900].map(function (ms) { return setTimeout(run, ms); });
      }
      function activate(t) {
        if (!isEditable(t)) return;
        activeEl = t;
        if (!t._pdKbBound) {
          t._pdKbBound = true;
          t.addEventListener('input', function () { if (activeEl === t) setTimeout(run, 30); });
        }
        schedule();
      }
      document.addEventListener('focusin', function (e) { activate(e.target); }, true);
      /* سلول‌های پرشده اول readOnly هستند؛ کلیک/دابل‌کلیک آن‌ها را editable می‌کند بدون اینکه focusin دوباره بیاید */
      ['click', 'dblclick'].forEach(function (evn) {
        document.addEventListener(evn, function () { setTimeout(function () { activate(document.activeElement); }, 0); }, false);
      });
      document.addEventListener('focusout', function (e) {
        if (e.target === activeEl) { activeEl = null; clearT(); }
      }, true);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function () { if (activeEl) schedule(); });
      }
    })();

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
      const sw = document.getElementById('themeSwitch');
      if (sw) {
        if (theme === 'dark') sw.classList.add('on');
        else sw.classList.remove('on');
      }
      try { localStorage.setItem('hesabTheme', theme); } catch (e) {}
      syncNativeChrome(theme);
    }
    /* رنگ نوار وضعیت/ناوبری اندروید هم‌رنگ زمینهٔ نرم‌افزار (افزونهٔ نیتیو AppChrome؛ در مرورگر بی‌اثر) */
    function syncNativeChrome(theme) {
      try {
        var C = window.Capacitor, P = C && C.Plugins && C.Plugins.AppChrome;
        if (!P || typeof P.setTheme !== 'function') return;
        var light = (theme || document.documentElement.getAttribute('data-theme')) === 'light';
        var bg = '';
        try { bg = getComputedStyle(document.body).backgroundColor; } catch (e0) {}
        var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg || '');
        var hex = m ? '#' + [m[1], m[2], m[3]].map(function (x) { return ('0' + (+x).toString(16)).slice(-2); }).join('') : (light ? '#e3e5e9' : '#1b1b1b');
        P.setTheme({ color: hex, light: light }).catch(function () {});
      } catch (e) {}
    }
    try { document.addEventListener('visibilitychange', function () { if (!document.hidden) syncNativeChrome(); }); } catch (eV) {}

    function openHelpModal() {
      closeSideMenu();
      const body = document.getElementById('helpModalBody');
      if (body) {
        body.innerHTML = `
<div class="help-intro">حساب‌کتاب دفتر مالی ماهانهٔ شماست: درآمدها، مخارج، اقساط، قرض‌ها و پروژه‌ها را ثبت می‌کنید و نرم‌افزار جمع‌ها، مانده و تحلیل‌ها را خودش حساب می‌کند. همه‌چیز آفلاین و روی همین گوشی ذخیره می‌شود.</div>
<div class="help-section"><h4>بالای صفحه</h4><ul>
  <li><strong>ماه و سال:</strong> هر ماه دفتر جداگانه دارد؛ با عوض کردن ماه، اطلاعات همان ماه نمایش داده می‌شود.</li>
  <li><strong>منو (≡):</strong> دسترسی به همهٔ بخش‌ها، تنظیمات، حالت شب/روز، امنیت و خروجی‌ها.</li>
</ul></div>
<div class="help-section"><h4>کارت‌ها</h4><ul>
  <li>کارت شما خلاصهٔ درآمد و خرج ماه است؛ نامش از منوی همبرگری (لمس نام کاربر ← «تغییر نام») عوض می‌شود.</li>
  <li>روی کادر <strong>درآمد</strong> یا <strong>مخارج</strong> بزنید تا جدول ردیف‌ها باز شود. با نگه داشتن انگشت روی کارت، کارت می‌لرزد و <strong>حذف ماه</strong> و <strong>حذف کلی</strong> روی آن می‌آیند؛ هر دو بعد از تأیید به سطل زباله می‌روند و قابل برگشت‌اند.</li>
  <li><strong>باکس هوشمند</strong> (سمت چپ کارت) اسلایدهای خودکار دارد: وضعیت ماه، مقایسه با ماه قبل، تعهدات، طلب و بدهی، دسته‌بندی مخارج، نکات و «کارهای من» (با دکمهٔ + آبی).</li>
</ul></div>
<div class="help-section"><h4>جدول درآمد و مخارج</h4><ul>
  <li>ردیف تازه را با <strong>+</strong> صفحهٔ اصلی (کنار دایرهٔ موجودی) بسازید؛ برای ردیف پروژه، اول اسم پروژه را بزنید و بعد «ثبت درآمد» یا «ثبت خرج».</li>
  <li>برای ویرایش یا حذف، انگشت را روی ردیف <strong>نگه دارید</strong>. وضعیت پرداخت با یک ضربه روی مبلغ انتخاب می‌شود. پرداخت قسط را مثل هر برداشت دیگر ثبت کنید (شرح «پرداخت قسط»).</li>
</ul></div>
<div class="help-section"><h4>باکس‌های منوی صفحهٔ اصلی</h4><ul>
  <li>هر باکس با کشیدن افقی اسلاید دوم دارد؛ برای برگشت به اسلاید اول برعکس بکشید.</li>
  <li><strong>پروژه‌ها:</strong> واریزی‌ها و مخارج هر پروژه و طلب یا بدهی آن.</li>
  <li><strong>قرض:</strong> بده‌بستان با دیگران و خلاصهٔ اینکه چه کسی به چه کسی بدهکار است.</li>
  <li><strong>درآمد ثابت، یادآور و آمار:</strong> درآمدهای تکراری ماهانه، یادآوری پرداخت‌ها، و نمودارهای روزانه تا سالانه با فیلتر.</li>
  <li><strong>پشتیبان‌گیری، بازیابی، خروجی:</strong> ذخیرهٔ کامل اطلاعات در فایل، برگرداندن آن، و گزارش PDF یا Excel ماه.</li>
  <li><strong>پس‌انداز:</strong> ثبت ارز و طلا و سکه با مقدار و قیمت خرید؛ با وارد کردن قیمت روز، ارزش فعلی و سود یا زیان هر مورد نمایش داده می‌شود. این بخش جداست و به موجودی کل وصل نیست.</li>
  <li><strong>انتخاب حساب و ثبت تکی و گروهی پیامک‌ها:</strong> تعریف حساب‌های بانکی، و ثبت تراکنش با چسباندن متن پیامک بانک.</li>
  <li><strong>حذف ماه، حذف کلی، سطل زباله:</strong> پاک کردن اطلاعات؛ ردیف‌های حذف‌شده تا مدتی در سطل زباله قابل برگشت‌اند.</li>
</ul></div>
<div class="help-section"><h4>باکس پایین</h4><ul>
  <li>دایرهٔ وسط <strong>موجودی</strong> لحظه‌ای حساب‌ها را نشان می‌دهد و <strong>ذره‌بین</strong> برای جستجو و ماندهٔ هر بخش است.</li>
</ul></div>
<div class="help-section"><h4>حریم خصوصی و امنیت</h4><ul>
  <li>همهٔ اطلاعات مالی فقط روی همین گوشی ذخیره می‌شود و به هیچ سروری ارسال نمی‌شود (مگر همگام‌سازی خانوادگی را خودتان فعال کنید).</li>
  <li>پیامک‌ها فقط روی گوشی و فقط برای تشخیص واریز/برداشت بانکی خوانده می‌شوند؛ پیامک‌های تبلیغاتی، رمز پویا و کد تأیید نادیده گرفته می‌شوند.</li>
  <li>با «قفل برنامه» (رمز/اثرانگشت) دسترسی دیگران را ببندید و از «پشتیبان‌گیری» نسخهٔ امن اطلاعات را نگه دارید.</li>
</ul></div>
<button type="button" class="modal-btn yes help-tour-btn" onclick="closeHelpModal(); setTimeout(function(){ startAppTour(true); }, 250);">نمایش دوبارهٔ تور آموزشی</button>
`;
      }
      document.getElementById('helpModal').classList.add('open');
      try { syncModalOverlaysToViewport(); } catch (e) {}
    }
    function closeHelpModal() {
      document.getElementById('helpModal').classList.remove('open');
      openSideMenu();
    }
    /* ===== بروزرسانی واقعی =====
       نسخهٔ نصب‌شده از خود اندروید (versionName/versionCode) خوانده می‌شود و با فایل version.json روی سرور مقایسه می‌گردد.
       آدرس سرور را در UPDATE_MANIFEST_URL بگذارید (مثلاً GitHub Pages یا سایت خودتان؛ باید عمومی و HTTPS باشد). */
    /* هر بیلد امضاشدهٔ main این فایل را در شاخهٔ update-feed به‌روز می‌کند؛ اگر در دسترس نبود، فایل شاخهٔ main خوانده می‌شود */
    var UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/JustPlanB/Home-Calculator/update-feed/version.json';
    var UPDATE_MANIFEST_FALLBACK = 'https://raw.githubusercontent.com/JustPlanB/Home-Calculator/main/version.json';
    var UPDATE_CHECK_KEY = STORAGE_KEY + '_updCheck';
    var _appInfo = null;
    function getInstalledVersion() {
      if (_appInfo) return Promise.resolve(_appInfo);
      try {
        var A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
        if (A && A.getInfo) return A.getInfo().then(function (i) { _appInfo = { name: String(i.version || ''), code: parseInt(i.build, 10) || 0 }; return _appInfo; }).catch(function () { return { name: '', code: 0 }; });
      } catch (e) {}
      return Promise.resolve({ name: '', code: 0 });
    }
    function fetchUpdateManifestFrom(url) {
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      var t = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) {} }, 9000);
      return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http_' + r.status); return r.json(); },
              function (e) { clearTimeout(t); throw e; });
    }
    function fetchUpdateManifest() {
      return fetchUpdateManifestFrom(UPDATE_MANIFEST_URL).catch(function () { return fetchUpdateManifestFrom(UPDATE_MANIFEST_FALLBACK); });
    }
    function openUpdateLink(url) {
      if (!/^(https:|bazaar:|myket:|market:)/i.test(String(url || ''))) return;   /* فقط پیوندهای امن/فروشگاه */
      /* روی اندروید: پیمایش به آدرس بیرونی را Capacitor به مرورگر/استور گوشی می‌سپارد (دانلود APK در مرورگر) */
      var native = false;
      try { native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (eN) {}
      if (native) { try { location.href = url; return; } catch (e0) {} }
      try { window.open(url, '_system'); } catch (e) { try { location.href = url; } catch (e2) {} }
    }
    function showUpdateDialog(m, inst) {
      /* منوی کناری زیر پنجره باز نماند (وگرنه اولین لمس دکمه را منو می‌گیرد و دو بار زدن لازم می‌شود) */
      try { closeSideMenu(); } catch (eM) {}
      var old = document.getElementById('updDlg'); if (old) old.remove();
      var notes = Array.isArray(m.notes) ? m.notes : (m.notes ? [m.notes] : []);
      var st = m.stores || {};
      var links = [];
      if (st.bazaar) links.push(['کافه‌بازار', st.bazaar]);
      if (st.myket) links.push(['مایکت', st.myket]);
      if (st.play) links.push(['گوگل‌پلی', st.play]);
      if (m.apk) links.push(['دانلود نسخهٔ جدید', m.apk]);
      var ov = document.createElement('div');
      ov.id = 'updDlg'; ov.className = 'backup-pick-overlay';
      ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title">نسخهٔ جدید ' + escapeHtml(toPersianDigits(String(m.versionName || ''))) + ' آماده است</div>' +
        '<div class="upd-cur">نسخهٔ نصب‌شده: ' + escapeHtml(toPersianDigits(inst.name || '—')) + '</div>' +
        (notes.length ? '<ul class="upd-notes">' + notes.slice(0, 12).map(function (n) { return '<li>' + escapeHtml(String(n)) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="upd-links">' + links.map(function (l, i) {
          var isApk = (l[1] === m.apk);
          return '<button type="button" class="upd-go' + (isApk ? ' upd-dl' : '') + '" data-i="' + i + '">' +
            '<span>' + escapeHtml(l[0]) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="upd-progress" hidden><div class="upd-pct">۰٪</div><div class="upd-tube"><i></i></div><div class="upd-status">در حال دانلود…</div><div class="upd-more"></div></div>' +
        (m.apk ? '<div class="upd-hint">نسخهٔ جدید داخل همین پنجره دانلود و نصب می‌شود. اطلاعات شما سر جایش می‌ماند.</div>' : '') +
        (m._critical ? '<div class="upd-hint upd-crit-hint">این بروزرسانی ضروری است؛ برای ادامهٔ کار با نرم‌افزار، نسخهٔ جدید را نصب کنید. اطلاعات شما سر جایش می‌ماند.</div>'
          : '<div class="backup-pick-actions"><button type="button" class="backup-pick-cancel" id="updLater">بعداً</button></div>') + '</div>';
      document.body.appendChild(ov);
      ov.querySelectorAll('.upd-go').forEach(function (b) { b.onclick = function () {
        var url = links[+b.getAttribute('data-i')][1];
        if (url === m.apk) startInAppUpdate(ov, url); else openUpdateLink(url);
      }; });
      if (!m._critical) {
        ov.querySelector('#updLater').onclick = function () { ov.remove(); };
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      }
    }
    /* —— باکس اعلان بروزرسانی هنگام ورود به نرم‌افزار ——
       معمولی: «بروزرسانی» و «بعداً»؛ با «بعداً» دفعهٔ بعد که نرم‌افزار باز شود دوباره می‌آید.
       ضروری (critical یا پایین‌تر از minVersionCode): بدون «بعداً»؛ تا نصب نسخهٔ جدید، نرم‌افزار قابل استفاده نیست. */
    var _updPromptShownThisLaunch = false, _updPromptAt = 0;
    function isCriticalUpdate(m, inst) {
      var minC = parseInt(m && m.minVersionCode, 10) || 0;
      return !!(m && m.critical === true) || (minC > 0 && inst && inst.code > 0 && inst.code < minC);
    }
    function showUpdatePrompt(m, inst) {
      var critical = isCriticalUpdate(m, inst);
      window._hkUpdCritical = critical;
      /* اگر قفل برنامه باز است، بعد از ورود نشان بده */
      try { var lk = document.getElementById('appLockOverlay'); if (lk && lk.classList.contains('show')) { setTimeout(function () { showUpdatePrompt(m, inst); }, 1500); return; } } catch (eL) {}
      if (document.getElementById('updPrompt') || document.getElementById('updDlg')) return;
      _updPromptShownThisLaunch = true; _updPromptAt = Date.now();
      var notes = Array.isArray(m.notes) ? m.notes : (m.notes ? [m.notes] : []);
      var ov = document.createElement('div');
      ov.id = 'updPrompt'; ov.className = 'backup-pick-overlay';
      if (critical) ov.setAttribute('data-critical', '1');
      ov.innerHTML = '<div class="backup-pick-panel upd-prompt-panel" role="dialog">' +
        '<div class="upd-prompt-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5" /><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" /></svg></div>' +
        '<div class="backup-pick-title upd-prompt-title">' + (critical ? 'بروزرسانی ضروری' : 'بروزرسانی جدید داریم') + '</div>' +
        '<div class="upd-cur">نسخهٔ ' + escapeHtml(toPersianDigits(String(m.versionName || ''))) + ' آماده است' + (inst && inst.name ? ' (نسخهٔ فعلی شما: ' + escapeHtml(toPersianDigits(inst.name)) + ')' : '') + '</div>' +
        (notes.length ? '<ul class="upd-notes">' + notes.slice(0, 4).map(function (n) { return '<li>' + escapeHtml(String(n)) + '</li>'; }).join('') + '</ul>' : '') +
        (critical ? '<div class="upd-hint upd-crit-hint">این نسخه شامل اصلاحات مهم است و تا نصب آن، کار با نرم‌افزار ممکن نیست. اطلاعات شما سر جایش می‌ماند.</div>' : '') +
        '<div class="upd-prompt-actions"><button type="button" class="upd-prompt-go" id="updPromptGo">بروزرسانی</button>' +
        (critical ? '' : '<button type="button" class="backup-pick-cancel upd-prompt-later" id="updPromptLater">بعداً</button>') + '</div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#updPromptGo').onclick = function () {
        ov.remove();
        var mm = Object.assign({}, m, { _critical: critical });
        showUpdateDialog(mm, inst);
      };
      var later = ov.querySelector('#updPromptLater');
      if (later) later.onclick = function () { ov.remove(); };
    }
    /* بروزرسانی ضروری: اگر پنجره‌ها بسته شدند (مثلاً بعد از برگشتن از نصب‌کننده)، دوباره نشان بده */
    function enforceCriticalUpdate() {
      if (!window._hkUpdCritical || !window._hkUpdManifest) return;
      if (document.getElementById('updPrompt') || document.getElementById('updDlg')) return;
      getInstalledVersion().then(function (inst) {
        var remote = parseInt(window._hkUpdManifest.versionCode, 10) || 0;
        if (inst && inst.code > 0 && remote > inst.code) showUpdatePrompt(window._hkUpdManifest, inst);
      });
    }
    /* دانلود داخل نرم‌افزار با لولهٔ درصد (افزونهٔ نیتیو HkUpdater)؛ اگر در دسترس نبود: دانلود با مرورگر */
    function startInAppUpdate(ov, url) {
      var C = window.Capacitor, P = C && C.Plugins && C.Plugins.HkUpdater;
      var native = false; try { native = !!(C && C.isNativePlatform && C.isNativePlatform()); } catch (e) {}
      if (!native || !P || typeof P.download !== 'function') { openUpdateLink(url); return; }
      try { if (autoBkState().enabled !== false) writeAutoBackup('safety', 'update'); } catch (eBk) {}
      var box = ov.querySelector('.upd-progress'), links = ov.querySelector('.upd-links'), hint = ov.querySelector('.upd-hint');
      var fill = box.querySelector('.upd-tube i'), pct = box.querySelector('.upd-pct'), st = box.querySelector('.upd-status'), more = box.querySelector('.upd-more');
      links.hidden = true; if (hint) hint.hidden = true; box.hidden = false; more.innerHTML = '';
      box.classList.remove('err', 'indet'); fill.style.width = '0%'; pct.textContent = toPersianDigits('0') + '٪'; st.textContent = 'در حال دانلود…';
      var set = function (v) {
        if (v < 0) { box.classList.add('indet'); pct.textContent = ''; return; }
        box.classList.remove('indet'); v = Math.max(0, Math.min(100, v));
        fill.style.width = v + '%'; pct.textContent = toPersianDigits(String(v)) + '٪';
      };
      var handle = null;
      var cleanup = function () { try { handle && handle.remove && handle.remove(); } catch (e) {} handle = null; };
      var btn = function (label, fn, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = 'upd-go ' + (cls || ''); b.innerHTML = '<span>' + label + '</span>'; b.onclick = fn; more.appendChild(b); };
      var install = function () {
        more.innerHTML = ''; st.textContent = 'در حال باز کردن نصب‌کننده…';
        Promise.resolve(P.install()).then(function () {
          st.textContent = 'در پنجرهٔ اندروید «نصب» را بزنید.';
        }).catch(function (e) {
          var msg = String((e && (e.message || e.code)) || e || '');
          if (/need_permission/.test(msg)) {
            st.textContent = 'در صفحهٔ بازشده اجازهٔ «نصب برنامه‌های ناشناس» را برای حساب‌کتاب روشن کنید، برگردید و «نصب» را بزنید.';
            btn('نصب', install, 'upd-dl');
            var onVis = function () { if (!document.hidden) { document.removeEventListener('visibilitychange', onVis); setTimeout(install, 400); } };
            document.addEventListener('visibilitychange', onVis);
          } else {
            st.textContent = 'باز کردن نصب‌کننده ممکن نشد.'; box.classList.add('err');
            btn('تلاش دوباره', install, 'upd-dl'); btn('دانلود با مرورگر', function () { openUpdateLink(url); });
          }
        });
      };
      Promise.resolve(P.addListener('progress', function (e) { set(e && typeof e.percent === 'number' ? e.percent : -1); })).then(function (h) { handle = h; }).catch(function () {});
      Promise.resolve(P.download({ url: url })).then(function () {
        cleanup(); set(100); box.classList.add('done'); install();
      }).catch(function () {
        cleanup(); box.classList.add('err'); st.textContent = 'دانلود کامل نشد. اتصال اینترنت را بررسی کنید.';
        btn('تلاش دوباره', function () { startInAppUpdate(ov, url); }, 'upd-dl'); btn('دانلود با مرورگر', function () { openUpdateLink(url); });
      });
    }
    var UPDATE_REMOTE_KEY = STORAGE_KEY + '_updRemote';
    var UPDATE_PROMPTED_KEY = STORAGE_KEY + '_updPrompted';
    function updPromptedCode() { try { return +localStorage.getItem(UPDATE_PROMPTED_KEY) || 0; } catch (e) { return 0; } }
    function updMarkPrompted(code) { try { if (code > 0) localStorage.setItem(UPDATE_PROMPTED_KEY, String(code)); } catch (e) {} }
    function setUpdateBadge(on) {
      document.querySelectorAll('.menu-update-btn').forEach(function (b) { b.classList.toggle('has-update', !!on); });
      /* نقطهٔ قرمز روی دکمهٔ منو هم، تا کاربر بدون باز کردن منو بفهمد نسخهٔ جدید آمده */
      var mb = document.getElementById('menuBtn'); if (mb) mb.classList.toggle('has-update', !!on);
    }
    function checkAppUpdate(silent) {
      if (!silent) showToast('در حال بررسی بروزرسانی…');
      return Promise.all([getInstalledVersion(), fetchUpdateManifest()]).then(function (r) {
        var inst = r[0], m = r[1] || {};
        try { localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now())); } catch (e) {}
        var remote = parseInt(m.versionCode, 10) || 0;
        try { if (remote > 0) localStorage.setItem(UPDATE_REMOTE_KEY, String(remote)); } catch (e) {}
        var newer = remote > 0 && inst.code > 0 ? remote > inst.code : (m.versionName && inst.name && String(m.versionName) !== String(inst.name) && !silent);
        setUpdateBadge(!!newer);
        if (newer) { window._hkUpdManifest = m; }
        /* آخرین فایل نسخه نگه داشته می‌شود تا دفعهٔ بعد پنجره همان لحظهٔ ورود (بی منتظر اینترنت) بیاید */
        try { if (remote > 0) localStorage.setItem(UPDATE_REMOTE_KEY + '_m', JSON.stringify({ versionCode: m.versionCode, versionName: m.versionName, notes: m.notes, apk: m.apk, stores: m.stores, critical: m.critical, minVersionCode: m.minVersionCode })); } catch (eM) {}
        if (newer) {
          if (!silent) showUpdateDialog(Object.assign({}, m, { _critical: isCriticalUpdate(m, inst) }), inst);
          else if (isCriticalUpdate(m, inst) || (silent === 'launch' && !_updPromptShownThisLaunch)) { showUpdatePrompt(m, inst); updMarkPrompted(remote); }
          /* برگشتن به نرم‌افزار از پس‌زمینه: برای هر نسخهٔ تازه یک بار پنجرهٔ بروزرسانی (نه فقط نقطهٔ قرمز) */
          else if (silent === true && !_updPromptShownThisLaunch && updPromptedCode() !== remote) { showUpdatePrompt(m, inst); updMarkPrompted(remote); }
        }
        else if (!silent) showToast('شما آخرین نسخه را دارید');
        return newer;
      }).catch(function () {
        if (!silent) showToast('اتصال به سرور بروزرسانی ممکن نشد — اینترنت را بررسی کنید');
        return false;
      });
    }
    /* بررسی بی‌صدا (هر بار باز شدن نرم‌افزار / برگشتن به اپ، حداکثر هر ۳ ساعت)؛ فقط نقطهٔ قرمز روی منو و دکمهٔ «بروزرسانی» نشان می‌دهد */
    var _updChecking = false;
    function silentUpdateCheck(minGapMs) {
      try {
        if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
        if (_updChecking) return;
        var last = +localStorage.getItem(UPDATE_CHECK_KEY) || 0;
        if (Date.now() - last < (minGapMs == null ? 30 * 60 * 1000 : minGapMs)) return;
        _updChecking = true;
        Promise.resolve(checkAppUpdate(minGapMs === 0 ? 'launch' : true)).then(function () { _updChecking = false; }, function () { _updChecking = false; });
      } catch (e) { _updChecking = false; }
    }
    /* نشان قبلی تا بررسی بعدی حفظ می‌شود (بعد از نصب نسخهٔ جدید خودبه‌خود خاموش است) */
    try {
      var _knownRemote = +localStorage.getItem(UPDATE_REMOTE_KEY) || 0;
      if (_knownRemote > 0) getInstalledVersion().then(function (v) { if (v && v.code > 0 && _knownRemote > v.code) setUpdateBadge(true); });
    } catch (e) {}
    /* هر بار باز شدن نرم‌افزار (بدون فاصلهٔ حداقل)، برگشتن به نرم‌افزار (هر ۳۰ دقیقه) و باز کردن منو (هر ۲ دقیقه) */
    /* ورود به نرم‌افزار: اگر نسخهٔ تازه از قبل شناخته شده، پنجره همان لحظه؛ بعد بررسی از اینترنت */
    function updPromptFromCache() {
      try {
        if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
        var cm = JSON.parse(localStorage.getItem(UPDATE_REMOTE_KEY + '_m') || 'null');
        var rc = cm ? parseInt(cm.versionCode, 10) || 0 : 0; if (!rc) return;
        getInstalledVersion().then(function (v) {
          if (v && v.code > 0 && rc > v.code && !_updPromptShownThisLaunch) { window._hkUpdManifest = window._hkUpdManifest || cm; setUpdateBadge(true); showUpdatePrompt(cm, v); updMarkPrompted(rc); }
        });
      } catch (e) {}
    }
    setTimeout(updPromptFromCache, 900);
    setTimeout(function () { silentUpdateCheck(0); }, 1500);
    /* برگشتن به نرم‌افزار = ورود دوباره: همان لحظه بررسی (پنجره حداکثر هر ۱۰ دقیقه یک بار) */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      setTimeout(function () {
        if (_updPromptShownThisLaunch && Date.now() - _updPromptAt > 10 * 60 * 1000 && !document.getElementById('updPrompt')) _updPromptShownThisLaunch = false;
        updPromptFromCache();
        silentUpdateCheck(0);
        try { enforceCriticalUpdate(); } catch (eC) {}
      }, 600);
    });
    (function initAppVersionLabel() {
      const el = document.getElementById('appVersionLabel');
      if (el) el.textContent = APP_VERSION_FA;
      getInstalledVersion().then(function (v) { if (v && v.name && el) el.textContent = toPersianDigits(v.name); });
    })();

    (function wireHelpModalClose() {
      const ov = document.getElementById('helpModal');
      if (!ov) return;
      ov.addEventListener('click', (e) => {
        if (e.target === ov) closeHelpModal();
      });
    })();



    function toggleTheme() {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      /* تغییر نرم رنگ‌ها: محو تدریجی تصویر تم فعلی روی تم جدید (پشتیبانی WebView)؛ وگرنه تغییر فوری مثل قبل */
      let smooth = false;
      try {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduce && typeof document.startViewTransition === 'function') {
          document.startViewTransition(function () { applyTheme(next); });
          smooth = true;
        }
      } catch (eVt) { smooth = false; }
      if (!smooth) applyTheme(next);
      // منو باز بماند
      openSideMenu();
    }
    (function initTheme() {
      let t = 'dark';
      try { t = localStorage.getItem('hesabTheme') || 'dark'; } catch (e) {}
      applyTheme(t);
    })();

    /* —— دکمه بازگشت گوشی: یک مرحله عقب؛ دو بار سریع = خروج —— */
    let _backHandling = false;
    let _lastBackAt = 0;
    const BACK_EXIT_WINDOW = 1800;


    function closeCellTextPopups() {
      try {
        document.querySelectorAll('.pd-desc-popup, .cell-text-popup').forEach(p => {
          try { p.remove(); } catch (e) {}
        });
      } catch (e) {}
    }


    function shapeFramePath() { return ''; }
    function ensureShapeFrame(el) {
      /* باکس کِرو + دایره برجسته دارک‌گری و بعلاوه آبی */
      try {
        if (!el) return;
        el.querySelectorAll(':scope > .shape-frame-svg').forEach(function(n) {
          try { n.remove(); } catch (e0) {}
        });
        var btn = el.querySelector(':scope > .table-add-tab');
        if (btn) {
          btn.querySelectorAll('.tab-join-svg, .tab-gap-cover').forEach(function(n) {
            try { n.remove(); } catch (e1) {}
          });
          btn.style.cssText = '';
          if (!btn.querySelector('svg')) {
            btn.innerHTML = '<svg class="tab-plus-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
          }
          var svg = btn.querySelector('svg');
          if (svg) {
            svg.setAttribute('class', 'tab-plus-icon');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.innerHTML = '<path d="M12 5v14M5 12h14" fill="none" stroke="#08b5f5" stroke-width="2.8" stroke-linecap="round"/>';
          }
        }
      } catch (e) {}
    }
    function refreshAllShapeFrames() {
      try {
        document.querySelectorAll('.person-detail-box, .shaped-card, .recurring-box').forEach(function(el) {
          ensureShapeFrame(el);
        });
      } catch (e) {}
    }

    function tabJoinSvgHtml(kind) {
      const sm = kind === 'sm';
      // عرض بیشتر، ارتفاع همان؛ خم‌های معکوس متقارن؛ fill تا خط جدول
      const stroke = sm
        ? 'M0,8 C3,8 5,8 7,13 L7,30 Q7,38 14,38 L34,38 Q41,38 41,30 L41,13 C43,8 45,8 48,8'
        : 'M0,10 C5,10 7,10 10,16 L10,38 Q10,48 18,48 L46,48 Q54,48 54,38 L54,16 C57,10 59,10 64,10';
      const fill = sm
        ? 'M7,10 L7,30 Q7,38 14,38 L34,38 Q41,38 41,30 L41,10 Z'
        : 'M10,12 L10,38 Q10,48 18,48 L46,48 Q54,48 54,38 L54,12 Z';
      const vb = sm ? '0 0 48 42' : '0 0 64 52';
      const w = sm ? '48' : '64';
      const h = sm ? '42' : '52';
      return '<svg class="tab-join-svg' + (sm ? ' tab-join-svg-sm' : '') + '" viewBox="' + vb + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">' +
        '<path class="tab-join-fill" d="' + fill + '"/>' +
        '<path class="tab-join-stroke" fill="none" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" d="' + stroke + '"/>' +
        '</svg>';
    }
    function tabPlusIconHtml() {
      return '<svg class="tab-plus-icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
    }
    function enhanceTableAddTabs(root) {
      /* tab-join جدا منسوخ — شکل یکپارچه با shape-frame-svg */
      try {
        const scope = root || document;
        scope.querySelectorAll('.table-add-tab .tab-join-svg').forEach(function(el) {
          try { el.remove(); } catch (e0) {}
        });
      } catch (e) {}
    }

        function showCellTextPopup(anchorEl, text, opt) {
      closeCellTextPopups();
      const t = (text == null ? '' : String(text)).trim();
      if (!t || !anchorEl) return null;
      const pop = document.createElement('div');
      /* ۱.۳.۸۷: توضیح‌ها (جیب به جیب، تسویه، قسط) چندخطی */
      pop.className = 'cell-text-popup pd-desc-popup' + (opt && opt.wrap ? ' cell-text-popup-wrap' : '');
      pop.textContent = t;
      document.body.appendChild(pop);
      try {
        const r = anchorEl.getBoundingClientRect();
        const vv = window.visualViewport;
        const viewW = vv ? vv.width : window.innerWidth;
        const viewH = vv ? vv.height : window.innerHeight;
        const viewTop = vv ? vv.offsetTop : 0;
        const viewBottom = viewTop + viewH;
        const pad = 8;
        // اندازه واقعی بعد از insert
        let pw = Math.min(viewW - pad * 2, Math.max(r.width, pop.scrollWidth + 24));
        pop.style.maxWidth = (viewW - pad * 2) + 'px';
        pop.style.width = 'auto';
        const popH = Math.max(pop.offsetHeight || 36, 32);
        let left = r.left;
        if (left + pw > viewW - pad) left = viewW - pw - pad;
        if (left < pad) left = pad;
        let top = r.bottom + 4;
        if (top + popH > viewBottom - pad) top = r.top - popH - 4;
        if (top < viewTop + pad) top = viewTop + pad;
        pop.style.left = Math.round(left) + 'px';
        pop.style.top = Math.round(top) + 'px';
      } catch (e) {}
      const closer = (ev) => {
        if (!pop.parentNode) {
          document.removeEventListener('mousedown', closer, true);
          document.removeEventListener('touchstart', closer, true);
          return;
        }
        if (pop.contains(ev.target)) return;
        if (anchorEl === ev.target || (anchorEl.contains && anchorEl.contains(ev.target))) return;
        try { pop.remove(); } catch (e2) {}
        document.removeEventListener('mousedown', closer, true);
        document.removeEventListener('touchstart', closer, true);
      };
      setTimeout(() => {
        document.addEventListener('mousedown', closer, true);
        document.addEventListener('touchstart', closer, true);
      }, 30);
      return pop;
    }

    function closeTopOverlayOrMenu() {
      try {
        var bko = document.getElementById('backupPickOverlay');
        if (bko) { bko.remove(); return true; }
      } catch (e) {}
      try {
        var prp = document.getElementById('projectRowPickerOverlay');
        if (prp) { prp.remove(); return true; }
      } catch (e) {}

      // 0) گزارش پروژه
      try {
        var prm = document.getElementById('projectReportModal');
        if (prm && prm.style.display === 'flex') {
          closeProjectReportModal();
          return true;
        }
      } catch (e) {}
      // 0b) مودال پروژه‌ها
      try {
        var sm = document.getElementById('subjectsModal');
        if (sm && sm.style.display === 'flex') {
          closeSubjectsModal();
          return true;
        }
      } catch (e) {}
      // 1) باکس متن کامل سلول
      try {
        const pops = document.querySelectorAll('.pd-desc-popup, .cell-text-popup');
        if (pops && pops.length) {
          pops.forEach(p => { try { p.remove(); } catch (e0) {} });
          return true;
        }
      } catch (e) {}
      // 2) منوی بستانکار/بدهکار یا دریافت/پرداخت (status-menu)
      try {
        const menus = document.querySelectorAll('.status-menu');
        if (menus && menus.length) {
          menus.forEach(m => { try { m.remove(); } catch (e0) {} });
          try {
            document.querySelectorAll('[data-amt-pending]').forEach(el => {
              try { delete el.dataset.amtPending; } catch (e1) {}
            });
          } catch (e2) {}
          return true;
        }
      } catch (e) {}
      /* باکس نام کاربر (ایجاد/ویرایش کارت) — بک = بستن و صفحه اصلی */
      try {
        const pes = document.querySelector('.modal-overlay.person-edit-sheet.open, .modal-overlay.person-edit-sheet');
        if (pes) {
          try { closePersonEditSheet(); } catch (eP) {
            try { pes.remove(); } catch (eR) {}
          }
          return true;
        }
      } catch (e) {}
      try {
        const conf = document.getElementById('confirmModal');
        if (conf && conf.classList.contains('open')) {
          conf.classList.remove('open');
          const cb = (typeof confirmNoCallback !== 'undefined') ? confirmNoCallback : null;
          try { confirmCallback = null; confirmNoCallback = null; } catch (e) {}
          if (cb) try { cb(); } catch (e) {}
          return true;
        }
      } catch (e) {}
      try {
        const dyn = document.getElementById('recurringSheet') || document.getElementById('sectionPickerSheet');
        if (dyn && dyn.parentNode) {
          dyn.remove();
          const bd = document.getElementById('textInputBackdrop');
          if (bd) bd.classList.remove('open');
          try { unlockBodyScroll(); } catch (e) {}
          return true;
        }
      } catch (e) {}
      try {
        const lists = document.querySelectorAll('.dark-select-list.open');
        if (lists.length) {
          lists.forEach(l => l.classList.remove('open'));
          const bd = document.getElementById('darkSelectBackdrop');
          if (bd) bd.classList.remove('open');
          return true;
        }
      } catch (e) {}
      try {
        const tip = document.getElementById('textInputModal');
        if (tip && tip.classList.contains('open')) {
          tip.classList.remove('open');
          const bd = document.getElementById('textInputBackdrop');
          if (bd) bd.classList.remove('open');
          try { unlockBodyScroll(); } catch (e) {}
          return true;
        }
      } catch (e) {}
      try {
        if (document.getElementById('svEditor')) { closeSavingsEditor(); return true; }
      } catch (e) {}
      try {
        const ure = document.getElementById('urEditor');
        if (ure) {
          try { ure.remove(); } catch (e) {}
          const ud = document.getElementById('urEditorDim');
          if (ud) ud.style.display = 'none';
          return true;
        }
      } catch (e) {}
      try {
        const overlays = document.querySelectorAll('.modal-overlay.open');
        for (let i = overlays.length - 1; i >= 0; i--) {
          const ov = overlays[i];
          if (!ov) continue;
          if (ov.id === 'textInputBackdrop' || ov.id === 'darkSelectBackdrop') { ov.classList.remove('open'); continue; }
          if (ov.id === 'confirmModal') continue;
          if (ov.classList.contains('person-edit-sheet')) {
            try { closePersonEditSheet(); } catch (ePe) { try { ov.remove(); } catch (e2) {} }
            return true;
          }
          if (ov.id === 'trashModal' && typeof closeTrashModal === 'function') { closeTrashModal(); return true; }
          if (ov.id === 'bankAccountsModal' && typeof closeBankAccountsModal === 'function') { _bankModalFromMenu=false; closeBankAccountsModal(); return true; }
          if (ov.id === 'userRemindersModal' && typeof closeUserRemindersModal === 'function') { closeUserRemindersModal(); return true; }
          if (ov.id === 'familyModal' && typeof closeFamilyModal === 'function') { closeFamilyModal(); return true; }
          if (ov.id === 'smsImportModal' && typeof closeSmsImportModal === 'function') { closeSmsImportModal(); return true; }
          if (ov.id === 'smsConfirmModal' && typeof closeSmsConfirmModal === 'function') { closeSmsConfirmModal('later'); return true; }
          ov.classList.remove('open');
          return true;
        }
      } catch (e) {}
      try { const exp=document.getElementById('exportChoiceOverlay'); if(exp){exp.remove();return true;} } catch(e){}
      try { const pf=document.getElementById('pdfPrintFrame'), pb=document.getElementById('pdfPrintBar'); if(pf||pb){if(pf)pf.remove();if(pb)pb.remove();return true;} } catch(e){}
      try {
        const fs=document.getElementById('featureSheet');
        if((fs&&fs.classList.contains('open')) || _featureActive){ closeFeatureSheet(); return true; }
      } catch(e){}
      try {
        const menu=document.getElementById('menuDropdown');
        if((menu&&menu.classList.contains('open')) || (document.body&&document.body.classList.contains('menu-open'))){ closeSideMenu(); return true; }
      } catch(e){}
      return false;
    }

    function doAppExit(){
      try { localStorage.setItem('hk_lock_app_exit', '1'); } catch (e0) {}
      try {
        __lockUnlockedThisSession = false;
      } catch (e1) {}
      try{
        const C=window.Capacitor, plugins=C&&C.Plugins, App=plugins&&plugins.App;
        if(App && typeof App.exitApp==='function'){ App.exitApp(); return; }
      }catch(e){}
      try{ window.close(); }catch(e){}
    }

    function hkBackTopLayer() {
      var pts = [[0.5, 0.5], [0.5, 0.3], [0.5, 0.75]], el = null;
      for (var i = 0; i < pts.length && !el; i++) {
        var hit = document.elementFromPoint(innerWidth * pts[i][0], innerHeight * pts[i][1]);
        el = hit && hit.closest ? hit.closest('[data-hk-back]') : null;
      }
      if (!el) return false;
      if (typeof el._hkCancel === 'function') el._hkCancel();
      else if (typeof el._hkClose === 'function') el._hkClose();
      else el.remove();
      return true;
    }
    /* ۱.۳.۷۱: بازگشت در صفحهٔ اصلی = رفتن به پس‌زمینه (نرم‌افزار بسته نمی‌شود)؛ قفل مثل خروج، موقع برگشت رمز می‌خواهد */
    function hkAppToBackground() {
      if (typeof hkIsIos === 'function' && hkIsIos()) return; /* آیفون: برنامه‌ها خودشان را نمی‌بندند */
      try { localStorage.setItem('hk_lock_app_exit', '1'); } catch (e0) {}
      try { __lockUnlockedThisSession = false; } catch (e1) {}
      try { _flushPendingSave(); } catch (e2) {}
      try {
        var C = window.Capacitor, App = C && C.Plugins && C.Plugins.App;
        if (App && typeof App.minimizeApp === 'function') { App.minimizeApp(); return; }
      } catch (e3) {}
      doAppExit();
    }
    function onBackGuard(){
      if(_backHandling) return;
      _backHandling=true;
      setTimeout(function () { try { hkResetEditIcons(); if (document.activeElement && document.activeElement.blur && /BUTTON/.test(document.activeElement.tagName)) document.activeElement.blur(); } catch (eRi) {} }, 30);
      setTimeout(()=>{_backHandling=false;},250);
      /* بروزرسانی ضروری: دکمهٔ بازگشت پنجره را نمی‌بندد */
      try { if (window._hkUpdCritical && (document.getElementById('updPrompt') || document.getElementById('updDlg'))) return; } catch (eUc) {}
      try { var _up = document.getElementById('updPrompt'); if (_up) { _up.remove(); return; } } catch (eUp) {}
      /* لایه‌های شناور (باکس اطلاعات، پنجرهٔ انتخاب، فهرست‌های کشویی): بازگشت فقط بالاترین لایه را می‌بندد
         و منوی زیرش سر جایش می‌ماند */
      try { var _nmE = document.getElementById('menuUserNameText'); if (_nmE && _nmE.querySelector('input') && _nmE._hkCancelEdit) { _nmE._hkCancelEdit(); return; } } catch (eNe) {}
      /* ۱.۳.۸۰: حباب‌های موجودی: برگشت = محو شدن آرام همه در حال حرکت */
      try { if (document.getElementById('hkBubbles') && window._hkBubAlive && window._hkBubAlive()) { hkBubblesEnd(false); return; } } catch (eBb) {}
      try { if (document.getElementById('hkInfoTip')) { hkCloseInfoTip(); return; } } catch (eIt) {}
      /* ۱.۳.۵۴: باکس شناور یک‌خطی (شرح/مبلغ/حساب در همهٔ جدول‌ها): بازگشت آن را می‌بندد و همزمان یک مرحله هم عقب می‌رود */
      try { if (document.querySelector('.pd-desc-popup, .cell-text-popup')) closeCellTextPopups(); } catch (eCt) {}
      try { if (typeof closeSmsCatMore === 'function' && closeSmsCatMore()) return; } catch (eCm) {}
      try { if (document.querySelector('.fancy-select-list.open, .dark-select-list.open')) { closeAllAppMenus(); return; } } catch (eDs) {}
      /* ۱.۳.۷۱: قانون کلی — هر لایه‌ای که data-hk-back دارد و الان روی همه است (وسط صفحه زیر انگشت)،
         با بازگشت مثل «انصراف» بسته می‌شود؛ لایه‌های تازه دیگر لازم نیست تک‌تک اینجا نوشته شوند */
      try { if (hkBackTopLayer()) return; } catch (eTl) {}
      /* جزئیات ماه (روی منوی جستجو) و نمای تمام‌صفحهٔ عکس پیوست */
      try { if (document.getElementById('hkImgView')) { document.getElementById('hkImgView').remove(); return; } if (bsCloseMonthDetail()) return; } catch (eMd) {}
      /* پنجره‌های تکراری‌های قبلی / ترمیم قسط / پیوست‌ها (روی ثبت گروهی و جدول‌ها): فقط همان پنجره بسته شود */
      try { if (typeof hkCloseAttPop === 'function' && hkCloseAttPop()) return; } catch (eAp) {}
      try { var _dov = document.getElementById('hkShareOv') || document.getElementById('hkDupOv') || document.getElementById('hkInstRepOv'); if (_dov) { var _cl = _dov.querySelector('.hk-bulk-close'); if (_cl) _cl.click(); else _dov.remove(); return; } } catch (eDov) {}
      try { if (document.getElementById('hkAttachOv')) { hkCloseAttach(); return; } } catch (eAtt) {}
      try { var _rpm0 = document.getElementById('recPickModal'); if (_rpm0) { if (_rpm0._hkCancel) _rpm0._hkCancel(); else _rpm0.remove(); return; } } catch (eRp0) {}
      /* ۱.۳.۴۵: لایه‌های تازه (باکس ویرایش ردیف، اتصال‌های درآمد ثابت، حالت حذف/ویرایش ردیف، لرزش کارت): بازگشت = بستن همان لایه */
      /* ۱.۳.۵۱: باکس اسم دو نفر (قرض) و ویرایش ردیف قرض: بازگشت = انصراف */
      try { var _pm = document.getElementById('hkCatPriModal') || document.getElementById('hkPrefsModal'); if (_pm) { _pm._hkCancel ? _pm._hkCancel() : _pm.remove(); return; } } catch (ePm) {}
      try { var _lns = document.getElementById('ledgerNameSheet'); if (_lns) { if (_lns._hkCancel) _lns._hkCancel(); else { _lns.remove(); try { hideNameSheetBackdrop(); } catch (eB) {} } return; } } catch (eLns) {}
      try { var _hs = document.getElementById('hkSetupOv') || document.getElementById('hkAddPop'); if (_hs) { if (_hs._hkCancel) _hs._hkCancel(); else _hs.remove(); return; } } catch (eHs) {}
      try { var _hb = document.getElementById('hkLedDate') || document.getElementById('hkLedEdit') || document.getElementById('hkRecapOv') || document.getElementById('hkAccTxOv') || document.getElementById('hkRowEdit') || document.getElementById('recLinksModal') || document.querySelector('.hk-row-act') || document.querySelector('.hk-jig-menu'); if (_hb) { if (_hb._hkCancel) _hb._hkCancel(); else _hb.remove(); return; } } catch (eHb) {}
      try { var _rpm = document.getElementById('recPickModal') || document.getElementById('recAddPrevModal') || document.getElementById('recRenewModal') || document.getElementById('recArchiveModal') || document.getElementById('hkExportModal') || document.querySelector('.hk-enc-ov'); if (_rpm) { if (_rpm._hkCancel) _rpm._hkCancel(); else _rpm.remove(); return; } } catch (eRp) {}
      /* لایهٔ سطل زبالهٔ اسلاید باکس هوشمند (لانگ‌پرس): بازگشت = حالت عادی */
      try { var _spt = document.querySelector('.sp-trash-ov'); if (_spt) { if (_spt._hkClose) _spt._hkClose(); else _spt.remove(); document.querySelectorAll('.sp-trash-shield').forEach(function (x) { x.remove(); }); return; } } catch (eSpt) {}
      /* باکس ویرایش/افزودن حساب: اول کیبورد (خروج از فیلد)، بعد بستن باکس */
      try {
        var _be = document.getElementById('bankAddEditor');
        if (_be) {
          var _ae = document.activeElement;
          if (_ae && _be.contains(_ae) && (_ae.tagName === 'INPUT' || _ae.tagName === 'TEXTAREA')) { _ae.blur(); return; }
          if (_be._hkClose) _be._hkClose(); else _be.remove();
          return;
        }
      } catch (eBe) {}
      try { if (!document.getElementById('hkReconDlg') && !document.getElementById('hkAsk3') && !document.getElementById('bankAddEditor') && !(document.getElementById('bankAccountsModal') || {classList:{contains:function(){return false;}}}).classList.contains('open') && document.getElementById('smsBulkOv')) { var _bl = document.getElementById('hkBulkList'), _bc = document.querySelector('#smsBulkOv .hk-bulk-close'); /* ۱.۳.۵۲: پوشه‌ها آمده‌اند → بازگشت = برگشت به تعیین بازه */ if (_bl && _bl.children.length && _bc && !document.querySelector('#smsBulkOv .hk-bulk-done')) { _bc.click(); return; } closeSmsBulkModal(); return; } } catch (eBl) {}
      try { var _a3 = document.getElementById('hkAsk3'); if (_a3) { if (_a3._hkCancel) _a3._hkCancel(); else _a3.remove(); return; } } catch (eA3) {}
      /* باکس مغایرت موجودی: بازگشت = برگشت به باکس ثبت پیامک */
      try { var _rc = document.getElementById('hkReconDlg'); if (_rc) { var _bb = _rc.querySelector('.hk-recon-back') || _rc.querySelector('.hk-recon-skip'); if (_bb) _bb.click(); else _rc.remove(); return; } } catch (eRc) {}
      /* تور فقط با «رد کردن» بسته می‌شود؛ بازگشت گوشی آن را نمی‌بندد */
      try { if (document.getElementById('appTour')) return; } catch (eTour) {}
      try { if (closeVoiceInput(true)) return; } catch (eVoice) {}
      try {
        if (typeof _instantBalOpen !== 'undefined' && _instantBalOpen) {
          closeInstantBalance();
          return;
        }
      } catch (e) {}
      /* حالت جابه‌جایی کارت‌ها (لانگ‌پرس): بک اندروید نوار را می‌بندد (چیدمانِ انجام‌شده حفظ می‌شود) */
      try { if (typeof _cardReorderActive !== 'undefined' && _cardReorderActive) { commitCardReorderMode(); return; } } catch (eCro) {}
      /* برگهٔ دسته‌بندی مخارج (پنل هوشمند): انتخاب دسته ← فهرست شرح‌ها ← صفحه اصلی */
      try { if (typeof hkCloseProfile === 'function' && hkCloseProfile()) return; } catch (ePf) {}
      try { if (typeof categorySheetBack === 'function' && categorySheetBack()) return; } catch (eCat) {}
      try {
        const rb = document.getElementById('remindBar');
        if (rb && rb.classList.contains('open')) {
          closeRemindBar();
          return;
        }
      } catch (e) {}
      /* گزارش پروژه → برگشت به لیست پروژه‌ها */
      try {
        var prm = document.getElementById('projectReportModal');
        if (prm && prm.style.display === 'flex') {
          closeProjectReportModal(); // خودش لیست پروژه‌ها را باز می‌کند
          return;
        }
      } catch (e) {}
      try {
        var bko = document.getElementById('backupPickOverlay');
        if (bko) { bko.remove(); return; }
      } catch (eBk) {}
      try {
        var prp = document.getElementById('projectRowPickerOverlay');
        if (prp) { prp.remove(); return; }
      } catch (ePr) {}
      try { if (document.getElementById('todoEditorOverlay')) { closeTodoEditor(); return; } } catch (eTd) {}
      try { if (typeof HKStats !== 'undefined' && HKStats.close()) return; } catch (eSt) {}
      try { if (document.getElementById('hkImgView')) { document.getElementById('hkImgView').remove(); return; } if (hkCloseAttach()) return; } catch (eAt) {}
      /* ثبت گروهی پیامک (و پنجرهٔ ردیف‌های تکراری روی آن): بازگشت همین پنجره را می‌بندد، نه صفحهٔ زیرش.
         اگر پنجرهٔ حساب‌ها روی آن باز است، اول همان بسته می‌شود */
      try {
        var _bam = document.getElementById('bankAccountsModal'), _bamOpen = _bam && _bam.classList.contains('open');
        if (!_bamOpen) {
          var _dov = document.getElementById('hkDupOv'); if (_dov) { _dov.remove(); return; }
          if (document.getElementById('smsBulkOv')) { var _dn = document.querySelector('#smsBulkOv .hk-bulk-done'); if (_dn) _dn.click(); else closeSmsBulkModal(); return; }
        }
      } catch (eSb) {}
      if(closeTopOverlayOrMenu()) return;
      // از صفحه درآمد/مخارج/مانده کارت به خانه
      try {
        if (typeof _detailContext !== 'undefined' && _detailContext) {
          closePersonDetail();
          return;
        }
      } catch (e) {}
      hkAppToBackground();
    }

    try {
      const C=window.Capacitor, plugins=C&&C.Plugins, App=plugins&&plugins.App;
      if(App && App.addListener) App.addListener('backButton',()=>onBackGuard());
    } catch(e){}

    // نسخه مرورگر/وب: یک history entry نگه می‌داریم تا Back از صفحه خارج نشود.
    try{
      history.pushState({hesabBackGuard:true},'',location.href);
      window.addEventListener('popstate',()=>{ try{history.pushState({hesabBackGuard:true},'',location.href);}catch(e){} onBackGuard(); });
    }catch(e){}

    let balanceSelectedTitles = []; // empty = all
    let balanceSelectedAccount = ''; // empty = all accounts

    function onBalanceDayInput(el) {
      /* legacy no-op; day filter uses dropdown */
      renderBalanceTab();
    }
    function setBalanceDayFilter(day) {
      const hidden = document.getElementById('balanceDayFilter');
      if (hidden) hidden.value = day ? String(day) : '';
      renderBalanceDayFilter();
      renderBalanceTab();
    }
    /* منوی «روز»: همه روزها + ۱ تا ۳۱؛ با زمان چندماهه همان روز در هر ماه */
    function renderBalanceDayFilter() {
      const sel = document.getElementById('balanceSearchDay');
      const hidden = document.getElementById('balanceDayFilter');
      if (!sel) return;
      const cur = hidden ? (parseInt(toEnglishDigits(hidden.value || '').replace(/[^0-9]/g, '') || '0', 10) || 0) : 0;
      if (!sel._filled) {
        let h = '<option value="">همهٔ روزها</option>';
        for (let d = 1; d <= 31; d++) h += '<option value="' + d + '">' + toPersianDigits(d) + '</option>';
        sel.innerHTML = h; sel._filled = true;
      }
      if (sel.value !== (cur ? String(cur) : '')) {
        sel.value = cur ? String(cur) : '';
        try { if (sel._fancyRender) sel._fancyRender(); } catch (e) {}
      }
    }
    /* منوی بخش: با یک کاربر فقط نام او؛ با چند کاربر پیش‌فرض اولین کاربر و گزینهٔ «همه» */
    let balanceSectionAll = false;
    function renderBalanceSectionFilter() {
      const wrap = document.getElementById('balanceSectionWrap');
      if (!wrap) return;
      /* از ۱.۳.۴۶ تک‌کاربره: فقط کارت اصلی؛ جستجو همهٔ ردیف‌ها را می‌گیرد */
      if (typeof hkMainTitle === 'function') {
        balanceSectionAll = true; balanceSelectedTitles = [];
        wrap.innerHTML = '';
        const sel1 = createDarkSelect({ options: [{ value: '__all__', label: hkMainTitle() || '—' }], value: '__all__', onChange: function () {} });
        if (sel1._list) sel1._list.classList.add('bsr-list');
        wrap.appendChild(sel1);
        return;
      }
      const titles = allSectionTitles();
      if (balanceSelectedTitles.length > 1) balanceSelectedTitles = [balanceSelectedTitles[0]];
      if (balanceSelectedTitles.length && titles.indexOf(balanceSelectedTitles[0]) < 0) balanceSelectedTitles = [];
      if (!balanceSelectedTitles.length && titles.length && (titles.length === 1 || !balanceSectionAll)) balanceSelectedTitles = [titles[0]];
      const opts = titles.map(t => ({ value: t, label: t }));
      if (titles.length > 1) opts.push({ value: '__all__', label: 'همهٔ بخش‌ها' });
      wrap.innerHTML = '';
      const sel = createDarkSelect({
        options: opts.length ? opts : [{ value: '', label: '—' }],
        value: balanceSelectedTitles.length ? balanceSelectedTitles[0] : (titles.length > 1 ? '__all__' : ''),
        onChange: (v) => {
          if (v === '__all__' || !v) { balanceSectionAll = true; balanceSelectedTitles = []; }
          else { balanceSectionAll = false; balanceSelectedTitles = [v]; }
          renderBalanceTab();
          try { renderBalanceSearch(); } catch (e) {}
        }
      });
      if (sel._list) sel._list.classList.add('bsr-list');
      wrap.appendChild(sel);
    }


    /* —— بده‌بستان (بخش‌محور) —— */
    let ledgerSelectedPerson = '';


