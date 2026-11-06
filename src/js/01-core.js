    /* ۱.۳.۷۹: آیکون‌های مشترک نرم‌افزار — هر جای تازه همین شکل‌های قبلی را می‌گیرد (مداد ویرایش؛ × قرمز حذف) */
    var HK_EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    var HK_DEL_X = '×';
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

    /* —— Text input (sheet at top — avoids keyboard covering buttons) —— */
    let textInputCallback = null;
    function placeTextInputSheet() {
      const sheet = document.getElementById('textInputModal');
      const vv = window.visualViewport;
      const offsetTop = vv ? vv.offsetTop : 0;
      const visH = vv ? vv.height : window.innerHeight;
      const top = offsetTop + Math.max(80, Math.floor(visH * 0.25));
      sheet.style.top = top + 'px';
      sheet.style.left = '12px';
      sheet.style.right = '12px';
    }
    function askTextInput(label, currentValue, onSave, placeholderHint) {
      closeRemindBarIfOpen();
      document.getElementById('textInputLabel').textContent = label || 'نام قسط';
      const field = document.getElementById('textInputField');
      field.oninput = null;
      field.inputMode = 'text';
      field.setAttribute('enterkeyhint', 'done');
      field.value = currentValue || '';
      field.placeholder = placeholderHint || label || 'بنویسید و تأیید کنید';
      textInputCallback = onSave;
      const sheet = document.getElementById('textInputModal');
      sheet.classList.add('open');
      placeTextInputSheet();
      const bd = document.getElementById('textInputBackdrop');
      if (bd) bd.classList.add('open');
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', placeTextInputSheet);
        window.visualViewport.addEventListener('scroll', placeTextInputSheet);
      }
      setTimeout(() => {
        try { field.focus({ preventScroll: true }); } catch (e) { try { field.focus(); } catch (e2) {} }
        // سلکت‌آل تا با تایپ جایگزین شود
        try {
          if (field.value) caretToEnd(field);
          else field.setSelectionRange(0, 0);
        } catch (e) {}
        placeTextInputSheet();
      }, 50);
      setTimeout(placeTextInputSheet, 300);
    }
    /* ۱.۳.۴۸: آیکون ویرایشِ «فعال» (خاکستری) وقتی منوی ویرایش با برگشت یا زدن بیرون بسته شد، دوباره عادی شود */
    /* ۱.۳.۴۹: فقط وقتی خود پنجرهٔ ویرایش هنوز باز است خاکستری بماند (نه هر پنجرهٔ باز دیگری)؛ با «بازگشت» فوراً */
    function hkResetEditIcons() {
      try {
        var on = document.querySelectorAll('.btn-edit-title.is-editing'); if (!on.length) return;
        if (document.querySelector('#recurringSheet, #textInputModal.open, #nameSheetBackdrop.open, .hk-re-ov, .person-edit-sheet')) return;
        on.forEach(function (b) { if (b.closest && b.closest('.plan-card')) return; b.classList.remove('is-editing'); });
      } catch (e) {}
    }
    setInterval(hkResetEditIcons, 400);
    function closeTextInputModal() {
      document.getElementById('textInputModal').classList.remove('open');
      document.getElementById('textInputModal').style.zIndex = '';
      const bd = document.getElementById('textInputBackdrop');
      if (bd) { bd.classList.remove('open'); bd.style.zIndex = '450'; }
      textInputCallback = null;
      // آیکون ادیت درآمدهای ثابت و سایر‌ها را از حالت آبی دربیاور
      try {
        document.querySelectorAll('.btn-edit-title.is-editing').forEach(b => {
          // اقساط تا پایان ویرایش آبی می‌ماند
          if (b.closest && b.closest('.plan-card')) return;
          b.classList.remove('is-editing');
        });
      } catch (e) {}
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', placeTextInputSheet);
        window.visualViewport.removeEventListener('scroll', placeTextInputSheet);
      }
    }
    document.getElementById('textInputField').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Go' || e.key === 'Done') {
        e.preventDefault();
        const v = document.getElementById('textInputField').value;
        const cb = textInputCallback;
        closeTextInputModal();
        if (cb) cb(v);
      }
      if (e.key === 'Escape') closeTextInputModal();
    });
    const _tibd = document.getElementById('textInputBackdrop');
    if (_tibd) _tibd.addEventListener('click', () => closeTextInputModal());

    /* —— Tabs —— */
    function activatePanel(tab) {
      const all = ['home', 'income', 'expense', 'balance', 'install', 'ledger', 'recurring'];
      all.forEach(t => {
        const p = document.getElementById('panel-' + t);
        if (p) p.classList.toggle('active', t === tab);
      });
    }
    function switchTab(tab, force) {
      if (!force && tab === currentTab) return;
      // تب‌های اصلی حذف شده‌اند — به خانه برگرد مگر جزئیات کارت
      if ((tab === 'income' || tab === 'expense' || tab === 'balance') && !(typeof _detailContext !== 'undefined' && _detailContext)) {
        tab = 'home';
      }
      try { persistCurrent(); } catch (e) {}
      const prevY = window.scrollY || 0;
      currentTab = tab;
      activatePanel(tab);
      try { updateTabUI(); } catch (e) {}
      renderAll();
      try { saveArchive(); } catch (e) {}
      requestAnimationFrame(() => {
        const maxY = Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight);
        let y = Math.min(prevY, maxY);
        if (y < 0) y = 0;
        // تب‌های منو از بالا شروع شوند
        if (tab === 'install' || tab === 'ledger' || tab === 'recurring') y = 0;
        window.scrollTo(0, y);
        moveTabIndicator();
      });
    }
    let _featureReturnTab = 'expense';
    var _instFlashPlans = {};
    let _featureActive = null; // 'recurring' | 'install' | 'ledger'
    const FEATURE_TITLES = {
      recurring: 'درآمدهای ثابت',
      install: 'اقساط',
      ledger: 'قرض'
    };
    function openFeatureSheet(kind) {
      try { closeSideMenu(); } catch (e) {}
      /* ورود به منوی اقساط = اعلان‌های قسط «خوانده‌شده» */
      if (kind === 'install') {
        /* وام‌هایی که نشان عددی داشتند: استروک قرمز چرخان تا وقتی منو باز است */
        try {
          var _seenI = {}; loadInstallSeen().forEach(function (k) { _seenI[k] = 1; });
          _instFlashPlans = {};
          installAlertKeys().forEach(function (k) { if (!_seenI[k]) _instFlashPlans[k.slice(0, k.lastIndexOf(':'))] = 1; });
        } catch (eFl) { _instFlashPlans = {}; }
        try { markInstallAlertsSeen(); } catch (eIA) {}
      }
      const sheet = document.getElementById('featureSheet');
      const body = document.getElementById('featureSheetBody');
      const title = document.getElementById('featureSheetTitle');
      if (!sheet || !body) return;
      _featureReturnTab = 'home';
      _featureActive = kind;
      if (title) title.textContent = FEATURE_TITLES[kind] || '';
      try {
        var fsAdd = document.getElementById('featureSheetAdd');
        if (fsAdd) {
          var lbl = { install: 'قسط جدید', ledger: 'رابطهٔ جدید', recurring: 'درآمد ثابت جدید' }[kind];
          fsAdd.style.display = lbl ? '' : 'none';
          if (lbl) { fsAdd.setAttribute('aria-label', lbl); fsAdd.title = lbl; }
        }
      } catch (eAdd) {}
      const panelId = (kind === 'recurring') ? 'panel-recurring' : ('panel-' + kind);
      const panel = document.getElementById(panelId);
      if (panel) {
        if (panel.parentNode !== body) {
          body.innerHTML = '';
          body.appendChild(panel);
        }
        panel.classList.add('active');
        panel.style.display = 'block';
      }
      // رندر با currentTab موقت فقط برای توابع وابسته
      const savedTab = currentTab;
      currentTab = kind;
      try {
        if (kind === 'recurring') {
          recurringCollapsed = false;
          renderRecurringBar();
        } else if (kind === 'install') {
          try { (plans || []).forEach(function(p){ p.collapsed = true; }); } catch (eC) {}
          renderPlans();
          try { updateInstallSummary(); } catch (e) {}
        } else if (kind === 'ledger') {
          try {
            var _led = ensureLedger();
            (_led.sections || []).forEach(function(s){ s.collapsed = true; });
          } catch (eC2) {}
          renderLedgerTab();
        }
      } catch (err) { console.error(err); }
      // تب اصلی را دست نزن — فقط شیت باز است
      currentTab = savedTab;
      activatePanel(savedTab);
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      try { lockBodyScroll(); } catch (e) {}
      try { body.scrollTop = 0; } catch (e) {}
    }
    /* دکمهٔ + نوار بالای منوهای اقساط/قرض/درآمد ثابت (به‌جای دکمهٔ داخل جدول) */
    function featureSheetAdd() {
      try {
        if (_featureActive === 'install') addPlan();
        else if (_featureActive === 'ledger') addLedgerSection();
        else if (_featureActive === 'recurring') editRecurringItem(-1);
      } catch (e) { console.error(e); }
    }
    function closeFeatureSheet() {
      const sheet = document.getElementById('featureSheet');
      const body = document.getElementById('featureSheetBody');
      try {
        const was = _featureActive;
        if (was === 'install') {
          _instFlashPlans = {};
          document.querySelectorAll('.plan-card.inst-alert').forEach(function (c) { c.classList.remove('inst-alert'); });
          (plans || []).forEach(function(p){ p.collapsed = true; });
          try { scheduleSave(); } catch (e0) {}
        } else if (was === 'ledger') {
          var ledX = ensureLedger();
          /* ۱.۳.۶۶: فقط حالت نمایش؛ ذخیرهٔ کامل لازم نیست */
          (ledX.sections || []).forEach(function(s){ s.collapsed = true; });
        } else if (was === 'recurring') {
          try { recExpanded.clear(); } catch (e2) {}
        }
      } catch (eClose) {}
      if (sheet) {
        sheet.classList.remove('open');
        sheet.setAttribute('aria-hidden', 'true');
      }
      try {
        const track = document.getElementById('tabTrack');
        if (track && body) {
          Array.from(body.children).forEach(ch => {
            if (ch && ch.id && ch.id.indexOf('panel-') === 0) {
              track.appendChild(ch);
              ch.classList.remove('active');
              ch.style.display = '';
            }
          });
        }
      } catch (e) {}
      _featureActive = null;
      try { unlockBodyScroll(); } catch (e) {}
      // بازگشت یک مرحله: صفحه کارت (خانه)
      try {
        currentTab = 'home';
        _detailContext = null;
        activatePanel('home');
        renderHomeCards();
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e3) {}
      } catch (e) {
        try { switchTab('home', true); } catch (e2) {}
      }
      try { checkInstallReminders(); } catch (e) {}
    }
    function switchTabFromMenu(tab) {
      try { closeSideMenu(); } catch (e) {}
      /* ۱.۳.۴۶: منوی اقساط پنهان → جدول مخارج */
      if (tab === 'install' && !HK_INSTALLMENTS_ON) { try { openPersonDetail(allPersonTitles()[0], 'expense'); } catch (eI) {} return; }
      setTimeout(() => openFeatureSheet(tab), 40);
    }
    /* ۱.۳.۷۹: باکس درآمدهای ثابت: بیش از ۷ مورد فقط داخل خود باکس اسکرول؛ صفحه ثابت و بی‌اسکرول */
    function hkRecListFit(tries) {
      tries = tries || 0;
      var rl = document.querySelector('#recurringBox .rec-list-scroll'); if (!rl) return;
      var rs = rl.querySelectorAll(':scope > .recurring-row');
      if (!rs.length || !rs[0].offsetHeight || !rl.getBoundingClientRect().width) { if (tries < 40) setTimeout(function () { hkRecListFit(tries + 1); }, 120); return; }
      rl.style.maxHeight = 'none';
      var n = Math.min(7, rs.length), last = rs[n - 1];
      var hh = last.offsetTop + last.offsetHeight - rs[0].offsetTop + (parseFloat(getComputedStyle(last).marginBottom) || 0);
      var top = rl.getBoundingClientRect().top, ex = document.getElementById('recExportBtn');
      var reserve = 28 + (ex && ex.offsetHeight ? ex.offsetHeight + 24 : 0) + 34;
      var avail = Math.floor(window.innerHeight - top - reserve);
      rl.style.maxHeight = Math.max(120, Math.min(Math.round(hh), avail > 0 ? avail : hh)) + 'px';
    }
    window.addEventListener('resize', function () { try { hkRecListFit(); } catch (e) {} });
    function openRecurringFromMenu() {
      try { closeSideMenu(); } catch (e) {}
      setTimeout(() => openFeatureSheet('recurring'), 40);
    }

    const TAB_ORDER = ['income', 'expense', 'balance'];
    const ALL_TABS = ['income', 'expense', 'balance', 'install', 'ledger', 'recurring'];
    const TAB_IDS = { income: 'tabIncome', expense: 'tabExpense', balance: 'tabBalance', install: 'tabInstall', ledger: 'tabLedger' };
    function tabIndexOf(tab) {
      const i = TAB_ORDER.indexOf(tab);
      return i < 0 ? 0 : i;
    }
    function setTrackAtIndex(indexFloat, dragging) {
      // فقط نمایش یک تب — بدون سُر خوردن محتوا
      if (dragging) return;
      if (currentTab === 'home') { activatePanel('home'); return; }
      if (typeof _detailContext !== 'undefined' && _detailContext) {
        activatePanel(_detailContext.kind === 'balance' ? 'balance' : _detailContext.kind);
        return;
      }
      // تب‌های منو (اقساط / بده‌بستان / درآمد ثابت)
      if (currentTab === 'install' || currentTab === 'ledger' || currentTab === 'recurring') {
        activatePanel(currentTab);
        return;
      }
      const n = TAB_ORDER.length;
      const idx = Math.max(0, Math.min(n - 1, Math.round(indexFloat)));
      const tab = TAB_ORDER[idx];
      activatePanel(tab);
    }
    function setIndicatorAtIndex(indexFloat, dragging) {
      const bar = document.getElementById('tabsBar');
      const ind = document.getElementById('tabIndicator');
      if (!bar || !ind) return;
      const n = TAB_ORDER.length;
      const clamped = Math.max(0, Math.min(n - 1, indexFloat));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(n - 1, i0 + 1);
      const t = clamped - i0;
      const b0 = document.getElementById(TAB_IDS[TAB_ORDER[i0]]);
      const b1 = document.getElementById(TAB_IDS[TAB_ORDER[i1]]);
      if (!b0 || !b1) return;
      const br = bar.getBoundingClientRect();
      const r0 = b0.getBoundingClientRect();
      const r1 = b1.getBoundingClientRect();
      // وقتی روی یک تب ثابت است: باکس و کلمه عمودی و افقی وسط هم‌دیگر
      const settled = !dragging && Math.abs(clamped - Math.round(clamped)) < 0.02;
      let left, width, topRel, height;
      if (settled) {
        const btn = document.getElementById(TAB_IDS[TAB_ORDER[Math.round(clamped)]]);
        const r = btn.getBoundingClientRect();
        left = r.left - br.left;
        width = r.width;
        topRel = (r.top - br.top) + r.height / 2;
        height = r.height;
      } else {
        left = (r0.left - br.left) + ((r1.left - br.left) - (r0.left - br.left)) * t;
        width = r0.width + (r1.width - r0.width) * t;
        const h0 = r0.height, h1 = r1.height;
        height = h0 + (h1 - h0) * t;
        const c0 = (r0.top - br.top) + r0.height / 2;
        const c1 = (r1.top - br.top) + r1.height / 2;
        topRel = c0 + (c1 - c0) * t;
      }
      ind.classList.toggle('dragging', !!dragging);
      ind.style.left = left + 'px';
      ind.style.width = width + 'px';
      ind.style.height = height + 'px';
      ind.style.top = topRel + 'px';
      ind.style.marginTop = (-height / 2) + 'px';
      // فقط یک رنگ فعال — نزدیک‌ترین تب
      const nearestIdx = Math.round(clamped);
      const nearest = TAB_ORDER[nearestIdx];
      ind.classList.remove('neon-income', 'neon-expense', 'neon-balance', 'neon-install', 'neon-ledger');
      ind.classList.add('neon-' + nearest);
      TAB_ORDER.forEach((tab, i) => {
        const btn = document.getElementById(TAB_IDS[tab]);
        if (!btn) return;
        const on = i === nearestIdx;
        btn.classList.toggle('near', on);
        btn.classList.toggle('active', on);
        if (!on) {
          btn.style.color = '';
          btn.style.textShadow = '';
        }
      });
      if (!dragging) setTrackAtIndex(clamped, false);
    }

    function syncChromeHeight() {
      try {
        const chrome = document.getElementById('stickyChrome');
        if (!chrome) return;
        const bar = document.getElementById('remindBar');
        const body = document.getElementById('remindBanner');
        // موقع باز بودن اورلی، ارتفاع بدنه را از محاسبه حذف کن تا کارت جابه‌جا نشود
        let bodyDisp = '';
        let bodyVis = '';
        if (bar && bar.classList.contains('open-overlay') && body) {
          bodyDisp = body.style.display;
          bodyVis = body.style.visibility;
          body.style.display = 'none';
          body.style.visibility = 'hidden';
        }
        const h = Math.ceil(chrome.getBoundingClientRect().height || chrome.offsetHeight || 0);
        if (body && bodyDisp !== '') {
          body.style.display = bodyDisp;
          body.style.visibility = bodyVis;
        } else if (body && bar && bar.classList.contains('open-overlay')) {
          body.style.display = '';
          body.style.visibility = '';
        }
        if (h > 40) {
          document.documentElement.style.setProperty('--chrome-h', h + 'px');
          try { document.body.style.paddingTop = 'calc(' + h + 'px + env(safe-area-inset-top, 0px))'; } catch (e2) {}
        }
      } catch (e) {}
    }

    function syncMatchCardWidth() {
      // عرض کامل ناحیه محتوا (هم‌تراز نوار بالا) — بدون کوچک‌سازی اضافه
      let w = 0;
      const chrome = document.getElementById('stickyChrome');
      if (chrome) {
        const cs = window.getComputedStyle(chrome);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        w = chrome.clientWidth - pl - pr;
      }
      if (!w || w < 40) {
        const top = document.querySelector('.top-bar');
        if (top) w = top.getBoundingClientRect().width;
      }
      if (!w || w < 40) {
        w = document.documentElement.clientWidth - 24;
      }
      // حداکثر عرض قابل‌لمس بدون بیرون‌زدن از صفحه
      const maxW = Math.max(0, document.documentElement.clientWidth - 16);
      let wider = Math.round(w);
      if (wider > maxW) wider = maxW;
      if (wider < 40) wider = maxW;
      document.documentElement.style.setProperty('--match-card-w', wider + 'px');
    }
    function moveTabIndicator() {
      setIndicatorAtIndex(tabIndexOf(currentTab), false);
    }
    function updateTabUI() {
      const te = document.getElementById('tabExpense');
      const ti = document.getElementById('tabIncome');
      const tb = document.getElementById('tabBalance');
      const tins = document.getElementById('tabInstall');
      const tled = document.getElementById('tabLedger');
      if (te) te.classList.toggle('active', currentTab === 'expense');
      if (ti) ti.classList.toggle('active', currentTab === 'income');
      if (tb) tb.classList.toggle('active', currentTab === 'balance');
      if (tins) tins.classList.toggle('active', currentTab === 'install');
      if (tled) tled.classList.toggle('active', currentTab === 'ledger');
      // برای تب‌های اصلی ایندیکاتور؛ برای منو فقط پنل
      if (currentTab === 'install' || currentTab === 'ledger' || currentTab === 'recurring') {
        activatePanel(currentTab);
        // هیچ تب اصلی‌ای active نماند
        if (te) te.classList.remove('active', 'near');
        if (ti) ti.classList.remove('active', 'near');
        if (tb) tb.classList.remove('active', 'near');
      } else {
        setTrackAtIndex(tabIndexOf(currentTab), false);
      }
      requestAnimationFrame(() => requestAnimationFrame(moveTabIndicator));
    }

    let touchStartX = 0, touchStartY = 0;
    let swipeActive = false;
    let swipeLocked = false; // افقی قفل شده
    let swipeStartIdx = 0;
    let swipeTabW = 80;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.target;
      // فقط وقتی روی فیلد در حال تایپ هستیم سوایپ را قطع کن
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && document.activeElement === t) {
        touchStartX = 0;
        return;
      }
      if (t && t.closest && t.closest('.modal-overlay.open, .text-input-sheet.open, .title-menu, .status-menu, .dark-select-list.open')) {
        touchStartX = 0;
        return;
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      // در حالت خانه یا جزئیات کارت، سوایپ تب‌ها غیرفعال
      if (currentTab === 'home' || (typeof _detailContext !== 'undefined' && _detailContext)) {
        swipeActive = false;
        return;
      }
      swipeActive = true;
      swipeLocked = false;
      swipeStartIdx = tabIndexOf(currentTab);
      const bar = document.getElementById('tabsBar');
      if (bar) swipeTabW = Math.max(48, bar.getBoundingClientRect().width / TAB_ORDER.length);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!swipeActive || !touchStartX) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchStartX;
      const dy = y - touchStartY;
      if (!swipeLocked) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          // اسکرول عمودی
          swipeActive = false;
          setIndicatorAtIndex(swipeStartIdx, false);
          return;
        }
        if (Math.abs(dx) > 10) swipeLocked = true;
        else return;
      }
      // حرکت پیوسته شاخص: در RTL حرکت انگشت به راست → تب قبلی در آرایه؟ مطابق منطق قبلی dx>0 = بعدی
      // progress مثبت وقتی dx مثبت (انگشت به راست)
      const progress = dx / swipeTabW;
      let idx = swipeStartIdx + progress;
      idx = Math.max(0, Math.min(TAB_ORDER.length - 1, idx));
      setIndicatorAtIndex(idx, true);
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!touchStartX) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const wasSwipe = swipeActive && swipeLocked;
      touchStartX = 0;
      swipeActive = false;
      swipeLocked = false;
      if (!wasSwipe) {
        setIndicatorAtIndex(tabIndexOf(currentTab), false);
        setTrackAtIndex(tabIndexOf(currentTab), false);
        return;
      }
      if (Math.abs(dx) < Math.abs(dy) * 1.1) {
        setIndicatorAtIndex(tabIndexOf(currentTab), false);
        setTrackAtIndex(tabIndexOf(currentTab), false);
        updateTabUI();
        return;
      }
      // می‌تواند چند تب را یک‌جا رد کند
      const progress = dx / swipeTabW;
      let target = Math.round(swipeStartIdx + progress);
      target = Math.max(0, Math.min(TAB_ORDER.length - 1, target));
      if (TAB_ORDER[target] !== currentTab) switchTab(TAB_ORDER[target]);
      else {
        setIndicatorAtIndex(target, false);
        updateTabUI();
      }
    }, { passive: true });


    /* —— Custom dark select (لیست تیره به‌جای منوی سفید سیستم) —— */
    let openDarkList = null;
    function ensureDarkSelectBackdrop() {
      let bd = document.getElementById('darkSelectBackdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.id = 'darkSelectBackdrop';
        bd.style.cssText = 'display:none;position:fixed;inset:0;z-index:340;background:transparent;';
        bd.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeDarkSelects(); });
        bd.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); closeDarkSelects(); }, { passive: false });
        document.body.appendChild(bd);
      }
      return bd;
    }
    function closeDarkSelects() {
      document.querySelectorAll('.dark-select-list.open').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.dark-select.is-open').forEach(w => w.classList.remove('is-open'));
      openDarkList = null;
      const bd = document.getElementById('darkSelectBackdrop');
      if (bd) bd.style.display = 'none';
    }
    /* منوی کشویی باز: هر لمس بیرون آن (ضربه، نگه‌داشتن یا شروع کشیدن برای اسکرول) همان لحظه می‌بندد */
    (function () {
      var outside = function (t) { return !(t && t.closest && (t.closest('.dark-select-list') || t.closest('.dark-select'))); };
      var shut = function (e) { if (!openDarkList) return; if (outside(e.target)) closeDarkSelects(); };
      document.addEventListener('pointerdown', shut, true);
      document.addEventListener('touchstart', shut, { capture: true, passive: true });
      /* اسکرول با چرخ موس بیرون فهرست؛ اسکرولِ خودِ صفحه (مثلاً با بسته شدن کیبورد) منو را نمی‌بندد */
      document.addEventListener('wheel', shut, { capture: true, passive: true });
    })();
    function isDarkSelectTarget(t) {
      return !!(t && t.closest && (t.closest('.dark-select') || t.closest('.dark-select-list') || t.id === 'darkSelectBackdrop'));
    }
    function openAddRowCountMenu(anchorBtn, onPick) {
      closeDarkSelects();
      let list = document.getElementById('addRowCountList');
      if (list) list.remove();
      list = document.createElement('div');
      list.id = 'addRowCountList';
      list.className = 'dark-select-list add-row-count-list';
      for (let n = 1; n <= 5; n++) {
        const it = document.createElement('div');
        it.className = 'dark-select-item';
        it.textContent = toPersianDigits(n) + ' ردیف';
        it.onclick = (e) => {
          e.stopPropagation();
          try { list.remove(); } catch (err) {}
          const bd = document.getElementById('darkSelectBackdrop');
          if (bd) bd.style.display = 'none';
          openDarkList = null;
          onPick(n);
        };
        list.appendChild(it);
      }
      document.body.appendChild(list);
      const r = anchorBtn.getBoundingClientRect();
      list.style.top = Math.min(r.bottom + 4, window.innerHeight * 0.7) + 'px';
      list.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
      list.style.left = 'auto';
      list.classList.add('open');
      openDarkList = list;
      const bd = ensureDarkSelectBackdrop();
      bd.style.display = 'block';
    }
    /* ۱.۳.۷۱: وقتی ماهِ جاری باز است، زیر اسم ماه کوچک و آبی: «یکشنبه ۱۰» */
    var HK_WD_JS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    /* ۱.۳.۷۴: روز از داخل باکس ماه برداشته شد؛ تاریخ کامل امروز (شمسی + میلادی) در یک خط باریک بالای کارت،
       در فاصلهٔ خالی زیر نوار ماه/سال — همیشه در صفحهٔ اصلی دیده می‌شود و جای چیزی را نمی‌گیرد */
    var HK_EN_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], HK_EN_MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function hkTodayLineText() {
      var t = getTodayPersian(), d = new Date();
      return { fa: 'امروز ' + HK_WD_JS[d.getDay()] + ' ' + toPersianDigits(String(t.d)) + ' ' + MONTHS[t.m - 1] + ' ' + toPersianDigits(String(t.y)),
        en: HK_EN_WD[d.getDay()] + ', ' + d.getDate() + ' ' + HK_EN_MO[d.getMonth()] + ' ' + d.getFullYear() };
    }
    function hkMonthTodayMark() {
      try {
        var mw = document.getElementById('monthSelectWrap');
        var btn = mw && mw.querySelector('.dark-select-btn');
        if (btn) { var sm = btn.querySelector('.hk-mtoday'); if (sm) sm.remove(); btn.classList.remove('hk-has-today', 'hk-today-tight', 'hk-today-xtight', 'hk-today-xx'); }
        var bar = document.querySelector('.top-bar'); if (!bar) return;
        var ln = document.getElementById('hkTodayLine');
        if (!ln) { ln = document.createElement('div'); ln.id = 'hkTodayLine'; ln.className = 'hk-today-line'; ln.innerHTML = '<b></b><i aria-hidden="true">|</i><span dir="ltr"></span>'; bar.appendChild(ln); }
        var x = hkTodayLineText();
        if (ln.firstChild.textContent !== x.fa) ln.firstChild.textContent = x.fa;
        if (ln.lastChild.textContent !== x.en) ln.lastChild.textContent = x.en;
        hkTodayLinePlace();
      } catch (e) {}
    }
    /* ۱.۳.۸۰: تاریخ روز دقیقاً وسط ارتفاع فاصلهٔ لبهٔ پایین سه باکس بالا و لبهٔ بالای باکس کارت — از روی خود صفحه حساب می‌شود */
    function hkTodayLinePlace() {
      try {
        var ln = document.getElementById('hkTodayLine'), bar = document.querySelector('.top-bar'); if (!ln || !bar || !ln.offsetHeight) return;
        var card = null;
        document.querySelectorAll('#panel-home .person-card').forEach(function (c) { if (!card && c.offsetHeight && c.getBoundingClientRect().width) card = c; });
        if (!card) return;
        var br = bar.getBoundingClientRect(), bot = 0;
        ['menuBtn', 'monthSelectWrap', 'yearSelectWrap'].forEach(function (id) { var e = document.getElementById(id); if (e && e.offsetHeight) bot = Math.max(bot, e.getBoundingClientRect().bottom); });
        if (!bot) bot = br.bottom;
        var ct = card.getBoundingClientRect().top;
        if (!(ct > bot)) return;
        var b = ln.querySelector('b'), lr = ln.getBoundingClientRect(), tr = b ? b.getBoundingClientRect() : lr;
        var glyphOff = (tr.top + tr.height / 2) - (lr.top + lr.height / 2);
        var mid = (bot + ct) / 2;
        var top = mid - br.top - ln.offsetHeight / 2 - glyphOff;
        ln.style.top = (Math.round(top * 2) / 2) + 'px';
      } catch (e) {}
    }
    (function () {
      var sch = function () { clearTimeout(sch._t); sch._t = setTimeout(hkTodayLinePlace, 60); };
      window.addEventListener('resize', sch);
      var hook = function () {
        try {
          if (window.ResizeObserver && !hook._ro) {
            hook._ro = new ResizeObserver(sch);
            var bar = document.querySelector('.top-bar'), hc = document.getElementById('homeCards'); if (bar) hook._ro.observe(bar); if (hc) hook._ro.observe(hc);
          }
        } catch (e) {}
        sch();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(hook, 800); }); else setTimeout(hook, 800);
      setTimeout(sch, 2500);
    })();
    function hkMonthTodayWatch() {
      var mw = document.getElementById('monthSelectWrap'), yw = document.getElementById('yearSelectWrap');
      if (!mw || mw._hkTodayW) return; mw._hkTodayW = true;
      try {
        var mo = new MutationObserver(function () { hkMonthTodayMark(); });
        mo.observe(mw, { attributes: true, attributeFilter: ['data-value'], childList: true, subtree: true });
        if (yw) mo.observe(yw, { attributes: true, attributeFilter: ['data-value'] });
      } catch (e) {}
      document.addEventListener('visibilitychange', function () { if (!document.hidden) hkMonthTodayMark(); });
      setInterval(hkMonthTodayMark, 60000);
      hkMonthTodayMark();
    }
    (function () { var n = 0; var go = function () { if (document.getElementById('monthSelectWrap')) { try { hkMonthTodayWatch(); } catch (e) {} return; } if (++n < 60) setTimeout(go, 250); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0); })();
    function createDarkSelect({ options, value, onChange, id, align, listClassName, listMinWidth }) {
      const wrap = document.createElement('div');
      wrap.className = 'dark-select';
      if (id) wrap.id = id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dark-select-btn';
      const list = document.createElement('div');
      list.className = 'dark-select-list' + (listClassName ? (' ' + listClassName) : '');
      document.body.appendChild(list); // fixed to body for overflow

      function labelOf(v) {
        const o = options.find(x => String(x.value) === String(v));
        if (o) return o.label;
        // مقدار نامعتبر (مثلاً id انگلیسی قدیمی) → اولین/آخرین گزینه معتبر
        const none = options.find(x => x.value === '' || x.value == null);
        if (none) return none.label;
        return (options[0] && options[0].label) || '—';
      }
      function setValue(v, silent) {
        wrap.dataset.value = v;
        btn.textContent = labelOf(v);
        list.querySelectorAll('.dark-select-item').forEach(it => {
          it.classList.toggle('selected', String(it.dataset.value) === String(v));
        });
        if (!silent && onChange) onChange(v);
      }
      options.forEach(o => {
        const it = document.createElement('div');
        it.className = 'dark-select-item';
        it.dataset.value = o.value;
        it.textContent = o.label;
        it.onclick = (e) => {
          e.stopPropagation();
          setValue(o.value);
          closeDarkSelects();
        };
        list.appendChild(it);
      });
      setValue(value, true);
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = list.classList.contains('open');
        closeDarkSelects();
        if (wasOpen) return;
        const r = btn.getBoundingClientRect();
        // همیشه رو به پایین با ارتفاع کافی برای دیدن گزینه‌ها
        const top = r.bottom + 4;
        const spaceBelow = Math.max(120, window.innerHeight - top - 8);
        list.style.zIndex = '100920';
        list.style.top = top + 'px';
        list.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 140)) + 'px';
        list.style.maxHeight = Math.max(160, Math.min(spaceBelow, 280)) + 'px';
        list.style.overflowY = 'auto';
        const minW = (listMinWidth === undefined || listMinWidth === null) ? 120 : listMinWidth;
        list.style.width = Math.max(r.width, minW) + 'px';
        list.classList.add('open');
        /* پایین صفحه جا نیست → رو به بالا باز شود (مثلاً منوی حسابِ آخرین پوشهٔ ثبت گروهی) */
        try {
          const lh = list.offsetHeight, below = window.innerHeight - r.bottom - 8, above = r.top - 8;
          if (lh > below && above > below) {
            const h = Math.min(lh, Math.max(120, above - 4));
            list.style.maxHeight = h + 'px';
            list.style.top = Math.max(8, r.top - 4 - Math.min(lh, h)) + 'px';
            list.classList.add('dl-up');
          } else list.classList.remove('dl-up');
        } catch (eUp) {}
        wrap.classList.add('is-open');
        openDarkList = list;
        const bd = ensureDarkSelectBackdrop();
        bd.style.display = 'block';
        bd.style.zIndex = '100910';
        /* گزینهٔ انتخاب‌شده وسط فهرست؛ بدون scrollIntoView که صفحهٔ پشت را هم اسکرول می‌کرد و فهرست همان لحظه بسته می‌شد */
        const sel = list.querySelector('.selected');
        if (sel) try { list.scrollTop = Math.max(0, sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2); } catch (err) {}
        window._hkMenuOpenAt = Date.now();
      };
      wrap.appendChild(btn);
      wrap.getValue = () => wrap.dataset.value;
      wrap.setValue = (v) => setValue(v, true);
      wrap._list = list;
      wrap._btn = btn;
      return wrap;
    }

    /* —— Period —— */
    function initSelectors() {
      const topBar = document.querySelector('.top-bar');
      const oldMs = document.getElementById('monthSelect');
      const oldYs = document.getElementById('yearSelect');
      const menuBtn = document.getElementById('menuBtn');
      // فقط یک‌بار ارتقا — بعد از init، select مخفی هنوز SELECT است و نباید دوباره wrap بسازد
      const alreadyEnhanced = !!document.getElementById('monthSelectWrap');
      if (!alreadyEnhanced && oldMs && oldMs.tagName === 'SELECT' && oldMs.classList.contains('period-select')) {
        const monthOpts = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
        const yearOpts = [];
        for (let y = YEAR_START; y <= YEAR_END; y++) yearOpts.push({ value: y, label: toPersianDigits(y) });
        const ms = createDarkSelect({
          id: 'monthSelectWrap',
          options: monthOpts,
          value: currentMonth,
          onChange: (v) => {
            // فقط مقدار hidden را عوض کن — currentMonth بعد از persist در onPeriodChange عوض می‌شود
            document.getElementById('monthSelect').value = v;
            onPeriodChange();
          }
        });
        // hidden native for compatibility
        const hiddenM = document.createElement('select');
        hiddenM.id = 'monthSelect';
        hiddenM.style.display = 'none';
        monthOpts.forEach(o => {
          const op = document.createElement('option');
          op.value = o.value; op.textContent = o.label;
          hiddenM.appendChild(op);
        });
        hiddenM.value = currentMonth;
        const ys = createDarkSelect({
          id: 'yearSelectWrap',
          options: yearOpts,
          value: currentYear,
          onChange: (v) => {
            document.getElementById('yearSelect').value = v;
            onPeriodChange();
          }
        });
        const hiddenY = document.createElement('select');
        hiddenY.id = 'yearSelect';
        hiddenY.style.display = 'none';
        yearOpts.forEach(o => {
          const op = document.createElement('option');
          op.value = o.value; op.textContent = o.label;
          hiddenY.appendChild(op);
        });
        hiddenY.value = currentYear;
        oldMs.replaceWith(ms);
        oldYs.replaceWith(ys);
        topBar.appendChild(hiddenM);
        topBar.appendChild(hiddenY);
        // ترتیب بصری RTL: راست = همبرگر، بعد ماه، چپ = سال
        if (menuBtn) {
          topBar.insertBefore(menuBtn, topBar.firstChild);
          topBar.insertBefore(ms, menuBtn.nextSibling);
          topBar.insertBefore(ys, ms.nextSibling);
        }
      } else {
        // already enhanced — sync values + حذف wrap تکراری در صورت وجود
        const topBarEl = document.querySelector('.top-bar');
        if (topBarEl) {
          const wrapsM = topBarEl.querySelectorAll('#monthSelectWrap');
          const wrapsY = topBarEl.querySelectorAll('#yearSelectWrap');
          wrapsM.forEach((el, i) => { if (i > 0) try { el.remove(); } catch (e) {} });
          wrapsY.forEach((el, i) => { if (i > 0) try { el.remove(); } catch (e) {} });
        }
        const mw = document.getElementById('monthSelectWrap');
        const yw = document.getElementById('yearSelectWrap');
        if (mw && mw.setValue) mw.setValue(currentMonth);
        if (yw && yw.setValue) yw.setValue(currentYear);
        try { hkMonthTodayWatch(); } catch (eTw) {}
        const hm = document.getElementById('monthSelect');
        const hy = document.getElementById('yearSelect');
        if (hm) hm.value = currentMonth;
        if (hy) hy.value = currentYear;
      }
    }

        
    function navigateToPeriod(y, m) {
      y = parseInt(y, 10);
      m = parseInt(m, 10);
      if (!y || !m) return;
      try { persistCurrent(); } catch (e0) {}
      currentYear = y;
      currentMonth = m;
      try {
        var hm = document.getElementById('monthSelect');
        var hy = document.getElementById('yearSelect');
        var mw = document.getElementById('monthSelectWrap');
        var yw = document.getElementById('yearSelectWrap');
        if (hm) hm.value = String(m);
        if (hy) hy.value = String(y);
        /* سینک هایلایت آبی منوی کشویی ماه/سال */
        if (mw && typeof mw.setValue === 'function') {
          try { mw.setValue(m); } catch (eM) {}
        } else if (mw) {
          var btn = mw.querySelector('.dark-select-btn');
          if (btn) btn.textContent = MONTHS[m - 1] || String(m);
          try {
            (mw._list || document).querySelectorAll && (mw._list || { querySelectorAll: function(){ return []; } }).querySelectorAll('.dark-select-item').forEach(function(it) {
              it.classList.toggle('selected', String(it.dataset.value) === String(m));
            });
          } catch (eMl) {}
        }
        if (yw && typeof yw.setValue === 'function') {
          try { yw.setValue(y); } catch (eY) {}
        } else if (yw) {
          var ybtn = yw.querySelector('.dark-select-btn');
          if (ybtn) ybtn.textContent = (typeof toPersianDigits === 'function') ? toPersianDigits(String(y)) : String(y);
          try {
            if (yw._list) yw._list.querySelectorAll('.dark-select-item').forEach(function(it) {
              it.classList.toggle('selected', String(it.dataset.value) === String(y));
            });
          } catch (eYl) {}
        }
        if (typeof hm._fancyRender === 'function') try { hm._fancyRender(); } catch (e2) {}
        if (typeof hy._fancyRender === 'function') try { hy._fancyRender(); } catch (e4) {}
      } catch (eSel) {}
      try { loadCurrent(); } catch (eL) {}
      try { renderAll(); } catch (eR) {}
      try {
        if (typeof updateMonthYearUI === 'function') updateMonthYearUI();
      } catch (eU) {}
    }

