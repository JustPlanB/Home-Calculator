    /* ===== ۱.۴.۲۴: دستیار هوشمند — دکمهٔ صفحهٔ اصلی و پنجرهٔ گفتگو =====
       دکمهٔ دایره‌ای (آیکون حباب درخشان) پایین-چپ صفحهٔ اصلی؛ با زدن، پنجرهٔ دستیار باز می‌شود.
       این بخش فقط نمایش و ورودی را انجام می‌دهد؛ منطق در 18b و ابزارها در 18c است. */
    var HK_ASST_EXAMPLES = ['بیمه تویوتا را پیدا کن', 'تراکنش‌های بالای ده میلیون را پیدا کن', 'جمع هزینه‌های این ماه چقدر شده؟', 'درآمد و هزینه این ماه را با ماه قبل مقایسه کن'];
    var _hkAsstLog = [];
    var _hkAsstEl = null;
    function hkAsstEl(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    function hkAsstFmtDate(r) {
      return toPersianDigits(r.y + '/' + r.m + '/' + r.d);
    }
    function hkAsstRenderItem(it) {
      var card = hkAsstEl('button', 'hk-asst-item');
      card.type = 'button';
      card.setAttribute('aria-expanded', 'false');
      var top = hkAsstEl('div', 'hk-asst-item-top');
      var left = hkAsstEl('div', 'hk-asst-item-l');
      left.appendChild(hkAsstEl('div', 'hk-asst-item-d', it.desc || '—'));
      left.appendChild(hkAsstEl('div', 'hk-asst-item-m', toPersianDigits(it.month.replace('-', '/')) + (it.day ? ' · ' + toPersianDigits(String(it.day)) : '') + (it.section ? ' · ' + it.section : '')));
      top.appendChild(left);
      var amt = hkAsstEl('div', 'hk-asst-item-a', hkAsstMoney(it.amount));
      amt.style.color = it.tab === 'income' ? 'var(--hk-income)' : 'var(--hk-expense)';
      top.appendChild(amt);
      card.appendChild(top);
      var det = hkAsstEl('div', 'hk-asst-item-x');
      det.hidden = true;
      [['نوع', it.tab === 'income' ? 'درآمد' : 'هزینه'], ['حساب', it.account || '—'], ['بخش', it.section || '—'],
        ['موضوع', it.context === 'project' ? (it.subject || 'پروژه') : 'شخصی'], ['شناسه', it.id || '—']].forEach(function (kv) {
        var row = hkAsstEl('div', 'hk-asst-kv');
        row.appendChild(hkAsstEl('span', 'hk-asst-k', kv[0]));
        row.appendChild(hkAsstEl('span', 'hk-asst-v', kv[1]));
        det.appendChild(row);
      });
      card.appendChild(det);
      card.addEventListener('click', function () {
        var open = card.getAttribute('aria-expanded') !== 'true';
        card.setAttribute('aria-expanded', open ? 'true' : 'false');
        det.hidden = !open;
      });
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
      if (!_hkAsstEl) return;
      var log = _hkAsstEl.querySelector('.hk-asst-log');
      var empty = log.querySelector('.hk-asst-empty');
      if (empty) empty.remove();
      var bub = hkAsstEl('div', 'hk-asst-msg hk-asst-' + (msg.role === 'user' ? 'me' : 'bot'));
      bub.appendChild(hkAsstEl('div', 'hk-asst-txt', msg.text));
      if (msg.kind === 'result') bub.appendChild(hkAsstRenderResult(msg));
      log.appendChild(bub);
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
      var reply;
      try { reply = hkAsstAsk(q); }
      catch (e) { reply = { role: 'bot', kind: 'text', text: 'خطایی پیش آمد. دوباره امتحان کن.' }; }
      hkAsstAppend(reply);
    }
    function hkAsstClear() {
      _hkAsstLog = [];
      hkAsstShowEmpty();
    }
    function hkAsstOpen() {
      if (!_hkAsstEl) return;
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
    function hkAsstInit() {
      try { if (document.getElementById('hkAsstSheet')) return; hkAsstBuild(); } catch (eI) { try { console.error('assistant', eI); } catch (e2) {} }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hkAsstInit);
    else hkAsstInit();
    try { window.hkAsstAsk = hkAsstAsk; window.hkAsstOpen = hkAsstOpen; window.hkAsstClose = hkAsstClose; } catch (eW) {}
