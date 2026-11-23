    /* ===== ۱.۴.۲۴: دستیار هوشمند — اتصال مدل زبانی (Model Adapter) =====
       هر مدل فقط یک کار دارد: متن کاربر را به فرمان ساختاریافته تبدیل کند.
       مدل هیچ دسترسی مستقیم به داده، DOM یا localStorage ندارد؛ فرمان فقط از راه hkAsstExec (ابزار ثبت‌شده) اجرا می‌شود.
       نسخهٔ فعلی: Parser قاعده‌ای (hkAsstParse). مدل محلی در آینده همین رابط را پیاده‌سازی می‌کند. */
    var HK_ASST_ADAPTERS = {
      'rules': {
        name: 'قاعده‌ای',
        parse: function (text) { return hkAsstParse(text); }
      },
      'local': {
        name: 'مدل محلی',
        async: true,
        ready: function () { return !!HK_ASST_LOCAL.runner; },
        parseAsync: function (text) {
          return Promise.resolve(HK_ASST_LOCAL.runner(hkAsstLocalPrompt(text))).then(function (out) {
            var o = hkAsstLocalParse(out);
            if (!o) throw new Error('خروجی مدل نامعتبر بود');
            if (o.ask) return { ask: String(o.ask) };
            return { tool: o.tool, args: o.args || {}, explain: '', corrections: [] };
          });
        }
      }
    };
    /* مدل محلی: یک «اجراکنندهٔ» قابل‌تعویض دارد (runner). اجراکنندهٔ واقعی (مثلاً یک مدل GGUF روی گوشی) با
       hkAsstLocalAttach تعریف می‌شود؛ تا آن زمان ready() نادرست است و پیام‌ها با قاعده‌ای پاسخ داده می‌شوند. */
    var HK_ASST_LOCAL = { runner: null, label: '' };
    function hkAsstLocalAttach(runner, label) {
      HK_ASST_LOCAL.runner = typeof runner === 'function' ? runner : null;
      HK_ASST_LOCAL.label = String(label || '');
    }
    /* فهرست ابزارها و ورودی‌هایشان برای مدل؛ فقط همین‌ها مجازند */
    function hkAsstLocalToolList() {
      return Object.keys(HK_ASST_TOOLS).filter(function (n) { return HK_ASST_TOOLS[n].readOnly; }).map(function (n) {
        return '- ' + n + '(' + HK_ASST_TOOLS[n].args.join(', ') + ')';
      }).join('\n');
    }
    function hkAsstLocalPrompt(question) {
      return 'تو دستیار حساب‌کتاب هستی. فقط یک فرمان JSON بساز، بدون هیچ توضیح دیگر.\n' +
        'فرمت: {"tool":"نام ابزار","args":{...}} یا اگر متوجه نشدی: {"ask":"پرسش کوتاه"}.\n' +
        'ابزارها:\n' + hkAsstLocalToolList() + '\n' +
        'کلیدهای مهم: tab = "expense" (هزینه) یا "income" (درآمد)، month = عدد ماه ۱ تا ۱۲، year = سال شمسی، cats = آرایه‌ای از دسته‌ها (food, transport, bills, clothing, health, home, education, fun, gift, debt, tech)، text = متن جست‌وجو، amountMin/amountMax = مبلغ به تومان.\n' +
        'سؤال: ' + question + '\nJSON:';
    }
    /* از خروجی مدل فقط اولین شیء JSON را می‌خواند؛ هر چیز دیگر نامعتبر است */
    function hkAsstLocalParse(out) {
      var m = /\{[\s\S]*\}/.exec(String(out || ''));
      if (!m) return null;
      try { var o = JSON.parse(m[0]); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
    }
    var HK_ASST_ACTIVE = 'rules';
    /* خروجی adapter را اعتبارسنجی می‌کند؛ فرمان ناشناس یا ناقص اجرا نمی‌شود */
    function hkAsstValidateCommand(cmd) {
      if (!cmd || typeof cmd !== 'object') return { ask: 'متوجه نشدم.' };
      if (cmd.ask) return { ask: String(cmd.ask), suggestions: Array.isArray(cmd.suggestions) ? cmd.suggestions.slice(0, 5) : [] };
      if (!cmd.tool || !Object.prototype.hasOwnProperty.call(HK_ASST_TOOLS, cmd.tool)) return { ask: 'این کار را هنوز نمی‌توانم انجام دهم.', suggestions: [] };
      return { tool: cmd.tool, args: cmd.args || {}, explain: cmd.explain || '', corrections: cmd.corrections || [], understood: cmd.understood || '' };
    }
    function hkAsstAdapter() { return HK_ASST_ADAPTERS[HK_ASST_ACTIVE] || HK_ASST_ADAPTERS.rules; }
