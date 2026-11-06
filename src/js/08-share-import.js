    /* ===== ۱.۳.۳۷: اشتراک‌گذاری عکس/PDF از برنامه‌های دیگر (رسید کارت‌به‌کارت در برنامهٔ بانک، گالری، …) مستقیم به پیوست یک ردیف =====
       اندروید فایل را کوچک می‌کند (عکس ضلع بلند ۱۶۰۰، JPEG؛ PDF = صفحهٔ اول به‌صورت عکس)؛ اینجا فقط ردیف انتخاب و پیوست ذخیره می‌شود */
    function hkTakeSharedAttachments() {
      var media = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.HkMedia) || null;
      if (!media || typeof media.takeShared !== 'function') return;
      var lk = document.getElementById('appLockOverlay');
      if ((lk && lk.classList.contains('show')) || document.getElementById('appTour')) { setTimeout(hkTakeSharedAttachments, 1200); return; }
      media.takeShared().then(function (res) {
        var items = (res && res.items) || [];
        if (items.length) hkOpenSharePicker(items);
        else if (res && res.failed) showToast('فایل اشتراکی خوانده نشد', 'warn');
      }).catch(function () {});
    }
    function hkShareRows() {
      var out = [];
      ['expense', 'income'].forEach(function (tab) {
        ((periodData[tab] && periodData[tab].sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || isLockedPlanRow(r) || !(Number(r.amount) > 0 || (r.desc || '').trim())) return;
            out.push({ tab: tab, sec: sec, row: r, d: parseInt(toEnglishDigits(String(r.day || '')), 10) || 0, t: r.time || '' });
          });
        });
      });
      /* تازه‌ترها بالا (روز و ساعت) */
      out.sort(function (a, b) { return (b.d - a.d) || (b.t < a.t ? -1 : b.t > a.t ? 1 : 0); });
      /* ۱.۳.۴۹: بعد از ماه جاری، ماه‌های قبل (تازه‌تر اول) برای دکمهٔ «بیشتر» */
      try {
        var cur = currentYear * 100 + currentMonth, keys = Object.keys(archive || {}).filter(function (k) { return /^\d+-\d+$/.test(k); })
          .map(function (k) { var p = k.split('-'); return { k: k, n: (+p[0]) * 100 + (+p[1]), m: +p[1] }; }).filter(function (o) { return o.n < cur; })
          .sort(function (a, b) { return b.n - a.n; });
        keys.forEach(function (o) {
          var pd = archive[o.k], part = [];
          ['expense', 'income'].forEach(function (tab) {
            ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
              (sec.rows || []).forEach(function (r) {
                if (!r || r.deletedAt || isLockedPlanRow(r) || !(Number(r.amount) > 0 || (r.desc || '').trim())) return;
                part.push({ tab: tab, sec: sec, row: r, d: parseInt(toEnglishDigits(String(r.day || '')), 10) || 0, t: r.time || '', m: o.m, arch: true });
              });
            });
          });
          part.sort(function (a, b) { return (b.d - a.d) || (b.t < a.t ? -1 : b.t > a.t ? 1 : 0); });
          out = out.concat(part);
        });
      } catch (eA) {}
      return out;
    }
    /* ۱.۳.۴۲: تراکنش‌های ثبت‌نشده برای پیوست رسید: منوی ثبتِ بازِ همین الان، صف پیامک‌های رسیده و «پیامک‌های ثبت‌نشده»؛
       تازه‌ترین (نزدیک‌ترین به لحظهٔ اشتراک‌گذاری) اول */
    function hkShareUnreg() {
      var out = [], seen = {};
      var push = function (src, e, x) {
        var raw = String((e && e.raw) || (x && x.raw) || '').trim(); if (!raw || seen[raw]) return; seen[raw] = 1;
        var pr = e && e.amount ? e : null; if (!pr) { try { pr = parseBankSms(raw); } catch (eP) {} }
        if (!pr || !pr.amount) return;
        var at = Number((e && (e.ts || e.date || e._laterAt)) || (x && x.at)) || 0;
        out.push({ src: src, e: e, x: x, raw: raw, pr: pr, at: at, time: hkSmsTime(raw, at) });
      };
      try { if (isSmsConfirmOpen() && pendingSmsEntry) push('open', pendingSmsEntry, null); } catch (e0) {}
      (smsPendingQueue || []).forEach(function (e) { push('queue', e, null); });
      smsLaterLoad().forEach(function (x) { push('later', null, x); });
      /* ترتیب با زمانِ خود تراکنش (روز و ساعت داخل پیامک)؛ تازه‌ترین اول */
      var key = function (u) { var hm = /^(\d\d):(\d\d)$/.exec(u.time || ''); return (parseInt(u.pr.month, 10) || 0) * 50000 + (parseInt(u.pr.day, 10) || 0) * 1440 + (hm ? +hm[1] * 60 + +hm[2] : 0); };
      var rest = out.filter(function (u) { return u.src !== 'open'; }).sort(function (a, b) { return (key(b) - key(a)) || (b.at - a.at); });
      return out.filter(function (u) { return u.src === 'open'; }).concat(rest);
    }
    function hkShareBlobs(items) {
      return items.map(function (x) {
        var bin = atob(x.data || ''), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return { blob: new Blob([u8], { type: x.mime || 'image/jpeg' }), pdf: !!x.pdf };
      });
    }
    /* رسید → منوی ثبت همان تراکنش (رسید زیر شرح؛ با «ثبت» هم تراکنش و هم پیوست ثبت می‌شود) */
    function hkShareToUnreg(u, items) {
      var add = function () {
        hkShareBlobs(items).forEach(function (b) { hkSmsAttAdd('img', b.blob, { src: b.pdf ? 'pdf' : 'share' }); });
        try { showToast('رسید زیر شرح پیوست شد؛ شرح را بنویسید و «ثبت» را بزنید'); } catch (e) {}
      };
      if (u.src === 'open' && isSmsConfirmOpen() && pendingSmsEntry === u.e) { add(); return; }
      if (u.src === 'queue') { var qi = smsPendingQueue.indexOf(u.e); if (qi >= 0) smsPendingQueue.splice(qi, 1); }
      /* منوی تراکنش دیگری باز است: آن تراکنش در «پیامک‌های ثبت‌نشده» می‌ماند */
      if (isSmsConfirmOpen()) closeSmsConfirmModal('later');
      if (u.src === 'later') smsLaterOpen(u.x);
      else { pendingSmsEntry = u.e; openSmsConfirmModal(u.e); }
      setTimeout(add, 120);
    }
    function hkOpenSharePicker(items) {
      var old = document.getElementById('hkShareOv'); if (old) old.remove();
      var rows = hkShareRows(), unreg = hkShareUnreg();
      var ov = document.createElement('div'); ov.id = 'hkShareOv'; ov.className = 'hk-bulk-ov hk-bulk-center';
      var nPdf = items.filter(function (x) { return x.pdf; }).length, nImg = items.length - nPdf;
      var what = [nImg ? toPersianDigits(String(nImg)) + ' عکس' : '', nPdf ? toPersianDigits(String(nPdf)) + ' PDF (صفحهٔ اول)' : ''].filter(Boolean).join(' و ');
      var size = items.reduce(function (t, x) { return t + Math.round((x.data || '').length * 3 / 4); }, 0);
      ov.innerHTML = '<div class="hk-bulk-box"><div class="hk-bulk-title">پیوست به کدام ردیف؟</div>' +
        '<div class="hk-bulk-hint">' + what + ' · حجم کم‌شده: ' + hkFmtSize(size) + '</div>' +
        (unreg.length ? '<div class="hk-share-sub">' + (unreg.length > 1 ? toPersianDigits(String(unreg.length)) + ' تراکنش ثبت‌نشده' : 'تراکنش ثبت‌نشده') + '</div><div class="hk-share-unreg">' + unreg.map(function (u, i) {
          var inc = u.pr.type === 'income', bank = String(u.pr.bank || '').replace(/^بانک\s*/, '');
          /* ۱.۳.۵۰: مثل ثبت‌شده‌ها: تاریخ، بعد «واریز/برداشت · بانک» و ساعت کوچک طوسی در پرانتز */
          var dD = parseInt(u.pr.day, 10) || 0, dM = parseInt(u.pr.month, 10) || 0;
          var dTxt = dD ? toPersianDigits(String(dD)) + ' ' + (MONTHS[(dM || currentMonth) - 1] || '') : '—';
          return '<button type="button" class="hk-share-row hk-share-u' + (i === 0 ? ' first' : '') + '" data-u="' + i + '"><span class="hk-sr-d">' + dTxt + '</span><span class="hk-sr-t">' + escapeHtml((inc ? 'واریز' : 'برداشت') + (bank ? ' · ' + bank : '')) + (u.time ? ' <small class="hk-sr-tm">(' + toPersianDigits(u.time) + ')</small>' : '') + '</span><span class="hk-sr-a ' + (inc ? 'inc' : 'exp') + '">' + formatNum(Number(u.pr.amount) || 0) + '</span></button>';
        }).join('') + '</div>' : '') +
        /* ۱.۳.۴۸/۴۹: «نگه دار…» و «ردیف تازه در مخارج» برداشته شد */
        '<div class="hk-share-sub">تراکنش‌های ثبت‌شده</div>' +
        '<div class="hk-bulk-list hk-share-list">' + (rows.length ? '' : '<div class="hk-bulk-hint">هنوز ردیفی ثبت نشده</div>') + '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-close">انصراف</button></div></div>';
      document.body.appendChild(ov);
      var close = function () { ov.remove(); };
      ov.querySelector('.hk-bulk-close').onclick = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var attach = function (row) {
        close();
        if (!Array.isArray(row.att)) row.att = [];
        var jobs = items.map(function (x) {
          var bin = atob(x.data || ''), u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          var blob = new Blob([u8], { type: x.mime || 'image/jpeg' }), id = HKAttach.newId();
          return HKAttach.put(id, blob).then(function () { row.att.push({ id: id, kind: 'img', size: blob.size, at: Date.now(), src: x.pdf ? 'pdf' : 'share' }); });
        });
        Promise.all(jobs).then(function () {
          try { persistCurrent(); scheduleSave(); } catch (e) {}
          try { renderAll(); } catch (e2) {}
          showToast(toPersianDigits(String(items.length)) + ' پیوست اضافه شد');
          openRowAttachments(row, function () { try { renderAll(); } catch (e3) {} });
        }).catch(function () { showToast('ذخیرهٔ پیوست ممکن نشد', 'warn'); });
      };
      /* ۱.۳.۴۹: همان ۴۰ ردیف اول؛ زیرش «بیشتر» برای قدیمی‌ترها (ماه‌های قبل هم) */
      var shareList = ov.querySelector('.hk-share-list'), shown = 0;
      var renderMore = function () {
        var oldMore = shareList.querySelector('.hk-more'); if (oldMore) oldMore.remove();
        var end = Math.min(rows.length, shown + 40), html = '';
        for (var i = shown; i < end; i++) {
          var x = rows[i], r = x.row, desc = (r.desc || '').trim() || 'بی‌شرح', mm = x.m || currentMonth;
          html += '<button type="button" class="hk-share-row" data-i="' + i + '"><span class="hk-sr-d">' + (x.d ? toPersianDigits(String(x.d)) + ' ' + MONTHS[mm - 1] : MONTHS[mm - 1]) + '</span><span class="hk-sr-t">' + escapeHtml(desc) + '</span><span class="hk-sr-a ' + (x.tab === 'income' ? 'inc' : 'exp') + '">' + (Number(r.amount) > 0 ? formatNum(Number(r.amount)) : '') + '</span></button>';
        }
        shareList.insertAdjacentHTML('beforeend', html);
        for (var j = shown; j < end; j++) (function (k) { var b = shareList.querySelector('.hk-share-row[data-i="' + k + '"]'); if (b) b.onclick = function () { var x = rows[k]; attach(x.row); if (x.arch) { try { saveArchive(); } catch (eS) {} } }; })(j);
        shown = end;
        if (shown < rows.length) {
          var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'hk-more'; mb.textContent = 'بیشتر (' + toPersianDigits(String(rows.length - shown)) + ')';
          mb.onclick = function (e) { e.stopPropagation(); renderMore(); };
          shareList.appendChild(mb);
        }
      };
      if (rows.length) renderMore();
      ov.querySelectorAll('.hk-share-u').forEach(function (b) { b.onclick = function () { close(); hkShareToUnreg(unreg[+b.getAttribute('data-u')], items); }; });
      if (ov.querySelector('.hk-share-keep')) ov.querySelector('.hk-share-keep').onclick = function () {
        close();
        hkRcptKeep(hkShareBlobs(items)).then(function () { showToast('رسید نگه داشته شد؛ با آمدن پیامک تراکنش، زیر شرح پیشنهاد می‌شود'); })
          .catch(function () { showToast('ذخیرهٔ رسید ممکن نشد', 'warn'); });
      };
      if (ov.querySelector('.hk-share-new')) ov.querySelector('.hk-share-new').onclick = function () {
        if (!periodData.expense) periodData.expense = { sections: [], nextId: 1 };
        var secs = periodData.expense.sections || (periodData.expense.sections = []);
        var sec = secs.find(function (x) { return x && (x.title || '').trim(); }) || secs[0];
        if (!sec) { sec = { id: 's1', title: (allPersonTitles()[0] || 'نام کاربر'), rows: [] }; secs.push(sec); }
        if (!Array.isArray(sec.rows)) sec.rows = [];
        var t = getTodayPersian(), row = emptyRow('expense');
        row.day = (t.y === currentYear && t.m === currentMonth) ? String(t.d) : '';
        row.status = 'paid'; row.createdAt = Date.now();
        try { if (typeof stampRowOwner === 'function') stampRowOwner(row); } catch (eS) {}
        var ei = sec.rows.findIndex(function (x) { return x && !x.desc && !x.amount && !x.day && !x.fromPlanId; });
        if (ei >= 0) sec.rows.splice(ei, 1);
        sec.rows.push(row);
        showToast('ردیف تازه در «' + (sec.title || '') + '» ساخته شد؛ مبلغ و شرحش را وارد کنید');
        attach(row);
      };
    }
    window.addEventListener('hkShareAttach', function () { setTimeout(hkTakeSharedAttachments, 300); });
    setTimeout(hkTakeSharedAttachments, 2400);
    /* پنجرهٔ پیوست‌های یک ردیف (با زدن شمارهٔ ردیف) */
    function openRowAttachments(row, onChange) {
      hkCloseAttach();
      if (!row) return;
      if (!Array.isArray(row.att)) row.att = [];
      var ov = document.createElement('div'); ov.id = 'hkAttachOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov._urls = [];
      ov.innerHTML = '<div class="hk-bulk-box hk-att-box">' +
        '<div class="hk-bulk-title">پیوست‌ها</div>' +
        '<div class="hk-att-sub"></div>' +
        '<div class="hk-att-list"></div>' +
        '<div class="hk-att-actions">' +
          '<label class="hk-att-btn hk-att-cam"><input type="file" accept="image/*" capture="environment" hidden>' + HK_ICON_CAM + '<span class="hk-att-lbl">دوربین</span></label>' +
          '<label class="hk-att-btn"><input type="file" accept="image/*" hidden>' + HK_ICON_GAL + '<span class="hk-att-lbl">گالری</span></label>' +
          '<button type="button" class="hk-att-btn hk-att-rec">' + HK_ICON_WAVE + '<span class="hk-att-lbl">صدا</span></button>' +
        '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-close">بستن</button></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('.hk-att-sub').textContent = (row.desc || '').trim() ? '«' + row.desc.trim() + '»' + (row.amount ? ' · ' + formatNum(Number(row.amount) || 0) : '') : '';
      var list = ov.querySelector('.hk-att-list');
      var changed = function () { try { scheduleSave(); } catch (e) {} try { if (onChange) onChange(); } catch (e2) {} };
      function draw() {
        ov._urls.forEach(function (u) { URL.revokeObjectURL(u); }); ov._urls = [];
        list.innerHTML = row.att.length ? '' : '<div class="hk-bulk-hint">هنوز پیوستی ندارد. عکس رسید یا فاکتور، یا یک یادداشت صوتی اضافه کنید.</div>';
        row.att.forEach(function (a) {
          var it = document.createElement('div'), isAud = a.kind === 'aud';
          it.className = 'hk-att-item' + (isAud ? ' aud' : '');
          if (isAud) {
            it.title = 'صدا' + (a.size ? ' · ' + hkFmtSize(a.size) : '');
            /* راست به چپ: نوار پخش، زمان، دکمهٔ آبی پخش، جداکننده، × حذف */
            it.innerHTML = '<div class="hk-aud-bar"><div class="hk-aud-fill"></div></div><span class="hk-aud-time"></span><button type="button" class="hk-aud-play" aria-label="پخش">' + HK_PLAY_SVG + '</button><span class="hk-aud-sep"></span><button type="button" class="hk-att-del" aria-label="حذف">×</button>';
          } else {
            it.innerHTML = '<div class="hk-att-media"></div><div class="hk-att-meta">عکس' + (a.size ? ' · ' + hkFmtSize(a.size) : '') + '</div><button type="button" class="hk-att-del" aria-label="حذف">×</button>';
          }
          list.appendChild(it);
          if (isAud) hkAudPill(it, a);
          HKAttach.get(a.id).then(function (blob) {
            if (!blob) { if (isAud) it.querySelector('.hk-aud-time').textContent = 'فایل پیدا نشد'; else it.querySelector('.hk-att-media').textContent = 'فایل پیدا نشد'; return; }
            var u = URL.createObjectURL(blob); ov._urls.push(u);
            if (isAud) { it._setSrc(u); return; }
            var m = it.querySelector('.hk-att-media');
            var im = document.createElement('img'); im.src = u; im.alt = ''; im.onclick = function () { hkViewImage(u); }; m.appendChild(im);
          }).catch(function () {});
          it.querySelector('.hk-att-del').onclick = function () {
            askConfirm('این پیوست حذف شود؟', function () {
              row.att = row.att.filter(function (x) { return x !== a; });
              HKAttach.del(a.id).catch(function () {});
              changed(); draw();
            });
          };
        });
      }
      /* از گرفتن/انتخاب عکس تا نمایش کوچکش: دایره‌ای که مرحله‌به‌مرحله آبی پر می‌شود */
      var ring = null;
      function ringShow(p) {
        if (!ring) {
          ring = document.createElement('div'); ring.className = 'hk-att-item hk-att-loading';
          ring.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" class="bg"/><circle cx="22" cy="22" r="18" class="fg"/></svg>';
          var hint = list.querySelector('.hk-bulk-hint'); if (hint) hint.remove();
          list.appendChild(ring);
        }
        var c = ring.querySelector('.fg'), L = 2 * Math.PI * 18;
        c.style.strokeDasharray = L; c.style.strokeDashoffset = L * (1 - Math.max(0, Math.min(1, p)));
      }
      function ringDone() { if (ring) { var r0 = ring; ring = null; ringShow0(r0); } }
      function ringShow0(r0) { var c = r0.querySelector('.fg'); c.style.strokeDashoffset = 0; setTimeout(function () { r0.remove(); }, 260); }
      function addBlob(kind, blob, extra) {
        var id = HKAttach.newId();
        if (kind === 'img') ringShow(0.75);
        return HKAttach.put(id, blob).then(function () {
          row.att.push(Object.assign({ id: id, kind: kind, size: blob.size, at: Date.now() }, extra || {}));
          if (kind === 'img') ringShow(0.92);
          changed();
          setTimeout(function () { ringDone(); draw(); }, kind === 'img' ? 280 : 0);
        }).catch(function () { if (ring) { ring.remove(); ring = null; } showToast('ذخیرهٔ پیوست ممکن نشد', 'warn'); });
      }
      function addImageFile(f, ready) {
        ringShow(0.15);
        setTimeout(function () { ringShow(0.35); }, 60);
        HKAttach.compressImage(f).then(function (b) { ringShow(0.6); return addBlob('img', b); })
          .catch(function () {
            /* عکسِ آمادهٔ اندروید (JPEG کوچک‌شده) یا JPEG/PNG معمولی: همان فایل ذخیره شود */
            if (ready || (/^image\/(jpeg|png|webp)$/i.test(f.type || '') && f.size < 6 * 1048576)) { ringShow(0.6); return addBlob('img', f); }
            if (ring) { ring.remove(); ring = null; }
            showToast('این عکس باز نشد (احتمالاً فرمت HEIC یا خیلی بزرگ). از «دوربین» یا عکس دیگری استفاده کنید', 'warn');
          });
      }
      function b64Blob(res) {
        var bin = atob(res.data), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: res.mime || 'image/jpeg' });
      }
      ov.querySelectorAll('input[type=file]').forEach(function (inp) {
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; inp.value = '';
          if (!f) return;
          addImageFile(f);
        };
      });
      /* گرفتن عکس: در نرم‌افزار اندروید مستقیم دوربین (افزونهٔ HkMedia)، نه گالری */
      var media = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.HkMedia) || null;
      var camLbl = ov.querySelector('.hk-att-cam');
      if (media && typeof media.takePhoto === 'function') {
        camLbl.addEventListener('click', function (e) {
          e.preventDefault();
          /* دایره فقط بعد از برگشتن عکس، نه پیش از باز شدن دوربین */
          media.takePhoto().then(function (res) {
            if (!res || !res.data) throw new Error('empty');
            addImageFile(b64Blob(res), true);
          }).catch(function (err) {
            if (ring) { ring.remove(); ring = null; }
            if (!/cancel/i.test(String((err && (err.message || err.code)) || ''))) showToast('دوربین باز نشد', 'warn');
          });
        });
      }
      /* انتخاب از گالری: در اندروید با انتخابگر خود نرم‌افزار (HEIC و عکس‌های خیلی بزرگ هم آنجا خوانده و کوچک می‌شوند) */
      var galLbl = ov.querySelectorAll('.hk-att-btn')[1];
      if (media && typeof media.pickImage === 'function' && galLbl) {
        galLbl.addEventListener('click', function (e) {
          e.preventDefault();
          media.pickImage().then(function (res) {
            if (!res || !res.data) throw new Error('empty');
            /* ۱.۳.۵۳: چند عکس انتخاب‌شده با هم */
            (res.items && res.items.length ? res.items : [res]).forEach(function (it) { addImageFile(b64Blob(it), true); });
          }).catch(function (err) {
            if (ring) { ring.remove(); ring = null; }
            if (!/cancel/i.test(String((err && (err.message || err.code)) || ''))) showToast('خواندن عکس ممکن نشد', 'warn');
          });
        });
      }
      /* ضبط صدا */
      var recBtn = ov.querySelector('.hk-att-rec'), rec = null, chunks = [], t0 = 0, tick = 0, stream = null;
      ov._stopRec = function (cancel) {
        if (!rec) return;
        rec._cancel = !!cancel;
        try { rec.stop(); } catch (e) {}
      };
      recBtn.onclick = function () {
        if (rec) { ov._stopRec(false); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { showToast('ضبط صدا روی این گوشی پشتیبانی نمی‌شود', 'warn'); return; }
        /* اول اجازهٔ میکروفون از اندروید (بار اول همان لحظه پرسیده می‌شود؛ اگر قبلاً داده شده، مستقیم ضبط) */
        var askMic = (media && typeof media.micPermission === 'function') ? media.micPermission() : Promise.resolve({ granted: true });
        askMic.then(function (pr) {
          if (pr && pr.granted === false) {
            if (pr.blocked && typeof media.openAppSettings === 'function') askConfirm('اجازهٔ میکروفون قبلاً رد شده است. تنظیمات مجوزهای نرم‌افزار باز شود؟', function () { media.openAppSettings().catch(function () {}); });
            else showToast('اجازهٔ میکروفون داده نشد', 'warn');
            return Promise.reject('denied');
          }
          return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (st) {
          stream = st; chunks = [];
          var mt = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
          try { rec = new MediaRecorder(st, mt ? { mimeType: mt, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); } catch (eR) { rec = new MediaRecorder(st); }
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () {
            var r0 = rec; rec = null; clearInterval(tick);
            try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (eS) {}
            recBtn.classList.remove('on'); recBtn.querySelector('.hk-att-lbl').textContent = 'صدا';
            if (r0._cancel || !chunks.length) return;
            var dur = (performance.now() - t0) / 1000;
            addBlob('aud', new Blob(chunks, { type: (r0.mimeType || mt || 'audio/webm').split(';')[0] }), { dur: dur });
          };
          rec.start(1000); t0 = performance.now();
          recBtn.classList.add('on');
          /* ۱.۳.۵۳: بالا «پایان ضبط»، زیرش تایمر؛ موج‌های آیکون بالا و پایین می‌روند */
          var upd = function () { var s2 = Math.floor((performance.now() - t0) / 1000); recBtn.querySelector('.hk-att-lbl').innerHTML = 'پایان ضبط<small class="hk-rec-tm">' + toPersianDigits(String(Math.floor(s2 / 60))) + ':' + toPersianDigits(String(s2 % 60).padStart(2, '0')) + '</small>'; if (s2 >= 300) ov._stopRec(false); };
          upd(); tick = setInterval(upd, 500);
          });
        }).catch(function (e) { if (e !== 'denied') showToast('میکروفون در دسترس نیست', 'warn'); });
      };
      ov.querySelector('.hk-bulk-close').onclick = hkCloseAttach;
      ov.addEventListener('click', function (e) { if (e.target === ov) hkCloseAttach(); });
      draw();
    }
    /* نمایش تمام‌صفحهٔ عکس پیوست: دو انگشت = بزرگ/کوچک، دو ضربه = زوم ۲ برابر/برگشت، کشیدن در حالت زوم = جابه‌جایی؛
       یک ضربه در حالت عادی یا دکمهٔ × = بستن */
    function hkViewImage(url) {
      var v = document.createElement('div'); v.id = 'hkImgView'; v.className = 'hk-img-view';
      v.innerHTML = '<img alt="" draggable="false"><button type="button" class="hk-img-x" aria-label="بستن">×</button>';
      var img = v.querySelector('img'); img.src = url;
      document.body.appendChild(v);
      var sc = 1, tx = 0, ty = 0, pts = {}, start = null, lastTap = 0, moved = false;
      var apply = function (anim) { img.style.transition = anim ? 'transform 0.22s ease' : 'none'; img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')'; };
      var clamp = function () {
        if (sc <= 1) { sc = 1; tx = 0; ty = 0; return; }
        var r = img.getBoundingClientRect(), w = r.width / sc, h = r.height / sc;
        var mx = Math.max(0, (w * sc - window.innerWidth) / 2), my = Math.max(0, (h * sc - window.innerHeight) / 2);
        tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
      };
      var close = function () { v.remove(); };
      v.querySelector('.hk-img-x').onclick = function (e) { e.stopPropagation(); close(); };
      v.addEventListener('pointerdown', function (e) {
        if (e.target.classList.contains('hk-img-x')) return;
        try { v.setPointerCapture(e.pointerId); } catch (eC) {}
        pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false;
        var ids = Object.keys(pts);
        if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; start = { d: Math.hypot(a.x - b.x, a.y - b.y), sc: sc, tx: tx, ty: ty, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
        else start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
      });
      v.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length === 2 && start && start.d) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
          sc = Math.max(1, Math.min(5, start.sc * d / start.d));
          tx = start.tx + ((a.x + b.x) / 2 - start.cx); ty = start.ty + ((a.y + b.y) / 2 - start.cy);
          moved = true; apply(false);
        } else if (ids.length === 1 && start && !start.d && sc > 1) {
          tx = start.tx + (e.clientX - start.x); ty = start.ty + (e.clientY - start.y);
          if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 6) moved = true;
          apply(false);
        } else if (start && !start.d && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 6) moved = true;
      });
      var up = function (e) {
        if (!pts[e.pointerId]) return;
        delete pts[e.pointerId];
        var left = Object.keys(pts).length;
        if (left === 1) { var k = Object.keys(pts)[0]; start = { x: pts[k].x, y: pts[k].y, tx: tx, ty: ty }; return; }
        if (left) return;
        clamp(); apply(true);
        if (moved) return;
        var now = Date.now();
        if (now - lastTap < 300) {
          /* دو ضربه: زوم ۲ برابر روی همان نقطه یا برگشت */
          if (sc > 1) { sc = 1; tx = 0; ty = 0; }
          else { sc = 2; tx = (window.innerWidth / 2 - e.clientX); ty = (window.innerHeight / 2 - e.clientY); clamp(); }
          apply(true); lastTap = 0;
        } else {
          lastTap = now;
          var t0 = now;
          setTimeout(function () { if (lastTap === t0 && sc <= 1 && v.isConnected) close(); }, 320);
        }
      };
      v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    }
    function closePersonDetail() {
      /* خروج از سرچ باکس: عبارت جستجو پاک و جدول مانده دوباره نمایش داده شود */
      try { resetBalanceSearch(); } catch (eRs) {}
      try { hkSearchCollapse(false); } catch (eSc0) {}
      try { setTimeout(() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} }, 30); } catch (e) {}
      _detailContext = null;
      try { document.body.classList.remove('detail-open'); document.body.classList.remove('search-open'); bsCloseMonthDetail(); } catch (e) {}
      try { if (typeof syncStickyChromeHeight === 'function') { syncStickyChromeHeight(); requestAnimationFrame(syncStickyChromeHeight); } } catch (eSc) {}
      const bar = document.getElementById('detailPageBar');
      if (bar) bar.style.display = 'none';
      currentTab = 'home';
      activatePanel('home');
      renderHomeCards();
      try {
        const t = getActiveHomeCardTitle();
        requestAnimationFrame(function(){ scrollHomeCardsToTitle(t, false); });
        setTimeout(function(){ scrollHomeCardsToTitle(t, false); }, 50);
      } catch (e) {}
    }



    function renderPersonDetailPanel(tab, title) {
      const container = document.getElementById(tab === 'income' ? 'sections-income' : 'sections-expense');
      if (!container) return;
      try {
        const sum = document.getElementById(tab === 'income' ? 'summaryBox-income' : 'summaryBox-expense');
        if (sum) sum.style.display = 'none';
        const addW = container.parentElement && container.parentElement.querySelector('.add-sec-wrap');
        if (addW) addW.style.display = 'none';
      } catch (e) {}

      const sec = findSectionByTitle(tab, title);
      try { hkApplyRowSort(sec); } catch (eSo) {}
      try {
        var _scrollKey = String(tab || '') + '|' + String(title || '');
        var _prevScrollEl = document.querySelector('.section-rows-scroll');
        if (_prevScrollEl && _prevScrollEl.isConnected) {
          var _st = _prevScrollEl.scrollTop || 0;
          /* همیشه وقتی >0 ذخیره کن تا بعد از edit/rerender پرش نکند */
          if (_st > 0) {
            window._detailRowScroll = window._detailRowScroll || {};
            window._detailRowScroll[_scrollKey] = _st;
            if (sec) {
              sec._rowScrollTop = _st;
              window._secRowScroll = window._secRowScroll || {};
              if (sec.id != null) window._secRowScroll[sec.id] = _st;
            }
          }
        }
      } catch (ePreScroll) {}

      if (!sec) return;
      sec.rows = sec.rows || [];
      try {
        sec.rows.sort((a, b) => {
          const da = dayNum(a), db = dayNum(b);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          /* ۱.۳.۵۵: جهت مرتب‌سازی از «شخصی‌سازی» (تاریخ جدید = بالا) */
          return ((da - db) || hkTimeCmp(a, b)) * hkSortDir();
        });
      } catch (e) {}

      const isIncome = tab === 'income';
      const paidLabel = isIncome ? 'دریافت شده' : 'پرداخت شده';
      const unpaidLabel = isIncome ? 'دریافت نشده' : 'پرداخت نشده';
      const sectionLabel = isIncome ? 'درآمد' : 'مخارج';

      function shortBankDisplay(name) {
        let s = (name || '').trim();
        if (!s) return '';
        try { s = bankShortLabel(s) || s; } catch (e) {}
        s = s.replace(/^بانک\s+/u, '').replace(/^بانک/u, '').trim();
        return s;
      }
      /* فهرست حساب‌ها = دقیقاً همان حساب‌های ساخته‌شده در «انتخاب حساب بانکی» (نه نام‌های قدیمی/حذف‌شده) */
      function listSelectableBanks() {
        const banks = [];
        const seen = new Set();
        try {
          selectedAccountLabels().forEach(function (lb) {
            lb = (lb || '').trim();
            if (!lb || seen.has(lb)) return;
            seen.add(lb);
            banks.push({ raw: lb, disp: lb });
          });
        } catch (e) {}
        return banks;
      }

                  try {
        var _fk = String(tab || '') + '|' + String(title || '');
        var _fe = document.querySelector('.section-rows-scroll');
        if (_fe && (_fe.scrollTop || 0) > 0) {
          var _fst = _fe.scrollTop;
          window._detailRowScroll = window._detailRowScroll || {};
          window._detailRowScroll[_fk] = _fst;
          if (sec) {
            sec._rowScrollTop = _fst;
            window._secRowScroll = window._secRowScroll || {};
            if (sec.id != null) window._secRowScroll[sec.id] = _fst;
          }
        }
      } catch (eForceScr) {}
      /* حفظ موقعیت اسکرول جدول جزئیات قبل از بازسازی (قبلاً روی کلاس دیگری ذخیره می‌شد و هر بازسازی جدول را به بالا می‌برد) */
      var _pdKey = String(tab || '') + '|' + String(title || '');
      var _pdSavedTop = 0, _pdPrevRows = null;
      try {
        window._pdRowsSeen = window._pdRowsSeen || {};
        if (window._pdResetScroll) {
          delete window._pdRowsSeen[_pdKey];
        } else {
          var _pdOldEl = container.querySelector('.person-detail-scroll');
          if (_pdOldEl && _pdOldEl._pdKey === _pdKey) _pdSavedTop = _pdOldEl.scrollTop || 0;
        }
        _pdPrevRows = window._pdRowsSeen[_pdKey] || null;
      } catch (ePdCap) {}
container.innerHTML = '';
      const page = document.createElement('div');
      page.className = 'person-detail-page';
      const box = document.createElement('div');
      box.className = 'person-detail-box';

      const sticky = document.createElement('div');
      sticky.className = 'person-detail-sticky';
      const head = document.createElement('div');
      head.className = 'person-detail-title';
      head.textContent = (title || '') + ' — ' + sectionLabel;
      sticky.appendChild(head);

      // thead table in sticky
      const headTable = document.createElement('table');
      headTable.className = 'person-detail-table';
      headTable.innerHTML =
        '<colgroup>' +
        '<col style="width:2.1em"><col style="width:2.4em"><col>' +
        '<col class="pd-col-amt" style="width:86px"><col style="width:20.5%"><col style="width:2em">' +
        '</colgroup>' +
        '<thead><tr>' +
        '<th>ردیف</th><th>روز</th><th>شرح</th><th>مبلغ</th><th>حساب</th><th class="pd-file-h">فایل</th>' +
        '</tr></thead>';
      sticky.appendChild(headTable);
      box.appendChild(sticky);

      const scroll = document.createElement('div');
      scroll.className = 'person-detail-scroll';
      const table = document.createElement('table');
      table.className = 'person-detail-table';
      table.innerHTML =
        '<colgroup>' +
        '<col style="width:2.1em"><col style="width:2.4em"><col>' +
        '<col class="pd-col-amt" style="width:86px"><col style="width:20.5%"><col style="width:2em">' +
        '</colgroup>';
      const tbody = document.createElement('tbody');

      function markFilled(el, filled) {
        if (!el) return;
        el.classList.toggle('pd-filled', !!filled);
      }
      function isFilledVal(v) {
        return v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== '0';
      }
      function rebuild() {
        renderPersonDetailPanel(tab, title);
        scheduleSave();
        try { renderHomeCards(); } catch (e) {}
      }
      function sortAndRebuild() {
        try {
          sec.rows.sort((a, b) => {
            const da = dayNum(a), db = dayNum(b);
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return (da - db || hkTimeCmp(a, b)) * hkSortDir();
          });
        } catch (e) {}
        rebuild();
      }

      /* هر روز به ترتیب ساعت تراکنش (ساعت از پیامک) */
      try { if (sec.rows.some(function (r) { return r && r.time; })) sec.rows = hkSortRunsByTime(sec.rows); } catch (eTs) {}
      sec.rows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        const fromPlan = !!(row.fromPlanId);
        /* قسط گذشته (قفل): کم‌رنگ با قفل و «پرداخت قبلی»؛ فقط برای دیدن (هیچ خانه‌ای ویرایش نمی‌شود، بانک ندارد) */
        const preApp = fromPlan && isLockedPlanRow(row);
        if (preApp) tr.classList.add('plan-preapp', 'plan-locked');
        const lockedMsg = function (el) { try { showCellTextPopup(el, 'قسط پرداخت‌شدهٔ قبلی — فقط برای دیدن؛ در جمع‌ها و موجودی حساب نمی‌شود'); } catch (eLm) {} };

        const tdN = document.createElement('td');
        tdN.className = 'pd-num-cell';
        const numSpan = document.createElement('span');
        numSpan.className = 'pd-num';
        numSpan.textContent = toPersianDigits(String(idx + 1));
        tdN.appendChild(numSpan);
        tr.appendChild(tdN);

        // روز — یک کلیک برای تایپ
        const tdDay = document.createElement('td');
        const dayInp = document.createElement('input');
        dayInp.type = 'text';
        dayInp.inputMode = 'numeric';
        dayInp.pattern = '[0-9]*';
        dayInp.setAttribute('enterkeyhint', 'next');
        dayInp.setAttribute('inputmode', 'numeric');
        dayInp.value = row.day ? toPersianDigits(String(row.day)) : '';
        dayInp.readOnly = isFilledVal(row.day);
        if (isFilledVal(row.day)) dayInp.classList.add('pd-filled');
        /* ردیف «اختلاف موجودی» (تطبیق با پیامک): پس‌زمینهٔ زرد؛ ۱.۳.۶۲: روز عادی و ویرایش زردی را برنمی‌دارد (فقط «ردیف معمولی» در لانگ‌پرس) */
        if (row.reconGap) tr.classList.add('recon-gap');
        dayInp.oninput = () => {
          if (row.reconGap) row.reconGapDayEdited = true;
          const eng = toEnglishDigits(dayInp.value).replace(/[^0-9]/g, '');
          dayInp.value = eng ? toPersianDigits(eng) : '';
        };
        dayInp.onclick = () => {
          if (preApp) { lockedMsg(dayInp); return; }
          if (!isFilledVal(row.day)) {
            dayInp.readOnly = false;
            try { dayInp.focus({ preventScroll: true }); } catch (e) { try { dayInp.focus(); } catch (e2) {} }
            return;
          }
          /* روز پر: فقط ساعت تراکنش در باکس شناور (روز خودش در خانه هست) */
          if (dayInp.readOnly && !row.reconGap) { try { showCellTextPopup(dayInp, row.time ? 'ساعت ' + toPersianDigits(row.time) : 'ساعت ثبت نشده'); } catch (eP) {} }
        };
        /* ۱.۳.۴۵: ویرایش با دوبار ضربه حذف شد (لانگ‌پرس روی ردیف → باکس ویرایش) */
        function commitDay() {
          if (preApp) return;
          const d = clampDayValue(dayInp.value);
          row.day = d || '';
          /* ردیف دستیِ امروز: ساعت همین لحظه (بعداً از باکس روز قابل تغییر است) */
          try {
            const tj = getTodayPersian();
            if (d && !row.time && !row.viaSms && !fromPlan && currentYear === tj.y && currentMonth === tj.m && parseInt(d, 10) === tj.d) {
              const nw = new Date(); row.time = ('0' + nw.getHours()).slice(-2) + ':' + ('0' + nw.getMinutes()).slice(-2);
            }
          } catch (eTm) {}
          dayInp.value = row.day ? toPersianDigits(String(row.day)) : '';
          dayInp.readOnly = isFilledVal(row.day);
          markFilled(dayInp, isFilledVal(row.day));
          try {
            sec.rows.sort((a, b) => {
              const da = dayNum(a), db = dayNum(b);
              if (!da && !db) return 0;
              if (!da) return 1;
              if (!db) return -1;
              return (da - db || hkTimeCmp(a, b)) * hkSortDir();
            });
          } catch (e) {}
          scheduleSave();
        }
        dayInp.onkeydown = (e) => {
          if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            e.stopPropagation();
            /* «بعدی»: همان لحظه خانهٔ بعد فعال می‌شود (بدون لحظهٔ بی‌فوکوس) تا صفحه‌کلید بسته و باز نشود؛
               ذخیرهٔ روز با رفتن فوکوس (onblur) انجام می‌شود */
            const dEl = tr.querySelector('textarea.pd-desc');
            if (dEl && !fromPlan) { hkMoveFocus(dEl); return; }
            commitDay();
          }
        };
        dayInp.onblur = () => { commitDay(); };
        tdDay.appendChild(dayInp);
        tr.appendChild(tdDay);

        // شرح
        const tdDesc = document.createElement('td');
        const desc = document.createElement('textarea');
        desc.className = 'pd-desc' + (isFilledVal(row.desc) ? ' pd-filled' : '');
        desc.rows = 1;
        desc.value = row.desc || '';
        desc.setAttribute('enterkeyhint', 'next');
        desc.readOnly = isFilledVal(row.desc) || fromPlan;
        if (fromPlan) {
          desc.title = 'از اقساط — قابل ویرایش نیست';
          desc.style.opacity = '0.85';
        }
        desc.onclick = (e) => {
          if (!isFilledVal(row.desc)) {
            if (fromPlan) {
              showToast('برای ویرایش، از بخش اقساط اقدام کنید');
              return;
            }
            desc.readOnly = false;
            try { desc.focus(); } catch (err) {}
            return;
          }
          // پر (حتی اقساط): باکس یک‌خطی با کل متن
          try { showCellTextPopup(desc, row.desc || ''); } catch (eP) {}
        };
        desc.onfocus = () => {
          if (fromPlan) return;
          if (!desc.readOnly) { desc.classList.add('pd-editing'); hkDescAutosize(desc); }
        };
        desc.addEventListener('input', () => { if (desc.classList.contains('pd-editing')) hkDescAutosize(desc); });
        hkAttachDescSuggest(desc, tab);
        desc._goNext = false;
        desc.onkeydown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const a = tr.querySelector('.pd-amt');
            if (a && !fromPlan) { hkMoveFocus(a); return; }
            desc._goNext = true;
            desc.blur();
          }
        };
        desc.onblur = () => {
          if (fromPlan) return;
          row.desc = desc.value || '';
          desc.classList.remove('pd-editing', 'pd-expanded');
          desc.style.height = '';
          desc.readOnly = isFilledVal(row.desc);
          markFilled(desc, isFilledVal(row.desc));
          scheduleSave();
          if (desc._goNext) {
            desc._goNext = false;
            setTimeout(() => {
              try {
                const a = tr.querySelector('.pd-amt');
                if (!a || fromPlan) return;
                a.readOnly = false;
                a.focus({ preventScroll: true });
              } catch (err) {}
            }, 30);
          }
        };
        tdDesc.appendChild(desc);
        if (preApp) { const tg = document.createElement('div'); tg.className = 'preapp-tag'; tg.innerHTML = HK_LOCK_SVG + '<span>پرداخت قبلی</span>'; tdDesc.appendChild(tg); }
        /* ۱.۳.۷۶: برچسب جدای قسط (شرح کاربر دست نمی‌خورد) */
        if (row.instTag) { const it = document.createElement('div'); it.className = 'preapp-tag hk-inst-tag'; it.textContent = row.instTag; tdDesc.appendChild(it); }
        tr.appendChild(tdDesc);

        // مبلغ
        const tdAmt = document.createElement('td');
        const amt = document.createElement('input');
        amt.className = 'pd-amt ' + ((row.status || 'paid') === 'paid' ? 'status-paid' : 'status-unpaid') + (isFilledVal(row.amount) ? ' pd-filled' : '');
        if (row.p2p) { tr.classList.add('hk-p2p-row'); tdAmt.classList.add('hk-p2p-td'); tdAmt.title = 'جیب به جیب — در جمع حساب نشده'; }
        amt.inputMode = 'numeric';
        try { amt.setAttribute('inputmode', 'numeric'); amt.setAttribute('enterkeyhint', 'done'); } catch (eAK) {}
        amt.pattern = '[0-9]*';
        amt.value = row.amount ? formatNum(row.amount) : '';
        amt.readOnly = isFilledVal(row.amount) || fromPlan;
        if (fromPlan) {
          amt.title = 'مبلغ اقساط قابل ویرایش نیست';
        }
        /* قسط قفل: مبلغ قسط فقط کم‌رنگ دیده می‌شود (مبلغ ردیف صفر است تا در هیچ جمعی نیاید) */
        if (preApp) { amt.value = row.planLockedAmt ? formatNum(row.planLockedAmt) : ''; amt.classList.add('pd-locked-amt'); amt.readOnly = true; }
        function applyAmtColor() {
          if (preApp) { ['color', '-webkit-text-fill-color'].forEach(function (k) { amt.style.setProperty(k, 'var(--muted, #8e8e93)', 'important'); }); return; }
          const paid = (row.status || 'paid') === 'paid';
          const theme = document.documentElement.getAttribute('data-theme') || 'dark';
          const green = theme === 'light' ? '#17834a' : '#9ee858';
          const red = theme === 'light' ? '#dc2626' : '#ff6b4a';
          /* ۱.۳.۴۸: پرداخت‌نشده و دریافت‌نشده زرد کمی تیره (جدا از نارنجیِ مخارج) */
          const deep = theme === 'light' ? '#a87a00' : '#e6b12c';
          const col = tab === 'income' ? (paid ? green : deep) : (paid ? red : deep);
          amt.classList.toggle('pd-unpaid-deep', !paid);
          amt.classList.toggle('status-paid', paid);
          amt.classList.toggle('status-unpaid', !paid);
          amt.style.setProperty('color', col, 'important');
          amt.style.setProperty('-webkit-text-fill-color', col, 'important');
          amt.style.setProperty('caret-color', col, 'important');
        }
        applyAmtColor();
        amt.setAttribute('enterkeyhint', 'next');
        amt._clickTimer = null;
        function beginAmountEdit() {
          if (fromPlan) {
            showToast('برای ویرایش، از بخش اقساط اقدام کنید');
            return;
          }
          if (amt._clickTimer) { clearTimeout(amt._clickTimer); amt._clickTimer = null; }
          document.querySelectorAll('.status-menu').forEach(m => { try { m.remove(); } catch (e2) {} });
          amt.readOnly = false;
          try { amt.focus(); caretToEnd(amt); } catch (err) {}
        }
        function openAmountStatusMenu(anchorCell, savedRect) {
          try {
            document.querySelectorAll('.status-menu').forEach(m => { try { m.remove(); } catch (e0) {} });
          } catch (e1) {}
          const menu = document.createElement('div');
          menu.className = 'status-menu';
          // استایل کامل و صریح — بدون وابستگی به CSS که ممکن است top/left را auto بگذارد
          menu.setAttribute('style',
            'position:fixed!important;z-index:99999!important;display:block!important;visibility:visible!important;opacity:1!important;' +
            'background:#1c1c1e;border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:6px 0;' +
            'min-width:150px;max-width:90vw;box-sizing:border-box;margin:0;transform:none;' +
            'box-shadow:0 8px 24px rgba(0,0,0,0.5);pointer-events:auto;'
          );
          [
            { v: 'paid', label: paidLabel, color: (document.documentElement.getAttribute('data-theme') === 'light' ? '#17834a' : '#9ee858') },
            { v: 'unpaid', label: unpaidLabel, color: '#ff6b4a' }
          ].forEach(opt => {
            const it = document.createElement('div');
            it.textContent = opt.label;
            it.setAttribute('style', 'padding:12px 16px;cursor:pointer;font-weight:700;color:' + opt.color + ';text-align:right;font-family:Vazirmatn,Tahoma,sans-serif;font-size:0.95rem;');
            it.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              row.status = opt.v;
              applyAmtColor();
              try { menu.remove(); } catch (e2) {}
              scheduleSave();
              try { renderHomeCards(); } catch (err) {}
            };
            menu.appendChild(it);
          });
          // اول به body بچسبان تا visible شود
          document.body.appendChild(menu);

          // محاسبه موقعیت کنار سلول
          function placeMenu() {
            let r = null;
            try {
              const el = (anchorCell && anchorCell.isConnected) ? anchorCell : (tdAmt && tdAmt.isConnected ? tdAmt : amt);
              if (el && el.getBoundingClientRect) {
                const live = el.getBoundingClientRect();
                if (live && live.width >= 1 && live.height >= 1) r = live;
              }
            } catch (e3) {}
            if (!r && savedRect && savedRect.width >= 1) r = savedRect;
            const menuW = Math.max(menu.offsetWidth || 0, 150);
            const menuH = Math.max(menu.offsetHeight || 0, 90);
            let top = 100, left = 20;
            if (r) {
              top = r.bottom + 6;
              left = r.right - menuW;
              if (top + menuH > window.innerHeight - 8) top = Math.max(8, r.top - menuH - 6);
            }
            if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
            if (left < 8) left = 8;
            if (top < 8) top = 8;
            menu.style.setProperty('top', Math.round(top) + 'px', 'important');
            menu.style.setProperty('left', Math.round(left) + 'px', 'important');
            menu.style.setProperty('right', 'auto', 'important');
            menu.style.setProperty('bottom', 'auto', 'important');
            menu.style.setProperty('position', 'fixed', 'important');
            menu.style.setProperty('z-index', '99999', 'important');
            menu.style.setProperty('display', 'block', 'important');
            menu.style.setProperty('visibility', 'visible', 'important');
            menu.style.setProperty('opacity', '1', 'important');
          }
          placeMenu();
          requestAnimationFrame(placeMenu);
          setTimeout(placeMenu, 0);

          const close = (ev) => {
            if (!menu.parentNode) {
              document.removeEventListener('mousedown', close, true);
              document.removeEventListener('touchstart', close, true);
              return;
            }
            if (menu.contains(ev.target)) return;
            if (ev.target === amt || ev.target === tdAmt || (tdAmt && tdAmt.contains && tdAmt.contains(ev.target))) return;
            try { menu.remove(); } catch (e4) {}
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('touchstart', close, true);
          };
          // تأخیر بیشتر تا کلیک/لمس فعلی منو را نبندد
          setTimeout(() => {
            document.addEventListener('mousedown', close, true);
            document.addEventListener('touchstart', close, true);
          }, 350);
        }
        amt.onclick = (e) => {
          if (preApp) { lockedMsg(amt); return; }
          if (fromPlan) return;
          if (!isFilledVal(row.amount)) {
            amt.readOnly = false;
            try { amt.focus(); } catch (err) {}
            return;
          }
          if (document.activeElement === amt && !amt.readOnly) return;
          /* ۱.۳.۴۷: یک ضربه = مبلغ کامل در یک خط داخل باکس شناور؛ تغییر وضعیت فقط از منوی ویرایش ردیف */
          try { if (amt.readOnly) { amt.blur(); amt.scrollLeft = 0; } } catch (eBl) {}
          if (document.querySelector('.pd-amt-popup')) { closeCellTextPopups(); return; }
          try { const pp = showCellTextPopup(tdAmt, formatNum(row.amount) + ' تومان'); if (pp) { pp.classList.add('pd-amt-popup'); const rr = pp.getBoundingClientRect(), vw = window.innerWidth; let lf = rr.left; if (lf + rr.width > vw - 8) lf = vw - rr.width - 8; if (lf < 8) lf = 8; pp.style.left = Math.round(lf) + 'px'; } } catch (eOpen) {}
        };
        amt.onfocus = () => {};
        amt.oninput = () => {
          if (fromPlan) return;
          const digits = toEnglishDigits(amt.value).replace(/[^0-9]/g, '');
          const n = digits ? parseInt(digits, 10) : 0;
          amt.value = n ? formatNum(n) : '';
        };
        amt.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            try { window._hkMenuOpenAt = Date.now() + 700; } catch (eT) {}
            amt.blur();
            /* «بعدی» روی مبلغ: منوی انتخاب بانک همین ردیف باز می‌شود و با بسته شدن صفحه‌کلید بسته نمی‌شود */
            try {
              const btn = tr.querySelector('.pd-acc-btn');
              if (btn) openPersonDetailAccountMenu(btn, row, () => { try { sortAndRebuild(); } catch (err) {} }, true);
            } catch (err) {}
          }
        };
        amt.onblur = () => {
          if (fromPlan) return;
          const n = parseAmount(amt.value);
          row.amount = n;
          if (n && !row.status) row.status = 'paid';
          amt.value = n ? formatNum(n) : '';
          amt.readOnly = !!n;
          markFilled(amt, !!n);
          applyAmtColor();
          scheduleSave();
          try { renderHomeCards(); } catch (e) {}
          // اگر فوکوس از ردیف خارج شد مرتب کن
          setTimeout(() => {
            try {
              const a = document.activeElement;
              if (a && tr.contains(a)) return;
              if (document.querySelector('.dark-select-list.open, .status-menu')) return;
              sortAndRebuild();
            } catch (err) {}
          }, 180);
        };
        tdAmt.appendChild(amt);
        tr.appendChild(tdAmt);

        // حساب — فقط شخصی‌سازی‌شده و پیامکی
        const tdAcc = document.createElement('td');
        const accBtn = document.createElement('button');
        accBtn.type = 'button';
        accBtn.className = 'pd-acc-btn' + (isFilledVal(row.account) ? ' pd-filled' : '') + ((Number(row.amount) || 0) > 0 && !(row.account || '').trim() ? ' acc-missing' : '');
        accBtn.textContent = row.account ? shortBankDisplay(row.account) : 'انتخاب';
        if (preApp) { accBtn.textContent = '—'; accBtn.classList.add('pd-acc-locked'); }
        accBtn.onclick = (e) => {
          e.stopPropagation();
          if (preApp) { lockedMsg(accBtn); return; }
          /* ۱.۳.۴۵: بانکِ ثبت‌شده فقط از باکس ویرایش عوض می‌شود؛ ردیف تازهٔ بی‌بانک همان منوی انتخاب */
          if ((row.account || '').trim()) { try { showCellTextPopup(accBtn, row.account); } catch (eP) {} return; }
          openPersonDetailAccountMenu(accBtn, row, () => { try { sortAndRebuild(); } catch (err) {} });
        };
        tdAcc.appendChild(accBtn);
        tr.appendChild(tdAcc);

        // فایل (پیوست: عکس / صدا، آزمایشی) — گیرهٔ خاکستری؛ با پیوست آبی
        const tdFile = document.createElement('td');
        tdFile.className = 'pd-file-cell';
        const fileBtn = document.createElement('button');
        fileBtn.type = 'button'; fileBtn.className = 'pd-file-btn'; fileBtn.setAttribute('aria-label', 'فایل'); fileBtn.innerHTML = HK_CLIP_SVG;
        const markAtt = function () { fileBtn.classList.toggle('has-att', Array.isArray(row.att) && row.att.length > 0); };
        markAtt();
        fileBtn.onclick = function (e) {
          e.stopPropagation();
          if (preApp && !(Array.isArray(row.att) && row.att.length)) { lockedMsg(fileBtn); return; }
          if (!row.amount && !row.desc) { showToast('اول ردیف را پر کنید'); return; }
          openRowAttachments(row, markAtt);
        };
        tdFile.appendChild(fileBtn);
        tr.appendChild(tdFile);

        /* ۱.۳.۴۵: ستون × حذف شد؛ لانگ‌پرس روی هر خانهٔ ردیف → ردیف مات و دو نیمه: × حذف | ✎ ویرایش */
        const deleteRow = () => {
          askConfirm('این ردیف به سطل زباله منتقل شود؟', () => {
            try {
              pushToTrash('row', (row.desc || title || 'ردیف') + (row.amount ? ' · ' + formatNum(row.amount) : ''), {
                tab: tab,
                sectionId: sec.id,
                sectionTitle: title,
                periodKey: periodKey(currentYear, currentMonth),
                row: JSON.parse(JSON.stringify(row)),
                sourceLabel: 'بخش ' + sectionLabel + ' / ' + title
              });
            } catch (e) {}
            const di = sec.rows.indexOf(row);
            if (di >= 0) sec.rows.splice(di, 1);
            rebuild();
            showToast('به سطل زباله منتقل شد');
          });
        };
        /* ۱.۳.۴۷: اقساط خاموش است؛ ردیف‌های قسطِ مانده از پشتیبان‌های قبلی هم با لانگ‌پرس حذف می‌شوند */
        hkBindRowLongPress(tr, () => {
          hkOpenRowActions(tr, {
            canDelete: true,
            onDelete: () => { deleteRow(); },
            onEdit: () => { if (preApp) { lockedMsg(tdDesc); return; } hkOpenRowEdit({ row: row, tab: tab, title: title, sec: sec, num: idx + 1, onSaved: sortAndRebuild, onAtt: markAtt }); },
            onNormal: row.reconGap ? () => { row.reconGap = false; row.updatedAt = Date.now(); tr.classList.remove('recon-gap'); try { persistCurrent(); } catch (eP) {} try { scheduleSave(); } catch (eS) {} } : null
          });
        });
        /* هایلایت ماژیکی پروژه روی ردیف جزئیات کارت */
        try {
          var fcRow = (typeof rowFinancialContext === 'function') ? rowFinancialContext(row) : (row && row.financialContext);
          if (fcRow && (fcRow.accountType === 'project' || fcRow.classification === 'third_party') &&
              fcRow.subjectId && fcRow.subjectId !== 'personal') {
            var subH = (typeof getSubjectById === 'function') ? getSubjectById(fcRow.subjectId) : null;
            var colorId = (subH && subH.highlightColor) || (row.financialContext && row.financialContext.highlightColor) || '';
            var metaH = (typeof getProjectHighlightMeta === 'function') ? getProjectHighlightMeta(colorId) : { bg: 'rgba(180,100,255,0.3)' };
            if (typeof applyProjectRowMarker === 'function') applyProjectRowMarker(tr, metaH.accent || '#d000ff');
            else {
              tr.classList.add('project-row-hl');
              tr.style.setProperty('--proj-accent', metaH.accent || '#d000ff');
            }
            tr.dataset.projectId = fcRow.subjectId;
          }
        } catch (eHlPd) {}
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      scroll.appendChild(table);
      box.appendChild(scroll);

      /* هم‌ترازی ستون هدر با بدنه — جبران عرض اسکرول‌بار */
      try {
        var syncPdCols = function() {
          var sb = Math.max(0, (scroll.offsetWidth || 0) - (scroll.clientWidth || 0));
          sticky.style.paddingLeft = sb + 'px';
          sticky.style.boxSizing = 'border-box';
          headTable.style.width = '100%';
          table.style.width = '100%';
        };
        syncPdCols();
        setTimeout(syncPdCols, 50);
        setTimeout(syncPdCols, 200);
        if (typeof ResizeObserver !== 'undefined') {
          try {
            var ro = new ResizeObserver(function() { syncPdCols(); });
            ro.observe(scroll);
          } catch (eRo) {}
        }
      } catch (eSync) {}

      const hint = document.createElement('div');
      hint.className = 'person-detail-hint';
      hint.textContent = 'برای ویرایش یا حذف، انگشت را روی ردیف نگه دارید';
      box.appendChild(hint);

      /* دکمه + : TAP=شخصی | کشیدن افقی=پروژه */
      var fabWrap = document.createElement('div');
      fabWrap.className = 'row-add-fab-wrap';
      fabWrap.innerHTML =
        '<div class="row-add-track" aria-hidden="true"><span class="row-add-track-label">پروژه</span>' +
          window.rowAddArrowSvg() + '</div>' +
        '<button type="button" class="row-add-fab" aria-label="افزودن ردیف">' +
          '<svg viewBox="0 0 24 24"><path class="fab-plus" d="M12 5v14M5 12h14"/><path class="fab-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
        '</button>';
      bindVerticalProjectAdd(fabWrap, {
        threshold: 100,
        onTap: function() {
          try {
            window._pdNewRowAt = Date.now();
            sec.rows.push(emptyRow(tab));
            rebuild();
          } catch (eR) {
            try { addRow(sec.id, 1); } catch (eA) {}
          }
        },
        onProject: function() {
          try {
            var fn = window.openProjectRowPicker || openProjectRowPicker;
            if (typeof fn === 'function') fn(sec.id);
            else showToast('انتخاب پروژه در دسترس نیست', 'warn');
          } catch (eP) {
            try { showToast('خطا در باز کردن پروژه‌ها', 'warn'); } catch (e2) {}
          }
        }
      });
      /* ۱.۳.۷۱: افزودن ردیف (معمولی/پروژه) فقط از «+» صفحهٔ اصلی؛ دکمهٔ این منو برداشته شد */
      if (tab !== 'income' && tab !== 'expense') box.appendChild(fabWrap);

      page.appendChild(box);
      container.appendChild(page);
      /* بازگرداندن اسکرول + نمایش ردیف تازه‌ساخته‌شده */
      try {
        scroll._pdKey = _pdKey;
        var _pdRowsNow = (sec.rows || []).slice();
        var _pdNewIdx = [];
        var _pdFlag = !!(window._pdNewRowAt && (Date.now() - window._pdNewRowAt) < 4000);
        if (_pdFlag) {
          if (_pdPrevRows) {
            _pdRowsNow.forEach(function (r, i) { if (!_pdPrevRows.has(r)) _pdNewIdx.push(i); });
            if (!(_pdNewIdx.length >= 1 && _pdNewIdx.length <= 5 &&
                  (_pdRowsNow.length - _pdPrevRows.size) === _pdNewIdx.length)) _pdNewIdx = [];
          } else if (_pdRowsNow.length) {
            _pdNewIdx = [_pdRowsNow.length - 1];
          }
          window._pdNewRowAt = 0;
        }
        window._pdRowsSeen[_pdKey] = new Set(_pdRowsNow);
        window._pdResetScroll = false;

        var _pdUserScrolled = false;
        ['touchstart', 'wheel', 'pointerdown'].forEach(function (evn) {
          scroll.addEventListener(evn, function () { _pdUserScrolled = true; }, { passive: true });
        });
        function _pdApplyTop() {
          if (_pdUserScrolled) return;
          try { if (Math.abs(scroll.scrollTop - _pdSavedTop) > 1) scroll.scrollTop = _pdSavedTop; } catch (e1) {}
        }
        if (_pdSavedTop > 0) {
          try { scroll.scrollTop = _pdSavedTop; } catch (e2) {}
          if (!_pdNewIdx.length) {
            requestAnimationFrame(_pdApplyTop);
            setTimeout(_pdApplyTop, 60);
            setTimeout(_pdApplyTop, 220);
          }
        }
        if (_pdNewIdx.length) {
          var _pdNewTr = tbody.children[_pdNewIdx[_pdNewIdx.length - 1]];
          if (_pdNewTr) {
            requestAnimationFrame(function () { try { window.pdEnsureRowVisible(_pdNewTr, true); } catch (e3) {} });
            setTimeout(function () { try { window.pdEnsureRowVisible(_pdNewTr, false); } catch (e4) {} }, 350);
          }
        }
      } catch (ePdRestore) {}
      try {
        requestAnimationFrame(function() {
          ensureShapeFrame(box);
          setTimeout(function() { ensureShapeFrame(box); }, 50);
        });
      } catch (e) {}
      // جلوگیری از اسکرول صفحه وقتی انتهای جدول رسید
      try {
        const sc = page.querySelector('.person-detail-scroll');
        if (sc && !sc._pdScrollContain) {
          sc._pdScrollContain = true;
          sc.addEventListener('touchstart', function(e) {
            this._tsY = e.touches[0].clientY;
            this._tsTop = this.scrollTop;
          }, { passive: true });
          sc.addEventListener('touchmove', function(e) {
            const y = e.touches[0].clientY;
            const dy = y - (this._tsY || y);
            const top = this.scrollTop;
            const max = this.scrollHeight - this.clientHeight;
            if ((top <= 0 && dy > 0) || (top >= max - 1 && dy < 0)) {
              e.preventDefault();
            }
          }, { passive: false });
        }
      } catch (e) {}
      // تاچ بیرون ردیف → مرتب‌سازی بر اساس روز
      try {
        if (!page._rowSortOutside) {
          page._rowSortOutside = true;
          page.addEventListener('pointerdown', (ev) => {
            const trEl = ev.target.closest && ev.target.closest('tbody tr');
            if (trEl) return;
            if (ev.target.closest && ev.target.closest('.dark-select-list, .status-menu, .pd-desc-popup')) return;
            /* دکمه + (لمس/کشیدن) نباید باعث بازسازی صفحه شود، وگرنه ژست کشیدن وسط راه قطع می‌شود */
            if (ev.target.closest && ev.target.closest('.row-add-fab-wrap')) return;
            setTimeout(() => {
              try {
                if (document.querySelector('.row-add-fab-wrap.is-dragging')) return;
                if (document.querySelector('.dark-select-list.open, .status-menu')) return;
                const a = document.activeElement;
                if (a && a.closest && a.closest('.person-detail-table tbody')) return;
                sortAndRebuild();
              } catch (err) {}
            }, 120);
          }, true);
        }
      } catch (e) {}
    }


    window.addPersonCard = addPersonCard;
    window.closePersonDetail = closePersonDetail;


    function renderSectionsForTab(tab) {
      const container = document.getElementById(tab === 'income' ? 'sections-income' : 'sections-expense');
      if (!container) return;
      const prev = currentTab;
      currentTab = tab;
      const frag = document.createDocumentFragment();
      (periodData[tab].sections || []).forEach(sec => frag.appendChild(buildSectionEl(sec)));
      container.innerHTML = '';
      container.appendChild(frag);
      updateSummaryForTab(tab);
      currentTab = prev;
      enableLongPressReorder(container, '.section', (ids) => {
        const t = tab;
        const secs = periodData[t].sections || [];
        const map = {};
        secs.forEach(s => { map[s.id] = s; });
        const ordered = ids.map(id => map[id]).filter(Boolean);
        // اگر چیزی جا مانده بود اضافه کن
        secs.forEach(s => { if (!ids.includes(s.id)) ordered.push(s); });
        periodData[t].sections = ordered;
        updateSummaryForTab(t);
        scheduleSave();
      });
    }
    function preRenderAdjacentTabs() {
      // همه تب‌ها برای سوایپ چندتایی
      TAB_ORDER.forEach(t => {
        if (t === 'income' || t === 'expense') renderSectionsForTab(t);
        else if (t === 'install') renderPlans();
        else if (t === 'balance') renderBalanceTab();
        else if (t === 'ledger') renderLedgerTab();
      });
      if (currentTab === 'recurring') renderRecurringBar();
      else {
        const rb = document.getElementById('recurringBox');
        if (rb) rb.remove();
      }
    }
    function renderAll() {
      // اگر داخل جزئیات کارت هستیم فقط همان را رندر کن — نه لیست قدیمی bank-card
      try {
        if (typeof _detailContext !== 'undefined' && _detailContext) {
          if (_detailContext.kind === 'income' || _detailContext.kind === 'expense') {
            try { renderPersonDetailPanel(_detailContext.kind, _detailContext.title); } catch (e) {}
          } else if (_detailContext.kind === 'balance') {
            try { renderBalanceTab(); } catch (e) {}
          }
          // از رندر sections قدیمی خارج شو
          document.querySelectorAll('body > .dark-select-list').forEach(el => {
            const wraps = document.querySelectorAll('.dark-select');
            let used = false;
            wraps.forEach(w => { if (w._list === el) used = true; });
            if (!used) el.remove();
          });
          return;
        }
      } catch (e) {}
      try { if (typeof renderHomeCards === 'function' && currentTab === 'home') renderHomeCards(); } catch (e) {}
      try {
        if (currentTab === 'income' || currentTab === 'expense') {
          // فقط اگر نه در حالت خانه هستیم (نباید برسد)
          if (currentTab !== 'home') {
            /* no full section list in home-ui */
          }
        }
      } catch (e) {}
      // حذف لیست‌های کشویی رهاشده (مثلاً از ردیف‌هایی که دیگر وجود ندارند)
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      // درآمد ثابت دیگر روی تب درآمد نیست — فقط پنل جدا
      const rbOld = document.getElementById('recurringBox');
      if (rbOld && currentTab !== 'recurring') {
        try { rbOld.remove(); } catch (e) {}
      }
      if (currentTab === 'install') {
        renderPlans();
      } else if (currentTab === 'balance') {
        renderBalanceTab();
      } else if (currentTab === 'ledger') {
        renderLedgerTab();
      } else if (currentTab === 'recurring') {
        renderRecurringBar();
      }
      if (currentTab === 'home') {
        activatePanel('home');
        try { renderHomeCards(); } catch (e) {}
      } else {
        activatePanel(currentTab);
      }
      checkInstallReminders();
      try { moveTabIndicator(); } catch (e) {}
    
      try { if (typeof refreshOpenProjectViews === 'function') refreshOpenProjectViews(null, { report: false }); } catch (eRV) {}
    }

    /* —— حساب‌های بانکی —— */
    const ALL_IRAN_BANKS = [
      'بانک ملی', 'بانک ملت', 'بانک مسکن', 'بانک صادرات', 'بلوبانک',
      'بانک سپه', 'بانک صنعت و معدن', 'بانک توسعه صادرات', 'بانک کشاورزی',
      'بانک توسعه تعاون', 'بانک تجارت', 'بانک رفاه کارگران',
      'پست بانک', 'بانک اقتصاد نوین', 'بانک پارسیان', 'بانک پاسارگاد',
      'بانک کارآفرین', 'بانک سینا', 'بانک شهر', 'بانک دی',
      'بانک گردشگری', 'بانک آینده', 'بانک ایران‌زمین', 'بانک خاورمیانه',
      'موسسه اعتباری ملل', 'بانک قرض‌الحسنه مهر', 'بانک قرض‌الحسنه رسالت'
    ];

    /* —— ثبت از پیامک بانکی —— */
    let pendingSmsEntry = null;
    let smsPendingQueue = [];

    const BANK_SMS_ALIASES = [
      { keys: ['ملی', 'bmi', 'bam'], name: 'بانک ملی' },
      { keys: ['ملت', 'mellat', 'behpardakht'], name: 'بانک ملت' },
      { keys: ['صادرات', 'bsi'], name: 'بانک صادرات' },
      { keys: ['مسکن', 'maskan'], name: 'بانک مسکن' },
      { keys: ['سپه', 'sepah'], name: 'بانک سپه' },
      { keys: ['تجارت', 'tejarat'], name: 'بانک تجارت' },
      { keys: ['رفاه', 'refah'], name: 'بانک رفاه کارگران' },
      { keys: ['کشاورزی', 'bki'], name: 'بانک کشاورزی' },
      { keys: ['پاسارگاد', 'pasargad', 'bpi'], name: 'بانک پاسارگاد' },
      { keys: ['پارسیان', 'parsian'], name: 'بانک پارسیان' },
      { keys: ['سامان', 'saman'], name: 'بانک سامان' },
      { keys: ['اقتصاد نوین', 'enbank'], name: 'بانک اقتصاد نوین' },
      { keys: ['آینده', 'ayandeh'], name: 'بانک آینده' },
      { keys: ['شهر', 'shahr'], name: 'بانک شهر' },
      { keys: ['سینا', 'sina'], name: 'بانک سینا' },
      { keys: ['دی', 'daybank', 'bank day'], name: 'بانک دی' },
      { keys: ['کارآفرین', 'karafarin'], name: 'بانک کارآفرین' },
      { keys: ['گردشگری', 'tourism'], name: 'بانک گردشگری' },
      { keys: ['ایران زمین', 'ایران‌زمین', 'izbank'], name: 'بانک ایران‌زمین' },
      { keys: ['خاورمیانه', 'middle east'], name: 'بانک خاورمیانه' },
      { keys: ['رسالت', 'resalat'], name: 'بانک قرض‌الحسنه رسالت' },
      { keys: ['مهر ایران', 'قرض‌الحسنه مهر', 'مهر'], name: 'بانک قرض‌الحسنه مهر' },
      { keys: ['بلو', 'blubank', 'bluebank'], name: 'بلوبانک' },
      { keys: ['پست بانک', 'postbank'], name: 'پست بانک' },
      { keys: ['ملل'], name: 'موسسه اعتباری ملل' }
    ];

    function openSmsImportModal() {
      // قفل اسکرول قبل از بستن منو تا پرش پشت مودال رخ ندهد
      lockBodyScroll();
      closeSideMenu();
      const ta = document.getElementById('smsImportText');
      if (ta) ta.value = '';
      const m = document.getElementById('smsImportModal');
      if (m) {
        m.style.top = '0';
        m.style.height = '';
        m.classList.add('open');
      }
      setTimeout(() => {
        try { ta && ta.focus({ preventScroll: true }); } catch (e) {
          try { ta && ta.focus(); } catch (e2) {}
        }
      }, 80);
    }
    function closeSmsImportModal() {
      const m = document.getElementById('smsImportModal');
      if (m) {
        m.classList.remove('open');
        m.style.top = '';
        m.style.height = '';
      }
      unlockBodyScroll();
    }
    /* ===== پیامک‌های ثبت‌نشده («بعداً») =====
       بستن باکس ثبت تراکنش با بازگشت یا زدن بیرون باکس = «بعداً»: پیامک گم نمی‌شود و در «پیامک‌های ثبت‌نشده» (منوی کناری) می‌ماند.
       فقط «ثبت» یا «رد» پیامک را از این فهرست برمی‌دارد. */
    var SMS_LATER_KEY = STORAGE_KEY + '_smsLater';
    function smsLaterLoad() {
      var a = [];
      try { a = JSON.parse(localStorage.getItem(SMS_LATER_KEY) || '[]'); a = Array.isArray(a) ? a.filter(function (x) { return x && x.raw; }) : []; } catch (e) { return []; }
      /* ۱.۳.۷۴: پیامک‌های واریز قسط ثبت‌نشده نمی‌مانند؛ به تاریخچهٔ کارت قسط می‌روند */
      try {
        var keep = a.filter(function (x) { var p = hkParseInstallSms(x.raw); if (p) { hkInstIngest(p, x.raw); return false; } return true; });
        if (keep.length !== a.length) { localStorage.setItem(SMS_LATER_KEY, JSON.stringify(keep)); a = keep; }
      } catch (eI) {}
      return a;
    }
    function smsLaterSave(list) {
      try { localStorage.setItem(SMS_LATER_KEY, JSON.stringify(list || [])); } catch (e) {}
      try { updateSmsLaterBadge(); } catch (e2) {}
    }
    function smsLaterAdd(entry) {
      if (!entry || !entry.raw) return;
      var raw = String(entry.raw).trim(), list = smsLaterLoad();
      if (list.some(function (x) { return String(x.raw).trim() === raw; })) return;
      list.unshift({ raw: String(entry.raw), sender: entry.sender || '', at: entry._laterAt || Date.now() });
      smsLaterSave(list.slice(0, 200));
    }
    function smsLaterRemove(raw) {
      raw = String(raw || '').trim(); if (!raw) return;
      var list = smsLaterLoad(), next = list.filter(function (x) { return String(x.raw).trim() !== raw; });
      if (next.length !== list.length) smsLaterSave(next);
    }
    function updateSmsLaterBadge() {
      var n = smsLaterLoad().length, b = document.getElementById('smsLaterBadge');
      if (b) { b.textContent = n ? toPersianDigits(String(n)) : ''; b.style.display = n ? '' : 'none'; }
    }
    /* فهرست «پیامک‌های ثبت‌نشده»: با زدن هر مورد همان باکس ثبت تراکنش باز می‌شود */
    function openSmsLaterModal() {
      try { if (typeof closeSideMenu === 'function') closeSideMenu(); } catch (eC) {}
      var old = document.getElementById('smsLaterOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'smsLaterOv'; ov.className = 'backup-pick-overlay hk-enc-ov';
      ov._hkCancel = function () { ov.remove(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      var list = smsLaterLoad();
      var html = '<div class="backup-pick-panel sms-later-panel" role="dialog"><div class="backup-pick-title">پیامک‌های ثبت‌نشده</div>';
      if (!list.length) html += '<div class="sms-later-empty">پیامک ثبت‌نشده‌ای نیست</div>';
      else {
        html += '<div class="sms-later-hint">پیامک‌هایی که باکس ثبتشان با بازگشت یا زدن بیرون باکس بسته شد. با زدن هر مورد، باکس ثبت تراکنش باز می‌شود.</div><div class="sms-later-list">';
        list.forEach(function (x, i) {
          var pr = null; try { pr = parseBankSms(x.raw); } catch (eP) {}
          var inc = pr && pr.type === 'income';
          var d = new Date(Number(x.at) || Date.now()), j = '';
          try { j = hkJStr(hkJalaliOfTs(d.getTime())); } catch (eJ) {}
          var hm = toPersianDigits(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
          var bank = ''; try { bank = (pr && (matchSelectedBank(pr.bank) || pr.bank)) || ''; } catch (eB) {}
          html += '<button type="button" class="sms-later-item" data-i="' + i + '"><span class="sli-top"><span class="sli-bank">' + escapeHtml(bank || 'پیامک بانکی') + ' · ' + (inc ? 'واریز' : 'برداشت') + '</span>' +
            '<span class="sli-amt ' + (inc ? 'inc' : 'exp') + '">' + (pr && pr.amount ? formatNum(pr.amount) : '—') + '</span></span>' +
            '<span class="sli-date">' + (j ? j + ' · ' : '') + hm + '</span></button>';
        });
        html += '</div>';
      }
      html += '<div class="backup-pick-actions"><button type="button" class="backup-pick-cancel" id="smsLaterClose">بستن</button></div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      ov.querySelector('#smsLaterClose').onclick = function () { ov.remove(); };
      ov.querySelectorAll('.sms-later-item').forEach(function (b) {
        b.onclick = function () {
          var x = list[parseInt(b.getAttribute('data-i'), 10)];
          ov.remove();
          if (x) smsLaterOpen(x);
        };
      });
    }
    function smsLaterOpen(x) {
      if (!x || !x.raw) return;
      if (typeof isSmsConfirmOpen === 'function' && isSmsConfirmOpen()) return;
      var parsed = null;
      try { parsed = parseBankSms(x.raw); } catch (e) {}
      if (!parsed || !parsed.amount) { smsLaterRemove(x.raw); try { showToast('این پیامک قابل تشخیص نبود'); } catch (e2) {} return; }
      try { parsed.bank = matchSelectedBank(parsed.bank); } catch (e3) {}
      parsed.raw = String(x.raw); if (x.sender) parsed.sender = x.sender;
      parsed._laterAt = x.at;
      pendingSmsEntry = parsed;
      openSmsConfirmModal(parsed);
      try { showSmsSenderWarning(parsed); } catch (eW) {}
    }
    (function () {
      function bindLater() {
        try { updateSmsLaterBadge(); } catch (e) {}
        /* زدن بیرون باکس ثبت تراکنش = «بعداً» (اگر همان لحظه فهرست کشویی یا باکس اطلاعات باز نبود) */
        var m = document.getElementById('smsConfirmModal');
        if (!m || m._hkLaterBound) return;
        m._hkLaterBound = true;
        var downOut = false;
        m.addEventListener('pointerdown', function (e) {
          downOut = e.target === m && !document.querySelector('.fancy-select-list.open, .dark-select-list.open') && !document.getElementById('hkInfoTip');
        });
        m.addEventListener('click', function (e) {
          if (e.target !== m || !downOut) return;
          downOut = false;
          if (isSmsConfirmOpen()) closeSmsConfirmModal('later');
        });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindLater); else bindLater();
    })();
    /* پیامک‌های ثبت‌شدهٔ اخیر (برای تشخیص ثبت جابه‌جا در تطبیق موجودی) */
    var SMS_DONE_KEY = STORAGE_KEY + '_smsDoneLog';
    function smsDoneLogLoad() { try { var a = JSON.parse(localStorage.getItem(SMS_DONE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function smsDoneLogAdd(pe) {
      try {
        if (!pe || !pe.raw || !pe.amount) return;
        var raw = String(pe.raw).trim(), list = smsDoneLogLoad().filter(function (x) { return x && x.raw !== raw; });
        list.unshift({ raw: raw, acc4: hkSmsAcc4(raw) || '', bank: (matchSelectedBank(pe.bank) || ''), y: parseInt(pe.year, 10) || currentYear, m: parseInt(pe.month, 10) || currentMonth, d: parseInt(pe.day, 10) || 0, v: pe.type === 'income' ? Number(pe.amount) : -Number(pe.amount) });
        localStorage.setItem(SMS_DONE_KEY, JSON.stringify(list.slice(0, 60)));
      } catch (e) {}
    }
    /* ۱.۳.۶۴: پنجرهٔ «احتمال ثبت تکراری» با دو کارت زیر هم: پیامک تازه و ثبت قبلی (متن پیامکش اگر در دفتر پیامک‌های ثبت‌شده باشد) */
    function hkDupFindPrevSms(cur, row) {
      try {
        var raw = String(cur.raw || '').trim(), A = Number(row.amount) || 0, rd = parseInt(toEnglishDigits(String(row.day || '')), 10) || 0;
        var sg = cur.type === 'income' ? 1 : -1, hit = null;
        smsDoneLogLoad().forEach(function (x) {
          if (hit || !x || !x.raw || String(x.raw).trim() === raw) return;
          var v = Number(x.v) || 0; if ((v > 0 ? 1 : -1) !== sg) return;
          if (Math.abs(Math.abs(v) - A) > Math.max(A, 1) * 0.01) return;
          if ((x.y && x.y !== cur.y) || (x.m && x.m !== cur.m)) return;
          if (rd && x.d && Math.abs(x.d - rd) > 1) return;
          if (row.account && x.bank && x.bank !== row.account) return;
          hit = x;
        });
        return hit;
      } catch (e) { return null; }
    }
    function hkAskDupCompare(cur, hit, onYes) {
      var row = hit.row || {}, prev = hkDupFindPrevSms(cur, row);
      var nTime = cur.raw ? hkSmsTime(cur.raw, Number(cur.at) || 0) : '';
      var oTime = row.time || (prev ? hkSmsTime(prev.raw, 0) : '');
      var nDay = parseInt(toEnglishDigits(String(cur.day || '')), 10) || 0, oDay = parseInt(toEnglishDigits(String(row.day || '')), 10) || 0;
      var nAcc = String(cur.account || '').trim(), oAcc = String(row.account || '').trim();
      var nAmt = Number(cur.amount) || 0, oAmt = Number(row.amount) || 0;
      function f(lbl, val, diff) { return '<span class="hk-dc-f' + (diff ? ' hk-dc-diff' : '') + '"><i>' + lbl + '</i> ' + escapeHtml(val || '—') + '</span>'; }
      function card(title, amt, day, time, acc, body, other) {
        return '<div class="hk-dc-card"><div class="hk-dc-h">' + title + '</div><div class="hk-dc-meta">' +
          f('مبلغ', formatNum(amt), amt !== other.amt) +
          f('روز', day ? toPersianDigits(String(day)) + ' ' + MONTHS[(cur.m || currentMonth) - 1] : '', day !== other.day) +
          f('ساعت', time ? toPersianDigits(time) : '', !!(time && other.time && time !== other.time)) +
          f('حساب', acc, !!(acc && other.acc && acc !== other.acc)) +
          '</div>' + body + '</div>';
      }
      var nBody = cur.raw ? '<div class="hk-dc-sms">' + escapeHtml(String(cur.raw).trim()) + '</div>' : '';
      var oBody = (row.desc ? '<div class="hk-dc-desc">' + escapeHtml(row.desc) + (hit.section ? ' <small>(' + escapeHtml(hit.section) + ')</small>' : '') + '</div>' : '') +
        (prev ? '<div class="hk-dc-sms">' + escapeHtml(String(prev.raw).trim()) + '</div>' : '<div class="hk-dc-none">ثبت دستی یا بدون متن پیامک</div>');
      askConfirm('احتمال ثبت تکراری؛ دو تراکنش را مقایسه کنید. باز هم ثبت شود؟', onYes);
      var cc = document.getElementById('confirmCmp'), cm = document.getElementById('confirmModal');
      if (!cc) return;
      cc.innerHTML = card('پیامک تازه', nAmt, nDay, nTime, nAcc, nBody, { amt: oAmt, day: oDay, time: oTime, acc: oAcc }) +
        card('ثبت قبلی', oAmt, oDay, oTime, oAcc, oBody, { amt: nAmt, day: nDay, time: nTime, acc: nAcc });
      cc.style.display = '';
      if (cm) cm.classList.add('hk-dup-open');
    }
    /* mode: (خالی) ثبت شد | 'reject' رد شد | 'later' بعداً */
    function closeSmsConfirmModal(mode) {
      try { hkPendingRefresh(); } catch (ePr) {}
      try { if (typeof closeAllAppMenus === 'function') closeAllAppMenus(); } catch (eM) {}
      /* پیوست‌های در انتظار: ثبت → روی ردیف تازه؛ رد/بعداً → پاک */
      try { if (typeof hkSmsAttFinish === 'function') hkSmsAttFinish(!mode); } catch (eAt) {}
      const m = document.getElementById('smsConfirmModal');
      if (m) m.classList.remove('open');
      var _pe = pendingSmsEntry;
      try {
        if (_pe) {
          if (mode === 'later') { smsLaterAdd(_pe); try { showToast('در «پیامک‌های ثبت‌نشده» ماند'); } catch (eT) {} }
          else smsLaterRemove(_pe.raw);
          if (!mode) smsDoneLogAdd(_pe);
        }
      } catch (eL) {}
      /* پیامک تعیین تکلیف شد (ثبت، رد یا «بعداً» که حالا در فهرست خود نرم‌افزار است) → از صف نیتیو پاک شود و در این نوبت دوباره نیاید */
      try {
        var _nid = _pe && _pe.nid;
        if (_nid) { window._hkDoneSmsNids = window._hkDoneSmsNids || {}; window._hkDoneSmsNids[_nid] = 1; }
        var _B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BankSms;
        if (_nid && _B && typeof _B.getAllPending === 'function' && typeof _B.markHandled === 'function') _B.markHandled({ nid: _nid }).catch(function () {});
      } catch (eH) {}
      pendingSmsEntry = null;
      setTimeout(function () { try { processNextSmsInQueue(); } catch (e) {} try { cancelHandledSmsNotifications(); } catch (e3) {} }, 150);
    }
    async function pasteSmsFromClipboard() {
      try {
        const t = await navigator.clipboard.readText();
        const ta = document.getElementById('smsImportText');
        if (ta) ta.value = t || '';
        if (t && t.trim()) showToast('متن از کلیپ‌بورد چسبانده شد');
        else showToast('کلیپ‌بورد خالی است');
      } catch (e) {
        showToast('دسترسی به کلیپ‌بورد ممکن نشد — دستی بچسبانید');
      }
    }

    function normalizeSmsText(text) {
      let t = String(text || '');
      // یکسان‌سازی حروف عربی/فارسی رایج در پیامک بانک‌ها (برخی بانک‌ها «بانك ملي» با ك/ي عربی می‌فرستند)
      t = t.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/ۀ/g, 'ه')
        .replace(/[أإٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ـ/g, '');
      // جداکنندهٔ هزارگان/اعشار عربی
      t = t.replace(/\u066C/g, ',').replace(/\u066B/g, '.');
      t = t.replace(/\u200c/g, '').replace(/[\u200f\u200e\u202a-\u202e\u2066-\u2069]/g, '');
      t = toEnglishDigits(t);
      return t;
    }
    /* واژه‌های برچسب تراکنش در قالب پیامک بانک‌ها (برداشت:… / واریز:… / انتقال:…+ / خرید:…) */
    var SMS_TX_LABEL = '(?:برداشت(?:\\s*وجه)?|واریز(?:\\s*وجه)?|انتقال(?:\\s*وجه)?|خرید(?:\\s*کالا)?|پرداخت(?:\\s*قبض)?|کسر(?:\\s*از\\s*حساب)?|دریافت|برگشت(?:\\s*وجه)?|استرداد|سود|قسط(?:\\s*وام)?)';
    /* پیامک‌هایی که نرم‌افزار نباید به آن‌ها واکنش نشان دهد: تبلیغ، اطلاعیه/یادآوری، تراکنش ناموفق (رمز/OTP جدا بررسی می‌شود) */
    function smsHasTxStructure(t) {
      var hasTx = new RegExp(SMS_TX_LABEL + '\\s*[:：]?\\s*(?:مبلغ\\s*)?[+\\-]?\\s*[0-9]').test(t) || /مبلغ\s*[:：]?\s*[0-9]/.test(t);
      var hasBal = /مانده|موجودی/.test(t);
      return hasTx && hasBal;
    }
    function isNonTransactionSms(text) {
      var t = normalizeSmsText(text);
      if (!t) return 'empty';
      if (/ناموفق|عدم\s*موفق|انجام\s*نشد|رد\s*شد|موجودی\s*(?:حساب\s*)?کافی\s*نیست|عدم\s*کفایت\s*موجودی|کافی\s*نمی\s*باشد/.test(t)) return 'failed';
      var tx = smsHasTxStructure(t);
      if (tx) return false;
      if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:ir|com|me|ly)\/|لغو\s*[0-9]+|انصراف\s*[0-9]+/i.test(t)) return 'promo';
      if (/تخفیف|جایزه|قرعه\s*کشی|جشنواره|هدیه|کمپین|باشگاه\s*مشتریان|امتیاز|ثبت\s*نام|عضویت|دانلود|نصب\s*(?:اپ|برنامه|همراه)|اپلیکیشن|فرصت|پیشنهاد\s*ویژه|شگفت\s*انگیز|بسته\s*اینترنت|مشترک\s*گرامی/.test(t)) return 'promo';
      if (/یادآوری|سررسید|اطلاعیه|به\s*اطلاع\s*می\s*رساند|مهلت|معوق|دعوت|تبریک|تسلیت/.test(t)) return 'notice';
      return false;
    }

    function detectBankFromSms(text, nameOnly) {
      const low = normalizeSmsText(text).toLowerCase();
      // اولویت با نام‌های کامل‌تر و شناسه فرستنده رایج پیامک
      const ordered = [
        { keys: ['بانک ملی', 'بانك ملی', 'بانک ملی ایران', 'bmi.ir', 'bmi', 'bam', 'bankmelli', 'melli bank'], name: 'بانک ملی' },
        { keys: ['بانک ملت', 'بانك ملت', 'mellat', 'behpardakht', 'bankmellat', 'bmellat'], name: 'بانک ملت' },
        { keys: ['بانک صادرات', 'بانك صادرات', 'bsi.ir', 'bsi'], name: 'بانک صادرات' },
        { keys: ['بانک مسکن', 'بانك مسکن', 'maskan', 'bankmaskan'], name: 'بانک مسکن' },
        { keys: ['بانک سپه', 'بانك سپه', 'banksepah', 'sepah'], name: 'بانک سپه' },
        { keys: ['بانک تجارت', 'بانك تجارت', 'tejarat', 'banktejarat'], name: 'بانک تجارت' },
        { keys: ['بانک رفاه', 'رفاه کارگران', 'refah'], name: 'بانک رفاه کارگران' },
        { keys: ['بانک کشاورزی', 'کشاورزی', 'bki'], name: 'بانک کشاورزی' },
        { keys: ['بانک پاسارگاد', 'پاسارگاد', 'pasargad', 'bpi'], name: 'بانک پاسارگاد' },
        { keys: ['بانک پارسیان', 'پارسیان', 'parsian'], name: 'بانک پارسیان' },
        { keys: ['بانک سامان', 'سامان', 'sb24', 'saman'], name: 'بانک سامان' },
        { keys: ['اقتصاد نوین', 'enbank'], name: 'بانک اقتصاد نوین' },
        { keys: ['بانک آینده', 'آینده', 'ba24', 'ayandeh'], name: 'بانک آینده' },
        { keys: ['بانک شهر', 'شهر', 'shahr'], name: 'بانک شهر' },
        { keys: ['بانک سینا', 'سینا', 'sina'], name: 'بانک سینا' },
        { keys: ['بانک کارآفرین', 'کارآفرین', 'karafarin'], name: 'بانک کارآفرین' },
        { keys: ['بانک گردشگری', 'گردشگری', 'tourism'], name: 'بانک گردشگری' },
        { keys: ['ایران زمین', 'ایران‌زمین', 'izbank'], name: 'بانک ایران‌زمین' },
        { keys: ['خاورمیانه', 'middleeast', 'middle east'], name: 'بانک خاورمیانه' },
        { keys: ['رسالت', 'resalat'], name: 'بانک قرض‌الحسنه رسالت' },
        { keys: ['مهر ایران', 'قرض الحسنه مهر', 'قرض‌الحسنه مهر', 'qmb'], name: 'بانک قرض‌الحسنه مهر' },
        { keys: ['بلوبانک', 'بلو بانک', 'blubank', 'blue bank'], name: 'بلوبانک' },
        { keys: ['پست بانک', 'postbank', 'post bank'], name: 'پست بانک' },
        { keys: ['موسسه اعتباری ملل', 'ملل'], name: 'موسسه اعتباری ملل' },
        { keys: ['بانک دی', 'daybank', 'bank day'], name: 'بانک دی' },
        { keys: ['حکمت ایرانیان', 'حکمت'], name: 'بانک حکمت ایرانیان' },
        { keys: ['انصار'], name: 'بانک انصار' },
        { keys: ['قوامین'], name: 'بانک قوامین' },
        { keys: ['کوثر'], name: 'بانک کوثر' },
        { keys: ['سرمایه'], name: 'بانک سرمایه' },
        { keys: ['تات'], name: 'بانک تات' },
        // کوتاه — آخر (پس از نام‌های کامل)
        { keys: ['صادرات'], name: 'بانک صادرات' },
        { keys: ['مسکن'], name: 'بانک مسکن' },
        { keys: ['سپه'], name: 'بانک سپه' },
        { keys: ['تجارت'], name: 'بانک تجارت' },
        { keys: ['رفاه'], name: 'بانک رفاه کارگران' },
        { keys: ['کشاورزی'], name: 'بانک کشاورزی' },
        { keys: ['پاسارگاد'], name: 'بانک پاسارگاد' },
        { keys: ['پارسیان'], name: 'بانک پارسیان' },
        { keys: ['سامان'], name: 'بانک سامان' },
        { keys: ['آینده'], name: 'بانک آینده' },
        { keys: ['شهر'], name: 'بانک شهر' },
        { keys: ['ملت'], name: 'بانک ملت' },
        { keys: ['ملی'], name: 'بانک ملی' },
        { keys: ['دی'], name: 'بانک دی' }
      ];
      for (let i = 0; i < ordered.length; i++) {
        const a = ordered[i];
        for (let k = 0; k < a.keys.length; k++) {
          if (low.indexOf(String(a.keys[k]).toLowerCase()) >= 0) return a.name;
        }
      }
      if (nameOnly) return '';
      const acc = extractAccountFromSms(text);
      if (acc && smsAccountBankMap[acc]) return smsAccountBankMap[acc];
      if (selectedBankAccounts && selectedBankAccounts.length === 1) return accountLabel(selectedBankAccounts[0]);
      return '';
    }

    /* ۱.۳.۸۳: بانک از «فرستنده» — پیامک تراکنش بعضی بانک‌ها (مثل ملت) اسم بانک را در متن ندارد و فقط فرستنده «Bank Mellat» است.
       ۱) اسم بانک در خود فرستنده  ۲) یادگیری: اگر یک پیامکِ همان فرستنده اسم بانک را داشت (مثل پیامک خوشامد)، بقیه هم همان بانک‌اند.
       فرستندهٔ شخصی (شمارهٔ موبایل) هرگز یاد گرفته نمی‌شود. همه‌چیز فقط روی همین گوشی. */
    var HK_SENDER_BANK_KEY = STORAGE_KEY + '_senderBank';
    var HK_BANK_SENDER_NAMES = [['mellat', 'بانک ملت'], ['melli', 'بانک ملی'], ['bmi', 'بانک ملی'], ['sepah', 'بانک سپه'], ['saderat', 'بانک صادرات'], ['tejarat', 'بانک تجارت'],
      ['maskan', 'بانک مسکن'], ['keshavarzi', 'بانک کشاورزی'], ['agri', 'بانک کشاورزی'], ['refah', 'بانک رفاه کارگران'], ['pasargad', 'بانک پاسارگاد'], ['parsian', 'بانک پارسیان'],
      ['saman', 'بانک سامان'], ['ayandeh', 'بانک آینده'], ['shahr', 'بانک شهر'], ['sina', 'بانک سینا'], ['karafarin', 'بانک کارآفرین'], ['eghtesad', 'بانک اقتصاد نوین'], ['enbank', 'بانک اقتصاد نوین'],
      ['blubank', 'بلوبانک'], ['blu bank', 'بلوبانک'], ['postbank', 'پست بانک'], ['post bank', 'پست بانک'], ['resalat', 'بانک قرض‌الحسنه رسالت'], ['qmb', 'بانک قرض‌الحسنه مهر'],
      ['daybank', 'بانک دی'], ['tourism', 'بانک گردشگری'], ['izbank', 'بانک ایران‌زمین'], ['iranzamin', 'بانک ایران‌زمین'], ['middleeast', 'بانک خاورمیانه'], ['melal', 'موسسه اعتباری ملل']];
    function hkSenderKey(a) { return toEnglishDigits(String(a || '')).replace(/[\s\-()+._]/g, '').toLowerCase(); }
    function hkSenderBankMap() { try { var o = JSON.parse(localStorage.getItem(HK_SENDER_BANK_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function hkSenderLearn(addr, bank) {
      var k = hkSenderKey(addr); if (!k || !bank || hkIsPersonalSender(addr)) return;
      var m = hkSenderBankMap(); if (m[k] === bank) return;
      m[k] = bank; try { localStorage.setItem(HK_SENDER_BANK_KEY, JSON.stringify(m)); } catch (e) {}
    }
    function hkSenderBank(addr, ctx) {
      if (!addr || hkIsPersonalSender(addr)) return '';
      var k = hkSenderKey(addr); if (!k) return '';
      if (ctx && ctx.sender && ctx.sender[k]) return ctx.sender[k];
      var m = hkSenderBankMap(); if (m[k]) return m[k];
      for (var i = 0; i < HK_BANK_SENDER_NAMES.length; i++) if (k.indexOf(HK_BANK_SENDER_NAMES[i][0].replace(/\s/g, '')) >= 0) return HK_BANK_SENDER_NAMES[i][1];
      try { var fa = detectBankFromSms(String(addr), true); if (fa) return fa; } catch (e) {}
      return '';
    }
    /* یک دور روی صندوق: نقشهٔ فرستنده→بانک و حساب→بانک از پیامک‌هایی که اسم بانک دارند */
    function hkInboxBankCtx(items) {
      var ctx = { sender: {}, acc: {} };
      (items || []).forEach(function (it) {
        try {
          var body = String(it.body || ''); if (!body || hkIsPersonalSender(it.address)) return;
          var b = detectBankFromSms(body, true); if (!b) return;
          var k = hkSenderKey(it.address); if (k && !ctx.sender[k]) ctx.sender[k] = b;
          var a4 = hkSmsAcc4(body); if (a4 && !ctx.acc[a4]) ctx.acc[a4] = b;
        } catch (e) {}
      });
      Object.keys(ctx.sender).forEach(function (k) { var m = hkSenderBankMap(); if (m[k] !== ctx.sender[k]) { m[k] = ctx.sender[k]; try { localStorage.setItem(HK_SENDER_BANK_KEY, JSON.stringify(m)); } catch (e) {} } });
      return ctx;
    }
    function hkBankOfSms(body, addr, ctx) {
      var b = ''; try { b = detectBankFromSms(body, true); } catch (e) {}
      if (b) return b;
      b = hkSenderBank(addr, ctx); if (b) return b;
      try { var a4 = hkSmsAcc4(body); if (a4 && ctx && ctx.acc && ctx.acc[a4]) return ctx.acc[a4]; } catch (e) {}
      try { return detectBankFromSms(body) || ''; } catch (e) { return ''; }
    }
    try { window.hkBankOfSms = hkBankOfSms; window.hkInboxBankCtx = hkInboxBankCtx; window.hkSenderBank = hkSenderBank; } catch (eWb) {}

    function detectTxnTypeFromSms(text) {
      const t = normalizeSmsText(text);
      // علامت چسبیده به مبلغِ برچسب‌دار (مثل «انتقال:2,000,000+» یا «برداشت:-500,000») قطعی‌ترین نشانه است
      const sg = t.match(new RegExp(SMS_TX_LABEL + '\\s*[:：]?\\s*([+\\-])?\\s*[0-9][0-9,]*\\s*([+\\-])?(?:\\s|$)'));
      if (sg && (sg[1] || sg[2])) return (sg[1] || sg[2]) === '+' ? 'income' : 'expense';
      if (/برگشت\s*(?:وجه|خرید|تراکنش)|استرداد|سود\s*(?:سپرده|حساب)/.test(t)) return 'income';
      // درآمد اول — اگر هر دو بود، کلمهٔ صریح‌تر اولویت دارد
      if (/واریز\s*به|واریز\s*مبلغ|واریز\s*وجه|واریز\s*شد|واریز:|واریز\s+\d|دریافت\s*مبلغ|سود\s*واریز|پاداش/i.test(t)) return 'income';
      if (/\bواریز\b|واریز/i.test(t) && !/برداشت|خرید|پرداخت قبض/i.test(t)) return 'income';
      if (/برداشت\s*از|برداشت\s*مبلغ|برداشت\s*شد|برداشت:|خرید\s*از|خرید\s*مبلغ|پرداخت\s*مبلغ|کسر\s*از|کارمزد|pos|برداشت موفق|برداشت وجه/i.test(t)) return 'expense';
      if (/برداشت|خرید|پرداخت|کسر|کارمزد/i.test(t)) return 'expense';
      // برای عناوین مبهم مثل «انتقال» یا «تراکنش» که صراحتاً واریز/برداشت نمی‌گویند،
      // علامت +/- کنار مبلغ ملاک تشخیص است (رایج در پیامک بانک ملی و مشابه آن)
      if (/[:：]\s*\+\s*[0-9]/.test(t)) return 'income';
      if (/[:：]\s*-\s*[0-9]/.test(t)) return 'expense';
      // علامت +/- بعد از خود عدد (رایج در بانک ملی، مثل «انتقال:2,000,000+»)
      if (/[0-9]\+(?:\s|$)/m.test(t)) return 'income';
      if (/[0-9]-(?:\s|$)/m.test(t)) return 'expense';
      return 'expense';
    }

    function parseAmountToken(tok) {
      if (!tok) return 0;
      const digits = String(tok).replace(/[^\d]/g, '');
      if (!digits) return 0;
      return parseInt(digits, 10) || 0;
    }

    function extractAmountFromSms(text) {
      let raw = normalizeSmsText(text);
      /* ۱.۳.۵۵: شمارهٔ کارت/شبا (۱۵ رقم به بالا، چهارتایی‌های جدا، یا ستاره‌دار) هرگز مبلغ نیست */
      raw = raw.replace(/(?:IR\s*)?[0-9]{15,}/gi, ' ').replace(/[0-9]{4}[\s\-][0-9]{4}[\s\-][0-9]{4}[\s\-][0-9]{4}/g, ' ')
        .replace(/[0-9*][0-9*\-]{6,}[0-9*]/g, function (s) { return s.indexOf('*') >= 0 ? ' ' : s; });
      // شماره حساب/کارت را قبل از جست‌وجوی مبلغ حذف کن تا اشتباهی به‌عنوان مبلغ خوانده نشود
      raw = raw.replace(/(حساب|شماره\s*حساب|شماره\s*کارت|کارت)\s*[:：]?\s*[0-9][0-9\-*]{3,}/gi, '$1:');
      // مبلغ «مانده/موجودی» هرگز مبلغ تراکنش نیست
      raw = raw.replace(/(مانده(?:\s*حساب)?|موجودی(?:\s*حساب)?)\s*[:：]?\s*[+\-]?\s*[0-9][0-9,\.]*\s*[+\-]?\s*(?:ریال|rial|تومان|تومن)?/gi, '$1:');
      const patterns = [
        new RegExp(SMS_TX_LABEL + '\\s*[:：]?\\s*(?:مبلغ\\s*[:：]?\\s*)?[+\\-]?\\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,14})', 'i'),
        /مبلغ\s*[:：=\-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i,
        /مبلغ\s+([0-9][0-9,\.\s]{2,})/i,
        /amount\s*[:：=\-]?\s*([0-9][0-9,\.\s]*)/i,
        /([0-9]{1,3}(?:,[0-9]{3})+)\s*(?:ریال|rial|تومان|تومن)/i,
        /([0-9]{1,3}(?:\.[0-9]{3})+)\s*(?:ریال|rial|تومان|تومن)/i,
        /([0-9]{5,14})\s*(?:ریال|rial|تومان|تومن)/i,
        /(?:ریال|rial|تومان|تومن)\s*[:：=\-]?\s*([0-9][0-9,\.\s]*)/i,
        /([+\-]?\s*[0-9]{1,3}(?:,[0-9]{3}){1,4})/,
        /([+\-]?\s*[0-9]{6,14})/
      ];
      let amount = 0;
      let unit = null; // rial | toman | null
      let matched = false;
      for (let i = 0; i < patterns.length; i++) {
        const m = raw.match(patterns[i]);
        if (!m) continue;
        const v = parseAmountToken(m[1]);
        if (v < 100) continue;
        amount = v;
        matched = true;
        const around = raw.slice(Math.max(0, (m.index || 0) - 12), (m.index || 0) + String(m[0]).length + 16);
        if (/تومان|تومن|toman/i.test(around)) unit = 'toman';
        else if (/ریال|rial/i.test(around)) unit = 'rial';
        if (i <= 8) break;
      }
      if (!matched) {
        const nums = raw.match(/[0-9]{4,14}/g) || [];
        let best = 0;
        nums.forEach(n => {
          const v = parseInt(n, 10) || 0;
          if (v >= 1300 && v <= 1500) return;
          if (v > best) best = v;
        });
        amount = best;
      }
      // واحد کل متن SMS (گاهی واحد دور از عدد است)
      if (!unit) {
        if (/\bتومان\b|\bتومن\b|\btoman\b/i.test(raw)) unit = 'toman';
        else if (/\bریال\b|\brial\b/i.test(raw)) unit = 'rial';
      }
      // Canonical: نرم‌افزار فقط تومان ذخیره می‌کند. تبدیل ریال→تومان دقیقاً یک‌بار اینجا.
      // SMS بانکی ایران معمولاً ریال است؛ اگر واحد صریح تومان نبود و پیامک بانکی است → ریال.
      /* مبلغ دقیق ریالی هم نگه داشته می‌شود تا تطبیق موجودی با گرد کردن تومان خطا جمع نکند */
      extractAmountFromSms.lastRial = 0;
      if (unit === 'toman') {
        /* already toman — no convert */
      } else if (unit === 'rial') {
        if (amount >= 10) { extractAmountFromSms.lastRial = amount; amount = Math.round(amount / 10); }
      } else {
        // واحد نامشخص: اگر نشانه‌های تراکنش بانکی دارد، مبلغ را ریال فرض کن
        var bankish = /مبلغ|برداشت|واریز|مانده|خرید|انتقال|حساب|بانك|بانک|کارت/i.test(raw);
        if (bankish && amount >= 1000) {
          extractAmountFromSms.lastRial = amount;
          amount = Math.round(amount / 10);
        }
      }
      return amount;
    }


    function extractDateFromSms(text) {
      const raw = normalizeSmsText(text);
      const today = (typeof getTodayPersian === 'function') ? getTodayPersian() : { y: currentYear, m: currentMonth, d: 1 };
      const okDay = (n) => { const d = parseInt(n, 10); return (d >= 1 && d <= 31) ? d : 0; };
      const okMonth = (n) => { const m = parseInt(n, 10); return (m >= 1 && m <= 12) ? m : 0; };
      const fullYear = (yy) => {
        let y = parseInt(yy, 10);
        if (isNaN(y)) return today.y;
        if (y >= 1300 && y <= 1500) return y;
        if (y >= 0 && y <= 99) {
          const base = Math.floor((today.y || 1400) / 100) * 100;
          let cand = base + y;
          if (cand > (today.y || 1400) + 1) cand = base - 100 + y;
          return cand;
        }
        return today.y;
      };

      let m = raw.match(/((?:13|14)\d{2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})/);
      if (m) {
        const mo = okMonth(m[2]), d = okDay(m[3]);
        if (mo && d) return { y: parseInt(m[1], 10), m: mo, d: d };
      }
      m = raw.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*((?:13|14)\d{2})/);
      if (m) {
        const d = okDay(m[1]), mo = okMonth(m[2]);
        if (d && mo) return { y: parseInt(m[3], 10), m: mo, d: d };
      }
      // ملت: YY/MM/DD-HH:MM مثل 05/06/27-16:25
      m = raw.match(/\b(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[-–]\s*\d{1,2}:\d{2}/);
      if (m) {
        const yy = fullYear(m[1]), mo = okMonth(m[2]), d = okDay(m[3]);
        if (mo && d) return { y: yy, m: mo, d: d };
      }
      // ملی: MMDD-HH:MM مثل 0730-20:26
      m = raw.match(/(?:^|[^\d])(\d{2})(\d{2})\s*[-–]\s*\d{1,2}:\d{2}(?:[^\d]|$)/);
      if (m) {
        const mo = okMonth(m[1]), d = okDay(m[2]);
        if (mo && d) return { y: today.y, m: mo, d: d };
      }
      m = raw.match(/(?:^|[^\d])(\d{2})(\d{2})(\d{2})(\d{2})(?:[^\d]|$)/);
      if (m) {
        const mo = okMonth(m[1]), d = okDay(m[2]);
        const hh = parseInt(m[3], 10), mi = parseInt(m[4], 10);
        if (mo && d && hh <= 23 && mi <= 59) return { y: today.y, m: mo, d: d };
      }
      m = raw.match(/\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[-–\s]\s*\d{1,2}:\d{2}/);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return { y: today.y, m: a, d: b };
        if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return { y: today.y, m: b, d: a };
      }
      m = raw.match(/تاریخ\s*[:：]?\s*((?:13|14)\d{2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})/);
      if (m) {
        const mo = okMonth(m[2]), d = okDay(m[3]);
        if (mo && d) return { y: parseInt(m[1], 10), m: mo, d: d };
      }
      m = raw.match(/تاریخ\s*[:：]?\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})/);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return { y: today.y, m: a, d: b };
        if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return { y: today.y, m: b, d: a };
      }
      return null;
    }

    function extractDayFromSms(text) {
      const dt = extractDateFromSms(text);
      return dt && dt.d ? String(dt.d) : '';
    }


    function isOtpOrAuthSms(text) {
      // نرمال‌سازی ي/ی و ك/ک عربی-فارسی
      let t = normalizeSmsText(String(text || ''));
      if (!t) return false;
      t = t.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
      // شناسه تأیید برداشت (حتی اگر مبلغ هم در پیام باشد — OTP است نه تراکنش)
      if (/شناسه\s*تایید\s*برداشت|شناسه\s*تایید/i.test(t)) return true;
      if (/تایید\s*برداشت\s*از\s*حساب/i.test(t)) return true;
      // رمز پویا / لحظه‌ای / موقت / دوم / یک‌بارمصرف
      if (/رمز\s*پویا|رمزپویا|رمز\s*موقت|رمز\s*لحظه|رمزلحظه|رمز\s*آنلاین|رمز\s*یک\s*بار|رمز\s*یکبار|رمز\s*دوم|کد\s*تایید|کد\s*امنیتی/i.test(t)) return true;
      if (/\botp\b|one[\s-]*time|password|passcode|2fa|auth\s*code/i.test(t)) return true;
      // «رمز» و بلافاصله یک عدد ۴ تا ۸ رقمی = رمز یک‌بارمصرف (مثلاً بانک ملی: «انتقال به … مبلغ … رمز 2960715») — تراکنش انجام‌شده نیست
      if (/رمز\s*[:：]?\s*[0-9۰-۹]{4,8}(?![0-9۰-۹])/.test(t)) return true;
      if (/محرمانه\s*!/i.test(t) && /رمز|کد|شناسه/i.test(t)) return true;
      if (/خرید\s*از/i.test(t) && /رمز\s*پویا|رمزپویا|رمز\s*لحظه|رمز\s+\d{4,8}|کد\s+\d{4,8}/i.test(t)) return true;
      if (/(?:رمز|کد)\s*[:：]?\s*\d{4,8}\b/i.test(t) && /هشدار|محرمانه/i.test(t)) return true;
      return false;
    }

    /* ===== ۱.۳.۷۴: کارت‌های قسط — پیامک «واریز قسط» (مثل بانک مسکن) دیگر درآمد نیست.
       حساب همیشه «به کارت» است («از کارت» نادیده)؛ هر پیامک فقط در تاریخچهٔ همان کارت قسط ثبت می‌شود
       (تاریخ، ساعت، مبلغ، شمارهٔ قسط، معوق، جریمه). تعداد اقساط بیشتر از پیامک قبلی = قسط پرداخت شد؛
       همان تعداد = پیش‌پرداخت قسط بعد. معوق و جریمه همیشه آخرین مقدار پیامک‌اند. در موجودی حساب نمی‌شود. ===== */
    var HK_INST_KEY = STORAGE_KEY + '_instCards';
    function hkInstLoad() {
      try { var o = JSON.parse(localStorage.getItem(HK_INST_KEY) || '{}'); if (o && typeof o === 'object' && o.cards && typeof o.cards === 'object') return o; } catch (e) {}
      return { cards: {} };
    }
    function hkInstSave(o) { return hkStorageSet(HK_INST_KEY, JSON.stringify(o)); }
    function hkInstHash(s) { var h = 5381, t = String(s || '').replace(/\s+/g, ''); for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
    function hkInstTail(t, lab) {
      var m = t.match(new RegExp(lab + '\\s*[:：]?\\s*([0-9*xX×•.\\- \\t]{4,40})'));
      if (!m) return '';
      var d = m[1].replace(/[\s\-.]/g, ''), tail = d.match(/([0-9]{4,})[^0-9]*$/);
      return tail ? tail[1].slice(-4) : '';
    }
    function hkParseInstallSms(text) {
      try {
        var t = normalizeSmsText(hkSmsUnsplit(String(text || '')));
        if (!/واریز\s*قسط/.test(t) || !/تعداد\s*اقساط/.test(t)) return null;
        var to = hkInstTail(t, 'به\\s*(?:کارت|حساب|سپرده)');
        if (!to) return null;
        var rial = !/تومان|تومن/.test(t);
        var num = function (re) { var m = t.match(re); return m ? (parseInt(m[1].replace(/[^0-9]/g, ''), 10) || 0) : 0; };
        var amt = num(/مبلغ\s*[:：]?\s*([0-9][0-9,٬]*)/), over = num(/معوق\s*[:：]?\s*([0-9][0-9,٬]*)/), pen = num(/جریمه\s*[:：]?\s*([0-9][0-9,٬]*)/);
        if (rial) { amt = Math.round(amt / 10); over = Math.round(over / 10); pen = Math.round(pen / 10); }
        var dt = null; try { dt = extractDateFromSms(t); } catch (eD) {}
        var td = getTodayPersian();
        var bank = ''; try { bank = detectBankFromSms(t) || ''; } catch (eB) {}
        var tr = t.match(/پیگیری\s*[:：]?\s*([0-9]{4,})/);
        return { to: to, from: hkInstTail(t, 'از\\s*(?:کارت|حساب|سپرده)'), amount: amt, count: num(/تعداد\s*اقساط(?:\s*پرداختی)?\s*[:：]?\s*([0-9]+)/), overdue: over, penalty: pen,
          y: (dt && dt.y) || td.y, m: (dt && dt.m) || td.m, d: (dt && dt.d) || td.d, time: hkSmsTime(t, 0), bank: bank, track: tr ? tr[1] : '' };
      } catch (e) { return null; }
    }
    function hkInstDefaultName(c) {
      var b = ''; try { b = c.bank ? (bankShortLabel(c.bank) || c.bank).replace(/^بانک\s*/, '') : ''; } catch (e) {}
      return 'قسط ' + (b ? b + ' ' : '') + toPersianDigits(c.id);
    }
    function hkInstName(c) { return (c && c.name) || hkInstDefaultName(c || {}); }
    var _hkInstRefreshT = 0;
    function hkInstIngest(info, raw) {
      if (!info || !info.to) return null;
      var o = hkInstLoad(), c = o.cards[info.to];
      if (!c) c = o.cards[info.to] = { id: info.to, bank: info.bank || '', log: [], at: Date.now(), seq: Object.keys(o.cards).length };
      if (!c.bank && info.bank) c.bank = info.bank;
      var k = info.track ? 't' + info.track : 'r' + hkInstHash(raw);
      if (c.log.some(function (e) { return e.k === k; })) return { card: c, dup: true };
      var e = { k: k, y: info.y, m: info.m, d: info.d, time: info.time || '', amount: info.amount, count: info.count, overdue: info.overdue, penalty: info.penalty, from: info.from || '', at: Date.now() };
      c.log.push(e);
      hkInstSave(o);
      clearTimeout(_hkInstRefreshT);
      _hkInstRefreshT = setTimeout(function () { try { hkInstTagRows(); } catch (eT) {} try { renderHomeCards(); } catch (eR) {} try { hkInstMigrateCheck(); } catch (eM) {} }, 400);
      return { card: c, dup: false, entry: e };
    }
    function hkInstCmp(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d) || String(a.time || '').localeCompare(String(b.time || '')) || ((a.at || 0) - (b.at || 0)); }
    /* نوع هر ردیف به ترتیب تاریخ: تعداد بیشتر از قبلی = قسط؛ همان تعداد = پیش‌پرداخت */
    function hkInstEntries(c) {
      var L = (c && c.log || []).slice().sort(hkInstCmp), prev = -1;
      return L.map(function (e) { var x = Object.assign({}, e); x.kind = (prev < 0 || e.count > prev) ? 'pay' : 'pre'; prev = Math.max(prev, e.count); return x; });
    }
    function hkInstStatus(c) {
      var L = hkInstEntries(c); if (!L.length) return null;
      var last = L[L.length - 1], lastPay = null, pre = 0;
      for (var i = L.length - 1; i >= 0; i--) { if (L[i].kind === 'pay') { lastPay = L[i]; break; } pre += Number(L[i].amount) || 0; }
      var st = (last.overdue > 0 || last.penalty > 0) ? 'bad' : (pre > 0 ? 'pre' : 'ok');
      return { st: st, last: last, lastPay: lastPay || L[0], count: last.count, pre: pre, overdue: last.overdue || 0, penalty: last.penalty || 0, n: L.length };
    }
    function hkInstCards() {
      var o = hkInstLoad();
      return Object.keys(o.cards).map(function (k) { return o.cards[k]; }).filter(function (c) { return c && c.log && c.log.length; })
        .sort(function (a, b) { return ((a.seq || 0) - (b.seq || 0)) || ((a.at || 0) - (b.at || 0)); });
    }
    /* حساب عادی‌ای که همان رقم‌های «به کارت» به آن وصل است = همان کارت قسط (در موجودی آنی نمی‌آید) */
    function hkInstLinkedLabels() {
      var out = {};
      try { hkInstCards().forEach(function (c) { var lb = hkAcc4Label(c.id); if (lb) out[lb] = c.id; }); } catch (e) {}
      return out;
    }
    function hkInstDayLabel(e) { return toPersianDigits(String(e.d)) + ' ' + MONTHS[(e.m || 1) - 1]; }
    function hkInstStatusHtml(s, two) {
      if (!s) return '';
      var sep = two ? '<br>' : '، ';
      if (s.st === 'bad') return '<span class="hk-inst-bad">معوق ' + formatNum(s.overdue) + (s.penalty ? sep + 'جریمه ' + formatNum(s.penalty) : '') + '</span>';
      /* ۱.۳.۷۷: ویرگول هم‌رنگ همان جمله */
      if (s.st === 'pre') return '<span class="hk-inst-pre">پیش‌پرداخت ' + formatNum(s.pre) + (two ? '' : '،') + '</span>' + (two ? '<br>' : ' ') + '<span class="hk-inst-mu">بعد از قسط ' + toPersianDigits(String(s.count)) + '</span>';
      return '<span class="hk-inst-ok">قسط ' + toPersianDigits(String(s.lastPay.count)) + ' پرداخت شد' + (two ? '' : '،') + '</span>' + (two ? '<br>' : ' ') + '<span class="hk-inst-mu">' + hkInstDayLabel(s.lastPay) + '</span>';
    }
    /* اسلاید باکس هوشمند: همهٔ کارت‌های قسط با وضعیت کامل؛ زدن هر ردیف = تاریخچهٔ همان کارت */
    function spPageInst() {
      var cards = hkInstCards(); if (!cards.length) return null;
      var bad = false;
      var rows = cards.map(function (c) {
        var s = hkInstStatus(c); if (s && s.st === 'bad') bad = true;
        return '<div class="sp-inst-r' + (s && s.st === 'bad' ? ' bad hk-snake' : '') + '" data-inst="' + escapeHtml(c.id) + '"><b>' + spEsc(hkInstName(c)) + (s && s.st === 'bad' ? ' <i class="hk-inst-dot"></i>' : '') + '</b><span>' + hkInstStatusHtml(s, false) + '</span></div>';
      }).join('');
      return spHead('کارت‌های قسط' + (bad ? ' <i class="hk-inst-dot"></i>' : ''), bad ? 'sp-inst-h bad' : 'sp-inst-h') + '<div class="sp-inst">' + rows + '</div>';
    }
    function spTapInst(title, tgt) {
      var r = tgt && tgt.closest && tgt.closest('[data-inst]'), id = r ? r.getAttribute('data-inst') : '';
      if (!id) { var cs = hkInstCards(), b = cs.filter(function (c) { var s = hkInstStatus(c); return s && s.st === 'bad'; })[0] || cs[0]; id = b ? b.id : ''; }
      if (id) hkOpenInstHistory(id);
    }
    function hkOpenInstHistory(id) {
      var o = hkInstLoad(), c = o.cards[id]; if (!c) return;
      var old = document.getElementById('hkInstOv'); if (old) old.remove();
      var L = hkInstEntries(c).reverse(), s = hkInstStatus(c);
      var p2 = function (n) { return toPersianDigits(String(n).padStart(2, '0')); };
      var g = function (e) { try { return hkGregStr(e.y, e.m, e.d); } catch (eG) { return ''; } };
      var ov = document.createElement('div'); ov.id = 'hkInstOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov.setAttribute('data-hk-back', '1');
      var bankTxt = (c.bank || '') + (c.bank ? ' | ' : '') + toPersianDigits(c.id) + ' | کارت قسط';
      ov.innerHTML = '<div class="hk-bulk-box hk-acctx-box hk-inst-box"><div class="hk-bulk-title">' + escapeHtml(hkInstName(c)) + '</div>' +
        '<div class="hk-acctx-src">' + escapeHtml(bankTxt) + '</div>' +
        (s && s.st === 'bad' ? '<div class="hk-inst-warn">طبق آخرین پیامک (' + hkInstDayLabel(s.last) + '):<br><b>معوق ' + formatNum(s.overdue) + ' تومان' + (s.penalty ? ' · جریمه ' + formatNum(s.penalty) + ' تومان' : '') + '</b></div>' : '') +
        '<div class="hk-inst-kp"><div>قسط‌های پرداختی<b>' + toPersianDigits(String(s ? s.count : 0)) + '</b></div><div>پیش‌پرداخت<b class="' + (s && s.pre ? 'hk-inst-pre' : '') + '">' + formatNum(s ? s.pre : 0) + '</b></div><div>معوق / جریمه<b class="' + (s && s.st === 'bad' ? 'hk-inst-bad' : '') + '">' + formatNum(s ? s.overdue + s.penalty : 0) + '</b></div></div>' +
        '<div class="hk-acctx-list hk-inst-list"><div class="hk-acctx-r hk-acctx-h hk-inst-r"><span>تاریخ</span><span>ساعت</span><span>مبلغ</span><span>قسط</span><span>نوع</span></div>' +
        L.map(function (e) {
          return '<div class="hk-acctx-r hk-inst-r"><span class="d"><b>' + toPersianDigits(String(e.y)) + '/' + p2(e.m) + '/' + p2(e.d) + '</b><small>' + escapeHtml(g(e)) + '</small></span>' +
            '<span>' + (e.time ? toPersianDigits(e.time) : '—') + '</span><span>' + formatNum(e.amount) + '</span><span>' + toPersianDigits(String(e.count)) + '</span>' +
            '<span><i class="hk-inst-chip ' + e.kind + '">' + (e.kind === 'pay' ? 'قسط' : 'پیش‌پرداخت') + '</i></span></div>';
        }).join('') + '</div>' +
        '<div class="hk-inst-note">پرداخت‌های قسط در درآمد و خرج حساب نمی‌شوند و در موجودی نمی‌آیند.</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-inst-ren">تغییر نام</button><button type="button" class="hk-bulk-close">بستن</button></div></div>';
      document.body.appendChild(ov);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.querySelector('.hk-bulk-close').onclick = close;
      /* ۱.۳.۷۷: تغییر نام در همان باکس ویرایش نرم‌افزار (ثبت / انصراف)، روی همین پنجره */
      ov.querySelector('.hk-inst-ren').onclick = function () {
        var old2 = document.getElementById('hkInstRen'); if (old2) old2.remove();
        var ro = document.createElement('div'); ro.id = 'hkInstRen'; ro.className = 'hk-re-ov'; ro.setAttribute('data-hk-back', '1');
        ro.style.zIndex = '100300';
        ro.innerHTML = '<div class="hk-re-box"><div class="hk-re-title">تغییر نام کارت قسط</div>' +
          '<div class="hk-re-f"><div class="hk-re-l">نام</div><input class="hk-re-in hk-inst-ren-in" maxlength="40"></div>' +
          '<div class="hk-re-btns"><button type="button" class="hk-re-ok">ثبت</button><button type="button" class="hk-re-no">انصراف</button></div></div>';
        var inp = ro.querySelector('.hk-inst-ren-in'); inp.value = hkInstName(c);
        var rclose = function () { ro.remove(); };
        ro._hkCancel = rclose;
        var save = function () {
          var o2 = hkInstLoad(); if (!o2.cards[id]) { rclose(); return; }
          o2.cards[id].name = String(inp.value || '').trim(); hkInstSave(o2);
          rclose(); close(); hkOpenInstHistory(id);
          try { renderBankAccountsList(); renderHomeCards(); } catch (eR) {}
        };
        ro.querySelector('.hk-re-ok').onclick = save;
        ro.querySelector('.hk-re-no').onclick = rclose;
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
        ro.addEventListener('click', function (e) { if (e.target === ro) rclose(); });
        document.body.appendChild(ro);
        setTimeout(function () { try { inp.focus(); inp.select(); } catch (eF) {} }, 60);
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    }

    /* ۱.۳.۷۶: برداشتِ هم‌مبلغ و هم‌روز از کارت‌های کاربر = پرداخت همان قسط → یک برچسب جدا «قسط مسکن ۲۹۷۹ · ۳۶» روی همان ردیف.
       شرح و دستهٔ کاربر دست نمی‌خورند (دسته در نرم‌افزار به شرح وابسته است). هر پیامک قسط فقط یک ردیف. */
    function hkInstTagRows() {
      var changed = 0, cur = periodKey(currentYear, currentMonth);
      var used = {};
      var walkAll = function (fn) { try { Object.keys(archive || {}).forEach(function (k) { fn(k === cur ? periodData : archive[k], k); }); } catch (e) {} if (!(archive && archive[cur])) fn(periodData, cur); };
      walkAll(function (pd) { ((pd && pd.expense && pd.expense.sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (r && r.instTagK) used[r.instTagK] = 1; }); }); });
      hkInstCards().forEach(function (c) {
        hkInstEntries(c).forEach(function (e) {
          if (used[e.k] || !(e.amount > 0)) return;
          var k = periodKey(e.y, e.m), pd = k === cur ? periodData : (archive && archive[k]);
          if (!pd || !pd.expense) return;
          var hit = null;
          (pd.expense.sections || []).some(function (sec) { return (sec.rows || []).some(function (r) {
            if (!r || r.deletedAt || r.instTagK || Number(r.amount) !== Number(e.amount) || (parseInt(toEnglishDigits(String(r.day || '')), 10) || 0) !== e.d) return false;
            hit = r; return true; }); });
          if (!hit) return;
          hit.instTag = hkInstName(c) + ' · ' + toPersianDigits(String(e.count));
          hit.instTagK = e.k; used[e.k] = 1; changed++;
        });
      });
      if (changed) { try { persistCurrent(); saveArchive(); scheduleSave(); renderAll(); } catch (eS) {} }
      return changed;
    }
    try { window.hkInstTagRows = hkInstTagRows; } catch (eWt) {}
    setTimeout(function () { try { if (hkInstCards().length) hkInstTagRows(); } catch (e) {} }, 5000);
    /* پیامک‌های قسطی که قبلاً به اشتباه «درآمد» ثبت شده‌اند: همان روز و همان مبلغ در درآمدها. با تأیید، پشتیبان و سطل زباله */
    var HK_INST_MIG_KEY = STORAGE_KEY + '_instMigSeen';
    function hkInstMigrateFind() {
      var out = [], seen = {};
      try { (JSON.parse(localStorage.getItem(HK_INST_MIG_KEY) || '[]') || []).forEach(function (k) { seen[k] = 1; }); } catch (e) {}
      var cur = periodKey(currentYear, currentMonth);
      hkInstCards().forEach(function (c) {
        hkInstEntries(c).forEach(function (e) {
          var k = periodKey(e.y, e.m), pd = k === cur ? periodData : (archive && archive[k]);
          if (!pd || !pd.income || !Array.isArray(pd.income.sections)) return;
          pd.income.sections.forEach(function (sec) {
            (sec.rows || []).forEach(function (r) {
              if (!r || r.deletedAt || Number(r.amount) !== Number(e.amount) || (parseInt(toEnglishDigits(String(r.day || '')), 10) || 0) !== e.d) return;
              var sk = c.id + '|' + k + '|' + (r.id || '') + '|' + r.amount + '|' + r.day;
              if (seen[sk] || out.some(function (x) { return x.row === r; })) return;
              out.push({ card: c, e: e, k: k, sec: sec, row: r, sk: sk });
            });
          });
        });
      });
      return out;
    }
    function hkInstMigrateCheck() {
      if (document.getElementById('hkInstMigOv')) return;
      var list = hkInstMigrateFind(); if (!list.length) return;
      var ov = document.createElement('div'); ov.id = 'hkInstMigOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov.setAttribute('data-hk-back', '1');
      ov.innerHTML = '<div class="hk-bulk-box"><div class="hk-bulk-title">پیامک‌های قسط در درآمدها</div>' +
        '<div class="hk-bulk-hint">این ردیف‌ها از پیامک «واریز قسط» ثبت شده‌اند و درآمد نیستند. پرداخت‌ها حالا در تاریخچهٔ کارت قسط هستند. موارد انتخاب‌شده به سطل زباله می‌روند (قابل بازگردانی) و قبلش پشتیبان گرفته می‌شود.</div>' +
        '<label class="hk-dup-row"><input type="checkbox" class="hk-dup-all" checked> همه</label><div class="hk-dup-list">' +
        list.map(function (x, i) {
          return '<label class="hk-dup-row"><input type="checkbox" class="hk-dup-chk" data-i="' + i + '" checked><span>' + toPersianDigits(String(x.e.y)) + '/' + toPersianDigits(String(x.e.m)) + '/' + toPersianDigits(String(x.e.d)) +
            ' · ' + escapeHtml((x.row.desc || '').trim() || 'واریز') + ' · <b>' + formatNum(x.row.amount) + '</b> → ' + escapeHtml(hkInstName(x.card)) + '</span></label>';
        }).join('') + '</div>' +
        '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok hk-dup-go">انتقال به سطل زباله</button><button type="button" class="hk-bulk-close">نه، بمانند</button></div></div>';
      document.body.appendChild(ov);
      var markSeen = function (arr) {
        try { var s = JSON.parse(localStorage.getItem(HK_INST_MIG_KEY) || '[]') || []; arr.forEach(function (x) { if (s.indexOf(x.sk) < 0) s.push(x.sk); }); localStorage.setItem(HK_INST_MIG_KEY, JSON.stringify(s.slice(-500))); } catch (e) {}
      };
      var close = function () { ov.remove(); };
      ov._hkCancel = function () { markSeen(list); close(); };
      ov.querySelector('.hk-bulk-close').onclick = ov._hkCancel;
      var all = ov.querySelector('.hk-dup-all'), chks = [].slice.call(ov.querySelectorAll('.hk-dup-chk')), okBtn = ov.querySelector('.hk-dup-go');
      var sync = function () { var n = chks.filter(function (c) { return c.checked; }).length; all.checked = n === chks.length; all.indeterminate = n > 0 && n < chks.length; okBtn.disabled = !n; };
      all.onchange = function () { chks.forEach(function (c) { c.checked = all.checked; }); sync(); };
      chks.forEach(function (c) { c.onchange = sync; });
      okBtn.onclick = function () {
        var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return list[+c.dataset.i]; });
        var run = function () {
          var n = 0;
          sel.forEach(function (x) {
            var i = (x.sec.rows || []).indexOf(x.row); if (i < 0) return;
            var ok = pushToTrash('row', (x.row.desc || 'واریز قسط') + ' · ' + formatNum(Number(x.row.amount) || 0), { tab: 'income', sectionId: x.sec.id, sectionTitle: x.sec.title || '', periodKey: x.k, row: JSON.parse(JSON.stringify(x.row)), sourceLabel: 'پیامک قسط' });
            if (!ok) return;
            x.sec.rows.splice(i, 1); n++;
          });
          markSeen(list);
          try { persistCurrent(); saveArchive(); scheduleSave(); } catch (eS) {}
          try { renderAll(); renderHomeCards(); } catch (eR) {}
          close();
          showToast(toPersianDigits(String(n)) + ' ردیف به سطل زباله رفت');
        };
        try { safetyBackupThen('inst-clean', run); } catch (eB) { run(); }
      };
      ov.addEventListener('click', function (e) { if (e.target === ov) ov._hkCancel(); });
      sync();
    }
    setTimeout(function () { try { if (hkInstCards().length && !document.querySelector('.modal-overlay.open, .hk-bulk-ov')) hkInstMigrateCheck(); } catch (e) {} }, 6000);
    try { Object.assign(window, { hkParseInstallSms: hkParseInstallSms, hkInstIngest: hkInstIngest, hkInstCards: hkInstCards, hkInstStatus: hkInstStatus, hkInstEntries: hkInstEntries, hkOpenInstHistory: hkOpenInstHistory, hkInstMigrateCheck: hkInstMigrateCheck, hkInstMigrateFind: hkInstMigrateFind, hkInstLinkedLabels: hkInstLinkedLabels, spPageInst: spPageInst }); } catch (eWi) {}

    /* ===== ۱.۳.۷۴: حساب‌های مسدود شده — پیامک‌های این حساب‌ها (بر اساس رقم‌های آخر) نه نشان داده می‌شوند، نه اعلان دارند،
       نه در ثبت گروهی می‌آیند. برداشتن از فهرست = برگشت کامل. ===== */
    var HK_BLOCK_KEY = STORAGE_KEY + '_smsBlocked';
    function hkBlockedLoad() { try { var a = JSON.parse(localStorage.getItem(HK_BLOCK_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && (x.d || (Array.isArray(x.s) && x.s.length)); }) : []; } catch (e) { return []; } }
    function hkBlockedSave(a) { var ok = hkStorageSet(HK_BLOCK_KEY, JSON.stringify(a || [])); try { hkSyncNotifCats(); } catch (e) {} return ok; }
    function hkSenderNorm(a) { return toEnglishDigits(String(a || '')).replace(/[\s\-()]/g, '').replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0').toLowerCase(); }
    /* مسدود با رقم‌های حساب (d) یا با فرستنده (s: برای پیامک شخصی یا پوشهٔ بی‌شماره) */
    function hkSmsBlockedHit(raw, sender) {
      var L = hkBlockedLoad(); if (!L.length) return null;
      var ds = [];
      try { var a4 = hkSmsAcc4(raw); if (a4) ds.push(String(a4)); } catch (e) {}
      try { var ip = hkParseInstallSms(raw); if (ip) { ds.push(ip.to); } } catch (e2) {}
      var sn = sender ? hkSenderNorm(sender) : '';
      for (var i = 0; i < L.length; i++) {
        var x = L[i];
        if (x.d) for (var j = 0; j < ds.length; j++) { var a = String(x.d), b = ds[j]; if (a === b || (a.length >= 4 && b.length >= 4 && (a.slice(-4) === b.slice(-4)))) return x; }
        if (x.s && sn && (x.s || []).some(function (q) { return hkSenderNorm(q) === sn; }) && (!x.nodig || !ds.length)) return x;
      }
      return null;
    }
    function hkBlockKey(x) { return x.d ? 'd:' + x.d : 's:' + (x.s || []).map(hkSenderNorm).sort().join(','); }
    function hkBlockAccount(d, bank, opt) {
      opt = opt || {};
      d = String(d || '').replace(/[^0-9]/g, '');
      var x = d ? { d: d, bank: bank || '', at: Date.now() } : { s: (opt.senders || []).filter(Boolean), bank: bank || '', nodig: !!opt.nodig, personal: !!opt.personal, at: Date.now() };
      if (!x.d && !(x.s && x.s.length)) return false;
      var L = hkBlockedLoad(), k = hkBlockKey(x); if (L.some(function (y) { return hkBlockKey(y) === k; })) return true;
      L.push(x);
      return hkBlockedSave(L);
    }
    function hkUnblockAccount(x) { var k = hkBlockKey(x), L = hkBlockedLoad().filter(function (y) { return hkBlockKey(y) !== k; }); return hkBlockedSave(L); }
    function hkBlockLabel(x) { return x.d ? toPersianDigits(x.d) : (x.s || []).map(function (q) { return toPersianDigits(String(q)); }).join('، '); }
    function hkOpenBlockedAccounts() {
      try { closeSideMenu(); } catch (e) {}
      var old = document.getElementById('hkBlockOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkBlockOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov.setAttribute('data-hk-back', '1');
      var render = function () {
        var L = hkBlockedLoad();
        ov.innerHTML = '<div class="hk-bulk-box hk-block-box"><div class="hk-bulk-title">حساب‌های مسدود شده</div>' +
          '<div class="hk-bulk-hint">پیامک‌های این حساب‌ها نادیده گرفته می‌شوند: اعلان نمی‌آید و در ثبت گروهی نشان داده نمی‌شوند. با برداشتن از فهرست، دوباره مثل قبل می‌شوند. برای مسدود کردن، در «ثبت تکی و گروهی پیامک‌ها» دکمهٔ مسدود کنار پوشهٔ آن حساب را بزنید.</div>' +
          (L.length ? '<div class="hk-block-list">' + L.map(function (x, i) {
            return '<div class="hk-block-r"><i class="hk-mi" style="--c:#aeaeb2"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M6.4 6.4l11.2 11.2"/></svg></i><div class="nm"><b>' + escapeHtml(x.bank || 'حساب') + '</b><div class="hk-acc-hint"><span dir="ltr">' + toPersianDigits(x.d) + '</span></div></div><button type="button" class="hk-block-un" data-i="' + i + '">برداشتن</button></div>';
          }).join('') + '</div>' : '<div class="hk-block-empty">حسابی مسدود نشده</div>') +
          '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-close">بستن</button></div></div>';
        ov.querySelector('.hk-bulk-close').onclick = close;
        ov.querySelectorAll('.hk-block-un').forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation(); var L2 = hkBlockedLoad(), x = L2[+b.dataset.i]; if (!x) return; L2.splice(+b.dataset.i, 1); hkBlockedSave(L2); showToast('«' + (x.bank || 'حساب') + ' ' + hkBlockLabel(x) + '» دوباره فعال شد'); render(); };
        });
      };
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
      render();
    }
    try { Object.assign(window, { hkBlockedLoad: hkBlockedLoad, hkSmsBlockedHit: hkSmsBlockedHit, hkBlockAccount: hkBlockAccount, hkUnblockAccount: hkUnblockAccount, hkOpenBlockedAccounts: hkOpenBlockedAccounts }); } catch (eWb) {}
    function parseBankSms(text) {
      const t = hkSmsUnsplit(String(text || '').trim());
      if (!t) return null;
      /* ۱.۳.۷۴: پیامک واریز قسط تراکنش حساب‌های کاربر نیست → فقط در تاریخچهٔ کارت قسط (تکراری ثبت نمی‌شود) */
      { var _ins = hkParseInstallSms(t); if (_ins) { try { hkInstIngest(_ins, t); } catch (eIn) {} return null; } }
      if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(t)) return null;
      if (isNonTransactionSms(t)) return null;
      const dt = extractDateFromSms(t);
      // amount اینجا canonical تومان است (تبدیل فقط یک‌بار داخل extractAmountFromSms)
      const amtToman = extractAmountFromSms(t);
      const amtRial = extractAmountFromSms.lastRial || 0;
      const balToman = extractBalanceFromSms(t);
      const balRial = balToman == null ? null : extractBalanceFromSms.lastRial;
      return {
        type: detectTxnTypeFromSms(t),
        amount: amtToman,
        amountRial: amtRial,
        balanceRial: balRial,
        rawSmsAmount: amtToman,
        bank: detectBankFromSms(t),
        day: dt && dt.d ? String(dt.d) : '',
        month: dt && dt.m ? dt.m : null,
        year: dt && dt.y ? dt.y : null,
        balance: balToman,
        raw: t
      };
    }
    /* «مانده/موجودی» بعد از تراکنش (تومان) — فقط برای تطبیق با موجودی اپ؛ اگر پیدا نشد null */
    function extractBalanceFromSms(text) {
      try {
        var raw = normalizeSmsText(text);
        var m = raw.match(/(?:مانده|موجودی)(?:\s*(?:حساب|قابل\s*برداشت|جدید|فعلی))?\s*[:：]?\s*([+\-]?)\s*([0-9][0-9,\.]*[0-9]|[0-9])\s*([+\-]?)/);
        if (!m) return null;
        var tok = /\.[0-9]{3}(?:\.|$)/.test(m[2]) ? m[2] : m[2].replace(/\.[0-9]{1,2}$/, '');
        var v = parseAmountToken(tok);
        if (!v && v !== 0) return null;
        if (m[1] === '-' || m[3] === '-') v = -v;
        var after = raw.slice((m.index || 0), (m.index || 0) + String(m[0]).length + 14);
        var unit = /تومان|تومن|toman/i.test(after) ? 'toman' : /ریال|rial/i.test(after) ? 'rial'
          : (/تومان|تومن|toman/i.test(raw) ? 'toman' : 'rial');
        extractBalanceFromSms.lastRial = unit === 'rial' ? v : null;
        if (unit === 'rial') v = Math.round(v / 10);
        return v;
      } catch (e) { return null; }
    }



    function smsBankPrefKey(raw) {
      const t = String(raw || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/\d{6,}/g, '#NUM#').replace(/\s+/g, ' ').trim().slice(0, 160);
      return t;
    }
    function loadSmsBankMap() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_smsBankMap') || '{}') || {}; } catch (e) { return {}; }
    }
    function getSmsBankPref(raw) {
      const map = loadSmsBankMap();
      const k = smsBankPrefKey(raw);
      return (map[k] || '').trim();
    }
    function saveSmsBankPref(raw, bank) {
      if (!raw || !bank) return;
      try {
        const map = loadSmsBankMap();
        map[smsBankPrefKey(raw)] = bank;
        // سقف ۲۰۰ ورودی
        const keys = Object.keys(map);
        if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => { delete map[k]; });
        hkStorageSet(STORAGE_KEY + '_smsBankMap', JSON.stringify(map));
      } catch (e) {}
    }
    function matchSelectedBank(bankName) {
      if (!bankName) return '';
      const list = selectedBankAccounts || [];
      if (!list.length) return '';
      const labels = selectedAccountLabels();
      const exactLabel = labels.find(n => n === bankName);
      if (exactLabel) return exactLabel;
      const short = bankShortLabel(bankName);
      const byBank = list.find(a => {
        const b = accountBank(a);
        const l = accountLabel(a);
        return b === bankName || l === bankName || bankShortLabel(b) === short || bankShortLabel(l) === short
          || (b && b.indexOf(short) >= 0) || (short && short.indexOf(bankShortLabel(b) || '') >= 0);
      });
      /* فقط برچسب حساب ساخته‌شده توسط کاربر — نام دیفالت بانک ساخته نشود */
      return byBank ? accountLabel(byBank) : '';
    }

    function ensureSmsSection(tab, preferredTitle, bag) {
      const pd = bag || periodData;
      if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
      if (!pd[tab].sections) pd[tab].sections = [];
      const title = preferredTitle || (tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی');
      let sec = pd[tab].sections.find(s => (s.title || '').trim() === title);
      if (sec) return sec;
      sec = pd[tab].sections.find(s => /بانک|پیامک|واریز|برداشت|تراکنش/i.test(s.title || ''));
      if (sec) return sec;
      sec = pd[tab].sections.find(s => !(s.title || '').trim());
      if (sec) {
        sec.title = title;
        return sec;
      }
      const nid = pd[tab].nextId || (pd[tab].sections.length + 1);
      sec = {
        id: 's' + nid + '_sms',
        title: title,
        color: tabAccentColor(tab),
        collapsed: false,
        rows: [emptyRow()]
      };
      pd[tab].sections.push(sec);
      pd[tab].nextId = nid + 1;
      return sec;
    }

    function parseAndPreviewSms() {
      const ta = document.getElementById('smsImportText');
      const text = (ta && ta.value || '').trim();
      if (!text) { showToast('متن پیامک را وارد کنید'); return; }
      if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(text)) {
        showToast('این پیامک رمز/شناسه تأیید است و تراکنش نیست');
        return;
      }
      const parsed = parseBankSms(text);
      if (!parsed) { showToast('متن نامعتبر است'); return; }
      parsed.bank = matchSelectedBank(parsed.bank);
      // حتی اگر مبلغ صفر بود، باکس تأیید را باز کن تا کاربر اصلاح کند
      if (!parsed.amount) {
        showToast('مبلغ خودکار پیدا نشد — در مرحله بعد می‌توانید ادامه دهید');
      } else if (!parsed.bank) {
        showToast('بانک تشخیص داده نشد — در صورت نیاز دستی مشخص کنید');
      }
      if (!parsed.raw) parsed.raw = String(text || '');
      pendingSmsEntry = parsed;
      closeSmsImportModal();
      openSmsConfirmModal(parsed);
      try {
        if (parsed.amount && 'Notification' in window && Notification.permission === 'granted') {
          const kind = parsed.type === 'income' ? 'واریز' : 'برداشت';
          new Notification('تراکنش بانکی — ' + kind, {
            body: (parsed.bank ? parsed.bank + ' · ' : '') + formatNum(parsed.amount) + ' تومان',
            dir: 'rtl'
          });
        }
      } catch (e) {}
    }

    function getAppMenuLayer() {
      var layer = document.getElementById('app-menu-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.id = 'app-menu-layer';
        document.body.appendChild(layer);
      }
      return layer;
    }
    function closeAllAppMenus(exceptList) {
      try {
        document.querySelectorAll('.fancy-select-list.open').forEach(function(l) {
          if (exceptList && l === exceptList) return;
          l.classList.remove('open');
          if (l._wrap) {
            l._wrap.classList.remove('is-open');
            l._wrap.style.zIndex = '';
          }
        });
      } catch (e1) {}
      try {
        if (typeof closeDarkSelects === 'function') closeDarkSelects();
      } catch (e2) {}
    }
    function bindAppMenuScrollClose() {
      if (window.__appMenuScrollBound) return;
      window.__appMenuScrollBound = true;
      function shouldIgnore(t) {
        try {
          if (!t || !t.closest) return false;
          /* ۱.۳.۵۷: اسکرول اسلایدهای باکس هوشمند فهرست باز را نبندد */
          if (t.closest('.sp-panel, .pc-smart-box')) return true;
          if (t.closest('.fancy-select-list')) return true;
          if (t.closest('.dark-select-list')) return true;
          return false;
        } catch (e) { return false; }
      }
      var lastW = window.innerWidth;
      function onScrollOrResize(e) {
        if (e && shouldIgnore(e.target)) return;
        /* لحظهٔ باز شدن فهرست (بسته شدن کیبورد، جابه‌جایی صفحه) فهرست را نبندد */
        if (Date.now() - (window._hkMenuOpenAt || 0) < 600) return;
        if (e && e.type === 'resize') {
          /* فقط تغییر عرض (چرخش صفحه)؛ تغییر ارتفاع از باز/بسته شدن کیبورد است */
          if (window.innerWidth === lastW) return;
          lastW = window.innerWidth;
        }
        closeAllAppMenus();
      }
      window.addEventListener('scroll', onScrollOrResize, true);
      document.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize, true);
      window.addEventListener('orientationchange', onScrollOrResize, true);
    }
    function enhanceAllSelectsIn(root) {
      try {
        var scope = root || document;
        scope.querySelectorAll('select').forEach(function(sel) {
          if (!sel || !sel.parentNode) return;
          if (sel.id === 'monthSelect' || sel.id === 'yearSelect') return;
          if (sel.closest && sel.closest('.dark-select')) return;
          if (sel.dataset && sel.dataset.nativeKeep === '1') return;
          enhanceSelectFont(sel);
        });
      } catch (e) {}
    }
    function enhanceSelectFont(selectEl) {
      if (!selectEl) return;
      bindAppMenuScrollClose();
      if (selectEl._fancyRender) {
        try { selectEl._fancyRender(); } catch (e) {}
        return;
      }
      if (!selectEl.parentNode) return;
      selectEl.style.display = 'none';
      selectEl.setAttribute('aria-hidden', 'true');
      var wrap = document.createElement('div');
      wrap.className = 'fancy-select-wrap';
      selectEl.parentNode.insertBefore(wrap, selectEl);
      wrap.appendChild(selectEl);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fancy-select-btn';
      var list = document.createElement('div');
      list.className = 'fancy-select-list';
      list._wrap = wrap;
      list._select = selectEl;
      try { getAppMenuLayer().appendChild(list); } catch (eL) { document.body.appendChild(list); }

      function closeList() {
        list.classList.remove('open');
        wrap.classList.remove('is-open');
        wrap.style.zIndex = '';
      }
      function positionList() {
        var rect = btn.getBoundingClientRect();
        var spaceBelow = window.innerHeight - rect.bottom;
        var width = Math.max(rect.width, 72);
        var left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        list.style.position = 'fixed';
        list.style.left = left + 'px';
        list.style.width = width + 'px';
        list.style.right = 'auto';
        list.style.zIndex = '100920';
        if (spaceBelow < 180) {
          list.style.top = 'auto';
          list.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
          list.style.maxHeight = Math.min(220, Math.max(120, rect.top - 12)) + 'px';
        } else {
          list.style.top = (rect.bottom + 4) + 'px';
          list.style.bottom = 'auto';
          list.style.maxHeight = Math.min(220, Math.max(120, spaceBelow - 12)) + 'px';
        }
      }
      function openList() {
        closeAllAppMenus(list);
        window._hkMenuOpenAt = Date.now();
        list.classList.add('open');
        wrap.classList.add('is-open');
        wrap.style.zIndex = '100910';
        positionList();
      }
      function render() {
        var opts = Array.from(selectEl.options);
        var cur = opts.find(function(o){ return o.value === selectEl.value; }) || opts[0];
        btn.textContent = cur ? cur.textContent : '';
        list.innerHTML = '';
        opts.forEach(function(o) {
          var item = document.createElement('div');
          item.className = 'fancy-select-opt' + (o.value === selectEl.value ? ' selected' : '');
          item.textContent = o.textContent;
          item.onmousedown = function(e) { e.preventDefault(); e.stopPropagation(); };
          item.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectEl.value = o.value;
            try { selectEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (eC) {}
            render();
            closeList();
          };
          list.appendChild(item);
        });
      }
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (list.classList.contains('open')) closeList();
        else openList();
      };
      if (!selectEl._fancyDocClose) {
        selectEl._fancyDocClose = function(e) {
          try {
            if (wrap.contains(e.target) || list.contains(e.target)) return;
          } catch (eX) {}
          closeList();
        };
        document.addEventListener('click', selectEl._fancyDocClose, true);
      }
      wrap.appendChild(btn);
      selectEl._fancyRender = render;
      selectEl._fancyClose = closeList;
      selectEl._fancyList = list;
      render();
      try {
        var mo = new MutationObserver(function() { try { render(); } catch (eR) {} });
        mo.observe(selectEl, { childList: true, attributes: true, subtree: true });
      } catch (eMo) {}
    }


    
    function collectFrequentDescs(limit) {
      limit = limit || 12;
      const counts = {};
      function add(s) {
        s = (s || '').trim();
        if (!s || s.length < 2) return;
        /* هیچ شرح مرتبط با اقساط در ساجست عمومی نباشد */
        if (/قسط/.test(s) || /اقساط/.test(s) || /معوق/.test(s) || /پیش‌پرداخت/.test(s)) return;
        if (s === 'واریز بانکی' || s === 'برداشت بانکی') return;
        counts[s] = (counts[s] || 0) + 1;
      }
      function scanPd(pd) {
        if (!pd) return;
        ['income', 'expense'].forEach(function(tab) {
          ((pd[tab] && pd[tab].sections) || []).forEach(function(sec) {
            (sec.rows || []).forEach(function(r) {
              if (r && r.desc) add(r.desc);
            });
          });
        });
      }
      try { scanPd(periodData); } catch (e0) {}
      try {
        Object.keys(archive || {}).forEach(function(k) {
          try { scanPd(archive[k]); } catch (e1) {}
        });
      } catch (e2) {}
      return Object.keys(counts).sort(function(a, b) {
        return counts[b] - counts[a] || a.localeCompare(b, 'fa');
      }).slice(0, limit);
    }


