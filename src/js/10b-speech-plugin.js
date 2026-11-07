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


