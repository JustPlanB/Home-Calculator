    function sectionElId(secId, tab) {
      const t = tab || currentTab;
      const prefix = (t === 'income' || t === 'expense') ? t : 'x';
      return 'sec-' + prefix + '-' + secId;
    }

    function focusNewRowDay(secId, countBack) {
      const sectionEl = document.getElementById(sectionElId(secId));
      if (!sectionEl) return false;
      sectionEl.classList.remove('collapsed');
      const rows = sectionEl.querySelectorAll('tbody tr');
      const idx = Math.max(0, rows.length - Math.max(1, countBack || 1));
      const target = rows[idx];
      if (!target) return false;
      const dayInp = target.querySelector('.day-input');
      if (!dayInp) return false;
      dayInp.classList.remove('is-empty', 'locked');
      dayInp.classList.add('unlocked');
      if (dayInp.tagName !== 'SELECT') dayInp.readOnly = false;
      dayInp.dataset.locked = '0';
      try { dayInp.focus({ preventScroll: true }); } catch (e) {
        try { dayInp.focus({ preventScroll: true }); } catch (e2) {}
      }
      // صفحه جابه‌جا نشود
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 100);
      setTimeout(() => { try { dayInp.focus({ preventScroll: true }); } catch (e) {} }, 250);
      return true;
    }


    function closeProjectRowPicker() {
      var ov = document.getElementById('projectRowPickerOverlay');
      if (ov) ov.remove();
    }
    
    /** دکمه +: بیضی بنفش ثابت. TAP ساده روی + = ردیف عادی | اسلاید دایره تا انتهای بیضی = ردیف پروژه.
     * هر اسلایدی (حتی اگر برگردد) هرگز ردیف عادی نمی‌سازد. */
    function bindVerticalProjectAdd(wrap, opts) {
      opts = opts || {};
      if (!wrap || wrap._vpaBound) return;
      var fab = wrap.querySelector('.row-add-fab');
      if (!fab) return;
      wrap._vpaBound = true;
      var TAP_SLOP = 10;     /* بیشتر از این جابه‌جایی = دیگر «ضربه» نیست */
      var INSET = 2;         /* فاصلهٔ دایره از لبهٔ بیضی */
      var active = false, dragging = false, moved = false;
      var startX = 0, startY = 0, dx = 0, pid = null;

      function travel() {
        var w = wrap.clientWidth || 118;
        var fw = fab.offsetWidth || 38;
        return Math.max(30, w - INSET * 2 - fw);
      }
      function place(x, animate) {
        fab.style.transition = animate
          ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease, background 0.15s ease'
          : 'none';
        fab.style.transform = 'translateX(' + x + 'px)';
      }
      function resetVisual(animate) {
        try {
          place(0, !!animate);
          wrap.classList.remove('is-dragging', 'is-armed');
        } catch (eR) {}
      }

      function onDown(e) {
        if (e.button != null && e.button !== 0) return;
        active = true;
        dragging = false;
        moved = false;
        dx = 0;
        startX = e.clientX;
        startY = e.clientY;
        pid = (e.pointerId != null) ? e.pointerId : null;
        try { fab.style.transition = 'none'; } catch (eT) {}
        try {
          if (fab.setPointerCapture && pid != null) fab.setPointerCapture(pid);
        } catch (eC) {}
        try { e.preventDefault(); e.stopPropagation(); } catch (eP) {}
      }

      function onMove(e) {
        if (!active) return;
        if (pid != null && e.pointerId != null && e.pointerId !== pid) return;
        var ddx = e.clientX - startX;   /* راست مثبت */
        var ddy = e.clientY - startY;
        if (!moved && Math.sqrt(ddx * ddx + ddy * ddy) > TAP_SLOP) moved = true;
        if (!dragging && ddx > 5 && ddx >= Math.abs(ddy) * 0.85) {
          dragging = true;
          moved = true;
          wrap.classList.add('is-dragging');
        }
        if (dragging) {
          try { e.preventDefault(); e.stopPropagation(); } catch (eP) {}
          var T = travel();
          dx = Math.max(0, Math.min(ddx, T));
          place(dx, false);
          if (dx >= T - 4) {
            if (!wrap.classList.contains('is-armed')) {
              wrap.classList.add('is-armed'); /* ۱.۳.۹۹: کشیدن افقی بی ویبره */
            }
          } else {
            wrap.classList.remove('is-armed');
          }
        }
      }

      function finish(e) {
        if (!active) return;
        if (pid != null && e && e.pointerId != null && e.pointerId !== pid) return;
        active = false;
        try {
          if (fab.releasePointerCapture && pid != null) fab.releasePointerCapture(pid);
        } catch (eR) {}
        pid = null;
        var wasDrag = dragging;
        var wasMoved = moved;
        var armed = wrap.classList.contains('is-armed');
        dragging = false;
        moved = false;

        if (wasDrag) {
          resetVisual(true);
          /* فقط اگر تا انتها رسیده و همان‌جا رها شده → ردیف پروژه. برگشتن = هیچ ردیفی */
          if (armed && typeof opts.onProject === 'function') {
            try { opts.onProject(); } catch (eP) {}
          }
          return;
        }
        resetVisual(false);
        if (wasMoved) return;   /* حرکت غیرافقی/بیش از حد → نه ضربه است نه اسلاید */
        if (typeof opts.onTap === 'function') {
          try { opts.onTap(); } catch (eT) {}
        }
      }

      fab.addEventListener('pointerdown', onDown);
      fab.addEventListener('pointermove', onMove);
      fab.addEventListener('pointerup', finish);
      fab.addEventListener('pointercancel', function() {
        active = false;
        pid = null;
        dragging = false;
        moved = false;
        dx = 0;
        resetVisual(true);
      });
      fab.addEventListener('click', function(e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (eC) {}
      }, true);
    }
    try { window.bindVerticalProjectAdd = bindVerticalProjectAdd; } catch (eW) {}

