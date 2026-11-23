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
    /* مدل Qwen2.5-0.5B-Instruct (کوانتیزهٔ Q4_K_M، حدود ۴۹۱ مگابایت) از مخزن رسمی Qwen روی Hugging Face.
       دانلود فقط با تأیید کاربر انجام می‌شود. (مدل‌های ۱٫۵B و ۳B در این نسخه استفاده نشدند.) */
    var HK_ASST_MODEL = {
      key: 'hk_asst_model_qwen25_05b_q4km',
      name: 'Qwen2.5-0.5B-Instruct (Q4_K_M)',
      url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      approxGB: 0.5
    };
    /* موتور اجرا: wllama (MIT) از کنار برنامه؛ مدل از IndexedDB خوانده می‌شود. اگر نصب نباشد یا بارگذاری خطا بدهد، تفسیرگر قاعده‌ای می‌ماند. */
    var HK_ASST_ENGINE = { loading: null, ok: false, error: '' };
    /* متن وضعیت موتور برای نمایش زیر عنوان دستیار؛ اگر بارگذاری خطا داده باشد، علتش هم نشان داده می‌شود */
    function hkAsstEngineStatus() {
      if (HK_ASST_ENGINE.ok && HK_ASST_LOCAL.runner) return 'مدل محلی';
      if (HK_ASST_ENGINE.loading) return 'قاعده‌ای (مدل در حال بارگذاری…)';
      if (HK_ASST_ENGINE.error) return 'قاعده‌ای (خطا در مرحلهٔ «' + (HK_ASST_ENGINE.stage || '?') + '»: ' + HK_ASST_ENGINE.error + (HK_ASST_ENGINE.probe ? ' | ' + HK_ASST_ENGINE.probe : '') + ')';
      return 'قاعده‌ای (مدل محلی نصب نیست)';
    }
    /* ----- ذخیرهٔ مدل روی دیسک (OPFS) -----
       دانلود مستقیم روی دیسک نوشته می‌شود تا کل فایل هیچ‌وقت در حافظهٔ گوشی جمع نشود (علت قبلی خطای abort).
       مدل قبلی که در IndexedDB بود، یک بار با استریم به OPFS منتقل می‌شود و دوباره دانلود نمی‌شود. */
    function hkAsstFileName() { return 'hk_asst_model.gguf'; }
    function hkAsstOpfs() {
      if (!navigator.storage || !navigator.storage.getDirectory) return Promise.reject(new Error('فضای ذخیرهٔ فایل در این گوشی در دسترس نیست'));
      return navigator.storage.getDirectory();
    }
    function hkAsstModelOpfsFile() {
      return hkAsstOpfs().then(function (dir) { return dir.getFileHandle(hkAsstFileName()); })
        .then(function (fh) { return fh.getFile(); }, function () { return null; });
    }
    function hkAsstMigrateFromIdb() {
      return HKStore.get(HK_ASST_MODEL.key).then(function (blob) {
        if (!blob || !blob.stream) return null;
        return hkAsstOpfs().then(function (dir) { return dir.getFileHandle(hkAsstFileName(), { create: true }); })
          .then(function (fh) { return fh.createWritable().then(function (w) { return blob.stream().pipeTo(w); }); })
          .then(function () { return HKStore.del(HK_ASST_MODEL.key); })
          .then(function () { return hkAsstModelOpfsFile(); });
      });
    }
    /* آیا مدل آماده است؟ (فایل روی دیسک، یا نشانهٔ ذخیرهٔ قبلی که هنوز منتقل نشده) */
    function hkAsstModelStatus() {
      return hkAsstModelOpfsFile().then(function (f) { return !!f && f.size > 0; }).then(function (ok) {
        if (ok) return true;
        return HKStore.get(HK_ASST_MODEL.key + '_meta').then(function (m) { return !!m; }, function () { return false; });
      }, function () { return false; });
    }
    /* مدل نصب‌شده (فایل روی دیسک + نام از نشانه): برای فهرست و حذف */
    function hkAsstInstalled() {
      return hkAsstModelOpfsFile().then(function (f) {
        if (!f || f.size <= 0) return null;
        return HKStore.get(HK_ASST_MODEL.key + '_meta').then(function (m) {
          if (m && m.name) return { name: m.name, size: f.size };
          return HKStore.get('hk_asst_model_qwen25_15b_q4km_meta').then(function (old) {
            return { name: (old && old.name) || 'مدل ذخیره‌شده', size: f.size };
          });
        }).catch(function () { return { name: 'مدل ذخیره‌شده', size: f.size }; });
      }, function () { return null; });
    }
    /* حذف کامل یک مدل: فایل روی دیسک، نشانه‌ها، و هر بقایای IndexedDB؛ موتور هم از حافظه خارج می‌شود */
    function hkAsstModelDelete() {
      var dir = null;
      return hkAsstOpfs().then(function (d) { dir = d; return dir.removeEntry(hkAsstFileName()); }).catch(function () {})
        .then(function () { return HKStore.del(HK_ASST_MODEL.key + '_meta'); }).catch(function () {})
        .then(function () { return HKStore.del('hk_asst_model_qwen25_15b_q4km_meta'); }).catch(function () {})
        .then(function () { return HKStore.del('hk_asst_model_qwen25_15b_q4km'); }).catch(function () {})
        .then(function () { return HKStore.del(HK_ASST_MODEL.key); }).catch(function () {})
        .then(function () {
          HK_ASST_ENGINE.ok = false; HK_ASST_ENGINE.loading = null; HK_ASST_ENGINE.error = '';
          hkAsstLocalAttach(null, '');
        });
    }
    /* دانلود با گزارش پیشرفت؛ هر تکه همان لحظه روی دیسک نوشته می‌شود */
    function hkAsstModelDownload(onProgress) {
      return fetch(HK_ASST_MODEL.url).then(function (res) {
        if (!res.ok) throw new Error('پاسخ سرور: ' + res.status);
        var total = Number(res.headers.get('content-length')) || 0;
        return hkAsstOpfs().then(function (dir) { return dir.getFileHandle(hkAsstFileName(), { create: true }); }).then(function (fh) {
          return fh.createWritable().then(function (w) {
            var got = 0, reader = res.body.getReader();
            function pump() {
              return reader.read().then(function (r) {
                if (r.done) return w.close();
                got += r.value.length;
                return w.write(r.value).then(function () {
                  if (onProgress) { try { onProgress(total ? got / total : 0, got); } catch (eP) {} }
                  return pump();
                });
              });
            }
            return pump().catch(function (err) { try { w.abort(); } catch (eA) {} throw err; });
          });
        });
      }).then(function () { return hkAsstModelOpfsFile(); }).then(function (f) {
        if (!f || f.size === 0) throw new Error('فایل ذخیره نشد');
        return HKStore.put(HK_ASST_MODEL.key + '_meta', { size: f.size, at: Date.now(), name: HK_ASST_MODEL.name }).then(function () { return f.size; });
      });
    }
    /* بارگذاری موتور از فایل روی دیسک. حافظهٔ اوج کم‌تر: n_ctx کوچک (فرمان JSON کوتاه است) و یک نخ */
    /* ----- تشخیص مرحله‌به‌مرحلهٔ بارگذاری -----
       هر مرحله پیش از اجرا در HK_ASST_ENGINE.stage ثبت می‌شود تا اگر خطا شد، همان مرحله زیر عنوان دستیار دیده شود. */
    function hkAsstStep(name) { HK_ASST_ENGINE.stage = name; }
    /* بررسی فایل موتور و امکان Worker؛ نتیجه در HK_ASST_ENGINE.probe ثبت می‌شود (خطا نمی‌اندازد) */
    function hkAsstProbe() {
      var parts = [];
      return fetch('./llm/wllama.wasm').then(function (r) {
        var type = r.headers.get('content-type') || '-';
        if (!r.ok) throw new Error('wasm HTTP ' + r.status);
        return r.arrayBuffer().then(function (buf) { parts.push('wasm ' + buf.byteLength + ' ' + type); });
      }).catch(function (e) { parts.push('wasm: ' + (e && e.message || 'خطا')); }).then(function () {
        return new Promise(function (resolve) {
          var done = false, wk = null, timer = setTimeout(function () { if (!done) { done = true; parts.push('worker: مهلت'); resolve(); } }, 2500);
          try {
            var url = URL.createObjectURL(new Blob(['self.onmessage=function(){self.postMessage(1)}'], { type: 'text/javascript' }));
            wk = new Worker(url);
            wk.onmessage = function () { if (!done) { done = true; clearTimeout(timer); parts.push('worker ok'); resolve(); } };
            wk.onerror = function (ev) { if (!done) { done = true; clearTimeout(timer); parts.push('worker: ' + ((ev && ev.message) || 'خطا')); resolve(); } };
            wk.postMessage(1);
          } catch (eW) { if (!done) { done = true; clearTimeout(timer); parts.push('worker: ' + (eW && eW.message || 'ساخته نشد')); resolve(); } }
        });
      }).then(function () { HK_ASST_ENGINE.probe = parts.join(' | '); });
    }
    function hkAsstLocalLoad() {
      if (HK_ASST_ENGINE.loading) return HK_ASST_ENGINE.loading;
      HK_ASST_ENGINE.error = ''; HK_ASST_ENGINE.probe = ''; hkAsstStep('خواندن فایل مدل');
      HK_ASST_ENGINE.loading = hkAsstModelOpfsFile().then(function (f) { return f || hkAsstMigrateFromIdb(); }).then(function (file) {
        if (!file) throw new Error('مدل هنوز دانلود نشده است');
        hkAsstStep('بررسی فایل موتور و Worker');
        return hkAsstProbe().then(function () {
          hkAsstStep('بارگذاری ماژول موتور');
          return import('./llm/wllama.js');
        }).then(function (mod) {
          hkAsstStep('ساخت موتور');
          var w = new mod.Wllama({ 'default': './llm/wllama.wasm', 'single-thread/wllama.wasm': './llm/wllama.wasm' });
          hkAsstStep('بارگذاری مدل در موتور');
          return w.loadModel([file], { n_ctx: 512, n_threads: 1 }).then(function () {
            hkAsstLocalAttach(function (prompt) {
              return w.createCompletion({ prompt: prompt, max_tokens: 160, temperature: 0.1, stop: ['\n\n'] })
                .then(function (r) { return String((r && r.choices && r.choices[0] && r.choices[0].text) || ''); });
            }, HK_ASST_MODEL.name);
            HK_ASST_ENGINE.ok = true;
          });
        });
      });
      HK_ASST_ENGINE.loading.then(null, function (e) { HK_ASST_ENGINE.error = String(e && e.message || e || 'خطا').slice(0, 160); });
      HK_ASST_ENGINE.loading.catch(function () { HK_ASST_ENGINE.loading = null; });
      return HK_ASST_ENGINE.loading;
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
