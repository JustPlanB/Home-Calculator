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
        /* ۱.۳.۸۷: دنگ (جدا از حساب‌کتاب) */
        if (want('dong')) {
          try { var _dg = hkDongExport(); if (_dg) payload.dong = _dg; } catch (eDg) { bkWarn(payload, 'dong', eDg); }
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
