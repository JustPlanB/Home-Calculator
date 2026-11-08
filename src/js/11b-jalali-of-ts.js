    /* ===== ثبت گروهی پیامک‌های بانکی (حسابداری پیامک) =====
       پیامک‌های تراکنش از صندوق ورودی گوشی خوانده می‌شوند (با اجازهٔ «خواندن پیامک»)، بر اساس بانک و رقم‌های آخر حساب
       پوشه‌پوشه می‌شوند و کاربر برای هر پوشه حساب را تعیین می‌کند. هیچ چیزی بدون انتخاب کاربر ثبت نمی‌شود. */
    var _hkBulk = null;
    var _hkFaFmt = null;
    function hkJalaliOfTs(ts) {
      try {
        if (!_hkFaFmt) _hkFaFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' });
        var parts = _hkFaFmt.formatToParts(new Date(ts));
        var get = function (t) { return parseInt(toEnglishDigits((parts.find(function (p) { return p.type === t; }) || {}).value || '0'), 10) || 0; };
        return { y: get('year'), m: get('month'), d: get('day') };
      } catch (e) { var t = getTodayPersian(); return t; }
    }
    function hkParseJDate(str) {
      var p = toEnglishDigits(String(str || '')).split(/[\/\-.\s]+/).map(function (x) { return parseInt(x, 10) || 0; });
      if (p.length < 3 || !p[0]) return null;
      if (p[0] < 100) p[0] += 1400;
      if (p[1] < 1 || p[1] > 12 || p[2] < 1 || p[2] > 31) return null;
      return { y: p[0], m: p[1], d: p[2] };
    }
    function hkJKey(j) { return j.y * 10000 + j.m * 100 + j.d; }
    function hkJStr(j) { return toPersianDigits(j.y + '/' + String(j.m).padStart(2, '0') + '/' + String(j.d).padStart(2, '0')); }
    function openSmsBulkModal() {
      try { closeSmsImportModal(); } catch (e0) {}
      var B = hkBankSmsPlugin();
      if (!B || typeof B.readInbox !== 'function') {
        /* آیفون اجازهٔ خواندن صندوق پیامک نمی‌دهد: راه جایگزین (میان‌برها یا چسباندن تکی) */
        if (typeof hkIsIos === 'function' && hkIsIos()) { showToast('در آیفون خواندن صندوق پیامک ممکن نیست؛ از «ثبت تکی» یا میان‌برها استفاده کنید'); try { hkIosSmsGuide(); } catch (eG) {} return; }
        showToast('ثبت گروهی فقط در نسخهٔ اندروید نرم‌افزار کار می‌کند'); return;
      }
      var old = document.getElementById('smsBulkOv'); if (old) old.remove();
      var t = getTodayPersian();
      var from = { y: t.y, m: t.m, d: 1 };
      var ov = document.createElement('div');
      ov.id = 'smsBulkOv'; ov.className = 'hk-bulk-ov';
      ov.innerHTML = '<div class="hk-bulk-box">' +
        '<div class="hk-bulk-title">ثبت گروهی پیامک‌های بانکی</div>' +
        '<button type="button" class="hk-bulk-rbar" style="display:none"></button>' +
        '<div class="hk-bulk-rwrap"><div class="hk-bulk-range"><div class="hk-bulk-rlbl">از تاریخ</div><div id="hkBulkFromWrap"></div><div class="hk-bulk-rlbl">تا تاریخ</div><div id="hkBulkToWrap"></div></div>' +
        '<div id="hkBulkCardWrap" style="display:none"><div class="hk-bulk-rlbl">ثبت روی کارت</div><div></div></div>' +
        '<button type="button" class="hk-bulk-read">خواندن پیامک‌ها</button></div>' +
        /* ۱.۳.۴۸: «پیدا کردن ردیف‌های تکراری قبلی» برداشته شد (ثبت گروهی خودش تکراری‌ها را کنار می‌گذارد) */
        '<div class="hk-bulk-list" id="hkBulkList"><div class="hk-bulk-hint">بازه را مشخص کنید و «خواندن پیامک‌ها» را بزنید. نرم‌افزار پیامک‌های تراکنش بانکی را پیدا می‌کند و بر اساس بانک و حساب دسته‌بندی می‌کند.</div></div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok" disabled>ثبت تراکنش‌های انتخاب‌شده</button><button type="button" class="hk-bulk-close">بستن</button></div>' +
      '</div>';
      document.body.appendChild(ov);
      /* انتخاب تاریخ با منوهای کشویی (بدون تایپ) */
      var _fromSel = hkCreateDateSelects(from, { yearsBack: 10, yearsFwd: 0 });
      var _toSel = hkCreateDateSelects(t, { yearsBack: 10, yearsFwd: 0 });
      ov.querySelector('#hkBulkFromWrap').appendChild(_fromSel);
      ov.querySelector('#hkBulkToWrap').appendChild(_toSel);
      ov._fromSel = _fromSel; ov._toSel = _toSel;
      /* لمس بیرون باکس = بستن */
      ov.addEventListener('click', function (e) { if (e.target === ov) closeSmsBulkModal(); });
      /* ۱.۳.۴۹: بعد از آمدن پوشه‌ها «بستن» = برگشت به انتخاب بازه؛ در انتخاب بازه = بستن منو */
      ov.querySelector('.hk-bulk-close').onclick = function () {
        var list = document.getElementById('hkBulkList');
        if (_hkBulk && list && list.children.length) {
          /* ۱.۳.۵۱: یک حرکت نرم (بی پرش): ارتفاع قبلی → ارتفاع صفحهٔ بازه، بخش بازه محو به داخل */
          var box = ov.querySelector('.hk-bulk-box'), wrap = ov.querySelector('.hk-bulk-rwrap'), bar = ov.querySelector('.hk-bulk-rbar'), dup = ov.querySelector('.hk-bulk-dupbtn');
          var h0 = box ? box.getBoundingClientRect().height : 0;
          _hkBulk.folders = []; list.innerHTML = ''; list.classList.remove('scrolled');
          var okB = ov.querySelector('.hk-bulk-ok'); if (okB) okB.disabled = true;
          if (bar) { bar.style.display = 'none'; bar.classList.remove('ropen'); }
          [wrap, dup].forEach(function (el) { if (el) el.style.display = ''; });
          var h1 = box ? box.getBoundingClientRect().height : 0;
          if (box && box.animate && Math.abs(h1 - h0) > 1) {
            box.style.overflow = 'hidden';
            var a = box.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 380, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
            a.onfinish = a.oncancel = function () { box.style.overflow = ''; };
          }
          [wrap, dup].forEach(function (el) { if (el && el.animate) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }); });
          return;
        }
        closeSmsBulkModal();
      };
      ov.querySelector('.hk-bulk-read').onclick = function () { hkBulkRead(); };
      ov.querySelector('.hk-bulk-rbar').onclick = function () { var w = ov.querySelector('.hk-bulk-rwrap'); hkBulkRangeShow(!w || w.style.display === 'none'); };
      ov.querySelector('.hk-bulk-ok').onclick = function () { hkBulkSubmit(); };
      _hkBulk = { folders: [], newAccs: {}, card: '' };
      /* چند کارت؟ → کاربر کارت مقصد را انتخاب کند */
      try {
        /* انتخاب کارت مقصد همیشه دیده می‌شود (پیش‌فرض: کارت اول)؛ فهرست کارت‌ها از همهٔ ماه‌ها */
        var _titles = hkAllCardTitles();
        _hkBulk.card = hkMainTitle() || _titles[0] || '';
        /* ۱.۳.۴۶: یک کارت؛ انتخاب کارت مقصد پنهان */
        if (false) {
          var _cw = ov.querySelector('#hkBulkCardWrap');
          _cw.style.display = '';
          _cw.lastChild.appendChild(createDarkSelect({ listClassName: 'hk-bulk-dl', options: _titles.map(function (tt) { return { value: tt, label: tt }; }), value: _hkBulk.card,
            onChange: function (v) { if (_hkBulk) _hkBulk.card = v; } }));
        }
      } catch (eCw) {}
    }
    function hkNormTitle(t) { return String(t || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c\u200e\u200f\u00a0]+/g, ''); }
    /* همهٔ کارت‌ها: ماه جاری (به ترتیب کارت‌ها) + ماه‌های دیگر؛ نام‌های یکسان (با «ي/ی»، فاصله و نیم‌فاصلهٔ متفاوت) یکی */
    function hkAllCardTitles() {
      /* ۱.۳.۴۶: یک کارت */
      return [hkMainTitle()];
      var out = [], seen = {};
      var add = function (t) { t = String(t || '').trim(); var k = hkNormTitle(t); if (!k || seen[k]) return; seen[k] = 1; out.push(t); };
      try { (allPersonTitles() || []).forEach(add); } catch (e) {}
      try { loadGlobalCardOrder().forEach(add); } catch (e2) {}
      try { Object.keys(archive || {}).sort().reverse().forEach(function (k) { var pd = archive[k]; ['income', 'expense'].forEach(function (tab) { ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (s2) { add(s2 && s2.title); }); }); }); } catch (e3) {}
      /* «نام کاربر»ِ خالیِ پیش‌فرض (مثلاً بعد از حذف ماه در نسخه‌های قبل) وقتی کارت واقعی هست، آخر فهرست */
      var dk = hkNormTitle('نام کاربر');
      if (out.length > 1 && hkNormTitle(out[0]) === dk) {
        var curEmpty = true;
        try { ['income', 'expense'].forEach(function (tab) { ((periodData[tab] && periodData[tab].sections) || []).forEach(function (s2) { if (hkNormTitle(s2 && s2.title) === dk && !hkIsEmptyDefaultSec(s2)) curEmpty = false; }); }); } catch (e4) {}
        if (curEmpty) out.push(out.shift());
      }
      return out;
    }
    function hkBulkCardTitle() {
      var ct = (_hkBulk && _hkBulk.card) || '';
      if (!ct) { try { ct = hkAllCardTitles()[0] || ''; } catch (eT) {} }
      return ct || 'نام کاربر';
    }
    /* کارت پیش‌فرضِ خالی «نام کاربر» (بی ردیف مبلغ‌دار) */
    function hkIsEmptyDefaultSec(s2) {
      return !!s2 && hkNormTitle(s2.title) === hkNormTitle('نام کاربر') && !((s2.rows || []).some(function (x) { return x && !x.deletedAt && Number(x.amount) > 0; }));
    }
    /* تطبیق با ردیف‌های درآمد/مخارج: همان روز، همان مبلغ، همان نوع و همان حساب (هر ردیف موجود فقط یک پیامک را پوشش می‌دهد) */
    function hkBulkMarkDups(folders) {
      var pool = {}, n = 0;
      var poolOf = function (y, m) {
        var k = y + '-' + m; if (pool[k]) return pool[k];
        var cnt = {};
        try {
          var pd = getWritablePeriodData(y, m).data || {};
          ['income', 'expense'].forEach(function (tab) {
            ((pd[tab] && pd[tab].sections) || []).forEach(function (s2) {
              ((s2 && s2.rows) || []).forEach(function (x) {
                if (!x || x.deletedAt || x.reconGap) return;
                var acc = hkNormAcc(x.account), d = hkDayNum(x.day), a = hkAmtNum(x.amount);
                if (!acc || !d || !a) return;
                var kk = tab + '|' + d + '|' + a + '|' + acc; cnt[kk] = (cnt[kk] || 0) + 1;
              });
            });
          });
        } catch (e) {}
        return (pool[k] = cnt);
      };
      folders.forEach(function (fo) {
        fo.dupCount = 0;
        fo.inRange.forEach(function (r) {
          r._dup = false;
          if (!fo.account) return;
          var cnt = poolOf(r.j.y, r.j.m), kk = r.type + '|' + r.j.d + '|' + hkAmtNum(r.amount) + '|' + hkNormAcc(fo.account);
          if (cnt[kk] > 0) { cnt[kk]--; r._dup = true; fo.dupCount++; n++; }
        });
      });
      return n;
    }
    function closeSmsBulkModal() {
      var ov = document.getElementById('smsBulkOv'); if (ov) ov.remove();
      _hkBulk = null; window._returnToBulk = false; window._hkBulkAddCtx = null;
    }
    /* بعد از خواندن، بازه جمع می‌شود و یک نوار یک‌خطی («بازه: …» با فلش) می‌ماند؛ زدن نوار بازه را باز/بسته می‌کند */
    function hkBulkRangeLabel(bar, open) {
      if (!bar || !_hkBulk || !_hkBulk.from || !_hkBulk.to) return;
      var lbl = function (j) { return toPersianDigits(String(j.d)) + ' ' + MONTHS[j.m - 1] + (j.y !== getTodayPersian().y ? ' ' + toPersianDigits(String(j.y)) : ''); };
      bar.innerHTML = '<span>بازه: ' + lbl(_hkBulk.from) + ' تا ' + lbl(_hkBulk.to) + '</span><span class="hk-chev" aria-hidden="true">' + HK_CHEV_SVG + '</span>';
      bar.style.display = '';
      bar.classList.toggle('ropen', !!open);
    }
    function hkBulkRangeShow(show, done) {
      var ov = document.getElementById('smsBulkOv'); if (!ov) { if (done) done(); return; }
      var wrap = ov.querySelector('.hk-bulk-rwrap'), bar = ov.querySelector('.hk-bulk-rbar'), dup = ov.querySelector('.hk-bulk-dupbtn');
      if (!wrap || !bar) { if (done) done(); return; }
      if (bar.style.display === 'none') hkBulkRangeLabel(bar, show);
      bar.classList.toggle('ropen', !!show);
      /* حرکت نرم بی‌لگ (FLIP): چیدمان نهایی یک‌باره، بعد فقط transform/opacity انیمیت می‌شود (بدون محاسبهٔ دوبارهٔ چیدمان در هر فریم) */
      var box = ov.querySelector('.hk-bulk-box'), list = ov.querySelector('#hkBulkList');
      var D = 420, E = 'cubic-bezier(0.4, 0, 0.2, 1)';
      if (box && box._hkFlip) { try { box._hkFlip(); } catch (eF) {} }
      var vis = function (el) { return el && el.style.display !== 'none'; };
      if (!!show === vis(wrap)) { if (done) done(); return; }
      var r0 = list ? list.getBoundingClientRect() : null, h0 = box ? box.getBoundingClientRect().height : 0;
      /* سایهٔ بخش بازه برای محو شدن هنگام بستن */
      var ghosts = [];
      if (!show && box) [wrap, dup].forEach(function (el) {
        if (!vis(el)) return;
        var br = box.getBoundingClientRect(), er = el.getBoundingClientRect(), g = el.cloneNode(true);
        g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); });
        g.style.cssText = 'position:absolute;left:' + (er.left - br.left) + 'px;top:' + (er.top - br.top) + 'px;width:' + er.width + 'px;margin:0;pointer-events:none;z-index:4;';
        box.appendChild(g); ghosts.push(g);
      });
      [wrap, dup].forEach(function (el) { if (el) el.style.display = show ? '' : 'none'; });
      var r1 = list ? list.getBoundingClientRect() : null, h1 = box ? box.getBoundingClientRect().height : 0;
      if (!box || !box.animate || !list) { ghosts.forEach(function (g) { g.remove(); }); if (done) done(); return; }
      var dy = r0.top - r1.top, anims = [];
      box.classList.add('hk-flip'); box.style.position = 'relative'; box.style.overflow = 'hidden';
      /* باز شدن: فهرست کوتاه‌تر می‌شود؛ تا پایان حرکت همان بلندی قبلی را نگه می‌دارد تا پایینش خالی نشود */
      if (r1.height < r0.height - 1) { list.style.flex = 'none'; list.style.height = r0.height + 'px'; list.style.marginBottom = (r1.height - r0.height + (parseFloat(getComputedStyle(list).marginBottom) || 0)) + 'px'; }
      anims.push(list.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: D, easing: E }));
      if (show) [wrap, dup].forEach(function (el) { if (el) anims.push(el.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: D, easing: E })); });
      ghosts.forEach(function (g) { anims.push(g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: D * 0.7, easing: E, fill: 'forwards' })); });
      if (Math.abs(h1 - h0) > 1) anims.push(box.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: D, easing: E }));
      var fin = function () {
        if (box._hkFlip !== fin) return; box._hkFlip = null;
        anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        ghosts.forEach(function (g) { g.remove(); });
        list.style.flex = ''; list.style.height = ''; list.style.marginBottom = '';
        box.classList.remove('hk-flip'); box.style.overflow = ''; box.style.position = '';
        if (done) { var d = done; done = null; d(); }
      };
      box._hkFlip = fin;
      anims[0].onfinish = fin;
    }
    /* ۱.۳.۸۷: نشانگر بارگذاری وسط باکس: نوشتهٔ درشت‌تر و سه نقطه که یکی‌یکی پر می‌شوند، با موج روی نوشته */
    function hkLoadingHtml(text) {
      return '<div class="hk-loading" role="status" aria-live="polite"><div class="hk-loading-t">' + escapeHtml(text) + '</div><div class="hk-loading-dots"><i></i><i></i><i></i></div></div>';
    }
    try { window.hkLoadingHtml = hkLoadingHtml; } catch (eLh) {}
    function hkBulkRead() {
      var B = hkBankSmsPlugin(); if (!B || !_hkBulk) return;
      var _ov = document.getElementById('smsBulkOv');
      var f = _ov && _ov._fromSel ? _ov._fromSel.getDate() : null, to = _ov && _ov._toSel ? _ov._toSel.getDate() : null;
      if (!f || !to) { showToast('بازهٔ تاریخ را انتخاب کنید'); return; }
      if (hkJKey(f) > hkJKey(to)) { showToast('تاریخ شروع بعد از تاریخ پایان است'); return; }
      var list = document.getElementById('hkBulkList');
      if (list) list.innerHTML = hkLoadingHtml('در حال خواندن پیامک‌ها');
      /* همهٔ پیامک‌های بانکی خوانده می‌شود (برای «آخرین مانده» هر حساب)، بعد بازه جدا می‌شود */
      B.readInbox({ from: 0, limit: 6000 }).then(function (res) {
        var items = (res && res.items) || [];
        hkBulkBuild(items, f, to);
      }).catch(function (err) {
        var m = String((err && (err.message || err.code)) || '');
        if (list) list.innerHTML = '<div class="hk-bulk-hint">' + (/permission/.test(m) ? 'اجازهٔ خواندن پیامک داده نشد. از تنظیمات گوشی › مجوزها › پیامک را روشن کنید.' : 'خواندن پیامک‌ها ممکن نشد.') + '</div>';
      });
    }
    function hkBulkBuild(items, f, to) {
      if (!_hkBulk) return;
      var fk = hkJKey(f), tk = hkJKey(to), map = {}, seenBody = {}, skipNotice = 0, bctx = hkInboxBankCtx(items);
      items.forEach(function (it) {
        try {
          var body = String(it.body || ''); if (!body) return;
          if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(body)) return;
          if (hkSmsBlockedHit(body, it.address)) return;
          var p = parseBankSms(body); if (!p || !p.amount) return;
          if (hkIsSmsNotice(body, p)) { skipNotice++; return; }
          var ts = Number(it.date) || 0;
          /* همان پیامک دو بار در صندوق (هم‌متن و هم‌زمان) */
          var bk = body + '|' + Math.round(ts / 60000);
          if (seenBody[bk]) return; seenBody[bk] = 1;
          var j = hkJalaliOfTs(ts || Date.now());
          var acc4 = hkSmsAcc4(body), bank = '';
          try { bank = hkBankOfSms(body, it.address, bctx) || ''; } catch (eB) {}
          if (!bank) bank = 'بانک نامشخص';
          var personal = hkIsPersonalSender(it.address);
          var key = (personal ? 'P|' + toEnglishDigits(String(it.address || '')).replace(/\D/g, '').slice(-10) + '|' : '') + bank + '|' + (acc4 || '');
          var fo = map[key] || (map[key] = { key: key, bank: bank, acc4: acc4, all: [], inRange: [], latestBal: null, personal: personal, sender: personal ? String(it.address || '') : '' });
          if (!fo.senders) fo.senders = []; if (it.address && fo.senders.indexOf(String(it.address)) < 0) fo.senders.push(String(it.address));
          var rec = { ts: ts, j: j, time: hkSmsTime(body, ts), type: p.type === 'income' ? 'income' : 'expense', amount: p.amount, balance: p.balance, body: body };
          fo.all.push(rec);
          var k = hkJKey(j);
          if (k >= fk && k <= tk) fo.inRange.push(rec);
        } catch (e) {}
      });
      var bankRecs = [];
      Object.keys(map).forEach(function (k) {
        var fo = map[k];
        fo.all.sort(function (a, b) { return a.ts - b.ts; });
        /* زنجیرهٔ مانده؛ قانون کلیِ مستقل از قالب بانک: ماندهٔ قبلی ± مبلغ = ماندهٔ جدید */
        var prev = null, dupSms = 0;
        fo.all.forEach(function (r) {
          if (r.balance != null && prev && prev.balance != null) {
            var pb = Number(prev.balance), b = Number(r.balance), a = Number(r.amount), sg = r.type === 'income' ? 1 : -1;
            var ok = function (amt, sign) { return Math.abs(pb + sign * amt - b) <= 1; };
            if (Math.abs(b - pb) <= 1 && prev.type === r.type && Number(prev.amount) === a && (r.ts - prev.ts) < 86400000) { r._dupSms = true; dupSms++; return; }   /* پیامک تکراریِ همان تراکنش */
            if (!ok(a, sg)) {
              if (ok(a, -sg)) r.type = r.type === 'income' ? 'expense' : 'income';            /* نوع برعکس خوانده شده بود */
              else if (ok(a * 10, sg)) r.amount = a * 10;                                     /* ریال/تومان قاطی شده بود */
              else if (a % 10 === 0 && ok(a / 10, sg)) r.amount = a / 10;
              else r._unsure = true;                                                          /* با مانده جور نیست (یا پیامکی بینشان جا افتاده) */
            }
          }
          if (r.balance != null) prev = r;
          else if (!prev || prev.balance == null) prev = r;
        });
        fo.dupSms = dupSms;
        fo.all = fo.all.filter(function (r) { return !r._dupSms; });
        fo.inRange = fo.inRange.filter(function (r) { return !r._dupSms; });
        if (!fo.personal) fo.all.forEach(function (r) { bankRecs.push(r); });
      });
      /* پیامکِ شمارهٔ شخصی که همان پیامک بانک است (فوروارد) کنار می‌رود */
      var bankSig = {};
      bankRecs.forEach(function (r) { bankSig[r.type + '|' + r.amount + '|' + (r.balance == null ? '' : r.balance) + '|' + hkJKey(r.j)] = 1; });
      Object.keys(map).forEach(function (k) {
        var fo = map[k]; if (!fo.personal) return;
        var keep = function (r) { return !bankSig[r.type + '|' + r.amount + '|' + (r.balance == null ? '' : r.balance) + '|' + hkJKey(r.j)]; };
        fo.all = fo.all.filter(keep); fo.inRange = fo.inRange.filter(keep);
      });
      var folders = Object.keys(map).map(function (k) { return map[k]; }).filter(function (fo) { return fo.inRange.length; });
      folders.forEach(function (fo) {
        fo.all.sort(function (a, b) { return b.ts - a.ts; });
        fo.inRange.sort(function (a, b) { return a.ts - b.ts; });
        var lb = fo.all.find(function (r) { return r.balance != null; });
        fo.latestBal = lb ? lb.balance : null;
        fo.latestRec = lb || null;
        fo.unsure = fo.inRange.filter(function (r) { return r._unsure; }).length;
      });
      folders.sort(function (a, b) { return (a.personal ? 1 : 0) - (b.personal ? 1 : 0) || b.inRange.length - a.inRange.length; });
      folders.forEach(function (fo) { fo.checked = false; });   /* پیش‌فرض: هیچ پوشه‌ای تیک نخورده */
      _hkBulk.folders = folders; _hkBulk.from = f; _hkBulk.to = to; _hkBulk.skipNotice = skipNotice;
      hkBulkAutoAssign();
      /* یک حرکت پیوسته و یک‌طرفه (FLIP): ارتفاع فعلی باکس، بعد حالت نهایی (بازه جمع، نوار، پوشه‌ها) یک‌جا، بعد فقط باکس از ارتفاع قبلی به نهایی می‌رود */
      var _ovB = document.getElementById('smsBulkOv'), box = _ovB && _ovB.querySelector('.hk-bulk-box');
      var h0 = box ? box.getBoundingClientRect().height : 0;
      if (box && box._hkAnim) { try { box._hkAnim.cancel(); } catch (eC) {} }
      if (folders.length && _ovB) {
        var _rw = _ovB.querySelector('.hk-bulk-rwrap'), _dp = _ovB.querySelector('.hk-bulk-dupbtn'), _bar = _ovB.querySelector('.hk-bulk-rbar');
        [_rw, _dp].forEach(function (el) { if (el) { el.style.display = 'none'; el.classList.remove('hk-shutting'); } });
        hkBulkRangeLabel(_bar, false);
      }
      hkBulkRender();
      var lst = document.getElementById('hkBulkList');
      if (!folders.length || !box || !box.animate) return;
      var h1 = box.getBoundingClientRect().height;
      var D = 520, E = 'cubic-bezier(0.4, 0, 0.2, 1)';
      if (lst && lst.animate) lst.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D, easing: 'ease-out' });
      if (Math.abs(h1 - h0) > 2) {
        box.style.overflow = 'hidden';
        var an = box._hkAnim = box.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: D, easing: E });
        an.onfinish = an.oncancel = function () { box.style.overflow = ''; if (box._hkAnim === an) box._hkAnim = null; };
      }
    }
    var HK_PERSON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.6" fill="rgba(255,159,10,0.16)" stroke="#ff9f0a" stroke-width="1.7"/><path d="M4.8 19.6c1.1-3.4 3.9-5.2 7.2-5.2s6.1 1.8 7.2 5.2" fill="none" stroke="#ff9f0a" stroke-width="1.7" stroke-linecap="round"/></svg>';
    /* ۱.۳.۵۰: پوشهٔ آبی (طبق عکس کاربر)؛ جدا از زردِ پرداخت/دریافت‌نشده */
    /* ۱.۳.۵۱: شکل قبلی پوشه (خطی) با رنگ‌های آبی ۱.۳.۵۰ */
    var HK_FOLDER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="rgba(79,195,247,0.16)" stroke="#4fc3f7" stroke-width="1.7" stroke-linejoin="round"/><path d="M3.5 10h17" stroke="#0277bd" stroke-width="1.4"/></svg>';
    /* حساب هر پوشه بدون سؤال: (۱) رقم‌های آخرِ آموخته‌شده (۲) تنها حسابِ آزادِ همان بانک (۳) حساب تازه با نام «ملت ۱۲۳۴».
       اگر بانک چند حساب دارد و معلوم نیست کدام است، فقط کادر حساب همان پوشه قرمز می‌شود. */
    /* نام حساب تازه با یکی از حساب‌های «انتخاب حساب» یکی است؟ (ي/ی، ک، فاصله و نیم‌فاصله یکسان) */
    /* ۱.۳.۶۵: باکس «حساب جدید» همه‌جا دقیقاً مثل ثبت گروهی: قاب آبی، «حساب جدید:» داخل باکس | خط تفکیک | نام */
    function hkNewAccBox(placeholder, value) {
      var wrap = document.createElement('div'); wrap.className = 'hk-bulk-newwrap';
      var box = document.createElement('div'); box.className = 'hk-bulk-newacc';
      box.innerHTML = '<span class="hk-bulk-newlab">حساب جدید:</span><span class="hk-bulk-newsep" aria-hidden="true"></span>';
      var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'hk-bulk-newinp'; inp.dir = 'rtl';
      inp.placeholder = placeholder || 'ملی';
      if (value) inp.value = value;
      box.appendChild(inp);
      var dup = document.createElement('div'); dup.className = 'hk-acc-dup';
      var chk = function () { dup.textContent = hkAccNameTaken(inp.value) ? 'این نام در «انتخاب حساب» هست؛ نام دیگری بنویسید' : ''; };
      inp.addEventListener('input', chk);
      wrap.appendChild(box); wrap.appendChild(dup); chk();
      return { wrap: wrap, input: inp, dup: dup };
    }
    function hkAccNameTaken(name, labels) {
      var n = hkNormTitle(String(name || '')); if (!n) return false;
      return (labels || selectedAccountLabels()).some(function (lb) { return hkNormTitle(lb) === n; });
    }
    function hkBulkNewLabel(fo, taken) {
      var base = (fo.bank && fo.bank !== 'بانک نامشخص' ? (bankShortLabel(fo.bank) || fo.bank) : 'حساب') + (fo.acc4 ? ' ' + toPersianDigits(fo.acc4) : '');
      var cand = base, n = 2;
      while (taken.indexOf(cand) >= 0) { cand = base + ' (' + toPersianDigits(String(n)) + ')'; n++; }
      return cand;
    }
    function hkBulkAutoAssign() {
      if (!_hkBulk) return;
      var labels = selectedAccountLabels(), folders = _hkBulk.folders, taken = labels.slice();
      var map = (typeof smsAccountBankMap === 'object' && smsAccountBankMap) || {};
      folders.forEach(function (fo) {
        fo.newLabel = fo.personal ? '' : hkBulkNewLabel(fo, taken); if (fo.newLabel) taken.push(fo.newLabel);
        fo.account = ''; fo.ambig = false; fo.needName = false; fo._typing = false;
        if (fo.personal) return;   /* پیامکِ شمارهٔ شخصی: حساب خودکار نمی‌گیرد */
        var m = fo.acc4 && map['L4:' + fo.acc4];
        if (m && labels.indexOf(m) >= 0) fo.account = m;
      });
      var byBank = {};
      folders.forEach(function (fo) { if (!fo.account && !fo.personal) (byBank[fo.bank] = byBank[fo.bank] || []).push(fo); });
      Object.keys(byBank).forEach(function (bank) {
        var fs = byBank[bank];
        /* ۱.۳.۴۸: بانک ناشناخته → فیلد نام حساب جدید */
        if (bank === 'بانک نامشخص') { fs.forEach(function (fo) { fo.account = fo.newLabel; fo.needName = true; }); return; }
        var accs = (selectedBankAccounts || []).filter(function (a) { return a && migrateBankName(a.bank || '') === bank; }).map(accountLabel);
        /* حسابی که رقم‌های کارت دیگری به آن آموخته شده، مال این پوشه‌ها نیست */
        var free = accs.filter(function (lb) {
          if (folders.some(function (f) { return f.account === lb; })) return false;
          return !Object.keys(map).some(function (k) { return /^L4:/.test(k) && map[k] === lb && fs.every(function (f) { return 'L4:' + f.acc4 !== k; }); });
        });
        /* ۱.۳.۴۸: حساب‌های آزادِ همان بانک به‌ترتیب پیش‌فرضِ پوشه‌ها می‌شوند؛ بقیه فیلد نام حساب جدید */
        fs.forEach(function (fo, k) { if (free[k]) fo.account = free[k]; else { fo.account = fo.newLabel; fo.needName = true; } });
      });
    }
    function hkBulkRender() {
      var list = document.getElementById('hkBulkList'); if (!list || !_hkBulk) return;
      var ok = document.querySelector('#smsBulkOv .hk-bulk-ok');
      if (!_hkBulk.folders.length) { list.innerHTML = '<div class="hk-bulk-hint">در این بازه پیامک تراکنش بانکی پیدا نشد.</div>'; if (ok) ok.disabled = true; return; }
      var labels = selectedAccountLabels();
      list.innerHTML = '';
      /* «همه»: انتخاب/لغو همهٔ پوشه‌ها */
      var allRow = document.createElement('label'); allRow.className = 'hk-bulk-all';
      allRow.innerHTML = '<input type="checkbox" class="hk-bulk-allchk"><span>همه</span>';
      var allChk = allRow.querySelector('input');
      var bankFolders = function () { return _hkBulk.folders.filter(function (f) { return !f.personal; }); };
      var syncAll = function () { var bf = bankFolders(), n = bf.filter(function (f) { return f.checked; }).length; allChk.checked = bf.length > 0 && n === bf.length; allChk.indeterminate = n > 0 && n < bf.length; };
      allChk.onchange = function () {
        _hkBulk.folders.forEach(function (fo) { if (!fo.personal) fo.checked = allChk.checked; });
        list.querySelectorAll('.hk-bulk-folder').forEach(function (c, i) { var fo = _hkBulk.folders[i]; c.classList.toggle('on', fo.checked); c.querySelector('.hk-bulk-chk').checked = fo.checked; hkBulkMark(c, fo); hkBulkShowDup(c, fo); });
        hkBulkOkState();
      };
      list.appendChild(allRow);
      if (!list._hkScr) { list._hkScr = true; list.addEventListener('scroll', function () { list.classList.toggle('scrolled', list.scrollTop > 2); }, { passive: true }); }
      _hkBulk.folders.forEach(function (fo, i) {
        var card = document.createElement('div'); card.className = 'hk-bulk-folder' + (fo.checked ? ' on' : '') + (fo.open ? ' open' : '') + (fo.checked && !fo.account ? ' need' : '') + (fo.personal ? ' personal' : '');
        var inc = 0, exp = 0; fo.inRange.forEach(function (r) { if (r.type === 'income') inc += r.amount; else exp += r.amount; });
        card.innerHTML = '<div class="hk-bulk-fhead"><input type="checkbox" class="hk-bulk-chk"' + (fo.checked ? ' checked' : '') + ' aria-label="انتخاب">' +
          '<span class="hk-bulk-fico">' + (fo.personal ? HK_PERSON_SVG : HK_FOLDER_SVG) + '</span>' +
          '<span class="hk-bulk-fname">' + escapeHtml(fo.bank) + (fo.acc4 ? ' · ' + toPersianDigits(fo.acc4) : '') + '</span>' +
          '<button type="button" class="hk-bulk-block' + (fo._blocked ? ' on' : '') + '" title="مسدود کردن" aria-label="مسدود کردن"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M6.4 6.4l11.2 11.2"/></svg></button>' +
          '<span class="hk-bulk-arrow hk-chev" aria-hidden="true">' + HK_CHEV_SVG + '</span></div>' +
          (fo.personal ? '<div class="hk-bulk-ptag sms-sender-warn">' + hkPersonalNoticeHtml(fo.sender) + '</div>' : '') +
          '<div class="hk-bulk-fmeta">' + toPersianDigits(String(fo.inRange.length)) + ' تراکنش · واریز ' + formatNum(inc) + ' · برداشت ' + formatNum(exp) +
          (fo.latestBal != null ? '<br>آخرین مانده در پیامک‌ها: ' + formatNum(fo.latestBal) + (fo.latestRec ? ' (' + hkJStr(fo.latestRec.j) + ')' : '') : '') +
          (fo.unsure ? '<br><span class="hk-bulk-unsure">' + toPersianDigits(String(fo.unsure)) + ' تراکنش با ماندهٔ پیامک قبلی جور نیست (؟)؛ برای اختلاف، ردیف اختلاف ثبت می‌شود</span>' : '') +
          '<span class="hk-bulk-fdup"></span></div>';
        /* فهرست تراکنش‌ها فقط با اولین باز شدن پوشه ساخته می‌شود (۴۰ ردیف برای همهٔ پوشه‌ها از اول = کندی) */
        var tx = document.createElement('div'); tx.className = 'hk-bulk-tx';
        var fillTx = function () {
          if (tx._filled) return; tx._filled = true;
          tx.innerHTML = fo.inRange.slice().reverse().map(function (r) {
            return '<div class="hk-bulk-txr' + (r._unsure ? ' unsure' : '') + '"' + (r._unsure ? ' title="با ماندهٔ پیامک قبلی جور نیست"' : '') + '><span>' + hkJStr(r.j) + '</span><span class="' + (r.type === 'income' ? 'inc' : 'exp') + '">' + (r.type === 'income' ? '+' : '−') + formatNum(r.amount) + '</span>' +
              '<span class="bal">' + (r.balance != null ? formatNum(r.balance) : '—') + (r._unsure ? ' ؟' : '') + '</span></div>';
          }).join('');
        };
        if (fo.open) fillTx();
        card.appendChild(tx);
        /* ۱.۳.۴۸: دو حالت: حسابِ شناخته‌شده (پیش‌فرض همان؛ منو = حساب‌های قبلی + «＋ حساب جدید») یا بی‌حساب (فیلد «نام حساب جدید»).
           فیلد سرتاسری: «نام حساب جدید:» | خط تفکیک | نام پیشنهادیِ قابل ویرایش */
        var opts = (fo.account && labels.indexOf(fo.account) >= 0 ? [] : [{ value: '', label: 'انتخاب حساب' }]).concat(labels.map(function (lb) { return { value: lb, label: lb }; }));
        opts.push({ value: '__add_account__', label: '＋ افزودن حساب' });
        var newBox = document.createElement('div'); newBox.className = 'hk-bulk-newacc';
        var newInp = document.createElement('input'); newInp.type = 'text'; newInp.className = 'hk-bulk-newinp'; newInp.dir = 'rtl';
        newInp.placeholder = (String(fo.bank || 'بانک').replace(/^بانک\s*/, '') || 'ملی') + (fo.acc4 ? ' ' + toPersianDigits(fo.acc4) : '');
        newBox.innerHTML = '<span class="hk-bulk-newlab">حساب جدید:</span><span class="hk-bulk-newsep" aria-hidden="true"></span>';
        newBox.appendChild(newInp);
        var dupHint = document.createElement('div'); dupHint.className = 'hk-acc-dup';
        var newWrap = document.createElement('div'); newWrap.className = 'hk-bulk-newwrap';
        newWrap.appendChild(newBox); newWrap.appendChild(dupHint);
        /* ۱.۳.۵۱: پوشهٔ شخصی بی منو؛ از اول فیلد «حساب جدید» */
        if (fo.personal) fo._typing = true;
        var isNew = function () { return !!fo.needName || !!fo._typing; };
        var chkDup = function () {
          if (!isNew()) { fo.dupName = false; dupHint.textContent = ''; card.classList.remove('dupname'); return; }
          var v = newInp.value.trim();
          var d = !!v && (hkAccNameTaken(v, labels) || _hkBulk.folders.some(function (f2) { return f2 !== fo && f2.checked && (f2.needName || f2._typing) && hkNormTitle(f2.account || '') === hkNormTitle(v); }));
          fo.dupName = d; dupHint.textContent = d ? 'این نام قبلاً هست؛ نام دیگری بنویسید' : ''; card.classList.toggle('dupname', d);
        };
        var syncNew = function () { newWrap.style.display = isNew() ? '' : 'none'; if (isNew() && document.activeElement !== newInp) newInp.value = fo.account || ''; chkDup(); };
        newInp.addEventListener('click', function (e) { e.stopPropagation(); });
        newInp.addEventListener('focus', function () { try { newInp.select(); } catch (eS) {} });
        newInp.addEventListener('input', function () { fo.account = newInp.value.trim(); fo.ambig = false; chkDup(); hkBulkMark(card, fo); hkBulkShowDup(card, fo); hkBulkOkState(); });
        var dsel = createDarkSelect({ options: opts, value: (fo.account && labels.indexOf(fo.account) >= 0) ? fo.account : '', listClassName: 'hk-bulk-dl', onChange: function (v) {
          if (v === '__add_account__') {
            fo._typing = true;
            fo.account = (fo.newLabel && !hkAccNameTaken(fo.newLabel, labels)) ? fo.newLabel : '';
            /* ۱.۳.۵۰: منوی حساب پنهان؛ فیلد «حساب جدید» به‌جایش */
            dsel.style.display = 'none';
            syncNew(); hkBulkMark(card, fo); hkBulkShowDup(card, fo); hkBulkOkState();
            setTimeout(function () { try { newInp.focus(); } catch (eF) {} }, 60);
            return;
          }
          fo._typing = false;
          fo.account = v; fo.ambig = false;
          syncNew();
          hkBulkMark(card, fo);
          hkBulkShowDup(card, fo);
          hkBulkOkState();
        } });
        dsel.classList.add('hk-bulk-dsel');
        if (!fo.needName && !fo.personal) card.appendChild(dsel);
        card.appendChild(newWrap);
        syncNew();
        var chk = card.querySelector('.hk-bulk-chk');
        chk.addEventListener('click', function (e) { e.stopPropagation(); });
        /* ۱.۳.۷۵: مسدود برای همهٔ پوشه‌ها (شخصی و بی‌شماره با فرستنده)؛ همان‌جا روشن/خاموش، آیکون قرمز؛ بعد از بستن در منوی «حساب‌های مسدود شده» */
        var blk = card.querySelector('.hk-bulk-block');
        var blkEntry = function () { return fo.acc4 && !fo.personal ? { d: String(fo.acc4) } : { s: (fo.senders || [fo.sender]).filter(Boolean) }; };
        var paintBlk = function () {
          blk.classList.toggle('on', !!fo._blocked); card.classList.toggle('blocked', !!fo._blocked);
          chk.disabled = !!fo._blocked; if (fo._blocked && fo.checked) { fo.checked = false; chk.checked = false; card.classList.remove('on'); }
          hkBulkMark(card, fo); hkBulkOkState(); try { syncAll(); } catch (eS) {}
        };
        if (blk) blk.addEventListener('click', function (e) {
          e.stopPropagation();
          var nm = fo.personal ? ('پیامک شخصی ' + toPersianDigits(String(fo.sender || ''))) : (fo.bank + (fo.acc4 ? ' ' + toPersianDigits(fo.acc4) : ''));
          if (fo._blocked) { hkUnblockAccount(blkEntry()); fo._blocked = false; showToast('«' + nm + '» دوباره فعال شد'); }
          else { hkBlockAccount(fo.acc4 && !fo.personal ? fo.acc4 : '', fo.personal ? 'پیامک شخصی' : fo.bank, { senders: blkEntry().s, nodig: !fo.acc4 && !fo.personal, personal: !!fo.personal }); fo._blocked = true; showToast('«' + nm + '» مسدود شد'); }
          paintBlk();
        });
        if (fo._blocked) paintBlk();
        chk.onchange = function () { fo.checked = chk.checked; card.classList.toggle('on', fo.checked); hkBulkMark(card, fo); hkBulkShowDup(card, fo); hkBulkOkState(); syncAll(); };
        /* زدن هر جای کارت پوشه (به‌جز تیک، منوی حساب و خودِ فهرست تراکنش‌ها) = باز/بسته شدن ریز تراکنش‌ها */
        card.addEventListener('click', function (e) {
          var t = e.target;
          if (t === chk || (t.closest && t.closest('.hk-bulk-dsel, .hk-bulk-tx, .hk-bulk-newacc'))) return;
          fo.open = !fo.open;
          if (fo.open) fillTx();
          /* فلش همان لحظه برمی‌گردد؛ فقط ناحیهٔ فهرست انیمیت می‌شود و فهرست بلند بدون انیمیشن */
          card.classList.toggle('shut', !fo.open);
          if (fo.inRange.length > 60) { card.classList.toggle('open', fo.open); return; }
          hkSlideBox(tx, fo.open, function (o) { card.classList.toggle('open', o); }, 6);
        });
        list.appendChild(card);
        hkBulkShowDup(card, fo);
      });
      syncAll();
      hkBulkOkState();
    }
    /* پوشهٔ تیک‌خورده بی‌حساب: کادر حساب آبی (یعنی «حساب را انتخاب کنید»)؛ قرمز فقط بعد از زدن «ثبت» */
    function hkBulkMark(card, fo) {
      var miss = !!(fo.checked && !fo.account);
      /* ۱.۳.۵۱: پوشهٔ تیک‌خوردهٔ بی‌حساب (شخصی یا بانکی): فقط کادر قرمز، بی آبی */
      card.classList.remove('pick');
      card.classList.toggle('need', miss);
    }
    function hkBulkShowDup(card, fo) {
      var el = card && card.querySelector('.hk-bulk-fdup'); if (!el) return;
      var n = 0;
      try { if (fo.checked && fo.account) n = hkBulkMarkDups([fo]); } catch (e) {}
      el.innerHTML = (n ? '<br>' + toPersianDigits(String(n)) + ' مورد از قبل ثبت شده (دوباره ثبت نمی‌شود)' : '') +
        (fo.checked && fo.account && selectedAccountLabels().indexOf(fo.account) < 0 ? '<br>حساب «' + escapeHtml(fo.account) + '» با موجودی پیامک ساخته می‌شود' : '');
    }
    function hkBulkOkState() {
      var ok = document.querySelector('#smsBulkOv .hk-bulk-ok');
      if (ok && _hkBulk) ok.disabled = !_hkBulk.folders.some(function (fo) { return fo.checked; });
    }
    /* موجودی اولیهٔ حساب تازه برای یک پوشه: آخرین ماندهٔ پیامک‌ها، منهای اثر تراکنش‌های ماه جاری که همین حالا ثبت می‌شوند
       (تا بعد از ثبت، موجودی حساب دقیقاً برابر آخرین مانده شود) */
    function hkBulkOpeningFor(fo) {
      if (!fo || fo.latestBal == null) return null;
      if (fo.latestRec && fo.latestRec.ts && (Date.now() - fo.latestRec.ts) > HK_SMS_FRESH_DAYS * 86400000) return null;   /* پیامکِ کهنه = موجودی نامعلوم */
      var t = getTodayPersian(), s = 0;
      fo.inRange.forEach(function (r) {
        if (r.j.y === t.y && r.j.m === t.m && (!fo.latestRec || r.ts <= fo.latestRec.ts)) s += r.type === 'income' ? r.amount : -r.amount;
      });
      return (Number(fo.latestBal) || 0) - s;
    }
    /* یکدست‌سازی برای مقایسهٔ ردیف و پیامک: رقم فارسی/انگلیسی، «ي/ی»، «ك/ک»، نیم‌فاصله و فاصله‌ها یکی حساب می‌شوند */
    function hkNormAcc(s) { return toEnglishDigits(String(s || '')).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c\u200e\u200f\u00a0]+/g, ''); }
    function hkDayNum(v) { return parseInt(toEnglishDigits(String(v == null ? '' : v)).replace(/[^0-9]/g, ''), 10) || 0; }
    function hkAmtNum(v) { if (typeof v === 'number') return Math.round(v); var n = parseAmount(String(v == null ? '' : v)); return Math.round(Number(n) || 0); }
    var HK_SMS_FRESH_DAYS = 35;
    /* موجودی اول ماه جاری طبق زنجیرهٔ پیامک‌ها: ماندهٔ آخرین پیامکِ پیش از ماه، وگرنه ماندهٔ اولین پیامکِ ماه منهای تراکنش‌های تا آن‌جا.
       end = ماندهٔ آخرین پیامک ماه (برای سنجش «با بانک یکی است») */
    function hkBulkSmsMonth(fo, y, m) {
      var ym = y * 100 + m, recs = fo.all.slice().sort(function (a, b) { return a.ts - b.ts; });
      var before = null, beforeIdx = -1, inM = [];
      recs.forEach(function (r, i) { var k = r.j.y * 100 + r.j.m; if (k < ym) { if (r.balance != null) { before = r; beforeIdx = i; } } else if (k === ym) inM.push(r); });
      var open = null, s = 0;
      /* اول از پیامک‌های مانده‌دارِ خودِ همین ماه */
      for (var i = 0; i < inM.length; i++) { s += inM[i].type === 'income' ? inM[i].amount : -inM[i].amount; if (inM[i].balance != null) { open = Number(inM[i].balance) - s; break; } }
      /* وگرنه پیامکِ قبل از ماه، فقط اگر تازه باشد (حداکثر ۳۵ روز قبل از اول ماه) و بعدش تا اول ماه پیامکِ بی‌مانده نیامده باشد */
      if (open == null && before) {
        var ms = 0; try { var g = persianToDate(y, m, 1); ms = g ? g.getTime() : 0; } catch (eG) {}
        var fresh = ms && (ms - before.ts) <= HK_SMS_FRESH_DAYS * 86400000;
        var gapless = recs.slice(beforeIdx + 1).every(function (r) { var k = r.j.y * 100 + r.j.m; return k >= ym || r.balance != null; });
        if (fresh && gapless) open = Number(before.balance);
      }
      var last = null; inM.forEach(function (r) { if (r.balance != null) last = r; });
      return { open: open, end: last ? Number(last.balance) : null, endDay: last ? last.j.d : 0, hasMonth: inM.length > 0 };
    }
    function hkBulkSubmit() {
      if (!_hkBulk) return;
      var chosen = _hkBulk.folders.filter(function (fo) { return fo.checked; });
      if (!chosen.length) return;
      if (chosen.some(function (fo) { return (fo.needName || fo._typing) && (fo.dupName || hkAccNameTaken(fo.account, selectedAccountLabels())); })) { showToast('نام حساب تازه تکراری است؛ نام دیگری بنویسید'); return; }
      var missing = chosen.filter(function (fo) { return !fo.account; });
      if (missing.length) {
        document.querySelectorAll('#hkBulkList .hk-bulk-folder').forEach(function (c, i) { var fo = _hkBulk.folders[i]; if (fo) { hkBulkMark(c, fo); c.classList.toggle('need', !!(fo.checked && !fo.account)); } });
        showToast('حساب را انتخاب کنید');
        return;
      }
      var ok = document.querySelector('#smsBulkOv .hk-bulk-ok'); if (ok) ok.disabled = true;
      try { safetyBackupThen('sms-bulk', function () { hkBulkImport(chosen); }); } catch (eB) { hkBulkImport(chosen); }
    }
    /* زیرمجموعه‌ای از مبلغ‌ها با جمع target (برای تعداد کم؛ وگرنه null) */
    function hkSubsetSum(vals, target) {
      if (vals.length > 16) return null;
      for (var mask = 0; mask < (1 << vals.length); mask++) {
        var s = 0; for (var i = 0; i < vals.length; i++) if (mask & (1 << i)) s += vals[i];
        if (Math.abs(s - target) <= 1) { var out = []; for (var j = 0; j < vals.length; j++) if (mask & (1 << j)) out.push(j); return out; }
      }
      return null;
    }
    /* ثبت گروهی بدون سؤال: تکراری‌ها کنار، اختلاف بین پیامک‌ها = ردیف اختلاف، موجودی اول ماه از روی پیامک‌ها، و در پایان یک خلاصه با «برگرداندن» */
    function hkBulkImport(chosen) {
      if (!_hkBulk) return;
      chosen = chosen.filter(function (fo) { return fo.checked && fo.account; });
      if (!chosen.length) { hkBulkRender(); return; }
      var t = getTodayPersian();
      if (currentYear !== t.y || currentMonth !== t.m) { try { navigateToPeriod(t.y, t.m); } catch (eN) {} }
      try { persistCurrent(); } catch (eP) {}
      var snap = { archive: JSON.stringify(archive || {}), period: JSON.stringify(periodData), accs: JSON.stringify(selectedBankAccounts || []), map: JSON.stringify(smsAccountBankMap || {}), plans: JSON.stringify(plans || []) };
      var labels = selectedAccountLabels(), created = [];
      chosen.forEach(function (fo) {
        if (labels.indexOf(fo.account) >= 0) return;
        selectedBankAccounts.push({ id: 'ba_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), bank: fo.bank === 'بانک نامشخص' ? '' : fo.bank, label: fo.account, srcName: (fo.bank || '') + (fo.acc4 ? ' · ' + toPersianDigits(fo.acc4) : ''), openingBalance: 0, createdAt: { y: t.y, m: t.m, d: t.d } });
        labels.push(fo.account); created.push(fo.account); _hkBulk.newAccs[fo.account] = true;
      });
      if (created.length) { try { saveBankAccountsSelection(); } catch (eS) {} }
      var cardTitle = hkBulkCardTitle(), oneCard = hkAllCardTitles().length <= 1;
      var ctxs = {};
      var ctxOf = function (y, m) { var k = periodKey(y, m); if (!ctxs[k]) ctxs[k] = getWritablePeriodData(y, m); return ctxs[k]; };
      var secOf = function (pd, tab) {
        if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
        if (!Array.isArray(pd[tab].sections)) pd[tab].sections = [];
        var nT = hkNormTitle(cardTitle);
        var sec = pd[tab].sections.find(function (s2) { return s2 && hkNormTitle(s2.title) === nT; });
        /* فقط یک کارت دارید و آن ماه هم فقط یک کارت دارد (مثلاً با نام قدیمی‌تر): همان کارت، نه کارت تازه */
        if (!sec && oneCard) {
          var named = pd[tab].sections.filter(function (s2) { return s2 && (s2.title || '').trim(); });
          if (named.length === 1) sec = named[0];
        }
        /* آن ماه فقط «نام کاربر»ِ خالیِ پیش‌فرض دارد (مثلاً بعد از حذف ماه): همان، با نام کارت مقصد (در درآمد و مخارج)، نه کارت تازه */
        if (!sec) {
          var defs = pd[tab].sections.filter(function (s2) { return s2 && (s2.title || '').trim(); });
          if (defs.length === 1 && hkIsEmptyDefaultSec(defs[0])) {
            ['income', 'expense'].forEach(function (t2) { ((pd[t2] && pd[t2].sections) || []).forEach(function (s3) { if (hkIsEmptyDefaultSec(s3)) s3.title = cardTitle; }); });
            if (Array.isArray(pd.personCardOrder)) pd.personCardOrder = pd.personCardOrder.map(function (x) { return hkNormTitle(x) === hkNormTitle('نام کاربر') ? cardTitle : x; });
            sec = defs[0];
          }
        }
        if (!sec) {
          var nid = pd[tab].nextId || (pd[tab].sections.length + 1);
          sec = { id: 's' + nid + '_bk', title: cardTitle, color: tabAccentColor(tab), collapsed: false, rows: [] };
          pd[tab].sections.push(sec); pd[tab].nextId = nid + 1;
        }
        if (!Array.isArray(sec.rows)) sec.rows = [];
        return sec;
      };
      /* ردیف‌های موجود هر ماه (یک بار) برای تطبیق */
      var exOf = {};
      var existing = function (y, m) {
        var k = periodKey(y, m); if (exOf[k]) return exOf[k];
        var pd = ctxOf(y, m).data, arr = [];
        ['income', 'expense'].forEach(function (tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function (s2) {
            ((s2 && s2.rows) || []).forEach(function (x) {
              if (!x || x.deletedAt || !(Number(x.amount) || 0)) return;
              arr.push({ tab: tab, day: hkDayNum(x.day), amount: hkAmtNum(x.amount), acc: hkNormAcc(x.account), rawAcc: (x.account || '').trim(), row: x, used: false });
            });
          });
        });
        return (exOf[k] = arr);
      };
      var addRow = function (fo, r) {
        var sec = secOf(ctxOf(r.j.y, r.j.m).data, r.type), row = emptyRow(r.type);
        row.day = String(r.j.d); row.desc = ''; row.amount = r.amount; row.status = 'paid'; row.account = fo.account;
        if (r.time) row.time = r.time;
        row.fromSmsBulk = true; row.createdAt = Date.now(); row.updatedAt = row.createdAt;
        try { if (typeof stampRowOwner === 'function') stampRowOwner(row); } catch (eS) {}
        var ei = sec.rows.findIndex(function (x) { return x && !x.desc && !x.amount && !x.day && !x.fromPlanId; });
        if (ei >= 0) sec.rows.splice(ei, 1);
        sec.rows.push(row);
        sec.rows.sort(function (a, b) { return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99) || hkTimeCmp(a, b); });
        /* ردیف تازه در فهرست تطبیق همان ماه هم باشد (استفاده‌شده) تا پیامک بعدی دوباره به آن نخورد */
        var ek = periodKey(r.j.y, r.j.m);
        if (exOf[ek]) exOf[ek].push({ tab: r.type, day: r.j.d, amount: hkAmtNum(r.amount), acc: hkNormAcc(fo.account), rawAcc: fo.account, row: row, used: true });
        return row;
      };
      var removeRow = function (y, m, row) {
        var pd = ctxOf(y, m).data;
        ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (s2) { var i = (s2.rows || []).indexOf(row); if (i >= 0) s2.rows.splice(i, 1); }); });
      };
      var added = 0, skipped = 0, linked = 0, gapN = 0, report = [], notes = [], unknownOpen = [];
      chosen.forEach(function (fo) {
        var fuzzy = [], accN = hkNormAcc(fo.account);
        /* ردیف جفت‌شده به شکل درست اصلاح شود (روز/نام حساب یکدست) */
        var fixRow = function (x, r) { try { if (x.row.account !== fo.account) x.row.account = fo.account; if (String(x.row.day) !== String(r.j.d)) x.row.day = String(r.j.d); if (r.time && !x.row.time) x.row.time = r.time; x.rawAcc = fo.account; } catch (eF) {} };
        /* ۱) تکراری قطعی: همان روز، مبلغ، نوع و حساب؛ ردیف «بدون حساب» با همان روز و مبلغ = همین تراکنش (حسابش پر می‌شود) */
        fo.inRange.forEach(function (r) {
          var ex = existing(r.j.y, r.j.m), a = hkAmtNum(r.amount);
          /* ۱.۳.۳۷: پیدا کردن خودکار قسط از ثبت گروهی برداشته شد (برگشت به رفتار پیش از ۱.۳.۲۸): پیامک فقط با ردیفِ دقیقاً یکسان
             (روز، مبلغ، نوع و حساب) تکراری حساب می‌شود؛ ردیف قسط فقط اگر پرداخت‌شده و با همین بانک ثبت شده باشد. وگرنه ردیف تازه */
          var hit = ex.find(function (x) { return !x.used && x.tab === r.type && x.day === r.j.d && x.amount === a && x.acc === accN && (!x.row.fromPlanId || ((x.row.status || 'paid') === 'paid' && !x.row.planLocked)); });
          if (hit) { hit.used = true; fixRow(hit, r); r._st = 'dup'; skipped++; return; }
          hit = ex.find(function (x) { return !x.used && x.tab === r.type && x.day === r.j.d && x.amount === a && !x.row.fromPlanId && (!x.acc || x.rawAcc === 'بدون حساب'); });
          if (hit) { hit.used = true; hit.row.account = fo.account; if (r.time && !hit.row.time) hit.row.time = r.time; hit.acc = accN; hit.rawAcc = fo.account; r._st = 'dup'; skipped++; linked++; return; }
          hit = ex.find(function (x) { return !x.used && x.tab === r.type && Math.abs(x.day - r.j.d) === 1 && x.amount === a && x.acc === accN && !x.row.fromPlanId; });
          if (hit) { hit.used = true; r._st = 'fuzzy'; r._fz = hit; fuzzy.push(r); return; }
          /* ردیف تازه؛ اگر ردیف دستیِ خیلی شبیهی هست، در خلاصه گفته شود چه چیزش فرق داشت */
          var near = ex.find(function (x) { return !x.used && x.tab === r.type && x.amount === a && x.day === r.j.d && x.acc && x.acc !== accN; }) ||
                     ex.find(function (x) { return !x.used && x.tab === r.type && x.amount === a && x.acc === accN && x.day !== r.j.d && Math.abs(x.day - r.j.d) <= 3; });
          if (near && notes.length < 6) {
            var why = near.acc !== accN ? 'نام حسابش «' + (near.rawAcc || '—') + '» بود' : 'روزش ' + toPersianDigits(String(near.day || '؟')) + ' بود';
            notes.push((r.type === 'income' ? 'واریز ' : 'برداشت ') + formatNum(a) + ' روز ' + toPersianDigits(String(r.j.d)) + ' ثبت شد؛ ردیف «' + ((near.row.desc || '').trim() || 'بی‌شرح') + '» شبیه بود ولی ' + why);
          }
          r._st = 'new'; r._row = addRow(fo, r); added++;
        });
        /* ۲) اختلاف بین دو پیامک پشت‌سرهم → ردیف اختلاف (مگر ردیف‌های دستیِ جفت‌نشدهٔ همان بازه دقیقاً توضیحش بدهند، یا قبلاً ثبت شده باشد) */
        var prev = null;
        fo.inRange.forEach(function (r) {
          if (prev && prev.balance != null && r.balance != null) {
            var diff = r.balance - (prev.balance + (r.type === 'income' ? r.amount : -r.amount));
            if (Math.abs(diff) > 1) {
              var pk = hkJKey(prev.j), rk = hkJKey(r.j), loose = [];
              [prev.j, r.j].forEach(function (jj, ii) {
                if (ii === 1 && jj.y === prev.j.y && jj.m === prev.j.m) return;
                existing(jj.y, jj.m).forEach(function (x) {
                  var xk = jj.y * 10000 + jj.m * 100 + x.day;
                  if (!x.used && x.acc === accN && !x.row.reconGap && !x.row.fromSmsBulk && xk >= pk && xk <= rk) loose.push(x);
                });
              });
              var pick = hkSubsetSum(loose.map(function (x) { return x.tab === 'income' ? x.amount : -x.amount; }), diff);
              if (pick && pick.length) pick.forEach(function (ix) { loose[ix].used = true; });
              else {
                var gtab = diff < 0 ? 'expense' : 'income', gamt = Math.abs(diff);
                var had = existing(r.j.y, r.j.m).find(function (x) { return !x.used && x.row.reconGap && x.tab === gtab && x.amount === gamt && x.day === r.j.d && x.acc === accN; });
                if (had) had.used = true;
                else { hkBulkApplyGap({ fo: fo, rec: r, diff: diff, row: r._row || null }, ctxOf(r.j.y, r.j.m)); gapN++; }
              }
            }
          }
          prev = r;
        });
        /* ۳) نامطمئن‌ها (یک روز جابه‌جا): هر انتخابی که موجودی ماه جاری را با ماندهٔ پیامک یکی کند؛ وگرنه همان ردیف قبلی حساب می‌شود */
        var sm = hkBulkSmsMonth(fo, t.y, t.m);
        var sumUpTo = function (day) {
          var s = 0;
          ['income', 'expense'].forEach(function (tab) { ((periodData[tab] && periodData[tab].sections) || []).forEach(function (s2) { (s2.rows || []).forEach(function (x) {
            if (!x || (x.status || 'paid') !== 'paid' || hkNormAcc(x.account) !== accN) return;
            var d = hkDayNum(x.day); if (day && d > day) return;
            s += (tab === 'income' ? 1 : -1) * (Number(x.amount) || 0);
          }); }); });
          return s;
        };
        var curFz = fuzzy.filter(function (r) { return r.j.y === t.y && r.j.m === t.m; });
        if (curFz.length && sm.open != null && sm.end != null) {
          var target = sm.end - sm.open - sumUpTo(sm.endDay);
          var pick2 = Math.abs(target) <= 1 ? [] : hkSubsetSum(curFz.map(function (r) { return r.type === 'income' ? r.amount : -r.amount; }), target);
          (pick2 || []).forEach(function (ix) { var r = curFz[ix]; r._fz.used = false; r._st = 'new'; r._row = addRow(fo, r); added++; });
        }
        fuzzy.forEach(function (r) { if (r._st === 'fuzzy') skipped++; });
        try { if (fo.acc4) smsAccountBankMap['L4:' + fo.acc4] = fo.account; } catch (eM) {}
        /* ۴) موجودی اول ماه جاری طبق پیامک‌ها */
        var open = sm.open;
        var isNew = created.indexOf(fo.account) >= 0;
        if (open == null) unknownOpen.push(fo.account);
        if (open != null) {
          var curOpen = 0; try { curOpen = getAccountOpeningBalance(fo.account) || 0; } catch (eO) {}
          if (!periodData.accountOpeningInstant || typeof periodData.accountOpeningInstant !== 'object') periodData.accountOpeningInstant = {};
          if (isNew || Math.abs(curOpen - open) > 1 || periodData.accountOpeningInstant[fo.account] == null) {
            periodData.accountOpeningInstant[fo.account] = open;
            if (isNew) { var acc = selectedBankAccounts.find(function (a) { return accountLabel(a) === fo.account; }); if (acc) acc.openingBalance = open; }
            if (!isNew && Math.abs(curOpen - open) > 1) report.push('موجودی اول ' + MONTHS[t.m - 1] + ' ' + fo.account + ' طبق پیامک‌ها تنظیم شد');
          }
        }
        /* ۵) ماه‌های گذشتهٔ داخل بازه هم موجودی اولِ خودشان را از پیامک‌های همان ماه بگیرند
           (وگرنه از موجودی زمان ساخت حساب شروع می‌شدند و مثلاً شهریور منفی می‌شد) */
        var seenM = {};
        fo.inRange.forEach(function (r) {
          var mk = r.j.y * 100 + r.j.m;
          if (seenM[mk] || (r.j.y === t.y && r.j.m === t.m)) return; seenM[mk] = 1;
          var smP = hkBulkSmsMonth(fo, r.j.y, r.j.m);
          if (smP.open == null) return;
          var pd = ctxOf(r.j.y, r.j.m).data;
          if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
          var old = pd.accountOpeningInstant[fo.account];
          if (old == null || Math.abs(Number(old) - smP.open) > 1) {
            pd.accountOpeningInstant[fo.account] = smP.open;
            report.push('موجودی اول ' + MONTHS[r.j.m - 1] + (r.j.y !== t.y ? ' ' + toPersianDigits(String(r.j.y)) : '') + ' ' + fo.account + ' طبق پیامک‌ها تنظیم شد');
          }
        });
        fo._sm = sm; fo._sumUpTo = sumUpTo;
      });
      try { saveSmsAccountBankMap(); } catch (eSv) {}
      if (created.length) { try { saveBankAccountsSelection(); } catch (eS2) {} }
      /* ردیف‌های هر روز به ترتیب ساعت (ساعت از پیامک؛ ردیف‌های قبلی هم با همین ثبت ساعت گرفتند) */
      Object.keys(ctxs).forEach(function (k) {
        var pd0 = ctxs[k].data || {};
        ['income', 'expense'].forEach(function (tab) { ((pd0[tab] && pd0[tab].sections) || []).forEach(function (s2) {
          if (!Array.isArray(s2.rows) || !s2.rows.some(function (x) { return x && x.time; })) return;
          s2.rows = hkSortRunsByTime(s2.rows);
        }); });
      });
      Object.keys(ctxs).forEach(function (k) { try { commitWritablePeriodData(ctxs[k]); } catch (eC) {} });
      try { persistCurrent(); } catch (e1) {}
      try { saveArchive(); } catch (e2) {}
      try { scheduleSave(); } catch (e3) {}
      /* سنجش نهایی با ماندهٔ بانک (تا روز آخرین پیامک ماه جاری) */
      var checks = chosen.map(function (fo) {
        var sm = fo._sm; if (!sm || sm.end == null) return null;
        var app = (getAccountOpeningBalance(fo.account) || 0) + fo._sumUpTo(sm.endDay);
        return { acc: fo.account, ok: Math.abs(app - sm.end) <= 1, diff: app - sm.end };
      }).filter(Boolean);
      try { renderAll(); } catch (eR) {}
      try { renderHomeCards(); } catch (eH) {}
      var dupSms = 0; chosen.forEach(function (fo) { dupSms += fo.dupSms || 0; });
      hkBulkSummary({ added: added, skipped: skipped, linked: linked, gaps: gapN, created: created, report: report, checks: checks, snap: snap, notes: notes, unknownOpen: unknownOpen, dupSms: dupSms, notices: (_hkBulk && _hkBulk.skipNotice) || 0, newAccs: created });
    }
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
        return '<div class="hk-bulk-sline ' + (c.ok ? 'ok' : 'bad') + '">' + escapeHtml(c.acc) + ': ' + (c.ok ? 'موجودی با پیامک بانک یکی است ✓' : formatNum(Math.abs(c.diff)) + ' تومان ' + (c.diff > 0 ? 'بیشتر' : 'کمتر') + ' از ماندهٔ آخرین پیامک بانک') + '</div>';
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
          if (Math.abs(d) <= 1) { showToast('موجودی «' + lb + '» با آخرین پیامک یکی است ✓'); return; }
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
