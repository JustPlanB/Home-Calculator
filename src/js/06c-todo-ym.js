    /* ===== کارهای من (to-do) در باکس هوشمند — جدا برای هر کارت ===== */
    var TODO_KEY = STORAGE_KEY + '_todos';
    /* ساختار: { کارت: { «سال-ماه»: [ {id, items:[{t, done}]} ] } } — هر فهرست یک اسلاید، فقط در همان ماه */
    function todoYm() { return periodKey(currentYear, currentMonth); }
    function loadTodoMap() {
      try { var m = JSON.parse(localStorage.getItem(TODO_KEY) || '{}'); return (m && typeof m === 'object') ? m : {}; } catch (e) { return {}; }
    }
    /* تاریخ ساخت فهرست کارها: « (۲۱ مهر)» — از زمان ذخیره‌شده یا شناسهٔ فهرست (l + زمان به مبنای ۳۶) */
    function hkTodoDateLabel(l) {
      try {
        var ts = Number(l && l.at) || 0;
        if (!ts && l && /^l[0-9a-z]{8}/.test(l.id || '')) ts = parseInt(l.id.slice(1, 9), 36) || 0;
        if (!(ts > 1e12)) return '';
        var j = hkJalaliOfTs(ts);
        return ' (' + toPersianDigits(String(j.d)) + ' ' + MONTHS[j.m - 1] + ')';
      } catch (e) { return ''; }
    }
    function loadTodoLists(title) {
      var m = loadTodoMap(), k = (title || '').trim(), v = m[k];
      /* نسخهٔ قبلی (یک فهرست بدون ماه) → فهرستِ ماه جاری */
      if (Array.isArray(v)) { var o = {}; o[todoYm()] = v.length ? [{ id: 'l' + Date.now().toString(36), items: v }] : []; v = o; m[k] = v; try { localStorage.setItem(TODO_KEY, JSON.stringify(m)); } catch (e0) {} }
      var lists = (v && Array.isArray(v[todoYm()])) ? v[todoYm()] : [];
      return lists.filter(function (l) { return l && l.id && ((Array.isArray(l.items) && l.items.length) || (Array.isArray(l.ink) && l.ink.length)); });
    }
    function saveTodoList(title, id, items) {
      try {
        var m = loadTodoMap(), k = (title || '').trim(), ym = todoYm();
        if (!m[k] || Array.isArray(m[k])) { loadTodoLists(k); m = loadTodoMap(); }
        if (!m[k] || typeof m[k] !== 'object') m[k] = {};
        var lists = Array.isArray(m[k][ym]) ? m[k][ym] : [];
        var at = -1;
        lists.forEach(function (l, i) { if (l && l.id === id) at = i; });
        if (items && items.length) {
          if (at >= 0) lists[at].items = items; else lists.push({ id: id, items: items, at: Date.now() });
        } else if (at >= 0) lists.splice(at, 1);
        if (lists.length) m[k][ym] = lists; else delete m[k][ym];
        if (!Object.keys(m[k]).length) delete m[k];
        return hkStorageSet(TODO_KEY, JSON.stringify(m));
      } catch (e) { hkPersistFailed(TODO_KEY, e); return false; }
    }
    function loadTodos(title, id) {
      var l = loadTodoLists(title).filter(function (x) { return x.id === id; })[0];
      return l ? l.items : [];
    }
    /* اسلاید خالی: فقط یک + آبی */
    function spPageTodoAdd() {
      return '<div class="sp-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></div>';
    }
    /* هر فهرستِ ثبت‌شده در این ماه = یک اسلاید جدا (لمس = ویرایش همان فهرست) */
    function spPageTodo(D) {
      var lists = loadTodoLists(D.title);
      if (!lists.length) return null;
      return lists.map(function (l) {
        /* ۱.۳.۶۹: یادداشت دست‌نویس: خط‌ها به‌صورت برداری، با رنگ همان تم کشیده می‌شوند */
        if (Array.isArray(l.ink)) return { key: 'todo-' + l.id, onTap: function (title) { openInkEditor(title, l.id); },
          html: spHead('یادداشت' + hkTodoDateLabel(l)) + '<div class="sp-ink">' + hkInkSvg(l.ink) + '</div>' };
        return {
          key: 'todo-' + l.id,
          onTap: function (title) { openTodoEditor(title, l.id); },
          /* انجام‌نشده‌ها بالا، انجام‌شده‌ها پایین (ترتیب داخل هر گروه همان ترتیب نوشتن) */
          html: spHead('کارهای من' + hkTodoDateLabel(l)) + spItems(l.items.filter(function (x) { return !x.done; }).concat(l.items.filter(function (x) { return x.done; })).map(function (x) {
            return '<div class="sp-todo' + (x.done ? ' done' : '') + '"><i></i><span>' + spEsc(x.t) + '</span></div>';
          }))
        };
      });
    }
    function refreshSmartPanelsFor(title, focusKey) {
      var t = (title || '').trim();
      try {
        var st = _smartPanelState[t];
        if (st && focusKey) { st.key = focusKey; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; }
        document.querySelectorAll('#homeSmartBox .pc-smart-box, #homeCards .person-card:not(.hc-clone) .pc-smart-box').forEach(function (el) {
          if ((el._spTitle || '').trim() === t) { mountSmartPanel(el, t); try { fitSmartPanel(el); } catch (eF) {} }
        });
      } catch (e) {}
    }
    function closeTodoEditor() {
      var ov = document.getElementById('todoEditorOverlay');
      if (!ov) return;
      try { if (ov._kbOff) ov._kbOff(); } catch (e) {}
      ov.classList.remove('open');
      setTimeout(function () { try { ov.remove(); } catch (e) {} }, 200);
    }
    /* listId خالی = فهرست تازه (از اسلاید +)؛ در غیر این صورت ویرایش همان فهرست */
    function openTodoEditor(title, listId) {
      closeTodoEditor();
      var t = (title || '').trim();
      var id = listId || ('l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var list = (listId ? loadTodos(t, listId) : []).map(function (x) { return { t: x.t, done: !!x.done }; });
      list = list.filter(function (x) { return !x.done; }).concat(list.filter(function (x) { return x.done; }));
      var ov = document.createElement('div');
      ov.id = 'todoEditorOverlay';
      ov.className = 'todo-overlay';
      ov.innerHTML = '<div class="todo-box" role="dialog" aria-label="کارهای من">' +
        '<div class="todo-title">کارهای من</div>' +
        '<div class="todo-list"></div>' +
        '<div class="todo-new"><input type="text" class="todo-input" maxlength="120" placeholder="کار جدید…" enterkeyhint="done">' +
        '<button type="button" class="todo-add" aria-label="افزودن"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
        '<div class="todo-actions"><button type="button" class="todo-cancel">انصراف</button><button type="button" class="todo-save">ثبت</button></div>' +
        '</div>';
      document.body.appendChild(ov);
      var box = ov.querySelector('.todo-box'), lst = ov.querySelector('.todo-list'), inp = ov.querySelector('.todo-input');
      /* تیک خوردن: کار انجام‌شده نرم به پایین فهرست می‌رود و انجام‌نشده‌ها بالا می‌مانند (FLIP) */
      function toggle(x) {
        x.done = !x.done;
        var tops = new Map();
        lst.querySelectorAll('.todo-row').forEach(function (r) { if (r._item) tops.set(r._item, r.getBoundingClientRect().top); });
        var undone = list.filter(function (y) { return !y.done; }), done = list.filter(function (y) { return y.done; });
        list.length = 0; Array.prototype.push.apply(list, undone.concat(done));
        draw();
        lst.querySelectorAll('.todo-row').forEach(function (r) {
          var t0 = tops.get(r._item); if (t0 == null || !r.animate) return;
          var dy = t0 - r.getBoundingClientRect().top;
          if (Math.abs(dy) > 1) r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
        });
      }
      function draw() {
        lst.innerHTML = '';
        if (!list.length) { lst.innerHTML = '<div class="todo-empty">هنوز کاری ننوشته‌ای</div>'; return; }
        list.forEach(function (x, i) {
          var row = document.createElement('div');
          row.className = 'todo-row' + (x.done ? ' done' : '');
          row.innerHTML = '<button type="button" class="todo-check" aria-label="انجام شد"></button><span class="todo-text"></span><button type="button" class="todo-del" aria-label="حذف">×</button>';
          row.querySelector('.todo-text').textContent = x.t;
          row._item = x;
          row.querySelector('.todo-check').onclick = function () { toggle(x); };
          row.querySelector('.todo-text').onclick = function () { toggle(x); };
          row.querySelector('.todo-del').onclick = function () { list.splice(i, 1); draw(); };
          lst.appendChild(row);
        });
      }
      function addFromInput() {
        var v = (inp.value || '').trim();
        if (!v) return false;
        list.push({ t: v, done: false });
        inp.value = '';
        draw();
        lst.scrollTop = lst.scrollHeight;
        return true;
      }
      draw();
      ov.querySelector('.todo-add').onclick = function () { addFromInput(); try { inp.focus(); } catch (e) {} };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFromInput(); } });
      ov.querySelector('.todo-cancel').onclick = closeTodoEditor;
      ov.querySelector('.todo-save').onclick = function () {
        addFromInput();   /* متنِ نوشته‌شده‌ای که هنوز + نخورده هم ثبت شود */
        saveTodoList(t, id, list);
        closeTodoEditor();
        refreshSmartPanelsFor(t, list.length ? ('todo-' + id) : 'todoAdd');
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) closeTodoEditor(); });
      try { ov._kbOff = attachKeyboardLift(box); } catch (eK) {}
      requestAnimationFrame(function () { ov.classList.add('open'); });
    }
    try { window.openTodoEditor = openTodoEditor; window.closeTodoEditor = closeTodoEditor; } catch (eW) {}
    /* ===== ۱.۳.۶۹: اسلاید تازهٔ باکس هوشمند: «یادداشت دست‌نویس» (انگشت یا قلم) یا «فهرست کارها» ===== */
    function openTodoChooser(title) {
      var old = document.getElementById('hkTodoPick'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkTodoPick'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs hk-todo-pick'; ov.appendChild(box);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      box.innerHTML = '<div class="hk-prefs-t">اسلاید تازه</div>' +
        '<button type="button" class="hk-tp-opt" data-k="ink"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg><span>یادداشت دست‌نویس<small>با انگشت یا قلم بنویس یا بکش</small></span></button>' +
        '<button type="button" class="hk-tp-opt" data-k="todo"><svg viewBox="0 0 24 24"><path d="M4 6l2 2 3-3M4 13l2 2 3-3M12 7h8M12 14h8M12 20h8"/></svg><span>فهرست کارها<small>کارهایی که باید انجام بدی</small></span></button>' +
        '<button type="button" class="hk-tp-opt" data-k="remind"><svg viewBox="0 0 24 24"><path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.8 2H4.7zM10 20.5h4"/></svg><span>یادآور<small>کاری که باید در یک روز مشخص یادت بیاید</small></span></button>';
      box.querySelector('[data-k="ink"]').onclick = function () { close(); openInkEditor(title, null); };
      box.querySelector('[data-k="remind"]').onclick = function () { close(); try { openUserRemindersModal(); } catch (e) {} };
      box.querySelector('[data-k="todo"]').onclick = function () { close(); openTodoEditor(title, null); };
      document.body.appendChild(ov);
    }
    /* خط‌ها: [{c:'t'|'b'|'r', w, p:[[x,y],…]}] با مختصات ۰ تا ۱۰۰۰ (افقی) و ۰ تا ۶۲۰ (عمودی) */
    var HK_INK_W = 1000, HK_INK_H = 620;
    function hkInkColor(c) { return c === 'b' ? '#08b5f5' : c === 'r' ? 'var(--hk-expense, #ff6b4a)' : c === 'g' ? 'var(--hk-income, #9ee858)' : c === 'o' ? 'var(--hk-personal, #ff9f0a)' : c === 'y' ? 'var(--hk-warning, #ffc531)' : 'currentColor'; }
    function hkInkPath(pts) {
      if (!pts || !pts.length) return '';
      if (pts.length === 1) return 'M' + pts[0][0] + ' ' + pts[0][1] + 'l0.1 0';
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += 'Q' + pts[i][0] + ' ' + pts[i][1] + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1); }
      var l = pts[pts.length - 1]; return d + 'L' + l[0] + ' ' + l[1];
    }
    function hkInkSvg(strokes) {
      return '<svg viewBox="0 0 ' + HK_INK_W + ' ' + HK_INK_H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + (strokes || []).map(function (st) {
        return '<path d="' + hkInkPath(st.p) + '" fill="none" stroke="' + hkInkColor(st.c) + '" stroke-width="' + (st.w || 6) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      }).join('') + '</svg>';
    }
    function saveInkNote(title, id, strokes) {
      try {
        var m = loadTodoMap(), k = (title || '').trim(), ym = todoYm();
        if (!m[k] || Array.isArray(m[k])) { loadTodoLists(k); m = loadTodoMap(); }
        if (!m[k] || typeof m[k] !== 'object') m[k] = {};
        var lists = Array.isArray(m[k][ym]) ? m[k][ym] : [], at = -1;
        lists.forEach(function (l, i) { if (l && l.id === id) at = i; });
        if (strokes && strokes.length) { if (at >= 0) { lists[at].ink = strokes; delete lists[at].items; } else lists.push({ id: id, ink: strokes, at: Date.now() }); }
        else if (at >= 0) lists.splice(at, 1);
        if (lists.length) m[k][ym] = lists; else delete m[k][ym];
        if (!Object.keys(m[k]).length) delete m[k];
        return hkStorageSet(TODO_KEY, JSON.stringify(m));
      } catch (e) { hkPersistFailed(TODO_KEY, e); return false; }
    }
    function openInkEditor(title, noteId) {
      var t = (title || '').trim();
      var id = noteId || ('n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var cur = noteId ? (loadTodoLists(t).filter(function (x) { return x.id === noteId; })[0] || {}) : {};
      var strokes = Array.isArray(cur.ink) ? JSON.parse(JSON.stringify(cur.ink)) : [];
      var old = document.getElementById('hkInkEd'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkInkEd'; ov.className = 'todo-overlay hk-ink-ov'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="todo-box hk-ink-box" role="dialog" aria-label="یادداشت دست‌نویس">' +
        '<div class="todo-title">یادداشت دست‌نویس</div>' +
        '<div class="hk-ink-pad"><canvas></canvas><div class="hk-ink-hint">با انگشت یا قلم بنویس</div></div>' +
        '<div class="hk-ink-tools">' +
          '<div class="hk-ink-colors"><button type="button" data-c="t" class="on" aria-label="رنگ اصلی"><i></i></button><button type="button" data-c="b" aria-label="آبی"><i></i></button><button type="button" data-c="r" aria-label="قرمز"><i></i></button><button type="button" data-c="g" aria-label="سبز"><i></i></button><button type="button" data-c="o" aria-label="نارنجی"><i></i></button><button type="button" data-c="y" aria-label="زرد"><i></i></button></div>' +
          '<button type="button" class="hk-ink-undo" aria-label="برگشت یک قدم"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>' +
          /* ۱.۳.۷۰: پاک‌کن جای دکمهٔ «پاک کردن»: با کشیدن روی صفحه همان‌جا را پاک می‌کند */
          '<button type="button" class="hk-ink-eraser" aria-label="پاک‌کن" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M7 20h13"/><path d="M4.6 14.6l9.9-9.9a2 2 0 0 1 2.8 0l2.9 2.9a2 2 0 0 1 0 2.8L12 18.6a2 2 0 0 1-1.4.6H8.2a2 2 0 0 1-1.4-.6l-2.2-2.2a2 2 0 0 1 0-2.8z"/><path d="M9.5 9.7l5.6 5.6"/></svg></button>' +
        '</div>' +
        '<div class="todo-actions"><button type="button" class="todo-cancel">انصراف</button><button type="button" class="todo-save">ثبت</button></div></div>';
      document.body.appendChild(ov);
      var pad = ov.querySelector('.hk-ink-pad'), cv = pad.querySelector('canvas'), ctx2 = cv.getContext('2d'), hint = pad.querySelector('.hk-ink-hint');
      var color = 't', drawing = null, scale = 1, dpr = window.devicePixelRatio || 1;
      var cssVar = function (n, d) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; };
      var inkCol = function (c) { if (c === 't') return getComputedStyle(pad).color; if (c === 'b') return '#08b5f5'; if (c === 'g') return cssVar('--hk-income', '#9ee858'); if (c === 'o') return cssVar('--hk-personal', '#ff9f0a'); if (c === 'y') return cssVar('--hk-warning', '#ffc531'); return cssVar('--hk-expense', '#ff6b4a'); };
      /* پاک‌کن و «برگشت»: پیش از هر کشیدن/پاک کردن، یک نسخه از خط‌ها نگه داشته می‌شود */
      var erasing = false, erGest = null, erAt = null, hist = [], ER_R = 16;
      var snap = function () { hist.push(JSON.stringify(strokes)); if (hist.length > 60) hist.shift(); };
      /* نقطه‌های خط را آن‌قدر پرتراکم می‌کند که پاک‌کن از لای دو نقطهٔ دور رد نشود */
      var dense = function (pts) {
        var out = [pts[0]];
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 5);
          for (var k = 1; k <= n; k++) { var f = k / (n + 1), np = [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f)]; np.x = 1; out.push(np); }
          out.push(b);
        }
        return out;
      };
      /* از نقطه‌های کمکی فقط دو سرِ هر تکه می‌ماند تا حجم داده بزرگ نشود */
      var trim = function (seg) { return seg.filter(function (p, i) { return !p.x || i === 0 || i === seg.length - 1; }).map(function (p) { return [p[0], p[1]]; }); };
      /* هر خطی که از دایرهٔ پاک‌کن رد شود، همان تکه‌اش برداشته و بقیه‌اش به چند خط جدا شکسته می‌شود */
      var eraseAt = function (q) {
        var next = [], hit = false;
        strokes.forEach(function (st) {
          var r = ER_R + (st.w || 6) / 2, r2 = r * r, pts = st.p;
          var near = pts.some(function (p) { return Math.abs(p[0] - q[0]) <= r + 40 && Math.abs(p[1] - q[1]) <= r + 40; });
          if (!near) { next.push(st); return; }
          pts = dense(pts);
          var cur = [], cut = false;
          pts.forEach(function (p) {
            var dx = p[0] - q[0], dy = p[1] - q[1];
            if (dx * dx + dy * dy <= r2) { cut = true; if (cur.length) { next.push({ c: st.c, w: st.w, p: trim(cur) }); cur = []; } }
            else cur.push(p);
          });
          if (!cut) { next.push(st); return; }
          hit = true;
          if (cur.length) next.push({ c: st.c, w: st.w, p: trim(cur) });
        });
        if (hit) strokes = next;
      };
      var eraseLine = function (a, b) {
        var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / (ER_R * 0.6)));
        for (var k = 1; k <= n; k++) eraseAt([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      };
      var size = function () { var w = pad.clientWidth; cv.style.width = w + 'px'; cv.style.height = (w * HK_INK_H / HK_INK_W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * HK_INK_H / HK_INK_W * dpr); scale = cv.width / HK_INK_W; redraw(); };
      var drawStroke = function (st) {
        var pts = st.p; if (!pts.length) return;
        ctx2.strokeStyle = inkCol(st.c); ctx2.lineWidth = (st.w || 6) * scale; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
        ctx2.beginPath(); ctx2.moveTo(pts[0][0] * scale, pts[0][1] * scale);
        if (pts.length === 1) ctx2.lineTo(pts[0][0] * scale + 0.1, pts[0][1] * scale);
        for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx2.quadraticCurveTo(pts[i][0] * scale, pts[i][1] * scale, mx * scale, my * scale); }
        if (pts.length > 1) { var l = pts[pts.length - 1]; ctx2.lineTo(l[0] * scale, l[1] * scale); }
        ctx2.stroke();
      };
      var redraw = function () {
        ctx2.clearRect(0, 0, cv.width, cv.height); strokes.forEach(drawStroke); if (drawing) drawStroke(drawing);
        if (erAt) { ctx2.beginPath(); ctx2.arc(erAt[0] * scale, erAt[1] * scale, ER_R * scale, 0, Math.PI * 2); ctx2.lineWidth = 1.5 * dpr; ctx2.strokeStyle = getComputedStyle(pad).color; ctx2.globalAlpha = 0.45; ctx2.stroke(); ctx2.globalAlpha = 1; }
        hint.style.display = (strokes.length || drawing) ? 'none' : '';
      };
      var pt = function (e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * HK_INK_W), Math.round((e.clientY - r.top) / r.height * HK_INK_H)]; };
      cv.addEventListener('pointerdown', function (e) {
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (eC) {}
        if (erasing) { snap(); erGest = pt(e); erAt = erGest; eraseAt(erGest); redraw(); return; }
        snap();
        /* قلم: ضخامت با فشار؛ انگشت: ضخامت ثابت */
        var w = e.pointerType === 'pen' && e.pressure > 0 ? Math.max(3, Math.min(10, 3 + e.pressure * 7)) : 6;
        drawing = { c: color, w: Math.round(w * 10) / 10, p: [pt(e)] }; redraw();
      });
      cv.addEventListener('pointermove', function (e) {
        if (erGest) {
          e.preventDefault();
          (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(function (ce) { var q = pt(ce); eraseLine(erGest, q); erGest = q; });
          erAt = erGest; redraw(); return;
        }
        if (!drawing) return; e.preventDefault();
        var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        evs.forEach(function (ce) { var q = pt(ce), l = drawing.p[drawing.p.length - 1]; if (Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) >= 3) drawing.p.push(q); });
        redraw();
      });
      var end = function () {
        if (erGest) { erGest = null; erAt = null; if (hist.length && hist[hist.length - 1] === JSON.stringify(strokes)) hist.pop(); redraw(); return; }
        if (!drawing) return; strokes.push(drawing); drawing = null; redraw();
      };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      var erBtn = ov.querySelector('.hk-ink-eraser');
      var setErase = function (on) { erasing = on; erBtn.classList.toggle('on', on); erBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); pad.classList.toggle('erasing', on); };
      ov.querySelectorAll('.hk-ink-colors button').forEach(function (b) { b.onclick = function () { color = b.dataset.c; setErase(false); ov.querySelectorAll('.hk-ink-colors button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      erBtn.onclick = function () { var on = !erasing; setErase(on); ov.querySelectorAll('.hk-ink-colors button').forEach(function (x) { x.classList.toggle('on', !on && x.dataset.c === color); }); };
      ov.querySelector('.hk-ink-undo').onclick = function () { if (hist.length) { strokes = JSON.parse(hist.pop()); redraw(); } };
      var close = function () { ov.classList.remove('open'); window.removeEventListener('resize', size); setTimeout(function () { try { ov.remove(); } catch (e) {} }, 200); };
      ov._hkCancel = close;
      ov.querySelector('.todo-cancel').onclick = close;
      ov.querySelector('.todo-save').onclick = function () {
        saveInkNote(t, id, strokes);
        close();
        refreshSmartPanelsFor(t, strokes.length ? ('todo-' + id) : 'todoAdd');
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      window.addEventListener('resize', size);
      requestAnimationFrame(function () { ov.classList.add('open'); size(); });
    }
    try { window.openInkEditor = openInkEditor; window.openTodoChooser = openTodoChooser; } catch (eW2) {}


    /* ===== ۱.۳.۷۵: اسلاید «یادآورها» در باکس هوشمند — همهٔ یادآورهای ساخته‌شده به ترتیب سررسید؛ آن‌که موعدش رسیده (هشدار)
       حاشیهٔ قرمز چرخان و نقطهٔ قرمز دارد و هر بار اسلاید می‌آید دوباره می‌چرخد (با یک بار دیدن خاموش نمی‌شود) ===== */
    function spPageReminders() {
      try { loadUserReminders(); } catch (e) {}
      var L = (userReminders || []).filter(function (r) { return r && !r.deletedAt; });
      if (!L.length) return null;
      var today = getTodayPersian(), due = {};
      try { getUserRemindDueSoon().forEach(function (x) { due[x.r.id || x.r.title] = x; }); } catch (e2) {}
      var rows = L.map(function (r) { var nd = reminderNextDue(r); return { r: r, nd: nd, days: daysBetweenPersian(today, nd), hot: !!due[r.id || r.title] }; })
        .filter(function (x) { return x.days >= 0 || x.r.repeat !== 'once'; })
        .sort(function (a, b) { return (b.hot - a.hot) || (a.days - b.days); });
      if (!rows.length) return null;
      /* ۱.۳.۷۸: همان ردیف‌های ساده (اسم | روز و تاریخ)؛ بی نقطهٔ قرمز؛ سررسیده: نوار چرخان و نوشتهٔ قرمز تیره */
      return spHead('یادآورها') + '<div class="sp-rem">' + rows.slice(0, 4).map(function (x) {
        var when = x.days === 0 ? 'امروز' : x.days === 1 ? 'فردا' : (spFa(x.days) + ' روز دیگر');
        return '<div class="sp-rem-r' + (x.hot ? ' hot hk-snake' : '') + '" data-rem="' + spEsc(x.r.id || '') + '"><b>' + spEsc(x.r.title || 'یادآور') + '</b>' +
          '<span class="' + (x.hot ? 'sp-rem-due' : 'hk-inst-mu') + '">' + when + '، ' + spEsc(formatReminderDue(x.nd)) + '</span></div>';
      }).join('') + (rows.length > 4 ? '<div class="sp-rem-more">و ' + spFa(rows.length - 4) + ' یادآور دیگر</div>' : '') + '</div>';
    }
    /* زدن یادآور: پنجرهٔ یادآورها باز، آرام تا همان یادآور و چند لحظه هایلایت (بی ورود به ویرایش) */
    function hkRemindersFocus(id) {
      try { openUserRemindersModal(); } catch (e) { return; }
      setTimeout(function () {
        try {
          var el = document.querySelector('#userRemindersList .ur-item[data-ur-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (!el) return;
          var dur = 0; try { dur = hkSlowScrollTo(el, 900); } catch (eS) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); dur = 600; }
          setTimeout(function () { el.classList.add('ur-hl'); setTimeout(function () { el.classList.remove('ur-hl'); }, 2600); }, (dur || 0) + 80);
        } catch (e2) {}
      }, 320);
    }
    function spTapReminders(title, tgt) {
      var r = tgt && tgt.closest && tgt.closest('[data-rem]'), id = r ? r.getAttribute('data-rem') : '';
      var act = tgt && tgt.closest && tgt.closest('[data-act]'), a = act ? act.getAttribute('data-act') : '';
      if (a === 'edit' && id) { spGo(function () { openUserReminderFromHome(id); }); return; }
      if (a === 'del' && id) {
        try { loadUserReminders(); } catch (e0) {}
        var rr = (userReminders || []).filter(function (x) { return x.id === id; })[0]; if (!rr) return;
        askConfirm('یادآور «' + (rr.title || '') + '» حذف شود؟', function () {
          try { pushToTrash('reminder', rr.title || 'یادآور', { sourceLabel: 'یادآور', reminder: JSON.parse(JSON.stringify(rr)) }); } catch (eTr) {}
          userReminders = userReminders.filter(function (x) { return x.id !== id; });
          saveUserReminders(); showToast('حذف شد');
        });
        return;
      }
      spGo(function () { if (id) hkRemindersFocus(id); else openUserRemindersModal(); });
    }
    try { window.spPageReminders = spPageReminders; window.hkRemindersFocus = hkRemindersFocus; } catch (eWr) {}
    var SMART_PANEL_PAGES = [
      { key: 'warn', build: spPageWarn, onTap: function (title, tgt) {
        if (tgt && tgt.closest && tgt.closest('[data-act="dismiss"]')) { spDismissDupPrompt(title); return; }
        var el = tgt && tgt.closest && tgt.closest('[data-dup]'), d = HKAlerts.duplicates(title)[el ? +el.getAttribute('data-dup') : 0];
        if (!d) return;
        spGo(function () { openPersonDetail(title, d.tab); spFlashRows(title, d.tab, [d.ra, d.rb]); });
      } },
      /* ۱.۳.۴۳: زدن هر اسلاید = رفتن به همان بخشی که اطلاعاتش را نشان می‌دهد */
      { key: 'overview', build: spPageOverview, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); }); } },
      /* ۱.۳.۷۴: کارت‌های قسط (وضعیت کامل؛ زدن ردیف = تاریخچهٔ همان کارت) */
      { key: 'inst', build: spPageInst, onTap: spTapInst },
      /* ۱.۳.۷۵: یادآورها */
      { key: 'reminders', build: spPageReminders, onTap: spTapReminders },
      { key: 'stats', build: spPageStats, onTap: function (title) { spGo(function () { openStatsSheet({ mode: 'daily', card: title, focus: 'stCmp' }); }); } },
      { key: 'todo', build: spPageTodo },
      /* ۱.۳.۴۷: اسلاید اقساط برداشته شد (اقساط خاموش است) */
      { key: 'ledger', build: spPageLedger, onTap: function () { spGo(function () { switchTabFromMenu('ledger'); }); } },
      { key: 'categories', build: spPageCategories, onTap: function (title) { openCategoryReviewSheet(title); } },
      { key: 'projects', build: spPageProjects, onTap: function () { spGo(function () { openSubjectsModal(); }); } },
      { key: 'upcoming', build: spPageUpcoming, onTap: function (title) { spGo(function () { if (spHasUpcomingInst(title)) switchTabFromMenu('install'); else openPersonDetail(title, 'income'); }); } },
      { key: 'jump', build: spPageJump, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); spFlashJump(title); }); } },
      { key: 'biggest', build: spPageBiggest, onTap: function (title) { spGo(function () { openPersonDetail(title, 'expense'); spFlashBiggest(title); }); } },
      { key: 'fix', build: spPageFix, onTap: function (title, tgt) {
        var h = tgt && tgt.closest && tgt.closest('.sp-fix-half'), k = h ? h.getAttribute('data-fix') : '';
        if (!k) { var hs = document.querySelectorAll('.sp-fix-half'); k = hs.length === 1 ? hs[0].getAttribute('data-fix') : 'cat'; }
        var L = spFixList(title, k); if (!L.length) return;
        var key = title + '|' + k, i = (_spFixIdx[key] || 0) % L.length, it = L[i];
        _spFixIdx[key] = i + 1;
        spGo(function () { openPersonDetail(title, it.tab); spFlashRow(title, function () { return it.row; }, it.tab); });
      } },
      { key: 'insight', build: spPageInsight, onTap: function (title) { spGo(function () { openStatsSheet({ mode: 'daily', card: title, focus: 'stCats' }); }); } },
      { key: 'todoAdd', build: spPageTodoAdd, onTap: function (title) { openTodoChooser(title); } }
    ];
    function spDismissDupPrompt(title) {
      var d = HKAlerts.duplicates(title)[0];
      if (!d) return;
      askConfirm('اگر این دو تراکنش واقعاً جدا هستند (تکراری نیستند)، هشدار برداشته شود؟', function () {
        HKAlerts.dismiss(d.id);
        try { renderHomeCards(); } catch (e) {}
      });
    }

    function mountSmartPanel(el, title) {
      var D = null;
      try { D = spCollect(title); } catch (e) { D = null; }
      var pages = [];
      if (D) hkSpOrderedPages().forEach(function (pg) {
        var h = null;
        try { h = pg.build(D); } catch (e) { h = null; }
        /* سازنده می‌تواند چند اسلاید بدهد (مثلاً چند فهرست کار) */
        if (Array.isArray(h)) h.forEach(function (x) { if (x && x.html) pages.push({ key: x.key, html: x.html, onTap: x.onTap || pg.onTap }); });
        else if (h) pages.push({ key: pg.key, html: h, onTap: pg.onTap });
      });
      el.classList.add('sp-panel');
      el._spTitle = title;
      el._spPages = pages;
      el.innerHTML = '';
      var view = document.createElement('div');
      view.className = 'sp-view';
      el.appendChild(view);
      if (!pages.length) {
        view.innerHTML = '<div class="sp-empty">بعد از ثبت چند تراکنش، تحلیل وضعیت مالی اینجا نمایش داده می‌شود.</div>';
        return;
      }
      var st = _smartPanelState[title] || (_smartPanelState[title] = { key: pages[0].key, pausedUntil: 0, nextAt: 0, warnSig: '' });
      /* هشدار تکرارِ تازه: یک بار مستقیم روی صفحهٔ هشدار برو */
      var sig = (D.alerts.filter(function (a) { return a.type === 'dup'; }).map(function (a) { return a.id; })).join(',');
      if (sig && sig !== st.warnSig) { st.key = 'warn'; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; }
      st.warnSig = sig;
      /* ۱.۳.۶۸: اگر پیش‌تر فقط اسلاید «+» بود و حالا اسلاید واقعی آمده، از اسلاید اول شروع کن (مگر کاربر خودش ورق زده باشد) */
      if (st.key === 'todoAdd' && pages.length > 1 && !(Date.now() < (st.pausedUntil || 0))) st.key = pages[0].key;
      var idx = 0;
      pages.forEach(function (p, i) { if (p.key === st.key) idx = i; });
      st.key = pages[idx].key;
      if (!st.nextAt) st.nextAt = Date.now() + SMART_PANEL_INTERVAL;
      el._spIdx = idx;
      view.appendChild(spMakePage(pages[idx]));
      spArmTips(st, pages[idx]);
      bindSmartPanelGestures(el);
    }
    /* صفحهٔ نکته با دو نکته: ۵ ثانیه اولی، اسکرول عمودی، ۵ ثانیه دومی، سپس صفحهٔ بعد */
    var SMART_TIP_MS = 5000;
    function spArmTips(st, pg) {
      var n = pg && (pg.key === 'insight' || pg.key === 'projects') ? (pg.html.split('sp-tipbox').length - 1) : 0;
      st.tipIdx = 0; st.tipCount = n;
      if (n > 1) {
        /* هر نکته ۵ ثانیه؛ زمان صفحه به تعداد نکات بستگی دارد (نه ۱۰ ثانیهٔ ثابت) */
        st.subAt = Date.now() + SMART_TIP_MS;
        st.nextAt = Date.now() + SMART_TIP_MS * n;
      } else st.subAt = 0;
    }
    /* اسکرول عمودی با همان سرعت و منحنی جابه‌جایی افقی صفحه‌ها (۳۸۰ms، ease-out) */
    function spAnimScrollTop(el, to, dur) {
      var from = el.scrollTop, d = to - from;
      if (Math.abs(d) < 1) return;
      dur = dur || 380;
      var t0 = performance.now(), snap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none';
      var step = function (now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.scrollTop = from + d * e;
        if (k < 1) requestAnimationFrame(step); else el.style.scrollSnapType = snap;
      };
      requestAnimationFrame(step);
    }
    function spMakePage(pg) {
      var d = document.createElement('div');
      d.className = 'sp-page sp-k-' + pg.key;
      d.innerHTML = pg.html;
      /* نمودارها خالی شروع می‌شوند و نرم پر می‌شوند */
      var bars = d.querySelectorAll('i[data-w]');
      bars.forEach(function (b) { b.style.width = '0%'; });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        bars.forEach(function (b, k) { b.style.transitionDelay = (k * 90) + 'ms'; b.style.width = b.getAttribute('data-w') + '%'; });
      }); });
      return d;
    }
    /* شروع محتوا هم‌تراز «درآمد کل» در کادر کناری + کوچک‌کردن فونت تا هیچ نوشته‌ای نصفه نشود */
    function fitSmartPanel(el) {
      if (!el || !el.classList.contains('sp-panel')) return;
      try {
        var card = el.closest('.person-card');
        var lab = card && card.querySelector('.person-stat-box .psl-l');
        if (lab) {
          var off = Math.round(lab.getBoundingClientRect().top - el.getBoundingClientRect().top - 1);
          if (off >= 2 && off < 40) el.style.setProperty('--sp-pt', off + 'px');
        }
      } catch (e0) {}
      el.querySelectorAll('.sp-page:not(.sp-out)').forEach(function (pg) { spFitPage(pg); });
    }
    /* ۱.۳.۴۹: اسلاید بلند (بخشی پایین مانده): بعد از کمی مکث آرام تا پایین اسکرول می‌شود؛ زمان اسلاید به همان اندازه بیشتر */
    function spAutoScroll(fr) {
      if (!fr || fr._spAuto) return;
      var max = fr.scrollHeight - fr.clientHeight;
      if (max < 4) return;
      fr._spAuto = true;
      var box = fr.closest('.pc-smart-box'), st = box && _smartPanelState[box._spTitle];
      var dur = Math.min(9000, Math.max(1800, max * 45)), wait = 2200;
      if (st) st.nextAt = Math.max(st.nextAt || 0, Date.now() + wait + dur + 2600);
      setTimeout(function () {
        if (!fr.isConnected || fr.scrollTop > 2) return;
        if (st && Date.now() < (st.pausedUntil || 0)) return;
        if (box) box._spAutoUntil = Date.now() + dur + 300;
        var from = fr.scrollTop, t0 = performance.now(), snap = fr.style.scrollSnapType;
        fr.style.scrollSnapType = 'none';
        var step = function (now) {
          if (!fr.isConnected) return;
          var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          fr.scrollTop = from + (max - from) * e;
          if (k < 1) requestAnimationFrame(step); else fr.style.scrollSnapType = snap;
        };
        requestAnimationFrame(step);
      }, wait);
    }
    function spFitPage(pg) {
      if (!(pg.clientHeight > 0)) return;
      var tips = pg.querySelector('.sp-tips');
      if (tips) {
        /* هر نکته به ارتفاع کامل نما؛ اگر متن جا نشد فونت همین صفحه کمی کوچک می‌شود */
        var boxes = tips.querySelectorAll('.sp-tipbox');
        var hh = tips.clientHeight;
        if (hh > 10) boxes.forEach(function (bx) { bx.style.height = hh + 'px'; });
        var f2 = 1;
        pg.style.setProperty('--sp-fs', '1');
        var overT = function () { for (var i = 0; i < boxes.length; i++) if (boxes[i].scrollHeight > boxes[i].clientHeight + 1) return true; return false; };
        while (f2 > 0.9 && overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); }
        /* جای خالی بود → فونت بزرگ‌تر تا متن باکس را پر کند */
        if (!overT()) {
          while (f2 + 0.04 <= (pg.closest('#homeSmartBox') ? 1.3 : 1.45) + 1e-6) { f2 += 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); if (overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); break; } }
        }
        /* ۱.۳.۶۸: بزرگ شدن عنوان، ارتفاع نما را کم می‌کند؛ هر نکته دوباره هم‌قد نما شود (و اگر لازم شد کمی کوچک) */
        var hh2 = tips.clientHeight;
        if (hh2 > 10 && hh2 !== hh) { boxes.forEach(function (bx) { bx.style.height = hh2 + 'px'; }); while (f2 > 0.9 && overT()) { f2 -= 0.04; pg.style.setProperty('--sp-fs', f2.toFixed(2)); hh2 = tips.clientHeight; boxes.forEach(function (bx) { bx.style.height = hh2 + 'px'; }); } }
        return;
      }
      var fr = pg.querySelector('.sp-free');
      if (fr) {
        pg.style.setProperty('--sp-fs', '1');
        /* ۱.۳.۶۸: در باکس جدا، اگر جا هست درشت‌تر (تا پیش از اسکرول شدن) */
        if (pg.closest('#homeSmartBox')) { var g1 = 1; while (g1 + 0.05 <= 1.3 + 1e-6 && fr.scrollHeight <= fr.clientHeight + 1) { g1 += 0.05; pg.style.setProperty('--sp-fs', g1.toFixed(2)); } if (fr.scrollHeight > fr.clientHeight + 1 && g1 > 1) pg.style.setProperty('--sp-fs', (g1 - 0.05).toFixed(2)); }
        fr.scrollTop = 0;
        var mark = function () { fr.classList.toggle('sp-more', fr.scrollHeight - fr.clientHeight - fr.scrollTop > 2); };
        mark();
        if (!fr._spMark) { fr._spMark = true; fr.addEventListener('scroll', mark, { passive: true }); }
        spAutoScroll(fr);
        return;
      }
      var sc = pg.querySelector('.sp-scroll');
      if (sc) {
        /* دسته‌ها: هر نما دقیقاً ۴ مورد؛ ارتفاع موردها یکسان تا اسکرول پیوسته دیده شود */
        var cats = sc.querySelectorAll('.sp-cat');
        var h = Math.floor(sc.clientHeight / 4);
        if (h > 10) cats.forEach(function (c, i) { c.style.height = h + 'px'; c.style.scrollSnapAlign = (i % 4 === 0) ? 'start' : 'none'; });
        if (h > 10 && pg.closest('#homeSmartBox')) {
          var catOver = function () { for (var q = 0; q < cats.length; q++) if (cats[q].scrollHeight > cats[q].clientHeight + 1) return true; return false; };
          var g2 = 1; pg.style.setProperty('--sp-fs', '1');
          while (g2 + 0.05 <= 1.15 + 1e-6 && !catOver()) { g2 += 0.05; pg.style.setProperty('--sp-fs', g2.toFixed(2)); }
          if (catOver() && g2 > 1) pg.style.setProperty('--sp-fs', (g2 - 0.05).toFixed(2));
        }
        spAutoScroll(sc);
        return;
      }
      var over = function () {
        if (pg.scrollHeight > pg.clientHeight + 1) return true;
        var cells = pg.querySelectorAll('.sp-l, .sp-v, .sp-tip, .sp-t');
        for (var i = 0; i < cells.length; i++) if (cells[i].scrollWidth > cells[i].clientWidth + 1) return true;
        return false;
      };
      var f = 1;
      pg.style.setProperty('--sp-fs', '1');
      /* اطلاعات زیاد (ارتفاع): به‌جای ریز کردن متن، محتوا مثل اسلاید طلب/بدهی اسکرول عمودی می‌شود */
      /* صفحه‌های هم‌فاصله: اول کمی (نه ریز) کوچک؛ اگر باز جا نشد مثل بقیه اسکرول عمودی */
      if (pg.querySelector('.sp-even')) { while (f > 0.9 && pg.scrollHeight > pg.clientHeight + 1) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); } }
      if (pg.scrollHeight > pg.clientHeight + 1) {
        var ev = pg.querySelector('.sp-even'); if (ev) ev.style.flex = '0 0 auto';
        var fr2 = document.createElement('div');
        fr2.className = 'sp-scroll sp-free';
        Array.prototype.slice.call(pg.children).forEach(function (ch) { if (!ch.classList.contains('sp-h')) fr2.appendChild(ch); });
        pg.appendChild(fr2);
        var wOver = function () {
          var cells = pg.querySelectorAll('.sp-l, .sp-v, .sp-tip, .sp-t');
          for (var i = 0; i < cells.length; i++) if (cells[i].scrollWidth > cells[i].clientWidth + 1) return true;
          return false;
        };
        /* فقط اگر نوشته‌ای در عرض جا نشد کمی کوچک شود */
        while (f > 0.92 && wOver()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); }
        var mark2 = function () { fr2.classList.toggle('sp-more', fr2.scrollHeight - fr2.clientHeight - fr2.scrollTop > 2); };
        fr2.scrollTop = 0;
        mark2();
        fr2._spMark = true; fr2.addEventListener('scroll', mark2, { passive: true });
        spAutoScroll(fr2);
        return;
      }
      while (f > 0.92 && over()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); }
      /* صفحه‌های متنی (هشدار/پروژه‌ها): اگر جا هست، فونت بزرگ‌تر شود.
         ۱.۳.۶۸: در باکس هوشمندِ جدا، همهٔ اسلایدها تا جایی که جا هست درشت می‌شوند تا نوشته‌ها کل ارتفاع را پر کنند */
      var _home = !!pg.closest('#homeSmartBox');
      if ((_home || pg.querySelector('.sp-tip')) && !over()) {
        while (f + 0.04 <= (_home ? 1.3 : 1.45) + 1e-6) { f += 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); if (over()) { f -= 0.04; pg.style.setProperty('--sp-fs', f.toFixed(2)); break; } }
      }
    }
    /* جابه‌جایی صفحه: dir = +1 بعدی، -1 قبلی (صفحهٔ بعدی از سمت چپ می‌آید؛ RTL) */
    function smartPanelGo(el, dir, fromDx) {
      var pages = el._spPages || [];
      if (pages.length < 2) return;
      var view = el.querySelector('.sp-view');
      if (!view) return;
      var cur = view.querySelector('.sp-page:not(.sp-out)');
      var idx = (el._spIdx + dir + pages.length) % pages.length;
      el._spIdx = idx;
      var st = _smartPanelState[el._spTitle];
      if (st) { st.key = pages[idx].key; st.nextAt = Date.now() + SMART_PANEL_INTERVAL; spArmTips(st, pages[idx]); }
      var w = el.clientWidth || 100;
      var nx = spMakePage(pages[idx]);
      var reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      view.querySelectorAll('.sp-out').forEach(function (o) { o.remove(); });
      if (!cur || reduce || !nx.animate) { view.innerHTML = ''; view.appendChild(nx); spFitPage(nx); return; }
      var shift = Math.round(w * (fromDx != null ? 1 : 0.18)) * (dir > 0 ? 1 : -1);
      cur.classList.add('sp-out');
      view.appendChild(nx);
      spFitPage(nx);
      var d = fromDx != null ? 220 : 380;
      var startX = fromDx != null ? fromDx : 0;
      cur.animate([{ transform: 'translateX(' + startX + 'px)', opacity: 1 }, { transform: 'translateX(' + (startX + shift) + 'px)', opacity: 0 }], { duration: d, easing: 'ease-out', fill: 'forwards' })
        .onfinish = function () { try { cur.remove(); } catch (e) {} };
      nx.animate([{ transform: 'translateX(' + (startX - shift) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: d, easing: 'ease-out' });
    }
    function smartPanelPause(el) {
      var st = _smartPanelState[el._spTitle];
      if (st) { st.pausedUntil = Date.now() + SMART_PANEL_IDLE; st.nextAt = st.pausedUntil; st.subAt = 0; }
    }
    /* سطل زبالهٔ قرمز روی اسلاید «کارهای من»؛ لمس سطل = کل اسلاید به سطل زباله، لمس جای دیگر = لغو */
    function spShowTodoTrash(el, page) {
      var old = el.querySelector('.sp-trash-ov'); if (old) { if (old._hkClose) old._hkClose(); else old.remove(); }
      document.querySelectorAll('.sp-trash-shield').forEach(function (x) { x.remove(); });
      var listId = String(page.key || '').replace(/^todo-/, '');
      var ov = document.createElement('div'); ov.className = 'sp-trash-ov';
      ov.innerHTML = '<button type="button" class="sp-trash-btn" aria-label="حذف این فهرست"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2A2 2 0 0 0 8.5 21h7a2 2 0 0 0 2-1.8L18.5 7M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7"/></svg></button>';
      /* لایهٔ نامرئی تمام‌صفحه: هر لمس جای دیگر صفحه فقط حذف را لغو می‌کند و به هیچ دکمه/کارتی نمی‌رسد؛
         لمس روی خود سطل = حذف. رها کردنِ همان لانگ‌پرس نادیده گرفته می‌شود (فقط لمسِ تازه) */
      var shield = document.createElement('div'); shield.className = 'sp-trash-shield';
      var armed = false, downOnBtn = false;
      var btnHit = function (x, y) { var b = ov.querySelector('.sp-trash-btn'); if (!b) return false; var r = b.getBoundingClientRect(); return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6; };
      /* لایه کمی بعد از بسته شدن برداشته می‌شود تا «کلیک» همان لمس هم به دکمهٔ زیرش نرسد */
      var close = function () { try { ov.remove(); } catch (e0) {} setTimeout(function () { try { shield.remove(); } catch (e1) {} }, 400); };
      ov._hkClose = close;
      var swallow = function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
      shield.addEventListener('pointerdown', function (e) { swallow(e); armed = true; downOnBtn = btnHit(e.clientX, e.clientY); });
      shield.addEventListener('pointermove', swallow);
      ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'contextmenu'].forEach(function (n) { shield.addEventListener(n, swallow); });
      shield.addEventListener('pointerup', function (e) {
        swallow(e);
        if (!armed) return;
        var isBtn = downOnBtn && btnHit(e.clientX, e.clientY);
        close();
        if (isBtn) doDelete();
      });
      document.body.appendChild(shield);
      var doDelete = function () {
        var title = el._spTitle;
        try {
          var lists = loadTodoLists(title), l = lists.filter(function (x) { return x.id === listId; })[0];
          if (!l) return;
          if (Array.isArray(l.ink)) pushToTrash('todo_list', 'یادداشت دست‌نویس', { sourceLabel: 'باکس هوشمند — ' + (title || ''), title: title, ym: todoYm(), id: l.id, ink: JSON.parse(JSON.stringify(l.ink)) });
          else pushToTrash('todo_list', 'کارهای من (' + toPersianDigits(String(l.items.length)) + ' مورد)', { sourceLabel: 'باکس هوشمند — ' + (title || ''), title: title, ym: todoYm(), id: l.id, items: JSON.parse(JSON.stringify(l.items)) });
          saveTodoList(title, listId, []);
          refreshSmartPanelsFor(title, 'todoAdd');
          showToast('فهرست به سطل زباله رفت');
        } catch (eD) {}
      };
      el.appendChild(ov);
    }
    function bindSmartPanelGestures(el) {
      if (el._spBound) return;
      el._spBound = true;
      var sx = 0, sy = 0, dx = 0, drag = false, down = false, pid = null, cur = null, moved = false;
      el.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button !== 0) return;
        down = false;
        /* کارت‌ها در حال حرکت‌اند → این لمس برای کاروسل است (باکس هوشمند ورق نخورد) */
        try { if (typeof HomeCarousel !== 'undefined' && HomeCarousel.busy()) { moved = true; return; } } catch (eB) {}
        down = true; drag = false; moved = false; dx = 0; sx = ev.clientX; sy = ev.clientY; pid = ev.pointerId;
        smartPanelPause(el);
        /* لانگ‌پرس روی اسلاید ساختهٔ کاربر (کارهای من) → سطل زبالهٔ قرمز روی همان اسلاید */
        clearTimeout(el._spLp);
        var _pg0 = (el._spPages || [])[el._spIdx];
        if (_pg0 && /^todo-/.test(String(_pg0.key || ''))) {
          el._spLpArmed = true;
          el._spLp = setTimeout(function () {
            /* لانگ‌پرس لمسی ممکن است pointercancel بدهد؛ ملاک فقط «حرکت نکرده و رها نشده» است */
            if (!el._spLpArmed || drag) return;
            el._spLpArmed = false;
            down = false; moved = true;
            try { window.appHaptic(30); } catch (eH) {}
            spShowTodoTrash(el, _pg0);
          }, 480);
        }
      });
      el.addEventListener('pointermove', function (ev) { if (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8) { el._spLpArmed = false; clearTimeout(el._spLp); } });
      el.addEventListener('pointerup', function () { el._spLpArmed = false; clearTimeout(el._spLp); });
      el.addEventListener('touchmove', function (ev) { var t0 = ev.touches && ev.touches[0]; if (t0 && (Math.abs(t0.clientX - sx) > 8 || Math.abs(t0.clientY - sy) > 8)) { el._spLpArmed = false; clearTimeout(el._spLp); } }, { passive: true });
      el.addEventListener('touchend', function () { el._spLpArmed = false; clearTimeout(el._spLp); });
      el.addEventListener('pointermove', function (ev) {
        if (!down || ev.pointerId !== pid) return;
        var mx = ev.clientX - sx, my = ev.clientY - sy;
        if (Math.abs(mx) > 6 || Math.abs(my) > 6) moved = true;
        if (!drag) {
          if (Math.abs(mx) < 8) return;
          if (Math.abs(my) > Math.abs(mx)) { down = false; return; } /* اسکرول عمودی (دسته‌ها) */
          if ((el._spPages || []).length < 2) { down = false; return; }
          drag = true;
          try { el.setPointerCapture(pid); } catch (e) {}
          cur = el.querySelector('.sp-page:not(.sp-out)');
        }
        dx = mx;
        /* کشیدن بلند = منظور کاربر عوض کردن کارت است → واگذاری به کاروسل */
        if (Math.abs(dx) > Math.max(70, (el.clientWidth || 100) * 0.75) && typeof HomeCarousel !== 'undefined' && HomeCarousel.canDrag() && HomeCarousel.takeOver(ev)) {
          if (cur) {
            var c0 = cur, from0 = dx;
            c0.style.transform = ''; c0.style.opacity = '';
            if (c0.animate) c0.animate([{ transform: 'translateX(' + from0 + 'px)', opacity: 0.4 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 200, easing: 'ease-out' });
          }
          try { el.releasePointerCapture(pid); } catch (eR) {}
          cur = null; drag = false; down = false; moved = true;
          return;
        }
        if (cur) { cur.style.transform = 'translateX(' + dx + 'px)'; cur.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / (el.clientWidth || 100))); }
      });
      var end = function () {
        if (!down) return;
        down = false;
        smartPanelPause(el);
        if (!drag) return;
        drag = false;
        var c = cur; cur = null;
        if (Math.abs(dx) > Math.max(28, (el.clientWidth || 100) * 0.22)) {
          if (c) { c.style.transform = ''; c.style.opacity = ''; }
          smartPanelGo(el, dx > 0 ? 1 : -1, dx);
        } else if (c) {
          var from = dx;
          c.style.transform = ''; c.style.opacity = '';
          if (c.animate) c.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(0)' }], { duration: 160, easing: 'ease-out' });
        }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', function () { down = false; drag = false; moved = true; if (cur) { cur.style.transform = ''; cur.style.opacity = ''; cur = null; } });
      el.addEventListener('scroll', function () { if (Date.now() < (el._spAutoUntil || 0)) return; smartPanelPause(el); }, true);
      /* لمس ساده (بدون کشیدن): روی رویداد click تا کلیک بعدی روی برگهٔ تازه‌باز نیفتد */
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (moved) return;
        var pg = (el._spPages || [])[el._spIdx];
        el._spTapTarget = ev.target;
        if (pg && pg.onTap) { ev.preventDefault(); try { pg.onTap(el._spTitle, ev.target); } catch (e) {} }
      });
    }
    /* تایمر واحد: فقط پنل کارتِ فعالِ قابل‌مشاهده جابه‌جا می‌شود */
    (function () {
      setInterval(function () {
        try {
          if (document.hidden) return;
          var panel = document.getElementById('panel-home');
          if (!panel || !panel.classList.contains('active')) return;
          if (document.body.classList.contains('card-reorder-mode')) return;
          /* ۱.۳.۵۷: فهرست کشویی (مثلاً انتخاب سال) باز است: اسلایدها حرکت نکنند تا فهرست بسته نشود */
          if (document.querySelector('.fancy-select-list.open, .dark-select-list.open')) return;
          var t = getActiveHomeCardTitle();
          var now = Date.now();
          document.querySelectorAll('#homeSmartBox .pc-smart-box.sp-panel, #homeCards .pc-smart-box.sp-panel').forEach(function (el) {
            var st = _smartPanelState[el._spTitle];
            if (!st || (el._spPages || []).length < 2) return;
            if (t && el._spTitle !== t) return;
            if (now < st.pausedUntil) return;
            if (st.subAt && now >= st.subAt) {
              st.tipIdx = (st.tipIdx || 0) + 1;
              st.subAt = st.tipIdx < (st.tipCount || 0) - 1 ? now + SMART_TIP_MS : 0;
              var tp = el.querySelector('.sp-page:not(.sp-out) .sp-tips');
              var tgt = tp && tp.children[st.tipIdx];
              if (tgt) {
                el._spAutoUntil = now + 1200; /* اسکرول خودکار = تعامل کاربر حساب نشود */
                spAnimScrollTop(tp, tgt.offsetTop - tp.children[0].offsetTop, 380);
              }
              return;
            }
            if (now < st.nextAt) return;
            var r = el.getBoundingClientRect();
            if (!(r.width > 0) || r.right < 0 || r.left > window.innerWidth) return;
            var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!hit || !el.contains(hit)) return; /* مودال یا لایه‌ای روی کارت است */
            smartPanelGo(el, 1);
          });
        } catch (e) {}
      }, 1000);
    })();

    /* برگهٔ دسته‌بندی مخارج: فهرست همهٔ شرح‌ها؛ با لمس هر شرح، انتخاب دسته(های) همان شرح باز می‌شود.
       هر شرح می‌تواند چند دسته داشته باشد؛ مبلغش مساوی بین آن‌ها تقسیم می‌شود.
       دکمهٔ بازگشت اندروید: انتخاب دسته ← فهرست ← صفحه اصلی */
    /* ۱.۳.۴۸: پنجرهٔ پروفایل (لمس نام کاربر در منو): تغییر نام، خلاصهٔ سریع، «ماهی که گذشت»، آخرین پشتیبان + پشتیبان‌گیری الان */
    function hkCloseProfile() {
      var ov = document.querySelector('.hk-prof-ov');
      if (!ov) return false;
      try { ov.remove(); } catch (e) {}
      return true;
    }
    function hkProfileLastBackup() {
      var ts = 0;
      try { ts = Math.max(Number(localStorage.getItem(STORAGE_KEY + '_lastManualBk')) || 0, Number(autoBkState().lastAt) || 0); } catch (e) {}
      if (!(ts > 1e12)) return 'هنوز پشتیبانی گرفته نشده';
      try { var j = hkJalaliOfTs(ts); return toPersianDigits(String(j.d)) + ' ' + MONTHS[j.m - 1] + ' ' + toPersianDigits(String(j.y)); } catch (e2) { return '—'; }
    }
    /* ۱.۳.۵۱: شروع = اولین ماهی که واقعاً تراکنش دارد (ماه خالیِ دیده‌شده حساب نیست) */
    function hkProfileStart() {
      var ks = Object.keys(archive || {}).filter(function (k) {
        if (!/^\d+-\d+$/.test(k)) return false;
        var pd = archive[k]; if (!pd) return false;
        return ['income', 'expense'].some(function (t) { return ((pd[t] && pd[t].sections) || []).some(function (s) { return (s && s.rows || []).some(function (r) { return r && (Number(r.amount) || 0) > 0; }); }); });
      }).map(function (k) { var p = k.split('-'); return { y: +p[0], m: +p[1] }; }).sort(function (a, b) { return a.y - b.y || a.m - b.m; });
      var t = getTodayPersian();
      var f = ks[0] || { y: t.y, m: t.m };
      return MONTHS[f.m - 1] + ' ' + toPersianDigits(String(f.y));
    }
    /* ۱.۳.۵۱: موجودی کل = آخرین موجودی تا امروز (هر ماهی که باز باشد) */
    function hkProfileBalance() {
      var t = getTodayPersian();
      if (!t || !t.y || (currentYear === t.y && currentMonth === t.m)) return sumGlobalAccountBalances();
      var map = _hkMonthEndings(t.y, t.m, 0, {}), s = 0;
      Object.keys(map || {}).forEach(function (k) { if (!k || k === 'بدون حساب' || isLiveAccountLabel(k)) s += Number(map[k]) || 0; });
      return s;
    }
    function hkOpenProfile() {
      hkCloseProfile();
      var name = '';
      try { name = hkMainTitle() || ''; } catch (e0) {}
      var bal = 0, accN = 0, start = '';
      try { bal = hkProfileBalance(); } catch (e1) {}
      try { accN = (selectedBankAccounts || []).filter(Boolean).length; } catch (e2) {}
      try {
        start = hkProfileStart();
      } catch (e3) {}
      var ov = document.createElement('div');
      ov.className = 'modal-overlay open hk-prof-ov';
      ov.style.cssText = 'z-index:650;display:flex;align-items:center;justify-content:center;';
      var neg = bal < 0;
      ov.innerHTML = '<div class="modal-box hk-prof" role="dialog" aria-label="پروفایل">' +
        '<div class="hk-prof-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>' +
        '<span class="hk-prof-name"></span><button type="button" class="hk-prof-rename">تغییر نام</button></div>' +
        '<div class="hk-prof-tiles">' +
          '<div class="hk-prof-tile"><small>موجودی کل</small><b class="' + (neg ? 'neg' : 'pos') + '">' + (neg ? '−' : '') + formatNum(Math.abs(Math.round(bal))) + '</b></div>' +
          '<div class="hk-prof-tile"><small>حساب‌ها</small><b>' + toPersianDigits(String(accN)) + '</b></div>' +
          '<div class="hk-prof-tile"><small>شروع</small><b>' + escapeHtml(start) + '</b></div>' +
        '</div>' +
        '<button type="button" class="hk-prof-row hk-prof-recap">ماهی که گذشت</button>' +
        '<div class="hk-prof-bk"><div><small>آخرین پشتیبان</small><b>' + escapeHtml(hkProfileLastBackup()) + '</b></div><button type="button" class="hk-prof-bknow">پشتیبان‌گیری الان</button></div>' +
        '<button type="button" class="modal-btn hk-prof-close">بستن</button>' +
        '</div>';
      ov.querySelector('.hk-prof-name').textContent = name;
      ov.addEventListener('click', function (e) { if (e.target === ov) hkCloseProfile(); });
      ov.querySelector('.hk-prof-close').onclick = hkCloseProfile;
      ov.querySelector('.hk-prof-rename').onclick = function () { hkCloseProfile(); openPersonEditSheet(name, false); };
      ov.querySelector('.hk-prof-recap').onclick = function () { hkCloseProfile(); try { openMonthRecap(); } catch (e) {} };
      ov.querySelector('.hk-prof-bknow').onclick = function () { hkCloseProfile(); try { askBackupParts(); } catch (e) {} };
      document.body.appendChild(ov);
    }
    try { window.hkOpenProfile = hkOpenProfile; } catch (eWp) {}
    /* ۱.۳.۴۹: لمس نام در منو: همان باکس به پایین باز و بزرگ می‌شود (بی پنجرهٔ جدا) */
    function hkToggleProfile(force) {
      var wrap = document.getElementById('menuUserPanel'), btn = document.getElementById('menuUserName');
      if (!wrap) return;
      var open = typeof force === 'boolean' ? force : !wrap.classList.contains('open');
      if (!open) { wrap.style.maxHeight = '0px'; wrap.classList.remove('open'); if (btn) btn.classList.remove('open'); return; }
      var name = ''; try { name = hkMainTitle() || ''; } catch (e0) {}
      var bal = 0, accN = 0, start = '';
      try { bal = hkProfileBalance(); } catch (e1) {}
      try { accN = (selectedBankAccounts || []).filter(Boolean).length; } catch (e2) {}
      try {
        start = hkProfileStart();
      } catch (e3) {}
      var neg = bal < 0;
      wrap.innerHTML = '<div class="hk-prof hk-prof-inline">' +
        '<div class="hk-prof-tiles">' +
          '<div class="hk-prof-tile"><small>موجودی کل</small><b class="' + (neg ? 'neg' : 'pos') + '">' + (neg ? '−' : '') + formatNum(Math.abs(Math.round(bal))) + '</b></div>' +
          '<div class="hk-prof-tile"><small>حساب‌ها</small><b>' + toPersianDigits(String(accN)) + '</b></div>' +
          '<div class="hk-prof-tile"><small>شروع</small><b>' + escapeHtml(start) + '</b></div>' +
        '</div>' +
        '<div class="hk-prof-bk"><div><small>آخرین پشتیبان</small><b>' + escapeHtml(hkProfileLastBackup()) + '</b></div><button type="button" class="hk-prof-bknow">پشتیبان‌گیری الان</button></div>' +
        '</div>';
      wrap.querySelector('.hk-prof-bknow').onclick = function (e) { e.stopPropagation(); try { askBackupParts(); } catch (eB) {} };
      wrap.classList.add('open'); if (btn) btn.classList.add('open');
      wrap.style.maxHeight = wrap.scrollHeight + 'px';
    }

