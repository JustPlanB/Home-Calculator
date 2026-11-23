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
    /* مدل Qwen2.5-1.5B-Instruct (کوانتیزهٔ Q4_K_M، مجوز Apache-2.0) از مخزن رسمی Qwen روی Hugging Face.
       دانلود فقط با تأیید کاربر انجام می‌شود. (نسخهٔ ۳B مجوز غیرتجاری دارد و استفاده نشد.) */
    var HK_ASST_MODEL = {
      key: 'hk_asst_model_qwen25_15b_q4km',
      name: 'Qwen2.5-1.5B-Instruct (Q4_K_M)',
      url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
      approxGB: 1.1
    };
    /* موتور اجرا: wllama (MIT) از کنار برنامه؛ مدل از IndexedDB خوانده می‌شود. اگر نصب نباشد یا بارگذاری خطا بدهد، تفسیرگر قاعده‌ای می‌ماند. */
    var HK_ASST_ENGINE = { loading: null, ok: false, error: '' };
    /* متن وضعیت موتور برای نمایش زیر عنوان دستیار؛ اگر بارگذاری خطا داده باشد، علتش هم نشان داده می‌شود */
    function hkAsstEngineStatus() {
      if (HK_ASST_ENGINE.ok && HK_ASST_LOCAL.runner) return 'مدل محلی';
      if (HK_ASST_ENGINE.loading) return 'قاعده‌ای (مدل در حال بارگذاری…)';
      if (HK_ASST_ENGINE.error) return 'قاعده‌ای (بارگذاری مدل نشد: ' + HK_ASST_ENGINE.error + ')';
      return 'قاعده‌ای (مدل محلی نصب نیست)';
    }
    function hkAsstLocalLoad() {
      if (HK_ASST_ENGINE.loading) return HK_ASST_ENGINE.loading;
      HK_ASST_ENGINE.error = '';
      HK_ASST_ENGINE.loading = HKStore.get(HK_ASST_MODEL.key).then(function (blob) {
        if (!blob) throw new Error('مدل هنوز دانلود نشده است');
        return import('./llm/wllama.js').then(function (mod) {
          /* موتور مسیر فایل wasm را از کلید default می‌خواند */
          var w = new mod.Wllama({ 'default': './llm/wllama.wasm', 'single-thread/wllama.wasm': './llm/wllama.wasm' });
          return w.loadModel([blob], { n_ctx: 2048, n_threads: 1 }).then(function () {
            hkAsstLocalAttach(function (prompt) {
              return w.createCompletion({ prompt: prompt, max_tokens: 160, temperature: 0.1, stop: ['\n\n'] })
                .then(function (r) { return String((r && r.choices && r.choices[0] && r.choices[0].text) || ''); });
            }, HK_ASST_MODEL.name);
            HK_ASST_ENGINE.ok = true;
          });
        });
      });
      HK_ASST_ENGINE.loading.then(null, function (e) { HK_ASST_ENGINE.error = String(e && e.message || e || 'خطا').slice(0, 120); });
      HK_ASST_ENGINE.loading.catch(function () { HK_ASST_ENGINE.loading = null; });
      return HK_ASST_ENGINE.loading;
    }
    /* آیا مدل قبلاً دانلود و ذخیره شده است؟ (فقط نشانهٔ کوچک را می‌خواند، نه کل فایل را) */
    function hkAsstModelStatus() {
      try { return HKStore.get(HK_ASST_MODEL.key + '_meta').then(function (m) { return !!m; }, function () { return false; }); }
      catch (e) { return Promise.resolve(false); }
    }
    /* دانلود با گزارش پیشرفت؛ فایل در IndexedDB ذخیره می‌شود. خطا به تماس‌گیرنده برمی‌گردد. */
    function hkAsstModelDownload(onProgress) {
      return fetch(HK_ASST_MODEL.url).then(function (res) {
        if (!res.ok) throw new Error('پاسخ سرور: ' + res.status);
        var total = Number(res.headers.get('content-length')) || 0, got = 0, chunks = [], reader = res.body.getReader();
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            chunks.push(r.value); got += r.value.length;
            if (onProgress) { try { onProgress(total ? got / total : 0, got); } catch (eP) {} }
            return pump();
          });
        }
        return pump().then(function () { return new Blob(chunks, { type: 'application/octet-stream' }); });
      }).then(function (blob) {
        return HKStore.put(HK_ASST_MODEL.key, blob)
          .then(function () { return HKStore.put(HK_ASST_MODEL.key + '_meta', { size: blob.size, at: Date.now(), name: HK_ASST_MODEL.name }); })
          .then(function () { return blob.size; });
      });
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
