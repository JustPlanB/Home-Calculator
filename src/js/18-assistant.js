    /* ===== ۱.۴.۲۴: دستیار هوشمند — دکمهٔ صفحهٔ اصلی و پنجرهٔ گفتگو =====
       دکمهٔ دایره‌ای (آیکون حباب درخشان) پایین-چپ صفحهٔ اصلی؛ با زدن، پنجرهٔ دستیار باز می‌شود.
       این بخش فقط نمایش و ورودی را انجام می‌دهد؛ منطق در 18b و ابزارها در 18c است. */
    var HK_ASST_EXAMPLES = ['این ماه چقدر خرج کردم؟', 'وضعیت مالی‌ام چطوره؟', 'چطور می‌تونم کمتر خرج کنم؟', 'آخر ماه چقدر خرج می‌کنم؟', 'بیمه تویوتا را پیدا کن', 'درآمد و هزینه این ماه را با ماه قبل مقایسه کن'];
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
      if (msg.kind !== 'wait') _hkAsstLog.push(msg);
      if (!_hkAsstEl) return null;
      var log = _hkAsstEl.querySelector('.hk-asst-log');
      var empty = log.querySelector('.hk-asst-empty');
      if (empty) empty.remove();
      var me = msg.role === 'user';
      var row = hkAsstEl('div', 'hk-asst-msg hk-asst-row ' + (me ? 'hk-asst-me' : 'hk-asst-bot'));
      row.appendChild(hkAsstAvatar(me));
      var bub = hkAsstEl('div', 'hk-asst-bub');
      if (msg.kind === 'wait') {
        /* ۱.۴.۳۶: همان سه نقطهٔ آبیِ «در حال خواندن پیامک‌ها» (کلاس hk-loading-dots)، کوچک‌شده برای چت */
        var dw = hkAsstEl('span', 'hk-asst-dots'), sc = hkAsstEl('span', 'hk-asst-dots-sc'), dd = hkAsstEl('span', 'hk-loading-dots');
        dd.innerHTML = '<i></i><i></i><i></i>';
        sc.appendChild(dd); dw.appendChild(sc); bub.appendChild(dw);
        row.setAttribute('role', 'status'); row.setAttribute('aria-label', 'در حال پاسخ دادن');
      } else {
        bub.appendChild(hkAsstEl('div', 'hk-asst-txt', msg.text));
      }
      if (msg.kind === 'result') bub.appendChild(hkAsstRenderResult(msg));
      if (msg.suggestions && msg.suggestions.length) {
        var sg = hkAsstEl('div', 'hk-asst-sugg');
        msg.suggestions.forEach(function (w) {
          var c = hkAsstEl('button', 'hk-asst-chip', w);
          c.type = 'button';
          c.addEventListener('click', function () { hkAsstSend(msg.chipRaw ? w : (msg.tool ? 'پیدا کن ' + w : w)); });
          sg.appendChild(c);
        });
        bub.appendChild(sg);
      }
      row.appendChild(bub);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
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
      try { input.form.classList.remove('typing'); } catch (eT) {}
      /* نشانگر «در حال فکر کردن» تا پاسخ برسد؛ پس از آن جایش پاسخ می‌نشیند */
      var wait = hkAsstAppend({ role: 'bot', kind: 'wait', text: '' });
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
      hkAsstSetMode();
      _hkAsstEl.classList.add('open');
      /* ۱.۴.۳۷: دکمهٔ شناورِ متحرک زیر چت باز هم هر فریم رسم می‌شد و تایپ را کند می‌کرد؛ تا وقتی چت بازست پنهان است */
      try { document.body.classList.add('hk-asst-open'); } catch (eO) {}
      _hkAsstEl.setAttribute('aria-hidden', 'false');
      if (!_hkAsstLog.length) hkAsstShowEmpty();
    }
    function hkAsstClose() {
      if (!_hkAsstEl) return;
      _hkAsstEl.classList.remove('open');
      try { document.body.classList.remove('hk-asst-open'); } catch (eO) {}
      _hkAsstEl.setAttribute('aria-hidden', 'true');
    }
    /* ----- صدا: ضبط به متن و گفتگوی صوتی (فقط در اندروید، با موتور تشخیص گفتار گوشی) ----- */
    var HK_ASST_MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5v3"/></svg>';
    var HK_ASST_WAVE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0"/></svg>';
    var _hkVoice = { on: false, state: 'idle', run: 0, fails: 0, handles: [], tts: null };
    function hkAsstVoiceOk() {
      try { var C = window.Capacitor; if (!(C && C.isNativePlatform && C.isNativePlatform())) return false; var P = C.Plugins && C.Plugins.HkSpeech; return !!(P && typeof P.start === 'function'); } catch (e) { return false; }
    }
    function hkAsstSpeechPlugin() { return window.Capacitor.Plugins.HkSpeech; }
    /* رویدادهای افزونهٔ گفتار (شدت صدا، متن نیمه‌کاره)؛ با hkAsstSpeechOff برداشته می‌شود */
    function hkAsstSpeechOn(ev, fn) {
      var h = { dead: false, h: null };
      try { Promise.resolve(hkAsstSpeechPlugin().addListener(ev, function (d) { if (!h.dead) fn(d); })).then(function (x) { if (h.dead) { try { x.remove(); } catch (e0) {} } else h.h = x; }); } catch (e) {}
      return h;
    }
    function hkAsstSpeechOff(h) { if (!h) return; h.dead = true; try { if (h.h) h.h.remove(); } catch (e) {} }
    /* خطای گفتار → پیام مشخص و کار بعدی: cancelled بی‌صدا، quiet یعنی صدایی نیامد، fatal یعنی ادامه بی‌فایده است */
    function hkAsstSpeechErr(err) {
      var m = String((err && (err.code || err.message)) || '') + ' ' + String((err && err.message) || '');
      if (/cancel|replaced/.test(m)) return { cancelled: true };
      var code = (m.match(/speech_error_(\d+)/) || [])[1];
      if (/permission/.test(m) || code === '9') return { fatal: true, text: 'اجازهٔ میکروفون داده نشده؛ از تنظیمات گوشی برای برنامه فعالش کن.' };
      if (code === '6' || code === '7') return { quiet: true, text: 'صدایی نشنیدم.' };
      if (code === '1' || code === '2') return { fatal: true, text: 'به سرویس گفتار وصل نشد؛ تشخیص گفتار فارسی اینترنت می‌خواهد.' };
      if (code === '12' || code === '13') return { fatal: true, text: 'زبان فارسی در سرویس گفتار گوشی نصب نیست؛ از تنظیمات «تایپ صوتی گوگل» فارسی را اضافه کن.' };
      if (code === '8') return { fatal: false, text: 'سرویس گفتار مشغوله؛ چند لحظه بعد دوباره امتحان کن.' };
      return { fatal: true, text: 'تشخیص گفتار ممکن نشد' + (code ? ' (خطای ' + toPersianDigits(code) + ')' : '') + '.' };
    }
    /* یک گفتهٔ فارسی را به متن تبدیل می‌کند */
    function hkAsstListen() {
      return hkAsstSpeechPlugin().start({ lang: 'fa-IR' }).then(function (res) { return String((res && res.text) || '').trim(); });
    }
    /* ضبط از نوار ورودی (۱.۴.۳۸): کادر دو ردیف می‌شود؛ بالا متن زنده (تا چیزی شنیده نشده، نام کاربر)، پایین ✕ لغو، موج صدا، ■ پایان، ↑ پایان و ارسال */
    function hkAsstRecStart(form, input) {
      if (!hkAsstVoiceOk()) { try { showToast('ضبط صدا فقط در برنامهٔ اندروید کار می‌کند.'); } catch (e) {} return; }
      if (form.classList.contains('recording')) { try { hkAsstSpeechPlugin().stop(); } catch (eS) {} return; }
      var base = input.value.trim();
      var txt = form.querySelector('.hk-asst-rc-t'), dots = form.querySelectorAll('.hk-asst-rc-dots i'), lv = [];
      var nm = ''; try { nm = String(hkMainTitle() || '').trim(); } catch (eN) {}
      if (txt) { txt.textContent = nm; txt.classList.add('is-ph'); }
      var paintDots = function () { for (var i = 0; i < dots.length; i++) { var v = lv[lv.length - dots.length + i] || 0; dots[i].style.height = (4 + Math.round(v * 18)) + 'px'; dots[i].style.opacity = String(0.45 + v * 0.55); } };
      paintDots();
      form._autoSend = false;
      form.classList.add('recording');
      var hp = hkAsstSpeechOn('partial', function (d) {
        var t = String((d && d.text) || '').trim();
        if (t) { input.value = (base ? base + ' ' : '') + t; if (txt) { txt.textContent = t; txt.classList.remove('is-ph'); } }
      });
      var hl = hkAsstSpeechOn('level', function (d) {
        lv.push(Math.max(0, Math.min(1, (((d && d.rms) || 0) + 2) / 12)));
        if (lv.length > 60) lv.splice(0, lv.length - 60);
        paintDots();
      });
      var end = function () { hkAsstSpeechOff(hp); hkAsstSpeechOff(hl); form.classList.remove('recording'); };
      hkAsstListen().then(function (t) {
        end();
        var auto = form._autoSend; form._autoSend = false;
        if (!t) { input.value = base; form.classList.toggle('typing', !!base); try { showToast('صدایی تشخیص داده نشد.'); } catch (e1) {} return; }
        input.value = base ? base + ' ' + t : t;
        form.classList.add('typing');
        input.dispatchEvent(new Event('input'));
        if (auto) hkAsstSend(input.value);
      }, function (err) {
        end(); form._autoSend = false;
        input.value = base; form.classList.toggle('typing', !!base);
        var e = hkAsstSpeechErr(err);
        if (!e.cancelled) { try { showToast(e.text); } catch (e2) {} }
      });
    }
    /* متن مناسب خواندن با صدا: بدون خط «فهمیدم»، علامت‌های فهرست و عدد بی‌ریخت */
    function hkAsstSpeechText(reply) {
      var body = String((reply && reply.text) || ''), hd = String((reply && reply.head) || '');
      if (hd && body.indexOf(hd) === 0) body = body.slice(hd.length);
      var lines = body.split('\n').filter(function (l) { return l && !/^«.+» را «.+» در نظر گرفتم/.test(l.trim()); });
      return lines.join('. ').replace(/[•\-–—]+\s*/g, '').replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim().slice(0, 600);
    }
    /* صدای فارسی گوشی: اگر نباشد، پاسخ روی صفحه نوشته می‌شود و گفتگو ادامه می‌یابد */
    function hkAsstTtsVoice() {
      try { var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; for (var i = 0; i < vs.length; i++) if (/^fa/i.test(vs[i].lang)) return vs[i]; } catch (e) {}
      return null;
    }
    /* ۱.۴.۳۸: اول صدای خود اندروید (افزونهٔ بومی)، اگر فارسی نداشت صدای WebView */
    function hkAsstSpeak(text) {
      var pl = null; try { pl = hkAsstSpeechPlugin(); } catch (e0) { pl = null; }
      if (!text || !pl || !pl.speak || _hkVoice.nativeTts === false) return hkAsstSpeakWeb(text);
      return Promise.resolve(pl.speak({ text: String(text) })).then(function () { return true; }, function (err) {
        var m = String((err && (err.message || err.code)) || err || '');
        if (/no_voice/.test(m)) { _hkVoice.nativeTts = false; _hkVoice.needVoice = true; return hkAsstSpeakWeb(text); }
        return false;
      });
    }
    function hkAsstSpeakStop() {
      try { speechSynthesis.cancel(); } catch (e) {}
      try { var pl = hkAsstSpeechPlugin(); if (pl && pl.stopSpeak) pl.stopSpeak(); } catch (e1) {}
    }
    function hkAsstSpeakWeb(text) {
      return new Promise(function (resolve) {
        try {
          if (!('speechSynthesis' in window) || _hkVoice.tts === false || !text) return resolve(false);
          var u = new SpeechSynthesisUtterance(String(text)), v = hkAsstTtsVoice(), started = false, done = false, timer = 0;
          u.lang = 'fa-IR'; if (v) u.voice = v;
          var fin = function (okSpoke) { if (done) return; done = true; clearTimeout(timer); resolve(okSpoke); };
          u.onstart = function () { started = true; };
          u.onend = function () { fin(started); };
          u.onerror = function () { if (!started) _hkVoice.tts = false; fin(started); };
          /* بعد از ۲٫۵ ثانیه شروع نشد: صدای فارسی روی این گوشی نیست */
          timer = setTimeout(function () { if (!started) { _hkVoice.tts = false; try { speechSynthesis.cancel(); } catch (e1) {} fin(false); } }, 2500);
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } catch (e) { resolve(false); }
      });
    }
    function hkAsstVoiceEl(sel) { try { return _hkAsstEl.querySelector(sel); } catch (e) { return null; } }
    /* حالت گوی: listening (با شدت صدا تپش می‌زند)، thinking (چرخش)، speaking (نفس‌کشیدن)، idle (ساکن) */
    function hkAsstVoiceSet(state, text, caption) {
      _hkVoice.state = state;
      var orb = hkAsstVoiceEl('.hk-asst-vorb'), st = hkAsstVoiceEl('.hk-asst-vstat'), cp = hkAsstVoiceEl('.hk-asst-vcap');
      if (orb) { orb.setAttribute('data-s', state); if (state !== 'listening') orb.style.setProperty('--lv', '0'); }
      if (st && text != null) st.textContent = text;
      if (cp) cp.textContent = caption || '';
    }
    function hkAsstVoiceQuiet() {
      _hkVoice.fails++;
      if (_hkVoice.fails >= 3) { hkAsstVoiceSet('idle', 'صدایی نشنیدم. برای ادامه روی گوی بزن.'); return; }
      hkAsstVoiceSet('listening', 'صدایی نشنیدم؛ بگو…');
      var run = _hkVoice.run;
      setTimeout(function () { if (_hkVoice.on && run === _hkVoice.run) hkAsstVoiceLoop(); }, 500);
    }
    function hkAsstVoiceLoop() {
      if (!_hkVoice.on) return;
      var run = ++_hkVoice.run;
      hkAsstVoiceSet('listening', 'در حال شنیدن…');
      hkAsstListen().then(function (t) {
        if (!_hkVoice.on || run !== _hkVoice.run) return;
        if (!t) { hkAsstVoiceQuiet(); return; }
        _hkVoice.fails = 0;
        hkAsstVoiceSet('thinking', 'در حال فکر کردن…');
        hkAsstAppend({ role: 'user', kind: 'text', text: t });
        hkAsstAskAsync(t).then(function (reply) {
          if (!_hkVoice.on || run !== _hkVoice.run) return;
          hkAsstAppend(reply);
          hkAsstVoiceSet('speaking', 'برای قطع کردن روی گوی بزن');
          hkAsstSpeak(hkAsstSpeechText(reply)).then(function (spoke) {
            if (!_hkVoice.on || run !== _hkVoice.run) return;
            if (spoke) { hkAsstVoiceLoop(); return; }
            /* صدا در دسترس نیست: پاسخ نوشته می‌شود، چند ثانیه می‌ماند و گفتگو ادامه دارد */
            var cap = hkAsstSpeechText(reply).slice(0, 220);
            hkAsstVoiceSet('speaking', 'صدای فارسی روی این گوشی نصب نیست؛ پاسخ نوشته شد.', cap);
            try { var fx = hkAsstVoiceEl('.hk-asst-vfix'); if (fx) fx.style.display = _hkVoice.needVoice ? 'block' : 'none'; } catch (eF) {}
            setTimeout(function () { if (_hkVoice.on && run === _hkVoice.run) hkAsstVoiceLoop(); }, Math.min(9000, 2500 + cap.length * 40));
          });
        }, function () { if (_hkVoice.on && run === _hkVoice.run) hkAsstVoiceSet('idle', 'خطایی پیش آمد. برای شروع دوباره روی گوی بزن.'); });
      }, function (err) {
        if (!_hkVoice.on || run !== _hkVoice.run) return;
        var e = hkAsstSpeechErr(err);
        if (e.cancelled) return;
        if (e.quiet) { hkAsstVoiceQuiet(); return; }
        hkAsstVoiceSet('idle', e.text + ' برای شروع دوباره روی گوی بزن.');
      });
    }
    /* لمس گوی: وسط حرف زدنِ دستیار = قطع و گوش دادن؛ وسط گوش دادن = پایان گفتن؛ ساکن = شروع دوباره */
    function hkAsstVoiceOrbTap() {
      if (!_hkVoice.on) return;
      if (_hkVoice.state === 'speaking') { _hkVoice.run++; hkAsstSpeakStop(); hkAsstVoiceLoop(); }
      else if (_hkVoice.state === 'listening') { try { hkAsstSpeechPlugin().stop(); } catch (e2) {} }
      else if (_hkVoice.state === 'idle') { _hkVoice.fails = 0; hkAsstVoiceLoop(); }
    }
    function hkAsstVoiceOpen() {
      if (!hkAsstVoiceOk()) { try { showToast('گفتگوی صوتی فقط در برنامهٔ اندروید کار می‌کند.'); } catch (e) {} return; }
      try { document.activeElement && document.activeElement.blur(); } catch (eB) {}
      _hkVoice.on = true; _hkVoice.fails = 0; _hkVoice.tts = null; _hkVoice.nativeTts = null; _hkVoice.needVoice = false;
      _hkVoice.handles.forEach(hkAsstSpeechOff); _hkVoice.handles = [];
      _hkVoice.handles.push(hkAsstSpeechOn('level', function (d) {
        if (_hkVoice.state !== 'listening') return;
        var o = hkAsstVoiceEl('.hk-asst-vorb'); if (o) o.style.setProperty('--lv', String(Math.max(0, Math.min(1, (((d && d.rms) || 0) + 2) / 12)).toFixed(2)));
      }));
      hkAsstVoiceEl('.hk-asst-voice').classList.add('open');
      hkAsstVoiceLoop();
    }
    function hkAsstVoiceClose() {
      _hkVoice.on = false; _hkVoice.run++;
      hkAsstSpeakStop();
      try { hkAsstSpeechPlugin().cancel(); } catch (e1) {}
      _hkVoice.handles.forEach(hkAsstSpeechOff); _hkVoice.handles = [];
      try { var v = hkAsstVoiceEl('.hk-asst-voice'); if (v) v.classList.remove('open'); } catch (e2) {}
      hkAsstVoiceSet('idle', '');
    }
    /* بازگشت سیستم یا ‹: اول گفتگوی صوتی، و اگر باز نبود پنجرهٔ دستیار بسته می‌شود؛ یک مرحله، همیشه */
    function hkAsstBack() {
      if (_hkMgrOpen) { hkAsstMgrClose(); return true; }
      if (_hkVoice.on) { hkAsstVoiceClose(); return true; }
      if (hkAsstIsOpen()) { hkAsstClose(); return true; }
      return false;
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
      /* نگه داشتن عنوان: فهرست «سؤال‌هایی که نفهمیدم» (و مدل‌های ذخیره‌شده) */
      if (titleBox) {
        var lpT = 0, lpStop = function () { clearTimeout(lpT); };
        ['touchstart', 'mousedown'].forEach(function (ev) { titleBox.addEventListener(ev, function () { lpStop(); lpT = setTimeout(hkAsstMgrOpen, 650); }, { passive: true }); });
        ['touchend', 'touchmove', 'touchcancel', 'mouseup', 'mouseleave'].forEach(function (ev) { titleBox.addEventListener(ev, lpStop, { passive: true }); });
      }
      sheet.appendChild(head);

      /* گفتگوی صوتی (۱.۴.۳۷): تمام‌صفحه؛ فقط گوی بزرگ (همان گوی دستیار)، یک خط وضعیت و دکمهٔ بازگشت */
      var voice = hkAsstEl('div', 'hk-asst-voice');
      voice.setAttribute('role', 'dialog'); voice.setAttribute('aria-label', 'گفتگوی صوتی');
      var vend = hkAsstEl('button', 'hk-asst-vend');
      vend.type = 'button'; vend.setAttribute('aria-label', 'پایان گفتگوی صوتی');
      vend.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      vend.addEventListener('click', hkAsstVoiceClose);
      voice.appendChild(vend);
      var vorb = hkAsstEl('button', 'hk-asst-vorb');
      vorb.type = 'button'; vorb.setAttribute('aria-label', 'گوی گفتگوی صوتی'); vorb.setAttribute('data-s', 'idle');
      vorb.appendChild(hkAsstEl('i', 'hk-asst-orb'));
      vorb.addEventListener('click', hkAsstVoiceOrbTap);
      voice.appendChild(vorb);
      voice.appendChild(hkAsstEl('div', 'hk-asst-vstat', ''));
      voice.appendChild(hkAsstEl('div', 'hk-asst-vcap', ''));
      var vfix = hkAsstEl('button', 'hk-asst-vfix', 'نصب صدای فارسی'); vfix.type = 'button'; vfix.style.display = 'none';
      vfix.onclick = function () { try { hkAsstSpeechPlugin().installVoice(); } catch (e) {} };
      voice.appendChild(vfix);
      sheet.appendChild(voice);
      /* فهرست مدل‌های ذخیره‌شده با دکمهٔ حذف برای هر مدل */
      var mgr = hkAsstEl('div', 'hk-asst-mgr');
      var mhead = hkAsstEl('div', 'hk-asst-head');
      var mtitle = hkAsstEl('div', 'hk-asst-title', 'ابزارهای دستیار');
      mhead.appendChild(mtitle);
      var mclose = hkAsstEl('button', 'hk-asst-clear', 'بستن');
      mclose.type = 'button';
      mclose.addEventListener('click', hkAsstMgrClose);
      mhead.appendChild(mclose);
      mgr.appendChild(mhead);
      var tools = hkAsstEl('div', 'hk-asst-tools');
      var mode = hkAsstEl('div', 'hk-asst-mode', 'قاعده‌ای');
      mode.id = 'hkAsstMode';
      mode.addEventListener('click', function () {
        if (!hkAsstBootCanRetry() || HK_ASST_ENGINE.loading) return;
        hkAsstSetMode();
        hkAsstLocalLoad().then(hkAsstSetMode, hkAsstSetMode);
      });
      var dl = hkAsstEl('button', 'hk-asst-dl');
      dl.type = 'button'; dl.setAttribute('aria-label', 'دانلود مدل محلی (اختیاری)'); dl.title = 'دانلود مدل محلی (اختیاری، حدود ۵۰۰ مگابایت)';
      hkAsstDlPaint(dl, 'empty');
      dl.addEventListener('click', function () { hkAsstModelClick(dl); });
      tools.appendChild(dl);
      hkAsstModelRefresh(dl);
      var clr = hkAsstEl('button', 'hk-asst-clear', 'پاک کردن');
      clr.type = 'button';
      clr.addEventListener('click', function () { hkAsstClear(); hkAsstMgrClose(); });
      tools.appendChild(mode);
      tools.appendChild(clr);
      mgr.appendChild(tools);
      mgr.appendChild(hkAsstEl('div', 'hk-asst-mgr-list'));
      sheet.appendChild(mgr);
      sheet.appendChild(hkAsstEl('div', 'hk-asst-log'));

      var form = hkAsstEl('form', 'hk-asst-form');
      var input = hkAsstEl('textarea', 'hk-asst-input');
      input.rows = 1; input.placeholder = 'درخواستت را بنویس…'; input.setAttribute('aria-label', 'درخواست');
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); } });
      input.addEventListener('input', function () { form.classList.toggle('typing', !!input.value.trim()); });
      /* ۱.۴.۳۸: دکمه‌ها سمت راست کادر (آبی‌ها کنار هم، میکروفون ساده)؛ هنگام ضبط، کادر دو ردیف می‌شود: متن، و زیرش ✕ / موج / ■ / ارسال */
      var field = hkAsstEl('div', 'hk-asst-field');
      var send = hkAsstEl('button', 'hk-asst-send');
      send.type = 'submit'; send.setAttribute('aria-label', 'ارسال');
      send.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      field.appendChild(send);
      var vc = hkAsstEl('button', 'hk-asst-vc');
      vc.type = 'button'; vc.setAttribute('aria-label', 'گفتگوی صوتی دوطرفه');
      vc.innerHTML = HK_ASST_WAVE_SVG;
      vc.addEventListener('click', hkAsstVoiceOpen);
      field.appendChild(vc);
      var rec = hkAsstEl('button', 'hk-asst-rec');
      rec.type = 'button'; rec.setAttribute('aria-label', 'ضبط صدا و تبدیل به متن');
      rec.innerHTML = HK_ASST_MIC_SVG;
      rec.addEventListener('click', function () { hkAsstRecStart(form, input); });
      field.appendChild(rec);
      field.appendChild(input);
      /* حالت ضبط */
      var rc = hkAsstEl('div', 'hk-asst-rc');
      rc.appendChild(hkAsstEl('div', 'hk-asst-rc-t'));
      var rr = hkAsstEl('div', 'hk-asst-rc-r');
      var rcx = hkAsstEl('button', 'hk-asst-rc-b hk-asst-rc-x'); rcx.type = 'button'; rcx.setAttribute('aria-label', 'لغو ضبط');
      rcx.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      rcx.addEventListener('click', function () { try { hkAsstSpeechPlugin().cancel(); } catch (e) {} });
      rr.appendChild(rcx);
      var dots = hkAsstEl('div', 'hk-asst-rc-dots');
      for (var di = 0; di < 30; di++) dots.appendChild(hkAsstEl('i'));
      rr.appendChild(dots);
      var rcs = hkAsstEl('button', 'hk-asst-rc-b hk-asst-rc-stop'); rcs.type = 'button'; rcs.setAttribute('aria-label', 'پایان ضبط');
      rcs.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
      rcs.addEventListener('click', function () { try { hkAsstSpeechPlugin().stop(); } catch (e) {} });
      rr.appendChild(rcs);
      var rcg = hkAsstEl('button', 'hk-asst-rc-b hk-asst-rc-go'); rcg.type = 'button'; rcg.setAttribute('aria-label', 'پایان ضبط و ارسال');
      rcg.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      rcg.addEventListener('click', function () { form._autoSend = true; try { hkAsstSpeechPlugin().stop(); } catch (e) {} });
      rr.appendChild(rcg);
      rc.appendChild(rr);
      field.appendChild(rc);
      form.appendChild(field);
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
      if (mode === 'busy') {
        dl.innerHTML = '<svg class="hk-asst-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.5"/><circle class="fg" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg><span class="hk-asst-dl-p">' + toPersianDigits('0') + '٪</span>';
      } else {
        dl.innerHTML = HK_ASST_DL_ARROW;
      }
      dl.classList.remove('is-done');
      dl.classList.toggle('is-busy', mode === 'busy');
    }
    function hkAsstModelRefresh(dl) {
      dl = dl || document.querySelector('.hk-asst-dl');
      if (!dl || dl._busy) return;
      hkAsstModelStatus().then(function (done) {
        hkAsstDlPaint(dl, done ? 'done' : 'empty');
        /* بارگذاری قبلی برنامه را بسته کرده؟ خودکار دوباره تلاش نشود؛ کاربر با لمس وضعیت تصمیم می‌گیرد */
        if (done && !HK_ASST_ENGINE.ok && !HK_ASST_ENGINE.loading && !hkAsstBootInterrupted()) { hkAsstLocalLoad().then(hkAsstSetMode, hkAsstSetMode); }
        hkAsstSetMode();
      });
    }
    function hkAsstModelClick(dl) {
      if (dl._busy) return;
      hkAsstModelStatus().then(function (done) {
        if (done) { hkAsstMgrOpen(); return; }
        askConfirm('مدل Qwen2.5-0.5B (حدود ۵۰۰ مگابایت) از Hugging Face دانلود و روی گوشی ذخیره می‌شود. ادامه می‌دهی؟', function () { hkAsstModelStart(dl); });
      });
    }
    function hkAsstModelStart(dl) {
      dl._busy = true;
      hkAsstDlPaint(dl, 'busy', '0%');
      hkAsstModelDownload(function (frac) {
        var pc = Math.max(0, Math.min(100, Math.round(frac * 100)));
        var sp = dl.querySelector('.hk-asst-dl-p'), fg = dl.querySelector('.hk-asst-ring .fg');
        if (sp) sp.textContent = toPersianDigits(String(pc)) + '٪';
        if (fg) fg.style.strokeDashoffset = String(100 - pc);
      }).then(function () {
        dl._busy = false;
        hkAsstBootClear();
        try { showToast('مدل ذخیره شد؛ در حال آماده‌سازی…'); } catch (e1) {}
        hkAsstModelRefresh(dl);
        hkAsstLocalLoad().then(function () { hkAsstSetMode(); try { showToast('مدل محلی آماده است.'); } catch (e3) {} }, function (e4) { hkAsstSetMode(); try { showToast('مدل آماده نشد: ' + (e4 && e4.message ? e4.message : 'خطا')); } catch (e5) {} });
      }, function (err) {
        dl._busy = false;
        try { showToast('دانلود انجام نشد: ' + (err && err.message ? err.message : 'خطا')); } catch (e2) {}
        hkAsstModelRefresh(dl);
      });
    }
    var _hkMgrOpen = false;
    function hkAsstMgrClose() {
      _hkMgrOpen = false;
      try { var m = _hkAsstEl.querySelector('.hk-asst-mgr'); if (m) m.classList.remove('open'); } catch (e) {}
    }
    function hkAsstMgrRender() {
      var list = _hkAsstEl.querySelector('.hk-asst-mgr-list');
      list.textContent = '';
      var missed = hkAsstMissedList();
      var mrow = hkAsstEl('div', 'hk-asst-mrow');
      var minfo = hkAsstEl('div', 'hk-asst-minfo');
      minfo.appendChild(hkAsstEl('div', 'hk-asst-mname', 'سؤال‌هایی که نفهمیدم'));
      minfo.appendChild(hkAsstEl('div', 'hk-asst-msize', toPersianDigits(String(missed.length)) + ' مورد؛ فقط روی همین گوشی. کپی کن و بفرست تا دستیار یاد بگیره.'));
      mrow.appendChild(minfo);
      var mcopy = hkAsstEl('button', 'hk-asst-clear', 'کپی'); mcopy.type = 'button';
      mcopy.addEventListener('click', function () {
        var txt = hkAsstMissedList().join('\n');
        try { navigator.clipboard.writeText(txt).then(function () { showToast('کپی شد.'); }, function () { showToast('کپی نشد.'); }); } catch (e) { try { showToast('کپی نشد.'); } catch (e2) {} }
      });
      mrow.appendChild(mcopy);
      var mclr = hkAsstEl('button', 'hk-asst-clear', 'پاک'); mclr.type = 'button';
      mclr.addEventListener('click', function () { hkAsstMissedClear(); hkAsstMgrRender(); });
      mrow.appendChild(mclr);
      list.appendChild(mrow);
      hkAsstInstalled().then(function (m) {
        if (!m) { list.appendChild(hkAsstEl('div', 'hk-asst-hint', 'هیچ مدلی روی گوشی ذخیره نشده است.')); return; }
        var row = hkAsstEl('div', 'hk-asst-mrow');
        var info = hkAsstEl('div', 'hk-asst-minfo');
        info.appendChild(hkAsstEl('div', 'hk-asst-mname', m.name));
        info.appendChild(hkAsstEl('div', 'hk-asst-msize', toPersianDigits(String(Math.round(m.size / 1e6))) + ' مگابایت'));
        row.appendChild(info);
        var del = hkAsstEl('button', 'hk-del-x hk-asst-mdel', HK_DEL_X);
        del.type = 'button';
        del.setAttribute('aria-label', 'حذف مدل');
        del.addEventListener('click', function () {
          askConfirm('مدل «' + m.name + '» حذف شود؟ حجمش از فضای گوشی آزاد می‌شود.', function () {
            hkAsstModelDelete().then(function () {
              try { showToast('مدل حذف شد و فضایش آزاد شد.'); } catch (e) {}
              hkAsstMgrRender();
              hkAsstModelRefresh();
              hkAsstSetMode();
            });
          });
        });
        row.appendChild(del);
        list.appendChild(row);
      });
    }
    function hkAsstMgrOpen() {
      _hkMgrOpen = true;
      hkAsstMgrRender();
      var m = _hkAsstEl.querySelector('.hk-asst-mgr'); if (m) m.classList.add('open');
    }
    /* برچسب زیر عنوان را با وضعیت زندهٔ موتور به‌روز می‌کند */
    function hkAsstSetMode() {
      try { var md = document.getElementById('hkAsstMode'); if (md) md.textContent = hkAsstEngineStatus(); } catch (eM) {}
    }
    function hkAsstIsOpen() { return !!(_hkAsstEl && _hkAsstEl.classList.contains('open')); }
    function hkAsstInit() {
      try { if (document.getElementById('hkAsstSheet')) return; hkAsstBuild(); } catch (eI) { try { console.error('assistant', eI); } catch (e2) {} }
      /* منوی همبرگری باز است: دکمهٔ دستیار بالای آن دیده نشود */
      try {
        var menu = document.getElementById('menuDropdown');
        if (menu && window.MutationObserver) {
          new MutationObserver(function () { document.body.classList.toggle('hk-asst-hidden', menu.classList.contains('open')); })
            .observe(menu, { attributes: true, attributeFilter: ['class'] });
        }
      } catch (eM) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hkAsstInit);
    else hkAsstInit();
    try { window.hkAsstAsk = hkAsstAsk; window.hkAsstOpen = hkAsstOpen; window.hkAsstClose = hkAsstClose; window.hkAsstIsOpen = hkAsstIsOpen; window.hkAsstBack = hkAsstBack; } catch (eW) {}
