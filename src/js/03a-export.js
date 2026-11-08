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
        { key: 'categories', label: 'دسته‌بندی مخارج' },
        { key: 'dong', label: 'دنگ' }
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
