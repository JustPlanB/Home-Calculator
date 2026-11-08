    /* ===== ۱.۳.۸۷: دنگ — تقسیم خرج‌های مشترک با دوستان =====
       جدا از حساب‌کتاب (روی موجودی، درآمد و مخارج اثری ندارد)؛ در پشتیبان کامل ذخیره می‌شود.
       داده: { groups: [{ id, name, members:[{id,name}], expenses:[{id,desc,amount,payer,shares:{id:مبلغ},mode:'eq'|'uneq',y,m,d,at}], settles:[{id,from,to,amount,y,m,d,at}] }] }
       مانده هر نفر = پرداختی − سهم + پرداخت‌های تسویه‌ای که داده − تسویه‌هایی که گرفته؛ مثبت = طلبکار، منفی = بدهکار.
       کمترین جابه‌جایی: بیشترین بدهکار به بیشترین طلبکار (مثلاً اگر ۱ به ۲ و ۲ به ۳ هزار تومان بدهکار است، ۱ مستقیم به ۳ می‌دهد). */
    var HK_DONG_KEY = STORAGE_KEY + '_dong';
    function hkDongLoad() {
      var o = null;
      try { o = JSON.parse(localStorage.getItem(HK_DONG_KEY) || 'null'); } catch (e) { o = null; }
      if (!o || typeof o !== 'object') o = {};
      if (!Array.isArray(o.groups)) o.groups = [];
      o.groups.forEach(function (g) {
        if (!Array.isArray(g.members)) g.members = [];
        if (!Array.isArray(g.expenses)) g.expenses = [];
        if (!Array.isArray(g.settles)) g.settles = [];
      });
      return o;
    }
    function hkDongSave(d) { try { localStorage.setItem(HK_DONG_KEY, JSON.stringify(d)); } catch (e) { try { showToast('ذخیرهٔ دُنگ ممکن نشد', 'warn'); } catch (e2) {} } }
    function hkDongId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    /* تقسیم مساوی به تومان درست؛ باقی‌ماندهٔ تقسیم به نفرات اول */
    function hkDongSplitEq(amount, ids) {
      var o = {}, n = ids.length; if (!n) return o;
      var base = Math.floor(amount / n), rem = amount - base * n;
      ids.forEach(function (id, i) { o[id] = base + (i < rem ? 1 : 0); });
      return o;
    }
    /* مانده فقط از خرج‌ها */
    function hkDongRaw(g) {
      var b = {};
      g.members.forEach(function (m) { b[m.id] = 0; });
      g.expenses.forEach(function (e) {
        if (b[e.payer] == null) b[e.payer] = 0;
        b[e.payer] += Number(e.amount) || 0;
        Object.keys(e.shares || {}).forEach(function (id) { if (b[id] == null) b[id] = 0; b[id] -= Number(e.shares[id]) || 0; });
      });
      return b;
    }
    /* ۱.۳.۸۸: پرداخت‌های لازم (از خرج‌ها) و وضعیت هر کدام: «پرداخت شد» اگر همان پرداخت (از، به، مبلغ) علامت خورده باشد */
    function hkDongPlan(g) {
      var used = {};
      return hkDongTransfers(hkDongRaw(g)).map(function (t) {
        var s = (g.settles || []).filter(function (x, i) { return !used[i] && x.from === t.from && x.to === t.to && Math.round(x.amount) === Math.round(t.amount) && (used[i] = 1); })[0];
        return { from: t.from, to: t.to, amount: t.amount, paid: !!s, sid: s ? s.id : '' };
      });
    }
    /* مانده با پرداخت‌های علامت‌خورده */
    /* ۱.۳.۸۸: نامساوی = تعداد نفرِ هر عضو (مثلاً با همسر و فرزند = ۳)؛ مبلغ به نسبت تقسیم و باقی‌ماندهٔ تومانی به بزرگ‌ترین کسرها */
    function hkDongSplitW(amount, ids, w) {
      var o = {}, tot = ids.reduce(function (t, id) { return t + Math.max(0, Number(w[id]) || 0); }, 0);
      if (!(tot > 0)) return hkDongSplitEq(amount, ids);
      var parts = ids.map(function (id) { var x = amount * Math.max(0, Number(w[id]) || 0) / tot; return { id: id, f: Math.floor(x), r: x - Math.floor(x) }; });
      var left = amount - parts.reduce(function (t, p) { return t + p.f; }, 0);
      parts.slice().sort(function (a, b) { return b.r - a.r; }).forEach(function (p) { if (left > 0) { p.f++; left--; } });
      parts.forEach(function (p) { if (p.f > 0) o[p.id] = p.f; });
      return o;
    }
    function hkDongBalances(g) {
      var b = hkDongRaw(g);
      hkDongPlan(g).forEach(function (t) { if (t.paid) { b[t.from] += t.amount; b[t.to] -= t.amount; } });
      return b;
    }
    /* کمترین تعداد پرداخت برای صاف شدن همه */
    function hkDongTransfers(bal) {
      var cr = [], db = [];
      Object.keys(bal).forEach(function (id) {
        var v = Math.round(Number(bal[id]) || 0);
        if (v > 0) cr.push({ id: id, v: v }); else if (v < 0) db.push({ id: id, v: -v });
      });
      cr.sort(function (a, b) { return b.v - a.v; }); db.sort(function (a, b) { return b.v - a.v; });
      var out = [], i = 0, j = 0;
      while (i < db.length && j < cr.length) {
        var x = Math.min(db[i].v, cr[j].v);
        if (x > 0) out.push({ from: db[i].id, to: cr[j].id, amount: x });
        db[i].v -= x; cr[j].v -= x;
        if (!db[i].v) i++;
        if (!cr[j].v) j++;
      }
      return out;
    }
    /* ۱.۳.۸۸: نام کاربر به‌جای «من» */
    function hkDongMe() { try { var n = (typeof hkMainTitle === 'function' && String(hkMainTitle() || '').trim()); return n || 'من'; } catch (e) { return 'من'; } }
    /* ۱.۳.۸۸: نفراتی که یک بار وارد شده‌اند (برای انتخاب سریع) */
    var HK_DONG_PEOPLE_KEY = STORAGE_KEY + '_dongPeople';
    function hkDongPeople() { try { var a = JSON.parse(localStorage.getItem(HK_DONG_PEOPLE_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []; } catch (e) { return []; } }
    function hkDongPeopleSave(a) { try { localStorage.setItem(HK_DONG_PEOPLE_KEY, JSON.stringify(a)); } catch (e) {} }
    function hkDongPeopleAdd(names) { var a = hkDongPeople(), me = hkDongMe(); names.forEach(function (n) { n = String(n || '').trim(); if (n && n !== me && a.indexOf(n) < 0) a.push(n); }); hkDongPeopleSave(a); }
    function hkDongName(g, id) { var m = g.members.filter(function (x) { return x.id === id; })[0]; return m ? m.name : '؟'; }
    function hkDongTotal(g) { return g.expenses.reduce(function (t, e) { return t + (Number(e.amount) || 0); }, 0); }
    function hkDongToday() { var t = getTodayPersian(); return { y: t.y, m: t.m, d: t.d }; }
    function hkDongDate(x) { return (x && x.d && x.m) ? toPersianDigits(String(x.d)) + ' ' + MONTHS[x.m - 1] : ''; }
    function hkDongAmt(n) { return formatNum(Math.round(Number(n) || 0)); }
    function hkDongMoneyInput(inp) {
      inp.inputMode = 'numeric'; inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('enterkeyhint', 'done');
      inp.addEventListener('input', function () { var dg = toEnglishDigits(inp.value).replace(/[^0-9]/g, ''); inp.value = dg ? formatNum(parseInt(dg, 10)) : ''; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { inp.blur(); } catch (eB) {} } });
    }
    function hkDongTextInput(inp, ph) {
      inp.type = 'text'; inp.className = 'hk-dg-in'; inp.placeholder = ph || ''; inp.setAttribute('enterkeyhint', 'done');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { inp.blur(); } catch (eB) {} } });
    }
    /* متن اشتراک‌گذاری: خرج کل، وضعیت هر نفر و پرداخت‌های پیشنهادی */
    function hkDongShareText(g) {
      var bal = hkDongBalances(g), paid = {}, share = {};
      g.members.forEach(function (m) { paid[m.id] = 0; share[m.id] = 0; });
      g.expenses.forEach(function (e) {
        paid[e.payer] = (paid[e.payer] || 0) + (Number(e.amount) || 0);
        Object.keys(e.shares || {}).forEach(function (id) { share[id] = (share[id] || 0) + (Number(e.shares[id]) || 0); });
      });
      var L = ['دُنگ «' + g.name + '»', 'خرج کل: ' + hkDongAmt(hkDongTotal(g)) + ' تومان', ''];
      g.members.forEach(function (m) {
        var v = Math.round(bal[m.id] || 0);
        L.push(m.name + ': پرداخت ' + hkDongAmt(paid[m.id]) + ' · سهم ' + hkDongAmt(share[m.id]) + ' · ' + (v > 0 ? 'طلبکار ' + hkDongAmt(v) : v < 0 ? 'بدهکار ' + hkDongAmt(-v) : 'تسویه'));
      });
      var tr = hkDongPlan(g);
      L.push('');
      if (tr.length) { L.push('برای تسویه:'); tr.forEach(function (t) { L.push(hkDongName(g, t.from) + ' ← به ' + hkDongName(g, t.to) + ': ' + hkDongAmt(t.amount) + ' تومان' + (t.paid ? ' (پرداخت شد)' : '')); }); }
      else L.push('همه تسویه‌اند.');
      L.push('', 'حساب‌کتاب');
      return L.join('\n');
    }
    function hkDongShare(g) {
      var text = hkDongShareText(g);
      var copy = function () {
        try { navigator.clipboard.writeText(text).then(function () { showToast('متن دُنگ کپی شد'); }).catch(function () { showToast('اشتراک‌گذاری ممکن نشد', 'warn'); }); }
        catch (e) { showToast('اشتراک‌گذاری ممکن نشد', 'warn'); }
      };
      try { if (navigator.share) { navigator.share({ title: 'دُنگ ' + g.name, text: text }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); }); return; } } catch (eS) {}
      copy();
    }

    /* ---------- نما ---------- */
    var _hkDongView = { gid: '' };
    function openDongModal() {
      try { closeSideMenu(); } catch (e) {}
      var old = document.getElementById('hkDong'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkDong'; ov.className = 'modal-overlay open hk-dong'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100500;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-dg-box'; ov.appendChild(bx);
      /* «بازگشت»: از گروه به فهرست، از فهرست بسته شود */
      ov._hkCancel = function () { if (_hkDongView.gid) { _hkDongView.gid = ''; hkDongRender(); } else ov.remove(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov._hkCancel(); });
      document.body.appendChild(ov);
      _hkDongView.gid = '';
      hkDongRender();
    }
    function closeDongModal() { var ov = document.getElementById('hkDong'); if (ov) ov.remove(); }
    function hkDongRender() {
      var ov = document.getElementById('hkDong'); if (!ov) return;
      var bx = ov.querySelector('.hk-dg-box'), D = hkDongLoad();
      var g = _hkDongView.gid && D.groups.filter(function (x) { return x.id === _hkDongView.gid; })[0];
      if (!g) { _hkDongView.gid = ''; hkDongRenderList(bx, D); } else hkDongRenderGroup(bx, D, g);
    }
    function hkDongRenderList(bx, D) {
      var h = '<div class="hk-dg-t">دُنگ</div><div class="hk-dg-intro">خرج‌های مشترک (سفر، مهمانی، خانهٔ دانشجویی و …) را بین دوستان تقسیم کنید. جداست و روی حساب‌کتاب شما اثری ندارد.</div><div class="hk-dg-list">';
      if (!D.groups.length) h += '<div class="hk-dg-empty">هنوز گروهی نساخته‌اید.</div>';
      D.groups.forEach(function (g) {
        var tr = hkDongPlan(g), open = tr.reduce(function (t, x) { return t + (x.paid ? 0 : x.amount); }, 0);
        h += '<button type="button" class="hk-dg-card" data-g="' + escapeHtml(g.id) + '"><b>' + escapeHtml(g.name) + '</b><span class="hk-dg-sub">' + toPersianDigits(String(g.members.length)) + ' نفر · خرج کل ' + hkDongAmt(hkDongTotal(g)) + '</span>' +
          '<span class="hk-dg-st ' + (open ? 'open' : 'done') + '">' + (open ? 'تسویه‌نشده: ' + hkDongAmt(open) : (g.expenses.length ? 'تسویه است' : 'بدون خرج')) + '</span></button>';
      });
      h += '</div><div class="hk-rax-acts hk-dg-acts"><button type="button" class="modal-btn yes hk-dg-new">گروه تازه</button><button type="button" class="modal-btn no hk-dg-close">بستن</button></div>';
      bx.innerHTML = h;
      bx.querySelectorAll('.hk-dg-card').forEach(function (c) { c.onclick = function () { _hkDongView.gid = c.getAttribute('data-g'); hkDongRender(); }; });
      bx.querySelector('.hk-dg-new').onclick = function () { hkDongGroupEditor(null); };
      bx.querySelector('.hk-dg-close').onclick = closeDongModal;
    }
    function hkDongRenderGroup(bx, D, g) {
      var bal = hkDongBalances(g), tr = hkDongPlan(g);
      var h = '<div class="hk-dg-t">' + escapeHtml(g.name) + '</div>';
      h += '<div class="hk-dg-sum"><span>خرج کل</span><b>' + hkDongAmt(hkDongTotal(g)) + ' <small>تومان</small></b></div>';
      h += '<div class="hk-dg-h">وضعیت هر نفر</div><div class="hk-dg-bal">';
      g.members.forEach(function (m) {
        var v = Math.round(bal[m.id] || 0);
        h += '<div class="hk-dg-row"><span>' + escapeHtml(m.name) + '</span><b class="' + (v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero') + '">' + (v > 0 ? 'طلبکار ' + hkDongAmt(v) : v < 0 ? 'بدهکار ' + hkDongAmt(-v) : 'تسویه') + '</b></div>';
      });
      h += '</div><div class="hk-dg-h">برای تسویه</div><div class="hk-dg-tr">';
      if (!tr.length) h += '<div class="hk-dg-empty">' + (g.expenses.length ? 'همه تسویه‌اند.' : 'هنوز خرجی ثبت نشده.') + '</div>';
      tr.forEach(function (t, i) {
        /* ۱.۳.۸۸: پیش‌فرض نارنجی «پرداخت نشده»؛ یک ضربه = سبز «پرداخت شد»، ضربهٔ دوباره = برگشت (بی پیام تأیید) */
        h += '<div class="hk-dg-row hk-dg-pay' + (t.paid ? ' paid' : '') + '"><span><b>' + escapeHtml(hkDongName(g, t.from)) + '</b> ← به <b>' + escapeHtml(hkDongName(g, t.to)) + '</b></span><span class="hk-dg-pa">' + hkDongAmt(t.amount) + '</span><button type="button" class="hk-dg-paid' + (t.paid ? ' on' : '') + '" data-i="' + i + '">' + (t.paid ? 'پرداخت شد' : 'پرداخت نشده') + '</button></div>';
      });
      h += '</div><div class="hk-dg-h">خرج‌ها</div><div class="hk-dg-exp">';
      if (!g.expenses.length) h += '<div class="hk-dg-empty">با «خرج تازه» اولین خرج را ثبت کنید.</div>';
      g.expenses.slice().reverse().forEach(function (e) {
        var n = Object.keys(e.shares || {}).length;
        h += '<button type="button" class="hk-dg-row hk-dg-e" data-e="' + escapeHtml(e.id) + '"><span class="hk-dg-ed"><b>' + escapeHtml(e.desc || 'خرج') + '</b><small>' + escapeHtml(hkDongName(g, e.payer)) + ' پرداخت کرد · بین ' + toPersianDigits(String(n)) + ' نفر' + (e.mode && e.mode !== 'eq' ? ' (نامساوی)' : '') + (hkDongDate(e) ? ' · ' + hkDongDate(e) : '') + '</small></span><span class="hk-dg-pa">' + hkDongAmt(e.amount) + '</span></button>';
      });
      h += '</div><div class="hk-rax-acts hk-dg-acts"><button type="button" class="modal-btn yes hk-dg-add">خرج تازه</button><button type="button" class="modal-btn hk-dg-share">اشتراک‌گذاری</button></div>' +
        '<div class="hk-rax-acts hk-dg-acts2"><button type="button" class="modal-btn hk-dg-edit">اعضا و نام</button><button type="button" class="modal-btn hk-dg-del">حذف گروه</button><button type="button" class="modal-btn no hk-dg-back">بازگشت</button></div>';
      bx.innerHTML = h;
      bx.querySelectorAll('.hk-dg-paid').forEach(function (b) {
        b.onclick = function () {
          var t = tr[+b.getAttribute('data-i')]; if (!t) return;
          var D2 = hkDongLoad(), g2 = D2.groups.filter(function (x) { return x.id === g.id; })[0]; if (!g2) return;
          if (t.paid) g2.settles = g2.settles.filter(function (s) { return s.id !== t.sid; });
          else { var td = hkDongToday(); g2.settles.push({ id: hkDongId('s'), from: t.from, to: t.to, amount: t.amount, y: td.y, m: td.m, d: td.d, at: Date.now() }); }
          hkDongSave(D2); hkDongRender();
        };
      });
      bx.querySelectorAll('.hk-dg-e').forEach(function (b) { b.onclick = function () { hkDongExpenseEditor(g.id, b.getAttribute('data-e')); }; });
      bx.querySelector('.hk-dg-add').onclick = function () {
        if (g.members.length < 2) { showToast('اول دست‌کم دو نفر به گروه اضافه کنید'); hkDongGroupEditor(g.id); return; }
        hkDongExpenseEditor(g.id, null);
      };
      bx.querySelector('.hk-dg-share').onclick = function () { hkDongShare(g); };
      bx.querySelector('.hk-dg-edit').onclick = function () { hkDongGroupEditor(g.id); };
      bx.querySelector('.hk-dg-del').onclick = function () {
        askConfirm('گروه «' + g.name + '» با همهٔ خرج‌هایش حذف شود؟', function () {
          var D2 = hkDongLoad(); D2.groups = D2.groups.filter(function (x) { return x.id !== g.id; });
          hkDongSave(D2); _hkDongView.gid = ''; hkDongRender();
        });
      };
      bx.querySelector('.hk-dg-back').onclick = function () { _hkDongView.gid = ''; hkDongRender(); };
    }
    /* پنجرهٔ کوچک روی دنگ (ساخت/ویرایش گروه، خرج) */
    function hkDongSheet(title) {
      var old = document.getElementById('hkDongEd'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkDongEd'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100520;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-dg-box hk-dg-edbox'; ov.appendChild(bx);
      bx.innerHTML = '<div class="hk-dg-t">' + escapeHtml(title) + '</div>';
      ov._hkCancel = function () { ov.remove(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
      return { ov: ov, bx: bx };
    }
    function hkDongGroupEditor(gid) {
      var D = hkDongLoad(), g0 = gid && D.groups.filter(function (x) { return x.id === gid; })[0];
      var st = { name: g0 ? g0.name : '', members: g0 ? g0.members.map(function (m) { return { id: m.id, name: m.name }; }) : [{ id: hkDongId('m'), name: hkDongMe() }] };
      var used = {};
      if (g0) {
        g0.expenses.forEach(function (e) { used[e.payer] = 1; Object.keys(e.shares || {}).forEach(function (id) { used[id] = 1; }); });
        g0.settles.forEach(function (s) { used[s.from] = 1; used[s.to] = 1; });
      }
      var sh = hkDongSheet(g0 ? 'اعضا و نام گروه' : 'گروه تازه'), bx = sh.bx;
      bx.classList.add('hk-dg-kb');
      /* ۱.۳.۸۸: صفحه‌کلید در طول تایپ نام گروه و نفرات باز می‌ماند (Enter و دکمه‌ها فوکوس را نمی‌گیرند)؛ پایان کار فقط با «ثبت» */
      var keep = function (el) { el.addEventListener('mousedown', function (e) { e.preventDefault(); }); el.addEventListener('touchstart', function () { el._hkKeep = Date.now(); }, { passive: true }); };
      var nm = document.createElement('input'); nm.type = 'text'; nm.className = 'hk-dg-in'; nm.placeholder = 'نام گروه (مثلاً سفر شمال)'; nm.value = st.name; nm.maxLength = 30; nm.setAttribute('enterkeyhint', 'next');
      var lab = document.createElement('div'); lab.className = 'hk-dg-h'; lab.textContent = 'اعضا';
      var chips = document.createElement('div'); chips.className = 'hk-dg-chips';
      var saved = document.createElement('div'); saved.className = 'hk-dg-saved';
      var addRow = document.createElement('div'); addRow.className = 'hk-dg-addm';
      var mi = document.createElement('input'); mi.type = 'text'; mi.className = 'hk-dg-in'; mi.placeholder = 'نام نفر تازه'; mi.maxLength = 20; mi.setAttribute('enterkeyhint', 'enter');
      var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'hk-dg-addb'; mb.textContent = 'افزودن'; keep(mb);
      var err = document.createElement('div'); err.className = 'sp-pick-err';
      addRow.appendChild(mi); addRow.appendChild(mb);
      var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
      var drawSaved = function () {
        saved.innerHTML = '';
        hkDongPeople().filter(function (n) { return !st.members.some(function (m) { return norm(m.name) === norm(n); }); }).forEach(function (n) {
          var c = document.createElement('span'); c.className = 'hk-dg-pp';
          var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-dg-ppb'; b.textContent = n; keep(b);
          b.onclick = function () { st.members.push({ id: hkDongId('m'), name: n }); drawChips(); drawSaved(); };
          var x = document.createElement('button'); x.type = 'button'; x.className = 'hk-del-x hk-dg-ppx'; x.textContent = HK_DEL_X; x.setAttribute('aria-label', 'حذف از فهرست'); keep(x);
          x.onclick = function (e) { e.stopPropagation(); hkDongPeopleSave(hkDongPeople().filter(function (q) { return q !== n; })); drawSaved(); };
          c.appendChild(b); c.appendChild(x); saved.appendChild(c);
        });
        saved.style.display = saved.children.length ? '' : 'none';
      };
      var drawChips = function () {
        chips.innerHTML = '';
        st.members.forEach(function (m) {
          var c = document.createElement('span'); c.className = 'hk-dg-chip'; c.innerHTML = '<span>' + escapeHtml(m.name) + '</span>';
          if (!used[m.id]) {
            var x = document.createElement('button'); x.type = 'button'; x.className = 'hk-del-x hk-dg-chipx'; x.textContent = HK_DEL_X; x.setAttribute('aria-label', 'حذف'); keep(x);
            x.onclick = function () { st.members = st.members.filter(function (q) { return q !== m; }); drawChips(); drawSaved(); };
            c.appendChild(x);
          }
          chips.appendChild(c);
        });
      };
      var addMember = function () {
        var v = norm(mi.value); if (!v) return;
        if (st.members.some(function (m) { return norm(m.name) === v; })) { err.textContent = 'این نام در گروه هست'; return; }
        err.textContent = ''; st.members.push({ id: hkDongId('m'), name: v }); mi.value = ''; drawChips(); drawSaved();
        try { mi.focus({ preventScroll: true }); } catch (eF) {}
      };
      mb.onclick = addMember;
      mi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addMember(); } });
      nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { mi.focus({ preventScroll: true }); } catch (eF) {} } });
      var acts = document.createElement('div'); acts.className = 'hk-rax-acts hk-dg-acts';
      acts.innerHTML = '<button type="button" class="modal-btn yes hk-dg-ok">ثبت</button><button type="button" class="modal-btn no hk-dg-no">انصراف</button>';
      [nm, lab, chips, saved, addRow, err, acts].forEach(function (el) { bx.appendChild(el); });
      drawChips(); drawSaved();
      setTimeout(function () { try { (g0 ? mi : nm).focus({ preventScroll: true }); } catch (eF) {} }, 30);
      acts.querySelector('.hk-dg-no').onclick = function () { sh.ov.remove(); };
      acts.querySelector('.hk-dg-ok').onclick = function () {
        if (norm(mi.value)) addMember();
        var name = norm(nm.value);
        if (!name) { err.textContent = 'نام گروه را بنویسید'; try { nm.focus(); } catch (eF) {} return; }
        if (st.members.length < 2) { err.textContent = 'دست‌کم دو نفر لازم است'; return; }
        hkDongPeopleAdd(st.members.map(function (m) { return m.name; }));
        var D2 = hkDongLoad(), g2 = gid && D2.groups.filter(function (x) { return x.id === gid; })[0];
        if (g2) { g2.name = name; g2.members = st.members; }
        else { g2 = { id: hkDongId('g'), name: name, members: st.members, expenses: [], settles: [], at: Date.now() }; D2.groups.push(g2); }
        hkDongSave(D2); sh.ov.remove(); _hkDongView.gid = g2.id; hkDongRender();
      };
    }
    function hkDongExpenseEditor(gid, eid) {
      var D = hkDongLoad(), g = D.groups.filter(function (x) { return x.id === gid; })[0]; if (!g) return;
      var e0 = eid && g.expenses.filter(function (x) { return x.id === eid; })[0];
      var st = {
        payer: e0 ? e0.payer : g.members[0].id,
        part: e0 ? Object.keys(e0.shares || {}) : g.members.map(function (m) { return m.id; }),
        mode: e0 && e0.mode && e0.mode !== 'eq' ? 'uneq' : 'eq',
        w: e0 && e0.weights ? Object.assign({}, e0.weights) : {}
      };
      var sh = hkDongSheet(e0 ? 'ویرایش خرج' : 'خرج تازه'), bx = sh.bx;
      var ds = document.createElement('input'); hkDongTextInput(ds, 'شرح (مثلاً شام)'); ds.value = e0 ? (e0.desc || '') : ''; ds.maxLength = 40;
      var am = document.createElement('input'); am.type = 'text'; am.className = 'hk-dg-in hk-dg-amt'; am.placeholder = 'مبلغ (تومان)'; hkDongMoneyInput(am);
      am.value = e0 ? formatNum(e0.amount) : '';
      var h1 = document.createElement('div'); h1.className = 'hk-dg-h'; h1.textContent = 'چه کسی پرداخت کرد؟';
      var payW = document.createElement('div'); payW.className = 'hk-dg-chips';
      var h2 = document.createElement('div'); h2.className = 'hk-dg-h'; h2.textContent = 'بین چه کسانی؟';
      var partW = document.createElement('div'); partW.className = 'hk-dg-chips';
      var seg = document.createElement('div'); seg.className = 'hk-re-seg hk-dg-seg';
      seg.innerHTML = '<button type="button" class="hk-re-segb" data-v="eq">مساوی</button><button type="button" class="hk-re-segb" data-v="uneq">نامساوی</button>';
      var shW = document.createElement('div'); shW.className = 'hk-dg-shares';
      var err = document.createElement('div'); err.className = 'sp-pick-err';
      var acts = document.createElement('div'); acts.className = 'hk-rax-acts hk-dg-acts';
      acts.innerHTML = '<button type="button" class="modal-btn yes hk-dg-ok">ثبت</button>' + (e0 ? '<button type="button" class="modal-btn hk-dg-edel">حذف</button>' : '') + '<button type="button" class="modal-btn no hk-dg-no">انصراف</button>';
      [ds, am, h1, payW, h2, partW, seg, shW, err, acts].forEach(function (el) { bx.appendChild(el); });
      var amount = function () { return parseAmount(am.value) || 0; };
      var drawShares = function () {
        shW.innerHTML = '';
        var ids = g.members.map(function (m) { return m.id; }).filter(function (id) { return st.part.indexOf(id) >= 0; });
        if (st.mode === 'eq') {
          var a = amount();
          if (a && ids.length) {
            var sp = hkDongSplitEq(a, ids), vals = ids.map(function (id) { return sp[id]; });
            var same = vals.every(function (v) { return v === vals[0]; });
            shW.innerHTML = '<div class="hk-dg-note">سهم هر نفر: ' + (same ? hkDongAmt(vals[0]) : hkDongAmt(Math.min.apply(null, vals)) + ' تا ' + hkDongAmt(Math.max.apply(null, vals))) + ' تومان</div>';
          }
          return;
        }
        /* ۱.۳.۸۸: نامساوی: تعداد نفرِ هر عضو (پیش‌فرض ۱)، سهم هر کدام همان‌جا */
        ids.forEach(function (id) {
          var r = document.createElement('div'); r.className = 'hk-dg-shr';
          r.innerHTML = '<span>' + escapeHtml(hkDongName(g, id)) + '</span>';
          var i = document.createElement('input'); i.type = 'text'; i.className = 'hk-dg-in hk-dg-wn'; i.inputMode = 'numeric'; i.setAttribute('inputmode', 'numeric'); i.setAttribute('enterkeyhint', 'done');
          i.value = toPersianDigits(String(st.w[id] == null ? 1 : st.w[id]));
          var lb = document.createElement('small'); lb.className = 'hk-dg-wl'; lb.textContent = 'نفر';
          var sv = document.createElement('b'); sv.className = 'hk-dg-wv';
          i.addEventListener('input', function () { var n = parseInt(toEnglishDigits(i.value).replace(/[^0-9]/g, ''), 10); st.w[id] = isNaN(n) ? 0 : Math.min(n, 99); i.value = isNaN(n) ? '' : toPersianDigits(String(st.w[id])); drawWv(); });
          i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); try { i.blur(); } catch (eB) {} } });
          r.appendChild(i); r.appendChild(lb); r.appendChild(sv); shW.appendChild(r);
        });
        drawWv();
      };
      var wOf = function (ids) { var o = {}; ids.forEach(function (id) { o[id] = st.w[id] == null ? 1 : st.w[id]; }); return o; };
      var drawWv = function () {
        var ids = g.members.map(function (m) { return m.id; }).filter(function (id) { return st.part.indexOf(id) >= 0; });
        var a0 = amount(), sp = a0 ? hkDongSplitW(a0, ids, wOf(ids)) : {};
        shW.querySelectorAll('.hk-dg-shr').forEach(function (r, k) { var b = r.querySelector('.hk-dg-wv'); if (b) b.textContent = a0 ? hkDongAmt(sp[ids[k]] || 0) : ''; });
      };
      var drawChips = function () {
        payW.innerHTML = ''; partW.innerHTML = '';
        g.members.forEach(function (m) {
          var p = document.createElement('button'); p.type = 'button'; p.className = 'hk-dg-chip hk-dg-pick' + (st.payer === m.id ? ' on' : ''); p.textContent = m.name;
          p.onclick = function () { st.payer = m.id; drawChips(); };
          payW.appendChild(p);
          var q = document.createElement('button'); q.type = 'button'; q.className = 'hk-dg-chip hk-dg-pick' + (st.part.indexOf(m.id) >= 0 ? ' on' : ''); q.textContent = m.name;
          q.onclick = function () { var k = st.part.indexOf(m.id); if (k >= 0) st.part.splice(k, 1); else st.part.push(m.id); drawChips(); drawShares(); };
          partW.appendChild(q);
        });
        seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st.mode); });
      };
      seg.querySelectorAll('button').forEach(function (b) { b.onclick = function () { st.mode = b.dataset.v; drawChips(); drawShares(); }; });
      am.addEventListener('input', function () { if (st.mode === 'eq') drawShares(); else drawWv(); });
      drawChips(); drawShares();
      acts.querySelector('.hk-dg-no').onclick = function () { sh.ov.remove(); };
      if (e0) acts.querySelector('.hk-dg-edel').onclick = function () {
        askConfirm('خرج «' + (e0.desc || 'خرج') + '» حذف شود؟', function () {
          var D2 = hkDongLoad(), g2 = D2.groups.filter(function (x) { return x.id === gid; })[0]; if (!g2) return;
          g2.expenses = g2.expenses.filter(function (x) { return x.id !== eid; });
          hkDongSave(D2); sh.ov.remove(); hkDongRender();
        });
      };
      acts.querySelector('.hk-dg-ok').onclick = function () {
        var a = amount();
        if (!(a > 0)) { err.textContent = 'مبلغ را بنویسید'; return; }
        var ids = g.members.map(function (m) { return m.id; }).filter(function (id) { return st.part.indexOf(id) >= 0; });
        if (!ids.length) { err.textContent = 'دست‌کم یک نفر را برای تقسیم انتخاب کنید'; return; }
        var shares;
        if (st.mode === 'eq') shares = hkDongSplitEq(a, ids);
        else {
          var wts = wOf(ids);
          if (!ids.some(function (id) { return wts[id] > 0; })) { err.textContent = 'تعداد نفر را بنویسید'; return; }
          shares = hkDongSplitW(a, ids, wts);
        }
        var D2 = hkDongLoad(), g2 = D2.groups.filter(function (x) { return x.id === gid; })[0]; if (!g2) return;
        var td = hkDongToday();
        var rec = { id: e0 ? e0.id : hkDongId('e'), desc: String(ds.value || '').trim(), amount: a, payer: st.payer, shares: shares, mode: st.mode === 'eq' ? 'eq' : 'w', weights: st.mode === 'eq' ? undefined : wOf(ids), y: e0 ? e0.y : td.y, m: e0 ? e0.m : td.m, d: e0 ? e0.d : td.d, at: e0 ? e0.at : Date.now() };
        if (e0) g2.expenses = g2.expenses.map(function (x) { return x.id === eid ? rec : x; }); else g2.expenses.push(rec);
        hkDongSave(D2); sh.ov.remove(); hkDongRender();
      };
    }
    /* پشتیبان: کامل یا با تیک «دنگ» */
    function hkDongExport() { var D = hkDongLoad(); return D.groups.length ? D : null; }
    function hkDongRestore(src, mode) {
      if (!src || typeof src !== 'object' || !Array.isArray(src.groups)) return;
      if (mode === 'replace') { hkDongSave({ groups: src.groups }); return; }
      var cur = hkDongLoad(), ids = {};
      cur.groups.forEach(function (g) { ids[g.id] = 1; });
      src.groups.forEach(function (g) { if (g && g.id && !ids[g.id]) cur.groups.push(g); });
      hkDongSave(cur);
    }
    try { Object.assign(window, { openDongModal: openDongModal, closeDongModal: closeDongModal, hkDongTransfers: hkDongTransfers, hkDongBalances: hkDongBalances, hkDongSplitEq: hkDongSplitEq, hkDongShareText: hkDongShareText, hkDongLoad: hkDongLoad, hkDongSave: hkDongSave, hkDongExport: hkDongExport, hkDongRestore: hkDongRestore }); } catch (eDg) {}