function openProjectRowPicker(secId) {
      closeProjectRowPicker();
      var projects = [];
      try {
        projects = (typeof loadFinancialSubjects === 'function' ? loadFinancialSubjects() : []).filter(function(s) {
          return s && s.id && s.id !== 'personal';
        });
      } catch (e) { projects = []; }
      if (!projects.length) {
        try { showToast('ابتدا از منوی پروژه‌ها یک پروژه بسازید', 'warn'); } catch (eT) {}
        return;
      }
      var ov = document.createElement('div');
      ov.id = 'projectRowPickerOverlay';
      ov.className = 'proj-row-picker-overlay';
      ov.innerHTML = '<div class="proj-row-picker-panel" role="dialog" aria-label="انتخاب پروژه">' +
        '<div class="proj-row-picker-title">انتخاب پروژه</div>' +
        '<div class="proj-row-picker-list" id="projRowPickerList"></div>' +
        '<button type="button" class="proj-row-picker-cancel" id="projRowPickerCancel">انصراف</button>' +
        '</div>';
      document.body.appendChild(ov);
      var list = ov.querySelector('#projRowPickerList');
      projects.forEach(function(s) {
        var meta = (typeof getProjectHighlightMeta === 'function')
          ? getProjectHighlightMeta(s.highlightColor) : null;
        var accent = (meta && meta.accent) || '#d000ff';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'proj-row-picker-item';
        btn.style.setProperty('--proj-accent', accent);
        btn.innerHTML = '<span>' + escapeHtml(s.name || 'پروژه') + '</span>';
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var fc = defaultFinancialContext();
          fc.classification = 'third_party';
          fc.accountType = 'project';
          fc.subjectId = s.id;
          fc.subjectName = s.name || '';
          fc.ownerName = fc.subjectName;
          var tab = (typeof currentTab !== 'undefined') ? currentTab : 'expense';
          if (tab === 'income') {
            fc.fundingSource = 'subject';
            fc.projectAmount = 0;
            fc.personalAdvanceAmount = 0;
          } else {
            fc.fundingSource = 'subject';
            fc.projectAmount = 0;
            fc.personalAdvanceAmount = 0;
          }
          closeProjectRowPicker();
          addRow(secId, 1, { financialContext: fc });
          /* بعد از ثبت ردیف پروژه، سوئیچ روی پروژه می‌ماند تا کاربر برگرداند */
        });
        list.appendChild(btn);
      });
      ov.querySelector('#projRowPickerCancel').onclick = function(e) {
        e.preventDefault();
        closeProjectRowPicker();
      };
      ov.addEventListener('click', function(e) {
        if (e.target === ov) closeProjectRowPicker();
      });
      requestAnimationFrame(function() { ov.classList.add('open'); });
    }
    try { window.openProjectRowPicker = openProjectRowPicker; window.closeProjectRowPicker = closeProjectRowPicker; } catch (eEx) {}

    function bindLongPress(el, onLong, onShort, ms) {
      if (!el) return;
      ms = (typeof ms === 'number' && ms > 0) ? ms : 1000;
      var timer = null;
      var longFired = false;
      var tracking = false;
      var startX = 0, startY = 0;
      var ptrId = null;
      function clearTimer() {
        if (timer) { clearTimeout(timer); timer = null; }
      }
      function fireLong(e) {
        if (longFired) return;
        longFired = true;
        tracking = false;
        clearTimer();
        try { window.appHaptic(20); } catch (eV) {}
        try { if (typeof onLong === 'function') onLong(e); } catch (eL) {
          try { console.warn('longpress', eL); } catch (e2) {}
          try { showToast('خطا در باز کردن پروژه‌ها', 'warn'); } catch (e3) {}
        }
      }
      function arm(e, x, y, id) {
        longFired = false;
        tracking = true;
        startX = x || 0;
        startY = y || 0;
        ptrId = (id != null) ? id : null;
        clearTimer();
        timer = setTimeout(function() {
          if (!tracking) return;
          fireLong(e);
        }, ms);
      }
      function onMove(x, y) {
        if (!tracking || longFired) return;
        var dx = (x || 0) - startX;
        var dy = (y || 0) - startY;
        /* آستانه بالاتر تا لرزش انگشت قطع نکند (~36px) */
        if (dx * dx + dy * dy > 1300) {
          tracking = false;
          clearTimer();
        }
      }
      function release(e) {
        var wasLong = longFired;
        var wasTracking = tracking;
        tracking = false;
        clearTimer();
        ptrId = null;
        if (!wasLong && wasTracking && typeof onShort === 'function') {
          try { onShort(e); } catch (eS) {}
        }
        longFired = false;
      }
      try {
        el.style.touchAction = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';
        el.style.webkitTouchCallout = 'none';
      } catch (eSt) {}
      el.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); });

      /* Pointer Events — مسیر اصلی */
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', function(e) {
          if (e.button != null && e.button !== 0) return;
          e.stopPropagation();
          try { e.preventDefault(); } catch (ePd) {}
          try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (eC) {}
          arm(e, e.clientX, e.clientY, e.pointerId);
        });
        el.addEventListener('pointermove', function(e) {
          if (ptrId != null && e.pointerId !== ptrId) return;
          onMove(e.clientX, e.clientY);
        });
        el.addEventListener('pointerup', function(e) {
          if (ptrId != null && e.pointerId !== ptrId) return;
          e.stopPropagation();
          release(e);
        });
        el.addEventListener('pointercancel', function(e) {
          /* نزدیک به آستانه بود → باز هم long در نظر نگیر؛ فقط رها کن بدون short اگر زمان کم بوده */
          tracking = false;
          clearTimer();
          longFired = false;
          ptrId = null;
        });
      } else {
        el.addEventListener('touchstart', function(e) {
          e.stopPropagation();
          var t = e.touches && e.touches[0];
          if (!t) return;
          arm(e, t.clientX, t.clientY, null);
        }, { passive: true });
        el.addEventListener('touchmove', function(e) {
          var t = e.touches && e.touches[0];
          if (!t) return;
          onMove(t.clientX, t.clientY);
        }, { passive: true });
        el.addEventListener('touchend', function(e) {
          e.stopPropagation();
          release(e);
        }, { passive: true });
        el.addEventListener('touchcancel', function() {
          tracking = false;
          clearTimer();
          longFired = false;
        }, { passive: true });
        el.addEventListener('mousedown', function(e) {
          if (e.button !== 0) return;
          e.stopPropagation();
          arm(e, e.clientX, e.clientY, null);
        });
        el.addEventListener('mousemove', function(e) { onMove(e.clientX, e.clientY); });
        el.addEventListener('mouseup', function(e) {
          e.stopPropagation();
          release(e);
        });
        el.addEventListener('mouseleave', function() {
          tracking = false;
          clearTimer();
        });
      }
    }


    function addRow(secId, count, opts) {
      closeRemindBarIfOpen();
      const sec = findSection(secId);
      if (!sec) return;
      opts = opts || {};
      const n = Math.max(1, Math.min(5, parseInt(count, 10) || 1));
      for (let i = 0; i < n; i++) {
        var row = emptyRow();
        if (opts.financialContext && typeof opts.financialContext === 'object') {
          try {
            row.financialContext = JSON.parse(JSON.stringify(opts.financialContext));
          } catch (eFc) {
            row.financialContext = opts.financialContext;
          }
        }
        sec.rows.push(row);
      }
      sec.collapsed = false;
      // موقعیت اسکرول فعلی را از DOM بخوان
      try {
        var liveScroll = document.querySelector('.section-rows-scroll');
        if (liveScroll && typeof liveScroll.scrollTop === 'number') {
          var st = liveScroll.scrollTop;
          sec._rowScrollTop = st;
          window._secRowScroll = window._secRowScroll || {};
          if (sec.id != null) window._secRowScroll[sec.id] = st;
          try {
            window._detailRowScroll = window._detailRowScroll || {};
            var _dt = (typeof _detailContext !== 'undefined' && _detailContext) ? _detailContext : null;
            if (_dt && _dt.title) {
              var _tb = (currentTab === 'income' || currentTab === 'expense') ? currentTab : (_dt.kind || 'income');
              window._detailRowScroll[String(_tb) + '|' + String(_dt.title)] = st;
            }
          } catch (eK) {}
        } else if (typeof sec._rowScrollTop !== 'number') {
          sec._rowScrollTop = (window._secRowScroll && sec.id != null) ? (window._secRowScroll[sec.id] || 0) : 0;
        }
      } catch (e) {}
      // مثل قبل: رندر کامل تا ردیف حتماً دیده شود (هر دو تب)
      window._pdNewRowAt = Date.now();
      renderAll();
      scheduleSave();
      setTimeout(() => focusNewRowDay(secId, n), 60);
      setTimeout(() => focusNewRowDay(secId, n), 180);
      setTimeout(() => focusNewRowDay(secId, n), 350);
    }
    function deleteRow(secId, idx) {
      const sec0 = findSection(secId);
      const row0 = sec0 && sec0.rows && sec0.rows[idx];
      if (row0 && !canEditRow(row0)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
      askConfirm('این ردیف به سطل زباله منتقل شود؟', () => {
        const sec = findSection(secId);
        if (!sec) return;
        const row = sec.rows[idx];
        if (row) {
          try {
            pushToTrash('row', (row.desc || sec.title || 'ردیف') + (row.amount ? ' · ' + formatNum(row.amount) : ''), {
              tab: currentTab,
              periodKey: periodKey(currentYear, currentMonth),
              sectionId: sec.id || secId,
              sectionTitle: sec.title || '',
              sourceLabel: (currentTab === 'income' ? 'بخش درآمد' : 'بخش مخارج') + (sec.title ? (' / ' + sec.title) : ''),
              row: JSON.parse(JSON.stringify(row))
            });
          } catch (e) {}
        }
        if (row && row.id && sharedAccountId) {
          row.deletedAt = Date.now();
          row.updatedAt = Date.now();
          try {
            enqueueSync('delete_record', {
              id: row.id,
              kind: (currentTab === 'income' ? 'income_row' : 'expense_row'),
              period_key: periodKey(currentYear, currentMonth),
              section_id: sec.id || secId,
              section_title: sec.title || '',
              created_by: row.createdBy || currentUserId(),
              deleted_at: new Date(row.deletedAt).toISOString(),
              payload: row
            });
          } catch (e) {}
          sec.rows.splice(idx, 1);
          if (!sec.rows.length) sec.rows.push(emptyRow());
        } else if (sec.rows.length <= 1) {
          sec.rows[0] = emptyRow();
        } else {
          sec.rows.splice(idx, 1);
        }
        // پنجره ردیف را حفظ کن تا صفحه نپرد
        const sy = window.scrollY || window.pageYOffset || 0;
        // موقعیت اسکرول داخل بخش حفظ می‌شود (sec._rowScrollTop)
        renderAll();
        try { window.scrollTo(0, sy); } catch (e) {}
        scheduleSave();
        showToast('به سطل زباله منتقل شد');
      });
    }
    function nextNewSectionTitle() {
      const sections = periodData[currentTab].sections || [];
      const existing = new Set(sections.map(s => (s.title || '').trim()));
      let n = 1;
      while (true) {
        const fa = 'بخش جدید ' + toPersianDigits(n);
        const en = 'بخش جدید ' + n;
        if (!existing.has(fa) && !existing.has(en) && !existing.has('بخش جدید')) {
          return fa;
        }
        n++;
        if (n > 200) return 'بخش جدید ' + toPersianDigits(Date.now() % 10000);
      }
    }
    function ensureYearMonthsInArchive(year) {
      const y = year || currentYear;
      if (!archive || typeof archive !== 'object') archive = {};
      for (let m = 1; m <= 12; m++) {
        const k = periodKey(y, m);
        if (!archive[k]) {
          archive[k] = emptyPeriodData();
        }
      }
    }
    function propagateSectionToAllMonths(tab, title) {
      const t = (title || '').trim();
      if (!t) return;
      if (tab !== 'income' && tab !== 'expense') return;
      persistCurrent();
      // برای هر ۱۲ ماه سال جاری (و ماه‌های موجود در آرشیو)
      ensureYearMonthsInArchive(currentYear);
      const keys = new Set(Object.keys(archive || {}));
      for (let m = 1; m <= 12; m++) keys.add(periodKey(currentYear, m));
      keys.forEach(k => {
        if (k === periodKey(currentYear, currentMonth)) {
          // ماه جاری از periodData است؛ فقط مطمئن شو عنوان هست
          return;
        }
        let pd = archive[k];
        if (!pd) {
          pd = emptyPeriodData();
          archive[k] = pd;
        }
        if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
        if (!pd[tab].sections) pd[tab].sections = [];
        const exists = pd[tab].sections.some(s => (s.title || '').trim() === t);
        if (exists) return;
        const nid = pd[tab].nextId || (pd[tab].sections.length + 1);
        pd[tab].sections.push({
          id: 's' + nid + '_' + Date.now().toString(36),
          title: t,
          color: tabAccentColor(tab),
          collapsed: true,
          rows: [emptyRow()]
        });
        pd[tab].nextId = nid + 1;
      });
      saveArchive();
    }
    function showNameSheetBackdrop() {
      lockBodyScroll();
      let bd = document.getElementById('nameSheetBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'nameSheetBackdrop';
        bd.className = 'menu-backdrop open';
        bd.style.background = 'rgba(0,0,0,0.72)';
        document.body.appendChild(bd);
      } else {
        bd.classList.add('open');
        bd.style.background = 'rgba(0,0,0,0.72)';
      }
      return bd;
    }
    function hideNameSheetBackdrop() {
      const bd = document.getElementById('nameSheetBackdrop');
      if (bd) bd.remove();
      unlockBodyScroll();
    }
    let pendingRenameSecId = null;
    function openSectionNameSheet(sec, onDone) {
      closeRemindBarIfOpen();
      let sheet = document.getElementById('sectionNameSheet');
      if (sheet) sheet.remove();
      sheet = document.createElement('div');
      sheet.id = 'sectionNameSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;box-shadow:0 12px 32px var(--shadow);';
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + Math.max(80, Math.floor((vv ? vv.height : window.innerHeight) * 0.22));
      sheet.style.top = top + 'px';

      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;text-align:center;';
      lab.textContent = 'نام کاربر';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = (sec.title || '').trim();
      inp.placeholder = 'نام کاربر را وارد کنید';
      inp.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:1rem;margin-bottom:10px;text-align:center;box-sizing:border-box;';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.textContent = 'تأیید';
      ok.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:bold;cursor:pointer;';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'انصراف';
      cancel.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;cursor:pointer;';

      const clearEditIcons = () => {
        try {
          document.querySelectorAll('.btn-edit-title.is-editing').forEach(b => {
            b.classList.remove('is-editing');
          });
        } catch (e) {}
      };
      const wasNew = !((sec.title || '').trim());
      const originalTitle = (sec.title || '').trim();
      const discardNew = () => {
        if (!wasNew) return;
        const tab = currentTab;
        if (tab !== 'income' && tab !== 'expense') return;
        const list = periodData[tab].sections || [];
        const i = list.findIndex(s => s.id === sec.id);
        if (i < 0) return;
        // فقط اگر هنوز اسم واقعی نگرفته
        if ((list[i].title || '').trim() && (list[i].title || '').trim() === originalTitle && originalTitle) return;
        if ((list[i].title || '').trim() && !wasNew) return;
        list.splice(i, 1);
        persistCurrent();
        scheduleSave();
        renderAll();
      };
      const close = (fromCancel) => {
        try { sheet.remove(); } catch (e) {}
        hideNameSheetBackdrop();
        document.removeEventListener('mousedown', outside, true);
        clearEditIcons();
        if (fromCancel) discardNew();
      };
      const save = () => {
        const v = (inp.value || '').trim();
        if (!v) { showToast('نام کاربر را وارد کنید'); return; }
        const tab = currentTab;
        if (tab === 'income' || tab === 'expense') {
          const dup = (periodData[tab].sections || []).some(
            s => s.id !== sec.id && (s.title || '').trim() === v
          );
          if (dup) { showToast('اسم تکراری است'); return; }
        }
        sec.title = v;
        if (typeof onDone === 'function') onDone(v);
        persistCurrent();
        scheduleSave();
        close(false);
        renderAll();
      };
      ok.onclick = save;
      cancel.onclick = () => close(true);
      const outside = (e) => {
        if (!sheet.contains(e.target)) close(true);
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); close(true); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(lab);
      sheet.appendChild(inp);
      sheet.appendChild(actions);
      showNameSheetBackdrop();
      document.body.appendChild(sheet);
      setTimeout(() => {
        try {
          inp.focus({ preventScroll: true });
          if (inp.value) caretToEnd(inp);
        } catch (e) {
          try { inp.focus(); if (inp.value) caretToEnd(inp); } catch (e2) {}
        }
      }, 50);
    }

    function addSection() {
      closeRemindBarIfOpen();
      const sections = periodData[currentTab].sections;
      const color = tabAccentColor(currentTab);
      const nid = periodData[currentTab].nextId;
      const newId = 's' + nid;
      const sec = { id: newId, title: '', color, collapsed: true, rows: [emptyRow()] };
      stampRowOwner(sec);
      sections.push(sec);
      periodData[currentTab].nextId = nid + 1;
      pendingRenameSecId = null;
      persistCurrent();
      renderAll();
      scheduleSave();
      setTimeout(() => {
        openSectionNameSheet(sec, (v) => {
          propagateSectionToAllMonths(currentTab, v);
        });
      }, 60);
    }
    function askDeleteSection(secId) {
      askConfirm('این بخش به سطل زباله منتقل شود؟', () => {
        const sec = (periodData[currentTab].sections || []).find(s => s.id === secId);
        if (sec) {
          try {
            pushToTrash('section', sec.title || 'بخش', {
              tab: currentTab,
              periodKey: periodKey(currentYear, currentMonth),
              sourceLabel: (currentTab === 'income' ? 'بخش درآمد' : 'بخش مخارج') + (sec.title ? (' / ' + sec.title) : ''),
              section: JSON.parse(JSON.stringify(sec))
            });
          } catch (e) {}
        }
        periodData[currentTab].sections = periodData[currentTab].sections.filter(s => s.id !== secId);
        renderAll();
        scheduleSave();
        showToast('به سطل زباله منتقل شد');
      });
    }
    function cycleColor(secId) {
      const sec = findSection(secId);
      const idx = COLORS.indexOf(sec.color);
      sec.color = COLORS[(idx + 1) % COLORS.length];
      renderAll();
      scheduleSave();
    }

    function updateSummary() {
      if (currentTab === 'income' || currentTab === 'expense') updateSummaryForTab(currentTab);
    }
    function updateSummaryForTab(tab) {
      if (tab !== 'income' && tab !== 'expense') return;
      const tbody = document.getElementById('summary-body-' + tab);
      if (!tbody) return;
      tbody.innerHTML = '';
      let gPaid = 0, gUnpaid = 0;
      (periodData[tab].sections || []).forEach(sec => {
        let paid = 0, unpaid = 0;
        (sec.rows || []).forEach(r => {
          if (r && r.p2p) return;
          const a = Number(r.amount) || 0;
          if (r.status === 'paid') paid += a; else unpaid += a;
        });
        gPaid += paid; gUnpaid += unpaid;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="sec-name">${escapeHtml(sec.title) || '—'}</td>
          <td class="val paid-cell">${formatNum(paid)}</td>
          <td class="val unpaid-cell">${formatNum(unpaid)}</td>
          <td class="val total-cell">${formatNum(paid + unpaid)}</td>`;
        tbody.appendChild(tr);
      });
      const gp = document.getElementById('grand-paid-' + tab);
      const gu = document.getElementById('grand-unpaid-' + tab);
      const gt = document.getElementById('grand-total-' + tab);
      if (gp) gp.textContent = formatNum(gPaid);
      if (gu) gu.textContent = formatNum(gUnpaid);
      if (gt) gt.textContent = formatNum(gPaid + gUnpaid);
    }

    function updateBalance() {
      if (currentTab !== 'income') return;
      const expMap = {}, incMap = {}, expOrder = [], incOrder = [];
      (periodData.expense.sections || []).forEach(sec => {
        const title = (sec.title || '').trim() || '—';
        expMap[title] = (expMap[title] || 0) + sectionTotal(sec);
        if (!expOrder.includes(title)) expOrder.push(title);
      });
      (periodData.income.sections || []).forEach(sec => {
        const title = (sec.title || '').trim() || '—';
        incMap[title] = (incMap[title] || 0) + sectionTotal(sec);
        if (!incOrder.includes(title)) incOrder.push(title);
      });
      const titles = [];
      expOrder.forEach(t => { if (!titles.includes(t)) titles.push(t); });
      incOrder.forEach(t => { if (!titles.includes(t)) titles.push(t); });
      const tbody = document.getElementById('balance-body');
      tbody.innerHTML = '';
      let gExp = 0;
      let gIncOnly = 0;
      const accFBal = (typeof balanceSelectedAccount !== 'undefined' ? (balanceSelectedAccount || '') : '').trim();
      const openingBal = (typeof sumFilteredOpeningBalance === 'function')
        ? sumFilteredOpeningBalance(accFBal)
        : 0;
      titles.forEach(title => {
        const bal = (typeof incMap !== 'undefined' && incMap[title] != null) ? (incMap[title] || 0) : 0;
        gIncOnly += bal;
        const exp = expMap[title] || 0;
        const remain = bal - exp;
        gExp += exp;
        const color = remain > 0 ? '#16a34a' : (remain < 0 ? '#dc2626' : '#1a1a1a');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="sec-name">${escapeHtml(title)}</td>
          <td class="val inc-cell" style="color:var(--text);">${formatNum(bal)}</td>
          <td class="val exp-cell" style="color:var(--text);">${formatNum(exp)}</td>
          <td class="val" style="color:${color};">${formatNum(remain)}</td>`;
        tbody.appendChild(tr);
      });
      /* جمع کل موجودی = جمع درآمدها + موجودی ماه قبل */
      const gBal = gIncOnly + openingBal;
      const gRemain = gBal - gExp;
      document.getElementById('balIncome').textContent = formatNum(gBal);
      document.getElementById('balExpense').textContent = formatNum(gExp);
      document.getElementById('balIncome').style.color = '#1a1a1a';
      document.getElementById('balExpense').style.color = '#1a1a1a';
      const balEl = document.getElementById('balRemain');
      balEl.textContent = formatNum(gRemain);
      balEl.style.color = gRemain > 0 ? '#16a34a' : (gRemain < 0 ? '#dc2626' : '#1a1a1a');
    }

    /* متن پیام‌ها: «اپ» → «نرم‌افزار»؛ شمارهٔ تلفن (+98…) همیشه چپ‌به‌راست تا «+» اول شماره بماند */
    function hkMsgFix(msg) {
      var m = String(msg == null ? '' : msg);
      try {
        m = m.replace(/(^|[^\u0600-\u06FF])اپ(?![\u0621-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC])/g, '$1نرم‌افزار');
        m = m.replace(/\+[0-9۰-۹][0-9۰-۹\s\-]{5,}[0-9۰-۹]/g, function (x) { return '\u2066' + x + '\u2069'; });
      } catch (e) {}
      return m;
    }
    function showToast(msg, opt) {
      const t = document.getElementById('toast');
      if (!t) return;
      try {
        var _m = String(msg || '');
        if (/supabase|firebase|همگام|ابر|sync|offline|آنلاین|آفلاین —|در صف همگام/i.test(_m)) return;
      } catch (eFilt) {}
      t.textContent = hkMsgFix(msg);
      t.classList.remove('toast-long');
      /* ۱.۳.۶۴: پیام ثبت واریز/برداشت به رنگ همان عملیات */
      try { var _tm = String(msg || ''); t.classList.toggle('toast-inc', /^واریز ثبت شد/.test(_tm)); t.classList.toggle('toast-exp', /^برداشت ثبت شد/.test(_tm)); } catch (eTc) {}
      t.style.fontSize = '';
      // همیشه بالاتر از مودال‌های مات
      try {
        t.style.zIndex = '2147483000';  /* همیشه روی همان صفحه‌ای که باز است، نه پشت منوها */
        if (t.parentNode !== document.body) document.body.appendChild(t);
        else document.body.appendChild(t); // به انتهای DOM ببر
      } catch (e) {}
      t.classList.add('show');
      /* یک‌خطی و کامل: اگر جا نشد، فونت کم‌کم کوچک شود (بدون «…») */
      try {
        var fs = parseFloat(getComputedStyle(t).fontSize) || 14, guard = 0;
        while (t.scrollWidth > t.clientWidth + 1 && fs > 9 && guard++ < 14) { fs -= 0.5; t.style.fontSize = fs + 'px'; }
      } catch (eFit) {}
      clearTimeout(window._toastTimer);
      /* opt عددی = مدت نمایش (میلی‌ثانیه) */
      window._toastTimer = setTimeout(() => t.classList.remove('show'), (typeof opt === 'number' && opt > 0) ? opt : 2500);
    }

    /* پیام چندخطی (کامل و بدون «…») برای گزارش‌های بلندتر مثل نتیجهٔ بازیابی */
    function showToastLong(msg) {
      showToast(msg);
      const t = document.getElementById('toast');
      if (!t) return;
      t.style.fontSize = '';
      t.classList.add('toast-long');
      clearTimeout(window._toastTimer);
      const ms = Math.min(9000, 2500 + String(msg || '').length * 45);
      window._toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.remove('toast-long'), 350); }, ms);
    }
    window.addEventListener('resize', () => {
      moveTabIndicator();
      syncChromeHeight();
    });
    window.addEventListener('beforeunload', () => {
      clearTimeout(saveTimer);
      persistCurrent();
      saveArchive();
      // بدون هشدار ترک صفحه
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(saveTimer);
        persistCurrent();
        saveArchive();
      }
    });


    // کیبورد: برای فیلدهای داخل جدول، scrollIntoView نکن (Next نباید جدول را بپراند)
    function scrollFieldAboveKeyboard(el) {
      if (!el) return;
      // ناوبری داخل جدول درآمد/مخارج/بده‌بستان — بدون اسکرول خودکار
      if (el.closest && el.closest('.person-detail-scroll, .person-detail-table, #sections-ledger, .ledger-rows, .section-rows-scroll')) {
        return;
      }
      setTimeout(() => {
        try {
          const r = el.getBoundingClientRect();
          const vv = window.visualViewport;
          const vh = (vv && vv.height) ? vv.height : (window.innerHeight || 600);
          if (r.top < 80 || r.bottom > vh - 120) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } catch (e) {}
      }, 280);
    }
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!t || !t.tagName) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
          (t.isContentEditable) ||
          (t.closest && (t.closest('#textInputModal') || t.closest('.title-menu')))) {
        closeRemindBarIfOpen();
      }
      if (t.closest && (t.closest('.title-menu') || t.closest('#textInputModal'))) return;
      // حفظ scrollTop ظرف جدول هنگام focus (ضد اسکرول مرورگر/اندروید)
      if (t.closest && t.closest('.person-detail-scroll, #sections-ledger')) {
        const sc = t.closest('.person-detail-scroll') || t.closest('#sections-ledger');
        const y = sc ? sc.scrollTop : 0;
        requestAnimationFrame(() => {
          try { if (sc && Math.abs((sc.scrollTop || 0) - y) > 2) sc.scrollTop = y; } catch (e) {}
        });
        setTimeout(() => {
          try { if (sc && Math.abs((sc.scrollTop || 0) - y) > 2) sc.scrollTop = y; } catch (e) {}
        }, 50);
        return; // بدون scrollIntoView
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        scrollFieldAboveKeyboard(t);
      }
    });
    // تایپ واقعی روی فیلدها هم یادآور را می‌بندد (حتی اگر فوکوس از قبل بوده)
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t || !t.tagName) return;
      if (['INPUT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable) {
        closeRemindBarIfOpen();
      }
    }, true);


