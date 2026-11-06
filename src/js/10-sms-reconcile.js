    /* ===== تطبیق «مانده» پیامک با موجودی نرم‌افزار (لایهٔ جدا؛ ثبت تراکنش دست‌نخورده) =====
       بعد از ثبت موفق پیامک، موجودی همان حساب در نرم‌افزار تا روز همین تراکنش با «مانده» پیامک مقایسه می‌شود.
       اگر فرق داشت، هشدار زرد نشان داده می‌شود و فقط با تأیید کاربر یک ردیف «اختلاف» درست قبل از همین تراکنش ثبت می‌شود. */
    /* مبلغ ریالی دقیق پیامکِ در حال ثبت، اگر کاربر مبلغ را عوض نکرده باشد */
    function hkSmsRialFor(amount) {
      try {
        var pe = pendingSmsEntry;
        var r = pe && Number(pe.amountRial);
        return (r && Math.round(r / 10) === Number(amount)) ? r : 0;
      } catch (e) { return 0; }
    }
    function hkRowRial(r) {
      var t = Number(r.amount) || 0, x = Number(r.amountRial) || 0;
      return (x && Math.round(x / 10) === t) ? x : t * 10;
    }
    /* مقایسهٔ «مانده» پیامک با موجودی حساب؛ اگر مانده و مبلغ ریالی دقیق داریم، به ریال (بدون خطای گرد کردن) */
    function hkReconCompare(snap, b, includeSelf) {
      var signed = snap.type === 'income' ? snap.amount : -snap.amount;
      var bal = Number(snap.balance) || 0;
      if (snap.balanceRial != null && isFinite(Number(snap.balanceRial))) {
        var sR = Number(snap.amountRial) || snap.amount * 10;
        var signedR = snap.type === 'income' ? sR : -sR;
        var balR = Number(snap.balanceRial);
        var allR = b.allR + (includeSelf ? 0 : signedR);
        if (Math.abs(balR - allR) <= 10 || Math.abs(balR - (b.beforeR + signedR)) <= 10) return null;
        var appT = b.all + (includeSelf ? 0 : signed);
        return { appBal: appT, diff: Math.round((balR - allR) / 10) || (balR > allR ? 1 : -1) };
      }
      var after = b.all + (includeSelf ? 0 : signed);
      if (Math.abs(bal - after) <= 1 || Math.abs(bal - (b.before + signed)) <= 1) return null;
      return { appBal: after, diff: bal - after };
    }
    function hkAccountBalanceUpTo(label, D) {
      var open = 0;
      try { open = Number(getAccountOpeningBalance(label)) || 0; } catch (e) {}
      var all = open, before = open, allR = open * 10, beforeR = open * 10;
      ['income', 'expense'].forEach(function (tab) {
        ((periodData && periodData[tab] && periodData[tab].sections) || []).forEach(function (sec) {
          ((sec && sec.rows) || []).forEach(function (r) {
            if (!r || r.deletedAt || (r.status || 'paid') !== 'paid') return;
            if ((r.account || '').trim() !== label) return;
            var sg = tab === 'income' ? 1 : -1;
            var a = (Number(r.amount) || 0) * sg, aR = hkRowRial(r) * sg;
            var dn = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0;
            if (!D || dn <= D) { all += a; allR += aR; }
            if (!D || dn < D) { before += a; beforeR += aR; }
          });
        });
      });
      return { all: all, before: before, allR: allR, beforeR: beforeR };
    }
    function hkSmsReconcile(snap) {
      try {
        if (!snap || snap.balance == null || !snap.bank || !snap.amount) return;
        if (typeof isLiveAccountLabel === 'function' && !isLiveAccountLabel(snap.bank)) return;
        if (snap.y !== currentYear || snap.m !== currentMonth) return;
        var b = hkAccountBalanceUpTo(snap.bank, snap.day);
        /* ترتیب تراکنش‌های همان روز معلوم نیست: اگر با «همهٔ ثبت‌های تا امروز» یا «قبل از امروز + همین تراکنش» یکی بود، مغایرتی نیست */
        var c = hkReconCompare(snap, b, true);
        if (!c) return;
        hkShowReconcileWarning(snap, c.appBal, c.diff);
      } catch (e) {}
    }
    function hkShowReconcileWarning(snap, appBal, diff, onChoice) {
      var old = document.getElementById('hkReconDlg'); if (old) old.remove();
      var miss = diff < 0 ? 'خرج' : 'درآمد', amt = Math.abs(diff);
      var sg = function (v) { return (v < 0 ? '−' : '') + formatNum(Math.abs(v)); };
      var tri = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 1.4 21h21.2z" fill="#ffc531" stroke="#ffc531" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 9v5.6" stroke="#1c1c1e" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.7" r="1.35" fill="#1c1c1e"/></svg>';
      var ov = document.createElement('div');
      ov.id = 'hkReconDlg'; ov.className = 'hk-recon-ov';
      ov.innerHTML = '<div class="hk-recon-box" role="alertdialog">' +
        '<div class="hk-recon-head"><span class="hk-recon-tri">' + tri + '</span><b>مغایرت موجودی «' + escapeHtml(snap.bank) + '»</b></div>' +
        '<div class="hk-recon-grid">' +
          '<span>مانده در پیامک بانک</span><b>' + sg(Number(snap.balance) || 0) + '</b>' +
          '<span>موجودی در نرم‌افزار بعد از این تراکنش</span><b>' + sg(appBal) + '</b>' +
          '<span>اختلاف</span><b class="hk-recon-diff">' + formatNum(amt) + '</b>' +
        '</div>' +
        '<div class="hk-recon-txt">یعنی احتمالاً حدود ' + formatNum(amt) + ' تومان ' + miss + ' از این حساب، بین آخرین ثبت و همین تراکنش، در نرم‌افزار ثبت نشده است' +
          (amt <= 2000 && diff < 0 ? ' (اختلاف کم معمولاً کارمزد بانک است)' : '') + '.</div>' +
        /* جهت اختلاف با نوع تراکنش جور نیست (برداشت ولی موجودی بیشتر، یا برعکس) */
        ((snap.type === 'expense' && diff > 0) || (snap.type === 'income' && diff < 0)
          ? '<div class="hk-recon-warn">جهت این اختلاف با نوع تراکنش جور نیست؛ ممکن است این پیامک مربوط به حساب دیگری (مثلاً حساب دیگری از همین بانک) باشد.</div>' : '') +
        '<div class="hk-recon-btns"><button type="button" class="hk-recon-add">ثبت ردیف اختلاف</button><button type="button" class="hk-recon-skip">نادیده بگیر</button>' +
          (onChoice ? '<button type="button" class="hk-recon-back">بازگشت</button>' : '') + '</div>' +
      '</div>';
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      if (onChoice) {
        /* پیش از ثبت: سه گزینه */
        ov.querySelector('.hk-recon-add').onclick = function (e) { e.stopPropagation(); close(); onChoice('add'); };
        ov.querySelector('.hk-recon-skip').onclick = function (e) { e.stopPropagation(); close(); onChoice('skip'); };
        ov.querySelector('.hk-recon-back').onclick = function (e) { e.stopPropagation(); close(); onChoice('back'); };
        ov.addEventListener('click', function (e) { if (e.target === ov) { close(); onChoice('back'); } });
      } else {
        ov.querySelector('.hk-recon-skip').onclick = function (e) { e.stopPropagation(); close(); };
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        ov.querySelector('.hk-recon-add').onclick = function (e) {
          e.stopPropagation(); close();
          hkInsertReconGapRow(snap, diff);
        };
      }
    }
    function hkInsertReconGapRow(snap, diff) {
      try {
        if (snap.y !== currentYear || snap.m !== currentMonth) { showToast('ماه این تراکنش باز نیست'); return; }
        var tab = diff < 0 ? 'expense' : 'income', amt = Math.abs(diff);
        var row = emptyRow(tab);
        /* ۱.۳.۶۲: روز همان تراکنش؛ اگر معلوم نبود امروز (تا ردیف بی‌روز ته جدول نرود) */
        var _td = getTodayPersian();
        row.day = snap.day ? String(snap.day) : ((_td && _td.y === snap.y && _td.m === snap.m) ? String(_td.d) : '');
        row.amount = amt;
        row.status = 'paid';
        row.account = snap.bank;
        row.desc = (amt <= 2000 && diff < 0) ? 'کارمزد / اختلاف جزئی بانک' : (diff < 0 ? 'مجموع خرج‌های ثبت‌نشده در این بازه' : 'مجموع درآمدهای ثبت‌نشده در این بازه');
        row.reconGap = true;
        row.createdAt = Date.now(); row.updatedAt = row.createdAt;
        try { if (typeof stampRowOwner === 'function') stampRowOwner(row); } catch (eS) {}
        /* درست قبل از ردیف همین تراکنش (اگر در همان جدول است) */
        var placed = false;
        /* ردیف همین تراکنش (و کارتی که در آن ثبت شده) */
        var hit = null, hitSec = null;
        ((periodData[snap.type] && periodData[snap.type].sections) || []).forEach(function (sec) {
          ((sec && sec.rows) || []).forEach(function (r) {
            if (r && !r.deletedAt && (r.account || '').trim() === snap.bank && Number(r.amount) === Number(snap.amount) &&
                String(r.day || '') === String(snap.day || '')) { hit = r; hitSec = sec; }
          });
        });
        /* ۱.۳.۶۵: ساعت همان تراکنش؛ بی‌ساعت آخر روز می‌افتاد و تراکنش‌های بعدی (مثلاً کارت دیگر) بالایش می‌رفتند */
        row.time = (hit && hit.time) || snap.time || '';
        if (tab === snap.type && hit && hitSec) { hitSec.rows.splice(hitSec.rows.indexOf(hit), 0, row); placed = true; }
        /* نوع مخالف (مثلاً پیامک برداشت ولی اختلاف درآمد): در همان کارت، جدول دیگر — نه کارت تازه */
        if (!placed && hitSec && (hitSec.title || '').trim()) {
          var ttl = (hitSec.title || '').trim();
          if (!periodData[tab]) periodData[tab] = { sections: [], nextId: 1 };
          if (!Array.isArray(periodData[tab].sections)) periodData[tab].sections = [];
          var same = periodData[tab].sections.find(function (sc) { return sc && (sc.title || '').trim() === ttl; });
          if (!same) {
            var nid = periodData[tab].nextId || (periodData[tab].sections.length + 1);
            same = { id: 's' + nid + '_rc', title: ttl, color: hitSec.color || tabAccentColor(tab), collapsed: false, rows: [] };
            periodData[tab].sections.push(same); periodData[tab].nextId = nid + 1;
          }
          if (!Array.isArray(same.rows)) same.rows = [];
          var ei0 = same.rows.findIndex(function (r) { return r && !r.desc && !r.amount && !r.day && !r.fromPlanId; });
          if (ei0 >= 0) same.rows.splice(ei0, 1);
          same.rows.push(row);
          same.rows.sort(function (a, b) { return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99); });
          same.collapsed = false;
          placed = true;
        }
        if (!placed) {
          var sec2 = ensureSmsSection(tab, tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی', periodData);
          if (!Array.isArray(sec2.rows)) sec2.rows = [];
          var ei = sec2.rows.findIndex(function (r) { return r && !r.desc && !r.amount && !r.day && !r.fromPlanId; });
          if (ei >= 0) sec2.rows.splice(ei, 1);
          sec2.rows.push(row);
          sec2.rows.sort(function (a, b) { return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99); });
          sec2.collapsed = false;
        }
        try { persistCurrent(); } catch (e1) {}
        try { scheduleSave(); } catch (e2) {}
        try { renderAll(); } catch (e3) {}
        showToast('ردیف اختلاف ثبت شد؛ می‌توانید ویرایشش کنید');
      } catch (e) { try { showToast('ثبت ردیف اختلاف ممکن نشد'); } catch (e4) {} }
    }
    /* اختلاف را ترتیب جابه‌جای ثبت توضیح می‌دهد؟ پیامک‌های قبلیِ هنوز ثبت‌نشدهٔ همین حساب (صف یا «پیامک‌های ثبت‌نشده»)
       و پیامک‌های بعدیِ زودتر ثبت‌شده (مثلاً تراکنش سوم قبل از دوم) → { n, later } ، وگرنه null */
    function hkPendingSmsExplains(snap, diff) {
      try {
        var cur = pendingSmsEntry, curRaw = cur ? String(cur.raw || '').trim() : '';
        var acc4 = cur ? hkSmsAcc4(cur.raw) : '';
        var key = function (y, m, d) { return (y || 0) * 10000 + (m || 0) * 100 + (d || 0); };
        var snapK = key(snap.y, snap.m, snap.day || 31);
        var raws = smsPendingQueue.map(function (x) { return x && x.raw; }).concat(smsLaterLoad().map(function (x) { return x.raw; }));
        var seen = {}, vals = [];
        raws.forEach(function (raw) {
          raw = String(raw || '').trim();
          if (!raw || raw === curRaw || seen[raw]) return;
          seen[raw] = 1;
          var pr = parseBankSms(raw);
          if (!pr || !pr.amount) return;
          var same = acc4 ? hkSmsAcc4(raw) === acc4 : ((matchSelectedBank(pr.bank) || '') === snap.bank);
          if (!same) return;
          var y = pr.year || snap.y; if (y > 0 && y < 100) y += 1400;
          if (key(y, pr.month || snap.m, parseInt(pr.day, 10) || 0) > snapK) return;
          vals.push({ v: pr.type === 'income' ? pr.amount : -pr.amount, later: false });
        });
        /* پیامک‌های همین حساب با همان روز یا بعد که زودتر ثبت شده‌اند (در موجودی نرم‌افزار هستند ولی در «مانده» این پیامک نه) */
        var dayK = key(snap.y, snap.m, snap.day || 0);
        smsDoneLogLoad().forEach(function (x) {
          if (!x || x.raw === curRaw || seen[x.raw]) return;
          var same = acc4 ? x.acc4 === acc4 : x.bank === snap.bank;
          if (!same || key(x.y, x.m, x.d) < dayK || x.y !== snap.y || x.m !== snap.m) return;
          seen[x.raw] = 1;
          vals.push({ v: -x.v, later: true });
        });
        vals = vals.slice(0, 12);
        /* هر زیرمجموعه‌ای از آن‌ها که دقیقاً اختلاف را بسازد (ترتیب ساعت تراکنش‌های یک روز معلوم نیست) */
        var best = null;
        for (var mask = 1; mask < (1 << vals.length); mask++) {
          var sum = 0, n = 0, lat = false;
          for (var i = 0; i < vals.length; i++) if (mask & (1 << i)) { sum += vals[i].v; n++; if (vals[i].later) lat = true; }
          if (Math.abs(sum - diff) <= 1 && (!best || n < best.n)) best = { n: n, later: lat };
        }
        return best;
      } catch (e) { return 0; }
    }
    /* پیش از ثبت: موجودی حساب بعد از این تراکنش با «مانده» پیامک مقایسه شود (فقط ماهِ باز) */
    function hkReconPrecheck(snap) {
      try {
        if (!snap || snap.balance == null || !snap.bank || !snap.amount) return null;
        if (typeof isLiveAccountLabel === 'function' && !isLiveAccountLabel(snap.bank)) return null;
        if (snap.y !== currentYear || snap.m !== currentMonth) return null;
        var b = hkAccountBalanceUpTo(snap.bank, snap.day);
        var c = hkReconCompare(snap, b, false);
        if (c) {
          /* اختلاف از پیامک‌های قبلیِ هنوز ثبت‌نشدهٔ همین حساب است → هشدار و «ردیف اختلاف» لازم نیست؛ فقط پیامی کوتاه */
          var np = hkPendingSmsExplains(snap, c.diff);
          if (np) {
            try { showToast(np.later ? 'ترتیب ثبت پیامک‌های این حساب جابه‌جا شد؛ موجودی درست است' : ((np.n > 1 ? toPersianDigits(String(np.n)) + ' پیامک' : 'پیامک') + ' قبلی این حساب هنوز ثبت نشده')); } catch (eT) {}
            return null;
          }
        }
        return c;
      } catch (e) { return null; }
    }
    (function () {
      if (typeof confirmSmsEntry !== 'function' || confirmSmsEntry._hkRecon) return;
      var _origConfirm = confirmSmsEntry;
      function snapNow() {
        try {
          var pe = pendingSmsEntry;
          if (!pe || pe.balance == null) return null;
          var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
          var bank = String(g('smsConfirmBank') || '').trim();
          var labels = (typeof selectedAccountLabels === 'function') ? selectedAccountLabels() : [];
          if (bank && labels.indexOf(bank) < 0) bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(bank) || '') : '';
          if (!bank && pe.bank) bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(pe.bank) || '') : '';
          var dd = parseInt(toEnglishDigits(String(g('smsConfirmDay') || pe.day || '')).replace(/[^0-9]/g, ''), 10) || 0;
          var mm = parseInt(toEnglishDigits(String(g('smsConfirmMonth') || '')).replace(/[^0-9]/g, ''), 10) || pe.month || currentMonth;
          var yy = parseInt(toEnglishDigits(String(g('smsConfirmYear') || '')).replace(/[^0-9]/g, ''), 10) || pe.year || currentYear;
          if (yy > 0 && yy < 100) yy = Math.floor((currentYear || 1400) / 100) * 100 + yy;
          var amtNow = parseAmount(g('smsConfirmAmount') || pe.amount);
          return { balance: pe.balance, balanceRial: pe.balanceRial, amountRial: hkSmsRialFor(amtNow), bank: bank, type: g('smsConfirmType') === 'income' ? 'income' : 'expense',
            amount: amtNow, day: (dd >= 1 && dd <= 31) ? dd : 0, m: mm, y: yy,
            /* ۱.۳.۶۵: ساعت همین پیامک (ردیف اختلاف با همین ساعت، درست قبل از تراکنش) */
            time: (function () { try { return hkSmsTime(pe.raw, Number(pe.receivedAt) || 0) || ''; } catch (eT) { return ''; } })() };
        } catch (e) { return null; }
      }
      var wrapped = function () {
        var self = this, args = arguments;
        var mdl = document.getElementById('smsConfirmModal');
        /* تصمیم کاربر دربارهٔ مغایرت قبلاً گرفته شده (بعد از «ثبت ردیف اختلاف» یا «نادیده بگیر») */
        var dec = window._hkReconPass;
        if (dec) {
          var r0 = _origConfirm.apply(self, args);
          try {
            if (mdl && !mdl.classList.contains('open')) {
              window._hkReconPass = null;
              if (dec.add) setTimeout(function () { hkInsertReconGapRow(dec.snap, dec.diff); }, 150);
            }
          } catch (e1) {}
          return r0;
        }
        var snap = snapNow();
        var chk = snap ? hkReconPrecheck(snap) : null;
        if (chk) {
          hkShowReconcileWarning(snap, chk.appBal, chk.diff, function (choice) {
            if (choice === 'back') return;               /* برگشت به باکس ثبت پیامک؛ چیزی ثبت نمی‌شود */
            window._hkReconPass = { add: choice === 'add', snap: snap, diff: chk.diff };
            try { confirmSmsEntry(); } catch (e2) {}
          });
          return;
        }
        return _origConfirm.apply(self, args);
      };
      wrapped._hkRecon = true;
      confirmSmsEntry = wrapped;
      try { window.confirmSmsEntry = wrapped; } catch (eW) {}
    })();
    /* ===== تشخیص حساب از رقم‌های آخر شماره حساب/کارت در پیامک (لایهٔ جدا) =====
       اگر چهار رقم آخر قبلاً به حسابی وصل شده، همان حساب انتخاب می‌شود.
       اگر شماره‌ای تازه از بانکی بیاید که در نرم‌افزار حساب دارد (و نمی‌شود مطمئن بود کدام است)،
       انتخاب حساب خالی می‌ماند، فهرست حساب‌ها باز می‌شود و تا حساب انتخاب نشود ثبت انجام نمی‌شود. */
    function hkSmsAcc4(raw) {
      try {
        var t = normalizeSmsText(raw || '');
        /* «6037-99**-****-2222» → «603799******2222» */
        /* ۱.۳.۶۵: فقط فاصله/خط تیره داخل یک سطر؛ سطر بعدی (مثلاً تاریخ «0727-09:00») به شماره نمی‌چسبد */
        t = t.replace(/([0-9*xX×•])[\- \t\u00a0](?=[0-9*xX×•])/g, '$1');
        var m = t.match(/[0-9]{0,8}[*xX×•.]{2,}[0-9]{3,}/);
        var tok = m ? m[0] : '';
        if (!tok) {
          var m2 = t.match(/(?:حساب|کارت|سپرده|شماره)\s*(?:شماره)?\s*[:：]?\s*([0-9][0-9\-]{3,})/);
          tok = m2 ? m2[1] : '';
        }
        /* شمارهٔ حساب/کارت کامل هر جای پیامک («برداشت از:3130…»، «واریز سود به: 3130…»): رشتهٔ ۱۰ رقمی یا بیشتر بدون کاما،
           به‌جز شمارهٔ پیگیری/مرجع و عددی که کنار «مبلغ/مانده» یا «ریال/تومان» آمده (مبلغ بی‌کاما) */
        if (!tok) {
          var re = /[0-9]{10,}/g, mm;
          while ((mm = re.exec(t))) {
            var before = t.slice(Math.max(0, mm.index - 16), mm.index), after = t.slice(mm.index + mm[0].length, mm.index + mm[0].length + 8);
            if (/(پیگیری|پيگيري|مرجع|ارجاع|رهگیری|سند|شناسه)/.test(before)) continue;
            if (/(مبلغ|مانده|موجودی|موجودي)\s*[:：]?\s*$/.test(before) || /^\s*(ریال|ريال|تومان|rial)/i.test(after)) continue;
            if (/[,٬]$/.test(before)) continue;
            tok = mm[0]; break;
          }
        }
        var d = String(tok).replace(/[^0-9]/g, '');
        var tail = String(tok).match(/([0-9]+)\D*$/);
        var last = tail ? tail[1] : d;
        if (last.length < 3) return '';
        return last.slice(-4);
      } catch (e) { return ''; }
    }
    /* اطلاعیه، نه تراکنش: پیامک بی‌مانده با فعل آینده/اطلاع‌رسانی («… برداشت می‌گردد»، «خواهد شد»، «مشتری گرامی») */
    function hkIsSmsNotice(raw, p) {
      if (p && p.balance != null) return false;
      var t = String(raw || '');
      try { t = normalizeSmsText(t); } catch (e) {}
      return /(می\s*[\u200c]?\s*گردد|مي\s*[\u200c]?\s*گردد|خواهد\s*(شد|گردید|گرديد)|مشتری\s*گرامی|مشتري\s*گرامي|کاربر\s*گرامی)/.test(t);
    }
    /* فرستندهٔ شخصی: شمارهٔ موبایل ایران (۰۹…، ‎+۹۸۹…، ۹۸۹…). بانک‌ها از این شماره‌ها پیامک نمی‌فرستند */
    function hkIsPersonalSender(addr) {
      var a = toEnglishDigits(String(addr || '')).replace(/[\s\-()]/g, '');
      return /^(\+98|0098|98|0)9[0-9]{9}$/.test(a);
    }
    function hkAcc4Label(acc4) {
      if (!acc4 || typeof smsAccountBankMap !== 'object' || !smsAccountBankMap) return '';
      var live = function (lb) { return lb && (typeof isLiveAccountLabel !== 'function' || isLiveAccountLabel(lb)) ? lb : ''; };
      var v = live(smsAccountBankMap['L4:' + acc4]);
      if (v) return v;
      var found = '';
      Object.keys(smsAccountBankMap).forEach(function (k) {
        if (found || k.indexOf('L4:') === 0) return;
        var dk = String(k).replace(/[^0-9]/g, '');
        if (dk.length >= 4 && dk.slice(-4) === acc4) found = live(smsAccountBankMap[k]);
      });
      return found;
    }
    function hkLabelHasAcc(label) {
      var has = false;
      try { Object.keys(smsAccountBankMap || {}).forEach(function (k) { if (smsAccountBankMap[k] === label && /[0-9]{3,}/.test(k)) has = true; }); } catch (e) {}
      return has;
    }
    function hkSmsAccountRoute(parsed) {
      /* قانون برای همهٔ بانک‌ها: اگر رقم‌های آخر حساب قبلاً به حسابی وصل شده → همان حساب.
         اگر شماره هنوز شناخته نشده (یا شماره‌ای در پیامک نیست و چند/هیچ حسابی از آن بانک ثبت است) → حساب خالی می‌ماند و باید انتخاب شود. */
      var out = { label: '', need: false, acc4: '' };
      try {
        var raw = parsed && parsed.raw; if (!raw) return out;
        var acc4 = hkSmsAcc4(raw); out.acc4 = acc4;
        if (acc4) {
          var mapped = hkAcc4Label(acc4);
          if (mapped) { out.label = mapped; return out; }
        }
        var bankName = '';
        try { bankName = detectBankFromSms(raw, true) || (parsed.sender ? hkSenderBank(parsed.sender) : '') || detectBankFromSms(raw) || ''; } catch (eB) {}
        out.bankName = bankName; out.bankShort = bankName ? (bankShortLabel(bankName) || bankName) : '';
        var same = [];
        if (bankName) {
          var short = bankShortLabel(bankName);
          same = (selectedBankAccounts || []).filter(function (a) {
            var b2 = accountBank(a), l = accountLabel(a);
            return b2 === bankName || l === bankName || bankShortLabel(b2) === short || bankShortLabel(l) === short || (short && b2 && b2.indexOf(short) >= 0);
          }).map(function (a) { return accountLabel(a); });
        }
        /* ۱.۳.۴۷: اسم بانک هم بررسی می‌شود: رقم‌های تازه + تنها حساب آزادِ همان بانک → همان حساب (پیش‌انتخاب)؛
           هیچ حسابی از آن بانک نیست → حساب تازه (فیلد نام، بی منوی کشویی) */
        if (acc4) {
          var mp = (typeof smsAccountBankMap === 'object' && smsAccountBankMap) || {};
          var freeSame = same.filter(function (lb) { return !Object.keys(mp).some(function (k) { return /^L4:/.test(k) && mp[k] === lb && k !== 'L4:' + acc4; }); });
          if (freeSame.length === 1) { out.label = freeSame[0]; return out; }
          out.need = true;
          if (!same.length) out.newAcc = true;
          return out;
        }
        if (same.length === 1) { out.label = same[0]; return out; }
        out.need = true;
        if (bankName && !same.length) out.newAcc = true;
      } catch (e) {}
      return out;
    }
    (function () {
      if (typeof openSmsConfirmModal !== 'function' || openSmsConfirmModal._hkAcc) return;
      var _origOpen = openSmsConfirmModal;
      var wrappedOpen = function (parsed) {
        window._hkReconPass = null;
        var route = hkSmsAccountRoute(parsed);
        if (parsed) { parsed._acc4 = route.acc4; parsed._needAccount = route.need; if (route.label) parsed.bank = route.label; }
        var res = _origOpen.apply(this, arguments);
        try {
          var sel = document.getElementById('smsConfirmBank');
          if (sel && (route.label || route.need)) {
            sel.value = route.need ? '' : route.label;
            try { if (sel._fancyRender) sel._fancyRender(); } catch (eF) {}
          }
          var old = document.getElementById('smsAccNewNote'); if (old) old.remove();
          var oldN = document.getElementById('smsNewAccWrap'); if (oldN) oldN.remove();
          try { var aw0 = (sel && sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel; if (aw0) aw0.style.display = ''; } catch (eAw) {}
          if (sel && route.need && route.newAcc) {
            hkSmsBuildNewAcc(sel, route);
          } else if (sel && route.need) {
            hkSmsAccNeedNote(sel, route);
          }
        } catch (eR) {}
        return res;
      };
      /* ۱.۳.۵۰: «＋ افزودن حساب» در منوی حساب: منو پنهان و فیلد «حساب جدید» همان‌جا (با «ثبت» حساب با موجودی پیامک ساخته می‌شود) */
      window.hkSmsInlineNewAcc = function (sel) {
        try {
          var r0 = {}; try { r0 = hkSmsAccountRoute(pendingSmsEntry) || {}; } catch (eR0) {}
          var nn = document.getElementById('smsAccNewNote'); if (nn) nn.remove();
          var aw1 = (sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel;
          aw1.classList.remove('sms-acc-need');
          hkSmsBuildNewAcc(sel, r0, true);
          setTimeout(function () { try { document.getElementById('smsNewAccName').focus(); } catch (eF) {} }, 80);
        } catch (e) {}
      };
      function hkSmsBuildNewAcc(sel, route, manual) {
          var oldN2 = document.getElementById('smsNewAccWrap'); if (oldN2) oldN2.remove();
          if (true) {
            /* ۱.۳.۴۷: حساب تازه: «حساب ملی ۱۲۳۴ هنوز ساخته نشده» + فیلد نام (پیشنهادی، قابل تایپ)؛ با «ثبت» حساب با موجودیِ پیامک ساخته می‌شود */
            var aw = (sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel;
            aw.style.display = 'none';
            /* ۱.۳.۶۵: همان باکس ثبت گروهی (بانک و چهار رقم در نام پیشنهادی/جای‌نما) */
            var sug = (route.bankShort || '') + (route.acc4 ? (route.bankShort ? ' ' : 'حساب ') + toPersianDigits(route.acc4) : '');
            var nb = hkNewAccBox((route.bankShort || 'ملی') + (route.acc4 ? ' ' + toPersianDigits(route.acc4) : ''), (sug && !hkAccNameTaken(sug)) ? sug : '');
            var nw = nb.wrap; nw.id = 'smsNewAccWrap'; nw.classList.add('sms-newacc-box');
            var ni = nb.input; ni.id = 'smsNewAccName';
            nw._route = route;
            aw.insertAdjacentElement('afterend', nw);
          }
      }
      function hkSmsAccNeedNote(sel, route) {
          if (true) {
            var note = document.createElement('div');
            note.id = 'smsAccNewNote'; note.className = 'sms-acc-new';
            note.textContent = (route.acc4 ? ('حساب ' + (route.bankShort ? route.bankShort + ' ' : '') + toPersianDigits(route.acc4) + ' هنوز شناخته نشده.') : 'حساب این پیامک مشخص نیست.') +
              ' حساب را انتخاب کنید یا «＋ افزودن حساب» را بزنید.';
            var anchorEl = (sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel;
            anchorEl.classList.add('sms-acc-need');
            anchorEl.insertAdjacentElement('afterend', note);
            /* با انتخاب حساب، زردی و پیام برداشته شود */
            sel.addEventListener('change', function () {
              if (sel.value && sel.value !== '__add_account__') { anchorEl.classList.remove('sms-acc-need'); var nn = document.getElementById('smsAccNewNote'); if (nn) nn.remove(); }
            });
          }
      }
      wrappedOpen._hkAcc = true;
      openSmsConfirmModal = wrappedOpen;
      try { window.openSmsConfirmModal = wrappedOpen; } catch (eW) {}
    })();
    (function () {
      if (typeof confirmSmsEntry !== 'function' || confirmSmsEntry._hkAccGate) return;
      var _prev = confirmSmsEntry;
      var gated = function () {
        var pe = pendingSmsEntry, sel = document.getElementById('smsConfirmBank');
        /* ۱.۳.۴۷: حساب تازه با نامِ تایپ‌شده و موجودیِ پیامک ساخته و انتخاب می‌شود */
        var nw = document.getElementById('smsNewAccWrap');
        if (pe && sel && nw && nw.isConnected) {
          var nm = String((document.getElementById('smsNewAccName') || {}).value || '').replace(/\s+/g, ' ').trim();
          if (!nm) { showToast('نام حساب تازه را بنویسید'); try { document.getElementById('smsNewAccName').focus(); } catch (eF) {} return; }
          if (hkAccNameTaken(nm)) { showToast('این نام در «انتخاب حساب» هست؛ نام دیگری بنویسید'); return; }
          var rt = nw._route || {}, tN = getTodayPersian();
          var amtN = Number(pe.amount) || 0, isIncN = pe.type === 'income';
          var openN = pe.balance != null ? (Number(pe.balance) || 0) - (isIncN ? amtN : -amtN) : 0;
          selectedBankAccounts.push({ id: 'ba_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), bank: rt.bankName || '', label: nm,
            srcName: (rt.bankName || '') + (rt.acc4 ? ' · ' + toPersianDigits(rt.acc4) : ''), openingBalance: openN, createdAt: { y: tN.y, m: tN.m, d: tN.d } });
          try { saveBankAccountsSelection(); } catch (eSv) {}
          var on = document.createElement('option'); on.value = nm; on.textContent = nm; sel.appendChild(on); sel.value = nm;
          nw.remove();
          try { showToast('حساب «' + nm + '» ساخته شد'); } catch (eT) {}
        }
        var chosen = sel ? String(sel.value || '').trim() : '';
        if (chosen === '__add_account__') chosen = '';
        /* بدون حساب هیچ پیامکی ثبت نمی‌شود */
        if (pe && sel && !chosen) {
          showToast('اول حساب این پیامک را انتخاب کنید');
          try { var w = (sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel; w.classList.add('sms-acc-need'); } catch (eB) {}
          return;
        }
        var acc4 = pe && pe._acc4;
        var res = _prev.apply(this, arguments);
        try {
          var mdl = document.getElementById('smsConfirmModal');
          if (acc4 && chosen && mdl && !mdl.classList.contains('open')) {
            smsAccountBankMap['L4:' + acc4] = chosen;
            saveSmsAccountBankMap();
          }
        } catch (eS) {}
        return res;
      };
      gated._hkAccGate = true; gated._hkRecon = true;
      confirmSmsEntry = gated;
      try { window.confirmSmsEntry = gated; } catch (eW) {}
    })();
    /* ===== ۱.۳.۴۷: دسته‌ها زیر «بابت چی بود؟» به‌صورت آیکون (۲ یا ۳ ردیف)؛ انتخاب دسته = یاد گرفتن همین شرح در آن دسته ===== */
    var HK_CAT_ICONS = {
      /* ۱.۳.۸۳: جیب به جیب = همان ⇄ رفت‌وبرگشتِ کنار مبلغ در جدول. هیچ دو دسته‌ای (مخارج و درآمد با هم) یک شکل نیستند؛ فقط «هدیه و کمک» در هر دو نوع مشترک است */
      p2p: '<path d="M4 8h14.5l-3.5-3.5"/><path d="M20 16H5.5L9 19.5"/>',
      food: '<path d="M6 3v5a2 2 0 0 0 4 0V3M8 3v18"/><ellipse cx="16.5" cy="6.8" rx="2.8" ry="3.8"/><path d="M16.5 10.6V21"/>',
      transport: '<rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 11l2-5h8l2 5"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
      bills: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
      clothing: '<path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z"/>',
      health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/><path d="M12 10v5M9.5 12.5h5"/>',
      home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
      education: '<path d="M12 6.5C10 5 7 4.6 3 5v13c4-.4 7 0 9 1.5 2-1.5 5-1.9 9-1.5V5c-4-.4-7 0-9 1.5z"/><path d="M12 6.5v13"/>',
      fun: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 9.3l6-.7z"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8c-1.5-3.5-5-4-5-2s3 2 5 2c2 0 5 0 5-2s-3.5-1.5-5 2"/>',
      debt: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
      tech: '<rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M10.5 5h3"/><circle cx="12" cy="18.3" r=".9"/>'
    };
    var HK_CAT_TAG = '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>';
    /* ۱.۳.۴۸: دسته‌های واریز (کوتاه) */
    var HK_INCOME_CATS = [
      { id: 'in_salary', label: 'حقوق' }, { id: 'in_rent', label: 'اجاره' }, { id: 'in_loanback', label: 'تسویه قرض' } /* ۱.۳.۶۸: جای «اضافه‌کار» */,
      { id: 'in_bonus', label: 'پاداش' }, { id: 'in_gift', label: 'هدیه و کمک' }, { id: 'in_sale', label: 'فروش' }, { id: 'in_profit', label: 'سود' }
    ];
    HK_CAT_ICONS.in_salary = '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>';
    /* ۱.۳.۸۳: اجاره = کلید (با «لوازم خانه» یکی نباشد) */
    HK_CAT_ICONS.in_rent = '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M18 12v3.2M15 12v2.2"/>';
    /* ۱.۳.۸۳: تسویه قرض = سکه روی دست (فلش‌ها مال «جیب به جیب» شد) */
    HK_CAT_ICONS.in_loanback = '<circle cx="14.5" cy="6" r="3"/><path d="M2 13.5h3.5L9 12h4.2a1.6 1.6 0 0 1 0 3.2H10"/><path d="M5.5 20.5H13l6.6-4.4a1.6 1.6 0 0 0-1.9-2.6l-4.2 2.3"/><path d="M2 20.5h3.5"/>';
    /* ۱.۳.۸۳: پاداش = مدال گل‌دار با تیک و دو روبان */
    HK_CAT_ICONS.in_bonus = '<path d="M12 2.3L13.6 3.5L15.6 3.3L16.4 5.1L18.2 5.9L18 7.9L19.2 9.5L18 11.1L18.2 13.1L16.4 13.9L15.6 15.7L13.6 15.5L12 16.7L10.4 15.5L8.4 15.7L7.6 13.9L5.8 13.1L6 11.1L4.8 9.5L6 7.9L5.8 5.9L7.6 5.1L8.4 3.3L10.4 3.5z"/><circle cx="12" cy="9.5" r="3.6"/><path d="M10.4 9.6l1.1 1.1 2.2-2.3"/><path d="M9 15.6l-1.8 5.6 2.3-.9 1.4 2 1-3.9M15 15.6l1.8 5.6-2.3-.9-1.4 2-1-3.9"/>';
    HK_CAT_ICONS.in_gift = HK_CAT_ICONS.gift;
    /* ۱.۳.۸۳: فروش = چرخ خرید با فلش رو به بالا */
    HK_CAT_ICONS.in_sale = '<path d="M2 4h3l2.3 10.5h11.4L21 6.5H5.9"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M13.2 12.6V7.8M11.2 9.8l2-2 2 2"/>';
    HK_CAT_ICONS.in_profit = '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>';
    /* شمار استفادهٔ هر دسته در ثبت پیامک (برای چیدن ۵ دستهٔ اول) */
    function hkCatUseLoad() { try { var o = JSON.parse(localStorage.getItem(STORAGE_KEY + '_catUse') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
    function hkCatUseBump(id) { try { var o = hkCatUseLoad(); o[id] = (o[id] || 0) + 1; localStorage.setItem(STORAGE_KEY + '_catUse', JSON.stringify(o)); } catch (e) {} try { hkSyncNotifCats(); } catch (e2) {} }
    /* ۱.۳.۵۰: چهار دستهٔ پرکاربرد (هزینه/درآمد) برای دکمه‌های اعلان پیامک */
    function hkSyncNotifCats() {
      var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.BankSms;
      if (!P || typeof P.setNotifCats !== 'function') return;
      var use = hkCatUseLoad();
      var top4 = function (list, kind) { return list.map(function (c, i) { return { c: c, s: hkCatScore(kind, c.id, use, i) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4).map(function (x) { return { k: x.c.id, l: x.c.label }; }); };
      var out = []; try { out = top4(HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); }), 'out'); } catch (e) {}
      var inc = []; try { inc = top4(HK_INCOME_CATS.slice(), 'in'); } catch (e) {}
      /* ۱.۳.۵۱: برای تشخیص «بی‌مشکل» در خود اعلان: رقم‌های حساب‌های شناخته‌شده و مبلغ درآمدهای ثابت (تومان و ریال) */
      var acc4 = [];
      try { var mp = (typeof smsAccountBankMap === 'object' && smsAccountBankMap) || {}; Object.keys(mp).forEach(function (k) { var m = /^L4:(\d{3,})$/.exec(k); if (m && mp[k] && isLiveAccountLabel(mp[k])) acc4.push(m[1]); }); } catch (e) {}
      var rec = [];
      try { (recurringIncomes || []).forEach(function (r) { var a = Math.round(Number(r && r.amount) || 0); if (a > 0) { rec.push(String(a)); rec.push(String(a * 10)); } }); } catch (e) {}
      try { P.setNotifCats({ out: JSON.stringify(out), inc: JSON.stringify(inc), acc4: JSON.stringify(acc4), rec: JSON.stringify(rec), personal: hkPrefs().nPersonal === false ? '0' : '1', block: JSON.stringify(hkBlockedLoad().filter(function (x) { return x.d; }).map(function (x) { return String(x.d).slice(-4); })), blockS: JSON.stringify([].concat.apply([], hkBlockedLoad().filter(function (x) { return !x.d && x.s && x.personal; }).map(function (x) { return x.s.map(hkSenderNorm); }))) }).catch(function () {}); } catch (e) {}
    }
    try { window.hkSyncNotifCats = hkSyncNotifCats; } catch (eW) {}
    setTimeout(function () { try { hkSyncNotifCats(); } catch (e) {} }, 4000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { try { hkSyncNotifCats(); } catch (e) {} } });
    function closeSmsCatMore() { var o = document.getElementById('smsCatMore'); if (o) { o.remove(); return true; } return false; }
    /* ۱.۳.۷۶: رنگ هر دسته (آیکون‌های رنگی، یکسان در باکس پیامک و ویرایش ردیف) */
    /* ۱.۳.۸۳: رنگ ثابت و یکتای هر دسته (همه‌جا همین؛ CLAUDE.md). فقط «هدیه و کمک» در مخارج و درآمد مشترک است.
       جیب به جیب نقره‌ای با قاب نقطه‌چین: معلوم باشد چیز متفاوتی است */
    var HK_CAT_COLORS = { food: '#ff9f0a', transport: '#4f9dff', bills: '#e6b12c', home: '#c78b5a', clothing: '#ff6ba8', health: '#16a34a',
      education: '#7c7cff', fun: '#30d5c8', gift: '#e85dff', debt: '#8e8e93', tech: '#64d2ff',
      in_salary: '#9ee858', in_rent: '#bf5af2', in_loanback: '#c0ca33', in_bonus: '#ffd60a', in_gift: '#e85dff', in_sale: '#ffb38a', in_profit: '#32d74b', p2p: '#ff453a' };
    /* ۱.۳.۸۴: سلامت و بهداشت سبز پررنگ، جیب به جیب قرمز (همچنان یکتا) */
    function hkCatColor(id) { return HK_CAT_COLORS[id] || '#08b5f5'; }
    /* پنجرهٔ انتخاب دسته با همان چیدمان ۵ستونی رنگی (برای ویرایش ردیف) */
    function hkCatPickSheet(cats, cur, onPick) {
      var old = document.getElementById('hkCatPick'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkCatPick'; ov.className = 'modal-overlay open sms-cat-more-ov'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100650;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box sms-cat-more-box';
      bx.innerHTML = '<div class="sms-cat-more-t">دسته</div>';
      var gg = document.createElement('div'); gg.className = 'sms-cat-grid hk-cat-colored';
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      /* ۱.۳.۸۰: «نامشخص» آخرین دسته */
      cats.concat([{ id: '', label: 'نامشخص' }]).forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat' + (c.id === cur ? ' on' : ''); b.dataset.cat = c.id;
        b.style.setProperty('--cc', c.id ? hkCatColor(c.id) : '#8e8e93');
        b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (c.id ? (HK_CAT_ICONS[c.id] || HK_CAT_TAG) : '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1M12 16v.1"/>') + '</svg></i><span>' + escapeHtml(c.label) + '</span>';
        if (c.id === 'p2p') hkP2PDecorate(b);
        b.onclick = function () { close(); onPick(c.id); if (c.id === 'p2p') hkP2PIntro(false); };
        gg.appendChild(b);
      });
      bx.appendChild(gg); ov.appendChild(bx);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
    }
    function hkSmsCatGrid(parsed) {
      var old = document.getElementById('smsCatGrid'); if (old) old.remove();
      window._hkSmsCat = '';
      if (!parsed) return;
      var desc = document.getElementById('smsConfirmDesc'); if (!desc) return;
      /* ۱.۳.۴۸: درآمد هم دسته‌های کوتاه خودش را دارد؛ دسته‌ها در یک نوار افقی جمع‌وجور (با یک ضربه) */
      var cats = [];
      if (parsed.type === 'income') cats = HK_INCOME_CATS.slice();
      else { try { cats = HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); }); } catch (e) { return; } }
      cats = cats.concat([HK_P2P_CAT]);
      if (!cats.length) return;
      /* ۱.۳.۴۹: فقط ۵ دستهٔ هوشمند در یک ردیف (بی اسکرول) + «بیشتر…»؛ زدن هر دسته = ثبت همان لحظه (یک کلیک).
         ترتیب: دستهٔ حدس‌زده از شرح/متن پیامک، بعد پرکاربردترین‌ها، بعد ترتیب پیش‌فرض */
      var use = hkCatUseLoad(), guess = '';
      try { if (parsed.type !== 'income') { var gc = HKCategorizer.classify(String(desc.value || '') || String(parsed.raw || '')); if (gc && gc.ids && gc.ids[0]) guess = gc.ids[0]; } } catch (eG) {}
      var order = cats.map(function (c, i) { return { c: c, s: (c.id === guess ? 1e6 : 0) + hkCatScore(parsed.type === 'income' ? 'in' : 'out', c.id, use, i) }; })
        .sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.c; });
      /* ۱.۳.۷۶: دو ردیف پنج‌تایی (۹ دسته + «بیشتر»)، آیکون‌های رنگی */
      var top = order.length > 10 ? order.slice(0, 9) : order.slice(0, 10), rest = order.length > 10 ? order.slice(9) : [];
      var g = document.createElement('div'); g.id = 'smsCatGrid'; g.className = 'sms-cat-grid sms-cat-row hk-cat-colored';
      /* ۱.۳.۵۰: زدن دسته فقط انتخاب است؛ با «ثبت»: شرح نوشته‌شده می‌ماند (دسته = همین)، شرح خالی = اسم دسته */
      var pick = function (c) {
        window._hkSmsCat = window._hkSmsCat === c.id ? '' : c.id;
        var more = g.querySelector('.sms-cat-more');
        g.querySelectorAll('.sms-cat').forEach(function (x) { x.classList.toggle('on', x.dataset.cat === window._hkSmsCat); });
        if (more) { var inTop = top.some(function (t) { return t.id === window._hkSmsCat; }); more.classList.toggle('on', !!window._hkSmsCat && !inTop); var sp = more.querySelector('span'); if (sp) sp.textContent = (!!window._hkSmsCat && !inTop) ? (rest.filter(function (t) { return t.id === window._hkSmsCat; })[0] || {}).label || 'بیشتر…' : 'بیشتر…'; }
        try { closeSmsCatMore(); } catch (eM) {}
      };
      var mk = function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat'; b.dataset.cat = c.id;
        b.style.setProperty('--cc', hkCatColor(c.id));
        b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (HK_CAT_ICONS[c.id] || HK_CAT_TAG) + '</svg></i><span>' + escapeHtml(c.label) + '</span>';
        if (c.id === 'p2p') hkP2PDecorate(b);
        b.onclick = function () { pick(c); if (c.id === 'p2p' && window._hkSmsCat === 'p2p') { try { hkP2PIntro(false); } catch (e) {} } };
        return b;
      };
      top.forEach(function (c) { g.appendChild(mk(c)); });
      if (rest.length) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'sms-cat sms-cat-more';
        more.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg></i><span>بیشتر…</span>';
        more.onclick = function () {
          closeSmsCatMore();
          var ov = document.createElement('div'); ov.id = 'smsCatMore'; ov.className = 'modal-overlay open sms-cat-more-ov';
          ov.style.cssText = 'z-index:100650;display:flex;align-items:center;justify-content:center;';
          var bx = document.createElement('div'); bx.className = 'modal-box sms-cat-more-box';
          bx.innerHTML = '<div class="sms-cat-more-t">دستهٔ دیگر</div>';
          var gg = document.createElement('div'); gg.className = 'sms-cat-grid hk-cat-colored';
          rest.forEach(function (c) { gg.appendChild(mk(c)); });
          bx.appendChild(gg); ov.appendChild(bx);
          ov.addEventListener('click', function (e) { if (e.target === ov) closeSmsCatMore(); });
          document.body.appendChild(ov);
        };
        g.appendChild(more);
      }
      var sug = document.getElementById('smsPlanSuggest');
      var anc = sug || desc._micWrap || desc;
      if (anc.parentNode) anc.parentNode.insertBefore(g, anc.nextSibling);
    }
    (function () {
      if (typeof openSmsConfirmModal === 'function' && !openSmsConfirmModal._hkCat) {
        var _o = openSmsConfirmModal;
        var w = function (parsed) { var r = _o.apply(this, arguments); try { hkSmsCatGrid(parsed); } catch (e) {} return r; };
        Object.keys(_o).forEach(function (k) { try { w[k] = _o[k]; } catch (eK) {} });
        w._hkCat = true;
        openSmsConfirmModal = w; try { window.openSmsConfirmModal = w; } catch (eW) {}
      }
      if (typeof confirmSmsEntry === 'function' && !confirmSmsEntry._hkCat) {
        var _c = confirmSmsEntry;
        var wc = function () {
          var cat = window._hkSmsCat, d = document.getElementById('smsConfirmDesc');
          /* ۱.۳.۸۲: جیب به جیب: ردیف تازه علامت می‌خورد (در جمع‌ها حساب نمی‌شود)؛ دسته‌بندی شرح یاد گرفته نمی‌شود */
          if (cat === 'p2p') {
            var _t0 = Date.now(), _amt0 = 0; try { _amt0 = parseAmount(document.getElementById('smsConfirmAmount').value) || 0; } catch (eA0) {}
            var _res0 = _c.apply(this, arguments);
            try {
              var mdl0 = document.getElementById('smsConfirmModal');
              if (!(mdl0 && mdl0.classList.contains('open'))) { hkP2PMarkRecent(_t0, _amt0); window._hkSmsCat = ''; }
            } catch (eP0) {}
            return _res0;
          }
          var icat = HK_INCOME_CATS.find(function (c) { return c.id === cat; });
          var lab = icat ? icat.label : (cat && HKCategorizer.byId[cat] ? HKCategorizer.byId[cat].label : '');
          if (cat && d && !String(d.value || '').trim()) d.value = lab;
          var txt = d ? String(d.value || '').trim() : '';
          var res = _c.apply(this, arguments);
          try {
            var mdl = document.getElementById('smsConfirmModal');
            if (cat && txt && mdl && !mdl.classList.contains('open')) { if (!icat) HKCategorizer.learn(txt, [cat]); hkCatUseBump(cat); window._hkSmsCat = ''; }
          } catch (eL) {}
          return res;
        };
        Object.keys(_c).forEach(function (k) { try { wc[k] = _c[k]; } catch (eK) {} });
        wc._hkCat = true;
        confirmSmsEntry = wc; try { window.confirmSmsEntry = wc; } catch (eW2) {}
      }
    })();
    /* ===== ۱.۳.۴۰: ساعت و پیوست‌های ثبت تکیِ پیامک همان لحظهٔ ساختن/پر کردن ردیف روی خود ردیف =====
       ساعت از متن پیامک (مثلاً «۰۷۲۶-۱۲:۵۵»)، وگرنه زمان رسیدن پیامک، وگرنه همین لحظه. هر مسیر ثبت (ردیف عادی، قسط، معوق،
       درآمد ثابت، ردیف ایمنی) hkSmsStamp(row) را صدا می‌زند؛ دیگر ردیف بعداً با حدس (مبلغ/زمان ساخت) پیدا نمی‌شود. */
    function hkSmsStamp(row) {
      if (!row) return row;
      var c = window._hkSmsCur;
      if (!c) return row;
      if (c.time && !row.time) row.time = c.time;
      if (_smsAtt.list.length) {
        var items = _smsAtt.list.slice();
        _smsAtt.list = [];
        if (!Array.isArray(row.att)) row.att = [];
        items.forEach(function (a) {
          if (a._blob) HKAttach.get(a.id).then(function (bl) { if (!bl) return HKAttach.put(a.id, a._blob); }).catch(function () { try { HKAttach.put(a.id, a._blob); } catch (e) {} });
          var cp = Object.assign({}, a); delete cp._blob; delete cp._rcpt; row.att.push(cp);
        });
        try { hkSmsAttRender(); } catch (e) {}
      }
      return row;
    }
    (function () {
      var orig = confirmSmsEntry;
      if (typeof orig !== 'function' || orig._hkTime) return;
      var w = function () {
        var pe = pendingSmsEntry;
        var tm = pe ? (hkSmsTime(pe.raw || '', 0) || hkSmsTime('', Number(pe.ts || pe.date) || Date.now())) : '';
        /* تا پیامک بعدی باز شود معتبر است (ثبت ممکن است بعد از پنجرهٔ تطبیق موجودی انجام شود) */
        window._hkSmsCur = pe ? { time: tm, raw: pe.raw } : null;
        return orig.apply(this, arguments);
      };
      for (var k in orig) { try { w[k] = orig[k]; } catch (eK) {} }
      w._hkTime = true;
      confirmSmsEntry = w;
      try { window.confirmSmsEntry = w; } catch (eW) {}
    })();
    /* ===== ۱.۳.۸۴: «پیامک‌های نفهمیده» =====
       پیامکی که شکل تراکنش دارد ولی مبلغش خوانده نشد، کنار گذاشته نمی‌شود: در فهرستی روی همین گوشی می‌ماند تا کاربر
       نوع و مبلغ را بگوید؛ نرم‌افزار کلمهٔ کنار عدد را یاد می‌گیرد و پیامک‌های بعدی همان شکل را خودش می‌خواند. */
    var HK_SMS_UNREAD_KEY = STORAGE_KEY + '_smsUnread', HK_SMS_LEARN_KEY = STORAGE_KEY + '_smsLearn';
    function hkSmsUnreadLoad() { try { var a = JSON.parse(localStorage.getItem(HK_SMS_UNREAD_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hkSmsUnreadSave(a) { try { localStorage.setItem(HK_SMS_UNREAD_KEY, JSON.stringify(a.slice(-60))); } catch (e) {} try { hkSmsUnreadMenu(); } catch (e2) {} }
    function hkSmsLooksTx(text) {
      var t = normalizeSmsText(text);
      if (!t || !/[0-9]{3,}/.test(t)) return false;
      if (!/برداشت|واریز|خرید|انتقال|مبلغ|مانده|موجودی|پرداخت|کسر|بستانکار|بدهکار/.test(t)) return false;
      try { if (isOtpOrAuthSms(t)) return false; } catch (e) {}
      var nt = false; try { nt = isNonTransactionSms(t); } catch (e2) {}
      return nt !== 'failed' && nt !== 'promo' && nt !== 'empty';
    }
    function hkSmsUnreadAdd(text, sender) {
      if (!hkSmsLooksTx(text)) return false;
      var a = hkSmsUnreadLoad(), raw = String(text || '').trim();
      if (a.some(function (x) { return x.t === raw; })) return true;
      a.push({ t: raw, s: String(sender || ''), at: Date.now() });
      hkSmsUnreadSave(a);
      return true;
    }
    function hkSmsLearnLoad() { try { var a = JSON.parse(localStorage.getItem(HK_SMS_LEARN_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hkReEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    /* شکل یادگرفته: کلمهٔ پیش از مبلغ (مثلاً «مبلغ‌برداشتی») → نوع و واحد */
    function hkSmsLearnedParse(text) {
      var t = normalizeSmsText(text), L = hkSmsLearnLoad();
      for (var i = 0; i < L.length; i++) {
        var m = t.match(new RegExp(hkReEsc(L[i].w) + '\\s*[:：=]?\\s*[+\\-]?\\s*([0-9][0-9,٬]*)'));
        if (!m) continue;
        var v = parseInt(m[1].replace(/[^0-9]/g, ''), 10) || 0; if (!v) continue;
        var k = Number(L[i].k) || (L[i].r ? 0.1 : 1);
        if (k >= 1000 && !new RegExp(hkReEsc(L[i].w) + '\\s*[:：=]?\\s*[+\\-]?\\s*[0-9][0-9,٬]*\\s*هزار').test(t)) continue;
        var amt = Math.round(v * k);
        var dt = null; try { dt = extractDateFromSms(t); } catch (eD) {}
        var bal = null; try { bal = extractBalanceFromSms(t); } catch (eB) {}
        return { type: L[i].type === 'income' ? 'income' : 'expense', amount: amt, amountRial: amt * 10, rawSmsAmount: amt, balance: bal, balanceRial: null,
          bank: (function () { try { return detectBankFromSms(t) || ''; } catch (e) { return ''; } })(), day: dt && dt.d ? String(dt.d) : '', month: dt && dt.m ? dt.m : null, year: dt && dt.y ? dt.y : null, raw: t, _learned: true };
      }
      return null;
    }
    /* کاربر مبلغ (تومان) و نوع را گفت → عددِ برابر (تومان یا ریال) در متن پیدا و کلمهٔ پیش از آن یاد گرفته می‌شود */
    function hkSmsLearnFrom(text, amount, type) {
      var t = normalizeSmsText(text), re = /([^\s0-9:：=+\-]{2,24})\s*[:：=]?\s*[+\-]?\s*([0-9][0-9,٬]*)(\s*هزار\s*(ریال)?)?/g, m, hit = null;
      while ((m = re.exec(t))) {
        var v = parseInt(m[2].replace(/[^0-9]/g, ''), 10) || 0;
        var k = m[3] ? (m[4] ? 100 : 1000) : (v === amount ? 1 : (v === amount * 10 ? 0.1 : 0));
        if (k && Math.round(v * k) === amount) { hit = { w: m[1], k: k }; break; }
      }
      if (!hit || /مانده|موجودی|حساب|کارت/.test(hit.w)) return false;
      var L = hkSmsLearnLoad().filter(function (x) { return x.w !== hit.w; });
      L.push({ w: hit.w, type: type, k: hit.k });
      try { localStorage.setItem(HK_SMS_LEARN_KEY, JSON.stringify(L.slice(-30))); } catch (e) {}
      return true;
    }
    /* آیتم منو فقط وقتی فهرست خالی نیست (زیر «پیامک‌های ثبت‌نشده») */
    function hkSmsUnreadMenu() {
      var n = hkSmsUnreadLoad().length, el = document.getElementById('menuSmsUnread');
      if (!n) { if (el) el.remove(); return; }
      if (!el) {
        var after = document.getElementById('menuSmsLater'); if (!after || !after.parentNode) return;
        el = document.createElement('button'); el.className = 'menu-item'; el.id = 'menuSmsUnread'; el.type = 'button';
        el.onclick = function () { try { closeSideMenu(); } catch (e) {} hkOpenSmsUnread(); };
        after.parentNode.insertBefore(el, after.nextSibling);
      }
      el.innerHTML = '<i class="hk-mi" style="--c:#ffd60a"><svg viewBox="0 0 24 24"><path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H9.5L5 20.5V17h-.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.3M12 13.9v.1"/></svg></i>پیامک‌های نفهمیده <b class="hk-unread-n">' + toPersianDigits(String(n)) + '</b>';
    }
    function hkOpenSmsUnread() {
      var old = document.getElementById('hkSmsUnread'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkSmsUnread'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100600;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-prefs hk-pf hk-p2p-box'; bx.style.maxWidth = '380px';
      ov.appendChild(bx); document.body.appendChild(ov);
      var close = function () { ov.remove(); }; ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var paint = function () {
        var a = hkSmsUnreadLoad();
        bx.innerHTML = '<div class="hk-prefs-t" style="margin-bottom:6px;">پیامک‌های نفهمیده</div>' +
          '<div style="font-size:var(--hk-fs-small);color:var(--muted,#98989f);line-height:1.8;margin-bottom:10px;">این پیامک‌ها شبیه تراکنش بودند ولی مبلغشان را نفهمیدم. نوع و مبلغ را بگویید تا ثبت شود؛ همین شکل پیامک دفعهٔ بعد خودش خوانده می‌شود. چیزی از گوشی بیرون نمی‌رود.</div>' +
          '<div class="hk-unr-list" style="overflow-y:auto;max-height:56vh;display:flex;flex-direction:column;gap:10px;"></div>' +
          '<div class="hk-rax-acts"><button type="button" class="modal-btn hk-unr-close">بستن</button></div>';
        bx.querySelector('.hk-unr-close').onclick = close;
        var list = bx.querySelector('.hk-unr-list');
        if (!a.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted,#98989f);padding:14px 0;">چیزی نمانده ✓</div>'; return; }
        a.slice().reverse().forEach(function (it) {
          var card = document.createElement('div'); card.className = 'hk-unr-card';
          card.innerHTML = '<div class="hk-unr-t"></div><div class="hk-unr-row"><div class="hk-unr-seg"><button type="button" data-ty="expense" class="on">برداشت</button><button type="button" data-ty="income">واریز</button></div>' +
            '<input class="hk-unr-amt" inputmode="numeric" placeholder="مبلغ (تومان)" dir="ltr"></div>' +
            '<div class="hk-unr-btns"><button type="button" class="modal-btn yes hk-unr-ok">ثبت</button><button type="button" class="modal-btn no hk-unr-del">تراکنش نیست</button></div>';
          card.querySelector('.hk-unr-t').textContent = it.t;
          var ty = 'expense';
          card.querySelectorAll('.hk-unr-seg button').forEach(function (b) { b.onclick = function () { ty = b.getAttribute('data-ty'); card.querySelectorAll('.hk-unr-seg button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
          var amtI = card.querySelector('.hk-unr-amt');
          amtI.addEventListener('input', function () { var v = parseAmount(amtI.value) || 0; amtI.value = v ? formatNum(v) : ''; });
          var drop = function () { hkSmsUnreadSave(hkSmsUnreadLoad().filter(function (x) { return x.t !== it.t; })); };
          card.querySelector('.hk-unr-del').onclick = function () { drop(); paint(); };
          card.querySelector('.hk-unr-ok').onclick = function () {
            var amt = parseAmount(amtI.value) || 0;
            if (!amt) { try { amtI.focus(); } catch (e) {} showToast('مبلغ را بنویسید'); return; }
            try { hkSmsLearnFrom(it.t, amt, ty); } catch (eL) {}
            var t = normalizeSmsText(it.t), dt = null; try { dt = extractDateFromSms(t); } catch (eD) {}
            var bal = null; try { bal = extractBalanceFromSms(t); } catch (eB) {}
            var bank = ''; try { bank = hkBankOfSms(it.t, it.s) || ''; } catch (eBk) {}
            var parsed = { type: ty, amount: amt, amountRial: amt * 10, rawSmsAmount: amt, balance: bal, balanceRial: null, bank: matchSelectedBank(bank), day: dt && dt.d ? String(dt.d) : '', month: dt && dt.m ? dt.m : null, year: dt && dt.y ? dt.y : null, raw: it.t };
            if (it.s) parsed.sender = it.s;
            drop(); close();
            try { openSmsConfirmModal(parsed); } catch (eO) { showToast('باز کردن باکس ثبت ممکن نشد'); }
          };
          list.appendChild(card);
        });
      };
      paint();
    }
    try { window.hkOpenSmsUnread = hkOpenSmsUnread; window.hkSmsUnreadAdd = hkSmsUnreadAdd; window.hkSmsLearnedParse = hkSmsLearnedParse; window.hkSmsUnreadLoad = hkSmsUnreadLoad; } catch (eWu) {}
    try { setTimeout(function () { try { hkSmsUnreadMenu(); } catch (e) {} }, 1200); } catch (eUm) {}

    function enqueueBankSms(smsText, opts) {
      opts = opts || {};
      if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(smsText)) return false;
      /* ۱.۳.۷۴: حساب مسدود → بی‌صدا نادیده */
      if (hkSmsBlockedHit(smsText, opts.sender)) { try { cancelNativeSmsNotification(opts.nid, true); } catch (eNb) {} return false; }
      { var _ins = hkParseInstallSms(smsText);
        if (_ins) {
          var _ir = hkInstIngest(_ins, String(smsText || ''));
          try { cancelNativeSmsNotification(opts.nid); } catch (eNc) {}
          if (_ir && !_ir.dup && !opts.silent) showToast('پرداخت قسط در «' + hkInstName(_ir.card) + '» ثبت شد');
          return true;
        } }
      let parsed = parseBankSms(smsText);
      if (!parsed || !parsed.amount) {
        /* ۱.۳.۸۴: شکلی که کاربر قبلاً یاد داده؛ وگرنه به «پیامک‌های نفهمیده» می‌رود (بی‌صدا گم نمی‌شود) */
        var _lp = null; try { _lp = hkSmsLearnedParse(smsText); } catch (eLp) {}
        if (_lp) parsed = _lp;
        else {
          var _kept = false; try { _kept = hkSmsUnreadAdd(smsText, opts.sender); } catch (eUa) {}
          if (!opts.silent) showToast(_kept ? 'پیامک را نفهمیدم؛ در «پیامک‌های نفهمیده» ماند' : 'پیامک بانکی قابل تشخیص نبود');
          return false;
        }
      }
      /* ۱.۳.۸۳: اسم بانک در متن نبود → از فرستنده؛ اگر بود → فرستنده یاد گرفته شود */
      if (opts.sender) { try { var _nb = detectBankFromSms(smsText, true); if (_nb) hkSenderLearn(opts.sender, _nb); else { var _sb = hkSenderBank(opts.sender); if (_sb) parsed.bank = _sb; } } catch (eSb) {} }
      parsed.bank = matchSelectedBank(parsed.bank);
      parsed.raw = parsed.raw || String(smsText || '');
      if (opts.nid) parsed.nid = opts.nid;
      if (opts.sender) parsed.sender = String(opts.sender);
      if (opts.quick) { parsed._quick = true; parsed._quickDesc = String(opts.quickDesc || ''); parsed._quickCat = String(opts.quickCat || ''); parsed._quickOpen = !!opts.quickOpen; opts.silent = true; }
      const rawKey = String(smsText || '').trim();
      if (rawKey) {
        if (pendingSmsEntry && String(pendingSmsEntry.raw || '').trim() === rawKey) return false;
        if (smsPendingQueue.some(x => x && String(x.raw || '').trim() === rawKey)) return false;
      }
      smsPendingQueue.push(parsed);
      try { hkPendingRefresh(); } catch (ePr) {}
      /* صف به ترتیب تاریخ خود پیامک (نه زمان رسیدن)؛ پیامک‌های یک روز به همان ترتیب رسیدن می‌مانند */
      try {
        const dk = (x) => ((parseInt(x && x.year, 10) || 0) * 10000) + ((parseInt(x && x.month, 10) || 0) * 100) + (parseInt(x && x.day, 10) || 0);
        smsPendingQueue.sort((a, b) => dk(a) - dk(b));
      } catch (eS) {}
      try {
        const total = smsPendingQueue.length + (isSmsConfirmOpen() ? 1 : 0);
        if ('Notification' in window && Notification.permission === 'granted') {
          const kind = parsed.type === 'income' ? 'واریز' : 'برداشت';
          const title = total > 1
            ? (toPersianDigits(total) + ' تراکنش بانکی')
            : ('تراکنش بانکی — ' + kind);
          const body = total > 1
            ? ('آخرین: ' + (parsed.bank ? parsed.bank + ' · ' : '') + formatNum(parsed.amount) + ' تومان')
            : ((parsed.bank ? parsed.bank + ' · ' : '') + formatNum(parsed.amount) + ' تومان');
          try {
            new Notification(title, {
              body: body,
              dir: 'rtl',
              tag: 'hesab-bank-sms',
              renotify: true
            });
          } catch (eN) {
            try { new Notification(title, { body: body, dir: 'rtl' }); } catch (e2) {}
          }
        } else if (!opts.silent) {
          showToast(total > 1 ? (toPersianDigits(total) + ' پیامک بانکی در صف') : 'پیامک بانکی تشخیص داده شد');
        }
      } catch (e) {
        if (!opts.silent) showToast('پیامک بانکی تشخیص داده شد');
      }
      processNextSmsInQueue();
      return true;
    }
    function processNextSmsInQueue() {
      if (isSmsConfirmOpen()) return;
      if (!smsPendingQueue.length) {
        pendingSmsEntry = null;
        return;
      }
      const next = smsPendingQueue.shift();
      pendingSmsEntry = next;
      openSmsConfirmModal(next);
      try { showSmsSenderWarning(next); } catch (eW) {}
      /* پیامک داخل نرم‌افزار دیده شد → نوتیف همان پیامک از نوار بالا و عدد روی آیکن حذف شود */
      cancelNativeSmsNotification(next && next.nid);
      if (smsPendingQueue.length) {
        try { showToast(toPersianDigits(smsPendingQueue.length) + ' پیامک دیگر در صف'); } catch (e) {}
      }
    }
    /* ===== ورودی صوتی برای «شرح» در ثبت از پیامک =====
       لمس فیلد شرح → دایرهٔ بزرگ میکروفون؛ گفتار روی خود گوشی به متن تبدیل می‌شود (افزونهٔ نیتیو HkSpeech،
       با ترجیح پردازش آفلاین). دکمهٔ بازگشت یا «کیبورد» → بستن و نمایش کیبورد. در مرورگر بی‌اثر است. */
    var _voice = { open: false, el: null, input: null, skipNext: false, listeners: [], disabled: false };
    function hkSpeechPlugin() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.HkSpeech; }
    function voiceCanUse() {
      var P = hkSpeechPlugin();
      try { if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return false; } catch (e) { return false; }
      if (_voice.disabled) return false;
      return !!(P && typeof P.start === 'function');
    }
    /* یک بار بررسی: اگر گوشی سرویس تشخیص گفتار ندارد، فیلد مثل قبل با کیبورد کار کند */
    setTimeout(function () {
      try {
        var P = hkSpeechPlugin();
        if (P && P.isAvailable) P.isAvailable().then(function (r) { if (r && r.available === false) _voice.disabled = true; }).catch(function () {});
      } catch (e) {}
    }, 3000);
    /* موج صدا: ۱۱ خط با الگوی ارتفاعِ متقارن (بلندترین وسط)؛ هر خط با شدت صدا (و کمی تصادفی) بلند و کوتاه می‌شود */
    var VO_BARS = 9;
    function _voiceWaveSvg() {
      var out = '<svg class="vo-wave" viewBox="0 0 172 120" aria-hidden="true">';
      for (var i = 0; i < VO_BARS; i++) out += '<rect x="' + (i * 20 + 2) + '" y="42" width="8" height="36" rx="4" style="height:36px;y:42px"/>';
      return out + '</svg>';
    }
    /* هر ۳۴۰ میلی‌ثانیه ارتفاع تازهٔ هر خط (تصادفی، مستقل، نیمی از ارتفاع قبلی را نگه می‌دارد تا نرم باشد)؛ شدت صدا (۰ تا ۱) سقفش را بالا می‌برد */
    function _voiceWave(level) {
      if (_voice.el) _voice.level = level;
    }
    function _voiceWaveTick() {
      if (!_voice.el) { clearInterval(_voice.waveT); _voice.waveT = 0; return; }
      if (_voice.el.classList.contains('err')) return;
      var lv = Math.max(0, Math.min(1, _voice.level || 0)), rs = _voice.el.querySelectorAll('.vo-wave rect');
      for (var i = 0; i < rs.length; i++) {
        var lo = 0.12 + lv * 0.25, hi = 0.36 + lv * 0.64, prev = parseFloat(rs[i].style.height) || 36;
        var h = Math.max(8, Math.round(((lo + Math.random() * (hi - lo)) * 120 + prev) / 2));
        rs[i].style.height = h + 'px'; rs[i].style.y = ((120 - h) / 2) + 'px';
      }
    }
    /* فیلتر کلمات نامناسبِ سرویس گفتار گوشی‌های قدیمی‌تر «سوپر» را «س***» می‌نویسد؛ کلمه‌های رایجِ ستاره‌دار برگردانده می‌شوند */
    function _voiceUnmask(t) {
      return String(t || '').replace(/س\*{2,}/g, 'سوپر');
    }
    function _voiceStatus(t) { try { if (_voice.el) _voice.el.querySelector('.vo-status').textContent = t; } catch (e) {} }
    function openVoiceInput(input) {
      if (_voice.open || !input) return false;
      var P = hkSpeechPlugin(); if (!P) return false;
      _voice.open = true; _voice.input = input; _voice.offlineShown = false;
      input.setAttribute('readonly', 'readonly');
      try { input.blur(); } catch (e0) {}
      var el = document.createElement('div');
      el.className = 'voice-overlay';
      el.setAttribute('role', 'dialog');
      el.innerHTML = '<div class="vo-ring vo-bars"><i></i><i></i><button type="button" class="vo-mic vo-bars" aria-label="پایان گفتن">' + _voiceWaveSvg() + '</button></div>' +
        '<div class="vo-status">بگویید بابت چه بود…</div><div class="vo-text"></div>' +
        '<div class="vo-btns"><button type="button" class="vo-retry">دوباره</button><button type="button" class="vo-kb">نوشتن با کیبورد</button></div>';
      document.body.appendChild(el);
      _voice.el = el;
      requestAnimationFrame(function () { el.classList.add('on'); });
      _voice.level = 0; clearInterval(_voice.waveT); _voice.waveT = setInterval(_voiceWaveTick, 340); _voiceWaveTick();
      el.querySelector('.vo-mic').onclick = function () { try { P.stop().catch(function () {}); } catch (e) {} _voiceStatus('در حال تبدیل به متن…'); };
      el.querySelector('.vo-kb').onclick = function () { closeVoiceInput(true); };
      var add = function (ev, fn) { try { Promise.resolve(P.addListener(ev, fn)).then(function (h) { if (_voice.open) _voice.listeners.push(h); else try { h.remove(); } catch (e) {} }); } catch (e) {} };
      add('partial', function (d) { try { if (_voice.el) _voice.el.querySelector('.vo-text').textContent = _voiceUnmask((d && d.text) || ''); } catch (e) {} });
      add('level', function (d) { var r = Math.max(0, Math.min(1, (((d && d.rms) || 0) + 2) / 12)); try { if (_voice.el) { _voice.el.style.setProperty('--vo-l', r.toFixed(2)); _voiceWave(r); } } catch (e) {} });
      add('state', function (d) { if (d && d.state === 'processing') _voiceStatus('در حال تبدیل به متن…'); if (d && d.state === 'speaking') _voiceStatus('در حال گوش دادن…'); if (d && d.state === 'ready') _voiceStatus('بگویید بابت چه بود…'); });
      var retry = el.querySelector('.vo-retry');
      retry.onclick = function () {
        el.classList.remove('err'); el.classList.remove('vo-long-msg');
        /* اگر حالا اینترنت وصل است، دکمه/پیام دانلود بستهٔ آفلاین دیگر لازم نیست */
        try { if (navigator.onLine !== false) { var ob = el.querySelector('.vo-offline'); if (ob && !ob.disabled) ob.remove(); } } catch (eO) {}
        _voiceStatus('بگویید بابت چه بود…'); _voiceRun(P);
      };
      _voiceRun(P);
      return true;
    }
    /* یک دور گوش دادن؛ در خطا پنجره باز می‌ماند و علت + «دوباره»/«کیبورد» نشان داده می‌شود */
    function _voiceRun(P) {
      var myRun = (_voice.run = (_voice.run || 0) + 1);
      P.start({ lang: 'fa-IR' }).then(function (res) {
        if (!_voice.open || myRun !== _voice.run) return;
        var t = _voiceUnmask(String((res && res.text) || '').trim()), inp = _voice.input;
        if (!t) { _voiceError('صدایی تشخیص داده نشد. دوباره امتحان کنید.'); return; }
        if (inp) {
          var v = String(inp.value || '').trim();
          inp.value = v ? v + ' ' + t : t;
          try { inp.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        }
        closeVoiceInput(false);
      }).catch(function (err) {
        if (!_voice.open || myRun !== _voice.run) return;
        var m = String((err && (err.code || err.message)) || '') + ' ' + String((err && err.message) || '');
        if (/cancel|replaced/.test(m)) return;
        var code = (m.match(/speech_error_(\d+)/) || [])[1];
        var msg = /permission/.test(m) ? 'اجازهٔ میکروفون داده نشد. از تنظیمات گوشی اجازه را فعال کنید یا با کیبورد بنویسید.'
          : code === '6' || code === '7' ? 'صدایی تشخیص داده نشد. نزدیک‌تر و واضح‌تر بگویید و دوباره امتحان کنید.'
          : (code === '2' || code === '1') && navigator.onLine !== false && _voice.offlineShown ? 'ارتباط با سرویس گفتار برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید، یا با کیبورد بنویسید.'
          : code === '2' || code === '1' ? 'تبدیل گفتار الان به اینترنت نیاز دارد، چون بستهٔ گفتار فارسیِ آفلاین روی این گوشی نصب نیست. اگر این بسته را یک بار (با اینترنت) دانلود کنید، از آن به بعد دستیار صوتی بدون اینترنت هم کار می‌کند.'
          : code === '12' || code === '13' ? 'زبان فارسی در سرویس گفتار این گوشی نصب نیست. از تنظیمات «تایپ صوتی گوگل»، فارسی (و بستهٔ آفلاین آن) را اضافه کنید.'
          : code === '9' ? 'سرویس گفتار گوشی اجازهٔ میکروفون ندارد (خطای ۹).'
          : 'تبدیل گفتار ممکن نشد' + (code ? ' (خطای ' + toPersianDigits(code) + ')' : '') + '. دوباره امتحان کنید یا با کیبورد بنویسید.';
        _voiceError(msg);
        /* پیشنهاد بستهٔ آفلاین فقط وقتی اینترنت قطع است (یا فارسی در سرویس نصب نیست)؛ با اینترنت وصل دوباره نشان داده نمی‌شود */
        var offNow = navigator.onLine === false || !_voice.offlineShown;
        if (((code === '2' || code === '1') && offNow) || code === '12' || code === '13') { _voice.offlineShown = true; _voiceOfflineBtn(); }
      });
    }
    /* دکمهٔ «دانلود بستهٔ آفلاین فارسی» زیر پیام خطا */
    function _voiceOfflineBtn() {
      try {
        var P = hkSpeechPlugin(); if (!_voice.el || !P || typeof P.downloadOffline !== 'function') return;
        if (_voice.el.querySelector('.vo-offline')) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'vo-offline'; b.textContent = 'دانلود بستهٔ گفتار فارسی آفلاین';
        b.onclick = function (e) {
          e.stopPropagation();
          /* دانلود بسته خودش اینترنت می‌خواهد */
          if (navigator.onLine === false) { _voiceStatus('برای دانلود بسته، اول اینترنت گوشی را روشن کنید و بعد دوباره این دکمه را بزنید.'); return; }
          b.disabled = true; b.textContent = 'در حال بررسی…';
          try { _voice.el.classList.add('vo-long-msg'); } catch (eC) {}
          var reset = function (txt) { b.disabled = false; b.textContent = txt || 'دانلود بستهٔ گفتار فارسی آفلاین'; };
          try {
            if (!_voice.dlHooked && P.addListener) {
              _voice.dlHooked = true;
              P.addListener('offlineDl', function (ev) {
                var stt = ev && ev.state;
                var bb = _voice.el && _voice.el.querySelector('.vo-offline');
                if (stt === 'progress') { if (bb) bb.textContent = 'در حال دانلود… ' + toPersianDigits(String(ev.progress || 0)) + '٪'; }
                else if (stt === 'done') { _voiceStatus('بستهٔ گفتار فارسی نصب شد ✓ حالا «دوباره» را بزنید؛ از این به بعد بدون اینترنت هم کار می‌کند.'); if (bb) bb.remove(); }
                else if (stt === 'scheduled') { _voiceStatus('دانلود در صف گوشی قرار گرفت (معمولاً وقتی به وای‌فای وصل باشید انجام می‌شود). بعد از اتمام، دوباره امتحان کنید.'); if (bb) bb.remove(); }
                else if (stt === 'error') { _voiceStatus('دانلود بسته کامل نشد' + (ev.code != null ? ' (کد ' + toPersianDigits(String(ev.code)) + ')' : '') + '. اینترنت را بررسی و دوباره امتحان کنید.'); if (bb) { bb.disabled = false; bb.textContent = 'تلاش دوباره برای دانلود'; } }
              });
            }
          } catch (eL) {}
          P.downloadOffline({ lang: 'fa-IR' }).then(function (r) {
            var stt = r && r.status;
            if (stt === 'installed') { _voiceStatus('بستهٔ گفتار فارسی از قبل روی گوشی نصب است ✓ «دوباره» را بزنید.'); b.remove(); }
            else if (stt === 'pending') { _voiceStatus('دانلود بستهٔ فارسی قبلاً شروع شده و در جریان است؛ کمی بعد دوباره امتحان کنید.'); b.remove(); }
            else if (stt === 'downloading') { _voiceStatus('دانلود بستهٔ فارسی شروع شد. تا پایان دانلود اینترنت را روشن نگه دارید' + (r.progressEvents ? '.' : '؛ بعد از چند دقیقه دوباره میکروفون را بزنید.')); b.textContent = 'در حال دانلود…'; }
            else {
              var why = String((r && r.why) || '');
              _voiceStatus((why === 'unsupported' ? 'سرویس گفتار داخلی این گوشی بستهٔ آفلاین فارسی ندارد؛ ' : '') +
                'صفحهٔ تنظیمات گفتار باز شد: «زبان‌ها» یا «تشخیص گفتار آفلاین» را باز کنید، «فارسی» را انتخاب و دانلود کنید، سپس به نرم‌افزار برگردید و «دوباره» را بزنید.');
              reset();
            }
          }).catch(function () { reset(); _voiceStatus('باز کردن تنظیمات گفتار ممکن نشد؛ از تنظیمات گوشی › زبان و ورودی › ورودی صوتی، فارسی آفلاین را دانلود کنید.'); });
        };
        var btns = _voice.el.querySelector('.vo-btns');
        if (btns && btns.parentNode) btns.parentNode.insertBefore(b, btns); else _voice.el.appendChild(b);
      } catch (e) {}
    }
    function _voiceError(msg) {
      try { if (_voice.el) { _voice.el.classList.add('err'); _voice.el.classList.toggle('vo-long-msg', String(msg || '').length > 55); _voiceStatus(msg); _voice.el.style.setProperty('--vo-l', '0'); _voiceWave(0); } } catch (e) {}
    }
    function closeVoiceInput(showKeyboard) {
      if (!_voice.open) return false;
      _voice.open = false;
      var P = hkSpeechPlugin();
      try { if (P && P.cancel) P.cancel().catch(function () {}); } catch (e) {}
      _voice.listeners.forEach(function (h) { try { h.remove(); } catch (e) {} });
      _voice.listeners = [];
      var el = _voice.el; _voice.el = null;
      if (el) { el.classList.remove('on'); setTimeout(function () { try { el.remove(); } catch (e) {} }, 240); }
      var inp = _voice.input; _voice.input = null;
      if (inp) {
        inp.removeAttribute('readonly');
        if (showKeyboard) {
          _voice.skipNext = true;
          setTimeout(function () { try { inp.focus(); var n = inp.value.length; inp.setSelectionRange(n, n); } catch (e) {} setTimeout(function () { _voice.skipNext = false; }, 400); }, 80);
        }
      }
      return true;
    }
    /* آیکون میکروفون داخل سمت چپ فیلد شرح: فقط لمس آیکون → دستیار صوتی؛ بقیهٔ فیلد → کیبورد عادی */
    (function () {
      var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
      function setup() {
        var inp = document.getElementById('smsConfirmDesc');
        if (!inp || inp._micWrap || !inp.parentNode) return;
        var w = document.createElement('div');
        w.className = 'desc-mic-wrap';
        inp.parentNode.insertBefore(w, inp);
        w.appendChild(inp);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'desc-mic-btn'; b.setAttribute('aria-label', 'گفتن با صدا'); b.title = 'گفتن با صدا';
        b.innerHTML = MIC;
        w.appendChild(b);
        inp._micWrap = w;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (_voice.open) return;
          if (!voiceCanUse()) { try { showToast('ورودی صوتی در این گوشی در دسترس نیست'); } catch (eT) {} return; }
          openVoiceInput(inp);
        });
      }
      function syncVoiceClass() {
        try { document.documentElement.classList.toggle('hk-voice', !!voiceCanUse()); } catch (e) {}
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setup(); syncVoiceClass(); }); else { setup(); syncVoiceClass(); }
      /* بعد از بررسی سرویس گفتار گوشی دوباره (اگر سرویس نبود، آیکون پنهان می‌شود) */
      setTimeout(syncVoiceClass, 3600);
    })();
    /* ===== ۱.۳.۳۸: پیوست در منوی ثبت پیامک =====
       گیرهٔ طوسی داخل فیلد شرح (کنار میکروفون، با خط تفکیک)؛ زدنش پنجرهٔ کوچک رو به بالا: دوربین / گالری / ضبط صدا.
       ردیف هنوز ساخته نشده، پس پیوست‌ها همان لحظه در حافظهٔ پیوست ذخیره و «در انتظار» نگه داشته می‌شوند؛
       با ثبت پیامک به ردیف تازه می‌چسبند و با انصراف/بعداً پاک می‌شوند. پیش‌نمایش‌ها (با ×) زیر شرح */
    var _smsAtt = { list: [], t0: 0, amt: 0, seen: null };
    function hkB64Blob(data, mime) {
      var bin = atob(data || ''), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: mime || 'image/jpeg' });
    }
    function hkMediaPlugin() { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.HkMedia) || null; }
    /* عکس از دوربین یا گالری → Blob (اندروید: افزونهٔ HkMedia که خودش کوچک می‌کند؛ مرورگر: input فایل + فشرده‌سازی) */
    function hkAttGetPhoto(src) {
      var media = hkMediaPlugin(), fn = media && (src === 'cam' ? media.takePhoto : media.pickImage);
      if (typeof fn === 'function') return fn.call(media).then(function (res) { if (!res || !res.data) throw new Error('empty'); if (src !== 'cam' && res.items && res.items.length > 1) return res.items.map(function (it) { return hkB64Blob(it.data, it.mime); }); return hkB64Blob(res.data, res.mime); });
      return new Promise(function (resolve, reject) {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (src === 'cam') inp.setAttribute('capture', 'environment');
        inp.style.display = 'none'; document.body.appendChild(inp);
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; inp.remove();
          if (!f) { reject(new Error('cancelled')); return; }
          HKAttach.compressImage(f).then(resolve, function () { if (/^image\/(jpeg|png|webp)$/i.test(f.type || '') && f.size < 6 * 1048576) resolve(f); else reject(new Error('decode')); });
        };
        inp.click();
      });
    }
    /* ضبط صدا: start(onTick) → Promise<{blob, dur}> که با stop() تمام می‌شود */
    function hkAttRecorder() {
      var rec = null, stream = null, chunks = [], t0 = 0, tick = 0, done = null, fail = null, media = hkMediaPlugin();
      return {
        start: function (onTick) {
          return new Promise(function (resolve, reject) {
            done = resolve; fail = reject;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { showToast('ضبط صدا روی این گوشی پشتیبانی نمی‌شود', 'warn'); reject('nosupport'); return; }
            var ask = (media && typeof media.micPermission === 'function') ? media.micPermission() : Promise.resolve({ granted: true });
            ask.then(function (pr) {
              if (pr && pr.granted === false) {
                if (pr.blocked && typeof media.openAppSettings === 'function') askConfirm('اجازهٔ میکروفون قبلاً رد شده است. تنظیمات مجوزهای نرم‌افزار باز شود؟', function () { media.openAppSettings().catch(function () {}); });
                else showToast('اجازهٔ میکروفون داده نشد', 'warn');
                throw 'denied';
              }
              return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
            }).then(function (st) {
              stream = st; chunks = [];
              var mt = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
              try { rec = new MediaRecorder(st, mt ? { mimeType: mt, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); } catch (eR) { rec = new MediaRecorder(st); }
              rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
              rec.onstop = function () {
                var r0 = rec; rec = null; clearInterval(tick);
                try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (eS) {}
                if (r0._cancel || !chunks.length) { fail('cancelled'); return; }
                done({ blob: new Blob(chunks, { type: (r0.mimeType || mt || 'audio/webm').split(';')[0] }), dur: (performance.now() - t0) / 1000 });
              };
              rec.start(1000); t0 = performance.now();
              var upd = function () { var s2 = Math.floor((performance.now() - t0) / 1000); if (onTick) onTick(s2); if (s2 >= 300) { try { rec.stop(); } catch (e) {} } };
              upd(); tick = setInterval(upd, 500);
            }).catch(function (e) { if (e !== 'denied') showToast('میکروفون در دسترس نیست', 'warn'); reject(e); });
          });
        },
        stop: function (cancel) { if (!rec) return; rec._cancel = !!cancel; try { rec.stop(); } catch (e) {} },
        active: function () { return !!rec; }
      };
    }
    function hkSmsAttRender() {
      var btn = document.querySelector('#smsConfirmModal .desc-att-btn'), strip = document.getElementById('smsAttStrip');
      var n = _smsAtt.list.length;
      if (btn) { btn.classList.toggle('has', n > 0); var nn = btn.querySelector('.desc-att-n'); if (nn) nn.textContent = toPersianDigits(String(n)); }
      if (!strip) return;
      (strip._urls || []).forEach(function (u) { URL.revokeObjectURL(u); }); strip._urls = [];
      strip.innerHTML = '';
      strip.classList.toggle('on', n > 0);
      _smsAtt.list.forEach(function (a) {
        var it = document.createElement('div'); it.className = 'sa-it';
        if (a.kind === 'aud') {
          var s2 = Math.round(a.dur || 0);
          it.innerHTML = HK_ICON_WAVE + '<span>' + toPersianDigits(Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0')) + '</span>';
        } else if (a._blob) {
          var u = URL.createObjectURL(a._blob); strip._urls.push(u);
          var im = document.createElement('img'); im.src = u; im.alt = ''; im.onclick = function () { try { hkViewImage(u); } catch (e) {} };
          it.appendChild(im);
        }
        var x = document.createElement('button'); x.type = 'button'; x.className = 'sa-x'; x.textContent = '×'; x.setAttribute('aria-label', 'حذف');
        x.onclick = function (e) { e.stopPropagation(); _smsAtt.list = _smsAtt.list.filter(function (y) { return y !== a; }); if (a._rcpt) hkRcptReturn([a]); else HKAttach.del(a.id).catch(function () {}); hkSmsAttRender(); };
        it.appendChild(x);
        strip.appendChild(it);
      });
    }
    function hkSmsAttAdd(kind, blob, extra) {
      var id = HKAttach.newId();
      return HKAttach.put(id, blob).then(function () {
        _smsAtt.list.push(Object.assign({ id: id, kind: kind, size: blob.size, at: Date.now(), _blob: blob }, extra || {}));
        hkSmsAttRender();
      }).catch(function () { showToast('ذخیرهٔ پیوست ممکن نشد', 'warn'); });
    }
    function hkCloseAttPop() { var p = document.querySelector('.hk-attpop'); if (!p) return false; if (p._rec && p._rec.active()) p._rec.stop(true); p.remove(); return true; }
    function hkOpenSmsAttPop(anchor) {
      if (hkCloseAttPop()) return;
      var pop = document.createElement('div'); pop.className = 'hk-attpop';
      pop.innerHTML = '<button type="button" data-a="cam">' + HK_ICON_CAM + '<span>دوربین</span></button>' +
        '<button type="button" data-a="gal">' + HK_ICON_GAL + '<span>گالری</span></button>' +
        '<button type="button" data-a="rec">' + HK_ICON_WAVE + '<span>صدا</span></button>';
      document.body.appendChild(pop);
      /* جای پنجره هر فریم از روی خود گیره: کیبورد باز/بسته شود یا منو جابه‌جا شود، پنجره همراه گیره می‌ماند
         (بالای گیره؛ اگر بالا جا نبود، زیرش) */
      var place = function () {
        if (!pop.isConnected) return;
        if (!anchor.isConnected) { hkCloseAttPop(); return; }
        var r = anchor.getBoundingClientRect(), vv = window.visualViewport, vt = vv ? vv.offsetTop : 0, vh = vv ? vv.height : window.innerHeight;
        var w = pop.offsetWidth, h = pop.offsetHeight;
        var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
        var top = r.top - h - 6;
        if (top < vt + 8) top = Math.min(r.bottom + 6, vt + vh - h - 8);
        var L = Math.round(left) + 'px', T = Math.round(top) + 'px';
        if (pop.style.left !== L) pop.style.left = L;
        if (pop.style.top !== T) pop.style.top = T;
        requestAnimationFrame(place);
      };
      place();
      requestAnimationFrame(function () { pop.classList.add('in'); });
      var outside = function (e) {
        if (!pop.isConnected) { document.removeEventListener('pointerdown', outside, true); return; }
        if (pop.contains(e.target) || anchor.contains(e.target)) return;
        if (pop._rec && pop._rec.active()) return;   /* هنگام ضبط فقط با «پایان ضبط» بسته می‌شود */
        hkCloseAttPop(); document.removeEventListener('pointerdown', outside, true);
      };
      setTimeout(function () { document.addEventListener('pointerdown', outside, true); }, 0);
      pop.querySelectorAll('button').forEach(function (b) {
        b.onclick = function (e) {
          e.preventDefault(); e.stopPropagation();
          var a = b.getAttribute('data-a');
          if (a === 'rec') {
            if (pop._rec && pop._rec.active()) { pop._rec.stop(false); return; }
            pop._rec = hkAttRecorder();
            var lbl = b.querySelector('span');
            pop._rec.start(function (s2) { b.classList.add('rec'); lbl.innerHTML = 'پایان ضبط<small class="hk-rec-tm">' + toPersianDigits(Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0')) + '</small>'; })
              .then(function (res) { pop.remove(); return hkSmsAttAdd('aud', res.blob, { dur: res.dur }); })
              .catch(function () { b.classList.remove('rec'); lbl.textContent = 'صدا'; });
            return;
          }
          pop.remove();
          hkAttGetPhoto(a).then(function (blob) { return Array.isArray(blob) ? blob.reduce(function (p, bb) { return p.then(function () { return hkSmsAttAdd('img', bb); }); }, Promise.resolve()) : hkSmsAttAdd('img', blob); })
            .catch(function (err) { if (!/cancel/i.test(String((err && (err.message || err.code)) || err || ''))) showToast(a === 'cam' ? 'دوربین باز نشد' : 'خواندن عکس ممکن نشد', 'warn'); });
        };
      });
    }
    /* باز شدن منوی پیامک: پیوست‌های در انتظارِ قبلی (اگر مانده) پاک؛ ردیف‌های هم‌مبلغِ موجود یادداشت می‌شوند تا ردیف تازه شناخته شود */
    function hkSmsAttBegin(amount, raw) {
      /* ۱.۳.۳۹: همان پیامک دوباره باز شد (مثلاً بعد از برگشت از دوربین/گالری): پیوست‌های در انتظار می‌مانند */
      raw = String(raw || '');
      if (raw && raw === _smsAtt.raw && _smsAtt.list.length) { hkSmsAttRender(); return; }
      hkSmsAttDiscard();
      _smsAtt.raw = raw;
      if (window._hkSmsCur && window._hkSmsCur.raw !== raw) window._hkSmsCur = null;
      _smsAtt.t0 = Date.now(); _smsAtt.amt = Math.round(Number(amount) || 0); _smsAtt.seen = new Set();
      try { var _pe0 = pendingSmsEntry; setTimeout(function () { hkRcptOffer(_pe0 && (Number(_pe0.ts || _pe0.date || _pe0._laterAt) || 0)); }, 60); } catch (eR) {}
      try { iterAllPeriodData(function (pd) { ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sc) { (sc.rows || []).forEach(function (r) { if (r) _smsAtt.seen.add(r); }); }); }); }); } catch (e) {}
      hkSmsAttRender();
    }
    function hkSmsAttDiscard() {
      /* ۱.۳.۴۲: رسیدِ اشتراکیِ پیشنهادشده پاک نمی‌شود؛ به «رسیدهای در انتظار» برمی‌گردد */
      hkRcptReturn(_smsAtt.list.filter(function (a) { return a._rcpt; }));
      _smsAtt.list.forEach(function (a) { if (!a._rcpt) HKAttach.del(a.id).catch(function () {}); });
      _smsAtt.list = []; hkSmsAttRender();
    }
    /* ===== ۱.۳.۴۲: رسیدهای در انتظار =====
       رسیدی که از برنامهٔ بانک به حساب‌کتاب اشتراک‌گذاری شد ولی هنوز تراکنشش (پیامک) نیامده، اینجا نگه داشته می‌شود
       (فایل در حافظهٔ پیوست، فهرست در localStorage، تا ۲۴ ساعت). با باز شدن منوی ثبت پیامک، نزدیک‌ترین رسید (از نظر زمان)
       خودکار زیر شرح پیشنهاد می‌شود؛ با «ثبت» روی ردیف می‌رود، با × یا انصراف دوباره به همین صف برمی‌گردد. */
    var HK_RCPT_KEY = STORAGE_KEY + '_pendRcpt', HK_RCPT_TTL = 24 * 3600 * 1000;
    function hkRcptLoad() {
      var a = [];
      try { a = JSON.parse(localStorage.getItem(HK_RCPT_KEY) || '[]'); } catch (e) {}
      if (!Array.isArray(a)) a = [];
      var now = Date.now(), keep = a.filter(function (g) { return g && Array.isArray(g.items) && g.items.length && now - (Number(g.at) || 0) < HK_RCPT_TTL; });
      if (keep.length !== a.length) {
        a.forEach(function (g) { if (keep.indexOf(g) < 0 && g && Array.isArray(g.items)) g.items.forEach(function (x) { HKAttach.del(x.id).catch(function () {}); }); });
        hkRcptSave(keep);
      }
      return keep;
    }
    function hkRcptSave(list) { try { localStorage.setItem(HK_RCPT_KEY, JSON.stringify(list || [])); } catch (e) {} }
    function hkRcptKeep(blobs) {
      var at = Date.now(), items = [];
      return Promise.all(blobs.map(function (b) {
        var id = HKAttach.newId();
        return HKAttach.put(id, b.blob).then(function () { items.push({ id: id, size: b.blob.size, src: b.pdf ? 'pdf' : 'share' }); });
      })).then(function () {
        var list = hkRcptLoad(); list.push({ at: at, items: items }); hkRcptSave(list);
        return items.length;
      });
    }
    function hkRcptReturn(entries) {
      if (!entries || !entries.length) return;
      var list = hkRcptLoad(), by = {};
      entries.forEach(function (a) {
        var g = by[a._rcpt] || list.find(function (x) { return x.at === a._rcpt; });
        if (!g) { g = { at: a._rcpt, items: [] }; list.push(g); }
        by[a._rcpt] = g;
        if (!g.items.some(function (x) { return x.id === a.id; })) g.items.push({ id: a.id, size: a.size, src: a.src || 'share' });
      });
      hkRcptSave(list);
    }
    /* منوی ثبت پیامک باز شد: نزدیک‌ترین رسید در انتظار (به زمان پیامک) زیر شرح */
    function hkRcptOffer(ts) {
      var list = hkRcptLoad(); if (!list.length) return;
      var t = Number(ts) || Date.now();
      list.sort(function (a, b) { return Math.abs(a.at - t) - Math.abs(b.at - t); });
      var g = list.shift(); hkRcptSave(list);
      var raw0 = _smsAtt.raw;
      Promise.all(g.items.map(function (x) { return HKAttach.get(x.id).then(function (bl) { return bl ? { x: x, bl: bl } : null; }).catch(function () { return null; }); })).then(function (rs) {
        rs = rs.filter(Boolean);
        if (!rs.length) return;
        if (_smsAtt.raw !== raw0 || !isSmsConfirmOpen()) { hkRcptReturn(rs.map(function (r) { return { id: r.x.id, size: r.x.size, src: r.x.src, _rcpt: g.at }; })); return; }
        rs.forEach(function (r) { _smsAtt.list.push({ id: r.x.id, kind: 'img', size: r.bl.size, at: g.at, _blob: r.bl, src: r.x.src, _rcpt: g.at }); });
        hkSmsAttRender();
        try { showToast('رسیدِ اشتراک‌گذاری‌شده زیر شرح آمد؛ اگر مال این تراکنش نیست × را بزنید'); } catch (e) {}
      });
    }
    /* بسته شدن منوی پیامک: ثبت شد → پیوست‌ها روی ردیف تازه (همان مبلغ، تازه ساخته یا تازه پرداخت‌شده)؛ وگرنه پاک */
    function hkSmsAttFinish(saved) {
      hkCloseAttPop();
      if (!_smsAtt.list.length) return;
      if (!saved) { hkSmsAttDiscard(); return; }
      var items = _smsAtt.list.slice(), seen = _smsAtt.seen || new Set(), t0 = _smsAtt.t0;
      _smsAtt.raw = '';
      /* فایل‌ها دوباره در حافظهٔ پیوست نوشته می‌شوند (اگر در این فاصله پاک شده بودند، از نسخهٔ داخل حافظه) */
      items.forEach(function (a) { if (a._blob) HKAttach.get(a.id).then(function (b) { if (!b) return HKAttach.put(a.id, a._blob); }).catch(function () { try { HKAttach.put(a.id, a._blob); } catch (e) {} }); });
      var amtInp = document.getElementById('smsConfirmAmount');
      var amt = Math.round((amtInp && parseAmount(amtInp.value)) || _smsAtt.amt || 0);
      _smsAtt.list = []; hkSmsAttRender();
      var tries = 0;
      var tryAttach = function () {
        var best = null, score = -1;
        iterAllPeriodData(function (pd) { ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sc) { (sc.rows || []).forEach(function (r) {
          if (!r || r.deletedAt || Math.round(Number(r.amount) || 0) !== amt) return;
          var fresh = Math.max(Number(r.createdAt) || 0, Number(r.updatedAt) || 0) >= t0, isNew = !seen.has(r);
          if (!fresh && !isNew) return;
          var sc2 = (r.viaSms ? 4 : 0) + (fresh ? 2 : 0) + (isNew ? 1 : 0);
          if (sc2 > score) { score = sc2; best = r; }
        }); }); }); });
        if (!best) {
          if (++tries < 10) { setTimeout(tryAttach, 800); return; }
          items.forEach(function (a) { HKAttach.del(a.id).catch(function () {}); });
          showToast('ردیف ثبت‌شده پیدا نشد؛ پیوست‌ها ذخیره نشدند', 'warn');
          return;
        }
        if (!Array.isArray(best.att)) best.att = [];
        items.forEach(function (a) { var c = Object.assign({}, a); delete c._blob; delete c._rcpt; best.att.push(c); });
        try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e) {}
        try { renderAll(); } catch (e2) {}
      };
      setTimeout(tryAttach, 0);
    }
    (function () {
      function setupAtt() {
        var inp = document.getElementById('smsConfirmDesc'), w = inp && inp._micWrap;
        if (!w || w._attBtn) return;
        var sep = document.createElement('span'); sep.className = 'desc-att-sep';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'desc-att-btn'; b.setAttribute('aria-label', 'پیوست'); b.title = 'پیوست';
        b.innerHTML = HK_CLIP_SVG + '<span class="desc-att-n"></span>';
        w.appendChild(sep); w.appendChild(b); w._attBtn = b;
        var strip = document.createElement('div'); strip.id = 'smsAttStrip';
        w.parentNode.insertBefore(strip, w.nextSibling);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); hkOpenSmsAttPop(b); });
        hkSmsAttRender();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(setupAtt, 0); }); else setTimeout(setupAtt, 0);
      setTimeout(setupAtt, 1500);
    })();
    /* امنیت: پیامک «بانکی» که از یک شمارهٔ موبایل شخصی آمده احتمالاً جعلی است (بانک‌ها با سرشماره/نام می‌فرستند).
       موبایل ایران: 9 و بعد 0 تا 4 یا 9 (۰۹۰x، ۰۹۱x، ۰۹۲x، ۰۹۳x، ۰۹۴x، ۰۹۹x). سرشمارهٔ خدماتی با پیش‌شمارهٔ کشور
       مثل 9830009417 (بانک ملی = 98 + 30009417) موبایل نیست. */
    function smsSenderLooksPersonal(sender) {
      var d = toEnglishDigits(String(sender || '')).replace(/[\s\-()]/g, '');
      return /^(\+98|0098|98|0)?9[0-49]\d{8}$/.test(d);
    }
    function hkPersonalNoticeHtml(sender) {
      return '<span class="hk-pn-ico" aria-hidden="true">⚠️</span><span>پیامک شخصی از طرف «<bdi dir="ltr">' + escapeHtml(toPersianDigits(String(sender || '').replace(/\s+/g, ''))) + '</bdi>»</span>';
    }
    function showSmsSenderWarning(entry) {
      var m = document.getElementById('smsConfirmModal');
      if (!m) return;
      var box = m.querySelector('.modal-box') || m.firstElementChild;
      var old = document.getElementById('smsSenderWarn'); if (old) old.remove();
      if (!entry || !entry.sender || !smsSenderLooksPersonal(entry.sender) || !box) return;
      var w = document.createElement('div');
      w.id = 'smsSenderWarn';
      w.className = 'sms-sender-warn';
      /* ۱.۳.۴۷: «⚠ پیامک شخصی از طرف «شماره»»؛ آیکون و نوشته وسط‌چین؛ نوشته سفید */
      w.innerHTML = hkPersonalNoticeHtml(entry.sender);
      box.insertBefore(w, box.firstChild);
    }
    function cancelNativeSmsNotification(nid, force) {
      /* وقتی نرم‌افزار در پس‌زمینه است، نوتیف نباید پاک شود (کاربر هنوز پیامک را ندیده) */
      try {
        if (!force && document.visibilityState === 'hidden') {
          window._hkDeferredNotifCancel = window._hkDeferredNotifCancel || [];
          if (nid) window._hkDeferredNotifCancel.push(nid);
          return;
        }
      } catch (eV) {}
      try {
        var C = window.Capacitor, B = C && C.Plugins && C.Plugins.BankSms;
        if (!B || !nid || typeof B.cancelNotification !== 'function') return;
        B.cancelNotification({ id: nid }).catch(function () {});
      } catch (e) {}
    }
    /* وقتی صف داخلی خالی شد، نوتیف‌های باقی‌ماندهٔ پیامک‌هایی که دیگر در صف نیتیو نیستند پاک شوند */
    /* برگشت به نرم‌افزار: فقط نوتیف پیامکی که الان روی صفحه است پاک شود */
    document.addEventListener('visibilitychange', function () {
      try {
        if (document.visibilityState !== 'visible') return;
        var d = window._hkDeferredNotifCancel || []; window._hkDeferredNotifCancel = [];
        var cur = pendingSmsEntry && pendingSmsEntry.nid;
        d.forEach(function (n) { if (n && n === cur && isSmsConfirmOpen()) cancelNativeSmsNotification(n, true); });
      } catch (e) {}
    });
    function cancelHandledSmsNotifications() {
      try {
        if (document.visibilityState === 'hidden') return;
        if (isSmsConfirmOpen() || smsPendingQueue.length) return;
        var C = window.Capacitor, B = C && C.Plugins && C.Plugins.BankSms;
        if (B && typeof B.cancelHandledNotifications === 'function') B.cancelHandledNotifications().catch(function () {});
      } catch (e) {}
    }
    window.onBankSmsReceived = function (smsText, meta) {
      var nid = meta && meta.nid;
      var sender = (meta && meta.sender) || '';
      var ok = false;
      try {
        if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(smsText)) { cancelNativeSmsNotification(nid, true); return false; }
        /* پیامک از شمارهٔ موبایل شخصی (مثلاً پیامک بانکی که کسی فوروارد کرده) یا اطلاعیهٔ بی‌مانده («… برداشت می‌گردد») تراکنش این کاربر نیست */
        /* ۱.۳.۴۴: پیامک از شمارهٔ شخصی دیگر دور انداخته نمی‌شود؛ بالای منوی ثبت هشدار «پیامک شخصی از فلان شماره» می‌آید و اگر کاربر خواست ثبت می‌شود */
        var _pn = null; try { _pn = parseBankSms(smsText); } catch (eP) {}
        if (_pn && hkIsSmsNotice(smsText, _pn)) { cancelNativeSmsNotification(nid, true); return false; }
      } catch (eO) {}
      try { ok = enqueueBankSms(smsText, { nid: nid, sender: sender, quick: !!(meta && meta.quick), quickDesc: (meta && meta.quickDesc) || '', quickCat: (meta && meta.quickCat) || '', quickOpen: !!(meta && meta.quickOpen) }); } catch (eE) { ok = false; }
      /* پیامکی که نرم‌افزار نمایش نمی‌دهد (تکراری/غیرتراکنش) نوتیف بی‌مصرف نگذارد */
      if (!ok) cancelNativeSmsNotification(nid, true);
      return ok;
    };
    /* ===== ۱.۳.۴۳: ثبت از خود اعلان (پاسخ مستقیم) =====
       متن «بابت چه بود؟» که در اعلان نوشته شد کنار پیامک در صف نیتیو می‌آید (quickDesc). منوی ثبت پنهان باز می‌شود،
       شرح پر و «ثبت» زده می‌شود. اگر چیزی تأیید یا تکمیل لازم دارد (حساب نامشخص، «مربوط به درآمد ثابت/قسط؟»، فرستندهٔ
       مشکوک، تطبیق موجودی و …) منوی ثبت با همان شرح نمایان می‌ماند تا کاربر خودش تمام کند (هیچ وصلی بی‌اجازه نیست). */
    function hkQuickBlock() {
      var bank = document.getElementById('smsConfirmBank');
      if (!bank || !bank.value || bank.value === '__add_account__') return 'حساب این پیامک مشخص نیست';
      var rec = document.getElementById('smsRecMatchSel');
      if (rec && rec.closest('#smsRecMatch') && getComputedStyle(rec.closest('#smsRecMatch')).display !== 'none' && rec.value) return 'باید تأیید شود این واریز مربوط به کدام درآمد ثابت است';
      var pp = document.getElementById('smsPlanPickBlock');
      if (pp && getComputedStyle(pp).display !== 'none' && pp.offsetHeight > 0) return 'باید قسط مربوط انتخاب شود';
      /* ۱.۳.۴۴: پیامک شخصی در خود اعلان «پیامک شخصی» معرفی شده؛ نوشتن شرح و «ثبت» یعنی کاربر خواسته ادامه دهد */
      var an = document.getElementById('smsAccNewNote');
      if (an && getComputedStyle(an).display !== 'none' && an.offsetHeight > 0) return 'حساب تازه است و موجودی اولیه لازم دارد';
      return '';
    }
    function hkQuickShow(msg) {
      var m = document.getElementById('smsConfirmModal'); if (m) m.classList.remove('hk-quick');
      if (msg) { try { showToast('ثبت از اعلان: ' + msg + '؛ تکمیل و «ثبت» را بزنید', 'warn'); } catch (e) {} }
    }
    function hkQuickAutoConfirm(pe) {
      if (!pe || pe._quickTried) return;
      pe._quickTried = true;
      if (!isSmsConfirmOpen() || pendingSmsEntry !== pe) { hkQuickShow(''); return; }
      var d = document.getElementById('smsConfirmDesc');
      if (d && pe._quickDesc) { d.value = pe._quickDesc; try { d.dispatchEvent(new Event('input', { bubbles: true })); } catch (e0) {} }
      /* ۱.۳.۵۳: «بیشتر…» در اعلان: باکس ثبت نمایان می‌ماند تا کاربر دسته را از فهرست کامل بزند */
      if (pe._quickCat === '__more__') { hkQuickShow(''); return; }
      /* ۱.۳.۵۰: دکمهٔ دستهٔ اعلان → همان دسته انتخاب می‌شود */
      if (pe._quickCat) { window._hkSmsCat = pe._quickCat; try { document.querySelectorAll('#smsCatGrid .sms-cat').forEach(function (x) { x.classList.toggle('on', x.dataset.cat === pe._quickCat); }); } catch (eC) {} }
      var why = hkQuickBlock();
      if (why) { hkQuickShow(why); return; }
      try { confirmSmsEntry(); } catch (e1) { hkQuickShow('ثبت انجام نشد'); return; }
      setTimeout(function () {
        if (isSmsConfirmOpen() && pendingSmsEntry === pe) hkQuickShow('یک مورد تأیید لازم دارد');
        else {
          hkQuickShow(''); try { showToast('تراکنش از اعلان ثبت شد' + (pe._quickDesc ? ' — ' + pe._quickDesc : '')); } catch (e2) {}
          /* ۱.۳.۵۰: نرم‌افزار فقط برای ثبت باز شده بود؛ بی‌مشکل → برمی‌گردد به همان صفحهٔ قبلی کاربر */
          if (pe._quickOpen) setTimeout(function () { try { var A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (A && A.minimizeApp) A.minimizeApp(); } catch (eM) {} }, 900);
        }
      }, 700);
    }
    /* پیامکِ «ثبت‌شده از اعلان» که همین الان باز یا در صف است */
    function hkQuickApplyLive(nid, desc, cat, open) {
      window._hkQuickSeen = window._hkQuickSeen || {};
      if (window._hkQuickSeen[nid]) return;
      window._hkQuickSeen[nid] = 1;
      if (pendingSmsEntry && pendingSmsEntry.nid === nid && isSmsConfirmOpen()) {
        pendingSmsEntry._quick = true; pendingSmsEntry._quickDesc = desc; pendingSmsEntry._quickCat = cat || ''; pendingSmsEntry._quickOpen = !!open;
        hkQuickAutoConfirm(pendingSmsEntry);
        return;
      }
      (smsPendingQueue || []).forEach(function (q) { if (q && q.nid === nid) { q._quick = true; q._quickDesc = desc; q._quickCat = cat || ''; q._quickOpen = !!open; } });
    }
    (function () {
      var orig = openSmsConfirmModal;
      if (typeof orig !== 'function' || orig._hkQuick) return;
      var w = function (parsed) {
        var m = document.getElementById('smsConfirmModal');
        var q = !!(parsed && parsed._quick && !parsed._quickTried);
        if (m) m.classList.toggle('hk-quick', q);
        var r = orig.apply(this, arguments);
        if (q) setTimeout(function () { hkQuickAutoConfirm(parsed); }, 350);
        return r;
      };
      for (var k in orig) { try { w[k] = orig[k]; } catch (eK) {} }
      w._hkQuick = true;
      openSmsConfirmModal = w;
      try { window.openSmsConfirmModal = w; } catch (eW) {}
    })();


    /* ========== App Lock / Security ========== */
    var __lockUnlockedThisSession = false;
    var __lockPinBuffer = '';
    var __lockPinLen = 6;
    var __lockBgTs = 0;
    var __pinSetupState = null; // { mode, step, temp, resolve, reject }

    function getAppLockPlugin() {
      try {
        var C = window.Capacitor;
        return C && C.Plugins && C.Plugins.AppLock ? C.Plugins.AppLock : null;
      } catch (e) { return null; }
    }

    /** Web fallback: hash only (never raw PIN). Used when native plugin missing (browser). */
    async function webHashPin(pin, salt) {
      var enc = new TextEncoder();
      var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
      var bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(bits)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    }
    function webGetSecMeta() {
      try { return JSON.parse(localStorage.getItem('hk_sec_meta') || '{}') || {}; } catch (e) { return {}; }
    }
    function webSetSecMeta(o) {
      try { localStorage.setItem('hk_sec_meta', JSON.stringify(o || {})); } catch (e) {}
    }

    async function lockConsumeDeviceLockedFlag() {
      var p = getAppLockPlugin();
      if (p && p.consumeDeviceLockedFlag) {
        try {
          var r = await p.consumeDeviceLockedFlag();
          return !!(r && r.wasLocked);
        } catch (e) { return false; }
      }
      try {
        var v = sessionStorage.getItem('hk_device_was_locked');
        sessionStorage.removeItem('hk_device_was_locked');
        return v === '1';
      } catch (e2) { return false; }
    }
    function lockMarkDeviceLockedWeb() {
      try { sessionStorage.setItem('hk_device_was_locked', '1'); } catch (e) {}
    }
    async function lockIsEnabled() {
      var p = getAppLockPlugin();
      if (p && p.isEnabled) {
        try {
          var r = await p.isEnabled();
          return !!(r && r.enabled);
        } catch (e) { return false; }
      }
      var m = webGetSecMeta();
      return !!(m.enabled && m.hash && m.salt);
    }
    async function lockIsBiometricEnabled() {
      var p = getAppLockPlugin();
      if (p && p.isBiometricEnabled) {
        try {
          var r = await p.isBiometricEnabled();
          return !!(r && r.enabled);
        } catch (e) { return false; }
      }
      return !!webGetSecMeta().bio;
    }
    async function lockCanBiometric() {
      var p = getAppLockPlugin();
      if (p && p.canUseBiometric) {
        try {
          var r = await p.canUseBiometric();
          return !!(r && r.available);
        } catch (e) { return false; }
      }
      return false;
    }
    async function lockSetPin(pin) {
      var p = getAppLockPlugin();
      if (p && p.setPin) {
        await p.setPin({ pin: String(pin) });
        return;
      }
      var salt = (crypto.getRandomValues(new Uint8Array(16)));
      var saltHex = Array.from(salt).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      var hash = await webHashPin(String(pin), saltHex);
      var m = webGetSecMeta();
      m.enabled = true;
      m.hash = hash;
      m.salt = saltHex;
      m.pinLen = String(pin).length;
      webSetSecMeta(m);
    }
    async function lockVerifyPin(pin) {
      var p = getAppLockPlugin();
      if (p && p.verifyPin) {
        try {
          var r = await p.verifyPin({ pin: String(pin) });
          return !!(r && r.ok);
        } catch (e) { return false; }
      }
      var m = webGetSecMeta();
      if (!m.hash || !m.salt) return false;
      var h = await webHashPin(String(pin), m.salt);
      return h === m.hash;
    }
    async function lockDisable() {
      var p = getAppLockPlugin();
      if (p && p.disable) {
        await p.disable();
        return;
      }
      webSetSecMeta({});
    }
    async function lockSetBiometric(on) {
      var p = getAppLockPlugin();
      if (p && p.setBiometricEnabled) {
        await p.setBiometricEnabled({ enabled: !!on });
        return;
      }
      var m = webGetSecMeta();
      m.bio = !!on;
      webSetSecMeta(m);
    }
    /* منبع حقیقت قفل خودکار: فقط localStorage — پلاگین گاهی 0 برمی‌گرداند و تنظیم را خراب می‌کند */
    var __autoLockSecMem = null;
    async function lockGetAutoLockSeconds() {
      if (typeof __autoLockSecMem === 'number' && __autoLockSecMem >= 0) {
        return __autoLockSecMem;
      }
      try {
        var m = webGetSecMeta();
        var v = m.autoLock;
        if (typeof v === 'string') v = parseInt(v, 10);
        if (typeof v === 'number' && !isNaN(v) && v >= 0) {
          __autoLockSecMem = v;
          return v;
        }
      } catch (e) {}
      __autoLockSecMem = 0;
      return 0;
    }
    async function lockSetAutoLockSeconds(sec) {
      sec = Number(sec);
      if (isNaN(sec) || sec < 0) sec = 0;
      __autoLockSecMem = sec;
      try {
        var m = webGetSecMeta();
        m.autoLock = sec;
        webSetSecMeta(m);
      } catch (eW) {}
      /* best-effort به نیتیو — نتیجه خواندن از نیتیو نادیده گرفته می‌شود */
      try {
        var p = getAppLockPlugin();
        if (p && p.setAutoLockSeconds) {
          await p.setAutoLockSeconds({ seconds: sec });
        }
      } catch (eP) {}
    }
    async function lockGetPinLength() {
      var p = getAppLockPlugin();
      if (p && p.getPinLength) {
        try {
          var r = await p.getPinLength();
          return (r && r.length) ? r.length : 6;
        } catch (e) {}
      }
      var m = webGetSecMeta();
      return m.pinLen || 6;
    }

    function isPeriodSelectList(node) {
      try {
        var mw = document.getElementById('monthSelectWrap');
        var yw = document.getElementById('yearSelectWrap');
        if (mw && mw._list === node) return true;
        if (yw && yw._list === node) return true;
      } catch (e) {}
      return false;
    }
    function ensurePeriodSelectListsAttached() {
      try {
        ['monthSelectWrap', 'yearSelectWrap'].forEach(function(id) {
          var w = document.getElementById(id);
          if (w && w._list && !w._list.isConnected) {
            document.body.appendChild(w._list);
          }
          if (w && w._list) {
            try { w._list.classList.remove('open'); } catch (e0) {}
          }
        });
      } catch (e) {}
    }
    function closeFloatingMenusForLock() {
      try {
        document.querySelectorAll('.dark-select-list').forEach(function(n) {
          if (isPeriodSelectList(n)) {
            try { n.classList.remove('open'); } catch (e1) {}
            return;
          }
          /* منوهای موقت (مثل حساب) */
          try { n.remove(); } catch (e2) {}
        });
      } catch (eR) {}
      try {
        var bd = document.getElementById('darkSelectBackdrop');
        if (bd) bd.style.display = 'none';
      } catch (eB) {}
    }
    function showAppLockOverlay(show) {
      var el = document.getElementById('appLockOverlay');
      if (!el) return;
      if (show) {
        closeFloatingMenusForLock();
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        /* چرخش اعداد موجودی پشت قفل دیده نمی‌شود → بعد از باز شدن قفل از نو اجرا شود */
        _hbcReplayAfterUnlock = true;
      } else {
        var wasShown = el.classList.contains('show');
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        ensurePeriodSelectListsAttached();
        if (wasShown && _hbcReplayAfterUnlock) {
          _hbcReplayAfterUnlock = false;
          setTimeout(function () {
            try { var a = document.getElementById('homeBalanceAmt'); if (a) a._hbcBusy = false; } catch (e0) {}
            try { if (_hbcReady) updateHomeBalanceCircle(true); } catch (e1) {}
          }, 220);
        }
      }
    }

    /* تلاش‌های ناموفق رمز ماندگار است (با بستن و باز کردن نرم‌افزار صفر نمی‌شود) و قفل موقت تصاعدی بلندتر می‌شود */
    var LOCK_FAIL_KEY = 'hk_lock_fail';
    function _lockFailState() { try { var o = JSON.parse(localStorage.getItem(LOCK_FAIL_KEY) || '{}') || {}; return { n: o.n | 0, until: +o.until || 0, rounds: o.rounds | 0 }; } catch (e) { return { n: 0, until: 0, rounds: 0 }; } }
    function _lockFailSave(o) { try { localStorage.setItem(LOCK_FAIL_KEY, JSON.stringify(o)); } catch (e) {} }
    var _lfs = _lockFailState();
    var __lockFailCount = _lfs.n;
    var __lockLockUntil = _lfs.until;
    var __bioPrompting = false;

    function renderLockDots() {
      var box = document.getElementById('lockDots');
      if (!box) return;
      var html = '';
      for (var i = 0; i < __lockPinLen; i++) {
        html += '<div class="lock-dot' + (i < __lockPinBuffer.length ? ' filled' : '') + '"></div>';
      }
      box.innerHTML = html;
    }
    function setPinEyeState(inp, btn, show) {
      if (!inp || !btn) return;
      var off = btn.querySelector('.eye-off');
      var on = btn.querySelector('.eye-open');
      if (show) {
        inp.classList.add('show-pin');
        if (off) off.style.display = 'none';
        if (on) on.style.display = '';
      } else {
        inp.classList.remove('show-pin');
        if (off) off.style.display = '';
        if (on) on.style.display = 'none';
      }
      btn.classList.toggle('on', !!show);
    }
    function resetPinEyeHidden(inputId, btnId) {
      setPinEyeState(document.getElementById(inputId), document.getElementById(btnId), false);
    }
    /* یک بار برای همیشه — از اولین باز شدن کار می‌کند */
    if (!window.__pinEyeDelegated) {
      window.__pinEyeDelegated = true;
      document.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest && e.target.closest('#lockPinEye, #pinSetupEye');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var inpId = (btn.id === 'lockPinEye') ? 'lockPinInput' : 'pinSetupInput';
        var inp = document.getElementById(inpId);
        if (!inp) return;
        var show = !inp.classList.contains('show-pin');
        setPinEyeState(inp, btn, show);
        try { inp.focus({ preventScroll: true }); } catch (err) {}
      }, true);
    }
    function bindLockPinInput() {
      var inp = document.getElementById('lockPinInput');
      var dots = document.getElementById('lockDots');
      if (!inp) return;
      resetPinEyeHidden('lockPinInput', 'lockPinEye');
      if (inp.dataset.bound) return;
      inp.dataset.bound = '1';
      inp.addEventListener('input', function() {
        var v = String(inp.value || '').replace(/\D/g, '');
        if (v.length > __lockPinLen) v = v.slice(0, __lockPinLen);
        if (inp.value !== v) inp.value = v;
        __lockPinBuffer = v;
        renderLockDots();
        var msg = document.getElementById('lockMsg');
        if (msg && v.length) msg.textContent = '';
        if (v.length === __lockPinLen) {
          onLockPinComplete(v);
        }
      });
      if (dots) {
        dots.addEventListener('click', function() {
          try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
        });
      }
    }
    async function onLockPinComplete(pin) {
      if (Date.now() < __lockLockUntil) {
        var left = Math.ceil((__lockLockUntil - Date.now()) / 1000);
        var msg = document.getElementById('lockMsg');
        if (msg) msg.textContent = 'لطفاً ' + left + ' ثانیه صبر کنید';
        return;
      }
      var ok = await lockVerifyPin(pin);
      var inp = document.getElementById('lockPinInput');
      if (ok) {
        __lockFailCount = 0;
        _lockFailSave({ n: 0, until: 0, rounds: 0 });
        __lockUnlockedThisSession = true;
        try { lockNoteUserActivity(); } catch (eAct0) {}
        __lockPinBuffer = '';
        if (inp) inp.value = '';
        showAppLockOverlay(false);
        try { ensurePeriodSelectListsAttached(); } catch (eE) {}
        return;
      }
      __lockFailCount++;
      var _st = _lockFailState(); _st.n = __lockFailCount; _lockFailSave(_st);
      var box = document.getElementById('lockDots');
      if (box) {
        Array.prototype.forEach.call(box.children, function(el){ el.classList.add('error'); });
      }
      var msg = document.getElementById('lockMsg');
      if (__lockFailCount >= 5) {
        /* ۳۰ ثانیه، ۲ دقیقه، ۵ دقیقه، ۱۵ دقیقه، سپس هر بار ۳۰ دقیقه */
        var _st2 = _lockFailState(); var steps = [30, 120, 300, 900, 1800];
        var secs = steps[Math.min(_st2.rounds, steps.length - 1)];
        __lockLockUntil = Date.now() + secs * 1000;
        __lockFailCount = 0;
        _lockFailSave({ n: 0, until: __lockLockUntil, rounds: _st2.rounds + 1 });
        if (msg) msg.textContent = 'تلاش زیاد — ' + toPersianDigits(Math.ceil((__lockLockUntil - Date.now()) / 1000)) + ' ثانیه صبر کنید';
      } else if (msg) {
        msg.textContent = 'رمز نادرست است';
      }
      setTimeout(function() {
        __lockPinBuffer = '';
        if (inp) inp.value = '';
        renderLockDots();
        try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
      }, 350);
    }
    async function tryBiometricUnlock() {
      if (__bioPrompting) return;
      var p = getAppLockPlugin();
      if (!p || !p.authenticateBiometric) return;
      __bioPrompting = true;
      var hint = document.getElementById('lockBioHint');
      if (hint) hint.style.display = 'block';
      try {
        var r = await p.authenticateBiometric({
          title: 'ورود به حساب‌کتاب',
          subtitle: 'چهره یا اثرانگشت خود را تأیید کنید'
        });
        if (r && r.ok) {
          __lockUnlockedThisSession = true;
        try { lockNoteUserActivity(); } catch (eAct0) {}
          __lockFailCount = 0;
          try { _lockFailSave({ n: 0, until: 0, rounds: 0 }); } catch (eLf) {}
          showAppLockOverlay(false);
        } else {
          var msg = document.getElementById('lockMsg');
          if (msg) msg.textContent = 'رمز را وارد کنید';
          var inp = document.getElementById('lockPinInput');
          try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
        }
      } catch (e) {
        var msg2 = document.getElementById('lockMsg');
        if (msg2) msg2.textContent = 'رمز را وارد کنید';
      } finally {
        __bioPrompting = false;
        if (hint) hint.style.display = 'none';
      }
    }
    async function presentLockScreen() {
      try { closeFloatingMenusForLock(); } catch (e0) {}
      try {
        document.querySelectorAll('.sec-autolock-list.open').forEach(function(el) {
          try { el.classList.remove('open'); el.hidden = true; } catch (e2) {}
        });
      } catch (e3) {}
      __lockPinLen = await lockGetPinLength();
      __lockPinBuffer = '';
      bindLockPinInput();
      renderLockDots();
      var msg = document.getElementById('lockMsg');
      if (msg) msg.textContent = '';
      var inp = document.getElementById('lockPinInput');
      if (inp) {
        inp.value = '';
        inp.maxLength = __lockPinLen;
        inp.classList.remove('show-pin');
        inp.type = 'tel';
        var eyeBtn = document.getElementById('lockPinEye');
        if (eyeBtn) {
          var off = eyeBtn.querySelector('.eye-off');
          var on = eyeBtn.querySelector('.eye-open');
          if (off) off.style.display = '';
          if (on) on.style.display = 'none';
          eyeBtn.classList.remove('on');
        }
      }
      var bioOn = await lockIsBiometricEnabled();
      var canBio = await lockCanBiometric();
      var hint = document.getElementById('lockBioHint');
      var bioBtn = document.getElementById('lockBioBtn');
      showAppLockOverlay(true);
      /* همیشه کیبورد عددی سیستم را بالا بیاور */
      setTimeout(function() {
        try { inp && inp.focus({ preventScroll: true }); } catch (e) { try { inp && inp.focus(); } catch (e2) {} }
      }, 80);
      setTimeout(function() {
        try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
      }, 320);
      if (bioOn && canBio) {
        if (bioBtn) bioBtn.style.display = 'block';
        if (hint) {
          hint.style.display = 'block';
          hint.textContent = 'در حال احراز هویت…';
        }
        /* بیومتریک خودکار؛ در صورت موفقیت مستقیم وارد نرم‌افزار */
        setTimeout(function(){ tryBiometricUnlock(); }, 250);
      } else {
        if (bioBtn) bioBtn.style.display = 'none';
        if (hint) hint.style.display = 'none';
      }
    }
    /* قفل برنامه روشن ⇒ اسکرین‌شات و پیش‌نمایش «برنامه‌های اخیر» مسدود (FLAG_SECURE) */
    function syncSecureFlag(on) {
      try { var C = window.Capacitor, P = C && C.Plugins && C.Plugins.AppChrome; if (P && P.setSecure) P.setSecure({ on: !!on }).catch(function () {}); } catch (e) {}
    }
    try { document.addEventListener('visibilitychange', function () { if (!document.hidden) lockIsEnabled().then(syncSecureFlag).catch(function () {}); }); } catch (eSF) {}
    async function ensureAppUnlocked() {
      try {
        var on = await lockIsEnabled();
        syncSecureFlag(on);
        if (!on) {
          showAppLockOverlay(false);
          return true;
        }
        /* APP_EXIT از نشست قبلی */
        try {
          if (localStorage.getItem('hk_lock_app_exit') === '1') {
            localStorage.removeItem('hk_lock_app_exit');
            __lockUnlockedThisSession = false;
          }
        } catch (eX) {}
        /* DEVICE_LOCK از قبل از کشته شدن پروسس */
        try {
          if (await lockConsumeDeviceLockedFlag()) {
            __lockUnlockedThisSession = false;
          }
        } catch (eD) {}
        if (__lockUnlockedThisSession) {
          showAppLockOverlay(false);
          return true;
        }
        await presentLockScreen();
        return false;
      } catch (e) {
        showAppLockOverlay(false);
        return true;
      }
    }

    function promptPinFlow(opts) {
      opts = opts || {};
      return new Promise(function(resolve, reject) {
        var ov = document.getElementById('pinSetupOverlay');
        var title = document.getElementById('pinSetupTitle');
        var hint = document.getElementById('pinSetupHint');
        var inp = document.getElementById('pinSetupInput');
        var ok = document.getElementById('pinSetupOk');
        var cancel = document.getElementById('pinSetupCancel');
        if (!ov || !inp) { reject(new Error('no ui')); return; }
        __pinSetupState = { mode: opts.mode || 'new', step: 0, temp: '', resolve: resolve, reject: reject, pinLen: opts.pinLen || 0 };
        function focusPinSetupInput() {
          setTimeout(function() {
            try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
          }, 60);
          setTimeout(function() {
            try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
          }, 220);
        }
        function setStepUI() {
          var st = __pinSetupState;
          inp.value = '';
          if (st.mode === 'current') {
            title.textContent = 'ورود رمز فعلی';
            hint.textContent = 'رمز فعلی (۴ تا ۶ رقم) را وارد کنید';
          } else if (st.mode === 'new' && st.step === 0) {
            title.textContent = 'تعیین رمز جدید';
            hint.textContent = 'یک رمز ۴ تا ۶ رقمی وارد کنید';
          } else if (st.mode === 'new' && st.step === 1) {
            title.textContent = 'تکرار رمز';
            hint.textContent = 'رمز را دوباره وارد کنید';
          } else if (st.mode === 'change_current') {
            title.textContent = 'رمز فعلی';
            hint.textContent = 'برای تغییر رمز، رمز فعلی را وارد کنید';
          }
          resetPinEyeHidden('pinSetupInput', 'pinSetupEye');
          if (inp) {
            inp.classList.remove('show-pin');
            inp.type = 'tel';
          }
          focusPinSetupInput();
        }
        setStepUI();
        ov.classList.add('show');
        focusPinSetupInput();
        ok.onclick = async function() {
          var v = String(inp.value || '').replace(/\D/g, '');
          var st = __pinSetupState;
          if (!st) return;
          if (st.mode === 'current' || st.mode === 'change_current') {
            if (v.length < 4 || v.length > 6) { showToast('رمز باید ۴ تا ۶ رقم باشد'); return; }
            var okv = await lockVerifyPin(v);
            if (!okv) { showToast('رمز نادرست است'); return; }
            ov.classList.remove('show');
            var res = st.resolve;
            __pinSetupState = null;
            res({ ok: true, pin: v });
            return;
          }
          if (st.mode === 'new' && st.step === 0) {
            if (v.length < 4 || v.length > 6) { showToast('رمز باید ۴ تا ۶ رقم باشد'); return; }
            st.temp = v;
            st.step = 1;
            setStepUI();
            return;
          }
          if (st.mode === 'new' && st.step === 1) {
            if (v !== st.temp) { showToast('رمزها یکسان نیستند'); st.step = 0; setStepUI(); return; }
            ov.classList.remove('show');
            var res2 = st.resolve;
            var pin = st.temp;
            __pinSetupState = null;
            res2({ ok: true, pin: pin });
          }
        };
        cancel.onclick = function() {
          ov.classList.remove('show');
          var rej = __pinSetupState && __pinSetupState.reject;
          __pinSetupState = null;
          if (rej) rej(new Error('cancel'));
        };
      });
    }

    async function openSecurityModal() {
      try { closeSideMenu(); } catch (e) {}
      var modal = document.getElementById('securityModal');
      if (!modal) return;
      modal.classList.add('open');
      try { bindSecAutoLockDropdown(); } catch (e) {}
      await refreshSecurityModal();
    }
    function closeSecurityModal() {
      var modal = document.getElementById('securityModal');
      if (modal) modal.classList.remove('open');
      try { document.body.style.overflow = ''; } catch (e) {}
      try {
        var bd = document.getElementById('darkSelectBackdrop');
        if (bd) bd.style.display = 'none';
      } catch (e2) {}
    }
    async function refreshSecurityModal() {
      var enabled = await lockIsEnabled();
      var bioOn = await lockIsBiometricEnabled();
      var canBio = await lockCanBiometric();
      var autoSec = await lockGetAutoLockSeconds();
      var st = document.getElementById('secStatusText');
      if (st) {
        st.textContent = enabled
          ? ('قفل برنامه روشن است' + (bioOn ? ' · اثرانگشت فعال' : ''))
          : 'قفل برنامه خاموش است';
      }
      var sel = document.getElementById('secAutoLockSelect');
      if (sel) sel.value = String(autoSec);
      try { updateSecAutoLockUI(String(autoSec)); } catch (eA) {}
      var act = document.getElementById('secActions');
      if (!act) return;
      act.innerHTML = '';
      if (!enabled) {
        var b1 = document.createElement('button');
        b1.className = 'sec-btn-primary';
        b1.textContent = 'فعال کردن قفل برنامه';
        b1.onclick = enableAppLockFlow;
        act.appendChild(b1);
      } else {
        var bCh = document.createElement('button');
        bCh.className = 'sec-btn-secondary';
        bCh.textContent = 'تغییر رمز';
        bCh.onclick = changePinFlow;
        act.appendChild(bCh);
        if (canBio) {
          var bBio = document.createElement('button');
          bBio.className = 'sec-btn-secondary';
          bBio.textContent = bioOn ? 'غیرفعال کردن اثرانگشت' : 'فعال کردن اثرانگشت';
          bBio.onclick = async function() {
            if (!bioOn) {
              try {
                var p = getAppLockPlugin();
                if (p && p.authenticateBiometric) {
                  var r = await p.authenticateBiometric({ title: 'تأیید اثرانگشت', subtitle: 'برای فعال‌سازی' });
                  if (!(r && r.ok)) { showToast('احراز هویت ناموفق'); return; }
                }
              } catch (e) { showToast('اثرانگشت در دسترس نیست'); return; }
            }
            await lockSetBiometric(!bioOn);
            showToast(bioOn ? 'اثرانگشت خاموش شد' : 'اثرانگشت فعال شد');
            refreshSecurityModal();
          };
          act.appendChild(bBio);
        }
        var bOff = document.createElement('button');
        bOff.className = 'sec-btn-danger';
        bOff.textContent = 'غیرفعال کردن قفل برنامه';
        bOff.onclick = disableAppLockFlow;
        act.appendChild(bOff);
      }
    }
    async function enableAppLockFlow() {
      try {
        var r = await promptPinFlow({ mode: 'new' });
        if (!r || !r.pin) return;
        await lockSetPin(r.pin);
        await lockSetBiometric(false);
        showToast('قفل برنامه فعال شد');
        __lockUnlockedThisSession = true;
        await refreshSecurityModal();
      } catch (e) {}
    }
    async function changePinFlow() {
      try {
        await promptPinFlow({ mode: 'change_current' });
        var r = await promptPinFlow({ mode: 'new' });
        if (!r || !r.pin) return;
        await lockSetPin(r.pin);
        showToast('رمز با موفقیت تغییر کرد');
        await refreshSecurityModal();
      } catch (e) {}
    }
    async function disableAppLockFlow() {
      try {
        await promptPinFlow({ mode: 'current' });
        await lockDisable();
        __lockUnlockedThisSession = true;
        showToast('قفل برنامه خاموش شد');
        await refreshSecurityModal();
      } catch (e) {}
    }
        var SEC_AUTO_LABELS = { '0': 'بلافاصله', '30': 'بعد از ۳۰ ثانیه', '120': 'بعد از ۲ دقیقه', '300': 'بعد از ۵ دقیقه' };
    function updateSecAutoLockUI(val) {
      val = String(val == null ? '0' : val);
      if (val === '60') val = '120';
      var hid = document.getElementById('secAutoLockSelect');
      var lab = document.getElementById('secAutoLockLabel');
      var list = document.getElementById('secAutoLockList');
      if (hid) hid.value = val;
      if (lab) lab.textContent = SEC_AUTO_LABELS[val] || SEC_AUTO_LABELS['0'];
      if (list) {
        Array.prototype.forEach.call(list.querySelectorAll('.sec-autolock-opt'), function(b) {
          b.classList.toggle('selected', b.getAttribute('data-v') === val);
        });
      }
    }
    function closeSecAutoLockList() {
      var list = document.getElementById('secAutoLockList');
      var btn = document.getElementById('secAutoLockBtn');
      if (list) { list.classList.remove('open'); list.hidden = true; }
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function bindSecAutoLockDropdown() {
      var wrap = document.getElementById('secAutoLockWrap');
      var btn = document.getElementById('secAutoLockBtn');
      var list = document.getElementById('secAutoLockList');
      if (!wrap || !btn || !list || wrap.dataset.bound) return;
      wrap.dataset.bound = '1';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = list.classList.contains('open');
        if (open) closeSecAutoLockList();
        else {
          list.hidden = false;
          list.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
      list.addEventListener('click', function(e) {
        var opt = e.target && e.target.closest && e.target.closest('.sec-autolock-opt');
        if (!opt) return;
        e.preventDefault();
        e.stopPropagation();
        var v = opt.getAttribute('data-v') || '0';
        updateSecAutoLockUI(v);
        closeSecAutoLockList();
        onAutoLockChange();
      });
      document.addEventListener('click', function(e) {
        if (!wrap.contains(e.target)) closeSecAutoLockList();
      });
    }
    async function onAutoLockChange() {
      var sel = document.getElementById('secAutoLockSelect');
      if (!sel) return;
      var v = parseInt(String(sel.value || '0'), 10);
      if (isNaN(v) || v < 0) v = 0;
      await lockSetAutoLockSeconds(v);
      try { __lockBgTs = 0; } catch (eB) {}
      try { lockNoteUserActivity(); } catch (eA) {}
      var check = await lockGetAutoLockSeconds();
      try { updateSecAutoLockUI(String(check)); } catch (eU) {}
      var label = check === 0 ? 'بلافاصله' : (check === 30 ? '۳۰ ثانیه' : (check === 120 ? '۲ دقیقه' : (check === 300 ? '۵ دقیقه' : (check + ' ثانیه'))));
      showToast('قفل خودکار: ' + label);
    }

    /**
     * سه علت مستقل قفل (هرگز با onPause خالی قاطی نشوند):
     *   DEVICE_LOCK — فقط خاموش/قفل شدن صفحه گوشی (flag نیتیو)
     *   TIMEOUT     — فقط اگر sec>0 و elapsed >= sec
     *   APP_EXIT    — فقط خروج با دبل‌بک (localStorage) یا cold start بدون نشست باز
     * تعویض برنامه با صفحه روشن → فقط timestamp؛ بدون قفل.
     */
    /**
     * قفل — سه علت کاملاً مستقل:
     *
     * DEVICE_LOCK  فقط با SCREEN_OFF نیتیو (flag در SharedPreferences)
     *              onPause / visibility / تعویض برنامه به تنهایی هرگز قفل نمی‌کنند
     *
     * APP_EXIT     فقط با Double-Back → doAppExit (localStorage hk_lock_app_exit)
     *
     * TIMEOUT      فقط بی‌فعالیتی داخل خود نرم‌افزار (آخرین لمس/کلیک)
     *              رفتن به برنامهٔ دیگر زمان Timeout را به‌عنوان «خروج» حساب نمی‌کند
     */
    var __lockLastActivityTs = Date.now();
    var __lockIdleTimer = null;

    function lockNoteUserActivity() {
      __lockLastActivityTs = Date.now();
    }

    function bindAppLockLifecycle() {
      if (window._appLockLifecycleBound) return;
      window._appLockLifecycleBound = true;

      /* ردیابی فعالیت کاربر فقط وقتی نرم‌افزار در پیش‌زمینه است */
      try {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function(ev) {
          document.addEventListener(ev, function() {
            try {
              if (document.visibilityState === 'visible') lockNoteUserActivity();
            } catch (e) {}
          }, true);
        });
      } catch (eAct) {}

      async function lockForReason(reason) {
        try {
          var on = await lockIsEnabled();
          if (!on) return;
          __lockUnlockedThisSession = false;
          await presentLockScreen();
        } catch (e) {}
      }

      /** فقط DEVICE_LOCK از نیتیو — هیچ ربطی به background ندارد */
      async function checkDeviceLockReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          var was = false;
          try { was = await lockConsumeDeviceLockedFlag(); } catch (e) { was = false; }
          if (was) {
            await lockForReason('DEVICE_LOCK');
            return true;
          }
        } catch (e) {}
        return false;
      }

      /** فقط APP_EXIT */
      async function checkAppExitReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          var appExit = false;
          try {
            appExit = localStorage.getItem('hk_lock_app_exit') === '1';
            if (appExit) localStorage.removeItem('hk_lock_app_exit');
          } catch (e) { appExit = false; }
          if (appExit) {
            await lockForReason('APP_EXIT');
            return true;
          }
        } catch (e) {}
        return false;
      }

      var __lockBgTs = 0;

      function markBackgroundForTimeout() {
        __lockBgTs = Date.now();
      }

      /** TIMEOUT فقط وقتی نرم‌افزار در پس‌زمینه است (برنامهٔ دیگر / صفحه اصلی گوشی)
       * در حین کار با نرم‌افزار قفل نمی‌شود
       * sec===0 «بلافاصله»: هر برگشت از پس‌زمینه
       * sec>0: فقط اگر زمان پس‌زمینه >= sec
       */
      async function checkBackgroundTimeoutReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          if (!__lockUnlockedThisSession) return false;
          if (!__lockBgTs) return false;
          var sec = await lockGetAutoLockSeconds();
          var elapsed = (Date.now() - __lockBgTs) / 1000;
          if (sec === 0) {
            await lockForReason('TIMEOUT_IMMEDIATE');
            return true;
          }
          if (sec > 0 && elapsed >= sec) {
            await lockForReason('TIMEOUT');
            return true;
          }
        } catch (e) {}
        return false;
      }

      /**
       * resume:
       * 1) DEVICE_LOCK
       * 2) APP_EXIT
       * 3) TIMEOUT (زمان پس‌زمینه >= تنظیم کاربر)
       * تعویض برنامه کوتاه‌تر از timeout → قفل نمی‌شود
       */
      async function onAppForeground() {
        try {
          if (await checkDeviceLockReason()) return;
          if (await checkAppExitReason()) return;
          if (await checkBackgroundTimeoutReason()) return;
          __lockBgTs = 0;
          lockNoteUserActivity();
        } catch (e) {}
      }

      document.addEventListener('visibilitychange', async function() {
        try {
          if (document.visibilityState === 'hidden') {
            markBackgroundForTimeout();
          } else if (document.visibilityState === 'visible') {
            await onAppForeground();
          }
        } catch (e) {}
      }, true);

      try {
        var C = window.Capacitor, plugins = C && C.Plugins, App = plugins && plugins.App;
        if (App && App.addListener) {
          App.addListener('appStateChange', async function(state) {
            try {
              if (!state) return;
              if (!state.isActive) {
                markBackgroundForTimeout();
              } else {
                await onAppForeground();
              }
            } catch (e) {}
          });
          try {
            App.addListener('pause', function() { markBackgroundForTimeout(); });
          } catch (eP) {}
          try {
            App.addListener('resume', async function() { await onAppForeground(); });
          } catch (eR) {}
        }
      } catch (e) {}
    }

    // Gate app start: if lock off → no change; if on → overlay first
    (function initAppLockGate() {
      function run() {
        try { bindAppLockLifecycle(); } catch (e) {}
        try { ensureAppUnlocked(); } catch (e) {}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 30); });
      } else {
        setTimeout(run, 30);
      }
    })();

    // --- اتصال به پلاگین بومی BankSms (Capacitor) برای خواندن خودکار پیامک‌های بانکی ---
    (function () {
      function getPlugin() {
        const C = window.Capacitor;
        return C && C.Plugins && C.Plugins.BankSms;
      }
      let smsPollTimer = null;
      function pollPendingSms() {
        const BankSms = getPlugin();
        if (!BankSms) return;
        // تا چند پیامک پشت‌سرهم از صف نیتیو بخوان (حداکثر ۸ تا در هر دور)
        /* نسخهٔ جدید: همهٔ صف بدون حذف خوانده می‌شود؛ هر پیامک فقط وقتی کاربر آن را ثبت/رد کرد از صف نیتیو پاک می‌شود
           (قبلاً بلافاصله پاک می‌شد و اگر اندروید نرم‌افزار را می‌بست، پیامک برای همیشه گم می‌شد) */
        if (typeof BankSms.getAllPending === 'function') {
          BankSms.getAllPending().then(function (res) {
            var items = (res && res.items) || [];
            /* فقط پیامک‌هایی که در این نوبت تعیین تکلیف شده‌اند یا همین حالا باز/در صف‌اند رد می‌شوند؛
               پیامکی که باکسش بدون تصمیم بسته شد یا نمایش داده نشد، در بازگشت به نرم‌افزار دوباره نشان داده می‌شود */
            var done = window._hkDoneSmsNids || {};
            var live = {};
            try { if (pendingSmsEntry && pendingSmsEntry.nid) live[pendingSmsEntry.nid] = 1; smsPendingQueue.forEach(function (q) { if (q && q.nid) live[q.nid] = 1; }); } catch (eLv) {}
            items.forEach(function (it) {
              if (!it || !it.text) return;
              var nid = it.nid || 0;
              /* ۱.۳.۴۳: «ثبت» از خود اعلان برای پیامکی که همین الان در نرم‌افزار باز/در صف است */
              if (it.quick && nid && live[nid] && !done[nid]) { try { hkQuickApplyLive(nid, it.quickDesc || '', it.quickCat || '', !!it.quickOpen); } catch (eQ) {} return; }
              if (nid && (done[nid] || live[nid])) return;
              var ok = false;
              try { ok = window.onBankSmsReceived(it.text, { nid: nid, sender: it.sender || '', quick: !!it.quick, quickDesc: it.quickDesc || '', quickCat: it.quickCat || '', quickOpen: !!it.quickOpen }); } catch (e) {}
              /* تکراری/غیرتراکنش → از صف نیتیو هم برود */
              if (!ok && nid) { try { BankSms.markHandled({ nid: nid }).catch(function () {}); } catch (e2) {} }
            });
            if (!items.length) { try { cancelHandledSmsNotifications(); } catch (e3) {} }
          }).catch(function () {});
          return;
        }
        function pullOne(left) {
          if (left <= 0) return;
          BankSms.getPendingSms().then(function (res) {
            if (res && res.has && res.text) {
              try { window.onBankSmsReceived(res.text, { nid: res.nid || 0, sender: res.sender || '' }); } catch (e) {}
              BankSms.markHandled().then(function () { pullOne(left - 1); }).catch(function () { pullOne(left - 1); });
            } else {
              try { cancelHandledSmsNotifications(); } catch (e2) {}
            }
          }).catch(function () {});
        }
        pullOne(8);
      }
      function startSmsBridge() {
        try {
          const BankSms = getPlugin();
          if (!BankSms) return;
          // غیرمسدود: اول polling، بعداً permission
          try {
            if (smsPollTimer) clearInterval(smsPollTimer);
            smsPollTimer = setInterval(function () { try { pollPendingSms(); } catch (e) {} }, 4000);
            setTimeout(function () { try { pollPendingSms(); } catch (e) {} }, 800);
          } catch (e) {}
          setTimeout(function () {
            try {
              const p = BankSms.requestPermission && BankSms.requestPermission();
              if (p && typeof p.finally === 'function') {
                p.finally(function () {
                  try { pollPendingSms(); } catch (e) {}
                });
              } else if (p && typeof p.then === 'function') {
                p.then(function () { try { pollPendingSms(); } catch (e) {} }, function () {});
              }
            } catch (e) {}
          }, 1200);
        } catch (e) {}
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(startSmsBridge, 300);
      } else {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(startSmsBridge, 300); });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          pollPendingSms();
          /* صف داخلی منتظر مانده (مثلاً پیامک در پس‌زمینه رسید) → با آمدن نرم‌افزار، باکس ثبت نشان داده شود */
          setTimeout(function () { try { if (!isSmsConfirmOpen() && smsPendingQueue.length) processNextSmsInQueue(); } catch (e) {} }, 600);
        }
      });
    })();

    const BANK_NAME_MIGRATE = {
      'بانک ملی ایران': 'بانک ملی',
      'بانک صادرات ایران': 'بانک صادرات',
      'بانک توسعه صادرات ایران': 'بانک توسعه صادرات',
      'پست بانک ایران': 'پست بانک',
      'بانک ایران زمین': 'بانک ایران‌زمین',
      'بانک قرض‌الحسنه مهر ایران': 'بانک قرض‌الحسنه مهر'
    };
    function bankShortLabel(name) {
      if (name === 'بلوبانک') return 'بلو';
      let s = (name || '').replace(/^بانک\s+/, '');
      s = s.replace(/\s*ایران\s*/g, ' ').replace(/\s+/g, ' ').trim();
      return s;
    }
    let selectedBankAccounts = []; // آرایه رشته یا آبجکت {id,bank,label}
    let smsAccountBankMap = {};
    let trashItems = []; // {id, type, title, data, deletedAt}

    function accountLabel(acc) {
      if (!acc) return '';
      if (typeof acc === 'string') return acc;
      return (acc.label || acc.bank || '').trim();
    }
    function accountBank(acc) {
      if (!acc) return '';
      if (typeof acc === 'string') return acc;
      return (acc.bank || acc.label || '').trim();
    }
    function normalizeSelectedBanks() {
      // مهاجرت: رشته‌های قدیمی → آبجکت؛ اجازه چند حساب از یک بانک
      const out = [];
      const seenIds = new Set();
      (selectedBankAccounts || []).forEach((item, idx) => {
        if (!item) return;
        if (typeof item === 'string') {
          const label = migrateBankName(item);
          out.push({ id: 'ba_' + idx + '_' + Date.now().toString(36), bank: label, label: bankShortLabel(label) || label });
        } else if (typeof item === 'object') {
          const id = item.id || ('ba_' + idx + '_' + Math.random().toString(36).slice(2, 8));
          if (seenIds.has(id)) return;
          seenIds.add(id);
          const bank = migrateBankName(item.bank || item.label || '');
          const label = (item.label || bankShortLabel(bank) || bank).trim();
          if (!label) return;
          const ob = Number(item.openingBalance) || 0;
          var createdAt = null;
          try {
            if (item.createdAt && item.createdAt.y) {
              createdAt = {
                y: parseInt(item.createdAt.y, 10) || 0,
                m: parseInt(item.createdAt.m, 10) || 0,
                d: parseInt(item.createdAt.d, 10) || 0
              };
            }
          } catch (eC) { createdAt = null; }
          var _no = { id: id, bank: bank, label: label, openingBalance: ob, createdAt: createdAt };
          /* ۱.۳.۴۶: نام اصلیِ پیداشده در ثبت گروهی (برای پنجرهٔ تراکنش‌های حساب) */
          if (item.srcName) _no.srcName = String(item.srcName);
          out.push(_no);
        }
      });
      selectedBankAccounts = out;
    }
    function formatAccountCreatedDate(acc) {
      var y, m, d;
      try {
        if (acc && acc.createdAt && acc.createdAt.y) {
          y = parseInt(acc.createdAt.y, 10);
          m = parseInt(acc.createdAt.m, 10);
          d = parseInt(acc.createdAt.d, 10);
        }
      } catch (e) {}
      if (!y || !m || !d) return '';
      function pad(n) {
        n = String(n);
        return n.length < 2 ? ('0' + n) : n;
      }
      return toPersianDigits(String(y) + '/' + pad(m) + '/' + pad(d));
    }
    function selectedAccountLabels() {
      return (selectedBankAccounts || []).map(accountLabel).filter(Boolean);
    }

