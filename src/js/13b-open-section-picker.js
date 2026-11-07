    function openSectionPicker(secs, onPick) {
      /* ۱.۳.۴۶: یک کارت؛ منوی بخش مقصد لازم نیست */
      try { var _mn = hkSingleNorm(hkMainTitle()); var _ms = (secs || []).find(function (x) { return x && hkSingleNorm(x.title) === _mn; }) || (secs || [])[0]; if (_ms) { onPick(_ms.id); return; } } catch (eSp) {}
      let old = document.getElementById('sectionPickerSheet');
      if (old) old.remove();
      const bd = document.getElementById('textInputBackdrop');
      const _spScrollY = window.scrollY || window.pageYOffset || 0;
      if (bd) {
        bd.classList.add('open');
        bd.style.background = 'rgba(0,0,0,0.94)';
        bd.style.webkitBackdropFilter = 'blur(18px)';
        bd.style.backdropFilter = 'blur(18px)';
      }
      document.body.style.position = 'fixed';
      document.body.style.top = (-_spScrollY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';

      function releaseSectionPickerLock() {
        if (bd) {
          bd.classList.remove('open');
          bd.style.background = '';
          bd.style.webkitBackdropFilter = '';
          bd.style.backdropFilter = '';
        }
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, _spScrollY);
      }

      const box = document.createElement('div');
      box.id = 'sectionPickerSheet';
      box.style.cssText = [
        'position:fixed', 'left:16px', 'right:16px', 'z-index:460',
        'top:50%', 'transform:translateY(-50%)',
        'background:var(--card)', 'border:1px solid var(--border)',
        'border-radius:14px', 'padding:14px 12px',
        'box-shadow:0 12px 40px var(--shadow)',
        'max-height:70vh', 'overflow-y:auto', '-webkit-overflow-scrolling:touch'
      ].join(';');

      const title = document.createElement('div');
      title.style.cssText = 'text-align:center;font-weight:bold;font-size:1rem;margin-bottom:12px;color:var(--text);font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif;';
      title.textContent = 'نام کاربر را انتخاب کنید';
      box.appendChild(title);

      if (!secs || !secs.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;color:var(--muted);padding:12px;';
        empty.textContent = 'بخشی وجود ندارد';
        box.appendChild(empty);
      } else {
        secs.forEach(sec => {
          const b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = [
            'display:block', 'width:100%', 'margin-bottom:8px',
            'padding:12px 14px', 'text-align:right',
            'border:1px solid var(--border)', 'border-radius:10px',
            'background:var(--bg3)', 'color:var(--text)',
            'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif',
            'font-size:0.98rem', 'font-weight:bold', 'cursor:pointer'
          ].join(';');
          b.textContent = (sec.title || '').trim() || 'بدون نام';
          b.onclick = () => {
            box.remove();
            releaseSectionPickerLock();
            onPick(sec.id);
          };
          box.appendChild(b);
        });
      }

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.style.cssText = [
        'display:block', 'width:100%', 'margin-top:4px',
        'padding:11px 14px', 'border:1px solid var(--border)',
        'border-radius:10px', 'background:transparent',
        'color:var(--red-tx)', 'font-family:Vazirmatn,B Nazanin,Tahoma,sans-serif',
        'font-size:0.95rem', 'font-weight:bold', 'cursor:pointer'
      ].join(';');
      cancel.textContent = 'انصراف';
      cancel.onclick = () => {
        box.remove();
        releaseSectionPickerLock();
      };
      box.appendChild(cancel);

      document.body.appendChild(box);

      if (bd) {
        const closer = (ev) => {
          if (ev.target === bd) {
            box.remove();
            releaseSectionPickerLock();
            bd.removeEventListener('click', closer);
          }
        };
        bd.addEventListener('click', closer);
      }
    }


    /* انتخاب تاریخ با سه منوی کشویی (روز / ماه / سال) مثل منوی پس‌انداز — بدون تایپ.
       همان رابطِ createDateMaskInput را دارد: getDate() و isComplete() */
    function hkCreateDateSelects(initial, opts) {
      opts = opts || {};
      var t = getTodayPersian();
      var st = { d: (initial && parseInt(initial.d, 10)) || t.d, m: (initial && parseInt(initial.m, 10)) || t.m, y: (initial && parseInt(initial.y, 10)) || t.y };
      var wrap = document.createElement('div'); wrap.className = 'sv-date hk-date-sel';
      var mk = function (flex) { var d = document.createElement('div'); d.style.cssText = 'min-width:0;' + flex; wrap.appendChild(d); return d; };
      var wD = mk('flex:0 0 72px;'), wM = mk('flex:1.3;'), wY = mk('flex:0 0 88px;');
      var selD = null, selM = null, selY = null;
      var fire = function () { if (typeof opts.onChange === 'function') { try { opts.onChange({ d: st.d, m: st.m, y: st.y }); } catch (e) {} } };
      try {
        var dayOpts = []; for (var di = 1; di <= 31; di++) dayOpts.push({ value: di, label: toPersianDigits(String(di)) });
        wD.appendChild(selD = createDarkSelect({ listClassName: 'sv-dl', options: dayOpts, value: st.d, onChange: function (v) { st.d = parseInt(v, 10) || 1; fire(); } }));
        wM.appendChild(selM = createDarkSelect({ listClassName: 'sv-dl', options: (MONTHS || []).map(function (n, i) { return { value: i + 1, label: n }; }), value: st.m, onChange: function (v) { st.m = parseInt(v, 10) || 1; fire(); } }));
        /* ۱.۳.۴۶: همهٔ منوهای سال ۱۳۹۰ تا ۱۴۲۰ */
        var yo = []; for (var yi = 1390; yi <= 1420; yi++) yo.push({ value: yi, label: toPersianDigits(String(yi)) });
        if (st.y < 1390 || st.y > 1420) yo.push({ value: st.y, label: toPersianDigits(String(st.y)) });
        wY.appendChild(selY = createDarkSelect({ listClassName: 'sv-dl', options: yo, value: st.y, onChange: function (v) { st.y = parseInt(v, 10) || t.y; fire(); } }));
      } catch (e) {}
      wrap.getDate = function () { return { d: st.d, m: st.m, y: st.y }; };
      /* تنظیم برنامه‌ای (بدون فراخوانی onChange) */
      wrap.setDate = function (d) {
        if (!d) return;
        st.d = parseInt(d.d, 10) || st.d; st.m = parseInt(d.m, 10) || st.m; st.y = parseInt(d.y, 10) || st.y;
        try { if (selD && selD.setValue) selD.setValue(st.d); if (selM && selM.setValue) selM.setValue(st.m); if (selY && selY.setValue) selY.setValue(st.y); } catch (e) {}
      };
      wrap.isComplete = function () { return !!(st.d && st.m && st.y); };
      return wrap;
    }
    function createDateMaskInput(initial) {
      const wrap = document.createElement('div');
      wrap.className = 'date-mask-wrap';
      const d0 = initial && (initial.d || initial.day) ? String(initial.d || initial.day) : '';
      const m0 = initial && (initial.m || initial.month) ? String(initial.m || initial.month) : '';
      const y0 = initial && (initial.y || initial.year) ? String(initial.y || initial.year) : '';
      function seg(val, ph, maxLen) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.className = 'date-seg';
        inp.maxLength = maxLen || 2;
        inp.placeholder = ph;
        if (val) {
          const en = String(val).replace(/\D/g, '');
          if ((maxLen || 2) >= 4 && en.length >= 3) {
            inp.value = toPersianDigits(en.slice(-4).padStart(4, '0'));
          } else {
            const two = en.length >= 2 ? en.slice(-2) : en;
            inp.value = two ? toPersianDigits(two.padStart(2, '0')) : '';
          }
        } else inp.value = '';
        return inp;
      }
      // RTL: day (راست) / month / year کامل (چپ)
      const inpD = seg(d0, '––', 2);
      const inpM = seg(m0, '––', 2);
      let yFull = y0;
      if (yFull && String(yFull).length <= 2) yFull = String(1400 + parseInt(String(yFull), 10));
      const inpY = seg(yFull, '––––', 4);
      inpY.style.width = '3.4em';
      const s1 = document.createElement('span'); s1.className = 'date-sep'; s1.textContent = '/';
      const s2 = document.createElement('span'); s2.className = 'date-sep'; s2.textContent = '/';
      wrap.appendChild(inpD); wrap.appendChild(s1); wrap.appendChild(inpM); wrap.appendChild(s2); wrap.appendChild(inpY);

      function prevInput(inp) {
        var p = inp.previousElementSibling;
        while (p && p.tagName !== 'INPUT') p = p.previousElementSibling;
        return p;
      }
      // روز و ماه: صفر پیشرو مجاز (۰۵)، بعد از ۲ رقم برو بعدی
      function bindDM(inp, next, maxN) {
        inp.addEventListener('input', function() {
          let v = toEnglishDigits(inp.value).replace(/[^0-9]/g, '');
          if (v.length > 2) v = v.slice(0, 2);
          // حفظ صفر پیشرو — فقط وقتی ۲ رقم شد محدود کن
          if (v.length === 2) {
            let n = parseInt(v, 10);
            if (maxN && n > maxN) n = maxN;
            if (n < 1 && maxN) n = 1;
            v = String(n).padStart(2, '0');
          }
          inp.value = v ? toPersianDigits(v) : '';
          if (v.length >= 2 && next) {
            try { next.focus(); if (next.select) next.select(); } catch (e) {}
          }
        });
        inp.addEventListener('blur', function() {
          let v = toEnglishDigits(inp.value).replace(/[^0-9]/g, '');
          if (!v) return;
          let n = parseInt(v, 10) || 0;
          if (maxN && n > maxN) n = maxN;
          if (n < 1) n = 1;
          inp.value = toPersianDigits(String(n).padStart(2, '0'));
        });
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Backspace' && !(toEnglishDigits(inp.value).replace(/\D/g,''))) {
            var p = prevInput(inp);
            if (p) try { p.focus(); } catch (e2) {}
          }
        });
      }
      // سال: کاربر هر چهار رقم را خودش وارد می‌کند (مثل ۱۴۰۵)؛ تبدیل خودکار دو رقمی حذف شد
      inpY.addEventListener('input', function() {
        let v = toEnglishDigits(inpY.value).replace(/[^0-9]/g, '');
        if (v.length > 4) v = v.slice(0, 4);
        inpY.value = v ? toPersianDigits(v) : '';
      });
      inpY.addEventListener('focus', function() {
        try { inpY.select(); } catch (e) {}
      });
      inpY.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !(toEnglishDigits(inpY.value).replace(/\D/g,''))) {
          var p = prevInput(inpY);
          if (p) try { p.focus(); } catch (e2) {}
        }
      });

      bindDM(inpD, inpM, 31);
      bindDM(inpM, inpY, 12);

      wrap.getDate = function() {
        const d = parseInt(toEnglishDigits(inpD.value), 10) || 0;
        const m = parseInt(toEnglishDigits(inpM.value), 10) || 0;
        let y = parseInt(toEnglishDigits(inpY.value), 10) || 0;
        if (y > 0 && y < 100) y += 1400;
        return { d: d, m: m, y: y };
      };
      wrap.isComplete = function() {
        const g = wrap.getDate();
        return g.d >= 1 && g.d <= 31 && g.m >= 1 && g.m <= 12 && g.y >= 1300;
      };
      return wrap;
    }

    function editRecurringItem(index) {
      const existing = index >= 0 ? recurringIncomes[index] : { name: '', amount: 0, day: '' };
      openRecurringSheet(index, existing);
    }

    function openRecurringSheet(index, existing) {
      closeRemindBarIfOpen();
      closeDarkSelects();
      let sheet = document.getElementById('recurringSheet');
      if (sheet) sheet.remove();
      lockBodyScroll();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) {
        bd.style.top = '0';
        bd.style.height = '';
        bd.classList.add('open');
      }
      // حذف لیست‌های کشویی رهاشده از بازشدن‌های قبلی این شیت
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      sheet = document.createElement('div');
      sheet.id = 'recurringSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px;box-shadow:0 12px 32px var(--shadow);overflow-y:auto;-webkit-overflow-scrolling:touch;';
      function repositionSheet() {
        const vv2 = window.visualViewport;
        const vh = vv2 ? vv2.height : window.innerHeight;
        const vTop = vv2 ? vv2.offsetTop : 0;
        // پایین‌تر از لبه بالا تا زیر هدر شلوغ نباشد
        const topPad = Math.max(56, Math.floor(vh * 0.12));
        sheet.style.top = (vTop + topPad) + 'px';
        sheet.style.maxHeight = Math.max(160, vh - topPad - 16) + 'px';
      }
      repositionSheet();
      const vv = window.visualViewport;
      if (vv) vv.addEventListener('resize', repositionSheet);

      function field(labelText, inputEl) {
        const lab = document.createElement('div');
        lab.style.cssText = 'font-size:0.78rem;color:var(--muted);margin-bottom:3px;text-align:center;';
        lab.textContent = labelText;
        sheet.appendChild(lab);
        sheet.appendChild(inputEl);
      }
      const inpStyle = 'width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:0.95rem;margin-bottom:7px;text-align:center;box-sizing:border-box;';

      const inpName = document.createElement('input');
      inpName.type = 'text';
      inpName.value = existing.name || '';
      inpName.placeholder = 'نام را وارد کنید';
      inpName.style.cssText = inpStyle;
      field('نام درآمد ثابت', inpName);

      const inpAmt = document.createElement('input');
      inpAmt.type = 'text';
      inpAmt.inputMode = 'numeric';
      inpAmt.value = existing.amount ? formatNum(existing.amount) : '';
      inpAmt.placeholder = 'مبلغ را وارد کنید';
      inpAmt.style.cssText = inpStyle;
      hkAmountInput(inpAmt);
      field('مبلغ ماهانه (تومان)', inpAmt);
      /* رهن/ودیعه: فقط برای ثبت و دیدن؛ اختیاری و در هیچ حسابی اثر ندارد */
      const inpDep = document.createElement('input');
      inpDep.type = 'text';
      inpDep.inputMode = 'numeric';
      inpDep.className = 'rec-deposit-inp';
      inpDep.value = existing.deposit ? formatNum(existing.deposit) : '';
      inpDep.placeholder = 'مبلغ رهن/ودیعه، اختیاری';
      inpDep.style.cssText = inpStyle;
      hkAmountInput(inpDep);
      field('رهن (تومان)', inpDep);

      const startInit = existing.contractStart || (existing.day ? { d: existing.day, m: currentMonth, y: currentYear } : null);
      const endInit = existing.contractEnd || null;
      const labStart = document.createElement('div');
      labStart.className = 'date-mask-label rec-date-lab';
      labStart.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;';
      /* ۱.۳.۴۹: اینفوباکس برداشته شد؛ فقط برای مورد قدیمیِ بی‌تاریخ شروع، تذکر می‌ماند */
      labStart.innerHTML = '<span>شروع قرارداد</span>' + ((index >= 0 && !recStartKey(existing)) ? hkInfoBtnHtml('این مورد تاریخ شروع نداشت؛ آن را تأیید کنید تا ساخت ماهانه ادامه یابد.') : '');
      sheet.appendChild(labStart);
      let endTouched = !!existing.contractEnd;
      const plusYear = (d) => ({ d: d.d, m: d.m, y: d.y + 1 });
      const maskStart = hkCreateDateSelects(startInit, { onChange: (d) => { if (!endTouched && maskEnd && maskEnd.setDate) maskEnd.setDate(plusYear(d)); } });
      sheet.appendChild(maskStart);
      /* پایان قرارداد اجباری؛ پیش‌فرض یک سال بعد از شروع و تا دستی عوض نشده همراه شروع جابه‌جا می‌شود */
      const labEnd = document.createElement('div');
      labEnd.className = 'date-mask-label rec-end-lab';
      labEnd.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;';
      labEnd.innerHTML = '<span>پایان قرارداد</span>'; /* ۱.۳.۴۹: اینفوباکس برداشته شد */
      sheet.appendChild(labEnd);
      const maskEnd = hkCreateDateSelects(endInit || plusYear(maskStart.getDate()), { onChange: () => { endTouched = true; } });
      maskEnd.id = 'recEndDate';
      sheet.appendChild(maskEnd);

      // بخش‌های درآمد ماه جاری (اولویت) + عناوین یکتای آرشیو
      const secOpts = [];
      const seenTitles = new Set();
      const pushSec = (s, preferId) => {
        if (!s) return;
        const title = (s.title || '').trim();
        const key = title || s.id || '';
        if (!key || seenTitles.has(key)) return;
        seenTitles.add(key);
        // value = id ماه جاری اگر باشد، وگرنه title
        secOpts.push({
          value: preferId && s.id ? s.id : (title || s.id),
          label: title || 'بدون عنوان'
        });
      };
      ((periodData.income && periodData.income.sections) || []).forEach(s => pushSec(s, true));
      try {
        Object.keys(archive || {}).forEach(k => {
          const pd = archive[k];
          ((pd && pd.income && pd.income.sections) || []).forEach(s => pushSec(s, false));
        });
      } catch (e) {}
      const secOptionsRec = [{ value: '', label: 'کاربر بخش مقصد را انتخاب کنید' }].concat(secOpts);
      if (secOpts.length === 0) {
        secOptionsRec.push({ value: '__none__', label: 'ابتدا در تب درآمد یک بخش بسازید' });
      }
      const secSelRec = createDarkSelect({
        options: secOptionsRec,
        /* اگر فقط یک بخش هست، همان پیش‌فرض */
        value: existing.sectionId || (secOpts.length === 1 ? secOpts[0].value : '')
      });
      secSelRec.style.marginBottom = '7px';
      /* ۱.۳.۴۶: یک کارت؛ «بخش مقصد» نشان داده نمی‌شود (خودکار کارت اصلی) */
      secSelRec.style.display = 'none';
      sheet.appendChild(secSelRec);

      const accOptionsRec = [{ value: '', label: 'انتخاب حساب' }].concat(selectedAccountLabels().map(n => ({ value: n, label: n })));
      const accSelRec = createDarkSelect({
        options: accOptionsRec,
        value: existing.account || ''
      });
      if (accSelRec._list) {
        accSelRec._list.classList.add('bank-acc-list');
        accSelRec._list.classList.add('bank-acc-list-lg');
      }
      accSelRec.style.marginBottom = '7px';
            try {
        if (false && typeof inpDay !== 'undefined' && inpDay) {
          inpDay.setAttribute('enterkeyhint', 'next');
          inpDay.setAttribute('inputmode', 'numeric');
          inpDay.onkeydown = (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
              e.preventDefault();
              try {
                const btn = secSelRec && (secSelRec.querySelector('.dark-select-btn') || secSelRec.querySelector('button'));
                if (btn) btn.click(); else if (secSelRec.click) secSelRec.click();
              } catch (err) {}
            }
          };
        }
        if (typeof secSelRec !== 'undefined' && secSelRec) {
          const secBtn = secSelRec.querySelector('.dark-select-btn') || secSelRec;
          secBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
              e.preventDefault();
              try {
                const btn = accSelRec && (accSelRec.querySelector('.dark-select-btn') || accSelRec.querySelector('button'));
                if (btn) btn.click();
              } catch (err) {}
            }
          });
        }
      } catch (e) {}
