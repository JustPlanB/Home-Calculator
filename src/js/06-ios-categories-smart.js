    /* ===== نسخهٔ iOS: پیامک‌هایی که اکشن «ثبت پیامک بانکی» برنامهٔ میان‌برها در صف گذاشته، یا لینک hesabketab://sms?text=…
       با همان مسیر اندروید (enqueueBankSms: رد رمز یک‌بارمصرف، جلوگیری از تکرار، باکس تأیید) ثبت می‌شوند. چیزی از گوشی بیرون نمی‌رود. ===== */
    function hkIsIos() { try { return !!(window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios'); } catch (e) { return false; } }
    function hkIosSmsIngest(text, src) {
      try {
        var t = String(text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 2000);
        if (t.length < 8) return false;
        return enqueueBankSms(t, { source: src || 'ios' });
      } catch (e) { return false; }
    }
    var _hkIosDraining = false;
    async function hkIosSmsDrain() {
      if (!hkIsIos() || _hkIosDraining) return 0;
      var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.HkIosSms; if (!P || typeof P.drain !== 'function') return 0;
      _hkIosDraining = true;
      try { var r = await P.drain(); var items = (r && r.items) || []; items.forEach(function (it) { hkIosSmsIngest(it && it.t, 'shortcut'); }); return items.length; }
      catch (e) { return 0; } finally { _hkIosDraining = false; }
    }
    function hkIosSmsGuide() {
      try { closeSideMenu(); } catch (e0) {}
      var old = document.getElementById('hkIosGuide'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkIosGuide'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML = '<div class="modal-box hk-prefs hk-pf hk-ios-guide" style="max-height:86vh;overflow-y:auto;padding:16px;">' +
        '<div class="hk-prefs-t" style="margin-bottom:6px;">ثبت خودکار پیامک بانکی در آیفون</div>' +
        '<p>آیفون به هیچ برنامه‌ای اجازهٔ خواندن پیامک‌ها را نمی‌دهد. به‌جایش یک بار در برنامهٔ «میان‌برها» (Shortcuts) یک اتوماسیون می‌سازید تا هر پیامک بانکی، متنش را به حساب‌کتاب بدهد. پیامک‌ها فقط روی همین گوشی می‌مانند و با باز شدن حساب‌کتاب ثبت می‌شوند.</p>' +
        '<ol><li>برنامهٔ «میان‌برها» را باز کنید و به زبانهٔ «اتوماسیون» بروید.</li>' +
        '<li>«اتوماسیون جدید» ← «پیام» (Message).</li>' +
        '<li>«پیام حاوی» را بزنید و یک کلمه مثل «بانک» یا «مانده» بنویسید (اگر شمارهٔ بانک در مخاطبان است، می‌توانید «فرستنده» را هم انتخاب کنید).</li>' +
        '<li>«اجرای فوری» (Run Immediately) را انتخاب کنید و «اطلاع هنگام اجرا» را خاموش کنید.</li>' +
        '<li>اکشن «ثبت پیامک بانکی» از حساب‌کتاب را اضافه کنید و در «متن پیامک»، «ورودی میان‌بر» ← «محتوا» را بگذارید.</li>' +
        '<li>ذخیره کنید. از این به بعد پیامک‌های بانکی، با باز کردن حساب‌کتاب برای تأیید ثبت می‌آیند.</li></ol>' +
        '<p>رمزهای یک‌بارمصرف و پیام‌های تبلیغاتی ثبت نمی‌شوند و هر پیامک فقط یک بار ثبت می‌شود. برای قطع کامل، همان اتوماسیون را در «میان‌برها» پاک کنید.</p>' +
        '<div class="hk-rax-acts" style="padding:10px 0 0;"><button type="button" class="modal-btn hk-ig-clear">پاک کردن صف</button><button type="button" class="modal-btn hk-ig-close">بستن</button></div></div>';
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.hk-ig-close').onclick = close;
      ov.querySelector('.hk-ig-clear').onclick = function () { try { var P = Capacitor.Plugins.HkIosSms; if (P) P.clear(); } catch (e) {} showToast('صف پیامک‌های در انتظار پاک شد'); };
      document.body.appendChild(ov);
    }
    (function () {
      if (!hkIsIos()) return;
      /* گزینهٔ منو فقط در iOS ساخته می‌شود (منوی اندروید دست نمی‌خورد) */
      var addMenu = function () {
        try {
          if (document.getElementById('menuIosSms')) return;
          var ref = document.getElementById('menuBlockedBtn'); if (!ref) return;
          var t = document.createElement('div'); t.innerHTML = '<button class="menu-item" id="menuIosSms" onclick="hkIosSmsGuide()"><i class="hk-mi" style="--c:#64d2ff"><svg viewBox="0 0 24 24"><path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H9.5L5 20.5V17h-.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z"/><path d="M12 8v5M9.5 10.5L12 13l2.5-2.5"/></svg></i>ثبت خودکار پیامک با میان\u200cبرها</button>';
          ref.parentNode.insertBefore(t.firstChild, ref);
        } catch (e) {}
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMenu); else addMenu();
      var run = function () { setTimeout(hkIosSmsDrain, 1200); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 1500); }); else setTimeout(run, 1500);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) run(); });
      try {
        var App = Capacitor.Plugins.App;
        if (App && App.addListener) {
          App.addListener('appStateChange', function (st) { if (st && st.isActive) run(); });
          App.addListener('appUrlOpen', function (ev) {
            try {
              var u = new URL(ev && ev.url || '');
              if (u.protocol !== 'hesabketab:' || (u.host || u.pathname.replace(/^\/+/, '')) !== 'sms') return;
              hkIosSmsIngest(u.searchParams.get('text'), 'link');
            } catch (e) {}
          });
        }
      } catch (e2) {}
    })();
    /* آیفون: ذخیرهٔ فایل خروجی — یک نسخه همیشه در Files ← On My iPhone ← حساب کتاب، و دکمهٔ اشتراک (پنجرهٔ اشتراک خود iOS، که لمس کاربر لازم دارد) */
    async function hkIosSaveBlob(blob, name, mime) {
      var saved = false;
      try {
        var FS = Capacitor.Plugins.Filesystem;
        if (FS && FS.writeFile) {
          var b64 = await blobToBase64(blob);
          b64 = String(b64 || '').replace(/^data:[^,]*,/, '');
          await FS.writeFile({ path: name, data: b64, directory: 'DOCUMENTS', recursive: true });
          saved = true;
        }
      } catch (eW) { console.warn('ios save failed', eW); }
      var old = document.getElementById('hkIosShare'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkIosShare'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100650;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML = '<div class="modal-box hk-prefs hk-pf" style="padding:16px;max-width:340px;">' +
        '<div class="hk-prefs-t" style="margin-bottom:8px;">فایل آماده است</div>' +
        '<div style="line-height:1.8;font-size:var(--hk-fs-body);color:var(--muted,#98989f);margin-bottom:12px;"></div>' +
        '<div class="hk-rax-acts" style="padding:0;"><button type="button" class="modal-btn hk-is-share">اشتراک / ذخیره</button><button type="button" class="modal-btn hk-is-close">بستن</button></div></div>';
      ov.querySelector('div > div:nth-child(2)').textContent = (saved ? 'یک نسخه در برنامهٔ Files ← On My iPhone ← حساب کتاب ذخیره شد. ' : '') + 'برای فرستادن یا ذخیره در جای دیگر، «اشتراک / ذخیره» را بزنید. (' + name + ')';
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.hk-is-close').onclick = close;
      ov.querySelector('.hk-is-share').onclick = async function () {
        try {
          var file = new File([blob], name, { type: mime || blob.type || 'application/octet-stream' });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ files: [file], title: name }); close(); return; }
        } catch (eS) { if (eS && eS.name === 'AbortError') return; }
        showToast(saved ? 'فایل در Files ← حساب کتاب است' : 'اشتراک ممکن نشد');
      };
      document.body.appendChild(ov);
      return true;
    }
    /* آیفون: کشیدن از لبهٔ چپ صفحه به داخل = همان «برگشت» اندروید (یک مرحله عقب) */
    (function () {
      if (!hkIsIos()) return;
      var sx = 0, sy = 0, on = false, fired = false, EDGE = 26;
      document.addEventListener('touchstart', function (e) {
        on = false; fired = false;
        if (!e.touches || e.touches.length !== 1) return;
        var t = e.touches[0]; if (t.clientX > EDGE) return;
        sx = t.clientX; sy = t.clientY; on = true;
      }, { passive: true, capture: true });
      document.addEventListener('touchmove', function (e) {
        if (!on || fired || !e.touches || !e.touches[0]) return;
        var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) { on = false; return; }
        if (dx > 60) { fired = true; on = false; try { onBackGuard(); } catch (eB) {} }
      }, { passive: true, capture: true });
      document.addEventListener('touchend', function () { on = false; }, { passive: true, capture: true });
    })();
    try { Object.assign(window, { hkIosSmsGuide: hkIosSmsGuide, hkIosSmsIngest: hkIosSmsIngest, hkIosSmsDrain: hkIosSmsDrain, hkIosSaveBlob: hkIosSaveBlob }); } catch (eIs) {}
    function hkWidgetSeenNids() {
      var out = [];
      try {
        var add = function (n) { n = Number(n) || 0; if (n && out.indexOf(n) < 0) out.push(n); };
        if (pendingSmsEntry) add(pendingSmsEntry.nid);
        (smsPendingQueue || []).forEach(function (q) { if (q) add(q.nid); });
        Object.keys(window._hkDoneSmsNids || {}).forEach(add);
      } catch (e) {}
      return out;
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pushHomeWidget(); });
    /* دایرهٔ جستجو: بخش مانده (فیلترها + جدول مانده به تفکیک) */
    function openHomeMandeh() {
      try { resetBalanceSearch(); } catch (eRs) {}
      try {
        var titles = allPersonTitles();
        var t = getActiveHomeCardTitle();
        if (!t || titles.indexOf(t) < 0) t = titles[0];
        if (t) openPersonDetail(t, 'balance');
      } catch (e) {}
    }

    function renderHomeCards() {
      try { unlockPageScroll(); } catch (e) {}
      try { ensureDefaultPersonCard(); } catch (e) {}
      try { syncMatchCardWidth(); } catch (e) {}
      const box = document.getElementById('homeCards');
      if (!box) return;
      try { updateHomeBalanceCircle(); } catch (eHB) {}
      /* موقعیت و سرعت حرکت جاری نگه داشته می‌شود تا رسم دوباره کارت را نپراند */
      const _sl0 = box.scrollLeft;
      let _wasAnim = false, _v0 = 0;
      try { if (typeof HomeCarousel !== 'undefined') { _wasAnim = HomeCarousel.animating(); HomeCarousel.cancel(); _v0 = _wasAnim ? HomeCarousel.lastVel() : 0; } } catch (eHC) {}
      box.innerHTML = '';
      const titles = allPersonTitles();
      const _ZERO_TOT = { incomeTotal: 0, incomePaid: 0, incomeUnpaid: 0, expenseTotal: 0, expensePaid: 0, expenseUnpaid: 0, remain: 0, instant: 0 };
      const _buildCard = function(title, cardIdx, isGhost) {
        const tot = isGhost ? _ZERO_TOT : personTotals(title);
        const bg = isGhost ? '' : (typeof CARD_BACKGROUNDS !== 'undefined' && CARD_BACKGROUNDS[getCardBgIndex(title)]) || '';
        const card = document.createElement('div');
        card.className = 'person-card';
        if (!isGhost) card.dataset.title = title;
        if (bg) {
          const bgImg = document.createElement('img');
          bgImg.className = 'person-card-bg';
          bgImg.src = bg;
          bgImg.alt = '';
          bgImg.decoding = 'async';
          bgImg.draggable = false;
          card.appendChild(bgImg);
        }

        const inner = document.createElement('div');
        inner.className = 'person-card-inner';
        const top = document.createElement('div');
        top.className = 'person-card-top';
        const name = document.createElement('div');
        name.className = 'person-card-name';
        name.textContent = title;
        const actions = document.createElement('div');
        actions.className = 'person-card-actions';
        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'btn-edit-title';
        btnEdit.title = 'ویرایش';
        btnEdit.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        btnEdit.onclick = (e) => { e.stopPropagation(); openPersonEditSheet(title, false); };
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-del-row';
        btnDel.textContent = '×';
        btnDel.title = 'حذف';
        btnDel.onclick = (e) => { e.stopPropagation(); askDeletePerson(title); };
        /* ۱.۳.۴۴: کارت اصلی کاربر حذف‌شدنی نیست (فقط کارت‌های اضافهٔ قدیمی دکمهٔ حذف دارند) */
        if (cardIdx > 0) actions.appendChild(btnDel);
        /* ۱.۳.۴۶: مداد ویرایش نام برداشته شد؛ «تغییر نام» در منوی نگه داشتن انگشت روی کارت */
        top.appendChild(name);
        top.appendChild(actions);

        const stats = document.createElement('div');
        stats.className = 'person-card-stats';
        const cols = document.createElement('div');
        cols.className = 'person-card-cols';

        const boxInc = document.createElement('div');
        boxInc.className = 'person-stat-box';
        const _row = function(cls, label, val) {
          return '<span class="person-stat-line ' + cls + ' psl-l">' + label + '</span>' +
                 '<span class="person-stat-line ' + cls + ' psl-v">' + val + '</span>';
        };
        boxInc.innerHTML =
          _row('em', 'درآمد کل:', formatNum(tot.incomeTotal)) +
          _row('paid', 'دریافت شده:', formatNum(tot.incomePaid)) +
          _row('unpaid', 'دریافت نشده:', formatNum(tot.incomeUnpaid));
        boxInc.onclick = (e) => { e.stopPropagation(); openPersonDetail(title, 'income'); };

        const boxExp = document.createElement('div');
        boxExp.className = 'person-stat-box psb-exp';
        boxExp.innerHTML =
          _row('em', 'خرج کل:', formatNum(tot.expenseTotal)) +
          _row('paid', 'پرداخت شده:', formatNum(tot.expensePaid)) +
          _row('unpaid', 'پرداخت نشده:', formatNum(tot.expenseUnpaid));
        boxExp.onclick = (e) => { e.stopPropagation(); openPersonDetail(title, 'expense'); };

        cols.appendChild(boxInc);
        cols.appendChild(boxExp);

        /* «باکس هوشمند»: جای کپسول درصد قبلی (محتوا بعداً اضافه می‌شود) */
        /* ۱.۳.۶۸: باکس هوشمند دیگر داخل کارت نیست؛ جدا در #homeSmartBox (پایین همین تابع) ساخته می‌شود */
        var statsWrap = document.createElement('div');
        statsWrap.className = 'person-card-stats-wrap';
        statsWrap.appendChild(cols);

        /* فیلدهای «مانده نهایی» و «موجودی آنی» از کارت حذف شدند (موجودی آنی به باکس ۴ رفت) */
        stats.appendChild(statsWrap);
        inner.appendChild(top);
        inner.appendChild(stats);
        card.appendChild(inner);
        /* لانگ‌پرس → حالت جابجایی کارت‌ها */
        if (!isGhost) (function(cardEl, cardTitle) {
          var lpTimer = null;
          var startX = 0, startY = 0;
          function clearLp() {
            if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
          }
          cardEl.addEventListener('pointerdown', function(ev) {
            if (ev.button != null && ev.button !== 0) return;
            if (ev.target && ev.target.closest && (ev.target.closest('.btn-edit-title') || ev.target.closest('.btn-del-row') || ev.target.closest('button'))) return;
            /* لانگ‌پرس روی اسلایدِ «کارهای من» (ساختهٔ کاربر) مال خود باکس هوشمند است (حذف اسلاید)، نه جابه‌جایی کارت */
            try {
              var _sb = ev.target && ev.target.closest && ev.target.closest('.pc-smart-box');
              var _pg = _sb && _sb._spPages && _sb._spPages[_sb._spIdx];
              if (_pg && /^todo-/.test(String(_pg.key || ''))) return;
              if (ev.target && ev.target.closest && ev.target.closest('.sp-trash-ov')) return;
            } catch (eSb) {}
            startX = ev.clientX; startY = ev.clientY;
            clearLp();
            lpTimer = setTimeout(function() {
              lpTimer = null;
              try { window.appHaptic(30); } catch (eV) {}
              openCardJiggle(cardEl, cardTitle);
            }, 480);
          });
          cardEl.addEventListener('pointermove', function(ev) {
            if (!lpTimer) return;
            if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) clearLp();
          });
          cardEl.addEventListener('pointerup', clearLp);
          cardEl.addEventListener('pointercancel', clearLp);
        })(card, title);
        return card;
      };
      titles.forEach((title, cardIdx) => { box.appendChild(_buildCard(title, cardIdx, false)); });
      /* کارت نیمه‌نمایان «+ ایجاد کاربر» حذف شد (ایجاد کارت از دکمهٔ + باکس پایین) */
      /* ۱.۳.۴۴: نقطه‌های شمارندهٔ کارت‌ها حذف شد */
      try { var _dw = document.getElementById('homeCardsWrap'); var _dd = _dw && _dw.querySelector(':scope > .home-card-dots'); if (_dd) _dd.remove(); } catch (eDots) {}
      /* فقط یک کارت: کاروسل قفل */
      try {
        if (titles.length === 1) {
          box.classList.add('has-ghost');
          box.scrollLeft = 0;
        } else {
          box.classList.remove('has-ghost');
        }
      } catch (eGh) {}
      try { bindCardReorderChrome(); } catch (eB) {}

      // اسکرول افقی: عرض هر کارت = عرض کانتینر؛ موقعیت کارت فعال حفظ شود
      try {
        sizeHomeCards(box);
        if (!box._homeScrollBound) {
          box._homeScrollBound = true;
          let hcRaf = 0;
          box.addEventListener('scroll', function() {
            if (hcRaf) return;
            hcRaf = requestAnimationFrame(function() {
              hcRaf = 0;
              try {
                const best = updateHomeCardScales(box);
                /* در حین رفتن به کارت تازه، کارت فعال همان کارت تازه می‌ماند */
                var lockT = window._hkCardFocus && Date.now() < window._hkCardFocus.until ? window._hkCardFocus.name : '';
                if (best && best.dataset.title && !lockT) setActiveHomeCardTitle(best.dataset.title);
                updateHomeCardDots(box, best);
              } catch (eS) {}
            });
          }, { passive: true });
        }
        const _lockT = window._hkCardFocus && Date.now() < window._hkCardFocus.until ? window._hkCardFocus.name : '';
        const active = _lockT || getActiveHomeCardTitle();
        if (box.classList.contains('has-ghost')) {
          box.scrollLeft = 0;
          requestAnimationFrame(function(){ box.scrollLeft = 0; updateHomeCardScales(box); });
        } else if (active && (_lockT || _wasAnim)) {
          /* وسط حرکت (مثلاً رفتن به کارت تازه): از همان نقطه و با همان سرعت ادامه بده، بدون پرش */
          box.scrollLeft = _sl0;
          try { updateHomeCardScales(box); } catch (eU0) {}
          const _resume = function () {
            try {
              const c = box.querySelector('.person-card:not(.hc-clone)[data-title="' + (window.CSS && CSS.escape ? CSS.escape(active) : active) + '"]');
              if (!c) return;
              const to = homeCardTarget(box, c);
              const done = window._hkCardFocus && window._hkCardFocus.name === active ? window._hkCardFocus.done : null;
              HomeCarousel.animateTo(box, to, 0, _v0, done, true);
            } catch (eR) {}
          };
          _resume();
        } else if (active) {
          requestAnimationFrame(function(){ scrollHomeCardsToTitle(active, false); });
        } else {
          box.scrollLeft = 0;
          requestAnimationFrame(function(){ updateHomeCardScales(box); });
        }
        requestAnimationFrame(function(){ requestAnimationFrame(function(){ try { updateHomeCardDots(box); } catch (eD) {} }); });
      } catch (e) {}
      try { hkMountHomeSmart(titles); } catch (eHS) {}
      try { hkRenderDock(); } catch (eDk) {}
      try { layoutHomeStack(); } catch (eL) {}
      try { fitHomeCardStats(); } catch (eF) {}
      try { updateInstallTileBadge(); } catch (eIB) {}
      try { HKAlerts.notify(titles); } catch (eAl) {}
      try { maybeStartAppTour(); } catch (eTour) {}
      try { maybeRunCardSwipeHint(); } catch (eH) {}
    }

    /* اگر مبلغ‌های بزرگ در عرض کارت جا نشوند، فونت هر شش سطر کارت یکسان کوچک می‌شود */
    function fitHomeCardStats() {
      var box = document.getElementById('homeCards');
      if (!box) return;
      box.querySelectorAll('.person-card').forEach(function (card) {
        var lines = card.querySelectorAll('.person-stat-box .person-stat-line');
        if (!lines.length) return;
        var over = function () {
          for (var i = 0; i < lines.length; i++) { if (lines[i].scrollWidth > lines[i].clientWidth + 1) return true; }
          var bxs = card.querySelectorAll('.person-stat-box');
          for (var j = 0; j < bxs.length; j++) { if (bxs[j].scrollWidth > bxs[j].clientWidth + 1 || bxs[j].scrollHeight > bxs[j].clientHeight + 1) return true; }
          return false;
        };
        var f = 1;
        card.style.setProperty('--pc-fs', '1');
        while (f > 0.6 && over()) { f -= 0.04; card.style.setProperty('--pc-fs', f.toFixed(2)); }
      });
      try { fitSmartPanel(document.querySelector('#homeSmartBox .pc-smart-box')); } catch (eSp) {}
    }
    /* ۱.۳.۶۸: باکس هوشمندِ کارت فعال، در باکس جدای خودش */
    function hkMountHomeSmart(titles) {
      var host = document.getElementById('homeSmartBox');
      if (!host) return;
      var t = '';
      try { t = getActiveHomeCardTitle(); } catch (e0) {}
      if (!t) t = (titles && titles[0]) || '';
      var smart = host.querySelector('.pc-smart-box');
      if (!smart) { smart = document.createElement('div'); smart.className = 'pc-smart-box'; host.appendChild(smart); }
      if (!t) { smart.innerHTML = ''; return; }
      mountSmartPanel(smart, t, 0);
    }
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { try { fitHomeCardStats(); } catch (e) {} }); } catch (eFr) {}

    /* ===== نقاط شمارندهٔ کارت‌ها (پایین کارت) ===== */
    /* ===== نقاط شمارندهٔ کارت‌ها: یک ردیف ثابت، بیرون و زیر کارت ===== */
    function renderHomeCardDots(box, count) {
      return;
      var wrap = document.getElementById('homeCardsWrap');
      if (!wrap) return;
      try { (box || document).querySelectorAll('.person-card > .home-card-dots').forEach(function (x) { x.remove(); }); } catch (e0) {}
      var dots = wrap.querySelector(':scope > .home-card-dots');
      if (!dots) {
        dots = document.createElement('div');
        dots.className = 'home-card-dots';
        dots.setAttribute('aria-hidden', 'true');
        wrap.appendChild(dots);
      }
      var n = Math.max(0, count | 0);
      if (dots.childElementCount !== n) {
        dots.innerHTML = '';
        for (var i = 0; i < n; i++) dots.appendChild(document.createElement('i'));
      }
      updateHomeCardDots(box);
    }
    function updateHomeCardDots(box, best) {
      box = box || document.getElementById('homeCards');
      var wrap = document.getElementById('homeCardsWrap');
      var dots = wrap && wrap.querySelector(':scope > .home-card-dots');
      if (!box || !dots) return;
      var cards = Array.prototype.slice.call(box.querySelectorAll('.person-card:not(.hc-clone)'));
      if (!cards.length) return;
      var idx = best ? cards.indexOf(best) : -1;
      if (idx < 0) {
        var br = box.getBoundingClientRect(), mid = br.left + br.width / 2, bd = 1e9;
        cards.forEach(function (c, i) {
          var r = c.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - mid);
          if (d < bd) { bd = d; idx = i; }
        });
      }
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === idx); });
    }

    /* ===== چیدمان عمودی صفحهٔ اصلی =====
       فاصلهٔ پایین باکس ۴ تا پایین صفحه = فاصلهٔ بالای نوار ماه/سال تا بالای صفحه؛
       کارت و چهار باکس با فاصله‌های برابر بین نوار بالا و این نقطه چیده می‌شوند */
    var _safeBottomProbe = null;
    function homeSafeBottom() {
      try {
        if (!_safeBottomProbe) {
          _safeBottomProbe = document.createElement('div');
          _safeBottomProbe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom, 0px);visibility:hidden;pointer-events:none;';
          document.body.appendChild(_safeBottomProbe);
        }
        return _safeBottomProbe.getBoundingClientRect().height || 0;
      } catch (e) { return 0; }
    }
    function layoutHomeStack() {
      var panel = document.getElementById('panel-home');
      var stack = document.getElementById('homeStack');
      var chrome = document.getElementById('stickyChrome');
      var bar = chrome ? chrome.querySelector('.top-bar') : document.querySelector('.top-bar');
      if (!panel || !stack || !bar || !chrome) return;
      if (!panel.classList.contains('active')) return;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var cr = chrome.getBoundingClientRect(), tb = bar.getBoundingClientRect();
      if (!(tb.height > 0)) return;
      var b1 = document.getElementById('homeBox1');
      if (b1 && b1.offsetHeight > 0) document.documentElement.style.setProperty('--home-box-h', b1.offsetHeight + 'px');
      var gTop = Math.max(0, Math.round(tb.top - cr.top));
      var screenBottom = vh - homeSafeBottom();
      /* پنل از بالای خودش محتوا را می‌بُرد؛ پس پشته از بالای پنل شروع می‌شود و فاصلهٔ
         نوار بالا تا پنل (off) به همهٔ فاصله‌ها اضافه می‌شود تا فاصله‌ها برابر بمانند */
      stack.style.removeProperty('margin-top');
      var pr = panel.getBoundingClientRect();
      var panelH = Math.max(0, Math.round(screenBottom - pr.top));
      panel.style.setProperty('height', panelH + 'px', 'important');
      panel.style.setProperty('max-height', panelH + 'px', 'important');
      var off = Math.max(0, Math.round(pr.top - tb.bottom));
      var bottomY = Math.round(screenBottom - gTop);
      stack.style.setProperty('margin-top', '0px', 'important');
      stack.style.setProperty('padding-top', '0px', 'important');
      stack.style.setProperty('gap', off + 'px', 'important');
      stack.style.setProperty('height', Math.max(0, bottomY - Math.round(pr.top)) + 'px', 'important');
      var root = document.documentElement.style;
      root.removeProperty('--hc-card-h');
      /* ۱.۳.۶۸: کارت، باکس هوشمند (باقی جا) و دو باکس پایین با دایرهٔ موجودی میانشان.
         رنگ قرص فرورفتگی = رنگ زمینهٔ صفحه؛ اگر باکس هوشمند خیلی کوتاه شد، کارت کمی کوتاه‌تر می‌شود */
      try {
        /* ۱.۳.۶۹: رنگ قرص فرورفتگی مستقیم از رنگ زمینهٔ تم (CSS)، تا با عوض شدن تم همان لحظه عوض شود */
        root.removeProperty('--hk-page-bg');
        /* ۱.۳.۶۹: سه باکس هم‌ارتفاع با فاصلهٔ برابر: کارت، باکس هوشمند، و دو باکس پایین با دایرهٔ میانشان */
        var sm = document.getElementById('homeSmartBox'), dock = document.getElementById('homeDock');
        if (sm && dock) {
          var stH = stack.getBoundingClientRect().height;
          var third = Math.floor((stH - 2 * off) / 3);
          if (third > 150) {
            var dockGap = 12, dockH = Math.floor((third - dockGap) / 2);
            root.setProperty('--hc-card-h', third + 'px');
            root.setProperty('--hk-home-third', third + 'px');
            root.setProperty('--hk-dock-h', dockH + 'px');
            root.setProperty('--hk-dock-gap', dockGap + 'px');
            root.setProperty('--hk-bal-d', Math.min(124, Math.max(96, Math.round(third * 0.56))) + 'px');
          }
        }
      } catch (eC) {}
      try { fitHomeCardStats(); } catch (eF) {}
    }
    (function () {
      var t = 0;
      function go() { clearTimeout(t); t = setTimeout(function () { try { layoutHomeStack(); } catch (e) {} }, 60); }
      window.addEventListener('resize', go);
      window.addEventListener('orientationchange', go);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else go();
    })();

    /* ===== کاروسل کارت‌ها با کنترل JS =====
       انگشت اسکرول را مستقیم جابه‌جا می‌کند؛ با رها کردن، با منحنی ease-out روی کارت می‌نشیند.
       اگر کشیدن روی «باکس هوشمند» شروع شود، کشیدن کوتاه صفحهٔ پنل را عوض می‌کند و کشیدن بلند
       (بیش از ~¾ عرض پنل) به کاروسل کارت‌ها سپرده می‌شود. */
    var HomeCarousel = (function () {
      var st = null, animRaf = 0, blockClickUntil = 0;
      function box() { return document.getElementById('homeCards'); }
      function cardsOf(b) { return Array.prototype.slice.call(b.querySelectorAll('.person-card')); }
      function realCards(b) { return Array.prototype.slice.call(b.querySelectorAll('.person-card:not(.hc-clone)')); }
      function isRtl(b) { return getComputedStyle(b).direction === 'rtl'; }
      function clampS(b, v) {
        var m = Math.max(0, b.scrollWidth - b.clientWidth);
        return isRtl(b) ? Math.max(-m, Math.min(0, v)) : Math.max(0, Math.min(m, v));
      }
      function targetOf(b, c) { return clampS(b, c.offsetLeft + c.offsetWidth / 2 - b.clientWidth / 2); }
      function nearestCard(b, at, list) {
        var best = null, bd = 1e9;
        (list || cardsOf(b)).forEach(function (c) { var d = Math.abs(targetOf(b, c) - at); if (d < bd) { bd = d; best = c; } });
        return best;
      }
      function stepTarget(b, from, dir) {
        var best = null;
        cardsOf(b).forEach(function (c) {
          var t = targetOf(b, c);
          if (dir < 0 ? t < from - 1 : t > from + 1) { if (best == null || Math.abs(t - from) < Math.abs(best - from)) best = t; }
        });
        return best == null ? from : best;
      }
      /* جهت «جلو» (به سمت کارت بعدی) در واحد scrollLeft */
      function fwdSign(b) {
        var rc = realCards(b);
        if (rc.length < 2) return -1;
        return targetOf(b, rc[rc.length - 1]) < targetOf(b, rc[0]) ? -1 : 1;
      }
      /* ===== حلقهٔ بی‌پایان: نسخهٔ موقتِ کارت اول بعد از کارت آخر (یا کارت آخر قبل از کارت اول) =====
         کاربر طبیعی به «کارت بعدی» می‌رود؛ پس از ایستادن، نسخهٔ موقت با کارت واقعی جایگزین می‌شود (بدون پرش دیداری) */
      function addClone(b, where) {
        if (b._hcClone && !b.contains(b._hcClone.el)) b._hcClone = null; /* کارت‌ها دوباره رندر شده‌اند */
        if (b._hcClone) return 0;
        var rc = realCards(b);
        if (rc.length < 2) return 0;
        var src = where === 'end' ? rc[0] : rc[rc.length - 1];
        var cl = src.cloneNode(true);
        cl.classList.add('hc-clone');
        cl.setAttribute('aria-hidden', 'true');
        cl.style.transform = ''; cl.style.opacity = '';
        var shift = 0;
        if (where === 'end') {
          b.insertBefore(cl, rc[rc.length - 1].nextSibling);
        } else {
          var ref = rc[0], before = ref.getBoundingClientRect().left;
          b.insertBefore(cl, rc[0]);
          var after = ref.getBoundingClientRect().left;
          shift = after - before;
          b.scrollLeft += shift;                     /* نما ثابت بماند */
        }
        b._hcClone = { el: cl, where: where, of: src };
        return shift;
      }
      function removeClone(b, landOn) {
        var c = b._hcClone;
        if (!c) return;
        b._hcClone = null;
        try { c.el.remove(); } catch (e) {}
        if (landOn) b.scrollLeft = targetOf(b, landOn);
        try { if (typeof updateHomeCardScales === 'function') { var best = updateHomeCardScales(b); if (best && best.dataset.title) setActiveHomeCardTitle(best.dataset.title); updateHomeCardDots(b, best); } } catch (e2) {}
        schedulePark(b);
      }
      /* پیش‌آماده‌سازی: وقتی کاروسل روی کارت آخر/اول ایستاد، نسخهٔ موقتِ لازم برای چرخش از قبل ساخته شود
         تا لحظهٔ کشیدن هیچ DOM/تصویری ساخته نشود (علت گیر کوتاه در گذر از کارت آخر به اول) */
      var parkTimer = 0;
      function schedulePark(b) {
        clearTimeout(parkTimer);
        parkTimer = setTimeout(function () {
          try {
            if (!b || !b.isConnected || st || animRaf || !multi(b)) return;
            if (b._hcClone && !b.contains(b._hcClone.el)) b._hcClone = null;
            if (b._hcClone) return;
            var rc = realCards(b), n = nearestCard(b, b.scrollLeft, rc);
            if (!n || Math.abs(targetOf(b, n) - b.scrollLeft) > 2) return;
            if (n === rc[rc.length - 1]) { addClone(b, 'end'); if (b._hcClone) b._hcClone.parked = true; }
          } catch (e) {}
        }, 160);
      }
      function activeClone(b) { return !!(b && b._hcClone && !b._hcClone.parked && b.contains(b._hcClone.el)); }
      var anim = null, lastV = 0;
      /* سرعت لحظه‌ای حرکت جاری (واحد scrollLeft در میلی‌ثانیه) */
      function curVel() {
        if (!anim) return 0;
        var k = Math.min(1, anim.tv / anim.dur);
        return ((3 * k * k - 4 * k + 1) * anim.m0 + (-6 * k * k + 6 * k) * anim.d) / anim.dur;
      }
      function stopAnim() { if (animRaf) { lastV = curVel(); cancelAnimationFrame(animRaf); animRaf = 0; } anim = null; }
      /* حرکت «رهاشده»: با سرعت انگشت (v0) شروع و با کاهش یکنواخت سرعت دقیقاً روی کارت می‌ایستد.
         smooth: حرکت برنامه‌ای از حالت سکون (آرام شروع، آرام توقف).
         زمان حرکت از فریم‌ها جمع می‌شود و هر فریم حداکثر ۳۴ میلی‌ثانیه جلو می‌رود؛ اگر گوشی لحظه‌ای کند شد، کارت نمی‌پرد */
      function animateTo(b, to, dur, v0, done, smooth) {
        stopAnim();
        b = b || box();
        if (!b) return;
        to = clampS(b, to);
        var from = b.scrollLeft, d = to - from;
        if (Math.abs(d) < 1) { b.scrollLeft = to; if (done) done(); return; }
        v0 = Number(v0) || 0;
        if (v0 * d < 0) v0 = 0;
        if (!dur) {
          dur = Math.abs(v0) > 0.05 ? (2 * Math.abs(d) / Math.abs(v0)) : (380 + Math.abs(d) * 0.3);
          dur = Math.max(260, Math.min(720, dur));
        }
        var m0 = v0 * dur;
        if (Math.abs(m0) > Math.abs(d) * 2.2) m0 = d * 2.2;
        if (!v0) m0 = smooth ? 0 : d * 1.6;
        var a = anim = { from: from, d: d, m0: m0, dur: dur, tv: 0, last: performance.now() };
        var step = function (now) {
          if (anim !== a) return;
          a.tv += Math.max(0, Math.min(34, now - a.last)); a.last = now;
          var k = Math.min(1, a.tv / dur);
          var h10 = k * k * k - 2 * k * k + k, h01 = -2 * k * k * k + 3 * k * k;
          b.scrollLeft = from + h10 * m0 + h01 * d;
          if (k < 1) animRaf = requestAnimationFrame(step); else { b.scrollLeft = to; animRaf = 0; anim = null; lastV = 0; if (done) done(); }
        };
        animRaf = requestAnimationFrame(step);
      }
      function multi(b) { return realCards(b).length > 1 && !document.body.classList.contains('card-reorder-mode'); }
      function onMove(ev) {
        if (!st || ev.pointerId !== st.pid) return;
        if (st.fromPanel && !st.handoff) return;
        var b = box(); if (!b) return;
        var dx = ev.clientX - st.sx, dy = ev.clientY - st.sy;
        if (!st.drag) {
          if (Math.abs(dx) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) { end(); settle(b, 0); return; }
          st.drag = true; st.sx = ev.clientX; st.start = b.scrollLeft; dx = 0;
          st.dirHint = ev.clientX - st.sx0 > 0 ? 1 : -1;
          if (b._hcClone) b._hcClone.parked = false;   /* نسخهٔ از پیش ساخته حالا فعال است */
        }
        ensureWrap(b, -(ev.clientX - st.sx0));
        b.scrollLeft = clampS(b, st.start - dx);
        var now = performance.now();
        st.samples.push({ t: now, x: ev.clientX });
        while (st.samples.length > 2 && now - st.samples[0].t > 100) st.samples.shift();
      }
      /* اگر روی کارت آخر به جلو (یا روی کارت اول به عقب) کشیده شد، نسخهٔ موقت ساخته شود */
      function ensureWrap(b, scrollDir) {
        if (b._hcClone && !b.contains(b._hcClone.el)) b._hcClone = null;
        if (b._hcClone || !scrollDir) return;
        var rc = realCards(b);
        var cur = nearestCard(b, st.start, rc);
        var f = fwdSign(b), dir = scrollDir < 0 ? -1 : 1;
        if (cur === rc[rc.length - 1] && dir === f) addClone(b, 'end');
        else if (cur === rc[0] && dir === -f) { var sh = addClone(b, 'start'); st.start += sh; }
      }
      function onUp(ev) {
        if (!st || ev.pointerId !== st.pid) return;
        var b = box(), s = st;
        end();
        if (!b) return;
        if (!s.drag) {
          /* لمس بدون کشیدن (مثلاً وسط حرکت برای توقف): هرگز کارت نصفه نماند */
          if (s.wasAnim) blockClickUntil = Date.now() + 350;
          settle(b, 0);
          return;
        }
        blockClickUntil = Date.now() + 350;
        var v = 0;
        if (s.samples.length >= 2) {
          var a = s.samples[0], z = s.samples[s.samples.length - 1];
          if (z.t - a.t > 0) v = (z.x - a.x) / (z.t - a.t);
        }
        var fingerDx = (s.samples.length ? s.samples[s.samples.length - 1].x : s.sx) - s.sx;
        var baseCard = nearestCard(b, s.start);
        var base = baseCard ? targetOf(b, baseCard) : s.start;
        var to = base;
        if (Math.abs(fingerDx) > b.clientWidth * 0.18 || Math.abs(v) > 0.3) {
          var delta = b.scrollLeft - s.start;
          var dir = Math.abs(delta) > 2 ? (delta < 0 ? -1 : 1) : (fingerDx > 0 ? -1 : 1);
          to = stepTarget(b, base, dir);
        }
        animateTo(b, to, 0, -v, function () { finalize(b); });
      }
      function onCancel(ev) {
        if (!st || ev.pointerId !== st.pid) return;
        var b = box();
        end();
        if (b) settle(b, 0);
      }
      /* پایان هر حرکت: دقیقاً روی نزدیک‌ترین کارت؛ نسخهٔ موقت (حلقه) با کارت واقعی جایگزین می‌شود */
      function finalize(b) {
        if (!b || !b.isConnected) return;
        var c = b._hcClone;
        if (c && !b.contains(c.el)) { b._hcClone = null; c = null; }
        if (c && c.parked) {
          var nn = nearestCard(b, b.scrollLeft);
          if (nn && nn !== c.el) { var tt = targetOf(b, nn); if (Math.abs(b.scrollLeft - tt) > 0.5) b.scrollLeft = tt; return; }
          c.parked = false;
        }
        if (c) {
          var landed = nearestCard(b, b.scrollLeft);
          removeClone(b, landed === c.el ? c.of : landed);
          return;
        }
        var n = nearestCard(b, b.scrollLeft, realCards(b));
        if (n) { var t = targetOf(b, n); if (Math.abs(b.scrollLeft - t) > 0.5) b.scrollLeft = t; }
        schedulePark(b);
      }
      function offTarget(b) {
        var n = nearestCard(b, b.scrollLeft);
        return !!n && Math.abs(targetOf(b, n) - b.scrollLeft) > 2;
      }
      function settle(b, v) {
        if (!b || !b.isConnected || st) return;
        var n = nearestCard(b, b.scrollLeft);
        if (!n) return;
        var t = targetOf(b, n);
        if (Math.abs(b.scrollLeft - t) < 1) { finalize(b); return; }
        animateTo(b, t, 0, v || 0, function () { finalize(b); });
      }
      /* رندر دوباره یا تغییر چیدمان: حرکت نیمه‌کاره و نسخهٔ موقت پاک شود */
      function cancel() {
        stopAnim();
        if (st) end();
        var b = box();
        if (b && b._hcClone) { try { b._hcClone.el.remove(); } catch (e) {} b._hcClone = null; }
      }
      function end() {
        st = null;
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onCancel, true);
      }
      function bind() {
        var b = box();
        if (!b || b._hcBound) return;
        b._hcBound = true;
        b.addEventListener('pointerdown', function (ev) {
          if (ev.button != null && ev.button !== 0) return;
          if (!multi(b)) return;
          if (st) end();
          var wasAnim = !!animRaf;
          stopAnim();
          /* نسخهٔ موقت فقط وقتی دقیقاً روی کارت هستیم حذف شود (بدون پرش)؛ وسط حرکت می‌ماند تا کشیدن ادامه یابد */
          clearTimeout(parkTimer);
          if (b._hcClone && !b._hcClone.parked) {
            if (!b.contains(b._hcClone.el)) b._hcClone = null;
            else { var nc = nearestCard(b, b.scrollLeft); if (nc && Math.abs(targetOf(b, nc) - b.scrollLeft) < 2) finalize(b); }
          }
          /* کارت هنوز در حرکت یا جا نیفتاده → کشیدن مال کاروسل است، نه باکس هوشمند */
          var unsettled = wasAnim || activeClone(b) || offTarget(b);
          st = { pid: ev.pointerId, sx: ev.clientX, sx0: ev.clientX, sy: ev.clientY, start: b.scrollLeft, drag: false, samples: [], wasAnim: wasAnim,
                 fromPanel: !unsettled && !!(ev.target && ev.target.closest && ev.target.closest('.sp-panel')), handoff: false };
          window.addEventListener('pointermove', onMove, true);
          window.addEventListener('pointerup', onUp, true);
          window.addEventListener('pointercancel', onCancel, true);
        });
        /* کلیکِ پس از کشیدن (مثلاً روی کادر درآمد/مخارج) اجرا نشود */
        b.addEventListener('click', function (ev) {
          if (Date.now() < blockClickUntil) { ev.stopPropagation(); ev.preventDefault(); }
        }, true);
      }
      /* پنل هوشمند کشیدن را واگذار می‌کند */
      function takeOver(ev) {
        var b = box();
        if (!st || !b || ev.pointerId !== st.pid) return false;
        st.handoff = true; st.drag = true; st.sx = ev.clientX; st.start = b.scrollLeft; st.samples = [];
        return true;
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
      /* محافظ: اگر به هر دلیلی (تغییر اندازه، برگشت به برنامه) کارت نصفه ماند، جا بیفتد */
      function guard() { var b = box(); if (b && !st && !animRaf && b.offsetParent) settle(b, 0); }
      document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(guard, 60); });
      window.addEventListener('resize', function () { setTimeout(guard, 200); });
      return { animateTo: animateTo, takeOver: takeOver, bind: bind, cancel: cancel, settle: function () { guard(); },
               animating: function () { return !!animRaf; },
               /* سرعت حرکتی که آخرین بار قطع شد (برای ادامهٔ نرم بعد از رسم دوباره) */
               lastVel: function () { return lastV; },
               glideTo: function (b, to, dur, done) { animateTo(b, to, dur || 560, 0, done, true); },
               busy: function () { var b = box(); return !!b && multi(b) && (!!animRaf || !!st && !!st.drag || activeClone(b) || offTarget(b)); },
               canDrag: function () { var b = box(); return !!b && multi(b); } };
    })();

    /* =====================================================================
       تور آموزشی بار اول: نورافکن روی هر بخش + حباب توضیح با انیمیشن نرم
       فقط یک بار به‌صورت خودکار؛ از «راهنما» دوباره قابل نمایش است.
       ===================================================================== */
    var APP_TOUR_KEY = STORAGE_KEY + '_tourDone';
    var _tourPolling = false;
    function appTourSteps() {
      var q = function (sel) { return function () { return document.querySelector(sel); }; };
      var activeCard = function () {
        var box = document.getElementById('homeCards'), best = null, bd = 1e9;
        if (!box) return null;
        var br = box.getBoundingClientRect(), mid = br.left + br.width / 2;
        box.querySelectorAll('.person-card:not(.hc-clone)').forEach(function (c) { var r = c.getBoundingClientRect(); var d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = c; } });
        return best;
      };
      var inCard = function (sel) { return function () { var c = activeCard(); return c ? c.querySelector(sel) : null; }; };
      return [
        { title: 'به حساب‌کتاب خوش آمدید 👋', text: 'در چند قدم کوتاه بخش‌های اصلی نرم‌افزار را با هم می‌بینیم. هر وقت خواستید با «رد کردن» تور را ببندید.' },
        { el: function () { return [document.getElementById('monthSelectWrap'), document.getElementById('yearSelectWrap')]; }, title: 'ماه و سال', text: 'هر ماه دفتر جداگانه دارد. با انتخاب ماه و سال، درآمدها و مخارج همان ماه نمایش داده می‌شود.' },
        { el: q('#menuBtn'), title: 'منوی اصلی', text: 'همهٔ بخش‌ها، تنظیمات، حالت شب/روز، امنیت، پشتیبان‌گیری و راهنما از این‌جا در دسترس است.' },
        { el: activeCard, title: 'کارت شما', text: 'خلاصهٔ درآمد و خرج ماه. با نگه داشتن انگشت روی کارت، «حذف ماه» و «حذف کلی» می‌آیند (حذف‌ها به سطل زباله می‌روند و برمی‌گردند).' },
        { el: inCard('.person-stat-box'), title: 'درآمد کل', text: '«درآمد کل» جمع درآمدهای ماه است؛ «دریافت‌شده» یعنی به حساب آمده و «دریافت‌نشده» هنوز نرسیده. روی کادر بزنید تا ردیف‌ها را ببینید و ثبت کنید.' },
        { el: function () { var c = activeCard(); var b = c ? c.querySelectorAll('.person-stat-box') : []; return b[1] || null; }, title: 'خرج کل', text: 'جمع مخارج ماه، جدا به پرداخت‌شده و پرداخت‌نشده. در جدول مخارج، با نگه داشتن انگشت روی هر ردیف، ویرایش یا حذفش می‌آید.' },
        { el: q('#homeSmartBox'), title: 'باکس هوشمند', text: 'هر اسلاید دربارهٔ یک موضوع است و خودکار ورق می‌خورد: وضعیت ماه، طلب و بدهی، دسته‌بندی مخارج، «کارهای من» و…؛ با زدن هر اسلاید به بخش خودش می‌روید.', swipe: true },
        /* ۱.۳.۷۳: سه قدم جدا: باکس بالا (بدون نیمهٔ بالایی دایره)، باکس پایین (بدون نیمهٔ پایینی دایره)، و خود دایرهٔ موجودی */
        { el: q('#homeDockTop'), cut: true, title: 'میان‌برها', text: 'دو میان‌بر دلخواه (پیش‌فرض: پروژه‌ها و درآمد ثابت). با نگه داشتن هر کدام یا از «منو ← شخصی‌سازی» عوضشان کنید؛ بقیهٔ بخش‌ها در منوی اصلی‌اند.' },
        { el: q('#homeBox4'), cut: true, title: 'ثبت و جستجو', text: '«+» برای ثبت درآمد یا خرج (برای پروژه، اول اسم پروژه را بزنید)؛ ذره‌بین برای جستجو در همهٔ ثبت‌ها و ماندهٔ هر بخش.' },
        { el: q('#homeBalanceCircle'), round: true, title: 'موجودی', text: 'موجودی لحظه‌ای همهٔ حساب‌ها. با زدنش، موجودی هر حساب جدا دیده می‌شود و می‌توانید چند حساب را با هم جمع بزنید.' },
        { title: 'آماده‌اید! 🎉', text: 'از «منو ← راهنما» می‌توانید این تور را دوباره ببینید.', last: true }
      ];
    }
    function startAppTour(force) {
      if (document.getElementById('appTour')) return;
      try { if (!force && localStorage.getItem(APP_TOUR_KEY) === '1') return; } catch (e) {}
      try { localStorage.setItem(APP_TOUR_KEY, '1'); localStorage.setItem(STORAGE_KEY + '_cardSwipeHintDone', '1'); } catch (e2) {}
      try { if (currentTab !== 'home') switchTab('home'); } catch (e3) {}
      var steps = appTourSteps(), i = 0;
      var root = document.createElement('div');
      root.id = 'appTour';
      root.className = 'tour-root';
      root.innerHTML = '<div class="tour-spot"><span class="tour-cutw"><i class="tour-cut"></i></span><i class="tour-pulse"></i><i class="tour-swipe"></i></div>' +
        '<div class="tour-bubble" role="dialog" aria-live="polite"><div class="tour-step"></div><div class="tour-title"></div><div class="tour-text"></div>' +
        '<div class="tour-dots"></div><div class="tour-actions"><button type="button" class="tour-skip">رد کردن</button><span class="tour-sp"></span><button type="button" class="tour-prev">قبلی</button><button type="button" class="tour-next">بعدی</button></div></div>';
      document.body.appendChild(root);
      var spot = root.querySelector('.tour-spot'), bubble = root.querySelector('.tour-bubble');
      var dots = root.querySelector('.tour-dots');
      steps.forEach(function () { dots.appendChild(document.createElement('i')); });
      function rectOf(st) {
        if (!st.el) return null;
        var els = st.el(); els = Array.isArray(els) ? els : [els];
        var l = 1e9, t = 1e9, r = -1e9, b = -1e9, any = false;
        els.forEach(function (e) { if (!e) return; var x = e.getBoundingClientRect(); if (!x.width) return; any = true; l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom); });
        if (!any) return null;
        /* کادر سبز (و حلقهٔ چشمک‌زن ۴px بیرونش) کامل داخل صفحه بماند؛ برای باکس‌های لبهٔ بالا/پایین هم */
        var pad = st.cut ? 0 : 6, edge = 7, W = window.innerWidth, H = window.innerHeight;
        var L = Math.max(edge, l - pad), T = Math.max(edge, t - pad), Rr = Math.min(W - edge, r + pad), B = Math.min(H - edge, b + pad);
        return { left: L, top: T, width: Math.max(0, Rr - L), height: Math.max(0, B - T) };
      }
      function show() {
        var st = steps[i], R = rectOf(st), W = window.innerWidth, H = window.innerHeight;
        root.classList.toggle('no-target', !R);
        if (R) {
          spot.style.left = R.left + 'px'; spot.style.top = R.top + 'px'; spot.style.width = R.width + 'px'; spot.style.height = R.height + 'px';
        } else {
          spot.style.left = (W / 2) + 'px'; spot.style.top = (H / 2) + 'px'; spot.style.width = '0px'; spot.style.height = '0px';
        }
        spot.classList.toggle('swipe', !!st.swipe);
        /* دور دایرهٔ موجودی: گرد؛ باکس‌های دو طرفش: همان بریدگی دور دایره هم تیره می‌ماند تا دایره داخل هایلایت نیفتد */
        spot.classList.toggle('round', !!st.round);
        var cut = root.querySelector('.tour-cut');
        if (st.cut && R) {
          var bc = document.getElementById('homeBalanceCircle'), cr = bc && bc.getBoundingClientRect();
          var gap = parseFloat(getComputedStyle(document.getElementById('homeDock') || document.documentElement).getPropertyValue('--hk-notch-gap')) || 12;
          if (cr && cr.width) {
            var rad = cr.width / 2 + gap, cx = cr.left + cr.width / 2 - R.left, cy = cr.top + cr.height / 2 - R.top;
            cut.style.cssText = 'display:block;left:' + (cx - rad) + 'px;top:' + (cy - rad) + 'px;width:' + (2 * rad) + 'px;height:' + (2 * rad) + 'px;';
            /* ۱.۳.۷۶: کادر چشمک‌زن دقیقاً شکل باکس، با همان فرورفتگی دور دایره */
            var w0 = R.width, h0 = R.height, rr = 18, id = 'tsh' + i;
            var shp = spot.querySelector('.tour-shape'); if (!shp) { shp = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); shp.setAttribute('class', 'tour-shape'); spot.appendChild(shp); }
            shp.setAttribute('viewBox', '-4 -4 ' + (w0 + 8) + ' ' + (h0 + 8)); shp.setAttribute('width', w0 + 8); shp.setAttribute('height', h0 + 8);
            shp.innerHTML = '<defs><mask id="' + id + 'm" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w0 + 20) + '" height="' + (h0 + 20) + '"><rect x="-10" y="-10" width="' + (w0 + 20) + '" height="' + (h0 + 20) + '" fill="#fff"/><circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="#000"/></mask>' +
              '<clipPath id="' + id + 'c"><rect x="0" y="0" width="' + w0 + '" height="' + h0 + '" rx="' + rr + '"/></clipPath></defs>' +
              '<rect x="1" y="1" width="' + (w0 - 2) + '" height="' + (h0 - 2) + '" rx="' + rr + '" fill="none" mask="url(#' + id + 'm)"/>' +
              '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rad + 1) + '" fill="none" clip-path="url(#' + id + 'c)"/>';
            spot.classList.add('shaped');
          } else { cut.style.display = 'none'; spot.classList.remove('shaped'); }
        } else { cut.style.display = 'none'; spot.classList.remove('shaped'); }
        bubble.classList.remove('in');
        void bubble.offsetWidth;
        root.querySelector('.tour-step').textContent = toPersianDigits(i + 1) + ' از ' + toPersianDigits(steps.length);
        root.querySelector('.tour-title').textContent = st.title;
        root.querySelector('.tour-text').textContent = st.text;
        Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
        root.querySelector('.tour-prev').style.visibility = i === 0 ? 'hidden' : 'visible';
        root.querySelector('.tour-next').textContent = st.last ? 'شروع' : 'بعدی';
        root.querySelector('.tour-skip').style.visibility = st.last ? 'hidden' : 'visible';
        /* حباب زیر یا بالای هدف، هر کدام جای بیشتری دارد */
        var bh = bubble.offsetHeight || 170, top;
        if (!R) top = Math.max(16, (H - bh) / 2);
        else if (R.top + R.height + bh + 24 < H) top = R.top + R.height + 14;
        else top = Math.max(12, R.top - bh - 14);
        bubble.style.top = top + 'px';
        requestAnimationFrame(function () { bubble.classList.add('in'); });
      }
      function close() {
        root.classList.add('out');
        setTimeout(function () { try { root.remove(); } catch (e) {} }, 320);
        window.removeEventListener('resize', show);
        /* ۱.۳.۶۵: نصب تازه: بعد از راهنما «حساب‌هایت را پیدا کنیم» */
        try { if (!force && typeof hkSetupNeeded === 'function' && hkSetupNeeded()) setTimeout(function () { try { hkOpenSetup(); } catch (eS) {} }, 450); } catch (eS0) {}
      }
      root.querySelector('.tour-next').onclick = function () { if (i >= steps.length - 1) { close(); return; } i++; show(); };
      root.querySelector('.tour-prev').onclick = function () { if (i > 0) { i--; show(); } };
      root.querySelector('.tour-skip').onclick = close;
      root._close = close;
      /* لمس بیرون از دکمه‌های تور: هیچ کاری نکند و به صفحهٔ زیر نرسد */
      ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (ev) {
        root.addEventListener(ev, function (e) { if (!(e.target.closest && e.target.closest('.tour-actions button'))) e.stopPropagation(); }, false);
      });
      window.addEventListener('resize', show);
      requestAnimationFrame(function () { root.classList.add('on'); show(); });
    }
    function closeAppTour() { var r = document.getElementById('appTour'); if (r && r._close) { r._close(); return true; } return false; }
    /* شروع خودکار: وقتی صفحهٔ اصلی واقعاً دیده می‌شود (هیچ پنجره/قفلی رویش نیست) */
    function maybeStartAppTour() {
      try { if (localStorage.getItem(APP_TOUR_KEY) === '1') return; } catch (e) { return; }
      if (_tourPolling) return;
      _tourPolling = true;
      var stable = 0, tries = 0;
      var tick = function () {
        tries++;
        if (tries > 600) { _tourPolling = false; return; }
        try { if (localStorage.getItem(APP_TOUR_KEY) === '1') { _tourPolling = false; return; } } catch (e0) {}
        var card = document.querySelector('#homeCards .person-card'), panel = document.getElementById('panel-home'), ok = false;
        if (card && panel && panel.classList.contains('active') && !document.hidden && !document.body.classList.contains('card-reorder-mode')) {
          var r = card.getBoundingClientRect();
          if (r.width > 0) { var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); ok = !!(hit && card.contains(hit)); }
        }
        stable = ok ? stable + 1 : 0;
        if (stable < 3) { setTimeout(tick, 400); return; }
        _tourPolling = false;
        startAppTour(false);
      };
      setTimeout(tick, 900);
    }
    try { window.startAppTour = startAppTour; } catch (eW) {}

    /* ===== راهنمای اسکرول کارت: فقط بار اولِ اجرای برنامه، یک رفت‌وبرگشت آهسته ===== */
    var _cardHintPolling = false;
    function maybeRunCardSwipeHint() {
      return; /* ۱.۳.۴۴: یک کارت؛ راهنمای کشیدن بین کارت‌ها لازم نیست */
      var KEY = STORAGE_KEY + '_cardSwipeHintDone';
      try { if (localStorage.getItem(KEY) === '1') return; } catch (e) { return; }
      /* تور بار اول خودش کشیدن کارت را آموزش می‌دهد */
      try { if (localStorage.getItem(STORAGE_KEY + '_tourDone') !== '1') return; } catch (eT) {}
      if (_cardHintPolling) return;
      _cardHintPolling = true;
      var stable = 0, tries = 0;
      var tick = function () {
        tries++;
        if (tries > 400) { _cardHintPolling = false; return; }
        var box = document.getElementById('homeCards');
        var card = box && box.querySelector('.person-card');
        var panel = document.getElementById('panel-home');
        var ok = false;
        if (card && panel && panel.classList.contains('active') && !document.hidden &&
            !document.body.classList.contains('card-reorder-mode')) {
          var r = card.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            /* کارت واقعاً دیده می‌شود (قفل، مودال یا لایه‌ای رویش نیست) */
            var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            ok = !!(hit && card.contains(hit));
          }
        }
        stable = ok ? stable + 1 : 0;
        if (stable < 3) { setTimeout(tick, 400); return; }
        _cardHintPolling = false;
        try { localStorage.setItem(KEY, '1'); } catch (e2) {}
        try {
          if (!card.animate) return;
          /* کارت بعدی سمت چپ است؛ کارت کمی به راست می‌رود و برمی‌گردد */
          /* حرکت ظریف و دوبار: کمی جلو، مکث کوتاه، برگشت؛ سپس استراحت و تکرار */
          var dist = Math.round(Math.min(30, r.width * 0.075));
          var base = card.style.transform || 'none';
          var moved = (base === 'none' ? '' : base + ' ') + 'translateX(' + dist + 'px)';
          card.animate([
            { transform: base, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
            { transform: moved, offset: 0.32, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
            { transform: moved, offset: 0.4, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
            { transform: base, offset: 0.72 },
            { transform: base }
          ], { duration: 1500, iterations: 2 });
        } catch (e3) {}
      };
      setTimeout(tick, 600);
    }

    /* =====================================================================
       دسته‌بندی هوشمند مخارج (HKCategorizer)
       ترتیب تشخیص: ۱) دیکشنری شخصی کاربر (localStorage)  ۲) دیکشنری داخلی
       ۳) در آینده: سرویس امن بک‌اند (فقط برای شرح‌های ناشناخته).
       هیچ کلید API یا secret در این فایل نیست و نباید باشد؛ کلید فقط روی سرور
       بک‌اند نگه‌داری می‌شود و نرم‌افزار فقط به آدرس آن درخواست می‌فرستد.
       ===================================================================== */
    var HKCategorizer = (function () {
      /* آدرس سرویس بک‌اند دسته‌بندی (خالی = غیرفعال؛ هیچ درخواست شبکه‌ای ارسال نمی‌شود).
         قرارداد پیشنهادی: POST {items:["شرح", ...]} → {results:[{text:"شرح", category:"food"}]} */
      var REMOTE_URL = '';
      var DICT_KEY = STORAGE_KEY + '_catDict';
      var CATS = [
        { id: 'food', label: 'خوراکی', kw: ['پیتزا', 'رستوران', 'فست فود', 'فستفود', 'ساندویچ', 'همبرگر', 'برگر', 'کباب', 'جوجه', 'غذا', 'نهار', 'ناهار', 'شام', 'صبحانه', 'کافه', 'قهوه', 'چای', 'شیرینی', 'کیک', 'بستنی', 'میوه', 'سبزی', 'نان', 'نانوایی', 'گوشت', 'مرغ', 'ماهی', 'برنج', 'روغن', 'لبنیات', 'شیر', 'ماست', 'پنیر', 'تخم مرغ', 'سوپرمارکت', 'سوپر مارکت', 'هایپر', 'افق کوروش', 'میوه فروشی', 'قصابی', 'خواربار', 'تنقلات', 'آجیل', 'اسنپ فود', 'اسنپفود', 'دلیوری', 'خوراکی', 'خرید روزانه'] },
        { id: 'transport', label: 'حمل‌ونقل', kw: ['بنزین', 'سوخت', 'گازوئیل', 'cng', 'اسنپ', 'تپسی', 'تاکسی', 'آژانس', 'مترو', 'اتوبوس', 'بلیت', 'بلیط', 'قطار', 'هواپیما', 'پرواز', 'عوارض', 'پارکینگ', 'کارواش', 'تعمیر ماشین', 'تعمیرگاه', 'مکانیک', 'لاستیک', 'روغن موتور', 'بیمه بدنه', 'بیمه ثالث', 'جریمه', 'خودرو', 'ماشین', 'موتور'] },
        { id: 'bills', label: 'قبوض', kw: ['قبض', 'برق', 'آب', 'گاز', 'تلفن', 'اینترنت', 'شارژ', 'بسته اینترنت', 'سیم کارت', 'ایرانسل', 'همراه اول', 'رایتل', 'مخابرات', 'عوارض شهرداری', 'شارژ ساختمان', 'آبونمان'] },
        { id: 'clothing', label: 'پوشاک', kw: ['کفش', 'لباس', 'پیراهن', 'شلوار', 'مانتو', 'کت', 'کاپشن', 'جوراب', 'کیف', 'پوشاک', 'تیشرت', 'دامن', 'روسری', 'شال', 'کمربند'] },
        /* ۱.۳.۸۳: «سلامت» و «آرایش و بهداشت» یکی شدند */
        { id: 'health', label: 'سلامت و بهداشت', kw: ['آرایشگاه', 'آرایشی', 'بهداشتی', 'شامپو', 'عطر', 'ادکلن', 'کرم', 'اصلاح', 'سالن زیبایی', 'مو', 'داروخانه', 'دارو', 'دکتر', 'پزشک', 'ویزیت', 'دندانپزشک', 'دندان', 'بیمارستان', 'آزمایش', 'سونوگرافی', 'عینک', 'بیمه تکمیلی', 'فیزیوتراپی', 'درمانگاه', 'کلینیک', 'آمپول'] },
        /* ۱.۳.۸۳: «مسکن» و «لوازم خانه» یکی شدند (نام «لوازم خانه»، آیکون خانه) */
        { id: 'home', label: 'لوازم خانه', kw: ['اجاره', 'رهن', 'ودیعه', 'تعمیرات', 'لوله کش', 'برقکار', 'نقاشی ساختمان', 'بنگاه', 'کمیسیون', 'یخچال', 'لباسشویی', 'ظرفشویی', 'مبل', 'فرش', 'لوازم خانگی', 'ظروف', 'شوینده', 'دستمال', 'پودر', 'جاروبرقی', 'تلویزیون', 'لامپ'] },
        { id: 'education', label: 'آموزش', kw: ['شهریه', 'کلاس', 'کتاب', 'دانشگاه', 'مدرسه', 'آموزشگاه', 'دوره', 'لوازم التحریر', 'دفتر', 'کنکور'] },
        { id: 'fun', label: 'تفریح', kw: ['سینما', 'تئاتر', 'کنسرت', 'سفر', 'هتل', 'مسافرت', 'شهربازی', 'باشگاه', 'استخر', 'بازی', 'فیلیمو', 'نماوا', 'اشتراک', 'گردش', 'کافی نت'] },
        { id: 'gift', label: 'هدیه و کمک', kw: ['هدیه', 'کادو', 'عیدی', 'نذر', 'صدقه', 'خیریه', 'کمک به'] },
        { id: 'debt', label: 'اقساط و وام', kw: ['قسط', 'اقساط', 'وام', 'بدهی', 'چک'] },
        { id: 'tech', label: 'دیجیتال', kw: ['موبایل', 'گوشی', 'لپ تاپ', 'لپتاپ', 'کامپیوتر', 'هدفون', 'شارژر', 'کابل', 'دیجی کالا', 'دیجیکالا'] }
      ];
      var BY_ID = {};
      CATS.forEach(function (c) { BY_ID[c.id] = c; });
      /* ۱.۳.۸۳: شناسه‌های ادغام‌شده → دستهٔ تازه (دیکشنری یادگرفته، پنهان‌ها و آمار قبلی) */
      var ALIAS = { housing: 'home', care: 'health' };
      function al(id) { return ALIAS[id] || id; }
      var _dict = null;
      var _pending = {};
      function norm(s) {
        s = String(s == null ? '' : s);
        try { s = toEnglishDigits(s); } catch (e) {}
        return s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ة]/g, 'ه').replace(/[أإآ]/g, 'ا')
          .replace(/[‌‏‎ً-ٟ]/g, ' ')
          .replace(/[0-9.,،؛:!؟?()\[\]{}"'«»\-_/\\+*#@٪%]+/g, ' ')
          .replace(/\s+/g, ' ').trim().toLowerCase();
      }
      /* کلیدواژه‌ها هم نرمال شوند (مثلاً «آب» → «اب») */
      /* بانک گسترش‌یافتهٔ کلیدواژه‌ها (بدون تکرار) */
      var EXTRA_KW = {"food": ["نانوایی سنگک", "بربری", "لواش", "تافتون", "کره", "خامه", "دوغ", "کشک", "عسل", "مربا", "شکر", "قند", "نمک", "ادویه", "زعفران", "حبوبات", "لوبیا", "عدس", "نخود", "ماکارونی", "رب", "کنسرو", "تن ماهی", "سوسیس", "کالباس", "همبرگر", "چیپس", "پفک", "نوشابه", "آبمیوه", "آب معدنی", "شیرینی فروشی", "قنادی", "کافی شاپ", "فلافل", "کبابی", "حلیم", "آش", "جگرکی", "طباخی", "پیتزا فروشی", "سوشی", "فست فود", "سبزیجات", "صیفی", "گوجه", "سیب زمینی", "پیاز", "خیار", "هندوانه", "پرتقال", "سیب", "موز", "خرما", "گردو", "پسته", "بادام", "تخمه", "کلوچه", "بیسکویت", "شکلات", "کیک", "ژله", "بستنی فروشی", "سوپر", "هایپرمارکت", "فروشگاه رفاه", "شهروند", "هایپر استار", "جانبو", "اکالا", "دیجی فرش", "اسنپ مارکت", "تپسی فود", "بوقلمون", "میگو", "گوشت قرمز", "گوساله", "گوسفند", "مرغ و تخم مرغ", "پنیر پیتزا", "نهار اداره"], "transport": ["کرایه", "تاکسی اینترنتی", "اسنپ باکس", "الوپیک", "پیک", "دوچرخه", "اسکوتر", "بلیط اتوبوس", "بلیط هواپیما", "بلیط قطار", "رجا", "فلای تودی", "علی بابا", "عوارض آزادراه", "طرح ترافیک", "پلاک", "معاینه فنی", "تعویض روغن", "فیلتر", "باتری ماشین", "لنت", "تعمیر موتور", "صافکاری", "نقاشی ماشین", "کارواش", "پمپ بنزین", "جایگاه سوخت", "گاز cng", "کارت سوخت", "مترو کارت", "شارژ کارت مترو", "قطار شهری", "بیمه خودرو", "خلافی"], "bills": ["آب و فاضلاب", "برق منطقه", "گاز شهری", "تلفن ثابت", "موبایل", "شارژ همراه", "بسته اینترنت", "اینترنت خانگی", "وای فای", "adsl", "فیبر نوری", "مبین نت", "شاتل", "های وب", "پارس آنلاین", "آسیاتک", "قبض آب", "قبض گاز", "قبض تلفن", "قبض موبایل", "مالیات", "عوارض نوسازی", "شارژ آپارتمان", "حق شارژ"], "clothing": ["کتونی", "صندل", "دمپایی", "بوت", "پالتو", "سویشرت", "هودی", "بلوز", "تاپ", "ژاکت", "کراوات", "لباس زیر", "جین", "مایو", "چادر", "کیف پول", "ساعت مچی", "عینک آفتابی", "زیورآلات", "طلا", "نقره", "خیاطی", "خشکشویی", "اتوشویی"], "health": ["داروی", "قرص", "شربت", "واکسن", "رادیولوژی", "ام آر آی", "سی تی اسکن", "نوار قلب", "چشم پزشک", "اپتومتری", "لنز", "ارتودنسی", "جراحی", "بستری", "پرستار", "مشاوره", "روانشناس", "روانپزشک", "تغذیه", "مکمل", "ویتامین", "بیمه درمان", "فرانشیز", "آزمایشگاه", "سونو", "دندانساز", "آرایشگر", "سلمانی", "پیرایش", "کوتاهی مو", "رنگ مو", "کراتین", "ناخن", "مانیکور", "پدیکور", "اپیلاسیون", "لیزر", "فیشیال", "ماسک", "ضد آفتاب", "لوسیون", "صابون", "خمیر دندان", "مسواک", "دئودورانت", "ژیلت", "تیغ", "نوار بهداشتی", "پوشک"], "home": ["مبلمان", "میز", "صندلی", "تخت", "کمد", "بخاری", "کولر", "پنکه", "اتو", "مایکروویو", "اجاق", "گاز رومیزی", "هود", "سماور", "کتری", "چای ساز", "قهوه ساز", "آبمیوه گیری", "مخلوط کن", "غذاساز", "جارو", "سطل", "ظرف", "قابلمه", "ماهیتابه", "بشقاب", "لیوان", "قاشق", "ملافه", "پتو", "بالشت", "حوله", "مایع ظرفشویی", "سفید کننده", "دستمال کاغذی", "کیسه زباله", "لامپ ال ای دی", "ابزار", "پیچ گوشتی", "اجاره خانه", "اجاره بها", "پیش پرداخت اجاره", "ودیعه مسکن", "تعمیر لوله", "لوله کشی", "کابینت", "کاشی", "سرامیک", "گچ کاری", "بنایی", "نقاش", "کاغذ دیواری", "پرده", "ایزوگام", "آسانسور", "نگهبانی", "سرایداری", "بیمه آتش سوزی", "مصالح", "سیمان", "آجر", "در و پنجره"], "education": ["کتاب درسی", "کتابفروشی", "نوشت افزار", "خودکار", "مداد", "کیف مدرسه", "سرویس مدرسه", "کلاس زبان", "آموزشگاه زبان", "کلاس کنکور", "کلاس خصوصی", "معلم خصوصی", "دوره آنلاین", "کورس", "یودمی", "فرادرس", "مکتب خونه", "آزمون", "ثبت نام", "شهریه دانشگاه", "پایان نامه", "ترجمه", "تایپ"], "fun": ["کافه گردی", "رستوران گردی", "تفریحی", "پارک آبی", "بولینگ", "بیلیارد", "کارتینگ", "پینت بال", "اتاق فرار", "موزه", "بلیت کنسرت", "تئاتر شهر", "فیلم", "نتفلیکس", "اسپاتیفای", "یوتیوب پریمیوم", "بازی کامپیوتری", "پلی استیشن", "ایکس باکس", "گیفت کارت", "اقامتگاه", "ویلا", "کمپ", "تور", "بلیط تور", "کیش", "شمال", "مشهد", "ورزش", "بدنسازی", "یوگا", "شنا", "فوتبال", "سالن ورزشی"], "gift": ["هدیه عروسی", "کادوی تولد", "شیرینی عید", "گل فروشی", "دسته گل", "تاج گل", "کمک مالی", "قرض الحسنه", "زکات", "خمس", "فطریه", "کفاره", "نذری", "هیئت", "مسجد", "موسسه خیریه", "بهزیستی", "محک", "کمیته امداد"], "debt": ["اقساط وام", "قسط وام", "بازپرداخت", "لیزینگ", "کارت اعتباری", "بدهی کارت", "جریمه دیرکرد", "سود وام", "اصل وام", "چک برگشتی", "ضمانت"], "tech": ["تبلت", "آیپد", "آیفون", "سامسونگ", "شیائومی", "لوازم جانبی", "قاب گوشی", "گلس", "پاوربانک", "فلش", "هارد", "مموری", "کیبورد", "ماوس", "مانیتور", "پرینتر", "کارتریج", "مودم", "روتر", "اسپیکر", "ایرپاد", "ساعت هوشمند", "اپلیکیشن", "نرم افزار", "لایسنس", "آنتی ویروس", "vpn", "فیلترشکن", "هاست", "دامنه", "سرور", "اشتراک ابری", "گوگل وان", "آیکلود", "تعمیر موبایل", "تعمیر لپ تاپ"]};
      CATS.forEach(function (c) {
        var add = EXTRA_KW[c.id];
        if (add) add.forEach(function (w) { if (c.kw.indexOf(w) < 0) c.kw.push(w); });
      });
      CATS.forEach(function (c) { c.nkw = c.kw.map(norm).filter(Boolean); });
      /* دسته‌های ساخت کاربر: کنار دسته‌های پیش‌فرض؛ نام دسته خودش کلیدواژه است
         (اگر کلمه‌ای از شرح با نام دسته یکی باشد، در همان دسته حساب می‌شود) */
      var CUSTOM_KEY = STORAGE_KEY + '_catCustom';
      function registerCustom(c) {
        if (!c || !c.id || !c.label || BY_ID[c.id]) return null;
        var cat = { id: c.id, label: c.label, kw: [c.label], custom: true };
        cat.nkw = cat.kw.map(norm).filter(Boolean);
        try { _bcache = {}; } catch (eB) {}
        CATS.push(cat);
        BY_ID[cat.id] = cat;
        return cat;
      }
      try { (JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') || []).forEach(registerCustom); } catch (eCu) {}
      /* ۱.۳.۴۸: حذف دسته با × — دستهٔ دلخواه پاک می‌شود، دستهٔ پیش‌فرض پنهان؛ شرح‌های آن دسته «نامشخص» می‌شوند */
      var HIDDEN_KEY = STORAGE_KEY + '_catHidden';
      function dropFromList(id) {
        for (var i = CATS.length - 1; i >= 0; i--) if (CATS[i].id === id) CATS.splice(i, 1);
        delete BY_ID[id];
      }
      try { (JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') || []).forEach(function (id) { if (BY_ID[id] && !BY_ID[id].custom) dropFromList(id); }); } catch (eHi) {}
      function removeCat(id) {
        var c = BY_ID[id]; if (!c) return false;
        dropFromList(id);
        try {
          if (c.custom) hkStorageSet(CUSTOM_KEY, JSON.stringify(CATS.filter(function (x) { return x.custom; }).map(function (x) { return { id: x.id, label: x.label }; })));
          else {
            var hid = []; try { hid = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') || []; } catch (e0) {}
            if (hid.indexOf(id) < 0) hid.push(id);
            hkStorageSet(HIDDEN_KEY, JSON.stringify(hid));
          }
          var d = loadDict();
          Object.keys(d.phrases).forEach(function (k) {
            var p = d.phrases[k]; if (!p) return;
            var cs = (p.cs || [p.c]).filter(function (x) { return x !== id; });
            if (!cs.length) delete d.phrases[k]; else { p.cs = cs; p.c = cs[0]; }
          });
          Object.keys(d.words).forEach(function (k) { if (d.words[k] && d.words[k].c === id) delete d.words[k]; });
          saveDict();
        } catch (eR) {}
        try { _bcache = {}; } catch (eB) {}
        return true;
      }
      function addCustom(label) {
        label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 24);
        if (!label) return null;
        var n = norm(label);
        for (var i = 0; i < CATS.length; i++) if (norm(CATS[i].label) === n) return CATS[i];
        var cat = registerCustom({ id: 'u_' + Date.now().toString(36), label: label });
        try {
          var list = CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; });
          hkStorageSet(CUSTOM_KEY, JSON.stringify(list));
        } catch (eS) {}
        return cat;
      }
      function loadDict() {
        if (_dict) return _dict;
        _dict = { phrases: {}, words: {} };
        try {
          var raw = localStorage.getItem(DICT_KEY);
          var o = raw ? JSON.parse(raw) : null;
          if (o && typeof o === 'object') {
            _dict.phrases = (o.phrases && typeof o.phrases === 'object') ? o.phrases : {};
            _dict.words = (o.words && typeof o.words === 'object') ? o.words : {};
            var _mig = false;
            Object.keys(_dict.phrases).forEach(function (k) {
              var p = _dict.phrases[k]; if (!p) return;
              var cs = (Array.isArray(p.cs) && p.cs.length ? p.cs : [p.c]).map(function (x) { var y = al(x); if (y !== x) _mig = true; return y; });
              cs = cs.filter(function (x, i) { return cs.indexOf(x) === i; });
              p.cs = cs; p.c = cs[0];
            });
            Object.keys(_dict.words).forEach(function (k) { var w = _dict.words[k]; if (w && ALIAS[w.c]) { w.c = al(w.c); _mig = true; } });
            if (_mig) setTimeout(saveDict, 0);
          }
        } catch (e) {}
        return _dict;
      }
      function saveDict() { try { return hkStorageSet(DICT_KEY, JSON.stringify(loadDict())); } catch (e) { return false; } }
      var STOP = {};
      ['از', 'با', 'به', 'در', 'برای', 'و', 'یا', 'که', 'این', 'اون', 'آن', 'ان', 'خرید', 'پرداخت', 'هزینه', 'بابت', 'مبلغ', 'واریز', 'کارت', 'نقد', 'قسط'].forEach(function (w) { STOP[norm(w)] = 1; });
      function words(n) { return n.split(' ').filter(function (w) { return w.length >= 2 && !STOP[w]; }); }
      /* تطابق کلیدواژه: کلمهٔ کامل یا ابتدای کلمه (برای «پیتزاها»)؛ کلیدواژهٔ بلندتر اولویت دارد */
      var _bcache = {};
      function builtin(n) {
        if (n in _bcache) return _bcache[n];
        var r = builtinScan(n);
        _bcache[n] = r;
        return r;
      }
      function builtinScan(n) {
        var best = null, bestLen = 0, padded = ' ' + n + ' ';
        CATS.forEach(function (c) {
          c.nkw.forEach(function (k) {
            if (k.length <= bestLen) return;
            if (padded.indexOf(' ' + k + ' ') >= 0 || (k.length >= 3 && padded.indexOf(' ' + k) >= 0)) { best = c.id; bestLen = k.length; }
          });
        });
        return best;
      }
      /* نتیجهٔ یک یا چند دسته: {id (اولی), ids, label, source} */
      function mk(ids, source) {
        ids = ids.map(al);
        ids = ids.filter(function (x, i) { return BY_ID[x] && ids.indexOf(x) === i; });
        if (!ids.length) return null;
        return { id: ids[0], ids: ids, label: ids.map(function (x) { return BY_ID[x].label; }).join('، '), source: source };
      }
      /** دسته‌بندی یک شرح؛ یک شرح می‌تواند چند دسته داشته باشد (مثلاً «کیسه زباله و لواشک») */
      function classify(text, row) {
        if (row && row.p2p) return { id: 'p2p', ids: ['p2p'], label: 'جیب به جیب', source: 'row' };
        if (row && row.fromPlanId) return mk(['debt'], 'plan');
        var n = norm(text);
        if (!n) return null;
        /* ۱.۳.۸۴: دستهٔ ذخیره‌شده روی خود ردیف (تا وقتی شرحش همان است) — عوض کردن دستهٔ یک شرح، ماه‌های گذشته را عوض نمی‌کند */
        if (row && Array.isArray(row.cats) && row.catKey === n) return row.cats.length ? mk(row.cats, 'row') : null;
        var d = loadDict();
        var p = d.phrases[n];
        if (p) {
          var r0 = mk(Array.isArray(p.cs) && p.cs.length ? p.cs : [p.c], p.s || 'user');
          if (r0) return r0;
        }
        var b = builtin(n);
        if (b) return mk([b], 'builtin');
        /* کلماتی که کاربر حداقل دو بار در یک دسته قرار داده (فقط برای شرح‌هایی که دیکشنری داخلی نمی‌شناسد) */
        var ws = words(n), wBest = null, wN = 1;
        ws.forEach(function (w) { var e = d.words[w]; if (e && BY_ID[e.c] && e.n > wN) { wBest = e.c; wN = e.n; } });
        if (wBest) return mk([wBest], 'user');
        _pending[n] = 1;
        return null;
      }
      /** کاربر دسته(ها) را انتخاب/اصلاح کرد → در دیکشنری شخصی ذخیره شود (catIds: رشته یا آرایه) */
      function learn(text, catIds) {
        var n = norm(text);
        if (!n) return;
        var ids = (Array.isArray(catIds) ? catIds : [catIds]).map(al).filter(function (x) { return x && BY_ID[x]; });
        var d = loadDict();
        if (!ids.length) {
          delete d.phrases[n];
        } else {
          d.phrases[n] = { c: ids[0], cs: ids, s: 'user', t: Date.now() };
          if (ids.length === 1) {
            words(n).forEach(function (w) {
              var e = d.words[w];
              if (!e || e.c !== ids[0]) d.words[w] = { c: ids[0], n: 1 };
              else e.n = (e.n || 1) + 1;
            });
          }
          delete _pending[n];
        }
        saveDict();
        try { if (typeof window.hkCatOnLearn === 'function') window.hkCatOnLearn(n, ids); } catch (eOL) {}
      }
      /* آماده برای آینده: فقط شرح‌های ناشناخته به سرویس امن ارسال می‌شوند و نتیجه ذخیره می‌شود */
      var _remoteBusy = false;
      function resolveUnknownRemote() {
        var items = Object.keys(_pending);
        if (!REMOTE_URL || _remoteBusy || !items.length || typeof fetch !== 'function') return Promise.resolve(0);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(0);
        _remoteBusy = true;
        items = items.slice(0, 40);
        return fetch(REMOTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items }) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            var cnt = 0, d = loadDict();
            ((j && j.results) || []).forEach(function (x) {
              var n = norm(x && x.text);
              if (n && x.category && BY_ID[x.category] && !d.phrases[n]) { d.phrases[n] = { c: x.category, s: 'remote', t: Date.now() }; cnt++; }
              delete _pending[n];
            });
            if (cnt) saveDict();
            return cnt;
          })
          .catch(function () { return 0; })
          .then(function (c) { _remoteBusy = false; return c; });
      }
      /* پشتیبان‌گیری/بازیابی دسته‌بندی‌ها */
      function exportData() {
        var custom = CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; });
        var d = loadDict();
        return { version: 1, custom: custom, dict: { phrases: d.phrases || {}, words: d.words || {} } };
      }
      function importData(o, mode) {
        if (!o || typeof o !== 'object') return;
        (Array.isArray(o.custom) ? o.custom : []).forEach(function (c) { if (c && c.id && c.label) registerCustom(c); });
        hkStorageSet(CUSTOM_KEY, JSON.stringify(CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; })));
        var src = (o.dict && typeof o.dict === 'object') ? o.dict : {};
        var d = loadDict();
        if (mode === 'replace') { d.phrases = {}; d.words = {}; }
        Object.keys(src.phrases || {}).forEach(function (k) { d.phrases[k] = src.phrases[k]; });
        Object.keys(src.words || {}).forEach(function (k) {
          var a = d.words[k], b = src.words[k];
          d.words[k] = (a && b && a.c === b.c) ? { c: a.c, n: Math.max(a.n || 0, b.n || 0) } : b;
        });
        saveDict();
        _bcache = {};
      }
      return { classify: classify, learn: learn, addCustom: addCustom, removeCat: removeCat, categories: CATS, byId: BY_ID, normalize: norm, resolveUnknownRemote: resolveUnknownRemote, pendingUnknown: function () { return Object.keys(_pending); }, exportData: exportData, importData: importData };
    })();

    /* ===== ۱.۳.۸۴: دستهٔ هر ردیف مخارج روی خود ردیف (cats + catKey = شرح نرمال‌شدهٔ همان لحظه) =====
       ردیف تازه با حدس دیکشنری علامت می‌خورد؛ انتخاب دسته برای یک شرح فقط ردیف‌های همین ماه را عوض می‌کند. */
    function hkCatStampRow(r, force) {
      if (!r || r.deletedAt || r.p2p || r.fromPlanId) return false;
      var n = HKCategorizer.normalize(String(r.desc || '').trim()); if (!n) return false;
      if (!force && Array.isArray(r.cats) && r.catKey === n) return false;
      var c = HKCategorizer.classify(r.desc); /* بی ردیف: حدس دیکشنری */
      if (!c) { if (r.catKey !== n) { delete r.cats; delete r.catKey; } return false; }
      r.cats = c.ids.slice(); r.catKey = n; return true;
    }
    function hkCatStampSide(side) {
      var ch = 0;
      ((side && side.sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (hkCatStampRow(r)) ch++; }); });
      return ch;
    }
    window.hkCatOnLearn = function (n, ids) {
      try {
        var ch = 0;
        ((periodData && periodData.expense && periodData.expense.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || r.p2p || r.fromPlanId) return;
            if (HKCategorizer.normalize(String(r.desc || '').trim()) !== n) return;
            r.cats = (ids || []).slice(); r.catKey = n; ch++;
          });
        });
        if (ch) { try { persistCurrent(); scheduleSave(); } catch (e) {} }
      } catch (e2) {}
    };

    /* ===== ۱.۳.۸۴: نسخهٔ ساختار داده + تبدیل‌های مرتب‌شده =====
       هر تبدیل یک شماره دارد و فقط یک بار، به ترتیب، اجرا می‌شود. پیش از اجرا یک نسخهٔ کامل از داده در IndexedDB نگه داشته می‌شود
       (hk-store › preMig_<شمارهٔ آخرین تبدیل>) تا اگر تبدیلی خراب کرد، داده برگردانده شود. */
    var HK_DATA_VER_KEY = STORAGE_KEY + '_dataVer';
    var HK_MIGRATIONS = [
      { v: 1, name: 'ادغام دسته‌ها (مسکن→لوازم خانه، آرایش و بهداشت→سلامت و بهداشت)', run: function () {
        /* دیکشنری در خود HKCategorizer با ALIAS تبدیل می‌شود؛ این‌جا فقط ذخیرهٔ دوباره */
        try { HKCategorizer.classify('_'); } catch (e) {}
        return 0;
      } },
      { v: 2, name: 'دسته روی خود ردیف‌های مخارج', run: function (arc) {
        var ch = 0;
        Object.keys(arc || {}).forEach(function (k) { var pd = arc[k]; if (pd && pd.expense) ch += hkCatStampSide(pd.expense); });
        return ch;
      } }
    ];
    function hkDataVer() { try { return Number(localStorage.getItem(HK_DATA_VER_KEY)) || 0; } catch (e) { return 0; } }
    function hkRunMigrations() {
      var cur = hkDataVer();
      var todo = HK_MIGRATIONS.filter(function (m) { return m.v > cur; }).sort(function (a, b) { return a.v - b.v; });
      if (!todo.length) return Promise.resolve(0);
      try { persistCurrent(); } catch (e0) {}
      var snap = null;
      try { snap = JSON.stringify(getBundle()); } catch (eS) {}
      var last = todo[todo.length - 1].v;
      var save = (snap && typeof HKStore !== 'undefined')
        ? HKStore.put('preMig_' + last, { at: Date.now(), from: cur, to: last, v: snap }).then(function () { return HKStore.del('preMig_' + (cur - 1)); }).catch(function () { return false; })
        : Promise.resolve(false);
      return save.then(function () {
        var done = cur;
        for (var i = 0; i < todo.length; i++) {
          try { todo[i].run(archive); done = todo[i].v; }
          catch (eM) { try { console.error('migration', todo[i].v, eM); } catch (eC) {} break; }
        }
        try { loadCurrent(); } catch (e1) {}
        try { saveArchive(); } catch (e2) {}
        try { localStorage.setItem(HK_DATA_VER_KEY, String(done)); } catch (e3) {}
        try { renderAll(); } catch (e4) {}
        return done;
      });
    }
    try { window.hkRunMigrations = hkRunMigrations; window.hkDataVer = hkDataVer; window.HK_MIGRATIONS = HK_MIGRATIONS; } catch (eWm) {}

    /* =====================================================================
       پنل هوشمند داخل «باکس هوشمند» کارت کاربر (SmartPanel)
       صفحه‌ها مستقل‌اند؛ هر صفحه اگر دادهٔ معنادار نداشته باشد null برمی‌گرداند
       و از چرخه حذف می‌شود. از محاسبات موجود (personTotals، sectionPaidUnpaidTotal،
       ledgerPairNets، plans، rowFinancialContext) استفاده می‌شود.
       ===================================================================== */
    var SMART_PANEL_INTERVAL = 10000;   /* جابه‌جایی خودکار */
    var SMART_PANEL_IDLE = 15000;       /* توقف پس از تعامل کاربر */
    var _smartPanelState = {};          /* title → { key, pausedUntil, nextAt } */

    function spEsc(s) { try { return escapeHtml(String(s)); } catch (e) { return String(s); } }
    function spFa(n) { try { return toPersianDigits(String(n)); } catch (e) { return String(n); } }
    /* مبلغ فشرده برای فضای کوچک (اعداد فارسی) */
    function spAmt(n) {
      n = Number(n) || 0;
      var a = Math.abs(n), neg = n < 0;
      var f = function (v) { var r = Math.round(v * 10) / 10; return spFa(String(r).replace('.', '٫')); };
      /* منفی: علامت پشت عدد (سمت چپ) — عدد و علامت داخل ایزولهٔ LTR */
      var num = function (t) { return neg ? '\u2066-' + t + '\u2069' : t; };
      if (a >= 1e9) return num(f(a / 1e9)) + ' میلیارد';
      if (a >= 1e6) return num(f(a / 1e6)) + ' میلیون';
      return num(spFa(formatNum(a)));
    }
    /* عدد و ٪ داخل ایزولهٔ LTR تا در متن راست‌به‌چپ «۵۴٪» نمایش داده شود نه «٪۵۴» */
    function spPct(v) { return '⁦' + spFa(Math.round(v)) + '٪⁩'; }
    function spPrevSection(tab, title, back) {
      try {
        var y = currentYear, m = currentMonth;
        for (var i = 0; i < (back || 1); i++) { var p = prevYearMonth(y, m); y = p.y; m = p.m; }
        var raw = archive[periodKey(y, m)];
        if (!raw) return null;
        var side = raw[tab];
        var secs = (side && side.sections) || [];
        var t = (title || '').trim();
        for (var k = 0; k < secs.length; k++) if (((secs[k] && secs[k].title) || '').trim() === t) return secs[k];
      } catch (e) {}
      return null;
    }
    function spRows(sec) {
      return ((sec && sec.rows) || []).filter(function (r) { return r && !r.deletedAt && !r.p2p && (Number(r.amount) || 0) > 0; });
    }
    function spDay(r) { var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10); return d >= 1 && d <= 31 ? d : 0; }
    /* مبلغ شخصی هر ردیف مخارج — همان قاعدهٔ sectionPaidUnpaidTotal */
    function spPersonalExpense(r) {
      return sectionPaidUnpaidTotal({ rows: [r] }, { personalExpenseOnly: true }).total;
    }
    /* درصدهای صحیح با جمع دقیقاً ۱۰۰ (روش بزرگ‌ترین باقی‌مانده) */
    function spPercents100(amounts) {
      var tot = amounts.reduce(function (s, a) { return s + a; }, 0);
      if (!(tot > 0)) return amounts.map(function () { return 0; });
      var raw = amounts.map(function (a) { return a / tot * 100; });
      var fl = raw.map(Math.floor);
      var rest = 100 - fl.reduce(function (s, a) { return s + a; }, 0);
      raw.map(function (v, i) { return { i: i, r: v - fl[i] }; })
        .sort(function (a, b) { return b.r - a.r; })
        .slice(0, rest).forEach(function (x) { fl[x.i] += 1; });
      return fl;
    }
    /* جمع هر دسته؛ شرحِ چنددسته‌ای به‌طور مساوی بین دسته‌هایش تقسیم می‌شود.
       maxDay: فقط ردیف‌های تا این روز (برای مقایسهٔ «تا امروز») */
    function spCategoryTotals(sec, maxDay) {
      var map = {}, cnt = {}, total = 0, unknown = 0, rows = 0;
      spRows(sec).forEach(function (r) {
        if (maxDay && maxDay < 31) { var d = spDay(r); if (!d || d > maxDay) return; }
        var a = spPersonalExpense(r);
        if (!a) return;
        rows++;
        total += a;
        var c = HKCategorizer.classify(r.desc, r);
        if (!c) { unknown += a; return; }
        var share = a / c.ids.length;
        c.ids.forEach(function (id) { map[id] = (map[id] || 0) + share; cnt[id] = (cnt[id] || 0) + 1; });
      });
      var list = Object.keys(map).map(function (k) { return { id: k, label: HKCategorizer.byId[k].label, amount: map[k], count: cnt[k] }; })
        .sort(function (x, y) { return y.amount - x.amount; });
      /* درصدها یک‌بار و یکسان برای همهٔ صفحه‌ها (جمع ۱۰۰؛ «نامشخص» هم حساب می‌شود) */
      var items = list.slice();
      if (unknown > 0) items.push({ id: '', label: 'نامشخص', amount: unknown, count: 0 });
      var pcts = spPercents100(items.map(function (x) { return x.amount; }));
      items.forEach(function (x, i) { x.pct = pcts[i]; });
      return { list: list, items: items, total: total, unknown: unknown, rows: rows };
    }
    /* فقط اقساطی که در بخش اقساط به همین کاربر وصل شده‌اند */
    function spPlansForTitle(title) {
      var t = (title || '').trim();
      return (plans || []).filter(function (p) {
        if (!p) return false;
        var lt = (p.expenseSectionTitle || '').trim();
        if (!lt && p.expenseSectionId) {
          var s = ((periodData.expense && periodData.expense.sections) || []).find(function (x) { return x && x.id === p.expenseSectionId; });
          if (s) lt = (s.title || '').trim();
        }
        return !!lt && lt === t;
      });
    }
    /* اقساط پرداخت‌نشده: همهٔ معوق‌ها + سررسیدهای تا ۳۱ روز آینده */
    /* قسط‌های ماهِ انتخاب‌شده (سررسید در همین ماه) با وضعیت پرداخت؛ در ماه جاری قسط‌های معوقِ ماه‌های قبل هم */
    function spInstallments(title) {
      var out = [];
      /* ۱.۳.۵۱: اقساط پنهان: هیچ اسلاید/نکتهٔ قسطی در هیچ ماهی */
      if (!HK_INSTALLMENTS_ON) return out;
      try {
        var today = getTodayPersian();
        var ti = dateToIndex(today.y, today.m, today.d);
        var isCur = currentYear === today.y && currentMonth === today.m;
        spPlansForTitle(title).forEach(function (plan) {
          var count = Math.max(0, parseInt(plan.count, 10) || 0);
          var paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
          for (var i = 0; i < count; i++) {
            var due = dueDateForInstallment(plan, i);
            var inMonth = due.y === currentYear && due.m === currentMonth;
            var before = (due.y * 100 + due.m) < (currentYear * 100 + currentMonth);
            var early = !!(plan.paidEarlyMap && plan.paidEarlyMap[String(i)]);
            var isPaid = (i < paid && !isPlanIndexPaidLate(plan, i)) || early;
            var days = dateToIndex(due.y, due.m, due.d) - ti;
            /* ماه جاری: معوق‌های قبل و سررسیدهای ۷ روز آینده (حتی اگر به ماه بعد برسد) هم */
            if (!(inMonth || (isCur && i >= paid && !early && (before || (days >= 0 && days <= 7))))) continue;
            out.push({ pid: plan.id || plan.name || '', name: plan.name || 'قسط', days: days, amount: planInstallmentAmount(plan), paid: isPaid, idx: i, inMonth: inMonth });
          }
        });
      } catch (e) {}
      return out.sort(function (a, b) { return a.days - b.days; });
    }
    /* طلب و بدهی کارت از منوی قرض. نام‌ها یکدست مقایسه می‌شوند (ي/ی، ك/ک، فاصله و نیم‌فاصله).
       قرض‌هایی که هیچ‌کدام از دو طرفش نام یک کارت نیست (مثلاً «من / علی») روی کارت اول نشان داده می‌شوند */
    function spLedger(title) {
      var nm = function (v) { return String(v || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c\u200e\u200f\u00a0]+/g, ''); };
      var t = nm(title), debt = 0, credit = 0, list = [];
      var cards = []; try { cards = (allPersonTitles() || []).map(nm); } catch (eC) {}
      var first = cards.length ? cards[0] : t;
      try {
        (typeof ledgerPairNets === 'function' ? ledgerPairNets() : []).forEach(function (x) {
          var a = Number(x.amount) || 0;
          if (a <= 0) return;
          var d = nm(x.debtor), c = nm(x.creditor);
          if (d === t) { debt += a; list.push({ who: (x.creditor || '').trim(), amount: a, type: 'debt' }); }
          else if (c === t) { credit += a; list.push({ who: (x.debtor || '').trim(), amount: a, type: 'credit' }); }
          else if (t === first && cards.indexOf(d) < 0 && cards.indexOf(c) < 0) list.push({ who: (x.debtor || '').trim(), to: (x.creditor || '').trim(), amount: a, type: 'other' });
        });
      } catch (e) {}
      list.sort(function (p, q) { return q.amount - p.amount; });
      return { debt: debt, credit: credit, list: list };
    }
    function spActiveProjects(title) {
      var ids = {};
      ['income', 'expense'].forEach(function (tab) {
        spRows(findSectionByTitle(tab, title)).forEach(function (r) {
          var fc = rowFinancialContext(r);
          if (fc.subjectId && fc.subjectId !== 'personal') ids[fc.subjectId] = 1;
        });
      });
      return Object.keys(ids).length;
    }

    /* =====================================================================
       اعلان‌های هوشمند (HKAlerts) — کاملاً محلی و قطعی، بدون AI
       سه نوع: dup (تشخیص تکرار/خطا، مهم‌ترین) · analysis (تحلیل مالی) · project (پروژه)
       هر اعلان شناسهٔ ثابتِ رویداد دارد؛ هر بار از روی داده‌ها دوباره محاسبه می‌شود،
       پس اگر شرطش دیگر برقرار نباشد خودبه‌خود حذف می‌شود. نمایشِ «یک‌باره» (toast)
       با دفتر alertsShown در localStorage کنترل می‌شود تا با هر بار باز شدن نرم‌افزار تکرار نشود.
       ===================================================================== */
    var HKAlerts = (function () {
      var SHOWN_KEY = STORAGE_KEY + '_alertsShown';
      var DISMISS_KEY = STORAGE_KEY + '_alertsDismissed';
      var GENERIC = {};
      ['برداشت بانکی', 'واریز بانکی'].forEach(function (g) { GENERIC[HKCategorizer.normalize(g)] = 1; });
      function loadMap(k) { try { var o = JSON.parse(localStorage.getItem(k) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
      function saveMap(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
      function rowKey(tab, r, i) {
        return tab + ':' + (r.id || ('i' + i + '_' + spDay(r) + '_' + (Number(r.amount) || 0) + '_' + HKCategorizer.normalize(r.desc)));
      }
      function tokens(n) { return n.split(' ').filter(function (w) { return w.length >= 2; }); }
      function similarDesc(a, b) {
        var na = HKCategorizer.normalize(a), nb = HKCategorizer.normalize(b);
        if (!na || !nb) return false;
        if (na === nb) return true;
        if (na.length >= 3 && nb.length >= 3 && (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0)) return true;
        var ta = tokens(na), tb = tokens(nb);
        if (!ta.length || !tb.length) return false;
        var inter = ta.filter(function (w) { return tb.indexOf(w) >= 0; }).length;
        return inter / Math.min(ta.length, tb.length) >= 0.6;
      }
      function isGeneric(r) { return !!GENERIC[HKCategorizer.normalize(r.desc)]; }

      /* ۳) تکرار/خطا: مبلغ + شرح + روز + کاربر (بخش همان کاربر) + حساب + نوع (درآمد/مخارج) */
      function duplicates(title) {
        var out = [], dis = loadMap(DISMISS_KEY);
        ['expense', 'income'].forEach(function (tab) {
          var rows = spRows(findSectionByTitle(tab, title));
          for (var i = 0; i < rows.length; i++) {
            for (var j = i + 1; j < rows.length; j++) {
              var a = rows[i], b = rows[j];
              if (a.fromPlanId && b.fromPlanId) continue;
              var A = Number(a.amount) || 0, B = Number(b.amount) || 0;
              if (A < 1000 || Math.abs(A - B) > Math.max(A, B) * 0.01) continue;
              var accA = (a.account || '').trim(), accB = (b.account || '').trim();
              if (accA && accB && accA !== accB) continue;
              var da = spDay(a), db = spDay(b);
              var sms = (!!a.viaSms) !== (!!b.viaSms);
              var dd = (da && db) ? Math.abs(da - db) : (da || db ? 99 : 0);
              var sameDay = da && db && da === db;
              /* فقط وقتی متن شرح‌ها دقیقاً یکی باشد (پس از یکسان‌سازی فاصله و حروف عربی/فارسی) */
              var na = HKCategorizer.normalize(a.desc), nb = HKCategorizer.normalize(b.desc);
              if (!na || na !== nb) continue;
              var hit = sameDay || dd <= 2;
              if (!hit) continue;
              var id = 'dup:' + rowKey(tab, a, i) + '|' + rowKey(tab, b, j);
              if (dis[id]) continue;
              var label = (isGeneric(a) && !isGeneric(b) ? b.desc : a.desc) || (tab === 'income' ? 'درآمد' : 'هزینه');
              out.push({
                id: id, type: 'dup', p: 100, tab: tab, ra: a, rb: b,
                title: 'احتمال ثبت تکراری',
                text: sms ? ('تراکنش پیامکی ' + spAmt(A) + ' تومان احتمالاً قبلاً دستی با شرح «' + label + '» ثبت شده.')
                          : ('تراکنش «' + label + '» با همین مبلغ ' + (sameDay ? 'در همان روز' : 'در فاصلهٔ کوتاه') + ' دو بار ثبت شده.'),
                toast: 'احتمال ثبت تکراری: «' + label + '»'
              });
            }
          }
        });
        return out;
      }

      /* ۱) تحلیل مالی: فقط بر اساس سابقهٔ خود کاربر؛ بدون دادهٔ کافی هیچ اعلانی ساخته نمی‌شود */
      function analysis(title) {
        var out = [];
        var today = getTodayPersian();
        var isNow = today.y === currentYear && today.m === currentMonth;
        var cut = isNow ? today.d : 31;
        var cur = findSectionByTitle('expense', title), prev = spPrevSection('expense', title, 1);
        var sumTo = function (sec) {
          var s = 0, n = 0;
          spRows(sec).forEach(function (r) {
            if (cut < 31) { var d = spDay(r); if (!d || d > cut) return; }
            var a = spPersonalExpense(r); if (a) { s += a; n++; }
          });
          return { s: s, n: n };
        };
        var key = periodKey(currentYear, currentMonth);
        if (prev) {
          var t = sumTo(cur), p = sumTo(prev);
          if (p.n >= 3 && p.s > 0 && t.n >= 2) {
            var ch = (t.s - p.s) / p.s * 100;
            if (ch >= 20) out.push({ id: 'mom:' + title + ':' + key, type: 'analysis', p: 60, title: 'خرجت افزایش پیدا کرده',
              text: 'مخارج این ماه ' + (cut < 31 ? 'تا امروز ' : '') + spPct(ch) + ' بیشتر از ماه قبل است.' });
          }
          var ct = spCategoryTotals(cur, cut), cp = spCategoryTotals(prev, cut), best = null;
          ct.list.forEach(function (c) {
            var pc = null;
            cp.list.forEach(function (x) { if (x.id === c.id) pc = x; });
            if (!pc || pc.count < 2 || pc.amount <= 0 || c.count < 2) return;
            var g = (c.amount - pc.amount) / pc.amount;
            if (g >= 0.3 && c.amount >= ct.total * 0.1 && (!best || g > best.g)) best = { c: c, g: g };
          });
          if (best) out.push({ id: 'cat:' + title + ':' + key + ':' + best.c.id, type: 'analysis', p: 50, title: 'هزینهٔ ' + best.c.label + ' افزایش داشته',
            text: 'این ماه ' + spAmt(best.c.amount) + ' تومان برای ' + best.c.label + ' ثبت کرده‌ای.' });
        }
        /* هزینهٔ غیرعادی: نسبت به سابقهٔ همین کاربر (میانه و صدک ۷۵)، نه یک عدد ثابت */
        var hist = [], older = [];
        for (var k = 1; k <= 6; k++) {
          spRows(spPrevSection('expense', title, k)).forEach(function (r) {
            if (r.fromPlanId) return;
            var a = spPersonalExpense(r); if (a) { hist.push(a); older.push({ a: a, d: r.desc }); }
          });
        }
        var curRows = spRows(cur).filter(function (r) { return !r.fromPlanId && spPersonalExpense(r) > 0; });
        curRows.forEach(function (r) { hist.push(spPersonalExpense(r)); });
        if (hist.length >= 13) {
          var cand = null;
          curRows.forEach(function (r, ri) {
            var a = spPersonalExpense(r);
            var others = hist.slice(); others.splice(others.indexOf(a), 1);
            others.sort(function (x, y) { return x - y; });
            var med = others[Math.floor(others.length / 2)] || 0;
            var p75 = others[Math.floor(others.length * 0.75)] || 0;
            if (!(med > 0) || a < med * 4 || a < p75 * 2) return;
            /* هزینهٔ تکرارشونده (مثل اجاره) غیرعادی نیست */
            var recurring = older.some(function (o) { return Math.abs(o.a - a) <= a * 0.25 && similarDesc(o.d, r.desc); });
            if (recurring) return;
            if (!cand || a / med > cand.ratio) cand = { r: r, i: ri, a: a, ratio: a / med };
          });
          if (cand) out.push({ id: 'odd:' + title + ':' + key + ':' + rowKey('expense', cand.r, cand.i), type: 'analysis', p: 70, title: 'هزینهٔ غیرعادی ثبت شد',
            text: '«' + (cand.r.desc || 'هزینه') + '» با ' + spAmt(cand.a) + ' تومان نسبت به هزینه‌های معمولت مبلغ بالایی دارد.' });
        }
        return out;
      }

      /* ۲) پروژه‌ها: مستقیماً از computeSubjectReport (همان محاسبهٔ گزارش پروژه) */
      /* پروژه‌ها فقط با تراکنش‌های ماهِ انتخاب‌شده؛ ماهی که پروژه تراکنشی ندارد، چیزی نشان داده نمی‌شود */
      function projects(title) {
        var ids = {}, t = (title || '').trim();
        try {
          ['income', 'expense'].forEach(function (tab) {
            ((periodData[tab] && periodData[tab].sections) || []).forEach(function (sec) {
              if (((sec && sec.title) || '').trim() !== t) return;
              (sec.rows || []).forEach(function (r) {
                if (!r || r.deletedAt || (r.status || 'paid') !== 'paid') return;
                var fc = rowFinancialContext(r);
                if (!(fc.subjectId && fc.subjectId !== 'personal' && (fc.classification === 'third_party' || fc.accountType === 'project'))) return;
                var o = ids[fc.subjectId] || (ids[fc.subjectId] = { rec: 0, exp: 0 });
                if (tab === 'income') o.rec += Number(r.amount) || 0; else o.exp += Number(r.amount) || 0;
              });
            });
          });
        } catch (e) {}
        /* ۱.۳.۶۹: وضعیت کلی هر پروژه (از اول تا امروز)، نه فقط این ماه: جمع واریزی، جمع مخارج و مانده/بدهی.
           پروژه‌ای نمایش داده می‌شود که این ماه تراکنش دارد یا از قبل مانده/بدهی دارد */
        var out = [];
        try {
          (loadFinancialSubjects() || []).forEach(function (sub) {
            if (!sub || !sub.id || sub.id === 'personal') return;
            /* جمع از اول تا همین ماهِ باز (نه ماه‌های بعد)؛ پیش از شروع پروژه چیزی نشان داده نمی‌شود */
            var rec = 0, exp = 0, curN = currentYear * 100 + currentMonth;
            try {
              var rep = computeSubjectReport(sub.id);
              (rep && rep.rows || []).forEach(function (x) {
                var kp = String(x.key || '').split('-'); if ((+kp[0]) * 100 + (+kp[1]) > curN) return;
                if (x.tab === 'income') rec += Number(x.amt) || 0; else exp += Number(x.amt) || 0;
              });
            } catch (eR) {}
            if (!rec && !exp) return;
            var net = Math.round(rec - exp);
            if (!ids[sub.id] && Math.abs(net) < 1) return;
            var lines = ['جمع واریزی ' + spAmt(rec) + '، جمع مخارج ' + spAmt(exp)], p = 35, state;
            if (net < 0) { lines.push(spAmt(-net) + ' تومان بدهکار است.'); p = 55; state = 'over'; }
            else if (net > 0) { lines.push(spAmt(net) + ' تومان از واریزی باقی مانده.'); state = 'left'; }
            else { lines.push('پروژه تسویه است.'); state = 'even'; }
            out.push({ id: 'proj:' + sub.id + ':' + state, type: 'project', p: p, abs: Math.abs(net), title: 'پروژه ' + sub.name, text: lines.join(' '), sid: sub.id, lines: lines });
          });
        } catch (eP) {}
        return out.sort(function (a, b) { return b.p - a.p || b.abs - a.abs; }).slice(0, 3);
      }

      function forCard(title) {
        var a = [];
        try { a = a.concat(duplicates(title)); } catch (e1) {}
        try { a = a.concat(analysis(title)); } catch (e2) {}
        try { a = a.concat(projects(title)); } catch (e3) {}
        return a.sort(function (x, y) { return y.p - x.p; });
      }
      /* اعلان مهم (تکرار) فقط یک بار به‌صورت toast؛ دفترِ نمایش با رویدادهای فعال هرس می‌شود */
      function notify(titles) {
        var shown = loadMap(SHOWN_KEY), active = {}, fresh = null;
        (titles || []).forEach(function (t) {
          duplicates(t).forEach(function (al) {
            active[al.id] = 1;
            if (!shown[al.id]) { shown[al.id] = Date.now(); if (!fresh) fresh = al; }
          });
        });
        Object.keys(shown).forEach(function (k) { if (!active[k]) delete shown[k]; });
        saveMap(SHOWN_KEY, shown);
        /* هشدار تکرار فقط داخل باکس هوشمند نمایش داده می‌شود (بدون پیام پایین صفحه) */
        return fresh;
      }
      function dismiss(id) { var d = loadMap(DISMISS_KEY); d[id] = Date.now(); saveMap(DISMISS_KEY, d); }
      /* پیش از ثبت پیامک: آیا همین تراکنش قبلاً (دستی یا پیامکی) ثبت شده؟ */
      function findSimilarBeforeSave(pd, tab, amount, day, account, desc) {
        var hit = null;
        ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
          spRows(sec).forEach(function (r) {
            if (hit) return;
            if (r.fromRecurringId && r.status !== 'paid') return;
            var A = Number(r.amount) || 0;
            if (Math.abs(A - amount) > Math.max(A, amount) * 0.01) return;
            var acc = (r.account || '').trim();
            if (acc && account && acc !== account) return;
            var d = spDay(r), dd = parseInt(day, 10) || 0;
            if (d && dd && Math.abs(d - dd) > 1) return;
            if (!d && dd && !similarDesc(r.desc, desc)) return;
            hit = { row: r, section: sec.title || '' };
          });
        });
        return hit;
      }
      return { forCard: forCard, duplicates: duplicates, analysis: analysis, projects: projects, notify: notify, dismiss: dismiss, findSimilarBeforeSave: findSimilarBeforeSave };
    })();

    /* همهٔ داده‌های لازم صفحه‌ها یک‌بار محاسبه می‌شود (از توابع موجود پروژه) */
    function spCollect(title) {
      var tot = personTotals(title);
      var expSec = findSectionByTitle('expense', title);
      var prevInc = spPrevSection('income', title), prevExp = spPrevSection('expense', title);
      var alerts = HKAlerts.forCard(title);
      return {
        title: title,
        inc: Number(tot.incomeTotal) || 0,
        incPaid: Number(tot.incomePaid) || 0,
        exp: Number(tot.expenseTotal) || 0,
        expPaid: Number(tot.expensePaid) || 0,
        expUnpaid: Number(tot.expenseUnpaid) || 0,
        pInc: prevInc ? sectionPaidUnpaidTotal(prevInc, { personalIncomeOnly: true }).total : 0,
        pExp: prevExp ? sectionPaidUnpaidTotal(prevExp, { personalExpenseOnly: true }).total : 0,
        cats: spCategoryTotals(expSec),
        inst: spInstallments(title),
        led: spLedger(title),
        projects: spActiveProjects(title),
        alerts: alerts
      };
    }
    function spHead(t, cls) { return '<div class="sp-h' + (cls ? ' ' + cls : '') + '">' + t + '</div>'; }
    function spLine(label, val, cls) {
      return '<div class="sp-row"><span class="sp-l">' + label + '</span><span class="sp-v ' + (cls || '') + '">' + val + '</span></div>';
    }
    /* لوله‌ای که با انیمیشن تا درصد مشخص پر می‌شود */
    function spTube(pct, cls) {
      return '<div class="sp-bar sp-tube"><i class="' + (cls || '') + '" data-w="' + Math.max(0, Math.min(100, pct)).toFixed(1) + '"></i></div>';
    }
    function spItems(list) {
      return list.map(function (h) { return '<div class="sp-item">' + h + '</div>'; }).join('');
    }
    function spDaysLabel(d) {
      if (d < 0) return spFa(-d) + ' روز تاخیر';
      if (d === 0) return 'امروز';
      if (d === 1) return 'فردا';
      return spFa(d) + ' روز دیگر';
    }

    /* ۰) هشدار تکرار/خطا — مهم‌ترین؛ با لمس می‌توان نادیده گرفت */
    function spPageWarn(D) {
      var dups = D.alerts.filter(function (a) { return a.type === 'dup'; });
      if (!dups.length) return null;
      /* ۱.۳.۷۵: «احتمال ثبت تکراری» فقط یک بار (عنوان)، زیرش توضیح هر مورد؛ زدن = دو ردیف در جدول هایلایت می‌شوند */
      return spHead('احتمال ثبت تکراری', 'neg') + spItems(dups.slice(0, 2).map(function (a, i) {
        return '<div class="sp-tip" data-dup="' + i + '">' + spEsc(a.text) + '</div>';
      })) + '<div class="sp-dup-no" data-act="dismiss">تکراری نیست</div>';
    }
    /* ۱) وضعیت این ماه: پس‌انداز و مانده، هر کدام با لولهٔ پرشونده؛ سبز = مثبت، قرمز = منفی.
       پس‌انداز = (درآمد کل − خرج کل) ÷ درآمد کل · مانده = دریافت‌شده − پرداخت‌شده (پول واقعیِ مانده) */
    /* یک لوله: درآمد کل ماه (دریافت‌شده و نشده) در برابر مخارج کل ماه (پرداخت‌شده و نشده).
       مثبت = «پس‌انداز کارت» (سبز)، منفی = «کسری کارت» (قرمز)؛ مبلغ و درصد. زیرش دریافت‌نشده/پرداخت‌نشده و بودجهٔ روزانه تا آخر ماه */
    function spPageOverview(D) {
      if (D.inc <= 0 && D.exp <= 0) return null;
      var rem = D.inc - D.exp, sc = rem >= 0 ? 'pos' : 'neg';
      var pct = D.inc > 0 ? Math.abs(rem) / D.inc * 100 : 100;
      var html = spHead('وضعیت این ماه') + '<div class="sp-even">';
      /* درصد بالای لوله (چپ‌چین)، مبلغ زیر لوله (راست‌چین) */
      html += '<div class="sp-blk">' + spLine(rem >= 0 ? 'پس‌انداز این ماه' : 'کسری این ماه', spPct(Math.min(999, pct)), sc) + spTube(Math.min(100, pct), sc) +
        '<div class="sp-v sp-right ' + sc + '">' + spAmt(Math.abs(rem)) + '</div>' +
        /* ۱.۳.۸۲: روشن شود این عدد موجودی کارت نیست */
        '<div class="sp-ov-formula">درآمد این ماه − خرج این ماه</div></div>';
      var incUn = Math.max(0, D.inc - D.incPaid), expUn = Math.max(0, D.expUnpaid);
      var sub = [];
      if (incUn > 0) sub.push('دریافت‌نشده ' + spAmt(incUn));
      if (expUn > 0) sub.push('پرداخت‌نشده ' + spAmt(expUn));
      var t0 = getTodayPersian();
      if (currentYear === t0.y && currentMonth === t0.m && rem > 0) {
        var dim = 30; try { dim = daysInMonth(t0.y, t0.m); } catch (eD) { dim = t0.m <= 6 ? 31 : 30; }
        var left = Math.max(1, dim - t0.d + 1);
        sub.push('بودجهٔ روزانه تا آخر ماه ' + spAmt(Math.floor(rem / left)));
      }
      if (sub.length) html += '<div class="sp-sub">' + sub.map(spEsc).join('<br>') + '</div>';
      return html + '</div>';
    }
    /* ۲) تعهدات: هر خبر جدا با خط جداکننده؛ مبلغ قسط زیر عنوانش */
    /* ناوبری از اسلاید: هر خطا بی‌صدا (نباید باکس هوشمند را از کار بیندازد) */
    function spGo(fn) { try { fn(); } catch (e) {} }
    /* اسلاید «۷ روز آینده»: اگر قسطی در آن هست → منوی اقساط، وگرنه (فقط درآمد ثابت) → جدول درآمد */
    var _spUpcomingInst = {};
    function spHasUpcomingInst(title) { return !!_spUpcomingInst[title]; }
    /* بزرگ‌ترین خرج: بعد از باز شدن جدول مخارج، همان ردیف کمی برجسته می‌شود */
    /* اسکرول نرم با مدت مشخص تا ردیف وسط صفحه بیاید؛ مدت واقعی را برمی‌گرداند */
    function hkSlowScrollTo(el, ms) {
      try {
        var sc = el.parentElement;
        while (sc && sc !== document.body) { var cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 2) break; sc = sc.parentElement; }
        var win = !sc || sc === document.body;
        var r = el.getBoundingClientRect();
        var view = win ? { top: 0, h: window.innerHeight } : (function () { var b = sc.getBoundingClientRect(); return { top: b.top, h: sc.clientHeight }; })();
        var from = win ? window.scrollY : sc.scrollTop;
        var delta = (r.top + r.height / 2) - (view.top + view.h / 2);
        var maxS = win ? (document.documentElement.scrollHeight - window.innerHeight) : (sc.scrollHeight - sc.clientHeight);
        var to = Math.max(0, Math.min(maxS, from + delta));
        if (Math.abs(to - from) < 4) return 0;
        var t0 = performance.now();
        /* ۱.۳.۴۸: ease-in-out مکعبی (شتاب مثبت اول، منفی آخر)؛ scroll-behavior نرمِ CSS در طول حرکت خاموش تا هر گام خودش دوباره نرم نشود */
        var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
        var tgt = win ? document.documentElement : sc, prevSB = tgt.style.scrollBehavior;
        tgt.style.scrollBehavior = 'auto';
        var step = function (now) {
          var k = Math.min(1, (now - t0) / ms), y = from + (to - from) * ease(k);
          if (win) window.scrollTo({ top: y, behavior: 'instant' }); else sc.scrollTop = y;
          if (k < 1) requestAnimationFrame(step); else tgt.style.scrollBehavior = prevSB;
        };
        requestAnimationFrame(step);
        return ms;
      } catch (e) { try { el.scrollIntoView({ block: 'center' }); } catch (e2) {} return 0; }
    }
    /* ۱.۳.۴۸: هر اسلاید خرج (بزرگ‌ترین، بی‌دسته، جهش) → اسکرول آرام به همان ردیف و هایلایت */
    function spFlashBiggest(title) {
      spFlashRow(title, function (rows) {
        return rows.filter(function (r) { return (r.status || 'paid') === 'paid'; }).sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })[0];
      });
    }
    function spIsNoCat(r) { var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {} return !c; }
    function spFlashFix(title) {
      spFlashRow(title, function (rows) {
        var ok = rows.filter(function (r) { return Number(r.amount) > 0 && (r.status || 'paid') === 'paid'; });
        return ok.filter(function (r) { return !r.fromPlanId && spIsNoCat(r); })[0] || ok.filter(function (r) { return !(r.account || '').trim(); })[0];
      });
    }
    var _spJumpCat = {};
    function spFlashJump(title) {
      var cid = _spJumpCat[title]; if (!cid) return;
      spFlashRow(title, function (rows) {
        return rows.filter(function (r) {
          if (!(Number(r.amount) > 0)) return false;
          var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {}
          return c && c.ids.indexOf(cid) >= 0;
        }).sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })[0];
      });
    }
    function spFlashRow(title, pick, tab) {
      tab = tab || 'expense';
      setTimeout(function () {
        try {
          var sec = findSectionByTitle(tab, title);
          var big = pick(spRows(sec).slice());
          if (!big) return;
          var idx = (sec.rows || []).indexOf(big); if (idx < 0) return;
          var tr = document.querySelectorAll('#sections-' + tab + ' tbody tr')[idx]; if (!tr) return;
          /* ۱.۳.۴۷: اسکرول آرام (مثل نسخهٔ ۱.۳.۴۵)، بعد هایلایت با ظاهر و محو شدن آرام */
          var dur = hkSlowScrollTo(tr, 1300);
          setTimeout(function () { tr.classList.add('sp-flash'); setTimeout(function () { tr.classList.remove('sp-flash'); }, 3600); }, dur + 80);
        } catch (e) {}
      }, 450);
    }
    /* ۱.۳.۷۵: چند ردیف با هم هایلایت (اسکرول تا اولی) */
    function spFlashRows(title, tab, rows) {
      setTimeout(function () {
        try {
          var sec = findSectionByTitle(tab, title), all = document.querySelectorAll('.person-detail-box tbody tr, #sections-' + tab + ' tbody tr');
          var trs = [];
          rows.forEach(function (r) {
            var idx = (sec.rows || []).indexOf(r); if (idx < 0) return;
            var box = document.querySelector('.person-detail-box tbody') ? document.querySelectorAll('.person-detail-box tbody tr') : document.querySelectorAll('#sections-' + tab + ' tbody tr');
            var tr = box[idx]; if (tr) trs.push(tr);
          });
          if (!trs.length) return;
          var dur = 0; try { dur = hkSlowScrollTo(trs[0], 900); } catch (eS) {}
          setTimeout(function () { trs.forEach(function (tr) { tr.classList.add('sp-flash'); }); setTimeout(function () { trs.forEach(function (tr) { tr.classList.remove('sp-flash'); }); }, 3600); }, (dur || 0) + 80);
        } catch (e) {}
      }, 650);
    }
    try { window.spFlashRows = spFlashRows; } catch (eWf) {}
    function spPageObligations(D) {
      var items = [];
      var t0 = getTodayPersian();
      if (!(currentYear === t0.y && currentMonth === t0.m)) {
        /* ماه دیگر: فقط قسط‌های همان ماه و وضعیتشان */
        D.inst.slice(0, 4).forEach(function (x) {
          items.push('<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under ' + (x.paid ? 'pos' : 'neg') + '">' + (x.paid ? 'پرداخت‌شده' : 'پرداخت‌نشده') + ' · ' + spAmt(x.amount) + '</div>');
        });
        if (!items.length) return null;
        return spHead('قسط‌های ' + MONTHS[currentMonth - 1]) + spItems(items);
      }
      var open = D.inst.filter(function (x) { return !x.paid; });
      var late = open.filter(function (x) { return x.days < 0; });
      var next = open.filter(function (x) { return x.days >= 0; })[0];
      if (late.length) items.push(spLine('قسط معوق', spFa(late.length) + ' قسط', 'neg') + spLine('بیشترین تاخیر', spFa(-late[0].days) + ' روز', 'neg'));
      /* قسط بعدیِ هر وام جداگانه (دو وام با مبلغ و موعد یکسان هر دو نمایش داده می‌شوند) */
      var seenPlan = {}, upcoming = [];
      open.forEach(function (x) { if (x.days >= 0 && !seenPlan[x.pid]) { seenPlan[x.pid] = 1; upcoming.push(x); } });
      upcoming.slice(0, 3).forEach(function (x) {
        items.push('<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under"><span' + (x.days <= 1 ? ' class="neg"' : '') + '>' + spDaysLabel(x.days) + '</span>، ' + spAmt(x.amount) + ' تومان</div>');
      });
      if (!upcoming.length && late.length) items.push('<div class="sp-l">مبلغ قسط</div><div class="sp-v sp-under">' + spAmt(late[0].amount) + ' تومان</div>');
      /* ۱.۳.۶۸: هر اسلاید فقط یک موضوع؛ «پروژهٔ فعال» در اسلاید پروژه‌هاست */
      if (!items.length) return null;
      return spHead('تعهدات') + spItems(items);
    }
    /* طلب و بدهی: اسلاید جداگانه (جمع کل + طرف‌حساب‌های اصلی) */
    function spPageLedger(D) {
      var L = D.led || {};
      if (!(L.credit > 0) && !(L.debt > 0) && !(L.list || []).length) return null;
      var items = [];
      if (L.credit > 0) items.push('<div class="sp-row"><span class="sp-l pos">طلب کل</span><span class="sp-v pos">' + spAmt(L.credit) + '</span></div>');
      if (L.debt > 0) items.push('<div class="sp-row"><span class="sp-l neg">بدهی کل</span><span class="sp-v neg">' + spAmt(L.debt) + '</span></div>');
      (L.list || []).forEach(function (x) {
        /* «x به y فلان مبلغ بدهکار است» / «x از y فلان مبلغ طلبکار است» */
        if (x.type === 'other') { items.push('<div class="sp-tip">«' + spEsc(x.who) + '» به «' + spEsc(x.to) + '» <b class="neg">' + spAmt(x.amount) + '</b> بدهکار است</div>'); return; }
        var cr = x.type === 'credit';
        items.push('<div class="sp-tip">«' + spEsc(D.title) + '» ' + (cr ? 'از' : 'به') + ' «' + spEsc(x.who) + '» <b class="' + (cr ? 'pos' : 'neg') + '">' + spAmt(x.amount) + '</b> ' + (cr ? 'طلبکار' : 'بدهکار') + ' است</div>');
      });
      /* اسکرول عمودی آزاد؛ همیشه از بالا شروع می‌شود و خودکار اسکرول نمی‌شود */
      return spHead('طلب و بدهی') + '<div class="sp-scroll sp-free">' + spItems(items) + '</div>';
    }
    /* ۳) آمار: فقط مقایسهٔ این ماه با ماه قبل */
    function spBarRow(label, amount, max, cls) {
      var w = max > 0 ? Math.max(amount > 0 ? 3 : 0, amount / max * 100) : 0;
      return '<div class="sp-row sp-row-sm"><span class="sp-l">' + label + '</span><span class="sp-v">' + spAmt(amount) + '</span></div>' +
        '<div class="sp-bar thin"><i class="' + cls + '" data-w="' + w.toFixed(1) + '"></i></div>';
    }
    function spPageStats(D) {
      /* همیشه جزو اسلایدهاست (اگر این ماه یا ماه قبل ثبتی داشته باشد)؛ ماه قبلِ خالی = صفر */
      if (!(D.pInc > 0 || D.pExp > 0 || D.inc > 0 || D.exp > 0)) return null;
      var mx = Math.max(D.inc, D.pInc, D.exp, D.pExp);
      /* هر چهار لوله در یک کادر و هم‌اندازه با ارتفاع باکس (مقیاس مشترک) */
      var row = function (label, amount, cls) { return '<div class="sp-cmp-r">' + spBarRow(label, amount, mx, cls) + '</div>'; };
      return spHead('مقایسه با ماه قبل') + '<div class="sp-cmp sp-even">' +
        row('درآمد این ماه', D.inc, 'pos') + row('درآمد ماه قبل', D.pInc, 'pos dim') +
        row('خرج این ماه', D.exp, 'neg') + row('خرج ماه قبل', D.pExp, 'neg dim') + '</div>';
    }
    /* ۴) دسته‌بندی مخارج: همهٔ دسته‌ها (جمع ۱۰۰٪)؛ هر نما ۴ مورد و اسکرول عمودی پیوسته */
    function spPageCategories(D) {
      if (!D.cats.list.length || D.cats.total <= 0) return null;
      var html = '';
      D.cats.items.forEach(function (c) {
        html += '<div class="sp-cat"><div class="sp-row"><span class="sp-l">' + spEsc(c.label) + '</span><span class="sp-v">' + spPct(c.pct) + '</span></div>' +
          '<div class="sp-bar thin"><i data-w="' + c.pct + '"></i></div></div>';
      });
      return spHead('دسته‌بندی مخارج') + '<div class="sp-scroll' + (D.cats.items.length > 4 ? ' sp-more' : '') + '">' + html + '</div>';
    }
    /* ۵) پروژه‌ها — از گزارش پروژه */
    function spPageProjects(D) {
      var ps = D.alerts.filter(function (a) { return a.type === 'project'; });
      if (!ps.length) return null;
      /* ۱.۳.۴۸: هر پروژه یک نمای کامل (چند پروژه = اسکرول عمودی مثل «نکات»)؛ عنوان به رنگ پروژه، همهٔ متن‌ها هم‌اندازه */
      return spHead('پروژه‌ها') + '<div class="sp-scroll sp-tips sp-projs">' + ps.slice(0, 3).map(function (a) {
        var col = '';
        try { var sub = getSubjectById(a.sid); var mt = sub && getProjectHighlightMeta(sub.highlightColor); if (mt && mt.accent) col = mt.accent; } catch (eC) {}
        var ls = (a.lines && a.lines.length) ? a.lines : [a.text];
        return '<div class="sp-tipbox"><div class="sp-tip sp-pj-t"' + (col ? ' style="color:' + col + '"' : '') + '>' + spEsc(a.title) + '</div>' +
          ls.map(function (l) { return '<div class="sp-tip">' + spEsc(l) + '</div>'; }).join('') + '</div>';
      }).join('') + '</div>';
    }
    /* ۶) نکته: اعلان‌های تحلیلی + نکته‌های کوتاه؛ درصدها همان درصدهای صفحهٔ دسته‌بندی */
    function spInsights(D) {
      var out = D.alerts.filter(function (a) { return a.type === 'analysis'; }).map(function (a) { return { p: a.p, h: a.title, t: a.text }; });
      var soon = D.inst.filter(function (x) { return !x.paid && x.days >= 0 && x.days <= 7; }).length;
      var late = D.inst.filter(function (x) { return !x.paid && x.days < 0; }).length;
      if (late) out.push({ p: 95, t: spFa(late) + ' قسط از سررسیدش گذشته است.' });
      if (soon) out.push({ p: 90, t: spFa(soon) + ' پرداخت قسط در ۷ روز آینده داری.' });
      if (D.inc > 0 && D.exp > D.inc) out.push({ p: 80, t: 'مخارج این ماه ' + spPct((D.exp - D.inc) / D.inc * 100) + ' از درآمد بیشتر شده است.' });
      if (D.cats.rows >= 3 && D.cats.items.length && D.cats.items[0].id) {
        var top = D.cats.items[0];
        if (top.pct >= 25) out.push({ p: 45, t: 'بیشترین هزینهٔ این ماه مربوط به ' + top.label + ' بوده (' + spPct(top.pct) + ' از مخارج).' });
      }
      if (D.exp > 0 && D.expUnpaid / D.exp >= 0.3) out.push({ p: 40, t: spAmt(D.expUnpaid) + ' تومان از مخارج این ماه هنوز پرداخت نشده.' });
      return out.sort(function (a, b) { return b.p - a.p; });
    }
    function spPageInsight(D) {
      var ins = spInsights(D);
      if (!ins.length) return null;
      /* هر نکته یک نمای کامل؛ نکتهٔ دوم با اسکرول عمودی (خودکار پس از ۵ ثانیه یا با دست) */
      return spHead('نکات') + '<div class="sp-scroll sp-tips">' + ins.slice(0, 5).map(function (x) {
        return '<div class="sp-tipbox">' + (x.h ? '<div class="sp-t">' + spEsc(x.h) + '</div>' : '') + '<div class="sp-tip">' + spEsc(x.t) + '</div></div>';
      }).join('') + '</div>';
    }
    /* ۷) سررسیدهای ۷ روز آینده (فقط ماه جاری): قسط‌های پرداخت‌نشده و درآمدهای ثابتِ هنوز دریافت‌نشده */
    function spPageUpcoming(D) {
      var t0 = getTodayPersian();
      if (!(currentYear === t0.y && currentMonth === t0.m)) return null;
      var items = [];
      (HK_INSTALLMENTS_ON ? D.inst : []).filter(function (x) { return !x.paid && x.days >= 0 && x.days <= 7; }).slice(0, 3).forEach(function (x) {
        items.push({ inst: true, d: x.days, h: '<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under' + (x.days <= 1 ? ' neg' : '') + '">' + spDaysLabel(x.days) + '، ' + spAmt(x.amount) + '</div>' });
      });
      spRows(findSectionByTitle('income', D.title)).forEach(function (r) {
        if (!r.fromRecurringId || (r.status || 'paid') === 'paid') return;
        var d = spDay(r) - t0.d; if (d < 0 || d > 7) return;
        items.push({ d: d, h: '<div class="sp-l">دریافت «' + spEsc(r.desc || 'درآمد ثابت') + '»</div><div class="sp-v sp-under pos">' + spDaysLabel(d) + '، ' + spAmt(Number(r.amount) || 0) + '</div>' });
      });
      if (!items.length) return null;
      items.sort(function (a, b) { return a.d - b.d; });
      _spUpcomingInst[D.title] = items.some(function (x) { return x.inst; });
      return spHead('۷ روز آینده') + spItems(items.slice(0, 4).map(function (x) { return x.h; }));
    }
    /* ۸) جهش دسته: دسته‌ای که این ماه دست‌کم ۴۰٪ بیشتر از میانگین ۳ ماه قبل خرج شده */
    function spPageJump(D) {
      if (!D.cats.list.length) return null;
      var prev = {}, n = 0;
      for (var b = 1; b <= 3; b++) {
        var sec = spPrevSection('expense', D.title, b); if (!sec) continue;
        n++; spCategoryTotals(sec).list.forEach(function (c) { prev[c.id] = (prev[c.id] || 0) + c.amount; });
      }
      if (!n) return null;
      var best = null;
      D.cats.list.forEach(function (c) {
        var avg = (prev[c.id] || 0) / n; if (avg <= 0) return;
        var up = (c.amount - avg) / avg;
        if (up >= 0.4 && c.amount - avg >= D.cats.total * 0.05 && (!best || up > best.up)) best = { c: c, avg: avg, up: up };
      });
      if (!best) return null;
      _spJumpCat[D.title] = best.c.id;
      return spHead('جهش خرج') + spItems([
        '<div class="sp-t">«' + spEsc(best.c.label) + '» ' + spPct(best.up * 100) + ' بیشتر از میانگین</div>',
        spLine('این ماه', spAmt(best.c.amount), 'neg'),
        spLine('میانگین ' + spFa(n) + ' ماه قبل', spAmt(best.avg))
      ]);
    }
    /* ۹) بزرگ‌ترین خرج ماه و تعداد تراکنش‌ها */
    function spPageBiggest(D) {
      var rows = spRows(findSectionByTitle('expense', D.title)).filter(function (r) { return (r.status || 'paid') === 'paid' && Number(r.amount) > 0; });
      if (rows.length < 3) return null;
      /* ۱.۳.۶۸: فقط بزرگ‌ترین خرج‌ها (سه مورد اول)؛ شمار واریزها و خرج‌ها با این موضوع قاطی نمی‌شود */
      var top = rows.slice().sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); }).slice(0, 3);
      return spHead('بزرگ‌ترین خرج‌های ماه') + spItems(top.map(function (r) {
        return spLine(spEsc(r.desc || '—'), spAmt(Number(r.amount) || 0), 'neg');
      }));
    }
    /* ۱۰) کارهای ناتمام اطلاعات: ردیف‌های بی‌حساب، خرج‌های بی‌دسته (لمس = برگهٔ دسته‌بندی) */
    var _spFixIdx = {};
    /* ردیف‌های ناقص به ترتیب جدول (بی‌حساب: اول مخارج بعد درآمد؛ بی‌دسته: مخارج) */
    function spFixList(title, k) {
      var out = [];
      (k === 'acc' ? ['expense', 'income'] : ['expense']).forEach(function (tab) {
        spRows(findSectionByTitle(tab, title)).forEach(function (r) {
          if (!(Number(r.amount) > 0) || (r.status || 'paid') !== 'paid') return;
          if (k === 'acc' ? !(r.account || '').trim() : (!r.fromPlanId && spIsNoCat(r))) out.push({ tab: tab, row: r });
        });
      });
      return out;
    }
    function spPageFix(D) {
      var noAcc = 0, noCat = 0;
      ['income', 'expense'].forEach(function (tab) {
        spRows(findSectionByTitle(tab, D.title)).forEach(function (r) {
          if (!(Number(r.amount) > 0) || (r.status || 'paid') !== 'paid') return;
          if (!(r.account || '').trim()) noAcc++;
          if (tab === 'expense' && !r.fromPlanId) { var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {} if (!c) noCat++; }
        });
      });
      if (!noAcc && !noCat) return null;
      /* ۱.۳.۵۰: دو نیمه: «بدون حساب» و «بدون دسته»؛ لمس هر نیمه = رفتن به ردیف خودش */
      /* ۱.۳.۵۱: نصف افقی (بالا/پایین با خط افقی)؛ هر لمس = ردیف بعدی همان نوع («۱ از ۲») */
      var half = function (k, lab, n) {
        var i = (_spFixIdx[D.title + '|' + k] || 0) % n;
        /* ۱.۳.۵۲: هم‌اندازهٔ بقیهٔ اسلایدها: بالا راست «ردیف بدون حساب»، زیرش سطر شمارش */
        return '<div class="sp-fix-half sp-item" data-fix="' + k + '"><div class="sp-l">' + lab + '</div><div class="sp-v def">' + spFa(n) + ' ردیف' + (n > 1 ? ' · ' + spFa(i + 1) + ' از ' + spFa(n) : '') + '</div></div>';
      };
      return spHead('تکمیل اطلاعات') + '<div class="sp-fix">' + (noAcc ? half('acc', 'ردیف بدون حساب', noAcc) : '') + (noAcc && noCat ? '<i class="sp-fix-sep"></i>' : '') + (noCat ? half('cat', 'خرج بدون دسته', noCat) : '') + '</div>';
    }
    /* ===== کارهای من (to-do) در باکس هوشمند — جدا برای هر کارت ===== */
    var TODO_KEY = STORAGE_KEY + '_todos';
    /* ساختار: { کارت: { «سال-ماه»: [ {id, items:[{t, done}]} ] } } — هر فهرست یک اسلاید، فقط در همان ماه */
    function todoYm() { return periodKey(currentYear, currentMonth); }
    function loadTodoMap() {
      try { var m = JSON.parse(localStorage.getItem(TODO_KEY) || '{}'); return (m && typeof m === 'object') ? m : {}; } catch (e) { return {}; }
    }
    /* تاریخ ساخت فهرست کارها: « (۲۱ مهر)» — از زمان ذخیره‌شده یا شناسهٔ فهرست (l + زمان به مبنای ۳۶) */
    function hkTodoDateLabel(l) {
      try {
        var ts = Number(l && l.at) || 0;
        if (!ts && l && /^l[0-9a-z]{8}/.test(l.id || '')) ts = parseInt(l.id.slice(1, 9), 36) || 0;
        if (!(ts > 1e12)) return '';
        var j = hkJalaliOfTs(ts);
        return ' (' + toPersianDigits(String(j.d)) + ' ' + MONTHS[j.m - 1] + ')';
      } catch (e) { return ''; }
    }
    function loadTodoLists(title) {
      var m = loadTodoMap(), k = (title || '').trim(), v = m[k];
      /* نسخهٔ قبلی (یک فهرست بدون ماه) → فهرستِ ماه جاری */
      if (Array.isArray(v)) { var o = {}; o[todoYm()] = v.length ? [{ id: 'l' + Date.now().toString(36), items: v }] : []; v = o; m[k] = v; try { localStorage.setItem(TODO_KEY, JSON.stringify(m)); } catch (e0) {} }
      var lists = (v && Array.isArray(v[todoYm()])) ? v[todoYm()] : [];
      return lists.filter(function (l) { return l && l.id && ((Array.isArray(l.items) && l.items.length) || (Array.isArray(l.ink) && l.ink.length)); });
    }
    function saveTodoList(title, id, items) {
      try {
        var m = loadTodoMap(), k = (title || '').trim(), ym = todoYm();
        if (!m[k] || Array.isArray(m[k])) { loadTodoLists(k); m = loadTodoMap(); }
        if (!m[k] || typeof m[k] !== 'object') m[k] = {};
        var lists = Array.isArray(m[k][ym]) ? m[k][ym] : [];
        var at = -1;
        lists.forEach(function (l, i) { if (l && l.id === id) at = i; });
        if (items && items.length) {
          if (at >= 0) lists[at].items = items; else lists.push({ id: id, items: items, at: Date.now() });
        } else if (at >= 0) lists.splice(at, 1);
        if (lists.length) m[k][ym] = lists; else delete m[k][ym];
        if (!Object.keys(m[k]).length) delete m[k];
        return hkStorageSet(TODO_KEY, JSON.stringify(m));
      } catch (e) { hkPersistFailed(TODO_KEY, e); return false; }
    }
    function loadTodos(title, id) {
      var l = loadTodoLists(title).filter(function (x) { return x.id === id; })[0];
      return l ? l.items : [];
    }
    /* اسلاید خالی: فقط یک + آبی */
    function spPageTodoAdd() {
      return '<div class="sp-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></div>';
    }
    /* هر فهرستِ ثبت‌شده در این ماه = یک اسلاید جدا (لمس = ویرایش همان فهرست) */
    function spPageTodo(D) {
      var lists = loadTodoLists(D.title);
      if (!lists.length) return null;
      return lists.map(function (l) {
        /* ۱.۳.۶۹: یادداشت دست‌نویس: خط‌ها به‌صورت برداری، با رنگ همان تم کشیده می‌شوند */
        if (Array.isArray(l.ink)) return { key: 'todo-' + l.id, onTap: function (title) { openInkEditor(title, l.id); },
          html: spHead('یادداشت' + hkTodoDateLabel(l)) + '<div class="sp-ink">' + hkInkSvg(l.ink) + '</div>' };
        return {
          key: 'todo-' + l.id,
          onTap: function (title) { openTodoEditor(title, l.id); },
          /* انجام‌نشده‌ها بالا، انجام‌شده‌ها پایین (ترتیب داخل هر گروه همان ترتیب نوشتن) */
          html: spHead('کارهای من' + hkTodoDateLabel(l)) + spItems(l.items.filter(function (x) { return !x.done; }).concat(l.items.filter(function (x) { return x.done; })).map(function (x) {
            return '<div class="sp-todo' + (x.done ? ' done' : '') + '"><i></i><span>' + spEsc(x.t) + '</span></div>';
          }))
        };
      });
    }
    function refreshSmartPanelsFor(title, focusKey) {
      var t = (title || '').trim();
      try {
        var st = _smartPanelState[t];
        if (st && focusKey) { st.key = focusKey; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; }
        document.querySelectorAll('#homeSmartBox .pc-smart-box, #homeCards .person-card:not(.hc-clone) .pc-smart-box').forEach(function (el) {
          if ((el._spTitle || '').trim() === t) { mountSmartPanel(el, t); try { fitSmartPanel(el); } catch (eF) {} }
        });
      } catch (e) {}
    }
    function closeTodoEditor() {
      var ov = document.getElementById('todoEditorOverlay');
      if (!ov) return;
      try { if (ov._kbOff) ov._kbOff(); } catch (e) {}
      ov.classList.remove('open');
      setTimeout(function () { try { ov.remove(); } catch (e) {} }, 200);
    }
    /* listId خالی = فهرست تازه (از اسلاید +)؛ در غیر این صورت ویرایش همان فهرست */
    function openTodoEditor(title, listId) {
      closeTodoEditor();
      var t = (title || '').trim();
      var id = listId || ('l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var list = (listId ? loadTodos(t, listId) : []).map(function (x) { return { t: x.t, done: !!x.done }; });
      list = list.filter(function (x) { return !x.done; }).concat(list.filter(function (x) { return x.done; }));
      var ov = document.createElement('div');
      ov.id = 'todoEditorOverlay';
      ov.className = 'todo-overlay';
      ov.innerHTML = '<div class="todo-box" role="dialog" aria-label="کارهای من">' +
        '<div class="todo-title">کارهای من</div>' +
        '<div class="todo-list"></div>' +
        '<div class="todo-new"><input type="text" class="todo-input" maxlength="120" placeholder="کار جدید…" enterkeyhint="done">' +
        '<button type="button" class="todo-add" aria-label="افزودن"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
        '<div class="todo-actions"><button type="button" class="todo-cancel">انصراف</button><button type="button" class="todo-save">ثبت</button></div>' +
        '</div>';
      document.body.appendChild(ov);
      var box = ov.querySelector('.todo-box'), lst = ov.querySelector('.todo-list'), inp = ov.querySelector('.todo-input');
      /* تیک خوردن: کار انجام‌شده نرم به پایین فهرست می‌رود و انجام‌نشده‌ها بالا می‌مانند (FLIP) */
      function toggle(x) {
        x.done = !x.done;
        var tops = new Map();
        lst.querySelectorAll('.todo-row').forEach(function (r) { if (r._item) tops.set(r._item, r.getBoundingClientRect().top); });
        var undone = list.filter(function (y) { return !y.done; }), done = list.filter(function (y) { return y.done; });
        list.length = 0; Array.prototype.push.apply(list, undone.concat(done));
        draw();
        lst.querySelectorAll('.todo-row').forEach(function (r) {
          var t0 = tops.get(r._item); if (t0 == null || !r.animate) return;
          var dy = t0 - r.getBoundingClientRect().top;
          if (Math.abs(dy) > 1) r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
        });
      }
      function draw() {
        lst.innerHTML = '';
        if (!list.length) { lst.innerHTML = '<div class="todo-empty">هنوز کاری ننوشته‌ای</div>'; return; }
        list.forEach(function (x, i) {
          var row = document.createElement('div');
          row.className = 'todo-row' + (x.done ? ' done' : '');
          row.innerHTML = '<button type="button" class="todo-check" aria-label="انجام شد"></button><span class="todo-text"></span><button type="button" class="todo-del" aria-label="حذف">×</button>';
          row.querySelector('.todo-text').textContent = x.t;
          row._item = x;
          row.querySelector('.todo-check').onclick = function () { toggle(x); };
          row.querySelector('.todo-text').onclick = function () { toggle(x); };
          row.querySelector('.todo-del').onclick = function () { list.splice(i, 1); draw(); };
          lst.appendChild(row);
        });
      }
      function addFromInput() {
        var v = (inp.value || '').trim();
        if (!v) return false;
        list.push({ t: v, done: false });
        inp.value = '';
        draw();
        lst.scrollTop = lst.scrollHeight;
        return true;
      }
      draw();
      ov.querySelector('.todo-add').onclick = function () { addFromInput(); try { inp.focus(); } catch (e) {} };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFromInput(); } });
      ov.querySelector('.todo-cancel').onclick = closeTodoEditor;
      ov.querySelector('.todo-save').onclick = function () {
        addFromInput();   /* متنِ نوشته‌شده‌ای که هنوز + نخورده هم ثبت شود */
        saveTodoList(t, id, list);
        closeTodoEditor();
        refreshSmartPanelsFor(t, list.length ? ('todo-' + id) : 'todoAdd');
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) closeTodoEditor(); });
      try { ov._kbOff = attachKeyboardLift(box); } catch (eK) {}
      requestAnimationFrame(function () { ov.classList.add('open'); });
    }
    try { window.openTodoEditor = openTodoEditor; window.closeTodoEditor = closeTodoEditor; } catch (eW) {}
    /* ===== ۱.۳.۶۹: اسلاید تازهٔ باکس هوشمند: «یادداشت دست‌نویس» (انگشت یا قلم) یا «فهرست کارها» ===== */
    function openTodoChooser(title) {
      var old = document.getElementById('hkTodoPick'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkTodoPick'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs hk-todo-pick'; ov.appendChild(box);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      box.innerHTML = '<div class="hk-prefs-t">اسلاید تازه</div>' +
        '<button type="button" class="hk-tp-opt" data-k="ink"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg><span>یادداشت دست‌نویس<small>با انگشت یا قلم بنویس یا بکش</small></span></button>' +
        '<button type="button" class="hk-tp-opt" data-k="todo"><svg viewBox="0 0 24 24"><path d="M4 6l2 2 3-3M4 13l2 2 3-3M12 7h8M12 14h8M12 20h8"/></svg><span>فهرست کارها<small>کارهایی که باید انجام بدی</small></span></button>' +
        '<button type="button" class="hk-tp-opt" data-k="remind"><svg viewBox="0 0 24 24"><path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.8 2H4.7zM10 20.5h4"/></svg><span>یادآور<small>کاری که باید در یک روز مشخص یادت بیاید</small></span></button>';
      box.querySelector('[data-k="ink"]').onclick = function () { close(); openInkEditor(title, null); };
      box.querySelector('[data-k="remind"]').onclick = function () { close(); try { openUserRemindersModal(); } catch (e) {} };
      box.querySelector('[data-k="todo"]').onclick = function () { close(); openTodoEditor(title, null); };
      document.body.appendChild(ov);
    }
    /* خط‌ها: [{c:'t'|'b'|'r', w, p:[[x,y],…]}] با مختصات ۰ تا ۱۰۰۰ (افقی) و ۰ تا ۶۲۰ (عمودی) */
    var HK_INK_W = 1000, HK_INK_H = 620;
    function hkInkColor(c) { return c === 'b' ? '#08b5f5' : c === 'r' ? 'var(--hk-expense, #ff6b4a)' : c === 'g' ? 'var(--hk-income, #9ee858)' : c === 'o' ? 'var(--hk-personal, #ff9f0a)' : c === 'y' ? 'var(--hk-warning, #ffc531)' : 'currentColor'; }
    function hkInkPath(pts) {
      if (!pts || !pts.length) return '';
      if (pts.length === 1) return 'M' + pts[0][0] + ' ' + pts[0][1] + 'l0.1 0';
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += 'Q' + pts[i][0] + ' ' + pts[i][1] + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1); }
      var l = pts[pts.length - 1]; return d + 'L' + l[0] + ' ' + l[1];
    }
    function hkInkSvg(strokes) {
      return '<svg viewBox="0 0 ' + HK_INK_W + ' ' + HK_INK_H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + (strokes || []).map(function (st) {
        return '<path d="' + hkInkPath(st.p) + '" fill="none" stroke="' + hkInkColor(st.c) + '" stroke-width="' + (st.w || 6) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      }).join('') + '</svg>';
    }
    function saveInkNote(title, id, strokes) {
      try {
        var m = loadTodoMap(), k = (title || '').trim(), ym = todoYm();
        if (!m[k] || Array.isArray(m[k])) { loadTodoLists(k); m = loadTodoMap(); }
        if (!m[k] || typeof m[k] !== 'object') m[k] = {};
        var lists = Array.isArray(m[k][ym]) ? m[k][ym] : [], at = -1;
        lists.forEach(function (l, i) { if (l && l.id === id) at = i; });
        if (strokes && strokes.length) { if (at >= 0) { lists[at].ink = strokes; delete lists[at].items; } else lists.push({ id: id, ink: strokes, at: Date.now() }); }
        else if (at >= 0) lists.splice(at, 1);
        if (lists.length) m[k][ym] = lists; else delete m[k][ym];
        if (!Object.keys(m[k]).length) delete m[k];
        return hkStorageSet(TODO_KEY, JSON.stringify(m));
      } catch (e) { hkPersistFailed(TODO_KEY, e); return false; }
    }
    function openInkEditor(title, noteId) {
      var t = (title || '').trim();
      var id = noteId || ('n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var cur = noteId ? (loadTodoLists(t).filter(function (x) { return x.id === noteId; })[0] || {}) : {};
      var strokes = Array.isArray(cur.ink) ? JSON.parse(JSON.stringify(cur.ink)) : [];
      var old = document.getElementById('hkInkEd'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkInkEd'; ov.className = 'todo-overlay hk-ink-ov'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="todo-box hk-ink-box" role="dialog" aria-label="یادداشت دست‌نویس">' +
        '<div class="todo-title">یادداشت دست‌نویس</div>' +
        '<div class="hk-ink-pad"><canvas></canvas><div class="hk-ink-hint">با انگشت یا قلم بنویس</div></div>' +
        '<div class="hk-ink-tools">' +
          '<div class="hk-ink-colors"><button type="button" data-c="t" class="on" aria-label="رنگ اصلی"><i></i></button><button type="button" data-c="b" aria-label="آبی"><i></i></button><button type="button" data-c="r" aria-label="قرمز"><i></i></button><button type="button" data-c="g" aria-label="سبز"><i></i></button><button type="button" data-c="o" aria-label="نارنجی"><i></i></button><button type="button" data-c="y" aria-label="زرد"><i></i></button></div>' +
          '<button type="button" class="hk-ink-undo" aria-label="برگشت یک قدم"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>' +
          /* ۱.۳.۷۰: پاک‌کن جای دکمهٔ «پاک کردن»: با کشیدن روی صفحه همان‌جا را پاک می‌کند */
          '<button type="button" class="hk-ink-eraser" aria-label="پاک‌کن" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M7 20h13"/><path d="M4.6 14.6l9.9-9.9a2 2 0 0 1 2.8 0l2.9 2.9a2 2 0 0 1 0 2.8L12 18.6a2 2 0 0 1-1.4.6H8.2a2 2 0 0 1-1.4-.6l-2.2-2.2a2 2 0 0 1 0-2.8z"/><path d="M9.5 9.7l5.6 5.6"/></svg></button>' +
        '</div>' +
        '<div class="todo-actions"><button type="button" class="todo-cancel">انصراف</button><button type="button" class="todo-save">ثبت</button></div></div>';
      document.body.appendChild(ov);
      var pad = ov.querySelector('.hk-ink-pad'), cv = pad.querySelector('canvas'), ctx2 = cv.getContext('2d'), hint = pad.querySelector('.hk-ink-hint');
      var color = 't', drawing = null, scale = 1, dpr = window.devicePixelRatio || 1;
      var cssVar = function (n, d) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; };
      var inkCol = function (c) { if (c === 't') return getComputedStyle(pad).color; if (c === 'b') return '#08b5f5'; if (c === 'g') return cssVar('--hk-income', '#9ee858'); if (c === 'o') return cssVar('--hk-personal', '#ff9f0a'); if (c === 'y') return cssVar('--hk-warning', '#ffc531'); return cssVar('--hk-expense', '#ff6b4a'); };
      /* پاک‌کن و «برگشت»: پیش از هر کشیدن/پاک کردن، یک نسخه از خط‌ها نگه داشته می‌شود */
      var erasing = false, erGest = null, erAt = null, hist = [], ER_R = 16;
      var snap = function () { hist.push(JSON.stringify(strokes)); if (hist.length > 60) hist.shift(); };
      /* نقطه‌های خط را آن‌قدر پرتراکم می‌کند که پاک‌کن از لای دو نقطهٔ دور رد نشود */
      var dense = function (pts) {
        var out = [pts[0]];
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 5);
          for (var k = 1; k <= n; k++) { var f = k / (n + 1), np = [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f)]; np.x = 1; out.push(np); }
          out.push(b);
        }
        return out;
      };
      /* از نقطه‌های کمکی فقط دو سرِ هر تکه می‌ماند تا حجم داده بزرگ نشود */
      var trim = function (seg) { return seg.filter(function (p, i) { return !p.x || i === 0 || i === seg.length - 1; }).map(function (p) { return [p[0], p[1]]; }); };
      /* هر خطی که از دایرهٔ پاک‌کن رد شود، همان تکه‌اش برداشته و بقیه‌اش به چند خط جدا شکسته می‌شود */
      var eraseAt = function (q) {
        var next = [], hit = false;
        strokes.forEach(function (st) {
          var r = ER_R + (st.w || 6) / 2, r2 = r * r, pts = st.p;
          var near = pts.some(function (p) { return Math.abs(p[0] - q[0]) <= r + 40 && Math.abs(p[1] - q[1]) <= r + 40; });
          if (!near) { next.push(st); return; }
          pts = dense(pts);
          var cur = [], cut = false;
          pts.forEach(function (p) {
            var dx = p[0] - q[0], dy = p[1] - q[1];
            if (dx * dx + dy * dy <= r2) { cut = true; if (cur.length) { next.push({ c: st.c, w: st.w, p: trim(cur) }); cur = []; } }
            else cur.push(p);
          });
          if (!cut) { next.push(st); return; }
          hit = true;
          if (cur.length) next.push({ c: st.c, w: st.w, p: trim(cur) });
        });
        if (hit) strokes = next;
      };
      var eraseLine = function (a, b) {
        var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / (ER_R * 0.6)));
        for (var k = 1; k <= n; k++) eraseAt([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      };
      var size = function () { var w = pad.clientWidth; cv.style.width = w + 'px'; cv.style.height = (w * HK_INK_H / HK_INK_W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * HK_INK_H / HK_INK_W * dpr); scale = cv.width / HK_INK_W; redraw(); };
      var drawStroke = function (st) {
        var pts = st.p; if (!pts.length) return;
        ctx2.strokeStyle = inkCol(st.c); ctx2.lineWidth = (st.w || 6) * scale; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
        ctx2.beginPath(); ctx2.moveTo(pts[0][0] * scale, pts[0][1] * scale);
        if (pts.length === 1) ctx2.lineTo(pts[0][0] * scale + 0.1, pts[0][1] * scale);
        for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx2.quadraticCurveTo(pts[i][0] * scale, pts[i][1] * scale, mx * scale, my * scale); }
        if (pts.length > 1) { var l = pts[pts.length - 1]; ctx2.lineTo(l[0] * scale, l[1] * scale); }
        ctx2.stroke();
      };
      var redraw = function () {
        ctx2.clearRect(0, 0, cv.width, cv.height); strokes.forEach(drawStroke); if (drawing) drawStroke(drawing);
        if (erAt) { ctx2.beginPath(); ctx2.arc(erAt[0] * scale, erAt[1] * scale, ER_R * scale, 0, Math.PI * 2); ctx2.lineWidth = 1.5 * dpr; ctx2.strokeStyle = getComputedStyle(pad).color; ctx2.globalAlpha = 0.45; ctx2.stroke(); ctx2.globalAlpha = 1; }
        hint.style.display = (strokes.length || drawing) ? 'none' : '';
      };
      var pt = function (e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * HK_INK_W), Math.round((e.clientY - r.top) / r.height * HK_INK_H)]; };
      cv.addEventListener('pointerdown', function (e) {
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (eC) {}
        if (erasing) { snap(); erGest = pt(e); erAt = erGest; eraseAt(erGest); redraw(); return; }
        snap();
        /* قلم: ضخامت با فشار؛ انگشت: ضخامت ثابت */
        var w = e.pointerType === 'pen' && e.pressure > 0 ? Math.max(3, Math.min(10, 3 + e.pressure * 7)) : 6;
        drawing = { c: color, w: Math.round(w * 10) / 10, p: [pt(e)] }; redraw();
      });
      cv.addEventListener('pointermove', function (e) {
        if (erGest) {
          e.preventDefault();
          (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(function (ce) { var q = pt(ce); eraseLine(erGest, q); erGest = q; });
          erAt = erGest; redraw(); return;
        }
        if (!drawing) return; e.preventDefault();
        var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        evs.forEach(function (ce) { var q = pt(ce), l = drawing.p[drawing.p.length - 1]; if (Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) >= 3) drawing.p.push(q); });
        redraw();
      });
      var end = function () {
        if (erGest) { erGest = null; erAt = null; if (hist.length && hist[hist.length - 1] === JSON.stringify(strokes)) hist.pop(); redraw(); return; }
        if (!drawing) return; strokes.push(drawing); drawing = null; redraw();
      };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      var erBtn = ov.querySelector('.hk-ink-eraser');
      var setErase = function (on) { erasing = on; erBtn.classList.toggle('on', on); erBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); pad.classList.toggle('erasing', on); };
      ov.querySelectorAll('.hk-ink-colors button').forEach(function (b) { b.onclick = function () { color = b.dataset.c; setErase(false); ov.querySelectorAll('.hk-ink-colors button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      erBtn.onclick = function () { var on = !erasing; setErase(on); ov.querySelectorAll('.hk-ink-colors button').forEach(function (x) { x.classList.toggle('on', !on && x.dataset.c === color); }); };
      ov.querySelector('.hk-ink-undo').onclick = function () { if (hist.length) { strokes = JSON.parse(hist.pop()); redraw(); } };
      var close = function () { ov.classList.remove('open'); window.removeEventListener('resize', size); setTimeout(function () { try { ov.remove(); } catch (e) {} }, 200); };
      ov._hkCancel = close;
      ov.querySelector('.todo-cancel').onclick = close;
      ov.querySelector('.todo-save').onclick = function () {
        saveInkNote(t, id, strokes);
        close();
        refreshSmartPanelsFor(t, strokes.length ? ('todo-' + id) : 'todoAdd');
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      window.addEventListener('resize', size);
      requestAnimationFrame(function () { ov.classList.add('open'); size(); });
    }
    try { window.openInkEditor = openInkEditor; window.openTodoChooser = openTodoChooser; } catch (eW2) {}


    /* ===== ۱.۳.۷۵: اسلاید «یادآورها» در باکس هوشمند — همهٔ یادآورهای ساخته‌شده به ترتیب سررسید؛ آن‌که موعدش رسیده (هشدار)
       حاشیهٔ قرمز چرخان و نقطهٔ قرمز دارد و هر بار اسلاید می‌آید دوباره می‌چرخد (با یک بار دیدن خاموش نمی‌شود) ===== */
    function spPageReminders() {
      try { loadUserReminders(); } catch (e) {}
      var L = (userReminders || []).filter(function (r) { return r && !r.deletedAt; });
      if (!L.length) return null;
      var today = getTodayPersian(), due = {};
      try { getUserRemindDueSoon().forEach(function (x) { due[x.r.id || x.r.title] = x; }); } catch (e2) {}
      var rows = L.map(function (r) { var nd = reminderNextDue(r); return { r: r, nd: nd, days: daysBetweenPersian(today, nd), hot: !!due[r.id || r.title] }; })
        .filter(function (x) { return x.days >= 0 || x.r.repeat !== 'once'; })
        .sort(function (a, b) { return (b.hot - a.hot) || (a.days - b.days); });
      if (!rows.length) return null;
      /* ۱.۳.۷۸: همان ردیف‌های ساده (اسم | روز و تاریخ)؛ بی نقطهٔ قرمز؛ سررسیده: نوار چرخان و نوشتهٔ قرمز تیره */
      return spHead('یادآورها') + '<div class="sp-rem">' + rows.slice(0, 4).map(function (x) {
        var when = x.days === 0 ? 'امروز' : x.days === 1 ? 'فردا' : (spFa(x.days) + ' روز دیگر');
        return '<div class="sp-rem-r' + (x.hot ? ' hot hk-snake' : '') + '" data-rem="' + spEsc(x.r.id || '') + '"><b>' + spEsc(x.r.title || 'یادآور') + '</b>' +
          '<span class="' + (x.hot ? 'sp-rem-due' : 'hk-inst-mu') + '">' + when + '، ' + spEsc(formatReminderDue(x.nd)) + '</span></div>';
      }).join('') + (rows.length > 4 ? '<div class="sp-rem-more">و ' + spFa(rows.length - 4) + ' یادآور دیگر</div>' : '') + '</div>';
    }
    /* زدن یادآور: پنجرهٔ یادآورها باز، آرام تا همان یادآور و چند لحظه هایلایت (بی ورود به ویرایش) */
    function hkRemindersFocus(id) {
      try { openUserRemindersModal(); } catch (e) { return; }
      setTimeout(function () {
        try {
          var el = document.querySelector('#userRemindersList .ur-item[data-ur-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (!el) return;
          var dur = 0; try { dur = hkSlowScrollTo(el, 900); } catch (eS) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); dur = 600; }
          setTimeout(function () { el.classList.add('ur-hl'); setTimeout(function () { el.classList.remove('ur-hl'); }, 2600); }, (dur || 0) + 80);
        } catch (e2) {}
      }, 320);
    }
    function spTapReminders(title, tgt) {
      var r = tgt && tgt.closest && tgt.closest('[data-rem]'), id = r ? r.getAttribute('data-rem') : '';
      var act = tgt && tgt.closest && tgt.closest('[data-act]'), a = act ? act.getAttribute('data-act') : '';
      if (a === 'edit' && id) { spGo(function () { openUserReminderFromHome(id); }); return; }
      if (a === 'del' && id) {
        try { loadUserReminders(); } catch (e0) {}
        var rr = (userReminders || []).filter(function (x) { return x.id === id; })[0]; if (!rr) return;
        askConfirm('یادآور «' + (rr.title || '') + '» حذف شود؟', function () {
          try { pushToTrash('reminder', rr.title || 'یادآور', { sourceLabel: 'یادآور', reminder: JSON.parse(JSON.stringify(rr)) }); } catch (eTr) {}
          userReminders = userReminders.filter(function (x) { return x.id !== id; });
          saveUserReminders(); showToast('حذف شد');
        });
        return;
      }
      spGo(function () { if (id) hkRemindersFocus(id); else openUserRemindersModal(); });
    }
    try { window.spPageReminders = spPageReminders; window.hkRemindersFocus = hkRemindersFocus; } catch (eWr) {}
    var SMART_PANEL_PAGES = [
      { key: 'warn', build: spPageWarn, onTap: function (title, tgt) {
        if (tgt && tgt.closest && tgt.closest('[data-act="dismiss"]')) { spDismissDupPrompt(title); return; }
        var el = tgt && tgt.closest && tgt.closest('[data-dup]'), d = HKAlerts.duplicates(title)[el ? +el.getAttribute('data-dup') : 0];
        if (!d) return;
        spGo(function () { openPersonDetail(title, d.tab); spFlashRows(title, d.tab, [d.ra, d.rb]); });
      } },
      /* ۱.۳.۴۳: زدن هر اسلاید = رفتن به همان بخشی که اطلاعاتش را نشان می‌دهد */
      { key: 'overview', build: spPageOverview, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); }); } },
      /* ۱.۳.۷۴: کارت‌های قسط (وضعیت کامل؛ زدن ردیف = تاریخچهٔ همان کارت) */
      { key: 'inst', build: spPageInst, onTap: spTapInst },
      /* ۱.۳.۷۵: یادآورها */
      { key: 'reminders', build: spPageReminders, onTap: spTapReminders },
      { key: 'stats', build: spPageStats, onTap: function (title) { spGo(function () { openStatsSheet({ mode: 'daily', card: title, focus: 'stCmp' }); }); } },
      { key: 'todo', build: spPageTodo },
      /* ۱.۳.۴۷: اسلاید اقساط برداشته شد (اقساط خاموش است) */
      { key: 'ledger', build: spPageLedger, onTap: function () { spGo(function () { switchTabFromMenu('ledger'); }); } },
      { key: 'categories', build: spPageCategories, onTap: function (title) { openCategoryReviewSheet(title); } },
      { key: 'projects', build: spPageProjects, onTap: function () { spGo(function () { openSubjectsModal(); }); } },
      { key: 'upcoming', build: spPageUpcoming, onTap: function (title) { spGo(function () { if (spHasUpcomingInst(title)) switchTabFromMenu('install'); else openPersonDetail(title, 'income'); }); } },
      { key: 'jump', build: spPageJump, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); spFlashJump(title); }); } },
      { key: 'biggest', build: spPageBiggest, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); spFlashBiggest(title); }); } },
      { key: 'fix', build: spPageFix, onTap: function (title, tgt) {
        var h = tgt && tgt.closest && tgt.closest('.sp-fix-half'), k = h ? h.getAttribute('data-fix') : '';
        if (!k) { var hs = document.querySelectorAll('.sp-fix-half'); k = hs.length === 1 ? hs[0].getAttribute('data-fix') : 'cat'; }
        var L = spFixList(title, k); if (!L.length) return;
        var key = title + '|' + k, i = (_spFixIdx[key] || 0) % L.length, it = L[i];
        _spFixIdx[key] = i + 1;
        spGo(function () { openPersonDetail(title, it.tab); spFlashRow(title, function () { return it.row; }, it.tab); });
      } },
      { key: 'insight', build: spPageInsight, onTap: function (title) { spGo(function () { openStatsSheet({ mode: 'daily', card: title, focus: 'stCats' }); }); } },
      { key: 'todoAdd', build: spPageTodoAdd, onTap: function (title) { openTodoChooser(title); } }
    ];
    function spDismissDupPrompt(title) {
      var d = HKAlerts.duplicates(title)[0];
      if (!d) return;
      askConfirm('اگر این دو تراکنش واقعاً جدا هستند (تکراری نیستند)، هشدار برداشته شود؟', function () {
        HKAlerts.dismiss(d.id);
        try { renderHomeCards(); } catch (e) {}
      });
    }

    function mountSmartPanel(el, title) {
      var D = null;
      try { D = spCollect(title); } catch (e) { D = null; }
      var pages = [];
      if (D) hkSpOrderedPages().forEach(function (pg) {
        var h = null;
        try { h = pg.build(D); } catch (e) { h = null; }
        /* سازنده می‌تواند چند اسلاید بدهد (مثلاً چند فهرست کار) */
        if (Array.isArray(h)) h.forEach(function (x) { if (x && x.html) pages.push({ key: x.key, html: x.html, onTap: x.onTap || pg.onTap }); });
        else if (h) pages.push({ key: pg.key, html: h, onTap: pg.onTap });
      });
      el.classList.add('sp-panel');
      el._spTitle = title;
      el._spPages = pages;
      el.innerHTML = '';
      var view = document.createElement('div');
      view.className = 'sp-view';
      el.appendChild(view);
      if (!pages.length) {
        view.innerHTML = '<div class="sp-empty">بعد از ثبت چند تراکنش، تحلیل وضعیت مالی اینجا نمایش داده می‌شود.</div>';
        return;
      }
      var st = _smartPanelState[title] || (_smartPanelState[title] = { key: pages[0].key, pausedUntil: 0, nextAt: 0, warnSig: '' });
      /* هشدار تکرارِ تازه: یک بار مستقیم روی صفحهٔ هشدار برو */
      var sig = (D.alerts.filter(function (a) { return a.type === 'dup'; }).map(function (a) { return a.id; })).join(',');
      if (sig && sig !== st.warnSig) { st.key = 'warn'; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; }
      st.warnSig = sig;
      /* ۱.۳.۶۸: اگر پیش‌تر فقط اسلاید «+» بود و حالا اسلاید واقعی آمده، از اسلاید اول شروع کن (مگر کاربر خودش ورق زده باشد) */
      if (st.key === 'todoAdd' && pages.length > 1 && !(Date.now() < (st.pausedUntil || 0))) st.key = pages[0].key;
      var idx = 0;
      pages.forEach(function (p, i) { if (p.key === st.key) idx = i; });
      st.key = pages[idx].key;
      if (!st.nextAt) st.nextAt = Date.now() + SMART_PANEL_INTERVAL;
      el._spIdx = idx;
      view.appendChild(spMakePage(pages[idx]));
      spArmTips(st, pages[idx]);
      bindSmartPanelGestures(el);
    }
    /* صفحهٔ نکته با دو نکته: ۵ ثانیه اولی، اسکرول عمودی، ۵ ثانیه دومی، سپس صفحهٔ بعد */
    var SMART_TIP_MS = 5000;
    function spArmTips(st, pg) {
      var n = pg && (pg.key === 'insight' || pg.key === 'projects') ? (pg.html.split('sp-tipbox').length - 1) : 0;
      st.tipIdx = 0; st.tipCount = n;
      if (n > 1) {
        /* هر نکته ۵ ثانیه؛ زمان صفحه به تعداد نکات بستگی دارد (نه ۱۰ ثانیهٔ ثابت) */
        st.subAt = Date.now() + SMART_TIP_MS;
        st.nextAt = Date.now() + SMART_TIP_MS * n;
      } else st.subAt = 0;
    }
    /* اسکرول عمودی با همان سرعت و منحنی جابه‌جایی افقی صفحه‌ها (۳۸۰ms، ease-out) */
    function spAnimScrollTop(el, to, dur) {
      var from = el.scrollTop, d = to - from;
      if (Math.abs(d) < 1) return;
      dur = dur || 380;
      var t0 = performance.now(), snap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none';
      var step = function (now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.scrollTop = from + d * e;
        if (k < 1) requestAnimationFrame(step); else el.style.scrollSnapType = snap;
      };
      requestAnimationFrame(step);
    }
    function spMakePage(pg) {
      var d = document.createElement('div');
      d.className = 'sp-page sp-k-' + pg.key;
      d.innerHTML = pg.html;
      /* نمودارها خالی شروع می‌شوند و نرم پر می‌شوند */
      var bars = d.querySelectorAll('i[data-w]');
      bars.forEach(function (b) { b.style.width = '0%'; });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        bars.forEach(function (b, k) { b.style.transitionDelay = (k * 90) + 'ms'; b.style.width = b.getAttribute('data-w') + '%'; });
      }); });
      return d;
    }
    /* شروع محتوا هم‌تراز «درآمد کل» در کادر کناری + کوچک‌کردن فونت تا هیچ نوشته‌ای نصفه نشود */
    function fitSmartPanel(el) {
      if (!el || !el.classList.contains('sp-panel')) return;
      try {
        var card = el.closest('.person-card');
        var lab = card && card.querySelector('.person-stat-box .psl-l');
        if (lab) {
          var off = Math.round(lab.getBoundingClientRect().top - el.getBoundingClientRect().top - 1);
          if (off >= 2 && off < 40) el.style.setProperty('--sp-pt', off + 'px');
        }
      } catch (e0) {}
      el.querySelectorAll('.sp-page:not(.sp-out)').forEach(function (pg) { spFitPage(pg); });
    }
    /* ۱.۳.۴۹: اسلاید بلند (بخشی پایین مانده): بعد از کمی مکث آرام تا پایین اسکرول می‌شود؛ زمان اسلاید به همان اندازه بیشتر */
    function spAutoScroll(fr) {
      if (!fr || fr._spAuto) return;
      var max = fr.scrollHeight - fr.clientHeight;
      if (max < 4) return;
      fr._spAuto = true;
      var box = fr.closest('.pc-smart-box'), st = box && _smartPanelState[box._spTitle];
      var dur = Math.min(9000, Math.max(1800, max * 45)), wait = 2200;
      if (st) st.nextAt = Math.max(st.nextAt || 0, Date.now() + wait + dur + 2600);
      setTimeout(function () {
        if (!fr.isConnected || fr.scrollTop > 2) return;
        if (st && Date.now() < (st.pausedUntil || 0)) return;
        if (box) box._spAutoUntil = Date.now() + dur + 300;
        var from = fr.scrollTop, t0 = performance.now(), snap = fr.style.scrollSnapType;
        fr.style.scrollSnapType = 'none';
        var step = function (now) {
          if (!fr.isConnected) return;
          var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          fr.scrollTop = from + (max - from) * e;
          if (k < 1) requestAnimationFrame(step); else fr.style.scrollSnapType = snap;
        };
        requestAnimationFrame(step);
      }, wait);
    }
    function spFitPage(pg) {
      if (!(pg.clientHeight > 0)) return;
      var tips = pg.querySelector('.sp-tips');
      if (tips) {
        /* هر نکته به ارتفاع کامل نما؛ اگر متن جا نشد فونت همین صفحه کمی کوچک می‌شود */
        var boxes = tips.querySelectorAll('.sp-tipbox');
        var hh = tips.clientHeight;
        if (hh > 10) boxes.forEach(function (bx) { bx.style.height = hh + 'px'; });
        var f2 = 1;
        pg.style.setProperty('--sp-fs', '1');
        var overT = function () { for (var i = 0; i < boxes.length; i++) if (boxes[i].scrollHeight > boxes[i].clientHeight + 1) return true; return false; };
        while (f2 > 0.9 && overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); }
        /* جای خالی بود → فونت بزرگ‌تر تا متن باکس را پر کند */
        if (!overT()) {
          while (f2 + 0.04 <= (pg.closest('#homeSmartBox') ? 1.3 : 1.45) + 1e-6) { f2 += 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); if (overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); break; } }
        }
        /* ۱.۳.۶۸: بزرگ شدن عنوان، ارتفاع نما را کم می‌کند؛ هر نکته دوباره هم‌قد نما شود (و اگر لازم شد کمی کوچک) */
        var hh2 = tips.clientHeight;
        if (hh2 > 10 && hh2 !== hh) { boxes.forEach(function (bx) { bx.style.height = hh2 + 'px'; }); while (f2 > 0.9 && overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); hh2 = tips.clientHeight; boxes.forEach(function (bx) { bx.style.height = hh2 + 'px'; }); } }
        return;
      }
      var fr = pg.querySelector('.sp-free');
      if (fr) {
        pg.style.setProperty('--sp-fs', '1');
        /* ۱.۳.۶۸: در باکس جدا، اگر جا هست درشت‌تر (تا پیش از اسکرول شدن) */
        if (pg.closest('#homeSmartBox')) { var g1 = 1; while (g1 + 0.05 <= 1.3 + 1e-6 && fr.scrollHeight <= fr.clientHeight + 1) { g1 += 0.05; pg.style.setProperty('--sp-fs', g1.toFixed(2)); } if (fr.scrollHeight > fr.clientHeight + 1 && g1 > 1) pg.style.setProperty('--sp-fs', (g1 - 0.05).toFixed(2)); }
        fr.scrollTop = 0;
        var mark = function () { fr.classList.toggle('sp-more', fr.scrollHeight - fr.clientHeight - fr.scrollTop > 2); };
        mark();
        if (!fr._spMark) { fr._spMark = true; fr.addEventListener('scroll', mark, { passive: true }); }
        spAutoScroll(fr);
        return;
      }
      var sc = pg.querySelector('.sp-scroll');
      if (sc) {
        /* دسته‌ها: هر نما دقیقاً ۴ مورد؛ ارتفاع موردها یکسان تا اسکرول پیوسته دیده شود */
        var cats = sc.querySelectorAll('.sp-cat');
        var h = Math.floor(sc.clientHeight / 4);
        if (h > 10) cats.forEach(function (c, i) { c.style.height = h + 'px'; c.style.scrollSnapAlign = (i % 4 === 0) ? 'start' : 'none'; });
        if (h > 10 && pg.closest('#homeSmartBox')) {
          var catOver = function () { for (var q = 0; q < cats.length; q++) if (cats[q].scrollHeight > cats[q].clientHeight + 1) return true; return false; };
          var g2 = 1; pg.style.setProperty('--sp-fs', '1');
          while (g2 + 0.05 <= 1.15 + 1e-6 && !catOver()) { g2 += 0.05; pg.style.setProperty('--sp-fs', g2.toFixed(2)); }
          if (catOver() && g2 > 1) pg.style.setProperty('--sp-fs', (g2 - 0.05).toFixed(2));
        }
        spAutoScroll(sc);
        return;
      }
      var over = function () {
        if (pg.scrollHeight > pg.clientHeight + 1) return true;
        var cells = pg.querySelectorAll('.sp-l, .sp-v, .sp-tip, .sp-t');
        for (var i = 0; i < cells.length; i++) if (cells[i].scrollWidth > cells[i].clientWidth + 1) return true;
        return false;
      };
      var f = 1;
      pg.style.setProperty('--sp-fs', '1');
      /* اطلاعات زیاد (ارتفاع): به‌جای ریز کردن متن، محتوا مثل اسلاید طلب/بدهی اسکرول عمودی می‌شود */
      /* صفحه‌های هم‌فاصله: اول کمی (نه ریز) کوچک؛ اگر باز جا نشد مثل بقیه اسکرول عمودی */
      if (pg.querySelector('.sp-even')) { while (f > 0.9 && pg.scrollHeight > pg.clientHeight + 1) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); } }
      if (pg.scrollHeight > pg.clientHeight + 1) {
        var ev = pg.querySelector('.sp-even'); if (ev) ev.style.flex = '0 0 auto';
        var fr2 = document.createElement('div');
        fr2.className = 'sp-scroll sp-free';
        Array.prototype.slice.call(pg.children).forEach(function (ch) { if (!ch.classList.contains('sp-h')) fr2.appendChild(ch); });
        pg.appendChild(fr2);
        var wOver = function () {
          var cells = pg.querySelectorAll('.sp-l, .sp-v, .sp-tip, .sp-t');
          for (var i = 0; i < cells.length; i++) if (cells[i].scrollWidth > cells[i].clientWidth + 1) return true;
          return false;
        };
        /* فقط اگر نوشته‌ای در عرض جا نشد کمی کوچک شود */
        while (f > 0.92 && wOver()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); }
        var mark2 = function () { fr2.classList.toggle('sp-more', fr2.scrollHeight - fr2.clientHeight - fr2.scrollTop > 2); };
        fr2.scrollTop = 0;
        mark2();
        fr2._spMark = true; fr2.addEventListener('scroll', mark2, { passive: true });
        spAutoScroll(fr2);
        return;
      }
      while (f > 0.92 && over()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); }
      /* صفحه‌های متنی (هشدار/پروژه‌ها): اگر جا هست، فونت بزرگ‌تر شود.
         ۱.۳.۶۸: در باکس هوشمندِ جدا، همهٔ اسلایدها تا جایی که جا هست درشت می‌شوند تا نوشته‌ها کل ارتفاع را پر کنند */
      var _home = !!pg.closest('#homeSmartBox');
      if ((_home || pg.querySelector('.sp-tip')) && !over()) {
        while (f + 0.04 <= (_home ? 1.3 : 1.45) + 1e-6) { f += 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); if (over()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); break; } }
      }
    }
    /* جابه‌جایی صفحه: dir = +1 بعدی، -1 قبلی (صفحهٔ بعدی از سمت چپ می‌آید؛ RTL) */
    function smartPanelGo(el, dir, fromDx) {
      var pages = el._spPages || [];
      if (pages.length < 2) return;
      var view = el.querySelector('.sp-view');
      if (!view) return;
      var cur = view.querySelector('.sp-page:not(.sp-out)');
      var idx = (el._spIdx + dir + pages.length) % pages.length;
      el._spIdx = idx;
      var st = _smartPanelState[el._spTitle];
      if (st) { st.key = pages[idx].key; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; spArmTips(st, pages[idx]); }
      var w = el.clientWidth || 100;
      var nx = spMakePage(pages[idx]);
      var reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      view.querySelectorAll('.sp-out').forEach(function (o) { o.remove(); });
      if (!cur || reduce || !nx.animate) { view.innerHTML = ''; view.appendChild(nx); spFitPage(nx); return; }
      var shift = Math.round(w * (fromDx != null ? 1 : 0.18)) * (dir > 0 ? 1 : -1);
      cur.classList.add('sp-out');
      view.appendChild(nx);
      spFitPage(nx);
      var d = fromDx != null ? 220 : 380;
      var startX = fromDx != null ? fromDx : 0;
      cur.animate([{ transform: 'translateX(' + startX + 'px)', opacity: 1 }, { transform: 'translateX(' + (startX + shift) + 'px)', opacity: 0 }], { duration: d, easing: 'ease-out', fill: 'forwards' })
        .onfinish = function () { try { cur.remove(); } catch (e) {} };
      nx.animate([{ transform: 'translateX(' + (startX - shift) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: d, easing: 'ease-out' });
    }
    function smartPanelPause(el) {
      var st = _smartPanelState[el._spTitle];
      if (st) { st.pausedUntil = Date.now() + SMART_PANEL_IDLE; st.nextAt = st.pausedUntil; st.subAt = 0; }
    }
    /* سطل زبالهٔ قرمز روی اسلاید «کارهای من»؛ لمس سطل = کل اسلاید به سطل زباله، لمس جای دیگر = لغو */
    function spShowTodoTrash(el, page) {
      var old = el.querySelector('.sp-trash-ov'); if (old) { if (old._hkClose) old._hkClose(); else old.remove(); }
      document.querySelectorAll('.sp-trash-shield').forEach(function (x) { x.remove(); });
      var listId = String(page.key || '').replace(/^todo-/, '');
      var ov = document.createElement('div'); ov.className = 'sp-trash-ov';
      ov.innerHTML = '<button type="button" class="sp-trash-btn" aria-label="حذف این فهرست"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2A2 2 0 0 0 8.5 21h7a2 2 0 0 0 2-1.8L18.5 7M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7"/></svg></button>';
      /* لایهٔ نامرئی تمام‌صفحه: هر لمس جای دیگر صفحه فقط حذف را لغو می‌کند و به هیچ دکمه/کارتی نمی‌رسد؛
         لمس روی خود سطل = حذف. رها کردنِ همان لانگ‌پرس نادیده گرفته می‌شود (فقط لمسِ تازه) */
      var shield = document.createElement('div'); shield.className = 'sp-trash-shield';
      var armed = false, downOnBtn = false;
      var btnHit = function (x, y) { var b = ov.querySelector('.sp-trash-btn'); if (!b) return false; var r = b.getBoundingClientRect(); return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6; };
      /* لایه کمی بعد از بسته شدن برداشته می‌شود تا «کلیک» همان لمس هم به دکمهٔ زیرش نرسد */
      var close = function () { try { ov.remove(); } catch (e0) {} setTimeout(function () { try { shield.remove(); } catch (e1) {} }, 400); };
      ov._hkClose = close;
      var swallow = function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
      shield.addEventListener('pointerdown', function (e) { swallow(e); armed = true; downOnBtn = btnHit(e.clientX, e.clientY); });
      shield.addEventListener('pointermove', swallow);
      ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'contextmenu'].forEach(function (n) { shield.addEventListener(n, swallow); });
      shield.addEventListener('pointerup', function (e) {
        swallow(e);
        if (!armed) return;
        var isBtn = downOnBtn && btnHit(e.clientX, e.clientY);
        close();
        if (isBtn) doDelete();
      });
      document.body.appendChild(shield);
      var doDelete = function () {
        var title = el._spTitle;
        try {
          var lists = loadTodoLists(title), l = lists.filter(function (x) { return x.id === listId; })[0];
          if (!l) return;
          if (Array.isArray(l.ink)) pushToTrash('todo_list', 'یادداشت دست‌نویس', { sourceLabel: 'باکس هوشمند — ' + (title || ''), title: title, ym: todoYm(), id: l.id, ink: JSON.parse(JSON.stringify(l.ink)) });
          else pushToTrash('todo_list', 'کارهای من (' + toPersianDigits(String(l.items.length)) + ' مورد)', { sourceLabel: 'باکس هوشمند — ' + (title || ''), title: title, ym: todoYm(), id: l.id, items: JSON.parse(JSON.stringify(l.items)) });
          saveTodoList(title, listId, []);
          refreshSmartPanelsFor(title, 'todoAdd');
          showToast('فهرست به سطل زباله رفت');
        } catch (eD) {}
      };
      el.appendChild(ov);
    }
    function bindSmartPanelGestures(el) {
      if (el._spBound) return;
      el._spBound = true;
      var sx = 0, sy = 0, dx = 0, drag = false, down = false, pid = null, cur = null, moved = false;
      el.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button !== 0) return;
        down = false;
        /* کارت‌ها در حال حرکت‌اند → این لمس برای کاروسل است (باکس هوشمند ورق نخورد) */
        try { if (typeof HomeCarousel !== 'undefined' && HomeCarousel.busy()) { moved = true; return; } } catch (eB) {}
        down = true; drag = false; moved = false; dx = 0; sx = ev.clientX; sy = ev.clientY; pid = ev.pointerId;
        smartPanelPause(el);
        /* لانگ‌پرس روی اسلاید ساختهٔ کاربر (کارهای من) → سطل زبالهٔ قرمز روی همان اسلاید */
        clearTimeout(el._spLp);
        var _pg0 = (el._spPages || [])[el._spIdx];
        if (_pg0 && /^todo-/.test(String(_pg0.key || ''))) {
          el._spLpArmed = true;
          el._spLp = setTimeout(function () {
            /* لانگ‌پرس لمسی ممکن است pointercancel بدهد؛ ملاک فقط «حرکت نکرده و رها نشده» است */
            if (!el._spLpArmed || drag) return;
            el._spLpArmed = false;
            down = false; moved = true;
            try { window.appHaptic(30); } catch (eH) {}
            spShowTodoTrash(el, _pg0);
          }, 480);
        }
      });
      el.addEventListener('pointermove', function (ev) { if (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8) { el._spLpArmed = false; clearTimeout(el._spLp); } });
      el.addEventListener('pointerup', function () { el._spLpArmed = false; clearTimeout(el._spLp); });
      el.addEventListener('touchmove', function (ev) { var t0 = ev.touches && ev.touches[0]; if (t0 && (Math.abs(t0.clientX - sx) > 8 || Math.abs(t0.clientY - sy) > 8)) { el._spLpArmed = false; clearTimeout(el._spLp); } }, { passive: true });
      el.addEventListener('touchend', function () { el._spLpArmed = false; clearTimeout(el._spLp); });
      el.addEventListener('pointermove', function (ev) {
        if (!down || ev.pointerId !== pid) return;
        var mx = ev.clientX - sx, my = ev.clientY - sy;
        if (Math.abs(mx) > 6 || Math.abs(my) > 6) moved = true;
        if (!drag) {
          if (Math.abs(mx) < 8) return;
          if (Math.abs(my) > Math.abs(mx)) { down = false; return; } /* اسکرول عمودی (دسته‌ها) */
          if ((el._spPages || []).length < 2) { down = false; return; }
          drag = true;
          try { el.setPointerCapture(pid); } catch (e) {}
          cur = el.querySelector('.sp-page:not(.sp-out)');
        }
        dx = mx;
        /* کشیدن بلند = منظور کاربر عوض کردن کارت است → واگذاری به کاروسل */
        if (Math.abs(dx) > Math.max(70, (el.clientWidth || 100) * 0.75) && typeof HomeCarousel !== 'undefined' && HomeCarousel.canDrag() && HomeCarousel.takeOver(ev)) {
          if (cur) {
            var c0 = cur, from0 = dx;
            c0.style.transform = ''; c0.style.opacity = '';
            if (c0.animate) c0.animate([{ transform: 'translateX(' + from0 + 'px)', opacity: 0.4 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 200, easing: 'ease-out' });
          }
          try { el.releasePointerCapture(pid); } catch (eR) {}
          cur = null; drag = false; down = false; moved = true;
          return;
        }
        if (cur) { cur.style.transform = 'translateX(' + dx + 'px)'; cur.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / (el.clientWidth || 100))); }
      });
      var end = function () {
        if (!down) return;
        down = false;
        smartPanelPause(el);
        if (!drag) return;
        drag = false;
        var c = cur; cur = null;
        if (Math.abs(dx) > Math.max(28, (el.clientWidth || 100) * 0.22)) {
          if (c) { c.style.transform = ''; c.style.opacity = ''; }
          smartPanelGo(el, dx > 0 ? 1 : -1, dx);
        } else if (c) {
          var from = dx;
          c.style.transform = ''; c.style.opacity = '';
          if (c.animate) c.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(0)' }], { duration: 160, easing: 'ease-out' });
        }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', function () { down = false; drag = false; moved = true; if (cur) { cur.style.transform = ''; cur.style.opacity = ''; cur = null; } });
      el.addEventListener('scroll', function () { if (Date.now() < (el._spAutoUntil || 0)) return; smartPanelPause(el); }, true);
      /* لمس ساده (بدون کشیدن): روی رویداد click تا کلیک بعدی روی برگهٔ تازه‌باز نیفتد */
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (moved) return;
        var pg = (el._spPages || [])[el._spIdx];
        el._spTapTarget = ev.target;
        if (pg && pg.onTap) { ev.preventDefault(); try { pg.onTap(el._spTitle, ev.target); } catch (e) {} }
      });
    }
    /* تایمر واحد: فقط پنل کارتِ فعالِ قابل‌مشاهده جابه‌جا می‌شود */
    (function () {
      setInterval(function () {
        try {
          if (document.hidden) return;
          var panel = document.getElementById('panel-home');
          if (!panel || !panel.classList.contains('active')) return;
          if (document.body.classList.contains('card-reorder-mode')) return;
          /* ۱.۳.۵۷: فهرست کشویی (مثلاً انتخاب سال) باز است: اسلایدها حرکت نکنند تا فهرست بسته نشود */
          if (document.querySelector('.fancy-select-list.open, .dark-select-list.open')) return;
          var t = getActiveHomeCardTitle();
          var now = Date.now();
          document.querySelectorAll('#homeSmartBox .pc-smart-box.sp-panel, #homeCards .pc-smart-box.sp-panel').forEach(function (el) {
            var st = _smartPanelState[el._spTitle];
            if (!st || (el._spPages || []).length < 2) return;
            if (t && el._spTitle !== t) return;
            if (now < st.pausedUntil) return;
            if (st.subAt && now >= st.subAt) {
              st.tipIdx = (st.tipIdx || 0) + 1;
              st.subAt = st.tipIdx < (st.tipCount || 0) - 1 ? now + SMART_TIP_MS : 0;
              var tp = el.querySelector('.sp-page:not(.sp-out) .sp-tips');
              var tgt = tp && tp.children[st.tipIdx];
              if (tgt) {
                el._spAutoUntil = now + 1200; /* اسکرول خودکار = تعامل کاربر حساب نشود */
                spAnimScrollTop(tp, tgt.offsetTop - tp.children[0].offsetTop, 380);
              }
              return;
            }
            if (now < st.nextAt) return;
            var r = el.getBoundingClientRect();
            if (!(r.width > 0) || r.right < 0 || r.left > window.innerWidth) return;
            var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!hit || !el.contains(hit)) return; /* مودال یا لایه‌ای روی کارت است */
            smartPanelGo(el, 1);
          });
        } catch (e) {}
      }, 1000);
    })();

    /* برگهٔ دسته‌بندی مخارج: فهرست همهٔ شرح‌ها؛ با لمس هر شرح، انتخاب دسته(های) همان شرح باز می‌شود.
       هر شرح می‌تواند چند دسته داشته باشد؛ مبلغش مساوی بین آن‌ها تقسیم می‌شود.
       دکمهٔ بازگشت اندروید: انتخاب دسته ← فهرست ← صفحه اصلی */
    /* ۱.۳.۴۸: پنجرهٔ پروفایل (لمس نام کاربر در منو): تغییر نام، خلاصهٔ سریع، «ماهی که گذشت»، آخرین پشتیبان + پشتیبان‌گیری الان */
    function hkCloseProfile() {
      var ov = document.querySelector('.hk-prof-ov');
      if (!ov) return false;
      try { ov.remove(); } catch (e) {}
      return true;
    }
    function hkProfileLastBackup() {
      var ts = 0;
      try { ts = Math.max(Number(localStorage.getItem(STORAGE_KEY + '_lastManualBk')) || 0, Number(autoBkState().lastAt) || 0); } catch (e) {}
      if (!(ts > 1e12)) return 'هنوز پشتیبانی گرفته نشده';
      try { var j = hkJalaliOfTs(ts); return toPersianDigits(String(j.d)) + ' ' + MONTHS[j.m - 1] + ' ' + toPersianDigits(String(j.y)); } catch (e2) { return '—'; }
    }
    /* ۱.۳.۵۱: شروع = اولین ماهی که واقعاً تراکنش دارد (ماه خالیِ دیده‌شده حساب نیست) */
    function hkProfileStart() {
      var ks = Object.keys(archive || {}).filter(function (k) {
        if (!/^\d+-\d+$/.test(k)) return false;
        var pd = archive[k]; if (!pd) return false;
        return ['income', 'expense'].some(function (t) { return ((pd[t] && pd[t].sections) || []).some(function (s) { return (s && s.rows || []).some(function (r) { return r && (Number(r.amount) || 0) > 0; }); }); });
      }).map(function (k) { var p = k.split('-'); return { y: +p[0], m: +p[1] }; }).sort(function (a, b) { return a.y - b.y || a.m - b.m; });
      var t = getTodayPersian();
      var f = ks[0] || { y: t.y, m: t.m };
      return MONTHS[f.m - 1] + ' ' + toPersianDigits(String(f.y));
    }
    /* ۱.۳.۵۱: موجودی کل = آخرین موجودی تا امروز (هر ماهی که باز باشد) */
    function hkProfileBalance() {
      var t = getTodayPersian();
      if (!t || !t.y || (currentYear === t.y && currentMonth === t.m)) return sumGlobalAccountBalances();
      var map = _hkMonthEndings(t.y, t.m, 0, {}), s = 0;
      Object.keys(map || {}).forEach(function (k) { if (!k || k === 'بدون حساب' || isLiveAccountLabel(k)) s += Number(map[k]) || 0; });
      return s;
    }
    function hkOpenProfile() {
      hkCloseProfile();
      var name = '';
      try { name = hkMainTitle() || ''; } catch (e0) {}
      var bal = 0, accN = 0, start = '';
      try { bal = hkProfileBalance(); } catch (e1) {}
      try { accN = (selectedBankAccounts || []).filter(Boolean).length; } catch (e2) {}
      try {
        start = hkProfileStart();
      } catch (e3) {}
      var ov = document.createElement('div');
      ov.className = 'modal-overlay open hk-prof-ov';
      ov.style.cssText = 'z-index:650;display:flex;align-items:center;justify-content:center;';
      var neg = bal < 0;
      ov.innerHTML = '<div class="modal-box hk-prof" role="dialog" aria-label="پروفایل">' +
        '<div class="hk-prof-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>' +
        '<span class="hk-prof-name"></span><button type="button" class="hk-prof-rename">تغییر نام</button></div>' +
        '<div class="hk-prof-tiles">' +
          '<div class="hk-prof-tile"><small>موجودی کل</small><b class="' + (neg ? 'neg' : 'pos') + '">' + (neg ? '−' : '') + formatNum(Math.abs(Math.round(bal))) + '</b></div>' +
          '<div class="hk-prof-tile"><small>حساب‌ها</small><b>' + toPersianDigits(String(accN)) + '</b></div>' +
          '<div class="hk-prof-tile"><small>شروع</small><b>' + escapeHtml(start) + '</b></div>' +
        '</div>' +
        '<button type="button" class="hk-prof-row hk-prof-recap">ماهی که گذشت</button>' +
        '<div class="hk-prof-bk"><div><small>آخرین پشتیبان</small><b>' + escapeHtml(hkProfileLastBackup()) + '</b></div><button type="button" class="hk-prof-bknow">پشتیبان‌گیری الان</button></div>' +
        '<button type="button" class="modal-btn hk-prof-close">بستن</button>' +
        '</div>';
      ov.querySelector('.hk-prof-name').textContent = name;
      ov.addEventListener('click', function (e) { if (e.target === ov) hkCloseProfile(); });
      ov.querySelector('.hk-prof-close').onclick = hkCloseProfile;
      ov.querySelector('.hk-prof-rename').onclick = function () { hkCloseProfile(); openPersonEditSheet(name, false); };
      ov.querySelector('.hk-prof-recap').onclick = function () { hkCloseProfile(); try { openMonthRecap(); } catch (e) {} };
      ov.querySelector('.hk-prof-bknow').onclick = function () { hkCloseProfile(); try { askBackupParts(); } catch (e) {} };
      document.body.appendChild(ov);
    }
    try { window.hkOpenProfile = hkOpenProfile; } catch (eWp) {}
    /* ۱.۳.۴۹: لمس نام در منو: همان باکس به پایین باز و بزرگ می‌شود (بی پنجرهٔ جدا) */
    function hkToggleProfile(force) {
      var wrap = document.getElementById('menuUserPanel'), btn = document.getElementById('menuUserName');
      if (!wrap) return;
      var open = typeof force === 'boolean' ? force : !wrap.classList.contains('open');
      if (!open) { wrap.style.maxHeight = '0px'; wrap.classList.remove('open'); if (btn) btn.classList.remove('open'); return; }
      var name = ''; try { name = hkMainTitle() || ''; } catch (e0) {}
      var bal = 0, accN = 0, start = '';
      try { bal = hkProfileBalance(); } catch (e1) {}
      try { accN = (selectedBankAccounts || []).filter(Boolean).length; } catch (e2) {}
      try {
        start = hkProfileStart();
      } catch (e3) {}
      var neg = bal < 0;
      wrap.innerHTML = '<div class="hk-prof hk-prof-inline">' +
        '<div class="hk-prof-tiles">' +
          '<div class="hk-prof-tile"><small>موجودی کل</small><b class="' + (neg ? 'neg' : 'pos') + '">' + (neg ? '−' : '') + formatNum(Math.abs(Math.round(bal))) + '</b></div>' +
          '<div class="hk-prof-tile"><small>حساب‌ها</small><b>' + toPersianDigits(String(accN)) + '</b></div>' +
          '<div class="hk-prof-tile"><small>شروع</small><b>' + escapeHtml(start) + '</b></div>' +
        '</div>' +
        '<div class="hk-prof-bk"><div><small>آخرین پشتیبان</small><b>' + escapeHtml(hkProfileLastBackup()) + '</b></div><button type="button" class="hk-prof-bknow">پشتیبان‌گیری الان</button></div>' +
        '</div>';
      wrap.querySelector('.hk-prof-bknow').onclick = function (e) { e.stopPropagation(); try { askBackupParts(); } catch (eB) {} };
      wrap.classList.add('open'); if (btn) btn.classList.add('open');
      wrap.style.maxHeight = wrap.scrollHeight + 'px';
    }

