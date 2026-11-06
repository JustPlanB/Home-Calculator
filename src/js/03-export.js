    /* —— خروجی اکسل و PDF —— */

    async function blobToBase64(blob) {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      }
      return btoa(binary);
    }
    function utf8ToBase64(text) {
      return btoa(unescape(encodeURIComponent(text)));
    }
    function getNativeFileExport() {
      try {
        const C = window.Capacitor, P = C && C.Plugins;
        return P && P.NativeFileExport ? P.NativeFileExport : null;
      } catch (e) { return null; }
    }
    async function nativeSaveBase64(filename, mime, base64) {
      const native = getNativeFileExport();
      if (!native || typeof native.saveBase64ToDownloads !== 'function') return null;
      const res = await native.saveBase64ToDownloads({ filename: filename, mimeType: mime, data: base64 });
      if (res && (res.uri || res.ok)) return res;
      return null;
    }
    async function nativeShareBase64(filename, mime, base64, title) {
      const native = getNativeFileExport();
      if (!native || typeof native.shareBase64File !== 'function') return null;
      const res = await native.shareBase64File({
        filename: filename,
        mimeType: mime,
        data: base64,
        title: title || 'اشتراک‌گذاری',
        saveToDownloads: true
      });
      if (res && (res.shared || res.ok || res.uri)) return res;
      return null;
    }

    /** ذخیره/اشتراک فایل — سازگار با مرورگر و WebView اندروید */
    async function saveOrShareBlob(blob, filename, mime) {
      if (!blob) throw new Error('empty blob');
      const type = mime || blob.type || 'application/octet-stream';
      // 0) Android native: ذخیره مستقیم در پوشه Download دستگاه
      try {
        const C = window.Capacitor, Plugins = C && C.Plugins, NativeFileExport = Plugins && Plugins.NativeFileExport;
        if (C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && NativeFileExport && typeof NativeFileExport.saveBase64ToDownloads === 'function') {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = ''; const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
          const saved = await NativeFileExport.saveBase64ToDownloads({ filename, mimeType: type, data: btoa(binary) });
          if (saved && saved.uri) return 'native-download';
        }
      } catch (e) { console.warn('Native Downloads save failed:', e); }
      // 1) Web Share API با فایل
      try {
        if (navigator.canShare && typeof File !== 'undefined') {
          const file = new File([blob], filename, { type: type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: filename });
            return 'share';
          }
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return 'abort';
      }
      // 2) Capacitor Filesystem + Share
      try {
        const Cap = window.Capacitor;
        const Plugins = (Cap && Cap.Plugins) || {};
        const FS = Plugins.Filesystem;
        const Share = Plugins.Share;
        if (FS && FS.writeFile) {
          const b64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result || '').split(',')[1] || '');
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
          const dir = 'CACHE';
          await FS.writeFile({ path: filename, data: b64, directory: dir, recursive: true });
          if (Share && Share.share) {
            let url = filename;
            try {
              if (FS.getUri) {
                const uriRes = await FS.getUri({ path: filename, directory: dir });
                url = (uriRes && (uriRes.uri || uriRes)) || filename;
              }
            } catch (e) {}
            await Share.share({ title: filename, url: String(url), dialogTitle: filename });
            return 'cap-share';
          }
        }
      } catch (e) { console.error('cap save', e); }
      // 3) msSaveOrOpenBlob
      try {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, filename);
          return 'ms';
        }
      } catch (e) {}
      // 4) <a download>
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { a.remove(); URL.revokeObjectURL(url); } catch (e) {} }, 2500);
        return 'download';
      } catch (e) { console.error(e); }
      // 5) باز کردن data URL در پنجره جدید
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        const w = window.open();
        if (w) {
          w.document.write('<html><head><meta charset="utf-8"><title>' + filename + '</title></head><body style="font-family:Tahoma;padding:16px;direction:rtl;">' +
            '<p>اگر دانلود خودکار نشد، لینک زیر را لمس کنید و «ذخیره» را بزنید:</p>' +
            '<p><a download="' + filename + '" href="' + dataUrl + '">' + filename + '</a></p></body></html>');
          w.document.close();
          return 'popup';
        }
      } catch (e) {}
      throw new Error('save failed');
    }

    function downloadBlob(blob, filename) {
      saveOrShareBlob(blob, filename, blob && blob.type).then(() => {}).catch(() => {
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.style.display = 'none';
          document.body.appendChild(a); a.click();
          setTimeout(() => { try { a.remove(); URL.revokeObjectURL(url); } catch (e) {} }, 1500);
        } catch (e) {}
      });
      return true;
    }


    
    
    function filterArchiveByUserCards(arch, cardNames) {
      if (!arch || typeof arch !== 'object') return arch || {};
      if (!cardNames || !cardNames.length) return arch;
      var set = {};
      cardNames.forEach(function(t) {
        var k = String(t || '').trim();
        if (k) set[k] = true;
      });
      var out = {};
      Object.keys(arch).forEach(function(key) {
        var pd = arch[key];
        if (!pd || typeof pd !== 'object') return;
        var clone;
        try { clone = JSON.parse(JSON.stringify(pd)); } catch (e) { clone = pd; }
        ['income', 'expense'].forEach(function(tab) {
          if (clone[tab] && Array.isArray(clone[tab].sections)) {
            clone[tab].sections = clone[tab].sections.filter(function(s) {
              return s && set[String(s.title || '').trim()];
            });
          }
        });
        if (Array.isArray(clone.personCardOrder)) {
          clone.personCardOrder = clone.personCardOrder.filter(function(t) {
            return set[String(t || '').trim()];
          });
        }
        if (clone.personOpeningInstant && typeof clone.personOpeningInstant === 'object') {
          var poi = {};
          Object.keys(clone.personOpeningInstant).forEach(function(k) {
            if (set[k]) poi[k] = clone.personOpeningInstant[k];
          });
          clone.personOpeningInstant = poi;
        }
        if (clone.cardMeta && typeof clone.cardMeta === 'object') {
          var cm = {};
          Object.keys(clone.cardMeta).forEach(function(k) {
            if (set[k]) cm[k] = clone.cardMeta[k];
          });
          clone.cardMeta = cm;
        }
        out[key] = clone;
      });
      return out;
    }

    
    /* آیکون «اطلاعات» کوچک کنار نوشته؛ با زدن، باکس شناور باز می‌شود و با لمس بیرونش بسته می‌شود */
    var HK_INFO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" class="ii-c"/><circle cx="12.6" cy="6.9" r="1.75" class="ii-g"/><path d="M9.6 11.1c1.1-1 2.4-1.4 3-.9.5.4.3 1.3.1 2.1l-1.1 4.4c-.2.8 0 1.3.5 1.2.6-.1 1.2-.7 1.7-1.5" class="ii-s"/></svg>';
    function hkInfoBtnHtml(text) {
      return '<button type="button" class="hk-info-btn" data-tip="' + escapeHtml(text) + '" aria-label="توضیح">' + HK_INFO_SVG + '</button>';
    }
    function hkCloseInfoTip() {
      var t = document.getElementById('hkInfoTip'); if (t) t.remove();
      var sh = document.getElementById('hkInfoShield'); if (sh) sh.remove();
    }
    /* تا باکس باز است، یک لایهٔ شفاف کل صفحه را می‌پوشاند؛ پس یک لمس (روی باکس یا بیرونش) فقط باکس را می‌بندد
       و به فیلد/دکمهٔ زیرش نمی‌رسد (نه کیبورد بالا می‌آید، نه دکمه‌ای زده می‌شود). لمس روی آیکون اطلاعاتِ دیگر همان را باز می‌کند. */
    function hkInfoShieldUp() {
      var sh = document.createElement('div');
      sh.id = 'hkInfoShield'; sh.className = 'hk-info-shield';
      var done = false, timer = 0;
      function finish(ev) {
        if (done) return; done = true; clearTimeout(timer);
        var x = ev && ev.clientX, y = ev && ev.clientY, next = null;
        var t0 = document.getElementById('hkInfoTip'), owner = t0 && t0._for;
        hkCloseInfoTip();
        if (ev && typeof x === 'number' && document.elementsFromPoint) {
          try { var el = document.elementFromPoint(x, y); next = el && el.closest ? el.closest('.hk-info-btn') : null; } catch (e0) {}
        }
        if (next && next !== owner) setTimeout(function () { next.click(); }, 0);
      }
      function eat(ev) { ev.preventDefault(); ev.stopPropagation(); }
      sh.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); var t = document.getElementById('hkInfoTip'); if (t) t.style.opacity = '0'; }, true);
      ['touchstart', 'touchend', 'mouseup'].forEach(function (n) { sh.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
      sh.addEventListener('mousedown', function (ev) { if (ev.cancelable) ev.preventDefault(); ev.stopPropagation(); });
      sh.addEventListener('click', function (ev) { eat(ev); finish(ev); });
      /* اگر کلیکی نیامد (مثلاً کشیدن انگشت)، باز هم ببند */
      sh.addEventListener('pointerup', function (ev) { var e2 = { clientX: ev.clientX, clientY: ev.clientY }; timer = setTimeout(function () { finish(e2); }, 450); });
      sh.addEventListener('pointercancel', function () { timer = setTimeout(function () { finish(null); }, 50); });
      document.body.appendChild(sh);
      return sh;
    }
    function hkInfoOutside() { hkCloseInfoTip(); }
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.hk-info-btn') : null;
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var cur = document.getElementById('hkInfoTip');
      if (cur && cur._for === b) { hkCloseInfoTip(); return; }
      hkCloseInfoTip();
      var tip = document.createElement('div');
      tip.id = 'hkInfoTip'; tip.className = 'hk-info-tip'; tip._for = b;
      tip.textContent = b.getAttribute('data-tip') || '';
      document.body.appendChild(tip);
      var r = b.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      var w = Math.min(280, vw - 24); tip.style.width = w + 'px';
      var left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2));
      var top = r.bottom + 8, h = tip.offsetHeight;
      if (top + h > vh - 12) top = Math.max(12, r.top - h - 8);
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
      /* لایهٔ محافظ پشت باکس؛ لمس خود باکس هم فقط آن را می‌بندد */
      hkInfoShieldUp();
      ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach(function (n) {
        tip.addEventListener(n, function (ev) {
          if (ev.cancelable && (n === 'mousedown' || n === 'click')) ev.preventDefault();
          ev.stopPropagation();
          if (n === 'click') hkCloseInfoTip();
        });
      });
    }, true);
    function askBackupParts() {
      closeSideMenu();
      var existing = document.getElementById('backupPickOverlay');
      if (existing) existing.remove();
      var parts = [
        { key: 'all', label: 'همه' },
        { key: 'archive', label: 'آرشیو ماه‌ها / داده‌های ماهانه' },
        { key: 'plans', label: 'اقساط' },
        { key: 'recurringIncomes', label: 'درآمدهای ثابت' },
        { key: 'selectedBankAccounts', label: 'حساب‌های بانکی' },
        { key: 'subjects', label: 'پروژه‌ها' },
        { key: 'userReminders', label: 'یادآورها' },
        { key: 'savings', label: 'پس‌انداز (ارز و طلا)' },
        { key: 'categories', label: 'دسته‌بندی مخارج' }
      ];
      var ov = document.createElement('div');
      ov.id = 'backupPickOverlay';
      ov.className = 'backup-pick-overlay';
      var html = '<div class="backup-pick-panel" role="dialog">' +
        '<div class="backup-pick-title">از چه بخش‌هایی پشتیبان گرفته شود؟</div>';
      parts.forEach(function(p) {
        html += '<label class="backup-pick-item' + (p.key === 'all' ? ' all' : '') + '">' +
          '<input type="checkbox" data-bk="' + p.key + '"' + (p.key === 'all' ? ' id="bkCheckAll"' : ' class="bk-part"') + ' checked />' +
          '<span>' + p.label + '</span></label>';
      });
      /* مسیر پوشه در سطر جدا (متن فارسی با آدرس لاتین بلند وسط جمله، سطر اول را نصفه می‌کرد) */
      var autoInfo = autoBkPlugin() ? 'هر روز یک نسخهٔ کامل از همهٔ اطلاعات ذخیره می‌شود و ۷ روز اخیر و ۴ هفتهٔ قبل نگه داشته می‌شود. قبل از حذف ماه، حذف کلی، بازیابی و نصب نسخهٔ جدید هم خودکار پشتیبان گرفته می‌شود.\nاین نسخه‌ها در حافظهٔ داخلی نرم‌افزار ذخیره می‌شوند و در فایل‌منیجر دیده نمی‌شوند؛ در Downloads/HesabKetab فقط یک فایل «آخرین پشتیبان» می‌ماند (برای وقتی نرم‌افزار حذف یا گوشی عوض شود). با زدن روی آن فایل، حساب‌کتاب بازیابی را پیشنهاد می‌دهد.' : 'پشتیبان خودکار فقط در نرم‌افزار اندروید (نسخهٔ ۱۰ به بالا) فعال است.';
      var pwdInfo = 'اگر رمز نگذارید، فایل بدون رمز ذخیره می‌شود. با رمز، فایل رمزنگاری می‌شود و بدون رمز قابل خواندن نیست. رمز را فراموش نکنید؛ قابل بازیابی نیست.';
      /* زمان آخرین پشتیبان خودکار داخل باکس اطلاعات (همهٔ سطرهای کلیددار یک اندازه و هم‌تراز) */
      if (autoBkPlugin()) autoInfo += '\n' + autoBkLastText();
      /* سه سطر هم‌شکل: نوشته راست، کلید روشن/خاموش چپ؛ فقط خود کلید روشن/خاموش می‌کند */
      var _autoOn = autoBkState().enabled !== false;
      html += '<div class="bk-auto-wrap"><div class="bk-sw-row bk-auto-row">' +
        '<span class="bk-ttl">پشتیبان خودکار روزانه' + hkInfoBtnHtml(autoInfo) + '</span>' +
        '<button type="button" class="hk-switch' + (_autoOn ? ' on' : '') + '" id="bkAutoOn" role="switch" aria-checked="' + _autoOn + '" aria-label="پشتیبان خودکار روزانه"><i></i></button></div>';
      /* رمزنگاری پشتیبان خودکار فقط وقتی پشتیبان خودکار روشن است دیده می‌شود */
      if (autoBkPlugin()) html += hkAutoEncRowHtml();
      /* رمز فایل پشتیبان: کلید روشن/خاموش؛ روشن کردن، باکسی با دو فیلد رمز باز می‌کند */
      html += '<div class="bk-sw-row bk-pwd-row"><span class="bk-ttl">رمز فایل پشتیبان' + hkInfoBtnHtml(pwdInfo) + '</span>' +
        '<button type="button" class="hk-switch" id="bkPwdSw" role="switch" aria-checked="false" aria-label="رمز فایل پشتیبان"><i></i></button></div>' +
        '<input type="hidden" id="bkPwd" value=""></div>';
      html += '<div class="backup-pick-actions">' +
        '<button type="button" class="backup-pick-ok" id="bkDoExport">پشتیبان‌گیری</button>' +
        '<button type="button" class="backup-pick-cancel" id="bkCancel">انصراف</button>' +
        '</div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      var allCb = ov.querySelector('#bkCheckAll');
      var partCbs = ov.querySelectorAll('.bk-part');
      function syncFromAll() {
        var on = !!(allCb && allCb.checked);
        partCbs.forEach(function(cb) { cb.checked = on; });
      }
      function syncToAll() {
        if (!allCb) return;
        var allOn = true;
        partCbs.forEach(function(cb) { if (!cb.checked) allOn = false; });
        allCb.checked = allOn;
      }
      if (allCb) allCb.addEventListener('change', syncFromAll);
      var autoCb = ov.querySelector('#bkAutoOn');
      /* رمزنگاری پشتیبان خودکار: فعال‌سازی / خاموش‌کردن / پاک‌کردن پشتیبان‌های بی‌رمز قدیمی (پس از اتمام، همین پنجره دوباره باز می‌شود) */
      var reopen = function () { try { ov.remove(); } catch (e) {} askBackupParts(); };
      var encBtn = ov.querySelector('#bkEncBtn'), encOff = ov.querySelector('#bkEncOff'), encClean = ov.querySelector('#bkEncCleanup');
      if (encBtn) encBtn.onclick = function () { var st0 = hkAutoEncState(); ov.remove(); if (st0) hkAutoEncDisable(askBackupParts); else hkAutoEncSetup(askBackupParts); };
      var encFix = ov.querySelector('#bkEncFix');
      if (encFix) encFix.onclick = function () { ov.remove(); hkAutoEncSetup(askBackupParts); };
      if (encClean) encClean.onclick = function () { ov.remove(); hkAutoEncCleanup(askBackupParts); };
      if (autoCb) autoCb.addEventListener('click', function (e) {
        e.preventDefault();
        var onNow = !autoCb.classList.contains('on');
        autoCb.classList.toggle('on', onNow); autoCb.setAttribute('aria-checked', String(onNow));
        var st = autoBkState(); st.enabled = onNow; autoBkSave(st);
        var er = ov.querySelector('#bkEncRow'); if (er) er.classList.toggle('bk-enc-hide', !onNow);
        if (onNow) { maybeDailyAutoBackup(false); try { showToast('پشتیبان خودکار روشن شد'); } catch (e1) {} }
        else { try { showToast('پشتیبان خودکار خاموش شد'); } catch (e2) {} }
      });
      partCbs.forEach(function(cb) { cb.addEventListener('change', syncToAll); });
      var pwSw = ov.querySelector('#bkPwdSw');
      if (pwSw) pwSw.onclick = function () {
        var hid = ov.querySelector('#bkPwd');
        if (pwSw.classList.contains('on')) { hid.value = ''; pwSw.classList.remove('on'); pwSw.setAttribute('aria-checked', 'false'); return; }
        hkBackupPwdBox(function (pw) {
          if (!pw) return;
          hid.value = pw; pwSw.classList.add('on'); pwSw.setAttribute('aria-checked', 'true');
        });
      };
      ov.querySelector('#bkCancel').onclick = function() { hkCloseInfoTip(); ov.remove(); };
      ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
      ov.querySelector('#bkDoExport').onclick = function() {
        var selected = {};
        if (allCb && allCb.checked) {
          parts.forEach(function(p) { if (p.key !== 'all') selected[p.key] = true; });
        } else {
          partCbs.forEach(function(cb) {
            if (cb.checked) selected[cb.getAttribute('data-bk')] = true;
          });
        }
        var any = false;
        Object.keys(selected).forEach(function(k) { if (selected[k]) any = true; });
        if (!any) {
          try { showToast('حداقل یک بخش را انتخاب کنید', 'warn'); } catch (eT) {}
          return;
        }
        try { var pw = ov.querySelector('#bkPwd'); _pendingBackupPassword = pw ? String(pw.value || '') : ''; } catch (ePw) { _pendingBackupPassword = ''; }
        if (_pendingBackupPassword && _pendingBackupPassword.length < 4) { try { showToast('رمز حداقل ۴ کاراکتر باشد'); } catch (eT2) {} return; }
        ov.remove();
        if (selected.archive) {
          try { askBackupUserCards(selected); } catch (eC) { exportFullBackup(selected); }
        } else {
          exportFullBackup(selected);
        }
      };
    }

    /* ===== رمزنگاری فایل پشتیبان (AES-256-GCM، کلید از رمز با PBKDF2-SHA256 / ۲۱۰هزار دور) ===== */
    var _pendingBackupPassword = '';
    function _b64FromBytes(u8) { var s = '', ch = 0x8000; for (var i = 0; i < u8.length; i += ch) s += String.fromCharCode.apply(null, u8.subarray(i, i + ch)); return btoa(s); }
    function _bytesFromB64(b64) { var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
    async function _bkKey(password, salt, iter) {
      var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    async function hkEncryptBackup(text, password) {
      var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 210000;
      var key = await _bkKey(password, salt, iter);
      var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text)));
      return { app: 'hesab-ketab', enc: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: iter, salt: _b64FromBytes(salt), iv: _b64FromBytes(iv), data: _b64FromBytes(ct) };
    }
    async function hkDecryptBackup(obj, password) {
      var key = await _bkKey(password, _bytesFromB64(obj.salt), Math.max(1000, Math.min(5000000, obj.iter | 0)));
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _bytesFromB64(obj.iv) }, key, _bytesFromB64(obj.data));
      return new TextDecoder().decode(pt);
    }

    /* ===== پشتیبان خودکار رمزدار (اختیاری) — قالب hk-backup-enc نسخهٔ ۱ =====
       - داده با یک کلید تصادفی ۲۵۶بیتی (DEK) و AES-256-GCM (برچسب ۱۲۸بیتی) رمز می‌شود؛ برای هر فایل nonce تصادفی ۹۶بیتی تازه.
         (حد ایمن nonce تصادفی برای یک کلید حدود ۲^۳۲ رمزنگاری است؛ پشتیبان روزانه بسیار کمتر از آن است.)
       - DEK دو بار «پیچیده» می‌شود: با کلید مشتق از رمز پشتیبان و با کلید مشتق از کد بازیابی (PBKDF2-SHA256، salt و nonce جدا).
         این دو بستهٔ پیچیده یک بار هنگام راه‌اندازی ساخته و عیناً در هر فایل کپی می‌شوند (رمزنگاری تازه‌ای با همان کلید/nonce انجام نمی‌شود).
       - AAD (دادهٔ احرازشده) = UTF-8 از JSON.stringify یک آرایهٔ ثابت؛ برای داده: ["hk-backup-enc",1,"AES-256-GCM",dekId]
         و برای هر بستهٔ پیچیده: ["hk-backup-enc-wrap",1,type,"PBKDF2-SHA256",iter,norm,dekId]. تغییر هر کدام = رد شدن.
       - رمز و کد بازیابی هرگز ذخیره نمی‌شوند. برای پشتیبان بی‌دخالت، خود DEK فقط در حافظهٔ خصوصی برنامه نگه داشته می‌شود؛
         این همان سطح محافظت داده‌های زندهٔ برنامه است و داده‌های زنده (localStorage) با این کار رمز نمی‌شوند.
       - هر فایل به‌تنهایی با رمز یا با کد بازیابی روی هر گوشی باز می‌شود؛ گوشی اول، حافظهٔ آن یا Keystore لازم نیست. */
    var HK_ENC_FORMAT = 'hk-backup-enc', HK_ENC_V = 1, HK_ENC_CIPHER = 'AES-256-GCM', HK_ENC_KDF = 'PBKDF2-SHA256';
    var HK_ENC_ITER_PW = 600000, HK_ENC_ITER_RC = 200000, HK_ENC_ITER_MIN = 100000, HK_ENC_ITER_MAX = 2000000;
    var HK_ENC_NORM = { password: 'hk-pw-v1', recovery: 'hk-rc-v1' };
    var HK_RC_ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   /* Crockford Base32 (بدون I L O U) */
    var HK_AUTO_ENC_KEY = STORAGE_KEY + '_autoBkEnc';
    /** نرمال‌سازی رمز پشتیبان خودکار، نسخهٔ ۱ (فقط برای این قالب؛ رمزهای پشتیبان دستی قدیمی دست نمی‌خورند):
        NFKC؛ «ي/ى» عربی ← «ی» فارسی؛ «ك» عربی ← «ک» فارسی؛ رقم‌های فارسی و عربی ← رقم لاتین؛
        حذف نویسه‌های بی‌عرض U+200B, U+200D, U+FEFF (نیم‌فاصله U+200C حفظ می‌شود)؛ فاصله‌های ابتدا و انتها حذف نمی‌شوند. */
    function hkNormPwV1(p) {
      var s = String(p == null ? '' : p).normalize('NFKC');
      s = s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
      s = s.replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
           .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
      return s.replace(/[​‍﻿]/g, '');
    }
    /** سیاست رمز: دست‌کم ۱۰ نویسه (پس از نرمال‌سازی)، فقط رقم نباشد، همه یک نویسهٔ تکراری نباشد. پیام خطا یا '' */
    function hkPwPolicyError(p) {
      var n = hkNormPwV1(p), chars = Array.from(n);
      if (chars.length < 10) return 'رمز باید دست‌کم ۱۰ نویسه باشد.';
      if (/^[0-9]+$/.test(n)) return 'رمز نباید فقط عدد باشد؛ حرف هم به کار ببرید.';
      if (new Set(chars).size < 4) return 'رمز خیلی ساده است؛ از نویسه‌های متنوع‌تر استفاده کنید.';
      return '';
    }
    /** کد بازیابی: ۲۵ نویسهٔ تصادفی از ۳۲ نویسه (۱۲۵ بیت)، با تولیدکنندهٔ امن مرورگر؛ نمایش در ۵ گروه */
    function hkGenRecoveryCode() {
      var b = crypto.getRandomValues(new Uint8Array(25)), out = '';
      for (var i = 0; i < b.length; i++) out += HK_RC_ALPHA[b[i] & 31];
      return out;
    }
    function hkFormatRecoveryCode(c) { return String(c).replace(/(.{5})(?=.)/g, '$1-'); }
    /** نرمال‌سازی کد بازیابی واردشده؛ نامعتبر = '' */
    function hkNormRecoveryCode(c) {
      var s = String(c == null ? '' : c).normalize('NFKC')
        .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
        .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
        .toUpperCase().replace(/[\s\-_‌]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
      if (s.length !== 25) return '';
      for (var i = 0; i < s.length; i++) if (HK_RC_ALPHA.indexOf(s[i]) < 0) return '';
      return s;
    }
    function _hkAad(arr) { return new TextEncoder().encode(JSON.stringify(arr)); }
    function _hkWrapAad(type, iter, dekId) { return _hkAad(['hk-backup-enc-wrap', HK_ENC_V, type, HK_ENC_KDF, iter, HK_ENC_NORM[type], dekId]); }
    function _hkDataAad(dekId) { return _hkAad([HK_ENC_FORMAT, HK_ENC_V, HK_ENC_CIPHER, dekId]); }
    async function _hkKek(secretCanon, salt, iter) {
      var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretCanon), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    function _hkSecretCanon(type, secret) { return type === 'password' ? hkNormPwV1(secret) : hkNormRecoveryCode(secret); }
    async function _hkMakeWrap(type, secret, dek, dekId) {
      var canon = _hkSecretCanon(type, secret);
      if (!canon) throw new Error('bad_secret');
      var iter = type === 'password' ? HK_ENC_ITER_PW : HK_ENC_ITER_RC;
      var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      var kek = await _hkKek(canon, salt, iter);
      var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: _hkWrapAad(type, iter, dekId), tagLength: 128 }, kek, dek));
      return { type: type, kdf: HK_ENC_KDF, iter: iter, norm: HK_ENC_NORM[type], salt: _b64FromBytes(salt), iv: _b64FromBytes(iv), data: _b64FromBytes(ct) };
    }
    /** ساخت کلید تازه و دو بستهٔ پیچیده (رمز + کد بازیابی). خروجی فقط در حافظه است تا راه‌اندازی تأیید شود. */
    async function hkAutoEncCreateKey(password, recoveryCode) {
      var dek = crypto.getRandomValues(new Uint8Array(32));
      var idb = crypto.getRandomValues(new Uint8Array(12));
      var dekId = _b64FromBytes(idb).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      var wraps = [await _hkMakeWrap('password', password, dek, dekId), await _hkMakeWrap('recovery', recoveryCode, dek, dekId)];
      return { v: 1, dekId: dekId, dek: _b64FromBytes(dek), wraps: wraps, createdAt: Date.now() };
    }
    function _hkB64Len(b64, n) { try { var u = _bytesFromB64(String(b64)); return (n == null || u.length === n) ? u : null; } catch (e) { return null; } }
    /** بررسی ساختار پیش از هر کار سنگین (PBKDF2). نتیجه: '' یا کد خطا ('unsupported_version' | 'invalid') */
    function hkEncEnvelopeError(env) {
      if (!env || typeof env !== 'object' || env.format !== HK_ENC_FORMAT) return 'invalid';
      if (typeof env.v !== 'number' || !isFinite(env.v)) return 'invalid';
      if (env.v > HK_ENC_V) return 'unsupported_version';
      if (env.v !== HK_ENC_V || env.cipher !== HK_ENC_CIPHER) return 'invalid';
      if (typeof env.dekId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(env.dekId)) return 'invalid';
      if (!_hkB64Len(env.iv, 12)) return 'invalid';
      var d = _hkB64Len(env.data); if (!d || d.length < 17) return 'invalid';
      if (!Array.isArray(env.wraps) || env.wraps.length < 1 || env.wraps.length > 4) return 'invalid';
      for (var i = 0; i < env.wraps.length; i++) {
        var w = env.wraps[i];
        if (!w || typeof w !== 'object' || !HK_ENC_NORM[w.type] || w.kdf !== HK_ENC_KDF || w.norm !== HK_ENC_NORM[w.type]) return 'invalid';
        if (typeof w.iter !== 'number' || (w.iter | 0) !== w.iter || w.iter < HK_ENC_ITER_MIN || w.iter > HK_ENC_ITER_MAX) return 'invalid';
        if (!_hkB64Len(w.salt, 16) || !_hkB64Len(w.iv, 12) || !_hkB64Len(w.data, 48)) return 'invalid';
      }
      return '';
    }
    /** بازکردن DEK با رمز یا کد بازیابی؛ هر خطایی (رمز اشتباه، دست‌کاری) = استثنا. هیچ داده‌ای از برنامه دست نمی‌خورد. */
    async function hkEncUnwrapDek(env, type, secret) {
      var w = (env.wraps || []).filter(function (x) { return x && x.type === type; })[0];
      if (!w) throw new Error('no_wrap');
      var canon = _hkSecretCanon(type, secret);
      if (!canon) throw new Error('bad_secret');
      var kek = await _hkKek(canon, _bytesFromB64(w.salt), w.iter);
      var dek = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _bytesFromB64(w.iv), additionalData: _hkWrapAad(type, w.iter, env.dekId), tagLength: 128 }, kek, _bytesFromB64(w.data)));
      if (dek.length !== 32) throw new Error('bad_key');
      return dek;
    }
    async function _hkDekKey(dekBytes) { return crypto.subtle.importKey('raw', dekBytes, 'AES-GCM', false, ['encrypt', 'decrypt']); }
    async function hkEncSeal(text, keyRec) {
      var key = await _hkDekKey(_bytesFromB64(keyRec.dek)), iv = crypto.getRandomValues(new Uint8Array(12));
      var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: _hkDataAad(keyRec.dekId), tagLength: 128 }, key, new TextEncoder().encode(text)));
      return { app: 'hesab-ketab', format: HK_ENC_FORMAT, v: HK_ENC_V, cipher: HK_ENC_CIPHER, dekId: keyRec.dekId,
        createdAt: new Date().toISOString(), wraps: JSON.parse(JSON.stringify(keyRec.wraps)), iv: _b64FromBytes(iv), data: _b64FromBytes(ct) };
    }
    async function hkEncOpen(env, dekBytes) {
      var key = await _hkDekKey(dekBytes);
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _bytesFromB64(env.iv), additionalData: _hkDataAad(env.dekId), tagLength: 128 }, key, _bytesFromB64(env.data));
      return new TextDecoder('utf-8', { fatal: true }).decode(pt);
    }
    /** وضعیت رمزنگاری پشتیبان خودکار: null = خاموش؛ {broken:true} = روشن ولی کلید محلی ناسالم؛ وگرنه رکورد کلید */
    function hkAutoEncState() {
      var on = autoBkState().encEnabled === true, rec = null;
      try { rec = JSON.parse(localStorage.getItem(HK_AUTO_ENC_KEY) || 'null'); } catch (e) { rec = null; }
      var ok = rec && rec.v === 1 && typeof rec.dekId === 'string' && _hkB64Len(rec.dek, 32) && Array.isArray(rec.wraps) &&
        rec.wraps.some(function (w) { return w && w.type === 'password' && _hkWrapShapeOk(w); }) && rec.wraps.some(function (w) { return w && w.type === 'recovery' && _hkWrapShapeOk(w); });
      if (!on && !rec) return null;
      if (!on || !ok) return { broken: true };
      return rec;
    }
    /** ساختار یک wrap (همان بررسی‌های hkEncEnvelopeError، پیش از هر PBKDF2) */
    function _hkWrapShapeOk(w) {
      return !!(w && typeof w === 'object' && HK_ENC_NORM[w.type] && w.kdf === HK_ENC_KDF && w.norm === HK_ENC_NORM[w.type] &&
        typeof w.iter === 'number' && (w.iter | 0) === w.iter && w.iter >= HK_ENC_ITER_MIN && w.iter <= HK_ENC_ITER_MAX &&
        _hkB64Len(w.salt, 16) && _hkB64Len(w.iv, 12) && _hkB64Len(w.data, 48));
    }
    function _hkBytesEq(a, b) {
      if (!a || !b || a.length !== b.length) return false;
      var d = 0; for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i];
      return d === 0;
    }
    /** رکورد خام کلید محلی، بدون هیچ تغییری. dekOk = DEK از نظر ساختار سالم است (v=1، ۳۲ بایت، dekId معتبر)، حتی اگر wrapها خراب باشند. */
    function hkAutoEncRaw() {
      var raw = null, rec = null;
      try { raw = localStorage.getItem(HK_AUTO_ENC_KEY); } catch (e) { raw = null; }
      if (raw == null) return { raw: null };
      try { rec = JSON.parse(raw); } catch (e2) { rec = null; }
      if (!rec || typeof rec !== 'object') rec = null;
      var dek = rec ? _hkB64Len(rec.dek, 32) : null;
      var idOk = !!(rec && typeof rec.dekId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(rec.dekId));
      return { raw: raw, rec: rec, v: rec && typeof rec.v === 'number' ? rec.v : null, dekOk: !!(rec && rec.v === 1 && dek && idOk), dek: dek };
    }
    /** آزمون واقعیِ رمز یا کد قبلی برای کلید محلی K: باز کردن wrap با AES-GCM (AAD شامل dekId) ← برابری با DEK محلی ←
        بازکردن احرازشدهٔ یک پشتیبان رمزدارِ همین کلید از پوشه (اگر باشد)، وگرنه یک envelope آزمایشی تازه.
        wrapهای داخل خود فایل‌ها هم امتحان می‌شوند (همان‌هایی که روی گوشی دیگر به کار می‌روند). هیچ چیزی ذخیره یا ثبت نمی‌شود. */
    async function hkAutoEncVerifyOld(K, type, secret) {
      if (!K || !K.dekOk || !_hkSecretCanon(type, secret)) return false;
      var envs = [];
      try {
        var P = autoBkPlugin();
        if (P && typeof P.readAutoBackup === 'function') {
          var files = (await autoBkAllFiles(P)).filter(function (f) { return f && /-enc\.json$/.test(String(f.name)) && _bkNameTime(f.name); });
          files.sort(function (a, b) { var ka = _bkNameTime(a.name).key, kb = _bkNameTime(b.name).key; return ka < kb ? 1 : ka > kb ? -1 : 0; });
          for (var i = 0; i < files.length && i < 6 && envs.length < 2; i++) {
            try {
              var env = hkSafeJsonParse(_hkB64ToText(((await P.readAutoBackup({ name: files[i].name, store: files[i].store })) || {}).data));
              if (!hkEncEnvelopeError(env) && env.dekId === K.rec.dekId) envs.push(env);
            } catch (eR) {}
          }
        }
      } catch (eL) {}
      var cands = [], seen = {};
      var add = function (w) { if (w && w.type === type && _hkWrapShapeOk(w) && !seen[w.salt + w.data]) { seen[w.salt + w.data] = 1; cands.push(w); } };
      envs.forEach(function (e) { e.wraps.forEach(add); });
      (Array.isArray(K.rec.wraps) ? K.rec.wraps : []).forEach(add);
      for (var c = 0; c < cands.length; c++) {
        var dek = null;
        try { dek = await hkEncUnwrapDek({ dekId: K.rec.dekId, wraps: [cands[c]] }, type, secret); } catch (eU) { dek = null; }
        if (!dek || !_hkBytesEq(dek, K.dek)) continue;
        for (var j = 0; j < envs.length; j++) { try { await hkEncOpen(envs[j], dek); return true; } catch (eO) {} }
        try {
          var probe = 'hk-verify-' + Date.now();
          var pe = await hkEncSeal(probe, { dekId: K.rec.dekId, dek: _b64FromBytes(K.dek), wraps: [] });
          if (await hkEncOpen(pe, dek) === probe) return true;
        } catch (eP) {}
      }
      return false;
    }
    /** پیش از جایگزینی (purpose='reset') یا حذف (purpose='disable') کلید محلی.
        onPass فقط پس از آزمون موفق رمز/کد قبلی یا تأیید جداگانه و صریح «هیچ‌کدام را ندارم» صدا زده می‌شود؛ هر انصراف = هیچ تغییری.
        repair (اختیاری): وقتی DEK سالم ولی رکورد ناسالم است، «رمز و کد تازه برای همین کلید». */
    function hkAutoEncGuard(purpose, onPass, onCancel, repair) {
      var K = hkAutoEncRaw();
      var cancel = function () { try { if (onCancel) onCancel(); } catch (e) {} };
      if (K.raw == null) return onPass();
      if (K.v != null && K.v > 1) { showToastLong('کلید رمزنگاری این دستگاه با نسخهٔ جدیدتر برنامه ساخته شده؛ برنامه را به‌روز کنید. هیچ تغییری اعمال نشد.'); return cancel(); }
      var act = purpose === 'reset' ? 'با کلید جدید جایگزین' : 'پاک';
      var ov = _hkEncOverlay('bkEncGuard');
      var panel = function (title, body, actions) { ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title">' + title + '</div>' + body + '<div class="backup-pick-actions">' + actions + '</div></div>'; };
      var bindCancel = function (id) { var b = ov.querySelector('#' + id); if (b) b.onclick = function () { ov.remove(); cancel(); }; };
      if (!K.dekOk) {
        /* کلید محلی آسیب‌دیده و غیرقابل‌بررسی: هرگز بی‌سروصدا پاک نمی‌شود */
        panel('کلید این دستگاه قابل استفاده نیست',
          '<div class="bk-enc-txt" id="bkEncGTxt">کلید رمزنگاریِ ذخیره‌شده روی این دستگاه آسیب دیده و قابل بررسی نیست؛ با آن هیچ پشتیبانی باز نمی‌شود. پشتیبان‌های رمزدار قبلی فقط با رمز پشتیبان یا کد بازیابی قبلی باز می‌شوند.\n' +
          '• با ادامه، این کلید آسیب‌دیده ' + act + ' می‌شود.\n• هیچ فایل پشتیبانی پاک نمی‌شود.</div>',
          '<button type="button" class="backup-pick-ok" id="bkEncGBrokenGo">ادامه</button><button type="button" class="backup-pick-cancel" id="bkEncGCancel">انصراف</button>');
        bindCancel('bkEncGCancel');
        ov.querySelector('#bkEncGBrokenGo').onclick = function () { ov.remove(); onPass(); };
        return;
      }
      var canRepair = !!repair && purpose === 'reset' && (function () { var st = hkAutoEncState(); return !st || st.broken; })();
      var showVerify = function () {
        panel('تأیید رمز یا کد بازیابی قبلی',
          '<div class="bk-enc-txt" id="bkEncGTxt">پیش از ' + (purpose === 'reset' ? 'ساختن کلید جدید' : 'خاموش کردن رمزنگاری') + '، رمز پشتیبان یا کد بازیابیِ همین کلید را وارد کنید تا مطمئن شویم پشتیبان‌های رمزدار قبلی بعداً هم با آن باز می‌شوند. تا آن موقع کلید این دستگاه و فایل‌ها دست نمی‌خورند.' +
          (canRepair ? '\n• اگر فقط می‌خواهید رمز و کد تازه داشته باشید، «رمز و کد تازه برای همین کلید» را بزنید؛ کلید عوض نمی‌شود و پشتیبان‌های قبلی روی همین گوشی مثل قبل باز می‌شوند.' : '') + '</div>' +
          hkPwdFieldHtml('bkEncGIn', 'current-password', '') + '<div class="bk-enc-err" id="bkEncGErr"></div>',
          '<button type="button" class="backup-pick-ok" id="bkEncGByPw">بررسی با رمز</button><button type="button" class="backup-pick-ok" id="bkEncGByRc">بررسی با کد بازیابی</button>' +
          (canRepair ? '<button type="button" class="bk-enc-btn" id="bkEncGRepair">رمز و کد تازه برای همین کلید…</button>' : '') +
          '<button type="button" class="bk-enc-btn" id="bkEncGLost">هیچ‌کدام را ندارم…</button><button type="button" class="backup-pick-cancel" id="bkEncGCancel">انصراف</button>');
        var err = function (m) { var e = ov.querySelector('#bkEncGErr'); if (e) e.textContent = m; };
        var busy = false;
        var go = async function (type) {
          if (busy) return;
          var inp = ov.querySelector('#bkEncGIn'), v = inp.value;
          busy = true; err('در حال بررسی…');
          var ok = false;
          try { ok = await hkAutoEncVerifyOld(K, type, v); } catch (eV) { ok = false; }
          v = ''; inp.value = ''; busy = false;
          if (!ov.isConnected) return;
          if (!ok) return err((type === 'password' ? 'رمز' : 'کد بازیابی') + ' درست نیست یا پشتیبانی با آن باز نشد؛ هیچ تغییری اعمال نشد.');
          ov.remove(); onPass();
        };
        ov.querySelector('#bkEncGByPw').onclick = function () { go('password'); };
        ov.querySelector('#bkEncGByRc').onclick = function () { go('recovery'); };
        if (canRepair) ov.querySelector('#bkEncGRepair').onclick = function () { if (busy) return; ov.remove(); repair(); };
        ov.querySelector('#bkEncGLost').onclick = function () { if (!busy) showLost(); };
        bindCancel('bkEncGCancel');
      };
      var showLost = function () {
        panel('بدون رمز و کد بازیابی قبلی',
          '<div class="bk-enc-txt" id="bkEncGLostTxt">اگر ادامه دهید، کلید رمزنگاری این دستگاه ' + act + ' می‌شود. پشتیبان‌های رمزدار قبلی فقط با رمز پشتیبان یا کد بازیابی قبلی باز می‌شوند؛ اگر هیچ‌کدام را ندارید، ممکن است دسترسی به آن‌ها برای همیشه از بین برود. هیچ راه تضمین‌شده‌ای برای بازگرداندن آن‌ها وجود ندارد.\n' +
          '• هیچ فایل پشتیبانی پاک نمی‌شود.' + (canRepair ? '\n• پیشنهاد: به‌جای این کار «رمز و کد تازه برای همین کلید» را انتخاب کنید؛ کلید عوض نمی‌شود.' : '') + '</div>' +
          '<label class="bk-enc-ack"><input type="checkbox" id="bkEncGAck"> می‌دانم ممکن است دسترسی به پشتیبان‌های رمزدار قبلی را از دست بدهم</label>',
          '<button type="button" class="backup-pick-ok" id="bkEncGLostGo" disabled>ادامه با وجود خطر</button><button type="button" class="backup-pick-cancel" id="bkEncGCancel2">انصراف</button>');
        var ack = ov.querySelector('#bkEncGAck'), goB = ov.querySelector('#bkEncGLostGo');
        ack.onchange = function () { goB.disabled = !ack.checked; };
        goB.onclick = function () { if (!ack.checked) return; ov.remove(); onPass(); };
        bindCancel('bkEncGCancel2');
      };
      showVerify();
    }
    /* فیلد رمز با دکمهٔ چشم (نمایش/پنهان) داخل باکس */
    var HK_EYE_SVG = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var HK_EYE_OFF_SVG = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
    /* باکس رمز فایل پشتیبان (رمز + تکرار)؛ done(رمز) یا done('') با انصراف/بازگشت/زدن بیرون */
    function hkBackupPwdBox(done) {
      var ov = _hkEncOverlay('bkPwdBox');
      ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title bk-enc-title">رمز فایل پشتیبان</div>' +
        '<div class="bk-pwd-wrap"><label for="bkPwdA">رمز</label>' + hkPwdFieldHtml('bkPwdA', 'new-password', '') +
        '<label for="bkPwdB">تکرار رمز</label>' + hkPwdFieldHtml('bkPwdB', 'new-password', '') + '</div>' +
        '<div class="bk-enc-err" id="bkPwdErr"></div>' +
        '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkPwdSetOk">تأیید</button><button type="button" class="backup-pick-cancel" id="bkPwdSetCancel">انصراف</button></div></div>';
      var fin = function (v) { try { ov.remove(); } catch (e) {} try { done(v); } catch (e2) {} };
      ov.querySelector('#bkPwdSetCancel').onclick = function () { fin(''); };
      ov.querySelector('#bkPwdSetOk').onclick = function () {
        var a = ov.querySelector('#bkPwdA').value || '', b = ov.querySelector('#bkPwdB').value || '';
        var er = ov.querySelector('#bkPwdErr');
        if (!a) { er.textContent = 'رمز را وارد کنید.'; return; }
        if (a !== b) { er.textContent = 'دو رمز یکسان نیستند.'; return; }
        fin(a);
      };
      try { setTimeout(function () { ov.querySelector('#bkPwdA').focus(); }, 60); } catch (e) {}
    }
    function hkPwdFieldHtml(id, ac, ph) {
      return '<div class="bk-pwd-box"><input type="password" id="' + id + '" class="bk-pwd" autocomplete="' + ac + '" placeholder="' + ph + '" dir="ltr">' +
        '<button type="button" class="bk-pwd-eye" data-for="' + id + '" aria-label="نمایش رمز" title="نمایش رمز">' + HK_EYE_OFF_SVG + '</button></div>';
    }
    (function () {
      function eyeOf(t) { return t && t.closest ? t.closest('.bk-pwd-eye') : null; }
      /* فوکوس از فیلد نپرد (کیبورد بسته نشود) */
      document.addEventListener('mousedown', function (e) { if (eyeOf(e.target)) e.preventDefault(); }, true);
      document.addEventListener('click', function (e) {
        var b = eyeOf(e.target); if (!b) return;
        e.preventDefault();
        var inp = document.getElementById(b.getAttribute('data-for')); if (!inp) return;
        var show = inp.type === 'password';
        try { inp.type = show ? 'text' : 'password'; } catch (eT) {}
        b.classList.toggle('on', show);
        /* رمز دیده می‌شود = چشم باز (آبی)؛ پنهان = چشم خط‌خورده (طوسی) */
        b.innerHTML = show ? HK_EYE_SVG : HK_EYE_OFF_SVG;
        var lbl = show ? 'پنهان کردن رمز' : 'نمایش رمز';
        b.setAttribute('aria-label', lbl); b.title = lbl;
      });
    })();
    /* ===== رابط رمزنگاری پشتیبان خودکار ===== */
    function hkAutoEncRowHtml() {
      var st = hkAutoEncState(), s = autoBkState();
      var mode = !st ? 'خاموش' : (st.broken ? 'روشن، ولی کلید روی این دستگاه پیدا نشد' : 'روشن');
      /* کلید روشن/خاموش (مستطیل گرد) جلوی عنوان؛ روشن کردن = پنجرهٔ تعیین رمز، خاموش کردن = تأیید */
      var on = !!st;
      /* تا «پشتیبان خودکار» خاموش است، سطر رمزنگاری آن پنهان است */
      var h = '<div class="bk-enc-wrap' + (s.enabled === false ? ' bk-enc-hide' : '') + '" id="bkEncRow"><div class="bk-enc-in"><div class="bk-sw-row bk-enc-line"><span class="bk-ttl">رمزنگاری پشتیبان خودکار' + hkInfoBtnHtml('با روشن کردن، فایل‌های پشتیبان خودکار رمزنگاری می‌شوند و بدون رمز یا کد بازیابی قابل خواندن نیستند.\nکلید روی همین گوشی نگه داشته می‌شود؛ در گوشی دیگر یا بعد از نصب دوباره، فقط با رمز یا کد بازیابی باز می‌شوند.\nپشتیبان‌هایی که قبلاً بی‌رمز گرفته شده‌اند، بی‌رمز می‌مانند.') + (st && st.broken ? ' <span id="bkEncMode" style="color:#ff9f0a;">(کلید روی این دستگاه پیدا نشد)</span>' : '') + '</span>' +
        '<button type="button" class="hk-switch' + (on ? ' on' : '') + '" id="bkEncBtn" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="رمزنگاری پشتیبان خودکار"><i></i></button></div>';
      if (st && st.broken) h += '<div class="bk-enc-line"><span></span><button type="button" class="bk-enc-btn" id="bkEncFix">تنظیم دوباره…</button></div>';
      if (st && !st.broken && s.lastEncOkAt) h += '<div class="bk-enc-line"><span></span><button type="button" class="bk-enc-btn" id="bkEncCleanup">پاک کردن پشتیبان‌های خودکار بی‌رمز قدیمی…</button></div>';
      if (s.lastErrorText) h += '<div class="bk-enc-err" id="bkAutoErr">' + escapeHtml(s.lastErrorText) + '</div>';
      return h + '</div></div>';
    }
    function _hkEncOverlay(id) {
      var old = document.getElementById(id); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = id; ov.className = 'backup-pick-overlay hk-enc-ov';
      document.body.appendChild(ov);
      /* زدن بیرون باکس یا دکمهٔ بازگشت = همان «انصراف» پنجرهٔ فعلی */
      ov._hkCancel = function () {
        var c = ov.querySelector('.backup-pick-cancel');
        if (c) c.click(); else ov.remove();
      };
      ov.addEventListener('click', function (e) { if (e.target === ov && !document.getElementById('hkInfoTip')) ov._hkCancel(); });
      return ov;
    }
    /** راه‌اندازی: توضیح ← رمز (دو بار) ← نمایش کد بازیابی ← واردکردن دوبارهٔ کد ← آزمون کامل ← فقط آنگاه روشن.
        هر انصراف یا شکستی = هیچ تغییری (رمزنگاری خاموش می‌ماند و مسیر فعلی پشتیبان دست نمی‌خورد). */
    var HK_ENC_OLD_KEY_WARN = 'هر بار راه‌اندازی، کلید تازه‌ای می‌سازد: پشتیبان‌های رمزدارِ قبلی با رمز و کد جدید باز نمی‌شوند و برای بازکردنشان همان رمز پشتیبان یا کد بازیابیِ قبلی لازم است. راه‌اندازی دوباره، رمز و کد قبلی را جایگزین نمی‌کند و فایل‌های قبلی را دوباره رمزنگاری نمی‌کند؛ پس رمز و کد قبلی را هم نگه دارید.';
    function hkAutoEncSetup(onDone) {
      var done = function () { try { if (onDone) onDone(); } catch (e) {} };
      var ov = _hkEncOverlay('bkEncSetup');
      if (!(window.crypto && crypto.subtle && crypto.getRandomValues)) {
        ov.remove(); showToastLong('این دستگاه از رمزنگاری پشتیبانی نمی‌کند؛ رمزنگاری پشتیبان خودکار روشن نشد.'); return done();
      }
      /* اگر قبلاً کلیدی وجود داشته (تنظیم دوباره)، پیش از هر کاری هشدار صریح و فرصت انصراف؛ هیچ کلید یا فایلی اینجا پاک نمی‌شود */
      var prior = !!hkAutoEncState() || autoBkState().encEverEnabled === true || hkAutoEncRaw().raw != null;
      if (prior) {
        ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title">پیش از راه‌اندازی دوباره</div>' +
          '<div class="bk-enc-txt" id="bkEncPriorTxt">' + HK_ENC_OLD_KEY_WARN + '\n' +
          '• با فعال‌سازی کلید جدید، کلید قبلیِ ذخیره‌شده روی همین گوشی هم جایگزین می‌شود؛ از آن به بعد، حتی روی همین گوشی، پشتیبان‌های رمزدار قبلی فقط با رمز پشتیبان یا کد بازیابی قبلی باز می‌شوند.\n' +
          '• هیچ فایل پشتیبانی پاک نمی‌شود.</div>' +
          '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkEncPriorGo">متوجه شدم، ادامه</button><button type="button" class="backup-pick-cancel" id="bkEncPriorCancel">انصراف</button></div></div>';
        ov.querySelector('#bkEncPriorCancel').onclick = function () { ov.remove(); done(); };
        ov.querySelector('#bkEncPriorGo').onclick = function () { ov.remove(); guarded(); };
        return;
      }
      ov.remove(); guarded();
      /* کلید محلی فعلی فقط پس از آزمون رمز/کد قبلی یا تأیید صریح جایگزین می‌شود */
      function guarded() {
        hkAutoEncGuard('reset', function () { hkAutoEncSetupForm(_hkEncOverlay('bkEncSetup'), done); }, done,
          function () { hkAutoEncSetupForm(_hkEncOverlay('bkEncSetup'), done, 'repair'); });
      }
    }
    function hkAutoEncSetupForm(ov, done, mode) {
      var isRepair = mode === 'repair';
      /* همهٔ توضیح‌ها داخل باکس اطلاعاتِ کنار عنوان؛ پنجره فقط فیلدها و دکمه‌ها را دارد */
      var tip = isRepair ?
        'رمز پشتیبان و کد بازیابی تازه برای همان کلید رمزنگاری ساخته می‌شود؛ خود کلید عوض نمی‌شود.\n' +
        '• پشتیبان‌های رمزدار قبلی روی همین گوشی مثل قبل باز می‌شوند.\n' +
        '• پشتیبان‌های تازه با رمز یا کد جدید باز می‌شوند.\n' +
        '• پشتیبان‌های قبلی روی گوشی دیگر یا بعد از نصب دوباره فقط با رمز یا کد بازیابی قبلی باز می‌شوند؛ این فایل‌ها دوباره رمزنگاری نمی‌شوند.\n' +
        '• اگر رمز و کد تازه را هم گم کنید، پشتیبان‌های تازه روی گوشی دیگر باز نمی‌شوند.' :
        'با روشن کردن این گزینه، پشتیبان‌های خودکار (حافظهٔ داخلی و «آخرین پشتیبان» در Download/HesabKetab) رمزدار ذخیره می‌شوند و بدون رمز پشتیبان یا کد بازیابی خوانده نمی‌شوند.\n' +
        '• رمز پشتیبان: رمزی که خودتان انتخاب می‌کنید؛ با آن پشتیبان‌های رمزدار باز می‌شوند.\n' +
        '• کد بازیابی: کدی ۲۵ نویسه‌ای که در مرحلهٔ بعد فقط یک بار نشان داده می‌شود. اگر رمز را فراموش کنید، پشتیبان با این کد هم باز می‌شود؛ آن را روی کاغذ یا جایی بیرون از همین گوشی نگه دارید.\n' +
        '• برای بازیابی روی گوشی دیگر یا بعد از نصب دوباره، «رمز پشتیبان» یا «کد بازیابی» لازم است؛ هر فایل با هر کدام از این دو باز می‌شود. هیچ‌کدام در گوشی ذخیره نمی‌شوند.\n' +
        '• اگر هر دو را گم کنید، پشتیبان‌های رمزدار برای همیشه باز نمی‌شوند و هیچ‌کس نمی‌تواند بازشان کند.\n' +
        '• این کار اطلاعات داخل خود برنامه را رمز نمی‌کند؛ برای آن قفل برنامه و قفل گوشی را روشن کنید.\n' +
        '• پشتیبان‌های بی‌رمز قبلی خودبه‌خود پاک نمی‌شوند.\n' +
        '• ' + HK_ENC_OLD_KEY_WARN;
      ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title bk-enc-title">' + (isRepair ? 'رمز و کد تازه برای همین کلید' : 'رمزنگاری پشتیبان خودکار') + ' ' + hkInfoBtnHtml(tip) + '</div>' +
        '<div class="bk-pwd-wrap"><label for="bkEncPw1">رمز پشتیبان (دست‌کم ۱۰ نویسه، فقط عدد نباشد)</label>' + hkPwdFieldHtml('bkEncPw1', 'new-password', '') +
        '<label for="bkEncPw2">تکرار رمز</label>' + hkPwdFieldHtml('bkEncPw2', 'new-password', '') + '</div>' +
        '<div class="bk-enc-err" id="bkEncErr"></div>' +
        '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkEncNext">ادامه</button><button type="button" class="backup-pick-cancel" id="bkEncCancel">انصراف</button></div></div>';
      var err = function (m) { var e = ov.querySelector('#bkEncErr'); if (e) e.textContent = m; };
      ov.querySelector('#bkEncCancel').onclick = function () { ov.remove(); done(); };
      ov.querySelector('#bkEncNext').onclick = function () {
        var p1 = ov.querySelector('#bkEncPw1').value, p2 = ov.querySelector('#bkEncPw2').value;
        var pe = hkPwPolicyError(p1); if (pe) return err(pe);
        if (hkNormPwV1(p1) !== hkNormPwV1(p2)) return err('دو رمز یکسان نیستند.');
        var code = hkGenRecoveryCode();
        ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title bk-enc-title">کد بازیابی ' + hkInfoBtnHtml('کد بازیابی راه دوم بازکردن پشتیبان‌های رمزدار است: اگر رمز پشتیبان را فراموش کنید، با همین کد باز می‌شوند.\n• آن را روی کاغذ بنویسید یا جای امنی بیرون از همین گوشی نگه دارید.\n• این کد در گوشی ذخیره نمی‌شود و دوباره نشان داده نمی‌شود.\n• برای اطمینان از درست نوشتن، یک بار دیگر واردش کنید.') + '</div>' +
          '<div class="bk-enc-txt">این کد فقط همین یک بار نمایش داده می‌شود.</div>' +
          '<input type="text" readonly class="bk-enc-code" id="bkEncCode" dir="ltr" value="' + hkFormatRecoveryCode(code) + '">' +
          '<div class="backup-pick-actions" style="margin-top:6px"><button type="button" class="bk-enc-btn" id="bkEncCopy">کپی کد</button></div>' +
          '<div class="bk-pwd-wrap"><label for="bkEncRc2">برای اطمینان، کد بازیابی را دوباره وارد کنید</label><input type="text" class="bk-enc-code" id="bkEncRc2" dir="ltr" autocomplete="off" spellcheck="false"></div>' +
          '<div class="bk-enc-err" id="bkEncErr"></div>' +
          '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkEncOn">فعال‌سازی</button><button type="button" class="backup-pick-cancel" id="bkEncCancel2">انصراف</button></div></div>';
        ov.querySelector('#bkEncCancel2').onclick = function () { code = ''; ov.remove(); done(); };
        ov.querySelector('#bkEncCopy').onclick = function () {
          var inp = ov.querySelector('#bkEncCode');
          try { inp.select(); } catch (e) {}
          try { navigator.clipboard.writeText(inp.value).then(function () { showToast('کد کپی شد؛ آن را جای امنی نگه دارید'); }, function () { showToast('کپی خودکار ممکن نشد؛ کد را دستی بنویسید'); }); }
          catch (e2) { showToast('کپی خودکار ممکن نشد؛ کد را دستی بنویسید'); }
        };
        var busy = false;
        ov.querySelector('#bkEncOn').onclick = async function () {
          if (busy) return;
          if (hkNormRecoveryCode(ov.querySelector('#bkEncRc2').value) !== code) return err('کد واردشده با کد بازیابی یکسان نیست.');
          busy = true; err('در حال آماده‌سازی رمزنگاری…');
          var ok = false;
          try { ok = await (isRepair ? hkAutoEncRepair(p1, code) : hkAutoEncActivate(p1, code)); } catch (eA) { ok = false; }
          p1 = p2 = code = '';
          busy = false;
          if (!ok) { ov.remove(); showToastLong(isRepair ? 'رمز و کد تازه ثبت نشد؛ کلید این دستگاه بدون تغییر ماند.' : 'رمزنگاری پشتیبان خودکار روشن نشد؛ هیچ تغییری اعمال نشد و پشتیبان خودکار مثل قبل ادامه دارد.'); return done(); }
          ov.remove();
          showToastLong(isRepair ? 'رمز و کد تازه برای همان کلید ثبت شد؛ پشتیبان‌های قبلی روی همین گوشی مثل قبل باز می‌شوند. رمز و کد تازه را گم نکنید.' : 'رمزنگاری پشتیبان خودکار روشن شد. رمز پشتیبان و کد بازیابی را گم نکنید.');
          try { writeAutoBackup('daily'); } catch (eW) {}
          done();
        };
      };
    }
    /** ساخت کلید، آزمون مستقل هر دو راه بازیابی و یک رفت‌وبرگشت کامل؛ فقط پس از موفقیت همه، ذخیره و روشن می‌شود */
    async function hkAutoEncActivate(password, code) {
      var rec = await hkAutoEncCreateKey(password, code);
      var d1 = await hkEncUnwrapDek(rec, 'password', password), d2 = await hkEncUnwrapDek(rec, 'recovery', code);
      var raw = _b64FromBytes(d1);
      if (raw !== rec.dek || _b64FromBytes(d2) !== rec.dek) return false;
      var probe = JSON.stringify({ app: 'hesab-ketab', probe: true });
      var env = await hkEncSeal(probe, rec);
      if (await hkEncOpen(env, d2) !== probe) return false;
      return _hkStoreKeyRec(rec);
    }
    /** نوشتن رکورد کلید و روشن‌کردن؛ اگر بررسی پس از نوشتن شکست بخورد، رکورد و وضعیت قبلی دقیقاً برگردانده می‌شوند (نه حذف) */
    function _hkStoreKeyRec(rec) {
      var prevRaw = hkAutoEncRaw().raw, prevState = JSON.stringify(autoBkState());
      if (!hkStorageSet(HK_AUTO_ENC_KEY, JSON.stringify(rec))) return false;
      var s = autoBkState(); s.encEnabled = true; s.encEverEnabled = true; delete s.lastEncOkAt; autoBkSave(s);
      var chk = hkAutoEncState();
      if (!chk || chk.broken || chk.dekId !== rec.dekId || chk.dek !== rec.dek) {
        try { if (prevRaw == null) localStorage.removeItem(HK_AUTO_ENC_KEY); else localStorage.setItem(HK_AUTO_ENC_KEY, prevRaw); } catch (e) {}
        try { autoBkSave(JSON.parse(prevState)); } catch (e2) {}
        return false;
      }
      return true;
    }
    /** ترمیم: wrapهای تازه (رمز و کد جدید) برای همان DEK و dekId. فقط وقتی DEK محلی از نظر ساختار سالم است.
        هر دو wrap تازه مستقل آزموده می‌شوند و یک رفت‌وبرگشت کامل انجام می‌شود؛ هر شکستی = رکورد قبلی بدون تغییر. */
    async function hkAutoEncRepair(password, code) {
      var K = hkAutoEncRaw();
      if (!K.dekOk) return false;
      var dekId = K.rec.dekId;
      var rec = { v: 1, dekId: dekId, dek: _b64FromBytes(K.dek), wraps: [await _hkMakeWrap('password', password, K.dek, dekId), await _hkMakeWrap('recovery', code, K.dek, dekId)],
        createdAt: Number(K.rec.createdAt) || Date.now(), repairedAt: Date.now() };
      var d1 = await hkEncUnwrapDek(rec, 'password', password), d2 = await hkEncUnwrapDek(rec, 'recovery', code);
      if (!_hkBytesEq(d1, K.dek) || !_hkBytesEq(d2, K.dek)) return false;
      var probe = JSON.stringify({ app: 'hesab-ketab', probe: true });
      if (await hkEncOpen(await hkEncSeal(probe, rec), d1) !== probe) return false;
      if (hkAutoEncRaw().raw !== K.raw) return false;   /* رکورد در این فاصله عوض شده؛ کاری نکن */
      return _hkStoreKeyRec(rec);
    }
    function hkAutoEncDisable(onDone) {
      var done = function () { try { if (onDone) onDone(); } catch (e3) {} };
      askConfirm('رمزنگاری پشتیبان خودکار خاموش شود؟ از این پس پشتیبان‌های خودکار بدون رمز ذخیره می‌شوند. پشتیبان‌های رمزدار قبلی همچنان با رمز پشتیبان یا کد بازیابی باز می‌شوند.', function () {
        /* کلید محلی فقط پس از آزمون رمز/کد قبلی یا تأیید صریح «هیچ‌کدام را ندارم» پاک می‌شود */
        hkAutoEncGuard('disable', function () {
          var removed = false;
          try { localStorage.removeItem(HK_AUTO_ENC_KEY); removed = localStorage.getItem(HK_AUTO_ENC_KEY) == null; } catch (e) { removed = false; }
          if (!removed) { showToastLong('خاموش کردن رمزنگاری ممکن نشد؛ هیچ تغییری اعمال نشد.'); return done(); }
          var s = autoBkState(); s.encEnabled = false; delete s.lastEncOkAt; autoBkSave(s);
          showToast('رمزنگاری پشتیبان خودکار خاموش شد');
          done();
        }, done);
      }, done);
    }
    function _hkB64ToText(b64) { return new TextDecoder('utf-8', { fatal: true }).decode(_bytesFromB64(b64)); }
    /** پاک‌کردن پشتیبان‌های خودکار بی‌رمز قدیمی — فقط با تأیید صریح کاربر و فقط پس از تأیید مستقل جدیدترین فایل رمزدار.
        فقط فایل‌های پوشهٔ HesabKetab که محتوایشان واقعاً پشتیبان بی‌رمز است؛ فایل‌های دستی و رمزدار هرگز. */
    async function hkAutoEncCleanup(onDone) {
      var done = function () { try { if (onDone) onDone(); } catch (e) {} };
      var P = autoBkPlugin(), st = hkAutoEncState();
      if (!P || typeof P.readAutoBackup !== 'function' || !st || st.broken) { showToast('این کار روی این دستگاه ممکن نیست'); return done(); }
      var files = [];
      try { files = await autoBkAllFiles(P, true); } catch (e) { showToast('فهرست پشتیبان‌ها خوانده نشد؛ چیزی پاک نشد'); return done(); }
      var byNew = function (a, b) { return (Number(b.modified) || 0) - (Number(a.modified) || 0) || String(b.name).localeCompare(String(a.name)); };
      var encFiles = files.filter(function (f) { return /-enc\.json$/.test(String(f.name)); }).sort(byNew);
      var verified = false;
      try {
        if (encFiles.length) {
          var env = hkSafeJsonParse(_hkB64ToText((await P.readAutoBackup({ name: encFiles[0].name, store: encFiles[0].store })).data));
          if (!hkEncEnvelopeError(env) && env.dekId === st.dekId) { var obj = hkSafeJsonParse(await hkEncOpen(env, _bytesFromB64(st.dek))); verified = !!(obj && obj.app === 'hesab-ketab'); }
        }
      } catch (eV) { verified = false; }
      if (!verified) { showToastLong('هنوز پشتیبان رمزدارِ تأییدشده‌ای در پوشه نیست؛ چیزی پاک نشد.'); return done(); }
      var plain = [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i]; if (/-enc\.json$/.test(String(f.name))) continue;
        try {
          var o = hkSafeJsonParse(_hkB64ToText((await P.readAutoBackup({ name: f.name, store: f.store })).data));
          if (o && typeof o === 'object' && o.app === 'hesab-ketab' && !o.format && !o.cipher && !o.enc) plain.push(f);
        } catch (eR) {}
      }
      if (!plain.length) { showToast('پشتیبان خودکار بی‌رمز قدیمی پیدا نشد'); return done(); }
      askConfirm(toPersianDigits(String(plain.length)) + ' پشتیبان خودکار قدیمیِ بدون رمز پیدا شد. حذف شوند؟ پشتیبان‌های دستی شما و فایل‌های رمزدار دست نمی‌خورند.', async function () {
        var bad = 0;
        for (var j = 0; j < plain.length; j++) { try { await P.deleteAutoBackup({ name: plain[j].name, store: plain[j].store }); } catch (eD) { bad++; } }
        showToastLong(bad ? (toPersianDigits(String(plain.length - bad)) + ' فایل حذف شد و ' + toPersianDigits(String(bad)) + ' فایل حذف نشد.') : 'پشتیبان‌های خودکار بی‌رمز قدیمی حذف شدند.');
        done();
      }, done);
    }
    /** بازکردن پشتیبان رمزدار قالب جدید؛ تا رمزگشایی و احراز کامل و تجزیهٔ موفق، هیچ داده‌ای تغییر نمی‌کند */
    async function hkOpenEncryptedBackup(env) {
      var err = hkEncEnvelopeError(env);
      if (err === 'unsupported_version') { showToastLong('این پشتیبان با نسخهٔ جدیدتر برنامه ساخته شده؛ برنامه را به‌روز کنید. هیچ تغییری اعمال نشد.'); return; }
      if (err) { showToastLong('فایل پشتیبان رمزدار آسیب دیده یا ناشناخته است؛ هیچ تغییری اعمال نشد.'); return; }
      var proceed = async function (dek) {
        var plain;
        try { plain = await hkEncOpen(env, dek); } catch (eO) { showToastLong('فایل پشتیبان رمزدار دست‌کاری شده یا آسیب دیده است؛ هیچ تغییری اعمال نشد.'); return; }
        var d2 = null; try { d2 = hkSafeJsonParse(plain); } catch (eP) { d2 = null; }
        if (!d2 || typeof d2 !== 'object') { showToastLong('محتوای پشتیبان رمزدار قابل خواندن نیست؛ هیچ تغییری اعمال نشد.'); return; }
        openBackupRestoreChoice(d2);
      };
      var local = hkAutoEncState();
      if (local && !local.broken && local.dekId === env.dekId) return proceed(_bytesFromB64(local.dek));
      var ov = _hkEncOverlay('bkEncAsk');
      ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title">این پشتیبان رمزدار است</div>' +
        '<div class="bk-enc-txt">رمز پشتیبان یا کد بازیابی را وارد کنید.</div>' + hkPwdFieldHtml('bkEncIn', 'current-password', '') +
        '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkEncByPw">باز کردن با رمز</button>' +
        '<button type="button" class="backup-pick-ok" id="bkEncByRc">باز کردن با کد بازیابی</button>' +
        '<button type="button" class="backup-pick-cancel" id="bkEncNo">انصراف</button></div></div>';
      ov.querySelector('#bkEncNo').onclick = function () { ov.remove(); };
      var go = async function (type) {
        var v = ov.querySelector('#bkEncIn').value; ov.remove();
        var dek;
        try { dek = await hkEncUnwrapDek(env, type, v); }
        catch (eU) { showToastLong((type === 'password' ? 'رمز پشتیبان' : 'کد بازیابی') + ' نادرست است یا فایل دست‌کاری شده؛ هیچ تغییری اعمال نشد.'); return; }
        finally { v = ''; }
        return proceed(dek);
      };
      ov.querySelector('#bkEncByPw').onclick = function () { go('password'); };
      ov.querySelector('#bkEncByRc').onclick = function () { go('recovery'); };
    }
    function askBackupPassword(onOk) {
      var old = document.getElementById('bkPwdAsk'); if (old) old.remove();
      var ov = document.createElement('div');
      ov.id = 'bkPwdAsk'; ov.className = 'backup-pick-overlay';
      ov.innerHTML = '<div class="backup-pick-panel" role="dialog"><div class="backup-pick-title">این پشتیبان رمز دارد</div>' +
        hkPwdFieldHtml('bkPwdIn', 'current-password', 'رمز فایل') +
        '<div class="backup-pick-actions"><button type="button" class="backup-pick-ok" id="bkPwdOk">باز کردن</button><button type="button" class="backup-pick-cancel" id="bkPwdNo">انصراف</button></div></div>';
      document.body.appendChild(ov);
      var inp = ov.querySelector('#bkPwdIn');
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
      ov.querySelector('#bkPwdNo').onclick = function () { ov.remove(); };
      var go = function () { var v = inp.value; ov.remove(); onOk(v); };
      ov.querySelector('#bkPwdOk').onclick = go;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }
    /* ساخت محتوای پشتیبان (همان محتوای دکمهٔ پشتیبان‌گیری؛ sel=null یعنی همه‌چیز و همهٔ ماه‌ها) */
    function buildBackupPayload(selectedParts) {
      var sel = selectedParts || null;
      function want(k) { return !sel || !!sel[k]; }
      const payload = {
        version: 1,
        app: 'hesab-ketab',
        exportedAt: new Date().toISOString(),
        currentYear: currentYear,
        currentMonth: currentMonth,
        familyCode: typeof familyCode !== 'undefined' ? familyCode : '',
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
        backupParts: sel || { all: true }
      };
      if (want('archive')) {
        var cardList = null, monthList = null;
        try {
          if (sel && Array.isArray(sel.selectedUserCards) && sel.selectedUserCards.length && !sel._allUserCards)
            cardList = sel.selectedUserCards.slice();
        } catch (eCL) {}
        try {
          if (sel && Array.isArray(sel.selectedMonths) && sel.selectedMonths.length && !sel._allMonths)
            monthList = sel.selectedMonths.slice();
        } catch (eML) {}
        var srcArch = archive;
        if (monthList && monthList.length) {
          srcArch = {};
          monthList.forEach(function(k) {
            if (archive && archive[k]) {
              try { srcArch[k] = JSON.parse(JSON.stringify(archive[k])); }
              catch (e) { srcArch[k] = archive[k]; }
            }
          });
          try {
            var ck = periodKey(currentYear, currentMonth);
            if (monthList.indexOf(ck) >= 0 && !srcArch[ck] && periodData) {
              try { srcArch[ck] = JSON.parse(JSON.stringify(periodData)); }
              catch (e2) { srcArch[ck] = periodData; }
            }
          } catch (eCur) {}
        }
        if (cardList && cardList.length) {
          payload.archive = filterArchiveByUserCards(srcArch, cardList);
          payload.selectedUserCards = cardList.slice();
        } else {
          payload.archive = srcArch;
          try { payload.selectedUserCards = (typeof allPersonTitles === 'function') ? allPersonTitles() : []; }
          catch (eA) { payload.selectedUserCards = []; }
        }
        if (monthList && monthList.length) payload.selectedMonths = monthList.slice();
        try {
          var order = [];
          if (periodData && Array.isArray(periodData.personCardOrder) && periodData.personCardOrder.length)
            order = periodData.personCardOrder.slice();
          else if (typeof loadGlobalCardOrder === 'function') order = loadGlobalCardOrder();
          if (cardList && cardList.length) {
            var setO = {};
            cardList.forEach(function(t) { setO[String(t || '').trim()] = true; });
            order = order.filter(function(t) { return setO[String(t || '').trim()]; });
          }
          payload.personCardOrder = order;
        } catch (eO) {}
      }
      if (want('plans')) payload.plans = plans;
      if (want('recurringIncomes')) {
        payload.recurringIncomes = recurringIncomes;
        /* آرشیو درآمدهای ثابت (واریزهای وصل‌شده در همهٔ ماه‌ها) همراه تعریف‌ها؛ حتی اگر «آرشیو ماه‌ها» انتخاب نشده باشد */
        try { payload.recurringArchive = hkRecArchivePack(); } catch (eRa) {}
      }
      try {
        if (want('selectedBankAccounts')) {
          payload.selectedBankAccounts = selectedBankAccounts;
          payload.smsAccountBankMap = typeof smsAccountBankMap !== 'undefined' ? smsAccountBankMap : {};
          try { var _cb = hkCustomBanks(); if (_cb.length) payload.customBanks = _cb; } catch (eCb) {}
        }
        if (want('userReminders')) {
          try { payload.userReminders = typeof userReminders !== 'undefined' ? userReminders : []; } catch (eR) {}
        }
        if (want('savings')) {
          try { payload.savings = loadSavings(); } catch (eSv) {}
        }
        if (want('subjects')) {
          try {
            payload.financialSubjects = (typeof loadFinancialSubjects === 'function') ? loadFinancialSubjects() : [];
          } catch (eS) { payload.financialSubjects = []; }
        }
        /* دسته‌بندی مخارج: دیکشنری شخصی (اصلاح‌های کاربر) + دسته‌های سفارشی */
        if (want('categories')) {
          try { payload.categoryData = HKCategorizer.exportData(); } catch (eC) { bkWarn(payload, 'categories', eC); }
        }
      } catch (e) { bkWarn(payload, 'misc', e); }
      /* کارهای من (هر کارت/ماه) همراه آرشیو؛ اگر فقط چند کارت یا ماه انتخاب شده، فقط همان‌ها */
      if (want('archive')) {
        var todoMap = bkReadStoredJson(STORAGE_KEY + '_todos', payload, 'todos');
        if (todoMap && typeof todoMap === 'object' && !Array.isArray(todoMap)) {
          if (cardList || monthList) {
            var tSet = null, filtered = {};
            if (cardList) { tSet = {}; cardList.forEach(function (t) { tSet[String(t || '').trim()] = true; }); }
            Object.keys(todoMap).forEach(function (card) {
              if (tSet && !tSet[card]) return;
              var v = todoMap[card];
              if (!monthList || !v || typeof v !== 'object' || Array.isArray(v)) { filtered[card] = v; return; }
              var byMonth = {};
              monthList.forEach(function (ym) { if (Object.prototype.hasOwnProperty.call(v, ym)) byMonth[ym] = v[ym]; });
              if (Object.keys(byMonth).length) filtered[card] = byMonth;
            });
            todoMap = filtered;
          }
          payload.todos = todoMap;
        }
      }
      /* یادگیری بانکِ پیامک‌ها (متن پیامک ← بانک) همراه حساب‌های بانکی */
      if (want('selectedBankAccounts')) {
        var smsBankMap = bkReadStoredJson(STORAGE_KEY + '_smsBankMap', payload, 'smsBankMap');
        if (smsBankMap && typeof smsBankMap === 'object' && !Array.isArray(smsBankMap)) payload.smsBankMap = smsBankMap;
      }
      /* سطل زباله فقط در پشتیبان کامل (همهٔ بخش‌ها، همهٔ کارت‌ها و ماه‌ها)، چون موارد حذف‌شدهٔ همهٔ بخش‌ها را دارد */
      var isFull = !sel || (!cardList && !monthList && BACKUP_PART_KEYS.every(want));
      if (isFull) {
        var trash = bkReadStoredJson(STORAGE_KEY + '_trash', payload, 'trash');
        if (Array.isArray(trash)) payload.trash = trash;
      }
      /* کامل یا جزئی بودن فایل صریح ثبت می‌شود تا بازیابی «جایگزینی» بداند چه چیزی را می‌تواند عوض کند */
      payload.backupScope = {
        v: 1,
        complete: !!isFull,
        allMonths: !monthList,
        allCards: !cardList,
        months: payload.archive ? Object.keys(payload.archive).sort() : [],
        cards: cardList ? cardList.slice() : null,
        parts: BACKUP_PART_KEYS.filter(want)
      };
      return payload;
    }
    /* کامل بودن فایل پشتیبان: backupScope (جدید) ← backupParts (قدیمی) ← نامعلوم (قالب‌های قدیمی‌تر) */
    function bkBackupScope(data) {
      var s = data && data.backupScope;
      if (s && typeof s === 'object') {
        return { known: true, complete: s.complete === true,
          months: (!s.allMonths && Array.isArray(s.months)) ? s.months.slice() : null,
          cards: (!s.allCards && Array.isArray(s.cards) && s.cards.length) ? s.cards.slice() : null };
      }
      var bp = data && data.backupParts;
      if (bp && typeof bp === 'object') {
        var months = (Array.isArray(bp.selectedMonths) && bp.selectedMonths.length && !bp._allMonths) ? bp.selectedMonths.slice() : null;
        var cards = (Array.isArray(bp.selectedUserCards) && bp.selectedUserCards.length && !bp._allUserCards) ? bp.selectedUserCards.slice() : null;
        var allParts = bp.all === true || BACKUP_PART_KEYS.every(function (k) { return !!bp[k]; });
        return { known: true, complete: allParts && !months && !cards, months: months, cards: cards };
      }
      return { known: false, complete: false, months: null, cards: null };
    }
    /* جایگزینی محدود (فایل جزئی یا نامعلوم): فقط ماه‌های داخل فایل، و اگر فایل به چند کارت محدود است فقط همان کارت‌ها.
       ماه‌ها و کارت‌های دیگر دست نمی‌خورند. قرض‌ها (کارت‌محور نیستند) و موجودی‌های اول ماه فقط افزوده می‌شوند. */
    function replaceArchiveScoped(localArch, incArch, cards) {
      var out = JSON.parse(JSON.stringify(localArch || {}));
      var set = null;
      if (cards && cards.length) { set = {}; cards.forEach(function (t) { var k = String(t || '').trim(); if (k) set[k] = true; }); }
      Object.keys(incArch || {}).forEach(function (k) {
        var src = incArch[k];
        if (!src || typeof src !== 'object') return;
        if (!set || !out[k] || typeof out[k] !== 'object') { out[k] = JSON.parse(JSON.stringify(src)); return; }
        var dst = out[k];
        ['income', 'expense'].forEach(function (tab) {
          var lsec = (dst[tab] && Array.isArray(dst[tab].sections)) ? dst[tab].sections : [];
          var isec = (src[tab] && Array.isArray(src[tab].sections)) ? src[tab].sections : [];
          if (!dst[tab] || typeof dst[tab] !== 'object') dst[tab] = { sections: [], nextId: 1 };
          dst[tab].sections = lsec.filter(function (sec) { return !(sec && set[String(sec.title || '').trim()]); })
            .concat(JSON.parse(JSON.stringify(isec)));
          dst[tab].nextId = Math.max(dst[tab].nextId || 1, (src[tab] && src[tab].nextId) || 1, dst[tab].sections.length + 1);
        });
        ['personOpeningInstant', 'cardMeta'].forEach(function (f) {
          if (!dst[f] || typeof dst[f] !== 'object') dst[f] = {};
          Object.keys(set).forEach(function (t) { delete dst[f][t]; });
          var sm = src[f];
          if (sm && typeof sm === 'object') Object.keys(sm).forEach(function (t) { dst[f][t] = JSON.parse(JSON.stringify(sm[t])); });
        });
        dst.ledger = mergeLedgerBlocks(dst.ledger, src.ledger);
        var so = src.accountOpeningInstant;
        if (so && typeof so === 'object') {
          if (!dst.accountOpeningInstant || typeof dst.accountOpeningInstant !== 'object') dst.accountOpeningInstant = {};
          Object.keys(so).forEach(function (lb) { if (dst.accountOpeningInstant[lb] == null || dst.accountOpeningInstant[lb] === '') dst.accountOpeningInstant[lb] = so[lb]; });
        }
        if (Array.isArray(src.personCardOrder)) {
          if (!Array.isArray(dst.personCardOrder)) dst.personCardOrder = [];
          src.personCardOrder.forEach(function (t) { if (dst.personCardOrder.indexOf(t) < 0) dst.personCardOrder.push(t); });
        }
      });
      return out;
    }
    /* موجودی‌های اول ماهی که صاحب (حساب) ندارند دور ریخته نمی‌شوند: در _orphanOpenings نگه داشته می‌شوند */
    function hkStashOrphanOpenings(removed) {
      if (!removed || !Object.keys(removed).length) return;
      var KEY = STORAGE_KEY + '_orphanOpenings';
      var prev = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      Object.keys(removed).forEach(function (k) {
        prev[k] = prev[k] || {};
        Object.keys(removed[k]).forEach(function (lb) { if (prev[k][lb] == null) prev[k][lb] = removed[k][lb]; });
      });
      localStorage.setItem(KEY, JSON.stringify(prev));
    }
    /* حسابی که برگشته: موجودی‌های اول ماهِ نگه‌داشته‌اش (فقط جاهای خالی) به آرشیو برمی‌گردند و از انبار برداشته می‌شوند */
    function hkReviveOrphanOpenings() {
      var KEY = STORAGE_KEY + '_orphanOpenings';
      var store = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      var live = liveAccountLabelSet(), changed = false;
      Object.keys(store).forEach(function (k) {
        var m = store[k];
        if (!m || typeof m !== 'object') return;
        Object.keys(m).forEach(function (lb) {
          if (!live[(lb || '').trim()]) return;
          var pd = archive && archive[k];
          if (pd && typeof pd === 'object') {
            if (!pd.accountOpeningInstant || typeof pd.accountOpeningInstant !== 'object') pd.accountOpeningInstant = {};
            if (pd.accountOpeningInstant[lb] == null || pd.accountOpeningInstant[lb] === '') pd.accountOpeningInstant[lb] = m[lb];
          } else return;
          delete m[lb]; changed = true;
        });
        if (!Object.keys(m).length) delete store[k];
      });
      if (changed) localStorage.setItem(KEY, JSON.stringify(store));
    }
    var BACKUP_PART_KEYS = ['archive', 'plans', 'recurringIncomes', 'selectedBankAccounts', 'subjects', 'userReminders', 'savings', 'categories'];
    /* خطای پشتیبان‌گیری بی‌صدا رد نشود: نام بخش در فایل و کنسول ثبت می‌شود (بدون محتوای داده) */
    function bkWarn(payload, part, err) {
      try { (payload.backupWarnings = payload.backupWarnings || []).push(part); } catch (e) {}
      try { console.warn('backup: part "' + part + '" skipped:', err && err.name ? err.name : 'error'); } catch (e) {}
    }
    /* خواندن مستقیم کلید ذخیره‌شده؛ نبودِ کلید = null بدون هشدار، JSON خراب = هشدار (چیزی ساخته نمی‌شود) */
    function bkReadStoredJson(key, payload, part) {
      var raw = null;
      try { raw = localStorage.getItem(key); } catch (e) { bkWarn(payload, part, e); return null; }
      if (raw == null || raw === '') return null;
      try { return JSON.parse(raw); } catch (e2) { bkWarn(payload, part, e2); return null; }
    }
    /* همهٔ پیوست‌های ردیف‌ها (عکس / صدا) */
    function hkAllAttachments() {
      var out = [], seen = {}, cur = periodKey(currentYear, currentMonth);
      try {
        iterAllPeriodData(function (pd, key) {
          if (key === cur && pd !== periodData) return;
          ['income', 'expense'].forEach(function (tab) { ((pd[tab] && pd[tab].sections) || []).forEach(function (sc) { (sc.rows || []).forEach(function (r) {
            (Array.isArray(r && r.att) ? r.att : []).forEach(function (a) { if (a && a.id && !seen[a.id]) { seen[a.id] = 1; out.push(a); } });
          }); }); });
        });
      } catch (e) {}
      return out;
    }
    /* پشتیبان دستی: پیوست‌ها هم (اختیاری) — فایل‌ها base64 داخل همان فایل پشتیبان */
    function hkAttachmentsForBackup(list) {
      return Promise.all(list.map(function (a) {
        return HKAttach.get(a.id).then(function (blob) {
          if (!blob) return null;
          return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res({ id: a.id, type: blob.type || '', data: String(fr.result || '').split(',')[1] || '' }); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(blob); });
        }).catch(function () { return null; });
      })).then(function (arr) { return arr.filter(Boolean); });
    }
    function hkRestoreAttachments(arr) {
      if (!Array.isArray(arr) || !arr.length) return;
      arr.forEach(function (x) {
        try {
          if (!x || !x.id || !x.data) return;
          var bin = atob(x.data), u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          HKAttach.put(String(x.id), new Blob([u8], { type: x.type || '' })).catch(function () {});
        } catch (e) {}
      });
    }
    async function exportFullBackup(selectedParts, withAtt) {
      closeSideMenu();
      /* پیوست دارد: یک بار بپرس با پیوست‌ها یا بی پیوست */
      if (withAtt === undefined) {
        var _al = hkAllAttachments();
        if (_al.length) {
          var _sz = _al.reduce(function (t, a) { return t + (Number(a.size) || 0); }, 0);
          hkAsk3('پیوست‌ها هم پشتیبان شوند؟ (' + toPersianDigits(String(_al.length)) + ' فایل، ' + hkFmtSize(Math.max(1024, Math.round(_sz * 1.34))) + ')',
            [{ v: 'yes', t: 'با پیوست‌ها', cls: 'primary eqw' }, { v: 'no', t: 'بدون پیوست‌ها', cls: 'eqw' }], function (ans) {
              if (ans === 'cancel') return;
              exportFullBackup(selectedParts, ans === 'yes');
            });
          return;
        }
      }
      try {
        persistCurrent();
        saveArchive();
        const payload = buildBackupPayload(selectedParts || null);
        if (withAtt) { try { payload.attachments = await hkAttachmentsForBackup(hkAllAttachments()); } catch (eAt) {} }
        if (payload.backupWarnings && payload.backupWarnings.length) {
          setTimeout(function () { try { showToastLong('بخشی از اطلاعات خوانده نشد و در پشتیبان نیست (' + payload.backupWarnings.join('، ') + ').'); } catch (eW) {} }, 2600);
        }
        let textOut = JSON.stringify(payload);
        const name = 'hesab-backup-' + currentYear + '-' + String(currentMonth).padStart(2, '0') + '.json';
        if (_pendingBackupPassword) {
          const pw = _pendingBackupPassword; _pendingBackupPassword = '';
          try { textOut = JSON.stringify(await hkEncryptBackup(textOut, pw)); }
          catch (eEnc) { showToast('رمزنگاری پشتیبان ممکن نشد'); return; }
        }
        showToast('در حال ساخت پشتیبان…');
        try { localStorage.setItem(STORAGE_KEY + '_lastManualBk', String(Date.now())); } catch (eLm) {}
        const b64 = utf8ToBase64(textOut);
        try {
          const C = window.Capacitor;
          if (C && typeof C.isNativePlatform === 'function' && C.isNativePlatform()) {
            const shared = await nativeShareBase64(name, 'application/json', b64, 'پشتیبان حساب‌کتاب');
            if (shared) {
              showToast(shared.downloadUri ? 'ذخیره شد و پنجره اشتراک باز شد' : 'پنجره اشتراک باز شد');
              return;
            }
            const saved = await nativeSaveBase64(name, 'application/json', b64);
            if (saved && saved.uri) {
              showToast('پشتیبان در Downloads ذخیره شد');
              return;
            }
            throw new Error('native backup failed');
          }
        } catch (ne) {
          console.warn('native backup', ne);
          if (String(ne && ne.message || ne).indexOf('native backup') >= 0) {
            showToast('ذخیره پشتیبان ناموفق بود');
            return;
          }
        }
        const blob = new Blob([textOut], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          try { URL.revokeObjectURL(url); a.remove(); } catch (e) {}
        }, 1500);
        showToast('پشتیبان آماده شد');
      } catch (e) {
        console.error(e);
        showToast('پشتیبان‌گیری ناموفق بود');
      }
    }

    /* ===== پشتیبان خودکار (اندروید ۱۰ به بالا) =====
       روزانه: یک نسخهٔ کامل در حافظهٔ داخلی نرم‌افزار (نسخهٔ امروز با هر بار رفتن نرم‌افزار به پس‌زمینه تازه می‌شود)؛ ۷ روز اخیر + ۴ هفتهٔ قبل.
       در Downloads/HesabKetab فقط یک فایل «آخرین پشتیبان» (hesab-latest-…) که هر بار جایگزین قبلی می‌شود.
       ایمنی: قبل از حذف ماه، حذف کلی، بازیابی و نصب نسخهٔ جدید؛ ۵ نسخهٔ آخر نگه داشته می‌شود. */
    var AUTO_BK_KEY = STORAGE_KEY + '_autoBackup';
    function autoBkState() {
      try { var o = JSON.parse(localStorage.getItem(AUTO_BK_KEY) || 'null'); if (o && typeof o === 'object') return o; } catch (e) {}
      return { enabled: true };
    }
    function autoBkSave(o) { try { localStorage.setItem(AUTO_BK_KEY, JSON.stringify(o)); } catch (e) {} }
    function autoBkPlugin() {
      var C = window.Capacitor, P = C && C.Plugins && C.Plugins.NativeFileExport, native = false;
      try { native = !!(C && C.isNativePlatform && C.isNativePlatform()); } catch (e) {}
      return (native && P && typeof P.saveAutoBackup === 'function') ? P : null;
    }
    function _bkStamp() {
      var t = getTodayPersian(), d = new Date(), p2 = function (n) { return String(n).padStart(2, '0'); };
      return { day: t.y + '-' + p2(t.m) + '-' + p2(t.d), time: p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) };
    }
    /* پشتیبان خالی، پشتیبان‌های قبلی را از چرخه بیرون نکند */
    function _bkHasData(payload) {
      try {
        var any = false;
        var scan = function (pd) {
          if (any || !pd) return;
          ['income', 'expense'].forEach(function (tab) {
            ((pd[tab] && pd[tab].sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (r && !r.deletedAt && (Number(r.amount) > 0 || r.desc)) any = true; }); });
          });
        };
        Object.keys(payload.archive || {}).forEach(function (k) { scan(payload.archive[k]); });
        if (!any && (payload.plans || []).length) any = true;
        if (!any && (payload.recurringIncomes || []).length) any = true;
        if (!any && payload.savings && (payload.savings.items || []).length) any = true;
        if (!any && (payload.financialSubjects || []).length) any = true;
        return any;
      } catch (e) { return true; }
    }
    var _autoBkBusy = null;
    function writeAutoBackup(kind, tag) {
      var P = autoBkPlugin();
      if (!P) return Promise.resolve(false);
      if (_autoBkBusy) return _autoBkBusy;
      var job = (async function () {
        try {
          try { persistCurrent(); saveArchive(); } catch (e0) {}
          var payload = buildBackupPayload(null);
          if (kind === 'daily' && !_bkHasData(payload)) return false;
          payload.autoBackup = { kind: kind, tag: tag || '' };
          var st = _bkStamp();
          /* نام یکتا (با زمان) برای هر پشتیبان: فایل تازه هرگز جای فایل قبلی را نمی‌گیرد؛ نسخهٔ قدیمی‌تر همان روز فقط پس از
             ذخیره و تأیید فایل تازه، با هرس برداشته می‌شود */
          /* میلی‌ثانیه + دو نویسهٔ تصادفی: دو پشتیبان در یک ثانیه (مثلاً ایمنی بلافاصله پس از روزانه) هم نام یکسان نمی‌گیرند */
          var uniq = st.time + '-' + String(Date.now() % 1000).padStart(3, '0') + Math.random().toString(36).slice(2, 4);
          var name = kind === 'daily' ? 'hesab-auto-' + st.day + '-' + uniq + '.json' : 'hesab-safety-' + st.day + '-' + uniq + (tag ? '-' + tag : '') + '.json';
          var text = JSON.stringify(payload);
          /* رمزنگاری روشن: فقط فایل رمزدار نوشته می‌شود؛ هرگز جایگزین بی‌رمز بی‌صدا نوشته نمی‌شود */
          var enc = hkAutoEncState(), encrypted = false;
          if (enc) {
            if (enc.broken) throw hkBkErr('enc_key_missing');
            var env, back;
            try { env = await hkEncSeal(text, enc); back = await hkEncOpen(env, _bytesFromB64(enc.dek)); }
            catch (eEnc) { throw hkBkErr('enc_failed'); }
            if (back !== text) throw hkBkErr('enc_verify_failed');
            text = JSON.stringify(env); encrypted = true;
            name = name.replace(/\.json$/, '-enc.json');   /* فایل رمزدار هرگز جای فایل بی‌رمز قدیمی را نمی‌گیرد */
          }
          var res = await P.saveAutoBackup({ filename: name, data: utf8ToBase64(text), store: 'internal' });
          if (!res || res.ok !== true || res.verified !== true) throw hkBkErr('write_failed');
          /* فایل تازه باید به‌عنوان پشتیبان تمام‌شده در فهرست دیده شود؛ وگرنه هرس انجام نمی‌شود */
          var seen = false;
          try { seen = (((await P.listAutoBackups({ store: 'internal' })) || {}).files || []).some(function (f) { return f && f.name === name; }); } catch (eL) { seen = false; }
          if (!seen) throw hkBkErr('not_discoverable');
          var s = autoBkState();
          s.lastAt = Date.now(); s.lastName = name; s.lastEncrypted = encrypted;
          s.lastError = (payload.backupWarnings && payload.backupWarnings.length) ? 'partial: ' + payload.backupWarnings.join(',') : '';
          s.lastErrorText = s.lastError ? 'بخشی از اطلاعات خوانده نشد و در آخرین پشتیبان خودکار نیست.' : '';
          if (encrypted) s.lastEncOkAt = Date.now();
          if (kind === 'daily') s.lastDaily = st.day;
          autoBkSave(s);
          /* هرس فقط پس از ذخیرهٔ موفق و تأییدشدهٔ فایل تازه */
          try { await pruneAutoBackups(P, encrypted, name); } catch (eP) {}
          /* در Downloads فقط یک فایل «آخرین پشتیبان» (برای وقتی نرم‌افزار حذف یا گوشی عوض شود) */
          if (kind === 'daily') { try { await hkWriteLatestDownloads(P, text, encrypted, st, uniq); } catch (eLt) {} }
          return true;
        } catch (e) {
          /* آخرین پشتیبان سالم دست نمی‌خورد و هرس انجام نمی‌شود؛ فقط کد خطا و متن عمومی ثبت می‌شود (بدون محتوا) */
          var code = (e && e.hkCode) || 'write_failed';
          var s2 = autoBkState(); s2.lastError = code; s2.lastErrorText = hkBkErrText(code); s2.lastErrorAt = Date.now(); autoBkSave(s2);
          return false;
        }
      })();
      _autoBkBusy = job;
      var clear = function () { if (_autoBkBusy === job) _autoBkBusy = null; };
      job.then(clear, clear);
      return job;
    }
    function hkBkErr(code) { var e = new Error(code); e.hkCode = code; return e; }
    function hkBkErrText(code) {
      return ({
        enc_key_missing: 'پشتیبان خودکار رمزدار گرفته نشد: کلید رمزنگاری روی این دستگاه پیدا نشد. رمزنگاری را دوباره تنظیم کنید؛ پشتیبان بی‌رمز هم گرفته نشد.',
        enc_failed: 'پشتیبان خودکار رمزدار گرفته نشد: رمزنگاری ممکن نشد. پشتیبان بی‌رمز هم گرفته نشد و آخرین پشتیبان سالم دست نخورد.',
        enc_verify_failed: 'پشتیبان خودکار رمزدار گرفته نشد: بررسی فایل رمزدار ناموفق بود. آخرین پشتیبان سالم دست نخورد.',
        write_failed: 'ذخیرهٔ پشتیبان خودکار ناموفق بود (شاید حافظهٔ گوشی پر است). آخرین پشتیبان سالم دست نخورد.',
        not_discoverable: 'پشتیبان خودکار تازه پس از ذخیره در پوشه پیدا نشد؛ پشتیبان‌های قبلی دست نخوردند.'
      })[code] || 'پشتیبان خودکار ناموفق بود. آخرین پشتیبان سالم دست نخورد.';
    }
    /** ترتیب زمانی از روی نام فایل (قابل‌اعتمادتر از DATE_MODIFIED که ممکن است صفر یا کهنه باشد).
        روزانه: hesab-auto-YYYY-MM-DD[-HHMMSS[-mmmXX]][-enc].json — نام قدیمی بدون ساعت = ابتدای همان روز.
        ایمنی:  hesab-safety-YYYY-MM-DD-HHMMSS[-mmmXX][-tag][-enc].json
        خروجی: {day, key} یا null اگر نام الگوی معتبر نداشته باشد (چنین فایلی هرگز حذف نمی‌شود). */
    function _bkNameTime(n) {
      n = String(n || '');
      var m = /^hesab-auto-(\d{4}-\d{2}-\d{2})(?:-(\d{6})(?:-(\d{3})([0-9a-z]{0,2}))?)?(?:-enc)?\.json$/.exec(n);
      if (!m) m = /^hesab-safety-(\d{4}-\d{2}-\d{2})-(\d{6})(?:-(\d{3})([0-9a-z]{2}))?(?:-[0-9A-Za-z._-]*)?\.json$/.exec(n);
      if (!m) return null;
      return { day: m[1], key: m[1] + (m[2] || '000000') + (m[3] || '000') + (m[4] || '') };
    }
    /** هرس طبق همان سیاست قبلی: ۷ روز آخر (از هر روز جدیدترین فایل)، ۴ هفتهٔ قبل از آن (از هر هفته جدیدترین)، ۵ پشتیبان ایمنی آخر.
        فقط پس از ذخیره و تأیید فایل تازه صدا زده می‌شود. فایل‌های رمزدار (-enc.json) و بی‌رمز دو مجموعهٔ جدا هستند و هر حالت فقط
        مجموعهٔ خودش را هرس می‌کند: با روشن‌کردن رمزنگاری پشتیبان‌های بی‌رمز قبلی و با خاموش‌کردن آن پشتیبان‌های رمزدار قبلی دست نمی‌خورند.
        ایمنی بیشتر:
        - justWritten (فایلی که همین الان ذخیره و تأیید شد) همیشه نگه داشته می‌شود؛ اگر در فهرست نباشد، هیچ چیزی حذف نمی‌شود.
        - «جدیدترین» از روی زمان داخل نام تعیین می‌شود؛ modified فقط برای شکستن تساوی است.
        - فایلی که نامش الگوی معتبر ندارد هرگز حذف نمی‌شود. */
    async function pruneAutoBackups(P, encrypted, justWritten) {
      var r = await P.listAutoBackups({ store: 'internal' }), files = (r && r.files) || [];
      var isEnc = function (n) { return /-enc\.json$/.test(String(n)); };
      files = files.filter(function (f) { return f && typeof f.name === 'string' && isEnc(f.name) === !!encrypted; });
      if (justWritten && !files.some(function (f) { return f.name === justWritten; })) return;   /* وضعیت نامطمئن: هیچ حذفی */
      var timed = [];
      files.forEach(function (f) { var t = _bkNameTime(f.name); if (t) timed.push({ f: f, day: t.day, key: t.key, daily: /^hesab-auto-/.test(f.name) }); });
      var newest = function (a, b) {
        if (a.key !== b.key) return a.key < b.key ? 1 : -1;
        return (Number(b.f.modified) || 0) - (Number(a.f.modified) || 0) || String(b.f.name).localeCompare(String(a.f.name));
      };
      var daily = timed.filter(function (x) { return x.daily; }).sort(newest);
      var safety = timed.filter(function (x) { return !x.daily; }).sort(newest);
      var keep = {};
      if (justWritten) keep[justWritten] = 1;
      var days = [], seenDay = {};
      daily.forEach(function (x) { if (!seenDay[x.day]) { seenDay[x.day] = x; days.push(x.day); } });
      days.sort().reverse();
      days.slice(0, 7).forEach(function (d) { keep[seenDay[d].f.name] = 1; });
      /* هفته از روی تاریخ داخل نام (تقریب یکنوا: سال×۳۷۲ + ماه×۳۱ + روز)، نه DATE_MODIFIED */
      var weekOf = function (d) { var p = d.split('-'); return Math.floor(((+p[0]) * 372 + (+p[1] - 1) * 31 + (+p[2])) / 7); };
      var weeks = {}, nw = 0;
      days.slice(7).forEach(function (d) { var w = weekOf(d); if (!weeks[w] && nw < 4) { weeks[w] = 1; nw++; keep[seenDay[d].f.name] = 1; } });
      safety.slice(0, 5).forEach(function (x) { keep[x.f.name] = 1; });
      var cand = daily.concat(safety);
      for (var i = 0; i < cand.length; i++) {
        if (!keep[cand[i].f.name]) { try { await P.deleteAutoBackup({ name: cand[i].f.name, store: 'internal' }); } catch (e) {} }
      }
    }
    /* همهٔ پشتیبان‌های خودکار: حافظهٔ داخلی + Downloads/HesabKetab (نسخه‌های قبلی و «آخرین پشتیبان»)؛ هر فایل store خودش را دارد */
    async function autoBkAllFiles(P, withLatest) {
      var out = [];
      try { (((await P.listAutoBackups({ store: 'internal' })) || {}).files || []).forEach(function (f) { if (f) { f.store = 'internal'; out.push(f); } }); } catch (e) {}
      try { (((await P.listAutoBackups()) || {}).files || []).forEach(function (f) { if (f && (withLatest || !/^hesab-latest-/.test(f.name))) { f.store = 'downloads'; out.push(f); } }); } catch (e2) {}
      return out;
    }
    /** «آخرین پشتیبان» در Downloads/HesabKetab: فایل تازه ذخیره و تأیید می‌شود، بعد فایل‌های قبلی همین پوشه
        (آخرین‌های قبلی و پشتیبان‌های روزانه/ایمنیِ نسخه‌های قبلی) برداشته می‌شوند؛ پس در فایل‌منیجر همیشه یک فایل دیده می‌شود.
        پاک‌کردن فقط وقتی که حافظهٔ داخلی دست‌کم یک پشتیبان روزانهٔ سالم دارد. */
    async function hkWriteLatestDownloads(P, text, encrypted, st, uniq) {
      var name = 'hesab-latest-' + st.day + '-' + uniq + (encrypted ? '-enc' : '') + '.json';
      var res = await P.saveAutoBackup({ filename: name, data: utf8ToBase64(text) });
      if (!res || res.ok !== true || res.verified !== true) return false;
      var dl = (((await P.listAutoBackups()) || {}).files || []);
      if (!dl.some(function (f) { return f && f.name === name; })) return false;
      var internalOk = (((await P.listAutoBackups({ store: 'internal' })) || {}).files || []).some(function (f) { return f && /^hesab-auto-/.test(f.name); });
      for (var i = 0; i < dl.length; i++) {
        var n = dl[i] && dl[i].name;
        if (!n || n === name) continue;
        if (/^hesab-latest-/.test(n) || (internalOk && /^hesab-(auto|safety)-/.test(n))) { try { await P.deleteAutoBackup({ name: n }); } catch (eD) {} }
      }
      var s = autoBkState(); s.latestName = name; autoBkSave(s);
      return true;
    }
    /* فایل پشتیبانی که با «باز کردن با…» یا «اشتراک‌گذاری» به نرم‌افزار داده شده: همان مسیر بازیابی معمول (رمز، ادغام/جایگزینی، تأیید) */
    function hkCheckOpenedFile() {
      var C = window.Capacitor, P = C && C.Plugins && C.Plugins.NativeFileExport;
      if (!P || typeof P.takeOpenedFile !== 'function') return;
      var lk = document.getElementById('appLockOverlay');
      if ((lk && lk.classList.contains('show')) || document.getElementById('appTour')) { setTimeout(hkCheckOpenedFile, 1200); return; }
      P.takeOpenedFile().then(function (r) {
        if (!r || !r.data) return;
        var text = '';
        try { text = new TextDecoder('utf-8').decode(_bytesFromB64(r.data)); } catch (e) { showToast('فایل خوانده نشد'); return; }
        if (!/^\s*[\[{]/.test(text)) { showToast('این فایل پشتیبان حساب‌کتاب نیست'); return; }
        try { importFullBackup({ target: { files: [new File([text], r.name || 'backup.json', { type: 'application/json' })] } }); } catch (e2) { showToast('فایل پشتیبان نامعتبر است'); }
      }).catch(function () {});
    }
    window.addEventListener('hkFileOpened', function () { setTimeout(hkCheckOpenedFile, 300); });
    setTimeout(hkCheckOpenedFile, 2200);
    function maybeDailyAutoBackup(refreshToday) {
      try {
        var s = autoBkState();
        if (s.enabled === false || !autoBkPlugin()) return;
        if (s.lastDaily === _bkStamp().day) {
          if (!refreshToday || Date.now() - (Number(s.lastAt) || 0) < 10 * 60 * 1000) return;
        }
        writeAutoBackup('daily');
      } catch (e) {}
    }
    /* قبل از کار پرخطر: اول پشتیبان ایمنی (حداکثر ۶ ثانیه صبر)، بعد خود کار؛ اگر پشتیبان ممکن نبود، کار مثل قبل انجام می‌شود */
    function safetyBackupThen(tag, fn) {
      if (!autoBkPlugin() || autoBkState().enabled === false) return fn();
      var done = false;
      var go = function () { if (done) return; done = true; try { fn(); } catch (e) { console.error(e); } };
      try { showToast('در حال گرفتن پشتیبان ایمنی…'); } catch (eT) {}
      Promise.race([writeAutoBackup('safety', tag), new Promise(function (r) { setTimeout(r, 6000); })]).then(go, go);
    }
    function autoBkLastText() {
      var s = autoBkState();
      if (!s.lastAt) return 'هنوز پشتیبان خودکاری گرفته نشده';
      var d = new Date(Number(s.lastAt)), now = new Date();
      var hm = toPersianDigits(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
      var days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
      return 'آخرین پشتیبان خودکار' + (s.lastEncrypted ? ' (رمزدار)' : '') + ': ' + (days <= 0 ? 'امروز ساعت ' + hm : days === 1 ? 'دیروز ساعت ' + hm : toPersianDigits(String(days)) + ' روز پیش');
    }
    setTimeout(function () { maybeDailyAutoBackup(false); }, 12000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) maybeDailyAutoBackup(true);
      else setTimeout(function () { maybeDailyAutoBackup(false); }, 4000);
    });

    async function shareFullBackup() {
      return exportFullBackup();
    }

function askBackupUserCards(selectedParts) {
      var titles = [];
      try { titles = (typeof allPersonTitles === 'function') ? allPersonTitles() : []; } catch (e) { titles = []; }
      /* همهٔ ماه‌ها (قبلاً فقط ماه جاری ذخیره می‌شد و «جایگزینی» با آن تاریخچه را پاک می‌کرد) */
      try {
        selectedParts = selectedParts || {};
        delete selectedParts.selectedMonths;
        selectedParts._allMonths = true;
      } catch (eM) {}
      /* ۱.۳.۴۷: تک‌کاربره: سؤال «کدام کارت‌ها» دیگر پرسیده نمی‌شود؛ همیشه همهٔ داده */
      if (!titles || !titles.length || typeof hkMainTitle === 'function') {
        try { selectedParts = selectedParts || {}; selectedParts._allUserCards = true; if (titles && titles.length) selectedParts.selectedUserCards = titles.slice(); } catch (eC) {}
        exportFullBackup(selectedParts);
        return;
      }
      var existing = document.getElementById('backupPickOverlay');
      if (existing) existing.remove();
      var ov = document.createElement('div');
      ov.id = 'backupPickOverlay';
      ov.className = 'backup-pick-overlay';
      ov.setAttribute('data-backup-step', 'cards');
      var html = '<div class="backup-pick-panel" role="dialog">' +
        '<div class="backup-pick-title">کدام کارت‌های کاربر پشتیبان‌گیری شوند؟</div>';
      html += '<label class="backup-pick-item all"><input type="checkbox" id="bkCardAll" checked /><span>همه کارت‌ها</span></label>';
      titles.forEach(function(t) {
        html += '<label class="backup-pick-item"><input type="checkbox" class="bk-card" data-card="' +
          String(t).replace(/"/g, '&quot;') + '" checked /><span>' + String(t).replace(/</g, '&lt;') + '</span></label>';
      });
      html += '<div class="backup-pick-actions">' +
        '<button type="button" class="backup-pick-ok" id="bkDoExportCards">پشتیبان‌گیری</button>' +
        '<button type="button" class="backup-pick-cancel" id="bkCancelCards">انصراف</button></div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      var allCb = ov.querySelector('#bkCardAll');
      var cardCbs = ov.querySelectorAll('.bk-card');
      if (allCb) allCb.addEventListener('change', function() {
        var on = !!allCb.checked;
        cardCbs.forEach(function(cb) { cb.checked = on; });
      });
      cardCbs.forEach(function(cb) {
        cb.addEventListener('change', function() {
          if (!allCb) return;
          var allOn = true;
          cardCbs.forEach(function(x) { if (!x.checked) allOn = false; });
          allCb.checked = allOn;
        });
      });
      ov.querySelector('#bkCancelCards').onclick = function() { ov.remove(); };
      ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
      ov.querySelector('#bkDoExportCards').onclick = function() {
        var picked = [];
        if (allCb && allCb.checked) titles.forEach(function(t) { picked.push(t); });
        else cardCbs.forEach(function(cb) { if (cb.checked) picked.push(cb.getAttribute('data-card')); });
        if (!picked.length) {
          try { showToast('حداقل یک کارت را انتخاب کنید', 'warn'); } catch (eT) {}
          return;
        }
        selectedParts = selectedParts || {};
        selectedParts.selectedUserCards = picked;
        selectedParts._allUserCards = !!(allCb && allCb.checked);
        ov.remove();
        exportFullBackup(selectedParts);
      };
    }


    function triggerImportBackup() {
      closeSideMenu();
      const inp = document.getElementById('backupFileInput');
      if (inp) {
        inp.value = '';
        inp.click();
      }
    }

    function rowFingerprint(r) {
      if (!r) return '';
      return [r.day || '', (r.desc || '').trim(), Number(r.amount) || 0, r.status || '', r.account || '', r.from || '', r.to || ''].join('|');
    }

    function mergeSectionRows(localRows, incomingRows) {
      const out = Array.isArray(localRows) ? localRows.slice() : [];
      const seen = new Set(out.map(rowFingerprint));
      (incomingRows || []).forEach(r => {
        if (!r) return;
        // ردیف کاملاً خالی را رد کن
        if (!r.desc && !r.amount && !r.day && !r.from && !r.to) return;
        const fp = rowFingerprint(r);
        if (seen.has(fp)) return;
        seen.add(fp);
        out.push(JSON.parse(JSON.stringify(r)));
      });
      // مرتب‌سازی بر اساس روز
      return out
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          const da = parseInt(String(a.r.day || ''), 10) || 0;
          const db = parseInt(String(b.r.day || ''), 10) || 0;
          if (!da && !db) return a.i - b.i;
          if (!da) return 1;
          if (!db) return -1;
          if (da !== db) return da - db;
          return hkTimeCmp(a.r, b.r) || a.i - b.i;
        })
        .map(x => x.r);
    }

    function mergeSideBlocks(localSide, incomingSide) {
      const base = localSide && typeof localSide === 'object'
        ? JSON.parse(JSON.stringify(localSide))
        : { sections: [], nextId: 1 };
      if (!base.sections) base.sections = [];
      const inc = incomingSide && typeof incomingSide === 'object' ? incomingSide : { sections: [] };
      (inc.sections || []).forEach(secIn => {
        if (!secIn) return;
        const title = (secIn.title || '').trim();
        let local = null;
        if (secIn.id) local = base.sections.find(s => s.id === secIn.id);
        if (!local && title) local = base.sections.find(s => (s.title || '').trim() === title);
        if (local) {
          local.rows = mergeSectionRows(local.rows || [], secIn.rows || []);
          if (!local.title && secIn.title) local.title = secIn.title;
          if (!local.color && secIn.color) local.color = secIn.color;
        } else {
          const copy = JSON.parse(JSON.stringify(secIn));
          if (!copy.id) copy.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          copy.rows = mergeSectionRows([], copy.rows || []);
          base.sections.push(copy);
        }
      });
      base.nextId = Math.max(base.nextId || 1, (base.sections.length || 0) + 1, inc.nextId || 1);
      return base;
    }

    function mergeLedgerBlocks(localLed, incomingLed) {
      const base = localLed && typeof localLed === 'object'
        ? JSON.parse(JSON.stringify(localLed))
        : { sections: [], nextId: 1 };
      if (!base.sections) base.sections = [];
      const inc = incomingLed && typeof incomingLed === 'object' ? incomingLed : { sections: [] };
      (inc.sections || []).forEach(secIn => {
        if (!secIn) return;
        let local = null;
        if (secIn.id) local = base.sections.find(s => s.id === secIn.id);
        if (!local) {
          const a = (secIn.personA || '').trim();
          const b = (secIn.personB || '').trim();
          local = base.sections.find(s => (s.personA || '').trim() === a && (s.personB || '').trim() === b);
        }
        if (local) {
          local.rows = mergeSectionRows(local.rows || [], secIn.rows || []);
        } else {
          const copy = JSON.parse(JSON.stringify(secIn));
          if (!copy.id) copy.id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          copy.rows = mergeSectionRows([], copy.rows || []);
          base.sections.push(copy);
        }
      });
      base.nextId = Math.max(base.nextId || 1, (base.sections.length || 0) + 1, inc.nextId || 1);
      return base;
    }

    function mergeArchives(localArch, incomingArch) {
      const out = localArch && typeof localArch === 'object' ? JSON.parse(JSON.stringify(localArch)) : {};
      const inc = incomingArch && typeof incomingArch === 'object' ? incomingArch : {};
      Object.keys(inc).forEach(key => {
        const src = inc[key];
        if (!src || typeof src !== 'object') return;
        if (!out[key]) {
          out[key] = JSON.parse(JSON.stringify(src));
          // مرتب‌سازی ردیف‌ها بر اساس روز
          ['income', 'expense'].forEach(tab => {
            if (out[key][tab] && Array.isArray(out[key][tab].sections)) {
              out[key][tab].sections.forEach(sec => {
                sec.rows = mergeSectionRows([], sec.rows || []);
              });
            }
          });
          if (out[key].ledger && Array.isArray(out[key].ledger.sections)) {
            out[key].ledger.sections.forEach(sec => {
              sec.rows = mergeSectionRows([], sec.rows || []);
            });
          }
          return;
        }
        const dst = out[key];
        dst.income = mergeSideBlocks(dst.income, src.income);
        dst.expense = mergeSideBlocks(dst.expense, src.expense);
        dst.ledger = mergeLedgerBlocks(dst.ledger, src.ledger);
        /* موجودی‌های اول ماه، موجودی کارت‌ها و تنظیمات کارت‌های فایل ورودی هم بیایند (فقط کلیدهایی که اینجا نیست؛ داده‌های محلی دست نمی‌خورد).
           قبلاً این‌ها برای ماه‌های مشترک دور ریخته می‌شد و موجودی حساب‌های کاربر دوم ناقص حساب می‌شد. */
        ['accountOpeningInstant', 'personOpeningInstant', 'cardMeta'].forEach(function (f) {
          const sm = src[f];
          if (!sm || typeof sm !== 'object') return;
          if (!dst[f] || typeof dst[f] !== 'object') dst[f] = {};
          Object.keys(sm).forEach(function (k) { if (dst[f][k] == null || dst[f][k] === '') dst[f][k] = JSON.parse(JSON.stringify(sm[k])); });
        });
        if (Array.isArray(src.personCardOrder)) {
          if (!Array.isArray(dst.personCardOrder)) dst.personCardOrder = [];
          src.personCardOrder.forEach(function (t) { if (dst.personCardOrder.indexOf(t) < 0) dst.personCardOrder.push(t); });
        }
      });
      return out;
    }

    function mergePlansList(localPlans, incomingPlans) {
      const out = Array.isArray(localPlans) ? localPlans.slice() : [];
      const byId = new Map();
      const byName = new Map();
      out.forEach((p, i) => {
        if (p && p.id) byId.set(String(p.id), i);
        const n = ((p && p.name) || '').trim();
        if (n) byName.set(n, i);
      });
      (incomingPlans || []).forEach(p => {
        if (!p) return;
        let idx = -1;
        if (p.id && byId.has(String(p.id))) idx = byId.get(String(p.id));
        else {
          const n = (p.name || '').trim();
          if (n && byName.has(n)) idx = byName.get(n);
        }
        if (idx >= 0) {
          // ادغام ملایم: تعداد پرداخت‌شده را بیشتر نگه دار
          const cur = out[idx];
          const merged = Object.assign({}, cur, p);
          const pc = Math.max(parseInt(cur.paidCount, 10) || 0, parseInt(p.paidCount, 10) || 0);
          merged.paidCount = pc;
          out[idx] = merged;
        } else {
          const copy = JSON.parse(JSON.stringify(p));
          out.push(copy);
          if (copy.id) byId.set(String(copy.id), out.length - 1);
          const n = (copy.name || '').trim();
          if (n) byName.set(n, out.length - 1);
        }
      });
      return out;
    }

    function mergeRecurringList(localRec, incomingRec) {
      const out = Array.isArray(localRec) ? localRec.slice() : [];
      const byId = new Map();
      const byName = new Map();
      out.forEach((r, i) => {
        if (r && r.id) byId.set(String(r.id), i);
        const n = ((r && r.name) || '').trim();
        if (n) byName.set(n, i);
      });
      (incomingRec || []).forEach(r => {
        if (!r) return;
        let idx = -1;
        if (r.id && byId.has(String(r.id))) idx = byId.get(String(r.id));
        else {
          const n = (r.name || '').trim();
          if (n && byName.has(n)) idx = byName.get(n);
        }
        if (idx >= 0) {
          out[idx] = Object.assign({}, out[idx], r);
        } else {
          const copy = JSON.parse(JSON.stringify(r));
          out.push(copy);
          if (copy.id) byId.set(String(copy.id), out.length - 1);
          const n = (copy.name || '').trim();
          if (n) byName.set(n, out.length - 1);
        }
      });
      return out;
    }


    function claimBackupOwnership(dataRoot) {
      // داده‌های بازیابی‌شده مثل داده خود کاربر قابل ویرایش/حذف باشند
      // (اقساط همچنان فقط از منوی اقساط ویرایش می‌شوند چون fromPlanId قفل دارد)
      const uid = (typeof ownerAuthUid === 'function') ? ownerAuthUid() : (typeof currentUserId === 'function' ? currentUserId() : '');
      const nm = (memberName || '').trim();
      const h = (typeof normalizeHandle === 'function')
        ? (normalizeHandle(memberHandle) || normalizeHandle(memberName))
        : '';
      function claim(row) {
        if (!row || typeof row !== 'object') return;
        if (row.deletedAt) return;
        row.createdBy = uid || row.createdBy || '';
        if (nm) row.createdByName = nm;
        if (h) row.ownerHandle = h;
        row.updatedAt = Date.now();
        if (!row.createdAt) row.createdAt = Date.now();
      }
      function claimSide(side) {
        if (!side || !Array.isArray(side.sections)) return;
        side.sections.forEach(sec => {
          claim(sec);
          (sec.rows || []).forEach(claim);
        });
      }
      try {
        Object.keys(archive || {}).forEach(k => {
          const pd = archive[k];
          if (!pd) return;
          claimSide(pd.income);
          claimSide(pd.expense);
          if (pd.ledger && Array.isArray(pd.ledger.sections)) {
            pd.ledger.sections.forEach(sec => {
              claim(sec);
              (sec.rows || []).forEach(claim);
            });
          }
        });
        (plans || []).forEach(claim);
        (recurringIncomes || []).forEach(claim);
        // periodData جاری
        claimSide(periodData && periodData.income);
        claimSide(periodData && periodData.expense);
        if (periodData && periodData.ledger && Array.isArray(periodData.ledger.sections)) {
          periodData.ledger.sections.forEach(sec => {
            claim(sec);
            (sec.rows || []).forEach(claim);
          });
        }
      } catch (e) {}
    }
    /* ===== بازیابی امن: عکس از وضعیت قبل، ثبت هر شکست نوشتن، و در صورت شکست بازگشت کامل و بررسی‌شده =====
       قبل از هر نوشتن، کل localStorage و دادهٔ اصلی حافظه کپی می‌شود. اگر هر نوشتنی (یا هر بخش بازیابی) شکست بخورد،
       همهٔ کلیدها به همان مقدار قبل برمی‌گردند، برابری بررسی می‌شود و نتیجه false است (پیام موفقیت نشان داده نمی‌شود). */
    var _hkRestoreAborted = false, _hkLastRestoreFailedParts = [];
    function hkSnapshotStorage() {
      var o = {};
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); }
      return o;
    }
    function hkRestoreStorage(snap) {
      var cur = hkSnapshotStorage();
      /* اول کلیدهای تازه و تغییرکرده برداشته می‌شوند (فضا آزاد شود)، بعد مقدارهای قبلی نوشته می‌شوند */
      Object.keys(cur).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(snap, k) || snap[k] !== cur[k]) { try { localStorage.removeItem(k); } catch (e) {} } });
      Object.keys(snap).forEach(function (k) { if (localStorage.getItem(k) !== snap[k]) { try { localStorage.setItem(k, snap[k]); } catch (e) {} } });
      /* ۱.۳.۶۳: نسخهٔ دوم (IndexedDB) هم به همان دادهٔ برگشتی برمی‌گردد */
      try { var fk = familyStorageKey(familyCode), mu = 0; try { mu = JSON.parse(snap[STORAGE_KEY + '_meta'] || '{}').localUpdatedAt; } catch (eU) {} if (snap[fk]) hkMirrorSchedule(snap[fk], mu); } catch (eM) {}
      var after = hkSnapshotStorage(), ka = Object.keys(after), ks = Object.keys(snap);
      return ka.length === ks.length && ks.every(function (k) { return after[k] === snap[k]; });
    }
    function hkSnapshotMemory() {
      var c = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
      return {
        archive: c(archive), periodData: c(periodData), plans: c(plans), recurringIncomes: c(recurringIncomes),
        selectedBankAccounts: c(selectedBankAccounts), trashItems: c(trashItems), smsAccountBankMap: c(smsAccountBankMap),
        userReminders: c(userReminders), financialSubjects: c(_financialSubjects), currentYear: currentYear, currentMonth: currentMonth,
        theme: document.documentElement.getAttribute('data-theme')
      };
    }
    function hkRestoreMemory(m) {
      archive = m.archive; periodData = m.periodData; plans = m.plans; recurringIncomes = m.recurringIncomes;
      selectedBankAccounts = m.selectedBankAccounts; trashItems = m.trashItems; smsAccountBankMap = m.smsAccountBankMap;
      userReminders = m.userReminders; _financialSubjects = m.financialSubjects; currentYear = m.currentYear; currentMonth = m.currentMonth;
      try { if (m.theme && m.theme !== document.documentElement.getAttribute('data-theme')) applyTheme(m.theme); } catch (eTh) {}
      try { initSelectors(); } catch (e1) {}
      try { updateTabUI(); } catch (e2) {}
      try { renderAll(); } catch (e3) {}
      try { _hbcLast = null; renderHomeCards(); } catch (e4) {}
    }
    function applyBackupData(data, mode) {
      if (!data || typeof data !== 'object') return false;
      _hkRestoreAborted = false; _hkLastRestoreFailedParts = [];
      var snap, mem;
      try { snap = hkSnapshotStorage(); mem = hkSnapshotMemory(); }
      catch (eSnap) {
        try { showToastLong('بازیابی شروع نشد (وضعیت فعلی قابل کپی نبود)؛ هیچ تغییری اعمال نشد.'); } catch (eT) {}
        return false;
      }
      var failedKeys = [], origSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        try { return origSet.call(this, k, v); }
        catch (e) { if (this === localStorage) failedKeys.push(String(k)); throw e; }
      };
      var res, threw = false;
      _hkPersist.quiet++;
      try { res = _applyBackupDataUnsafe(data, mode); }
      catch (eApply) { threw = true; try { console.warn('restore: apply failed:', eApply && eApply.name ? eApply.name : 'error'); } catch (eL) {} }
      finally { Storage.prototype.setItem = origSet; _hkPersist.quiet--; }
      var failed = threw || failedKeys.length > 0 || _hkLastRestoreFailedParts.length > 0;
      if (!failed) return res;
      /* شکست: بازگشت به وضعیت پیش از بازیابی */
      _hkRestoreAborted = true;
      var rolled = false;
      try { rolled = hkRestoreStorage(snap); } catch (eRb) { rolled = false; }
      try { hkRestoreMemory(mem); } catch (eRm) {}
      try {
        showToastLong(rolled
          ? 'بازیابی انجام نشد چون ذخیره‌سازی ناموفق بود؛ هیچ تغییری اعمال نشد و اطلاعات قبلی دست‌نخورده است.'
          : 'بازیابی ناموفق بود و برگرداندن کامل وضعیت قبل هم ممکن نشد. برنامه را نبندید و فوراً یک پشتیبان بگیرید؛ پشتیبان ایمنی پیش از بازیابی هم (در صورت فعال بودن) در حافظهٔ داخلی نرم‌افزار هست و «آخرین پشتیبان» در Downloads/HesabKetab.');
      } catch (eT2) {}
      return false;
    }
    function _applyBackupDataUnsafe(data, mode) {
      // mode: 'replace' | 'merge'
      if (!data || typeof data !== 'object') return false;
      /* کامل یا جزئی: فقط پشتیبان کامل حق جایگزینی کل داده را دارد؛ فایل جزئی/نامعلوم فقط بخش‌های خودش را عوض می‌کند */
      var _scope = bkBackupScope(data);
      var _fullReplace = mode === 'replace' && _scope.complete;
      /* اعتبارسنجی پیش از ادغام: ساختار، حساب‌های تکراری، موجودی‌های اولیهٔ یتیم، سطل زبالهٔ تکراری.
         اگر اعتبارسنجی شکست بخورد، هیچ چیزی اعمال نمی‌شود. */
      var _restoreReport = null;
      try { data = JSON.parse(JSON.stringify(data)); _restoreReport = sanitizeBackupData(data, mode); }
      catch (eSan) {
        try { console.warn('restore: validation failed:', eSan && eSan.name ? eSan.name : 'error'); } catch (e) {}
        try { showToastLong('فایل پشتیبان بررسی نشد و هیچ تغییری اعمال نشد.'); } catch (eT) {}
        return false;
      }
      /* خطای بازیابی هر بخش بی‌صدا رد نشود: نام بخش در گزارش پایان بازیابی و کنسول (بدون محتوای داده) */
      function bkRestoreFail(part, err) {
        if (!_restoreReport) _restoreReport = { orphanAccounts: 0, orphanEntries: 0, invalidRecords: 0, mergedAccounts: 0, dupTrash: 0, failedParts: [] };
        if (!_restoreReport.failedParts) _restoreReport.failedParts = [];
        if (_restoreReport.failedParts.indexOf(part) < 0) _restoreReport.failedParts.push(part);
        if (_hkLastRestoreFailedParts.indexOf(part) < 0) _hkLastRestoreFailedParts.push(part);
        try { console.warn('restore: part "' + part + '" failed:', err && err.name ? err.name : 'error'); } catch (e) {}
      }
      /* واریزهای آرشیو درآمد ثابت: فقط ردیف‌هایی که در داده نیستند اضافه می‌شوند (تکراری ساخته نمی‌شود) */
      var _restoreRecArchive = function () {
        try { if (Array.isArray(data.recurringArchive) && data.recurringArchive.length) hkRecArchiveUnpack(data.recurringArchive); } catch (eRa) { bkRestoreFail('recurringArchive', eRa); }
      };
      if (mode === 'replace') {
        if (data.archive && typeof data.archive === 'object') {
          if (_fullReplace) archive = data.archive;
          else { try { persistCurrent(); } catch (eP) {} archive = replaceArchiveScoped(archive, data.archive, _scope.cards); }
        }
        if (Array.isArray(data.plans)) plans = data.plans;
        if (Array.isArray(data.recurringIncomes)) {
          recurringIncomes = data.recurringIncomes;
          try { saveRecurring(); } catch (e) { bkRestoreFail('recurringIncomes', e); }
        }
        _restoreRecArchive();
      } else {
        // merge
        archive = mergeArchives(archive, data.archive || {});
        if (Array.isArray(data.plans)) plans = mergePlansList(plans, data.plans);
        if (Array.isArray(data.recurringIncomes)) {
          recurringIncomes = mergeRecurringList(recurringIncomes, data.recurringIncomes);
          try { saveRecurring(); } catch (e) { bkRestoreFail('recurringIncomes', e); }
        }
        _restoreRecArchive();
      }
      // cardMeta: هم روی periodData هم mirror در localStorage و داخل archive ماه جاری
      if (data.cardMeta && typeof data.cardMeta === 'object') {
        try {
          if (!periodData.cardMeta) periodData.cardMeta = {};
          Object.keys(data.cardMeta).forEach(k => {
            periodData.cardMeta[k] = data.cardMeta[k];
          });
          localStorage.setItem(STORAGE_KEY + '_cardMeta', JSON.stringify(periodData.cardMeta));
        } catch (e) { bkRestoreFail('cardMeta', e); }
      }
      if (Array.isArray(data.selectedBankAccounts)) {
        try {
          if (mode === 'replace') selectedBankAccounts = [].concat(data.selectedBankAccounts);
          else {
            /* افزودن: حساب تکراری (همان شناسه یا همان نام) دوباره اضافه نشود — وگرنه موجودی اولیه‌اش دو بار جمع می‌شد */
            const haveIds = new Set((selectedBankAccounts || []).map(function (a) { return a && a.id; }));
            const haveLabels = new Set((selectedBankAccounts || []).map(function (a) { try { return accountLabel(a); } catch (e) { return a && a.label; } }));
            const add = [];
            data.selectedBankAccounts.forEach(function (a) {
              if (!a) return;
              const lb = (typeof a === 'string') ? a : (a.label || '');
              if ((a.id && haveIds.has(a.id)) || (lb && haveLabels.has(lb))) return;
              add.push(a); if (lb) haveLabels.add(lb); if (a.id) haveIds.add(a.id);
            });
            selectedBankAccounts = [].concat(selectedBankAccounts || [], add);
          }
          normalizeSelectedBanks();
          saveBankAccountsSelection();
        } catch (e) { bkRestoreFail('selectedBankAccounts', e); }
      }
      /* موجودی‌های اول ماهِ کنارگذاشته در انبار؛ و حساب‌هایی که حالا وجود دارند موجودی‌هایشان را پس می‌گیرند */
      try { hkStashOrphanOpenings(_restoreReport && _restoreReport.removedOpenings); hkReviveOrphanOpenings(); }
      catch (eOp) { bkRestoreFail('accountOpenings', eOp); }
      if (Array.isArray(data.trash)) {
        try {
          loadTrash();
          if (_fullReplace) trashItems = [].concat(data.trash);
          else if (mode === 'replace') {
            /* فایل جزئی: سطل زبالهٔ محلی حفظ می‌شود و فقط موارد تازه اضافه می‌شوند */
            var _tIds = {}; (trashItems || []).forEach(function (t) { if (t && t.id) _tIds[t.id] = true; });
            trashItems = data.trash.filter(function (t) { return !(t && t.id && _tIds[t.id]); }).concat(trashItems || []);
          }
          else trashItems = [].concat(data.trash, trashItems || []);
          saveTrash();
        } catch (e) { bkRestoreFail('trash', e); }
      }
      /* کارهای من: جایگزینی = همان نقشهٔ فایل؛ افزودن = فهرست‌هایی که شناسه‌شان در همان کارت/ماه نیست */
      if (data.todos && typeof data.todos === 'object') {
        try {
          var tKey = STORAGE_KEY + '_todos', tMap = {};
          if (mode !== 'replace') {
            var tRaw = localStorage.getItem(tKey);
            if (tRaw) { tMap = JSON.parse(tRaw); if (!tMap || typeof tMap !== 'object' || Array.isArray(tMap)) tMap = {}; }
            Object.keys(data.todos).forEach(function (card) {
              var inc = data.todos[card], cur = tMap[card];
              if (cur == null) { tMap[card] = inc; return; }
              if (Array.isArray(inc) || Array.isArray(cur)) return; /* قالب قدیمی در یک طرف: فهرست محلی دست‌نخورده می‌ماند */
              Object.keys(inc).forEach(function (ym) {
                var lists = Array.isArray(cur[ym]) ? cur[ym] : (cur[ym] = []);
                var ids = {};
                lists.forEach(function (l) { if (l && l.id) ids[l.id] = true; });
                inc[ym].forEach(function (l) { if (!ids[l.id]) { lists.push(l); ids[l.id] = true; } });
              });
            });
          } else if (_fullReplace) tMap = data.todos;
          else {
            /* فایل جزئی: فقط کارت/ماه‌های داخل فایل عوض می‌شوند */
            var tRaw2 = localStorage.getItem(tKey);
            if (tRaw2) { tMap = JSON.parse(tRaw2); if (!tMap || typeof tMap !== 'object' || Array.isArray(tMap)) tMap = {}; }
            Object.keys(data.todos).forEach(function (card) {
              var inc = data.todos[card], cur = tMap[card];
              if (Array.isArray(inc) || cur == null || Array.isArray(cur)) { tMap[card] = inc; return; }
              Object.keys(inc).forEach(function (ym) { cur[ym] = inc[ym]; });
            });
          }
          localStorage.setItem(tKey, JSON.stringify(tMap));
        } catch (eTd) { bkRestoreFail('todos', eTd); }
      }
      /* بانکِ پیامک‌ها: جایگزینی = همان نقشهٔ فایل؛ افزودن = فقط کلیدهای تازه (انتخاب‌های فعلی کاربر حفظ می‌شود) */
      if (data.smsBankMap && typeof data.smsBankMap === 'object') {
        try {
          var sKey = STORAGE_KEY + '_smsBankMap', sMap = {};
          if (mode !== 'replace') {
            var sRaw = localStorage.getItem(sKey);
            if (sRaw) { sMap = JSON.parse(sRaw); if (!sMap || typeof sMap !== 'object' || Array.isArray(sMap)) sMap = {}; }
            Object.keys(data.smsBankMap).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(sMap, k)) sMap[k] = data.smsBankMap[k]; });
          } else sMap = data.smsBankMap;
          localStorage.setItem(sKey, JSON.stringify(sMap));
        } catch (eSb) { bkRestoreFail('smsBankMap', eSb); }
      }
      if (data.smsAccountBankMap && typeof data.smsAccountBankMap === 'object') {
        try {
          if (mode === 'replace') smsAccountBankMap = Object.assign({}, data.smsAccountBankMap);
          else Object.assign(smsAccountBankMap, data.smsAccountBankMap);
          saveSmsAccountBankMap();
        } catch (e) { bkRestoreFail('smsAccountBankMap', e); }
      }
      if (Array.isArray(data.attachments)) { try { hkRestoreAttachments(data.attachments); } catch (eAtR) {} }
      if (Array.isArray(data.customBanks)) { try { data.customBanks.forEach(function (b) { if (b) hkAddCustomBank(String(b)); }); } catch (eCb2) {} }
      if (Array.isArray(data.userReminders)) {
        try {
          loadUserReminders();
          if (mode === 'replace') userReminders = [].concat(data.userReminders);
          else {
            const ids = new Set((userReminders || []).map(function(x){ return x && x.id; }));
            data.userReminders.forEach(function(x) {
              if (x && x.id && !ids.has(x.id)) userReminders.push(x);
            });
          }
          saveUserReminders();
        } catch (e) { bkRestoreFail('userReminders', e); }
      }

      /* بازیابی پس‌انداز (ارز و طلا) */
      if (data.savings && typeof data.savings === 'object') {
        try { restoreSavings(data.savings, mode); } catch (eSv) { bkRestoreFail('savings', eSv); }
      }

      /* بازیابی دسته‌بندی مخارج */
      if (data.categoryData && typeof data.categoryData === 'object') {
        try { HKCategorizer.importData(data.categoryData, mode); } catch (eCat) { bkRestoreFail('categories', eCat); }
      }
      /* بازیابی پروژه‌ها (financialSubjects) */
      if (Array.isArray(data.financialSubjects)) {
        try {
          if (mode === 'replace') {
            _financialSubjects = JSON.parse(JSON.stringify(data.financialSubjects));
          } else {
            try { loadFinancialSubjects(); } catch (eL) {}
            if (!Array.isArray(_financialSubjects)) _financialSubjects = [];
            var byId = {};
            _financialSubjects.forEach(function(s) {
              if (s && s.id) byId[s.id] = true;
            });
            data.financialSubjects.forEach(function(s) {
              if (!s || !s.id) return;
              if (byId[s.id]) return; /* id موجود → duplicate نساز */
              try {
                _financialSubjects.push(JSON.parse(JSON.stringify(s)));
                byId[s.id] = true;
              } catch (eP) {
                _financialSubjects.push(s);
                byId[s.id] = true;
              }
            });
          }
          saveFinancialSubjects();
        } catch (eFS) {
          bkRestoreFail('financialSubjects', eFS);
        }
      }
      /* ترتیب کارت‌های کاربر */
      if (Array.isArray(data.personCardOrder) && data.personCardOrder.length) {
        try {
          if (_fullReplace) {
            if (periodData) periodData.personCardOrder = data.personCardOrder.slice();
            if (typeof saveGlobalCardOrder === 'function') saveGlobalCardOrder(data.personCardOrder.slice());
          } else {
            var curOrder = [];
            try {
              if (periodData && Array.isArray(periodData.personCardOrder)) curOrder = periodData.personCardOrder.slice();
              else if (typeof loadGlobalCardOrder === 'function') curOrder = loadGlobalCardOrder();
            } catch (eO) {}
            var seen = {};
            curOrder.forEach(function(t) { seen[String(t || '').trim()] = true; });
            data.personCardOrder.forEach(function(t) {
              var k = String(t || '').trim();
              if (k && !seen[k]) { curOrder.push(k); seen[k] = true; }
            });
            if (periodData) periodData.personCardOrder = curOrder;
            if (typeof saveGlobalCardOrder === 'function') saveGlobalCardOrder(curOrder);
          }
        } catch (ePO) { bkRestoreFail('personCardOrder', ePO); }
      }

      if (data.currentYear) currentYear = parseInt(data.currentYear, 10) || currentYear;
      if (data.currentMonth) currentMonth = parseInt(data.currentMonth, 10) || currentMonth;
      if (mode === 'replace' && (data.theme === 'light' || data.theme === 'dark')) applyTheme(data.theme);
      /* همان مسیر بوت نرم‌افزار: نرمال‌سازی، همگام‌سازی اقساط، نام بانک‌ها و پیشروی ماه — تا موجودی از همان اول درست باشد */
      try {
        loadCurrent();
      } catch (eLC) {
        const key = periodKey(currentYear, currentMonth);
        if (archive[key]) {
          try { periodData = JSON.parse(JSON.stringify(archive[key])); } catch (e) { periodData = archive[key]; }
        } else {
          periodData = emptyPeriodData();
        }
      }
      try { migrateAllBankNamesInData(); } catch (eMB) {}
      /* دادهٔ محلیِ از قبل یتیم هم پاک‌سازی شود (همان مهاجرت بوت) */
      try { cleanupOrphanedAccountOpenings({ noSave: true }); } catch (eCl) {}
      try { autoAdvancePersianMonthIfNeeded(); } catch (eAA) {}
      // اگر cardMeta فقط در root بکاپ بود و داخل ماه نبود
      if (data.cardMeta && typeof data.cardMeta === 'object') {
        if (!periodData.cardMeta) periodData.cardMeta = {};
        Object.keys(data.cardMeta).forEach(k => { periodData.cardMeta[k] = data.cardMeta[k]; });
      }
      try { claimBackupOwnership(); } catch (e) {}
      try { persistCurrent(); } catch (e) { bkRestoreFail('archive', e); }
      try { saveArchive(); } catch (e) { bkRestoreFail('archive', e); }
      try { if (typeof saveRecurring === 'function') saveRecurring(); } catch (e) {}
      try { initSelectors(); } catch (e) {}
      try { updateTabUI(); } catch (e) {}
      try { renderAll(); } catch (e) {}
      try { checkInstallReminders(); } catch (e) {}
      try {
        _hbcLast = null;
        var _amtB = document.getElementById('homeBalanceAmt');
        if (_amtB) _amtB._hbcBusy = false;
        if (typeof renderHomeCards === 'function') renderHomeCards();
      } catch (eB1) {}
      try {
        requestAnimationFrame(function () {
          try {
            _hbcLast = null;
            var a2 = document.getElementById('homeBalanceAmt');
            if (a2) a2._hbcBusy = false;
            if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
          } catch (eB2) {}
          requestAnimationFrame(function () {
            try {
              _hbcLast = null;
              var a3 = document.getElementById('homeBalanceAmt');
              if (a3) a3._hbcBusy = false;
              if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(true);
            } catch (eB3) {}
          });
        });
      } catch (eB4) {}
      /* اگر چیزی نادیده گرفته شد، کوتاه و آرام به کاربر بگو (دادهٔ سالم وارد شده است) */
      try {
        var _msg = backupReportText(_restoreReport);
        if (_msg) setTimeout(function () { if (_hkRestoreAborted) return; try { showToastLong(_msg); } catch (eT) {} }, 900);
      } catch (eMsg) {}
      /* بعد از ری‌استور، موجودی را چند بار با داده‌ی نهایی مقایسه کن تا هیچ تغییر دیرهنگامی جا نماند */
      [1600, 3400].forEach(function (ms) {
        setTimeout(function () {
          try { if (typeof updateHomeBalanceCircle === 'function') updateHomeBalanceCircle(); } catch (eS) {}
        }, ms);
      });

    }

    function openBackupRestoreChoice(data) {
      let old = document.getElementById('backupRestoreOverlay');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'backupRestoreOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--card);color:var(--text);border-radius:14px;padding:16px;max-width:360px;width:100%;border:1px solid var(--border);box-shadow:0 12px 32px rgba(0,0,0,0.35);font-family:Vazirmatn,Tahoma,sans-serif;';
      card.innerHTML =
        '<div style="font-weight:800;font-size:1.05rem;margin-bottom:14px;text-align:center;">بازیابی پشتیبان</div>' +
        '<button type="button" id="backupReplaceBtn" style="width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:10px;background:#ff3b30;color:#fff;font-weight:800;font-size:0.95rem;font-family:inherit;">جایگزین کردن اطلاعات فعلی</button>' +
        '<button type="button" id="backupMergeBtn" style="width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:10px;background:#08b5f5;color:#fff;font-weight:800;font-size:0.95rem;font-family:inherit;">افزودن به اطلاعات فعلی</button>' +
        '<button type="button" id="backupCancelBtn" style="width:100%;padding:10px;border:none;border-radius:10px;background:var(--bg3);color:var(--text);font-weight:700;font-size:0.9rem;font-family:inherit;">انصراف</button>' +
        '<div id="bkRestoreScope" style="font-size:0.78rem;margin-top:10px;line-height:1.6;text-align:center;"></div>' +
        '<div class="bk-restore-hint" style="font-size:0.72rem;color:var(--muted);margin-top:10px;line-height:1.5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">در حالت افزودن، ردیف‌های تکراری وارد نمی‌شوند.</div>';
      overlay.appendChild(card);
      /* کامل یا جزئی بودن فایل و اثر «جایگزینی» پیش از انتخاب گفته شود */
      try {
        var sc = bkBackupScope(data), nm = Object.keys((data && data.archive) || {}).length;
        var info = (sc.complete ? 'پشتیبان کامل' : (sc.known ? 'پشتیبان جزئی' : 'کامل بودن این فایل مشخص نیست')) +
          ' · ' + toPersianDigits(String(nm)) + ' ماه' + (sc.cards ? ' · ' + toPersianDigits(String(sc.cards.length)) + ' کارت' : '') + '<br>' +
          (sc.complete ? 'جایگزینی، همهٔ اطلاعات فعلی را با این فایل عوض می‌کند.' : 'با جایگزینی فقط ماه‌ها و کارت‌های داخل فایل عوض می‌شوند؛ بقیهٔ اطلاعات حفظ می‌شود.');
        card.querySelector('#bkRestoreScope').innerHTML = info;
      } catch (eSc) {}
      document.body.appendChild(overlay);
      const close = () => { try { overlay.remove(); } catch (e) {} };
      document.getElementById('backupCancelBtn').onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.getElementById('backupReplaceBtn').onclick = () => {
        close();
        safetyBackupThen('restore', () => {
          try {
            if (applyBackupData(data, 'replace') !== false) showToast('بازیابی با جایگزینی انجام شد');
          } catch (err) {
            console.error(err);
            showToast('خطا در بازیابی');
          }
        });
      };
      document.getElementById('backupMergeBtn').onclick = () => {
        close();
        safetyBackupThen('restore', () => {
          try {
            if (applyBackupData(data, 'merge') !== false) showToast('بازیابی با ادغام انجام شد');
          } catch (err) {
            console.error(err);
            showToast('خطا در ادغام');
          }
        });
      };
    }

    /* امنیت: کلیدهای __proto__/constructor/prototype از فایل ورودی حذف شوند (جلوگیری از آلوده‌سازی prototype) */
    function hkSafeJsonParse(text) {
      return JSON.parse(text, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
    }
    function importFullBackup(ev) {
      const file = ev && ev.target && ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          let parsed0 = hkSafeJsonParse(reader.result);
          /* پشتیبان رمزدار قالب جدید (hk-backup-enc): بررسی ساختار ← بازکردن با کلید همین دستگاه یا رمز/کد بازیابی ← همان مسیر بازیابی */
          if (parsed0 && typeof parsed0 === 'object' && parsed0.format === HK_ENC_FORMAT) { hkOpenEncryptedBackup(parsed0); return; }
          /* فایل رمزدار: اول رمز، بعد همان مسیر بازیابی معمول */
          if (parsed0 && parsed0.enc === 'AES-256-GCM' && parsed0.data) {
            askBackupPassword(async function (pw) {
              try {
                const plain = await hkDecryptBackup(parsed0, pw);
                const d2 = hkSafeJsonParse(plain);
                if (!d2 || typeof d2 !== 'object') throw new Error('invalid');
                openBackupRestoreChoice(d2);
              } catch (eDec) { showToast('رمز نادرست است یا فایل آسیب دیده'); }
            });
            return;
          }
          const data = parsed0;
          if (!data || typeof data !== 'object') throw new Error('invalid');
          // پشتیبانی از فایل‌هایی که فقط archive هستند
          if (!data.archive && !data.plans && !data.recurringIncomes) {
            // شاید خود archive باشد
            if (typeof data === 'object' && Object.keys(data).some(k => /^\d{4}-\d{1,2}$/.test(k))) {
              openBackupRestoreChoice({ archive: data });
              return;
            }
            throw new Error('invalid');
          }
          openBackupRestoreChoice(data);
        } catch (e) {
          showToast('فایل پشتیبان نامعتبر است');
        }
      };
      reader.onerror = () => showToast('خواندن فایل ممکن نشد');
      reader.readAsText(file, 'utf-8');
    }

    function askExport() {
      closeSideMenu();
      let old = document.getElementById('exportChoiceOverlay');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = 'exportChoiceOverlay';
      overlay.className = 'modal-overlay open';
      overlay.style.zIndex = '310';

      const box = document.createElement('div');
      box.className = 'export-choice-box';
      box.innerHTML =
        '<div class="export-choice-title">خروجی گزارش</div>' +
        '<div class="export-choice-actions">' +
          '<button type="button" class="export-choice-btn excel" id="exportExcelBtn">' +
            '<span class="ex-ico" aria-hidden="true"><svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M14 5h16l9 9v27a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#fff"/>' +
              '<path d="M30 5v7a2 2 0 0 0 2 2h7z" fill="#cfe5d7"/>' +
              '<path d="M24 22h10M24 28h10M24 34h10" stroke="#7fb896" stroke-width="2.4" stroke-linecap="round"/>' +
              '<rect x="4" y="19" width="19" height="19" rx="3.5" fill="#12502d"/>' +
              '<path d="M9 24l9 9M18 24l-9 9" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>' +
            '</svg></span>' +
            '<span>اکسل</span>' +
          '</button>' +
          '<button type="button" class="export-choice-btn pdf" id="exportPdfBtn">' +
            '<span class="ex-ico" aria-hidden="true"><svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M14 5h16l9 9v27a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#fff"/>' +
              '<path d="M30 5v7a2 2 0 0 0 2 2h7z" fill="#f3d1cc"/>' +
              '<path d="M17 15h9M17 20h15" stroke="#e3a59c" stroke-width="2.4" stroke-linecap="round"/>' +
              '<rect x="4" y="25" width="31" height="14" rx="3.5" fill="#8e2318"/>' +
              '<text x="19.5" y="35.6" text-anchor="middle" fill="#fff" font-size="10" font-weight="800" font-family="Arial,sans-serif" letter-spacing="0.4">PDF</text>' +
            '</svg></span>' +
            '<span>PDF</span>' +
          '</button>' +
        '</div>';

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const close = () => { try { overlay.remove(); } catch (e) {} };
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      /* اول پنجرهٔ انتخاب بخش‌ها، کاربر و بازه */
      document.getElementById('exportExcelBtn').onclick = () => { close(); hkOpenExportDialog('excel'); };
      document.getElementById('exportPdfBtn').onclick = () => { close(); hkOpenExportDialog('pdf'); };
    }











    /* ===== خروجی آفلاین واقعی XLSX - سازگار با Excel/Android ===== */
    function xlsxEsc(v){
      let s=String(v==null?'':v);
      s=s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ');
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
    }
    function xlsxCol(n){ let x=''; n++; while(n){ let r=(n-1)%26; x=String.fromCharCode(65+r)+x; n=Math.floor((n-1)/26); } return x; }
    function xlsxBytes(str){ return new TextEncoder().encode(str); }
    function xlsxU16(n){ return new Uint8Array([n&255,(n>>>8)&255]); }
    function xlsxU32(n){ return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]); }
    function xlsxConcat(arrs){ let n=0; arrs.forEach(a=>n+=a.length); let o=new Uint8Array(n),p=0; arrs.forEach(a=>{o.set(a,p);p+=a.length;}); return o; }
    function xlsxCrc32(bytes){ let c=0xffffffff; for(let i=0;i<bytes.length;i++){ c^=bytes[i]; for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
    function xlsxZip(files){
      const locals=[],centrals=[]; let off=0;
      files.forEach(f=>{
        const name=xlsxBytes(f.name),data=typeof f.data==='string'?xlsxBytes(f.data):f.data,crc=xlsxCrc32(data);
        const lh=xlsxConcat([new Uint8Array([80,75,3,4]),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),name,data]);
        locals.push(lh);
        const ch=xlsxConcat([new Uint8Array([80,75,1,2]),xlsxU16(20),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU16(0),xlsxU32(0),xlsxU32(off),name]);
        centrals.push(ch); off+=lh.length;
      });
      const cd=xlsxConcat(centrals),body=xlsxConcat(locals);
      const eocd=xlsxConcat([new Uint8Array([80,75,5,6]),xlsxU16(0),xlsxU16(0),xlsxU16(files.length),xlsxU16(files.length),xlsxU32(cd.length),xlsxU32(body.length),xlsxU16(0)]);
      return xlsxConcat([body,cd,eocd]);
    }
    /* ===== خروجی Excel (XLSX واقعی و آفلاین): مبالغ عددی با جداکنندهٔ هزارگان، سرستون پررنگ و ثابت، راست‌به‌چپ =====
       سلول: رشته/عدد یا {v, s} — s: 1 سرستون، 2 متن، 3 عدد، 4 جمع (متن)، 5 جمع (عدد)، 6 عنوان، 7 گروه */
    function xlsxCellXml(ref, c, sharedId) {
      var v = c, s = 0;
      if (c && typeof c === 'object' && 'v' in c) { v = c.v; s = c.s || 0; }
      if (v === null || v === undefined || v === '') return s ? '<c r="' + ref + '" s="' + s + '"/>' : '';
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '" t="s"' + (s ? ' s="' + s + '"' : '') + '><v>' + sharedId(v) + '</v></c>';
    }
    function xlsxSheetXml2(sh, sharedId) {
      var rows = sh.rows, max = 0;
      rows.forEach(function (r) { max = Math.max(max, r.length); });
      var cols = '';
      for (var i = 0; i < max; i++) cols += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + ((sh.widths && sh.widths[i]) || 16) + '" customWidth="1"/>';
      var pane = sh.freeze ? '<pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>' : '';
      var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
        '<dimension ref="A1:' + xlsxCol(Math.max(0, max - 1)) + Math.max(1, rows.length) + '"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1">' + pane + '</sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="18"/><cols>' + cols + '</cols><sheetData>';
      rows.forEach(function (r, ri) {
        out += '<row r="' + (ri + 1) + '">';
        r.forEach(function (c, ci) { out += xlsxCellXml(xlsxCol(ci) + (ri + 1), c, sharedId); });
        out += '</row>';
      });
      out += '</sheetData>' + (sh.merges && sh.merges.length ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') +
        '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>';
      return out;
    }
    /* پس‌انداز برای خروجی: خلاصهٔ هر نوع + ردیف‌های خرید (اگر چیزی ثبت نشده، null) */
    function savingsExportData() {
      var groups = [];
      try { groups = (typeof _savGroups === 'function') ? _savGroups() : []; } catch (e) { groups = []; }
      if (!groups.length) return null;
      var tot = { cost: 0, value: 0, pnl: 0, anyP: false, missing: 0 };
      groups.forEach(function (G) {
        tot.cost += G.cost;
        if (G.price) tot.value += G.value; else tot.missing++;
        if (G.pnl != null) { tot.pnl += G.pnl; tot.anyP = true; }
      });
      var dateOf = function (it) { return it.y ? toPersianDigits(String(it.y)) + '/' + toPersianPad2(it.m || 1) + '/' + toPersianPad2(it.d || 1) : ''; };
      return { groups: groups, tot: tot, dateOf: dateOf, unitOf: _savUnit, qty: _savFmtQty };
    }
    function buildXlsxSheets() {
      if (_hkRecArc) return { sheets: hkRecArcSheets() };
      var O = _hkExportOpts || {};
      var want = function (k) { return !O.sections || !!O.sections[k]; };
      var months = hkExportMonths(O.range || 'month');
      if (!months.length) months = [{ y: currentYear, m: currentMonth, pd: periodData, label: MONTHS[currentMonth - 1] + ' ' + toPersianDigits(currentYear) }];
      var multi = months.length > 1;
      var periodLabel = hkExportRangeLabel(O.range || 'month', months) + (O.user ? ' — ' + O.user : '');
      /* ۱.۳.۴۷: تک‌کاربره: نام کاربر فقط یک بار در عنوان؛ ستون و جمع‌های «کارت» نمی‌آیند */
      var ONE = true, UNAME = ''; try { UNAME = hkMainTitle(); } catch (eU) {}
      var dropCard = function (arr) { return ONE ? arr.slice(1) : arr; };
      var PD = periodData;
      var H = function (t) { return { v: t, s: 1 }; }, T = function (t) { return { v: t, s: 2 }; }, N = function (n) { return { v: Math.round(Number(n) || 0), s: 3 }; };
      var TT = function (t) { return { v: t, s: 4 }; }, TN = function (n) { return { v: Math.round(Number(n) || 0), s: 5 }; }, G = function (t) { return { v: t, s: 7 }; };
      var usable = function (r) { return r && !r.deletedAt && (r.desc || Number(r.amount) || r.day); };
      var secs = function (tab) { return ((PD[tab] && PD[tab].sections) || []).filter(function (sec) { return !O.user || (((sec.title || '').trim()) || '—') === O.user; }); };
      var dayNum = function (r) { var d = parseInt(toEnglishDigits(String(r.day || '')), 10); return d >= 1 && d <= 31 ? d : ''; };
      var sheets = [];
      /* خلاصه */
      var sum = [[{ v: 'گزارش مالی ' + (UNAME ? UNAME + ' — ' : '') + periodLabel, s: 6 }], []];
      var kpiAt = sum.length;  /* جای خلاصهٔ عددی (بعد از محاسبه پر می‌شود) */
      if (!ONE) sum.push([H('کارت'), H('درآمد'), H('دریافت‌نشده'), H('مخارج'), H('پرداخت‌نشده'), H('مانده')]);
      var by = {}, order = [], perMonth = [];
      months.forEach(function (mo) {
        PD = mo.pd;
        var pm = { label: mo.label, i: 0, e: 0 };
        ['income', 'expense'].forEach(function (tab) {
          secs(tab).forEach(function (sec) {
            var t = ((sec.title || '').trim()) || '—';
            if (!by[t]) { by[t] = { i: 0, iu: 0, e: 0, eu: 0 }; order.push(t); }
            (sec.rows || []).forEach(function (r) {
              if (!usable(r)) return;
              var a = pdfPersonalAmounts(tab, r);
              if (tab === 'income') { by[t].i += a.total; by[t].iu += a.unpaid; pm.i += a.total; } else { by[t].e += a.total; by[t].eu += a.unpaid; pm.e += a.total; }
            });
          });
        });
        perMonth.push(pm);
      });
      PD = periodData;
      var g = { i: 0, iu: 0, e: 0, eu: 0 };
      order.forEach(function (t) { var c = by[t]; g.i += c.i; g.iu += c.iu; g.e += c.e; g.eu += c.eu; if (!ONE) sum.push([T(t), N(c.i), N(c.iu), N(c.e), N(c.eu), N(c.i - c.e)]); });
      if (!ONE) sum.push([TT('جمع'), TN(g.i), TN(g.iu), TN(g.e), TN(g.eu), TN(g.i - g.e)]);
      if (multi) {
        sum.push([]); sum.push([H('ماه'), H('درآمد'), H('مخارج'), H('مانده')]);
        perMonth.forEach(function (pm) { sum.push([T(pm.label), N(pm.i), N(pm.e), N(pm.i - pm.e)]); });
        sum.push([TT('جمع'), TN(g.i), TN(g.e), TN(g.i - g.e)]);
      }
      var acc = {}; try { acc = globalAccountBalances() || {}; } catch (e) {}
      var as = 0; Object.keys(acc).forEach(function (k) { as += Number(acc[k]) || 0; });
      if (Object.keys(acc).length && want('accounts')) {
        sum.push([]); sum.push([H('حساب'), H('موجودی')]);
        Object.keys(acc).forEach(function (k) { sum.push([T(k), N(acc[k])]); });
        sum.push([TT('جمع'), TN(as)]);
      }
      /* خلاصهٔ عددی مثل سربرگ PDF */
      sum.splice(kpiAt, 0,
        [H('شاخص'), H('مبلغ'), H('توضیح')],
        [T('کل درآمد'), N(g.i), T('دریافت‌شده ' + formatNum(g.i - g.iu) + ' · مانده ' + formatNum(g.iu))],
        [T('کل مخارج'), N(g.e), T('پرداخت‌شده ' + formatNum(g.e - g.eu) + ' · مانده ' + formatNum(g.eu))],
        [T('درآمد منهای مخارج'), N(g.i - g.e), T((g.i - g.e >= 0 ? 'مازاد' : 'کسری') + (multi ? ' این بازه' : ' این ماه'))],
        [T('موجودی حساب‌ها'), N(as), T(toPersianDigits(Object.keys(acc).length) + ' حساب')],
        []);
      sheets.push({ name: 'خلاصه', rows: sum, widths: [26, 18, 18, 18, 18, 18], merges: ['A1:F1'] });
      /* درآمد و مخارج */
      ['income', 'expense'].forEach(function (tab) {
        if (!want(tab)) return;
        var inc = tab === 'income';
        var head = dropCard(inc ? [H('کارت'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('حساب'), H('مبلغ'), H('وضعیت'), H('پروژه')] : [H('کارت'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('دسته'), H('حساب'), H('مبلغ'), H('وضعیت'), H('پروژه')]);
        var rows = [head], gt = 0;
        /* بازهٔ چندماهه: ماه‌به‌ماه با عنوان هر ماه */
        months.forEach(function (mo) {
        PD = mo.pd;
        if (multi && secs(tab).some(function (sec) { return (sec.rows || []).some(usable); })) rows.push(head.map(function (c, ci) { return G(ci === 0 ? mo.label : ''); }));
        secs(tab).forEach(function (sec) {
          var list = (sec.rows || []).filter(usable);
          if (!list.length) return;
          var t = ((sec.title || '').trim()) || '—', st = 0;
          list.forEach(function (r) {
            var amt = Number(r.amount) || 0; if (!r.p2p) st += amt;
            var stat = r.status === 'paid' ? (inc ? 'دریافت‌شده' : 'پرداخت‌شده') : (inc ? 'دریافت‌نشده' : 'پرداخت‌نشده');
            var cat = ''; if (!inc) { try { var c = HKCategorizer.classify(r.desc, r); cat = c ? c.label : ''; } catch (e) {} }
            var pj = ''; try { var fc = rowFinancialContext(r); if (fc && fc.subjectName && fc.subjectId !== 'personal') pj = fc.subjectName; } catch (eP) {}
            var dx = hkExpDate(r, mo.y, mo.m), dTxt = dx.fa ? dx.fa + '  ·  ' + dx.en : '';
            rows.push(dropCard(inc ? [T(t), T(dTxt), T(hkExpTime(r)), T(r.desc || ''), T(r.account || ''), N(amt), T(stat), T(pj)] : [T(t), T(dTxt), T(hkExpTime(r)), T(r.desc || ''), T(cat), T(r.account || ''), N(amt), T(stat), T(pj)]));
          });
          gt += st;
          var tr = inc ? [TT('جمع ' + t), TT(''), TT(''), TT(''), TT(''), TN(st), TT(''), TT('')] : [TT('جمع ' + t), TT(''), TT(''), TT(''), TT(''), TT(''), TN(st), TT(''), TT('')];
          if (!ONE) rows.push(tr);
        });
        });
        PD = periodData;
        var gtr = inc ? [TT('جمع کل'), TT(''), TT(''), TT(''), TT(''), TN(gt), TT(''), TT('')] : [TT('جمع کل'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(gt), TT(''), TT('')];
        if (ONE) { gtr = gtr.slice(1); gtr[0] = TT('جمع کل'); }
        rows.push(gtr);
        sheets.push({ name: inc ? 'درآمد' : 'مخارج', rows: rows, widths: dropCard(inc ? [18, 26, 8, 34, 16, 16, 14, 18] : [18, 26, 8, 30, 14, 16, 16, 14, 18]), freeze: 1 });
      });
      /* اقساط */
      var ir = [[H('نام وام'), H('مبلغ هر قسط'), H('تعداد'), H('پرداخت‌شده'), H('سررسید بعدی'), H('جمع پرداختی'), H('باقی‌مانده'), H('جمع کل')]], ip = 0, irem = 0, itot = 0;
      (plans || []).filter(function (p) { return p && !p.deletedAt && (!O.user || (p.expenseSectionTitle || '').trim() === O.user); }).forEach(function (plan) {
        var count = Math.max(0, parseInt(plan.count, 10) || 0), paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0)), amt = 0, total = 0;
        try { amt = planInstallmentAmount(plan); total = planTotalPayable(plan); } catch (e) { amt = Number(plan.amount) || 0; total = amt * count; }
        var next = 'تسویه'; if (paid < count) { try { var d = dueDateForInstallment(plan, paid); next = toPersianDigits(d.d) + ' ' + MONTHS[d.m - 1] + ' ' + toPersianDigits(d.y); } catch (e2) { next = ''; } }
        ip += paid * amt; irem += total - paid * amt; itot += total;
        ir.push([T(plan.name || '—'), N(amt), N(count), N(paid), T(next), N(paid * amt), N(total - paid * amt), N(total)]);
      });
      ir.push([TT('جمع'), TT(''), TT(''), TT(''), TT(''), TN(ip), TN(irem), TN(itot)]);
      if (false && want('install')) sheets.push({ name: 'اقساط', rows: ir, widths: [22, 16, 9, 11, 18, 18, 18, 18], freeze: 1 });
      /* قرض (۱.۳.۷۳): همان دادهٔ PDF — همهٔ ردیف‌های هر رابطه با تاریخ کامل، ساعت، وضعیت و مانده */
      var lr = [[H('رابطه'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('بدهکار'), H('بستانکار'), H('مبلغ'), H('وضعیت'), H('ثبت‌کننده')]];
      var lgx = []; try { lgx = hkExpLedgerData(months); } catch (e) {}
      lgx.forEach(function (g) {
        g.rows.forEach(function (x) {
          var dx = hkExpDate(x.r, x.y, x.m);
          lr.push([T(g.title), T(dx.fa ? dx.fa + '  ·  ' + dx.en : ''), T(hkExpTime(x.r)), T(x.r.desc || ''), T(x.debtor), T(x.creditor), N(x.amt), T(x.r.settled ? 'تسویه‌شده' : 'باز'), T(x.r.createdByName || '')]);
        });
        lr.push([TT('مانده ' + g.title), TT(''), TT(''), TT(g.netTxt), TT(g.net > 0 ? g.a : g.net < 0 ? g.b : ''), TT(g.net > 0 ? g.b : g.net < 0 ? g.a : ''), TN(Math.abs(g.net)), TT(''), TT('')]);
      });
      var pairs = []; try { pairs = ledgerPairNets() || []; } catch (e) {}
      if (pairs.length) {
        lr.push([G('خلاصهٔ مانده‌ها (همهٔ رابطه‌ها، تا امروز)'), G(''), G(''), G(''), G(''), G(''), G(''), G(''), G('')]);
        pairs.forEach(function (p) { lr.push([TT((p.debtor || '') + ' به ' + (p.creditor || '') + ' بدهکار است'), TT(''), TT(''), TT(''), TT(p.debtor || ''), TT(p.creditor || ''), TN(p.amount), TT(''), TT('')]); });
      }
      if (want('ledger')) sheets.push({ name: 'قرض', rows: lr, widths: [22, 26, 8, 28, 14, 14, 16, 11, 13], freeze: 1 });
      /* درآمد ثابت + آرشیو واریزهای همین بازه */
      /* بالا: مشخصات هر قرارداد (به ترتیب روز)؛ پایین: واریزهای همین بازه (به ترتیب تاریخ) */
      var nd = function (d) { return (d && d.y) ? toPersianDigits(d.y + '/' + String(d.m).padStart(2, '0') + '/' + String(d.d).padStart(2, '0')) : ''; };
      var rr = [[H('نام'), H('مبلغ ماهانه'), H('رهن'), H('شروع قرارداد'), H('پایان قرارداد'), H('حساب')]], rs = 0, rd = 0;
      var recList = [];
      try { (recurringIncomes || []).forEach(function (r) { if (!r || r.deletedAt || (!r.name && !r.amount)) return; if (O.user && (r.sectionTitle || '').trim() !== O.user) return; recList.push(r); }); } catch (e) {}
      recList.slice().sort(function (a, b) { return (parseInt(toEnglishDigits(String(a.day || '')), 10) || 99) - (parseInt(toEnglishDigits(String(b.day || '')), 10) || 99); }).forEach(function (r) {
        rs += Number(r.amount) || 0; rd += Number(r.deposit) || 0;
        rr.push([T(r.name || '—'), N(r.amount), Number(r.deposit) > 0 ? N(r.deposit) : T('—'), T(nd(r.contractStart)), T(nd(r.contractEnd)), T(r.account || '')]);
      });
      rr.push([TT('جمع'), TN(rs), rd ? TN(rd) : TT('—'), TT(''), TT(''), TT('')]);
      var mk = {}; months.forEach(function (mo) { mk[mo.y * 100 + mo.m] = 1; });
      var arc = [];
      recList.forEach(function (it) {
        var xs = []; try { xs = recArchiveRows(it).filter(function (x) { return mk[x.key]; }); } catch (e) {}
        xs.forEach(function (x) { arc.push({ it: it, x: x, d: parseInt(toEnglishDigits(String(x.row.day || '')), 10) || 0 }); });
      });
      arc.sort(function (a, b) { return (a.x.key - b.x.key) || (a.d - b.d); });
      if (arc.length) {
        rr.push([]); rr.push([H('نام (شرح)'), H('تاریخ (شمسی · میلادی)'), H('مبلغ'), H('حساب'), H('وضعیت پرداخت'), H('ساعت')]);
        arc.forEach(function (o) {
          var y = Math.floor(o.x.key / 100), m = o.x.key % 100, dx = o.d ? hkExpDate({ day: o.d }, y, m) : null;
          rr.push([T(o.x.row.desc || o.it.name || ''), T(dx ? dx.fa + '  ·  ' + dx.en : toPersianDigits(y + '/' + String(m).padStart(2, '0'))), N(o.x.row.amount), T(o.x.row.account || ''), T(o.x.row.status === 'paid' ? 'دریافت‌شده' : 'دریافت‌نشده'), T(hkExpTime(o.x.row))]);
        });
      }
      if (want('recurring')) sheets.push({ name: 'درآمد ثابت', rows: rr, widths: [30, 26, 16, 14, 14, 10], freeze: 1 });
      /* پروژه‌ها (همهٔ ماه‌ها): خلاصه + واریزی‌ها و مخارج با تاریخ، شرح و بانک */
      var subs = []; try { subs = (loadFinancialSubjects() || []).filter(function (x) { return x && x.id && x.id !== 'personal'; }); } catch (e) {}
      if (subs.length && want('projects')) {
        var pr = [[H('پروژه'), H('نوع'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('حساب'), H('مبلغ')]];
        var pDate = function (r) { var pa = String(r.key || '').split('-'), y = parseInt(pa[0], 10) || 0, m = parseInt(pa[1], 10) || 0, d = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0; if (!y) return ''; if (d >= 1 && d <= 31) { var dx = hkExpDate({ day: d }, y, m); return dx.fa + '  ·  ' + dx.en; } return toPersianDigits(y + '/' + String(m).padStart(2, '0')); };
        var byDate = function (x, y) { return String(x.key).localeCompare(String(y.key)) || ((parseInt(x.day, 10) || 0) - (parseInt(y.day, 10) || 0)); };
        subs.forEach(function (sub) {
          var rep = null; try { rep = computeSubjectReport(sub.id); } catch (e) {}
          if (!rep) return;
          var dep = Number(rep.received) || 0, ex = Number(rep.totalExpense != null ? rep.totalExpense : rep.totalCost) || 0, net = dep - ex;
          pr.push([G('پروژهٔ ' + (sub.name || '—')), G(''), G(''), G(''), G(net > 0 ? 'طلب پروژه' : net < 0 ? 'بدهی پروژه' : 'تسویه'), G(''), { v: Math.abs(net), s: 5 }]);
          var ins = (rep.rows || []).filter(function (x) { return x.tab === 'income'; }).sort(byDate);
          var outs = (rep.rows || []).filter(function (x) { return x.tab === 'expense'; }).sort(byDate);
          ins.forEach(function (r) { pr.push([T(sub.name || ''), T('واریزی'), T(pDate(r)), T(hkExpTime(r)), T(r.desc || ''), T(r.bank || ''), N(r.amt)]); });
          pr.push([TT('جمع واریزی‌ها'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(dep)]);
          outs.forEach(function (r) { pr.push([T(sub.name || ''), T('مخارج'), T(pDate(r)), T(hkExpTime(r)), T(r.desc || ''), T(r.bank || ''), N(r.amt)]); });
          pr.push([TT('جمع مخارج'), TT(''), TT(''), TT(''), TT(''), TT(''), TN(ex)]);
        });
        sheets.push({ name: 'پروژه‌ها', rows: pr, widths: [20, 10, 26, 8, 30, 16, 18], freeze: 1 });
      }
      /* پس‌انداز (ارز و طلا): خلاصهٔ هر نوع + ردیف‌های خرید */
      var sv = want('savings') ? savingsExportData() : null;
      if (sv) {
        var srows = [[H('نوع'), H('مقدار'), H('قیمت خرید کل'), H('قیمت روز هر واحد'), H('ارزش روز'), H('سود / زیان')]];
        sv.groups.forEach(function (G) {
          srows.push([T(G.name), T(sv.qty(G.qty) + ' ' + G.unit), G.cost ? N(G.cost) : T('—'), G.price ? N(G.price) : T('وارد نشده'), G.price ? N(G.value) : T('—'), G.pnl != null ? N(G.pnl) : T('—')]);
        });
        srows.push([TT('جمع'), TT(''), TN(sv.tot.cost), TT(''), TN(sv.tot.value), sv.tot.anyP ? TN(sv.tot.pnl) : TT('—')]);
        srows.push([]);
        srows.push([H('نوع'), H('تاریخ خرید'), H('مقدار'), H('قیمت خرید هر واحد'), H('قیمت خرید کل'), H('یادداشت')]);
        sv.groups.forEach(function (G) {
          G.items.forEach(function (it) {
            var q = Number(it.qty) || 0, b = Number(it.buy) || 0;
            srows.push([T(G.name), T(sv.dateOf(it)), T(sv.qty(q) + ' ' + sv.unitOf(it)), b ? N(b) : T('—'), b ? N(q * b) : T('—'), T(it.note || '')]);
          });
        });
        sheets.push({ name: 'پس‌انداز', rows: srows, widths: [20, 14, 16, 18, 18, 24], freeze: 1 });
      }
      return { sheets: sheets, periodLabel: periodLabel };
    }
    function buildXlsxWorkbook() {
      var built = buildXlsxSheets(), sheets = built.sheets;
      var map = new Map(), list = [];
      var sid = function (v) { var k = String(v); if (map.has(k)) return map.get(k); var n = list.length; map.set(k, n); list.push(k); return n; };
      var sheetFiles = [], rels = [];
      sheets.forEach(function (sh, i) {
        sheetFiles.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: xlsxSheetXml2(sh, sid) });
        rels.push('<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>');
      });
      var sst = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + list.length + '" uniqueCount="' + list.length + '">' +
        list.map(function (v) { return '<si><t xml:space="preserve">' + xlsxEsc(v) + '</t></si>'; }).join('') + '</sst>';
      var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><bookViews><workbookView xWindow="0" yWindow="0"/></bookViews><sheets>' +
        sheets.map(function (sh, i) { return '<sheet name="' + xlsxEsc(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><calcPr calcId="191029"/></workbook>';
      var n = sheets.length;
      var overrides = '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>';
      for (var i = 0; i < n; i++) overrides += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      var content = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' + overrides + '</Types>';
      var rootrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
      var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') +
        '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
      var bd = '<border><left style="thin"><color rgb="FFA6A6A6"/></left><right style="thin"><color rgb="FFA6A6A6"/></right><top style="thin"><color rgb="FFA6A6A6"/></top><bottom style="thin"><color rgb="FFA6A6A6"/></bottom><diagonal/></border>';
      var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>' +
        '<fonts count="4"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="14"/><name val="Tahoma"/></font></fonts>' +
        '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF333333"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6E6E6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + bd + '</borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="8">' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>' +
          '<xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
          '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>';
      var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">حساب کتاب — ' + xlsxEsc(built.periodLabel) + '</dc:title></cp:coreProperties>';
      var files = [{ name: '[Content_Types].xml', data: content }, { name: '_rels/.rels', data: rootrels }, { name: 'xl/workbook.xml', data: workbook }, { name: 'xl/_rels/workbook.xml.rels', data: wbRels }, { name: 'xl/styles.xml', data: styles }, { name: 'xl/sharedStrings.xml', data: sst }, { name: 'docProps/core.xml', data: core }].concat(sheetFiles);
      return new Blob([xlsxZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    async function nativeSaveBlobToDownloads(blob, filename, mimeType){
      const C=window.Capacitor, plugins=C&&C.Plugins, native=plugins&&plugins.NativeFileExport;
      if(!C || !native || typeof native.saveBase64ToDownloads !== 'function') return false;
      const bytes=new Uint8Array(await blob.arrayBuffer());
      let binary=''; const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+chunk,bytes.length)));
      const result=await native.saveBase64ToDownloads({filename:filename,mimeType:mimeType||blob.type||'application/octet-stream',data:btoa(binary)});
      return !!(result && result.uri);
    }

    async function shareExportFile(blob, filename, mimeType){
      if (typeof hkIsIos === 'function' && hkIsIos()) { try { return await hkIosSaveBlob(blob, filename, mimeType); } catch (eI) { return false; } }
      try{
        if(await nativeSaveBlobToDownloads(blob,filename,mimeType)) return true;
      }catch(e){console.warn('Native Downloads save failed:',e);}
      try{
        if(navigator.share&&typeof File!=='undefined'){
          const file=new File([blob],filename,{type:mimeType});
          if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({title:filename,files:[file]});return true;}
        }
      }catch(e){console.warn('Web share failed:',e);}
      return false;
    }

    async function exportExcel(){
      try{ persistCurrent(); showToast('در حال ساخت فایل Excel...'); const name=hkExportFileBase()+'.xlsx'; const blob=buildXlsxWorkbook(); const shared=await shareExportFile(blob,name,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); if(!shared) downloadBlob(blob,name); showToast(shared?'فایل Excel آماده است':'دانلود Excel شروع شد'); }
      catch(e){ console.error(e); showToast('ساخت Excel ناموفق بود'); }
    }

