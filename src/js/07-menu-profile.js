    /* ===== ۱.۳.۷۴: پروفایل منو (عکس + اسم قابل ویرایش)، تغییر نام کاربر اصلی، جستجوی منو ===== */
    var HK_AVATAR_KEY = STORAGE_KEY + '_avatar';
    function hkAvatarGet() { try { return localStorage.getItem(HK_AVATAR_KEY) || ''; } catch (e) { return ''; } }
    function hkRenderMenuProfile() {
      var av = document.getElementById('menuUserAvatar'), nm = document.getElementById('menuUserNameText');
      var name = ''; try { name = hkMainTitle() || ''; } catch (e0) {}
      if (av) {
        var src = hkAvatarGet();
        var cam = '<span class="cam"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>';
        av.innerHTML = (src ? '<img alt="" src="' + src.replace(/"/g, '') + '">' : escapeHtml((name.trim()[0] || '؟'))) + cam;
      }
      if (nm && !nm.querySelector('input')) {
        nm.innerHTML = '<span class="hk-mprof-row"><span class="hk-mprof-t"></span><button type="button" class="hk-mprof-pen" aria-label="ویرایش اسم">' + HK_EDIT_SVG + '</button></span>';
        nm.querySelector('.hk-mprof-t').textContent = name;
        nm.querySelector('.hk-mprof-pen').onclick = function (e) { e.stopPropagation(); hkNameEditStart(); };
      }
    }
    function hkAvatarPopClose() { var p = document.getElementById('hkAvPop'); if (p) p.remove(); }
    function hkAvatarMenu(btn) {
      if (document.getElementById('hkAvPop')) { hkAvatarPopClose(); return; }
      var r = btn.getBoundingClientRect(), has = !!hkAvatarGet();
      var pop = document.createElement('div'); pop.className = 'hk-av-pop'; pop.id = 'hkAvPop'; pop.setAttribute('data-hk-back', '1');
      pop.innerHTML = '<button type="button" class="chg">' + (has ? 'تغییر عکس' : 'انتخاب عکس') + '</button>' + (has ? '<button type="button" class="del">حذف عکس</button>' : '');
      pop.style.top = (r.bottom + 6) + 'px'; pop.style.right = Math.max(8, innerWidth - r.right) + 'px';
      pop._hkCancel = hkAvatarPopClose;
      pop.querySelector('.chg').onclick = function (e) { e.stopPropagation(); hkAvatarPopClose(); hkAvatarPick(); };
      if (has) pop.querySelector('.del').onclick = function (e) { e.stopPropagation(); hkAvatarPopClose(); try { localStorage.removeItem(HK_AVATAR_KEY); } catch (e2) {} hkRenderMenuProfile(); showToast('عکس حذف شد'); };
      document.body.appendChild(pop);
      setTimeout(function () {
        var off = function (ev) { if (!pop.contains(ev.target)) { hkAvatarPopClose(); document.removeEventListener('pointerdown', off, true); } };
        document.addEventListener('pointerdown', off, true);
      }, 0);
    }
    /* ۱.۳.۷۷: زدن عکس پروفایل: عکس بزرگ وسط صفحه، زیرش «تغییر عکس» و «حذف عکس» */
    function hkAvatarView() {
      var old = document.getElementById('hkAvView'); if (old) { old.remove(); return; }
      var src = hkAvatarGet(), name = ''; try { name = hkMainTitle() || ''; } catch (e) {}
      var ov = document.createElement('div'); ov.id = 'hkAvView'; ov.className = 'hk-av-view'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="hk-av-big">' + (src ? '<img alt="" src="' + src.replace(/"/g, '') + '">' : '<span>' + escapeHtml(name.trim()[0] || '؟') + '</span>') + '</div>' +
        '<div class="hk-av-acts"><button type="button" class="chg">' + (src ? 'تغییر عکس' : 'انتخاب عکس') + '</button>' + (src ? '<button type="button" class="del">حذف عکس</button>' : '') + '</div>';
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === ov) close(); });
      ov.querySelector('.chg').onclick = function (e) { e.stopPropagation(); close(); hkAvatarPick(); };
      if (src) ov.querySelector('.del').onclick = function (e) { e.stopPropagation(); close(); try { localStorage.removeItem(HK_AVATAR_KEY); } catch (e2) {} hkRenderMenuProfile(); showToast('عکس حذف شد'); };
      document.body.appendChild(ov);
      if (src) hkZoomable(ov.querySelector('.hk-av-big'), ov.querySelector('.hk-av-big img'));
    }
    /* ۱.۳.۸۰: عکس بزرگ پروفایل قابل زوم: دو انگشت یا دو بار زدن؛ در حالت زوم کشیدن جابه‌جا می‌کند */
    function hkZoomable(box, im) {
      if (!box || !im) return;
      box.style.touchAction = 'none'; im.style.transformOrigin = '0 0'; im.style.willChange = 'transform';
      var z = 1, x = 0, y = 0, pts = {}, last = null, pinch0 = null, lastTap = 0;
      var W = function () { return box.clientWidth; }, H = function () { return box.clientHeight; };
      var clamp = function () { x = Math.min(0, Math.max(W() - W() * z, x)); y = Math.min(0, Math.max(H() - H() * z, y)); };
      var paint = function (anim) { clamp(); im.style.transition = anim ? 'transform 0.25s ease' : 'none'; im.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')'; };
      var setZoom = function (nz, cx, cy, anim) { nz = Math.max(1, Math.min(5, nz)); var k = nz / z; x = cx - (cx - x) * k; y = cy - (cy - y) * k; z = nz; paint(anim); };
      var local = function (e) { var r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      box.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); try { box.setPointerCapture(e.pointerId); } catch (eC) {}
        pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; pinch0 = null;
        var now = Date.now();
        if (Object.keys(pts).length === 1 && now - lastTap < 300) { var q = local(e); setZoom(z > 1.05 ? 1 : 2.5, q.x, q.y, true); lastTap = 0; } else lastTap = now;
      });
      box.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), r = box.getBoundingClientRect(), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
          if (!pinch0) pinch0 = { d: d, z: z }; else setZoom(pinch0.z * d / pinch0.d, cx, cy, false);
        } else if (last && z > 1) { x += e.clientX - last.x; y += e.clientY - last.y; paint(false); }
        last = { x: e.clientX, y: e.clientY };
      });
      var up = function (e) { delete pts[e.pointerId]; pinch0 = null; var ids = Object.keys(pts); last = ids.length ? pts[ids[0]] : null; };
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
      box.addEventListener('click', function (e) { e.stopPropagation(); });
      box._hkZoom = { get: function () { return { z: z, x: x, y: y }; }, set: function (nz, cx, cy) { setZoom(nz, cx == null ? W() / 2 : cx, cy == null ? H() / 2 : cy, false); } };
    }
    /* ۱.۳.۷۸: پنجرهٔ برش عکس پروفایل: عکس زیر یک کادر مربعی؛ کشیدن = جابه‌جایی، دو انگشت یا نوار = بزرگ/کوچک؛ خروجی ۵۱۲×۵۱۲ */
    function hkAvatarCropOpen(file, done) {
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () { hkAvatarCropUI(img, done); };
        img.onerror = function () { showToast('این فایل عکس نیست'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    }
    function hkAvatarCropUI(img, done) {
      var old = document.getElementById('hkAvCrop'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkAvCrop'; ov.className = 'hk-av-view hk-av-crop'; ov.setAttribute('data-hk-back', '1');
      var F = Math.min(Math.round(innerWidth * 0.8), 320);
      ov.innerHTML = '<div class="hk-crop-t">محدودهٔ عکس را انتخاب کنید</div><div class="hk-crop-frame" style="width:' + F + 'px;height:' + F + 'px"><img alt="" draggable="false"></div>' +
        '<input type="range" class="hk-crop-zoom" min="1" max="4" step="0.01" value="1" aria-label="بزرگ‌نمایی">' +
        '<div class="hk-av-acts"><button type="button" class="chg">ثبت</button><button type="button" class="no">انصراف</button></div>';
      var fr = ov.querySelector('.hk-crop-frame'), im = fr.querySelector('img'), zr = ov.querySelector('.hk-crop-zoom');
      im.src = img.src;
      var w = img.naturalWidth, h = img.naturalHeight, s0 = F / Math.min(w, h), z = 1, x = 0, y = 0;
      var clamp = function () { var sc = s0 * z, W = w * sc, H = h * sc; x = Math.min(0, Math.max(F - W, x)); y = Math.min(0, Math.max(F - H, y)); };
      var paint = function () { clamp(); var sc = s0 * z; im.style.width = (w * sc) + 'px'; im.style.height = (h * sc) + 'px'; im.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
      var setZoom = function (nz, cx, cy) {
        nz = Math.max(1, Math.min(4, nz)); if (cx == null) { cx = F / 2; cy = F / 2; }
        var k = nz / z; x = cx - (cx - x) * k; y = cy - (cy - y) * k; z = nz; zr.value = String(z); paint();
      };
      x = (F - w * s0) / 2; y = (F - h * s0) / 2; paint();
      var pts = {}, last = null, pinch0 = null;
      fr.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); fr.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; pinch0 = null; });
      fr.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return; e.preventDefault();
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), r = fr.getBoundingClientRect();
          if (!pinch0) pinch0 = { d: d, z: z }; else setZoom(pinch0.z * d / pinch0.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        } else if (last) { x += e.clientX - last.x; y += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; paint(); }
      });
      var up = function (e) { delete pts[e.pointerId]; pinch0 = null; var ids = Object.keys(pts); last = ids.length ? pts[ids[0]] : null; };
      fr.addEventListener('pointerup', up); fr.addEventListener('pointercancel', up);
      zr.addEventListener('input', function () { setZoom(parseFloat(zr.value)); });
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { e.stopPropagation(); });
      ov.querySelector('.no').onclick = function (e) { e.stopPropagation(); close(); };
      ov.querySelector('.chg').onclick = function (e) {
        e.stopPropagation();
        var sc = s0 * z, S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
        c.getContext('2d').drawImage(img, -x / sc, -y / sc, F / sc, F / sc, 0, 0, S, S);
        close(); done(c.toDataURL('image/jpeg', 0.9));
      };
      ov._hkState = function () { return { x: x, y: y, z: z, F: F, s0: s0 }; };
      document.body.appendChild(ov);
    }
    /* برش مربعی از وسط (۵۱۲×۵۱۲ JPEG با کیفیت ۰٫۹) — بدون پنجرهٔ برش */
    function hkAvatarFromFile(file, done) {
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
          var m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = (img.height - m) / 2;
          c.getContext('2d').drawImage(img, sx, sy, m, m, 0, 0, S, S);
          done(c.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = function () { showToast('این فایل عکس نیست'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    }
    function hkAvatarPick() {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
        /* ۱.۳.۷۸: اول پنجرهٔ برش (جابه‌جا کردن و بزرگ/کوچک کردن داخل کادر مربعی) */
        hkAvatarCropOpen(f, function (url) { try { localStorage.setItem(HK_AVATAR_KEY, url); } catch (e) { showToast('ذخیرهٔ عکس ممکن نشد'); return; } hkRenderMenuProfile(); });
      };
      /* داخل منو تا کلیکِ ورودی فایل منو را نبندد */
      (document.getElementById('menuDropdown') || document.body).appendChild(inp); inp.click();
    }
    /* تغییر نام کاربر اصلی — همان کار «ویرایش کاربر» (بخش‌های ماه، متای کارت، ماه‌های دیگر) */
    function hkRenameMainTitle(title, name) {
      name = (name || '').trim();
      if (!name || name === title) return false;
      if (allPersonTitles().some(function (t) { return t === name && t !== title; })) { showToast('اسم تکراری است'); return false; }
      var inc = findSectionByTitle('income', title), exp = findSectionByTitle('expense', title);
      if (inc) inc.title = name;
      if (exp) exp.title = name;
      try { localStorage.setItem(STORAGE_KEY + '_mainCard', name); setTimeout(hkSingleCardNormalizeAll, 0); } catch (eMc) {}
      var m = getCardMetaMap();
      if (m[title]) { m[name] = Object.assign({}, m[title]); delete m[title]; periodData.cardMeta = m; }
      try { setActiveHomeCardTitle(name); } catch (e) {}
      persistCurrent(); scheduleSave(); renderHomeCards();
      return true;
    }
    function hkNameEditStart() {
      var nm = document.getElementById('menuUserNameText'); if (!nm || nm.querySelector('input')) return;
      /* ۱.۳.۸۰: با باکس پروفایل بسته، اسم قابل ویرایش نیست */
      var pb = document.getElementById('menuUserName'); if (pb && !pb.classList.contains('open')) return;
      var old = ''; try { old = hkMainTitle() || ''; } catch (e) {}
      nm.innerHTML = '<input type="text" maxlength="40"><small>Enter = ذخیره</small>';
      var inp = nm.querySelector('input'); inp.value = old;
      var done = false;
      var fin = function (save) {
        if (done || !inp.isConnected) return;
        done = true; /* ۱.۳.۸۰: جلوگیری از ذخیرهٔ دوباره با blur هنگام برداشتن فیلد (لغو با برگشت) */
        var v = (inp.value || '').trim();
        nm.innerHTML = '';
        if (save && v && v !== old) { if (hkRenameMainTitle(old, v)) showToast('نام ذخیره شد'); }
        hkRenderMenuProfile();
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') fin(false); });
      var t0 = Date.now();
      /* ۱.۳.۸۱: blur ناخواسته در لحظهٔ باز شدن کیبورد (تغییر اندازهٔ صفحه) ویرایش را نبندد */
      inp.addEventListener('blur', function () { if (Date.now() - t0 < 900 && inp.isConnected && !done) { setTimeout(function () { if (inp.isConnected && !done) { try { inp.focus(); } catch (eF) {} } }, 30); return; } fin(true); });
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      /* ۱.۳.۸۰: برگشت (که در اندروید اول کیبورد را می‌بندد) = بستن کیبورد و لغو ویرایش */
      nm._hkCancelEdit = function () { fin(false); try { inp.blur(); } catch (e) {} };
      try {
        /* ۱.۳.۸۱: «کیبورد بسته شد» فقط وقتی که اول واقعاً باز شده (ارتفاع ۱۵۰+ کم شده) و بعد ارتفاع به حالت اولِ قبل از کیبورد برگشته و چند لحظه همان‌جا مانده */
        var vv = window.visualViewport, H0 = vv ? vv.height : 0, I0 = window.innerHeight, kbSeen = false, stT = 0;
        if (vv) {
          var curH = function () { return Math.min(vv.height, window.innerHeight); };
          var onVv = function () {
            if (!inp.isConnected || done) { vv.removeEventListener('resize', onVv); window.removeEventListener('resize', onVv); return; }
            var h = curH();
            if (h < Math.min(H0, I0) - 150) kbSeen = true;
            clearTimeout(stT);
            if (kbSeen && h > Math.min(H0, I0) - 60 && Date.now() - t0 > 800) {
              stT = setTimeout(function () { if (inp.isConnected && !done && curH() > Math.min(H0, I0) - 60) { vv.removeEventListener('resize', onVv); window.removeEventListener('resize', onVv); nm._hkCancelEdit(); } }, 350);
            }
          };
          vv.addEventListener('resize', onVv); window.addEventListener('resize', onVv);
        }
      } catch (eVv) {}
      setTimeout(function () { inp.focus(); try { inp.setSelectionRange(0, inp.value.length); } catch (e) {} }, 0);
    }
    function hkMenuNorm(t) { return String(t || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
    function hkMenuSearchItems() {
      var out = [];
      document.querySelectorAll('#menuDropdown .hk-mg').forEach(function (g) {
        var gl = (g.querySelector('.menu-section-label') || {}).textContent || '';
        g.querySelectorAll('.hk-mg-box > .menu-item, .hk-mg-box > .menu-theme-row').forEach(function (el) {
          if (el.style.display === 'none' || getComputedStyle(el).display === 'none') return;
          var lab = el.classList.contains('menu-theme-row') ? el.querySelector('span').textContent : el.childNodes.length ? Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join('') : el.textContent;
          out.push({ el: el, label: lab.trim(), group: gl.trim() });
        });
      });
      return out;
    }
    function hkMenuSearch(q) {
      var sc = document.querySelector('#menuDropdown .menu-scroll'), res = document.getElementById('menuSearchRes'), box = document.querySelector('#menuDropdown .hk-msearch');
      if (!sc || !res) return;
      var nq = hkMenuNorm(q);
      if (box) box.classList.toggle('has-q', !!String(q || '').length);
      if (!nq) { sc.classList.remove('hk-searching'); res.hidden = true; res.innerHTML = ''; return; }
      sc.classList.add('hk-searching'); res.hidden = false; sc.scrollTop = 0;
      var hits = hkMenuSearchItems().filter(function (it) { return hkMenuNorm(it.label).indexOf(nq) >= 0 || hkMenuNorm(it.group).indexOf(nq) >= 0; });
      res.innerHTML = '<div class="menu-section-label"></div>' + (hits.length ? '<div class="hk-mg-box"></div>' : '<div class="hk-sr-none">چیزی پیدا نشد</div>');
      res.firstChild.textContent = 'نتیجه برای «' + String(q).trim() + '»';
      var bx = res.querySelector('.hk-mg-box');
      hits.forEach(function (it) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'menu-item hk-sr-item';
        var ic = it.el.querySelector('.hk-mi'); if (ic) b.appendChild(ic.cloneNode(true));
        var sp = document.createElement('span'), L = it.label, k = hkMenuNorm(L).indexOf(nq);
        if (k >= 0 && hkMenuNorm(L) === L.replace(/\s+/g, ' ').trim().toLowerCase()) { sp.appendChild(document.createTextNode(L.slice(0, k))); var mk = document.createElement('mark'); mk.textContent = L.slice(k, k + nq.length); sp.appendChild(mk); sp.appendChild(document.createTextNode(L.slice(k + nq.length))); }
        else sp.textContent = L;
        b.appendChild(sp);
        var pth = document.createElement('span'); pth.className = 'hk-sr-path'; pth.textContent = it.group; b.appendChild(pth);
        b.onclick = function (e) { e.stopPropagation(); it.el.click(); if (it.el.classList.contains('menu-theme-row')) hkMenuSearch(document.getElementById('menuSearchInput').value); };
        bx.appendChild(b);
      });
    }
    /* جستجوی شناور: با اسکرول سریع محو، ۲۲۰ میلی‌ثانیه بعد از ایستادن برمی‌گردد */
    (function () {
      var bind = function () {
        var sc = document.querySelector('#menuDropdown .menu-scroll'), sw = document.querySelector('#menuDropdown .hk-msearch-wrap');
        if (!sc || !sw || sc._hkMsF) return; sc._hkMsF = true;
        var lastY = sc.scrollTop, lastT = 0, tmr = 0;
        sc.addEventListener('scroll', function () {
          var now = performance.now(), y = sc.scrollTop, v = lastT ? Math.abs(y - lastY) / Math.max(1, now - lastT) : 0;
          lastY = y; lastT = now;
          if (v > 1.6 && document.activeElement !== document.getElementById('menuSearchInput')) sw.classList.add('hk-ms-hide');
          clearTimeout(tmr); tmr = setTimeout(function () { sw.classList.remove('hk-ms-hide'); lastT = 0; }, 220);
        }, { passive: true });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else setTimeout(bind, 0);
    })();
    function hkMenuSearchClear() { var i = document.getElementById('menuSearchInput'); if (i) i.value = ''; hkMenuSearch(''); }
    function hkMenuSearchMic() {
      var inp = document.getElementById('menuSearchInput'); if (!inp) return;
      if (inp.value) { hkMenuSearchClear(); inp.focus(); return; }
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        try {
          var r = new SR(); r.lang = 'fa-IR'; r.interimResults = false; r.maxAlternatives = 1;
          r.onresult = function (ev) { var t = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : ''; inp.value = t; hkMenuSearch(t); };
          r.onerror = function () { inp.focus(); };
          r.start(); showToast('بگویید…'); return;
        } catch (e) {}
      }
      inp.focus();
      showToast('از دکمهٔ میکروفون صفحه‌کلید استفاده کنید');
    }
    try { Object.assign(window, { hkRenderMenuProfile: hkRenderMenuProfile, hkAvatarMenu: hkAvatarMenu, hkAvatarView: hkAvatarView, hkAvatarCropUI: hkAvatarCropUI, hkNameEditStart: hkNameEditStart, hkRenameMainTitle: hkRenameMainTitle, hkMenuSearch: hkMenuSearch, hkMenuSearchClear: hkMenuSearchClear, hkMenuSearchMic: hkMenuSearchMic, hkAvatarFromFile: hkAvatarFromFile }); } catch (eW74) {}
    try { window.hkToggleProfile = hkToggleProfile; } catch (eWt) {}
    function closeCategoryReviewSheet() {
      var ov = document.querySelector('.sp-cat-sheet');
      if (!ov) return false;
      try { ov.remove(); } catch (e) {}
      if (ov._spDirty) { try { renderAll(); } catch (e3) {} }
      try { renderHomeCards(); } catch (e2) {}
      return true;
    }
    function categorySheetBack() {
      var ov = document.querySelector('.sp-cat-sheet');
      if (!ov) return false;
      /* ۱.۳.۸۳: اول حالت لرزش (حذف دسته) بسته شود */
      if (ov._spJiggleOff && ov._spJiggleOff()) return true;
      if (ov._spPicking) { ov._spShowList(); return true; }
      return closeCategoryReviewSheet();
    }
    function openCategoryReviewSheet(title) {
      if (document.querySelector('.sp-cat-sheet')) return;
      var sec = findSectionByTitle('expense', title);
      var seen = {}, items = [];
      /* ۱.۳.۸۳: ردیف‌های «جیب به جیب» هم در فهرست هستند (با دستهٔ خودشان) */
      ((sec && sec.rows) || []).filter(function (r) { return r && !r.deletedAt && (Number(r.amount) || 0) > 0; }).forEach(function (r) {
        var d = String(r.desc || '').trim();
        var n = HKCategorizer.normalize(d);
        if (!n || seen[n] || r.fromPlanId) return;
        seen[n] = 1;
        items.push(d);
      });
      var openedAt = Date.now();
      var ov = document.createElement('div');
      ov.className = 'modal-overlay open sp-cat-sheet';
      ov.style.cssText = 'z-index:600;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div');
      box.className = 'modal-box';
      box.style.cssText = 'max-width:360px;width:min(360px,92vw);text-align:right;max-height:80vh;display:flex;flex-direction:column;';
      var h = document.createElement('div');
      h.style.cssText = 'font-weight:800;margin-bottom:6px;';
      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:0.74rem;opacity:0.7;margin-bottom:10px;line-height:1.6;';
      var body = document.createElement('div');
      body.style.cssText = 'overflow-y:auto;flex:1 1 auto;min-height:0;';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-btn yes';
      btn.style.cssText = 'margin-top:12px;width:100%;';
      /* بیضی‌ها: عرض همه = بلندترین نام دسته + فاصلهٔ کم؛ چنددسته‌ای‌ها کوچک‌تر */
      function chipWidths() {
        var probe = document.createElement('span');
        probe.className = 'sp-cat-chip';
        probe.style.cssText = 'position:absolute;visibility:hidden;width:auto;';
        document.body.appendChild(probe);
        var w1 = 0, w2 = 0;
        HKCategorizer.categories.concat([{ label: 'نامشخص' }]).forEach(function (c) {
          probe.className = 'sp-cat-chip'; probe.textContent = c.label; w1 = Math.max(w1, probe.scrollWidth);
          probe.className = 'sp-cat-chip sm'; w2 = Math.max(w2, probe.scrollWidth);
        });
        probe.remove();
        return { one: Math.ceil(w1) + 2, sm: Math.ceil(w2) + 2 };
      }
      var rowsOfDesc = function (d) {
        var n = HKCategorizer.normalize(d);
        return ((sec && sec.rows) || []).filter(function (r) { return r && !r.deletedAt && HKCategorizer.normalize(String(r.desc || '').trim()) === n; });
      };
      var isP2PDesc = function (d) { return rowsOfDesc(d).some(function (r) { return r.p2p; }); };
      function showList() {
        ov._spPicking = false;
        if (ov._spJiggleOff) ov._spJiggleOff();
        h.textContent = 'دسته‌بندی مخارج';
        sub.textContent = items.length ? 'روی هر شرح بزن و دسته‌اش را انتخاب کن (چند دسته هم می‌شود)؛ نرم‌افزار دفعه‌های بعد همین را به خاطر می‌سپارد.' : 'هنوز شرحی برای مخارج این ماه ثبت نشده.';
        btn.textContent = 'بستن';
        body.innerHTML = '';
        var cw = chipWidths();
        box.style.setProperty('--chip-w', cw.one + 'px');
        box.style.setProperty('--chip-w-sm', cw.sm + 'px');
        var rows = [];
        items.forEach(function (d) {
          var c = isP2PDesc(d) ? { id: 'p2p', ids: ['p2p'], label: 'جیب به جیب', p2p: true } : HKCategorizer.classify(d, rowsOfDesc(d)[0]);
          var row = document.createElement('button');
          row.type = 'button';
          row.className = 'sp-cat-row';
          var lab = document.createElement('span');
          lab.className = 'sp-cat-desc';
          lab.textContent = d;
          var chips = document.createElement('span');
          chips.className = 'sp-cat-chips';
          row.appendChild(lab);
          row.appendChild(chips);
          row.onclick = function () { showPicker(d, c && !c.p2p ? c.ids.slice() : []); };
          body.appendChild(row);
          rows.push({ chips: chips, c: c, row: row });
        });
        /* بعد از چیدمان: هر تعداد بیضی که جا شود؛ بقیه «N دسته دیگر» */
        rows.forEach(function (o) {
          var mk = function (txt, cls) { var e = document.createElement('span'); e.className = 'sp-cat-chip' + (cls ? ' ' + cls : ''); e.textContent = txt; return e; };
          if (!o.c) { o.chips.appendChild(mk('نامشخص', 'none')); return; }
          if (o.c.p2p) { o.chips.appendChild(mk(o.c.label, 'p2p')); return; }
          if (o.c.ids.length === 1) { o.chips.appendChild(mk(o.c.label)); return; }
          var labels = o.c.ids.map(function (id) { return HKCategorizer.byId[id].label; });
          var avail = Math.max(cw.sm, o.row.clientWidth * 0.62);
          var per = cw.sm + 4, fit = Math.max(1, Math.floor((avail + 4) / per));
          if (labels.length <= fit) { labels.forEach(function (l) { o.chips.appendChild(mk(l, 'sm')); }); return; }
          var show = Math.max(1, fit - 1);
          labels.slice(0, show).forEach(function (l) { o.chips.appendChild(mk(l, 'sm')); });
          o.chips.appendChild(mk(spFa(labels.length - show) + ' دسته دیگر', 'sm more'));
        });
        body.scrollTop = ov._spListScroll || 0;
      }
      function showPicker(desc, sel) {
        ov._spListScroll = body.scrollTop;
        ov._spPicking = true;
        h.textContent = 'انتخاب دسته';
        sub.textContent = '«' + desc + '» — یک یا چند دسته';
        btn.textContent = 'تأیید';
        body.innerHTML = '';
        var grid = document.createElement('div');
        /* ۱.۳.۸۲: همان کاشی‌های رنگیِ آیکون‌دارِ پنجرهٔ دستهٔ ویرایش ردیف */
        grid.className = 'sp-pick-grid sms-cat-grid hk-cat-colored hk-sp-tiles';
        var p2pOn = isP2PDesc(desc);
        var paint = function () {
          grid.querySelectorAll('[data-id]').forEach(function (b) {
            var id = b.getAttribute('data-id');
            b.classList.toggle('on', id === 'p2p' ? p2pOn : (!p2pOn && (id ? sel.indexOf(id) >= 0 : !sel.length)));
          });
        };
        /* ۱.۳.۸۳: «جیب به جیب» مال خود ردیف‌هاست (نه دیکشنری شرح): همهٔ ردیف‌های همین شرح در این ماه */
        var setP2P = function (v) {
          if (v === p2pOn) return;
          p2pOn = v;
          rowsOfDesc(desc).forEach(function (r) { if (v) { r.p2p = true; delete r.p2pNo; } else if (r.p2p) { delete r.p2p; r.p2pNo = true; } });
          ov._spDirty = true;
          try { persistCurrent(); scheduleSave(); } catch (e) {}
          if (v) { try { hkP2PIntro(false); } catch (e2) {} }
        };
        /* ۱.۳.۸۳: حذف دسته: با نگه‌داشتن انگشت، کاشی‌ها می‌لرزند و × قرمز می‌آید؛ زدن جای خالی/برگشت/تأیید = پایان */
        var jiggle = false, lpT = 0, lpFired = false;
        var jiggleOn = function () { if (jiggle) return; jiggle = true; grid.classList.add('hk-jiggle'); try { appHaptic(15); } catch (e) {} };
        ov._spJiggleOff = function () { if (!jiggle) return false; jiggle = false; grid.classList.remove('hk-jiggle'); return true; };
        grid.addEventListener('click', function (e) { if (e.target === grid && jiggle) ov._spJiggleOff(); });
        var addBtn = function (cat) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sms-cat sp-pick-t';
          b.setAttribute('data-id', cat.id);
          b.style.setProperty('--cc', cat.id ? hkCatColor(cat.id) : '#8e8e93');
          b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (cat.id ? (HK_CAT_ICONS[cat.id] || HK_CAT_TAG) : '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1M12 16v.1"/>') + '</svg></i><span></span>';
          b.querySelector('span').textContent = cat.label;
          if (cat.id === 'p2p') hkP2PDecorate(b);
          /* ۱.۳.۸۳: × فقط در حالت لرزش (نگه‌داشتن انگشت) دیده می‌شود */
          if (cat.id && cat.id !== 'p2p') {
            var x = document.createElement('span');
            x.className = 'sp-pick-x hk-del-x'; x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'حذف دسته'); x.textContent = HK_DEL_X;
            x.onclick = function (ev) {
              ev.stopPropagation(); ev.preventDefault();
              askConfirm('دستهٔ «' + cat.label + '» حذف شود؟ شرح‌هایی که در این دسته بودند «نامشخص» می‌شوند.', function () {
                HKCategorizer.removeCat(cat.id);
                var k2 = sel.indexOf(cat.id); if (k2 >= 0) sel.splice(k2, 1);
                b.remove(); paint();
              });
            };
            b.appendChild(x);
            b.addEventListener('pointerdown', function () { lpFired = false; clearTimeout(lpT); lpT = setTimeout(function () { lpFired = true; jiggleOn(); }, 520); });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(lpT); }); });
            b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
          }
          b.onclick = function () {
            if (lpFired) { lpFired = false; return; }
            if (jiggle) { ov._spJiggleOff(); return; }
            if (cat.id === 'p2p') { setP2P(!p2pOn); paint(); return; }
            if (p2pOn) setP2P(false);
            if (!cat.id) sel = [];
            else { var k = sel.indexOf(cat.id); if (k >= 0) sel.splice(k, 1); else sel.push(cat.id); }
            HKCategorizer.learn(desc, sel);
            paint();
          };
          return b;
        };
        HKCategorizer.categories.concat([HK_P2P_CAT, { id: '', label: 'نامشخص' }]).forEach(function (cat) { grid.appendChild(addBtn(cat)); });
        /* باکس آخر: «+» برای ساختن دستهٔ دلخواه */
        var plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'sms-cat sp-pick-t sp-pick-tadd';
        plus.setAttribute('aria-label', 'دستهٔ جدید');
        plus.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i><span>دستهٔ جدید</span>';
        plus.onclick = function () {
          if (ov._spJiggleOff && ov._spJiggleOff()) return;
          var wrap = document.createElement('div');
          wrap.className = 'sp-pick-new';
          var inp = document.createElement('input');
          inp.type = 'text';
          inp.className = 'sp-pick-input';
          inp.placeholder = 'نام دستهٔ جدید';
          inp.maxLength = 24;
          var ok = document.createElement('button');
          ok.type = 'button';
          ok.className = 'sp-pick on';
          ok.textContent = 'افزودن';
          var save = function () {
            var cat = HKCategorizer.addCustom(inp.value);
            if (!cat) { try { inp.focus(); } catch (e) {} return; }
            if (sel.indexOf(cat.id) < 0) sel.push(cat.id);
            HKCategorizer.learn(desc, sel);
            wrap.remove();
            grid.insertBefore(addBtn(cat), plus);
            /* دکمهٔ جدید قبل از «نامشخص» و «+» قرار بگیرد */
            var unk = grid.querySelector('[data-id="p2p"]') || grid.querySelector('[data-id=""]');
            var nb = grid.querySelector('[data-id="' + cat.id + '"]');
            if (unk && nb) grid.insertBefore(nb, unk);
            plus.style.display = '';
            paint();
          };
          ok.onclick = save;
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          wrap.appendChild(inp);
          wrap.appendChild(ok);
          plus.style.display = 'none';
          grid.parentNode.appendChild(wrap);
          setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
        };
        grid.appendChild(plus);
        body.appendChild(grid);
        paint();
        body.scrollTop = 0;
      }
      ov._spShowList = showList;
      btn.onclick = function () { categorySheetBack(); };
      ov.addEventListener('click', function (ev) {
        if (ev.target !== ov) return;
        if (Date.now() - openedAt < 450) return; /* کلیکِ همان لمسِ بازکننده */
        closeCategoryReviewSheet();
      });
      box.appendChild(h); box.appendChild(sub); box.appendChild(body); box.appendChild(btn);
      ov.appendChild(box);
      document.body.appendChild(ov);
      showList();
    }

    /* ===== نشان عددی قرمز روی کاشی «اقساط» صفحه اصلی =====
       اقساط معوق یا با سررسید امروز/فردا؛ پس از ورود به منوی اقساط، خوانده‌شده و برداشته می‌شود */
    var INSTALL_SEEN_KEY = STORAGE_KEY + '_instAlertSeen';
    function installAlertKeys() {
      var keys = [];
      try {
        var today = getTodayPersian();
        var ti = dateToIndex(today.y, today.m, today.d);
        (plans || []).forEach(function (plan) {
          if (!plan) return;
          var count = Math.max(0, parseInt(plan.count, 10) || 0);
          var paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
          for (var i = paid; i < count; i++) {
            if (plan.paidEarlyMap && plan.paidEarlyMap[String(i)]) continue;
            var due = dueDateForInstallment(plan, i);
            if (dateToIndex(due.y, due.m, due.d) - ti > 1) break;
            keys.push(String(plan.id || plan.name || 'p') + ':' + i);
          }
        });
      } catch (e) {}
      return keys;
    }
    function loadInstallSeen() {
      try { var a = JSON.parse(localStorage.getItem(INSTALL_SEEN_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function markInstallAlertsSeen() {
      var keys = installAlertKeys();
      try { localStorage.setItem(INSTALL_SEEN_KEY, JSON.stringify(keys)); } catch (e) {}
      updateInstallTileBadge();
    }
    function updateInstallTileBadge() {
      /* باکس چنداسلایدی کپیِ کاشی‌ها را هم دارد؛ نشان روی همه به‌روز شود */
      var tiles = document.querySelectorAll('#homeBox1 .home-tile[onclick*="install"]');
      if (tiles.length > 1) { Array.prototype.forEach.call(tiles, function (t) { updateInstallTileBadgeOn(t); }); return; }
      updateInstallTileBadgeOn(tiles[0]);
    }
    function updateInstallTileBadgeOn(tile) {
      if (!tile) return;
      var seen = {};
      loadInstallSeen().forEach(function (k) { seen[k] = 1; });
      /* تعداد وام‌هایی که قسط معوق/نزدیک دارند (نه تعداد قسط‌ها) */
      var plansWith = {};
      installAlertKeys().forEach(function (k) { if (!seen[k]) plansWith[k.slice(0, k.lastIndexOf(':'))] = 1; });
      var n = Object.keys(plansWith).length;
      var b = tile.querySelector('.home-tile-badge');
      if (!n) { if (b) b.remove(); tile.removeAttribute('data-alerts'); return; }
      if (!b) { b = document.createElement('span'); b.className = 'home-tile-badge'; b.setAttribute('aria-hidden', 'true'); tile.appendChild(b); }
      b.textContent = n > 99 ? '+۹۹' : toPersianDigits(String(n));
      tile.setAttribute('data-alerts', String(n));
    }
    /* نشان عددی یادآور (مثل اقساط): یادآورهای نزدیکِ دیده‌نشده؛ با باز کردن یادآورها پاک می‌شود */
    var REMIND_SEEN_KEY = STORAGE_KEY + '_remindSeen';
    function remindAlertKeys() {
      try { return getUserRemindDueSoon().map(function (x) { return String(x.r.id || x.r.title || 'r') + ':' + (x.due ? x.due.y + '-' + x.due.m + '-' + x.due.d : x.days); }); } catch (e) { return []; }
    }
    function markRemindAlertsSeen() {
      try { localStorage.setItem(REMIND_SEEN_KEY, JSON.stringify(remindAlertKeys())); } catch (e) {}
      updateRemindTileBadge();
    }
    function updateRemindTileBadge() {
      var seen = {};
      try { (JSON.parse(localStorage.getItem(REMIND_SEEN_KEY) || '[]') || []).forEach(function (k) { seen[k] = 1; }); } catch (e) {}
      var n = remindAlertKeys().filter(function (k) { return !seen[k]; }).length;
      document.querySelectorAll('#homeBox1 .hb-remind-tile').forEach(function (tile) {
        var b = tile.querySelector('.home-tile-badge');
        if (!n) { if (b) b.remove(); return; }
        if (!b) { b = document.createElement('span'); b.className = 'home-tile-badge'; b.setAttribute('aria-hidden', 'true'); tile.appendChild(b); }
        b.textContent = n > 99 ? '+۹۹' : toPersianDigits(String(n));
      });
    }
    (function () {
      function go() { try { updateInstallTileBadge(); } catch (e) {} try { updateRemindTileBadge(); } catch (e2) {} }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 800); });
      else setTimeout(go, 800);
      setInterval(go, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) go(); });
    })();


    /* ===== کشیدن افقی باکس‌های منو (۱.۳.۴۴: رفت و برگشتی؛ آخرین اسلاید بن‌بست است و باید برعکس کشید؛ اسلاید بعدی از چپ می‌آید) ===== */
    (function () {
      function setup(box) {
        if (!box || box._hb) return;
        var track = box.querySelector('.hb-track');
        var slides = track ? Array.prototype.slice.call(track.children) : [];
        if (slides.length < 2) return;
        box._hb = true;
        var n = slides.length;
        /* ترتیب چپ‌به‌راست: اسلایدها برعکس (اسلاید اول سمت راست) */
        slides.slice().reverse().forEach(function (sl) { track.appendChild(sl); });
        var idxOf = function (k) { return n - 1 - k; };
        var k = 0, pos = idxOf(0), W = 0, drag = null, blockUntil = 0;
        function place(px, anim) {
          W = box.clientWidth || W;
          track.style.transition = anim ? 'transform 0.62s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none';
          track.style.transform = 'translateX(' + (-pos * W + (px || 0)) + 'px)';
        }
        function go(dir) {   /* dir=+1 اسلاید بعدی (از چپ)، -1 قبلی؛ بیرون از دو سر → برمی‌گردد سر جایش */
          var nk = k + dir;
          if (nk < 0 || nk >= n) { place(0, true); return; }
          k = nk; pos = idxOf(k);
          place(0, true);
        }
        box._hbGo = function (i) { k = Math.max(0, Math.min(n - 1, i | 0)); pos = idxOf(k); place(0, false); };
        box._hbIdx = function () { return k; };
        box.addEventListener('pointerdown', function (e) {
          if (e.button != null && e.button !== 0) return;
          drag = { x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId };
        });
        box.addEventListener('pointermove', function (e) {
          if (!drag || e.pointerId !== drag.id) return;
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.on) {
            if (Math.abs(dx) < 8) return;
            if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
            drag.on = true;
            try { box.setPointerCapture(e.pointerId); } catch (e2) {}
          }
          drag.dx = dx;
          /* سرِ بن‌بست: کمی کش می‌آید ولی جلو نمی‌رود */
          var edge = (k === n - 1 && dx > 0) || (k === 0 && dx < 0);
          place(edge ? dx * 0.25 : dx, false);
        });
        function end(e) {
          if (!drag) return;
          var d = drag; drag = null;
          if (!d.on) return;
          blockUntil = Date.now() + 300;
          if (Math.abs(d.dx) > Math.min(60, (box.clientWidth || 300) * 0.18)) go(d.dx > 0 ? 1 : -1);
          else place(0, true);
        }
        box.addEventListener('pointerup', end);
        box.addEventListener('pointercancel', end);
        box.addEventListener('click', function (e) { if (Date.now() < blockUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
        window.addEventListener('resize', function () { place(0, false); });
        place(0, false);
      }
      function init() { ['homeBox1', 'homeBox2', 'homeBox3'].forEach(function (id) { setup(document.getElementById(id)); }); }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
      setTimeout(init, 600);
    })();
    /* ۱.۳.۴۴: «+» دیگر کارت تازه نمی‌سازد (فقط یک کارت کاربر) */
    function addPersonCard() {
      try { showToast('کار تازهٔ این دکمه به‌زودی اضافه می‌شود'); } catch (e) {}
    }
    /* ۱.۳.۶۴: دایرهٔ «+» پایین صفحه: باکس کوچک با «ثبت درآمد» (سبز) و «ثبت خرج» (قرمز)؛ هر کدام باکس ثبت ردیف را برای ماه باز باز می‌کند */
    function hkHomeAddMenu(btn) {
      var old = document.getElementById('hkAddPop'); if (old) { old.remove(); return; }
      var ov = document.createElement('div'); ov.id = 'hkAddPop'; ov.className = 'hk-add-ov'; ov.setAttribute('data-hk-back', '1');
      var box = document.createElement('div'); box.className = 'hk-add-pop';
      /* ۱.۳.۷۱: بالای دکمه‌ها اسم پروژه‌ها (پرکاربردتر اول) با رنگشان؛ یکی را بزنی، ردیف تازه از قبل مال همان پروژه است */
      var pick = '', pjs = hkAddProjects();
      if (pjs.length) {
        var pw = document.createElement('div'); pw.className = 'hk-add-pj';
        pw.innerHTML = '<div class="hk-add-pjl">برای پروژه؟</div>';
        var chips = document.createElement('div'); chips.className = 'hk-add-chips';
        pjs.forEach(function (sb) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'hk-add-chip'; c.dataset.id = sb.id;
          c.style.setProperty('--pj-c', sb.accent);
          c.innerHTML = '<i></i><span>' + escapeHtml(sb.name) + '</span>';
          c.onclick = function (e) {
            e.stopPropagation(); pick = pick === sb.id ? '' : sb.id;
            chips.querySelectorAll('.hk-add-chip').forEach(function (x) { x.classList.toggle('on', x.dataset.id === pick); x.setAttribute('aria-pressed', x.dataset.id === pick ? 'true' : 'false'); });
            try { window.appHaptic(10); } catch (eH) {}
          };
          chips.appendChild(c);
        });
        pw.appendChild(chips); box.appendChild(pw);
      }
      var mk = function (cls, txt, tab) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-add-it ' + cls; b.textContent = txt;
        b.onclick = function (e) { e.stopPropagation(); ov.remove(); hkHomeAddRow(tab, pick); };
        return b;
      };
      box.appendChild(mk('inc', 'ثبت درآمد', 'income'));
      box.appendChild(mk('exp', 'ثبت خرج', 'expense'));
      ov.appendChild(box);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
      try {
        var r = btn.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
        /* ۱.۳.۶۸: درست بالای «+» (هم‌محور با آن)، روی باکس بالایی؛ به دایرهٔ موجودی نمی‌رسد */
        var bc = document.getElementById('homeBalanceCircle'), br = bc ? bc.getBoundingClientRect() : null;
        /* پهنای باکس طوری که به دایرهٔ موجودی نرسد (اسم پروژه‌ها در چند خط می‌شکنند) */
        /* ۱.۳.۷۲: باکس چسبیده به خود «+» باز می‌شود: گوشهٔ پایین‌چپش روی گوشهٔ راستِ بالای دایرهٔ «+» */
        bw = box.offsetWidth; bh = box.offsetHeight;
        box.classList.add('hk-add-anch');
        var left = Math.max(8, Math.min(innerWidth - bw - 8, r.right - 8));
        box.style.left = Math.round(left) + 'px';
        box.style.top = Math.round(Math.max(8, r.top + 8 - bh)) + 'px';
      } catch (eP) {}
    }
    var HK_PJ_RECENT = STORAGE_KEY + '_pjRecent';
    function hkAddProjects() {
      var list = [];
      try { list = (loadFinancialSubjects() || []).filter(function (s) { return s && s.id && s.id !== 'personal' && !s.archived; }); } catch (e) {}
      var rec = []; try { rec = JSON.parse(localStorage.getItem(HK_PJ_RECENT) || '[]') || []; } catch (e2) {}
      return list.map(function (s, i) {
        var meta = null; try { meta = getProjectHighlightMeta(s.highlightColor); } catch (e3) {}
        var k = rec.indexOf(s.id);
        return { id: s.id, name: s.name || 'پروژه', accent: (meta && meta.accent) || '#d000ff', o: k >= 0 ? k : 1000 + i };
      }).sort(function (a, b) { return a.o - b.o; });
    }
    function hkHomeAddRow(tab, projId) {
      try {
        var title = hkMainTitle();
        var sec = findSectionByTitle(tab, title);
        if (!sec) { showToast('بخش اصلی پیدا نشد'); return; }
        if (!Array.isArray(sec.rows)) sec.rows = [];
        var t = getTodayPersian();
        var row = Object.assign(emptyRow(tab), { status: 'paid', day: (currentYear === t.y && currentMonth === t.m) ? String(t.d) : '' });
        if (projId) {
          var sb = (loadFinancialSubjects() || []).filter(function (s) { return s && s.id === projId; })[0];
          if (sb) {
            var fc = defaultFinancialContext();
            fc.classification = 'third_party'; fc.accountType = 'project'; fc.subjectId = sb.id; fc.subjectName = sb.name || '';
            fc.ownerName = fc.subjectName; fc.fundingSource = 'subject'; fc.projectAmount = 0; fc.personalAdvanceAmount = 0;
            row.financialContext = fc;
            try { var rc = JSON.parse(localStorage.getItem(HK_PJ_RECENT) || '[]') || []; rc = [sb.id].concat(rc.filter(function (x) { return x !== sb.id; })).slice(0, 20); localStorage.setItem(HK_PJ_RECENT, JSON.stringify(rc)); } catch (eR) {}
          }
        }
        /* قبل از ردیف‌های خالیِ انتهای جدول */
        var at = sec.rows.length;
        var blank = function (r) { return !r || (!(Number(r.amount) > 0) && !String(r.desc || '').trim() && !String(r.day || '').trim()); };
        while (at > 0 && blank(sec.rows[at - 1])) at--;
        sec.rows.splice(at, 0, row);
        var drop = function () { var i = sec.rows.indexOf(row); if (i >= 0) sec.rows.splice(i, 1); };
        hkOpenRowEdit({ row: row, tab: tab, title: title, sec: sec, isNew: true, onCancel: drop,
          onSaved: function () { try { persistCurrent(); } catch (e0) {} try { renderAll(); } catch (e1) {} } });
      } catch (e) { try { showToast(String(e && e.message || e)); } catch (e2) {} }
    }
    /* ۱.۳.۴۴: لانگ‌پرس روی کارت → کارت می‌لرزد (مثل حذف آیکن در آیفون) و «حذف ماه» و «حذف کلی» روی آن می‌آیند؛
       هر کدام با تأیید و رفتن به سطل زباله (قابل برگشت) */
    function closeCardJiggle() {
      try {
        document.querySelectorAll('.person-card.hk-jiggle').forEach(function (c) { c.classList.remove('hk-jiggle'); });
        document.querySelectorAll('.hk-jig-menu').forEach(function (m) { m.remove(); });
        if (window._hkJigOut) { document.removeEventListener('pointerdown', window._hkJigOut, true); window._hkJigOut = null; }
      } catch (e) {}
    }
    function openCardJiggle(card, title) {
      closeCardJiggle();
      if (!card) return;
      var titles = []; try { titles = allPersonTitles(); } catch (e0) {}
      var isMain = titles.indexOf(title) <= 0;
      card.classList.add('hk-jiggle');
      var m = document.createElement('div');
      m.className = 'hk-jig-menu';
      m.setAttribute('data-hk-back', '1');
      m._hkCancel = closeCardJiggle;
      var mk = function (label, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'hk-jig-btn' + (label === 'تغییر نام' ? ' hk-jig-ren' : ''); b.textContent = label;
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        b.onclick = function (e) { e.stopPropagation(); closeCardJiggle(); try { fn(); } catch (eF) {} };
        m.appendChild(b);
      };
      /* ۱.۳.۵۱: تغییر نام فقط از منوی همبرگری (پنل نام کاربر) */
      mk('حذف ماه', function () { askResetCurrentMonth(); });
      mk('حذف کلی', function () { askResetAllData(); });
      if (!isMain) mk('حذف این کارت', function () { askDeletePerson(title); });
      m.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === m) closeCardJiggle(); });
      card.appendChild(m);
      setTimeout(function () {
        /* ۱.۳.۴۶: در حالت لرزش، زدن هر جای صفحه فقط لرزش را لغو می‌کند (همان ضربه کار دیگری نمی‌کند) */
        window._hkJigOut = function (e) {
          if (m.contains(e.target) && e.target !== m) return;
          e.preventDefault(); e.stopPropagation();
          closeCardJiggle();
          var swallow = function (ev) { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener('click', swallow, true); };
          document.addEventListener('click', swallow, true);
          setTimeout(function () { document.removeEventListener('click', swallow, true); }, 600);
        };
        document.addEventListener('pointerdown', window._hkJigOut, true);
      }, 50);
    }

    function attachKeyboardLift(box) {
      if (!box || !window.visualViewport) return function(){};
      const vv = window.visualViewport;
      const apply = () => {
        try {
          const occluded = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
          const lift = Math.min(occluded * 0.55, occluded > 0 ? occluded - 20 : 0);
          box.style.transition = 'transform 0.22s ease-out';
          box.style.transform = lift > 0 ? ('translateY(' + (-lift) + 'px)') : 'translateY(0)';
        } catch (e) {}
      };
      vv.addEventListener('resize', apply);
      vv.addEventListener('scroll', apply);
      apply();
      return function() {
        try { vv.removeEventListener('resize', apply); vv.removeEventListener('scroll', apply); } catch (e) {}
        try { box.style.transform = ''; } catch (e) {}
      };
    }
    function closePersonEditSheet() {
      try {
        document.querySelectorAll('.modal-overlay.person-edit-sheet').forEach(function(ov) {
          try { ov.remove(); } catch (e0) {}
        });
      } catch (e1) {}
      try {
        document.body.classList.remove('modal-scroll-lock');
        const sy = parseInt(document.body.dataset.editScrollY || '0', 10) || 0;
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        delete document.body.dataset.editScrollY;
        window.scrollTo(0, sy);
      } catch (e2) {}
      try {
        var ae = document.activeElement;
        if (ae && ae.blur) ae.blur();
      } catch (e3) {}
    }
    function openPersonEditSheet(title, isNew) {
      try { closePersonEditSheet(); } catch (eC) {}
      const _sy = window.scrollY || window.pageYOffset || 0;
      try { document.body.dataset.editScrollY = String(_sy); } catch (e) {}
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open person-edit-sheet';
      overlay.setAttribute('data-person-edit', isNew ? 'new' : 'edit');
      /* بالا ثابت — بدون center عمودی تا با کیبورد پرش نکند */
      overlay.style.cssText = 'z-index:600;position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;min-height:100vh;min-height:100dvh;display:flex;align-items:flex-start;justify-content:center;padding-top:min(18vh,120px);overflow:hidden;overscroll-behavior:none;background:rgba(0,0,0,0.55);';
      const box = document.createElement('div');
      box.className = 'modal-box';
      box.style.cssText = 'max-width:360px;width:min(360px,92vw);text-align:right;padding:16px;position:relative;transform:translateZ(0);margin:0;will-change:auto;';
      const lab = document.createElement('div');
      lab.style.cssText = 'font-weight:800;margin-bottom:8px;';
      lab.textContent = isNew ? 'کاربر جدید' : 'ویرایش کاربر';
      const inp = document.createElement('input');
      inp.className = 'family-input';
      inp.placeholder = 'نام کاربر را وارد کنید';
      inp.value = title || '';
      inp.style.cssText = 'width:100%;margin-bottom:10px;box-sizing:border-box;text-align:center;font-weight:bold;';
      const actions = document.createElement('div');

      actions.style.cssText = 'display:flex;gap:8px;margin-top:12px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'modal-btn yes';
      ok.textContent = 'تأیید';
      ok.style.flex = '1';
      ok.onclick = () => {
        const name = (inp.value || '').trim();
        if (!name) { showToast('نام کاربر را وارد کنید'); return; }
        if (isNew || name !== title) {
          const exists = allPersonTitles().some(t => t === name && t !== title);
          if (exists) { showToast('اسم تکراری است'); return; }
        }
        var _prevActiveTitle = '';
        try { _prevActiveTitle = getActiveHomeCardTitle() || (allPersonTitles()[0] || ''); } catch (ePa) {}
        if (isNew) {
          ensurePersonSections(name);
          /* کارت جدید سمت چپِ کارت قبلی (انتهای ردیف) */
          /* اول روی کارت قبلی بماند تا اسکرول به کارت جدید دیده شود */
          try { if (_prevActiveTitle) setActiveHomeCardTitle(_prevActiveTitle); } catch (e) {}
        } else {
          const inc = findSectionByTitle('income', title);
          const exp = findSectionByTitle('expense', title);
          if (inc) inc.title = name;
          if (exp) exp.title = name;
          /* ۱.۳.۴۶: کارت اصلی تازه‌نام؛ ماه‌های دیگر و درآمد ثابت هم همین نام را می‌گیرند */
          try { localStorage.setItem(STORAGE_KEY + '_mainCard', name); setTimeout(hkSingleCardNormalizeAll, 0); } catch (eMc) {}
          const m = getCardMetaMap();
          if (m[title] && name !== title) {
            m[name] = Object.assign({}, m[title]);
            delete m[title];
            periodData.cardMeta = m;
          }
          try { setActiveHomeCardTitle(name); } catch (e) {}
        }
        persistCurrent();
        scheduleSave();
        try { closePersonEditSheet(); } catch (e) {}
        if (isNew) {
          /* همهٔ رسم‌ها و ذخیرهٔ معوق همین حالا انجام شود تا وسط حرکت به کارت تازه، صفحه دوباره رسم نشود (علت «نیمه‌راه ایستادن و پریدن») */
          try { clearTimeout(_uiFlushTimer); _flushUiHeavy(); } catch (eFl) { renderHomeCards(); }
          try { _flushPendingSave(); } catch (eFs) {}
        } else renderHomeCards();
        try {
          if (isNew) {
            /* از روی کارتی که کاربر رویش بود، با یک حرکت نرم (آرام شروع، آرام توقف) روی کارت جدید برو */
            var boxHC = document.getElementById('homeCards');
            var q = function (t) { return boxHC && boxHC.querySelector('.person-card:not(.hc-clone)[data-title="' + (window.CSS && CSS.escape ? CSS.escape(t) : t) + '"]'); };
            var cards0 = boxHC ? Array.prototype.slice.call(boxHC.querySelectorAll('.person-card:not(.hc-clone)')) : [];
            var from0 = (_prevActiveTitle && q(_prevActiveTitle)) || cards0[cards0.length - 2];
            if (from0) homeCenterCard(boxHC, from0, false);
            try { updateHomeCardScales(boxHC); } catch (eSc) {}
            /* کارت جدید از همین حالا «کارت فعال» است تا هیچ رسم دوباره‌ای آن را به کارت قبلی برنگرداند */
            var finish = function () {
              try {
                var cc = q(name);
                if (cc) { homeCenterCard(boxHC, cc, false); updateHomeCardScales(boxHC); updateHomeCardDots(boxHC, cc); }
              } catch (eSn) {}
              window._hkCardFocus = null;
            };
            window._hkCardFocus = { name: name, until: Date.now() + 4000, done: finish };
            try { setActiveHomeCardTitle(name); } catch (eAc) {}
            /* شروع حرکت بعد از آرام شدن صفحه (بسته شدن کیبورد و چیدمان دوباره)؛ حداکثر ۶۰۰ میلی‌ثانیه صبر */
            var pnow = function () { return performance.now(); }, t0w = pnow(), lastRz = pnow();
            var onRz = function () { lastRz = pnow(); };
            window.addEventListener('resize', onRz);
            try { if (window.visualViewport) window.visualViewport.addEventListener('resize', onRz); } catch (eVv) {}
            var go = function () {
              if (pnow() - lastRz < 180 && pnow() - t0w < 600) { setTimeout(go, 60); return; }
              window.removeEventListener('resize', onRz);
              try { if (window.visualViewport) window.visualViewport.removeEventListener('resize', onRz); } catch (eVv2) {}
              requestAnimationFrame(function () { requestAnimationFrame(function () {
                try {
                  var to = q(name);
                  if (!to || !window._hkCardFocus || window._hkCardFocus.name !== name) return;
                  if (HomeCarousel.animating()) return; /* حرکت (ادامه‌یافته پس از رسم دوباره) در جریان است */
                  window._hkCardFocus.until = Date.now() + 2500;
                  var left = homeCardTarget(boxHC, to);
                  HomeCarousel.glideTo(boxHC, left, 620, finish);
                } catch (eAn) { finish(); }
              }); });
            };
            setTimeout(go, 120);
          } else {
            requestAnimationFrame(function(){ scrollHomeCardsToTitle(name, true); });
          }
        } catch (e) {}
        showToast(isNew ? 'کارت ایجاد شد' : 'ذخیره شد');
      };
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'modal-btn no';
      cancel.textContent = 'انصراف';
      cancel.style.flex = '1';
      cancel.onclick = () => { try { closePersonEditSheet(); } catch (e) {} };
      actions.appendChild(ok);
      actions.appendChild(cancel);
      box.appendChild(lab);
      box.appendChild(inp);
      box.appendChild(actions);
      overlay.appendChild(box);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) try { closePersonEditSheet(); } catch (err) {} });
      document.body.appendChild(overlay);
      try {
        document.body.classList.add('modal-scroll-lock');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } catch (eLock) {}
      try {
        var _pinPes = function() {
          try {
            var ov = document.querySelector('.modal-overlay.person-edit-sheet');
            if (!ov) return;
            var h = window.innerHeight || document.documentElement.clientHeight || 0;
            var vv = window.visualViewport;
            if (vv && vv.height) h = Math.max(h, Math.ceil(vv.height + (vv.offsetTop || 0)));
            ov.style.top = '0px';
            ov.style.left = '0px';
            ov.style.right = '0px';
            ov.style.width = '100%';
            ov.style.height = h + 'px';
            ov.style.minHeight = h + 'px';
            ov.style.background = 'rgba(0,0,0,0.55)';
          } catch (eP) {}
        };
        _pinPes();
        if (!window._pesPinBound) {
          window._pesPinBound = true;
          window.addEventListener('resize', _pinPes, { passive: true });
          if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', _pinPes, { passive: true });
            window.visualViewport.addEventListener('scroll', _pinPes, { passive: true });
          }
        }
        overlay._pinPes = _pinPes;
      } catch (ePin) {}
      // فوکوس با تأخیر تا باکس اول ثابت بماند و پرش نکند
      try {
        const defNames = ['نام کاربر', 'کاربر'];
        const shouldSelect = isNew || defNames.indexOf((title || '').trim()) >= 0 || defNames.indexOf((inp.value || '').trim()) >= 0;
        setTimeout(function() {
          try {
            inp.focus({ preventScroll: true });
            if (shouldSelect) {
              const len = (inp.value || '').length;
              if (len > 0) caretToEnd(inp);
            }
          } catch (eF) {
            try { inp.focus(); } catch (e2) {}
          }
        }, 300);
      } catch (e) {}
    }

    function askDeletePerson(title) {
      askConfirm('کاربر مورد نظر حذف شود؟', () => {
        const payload = {
          sourceLabel: 'کارت کاربر',
          title: title,
          income: findSectionByTitle('income', title),
          expense: findSectionByTitle('expense', title),
          cardMeta: (getCardMetaMap()[title] || null)
        };
        try {
          pushToTrash('person_card', title, JSON.parse(JSON.stringify(payload)));
        } catch (e) {
          try { pushToTrash('person_card', title, payload); } catch (e2) {}
        }
        ['income', 'expense'].forEach(tab => {
          const list = periodData[tab] && periodData[tab].sections;
          if (!list) return;
          const i = list.findIndex(s => (s.title || '').trim() === title);
          if (i >= 0) list.splice(i, 1);
        });
        const m = getCardMetaMap();
        delete m[title];
        periodData.cardMeta = m;
        persistCurrent();
        scheduleSave();
        renderHomeCards();
        showToast('به سطل زباله منتقل شد');
      });
    }


    /* ===== ۱.۳.۴۵: لانگ‌پرس روی ردیف درآمد/مخارج → ردیف مات و دو نیمه (× حذف | ✎ ویرایش)؛ باکس ویرایش کامل ردیف ===== */
    function hkCloseRowActions() {
      try { document.querySelectorAll('.hk-row-act').forEach(function (o) { o.remove(); }); } catch (e) {}
      try { if (window._hkRowActOut) { document.removeEventListener('pointerdown', window._hkRowActOut, true); window._hkRowActOut = null; } } catch (e2) {}
    }
    function hkOpenRowActions(tr, opts) {
      hkCloseRowActions();
      var r = tr.getBoundingClientRect();
      var ov = document.createElement('div');
      ov.className = 'hk-row-act';
      ov.setAttribute('data-hk-back', '1');
      ov.style.top = Math.round(r.top) + 'px'; ov.style.left = Math.round(r.left) + 'px';
      ov.style.width = Math.round(r.width) + 'px'; ov.style.height = Math.max(36, Math.round(r.height)) + 'px';
      var mk = function (cls, svg, label, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'hk-row-act-btn ' + cls; b.setAttribute('aria-label', label); b.innerHTML = svg;
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        b.onclick = function (e) { e.stopPropagation(); hkCloseRowActions(); try { fn(); } catch (eF) {} };
        return b;
      };
      /* RTL: نیمهٔ راست ویرایش، نیمهٔ چپ حذف */
      ov.appendChild(mk('hk-ra-edit', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>', 'ویرایش', opts.onEdit));
      /* ۱.۳.۵۶: گزینهٔ سبز «تسویه شد» بین ویرایش و حذف (قرض) */
      if (opts.onSettle) ov.appendChild(mk('hk-ra-settle' + (opts.settled ? ' is-undo' : ''), (opts.settled ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') + '<span>' + (opts.settled ? 'تسویه نشد' : 'تسویه شد') + '</span>', opts.settled ? 'تسویه نشد' : 'تسویه شد', opts.onSettle));
      /* ۱.۳.۶۲: ردیف اختلاف → «ردیف معمولی» (زرد) بین ویرایش و حذف */
      if (opts.onNormal) ov.appendChild(mk('hk-ra-normal', '<span>ردیف معمولی</span>', 'ردیف معمولی', opts.onNormal));
      ov.appendChild(mk('hk-ra-del' + (opts.canDelete ? '' : ' hk-ra-off'), '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>', 'حذف', opts.onDelete));
      ov._hkCancel = hkCloseRowActions;
      document.body.appendChild(ov);
      setTimeout(function () {
        window._hkRowActOut = function (e) { if (!ov.contains(e.target)) hkCloseRowActions(); };
        document.addEventListener('pointerdown', window._hkRowActOut, true);
      }, 30);
      try { var sc = tr.closest('.person-detail-scroll'); if (sc) sc.addEventListener('scroll', hkCloseRowActions, { once: true, passive: true }); } catch (eS) {}
    }
    /* ۱.۳.۴۷: بعد از لانگ‌پرس، رها کردن انگشت روی دکمه‌ای که تازه زیر انگشت باز شده (مثلاً «ویرایش») کاری نکند */
    function hkLpSwallowArm() {
      window._hkLpSwallow = true; window._hkLpTail = false;
      clearTimeout(window._hkLpT1); window._hkLpT1 = setTimeout(function () { window._hkLpSwallow = false; }, 2500);
      if (window._hkLpSwallowBound) return;
      window._hkLpSwallowBound = true;
      window.addEventListener('pointerup', function () {
        if (!window._hkLpSwallow) return;
        window._hkLpSwallow = false; window._hkLpTail = true;
        clearTimeout(window._hkLpT2); window._hkLpT2 = setTimeout(function () { window._hkLpTail = false; }, 380);
      }, true);
      window.addEventListener('click', function (e) { if (window._hkLpSwallow || window._hkLpTail) { window._hkLpSwallow = false; window._hkLpTail = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    }
    function hkBindRowLongPress(tr, onFire) {
      var t = null, x0 = 0, y0 = 0;
      var clear = function () { if (t) { clearTimeout(t); t = null; } };
      tr.addEventListener('pointerdown', function (e) {
        if (e.button != null && e.button !== 0) return;
        x0 = e.clientX; y0 = e.clientY; clear();
        t = setTimeout(function () {
          t = null;
          tr._hkLpAt = Date.now();
          try { if (document.activeElement && tr.contains(document.activeElement)) document.activeElement.blur(); } catch (eB) {}
          try { document.querySelectorAll('.pd-desc-popup, .cell-text-popup').forEach(function (p) { p.remove(); }); } catch (eP) {}
          try { window.appHaptic(25); } catch (eV) {}
          try { hkLpSwallowArm(); } catch (eSw) {}
          onFire();
        }, 480);
      });
      tr.addEventListener('pointermove', function (e) { if (t && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) clear(); });
      tr.addEventListener('pointerup', clear);
      tr.addEventListener('pointercancel', clear);
      tr.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      /* کلیکِ بعد از رها کردن لانگ‌پرس کار دیگری (مثلاً عوض شدن وضعیت مبلغ) نکند */
      tr.addEventListener('click', function (e) { if (tr._hkLpAt && Date.now() - tr._hkLpAt < 700) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    /* ستون چرخشی (به سبک نرم‌افزار): فهرست عمودی با گیرهٔ وسط؛ getIndex() جای انتخاب‌شده */
    function hkWheel(labels, idx, onChange) {
      var H = 36;
      var w = document.createElement('div'); w.className = 'hk-wheel';
      var sc = document.createElement('div'); sc.className = 'hk-wheel-sc';
      sc.appendChild(Object.assign(document.createElement('div'), { className: 'hk-wheel-pad' }));
      labels.forEach(function (l, i) {
        var it = document.createElement('div'); it.className = 'hk-wheel-it'; it.textContent = l;
        it.onclick = function () { sc.scrollTo({ top: i * H, behavior: 'smooth' }); };
        sc.appendChild(it);
      });
      sc.appendChild(Object.assign(document.createElement('div'), { className: 'hk-wheel-pad' }));
      w.appendChild(sc);
      var cur = Math.max(0, Math.min(labels.length - 1, idx | 0));
      var mark = function () {
        var its = sc.querySelectorAll('.hk-wheel-it');
        its.forEach(function (el, i) { el.classList.toggle('on', i === cur); });
      };
      var raf = 0;
      sc.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var i = Math.max(0, Math.min(labels.length - 1, Math.round(sc.scrollTop / H)));
          if (i !== cur) { cur = i; mark(); if (onChange) onChange(i); }
        });
      }, { passive: true });
      w.getIndex = function () { return cur; };
      w.setIndex = function (i) { cur = Math.max(0, Math.min(labels.length - 1, i | 0)); sc.scrollTop = cur * H; mark(); };
      w._init = function () { sc.scrollTop = cur * H; mark(); };
      mark();
      return w;
    }
    /* انتقال ردیف به ماه دیگر (همان بخش/عنوان) */
    function hkMoveRowToMonth(row, tab, title, fromSec, y, m) {
      var k = recMonthKey(y, m);
      var pd = recMonthData(k, true);
      if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
      if (!Array.isArray(pd[tab].sections)) pd[tab].sections = [];
      var t = (title || '').trim();
      var sec = pd[tab].sections.find(function (s) { return s && (s.title || '').trim() === t; });
      if (!sec) { sec = { id: 's' + Date.now().toString(36), title: t, color: fromSec && fromSec.color, collapsed: false, rows: [] }; pd[tab].sections.push(sec); }
      if (!Array.isArray(sec.rows)) sec.rows = [];
      var i = fromSec.rows.indexOf(row);
      if (i >= 0) fromSec.rows.splice(i, 1);
      if (!fromSec.rows.length) fromSec.rows.push(emptyRow(tab));
      var ei = sec.rows.findIndex(function (r) { return r && !r.desc && !r.amount && !r.day && !r.fromPlanId && !r.fromRecurringId; });
      if (ei >= 0) sec.rows.splice(ei, 1);
      sec.rows.push(row);
      recPersist();
    }
    /* ۱.۳.۵۶: تبدیل تاریخ شمسی به میلادی (الگوریتم ۳۳ساله؛ برای ۱۳۰۰ تا ۱۵۰۰ دقیق) → [سال، ماه، روز] */
    function hkJ2G(jy, jm, jd) {
      jy = +jy; jm = +jm; jd = +jd;
      var gy, gm, gd, days;
      jy += 1595;
      days = -355668 + (365 * jy) + (~~(jy / 33) * 8) + ~~(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
      gy = 400 * ~~(days / 146097); days %= 146097;
      if (days > 36524) { gy += 100 * ~~(--days / 36524); days %= 36524; if (days >= 365) days++; }
      gy += 4 * ~~(days / 1461); days %= 1461;
      if (days > 365) { gy += ~~((days - 1) / 365); days = (days - 1) % 365; }
      gd = days + 1;
      var ml = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      for (gm = 0; gm < 13 && gd > ml[gm]; gm++) gd -= ml[gm];
      return [gy, gm, gd];
    }
    var HK_GM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function hkGregStr(y, m, d) { if (!y || !m || !d) return ''; var g = hkJ2G(y, m, d); return g[2] + ' ' + HK_GM[g[1] - 1] + ' ' + g[0]; }
    /* ===== ۱.۳.۷۶: پیشنهاد شرح — از اولین حرف، شرح‌های قبلی همان نوع (درآمد/خرج) به ترتیب بیشترین استفاده.
       ردیف‌های همهٔ ماه‌ها شمرده می‌شوند؛ زدن پیشنهاد = همان متن در فیلد ===== */
    var _hkDescFreq = { at: 0, map: null };
    function hkDescNorm(t) { return String(t || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim(); }
    function hkDescFreq() {
      if (_hkDescFreq.map && Date.now() - _hkDescFreq.at < 15000) return _hkDescFreq.map;
      var m = { income: {}, expense: {} };
      var walk = function (pd) {
        ['income', 'expense'].forEach(function (tab) {
          ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt) return; var d = hkDescNorm(r.desc); if (d.length < 2 || d.length > 60) return;
              var o = m[tab][d] || (m[tab][d] = { t: String(r.desc).trim(), n: 0 }); o.n++;
            });
          });
        });
      };
      try { Object.keys(archive || {}).forEach(function (k) { walk(archive[k]); }); } catch (e) {}
      try { walk(periodData); } catch (e2) {}
      _hkDescFreq = { at: Date.now(), map: m };
      return m;
    }
    function hkDescSuggestList(tab, q, cur) {
      var nq = hkDescNorm(q); if (!nq) return [];
      var all = hkDescFreq()[tab === 'income' ? 'income' : 'expense'] || {}, out = [];
      Object.keys(all).forEach(function (k) {
        if (k === nq) return;
        var i = k.indexOf(nq); if (i < 0) return;
        out.push({ t: all[k].t, n: all[k].n, s: i === 0 ? 0 : (k.indexOf(' ' + nq) >= 0 ? 1 : 2) });
      });
      out.sort(function (a, b) { return (a.s - b.s) || (b.n - a.n) || a.t.length - b.t.length; });
      return out.slice(0, 5).map(function (x) { return x.t; });
    }
    function hkDescSuggestClose() { var p = document.getElementById('hkDescSug'); if (p) p.remove(); }
    function hkAttachDescSuggest(inp, tab, onPick) {
      if (!inp || inp._hkSug) return; inp._hkSug = true;
      var show = function () {
        if (inp.readOnly) { hkDescSuggestClose(); return; }
        var L = hkDescSuggestList(typeof tab === 'function' ? tab() : tab, inp.value);
        var pop = document.getElementById('hkDescSug');
        if (!L.length) { if (pop) pop.remove(); return; }
        if (!pop) { pop = document.createElement('div'); pop.id = 'hkDescSug'; pop.className = 'hk-desc-sug'; document.body.appendChild(pop);
          pop.addEventListener('pointerdown', function (e) { e.preventDefault(); }); pop.addEventListener('mousedown', function (e) { e.preventDefault(); }); }
        pop._for = inp;
        pop.innerHTML = '';
        L.forEach(function (t) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-desc-sug-it'; b.textContent = t;
          b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); inp.value = t; try { inp.dispatchEvent(new Event('input', { bubbles: true })); } catch (eI) {} hkDescSuggestClose(); if (onPick) onPick(t); try { inp.focus(); } catch (eF) {} };
          pop.appendChild(b);
        });
        var r = inp.getBoundingClientRect(), vh = window.visualViewport ? window.visualViewport.height : innerHeight;
        pop.style.left = Math.max(8, r.left) + 'px'; pop.style.width = Math.max(180, Math.min(innerWidth - 16, r.width)) + 'px';
        pop.style.right = 'auto';
        var ph = pop.offsetHeight || 40;
        if (r.bottom + ph + 6 <= vh) { pop.style.top = (r.bottom + 4) + 'px'; pop.style.bottom = 'auto'; }
        else { pop.style.top = Math.max(4, r.top - ph - 4) + 'px'; pop.style.bottom = 'auto'; }
        if (parseFloat(pop.style.left) + pop.offsetWidth > innerWidth - 8) pop.style.left = Math.max(8, innerWidth - 8 - pop.offsetWidth) + 'px';
      };
      inp.addEventListener('input', show);
      inp.addEventListener('blur', function () { setTimeout(function () { var p = document.getElementById('hkDescSug'); if (p && p._for === inp) p.remove(); }, 120); });
    }
    try { Object.assign(window, { hkDescSuggestList: hkDescSuggestList, hkAttachDescSuggest: hkAttachDescSuggest, hkDescFreq: hkDescFreq }); } catch (eWd) {}
    function hkOpenRowEdit(ctx) {
      var row = ctx.row, tab = ctx.tab, fromPlan = !!row.fromPlanId;
      var old = document.getElementById('hkRowEdit'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkRowEdit'; ov.className = 'hk-re-ov'; ov.setAttribute('data-hk-back', '1');
      var box = document.createElement('div'); box.className = 'hk-re-box';
      var isInc = tab === 'income';
      var paidL = isInc ? 'دریافت شده' : 'پرداخت شده', unpaidL = isInc ? 'دریافت نشده' : 'پرداخت نشده';
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var st = { status: (row.status || 'paid'), account: row.account || '', rec: row.fromRecurringId || '' };
      box.innerHTML = '<div class="hk-re-title">' + (ctx.isNew ? (isInc ? 'ثبت درآمد' : 'ثبت خرج') : 'ویرایش ردیف ' + (ctx.num ? toPersianDigits(String(ctx.num)) + ' ' : '') + (isInc ? 'درآمد' : 'مخارج')) + '</div>';
      var field = function (label) {
        var f = document.createElement('div'); f.className = 'hk-re-f';
        var l = document.createElement('div'); l.className = 'hk-re-l'; l.textContent = label;
        f.appendChild(l); box.appendChild(f); return f;
      };
      /* ۱.۳.۴۷: تاریخ و زمان مینیمال: دو دکمهٔ ساده کنار هم؛ زدن هر کدام چرخ‌هایش را زیرش باز/بسته می‌کند */
      var dtRow = document.createElement('div'); dtRow.className = 'hk-re-dtrow'; box.appendChild(dtRow);
      var mkPill = function (lab) { var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-re-pill'; b.innerHTML = '<span>' + lab + '</span><b dir="ltr"></b>'; dtRow.appendChild(b); return b; };
      var dVal = mkPill('تاریخ'), tVal = mkPill('زمان');
      /* ۱.۳.۵۶: تاریخ میلادی هم زیر تاریخ شمسی */
      var dGreg = document.createElement('small'); dGreg.className = 'hk-re-greg'; dGreg.dir = 'ltr'; dVal.appendChild(dGreg);
      /* ۱.۳.۶۶: زمان هم مثل تاریخ یک خط دوم با رقم لاتین دارد */
      var tGreg = document.createElement('small'); tGreg.className = 'hk-re-greg'; tGreg.dir = 'ltr'; tVal.appendChild(tGreg);
      var fD = document.createElement('div'); fD.className = 'hk-re-pnl'; box.appendChild(fD);
      var years = []; for (var yy = 1390; yy <= 1420; yy++) years.push(yy);
      var days = ['—']; for (var dd = 1; dd <= 31; dd++) days.push(toPersianDigits(String(dd)));
      var wrapD = document.createElement('div'); wrapD.className = 'hk-re-wheels';
      var wD = hkWheel(days, parseInt(row.day, 10) || 0, upd);
      var wM = hkWheel(MONTHS.slice(), currentMonth - 1, upd);
      var wY = hkWheel(years.map(function (v) { return toPersianDigits(String(v)); }), years.indexOf(currentYear), upd);
      wrapD.appendChild(wD); wrapD.appendChild(wM); wrapD.appendChild(wY);
      fD.appendChild(wrapD);
      var fT = document.createElement('div'); fT.className = 'hk-re-pnl'; box.appendChild(fT);
      var dtOpen = function (which) {
        var showD = which === 'd' && !fD.classList.contains('open'), showT = which === 't' && !fT.classList.contains('open');
        fD.classList.toggle('open', showD); fT.classList.toggle('open', showT);
        dVal.classList.toggle('on', showD); tVal.classList.toggle('on', showT);
        if (showD) [wD, wM, wY].forEach(function (w) { w._init(); });
        if (showT) [wH, wMi].forEach(function (w) { w._init(); });
      };
      dVal.onclick = function () { dtOpen('d'); };
      tVal.onclick = function () { dtOpen('t'); };
      var hrs = ['—']; for (var h = 0; h < 24; h++) hrs.push(p2(h));
      var mins = []; for (var mi = 0; mi < 60; mi++) mins.push(p2(mi));
      var tm = /^(\d{1,2}):(\d{2})/.exec(row.time || '');
      var wrapT = document.createElement('div'); wrapT.className = 'hk-re-wheels hk-re-time';
      var wH = hkWheel(hrs, tm ? (parseInt(tm[1], 10) + 1) : 0, upd);
      var wMi = hkWheel(mins, tm ? parseInt(tm[2], 10) : 0, upd);
      var colon = document.createElement('div'); colon.className = 'hk-re-colon'; colon.textContent = ':';
      /* ساعت سمت چپ، دقیقه سمت راست (مثل ۱۲:۴۵) */
      wrapT.appendChild(wH); wrapT.appendChild(colon); wrapT.appendChild(wMi);
      fT.appendChild(wrapT);
      function upd() {
        var d = wD.getIndex(), m = wM.getIndex() + 1, y = years[wY.getIndex()];
        dVal.querySelector('b').textContent = toPersianDigits(String(y)) + '/' + p2(m) + (d ? '/' + p2(d) : '');
        try { dGreg.textContent = d ? hkGregStr(y, m, d) : ''; } catch (eG) {}
        var hi = wH.getIndex();
        tVal.querySelector('b').textContent = hi ? (p2(hi - 1) + ':' + p2(wMi.getIndex())) : '—';
        tGreg.textContent = hi ? (String(hi - 1).padStart(2, '0') + ':' + String(wMi.getIndex()).padStart(2, '0')) : '';
        wMi.classList.toggle('hk-wheel-off', !hi);
      }
      /* شرح — ۱.۳.۶۸: بالای مبلغ */
      var fDs = field('شرح');
      var ds = document.createElement('textarea'); ds.className = 'hk-re-in hk-re-desc'; ds.rows = 1; ds.value = row.desc || ''; ds.readOnly = fromPlan;
      /* ۱.۳.۵۰: متن کوتاه = تک‌خطی؛ فقط اگر به خط بعد رفت بلند شود */
      var dsFit = function () { ds.style.height = 'auto'; ds.style.height = Math.min(110, ds.scrollHeight + 2) + 'px'; };
      ds.addEventListener('input', dsFit); setTimeout(dsFit, 0);
      fDs.appendChild(ds);
      hkAttachDescSuggest(ds, tab);
      /* مبلغ */
      var fA = field('مبلغ');
      var amt = document.createElement('input'); amt.className = 'hk-re-in hk-re-amt'; amt.inputMode = 'numeric';
      amt.value = row.amount ? formatNum(row.amount) : ''; amt.readOnly = fromPlan;
      amt.oninput = function () { var dg = toEnglishDigits(amt.value).replace(/[^0-9]/g, ''); amt.value = dg ? formatNum(parseInt(dg, 10)) : ''; };
      /* ۱.۳.۴۶: با اولین ضربه نشانگر کنار رقم یکان؛ بک‌اسپیس از همان‌جا پاک می‌کند */
      var amtEnd = function () { setTimeout(function () { try { var n = amt.value.length; amt.setSelectionRange(n, n); } catch (e) {} }, 0); };
      amt.addEventListener('focus', amtEnd); amt.addEventListener('click', amtEnd);
      fA.appendChild(amt);
      if (fromPlan) { var nA = document.createElement('div'); nA.className = 'hk-re-note'; nA.textContent = 'مبلغ و شرح قسط از بخش اقساط عوض می‌شود'; fA.appendChild(nA); }
      /* وضعیت پرداخت */
      var fS = field('وضعیت');
      var seg = document.createElement('div'); seg.className = 'hk-re-seg';
      [['paid', paidL], ['unpaid', unpaidL]].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.dataset.v = o[0];
        b.className = 'hk-re-segb ' + (o[0] === 'paid' ? (isInc ? 'is-paid is-inc' : 'is-paid is-exp') : 'is-unpaid');
        b.onclick = function () { st.status = o[0]; seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === st.status); }); reAmtColor(); };
        seg.appendChild(b);
      });
      seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === st.status); });
      fS.appendChild(seg);
      /* ۱.۳.۴۸: نوع ردیف: معمولی / پروژه (+ انتخاب پروژه) */
      var fc0 = rowFinancialContext(row);
      st.proj = (fc0.accountType === 'project' && fc0.subjectId && fc0.subjectId !== 'personal') ? fc0.subjectId : '';
      var fPj = field('نوع');
      var pjSeg = document.createElement('div'); pjSeg.className = 'hk-re-seg hk-re-pjseg';
      var subjects = []; try { subjects = (loadFinancialSubjects() || []).filter(function (s) { return s && s.id && s.id !== 'personal'; }); } catch (eSb) {}
      var pjB = document.createElement('button'); pjB.type = 'button'; pjB.className = 'hk-re-in hk-re-sel hk-re-pjsel';
      var pjTxt = function () { var sb = st.proj && subjects.find(function (s) { return s.id === st.proj; }); pjB.innerHTML = '<span class="hk-re-rl">پروژه</span><span class="hk-re-rv' + (sb ? '' : ' mute') + '">' + escapeHtml(sb ? sb.name : 'ندارد') + '</span>' + HK_RE_CHEV; };
      var pjSync = function () {
        pjSeg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', (x.dataset.v === 'project') === !!st.projMode); });
        /* ۱.۳.۵۵: فیلد پروژه داخل یک قاب با ارتفاع متحرک باز/بسته می‌شود (پدینگ و حاشیهٔ دکمه یک‌جا جابه‌جا نمی‌شوند) */
        var _show = !!st.projMode, _was = pjWrap.classList.contains('open');
        pjTxt();
        if (_show === _was) return;
        pjWrap.classList.toggle('open', _show);
        if (!pjWrap.isConnected) { pjWrap.style.height = _show ? 'auto' : '0px'; return; }
        clearTimeout(pjWrap._t);
        if (_show) {
          pjWrap.style.height = '0px'; void pjWrap.offsetHeight;
          pjWrap.style.height = pjWrap.scrollHeight + 'px';
          pjWrap._t = setTimeout(function () { if (pjWrap.classList.contains('open')) pjWrap.style.height = 'auto'; }, 340);
        } else {
          pjWrap.style.height = pjWrap.offsetHeight + 'px'; void pjWrap.offsetHeight;
          pjWrap.style.height = '0px';
        }
      };
      var pjWrap = document.createElement('div'); pjWrap.className = 'hk-re-pjwrap'; pjWrap.style.height = '0px'; pjWrap.appendChild(pjB);
      st.projMode = !!st.proj;
      [['personal', 'معمولی'], ['project', 'پروژه']].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.dataset.v = o[0]; b.className = 'hk-re-segb hk-re-pjb';
        b.onclick = function () {
          if (o[0] === 'project' && !subjects.length) { showToast('پروژه‌ای تعریف نشده؛ از منوی «پروژه‌ها» بسازید'); return; }
          st.projMode = o[0] === 'project'; if (!st.projMode) st.proj = ''; else if (!st.proj && subjects.length === 1) st.proj = subjects[0].id;
          pjSync();
        };
        pjSeg.appendChild(b);
      });
      /* ۱.۳.۶۹: یک ردیف «پروژه»: ندارد / نام پروژه (جای دکمهٔ معمولی/پروژه) */
      pjB.onclick = function (e) {
        e.stopPropagation();
        if (!subjects.length) { showToast('پروژه‌ای تعریف نشده؛ از منوی «پروژه‌ها» بسازید'); return; }
        hkReList(pjB, [{ v: '', l: 'ندارد' }].concat(subjects.map(function (s) { return { v: s.id, l: s.name }; })), st.proj, function (v) { st.proj = v; st.projMode = !!v; pjTxt(); });
      };
      fPj.appendChild(pjSeg); fPj.appendChild(pjWrap); pjSync();
      /* بانک */
      var fB = field('بانک / حساب');
      var accB = document.createElement('button'); accB.type = 'button'; accB.className = 'hk-re-in hk-re-sel';
      var accTxt = function () { accB.innerHTML = '<span class="hk-re-rl">حساب</span><span class="hk-re-rv' + (st.account ? '' : ' mute') + '">' + escapeHtml(st.account ? st.account : 'بدون حساب') + '</span>' + HK_RE_CHEV; };
      accTxt();
      accB.onclick = function (e) {
        e.stopPropagation();
        var opts = [{ v: '', l: 'بدون حساب' }];
        try { selectedAccountLabels().forEach(function (lb) { if ((lb || '').trim()) opts.push({ v: lb, l: lb }); }); } catch (eA) {}
        if (st.account && !opts.some(function (o) { return o.v === st.account; })) opts.push({ v: st.account, l: st.account });
        /* ۱.۳.۶۴: آخرین گزینه، مثل باکس پیامک: «＋ افزودن حساب» */
        opts.push({ v: '__add_account__', l: '＋ افزودن حساب' });
        hkReList(accB, opts, st.account, function (v) {
          if (v === '__add_account__') { hkReNewAcc(); return; }
          st.account = v; accTxt();
        });
      };
      fB.appendChild(accB);
      /* همان فیلد «حساب جدید» باکس پیامک: منو پنهان، فیلد نام جایش؛ با «ذخیره» حساب ساخته و برای این ردیف انتخاب می‌شود */
      var hkReNewAcc = function () {
        if (st.newAccIn && st.newAccIn.isConnected) { try { st.newAccIn.focus(); } catch (eF0) {} return; }
        /* ۱.۳.۶۶: باکس نام دقیقاً جای همان منو (همان پهنا و ارتفاع) و فلش همان منو در کنارش: زدنش به فهرست حساب‌ها برمی‌گردد */
        var ar = accB.getBoundingClientRect();
        accB.style.display = 'none';
        /* ۱.۳.۶۹: در فهرست یکدست، کادر نام حساب تازه درست جای همان ردیف «حساب» می‌نشیند */
        /* ۱.۳.۶۵: همان باکس ثبت گروهی */
        var nb = hkNewAccBox('ملی', '');
        var nw = nb.wrap; nw.classList.add('hk-re-newacc');
        var ni = nb.input;
        var nbx = nw.querySelector('.hk-bulk-newacc');
        if (ar.height > 0) nbx.style.height = ar.height + 'px';
        var back = document.createElement('button'); back.type = 'button'; back.className = 'hk-re-newback'; back.setAttribute('aria-label', 'انتخاب از حساب‌ها'); back.innerHTML = HK_RE_CHEV;
        nbx.appendChild(back);
        ni.addEventListener('input', function () { nbx.classList.toggle('hk-dup', hkAccNameTaken(ni.value)); });
        accB.insertAdjacentElement('afterend', nw);
        st.newAccIn = ni;
        back.onclick = function (e) {
          e.stopPropagation();
          nw.remove(); st.newAccIn = null; accB.style.display = '';
          try { ni.blur(); } catch (eB) {}
          setTimeout(function () { try { accB.click(); } catch (eC) {} }, 40);
        };
        setTimeout(function () { try { ni.focus(); } catch (eF) {} }, 80);
      };
      /* ۱.۳.۵۰: دسته (فقط مخارج) نیمهٔ چپ همان ردیف حساب */
      st.cat = row.p2p ? 'p2p' : '';
      /* ۱.۳.۸۳: درآمد همان دسته‌های باکس ثبت پیامک را دارد (روی خود ردیف: inCat؛ یا از روی شرحِ هم‌نام) */
      var hkInCatOf = function (r) { if (r.inCat && HK_INCOME_CATS.some(function (c) { return c.id === r.inCat; })) return r.inCat; var dd = String(r.desc || '').trim(); var m0 = HK_INCOME_CATS.find(function (c) { return c.label === dd; }); return m0 ? m0.id : ''; };
      if (isInc && !row.p2p) st.cat = hkInCatOf(row);
      if (!fromPlan) {
        if (!isInc && !row.p2p) { try { var c0 = HKCategorizer.classify(row.desc, row); if (c0 && c0.ids && c0.ids[0]) st.cat = c0.ids[0]; } catch (eC0) {} }
        st.cat0 = st.cat;
        var fC = field('دسته');
        var catB = document.createElement('button'); catB.type = 'button'; catB.className = 'hk-re-in hk-re-sel';
        var catTxt = function () { var c = st.cat === 'p2p' ? HK_P2P_CAT : (/^in_/.test(st.cat) ? HK_INCOME_CATS.find(function (x) { return x.id === st.cat; }) : (st.cat && HKCategorizer.byId[st.cat])); catB.innerHTML = '<span class="hk-re-rl">دسته</span><span class="hk-re-rv' + (c ? '' : ' mute') + '">' + escapeHtml(c ? c.label : 'نامشخص') + '</span>' + HK_RE_CHEV; };
        catTxt();
        catB.onclick = function (e) {
          e.stopPropagation();
          var opts = HKCategorizer.categories.filter(function (c) { return c && c.id && (typeof HK_INSTALLMENTS_ON === 'undefined' || HK_INSTALLMENTS_ON || c.id !== 'debt'); }).map(function (c) { return { v: c.id, l: c.label }; }).concat([{ v: '', l: 'نامشخص' }]);
          /* ۱.۳.۷۶: همان شبکهٔ رنگی دسته‌های باکس پیامک */
          hkCatPickSheet((isInc ? HK_INCOME_CATS.slice() : HKCategorizer.categories.filter(function (c) { return c && c.id && (typeof HK_INSTALLMENTS_ON === 'undefined' || HK_INSTALLMENTS_ON || c.id !== 'debt'); })).concat([HK_P2P_CAT]), st.cat, function (v) { st.cat = v; catTxt(); });
        };
        fC.appendChild(catB);
        var pair = document.createElement('div'); pair.className = 'hk-re-pair';
        fB.parentNode.insertBefore(pair, fB); pair.appendChild(fB); pair.appendChild(fC);
      }
      /* درآمد ثابت (فقط درآمد) */
      if (isInc && !fromPlan) {
        var fR = field('درآمد ثابت');
        var recB = document.createElement('button'); recB.type = 'button'; recB.className = 'hk-re-in hk-re-sel';
        var live = (recurringIncomes || []).filter(function (r) { return r && !r.deletedAt; });
        var recTxt = function () { var it = live.find(function (r) { return r.id === st.rec; }); recB.innerHTML = '<span class="hk-re-rl">درآمد ثابت</span><span class="hk-re-rv' + (it ? '' : ' mute') + '">' + escapeHtml(it ? (it.name || 'درآمد ثابت') : 'وصل نیست') + '</span>' + HK_RE_CHEV; };
        recTxt();
        recB.onclick = function (e) {
          e.stopPropagation();
          var opts = [{ v: '', l: 'وصل نیست' }].concat(live.map(function (r) { return { v: r.id, l: r.name || 'درآمد ثابت' }; }));
          hkReList(recB, opts, st.rec, function (v) { st.rec = v; recTxt(); });
        };
        fR.appendChild(recB);
      }
      if (fromPlan) {
        var fP = field('قسط');
        var pv = document.createElement('div'); pv.className = 'hk-re-ro';
        var plName = 'قسط'; try { var pl = (plans || []).find(function (p) { return p && p.id === row.fromPlanId; }); plName = pl ? (pl.name || 'قسط') : 'قسط'; } catch (ePl) {}
        pv.innerHTML = '<span class="hk-re-rl">قسط</span><span class="hk-re-rv">' + escapeHtml(plName) + '</span>';
        fP.appendChild(pv);
      }
      /* فایل‌ها */
      var fF = field('فایل‌ها');
      /* ۱.۳.۴۷: بی دکمه؛ زدن روی «۲ فایل» (یا «افزودن فایل») پنجرهٔ پیوست‌ها را باز می‌کند */
      var fRow = document.createElement('button'); fRow.type = 'button'; fRow.className = 'hk-re-files hk-re-flink';
      var cnt = function () { var n = Array.isArray(row.att) ? row.att.length : 0; fRow.innerHTML = '<span class="hk-re-rl">فایل‌ها</span><span class="hk-re-rv blue">' + (n ? toPersianDigits(String(n)) + ' فایل' : 'افزودن') + '</span>' + HK_RE_CHEV; };
      cnt();
      fRow.onclick = function () { try { openRowAttachments(row, function () { cnt(); try { if (ctx.onAtt) ctx.onAtt(); } catch (e0) {} }); } catch (eO) {} };
      fF.appendChild(fRow);
      /* ===== ۱.۳.۶۹: چیدمان یکدست: بالا مبلغ درشت + شرح، بعد وضعیت، بعد فهرست پیوستهٔ جزئیات ===== */
      function reAmtColor() { box.style.setProperty('--re-amt-c', st.status === 'unpaid' ? 'var(--hk-unsettled)' : (isInc ? 'var(--hk-income)' : 'var(--hk-expense)')); }
      reAmtColor();
      amt.placeholder = 'مبلغ'; ds.placeholder = 'شرح';
      var hero = document.createElement('div'); hero.className = 'hk-re-hero';
      hero.appendChild(amt); hero.appendChild(ds);
      if (typeof nA !== 'undefined' && nA) hero.appendChild(nA);
      var grp = document.createElement('div'); grp.className = 'hk-re-group';
      /* تاریخ و زمان در یک ردیف: زمان (راست)، خط جداکننده، تاریخ با میلادی زیرش (چپ) */
      var dtLab = document.createElement('span'); dtLab.className = 'hk-re-rl'; dtLab.textContent = 'تاریخ و زمان';
      var dtSep = document.createElement('i'); dtSep.className = 'hk-re-dtsep'; dtSep.setAttribute('aria-hidden', 'true');
      dtRow.innerHTML = ''; dtRow.classList.add('hk-re-row');
      dtRow.appendChild(dtLab); dtRow.appendChild(tVal); dtRow.appendChild(dtSep); dtRow.appendChild(dVal);
      grp.appendChild(dtRow); grp.appendChild(fD); grp.appendChild(fT);
      [accB, (typeof catB !== 'undefined' ? catB : null), pjB, (typeof recB !== 'undefined' ? recB : null), (typeof pv !== 'undefined' ? pv : null), fRow].forEach(function (el) { if (el) { el.classList.add('hk-re-row'); grp.appendChild(el); } });
      box.querySelectorAll('.hk-re-f, .hk-re-pair').forEach(function (f) { f.remove(); });
      seg.classList.add('hk-re-stseg');
      var ttl = box.querySelector('.hk-re-title');
      ttl.insertAdjacentElement('afterend', grp); ttl.insertAdjacentElement('afterend', seg); ttl.insertAdjacentElement('afterend', hero);
      /* دکمه‌ها: هم‌اندازه */
      var btns = document.createElement('div'); btns.className = 'hk-re-btns';
      var bOk = document.createElement('button'); bOk.type = 'button'; bOk.className = 'hk-re-ok'; bOk.textContent = 'ثبت';
      var bNo = document.createElement('button'); bNo.type = 'button'; bNo.className = 'hk-re-no'; bNo.textContent = 'انصراف';
      btns.appendChild(bOk); btns.appendChild(bNo);
      box.appendChild(btns);
      ov.appendChild(box);
      var reSaved = false;
      /* ۱.۳.۶۶: با بالا آمدن صفحه‌کلید، پنجره به بخش دیده‌شدهٔ صفحه می‌رود و فیلد در حال تایپ دیده می‌ماند */
      var reVV = function () {
        var vv = window.visualViewport; if (!vv || !ov.isConnected) return;
        var kb = vv.height < window.innerHeight * 0.85;
        ov.style.top = kb ? vv.offsetTop + 'px' : ''; ov.style.height = kb ? vv.height + 'px' : ''; ov.style.bottom = kb ? 'auto' : '';
        var a = document.activeElement;
        if (a && box.contains(a) && a.matches && a.matches('input, textarea')) setTimeout(function () { try { a.scrollIntoView({ block: 'nearest' }); } catch (eS) {} }, 30);
      };
      try { if (window.visualViewport) { window.visualViewport.addEventListener('resize', reVV); window.visualViewport.addEventListener('scroll', reVV); } } catch (eV) {}
      window.addEventListener('resize', reVV);
      box.addEventListener('focusin', function () { setTimeout(reVV, 320); });
      var close = function () {
        try { if (window.visualViewport) { window.visualViewport.removeEventListener('resize', reVV); window.visualViewport.removeEventListener('scroll', reVV); } } catch (eV2) {}
        window.removeEventListener('resize', reVV);
        try { document.querySelectorAll('.hk-re-list').forEach(function (l) { l.remove(); }); } catch (e) {} ov.remove();
        /* ۱.۳.۶۴: ردیف تازه (دکمهٔ «+» صفحهٔ اصلی) با انصراف برداشته می‌شود */
        if (!reSaved && ctx.onCancel) { try { ctx.onCancel(); } catch (eC) {} }
      };
      ov._hkCancel = close;
      bNo.onclick = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      /* ۱.۳.۵۰: چرخ تاریخ/زمان باز است: اولین لمس جای دیگر فقط آن را می‌بندد و روی چیز دیگری اثر ندارد */
      /* ۱.۳.۵۱: از همان لحظهٔ لمس (نه فقط click): فوکوس فیلد/کیبورد، باز شدن منو و بستن باکس هم رخ نمی‌دهد */
      var reSwallow = false;
      var reOutside = function (e) {
        if (!(fD.classList.contains('open') || fT.classList.contains('open'))) return false;
        return !(e.target.closest && e.target.closest('.hk-re-pnl, .hk-re-pill'));
      };
      ['pointerdown', 'mousedown', 'touchstart'].forEach(function (n) {
        ov.addEventListener(n, function (e) {
          if (!reOutside(e)) return;
          reSwallow = true;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          fD.classList.remove('open'); fT.classList.remove('open'); dVal.classList.remove('on'); tVal.classList.remove('on');
        }, { capture: true, passive: false });
      });
      ['pointerup', 'mouseup', 'touchend', 'click'].forEach(function (n) {
        ov.addEventListener(n, function (e) {
          if (!reSwallow && !reOutside(e)) return;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          /* بعد از touchstart بی‌اثر، click ممکن است اصلاً نیاید: پرچم کوتاه‌مدت است */
          if (n !== 'click' && reSwallow) setTimeout(function () { reSwallow = false; }, 400);
          if (n === 'click') { reSwallow = false; fD.classList.remove('open'); fT.classList.remove('open'); dVal.classList.remove('on'); tVal.classList.remove('on'); }
        }, { capture: true, passive: false });
      });
      bOk.onclick = function () {
        if (ctx.isNew && !(parseAmount(amt.value) > 0)) { showToast('مبلغ را بنویسید'); try { amt.focus(); } catch (eA) {} return; }
        /* ۱.۳.۶۴: حساب تازه (مثل باکس پیامک): نام لازم و تکراری‌نبودن؛ بعد ساخته و انتخاب می‌شود */
        if (st.newAccIn && st.newAccIn.isConnected) {
          var nmA = String(st.newAccIn.value || '').replace(/\s+/g, ' ').trim();
          if (!nmA) { showToast('نام حساب تازه را بنویسید'); try { st.newAccIn.focus(); } catch (eF1) {} return; }
          if (hkAccNameTaken(nmA)) { showToast('این نام در «انتخاب حساب» هست؛ نام دیگری بنویسید'); return; }
          var tA = getTodayPersian();
          selectedBankAccounts.push({ id: 'ba_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), bank: '', label: nmA, srcName: '', openingBalance: 0, createdAt: { y: tA.y, m: tA.m, d: tA.d } });
          try { saveBankAccountsSelection(); } catch (eSv) {}
          st.account = nmA;
          try { showToast('حساب «' + nmA + '» ساخته شد'); } catch (eT) {}
        }
        var y = years[wY.getIndex()], m = wM.getIndex() + 1, d = wD.getIndex();
        if (!fromPlan) {
          row.amount = parseAmount(amt.value) || 0;
          row.desc = ds.value || '';
        }
        try { if (!isInc && !fromPlan && st.cat !== st.cat0 && st.cat !== 'p2p' && String(row.desc || '').trim()) { HKCategorizer.learn(row.desc, st.cat ? [st.cat] : []); row.cats = st.cat ? [st.cat] : []; row.catKey = HKCategorizer.normalize(String(row.desc || '').trim()); } } catch (eL) {}
        /* ۱.۳.۸۲: جیب به جیب روی خود ردیف ذخیره می‌شود */
        if (!fromPlan) { if (st.cat === 'p2p') { row.p2p = true; delete row.p2pNo; } else if (row.p2p) { delete row.p2p; row.p2pNo = true; } }
        if (!fromPlan && isInc) {
          if (/^in_/.test(st.cat)) { row.inCat = st.cat; if (!String(row.desc || '').trim()) { var _ic = HK_INCOME_CATS.find(function (x) { return x.id === st.cat; }); if (_ic) row.desc = _ic.label; } }
          else delete row.inCat;
        }
        row.status = st.status;
        row.account = st.account;
        /* ۱.۳.۴۸: معمولی/پروژه */
        try {
          if (st.projMode && st.proj) {
            var sbj = getSubjectById(st.proj), fcN = defaultFinancialContext(), amtN = Number(row.amount) || 0;
            fcN.classification = 'third_party'; fcN.accountType = 'project'; fcN.subjectId = st.proj; fcN.subjectName = sbj ? sbj.name : ''; fcN.ownerName = fcN.subjectName; fcN.fundingSource = 'subject';
            if (tab === 'expense') {
              var al = allocateProjectExpense(st.proj, amtN);
              fcN.projectAmount = al.projectAmount; fcN.personalAdvanceAmount = al.personalAdvanceAmount; fcN.fundingSource = al.fundingSource;
              if (al.personalAdvanceAmount > 0) row.createsReceivable = true; else delete row.createsReceivable;
            } else { fcN.projectAmount = amtN; fcN.personalAdvanceAmount = 0; }
            row.financialContext = fcN;
          } else if (!st.projMode && rowFinancialContext(row).accountType === 'project') {
            row.financialContext = defaultFinancialContext(); delete row.createsReceivable;
          }
        } catch (eFcE) {}
        row.day = d ? String(d) : '';
        var hi = wH.getIndex();
        row.time = hi ? (String(hi - 1).padStart(2, '0') + ':' + String(wMi.getIndex()).padStart(2, '0')) : '';
        row.updatedAt = Date.now();
        var k = recMonthKey(y, m);
        /* درآمد ثابت */
        if (isInc && !fromPlan && (st.rec || '') !== (row.fromRecurringId || '')) {
          var prev = row.fromRecurringId ? (recurringIncomes || []).find(function (r) { return r && r.id === row.fromRecurringId; }) : null;
          delete row.fromRecurringId; delete row.recLinked; delete row.recForKey;
          if (st.rec) {
            var it = (recurringIncomes || []).find(function (r) { return r && r.id === st.rec; });
            if (it) {
              try { recRemoveRows(recRowsOf(it).filter(function (z) { return z.key === k && !recIsPaid(z.row) && z.row !== row; })); } catch (eRr) {}
              recLinkRow(it, row);
            }
          }
          if (prev) { try { recGenMonth(prev, k); } catch (eG) {} }
          try { saveRecurring(); } catch (eSr) {}
        }
        var moved = !(y === currentYear && m === currentMonth);
        if (moved) { try { hkMoveRowToMonth(row, tab, ctx.title, ctx.sec, y, m); } catch (eM) {} }
        reSaved = true;
        close();
        try { scheduleSave(); } catch (e1) {}
        try { if (ctx.onSaved) ctx.onSaved(); } catch (e2) {}
        try { renderHomeCards(); } catch (e3) {}
        showToast(moved ? 'ردیف به ' + (MONTHS[m - 1] || '') + ' ' + toPersianDigits(String(y)) + ' منتقل شد' : 'ردیف ذخیره شد');
      };
      document.body.appendChild(ov);
      upd();
      return ov;
    }
    /* فهرست انتخاب داخل باکس ویرایش (همان ظاهر منوهای کشویی نرم‌افزار) */
    var HK_RE_CHEV = '<svg class="hk-re-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    function hkReList(anchor, opts, cur, onPick) {
      /* ۱.۳.۴۶: یک ضربه باز، ضربهٔ دوم بسته؛ فلش کنار منو */
      var was = document.querySelector('.hk-re-list');
      document.querySelectorAll('.hk-re-list').forEach(function (l) { l.remove(); });
      document.querySelectorAll('.hk-re-sel.open').forEach(function (b) { b.classList.remove('open'); });
      if (was && was._anchor === anchor) return;
      var l = document.createElement('div'); l.className = 'dark-select-list open hk-re-list'; l._anchor = anchor;
      anchor.classList.add('open');
      opts.forEach(function (o) {
        var it = document.createElement('div'); it.className = 'dark-select-option' + (o.v === cur ? ' selected' : ''); it.textContent = o.l;
        it.onclick = function (e) { e.stopPropagation(); l.remove(); anchor.classList.remove('open'); onPick(o.v); };
        l.appendChild(it);
      });
      document.body.appendChild(l);
      var r = anchor.getBoundingClientRect();
      l.style.cssText = 'position:fixed;z-index:100500;left:' + Math.round(r.left) + 'px;width:' + Math.round(r.width) + 'px;max-height:260px;overflow:auto;box-sizing:border-box;';
      var h = Math.min(260, l.scrollHeight);
      var top = r.bottom + 4; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
      l.style.top = Math.round(top) + 'px';
      setTimeout(function () {
        var out = function (e) { if (!l.contains(e.target) && !anchor.contains(e.target)) { l.remove(); anchor.classList.remove('open'); document.removeEventListener('pointerdown', out, true); } else if (!l.isConnected) document.removeEventListener('pointerdown', out, true); };
        document.addEventListener('pointerdown', out, true);
      }, 30);
    }
    /* ===== ۱.۳.۴۵: اتصال‌های درآمد ثابت: جدا کردن اتصال اشتباه و وصل کردن دستی به ردیف یک ماه ===== */
    function recLinksModal(item, done) {
      var old = document.getElementById('recLinksModal'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'recLinksModal'; ov.className = 'hk-re-ov'; ov.setAttribute('data-hk-back', '1');
      var box = document.createElement('div'); box.className = 'hk-re-box';
      ov.appendChild(box);
      var close = function () { ov.remove(); if (done) done(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var render = function () {
        var rows = recRowsOf(item).concat([]).sort(function (a, b) { return b.key - a.key || (parseInt(b.row.day, 10) || 0) - (parseInt(a.row.day, 10) || 0); });
        box.innerHTML = '<div class="hk-re-title">اتصال‌های «' + escapeHtml(item.name || 'درآمد ثابت') + '»</div>';
        var list = document.createElement('div'); list.className = 'hk-rl-list';
        if (!rows.length) list.innerHTML = '<div class="hk-re-note" style="text-align:center">هنوز به ردیفی وصل نیست</div>';
        rows.forEach(function (x) {
          var it = document.createElement('div'); it.className = 'hk-rl-it';
          var t = document.createElement('div'); t.className = 'hk-rl-t';
          t.innerHTML = '<span>' + escapeHtml(recRowLabel(x.row, x.key)) + '</span><span class="hk-rl-st ' + (recIsPaid(x.row) ? 'p' : 'u') + '">' + (recIsPaid(x.row) ? 'دریافت شده' : 'دریافت نشده') + '</span>';
          var del = document.createElement('button'); del.type = 'button'; del.className = 'hk-rl-x'; del.textContent = '×'; del.setAttribute('aria-label', 'جدا کردن');
          del.onclick = function () {
            recPickModal('ردیف ' + recRowLabel(x.row, x.key) + ' به «' + (item.name || '') + '» وصل است.', [
              { label: 'فقط اتصال برداشته شود (ردیف می‌ماند)', value: 'unlink', primary: true },
              { label: 'اتصال و خود ردیف حذف شود (به سطل زباله)', value: 'del' },
              { label: 'انصراف', value: null }
            ], function (v) {
              if (!v) return;
              if (v === 'del') {
                try { pushToTrash('row', (x.row.desc || item.name || 'ردیف') + (x.row.amount ? ' · ' + formatNum(x.row.amount) : ''), { tab: 'income', sectionId: x.sec.id, sectionTitle: x.sec.title, periodKey: periodKey(Math.floor(x.key / 100), x.key % 100), row: JSON.parse(JSON.stringify(x.row)), sourceLabel: 'درآمد ثابت / ' + (item.name || '') }); } catch (eT) {}
                recRemoveRows([x]);
              } else {
                delete x.row.fromRecurringId; delete x.row.recLinked; delete x.row.recForKey; x.row.updatedAt = Date.now();
                recPersist();
              }
              try { saveRecurring(); } catch (eS) {}
              try { recRefreshViews(); } catch (eR) {}
              showToast(v === 'del' ? 'ردیف به سطل زباله رفت' : 'اتصال برداشته شد');
              render();
            });
          };
          it.appendChild(t); it.appendChild(del); list.appendChild(it);
        });
        box.appendChild(list);
        var add = document.createElement('button'); add.type = 'button'; add.className = 'hk-rl-add'; add.textContent = '+ وصل به ردیف یک ماه';
        add.onclick = function () { recManualLinkFlow(item, render); };
        box.appendChild(add);
        var btns = document.createElement('div'); btns.className = 'hk-re-btns hk-re-btns1';
        var bc = document.createElement('button'); bc.type = 'button'; bc.className = 'hk-re-no'; bc.textContent = 'بستن'; bc.onclick = close;
        btns.appendChild(bc); box.appendChild(btns);
      };
      render();
      document.body.appendChild(ov);
    }
    /* ۱.۳.۴۶: انتخاب ماه برای وصل دستی: اول فهرست = ماه شروع قرارداد؛ بالاتر ماه‌های قبل، پایین‌تر ماه‌های بعد؛ عنوان ثابت بالا */
    function hkRecMonthPicker(item, onPick) {
      var old = document.getElementById('recPickModal'); if (old) old.remove();
      var sk = recStartKey(item) || recTodayKey();
      var add = function (k, n) { var y = Math.floor(k / 100), m = k % 100 + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y * 100 + m; };
      var endK = Math.max(recEndKey(item) || 0, recTodayKey());
      var keys = []; for (var k = add(sk, -24); k <= endK; k = add(k, 1)) keys.push(k);
      var ov = document.createElement('div'); ov.id = 'recPickModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100400;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
      var box = document.createElement('div'); box.className = 'hk-mp-box';
      box.innerHTML = '<div class="hk-mp-title">ردیف کدام ماه به «' + escapeHtml(item.name || '') + '» وصل شود؟</div>';
      var list = document.createElement('div'); list.className = 'hk-mp-list';
      var startEl = null;
      keys.forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-mp-it' + (k === sk ? ' start' : '');
        b.textContent = recKeyLabel(k) + (k === sk ? ' (شروع قرارداد)' : '');
        b.onclick = function () { finish(k); };
        list.appendChild(b); if (k === sk) startEl = b;
      });
      box.appendChild(list);
      var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'hk-mp-cancel'; cancel.textContent = 'انصراف';
      box.appendChild(cancel);
      ov.appendChild(box);
      var done = false;
      var finish = function (v) { if (done) return; done = true; ov.remove(); if (v != null) { try { onPick(v); } catch (e) {} } };
      cancel.onclick = function () { finish(null); };
      ov._hkCancel = function () { finish(null); };
      ov.addEventListener('click', function (e) { if (e.target === ov) finish(null); });
      document.body.appendChild(ov);
      if (startEl) list.scrollTop = startEl.offsetTop - list.offsetTop;
      return ov;
    }
    /* ۱.۳.۵۰: وصل دستی: انتخاب ماه → ردیف‌های آن ماه با چک‌باکس (چند ردیف با هم، هر کدام ردیف جدا؛ بی جمع شدن) */
    function recManualLinkFlow(item, after) {
      hkRecMonthPicker(item, function (k) {
        if (!k) return;
        var pd = recMonthData(k, false);
        var cand = [];
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (row) {
            if (!row || row.deletedAt || !(Number(row.amount) > 0)) return;
            cand.push({ key: k, sec: sec, row: row });
          });
        });
        if (!cand.length) { showToast('در ' + recKeyLabel(k) + ' ردیف درآمدی برای وصل کردن نیست'); return; }
        recCheckPick(item, 'کدام ردیف‌های ' + recKeyLabel(k) + ' مربوط به «' + (item.name || '') + '» است؟', cand, function (picked, due) {
          if (!picked.length) return;
          recLinkAsBab(item, k, picked, due);
          if (after) after();
        });
      });
    }
    /* ۱.۳.۵۷: «وصل دستی»ِ یک ماه از آرشیو: بابت همان ماه ثابت است؛ واریزهای هم‌مبلغِ وصل‌نشدهٔ چند ماه اطراف با تیک */
    function recLinkForDue(item, dueK, after) {
      var amt = Number(item.amount) || 0, acc = (item.account || '').trim(), cands = [];
      var lo = recPrevKey(recPrevKey(dueK)), hi = recNextKey(recNextKey(recNextKey(dueK)));
      recEachMonth(function (k, pd) {
        if (k < lo || k > hi) return;
        ((pd && pd.income && pd.income.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || r.fromPlanId || !recIsPaid(r)) return;
            if (r.fromRecurringId && (r.fromRecurringId === item.id || recLiveItem(r.fromRecurringId))) return;
            var a = Number(r.amount) || 0;
            if (!a || !amt || a > amt * 1.05 || a < amt * 0.05) return;
            if (acc && (r.account || '').trim() && (r.account || '').trim() !== acc) return;
            cands.push({ key: k, row: r, sec: sec });
          });
        });
      });
      cands.sort(function (a, b) { return (a.key - b.key) || ((parseInt(a.row.day, 10) || 0) - (parseInt(b.row.day, 10) || 0)); });
      var babK = recTiming(item) === 'end' ? recPrevKey(dueK) : dueK;
      if (!cands.length) { showToast('واریز وصل‌نشده‌ای با همین مبلغ در ماه‌های اطراف ' + MONTHS[(babK % 100) - 1] + ' پیدا نشد'); return; }
      recCheckPick(item, 'کدام واریزها بابت ' + recKeyLabel(babK) + ' «' + (item.name || '') + '» است؟', cands, function (picked) {
        if (!picked.length) return;
        try { recRemoveRows(recRowsOf(item).filter(function (z) { return z.key === dueK && !recIsPaid(z.row); })); } catch (e0) {}
        picked.forEach(function (x) {
          recLinkRow(item, x.row);
          if (x.key === dueK) { delete x.row.recForKey; if (recIsAutoDesc(item, x.row.desc)) x.row.desc = item.name || x.row.desc; }
          else { x.row.recForKey = dueK; if (!item.paidAhead) item.paidAhead = {}; item.paidAhead[String(dueK)] = true; if (recIsAutoDesc(item, x.row.desc)) x.row.desc = recDueDesc(item, dueK, x.key); }
          x.row.updatedAt = Date.now();
        });
        recPersist();
        try { saveRecurring(); } catch (e1) {}
        try { recRefreshViews(); } catch (e2) {}
        showToast(toPersianDigits(String(picked.length)) + ' واریز بابت ' + recKeyLabel(babK) + ' وصل شد');
        if (after) after();
      });
    }
    /* ۱.۳.۵۶: وصل دستی: «ماه قبل / این ماه / ماه بعد» = بابت کدام ماه؛ سررسید آن ماه از نوع قرارداد (ابتدا/پایان ماه) معلوم می‌شود.
       ردیف همان‌جا (ماه واریز) می‌ماند؛ برچسب معوقه/پیش‌پرداخت فقط وقتی ماه واریز نه ماه «بابت» است نه ماه سررسید */
    function recLinkAsBab(item, k, picked, due) {
      var babK = due === 'late' ? recPrevKey(k) : due === 'ahead' ? recNextKey(k) : k;
      try { var p0 = recPayDateOf(picked[0]); recInferTiming(item, p0); } catch (eT) {}
      var dueK = recTiming(item) === 'end' ? recNextKey(babK) : babK;
      if (recRowsOf(item).some(function (z) { return z.key === dueK && recIsPaid(z.row) && picked.every(function (x) { return x.row !== z.row; }); }) || (dueK !== k && item.paidAhead && item.paidAhead[String(dueK)] && recArchiveRows(item).some(function (z) { return recIsPaid(z.row) && (parseInt(z.row.recForKey, 10) || z.key) === dueK && picked.every(function (x) { return x.row !== z.row; }); }))) {
        showToast('بابت ' + recKeyLabel(babK) + '، «' + (item.name || '') + '» قبلاً پرداخت شده', 'warn'); return;
      }
      try { recRemoveRows(recRowsOf(item).filter(function (z) { return z.key === dueK && !recIsPaid(z.row) && picked.every(function (x) { return x.row !== z.row; }); })); } catch (e0) {}
      picked.forEach(function (x) {
        recLinkRow(item, x.row);
        if (dueK === x.key) { delete x.row.recForKey; if (recIsAutoDesc(item, x.row.desc)) x.row.desc = item.name || x.row.desc; }
        else {
          x.row.recForKey = dueK;
          if (!item.paidAhead) item.paidAhead = {};
          item.paidAhead[String(dueK)] = true;
          if (recIsAutoDesc(item, x.row.desc)) x.row.desc = recDueDesc(item, dueK, x.key);
        }
        x.row.updatedAt = Date.now();
      });
      try { recInferTiming(item); } catch (eIt) {}
      recPersist();
      try { saveRecurring(); } catch (e1) {}
      try { recRefreshViews(); } catch (e2) {}
      showToast(toPersianDigits(String(picked.length)) + ' ردیف بابت ' + recKeyLabel(babK) + ' به «' + (item.name || '') + '» وصل شد');
    }
    function recCheckPick(item, title, cands, onOk) {
      var old = document.getElementById('recAddPrevModal'); if (old) old.remove();
      var ov = document.createElement('div');
      ov.id = 'recAddPrevModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100450;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;';
      var html = '<div style="width:100%;max-width:440px;max-height:80vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:14px;direction:rtl;overflow:hidden;">' +
        '<div style="padding:12px;font-weight:800;font-size:0.9rem;text-align:center;line-height:1.7;">' + escapeHtml(title) + '</div><div style="overflow:auto;flex:1;padding:0 10px 6px;">' +
        (cands.length > 1 ? '<label class="rec-prev-all" style="position:sticky;top:0;z-index:2;background:var(--card);display:flex;align-items:center;gap:8px;padding:9px 4px;font-size:0.84rem;font-weight:800;cursor:pointer;"><input type="checkbox" class="rec-prev-allchk" style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0;"><span>همه</span></label>' : '');
      /* ۱.۳.۵۱: ردیفِ وصل (به همین درآمد یا درآمد ثابت دیگر) فقط نمایش داده می‌شود: کم‌رنگ و غیرقابل انتخاب */
      cands.forEach(function (c, i) {
        var lid = c.row.fromRecurringId || '';
        var same = lid && lid === item.id, other = lid && !same ? recLiveItem(lid) : null;
        var dis = !!(same || other);
        html += '<label class="rec-pick-row' + (dis ? ' rec-pick-linked rec-pick-dis' : '') + '" style="display:flex;align-items:center;gap:8px;padding:9px 6px;margin-top:6px;border:1px solid var(--border);border-radius:9px;font-size:0.82rem;cursor:' + (dis ? 'default' : 'pointer') + ';">' +
          '<input type="checkbox" data-i="' + i + '"' + (dis ? ' disabled' : '') + ' style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0;"><span style="flex:1;">' +
          escapeHtml(recRowLabel(c.row, c.key)) + (same ? '<br><small class="rec-pick-tag">از قبل وصل به همین درآمد</small>' : other ? '<br><small class="rec-pick-tag">وصل به «' + escapeHtml(other.name || '') + '»</small>' : '') + '</span></label>';
      });
      /* ۱.۳.۵۴: یک خط کوچک «بابت سررسید»؛ پیش‌فرض همین ماه (فقط در وصل دستی) */
      /* ۱.۳.۵۶: ترتیب ماه قبل / این ماه / ماه بعد (قرمز / سبز / آبی)؛ «بابت سررسید» داخل همان کادر */
      if (onOk.length >= 2) html += '</div><div class="rec-due-row"><div class="rec-due-seg"><span class="rec-due-lab">بابت سررسید</span><button type="button" data-due="late">ماه قبل</button><button type="button" data-due="cur" class="on">این ماه</button><button type="button" data-due="ahead">ماه بعد</button></div>';
      html += '</div><div style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);">' +
        '<button type="button" data-act="ok" style="flex:1;padding:9px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">افزودن</button>' +
        '<button type="button" data-act="cancel" style="flex:1;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button></div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('[data-act="cancel"]').onclick = close;
      ov.querySelectorAll('.rec-due-seg button').forEach(function (b) { b.onclick = function () { ov.querySelectorAll('.rec-due-seg button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      var allChk = ov.querySelector('.rec-prev-allchk'), items = ov.querySelectorAll('input[data-i]:not([disabled])');
      if (allChk && items.length < 2) { var _al = allChk.closest('label'); if (_al) _al.style.display = 'none'; allChk = null; }
      if (allChk) {
        var syncAll = function () { var n0 = [].filter.call(items, function (x) { return x.checked; }).length; allChk.checked = n0 === items.length; allChk.indeterminate = n0 > 0 && n0 < items.length; };
        allChk.onchange = function () { items.forEach(function (x) { x.checked = allChk.checked; }); };
        items.forEach(function (x) { x.addEventListener('change', syncAll); });
      }
      ov.querySelector('[data-act="ok"]').onclick = function () {
        var picked = [];
        ov.querySelectorAll('input[data-i]:checked').forEach(function (cb) { var c = cands[parseInt(cb.getAttribute('data-i'), 10)]; if (c) picked.push(c); });
        var dueB = ov.querySelector('.rec-due-seg button.on');
        close();
        onOk(picked, dueB ? dueB.getAttribute('data-due') : 'cur');
      };
    }

    function openPersonDetailAccountMenu(accBtn, row, onPicked, fromKeyboard) {
      if (!accBtn) return;
      /* بسته شدن صفحه‌کلید (بعد از «بعدی» روی مبلغ) صفحه را جابه‌جا می‌کند؛ این جابه‌جایی منو را نبندد */
      try { window._hkMenuOpenAt = Date.now() + (fromKeyboard ? 700 : 0); } catch (eT) {}
      try { document.querySelectorAll('.dark-select-list.open').forEach(l => { try { l.remove(); } catch (e2) {} }); } catch (e0) {}
      const list = document.createElement('div');
      list.className = 'dark-select-list open';
      list.style.cssText = 'position:fixed;z-index:99999;max-height:240px;overflow:auto;background:#1c1c1e;border:1px solid rgba(255,255,255,0.12);border-radius:10px;min-width:150px;width:150px;box-sizing:border-box;';
      // لیست حساب‌های قابل انتخاب (global) — جدا از حسابِ انتخاب‌شده‌ی ردیف
      const banks = [];
      const seen = new Set();
      function addBankName(n) {
        let disp = n;
        try { if (typeof shortBankDisplay === 'function') disp = shortBankDisplay(n); } catch (e) {}
        disp = (disp || '').trim();
        if (!disp || seen.has(disp)) return;
        seen.add(disp);
        banks.push({ raw: n, disp: disp });
      }
      /* فقط حساب‌های ساخته‌شده (همان فهرست «انتخاب حساب بانکی») */
      try {
        selectedAccountLabels().forEach(function (lb) {
          lb = (lb || '').trim();
          if (!lb || seen.has(lb)) return;
          seen.add(lb);
          banks.push({ raw: lb, disp: lb });
        });
      } catch (e) {}
      /* همیشه یک سایز ثابت (با حساب یا فقط +) */
      list.style.minWidth = '150px';
      list.style.width = '150px';
      list.style.maxWidth = '150px';
      list.style.boxSizing = 'border-box';
      banks.forEach(b => {
        const opt = document.createElement('div');
        opt.className = 'dark-select-option';
        opt.textContent = b.disp;
        opt.style.cssText = 'padding:10px 12px;cursor:pointer;text-align:right;';
        opt.onclick = (ev) => {
          try { ev.stopPropagation(); } catch (e) {}
          if (row) row.account = b.disp;
          accBtn.textContent = typeof shortBankDisplay === 'function' ? shortBankDisplay(b.disp) : b.disp;
          try { if (typeof markFilled === 'function') markFilled(accBtn, true); } catch (eM) {}
          try { list.remove(); } catch (eR) {}
          try { scheduleSave(); } catch (eS) {}
          if (typeof onPicked === 'function') {
            setTimeout(() => { try { onPicked(); } catch (eP) {} }, 50);
          }
        };
        list.appendChild(opt);
      });
      /* پنتا: آخرین گزینه — بعلاوه آبی راست‌چین */
      if (banks.length) {
        list.style.minWidth = '120px';
        list.style.width = 'auto';
        list.style.maxWidth = '180px';
      }
      /* دکمهٔ «＋ افزودن حساب» از این منو برداشته شد (حساب فقط از «انتخاب حساب بانکی» ساخته می‌شود) */
      const addRow = document.createElement('div');
      addRow.style.display = 'none';
      addRow.className = 'dark-select-option acc-add-plus';
      addRow.style.cssText = 'padding:8px 10px;cursor:pointer;text-align:right;direction:rtl;color:#08b5f5;font-weight:800;display:flex;justify-content:flex-start;align-items:center;border-top:' + (banks.length ? '1px solid rgba(255,255,255,0.08)' : 'none') + ';';
      addRow.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(8,181,245,0.15);color:#08b5f5;font-size:1.15rem;line-height:1;">+</span>';
      addRow.onclick = function(ev) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch (e0) {}
        try { list.remove(); } catch (e1) {}
        try {
          if (typeof openBankAccountsModal === 'function') openBankAccountsModal(false);
          else if (typeof window.openBankAccountsModal === 'function') window.openBankAccountsModal(false);
        } catch (e2) {}
      };
      list.appendChild(addRow);
      document.body.appendChild(list);
      function placeAccountMenu() {
        try {
          const r = accBtn.getBoundingClientRect();
          if (!r || r.width < 1) return;
          const vv = window.visualViewport;
          const viewTop = vv ? vv.offsetTop : 0;
          const viewH = vv ? vv.height : window.innerHeight;
          const viewW = vv ? vv.width : window.innerWidth;
          const viewBottom = viewTop + viewH;
          // فاصله امن از نوار ناوبری اندروید
          const safeBottom = 56;
          const spaceBelow = viewBottom - r.bottom - safeBottom;
          const spaceAbove = r.top - viewTop - 8;
          let menuH = Math.min(240, list.scrollHeight || 200);
          let top;
          if (spaceBelow >= Math.min(menuH, 120) || spaceBelow >= spaceAbove) {
            // باز شدن به پایین
            menuH = Math.min(menuH, Math.max(100, spaceBelow - 4));
            top = r.bottom + 4;
          } else {
            // باز شدن به بالا
            menuH = Math.min(menuH, Math.max(100, spaceAbove - 4));
            top = r.top - menuH - 4;
          }
          if (top < viewTop + 4) top = viewTop + 4;
          if (top + menuH > viewBottom - safeBottom) {
            top = Math.max(viewTop + 4, viewBottom - safeBottom - menuH);
          }
          let left = r.left;
          const mw = Math.max(r.width, 140);
          if (left + mw > viewW - 8) left = viewW - mw - 8;
          if (left < 8) left = 8;
          list.style.position = 'fixed';
          list.style.zIndex = '99999';
          list.style.top = Math.round(top) + 'px';
          list.style.left = Math.round(left) + 'px';
          list.style.width = Math.round(mw) + 'px';
          list.style.maxHeight = Math.round(menuH) + 'px';
          list.style.overflowY = 'auto';
        } catch (e) {}
      }
      placeAccountMenu();
      requestAnimationFrame(placeAccountMenu);
      setTimeout(placeAccountMenu, 50);
      setTimeout(placeAccountMenu, 280);
      if (fromKeyboard) { setTimeout(placeAccountMenu, 550); setTimeout(placeAccountMenu, 900); }
      const close = (ev) => {
        if (!list.contains(ev.target) && ev.target !== accBtn) {
          try { list.remove(); } catch (e2) {}
          document.removeEventListener('mousedown', close);
          document.removeEventListener('touchstart', close);
        }
      };
      setTimeout(() => {
        document.addEventListener('mousedown', close);
        document.addEventListener('touchstart', close, { passive: true });
      }, 30);
    }


    function syncBalancePanelLayout() {
      try {
        const panel = document.getElementById('panel-balance');
        if (!panel || !panel.classList.contains('active')) return;
        let top = 0;
        const chrome = document.getElementById('stickyChrome');
        if (chrome) {
          const cr = chrome.getBoundingClientRect();
          top = Math.max(0, Math.round(cr.bottom));
        } else {
          top = 96;
        }
        const remind = document.getElementById('remindBar');
        if (remind && remind.style.display !== 'none') {
          const rr = remind.getBoundingClientRect();
          // اگر یادآوری دیده می‌شود و پایین‌تر از chrome است
          if (rr.height > 2 && rr.bottom > top) {
            top = Math.round(rr.bottom);
          }
        }
        document.documentElement.style.setProperty('--balance-panel-top', top + 'px');
        panel.style.top = top + 'px';
        try {
          if (typeof syncStickyChromeHeight === 'function') syncStickyChromeHeight();
        } catch (e0) {}
      } catch (e) {}
    }

    function openPersonDetail(title, kind) {
      try { setActiveHomeCardTitle(title); } catch (e) {}

      _detailContext = { title: title, kind: kind };
      try { document.body.classList.add('detail-open'); document.body.classList.toggle('search-open', kind === 'balance'); } catch (e) {}
      ensurePersonSections(title);
      if (kind === 'balance') {
        // پیش‌فرض: فقط همین کاربر؛ فیلتر مقایسه همچنان در دسترس است
        try { balanceSelectedTitles = [title]; } catch (e) {}
        currentTab = 'balance';
        activatePanel('balance');
        try { if (typeof syncStickyChromeHeight === 'function') syncStickyChromeHeight(); } catch (e) {}
        try { syncBalancePanelLayout(); } catch (e) {}
        try { renderBalanceTab(); } catch (e) {}
        try { if (typeof updateBalance === 'function') updateBalance(); } catch (e) {}
        requestAnimationFrame(() => { try { syncBalancePanelLayout(); } catch (e) {} });
        setTimeout(() => { try { syncBalancePanelLayout(); } catch (e) {} }, 100);
      } else {
        currentTab = kind;
        activatePanel(kind);
        window._pdResetScroll = true;
        renderPersonDetailPanel(kind, title);
      }
      // دکمه بازگشت UI حذف — با Back سخت‌افزاری برمی‌گردد
      try {
        const bar = document.getElementById('detailPageBar');
        if (bar) bar.style.display = 'none';
      } catch (e) {}
      try { history.pushState({hesabDetail:true, title:title, kind:kind}, '', location.href); } catch (e) {}
    }

    function showDetailBar(title, kind) {
      let bar = document.getElementById('detailPageBar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'detailPageBar';
        bar.className = 'detail-page-bar';
        const tabs = document.querySelector('.tabs');
        if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(bar, tabs.nextSibling);
        else document.body.insertBefore(bar, document.body.firstChild);
      }
      const labels = { income: 'درآمد', expense: 'مخارج', balance: 'مانده' };
      bar.style.display = 'flex';
      bar.innerHTML = '';
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'back-btn';
      back.textContent = 'بازگشت';
      back.onclick = () => closePersonDetail();
      const t = document.createElement('div');
      t.className = 'detail-title';
      t.textContent = (title || '') + ' — ' + (labels[kind] || '');
      bar.appendChild(t);
      bar.appendChild(back);
    }

    function resetBalanceSearch() {
      try {
        var inp = document.getElementById('balanceSearchInput');
        if (inp && inp.value) { inp.value = ''; }
        ['balanceSearchAmtMin', 'balanceSearchAmtMax'].forEach(function (id) { var a = document.getElementById(id); if (a) a.value = ''; });
        ['balanceSearchCat', 'balanceSearchRange'].forEach(function (id) {
          var el = document.getElementById(id); if (!el) return;
          el.value = id === 'balanceSearchRange' ? 'all' : '';
          try { if (el._fancyRender) el._fancyRender(); } catch (e2) {}
        });
        try { var hd = document.getElementById('balanceDayFilter'); if (hd) hd.value = ''; renderBalanceDayFilter(); } catch (e3) {}
        try { var ty = document.getElementById('balanceSearchType'); if (ty) { ty.value = ''; if (ty._fancyRender) ty._fancyRender(); } bsSyncTypeCat(); } catch (e4) {}
        /* حساب هم به «همه حساب‌ها» برمی‌گردد (بخش موقع باز شدن روی همان کاربر تنظیم می‌شود) */
        try { if (balanceSelectedAccount) { balanceSelectedAccount = ''; renderBalanceAccountFilter(); } } catch (e5) {}
        renderBalanceSearch();
      } catch (e) {}
    }
    /* ===== پیوست ردیف (آزمایشی): عکس (دوربین یا گالری) و یادداشت صوتی =====
       فایل‌ها جدا از اطلاعات اصلی در IndexedDB ذخیره می‌شوند؛ ردیف فقط فهرست شناسه‌ها را دارد (row.att).
       عکس: ضلع بلند حداکثر ۱۶۰۰px، JPEG کیفیت ۰٫۷۵ (معمولاً ۱۵۰ تا ۳۰۰ کیلوبایت، رسید کاملاً خوانا).
       صدا: Opus تک‌کاناله ۲۴kbps (هر دقیقه حدود ۲۰۰ کیلوبایت)، حداکثر ۵ دقیقه. */
    var HKAttach = (function () {
      var DB = 'hk-attach', ST = 'files', _db = null;
      function db() {
        if (_db) return Promise.resolve(_db);
        return new Promise(function (res, rej) {
          try {
            var rq = indexedDB.open(DB, 1);
            rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains(ST)) rq.result.createObjectStore(ST); };
            rq.onsuccess = function () { _db = rq.result; res(_db); };
            rq.onerror = function () { rej(rq.error); };
          } catch (e) { rej(e); }
        });
      }
      function tx(mode, fn) {
        return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(ST, mode), st = t.objectStore(ST), out = fn(st); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); }; t.onerror = function () { rej(t.error); }; }); });
      }
      /* ذخیرهٔ ماندگار: اندروید در کمبود فضا پیوست‌ها را پاک نکند */
      function put(id, blob) { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (eP) {} return tx('readwrite', function (st) { st.put(blob, id); }); }
      function get(id) { return tx('readonly', function (st) { return st.get(id); }); }
      function del(id) { return tx('readwrite', function (st) { st.delete(id); }); }
      function newId() { return 'att' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
      /* عکس: کوچک و فشرده با حفظ خوانایی */
      function compressImage(file) {
        return new Promise(function (res, rej) {
          var url = URL.createObjectURL(file), img = new Image();
          img.onload = function () {
            try {
              var MAX = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
              var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
              var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
              URL.revokeObjectURL(url);
              c.toBlob(function (b) { if (b) res(b); else rej(new Error('toBlob')); }, 'image/jpeg', 0.75);
            } catch (e) { URL.revokeObjectURL(url); rej(e); }
          };
          img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
          img.src = url;
        });
      }
      return { put: put, get: get, del: del, newId: newId, compressImage: compressImage };
    })();
    /* ۱.۳.۳۸: آیکون‌های مینیمال پیوست (خطی، هم‌سبک بقیهٔ آیکون‌ها)؛ «ضبط صدا» موج صدا است، نه میکروفونِ گفتار به متن */
    var HK_ICON_CAM = '<svg class="hk-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.6A1.6 1.6 0 0 1 5.6 7h2.2l1.5-2.2h5.4L16.2 7h2.2A1.6 1.6 0 0 1 20 8.6v8.8a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.4z"/><circle cx="12" cy="12.6" r="3.3"/></svg>';
    var HK_ICON_GAL = '<svg class="hk-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.2"/><circle cx="9.2" cy="9.8" r="1.6"/><path d="M4.8 17.2l4.6-4.6 3.2 3.2 2.6-2.6 4 4"/></svg>';
    var HK_ICON_WAVE = '<svg class="hk-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5v3M8 7.5v9M12 4.5v15M16 8.5v7M20 10.5v3"/></svg>';
    var HK_LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
    var HK_CLIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function hkFmtSize(n) { return n >= 1048576 ? toPersianDigits((n / 1048576).toFixed(1)).replace('.', '٫') + ' مگابایت' : toPersianDigits(String(Math.max(1, Math.round(n / 1024)))) + ' کیلوبایت'; }
    var HK_PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    var HK_PAUSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
    /* پخش‌کنندهٔ صدای پیوست: طول از a.dur (ضبط webm طول ندارد و نوار مرورگر بار اول می‌پرد)؛ پیشرفت هر لحظه از currentTime */
    function hkAudPill(it, a) {
      var au = new Audio(), btn = it.querySelector('.hk-aud-play'), fill = it.querySelector('.hk-aud-fill'), tm = it.querySelector('.hk-aud-time'), bar = it.querySelector('.hk-aud-bar'), raf = 0;
      au.preload = 'auto';
      var fmt = function (x) { x = Math.max(0, Math.round(x || 0)); return toPersianDigits(Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0')); };
      var total = function () { var d = au.duration; return (isFinite(d) && d > 0.2) ? d : (Number(a.dur) || 0); };
      var paint = function () {
        var T = total(), c = Math.min(au.currentTime || 0, T || Infinity);
        fill.style.width = (T ? Math.min(100, c / T * 100) : 0) + '%';
        tm.textContent = fmt(c) + ' / ' + fmt(T);
      };
      var loop = function () { paint(); if (!au.paused) raf = requestAnimationFrame(loop); };
      it._setSrc = function (u) { au.src = u; paint(); };
      it._audio = au;
      au.addEventListener('play', function () { btn.innerHTML = HK_PAUSE_SVG; btn.setAttribute('aria-label', 'توقف'); cancelAnimationFrame(raf); loop(); });
      au.addEventListener('pause', function () { btn.innerHTML = HK_PLAY_SVG; btn.setAttribute('aria-label', 'پخش'); cancelAnimationFrame(raf); paint(); });
      au.addEventListener('ended', function () { try { au.currentTime = 0; } catch (e) {} paint(); });
      au.addEventListener('timeupdate', paint);
      btn.onclick = function (e) {
        e.stopPropagation();
        if (au.paused) {
          document.querySelectorAll('#hkAttachOv .hk-att-item.aud').forEach(function (o) { if (o !== it && o._audio && !o._audio.paused) o._audio.pause(); });
          var pr = au.play(); if (pr && pr.catch) pr.catch(function () {});
        } else au.pause();
      };
      bar.onclick = function (e) {
        var T = total(); if (!T) return;
        var r = bar.getBoundingClientRect(), k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        try { au.currentTime = k * T; } catch (eS) {}
        paint();
      };
      paint();
    }
    function hkCloseAttach() {
      var ov = document.getElementById('hkAttachOv'); if (!ov) return false;
      try { ov.querySelectorAll('.hk-att-item.aud').forEach(function (o) { if (o._audio) o._audio.pause(); }); } catch (eA) {}
      try { if (ov._stopRec) ov._stopRec(true); } catch (e) {}
      try { (ov._urls || []).forEach(function (u) { URL.revokeObjectURL(u); }); } catch (e2) {}
      ov.remove(); return true;
    }
