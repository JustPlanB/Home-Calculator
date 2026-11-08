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
        /* ۱.۳.۸۵: امتیازدهی (متن، فرستنده، رقم‌های وصل‌شده، …) */
        try { bankName = hkBankOfSms(raw, parsed.sender || '') || detectBankFromSms(raw) || ''; } catch (eB) {}
        /* ۱.۳.۸۷: اگر تشخیص، نامِ یک حساب ساخته‌شده بود («ملت ۶۱۶۳»)، بانکِ همان حساب («بانک ملت») ملاک است تا نام پیشنهادی حساب تازه درست باشد */
        try { var _ah = (selectedBankAccounts || []).filter(function (a) { return accountLabel(a) === bankName; })[0]; if (_ah && accountBank(_ah)) bankName = accountBank(_ah); } catch (eAh) {}
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
          /* ۱.۳.۸۷: بانک شناخته‌شده فقط نمایش داده می‌شود (بی منوی تغییر)؛ ناشناخته: همان انتخاب/افزودن حساب */
          try {
            var _aw = (sel && sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel;
            var _lb = document.querySelector('#smsConfirmMeta .sms-bank-lbl');
            var _bs = document.getElementById('smsBankShow'); if (_bs) _bs.remove();
            var _known = !!(sel && route.label && !route.need && sel.value === route.label);
            if (_aw) _aw.style.display = _known ? 'none' : '';
            if (_lb) _lb.style.display = _known ? 'none' : '';
            if (_known) {
              var _sum = document.querySelector('#smsConfirmMeta .sms-ro-sum');
              if (_sum) { var _bd = document.createElement('div'); _bd.id = 'smsBankShow'; _bd.className = 'sms-ro-line sms-ro-bank'; _bd.textContent = route.label; _bd.setAttribute('data-pre', 'حساب: '); _sum.appendChild(_bd); }
            }
          } catch (eBk) {}
          var _pe0 = document.getElementById('smsPickExisting'); if (_pe0) _pe0.remove();
          /* ۱.۳.۸۷: بار اول از این کارت/حساب: همان باکس «حساب جدید» (اسم را بنویسید، حساب ساخته می‌شود)؛
             اگر همین حساب را قبلاً ساخته‌اید، با یک ضربه انتخاب از فهرست */
          if (sel && route.need && (route.newAcc || route.acc4)) {
            hkSmsBuildNewAcc(sel, route);
            try { var _lb2 = document.querySelector('#smsConfirmMeta .sms-bank-lbl'); if (_lb2) _lb2.style.display = 'none'; } catch (eL2) {}
            var _hasAcc = false; try { _hasAcc = selectedAccountLabels().length > 0; } catch (eHa) {}
            if (_hasAcc) hkSmsPickExistingLink(sel, route);
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
      function hkSmsPickExistingLink(sel, route) {
        var nw = document.getElementById('smsNewAccWrap'); if (!nw) return;
        var lk = document.createElement('button'); lk.type = 'button'; lk.id = 'smsPickExisting'; lk.className = 'sms-pick-existing';
        lk.textContent = 'این حساب را قبلاً ساخته‌اید؟ انتخاب از حساب‌ها';
        lk.onclick = function () {
          try { nw.remove(); lk.remove(); } catch (eR) {}
          var aw = (sel.parentNode && sel.parentNode.classList && sel.parentNode.classList.contains('fancy-select-wrap')) ? sel.parentNode : sel;
          aw.style.display = '';
          var lb = document.querySelector('#smsConfirmMeta .sms-bank-lbl'); if (lb) lb.style.display = '';
          hkSmsAccNeedNote(sel, route);
        };
        nw.insertAdjacentElement('afterend', lk);
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
    /* ۱.۳.۸۵: عکس دلخواه برای دسته‌های ساخت کاربر (هم‌اندازهٔ آیکون‌ها؛ فقط روی همین گوشی و در پشتیبان) */
    var HK_CAT_IMG_KEY = STORAGE_KEY + '_catImg';
    function hkCatImgMap() { try { var o = JSON.parse(localStorage.getItem(HK_CAT_IMG_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function hkCatImgSet(id, url) { var m = hkCatImgMap(); if (url) m[id] = url; else delete m[id]; try { hkStorageSet(HK_CAT_IMG_KEY, JSON.stringify(m)); } catch (e) {} }
    /** آیکون یک دسته (عکس کاربر، یا شکل خطی، یا «؟» برای نامشخص) */
    /* ۱.۳.۸۶: بانک آیکون برای دسته‌های ساخت کاربر (همان سبک خطی)؛ هر آیکون و هر رنگ فقط برای یک دسته */
    var HK_ICON_BANK = {
      plant: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/><path d="M8 21h8"/>',
      paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="13.5" cy="6.5" r="1.8"/><circle cx="17" cy="10" r="1.8"/><path d="M12 12c-3 0-5 3.5-5 5.5S9 20 12 19c3 1 5 .5 5-1.5S15 12 12 12z"/>',
      bottle: '<path d="M10 3h4v3h-4z"/><path d="M9 6h6l1 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9z"/><path d="M9 12h6M9 15h6"/>',
      dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
      coffee: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c-1 1 1 2 0 3M12 3c-1 1 1 2 0 3"/>',
      luggage: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4h6v3M9 11v5M15 11v5"/>',
      plane: '<path d="M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V21l3.5-1 3.5 1v-1.5L13 19v-4l8 2z"/>',
      bicycle: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l2.5 7H6M14 6h2"/>',
      motorcycle: '<circle cx="5.5" cy="16" r="3"/><circle cx="18.5" cy="16" r="3"/><path d="M5.5 16h6l3-5h-4M14.5 11l4 5M15 7h3l1 4"/>',
      music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
      film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
      game: '<rect x="2.5" y="8" width="19" height="10" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="15.5" cy="12" r="1"/><circle cx="18" cy="14.5" r="1"/>',
      camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
      laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
      wrench: '<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 3-3-3 3-3a5 5 0 0 0-2-2z"/>',
      brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-5 2-5 5 0 1.5-1 3-1 3s5 0 6-1 3-3 3-4"/>',
      scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 18M8 15.5L20 6"/>',
      washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6h.01M10 6h.01"/>',
      flower: '<circle cx="12" cy="8" r="2"/><path d="M12 6c0-3 3-3 3 0M12 6c0-3-3-3-3 0M14 8c3 0 3 3 0 3M10 8c-3 0-3 3 0 3M12 10v11M12 17c-2-3-5-2-5-2s1 3 5 2"/>',
      cake: '<path d="M4 21h16M5 21v-7h14v7M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0"/><path d="M12 14v-3M12 8a1 1 0 0 1 0-2c0 1 1 1 0 2z"/>',
      shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
      doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
      parking: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M10 17V7h3a3 3 0 0 1 0 6h-3"/>',
      battery: '<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3M7 11v3M11 11v3"/>',
      wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      glasses: '<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14h4M3 14l1.5-6M21 14l-1.5-6"/>',
      pill: '<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9.5 8.3l5 7"/>',
      charity: '<path d="M12 10.5s-3.5-2.2-3.5-4.6A2 2 0 0 1 12 4.7a2 2 0 0 1 3.5 1.2c0 2.4-3.5 4.6-3.5 4.6z"/><path d="M2 14h3l3.5 2H13a1.5 1.5 0 0 1 0 3H9M5 19.5h8.5l6.5-4a1.5 1.5 0 0 0-1.8-2.4L14 15.5"/>',
      umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/>',
      fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M7 8h6"/><path d="M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/>'
    };
    /* ۱.۳.۹۳: آیکون‌های بیشتر برای دسته‌های ساخت کاربر (از روی نمونه‌های کاربر، با همان سبک خطی نرم‌افزار، بی تکرار) */
    Object.assign(HK_ICON_BANK, {
      diamond: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M9 9l3 11 3-11"/>',
      ring: '<circle cx="12" cy="15" r="6"/><path d="M9 4h6l-3 5z"/>',
      scales: '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
      gavel: '<path d="M13 4l7 7M9 8l7 7M11 6l5 5"/><path d="M12.5 9.5L4 18l2 2 8.5-8.5"/><path d="M14 21h7"/>',
      lamp: '<path d="M8 3h8l3 8H5z"/><path d="M12 11v8M8 21h8"/>',
      fire: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-4 4-6 4-10 3 1.5 6 4.5 6 8 1-1 1.5-2 1.5-3.5 1.5 1.5 2.5 3.5 2.5 5.5 0 3.8-3 6.5-7 6.5z"/>',
      drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
      rocket: '<path d="M12 3c3 2 5 6 4 12H8C7 9 9 5 12 3z"/><circle cx="12" cy="9" r="1.6"/><path d="M8 15l-3 3v2l4-2M16 15l3 3v2l-4-2M10 18l2 3 2-3"/>',
      bowling: '<path d="M7 21c-1.5-3-1.5-6 0-9-1-2-1-5 1-6 2 1 2 4 1 6 1.5 3 1.5 6 0 9z"/><path d="M15 21c-1.5-3-1.5-6 0-9-1-2-1-5 1-6 2 1 2 4 1 6 1.5 3 1.5 6 0 9z"/>',
      bowlball: '<circle cx="12" cy="12" r="8.5"/><circle cx="10" cy="8.5" r="1"/><circle cx="13.5" cy="8" r="1"/><circle cx="12" cy="11" r="1"/>',
      football: '<ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-45 12 12)"/><path d="M9 15l6-6M10.5 10.5l3 3M9 12l3 3M12 9l3 3"/>',
      soccer: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.5 2.5-1.3 4h-4.4L8.5 10z"/><path d="M12 3v4.5M15.5 10l4.5-1.5M14.2 14l2.8 4.5M9.8 14L7 18.5M8.5 10L4 8.5"/>',
      tennis: '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5c3 3 3 10 0 13M18.5 5.5c-3 3-3 10 0 13"/>',
      chess: '<path d="M9 21h6M8 18h8l-1-6h-6z"/><path d="M10 12V9h4v3M12 3v4M10.5 5h3"/>',
      bandage: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M10 10h.01M14 14h.01M10 14h.01M14 10h.01"/>',
      syringe: '<path d="M18 3l3 3M19.5 4.5l-3 3M16.5 4.5l3 3"/><path d="M14 6l4 4-9 9H5v-4z"/><path d="M3 21l2-2M9 11l2 2M11 9l2 2"/>',
      tooth: '<path d="M12 6c-2-2-6-2-7 1-1 4 1 6 1.5 9s1 5 2.5 5 1.5-3 3-3 1.5 3 3 3 2-2 2.5-5 2.5-5 1.5-9c-1-3-5-3-7-1z"/>',
      bone: '<path d="M8 10.5h8v3H8z"/><circle cx="6.3" cy="9.7" r="2.2"/><circle cx="6.3" cy="14.3" r="2.2"/><circle cx="17.7" cy="9.7" r="2.2"/><circle cx="17.7" cy="14.3" r="2.2"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
      papercup: '<path d="M6 7h12l-1.5 14h-9z"/><path d="M5 7l1-3h12l1 3M7 12h10"/>',
      teacup: '<path d="M4 10h13v3a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2 2 0 0 1 0 4H16M3 21h16"/>',
      cocktail: '<path d="M4 4h16l-8 9z"/><path d="M12 13v7M8 20h8M15 4l3-2"/>',
      wine: '<path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M12 13v8M8 21h8M7 7h10"/>',
      soda: '<path d="M6 7h12l-1.5 14h-9z"/><path d="M5 7h14M13 7l2-5h3"/>',
      burger: '<path d="M4 11a8 6 0 0 1 16 0z"/><path d="M3 14h18M4 17h16a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3z"/>',
      fries: '<path d="M6 11h12l-1.5 10h-9z"/><path d="M8 11V5M11 11V3M14 11V4M17 11V6"/>',
      egg: '<path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z"/>',
      drumstick: '<path d="M15 4a5 5 0 0 1 2 9.5L11 18"/><path d="M15 4a5 5 0 0 0-4.6 7L9 15"/><path d="M9 15l-2.5 2.5a2 2 0 1 0 1.5 3 2 2 0 1 0 3-1.5L11 18"/>',
      fish: '<path d="M3 12c3-5 9-6 13-3l5-3v12l-5-3c-4 3-10 2-13-3z"/><circle cx="8" cy="11" r=".8"/>',
      icecream: '<path d="M7 10l5 11 5-11"/><path d="M6 10a6 6 0 0 1 12 0z"/>',
      popsicle: '<path d="M8 15V7a4 4 0 0 1 8 0v8z"/><path d="M12 15v6M11 7v4"/>',
      apple: '<path d="M12 7c-2-2-7-1.5-7 4 0 5 3 10 5 10 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-5 5-10 0-5.5-5-6-7-4z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
      strawberry: '<path d="M12 8c4 0 7 1.5 7 4.5S16 21 12 21s-7-5.5-7-8.5S8 8 12 8z"/><path d="M9 5l3 3 3-3M12 8V3M10 13h.01M14 13h.01M12 16h.01"/>',
      carrot: '<path d="M14 10L4 20"/><path d="M14 10c2-2 2-5 0-6-3 2-9 9-10 16 7-1 14-7 16-10-1-2-4-2-6 0z"/><path d="M15 9l5-5M17 5l2-2"/>',
      chefhat: '<path d="M7 14v6h10v-6"/><path d="M7 14a4 4 0 1 1 2-7.5 4 4 0 0 1 6 0A4 4 0 1 1 17 14z"/><path d="M7 17h10"/>',
      knife: '<path d="M20 4L8 16l-3-3z"/><path d="M8 16l-4 4M5.5 17.5L3 20"/>',
      mitten: '<path d="M7 21v-4h9v4"/><path d="M7 17l-1-8a5 5 0 0 1 10-1v9"/><path d="M15 11l3-2a2 2 0 0 1 2 3l-4 4"/>',
      tophat: '<path d="M7 4h10v12H7z"/><path d="M3 16h18v3H3zM7 12h10"/>',
      tshirt: '<path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/>',
      shoe: '<path d="M3 18V8h5l2 3h3l6 3a2 2 0 0 1 2 2v2z"/><path d="M3 15h18M10 11l-1 2M13 11l-1 2"/>',
      tie: '<path d="M10 3h4l-1 3h-2z"/><path d="M11 6l-2 10 3 5 3-5-2-10"/>',
      bowtie: '<path d="M3 7l7 3.5v3L3 17zM21 7l-7 3.5v3l7 3.5z"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
      firework: '<path d="M12 12L4 20M12 12V4M12 12h8M12 12l5.5-5.5M12 12l5.5 5.5M12 12L6.5 6.5"/><circle cx="12" cy="12" r="1"/>',
      balloon: '<path d="M12 3a6 6 0 0 1 6 6c0 4-3 7-6 7s-6-3-6-7a6 6 0 0 1 6-6z"/><path d="M11 16l1 2 1-2M12 18c-1 1.5 1 2 0 3.5"/>',
      dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/>',
      cards: '<rect x="4" y="5" width="11" height="15" rx="2" transform="rotate(-10 9.5 12.5)"/><path d="M15 5.5l3.5.5a2 2 0 0 1 1.7 2.3l-1.7 10.5"/><path d="M9.5 10.5l1.5 2-1.5 2-1.5-2z"/>',
      lips: '<path d="M2 12c3-4 6-5 8-3.5h4C16 7 19 8 22 12c-3 4-6 6-10 6s-7-2-10-6z"/><path d="M2 12h20"/>',
      blocks: '<rect x="3" y="12" width="8" height="8" rx="1"/><rect x="13" y="12" width="8" height="8" rx="1"/><rect x="8" y="4" width="8" height="8" rx="1"/>',
      snowflake: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.5l2 2 2-2M10 19.5l2-2 2 2"/>',
      tree: '<path d="M12 3l5 6h-3l4 6h-4l3 4H7l3-4H6l4-6H7z"/><path d="M12 19v2"/>',
      snowman: '<circle cx="12" cy="7" r="3.5"/><circle cx="12" cy="16" r="5"/><path d="M8 11l-4-2M16 11l4-2M12 14h.01M12 17h.01"/>',
      atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)"/>',
      network: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.5 6.5l3.7 3.7M17.5 6.5l-3.7 3.7M6.5 17.5l3.7-3.7M17.5 17.5l-3.7-3.7"/>',
      files: '<path d="M8 7V3h8l4 4v11h-4"/><path d="M4 7h8l4 4v10H4z"/>',
      piano: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7.5 5v14M12 5v14M16.5 5v14"/><path d="M6 5v8h3V5M10.5 5v8h3V5M15 5v8h3V5" fill="currentColor"/>',
      guitar: '<path d="M14 10l6-6M18 3l3 3"/><path d="M14 10a3.5 3.5 0 0 0-5 0c-.8.8-.5 2-1.5 2.5-2 .5-4 1.5-4 4 0 2.5 2 4.5 4.5 4.5 2.5 0 3.5-2 4-4 .5-1 1.7-.7 2.5-1.5a3.5 3.5 0 0 0-.5-5.5z"/><circle cx="10" cy="14" r="1.2"/>',
      sofa: '<path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 11a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v6H3zM5 17v2M19 17v2"/>',
      bed: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
      desk: '<path d="M3 8h18M5 8v12M19 8v12M13 8v7h6"/><path d="M15 11h2"/>',
      doghouse: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-5a3 3 0 0 1 6 0v5"/>',
      petbowl: '<path d="M3 13h18l-2 6H5z"/><path d="M8 10.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1 2 0 1.5 1.5 0 1 1 3 0"/>',
      bug: '<rect x="7" y="8" width="10" height="13" rx="5"/><path d="M12 8v13M9 8a3 3 0 0 1 6 0M3 12h4M17 12h4M3 18l4-2M21 18l-4-2M5 6l3 3M19 6l-3 3"/>',
      alien: '<path d="M12 3c-4.5 0-8 3-8 7 0 5 5 11 8 11s8-6 8-11c0-4-3.5-7-8-7z"/><path d="M7 11c1.5 0 3 1 3.5 3-2 0-3.5-1-3.5-3zM17 11c-1.5 0-3 1-3.5 3 2 0 3.5-1 3.5-3z"/>',
      saw: '<circle cx="12" cy="12" r="3"/><path d="M12 3l2 3h3.5l-.5 3.5 3 2-3 2 .5 3.5H14l-2 3-2-3H6.5l.5-3.5-3-2 3-2-.5-3.5H10z"/>',
      car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
      helicopter: '<path d="M3 5h16M11 5v3"/><path d="M5 12c0-2 2-4 5-4h3a5 5 0 0 1 5 5v1H8a3 3 0 0 1-3-2z"/><path d="M18 11h4M10 14v4M15 14v4M7 18h10"/>',
      sailboat: '<path d="M12 3v14M12 3l7 12h-7M12 6L6 15h6"/><path d="M3 18h18l-2 3H5z"/>',
      anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10h8M4 13a8 8 0 0 0 16 0M4 13l-1.5 1.5M20 13l1.5 1.5"/>',
      crate: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/>',
      dolly: '<path d="M4 3h2l4 14h10"/><rect x="11" y="6" width="8" height="8" rx="1"/><circle cx="10" cy="19" r="2"/>',
      doorhanger: '<path d="M7 3h10v18H7z"/><circle cx="12" cy="7" r="2"/><path d="M10 13h4M10 16h4"/>',
      wheelchair: '<circle cx="9" cy="4" r="1.6"/><path d="M9 7v6h6l3 6"/><path d="M6.5 10.5a6 6 0 1 0 8 7.5"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
      beach: '<path d="M12 11L7 21M3 21h18"/><path d="M4 9a8.5 6 30 0 1 15.5 6z"/><path d="M11.5 11.8L13 6"/>',
      tent: '<path d="M12 4L2 20h20z"/><path d="M12 4l-3 16M12 4l3 16M9 20l3-6 3 6"/>',
      fence: '<path d="M4 21V7l2-3 2 3v14M10 21V7l2-3 2 3v14M16 21V7l2-3 2 3v14M3 11h18M3 17h18"/>',
      dollar: '<circle cx="12" cy="12" r="9"/><path d="M15 9c-.5-1-1.5-1.5-3-1.5-2 0-3 1-3 2.2C9 13 15 11.5 15 14.5c0 1.2-1 2.2-3 2.2-1.5 0-2.5-.7-3-1.7M12 6v1.5M12 16.7v1.3"/>',
      euro: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5a4 4 0 1 0 0 7M7 11h6M7 13.5h6"/>',
      bitcoin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 7.5h4a2 2 0 0 1 0 4h-4zM9.5 11.5h4.5a2 2 0 0 1 0 4H9.5zM9.5 7.5v8M11 6v1.5M13 6v1.5M11 15.5V17M13 15.5V17"/>',
      wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 7l11-3v3M15 13h5v3h-5a1.5 1.5 0 0 1 0-3z"/>',
      piggy: '<path d="M5 11c0-3 3-5 7-5s7 2 7 5l2 1v3l-2 .5c-.5 1.5-1.5 2.5-3 3V21h-2.5v-1.5h-3V21H8v-2.5C6 17.5 5 15 5 13z"/><path d="M11 6l1-2 2 2M15.5 10h.01M3 10c0 1 1 1.5 2 1"/>',
      coins: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><ellipse cx="15" cy="15" rx="5" ry="2.5"/><path d="M10 15v3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3"/>',
      cash: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
      receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      safe: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="12" cy="11.5" r="3.5"/><path d="M12 8v1.5M12 13.5V15M6 19v2M18 19v2M15.5 11.5H14M10 11.5H8.5"/>',
      piechart: '<path d="M12 3v9h9a9 9 0 1 1-9-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
      speaker: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14.5" r="3.5"/><circle cx="12" cy="7" r="1.5"/>',
      radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="15.5" cy="14" r="2.5"/><path d="M6 12h4M6 15h4M6 18h4"/>',
      envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
      notebook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M3 7h4M3 12h4M3 17h4M10 8h6M10 12h6"/>',
      toiletpaper: '<ellipse cx="8" cy="8" rx="4" ry="5"/><path d="M8 3h9c2.2 0 4 2.2 4 5v13H12V8"/><circle cx="8" cy="8" r="1.2"/>',
      shopbag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
      comb: '<path d="M3 9h18v4H3z"/><path d="M5 13v6M8 13v6M11 13v6M14 13v6M17 13v6M20 13v6"/>',
      bikini: '<path d="M4 4l3 4c1.5 0 3 1 3.5 2.5.5-1.5 2-2.5 3.5-2.5l3-4"/><path d="M4 14h16c-1 3-4.5 5-8 5s-7-2-8-5z"/>',
      watch: '<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4M12 10v2l1.5 1"/>',
      key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/>',
      pad: '<rect x="8" y="2.5" width="8" height="19" rx="4"/><path d="M4 9l4 1M4 15l4-1M20 9l-4 1M20 15l-4-1"/>',
      razor: '<rect x="4" y="3" width="16" height="5" rx="1.5"/><path d="M6 5.5h12M12 8v13"/>',
      newspaper: '<path d="M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4"/>',
      makeup: '<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 6L5 18a2 2 0 0 0 3 3l12-8"/>',
      lipstick: '<path d="M9 21V12h6v9z"/><path d="M10 12V7l4-3v8M8 21h8"/>',
      bathtub: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M5 12V6a2.5 2.5 0 0 1 5 0M6 20l-1 2M18 20l1 2"/>',
      toothbrush: '<path d="M4 20L16 8"/><path d="M14 6l4 4 3-3-4-4z"/><path d="M16 4l-1.5-1.5M18 6l-1.5-1.5"/>',
      phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
      plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>',
      clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM8.5 11l1.5 1.5 3-3M8.5 16.5h7"/>',
      underwear: '<path d="M3 6h18v3l-5 9h-1.5L12 13l-2.5 5H8L3 9z"/><path d="M3 9h18"/>',
      mailbox: '<path d="M4 9a4 4 0 0 1 8 0v8H4z"/><path d="M8 5h9a4 4 0 0 1 4 4v8h-9M8 17v4M15 5V2h3"/>',
      cutlery: '<path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17 21V3c-2 1-3 3.5-3 7h3"/>',
      toaster: '<rect x="3" y="9" width="18" height="11" rx="3"/><path d="M8 9V5h3v4M13 9V5h3v4M7 14h4"/>',
      alarm: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M4 4l3-2M20 4l-3-2M7 20l-1.5 2M17 20l1.5 2"/>',
      backpack: '<path d="M6 9a6 6 0 0 1 12 0v12H6z"/><path d="M10 3h4v3h-4zM9 14h6v4H9zM6 13H4v6h2M18 13h2v6h-2"/>',
      mirror: '<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16v5M9 21h6M10 6l3 3"/>',
      blender: '<path d="M7 3h10l-2 11H9z"/><path d="M7 14h10l1 7H6zM12 17.5h.01M17 6h3"/>',
      broom: '<path d="M20 3l-7 9"/><path d="M13 12c-3-1-6 0-7 3l-3 6h4l1.5-2 1 2H12l1.5-2.5L14 17c.5-2 0-4-1-5z"/>',
      deskphone: '<path d="M3 9a9 4 0 0 1 18 0v2h-4V9H7v2H3z"/><path d="M5 12h14l1 8H4z"/><path d="M9 15h.01M12 15h.01M15 15h.01M9 17.5h.01M12 17.5h.01M15 17.5h.01"/>',
      coupon: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10M7.5 10.5l3 3M7.5 10.5h.01M10.5 13.5h.01"/>',
      socks: '<path d="M7 3h5v9l2.5 2.5a3 3 0 0 1-4.2 4.3L6 14.5A3 3 0 0 1 7 12z"/><path d="M7 6h5M15 3h4v9l1 1"/>',
      steak: '<path d="M5 9c2-5 9-6 13-3 3 2.5 3 7 0 10-2.5 2.5-6 3-9 1l-3 1-1-3c-1.5-2-1-4 0-6z"/><circle cx="14" cy="10" r="2"/>',
      vitamins: '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M8 3h8v4H8zM10 14h4M12 12v4"/>',
      aircon: '<rect x="2" y="4" width="20" height="9" rx="2"/><path d="M5 10h14M8 16c0 2-1.5 2.5-1.5 4M12 16v4M16 16c0 2 1.5 2.5 1.5 4"/>',
      headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
      cap: '<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M4 15h17a1.5 1.5 0 0 1 0 3H8M12 7V5"/>',
      people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3 20a6 6 0 0 1 12 0zM15.5 14.2A4.5 4.5 0 0 1 21.5 18.5V20H17"/>',
      orange: '<circle cx="12" cy="13" r="8"/><path d="M12 5c0-1.5 1-2.5 3-3M12 5c-2-.5-3.5 0-4.5 1.5"/>',
      horse: '<path d="M5 20h14M6 20c0-6 2-10 7-12l1-3 2 3c2 1 3 3 3 5l-2 1-2-1-2 3v4"/><path d="M14.5 8.5h.01"/>',
      bank: '<path d="M3 10l9-6 9 6z"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M4 18h16"/>',
      masks: '<path d="M3 4h9v6a4.5 4.5 0 0 1-9 0z"/><path d="M12 9h9v6a4.5 4.5 0 0 1-9 0z"/><path d="M5.5 8h.01M9.5 8h.01M6 11.5c1 1 2.5 1 3.5 0M14.5 13h.01M18.5 13h.01M15 17.5c1-1 2.5-1 3.5 0"/>',
      raspberry: '<circle cx="9" cy="10" r="2.5"/><circle cx="15" cy="10" r="2.5"/><circle cx="12" cy="14" r="2.5"/><circle cx="9" cy="17" r="2.2"/><circle cx="15" cy="17" r="2.2"/><path d="M10 6l2-3 2 3"/>',
      city: '<path d="M3 21V9h6v12M9 21V4h8v17M17 21v-9h4v9M2 21h20"/><path d="M12 8h2M12 12h2M12 16h2M5.5 13h1M5.5 17h1"/>',
      sewing: '<path d="M3 21h18M5 21V8a3 3 0 0 1 3-3h10a2 2 0 0 1 2 2v4H10v3"/><path d="M10 14v3M9 17h2M17 5V3"/>',
      matryoshka: '<circle cx="12" cy="7" r="4"/><path d="M8 9c-3 3-3 8 0 12h8c3-4 3-9 0-12"/><path d="M10.5 7h.01M13.5 7h.01M9 15h6"/>',
      fan: '<circle cx="12" cy="11" r="1.5"/><path d="M12 9.5c0-3 1.5-5.5 4-5.5 1 2.5-1 5-4 5.5zM13.5 11.5c2.5 1.5 3.5 4 2 6-2.5-.5-3.5-3.5-2-6zM10.5 11.5c-2.5 1.5-5.5 1.5-6.5-.5 1.5-2.5 4.5-2 6.5.5z"/><path d="M12 13v5M9 21h6"/>',
      flashlight: '<path d="M7 3h10v4l-3 4v10h-4V11L7 7z"/><path d="M7 7h10M12 14v2"/>',
      server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01M12 10v4"/>',
      heater: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M7 5v13M11 5v13M15 5v13M19 5v13M6 18v3M18 18v3"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.8"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
      pineapple: '<ellipse cx="12" cy="15" rx="5" ry="6.5"/><path d="M12 8.5L9 3M12 8.5l3-5.5M12 8.5V2M8 12l8 6M16 12l-8 6"/>',
      floppy: '<path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h7V4M7 20v-6h10v6"/>',
      magichat: '<path d="M6 9h12l-1.5 10h-9z"/><path d="M4 9h16M9.5 9V6.5a1.5 1.5 0 1 1 3-1 1.5 1.5 0 1 1 3 1V9"/>',
      easteregg: '<path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z"/><path d="M6 11l2.5 1.5L11 11l2.5 1.5L16 11l2 1M5.6 15.5l2.4 1.5 2.5-1.5 2.5 1.5 2.5-1.5 2.4 1.5"/>',
      chair: '<path d="M7 3h10v9H7zM5 12h14v3H5zM7 15v6M17 15v6"/>',
      smartphone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
      tricycle: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><circle cx="12" cy="18" r="2"/><path d="M5 17l4-9h4l2 4M12 18l1-6M8 5h3"/>',
      book: '<path d="M4 4h6a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h6z"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
      watermelon: '<path d="M3 9h18a9 9 0 0 1-18 0z"/><path d="M5.5 9a6.5 6.5 0 0 0 13 0M9 12.5h.01M12 14h.01M15 12.5h.01"/>',
      smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2M9 9.5h.01M15 9.5h.01"/>',
      drill: '<path d="M3 6h12v6H3zM15 8h6M7 12l-1 7h4l1-7"/><path d="M5 9h6"/>',
      coconut: '<circle cx="12" cy="13" r="8"/><path d="M5 10c3 1.5 11 1.5 14 0M10 6.5h.01M14 6.5h.01M12 8.5h.01"/>',
      chili: '<path d="M18 7c-2 7-8 12-15 13 5-3 8-7 9-12 1-2.5 4-3 6-1z"/><path d="M18 7c0-2 1-3.5 3-4"/>',
      award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5M12 6.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>',
      download: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
      wheat: '<path d="M12 21V7M12 7c-2-1-2-3 0-4 2 1 2 3 0 4zM12 11c-2.5-.5-3.5-2.5-3-4.5 2 0 3.5 2 3 4.5zM12 11c2.5-.5 3.5-2.5 3-4.5-2 0-3.5 2-3 4.5zM12 15c-2.5-.5-3.5-2.5-3-4.5 2 0 3.5 2 3 4.5zM12 15c2.5-.5 3.5-2.5 3-4.5-2 0-3.5 2-3 4.5z"/>',
      pen: '<path d="M16 3l5 5L9 20H4v-5z"/><path d="M13.5 5.5l5 5"/>',
      fax: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M7 9V3h8l2 2v4M7 13h.01M10 13h.01M7 16h.01M10 16h.01M14 13h4v4h-4z"/>',
      train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 14h.01M15 14h.01M7 21l2-4M17 21l-2-4"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      flask: '<path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
      plug: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
      mushroom: '<path d="M3 12a9 8 0 0 1 18 0z"/><path d="M9 12v6a3 3 0 0 0 6 0v-6M8 8h.01M14 7h.01M16 10h.01"/>',
      weather: '<circle cx="9" cy="8" r="3"/><path d="M9 2v1.5M3 8h1.5M4.8 3.8l1 1M13.2 3.8l-1 1"/><path d="M8 20a3.5 3.5 0 0 1 0-7 5 5 0 0 1 9.5 1.5A3 3 0 0 1 17 20z"/>',
      hospital: '<path d="M4 21V6h16v15M2 21h20M12 9v6M9 12h6M10 21v-3h4v3"/>',
      kitchenscale: '<path d="M4 9h16l-1.5 12h-13z"/><circle cx="12" cy="15" r="3"/><path d="M12 15l1.5-1.5M7 6h10M12 6V3"/>',
      candy: '<circle cx="12" cy="12" r="4"/><path d="M8.5 10L4 7v10l4.5-3M15.5 10L20 7v10l-4.5-3"/>',
      register: '<path d="M4 13h16v8H4zM6 13l1-6h10l1 6M9 3h6v4H9z"/><path d="M8 17h8"/>',
      tomato: '<circle cx="12" cy="14" r="7.5"/><path d="M9 6l3 2 3-2M12 8V4"/>',
      certificate: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 8h10M7 11h6"/><circle cx="16" cy="15" r="2.5"/><path d="M14.5 17l-1 4 2.5-1.5 2.5 1.5-1-4"/>',
      cherry: '<circle cx="7" cy="17" r="3.5"/><circle cx="17" cy="17" r="3.5"/><path d="M7 13.5C8 9 10 6 14 3c0 4 1.5 8 3 10.5M14 3l4 1"/>',
      chartup: '<path d="M4 20V4M4 20h16"/><path d="M8 16V12M12 16V9M16 16V6M7 9l4-4 3 2 5-4"/>',
      sdcard: '<path d="M7 3h11v18H5V5z"/><path d="M9 3v4M12 3v4M15 3v4"/>',
      browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6 6.5h.01M8.5 6.5h.01"/>',
      hotdog: '<path d="M4 12a3 3 0 0 1 3-3h10a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3z"/><path d="M2.5 13a4 4 0 0 0 4 4h11a4 4 0 0 0 4-4M8 11.5c1.5-1 3 1 4.5 0s3 1 4.5 0"/>',
      workstation: '<rect x="8" y="3" width="13" height="9" rx="1"/><path d="M14.5 12v3M11 15h7M2 21h20M4 21v-8h3v8"/>',
      church: '<path d="M12 2v4M10 4h4M8 21V11l4-4 4 4v10M4 21v-6l4-2M20 21v-6l-4-2M10 21v-4a2 2 0 0 1 4 0v4"/>',
      eggplant: '<path d="M15 7c4 3 3 9-1 12s-10 2-11-1c-1-3 3-5 5-7s3-6 7-4z"/><path d="M15 7c1-2 3-3 5-3M15 7l3 1"/>',
      flowers: '<circle cx="12" cy="6" r="2.5"/><circle cx="7" cy="9" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 8.5V14M7 11l3 3M17 11l-3 3M7 14h10l-2 7H9z"/>',
      tv: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 3l4 4 4-4M8 22h8"/>',
      gamepad2: '<path d="M6 8h12a4 4 0 0 1 4 4l-1 5a2.5 2.5 0 0 1-4.5 1L15 16H9l-1.5 2A2.5 2.5 0 0 1 3 17l-1-5a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3M15 12h.01M17.5 13.5h.01"/>',
      moon: '<path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11z"/>',
      play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9v6l5-3z"/>',
      signpost: '<path d="M12 3v18M8 21h8M5 5h11l2.5 2.5L16 10H5zM19 12H8l-2.5 2.5L8 17h11z"/>',
      remote: '<rect x="8" y="3" width="8" height="18" rx="2.5"/><circle cx="12" cy="8" r="1.5"/><path d="M10.5 12.5h.01M13.5 12.5h.01M10.5 15.5h.01M13.5 15.5h.01M10.5 18.5h.01M13.5 18.5h.01"/>',
      molecule: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="M8.3 7l7.4.6M7 8.3l1.4 7.3M16.5 10l-5.5 6.5"/>',
      tipi: '<path d="M12 3L3 21h18z"/><path d="M8 4l4 6 4-6M10 21l2-5 2 5M8 13l1 2M16 13l-1 2"/>',
      thermometer: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 10v7"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17.5h2M11 17.5h2"/>',
      factory: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17z"/><path d="M7 17h2M12 17h2"/>',
      sushi: '<rect x="3" y="10" width="18" height="6" rx="3"/><path d="M5 10c1-2 3-3 7-3s6 1 7 3M9 10v6M15 10v6"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      eraser: '<path d="M16 3l5 5-10 10H6l-3-3z"/><path d="M11 8l5 5M8 21h13"/>',
      garage: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8M7 16h10"/>',
      tram: '<rect x="5" y="6" width="14" height="12" rx="3"/><path d="M8 3h8M12 3v3M5 12h14M8 21l2-3M16 21l-2-3M9 15h.01M15 15h.01"/>',
      house: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h5v-5h4v5h5V9.5"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
      ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5" transform="rotate(-30 12 12)"/><path d="M7 13.5l1 1.7M10.5 11.5l1 1.7M14 9.5l1 1.7"/>',
      compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
      palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2.5S14 16 15.5 16H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
      pencil: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M13.5 6.5l4 4"/>',
      bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 15h.01M16 15h.01M7 18v3M17 18v3M8 6.5h8"/>',
      truck: '<path d="M2 6h12v10H2zM14 9h4l3 4v3h-7"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
      crane: '<path d="M7 21V5M4 21h8M7 5h13M7 5l4 4M20 5v6M18 11h4v3h-4zM7 9h4"/>',
      forklift: '<path d="M3 17V9h6l3 6v2M3 9V5h4v4M15 4v14M15 18h6"/><circle cx="5.5" cy="18" r="2"/><circle cx="11" cy="18" r="2"/>',
      hotair: '<path d="M12 3a7 7 0 0 1 7 7c0 3.5-3.5 6-5 7h-4c-1.5-1-5-3.5-5-7a7 7 0 0 1 7-7z"/><path d="M12 3c-2 2-3 4.5-3 7s1 5 1 7M12 3c2 2 3 4.5 3 7s-1 5-1 7M10 17h4v4h-4z"/>',
      tools: '<path d="M14 6a4 4 0 0 0 5 5l2 2-6 6-2-2a4 4 0 0 0-5-5z"/><path d="M3 21l6-6M3 3l6 6M5 3L3 5"/>',
      mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
      volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
      monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M10 9v4l3.5-2zM8 21h8M12 16v5"/>',
      router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5h.01M10 16.5h.01M6 13l-1-6M18 13l1-6M9 8a4 4 0 0 1 6 0M7 5.5a7 7 0 0 1 10 0"/>',
      videocam: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
      headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M20 19c0 2-2 2.5-5 2.5"/>',
      podcast: '<circle cx="12" cy="10" r="2.5"/><path d="M11 21l1-8.5 1 8.5zM7.5 14.5a6 6 0 1 1 9 0M4.5 17a10 10 0 1 1 15 0"/>',
      ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M12 9.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
      filmreel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="12" cy="16.5" r="1.5"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="16.5" cy="12" r="1.5"/><path d="M12 20h9"/>',
      audiobook: '<path d="M4 4h9a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M4 16h11M17 9a3 3 0 0 1 0 5M19.5 7a6 6 0 0 1 0 9"/>',
      webcam: '<circle cx="12" cy="10" r="6.5"/><circle cx="12" cy="10" r="2.5"/><path d="M8 18l-2 3h12l-2-3"/>',
      disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 6a6 6 0 0 0-6 6"/>',
      projector: '<rect x="2" y="8" width="20" height="9" rx="2"/><circle cx="15" cy="12.5" r="2.5"/><path d="M6 11h3M6 14h3M5 17v2M19 17v2"/>',
      cctv: '<path d="M3 7l13 5-2 4-13-5zM16 12l3 1M3 21v-6h3M14.5 14.5L13 17"/><path d="M19 11v4"/>',
      printer: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7zM17 11h.01"/>',
      usb: '<path d="M8 3h8v6H8z"/><path d="M6 9h12v6a6 6 0 0 1-12 0zM10.5 5.5h.01M13.5 5.5h.01M12 15v3"/>',
      megaphone: '<path d="M3 10v4h3l9 5V5L6 10z"/><path d="M6 14l1.5 6h2.5L9 15M18 9a3 3 0 0 1 0 6"/>',
      chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01"/>',
      clapper: '<path d="M3 10h18v10H3z"/><path d="M3 10l1-5 17 3-1 2M8 5.5l-1.5 4M13 6.5l-1.5 3.5M18 7.5l-1 2"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/>',
      bookmark: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
      star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
      paperplane: '<path d="M21 3L3 10.5l7 3 3 7.5z"/><path d="M10 13.5l11-10.5"/>',
      share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
      heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.7.7 3 2.6 1.6-1.6 2.6 1.6 2.6-2.6 1.6-.7 3-3-.7L12 21.5l-1.6-2.6-3 .7-.7-3-2.6-1.6 1.6-2.6-1.6-2.6 2.6-1.6.7-3 3 .7z"/>',
      cloud: '<path d="M7 19a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5z"/>',
      signal: '<path d="M4 20v-3M9 20v-7M14 20V9M19 20V4"/>',
      insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
      telegram: '<circle cx="12" cy="12" r="9"/><path d="M6.5 11.5l10-4-1.8 9-3.2-2.5-1.5 2v-3.5l4.5-4"/>',
      youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9v6l5-3z"/>',
      whatsapp: '<path d="M4 20l1.3-4A8.5 8.5 0 1 1 8 18.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
      tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.5"/>',
      xlogo: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 7.5l8 9M16 7.5l-8 9"/>',
      facebook: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M15 8h-1.5a2 2 0 0 0-2 2v10.5M9.5 13h5"/>',
      linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13a2.2 2.2 0 0 1 4.5 0v3"/>',
      butterfly: '<path d="M12 8v10M12 9c-2-4-8-6-8-2 0 3 2 4 5 4-3 1-4 5-1 5 2 0 3.5-2.5 4-4.5M12 9c2-4 8-6 8-2 0 3-2 4-5 4 3 1 4 5 1 5-2 0-3.5-2.5-4-4.5"/>',
      threads: '<path d="M16.5 8.5C15.8 6 14 4.5 11.5 4.5 7.5 4.5 5 7.5 5 12s2.5 7.5 6.5 7.5c3.5 0 6-2 6-5 0-2.5-2-4-4.5-4-2 0-3.5 1-3.5 2.5s1.2 2.5 3 2.5c2.5 0 3.5-2.5 3.5-5"/>'
    });
    /* ۱.۳.۹۳: بی قرمز و نارنجی‌قرمز (قرمز مخصوص «جیب به جیب» است)؛ ۱۶ رنگ اول آزاد در دو ردیف ۸تایی نشان داده می‌شود */
    var HK_USER_CAT_COLORS = ['#5ac8fa', '#a2845e', '#b388ff', '#80cbc4', '#ffd180', '#f48fb1', '#aed581', '#4dd0e1', '#9575cd', '#90a4ae', '#dce775', '#ce93d8', '#26a69a', '#ffab40', '#7986cb', '#4fc3f7', '#81c784', '#fff176', '#a1887f', '#ba68c8', '#4db6ac', '#ffcc80', '#9ccc65', '#64b5f6'];
    function hkCatUserMap(kind) { try { var o = JSON.parse(localStorage.getItem(STORAGE_KEY + '_cat' + kind) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function hkCatUserSet(kind, id, v) { var m = hkCatUserMap(kind); if (v) m[id] = v; else delete m[id]; try { hkStorageSet(STORAGE_KEY + '_cat' + kind, JSON.stringify(m)); } catch (e) {} }
    function hkCatIco(id) {
      if (id) { var u = hkCatImgMap()[id]; if (u && /^data:image\//.test(u)) return '<img class="hk-cat-img" alt="" src="' + u + '">'; }
      if (id && !HK_CAT_ICONS[id]) { var ik = hkCatUserMap('Icon')[id]; if (ik && HK_ICON_BANK[ik]) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_ICON_BANK[ik] + '</svg>'; }
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (id ? (HK_CAT_ICONS[id] || HK_CAT_TAG) : '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1M12 16v.1"/>') + '</svg>';
    }
    /** انتخاب عکس از گالری → مربع ۱۲۸ پیکسلی (برش وسط) */
    function hkCatPickImage(id, done) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          var im = new Image();
          im.onload = function () {
            try {
              var S = 128, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
              var k = Math.min(im.width, im.height), sx = (im.width - k) / 2, sy = (im.height - k) / 2;
              var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, sx, sy, k, k, 0, 0, S, S);
              var url = cv.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(url)) url = cv.toDataURL('image/jpeg', 0.85);
              hkCatImgSet(id, url); if (done) done(url);
            } catch (e) { showToast('عکس خوانده نشد'); }
          };
          im.onerror = function () { showToast('عکس خوانده نشد'); };
          im.src = rd.result;
        };
        rd.readAsDataURL(f);
      };
      document.body.appendChild(inp); inp.click();
    }
    /** ۱.۳.۸۶: هنگام ساختن دسته: انتخاب آیکون (بانک یا گالری) و رنگ؛ بستن بی‌انتخاب = اولین آیکون و رنگِ آزاد */
    function hkCatStyleSheet(cat, done) {
      var usedI = {}, usedC = {}, im = hkCatUserMap('Icon'), cm = hkCatUserMap('Color');
      Object.keys(im).forEach(function (k) { if (k !== cat.id) usedI[im[k]] = 1; });
      Object.keys(cm).forEach(function (k) { if (k !== cat.id) usedC[String(cm[k]).toLowerCase()] = 1; });
      Object.keys(HK_CAT_COLORS).forEach(function (k) { usedC[String(HK_CAT_COLORS[k]).toLowerCase()] = 1; });
      var icons = Object.keys(HK_ICON_BANK).filter(function (k) { return !usedI[k]; });
      var cols = HK_USER_CAT_COLORS.filter(function (c) { return !usedC[c.toLowerCase()]; }).slice(0, 16);
      var st = { icon: icons[0] || '', img: '', color: cols[0] || '#08b5f5' };
      var old = document.getElementById('hkCatStyle'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkCatStyle'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100660;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-prefs hk-pf hk-p2p-box hk-cst-box'; ov.appendChild(bx);
      var finish = function () {
        hkCatUserSet('Color', cat.id, st.color);
        if (st.img) { hkCatImgSet(cat.id, st.img); hkCatUserSet('Icon', cat.id, ''); } else { hkCatImgSet(cat.id, ''); hkCatUserSet('Icon', cat.id, st.icon); }
        ov.remove(); if (done) done();
      };
      ov._hkCancel = finish;
      var prev = function () {
        var pv = bx.querySelector('.hk-cst-prev'); if (!pv) return;
        pv.style.setProperty('--cc', st.color);
        pv.querySelector('i').innerHTML = st.img ? '<img class="hk-cat-img" alt="" src="' + st.img + '">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (HK_ICON_BANK[st.icon] || HK_CAT_TAG) + '</svg>';
        bx.querySelectorAll('.hk-cst-ic').forEach(function (b) { b.classList.toggle('on', !st.img && b.dataset.k === st.icon); b.style.setProperty('--cc', st.color); });
        bx.querySelectorAll('.hk-cst-col').forEach(function (b) { b.classList.toggle('on', b.dataset.c === st.color); });
      };
      bx.innerHTML = '<div class="hk-prefs-t" style="margin-bottom:10px;">آیکون و رنگ «' + escapeHtml(cat.label) + '»</div>' +
        '<div class="sms-cat-grid hk-cat-colored" style="grid-template-columns:1fr;justify-items:center;margin:0 0 8px;"><div class="sms-cat on hk-cst-prev"><i></i><span>' + escapeHtml(cat.label) + '</span></div></div>' +
        '<div class="hk-cst-cols"></div><div class="hk-cst-sl"><div class="hk-cst-track"></div></div><div class="hk-cst-dots"></div>' +
        '<div class="hk-rax-acts"><button type="button" class="modal-btn hk-cst-gal">عکس از گالری</button><button type="button" class="modal-btn yes hk-cst-ok">تأیید</button></div>';
      var cw = bx.querySelector('.hk-cst-cols');
      cols.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-cst-col'; b.dataset.c = c; b.style.background = c; b.setAttribute('aria-label', 'رنگ'); b.onclick = function () { st.color = c; prev(); }; cw.appendChild(b); });
      /* ۱.۳.۹۳: آیکون‌ها در اسلایدهای ۶ ستون × ۵ ردیف که با کشیدن ورق می‌خورند؛ دایره‌های زیر = شمار و جای اسلاید؛ رنگ‌ها بالا ثابت */
      var tr = bx.querySelector('.hk-cst-track'), sl = bx.querySelector('.hk-cst-sl'), dw = bx.querySelector('.hk-cst-dots'), PER = 30;
      for (var pi = 0; pi * PER < icons.length; pi++) {
        var gw = document.createElement('div'); gw.className = 'hk-cst-grid hk-cat-colored'; tr.appendChild(gw);
        icons.slice(pi * PER, pi * PER + PER).forEach(function (k) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat hk-cst-ic'; b.dataset.k = k; b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_ICON_BANK[k] + '</svg></i>'; b.onclick = function () { st.icon = k; st.img = ''; prev(); }; gw.appendChild(b); });
        var dt = document.createElement('button'); dt.type = 'button'; dt.className = 'hk-cst-dot' + (pi ? '' : ' on'); dt.setAttribute('aria-label', 'اسلاید ' + (pi + 1));
        (function (n) { dt.onclick = function () { sl.scrollTo({ left: -n * sl.clientWidth, behavior: 'smooth' }); }; })(pi);
        dw.appendChild(dt);
      }
      if (dw.children.length < 2) dw.style.display = 'none';
      sl.addEventListener('scroll', function () { var n = Math.round(Math.abs(sl.scrollLeft) / Math.max(1, sl.clientWidth)); [].forEach.call(dw.children, function (d, i) { d.classList.toggle('on', i === n); }); }, { passive: true });
      bx.querySelector('.hk-cst-gal').onclick = function () { hkCatPickImage('__tmp', function (url) { hkCatImgSet('__tmp', ''); st.img = url; prev(); }); };
      bx.querySelector('.hk-cst-ok').onclick = finish;
      document.body.appendChild(ov);
      prev();
    }
    try { window.hkCatIco = hkCatIco; window.hkCatImgSet = hkCatImgSet; window.hkCatPickImage = hkCatPickImage; window.hkCatStyleSheet = hkCatStyleSheet; window.HK_ICON_BANK = HK_ICON_BANK; } catch (eCi) {}
    try { window.hkAddIncomeCat = hkAddIncomeCat; window.hkInCustomLoad = hkInCustomLoad; } catch (eIc) {}
    /* ۱.۳.۴۸: دسته‌های واریز (کوتاه) */
    var HK_INCOME_CATS = [
      { id: 'in_salary', label: 'حقوق' }, { id: 'in_rent', label: 'اجاره' }, { id: 'in_loanback', label: 'تسویه قرض' } /* ۱.۳.۶۸: جای «اضافه‌کار» */,
      { id: 'in_bonus', label: 'پاداش' }, { id: 'in_gift', label: 'هدیه و کمک' }, { id: 'in_sale', label: 'فروش' }, { id: 'in_profit', label: 'سود' }
    ];
    /* ۱.۳.۸۷: دسته‌های درآمدِ ساخت کاربر (شناسه با «in_u_» تا مثل بقیهٔ دسته‌های درآمد روی ردیف بنشیند) */
    var HK_IN_CUSTOM_KEY = STORAGE_KEY + '_inCustom';
    function hkInCustomLoad() { try { var a = JSON.parse(localStorage.getItem(HK_IN_CUSTOM_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && /^in_u_/.test(x.id) && x.label; }) : []; } catch (e) { return []; } }
    function hkInCustomSync(list) {
      (list || hkInCustomLoad()).forEach(function (c) { if (!HK_INCOME_CATS.some(function (x) { return x.id === c.id; })) HK_INCOME_CATS.push({ id: c.id, label: c.label, custom: true }); });
    }
    function hkInCustomSave() { try { localStorage.setItem(HK_IN_CUSTOM_KEY, JSON.stringify(HK_INCOME_CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; }))); } catch (e) {} }
    function hkAddIncomeCat(label) {
      label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!label || HKCategorizer.labelTaken(label)) return null;
      var c = { id: 'in_u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: label, custom: true };
      HK_INCOME_CATS.push(c); hkInCustomSave();
      return c;
    }
    hkInCustomSync();
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
    /* ۱.۳.۸۶: آیکون دلار نقره‌ای ردیف پرداخت قسط (ستون ردیف) */
    var HK_INST_DOLLAR_SVG = '<path d="M12 3v18"/><path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3S9.5 10.5 12 11s4.5 1.3 4.5 3.5-2 3.5-4.5 3.5-4.5-1.3-4.5-3"/>';
    function hkCatColor(id) { return HK_CAT_COLORS[id] || (id && hkCatUserMap('Color')[id]) || '#08b5f5'; }
    /* پنجرهٔ انتخاب دسته با همان چیدمان ۵ستونی رنگی (برای ویرایش ردیف) */
    function hkCatPickSheet(cats, cur, onPick, kind) {
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
        b.innerHTML = '<i>' + hkCatIco(c.id) + '</i><span>' + escapeHtml(c.label) + '</span>';
        if (c.id === 'p2p') hkP2PDecorate(b);
        b.onclick = function () { close(); onPick(c.id); if (c.id === 'p2p') hkP2PIntro(false); };
        gg.appendChild(b);
      });
      /* ۱.۳.۸۷: «دستهٔ جدید» همین‌جا (مخارج یا درآمد): اسم ← آیکون/گالری و رنگ ← انتخاب روی همین ردیف */
      if (kind === 'in' || kind === 'out') {
        var plus = document.createElement('button'); plus.type = 'button'; plus.className = 'sms-cat sp-pick-tadd hk-cp-add'; plus.style.setProperty('--cc', '#08b5f5');
        plus.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i><span>دستهٔ جدید</span>';
        plus.onclick = function () {
          if (bx.querySelector('.sp-pick-new')) return;
          var wrap = document.createElement('div'); wrap.className = 'sp-pick-new';
          var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'sp-pick-input'; inp.placeholder = 'نام دستهٔ جدید'; inp.maxLength = 24; inp.setAttribute('enterkeyhint', 'done');
          var okb = document.createElement('button'); okb.type = 'button'; okb.className = 'sp-pick on'; okb.textContent = 'افزودن';
          var msg = document.createElement('div'); msg.className = 'sp-pick-err';
          var save = function () {
            if (HKCategorizer.labelTaken(inp.value)) { msg.textContent = 'دسته‌ای با این اسم هست'; return; }
            var cat = kind === 'in' ? hkAddIncomeCat(inp.value) : HKCategorizer.addCustom(inp.value);
            if (!cat) { try { inp.focus(); } catch (e) {} return; }
            close();
            hkCatStyleSheet(cat, function () { onPick(cat.id); });
          };
          okb.onclick = save;
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          inp.addEventListener('input', function () { msg.textContent = HKCategorizer.labelTaken(inp.value) ? 'دسته‌ای با این اسم هست' : ''; });
          wrap.appendChild(inp); wrap.appendChild(okb); wrap.appendChild(msg);
          plus.style.display = 'none';
          bx.appendChild(wrap);
          setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
        };
        gg.appendChild(plus);
      }
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
      /* ۱.۳.۸۸: سه ردیف پنج‌تایی (۱۵ خانه)؛ بیشتر از ۱۵ دسته ← خانهٔ پانزدهم «بیشتر…» */
      var top = order.length > 15 ? order.slice(0, 14) : order.slice(0, 15), rest = order.length > 15 ? order.slice(14) : [];
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
        b.innerHTML = '<i>' + hkCatIco(c.id) + '</i><span>' + escapeHtml(c.label) + '</span>';
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
      /* ۱.۳.۸۸: نام دسته یک‌خطی و کامل (بی «…»): اگر جا نشد، فقط همان نام کمی ریزتر می‌شود */
      /* ۱.۳.۸۹: نام دسته با فونت عادی، در صورت نیاز دوخطی (بدون ریز شدن) */
    }
    function hkFitCatLabels(root) {
      (root || document).querySelectorAll('.sms-cat > span').forEach(function (sp) {
        sp.style.fontSize = '';
        var fs = parseFloat(getComputedStyle(sp).fontSize) || 11, min = 7.5, guard = 0;
        while (sp.scrollWidth > sp.clientWidth + 0.5 && fs > min && guard++ < 20) { fs -= 0.5; sp.style.fontSize = fs + 'px'; }
      });
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
      /* ۱.۳.۸۵: بانک با امتیازدهی؛ فرستنده فقط از اسم «کامل» بانک در متن یاد گرفته می‌شود */
      try { var _bs = hkBankOfSms(smsText, opts.sender || ''); if (_bs) parsed.bank = _bs; if (opts.sender) { var _nb = hkBankFullInText(smsText); if (_nb) hkSenderLearn(opts.sender, _nb); } } catch (eSb) {}
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
