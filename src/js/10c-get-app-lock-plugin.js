    /* ========== App Lock / Security ========== */
    var __lockUnlockedThisSession = false;
    var __lockPinBuffer = '';
    var __lockPinLen = 6;
    var __lockBgTs = 0;
    var __pinSetupState = null; // { mode, step, temp, resolve, reject }

    function getAppLockPlugin() {
      try {
        var C = window.Capacitor;
        return C && C.Plugins && C.Plugins.AppLock ? C.Plugins.AppLock : null;
      } catch (e) { return null; }
    }

    /** Web fallback: hash only (never raw PIN). Used when native plugin missing (browser). */
    async function webHashPin(pin, salt) {
      var enc = new TextEncoder();
      var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
      var bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(bits)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    }
    function webGetSecMeta() {
      try { return JSON.parse(localStorage.getItem('hk_sec_meta') || '{}') || {}; } catch (e) { return {}; }
    }
    function webSetSecMeta(o) {
      try { localStorage.setItem('hk_sec_meta', JSON.stringify(o || {})); } catch (e) {}
    }

    async function lockConsumeDeviceLockedFlag() {
      var p = getAppLockPlugin();
      if (p && p.consumeDeviceLockedFlag) {
        try {
          var r = await p.consumeDeviceLockedFlag();
          return !!(r && r.wasLocked);
        } catch (e) { return false; }
      }
      try {
        var v = sessionStorage.getItem('hk_device_was_locked');
        sessionStorage.removeItem('hk_device_was_locked');
        return v === '1';
      } catch (e2) { return false; }
    }
    function lockMarkDeviceLockedWeb() {
      try { sessionStorage.setItem('hk_device_was_locked', '1'); } catch (e) {}
    }
    async function lockIsEnabled() {
      var p = getAppLockPlugin();
      if (p && p.isEnabled) {
        try {
          var r = await p.isEnabled();
          return !!(r && r.enabled);
        } catch (e) { return false; }
      }
      var m = webGetSecMeta();
      return !!(m.enabled && m.hash && m.salt);
    }
    async function lockIsBiometricEnabled() {
      var p = getAppLockPlugin();
      if (p && p.isBiometricEnabled) {
        try {
          var r = await p.isBiometricEnabled();
          return !!(r && r.enabled);
        } catch (e) { return false; }
      }
      return !!webGetSecMeta().bio;
    }
    async function lockCanBiometric() {
      var p = getAppLockPlugin();
      if (p && p.canUseBiometric) {
        try {
          var r = await p.canUseBiometric();
          return !!(r && r.available);
        } catch (e) { return false; }
      }
      return false;
    }
    async function lockSetPin(pin) {
      var p = getAppLockPlugin();
      if (p && p.setPin) {
        await p.setPin({ pin: String(pin) });
        return;
      }
      var salt = (crypto.getRandomValues(new Uint8Array(16)));
      var saltHex = Array.from(salt).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      var hash = await webHashPin(String(pin), saltHex);
      var m = webGetSecMeta();
      m.enabled = true;
      m.hash = hash;
      m.salt = saltHex;
      m.pinLen = String(pin).length;
      webSetSecMeta(m);
    }
    async function lockVerifyPin(pin) {
      var p = getAppLockPlugin();
      if (p && p.verifyPin) {
        try {
          var r = await p.verifyPin({ pin: String(pin) });
          return !!(r && r.ok);
        } catch (e) { return false; }
      }
      var m = webGetSecMeta();
      if (!m.hash || !m.salt) return false;
      var h = await webHashPin(String(pin), m.salt);
      return h === m.hash;
    }
    async function lockDisable() {
      var p = getAppLockPlugin();
      if (p && p.disable) {
        await p.disable();
        return;
      }
      webSetSecMeta({});
    }
    async function lockSetBiometric(on) {
      var p = getAppLockPlugin();
      if (p && p.setBiometricEnabled) {
        await p.setBiometricEnabled({ enabled: !!on });
        return;
      }
      var m = webGetSecMeta();
      m.bio = !!on;
      webSetSecMeta(m);
    }
    /* منبع حقیقت قفل خودکار: فقط localStorage — پلاگین گاهی 0 برمی‌گرداند و تنظیم را خراب می‌کند */
    var __autoLockSecMem = null;
    async function lockGetAutoLockSeconds() {
      if (typeof __autoLockSecMem === 'number' && __autoLockSecMem >= 0) {
        return __autoLockSecMem;
      }
      try {
        var m = webGetSecMeta();
        var v = m.autoLock;
        if (typeof v === 'string') v = parseInt(v, 10);
        if (typeof v === 'number' && !isNaN(v) && v >= 0) {
          __autoLockSecMem = v;
          return v;
        }
      } catch (e) {}
      __autoLockSecMem = 0;
      return 0;
    }
    async function lockSetAutoLockSeconds(sec) {
      sec = Number(sec);
      if (isNaN(sec) || sec < 0) sec = 0;
      __autoLockSecMem = sec;
      try {
        var m = webGetSecMeta();
        m.autoLock = sec;
        webSetSecMeta(m);
      } catch (eW) {}
      /* best-effort به نیتیو — نتیجه خواندن از نیتیو نادیده گرفته می‌شود */
      try {
        var p = getAppLockPlugin();
        if (p && p.setAutoLockSeconds) {
          await p.setAutoLockSeconds({ seconds: sec });
        }
      } catch (eP) {}
    }
    async function lockGetPinLength() {
      var p = getAppLockPlugin();
      if (p && p.getPinLength) {
        try {
          var r = await p.getPinLength();
          return (r && r.length) ? r.length : 6;
        } catch (e) {}
      }
      var m = webGetSecMeta();
      return m.pinLen || 6;
    }

    function isPeriodSelectList(node) {
      try {
        var mw = document.getElementById('monthSelectWrap');
        var yw = document.getElementById('yearSelectWrap');
        if (mw && mw._list === node) return true;
        if (yw && yw._list === node) return true;
      } catch (e) {}
      return false;
    }
    function ensurePeriodSelectListsAttached() {
      try {
        ['monthSelectWrap', 'yearSelectWrap'].forEach(function(id) {
          var w = document.getElementById(id);
          if (w && w._list && !w._list.isConnected) {
            document.body.appendChild(w._list);
          }
          if (w && w._list) {
            try { w._list.classList.remove('open'); } catch (e0) {}
          }
        });
      } catch (e) {}
    }
    function closeFloatingMenusForLock() {
      try {
        document.querySelectorAll('.dark-select-list').forEach(function(n) {
          if (isPeriodSelectList(n)) {
            try { n.classList.remove('open'); } catch (e1) {}
            return;
          }
          /* منوهای موقت (مثل حساب) */
          try { n.remove(); } catch (e2) {}
        });
      } catch (eR) {}
      try {
        var bd = document.getElementById('darkSelectBackdrop');
        if (bd) bd.style.display = 'none';
      } catch (eB) {}
    }
    function showAppLockOverlay(show) {
      var el = document.getElementById('appLockOverlay');
      if (!el) return;
      if (show) {
        closeFloatingMenusForLock();
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        /* چرخش اعداد موجودی پشت قفل دیده نمی‌شود → بعد از باز شدن قفل از نو اجرا شود */
        _hbcReplayAfterUnlock = true;
      } else {
        var wasShown = el.classList.contains('show');
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        ensurePeriodSelectListsAttached();
        if (wasShown && _hbcReplayAfterUnlock) {
          _hbcReplayAfterUnlock = false;
          setTimeout(function () {
            try { var a = document.getElementById('homeBalanceAmt'); if (a) a._hbcBusy = false; } catch (e0) {}
            try { if (_hbcReady) updateHomeBalanceCircle(true); } catch (e1) {}
          }, 220);
        }
      }
    }

    /* تلاش‌های ناموفق رمز ماندگار است (با بستن و باز کردن نرم‌افزار صفر نمی‌شود) و قفل موقت تصاعدی بلندتر می‌شود */
    var LOCK_FAIL_KEY = 'hk_lock_fail';
    function _lockFailState() { try { var o = JSON.parse(localStorage.getItem(LOCK_FAIL_KEY) || '{}') || {}; return { n: o.n | 0, until: +o.until || 0, rounds: o.rounds | 0 }; } catch (e) { return { n: 0, until: 0, rounds: 0 }; } }
    function _lockFailSave(o) { try { localStorage.setItem(LOCK_FAIL_KEY, JSON.stringify(o)); } catch (e) {} }
    var _lfs = _lockFailState();
    var __lockFailCount = _lfs.n;
    var __lockLockUntil = _lfs.until;
    var __bioPrompting = false;

    function renderLockDots() {
      var box = document.getElementById('lockDots');
      if (!box) return;
      var html = '';
      for (var i = 0; i < __lockPinLen; i++) {
        html += '<div class="lock-dot' + (i < __lockPinBuffer.length ? ' filled' : '') + '"></div>';
      }
      box.innerHTML = html;
    }
    function setPinEyeState(inp, btn, show) {
      if (!inp || !btn) return;
      var off = btn.querySelector('.eye-off');
      var on = btn.querySelector('.eye-open');
      if (show) {
        inp.classList.add('show-pin');
        if (off) off.style.display = 'none';
        if (on) on.style.display = '';
      } else {
        inp.classList.remove('show-pin');
        if (off) off.style.display = '';
        if (on) on.style.display = 'none';
      }
      btn.classList.toggle('on', !!show);
    }
    function resetPinEyeHidden(inputId, btnId) {
      setPinEyeState(document.getElementById(inputId), document.getElementById(btnId), false);
    }
    /* یک بار برای همیشه — از اولین باز شدن کار می‌کند */
    if (!window.__pinEyeDelegated) {
      window.__pinEyeDelegated = true;
      document.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest && e.target.closest('#lockPinEye, #pinSetupEye');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var inpId = (btn.id === 'lockPinEye') ? 'lockPinInput' : 'pinSetupInput';
        var inp = document.getElementById(inpId);
        if (!inp) return;
        var show = !inp.classList.contains('show-pin');
        setPinEyeState(inp, btn, show);
        try { inp.focus({ preventScroll: true }); } catch (err) {}
      }, true);
    }
    function bindLockPinInput() {
      var inp = document.getElementById('lockPinInput');
      var dots = document.getElementById('lockDots');
      if (!inp) return;
      resetPinEyeHidden('lockPinInput', 'lockPinEye');
      if (inp.dataset.bound) return;
      inp.dataset.bound = '1';
      inp.addEventListener('input', function() {
        var v = String(inp.value || '').replace(/\D/g, '');
        if (v.length > __lockPinLen) v = v.slice(0, __lockPinLen);
        if (inp.value !== v) inp.value = v;
        __lockPinBuffer = v;
        renderLockDots();
        var msg = document.getElementById('lockMsg');
        if (msg && v.length) msg.textContent = '';
        if (v.length === __lockPinLen) {
          onLockPinComplete(v);
        }
      });
      if (dots) {
        dots.addEventListener('click', function() {
          try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
        });
      }
    }
    async function onLockPinComplete(pin) {
      if (Date.now() < __lockLockUntil) {
        var left = Math.ceil((__lockLockUntil - Date.now()) / 1000);
        var msg = document.getElementById('lockMsg');
        if (msg) msg.textContent = 'لطفاً ' + left + ' ثانیه صبر کنید';
        return;
      }
      var ok = await lockVerifyPin(pin);
      var inp = document.getElementById('lockPinInput');
      if (ok) {
        __lockFailCount = 0;
        _lockFailSave({ n: 0, until: 0, rounds: 0 });
        __lockUnlockedThisSession = true;
        try { lockNoteUserActivity(); } catch (eAct0) {}
        __lockPinBuffer = '';
        if (inp) inp.value = '';
        showAppLockOverlay(false);
        try { ensurePeriodSelectListsAttached(); } catch (eE) {}
        return;
      }
      __lockFailCount++;
      var _st = _lockFailState(); _st.n = __lockFailCount; _lockFailSave(_st);
      var box = document.getElementById('lockDots');
      if (box) {
        Array.prototype.forEach.call(box.children, function(el){ el.classList.add('error'); });
      }
      var msg = document.getElementById('lockMsg');
      if (__lockFailCount >= 5) {
        /* ۳۰ ثانیه، ۲ دقیقه، ۵ دقیقه، ۱۵ دقیقه، سپس هر بار ۳۰ دقیقه */
        var _st2 = _lockFailState(); var steps = [30, 120, 300, 900, 1800];
        var secs = steps[Math.min(_st2.rounds, steps.length - 1)];
        __lockLockUntil = Date.now() + secs * 1000;
        __lockFailCount = 0;
        _lockFailSave({ n: 0, until: __lockLockUntil, rounds: _st2.rounds + 1 });
        if (msg) msg.textContent = 'تلاش زیاد — ' + toPersianDigits(Math.ceil((__lockLockUntil - Date.now()) / 1000)) + ' ثانیه صبر کنید';
      } else if (msg) {
        msg.textContent = 'رمز نادرست است';
      }
      setTimeout(function() {
        __lockPinBuffer = '';
        if (inp) inp.value = '';
        renderLockDots();
        try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
      }, 350);
    }
    async function tryBiometricUnlock() {
      if (__bioPrompting) return;
      var p = getAppLockPlugin();
      if (!p || !p.authenticateBiometric) return;
      __bioPrompting = true;
      var hint = document.getElementById('lockBioHint');
      if (hint) hint.style.display = 'block';
      try {
        var r = await p.authenticateBiometric({
          title: 'ورود به حساب‌کتاب',
          subtitle: 'چهره یا اثرانگشت خود را تأیید کنید'
        });
        if (r && r.ok) {
          __lockUnlockedThisSession = true;
        try { lockNoteUserActivity(); } catch (eAct0) {}
          __lockFailCount = 0;
          try { _lockFailSave({ n: 0, until: 0, rounds: 0 }); } catch (eLf) {}
          showAppLockOverlay(false);
        } else {
          var msg = document.getElementById('lockMsg');
          if (msg) msg.textContent = 'رمز را وارد کنید';
          var inp = document.getElementById('lockPinInput');
          try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
        }
      } catch (e) {
        var msg2 = document.getElementById('lockMsg');
        if (msg2) msg2.textContent = 'رمز را وارد کنید';
      } finally {
        __bioPrompting = false;
        if (hint) hint.style.display = 'none';
      }
    }
    async function presentLockScreen() {
      try { closeFloatingMenusForLock(); } catch (e0) {}
      try {
        document.querySelectorAll('.sec-autolock-list.open').forEach(function(el) {
          try { el.classList.remove('open'); el.hidden = true; } catch (e2) {}
        });
      } catch (e3) {}
      __lockPinLen = await lockGetPinLength();
      __lockPinBuffer = '';
      bindLockPinInput();
      renderLockDots();
      var msg = document.getElementById('lockMsg');
      if (msg) msg.textContent = '';
      var inp = document.getElementById('lockPinInput');
      if (inp) {
        inp.value = '';
        inp.maxLength = __lockPinLen;
        inp.classList.remove('show-pin');
        inp.type = 'tel';
        var eyeBtn = document.getElementById('lockPinEye');
        if (eyeBtn) {
          var off = eyeBtn.querySelector('.eye-off');
          var on = eyeBtn.querySelector('.eye-open');
          if (off) off.style.display = '';
          if (on) on.style.display = 'none';
          eyeBtn.classList.remove('on');
        }
      }
      var bioOn = await lockIsBiometricEnabled();
      var canBio = await lockCanBiometric();
      var hint = document.getElementById('lockBioHint');
      var bioBtn = document.getElementById('lockBioBtn');
      showAppLockOverlay(true);
      /* همیشه کیبورد عددی سیستم را بالا بیاور */
      setTimeout(function() {
        try { inp && inp.focus({ preventScroll: true }); } catch (e) { try { inp && inp.focus(); } catch (e2) {} }
      }, 80);
      setTimeout(function() {
        try { inp && inp.focus({ preventScroll: true }); } catch (e) {}
      }, 320);
      if (bioOn && canBio) {
        if (bioBtn) bioBtn.style.display = 'block';
        if (hint) {
          hint.style.display = 'block';
          hint.textContent = 'در حال احراز هویت…';
        }
        /* بیومتریک خودکار؛ در صورت موفقیت مستقیم وارد نرم‌افزار */
        setTimeout(function(){ tryBiometricUnlock(); }, 250);
      } else {
        if (bioBtn) bioBtn.style.display = 'none';
        if (hint) hint.style.display = 'none';
      }
    }
    /* قفل برنامه روشن ⇒ اسکرین‌شات و پیش‌نمایش «برنامه‌های اخیر» مسدود (FLAG_SECURE) */
    function syncSecureFlag(on) {
      try { var C = window.Capacitor, P = C && C.Plugins && C.Plugins.AppChrome; if (P && P.setSecure) P.setSecure({ on: !!on }).catch(function () {}); } catch (e) {}
    }
    try { document.addEventListener('visibilitychange', function () { if (!document.hidden) lockIsEnabled().then(syncSecureFlag).catch(function () {}); }); } catch (eSF) {}
    async function ensureAppUnlocked() {
      try {
        var on = await lockIsEnabled();
        syncSecureFlag(on);
        if (!on) {
          showAppLockOverlay(false);
          return true;
        }
        /* APP_EXIT از نشست قبلی */
        try {
          if (localStorage.getItem('hk_lock_app_exit') === '1') {
            localStorage.removeItem('hk_lock_app_exit');
            __lockUnlockedThisSession = false;
          }
        } catch (eX) {}
        /* DEVICE_LOCK از قبل از کشته شدن پروسس */
        try {
          if (await lockConsumeDeviceLockedFlag()) {
            __lockUnlockedThisSession = false;
          }
        } catch (eD) {}
        if (__lockUnlockedThisSession) {
          showAppLockOverlay(false);
          return true;
        }
        await presentLockScreen();
        return false;
      } catch (e) {
        showAppLockOverlay(false);
        return true;
      }
    }

    function promptPinFlow(opts) {
      opts = opts || {};
      return new Promise(function(resolve, reject) {
        var ov = document.getElementById('pinSetupOverlay');
        var title = document.getElementById('pinSetupTitle');
        var hint = document.getElementById('pinSetupHint');
        var inp = document.getElementById('pinSetupInput');
        var ok = document.getElementById('pinSetupOk');
        var cancel = document.getElementById('pinSetupCancel');
        if (!ov || !inp) { reject(new Error('no ui')); return; }
        __pinSetupState = { mode: opts.mode || 'new', step: 0, temp: '', resolve: resolve, reject: reject, pinLen: opts.pinLen || 0 };
        function focusPinSetupInput() {
          setTimeout(function() {
            try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
          }, 60);
          setTimeout(function() {
            try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
          }, 220);
        }
        function setStepUI() {
          var st = __pinSetupState;
          inp.value = '';
          if (st.mode === 'current') {
            title.textContent = 'ورود رمز فعلی';
            hint.textContent = 'رمز فعلی (۴ تا ۶ رقم) را وارد کنید';
          } else if (st.mode === 'new' && st.step === 0) {
            title.textContent = 'تعیین رمز جدید';
            hint.textContent = 'یک رمز ۴ تا ۶ رقمی وارد کنید';
          } else if (st.mode === 'new' && st.step === 1) {
            title.textContent = 'تکرار رمز';
            hint.textContent = 'رمز را دوباره وارد کنید';
          } else if (st.mode === 'change_current') {
            title.textContent = 'رمز فعلی';
            hint.textContent = 'برای تغییر رمز، رمز فعلی را وارد کنید';
          }
          resetPinEyeHidden('pinSetupInput', 'pinSetupEye');
          if (inp) {
            inp.classList.remove('show-pin');
            inp.type = 'tel';
          }
          focusPinSetupInput();
        }
        setStepUI();
        ov.classList.add('show');
        focusPinSetupInput();
        ok.onclick = async function() {
          var v = String(inp.value || '').replace(/\D/g, '');
          var st = __pinSetupState;
          if (!st) return;
          if (st.mode === 'current' || st.mode === 'change_current') {
            if (v.length < 4 || v.length > 6) { showToast('رمز باید ۴ تا ۶ رقم باشد'); return; }
            var okv = await lockVerifyPin(v);
            if (!okv) { showToast('رمز نادرست است'); return; }
            ov.classList.remove('show');
            var res = st.resolve;
            __pinSetupState = null;
            res({ ok: true, pin: v });
            return;
          }
          if (st.mode === 'new' && st.step === 0) {
            if (v.length < 4 || v.length > 6) { showToast('رمز باید ۴ تا ۶ رقم باشد'); return; }
            st.temp = v;
            st.step = 1;
            setStepUI();
            return;
          }
          if (st.mode === 'new' && st.step === 1) {
            if (v !== st.temp) { showToast('رمزها یکسان نیستند'); st.step = 0; setStepUI(); return; }
            ov.classList.remove('show');
            var res2 = st.resolve;
            var pin = st.temp;
            __pinSetupState = null;
            res2({ ok: true, pin: pin });
          }
        };
        cancel.onclick = function() {
          ov.classList.remove('show');
          var rej = __pinSetupState && __pinSetupState.reject;
          __pinSetupState = null;
          if (rej) rej(new Error('cancel'));
        };
      });
    }

    async function openSecurityModal() {
      try { closeSideMenu(); } catch (e) {}
      var modal = document.getElementById('securityModal');
      if (!modal) return;
      modal.classList.add('open');
      try { bindSecAutoLockDropdown(); } catch (e) {}
      await refreshSecurityModal();
    }
    function closeSecurityModal() {
      var modal = document.getElementById('securityModal');
      if (modal) modal.classList.remove('open');
      try { document.body.style.overflow = ''; } catch (e) {}
      try {
        var bd = document.getElementById('darkSelectBackdrop');
        if (bd) bd.style.display = 'none';
      } catch (e2) {}
    }
    async function refreshSecurityModal() {
      var enabled = await lockIsEnabled();
      var bioOn = await lockIsBiometricEnabled();
      var canBio = await lockCanBiometric();
      var autoSec = await lockGetAutoLockSeconds();
      var st = document.getElementById('secStatusText');
      if (st) {
        st.textContent = enabled
          ? ('قفل برنامه روشن است' + (bioOn ? ' · اثرانگشت فعال' : ''))
          : 'قفل برنامه خاموش است';
      }
      var sel = document.getElementById('secAutoLockSelect');
      if (sel) sel.value = String(autoSec);
      try { updateSecAutoLockUI(String(autoSec)); } catch (eA) {}
      var act = document.getElementById('secActions');
      if (!act) return;
      act.innerHTML = '';
      if (!enabled) {
        var b1 = document.createElement('button');
        b1.className = 'sec-btn-primary';
        b1.textContent = 'فعال کردن قفل برنامه';
        b1.onclick = enableAppLockFlow;
        act.appendChild(b1);
      } else {
        var bCh = document.createElement('button');
        bCh.className = 'sec-btn-secondary';
        bCh.textContent = 'تغییر رمز';
        bCh.onclick = changePinFlow;
        act.appendChild(bCh);
        if (canBio) {
          var bBio = document.createElement('button');
          bBio.className = 'sec-btn-secondary';
          bBio.textContent = bioOn ? 'غیرفعال کردن اثرانگشت' : 'فعال کردن اثرانگشت';
          bBio.onclick = async function() {
            if (!bioOn) {
              try {
                var p = getAppLockPlugin();
                if (p && p.authenticateBiometric) {
                  var r = await p.authenticateBiometric({ title: 'تأیید اثرانگشت', subtitle: 'برای فعال‌سازی' });
                  if (!(r && r.ok)) { showToast('احراز هویت ناموفق'); return; }
                }
              } catch (e) { showToast('اثرانگشت در دسترس نیست'); return; }
            }
            await lockSetBiometric(!bioOn);
            showToast(bioOn ? 'اثرانگشت خاموش شد' : 'اثرانگشت فعال شد');
            refreshSecurityModal();
          };
          act.appendChild(bBio);
        }
        var bOff = document.createElement('button');
        bOff.className = 'sec-btn-danger';
        bOff.textContent = 'غیرفعال کردن قفل برنامه';
        bOff.onclick = disableAppLockFlow;
        act.appendChild(bOff);
      }
    }
    async function enableAppLockFlow() {
      try {
        var r = await promptPinFlow({ mode: 'new' });
        if (!r || !r.pin) return;
        await lockSetPin(r.pin);
        await lockSetBiometric(false);
        showToast('قفل برنامه فعال شد');
        __lockUnlockedThisSession = true;
        await refreshSecurityModal();
      } catch (e) {}
    }
    async function changePinFlow() {
      try {
        await promptPinFlow({ mode: 'change_current' });
        var r = await promptPinFlow({ mode: 'new' });
        if (!r || !r.pin) return;
        await lockSetPin(r.pin);
        showToast('رمز با موفقیت تغییر کرد');
        await refreshSecurityModal();
      } catch (e) {}
    }
    async function disableAppLockFlow() {
      try {
        await promptPinFlow({ mode: 'current' });
        await lockDisable();
        __lockUnlockedThisSession = true;
        showToast('قفل برنامه خاموش شد');
        await refreshSecurityModal();
      } catch (e) {}
    }
        var SEC_AUTO_LABELS = { '0': 'بلافاصله', '30': 'بعد از ۳۰ ثانیه', '120': 'بعد از ۲ دقیقه', '300': 'بعد از ۵ دقیقه' };
    function updateSecAutoLockUI(val) {
      val = String(val == null ? '0' : val);
      if (val === '60') val = '120';
      var hid = document.getElementById('secAutoLockSelect');
      var lab = document.getElementById('secAutoLockLabel');
      var list = document.getElementById('secAutoLockList');
      if (hid) hid.value = val;
      if (lab) lab.textContent = SEC_AUTO_LABELS[val] || SEC_AUTO_LABELS['0'];
      if (list) {
        Array.prototype.forEach.call(list.querySelectorAll('.sec-autolock-opt'), function(b) {
          b.classList.toggle('selected', b.getAttribute('data-v') === val);
        });
      }
    }
    function closeSecAutoLockList() {
      var list = document.getElementById('secAutoLockList');
      var btn = document.getElementById('secAutoLockBtn');
      if (list) { list.classList.remove('open'); list.hidden = true; }
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function bindSecAutoLockDropdown() {
      var wrap = document.getElementById('secAutoLockWrap');
      var btn = document.getElementById('secAutoLockBtn');
      var list = document.getElementById('secAutoLockList');
      if (!wrap || !btn || !list || wrap.dataset.bound) return;
      wrap.dataset.bound = '1';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = list.classList.contains('open');
        if (open) closeSecAutoLockList();
        else {
          list.hidden = false;
          list.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
      list.addEventListener('click', function(e) {
        var opt = e.target && e.target.closest && e.target.closest('.sec-autolock-opt');
        if (!opt) return;
        e.preventDefault();
        e.stopPropagation();
        var v = opt.getAttribute('data-v') || '0';
        updateSecAutoLockUI(v);
        closeSecAutoLockList();
        onAutoLockChange();
      });
      document.addEventListener('click', function(e) {
        if (!wrap.contains(e.target)) closeSecAutoLockList();
      });
    }
    async function onAutoLockChange() {
      var sel = document.getElementById('secAutoLockSelect');
      if (!sel) return;
      var v = parseInt(String(sel.value || '0'), 10);
      if (isNaN(v) || v < 0) v = 0;
      await lockSetAutoLockSeconds(v);
      try { __lockBgTs = 0; } catch (eB) {}
      try { lockNoteUserActivity(); } catch (eA) {}
      var check = await lockGetAutoLockSeconds();
      try { updateSecAutoLockUI(String(check)); } catch (eU) {}
      var label = check === 0 ? 'بلافاصله' : (check === 30 ? '۳۰ ثانیه' : (check === 120 ? '۲ دقیقه' : (check === 300 ? '۵ دقیقه' : (check + ' ثانیه'))));
      showToast('قفل خودکار: ' + label);
    }

    /**
     * سه علت مستقل قفل (هرگز با onPause خالی قاطی نشوند):
     *   DEVICE_LOCK — فقط خاموش/قفل شدن صفحه گوشی (flag نیتیو)
     *   TIMEOUT     — فقط اگر sec>0 و elapsed >= sec
     *   APP_EXIT    — فقط خروج با دبل‌بک (localStorage) یا cold start بدون نشست باز
     * تعویض برنامه با صفحه روشن → فقط timestamp؛ بدون قفل.
     */
    /**
     * قفل — سه علت کاملاً مستقل:
     *
     * DEVICE_LOCK  فقط با SCREEN_OFF نیتیو (flag در SharedPreferences)
     *              onPause / visibility / تعویض برنامه به تنهایی هرگز قفل نمی‌کنند
     *
     * APP_EXIT     فقط با Double-Back → doAppExit (localStorage hk_lock_app_exit)
     *
     * TIMEOUT      فقط بی‌فعالیتی داخل خود نرم‌افزار (آخرین لمس/کلیک)
     *              رفتن به برنامهٔ دیگر زمان Timeout را به‌عنوان «خروج» حساب نمی‌کند
     */
    var __lockLastActivityTs = Date.now();
    var __lockIdleTimer = null;

    function lockNoteUserActivity() {
      __lockLastActivityTs = Date.now();
    }

    function bindAppLockLifecycle() {
      if (window._appLockLifecycleBound) return;
      window._appLockLifecycleBound = true;

      /* ردیابی فعالیت کاربر فقط وقتی نرم‌افزار در پیش‌زمینه است */
      try {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function(ev) {
          document.addEventListener(ev, function() {
            try {
              if (document.visibilityState === 'visible') lockNoteUserActivity();
            } catch (e) {}
          }, true);
        });
      } catch (eAct) {}

      async function lockForReason(reason) {
        try {
          var on = await lockIsEnabled();
          if (!on) return;
          __lockUnlockedThisSession = false;
          await presentLockScreen();
        } catch (e) {}
      }

      /** فقط DEVICE_LOCK از نیتیو — هیچ ربطی به background ندارد */
      async function checkDeviceLockReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          var was = false;
          try { was = await lockConsumeDeviceLockedFlag(); } catch (e) { was = false; }
          if (was) {
            await lockForReason('DEVICE_LOCK');
            return true;
          }
        } catch (e) {}
        return false;
      }

      /** فقط APP_EXIT */
      async function checkAppExitReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          var appExit = false;
          try {
            appExit = localStorage.getItem('hk_lock_app_exit') === '1';
            if (appExit) localStorage.removeItem('hk_lock_app_exit');
          } catch (e) { appExit = false; }
          if (appExit) {
            await lockForReason('APP_EXIT');
            return true;
          }
        } catch (e) {}
        return false;
      }

      var __lockBgTs = 0;

      function markBackgroundForTimeout() {
        __lockBgTs = Date.now();
      }

      /** TIMEOUT فقط وقتی نرم‌افزار در پس‌زمینه است (برنامهٔ دیگر / صفحه اصلی گوشی)
       * در حین کار با نرم‌افزار قفل نمی‌شود
       * sec===0 «بلافاصله»: هر برگشت از پس‌زمینه
       * sec>0: فقط اگر زمان پس‌زمینه >= sec
       */
      async function checkBackgroundTimeoutReason() {
        try {
          var on = await lockIsEnabled();
          if (!on) return false;
          if (!__lockUnlockedThisSession) return false;
          if (!__lockBgTs) return false;
          var sec = await lockGetAutoLockSeconds();
          var elapsed = (Date.now() - __lockBgTs) / 1000;
          if (sec === 0) {
            await lockForReason('TIMEOUT_IMMEDIATE');
            return true;
          }
          if (sec > 0 && elapsed >= sec) {
            await lockForReason('TIMEOUT');
            return true;
          }
        } catch (e) {}
        return false;
      }

      /**
       * resume:
       * 1) DEVICE_LOCK
       * 2) APP_EXIT
       * 3) TIMEOUT (زمان پس‌زمینه >= تنظیم کاربر)
       * تعویض برنامه کوتاه‌تر از timeout → قفل نمی‌شود
       */
      async function onAppForeground() {
        try {
          if (await checkDeviceLockReason()) return;
          if (await checkAppExitReason()) return;
          if (await checkBackgroundTimeoutReason()) return;
          __lockBgTs = 0;
          lockNoteUserActivity();
        } catch (e) {}
      }

      document.addEventListener('visibilitychange', async function() {
        try {
          if (document.visibilityState === 'hidden') {
            markBackgroundForTimeout();
          } else if (document.visibilityState === 'visible') {
            await onAppForeground();
          }
        } catch (e) {}
      }, true);

      try {
        var C = window.Capacitor, plugins = C && C.Plugins, App = plugins && plugins.App;
        if (App && App.addListener) {
          App.addListener('appStateChange', async function(state) {
            try {
              if (!state) return;
              if (!state.isActive) {
                markBackgroundForTimeout();
              } else {
                await onAppForeground();
              }
            } catch (e) {}
          });
          try {
            App.addListener('pause', function() { markBackgroundForTimeout(); });
          } catch (eP) {}
          try {
            App.addListener('resume', async function() { await onAppForeground(); });
          } catch (eR) {}
        }
      } catch (e) {}
    }

    // Gate app start: if lock off → no change; if on → overlay first
    (function initAppLockGate() {
      function run() {
        try { bindAppLockLifecycle(); } catch (e) {}
        try { ensureAppUnlocked(); } catch (e) {}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 30); });
      } else {
        setTimeout(run, 30);
      }
    })();

    // --- اتصال به پلاگین بومی BankSms (Capacitor) برای خواندن خودکار پیامک‌های بانکی ---
    (function () {
      function getPlugin() {
        const C = window.Capacitor;
        return C && C.Plugins && C.Plugins.BankSms;
      }
      let smsPollTimer = null;
      function pollPendingSms() {
        const BankSms = getPlugin();
        if (!BankSms) return;
        // تا چند پیامک پشت‌سرهم از صف نیتیو بخوان (حداکثر ۸ تا در هر دور)
        /* نسخهٔ جدید: همهٔ صف بدون حذف خوانده می‌شود؛ هر پیامک فقط وقتی کاربر آن را ثبت/رد کرد از صف نیتیو پاک می‌شود
           (قبلاً بلافاصله پاک می‌شد و اگر اندروید نرم‌افزار را می‌بست، پیامک برای همیشه گم می‌شد) */
        if (typeof BankSms.getAllPending === 'function') {
          BankSms.getAllPending().then(function (res) {
            var items = (res && res.items) || [];
            /* فقط پیامک‌هایی که در این نوبت تعیین تکلیف شده‌اند یا همین حالا باز/در صف‌اند رد می‌شوند؛
               پیامکی که باکسش بدون تصمیم بسته شد یا نمایش داده نشد، در بازگشت به نرم‌افزار دوباره نشان داده می‌شود */
            var done = window._hkDoneSmsNids || {};
            var live = {};
            try { if (pendingSmsEntry && pendingSmsEntry.nid) live[pendingSmsEntry.nid] = 1; smsPendingQueue.forEach(function (q) { if (q && q.nid) live[q.nid] = 1; }); } catch (eLv) {}
            items.forEach(function (it) {
              if (!it || !it.text) return;
              var nid = it.nid || 0;
              /* ۱.۳.۹۶: شرح از «ثبت سریع» آمده و اعلان هنوز ۳۰ ثانیه منتظر انتخاب دسته است → این نوبت دست نمی‌خورد تا دسته هم برسد */
              /* ۱.۳.۹۷: اول دسته زده شده و تا ۳۰ ثانیه می‌شود شرح هم نوشت؛ تا آن موقع صبر */
              if (it.quick && it.quickCat && it.quickWait && !it.quickOpen && Date.now() - it.quickWait < 30000) { setTimeout(function () { try { pollPendingSms(); } catch (eV) {} }, Math.max(500, 31000 - (Date.now() - it.quickWait))); return; }
              /* ۱.۳.۹۸: دکمه‌های دسته از اعلان برداشته شد؛ شرحِ ثبت سریع دیگر منتظر دسته نمی‌ماند (همان لحظه ثبت، دسته از روی شرح) */
              /* ۱.۳.۴۳: «ثبت» از خود اعلان برای پیامکی که همین الان در نرم‌افزار باز/در صف است */
              if (it.quick && nid && live[nid] && !done[nid]) { try { hkQuickApplyLive(nid, it.quickDesc || '', it.quickCat || '', !!it.quickOpen); } catch (eQ) {} return; }
              if (nid && (done[nid] || live[nid])) return;
              var ok = false;
              try { ok = window.onBankSmsReceived(it.text, { nid: nid, sender: it.sender || '', quick: !!it.quick, quickDesc: it.quickDesc || '', quickCat: it.quickCat || '', quickOpen: !!it.quickOpen }); } catch (e) {}
              /* تکراری/غیرتراکنش → از صف نیتیو هم برود */
              if (!ok && nid) { try { BankSms.markHandled({ nid: nid }).catch(function () {}); } catch (e2) {} }
            });
            if (!items.length) { try { cancelHandledSmsNotifications(); } catch (e3) {} }
          }).catch(function () {});
          return;
        }
        function pullOne(left) {
          if (left <= 0) return;
          BankSms.getPendingSms().then(function (res) {
            if (res && res.has && res.text) {
              try { window.onBankSmsReceived(res.text, { nid: res.nid || 0, sender: res.sender || '' }); } catch (e) {}
              BankSms.markHandled().then(function () { pullOne(left - 1); }).catch(function () { pullOne(left - 1); });
            } else {
              try { cancelHandledSmsNotifications(); } catch (e2) {}
            }
          }).catch(function () {});
        }
        pullOne(8);
      }
      function startSmsBridge() {
        try {
          const BankSms = getPlugin();
          if (!BankSms) return;
          // غیرمسدود: اول polling، بعداً permission
          try {
            if (smsPollTimer) clearInterval(smsPollTimer);
            smsPollTimer = setInterval(function () { try { pollPendingSms(); } catch (e) {} }, 4000);
            setTimeout(function () { try { pollPendingSms(); } catch (e) {} }, 800);
          } catch (e) {}
          setTimeout(function () {
            try {
              const p = BankSms.requestPermission && BankSms.requestPermission();
              if (p && typeof p.finally === 'function') {
                p.finally(function () {
                  try { pollPendingSms(); } catch (e) {}
                });
              } else if (p && typeof p.then === 'function') {
                p.then(function () { try { pollPendingSms(); } catch (e) {} }, function () {});
              }
            } catch (e) {}
          }, 1200);
        } catch (e) {}
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(startSmsBridge, 300);
      } else {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(startSmsBridge, 300); });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          pollPendingSms();
          /* صف داخلی منتظر مانده (مثلاً پیامک در پس‌زمینه رسید) → با آمدن نرم‌افزار، باکس ثبت نشان داده شود */
          setTimeout(function () { try { if (!isSmsConfirmOpen() && smsPendingQueue.length) processNextSmsInQueue(); } catch (e) {} }, 600);
        }
      });
    })();

    const BANK_NAME_MIGRATE = {
      'بانک ملی ایران': 'بانک ملی',
      'بانک صادرات ایران': 'بانک صادرات',
      'بانک توسعه صادرات ایران': 'بانک توسعه صادرات',
      'پست بانک ایران': 'پست بانک',
      'بانک ایران زمین': 'بانک ایران‌زمین',
      'بانک قرض‌الحسنه مهر ایران': 'بانک قرض‌الحسنه مهر'
    };
    function bankShortLabel(name) {
      if (name === 'بلوبانک') return 'بلو';
      let s = (name || '').replace(/^بانک\s+/, '');
      s = s.replace(/\s*ایران\s*/g, ' ').replace(/\s+/g, ' ').trim();
      return s;
    }
    let selectedBankAccounts = []; // آرایه رشته یا آبجکت {id,bank,label}
    let smsAccountBankMap = {};
    let trashItems = []; // {id, type, title, data, deletedAt}

    function accountLabel(acc) {
      if (!acc) return '';
      if (typeof acc === 'string') return acc;
      return (acc.label || acc.bank || '').trim();
    }
    function accountBank(acc) {
      if (!acc) return '';
      if (typeof acc === 'string') return acc;
      return (acc.bank || acc.label || '').trim();
    }
    function normalizeSelectedBanks() {
      // مهاجرت: رشته‌های قدیمی → آبجکت؛ اجازه چند حساب از یک بانک
      const out = [];
      const seenIds = new Set();
      (selectedBankAccounts || []).forEach((item, idx) => {
        if (!item) return;
        if (typeof item === 'string') {
          const label = migrateBankName(item);
          out.push({ id: 'ba_' + idx + '_' + Date.now().toString(36), bank: label, label: bankShortLabel(label) || label });
        } else if (typeof item === 'object') {
          const id = item.id || ('ba_' + idx + '_' + Math.random().toString(36).slice(2, 8));
          if (seenIds.has(id)) return;
          seenIds.add(id);
          const bank = migrateBankName(item.bank || item.label || '');
          const label = (item.label || bankShortLabel(bank) || bank).trim();
          if (!label) return;
          const ob = Number(item.openingBalance) || 0;
          var createdAt = null;
          try {
            if (item.createdAt && item.createdAt.y) {
              createdAt = {
                y: parseInt(item.createdAt.y, 10) || 0,
                m: parseInt(item.createdAt.m, 10) || 0,
                d: parseInt(item.createdAt.d, 10) || 0
              };
            }
          } catch (eC) { createdAt = null; }
          var _no = { id: id, bank: bank, label: label, openingBalance: ob, createdAt: createdAt };
          /* ۱.۳.۴۶: نام اصلیِ پیداشده در ثبت گروهی (برای پنجرهٔ تراکنش‌های حساب) */
          if (item.srcName) _no.srcName = String(item.srcName);
          out.push(_no);
        }
      });
      selectedBankAccounts = out;
    }
    function formatAccountCreatedDate(acc) {
      var y, m, d;
      try {
        if (acc && acc.createdAt && acc.createdAt.y) {
          y = parseInt(acc.createdAt.y, 10);
          m = parseInt(acc.createdAt.m, 10);
          d = parseInt(acc.createdAt.d, 10);
        }
      } catch (e) {}
      if (!y || !m || !d) return '';
      function pad(n) {
        n = String(n);
        return n.length < 2 ? ('0' + n) : n;
      }
      return toPersianDigits(String(y) + '/' + pad(m) + '/' + pad(d));
    }
    function selectedAccountLabels() {
      return (selectedBankAccounts || []).map(accountLabel).filter(Boolean);
    }

