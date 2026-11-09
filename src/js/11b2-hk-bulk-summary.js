    function hkBulkSummary(s) {
      var box = document.querySelector('#smsBulkOv .hk-bulk-box'); if (!box) { showToast(toPersianDigits(String(s.added)) + ' تراکنش ثبت شد'); closeSmsBulkModal(); return; }
      var L = [];
      L.push(toPersianDigits(String(s.added)) + ' تراکنش ثبت شد');
      if (s.skipped) L.push(toPersianDigits(String(s.skipped)) + ' تراکنش از قبل ثبت شده بود و دوباره ثبت نشد' + (s.linked ? ' (' + toPersianDigits(String(s.linked)) + ' ردیف بدون حساب، به حسابش وصل شد)' : ''));
      if (s.gaps) L.push(toPersianDigits(String(s.gaps)) + ' ردیف اختلاف برای پیامک‌های جاافتاده ثبت شد');
      s.created.forEach(function (lb) { L.push('حساب تازه ساخته شد: ' + lb); });
      s.report.forEach(function (x) { L.push(x); });
      if (s.dupSms) L.push(toPersianDigits(String(s.dupSms)) + ' پیامک تکراریِ بانک نادیده گرفته شد');
      if (s.notices) L.push(toPersianDigits(String(s.notices)) + ' پیامک اطلاع‌رسانی (نه تراکنش) نادیده گرفته شد');
      (s.unknownOpen || []).forEach(function (lb) { L.push('موجودی «' + lb + '» از پیامک‌ها معلوم نشد (پیامکِ تازه‌ای با مانده نیست)' + (s.newAccs.indexOf(lb) >= 0 ? '؛ از ویرایش حساب، موجودی را وارد کنید' : '؛ موجودی حساب دست نخورد')); });
      (s.notes || []).forEach(function (x) { L.push(x); });
      var chk = s.checks.map(function (c) {
        return '<div class="hk-bulk-sline ' + (c.ok ? 'ok' : 'bad') + '">' + escapeHtml(c.acc) + ': ' + (c.ok ? 'موجودی با پیامک بانک یکی است ' + HK_TICK_SVG : formatNum(Math.abs(c.diff)) + ' تومان ' + (c.diff > 0 ? 'بیشتر' : 'کمتر') + ' از ماندهٔ آخرین پیامک بانک') + '</div>';
      }).join('');
      try { var _ov = document.getElementById('smsBulkOv'); if (_ov) _ov.classList.add('hk-bulk-center'); } catch (eC) {}
      box.innerHTML = '<div class="hk-bulk-title">ثبت گروهی انجام شد</div>' +
        '<div class="hk-bulk-sum">' + L.map(function (x) { return '<div class="hk-bulk-sline">' + escapeHtml(x) + '</div>'; }).join('') + chk + '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok hk-bulk-done">باشه</button><button type="button" class="hk-bulk-undo">برگرداندن این ثبت</button></div>';
      /* بعد از ثبت، منوی اصلی به ماهِ شروع بازه می‌رود (مثلاً ۲۰ شهریور ۱۴۰۴ ← شهریور ۱۴۰۴) */
      box.querySelector('.hk-bulk-done').onclick = function () {
        var g = _hkBulk && _hkBulk.from ? { y: _hkBulk.from.y, m: _hkBulk.from.m } : null;
        closeSmsBulkModal();
        if (g && (g.y !== currentYear || g.m !== currentMonth)) { try { navigateToPeriod(g.y, g.m); } catch (eN) {} }
      };
      box.querySelector('.hk-bulk-undo').onclick = function () {
        try {
          archive = JSON.parse(s.snap.archive); periodData = JSON.parse(s.snap.period);
          selectedBankAccounts = JSON.parse(s.snap.accs); smsAccountBankMap = JSON.parse(s.snap.map);
          if (s.snap.plans) plans = JSON.parse(s.snap.plans);
          persistCurrent(); saveArchive(); saveBankAccountsSelection(); saveSmsAccountBankMap();
          try { scheduleSave(); } catch (e3) {}
          try { renderAll(); } catch (eR) {}
          try { renderHomeCards(); } catch (eH) {}
          showToast('ثبت گروهی برگردانده شد');
        } catch (eU) { showToast('برگرداندن ممکن نشد'); }
        closeSmsBulkModal();
      };
    }
    function hkBulkApplyGap(g, ctx0) {
      try {
        var tab = g.diff < 0 ? 'expense' : 'income', amt = Math.abs(g.diff);
        var ctx = ctx0 || getWritablePeriodData(g.rec.j.y, g.rec.j.m), pd = ctx.data;
        var row = emptyRow(tab);
        row.day = String(g.rec.j.d); row.amount = amt; row.status = 'paid'; row.account = g.fo.account;
        row.desc = (amt <= 2000 && g.diff < 0) ? 'کارمزد / اختلاف جزئی بانک' : (g.diff < 0 ? 'مجموع خرج‌های ثبت‌نشده در این بازه' : 'مجموع درآمدهای ثبت‌نشده در این بازه');
        row.reconGap = true; row.createdAt = Date.now(); row.updatedAt = row.createdAt;
        try { if (typeof stampRowOwner === 'function') stampRowOwner(row); } catch (eS) {}
        /* درست قبل از ردیف همین پیامک (اگر در همان جدول است)، وگرنه در همان کارت */
        var placed = false;
        ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
          if (placed || !sec || !sec.rows) return;
          var i2 = sec.rows.findIndex(function (x) { return x && (x === g.row || (x.fromSmsBulk && (x.account || '') === g.fo.account && Number(x.amount) === Number(g.rec.amount) && String(x.day) === String(g.rec.j.d))); });
          if (i2 >= 0) { sec.rows.splice(i2, 0, row); placed = true; }
        });
        if (!placed) {
          var cardTitle = hkBulkCardTitle();
          if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
          var sec = (pd[tab].sections || []).find(function (s2) { return s2 && (s2.title || '').trim() === cardTitle; });
          if (!sec) { var nid = pd[tab].nextId || ((pd[tab].sections || []).length + 1); sec = { id: 's' + nid + '_bk', title: cardTitle, color: tabAccentColor(tab), collapsed: false, rows: [] }; pd[tab].sections.push(sec); pd[tab].nextId = nid + 1; }
          sec.rows.push(row);
          sec.rows.sort(function (a, b) { return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99); });
        }
        if (!ctx0) commitWritablePeriodData(ctx);
      } catch (e) {}
    }
    /* آخرین ماندهٔ هر کارتِ یک بانک از پیامک‌های گوشی: [{acc4, balance, j, ts}] (جدیدترین اول)؛ بدون افزونه → [] */
    function hkReadBankBalances(bank) {
      var B = hkBankSmsPlugin();
      if (!B || typeof B.readInbox !== 'function' || !bank) return Promise.resolve([]);
      bank = migrateBankName(bank);
      return B.readInbox({ from: 0, limit: 6000 }).then(function (res) {
        var by = {}, _its = (res && res.items) || [], bctx = hkInboxBankCtx(_its);
        _its.forEach(function (it) {
          try {
            var body = String(it.body || ''); if (!body) return;
            if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(body)) return;
            if ((hkBankOfSms(body, it.address, bctx) || '') !== bank) return;
            var p = parseBankSms(body); if (!p || p.balance == null) return;
            if (hkIsPersonalSender(it.address)) return;
            var ts = Number(it.date) || 0, a4 = hkSmsAcc4(body) || '';
            if (!by[a4] || by[a4].ts < ts) by[a4] = { acc4: a4, balance: Number(p.balance) || 0, ts: ts, j: hkJalaliOfTs(ts) };
          } catch (e) {}
        });
        return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.ts - a.ts; });
      }).catch(function () { return []; });
    }
    /* انتخاب کارت با رقم‌های آخر (وقتی چند کارت از یک بانک پیامک دارد) */
    function hkCardChips(host, cards, onPick) {
      host.innerHTML = '';
      cards.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-card-chip';
        b.innerHTML = '<b>' + (c.acc4 ? 'کارت ' + toPersianDigits(c.acc4) : 'بدون شماره') + '</b><span>' + formatNum(c.balance) + '</span>';
        b.onclick = function (e) { e.stopPropagation(); host.querySelectorAll('.hk-card-chip').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); onPick(c); };
        host.appendChild(b);
      });
    }
    /* «همگام‌سازی با آخرین پیامک»: موجودی امروزِ حساب برابر ماندهٔ آخرین پیامک شود (با نمایش قبل/بعد و تأیید) */
    function hkSyncAccountWithSms(acc, btn) {
      var lb = accountLabel(acc);
      if (!hkBankSmsPlugin()) { showToast('همگام‌سازی فقط در نسخهٔ اندروید نرم‌افزار کار می‌کند'); return; }
      if (btn) btn.disabled = true;
      hkReadBankBalances(acc.bank).then(function (cards) {
        if (btn) btn.disabled = false;
        var map = smsAccountBankMap || {};
        var mine = cards.filter(function (c) { return c.acc4 && map['L4:' + c.acc4] === lb; });
        if (!mine.length) mine = cards.filter(function (c) { return !(c.acc4 && map['L4:' + c.acc4] && map['L4:' + c.acc4] !== lb); });
        if (!mine.length) { showToast('پیامک مانده‌دار این بانک پیدا نشد'); return; }
        var go = function (c) {
          var t = getTodayPersian();
          if (currentYear !== t.y || currentMonth !== t.m) { try { navigateToPeriod(t.y, t.m); } catch (eN) {} }
          var cur = Number((globalAccountBalances() || {})[lb]) || 0, d = c.balance - cur;
          if (Math.abs(d) <= 1) { showToast('موجودی «' + lb + '» با آخرین پیامک یکی است'); return; }
          hkAsk3('موجودی «' + lb + '» در نرم‌افزار ' + formatNum(cur) + ' است و طبق آخرین پیامک (' + hkJStr(c.j) + ') ' + formatNum(c.balance) + '. موجودی همگام شود؟ (اگر پیامک ثبت‌نشده‌ای مانده، اول آن را ثبت کنید)',
            [{ v: 'yes', t: 'همگام کن', cls: 'primary' }, { v: 'no', t: 'انصراف' }], function (ans) {
              if (ans !== 'yes') return;
              var apply = function () {
                var op = getAccountOpeningBalance(lb) || 0;
                if (!periodData.accountOpeningInstant || typeof periodData.accountOpeningInstant !== 'object') periodData.accountOpeningInstant = {};
                periodData.accountOpeningInstant[lb] = op + d;
                if (c.acc4) { try { smsAccountBankMap['L4:' + c.acc4] = lb; saveSmsAccountBankMap(); } catch (eM) {} }
                try { persistCurrent(); saveArchive(); scheduleSave(); } catch (eS) {}
                try { renderAll(); renderHomeCards(); } catch (eR) {}
                showToast('موجودی طبق آخرین پیامک تنظیم شد');
              };
              try { safetyBackupThen('sms-sync', apply); } catch (eB) { apply(); }
            });
        };
        if (mine.length === 1) { go(mine[0]); return; }
        var host = document.getElementById('bankSyncChips');
        if (!host) { go(mine[0]); return; }
        host.style.display = '';
        showToast('کارت این حساب را انتخاب کنید');
        hkCardChips(host, mine, go);
      });
    }
    /* پاک‌سازی تکراری‌های قدیمی: جفت ردیف با همان حساب، مبلغ و نوع، در همان روز یا یک روز فاصله */
    function hkFindDupPairs() {
      var cur = periodKey(currentYear, currentMonth), keys = Object.keys(archive || {});
      if (keys.indexOf(cur) < 0) keys.push(cur);
      var pairs = [];
      keys.sort().forEach(function (k) {
        var pd = k === cur ? periodData : archive[k]; if (!pd) return;
        ['income', 'expense'].forEach(function (tab) {
          var g = {};
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            ((sec && sec.rows) || []).forEach(function (r) {
              if (!r || r.deletedAt || r.reconGap || r.fromPlanId || r.fromRecurringId) return;
              var acc = (r.account || '').trim(), a = Number(r.amount) || 0, d = parseInt(r.day, 10) || 0;
              if (!acc || !a || !d) return;
              (g[acc + '|' + a] = g[acc + '|' + a] || []).push({ k: k, tab: tab, sec: sec, row: r, day: d });
            });
          });
          Object.keys(g).forEach(function (gk) {
            var l = g[gk].sort(function (x, y) { return x.day - y.day; }), used = {};
            for (var i = 0; i < l.length; i++) {
              if (used[i]) continue;
              for (var j = i + 1; j < l.length && l[j].day - l[i].day <= 1; j++) {
                if (used[j]) continue;
                /* حذف‌شدنی: ردیف ثبت گروهی/بی‌شرح، وگرنه ردیفی که دیرتر ساخته شده */
                var A = l[i], Bx = l[j], score = function (o) { return (o.row.fromSmsBulk ? 2 : 0) + (!(o.row.desc || '').trim() ? 1 : 0); };
                var drop = score(Bx) > score(A) ? Bx : score(A) > score(Bx) ? A : ((Number(Bx.row.createdAt) || 0) >= (Number(A.row.createdAt) || 0) ? Bx : A);
                pairs.push({ keep: drop === A ? Bx : A, drop: drop });
                used[i] = used[j] = true; break;
              }
            }
          });
        });
      });
      return pairs;
    }
    /* ساعت تراکنش‌های قبلی: یک‌بار صندوق پیامک خوانده می‌شود؛ ردیفی که روز، مبلغ، نوع و بانکش با یک پیامک یکی است فقط ساعت می‌گیرد */
    function hkBackfillTimes(opts) {
      var fix = !!(opts && opts.fix);
      var B = hkBankSmsPlugin();
      if (!B || typeof B.readInbox !== 'function') return Promise.resolve(0);
      return B.readInbox({ from: 0, limit: 6000 }).then(function (res) {
        var idx = {}, map = smsAccountBankMap || {};
        if (!((res && res.items) || []).length) return -1;
        ((res && res.items) || []).forEach(function (it) {
          try {
            var body = String(it.body || ''); if (!body) return;
            if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(body)) return;
            var p = parseBankSms(body); if (!p || !p.amount) return;
            var ts = Number(it.date) || 0, j = hkJalaliOfTs(ts || Date.now()), tm = hkSmsTime(body, ts); if (!tm) return;
            var a4 = hkSmsAcc4(body) || '', acc = a4 && map['L4:' + a4] ? map['L4:' + a4] : '';
            var k = j.y + '-' + j.m + '|' + (p.type === 'income' ? 'income' : 'expense') + '|' + j.d + '|' + Math.round(p.amount);
            (idx[k] = idx[k] || []).push({ acc: hkNormAcc(acc), time: tm, used: false });
          } catch (e) {}
        });
        var n = 0, cur = periodKey(currentYear, currentMonth), ctxs = {};
        Object.keys(archive || {}).concat([cur]).filter(function (k, i, a) { return a.indexOf(k) === i; }).forEach(function (k) {
          var pk = k.split('-'), y = +pk[0], m = +pk[1], ctx = getWritablePeriodData(y, m), pd = ctx.data, dirty = false;
          ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sc) {
            (sc.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || !(Number(r.amount) > 0) || r.planPaidLater) return;
              var list = idx[y + '-' + m + '|' + tab + '|' + (parseInt(toEnglishDigits(String(r.day || '')), 10) || 0) + '|' + Math.round(Number(r.amount))];
              if (!list) return;
              /* ۱.۳.۴۲: ساعتِ خراب از پیامک چندبخشی (دقیقه درست، ساعت از ماه): فقط وقتی پیامکِ همان روز/مبلغ/نوع با همان دقیقه
                 و ساعت دیگری هست (و ساعت درستش در هیچ پیامکی نیست) ساعت اصلاح می‌شود */
              if (r.time) {
                if (!fix || list.some(function (x) { return x.time === r.time; })) return;
                var ra0 = hkNormAcc(r.account || ''), mins = String(r.time).slice(3);
                var cs = list.filter(function (x) { return !x.used && x.time.slice(3) === mins; });
                var c0 = cs.filter(function (x) { return x.acc && x.acc === ra0; })[0] || (cs.length === 1 ? cs[0] : null);
                if (!c0) return;
                c0.used = true; r.time = c0.time; n++; dirty = true;
                return;
              }
              var ra = hkNormAcc(r.account || ''), c = list.find(function (x) { return !x.used && x.acc && x.acc === ra; }) || (list.filter(function (x) { return !x.used; }).length === 1 ? list.find(function (x) { return !x.used; }) : null);
              if (!c) return;
              c.used = true; r.time = c.time; n++; dirty = true;
            });
            /* ترتیب ساعتیِ همهٔ ردیف‌های ساعت‌دار (نه فقط ردیف‌هایی که الان ساعت گرفتند) */
            if ((sc.rows || []).some(function (r) { return r && r.time; })) {
              var srt = hkSortRunsByTime(sc.rows);
              if (srt.some(function (r, i) { return r !== sc.rows[i]; })) { sc.rows = srt; dirty = true; }
            }
          }); });
          if (dirty) ctxs[k] = ctx;
        });
        Object.keys(ctxs).forEach(function (k) { try { commitWritablePeriodData(ctxs[k]); } catch (e) {} });
        if (n) { try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e2) {} try { renderAll(); } catch (e3) {} }
        return n;
      }).catch(function () { return 0; });
    }
    /* ۱.۳.۶۵: ردیف‌های اختلافِ قبلی که ساعت نداشتند: ساعت تراکنشی که موقع ساختن درست کنارش گذاشته شده بود
       (همان حساب و همان روز؛ اول ردیف بعدی، بعد قبلی). پیدا نشد → دست نمی‌خورد. یک‌بار. */
    function hkGapTimeFix() {
      var ctxs = {}, n = 0;
      hkGapTimeFix.seen = 0;
      var keys = Object.keys(archive || {}).concat([periodKey(currentYear, currentMonth)]).filter(function (k, i, a) { return a.indexOf(k) === i; });
      keys.forEach(function (k) {
        var pk = k.split('-'), y = +pk[0], m = +pk[1]; if (!y || !m) return;
        var ctx = getWritablePeriodData(y, m), pd = ctx.data, dirty = false;
        ['expense', 'income'].forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
            var rows = sec.rows || [];
            rows.forEach(function (r, i) {
              if (!r || !r.reconGap || r.time || r.deletedAt) return;
              hkGapTimeFix.seen++;
              var acc = String(r.account || '').trim(), d = String(r.day || '');
              var ok = function (x) { return x && x !== r && !x.reconGap && !x.deletedAt && x.time && String(x.account || '').trim() === acc && String(x.day || '') === d; };
              var nb = ok(rows[i + 1]) ? rows[i + 1] : (ok(rows[i - 1]) ? rows[i - 1] : null);
              if (!nb) return;
              r.time = nb.time; n++; dirty = true;
            });
          });
        });
        if (dirty) ctxs[k] = ctx;
      });
      Object.keys(ctxs).forEach(function (k) { try { commitWritablePeriodData(ctxs[k]); } catch (e) {} });
      if (n) { try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e2) {} try { renderAll(); } catch (e3) {} }
      return n;
    }
    setTimeout(function () {
      try {
        var KG = STORAGE_KEY + '_gapTime1365';
        if (localStorage.getItem(KG)) return;
        hkGapTimeFix();
        /* علامت «انجام شد» فقط وقتی ردیف اختلافِ بی‌ساعتی بود (وگرنه چیزی در حافظه نوشته نمی‌شود) */
        if (hkGapTimeFix.seen) localStorage.setItem(KG, '1');
      } catch (e) {}
    }, 2500);
    setTimeout(function () {
      try {
        if (!hkBankSmsPlugin()) return;
        var K = STORAGE_KEY + '_timeFill1340', K2 = STORAGE_KEY + '_timeFix1342';
        var fill = !localStorage.getItem(K), fx = !localStorage.getItem(K2);
        if (!fill && !fx) return;
        /* ۱.۳.۴۲: یک‌بار دیگر هم با اصلاح ساعت‌های خرابِ پیامک‌های چندبخشی */
        hkBackfillTimes({ fix: fx }).then(function (n) { if (n >= 0) { try { localStorage.setItem(K, '1'); localStorage.setItem(K2, '1'); } catch (e) {} } });
      } catch (e) {}
    }, 5000);
    /* ===== ۱.۳.۳۷: برگرداندن همهٔ وصل‌های خودکار قسط (ثبت گروهی و ترمیم نسخه‌های ۱.۳.۲۸ تا ۱.۳.۳۶) =====
       - هر قسط lockedCount می‌گیرد (قسط‌های پیش از ماه ساخت قسط = گذشته/قفل).
       - ردیف قسطی که خودکار به پیامک وصل شده بود (قسط‌های بعد از مرز قفل) → ردیف معمولیِ همان تراکنش (بانک و مبلغ می‌ماند، موجودی دست نمی‌خورد)
         و آن قسط دوباره پرداخت‌نشده/معوق می‌شود تا کاربر خودش ثبتش کند. «پرداخت در …» و یادداشت‌های دیرکرد برداشته می‌شوند.
       - قسط‌های قفل را خود همگام‌سازی درست می‌کند (تراکنش پیامکی جدا، بانک دستی برداشته). وصل دستیِ ثبت تکی پیامک دست نمی‌خورد. */
    function hkRevertInstallmentLinks() {
      var ctxs = {}, rev = {}, out = { split: 0, removed: 0, plans: [] }, byId = {};
      (plans || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
      (plans || []).forEach(function (p) { if (p && isNaN(parseInt(p.lockedCount, 10))) p.lockedCount = planLockedCount(p); });
      var keys = Object.keys(archive || {}).concat([periodKey(currentYear, currentMonth)]).filter(function (k, i, a) { return a.indexOf(k) === i; });
      keys.forEach(function (k) {
        var pk = k.split('-'), y = +pk[0], m = +pk[1]; if (!y || !m) return;
        var ctx = getWritablePeriodData(y, m), pd = ctx.data, dirty = false;
        ((pd.expense && pd.expense.sections) || []).forEach(function (sec) {
          var rows = sec.rows || [];
          for (var i = rows.length - 1; i >= 0; i--) {
            var r = rows[i]; if (!r || !r.fromPlanId) continue;
            var pl = byId[r.fromPlanId]; if (!pl) continue;
            var ii = parseInt(r.fromPlanIndex, 10);
            var auto = r.planPaidLater || r.planNote || r.fromSmsBulk || (r.smsLinked && r.viaSms);
            if (!auto) { if (r.smsLinked) { delete r.smsLinked; dirty = true; } continue; }
            if (r.planPaidLater) { rows.splice(i, 1); out.removed++; dirty = true; continue; }
            if (isNaN(ii) || ii < planLockedCount(pl)) continue;
            if (Number(r.amount) > 0) { rows[i] = hkPlanRowToPlain(r); out.split++; } else { rows.splice(i, 1); out.removed++; }
            (rev[pl.id] = rev[pl.id] || {})[ii] = 1; dirty = true;
          }
          if (!rows.length) rows.push(emptyRow('expense'));
          sec.rows = rows;
        });
        if (dirty) ctxs[k] = ctx;
      });
      Object.keys(ctxs).forEach(function (k) { try { commitWritablePeriodData(ctxs[k]); } catch (e) {} });
      (plans || []).forEach(function (pl) {
        if (!pl) return;
        delete pl.paidLaterAt;
        var r = rev[pl.id]; if (!r) return;
        var L = planLockedCount(pl), paid = parseInt(pl.paidCount, 10) || 0, i = L;
        while (i < paid && !r[i]) i++;
        pl.paidCount = i;
        Object.keys(r).forEach(function (x) { try { if (pl.paidLateMap) delete pl.paidLateMap[x]; if (pl.paidEarlyMap) delete pl.paidEarlyMap[x]; } catch (e) {} });
        try { clampPlanPaymentState(pl); } catch (e2) {}
        out.plans.push(pl.name || 'قسط');
      });
      try { syncPlansToExpenseAll(); } catch (e3) {}
      try { persistCurrent(); saveArchive(); scheduleSave(); } catch (e4) {}
      try { if (typeof updateInstallSummary === 'function') updateInstallSummary(); } catch (e5) {}
      try { renderAll(); } catch (e6) {}
      return out;
    }
    setTimeout(function () {
      try {
        var K = STORAGE_KEY + '_instRevert1337';
        if (localStorage.getItem(K)) return;
        /* بی قسط چیزی برای برگرداندن نیست (و چیزی هم در حافظه نوشته نمی‌شود) */
        if (!(plans || []).length) return;
        localStorage.setItem(K, '1');
        var go = function () {
          var res = hkRevertInstallmentLinks();
          if (res.split || res.removed) {
            try {
              hkAsk3('پیدا کردن خودکار قسط از پیامک‌ها برداشته شد؛ ' + toPersianDigits(String(res.split)) + ' پرداخت که خودکار به قسط وصل شده بود دوباره ردیف معمولی شد (موجودی بانک‌ها تغییری نکرد).' + (res.plans.length ? ' قسط‌های «' + res.plans.join('»، «') + '» را در منوی اقساط یک نگاه بیندازید.' : ''),
                [{ v: 'ok', t: 'باشه', cls: 'primary' }], function () {});
            } catch (eA) {}
          }
        };
        try { safetyBackupThen('inst-revert', go); } catch (eB) { go(); }
      } catch (e) {}
    }, 2500);
    /* ۱.۳.۴۶ (یک‌بار): اقساط خاموش → ردیف‌های قسط مثل بقیهٔ ردیف‌ها؛ «پرداخت قبلی»های قفل (جزو محاسبات نبودند) و قسط‌های
       پرداخت‌نشدهٔ ماه‌های آینده برداشته می‌شوند. داده‌های منوی اقساط دست نمی‌خورد. */
    function hkInstallmentsOffMigrate() {
      var t = getTodayPersian(), tk = t.y * 100 + t.m, n = 0;
      var conv = function (r) {
        ['fromPlanId', 'fromPlanIndex', 'planCarried', 'planEarlyPay', 'planNote', 'allowPlanFieldEdit', 'planPaidLater', 'planLocked', 'planLockedAmt'].forEach(function (k) { delete r[k]; });
        r.updatedAt = Date.now();
      };
      recEachMonth(function (k, pd) {
        ((pd && pd.expense && pd.expense.sections) || []).forEach(function (sec) {
          if (!Array.isArray(sec.rows)) return;
          var out = [];
          sec.rows.forEach(function (r) {
            if (!r || !r.fromPlanId) { out.push(r); return; }
            n++;
            if (r.planLocked) return;
            if (k > tk && (r.status || 'paid') !== 'paid') return;
            conv(r); out.push(r);
          });
          sec.rows = out.length ? out : [emptyRow('expense')];
        });
      });
      if (n) recPersist();
      return n;
    }
    setTimeout(function () {
      try {
        var K = STORAGE_KEY + '_instOff1346';
        if (localStorage.getItem(K)) return;
        var any = false;
        recEachMonth(function (k, pd) { ((pd && pd.expense && pd.expense.sections) || []).forEach(function (sec) { if ((sec.rows || []).some(function (r) { return r && r.fromPlanId; })) any = true; }); });
        /* بی ردیف قسط چیزی برای تبدیل نیست (و چیزی هم در حافظه نوشته نمی‌شود) */
        if (!any) return;
        localStorage.setItem(K, '1');
        var go = function () { if (hkInstallmentsOffMigrate()) { try { renderAll(); renderHomeCards(); } catch (eR) {} } };
        try { safetyBackupThen('inst-off', go); } catch (eB) { go(); }
      } catch (e) {}
    }, 2200);
    /* ===== ۱.۳.۴۷: «ماهی که گذشت در یک نگاه»: اولین ورود در ماه تازه، آمار ماه قبل به‌صورت اسلاید (و از منو) ===== */
    var HK_RECAP_KEY = STORAGE_KEY + '_recapSeen';
    (function () {
      /* همان لحظهٔ بارگذاری (نه با تأخیر): ماه جاری علامت می‌خورد؛ اگر ماه عوض شده بود، نمایش در صف می‌ماند */
      try {
        var t = getTodayPersian(), cur = t.y + '-' + t.m, st = localStorage.getItem(HK_RECAP_KEY) || '';
        if (st === cur) return;
        localStorage.setItem(HK_RECAP_KEY, cur);
        if (/^\d{4}-\d{1,2}$/.test(st)) { var pm = t.m - 1, py = t.y; if (pm < 1) { pm = 12; py--; } window._hkRecapPending = { y: py, m: pm }; }
      } catch (e) {}
    })();
    setTimeout(function hkRecapTry() {
      var p = window._hkRecapPending; if (!p) return;
      try { if (hkPrefs().nRecap === false) { window._hkRecapPending = null; return; } } catch (eNr) {}
      try { if (localStorage.getItem(STORAGE_KEY + '_tourDone') !== '1') { window._hkRecapPending = null; return; } } catch (eT) {}
      if (document.querySelector('.modal-overlay.open, .hk-re-ov, .hk-bulk-ov, #hkRecapOv') || document.hidden) { setTimeout(hkRecapTry, 1500); return; }
      window._hkRecapPending = null;
      try { openMonthRecap(p.y, p.m, true); } catch (e) {}
    }, 1600);
    function hkRecapData(y, m) {
      var pd = (y === currentYear && m === currentMonth) ? periodData : (archive && archive[periodKey(y, m)]);
      if (!pd) return null;
      var D = { y: y, m: m, inc: 0, incU: 0, exp: 0, expU: 0, n: 0, big: null, byDay: {}, cats: {}, recPaid: 0, recUnpaid: 0 };
      ['income', 'expense'].forEach(function (tab) {
        ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            var a = Number(r && r.amount) || 0; if (!a || r.deletedAt || r.p2p) return;
            var paid = (r.status || 'paid') === 'paid'; D.n++;
            if (tab === 'income') {
              D.inc += a; if (!paid) D.incU += a;
              if (r.fromRecurringId) { if (paid) D.recPaid++; else D.recUnpaid++; }
            } else {
              D.exp += a; if (!paid) D.expU += a;
              if (!D.big || a > D.big.amount) D.big = { amount: a, desc: r.desc || '', day: parseInt(toEnglishDigits(String(r.day || '')), 10) || 0 };
              var dd = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0; if (dd) D.byDay[dd] = (D.byDay[dd] || 0) + a;
              var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (eC) {}
              var lab = c ? HKCategorizer.byId[c.id].label : 'نامشخص'; D.cats[lab] = (D.cats[lab] || 0) + a;
            }
          });
        });
      });
      return D.n ? D : null;
    }
    function openMonthRecap(y, m, auto) {
      if (y == null) { var t0 = getTodayPersian(); m = t0.m - 1; y = t0.y; if (m < 1) { m = 12; y--; } }
      try { persistCurrent(); } catch (eP) {}
      var D = hkRecapData(y, m);
      if (!D) { if (!auto) showToast('برای ' + MONTHS[m - 1] + ' ' + toPersianDigits(String(y)) + ' ثبتی نیست'); return; }
      var pm = m - 1, py = y; if (pm < 1) { pm = 12; py--; }
      var P = hkRecapData(py, pm);
      var mName = MONTHS[m - 1] + ' ' + toPersianDigits(String(y));
      var money = function (n) { return formatNum(Math.round(n)) + ' <small>تومان</small>'; };
      var slides = [];
      var bal = D.inc - D.exp;
      slides.push('<div class="hk-rc-k">خلاصهٔ ' + mName + '</div>' +
        '<div class="hk-rc-row inc"><span>درآمد</span><b>' + money(D.inc) + '</b></div>' +
        '<div class="hk-rc-row exp"><span>خرج</span><b>' + money(D.exp) + '</b></div>' +
        '<div class="hk-rc-row ' + (bal >= 0 ? 'inc' : 'neg') + '"><span>' + (bal >= 0 ? 'مازاد' : 'کسری') + '</span><b>' + money(Math.abs(bal)) + '</b></div>' +
        '<div class="hk-rc-note">' + toPersianDigits(String(D.n)) + ' تراکنش ثبت شد</div>');
      if (D.big) slides.push('<div class="hk-rc-k">بزرگ‌ترین خرج</div><div class="hk-rc-big">' + money(D.big.amount) + '</div><div class="hk-rc-sub">' + escapeHtml(D.big.desc || 'بی‌شرح') + (D.big.day ? ' · ' + toPersianDigits(String(D.big.day)) + ' ' + MONTHS[m - 1] : '') + '</div>');
      var cl = Object.keys(D.cats).map(function (k) { return { l: k, a: D.cats[k] }; }).filter(function (x) { return x.l !== 'نامشخص'; }).sort(function (a, b) { return b.a - a.a; }).slice(0, 4);
      if (cl.length && D.exp > 0) slides.push('<div class="hk-rc-k">بیشترین خرج در دسته‌ها</div>' + cl.map(function (x) {
        var pc = Math.round(x.a / D.exp * 100);
        /* ۱.۳.۸۶: رنگ و آیکون ثابت خود هر دسته */
        var cid = ''; try { var cc0 = HKCategorizer.categories.find(function (c) { return c.label === x.l; }); cid = cc0 ? cc0.id : ''; } catch (eCi) {}
        var ccol = cid ? hkCatColor(cid) : '#8e8e93';
        return '<div class="hk-rc-bar" style="--cc:' + ccol + '"><div class="hk-rc-bl"><span><i class="hk-rc-ci">' + hkCatIco(cid) + '</i>' + escapeHtml(x.l) + '</span><b>' + toPersianDigits(String(pc)) + '٪</b></div><div class="hk-rc-tube"><i style="width:' + Math.max(4, pc) + '%"></i></div></div>';
      }).join(''));
      if (P && (P.exp > 0 || P.inc > 0)) {
        var ch = function (a, b, good) { if (!b) return '—'; var d = Math.round((a - b) / b * 100); var up = d > 0; return '<b class="' + ((up === good) ? 'inc' : 'neg') + '">' + (d === 0 ? 'بدون تغییر' : toPersianDigits(String(Math.abs(d))) + '٪ ' + (up ? 'بیشتر' : 'کمتر')) + '</b>'; };
        slides.push('<div class="hk-rc-k">در مقایسه با ' + MONTHS[pm - 1] + '</div>' +
          '<div class="hk-rc-row"><span>خرج</span>' + ch(D.exp, P.exp, false) + '</div>' +
          '<div class="hk-rc-row"><span>درآمد</span>' + ch(D.inc, P.inc, true) + '</div>');
      }
      var days = Object.keys(D.byDay);
      if (days.length) {
        var bd = days.sort(function (a, b) { return D.byDay[b] - D.byDay[a]; })[0];
        var mlen = m <= 6 ? 31 : (m <= 11 ? 30 : 29);
        slides.push('<div class="hk-rc-k">روزهای خرج</div><div class="hk-rc-row"><span>پرخرج‌ترین روز</span><b>' + toPersianDigits(bd) + ' ' + MONTHS[m - 1] + '</b></div>' +
          '<div class="hk-rc-row"><span>خرج همان روز</span><b>' + money(D.byDay[bd]) + '</b></div>' +
          '<div class="hk-rc-row"><span>میانگین خرج روزانه</span><b>' + money(D.exp / mlen) + '</b></div>');
      }
      if (D.recPaid || D.recUnpaid || D.incU || D.expU) {
        var h = '<div class="hk-rc-k">مانده‌های ' + MONTHS[m - 1] + '</div>';
        if (D.recPaid || D.recUnpaid) h += '<div class="hk-rc-row"><span>درآمد ثابت دریافت‌شده</span><b class="inc">' + toPersianDigits(String(D.recPaid)) + ' مورد</b></div>' + (D.recUnpaid ? '<div class="hk-rc-row"><span>درآمد ثابت دریافت‌نشده</span><b class="unp">' + toPersianDigits(String(D.recUnpaid)) + ' مورد</b></div>' : '');
        if (D.expU) h += '<div class="hk-rc-row"><span>پرداخت‌نشده</span><b class="unp">' + money(D.expU) + '</b></div>';
        if (D.incU) h += '<div class="hk-rc-row"><span>دریافت‌نشده</span><b class="unp">' + money(D.incU) + '</b></div>';
        slides.push(h);
      }
      slides.push('<div class="hk-rc-k">ماه تازه مبارک</div><div class="hk-rc-end">' + (bal >= 0 ? 'ماه قبل با مازاد تمام شد؛ همین روند را ادامه بدهید.' : 'ماه قبل کمی بیشتر از درآمد خرج شد؛ این ماه را با برنامه شروع کنید.') + '</div><button type="button" class="hk-rc-done">شروع ماه تازه</button>');
      var old = document.getElementById('hkRecapOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkRecapOv'; ov.className = 'hk-rc-ov'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="hk-rc-box"><button type="button" class="hk-rc-x" aria-label="بستن">×</button>' +
        '<div class="hk-rc-title">ماهی که گذشت در یک نگاه</div><div class="hk-rc-month">' + mName + '</div>' +
        '<div class="hk-rc-track">' + slides.map(function (s) { return '<div class="hk-rc-slide"><div class="hk-rc-card">' + s + '</div></div>'; }).join('') + '</div>' +
        '<div class="hk-rc-dots">' + slides.map(function (s, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div></div>';
      document.body.appendChild(ov);
      var close = function () { ov.classList.remove('open'); setTimeout(function () { try { ov.remove(); } catch (e) {} }, 220); };
      ov._hkCancel = close;
      ov.querySelector('.hk-rc-x').onclick = close;
      ov.querySelector('.hk-rc-done').onclick = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var tr = ov.querySelector('.hk-rc-track'), dots = ov.querySelectorAll('.hk-rc-dots i');
      var cur = 0;
      tr.addEventListener('scroll', function () {
        var i = Math.round(Math.abs(tr.scrollLeft) / Math.max(1, tr.clientWidth));
        if (i !== cur) { cur = i; dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); }
      }, { passive: true });
      dots.forEach(function (d, k) { d.onclick = function () { tr.scrollTo({ left: (getComputedStyle(tr).direction === 'rtl' ? -1 : 1) * k * tr.clientWidth, behavior: 'smooth' }); }; });
      requestAnimationFrame(function () { ov.classList.add('open'); });
    }
    try { window.openMonthRecap = openMonthRecap; } catch (eW) {}
    function openDupCleanup() { openDupCleanup0(); }
    function openDupCleanup0() {
      var pairs = hkFindDupPairs();
      if (!pairs.length) { showToast('ردیف تکراری مشکوکی پیدا نشد'); return; }
      var old = document.getElementById('hkDupOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkDupOv'; ov.className = 'hk-bulk-ov';
      var desc = function (o) { var d = (o.row.desc || '').trim(); return d ? '«' + escapeHtml(d) + '»' : '(بی‌شرح' + (o.row.fromSmsBulk ? '، از پیامک' : '') + ')'; };
      var jd = function (o) { var p = o.k.split('-'); return hkJStr({ y: +p[0], m: +p[1], d: o.day }); };
      ov.innerHTML = '<div class="hk-bulk-box"><div class="hk-bulk-title">ردیف‌های احتمالاً تکراری</div>' +
        '<div class="hk-bulk-hint">هر جفت: همان حساب، همان مبلغ، همان روز یا یک روز فاصله. ردیفِ خط‌خورده به سطل زباله می‌رود (قابل بازگردانی).</div>' +
        '<label class="hk-bulk-all"><input type="checkbox" class="hk-dup-all" checked><span>همه</span></label>' +
        '<div class="hk-bulk-list">' + pairs.map(function (p, i) {
          return '<label class="hk-dup-row"><input type="checkbox" class="hk-dup-chk" data-i="' + i + '" checked><span><b>' + escapeHtml((p.keep.row.account || '').trim()) + ' · ' + (p.keep.tab === 'income' ? 'واریز ' : 'برداشت ') + formatNum(Number(p.keep.row.amount) || 0) + '</b><br>' +
            'می‌ماند: ' + jd(p.keep) + ' ' + desc(p.keep) + '<br><s>حذف: ' + jd(p.drop) + ' ' + desc(p.drop) + '</s></span></label>';
        }).join('') + '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok hk-dup-go">حذف موارد انتخاب‌شده</button><button type="button" class="hk-bulk-close">بستن</button></div></div>';
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.hk-bulk-close').onclick = close;
      var all = ov.querySelector('.hk-dup-all'), chks = [].slice.call(ov.querySelectorAll('.hk-dup-chk'));
      var okBtn = ov.querySelector('.hk-dup-go');
      var sync = function () { var n = chks.filter(function (c) { return c.checked; }).length; all.checked = n === chks.length; all.indeterminate = n > 0 && n < chks.length; okBtn.disabled = !n; };
      all.onchange = function () { chks.forEach(function (c) { c.checked = all.checked; }); sync(); };
      chks.forEach(function (c) { c.onchange = sync; });
      okBtn.onclick = function () {
        var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return pairs[+c.dataset.i]; });
        if (!sel.length) return;
        var run = function () {
          var cur = periodKey(currentYear, currentMonth), n = 0;
          sel.forEach(function (p) {
            var o = p.drop, i = (o.sec.rows || []).indexOf(o.row); if (i < 0) return;
            var ok = pushToTrash('row', (o.row.desc || o.sec.title || 'ردیف') + ' · ' + formatNum(Number(o.row.amount) || 0), {
              tab: o.tab, sectionId: o.sec.id, sectionTitle: o.sec.title || '', periodKey: o.k, row: JSON.parse(JSON.stringify(o.row)), sourceLabel: 'پاک‌سازی تکراری‌ها'
            });
            if (!ok) return;
            o.sec.rows.splice(i, 1); n++;
          });
          try { persistCurrent(); saveArchive(); scheduleSave(); } catch (eS) {}
          try { renderAll(); renderHomeCards(); } catch (eR) {}
          close();
          showToast(toPersianDigits(String(n)) + ' ردیف تکراری به سطل زباله رفت');
        };
        try { safetyBackupThen('dup-clean', run); } catch (eB) { run(); }
      };
      sync();
    }
    function openBankAccountsModal(fromMenu) {
      _bankModalFromMenu = fromMenu !== false;
      try { closeSideMenu(); } catch (e) {}
      renderBankAccountsList();
      var bm = document.getElementById('bankAccountsModal');
      if (bm) {
        if (window._returnToSmsConfirm || window._returnToBulk) {
          bm.style.zIndex = '100200';
        }
        bm.classList.add('open');
        /* ۱.۳.۵۴: هر بار از اول فهرست (اسکرول قبلی نمی‌ماند) */
        try { bm.scrollTop = 0; bm.querySelectorAll('*').forEach(function (el) { if (el.scrollTop) el.scrollTop = 0; }); } catch (eS) {}
      }
    }
    function maybeShowFirstRunBankSetup() {
      try {
        if (localStorage.getItem(STORAGE_KEY + '_bankSetupDone') === '1') return;
        if ((selectedBankAccounts || []).length > 0) {
          localStorage.setItem(STORAGE_KEY + '_bankSetupDone', '1');
          return;
        }
        /* ۱.۳.۶۵: بار اول: بعد از راهنما «حساب‌هایت را پیدا کنیم» (راهنما که تمام شود خودش باز می‌کند) */
        if (localStorage.getItem(STORAGE_KEY + '_tourDone') !== '1') return;
      } catch (e) {}
      setTimeout(() => {
        try { hkOpenSetup(); } catch (e) {}
      }, 600);
    }
