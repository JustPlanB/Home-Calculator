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

