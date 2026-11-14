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
      /* ۱.۳.۹۹: تاریخ و ساعت ردیفِ پیامکی از خود بانک است → قفل (فقط نمایش)؛ نگه‌داشتن + تأیید = باز شدن قفل برای موارد استثنا */
      var dtLocked = !!(row && row.viaSms && String(row.day || '').trim());
      if (dtLocked) {
        var lockOne = function (b, which) {
          b.classList.add('hk-re-locked');
          b.onclick = function () { try { showToast('تاریخ و ساعت این تراکنش از پیامک بانک است؛ برای تغییر، نگه دارید'); } catch (eT) {} };
          var lpT = 0;
          b.addEventListener('pointerdown', function () { clearTimeout(lpT); lpT = setTimeout(function () {
            try { window.appHaptic(20); } catch (eHp) {} /* ۱.۴.۱: لانگ‌پرس با ویبره */
            askConfirm('تاریخ و ساعت از پیامک بانک آمده است. تغییرش می‌دهید؟', function () {
              dtLocked = false; [dVal, tVal].forEach(function (x) { x.classList.remove('hk-re-locked'); });
              try { var lk = dtRow.querySelector('.hk-re-dtlk'); if (lk) lk.classList.remove('hk-re-dtlk'); } catch (eLk) {}
              dVal.onclick = function () { dtOpen('d'); }; tVal.onclick = function () { dtOpen('t'); };
              dtOpen(which);
            });
          }, 600); });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(lpT); }); });
        };
        lockOne(dVal, 'd'); lockOne(tVal, 't');
      }
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
      /* ۱.۳.۸۶: دکمهٔ Enter صفحه‌کلید «تمام» است و صفحه‌کلید را می‌بندد */
      [ds, amt].forEach(function (el) {
        try { el.setAttribute('enterkeyhint', 'done'); } catch (eEk) {}
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); try { el.blur(); } catch (eBl) {} } });
      });
      if (fromPlan) { var nA = document.createElement('div'); nA.className = 'hk-re-note'; nA.textContent = 'مبلغ و شرح قسط از بخش اقساط عوض می‌شود'; fA.appendChild(nA); }
      /* وضعیت پرداخت */
      var fS = field('وضعیت');
      var seg = document.createElement('div'); seg.className = 'hk-re-seg hk-re-stseg'; /* ۱.۴.۰: کشیدن افقی روی باکس = عوض شدن وضعیت */
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
          hkCatPickSheet((isInc ? HK_INCOME_CATS.slice() : HKCategorizer.categories.filter(function (c) { return c && c.id && (typeof HK_INSTALLMENTS_ON === 'undefined' || HK_INSTALLMENTS_ON || c.id !== 'debt'); })).concat([HK_P2P_CAT]), st.cat, function (v) { st.cat = v; catTxt(); }, isInc ? 'in' : 'out');
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
      /* ۱.۳.۹۹: «مانده»: موجودی همان حساب بعد از این تراکنش (فقط نمایش) */
      var balRow = null;
      try {
        var balV = (row && row.account && (row.status || 'paid') === 'paid') ? hkRowBalanceAfter(row) : null;
        if (balV != null) {
          balRow = document.createElement('div'); balRow.className = 'hk-re-ro hk-re-bal';
          balRow.innerHTML = '<span class="hk-re-rl">مانده</span><span class="hk-re-rv' + (balV < 0 ? ' neg' : '') + '" dir="ltr">' + formatNum(balV) + '</span>';
        }
      } catch (eBal) { balRow = null; }
      /* ===== ۱.۳.۶۹: چیدمان یکدست: بالا مبلغ درشت + شرح، بعد وضعیت، بعد فهرست پیوستهٔ جزئیات ===== */
      function reAmtColor() { box.style.setProperty('--re-amt-c', st.status === 'unpaid' ? 'var(--hk-unsettled)' : (isInc ? 'var(--hk-income)' : 'var(--hk-expense)')); }
      reAmtColor();
      amt.placeholder = 'مبلغ'; ds.placeholder = 'شرح';
      var hero = document.createElement('div'); hero.className = 'hk-re-hero';
      hero.appendChild(amt); hero.appendChild(ds);
      if (typeof nA !== 'undefined' && nA) hero.appendChild(nA);
      var grp = document.createElement('div'); grp.className = 'hk-re-group';
      /* تاریخ و زمان در یک ردیف: زمان (راست)، خط جداکننده، تاریخ با میلادی زیرش (چپ) */
      var dtLab = document.createElement('span'); dtLab.className = 'hk-re-rl' + (dtLocked ? ' hk-re-dtlk' : ''); dtLab.textContent = 'تاریخ و زمان'; /* ۱.۴.۰: یک قفل، کنار همین نوشته */
      var dtSep = document.createElement('i'); dtSep.className = 'hk-re-dtsep'; dtSep.setAttribute('aria-hidden', 'true');
      dtRow.innerHTML = ''; dtRow.classList.add('hk-re-row');
      dtRow.appendChild(dtLab); dtRow.appendChild(tVal); dtRow.appendChild(dtSep); dtRow.appendChild(dVal);
      grp.appendChild(dtRow); grp.appendChild(fD); grp.appendChild(fT);
      [accB, (typeof catB !== 'undefined' ? catB : null), pjB, (typeof recB !== 'undefined' ? recB : null), (typeof pv !== 'undefined' ? pv : null), balRow, fRow].forEach(function (el) { if (el) { el.classList.add('hk-re-row'); grp.appendChild(el); } });
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
