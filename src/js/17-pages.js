    /* ===== ۱.۴.۰: سربرگ صفحه‌ها =====
       بالای هر صفحهٔ تمام‌صفحه، سمت راست: آیکون بک (همان شکل ‹ رو به راست) و جلویش نام صفحه. زدنش همان کار دکمهٔ بک اندروید را می‌کند.
       نام از عنوان خود صفحه خوانده می‌شود (عنوان اصلی پنهان می‌ماند ولی هر تغییرش — مثلاً رفتن به اطلاعات یک حساب مسدود یا یک گروه دُنگ — در سربرگ هم می‌آید).
       رفتن به زیرصفحه‌ای در همان صفحه (عوض شدن عنوان به نامی تازه) با ورق خوردن می‌آید؛ برگشت از آن مثل صفحه‌های دیگر. */
    var HK_BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    var HK_PG_BOX_SEL = '.modal-box, .hk-bulk-box, .hk-re-box, .modal-content, .backup-pick-panel, .export-choice-box, .hk-rc-box';
    var HK_PG_TITLE_SEL = '.hk-pf-h, .hk-dg-t, .hk-bulk-title, .modal-msg, .modal-title, .backup-pick-title, .export-choice-title, .hk-prefs-t, .hk-rc-title, .hk-pg-title';
    function hkPageBackBtn() {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-pg-back'; b.setAttribute('aria-label', 'بازگشت');
      b.innerHTML = HK_BACK_SVG;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { onBackGuard(); } catch (eB) {} });
      return b;
    }
    function hkPageBox(page) {
      if (!page) return null;
      for (var i = 0; i < page.children.length; i++) { var c = page.children[i]; if (c.matches && c.matches(HK_PG_BOX_SEL)) return c; }
      return page.firstElementChild;
    }
    function hkPageTitleSrc(box) {
      var kids = Array.prototype.filter.call(box.children, function (c) { return !c.classList.contains('hk-pg-hd'); });
      for (var i = 0; i < kids.length && i < 4; i++) { if (kids[i].matches(HK_PG_TITLE_SEL)) return kids[i]; }
      /* عنوان بی کلاس (پس‌انداز، یادآور، امنیت): اولین تکهٔ کوتاه بالای صفحه */
      var f = kids[0];
      if (f && f.tagName === 'DIV' && !f.id && f.children.length <= 1 && (f.textContent || '').trim().length > 0 && (f.textContent || '').trim().length <= 34) return f;
      return null;
    }
    function hkPageTitleText(src) {
      if (!src) return '';
      var c = src.cloneNode(true);
      c.querySelectorAll('button, .hk-pf-x, .hk-pf-back, svg, .hk-unread-n, input').forEach(function (n) { n.remove(); });
      return (c.textContent || '').replace(/\s+/g, ' ').trim();
    }
    function hkPageDecorate(page) {
      if (!page || !page.isConnected) return;
      /* برگه‌های بالانواردار (آمار، درآمد ثابت): خود نوار سربرگ است — آیکون بک کنار نام، سمت راست */
      if (page.classList.contains('feature-sheet')) {
        var bar = page.querySelector('.feature-sheet-bar');
        if (bar && !bar.querySelector('.hk-pg-back')) { var t0 = bar.querySelector('.fs-title'); bar.insertBefore(hkPageBackBtn(), t0 || bar.firstChild); }
        page.classList.add('hk-pg-fs');
        try { hkFabSync(page); } catch (eFb) {}
        return;
      }
      var box = hkPageBox(page); if (!box) return;
      /* پهنای کامل حتی وقتی قاعدهٔ خاص همان پنجره (مثلاً پروژه‌ها ۹۶vw) پهنای دیگری داده */
      if (!box._hkPgW) { box._hkPgW = true; ['width', 'max-width', 'min-width'].forEach(function (k, i) { box.style.setProperty(k, i === 1 ? 'none' : (i === 2 ? '0' : '100%'), 'important'); }); box.style.setProperty('margin', '0', 'important'); }
      var hd = box.querySelector(':scope > .hk-pg-hd');
      if (!hd) {
        hd = document.createElement('div'); hd.className = 'hk-pg-hd';
        hd.appendChild(hkPageBackBtn());
        var tt = document.createElement('div'); tt.className = 'hk-pg-t'; hd.appendChild(tt);
        box.insertBefore(hd, box.firstChild);
      } else if (box.firstElementChild !== hd) box.insertBefore(hd, box.firstChild);
      var src = hkPageTitleSrc(box);
      Array.prototype.forEach.call(box.querySelectorAll(':scope > .hk-pg-tsrc'), function (x) { if (x !== src) x.classList.remove('hk-pg-tsrc'); });
      var txt = hkPageTitleText(src);
      if (src) src.classList.add('hk-pg-tsrc');
      var tEl = hd.querySelector('.hk-pg-t');
      var stack = page._hkPgStack || (page._hkPgStack = []);
      /* ۱.۴.۳: عنوان اول صفحه = نام همان گزینه در منو (مثلاً «پشتیبان‌گیری» به‌جای پرسش بالای صفحه) */
      var disp = function (t) { return (page._hkMenuTitle && stack[0] === t) ? page._hkMenuTitle : t; };
      if (txt && !stack.length) { stack.push(txt); tEl.textContent = disp(txt); }
      else if (txt && tEl.textContent !== disp(txt)) {
        var prevIx = stack.indexOf(txt);
        if (prevIx >= 0) stack.length = prevIx + 1;
        else {
          /* زیرصفحهٔ تازه در همان صفحه: ورق خوردن */
          if (page.classList.contains('hk-page') && !page._hkPgNoAnim) {
            try { box.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }); } catch (eA) {}
          }
          stack.push(txt);
        }
        tEl.textContent = disp(txt);
      }
      /* ۱.۴.۱: توضیح بالای صفحه (اولین متن بلند درست زیر عنوان) → آیکون اطلاعات کنار نام صفحه */
      try {
        var intro = null;
        /* ۱.۴.۴: انتخاب توضیحِ هر صفحه (با همان عنوان) ثابت می‌ماند — بی این، روی بعضی گوشی‌ها هر فریم یک بار پیدا و یک بار گم می‌شد
           و توضیح پنهان/آشکار می‌شد (لرزش صفحهٔ یادآور: فهرست و فیلد ۴۸px بالا و پایین، ۱۲۰ بار در ثانیه) */
        var kept = page._hkPgIntro;
        if (kept && page._hkPgIntroKey === txt && kept.isConnected && box.contains(kept)) intro = kept;
        else if (src) { var nx = src.nextElementSibling; while (nx && (nx.classList.contains('hk-pg-hd') || (nx.offsetParent === null && !nx.classList.contains('hk-pg-intro-hid')))) nx = nx.nextElementSibling;
          if (nx && !nx.id && /^(DIV|P)$/.test(nx.tagName) && (nx.matches('.family-help, .sv-intro, .hk-dg-intro, .hk-bulk-hint, .sms-later-hint, .hk-pg-intro') || (!nx.className && nx.querySelectorAll('input, button, select, textarea').length === 0)) && (nx.textContent || '').trim().length > 40) intro = nx; }
        /* ۱.۴.۳: راهنماهای صفحه‌های شخصی‌سازی (هر جای صفحه) هم به ⓘ کنار نام می‌روند */
        if (!intro) { var hn0 = box.querySelector('.hk-prefs-hint, .hk-pf-note, .hk-pf-tip'); if (hn0 && (hn0.textContent || '').trim().length > 8) intro = hn0; }
        page._hkPgIntro = intro; page._hkPgIntroKey = txt;
        Array.prototype.forEach.call(box.querySelectorAll('.hk-pg-intro-hid'), function (x) { if (x !== intro) x.classList.remove('hk-pg-intro-hid'); });
        var ib = hd.querySelector('.hk-info-btn'), sp = hd.querySelector('.hk-pg-sp');
        if (intro) {
          intro.classList.add('hk-pg-intro-hid');
          var tip = (intro.textContent || '').replace(/\s+/g, ' ').trim();
          if (!ib) { var tmp = document.createElement('div'); tmp.innerHTML = hkInfoBtnHtml(tip); ib = tmp.firstChild; hd.insertBefore(ib, tEl.nextSibling); }
          else if (ib.getAttribute('data-tip') !== tip) ib.setAttribute('data-tip', tip);
          if (!sp) { sp = document.createElement('span'); sp.className = 'hk-pg-sp'; hd.appendChild(sp); }
        } else { if (ib) ib.remove(); if (sp) sp.remove(); }
      } catch (eIn) {}
      page.classList.add('hk-pg-has-hd');
      try { hkFabSync(page); } catch (eFb2) {}
      if (!page._hkPgObs) {
        var pend = 0;
        page._hkPgObs = new MutationObserver(function () {
          if (pend) return;
          /* ۱.۴.۴: ترمز چرخه: اگر در نیم‌ثانیه بیش از ۲۰ بار پشت سر هم اجرا شد، ۴۰۰ms صبر (و ثبت در گزارش اشکال) */
          var nowT = Date.now();
          if (nowT - (page._hkPgDecT || 0) > 500) { page._hkPgDecT = nowT; page._hkPgDecN = 0; }
          if (++page._hkPgDecN > 20) {
            if (page._hkPgDecN === 21) { try { if (window.hkDiag) hkDiag('loop', 'decorate ' + (page.id || '')); } catch (eL) {} }
            pend = setTimeout(function () { pend = 0; page._hkPgDecN = 0; page._hkPgDecT = Date.now(); if (page.classList.contains('hk-page')) hkPageDecorate(page); }, 400);
            return;
          }
          pend = requestAnimationFrame(function () { pend = 0; if (page.classList.contains('hk-page')) hkPageDecorate(page); });
        });
        page._hkPgObs.observe(page, { childList: true, subtree: true, characterData: true });
      }
    }
    /* ۱.۴.۱: نگهبان «صفحهٔ نیمه‌کشیده»: گاهی بعد از ورق خوردن، نمایشگر گوشی فقط تکهٔ بالای صفحه را دوباره می‌کشد و بقیه
       تصویر کهنهٔ صفحهٔ زیرین می‌ماند (و لمس‌ها به صفحهٔ نامرئی می‌خورد). بعد از هر ورق خوردن، صفحه یک بار کامل دوباره کشیده می‌شود. */
    var _hkPgTouchN = 0, _hkPgTouchAt = 0;
    (function () {
      var dn = function (e) { _hkPgTouchAt = Date.now(); _hkPgTouchN = e.touches ? e.touches.length : 1; };
      var up = function (e) { _hkPgTouchAt = Date.now(); _hkPgTouchN = e.touches ? e.touches.length : 0; };
      document.addEventListener('touchstart', dn, { capture: true, passive: true });
      document.addEventListener('touchmove', dn, { capture: true, passive: true });
      document.addEventListener('touchend', up, { capture: true, passive: true });
      document.addEventListener('touchcancel', up, { capture: true, passive: true });
      document.addEventListener('pointerdown', function () { _hkPgTouchAt = Date.now(); }, true);
      document.addEventListener('wheel', function () { _hkPgTouchAt = Date.now(); }, { capture: true, passive: true });
    })();
    function hkPageRepaint(el, hard) {
      try {
        if (!el || !el.isConnected) return;
        el.getAnimations && el.getAnimations().forEach(function (a) { try { if (a.playState !== 'finished') a.finish(); } catch (eF) {} });
        el.style.transform = 'none';
        /* ۱.۴.۲: نگهبان قوی‌تر — صفحه یک لحظه (در همان فریم، بی آنکه دیده شود) از نو چیده می‌شود تا نمایشگر همهٔ آن را دوباره بکشد
           (صفحه‌ای که باز بود ولی دیده نمی‌شد یا دوتایی دیده می‌شد). جای اسکرول‌ها حفظ می‌شود؛ وقتی فیلدی در حال تایپ است این کار نمی‌شود */
        var ae = document.activeElement;
        /* انگشت روی صفحه است یا تازه برداشته شده (کشیدن/اسکرول): دوباره چیدن، حرکت کاربر را قطع می‌کند → فقط حالت سبک */
        if (hard && (_hkPgTouchN > 0 || Date.now() - _hkPgTouchAt < 900)) hard = false;
        /* انیمیشن داخل صفحه (مثلاً قاب یادآور) از اول شروع نشود */
        try { if (hard && el.getAnimations({ subtree: true }).some(function (a) { return a.playState === 'running' && a.effect && a.effect.target !== el; })) hard = false; } catch (eAn) {}
        if (hard &&!(ae && el.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) {
          var sc = [];
          if (el.scrollTop || el.scrollLeft) sc.push([el, el.scrollTop, el.scrollLeft]);
          Array.prototype.forEach.call(el.querySelectorAll('*'), function (n) { if (n.scrollTop || n.scrollLeft) sc.push([n, n.scrollTop, n.scrollLeft]); });
          var d0 = el.style.getPropertyValue('display'), dp = el.style.getPropertyPriority('display');
          el.style.setProperty('display', 'none', 'important'); void el.offsetHeight;
          if (d0) el.style.setProperty('display', d0, dp); else el.style.removeProperty('display');
          void el.offsetHeight;
          sc.forEach(function (s) { try { s[0].scrollTop = s[1]; s[0].scrollLeft = s[2]; } catch (eS) {} });
        }
        var o = el.style.opacity; el.style.opacity = '0.999'; void el.offsetHeight;
        requestAnimationFrame(function () { el.style.opacity = o; el.style.transform = ''; void el.offsetHeight; });
      } catch (e) {}
    }
    (function () {
      if (typeof Element === 'undefined' || !Element.prototype.animate || Element.prototype.animate._hk141) return;
      var an0 = Element.prototype.animate;
      var an1 = function (kf, opt) {
        var el = this, a = an0.call(this, kf, opt);
        try {
          var big = el.classList && (el.classList.contains('hk-page') || (el.parentElement && el.parentElement.classList && el.parentElement.classList.contains('hk-page')));
          if (big && !el.classList.contains('hk-mnav-ghost')) {
            /* یک بار کامل (همان پایان ورق خوردن)، یک بار هم کمی بعد برای اطمینان */
            /* ۱.۴.۳: دوباره‌چیدن کامل (۱.۴.۲) خودش روی گوشی چشمک می‌زد؛ فقط حالت سبک، یک بار بعد از ورق خوردن */
            var done = 0, fin = function () { if (done++) return; hkPageRepaint(el, false); };
            a.addEventListener('finish', fin); a.addEventListener('cancel', fin);
            setTimeout(fin, ((opt && opt.duration) || 400) + 250);
          }
        } catch (eG) {}
        return a;
      };
      an1._hk141 = true;
      try { Element.prototype.animate = an1; } catch (eS) {}
      /* نرم‌افزار وسط ورق خوردن به پس‌زمینه رفت: برگشتن = صفحه‌های باز بی انیمیشن و کامل */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        Array.prototype.forEach.call(document.querySelectorAll('.hk-page'), function (p) { if (p.getClientRects().length) { hkPageRepaint(p); var bx = hkPageBox(p); if (bx) hkPageRepaint(bx); } });
      });
    })();
    /* صفحه بسته شد ← بار بعد از عنوان اول شروع شود */
    function hkPageResetStacks() {
      Array.prototype.forEach.call(document.querySelectorAll('.hk-page.hk-pg-has-hd'), function (p) { if (!p.getClientRects().length) p._hkPgStack = []; });
    }
    setInterval(hkPageResetStacks, 1500);
    try { Object.assign(window, { hkPageDecorate: hkPageDecorate, hkPageBackBtn: hkPageBackBtn, HK_BACK_SVG: HK_BACK_SVG }); } catch (ePg) {}
    /* صفحه‌هایی که پیش از این بخش باز و علامت خورده بودند */
    setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('.hk-page'), function (p) { if (p.getClientRects().length) hkPageDecorate(p); }); }, 0);
    /* ===== ۱.۴.۰: صفحهٔ قرض =====
       صفحه خودش اسکرول نمی‌خورد: فهرست روابط جای ۴ رابطه را دارد (بیشتر از ۴ تا فقط همین فهرست اسکرول می‌شود) و خلاصه زیرش ثابت است.
       جدولِ رابطهٔ باز هر چه جا با احتساب ۴ باکس رابطه می‌ماند را ثابت می‌گیرد؛ ردیف‌های بیشتر داخل خود جدول اسکرول می‌شوند.
       خط‌کشی ستون‌ها تا پایین قاب جدول ادامه دارد (حتی وقتی ردیف‌ها کم‌اند). */
    function hkLedLines(body) {
      try {
        var tbl = body.querySelector('table'); if (!tbl) return;
        var hr = tbl.querySelectorAll('thead tr'), last = hr[hr.length - 1]; if (!last) return;
        var ths = last.querySelectorAll('th'); if (ths.length < 2) return;
        var td = tbl.querySelector('tbody td'), col = td ? getComputedStyle(td).borderLeftColor : 'rgba(255,255,255,0.08)';
        if (!td || getComputedStyle(td).borderLeftStyle === 'none') col = 'rgba(255,255,255,0.08)';
        var br = body.getBoundingClientRect(), xs = [];
        Array.prototype.forEach.call(ths, function (th) { var r = th.getBoundingClientRect(), x = Math.round(r.left - br.left - body.clientLeft); if (x > 2 && x < body.clientWidth - 2) xs.push(x); });
        if (!xs.length) return;
        body.style.setProperty('background-image', xs.map(function (x) { return 'linear-gradient(to right, transparent ' + x + 'px, ' + col + ' ' + x + 'px, ' + col + ' ' + (x + 1) + 'px, transparent ' + (x + 1) + 'px)'; }).join(', '), 'important');
        body.style.setProperty('background-attachment', 'local', 'important');
        body.style.setProperty('background-repeat', 'no-repeat', 'important');
        body.classList.add('hk-led-lines');
      } catch (e) {}
    }
    function hkLedPageFit() {
      var fs = document.getElementById('featureSheet'), pl = document.getElementById('panel-ledger'), list = document.getElementById('sections-ledger');
      if (!fs || !pl || !list) return;
      var on = fs.classList.contains('open') && pl.getClientRects().length > 0;
      fs.classList.toggle('hk-led-page', on);
      if (!on) return;
      if (fs.classList.contains('hk-led-rel')) { try { hkLedRelFit(); var rb0 = list.querySelector('.section.hk-lrel .section-body'); if (rb0) hkLedLines(rb0); } catch (eRf) {} return; }
      var fb = document.getElementById('featureSheetBody'); if (!fb) return;
      var secs = Array.prototype.filter.call(list.children, function (x) { return x.classList && x.classList.contains('section'); });
      /* ۱.۴.۱: روابط و خلاصه در یک اسکرول (خلاصه هم کامل، نه چند ردیف)؛ صفحه ثابت. جدولِ رابطهٔ باز تقریباً کل جای صفحه را می‌گیرد */
      var fbr = fb.getBoundingClientRect(), pr = pl.getBoundingClientRect();
      var sb = 0; try { sb = homeSafeBottom(); } catch (eSb) {}
      var listH = Math.floor(fbr.bottom - pr.top - sb - 8);
      if (!(listH > 160)) return;
      pl.style.setProperty('max-height', listH + 'px', 'important');
      list.style.removeProperty('max-height');
      var closed = secs.filter(function (s) { return s.classList.contains('collapsed') && !s.classList.contains('hk-led-closing'); })[0] || secs[0];
      var secH = 74;
      if (closed) { var hd = closed.querySelector('.section-header'), cs0 = getComputedStyle(closed); secH = (hd ? hd.offsetHeight : 64) + (parseFloat(cs0.marginTop) || 0) + (parseFloat(cs0.marginBottom) || 0) + (parseFloat(cs0.paddingTop) || 0) + (parseFloat(cs0.paddingBottom) || 0); }
      var k = 1;
      secs.forEach(function (s) {
        var body = s.querySelector('.section-body.hk-led-scroll'); if (!body) return;
        var lwIn = s.querySelector('.hk-lw-in'), add = s.querySelector('.ledger-add-row');
        var addH = add ? add.offsetHeight + (parseFloat(getComputedStyle(add).marginTop) || 0) + (parseFloat(getComputedStyle(add).marginBottom) || 0) : 74;
        /* بقیهٔ تکه‌های داخل رابطهٔ باز به‌جز جعبهٔ جدول (فاصله‌ها) */
        var extra = 0; if (lwIn) { var ci = getComputedStyle(lwIn); extra = (parseFloat(ci.paddingTop) || 0) + (parseFloat(ci.paddingBottom) || 0); }
        var bm = getComputedStyle(body); extra += (parseFloat(bm.marginTop) || 0) + (parseFloat(bm.marginBottom) || 0);
        var h = Math.floor(listH - k * secH - addH - extra - 6);
        if (h < 150) h = 150;
        body.style.setProperty('max-height', h + 'px', 'important');
        body.style.setProperty('--hk-led-h', h + 'px');
        if (!s.classList.contains('collapsed')) hkLedLines(body);
        /* رابطه‌ای که تازه باز شد: آرام تا سرِ همان رابطه (جدولش کل صفحه را بگیرد) */
        var open = !s.classList.contains('collapsed');
        if (open && !s._hkWasOpen) { setTimeout(function () { try { var t = s.getBoundingClientRect().top - pl.getBoundingClientRect().top + pl.scrollTop - 4; pl.scrollTo({ top: Math.max(0, t), behavior: 'smooth' }); } catch (eSc) {} }, 380); }
        s._hkWasOpen = open;
      });
    }
    (function () {
      var t = 0;
      var later = function () { clearTimeout(t); t = setTimeout(hkLedPageFit, 60); };
      if (typeof window.hkLedCap === 'function' && !window.hkLedCap._hk140) {
        var cap0 = window.hkLedCap;
        var cap1 = function () { var r = cap0.apply(this, arguments); later(); return r; };
        cap1._hk140 = true; cap1.toString = function () { return Function.prototype.toString.call(cap0); };
        try { window.hkLedCap = cap1; } catch (eW) {}
      }
      if (typeof window.renderLedgerTab === 'function' && !window.renderLedgerTab._hk140) {
        var rl0 = window.renderLedgerTab;
        var rl1 = function () { var r = rl0.apply(this, arguments); later(); setTimeout(hkLedPageFit, 450); return r; };
        rl1._hk140 = true; rl1.toString = function () { return Function.prototype.toString.call(rl0); };
        try { window.renderLedgerTab = rl1; } catch (eW2) {}
      }
      try {
        var mo = new MutationObserver(function (ms) { if (ms.some(function (m) { return m.target && m.target.classList && m.target.classList.contains('section'); })) { later(); setTimeout(hkLedPageFit, 450); } });
        var hook = function () { var l = document.getElementById('sections-ledger'); if (l) mo.observe(l, { attributes: true, attributeFilter: ['class'], subtree: true }); };
        hook();
        /* ۱.۴.۴: همان لحظهٔ باز شدن هم اندازه شود (نه ۶۰ms بعد) تا خلاصهٔ قرض ۲ پیکسل نپرد */ var fsO = new MutationObserver(function () { try { hkLedPageFit(); } catch (eF) {} later(); }); var fsEl = document.getElementById('featureSheet'); if (fsEl) fsO.observe(fsEl, { attributes: true, attributeFilter: ['class'] });
      } catch (eMo) {}
      window.addEventListener('resize', later);
      try { window.hkLedPageFit = hkLedPageFit; } catch (eX) {}
    })();
    /* ۱.۴.۰: کشیدن افقی هم در «خروجی آرشیو درآمدهای ثابت» (اکسل / PDF) و هم در باکس ویرایش ردیف (پرداخت/دریافت شده ↔ نشده) */
    try { HK_SWIPE_TABS += ', .hk-rax-kind, .hk-re-stseg'; } catch (eSw) {}
    /* ===== ۱.۴.۳: دکمه‌های «بستن» و «انصراف» در هیچ‌جا نیستند =====
       برگشت گوشی (و زدن بیرون پنجره) همان کار را می‌کند. دکمه پنهان می‌شود ولی کارش سر جایش است: برگشت، اگر پنجره‌ای جز این
       راهی برای بسته شدن نداشته باشد، همان دکمهٔ پنهان را می‌زند (تا هر کار پاک‌سازی آن پنجره درست انجام شود).
       دکمهٔ باقی‌مانده کنارش پهنای هر دو را می‌گیرد. پرسش‌های «بلی/خیر» و پنجره‌های انتخاب (که «انصراف» یکی از جواب‌هاست) دست نمی‌خورند. */
    var HK_NOBTN_RE = /^(بستن|انصراف)$/;
    var HK_NOBTN_KEEP = '#confirmModal, #recPickModal, #hkAsk3, #recAddPrevModal, #recRenewModal, #smsConfirmModal, #pinSetupModal, .pin-setup, .pin-cancel, .hk-keep-btns';
    function hkStripBtns(root) {
      if (!root || !root.querySelectorAll) return;
      var list = root.tagName === 'BUTTON' ? [root] : root.querySelectorAll('button');
      Array.prototype.forEach.call(list, function (b) {
        if (b._hkNb) return;
        var t = (b.textContent || '').replace(/\s+/g, ' ').trim();
        if (!HK_NOBTN_RE.test(t) || b.closest(HK_NOBTN_KEEP)) return;
        b._hkNb = 1; b.classList.add('hk-nobtn');
        var par = b.parentElement; if (!par) return;
        var kids = Array.prototype.slice.call(par.children), btns = kids.filter(function (x) { return x.tagName === 'BUTTON'; });
        var rest = btns.filter(function (x) { return x !== b && !x.classList.contains('hk-nobtn'); });
        if (!rest.length) { if (kids.every(function (x) { return x.tagName === 'BUTTON'; })) par.classList.add('hk-nobtn-wrap'); }
        else if (kids.every(function (x) { return x.tagName === 'BUTTON'; })) par.classList.add('hk-nobtn-row');
      });
    }
    (function () {
      var pend = [], tm = 0;
      var run = function () { tm = 0; var p = pend; pend = []; p.forEach(function (n) { try { if (n.isConnected) hkStripBtns(n); } catch (e) {} }); };
      try {
        new MutationObserver(function (ms) {
          ms.forEach(function (m) {
            if (m.type === 'childList') Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) pend.push(n); });
            else if (m.target && m.target.parentElement) pend.push(m.target.nodeType === 1 ? m.target : m.target.parentElement);
          });
          if (!tm) tm = requestAnimationFrame(run);
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
      } catch (eMo) {}
      hkStripBtns(document.body);
    })();
    /* برگشت: بالاترین پنجرهٔ بازی که دکمهٔ «بستن/انصراف» پنهان دارد → همان دکمه */
    function hkBackHiddenCancel() {
      var cands = Array.prototype.filter.call(document.querySelectorAll('button.hk-nobtn'), function (b) {
        var ly = b.closest('[data-hk-back], .modal-overlay, .hk-bulk-ov, .backup-pick-overlay, [id$="Ov"], [id$="Overlay"], [id$="Modal"], [id$="Sheet"], [id$="Editor"]');
        if (!ly || !ly.getClientRects().length) return false;
        var cs = getComputedStyle(ly); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        b._hkLy = ly; return true;
      });
      if (!cands.length) return false;
      var z = function (b) { return parseInt(getComputedStyle(b._hkLy).zIndex, 10) || 0; };
      cands.sort(function (a, c) { return (z(c) - z(a)) || (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1); });
      try { cands[0].click(); return true; } catch (e) { return false; }
    }
    try { window.hkStripBtns = hkStripBtns; window.hkBackHiddenCancel = hkBackHiddenCancel; } catch (eW) {}
    /* ===== ۱.۴.۳: «گزارش اشکال» پنهان (برای پیدا کردن دقیق پرش‌ها، صفحه‌های دوتایی/نامرئی و گیر کردن منوها روی گوشی) =====
       روشن کردن: در «شخصی‌سازی» هفت بار روی عنوان «شخصی‌سازی» بزنید. وقتی روشن است، با زمان دقیق ثبت می‌شود:
       باز و بسته شدن صفحه‌ها، شروع و پایان ورق خوردن‌ها، جابه‌جایی ناگهانی محتوا (layout-shift)، کارهای کند (longtask)،
       لایه‌هایی که هم‌زمان روی صفحه‌اند، تغییر اندازهٔ صفحه (صفحه‌کلید)، رفتن/برگشتن نرم‌افزار و خطاها. هیچ مبلغ یا متن ردیفی ثبت نمی‌شود. */
    var HK_DIAG_KEY = 'hk_diag_on', HK_DIAG_LOG = 'hk_diag_log', _hkDiagBuf = [], _hkDiagT0 = Date.now();
    function hkDiagOn() { try { return localStorage.getItem(HK_DIAG_KEY) === '1'; } catch (e) { return false; } }
    function hkDiagNm(el) {
      try { if (!el || !el.tagName) return '?'; var c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''); } catch (e) { return '?'; }
    }
    function hkDiag(kind, msg) {
      if (!hkDiagOn()) return;
      var d = new Date(), t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2) + '.' + ('00' + d.getMilliseconds()).slice(-3);
      _hkDiagBuf.push(t + ' ' + kind + ' ' + String(msg || '').slice(0, 220));
      if (_hkDiagBuf.length > 500) _hkDiagBuf.splice(0, _hkDiagBuf.length - 500);
      clearTimeout(hkDiag._s); hkDiag._s = setTimeout(function () { try { localStorage.setItem(HK_DIAG_LOG, JSON.stringify(_hkDiagBuf.slice(-400))); } catch (e) {} }, 400);
    }
    (function () {
      try { var old = JSON.parse(localStorage.getItem(HK_DIAG_LOG) || '[]'); if (Array.isArray(old)) _hkDiagBuf = old; } catch (e) {}
      var started = false;
      var start = function () {
        if (started || !hkDiagOn()) return; started = true;
        hkDiag('start', (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 160) + ' | ' + innerWidth + 'x' + innerHeight + ' dpr=' + (window.devicePixelRatio || 1));
        try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.value < 0.001) return; hkDiag('SHIFT', e.value.toFixed(3) + ' ' + (e.sources || []).slice(0, 3).map(function (s) { return hkDiagNm(s.node) + ' ' + Math.round(s.previousRect.y) + '>' + Math.round(s.currentRect.y); }).join(' ; ')); }); }).observe({ type: 'layout-shift', buffered: false }); } catch (e1) {}
        try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { hkDiag('SLOW', Math.round(e.duration) + 'ms'); }); }).observe({ type: 'longtask', buffered: false }); } catch (e2) {}
        document.addEventListener('visibilitychange', function () { hkDiag('app', document.hidden ? 'background' : 'foreground'); });
        window.addEventListener('resize', function () { hkDiag('resize', innerWidth + 'x' + innerHeight + (window.visualViewport ? ' vv=' + Math.round(visualViewport.height) : '')); });
        window.addEventListener('error', function (e) { hkDiag('ERROR', (e.message || '') + ' @' + (e.lineno || '')); });
        /* لایه‌های هم‌زمان: هر بار که عوض شوند */
        var last = '';
        setInterval(function () {
          try {
            var ls = (typeof hkLayersShown === 'function' ? hkLayersShown() : []).map(function (x) { var r = x.getBoundingClientRect(); return hkDiagNm(x) + '[' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (getComputedStyle(x).transform !== 'none' ? ' T' : '') + ']'; });
            var gh = document.querySelectorAll('.hk-mnav-ghost, .st-turn-ghost').length;
            var cur = ls.join(' + ') + (gh ? ' ghosts=' + gh : '');
            if (cur !== last) { last = cur; hkDiag('layers', cur || '(home)'); }
          } catch (e3) {}
        }, 250);
      };
      try { window.hkDiagStart = start; } catch (eW) {}
      start();
      /* ورق خوردن صفحه‌ها و باز/بسته شدن با برگشت */
      try {
        var an = Element.prototype.animate;
        Element.prototype.animate = function (kf, opt) {
          var a = an.apply(this, arguments);
          try {
            if (hkDiagOn() && this.classList && (this.classList.contains('hk-page') || this.classList.contains('hk-mnav-ghost') || (this.parentElement && this.parentElement.classList.contains('hk-page')))) {
              var nm = hkDiagNm(this), t0 = performance.now();
              hkDiag('anim+', nm + ' ' + ((opt && opt.duration) || '') + 'ms');
              a.addEventListener('finish', function () { hkDiag('anim=', nm + ' ' + Math.round(performance.now() - t0) + 'ms'); });
              a.addEventListener('cancel', function () { hkDiag('anim-x', nm); });
            }
          } catch (eA) {}
          return a;
        };
        Element.prototype.animate._hk141 = an._hk141;
      } catch (eAn) {}
      /* ۱.۴.۷: نگهبان «لمس پنهان»: لمسی که به لایه‌ای می‌رسد در حالی که لایهٔ دیگری روی آن دیده می‌شود */
      document.addEventListener('pointerdown', function (e) {
        if (!hkDiagOn()) return;
        try {
          var t = e.target, x = e.clientX, y = e.clientY, tz = 0;
          var lay = function (n) { for (; n && n !== document.body; n = n.parentElement) { var c = getComputedStyle(n); if (c.position === 'fixed' && c.zIndex !== 'auto') return n; } return null; };
          var tl = lay(t); tz = tl ? (parseInt(getComputedStyle(tl).zIndex, 10) || 0) : 0;
          (typeof hkLayersShown === 'function' ? hkLayersShown() : []).forEach(function (L2) {
            if (!L2 || L2 === tl || (tl && (L2.contains(tl) || tl.contains(L2)))) return;
            var c2 = getComputedStyle(L2), r = L2.getBoundingClientRect(), z2 = parseInt(c2.zIndex, 10) || 0;
            if (c2.pointerEvents === 'none' && z2 > tz && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && parseFloat(c2.opacity) > 0.2) hkDiag('HIDDEN-TAP', hkDiagNm(t) + ' under ' + hkDiagNm(L2));
          });
        } catch (eH) {}
      }, true);
      document.addEventListener('pointerdown', function (e) { if (hkDiagOn()) hkDiag('tap', hkDiagNm(e.target && e.target.closest ? (e.target.closest('button, [onclick], .hk-page, .modal-overlay') || e.target) : e.target) + ' @' + Math.round(e.clientX) + ',' + Math.round(e.clientY)); }, true);
    })();
    function hkDiagText() {
      /* ۱.۴.۴: نسخهٔ نصب‌شده از خود اندروید (نه ثابت قدیمی APP_VERSION) */
      var vi = (typeof _appInfo !== 'undefined' && _appInfo) ? (_appInfo.name + (_appInfo.code ? ' (' + _appInfo.code + ')' : '')) : '';
      return 'گزارش اشکال حساب‌کتاب ' + vi + '\n' + _hkDiagBuf.join('\n');
    }
    try { setTimeout(function () { if (typeof getInstalledVersion === 'function') getInstalledVersion(); }, 2500); } catch (eV) {}
    function hkDiagCopy() {
      var txt = hkDiagText();
      var ok = function () { try { showToast('گزارش کپی شد؛ آن را برای پشتیبانی بفرستید'); } catch (e) {} };
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, function () { fb(); }); return; } } catch (e0) {}
      fb();
      function fb() { try { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); } catch (e1) {} }
    }
    function hkDiagSet(on) {
      try { localStorage.setItem(HK_DIAG_KEY, on ? '1' : '0'); } catch (e) {}
      if (on && typeof window.hkDiagStart === 'function') window.hkDiagStart();
      hkDiag('diag', on ? 'on' : 'off');
    }
    function hkDiagClear() { _hkDiagBuf = []; try { localStorage.removeItem(HK_DIAG_LOG); } catch (e) {} }
    try { Object.assign(window, { hkDiag: hkDiag, hkDiagOn: hkDiagOn, hkDiagCopy: hkDiagCopy, hkDiagSet: hkDiagSet, hkDiagClear: hkDiagClear, hkDiagText: hkDiagText }); } catch (eDw) {}
    /* ===== ۱.۴.۴: شروع بی‌پرش =====
       صفحهٔ اول تا وقتی جای سربرگ، کارت‌ها و باکس هوشمند چند فریم پشت هم ثابت نمانده نشان داده نمی‌شود (html.hk-ready).
       سقف انتظار ۹۰۰ms بعد از بارگذاری؛ خود CSS هم بعد از ۱٫۵ ثانیه صفحه را نشان می‌دهد (اگر این کد اجرا نشود). */
    (function () {
      var done = false;
      var show = function () { if (done) return; done = true; try { document.documentElement.classList.add('hk-ready'); } catch (e) {} };
      var settle = function () {
        var last = null, n = 0, t0 = Date.now();
        var step = function () {
          if (done) return;
          var k = '';
          try {
            ['.container', '#homeSmartBox', '#stickyChrome', '.hk-notch'].forEach(function (s) { var el = document.querySelector(s); if (el) { var r = el.getBoundingClientRect(); k += Math.round(r.top) + 'h' + Math.round(r.height) + '|'; } });
          } catch (e) {}
          if (k === last) n++; else { n = 0; last = k; }
          if (n >= 10 || Date.now() - t0 > 900) return show();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle);
      setTimeout(show, 1400);
    })();
    /* ===== ۱.۴.۵: منوی همبرگری خلوت =====
       هر قسمت (بخش‌ها، حساب‌ها و پیامک، …) یک ردیف کلی است که زیرش نام چند منوی همان قسمت با طوسی کوچک آمده؛
       زدن روی آن صفحهٔ همان قسمت را (همان‌جا، با ورق خوردن نرم) باز می‌کند و بازگشت به فهرست قسمت‌ها برمی‌گردد.
       باکس نام نرم‌افزار، باکس نام کاربر و جستجو دست نخورده‌اند. خود گزینه‌ها همان دکمه‌های قبلی‌اند (جستجو و تست‌ها مثل قبل). */
    (function () {
      var dd = document.getElementById('menuDropdown'); if (!dd) return;
      var CH = '<svg class="hk-mgr-ch" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
      var itemName = function (el) {
        if (el.classList.contains('menu-theme-row')) { var s = el.querySelector('span'); return s ? s.textContent.trim() : ''; }
        return Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join(' ').replace(/\s+/g, ' ').trim();
      };
      var slide = function (el, fwd) { try { if (el && el.animate) el.animate([{ transform: 'translateX(' + (fwd ? -28 : 28) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }); } catch (e) {} };
      var exit = function (quiet) {
        if (!dd.classList.contains('hk-mgv')) return false;
        dd.classList.remove('hk-mgv');
        Array.prototype.forEach.call(dd.querySelectorAll('.hk-mg-on'), function (g) { g.classList.remove('hk-mg-on'); });
        if (!quiet) slide(dd.querySelector('.menu-scroll'), false);
        return true;
      };
      var enter = function (g) {
        dd.classList.add('hk-mgv'); g.classList.add('hk-mg-on');
        var sc = dd.querySelector('.menu-scroll'); if (sc) sc.scrollTop = 0;
        slide(sc, true);
      };
      var build = function () {
        Array.prototype.forEach.call(dd.querySelectorAll('.hk-mg[data-g]'), function (g) {
          var lab = g.querySelector(':scope > .menu-section-label'), box = g.querySelector(':scope > .hk-mg-box'); if (!lab || !box) return;
          var row = g.querySelector(':scope > .hk-mgr');
          if (!row) {
            row = document.createElement('button'); row.type = 'button'; row.className = 'hk-mgr';
            row.innerHTML = '<i class="hk-mi"></i><span class="hk-mgr-tx"><b></b><small></small></span>' + CH;
            row.querySelector('b').textContent = lab.textContent.trim();
            row.onclick = function (e) { e.stopPropagation(); enter(g); };
            g.insertBefore(row, g.firstChild);
            var hd = document.createElement('button'); hd.type = 'button'; hd.className = 'hk-mgh';
            hd.innerHTML = (window.HK_BACK_SVG || '') + '<span></span>'; hd.querySelector('span').textContent = lab.textContent.trim();
            hd.onclick = function (e) { e.stopPropagation(); exit(); };
            g.insertBefore(hd, row.nextSibling);
          }
          var its = Array.prototype.filter.call(box.children, function (c) { return (c.classList.contains('menu-item') || c.classList.contains('menu-theme-row')) && c.style.display !== 'none'; });
          var nm = its.map(itemName).filter(Boolean);
          /* ۱.۴.۷: بی «…»: فقط همان تعداد نامی که در یک خط جا می‌شود */
          var sm = row.querySelector('small'); sm.textContent = nm.join('، ');
          if (sm.clientWidth > 0) { for (var n = nm.length; n > 1 && sm.scrollWidth > sm.clientWidth + 1; n--) sm.textContent = nm.slice(0, n - 1).join('، '); }
          row._hkNeedFit = nm; /* بعد از باز شدن منو (فونت و پهنای واقعی) دوباره */
          var ic = its[0] && its[0].querySelector('.hk-mi'), my = row.querySelector('.hk-mi');
          if (ic && my && my.getAttribute('data-src') !== ic.outerHTML) { my.setAttribute('style', ic.getAttribute('style') || ''); my.innerHTML = ic.innerHTML; my.setAttribute('data-src', ic.outerHTML); }
          /* ۱.۴.۷: رنگ آیکون هر قسمت متفاوت (قبلاً چهار تا آبی‌های نزدیک به هم بودند) */
          var GC = { sections: '#9ee858', accounts: '#ff453a', data: '#4f9dff', reports: '#bf5af2', settings: '#ff9f0a', about: '#aeaeb2' };
          var gk = g.getAttribute('data-g'); if (my && GC[gk]) my.style.setProperty('--c', GC[gk]);
        });
      };
      build();
      /* زیرنویس‌ها وقتی منو پنهان بود اندازه نداشتند: بعد از باز شدن یک بار دیگر جا داده شوند */
      var fitLater = function () { Array.prototype.forEach.call(dd.querySelectorAll('.hk-mgr'), function (row) { var nm = row._hkNeedFit, sm = row.querySelector('small'); if (!nm || !sm.clientWidth) return; row._hkNeedFit = null; sm.textContent = nm.join('، '); for (var n = nm.length; n > 1 && sm.scrollWidth > sm.clientWidth + 1; n--) sm.textContent = nm.slice(0, n - 1).join('، '); }); };
      /* هر بار باز شدن منو: از فهرست قسمت‌ها، با زیرنویس تازه */
      if (typeof window.openSideMenu === 'function' && !window.openSideMenu._hkMg) {
        var o0 = window.openSideMenu;
        /* ۱.۴.۶: باز شدن منو فقط زیرنویس‌ها را تازه می‌کند؛ برگشتن به فهرست قسمت‌ها فقط با دکمهٔ همبرگری (برگشتن از «راهنما»/«انتخاب حساب» هم openSideMenu را صدا می‌زند و نباید قسمت را ببندد) */
        var o1 = function () { try { build(); } catch (e) {} var r = o0.apply(this, arguments); requestAnimationFrame(fitLater); setTimeout(fitLater, 350); return r; };
        o1._hkMg = true; o1.toString = function () { return Function.prototype.toString.call(o0); };
        try { window.openSideMenu = o1; openSideMenu = o1; } catch (eW) {}
      }
      /* بک گوشی داخل یک قسمت: برگشت به فهرست قسمت‌ها (منو باز می‌ماند) */
      var b0 = onBackGuard;
      onBackGuard = function () {
        /* ۱.۴.۶: فقط وقتی هیچ صفحه/پنجره‌ای روی منو باز نیست (تشخیص با همان فهرست لایه‌های خود نرم‌افزار)؛ وگرنه بک مال همان صفحه است */
        try {
          var layers = 0; try { layers = hkLayersShown().length; } catch (eL) { layers = document.querySelector('.hk-page, .modal-overlay.open, .feature-sheet.open') ? 1 : 0; }
          if (!layers && !document.querySelector('.hk-mnav-ghost') && dd.classList.contains('open') && dd.classList.contains('hk-mgv') && exit()) return true;
        } catch (e) {}
        return b0.apply(this, arguments);
      };
      try { var mb = document.getElementById('menuBtn'); if (mb) mb.addEventListener('click', function () { exit(true); }, true); } catch (eMb) {}
      /* ۱.۴.۷: هر بار که منو واقعاً بسته شد، دفعهٔ بعد از فهرست قسمت‌ها شروع شود */
      try { new MutationObserver(function () { if (!dd.classList.contains('open') && dd.classList.contains('hk-mgv')) { var nav = false; try { nav = _hkMenuNavOn || hkMenuChildShown(); } catch (eN) {} if (!nav) exit(true); } }).observe(dd, { attributes: true, attributeFilter: ['class'] }); } catch (eMo) {}
      /* جستجو همیشه روی همهٔ منوها */
      try { var si = document.getElementById('menuSearchInput'); if (si) si.addEventListener('input', function () { exit(true); }); } catch (eS) {}
      try { Object.assign(window, { hkMenuGroupEnter: function (k) { var g = dd.querySelector('.hk-mg[data-g="' + k + '"]'); if (g) { build(); enter(g); } }, hkMenuGroupExit: exit }); } catch (eX) {}
    })();
    /* ۱.۴.۸: بک در صفحهٔ یک رابطهٔ قرض → فهرست روابط (وقتی پنجرهٔ دیگری روی آن نیست) */
    (function () {
      var b0 = onBackGuard;
      onBackGuard = function () {
        try {
          var fs = document.getElementById('featureSheet');
          if (fs && fs.classList.contains('hk-led-rel') && fs.classList.contains('open')) {
            var top = hkLayersShown().filter(function (x) { return x !== fs; });
            if (!top.length && !document.querySelector('.hk-mnav-ghost') && hkLedRelClose()) return true;
          }
        } catch (e) {}
        return b0.apply(this, arguments);
      };
    })();
    /* ===== ۱.۴.۵: مربع آبی «افزودن» گوشهٔ پایین راست صفحه‌ها =====
       جای فیلدهای «… جدید» و «+» بالای قرض/درآمد ثابت و «خرج جدید» دُنگ. فهرست از زیرش رد می‌شود و مربع همیشه رو و قابل لمس است. */
    var HK_FAB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    /* ۱.۴.۶: باکس نام برای مربع افزودن: همیشه بالاترین لایه (روی همان صفحه)، از همان لحظهٔ باز شدن با اندازهٔ «صفحه‌کلید باز» چیده می‌شود (بی‌پرش)،
       راهنمای داخل فیلد همان راهنمای قبلی، و با بک یا زدن بیرون بسته می‌شود */
    function hkFabAsk(label, hint, inputSel, run) {
      var old = document.getElementById('hkFabAsk'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkFabAsk'; ov.className = 'hk-fab-ask'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="hk-fab-ask-box"><div class="hk-fab-ask-t"></div><div class="hk-fab-ask-row"><input type="text" dir="rtl" maxlength="40" enterkeyhint="done" autocomplete="off"><button type="button" class="hk-fab-ask-ok" aria-label="افزودن">' + HK_FAB_SVG + '</button></div></div>';
      ov.querySelector('.hk-fab-ask-t').textContent = label;
      var inp = ov.querySelector('input'); inp.placeholder = hint || label;
      var close = function () { try { inp.blur(); } catch (e) {} ov.remove(); };
      var ok = function () {
        var v = String(inp.value || '').trim(); if (!v) { try { inp.focus(); } catch (e) {} return; }
        close();
        var t = document.querySelector(inputSel); if (t) t.value = v;
        run();
      };
      ov._hkCancel = close;
      ov.addEventListener('pointerdown', function (e) { if (e.target === ov) { e.preventDefault(); e.stopPropagation(); try { hkSwallowTap(); } catch (eS) {} close(); } });
      ov.querySelector('.hk-fab-ask-ok').addEventListener('mousedown', function (e) { e.preventDefault(); });
      ov.querySelector('.hk-fab-ask-ok').onclick = ok;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
      var box = ov.querySelector('.hk-fab-ask-box');
      var place = function () { var fb = 0; try { fb = hkKbFreeBottom(); } catch (e) { fb = innerHeight * 0.58; } box.style.top = Math.max(70, Math.round(fb - box.offsetHeight - 14)) + 'px'; };
      document.body.appendChild(ov); place();
      try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
      setTimeout(place, 350);
    }
    var _hkFabHint = function (sel, def) { var e = document.querySelector(sel); return (e && e.placeholder) || def; };
    function hkFabAction(page) {
      var id = page.id;
      if (id === 'subjectsModal') return { l: 'پروژه جدید', f: function () { hkFabAsk('پروژه جدید', _hkFabHint('#subjectNewName', 'پروژه جدید'), '#subjectNewName', function () { addSubjectFromModal(); }); } };
      if (id === 'savingsModal') return { l: 'پس‌انداز جدید', f: function () { hkSavNewFromField(); } };
      if (id === 'userRemindersModal') return { l: 'یادآور جدید', f: function () { hkUrNewFromField(); } };
      if (id === 'hkDong') {
        var add = page.querySelector('.hk-dg-add');
        if (add) return { l: 'خرج جدید', f: function () { add.click(); } };
        if (page.querySelector('.hk-dg-new')) return { l: 'گروه جدید', f: function () { hkFabAsk('گروه جدید', _hkFabHint('#hkDong .hk-dg-newin', 'گروه جدید'), '#hkDong .hk-dg-newin', function () { var b = document.querySelector('#hkDong .hk-dg-new'); if (b) b.click(); }); } };
        return null;
      }
      if (id === 'featureSheet' && _featureActive === 'ledger' && page.classList.contains('hk-led-rel')) { var rb = page.querySelector('.section.hk-lrel .ledger-add-row'); return rb ? { l: 'ردیف جدید', f: function () { rb.click(); } } : null; }
      if (id === 'featureSheet' && page.classList.contains('open') && (_featureActive === 'ledger' || _featureActive === 'recurring')) return { l: _featureActive === 'ledger' ? 'رابطهٔ جدید' : 'درآمد ثابت جدید', f: function () { featureSheetAdd(); } };
      return null;
    }
    function hkFabSync(page) {
      if (!page) return;
      var act = hkFabAction(page), fab = page.querySelector(':scope > .hk-fab');
      /* classList.add/remove حتی بی تغییر هم رکورد تغییر می‌سازد ← فقط وقتی لازم است */
      if (!act) { if (fab) fab.remove(); if (page.classList.contains('hk-fab-on')) page.classList.remove('hk-fab-on'); return; }
      if (!fab) {
        fab = document.createElement('button'); fab.type = 'button'; fab.className = 'hk-fab'; fab.innerHTML = HK_FAB_SVG;
        fab.addEventListener('click', function (e) { e.stopPropagation(); var a = hkFabAction(page); if (a) a.f(); });
        page.appendChild(fab);
      }
      if (fab.getAttribute('aria-label') !== act.l) fab.setAttribute('aria-label', act.l);
      if (!page.classList.contains('hk-fab-on')) page.classList.add('hk-fab-on');
    }
    try { window.hkFabSync = hkFabSync; } catch (eFw) {}
    /* برگهٔ قرض/درآمد ثابت با عوض شدن تب */
    (function () {
      var fs = document.getElementById('featureSheet'); if (!fs) return;
      try { new MutationObserver(function () { try { hkFabSync(fs); } catch (e) {} }).observe(fs, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true }); } catch (eM) {}
    })();
    /* ===== ۱.۴.۶: پاک‌کنِ تصویرهای ورق خوردن =====
       تصویر (کپی) صفحه برای انیمیشن باز/بسته شدن ساخته و بعد پاک می‌شود. اگر نرم‌افزار وسط انیمیشن به پس‌زمینه رفت، ممکن بود پاک نشود
       و تکه‌ای از صفحهٔ قبلی (مثلاً یادآور) روی صفحهٔ اصلی و منو بماند. هر کپی‌ای که انیمیشنش تمام شده و بیش از ۰٫۹ ثانیه مانده پاک می‌شود. */
    (function () {
      var SEL = '.hk-mnav-ghost, .st-turn-ghost';
      var sweep = function (all) {
        try {
          Array.prototype.forEach.call(document.querySelectorAll(SEL), function (g) {
            var now = Date.now(); if (!g._hkBorn) g._hkBorn = now;
            var running = false; try { running = g.getAnimations({ subtree: false }).some(function (a) { return a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity; }); } catch (e) {}
            if (all || (!running && now - g._hkBorn > 900) || now - g._hkBorn > 3000) { try { g.remove(); } catch (eR) {} }
          });
        } catch (e) {}
      };
      setInterval(function () { sweep(false); }, 600);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sweep(true); });
      try { window.hkGhostSweep = sweep; } catch (eW) {}
    })();
