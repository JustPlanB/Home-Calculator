    /* ۱.۳.۹۳: بی قرمز و نارنجی‌قرمز (قرمز مخصوص «جیب به جیب» است)؛ ۱۶ رنگ اول آزاد در دو ردیف ۸تایی نشان داده می‌شود */
    /* ۱.۳.۹۴: نوشیدنی‌ها (همان سبک خطی) */
    Object.assign(HK_ICON_BANK, {
      beermug: '<path d="M5 9h10v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M5 9a2.5 2.5 0 0 1 1.5-4.4 3 3 0 0 1 4.3-1.4A3 3 0 0 1 15 5.2 2 2 0 0 1 15 9"/><path d="M8.5 12.5v5.5M11.5 12.5v5.5"/>',
      can: '<path d="M8.5 3h7"/><rect x="7" y="5" width="10" height="16" rx="1.8"/><path d="M7 9h10M7 17h10"/>',
      cheersbeer: '<g transform="rotate(12 6.5 20)"><path d="M3 8h7l-.7 12H3.7z"/><path d="M3.2 11.5h6.6"/></g><g transform="rotate(-12 17.5 20)"><path d="M14 8h7l-.7 12h-5.6z"/><path d="M14.2 11.5h6.6"/></g><path d="M12 1.8v2.2M9.4 2.8l.9 1.3M14.6 2.8l-.9 1.3"/>',
      winebottle: '<path d="M7.8 2.5h2.4v4.2l1.8 2.6V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9.3l1.8-2.6z"/><path d="M6 13.5h6"/><path d="M14.5 9h5c0 3-1 4.5-2.5 4.5S14.5 12 14.5 9z"/><path d="M17 13.5V20.5M15 20.5h4"/>',
      whiskey: '<path d="M5 6h14l-1.4 13.6a1.6 1.6 0 0 1-1.6 1.4H8a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M5.6 11h12.8"/><rect x="8" y="12.8" width="3.6" height="3.6" rx=".6"/><rect x="12.6" y="14.6" width="3.6" height="3.6" rx=".6"/>',
      cheers: '<g transform="rotate(9 6 21)"><path d="M3.5 5h5l-.4 6a2.1 2.1 0 0 1-4.2 0z"/><path d="M6 13v7.5M4 20.5h4"/></g><g transform="rotate(-9 18 21)"><path d="M15.5 5h5l-.4 6a2.1 2.1 0 0 1-4.2 0z"/><path d="M18 13v7.5M16 20.5h4"/></g><path d="M12 1.4v1.8M10.3 2.1l.6.9M13.7 2.1l-.6.9"/>',
      champagne: '<g transform="rotate(35 11 15)"><path d="M9.5 7h3v3l1.5 2v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9l1.5-2z"/><path d="M8 16h6"/></g><path d="M17.2 4.6l1.2 1.2M20.2 8.4h1.6M19.3 2.6l.5-1"/><circle cx="21.2" cy="4.6" r=".6"/>',
      sodaglass: '<path d="M6 3.5h12l-1.6 16.6a1 1 0 0 1-1 .9H8.6a1 1 0 0 1-1-.9z"/><path d="M6.5 8.5h11"/><circle cx="10" cy="12.5" r=".9"/><circle cx="13.8" cy="14.8" r=".9"/><circle cx="11" cy="17.4" r=".9"/>',
      brandy: '<path d="M7 4h10c1.6 5.6-.6 10-5 10S5.4 9.6 7 4z"/><path d="M6.3 8.5h11.4"/><path d="M12 14v6M8.5 20.5h7"/>',
      pourwine: '<g transform="translate(16 8.5) rotate(-125) scale(.95) translate(-12 -9.5)"><path d="M10.5 2h3v3l1.5 2v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V7l1.5-2z"/><path d="M9 10.5h6"/></g><path d="M9.6 12.6 9 14"/><path d="M4 15h7c0 2.8-1.4 4.4-3.5 4.4S4 17.8 4 15z"/><path d="M7.5 19.4V21.5M5.5 21.5h4"/>',
      cognac: '<path d="M7.8 2.5h2.4v4a6 6 0 1 1-2.4 0z"/><path d="M4 14h10"/><path d="M16 13h5l-.7 7.5h-3.6z"/>'
    });
    /* ۱.۳.۹۴: فقط آیکون‌های واضح در انتخاب (۱۵۰ = ۵ اسلاید کامل ۶×۵)؛ بقیهٔ بانک فقط برای نمایش دسته‌هایی که قبلاً آن‌ها را گرفته‌اند می‌ماند */
    var HK_ICON_PICK = ['plant', 'paw', 'dumbbell', 'coffee', 'luggage', 'plane', 'bicycle', 'motorcycle', 'music', 'film', 'game', 'camera', 'laptop', 'wrench',
      'brush', 'scissors', 'washer', 'flower', 'cake', 'parking', 'wifi', 'glasses', 'pill', 'charity', 'umbrella', 'fuel', 'diamond', 'ring', 'gavel', 'drop', 'soccer',
      'bandage', 'syringe', 'tooth', 'teacup', 'cocktail', 'wine', 'soda', 'burger', 'fries', 'egg', 'drumstick', 'fish', 'icecream', 'apple', 'strawberry', 'carrot',
      'chefhat', 'shoe', 'balloon', 'dice', 'tree', 'piano', 'guitar', 'sofa', 'bed', 'doghouse', 'petbowl', 'sailboat', 'dolly', 'wheelchair', 'briefcase', 'beach',
      'tent', 'dollar', 'euro', 'bitcoin', 'wallet', 'piggy', 'coins', 'cash', 'safe', 'piechart', 'speaker', 'radio', 'envelope', 'toiletpaper', 'shopbag', 'watch',
      'key', 'newspaper', 'lipstick', 'bathtub', 'phone', 'mailbox', 'alarm', 'backpack', 'blender', 'broom', 'socks', 'aircon', 'headphones', 'people', 'bank', 'masks',
      'city', 'heater', 'image', 'pineapple', 'chair', 'lock', 'watermelon', 'drill', 'award', 'wheat', 'train', 'plug', 'hospital', 'candy', 'cherry', 'chartup', 'tv',
      'moon', 'thermometer', 'calendar', 'factory', 'garage', 'globe', 'palette', 'pencil', 'bus', 'truck', 'tools', 'mic', 'monitor', 'videocam', 'ticket', 'cctv',
      'printer', 'megaphone', 'chat', 'clapper', 'user', 'star', 'paperplane', 'gear', 'cloud', 'signal', 'butterfly', 'beermug', 'can', 'cheersbeer', 'winebottle',
      'whiskey', 'cheers', 'champagne', 'sodaglass', 'brandy', 'pourwine', 'cognac'];
    /* ۱.۳.۹۴: ۸ رنگ ثابت با بیشترین تفاوت (بی قرمز، که مال جیب به جیب است)؛ رنگ دسته‌ها می‌تواند تکراری باشد */
    var HK_USER_CAT_COLORS = ['#ff9500', '#ffd60a', '#34c759', '#30d5c8', '#0a84ff', '#bf5af2', '#ff6ba8', '#a2845e'];
    function hkCatUserMap(kind) { try { var o = JSON.parse(localStorage.getItem(STORAGE_KEY + '_cat' + kind) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function hkCatUserSet(kind, id, v) { var m = hkCatUserMap(kind); if (v) m[id] = v; else delete m[id]; try { hkStorageSet(STORAGE_KEY + '_cat' + kind, JSON.stringify(m)); } catch (e) {} }
    function hkCatIco(id) {
      if (id) { var u = hkCatImgMap()[id]; if (u && /^data:image\//.test(u)) return '<img class="hk-cat-img" alt="" src="' + u + '">'; }
      if (id && !HK_CAT_ICONS[id]) { var ik = hkCatUserMap('Icon')[id]; if (ik && HK_ICON_BANK[ik]) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_ICON_BANK[ik] + '</svg>'; }
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (id ? (HK_CAT_ICONS[id] || HK_CAT_TAG) : '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1M12 16v.1"/>') + '</svg>';
    }
    /** انتخاب عکس از گالری → مربع ۱۲۸ پیکسلی (برش وسط) */
    function hkCatPickImage(id, done) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          var im = new Image();
          im.onload = function () {
            try {
              var S = 128, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
              var k = Math.min(im.width, im.height), sx = (im.width - k) / 2, sy = (im.height - k) / 2;
              var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, sx, sy, k, k, 0, 0, S, S);
              var url = cv.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(url)) url = cv.toDataURL('image/jpeg', 0.85);
              hkCatImgSet(id, url); if (done) done(url);
            } catch (e) { showToast('عکس خوانده نشد'); }
          };
          im.onerror = function () { showToast('عکس خوانده نشد'); };
          im.src = rd.result;
        };
        rd.readAsDataURL(f);
      };
      document.body.appendChild(inp); inp.click();
    }
    /** ۱.۳.۸۶: هنگام ساختن دسته: انتخاب آیکون (بانک یا گالری) و رنگ؛ بستن بی‌انتخاب = اولین آیکون و رنگِ آزاد */
    function hkCatStyleSheet(cat, done) {
      var usedI = {}, im = hkCatUserMap('Icon'), cm = hkCatUserMap('Color');
      Object.keys(im).forEach(function (k) { if (k !== cat.id) usedI[im[k]] = 1; });
      /* ۱.۳.۹۴: همهٔ ۱۵۰ آیکون همیشه سر جایشان (اسلاید آخر هم کامل)؛ آیکونی که دستهٔ دیگری گرفته کم‌رنگ و قفل است.
         رنگ‌ها: همان ۸ رنگ ثابت، تکراری هم مجاز */
      var icons = HK_ICON_PICK.filter(function (k) { return HK_ICON_BANK[k]; });
      var free = icons.filter(function (k) { return !usedI[k]; });
      var cols = HK_USER_CAT_COLORS.slice();
      var myI = im[cat.id], myC = cm[cat.id];
      var st = { icon: (myI && HK_ICON_BANK[myI] && !usedI[myI]) ? myI : (free[0] || ''), img: '', color: myC || cols[0] };
      var old = document.getElementById('hkCatStyle'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkCatStyle'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100660;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-prefs hk-pf hk-p2p-box hk-cst-box'; ov.appendChild(bx);
      var finish = function () {
        hkCatUserSet('Color', cat.id, st.color);
        if (st.img) { hkCatImgSet(cat.id, st.img); hkCatUserSet('Icon', cat.id, ''); } else { hkCatImgSet(cat.id, ''); hkCatUserSet('Icon', cat.id, st.icon); }
        ov.remove(); if (done) done();
      };
      ov._hkCancel = finish;
      var prev = function () {
        var pv = bx.querySelector('.hk-cst-prev'); if (!pv) return;
        pv.style.setProperty('--cc', st.color);
        pv.querySelector('i').innerHTML = st.img ? '<img class="hk-cat-img" alt="" src="' + st.img + '">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (HK_ICON_BANK[st.icon] || HK_CAT_TAG) + '</svg>';
        bx.querySelectorAll('.hk-cst-ic').forEach(function (b) { b.classList.toggle('on', !st.img && b.dataset.k === st.icon); b.style.setProperty('--cc', st.color); });
        bx.querySelectorAll('.hk-cst-col').forEach(function (b) { b.classList.toggle('on', b.dataset.c === st.color); });
      };
      bx.innerHTML = '<div class="hk-prefs-t" style="margin-bottom:10px;">آیکون و رنگ «' + escapeHtml(cat.label) + '»</div>' +
        '<div class="sms-cat-grid hk-cat-colored" style="grid-template-columns:1fr;justify-items:center;margin:0 0 8px;"><div class="sms-cat on hk-cst-prev"><i></i><span>' + escapeHtml(cat.label) + '</span></div></div>' +
        '<div class="hk-cst-cols"></div><div class="hk-cst-sl"><div class="hk-cst-track"></div></div><div class="hk-cst-dots"></div>' +
        '<div class="hk-rax-acts"><button type="button" class="modal-btn hk-cst-gal">عکس از گالری</button><button type="button" class="modal-btn yes hk-cst-ok">تأیید</button></div>';
      var cw = bx.querySelector('.hk-cst-cols');
      cols.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-cst-col'; b.dataset.c = c; b.style.background = c; b.setAttribute('aria-label', 'رنگ'); b.onclick = function () { st.color = c; prev(); }; cw.appendChild(b); });
      /* ۱.۳.۹۳: آیکون‌ها در اسلایدهای ۶ ستون × ۵ ردیف که با کشیدن ورق می‌خورند؛ دایره‌های زیر = شمار و جای اسلاید؛ رنگ‌ها بالا ثابت */
      var tr = bx.querySelector('.hk-cst-track'), sl = bx.querySelector('.hk-cst-sl'), dw = bx.querySelector('.hk-cst-dots'), PER = 30;
      for (var pi = 0; pi * PER < icons.length; pi++) {
        var gw = document.createElement('div'); gw.className = 'hk-cst-grid hk-cat-colored'; tr.appendChild(gw);
        icons.slice(pi * PER, pi * PER + PER).forEach(function (k) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat hk-cst-ic' + (usedI[k] ? ' hk-cst-used' : ''); b.dataset.k = k; b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + HK_ICON_BANK[k] + '</svg></i>'; b.onclick = function () { if (usedI[k]) { showToast('این آیکون را دستهٔ دیگری دارد'); return; } st.icon = k; st.img = ''; prev(); }; gw.appendChild(b); });
        var dt = document.createElement('button'); dt.type = 'button'; dt.className = 'hk-cst-dot' + (pi ? '' : ' on'); dt.setAttribute('aria-label', 'اسلاید ' + (pi + 1));
        (function (n) { dt.onclick = function () { sl.scrollTo({ left: -n * sl.clientWidth, behavior: 'smooth' }); }; })(pi);
        dw.appendChild(dt);
      }
      if (dw.children.length < 2) dw.style.display = 'none';
      sl.addEventListener('scroll', function () { var n = Math.round(Math.abs(sl.scrollLeft) / Math.max(1, sl.clientWidth)); [].forEach.call(dw.children, function (d, i) { d.classList.toggle('on', i === n); }); }, { passive: true });
      bx.querySelector('.hk-cst-gal').onclick = function () { hkCatPickImage('__tmp', function (url) { hkCatImgSet('__tmp', ''); st.img = url; prev(); }); };
      bx.querySelector('.hk-cst-ok').onclick = finish;
      document.body.appendChild(ov);
      prev();
    }
    try { window.hkCatIco = hkCatIco; window.hkCatImgSet = hkCatImgSet; window.hkCatPickImage = hkCatPickImage; window.hkCatStyleSheet = hkCatStyleSheet; window.HK_ICON_BANK = HK_ICON_BANK; window.HK_ICON_PICK = HK_ICON_PICK; } catch (eCi) {}
    try { window.hkAddIncomeCat = hkAddIncomeCat; window.hkInCustomLoad = hkInCustomLoad; } catch (eIc) {}
    /* ۱.۳.۴۸: دسته‌های واریز (کوتاه) */
    var HK_INCOME_CATS = [
      { id: 'in_salary', label: 'حقوق' }, { id: 'in_rent', label: 'اجاره' }, { id: 'in_loanback', label: 'تسویه قرض' } /* ۱.۳.۶۸: جای «اضافه‌کار» */,
      { id: 'in_bonus', label: 'پاداش' }, { id: 'in_gift', label: 'هدیه و کمک' }, { id: 'in_sale', label: 'فروش' }, { id: 'in_profit', label: 'سود' }
    ];
    /* ۱.۳.۸۷: دسته‌های درآمدِ ساخت کاربر (شناسه با «in_u_» تا مثل بقیهٔ دسته‌های درآمد روی ردیف بنشیند) */
    var HK_IN_CUSTOM_KEY = STORAGE_KEY + '_inCustom';
    function hkInCustomLoad() { try { var a = JSON.parse(localStorage.getItem(HK_IN_CUSTOM_KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && /^in_u_/.test(x.id) && x.label; }) : []; } catch (e) { return []; } }
    function hkInCustomSync(list) {
      (list || hkInCustomLoad()).forEach(function (c) { if (!HK_INCOME_CATS.some(function (x) { return x.id === c.id; })) HK_INCOME_CATS.push({ id: c.id, label: c.label, custom: true }); });
    }
    function hkInCustomSave() { try { localStorage.setItem(HK_IN_CUSTOM_KEY, JSON.stringify(HK_INCOME_CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; }))); } catch (e) {} }
    function hkAddIncomeCat(label) {
      label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!label || HKCategorizer.labelTaken(label)) return null;
      var c = { id: 'in_u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: label, custom: true };
      HK_INCOME_CATS.push(c); hkInCustomSave();
      return c;
    }
    hkInCustomSync();
    HK_CAT_ICONS.in_salary = '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>';
    /* ۱.۳.۸۳: اجاره = کلید (با «لوازم خانه» یکی نباشد) */
    HK_CAT_ICONS.in_rent = '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M18 12v3.2M15 12v2.2"/>';
    /* ۱.۳.۸۳: تسویه قرض = سکه روی دست (فلش‌ها مال «جیب به جیب» شد) */
    HK_CAT_ICONS.in_loanback = '<circle cx="14.5" cy="6" r="3"/><path d="M2 13.5h3.5L9 12h4.2a1.6 1.6 0 0 1 0 3.2H10"/><path d="M5.5 20.5H13l6.6-4.4a1.6 1.6 0 0 0-1.9-2.6l-4.2 2.3"/><path d="M2 20.5h3.5"/>';
    /* ۱.۳.۸۳: پاداش = مدال گل‌دار با تیک و دو روبان */
    HK_CAT_ICONS.in_bonus = '<path d="M12 2.3L13.6 3.5L15.6 3.3L16.4 5.1L18.2 5.9L18 7.9L19.2 9.5L18 11.1L18.2 13.1L16.4 13.9L15.6 15.7L13.6 15.5L12 16.7L10.4 15.5L8.4 15.7L7.6 13.9L5.8 13.1L6 11.1L4.8 9.5L6 7.9L5.8 5.9L7.6 5.1L8.4 3.3L10.4 3.5z"/><circle cx="12" cy="9.5" r="3.6"/><path d="M10.4 9.6l1.1 1.1 2.2-2.3"/><path d="M9 15.6l-1.8 5.6 2.3-.9 1.4 2 1-3.9M15 15.6l1.8 5.6-2.3-.9-1.4 2-1-3.9"/>';
    HK_CAT_ICONS.in_gift = HK_CAT_ICONS.gift;
    /* ۱.۳.۸۳: فروش = چرخ خرید با فلش رو به بالا */
    HK_CAT_ICONS.in_sale = '<path d="M2 4h3l2.3 10.5h11.4L21 6.5H5.9"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M13.2 12.6V7.8M11.2 9.8l2-2 2 2"/>';
    HK_CAT_ICONS.in_profit = '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>';
    /* شمار استفادهٔ هر دسته در ثبت پیامک (برای چیدن ۵ دستهٔ اول) */
    function hkCatUseLoad() { try { var o = JSON.parse(localStorage.getItem(STORAGE_KEY + '_catUse') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
    function hkCatUseBump(id) { try { var o = hkCatUseLoad(); o[id] = (o[id] || 0) + 1; localStorage.setItem(STORAGE_KEY + '_catUse', JSON.stringify(o)); } catch (e) {} try { hkSyncNotifCats(); } catch (e2) {} }
    /* ۱.۳.۵۰: چهار دستهٔ پرکاربرد (هزینه/درآمد) برای دکمه‌های اعلان پیامک */
    function hkSyncNotifCats() {
      var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.BankSms;
      if (!P || typeof P.setNotifCats !== 'function') return;
      var use = hkCatUseLoad();
      var top4 = function (list, kind) { return list.map(function (c, i) { return { c: c, s: hkCatScore(kind, c.id, use, i) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4).map(function (x) { return { k: x.c.id, l: x.c.label }; }); };
      var out = []; try { out = top4(HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); }), 'out'); } catch (e) {}
      var inc = []; try { inc = top4(HK_INCOME_CATS.slice(), 'in'); } catch (e) {}
      /* ۱.۳.۵۱: برای تشخیص «بی‌مشکل» در خود اعلان: رقم‌های حساب‌های شناخته‌شده و مبلغ درآمدهای ثابت (تومان و ریال) */
      var acc4 = [];
      try { var mp = (typeof smsAccountBankMap === 'object' && smsAccountBankMap) || {}; Object.keys(mp).forEach(function (k) { var m = /^L4:(\d{3,})$/.exec(k); if (m && mp[k] && isLiveAccountLabel(mp[k])) acc4.push(m[1]); }); } catch (e) {}
      var rec = [];
      try { (recurringIncomes || []).forEach(function (r) { var a = Math.round(Number(r && r.amount) || 0); if (a > 0) { rec.push(String(a)); rec.push(String(a * 10)); } }); } catch (e) {}
      try { P.setNotifCats({ out: JSON.stringify(out), inc: JSON.stringify(inc), acc4: JSON.stringify(acc4), rec: JSON.stringify(rec), personal: hkPrefs().nPersonal === false ? '0' : '1', block: JSON.stringify(hkBlockedLoad().filter(function (x) { return x.d; }).map(function (x) { return String(x.d).slice(-4); })), blockS: JSON.stringify([].concat.apply([], hkBlockedLoad().filter(function (x) { return !x.d && x.s && x.personal; }).map(function (x) { return x.s.map(hkSenderNorm); }))) }).catch(function () {}); } catch (e) {}
    }
    try { window.hkSyncNotifCats = hkSyncNotifCats; } catch (eW) {}
    setTimeout(function () { try { hkSyncNotifCats(); } catch (e) {} }, 4000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { try { hkSyncNotifCats(); } catch (e) {} } });
    function closeSmsCatMore() { var o = document.getElementById('smsCatMore'); if (o) { o.remove(); return true; } return false; }
    /* ۱.۳.۷۶: رنگ هر دسته (آیکون‌های رنگی، یکسان در باکس پیامک و ویرایش ردیف) */
    /* ۱.۳.۸۳: رنگ ثابت و یکتای هر دسته (همه‌جا همین؛ CLAUDE.md). فقط «هدیه و کمک» در مخارج و درآمد مشترک است.
       جیب به جیب نقره‌ای با قاب نقطه‌چین: معلوم باشد چیز متفاوتی است */
    var HK_CAT_COLORS = { food: '#ff9f0a', transport: '#4f9dff', bills: '#e6b12c', home: '#c78b5a', clothing: '#ff6ba8', health: '#16a34a',
      education: '#7c7cff', fun: '#30d5c8', gift: '#e85dff', debt: '#8e8e93', tech: '#64d2ff',
      in_salary: '#9ee858', in_rent: '#bf5af2', in_loanback: '#c0ca33', in_bonus: '#ffd60a', in_gift: '#e85dff', in_sale: '#ffb38a', in_profit: '#32d74b', p2p: '#ff453a' };
    /* ۱.۳.۸۴: سلامت و بهداشت سبز پررنگ، جیب به جیب قرمز (همچنان یکتا) */
    /* ۱.۳.۸۶: آیکون دلار نقره‌ای ردیف پرداخت قسط (ستون ردیف) */
    var HK_INST_DOLLAR_SVG = '<path d="M12 3v18"/><path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3S9.5 10.5 12 11s4.5 1.3 4.5 3.5-2 3.5-4.5 3.5-4.5-1.3-4.5-3"/>';
    function hkCatColor(id) { return HK_CAT_COLORS[id] || (id && hkCatUserMap('Color')[id]) || '#08b5f5'; }
    /* پنجرهٔ انتخاب دسته با همان چیدمان ۵ستونی رنگی (برای ویرایش ردیف) */
    function hkCatPickSheet(cats, cur, onPick, kind) {
      var old = document.getElementById('hkCatPick'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkCatPick'; ov.className = 'modal-overlay open sms-cat-more-ov'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100650;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box sms-cat-more-box';
      bx.innerHTML = '<div class="sms-cat-more-t">دسته</div>';
      var gg = document.createElement('div'); gg.className = 'sms-cat-grid hk-cat-colored';
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      /* ۱.۳.۸۰: «نامشخص» آخرین دسته */
      cats.concat([{ id: '', label: 'نامشخص' }]).forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat' + (c.id === cur ? ' on' : ''); b.dataset.cat = c.id;
        b.style.setProperty('--cc', c.id ? hkCatColor(c.id) : '#8e8e93');
        b.innerHTML = '<i>' + hkCatIco(c.id) + '</i><span>' + escapeHtml(c.label) + '</span>';
        if (c.id === 'p2p') hkP2PDecorate(b);
        b.onclick = function () { close(); onPick(c.id); if (c.id === 'p2p') hkP2PIntro(false); };
        gg.appendChild(b);
      });
      /* ۱.۳.۸۷: «دستهٔ جدید» همین‌جا (مخارج یا درآمد): اسم ← آیکون/گالری و رنگ ← انتخاب روی همین ردیف */
      if (kind === 'in' || kind === 'out') {
        var plus = document.createElement('button'); plus.type = 'button'; plus.className = 'sms-cat sp-pick-tadd hk-cp-add'; plus.style.setProperty('--cc', '#08b5f5');
        plus.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i><span>دستهٔ جدید</span>';
        plus.onclick = function () {
          if (bx.querySelector('.sp-pick-new')) return;
          var wrap = document.createElement('div'); wrap.className = 'sp-pick-new';
          var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'sp-pick-input'; inp.placeholder = 'نام دستهٔ جدید'; inp.maxLength = 24; inp.setAttribute('enterkeyhint', 'done');
          var okb = document.createElement('button'); okb.type = 'button'; okb.className = 'sp-pick on'; okb.textContent = 'افزودن';
          var msg = document.createElement('div'); msg.className = 'sp-pick-err';
          var save = function () {
            if (HKCategorizer.labelTaken(inp.value)) { msg.textContent = 'دسته‌ای با این اسم هست'; return; }
            var cat = kind === 'in' ? hkAddIncomeCat(inp.value) : HKCategorizer.addCustom(inp.value);
            if (!cat) { try { inp.focus(); } catch (e) {} return; }
            close();
            hkCatStyleSheet(cat, function () { onPick(cat.id); });
          };
          okb.onclick = save;
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          inp.addEventListener('input', function () { msg.textContent = HKCategorizer.labelTaken(inp.value) ? 'دسته‌ای با این اسم هست' : ''; });
          wrap.appendChild(inp); wrap.appendChild(okb); wrap.appendChild(msg);
          plus.style.display = 'none';
          bx.appendChild(wrap);
          setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
        };
        gg.appendChild(plus);
      }
      bx.appendChild(gg); ov.appendChild(bx);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
    }
    function hkSmsCatGrid(parsed) {
      var old = document.getElementById('smsCatGrid'); if (old) old.remove();
      window._hkSmsCat = '';
      if (!parsed) return;
      var desc = document.getElementById('smsConfirmDesc'); if (!desc) return;
      /* ۱.۳.۴۸: درآمد هم دسته‌های کوتاه خودش را دارد؛ دسته‌ها در یک نوار افقی جمع‌وجور (با یک ضربه) */
      var cats = [];
      if (parsed.type === 'income') cats = HK_INCOME_CATS.slice();
      else { try { cats = HKCategorizer.categories.filter(function (c) { return c && c.id && (HK_INSTALLMENTS_ON || c.id !== 'debt'); }); } catch (e) { return; } }
      cats = cats.concat([HK_P2P_CAT]);
      if (!cats.length) return;
      /* ۱.۳.۴۹: فقط ۵ دستهٔ هوشمند در یک ردیف (بی اسکرول) + «بیشتر…»؛ زدن هر دسته = ثبت همان لحظه (یک کلیک).
         ترتیب: دستهٔ حدس‌زده از شرح/متن پیامک، بعد پرکاربردترین‌ها، بعد ترتیب پیش‌فرض */
      var use = hkCatUseLoad(), guess = '';
      try { if (parsed.type !== 'income') { var gc = HKCategorizer.classify(String(desc.value || '') || String(parsed.raw || '')); if (gc && gc.ids && gc.ids[0]) guess = gc.ids[0]; } } catch (eG) {}
      var order = cats.map(function (c, i) { return { c: c, s: (c.id === guess ? 1e6 : 0) + hkCatScore(parsed.type === 'income' ? 'in' : 'out', c.id, use, i) }; })
        .sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.c; });
      /* ۱.۳.۷۶: دو ردیف پنج‌تایی (۹ دسته + «بیشتر»)، آیکون‌های رنگی */
      /* ۱.۳.۸۸: سه ردیف پنج‌تایی (۱۵ خانه)؛ بیشتر از ۱۵ دسته ← خانهٔ پانزدهم «بیشتر…» */
      var top = order.length > 15 ? order.slice(0, 14) : order.slice(0, 15), rest = order.length > 15 ? order.slice(14) : [];
      var g = document.createElement('div'); g.id = 'smsCatGrid'; g.className = 'sms-cat-grid sms-cat-row hk-cat-colored';
      /* ۱.۳.۵۰: زدن دسته فقط انتخاب است؛ با «ثبت»: شرح نوشته‌شده می‌ماند (دسته = همین)، شرح خالی = اسم دسته */
      var pick = function (c) {
        window._hkSmsCat = window._hkSmsCat === c.id ? '' : c.id;
        var more = g.querySelector('.sms-cat-more');
        g.querySelectorAll('.sms-cat').forEach(function (x) { x.classList.toggle('on', x.dataset.cat === window._hkSmsCat); });
        if (more) { var inTop = top.some(function (t) { return t.id === window._hkSmsCat; }); more.classList.toggle('on', !!window._hkSmsCat && !inTop); var sp = more.querySelector('span'); if (sp) sp.textContent = (!!window._hkSmsCat && !inTop) ? (rest.filter(function (t) { return t.id === window._hkSmsCat; })[0] || {}).label || 'بیشتر…' : 'بیشتر…'; }
        try { closeSmsCatMore(); } catch (eM) {}
      };
      var mk = function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sms-cat'; b.dataset.cat = c.id;
        b.style.setProperty('--cc', hkCatColor(c.id));
        b.innerHTML = '<i>' + hkCatIco(c.id) + '</i><span>' + escapeHtml(c.label) + '</span>';
        if (c.id === 'p2p') hkP2PDecorate(b);
        b.onclick = function () { pick(c); if (c.id === 'p2p' && window._hkSmsCat === 'p2p') { try { hkP2PIntro(false); } catch (e) {} } };
        return b;
      };
      top.forEach(function (c) { g.appendChild(mk(c)); });
      if (rest.length) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'sms-cat sms-cat-more';
        more.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg></i><span>بیشتر…</span>';
        more.onclick = function () {
          closeSmsCatMore();
          var ov = document.createElement('div'); ov.id = 'smsCatMore'; ov.className = 'modal-overlay open sms-cat-more-ov';
          ov.style.cssText = 'z-index:100650;display:flex;align-items:center;justify-content:center;';
          var bx = document.createElement('div'); bx.className = 'modal-box sms-cat-more-box';
          bx.innerHTML = '<div class="sms-cat-more-t">دستهٔ دیگر</div>';
          var gg = document.createElement('div'); gg.className = 'sms-cat-grid hk-cat-colored';
          rest.forEach(function (c) { gg.appendChild(mk(c)); });
          bx.appendChild(gg); ov.appendChild(bx);
          ov.addEventListener('click', function (e) { if (e.target === ov) closeSmsCatMore(); });
          document.body.appendChild(ov);
        };
        g.appendChild(more);
      }
      var sug = document.getElementById('smsPlanSuggest');
      var anc = sug || desc._micWrap || desc;
      if (anc.parentNode) anc.parentNode.insertBefore(g, anc.nextSibling);
      /* ۱.۳.۸۸: نام دسته یک‌خطی و کامل (بی «…»): اگر جا نشد، فقط همان نام کمی ریزتر می‌شود */
      /* ۱.۳.۸۹: نام دسته با فونت عادی، در صورت نیاز دوخطی (بدون ریز شدن) */
    }
    function hkFitCatLabels(root) {
      (root || document).querySelectorAll('.sms-cat > span').forEach(function (sp) {
        sp.style.fontSize = '';
        var fs = parseFloat(getComputedStyle(sp).fontSize) || 11, min = 7.5, guard = 0;
        while (sp.scrollWidth > sp.clientWidth + 0.5 && fs > min && guard++ < 20) { fs -= 0.5; sp.style.fontSize = fs + 'px'; }
      });
    }
    (function () {
      if (typeof openSmsConfirmModal === 'function' && !openSmsConfirmModal._hkCat) {
        var _o = openSmsConfirmModal;
        var w = function (parsed) { var r = _o.apply(this, arguments); try { hkSmsCatGrid(parsed); } catch (e) {} return r; };
        Object.keys(_o).forEach(function (k) { try { w[k] = _o[k]; } catch (eK) {} });
        w._hkCat = true;
        openSmsConfirmModal = w; try { window.openSmsConfirmModal = w; } catch (eW) {}
      }
      if (typeof confirmSmsEntry === 'function' && !confirmSmsEntry._hkCat) {
        var _c = confirmSmsEntry;
        var wc = function () {
          var cat = window._hkSmsCat, d = document.getElementById('smsConfirmDesc');
          /* ۱.۳.۸۲: جیب به جیب: ردیف تازه علامت می‌خورد (در جمع‌ها حساب نمی‌شود)؛ دسته‌بندی شرح یاد گرفته نمی‌شود */
          if (cat === 'p2p') {
            var _t0 = Date.now(), _amt0 = 0; try { _amt0 = parseAmount(document.getElementById('smsConfirmAmount').value) || 0; } catch (eA0) {}
            var _res0 = _c.apply(this, arguments);
            try {
              var mdl0 = document.getElementById('smsConfirmModal');
              if (!(mdl0 && mdl0.classList.contains('open'))) { hkP2PMarkRecent(_t0, _amt0); window._hkSmsCat = ''; }
            } catch (eP0) {}
            return _res0;
          }
          var icat = HK_INCOME_CATS.find(function (c) { return c.id === cat; });
          var lab = icat ? icat.label : (cat && HKCategorizer.byId[cat] ? HKCategorizer.byId[cat].label : '');
          if (cat && d && !String(d.value || '').trim()) d.value = lab;
          var txt = d ? String(d.value || '').trim() : '';
          var res = _c.apply(this, arguments);
          try {
            var mdl = document.getElementById('smsConfirmModal');
            if (cat && txt && mdl && !mdl.classList.contains('open')) { if (!icat) HKCategorizer.learn(txt, [cat]); hkCatUseBump(cat); window._hkSmsCat = ''; }
          } catch (eL) {}
          return res;
        };
        Object.keys(_c).forEach(function (k) { try { wc[k] = _c[k]; } catch (eK) {} });
        wc._hkCat = true;
        confirmSmsEntry = wc; try { window.confirmSmsEntry = wc; } catch (eW2) {}
      }
    })();
    /* ===== ۱.۳.۴۰: ساعت و پیوست‌های ثبت تکیِ پیامک همان لحظهٔ ساختن/پر کردن ردیف روی خود ردیف =====
       ساعت از متن پیامک (مثلاً «۰۷۲۶-۱۲:۵۵»)، وگرنه زمان رسیدن پیامک، وگرنه همین لحظه. هر مسیر ثبت (ردیف عادی، قسط، معوق،
       درآمد ثابت، ردیف ایمنی) hkSmsStamp(row) را صدا می‌زند؛ دیگر ردیف بعداً با حدس (مبلغ/زمان ساخت) پیدا نمی‌شود. */
    function hkSmsStamp(row) {
      if (!row) return row;
      var c = window._hkSmsCur;
      if (!c) return row;
      if (c.time && !row.time) row.time = c.time;
      if (_smsAtt.list.length) {
        var items = _smsAtt.list.slice();
        _smsAtt.list = [];
        if (!Array.isArray(row.att)) row.att = [];
        items.forEach(function (a) {
          if (a._blob) HKAttach.get(a.id).then(function (bl) { if (!bl) return HKAttach.put(a.id, a._blob); }).catch(function () { try { HKAttach.put(a.id, a._blob); } catch (e) {} });
          var cp = Object.assign({}, a); delete cp._blob; delete cp._rcpt; row.att.push(cp);
        });
        try { hkSmsAttRender(); } catch (e) {}
      }
      return row;
    }
    (function () {
      var orig = confirmSmsEntry;
      if (typeof orig !== 'function' || orig._hkTime) return;
      var w = function () {
        var pe = pendingSmsEntry;
        var tm = pe ? (hkSmsTime(pe.raw || '', 0) || hkSmsTime('', Number(pe.ts || pe.date) || Date.now())) : '';
        /* تا پیامک بعدی باز شود معتبر است (ثبت ممکن است بعد از پنجرهٔ تطبیق موجودی انجام شود) */
        window._hkSmsCur = pe ? { time: tm, raw: pe.raw } : null;
        return orig.apply(this, arguments);
      };
      for (var k in orig) { try { w[k] = orig[k]; } catch (eK) {} }
      w._hkTime = true;
      confirmSmsEntry = w;
      try { window.confirmSmsEntry = w; } catch (eW) {}
    })();
    /* ===== ۱.۳.۸۴: «پیامک‌های نفهمیده» =====
       پیامکی که شکل تراکنش دارد ولی مبلغش خوانده نشد، کنار گذاشته نمی‌شود: در فهرستی روی همین گوشی می‌ماند تا کاربر
       نوع و مبلغ را بگوید؛ نرم‌افزار کلمهٔ کنار عدد را یاد می‌گیرد و پیامک‌های بعدی همان شکل را خودش می‌خواند. */
    var HK_SMS_UNREAD_KEY = STORAGE_KEY + '_smsUnread', HK_SMS_LEARN_KEY = STORAGE_KEY + '_smsLearn';
    function hkSmsUnreadLoad() { try { var a = JSON.parse(localStorage.getItem(HK_SMS_UNREAD_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hkSmsUnreadSave(a) { try { localStorage.setItem(HK_SMS_UNREAD_KEY, JSON.stringify(a.slice(-60))); } catch (e) {} try { hkSmsUnreadMenu(); } catch (e2) {} }
    function hkSmsLooksTx(text) {
      var t = normalizeSmsText(text);
      if (!t || !/[0-9]{3,}/.test(t)) return false;
      if (!/برداشت|واریز|خرید|انتقال|مبلغ|مانده|موجودی|پرداخت|کسر|بستانکار|بدهکار/.test(t)) return false;
      try { if (isOtpOrAuthSms(t)) return false; } catch (e) {}
      var nt = false; try { nt = isNonTransactionSms(t); } catch (e2) {}
      return nt !== 'failed' && nt !== 'promo' && nt !== 'empty';
    }
    function hkSmsUnreadAdd(text, sender) {
      if (!hkSmsLooksTx(text)) return false;
      var a = hkSmsUnreadLoad(), raw = String(text || '').trim();
      if (a.some(function (x) { return x.t === raw; })) return true;
      a.push({ t: raw, s: String(sender || ''), at: Date.now() });
      hkSmsUnreadSave(a);
      return true;
    }
    function hkSmsLearnLoad() { try { var a = JSON.parse(localStorage.getItem(HK_SMS_LEARN_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hkReEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    /* شکل یادگرفته: کلمهٔ پیش از مبلغ (مثلاً «مبلغ‌برداشتی») → نوع و واحد */
    function hkSmsLearnedParse(text) {
      var t = normalizeSmsText(text), L = hkSmsLearnLoad();
      for (var i = 0; i < L.length; i++) {
        var m = t.match(new RegExp(hkReEsc(L[i].w) + '\\s*[:：=]?\\s*[+\\-]?\\s*([0-9][0-9,٬]*)'));
        if (!m) continue;
        var v = parseInt(m[1].replace(/[^0-9]/g, ''), 10) || 0; if (!v) continue;
        var k = Number(L[i].k) || (L[i].r ? 0.1 : 1);
        if (k >= 1000 && !new RegExp(hkReEsc(L[i].w) + '\\s*[:：=]?\\s*[+\\-]?\\s*[0-9][0-9,٬]*\\s*هزار').test(t)) continue;
        var amt = Math.round(v * k);
        var dt = null; try { dt = extractDateFromSms(t); } catch (eD) {}
        var bal = null; try { bal = extractBalanceFromSms(t); } catch (eB) {}
        return { type: L[i].type === 'income' ? 'income' : 'expense', amount: amt, amountRial: amt * 10, rawSmsAmount: amt, balance: bal, balanceRial: null,
          bank: (function () { try { return detectBankFromSms(t) || ''; } catch (e) { return ''; } })(), day: dt && dt.d ? String(dt.d) : '', month: dt && dt.m ? dt.m : null, year: dt && dt.y ? dt.y : null, raw: t, _learned: true };
      }
      return null;
    }
    /* کاربر مبلغ (تومان) و نوع را گفت → عددِ برابر (تومان یا ریال) در متن پیدا و کلمهٔ پیش از آن یاد گرفته می‌شود */
    function hkSmsLearnFrom(text, amount, type) {
      var t = normalizeSmsText(text), re = /([^\s0-9:：=+\-]{2,24})\s*[:：=]?\s*[+\-]?\s*([0-9][0-9,٬]*)(\s*هزار\s*(ریال)?)?/g, m, hit = null;
      while ((m = re.exec(t))) {
        var v = parseInt(m[2].replace(/[^0-9]/g, ''), 10) || 0;
        var k = m[3] ? (m[4] ? 100 : 1000) : (v === amount ? 1 : (v === amount * 10 ? 0.1 : 0));
        if (k && Math.round(v * k) === amount) { hit = { w: m[1], k: k }; break; }
      }
      if (!hit || /مانده|موجودی|حساب|کارت/.test(hit.w)) return false;
      var L = hkSmsLearnLoad().filter(function (x) { return x.w !== hit.w; });
      L.push({ w: hit.w, type: type, k: hit.k });
      try { localStorage.setItem(HK_SMS_LEARN_KEY, JSON.stringify(L.slice(-30))); } catch (e) {}
      return true;
    }
    /* آیتم منو فقط وقتی فهرست خالی نیست (زیر «پیامک‌های ثبت‌نشده») */
    function hkSmsUnreadMenu() {
      var n = hkSmsUnreadLoad().length, el = document.getElementById('menuSmsUnread');
      if (!n) { if (el) el.remove(); return; }
      if (!el) {
        var after = document.getElementById('menuSmsLater'); if (!after || !after.parentNode) return;
        el = document.createElement('button'); el.className = 'menu-item'; el.id = 'menuSmsUnread'; el.type = 'button';
        el.onclick = function () { try { closeSideMenu(); } catch (e) {} hkOpenSmsUnread(); };
        after.parentNode.insertBefore(el, after.nextSibling);
      }
      el.innerHTML = '<i class="hk-mi" style="--c:#ffd60a"><svg viewBox="0 0 24 24"><path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H9.5L5 20.5V17h-.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.3M12 13.9v.1"/></svg></i>پیامک‌های نفهمیده <b class="hk-unread-n">' + toPersianDigits(String(n)) + '</b>';
    }
    function hkOpenSmsUnread() {
      var old = document.getElementById('hkSmsUnread'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkSmsUnread'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:100600;display:flex;align-items:center;justify-content:center;';
      var bx = document.createElement('div'); bx.className = 'modal-box hk-prefs hk-pf hk-p2p-box'; bx.style.maxWidth = '380px';
      ov.appendChild(bx); document.body.appendChild(ov);
      var close = function () { ov.remove(); }; ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var paint = function () {
        var a = hkSmsUnreadLoad();
        bx.innerHTML = '<div class="hk-prefs-t" style="margin-bottom:6px;">پیامک‌های نفهمیده</div>' +
          '<div style="font-size:var(--hk-fs-small);color:var(--muted,#98989f);line-height:1.8;margin-bottom:10px;">این پیامک‌ها شبیه تراکنش بودند ولی مبلغشان را نفهمیدم. نوع و مبلغ را بگویید تا ثبت شود؛ همین شکل پیامک دفعهٔ بعد خودش خوانده می‌شود. چیزی از گوشی بیرون نمی‌رود.</div>' +
          '<div class="hk-unr-list" style="overflow-y:auto;max-height:56vh;display:flex;flex-direction:column;gap:10px;"></div>' +
          '<div class="hk-rax-acts"><button type="button" class="modal-btn hk-unr-close">بستن</button></div>';
        bx.querySelector('.hk-unr-close').onclick = close;
        var list = bx.querySelector('.hk-unr-list');
        if (!a.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted,#98989f);padding:14px 0;">چیزی نمانده ✓</div>'; return; }
        a.slice().reverse().forEach(function (it) {
          var card = document.createElement('div'); card.className = 'hk-unr-card';
          card.innerHTML = '<div class="hk-unr-t"></div><div class="hk-unr-row"><div class="hk-unr-seg"><button type="button" data-ty="expense" class="on">برداشت</button><button type="button" data-ty="income">واریز</button></div>' +
            '<input class="hk-unr-amt" inputmode="numeric" placeholder="مبلغ (تومان)" dir="ltr"></div>' +
            '<div class="hk-unr-btns"><button type="button" class="modal-btn yes hk-unr-ok">ثبت</button><button type="button" class="modal-btn no hk-unr-del">تراکنش نیست</button></div>';
          card.querySelector('.hk-unr-t').textContent = it.t;
          var ty = 'expense';
          card.querySelectorAll('.hk-unr-seg button').forEach(function (b) { b.onclick = function () { ty = b.getAttribute('data-ty'); card.querySelectorAll('.hk-unr-seg button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
          var amtI = card.querySelector('.hk-unr-amt');
          amtI.addEventListener('input', function () { var v = parseAmount(amtI.value) || 0; amtI.value = v ? formatNum(v) : ''; });
          var drop = function () { hkSmsUnreadSave(hkSmsUnreadLoad().filter(function (x) { return x.t !== it.t; })); };
          card.querySelector('.hk-unr-del').onclick = function () { drop(); paint(); };
          card.querySelector('.hk-unr-ok').onclick = function () {
            var amt = parseAmount(amtI.value) || 0;
            if (!amt) { try { amtI.focus(); } catch (e) {} showToast('مبلغ را بنویسید'); return; }
            try { hkSmsLearnFrom(it.t, amt, ty); } catch (eL) {}
            var t = normalizeSmsText(it.t), dt = null; try { dt = extractDateFromSms(t); } catch (eD) {}
            var bal = null; try { bal = extractBalanceFromSms(t); } catch (eB) {}
            var bank = ''; try { bank = hkBankOfSms(it.t, it.s) || ''; } catch (eBk) {}
            var parsed = { type: ty, amount: amt, amountRial: amt * 10, rawSmsAmount: amt, balance: bal, balanceRial: null, bank: matchSelectedBank(bank), day: dt && dt.d ? String(dt.d) : '', month: dt && dt.m ? dt.m : null, year: dt && dt.y ? dt.y : null, raw: it.t };
            if (it.s) parsed.sender = it.s;
            drop(); close();
            try { openSmsConfirmModal(parsed); } catch (eO) { showToast('باز کردن باکس ثبت ممکن نشد'); }
          };
          list.appendChild(card);
        });
      };
      paint();
    }
    try { window.hkOpenSmsUnread = hkOpenSmsUnread; window.hkSmsUnreadAdd = hkSmsUnreadAdd; window.hkSmsLearnedParse = hkSmsLearnedParse; window.hkSmsUnreadLoad = hkSmsUnreadLoad; } catch (eWu) {}
    try { setTimeout(function () { try { hkSmsUnreadMenu(); } catch (e) {} }, 1200); } catch (eUm) {}

    function enqueueBankSms(smsText, opts) {
      opts = opts || {};
      if (typeof isOtpOrAuthSms === 'function' && isOtpOrAuthSms(smsText)) return false;
      /* ۱.۳.۷۴: حساب مسدود → بی‌صدا نادیده */
      if (hkSmsBlockedHit(smsText, opts.sender)) { try { cancelNativeSmsNotification(opts.nid, true); } catch (eNb) {} return false; }
      { var _ins = hkParseInstallSms(smsText);
        if (_ins) {
          var _ir = hkInstIngest(_ins, String(smsText || ''));
          try { cancelNativeSmsNotification(opts.nid); } catch (eNc) {}
          if (_ir && !_ir.dup && !opts.silent) showToast('پرداخت قسط در «' + hkInstName(_ir.card) + '» ثبت شد');
          return true;
        } }
      let parsed = parseBankSms(smsText);
      if (!parsed || !parsed.amount) {
        /* ۱.۳.۸۴: شکلی که کاربر قبلاً یاد داده؛ وگرنه به «پیامک‌های نفهمیده» می‌رود (بی‌صدا گم نمی‌شود) */
        var _lp = null; try { _lp = hkSmsLearnedParse(smsText); } catch (eLp) {}
        if (_lp) parsed = _lp;
        else {
          var _kept = false; try { _kept = hkSmsUnreadAdd(smsText, opts.sender); } catch (eUa) {}
          if (!opts.silent) showToast(_kept ? 'پیامک را نفهمیدم؛ در «پیامک‌های نفهمیده» ماند' : 'پیامک بانکی قابل تشخیص نبود');
          return false;
        }
      }
      /* ۱.۳.۸۳: اسم بانک در متن نبود → از فرستنده؛ اگر بود → فرستنده یاد گرفته شود */
      /* ۱.۳.۸۵: بانک با امتیازدهی؛ فرستنده فقط از اسم «کامل» بانک در متن یاد گرفته می‌شود */
      try { var _bs = hkBankOfSms(smsText, opts.sender || ''); if (_bs) parsed.bank = _bs; if (opts.sender) { var _nb = hkBankFullInText(smsText); if (_nb) hkSenderLearn(opts.sender, _nb); } } catch (eSb) {}
      parsed.bank = matchSelectedBank(parsed.bank);
      parsed.raw = parsed.raw || String(smsText || '');
      if (opts.nid) parsed.nid = opts.nid;
      if (opts.sender) parsed.sender = String(opts.sender);
      if (opts.quick) { parsed._quick = true; parsed._quickDesc = String(opts.quickDesc || ''); parsed._quickCat = String(opts.quickCat || ''); parsed._quickOpen = !!opts.quickOpen; opts.silent = true; }
      const rawKey = String(smsText || '').trim();
      if (rawKey) {
        if (pendingSmsEntry && String(pendingSmsEntry.raw || '').trim() === rawKey) return false;
        if (smsPendingQueue.some(x => x && String(x.raw || '').trim() === rawKey)) return false;
      }
      smsPendingQueue.push(parsed);
      try { hkPendingRefresh(); } catch (ePr) {}
      /* صف به ترتیب تاریخ خود پیامک (نه زمان رسیدن)؛ پیامک‌های یک روز به همان ترتیب رسیدن می‌مانند */
      try {
        const dk = (x) => ((parseInt(x && x.year, 10) || 0) * 10000) + ((parseInt(x && x.month, 10) || 0) * 100) + (parseInt(x && x.day, 10) || 0);
        smsPendingQueue.sort((a, b) => dk(a) - dk(b));
      } catch (eS) {}
      try {
        const total = smsPendingQueue.length + (isSmsConfirmOpen() ? 1 : 0);
        if ('Notification' in window && Notification.permission === 'granted') {
          const kind = parsed.type === 'income' ? 'واریز' : 'برداشت';
          const title = total > 1
            ? (toPersianDigits(total) + ' تراکنش بانکی')
            : ('تراکنش بانکی — ' + kind);
          const body = total > 1
            ? ('آخرین: ' + (parsed.bank ? parsed.bank + ' · ' : '') + formatNum(parsed.amount) + ' تومان')
            : ((parsed.bank ? parsed.bank + ' · ' : '') + formatNum(parsed.amount) + ' تومان');
          try {
            new Notification(title, {
              body: body,
              dir: 'rtl',
              tag: 'hesab-bank-sms',
              renotify: true
            });
          } catch (eN) {
            try { new Notification(title, { body: body, dir: 'rtl' }); } catch (e2) {}
          }
        } else if (!opts.silent) {
          showToast(total > 1 ? (toPersianDigits(total) + ' پیامک بانکی در صف') : 'پیامک بانکی تشخیص داده شد');
        }
      } catch (e) {
        if (!opts.silent) showToast('پیامک بانکی تشخیص داده شد');
      }
      processNextSmsInQueue();
      return true;
    }
    function processNextSmsInQueue() {
      if (isSmsConfirmOpen()) return;
      if (!smsPendingQueue.length) {
        pendingSmsEntry = null;
        return;
      }
      const next = smsPendingQueue.shift();
      pendingSmsEntry = next;
      openSmsConfirmModal(next);
      try { showSmsSenderWarning(next); } catch (eW) {}
      /* پیامک داخل نرم‌افزار دیده شد → نوتیف همان پیامک از نوار بالا و عدد روی آیکن حذف شود */
      cancelNativeSmsNotification(next && next.nid);
      if (smsPendingQueue.length) {
        try { showToast(toPersianDigits(smsPendingQueue.length) + ' پیامک دیگر در صف'); } catch (e) {}
      }
    }
