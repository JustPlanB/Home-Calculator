    /* —— قفل اسکرول بدنه هنگام باز بودن شیت/مودال (جلوگیری از پرش) —— */
    let _bodyScrollLockY = 0;
    let _bodyScrollLockCount = 0;
    function lockBodyScroll() {
      if (_bodyScrollLockCount === 0) {
        _bodyScrollLockY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = (-_bodyScrollLockY) + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }
      _bodyScrollLockCount++;
    }
    function unlockBodyScroll() {
      if (_bodyScrollLockCount > 0) _bodyScrollLockCount--;
      if (_bodyScrollLockCount <= 0) {
        _bodyScrollLockCount = 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        try { window.scrollTo(0, _bodyScrollLockY); } catch (e) {}
      }
    }

    /* باز کردن منوی همبرگری با کشیدن انگشت از لبهٔ راست صفحه به سمت چپ (فقط وقتی پنجره/منوی دیگری باز نیست) */
    (function () {
      var sx = 0, sy = 0, on = false, fired = false, EDGE = 28;
      function busy() {
        try {
          if (document.body.classList.contains('menu-open')) return true;
          if (document.querySelector('.modal-overlay.open, .backup-pick-overlay, .hk-recon-ov, #recPickModal, #recArchiveModal, #recRenewModal, #hkExportModal, #recurringSheet, .tour-root')) return true;
          /* ۱.۳.۵۵: از هر صفحه‌ای (مخارج/درآمد، منوها) هم باز می‌شود؛ فقط پنجره‌های روی صفحه مانع‌اند */
          var lk = document.getElementById('appLockOverlay'); if (lk && lk.classList.contains('show')) return true;
          if (document.querySelector('.hk-re-ov, .hk-bulk-ov, #smsConfirmModal.open, #recAddPrevModal, .hk-row-act')) return true;
        } catch (e) {}
        return false;
      }
      document.addEventListener('touchstart', function (e) {
        on = false; fired = false;
        if (!e.touches || e.touches.length !== 1) return;
        var t = e.touches[0];
        if (t.clientX < window.innerWidth - EDGE || busy()) return;
        sx = t.clientX; sy = t.clientY; on = true;
      }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        if (!on || fired || !e.touches || !e.touches[0]) return;
        var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) { on = false; return; }
        if (dx < -45) { fired = true; on = false; try { openSideMenu(); } catch (e2) {} }
      }, { passive: true });
      document.addEventListener('touchend', function () { on = false; }, { passive: true });
    })();
    function openSideMenu() {
      try { updateProfessionalModeUI(); } catch (e) {}
      try { if (typeof silentUpdateCheck === 'function') silentUpdateCheck(2 * 60 * 1000); } catch (eU) {}
      try { if (typeof hkPermRefresh === 'function') hkPermRefresh(); } catch (ePm) {}
      const menu = document.getElementById('menuDropdown');
      const bd = document.getElementById('menuBackdrop');
      /* ۱.۳.۴۷: نام کاربر (کارت اصلی) بالای منوی کناری؛ دیگر روی کارت نوشته نمی‌شود */
      try { hkRenderMenuProfile(); hkMenuSearchClear(); var _msi2 = document.getElementById('menuSearchInput'); if (_msi2 && document.activeElement === _msi2) _msi2.blur(); } catch (eUn) {}
      if (menu) menu.classList.add('open');
      if (bd) bd.classList.add('open');
      document.body.classList.add('menu-open');
      // همیشه از بالای منو شروع شود
      try {
        const sc = document.querySelector('.menu-scroll');
        if (sc) sc.scrollTop = 0;
      } catch (e) {}
      bindMenuBlockers();
    }
    /* =====================================================================
       آمار (منوی همبرگری): روزانه / هفتگی / ماهانه / سالانه با فیلتر و نمودار
       داده‌ها از همهٔ ماه‌های آرشیو + ماه جاری؛ مبالغ «شخصی» با همان قاعدهٔ
       sectionPaidUnpaidTotal (سهم پروژه حساب نمی‌شود) تا با بقیهٔ نرم‌افزار یکی باشد.
       ===================================================================== */
    var HKStats = (function () {
      var st = { mode: 'daily', y: 0, m: 0, card: '', type: 'both', status: 'all' };
      var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
      /* پاستلیِ کمی شارپ (ترتیب ثابت؛ رنگ به دسته می‌چسبد نه به رتبه) */
      var CAT_DARK = ['#6ea8fe', '#ff9b7a', '#5fd3a6', '#ffcc66', '#c49bff', '#ff8fb8', '#6fd6ea'];
      var CAT_LIGHT = ['#4f8ff7', '#f5835e', '#36bf8c', '#f2b43c', '#a97cf0', '#f06fa0', '#3fbfd8'];
      function fa(n) { return toPersianDigits(String(n)); }
      function money(n) { return formatNum(Math.round(n || 0)); }
      function short(n) { try { return spAmt(Math.round(n || 0)); } catch (e) { return money(n); } }
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
      /* ---- تقویم شمسی: روز ژولینی، روز هفته (شنبه=۰)، طول ماه ---- */
      function jd(y, m, d) {
        var epbase = y - (y >= 0 ? 474 : 473), epyear = 474 + ((epbase % 2820) + 2820) % 2820;
        return d + (m <= 7 ? (m - 1) * 31 : (m - 1) * 30 + 6) + Math.floor((epyear * 682 - 110) / 2816) + (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 + 1948319.5;
      }
      /* تبدیل دقیق با تقویم شمسیِ خود مرورگر (Intl)؛ فرمول فقط تخمین اولیه است */
      var _pf = null, _gc = {};
      function pOf(dt) {
        if (!_pf) _pf = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
        var o = {}; _pf.formatToParts(dt).forEach(function (x) { if (x.type === 'year' || x.type === 'month' || x.type === 'day') o[x.type] = parseInt(x.value, 10); });
        return o;
      }
      function gDate(y, m, d) {
        var k = y + '-' + m + '-' + d;
        if (k in _gc) return _gc[k];
        var base = (jd(y, m, d) - 2440587.5) * 86400000, hit = null;
        try {
          for (var off = 0; off <= 3 && !hit; off++) {
            [off, -off].forEach(function (o) {
              if (hit) return;
              var dt = new Date(base + o * 86400000), q = pOf(dt);
              if (q.year === y && q.month === m && q.day === d) hit = dt;
            });
          }
        } catch (e) {}
        _gc[k] = hit;
        return hit;
      }
      function weekday(y, m, d) {
        var dt = gDate(y, m, d);
        if (dt) return (dt.getUTCDay() + 1) % 7;   /* شنبه = ۰ */
        var w = ((Math.floor(jd(y, m, d) + 1.5) % 7) + 7) % 7; return (w + 1) % 7;
      }
      function monthLen(y, m) { if (m <= 6) return 31; if (m <= 11) return 30; return gDate(y, 12, 30) ? 30 : 29; }
      /* ---- جمع‌آوری ردیف‌ها ---- */
      function monthData(y, m) {
        if (y === currentYear && m === currentMonth) return periodData;
        return (typeof archive !== 'undefined' && archive) ? archive[periodKey(y, m)] : null;
      }
      function allMonths() {
        var set = {}, out = [];
        try { Object.keys(archive || {}).forEach(function (k) { if (/^\d+-\d+$/.test(k)) set[k] = 1; }); } catch (e) {}
        set[periodKey(currentYear, currentMonth)] = 1;
        Object.keys(set).forEach(function (k) { var p = k.split('-'); out.push({ y: +p[0], m: +p[1] }); });
        return out.sort(function (a, b) { return a.y - b.y || a.m - b.m; });
      }
      function rowsOf(y, m) {
        var pd = monthData(y, m), out = [];
        if (!pd) return out;
        ['income', 'expense'].forEach(function (kind) {
          ((pd[kind] && pd[kind].sections) || []).forEach(function (sec) {
            var title = ((sec && sec.title) || '').trim();
            ((sec && sec.rows) || []).forEach(function (r) {
              if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (kind === 'expense' && isPreAppPlanRow(r, y, m)) return;
              var t = sectionPaidUnpaidTotal({ rows: [r] }, kind === 'income' ? { personalIncomeOnly: true } : { personalExpenseOnly: true });
              if (!t.total) return;
              var d = parseInt(toEnglishDigits(String(r.day || '')), 10);
              out.push({ y: y, m: m, d: (d >= 1 && d <= 31) ? d : 0, kind: kind, paid: t.paid, unpaid: t.unpaid, desc: (r.desc || '').trim(), title: title, row: r });
            });
          });
        });
        return out;
      }
      /* ماهِ «فعال» = ماهی که گذشته (نه آینده) و کاربر در آن دست‌کم یک ثبتِ واقعی (غیر از قسطِ خودکار) دارد.
         در آمار ماهانه/سالانه فقط ماه‌های فعال جمع زده می‌شوند تا اقساطِ خودکارِ آینده یا ماه‌های بی‌استفاده عدد را باد نکنند. */
      var _actCache = null;
      function monthActive(y, m) {
        var t = getTodayPersian();
        if (y > t.y || (y === t.y && m > t.m)) return false;
        var k = y + '-' + m;
        if (!_actCache) _actCache = {};
        if (k in _actCache) return _actCache[k];
        var pd = monthData(y, m), on = false;
        if (pd) ['income', 'expense'].forEach(function (kind) {
          ((pd[kind] && pd[kind].sections) || []).forEach(function (sec) {
            ((sec && sec.rows) || []).forEach(function (r) {
              if (on || !r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (kind === 'income' || r.fromPlanId == null) on = true;
            });
          });
        });
        if (y === t.y && m === t.m) on = true;
        _actCache[k] = on;
        return on;
      }
      var _skipped = 0;
      function filtered(list) {
        return list.filter(function (x) {
          if (st.card && x.title !== st.card) return false;
          if (st.type !== 'both' && x.kind !== st.type) return false;
          return true;
        });
      }
      function amt(x) { return st.status === 'paid' ? x.paid : st.status === 'unpaid' ? x.unpaid : x.paid + x.unpaid; }
      function cards() {
        var set = {};
        try { allPersonTitles().forEach(function (t) { set[t] = 1; }); } catch (e) {}
        return Object.keys(set);
      }
      /* ---- سطل‌های زمانی برای هر حالت ---- */
      function buckets() {
        var b = [], rows = [];
        _actCache = null; _skipped = 0;
        var skip = function (list) { list.forEach(function (x) { _skipped += amt(x) * (x.kind === 'expense' ? 1 : 0); }); return []; };
        if (st.mode === 'daily') {
          var n = monthLen(st.y, st.m);
          for (var d = 1; d <= n; d++) b.push({ label: fa(d), full: fa(d) + ' ' + MONTHS[st.m - 1], inc: 0, exp: 0 });
          rows = filtered(rowsOf(st.y, st.m));
          rows.forEach(function (x) { var i = (x.d || 1) - 1; if (b[i]) b[i][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
        } else if (st.mode === 'weekly') {
          /* هفته‌های ماه انتخابی (شنبه تا جمعه) */
          var n2 = monthLen(st.y, st.m), wk = -1, map = [];
          for (var d2 = 1; d2 <= n2; d2++) {
            if (d2 === 1 || weekday(st.y, st.m, d2) === 0) { wk++; b.push({ label: 'هفته ' + fa(wk + 1), full: '', from: d2, to: d2, inc: 0, exp: 0 }); }
            b[wk].to = d2; map[d2] = wk;
          }
          b.forEach(function (x) { x.full = 'هفتهٔ ' + fa(b.indexOf(x) + 1) + ' (' + fa(x.from) + ' تا ' + fa(x.to) + ' ' + MONTHS[st.m - 1] + ')'; });
          rows = filtered(rowsOf(st.y, st.m));
          rows.forEach(function (x) { var i = map[x.d || 1]; if (b[i]) b[i][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
        } else if (st.mode === 'monthly') {
          for (var m = 1; m <= 12; m++) {
            b.push({ label: MONTHS[m - 1].slice(0, 3), full: MONTHS[m - 1] + ' ' + fa(st.y), inc: 0, exp: 0 });
            var rm = filtered(rowsOf(st.y, m));
            if (!monthActive(st.y, m)) { b[m - 1].off = 1; rm = skip(rm); }
            rm.forEach(function (x) { b[m - 1][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
            rows = rows.concat(rm);
          }
        } else {
          var years = {};
          allMonths().forEach(function (p) { years[p.y] = 1; });
          Object.keys(years).map(Number).sort().forEach(function (y) {
            var it = { label: fa(y), full: 'سال ' + fa(y), inc: 0, exp: 0 };
            for (var m2 = 1; m2 <= 12; m2++) {
              var ry = filtered(rowsOf(y, m2));
              if (!monthActive(y, m2)) ry = skip(ry);
              ry.forEach(function (x) { it[x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
              rows = rows.concat(ry);
            }
            b.push(it);
          });
        }
        return { b: b, rows: rows };
      }
      /* ---- نمودارها (SVG ساده و سبک) ---- */
      function tipShow(wrap, html, x) {
        var tip = wrap.querySelector('.st-tip');
        tip.innerHTML = html;
        tip.style.display = 'block';
        var w = wrap.clientWidth, tw = tip.offsetWidth;
        tip.style.left = Math.max(4, Math.min(w - tw - 4, x - tw / 2)) + 'px';
      }
      function tipHide(wrap) { var t = wrap.querySelector('.st-tip'); if (t) t.style.display = 'none'; }
      /* لمس بیرون از نمودار = بستن جزئیات همهٔ نمودارها */
      function clearPins(except) {
        document.querySelectorAll('#statsBody .st-chart').forEach(function (w) {
          if (w === except) return;
          tipHide(w);
          w.querySelectorAll('.st-hit.on').forEach(function (h) { h.classList.remove('on'); });
          var c = w.querySelector('.st-cross'), m = w.querySelector('.st-mark');
          if (c) c.style.display = 'none'; if (m) m.style.display = 'none';
        });
      }
      document.addEventListener('pointerdown', function (e) {
        if (!e.target.closest) return;
        var sh = document.getElementById('statsSheet');
        if (!sh || !sh.classList.contains('open')) return;
        /* لمس بیرون از برش‌ها/راهنمای دایرهٔ دسته‌بندی = همهٔ دسته‌ها دوباره رنگی */
        if (!e.target.closest('#statsBody .st-slice, #statsBody .st-leg')) {
          document.querySelectorAll('#statsBody .st-slice.dim').forEach(function (x) { x.classList.remove('dim'); });
          document.querySelectorAll('#statsBody .st-leg.on').forEach(function (x) { x.classList.remove('on'); });
        }
        if (e.target.closest('#statsBody .st-chart')) return;
        clearPins(null);
      }, true);
      function niceMax(v) {
        if (v <= 0) return 1;
        var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
        return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
      }
      function topRound(x, y, w, h, r) {
        if (h <= 0) return '';
        r = Math.min(r, w / 2, h);
        return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
      }
      /* ستونی گروهی: درآمد/خرج در هر سطل؛ محور زمان راست‌به‌چپ */
      function barChart(wrap, b, showInc, showExp) {
        var W = Math.max(260, wrap.clientWidth), H = 190, padT = 10, padB = 24, padR = 4, padL = 44;
        var mx = 0;
        b.forEach(function (x) { if (showInc) mx = Math.max(mx, x.inc); if (showExp) mx = Math.max(mx, x.exp); });
        var top = niceMax(mx), plotW = W - padL - padR, plotH = H - padT - padB;
        var n = b.length, slot = plotW / n, groups = (showInc ? 1 : 0) + (showExp ? 1 : 0);
        var bw = Math.max(3, Math.min(12, (slot - 4) / groups - 3));
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">';
        for (var g = 0; g <= 3; g++) {
          var gy = padT + plotH - plotH * g / 3;
          svg += '<line class="st-grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"/>';
          svg += '<text class="st-ax" x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + (g ? esc(short(top * g / 3)) : '۰') + '</text>';
        }
        var step = n > 16 ? Math.ceil(n / 8) : 1;
        b.forEach(function (x, i) {
          var cx = W - padR - slot * (i + 0.5);   /* RTL: اولین سطل سمت راست */
          var x0 = cx - (groups * bw + (groups - 1) * 3) / 2, k = 0;
          svg += '<rect class="st-hit" data-i="' + i + '" x="' + (cx - slot / 2) + '" y="' + padT + '" width="' + slot + '" height="' + plotH + '"/>';
          /* لوله: شیار تیرهٔ تمام‌قد + پرشدن از پایین با انیمیشن (مثل لوله‌های باکس هوشمند) */
          var tube = function (tx, v, c) {
            var h = v > 0 ? Math.max(bw, plotH * v / top) : 0, rr = (bw / 2).toFixed(2);
            var o = '<rect class="st-trk" x="' + tx.toFixed(2) + '" y="' + padT + '" width="' + bw.toFixed(2) + '" height="' + plotH + '" rx="' + rr + '"/>';
            if (h > 0) o += '<rect class="st-tf ' + c + '" style="animation-delay:' + Math.min(600, i * 35) + 'ms" x="' + tx.toFixed(2) + '" y="' + (padT + plotH - h).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="' + rr + '"/>';
            return o;
          };
          if (showInc) { svg += tube(x0, x.inc, 'st-inc'); k++; }
          if (showExp) { svg += tube(x0 + k * (bw + 3), x.exp, 'st-exp'); }
          if (i % step === 0) svg += '<text class="st-ax" x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(x.label) + '</text>';
        });
        svg += '<line class="st-base" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '"/></svg>';
        wrap.innerHTML = svg + '<div class="st-tip"></div>';
        var svgEl = wrap.querySelector('svg');
        function at(ev) {
          var r = svgEl.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
          var i = Math.floor((W - padR - px) / slot);
          if (i < 0 || i >= n) { tipHide(wrap); return; }
          var x = b[i];
          wrap.querySelectorAll('.st-hit').forEach(function (h) { h.classList.toggle('on', +h.getAttribute('data-i') === i); });
          tipShow(wrap, '<b>' + esc(x.full || x.label) + '</b>' + (showInc ? '<div><i class="st-dot inc"></i>درآمد: ' + money(x.inc) + '</div>' : '') + (showExp ? '<div><i class="st-dot exp"></i>مخارج: ' + money(x.exp) + '</div>' : ''), (W - padR - slot * (i + 0.5)) * r.width / W);
        }
        /* یک لمس = نمایش و ماندن جزئیات؛ لمس جای دیگر = بسته شدن (بدون لانگ‌پرس و بدون پرش) */
        svgEl.addEventListener('click', function (ev) { clearPins(wrap); at(ev); });
      }
      /* خطی: روند مانده (تجمعی درآمد − خرج) */
      function lineChart(wrap, b) {
        var W = Math.max(260, wrap.clientWidth), H = 160, padT = 12, padB = 22, padR = 8, padL = 44;
        var acc = 0, pts = b.map(function (x) { acc += x.inc - x.exp; return acc; });
        var lo = Math.min(0, Math.min.apply(null, pts)), hi = Math.max(0, Math.max.apply(null, pts));
        if (hi === lo) hi = lo + 1;
        var plotW = W - padL - padR, plotH = H - padT - padB, n = b.length;
        var X = function (i) { return n === 1 ? W - padR - plotW / 2 : W - padR - plotW * i / (n - 1); };
        var Y = function (v) { return padT + plotH * (hi - v) / (hi - lo); };
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">';
        [hi, (hi + lo) / 2, lo].forEach(function (v) {
          svg += '<line class="st-grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
          svg += '<text class="st-ax" x="' + (padL - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + esc(v < 0 ? '−' + short(-v) : short(v)) + '</text>';
        });
        if (lo < 0) svg += '<line class="st-zero" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
        var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
        svg += '<path class="st-area" d="' + d + 'L' + X(n - 1).toFixed(1) + ' ' + Y(Math.max(lo, 0)) + 'L' + X(0).toFixed(1) + ' ' + Y(Math.max(lo, 0)) + 'Z"/>';
        svg += '<path class="st-line" pathLength="1" d="' + d + '"/>';
        var step = n > 16 ? Math.ceil(n / 8) : 1;
        b.forEach(function (x, i) { if (i % step === 0) svg += '<text class="st-ax" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(x.label) + '</text>'; });
        svg += '<line class="st-cross" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + plotH) + '" style="display:none"/><circle class="st-mark" r="4.5" style="display:none"/></svg>';
        wrap.innerHTML = svg + '<div class="st-tip"></div>';
        var svgEl = wrap.querySelector('svg'), cross = svgEl.querySelector('.st-cross'), mark = svgEl.querySelector('.st-mark');
        function at(ev) {
          var r = svgEl.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
          var i = n === 1 ? 0 : Math.round((W - padR - px) / plotW * (n - 1));
          i = Math.max(0, Math.min(n - 1, i));
          cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.style.display = '';
          mark.setAttribute('cx', X(i)); mark.setAttribute('cy', Y(pts[i])); mark.style.display = '';
          var v = pts[i];
          tipShow(wrap, '<b>' + esc(b[i].full || b[i].label) + '</b><div>مانده تا این‌جا: <span class="' + (v < 0 ? 'neg' : 'pos') + '">' + (v < 0 ? '−' : '') + money(Math.abs(v)) + '</span></div>', X(i) * r.width / W);
        }
        svgEl.addEventListener('click', function (ev) { clearPins(wrap); at(ev); });
      }
      /* دایره‌ای (دونات) با راهنما؛ حداکثر ۷ دسته + «سایر» */
      function donut(wrap, items, total, centerLabel) {
        var pal = isLight() ? CAT_LIGHT : CAT_DARK;
        var list = items.slice(0, 7), rest = items.slice(7).reduce(function (s, x) { return s + x.amount; }, 0);
        if (rest > 0) list.push({ label: 'سایر', amount: rest, other: true });
        var R = 64, r0 = 42, C = 80, a = -Math.PI / 2, svg = '<svg viewBox="0 0 160 160" width="160" height="160">';
        list.forEach(function (x, i) {
          var frac = x.amount / total, a2 = a + frac * Math.PI * 2;
          var large = frac > 0.5 ? 1 : 0, col = x.other ? 'var(--st-other)' : pal[i];
          x.color = col;
          if (frac >= 0.9999) {
            svg += '<circle class="st-slice" data-i="' + i + '" cx="' + C + '" cy="' + C + '" r="' + ((R + r0) / 2) + '" fill="none" stroke="' + col + '" stroke-width="' + (R - r0) + '"/>';
          } else {
            var p = function (rad, ang) { return (C + rad * Math.cos(ang)).toFixed(2) + ' ' + (C + rad * Math.sin(ang)).toFixed(2); };
            svg += '<path class="st-slice" data-i="' + i + '" fill="' + col + '" d="M' + p(R, a) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(R, a2) + 'L' + p(r0, a2) + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a) + 'Z"/>';
          }
          a = a2;
        });
        svg += '<text class="st-dc1" x="80" y="76" text-anchor="middle">' + esc(short(total)) + '</text><text class="st-dc2" x="80" y="94" text-anchor="middle">' + esc(centerLabel) + '</text></svg>';
        var leg = '<div class="st-legend">' + list.map(function (x, i) {
          return '<div class="st-leg" data-i="' + i + '"><i style="background:' + x.color + '"></i><span class="st-leg-l">' + esc(x.label) + '</span><span class="st-leg-p">' + fa(Math.round(x.amount / total * 100)) + '٪</span><span class="st-leg-v">' + esc(short(x.amount)) + '</span></div>';
        }).join('') + '</div>';
        wrap.innerHTML = '<div class="st-donut">' + svg + '</div>' + leg;
        function pick(i) {
          wrap.querySelectorAll('.st-slice').forEach(function (s) { s.classList.toggle('dim', i >= 0 && +s.getAttribute('data-i') !== i); });
          wrap.querySelectorAll('.st-leg').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-i') === i); });
        }
        wrap.querySelectorAll('.st-slice, .st-leg').forEach(function (el) {
          el.addEventListener('click', function () { var i = +el.getAttribute('data-i'); pick(el.classList.contains('on') ? -1 : i); });
        });
      }
      /* افقی: فهرست مقایسه‌ای (کارت‌ها / روزهای هفته / بیشترین خرج‌ها) */
      function hbars(wrap, list, cls) {
        var mx = list.reduce(function (s, x) { return Math.max(s, x.amount); }, 0) || 1;
        wrap.innerHTML = list.map(function (x, k) {
          return '<div class="st-hb"><div class="st-hb-row"><span class="st-hb-l">' + esc(x.label) + '</span><span class="st-hb-v">' + money(x.amount) + '</span></div>' +
            '<div class="st-hb-bar st-tube"><i class="' + (x.cls || cls || 'exp') + '" style="animation-delay:' + Math.min(700, k * 90) + 'ms;width:' + Math.max(x.amount > 0 ? 2 : 0, x.amount / mx * 100).toFixed(1) + '%"></i></div></div>';
        }).join('') || '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
      }
      /* ---- ساخت صفحه ---- */
      function card(title, sub, body) {
        return '<section class="st-card"><div class="st-card-h"><span>' + title + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + body + '</section>';
      }
      /* منوی کشویی با استایل خود نرم‌افزار (نه انتخابگر اندروید) */
      var DD = {};
      function dd(field, opts) {
        DD[field] = opts;
        var cur = opts.filter(function (o) { return o[0] === st[field]; })[0] || opts[0];
        return '<button type="button" class="st-dd" data-dd="' + field + '"><span>' + esc(cur[1]) + '</span><i class="st-chev"></i></button>';
      }
      function closeDd() { var l = document.getElementById('stDdList'); if (l) l.remove(); }
      function openDd(btn) {
        var field = btn.getAttribute('data-dd'), opts = DD[field] || [];
        var was = document.getElementById('stDdList');
        closeDd();
        if (was && was._f === field) return;
        var sh = document.getElementById('statsSheet'), r = btn.getBoundingClientRect(), sr = sh.getBoundingClientRect();
        var l = document.createElement('div');
        l.id = 'stDdList'; l.className = 'st-dd-list'; l._f = field;
        l.innerHTML = opts.map(function (o) { return '<button type="button" class="st-dd-opt' + (o[0] === st[field] ? ' on' : '') + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('');
        l.style.top = (r.bottom - sr.top + 6) + 'px';
        l.style.right = (sr.right - r.right) + 'px';
        l.style.minWidth = r.width + 'px';
        sh.appendChild(l);
        l.querySelectorAll('.st-dd-opt').forEach(function (o) {
          o.onclick = function () { st[field] = o.getAttribute('data-v'); closeDd(); render(); };
        });
      }
      document.addEventListener('pointerdown', function (e) {
        if (!e.target.closest) return;
        if (e.target.closest('#stDdList') || e.target.closest('.st-dd')) return;
        closeDd();
      }, true);
      function periodLabel() {
        if (st.mode === 'daily' || st.mode === 'weekly') return MONTHS[st.m - 1] + ' ' + fa(st.y);
        if (st.mode === 'monthly') return 'سال ' + fa(st.y);
        return 'همهٔ سال‌ها';
      }
      /* مقایسه با دورهٔ قبل: روزانه/هفتگی → ماه قبل، ماهانه → سال قبل، سالانه → سال آخر در برابر سال پیش از آن */
      function sumRows(list) { var o = { inc: 0, exp: 0 }; list.forEach(function (x) { o[x.kind === 'income' ? 'inc' : 'exp'] += amt(x); }); return o; }
      function yearRows(y) { var r = []; for (var m = 1; m <= 12; m++) if (monthActive(y, m)) r = r.concat(filtered(rowsOf(y, m))); return r; }
      function comparePrev() {
        var cur, prev, prevLabel;
        if (st.mode === 'daily' || st.mode === 'weekly') {
          var py = st.y, pm = st.m - 1; if (pm < 1) { pm = 12; py--; }
          cur = sumRows(filtered(rowsOf(st.y, st.m))); prev = sumRows(filtered(rowsOf(py, pm)));
          prevLabel = MONTHS[pm - 1] + ' ' + fa(py);
        } else if (st.mode === 'monthly') {
          cur = sumRows(yearRows(st.y)); prev = sumRows(yearRows(st.y - 1)); prevLabel = 'سال ' + fa(st.y - 1);
        } else {
          var ys = {}; allMonths().forEach(function (p) { ys[p.y] = 1; });
          var arr = Object.keys(ys).map(Number).sort();
          if (arr.length < 2) return null;
          var a = arr[arr.length - 1], b0 = arr[arr.length - 2];
          cur = sumRows(yearRows(a)); prev = sumRows(yearRows(b0)); prevLabel = 'سال ' + fa(b0);
        }
        return { cur: cur, prev: prev, prevLabel: prevLabel };
      }
      function compareChart(wrap, c, showInc, showExp) {
        var items = [];
        if (showInc) items.push({ label: 'درآمد', a: c.cur.inc, b: c.prev.inc, cls: 'inc', goodUp: true });
        if (showExp) items.push({ label: 'مخارج', a: c.cur.exp, b: c.prev.exp, cls: 'exp', goodUp: false });
        if (showInc && showExp) items.push({ label: 'مانده', a: c.cur.inc - c.cur.exp, b: c.prev.inc - c.prev.exp, cls: 'bal', goodUp: true });
        var mx = 1; items.forEach(function (x) { mx = Math.max(mx, Math.abs(x.a), Math.abs(x.b)); });
        wrap.innerHTML = items.map(function (x, k) {
          var d = x.b ? Math.round((x.a - x.b) / Math.abs(x.b) * 100) : (x.a ? 100 : 0);
          var up = x.a > x.b, good = x.a === x.b ? null : (up === x.goodUp);
          var badge = x.a === x.b ? '<span class="st-cmp-d">بدون تغییر</span>' :
            '<span class="st-cmp-d ' + (good ? 'good' : 'bad') + '">' + (up ? '▲ ' : '▼ ') + fa(Math.abs(d)) + '٪</span>';
          var w = function (v) { return Math.max(v ? 2 : 0, Math.abs(v) / mx * 100).toFixed(1); };
          var sg = function (v) { return (v < 0 ? '−' : '') + money(Math.abs(v)); };
          return '<div class="st-cmp"><div class="st-hb-row"><span class="st-hb-l">' + x.label + '</span>' + badge + '</div>' +
            '<div class="st-cmp-l"><small>این دوره</small><div class="st-hb-bar st-tube"><i class="' + (x.cls === 'bal' ? (x.a < 0 ? 'exp' : 'inc') : x.cls) + '" style="animation-delay:' + (k * 120) + 'ms;width:' + w(x.a) + '%"></i></div><b>' + sg(x.a) + '</b></div>' +
            '<div class="st-cmp-l prev"><small>قبل</small><div class="st-hb-bar st-tube"><i class="prev" style="animation-delay:' + (k * 120 + 60) + 'ms;width:' + w(x.b) + '%"></i></div><b>' + sg(x.b) + '</b></div></div>';
        }).join('');
      }
      function render() {
        var root = document.getElementById('statsBody');
        if (!root) return;
        var R = buckets(), b = R.b, rows = R.rows;
        var showInc = st.type !== 'expense', showExp = st.type !== 'income';
        var inc = 0, exp = 0;
        b.forEach(function (x) { inc += x.inc; exp += x.exp; });
        var cs = cards();
        var nav = st.mode === 'yearly' ? '<span class="st-nav-l">' + periodLabel() + '</span>' :
          '<button type="button" class="st-nav-b" data-nav="-1" aria-label="قبلی">›</button><span class="st-nav-l">' + periodLabel() + '</span><button type="button" class="st-nav-b" data-nav="1" aria-label="بعدی">‹</button>';
        var html = '<div class="st-filters">' +
          '<div class="st-seg" role="tablist">' + [['daily', 'روزانه'], ['weekly', 'هفتگی'], ['monthly', 'ماهانه'], ['yearly', 'سالانه']].map(function (o) {
            return '<button type="button" data-mode="' + o[0] + '" class="' + (st.mode === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="st-row2">' +
            (cs.length > 1 ? dd('card', cs.map(function (t) { return [t, t]; }).concat([['', 'همهٔ کارت‌ها']])) : '') +
            dd('type', [['both', 'درآمد و مخارج'], ['income', 'فقط درآمد'], ['expense', 'فقط مخارج']]) +
            dd('status', [['all', 'همهٔ وضعیت‌ها'], ['paid', 'پرداخت‌شده'], ['unpaid', 'پرداخت‌نشده']]) +
          '</div>' +
          '<div class="st-nav">' + nav + '</div></div>';
        /* کاشی‌های خلاصه */
        var days = st.mode === 'daily' || st.mode === 'weekly' ? monthLen(st.y, st.m) : 0;
        var tiles = [];
        if (showInc) tiles.push(['درآمد کل', money(inc), 'pos']);
        if (showExp) tiles.push(['خرج کل', money(exp), 'neg']);
        if (showInc && showExp) tiles.push(['مانده کل', (inc - exp < 0 ? '−' : '') + money(Math.abs(inc - exp)), inc - exp < 0 ? 'neg' : 'pos']);
        if (showExp && days) tiles.push(['میانگین خرج روزانه', money(exp / days), '']);
        if (showExp && st.mode === 'monthly') tiles.push(['میانگین خرج ماهانه', money(exp / Math.max(1, b.filter(function (x) { return !x.off && (x.exp > 0 || x.inc > 0); }).length)), '']);
        html += '<div class="st-tiles">' + tiles.map(function (t) { return '<div class="st-tile"><small>' + t[0] + '</small><b class="' + t[2] + '">' + t[1] + '</b></div>'; }).join('') + '</div>';
        if (_skipped > 0 && showExp && (st.mode === 'monthly' || st.mode === 'yearly')) html += '<div class="st-skip-note">' + money(_skipped) + ' اقساطِ خودکارِ ماه‌های آینده یا ماه‌هایی که در آن‌ها ثبتی نداشته‌اید، در این جمع‌ها حساب نشده است.</div>';
        var any = inc > 0 || exp > 0;
        var legend = '<div class="st-keys">' + (showInc ? '<span><i class="st-dot inc"></i>درآمد</span>' : '') + (showExp ? '<span><i class="st-dot exp"></i>مخارج</span>' : '') + '</div>';
        var titles = { daily: 'روزهای ماه', weekly: 'هفته‌های ماه', monthly: 'ماه‌های سال', yearly: 'سال‌ها' };
        html += card(showInc && showExp ? 'درآمد و مخارج — ' + titles[st.mode] : (showInc ? 'درآمد' : 'مخارج') + ' — ' + titles[st.mode], 'برای جزئیات روی ستون بزنید', (showInc && showExp ? legend : '') + '<div class="st-chart" id="stBar"></div>');
        var cmp = comparePrev();
        if (cmp) html += card('مقایسه با ' + cmp.prevLabel, periodLabel() + ' در برابر ' + cmp.prevLabel, '<div id="stCmp"></div>');
        if (showExp) html += card('دسته‌بندی مخارج', periodLabel(), '<div id="stCats"></div>');
        if (showExp && st.mode !== 'yearly') html += card('خرج بر اساس روز هفته', 'کدام روزها بیشتر خرج می‌کنید', '<div id="stWeek"></div>');
        if (showExp) html += card('وضعیت پرداخت مخارج', '', '<div id="stPay"></div>');
        if (!st.card && cs.length > 1) html += card('مقایسهٔ کارت‌ها', showExp ? 'خرج هر کارت' : 'درآمد هر کارت', '<div id="stCards"></div>');
        html += card(showExp ? 'بیشترین خرج‌ها' : 'بیشترین درآمدها', periodLabel(), '<div id="stTop"></div>');
        root.innerHTML = html + (any ? '' : '<div class="st-empty big">برای این بازه ثبتی وجود ندارد</div>');
        /* نمودارها پس از قرارگیری در صفحه (عرض واقعی) */
        try { barChart(document.getElementById('stBar'), b, showInc, showExp); } catch (e1) {}
        try { if (cmp && document.getElementById('stCmp')) compareChart(document.getElementById('stCmp'), cmp, showInc, showExp); } catch (e2) {}
        var expRows = rows.filter(function (x) { return x.kind === 'expense'; });
        if (document.getElementById('stCats')) {
          var cm = {}, tot = 0;
          expRows.forEach(function (x) {
            var a = amt(x); if (!a) return; tot += a;
            var c = null; try { c = HKCategorizer.classify(x.desc, x.row); } catch (e) {}
            if (!c) { cm['نامشخص'] = (cm['نامشخص'] || 0) + a; return; }
            c.ids.forEach(function (id) { var l = HKCategorizer.byId[id].label; cm[l] = (cm[l] || 0) + a / c.ids.length; });
          });
          var cl = Object.keys(cm).map(function (k) { return { label: k, amount: cm[k] }; }).sort(function (p, q) { return q.amount - p.amount; });
          var un = cl.filter(function (x) { return x.label === 'نامشخص'; });
          cl = cl.filter(function (x) { return x.label !== 'نامشخص'; }).concat(un);
          var el = document.getElementById('stCats');
          if (tot > 0) donut(el, cl, tot, 'جمع مخارج'); else el.innerHTML = '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
        }
        if (document.getElementById('stWeek')) {
          var wd = [0, 0, 0, 0, 0, 0, 0];
          expRows.forEach(function (x) { if (x.d) wd[weekday(x.y, x.m, x.d)] += amt(x); });
          hbars(document.getElementById('stWeek'), WEEKDAYS.map(function (n, i) { return { label: n, amount: wd[i] }; }), 'exp');
        }
        if (document.getElementById('stPay')) {
          var pp = 0, uu = 0;
          expRows.forEach(function (x) { if (st.status !== 'unpaid') pp += x.paid; if (st.status !== 'paid') uu += x.unpaid; });
          var tt = pp + uu;
          document.getElementById('stPay').innerHTML = tt > 0 ?
            '<div class="st-stack"><i class="paid" style="width:' + (pp / tt * 100).toFixed(1) + '%"></i><i class="unpaid" style="width:' + (uu / tt * 100).toFixed(1) + '%"></i></div>' +
            '<div class="st-keys"><span><i class="st-dot paid"></i>پرداخت‌شده ' + fa(Math.round(pp / tt * 100)) + '٪ — ' + money(pp) + '</span><span><i class="st-dot unpaid"></i>پرداخت‌نشده ' + fa(Math.round(uu / tt * 100)) + '٪ — ' + money(uu) + '</span></div>'
            : '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
        }
        if (document.getElementById('stCards')) {
          var kind = showExp ? 'expense' : 'income', byc = {};
          rows.forEach(function (x) { if (x.kind === kind) byc[x.title] = (byc[x.title] || 0) + amt(x); });
          hbars(document.getElementById('stCards'), cs.map(function (t) { return { label: t, amount: byc[t] || 0 }; }).sort(function (p, q) { return q.amount - p.amount; }), kind === 'expense' ? 'exp' : 'inc');
        }
        var kindT = showExp ? 'expense' : 'income';
        var top = rows.filter(function (x) { return x.kind === kindT && amt(x) > 0; }).sort(function (p, q) { return amt(q) - amt(p); }).slice(0, 6);
        hbars(document.getElementById('stTop'), top.map(function (x) {
          return { label: (x.desc || 'بدون شرح') + '، ' + (x.d ? fa(x.d) + ' ' : '') + MONTHS[x.m - 1], amount: amt(x) };
        }), kindT === 'expense' ? 'exp' : 'inc');
        bind(root);
      }
      function bind(root) {
        root.querySelectorAll('[data-mode]').forEach(function (bt) { bt.onclick = function () { st.mode = bt.getAttribute('data-mode'); render(); }; });
        root.querySelectorAll('.st-dd').forEach(function (b) { b.onclick = function () { openDd(b); }; });
        root.querySelectorAll('[data-nav]').forEach(function (bt) {
          bt.onclick = function () {
            var dir = +bt.getAttribute('data-nav');
            if (st.mode === 'monthly') st.y += dir;
            else { st.m += dir; if (st.m > 12) { st.m = 1; st.y++; } if (st.m < 1) { st.m = 12; st.y--; } }
            render();
          };
        });
      }
      /* ۱.۳.۴۸: opts = { mode, card, focus } — از باکس هوشمند مستقیم روی تب و بخش مرتبط باز می‌شود */
      function open(opts) {
        opts = opts || {};
        try { closeSideMenu(); } catch (e) {}
        try { persistCurrent(); } catch (e0) {}
        st.y = currentYear; st.m = currentMonth;
        /* پیش‌فرض: کارت اول (گزینهٔ «همهٔ کارت‌ها» آخر فهرست است) */
        var cs0 = cards(); st.card = cs0[0] || '';
        if (opts.card && cs0.indexOf(opts.card) >= 0) st.card = opts.card;
        if (opts.mode) st.mode = opts.mode;
        var sh = document.getElementById('statsSheet');
        if (!sh) return;
        sh.classList.add('open');
        sh.setAttribute('aria-hidden', 'false');
        try { lockBodyScroll(); } catch (e1) {}
        /* هر بار باز شدن: از بالای صفحه (فیلترهای روزانه/هفتگی/...) شروع شود */
        var body0 = document.getElementById('statsBody');
        if (body0) body0.scrollTop = 0;
        requestAnimationFrame(function () {
          render(); var b1 = document.getElementById('statsBody');
          if (b1) { b1.scrollTop = 0; requestAnimationFrame(function () { b1.scrollTop = 0; }); }
          if (opts.focus) setTimeout(function () {
            var f = document.getElementById(opts.focus), sec = f && f.closest('.st-card');
            if (sec && b1) { try { hkSlowScrollTo(sec, 700); } catch (eF) {} }
          }, 360);
        });
      }
      function close() {
        var sh = document.getElementById('statsSheet');
        if (!sh || !sh.classList.contains('open')) return false;
        closeDd();
        sh.classList.remove('open');
        sh.setAttribute('aria-hidden', 'true');
        try { unlockBodyScroll(); } catch (e) {}
        return true;
      }
      return { open: open, close: close, render: render, _weekday: weekday, _monthLen: monthLen };
    })();
    function openStatsSheet(opts) { setTimeout(function () { HKStats.open(opts && opts.type ? null : opts); }, 40); }

    function closeSideMenu() {
      /* ۱.۳.۸۰: بستن منو جستجویش را همیشه غیرفعال می‌کند (متن پاک، کیبورد بسته، فهرست کامل) */
      try { var _msi = document.getElementById('menuSearchInput'); if (_msi && document.activeElement === _msi) _msi.blur(); hkMenuSearchClear(); } catch (eMs) {}
      /* ۱.۳.۸۲: ویرایش نام کاربر با بسته شدن منو لغو می‌شود تا کیبورد روی صفحهٔ اصلی باز نماند */
      try { var _nm = document.getElementById('menuUserNameText'); if (_nm && _nm.querySelector('input') && typeof _nm._hkCancelEdit === 'function') _nm._hkCancelEdit(); var _ae = document.activeElement; if (_ae && _ae.closest && _ae.closest('#menuDropdown') && _ae.blur) _ae.blur(); } catch (eNe) {}
      try { if (typeof hkToggleProfile === 'function') hkToggleProfile(false); } catch (eTp) {}
      const menu = document.getElementById('menuDropdown');
      const bd = document.getElementById('menuBackdrop');
      if (menu) menu.classList.remove('open');
      if (bd) bd.classList.remove('open');
      document.body.classList.remove('menu-open');
      unbindMenuBlockers();
    }
    function toggleMenu() {
      const menu = document.getElementById('menuDropdown');
      if (!menu) return;
      if (menu.classList.contains('open')) closeSideMenu();
      else openSideMenu();
    }
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('menuDropdown');
      const btn = document.getElementById('menuBtn');
      const bd = document.getElementById('menuBackdrop');
      if (!menu || !btn) return;
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      if (bd && e.target === bd) closeSideMenu();
      else if (!menu.contains(e.target)) closeSideMenu();
    });



    function askResetCurrentMonth() {
      closeSideMenu();
      askConfirm('اطلاعات این ماه حذف شود؟', () => safetyBackupThen('reset-month', () => {
        try {
          // کل ماه جاری به سطل
          var _mName = (MONTHS[currentMonth - 1] || ('ماه ' + currentMonth));
          pushToTrash('period_month', _mName + ' ' + toPersianDigits(currentYear), {
            periodKey: periodKey(currentYear, currentMonth),
            periodData: JSON.parse(JSON.stringify(periodData)),
            year: currentYear,
            month: currentMonth,
            sourceLabel: 'پاک کردن ماه'
          });
        } catch (e) { console.warn(e); }
        /* کارت‌ها (نام، رنگ، ترتیب) می‌مانند و فقط ردیف‌ها پاک می‌شوند؛ نه برگشت به «نام کاربر» */
        var _keep = { income: [], expense: [] }, _ord = periodData.personCardOrder;
        ['income', 'expense'].forEach(function (tab) {
          ((periodData[tab] && periodData[tab].sections) || []).forEach(function (sc) {
            if (sc && (sc.title || '').trim()) _keep[tab].push({ id: sc.id, title: sc.title, color: sc.color, collapsed: false, rows: [emptyRow(tab)] });
          });
        });
        periodData = emptyPeriodData();
        ['income', 'expense'].forEach(function (tab) {
          if (_keep[tab].length && periodData[tab]) { periodData[tab].sections = _keep[tab]; periodData[tab].nextId = Math.max(periodData[tab].nextId || 1, _keep[tab].length + 1); }
        });
        if (Array.isArray(_ord) && _ord.length) periodData.personCardOrder = _ord.slice();
        persistCurrent();
        saveArchive();
        renderAll();
        showToast('این ماه به سطل زباله منتقل شد');
      }));
    }

    function askResetAllData() {
      closeSideMenu();
      askConfirm('تمامی اطلاعات حذف شود؟', () => safetyBackupThen('reset-all', () => {
        try {
          pushToTrash('full_backup', 'کل اطلاعات', {
            sourceLabel: 'پاک کردن همه آرشیو',
            archive: JSON.parse(JSON.stringify(archive || {})),
            plans: JSON.parse(JSON.stringify(plans || [])),
            periodData: JSON.parse(JSON.stringify(periodData || emptyPeriodData())),
            recurringIncomes: JSON.parse(JSON.stringify(recurringIncomes || [])),
            year: currentYear,
            month: currentMonth
          });
        } catch (e) { console.warn(e); }
        archive = {};
        plans = [];
        periodData = emptyPeriodData();
        try { recurringIncomes = []; saveRecurring(); } catch (e) {}
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY + '_meta');
        try { localStorage.removeItem(familyStorageKey(familyCode)); } catch (e) {}
        try { hkMirrorClear(); } catch (eMc) {}
        localStorage.removeItem('hesabKetabArchive_v4');
        localStorage.removeItem('hesabKetabArchive_v3');
        localStorage.removeItem('hesabKetabArchive_v2');
        localStorage.removeItem('hesabKetabArchive_v1');
        renderAll();
        try { renderPlans(); renderRecurringBar(); renderLedgerTab(); } catch (e) {}
        showToast('همه اطلاعات به سطل زباله منتقل شد');
      }));
    }

