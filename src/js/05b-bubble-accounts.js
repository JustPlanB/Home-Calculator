    /* ===== ۱.۳.۷۸: نگه‌داشتن دایرهٔ موجودی = حباب‌های حساب‌ها — به تعداد حساب‌ها حباب از دایره پخش می‌شود و آرام و نامنظم در صفحه شناور است؛
       داخل هر حباب اسم و موجودی آن حساب (سبز مثبت، نارنجی منفی) و نقطه‌های پروژه؛ با رها کردن آرام محو می‌شوند.
       بیش از ۱۰ ثانیه نگه‌داشتن: حباب‌ها به هم می‌خورند، می‌ترکند و نگه‌داشتن تمام می‌شود ===== */
    var _hkBub = null;
    function hkBubbleAccounts() {
      var map = {}; try { map = globalAccountBalances() || {}; } catch (e) {}
      var order = []; try { order = selectedAccountLabels() || []; } catch (e2) {}
      var linked = {}; try { linked = hkInstLinkedLabels(); } catch (e3) {}
      return order.filter(function (k) { return k && !linked[k]; }).map(function (k) { return { label: k, v: Math.round(Number(map[k]) || 0), cols: (function () { try { return hkAccountProjectColors(k); } catch (e4) { return []; } })() }; });
    }
    function hkBubblesStart(fromEl) {
      hkBubblesEnd(true);
      var accs = hkBubbleAccounts(); if (!accs.length) return false;
      var W = innerWidth, H = innerHeight, r0 = fromEl.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      var ov = document.createElement('div'); ov.id = 'hkBubbles'; ov.className = 'hk-bubbles'; ov.setAttribute('data-hk-back', '1');
      /* ۱.۳.۸۰: اعوجاج ملایم صفحهٔ پشت حباب (مثل نگاه از پشت حباب صابون) */
      if (!document.getElementById('hkBubWarpSvg')) {
        var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.id = 'hkBubWarpSvg'; sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        sv.innerHTML = '<filter id="hkBubWarp" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="15" xChannelSelector="R" yChannelSelector="G"/></filter>';
        document.body.appendChild(sv);
      }
      document.body.appendChild(ov);
      /* لمس جای خالی صفحه هیچ کاری نمی‌کند (به صفحهٔ پشت هم نمی‌رسد) */
      ['click', 'pointerup', 'touchstart', 'touchend'].forEach(function (ev) { ov.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); var t = e.target && e.target.closest ? e.target.closest('.hk-bub') : null; if (t) hkBubTap(t); });
      ov._hkCancel = function () { hkBubblesEnd(false); };
      var maxAbs = Math.max.apply(null, accs.map(function (a) { return Math.abs(a.v); }).concat([1]));
      var TOP = 56, BOT = 14, PAD = 8;
      /* ۱.۳.۷۹: ظاهر حباب واقعی (لبهٔ نازک رنگین‌کمانی، هلال‌های براق)؛ دور همه یکسان، پروژه فقط با نقطه‌های داخل؛ چند حباب کوچک خالی بینشان */
      var specs = accs.map(function (a) { return { a: a, size: Math.round(88 + 44 * Math.sqrt(Math.abs(a.v) / maxAbs)) }; });
      var nSmall = Math.max(4, Math.min(7, 9 - accs.length));
      for (var s0 = 0; s0 < nSmall; s0++) specs.push({ a: null, size: Math.round(22 + Math.random() * 26) });
      var list = specs.map(function (sp0, i) {
        var a = sp0.a, size = sp0.size;
        var el = document.createElement('div'); el.className = 'hk-bub' + (a ? (a.v < 0 ? ' neg' : '') : ' sm'); el.style.width = size + 'px'; el.style.height = size + 'px';
        el.style.setProperty('--hk-bub-rot', Math.round(Math.random() * 360) + 'deg');
        el.style.setProperty('--hk-bub-d', (10 + Math.random() * 8).toFixed(1) + 's');
        el.innerHTML = '<i class="wf"></i><i class="wp"></i><i class="ir"></i><i class="sh"></i>' + (a ? '<span class="nm"></span><b class="am"></b>' + (a.cols.length ? '<span class="ib-proj-dots">' + a.cols.map(function (c) { return '<i style="background:' + escapeHtml(c) + '"></i>'; }).join('') + '</span>' : '') : '');
        if (a) { el.querySelector('.nm').textContent = a.label; el.querySelector('.am').textContent = (a.v < 0 ? '−' : '') + formatNum(Math.abs(a.v)); }
        ov.appendChild(el);
        return { el: el, r: size / 2, acc: !!a, x: cx, y: cy, tx: 0, ty: 0, vx: 0, vy: 0, ph: Math.random() * 6.28, born: performance.now() + i * 60 };
      });
      /* جای نهایی هر حباب: پخش دور دایره و بعد از هم جدا (هم‌پوشانی نداشته باشند) */
      var nA = accs.length;
      list.forEach(function (b, i) {
        var ang = b.acc ? (Math.PI * 2 * i / nA) - Math.PI / 2 + (Math.random() * 0.6 - 0.3) : Math.random() * Math.PI * 2;
        var dist = Math.min(W, H) * (b.acc ? (0.26 + Math.random() * 0.1) : (0.18 + Math.random() * 0.3));
        b.tx = cx + Math.cos(ang) * dist; b.ty = cy - H * 0.18 + Math.sin(ang) * dist;
      });
      var clampT = function (b) { b.tx = Math.max(b.r + PAD, Math.min(W - b.r - PAD, b.tx)); b.ty = Math.max(b.r + TOP, Math.min(H - b.r - BOT, b.ty)); };
      for (var it = 0; it < 160; it++) {
        list.forEach(clampT);
        for (var p = 0; p < list.length; p++) for (var q = p + 1; q < list.length; q++) {
          var A = list[p], B = list[q], dx = B.tx - A.tx, dy = B.ty - A.ty, d = Math.hypot(dx, dy) || 0.01, need = A.r + B.r + 10;
          if (d < need) { var k = (need - d) / 2 / d; A.tx -= dx * k; A.ty -= dy * k; B.tx += dx * k; B.ty += dy * k; }
        }
      }
      list.forEach(function (b) { clampT(b); var sp = (b.acc ? 0.16 : 0.22) + Math.random() * 0.16, dir = Math.random() * Math.PI * 2; b.vx = Math.cos(dir) * sp; b.vy = Math.sin(dir) * sp; });
      list.forEach(function (b) { b.el._hkB = b; });
      var B0 = _hkBub = { ov: ov, list: list, t0: performance.now(), raf: 0, ending: false, popping: false, held: true };
      try { navigator.vibrate && navigator.vibrate(12); } catch (eV) {}
      var step = function (now) {
        if (!B0.ov.isConnected) return;
        var el = now - B0.t0;
        /* ۱.۳.۸۰: ترکیدن خودکار سر ۱۰ ثانیه فقط وقتی هنوز انگشت روی دایره است */
        if (!B0.popping && B0.held && !B0.fading && el > 10000) { B0.popping = now; list.forEach(function (b) { b.vx *= 0.3; b.vy *= 0.3; }); }
        var mx = W / 2, my = H * 0.44;
        list.forEach(function (b) {
          var k = Math.min(1, Math.max(0, (now - b.born) / 900)), e = 1 - Math.pow(1 - k, 3);
          if (B0.popping) {
            /* سر ۱۰ ثانیه: آرام به سمت هم می‌روند (سرعت کم) تا به هم برسند */
            var dx = mx - b.x, dy = my - b.y, d = Math.hypot(dx, dy) || 1;
            b.vx += dx / d * 0.035; b.vy += dy / d * 0.035; b.vx *= 0.96; b.vy *= 0.96;
            var spd = Math.hypot(b.vx, b.vy), cap = 1.1; if (spd > cap) { b.vx *= cap / spd; b.vy *= cap / spd; }
            b.x += b.vx; b.y += b.vy;
          } else if (k < 1) { b.x = cx + (b.tx - cx) * e; b.y = cy + (b.ty - cy) * e; }
          else {
            b.ph += 0.012; b.x += b.vx + Math.sin(b.ph) * 0.1; b.y += b.vy + Math.cos(b.ph * 0.8) * 0.1;
            if (b.x < b.r + PAD) { b.x = b.r + PAD; b.vx = Math.abs(b.vx); } else if (b.x > W - b.r - PAD) { b.x = W - b.r - PAD; b.vx = -Math.abs(b.vx); }
            if (b.y < b.r + TOP) { b.y = b.r + TOP; b.vy = Math.abs(b.vy); } else if (b.y > H - b.r - BOT) { b.y = H - b.r - BOT; b.vy = -Math.abs(b.vy); }
          }
        });
        /* پیش از ۱۰ ثانیه: به هم نمی‌خورند — نزدیک که شوند آرام از هم دور می‌شوند */
        if (!B0.popping) {
          for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
            var a1 = list[i], c1 = list[j];
            if (now - a1.born < 900 || now - c1.born < 900) continue;
            var ddx = c1.x - a1.x, ddy = c1.y - a1.y, dd = Math.hypot(ddx, ddy) || 0.01, gap = a1.r + c1.r + 14;
            if (dd < gap) {
              var nx = ddx / dd, ny = ddy / dd, push = (gap - dd) * 0.02;
              a1.vx -= nx * push; a1.vy -= ny * push; c1.vx += nx * push; c1.vy += ny * push;
              if (dd < a1.r + c1.r + 2) { var o = (a1.r + c1.r + 2 - dd) / 2; a1.x -= nx * o; a1.y -= ny * o; c1.x += nx * o; c1.y += ny * o; }
            }
          }
          list.forEach(function (b) { var spd = Math.hypot(b.vx, b.vy), mxs = b.acc ? 0.34 : 0.45, mns = 0.1; if (spd > mxs) { b.vx *= mxs / spd; b.vy *= mxs / spd; } else if (spd < mns && spd > 0) { b.vx *= mns / spd; b.vy *= mns / spd; } });
        }
        list.forEach(function (b) {
          var k = Math.min(1, Math.max(0, (now - b.born) / 900)), e = 1 - Math.pow(1 - k, 3);
          b.el.style.transform = 'translate(' + (b.x - b.r) + 'px,' + (b.y - b.r) + 'px) scale(' + (0.3 + 0.7 * e) + ')';
          b.el.style.opacity = String(Math.min(1, e * 1.4));
        });
        if (B0.popping && !B0.fading) {
          /* برخورد (با سرعت کم) → ترکیدن */
          var hit = false;
          for (var i2 = 0; i2 < list.length && !hit; i2++) for (var j2 = i2 + 1; j2 < list.length; j2++) { var a2 = list[i2], c2 = list[j2]; if (Math.hypot(a2.x - c2.x, a2.y - c2.y) <= (a2.r + c2.r)) { hit = true; break; } }
          if (hit || list.length < 2 || now - B0.popping > 6000) { hkBubblesPop(); return; }
        }
        B0.raf = requestAnimationFrame(step);
      };
      B0.raf = requestAnimationFrame(step);
      return true;
    }
    function hkBubDrops(B, b) {
      for (var k = 0; k < 8; k++) {
        var d = document.createElement('i'); d.className = 'hk-bub-drop'; var a = Math.PI * 2 * k / 8 + Math.random() * 0.4;
        d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; d.style.setProperty('--dx', Math.cos(a) * (b.r + 30) + 'px'); d.style.setProperty('--dy', Math.sin(a) * (b.r + 30) + 'px');
        B.ov.appendChild(d);
        (function (dd) { setTimeout(function () { try { dd.remove(); } catch (e) {} }, 700); })(d);
      }
    }
    function hkBubPopOne(B, b) {
      var ix = B.list.indexOf(b); if (ix < 0) return; B.list.splice(ix, 1);
      b.el.classList.add('pop'); hkBubDrops(B, b);
      setTimeout(function () { try { b.el.remove(); } catch (e) {} }, 420);
    }
    /* ۱.۳.۸۰: زدن روی حباب موجودی = ترکیدن همان و چند حباب کوچک نزدیکش؛ آخرین حباب موجودی = همهٔ کوچک‌های باقی‌مانده هم */
    function hkBubTap(el) {
      var B = _hkBub; if (!B || B.fading || B.ending) return;
      var b = el._hkB; if (!b || B.list.indexOf(b) < 0 || !b.acc) return;
      try { navigator.vibrate && navigator.vibrate(18); } catch (eV) {}
      hkBubPopOne(B, b);
      var accLeft = B.list.filter(function (x) { return x.acc; }).length;
      var smalls = B.list.filter(function (x) { return !x.acc; });
      if (!accLeft) {
        smalls.forEach(function (x, i) { setTimeout(function () { hkBubPopOne(B, x); }, 60 + i * 70); });
        B.ending = true;
        setTimeout(function () { if (_hkBub === B) _hkBub = null; try { B.ov.remove(); } catch (e) {} }, 60 + smalls.length * 70 + 650);
        return;
      }
      smalls.sort(function (p, q) { return Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y); });
      var n = Math.min(smalls.length, 2 + Math.round(Math.random()));
      smalls.slice(0, n).forEach(function (x, i) { setTimeout(function () { hkBubPopOne(B, x); }, 90 + i * 90); });
    }
    window._hkBubAlive = function () { return !!(_hkBub && !_hkBub.fading && !_hkBub.ending); };
    function hkBubblesPop() {
      var B = _hkBub; if (!B || B.ending) return; B.ending = true; cancelAnimationFrame(B.raf);
      try { navigator.vibrate && navigator.vibrate([20, 40, 30]); } catch (eV) {}
      B.list.forEach(function (b) { b.el.classList.add('pop'); hkBubDrops(B, b); });
      if (window._hkBubPress) window._hkBubPress.done = true;
      setTimeout(function () { if (_hkBub === B) _hkBub = null; try { B.ov.remove(); } catch (e) {} }, 700);
    }
    /* now=true: فوری پاک؛ وگرنه (برگشت): همهٔ حباب‌ها در حال حرکت آرام محو می‌شوند */
    function hkBubblesEnd(now) {
      var B = _hkBub; if (!B) return;
      if (now) { B.ending = true; cancelAnimationFrame(B.raf); _hkBub = null; try { B.ov.remove(); } catch (e) {} return; }
      if (B.fading || B.ending) return;
      B.fading = true; B.held = false;
      B.ov.classList.add('out');
      setTimeout(function () { cancelAnimationFrame(B.raf); if (_hkBub === B) _hkBub = null; try { B.ov.remove(); } catch (e) {} }, 950);
    }
    (function () {
      var bind = function () {
        var c = document.getElementById('homeBalanceCircle'); if (!c || c._hkBub) return; c._hkBub = true;
        var tm = 0, sx = 0, sy = 0, active = false, suppress = false;
        c.addEventListener('pointerdown', function (e) {
          if (e.button > 0) return; sx = e.clientX; sy = e.clientY; active = false; suppress = false;
          window._hkBubPress = { done: false };
          clearTimeout(tm); tm = setTimeout(function () { if (hkBubblesStart(c)) { active = true; suppress = true; } }, 480);
        });
        c.addEventListener('pointermove', function (e) { if (!active && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) clearTimeout(tm); });
        /* ۱.۳.۸۰: رها کردن = حباب‌ها روی صفحه می‌مانند (فقط ترکاندن یا برگشت) */
        var up = function () { clearTimeout(tm); if (active) { active = false; if (_hkBub) _hkBub.held = false; } };
        c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('pointerleave', function () { if (!active) clearTimeout(tm); });
        window.addEventListener('pointerup', up, true);
        c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        c.addEventListener('click', function (e) { if (suppress) { suppress = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 500); }); else setTimeout(bind, 500);
      setTimeout(bind, 2500);
    })();
    try { Object.assign(window, { hkBubblesStart: hkBubblesStart, hkBubblesEnd: hkBubblesEnd, hkBubblesPop: hkBubblesPop, hkBubTap: hkBubTap }); } catch (eWb) {}
    function closeInstantBalance() {
      _instantBalOpen = false;
      try {
        const ov = document.getElementById('instantBalOverlay');
        if (ov) ov.classList.remove('open');
      } catch (e) {}
    }
    function openInstantBalance(title) {
      try {
        const ov = document.getElementById('instantBalOverlay');
        const panel = document.getElementById('instantBalPanel');
        if (!ov || !panel) return;
        const map = (typeof globalAccountBalances === 'function') ? globalAccountBalances() : personAccountBalances(title);
        const keys = Object.keys(map);
        /* همان ترتیب حساب‌ها در ویجت (ترتیب ساخت حساب‌ها)؛ بقیه بعد از آن‌ها */
        const _order = (typeof selectedAccountLabels === 'function') ? selectedAccountLabels() : [];
        keys.sort(function(a, b) {
          var ia = _order.indexOf(a), ib = _order.indexOf(b);
          if (ia < 0) ia = 1e6; if (ib < 0) ib = 1e6;
          return (ia - ib) || String(a).localeCompare(String(b), 'fa');
        });
        let html = '<div class="instant-bal-head">موجودی آنی' +
          '<div class="instant-bal-sub">موجودی واقعی کارت (شامل موجودی اولیه و پول پروژه‌ها)</div></div>';
        var shown = 0;
        /* فقط حساب‌هایی که کاربر ساخته/بازیابی کرده */
        var allowed = {};
        try {
          (selectedBankAccounts || []).forEach(function(a) {
            if (!a) return;
            var lb = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
            if (lb) allowed[lb] = true;
            if (a.bank) allowed[String(a.bank)] = true;
            if (a.name) allowed[String(a.name)] = true;
          });
        } catch (eAl) {}
        if (hkIsFutureView()) {
          html += '<div class="instant-bal-sub" style="margin:6px 0 4px;">موجودی ماه آینده هنوز مشخص نیست</div>';
          Object.keys(allowed).forEach(function(k) {
            if (!(typeof isLiveAccountLabel !== 'function' || isLiveAccountLabel(k))) return;
            if ((selectedAccountLabels() || []).indexOf(k) < 0) return;
            html += '<div class="instant-bal-row ib-acc-row"><span class="ib-name">' + escapeHtml(k) + '</span><span class="ib-amt">—</span></div>';
          });
          panel.innerHTML = html;
          ov.classList.add('open');
          _instantBalOpen = true;
          return;
        }
        var _instLinked = {}; try { _instLinked = hkInstLinkedLabels(); } catch (eIl) {}
        keys.forEach(function(k) {
          const v = Number(map[k]) || 0;
          if (!k || k === 'بدون حساب') return;
          /* ۱.۳.۷۴: کارت قسط در موجودی آنی نمی‌آید */
          if (_instLinked[k]) return;
          if (Object.keys(allowed).length && !allowed[k]) return;
          if (v === 0) return;
          shown++;
          html += '<div class="instant-bal-row ib-acc-row" data-acc="' + escapeHtml(k) + '" data-amt="' + String(v) + '">' +
            '<div class="ib-check-wrap">' +
            '<input type="checkbox" class="ib-acc-check" data-amt="' + String(v) + '" />' +
            '<span class="ib-name">' + escapeHtml(k) + '</span>' +
            ibProjectBadge(k) +
            '</div>' +
            '<span class="ib-amt ib-amt-click ' + (v >= 0 ? 'pos' : 'neg') + '">' + formatNum(v) + '</span></div>';
        });
        if (!shown) {
          html += '<div class="instant-bal-row"><span class="ib-name">حسابی با موجودی نیست</span><span class="ib-amt">۰</span></div>';
        }
        html += '<div class="instant-bal-row ib-sum-row"><span class="ib-name">جمع انتخاب‌شده</span>' +
          '<span class="ib-amt ib-sum-amt pos">۰</span></div>';
        /* بخش تفکیک موجودی انتخاب‌شده — فقط نمایش؛ منطق موجودی آنی دست‌نخورده */
        html += '<div class="ib-breakdown" id="ibBreakdown">' +
          '' +
          '<div class="ib-breakdown-body" id="ibBreakdownBody"></div>' +
          '</div>';
        panel.innerHTML = html;
        function refreshIbSum() {
          var sum = 0;
          var selectedAccounts = Object.create(null);
          var accountSet = (typeof Set !== 'undefined') ? new Set() : null;
          panel.querySelectorAll('.ib-acc-check:checked').forEach(function(cb) {
            var amt = Number(cb.getAttribute('data-amt')) || 0;
            sum += amt;
            var row = cb.closest ? cb.closest('.ib-acc-row') : null;
            var acc = row ? (row.getAttribute('data-acc') || '') : '';
            if (acc) {
              selectedAccounts[acc] = true;
              if (accountSet) accountSet.add(acc);
            }
          });
          var el = panel.querySelector('.ib-sum-amt');
          if (el) {
            el.textContent = formatNum(sum);
            el.classList.remove('pos', 'neg');
            el.classList.add(sum < 0 ? 'neg' : 'pos');
          }
          /* تفکیک پروژه — فقط وقتی کارت مرتبط تیک خورده؛ بدون عنوان */
          try {
            var wrap = panel.querySelector('#ibBreakdown');
            var body = panel.querySelector('#ibBreakdownBody');
            if (!body) return;
            var EPS = 0.5;
            var projects = [];
            try {
              projects = (typeof loadFinancialSubjects === 'function' ? loadFinancialSubjects() : []).filter(function(s) {
                return s && s.id && s.id !== 'personal';
              });
            } catch (eP) { projects = []; }
            var hasSet = accountSet && typeof accountSet.has === 'function';
            var activeRows = [];
            var projectsCashTotal = 0;
            var projectsDebtTotal = 0;
            /* دیفالت: اگر هیچ کارتی تیک نخورده، چیزی نشان نده */
            if (!hasSet || accountSet.size === 0 || !projects.length) {
              if (wrap) wrap.classList.add('ib-bd-hidden');
              body.innerHTML = '';
              return;
            }
            /* ۱.۳.۵۴: پروژه تا همین ماه (جمع از ابتدا) روی همان کارت؛ تسویه‌شده نشان داده نمی‌شود */
            var monthKey = '<=' + periodKey(currentYear, currentMonth);
            projects.forEach(function(s) {
              var touches = (typeof projectTouchesAccounts === 'function')
                ? projectTouchesAccounts(s.id, accountSet, monthKey) : false;
              var cash = 0;
              if (typeof projectMoneyOnAccounts === 'function') {
                cash = Number(projectMoneyOnAccounts(s.id, accountSet, monthKey)) || 0;
              }
              /* طلب/بدهی فقط نسبت به حساب(های) انتخاب‌شده و همین ماه — نه جمع کل پروژه */
              var receivable = 0;
              if (typeof projectReceivableOnAccounts === 'function') {
                receivable = Number(projectReceivableOnAccounts(s.id, accountSet, monthKey)) || 0;
              } else {
                var rep = (typeof computeSubjectReport === 'function') ? computeSubjectReport(s.id) : null;
                receivable = Number(rep && rep.receivable) || 0;
              }
              var hasCash = Math.abs(cash) > EPS;
              var hasDebt = Math.abs(receivable) > EPS;
              /* فقط اگر به کارت انتخاب‌شده مربوط باشد */
              if (!touches && !hasCash) return;
              if (!hasCash && !hasDebt) return; /* تسویه */
              if (hasCash) projectsCashTotal += cash;
              if (hasDebt) projectsDebtTotal += receivable;
              var meta = (typeof getProjectHighlightMeta === 'function')
                ? getProjectHighlightMeta(s.highlightColor) : null;
              var accent = (meta && meta.accent) || '#d000ff';
              activeRows.push({
                name: s.name || 'پروژه',
                cash: cash,
                receivable: receivable,
                accent: accent
              });
            });
            if (!activeRows.length) {
              if (wrap) wrap.classList.add('ib-bd-hidden');
              body.innerHTML = '';
              return;
            }
            if (wrap) wrap.classList.remove('ib-bd-hidden');
            /* شخصی = جمع انتخاب − موجودی پروژه + بدهی پروژه (طلب کاربر) */
            var personal = sum - projectsCashTotal + projectsDebtTotal;
            var bd = '';
            activeRows.forEach(function(pr) {
              var bg = pr.accent || '#d000ff';
              /* بکگراند نیمه‌شفاف رنگ پروژه */
              var bgStyle = 'background:color-mix(in srgb, ' + bg + ' 28%, transparent);';
              /* ۱.۳.۹۹: برای هر پروژه یک ردیف: موجودی پروژه منهای بدهی‌اش به شما؛ مثبت = «موجودی پروژه»، منفی = «بدهی پروژه» */
              var net = (Number(pr.cash) || 0) - (Number(pr.receivable) || 0);
              if (Math.abs(net) <= EPS) return;
              bd += '<div class="instant-bal-row ib-bd-proj-row" style="' + bgStyle + '">' +
                '<span class="ib-bd-name">' +
                '<span class="ib-proj-dot" style="background:' + escapeHtml(pr.accent) + ';"></span>' +
                '<span class="ib-name">' + (net > 0 ? 'موجودی پروژه ' : 'بدهی پروژه ') + escapeHtml(pr.name) + '</span></span>' +
                '<span class="ib-amt ' + (net > 0 ? 'ib-bd-credit' : 'ib-bd-debt') + '">' + formatNum(Math.abs(net)) + '</span></div>';
            });
            bd += '<div class="instant-bal-row ib-bd-personal-row">' +
              '<span class="ib-bd-name"><span class="ib-name">موجودی با احتساب پروژه</span></span>' +
              '<span class="ib-amt ib-bd-personal">' + formatNum(personal) + '</span></div>';
            body.innerHTML = bd;
          } catch (eBd) {}
        }
        panel.querySelectorAll('.ib-acc-row').forEach(function(row) {
          var cb = row.querySelector('.ib-acc-check');
          if (!cb) return;
          function toggle() {
            cb.checked = !cb.checked;
            refreshIbSum();
          }
          cb.addEventListener('click', function(e) {
            e.stopPropagation();
            /* native toggle already applied */
            refreshIbSum();
          });
          row.addEventListener('click', function(e) {
            if (e.target === cb || (e.target && e.target.classList && e.target.classList.contains('ib-acc-check'))) return;
            toggle();
          });
        });
        refreshIbSum();
        ov.classList.add('open');
        _instantBalOpen = true;
      } catch (e) {}
    }

    let _activeHomeCardTitle = '';
    function setActiveHomeCardTitle(t) {
      t = (t || '').trim();
      if (t && t === _activeHomeCardTitle) return;
      _activeHomeCardTitle = t;
      try { if (_activeHomeCardTitle) sessionStorage.setItem('hesab_activeHomeCard', _activeHomeCardTitle); } catch (e) {}
    }
    function getActiveHomeCardTitle() {
      if (_activeHomeCardTitle) return _activeHomeCardTitle;
      try { _activeHomeCardTitle = sessionStorage.getItem('hesab_activeHomeCard') || ''; } catch (e) {}
      return _activeHomeCardTitle || '';
    }
    function scrollHomeCardsToTitle(title, smooth) {
      try {
        const box = document.getElementById('homeCards');
        if (!box || !title) return;
        const card = box.querySelector('.person-card:not(.hc-clone)[data-title="' + (window.CSS && CSS.escape ? CSS.escape(title) : title.replace(/"/g, '')) + '"]')
          || Array.from(box.querySelectorAll('.person-card:not(.hc-clone)')).find(function(el){ return (el.dataset.title || '') === title; });
        if (!card) return;
        homeCenterCard(box, card, !!smooth);
        try { updateHomeCardScales(box); } catch (eU) {}
      } catch (e) {}
    }
    /** ورق زدن یکی‌یکی از کارت اول تا کارت هدف */
    function animateHomeCardsToTitle(title, durationMs) {
      try {
        const box = document.getElementById('homeCards');
        if (!box || !title) return;
        const cards = Array.from(box.querySelectorAll('.person-card:not(.hc-clone)'));
        const targetIdx = cards.findIndex(function(el){ return (el.dataset.title || '') === title; });
        if (targetIdx < 0) return;
        // از کارت قبلی شروع کن و یک ورق بزن روی کارت جدید
        const fromIdx = Math.max(0, targetIdx - 1);
        if (cards[fromIdx]) {
          try { homeCenterCard(box, cards[fromIdx], false); } catch (e0) {}
        }
        if (targetIdx === fromIdx) {
          try { setActiveHomeCardTitle(title); } catch (e1) {}
          return;
        }
        setTimeout(function() {
          const card = cards[targetIdx];
          if (card) {
            try { homeCenterCard(box, card, true); } catch (eS) {}
          }
          setTimeout(function() {
            try { setActiveHomeCardTitle(title); } catch (e2) {}
          }, 420);
        }, 60);
      } catch (e) {}
    }
    let _detailContext = null;

    function enableHomeCardReorder(container) {
      return; // قابلیت سواپ کارت حذف شد
      if (!container || container._homeDragBound) return;
      container._homeDragBound = true;
      let active = null;
      let placeholder = null;
      let startY = 0;
      let grabOffsetY = 0;
      let longTimer = null;
      let pointerId = null;

      function clearDragStyles(card) {
        if (!card) return;
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.width = '';
        card.style.zIndex = '';
        card.style.opacity = '';
        card.style.transition = '';
        card.style.pointerEvents = '';
        card.style.transform = '';
        card.classList.remove('dragging-card');
      }

      function finishDrag(commit) {
        if (longTimer) { clearTimeout(longTimer); longTimer = null; }
        if (!active) return;
        const card = active;
        active = null;
        if (placeholder && placeholder.parentNode) {
          if (commit) {
            placeholder.parentNode.insertBefore(card, placeholder);
          }
          placeholder.parentNode.removeChild(placeholder);
        }
        placeholder = null;
        clearDragStyles(card);
        if (commit) {
          try {
            const order = Array.from(container.querySelectorAll('.person-card')).map(el => el.dataset.title).filter(Boolean);
            ['income', 'expense'].forEach(tab => {
              const list = periodData[tab] && periodData[tab].sections;
              if (!list) return;
              const map = {};
              list.forEach(s => { map[(s.title || '').trim()] = s; });
              const ordered = order.map(t => map[t]).filter(Boolean);
              list.forEach(s => { if (ordered.indexOf(s) < 0) ordered.push(s); });
              periodData[tab].sections = ordered;
            });
            scheduleSave();
          } catch (err) {}
        }
        try { renderHomeCards(); } catch (e) {}
      }

      container.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        if (e.target.closest && e.target.closest('button, input, a, .person-stat-box, .person-remain-box')) return;
        const card = e.target.closest && e.target.closest('.person-card');
        if (!card || !container.contains(card)) return;
        if (active) return;
        const y0 = e.clientY;
        const x0 = e.clientX;
        pointerId = e.pointerId;
        longTimer = setTimeout(() => {
          longTimer = null;
          active = card;
          const rect = card.getBoundingClientRect();
          grabOffsetY = y0 - rect.top;
          startY = y0;
          placeholder = document.createElement('div');
          placeholder.className = 'person-card-placeholder';
          placeholder.style.cssText = 'height:' + rect.height + 'px;margin:0 auto 14px auto;width:' + rect.width + 'px;border-radius:16px;border:1px dashed rgba(255,255,255,0.28);box-sizing:border-box;';
          card.parentNode.insertBefore(placeholder, card);
          card.classList.add('dragging-card');
          card.style.position = 'fixed';
          card.style.left = rect.left + 'px';
          card.style.width = rect.width + 'px';
          card.style.top = rect.top + 'px';
          card.style.zIndex = '2000';
          card.style.margin = '0';
          card.style.pointerEvents = 'none';
          card.style.opacity = '0.95';
          card.style.transition = 'none';
          try { card.setPointerCapture(pointerId); } catch (err) {}
          try { window.appHaptic(10); } catch (err) {}
        }, 450);

        const onMove = (ev) => {
          if (longTimer && (Math.abs(ev.clientY - y0) > 10 || Math.abs(ev.clientX - x0) > 10)) {
            clearTimeout(longTimer);
            longTimer = null;
          }
          if (!active || !placeholder) return;
          ev.preventDefault();
          const top = ev.clientY - grabOffsetY;
          active.style.top = top + 'px';
          const mid = top + active.offsetHeight / 2;
          const others = Array.from(container.querySelectorAll('.person-card, .person-card-placeholder')).filter(el => el !== active);
          for (const other of others) {
            const r = other.getBoundingClientRect();
            const om = r.top + r.height / 2;
            if (mid < om) {
              container.insertBefore(placeholder, other);
              break;
            } else {
              if (other.nextSibling) container.insertBefore(placeholder, other.nextSibling);
              else container.appendChild(placeholder);
            }
          }
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerup', onUp, true);
          window.removeEventListener('pointercancel', onUp, true);
          if (longTimer) { clearTimeout(longTimer); longTimer = null; return; }
          finishDrag(true);
        };
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
      }, { passive: true });
    }
    function unlockPageScroll() {
      try {
        document.body.classList.remove('modal-scroll-lock');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.touchAction = '';
      } catch (e) {}
    }
    /* ===== فاز افتر: کاروسل کارت‌ها، دایرهٔ موجودی، جستجوی مانده ===== */
    function sizeHomeCards(box) {
      box = box || document.getElementById('homeCards');
      if (!box) return;
      /* کاروسل تمام‌عرض صفحه شود تا لبهٔ کارت‌های کناری تا کنار صفحه دیده شود */
      var panel = document.getElementById('panel-home');
      var pr = panel ? panel.getBoundingClientRect() : null;
      if (!pr || !(pr.width > 0)) return;
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var insL = Math.max(0, Math.round(pr.left)), insR = Math.max(0, Math.round(vw - pr.right));
      document.documentElement.style.setProperty('--hc-il', insL + 'px');
      document.documentElement.style.setProperty('--hc-ir', insR + 'px');
      box.style.setProperty('margin-left', (-insL) + 'px', 'important');
      box.style.setProperty('margin-right', (-insR) + 'px', 'important');
      box.style.setProperty('width', vw + 'px', 'important');
      box.style.setProperty('max-width', 'none', 'important');
      var W = box.clientWidth || box.offsetWidth;
      if (!(W > 0)) return;
      /* عرض کارت = عرض باکس‌های منو (عرض محتوا)؛ کارت بعدی کاملاً بیرون از دید */
      var cw = Math.max(0, Math.round(W - insL - insR)), gap = Math.max(12, insL + insR);
      /* کارت اول دقیقاً از لبهٔ راست سایر باکس‌ها شروع می‌شود (insR)؛ سمت چپ کمی حاشیه برای کارت + */
      box.style.setProperty('padding-left', Math.max(insL, 0) + 'px', 'important');
      box.style.setProperty('padding-right', insR + 'px', 'important');
      box.style.setProperty('gap', gap + 'px', 'important');
      box._hcDist = cw + gap;
      var firstH = 0;
      box.querySelectorAll('.person-card').forEach(function (c) {
        c.style.setProperty('width', cw + 'px', 'important');
        c.style.setProperty('min-width', cw + 'px', 'important');
        c.style.setProperty('max-width', cw + 'px', 'important');
        c.style.setProperty('flex', '0 0 ' + cw + 'px', 'important');
        if (!firstH) firstH = c.offsetHeight;
      });
      /* کارت ایجاد: کوچک‌تر از کارت اصلی، آیکون + در بخش نمایان */
      var cc = box.querySelector('.home-create-card');
      if (cc) {
        var gw = Math.round(cw * 0.5);
        var gh = Math.round((firstH || cw / 1.62) * 0.74);
        var iconR = Math.max(6, Math.min(gw - 50, 10));
        cc.style.setProperty('--cc-w', gw + 'px');
        cc.style.setProperty('--cc-h', gh + 'px');
        cc.style.setProperty('--cc-icon-r', iconR + 'px');
      }
    }
    /* فاصلهٔ مرکز کارت (بدون اثر transform) تا مرکز کاروسل؛ مستقل از RTL/LTR */
    function homeCardOffset(box, card) {
      var br = box.getBoundingClientRect();
      var W = card.offsetWidth, s0 = card._hs || 1, p0 = (card._hp == null) ? 0.5 : card._hp;
      var r = card.getBoundingClientRect();
      return (r.left - p0 * W * (1 - s0) + W / 2) - (br.left + br.width / 2);
    }
    function homeCenterCard(box, card, smooth) {
      var left = homeCardTarget(box, card);
      try {
        if (smooth) HomeCarousel.animateTo(box, left);
        else box.scrollLeft = left;
      } catch (e) { box.scrollLeft = left; }
    }
    /* scrollLeft لازم برای وسط آمدن کارت */
    function homeCardTarget(box, card) {
      var left;
      if (card.offsetParent === box) {
        /* موقعیت چیدمانی کارت (بدون اثر scale/transform) — دقیق و مستقل از انیمیشن */
        left = card.offsetLeft + card.offsetWidth / 2 - box.clientWidth / 2;
        var maxS = Math.max(0, box.scrollWidth - box.clientWidth);
        var rtl = getComputedStyle(box).direction === 'rtl';
        left = rtl ? Math.max(-maxS, Math.min(0, left)) : Math.max(0, Math.min(maxS, left));
      } else {
        left = box.scrollLeft + homeCardOffset(box, card);
      }
      return left;
    }
    /* کارت وسط کامل؛ کارت‌های کناری کوچک‌تر و لبهٔ داخلی‌شان ثابت (فقط لبهٔ آن‌ها دیده می‌شود) */
    function updateHomeCardScales(box) {
      box = box || document.getElementById('homeCards');
      if (!box) return null;
      var cards = box.querySelectorAll('.person-card');
      if (!cards.length) return null;
      var br = box.getBoundingClientRect(), mid = br.left + br.width / 2;
      var dist = box._hcDist || (cards[0].offsetWidth * 1.03) || 300;
      var padR = parseFloat(box.style.paddingRight) || 0;
      var best = null, bestD = 1e9;
      /* اول همهٔ اندازه‌ها خوانده می‌شود، بعد استایل‌ها نوشته می‌شوند (بدون reflow تکراری در هر فریم = بدون لگ) */
      var geo = [];
      cards.forEach(function (c) { geo.push([c.offsetWidth, c.getBoundingClientRect().left]); });
      cards.forEach(function (c, ci) {
        var W = geo[ci][0], s0 = c._hs || 1, p0 = (c._hp == null) ? 0.5 : c._hp;
        var cx = geo[ci][1] - p0 * W * (1 - s0) + W / 2;
        /* کارت اول جای «فعال» خودش را لبهٔ راست هم‌راستا می‌داند؛ بقیه مرکز */
        var focus = (ci === 0) ? (br.right - padR - W / 2) : mid;
        var o = cx - focus;
        var t = Math.min(1, Math.abs(o) / dist);
        /* کارت‌ها تمام‌عرض‌اند؛ scale حذف شد چون نقطهٔ اسنپ مرورگر از کادرِ transform‌شده
           محاسبه می‌شود و کارت جدید چند پیکسل کج می‌ایستاد. فقط محو شدن حفظ شده است */
        var sc = 1;
        var p = Math.max(0, Math.min(1, 0.5 - 0.5 * (o / dist)));
        c._hs = sc; c._hp = p;
        if (c.style.transform !== 'scale(1)') c.style.transform = 'scale(1)';
        /* کارت فعال کاملاً واضح؛ کارت‌های کناری به‌تدریج مات‌تر */
        var op = (1 - 0.62 * t).toFixed(3);
        if (c._op !== op || !c.style.opacity) { c._op = op; c.style.opacity = op; }
        var d = Math.abs(cx - mid);
        if (d < bestD) { bestD = d; best = c; }
      });
      return best;
    }
    (function () {
      var rz = 0;
      window.addEventListener('resize', function () {
        clearTimeout(rz);
        rz = setTimeout(function () {
          try { sizeHomeCards(); updateHomeCardScales(); } catch (e) {}
        }, 120);
      });
    })();

    /* —— Rolling number: ارقام چرخان، سریع و ظریف —— */
    var _HBC_SETS = ['0123456789', '۰۱۲۳۴۵۶۷۸۹', '٠١٢٣٤٥٦٧٨٩'];
    function _digitInfo(ch) {
      for (var k = 0; k < _HBC_SETS.length; k++) {
        var i = _HBC_SETS[k].indexOf(ch);
        if (i >= 0) return { idx: i, set: _HBC_SETS[k] };
      }
      return null;
    }
    function rollNumberInto(el, text, prev) {
      var reduce = false;
      try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      var chars = Array.from(text || '');
      var pchars = prev ? Array.from(prev) : [];
      var n = chars.length, H = 1.3, anim = [];
      el.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var ch = chars[i], di = _digitInfo(ch);
        if (!di) {
          var sp = document.createElement('span');
          sp.className = 'rn-s';
          sp.textContent = ch;
          el.appendChild(sp);
          continue;
        }
        var pc = pchars.length ? pchars[pchars.length - (n - i)] : null;
        var pdi = pc ? _digitInfo(pc) : null;
        var target = di.idx;
        /* فاصله چرخش */
        var fromIdx = pdi ? pdi.idx : target;
        var travel = ((fromIdx - target) % 10 + 10) % 10;
        if (travel === 0) travel = 10;
        else travel += 10;
        if (reduce) {
          travel = ((fromIdx - target) % 10 + 10) % 10;
        }
        /*
         * جهت برعکس حالت قبل:
         * قبلاً ایندکس زیاد می‌شد (نوار به بالا).
         * حالا از startAt به endAt کم می‌شود (نوار به پایین) و حتماً روی target می‌ایستد.
         */
        var endAt = target + 20;
        var startAt = endAt + travel;
        var d = document.createElement('span');
        d.className = 'rn-d';
        var strip = document.createElement('span');
        strip.className = 'rn-strip';
        var html = '';
        for (var k = 0; k < 60; k++) html += '<i>' + di.set.charAt(k % 10) + '</i>';
        strip.innerHTML = html;
        strip.style.transform = 'translate3d(0,' + (-startAt * H) + 'em,0)';
        d.appendChild(strip);
        el.appendChild(d);
        if (travel > 0) anim.push({ strip: strip, from: startAt, to: endAt, delay: i * 40 });
        else strip.style.transform = 'translate3d(0,' + (-endAt * H) + 'em,0)';
      }
      if (!anim.length) return;
      void el.offsetWidth;
      requestAnimationFrame(function () {
        anim.forEach(function (a, ai) {
          var fromEnd = anim.length - 1 - ai;
          var dur = 550;
          var ease = 'cubic-bezier(0.05, 0.85, 0.12, 1)';
          if (fromEnd === 0 && a.strip.animate) {
            /* رقم یکان: کند می‌شود، لحظه‌ای بالای عدد معلق می‌ماند و بعد مثل یک وزنهٔ سنگین
               با شتاب می‌افتد و روی عدد می‌نشیند (بدون ease-out نرم در آخر) */
            var hover = a.to + 0.3;
            var fin = 'translate3d(0,' + (-a.to * H) + 'em,0)';
            a.strip.style.transition = 'none';
            a.strip.style.transform = fin;
            try {
              a.strip.animate([
                { transform: 'translate3d(0,' + (-a.from * H) + 'em,0)', offset: 0, easing: 'cubic-bezier(0.22, 0.5, 0.3, 1)' },
                { transform: 'translate3d(0,' + (-hover * H) + 'em,0)', offset: 0.84, easing: 'cubic-bezier(0.6, 0, 0.9, 0.55)' },
                { transform: fin, offset: 1 }
              ], { duration: 2500, delay: a.delay, fill: 'backwards' });
              return;
            } catch (eAn) {}
          }
          if (fromEnd === 0) { dur = 2400; ease = 'cubic-bezier(0.35, 0.45, 0.15, 1)'; }
          else if (fromEnd === 1) { dur = 850; ease = 'cubic-bezier(0.02, 0.9, 0.08, 1)'; }
          a.strip.style.transition = 'transform ' + dur + 'ms ' + ease + ' ' + a.delay + 'ms';
          a.strip.style.transform = 'translate3d(0,' + (-a.to * H) + 'em,0)';
        });
      });
    }
    
    var _hbcLast = null;

    /* ناحیهٔ یادآورها (در صفحهٔ اصلی فعلاً مخفی؛ تنظیمات و منطق حفظ شده) */
    function syncHomeTopZone() {
      try {
        var z = document.getElementById('homeTopZone');
        if (!z) return;
        var rb = document.getElementById('remindBar');
        var ub = document.getElementById('userRemindBar');
        var vis = function (e) {
          if (!e) return false;
          if (e.classList.contains('open') || e.classList.contains('open-overlay')) return true;
          return window.getComputedStyle(e).display !== 'none';
        };
        var a = vis(rb), b = vis(ub);
        z.setAttribute('data-install', a ? '1' : '0');
        z.setAttribute('data-empty', (!a && !b) ? '1' : '0');
        var ch = document.getElementById('stickyChrome');
        if (ch) {
          var cs = window.getComputedStyle(ch);
          var rs = document.documentElement.style;
          rs.setProperty('--hz-l', cs.paddingLeft);
          rs.setProperty('--hz-r', cs.paddingRight);
        }
      } catch (e) {}
    }
    (function initHomeTopZone() {
      function go() {
        try {
          syncHomeTopZone();
          if (window.MutationObserver) {
            var mo = new MutationObserver(function () { syncHomeTopZone(); });
            ['remindBar', 'userRemindBar'].forEach(function (id) {
              var e = document.getElementById(id);
              if (e) mo.observe(e, { attributes: true, attributeFilter: ['style', 'class'] });
            });
          }
          window.addEventListener('resize', function () { syncHomeTopZone(); });
        } catch (e) {}
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else go();
    })();

    /* ۱.۳.۵۶: تراکنش‌های پیامکی که هنوز ثبت نشده‌اند (در صف) موقتاً روی موجودی و ویجت اعمال می‌شوند؛
       با ثبت یا رد کردن پیامک از صف بیرون می‌روند و عدد خودش درست می‌شود (دوبار حساب نمی‌شود) */
    function hkPendingDelta() {
      var out = { tot: 0, by: {}, today: 0, n: 0 };
      try {
        var list = (typeof smsPendingQueue !== 'undefined' && smsPendingQueue ? smsPendingQueue.slice() : []);
        if (typeof pendingSmsEntry !== 'undefined' && pendingSmsEntry) list.push(pendingSmsEntry);
        var t = getTodayPersian();
        list.forEach(function (p) {
          if (!p || p._hkDismissed) return;
          var a = Number(p.amount) || 0;
          if (!a || (p.type !== 'income' && p.type !== 'expense')) return;
          if (p.sender && hkIsPersonalSender(p.sender)) return;
          var sg = p.type === 'income' ? 1 : -1;
          out.tot += sg * a; out.n++;
          var lb = String(p.bank || '').trim();
          if (lb) out.by[lb] = (out.by[lb] || 0) + sg * a;
          if (sg < 0 && (!p.day || +p.day === t.d) && (!p.month || +p.month === t.m)) out.today += a;
        });
      } catch (e) {}
      return out;
    }
    function hkPendingRefresh() { setTimeout(function () { try { updateHomeBalanceCircle(); } catch (e) {} try { pushHomeWidget(); } catch (e2) {} }, 250); }
    var _hbcReady = false;
    var _hbcReplayAfterUnlock = false;
    function updateHomeBalanceCircle(force) {
      var amt = document.getElementById('homeBalanceAmt');
      if (!amt) return;
      /* قفل برنامه باز است: انیمیشن را نگه دار تا بعد از ورود (رمز/اثرانگشت) اجرا شود */
      try {
        var lk = document.getElementById('appLockOverlay');
        if (lk && lk.classList.contains('show')) { _hbcReplayAfterUnlock = true; if (force) _hbcLast = null; return; }
      } catch (eLk) {}
      /* تا پایان بوت، عدد موقت (جمع افتتاحیه بانک‌ها) نمایش داده نشود */
      if (!_hbcReady && !force) return;
      if (!force && amt._hbcBusy) { amt._hbcPend = true; return; }
      var iv = 0;
      try { if (typeof sumGlobalAccountBalances === 'function') iv = Number(sumGlobalAccountBalances()) || 0; } catch (e) {}
      try { var _pd = hkPendingDelta(); if (_pd.n && !hkIsFutureView()) iv += _pd.tot; } catch (ePd) {}
      if (!isFinite(iv)) iv = 0;
      var txt = (iv < 0 ? '-' : '') + formatNum(Math.abs(iv));
      try { pushHomeWidget(); } catch (eW) {}
      if (hkIsFutureView()) {
        /* ماه آینده: موجودی هنوز مشخص نیست */
        _hbcLast = '—';
        amt._hbcBusy = false;
        amt.textContent = '—';
        amt.style.color = 'var(--muted)';
        try { var btnF = document.getElementById('homeBalanceCircle'); if (btnF) btnF.setAttribute('aria-label', 'موجودی ماه آینده هنوز مشخص نیست'); } catch (eF) {}
        return;
      }
      if (!force && txt === _hbcLast) return;
      /* force: از null بچرخان روی عدد درست (افکت کامل حفظ شود؛ عدد موقت نشان داده نشود) */
      var prev = force ? null : _hbcLast;
      _hbcLast = txt;
      amt.style.color = iv < 0 ? '#ff6b4a' : (document.documentElement.getAttribute('data-theme') === 'light' ? '#17834a' : '#9ee858');
      /* ۱.۳.۶۸: مبلغ درشت داخل دایره؛ عددهای خیلی بلند کمی کوچک‌تر تا در دایره جا شوند */
      try { var _n = txt.length; amt.style.setProperty('--hbc-fs', _n <= 8 ? '19px' : (_n <= 10 ? '16px' : (_n <= 12 ? '14px' : '12px'))); } catch (eFs) {}
      var btn = document.getElementById('homeBalanceCircle');
      if (btn) btn.setAttribute('aria-label', 'موجودی آنی ' + txt);
      amt._hbcBusy = true;
      try { rollNumberInto(amt, txt, prev); } catch (eR) {}
      setTimeout(function(){
        try { amt._hbcBusy = false; } catch(e){}
        /* اگر در حین انیمیشن تغییری آمده بود که رد شده بود، حالا اعمالش کن */
        try { if (amt._hbcPend) { amt._hbcPend = false; updateHomeBalanceCircle(); } } catch(e2){}
      }, 1400);
    }
    /* ویجت صفحهٔ اصلی گوشی: موجودی + خرج امروز؛ با قفل برنامه مبالغ نمایش داده نمی‌شوند */
    var _widgetT = null;
    function pushHomeWidget() {
      clearTimeout(_widgetT);
      _widgetT = setTimeout(async function () {
        try {
          var C = window.Capacitor, P = C && C.Plugins && C.Plugins.HkWidget;
          if (!P || typeof P.update !== 'function' || !(C.isNativePlatform && C.isNativePlatform())) return;
          /* ویجت همیشه موجودی ماه جاری را نشان می‌دهد؛ وقتی ماه دیگری باز است به‌روز نشود */
          var _tw = getTodayPersian();
          if (currentYear !== _tw.y || currentMonth !== _tw.m) return;
          var bal = 0; try { bal = Number(sumGlobalAccountBalances()) || 0; } catch (e0) {}
          var t = getTodayPersian(), spent = 0;
          var key = periodKey(t.y, t.m);
          var pd = (key === periodKey(currentYear, currentMonth)) ? periodData : (archive && archive[key]);
          (((pd && pd.expense && pd.expense.sections) || [])).forEach(function (sec) {
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || r.p2p || (r.status || 'paid') !== 'paid') return;
              if (dayNum(r) === t.d) spent += Number(r.amount) || 0;
            });
          });
          var locked = false; try { locked = !!(await lockIsEnabled()); } catch (eL) {}
          /* ۱.۳.۵۶: پیامک‌های ثبت‌نشده (در صف) موقتاً حساب می‌شوند */
          var pdl = hkPendingDelta(); bal += pdl.tot; spent += pdl.today;
          /* ویجت حساب‌ها: موجودی هر حساب (کارت) جدا */
          var accs = [];
          try {
            var gb = globalAccountBalances() || {};
            selectedAccountLabels().forEach(function (lb) { var v = (Number(gb[lb]) || 0) + (pdl.by[lb] || 0); var pc = []; try { pc = hkAccountProjectColors(lb).map(hkHexColor).filter(Boolean); } catch (eP) {} accs.push({ l: lb, b: (v < 0 ? '-' : '') + formatNum(Math.abs(v)), n: v < 0, p: pc, v: v }); });
            /* موجودی کل (همان جمع نرم‌افزار، شامل ردیف‌های بدون حساب) — آخرین عضو با t:true */
            if (accs.length) { var tot = pdl.tot; Object.keys(gb).forEach(function (k) { tot += Number(gb[k]) || 0; }); accs.push({ l: 'موجودی کل', b: (tot < 0 ? '-' : '') + formatNum(Math.abs(tot)), n: tot < 0, t: true, v: tot }); }
          } catch (eA) {}
          /* چهار رقم آخر کارت → حساب (برای به‌روزرسانی ویجت در لحظهٔ رسیدن پیامک، وقتی نرم‌افزار بسته است) */
          var a4m = {}; try { Object.keys(smsAccountBankMap || {}).forEach(function (k) { if (k.indexOf('L4:') === 0 && smsAccountBankMap[k]) a4m[k.slice(3)] = smsAccountBankMap[k]; }); } catch (eM) {}
          await P.update({
            accounts: JSON.stringify(accs),
            title: 'حساب‌کتاب · ' + MONTHS[t.m - 1],
            month: toPersianDigits(String(t.d)) + ' ' + MONTHS[t.m - 1] + ' ' + toPersianDigits(String(t.y)),
            dayKey: t.y + '-' + t.m + '-' + t.d,
            todayNone: !(spent > 0),
            balance: (bal < 0 ? '-' : '') + formatNum(Math.abs(bal)),
            today: formatNum(spent),
            balRaw: Math.round(bal), todayRaw: Math.round(spent), acc4Map: JSON.stringify(a4m),
            /* ۱.۳.۶۴: پیامک‌هایی که این عدد حسابشان کرده یا تعیین تکلیف شده‌اند؛ بقیهٔ صف نیتیو دوباره روی ویجت اعمال می‌شود */
            seenNids: JSON.stringify(hkWidgetSeenNids()),
            negative: bal < 0,
            locked: locked,
            /* ۱.۳.۷۸: ویجت ردیف‌ها (مخارج / درآمدها)؛ با قفل برنامه ردیفی فرستاده نمی‌شود */
            txExp: JSON.stringify(locked ? [] : hkWidgetTxRows('expense')),
            txInc: JSON.stringify(locked ? [] : hkWidgetTxRows('income')),
            /* ۱.۳.۸۶: گزینهٔ «همه»: درآمد و مخارج با هم به ترتیب تاریخ */
            txAll: JSON.stringify(locked ? [] : hkWidgetTxRows('all')),
            light: document.documentElement.getAttribute('data-theme') === 'light'
          });
        } catch (e) {}
      }, 600);
    }
    /* ۱.۳.۷۸: آخرین ردیف‌های مخارج یا درآمدها برای ویجت ردیف‌ها — تازه‌ترین بالا؛ از ماه جاری به ماه‌های قبل */
    function hkWidgetTxRows(kind, max) {
      max = max || 300; /* ۱.۳.۹۱: ویجت این‌ها را ۲۰ تا ۲۰ تا با اسکرول نشان می‌دهد */
      var out = [];
      try {
        var t = getTodayPersian(), y = t.y, m = t.m;
        for (var i = 0; i < 36 && out.length < max; i++) {
          var key = periodKey(y, m);
          var pd = (key === periodKey(currentYear, currentMonth)) ? periodData : (archive && archive[key]);
          var list = [];
          (kind === 'all' ? ['expense', 'income'] : [kind]).forEach(function (kd) {
          (((pd && pd[kd] && pd[kd].sections) || [])).forEach(function (sec) {
            (sec.rows || []).forEach(function (r, ix) {
              if (!r || r.deletedAt || r.p2p) return;
              var a = Number(r.amount) || 0;
              if (!(a > 0)) return;
              /* ۱.۳.۸۸: پرداخت‌نشده/دریافت‌نشده هم می‌آید (زرد در ویجت) */
              list.push({ r: r, d: dayNum(r), k: Number(r.ts || r.createdAt || 0) || 0, i: ix, kd: kd });
            });
          });
          });
          list.sort(function (p, q) { return (q.d - p.d) || (q.k - p.k) || (q.i - p.i); });
          for (var j = 0; j < list.length && out.length < max; j++) {
            var r = list[j].r, a2 = Number(r.amount) || 0, kd2 = list[j].kd;
            var o = {
              d: list[j].d ? (toPersianDigits(String(list[j].d)) + ' ' + MONTHS[m - 1]) : MONTHS[m - 1],
              t: String(r.desc || '').trim() || (kd2 === 'income' ? 'درآمد' : 'خرج'),
              b: String(r.account || '').trim(),
              a: formatNum(a2)
            };
            /* «همه»: نوع ردیف (رنگ سبز/قرمز در ویجت) و علامت + / − کنار مبلغ */
            var _unp = (r.status || 'paid') !== 'paid';
            if (_unp) o.u = 1;
            if (kind === 'all') o.x = kd2 === 'income' ? 'i' : 'e';
            /* «همه» و ردیف‌های پرداخت/دریافت‌نشده: + واریز، − برداشت */
            if (kind === 'all' || _unp) o.a = (kd2 === 'income' ? '+' : '−') + o.a;
            out.push(o);
          }
          m--; if (m < 1) { m = 12; y--; }
        }
      } catch (e) {}
      return out;
    }
    try { window.hkWidgetTxRows = hkWidgetTxRows; } catch (eWt) {}
    /* ===== ۱.۳.۸۲: جیب به جیب =====
       توضیح بار اول (و با ⓘ هر وقت)؛ علامت زدن ردیف تازهٔ پیامک؛ پیدا کردن جفت برداشت/واریز هم‌مبلغ بین کارت‌های خود */
    var HK_P2P_INTRO_KEY = STORAGE_KEY + '_p2pIntro', HK_P2P_SINCE_KEY = STORAGE_KEY + '_p2pSince', HK_P2P_AUTO_KEY = STORAGE_KEY + '_p2pAuto';
    function hkP2PIntro(force) {
      try { if (!force && localStorage.getItem(HK_P2P_INTRO_KEY) === '1') return; } catch (e) {}
      var old = document.getElementById('hkP2PIntro'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkP2PIntro'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100700;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML = '<div class="modal-box hk-prefs hk-pf hk-p2p-box" style="max-width:340px;">' +
        '<div class="hk-prefs-t" style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><i class="hk-p2p-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_CAT_ICONS.p2p + '</svg></i>جیب به جیب</div>' +
        '<div style="line-height:1.9;font-size:var(--hk-fs-body);color:var(--muted,#98989f);">این دسته برای پولی است که فقط بین کارت‌های خودتان جابه‌جا می‌شود. در جمع درآمد و مخارج حساب نمی‌شود، ولی موجودی هر کارت درست می‌ماند. برای پرداخت به دیگران از این دسته استفاده نکنید.</div>' +
        '<div class="hk-rax-acts" style="padding:12px 0 0;"><button type="button" class="modal-btn hk-p2p-ok">متوجه شدم</button></div></div>';
      var close = function () { ov.remove(); try { localStorage.setItem(HK_P2P_INTRO_KEY, '1'); } catch (e) {} };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.hk-p2p-ok').onclick = close;
      document.body.appendChild(ov);
    }
    function hkP2PAllRows(fn) {
      try {
        ['income', 'expense'].forEach(function (tab) {
          (((periodData && periodData[tab] && periodData[tab].sections) || [])).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (r) fn(r, tab, 'cur'); }); });
        });
        var py = currentYear, pm = currentMonth - 1; if (pm < 1) { pm = 12; py--; }
        var pd = archive && archive[periodKey(py, pm)];
        if (pd) ['income', 'expense'].forEach(function (tab) {
          (((pd[tab] && pd[tab].sections) || [])).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (r) fn(r, tab, 'prev'); }); });
        });
      } catch (e) {}
    }
    /* ردیفی که همین الان از باکس پیامک با دستهٔ «جیب به جیب» ثبت شد */
    function hkP2PMarkRecent(t0, amt) {
      var hit = null;
      hkP2PAllRows(function (r, tab, w) {
        if (w !== 'cur' || r.p2p) return;
        var c = Number(r.createdAt) || 0, u = Number(r.updatedAt) || 0;
        if ((c >= t0 - 2000 || u >= t0 - 2000) && (!amt || Number(r.amount) === amt)) { if (!hit || Math.max(c, u) > Math.max(Number(hit.createdAt) || 0, Number(hit.updatedAt) || 0)) hit = r; }
      });
      if (hit) { hit.p2p = true; delete hit.p2pNo; try { persistCurrent(); scheduleSave(); renderAll(); } catch (e) {} }
      return !!hit;
    }
    function hkP2PSince() {
      var v = 0; try { v = Number(localStorage.getItem(HK_P2P_SINCE_KEY)) || 0; if (!v) { v = Date.now(); localStorage.setItem(HK_P2P_SINCE_KEY, String(v)); } } catch (e) { v = Date.now(); }
      return v;
    }
    function hkP2PAutoPairs() { try { return JSON.parse(localStorage.getItem(HK_P2P_AUTO_KEY) || '[]') || []; } catch (e) { return []; } }
    function hkP2PPairKey(a, b) { return [String(a || '').trim(), String(b || '').trim()].sort().join('|'); }
    /* جفت: برداشت از یک کارت خودم + واریز هم‌مبلغ به کارت دیگر خودم، تا ۳ روز فاصله (پایا/ساتنا دیرتر می‌نشیند) */
    function hkP2PFindPairs() {
      var since = hkP2PSince(), own = {};
      try { selectedAccountLabels().forEach(function (l) { own[l] = 1; }); } catch (e) {}
      var inc = [], exp = [];
      hkP2PAllRows(function (r, tab) {
        if (r.deletedAt || r.p2p || r.p2pNo || r.p2pAsked) return;
        if ((r.status || 'paid') !== 'paid' || !(Number(r.amount) > 0)) return;
        var acc = String(r.account || '').trim(); if (!acc || !own[acc]) return;
        if (!(Number(r.createdAt) >= since)) return;
        (tab === 'income' ? inc : exp).push(r);
      });
      var out = [], used = new Set();
      inc.forEach(function (i) {
        var cands = exp.filter(function (e) { return !used.has(e) && Number(e.amount) === Number(i.amount) && String(e.account).trim() !== String(i.account).trim() && Math.abs((Number(e.createdAt) || 0) - (Number(i.createdAt) || 0)) <= 3 * 86400000; });
        if (!cands.length) return;
        cands.sort(function (a, b) { return Math.abs(a.createdAt - i.createdAt) - Math.abs(b.createdAt - i.createdAt); });
        used.add(cands[0]);
        out.push({ inc: i, exp: cands[0], alts: cands.length });
      });
      return out;
    }
    var _hkP2PScanT = 0, _hkP2PBusy = false;
    function hkP2PScheduleScan() { clearTimeout(_hkP2PScanT); _hkP2PScanT = setTimeout(hkP2PScan, 900); }
    function hkP2PScan() {
      if (_hkP2PBusy || document.getElementById('hkP2PAsk')) return;
      /* ۱.۳.۹۷: سؤال «جیب به جیب بود؟» وسط کار دیگری (باکس ثبت پیامک، مغایرت، هر پنجرهٔ باز) نمی‌پرد؛ بعد از بسته شدنش می‌آید */
      try { if (Array.prototype.some.call(document.querySelectorAll('.modal-overlay.open, #hkReconDlg, #hkAsk3, [data-hk-back]'), function (x) { return x.getClientRects().length > 0; })) { clearTimeout(_hkP2PScanT); _hkP2PScanT = setTimeout(hkP2PScan, 3000); return; } } catch (eBusy) {}
      var pairs = hkP2PFindPairs(); if (!pairs.length) return;
      var auto = hkP2PAutoPairs(), changed = false;
      pairs = pairs.filter(function (pr) {
        if (auto.indexOf(hkP2PPairKey(pr.inc.account, pr.exp.account)) >= 0) { pr.inc.p2p = pr.exp.p2p = true; changed = true; return false; }
        return true;
      });
      if (changed) { try { _hkP2PBusy = true; persistCurrent(); scheduleSave(); renderAll(); showToast('جابه‌جایی بین کارت‌های خودتان «جیب به جیب» شد'); } catch (e) {} finally { _hkP2PBusy = false; } }
      if (pairs.length) hkP2PAsk(pairs[0]);
    }
    function hkP2PAsk(pr) {
      pr.inc.p2pAsked = pr.exp.p2pAsked = true;
      var ov = document.createElement('div'); ov.id = 'hkP2PAsk'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100690;display:flex;align-items:center;justify-content:center;';
      var tm = function (r) { var t = String(r.time || '').trim(); return t ? ' ساعت ' + toPersianDigits(t) : ''; };
      ov.innerHTML = '<div class="modal-box hk-prefs hk-pf hk-p2p-box" style="max-width:350px;">' +
        '<div class="hk-prefs-t" style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><i class="hk-p2p-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_CAT_ICONS.p2p + '</svg></i>جیب به جیب بود؟</div>' +
        '<div class="hk-p2p-msg" style="line-height:1.9;font-size:var(--hk-fs-body);"></div>' +
        '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:var(--hk-fs-small);color:var(--muted,#98989f);"><input type="checkbox" class="hk-p2p-always" style="width:18px;height:18px;accent-color:#ff453a;">همیشه برای این دو کارت</label>' +
        '<div class="hk-rax-acts" style="padding:12px 0 0;"><button type="button" class="modal-btn hk-p2p-yes">بله، جیب به جیب</button><button type="button" class="modal-btn hk-p2p-no">نه، خرج و درآمد است</button></div></div>';
      ov.querySelector('.hk-p2p-msg').textContent = 'واریز ' + formatNum(pr.inc.amount) + ' به کارت «' + String(pr.inc.account).trim() + '»' + tm(pr.inc) + '، با برداشت همین مبلغ از کارت «' + String(pr.exp.account).trim() + '»' + tm(pr.exp) + ' جور است. اگر بین کارت‌های خودتان جابه‌جا کرده‌اید، در جمع درآمد و مخارج حساب نمی‌شود (موجودی کارت‌ها درست می‌ماند).' + (pr.alts > 1 ? ' (چند برداشت هم‌مبلغ بود؛ نزدیک‌ترین در نظر گرفته شد.)' : '');
      var done = function (yes) {
        var alw = ov.querySelector('.hk-p2p-always').checked;
        ov.remove();
        if (yes) { pr.inc.p2p = pr.exp.p2p = true; delete pr.inc.p2pNo; delete pr.exp.p2pNo; if (alw) { var a = hkP2PAutoPairs(), k = hkP2PPairKey(pr.inc.account, pr.exp.account); if (a.indexOf(k) < 0) { a.push(k); try { localStorage.setItem(HK_P2P_AUTO_KEY, JSON.stringify(a)); } catch (e) {} } } }
        else { pr.inc.p2pNo = pr.exp.p2pNo = true; }
        try { _hkP2PBusy = true; persistCurrent(); scheduleSave(); renderAll(); } catch (e) {} finally { _hkP2PBusy = false; }
        if (yes) showToast('«جیب به جیب» شد — در جمع‌ها حساب نمی‌شود');
        setTimeout(hkP2PScan, 400);
      };
      ov._hkCancel = function () { ov.remove(); };
      ov.querySelector('.hk-p2p-yes').onclick = function () { done(true); };
      ov.querySelector('.hk-p2p-no').onclick = function () { done(false); };
      document.body.appendChild(ov);
    }
    (function () {
      try { hkP2PSince(); } catch (e) {}
      if (typeof persistCurrent === 'function' && !persistCurrent._hkP2P) {
        var _pc = persistCurrent;
        var w = function () { var r = _pc.apply(this, arguments); if (!_hkP2PBusy) hkP2PScheduleScan(); return r; };
        w._hkP2P = true;
        persistCurrent = w; try { window.persistCurrent = w; } catch (e2) {}
      }
    })();
    try { Object.assign(window, { hkP2PIntro: hkP2PIntro, hkP2PFindPairs: hkP2PFindPairs, hkP2PScan: hkP2PScan }); } catch (eP2) {}
