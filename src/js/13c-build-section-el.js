    function buildSectionEl(sec) {
      // اگر داده دارد، پیش‌فرض باز باشد
      if (sec.collapsed === undefined) {
        const hasData = (sec.rows || []).some(r => r.desc || r.amount || r.day);
        sec.collapsed = !hasData;
      }
      sec.headerBg = colorForTitle(sec.title);
      sec.color = tabAccentColor(currentTab);

      const div = document.createElement('div');
      div.className = 'section bank-card' + (sec.collapsed ? ' collapsed' : '');
      // شناسه یکتا برای هر تب (جلوگیری از تداخل درآمد/مخارج)
      const tabPrefix = (currentTab === 'income' || currentTab === 'expense') ? currentTab : 'x';
      div.id = 'sec-' + tabPrefix + '-' + sec.id;
      div.dataset.secId = sec.id;
      div.dataset.tab = tabPrefix;

      const header = document.createElement('div');
      header.className = 'section-header bank-card-header';
      const cardStyle = pastelCardForTitle(sec.title);
      // رنگ تیره یکدست + پترن CSS روی کل کارت
      div.style.setProperty('--card-solid', cardStyle.solid || cardStyle.cssBg);
      div.style.backgroundColor = cardStyle.solid || cardStyle.cssBg;
      header.style.background = 'transparent';
      header.style.color = '#fff';

      const arrowBox = document.createElement('div');
      arrowBox.className = 'collapse-arrow-box';
      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      function setArrowIcon(collapsed) {
        arrow.innerHTML = collapsed
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
      }
      setArrowIcon(!!sec.collapsed);
      arrowBox.appendChild(arrow);

      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.display = 'none';

      // عنوان: نمایش + منوی کشویی
      const titleWrap = document.createElement('div');
      titleWrap.className = 'title-wrap';
      titleWrap.style.cssText = 'flex:1;min-width:0;position:relative;';

      const titleDisplay = document.createElement('div');
      titleDisplay.className = 'title-display';
      titleDisplay.textContent = (sec.title || '').trim() || 'نام کاربر';
      titleDisplay.style.cssText = 'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif;font-weight:800;font-size:3.6rem;padding:0;border:none;background:transparent;display:block;visibility:visible;opacity:1;color:#fff;-webkit-text-fill-color:#fff;line-height:1.05;';
      if (!(sec.title || '').trim()) titleDisplay.style.opacity = '0.55';

      const titleMenu = document.createElement('div');
      titleMenu.className = 'title-menu';
      titleMenu.style.cssText = 'display:none;position:absolute;top:100%;right:0;left:0;z-index:40;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow-y:auto;-webkit-overflow-scrolling:touch;max-height:60vh;margin-top:4px;';

      function closeTitleMenu() {
        titleMenu.style.display = 'none';
        titleMenu.style.pointerEvents = 'none';
        div.classList.remove('menu-open');
        try { editTitleBtn.classList.remove('is-editing'); } catch (err) {}
        document.removeEventListener('mousedown', outsideClose);
        document.removeEventListener('click', outsideClose);
        if (window.visualViewport && titleMenu._vvHandler) {
          window.visualViewport.removeEventListener('resize', titleMenu._vvHandler);
          window.visualViewport.removeEventListener('scroll', titleMenu._vvHandler);
          titleMenu._vvHandler = null;
        }
        if (titleMenu.parentNode === document.body) titleWrap.appendChild(titleMenu);
        const sy = parseInt(document.body.dataset.scrollLock || '0', 10) || 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        delete document.body.dataset.scrollLock;
        if (sy) window.scrollTo(0, sy);
        try {
          editTitleBtn.disabled = false;
          editTitleBtn.style.pointerEvents = 'auto';
          editTitleBtn.style.opacity = '1';
        } catch (err) {}
      }
      function outsideClose(e) {
        // اسکرول صفحه منو را نببندد — فقط کلیک واقعی بیرون
        if (e.type === 'touchstart') return;
        if (!titleWrap.contains(e.target) && !titleMenu.contains(e.target)) closeTitleMenu();
      }
      function keepTitleMenuAboveKeyboard() {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const topReserve = 100; // sticky top bar + tabs
        titleMenu.style.maxHeight = Math.max(160, vh - topReserve) + 'px';
        try {
          const rect = header.getBoundingClientRect();
          if (rect.top < topReserve || rect.bottom > vh) {
            const targetY = window.scrollY + rect.top - topReserve;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        } catch (err) {}
      }
      function openTitleMenu(e) {
        if (e) e.stopPropagation();
        closeRemindBarIfOpen();
        div.classList.add('menu-open');
        try { editTitleBtn.classList.add('is-editing'); } catch (err) {}
        titleMenu.innerHTML = '';
        if (titleMenu.parentNode !== document.body) document.body.appendChild(titleMenu);

        // یک مستطیل باریک — بدون قاب تو در تو
        titleMenu.style.cssText = 'display:block;position:fixed;z-index:300;background:transparent;border:none;box-shadow:none;overflow:visible;left:12px;right:12px;padding:0;margin:0;pointer-events:auto;';

        const newBox = document.createElement('div');
        newBox.className = 'title-menu-input-wrap';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'عنوان را بنویسید';
        inp.value = (sec.title || '').trim();
        inp.setAttribute('enterkeyhint', 'done');
        inp.setAttribute('inputmode', 'text');
        inp.autocomplete = 'off';
        inp.onmousedown = (ev) => ev.stopPropagation();
        inp.onclick = (ev) => ev.stopPropagation();

        let committed = false;
        const unlockBody = () => {
          const sy = parseInt(document.body.dataset.scrollLock || '0', 10) || 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.width = '';
          delete document.body.dataset.scrollLock;
          if (sy) window.scrollTo(0, sy);
        };
        const commit = () => {
          if (committed) return;
          committed = true;
          const v = (inp.value || '').trim();
          if (v) applyTitle(v);
          closeTitleMenu();
          unlockBody();
          // اطمینان از فعال بودن دکمه ادیت
          try { editTitleBtn.disabled = false; editTitleBtn.style.pointerEvents = 'auto'; editTitleBtn.style.opacity = '1'; } catch (err) {}
        };
        const onGo = (ev) => {
          if (ev.key === 'Enter' || ev.keyCode === 13 || ev.key === 'Go' || ev.key === 'Done') {
            ev.preventDefault();
            ev.stopPropagation();
            commit();
          }
          if (ev.key === 'Escape') { committed = true; closeTitleMenu(); unlockBody(); }
        };
        inp.onkeydown = onGo;
        inp.onkeyup = onGo;
        inp.addEventListener('blur', () => {
          setTimeout(() => {
            if (!committed && titleMenu.style.display !== 'none') commit();
          }, 150);
        });
        newBox.appendChild(inp);
        titleMenu.appendChild(newBox);

        function placeTitleMenuAboveKeyboard() {
          const vv = window.visualViewport;
          const offsetTop = vv ? vv.offsetTop : 0;
          const visH = vv ? vv.height : window.innerHeight;
          const top = offsetTop + Math.max(80, Math.floor(visH * 0.25));
          titleMenu.style.top = top + 'px';
          titleMenu.style.left = '12px';
          titleMenu.style.right = '12px';
        }
        placeTitleMenuAboveKeyboard();

        titleMenu._vvHandler = placeTitleMenuAboveKeyboard;
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', titleMenu._vvHandler);
          window.visualViewport.addEventListener('scroll', titleMenu._vvHandler);
        }

        setTimeout(() => {
          document.addEventListener('mousedown', outsideClose);
          document.addEventListener('click', outsideClose);
          try { inp.focus({ preventScroll: true }); } catch (err) { try { inp.focus(); } catch (e2) {} }
          // سلکت‌آل تا با تایپ متن قبلی پاک شود
          try {
            if (inp.value) caretToEnd(inp);
            else inp.setSelectionRange(0, 0);
          } catch (err) {}
          placeTitleMenuAboveKeyboard();
        }, 40);
        setTimeout(placeTitleMenuAboveKeyboard, 300);
        setTimeout(placeTitleMenuAboveKeyboard, 600);
      }

      function applyTitle(t) {
        const trimmed = (t || '').trim();
        if (!trimmed) return;
        const dup = (periodData[currentTab].sections || []).some(
          s => s.id !== sec.id && (s.title || '').trim() === trimmed
        );
        if (dup) {
          showToast('اسم تکراری است');
          return;
        }
        sec.title = trimmed;
        stampRowOwner(sec);
        titleDisplay.textContent = trimmed;
        titleDisplay.style.opacity = '1';
        const card = pastelCardForTitle(trimmed);
        const d = dotForTitle(trimmed);
        sec.headerBg = card.solid || card.cssBg;
        sec.color = d;
        div.style.setProperty('--card-solid', card.solid || card.cssBg);
        div.style.backgroundColor = card.solid || card.cssBg;
        header.style.background = 'transparent';
        header.style.color = '#fff';
        titleDisplay.style.color = '#fff';
        titleDisplay.style.webkitTextFillColor = '#fff';
        dot.style.background = d;
        syncTitleColors(trimmed);
        // اگر اقساطی به این بخش وصل‌اند، عنوان لینک را به‌روز کن
        if (currentTab === 'expense') {
          (plans || []).forEach(p => {
            if (p.expenseSectionId === sec.id) p.expenseSectionTitle = trimmed;
          });
          syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
        }
        updateSummary();
        updateBalance();
        scheduleSave();
      }

      // کلیک روی عنوان → باز/بسته بخش (مثل بقیه هدر)
      // برای تغییر عنوان: دکمه کوچک ✎
      const editTitleBtn = document.createElement('button');
      editTitleBtn.type = 'button';
      editTitleBtn.className = 'btn-edit-title';
      editTitleBtn.title = 'تغییر عنوان';
      editTitleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      editTitleBtn.onclick = (e) => {
        e.stopPropagation();
        if (!canEditRow(sec)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        try { editTitleBtn.classList.add('is-editing'); } catch (err) {}
        openSectionNameSheet(sec, (v) => {
          try { editTitleBtn.classList.remove('is-editing'); } catch (err) {}
          if (v && (currentTab === 'income' || currentTab === 'expense')) {
            try { propagateSectionToAllMonths(currentTab, v); } catch (err) {}
          }
        });
      };
      if (pendingRenameSecId && pendingRenameSecId === sec.id) {
        pendingRenameSecId = null;
        setTimeout(() => {
          try {
            const el = document.getElementById(div.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {}
          openSectionNameSheet(sec, null);
        }, 80);
      }

      titleWrap.appendChild(titleDisplay);
      titleWrap.appendChild(titleMenu);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-del-row';
      btnDel.title = 'حذف بخش';
      btnDel.textContent = '×';
      btnDel.onclick = (e) => { e.stopPropagation(); askDeleteSection(sec.id); };

      // چیدمان کارت: راست عنوان+فلش، چپ ادیت/حذف (بدون آیکون سواپ)
      const topRow = document.createElement('div');
      topRow.className = 'bank-card-top';
      const titleSide = document.createElement('div');
      titleSide.className = 'bank-card-title-side';
      titleSide.appendChild(arrowBox);
      titleSide.appendChild(titleWrap);
      const actions = document.createElement('div');
      actions.className = 'bank-card-actions';
      actions.appendChild(editTitleBtn);
      actions.appendChild(btnDel);
      topRow.appendChild(titleSide);
      topRow.appendChild(actions);
      header.appendChild(topRow);
      header.appendChild(dot);

      // آمار روی کارت
      const statsBox = document.createElement('div');
      statsBox.className = 'bank-card-stats';
      const isIncomeCard = currentTab === 'income';
      const labTotal = isIncomeCard ? 'درآمد کل' : 'خرج کل';
      const labPaid = isIncomeCard ? 'دریافت شده' : 'پرداخت شده';
      const labUnpaid = isIncomeCard ? 'دریافت نشده' : 'پرداخت نشده';
      const elTotal = document.createElement('div');
      elTotal.className = 'bank-card-stat total';
      const elPaid = document.createElement('div');
      elPaid.className = 'bank-card-stat paid';
      const elUnpaid = document.createElement('div');
      elUnpaid.className = 'bank-card-stat unpaid';
      function refreshCardStats() {
        const t = sectionPaidUnpaidTotal(sec);
        elTotal.textContent = labTotal + ': ' + formatNum(t.total);
        elPaid.textContent = labPaid + ': ' + formatNum(t.paid);
        elUnpaid.textContent = labUnpaid + ': ' + formatNum(t.unpaid);
      }
      refreshCardStats();
      statsBox.appendChild(elTotal);
      statsBox.appendChild(elPaid);
      statsBox.appendChild(elUnpaid);
      header.appendChild(statsBox);
      div._refreshCardStats = refreshCardStats;

      // کل هدر شامل اسم → جمع/باز
      header.onclick = (e) => {
        if (div._skipClick || div.classList.contains('dragging')) return;
        if (e.target === btnDel || e.target === editTitleBtn) return;
        if (btnDel.contains(e.target) || editTitleBtn.contains(e.target)) return;
        if (actions.contains(e.target) && (e.target.closest('.btn-edit-title') || e.target.closest('.btn-del-row') || e.target.closest('.drag-handle'))) return;
        if (titleMenu.contains(e.target)) return;
        sec.collapsed = !sec.collapsed;
        div.classList.toggle('collapsed', sec.collapsed);
        setArrowIcon(!!sec.collapsed);
        persistCurrent();
        scheduleSave();
      };

      div.appendChild(header);

      const body = document.createElement('div');
      body.className = 'section-body';

      const paidLabel = currentTab === 'income' ? 'دریافت‌شده' : 'پرداخت‌شده';
      const unpaidLabel = currentTab === 'income' ? 'دریافت‌نشده' : 'پرداخت‌نشده';

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th class="col-num"><span class="status-only">ردیف</span></th>
            <th class="col-day">روز</th>
            <th class="col-desc th-desc">شرح</th>
            <th class="col-amount">مبلغ</th>
            <th class="col-acc">حساب</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');
      (sec.rows || []).forEach((row, idx) => {
        tbody.appendChild(buildRowEl(sec.id, row, idx, paidLabel, unpaidLabel));
      });
      table.appendChild(tbody);

      const rowsScroll = document.createElement('div');
      rowsScroll.className = 'section-rows-scroll';
      rowsScroll.appendChild(table);
      body.appendChild(rowsScroll);

      function measureRowH() {
        const tr = tbody.querySelector('tr');
        const h = tr ? tr.getBoundingClientRect().height : 0;
        return h > 8 ? h : 44;
      }
      function setupLocalRowScroll() {
        const n = (sec.rows || []).length;
        const rh = measureRowH();
        document.documentElement.style.setProperty('--sec-row-h', rh + 'px');
        if (n <= 5) {
          rowsScroll.style.maxHeight = '';
          rowsScroll.style.overflowY = 'visible';
          rowsScroll.style.webkitMaskImage = 'none';
          rowsScroll.style.maskImage = 'none';
          return;
        }
        rowsScroll.style.maxHeight = (rh * 5.5) + 'px';
        rowsScroll.style.overflowY = 'auto';
        // بازگرداندن موقعیت اسکرول — بعد از layout تا نپرد بالا
        var saved = null;
        try {
          var _sk = String(tab || '') + '|' + String(title || '');
          if (window._detailRowScroll && typeof window._detailRowScroll[_sk] === 'number')
            saved = window._detailRowScroll[_sk];
        } catch (eSk) {}
        if (saved == null && typeof sec._rowScrollTop === 'number') saved = sec._rowScrollTop;
        try {
          if (saved == null && window._secRowScroll && sec && sec.id != null)
            saved = window._secRowScroll[sec.id];
        } catch (eS) {}
        if (typeof saved === 'number' && saved >= 0) {
          var apply = function() {
            try { if (rowsScroll && rowsScroll.isConnected) rowsScroll.scrollTop = saved; } catch (eA) {}
          };
          apply();
          requestAnimationFrame(function() {
            apply();
            requestAnimationFrame(function() { apply(); requestAnimationFrame(apply); });
          });
          setTimeout(apply, 30);
          setTimeout(apply, 80);
          setTimeout(apply, 160);
          setTimeout(apply, 280);
          setTimeout(apply, 450);
          setTimeout(apply, 700);
        }
      }
      function persistRowScroll() {
        var t = rowsScroll.scrollTop || 0;
        sec._rowScrollTop = t;
        try {
          window._secRowScroll = window._secRowScroll || {};
          if (sec && sec.id != null) window._secRowScroll[sec.id] = t;
          window._detailRowScroll = window._detailRowScroll || {};
          window._detailRowScroll[String(tab || '') + '|' + String(title || '')] = t;
        } catch (eP) {}
      }
      rowsScroll.addEventListener('scroll', () => {
        persistRowScroll();
        rowsScroll.classList.toggle('scrolled-down', rowsScroll.scrollTop > 2);
      }, { passive: true });

      // چرخ‌ماوس: فقط این باکس اسکرول شود، نه کل صفحه
      rowsScroll.addEventListener('wheel', (e) => {
        const n = (sec.rows || []).length;
        if (n <= 5) return;
        const el = rowsScroll;
        const maxTop = el.scrollHeight - el.clientHeight;
        if (maxTop <= 1) return;
        const atTop = el.scrollTop <= 0;
        const atBot = el.scrollTop >= maxTop - 1;
        // اگر هنوز داخل باکس جا هست، اسکرول صفحه را بگیر
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBot) || (!atTop && !atBot)) {
          e.stopPropagation();
          // اسکرول نرم دستی
          e.preventDefault();
          el.scrollTop = Math.max(0, Math.min(maxTop, el.scrollTop + e.deltaY));
          persistRowScroll();
          el.classList.toggle('scrolled-down', el.scrollTop > 2);
        }
      }, { passive: false });

      // لمس: از انتقال اسکرول به صفحه جلوگیری کن وقتی داخل لیست حرکت می‌کنیم
      let touchY = 0;
      rowsScroll.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) touchY = e.touches[0].clientY;
      }, { passive: true });
      rowsScroll.addEventListener('touchmove', (e) => {
        const n = (sec.rows || []).length;
        if (n <= 5 || !e.touches || !e.touches[0]) return;
        const el = rowsScroll;
        const maxTop = el.scrollHeight - el.clientHeight;
        if (maxTop <= 1) return;
        const y = e.touches[0].clientY;
        const dy = y - touchY;
        touchY = y;
        const atTop = el.scrollTop <= 0;
        const atBot = el.scrollTop >= maxTop - 1;
        if ((dy > 0 && !atTop) || (dy < 0 && !atBot) || (!atTop && !atBot)) {
          // اجازه اسکرول داخلی؛ از bubbling به body جلوگیری
          e.stopPropagation();
        }
      }, { passive: true });

      body._rowsScroll = rowsScroll;
      requestAnimationFrame(() => { try { setupLocalRowScroll(); } catch (e) {} });
      setTimeout(() => { try { setupLocalRowScroll(); } catch (e) {} }, 40);

      const addRowWrap = document.createElement('div');
      addRowWrap.className = 'add-row-wrap';
      /* دکمه + : TAP=شخصی | کشیدن افقی=پروژه */
      var fabWrap = document.createElement('div');
      fabWrap.className = 'row-add-fab-wrap';
      fabWrap.innerHTML =
        '<div class="row-add-track" aria-hidden="true"><span class="row-add-track-label">پروژه</span>' +
          window.rowAddArrowSvg() + '</div>' +
        '<button type="button" class="row-add-fab" aria-label="افزودن ردیف">' +
          '<svg viewBox="0 0 24 24"><path class="fab-plus" d="M12 5v14M5 12h14"/><path class="fab-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
        '</button>';
      bindVerticalProjectAdd(fabWrap, {
        threshold: 100,
        onTap: function() {
          try { addRow(sec.id, 1); } catch (eA) {}
        },
        onProject: function() {
          try {
            var fn = window.openProjectRowPicker || openProjectRowPicker;
            if (typeof fn === 'function') fn(sec.id);
            else showToast('انتخاب پروژه در دسترس نیست', 'warn');
          } catch (eP) {}
        }
      });
      /* ۱.۳.۷۱: افزودن ردیف فقط از «+» صفحهٔ اصلی */
      body.appendChild(addRowWrap);
      const hint = document.createElement('div');
      hint.className = 'tap-hint';
      hint.textContent = 'برای ویرایش فیلد پرشده دو بار روی آن بزنید';
      body.appendChild(hint);
      div.appendChild(body);
      return div;
    }

    function buildRowEl(secId, row, idx, paidLabel, unpaidLabel) {
      const tr = document.createElement('tr');
      if (!canEditRow(row) && (row.createdBy || '').trim()) tr.classList.add('row-readonly');

      const tdNum = document.createElement('td');
      tdNum.className = 'num col-num';
      const numWrap = document.createElement('div');
      numWrap.className = 'status-num';
      numWrap.textContent = toPersianDigits(idx + 1);
      tdNum.appendChild(numWrap);

      const tdDay = document.createElement('td');
      tdDay.className = 'col-day';
      const dayInp = document.createElement('input');
      dayInp.type = 'text';
      dayInp.className = 'cell day-input';
      dayInp.inputMode = 'numeric';
      dayInp.pattern = '[0-9]*';
      dayInp.maxLength = 2;
      dayInp.placeholder = '';
      dayInp.setAttribute('enterkeyhint', 'next');
      dayInp.value = row.day ? toPersianDigits(row.day) : '';
      /* ردیف «اختلاف موجودی» (تطبیق با پیامک): پس‌زمینهٔ زرد */
      if (row.reconGap) tr.classList.add('recon-gap');
      dayInp.oninput = () => {
        if (row.reconGap) row.reconGapDayEdited = true;
        if (!row.fromPlanId && !canEditRow(row)) return;
        if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) return;
        let v = toEnglishDigits(dayInp.value).replace(/[^0-9]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        let num = v ? parseInt(v, 10) : 0;
        const maxD = daysInMonth(currentYear, currentMonth);
        if (num > maxD) num = maxD;
        row.day = num ? String(num) : '';
        dayInp.value = row.day ? toPersianDigits(row.day) : '';
        if (!row.fromPlanId && (row.day || row.desc || row.amount)) stampRowOwner(row);
        scheduleSave();
      };
      dayInp.onblur = () => {
        scheduleSave();
        scheduleRowSort(secId, row, dayInp.closest('tr'));
      };
      dayInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          // برو به شرح
          const tr = dayInp.closest('tr');
          const next = tr && tr.querySelector('.desc-input');
          if (next && next.dataset.permaLocked === '1') {
            dayInp.blur();
          } else if (next) {
            next.classList.remove('is-empty', 'locked');
            next.classList.add('unlocked');
            if (next.tagName !== 'SELECT') next.readOnly = false;
            try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e2) {} }
          } else dayInp.blur();
        }
      };
      tdDay.appendChild(dayInp);
      const rowOwned = canEditRow(row);
      const OTHER_OWNER_MSG = OWNERSHIP_LOCK_MSG;
      const dayPermaLock = !rowOwned; /* ردیف اقساط قابل ویرایش؛ حذف جداگانه */
      setupLockable(dayInp, !!(row.day), dayPermaLock, OTHER_OWNER_MSG);

      const tdDesc = document.createElement('td');
      tdDesc.className = 'col-desc';
      const descInp = document.createElement('textarea');
      descInp.className = 'cell desc-input';
      descInp.rows = 1;
      descInp.value = row.desc || '';
      descInp.placeholder = '';
      descInp.setAttribute('enterkeyhint', 'next');
      descInp.title = row.desc || '';
      descInp.oninput = () => {
        if (!canEditRow(row)) return;
        row.desc = descInp.value;
        descInp.title = descInp.value;
        if (row.day || row.desc || row.amount) stampRowOwner(row);
        scheduleSave();
      };
      descInp.onblur = () => {
        scheduleRowSort(secId, row, descInp.closest('tr'));
      };
      descInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          const tr = descInp.closest('tr');
          const next = tr && tr.querySelector('.amount-input');
          if (next && next.dataset.permaLocked === '1') {
            descInp.blur();
          } else if (next) {
            next.classList.remove('is-empty', 'locked');
            next.classList.add('unlocked');
            if (next.tagName !== 'SELECT') next.readOnly = false;
            try { next.focus({ preventScroll: true }); } catch (err) { try { next.focus(); } catch (e2) {} }
          } else descInp.blur();
        }
      };
      tdDesc.appendChild(descInp);
      /* واریزی که به درآمد ثابت وصل شده (شرحش با نام آن فرق دارد): برچسب کوچک */
      try {
        if (row.fromRecurringId) {
          const _ri = (recurringIncomes || []).find(x => x && x.id === row.fromRecurringId);
          if (_ri && ((row.desc || '').trim() !== (_ri.name || '').trim())) {
            const tag = document.createElement('span');
            tag.className = 'rec-row-tag';
            tag.textContent = 'درآمد ثابت: ' + (_ri.name || '');
            tdDesc.style.position = 'relative';
            tdDesc.appendChild(tag);
          }
        }
        /* قسطی که پیش از شروع کار با نرم‌افزار پرداخت شده */
        if (isLockedPlanRow(row)) {
          tr.classList.add('plan-preapp', 'plan-locked');
          const tg = document.createElement('span');
          tg.className = 'rec-row-tag preapp-tag';
          tg.innerHTML = HK_LOCK_SVG + '<span>پرداخت قبلی</span>';
          tdDesc.style.position = 'relative';
          tdDesc.appendChild(tg);
        }
      } catch (eTag) {}
      /* ارتفاع ثابت — ردیف‌های آمده از قسط / غیرمالک قابل ویرایش نیستند */
      setupLockable(descInp, !!(row.desc && row.desc.trim()), !canEditRow(row), OTHER_OWNER_MSG);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'col-amount';
      const amtInp = document.createElement('input');
      amtInp.type = 'text';
      amtInp.className = 'cell amount-input';
      amtInp.inputMode = 'numeric';
      amtInp.pattern = '[0-9]*';
      amtInp.setAttribute('enterkeyhint', 'done');
      amtInp.value = row.amount ? formatNum(row.amount) : '';
      /* قسط قفل: مبلغ قسط فقط کم‌رنگ (مبلغ ردیف صفر است) */
      if (isLockedPlanRow(row)) { amtInp.value = row.planLockedAmt ? formatNum(row.planLockedAmt) : ''; amtInp.style.setProperty('color', 'var(--muted, #8e8e93)', 'important'); amtInp.style.setProperty('-webkit-text-fill-color', 'var(--muted, #8e8e93)', 'important'); }
      amtInp.placeholder = '';
      amtInp.oninput = () => {
        if (!canEditRow(row)) return;
        const cursorPos = amtInp.selectionStart || 0;
        const oldVal = amtInp.value;
        const digitsBefore = toEnglishDigits(oldVal.slice(0, cursorPos)).replace(/[^0-9]/g, '').length;
        const digitsOnly = toEnglishDigits(oldVal).replace(/[^0-9]/g, '');
        const n = digitsOnly ? parseInt(digitsOnly, 10) : 0;
        row.amount = n;
        if (row.day || row.desc || row.amount) stampRowOwner(row);
        if (!digitsOnly) amtInp.value = '';
        else {
          const formatted = formatNum(n);
          amtInp.value = formatted;
          let count = 0, newPos = formatted.length;
          for (let i = 0; i < formatted.length; i++) {
            if (/[0-9۰-۹]/.test(formatted[i])) {
              count++;
              if (count >= digitsBefore) { newPos = i + 1; break; }
            }
          }
          try { amtInp.setSelectionRange(newPos, newPos); } catch (e) {}
        }
        scheduleSummaryUpdate(); scheduleSave();
      };
      amtInp.onblur = () => {
        const n = parseAmount(amtInp.value);
        row.amount = n;
        amtInp.value = n ? formatNum(n) : '';
        scheduleSummaryUpdate();
        scheduleSave();
        scheduleRowSort(secId, row, amtInp.closest('tr'));
      };
      amtInp.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // برو به شرح اگر خالی است
          const tr = amtInp.closest('tr');
          const desc = tr && tr.querySelector('.desc-input');
          if (desc && desc.dataset.permaLocked === '1') {
            amtInp.blur();
          } else if (desc && !(row.desc && row.desc.trim())) {
            lockField(desc, false);
            desc.focus();
          } else {
            amtInp.blur();
          }
        }
      };
      tdAmt.appendChild(amtInp);
      setupLockable(amtInp, !!(row.amount), !canEditRow(row), OTHER_OWNER_MSG);

      const st0 = row.status || 'paid';
      function applyAmountStatusColor(v) {
        const paid = v === 'paid';
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const green = theme === 'light' ? '#17834a' : '#9ee858';
        const red = theme === 'light' ? '#dc2626' : '#bc2402';
        const c = paid ? green : red;
        amtInp.style.setProperty('color', c, 'important');
        amtInp.style.setProperty('-webkit-text-fill-color', c, 'important');
        amtInp.style.setProperty('caret-color', c, 'important');
        amtInp.style.setProperty('font-weight', '800', 'important');
        amtInp.classList.toggle('status-paid', paid);
        amtInp.classList.toggle('status-unpaid', !paid);
      }
      applyAmountStatusColor(st0);
      function applyStatusVisual(v) {
        row.status = v;
        applyAmountStatusColor(v);
      }
      /** اگر ردیف از قسط آمده و پرداخت شد → در اقساط هم پرداخت‌شده حساب شود */
      function syncPlanFromExpenseStatus(newStatus) {
        if (!row.fromPlanId) return;
        const plan = (plans || []).find(p => p.id === row.fromPlanId);
        if (!plan) return;
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        if (!count) return;
        let idx = parseInt(row.fromPlanIndex, 10);
        if (isNaN(idx) || idx < 0) idx = 0;
        let paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
        if (newStatus === 'paid') {
          const need = idx + 1;
          if (paid < need) {
            plan.paidCount = Math.min(count, need);
          }
          /* اگر ردیف معوق/حمل‌شده باشد، ماه سررسید را دست نزن */
          if (row.planCarried || (row.desc && String(row.desc).indexOf('معوق') >= 0)) {
            setPlanIndexPaidLate(plan, idx, true);
          } else {
            setPlanIndexPaidLate(plan, idx, false);
          }
          try {
            if (typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
            else syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
          } catch (eSync) {
            syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
          }
          updateInstallSummary();
          checkInstallReminders();
          if (currentTab === 'install') renderPlans();
          showToast('قسط در بخش اقساط هم "پرداخت شده" شد');
        } else if (newStatus === 'unpaid') {
          // برگشت به پرداخت‌نشده: اگر آخرین پرداخت‌شده همین قسط بود، یکی کم کن
          if (paid === idx + 1) {
            plan.paidCount = Math.max(0, paid - 1);
            try {
              if (typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
              else syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            } catch (eSync2) {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            }
            updateInstallSummary();
            checkInstallReminders();
            if (currentTab === 'install') renderPlans();
            showToast('قسط در بخش اقساط هم "پرداخت نشده" شد');
          }
        }
      }

    function snapshotRect(el) {
      try {
        if (!el || !el.getBoundingClientRect) return null;
        const r = el.getBoundingClientRect();
        if (!r || r.width < 2 || r.height < 2) return null;
        return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      } catch (err) { return null; }
    }
    function positionStatusMenu(menu, anchorEl, e, savedRect) {
      // اولویت: 1) element زنده متصل  2) snapshot لحظه کلیک  3) fallback
      let r = null;
      try {
        if (anchorEl && anchorEl.isConnected && anchorEl.getBoundingClientRect) {
          const live = anchorEl.getBoundingClientRect();
          if (live && live.width >= 2 && live.height >= 2) {
            r = { top: live.top, left: live.left, right: live.right, bottom: live.bottom, width: live.width, height: live.height };
          }
        }
      } catch (err) {}
      if (!r && savedRect && savedRect.width >= 2) r = savedRect;
      if (!r) {
        try {
          if (anchorEl && anchorEl.getBoundingClientRect) {
            const live2 = anchorEl.getBoundingClientRect();
            if (live2 && live2.width >= 2) r = live2;
          }
        } catch (err2) {}
      }
      // اندازه منو بعد از قرار گرفتن در DOM
      let menuW = 160, menuH = 100;
      try {
        const mw = menu.offsetWidth || menu.getBoundingClientRect().width;
        const mh = menu.offsetHeight || menu.getBoundingClientRect().height;
        if (mw > 10) menuW = mw;
        if (mh > 10) menuH = mh;
      } catch (err3) {}
      let top = 80, left = 16;
      if (r && r.width >= 2) {
        // پائین سمت راست همان سلول مبلغ
        top = r.bottom + 4;
        left = r.right - menuW;
        if (top + menuH > window.innerHeight - 8) {
          top = Math.max(8, r.top - menuH - 4);
        }
      }
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
      if (left < 8) left = 8;
      if (top < 8) top = 8;
      // همیشه fixed روی body — مختصات viewport
      if (menu.parentNode !== document.body) {
        try { document.body.appendChild(menu); } catch (err4) {}
      }
      menu.style.setProperty('position', 'fixed', 'important');
      menu.style.setProperty('top', Math.round(top) + 'px', 'important');
      menu.style.setProperty('left', Math.round(left) + 'px', 'important');
      menu.style.setProperty('right', 'auto', 'important');
      menu.style.setProperty('bottom', 'auto', 'important');
      menu.style.setProperty('z-index', '520', 'important');
      menu.style.setProperty('margin', '0', 'important');
      menu.style.setProperty('transform', 'none', 'important');
    }
      function openStatusMenu(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!canEditRow(row)) { showToast(OWNERSHIP_LOCK_MSG); return; }
        document.querySelectorAll('.status-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'status-menu';
        menu.style.cssText = 'position:fixed;z-index:520;min-width:150px;box-sizing:border-box;margin:0;transform:none;';
        [
          { v: 'paid', label: paidLabel },
          { v: 'unpaid', label: unpaidLabel }
        ].forEach(opt => {
          const it = document.createElement('div');
          it.className = 'status-menu-item ' + opt.v;
          it.textContent = opt.label;
          it.onclick = (ev) => {
            ev.stopPropagation();
            if (!canEditRow(row)) { menu.remove(); showToast(OWNERSHIP_LOCK_MSG); return; }
            applyStatusVisual(opt.v);
            menu.remove();
            syncPlanFromExpenseStatus(opt.v);
            scheduleSummaryUpdate(); scheduleSave();
          };
          menu.appendChild(it);
        });
        document.body.appendChild(menu);
        const _sr = snapshotRect(tdAmt);
        positionStatusMenu(menu, tdAmt, null, _sr);
        requestAnimationFrame(() => { try { positionStatusMenu(menu, tdAmt, null, _sr); } catch (e3) {} });
        const closer = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== amtInp && ev.target !== tdAmt) {
            menu.remove();
            document.removeEventListener('click', closer);
            document.removeEventListener('touchstart', closer);
          }
        };
        setTimeout(() => {
          document.addEventListener('click', closer);
          document.addEventListener('touchstart', closer, { passive: true });
        }, 10);
      }
      // یک‌بار کلیک روی سلول مبلغ (وقتی قفل/پر است) → منوی وضعیت
      // دوبار کلیک → ویرایش مبلغ (setupLockable)
      // سلول خالی → تایپ عادی بدون منو
      tdAmt.style.cursor = 'pointer';
      tdAmt.title = 'برای تغییر وضعیت یک‌بار بزنید';
      const isAmtEditing = () => (
        document.activeElement === amtInp &&
        !amtInp.readOnly &&
        amtInp.classList.contains('unlocked')
      );
      const shouldOpenStatus = () => {
        if (isAmtEditing()) return false;
        // خالی: اجازه تایپ
        if (amtInp.classList.contains('is-empty') && !row.amount) return false;
        return true;
      };
      tdAmt.addEventListener('pointerup', (e) => {
        if (e.button != null && e.button !== 0) return;
        if (!shouldOpenStatus()) return;
        if (e.detail && e.detail >= 2) return;
        const token = {};
        tdAmt._statusToken = token;
        setTimeout(() => {
          if (tdAmt._statusToken !== token) return;
          if (!shouldOpenStatus()) return;
          openStatusMenu(e);
        }, 250);
      });
      tdAmt.addEventListener('dblclick', () => { tdAmt._statusToken = null; }, true);
      amtInp.addEventListener('dblclick', () => { tdAmt._statusToken = null; }, true);

      const tdAcc = document.createElement('td');
      tdAcc.className = 'col-acc';
      const accOptions = [{ value: '', label: '' }].concat(selectedAccountLabels().map(n => ({ value: n, label: n })));
      const accSel = createDarkSelect({
        options: accOptions,
        value: row.account || '',
        onChange: (v) => {
          if (!row.fromPlanId && !canEditRow(row)) return;
          if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) return;
          row.account = v;
          if (accSel._btn) {
            accSel._btn.title = v || 'انتخاب حساب';
            if (v) accSel._btn.classList.remove('is-empty-acc');
            else accSel._btn.classList.add('is-empty-acc');
          }
          syncAccMissing();
          if (!row.fromPlanId && (row.day || row.desc || row.amount || row.account)) stampRowOwner(row);
          scheduleSave();
        }
      });
      if (accSel._list) accSel._list.classList.add('bank-acc-list');
      /* حسابِ حذف‌شده: نامش روی همین ردیف دیده شود ولی در فهرست انتخاب نیست */
      try { if (accSel._btn && (row.account || '').trim() && selectedAccountLabels().indexOf(row.account.trim()) < 0) { accSel._btn.textContent = row.account; accSel._btn.classList.add('acc-dead'); } } catch (eDead) {}
      if (accSel._btn) {
        accSel._btn.title = row.account || 'انتخاب حساب';
        if (!(row.account || '').trim()) accSel._btn.classList.add('is-empty-acc');
        accSel._btn.addEventListener('click', function (e) {
          if (!row.fromPlanId && !canEditRow(row)) {
            e.preventDefault(); e.stopImmediatePropagation(); showToast(OTHER_OWNER_MSG); return;
          }
          if (row.fromPlanId && !canEditRow(row) && (row.createdBy || '').trim()) {
            e.preventDefault(); e.stopImmediatePropagation(); showToast(OTHER_OWNER_MSG); return;
          }
        }, true);
      }
      tdAcc.appendChild(accSel);
      /* مبلغ ثبت شده ولی حساب انتخاب نشده → قاب زرد دور منوی حساب */
      function syncAccMissing() {
        try { if (accSel._btn) accSel._btn.classList.toggle('acc-missing', (Number(row.amount) || 0) > 0 && !(row.account || '').trim()); } catch (eAm) {}
      }
      syncAccMissing();
      try { amtInp.addEventListener('blur', function () { setTimeout(syncAccMissing, 60); }); } catch (eAb) {}

      const tdAct = document.createElement('td');
      tdAct.className = 'actions-cell col-actions';
      if (canEditRow(row) && !row.fromPlanId) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-del-row';
        btn.textContent = '×';
        btn.onclick = () => {
          if (row.fromPlanId) { showToast('برای حذف این ردیف از بخش اقساط اقدام کنید'); return; }
          if (!canEditRow(row)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
          deleteRow(secId, idx);
        };
        tdAct.appendChild(btn);
      }

      tr.appendChild(tdNum);
      tr.appendChild(tdDay);
      tr.appendChild(tdDesc);
      tr.appendChild(tdAmt);
      tr.appendChild(tdAcc);
      tr.appendChild(tdAct);
      /* Highlight پروژه — فقط پس‌زمینه ماژیکی؛ رنگ مبلغ حفظ می‌شود */
      try {
        var fcRow = rowFinancialContext(row);
        if (fcRow && (fcRow.accountType === 'project' || fcRow.classification === 'third_party') &&
            fcRow.subjectId && fcRow.subjectId !== 'personal') {
          var subH = getSubjectById(fcRow.subjectId);
          var colorId = (subH && subH.highlightColor) || (row.financialContext && row.financialContext.highlightColor) || '';
          var metaH = getProjectHighlightMeta(colorId);
          if (typeof applyProjectRowMarker === 'function') applyProjectRowMarker(tr, metaH.accent || '#d000ff');
          else {
            tr.classList.add('project-row-hl');
            tr.style.setProperty('--proj-accent', metaH.accent || '#d000ff');
          }
          tr.dataset.projectId = fcRow.subjectId;
        }
      } catch (eHl) {}
      return tr;
    }

