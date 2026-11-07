    /* —— Plans UI —— */
    function openPlanNameSheet(plan, onDone) {
      closeRemindBarIfOpen();
      let sheet = document.getElementById('planNameSheet');
      if (sheet) sheet.remove();
      sheet = document.createElement('div');
      sheet.id = 'planNameSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;box-shadow:0 12px 32px var(--shadow);';
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + Math.max(80, Math.floor((vv ? vv.height : window.innerHeight) * 0.22));
      sheet.style.top = top + 'px';

      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;text-align:center;';
      lab.textContent = 'نام قسط';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = (plan.name || '').trim();
      inp.placeholder = 'نام قسط را وارد کنید';
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

      const close = () => {
        try { sheet.remove(); } catch (e) {}
        document.removeEventListener('mousedown', outside, true);
      };
      const wasNew = !!plan.isNew || !(plan.name || '').trim();
      const save = () => {
        const v = (inp.value || '').trim();
        if (!v) { showToast('نام قسط را وارد کنید'); return; }
        const dup = (plans || []).some(p => p.id !== plan.id && (p.name || '').trim() === v);
        if (dup) { showToast('اسم تکراری است'); return; }
        plan.name = v;
        plan.isNew = false;
        if (typeof onDone === 'function') onDone(v);
        persistCurrent();
        scheduleSave();
        close();
        renderPlans();
        updateInstallSummary();
        checkInstallReminders();
      };
      ok.onclick = save;
      const cancelNew = () => {
        if (wasNew && (!(plan.name || '').trim() || plan.isNew)) {
          plans = plans.filter(x => x.id !== plan.id);
          renderPlans();
          scheduleSave();
        }
        close();
      };
      cancel.onclick = cancelNew;
      const outside = (e) => {
        if (!sheet.contains(e.target)) cancelNew();
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel.onclick(); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(lab);
      sheet.appendChild(inp);
      sheet.appendChild(actions);
      document.body.appendChild(sheet);
      setTimeout(() => {
        try { inp.focus(); if (inp.value) caretToEnd(inp); } catch (e) {}
      }, 50);
    }

    function addPlan() {
      closeRemindBarIfOpen();
      const p = emptyPlan();
      const today = getTodayPersian();
      p.grantYear = today.y;
      p.startYear = today.y;
      stampRowOwner(p);
      plans.push(p);
      renderPlans();
      scheduleSave();
      setTimeout(() => openPlanNameSheet(p), 60);
    }

    function deletePlan(id) {
      askConfirm('این قسط به سطل زباله منتقل شود؟', () => {
        const plan = (plans || []).find(p => p && p.id === id);
        if (plan && !canEditRow(plan)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
        if (plan && plan.id && sharedAccountId) {
          plan.deletedAt = Date.now();
          plan.updatedAt = Date.now();
          try {
            enqueueSync('delete_record', {
              id: plan.id,
              kind: 'plan',
              created_by: plan.createdBy || ownerAuthUid(),
              deleted_at: new Date(plan.deletedAt).toISOString(),
              payload: plan
            });
          } catch (e) {}
        }
        try {
          const _p = (plans || []).find(p => p && p.id === id);
          if (_p) pushToTrash('plan', _p.name || 'قسط', Object.assign(JSON.parse(JSON.stringify(_p)), { sourceLabel: 'اقساط' }));
        } catch (e) {}
        plans = (plans || []).filter(p => p.id !== id);
        syncPlansToExpenseAll();
        renderPlans();
        checkInstallReminders();
        scheduleSave();
        if (currentTab === 'expense') renderAll();
        showToast('به سطل زباله منتقل شد');
      });
    }

    function markNextPaid(id) {
      const plan = plans.find(p => p.id === id);
      if (!plan) return;
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
      if (paid >= count) return;
      plan.paidCount = paid + 1;
      syncPlansToExpenseAll();
      renderPlans();
      checkInstallReminders();
      scheduleSave();
      if (currentTab === 'expense') renderAll();
    }

    function renderPlans() {
      closeDarkSelects();
      document.querySelectorAll('.dark-select-list').forEach(el => {
        if (!el.closest('.top-bar') && !document.getElementById('monthSelectWrap')?.contains(el)) {
          // لیست‌های قدیمی اقساط
        }
      });
      // حذف لیست‌های رها شده (غیر از ماه/سال بالا)
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      const box = document.getElementById('plans-container');
      box.innerHTML = '';
      plans.forEach(plan => box.appendChild(buildPlanCard(plan)));
      updateInstallSummary();
      enableLongPressReorder(box, '.plan-card', (ids) => {
        const map = {};
        plans.forEach(p => { map[p.id] = p; });
        const ordered = ids.map(id => map[id]).filter(Boolean);
        plans.forEach(p => { if (!ids.includes(p.id)) ordered.push(p); });
        plans = ordered;
        updateInstallSummary();
        scheduleSave();
      });
    }

    function buildPlanCard(plan) {
      if (plan.interestRate === undefined || plan.interestRate === null) plan.interestRate = 0;
      // فیلدهای خالی را برای پلن جدید اجباری پر نکن
      if (plan.grantMonth === undefined) plan.grantMonth = '';
      if (plan.grantYear === undefined) plan.grantYear = '';
      if (plan.startMonth === undefined) plan.startMonth = '';
      if (plan.startYear === undefined) plan.startYear = '';
      if (plan.startDay === undefined) plan.startDay = '';
      if (plan.count === undefined) plan.count = '';

      const card = document.createElement('div');
      if (plan.collapsed === undefined) plan.collapsed = false;
      card.className = 'plan-card' + (plan.collapsed ? ' collapsed' : '') + (plan.editing ? ' is-editing' : '');
      try { if (_instFlashPlans[String(plan.id || plan.name || 'p')]) card.classList.add('inst-alert'); } catch (eFA) {}
      card.dataset.planId = plan.id;

      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      const pct = count ? Math.round((paid / count) * 100) : 0;
      const payAmt = count ? planInstallmentAmount(plan) : 0;

      let nextText = 'تمام شده';
      if (paid < count) {
        const due = dueDateForInstallment(plan, paid);
        nextText = 'قسط بعدی: ' + toPersianDigits(paid + 1) + ' از ' + toPersianDigits(count) +
          ' — ' + toPersianDigits(due.d) + ' ' + MONTHS[due.m - 1] + ' ' + toPersianDigits(due.y) +
          ' — ' + formatNum(payAmt) + ' تومان';
      }

      const top = document.createElement('div');
      top.className = 'plan-top';
      top.style.cursor = 'pointer';

      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      arrow.innerHTML = plan.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';

      const nameDisp = document.createElement('div');
      nameDisp.className = 'plan-name';
      nameDisp.style.cssText = 'border:none;background:transparent;cursor:default;flex:1;min-width:0;';
      nameDisp.textContent = (plan.name || '').trim() || 'نام قسط';
      if (!(plan.name || '').trim()) nameDisp.style.opacity = '0.5';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit-title' + (plan.editing ? ' is-editing' : '');
      editBtn.title = plan.editing ? 'در حال ویرایش' : 'ویرایش قسط';
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        plan.editing = !plan.editing;
        if (plan.editing && plan.collapsed) {
          plan.collapsed = false;
        }
        renderPlans();
        scheduleSave();
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-del-row';
      delBtn.title = 'حذف قسط';
      delBtn.textContent = '×';
      delBtn.onclick = (e) => { e.stopPropagation(); deletePlan(plan.id); };
      const dragHandle = document.createElement('button');
      dragHandle.type = 'button';
      dragHandle.className = 'drag-handle';
      dragHandle.title = 'جابه‌جایی';
      dragHandle.setAttribute('aria-label', 'جابه‌جایی');
      dragHandle.innerHTML = DRAG_HANDLE_SVG;
      dragHandle.onclick = (e) => e.stopPropagation();

      top.appendChild(dragHandle);
      top.appendChild(arrow);
      top.appendChild(nameDisp);
      top.appendChild(editBtn);
      top.appendChild(delBtn);
      top.onclick = (e) => {
        if (card._skipClick || card.classList.contains('dragging')) return;
        if (e.target === delBtn || e.target === editBtn || editBtn.contains(e.target) || delBtn.contains(e.target) || e.target.closest('.drag-handle')) return;
        plan.collapsed = !plan.collapsed;
        hkSlideSet(card, !plan.collapsed, function (o) { card.classList.toggle('collapsed', !o); });
        arrow.innerHTML = plan.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
        scheduleSave();
      };
      card.appendChild(top);

      const body = document.createElement('div');
      body.className = 'plan-body';

      const grid = document.createElement('div');
      grid.className = 'plan-grid';

      function field(label, el) {
        const wrap = document.createElement('div');
        wrap.className = 'plan-field';
        const lb = document.createElement('label');
        lb.textContent = label;
        wrap.appendChild(lb);
        wrap.appendChild(el);
        return wrap;
      }

      function refreshProgressOnly() {
        const count2 = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid2 = Math.min(count2, Math.max(0, parseInt(plan.paidCount, 10) || 0));
        const pct2 = count2 ? Math.round((paid2 / count2) * 100) : 0;
        const payAmt2 = planInstallmentAmount(plan);
        let nextText2 = 'تمام شده';
        if (paid2 < count2) {
          const due = dueDateForInstallment(plan, paid2);
          nextText2 = 'قسط بعدی: ' + toPersianDigits(paid2 + 1) + ' از ' + toPersianDigits(count2) +
            ' — ' + toPersianDigits(due.d) + ' ' + MONTHS[due.m - 1] + ' ' + toPersianDigits(due.y) +
            ' — ' + formatNum(payAmt2) + ' تومان';
        }
        const progEl = card.querySelector('.plan-progress');
        if (progEl) {
          progEl.innerHTML = toPersianDigits(paid2) + ' از ' + toPersianDigits(count2) +
            ' قسط پرداخت شده (' + toPersianDigits(pct2) + '٪)' +
            '<div class="bar"><span style="width:' + pct2 + '%"></span></div>';
        }
        const nextEl = card.querySelector('.plan-next');
        if (nextEl) nextEl.textContent = nextText2;
        const payBtn = card.querySelector('.btn-pay');
        if (payBtn) payBtn.disabled = paid2 >= count2;
        const finalEl = card.querySelector('.final-amt');
        if (finalEl) finalEl.value = formatNum(planInstallmentAmount(plan));
        const lastDueEl = card.querySelector('.last-due-date');
        if (lastDueEl) lastDueEl.value = formatPlanLastDue(plan);
        if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
          ensureExpenseSectionThroughPlanEnd(plan);
        }
        syncPlansToExpenseAll();
        updateInstallSummary();
        checkInstallReminders();
        scheduleSave();
      }

      // مبلغ
      const amtInp = document.createElement('input');
      amtInp.className = 'amount-input';
      amtInp.inputMode = 'numeric';
      amtInp.pattern = '[0-9]*';
      amtInp.value = plan.amount ? formatNum(plan.amount) : '';
      amtInp.placeholder = '';
      amtInp.oninput = () => {
        const digits = toEnglishDigits(amtInp.value).replace(/[^0-9]/g, '');
        plan.amount = digits ? parseInt(digits, 10) : 0;
        amtInp.value = plan.amount ? formatNum(plan.amount) : '';
        refreshProgressOnly();
      };
      amtInp.className = (amtInp.className || '') + ' amount-input';
      amtInp.style.textAlign = 'right';
      amtInp.style.direction = 'rtl';
      grid.appendChild(field('مبلغ کل (تومان)', amtInp));

      // سود
      const rateInp = document.createElement('input');
      rateInp.inputMode = 'decimal';
      rateInp.pattern = '[0-9]*';
      rateInp.value = plan.interestRate ? toPersianDigits(String(plan.interestRate)) : '۰';
      rateInp.placeholder = '۰';
      rateInp.oninput = () => {
        let v = toEnglishDigits(rateInp.value).replace(/[^0-9.]/g, '');
        // فقط یک نقطه
        const parts = v.split('.');
        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
        plan.interestRate = v ? parseFloat(v) : 0;
        if (isNaN(plan.interestRate)) plan.interestRate = 0;
        rateInp.value = toPersianDigits(String(plan.interestRate));
        refreshProgressOnly();
      };
      grid.appendChild(field('سود (٪)', rateInp));

      // تعداد
      const countInp = document.createElement('input');
      countInp.inputMode = 'numeric';
      countInp.pattern = '[0-9]*';
      countInp.value = (plan.count !== '' && plan.count != null && Number(plan.count) > 0) ? toPersianDigits(plan.count) : '';
      countInp.placeholder = '۳۶';
      countInp.oninput = () => {
        const digits = toEnglishDigits(countInp.value).replace(/[^0-9]/g, '');
        plan.count = digits ? parseInt(digits, 10) : 0;
        if (plan.paidCount > plan.count) plan.paidCount = plan.count;
        countInp.value = plan.count ? toPersianDigits(plan.count) : '';
        refreshProgressOnly();
      };
      grid.appendChild(field('تعداد اقساط', countInp));

      // روز سررسید
      const dayInp = document.createElement('input');
      dayInp.inputMode = 'numeric';
      dayInp.pattern = '[0-9]*';
      dayInp.maxLength = 2;
      dayInp.value = plan.startDay ? toPersianDigits(plan.startDay) : '';
      dayInp.placeholder = '۱ تا ۳۱';
      dayInp.oninput = () => {
        let v = toEnglishDigits(dayInp.value).replace(/[^0-9]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        let n = v ? parseInt(v, 10) : 0;
        if (n > 31) n = 31;
        plan.startDay = n || 1;
        dayInp.value = v ? toPersianDigits(n > 31 ? 31 : n) : '';
        refreshProgressOnly();
      };
      dayInp.onblur = () => {
        if (!plan.startDay || plan.startDay < 1) plan.startDay = 1;
        dayInp.value = toPersianDigits(plan.startDay);
        refreshProgressOnly();
      };
      grid.appendChild(field('روز سررسید هر ماه', dayInp));

      // ماه شروع
      
      const monthOpts = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
      const yearOpts = [];
      for (let y = YEAR_START; y <= YEAR_END; y++) yearOpts.push({ value: y, label: toPersianDigits(y) });

      const grantMonthSel = createDarkSelect({
        options: monthOpts,
        value: plan.grantMonth || '',
        onChange: (v) => { plan.grantMonth = parseInt(v, 10) || ''; scheduleSave(); }
      });
      grid.appendChild(field('ماه اعطا', grantMonthSel));

      const grantYearSel = createDarkSelect({
        options: yearOpts,
        value: plan.grantYear || '',
        onChange: (v) => { plan.grantYear = parseInt(v, 10) || ''; scheduleSave(); }
      });
      grid.appendChild(field('سال اعطا', grantYearSel));

      const monthSel = createDarkSelect({
        options: monthOpts,
        value: plan.startMonth || '',
        onChange: (v) => { plan.startMonth = parseInt(v, 10) || ''; refreshProgressOnly(); }
      });
      grid.appendChild(field('ماه شروع بازپرداخت', monthSel));

      const yearSel = createDarkSelect({
        options: yearOpts,
        value: plan.startYear || '',
        onChange: (v) => { plan.startYear = parseInt(v, 10) || ''; refreshProgressOnly(); }
      });
      grid.appendChild(field('سال شروع بازپرداخت', yearSel));

      const paidInp = document.createElement('input');
      paidInp.inputMode = 'numeric';
      paidInp.pattern = '[0-9]*';
      paidInp.setAttribute('enterkeyhint', 'done');
      paidInp.value = toPersianDigits(paid);
      paidInp.oninput = () => {
        let n = parseInt(toEnglishDigits(paidInp.value).replace(/[^0-9]/g, '') || '0', 10);
        if (n < 0) n = 0;
        const c = Math.max(0, parseInt(plan.count, 10) || 0);
        if (n > c) n = c;
        plan.paidCount = n;
        /* ویرایش دستی این عدد = اصلاح مرز قسط‌های گذشته (قفل)؛ پرداخت‌هایی که بعداً ثبت می‌شوند مرز را جابه‌جا نمی‌کنند */
        plan.lockedCount = n;
        paidInp.value = toPersianDigits(n);
        try { clampPlanPaymentState(plan); } catch (eC) {}
        refreshProgressOnly();
      };
      paidInp.onblur = () => {
        try { clampPlanPaymentState(plan); } catch (eC2) {}
        try {
          if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
            syncPlansToExpenseAll();
          }
        } catch (eS) {}
        try { updateInstallSummary(); } catch (eU) {}
        try { checkInstallReminders(); } catch (eR) {}
        scheduleSave();
        if (currentTab === 'expense') renderAll();
      };
      paidInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          try { paidInp.blur(); } catch (err) {}
          scheduleSave();
        }
      };
      grid.appendChild(field('تعداد قسط پرداخت‌شده', paidInp));

      // مبلغ نهایی با سود (فقط نمایش)
      const finalShow = document.createElement('input');
      finalShow.readOnly = true;
      finalShow.value = formatNum(payAmt);
      finalShow.className = 'amount-input plan-readonly final-amt';
      grid.appendChild(field('مبلغ هر قسط (محاسبه‌شده)', finalShow));

      // افزودن به مخارج — زیر مبلغ هر قسط — «هیچکدام» همیشه آخرین
      const expSecOpts = [];
      (periodData.expense.sections || []).forEach(s => {
        const t = (s.title || '').trim();
        expSecOpts.push({
          value: s.id,
          label: t || ('بخش بدون نام')
        });
      });
      expSecOpts.push({ value: '', label: 'هیچکدام' });
      let linkedVal = plan.expenseSectionId || '';
      if (!linkedVal && (plan.expenseSectionTitle || '').trim()) {
        const found = (periodData.expense.sections || []).find(
          s => (s.title || '').trim() === (plan.expenseSectionTitle || '').trim()
        );
        if (found) linkedVal = found.id;
      }
      // اگر id در لیست فعلی نیست، فقط عنوان فارسی را نشان بده یا هیچکدام
      if (linkedVal && !expSecOpts.some(o => String(o.value) === String(linkedVal))) {
        const byTitle = (periodData.expense.sections || []).find(
          s => (s.title || '').trim() === (plan.expenseSectionTitle || '').trim()
        );
        linkedVal = byTitle ? byTitle.id : '';
        plan.expenseSectionId = linkedVal;
      }
      // تاریخ آخرین سررسید
      const lastDueShow = document.createElement('input');
      lastDueShow.readOnly = true;
      lastDueShow.className = 'plan-readonly last-due-date';
      lastDueShow.value = formatPlanLastDue(plan);
      grid.appendChild(field('تاریخ آخرین سررسید', lastDueShow));

      const expSecSel = createDarkSelect({
        options: expSecOpts,
        value: linkedVal,
        onChange: (v) => {
          const val = (v == null) ? '' : String(v);
          plan.expenseSectionId = val;
          const sec = (periodData.expense.sections || []).find(s => s.id === val);
          plan.expenseSectionTitle = sec ? ((sec.title || '').trim()) : '';
          if (val) ensureExpenseSectionThroughPlanEnd(plan);
          syncPlansToExpenseAll();
          scheduleSave();
          if (currentTab === 'expense') renderAll();
          showToast(val ? 'به مخارج وصل شد' : 'بدون اتصال به مخارج');
        }
      });
      grid.appendChild(field('افزودن به مخارج', expSecSel));

      body.appendChild(grid);

      const prog = document.createElement('div');
      prog.className = 'plan-progress';
      prog.innerHTML = toPersianDigits(paid) + ' از ' + toPersianDigits(count) +
        ' قسط پرداخت شده (' + toPersianDigits(pct) + '٪)' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>';
      body.appendChild(prog);

      const actions = document.createElement('div');
      actions.className = 'plan-actions';
      const next = document.createElement('div');
      next.className = 'plan-next';
      next.textContent = nextText;
      const payBtn = document.createElement('button');
      payBtn.className = 'btn btn-pay';
      payBtn.textContent = 'ثبت پرداخت قسط بعدی';
      payBtn.disabled = paid >= count;
      payBtn.onclick = () => markNextPaid(plan.id);
      actions.appendChild(next);
      actions.appendChild(payBtn);
      body.appendChild(actions);
      if (!plan.editing) {
        body.classList.add('view-only');
      } else {
        // دکمه اتمام ویرایش
        const done = document.createElement('button');
        done.type = 'button';
        done.className = 'btn btn-pay';
        done.style.width = '100%';
        done.style.marginTop = '8px';
        done.textContent = 'اتمام ویرایش';
        done.onclick = () => {
          plan.editing = false;
          if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
            ensureExpenseSectionThroughPlanEnd(plan);
          }
          syncPlansToExpenseAll();
          renderPlans();
          updateInstallSummary();
          checkInstallReminders();
          scheduleSave();
          if (currentTab === 'expense') renderAll();
        };
        body.appendChild(done);
        // ویرایش نام با Done کافی است — وابسته به آیکون ادیت نیست
                nameDisp.style.cursor = 'pointer';
        nameDisp.onclick = (e) => {
          e.stopPropagation();
          openPlanNameSheet(plan);
        };
      }
      card.appendChild(body);

      return card;
    }

    function updateInstallSummary() {
      const tbody = document.getElementById('install-summary-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      let gPaid = 0, gRemain = 0, gTotal = 0;
      function bindAmt(td, num) {
        const full = formatNum(num);
        td.textContent = full;
        td.title = full;
        td.style.cursor = 'pointer';
        td.onclick = function(e) {
          e.stopPropagation();
          try { showCellTextPopup(td, full); } catch (err) {}
        };
      }
      plans.forEach(plan => {
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
        const amt = planInstallmentAmount(plan);
        const total = planTotalPayable(plan);
        const paidSum = paid * amt;
        const remainSum = total - paidSum;
        gPaid += paidSum; gRemain += remainSum; gTotal += total;
        const tr = document.createElement('tr');
        const tdN = document.createElement('td'); tdN.className = 'sec-name'; tdN.textContent = plan.name || '—';
        const tdP = document.createElement('td'); tdP.className = 'val paid-cell'; bindAmt(tdP, paidSum);
        const tdR = document.createElement('td'); tdR.className = 'val unpaid-cell'; bindAmt(tdR, remainSum);
        const tdT = document.createElement('td'); tdT.className = 'val total-cell'; bindAmt(tdT, total);
        tr.appendChild(tdN); tr.appendChild(tdP); tr.appendChild(tdR); tr.appendChild(tdT);
        tbody.appendChild(tr);
      });
      [['ins-paid', gPaid], ['ins-remain', gRemain], ['ins-total', gTotal]].forEach(function(pair) {
        const el = document.getElementById(pair[0]);
        if (!el) return;
        const full = formatNum(pair[1]);
        el.textContent = full;
        el.style.cursor = 'pointer';
        el.onclick = function() { try { showCellTextPopup(el, full); } catch (e) {} };
      });
    }


    function syncEmptyClass(el) {
      if (!el) return;
      const v = (el.value || '').trim();
      const empty = !v || v === '۰' || v === '0';
      if (empty && !el.classList.contains('unlocked') && document.activeElement !== el) {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    }
    function approxCaretIndexFromClick(el, clientX) {
      try {
        const val = el.value || '';
        if (!val.length) return 0;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const padL = parseFloat(style.paddingLeft) || 0;
        const padR = parseFloat(style.paddingRight) || 0;
        const usable = Math.max(1, rect.width - padL - padR);
        let ratio = (clientX - rect.left - padL) / usable;
        const rtl = (style.direction === 'rtl') || (el.getAttribute('dir') === 'rtl') ||
          !!(el.closest && el.closest('[dir="rtl"]'));
        if (rtl) ratio = 1 - ratio;
        ratio = Math.max(0, Math.min(1, ratio));
        return Math.round(ratio * val.length);
      } catch (e) {
        return (el.value || '').length;
      }
    }
    /* نشانگر را به انتهای متن ببر (بعد از فوکوس/دبل‌کلیک؛ چند بار تا انتخاب پیش‌فرض مرورگر را جایگزین کند) */
    /* فیلد مبلغ با جداکنندهٔ هزارگان: چپ‌به‌راست تا نشانگرِ آخر عدد واقعاً آخر باشد و «پاک کردن» کیبورد رقم آخر را پاک کند؛
       بعد از جداکننده‌گذاری، نشانگر نسبت به آخر عدد سر جایش می‌ماند */
    function hkAmountInput(inp) {
      if (!inp || inp._hkAmt) return;
      inp._hkAmt = true;
      inp.setAttribute('dir', 'ltr');
      inp.style.direction = 'ltr';
      var toEnd = function () { try { var n = inp.value.length; inp.setSelectionRange(n, n); } catch (e) {} };
      inp.addEventListener('focus', function () { setTimeout(toEnd, 0); });
      inp.addEventListener('input', function () {
        var v = inp.value, pos = inp.selectionStart == null ? v.length : inp.selectionStart;
        var digitsAfter = toEnglishDigits(v.slice(pos)).replace(/[^0-9]/g, '').length;
        var digits = toEnglishDigits(v).replace(/[^0-9]/g, '');
        if (!digits) { inp.value = ''; return; }
        var out = formatNum(parseInt(digits, 10) || 0);
        inp.value = out;
        /* همان تعداد رقم بعد از نشانگر بماند */
        var i = out.length, seen = 0;
        while (i > 0 && seen < digitsAfter) { if (/[0-9۰-۹]/.test(out[i - 1])) seen++; i--; }
        try { inp.setSelectionRange(i, i); } catch (e) {}
      });
    }
    /* رفتن به خانهٔ بعد/قبل جدول بدون بسته شدن صفحه‌کلید: خانهٔ مقصد قابل‌ویرایش و همان لحظه (داخل همان رویداد کلید) فعال می‌شود؛
       خانهٔ قبلی خودبه‌خود blur می‌شود و مقدارش ذخیره می‌شود. هیچ لحظه‌ای بدون خانهٔ فعال نمی‌ماند (علت بسته و باز شدن صفحه‌کلید) */
    /* باز/بسته شدن نرم (همان سرعت سطر «رمزنگاری پشتیبان خودکار»: ۰٫۴۵ ثانیه): ارتفاع قاب از اندازهٔ فعلی به اندازهٔ جدید می‌رود؛
       هنگام بستن، محتوا تا پایان حرکت دیده می‌شود. setOpen(bool) فقط کلاس/حالت نمایش را عوض می‌کند */
    function hkSlideSet(el, open, setOpen) {
      if (!el || !el.animate || !el.isConnected) { setOpen(open); return; }
      if (el._hkHA) { try { el._hkHA.cancel(); } catch (e0) {} }
      var h0 = el.getBoundingClientRect().height;
      setOpen(open);
      var h1 = el.getBoundingClientRect().height;
      if (Math.abs(h1 - h0) < 1) return;
      if (!open) { setOpen(true); el.classList.add('hk-shutting'); } else el.classList.remove('hk-shutting');
      /* ۱.۳.۴۲: overflow با !important (بعضی باکس‌ها مثل قرض در CSS «overflow: visible !important» دارند و محتوای در حال
         باز/بسته شدن از باکس بیرون می‌زد و روی باکس بعدی می‌افتاد) */
      var ov = el.style.getPropertyValue('overflow'), ovp = el.style.getPropertyPriority('overflow');
      var restore = function () { el.style.removeProperty('overflow'); if (ov) el.style.setProperty('overflow', ov, ovp); };
      el.style.setProperty('overflow', 'hidden', 'important');
      var a = el._hkHA = el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 450, easing: 'ease' });
      a.onfinish = function () { el._hkHA = null; restore(); el.classList.remove('hk-shutting'); if (!open) setOpen(false); };
      a.oncancel = function () { el._hkHA = null; restore(); el.classList.remove('hk-shutting'); };
    }
    /* باز/بسته شدن نرمِ چند بخش داخلی (به‌جای کل باکس): ارتفاع، فاصله‌ها و خط‌ها همه با هم به صفر می‌رسند تا
       لحظهٔ آخر هیچ چیزی نپرد. gap = فاصلهٔ flex قبل از بخش (با حاشیهٔ منفی جمع می‌شود). */
    function hkSlideParts(host, getParts, open, setOpen, gap) {
      if (!host || !host.animate || !host.isConnected) { setOpen(open); return; }
      (host._hkParts || []).forEach(function (a0) { try { a0.cancel(); } catch (e0) {} });
      host._hkParts = [];
      setOpen(true);
      var parts = (getParts() || []).filter(function (p) { return p && getComputedStyle(p).display !== 'none'; });
      if (!parts.length) { setOpen(open); return; }
      if (!open) host.classList.add('hk-shutting'); else host.classList.remove('hk-shutting');
      var left = parts.length, finished = false;
      var cleanOne = function (p) { p.style.removeProperty('overflow'); ['boxSizing', 'height', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'marginTop', 'marginBottom'].forEach(function (k) { p.style[k] = ''; }); };
      parts.forEach(function (p) {
        p.style.setProperty('overflow', 'hidden', 'important'); p.style.boxSizing = 'border-box';
        var cs = getComputedStyle(p);
        var full = { height: p.getBoundingClientRect().height + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, borderTopWidth: cs.borderTopWidth, borderBottomWidth: cs.borderBottomWidth, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 };
        var zero = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', marginTop: (gap ? -gap : 0) + 'px', marginBottom: '0px', opacity: 0 };
        var a = p.animate(open ? [zero, full] : [full, zero], { duration: host._hkSlideMs || 450, easing: host._hkSlideMs ? ((!open && host._hkSlideEaseClose) || 'cubic-bezier(0.45, 0, 0.25, 1)') : 'ease' });
        host._hkParts.push(a);
        a.onfinish = function () {
          if (--left > 0) return;
          finished = true; host._hkParts = [];
          if (!open) setOpen(false);
          parts.forEach(cleanOne); host.classList.remove('hk-shutting');
        };
        a.oncancel = function () { cleanOne(p); host.classList.remove('hk-shutting'); };
      });
    }
    function hkSlideBox(el, open, setOpen, gap) { hkSlideParts(el, function () { return [el]; }, open, setOpen, gap); }
    /* شرح در حال تایپ: یک‌خطی، مگر اینکه متن جا نشود؛ آن‌وقت به اندازهٔ متن (تا سقف) بلند می‌شود */
    function hkDescAutosize(el) {
      try {
        el.style.height = '20px';
        var h = el.scrollHeight;
        if (h > 22) el.style.height = Math.min(h + 2, 110) + 'px';
      } catch (e) {}
    }
    function hkMoveFocus(el) {
      if (!el) return false;
      try { el.readOnly = false; } catch (e0) {}
      try { el.focus({ preventScroll: true }); } catch (e1) { try { el.focus(); } catch (e2) { return false; } }
      try { if (typeof caretToEnd === 'function') caretToEnd(el); } catch (e3) {}
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e4) {}
      return document.activeElement === el;
    }
    function caretToEnd(el) {
      if (!el || typeof el.value !== 'string') return;
      var put = function () {
        try {
          if (document.activeElement !== el || el.readOnly || !el._caretEndUntil || Date.now() > el._caretEndUntil) return;
          var n = el.value.length;
          el.setSelectionRange(n, n);
          if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight;
        } catch (e) {}
      };
      el._caretEndUntil = Date.now() + 1600;
      /* مبلغ در فیلد راست‌به‌چپ: نشانگرِ «آخر متن» سمت چپ عدد (پشت رقم بزرگ) دیده می‌شد.
         تا وقتی فیلد در حال ویرایش است جهتش چپ‌به‌راست شود (چینش ظاهری همان قبلی) تا نشانگر بعد از یکان دیده شود */
      try {
        var vv = String(el.value || '');
        var amountLike = (el.inputMode === 'numeric' || el.getAttribute('inputmode') === 'numeric') || (vv && /^[0-9۰-۹,٬.\s\-−]+$/.test(vv));
        if (amountLike && el.tagName === 'INPUT' && !el._ltrEdit) {
          var cs = getComputedStyle(el);
          if (cs.direction === 'rtl') {
            el._ltrEdit = { d: el.style.getPropertyValue('direction'), dp: el.style.getPropertyPriority('direction'), a: el.style.getPropertyValue('text-align'), ap: el.style.getPropertyPriority('text-align') };
            var ta = cs.textAlign === 'start' ? 'right' : cs.textAlign === 'end' ? 'left' : cs.textAlign;
            el.style.setProperty('text-align', ta, 'important');
            el.style.setProperty('direction', 'ltr', 'important');
            var restore = function () {
              el.removeEventListener('blur', restore);
              var o = el._ltrEdit; el._ltrEdit = null; if (!o) return;
              if (o.d) el.style.setProperty('direction', o.d, o.dp); else el.style.removeProperty('direction');
              if (o.a) el.style.setProperty('text-align', o.a, o.ap); else el.style.removeProperty('text-align');
            };
            el.addEventListener('blur', restore);
          }
        }
      } catch (eLtr) {}
      put(); setTimeout(put, 0); setTimeout(put, 60); setTimeout(put, 180); setTimeout(put, 350); setTimeout(put, 600); setTimeout(put, 1000); setTimeout(put, 1500);
      /* اندروید با دوبار ضربه کلمه را انتخاب می‌کند یا نشانگر را دیرتر جابه‌جا می‌کند؛
         تا ۱.۶ ثانیه بعد از شروع ویرایش هر جابه‌جایی نشانگر به انتهای متن برگردانده می‌شود */
      /* باز شدن کیبورد اندروید گاهی تا یک ثانیه بعد نشانگر را به محل لمس می‌برد؛ پس تا اولین تایپ کاربر، نشانگر آخرِ مبلغ می‌ماند */
      if (!el._caretEndHooked) {
        el._caretEndHooked = true;
        var stop = function () { el._caretEndUntil = 0; };
        el.addEventListener('keydown', stop); el.addEventListener('beforeinput', stop); el.addEventListener('blur', stop);
      }
    }
    try { window.caretToEnd = caretToEnd; } catch (eW) {}
    document.addEventListener('selectionchange', function () {
      var el = document.activeElement;
      if (!el || !el._caretEndUntil || Date.now() > el._caretEndUntil) return;
      if (typeof el.value !== 'string' || el.readOnly) return;
      try {
        var n = el.value.length;
        if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
      } catch (e) {}
    });
    /* هر فیلدی که با دوبار ضربه/کلیک قفلش باز می‌شود (حتی بدون رویداد dblclick مرورگر) */
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') || t.readOnly) return;
      if (t.classList && (t.classList.contains('unlocked') || t.dataset.lastTap)) { caretToEnd(t); return; }
      /* ۱.۳.۶۵: هر جای نرم‌افزار که ویرایش شروع شود: نشانگر بعد از آخرین کلمه / جلوی یکانِ مبلغ
         (مگر جایی که خود کد عمداً همهٔ متن را انتخاب کرده باشد) */
      var ty = t.tagName === 'TEXTAREA' ? 'textarea' : String(t.type || 'text').toLowerCase();
      if (['text', 'search', 'tel', 'url', 'email', 'number', 'textarea'].indexOf(ty) < 0) return;
      setTimeout(function () {
        try {
          if (document.activeElement !== t) return;
          var n = (t.value || '').length;
          if (n && t.selectionStart === 0 && t.selectionEnd === n) return;
          caretToEnd(t);
        } catch (eCe) {}
      }, 0);
    }, true);
    /* هر جا با دبل‌کلیک ویرایش شروع شود (مبلغ، شرح، روز، ...) نشانگر به آخر برود */
    /* فاز capture: بعضی سلول‌ها (مثل مبلغ در جدول کارت) رویداد را stopPropagation می‌کنند و قبلاً به این‌جا نمی‌رسید */
    document.addEventListener('dblclick', function (e) {
      var t = e.target;
      if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      /* ۱.۳.۸۶: خانه‌ای که همین حالا در حال تایپ است: دوبار ضربه = انتخاب کل متن/مبلغ (برای کپی یا کات) */
      if (!t.readOnly && !t.disabled && document.activeElement === t && (t.value || '').length) {
        var selAll = function () { try { t._caretEndUntil = 0; t.setSelectionRange(0, (t.value || '').length); } catch (eSa) { try { t.select(); } catch (eS2) {} } };
        selAll(); setTimeout(selAll, 0); setTimeout(selAll, 120);
        return;
      }
      setTimeout(function () { caretToEnd(t); }, 0);
      setTimeout(function () { caretToEnd(t); }, 120);
    }, true);
    function lockField(el, shouldLock) {
      if (!el) return;
      if (shouldLock) {
        if (el.tagName !== 'SELECT') el.readOnly = true;
        el.classList.add('locked');
        el.classList.remove('unlocked');
        el.dataset.locked = '1';
        delete el.dataset.fullSelected;
        syncEmptyClass(el);
      } else {
        if (el.tagName !== 'SELECT') el.readOnly = false;
        el.classList.remove('locked');
        el.classList.add('unlocked');
        el.classList.remove('is-empty');
        el.dataset.locked = '0';
        try {
          el.focus({ preventScroll: true });
          /* بعد از دبل‌کلیک، نشانگر چشمک‌زن آخر مبلغ/نوشته قرار می‌گیرد */
          caretToEnd(el);
        } catch (e) { try { el.focus(); } catch (e2) {} }
      }
    }
    function setupLockable(el, hasValue, permaLocked, lockMsg) {
      if (hasValue) lockField(el, true);
      else {
        // خالی: نه قفل کامل، باریک و شفاف
        if (el.tagName !== 'SELECT') el.readOnly = false;
        el.classList.remove('locked');
        el.classList.remove('unlocked');
        el.dataset.locked = '0';
        el.classList.add('is-empty');
      }
      if (permaLocked) {
        el.dataset.permaLocked = '1';
        el.dataset.permaLockedMsg = lockMsg || 'برای ویرایش از بخش اقساط اقدام کنید';
        if (el.tagName !== 'SELECT') el.readOnly = true;
      }
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (el.dataset.permaLocked === '1') { showToast(el.dataset.permaLockedMsg || 'برای ویرایش از بخش اقساط اقدام کنید'); return; }
        lockField(el, false);
      });
      // جلوگیری از اسکرول ناخواسته صفحه هنگام اولین لمس/کلیک روی سلول قفل‌شده
      el.addEventListener('mousedown', (e) => {
        if (el.tagName === 'SELECT') return;
        if (el.classList.contains('locked')) {
          e.preventDefault();
          try { el.focus({ preventScroll: true }); } catch (err) { try { el.focus(); } catch (e2) {} }
          return;
        }
        // حالت هایلایت کامل: کلیک بعدی نشانگر تایپ را همان‌جا می‌گذارد
        if (el.dataset.fullSelected === '1' && typeof el.setSelectionRange === 'function') {
          const x = e.clientX;
          // بگذار رفتار پیش‌فرض هم اجرا شود؛ بعد اگر هنوز همه انتخاب بود، دستی بگذار
          setTimeout(() => {
            try {
              if (el.dataset.fullSelected !== '1') return;
              const len = (el.value || '').length;
              if (el.selectionStart === 0 && el.selectionEnd === len && len > 0) {
                const pos = approxCaretIndexFromClick(el, x);
                el.setSelectionRange(pos, pos);
              }
              delete el.dataset.fullSelected;
            } catch (err) {}
          }, 0);
        }
      });
      el.addEventListener('click', (e) => {
        if (el.tagName === 'SELECT') return;
        if (el.classList.contains('locked') || el.readOnly) return;
        if (el.dataset.fullSelected !== '1') return;
        if (typeof el.setSelectionRange !== 'function') return;
        const len = (el.value || '').length;
        if (!len) { delete el.dataset.fullSelected; return; }
        // اگر هنوز کل متن انتخاب است، نشانگر را نزدیک محل کلیک بگذار
        if (el.selectionStart === 0 && el.selectionEnd === len) {
          const pos = approxCaretIndexFromClick(el, e.clientX);
          try { el.setSelectionRange(pos, pos); } catch (err) {}
        }
        delete el.dataset.fullSelected;
      });
      // لمس طولانی‌تر موبایل: دوبار لمس سریع (فقط اگر لمس واقعاً "تپ" باشد نه اسکرول)
      let lastTap = 0;
      let touchStartX = 0, touchStartY = 0, touchMoved = false;
      el.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
        touchMoved = false;
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          const dx = Math.abs(e.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 10 || dy > 10) touchMoved = true;
        }
      }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (touchMoved) { lastTap = 0; touchMoved = false; return; }
        const now = Date.now();
        if (now - lastTap < 350) {
          e.preventDefault();
          if (el.dataset.permaLocked === '1') { showToast(el.dataset.permaLockedMsg || 'برای ویرایش از بخش اقساط اقدام کنید'); return; }
          lockField(el, false);
        } else if (el.classList.contains('locked')) {
          e.preventDefault();
          try { el.focus({ preventScroll: true }); } catch (err) { try { el.focus(); } catch (e2) {} }
        } else if (el.dataset.fullSelected === '1' && typeof el.setSelectionRange === 'function') {
          // بعد از هایلایت کامل، تک‌لمس نشانگر را نزدیک محل لمس می‌گذارد
          const touch = (e.changedTouches && e.changedTouches[0]) || null;
          const x = touch ? touch.clientX : 0;
          const len = (el.value || '').length;
          setTimeout(() => {
            try {
              if (el.dataset.fullSelected !== '1') return;
              if (len > 0 && el.selectionStart === 0 && el.selectionEnd === len) {
                const pos = approxCaretIndexFromClick(el, x);
                el.setSelectionRange(pos, pos);
              }
              delete el.dataset.fullSelected;
            } catch (err) {}
          }, 0);
        }
        lastTap = now;
      });
      el.addEventListener('focus', () => {
        el.classList.remove('is-empty');
        el.classList.add('unlocked');
      });
      el.addEventListener('input', () => syncEmptyClass(el));
      el.addEventListener('blur', () => {
        const v = (el.value || '').trim();
        if (v !== '' && v !== '۰' && v !== '0') lockField(el, true);
        else {
          el.classList.remove('unlocked');
          el.classList.remove('locked');
          el.classList.add('is-empty');
        }
      });
    }
    /** با لمس/کلیک در هر جای دیگه صفحه (حتی نواحی غیرقابل‌فوکوس)، سلول شرح بازشده باید جمع شود */
    function collapseOpenDescField(target) {
      const ae = document.activeElement;
      if (!ae || !ae.classList || !ae.classList.contains('desc-input')) return;
      if (ae === target || (ae.contains && ae.contains(target))) return;
      try { ae.blur(); } catch (e) {}
    }
    document.addEventListener('mousedown', (e) => collapseOpenDescField(e.target), true);
    document.addEventListener('touchstart', (e) => collapseOpenDescField(e.target), { capture: true, passive: true });

    const DRAG_HANDLE_SVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 4v16"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/>' +
      '</svg>';

    /** مدیر سراسری درگ — فقط یک درگ همزمان، همیشه پاک‌سازی می‌شود */
    const DragReorder = {
      timer: null,
      active: null,
      ghost: null,
      container: null,
      itemSel: '',
      onCommit: null,
      pressX: 0,
      pressY: 0,
      startTop: 0,
      startLeft: 0,
      safety: null,
      bound: false,

      resetSoft() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      },

      hardCancel() {
        this.resetSoft();
        if (this.safety) { clearTimeout(this.safety); this.safety = null; }
        this.unbindMove();
        if (this.ghost && this.ghost.parentNode) {
          try { this.ghost.remove(); } catch (e) {}
        }
        this.ghost = null;
        if (this.active) {
          try {
            this.active.classList.remove('drag-source');
            this.active.style.opacity = '';
            const el = this.active;
            el._skipClick = true;
            setTimeout(function() { try { el._skipClick = false; } catch (e2) {} }, 280);
          } catch (e) {}
        }
        try {
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
        } catch (e) {}
        this.active = null;
        this.container = null;
        this.onCommit = null;
      },

      unbindMove() {
        if (!this.bound) return;
        document.removeEventListener('pointermove', this._onMove);
        document.removeEventListener('pointerup', this._onUp);
        document.removeEventListener('pointercancel', this._onUp);
        this.bound = false;
      },

      bindMove() {
        if (this.bound) return;
        document.addEventListener('pointermove', this._onMove, { passive: false });
        document.addEventListener('pointerup', this._onUp);
        document.addEventListener('pointercancel', this._onUp);
        this.bound = true;
      },

      _onMove(e) {
        const self = DragReorder;
        if (!self.active || !self.ghost) return;
        e.preventDefault();
        e.stopPropagation();
        const dy = e.clientY - self.pressY;
        self.ghost.style.top = (self.startTop + dy) + 'px';
        self.ghost.style.left = self.startLeft + 'px';
        const y = e.clientY;
        const list = Array.from(self.container.querySelectorAll(self.itemSel))
          .filter(el => el !== self.active);
        let before = null;
        for (let i = 0; i < list.length; i++) {
          const r = list[i].getBoundingClientRect();
          const mid = r.top + r.height * 0.45;
          if (y < mid) { before = list[i]; break; }
        }
        try {
          if (before) {
            if (self.active.nextSibling !== before) self.container.insertBefore(self.active, before);
          } else if (list.length) {
            const last = list[list.length - 1];
            if (self.active !== last) self.container.appendChild(self.active);
          }
        } catch (err) {}
      },

      _onUp() {
        const self = DragReorder;
        if (!self.active) {
          self.resetSoft();
          return;
        }
        const cont = self.container;
        const sel = self.itemSel;
        const cb = self.onCommit;
        const ids = cont
          ? Array.from(cont.querySelectorAll(sel)).map(el => el.dataset.secId || el.dataset.planId || '').filter(Boolean)
          : [];
        self.hardCancel();
        try { if (typeof cb === 'function' && ids.length) cb(ids); } catch (err) {}
      },

      begin(item, e, container, itemSel, onCommit) {
        this.hardCancel();
        if (!item || !container) return;
        this.active = item;
        this.container = container;
        this.itemSel = itemSel;
        this.onCommit = onCommit;
        this.pressX = e.clientX;
        this.pressY = e.clientY;
        item._skipClick = true;
        try { if (e.pointerId != null && item.setPointerCapture) item.setPointerCapture(e.pointerId); } catch (err) {}
        try { window.appHaptic(12); } catch (err) {}
        try {
          document.body.style.overflow = 'hidden';
          document.body.style.touchAction = 'none';
        } catch (err) {}

        const rect = item.getBoundingClientRect();
        this.startTop = rect.top;
        this.startLeft = rect.left;

        const g = document.createElement('div');
        g.className = 'drag-ghost';
        g.style.cssText = [
          'position:fixed',
          'left:' + rect.left + 'px',
          'top:' + rect.top + 'px',
          'width:' + rect.width + 'px',
          'height:' + Math.min(rect.height, 120) + 'px',
          'z-index:99999',
          'pointer-events:none',
          'border-radius:12px',
          'box-shadow:0 12px 32px rgba(0,0,0,0.4)',
          'background:var(--bg2,#1c1c1e)',
          'border:1px solid var(--border,#333)',
          'opacity:0.95',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'font-family:Tahoma,sans-serif',
          'font-size:14px',
          'color:var(--text,#eee)',
          'padding:8px 12px',
          'box-sizing:border-box'
        ].join(';');
        // فقط عنوان، نه کل درخت DOM (جلوگیری از فریز)
        let title = '';
        const nameEl = item.querySelector('.title-display, .plan-name, .section-title-display, .section-title');
        if (nameEl) title = (nameEl.textContent || '').trim();
        if (!title) title = 'جابه‌جایی…';
        g.textContent = title;
        document.body.appendChild(g);
        this.ghost = g;

        item.classList.add('drag-source');
        try { window.appHaptic(10); } catch (err) {}

        this.bindMove();
        // اگر pointerup از دست رفت، حداکثر ۳ ثانیه بعد رها شود
        this.safety = setTimeout(() => {
          if (DragReorder.active) DragReorder._onUp();
        }, 3000);
      }
    };
    // bind this
    DragReorder._onMove = DragReorder._onMove.bind(DragReorder);
    DragReorder._onUp = DragReorder._onUp.bind(DragReorder);

    function enableLongPressReorder(container, itemSelector, onCommit) {
      if (!container) return;
      container._lpItemSel = itemSelector;
      container._lpOnCommit = onCommit;
      if (container._lpBound) return;
      container._lpBound = true;

      container.addEventListener('pointerdown', (e) => {
        const sel = container._lpItemSel;
        if (e.button != null && e.button !== 0) return;
        if (e.target.closest && e.target.closest('input:not([readonly]), textarea:not([readonly]), select, a, .btn-edit-title, .btn-del-row, .btn-circle-plus')) return;
        const handle = e.target.closest && e.target.closest('.drag-handle');
        let item = null;
        if (handle && container.contains(handle)) {
          item = handle.closest(sel);
        } else {
          item = e.target.closest && e.target.closest(sel);
          if (!item || !container.contains(item)) return;
          if (item.classList.contains('plan-card') && !handle) return;
        }
        if (!item) return;
        if (DragReorder.active) return;

        const sx = e.clientX;
        const sy = e.clientY;
        const pointerId = e.pointerId;
        let activated = false;
        let cancelled = false;

        const onMoveBefore = (ev) => {
          if (cancelled || activated) return;
          if (Math.abs(ev.clientX - sx) > 22 || Math.abs(ev.clientY - sy) > 22) {
            cancelled = true;
            DragReorder.resetSoft();
            cleanupBefore();
          }
        };
        const onUpBefore = () => {
          if (activated) return;
          cancelled = true;
          DragReorder.resetSoft();
          cleanupBefore();
        };
        function cleanupBefore() {
          document.removeEventListener('pointermove', onMoveBefore);
          document.removeEventListener('pointerup', onUpBefore);
          document.removeEventListener('pointercancel', onUpBefore);
        }
        document.addEventListener('pointermove', onMoveBefore, { passive: true });
        document.addEventListener('pointerup', onUpBefore);
        document.addEventListener('pointercancel', onUpBefore);

        DragReorder.resetSoft();
        DragReorder.timer = setTimeout(() => {
          if (cancelled) return;
          activated = true;
          cleanupBefore();
          try {
            item._skipClick = true;
            try { if (item.setPointerCapture) item.setPointerCapture(pointerId); } catch (err) {}
            DragReorder.begin(
              item,
              { clientX: sx, clientY: sy, pointerId: pointerId },
              container,
              container._lpItemSel,
              container._lpOnCommit
            );
          } catch (err) {
            DragReorder.hardCancel();
          }
        }, 400);
      });
    }


