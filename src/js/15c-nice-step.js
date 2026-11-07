    /* ===== اسلایدر بازهٔ مبلغ (جستجو) =====
       درجه‌ها خودکار: ۰ و عددهای گرد تا top؛ top = کوچک‌ترین عدد گردِ ≥ صدک ۹۵ مبلغ ردیف‌های کاربر (حداقل ۱ میلیون).
       فاصلهٔ درجه‌ها برابر و نگاشت داخل هر بخش خطی؛ گام هر بخش گرد (۱/۲/۲٫۵/۵×۱۰^k). ۰ سمت چپ محور.
       دستگیرهٔ «از» روی ۰ = بی‌حداقل، دستگیرهٔ «تا» روی انتها = «و بیشتر» (بی‌حداکثر). */
    var HK_AR_NICE = [100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
    function hkNiceStep(x) {
      if (!(x > 0)) return 1;
      var k = Math.pow(10, Math.floor(Math.log10(x))), m = x / k, best = 1;
      [1, 2, 2.5, 5, 10].forEach(function (c) { if (Math.abs(c - m) < Math.abs(best - m)) best = c; });
      return best * k;
    }
    function hkAmtRangeTicks() {
      var vals = [];
      try { iterAllPeriodData(function (pd) { ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) { ((sec && sec.rows) || []).forEach(function (r) { var a = r && !r.deletedAt ? Math.abs(Number(r.amount) || 0) : 0; if (a > 0) vals.push(a); }); }); }); }); } catch (e) {}
      vals.sort(function (a, b) { return a - b; });
      var p95 = vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.95))] : 0;
      var need = Math.max(p95, 1000000), top = HK_AR_NICE[HK_AR_NICE.length - 1];
      for (var i = 0; i < HK_AR_NICE.length; i++) if (HK_AR_NICE[i] >= need) { top = HK_AR_NICE[i]; break; }
      var ticks = [0].concat(HK_AR_NICE.filter(function (v) { return v <= top; }));
      /* بیشتر از ۸ درجه جا نمی‌شود: درجه‌های کوچک کنار می‌روند */
      while (ticks.length > 7) ticks.splice(1, 1);
      return ticks;
    }
    function hkArValueAt(ticks, f) {
      var n = ticks.length - 1; if (f <= 0) return 0; if (f >= 1) return ticks[n];
      var seg = Math.min(n - 1, Math.floor(f * n)), t0 = ticks[seg], t1 = ticks[seg + 1], loc = f * n - seg;
      var st = hkNiceStep((t1 - t0) / 10), v = t0 + Math.round(loc * (t1 - t0) / st) * st;
      return Math.max(t0, Math.min(t1, v));
    }
    function hkArFracOf(ticks, v) {
      var n = ticks.length - 1; if (!(v > 0)) return 0; if (v >= ticks[n]) return 1;
      for (var i = 0; i < n; i++) if (v <= ticks[i + 1]) return (i + (v - ticks[i]) / (ticks[i + 1] - ticks[i])) / n;
      return 1;
    }
    function hkArShort(v) {
      var u = v >= 1e9 ? [1e9, 'میلیارد'] : v >= 1e6 ? [1e6, 'میلیون'] : v >= 1e3 ? [1e3, 'هزار'] : [1, ''];
      var x = Math.round(v / u[0] * 100) / 100;
      return { n: toPersianDigits(String(x)).replace('.', '٫'), u: u[1] };
    }
    var HK_AR_SHIELD = '<svg viewBox="0 0 22 26" aria-hidden="true"><path d="M2 8.5Q2 2 8.5 2h5Q20 2 20 8.5V14L11 24.5 2 14Z" fill="#08b5f5" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    function hkAmtRangeSync() {
      var host = document.getElementById('balanceAmtRange'); if (!host) return;
      var mnI = document.getElementById('balanceSearchAmtMin'), mxI = document.getElementById('balanceSearchAmtMax'); if (!mnI || !mxI) return;
      var ticks = hkAmtRangeTicks(), sig = ticks.join(',');
      if (host._sig !== sig) {
        host._sig = sig; host._ticks = ticks; host._tw = 0;
        var n = ticks.length - 1;
        host.innerHTML = '<div class="hk-ar-ticks">' + ticks.map(function (t, i) {
          var sh = hkArShort(t), left = i / n * 100;
          return '<span class="hk-ar-tick' + (i === 0 || i === n ? ' hk-ar-end' : '') + '" style="left:' + left + '%">' + (i === n ? '<bdi dir="ltr">+' + sh.n + '</bdi>' : sh.n) + (sh.u ? '<small>' + sh.u + '</small>' : '') + '</span>';
        }).join('') + '</div><div class="hk-ar-track"><div class="hk-ar-fill"></div></div>' +
          '<button type="button" class="hk-ar-h" data-k="min" aria-label="مبلغ از">' + HK_AR_SHIELD + '</button><button type="button" class="hk-ar-h" data-k="max" aria-label="مبلغ تا">' + HK_AR_SHIELD + '</button>' +
          '<span class="hk-ar-val" data-k="min"></span><span class="hk-ar-val" data-k="max"></span>';
        hkAmtRangeBind(host);
      }
      if (host._drag) return;
      var a = 0, b = 0;
      try { a = parseAmount(mnI.value || '') || 0; b = parseAmount(mxI.value || '') || 0; } catch (e) {}
      var fa = hkArFracOf(host._ticks, a), fb = b > 0 ? hkArFracOf(host._ticks, b) : 1;
      if (fb < fa) fb = fa;
      hkAmtRangePaint(host, fa, fb);
    }
    function hkAmtRangePaint(host, fa, fb) {
      host._fa = fa; host._fb = fb;
      var ticks = host._ticks, top = ticks[ticks.length - 1];
      var xa = fa * 100, xb = fb * 100;
      var fill = host.querySelector('.hk-ar-fill'); if (fill) { fill.style.left = xa + '%'; fill.style.right = (100 - xb) + '%'; }
      var hs = host.querySelectorAll('.hk-ar-h'), vs = host.querySelectorAll('.hk-ar-val');
      if (hs[0]) hs[0].style.left = xa + '%'; if (hs[1]) hs[1].style.left = xb + '%';
      var lab = function (f, isMax) {
        if (isMax && f >= 1) { var t = hkArShort(top); return t.n + ' ' + t.u + ' و بیشتر'; }
        var v = hkArValueAt(ticks, f); if (!v) return '۰'; var s2 = hkArShort(v); return s2.n + (s2.u ? ' ' + s2.u : '');
      };
      var la = lab(fa, false), lb = lab(fb, true);
      /* متن فقط اگر عوض شده (وگرنه MutationObserver فیلترها بی‌دلیل دوباره اجرا می‌شود) */
      var put = function (el, t) { if (el.textContent !== t || el.childElementCount) el.textContent = t; };
      /* ۱.۳.۳۹: برچسب یکی‌شده هم‌جهت با محور (چپ = کمتر، راست = بیشتر): ردیف flex چپ‌به‌راست، هر طرف راست‌به‌چپ */
      var putRange = function (el, a, b) {
        var h = a === b ? escapeHtml(a) : '<span class="hk-ar-rg"><span>' + escapeHtml(a) + '</span><span>–</span><span>' + escapeHtml(b) + '</span></span>';
        if (el.innerHTML !== h) el.innerHTML = h;
      };
      var setVis = function (el, v) { var x = v ? '' : 'hidden'; if (el.style.visibility !== x) el.style.visibility = x; };
      var W = host.clientWidth;
      var clampEl = function (el) {
        if (!W || el.style.display === 'none') return;
        var c = parseFloat(el.style.left) / 100 * W, hw = el.offsetWidth / 2, lo = hw - 12, hi = W - hw + 12;
        if (c < lo) el.style.left = (lo / W * 100) + '%'; else if (c > hi) el.style.left = (hi / W * 100) + '%';
      };
      var hit = function (a, b, g) { if (!a || !b) return false; var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width > 0 && rb.width > 0 && ra.left < rb.right + g && rb.left < ra.right + g; };
      /* دستگیره روی اول/آخر محور: عدد بالایش نمی‌آید (درجهٔ همان سر، زیر محور، نشان‌دهنده‌اش است) */
      var showA = fa > 0.001, showB = fb < 0.999;
      vs[1].style.display = '';
      vs[0].style.left = xa + '%'; put(vs[0], la); setVis(vs[0], showA);
      vs[1].style.left = xb + '%'; put(vs[1], lb); setVis(vs[1], showB);
      clampEl(vs[0]); clampEl(vs[1]);
      var merge = W ? (showA && showB && hit(vs[0], vs[1], 8)) : (showA && showB && fb - fa < 0.24);
      if (merge) {
        /* دو دستگیرهٔ نزدیک: یک برچسب «از – تا» وسطشان */
        vs[0].style.left = ((xa + xb) / 2) + '%'; putRange(vs[0], la, lb); setVis(vs[0], true); vs[1].style.display = 'none';
        clampEl(vs[0]);
      }
      /* درجه‌های زیر محور: اگر جا نیست درجه‌های میانی یکی در میان پنهان؛ اول و آخر همیشه می‌مانند */
      if (W && host._tw !== W) {
        host._tw = W;
        var all = [].slice.call(host.querySelectorAll('.hk-ar-tick')), lastEnd = all[all.length - 1], last = null;
        all.forEach(function (t) { t.classList.remove('hk-ar-thin', 'hk-ar-off'); });
        var endR = lastEnd ? lastEnd.getBoundingClientRect() : null;
        all.forEach(function (t, i) {
          var r = t.getBoundingClientRect();
          if (i === 0 || t === lastEnd) { last = r; return; }
          if ((last && r.left < last.right + 6) || (endR && r.right > endR.left - 6)) t.classList.add('hk-ar-thin'); else last = r;
        });
      }
    }
    function hkAmtRangeBind(host) {
      host.querySelectorAll('.hk-ar-h').forEach(function (h) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          try { h.setPointerCapture(e.pointerId); } catch (eC) {}
          var k = h.getAttribute('data-k'), r = host.getBoundingClientRect();
          host._drag = k; h.classList.add('drag');
          try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (eB) {}
          var move = function (ev) {
            var f = (ev.clientX - r.left) / r.width; f = Math.max(0, Math.min(1, f));
            var fa = host._fa, fb = host._fb;
            if (k === 'min') fa = Math.min(f, fb); else fb = Math.max(f, fa);
            /* هم‌قدم با گام گرد: دستگیره روی همان مقداری می‌نشیند که در باکس نوشته می‌شود */
            var snap = function (x, isMax) { if (x <= 0 || x >= 1) return x; var v = hkArValueAt(host._ticks, x); return v >= host._ticks[host._ticks.length - 1] && isMax ? 1 : hkArFracOf(host._ticks, v); };
            fa = snap(fa, false); fb = snap(fb, true);
            if (fb < fa) { if (k === 'min') fa = fb; else fb = fa; }
            hkAmtRangePaint(host, fa, fb);
            var id = k === 'min' ? 'balanceSearchAmtMin' : 'balanceSearchAmtMax', inp = document.getElementById(id);
            var fv = k === 'min' ? fa : fb, val = k === 'min' ? (fv <= 0 ? '' : formatNum(hkArValueAt(host._ticks, fv))) : (fv >= 1 ? '' : formatNum(hkArValueAt(host._ticks, fv)));
            if (inp && inp.value !== val) { inp.value = val; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          };
          var up = function () {
            host._drag = null; h.classList.remove('drag');
            h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          };
          h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        });
      });
    }
    (function () {
      var raf = 0, run = function () { raf = 0; try { bsrSyncFilterLabels(); } catch (e) {} };
      var queue = function () { if (!raf) raf = requestAnimationFrame(run); };
      var init = function () {
        var h = document.getElementById('balanceFixedHeader'); if (!h || h._bsrObs) return;
        h._bsrObs = new MutationObserver(queue);
        h._bsrObs.observe(h, { childList: true, subtree: true, characterData: true });
        h.addEventListener('input', queue, true);
        h.addEventListener('change', queue, true);
        /* «C» داخل باکس مبلغ: عدد پاک و جستجو به‌روز */
        /* زدن ضربدر شرح: فیلد فوکوسش را از دست ندهد (کیبورد بسته نشود) */
        /* ۱.۳.۳۷: در اندروید preventDefault روی touchstart کلیک را از بین می‌برد؛ پس پاک کردن روی touchend انجام می‌شود
           (touchstart فقط جلوی بسته شدن کیبورد را می‌گیرد) و کلیک برای ماوس/لمس‌های دیگر می‌ماند */
        var clearDesc = function () {
          var di = document.getElementById('balanceSearchInput');
          /* پاک کردن + فوکوس روی همان فیلد تا کیبورد بالا بیاید (یا بالا بماند) */
          if (di) { di.value = ''; di.dispatchEvent(new Event('input', { bubbles: true })); try { di.focus({ preventScroll: true }); } catch (eF2) { try { di.focus(); } catch (eF3) {} } }
          queue();
        };
        var onClr = function (e) { return e.target && e.target.closest && e.target.closest('.bs-desc-clr'); };
        h.addEventListener('touchstart', function (e) { if (onClr(e)) e.preventDefault(); }, { passive: false });
        h.addEventListener('touchend', function (e) { if (onClr(e)) { e.preventDefault(); e.stopPropagation(); clearDesc(); } }, { passive: false });
        h.addEventListener('mousedown', function (e) { if (onClr(e)) e.preventDefault(); });
        h.addEventListener('click', function (e) {
          if (onClr(e)) { e.preventDefault(); e.stopPropagation(); clearDesc(); return; }
          var b = e.target && e.target.closest && e.target.closest('.bs-amt-clr'); if (!b) return;
          e.preventDefault(); e.stopPropagation();
          var i = document.getElementById(b.getAttribute('data-for')); if (!i) return;
          i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true }));
          try { i.focus({ preventScroll: true }); } catch (eF) {}
          queue();
        });
        /* «تأیید» کیبورد روی مبلغ: فقط کیبورد بسته شود */
        ['balanceSearchAmtMin', 'balanceSearchAmtMax'].forEach(function (id) { var i = document.getElementById(id); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } }); });
        queue();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
      setTimeout(init, 800);
    })();
    /* ===== ۱.۳.۳۸: جمع و باز شدن کادر جستجو با اسکرول =====
       جمع: نتیجه هست، اسکرول رو به پایین (صفحه یا جدول بلند) و بعد از جمع شدن هنوز جا برای اسکرول هست (وگرنه باز/بسته پشت سر هم).
       باز: برگشت به بالای همه‌چیز. در طول انیمیشن تصمیم تازه گرفته نمی‌شود. */
    /* ۱.۳.۶۶: از نو: فقط یک ناحیهٔ اسکرول (balanceScrollBody) و کادر فیلترها بیرون از آن.
       جمع: نتیجه هست، اسکرول رو به پایین و بعد از جمع شدن هنوز جای اسکرول هست (وگرنه باز/بسته پشت سر هم).
       باز: برگشت به بالای ناحیه یا زدن فلش. جمع شدن کادر جای نوشته‌های داخل ناحیه را عوض نمی‌کند (اسکرول نمی‌پرد). */
    var hkSearchCollapse = (function () {
      var st = { c: false, lock: 0, last: 0 };
      var hdr = function () { return document.getElementById('balanceFixedHeader'); };
      var scroller = function () { return document.getElementById('balanceScrollBody'); };
      function set(c) {
        var h = hdr(); if (!h) return;
        if (st.c === c) return;
        st.c = c; st.lock = performance.now() + 680;
        /* ارتفاع واقعی هر بخش → انیمیشن از/تا همان اندازه؛ بعد از باز شدن سقف برداشته می‌شود */
        var parts = [].slice.call(h.querySelectorAll('.bs-search-head, .bsr-grid > .bsr-cell:not(.bsr-desc)'));
        parts.forEach(function (el) { el.style.maxHeight = el.scrollHeight + 'px'; });
        h.classList.add('bsr-anim');
        void h.offsetHeight;
        clearTimeout(st.t);
        st.t = setTimeout(function () {
          if (!st.c) { parts.forEach(function (el) { el.style.maxHeight = ''; }); }
          h.classList.remove('bsr-anim');
          /* اگر در طول انیمیشن به بالا برگشته بود (رویداد اسکرولش نادیده ماند)، همین حالا باز شود */
          setTimeout(function () { var sc = scroller(); if (st.c && sc && sc.scrollTop <= 2) set(false); }, 60);
        }, 650);
        h.classList.toggle('bsr-collapsed', c);
        if (c) { try { document.querySelectorAll('.dark-select-list.open, .fancy-select-list.open').forEach(function (l) { l.classList.remove('open'); }); document.querySelectorAll('.fancy-select-wrap.is-open').forEach(function (w) { w.classList.remove('is-open'); }); } catch (e) {} }
      }
      /* فهرست کوتاه جمع نمی‌شود: بعد از جمع شدن کادر (که ناحیه به همان اندازه بلندتر می‌شود) باید هنوز جای اسکرول بماند */
      function longEnough(sc) {
        var h = hdr(); if (!h) return false;
        var desc = h.querySelector('.bsr-desc'), shrink = Math.max(0, h.offsetHeight - (desc ? desc.offsetHeight : 0) - 30);
        return sc.scrollHeight - sc.clientHeight > shrink + 40;
      }
      function onScroll(e) {
        var sc = scroller();
        if (!sc || !e || e.target !== sc) return;
        if (!document.body.classList.contains('search-open')) { set(false); return; }
        var top = sc.scrollTop, down = top > st.last;
        st.last = top;
        if (performance.now() < st.lock) return;
        if (!st.c) {
          if (!down || top <= 6 || !document.querySelector('#search-result-body tr:not(.sr-wait)')) return;
          if (!longEnough(sc)) return;
          set(true);
        } else if (top <= 2) set(false);
      }
      document.addEventListener('scroll', onScroll, true);
      document.addEventListener('click', function (e) {
        var b = e.target && e.target.closest && e.target.closest('#balanceFixedHeader .bsr-handle'); if (!b) return;
        var sc = scroller(); if (!sc) return;
        try { sc.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e2) { sc.scrollTop = 0; }
        setTimeout(function () { set(false); }, 360);
      });
      return set;
    })();
    /* ===== سرچ باکس: جستجوی شرح در همهٔ ماه‌ها (با فیلتر بخش و حساب همین صفحه) ===== */
    /* دسته و بازهٔ زمانی جستجو */
    function bsCatOf(r) {
      try { var c = HKCategorizer.classify(r.desc, r); return c ? (c.ids || [c.id]) : []; } catch (e) { return []; }
    }
    /* «ماه» جستجو: ماه‌های سالی که در منوی اصلی انتخاب شده؛ «همهٔ ماه‌ها» = همهٔ ماه‌های همان سال */
    function bsInRange(range, y, m) {
      if (!range || range === 'all') return y === currentYear;
      if (/^\d+$/.test(String(range))) return y === currentYear && m === parseInt(range, 10);
      var t = getTodayPersian(), tk = t.y * 12 + t.m, k = y * 12 + m;
      if (range === 'month') return y === t.y && m === t.m;
      if (range === '3m') return k <= tk && k > tk - 3;
      if (range === 'year') return y === t.y;
      return true;
    }
    /* جدول ماه‌ها (همهٔ ماه‌ها): ماه / درآمد / مخارج / مانده با جمع سال؛ فقط ماه‌های دارای تراکنش؛ زدن ماه = فیلتر همان ماه */
    /* جدول بلند: ارتفاع کادر = عنوان ستون‌ها + ۱۱ ردیف اول (+ جمع پایین)؛ بقیه داخل جدول اسکرول؛ ردیف‌های جمع پایین چسبان */
    function hkFit11(sc) {
      if (!sc) return;
      try {
        var t = sc.querySelector('table'); if (!t) return;
        var th = t.tHead ? t.tHead.getBoundingClientRect().height : 0, rows = t.tBodies[0] ? t.tBodies[0].rows : [], h = 0;
        for (var i = 0; i < rows.length && i < 11; i++) h += rows[i].getBoundingClientRect().height;
        var fr = t.tFoot ? [].slice.call(t.tFoot.rows) : [], fh = 0;
        for (var k = fr.length - 1; k >= 0; k--) fh += fr[k].getBoundingClientRect().height;
        /* ردیف‌های جمع چسبان: هر ردیف بالای ردیف‌های جمعِ زیرش می‌نشیند */
        var acc = 0;
        for (var q = fr.length - 1; q >= 0; q--) {
          [].forEach.call(fr[q].cells, function (c) { c.style.bottom = acc + 'px'; });
          acc += fr[q].getBoundingClientRect().height;
        }
        /* ۱.۳.۶۶: داخل منوی جستجو جدول اسکرول داخلی ندارد (کل ناحیهٔ نتیجه یک اسکرول است) */
        var on = rows.length > 11 && !(sc.closest && sc.closest('#panel-balance'));
        sc.classList.toggle('on', on);
        sc.style.maxHeight = on ? Math.ceil(th + h + fh + 2) + 'px' : 'none';
      } catch (e) {}
    }
    function bsRenderMonthSummary(list, rangeF) {
      var box = document.getElementById('searchMonthSummary');
      if (!box) {
        var host = document.getElementById('searchResultBox'); if (!host) return;
        box = document.createElement('div'); box.id = 'searchMonthSummary'; box.className = 'summary-section';
        host.parentNode.insertBefore(box, host);
      }
      if (rangeF !== 'all') { box.style.display = 'none'; box.innerHTML = ''; return; }
      var by = {}, ti = 0, te = 0;
      list.forEach(function (it) { var b = by[it.m] || (by[it.m] = { i: 0, e: 0 }); if (it.tab === 'income') { b.i += it.amount; ti += it.amount; } else { b.e += it.amount; te += it.amount; } });
      var ms = Object.keys(by).map(Number).sort(function (a, b) { return a - b; });
      var net = function (v) { return '<bdi dir="ltr" class="' + (v < 0 ? 'bs-ce' : 'bs-ci') + '">' + (v < 0 ? '−' : '') + formatNum(Math.abs(v)) + '</bdi>'; };
      var html = '<div class="summary-header balance-h">ماه‌های ' + toPersianDigits(String(currentYear)) + '</div><div class="hk-scroll11"><table class="summary-table bs-month-table"><thead><tr><th>ماه</th><th>درآمد</th><th>مخارج</th><th>مانده</th></tr></thead><tbody>';
      if (!ms.length) html += '<tr class="sr-wait"><td colspan="4">در این سال ردیفی نیست</td></tr>';
      ms.forEach(function (m) { var b = by[m]; html += '<tr class="bs-mrow" data-m="' + m + '"><td class="bs-mname">' + MONTHS[m - 1] + '</td><td class="bs-ci">' + formatNum(b.i) + '</td><td class="bs-ce">' + formatNum(b.e) + '</td><td>' + net(b.i - b.e) + '</td></tr>'; });
      html += '</tbody>' + (ms.length ? '<tfoot><tr class="bs-mtotal"><td>جمع سال</td><td class="bs-ci">' + formatNum(ti) + '</td><td class="bs-ce">' + formatNum(te) + '</td><td>' + net(ti - te) + '</td></tr></tfoot>' : '') + '</table></div>';
      box.innerHTML = html; box.style.display = '';
      /* جدول ماه‌ها حداکثر ۱۲ ماه است: همه دیده می‌شود (بی اسکرول داخلی) */
      box._list = list;
      box.querySelectorAll('.bs-mrow').forEach(function (tr) {
        tr.onclick = function () { bsOpenMonthDetail(parseInt(tr.getAttribute('data-m'), 10), box._list || []); };
      });
    }
    /* پنجرهٔ جزئیات یک ماه (با فیلترهای فعلی): جمع درآمد/مخارج/مانده، ردیف‌ها به ترتیب روز، جمع هر دستهٔ مخارج.
       بک اندروید یا دکمهٔ بازگشت = برگشت به منوی جستجو */
    function bsCloseMonthDetail() { var o = document.getElementById('bsMonthDetail'); if (!o) return false; o.remove(); return true; }
    function bsOpenMonthDetail(m, list) {
      bsCloseMonthDetail();
      var rows = list.filter(function (it) { return it.m === m && it.y === currentYear; }).sort(function (a, b) { return a.d - b.d; });
      var inc = rows.filter(function (it) { return it.tab === 'income'; }), exp = rows.filter(function (it) { return it.tab === 'expense'; });
      var si = inc.reduce(function (a, it) { return a + it.amount; }, 0), se = exp.reduce(function (a, it) { return a + it.amount; }, 0);
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var tbl = function (arr, cls, ttl) {
        if (!arr.length) return '<div class="hk-tframe"><div class="bmd-ttl">' + ttl + '</div><div class="hk-bulk-hint" style="text-align:center;padding:10px">ردیفی نیست</div></div>';
        return '<div class="hk-tframe"><div class="bmd-ttl">' + ttl + '</div><div class="hk-scroll11"><table class="summary-table"><colgroup><col style="width:17%"><col><col style="width:32%"></colgroup><thead><tr><th>روز</th><th>شرح</th><th>مبلغ</th></tr></thead><tbody>' + arr.map(function (it, i) {
          return '<tr><td>' + (it.d ? p2(it.d) : '—') + '</td><td class="bmd-desc" data-i="' + cls + i + '">' + escapeHtml(it.desc || '—') + '</td><td class="' + cls + '">' + formatNum(it.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      };
      var cats = {};
      exp.forEach(function (it) { var ids = []; try { ids = bsCatOf(it.row); } catch (e) {} var id = ids[0] || '__none__'; cats[id] = (cats[id] || 0) + it.amount; });
      var catLbl = function (id) { if (id === '__none__') return 'بدون دسته'; var c = (HKCategorizer.categories || []).find(function (x) { return x.id === id; }); return c ? c.label : id; };
      var catKeys = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
      var catHtml = catKeys.length ? '<div class="hk-tframe"><div class="bmd-ttl">جمع هر دسته</div><div class="hk-scroll11"><table class="summary-table bmd-cats"><colgroup><col><col style="width:38%"></colgroup><thead><tr><th>دسته</th><th>جمع مخارج</th></tr></thead><tbody>' + catKeys.map(function (id) { return '<tr><td class="bmd-cname">' + escapeHtml(catLbl(id)) + '</td><td class="bs-ce">' + formatNum(cats[id]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '';
      var net = si - se;
      var o = document.createElement('div'); o.id = 'bsMonthDetail';
      o.innerHTML = '<div class="bmd-head"><button type="button" class="bmd-back" aria-label="بازگشت">›</button><div class="bmd-title">جزئیات ' + MONTHS[m - 1] + ' ' + toPersianDigits(String(currentYear)) + '</div></div>' +
        '<div class="bmd-body bs-month-table">' +
          '<div class="bmd-sum"><div>درآمد<b class="bs-ci">' + formatNum(si) + '</b></div><div>مخارج<b class="bs-ce">' + formatNum(se) + '</b></div><div>مانده<b class="' + (net < 0 ? 'bs-ce' : 'bs-ci') + '"><bdi dir="ltr">' + (net < 0 ? '−' : '') + formatNum(Math.abs(net)) + '</bdi></b></div></div>' +
          tbl(inc, 'bs-ci', 'درآمدها (' + toPersianDigits(String(inc.length)) + ')') +
          tbl(exp, 'bs-ce', 'مخارج (' + toPersianDigits(String(exp.length)) + ')') +
          catHtml +
        '</div>';
      document.body.appendChild(o);
      o.querySelectorAll('.hk-scroll11').forEach(hkFit11);
      o.querySelector('.bmd-back').onclick = bsCloseMonthDetail;
      o.querySelectorAll('td.bmd-desc').forEach(function (td) { td.onclick = function (e) { e.stopPropagation(); try { var pp = showCellTextPopup(td, td.textContent); if (pp) pp.style.zIndex = '100400'; } catch (eP) {} }; });
    }
    /* «واریز»: دسته‌بندی فقط مال مخارج است، پس منوی دسته غیرفعال می‌شود */
    function bsSyncTypeCat() {
      var ty = (document.getElementById('balanceSearchType') || {}).value || '';
      var cat = document.getElementById('balanceSearchCat');
      if (!cat) return;
      var off = ty === 'income';
      if (off && cat.value) cat.value = '';
      cat.disabled = off;
      var w = cat.closest ? cat.closest('.bsr-cell') : null;
      if (w) w.classList.toggle('bsr-off', off);
      try { if (cat._fancyRender) cat._fancyRender(); } catch (e) {}
    }
    /* فهرست دسته‌ها با تعداد ردیف‌های مخارج (فقط دسته‌هایی که ردیف دارند) */
    function bsFillCategories() {
      var sel = document.getElementById('balanceSearchCat');
      if (!sel) return;
      var keep = sel.value, counts = {}, none = 0;
      var range = (document.getElementById('balanceSearchRange') || {}).value || 'all';
      var curKey = periodKey(currentYear, currentMonth);
      iterAllPeriodData(function (pd, key) {
        if (key === curKey && pd !== periodData) return;
        var parts = String(key).split('-'), y = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
        if (!bsInRange(range, y, m)) return;
        ((pd.expense && pd.expense.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
            if (isPreAppPlanRow(r, y, m) || isFuturePlanRow(r, y, m)) return;
            var ids = bsCatOf(r);
            if (!ids.length) none++;
            ids.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
          });
        });
      });
      var html = '<option value="">همهٔ دسته‌ها</option>';
      (HKCategorizer.categories || []).forEach(function (c) {
        if (counts[c.id]) html += '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + ' (' + toPersianDigits(String(counts[c.id])) + ')</option>';
      });
      if (none) html += '<option value="__none__">بدون دسته (' + toPersianDigits(String(none)) + ')</option>';
      if (sel._bsHtml !== html) {
        sel.innerHTML = html; sel._bsHtml = html;
        sel.value = [].some.call(sel.options, function (o) { return o.value === keep; }) ? keep : '';
        try { if (sel._fancyRender) sel._fancyRender(); } catch (e) {}
      }
    }
    function renderBalanceSearch() {
      var inp = document.getElementById('balanceSearchInput');
      var boxR = document.getElementById('searchResultBox');
      var body = document.getElementById('search-result-body');
      var foot = document.getElementById('search-result-foot');
      if (!inp || !boxR || !body) return;
      var norm = (typeof HKCategorizer !== 'undefined') ? HKCategorizer.normalize : function (x) { return String(x || '').trim(); };
      var q = norm(inp.value);
      try { bsFillCategories(); } catch (eBs) {}
      var typeF = (document.getElementById('balanceSearchType') || {}).value || '';
      var catF = typeF === 'income' ? '' : ((document.getElementById('balanceSearchCat') || {}).value || '');
      var rangeF = (document.getElementById('balanceSearchRange') || {}).value || 'all';
      var dayF0 = 0;
      try { dayF0 = parseInt(toEnglishDigits((document.getElementById('balanceDayFilter') || {}).value || '').replace(/[^0-9]/g, '') || '0', 10) || 0; } catch (eD0) {}
      var sb = document.getElementById('balanceScrollBody');
      var balSec = sb ? sb.querySelector(':scope > .summary-section:not(#dayDetailBox):not(#searchResultBox):not(#searchMonthSummary)') : null;
      var hint = sb ? sb.querySelector(':scope > .balance-hint') : null;
      var dayBoxEl = document.getElementById('dayDetailBox');
      /* منوی جستجو فقط یک جدول دارد: «نتیجهٔ جستجو» با همهٔ فیلترها (بدون فیلتر = همهٔ ردیف‌ها) */
      if (balSec) balSec.style.display = 'none';
      if (hint) hint.style.display = 'none';
      if (dayBoxEl) dayBoxEl.style.display = 'none';
      /* روز انتخاب‌شده: فقط نتایج همان روز از ماه جاری */
      var dayF = dayF0;
      var accF = (typeof balanceSelectedAccount !== 'undefined' ? (balanceSelectedAccount || '') : '').trim();
      /* بازهٔ مبلغ (از / تا؛ هر کدام خالی = بی‌حد) */
      var amtMin = 0, amtMax = 0;
      try { amtMin = parseAmount((document.getElementById('balanceSearchAmtMin') || {}).value || '') || 0; amtMax = parseAmount((document.getElementById('balanceSearchAmtMax') || {}).value || '') || 0; } catch (eAm) {}
      /* بدون فیلتر و کلمه (عوض کردن «بخش» به‌تنهایی فیلتر حساب نمی‌شود): فقط چارچوب جدول، منتظر جستجو */
      var noFilter = !q && !catF && !typeF && rangeF === 'all' && !dayF && !accF && !amtMin && !amtMax;
      var sel = (typeof balanceSelectedTitles !== 'undefined' && balanceSelectedTitles) ? balanceSelectedTitles : [];
      var curKey = periodKey(currentYear, currentMonth);
      var list = [], titles = {};
      iterAllPeriodData(function (pd, key) {
        if (key === curKey && pd !== periodData) return;
        var parts = String(key).split('-'), y = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
        if (!bsInRange(rangeF, y, m)) return;
        /* با انتخاب دسته فقط مخارج (دسته‌بندی مال مخارج است) */
        (catF ? ['expense'] : (typeF ? [typeF] : ['income', 'expense'])).forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            var t = ((sec && sec.title) || '').trim();
            if (sel.length && sel.indexOf(t) < 0) return;
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (tab === 'expense' && (isPreAppPlanRow(r, y, m) || isFuturePlanRow(r, y, m))) return;
              if (accF && (r.account || '').trim() !== accF) return;
              if (q && norm(r.desc).indexOf(q) < 0) return;
              if (amtMin && Number(r.amount) < amtMin) return;
              if (amtMax && Number(r.amount) > amtMax) return;
              if (dayF && dayNum(r) !== dayF) return;
              if (catF) { var ids = bsCatOf(r); if (catF === '__none__' ? ids.length : ids.indexOf(catF) < 0) return; }
              titles[t] = 1;
              list.push({ y: y, m: m, d: dayNum(r) || 0, desc: r.desc || '—', amount: Number(r.amount) || 0, tab: tab, title: t, bank: (r.account || '').trim(), row: r });
            });
          });
        });
      });
      /* تاریخ زودتر بالای جدول */
      list.sort(function (a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); });
      /* منوی جستجو فقط یک جدول دارد: «نتیجهٔ جستجو» (جدول ماه‌ها برداشته شد) */
      try { window._bsLastList = list; } catch (eLl) {}
      try { bsRenderMonthSummary(list, 'none'); } catch (eMs) {}
      /* بدون فیلتر و کلمه: فقط جدول ماه‌ها؛ ردیف‌ها منتظر جستجو */
      if (noFilter) {
        body.innerHTML = '<tr class="sr-wait"><td colspan="5">برای دیدن نتایج، فیلتری انتخاب کنید یا کلمه‌ای بنویسید</td></tr>';
        if (foot) foot.innerHTML = '';
        document.getElementById('searchResultTitle').textContent = 'نتیجهٔ جستجو';
        boxR.style.display = '';
        return;
      }
      var many = Object.keys(titles).length > 1;
      body.innerHTML = '';
      var sumI = 0, sumE = 0;
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      list.forEach(function (it) {
        if (it.tab === 'income') sumI += it.amount; else sumE += it.amount;
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.className = 'sec-name';
        var full = it.desc + (many ? ' (' + it.title + ')' : '');
        td.textContent = full;
        td.title = full;
        td.onclick = function (e) {
          e.stopPropagation();
          /* جستجو فقط برای دیدن است؛ دستهٔ هر شرح از اسلاید «دسته‌بندی مخارج» باکس هوشمند عوض می‌شود */
          try { showCellTextPopup(td, full); } catch (err) {}
        };
        var tdB = document.createElement('td');
        tdB.className = 'sr-bank';
        tdB.textContent = it.bank ? toPersianDigits(it.bank) : '—';
        tdB.title = it.bank || '';
        var tdD = document.createElement('td');
        tdD.className = 'sr-date';
        tdD.textContent = toPersianDigits(String(it.y)) + '/' + p2(it.m) + (it.d ? '/' + p2(it.d) : '');
        var tdV = document.createElement('td');
        tdV.className = 'val';
        tdV.textContent = formatNum(it.amount);
        /* نتیجهٔ جستجو: واریز سبز و برداشت قرمز (همان رنگ مبالغ درآمد و مخارج) */
        tdV.classList.add(it.tab === 'income' ? 'sr-inc' : 'sr-exp');
        /* ۱.۳.۴۳: شمارهٔ ردیف ستون اول */
        var tdN = document.createElement('td');
        tdN.className = 'sr-num';
        tdN.textContent = toPersianDigits(String(body.children.length + 1));
        tr.appendChild(tdN); tr.appendChild(tdD); tr.appendChild(td); tr.appendChild(tdB); tr.appendChild(tdV);
        body.appendChild(tr);
      });
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.7;">نتیجه‌ای پیدا نشد</td></tr>';
      }
      if (foot) {
        foot.innerHTML = '';
        var addF = function (label, v, color) {
          var tr = document.createElement('tr');
          /* ۱.۳.۴۹: خانهٔ مبلغ جمع پهن‌تر (ستون حساب + مبلغ)؛ خط جداکننده زیر مرز شرح و حساب */
          tr.innerHTML = '<td class="sec-name" colspan="3">' + label + '</td><td class="val" colspan="2">' + formatNum(v) + '</td>';
          tr.querySelector('td.val').style.setProperty('color', color, 'important');
          /* متن طولانی: با زدن، باکس شناور یک‌خطی */
          tr.querySelectorAll('td').forEach(function (td) { td.style.cursor = 'pointer'; td.onclick = function (ev) { ev.stopPropagation(); try { showCellTextPopup(td, td.classList.contains('val') ? label + ': ' + formatNum(v) : label); } catch (eP) {} }; });
          foot.appendChild(tr);
        };
        var _lt = document.documentElement.getAttribute('data-theme') === 'light';
        /* یک ماه انتخاب شده: جمع درآمد و مخارج همان ماه؛ وگرنه اگر چند مورد پیدا شد، جمع کل آن‌ها */
        if (rangeF !== 'all') {
          var mName = MONTHS[parseInt(rangeF, 10) - 1] || '';
          if (typeF !== 'expense' && !catF) addF('درآمد کل ' + mName, sumI, _lt ? '#17834a' : '#9ee858');
          if (typeF !== 'income') addF('مخارج کل ' + mName, sumE, _lt ? '#dc2626' : '#ff6b4a');
        } else if (list.length > 1) {
          if (sumI > 0) addF('جمع درآمد (' + toPersianDigits(String(list.filter(function (x) { return x.tab === 'income'; }).length)) + ' مورد)', sumI, _lt ? '#17834a' : '#9ee858');
          if (sumE > 0) addF('جمع مخارج (' + toPersianDigits(String(list.filter(function (x) { return x.tab !== 'income'; }).length)) + ' مورد)', sumE, _lt ? '#dc2626' : '#ff6b4a');
        }
      }
      document.getElementById('searchResultTitle').textContent = 'نتیجهٔ جستجو (' + toPersianDigits(String(list.length)) + ' مورد)';
      boxR.style.display = '';
      hkFit11(document.getElementById('searchResultScroll'));
    }
    (function () {
      function bind() {
        var inp = document.getElementById('balanceSearchInput');
        if (!inp || inp._srBound) return;
        inp._srBound = true;
        var t = 0;
        inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(renderBalanceSearch, 150); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { inp.blur(); } catch (e2) {} } });
        ['balanceSearchAmtMin', 'balanceSearchAmtMax'].forEach(function (id) {
          var a = document.getElementById(id); if (!a) return;
          try { hkAmountInput(a); } catch (eH) {}
          var ta = 0;
          a.addEventListener('input', function () { clearTimeout(ta); ta = setTimeout(renderBalanceSearch, 250); });
          a.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { a.blur(); } catch (e2) {} } });
        });
        try { renderBalanceDayFilter(); } catch (eDf) {}
        ['balanceSearchType', 'balanceSearchRange', 'balanceSearchDay', 'balanceSearchCat'].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('change', function () {
            if (id === 'balanceSearchDay') {
              var hd = document.getElementById('balanceDayFilter'); if (hd) hd.value = el.value || '';
              try { renderBalanceTab(); } catch (eT) {}
            }
            if (id === 'balanceSearchType') bsSyncTypeCat();
            renderBalanceSearch();
          });
          try { enhanceSelectFont(el); } catch (eF) {}
        });
        try { bsFillCategories(); } catch (eB) {}
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
    })();
    function renderBalanceTab() {
      if (!document.getElementById('balanceFilters')) return;
      renderBalanceSectionFilter();
      renderBalanceDayFilter();
      renderBalanceAccountFilter();

      const dayF = parseInt(toEnglishDigits(document.getElementById('balanceDayFilter').value || '').replace(/[^0-9]/g, '') || '0', 10) || 0;
      const accF = (balanceSelectedAccount || '').trim();

      // recompute balance with filter
      const expMap = {}, incMap = {}, order = [];
      function addSec(tab, sec, isInc) {
        const title = (sec.title || '').trim() || '—';
        if (balanceSelectedTitles.length && !balanceSelectedTitles.includes(title)) return;
        /* همان قاعدهٔ «درآمد کل / خرج کل» کارت کاربر (sectionPaidUnpaidTotal)، با فیلتر روز و حساب */
        const fRows = (sec.rows || []).filter(r => r && (!dayF || dayNum(r) === dayF) && (!accF || (r.account || '').trim() === accF));
        const sum = sectionPaidUnpaidTotal({ rows: fRows }, isInc ? { personalIncomeOnly: true } : { personalExpenseOnly: true }).total;
        if (isInc) incMap[title] = (incMap[title] || 0) + sum;
        else expMap[title] = (expMap[title] || 0) + sum;
        if (!order.includes(title)) order.push(title);
      }
      (periodData.expense.sections || []).forEach(s => addSec('expense', s, false));
      (periodData.income.sections || []).forEach(s => addSec('income', s, true));

      const tbody = document.getElementById('balance-body');
      tbody.innerHTML = '';
      let gExp = 0;
      let gIncOnly = 0;
      const openingBal = (typeof sumFilteredOpeningBalance === 'function')
        ? sumFilteredOpeningBalance(accF)
        : 0;
      order.forEach(title => {
        /* موجودی کل هر بخش = جمع ردیف‌های درآمد همان بخش (با فیلتر حساب) */
        const bal = incMap[title] || 0;
        gIncOnly += bal;
        const exp = expMap[title] || 0;
        const remain = bal - exp;
        gExp += exp;
        const color = remain > 0 ? '#16a34a' : (remain < 0 ? '#dc2626' : 'var(--text)');
        const tr = document.createElement('tr');
        const tdSec = document.createElement('td');
        tdSec.className = 'sec-name';
        tdSec.textContent = title;
        tdSec.title = title;
        tdSec.onclick = (e) => {
          e.stopPropagation();
          if ((title || '').trim()) try { showCellTextPopup(tdSec, title); } catch (err) {}
        };
        tr.appendChild(tdSec);
        const tdInc = document.createElement('td');
        tdInc.className = 'val inc-cell';
        tdInc.style.color = 'var(--text)';
        tdInc.textContent = formatNum(bal);
        tr.appendChild(tdInc);
        const tdExp = document.createElement('td');
        tdExp.className = 'val exp-cell';
        tdExp.style.color = 'var(--text)';
        tdExp.textContent = formatNum(exp);
        tr.appendChild(tdExp);
        const tdRem = document.createElement('td');
        tdRem.className = 'val';
        tdRem.style.color = color;
        tdRem.textContent = formatNum(remain);
        tr.appendChild(tdRem);
        tbody.appendChild(tr);
      });
      /* جمع درآمد کل (بدون موجودی ماه قبل) − جمع خرج کل */
      const gBal = gIncOnly;
      const gRemain = gBal - gExp;
      document.getElementById('balIncome').textContent = formatNum(gBal);
      document.getElementById('balExpense').textContent = formatNum(gExp);
      document.getElementById('balIncome').style.color = 'var(--text)';
      document.getElementById('balExpense').style.color = 'var(--text)';
      const balEl = document.getElementById('balRemain');
      balEl.textContent = formatNum(gRemain);
      balEl.style.color = gRemain > 0 ? '#16a34a' : (gRemain < 0 ? '#dc2626' : 'var(--text)');

      // day detail
      const dayBox = document.getElementById('dayDetailBox');
      const dayBody = document.getElementById('day-detail-body');
      if (dayF) {
        dayBox.style.display = '';
        document.getElementById('dayDetailTitle').textContent = 'جزئیات روز ' + toPersianDigits(dayF);
        dayBody.innerHTML = '';
        function rowsForTitle(tab, title) {
          const out = [];
          (periodData[tab].sections || []).forEach(sec => {
            if ((sec.title || '').trim() !== title) return;
            sec.rows.forEach(r => {
              if (dayNum(r) !== dayF) return;
              if (accF && (r.account || '').trim() !== accF) return;
              if (!r.desc && !r.amount) return;
              out.push(r);
            });
          });
          return out;
        }
        const titlesOrdered = [];
        const seenTitles = new Set();
        ['income', 'expense'].forEach(tab => {
          (periodData[tab].sections || []).forEach(sec => {
            const t = (sec.title || '').trim();
            if (balanceSelectedTitles.length && !balanceSelectedTitles.includes(t)) return;
            if (!seenTitles.has(t)) { seenTitles.add(t); titlesOrdered.push(t); }
          });
        });
        function addRow(r, title, label) {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.className = 'sec-name';
          /* نام کاربر در پرانتز فقط وقتی «همه بخش‌ها» انتخاب است */
          const showTitle = title && !balanceSelectedTitles.length;
          const full = (r.desc || '—') + (showTitle ? (' (' + title + ')') : '');
          td.textContent = full;
          td.title = full;
          td.onclick = (e) => {
            e.stopPropagation();
            try { showCellTextPopup(td, full); } catch (err) {}
          };
          tr.appendChild(td);
          const tdL = document.createElement('td');
          tdL.textContent = label;
          tr.appendChild(tdL);
          const tdV = document.createElement('td');
          tdV.className = 'val';
          tdV.textContent = formatNum(r.amount || 0);
          /* مخارج پرداخت‌نشده قرمز؛ بقیه بدون تغییر */
          if (label === 'مخارج' && (r.status || 'paid') !== 'paid') tdV.style.setProperty('color', '#ff453a', 'important');
          tr.appendChild(tdV);
          dayBody.appendChild(tr);
          return tr;
        }
        let anyGroup = false;
        let lastTrOfGroup = null;
        titlesOrdered.forEach((title) => {
          const incRows = rowsForTitle('income', title);
          const expRows = rowsForTitle('expense', title);
          if (!incRows.length && !expRows.length) return;
          if (anyGroup && lastTrOfGroup) lastTrOfGroup.classList.add('day-detail-group-end');
          anyGroup = true;
          incRows.forEach(r => { lastTrOfGroup = addRow(r, title, 'درآمد'); });
          expRows.forEach(r => { lastTrOfGroup = addRow(r, title, 'مخارج'); });
        });
      } else {
        dayBox.style.display = 'none';
      }
      /* حین جستجو: جدول مانده و جزئیات روز پنهان؛ نتیجهٔ جستجو به‌جایشان */
      try { renderBalanceSearch(); } catch (eSr2) {}
      // ارتفاع/اسکرول balance-scroll-body بعد از تغییر فیلتر تازه شود
      try {
        const sb = document.getElementById('balanceScrollBody');
        if (sb) {
          void sb.offsetHeight;
          if (dayBox && dayBox.style.display !== 'none') {
            requestAnimationFrame(() => {
              try {
                const sbR = sb.getBoundingClientRect();
                const dR = dayBox.getBoundingClientRect();
                if (dR.bottom > sbR.bottom - 4) {
                  sb.scrollTop += Math.ceil(dR.bottom - sbR.bottom + 12);
                }
              } catch (e2) {}
            });
          }
        }
      } catch (e) {}
    }



    // اطمینان از دسترسی global برای onclick در WebView
    try {
      window.openTrashModal = openTrashModal;
      window.restoreSelectedTrash = restoreSelectedTrash;
      window.closeTrashModal = closeTrashModal;
      window.emptyTrashConfirm = emptyTrashConfirm;
      window.shareFullBackup = shareFullBackup;
      window.openBankAccountsModal = openBankAccountsModal;
      window.closeBankAccountsModal = closeBankAccountsModal;
      window.exportFullBackup = exportFullBackup;
      window.askBackupParts = askBackupParts;
      window.triggerImportBackup = triggerImportBackup;
      window.selectedAccountLabels = selectedAccountLabels;
      window.pushToTrash = pushToTrash;
    } catch (e) { console.warn('window export', e); }

    loadBankAccounts();
    try { loadTrash(); } catch (e) {}
    loadSmsAccountBankMap();
    loadRecurring();
    try { loadUserReminders(); } catch (e) {}
    try { checkUserReminders(true); } catch (e) {} /* بدون تأخیر: باکس یادآور هم‌زمان با بقیهٔ صفحه ظاهر شود */
    _hkBoot = true;
    loadArchive();
    loadCurrent();
    /* هر بار باز شدن: ماه نمایش‌داده‌شده = ماه امروز (اگر روی ماه آینده بسته شده بود، برمی‌گردد) */
    try {
      var _bt = getTodayPersian();
      /* ۱.۳.۵۱: ماه گذشته هم (مثلاً بسته شدن روی ۱۴۰۰) → همیشه ماه امروز */
      if (_bt && _bt.y && (currentYear * 100 + currentMonth) !== (_bt.y * 100 + _bt.m)) { currentYear = _bt.y; currentMonth = _bt.m; loadCurrent(); }
    } catch (eBootM) {}
    try { autoAdvancePersianMonthIfNeeded(); } catch (eAutoM) {}
    /* درآمدهای ثابت: ردیف ماه‌های رسیده (از آخرین بازشدن تا امروز) */
    try { ensureRecurringRows({ render: false }); } catch (eRec) {}
    try {
      var _hkLastTodayKey = recTodayKey();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        try {
          var nk = recTodayKey();
          if (nk !== _hkLastTodayKey) {
            if (recMonthKey(currentYear, currentMonth) === _hkLastTodayKey) { autoAdvancePersianMonthIfNeeded(); }
            _hkLastTodayKey = nk;
          }
        } catch (e) {}
        try { ensureRecurringRows(); } catch (e) {}
      });
    } catch (eRecV) {}
    try {
      var _recLegacy = recLegacyItems();
      if (_recLegacy.length) setTimeout(function () {
        try { showToast('درآمد ثابت «' + (_recLegacy[0].name || '') + '»' + (_recLegacy.length > 1 ? ' و ' + toPersianDigits(_recLegacy.length - 1) + ' مورد دیگر' : '') + ' تاریخ شروع ندارد؛ از منوی درآمد ثابت تنظیم کنید'); } catch (e) {}
      }, 4000);
    } catch (eRecL) {}
    try { migrateAllBankNamesInData(); } catch (e) {}
    /* مهاجرت ایمن: موجودی‌های اولیهٔ بی‌صاحب (حساب حذف/تغییرنام‌شده) کنار گذاشته و برای بازیابی نگه داشته می‌شوند */
    try { cleanupOrphanedAccountOpenings({ reason: 'boot' }); } catch (eOrph) {}
    initSelectors();
    updateTabUI();
    ensureLocalUid();
    /* ابر حذف شد — پاک‌سازی وضعیت حساب مشترک قدیمی */
    try {
      sharedAccountId = '';
      familyCode = '';
      localStorage.removeItem(STORAGE_KEY + '_sharedAccount');
      localStorage.removeItem(STORAGE_KEY + '_syncQueue');
    } catch (eCloudClr) {}
    /* بدون همگام‌سازی / بدون toast ابری */
    try { updateFamilyUI(); } catch (eFU) {}
    try {
      currentTab = 'home';
      _detailContext = null;
      activatePanel('home');
      renderHomeCards();
      /* home-scroll-stable */
      try { window.scrollTo(0, 0); } catch (e) {}
      try { syncMatchCardWidth(); } catch (e2) {}
    } catch (e) { console.error('home boot', e); }
    renderAll();
    _hkBoot = false;
    try { setTimeout(function () { Promise.resolve(hkMirrorRecover()).catch(function () {}).then(function () { return hkRunMigrations(); }).catch(function () {}); }, 600); } catch (eMr) {}
    /* بعد از بارگذاری کامل داده — فقط یک‌بار عدد نهایی موجودی */
    try {
      _hbcReady = true;
      _hbcLast = null;
      var _amtBoot = document.getElementById('homeBalanceAmt');
      if (_amtBoot) _amtBoot._hbcBusy = false;
      if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
    } catch (eHbcBoot) {}
    requestNotifPermission();
    try {
      // بعد از نوتیف (و پیامک در Capacitor)، منوی انتخاب حساب اولین‌بار
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BankSms) {
        const BankSms = window.Capacitor.Plugins.BankSms;
        Promise.resolve()
          .then(() => BankSms.requestPermission())
          .catch(() => {})
          .finally(() => {
            try { maybeShowFirstRunBankSetup(); } catch (e) {}
          });
      } else {
        maybeShowFirstRunBankSetup();
      }
    } catch (e) {
      try { maybeShowFirstRunBankSetup(); } catch (e2) {}
    }
    checkInstallReminders();
    try { checkUserReminders(true); } catch (eUr) {}
    /* startSyncLoop removed — بدون ابر */

    // ارتفاع هدر ثابت را با محتوا هم‌تراز کن
    requestAnimationFrame(() => {
      syncChromeHeight();
      moveTabIndicator();
      setTimeout(syncChromeHeight, 50);
      setTimeout(syncChromeHeight, 300);
    });
    if (!familyCode) {
      // اولین ورود — مودال خانواده را نشان بده (اختیاری)
      // کاربر می‌تواند بعداً از منو بسازد
    }
    // فونت وب ممکن است بعد از رندر اول بارگذاری شود و اندازه متن‌ها را عوض کند؛
    // بعد از آماده شدن فونت، اگر تب مانده باز است دوباره اندازه باکس «همه روزها» را با «همه بخش‌ها» هماهنگ کن
    if (window.document && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (currentTab === 'balance') renderBalanceTab();
      }).catch(() => {});
    }
