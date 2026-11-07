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
        /* ۱.۳.۸۶: خانه‌های جدول با ضربه تایپ نمی‌شوند؛ ویرایش فقط با لانگ‌پرس → ویرایش */
        dayInp.readOnly = true; dayInp.tabIndex = -1;
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
          if (!isFilledVal(row.day)) { try { dayInp.blur(); } catch (eB) {} return; }
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
          dayInp.readOnly = true;
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
        desc.readOnly = true; desc.tabIndex = -1;
        if (fromPlan) {
          desc.title = 'از اقساط — قابل ویرایش نیست';
          desc.style.opacity = '0.85';
        }
        desc.onclick = (e) => {
          if (!isFilledVal(row.desc)) { try { desc.blur(); } catch (eB) {} return; }
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
          desc.readOnly = true;
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
        /* ۱.۳.۸۷: خانه‌های جدول فوکوس نمی‌گیرند تا با ضربه نشانگر متن (کرسر) چشمک نزند؛ باکس شناور همچنان باز می‌شود */
        [dayInp, desc].forEach(function (el) { el.addEventListener('mousedown', function (e) { e.preventDefault(); }); el.addEventListener('focus', function () { if (el.readOnly) { try { el.blur(); } catch (eB) {} } }); });
        if (preApp) { const tg = document.createElement('div'); tg.className = 'preapp-tag'; tg.innerHTML = HK_LOCK_SVG + '<span>پرداخت قبلی</span>'; tdDesc.appendChild(tg); }
        /* ۱.۳.۷۶: برچسب جدای قسط (شرح کاربر دست نمی‌خورد) */
        /* ۱.۳.۸۶: برچسب زرد قسط زیر شرح برداشته شد؛ به‌جایش آیکون دلار نقره‌ای در ستون ردیف (پایین‌تر) */
        tr.appendChild(tdDesc);

        // مبلغ
        const tdAmt = document.createElement('td');
        const amt = document.createElement('input');
        amt.className = 'pd-amt ' + ((row.status || 'paid') === 'paid' ? 'status-paid' : 'status-unpaid') + (isFilledVal(row.amount) ? ' pd-filled' : '');
        /* ۱.۳.۸۵: جیب به جیب: به‌جای عدد ردیف، همان آیکون دستهٔ «جیب به جیب» (مثل تیک تسویه در قرض) */
        if (row.p2p) { tr.classList.add('hk-p2p-row'); tdN.classList.add('hk-p2p-num'); tdN.title = 'جیب به جیب — در جمع حساب نشده'; numSpan.innerHTML = '<svg class="hk-p2p-rowic" viewBox="0 0 24 24" aria-label="جیب به جیب">' + HK_CAT_ICONS.p2p + '</svg>'; }
        /* ۱.۳.۸۶: ردیف پرداخت قسط: آیکون دلار نقره‌ای به‌جای عدد ردیف */
        else if (row.instTag) { tr.classList.add('hk-inst-row'); tdN.classList.add('hk-inst-num'); numSpan.innerHTML = '<svg class="hk-inst-rowic" viewBox="0 0 24 24" aria-label="پرداخت قسط">' + HK_INST_DOLLAR_SVG + '</svg>'; }
        /* ۱.۳.۸۶: ضربه روی آیکون ستون ردیف = باکس شناور «نام: توضیح» */
        if (row.p2p || row.instTag) {
          tdN.onclick = function (e) {
            try { e.stopPropagation(); } catch (eSp) {}
            const msg = row.p2p
              ? 'جیب به جیب: پولی که بین کارت‌های خودتان جابه‌جا شده؛ در جمع درآمد و مخارج حساب نمی‌شود، ولی موجودی کارت‌ها با آن درست می‌ماند.'
              : 'پرداخت قسط: ' + row.instTag + ' — در مخارج حساب می‌شود و در کارت قسط هم ثبت شده است.';
            try { showCellTextPopup(numSpan, msg, { wrap: true }); } catch (eP) {}
          };
        }
        amt.inputMode = 'numeric';
        try { amt.setAttribute('inputmode', 'numeric'); amt.setAttribute('enterkeyhint', 'done'); } catch (eAK) {}
        amt.pattern = '[0-9]*';
        amt.value = row.amount ? formatNum(row.amount) : '';
        amt.readOnly = true; amt.tabIndex = -1;
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
          const deep = theme === 'light' ? '#a87a00' : '#ffec0a';
          const col = tab === 'income' ? (paid ? green : deep) : (paid ? red : deep);
          amt.classList.toggle('pd-unpaid-deep', !paid);
          amt.classList.toggle('status-paid', paid);
          amt.classList.toggle('status-unpaid', !paid);
          amt.style.setProperty('color', col, 'important');
          amt.style.setProperty('-webkit-text-fill-color', col, 'important');
          amt.style.setProperty('caret-color', amt.readOnly ? 'transparent' : col, 'important'); /* ۱.۳.۸۷: خانهٔ فقط‌خواندنی بی نشانگر */
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
          if (!isFilledVal(row.amount)) { try { amt.blur(); } catch (eB) {} return; }
          if (document.activeElement === amt && !amt.readOnly) return;
          /* ۱.۳.۴۷: یک ضربه = مبلغ کامل در یک خط داخل باکس شناور؛ تغییر وضعیت فقط از منوی ویرایش ردیف */
          try { if (amt.readOnly) { amt.blur(); amt.scrollLeft = 0; } } catch (eBl) {}
          if (document.querySelector('.pd-amt-popup')) { closeCellTextPopups(); return; }
          try { const pp = showCellTextPopup(tdAmt, formatNum(row.amount) + ' تومان'); if (pp) { pp.classList.add('pd-amt-popup'); const rr = pp.getBoundingClientRect(), vw = window.innerWidth; let lf = rr.left; if (lf + rr.width > vw - 8) lf = vw - rr.width - 8; if (lf < 8) lf = 8; pp.style.left = Math.round(lf) + 'px'; } } catch (eOpen) {}
        };
        amt.onfocus = () => { if (amt.readOnly) { try { amt.blur(); } catch (eB) {} } };
        amt.addEventListener('mousedown', function (e) { e.preventDefault(); });
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
          amt.readOnly = true;
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
        accBtn.textContent = row.account ? shortBankDisplay(row.account) : '—';
        if (preApp) { accBtn.textContent = '—'; accBtn.classList.add('pd-acc-locked'); }
        accBtn.onclick = (e) => {
          e.stopPropagation();
          if (preApp) { lockedMsg(accBtn); return; }
          /* ۱.۳.۴۵: بانکِ ثبت‌شده فقط از باکس ویرایش عوض می‌شود؛ ردیف تازهٔ بی‌بانک همان منوی انتخاب */
          if ((row.account || '').trim()) { try { showCellTextPopup(accBtn, row.account); } catch (eP) {} return; }
          /* ۱.۳.۸۷: بانک واردنشده: فقط قاب زرد؛ انتخاب بانک فقط از لانگ‌پرس ← ویرایش */
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
        tr._hkRow = row;
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


