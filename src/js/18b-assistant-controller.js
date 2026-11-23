    /* ===== ۱.۴.۲۴: دستیار هوشمند — مدیریت درخواست و پاسخ =====
       جریان: متن کاربر → adapter (تبدیل به فرمان) → اعتبارسنجی → hkAsstExec (ابزار خواندنی) → پیام پاسخ.
       تاریخچهٔ مکالمه فقط در حافظهٔ همین نشست است؛ هیچ‌جا ذخیره نمی‌شود. */
    function hkAsstMoney(n) { return toPersianDigits(formatNum(Math.round(Number(n) || 0))) + ' تومان'; }
    function hkAsstNum(n) { return toPersianDigits(String(Math.round(Number(n) || 0))); }
    function hkAsstSummary(tool, res, cmd) {
      if (tool === 'transactions.aggregate') {
        if (cmd.explain === 'count') return 'تعداد تراکنش‌ها: ' + hkAsstNum(res.count) + '.';
        if (cmd.explain === 'avg') return res.count ? 'میانگین هر تراکنش: ' + hkAsstMoney(res.avg) + ' (از ' + hkAsstNum(res.count) + ' تراکنش).' : 'تراکنشی پیدا نشد.';
        if (!res.count) return 'تراکنشی پیدا نشد.';
        var t = 'تعداد: ' + hkAsstNum(res.count) + ' تراکنش\nجمع: ' + hkAsstMoney(res.sum);
        if (cmd.args && !cmd.args.tab) t += '\nدرآمد: ' + hkAsstMoney(res.incomeSum) + '\nهزینه: ' + hkAsstMoney(res.expenseSum) + '\nمانده: ' + hkAsstMoney(res.balance);
        return t;
      }
      if (tool === 'transactions.search') {
        if (!res.count) return 'تراکنشی با این مشخصات پیدا نشد.';
        if (cmd.explain) return (cmd.explain === 'بیشترین' ? 'بیشترین' : 'کمترین') + ' تراکنش:';
        return hkAsstNum(res.count) + ' تراکنش پیدا شد. جمع مبلغ: ' + hkAsstMoney(res.total) + '.';
      }
      if (tool === 'transactions.get') return res.found ? 'جزئیات تراکنش:' : 'این تراکنش پیدا نشد.';
      if (tool === 'transactions.group') {
        if (!res.groups.length) return 'تراکنشی برای گروه‌بندی پیدا نشد.';
        return 'گروه‌بندی بر اساس ' + ({ month: 'ماه', section: 'دسته', account: 'حساب', tab: 'نوع', context: 'پروژه/شخصی' })[res.by] + ':';
      }
      if (tool === 'reports.compare') {
        return 'مقایسه ' + res.a.label + ' با ' + res.b.label + ':\n' +
          'درآمد: ' + hkAsstMoney(res.a.incomeSum) + ' در برابر ' + hkAsstMoney(res.b.incomeSum) + '\n' +
          'هزینه: ' + hkAsstMoney(res.a.expenseSum) + ' در برابر ' + hkAsstMoney(res.b.expenseSum);
      }
      return '';
    }
    /* یک پیام کاربر را پردازش می‌کند؛ خروجی یک پیام دستیار است (بدون تغییر داده) */
    function hkAsstAsk(text) {
      var q = String(text || '').trim();
      if (!q) return { role: 'bot', kind: 'text', text: 'چیزی ننوشتی. مثلاً: «بیمه تویوتا را پیدا کن».' };
      var cmd, out;
      try { cmd = hkAsstValidateCommand(hkAsstAdapter().parse(q)); }
      catch (eP) { return { role: 'bot', kind: 'text', text: 'در خواندن درخواست خطایی پیش آمد.' }; }
      if (cmd.ask) return { role: 'bot', kind: 'text', text: cmd.ask };
      out = hkAsstExec(cmd.tool, cmd.args);
      if (!out.ok) return { role: 'bot', kind: 'text', text: 'نتوانستم انجام دهم: ' + out.error };
      var summary = hkAsstSummary(cmd.tool, out.result, cmd);
      return { role: 'bot', kind: 'result', tool: cmd.tool, text: summary, data: out.result, cmd: cmd };
    }
