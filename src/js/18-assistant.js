    /* ===== ۱.۴.۲۴: دستیار هوشمند — دکمهٔ صفحهٔ اصلی و پنجرهٔ گفتگو =====
       دکمهٔ دایره‌ای (آیکون حباب درخشان) پایین-چپ صفحهٔ اصلی؛ با زدن، پنجرهٔ دستیار باز می‌شود.
       این بخش فقط نمایش و ورودی را انجام می‌دهد؛ منطق در 18b و ابزارها در 18c است. */
    var HK_ASST_EXAMPLES = ['بیمه تویوتا را پیدا کن', 'تراکنش‌های بالای ده میلیون را پیدا کن', 'جمع هزینه‌های آبان', 'بنزین چند تا؟', 'درآمد و هزینه این ماه را با ماه قبل مقایسه کن'];
    var _hkAsstLog = [];
    var _hkAsstEl = null;
    function hkAsstEl(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    /* آواتار: کاربر عکس پروفایل خودش را دارد؛ اگر نبود، حرف اول اسمش. دستیار آیکون سبز برنامه را نشان می‌دهد */
    function hkAsstAvatar(me) {
      var av = hkAsstEl('div', 'hk-asst-av' + (me ? '' : ' hk-asst-av-bot'));
      if (!me) { av.appendChild(hkAsstEl('i')); return av; }
      var src = '', name = '';
      try { src = hkAvatarGet() || ''; } catch (e1) {}
      try { name = String(hkMainTitle() || '').trim(); } catch (e2) {}
      if (src) { var img = document.createElement('img'); img.alt = ''; img.src = src; av.appendChild(img); }
      else av.appendChild(hkAsstEl('span', '', name ? name.charAt(0) : '؟'));
      return av;
    }
    function hkAsstFmtDate(r) {
      return toPersianDigits(r.y + '/' + r.m + '/' + r.d);
    }
    /* باز کردن ردیف در صفحهٔ خودش: همان ماه و بخش، اسکرول آرام و هایلایت همان روشی که برنامه دارد (sp-flash) */
    function hkAsstJump(it) {
      try { hkAsstClose(); } catch (e0) {}
      var cur = periodKey(currentYear, currentMonth), want = periodKey(it.y, it.m);
      if (want !== cur) { try { navigateToPeriod(it.y, it.m); } catch (e1) {} }
      /* هر بخش (کارت) جدول ردیف‌های خودش را دارد؛ همان را باز می‌کنیم و ردیف را پیدا می‌کنیم */
      try { if (typeof openPersonDetail === 'function') openPersonDetail(it.section, it.tab); } catch (e2) {}
      var tries = 0;
      (function wait() {
        var rows = document.querySelectorAll('.person-detail-box tbody tr');
        var tr = rows[it.idx];
        if (!tr && tries++ < 30) { setTimeout(wait, 80); return; }
        if (!tr) return;
        var dur = 0; try { dur = hkSlowScrollTo(tr, 1000); } catch (e3) {}
        setTimeout(function () { tr.classList.add('sp-flash'); setTimeout(function () { tr.classList.remove('sp-flash'); }, 3600); }, dur + 80);
      })();
    }
    function hkAsstRenderItem(it) {
      var card = hkAsstEl('button', 'hk-asst-item');
      card.type = 'button';
      var top = hkAsstEl('div', 'hk-asst-item-top');
      var left = hkAsstEl('div', 'hk-asst-item-l');
      left.appendChild(hkAsstEl('div', 'hk-asst-item-d', it.desc || '—'));
      left.appendChild(hkAsstEl('div', 'hk-asst-item-m', toPersianDigits(it.month.replace('-', '/')) + (it.day ? ' · ' + toPersianDigits(String(it.day)) : '') + (it.section ? ' · ' + it.section : '')));
      top.appendChild(left);
      var amt = hkAsstEl('div', 'hk-asst-item-a', hkAsstMoney(it.amount));
      amt.style.color = it.tab === 'income' ? 'var(--hk-income)' : 'var(--hk-expense)';
      top.appendChild(amt);
      card.appendChild(top);
      var meta = [it.account, it.context === 'project' ? (it.subject || 'پروژه') : ''].filter(Boolean).join(' · ');
      if (meta) card.appendChild(hkAsstEl('div', 'hk-asst-item-x', meta));
      card.setAttribute('aria-label', 'باز کردن این ردیف در برنامه');
      card.addEventListener('click', function () { hkAsstJump(it); });
      return card;
    }
    function hkAsstRenderResult(msg) {
      var wrap = hkAsstEl('div', 'hk-asst-res');
      var d = msg.data || {};
      if (msg.tool === 'transactions.search' && d.items) {
        d.items.forEach(function (it) { wrap.appendChild(hkAsstRenderItem(it)); });
        if (d.count > d.items.length) wrap.appendChild(hkAsstEl('div', 'hk-asst-more', 'فقط ' + toPersianDigits(String(d.items.length)) + ' مورد از ' + toPersianDigits(String(d.count)) + ' نمایش داده شد.'));
      } else if (msg.tool === 'transactions.get' && d.found) {
        wrap.appendChild(hkAsstRenderItem(d.item));
      } else if (msg.tool === 'transactions.group' && d.groups) {
        d.groups.forEach(function (g) {
          var row = hkAsstEl('div', 'hk-asst-grp');
          row.appendChild(hkAsstEl('span', 'hk-asst-gk', d.by === 'month' ? toPersianDigits(g.key.replace('-', '/')) : (g.key === 'income' ? 'درآمد' : g.key === 'expense' ? 'هزینه' : g.key === 'project' ? 'پروژه' : g.key === 'personal' ? 'شخصی' : g.key)));
          row.appendChild(hkAsstEl('span', 'hk-asst-gv', toPersianDigits(String(g.count)) + ' تراکنش · ' + hkAsstMoney(g.sum)));
          wrap.appendChild(row);
        });
      }
      return wrap;
    }
    function hkAsstAppend(msg) {
      _hkAsstLog.push(msg);
      if (!_hkAsstEl) return null;
      var log = _hkAsstEl.querySelector('.hk-asst-log');
      var empty = log.querySelector('.hk-asst-empty');
      if (empty) empty.remove();
      var me = msg.role === 'user';
      var row = hkAsstEl('div', 'hk-asst-msg hk-asst-row ' + (me ? 'hk-asst-me' : 'hk-asst-bot'));
      row.appendChild(hkAsstAvatar(me));
      var bub = hkAsstEl('div', 'hk-asst-bub');
      bub.appendChild(hkAsstEl('div', 'hk-asst-txt', msg.text));
      if (msg.kind === 'result') bub.appendChild(hkAsstRenderResult(msg));
      if (msg.suggestions && msg.suggestions.length) {
        var sg = hkAsstEl('div', 'hk-asst-sugg');
        msg.suggestions.forEach(function (w) {
          var c = hkAsstEl('button', 'hk-asst-chip', w);
          c.type = 'button';
          c.addEventListener('click', function () { hkAsstSend(msg.tool ? 'پیدا کن ' + w : w); });
          sg.appendChild(c);
        });
        bub.appendChild(sg);
      }
      row.appendChild(bub);
      log.appendChild(row);
      return row;
      log.scrollTop = log.scrollHeight;
    }
    function hkAsstShowEmpty() {
      var log = _hkAsstEl.querySelector('.hk-asst-log');
      log.textContent = '';
      var e = hkAsstEl('div', 'hk-asst-empty');
      e.appendChild(hkAsstEl('div', 'hk-asst-hello', 'سلام! دربارهٔ تراکنش‌ها و مبالغ حساب‌کتاب بپرس.'));
      e.appendChild(hkAsstEl('div', 'hk-asst-hint', 'فقط خواندن: چیزی را تغییر نمی‌دهم.'));
      HK_ASST_EXAMPLES.forEach(function (ex) {
        var b = hkAsstEl('button', 'hk-asst-chip', ex);
        b.type = 'button';
        b.addEventListener('click', function () { hkAsstSend(ex); });
        e.appendChild(b);
      });
      log.appendChild(e);
    }
    function hkAsstSend(text) {
      var q = String(text || '').trim();
      if (!q) return;
      hkAsstAppend({ role: 'user', kind: 'text', text: q });
      var input = _hkAsstEl.querySelector('.hk-asst-input');
      input.value = '';
      /* نشانگر «در حال فکر کردن» تا پاسخ برسد؛ پس از آن جایش پاسخ می‌نشیند */
      var wait = hkAsstAppend({ role: 'bot', kind: 'text', text: '…' });
      if (wait) wait.classList.add('hk-asst-wait');
      hkAsstAskAsync(q).then(function (reply) {
        if (wait && wait.parentNode) wait.parentNode.removeChild(wait);
        hkAsstAppend(reply);
      }, function () {
        if (wait && wait.parentNode) wait.parentNode.removeChild(wait);
        hkAsstAppend({ role: 'bot', kind: 'text', text: 'خطایی پیش آمد. دوباره امتحان کن.' });
      });
    }
    function hkAsstClear() {
      _hkAsstLog = [];
      hkAsstShowEmpty();
    }
    function hkAsstOpen() {
      if (!_hkAsstEl) return;
      try { var md = document.getElementById('hkAsstMode'); if (md) md.textContent = HK_ASST_ADAPTERS.local.ready() ? 'مدل محلی' : 'قاعده‌ای (مدل محلی نصب نیست)'; } catch (eM) {}
      _hkAsstEl.classList.add('open');
      _hkAsstEl.setAttribute('aria-hidden', 'false');
      if (!_hkAsstLog.length) hkAsstShowEmpty();
    }
    function hkAsstClose() {
      if (!_hkAsstEl) return;
      _hkAsstEl.classList.remove('open');
      _hkAsstEl.setAttribute('aria-hidden', 'true');
    }
    function hkAsstBuild() {
      var fab = hkAsstEl('button', 'hk-asst-fab');
      fab.type = 'button';
      fab.setAttribute('aria-label', 'دستیار هوشمند');
      fab.appendChild(hkAsstEl('span', 'hk-asst-orb'));
      fab.addEventListener('click', hkAsstOpen);
      document.body.appendChild(fab);

      var sheet = hkAsstEl('div', 'hk-asst-sheet');
      sheet.id = 'hkAsstSheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'دستیار هوشمند');
      sheet.setAttribute('aria-hidden', 'true');
      var head = hkAsstEl('div', 'hk-asst-head');
      var back = hkAsstEl('button', 'hk-asst-back');
      back.type = 'button'; back.setAttribute('aria-label', 'بستن');
      back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      back.addEventListener('click', hkAsstClose);
      head.appendChild(back);
      head.appendChild(hkAsstEl('div', 'hk-asst-title', 'دستیار هوشمند'));
      var titleBox = head.querySelector('.hk-asst-title');
      var mode = hkAsstEl('div', 'hk-asst-mode', 'قاعده‌ای');
      mode.id = 'hkAsstMode';
      if (titleBox) titleBox.appendChild(mode);
      var dl = hkAsstEl('button', 'hk-asst-dl');
      dl.type = 'button'; dl.setAttribute('aria-label', 'دانلود مدل محلی (اختیاری)'); dl.title = 'دانلود مدل محلی (اختیاری، حدود ۱٫۱ گیگابایت)';
      hkAsstDlPaint(dl, 'empty');
      dl.addEventListener('click', function () { hkAsstModelClick(dl); });
      head.insertBefore(dl, head.querySelector('.hk-asst-clear'));
      hkAsstModelRefresh(dl);
      var clr = hkAsstEl('button', 'hk-asst-clear', 'پاک کردن');
      clr.type = 'button';
      clr.addEventListener('click', hkAsstClear);
      head.appendChild(clr);
      sheet.appendChild(head);

      sheet.appendChild(hkAsstEl('div', 'hk-asst-log'));

      var form = hkAsstEl('form', 'hk-asst-form');
      var input = hkAsstEl('textarea', 'hk-asst-input');
      input.rows = 1; input.placeholder = 'درخواستت را بنویس…'; input.setAttribute('aria-label', 'درخواست');
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); } });
      form.appendChild(input);
      var send = hkAsstEl('button', 'hk-asst-send');
      send.type = 'submit'; send.setAttribute('aria-label', 'ارسال');
      send.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      form.appendChild(send);
      form.addEventListener('submit', function (e) { e.preventDefault(); hkAsstSend(input.value); });
      sheet.appendChild(form);

      document.body.appendChild(sheet);
      _hkAsstEl = sheet;
    }
    /* وضعیت دکمهٔ دانلود: خالی (فلش)، در حال دانلود (درصد)، یا ذخیره‌شده (تیک). هر وضعیت دکمه را از نو می‌سازد */
    var HK_ASST_DL_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/></svg>';
    function hkAsstDlPaint(dl, mode, pct) {
      if (!dl) return;
      if (mode === 'done') { dl.innerHTML = HK_TICK_SVG; dl.classList.add('is-done'); dl.classList.remove('is-busy'); return; }
      dl.innerHTML = HK_ASST_DL_ARROW + '<span class="hk-asst-dl-p">' + (mode === 'busy' ? pct : '') + '</span>';
      dl.classList.remove('is-done');
      dl.classList.toggle('is-busy', mode === 'busy');
    }
    function hkAsstModelRefresh(dl) {
      dl = dl || document.querySelector('.hk-asst-dl');
      if (!dl || dl._busy) return;
      hkAsstModelStatus().then(function (done) {
        hkAsstDlPaint(dl, done ? 'done' : 'empty');
        if (done && !HK_ASST_ENGINE.ok && !HK_ASST_ENGINE.loading) { hkAsstLocalLoad().catch(function () {}); }
      });
    }
    function hkAsstModelClick(dl) {
      if (dl._busy) return;
      hkAsstModelStatus().then(function (done) {
        if (done) { try { showToast('مدل از قبل دانلود و ذخیره شده است.'); } catch (e0) {} return; }
        askConfirm('مدل Qwen2.5-1.5B (حدود ۱٫۱ گیگابایت) از Hugging Face دانلود و روی گوشی ذخیره می‌شود. ادامه می‌دهی؟', function () { hkAsstModelStart(dl); });
      });
    }
    function hkAsstModelStart(dl) {
      dl._busy = true;
      hkAsstDlPaint(dl, 'busy', '0%');
      hkAsstModelDownload(function (frac) {
        var sp = dl.querySelector('.hk-asst-dl-p'); if (sp) sp.textContent = Math.round(frac * 100) + '%';
      }).then(function () {
        dl._busy = false;
        try { showToast('مدل ذخیره شد؛ در حال آماده‌سازی…'); } catch (e1) {}
        hkAsstModelRefresh(dl);
        hkAsstLocalLoad().then(function () { try { showToast('مدل محلی آماده است.'); } catch (e3) {} }, function (e4) { try { showToast('مدل آماده نشد: ' + (e4 && e4.message ? e4.message : 'خطا')); } catch (e5) {} });
      }, function (err) {
        dl._busy = false;
        try { showToast('دانلود انجام نشد: ' + (err && err.message ? err.message : 'خطا')); } catch (e2) {}
        hkAsstModelRefresh(dl);
      });
    }
    function hkAsstIsOpen() { return !!(_hkAsstEl && _hkAsstEl.classList.contains('open')); }
    function hkAsstInit() {
      try { if (document.getElementById('hkAsstSheet')) return; hkAsstBuild(); } catch (eI) { try { console.error('assistant', eI); } catch (e2) {} }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hkAsstInit);
    else hkAsstInit();
    try { window.hkAsstAsk = hkAsstAsk; window.hkAsstOpen = hkAsstOpen; window.hkAsstClose = hkAsstClose; window.hkAsstIsOpen = hkAsstIsOpen; } catch (eW) {}
