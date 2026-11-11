    /* —— Expense / Income render (same as before) —— */

    /* —— کارت‌های کاربر (خانه) —— */
    function getCardMetaMap() {
      try {
        if (!periodData.cardMeta || typeof periodData.cardMeta !== 'object') periodData.cardMeta = {};
        return periodData.cardMeta;
      } catch (e) { return {}; }
    }
    function getCardBgIndex(title) {
      const m = getCardMetaMap();
      const t = (title || '').trim();
      let i = (m[t] && typeof m[t].bg === 'number') ? m[t].bg : 0;
      if (i < 0 || i > 4) i = 0;
      return i;
    }
    function setCardBgIndex(title, idx) {
      const m = getCardMetaMap();
      const t = (title || '').trim();
      if (!m[t]) m[t] = {};
      m[t].bg = Math.max(0, Math.min(4, idx|0));
      periodData.cardMeta = m;
      hkStorageSet(STORAGE_KEY + '_cardMeta', JSON.stringify(m));
      scheduleSave();
    }
    function findSectionByTitle(tab, title) {
      const t = (title || '').trim();
      return (periodData[tab] && periodData[tab].sections || []).find(s => (s.title || '').trim() === t) || null;
    }
    function ensurePersonSections(title) {
      const t = (title || '').trim();
      if (!t) return null;
      let inc = findSectionByTitle('income', t);
      let exp = findSectionByTitle('expense', t);
      if (!inc) {
        if (!periodData.income) periodData.income = { sections: [], nextId: 1 };
        inc = { id: 'sec_inc_' + Date.now().toString(36), title: t, color: '#08b5f5', rows: [emptyRow()], collapsed: true };
        periodData.income.sections.push(inc);
      }
      if (!exp) {
        if (!periodData.expense) periodData.expense = { sections: [], nextId: 1 };
        exp = { id: 'sec_exp_' + (Date.now() + 1).toString(36), title: t, color: '#08b5f5', rows: [emptyRow()], collapsed: true };
        periodData.expense.sections.push(exp);
      }
      return { income: inc, expense: exp };
    }
    function allPersonTitlesRaw() {
      const set = new Set();
      ['income', 'expense'].forEach(tab => {
        (periodData[tab] && periodData[tab].sections || []).forEach(s => {
          const t = (s.title || '').trim();
          if (t) set.add(t);
        });
      });
      return Array.from(set);
    }
    function loadGlobalCardOrder() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_cardOrder');
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(function(x){ return String(x || '').trim(); }).filter(Boolean) : [];
      } catch (e) { return []; }
    }
    function saveGlobalCardOrder(arr) {
      return hkStorageSet(STORAGE_KEY + '_cardOrder', JSON.stringify(arr || []));
    }
    function sortTitlesByOrder(titles, order) {
      const list = (titles || []).slice();
      const ord = (order || []).map(function(x){ return String(x || '').trim(); }).filter(Boolean);
      if (!ord.length) return list;
      const idx = {};
      ord.forEach(function(t, i) { if (idx[t] == null) idx[t] = i; });
      list.sort(function(a, b) {
        const ia = idx[a] != null ? idx[a] : 9999;
        const ib = idx[b] != null ? idx[b] : 9999;
        if (ia !== ib) return ia - ib;
        return String(a).localeCompare(String(b), 'fa');
      });
      return list;
    }
    function reorderSectionsByTitles(orderArr) {
      const order = (orderArr || []).map(function(x){ return String(x || '').trim(); }).filter(Boolean);
      if (!order.length) return;
      ['income', 'expense'].forEach(function(tab) {
        if (!periodData[tab] || !Array.isArray(periodData[tab].sections)) return;
        const secs = periodData[tab].sections;
        const byTitle = {};
        secs.forEach(function(s) {
          const t = (s.title || '').trim();
          if (t && !byTitle[t]) byTitle[t] = s;
        });
        const next = [];
        const used = {};
        order.forEach(function(t) {
          if (byTitle[t] && !used[t]) { next.push(byTitle[t]); used[t] = true; }
        });
        secs.forEach(function(s) {
          const t = (s.title || '').trim();
          if (t && !used[t]) { next.push(s); used[t] = true; }
        });
        periodData[tab].sections = next;
      });
    }
    function applyPersonCardOrder(orderArr, opts) {
      opts = opts || {};
      const titles = allPersonTitlesRaw();
      let sorted = sortTitlesByOrder(titles, orderArr);
      titles.forEach(function(t) {
        if (sorted.indexOf(t) < 0) sorted.push(t);
      });
      reorderSectionsByTitles(sorted);
      try { periodData.personCardOrder = sorted.slice(); } catch (e) {}
      saveGlobalCardOrder(sorted);
      try { if (typeof persistCurrent === 'function') persistCurrent(); } catch (e2) {}
      if (!opts.silent) {
        try { renderHomeCards(); } catch (e3) {}
      }
      return sorted;
    }
    function syncCardOrderForPeriod() {
      try {
        let order = null;
        if (periodData && Array.isArray(periodData.personCardOrder) && periodData.personCardOrder.length) {
          order = periodData.personCardOrder.slice();
        }
        if (!order || !order.length) {
          try {
            const p = (typeof prevYearMonth === 'function') ? prevYearMonth(currentYear, currentMonth) : null;
            if (p && p.y) {
              const prev = archive[periodKey(p.y, p.m)];
              if (prev && Array.isArray(prev.personCardOrder) && prev.personCardOrder.length) {
                order = prev.personCardOrder.slice();
              }
            }
          } catch (eP) {}
        }
        if (!order || !order.length) order = loadGlobalCardOrder();
        if (!order || !order.length) return;
        applyPersonCardOrder(order, { silent: true });
      } catch (e) {}
    }

    let _cardReorderActive = false;
    let _cardReorderOrder = [];
    let _cardReorderDrag = null;

    function closeCardReorderMode() {
      _cardReorderActive = false;
      _cardReorderDrag = null;
      try { document.body.classList.remove('card-reorder-mode'); } catch (e) {}
      const ov = document.getElementById('cardReorderOverlay');
      if (ov) ov.setAttribute('aria-hidden', 'true');
    }
    function commitCardReorderMode() {
      if (_cardReorderOrder && _cardReorderOrder.length) {
        applyPersonCardOrder(_cardReorderOrder, { silent: false });
      }
      closeCardReorderMode();
    }
    /* ——— جابه‌جایی کارت‌ها: کشیدن نمونهٔ کوچک؛ DOM حین کشیدن بازسازی نمی‌شود، RTL هم درست کار می‌کند ——— */
    function croReadOrderFromDom(strip) {
      return Array.prototype.map.call(strip.children, function (c) { return c.dataset.title; });
    }
    function croPlace() {
      const d = _cardReorderDrag;
      if (!d || !d.el || !d.el.parentNode) return;
      const el = d.el, strip = el.parentNode;
      el.style.transform = '';
      let r = el.getBoundingClientRect();
      const center = (d.x - d.grab) + r.width / 2;
      const rtl = getComputedStyle(strip).direction === 'rtl';
      const others = Array.prototype.filter.call(strip.children, function (c) { return c !== el; });
      let before = 0; /* چند کارت از نظر بصری سمت چپِ مرکز کارتِ در حال کشیدن‌اند */
      others.forEach(function (o) {
        const or = o.getBoundingClientRect();
        if (or.left + or.width / 2 < center) before++;
      });
      const targetIdx = rtl ? (others.length - before) : before;
      const curIdx = Array.prototype.indexOf.call(strip.children, el);
      if (targetIdx !== curIdx) {
        strip.insertBefore(el, others[targetIdx] || null);
        _cardReorderOrder = croReadOrderFromDom(strip);
        r = el.getBoundingClientRect();
      }
      const dx = (d.x - d.grab) - r.left;
      el.style.transform = 'translateX(' + dx + 'px) scale(1.08)';
    }
    function croEdgeLoop() {
      const d = _cardReorderDrag;
      if (!d || !d.el || !d.el.parentNode) return;
      const strip = d.el.parentNode;
      const sr = strip.getBoundingClientRect();
      const edge = 56;
      let v = 0;
      if (d.x < sr.left + edge) v = -Math.ceil((sr.left + edge - d.x) / 5);
      else if (d.x > sr.right - edge) v = Math.ceil((d.x - (sr.right - edge)) / 5);
      if (v) { strip.scrollLeft += v; croPlace(); }
      d.raf = requestAnimationFrame(croEdgeLoop);
    }
    function croEndDrag() {
      const d = _cardReorderDrag;
      if (!d) return;
      try { cancelAnimationFrame(d.raf); } catch (e) {}
      const el = d.el;
      if (el) {
        el.classList.remove('dragging');
        el.style.transform = '';
        try { el.releasePointerCapture(d.pid); } catch (e2) {}
        if (el.parentNode) {
          el.parentNode.classList.remove('cro-dragging');
          _cardReorderOrder = croReadOrderFromDom(el.parentNode);
        }
      }
      _cardReorderDrag = null;
    }
    function buildCardReorderStrip() {
      const strip = document.getElementById('cardReorderStrip');
      if (!strip) return;
      strip.innerHTML = '';
      _cardReorderOrder.forEach(function (title) {
        const el = document.createElement('div');
        el.className = 'cro-mini';
        el.dataset.title = title;
        el.textContent = title;
        /* کشیدن سریع = اسکرول نوار؛ نگه‌داشتن کوتاه (۲۲۰ms) روی کارت کوچک = برداشتن و جابه‌جایی */
        el.addEventListener('pointerdown', function (ev) {
          if (!_cardReorderActive || _cardReorderDrag) return;
          if (ev.button != null && ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          const pid = ev.pointerId, sx = ev.clientX, sy = ev.clientY, s0 = strip.scrollLeft;
          let mode = 'wait', timer = 0, samples = [{ t: performance.now(), x: sx }];
          const startDrag = function (x) {
            mode = 'drag';
            const r0 = el.getBoundingClientRect();
            _cardReorderDrag = { el: el, pid: pid, grab: sx - r0.left, x: x, raf: 0 };
            el.classList.add('dragging', 'selected');
            strip.classList.add('cro-dragging');
            Array.prototype.forEach.call(strip.children, function (m) { if (m !== el) m.classList.remove('selected'); });
            try { window.appHaptic(15); } catch (eH) {}
            croPlace();
            _cardReorderDrag.raf = requestAnimationFrame(croEdgeLoop);
          };
          timer = setTimeout(function () { if (mode === 'wait') startDrag(sx); }, 220);
          /* حرکت/رهاکردن روی window دنبال می‌شود (جابه‌جایی DOM حین کشیدن capture را نمی‌اندازد) */
          const onMove = function (e2) {
            if (e2.pointerId !== pid) return;
            if (mode === 'wait') {
              if (Math.abs(e2.clientX - sx) > 8 || Math.abs(e2.clientY - sy) > 8) { clearTimeout(timer); mode = 'scroll'; strip.classList.add('cro-dragging'); }
              else return;
            }
            if (mode === 'scroll') {
              strip.scrollLeft = s0 - (e2.clientX - sx);
              samples.push({ t: performance.now(), x: e2.clientX });
              if (samples.length > 6) samples.shift();
              return;
            }
            const d = _cardReorderDrag;
            if (!d || d.el !== el) return;
            d.x = e2.clientX;
            croPlace();
          };
          const onUp = function (e3) {
            if (e3.pointerId !== pid) return;
            clearTimeout(timer);
            window.removeEventListener('pointermove', onMove, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            if (mode === 'scroll') {
              /* کمی سُرخوردن پس از رها کردن */
              const a0 = samples[0], z = samples[samples.length - 1];
              let v = (z.t - a0.t) > 0 ? (z.x - a0.x) / (z.t - a0.t) : 0;
              const glide = function () {
                if (Math.abs(v) < 0.02) { strip.classList.remove('cro-dragging'); return; }
                strip.scrollLeft -= v * 16;
                v *= 0.92;
                requestAnimationFrame(glide);
              };
              requestAnimationFrame(glide);
              return;
            }
            if (mode === 'wait') {
              /* لمس کوتاه: فقط انتخاب */
              Array.prototype.forEach.call(strip.children, function (m) { m.classList.toggle('selected', m === el); });
              return;
            }
            const d = _cardReorderDrag;
            if (d && d.el === el) croEndDrag();
          };
          window.addEventListener('pointermove', onMove, true);
          window.addEventListener('pointerup', onUp, true);
          window.addEventListener('pointercancel', onUp, true);
        });
        strip.appendChild(el);
      });
    }
    function openCardReorderMode(focusTitle) {
      try {
        _cardReorderOrder = allPersonTitles().slice();
        if (!_cardReorderOrder.length) return;
        _cardReorderActive = true;
        document.body.classList.add('card-reorder-mode');
        const ov = document.getElementById('cardReorderOverlay');
        if (ov) ov.setAttribute('aria-hidden', 'false');
        buildCardReorderStrip();
        bindCardReorderChrome();
        if (focusTitle) {
          const strip = document.getElementById('cardReorderStrip');
          const sel = CSS && CSS.escape ? CSS.escape(focusTitle) : String(focusTitle).replace(/"/g, '');
          const el = strip && strip.querySelector('.cro-mini[data-title="' + sel + '"]');
          if (el) {
            el.classList.add('selected');
            try { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (eS) {}
          }
        }
      } catch (e) {}
    }
    function bindCardReorderChrome() {
      const btn = document.getElementById('cardReorderDone');
      if (btn && !btn._croBound) {
        btn._croBound = true;
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          commitCardReorderMode();
        });
      }
    }
    function allPersonTitles() {
      const raw = allPersonTitlesRaw();
      let order = null;
      try {
        if (periodData && Array.isArray(periodData.personCardOrder) && periodData.personCardOrder.length) {
          order = periodData.personCardOrder;
        }
      } catch (e) {}
      if (!order || !order.length) order = loadGlobalCardOrder();
      /* ۱.۳.۴۶: نرم‌افزار تک‌کاربره: همیشه فقط یک کارت (کارت اصلی) */
      const sorted = sortTitlesByOrder(raw, order);
      if (sorted.length <= 1) return sorted;
      const mt = hkMainTitle(), nm = hkSingleNorm(mt);
      const hit = sorted.find(function (t) { return hkSingleNorm(t) === nm; });
      return [hit || sorted[0]];
    }
    /* ===== ۱.۳.۴۶: یک کارت؛ بخش‌های دیگر (نام قدیمی، «s1»، بی‌نام، «ي/ی» متفاوت) در همان کارت اصلی ادغام می‌شوند ===== */
    function hkSingleNorm(t) { return String(t || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c\u200e\u200f\u00a0]+/g, ''); }
    function hkSingleBad(t) { t = String(t || '').trim(); return !t || /^s\d+(_[a-z0-9]+)*$/i.test(t); }
    function hkMainTitle() {
      var st = ''; try { st = (localStorage.getItem(STORAGE_KEY + '_mainCard') || '').trim(); } catch (e) {}
      var dflt = hkSingleNorm('نام کاربر');
      if (st && !hkSingleBad(st) && hkSingleNorm(st) !== dflt) return st;
      var pick = function (list) {
        list = list.filter(function (t) { return !hkSingleBad(t); });
        return list.filter(function (t) { return hkSingleNorm(t) !== dflt; })[0] || list[0] || '';
      };
      var order = (periodData && Array.isArray(periodData.personCardOrder) && periodData.personCardOrder.length) ? periodData.personCardOrder : loadGlobalCardOrder();
      var t = pick(sortTitlesByOrder(allPersonTitlesRaw(), order));
      if (!t || hkSingleNorm(t) === dflt) {
        var arch = [];
        try { Object.keys(archive || {}).sort().reverse().forEach(function (k) { var pd = archive[k]; ['income', 'expense'].forEach(function (tab) { ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (s2) { var tt = (s2 && s2.title || '').trim(); if (tt && arch.indexOf(tt) < 0) arch.push(tt); }); }); }); } catch (eA) {}
        var t2 = pick(arch);
        if (t2 && (!t || hkSingleNorm(t2) !== dflt)) t = t2;
      }
      return t || 'نام کاربر';
    }
    function hkSingleCardMergePd(pd, main) {
      if (!pd) return false;
      var changed = false, nm = hkSingleNorm(main);
      var real = function (r) { return r && (r.desc || Number(r.amount) || r.day || (Array.isArray(r.att) && r.att.length) || r.fromRecurringId || r.fromPlanId); };
      ['income', 'expense'].forEach(function (tab) {
        var b = pd[tab]; if (!b || !Array.isArray(b.sections) || !b.sections.length) return;
        var secs = b.sections.filter(Boolean);
        var ms = secs.find(function (x) { return hkSingleNorm(x.title) === nm; }) || secs.find(function (x) { return !hkSingleBad(x.title); }) || secs[0];
        if ((ms.title || '') !== main) { ms.title = main; changed = true; }
        if (!Array.isArray(ms.rows)) ms.rows = [];
        if (secs.length > 1 || b.sections.length !== secs.length) {
          /* ردیف تکراری (همان شناسه، یا همان روز/ساعت/مبلغ/شرح/حساب) دوباره اضافه نمی‌شود؛ مثلاً افزودن دوبارهٔ پشتیبانی که چند کارت داشت */
          var sig = function (r) { return [r.day || '', r.time || '', Number(r.amount) || 0, (r.desc || '').trim(), (r.account || '').trim(), r.status || ''].join('|'); };
          var seenId = {}, seenSig = {};
          ms.rows.forEach(function (r) { if (!r) return; if (r.id) seenId[r.id] = 1; seenSig[sig(r)] = 1; });
          secs.forEach(function (x) { if (x === ms) return; (x.rows || []).forEach(function (r) {
            if (!real(r)) return;
            if ((r.id && seenId[r.id]) || seenSig[sig(r)]) return;
            if (r.id) seenId[r.id] = 1; seenSig[sig(r)] = 1;
            ms.rows.push(r);
          }); });
          b.sections = [ms]; changed = true;
          var rr = ms.rows.filter(real);
          ms.rows = rr.length ? rr : [emptyRow(tab)];
          ms.rows.sort(function (a, c) { var da = parseInt(a.day, 10) || 99, dc = parseInt(c.day, 10) || 99; return da - dc; });
        }
        if (!ms.rows.length) ms.rows = [emptyRow(tab)];
      });
      if (Array.isArray(pd.personCardOrder) && (pd.personCardOrder.length !== 1 || pd.personCardOrder[0] !== main)) { pd.personCardOrder = [main]; changed = true; }
      return changed;
    }
    function hkSingleCardNormalizeAll(persist) {
      if (persist === undefined) persist = true;
      try {
        var main = hkMainTitle();
        try { if (persist && localStorage.getItem(STORAGE_KEY + '_mainCard') !== main && (allPersonTitlesRaw().length || Object.keys(archive || {}).length)) localStorage.setItem(STORAGE_KEY + '_mainCard', main); } catch (eS) {}
        var ch = hkSingleCardMergePd(periodData, main);
        Object.keys(archive || {}).forEach(function (k) { if (hkSingleCardMergePd(archive[k], main)) ch = true; });
        var curInc = ((periodData.income && periodData.income.sections) || [])[0];
        (recurringIncomes || []).forEach(function (r) {
          if (!r || r.deletedAt) return;
          if ((r.sectionTitle || '') !== main) { r.sectionTitle = main; if (curInc) r.sectionId = curInc.id; ch = true; }
        });
        var curExp = ((periodData.expense && periodData.expense.sections) || [])[0];
        (plans || []).forEach(function (pl) {
          if (!pl) return;
          if ((pl.expenseSectionTitle || pl.expenseSectionId) && pl.expenseSectionTitle !== main) { pl.expenseSectionTitle = main; if (curExp) pl.expenseSectionId = curExp.id; ch = true; }
        });
        try { var go = loadGlobalCardOrder(); if (persist && (go.length > 1 || (go.length === 1 && go[0] !== main))) saveGlobalCardOrder([main]); } catch (eO) {}
        /* فقط بار اول و بعد از تغییر نام ذخیره؛ رسم‌های بعدی (مثلاً برگشت از بازیابی ناموفق) فقط در حافظه ادغام می‌کنند و ذخیرهٔ بعدی می‌نویسد */
        if (ch && persist) {
          try { persistCurrent(); } catch (e1) {}
          try { saveArchive(); } catch (e2) {}
          try { saveRecurring(); } catch (e3) {}
          try { scheduleSave(); } catch (e4) {}
        }
        return ch;
      } catch (e) { return false; }
    }
    function ensureDefaultPersonCard() {
      try {
        if (!window._hkSingleDone || allPersonTitlesRaw().length > 1 || ['income', 'expense'].some(function (tab) { return ((periodData[tab] && periodData[tab].sections) || []).some(function (x) { return x && hkSingleBad(x.title); }); })) {
          var _first = !window._hkSingleDone;
          window._hkSingleDone = true;
          hkSingleCardNormalizeAll(_first);
        }
      } catch (eN) {}
      try {
        if (allPersonTitles().length > 0) return;
        // فقط یک‌بار برای نصب تازه
        const flag = localStorage.getItem(STORAGE_KEY + '_defaultCard');
        if (flag === '1' && allPersonTitles().length > 0) return;
        ensurePersonSections(hkMainTitle());
        try { localStorage.setItem(STORAGE_KEY + '_defaultCard', '1'); } catch (e) {}
      } catch (e) {}
    }
    function personTotals(title) {
      const inc = findSectionByTitle('income', title);
      const exp = findSectionByTitle('expense', title);
      const ti = sectionPaidUnpaidTotal(inc || { rows: [] }, { personalIncomeOnly: true });
      const te = sectionPaidUnpaidTotal(exp || { rows: [] }, { personalExpenseOnly: true });
      /* موجودی آنی واحد: جمع موجودی همه حساب‌ها (مشترک بین کاربران) */
      let instant = 0;
      try {
        if (typeof sumGlobalAccountBalances === 'function') instant = sumGlobalAccountBalances() || 0;
        else if (typeof totalOpeningBalances === 'function') {
          instant = (ti.paid || 0) - (te.paid || 0) + (totalOpeningBalances() || 0);
        } else {
          instant = (ti.paid || 0) - (te.paid || 0);
        }
      } catch (eO) {
        instant = (ti.paid || 0) - (te.paid || 0);
      }
      return {
        incomeTotal: ti.total, incomePaid: ti.paid, incomeUnpaid: ti.unpaid,
        expenseTotal: te.total, expensePaid: te.paid, expenseUnpaid: te.unpaid,
        remain: ti.total - te.total,
        instant: instant
      };
    }
    /** موجودی آنی به تفکیک حساب برای یک کاربر */
    function prevYearMonth(y, m) {
      y = parseInt(y, 10) || 0;
      m = parseInt(m, 10) || 1;
      if (m <= 1) return { y: y - 1, m: 12 };
      return { y: y, m: m - 1 };
    }
    /** موجودی پایان ماه قبل از آرشیو (بدون وابستگی به periodData فعلی)
        اگر ماه قبل موجودی اول‌ماهِ ذخیره‌شده نداشت (مثلاً ماهی که فقط ردیف قسط خودکار داشت)، به‌جای برگشتن به
        «موجودی اولیهٔ بانک»، زنجیره تا ماه‌های قبل‌تر (حداکثر تا ماه ایجاد حساب) دنبال می‌شود. */
    function _hkAccCreationKey(lb) {
      var k = null;
      (selectedBankAccounts || []).forEach(function (a) {
        if (!a || k != null) return;
        var al = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
        if (al !== lb) return;
        var c = a.createdAt, y = c && parseInt(c.y, 10), m = c && parseInt(c.m, 10);
        k = (y && m) ? y * 100 + m : (currentYear * 100 + currentMonth);
      });
      return k == null ? (currentYear * 100 + currentMonth) : k;
    }
    function _hkMonthEndings(y, m, depth, memo) {
      var key = periodKey(y, m);
      if (memo[key]) return memo[key];
      var map = {};
      memo[key] = map;
      try {
        if (!y || y < 1300) return map;
        var isCur = (y === currentYear && m === currentMonth);
        var raw = isCur ? periodData : archive[key];
        var openMap = (raw && raw.accountOpeningInstant && typeof raw.accountOpeningInstant === 'object') ? raw.accountOpeningInstant : {};
        var labels = {};
        Object.keys(openMap).forEach(function (k) { if (k && isLiveAccountLabel(k)) labels[k] = true; });
        (selectedBankAccounts || []).forEach(function (a) {
          if (!a) return;
          var lb = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
          if (lb) labels[lb] = true;
        });
        var rowsSum = {};
        ['income', 'expense'].forEach(function (tab) {
          var sign = tab === 'income' ? 1 : -1;
          var side = raw && (raw[tab] || (tab === 'expense' && raw.sections ? { sections: raw.sections } : null));
          ((side && side.sections) || []).forEach(function (sec) {
            ((sec && sec.rows) || []).forEach(function (r) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              var acc = (r.account || '').trim();
              if (!acc) return;
              rowsSum[acc] = (rowsSum[acc] || 0) + sign * (Number(r.amount) || 0);
            });
          });
        });
        function bankOpen(lb) {
          var s2 = 0;
          (selectedBankAccounts || []).forEach(function (a) {
            if (!a) return;
            var al = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
            if (al === lb) s2 += Number(a.openingBalance) || 0;
          });
          return s2;
        }
        var prevMap = null;
        Object.keys(labels).forEach(function (lb) {
          var stored = (openMap[lb] != null && openMap[lb] !== '') ? (Number(openMap[lb]) || 0) : null;
          var opening;
          if (stored != null && (stored !== 0 || rowsSum[lb])) opening = stored;
          else if (y * 100 + m <= _hkAccCreationKey(lb) || depth >= 240) opening = stored != null ? stored : bankOpen(lb);
          else {
            if (!prevMap) { var p = prevYearMonth(y, m); prevMap = _hkMonthEndings(p.y, p.m, depth + 1, memo); }
            opening = (prevMap[lb] != null) ? prevMap[lb] : (stored != null ? stored : bankOpen(lb));
          }
          map[lb] = opening;
        });
        Object.keys(rowsSum).forEach(function (acc) { map[acc] = (map[acc] || 0) + rowsSum[acc]; });
      } catch (eM) {}
      return map;
    }
    function getPrevMonthAccountEndings() {
      try {
        var p = prevYearMonth(currentYear, currentMonth);
        if (!p.y || p.y < 1300) return {};
        return _hkMonthEndings(p.y, p.m, 0, {});
      } catch (eP) { return {}; }
    }
    function getAccountOpeningBalance(label) {
      const lb = (label || '').trim();
      if (!lb) return 0;
      /* موجودی اولیه/انتقالی فقط متعلق به حساب‌های موجود است؛ برچسب بدون حساب (حذف/تغییرنام‌شده) = ۰.
         تراکنش‌های آن برچسب جداگانه و مستقیم در جمع می‌آیند */
      if (!isLiveAccountLabel(lb)) return 0;
      function bankFallback() {
        let sum = 0;
        (selectedBankAccounts || []).forEach(function(a) {
          if (!a) return;
          const al = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
          if (al === lb) sum += Number(a.openingBalance) || 0;
        });
        return sum;
      }
      function hasTxThisMonth() {
        try {
          var found = false;
          ['income', 'expense'].forEach(function(tab) {
            ((periodData[tab] && periodData[tab].sections) || []).forEach(function(sec) {
              (sec && sec.rows || []).forEach(function(r) {
                if (!r || (r.status || 'paid') !== 'paid') return;
                if ((r.account || '').trim() === lb && (Number(r.amount) || 0)) found = true;
              });
            });
          });
          return found;
        } catch (eT) { return false; }
      }
      var stored = null;
      try {
        const amap = (periodData && periodData.accountOpeningInstant) || {};
        if (amap[lb] != null && amap[lb] !== '') stored = Number(amap[lb]) || 0;
      } catch (e) {}
      var prevVal = null;
      try {
        const prev = getPrevMonthAccountEndings();
        if (prev && prev[lb] != null && prev[lb] !== '') prevVal = Number(prev[lb]) || 0;
      } catch (e2) {}
      /* ذخیره‌شده معتبر؛ صفرِ مشکوک بدون تراکنش ماه جاری → پایان ماه قبل */
      if (stored != null) {
        if (stored !== 0) return stored;
        if (prevVal != null && prevVal !== 0 && !hasTxThisMonth()) return prevVal;
        return stored;
      }
      if (prevVal != null) return prevVal;
      return bankFallback();
    }
    /* —— همگام‌سازی «موجودی اولیهٔ بانک» با موجودی‌های اول‌ماهِ ذخیره‌شده ——
       موجودی اول هر ماه (accountOpeningInstant) یک بار ذخیره می‌شود؛ قبلاً ویرایش موجودی اولیهٔ بانک
       روی آن‌ها اثری نداشت و دو عدد متفاوت «پنهانی» کنار هم می‌ماندند. حالا ویرایش، ماه ایجاد حساب و
       ماه‌های بعد را با همان اختلاف جابه‌جا می‌کند — فقط بعد از نمایش دقیق تغییرات و تأیید کاربر. */
    function _openingPdOf(k) {
      var cur = periodKey(currentYear, currentMonth);
      return k === cur ? periodData : (archive && archive[k]);
    }
    function accountCreationYM(acc) {
      var c = acc && acc.createdAt;
      var y = c && parseInt(c.y, 10), m = c && parseInt(c.m, 10);
      if (!y || !m) { y = currentYear; m = currentMonth; }
      return { y: y, m: m };
    }
    /** مقدار ذخیره‌شدهٔ موجودی اول ماه ایجاد حساب (یا null) */
    function storedCreationOpening(acc, label) {
      try {
        var c = accountCreationYM(acc); var pd = _openingPdOf(periodKey(c.y, c.m));
        var v = pd && pd.accountOpeningInstant ? pd.accountOpeningInstant[label] : null;
        if (v == null || v === '') return null;
        return Number(v) || 0;
      } catch (e) { return null; }
    }
    function planAccountOpeningSync(acc, label, newVal) {
      var c = accountCreationYM(acc), ck = periodKey(c.y, c.m), startKey = c.y * 100 + c.m;
      var stored = storedCreationOpening(acc, label);
      var base = stored != null ? stored : (Number(acc && acc.openingBalance) || 0);
      var delta = (Number(newVal) || 0) - base;
      var plan = { delta: delta, changes: [], ck: ck, y: c.y, m: c.m };
      if (!delta) return plan;
      var cur = periodKey(currentYear, currentMonth);
      var keys = Object.keys(archive || {}); if (keys.indexOf(cur) < 0) keys.push(cur);
      keys.forEach(function (k) {
        var pr = String(k).split('-'), y = parseInt(pr[0], 10), m = parseInt(pr[1], 10);
        if (!y || !m || y * 100 + m < startKey) return;
        var pd = _openingPdOf(k); if (!pd || !pd.accountOpeningInstant) return;
        var v = pd.accountOpeningInstant[label]; if (v == null || v === '') return;
        var from = Number(v) || 0;
        plan.changes.push({ k: k, y: y, m: m, from: from, to: k === ck ? (Number(newVal) || 0) : from + delta });
      });
      plan.changes.sort(function (a, b) { return (a.y * 100 + a.m) - (b.y * 100 + b.m); });
      return plan;
    }
    function applyAccountOpeningSync(label, plan) {
      if (!plan || !plan.changes || !plan.changes.length) return;
      var cur = periodKey(currentYear, currentMonth), touchedCur = false;
      plan.changes.forEach(function (ch) {
        var pd = _openingPdOf(ch.k); if (!pd) return;
        if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
        pd.accountOpeningInstant[label] = ch.to;
        if (ch.k === cur) touchedCur = true;
      });
      try { if (touchedCur) persistCurrent(); } catch (e1) {}
      try { saveArchive(); } catch (e2) {}
    }
    /** ورودی/خروجی پرداخت‌شدهٔ ماه جاری برای یک حساب (فقط نمایش) */
    function accountMonthFlow(label) {
      var inc = 0, exp = 0;
      try {
        ['income', 'expense'].forEach(function (tab) {
          ((periodData && periodData[tab] && periodData[tab].sections) || []).forEach(function (sec) {
            (sec && sec.rows || []).forEach(function (r) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              if ((r.account || '').trim() !== label) return;
              var a = Number(r.amount) || 0; if (tab === 'income') inc += a; else exp += a;
            });
          });
        });
      } catch (e) {}
      return { inc: inc, exp: exp };
    }
    function totalOpeningBalances() {
      let s = 0;
      (selectedBankAccounts || []).forEach(function(a) {
        s += Number(a && a.openingBalance) || 0;
      });
      return s;
    }
    /* ماه نمایش‌داده‌شده بعد از ماه جاری است؟ موجودی چنین ماهی هنوز معلوم نیست و «—» نشان داده می‌شود */
    function hkIsFutureView() {
      try { var t = getTodayPersian(); return (currentYear * 100 + currentMonth) > (t.y * 100 + t.m); } catch (e) { return false; }
    }
    function globalAccountBalances() {
      const map = {};
      function addAll(tab, sign) {
        const secs = (periodData && periodData[tab] && periodData[tab].sections) || [];
        secs.forEach(function(sec) {
          (sec && sec.rows || []).forEach(function(r) {
            if ((r.status || 'paid') !== 'paid') return;
            const acc0 = (r.account || '').trim();
            /* ردیف‌های حسابِ حذف‌شده (کاربر «حذف حساب، نگه‌داشتن ردیف‌ها» را زده) در موجودی حساب نمی‌شوند */
            if (acc0 && typeof isLiveAccountLabel === 'function' && !isLiveAccountLabel(acc0)) return;
            const acc = acc0 || 'بدون حساب';
            const amt = Number(r.amount) || 0;
            map[acc] = (map[acc] || 0) + sign * amt;
          });
        });
      }
      addAll('income', 1);
      addAll('expense', -1);
      const labels = {};
      Object.keys(map).forEach(function(k) { labels[k] = true; });
      (selectedBankAccounts || []).forEach(function(a) {
        if (!a) return;
        const lb = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
        if (lb) labels[lb] = true;
      });
      try {
        const amap = (periodData && periodData.accountOpeningInstant) || {};
        Object.keys(amap).forEach(function(k) { if (k && isLiveAccountLabel(k)) labels[k] = true; });
      } catch (eA) {}
      Object.keys(labels).forEach(function(lb) {
        map[lb] = (map[lb] || 0) + (getAccountOpeningBalance(lb) || 0);
      });
      return map;
    }
    /* ۱.۳.۹۹: «مانده» بعد از هر تراکنش یک حساب در ماهِ باز: موجودی اول ماه + ردیف‌های پرداخت‌شده به ترتیب روز، ساعت و زمان ثبت.
       خروجی: Map(row → مانده بعد از همان ردیف)؛ ردیف‌های پرداخت‌نشده و حساب‌های حذف‌شده حساب نمی‌شوند (همان قاعدهٔ globalAccountBalances) */
    function hkAccountRunningBalances(acc) {
      var out = new Map(); acc = String(acc || '').trim(); if (!acc) return out;
      try { if (typeof isLiveAccountLabel === 'function' && !isLiveAccountLabel(acc)) return out; } catch (eL) {}
      var list = [], n = 0;
      [['income', 1], ['expense', -1]].forEach(function (t) {
        ((periodData && periodData[t[0]] && periodData[t[0]].sections) || []).forEach(function (sec) {
          (sec && sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || (r.status || 'paid') !== 'paid') return;
            if (String(r.account || '').trim() !== acc) return;
            list.push({ r: r, v: t[1] * (Number(r.amount) || 0), d: parseInt(r.day, 10) || 0, tm: String(r.time || ''), c: Number(r.createdAt) || 0, i: n++ });
          });
        });
      });
      list.sort(function (a, b) { return (a.d - b.d) || (a.tm && b.tm ? (a.tm < b.tm ? -1 : a.tm > b.tm ? 1 : 0) : 0) || (a.c - b.c) || (a.i - b.i); });
      var bal = Number(getAccountOpeningBalance(acc)) || 0;
      list.forEach(function (x) { bal += x.v; out.set(x.r, bal); });
      return out;
    }
    function hkRowBalanceAfter(row) { try { var m = hkAccountRunningBalances(row && row.account); return m.has(row) ? m.get(row) : null; } catch (e) { return null; } }
    function sumGlobalAccountBalances() {
      const map = globalAccountBalances();
      let s = 0;
      Object.keys(map).forEach(function(k) { s += Number(map[k]) || 0; });
      return s;
    }
    /** موجودی ماه قبل (افتتاحیه) برای یک حساب یا مجموع همه حساب‌ها */
    function sumFilteredOpeningBalance(accFilter) {
      accFilter = (accFilter || '').trim();
      try {
        if (accFilter) {
          return (typeof getAccountOpeningBalance === 'function')
            ? (Number(getAccountOpeningBalance(accFilter)) || 0)
            : 0;
        }
        const labels = {};
        (selectedBankAccounts || []).forEach(function(a) {
          if (!a) return;
          const lb = (typeof accountLabel === 'function') ? accountLabel(a) : (a.label || '');
          if (lb) labels[lb] = true;
        });
        try {
          const prev = (typeof getPrevMonthAccountEndings === 'function') ? getPrevMonthAccountEndings() : {};
          Object.keys(prev || {}).forEach(function(k) { if (k && isLiveAccountLabel(k)) labels[k] = true; });
        } catch (e0) {}
        try {
          const amap = (periodData && periodData.accountOpeningInstant) || {};
          Object.keys(amap).forEach(function(k) { if (k && isLiveAccountLabel(k)) labels[k] = true; });
        } catch (e1) {}
        let s = 0;
        Object.keys(labels).forEach(function(lb) {
          s += (typeof getAccountOpeningBalance === 'function')
            ? (Number(getAccountOpeningBalance(lb)) || 0)
            : 0;
        });
        return s;
      } catch (e) { return 0; }
    }
    /* سازگاری: موجودی حساب‌ها مشترک بین همه کاربران */
    function personAccountBalances(title) {
      return globalAccountBalances();
    }

    let _instantBalOpen = false;
    /* پروژه‌های فعال روی یک حساب (موجودی یا طلب/بدهی غیرصفر) با رنگ هر پروژه — برای نقطه‌های کنار حساب در موجودی آنی و ویجت */
    function hkAccountProjectColors(acc) {
      var out = [];
      try {
        if (typeof loadFinancialSubjects !== 'function') return out;
        var set = new Set([acc]);
        loadFinancialSubjects().forEach(function (s) {
          if (!s || !s.id || s.id === 'personal') return;
          var r = 0, c = 0;
          /* ۱.۳.۵۴: پروژه‌هایی که تا همین ماه روی این حساب حساب باز (تسویه‌نشده) دارند */
          var mk = '<=' + periodKey(currentYear, currentMonth);
          try { r = Number(projectReceivableOnAccounts(s.id, set, mk)) || 0; } catch (e1) {}
          try { c = typeof projectMoneyOnAccounts === 'function' ? (Number(projectMoneyOnAccounts(s.id, set, mk)) || 0) : 0; } catch (e2) {}
          if (Math.abs(r) <= 0.5 && Math.abs(c) <= 0.5) return;
          var col = '#d000ff';
          try { var meta = getProjectHighlightMeta(s.highlightColor); if (meta && meta.accent) col = meta.accent; } catch (e3) {}
          out.push(col);
        });
      } catch (e) {}
      return out;
    }
    /* نشان پروژه: فقط نقطه(های) رنگ پروژه؛ مبلغ با تیک زدن حساب در تفکیک پایین دیده می‌شود */
    /* رنگ به‌صورت #rrggbb برای ویجت (رنگ‌های پروژه ممکن است کوتاه یا rgb باشند) */
    function hkHexColor(c) {
      c = String(c || '').trim();
      var m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c); if (m3) return '#' + m3[1] + m3[1] + m3[2] + m3[2] + m3[3] + m3[3];
      if (/^#[0-9a-f]{6}$/i.test(c)) return c;
      var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
      if (m) return '#' + [m[1], m[2], m[3]].map(function (x) { return ('0' + (parseInt(x, 10) & 255).toString(16)).slice(-2); }).join('');
      return '';
    }
    function ibProjectBadge(acc) {
      var cols = hkAccountProjectColors(acc);
      if (!cols.length) return '';
      return '<span class="ib-proj-dots" aria-label="پروژه">' + cols.map(function (c) { return '<i style="background:' + escapeHtml(c) + '"></i>'; }).join('') + '</span>';
    }

