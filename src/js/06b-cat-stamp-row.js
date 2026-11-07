    /* =====================================================================
       دسته‌بندی هوشمند مخارج (HKCategorizer)
       ترتیب تشخیص: ۱) دیکشنری شخصی کاربر (localStorage)  ۲) دیکشنری داخلی
       ۳) در آینده: سرویس امن بک‌اند (فقط برای شرح‌های ناشناخته).
       هیچ کلید API یا secret در این فایل نیست و نباید باشد؛ کلید فقط روی سرور
       بک‌اند نگه‌داری می‌شود و نرم‌افزار فقط به آدرس آن درخواست می‌فرستد.
       ===================================================================== */
    var HKCategorizer = (function () {
      /* آدرس سرویس بک‌اند دسته‌بندی (خالی = غیرفعال؛ هیچ درخواست شبکه‌ای ارسال نمی‌شود).
         قرارداد پیشنهادی: POST {items:["شرح", ...]} → {results:[{text:"شرح", category:"food"}]} */
      var REMOTE_URL = '';
      var DICT_KEY = STORAGE_KEY + '_catDict';
      var CATS = [
        { id: 'food', label: 'خوراکی', kw: ['پیتزا', 'رستوران', 'فست فود', 'فستفود', 'ساندویچ', 'همبرگر', 'برگر', 'کباب', 'جوجه', 'غذا', 'نهار', 'ناهار', 'شام', 'صبحانه', 'کافه', 'قهوه', 'چای', 'شیرینی', 'کیک', 'بستنی', 'میوه', 'سبزی', 'نان', 'نانوایی', 'گوشت', 'مرغ', 'ماهی', 'برنج', 'روغن', 'لبنیات', 'شیر', 'ماست', 'پنیر', 'تخم مرغ', 'سوپرمارکت', 'سوپر مارکت', 'هایپر', 'افق کوروش', 'میوه فروشی', 'قصابی', 'خواربار', 'تنقلات', 'آجیل', 'اسنپ فود', 'اسنپفود', 'دلیوری', 'خوراکی', 'خرید روزانه'] },
        { id: 'transport', label: 'حمل‌ونقل', kw: ['بنزین', 'سوخت', 'گازوئیل', 'cng', 'اسنپ', 'تپسی', 'تاکسی', 'آژانس', 'مترو', 'اتوبوس', 'بلیت', 'بلیط', 'قطار', 'هواپیما', 'پرواز', 'عوارض', 'پارکینگ', 'کارواش', 'تعمیر ماشین', 'تعمیرگاه', 'مکانیک', 'لاستیک', 'روغن موتور', 'بیمه بدنه', 'بیمه ثالث', 'جریمه', 'خودرو', 'ماشین', 'موتور'] },
        { id: 'bills', label: 'قبوض', kw: ['قبض', 'برق', 'آب', 'گاز', 'تلفن', 'اینترنت', 'شارژ', 'بسته اینترنت', 'سیم کارت', 'ایرانسل', 'همراه اول', 'رایتل', 'مخابرات', 'عوارض شهرداری', 'شارژ ساختمان', 'آبونمان'] },
        { id: 'clothing', label: 'پوشاک', kw: ['کفش', 'لباس', 'پیراهن', 'شلوار', 'مانتو', 'کت', 'کاپشن', 'جوراب', 'کیف', 'پوشاک', 'تیشرت', 'دامن', 'روسری', 'شال', 'کمربند'] },
        /* ۱.۳.۸۳: «سلامت» و «آرایش و بهداشت» یکی شدند */
        { id: 'health', label: 'سلامت و بهداشت', kw: ['آرایشگاه', 'آرایشی', 'بهداشتی', 'شامپو', 'عطر', 'ادکلن', 'کرم', 'اصلاح', 'سالن زیبایی', 'مو', 'داروخانه', 'دارو', 'دکتر', 'پزشک', 'ویزیت', 'دندانپزشک', 'دندان', 'بیمارستان', 'آزمایش', 'سونوگرافی', 'عینک', 'بیمه تکمیلی', 'فیزیوتراپی', 'درمانگاه', 'کلینیک', 'آمپول'] },
        /* ۱.۳.۸۳: «مسکن» و «لوازم خانه» یکی شدند (نام «لوازم خانه»، آیکون خانه) */
        { id: 'home', label: 'لوازم خانه', kw: ['اجاره', 'رهن', 'ودیعه', 'تعمیرات', 'لوله کش', 'برقکار', 'نقاشی ساختمان', 'بنگاه', 'کمیسیون', 'یخچال', 'لباسشویی', 'ظرفشویی', 'مبل', 'فرش', 'لوازم خانگی', 'ظروف', 'شوینده', 'دستمال', 'پودر', 'جاروبرقی', 'تلویزیون', 'لامپ'] },
        { id: 'education', label: 'آموزش', kw: ['شهریه', 'کلاس', 'کتاب', 'دانشگاه', 'مدرسه', 'آموزشگاه', 'دوره', 'لوازم التحریر', 'دفتر', 'کنکور'] },
        { id: 'fun', label: 'تفریح', kw: ['سینما', 'تئاتر', 'کنسرت', 'سفر', 'هتل', 'مسافرت', 'شهربازی', 'باشگاه', 'استخر', 'بازی', 'فیلیمو', 'نماوا', 'اشتراک', 'گردش', 'کافی نت'] },
        { id: 'gift', label: 'هدیه و کمک', kw: ['هدیه', 'کادو', 'عیدی', 'نذر', 'صدقه', 'خیریه', 'کمک به'] },
        { id: 'debt', label: 'اقساط و وام', kw: ['قسط', 'اقساط', 'وام', 'بدهی', 'چک'] },
        { id: 'tech', label: 'دیجیتال', kw: ['موبایل', 'گوشی', 'لپ تاپ', 'لپتاپ', 'کامپیوتر', 'هدفون', 'شارژر', 'کابل', 'دیجی کالا', 'دیجیکالا'] }
      ];
      var BY_ID = {};
      CATS.forEach(function (c) { BY_ID[c.id] = c; });
      /* ۱.۳.۸۳: شناسه‌های ادغام‌شده → دستهٔ تازه (دیکشنری یادگرفته، پنهان‌ها و آمار قبلی) */
      var ALIAS = { housing: 'home', care: 'health' };
      function al(id) { return ALIAS[id] || id; }
      var _dict = null;
      var _pending = {};
      function norm(s) {
        s = String(s == null ? '' : s);
        try { s = toEnglishDigits(s); } catch (e) {}
        return s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ة]/g, 'ه').replace(/[أإآ]/g, 'ا')
          .replace(/[‌‏‎ً-ٟ]/g, ' ')
          .replace(/[0-9.,،؛:!؟?()\[\]{}"'«»\-_/\\+*#@٪%]+/g, ' ')
          .replace(/\s+/g, ' ').trim().toLowerCase();
      }
      /* کلیدواژه‌ها هم نرمال شوند (مثلاً «آب» → «اب») */
      /* بانک گسترش‌یافتهٔ کلیدواژه‌ها (بدون تکرار) */
      var EXTRA_KW = {"food": ["نانوایی سنگک", "بربری", "لواش", "تافتون", "کره", "خامه", "دوغ", "کشک", "عسل", "مربا", "شکر", "قند", "نمک", "ادویه", "زعفران", "حبوبات", "لوبیا", "عدس", "نخود", "ماکارونی", "رب", "کنسرو", "تن ماهی", "سوسیس", "کالباس", "همبرگر", "چیپس", "پفک", "نوشابه", "آبمیوه", "آب معدنی", "شیرینی فروشی", "قنادی", "کافی شاپ", "فلافل", "کبابی", "حلیم", "آش", "جگرکی", "طباخی", "پیتزا فروشی", "سوشی", "فست فود", "سبزیجات", "صیفی", "گوجه", "سیب زمینی", "پیاز", "خیار", "هندوانه", "پرتقال", "سیب", "موز", "خرما", "گردو", "پسته", "بادام", "تخمه", "کلوچه", "بیسکویت", "شکلات", "کیک", "ژله", "بستنی فروشی", "سوپر", "هایپرمارکت", "فروشگاه رفاه", "شهروند", "هایپر استار", "جانبو", "اکالا", "دیجی فرش", "اسنپ مارکت", "تپسی فود", "بوقلمون", "میگو", "گوشت قرمز", "گوساله", "گوسفند", "مرغ و تخم مرغ", "پنیر پیتزا", "نهار اداره"], "transport": ["کرایه", "تاکسی اینترنتی", "اسنپ باکس", "الوپیک", "پیک", "دوچرخه", "اسکوتر", "بلیط اتوبوس", "بلیط هواپیما", "بلیط قطار", "رجا", "فلای تودی", "علی بابا", "عوارض آزادراه", "طرح ترافیک", "پلاک", "معاینه فنی", "تعویض روغن", "فیلتر", "باتری ماشین", "لنت", "تعمیر موتور", "صافکاری", "نقاشی ماشین", "کارواش", "پمپ بنزین", "جایگاه سوخت", "گاز cng", "کارت سوخت", "مترو کارت", "شارژ کارت مترو", "قطار شهری", "بیمه خودرو", "خلافی"], "bills": ["آب و فاضلاب", "برق منطقه", "گاز شهری", "تلفن ثابت", "موبایل", "شارژ همراه", "بسته اینترنت", "اینترنت خانگی", "وای فای", "adsl", "فیبر نوری", "مبین نت", "شاتل", "های وب", "پارس آنلاین", "آسیاتک", "قبض آب", "قبض گاز", "قبض تلفن", "قبض موبایل", "مالیات", "عوارض نوسازی", "شارژ آپارتمان", "حق شارژ"], "clothing": ["کتونی", "صندل", "دمپایی", "بوت", "پالتو", "سویشرت", "هودی", "بلوز", "تاپ", "ژاکت", "کراوات", "لباس زیر", "جین", "مایو", "چادر", "کیف پول", "ساعت مچی", "عینک آفتابی", "زیورآلات", "طلا", "نقره", "خیاطی", "خشکشویی", "اتوشویی"], "health": ["داروی", "قرص", "شربت", "واکسن", "رادیولوژی", "ام آر آی", "سی تی اسکن", "نوار قلب", "چشم پزشک", "اپتومتری", "لنز", "ارتودنسی", "جراحی", "بستری", "پرستار", "مشاوره", "روانشناس", "روانپزشک", "تغذیه", "مکمل", "ویتامین", "بیمه درمان", "فرانشیز", "آزمایشگاه", "سونو", "دندانساز", "آرایشگر", "سلمانی", "پیرایش", "کوتاهی مو", "رنگ مو", "کراتین", "ناخن", "مانیکور", "پدیکور", "اپیلاسیون", "لیزر", "فیشیال", "ماسک", "ضد آفتاب", "لوسیون", "صابون", "خمیر دندان", "مسواک", "دئودورانت", "ژیلت", "تیغ", "نوار بهداشتی", "پوشک"], "home": ["مبلمان", "میز", "صندلی", "تخت", "کمد", "بخاری", "کولر", "پنکه", "اتو", "مایکروویو", "اجاق", "گاز رومیزی", "هود", "سماور", "کتری", "چای ساز", "قهوه ساز", "آبمیوه گیری", "مخلوط کن", "غذاساز", "جارو", "سطل", "ظرف", "قابلمه", "ماهیتابه", "بشقاب", "لیوان", "قاشق", "ملافه", "پتو", "بالشت", "حوله", "مایع ظرفشویی", "سفید کننده", "دستمال کاغذی", "کیسه زباله", "لامپ ال ای دی", "ابزار", "پیچ گوشتی", "اجاره خانه", "اجاره بها", "پیش پرداخت اجاره", "ودیعه مسکن", "تعمیر لوله", "لوله کشی", "کابینت", "کاشی", "سرامیک", "گچ کاری", "بنایی", "نقاش", "کاغذ دیواری", "پرده", "ایزوگام", "آسانسور", "نگهبانی", "سرایداری", "بیمه آتش سوزی", "مصالح", "سیمان", "آجر", "در و پنجره"], "education": ["کتاب درسی", "کتابفروشی", "نوشت افزار", "خودکار", "مداد", "کیف مدرسه", "سرویس مدرسه", "کلاس زبان", "آموزشگاه زبان", "کلاس کنکور", "کلاس خصوصی", "معلم خصوصی", "دوره آنلاین", "کورس", "یودمی", "فرادرس", "مکتب خونه", "آزمون", "ثبت نام", "شهریه دانشگاه", "پایان نامه", "ترجمه", "تایپ"], "fun": ["کافه گردی", "رستوران گردی", "تفریحی", "پارک آبی", "بولینگ", "بیلیارد", "کارتینگ", "پینت بال", "اتاق فرار", "موزه", "بلیت کنسرت", "تئاتر شهر", "فیلم", "نتفلیکس", "اسپاتیفای", "یوتیوب پریمیوم", "بازی کامپیوتری", "پلی استیشن", "ایکس باکس", "گیفت کارت", "اقامتگاه", "ویلا", "کمپ", "تور", "بلیط تور", "کیش", "شمال", "مشهد", "ورزش", "بدنسازی", "یوگا", "شنا", "فوتبال", "سالن ورزشی"], "gift": ["هدیه عروسی", "کادوی تولد", "شیرینی عید", "گل فروشی", "دسته گل", "تاج گل", "کمک مالی", "قرض الحسنه", "زکات", "خمس", "فطریه", "کفاره", "نذری", "هیئت", "مسجد", "موسسه خیریه", "بهزیستی", "محک", "کمیته امداد"], "debt": ["اقساط وام", "قسط وام", "بازپرداخت", "لیزینگ", "کارت اعتباری", "بدهی کارت", "جریمه دیرکرد", "سود وام", "اصل وام", "چک برگشتی", "ضمانت"], "tech": ["تبلت", "آیپد", "آیفون", "سامسونگ", "شیائومی", "لوازم جانبی", "قاب گوشی", "گلس", "پاوربانک", "فلش", "هارد", "مموری", "کیبورد", "ماوس", "مانیتور", "پرینتر", "کارتریج", "مودم", "روتر", "اسپیکر", "ایرپاد", "ساعت هوشمند", "اپلیکیشن", "نرم افزار", "لایسنس", "آنتی ویروس", "vpn", "فیلترشکن", "هاست", "دامنه", "سرور", "اشتراک ابری", "گوگل وان", "آیکلود", "تعمیر موبایل", "تعمیر لپ تاپ"]};
      CATS.forEach(function (c) {
        var add = EXTRA_KW[c.id];
        if (add) add.forEach(function (w) { if (c.kw.indexOf(w) < 0) c.kw.push(w); });
      });
      CATS.forEach(function (c) { c.nkw = c.kw.map(norm).filter(Boolean); });
      /* دسته‌های ساخت کاربر: کنار دسته‌های پیش‌فرض؛ نام دسته خودش کلیدواژه است
         (اگر کلمه‌ای از شرح با نام دسته یکی باشد، در همان دسته حساب می‌شود) */
      var CUSTOM_KEY = STORAGE_KEY + '_catCustom';
      function registerCustom(c) {
        if (!c || !c.id || !c.label || BY_ID[c.id]) return null;
        var cat = { id: c.id, label: c.label, kw: [c.label], custom: true };
        cat.nkw = cat.kw.map(norm).filter(Boolean);
        try { _bcache = {}; } catch (eB) {}
        CATS.push(cat);
        BY_ID[cat.id] = cat;
        return cat;
      }
      try { (JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') || []).forEach(registerCustom); } catch (eCu) {}
      /* ۱.۳.۴۸: حذف دسته با × — دستهٔ دلخواه پاک می‌شود، دستهٔ پیش‌فرض پنهان؛ شرح‌های آن دسته «نامشخص» می‌شوند */
      var HIDDEN_KEY = STORAGE_KEY + '_catHidden';
      function dropFromList(id) {
        for (var i = CATS.length - 1; i >= 0; i--) if (CATS[i].id === id) CATS.splice(i, 1);
        delete BY_ID[id];
      }
      try { (JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') || []).forEach(function (id) { if (BY_ID[id] && !BY_ID[id].custom) dropFromList(id); }); } catch (eHi) {}
      function removeCat(id) {
        var c = BY_ID[id]; if (!c) return false;
        dropFromList(id);
        try {
          if (c.custom) { try { hkCatImgSet(id, ''); hkCatUserSet('Icon', id, ''); hkCatUserSet('Color', id, ''); } catch (eDi) {} }
          if (c.custom) hkStorageSet(CUSTOM_KEY, JSON.stringify(CATS.filter(function (x) { return x.custom; }).map(function (x) { return { id: x.id, label: x.label }; })));
          else {
            var hid = []; try { hid = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') || []; } catch (e0) {}
            if (hid.indexOf(id) < 0) hid.push(id);
            hkStorageSet(HIDDEN_KEY, JSON.stringify(hid));
          }
          var d = loadDict();
          Object.keys(d.phrases).forEach(function (k) {
            var p = d.phrases[k]; if (!p) return;
            var cs = (p.cs || [p.c]).filter(function (x) { return x !== id; });
            if (!cs.length) delete d.phrases[k]; else { p.cs = cs; p.c = cs[0]; }
          });
          Object.keys(d.words).forEach(function (k) { if (d.words[k] && d.words[k].c === id) delete d.words[k]; });
          saveDict();
        } catch (eR) {}
        try { _bcache = {}; } catch (eB) {}
        return true;
      }
      /* ۱.۳.۸۶: اسم تکراری؟ (مخارج، درآمد، جیب به جیب، نامشخص؛ بی‌حساسیت به ی/ک، نیم‌فاصله و فاصله) */
      function labelTaken(label) {
        var n = norm(String(label || '').replace(/\s+/g, ' ').trim()); if (!n) return false;
        var names = CATS.map(function (c) { return c.label; }).concat(['جیب به جیب', 'نامشخص']);
        try { HK_INCOME_CATS.forEach(function (c) { names.push(c.label); }); } catch (e) {}
        return names.some(function (x) { return norm(x).replace(/\s/g, '') === n.replace(/\s/g, ''); });
      }
      function addCustom(label) {
        label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 24);
        if (!label) return null;
        var n = norm(label);
        for (var i = 0; i < CATS.length; i++) if (norm(CATS[i].label) === n) return CATS[i];
        var cat = registerCustom({ id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: label });
        try {
          var list = CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; });
          hkStorageSet(CUSTOM_KEY, JSON.stringify(list));
        } catch (eS) {}
        return cat;
      }
      function loadDict() {
        if (_dict) return _dict;
        _dict = { phrases: {}, words: {} };
        try {
          var raw = localStorage.getItem(DICT_KEY);
          var o = raw ? JSON.parse(raw) : null;
          if (o && typeof o === 'object') {
            _dict.phrases = (o.phrases && typeof o.phrases === 'object') ? o.phrases : {};
            _dict.words = (o.words && typeof o.words === 'object') ? o.words : {};
            var _mig = false;
            Object.keys(_dict.phrases).forEach(function (k) {
              var p = _dict.phrases[k]; if (!p) return;
              var cs = (Array.isArray(p.cs) && p.cs.length ? p.cs : [p.c]).map(function (x) { var y = al(x); if (y !== x) _mig = true; return y; });
              cs = cs.filter(function (x, i) { return cs.indexOf(x) === i; });
              p.cs = cs; p.c = cs[0];
            });
            Object.keys(_dict.words).forEach(function (k) { var w = _dict.words[k]; if (w && ALIAS[w.c]) { w.c = al(w.c); _mig = true; } });
            if (_mig) setTimeout(saveDict, 0);
          }
        } catch (e) {}
        return _dict;
      }
      function saveDict() { try { return hkStorageSet(DICT_KEY, JSON.stringify(loadDict())); } catch (e) { return false; } }
      var STOP = {};
      ['از', 'با', 'به', 'در', 'برای', 'و', 'یا', 'که', 'این', 'اون', 'آن', 'ان', 'خرید', 'پرداخت', 'هزینه', 'بابت', 'مبلغ', 'واریز', 'کارت', 'نقد', 'قسط'].forEach(function (w) { STOP[norm(w)] = 1; });
      function words(n) { return n.split(' ').filter(function (w) { return w.length >= 2 && !STOP[w]; }); }
      /* تطابق کلیدواژه: کلمهٔ کامل یا ابتدای کلمه (برای «پیتزاها»)؛ کلیدواژهٔ بلندتر اولویت دارد */
      var _bcache = {};
      function builtin(n) {
        if (n in _bcache) return _bcache[n];
        var r = builtinScan(n);
        _bcache[n] = r;
        return r;
      }
      function builtinScan(n) {
        var best = null, bestLen = 0, padded = ' ' + n + ' ';
        CATS.forEach(function (c) {
          c.nkw.forEach(function (k) {
            if (k.length <= bestLen) return;
            if (padded.indexOf(' ' + k + ' ') >= 0 || (k.length >= 3 && padded.indexOf(' ' + k) >= 0)) { best = c.id; bestLen = k.length; }
          });
        });
        return best;
      }
      /* نتیجهٔ یک یا چند دسته: {id (اولی), ids, label, source} */
      function mk(ids, source) {
        ids = ids.map(al);
        ids = ids.filter(function (x, i) { return BY_ID[x] && ids.indexOf(x) === i; });
        if (!ids.length) return null;
        return { id: ids[0], ids: ids, label: ids.map(function (x) { return BY_ID[x].label; }).join('، '), source: source };
      }
      /** دسته‌بندی یک شرح؛ یک شرح می‌تواند چند دسته داشته باشد (مثلاً «کیسه زباله و لواشک») */
      function classify(text, row) {
        if (row && row.p2p) return { id: 'p2p', ids: ['p2p'], label: 'جیب به جیب', source: 'row' };
        if (row && row.fromPlanId) return mk(['debt'], 'plan');
        var n = norm(text);
        if (!n) return null;
        /* ۱.۳.۸۴: دستهٔ ذخیره‌شده روی خود ردیف (تا وقتی شرحش همان است) — عوض کردن دستهٔ یک شرح، ماه‌های گذشته را عوض نمی‌کند */
        if (row && Array.isArray(row.cats) && row.catKey === n) return row.cats.length ? mk(row.cats, 'row') : null;
        var d = loadDict();
        var p = d.phrases[n];
        if (p) {
          var r0 = mk(Array.isArray(p.cs) && p.cs.length ? p.cs : [p.c], p.s || 'user');
          if (r0) return r0;
        }
        var b = builtin(n);
        if (b) return mk([b], 'builtin');
        /* کلماتی که کاربر حداقل دو بار در یک دسته قرار داده (فقط برای شرح‌هایی که دیکشنری داخلی نمی‌شناسد) */
        var ws = words(n), wBest = null, wN = 1;
        ws.forEach(function (w) { var e = d.words[w]; if (e && BY_ID[e.c] && e.n > wN) { wBest = e.c; wN = e.n; } });
        if (wBest) return mk([wBest], 'user');
        _pending[n] = 1;
        return null;
      }
      /** کاربر دسته(ها) را انتخاب/اصلاح کرد → در دیکشنری شخصی ذخیره شود (catIds: رشته یا آرایه) */
      function learn(text, catIds) {
        var n = norm(text);
        if (!n) return;
        var ids = (Array.isArray(catIds) ? catIds : [catIds]).map(al).filter(function (x) { return x && BY_ID[x]; });
        var d = loadDict();
        if (!ids.length) {
          delete d.phrases[n];
        } else {
          d.phrases[n] = { c: ids[0], cs: ids, s: 'user', t: Date.now() };
          if (ids.length === 1) {
            words(n).forEach(function (w) {
              var e = d.words[w];
              if (!e || e.c !== ids[0]) d.words[w] = { c: ids[0], n: 1 };
              else e.n = (e.n || 1) + 1;
            });
          }
          delete _pending[n];
        }
        saveDict();
        try { if (typeof window.hkCatOnLearn === 'function') window.hkCatOnLearn(n, ids); } catch (eOL) {}
      }
      /* آماده برای آینده: فقط شرح‌های ناشناخته به سرویس امن ارسال می‌شوند و نتیجه ذخیره می‌شود */
      var _remoteBusy = false;
      function resolveUnknownRemote() {
        var items = Object.keys(_pending);
        if (!REMOTE_URL || _remoteBusy || !items.length || typeof fetch !== 'function') return Promise.resolve(0);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(0);
        _remoteBusy = true;
        items = items.slice(0, 40);
        return fetch(REMOTE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items }) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            var cnt = 0, d = loadDict();
            ((j && j.results) || []).forEach(function (x) {
              var n = norm(x && x.text);
              if (n && x.category && BY_ID[x.category] && !d.phrases[n]) { d.phrases[n] = { c: x.category, s: 'remote', t: Date.now() }; cnt++; }
              delete _pending[n];
            });
            if (cnt) saveDict();
            return cnt;
          })
          .catch(function () { return 0; })
          .then(function (c) { _remoteBusy = false; return c; });
      }
      /* پشتیبان‌گیری/بازیابی دسته‌بندی‌ها */
      function exportData() {
        var custom = CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; });
        var d = loadDict();
        var img = {}, ico = {}, col = {}; try { img = hkCatImgMap(); ico = hkCatUserMap('Icon'); col = hkCatUserMap('Color'); } catch (eI) {}
        var inCustom = []; try { inCustom = hkInCustomLoad(); } catch (eIn) {}
        return { version: 1, custom: custom, dict: { phrases: d.phrases || {}, words: d.words || {} }, img: img, icon: ico, color: col, inCustom: inCustom };
      }
      function importData(o, mode) {
        if (!o || typeof o !== 'object') return;
        (Array.isArray(o.custom) ? o.custom : []).forEach(function (c) { if (c && c.id && c.label) registerCustom(c); });
        /* ۱.۳.۸۷: دسته‌های درآمدِ ساخت کاربر */
        try { if (Array.isArray(o.inCustom)) { hkInCustomSync(o.inCustom.filter(function (c) { return c && /^in_u_/.test(c.id) && c.label; })); hkInCustomSave(); } } catch (eIn) {}
        /* ۱.۳.۸۵: عکس دسته‌های ساخت کاربر */
        try { if (o.img && typeof o.img === 'object') Object.keys(o.img).forEach(function (k) { if (/^data:image\//.test(String(o.img[k]))) hkCatImgSet(k, o.img[k]); }); } catch (eIm) {}
        try { if (o.icon && typeof o.icon === 'object') Object.keys(o.icon).forEach(function (k) { if (HK_ICON_BANK[o.icon[k]]) hkCatUserSet('Icon', k, o.icon[k]); }); if (o.color && typeof o.color === 'object') Object.keys(o.color).forEach(function (k) { if (/^#[0-9a-f]{6}$/i.test(o.color[k])) hkCatUserSet('Color', k, o.color[k]); }); } catch (eIc) {}
        hkStorageSet(CUSTOM_KEY, JSON.stringify(CATS.filter(function (c) { return c.custom; }).map(function (c) { return { id: c.id, label: c.label }; })));
        var src = (o.dict && typeof o.dict === 'object') ? o.dict : {};
        var d = loadDict();
        if (mode === 'replace') { d.phrases = {}; d.words = {}; }
        Object.keys(src.phrases || {}).forEach(function (k) { d.phrases[k] = src.phrases[k]; });
        Object.keys(src.words || {}).forEach(function (k) {
          var a = d.words[k], b = src.words[k];
          d.words[k] = (a && b && a.c === b.c) ? { c: a.c, n: Math.max(a.n || 0, b.n || 0) } : b;
        });
        saveDict();
        _bcache = {};
      }
      return { classify: classify, learn: learn, addCustom: addCustom, labelTaken: labelTaken, removeCat: removeCat, categories: CATS, byId: BY_ID, normalize: norm, resolveUnknownRemote: resolveUnknownRemote, pendingUnknown: function () { return Object.keys(_pending); }, exportData: exportData, importData: importData };
    })();

    /* ===== ۱.۳.۸۴: دستهٔ هر ردیف مخارج روی خود ردیف (cats + catKey = شرح نرمال‌شدهٔ همان لحظه) =====
       ردیف تازه با حدس دیکشنری علامت می‌خورد؛ انتخاب دسته برای یک شرح فقط ردیف‌های همین ماه را عوض می‌کند. */
    function hkCatStampRow(r, force) {
      if (!r || r.deletedAt || r.p2p || r.fromPlanId) return false;
      var n = HKCategorizer.normalize(String(r.desc || '').trim()); if (!n) return false;
      if (!force && Array.isArray(r.cats) && r.catKey === n) return false;
      var c = HKCategorizer.classify(r.desc); /* بی ردیف: حدس دیکشنری */
      if (!c) { if (r.catKey !== n) { delete r.cats; delete r.catKey; } return false; }
      r.cats = c.ids.slice(); r.catKey = n; return true;
    }
    function hkCatStampSide(side) {
      var ch = 0;
      ((side && side.sections) || []).forEach(function (sec) { (sec.rows || []).forEach(function (r) { if (hkCatStampRow(r)) ch++; }); });
      return ch;
    }
    window.hkCatOnLearn = function (n, ids) {
      try {
        var ch = 0;
        ((periodData && periodData.expense && periodData.expense.sections) || []).forEach(function (sec) {
          (sec.rows || []).forEach(function (r) {
            if (!r || r.deletedAt || r.p2p || r.fromPlanId) return;
            if (HKCategorizer.normalize(String(r.desc || '').trim()) !== n) return;
            r.cats = (ids || []).slice(); r.catKey = n; ch++;
          });
        });
        if (ch) { try { persistCurrent(); scheduleSave(); } catch (e) {} }
      } catch (e2) {}
    };

    /* ===== ۱.۳.۸۴: نسخهٔ ساختار داده + تبدیل‌های مرتب‌شده =====
       هر تبدیل یک شماره دارد و فقط یک بار، به ترتیب، اجرا می‌شود. پیش از اجرا یک نسخهٔ کامل از داده در IndexedDB نگه داشته می‌شود
       (hk-store › preMig_<شمارهٔ آخرین تبدیل>) تا اگر تبدیلی خراب کرد، داده برگردانده شود. */
    var HK_DATA_VER_KEY = STORAGE_KEY + '_dataVer';
    var HK_MIGRATIONS = [
      { v: 1, name: 'ادغام دسته‌ها (مسکن→لوازم خانه، آرایش و بهداشت→سلامت و بهداشت)', run: function () {
        /* دیکشنری در خود HKCategorizer با ALIAS تبدیل می‌شود؛ این‌جا فقط ذخیرهٔ دوباره */
        try { HKCategorizer.classify('_'); } catch (e) {}
        return 0;
      } },
      { v: 2, name: 'دسته روی خود ردیف‌های مخارج', run: function (arc) {
        var ch = 0;
        Object.keys(arc || {}).forEach(function (k) { var pd = arc[k]; if (pd && pd.expense) ch += hkCatStampSide(pd.expense); });
        return ch;
      } },
      { v: 3, name: 'پاک کردن فرستنده→بانکِ یادگرفته با روش قدیمی (تکه‌ای از کلمه مثل «سامانه»/«جدید»)', run: function () {
        try { localStorage.removeItem(STORAGE_KEY + '_senderBank'); } catch (e) {}
        return 0;
      } }
    ];
    function hkDataVer() { try { return Number(localStorage.getItem(HK_DATA_VER_KEY)) || 0; } catch (e) { return 0; } }
    function hkRunMigrations() {
      var cur = hkDataVer();
      var todo = HK_MIGRATIONS.filter(function (m) { return m.v > cur; }).sort(function (a, b) { return a.v - b.v; });
      if (!todo.length) return Promise.resolve(0);
      try { persistCurrent(); } catch (e0) {}
      var snap = null;
      try { snap = JSON.stringify(getBundle()); } catch (eS) {}
      var last = todo[todo.length - 1].v;
      var save = (snap && typeof HKStore !== 'undefined')
        ? HKStore.put('preMig_' + last, { at: Date.now(), from: cur, to: last, v: snap }).then(function () { return HKStore.del('preMig_' + (cur - 1)); }).catch(function () { return false; })
        : Promise.resolve(false);
      return save.then(function () {
        var done = cur;
        for (var i = 0; i < todo.length; i++) {
          try { todo[i].run(archive); done = todo[i].v; }
          catch (eM) { try { console.error('migration', todo[i].v, eM); } catch (eC) {} break; }
        }
        try { loadCurrent(); } catch (e1) {}
        try { saveArchive(); } catch (e2) {}
        try { localStorage.setItem(HK_DATA_VER_KEY, String(done)); } catch (e3) {}
        try { renderAll(); } catch (e4) {}
        return done;
      });
    }
    try { window.hkRunMigrations = hkRunMigrations; window.hkDataVer = hkDataVer; window.HK_MIGRATIONS = HK_MIGRATIONS; } catch (eWm) {}

    /* =====================================================================
       پنل هوشمند داخل «باکس هوشمند» کارت کاربر (SmartPanel)
       صفحه‌ها مستقل‌اند؛ هر صفحه اگر دادهٔ معنادار نداشته باشد null برمی‌گرداند
       و از چرخه حذف می‌شود. از محاسبات موجود (personTotals، sectionPaidUnpaidTotal،
       ledgerPairNets، plans، rowFinancialContext) استفاده می‌شود.
       ===================================================================== */
    var SMART_PANEL_INTERVAL = 10000;   /* جابه‌جایی خودکار */
    var SMART_PANEL_IDLE = 15000;       /* توقف پس از تعامل کاربر */
    var _smartPanelState = {};          /* title → { key, pausedUntil, nextAt } */

    function spEsc(s) { try { return escapeHtml(String(s)); } catch (e) { return String(s); } }
    function spFa(n) { try { return toPersianDigits(String(n)); } catch (e) { return String(n); } }
    /* مبلغ فشرده برای فضای کوچک (اعداد فارسی) */
    function spAmt(n) {
      n = Number(n) || 0;
      var a = Math.abs(n), neg = n < 0;
      var f = function (v) { var r = Math.round(v * 10) / 10; return spFa(String(r).replace('.', '٫')); };
      /* منفی: علامت پشت عدد (سمت چپ) — عدد و علامت داخل ایزولهٔ LTR */
      var num = function (t) { return neg ? '\u2066-' + t + '\u2069' : t; };
      if (a >= 1e9) return num(f(a / 1e9)) + ' میلیارد';
      if (a >= 1e6) return num(f(a / 1e6)) + ' میلیون';
      return num(spFa(formatNum(a)));
    }
    /* عدد و ٪ داخل ایزولهٔ LTR تا در متن راست‌به‌چپ «۵۴٪» نمایش داده شود نه «٪۵۴» */
    function spPct(v) { return '⁦' + spFa(Math.round(v)) + '٪⁩'; }
    function spPrevSection(tab, title, back) {
      try {
        var y = currentYear, m = currentMonth;
        for (var i = 0; i < (back || 1); i++) { var p = prevYearMonth(y, m); y = p.y; m = p.m; }
        var raw = archive[periodKey(y, m)];
        if (!raw) return null;
        var side = raw[tab];
        var secs = (side && side.sections) || [];
        var t = (title || '').trim();
        for (var k = 0; k < secs.length; k++) if (((secs[k] && secs[k].title) || '').trim() === t) return secs[k];
      } catch (e) {}
      return null;
    }
    function spRows(sec) {
      return ((sec && sec.rows) || []).filter(function (r) { return r && !r.deletedAt && !r.p2p && (Number(r.amount) || 0) > 0; });
    }
    function spDay(r) { var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10); return d >= 1 && d <= 31 ? d : 0; }
    /* مبلغ شخصی هر ردیف مخارج — همان قاعدهٔ sectionPaidUnpaidTotal */
    function spPersonalExpense(r) {
      return sectionPaidUnpaidTotal({ rows: [r] }, { personalExpenseOnly: true }).total;
    }
    /* درصدهای صحیح با جمع دقیقاً ۱۰۰ (روش بزرگ‌ترین باقی‌مانده) */
    function spPercents100(amounts) {
      var tot = amounts.reduce(function (s, a) { return s + a; }, 0);
      if (!(tot > 0)) return amounts.map(function () { return 0; });
      var raw = amounts.map(function (a) { return a / tot * 100; });
      var fl = raw.map(Math.floor);
      var rest = 100 - fl.reduce(function (s, a) { return s + a; }, 0);
      raw.map(function (v, i) { return { i: i, r: v - fl[i] }; })
        .sort(function (a, b) { return b.r - a.r; })
        .slice(0, rest).forEach(function (x) { fl[x.i] += 1; });
      return fl;
    }
    /* جمع هر دسته؛ شرحِ چنددسته‌ای به‌طور مساوی بین دسته‌هایش تقسیم می‌شود.
       maxDay: فقط ردیف‌های تا این روز (برای مقایسهٔ «تا امروز») */
    function spCategoryTotals(sec, maxDay) {
      var map = {}, cnt = {}, total = 0, unknown = 0, rows = 0;
      spRows(sec).forEach(function (r) {
        if (maxDay && maxDay < 31) { var d = spDay(r); if (!d || d > maxDay) return; }
        var a = spPersonalExpense(r);
        if (!a) return;
        rows++;
        total += a;
        var c = HKCategorizer.classify(r.desc, r);
        if (!c) { unknown += a; return; }
        var share = a / c.ids.length;
        c.ids.forEach(function (id) { map[id] = (map[id] || 0) + share; cnt[id] = (cnt[id] || 0) + 1; });
      });
      var list = Object.keys(map).map(function (k) { return { id: k, label: HKCategorizer.byId[k].label, amount: map[k], count: cnt[k] }; })
        .sort(function (x, y) { return y.amount - x.amount; });
      /* درصدها یک‌بار و یکسان برای همهٔ صفحه‌ها (جمع ۱۰۰؛ «نامشخص» هم حساب می‌شود) */
      var items = list.slice();
      if (unknown > 0) items.push({ id: '', label: 'نامشخص', amount: unknown, count: 0 });
      var pcts = spPercents100(items.map(function (x) { return x.amount; }));
      items.forEach(function (x, i) { x.pct = pcts[i]; });
      return { list: list, items: items, total: total, unknown: unknown, rows: rows };
    }
    /* فقط اقساطی که در بخش اقساط به همین کاربر وصل شده‌اند */
    function spPlansForTitle(title) {
      var t = (title || '').trim();
      return (plans || []).filter(function (p) {
        if (!p) return false;
        var lt = (p.expenseSectionTitle || '').trim();
        if (!lt && p.expenseSectionId) {
          var s = ((periodData.expense && periodData.expense.sections) || []).find(function (x) { return x && x.id === p.expenseSectionId; });
          if (s) lt = (s.title || '').trim();
        }
        return !!lt && lt === t;
      });
    }
    /* اقساط پرداخت‌نشده: همهٔ معوق‌ها + سررسیدهای تا ۳۱ روز آینده */
    /* قسط‌های ماهِ انتخاب‌شده (سررسید در همین ماه) با وضعیت پرداخت؛ در ماه جاری قسط‌های معوقِ ماه‌های قبل هم */
    function spInstallments(title) {
      var out = [];
      /* ۱.۳.۵۱: اقساط پنهان: هیچ اسلاید/نکتهٔ قسطی در هیچ ماهی */
      if (!HK_INSTALLMENTS_ON) return out;
      try {
        var today = getTodayPersian();
        var ti = dateToIndex(today.y, today.m, today.d);
        var isCur = currentYear === today.y && currentMonth === today.m;
        spPlansForTitle(title).forEach(function (plan) {
          var count = Math.max(0, parseInt(plan.count, 10) || 0);
          var paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
          for (var i = 0; i < count; i++) {
            var due = dueDateForInstallment(plan, i);
            var inMonth = due.y === currentYear && due.m === currentMonth;
            var before = (due.y * 100 + due.m) < (currentYear * 100 + currentMonth);
            var early = !!(plan.paidEarlyMap && plan.paidEarlyMap[String(i)]);
            var isPaid = (i < paid && !isPlanIndexPaidLate(plan, i)) || early;
            var days = dateToIndex(due.y, due.m, due.d) - ti;
            /* ماه جاری: معوق‌های قبل و سررسیدهای ۷ روز آینده (حتی اگر به ماه بعد برسد) هم */
            if (!(inMonth || (isCur && i >= paid && !early && (before || (days >= 0 && days <= 7))))) continue;
            out.push({ pid: plan.id || plan.name || '', name: plan.name || 'قسط', days: days, amount: planInstallmentAmount(plan), paid: isPaid, idx: i, inMonth: inMonth });
          }
        });
      } catch (e) {}
      return out.sort(function (a, b) { return a.days - b.days; });
    }
    /* طلب و بدهی کارت از منوی قرض. نام‌ها یکدست مقایسه می‌شوند (ي/ی، ك/ک، فاصله و نیم‌فاصله).
       قرض‌هایی که هیچ‌کدام از دو طرفش نام یک کارت نیست (مثلاً «من / علی») روی کارت اول نشان داده می‌شوند */
    function spLedger(title) {
      var nm = function (v) { return String(v || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c\u200e\u200f\u00a0]+/g, ''); };
      var t = nm(title), debt = 0, credit = 0, list = [];
      var cards = []; try { cards = (allPersonTitles() || []).map(nm); } catch (eC) {}
      var first = cards.length ? cards[0] : t;
      try {
        (typeof ledgerPairNets === 'function' ? ledgerPairNets() : []).forEach(function (x) {
          var a = Number(x.amount) || 0;
          if (a <= 0) return;
          var d = nm(x.debtor), c = nm(x.creditor);
          if (d === t) { debt += a; list.push({ who: (x.creditor || '').trim(), amount: a, type: 'debt' }); }
          else if (c === t) { credit += a; list.push({ who: (x.debtor || '').trim(), amount: a, type: 'credit' }); }
          else if (t === first && cards.indexOf(d) < 0 && cards.indexOf(c) < 0) list.push({ who: (x.debtor || '').trim(), to: (x.creditor || '').trim(), amount: a, type: 'other' });
        });
      } catch (e) {}
      list.sort(function (p, q) { return q.amount - p.amount; });
      return { debt: debt, credit: credit, list: list };
    }
    function spActiveProjects(title) {
      var ids = {};
      ['income', 'expense'].forEach(function (tab) {
        spRows(findSectionByTitle(tab, title)).forEach(function (r) {
          var fc = rowFinancialContext(r);
          if (fc.subjectId && fc.subjectId !== 'personal') ids[fc.subjectId] = 1;
        });
      });
      return Object.keys(ids).length;
    }

    /* =====================================================================
       اعلان‌های هوشمند (HKAlerts) — کاملاً محلی و قطعی، بدون AI
       سه نوع: dup (تشخیص تکرار/خطا، مهم‌ترین) · analysis (تحلیل مالی) · project (پروژه)
       هر اعلان شناسهٔ ثابتِ رویداد دارد؛ هر بار از روی داده‌ها دوباره محاسبه می‌شود،
       پس اگر شرطش دیگر برقرار نباشد خودبه‌خود حذف می‌شود. نمایشِ «یک‌باره» (toast)
       با دفتر alertsShown در localStorage کنترل می‌شود تا با هر بار باز شدن نرم‌افزار تکرار نشود.
       ===================================================================== */
    var HKAlerts = (function () {
      var SHOWN_KEY = STORAGE_KEY + '_alertsShown';
      var DISMISS_KEY = STORAGE_KEY + '_alertsDismissed';
      var GENERIC = {};
      ['برداشت بانکی', 'واریز بانکی'].forEach(function (g) { GENERIC[HKCategorizer.normalize(g)] = 1; });
      function loadMap(k) { try { var o = JSON.parse(localStorage.getItem(k) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
      function saveMap(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
      function rowKey(tab, r, i) {
        return tab + ':' + (r.id || ('i' + i + '_' + spDay(r) + '_' + (Number(r.amount) || 0) + '_' + HKCategorizer.normalize(r.desc)));
      }
      /* ۱.۳.۸۶: کلید پایدار (بدون شمارهٔ ردیف) تا «تکراری نیست» با افزودن/حذف ردیف دیگر از بین نرود */
      /* ۱.۳.۸۷: کلید بی‌شرح: «تکراری نیست» با هر شرحی (و با ویرایش شرح) ماندگار است */
      function rowKeyN(tab, r) {
        return tab + ':' + (r.id || ('n' + spDay(r) + '_' + (r.time || '') + '_' + (Number(r.amount) || 0) + '_' + (r.account || '').trim() + '_' + (r.viaSms ? 1 : 0)));
      }
      function rowKeyS(tab, r) {
        return tab + ':' + (r.id || ('s' + spDay(r) + '_' + (r.time || '') + '_' + (Number(r.amount) || 0) + '_' + HKCategorizer.normalize(r.desc) + '_' + (r.account || '').trim() + '_' + (r.viaSms ? 1 : 0)));
      }
      function tokens(n) { return n.split(' ').filter(function (w) { return w.length >= 2; }); }
      function similarDesc(a, b) {
        var na = HKCategorizer.normalize(a), nb = HKCategorizer.normalize(b);
        if (!na || !nb) return false;
        if (na === nb) return true;
        if (na.length >= 3 && nb.length >= 3 && (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0)) return true;
        var ta = tokens(na), tb = tokens(nb);
        if (!ta.length || !tb.length) return false;
        var inter = ta.filter(function (w) { return tb.indexOf(w) >= 0; }).length;
        return inter / Math.min(ta.length, tb.length) >= 0.6;
      }
      function isGeneric(r) { return !!GENERIC[HKCategorizer.normalize(r.desc)]; }

      /* ۳) تکرار/خطا: مبلغ + شرح + روز + کاربر (بخش همان کاربر) + حساب + نوع (درآمد/مخارج) */
      function duplicates(title) {
        var out = [], dis = loadMap(DISMISS_KEY);
        ['expense', 'income'].forEach(function (tab) {
          var rows = spRows(findSectionByTitle(tab, title));
          for (var i = 0; i < rows.length; i++) {
            for (var j = i + 1; j < rows.length; j++) {
              var a = rows[i], b = rows[j];
              if (a.fromPlanId && b.fromPlanId) continue;
              /* ۱.۳.۸۷: دو قسطِ کارت‌های قسط مختلف (برچسب جدا) تکراری نیستند */
              if (a.instTag && b.instTag && a.instTag !== b.instTag) continue;
              var A = Number(a.amount) || 0, B = Number(b.amount) || 0;
              if (A < 1000 || Math.abs(A - B) > Math.max(A, B) * 0.01) continue;
              var accA = (a.account || '').trim(), accB = (b.account || '').trim();
              if (accA && accB && accA !== accB) continue;
              var da = spDay(a), db = spDay(b);
              var sms = (!!a.viaSms) !== (!!b.viaSms);
              var dd = (da && db) ? Math.abs(da - db) : (da || db ? 99 : 0);
              var sameDay = da && db && da === db;
              /* فقط وقتی متن شرح‌ها دقیقاً یکی باشد (پس از یکسان‌سازی فاصله و حروف عربی/فارسی) */
              var na = HKCategorizer.normalize(a.desc), nb = HKCategorizer.normalize(b.desc);
              if (!na || na !== nb) continue;
              var hit = sameDay || dd <= 2;
              if (!hit) continue;
              var id = 'dup:' + rowKeyN(tab, a) + '|' + rowKeyN(tab, b);
              if (dis[id] || dis['dup:' + rowKeyN(tab, b) + '|' + rowKeyN(tab, a)] || dis['dup:' + rowKeyS(tab, a) + '|' + rowKeyS(tab, b)] || dis['dup:' + rowKey(tab, a, i) + '|' + rowKey(tab, b, j)]) continue;
              var label = (isGeneric(a) && !isGeneric(b) ? b.desc : a.desc) || (tab === 'income' ? 'درآمد' : 'هزینه');
              out.push({
                id: id, type: 'dup', p: 100, tab: tab, ra: a, rb: b,
                title: 'احتمال ثبت تکراری',
                /* ۱.۳.۸۷: مبلغ، بانک و روز در متن تا موردها از هم جدا شناخته شوند */
                text: sms ? ('تراکنش پیامکی ' + spAmt(A) + ' تومان' + ((accA || accB) ? ' (' + (accA || accB) + ')' : '') + (da ? ' در ' + spFa(da) + ' ' + MONTHS[currentMonth - 1] : '') + ' احتمالاً قبلاً دستی با شرح «' + label + '» ثبت شده.')
                          : ('«' + label + '» ' + spAmt(A) + ' تومان' + ((accA || accB) ? ' (' + (accA || accB) + ')' : '') + ' ' + (sameDay ? (da ? 'در ' + spFa(da) + ' ' + MONTHS[currentMonth - 1] : 'در همان روز') : 'در فاصلهٔ کوتاه') + ' دو بار ثبت شده.'),
                toast: 'احتمال ثبت تکراری: «' + label + '»'
              });
            }
          }
        });
        return out;
      }

      /* ۱) تحلیل مالی: فقط بر اساس سابقهٔ خود کاربر؛ بدون دادهٔ کافی هیچ اعلانی ساخته نمی‌شود */
      function analysis(title) {
        var out = [];
        var today = getTodayPersian();
        var isNow = today.y === currentYear && today.m === currentMonth;
        var cut = isNow ? today.d : 31;
        var cur = findSectionByTitle('expense', title), prev = spPrevSection('expense', title, 1);
        var sumTo = function (sec) {
          var s = 0, n = 0;
          spRows(sec).forEach(function (r) {
            if (cut < 31) { var d = spDay(r); if (!d || d > cut) return; }
            var a = spPersonalExpense(r); if (a) { s += a; n++; }
          });
          return { s: s, n: n };
        };
        var key = periodKey(currentYear, currentMonth);
        if (prev) {
          var t = sumTo(cur), p = sumTo(prev);
          if (p.n >= 3 && p.s > 0 && t.n >= 2) {
            var ch = (t.s - p.s) / p.s * 100;
            if (ch >= 20) out.push({ id: 'mom:' + title + ':' + key, type: 'analysis', p: 60, title: 'خرجت افزایش پیدا کرده',
              text: 'مخارج این ماه ' + (cut < 31 ? 'تا امروز ' : '') + spPct(ch) + ' بیشتر از ماه قبل است.' });
          }
          var ct = spCategoryTotals(cur, cut), cp = spCategoryTotals(prev, cut), best = null;
          ct.list.forEach(function (c) {
            var pc = null;
            cp.list.forEach(function (x) { if (x.id === c.id) pc = x; });
            if (!pc || pc.count < 2 || pc.amount <= 0 || c.count < 2) return;
            var g = (c.amount - pc.amount) / pc.amount;
            if (g >= 0.3 && c.amount >= ct.total * 0.1 && (!best || g > best.g)) best = { c: c, g: g };
          });
          if (best) out.push({ id: 'cat:' + title + ':' + key + ':' + best.c.id, type: 'analysis', p: 50, title: 'هزینهٔ ' + best.c.label + ' افزایش داشته',
            text: 'این ماه ' + spAmt(best.c.amount) + ' تومان برای ' + best.c.label + ' ثبت کرده‌ای.' });
        }
        /* هزینهٔ غیرعادی: نسبت به سابقهٔ همین کاربر (میانه و صدک ۷۵)، نه یک عدد ثابت */
        var hist = [], older = [];
        for (var k = 1; k <= 6; k++) {
          spRows(spPrevSection('expense', title, k)).forEach(function (r) {
            if (r.fromPlanId) return;
            var a = spPersonalExpense(r); if (a) { hist.push(a); older.push({ a: a, d: r.desc }); }
          });
        }
        var curRows = spRows(cur).filter(function (r) { return !r.fromPlanId && spPersonalExpense(r) > 0; });
        curRows.forEach(function (r) { hist.push(spPersonalExpense(r)); });
        if (hist.length >= 13) {
          var cand = null;
          curRows.forEach(function (r, ri) {
            var a = spPersonalExpense(r);
            var others = hist.slice(); others.splice(others.indexOf(a), 1);
            others.sort(function (x, y) { return x - y; });
            var med = others[Math.floor(others.length / 2)] || 0;
            var p75 = others[Math.floor(others.length * 0.75)] || 0;
            if (!(med > 0) || a < med * 4 || a < p75 * 2) return;
            /* هزینهٔ تکرارشونده (مثل اجاره) غیرعادی نیست */
            var recurring = older.some(function (o) { return Math.abs(o.a - a) <= a * 0.25 && similarDesc(o.d, r.desc); });
            if (recurring) return;
            if (!cand || a / med > cand.ratio) cand = { r: r, i: ri, a: a, ratio: a / med };
          });
          if (cand) out.push({ id: 'odd:' + title + ':' + key + ':' + rowKey('expense', cand.r, cand.i), type: 'analysis', p: 70, title: 'هزینهٔ غیرعادی ثبت شد',
            text: '«' + (cand.r.desc || 'هزینه') + '» با ' + spAmt(cand.a) + ' تومان نسبت به هزینه‌های معمولت مبلغ بالایی دارد.' });
        }
        return out;
      }

      /* ۲) پروژه‌ها: مستقیماً از computeSubjectReport (همان محاسبهٔ گزارش پروژه) */
      /* پروژه‌ها فقط با تراکنش‌های ماهِ انتخاب‌شده؛ ماهی که پروژه تراکنشی ندارد، چیزی نشان داده نمی‌شود */
      function projects(title) {
        var ids = {}, t = (title || '').trim();
        try {
          ['income', 'expense'].forEach(function (tab) {
            ((periodData[tab] && periodData[tab].sections) || []).forEach(function (sec) {
              if (((sec && sec.title) || '').trim() !== t) return;
              (sec.rows || []).forEach(function (r) {
                if (!r || r.deletedAt || (r.status || 'paid') !== 'paid') return;
                var fc = rowFinancialContext(r);
                if (!(fc.subjectId && fc.subjectId !== 'personal' && (fc.classification === 'third_party' || fc.accountType === 'project'))) return;
                var o = ids[fc.subjectId] || (ids[fc.subjectId] = { rec: 0, exp: 0 });
                if (tab === 'income') o.rec += Number(r.amount) || 0; else o.exp += Number(r.amount) || 0;
              });
            });
          });
        } catch (e) {}
        /* ۱.۳.۶۹: وضعیت کلی هر پروژه (از اول تا امروز)، نه فقط این ماه: جمع واریزی، جمع مخارج و مانده/بدهی.
           پروژه‌ای نمایش داده می‌شود که این ماه تراکنش دارد یا از قبل مانده/بدهی دارد */
        var out = [];
        try {
          (loadFinancialSubjects() || []).forEach(function (sub) {
            if (!sub || !sub.id || sub.id === 'personal') return;
            /* جمع از اول تا همین ماهِ باز (نه ماه‌های بعد)؛ پیش از شروع پروژه چیزی نشان داده نمی‌شود */
            var rec = 0, exp = 0, curN = currentYear * 100 + currentMonth;
            try {
              var rep = computeSubjectReport(sub.id);
              (rep && rep.rows || []).forEach(function (x) {
                var kp = String(x.key || '').split('-'); if ((+kp[0]) * 100 + (+kp[1]) > curN) return;
                if (x.tab === 'income') rec += Number(x.amt) || 0; else exp += Number(x.amt) || 0;
              });
            } catch (eR) {}
            if (!rec && !exp) return;
            var net = Math.round(rec - exp);
            if (!ids[sub.id] && Math.abs(net) < 1) return;
            var lines = ['جمع واریزی ' + spAmt(rec) + '، جمع مخارج ' + spAmt(exp)], p = 35, state;
            if (net < 0) { lines.push(spAmt(-net) + ' تومان بدهکار است.'); p = 55; state = 'over'; }
            else if (net > 0) { lines.push(spAmt(net) + ' تومان از واریزی باقی مانده.'); state = 'left'; }
            else { lines.push('پروژه تسویه است.'); state = 'even'; }
            out.push({ id: 'proj:' + sub.id + ':' + state, type: 'project', p: p, abs: Math.abs(net), title: 'پروژه ' + sub.name, text: lines.join(' '), sid: sub.id, lines: lines });
          });
        } catch (eP) {}
        return out.sort(function (a, b) { return b.p - a.p || b.abs - a.abs; }).slice(0, 3);
      }

      function forCard(title) {
        var a = [];
        try { a = a.concat(duplicates(title)); } catch (e1) {}
        try { a = a.concat(analysis(title)); } catch (e2) {}
        try { a = a.concat(projects(title)); } catch (e3) {}
        return a.sort(function (x, y) { return y.p - x.p; });
      }
      /* اعلان مهم (تکرار) فقط یک بار به‌صورت toast؛ دفترِ نمایش با رویدادهای فعال هرس می‌شود */
      function notify(titles) {
        var shown = loadMap(SHOWN_KEY), active = {}, fresh = null;
        (titles || []).forEach(function (t) {
          duplicates(t).forEach(function (al) {
            active[al.id] = 1;
            if (!shown[al.id]) { shown[al.id] = Date.now(); if (!fresh) fresh = al; }
          });
        });
        Object.keys(shown).forEach(function (k) { if (!active[k]) delete shown[k]; });
        saveMap(SHOWN_KEY, shown);
        /* هشدار تکرار فقط داخل باکس هوشمند نمایش داده می‌شود (بدون پیام پایین صفحه) */
        return fresh;
      }
      function dismiss(id) { var d = loadMap(DISMISS_KEY); d[id] = Date.now(); saveMap(DISMISS_KEY, d); }
      /* پیش از ثبت پیامک: آیا همین تراکنش قبلاً (دستی یا پیامکی) ثبت شده؟ */
      function findSimilarBeforeSave(pd, tab, amount, day, account, desc) {
        var hit = null;
        ((pd && pd[tab] && pd[tab].sections) || []).forEach(function (sec) {
          spRows(sec).forEach(function (r) {
            if (hit) return;
            if (r.fromRecurringId && r.status !== 'paid') return;
            var A = Number(r.amount) || 0;
            if (Math.abs(A - amount) > Math.max(A, amount) * 0.01) return;
            var acc = (r.account || '').trim();
            if (acc && account && acc !== account) return;
            var d = spDay(r), dd = parseInt(day, 10) || 0;
            if (d && dd && Math.abs(d - dd) > 1) return;
            if (!d && dd && !similarDesc(r.desc, desc)) return;
            hit = { row: r, section: sec.title || '' };
          });
        });
        return hit;
      }
      return { forCard: forCard, duplicates: duplicates, analysis: analysis, projects: projects, notify: notify, dismiss: dismiss, findSimilarBeforeSave: findSimilarBeforeSave };
    })();

    /* همهٔ داده‌های لازم صفحه‌ها یک‌بار محاسبه می‌شود (از توابع موجود پروژه) */
    function spCollect(title) {
      var tot = personTotals(title);
      var expSec = findSectionByTitle('expense', title);
      var prevInc = spPrevSection('income', title), prevExp = spPrevSection('expense', title);
      var alerts = HKAlerts.forCard(title);
      return {
        title: title,
        inc: Number(tot.incomeTotal) || 0,
        incPaid: Number(tot.incomePaid) || 0,
        exp: Number(tot.expenseTotal) || 0,
        expPaid: Number(tot.expensePaid) || 0,
        expUnpaid: Number(tot.expenseUnpaid) || 0,
        pInc: prevInc ? sectionPaidUnpaidTotal(prevInc, { personalIncomeOnly: true }).total : 0,
        pExp: prevExp ? sectionPaidUnpaidTotal(prevExp, { personalExpenseOnly: true }).total : 0,
        cats: spCategoryTotals(expSec),
        inst: spInstallments(title),
        led: spLedger(title),
        projects: spActiveProjects(title),
        alerts: alerts
      };
    }
    function spHead(t, cls) { return '<div class="sp-h' + (cls ? ' ' + cls : '') + '">' + t + '</div>'; }
    function spLine(label, val, cls) {
      return '<div class="sp-row"><span class="sp-l">' + label + '</span><span class="sp-v ' + (cls || '') + '">' + val + '</span></div>';
    }
    /* لوله‌ای که با انیمیشن تا درصد مشخص پر می‌شود */
    function spTube(pct, cls) {
      return '<div class="sp-bar sp-tube"><i class="' + (cls || '') + '" data-w="' + Math.max(0, Math.min(100, pct)).toFixed(1) + '"></i></div>';
    }
    function spItems(list) {
      return list.map(function (h) { return '<div class="sp-item">' + h + '</div>'; }).join('');
    }
    function spDaysLabel(d) {
      if (d < 0) return spFa(-d) + ' روز تاخیر';
      if (d === 0) return 'امروز';
      if (d === 1) return 'فردا';
      return spFa(d) + ' روز دیگر';
    }

    /* ۰) هشدار تکرار/خطا — مهم‌ترین؛ با لمس می‌توان نادیده گرفت */
    function spPageWarn(D) {
      var dups = D.alerts.filter(function (a) { return a.type === 'dup'; });
      if (!dups.length) return null;
      /* ۱.۳.۷۵: «احتمال ثبت تکراری» فقط یک بار (عنوان)، زیرش توضیح هر مورد؛ زدن = دو ردیف در جدول هایلایت می‌شوند */
      /* ۱.۳.۸۶: هر مورد شناسهٔ خودش را دارد تا زدنش دقیقاً ردیف‌های همان مورد را هایلایت کند */
      return spHead('احتمال ثبت تکراری', 'neg') + spItems(dups.slice(0, 2).map(function (a, i) {
        /* ۱.۳.۸۷: هر مورد «تکراری نیست» خودش را دارد */
        return '<div class="sp-tip" data-dup="' + i + '" data-dup-id="' + spEsc(a.id) + '">' + spEsc(a.text) + '</div><div class="sp-dup-no" data-act="dismiss" data-dup-id="' + spEsc(a.id) + '">تکراری نیست</div>';
      })) + (dups.length > 1 ? '<div class="sp-dup-no sp-dup-all" data-act="dismiss" data-dup-id="__all__">هیچ‌کدام تکراری نیست</div>' : '');
    }
    /* ۱) وضعیت این ماه: پس‌انداز و مانده، هر کدام با لولهٔ پرشونده؛ سبز = مثبت، قرمز = منفی.
       پس‌انداز = (درآمد کل − خرج کل) ÷ درآمد کل · مانده = دریافت‌شده − پرداخت‌شده (پول واقعیِ مانده) */
    /* یک لوله: درآمد کل ماه (دریافت‌شده و نشده) در برابر مخارج کل ماه (پرداخت‌شده و نشده).
       مثبت = «پس‌انداز کارت» (سبز)، منفی = «کسری کارت» (قرمز)؛ مبلغ و درصد. زیرش دریافت‌نشده/پرداخت‌نشده و بودجهٔ روزانه تا آخر ماه */
    function spPageOverview(D) {
      if (D.inc <= 0 && D.exp <= 0) return null;
      var rem = D.inc - D.exp, sc = rem >= 0 ? 'pos' : 'neg';
      var pct = D.inc > 0 ? Math.abs(rem) / D.inc * 100 : 100;
      var html = spHead('وضعیت این ماه') + '<div class="sp-even">';
      /* درصد بالای لوله (چپ‌چین)، مبلغ زیر لوله (راست‌چین) */
      html += '<div class="sp-blk">' + spLine(rem >= 0 ? 'پس‌انداز این ماه' : 'کسری این ماه', spPct(Math.min(999, pct)), sc) + spTube(Math.min(100, pct), sc) +
        '<div class="sp-v sp-right ' + sc + '">' + spAmt(Math.abs(rem)) + '</div>' +
        /* ۱.۳.۸۲: روشن شود این عدد موجودی کارت نیست */
        '<div class="sp-ov-formula">درآمد این ماه − خرج این ماه</div></div>';
      var incUn = Math.max(0, D.inc - D.incPaid), expUn = Math.max(0, D.expUnpaid);
      var sub = [];
      if (incUn > 0) sub.push('دریافت‌نشده ' + spAmt(incUn));
      if (expUn > 0) sub.push('پرداخت‌نشده ' + spAmt(expUn));
      var t0 = getTodayPersian();
      if (currentYear === t0.y && currentMonth === t0.m && rem > 0) {
        var dim = 30; try { dim = daysInMonth(t0.y, t0.m); } catch (eD) { dim = t0.m <= 6 ? 31 : 30; }
        var left = Math.max(1, dim - t0.d + 1);
        sub.push('بودجهٔ روزانه تا آخر ماه ' + spAmt(Math.floor(rem / left)));
      }
      if (sub.length) html += '<div class="sp-sub">' + sub.map(spEsc).join('<br>') + '</div>';
      return html + '</div>';
    }
    /* ۲) تعهدات: هر خبر جدا با خط جداکننده؛ مبلغ قسط زیر عنوانش */
    /* ناوبری از اسلاید: هر خطا بی‌صدا (نباید باکس هوشمند را از کار بیندازد) */
    function spGo(fn) { try { fn(); } catch (e) {} }
    /* اسلاید «۷ روز آینده»: اگر قسطی در آن هست → منوی اقساط، وگرنه (فقط درآمد ثابت) → جدول درآمد */
    var _spUpcomingInst = {};
    function spHasUpcomingInst(title) { return !!_spUpcomingInst[title]; }
    /* بزرگ‌ترین خرج: بعد از باز شدن جدول مخارج، همان ردیف کمی برجسته می‌شود */
    /* اسکرول نرم با مدت مشخص تا ردیف وسط صفحه بیاید؛ مدت واقعی را برمی‌گرداند */
    function hkSlowScrollTo(el, ms) {
      try {
        var sc = el.parentElement;
        while (sc && sc !== document.body) { var cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 2) break; sc = sc.parentElement; }
        var win = !sc || sc === document.body;
        var r = el.getBoundingClientRect();
        var view = win ? { top: 0, h: window.innerHeight } : (function () { var b = sc.getBoundingClientRect(); return { top: b.top, h: sc.clientHeight }; })();
        var from = win ? window.scrollY : sc.scrollTop;
        var delta = (r.top + r.height / 2) - (view.top + view.h / 2);
        var maxS = win ? (document.documentElement.scrollHeight - window.innerHeight) : (sc.scrollHeight - sc.clientHeight);
        var to = Math.max(0, Math.min(maxS, from + delta));
        if (Math.abs(to - from) < 4) return 0;
        var t0 = performance.now();
        /* ۱.۳.۴۸: ease-in-out مکعبی (شتاب مثبت اول، منفی آخر)؛ scroll-behavior نرمِ CSS در طول حرکت خاموش تا هر گام خودش دوباره نرم نشود */
        var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
        var tgt = win ? document.documentElement : sc, prevSB = tgt.style.scrollBehavior;
        tgt.style.scrollBehavior = 'auto';
        var step = function (now) {
          var k = Math.min(1, (now - t0) / ms), y = from + (to - from) * ease(k);
          if (win) window.scrollTo({ top: y, behavior: 'instant' }); else sc.scrollTop = y;
          if (k < 1) requestAnimationFrame(step); else tgt.style.scrollBehavior = prevSB;
        };
        requestAnimationFrame(step);
        return ms;
      } catch (e) { try { el.scrollIntoView({ block: 'center' }); } catch (e2) {} return 0; }
    }
    /* ۱.۳.۴۸: هر اسلاید خرج (بزرگ‌ترین، بی‌دسته، جهش) → اسکرول آرام به همان ردیف و هایلایت */
    function spFlashBiggest(title) {
      spFlashRow(title, function (rows) {
        return rows.filter(function (r) { return (r.status || 'paid') === 'paid'; }).sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })[0];
      });
    }
    function spIsNoCat(r) { var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {} return !c; }
    function spFlashFix(title) {
      spFlashRow(title, function (rows) {
        var ok = rows.filter(function (r) { return Number(r.amount) > 0 && (r.status || 'paid') === 'paid'; });
        return ok.filter(function (r) { return !r.fromPlanId && spIsNoCat(r); })[0] || ok.filter(function (r) { return !(r.account || '').trim(); })[0];
      });
    }
    var _spJumpCat = {};
    function spFlashJump(title) {
      var cid = _spJumpCat[title]; if (!cid) return;
      spFlashRow(title, function (rows) {
        return rows.filter(function (r) {
          if (!(Number(r.amount) > 0)) return false;
          var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {}
          return c && c.ids.indexOf(cid) >= 0;
        }).sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })[0];
      });
    }
    function spFlashRow(title, pick, tab) {
      tab = tab || 'expense';
      setTimeout(function () {
        try {
          var sec = findSectionByTitle(tab, title);
          var big = pick(spRows(sec).slice());
          if (!big) return;
          var idx = (sec.rows || []).indexOf(big); if (idx < 0) return;
          var tr = document.querySelectorAll('#sections-' + tab + ' tbody tr')[idx]; if (!tr) return;
          /* ۱.۳.۴۷: اسکرول آرام (مثل نسخهٔ ۱.۳.۴۵)، بعد هایلایت با ظاهر و محو شدن آرام */
          var dur = hkSlowScrollTo(tr, 1300);
          setTimeout(function () { tr.classList.add('sp-flash'); setTimeout(function () { tr.classList.remove('sp-flash'); }, 3600); }, dur + 80);
        } catch (e) {}
      }, 450);
    }
    /* ۱.۳.۷۵: چند ردیف با هم هایلایت (اسکرول تا اولی) */
    function spFlashRows(title, tab, rows) {
      setTimeout(function () {
        try {
          var sec = findSectionByTitle(tab, title), all = document.querySelectorAll('.person-detail-box tbody tr, #sections-' + tab + ' tbody tr');
          var trs = [];
          rows.forEach(function (r) {
            var box = document.querySelector('.person-detail-box tbody') ? document.querySelectorAll('.person-detail-box tbody tr') : document.querySelectorAll('#sections-' + tab + ' tbody tr');
            /* ۱.۳.۸۶: ردیف با خود شیء ردیف پیدا می‌شود (نه شماره) تا دقیقاً همان ردیف هایلایت شود */
            var tr = Array.prototype.filter.call(box, function (x) { return x._hkRow === r; })[0];
            if (!tr) { var idx = (sec.rows || []).indexOf(r); if (idx < 0) return; tr = box[idx]; }
            if (tr && trs.indexOf(tr) < 0) trs.push(tr);
          });
          if (!trs.length) return;
          var dur = 0; try { dur = hkSlowScrollTo(trs[0], 900); } catch (eS) {}
          setTimeout(function () { trs.forEach(function (tr) { tr.classList.add('sp-flash'); }); setTimeout(function () { trs.forEach(function (tr) { tr.classList.remove('sp-flash'); }); }, 3600); }, (dur || 0) + 80);
        } catch (e) {}
      }, 650);
    }
    try { window.spFlashRows = spFlashRows; } catch (eWf) {}
    function spPageObligations(D) {
      var items = [];
      var t0 = getTodayPersian();
      if (!(currentYear === t0.y && currentMonth === t0.m)) {
        /* ماه دیگر: فقط قسط‌های همان ماه و وضعیتشان */
        D.inst.slice(0, 4).forEach(function (x) {
          items.push('<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under ' + (x.paid ? 'pos' : 'neg') + '">' + (x.paid ? 'پرداخت‌شده' : 'پرداخت‌نشده') + ' · ' + spAmt(x.amount) + '</div>');
        });
        if (!items.length) return null;
        return spHead('قسط‌های ' + MONTHS[currentMonth - 1]) + spItems(items);
      }
      var open = D.inst.filter(function (x) { return !x.paid; });
      var late = open.filter(function (x) { return x.days < 0; });
      var next = open.filter(function (x) { return x.days >= 0; })[0];
      if (late.length) items.push(spLine('قسط معوق', spFa(late.length) + ' قسط', 'neg') + spLine('بیشترین تاخیر', spFa(-late[0].days) + ' روز', 'neg'));
      /* قسط بعدیِ هر وام جداگانه (دو وام با مبلغ و موعد یکسان هر دو نمایش داده می‌شوند) */
      var seenPlan = {}, upcoming = [];
      open.forEach(function (x) { if (x.days >= 0 && !seenPlan[x.pid]) { seenPlan[x.pid] = 1; upcoming.push(x); } });
      upcoming.slice(0, 3).forEach(function (x) {
        items.push('<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under"><span' + (x.days <= 1 ? ' class="neg"' : '') + '>' + spDaysLabel(x.days) + '</span>، ' + spAmt(x.amount) + ' تومان</div>');
      });
      if (!upcoming.length && late.length) items.push('<div class="sp-l">مبلغ قسط</div><div class="sp-v sp-under">' + spAmt(late[0].amount) + ' تومان</div>');
      /* ۱.۳.۶۸: هر اسلاید فقط یک موضوع؛ «پروژهٔ فعال» در اسلاید پروژه‌هاست */
      if (!items.length) return null;
      return spHead('تعهدات') + spItems(items);
    }
    /* طلب و بدهی: اسلاید جداگانه (جمع کل + طرف‌حساب‌های اصلی) */
    function spPageLedger(D) {
      var L = D.led || {};
      if (!(L.credit > 0) && !(L.debt > 0) && !(L.list || []).length) return null;
      var items = [];
      if (L.credit > 0) items.push('<div class="sp-row"><span class="sp-l pos">طلب کل</span><span class="sp-v pos">' + spAmt(L.credit) + '</span></div>');
      if (L.debt > 0) items.push('<div class="sp-row"><span class="sp-l neg">بدهی کل</span><span class="sp-v neg">' + spAmt(L.debt) + '</span></div>');
      (L.list || []).forEach(function (x) {
        /* «x به y فلان مبلغ بدهکار است» / «x از y فلان مبلغ طلبکار است» */
        if (x.type === 'other') { items.push('<div class="sp-tip">«' + spEsc(x.who) + '» به «' + spEsc(x.to) + '» <b class="neg">' + spAmt(x.amount) + '</b> بدهکار است</div>'); return; }
        var cr = x.type === 'credit';
        items.push('<div class="sp-tip">«' + spEsc(D.title) + '» ' + (cr ? 'از' : 'به') + ' «' + spEsc(x.who) + '» <b class="' + (cr ? 'pos' : 'neg') + '">' + spAmt(x.amount) + '</b> ' + (cr ? 'طلبکار' : 'بدهکار') + ' است</div>');
      });
      /* اسکرول عمودی آزاد؛ همیشه از بالا شروع می‌شود و خودکار اسکرول نمی‌شود */
      return spHead('طلب و بدهی') + '<div class="sp-scroll sp-free">' + spItems(items) + '</div>';
    }
    /* ۳) آمار: فقط مقایسهٔ این ماه با ماه قبل */
    function spBarRow(label, amount, max, cls) {
      var w = max > 0 ? Math.max(amount > 0 ? 3 : 0, amount / max * 100) : 0;
      return '<div class="sp-row sp-row-sm"><span class="sp-l">' + label + '</span><span class="sp-v">' + spAmt(amount) + '</span></div>' +
        '<div class="sp-bar thin"><i class="' + cls + '" data-w="' + w.toFixed(1) + '"></i></div>';
    }
    function spPageStats(D) {
      /* همیشه جزو اسلایدهاست (اگر این ماه یا ماه قبل ثبتی داشته باشد)؛ ماه قبلِ خالی = صفر */
      if (!(D.pInc > 0 || D.pExp > 0 || D.inc > 0 || D.exp > 0)) return null;
      var mx = Math.max(D.inc, D.pInc, D.exp, D.pExp);
      /* هر چهار لوله در یک کادر و هم‌اندازه با ارتفاع باکس (مقیاس مشترک) */
      var row = function (label, amount, cls) { return '<div class="sp-cmp-r">' + spBarRow(label, amount, mx, cls) + '</div>'; };
      return spHead('مقایسه با ماه قبل') + '<div class="sp-cmp sp-even">' +
        row('درآمد این ماه', D.inc, 'pos') + row('درآمد ماه قبل', D.pInc, 'pos dim') +
        row('خرج این ماه', D.exp, 'neg') + row('خرج ماه قبل', D.pExp, 'neg dim') + '</div>';
    }
    /* ۴) دسته‌بندی مخارج: همهٔ دسته‌ها (جمع ۱۰۰٪)؛ هر نما ۴ مورد و اسکرول عمودی پیوسته */
    function spPageCategories(D) {
      if (!D.cats.list.length || D.cats.total <= 0) return null;
      var html = '';
      D.cats.items.forEach(function (c) {
        html += '<div class="sp-cat"><div class="sp-row"><span class="sp-l">' + spEsc(c.label) + '</span><span class="sp-v">' + spPct(c.pct) + '</span></div>' +
          '<div class="sp-bar thin"><i data-w="' + c.pct + '"></i></div></div>';
      });
      return spHead('دسته‌بندی مخارج') + '<div class="sp-scroll' + (D.cats.items.length > 4 ? ' sp-more' : '') + '">' + html + '</div>';
    }
    /* ۵) پروژه‌ها — از گزارش پروژه */
    function spPageProjects(D) {
      var ps = D.alerts.filter(function (a) { return a.type === 'project'; });
      if (!ps.length) return null;
      /* ۱.۳.۴۸: هر پروژه یک نمای کامل (چند پروژه = اسکرول عمودی مثل «نکات»)؛ عنوان به رنگ پروژه، همهٔ متن‌ها هم‌اندازه */
      return spHead('پروژه‌ها') + '<div class="sp-scroll sp-tips sp-projs">' + ps.slice(0, 3).map(function (a) {
        var col = '';
        try { var sub = getSubjectById(a.sid); var mt = sub && getProjectHighlightMeta(sub.highlightColor); if (mt && mt.accent) col = mt.accent; } catch (eC) {}
        var ls = (a.lines && a.lines.length) ? a.lines : [a.text];
        return '<div class="sp-tipbox"><div class="sp-tip sp-pj-t"' + (col ? ' style="color:' + col + '"' : '') + '>' + spEsc(a.title) + '</div>' +
          ls.map(function (l) { return '<div class="sp-tip">' + spEsc(l) + '</div>'; }).join('') + '</div>';
      }).join('') + '</div>';
    }
    /* ۶) نکته: اعلان‌های تحلیلی + نکته‌های کوتاه؛ درصدها همان درصدهای صفحهٔ دسته‌بندی */
    function spInsights(D) {
      var out = D.alerts.filter(function (a) { return a.type === 'analysis'; }).map(function (a) { return { p: a.p, h: a.title, t: a.text }; });
      var soon = D.inst.filter(function (x) { return !x.paid && x.days >= 0 && x.days <= 7; }).length;
      var late = D.inst.filter(function (x) { return !x.paid && x.days < 0; }).length;
      if (late) out.push({ p: 95, t: spFa(late) + ' قسط از سررسیدش گذشته است.' });
      if (soon) out.push({ p: 90, t: spFa(soon) + ' پرداخت قسط در ۷ روز آینده داری.' });
      if (D.inc > 0 && D.exp > D.inc) out.push({ p: 80, t: 'مخارج این ماه ' + spPct((D.exp - D.inc) / D.inc * 100) + ' از درآمد بیشتر شده است.' });
      if (D.cats.rows >= 3 && D.cats.items.length && D.cats.items[0].id) {
        var top = D.cats.items[0];
        if (top.pct >= 25) out.push({ p: 45, t: 'بیشترین هزینهٔ این ماه مربوط به ' + top.label + ' بوده (' + spPct(top.pct) + ' از مخارج).' });
      }
      if (D.exp > 0 && D.expUnpaid / D.exp >= 0.3) out.push({ p: 40, t: spAmt(D.expUnpaid) + ' تومان از مخارج این ماه هنوز پرداخت نشده.' });
      return out.sort(function (a, b) { return b.p - a.p; });
    }
    function spPageInsight(D) {
      var ins = spInsights(D);
      if (!ins.length) return null;
      /* هر نکته یک نمای کامل؛ نکتهٔ دوم با اسکرول عمودی (خودکار پس از ۵ ثانیه یا با دست) */
      return spHead('نکات') + '<div class="sp-scroll sp-tips">' + ins.slice(0, 5).map(function (x) {
        return '<div class="sp-tipbox">' + (x.h ? '<div class="sp-t">' + spEsc(x.h) + '</div>' : '') + '<div class="sp-tip">' + spEsc(x.t) + '</div></div>';
      }).join('') + '</div>';
    }
    /* ۷) سررسیدهای ۷ روز آینده (فقط ماه جاری): قسط‌های پرداخت‌نشده و درآمدهای ثابتِ هنوز دریافت‌نشده */
    function spPageUpcoming(D) {
      var t0 = getTodayPersian();
      if (!(currentYear === t0.y && currentMonth === t0.m)) return null;
      var items = [];
      (HK_INSTALLMENTS_ON ? D.inst : []).filter(function (x) { return !x.paid && x.days >= 0 && x.days <= 7; }).slice(0, 3).forEach(function (x) {
        items.push({ inst: true, d: x.days, h: '<div class="sp-l">قسط «' + spEsc(x.name) + '»</div><div class="sp-v sp-under' + (x.days <= 1 ? ' neg' : '') + '">' + spDaysLabel(x.days) + '، ' + spAmt(x.amount) + '</div>' });
      });
      spRows(findSectionByTitle('income', D.title)).forEach(function (r) {
        if (!r.fromRecurringId || (r.status || 'paid') === 'paid') return;
        var d = spDay(r) - t0.d; if (d < 0 || d > 7) return;
        items.push({ d: d, h: '<div class="sp-l">دریافت «' + spEsc(r.desc || 'درآمد ثابت') + '»</div><div class="sp-v sp-under pos">' + spDaysLabel(d) + '، ' + spAmt(Number(r.amount) || 0) + '</div>' });
      });
      if (!items.length) return null;
      items.sort(function (a, b) { return a.d - b.d; });
      _spUpcomingInst[D.title] = items.some(function (x) { return x.inst; });
      return spHead('۷ روز آینده') + spItems(items.slice(0, 4).map(function (x) { return x.h; }));
    }
    /* ۸) جهش دسته: دسته‌ای که این ماه دست‌کم ۴۰٪ بیشتر از میانگین ۳ ماه قبل خرج شده */
    function spPageJump(D) {
      if (!D.cats.list.length) return null;
      var prev = {}, n = 0;
      for (var b = 1; b <= 3; b++) {
        var sec = spPrevSection('expense', D.title, b); if (!sec) continue;
        n++; spCategoryTotals(sec).list.forEach(function (c) { prev[c.id] = (prev[c.id] || 0) + c.amount; });
      }
      if (!n) return null;
      var best = null;
      D.cats.list.forEach(function (c) {
        var avg = (prev[c.id] || 0) / n; if (avg <= 0) return;
        var up = (c.amount - avg) / avg;
        if (up >= 0.4 && c.amount - avg >= D.cats.total * 0.05 && (!best || up > best.up)) best = { c: c, avg: avg, up: up };
      });
      if (!best) return null;
      _spJumpCat[D.title] = best.c.id;
      return spHead('جهش خرج') + spItems([
        '<div class="sp-t">«' + spEsc(best.c.label) + '» ' + spPct(best.up * 100) + ' بیشتر از میانگین</div>',
        spLine('این ماه', spAmt(best.c.amount), 'neg'),
        spLine('میانگین ' + spFa(n) + ' ماه قبل', spAmt(best.avg))
      ]);
    }
    /* ۹) بزرگ‌ترین خرج ماه و تعداد تراکنش‌ها */
    function spPageBiggest(D) {
      var rows = spRows(findSectionByTitle('expense', D.title)).filter(function (r) { return (r.status || 'paid') === 'paid' && Number(r.amount) > 0; });
      if (rows.length < 3) return null;
      /* ۱.۳.۶۸: فقط بزرگ‌ترین خرج‌ها (سه مورد اول)؛ شمار واریزها و خرج‌ها با این موضوع قاطی نمی‌شود */
      var top = rows.slice().sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); }).slice(0, 3);
      return spHead('بزرگ‌ترین خرج‌های ماه') + spItems(top.map(function (r) {
        return spLine(spEsc(r.desc || '—'), spAmt(Number(r.amount) || 0), 'neg');
      }));
    }
    /* ۱۰) کارهای ناتمام اطلاعات: ردیف‌های بی‌حساب، خرج‌های بی‌دسته (لمس = برگهٔ دسته‌بندی) */
    var _spFixIdx = {};
    /* ردیف‌های ناقص به ترتیب جدول (بی‌حساب: اول مخارج بعد درآمد؛ بی‌دسته: مخارج) */
    function spFixList(title, k) {
      var out = [];
      (k === 'acc' ? ['expense', 'income'] : ['expense']).forEach(function (tab) {
        spRows(findSectionByTitle(tab, title)).forEach(function (r) {
          if (!(Number(r.amount) > 0) || (r.status || 'paid') !== 'paid') return;
          if (k === 'acc' ? !(r.account || '').trim() : (!r.fromPlanId && spIsNoCat(r))) out.push({ tab: tab, row: r });
        });
      });
      return out;
    }
    function spPageFix(D) {
      var noAcc = 0, noCat = 0;
      ['income', 'expense'].forEach(function (tab) {
        spRows(findSectionByTitle(tab, D.title)).forEach(function (r) {
          if (!(Number(r.amount) > 0) || (r.status || 'paid') !== 'paid') return;
          if (!(r.account || '').trim()) noAcc++;
          if (tab === 'expense' && !r.fromPlanId) { var c = null; try { c = HKCategorizer.classify(r.desc, r); } catch (e) {} if (!c) noCat++; }
        });
      });
      if (!noAcc && !noCat) return null;
      /* ۱.۳.۵۰: دو نیمه: «بدون حساب» و «بدون دسته»؛ لمس هر نیمه = رفتن به ردیف خودش */
      /* ۱.۳.۵۱: نصف افقی (بالا/پایین با خط افقی)؛ هر لمس = ردیف بعدی همان نوع («۱ از ۲») */
      var half = function (k, lab, n) {
        var i = (_spFixIdx[D.title + '|' + k] || 0) % n;
        /* ۱.۳.۵۲: هم‌اندازهٔ بقیهٔ اسلایدها: بالا راست «ردیف بدون حساب»، زیرش سطر شمارش */
        return '<div class="sp-fix-half sp-item" data-fix="' + k + '"><div class="sp-l">' + lab + '</div><div class="sp-v def">' + spFa(n) + ' ردیف' + (n > 1 ? ' · ' + spFa(i + 1) + ' از ' + spFa(n) : '') + '</div></div>';
      };
      return spHead('تکمیل اطلاعات') + '<div class="sp-fix">' + (noAcc ? half('acc', 'ردیف بدون حساب', noAcc) : '') + (noAcc && noCat ? '<i class="sp-fix-sep"></i>' : '') + (noCat ? half('cat', 'خرج بدون دسته', noCat) : '') + '</div>';
    }
