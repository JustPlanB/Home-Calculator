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
      if (txt && !stack.length) { stack.push(txt); tEl.textContent = txt; }
      else if (txt && tEl.textContent !== txt) {
        var prevIx = stack.indexOf(txt);
        if (prevIx >= 0) stack.length = prevIx + 1;
        else {
          /* زیرصفحهٔ تازه در همان صفحه: ورق خوردن */
          if (page.classList.contains('hk-page') && !page._hkPgNoAnim) {
            try { box.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }); } catch (eA) {}
          }
          stack.push(txt);
        }
        tEl.textContent = txt;
      }
      page.classList.add('hk-pg-has-hd');
      if (!page._hkPgObs) {
        var pend = 0;
        page._hkPgObs = new MutationObserver(function () {
          if (pend) return;
          pend = requestAnimationFrame(function () { pend = 0; if (page.classList.contains('hk-page')) hkPageDecorate(page); });
        });
        page._hkPgObs.observe(page, { childList: true, subtree: true, characterData: true });
      }
    }
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
      var fb = document.getElementById('featureSheetBody'); if (!fb) return;
      var secs = Array.prototype.filter.call(list.children, function (x) { return x.classList && x.classList.contains('section'); });
      var sum = pl.querySelector('.ledger-summary'), flt = document.getElementById('ledgerFilters');
      var fbr = fb.getBoundingClientRect(), lr = list.getBoundingClientRect();
      var below = 0;
      [flt, sum].forEach(function (el) { if (el && el.getClientRects().length) { var cs = getComputedStyle(el); below += el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0); } });
      var sb = 0; try { sb = homeSafeBottom(); } catch (eSb) {}
      var listH = Math.floor(fbr.bottom - lr.top - below - sb - 12);
      if (!(listH > 120)) return;
      list.style.setProperty('max-height', listH + 'px', 'important');
      /* یک باکس رابطهٔ بسته (با فاصله‌اش) */
      var closed = secs.filter(function (s) { return s.classList.contains('collapsed') && !s.classList.contains('hk-led-closing'); })[0] || secs[0];
      var secH = 74;
      if (closed) { var hd = closed.querySelector('.section-header'), cs0 = getComputedStyle(closed); secH = (hd ? hd.offsetHeight : 64) + (parseFloat(cs0.marginTop) || 0) + (parseFloat(cs0.marginBottom) || 0) + (parseFloat(cs0.paddingTop) || 0) + (parseFloat(cs0.paddingBottom) || 0); }
      var k = Math.min(4, Math.max(1, secs.length));
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
        var fsO = new MutationObserver(later); var fsEl = document.getElementById('featureSheet'); if (fsEl) fsO.observe(fsEl, { attributes: true, attributeFilter: ['class'] });
      } catch (eMo) {}
      window.addEventListener('resize', later);
      try { window.hkLedPageFit = hkLedPageFit; } catch (eX) {}
    })();
    /* ۱.۴.۰: کشیدن افقی هم در «خروجی آرشیو درآمدهای ثابت» (اکسل / PDF) و هم در باکس ویرایش ردیف (پرداخت/دریافت شده ↔ نشده) */
    try { HK_SWIPE_TABS += ', .hk-rax-kind, .hk-re-stseg'; } catch (eSw) {}