field('حساب بانکی', accSelRec);

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
          document.querySelectorAll('#recurringBox .btn-edit-title.is-editing').forEach(b => b.classList.remove('is-editing'));
        } catch (e) {}
      };
      const close = () => {
        try { sheet.remove(); } catch (e) {}
        try { if (accSelRec._list) accSelRec._list.remove(); } catch (e) {}
        try { if (secSelRec._list) secSelRec._list.remove(); } catch (e) {}
        try { if (window.visualViewport) window.visualViewport.removeEventListener('resize', repositionSheet); } catch (e) {}
        const bd2 = document.getElementById('textInputBackdrop');
        if (bd2) {
          bd2.classList.remove('open');
          bd2.style.top = '';
          bd2.style.height = '';
        }
        document.removeEventListener('mousedown', outside, true);
        clearEditIcons();
        unlockBodyScroll();
      };
      const save = () => {
        if (index >= 0 && recurringIncomes[index] && !canEditRow(recurringIncomes[index])) {
          showToast(OWNERSHIP_LOCK_MSG);
          return;
        }
        const name = (inpName.value || '').trim();
        if (!name) { showToast('نام را وارد کنید'); try { inpName.focus(); } catch (e) {} return; }
        const amtDigits = toEnglishDigits(inpAmt.value || '').replace(/[^0-9]/g, '');
        const amount = amtDigits ? (parseInt(amtDigits, 10) || 0) : 0;
        const st = maskStart.getDate();
        const hasEnd = true;
        const en = maskEnd.getDate();
        let day = st.d || 0;
        if (day > 31) day = 31;
        if (!maskStart.isComplete()) { showToast('تاریخ شروع قرارداد را کامل وارد کنید'); return; }
        if (hasEnd && !maskEnd.isComplete()) { showToast('پایان قرارداد را کامل وارد کنید'); return; }
        if (hasEnd && recMonthKey(en.y, en.m) < recMonthKey(st.y, st.m)) { showToast('پایان قرارداد باید بعد از شروع باشد'); return; }
        const depDigits = toEnglishDigits(inpDep.value || '').replace(/[^0-9]/g, '');
        const deposit = depDigits ? (parseInt(depDigits, 10) || 0) : 0;
        const item = {
          name: name,
          amount: amount,
          deposit: deposit,
          day: day || '',
          account: accSelRec.getValue() || '',
          contractStart: { d: st.d, m: st.m, y: st.y },
          contractEnd: hasEnd ? { d: en.d, m: en.m, y: en.y } : null
        };
        // اگر بخش مقصد انتخاب شده، نام بخش را روی رکورد نگه دار
        const destSecId = (secSelRec.getValue && secSelRec.getValue()) || '';
        if (destSecId && destSecId !== '__none__') {
          const secs0 = (periodData.income && periodData.income.sections) || [];
          const sec0 = secs0.find(s => s.id === destSecId);
          if (sec0) {
            item.sectionId = sec0.id;
            item.sectionTitle = (sec0.title || '').trim();
          } else {
            /* بخشی که فقط در ماه‌های دیگر هست (مقدار = عنوان) */
            item.sectionTitle = String(destSecId).trim();
          }
        } else if (index >= 0 && recurringIncomes[index]) {
          // حفظ بخش قبلی اگر عوض نشده
          if (recurringIncomes[index].sectionId) item.sectionId = recurringIncomes[index].sectionId;
          if (recurringIncomes[index].sectionTitle) item.sectionTitle = recurringIncomes[index].sectionTitle;
        }
        if (!(item.sectionTitle || item.sectionId)) { item.sectionTitle = hkMainTitle(); try { var _cs = ((periodData.income && periodData.income.sections) || [])[0]; if (_cs) item.sectionId = _cs.id; } catch (eCs) {} }
        const today = recTodayKey();
        const finish = (toastMsg) => {
          saveRecurring();
          try { renderSectionsForTab('income'); } catch (e) {}
          recRefreshViews();
          // بعد از تأیید، لیست همه درآمدهای ثابت را نشان بده (بعد از رسم بقیهٔ صفحه، تا پاک نشود)
          try {
            recurringCollapsed = false;
            if (_featureActive !== 'recurring') {
              openFeatureSheet('recurring');
            } else {
              renderRecurringBar();
            }
          } catch (e) {
            try { renderRecurringBar(); } catch (e2) {}
          }
          try { scheduleSave(); } catch (e) {}
          if (toastMsg) { try { showToast(toastMsg); } catch (e) {} }
        };
        if (index >= 0 && recurringIncomes[index]) {
          // شناسه و مالکیت رکورد قبلی حفظ شود تا با Sync قبلی تداخل نکند
          const prev = recurringIncomes[index];
          item.id = prev.id || newRecordId();
          item.createdBy = prev.createdBy;
          item.createdByName = prev.createdByName;
          item.createdAt = prev.createdAt;
          item.deletedAt = prev.deletedAt || null;
          item.updatedAt = Date.now();
          item.fromKey = parseInt(prev.fromKey, 10) || today;
          item.genKey = parseInt(prev.genKey, 10) || recPrevKey(today);
          if (prev.paidAhead) item.paidAhead = prev.paidAhead;
          if (prev.payerHints) item.payerHints = prev.payerHints;
          /* دوره‌های قبلی قرارداد (بعد از تمدید) با ویرایش عادی دست نمی‌خورند */
          if (Array.isArray(prev.terms) && prev.terms.length) item.terms = prev.terms;
          const wasLegacy = !recStartKey(prev);
          /* تعریف قدیمیِ بدون تاریخ شروع: از همین ماه ادامه می‌دهد */
          if (wasLegacy) item.fromKey = today;
          const rows = recRowsOf(prev);
          const curRow = rows.find(x => x.key === today);
          const amountChanged = (Number(prev.amount) || 0) !== amount;
          const newFirst = recStartKey(item), newEnd = recEndKey(item);
          const beforeStart = rows.filter(x => newFirst && x.key < newFirst && recStartKey(prev) && newFirst > recStartKey(prev));
          const afterEnd = rows.filter(x => newEnd && x.key > newEnd && (!recEndKey(prev) || newEnd < recEndKey(prev)));
          const pastUnpaid = rows.filter(x => x.key < today && !recIsPaid(x.row) && !(newFirst && x.key < newFirst));
          const qs = [];
          const notes = [];
          if (amountChanged && curRow && !recIsPaid(curRow.row)) {
            qs.push({ id: 'fromThis', msg: 'مبلغ جدید (' + formatNum(amount) + ' تومان) از کدام ماه اعمال شود؟', yes: 'از این ماه', no: 'از ماه بعد' });
          } else if (amountChanged && curRow && recIsPaid(curRow.row)) {
            notes.push('این ماه دریافت شده؛ مبلغ جدید از ماه بعد اعمال می‌شود');
          }
          if (beforeStart.some(x => !recIsPaid(x.row))) {
            qs.push({ id: 'trimBefore', msg: toPersianDigits(beforeStart.filter(x => !recIsPaid(x.row)).length) + ' ردیف «دریافت نشده» قبل از شروع تازه هست. پاک شوند؟', yes: 'پاک شوند', no: 'بمانند' });
          }
          if (beforeStart.some(x => recIsPaid(x.row))) notes.push('ردیف‌های دریافت‌شدهٔ قبل از شروع تازه نگه داشته شدند');
          if (afterEnd.some(x => !recIsPaid(x.row))) {
            qs.push({ id: 'trimAfter', msg: toPersianDigits(afterEnd.filter(x => !recIsPaid(x.row)).length) + ' ردیف «دریافت نشده» بعد از پایان تازه هست. پاک شوند؟', yes: 'پاک شوند', no: 'بمانند' });
          }
          if (amountChanged && pastUnpaid.length) {
            qs.push({ id: 'pastAmount', msg: 'ماه‌های قبل ' + toPersianDigits(pastUnpaid.length) + ' ردیف «دریافت نشده» دارند. مبلغ آن‌ها هم ' + formatNum(amount) + ' تومان شود؟', yes: 'بله', no: 'نه، بماند' });
          }
          close();
          recAskSeq(qs, (ans) => {
            const res = recApplyEdit(prev, item, {
              amountFromNext: ans.fromThis === false,
              trimBefore: !!ans.trimBefore,
              trimAfter: !!ans.trimAfter,
              pastAmount: !!ans.pastAmount
            });
            const i2 = recurringIncomes.indexOf(prev);
            if (i2 >= 0) recurringIncomes[i2] = item; else recurringIncomes.push(item);
            if (res.removed) notes.push(toPersianDigits(res.removed) + ' ردیف دریافت‌نشده پاک شد');
            /* این ماه ردیفی نداشت: ویرایش وضعیت این ماه را عوض نمی‌کند و خودکار ردیف نمی‌سازد
               (کاربر در صورت نیاز با «ساخت ردیف» می‌سازد) */
            if (!curRow && recInRange(item, today)) item.genKey = Math.max(parseInt(item.genKey, 10) || 0, today);
            finish(notes[0] || 'تغییرات اعمال شد');
          });
          return;
        }
        stampRowOwner(item);
        if (!item.id) item.id = newRecordId();
        item.fromKey = today;
        item.genKey = recPrevKey(today);
        recurringIncomes.push(item);
        close();
        const first = recFirstKey(item);
        recOfferTodayRow(item, (msg) => {
          finish(msg || (first > today ? 'ردیف‌ها از ' + recKeyLabel(first) + ' ساخته می‌شوند' : ''));
          /* ۱.۳.۵۵: قرارداد از قبل شروع شده: واریزهای قبلی از پیامک‌های گوشی پیدا و با تیک تأیید می‌شوند */
          if (recStartKey(item) && recStartKey(item) < today) setTimeout(() => { try { recScanSmsHistory(item, (n) => { if (n) showToast(toPersianDigits(String(n)) + ' واریز قبلی به آرشیو «' + (item.name || '') + '» اضافه شد'); }); } catch (eSc) {} }, 500);
        });
      };
      ok.onclick = save;
      cancel.onclick = close;
      const outside = (e) => {
        if (isDarkSelectTarget(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('#hkInfoTip, #hkInfoShield')) return;
        if (!sheet.contains(e.target)) close();
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inpName.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); inpAmt.focus(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      };
      inpAmt.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); try { maskStart.querySelector('input').focus(); } catch (e2) {} }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(actions);
      document.body.appendChild(sheet);
      setTimeout(() => {
        try {
          inpName.focus({ preventScroll: true });
          if (inpName.value) caretToEnd(inpName);
        } catch (e) {
          try { inpName.focus(); if (inpName.value) caretToEnd(inpName); } catch (e2) {}
        }
      }, 50);
    }

    function askAmountInput(label, currentValue, onSave, placeholderHint) {
      document.getElementById('textInputLabel').textContent = label || 'مبلغ';
      const field = document.getElementById('textInputField');
      field.inputMode = 'numeric';
      field.value = currentValue ? formatNum(currentValue) : '';
      field.placeholder = placeholderHint || label || 'مبلغ را وارد کنید';
      textInputCallback = (raw) => {
        field.inputMode = 'text';
        field.placeholder = 'بنویسید و تأیید کنید';
        onSave(parseAmount(raw));
      };
      document.getElementById('textInputModal').classList.add('open');
      placeTextInputSheet();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) bd.classList.add('open');
      // جداکننده زنده هنگام تایپ
      field.oninput = function amountLiveFormat() {
        const digits = toEnglishDigits(field.value).replace(/[^0-9]/g, '');
        if (!digits) { field.value = ''; return; }
        const n = parseInt(digits, 10) || 0;
        field.value = formatNum(n);
        try { field.setSelectionRange(field.value.length, field.value.length); } catch (e) {}
      };
      setTimeout(() => {
        try { field.focus(); caretToEnd(field); } catch (e) {}
        placeTextInputSheet();
      }, 50);
    }


