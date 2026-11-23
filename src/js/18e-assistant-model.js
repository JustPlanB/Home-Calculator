    /* ===== ۱.۴.۲۴: دستیار هوشمند — اتصال مدل زبانی (Model Adapter) =====
       هر مدل فقط یک کار دارد: متن کاربر را به فرمان ساختاریافته تبدیل کند.
       مدل هیچ دسترسی مستقیم به داده، DOM یا localStorage ندارد؛ فرمان فقط از راه hkAsstExec (ابزار ثبت‌شده) اجرا می‌شود.
       نسخهٔ فعلی: Parser قاعده‌ای (hkAsstParse). مدل محلی در آینده همین رابط را پیاده‌سازی می‌کند. */
    var HK_ASST_ADAPTERS = {
      'rules': {
        name: 'قاعده‌ای (آزمایشی)',
        parse: function (text) { return hkAsstParse(text); }
      }
    };
    var HK_ASST_ACTIVE = 'rules';
    /* خروجی adapter را اعتبارسنجی می‌کند؛ فرمان ناشناس یا ناقص اجرا نمی‌شود */
    function hkAsstValidateCommand(cmd) {
      if (!cmd || typeof cmd !== 'object') return { ask: 'متوجه نشدم.' };
      if (cmd.ask) return { ask: String(cmd.ask), suggestions: Array.isArray(cmd.suggestions) ? cmd.suggestions.slice(0, 5) : [] };
      if (!cmd.tool || !Object.prototype.hasOwnProperty.call(HK_ASST_TOOLS, cmd.tool)) return { ask: 'این کار را هنوز نمی‌توانم انجام دهم.', suggestions: [] };
      return { tool: cmd.tool, args: cmd.args || {}, explain: cmd.explain || '', corrections: cmd.corrections || [], understood: cmd.understood || '' };
    }
    function hkAsstAdapter() { return HK_ASST_ADAPTERS[HK_ASST_ACTIVE] || HK_ASST_ADAPTERS.rules; }
