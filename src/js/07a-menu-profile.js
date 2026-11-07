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
          b.innerHTML = '<i>' + hkCatIco(cat.id) + '</i><span></span>';
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
        /* ۱.۳.۸۶: «اقساط و وام» مثل باکس پیامک و ویرایش ردیف (بخش اقساط خاموش است) */
        HKCategorizer.categories.filter(function (c) { return c && (typeof HK_INSTALLMENTS_ON === 'undefined' || HK_INSTALLMENTS_ON || c.id !== 'debt'); }).concat([HK_P2P_CAT, { id: '', label: 'نامشخص' }]).forEach(function (cat) { grid.appendChild(addBtn(cat)); });
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
          var msg = document.createElement('div'); msg.className = 'sp-pick-err';
          var save = function () {
            /* ۱.۳.۸۶: اسم تکراری (بین همهٔ دسته‌ها: مخارج، درآمد، جیب به جیب، نامشخص) ساخته نمی‌شود */
            if (HKCategorizer.labelTaken(inp.value)) { msg.textContent = 'دسته‌ای با این اسم هست'; try { inp.focus(); } catch (e) {} return; }
            var cat = HKCategorizer.addCustom(inp.value);
            if (!cat) { try { inp.focus(); } catch (e) {} return; }
            /* آیکون (بانک یا گالری) و رنگ همان لحظه */
            hkCatStyleSheet(cat, function () { var t2 = grid.querySelector('[data-id="' + cat.id + '"]'); if (t2) { t2.style.setProperty('--cc', hkCatColor(cat.id)); var ic = t2.querySelector('i'); if (ic) ic.innerHTML = hkCatIco(cat.id); } });
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
          inp.addEventListener('input', function () { msg.textContent = HKCategorizer.labelTaken(inp.value) ? 'دسته‌ای با این اسم هست' : ''; });
          inp.setAttribute('enterkeyhint', 'done');
          wrap.appendChild(inp);
          wrap.appendChild(ok);
          wrap.appendChild(msg);
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


