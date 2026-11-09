    /* ۱.۳.۷۹: آیکون‌های مشترک نرم‌افزار — هر جای تازه همین شکل‌های قبلی را می‌گیرد (مداد ویرایش؛ × قرمز حذف) */
    var HK_EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    var HK_DEL_X = '×';
    /* ۱.۳.۹۵: تیک یکسان همه‌جا (همان تیک ردیف تسویه‌شدهٔ قرض)، نه حرف ✓ */
    var HK_TICK_SVG = '<svg class="hk-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    /* ۱.۳.۸۲: دستهٔ «جیب به جیب» — هم در مخارج هم در درآمدها؛ ردیفش در هیچ جمع درآمد/مخارج نمی‌آید ولی موجودی کارت‌ها را تغییر می‌دهد */
    var HK_P2P_CAT = { id: 'p2p', label: 'جیب به جیب' };
    /* ۱.۳.۸۳: کاشی «جیب به جیب» همه‌جا: کلاس + ⓘ گوشه (نیمی داخل، نیمی بیرون کاشی؛ جزو آیکون نیست) */
    function hkP2PDecorate(b) {
      if (!b || b.querySelector('.hk-p2p-info')) return b;
      b.classList.add('hk-p2p-cat');
      var inf = document.createElement('em'); inf.className = 'hk-p2p-info'; inf.setAttribute('role', 'button'); inf.setAttribute('aria-label', 'توضیح جیب به جیب'); inf.textContent = 'i';
      inf.addEventListener('click', function (ev) { ev.stopPropagation(); ev.preventDefault(); try { hkP2PIntro(true); } catch (e) {} });
      (b.querySelector('i') || b).appendChild(inf);
      return b;
    }
    try { var _cp = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform(); if (_cp === 'android') document.documentElement.classList.add('cap-android'); if (_cp === 'ios') { document.documentElement.classList.add('cap-ios'); var _vm = document.querySelector('meta[name="viewport"]'); if (_vm && _vm.content.indexOf('viewport-fit') < 0) _vm.content += ', viewport-fit=cover'; } } catch (eCp) {}
    /* —— فلش پروژه: نیمه بالا/پایین با دو رنگ + اینر‌شدوی تیره (شناسه یکتا برای هر فیلتر) —— */
    (function () {
      var n = 0;
      /* راهنمای کشیدن: فقط «هل» دوره‌ای دایره به سمت «پروژه» (بدون فلش/نقطه) */
      window.rowAddArrowSvg = function () {
        n++;
        return '';
      };
    })();

    /* —— ویبره: اول پلاگین بومی (اندروید APK)، بعد navigator.vibrate (کروم/وب) —— */
    (function () {
      function webVibrate(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
      }
      window.appHaptic = function (ms) {
        ms = ms || 10;
        try {
          var C = window.Capacitor, P = C && C.Plugins;
          var pl = P && (P.NativeHaptic || P.Haptics);
          if (pl && typeof pl.vibrate === 'function') {
            var r = pl.vibrate({ duration: ms });
            if (r && typeof r.catch === 'function') r.catch(function () { webVibrate(ms); });
            return;
          }
        } catch (e) {}
        webVibrate(ms);
      };
    })();
    
    /* balance-layout-resize */
    try { document.addEventListener('DOMContentLoaded', function(){ try { enhanceTableAddTabs(document); refreshAllShapeFrames(); } catch(e){} }); setTimeout(function(){ try { refreshAllShapeFrames(); } catch(e){} }, 100); } catch(e){}

    try {
      window.addEventListener('resize', function(){ try { if (typeof syncBalancePanelLayout === 'function') syncBalancePanelLayout(); } catch(e){} });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function(){ try { if (typeof syncBalancePanelLayout === 'function') syncBalancePanelLayout(); } catch(e){} });
      }
    } catch (e) {}

    

    /* build-stamp: 2026-09-30-v188-AFTER | greet-on-card + box4-tweak + cols + roll-rev */
    /* VERSION: PENTA — rollback target: ZETA */
    const COLORS = [
      '#08b5f5', '#30d158', '#64d2ff', '#ff9f0a',
      '#ff453a', '#bf5af2', '#ac8e68', '#5e5ce6',
      '#ff375f', '#32ade6', '#a2845e', '#8e8e93'
    ];
    // هدر یکسان برای همه بخش‌ها — فقط نقطه رنگی متمایز است
    function colorForTitle(title) {
      return pastelCardForTitle(title).cssBg;
    }
    /* پنج تصویر پس‌زمینهٔ کارت حذف شد: با CSS پنهان بودند (.person-card-bg { display:none }) و رابطی برای انتخابشان نبود.
       آرایهٔ خالی نگه داشته شده تا مسیر کد و شاخص ذخیره‌شدهٔ bg در cardMeta دست‌نخورده بماند. */
    const CARD_BACKGROUNDS = [];
    const PASTEL_CARD_PALETTE = [
      { solid: '#03055b' },
      { solid: '#3d0c02' },
      { solid: '#013220' },
      { solid: '#280137' }
    ];
    function pastelCardForTitle(title) {
      const s = (title || '').trim() || 'x';
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const p = PASTEL_CARD_PALETTE[(h >>> 0) % PASTEL_CARD_PALETTE.length];
      return {
        from: p.solid,
        to: p.solid,
        text: '#ffffff',
        solid: p.solid,
        cssBg: p.solid
      };
    }
    function sectionPaidUnpaidTotal(sec, opts) {
      opts = opts || {};
      let paid = 0, unpaid = 0;
      (sec.rows || []).forEach(r => {
        /* ۱.۳.۸۲: «جیب به جیب» (جابه‌جایی بین کارت‌های خود) در هیچ جمع درآمد/مخارج حساب نمی‌شود؛ فقط موجودی کارت‌ها */
        if (r && r.p2p && !opts.withP2P) return;
        if (opts.personalIncomeOnly && typeof isPersonalIncomeRow === 'function' && !isPersonalIncomeRow(r)) return;
        /* مخارج پروژه: فقط سهم پیش‌پرداخت شخصی روی موجودی شخصی اثر بگذارد */
        if (opts.personalExpenseOnly && r) {
          var fcE = rowFinancialContext(r);
          if (fcE.classification === 'third_party' || fcE.accountType === 'project') {
            var adv = Number(fcE.personalAdvanceAmount) || 0;
            var pAmt = Number(fcE.projectAmount) || 0;
            if (pAmt || adv) {
              if (!adv) return; // کاملاً از موجودی پروژه
              var aAdv = adv;
              if (r.status === 'paid') paid += aAdv; else unpaid += aAdv;
              return;
            }
            // داده قدیمی بدون allocation
            if (fcE.fundingSource === 'subject') return;
            // fundingSource personal → کل مبلغ شخصی
          }
        }
        const a = Number(r.amount) || 0;
        if (r.status === 'paid') paid += a; else unpaid += a;
      });
      return { paid: paid, unpaid: unpaid, total: paid + unpaid };
    }

    function tabAccentColor(tab) {
      const t = tab || currentTab;
      if (t === 'income') return '#39ff14';
      if (t === 'expense') return '#ff2d55';
      if (t === 'balance') return '#00d4ff';
      if (t === 'install') return '#bf5af2';
      if (t === 'ledger') return '#ffea00';
      return '#08b5f5';
    }
    function tabNeonClass(tab) {
      return 'neon-' + (tab || currentTab);
    }
    function dotForTitle(title) {
      return tabAccentColor(currentTab);
    }
    function allSectionTitles() {
      // فقط ماه جاری — هدرهای درآمد و مخارج
      const set = new Set();
      ['expense', 'income'].forEach(tab => {
        (periodData[tab] && periodData[tab].sections || []).forEach(s => {
          const t = (s.title || '').trim();
          if (t) set.add(t);
        });
      });
      return Array.from(set);
    }
    function allTitlesForSuggest() {
      // برای پیشنهاد عنوان: آرشیو هم
      const set = new Set(allSectionTitles());
      Object.keys(archive || {}).forEach(k => {
        const pd = archive[k];
        if (!pd) return;
        ['expense', 'income'].forEach(tab => {
          (pd[tab] && pd[tab].sections || []).forEach(s => {
            const t = (s.title || '').trim();
            if (t) set.add(t);
          });
        });
      });
      return Array.from(set);
    }
    function syncTitleColors(title) {
      const bg = colorForTitle(title);
      const dot = dotForTitle(title);
      ['expense', 'income'].forEach(tab => {
        (periodData[tab].sections || []).forEach(s => {
          if ((s.title || '').trim() === (title || '').trim()) {
            s.color = dot;
            s.headerBg = bg;
          }
        });
      });
    }
    const MONTHS = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
      'مرداد', 'شهریور', 'مهر', 'آبان',
      'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    const STORAGE_KEY = 'hesabKetabArchive_v5';
    /* —— Supabase (حساب مشترک) — این مقادیر را فقط در کد قرار دهید؛ در UI نمایش داده نمی‌شوند —— */
    /* Supabase — فقط اتصال و Anonymous Auth در این مرحله */
    const SUPABASE_URL = '';
    /* Publishable (anon) key را خودتان اینجا قرار دهید — هرگز Service Role نگذارید */
    const SUPABASE_ANON_KEY = '';
    const SHARE_MAX_MEMBERS = 0; /* 0 = بدون سقف */
    const OWNERSHIP_LOCK_MSG = 'اطلاعات، متعلق به کاربر دیگریست و قابل تغییر نمی‌باشد';
    const PLAN_LOCK_MSG = 'برای ویرایش از بخش اقساط اقدام کنید';
    const SUPABASE_ENABLED = false; /* ابر کاملاً غیرفعال — بدون Supabase/Firebase */
    let supabaseClient = null;

    const APP_VERSION = '5.1.0';
    const APP_VERSION_FA = '۱.۳.۱۰';   /* فقط اگر نسخهٔ واقعی از اندروید خوانده نشد */
    const YEAR_START = 1390;
    const YEAR_END = 1420;

    /* ساعت تراکنش (از پیامک): در یک روز، ردیف‌های ساعت‌دار به ترتیب ساعت؛ بی‌ساعت آخرِ همان روز */
    /* ۱.۳.۶۸: یک مرتب‌کنندهٔ مشترک برای جدول‌هایی که ردیف چند ماه دارند (مثل پروژه‌ها): اول ماه به آخر ماه،
       هم‌روزها با ساعت؛ جهت از «شخصی‌سازی» (قدیمی بالا = پیش‌فرض / جدید بالا) */
    function hkRowYmd(r) {
      var k = String((r && r.key) || ''), m = k.match(/^(\d{3,4})-(\d{1,2})$/), y = m ? +m[1] : 0, mo = m ? +m[2] : 0;
      var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10) || 0;
      return y * 10000 + mo * 100 + d;
    }
    function hkSortRowsByDate(rows) {
      var dir = 1; try { dir = hkSortDir(); } catch (e) {}
      return rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
        var da = hkRowYmd(a.r), db = hkRowYmd(b.r);
        if (da !== db) return (da - db) * dir;
        return (hkTimeCmp(a.r, b.r) * dir) || a.i - b.i;
      }).map(function (x) { return x.r; });
    }
    function hkTimeCmp(a, b) {
      var ta = (a && a.time) || '', tb = (b && b.time) || '';
      if (ta && tb) return ta < tb ? -1 : ta > tb ? 1 : 0;
      return ta ? -1 : tb ? 1 : 0;
    }
    /* ۱.۳.۴۲: پیامک‌های چندبخشیِ قدیمی (تا ۱.۳.۴۱) که گیرندهٔ اندروید تکه‌هایشان را با «\n» وصل می‌کرد: پیامک فارسی
       هر ۶۷ نویسه یک تکه است، پس «0727-17:33» گاهی «0727-1⏎7:33» ذخیره شده. «\n» سرِ مرز تکه‌ها فقط وقتی برداشته می‌شود
       که با برداشتنش تاریخ/ساعت کامل (مثل MMDD-HH:MM یا YY/MM/DD-HH:MM) پیدا شود و قبلاً نبود (متن سالم دست نمی‌خورد) */
    function hkSmsUnsplit(raw) {
      var HK_SMS_DT_RE = /\d{4}\s*[-–]\s*\d{1,2}:\d{2}|\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[-–]\s*\d{1,2}:\d{2}/;
      var s = String(raw || '');
      if (s.length < 69 || s.indexOf('\n') < 0 || HK_SMS_DT_RE.test(toEnglishDigits(s))) return s;
      var out = '', i = 0;
      while (i < s.length) { out += s.slice(i, i + 67); i += 67; if (s.charAt(i) === '\n') i++; }
      return out !== s && HK_SMS_DT_RE.test(toEnglishDigits(out)) ? out : s;
    }
    /* ساعت از متن پیامک (مثل «0520-10:00») وگرنه از زمان رسیدن پیامک؛ خروجی «HH:MM» */
    function hkSmsTime(body, ts) {
      var t = toEnglishDigits(hkSmsUnsplit(String(body || ''))), m, last = null, re = /(?:^|[^\d:])([01]?\d|2[0-3])[:٫.]([0-5]\d)(?::[0-5]\d)?(?![\d:])/g;
      while ((m = re.exec(t))) last = m;
      if (last) return ('0' + last[1]).slice(-2) + ':' + last[2];
      if (ts > 0) { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      return '';
    }
    /* فقط داخل هر دنبالهٔ پشت‌سرهمِ هم‌روز به ترتیب ساعت (ترتیب روزها و ردیف‌های دیگر دست نمی‌خورد) */
    function hkSortRunsByTime(rows) {
      var out = [], i = 0;
      while (i < rows.length) {
        var d = parseInt(rows[i] && rows[i].day, 10) || 0, j = i + 1;
        while (d && j < rows.length && (parseInt(rows[j] && rows[j].day, 10) || 0) === d) j++;
        var run = rows.slice(i, j).map(function (x, k) { return { x: x, k: k }; });
        if (run.length > 1) run.sort(function (A, B) { return hkTimeCmp(A.x, B.x) || A.k - B.k; });
        run.forEach(function (o) { out.push(o.x); });
        i = j;
      }
      return out;
    }
    function emptyRow(forTab) {
      const tab = (forTab === 'income' || forTab === 'expense') ? forTab : (typeof currentTab !== 'undefined' ? currentTab : 'expense');
      // درآمد: دریافت‌شده؛ مخارج: پرداخت‌شده
      const st = 'paid';
      return { id: '', day: '', desc: '', amount: 0, status: st, account: '', createdBy: '', createdByName: '', createdAt: 0, updatedAt: 0, deletedAt: null };
    }
    function emptySections() {
      // بدون هدر پیش‌فرض — کاربر خودش بخش می‌سازد
      return [];
    }
    function emptyPeriodData() {
      return {
        expense: { sections: emptySections(), nextId: 1 },
        income: { sections: emptySections(), nextId: 1 },
        ledger: { sections: [], nextId: 1 },
        cardMeta: {}
      };
    }
    function emptyLedgerRow() {
      return { id: '', day: '', desc: '', amount: 0, status: 'credit', createdBy: '', createdByName: '', createdAt: 0, updatedAt: 0, deletedAt: null };
    }
    function emptyLedgerSection() {
      return {
        id: 'l' + Date.now().toString(36),
        personA: '',
        personB: '',
        collapsed: true,
        rows: [emptyLedgerRow()]
      };
    }
    function normalizeLedger(led) {
      if (!led || typeof led !== 'object') return { sections: [], nextId: 1 };
      // مهاجرت از مدل قدیمی (rows تخت)
      if (Array.isArray(led.rows) && !led.sections) {
        const groups = {};
        led.rows.forEach(r => {
          const a = (r.from || '').trim();
          const b = (r.to || '').trim();
          if (!a && !b && !r.amount && !r.desc) return;
          const key = a + '\t' + b;
          if (!groups[key]) groups[key] = { personA: a, personB: b, rows: [] };
          groups[key].rows.push({
            day: r.day !== undefined ? String(r.day) : '',
            desc: (r.desc || ''),
            amount: Number(r.amount) || 0,
            status: 'debt'
          });
        });
        const sections = Object.keys(groups).map((k, i) => ({
          id: 'l' + (i + 1),
          personA: groups[k].personA,
          personB: groups[k].personB,
          collapsed: false,
          rows: groups[k].rows.length ? groups[k].rows : [emptyLedgerRow()]
        }));
        return { sections: sections, nextId: sections.length + 1 };
      }
      const sections = Array.isArray(led.sections) ? led.sections : [];
      return {
        nextId: led.nextId || (sections.length + 1),
        /* همهٔ فیلدهای بخش و ردیف (تسویه، زمان، شناسه، پیوست، ماه اصلی ردیف منتقل‌شده و …) نگه داشته می‌شوند؛
           پیش‌تر فقط پنج فیلد می‌ماند و «تسویه‌شده» با هر بار باز شدن ماه پاک می‌شد */
        sections: sections.map(s => ({
          ...s,
          id: s.id || ('l' + Date.now().toString(36)),
          personA: (s.personA || '').trim(),
          personB: (s.personB || '').trim(),
          collapsed: !!s.collapsed,
          rows: (Array.isArray(s.rows) && s.rows.length ? s.rows : [emptyLedgerRow()]).map(r => ({
            ...r,
            day: r.day !== undefined && r.day !== null ? String(r.day) : '',
            desc: (r.desc || ''),
            amount: Number(r.amount) || 0,
            status: (r.status === 'credit' || r.status === 'paid') ? 'credit' : 'debt',
            ...(r.statusPicked ? { statusPicked: true } : {})
          }))
        }))
      };
    }
    function emptyPlan() {
      return {
        id: 'p' + Date.now(),
        isNew: true,
        name: '',
        amount: 0,
        interestRate: 0,
        startDay: '',
        grantMonth: '',
        grantYear: '',
        startMonth: '',
        startYear: '',
        count: '',
        paidCount: 0,
        /** ۱.۳.۳۷: «تعداد قسط پرداخت شده» در لحظهٔ ساخت/ویرایش دستی = قسط‌های گذشته (قفل) */
        lockedCount: 0,
        /** اتصال به بخش مخارج (مثل درآمد ثابت → درآمد) */
        expenseSectionId: '',
        expenseSectionTitle: '',
        editing: true,
        isNew: true
      };
    }

    function findExpenseSectionForPlan(pd, plan) {
      if (!pd || !pd.expense || !pd.expense.sections) return null;
      const title = (plan.expenseSectionTitle || '').trim();
      if (title) {
        const byTitle = pd.expense.sections.find(s => (s.title || '').trim() === title);
        if (byTitle) return byTitle;
      }
      const id = plan.expenseSectionId || '';
      if (id) {
        const byId = pd.expense.sections.find(s => s.id === id);
        if (byId) return byId;
      }
      /* همان کارت با املای دیگر (ی/ي، فاصله، نیم‌فاصله)، یا بخشی که ردیف‌های همین قسط در آن است (ردیف‌ها گم نشوند) */
      if (title && typeof hkNormTitle === 'function') {
        const nt = hkNormTitle(title);
        const byNorm = pd.expense.sections.find(s => hkNormTitle(s.title) === nt);
        if (byNorm) return byNorm;
      }
      const byRows = pd.expense.sections.find(s => (s.rows || []).some(r => r && r.fromPlanId === plan.id));
      return byRows || null;
    }

    function planInstallmentDesc(plan, index, count) {
      const name = (plan.name || '').trim() || 'قسط';
      return 'قسط ' + toPersianDigits(index + 1) + ' از ' + toPersianDigits(count) + ' — ' + name;
    }

    /**
     * همگام‌سازی ردیف‌های خودکار اقساط با بخش مخارج برای یک ماه مشخص.
     * اگر قسط تمام شده باشد ردیف ساخته نمی‌شود.
     */
    /* ماه ساخت قسط (شمسی، y*100+m) از createdAt */
    var _planCkCache = {};
    function planCreatedKey(plan) {
      if (!plan || !plan.createdAt) return 0;
      var ck = plan.id + ':' + plan.createdAt;
      if (ck in _planCkCache) return _planCkCache[ck];
      var v = 0;
      try {
        var parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'numeric' }).formatToParts(new Date(Number(plan.createdAt) || plan.createdAt));
        var g = function (t) { return parseInt(toEnglishDigits((parts.find(function (x) { return x.type === t; }) || {}).value || '0'), 10) || 0; };
        v = g('year') * 100 + g('month');
      } catch (e) { v = 0; }
      _planCkCache[ck] = v;
      return v;
    }
    /* ۱.۳.۳۷ — قسط‌های گذشته (قفل): همان «تعداد قسط پرداخت شده» که کاربر موقع ساختن (یا ویرایش دستی) قسط وارد کرده (plan.lockedCount).
       این قسط‌ها پیش از ثبت در نرم‌افزار پرداخت شده‌اند و تراکنش واقعی‌شان (اگر هست) ردیف بانکی جداست؛ پس ردیف قسطشان فقط برای دیدن است:
       مبلغ صفر (مبلغ قسط فقط کم‌رنگ نشان داده می‌شود)، بی بانک، در هیچ جمعی (خرج کل، موجودی، جستجو، آمار) حساب نمی‌شود و ویرایش نمی‌شود.
       قسط‌های قدیمی بی lockedCount: قسط‌هایی که سررسیدشان پیش از ماه ساخت قسط بوده (حداکثر تا تعداد پرداخت‌شده). */
    function planPreCreationCount(plan) {
      var ck = planCreatedKey(plan); if (!ck) return 0;
      var cnt = Math.max(0, parseInt(plan.count, 10) || 0), n = 0;
      for (var i = 0; i < cnt; i++) { var d = null; try { d = dueDateForInstallment(plan, i); } catch (e) {} if (!d || d.y * 100 + d.m >= ck) break; n++; }
      return n;
    }
    function planLockedCount(plan) {
      if (!plan) return 0;
      var cnt = Math.max(0, parseInt(plan.count, 10) || 0), paid = Math.min(cnt, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      var L = parseInt(plan.lockedCount, 10);
      if (isNaN(L)) L = planPreCreationCount(plan);
      return Math.max(0, Math.min(paid, L));
    }
    /* ۱.۳.۴۶: منوی اقساط فعلاً پنهان (حذف نشده)؛ ردیف خودکار قسط ساخته نمی‌شود و پیامک به قسط وصل نمی‌شود.
       پرداخت قسط مثل هر برداشت دیگر ثبت می‌شود (شرح «پرداخت قسط» → دستهٔ اقساط و وام) */
    const HK_INSTALLMENTS_ON = false;
    function isLockedPlanRow(r) { return !!(r && r.fromPlanId && r.planLocked); }
    /* ردیف قسطی که تراکنش بانکی واقعی رویش بود → ردیف معمولیِ همان تراکنش (مبلغ، روز، ساعت، بانک، پیوست) */
    function hkPlanRowToPlain(r) {
      var c = Object.assign({}, r);
      ['fromPlanId', 'fromPlanIndex', 'planCarried', 'planEarlyPay', 'planNote', 'smsLinked', 'allowPlanFieldEdit', 'planPaidLater', 'planLocked', 'planLockedAmt'].forEach(function (k) { delete c[k]; });
      c.desc = ''; c.status = 'paid';
      return c;
    }
    /* «پرداخت قبلی» (نام قدیمی، برای جاهایی که صدا می‌زنند) = ردیف قسط قفل */
    function isPreAppPlanRow(r) { return isLockedPlanRow(r); }
    /* قسط پرداخت‌نشدهٔ ماه‌های بعد از ماه امروز (قسط آتی): در جستجو نشان داده نمی‌شود */
    function isFuturePlanRow(r, y, m) {
      if (!r || !r.fromPlanId || (r.status || 'paid') === 'paid') return false;
      var t = getTodayPersian();
      return ((parseInt(y, 10) || 0) * 100 + (parseInt(m, 10) || 0)) > t.y * 100 + t.m;
    }
    function syncPlansToExpensePeriod(pd, year, month) {
      if (!HK_INSTALLMENTS_ON) return;
      if (!pd || !pd.expense) return;
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);

      // پاک‌سازی ردیف‌های یتیم (قسط حذف‌شده یا بدون اتصال)
      const activePlanIds = new Set(
        (plans || [])
          .filter(p => p.expenseSectionId || (p.expenseSectionTitle || '').trim())
          .map(p => p.id)
      );
      (pd.expense.sections || []).forEach(sec => {
        if (!sec.rows) return;
        sec.rows = sec.rows.filter(r => {
          if (!r.fromPlanId) return true;
          return activePlanIds.has(r.fromPlanId);
        });
        if (!sec.rows.length) sec.rows = [emptyRow()];
      });

      (plans || []).forEach(plan => {
        if (!(plan.expenseSectionId || (plan.expenseSectionTitle || '').trim())) return;
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
        const sec = findExpenseSectionForPlan(pd, plan);
        const lockedN = planLockedCount(plan);

        // حفظ روز / حساب / وضعیت دستی کاربر
        const prevByPlan = {}, prevRowByPlan = {};
        (pd.expense.sections || []).forEach(s => {
          (s.rows || []).forEach(r => {
            if (r && r.fromPlanId === plan.id) {
              const pk = plan.id + ':' + (r.fromPlanIndex != null ? r.fromPlanIndex : '');
              const meta = {
                day: r.day, account: r.account || '', status: r.status, id: r.id,
                createdBy: r.createdBy, createdByName: r.createdByName,
                ownerHandle: r.ownerHandle, createdAt: r.createdAt,
                planCarried: !!r.planCarried,
                desc: r.desc || '',
                amount: r.amount,
                allowPlanFieldEdit: !!r.allowPlanFieldEdit,
                planNote: r.planNote || '', smsLinked: !!r.smsLinked,
                att: Array.isArray(r.att) && r.att.length ? r.att : null, time: r.time || ''
              };
              prevByPlan[pk] = meta; prevRowByPlan[pk] = r;
              if (!prevByPlan[plan.id]) prevByPlan[plan.id] = meta;
            }
          });
        });

        (pd.expense.sections || []).forEach(s => {
          if (!s.rows) return;
          const before = s.rows.length;
          /* ردیف پیش‌پرداخت قسط ماه بعد را نگه دار */
          s.rows = s.rows.filter(function(r) {
            if (!r || r.fromPlanId !== plan.id) return true;
            if (r.planEarlyPay) {
              var eidx = parseInt(r.fromPlanIndex, 10);
              if (isNaN(eidx)) return false;
              /* فقط اگر هنوز در paidEarlyMap باشد نگه دار؛ با کم کردن paidCount پاک می‌شود */
              return !!(plan.paidEarlyMap && plan.paidEarlyMap[String(eidx)]);
            }
            return false;
          });
          if (!s.rows.length && before) s.rows = [emptyRow()];
        });

        if (!sec || count <= 0) return;
        /* حتی اگر همه پرداخت شده باشند، ردیف ماه سررسید باید بماند */

        /* اقساط: هر قسط در ماه خودش؛ معوق پرداخت‌نشده فقط بعد از ورود به ماه بعد */
        const amt = planInstallmentAmount(plan);
        if (!amt && !plan.name) return;

        var todayJ = { y: y, m: m, d: 1 };
        try { todayJ = getTodayPersian(); } catch (eT) {}
        const periodEntered = (y < todayJ.y) || (y === todayJ.y && m <= todayJ.m);

        const indicesToShow = [], lockedPlain = [];
        for (let i = 0; i < count; i++) {
          const d = dueDateForInstallment(plan, i);
          const isPaid = i < paid;
          const dueThisMonth = (d.y === y && d.m === m);
          const dueBefore = (d.y < y) || (d.y === y && d.m < m);
          var dueMonthEnded = (todayJ.y > d.y) || (todayJ.y === d.y && todayJ.m > d.m);
          const prevMeta = prevByPlan[plan.id + ':' + i] || null;
          const paidLate = isPlanIndexPaidLate(plan, i);
          /* قسط گذشته (قفل): فقط در ماه سررسید، پرداخت‌شده، هیچ‌وقت معوق */
          if (i < lockedN) {
            if (dueThisMonth) indicesToShow.push({ i: i, due: d, isPaid: true, carried: false, locked: true });
            else if (prevMeta) {
              /* ردیف «(معوق)» یا پیش‌پرداختِ قسط قفل در ماه دیگر که تراکنش پیامکی واقعی داشت: ردیف معمولی همان تراکنش بماند */
              const prO = prevRowByPlan[plan.id + ':' + i];
              if (prO && !prO.planLocked && Number(prO.amount) > 0 && (prO.account || '').trim() && (prO.smsLinked || prO.viaSms || prO.fromSmsBulk || prO.smsId)) lockedPlain.push(prO);
            }
            continue;
          }

          /*
           * قواعد:
           * 1) ماه سررسید: همیشه یک ردیف — اگر دیرپرداخت (paidLate) باشد در ماه اصلی unpaid می‌ماند
           * 2) پرداخت‌شده به‌موقع: فقط همان ماه سررسید (هیچ کپی در ماه‌های بعد)
           * 3) پرداخت‌نشده و سررسید گذشته: معوق unpaid در ماه‌های بعد
           * 4) پرداخت معوق: فقط در ماهی که قبلاً ردیف معوقِ پرداخت‌شده داشته (نه همه ماه‌ها)
           */
          if (dueThisMonth) {
            var paidInDue = isPaid && !paidLate;
            indicesToShow.push({ i: i, due: d, isPaid: paidInDue, carried: false });
            continue;
          }
          if (dueBefore && periodEntered && dueMonthEnded) {
            if (!isPaid) {
              indicesToShow.push({ i: i, due: d, isPaid: false, carried: true });
            } else if (
              paidLate &&
              prevMeta &&
              prevMeta.planCarried &&
              (prevMeta.status === 'paid' || prevMeta.status === 'received')
            ) {
              indicesToShow.push({ i: i, due: d, isPaid: true, carried: true });
            }
            /* پرداخت‌شده عادی: در ماه غیرسررسید ردیف نساز — جلوی سیل بعد از ادیت paidCount */
          }
        }
        lockedPlain.forEach(function (pr) {
          const oe = sec.rows.length === 1 && !sec.rows[0].desc && !sec.rows[0].amount && !sec.rows[0].day && !sec.rows[0].fromPlanId;
          if (oe) sec.rows = [hkPlanRowToPlain(pr)]; else sec.rows.push(hkPlanRowToPlain(pr));
        });
        if (!indicesToShow.length) return;

        indicesToShow.forEach(function(item) {
          const matchIdx = item.i;
          const due = item.due;
          if (item.locked) {
            const prevL = prevByPlan[plan.id + ':' + matchIdx] || {}, prL = prevRowByPlan[plan.id + ':' + matchIdx];
            const lrow = {
              day: String(due.d), desc: planInstallmentDesc(plan, matchIdx, count), amount: 0, status: 'paid', account: '',
              fromPlanId: plan.id, fromPlanIndex: matchIdx, planCarried: false, planLocked: true, planLockedAmt: amt
            };
            /* تراکنش بانکیِ واقعی که روی این ردیف بود (پیامک) → ردیف معمولی جدا تا موجودی بانک دست نخورد؛ بانکِ دستیِ ردیف قبلی برداشته می‌شود */
            var split = prL && !prL.planLocked && Number(prL.amount) > 0 && (prL.account || '').trim() && (prL.smsLinked || prL.viaSms || prL.fromSmsBulk || prL.smsId);
            if (split) {
              const plain = hkPlanRowToPlain(prL);
              const oe = sec.rows.length === 1 && !sec.rows[0].desc && !sec.rows[0].amount && !sec.rows[0].day && !sec.rows[0].fromPlanId;
              if (oe) sec.rows = [plain]; else sec.rows.push(plain);
            } else {
              if (prevL.id) lrow.id = prevL.id;
              if (prevL.att) lrow.att = prevL.att;
            }
            ['createdBy', 'createdByName', 'ownerHandle', 'createdAt'].forEach(function (k) { if (prevL[k]) lrow[k] = prevL[k]; });
            const onlyEmptyL = sec.rows.length === 1 && !sec.rows[0].desc && !sec.rows[0].amount && !sec.rows[0].day && !sec.rows[0].fromPlanId;
            if (onlyEmptyL) sec.rows = [lrow]; else sec.rows.push(lrow);
            return;
          }
          /* ماه سررسید: اگر دیر پرداخت شده، همان پرداخت‌نشده بماند؛ معوقِ ماه بعد: طبق isPaid */
          var autoStatus;
          if (item.carried) {
            autoStatus = item.isPaid ? 'paid' : 'unpaid';
          } else {
            autoStatus = (item.isPaid && !isPlanIndexPaidLate(plan, matchIdx)) ? 'paid' : 'unpaid';
          }
          const prev = prevByPlan[plan.id + ':' + matchIdx] || {};
          var showMoavagh = !!item.carried;
          /* اگر قسط دوباره unpaid شد (کم کردن paidCount): مبلغ و روزِ اصلی طرح برگردد */
          var usePrevAmt = item.isPaid && prev.amount != null && prev.amount !== '' && Number(prev.amount) !== 0;
          var usePrevDay = item.isPaid && prev.day != null && prev.day !== '';
          const row = {
            day: usePrevDay ? String(prev.day) : String(due.d),
            desc: planInstallmentDesc(plan, matchIdx, count) + (showMoavagh ? ' (معوق ' + MONTHS[due.m - 1] + ')' : ''),
            amount: usePrevAmt ? prev.amount : amt,
            status: autoStatus,
            account: item.isPaid ? (prev.account || '') : (prev.account || ''),
            fromPlanId: plan.id,
            fromPlanIndex: matchIdx,
            planCarried: !!item.carried
          };
          if (item.isPaid && prev.allowPlanFieldEdit) row.allowPlanFieldEdit = true;
          if (prev.att) row.att = prev.att;
          if (item.isPaid && prev.time) row.time = prev.time;
          /* توضیح پیامک (دیرکرد / چند قسط با هم) و پیوند پیامک با ساختن دوبارهٔ ردیف از بین نرود */
          if (item.isPaid && prev.planNote) { row.planNote = prev.planNote; row.desc += prev.planNote; }
          if (item.isPaid && prev.smsLinked) row.smsLinked = true;
          if (prev.id && !item.carried) row.id = prev.id;
          if (prev.createdBy) row.createdBy = prev.createdBy;
          if (prev.createdByName) row.createdByName = prev.createdByName;
          if (prev.ownerHandle) row.ownerHandle = prev.ownerHandle;
          if (prev.createdAt) row.createdAt = prev.createdAt;

          const onlyEmpty = sec.rows.length === 1 && !sec.rows[0].desc && !sec.rows[0].amount && !sec.rows[0].day && !sec.rows[0].fromPlanId;
          if (onlyEmpty) sec.rows = [row];
          else sec.rows.push(row);
        });

        sec.rows.sort((a, b) => {
          const da = parseInt(a.day, 10) || 99;
          const db = parseInt(b.day, 10) || 99;
          if (da !== db) return da - db;
          return hkTimeCmp(a, b) || (parseInt(a.fromPlanIndex, 10) || 0) - (parseInt(b.fromPlanIndex, 10) || 0);
        });
      });
    }


    /** پنتا: علامت‌گذاری یک قسط به‌عنوان پرداخت‌شده (بر اساس ایندکس سررسید) */
    function markPlanInstallmentPaid(planId, planIndex, asLate) {
      const plan = (plans || []).find(function(p){ return p && p.id === planId; });
      if (!plan) return false;
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      let paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      const idx = (planIndex != null && planIndex !== '') ? parseInt(planIndex, 10) : paid;
      if (isNaN(idx) || idx < 0) return false;
      if (paid <= idx) {
        plan.paidCount = idx + 1;
      }
      if (asLate) setPlanIndexPaidLate(plan, idx, true);
      try { if (typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll(); } catch (e) {}
      try { if (typeof checkInstallReminders === 'function') checkInstallReminders(); } catch (eR) {}
      try { persistCurrent(); scheduleSave(); } catch (e2) {}
      try { if (typeof updateInstallSummary === 'function') updateInstallSummary(); } catch (e3) {}
      return true;
    }
    function earliestUnpaidPlanIndex(plan) {
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      return paid < count ? paid : -1;
    }
    function isPlanIndexPaidLate(plan, idx) {
      if (!plan || !plan.paidLateMap) return false;
      return !!plan.paidLateMap[String(idx)];
    }
    function setPlanIndexPaidLate(plan, idx, late) {
      if (!plan) return;
      if (!plan.paidLateMap) plan.paidLateMap = {};
      if (late) plan.paidLateMap[String(idx)] = true;
      else delete plan.paidLateMap[String(idx)];
    }

    /** بعد از تغییر paidCount: وضعیت دیرکرد/پیش‌پرداخت اقساطِ بالاتر از paid را پاک کن */
    function clampPlanPaymentState(plan) {
      if (!plan) return;
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      let paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      plan.paidCount = paid;
      if (plan.paidLateMap && typeof plan.paidLateMap === 'object') {
        Object.keys(plan.paidLateMap).forEach(function(k) {
          const idx = parseInt(k, 10);
          if (isNaN(idx) || idx >= paid) delete plan.paidLateMap[k];
        });
      }
      if (plan.paidEarlyMap && typeof plan.paidEarlyMap === 'object') {
        Object.keys(plan.paidEarlyMap).forEach(function(k) {
          const idx = parseInt(k, 10);
          if (isNaN(idx) || idx >= paid) delete plan.paidEarlyMap[k];
        });
      }
      if (plan.paidLaterAt && typeof plan.paidLaterAt === 'object') {
        Object.keys(plan.paidLaterAt).forEach(function(k) {
          const idx = parseInt(k, 10);
          if (isNaN(idx) || idx >= paid || !(plan.paidLateMap && plan.paidLateMap[k])) delete plan.paidLaterAt[k];
        });
      }
      /* ردیف‌های پیش‌پرداختی که دیگر در map نیستند از همه ماه‌ها حذف شوند */
      try {
        function scrubEarly(pd) {
          if (!pd || !pd.expense || !pd.expense.sections) return;
          pd.expense.sections.forEach(function(s) {
            if (!s.rows) return;
            s.rows = s.rows.filter(function(r) {
              if (!r || r.fromPlanId !== plan.id || !r.planEarlyPay) return true;
              var eidx = parseInt(r.fromPlanIndex, 10);
              if (isNaN(eidx)) return false;
              return !!(plan.paidEarlyMap && plan.paidEarlyMap[String(eidx)]);
            });
            if (!s.rows.length) s.rows = [emptyRow()];
          });
        }
        scrubEarly(periodData);
        Object.keys(archive || {}).forEach(function(k) {
          try { scrubEarly(archive[k]); } catch (eA) {}
        });
      } catch (eScrub) {}
    }


    function syncPlansToExpenseAll() {
      try {
        (plans || []).forEach(function(p) {
          try { clampPlanPaymentState(p); } catch (e0) {}
        });
      } catch (e1) {}
      // ماه جاری
      syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
      // آرشیو بقیه ماه‌ها
      Object.keys(archive || {}).forEach(k => {
        const parts = k.split('-');
        if (parts.length < 2) return;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!y || !m) return;
        if (y === currentYear && m === currentMonth) return;
        const pd = archive[k];
        if (!pd) return;
        syncPlansToExpensePeriod(pd, y, m);
      });
      // ذخیره ماه جاری در آرشیو
      try {
        const key = periodKey(currentYear, currentMonth);
        archive[key] = periodData;
      } catch (e) {}
    }

    /**
     * از ماه شروع بازپرداخت تا آخرین سررسید قسط،
     * بخش مخارج مرتبط را در همه ماه‌ها/سال‌ها ایجاد/حفظ می‌کند.
     */
    function ensureExpenseSectionThroughPlanEnd(plan) {
      if (!plan) return;
      let secTitle = (plan.expenseSectionTitle || '').trim();
      if (!secTitle && plan.expenseSectionId) {
        const sec = findExpenseSectionForPlan(periodData, plan);
        if (sec) secTitle = (sec.title || '').trim();
      }
      if (!secTitle) return;

      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      if (!count) return;
      const sy = parseInt(plan.startYear, 10);
      const sm = parseInt(plan.startMonth, 10);
      if (!sy || !sm) return;

      const lastDue = dueDateForInstallment(plan, count - 1);
      if (!lastDue || !lastDue.y || !lastDue.m) return;

      let y = sy;
      let m = sm;
      // سقف ایمنی: حداکثر ۱۵ سال
      let guard = 0;
      while (guard++ < 200) {
        const key = periodKey(y, m);
        let pd;
        if (y === currentYear && m === currentMonth) {
          pd = periodData;
        } else {
          pd = archive[key];
          if (!pd) {
            // ماه خالی: هدرها از ماه جاری
            pd = cloneHeadersOnly(periodData);
            archive[key] = pd;
          }
        }
        if (!pd.expense) pd.expense = { sections: [], nextId: 1 };
        if (!pd.expense.sections) pd.expense.sections = [];
        const exists = pd.expense.sections.some(s => (s.title || '').trim() === secTitle);
        if (!exists) {
          const nid = pd.expense.nextId || (pd.expense.sections.length + 1);
          pd.expense.sections.push({
            id: 's' + nid,
            title: secTitle,
            color: tabAccentColor('expense'),
            collapsed: true,
            rows: [emptyRow()]
          });
          pd.expense.nextId = nid + 1;
        }
        // پایان بازه
        if (y === lastDue.y && m === lastDue.m) break;
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
    }

    function ensureAllLinkedPlanSections() {
      (plans || []).forEach(p => {
        if (p.expenseSectionId || (p.expenseSectionTitle || '').trim()) {
          ensureExpenseSectionThroughPlanEnd(p);
        }
      });
    }

    function planTotalPayable(plan) {
      const total = Number(plan.amount) || 0; // مبلغ کل
      const rate = Number(plan.interestRate) || 0;
      return Math.round(total * (1 + rate / 100));
    }

    function planInstallmentAmount(plan) {
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      if (!count) return 0;
      return Math.round(planTotalPayable(plan) / count);
    }

    let archive = {};
    let plans = []; // سراسری — مستقل از ماه
    let currentYear = 1405;
    let currentMonth = 6;
    let currentTab = 'home';
    let periodData = emptyPeriodData();
    let saveTimer = null;
    let confirmCallback = null;
    let familyCode = '';
    let memberName = '';
    let memberHandle = ''; // نام کاربری یکتا برای بازیابی مالکیت
    let firebaseUrl = '';
    let firebaseApiKey = '';
    let familyMembers = {}; // uid -> { name, handle, joinedAt }
    let localUid = '';
    let authUid = '';
    let authIdToken = '';
    let authRefreshToken = '';
    let authTokenExp = 0;
    let syncTimer = null;
    let localUpdatedAt = 0;
    let syncing = false;
    let editingLock = false;
    let familyModalTab = 'join'; // join | create
    /* فلش یکسان همهٔ منوهای باز/بسته‌شونده و کشویی (همان فلش درآمدهای ثابت) */
    var HK_CHEV_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    let familyAdvancedOpen = false;
    let sharedAccountId = ''; // uuid حساب مشترک در Supabase
    let supabaseAccessToken = '';
    let supabaseUserId = '';
    let supabaseTokenExp = 0;
    let syncQueue = []; // صف تغییرات آفلاین برای همگام با ابر

    function dataTabKey() {
      if (currentTab === 'install') return 'expense';
      if (currentTab === 'income' || currentTab === 'expense') return currentTab;
      return 'income';
    }
    function getSections() { return periodData[dataTabKey()].sections; }
    function setSections(s) {
      if (currentTab === 'expense' || currentTab === 'income') periodData[currentTab].sections = s;
    }
    function getNextId() { return periodData[dataTabKey()].nextId; }
    function setNextId(n) { periodData[dataTabKey()].nextId = n; }

    const faDigits = '۰۱۲۳۴۵۶۷۸۹';
    const enDigits = '0123456789';

    function toEnglishDigits(str) {
      return String(str).replace(/[۰-۹]/g, d => enDigits[faDigits.indexOf(d)])
                        .replace(/[٠-٩]/g, d => enDigits['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
    }
    function toPersianDigits(str) {
      return String(str).replace(/[0-9]/g, d => faDigits[d]);
    }
    /** عدد با حداقل دو رقم فارسی (مثلاً ۰۲) */
    function toPersianPad2(n) {
      let s = String(parseInt(n, 10));
      if (!s || s === 'NaN') s = '0';
      if (s.length === 1) s = '0' + s;
      return toPersianDigits(s);
    }
    function formatNum(n) {
      if (n === null || n === undefined || isNaN(n)) return '۰';
      const abs = Math.abs(Number(n));
      const formatted = toPersianDigits(abs.toLocaleString('en-US'));
      return n < 0 ? '−' + formatted : formatted;
    }
    function parseAmount(val) {
      if (typeof val === 'number') return val;
      const cleaned = toEnglishDigits(String(val)).replace(/,/g, '').replace(/\s/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    function escapeHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function periodKey(y, m) { return y + '-' + m; }
    function findSection(id) {
      const tab = (currentTab === 'income' || currentTab === 'expense') ? currentTab : null;
      if (tab && periodData[tab] && periodData[tab].sections) {
        const found = periodData[tab].sections.find(s => s.id === id);
        if (found) return found;
      }
      for (const t of ['expense', 'income']) {
        const found = (periodData[t] && periodData[t].sections || []).find(s => s.id === id);
        if (found) return found;
      }
      return null;
    }

    /* تبدیل دقیق شمسی→میلادی با تقویم شمسی خود سیستم (Intl)؛ خروجی: Date در نیمه‌شب UTC همان روز یا null */
    var _p2gCache = {}, _p2gFmt = null;
    function persianToDate(y, m, d) {
      y = parseInt(y, 10); m = parseInt(m, 10); d = parseInt(d, 10);
      if (!y || !m || !d) return null;
      var k = y + '-' + m + '-' + d;
      if (k in _p2gCache) return _p2gCache[k];
      var hit = null;
      try {
        if (!_p2gFmt) _p2gFmt = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
        var read = function (dt) { var o = {}; _p2gFmt.formatToParts(dt).forEach(function (x) { if (x.type === 'year' || x.type === 'month' || x.type === 'day') o[x.type] = parseInt(toEnglishDigits(x.value), 10); }); return o; };
        /* تخمین: ۱ فروردین ≈ ۲۱ مارس سال (y+621) */
        var dayOfYear = (m <= 6 ? (m - 1) * 31 : 186 + (m - 7) * 30) + d - 1;
        var base = Date.UTC(y + 621, 2, 21) + dayOfYear * 86400000;
        for (var off = 0; off <= 3 && !hit; off++) {
          for (var sgn = 0; sgn < 2 && !hit; sgn++) {
            var dt = new Date(base + (sgn ? -off : off) * 86400000), q = read(dt);
            if (q.year === y && q.month === m && q.day === d) hit = dt;
          }
        }
      } catch (e) { hit = null; }
      _p2gCache[k] = hit;
      return hit;
    }
    var _leapCache = {};
    function isPersianLeapYear(year) {
      year = parseInt(year, 10);
      if (year in _leapCache) return _leapCache[year];
      var v;
      try {
        var a = persianToDate(year, 12, 29), b = persianToDate(year + 1, 1, 1);
        v = (a && b) ? Math.round((b - a) / 86400000) === 2 : ((year % 4) === 3);
      } catch (e) { v = ((year % 4) === 3); }
      _leapCache[year] = v;
      return v;
    }
    function daysInMonth(year, month) {
      if (month <= 6) return 31;
      if (month <= 11) return 30;
      return isPersianLeapYear(year) ? 30 : 29;
    }
    function clampDayValue(raw) {
      let d = parseInt(toEnglishDigits(String(raw || '')).replace(/[^0-9]/g, '') || '0', 10) || 0;
      if (d < 0) d = 0;
      const maxD = daysInMonth(currentYear, currentMonth);
      if (d > maxD) d = maxD;
      if (d > 31) d = 31;
      return d;
    }

    function dayNum(row) {
      const d = parseInt(toEnglishDigits(String(row.day || '')), 10);
      return (d && d > 0) ? d : 0;
    }

    function scheduleRowSort(secId, row, tr) {
      // صبر کن تا اگر کاربر به فیلد بعدی همان ردیف رفت یا منوی کشویی باز است، رندر باعث قطع تعامل نشود
      const attempt = () => {
        try {
          const active = document.activeElement;
          if (tr && active && tr.contains(active)) { setTimeout(attempt, 280); return; }
          if (active && active.classList && active.classList.contains('unlocked')) { setTimeout(attempt, 280); return; }
          if (document.querySelector('.dark-select-list.open')) { setTimeout(attempt, 280); return; }
        } catch (e) {}
        if (!(row && (row.day || row.amount || row.desc))) return;
        sortSectionRows(secId);
        // فقط تب مربوطه را رندر کن — نه کل نرم‌افزار — برای جلوگیری از لگ
        try {
          const sy = window.scrollY || window.pageYOffset || 0;
          if (currentTab === 'income' || currentTab === 'expense') {
            renderSectionsForTab(currentTab);
          } else {
            renderAll();
          }
          try { window.scrollTo(0, sy); } catch (e3) {}
        } catch (e) { try { renderAll(); } catch (e2) {} }
        scheduleSave();
      };
      setTimeout(attempt, 320);
    }
    function sortSectionRows(secId) {
      const sec = findSection(secId);
      if (!sec) return;
      sec.rows = sec.rows
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          const da = dayNum(a.r), db = dayNum(b.r);
          if (!da && !db) return a.i - b.i;
          if (!da) return 1;
          if (!db) return -1;
          if (da !== db) return da - db;
          return hkTimeCmp(a.r, b.r) || a.i - b.i;
        })
        .map(x => x.r);
    }

    function sectionTotal(sec) {
      let t = 0;
      sec.rows.forEach(r => { if (r && r.p2p) return; t += Number(r.amount) || 0; });
      return t;
    }

    /* تاریخ شمسی */
    function addMonths(y, m, add) {
      let total = (y * 12 + (m - 1)) + add;
      const ny = Math.floor(total / 12);
      const nm = (total % 12) + 1;
      return { y: ny, m: nm };
    }

    function dateToIndex(y, m, d) {
      return y * 372 + m * 31 + d;
    }

    function getTodayPersian() {
      try {
        const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          year: 'numeric', month: 'numeric', day: 'numeric'
        });
        const parts = fmt.formatToParts(new Date());
        const get = (t) => parseInt(toEnglishDigits((parts.find(p => p.type === t) || {}).value || '0'), 10);
        return { y: get('year') || 1405, m: get('month') || 1, d: get('day') || 1 };
      } catch (e) {
        const n = new Date();
        return { y: 1405, m: 6, d: n.getDate() };
      }
    }

    function dueDateForInstallment(plan, index) {
      const sy = parseInt(plan.startYear, 10) || 1405;
      const sm = parseInt(plan.startMonth, 10) || 1;
      const { y, m } = addMonths(sy, sm, index);
      let d = parseInt(plan.startDay, 10) || 1;
      const maxD = daysInMonth(y, m);
      if (d > maxD) d = maxD;
      return { y, m, d };
    }

    /** متن تاریخ آخرین سررسید قسط */
    function formatPlanLastDue(plan) {
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const sy = parseInt(plan.startYear, 10);
      const sm = parseInt(plan.startMonth, 10);
      if (!count || !sy || !sm) return '—';
      const due = dueDateForInstallment(plan, count - 1);
      return toPersianDigits(due.d) + ' ' + MONTHS[due.m - 1] + ' ' + toPersianDigits(due.y);
    }

    /* —— Confirm —— */
    let confirmNoCallback = null;
    function _resetConfirmModalZ() {
      try {
        var cm = document.getElementById('confirmModal');
        if (cm) { cm.style.zIndex = ''; }
      } catch (e) {}
    }
    function askConfirm(msg, onYes, onNo) {
      var cm = document.getElementById('confirmModal');
      try { var _cc = document.getElementById('confirmCmp'); if (_cc) { _cc.style.display = 'none'; _cc.innerHTML = ''; } if (cm) cm.classList.remove('hk-dup-open'); } catch (eCc) {}
      document.getElementById('confirmMsg').textContent = msg;
      confirmCallback = onYes || null;
      confirmNoCallback = onNo || null;
      /* بالاتر از bankAddEditor / bankEditorDim و مودال پیامک */
      if (cm) cm.style.zIndex = '100700'; /* ۱.۳.۴۸: بالای پنجرهٔ پیوست‌ها و باکس ویرایش هم */
      cm.classList.add('open');
      syncModalOverlaysToViewport();
    }
    document.getElementById('confirmYes').onclick = () => {
      document.getElementById('confirmModal').classList.remove('open');
      _resetConfirmModalZ();
      const cb = confirmCallback;
      confirmCallback = null;
      confirmNoCallback = null;
      if (cb) cb();
    };
    document.getElementById('confirmNo').onclick = () => {
      document.getElementById('confirmModal').classList.remove('open');
      _resetConfirmModalZ();
      const cb = confirmNoCallback;
      confirmCallback = null;
      confirmNoCallback = null;
      if (cb) cb();
    };
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target.id === 'confirmModal') {
        document.getElementById('confirmModal').classList.remove('open');
        _resetConfirmModalZ();
        confirmCallback = null;
        confirmNoCallback = null;
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        if (yesBtn) yesBtn.textContent = 'بلی';
        if (noBtn) noBtn.textContent = 'خیر';
      }
    });

    /* —— Keep modals above the on-screen keyboard —— */
    function syncModalOverlaysToViewport() {
      if (!window.visualViewport) return;
      // با قفل اسکرول بدنه، تغییر top/height باعث پرش پشت مودال می‌شود
      if (typeof _bodyScrollLockCount !== 'undefined' && _bodyScrollLockCount > 0) return;
      if (document.body.classList.contains('menu-open')) return;
      const vv = window.visualViewport;
      document.querySelectorAll('.modal-overlay.open').forEach(ov => {
        if (vv.height >= window.innerHeight * 0.92) {
          ov.style.height = '';
          ov.style.top = '';
          return;
        }
        ov.style.height = vv.height + 'px';
        ov.style.top = vv.offsetTop + 'px';
      });
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncModalOverlaysToViewport);
      window.visualViewport.addEventListener('scroll', syncModalOverlaysToViewport);
    }