function onPeriodChange() {
      // اول ماه فعلی را با دادهٔ فعلی ذخیره کن + موجودی آنی نمایش‌داده‌شده
      const endingPeople = (typeof computePersonEndingInstants === 'function') ? computePersonEndingInstants() : {};
      const endingAcc = (typeof computeAccountEndingBalances === 'function') ? computeAccountEndingBalances() : {};
      const prevKey = (currentYear || 0) * 100 + (currentMonth || 0);
      persistCurrent();
      const hm = document.getElementById('monthSelect');
      const hy = document.getElementById('yearSelect');
      const newM = hm ? parseInt(hm.value, 10) : currentMonth;
      const newY = hy ? parseInt(hy.value, 10) : currentYear;
      if (newM === currentMonth && newY === currentYear) {
        renderAll();
        return;
      }
      const nextKey = (newY || 0) * 100 + (newM || 0);
      currentMonth = newM || currentMonth;
      currentYear = newY || currentYear;
      loadCurrent();
      // اگر به ماه جلوتر رفتیم، موجودی آنی نمایش‌داده‌شده‌ی ماه قبل را به‌عنوان ورودی اولیه بنشان
      // (نه برای ماه‌های آینده: موجودی آن‌ها هنوز معلوم نیست و عدد کهنه وقتی ماه برسد اشتباه می‌شد)
      var _tdy = getTodayPersian();
      if (nextKey > prevKey && nextKey <= _tdy.y * 100 + _tdy.m) {
        try {
          if (!periodData.personOpeningInstant || typeof periodData.personOpeningInstant !== 'object')
            periodData.personOpeningInstant = {};
          if (!periodData.accountOpeningInstant || typeof periodData.accountOpeningInstant !== 'object')
            periodData.accountOpeningInstant = {};
          /* انتقال موجودی پایان ماه قبل → اول ماه جدید (فقط کلیدهای خالی؛ ذخیره‌شده‌های آرشیو حفظ شوند) */
          Object.keys(endingPeople || {}).forEach(function(k) {
            if (periodData.personOpeningInstant[k] == null || periodData.personOpeningInstant[k] === '')
              periodData.personOpeningInstant[k] = endingPeople[k];
          });
          Object.keys(endingAcc || {}).forEach(function(k) {
            if (periodData.accountOpeningInstant[k] == null || periodData.accountOpeningInstant[k] === '')
              periodData.accountOpeningInstant[k] = endingAcc[k];
          });
          /* اگر اصلاً opening حساب نداریم، کل endingAcc را بنشان */
          if (!Object.keys(periodData.accountOpeningInstant).length && endingAcc && Object.keys(endingAcc).length) {
            periodData.accountOpeningInstant = Object.assign({}, endingAcc);
          }
          /* موجودی زمان ایجاد کارت قفل است — با پایان ماه عوض نشود */
        } catch (eC) {}
      }
      // ماه جدید را هم در آرشیو ثبت کن (اگر فقط هدر کپی شده)
      persistCurrent();
      renderAll();
      try { if (typeof renderHomeCards === 'function') renderHomeCards(); } catch (eR) {}
      saveArchive();
    }

    /* —— Storage —— */
    function persistCurrent() {
      /* ۱.۳.۸۴: ردیف‌های تازهٔ مخارج دستهٔ خودشان را روی خود ردیف می‌گیرند */
      try { if (periodData && periodData.expense && typeof HKCategorizer !== 'undefined') hkCatStampSide(periodData.expense); } catch (eSt) {}
      archive[periodKey(currentYear, currentMonth)] = JSON.parse(JSON.stringify(periodData));
    }

    function normalizeSide(side) {
      if (!side || !side.sections) return { sections: [], nextId: 1 };
      // کپی عمیق — تا ماه‌ها به هم وصل نباشند
      const copy = JSON.parse(JSON.stringify(side));
      (copy.sections || []).forEach(sec => {
        if (!sec.rows) sec.rows = [emptyRow()];
        sec.rows.forEach(r => {
          if (r.day === undefined) r.day = '';
          if (!r.status) r.status = 'paid';
        });
      });
      if (!copy.nextId) copy.nextId = (copy.sections.length || 0) + 1;
      return copy;
    }

    function findHeaderTemplate() {
      // نزدیک‌ترین ماه قبلی که هدر دارد
      const keys = Object.keys(archive || {});
      let best = null, bestScore = -1;
      const cur = currentYear * 100 + currentMonth;
      keys.forEach(k => {
        const parts = k.split('-');
        const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
        if (!y || !m) return;
        const score = y * 100 + m;
        if (score >= cur) return;
        const pd = archive[k];
        if (!pd) return;
        const has = ['expense', 'income'].some(tab =>
          (pd[tab] && pd[tab].sections || []).some(s => (s.title || '').trim())
        );
        if (!has) return;
        if (score > bestScore) { bestScore = score; best = pd; }
      });
      return best; // فقط ماه‌های قبل — نه کپی از ماه‌های جلو
    }
    function cloneHeadersOnly(src) {
      const out = emptyPeriodData();
      out.ledger = { sections: [], nextId: 1 };
      ['expense', 'income'].forEach(tab => {
        const secs = (src[tab] && src[tab].sections) || [];
        const named = secs.filter(s => (s.title || '').trim());
        if (!named.length) return;
        out[tab].sections = named.map((s, i) => ({
          id: 's' + (i + 1),
          title: (s.title || '').trim(),
          color: s.color || tabAccentColor(tab),
          headerBg: s.headerBg,
          collapsed: true,
          rows: [emptyRow()]
        }));
        out[tab].nextId = named.length + 1;
      });
      return out;
    }
    function loadCurrent() {
      const raw = archive[periodKey(currentYear, currentMonth)];
      // cardMeta را از آرشیو ماه یا localStorage جداگانه نگه دار
      let savedCardMeta = {};
      try {
        if (raw && raw.cardMeta && typeof raw.cardMeta === 'object') {
          savedCardMeta = JSON.parse(JSON.stringify(raw.cardMeta));
        }
      } catch (e) {}
      try {
        if (!savedCardMeta || !Object.keys(savedCardMeta).length) {
          const cm = localStorage.getItem(STORAGE_KEY + '_cardMeta');
          if (cm) savedCardMeta = JSON.parse(cm) || {};
        }
      } catch (e) {}
      if (raw) {
        if (raw.sections && !raw.expense) {
          periodData = {
            expense: { sections: raw.sections, nextId: raw.nextId || 3 },
            income: { sections: emptySections(), nextId: 3 },
            ledger: normalizeLedger(raw.ledger),
            cardMeta: savedCardMeta || {}
          };
        } else {
          periodData = {
            expense: normalizeSide(raw.expense),
            income: normalizeSide(raw.income),
            ledger: normalizeLedger(raw.ledger),
            cardMeta: savedCardMeta || {}
          };
        }
        /* بازگردانی موجودی‌های اولیه ماه از آرشیو — جلوی بازنویسی اشتباه هنگام برگشت به ماه */
        try {
          if (raw.accountOpeningInstant && typeof raw.accountOpeningInstant === 'object') {
            periodData.accountOpeningInstant = JSON.parse(JSON.stringify(raw.accountOpeningInstant));
          }
          if (raw.personOpeningInstant && typeof raw.personOpeningInstant === 'object') {
            periodData.personOpeningInstant = JSON.parse(JSON.stringify(raw.personOpeningInstant));
          }
        } catch (eRest) {}
      } else {
        // ماه جدید: فقط هدرها از ماه‌های قبل، بدون ردیف
        const tmpl = findHeaderTemplate();
        periodData = tmpl ? cloneHeadersOnly(tmpl) : emptyPeriodData();
        if (savedCardMeta && Object.keys(savedCardMeta).length) {
          periodData.cardMeta = savedCardMeta;
        }
      }
      if (!periodData.ledger) periodData.ledger = { sections: [], nextId: 1 };
      else periodData.ledger = normalizeLedger(periodData.ledger);
      /* ۱.۳.۵۰: رابطهٔ قرض از ماه ساختش به بعد در همهٔ ماه‌ها: رابطه‌های نزدیک‌ترین ماه قبلیِ دارای قرض که این ماه ندارد، اینجا هم می‌آیند
         (ماه‌های قبل از ساخت رابطه دست نمی‌خورند) */
      try {
        var _curN = currentYear * 100 + currentMonth, _bestK = null, _bestN = -1;
        Object.keys(archive || {}).forEach(function (k) {
          var p = String(k).split('-'), n = (+p[0]) * 100 + (+p[1]), pd0 = archive[k];
          if (!(n < _curN) || n <= _bestN || !pd0 || !pd0.ledger || !Array.isArray(pd0.ledger.sections)) return;
          if (!pd0.ledger.sections.some(function (s) { return (s.personA || '').trim() || (s.personB || '').trim(); })) return;
          _bestN = n; _bestK = k;
        });
        if (_bestK) {
          var _have = {}; (periodData.ledger.sections || []).forEach(function (s) { if (s && s.id) _have[s.id] = 1; });
          try { hkLedGone().forEach(function (id) { _have[id] = 1; }); } catch (eG) {}
          var _add = archive[_bestK].ledger.sections.filter(function (s) { return s && s.id && !_have[s.id] && ((s.personA || '').trim() || (s.personB || '').trim()); });
          if (_add.length) {
            var _sec = periodData.ledger.sections.filter(function (s) { return (s.personA || '').trim() || (s.personB || '').trim() || (s.rows || []).some(function (r) { return r && (r.amount || r.desc); }); });
            /* ۱.۳.۵۶: فقط خود رابطه (ردیف‌های تسویه‌نشدهٔ قبلی در جدول پیوسته از ماه خودشان نشان داده می‌شوند) */
            periodData.ledger.sections = _sec.concat(_add.map(function (s) { return { id: s.id, personA: s.personA || '', personB: s.personB || '', collapsed: s.collapsed, createdBy: s.createdBy, createdByName: s.createdByName, rows: [] }; }));
          }
        }
      } catch (eLc) {}
      if (!periodData.cardMeta || typeof periodData.cardMeta !== 'object') periodData.cardMeta = savedCardMeta || {};
      // همگام‌سازی persistent mirror
      try {
        if (periodData.cardMeta && Object.keys(periodData.cardMeta).length) {
          localStorage.setItem(STORAGE_KEY + '_cardMeta', JSON.stringify(periodData.cardMeta));
        }
      } catch (e) {}
      ['expense', 'income'].forEach(tab => {
        const prev = currentTab;
        currentTab = tab;
        (periodData[tab].sections || []).forEach(sec => {
          sec.color = tabAccentColor(tab);
          sortSectionRows(sec.id);
        });
        currentTab = prev;
      });
      // بخش‌های متصل به اقساط تا آخرین سررسید + ردیف خودکار این ماه
      ensureAllLinkedPlanSections();
      syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
      try { syncCardOrderForPeriod(); } catch (eOrd) {}
    }

    /* رفرش سنگین UI (کارت‌های صفحهٔ اصلی، خلاصهٔ اقساط) هنگام تایپ پشت‌سرهم یک‌جا و با تأخیر کوتاه؛
       وقتی منویی روی صفحهٔ اصلی باز است، کارت‌ها همان موقع بستن منو رندر می‌شوند (closeFeatureSheet) */
    var _uiFlushTimer = 0;
    function flushUiAfterChange() {
      try {
        if (typeof scheduleSummaryUpdate === 'function') scheduleSummaryUpdate();
      } catch (e0) {}
      clearTimeout(_uiFlushTimer);
      _uiFlushTimer = setTimeout(_flushUiHeavy, 220);
    }
    function _flushUiHeavy() {
      try {
        if (typeof checkInstallReminders === 'function') checkInstallReminders();
      } catch (e1) {}
      try {
        if (typeof updateInstallSummary === 'function') updateInstallSummary();
      } catch (e2) {}
      try {
        var hc = document.getElementById('homeCards');
        var sheetOpen = (typeof _featureActive !== 'undefined' && _featureActive);
        if (hc && !sheetOpen && typeof renderHomeCards === 'function') {
          /* صفحه اصلی کارت‌ها — موجودی آنی و مانده */
          renderHomeCards();
        }
      } catch (e3) {}
    }
    function _flushPendingSave() {
      if (!saveTimer) return;
      clearTimeout(saveTimer); saveTimer = null;
      try { persistCurrent(); } catch (e) {}
      try { saveArchive(); } catch (e) {}
    }
    function scheduleSave() {
      touchLocal();
      try { flushUiAfterChange(); } catch (eF) {}
      clearTimeout(saveTimer);
      /* ذخیره بعد از مکث کوتاه در تایپ (نه بعد از هر حرف)؛ هنگام رفتن نرم‌افزار به پس‌زمینه فوراً ذخیره می‌شود */
      saveTimer = setTimeout(() => {
        saveTimer = null;
        try { persistCurrent(); } catch (e) {}
        try { saveArchive(); } catch (e) {}
      }, 450);
    }
    try {
      document.addEventListener('visibilitychange', function () { if (document.hidden) _flushPendingSave(); });
      window.addEventListener('pagehide', _flushPendingSave);
      window.addEventListener('beforeunload', _flushPendingSave);
    } catch (eFS) {}

    /* —— به‌روزرسانی خلاصه با debounce برای جلوگیری از لگ هنگام تایپ —— */
    let _summaryTimer = null;
    function scheduleSummaryUpdate() {
      if (_summaryTimer) cancelAnimationFrame(_summaryTimer);
      _summaryTimer = requestAnimationFrame(() => {
        _summaryTimer = null;
        try {
          if (currentTab === 'income' || currentTab === 'expense') updateSummaryForTab(currentTab);
          if (currentTab === 'balance') updateBalance();
        } catch (e) {}
      });
    }


