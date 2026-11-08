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
      /* ۱.۳.۸۹: دُنگ (همان آیکون منو) */
      dong: { label: 'دُنگ', go: function () { openDongModal(); }, svg: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6.9 4M12 12l-6.9 4"/>' },
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
      var kind = 'in'; /* ۱.۳.۸۵: پیش‌فرض «واریزی» */
      var listOf = function (k) {
        var cats = k === 'in' ? HK_INCOME_CATS.slice() : HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); });
        var use = hkCatUseLoad();
        return cats.map(function (c, i) { return { c: c, s: hkCatScore(k, c.id, use, i) }; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.c; });
      };
      var save = function (ids) { var o = hkPrefs().catOrder || {}; o[kind] = ids; hkPrefSet('catOrder', o); };
      /* ۱.۳.۸۸: تب‌ها یک بار ساخته می‌شوند تا خط زیر با افکت لغزشی جابه‌جا شود؛ واریزی سبز، برداشت نارنجی */
      var tabs = document.createElement('div'); tabs.className = 'hk-re-seg hk-pri-tabs';
      [['in', 'واریزی'], ['out', 'برداشت']].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-re-segb hk-re-pjb' + (kind === o[0] ? ' on' : ''); b.dataset.k = o[0]; b.textContent = o[1];
        b.onclick = function () { if (kind === o[0]) return; kind = o[0]; tabs.querySelectorAll('.hk-re-segb').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); };
        tabs.appendChild(b);
      });
      var draw = function () {
        var pri = hkCatPri(kind), L = listOf(kind);
        box.innerHTML = '<div class="hk-prefs-t">اولویت دسته‌بندی‌ها</div>';
        box.appendChild(tabs);
        /* ۱.۳.۸۵: یک کلید «خودکار» (بر اساس استفاده)؛ خاموش = ترتیب دستی با کشیدن */
        var auto = !pri;
        var mode = document.createElement('div'); mode.className = 'hk-pri-mode bk-sw-row'; mode.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;';
        mode.innerHTML = '<span class="bk-ttl">ترتیب خودکار (بر اساس استفاده)</span><button type="button" class="hk-switch' + (auto ? ' on' : '') + '" role="switch" aria-checked="' + auto + '" aria-label="ترتیب خودکار"><i></i></button>';
        mode.querySelector('.hk-switch').onclick = function () { save(auto ? L.map(function (c) { return c.id; }) : null); draw(); };
        box.appendChild(mode);
        var hint = document.createElement('div'); hint.className = 'hk-prefs-hint'; hint.textContent = auto ? 'دسته‌هایی که بیشتر استفاده می‌کنید جلوتر می‌آیند؛ برای چیدن دستی کلید را خاموش کنید' : 'دستگیرهٔ کنار هر دسته را نگه دارید و بکشید؛ چهار تای اول روی اعلان می‌آیند';
        box.appendChild(hint);
        /* ۱.۳.۵۵: کشیدن و رها کردن (کشیدن در حالت خودکار = دستی شدن) */
        var ul = document.createElement('div'); ul.className = 'hk-pri-list' + (auto ? ' hk-pri-auto' : '');
        var renum = function () { [].forEach.call(ul.children, function (r, i) { r.classList.toggle('top', i < 4); r.querySelector('b').textContent = toPersianDigits(String(i + 1)); }); };
        L.forEach(function (c) {
          var r = document.createElement('div'); r.className = 'hk-pri-row'; r.dataset.id = c.id;
          /* ۱.۳.۸۷: آیکون و رنگ هر دسته کنار نامش */
          r.innerHTML = '<b></b><i class="hk-pri-ci" style="--cc:' + hkCatColor(c.id) + '">' + hkCatIco(c.id) + '</i><span>' + escapeHtml(c.label) + '</span><i class="hk-pri-h" aria-label="جابه‌جایی"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg></i>';
          var h = r.querySelector('.hk-pri-h'), drag = null;
          h.addEventListener('pointerdown', function (e) {
            if (auto) return;
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
          var end = function () { if (!drag) return; drag = null; r.classList.remove('drag'); save([].map.call(ul.children, function (x) { return x.dataset.id; })); };
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
      /* ۱.۳.۹۱: اندازهٔ باکس بین «واریزی» و «برداشت» عوض نمی‌شود (اندازهٔ تب بلندتر، تا سقف ارتفاع باکس)؛ فهرست داخل خود باکس اسکرول می‌شود */
      try {
        var k0 = kind, hs = [];
        ['in', 'out'].forEach(function (k) { kind = k; draw(); box.style.height = ''; hs.push(box.getBoundingClientRect().height); });
        kind = k0; draw();
        box.style.height = Math.ceil(Math.max.apply(null, hs)) + 'px'; box.style.overflowY = 'auto';
        tabs.addEventListener('click', function () { box.scrollTop = 0; });
      } catch (eFix) {}
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
      const live = selectedAccountLabels();
      /* ۱.۳.۸۸: حساب/کارت پاک‌شده‌ای که ردیف‌هایش مانده هم در فیلتر هست */
      const gone = [];
      try {
        const seen = {}; live.forEach(n => { seen[n] = 1; });
        const scan = pd => ['expense', 'income'].forEach(tab => (((pd && pd[tab] && pd[tab].sections) || [])).forEach(sec => (sec.rows || []).forEach(r => {
          const a = r && !r.deletedAt && String(r.account || '').trim();
          if (a && !seen[a]) { seen[a] = 1; gone.push(a); }
        })));
        scan(periodData); Object.keys(archive || {}).forEach(k => scan(archive[k]));
      } catch (eG) {}
      const opts = [{ value: '', label: 'همهٔ حساب‌ها' }].concat(
        live.map(n => ({ value: n, label: n })),
        gone.sort().map(n => ({ value: n, label: n + ' (پاک‌شده)' }))
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
