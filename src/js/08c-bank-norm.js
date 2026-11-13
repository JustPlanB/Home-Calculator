    /* ===== ۱.۳.۸۵: تشخیص بانک با امتیازدهی =====
       هر نشانه به بانکی که اشاره می‌کند امتیاز می‌دهد؛ بانکِ با بیشترین جمع برنده است (اگر دست‌کم ۲۰ و ۱۰ امتیاز جلوتر از دومی).
       اسم کامل در متن پیامک ۷۰ · رقم‌های حساب/کارتِ وصل‌شده به یک حساب ۶۰ · اسم فرستنده ۵۰ · سایت/برنامهٔ بانک ۴۰ ·
       فرستنده‌ای که پیامک دیگرش اسم کامل بانک را داشته ۳۰ · اسم کوتاه به شکل کلمهٔ کامل ۱۵ (به‌تنهایی کافی نیست) · فقط یک حساب ثبت‌شده ۵.
       تکه‌ای از وسط کلمه («سامانه»، «جدید»، «شهریور») هیچ امتیازی ندارد؛ «دی» به‌تنهایی هرگز. */
    var HK_BANK_TERMS = [
      { name: 'بانک ملی', full: ['بانک ملی', 'بانک ملی ایران', 'bank melli', 'melli bank', 'bankmelli'], site: ['bmi.ir'], short: ['ملی'], snd: ['melli', 'bmi'] },
      { name: 'بانک ملت', full: ['بانک ملت', 'bank mellat', 'mellat bank', 'bankmellat'], site: ['behpardakht', 'bmellat'], short: ['ملت'], snd: ['mellat'] },
      { name: 'بانک صادرات', full: ['بانک صادرات', 'bank saderat', 'banksaderat'], site: ['bsi.ir'], short: ['صادرات'], snd: ['saderat', 'bsi'] },
      { name: 'بانک مسکن', full: ['بانک مسکن', 'bank maskan', 'bankmaskan'], site: [], short: ['مسکن'], snd: ['maskan'] },
      { name: 'بانک سپه', full: ['بانک سپه', 'bank sepah', 'banksepah'], site: [], short: ['سپه'], snd: ['sepah'] },
      { name: 'بانک تجارت', full: ['بانک تجارت', 'bank tejarat', 'banktejarat'], site: [], short: ['تجارت'], snd: ['tejarat'] },
      { name: 'بانک رفاه کارگران', full: ['بانک رفاه', 'رفاه کارگران', 'bank refah'], site: [], short: ['رفاه'], snd: ['refah'] },
      { name: 'بانک کشاورزی', full: ['بانک کشاورزی', 'bank keshavarzi'], site: ['bki.ir'], short: ['کشاورزی'], snd: ['keshavarzi', 'agri', 'bki'] },
      { name: 'بانک پاسارگاد', full: ['بانک پاسارگاد', 'bank pasargad'], site: ['bpi.ir'], short: ['پاسارگاد'], snd: ['pasargad', 'bpi'] },
      { name: 'بانک پارسیان', full: ['بانک پارسیان', 'bank parsian'], site: [], short: ['پارسیان'], snd: ['parsian'] },
      { name: 'بانک سامان', full: ['بانک سامان', 'bank saman'], site: ['sb24'], short: ['سامان'], snd: ['saman', 'sb24'] },
      { name: 'بانک اقتصاد نوین', full: ['بانک اقتصاد نوین', 'اقتصاد نوین'], site: ['enbank'], short: [], snd: ['eghtesad', 'enbank'] },
      { name: 'بانک آینده', full: ['بانک آینده', 'bank ayandeh'], site: ['ba24'], short: ['آینده'], snd: ['ayandeh', 'ba24'] },
      { name: 'بانک شهر', full: ['بانک شهر', 'bank shahr'], site: [], short: ['شهر'], snd: ['shahr'] },
      { name: 'بانک سینا', full: ['بانک سینا', 'bank sina'], site: [], short: ['سینا'], snd: ['sinabank', 'banksina'] },
      { name: 'بانک کارآفرین', full: ['بانک کارآفرین', 'bank karafarin'], site: [], short: ['کارآفرین'], snd: ['karafarin'] },
      { name: 'بانک گردشگری', full: ['بانک گردشگری', 'tourism bank'], site: [], short: ['گردشگری'], snd: ['tourism'] },
      { name: 'بانک ایران‌زمین', full: ['بانک ایران زمین', 'ایران زمین'], site: ['izbank'], short: [], snd: ['izbank', 'iranzamin'] },
      { name: 'بانک خاورمیانه', full: ['بانک خاورمیانه', 'خاورمیانه'], site: [], short: [], snd: ['middleeast'] },
      { name: 'بانک قرض‌الحسنه رسالت', full: ['بانک رسالت', 'قرض الحسنه رسالت'], site: [], short: ['رسالت'], snd: ['resalat'] },
      { name: 'بانک قرض‌الحسنه مهر', full: ['مهر ایران', 'قرض الحسنه مهر'], site: ['qmb'], short: [], snd: ['qmb', 'mehriran'] },
      { name: 'بلوبانک', full: ['بلوبانک', 'بلو بانک', 'blubank', 'blu bank'], site: [], short: [], snd: ['blubank', 'blu'] },
      { name: 'پست بانک', full: ['پست بانک', 'postbank', 'post bank'], site: [], short: [], snd: ['postbank'] },
      { name: 'موسسه اعتباری ملل', full: ['موسسه اعتباری ملل', 'اعتباری ملل'], site: [], short: ['ملل'], snd: ['melal'] },
      { name: 'بانک دی', full: ['بانک دی', 'دی بانک', 'daybank', 'bank day'], site: [], short: [], snd: ['daybank'] },
      { name: 'بانک حکمت ایرانیان', full: ['حکمت ایرانیان'], site: [], short: ['حکمت'], snd: [] },
      { name: 'بانک انصار', full: ['بانک انصار'], site: [], short: ['انصار'], snd: [] },
      { name: 'بانک قوامین', full: ['بانک قوامین'], site: [], short: ['قوامین'], snd: [] },
      { name: 'بانک کوثر', full: ['بانک کوثر'], site: [], short: [], snd: [] },
      { name: 'بانک سرمایه', full: ['بانک سرمایه'], site: [], short: [], snd: [] },
      { name: 'بانک تات', full: ['بانک تات'], site: [], short: [], snd: [] }
    ];
    var HK_BANK_W = { full: 70, acc: 60, sender: 50, site: 40, learned: 30, short: 15, single: 5 };
    /* متن یکدست: ی/ک عربی، نیم‌فاصله، فاصله‌های پشت‌سرهم */
    function hkBankNorm(t) { return ' ' + normalizeSmsText(String(t || '')).toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ') + ' '; }
    /* کلمهٔ کامل: پیش و پس از آن حرف فارسی/لاتین/رقم نباشد */
    function hkHasWord(norm, w) {
      w = String(w).toLowerCase(); var i = norm.indexOf(w);
      while (i >= 0) {
        var a = norm.charAt(i - 1), b = norm.charAt(i + w.length);
        if (!/[؀-ۿa-z0-9]/.test(a) && !/[؀-ۿa-z0-9]/.test(b)) return true;
        i = norm.indexOf(w, i + 1);
      }
      return false;
    }
    function hkBankAdd(sc, bank, pts, why, list) { if (!bank || !pts) return; sc[bank] = (sc[bank] || 0) + pts; if (list) list.push(why + ':' + bank + '+' + pts); }
    /* فقط متن پیامک: کامل ۷۰، سایت ۴۰، کوتاه ۱۵ (هر نوع برای هر بانک یک بار) */
    function hkBankTextScores(text, why) {
      var n = hkBankNorm(text), sc = {};
      HK_BANK_TERMS.forEach(function (b) {
        if (b.full.some(function (w) { return hkHasWord(n, w); })) hkBankAdd(sc, b.name, HK_BANK_W.full, 'full', why);
        else if (b.short.some(function (w) { return hkHasWord(n, w); })) hkBankAdd(sc, b.name, HK_BANK_W.short, 'short', why);
        if (b.site.some(function (w) { return n.indexOf(w) >= 0; })) hkBankAdd(sc, b.name, HK_BANK_W.site, 'site', why);
      });
      return sc;
    }
    function hkBankPick(sc) {
      var arr = Object.keys(sc).map(function (k) { return [k, sc[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      if (!arr.length || arr[0][1] < 20) return '';
      if (arr[1] && arr[0][1] - arr[1][1] < 10) return '';
      return arr[0][0];
    }
    /* اسم کامل بانک در متن (برای یاد گرفتن فرستنده و رقم‌های حساب) */
    function hkBankFullInText(text) {
      var n = hkBankNorm(text), hit = [];
      HK_BANK_TERMS.forEach(function (b) { if (b.full.some(function (w) { return hkHasWord(n, w); })) hit.push(b.name); });
      return hit.length === 1 ? hit[0] : '';
    }
    function detectBankFromSms(text, nameOnly) {
      var w = hkBankPick(hkBankTextScores(text));
      if (w) return w;
      if (nameOnly) return '';
      const acc = extractAccountFromSms(text);
      if (acc && smsAccountBankMap[acc]) return smsAccountBankMap[acc];
      if (selectedBankAccounts && selectedBankAccounts.length === 1) return accountLabel(selectedBankAccounts[0]);
      return '';
    }

    /* ۱.۳.۸۳/۸۵: فرستنده. اسم خود فرستنده (Bank Mellat، BankMellat، …) ۵۰؛ فرستنده‌ای که پیامک دیگرش اسم «کامل» بانک را داشته ۳۰.
       فرستندهٔ شخصی (شمارهٔ موبایل) هرگز امتیاز نمی‌گیرد و یاد گرفته نمی‌شود. همه‌چیز فقط روی همین گوشی. */
    var HK_SENDER_BANK_KEY = STORAGE_KEY + '_senderBank';
    function hkSenderKey(a) { return toEnglishDigits(String(a || '')).replace(/[\s\-()+._]/g, '').toLowerCase(); }
    function hkSenderBankMap() { try { var o = JSON.parse(localStorage.getItem(HK_SENDER_BANK_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function hkSenderLearn(addr, bank) {
      var k = hkSenderKey(addr); if (!k || !bank || hkIsPersonalSender(addr)) return;
      var m = hkSenderBankMap(); if (m[k] === bank) return;
      m[k] = bank; try { localStorage.setItem(HK_SENDER_BANK_KEY, JSON.stringify(m)); } catch (e) {}
    }
    /* بانکی که خودِ اسم فرستنده می‌گوید */
    function hkSenderNameBank(addr) {
      if (!addr || hkIsPersonalSender(addr)) return '';
      var k = hkSenderKey(addr); if (!k) return '';
      for (var i = 0; i < HK_BANK_TERMS.length; i++) {
        var b = HK_BANK_TERMS[i];
        if (b.snd.some(function (w) { return k.indexOf(w.replace(/\s/g, '')) >= 0; })) return b.name;
      }
      try { var fa = hkBankFullInText(String(addr)); if (fa) return fa; } catch (e) {}
      return '';
    }
    function hkSenderLearned(addr, ctx) {
      if (!addr || hkIsPersonalSender(addr)) return '';
      var k = hkSenderKey(addr); if (!k) return '';
      if (ctx && ctx.sender && ctx.sender[k]) return ctx.sender[k];
      return hkSenderBankMap()[k] || '';
    }
    function hkSenderBank(addr, ctx) { return hkSenderNameBank(addr) || hkSenderLearned(addr, ctx); }
    /* بانکِ حسابی که این رقم‌ها (۴ رقم آخر حساب/کارت) قبلاً به آن وصل شده */
    function hkBankOfLabel(label) {
      if (!label) return '';
      var a = (selectedBankAccounts || []).find(function (x) { return accountLabel(x) === label; });
      var b = a ? accountBank(a) : label;
      try { b = migrateBankName(b); } catch (e) {}
      return HK_BANK_TERMS.some(function (t) { return t.name === b; }) ? b : (hkBankFullInText(b) || hkBankPick(hkBankTextScores(b)) || '');
    }
    /* یک دور روی صندوق: فرستنده→بانک و رقم‌ها→بانک، فقط از پیامک‌هایی که اسم «کامل» بانک دارند */
    function hkInboxBankCtx(items) {
      var ctx = { sender: {}, acc: {} };
      (items || []).forEach(function (it) {
        try {
          var body = String(it.body || ''); if (!body || hkIsPersonalSender(it.address)) return;
          var b = hkBankFullInText(body); if (!b) return;
          var k = hkSenderKey(it.address); if (k && !ctx.sender[k]) ctx.sender[k] = b;
          var a4 = hkSmsAcc4(body); if (a4 && !ctx.acc[a4]) ctx.acc[a4] = b;
        } catch (e) {}
      });
      Object.keys(ctx.sender).forEach(function (k) { var m = hkSenderBankMap(); if (m[k] !== ctx.sender[k]) { m[k] = ctx.sender[k]; try { localStorage.setItem(HK_SENDER_BANK_KEY, JSON.stringify(m)); } catch (e) {} } });
      return ctx;
    }
    /** امتیاز همهٔ نشانه‌ها: {bank, scores, why} */
    function hkBankScore(body, addr, ctx) {
      var why = [], sc = hkBankTextScores(body, why);
      var sn = hkSenderNameBank(addr); if (sn) hkBankAdd(sc, sn, HK_BANK_W.sender, 'sender', why);
      var sl = hkSenderLearned(addr, ctx); if (sl) hkBankAdd(sc, sl, HK_BANK_W.learned, 'learned', why);
      try {
        var a4 = hkSmsAcc4(body), byAcc = '';
        if (a4) { var lb = hkAcc4Label(a4); if (lb) byAcc = hkBankOfLabel(lb); }
        if (!byAcc) { var acc = extractAccountFromSms(body); if (acc && smsAccountBankMap[acc]) byAcc = hkBankOfLabel(smsAccountBankMap[acc]); }
        if (byAcc) hkBankAdd(sc, byAcc, HK_BANK_W.acc, 'acc', why);
        else if (a4 && ctx && ctx.acc && ctx.acc[a4]) hkBankAdd(sc, ctx.acc[a4], HK_BANK_W.learned, 'accLearned', why);
      } catch (eA) {}
      try { if ((selectedBankAccounts || []).length === 1) hkBankAdd(sc, hkBankOfLabel(accountLabel(selectedBankAccounts[0])), HK_BANK_W.single, 'single', why); } catch (eS) {}
      return { bank: hkBankPick(sc), scores: sc, why: why };
    }
    function hkBankOfSms(body, addr, ctx) { try { return hkBankScore(body, addr, ctx).bank || ''; } catch (e) { return ''; } }
    try { window.hkBankOfSms = hkBankOfSms; window.hkInboxBankCtx = hkInboxBankCtx; window.hkSenderBank = hkSenderBank; window.hkBankScore = hkBankScore; } catch (eWb) {}

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
    /* ۱.۳.۸۷: معوقِ دیده‌شده: با باز کردن تاریخچهٔ همان کارت (از اسلاید یا منوی حساب‌ها) دایرهٔ قرمز و نوار چرخان برداشته می‌شود
       و فقط برچسب قرمز «معوق» می‌ماند؛ پیامک تازه‌ای که باز معوق دارد دوباره هشدار می‌دهد */
    var HK_INST_SEEN_KEY = STORAGE_KEY + '_instSeen';
    function hkInstSeenKey(s) { var e = s && s.last; return e ? [e.y, e.m, e.d, e.time || '', e.count, s.overdue, s.penalty].join('_') : ''; }
    function hkInstAlert(c, s) {
      s = s || hkInstStatus(c);
      if (!s || s.st !== 'bad') return false;
      try { var m = JSON.parse(localStorage.getItem(HK_INST_SEEN_KEY) || '{}') || {}; return m[c.id] !== hkInstSeenKey(s); } catch (e) { return true; }
    }
    function hkInstMarkSeen(c) {
      try {
        var s = hkInstStatus(c); var m = JSON.parse(localStorage.getItem(HK_INST_SEEN_KEY) || '{}') || {};
        if (s && s.st === 'bad') m[c.id] = hkInstSeenKey(s); else delete m[c.id];
        localStorage.setItem(HK_INST_SEEN_KEY, JSON.stringify(m));
      } catch (e) {}
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
        var s = hkInstStatus(c), al = hkInstAlert(c, s); if (al) bad = true;
        return '<div class="sp-inst-r' + (s && s.st === 'bad' ? ' bad' : '') + (al ? ' hk-snake' : '') + '" data-inst="' + escapeHtml(c.id) + '"><b>' + spEsc(hkInstName(c)) + (al ? ' <i class="hk-inst-dot"></i>' : '') + '</b><span>' + hkInstStatusHtml(s, false) + '</span></div>';
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
      /* ۱.۳.۸۷: دیده شد → دایره و نوار چرخان برداشته شوند (اسلاید و منوی حساب‌ها) */
      var _wasAlert = hkInstAlert(c);
      hkInstMarkSeen(c);
      if (_wasAlert) {
        try { document.querySelectorAll('[data-inst="' + id + '"]').forEach(function (el) { el.classList.remove('hk-snake'); el.querySelectorAll('.hk-inst-dot').forEach(function (d) { d.remove(); }); }); } catch (eS) {}
        setTimeout(function () { try { renderHomeCards(); } catch (eR) {} }, 0);
      }
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
    function hkBlockedSave(a) { var ok = hkStorageSet(HK_BLOCK_KEY, JSON.stringify(a || [])); try { hkSyncNotifCats(); } catch (e) {} try { hkBlockedMenuBadge(); } catch (eB) {} return ok; }
    /* ۱.۳.۹۹: تعداد حساب‌های مسدود در دایرهٔ قرمز کنار «حساب‌های مسدود شده» (مثل پیامک‌های نفهمیده) */
    function hkBlockedMenuBadge() {
      var btn = document.getElementById('menuBlockedBtn'); if (!btn) return;
      var n = hkBlockedLoad().length, b = btn.querySelector('.hk-unread-n');
      if (!n) { if (b) b.remove(); return; }
      /* ۱.۴.۰: دایرهٔ قرمز مثل «پیامک‌های ثبت‌نشده» (نه زرد) */
      if (!b) { b = document.createElement('b'); b.className = 'hk-unread-n hk-blk-n'; btn.appendChild(document.createTextNode(' ')); btn.appendChild(b); }
      b.classList.add('hk-blk-n');
      b.textContent = toPersianDigits(String(n));
    }
    try { setTimeout(function () { try { hkBlockedMenuBadge(); } catch (e) {} }, 1200); } catch (eBm) {}
    /* ۱.۳.۹۹: هر پیامکِ نادیده‌گرفتهٔ حساب مسدود شمرده می‌شود (برای صفحهٔ اطلاعات همان حساب) */
    /* ۱.۴.۰: خود پیامک‌ها هم نگه داشته می‌شوند (تا ۲۰۰ تای آخر، بی تکرار): هم تعداد و هم خود تراکنش‌ها در صفحهٔ اطلاعات حساب.
       از ثبت گروهی هم (پیامک‌های پوشه‌ای که همان‌جا مسدود شد و پیامک‌های حساب مسدودی که در خواندن بعدی کنار گذاشته می‌شوند) */
    function hkBlockedNoteHit(x, raw, o) {
      try {
        o = o || {};
        var body = String(raw || '').trim(); if (!body) return;
        var L = hkBlockedLoad(), k = hkBlockKey(x), y = L.filter(function (z) { return hkBlockKey(z) === k; })[0]; if (!y) return;
        if (!Array.isArray(y.msgs)) y.msgs = [];
        if (y.msgs.some(function (m) { return m && m.raw === body; })) return;
        var amt = Number(o.amount) || 0, type = o.type || '';
        if (!amt) { try { var p = parseBankSms(body); if (p && p.amount) { amt = p.amount; type = p.type || ''; } } catch (eP) {} }
        var at = Number(o.ts) || Date.now();
        y.msgs.push({ raw: body, at: at, amt: amt, type: type });
        y.msgs.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        if (y.msgs.length > 200) y.msgs.length = 200;
        y.hits = (Number(y.hits) || 0) + 1;
        if (!y.lastAt || at >= y.lastAt) { y.lastAt = at; if (amt) { y.lastAmt = amt; y.lastType = type; } }
        hkStorageSet(HK_BLOCK_KEY, JSON.stringify(L));
      } catch (e) {}
    }
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
    /* ۱.۴.۰: شماره‌ها چپ‌به‌راست جدا (علامت + اول شماره می‌ماند، نه آخرش) */
    function hkBlockLabel(x) { return x.d ? '\u2066' + toPersianDigits(x.d) + '\u2069' : (x.s || []).map(function (q) { return '\u2066' + toPersianDigits(String(q)) + '\u2069'; }).join('، '); }
    function hkOpenBlockedAccounts() {
      try { closeSideMenu(); } catch (e) {}
      var old = document.getElementById('hkBlockOv'); if (old) old.remove();
      var ov = document.createElement('div'); ov.id = 'hkBlockOv'; ov.className = 'hk-bulk-ov hk-bulk-center'; ov.setAttribute('data-hk-back', '1');
      var render = function () {
        var L = hkBlockedLoad();
        ov.innerHTML = '<div class="hk-bulk-box hk-block-box"><div class="hk-bulk-title">حساب‌های مسدود شده</div>' +
          '<div class="hk-bulk-hint">پیامک‌های این حساب‌ها نادیده گرفته می‌شوند: اعلان نمی‌آید و در ثبت گروهی نشان داده نمی‌شوند. با برداشتن از فهرست، دوباره مثل قبل می‌شوند. برای مسدود کردن، در «ثبت تکی و گروهی پیامک‌ها» دکمهٔ مسدود کنار پوشهٔ آن حساب را بزنید.</div>' +
          (L.length ? '<div class="hk-block-list">' + L.map(function (x, i) {
            return '<div class="hk-block-r" data-i="' + i + '" role="button"><i class="hk-mi" style="--c:#aeaeb2"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M6.4 6.4l11.2 11.2"/></svg></i><div class="nm"><b>' + escapeHtml(x.bank || 'حساب') + '</b><div class="hk-acc-hint"><span dir="ltr">' + escapeHtml(hkBlockLabel(x)) + '</span></div></div><button type="button" class="hk-block-un" data-i="' + i + '">برداشتن</button></div>';
          }).join('') + '</div>' : '<div class="hk-block-empty">حسابی مسدود نشده</div>') +
          '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-close">بستن</button></div></div>';
        ov.querySelector('.hk-bulk-close').onclick = close;
        ov.querySelectorAll('.hk-block-r').forEach(function (r) { r.onclick = function () { var x = hkBlockedLoad()[+r.dataset.i]; if (x) info(x); }; });
        ov.querySelectorAll('.hk-block-un').forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation(); var L2 = hkBlockedLoad(), x = L2[+b.dataset.i]; if (!x) return; L2.splice(+b.dataset.i, 1); hkBlockedSave(L2); showToast('«' + (x.bank || 'حساب') + ' ' + hkBlockLabel(x) + '» دوباره فعال شد'); render(); };
        });
      };
      var close = function () { ov.remove(); };
      var detail = false;
      /* ۱.۳.۹۹: زدن روی هر حساب مسدود = اطلاعاتش؛ بازگشت = فهرست */
      var info = function (x) {
        detail = true;
        var dt = function (ts) { try { var j = hkJalaliOfTs(ts); return hkJStr(j); } catch (e) { return ''; } };
        var rows = [['بانک', x.bank || '—'], [x.d ? 'شمارهٔ حساب/کارت' : 'فرستنده', hkBlockLabel(x) || '—']];
        if (x.at) rows.push(['تاریخ مسدود شدن', dt(x.at)]);
        var msgs = Array.isArray(x.msgs) ? x.msgs : [];
        rows.push(['پیامک‌های نادیده‌گرفته', toPersianDigits(String(Math.max(Number(x.hits) || 0, msgs.length)))]);
        if (x.lastAt) rows.push(['آخرین پیامک نادیده‌گرفته', dt(x.lastAt) + (x.lastAmt ? ' — ' + formatNum(x.lastAmt) + (x.lastType === 'income' ? ' واریز' : x.lastType === 'expense' ? ' برداشت' : '') : '')]);
        /* ۱.۴.۰: خود تراکنش‌های نادیده‌گرفته (جدیدترین بالا)؛ زدن هر کدام = متن کامل پیامک */
        var txH = msgs.length ? '<div class="hk-bulk-hint hk-block-txh">تراکنش‌های نادیده‌گرفته</div><div class="hk-block-tx">' + msgs.map(function (m, i) {
          var inc = m.type === 'income';
          return '<div class="hk-block-txr" data-m="' + i + '" role="button"><span class="d">' + escapeHtml(dt(m.at)) + '</span><span class="t">' + (inc ? 'واریز' : m.type === 'expense' ? 'برداشت' : 'پیامک') + '</span><b class="' + (inc ? 'inc' : 'exp') + '" dir="ltr">' + (m.amt ? formatNum(m.amt) : '—') + '</b></div>';
        }).join('') + '</div>' : '';
        ov.innerHTML = '<div class="hk-bulk-box hk-block-box"><div class="hk-bulk-title">' + escapeHtml((x.bank || 'حساب') + ' ' + hkBlockLabel(x)) + '</div>' +
          '<div class="hk-block-info">' + rows.map(function (r) { return '<div class="hk-block-ir"><span>' + escapeHtml(r[0]) + '</span><b dir="auto">' + escapeHtml(String(r[1])) + '</b></div>'; }).join('') + '</div>' + txH +
          '<div class="hk-bulk-btns"><button type="button" class="hk-bulk-ok hk-block-un1">برداشتن از مسدودها</button></div></div>';
        ov.querySelectorAll('.hk-block-txr').forEach(function (r) { r.onclick = function () { var m = msgs[+r.dataset.m]; if (!m) return; var o = r.nextElementSibling; if (o && o.classList.contains('hk-block-raw')) { o.remove(); return; } var d = document.createElement('div'); d.className = 'hk-block-raw'; d.textContent = m.raw; r.parentNode.insertBefore(d, r.nextSibling); }; });
        ov.querySelector('.hk-block-un1').onclick = function () { hkUnblockAccount(x); showToast('«' + (x.bank || 'حساب') + ' ' + hkBlockLabel(x) + '» دوباره فعال شد'); detail = false; render(); };
      };
      ov._hkCancel = function () { if (detail) { detail = false; render(); } else close(); };
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
      /* ۱.۳.۹۱: پیامک واریز قسط تراکنش حساب‌ها نیست و به تاریخچهٔ کارت قسط می‌رود؛ قبلاً بی‌صدا ثبت می‌شد و «نامعتبر» نشان داده می‌شد */
      var _inst = null; try { _inst = hkParseInstallSms(text); } catch (eIp) {}
      if (_inst) {
        var _res = null; try { _res = hkInstIngest(_inst, text); } catch (eIg) {}
        var _c = _res && _res.card, _nm = ''; try { _nm = _c ? hkInstName(_c) : ''; } catch (eNm) {}
        showToast(_res && _res.dup ? 'این پیامک قسط قبلاً در «' + (_nm || 'کارت قسط') + '» ثبت شده است'
          : (_nm || 'قسط') + ' — ' + formatNum(_inst.amount || 0) + ' تومان در کارت قسط ثبت شد');
        closeSmsImportModal();
        if (_c) setTimeout(function () { try { hkOpenInstHistory(_c.id); } catch (eOh) {} }, 350);
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


