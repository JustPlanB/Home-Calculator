    /* ===== PDF آفلاین: رندر محلی HTML به تصویر و ساخت PDF بدون اینترنت ===== */
    function pdfConcat(a){ let n=0;a.forEach(x=>n+=x.length);let o=new Uint8Array(n),p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o; }
    /* نویسندهٔ PDF ساده و معتبر: هر صفحه یک تصویر JPEG (A4، حاشیهٔ ۱۸pt) */
    function buildSimpleImagePdf(pageImages, pageW, pageH) {
      var enc = new TextEncoder(), chunks = [], pos = 0, offsets = [];
      var put = function (x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); pos += b.length; };
      var n = pageImages.length, firstPage = 3;
      var total = 2 + n * 3;
      put('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
      var obj = function (id, body) { offsets[id] = pos; put(id + ' 0 obj\n'); body(); put('\nendobj\n'); };
      obj(1, function () { put('<< /Type /Catalog /Pages 2 0 R >>'); });
      var kids = [];
      for (var i = 0; i < n; i++) kids.push((firstPage + i * 3) + ' 0 R');
      obj(2, function () { put('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'); });
      pageImages.forEach(function (im, i) {
        var pid = firstPage + i * 3, iid = pid + 1, cid = pid + 2;
        var margin = 18, sc = Math.min((pageW - 2 * margin) / im.w, (pageH - 2 * margin) / im.h);
        var dw = im.w * sc, dh = im.h * sc, x = (pageW - dw) / 2, y = pageH - margin - dh;
        obj(pid, function () { put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /XObject << /Im' + i + ' ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>'); });
        obj(iid, function () {
          put('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.jpg.length + ' >>\nstream\n');
          put(im.jpg); put('\nendstream');
        });
        var content = 'q\n' + dw.toFixed(2) + ' 0 0 ' + dh.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm\n/Im' + i + ' Do\nQ\n';
        obj(cid, function () { put('<< /Length ' + enc.encode(content).length + ' >>\nstream\n' + content + 'endstream'); });
      });
      var xref = pos, xr = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
      for (var k = 1; k <= total; k++) xr += String(offsets[k] || 0).padStart(10, '0') + ' 00000 n \n';
      put(xr + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
      return new Blob([pdfConcat(chunks)], { type: 'application/pdf' });
    }
    /* =====================================================================
       گزارش PDF ماهانه (A4) — جامع، فشرده و خوانا در چاپ سیاه‌وسفید
       ساختار: سربرگ + خلاصهٔ عددی، خلاصهٔ کارت‌ها، جزئیات درآمد و مخارج (گروه‌بندی
       بر اساس کارت با جمع جزء)، حساب‌ها و درآمد ثابت، اقساط، قرض.
       صفحه‌بندی با اندازه‌گیری واقعی داخل iframe ایزوله؛ جدول‌ها فقط روی مرز ردیف
       شکسته می‌شوند و سرستون در صفحهٔ بعد تکرار می‌شود.
       ===================================================================== */
    var PDF_W = 794, PDF_PAGE_H = 1123, PDF_PAD = 26, PDF_FOOT = 22;
    var PDF_BODY_H = PDF_PAGE_H - PDF_PAD * 2 - PDF_FOOT - 6;
    function pdfFontCss() {
      var css = '';
      try {
        Array.prototype.forEach.call(document.styleSheets, function (sh) {
          var rules; try { rules = sh.cssRules; } catch (e) { return; }
          Array.prototype.forEach.call(rules || [], function (r) { if (r.type === 5 && /Vazirmatn/.test(r.cssText)) css += r.cssText + '\n'; });
        });
      } catch (e) {}
      return css;
    }
    /* ۱.۳.۷۳: تاریخ کامل (شمسی و میلادی) و ساعت هر ردیف برای خروجی‌ها */
    function hkExpDate(r, y, m) {
      var d = parseInt(toEnglishDigits(String((r && r.day) || '')), 10) || 0; if (!d) return { fa: '', en: '' };
      var yy = parseInt(r.ly, 10) || y, mm = parseInt(r.lm, 10) || m;
      var p2 = function (n) { return String(n).padStart(2, '0'); };
      var en = ''; try { en = hkGregStr(yy, mm, d); } catch (e) {}
      return { fa: toPersianDigits(yy + '/' + p2(mm) + '/' + p2(d)), en: en };
    }
    function hkExpTime(r) { var t = String((r && r.time) || '').trim(); return /^\d{1,2}:\d{2}$/.test(t) ? toPersianDigits(t.padStart(5, '0')) : ''; }
    function hkExpDateTd(r, y, m) { var x = hkExpDate(r, y, m); return '<td class="c dt">' + (x.fa ? '<b>' + x.fa + '</b><i>' + x.en + '</i>' : '') + '</td>'; }
    /* ۱.۳.۷۳: دادهٔ قرض برای خروجی‌ها — همان چیزی که در نرم‌افزار دیده می‌شود: ردیف‌های بازه + ردیف‌های تسویه‌نشدهٔ ماه‌های قبل
       (که در جدول قرض هم ادامه دارند)، هر رابطه یک گروه، با تاریخ کامل، ساعت، وضعیت تسویه و مانده */
    function hkExpLedgerData(months) {
      var out = [], byId = {};
      if (!months || !months.length) return out;
      var N0 = months[0].y * 100 + months[0].m, N1 = months[months.length - 1].y * 100 + months[months.length - 1].m;
      var src = [], curK = periodKey(currentYear, currentMonth);
      Object.keys(archive || {}).forEach(function (k) { if (k === curK) return; var p = String(k).split('-'), y = +p[0], m = +p[1]; if (y && m) src.push({ y: y, m: m, pd: archive[k] }); });
      src.push({ y: currentYear, m: currentMonth, pd: null });
      src.sort(function (a, b) { return (a.y * 100 + a.m) - (b.y * 100 + b.m); });
      src.forEach(function (x) {
        var N = x.y * 100 + x.m; if (N > N1) return;
        var led = null; try { led = x.pd ? x.pd.ledger : ensureLedger(); } catch (e) {}
        ((led && led.sections) || []).forEach(function (sec) {
          if (!sec || !sec.id) return;
          var g = byId[sec.id];
          if (!g) { g = byId[sec.id] = { id: sec.id, a: '', b: '', title: '', rows: [] }; out.push(g); }
          if ((sec.personA || '').trim() || (sec.personB || '').trim()) { g.a = (sec.personA || '').trim(); g.b = (sec.personB || '').trim(); try { g.title = ledgerSectionTitle(sec); } catch (e1) {} }
          (sec.rows || []).forEach(function (r) {
            if (!hkLedHasData(r)) return;
            var inRange = N >= N0;
            if (!inRange && r.settled && !((parseInt(r.settledN, 10) || 0) >= N0)) return;
            g.rows.push({ r: r, y: x.y, m: x.m, carried: !inRange });
          });
        });
      });
      return out.filter(function (g) { return g.rows.length; }).map(function (g) {
        g.a = g.a || '—'; g.b = g.b || '—'; if (!g.title) g.title = g.a + ' ↔ ' + g.b;
        g.rows.sort(function (p, q) { return (hkLedKey(p.r, p.y, p.m) - hkLedKey(q.r, q.y, q.m)) || hkTimeCmp(p.r, q.r); });
        var ab = 0, ba = 0;
        g.rows.forEach(function (x) {
          var cr = x.r.status === 'credit', amt = Number(x.r.amount) || 0;
          x.debtor = cr ? g.b : g.a; x.creditor = cr ? g.a : g.b; x.amt = amt;
          if (!x.r.settled) { if (cr) ba += amt; else ab += amt; }
        });
        g.net = ab - ba;
        g.netTxt = g.net > 0 ? g.a + ' به ' + g.b + ' بدهکار است' : g.net < 0 ? g.b + ' به ' + g.a + ' بدهکار است' : 'تسویه';
        g.withBy = g.rows.some(function (x) { return x.r.createdByName; });
        return g;
      });
    }
    /* ===== ۱.۳.۷۳: خروجی آرشیو درآمدهای ثابت (از پایین باکس درآمدهای ثابت): انتخاب درآمدها و ماه‌ها با چک‌باکس ===== */
    var _hkRecArc = null;
    function hkRecArcCollect(sel) {
      var items = []; try { items = (recurringIncomes || []).filter(function (r) { return r && !r.deletedAt && (r.name || r.amount) && r.id; }); } catch (e) {}
      var out = [];
      items.forEach(function (it) {
        if (sel && sel.ids && !sel.ids[it.id]) return;
        var rows = []; try { rows = recArchiveRows(it); } catch (e) {}
        rows = rows.filter(function (x) { return !sel || !sel.keys || sel.keys[x.key]; });
        if (rows.length) out.push({ it: it, rows: rows });
      });
      return out;
    }
    function hkRecArcMonths() {
      var keys = {};
      hkRecArcCollect(null).forEach(function (g) { g.rows.forEach(function (x) { keys[x.key] = 1; }); });
      return Object.keys(keys).map(Number).sort(function (a, b) { return b - a; });
    }
    function hkRecArcKeyLabel(k) { return (MONTHS[(k % 100) - 1] || '') + ' ' + toPersianDigits(String(Math.floor(k / 100))); }
    function hkRecArcPdfBlocks() {
      var E = escapeHtml, B = [], today = getTodayPersian(), groups = hkRecArcCollect(_hkRecArc);
      var keys = Object.keys(_hkRecArc.keys || {}).map(Number).sort(function (a, b) { return a - b; });
      var lbl = keys.length ? (keys.length === 1 ? hkRecArcKeyLabel(keys[0]) : hkRecArcKeyLabel(keys[0]) + ' تا ' + hkRecArcKeyLabel(keys[keys.length - 1])) : '';
      B.push({ html: '<div class="pb hd"><div><h1>آرشیو درآمدهای ثابت' + (lbl ? ' — ' + E(lbl) : '') + '</h1></div><div class="sub">حساب‌کتاب<br>تاریخ تهیه: ' + toPersianDigits(today.y) + '/' + toPersianPad2(today.m) + '/' + toPersianPad2(today.d) + '</div></div>' });
      if (!groups.length) { B.push({ html: '<div class="pb sec"><div class="empty">موردی برای این انتخاب نیست</div></div>' }); return B; }
      var h = '<div class="pb sec"><div class="st inc">واریزهای درآمدهای ثابت</div><table><thead><tr><th style="width:4%">#</th><th style="width:12%">تاریخ</th><th style="width:7%">ساعت</th><th>شرح</th><th style="width:15%">مبلغ</th><th style="width:15%">حساب</th><th style="width:14%">وضعیت</th></tr></thead><tbody>', gp = 0, gu = 0;
      groups.forEach(function (g) {
        h += '<tr class="g"><td colspan="7">' + E(g.it.name || '—') + (g.it.account ? ' <span style="font-weight:400;color:#555">(' + E(g.it.account) + ')</span>' : '') + '</td></tr>';
        var p = 0, u = 0;
        g.rows.forEach(function (x, i) {
          var ok = x.row.status === 'paid', amt = Number(x.row.amount) || 0, y = Math.floor(x.key / 100), m = x.key % 100;
          if (ok) p += amt; else u += amt;
          h += '<tr><td class="c">' + toPersianDigits(i + 1) + '</td>' + hkExpDateTd({ day: x.row.day }, y, m) + '<td class="c tm">' + hkExpTime(x.row) + '</td><td>' + E(x.row.desc || g.it.name || '') + '</td><td class="n">' + pdfMoney(amt) + '</td><td class="c">' + E(x.row.account || '—') + '</td><td class="c' + (ok ? '' : ' un') + '">' + (ok ? '● دریافت‌شده' : '○ دریافت‌نشده') + '</td></tr>';
        });
        gp += p; gu += u;
        h += '<tr class="t"><td colspan="4">جمع ' + E(g.it.name || '') + ' — دریافت‌شده ' + pdfMoney(p) + (u ? ' · دریافت‌نشده ' + pdfMoney(u) : '') + '</td><td class="n">' + pdfMoney(p + u) + '</td><td colspan="2"></td></tr>';
      });
      h += '<tr class="T"><td colspan="4">جمع کل — دریافت‌شده ' + pdfMoney(gp) + (gu ? ' · دریافت‌نشده ' + pdfMoney(gu) : '') + '</td><td class="n">' + pdfMoney(gp + gu) + '</td><td colspan="2"></td></tr></tbody></table></div>';
      B.push({ html: h, split: true });
      return B;
    }
    function hkRecArcSheets() {
      var H = function (t) { return { v: t, s: 1 }; }, T = function (t) { return { v: t, s: 2 }; }, N = function (n) { return { v: Math.round(Number(n) || 0), s: 3 }; };
      var TT = function (t) { return { v: t, s: 4 }; }, TN = function (n) { return { v: Math.round(Number(n) || 0), s: 5 }; };
      var rows = [[{ v: 'آرشیو درآمدهای ثابت', s: 6 }], [], [H('درآمد ثابت'), H('تاریخ (شمسی · میلادی)'), H('ساعت'), H('شرح'), H('مبلغ'), H('حساب'), H('وضعیت')]], gt = 0;
      hkRecArcCollect(_hkRecArc).forEach(function (g) {
        var st = 0;
        g.rows.forEach(function (x) {
          var y = Math.floor(x.key / 100), m = x.key % 100, dx = hkExpDate({ day: x.row.day }, y, m), amt = Number(x.row.amount) || 0; st += amt;
          rows.push([T(g.it.name || ''), T(dx.fa ? dx.fa + '  ·  ' + dx.en : hkRecArcKeyLabel(x.key)), T(hkExpTime(x.row)), T(x.row.desc || ''), N(amt), T(x.row.account || ''), T(x.row.status === 'paid' ? 'دریافت‌شده' : 'دریافت‌نشده')]);
        });
        gt += st;
        rows.push([TT('جمع ' + (g.it.name || '')), TT(''), TT(''), TT(''), TN(st), TT(''), TT('')]);
      });
      rows.push([TT('جمع کل'), TT(''), TT(''), TT(''), TN(gt), TT(''), TT('')]);
      return [{ name: 'آرشیو درآمد ثابت', rows: rows, widths: [24, 26, 8, 28, 16, 16, 14], merges: ['A1:G1'], freeze: 3 }];
    }
    function hkOpenRecArcExport() {
      var old = document.getElementById('hkRecArcEx'); if (old) old.remove();
      var items = []; try { items = (recurringIncomes || []).filter(function (r) { return r && !r.deletedAt && (r.name || r.amount) && r.id; }); } catch (e) {}
      var months = hkRecArcMonths();
      var ov = document.createElement('div'); ov.id = 'hkRecArcEx'; ov.className = 'modal-overlay open'; ov.setAttribute('data-hk-back', '1');
      ov.style.cssText = 'z-index:660;display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div'); box.className = 'modal-box hk-prefs hk-pf hk-rax'; ov.appendChild(box);
      var close = function () { ov.remove(); };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      var kind = 'pdf';
      var chkRow = function (label, val, grp) { return '<label class="hk-pf-row hk-rax-row"><span class="hk-pf-l">' + label + '</span><input type="checkbox" class="hk-rax-chk" data-g="' + grp + '" value="' + val + '" checked></label>'; };
      box.innerHTML = '<div class="hk-pf-h"><div class="hk-prefs-t hk-pf-t">خروجی آرشیو درآمدهای ثابت</div><button type="button" class="hk-pf-x" aria-label="بستن"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="hk-pf-body">' +
          '<div class="hk-pf-gh">نوع فایل</div><div class="hk-re-seg hk-pf-seg hk-rax-kind"><button type="button" class="hk-re-segb hk-re-pjb" data-k="excel">اکسل</button><button type="button" class="hk-re-segb hk-re-pjb on" data-k="pdf">PDF</button></div>' +
          '<div class="hk-pf-gh">درآمدهای ثابت</div><div class="hk-pf-grp hk-rax-list">' + chkRow('<b>همه</b>', '*', 'i') + items.map(function (it) { return chkRow(escapeHtml(it.name || '—'), it.id, 'i'); }).join('') + '</div>' +
          '<div class="hk-pf-gh">ماه‌ها</div><div class="hk-pf-grp hk-rax-list">' + (months.length ? chkRow('<b>همه</b>', '*', 'k') + months.map(function (k) { return chkRow(hkRecArcKeyLabel(k), k, 'k'); }).join('') : '<div class="hk-pf-row"><span class="hk-pf-l" style="color:var(--muted)">هنوز واریزی در آرشیو نیست</span></div>') + '</div>' +
        '</div>' +
        '<div class="hk-rax-acts"><button type="button" class="modal-btn hk-rax-go">ساخت خروجی</button><button type="button" class="modal-btn hk-rax-cancel">انصراف</button></div>';
      document.body.appendChild(ov);
      box.querySelector('.hk-pf-x').onclick = close; box.querySelector('.hk-rax-cancel').onclick = close;
      box.querySelectorAll('.hk-rax-kind button').forEach(function (b) { b.onclick = function () { kind = b.dataset.k; box.querySelectorAll('.hk-rax-kind button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      var sync = function (g) {
        var all = box.querySelector('.hk-rax-chk[data-g="' + g + '"][value="*"]'); if (!all) return;
        var each = [].slice.call(box.querySelectorAll('.hk-rax-chk[data-g="' + g + '"]:not([value="*"])'));
        var n = each.filter(function (c) { return c.checked; }).length;
        all.checked = n === each.length; all.indeterminate = n > 0 && n < each.length;
      };
      box.querySelectorAll('.hk-rax-chk').forEach(function (c) {
        c.onchange = function () {
          if (c.value === '*') box.querySelectorAll('.hk-rax-chk[data-g="' + c.dataset.g + '"]').forEach(function (x) { x.checked = c.checked; });
          sync(c.dataset.g);
          var ok = box.querySelector('.hk-rax-chk[data-g="i"]:not([value="*"]):checked') && box.querySelector('.hk-rax-chk[data-g="k"]:not([value="*"]):checked');
          box.querySelector('.hk-rax-go').disabled = !ok;
        };
      });
      if (!months.length) box.querySelector('.hk-rax-go').disabled = true;
      box.querySelector('.hk-rax-go').onclick = async function () {
        var sel = { ids: {}, keys: {} };
        box.querySelectorAll('.hk-rax-chk[data-g="i"]:not([value="*"]):checked').forEach(function (c) { sel.ids[c.value] = 1; });
        box.querySelectorAll('.hk-rax-chk[data-g="k"]:not([value="*"]):checked').forEach(function (c) { sel.keys[c.value] = 1; });
        close();
        _hkRecArc = sel;
        try { if (kind === 'pdf') await exportPdf(); else await exportExcel(); } finally { _hkRecArc = null; }
      };
    }
    try { window.hkOpenRecArcExport = hkOpenRecArcExport; } catch (eRa) {}
    function pdfStyleCss() {
      return pdfFontCss() +
        '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
        'html,body{background:#fff;color:#111;}' +
        'body,.pdf-root{width:' + PDF_W + 'px;font-family:Vazirmatn,Tahoma,Arial,sans-serif;font-size:10.5px;line-height:1.45;direction:rtl;color:#111;background:#fff;}' +
        '.pdf-page{position:relative;width:' + PDF_W + 'px;height:' + PDF_PAGE_H + 'px;padding:' + PDF_PAD + 'px ' + PDF_PAD + 'px ' + (PDF_PAD + PDF_FOOT) + 'px;overflow:hidden;background:#fff;page-break-after:always;break-after:page;}' +
        '.pdf-foot{position:absolute;left:' + PDF_PAD + 'px;right:' + PDF_PAD + 'px;bottom:' + (PDF_PAD - 6) + 'px;display:flex;justify-content:space-between;font-size:9px;color:#666;border-top:0.75px solid #bbb;padding-top:4px;}' +
        '.pb{margin:0 0 10px 0;}' +
        /* جداکنندهٔ بخش‌ها: خط ضخیم آرام بالای هر بخش اصلی (در ابتدای صفحه حذف می‌شود) */
        '.pb.sec{border-top:2.5px solid #8b1a1a;padding-top:9px;margin-top:4px;}' +
        '.pdf-page>.pb.sec:first-child{border-top:0;padding-top:0;margin-top:0;}' +
        '.pdf-root .pdf-page>style+.pb.sec{border-top:0;padding-top:0;margin-top:0;}' +
        '.swatch{display:inline-block;width:10px;height:10px;border-radius:50%;border:0.75px solid #333;vertical-align:middle;}' +
        '.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;}' +
        '.hd h1{font-size:18px;font-weight:700;}' +
        '.hd-u{display:flex;align-items:center;gap:8px;}.hd-av{width:34px;height:34px;border-radius:9px;object-fit:cover;flex:0 0 34px;}' +
        '.hd .sub{font-size:10px;color:#555;text-align:left;}' +
        '.kpis{display:flex;gap:6px;}' +
        '.kpi{flex:1;border:1px solid #999;border-radius:6px;padding:6px 8px;}' +
        '.kpi .l{font-size:9.5px;color:#555;}' +
        '.kpi .v{font-size:13px;font-weight:700;direction:ltr;text-align:right;unicode-bidi:isolate;}' +
        '.kpi .s{font-size:8.5px;color:#666;margin-top:1px;}' +
        '.st{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;margin:0 0 5px 0;padding-right:7px;border-right:4px solid #444;}' +
        '.st small{font-size:9px;color:#666;font-weight:400;}' +
        '.st.inc{border-right-color:#2e9e5b;}.st.exp{border-right-color:#d9534f;}.st.ins{border-right-color:#7e57c2;}.st.led{border-right-color:#c49000;}.st.acc{border-right-color:#1f7fbf;}' +
        '.st.sav{border-right-color:#b8860b;}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed;}' +
        'th{background:#2b2b2b;color:#fff;font-weight:700;font-size:9.5px;padding:4px 3px;border:0.75px solid #2b2b2b;text-align:center;}' +
        'td{border:0.75px solid #a5a5a5;padding:3px 4px;vertical-align:middle;word-break:break-word;}' +
        'td.n{text-align:center;direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-variant-numeric:tabular-nums;}' +
        'td.c{text-align:center;}' +
        'td.dt{padding:1px 2px;line-height:1.05;white-space:nowrap;}td.dt b{display:block;font-size:8.6px;font-weight:700;}td.dt i{display:block;font-style:normal;font-size:7.4px;color:#555;direction:ltr;margin-top:1px;}' +
        'td.tm{font-size:9px;white-space:nowrap;direction:ltr;unicode-bidi:isolate;}' +
        'tr.dim td{color:#777;}' +
        'tr.g td{background:#e9e9e9;font-weight:700;font-size:10px;}' +
        'tr.t td{background:#f4f4f4;font-weight:700;border-top:1.4px solid #555;}' +
        'tr.T td{background:#dcdcdc;font-weight:700;font-size:11px;border-top:1.6px solid #111;}' +
        'td.un{font-weight:700;}' +
        '.row2{display:flex;gap:10px;align-items:flex-start;}' +
        '.row2>div{flex:1;min-width:0;}' +
        '.note{font-size:9px;color:#666;margin-top:3px;}' +
        '.empty{border:0.75px dashed #aaa;color:#777;text-align:center;padding:6px;border-radius:4px;}' +
        '@page{size:A4;margin:0;}';
    }
    function pdfMoney(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + formatNum(Math.abs(n)); }
    function pdfPersonalAmounts(kind, r) {
      try { return sectionPaidUnpaidTotal({ rows: [r] }, kind === 'income' ? { personalIncomeOnly: true } : { personalExpenseOnly: true }); }
      catch (e) { var a = Number(r.amount) || 0; return r.status === 'paid' ? { paid: a, unpaid: 0, total: a } : { paid: 0, unpaid: a, total: a }; }
    }
    /* =====================================================================
       گزینه‌های خروجی PDF / Excel: بخش‌ها (تیک‌دار)، کاربر، بازهٔ زمانی.
       _hkExportOpts فقط در طول ساخت خروجی مقدار دارد؛ null = رفتار قبلی (همهٔ بخش‌ها، ماه جاری)
       ===================================================================== */
    var HK_EXPORT_SECTIONS = [
      ['income', 'درآمدها'], ['expense', 'مخارج'], ['ledger', 'طلب و بدهی'],
      ['projects', 'پروژه‌ها'], ['recurring', 'درآمدهای ثابت (با آرشیو)'], ['savings', 'پس‌انداز'], ['accounts', 'موجودی حساب‌ها']
    ];
    var HK_EXPORT_RANGES = [['month', 'این ماه'], ['3m', '۳ ماه اخیر'], ['year', 'امسال'], ['all', 'همه']];
    var _hkExportOpts = null;
    function hkExportPd(y, m) {
      if (y === currentYear && m === currentMonth) return periodData;
      return archive[periodKey(y, m)] || null;
    }
    /* ماه‌های بازه، قدیمی‌تر اول (لنگر = ماهی که الان نمایش داده می‌شود) */
    function hkExportMonths(range) {
      var out = [], cy = currentYear, cm = currentMonth;
      var add = function (y, m) { var pd = hkExportPd(y, m); if (pd) out.push({ y: y, m: m, pd: pd, label: MONTHS[m - 1] + ' ' + toPersianDigits(y) }); };
      if (range === '3m') {
        for (var i = 2; i >= 0; i--) { var k = cy * 12 + (cm - 1) - i; add(Math.floor(k / 12), k % 12 + 1); }
      } else if (range === 'year') {
        for (var m = 1; m <= cm; m++) add(cy, m);
      } else if (range === 'all') {
        var keys = {};
        Object.keys(archive || {}).forEach(function (key) { var p = String(key).split('-'), y = parseInt(p[0], 10), mm = parseInt(p[1], 10); if (y && mm) keys[y * 100 + mm] = 1; });
        keys[cy * 100 + cm] = 1;
        Object.keys(keys).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
          var y = Math.floor(k / 100), mm = k % 100;
          var pd = hkExportPd(y, mm);
          if (pd && (pd === periodData || ['income', 'expense'].some(function (t) { return ((pd[t] && pd[t].sections) || []).some(function (s) { return (s.rows || []).some(function (r) { return r && !r.deletedAt && (r.desc || Number(r.amount)); }); }); }))) add(y, mm);
        });
      } else add(cy, cm);
      return out;
    }
    function hkExportRangeLabel(range, months) {
      if (!months.length) return '';
      if (months.length === 1) return months[0].label;
      if (range === 'year') return 'سال ' + toPersianDigits(currentYear);
      return months[0].label + ' تا ' + months[months.length - 1].label;
    }
    /* بخش‌هایی که در این بازه/کاربر داده دارند */
    function hkExportAvailable(range, user) {
      var months = hkExportMonths(range), av = {};
      var usableRow = function (r) { return r && !r.deletedAt && (r.desc || Number(r.amount)); };
      months.forEach(function (mo) {
        ['income', 'expense'].forEach(function (t) {
          ((mo.pd[t] && mo.pd[t].sections) || []).forEach(function (s) {
            if (user && ((s.title || '').trim() || '—') !== user) return;
            if ((s.rows || []).some(usableRow)) av[t] = true;
          });
        });
        var led = mo.pd.ledger;
        if (led && (led.sections || []).some(function (s) { return (s.rows || []).some(usableRow); })) av.ledger = true;
      });
      try { if ((plans || []).some(function (p) { return p && !p.deletedAt && (!user || (p.expenseSectionTitle || '').trim() === user); })) av.install = true; } catch (e) {}
      try { if ((ledgerPairNets() || []).length) av.ledger = true; } catch (e) {}
      try { if ((loadFinancialSubjects() || []).some(function (x) { return x && x.id && x.id !== 'personal'; })) av.projects = true; } catch (e) {}
      try { if ((recurringIncomes || []).some(function (r) { return r && !r.deletedAt && (r.name || r.amount) && (!user || (r.sectionTitle || '').trim() === user); })) av.recurring = true; } catch (e) {}
      try { if (savingsExportData()) av.savings = true; } catch (e) {}
      try { if ((selectedBankAccounts || []).length) av.accounts = true; } catch (e) {}
      return av;
    }
    function hkExportFileBase() {
      if (_hkRecArc) return 'hesab-recurring-archive';
      var o = _hkExportOpts || {}, r = o.range || 'month';
      var base = 'hesab-' + currentYear + '-' + String(currentMonth).padStart(2, '0');
      if (r === '3m') base += '-3m'; else if (r === 'year') base = 'hesab-' + currentYear; else if (r === 'all') base = 'hesab-all';
      return base;
    }
    function hkOpenExportDialog(kind) {
      var old = document.getElementById('hkExportModal'); if (old) old.remove();
      var KEY = STORAGE_KEY + '_exportOpts';
      var saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
      var titles = []; try { titles = allSectionTitles(); } catch (e) {}
      /* ۱.۳.۴۷: تک‌کاربره: منوی «بخش» برداشته شد؛ خروجی همیشه کل داده */
      var st = { range: saved.range || 'month', user: '', sections: saved.sections || null };
      var ov = document.createElement('div');
      ov.id = 'hkExportModal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:100360;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;';
      var box = document.createElement('div');
      box.style.cssText = 'width:100%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:14px;direction:rtl;overflow:hidden;box-shadow:0 12px 32px var(--shadow);';
      box.innerHTML = '<div style="padding:12px 14px 6px;font-weight:800;font-size:0.95rem;text-align:center;">' + (kind === 'excel' ? 'خروجی Excel' : 'خروجی PDF') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr;gap:8px;padding:4px 12px 8px;">' +
          '<div style="display:none"><div data-slot="user"></div></div>' +
          '<div><div style="font-size:0.74rem;color:var(--muted);margin-bottom:3px;text-align:right;">بازهٔ زمانی</div><div data-slot="range"></div></div>' +
        '</div>' +
        '<div id="hkExpList" style="overflow:auto;flex:1;padding:0 12px 6px;border-top:1px solid var(--border);"></div>' +
        '<div style="display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid var(--border);">' +
          '<button type="button" id="hkExpGo" style="flex:1;padding:10px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-family:inherit;font-weight:700;">' + (kind === 'excel' ? 'ساخت Excel' : 'ساخت PDF') + '</button>' +
          '<button type="button" id="hkExpCancel" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:700;">انصراف</button>' +
        '</div>';
      ov.appendChild(box);
      document.body.appendChild(ov);
      var close = function () { try { ov.remove(); } catch (e) {} };
      ov._hkCancel = close;
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      box.querySelector('#hkExpCancel').onclick = close;
      var list = box.querySelector('#hkExpList'), go = box.querySelector('#hkExpGo');
      var checked = function () { return [].slice.call(list.querySelectorAll('input[data-k]:checked')).map(function (c) { return c.getAttribute('data-k'); }); };
      var syncGo = function () {
        var n = checked().length, all = list.querySelectorAll('input[data-k]').length;
        go.disabled = !n; go.style.opacity = n ? '1' : '0.45';
        var sa = list.querySelector('#hkExpAll'); if (sa) { sa.checked = !!all && n === all; sa.indeterminate = n > 0 && n < all; }
      };
      /* انتخاب کاربر بین تغییر بازه/بخش حفظ می‌شود؛ null = همه */
      var sel = st.sections ? Object.assign({}, st.sections) : null;
      var setSel = function (k, v) { if (!sel) { sel = {}; HK_EXPORT_SECTIONS.forEach(function (s) { sel[s[0]] = true; }); } sel[k] = v; };
      var renderList = function () {
        var av = hkExportAvailable(st.range, st.user);
        var keys = HK_EXPORT_SECTIONS.filter(function (s) { return av[s[0]]; });
        var h = '<label class="hk-exp-all" style="position:sticky;top:0;z-index:2;background:var(--card);display:flex;align-items:center;gap:8px;padding:10px 2px;border-bottom:1px solid var(--border);font-weight:800;font-size:0.86rem;cursor:pointer;">' +
          '<input type="checkbox" id="hkExpAll" style="width:18px;height:18px;accent-color:var(--accent);">همه</label>';
        if (!keys.length) h += '<div style="text-align:center;color:var(--muted);padding:16px 4px;font-size:0.84rem;">در این بازه داده‌ای نیست</div>';
        keys.forEach(function (s) {
          var on = sel ? !!sel[s[0]] : true;
          h += '<label style="display:flex;align-items:center;gap:8px;padding:9px 2px;border-bottom:1px solid var(--border);font-size:0.86rem;cursor:pointer;">' +
            '<input type="checkbox" data-k="' + s[0] + '"' + (on ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent);">' + s[1] + '</label>';
        });
        list.innerHTML = h;
        list.querySelector('#hkExpAll').onchange = function () { var v = this.checked; list.querySelectorAll('input[data-k]').forEach(function (c) { c.checked = v; setSel(c.getAttribute('data-k'), v); }); syncGo(); };
        list.querySelectorAll('input[data-k]').forEach(function (c) { c.onchange = function () { setSel(c.getAttribute('data-k'), c.checked); syncGo(); }; });
        syncGo();
      };
      var uOpts = [{ value: '', label: 'همه' }].concat(titles.map(function (t) { return { value: t, label: t }; }));
      var uSel = createDarkSelect({ options: uOpts, value: st.user, onChange: function (v) { st.user = v || ''; renderList(); } });
      if (uSel._list) uSel._list.classList.add('bsr-list');
      box.querySelector('[data-slot="user"]').appendChild(uSel);
      var rSel = createDarkSelect({ options: HK_EXPORT_RANGES.map(function (r) { return { value: r[0], label: r[1] }; }), value: st.range, onChange: function (v) { st.range = v || 'month'; renderList(); } });
      if (rSel._list) rSel._list.classList.add('bsr-list');
      box.querySelector('[data-slot="range"]').appendChild(rSel);
      renderList();
      go.onclick = async function () {
        var ks = checked();
        if (!ks.length) return;
        try { localStorage.setItem(KEY, JSON.stringify({ range: st.range, user: st.user, sections: sel })); } catch (e) {}
        close();
        _hkExportOpts = { range: st.range, user: st.user, sections: {} };
        ks.forEach(function (k) { _hkExportOpts.sections[k] = true; });
        try { if (kind === 'excel') await exportExcel(); else await exportPdf(); }
        finally { _hkExportOpts = null; }
      };
    }
    /* بلوک‌ها: {html, split:bool} — split یعنی جدول قابل شکستن */
    function buildPdfBlocks() {
      if (_hkRecArc) return hkRecArcPdfBlocks();
      var E = escapeHtml, B = [];
      var O = _hkExportOpts || {};
      var want = function (k) { return !O.sections || !!O.sections[k]; };
      var months = hkExportMonths(O.range || 'month');
      if (!months.length) months = [{ y: currentYear, m: currentMonth, pd: periodData, label: MONTHS[currentMonth - 1] + ' ' + toPersianDigits(currentYear) }];
      var multi = months.length > 1;
      var periodLabel = hkExportRangeLabel(O.range || 'month', months) + (O.user ? ' — ' + O.user : '');
      var today = getTodayPersian();
      var titleOf = function (s) { return ((s && s.title) || '').trim() || '—'; };
      var PD = periodData;
      var userOk = function (sec) { return !O.user || titleOf(sec) === O.user; };
      var tabRows = function (tab) { return ((PD[tab] && PD[tab].sections) || []).filter(userOk); };
      var usable = function (r) { return r && !r.deletedAt && (r.desc || Number(r.amount) || r.day); };
      /* ---- جمع‌ها (همهٔ ماه‌های بازه) ---- */
      var tot = { inc: { p: 0, u: 0 }, exp: { p: 0, u: 0 } }, byCard = {}, order = [], perMonth = [];
      months.forEach(function (mo) {
        PD = mo.pd;
        var pm = { label: mo.label, inc: 0, exp: 0 };
        ['income', 'expense'].forEach(function (tab) {
          tabRows(tab).forEach(function (sec) {
            var t = titleOf(sec);
            if (!byCard[t]) { byCard[t] = { inc: 0, exp: 0, unpaidExp: 0, unpaidInc: 0 }; order.push(t); }
            (sec.rows || []).forEach(function (r) {
              if (!usable(r)) return;
              var a = pdfPersonalAmounts(tab, r), k = tab === 'income' ? 'inc' : 'exp';
              tot[k].p += a.paid; tot[k].u += a.unpaid;
              byCard[t][k] += a.total;
              byCard[t][tab === 'income' ? 'unpaidInc' : 'unpaidExp'] += a.unpaid;
              pm[k] += a.total;
            });
          });
        });
        perMonth.push(pm);
      });
      PD = periodData;
      var accMap = {}; try { accMap = globalAccountBalances() || {}; } catch (e) {}
      var accSum = 0; Object.keys(accMap).forEach(function (k) { accSum += Number(accMap[k]) || 0; });
      var incT = tot.inc.p + tot.inc.u, expT = tot.exp.p + tot.exp.u;
      /* ---- سربرگ و خلاصه ---- */
      var kp = '';
      if (want('income')) kp += '<div class="kpi"><div class="l">کل درآمد</div><div class="v">' + pdfMoney(incT) + '</div><div class="s">دریافت‌شده ' + pdfMoney(tot.inc.p) + ' · مانده ' + pdfMoney(tot.inc.u) + '</div></div>';
      if (want('expense')) kp += '<div class="kpi"><div class="l">کل مخارج</div><div class="v">' + pdfMoney(expT) + '</div><div class="s">پرداخت‌شده ' + pdfMoney(tot.exp.p) + ' · مانده ' + pdfMoney(tot.exp.u) + '</div></div>';
      if (want('income') && want('expense')) kp += '<div class="kpi"><div class="l">درآمد منهای مخارج</div><div class="v">' + pdfMoney(incT - expT) + '</div><div class="s">' + (incT - expT >= 0 ? 'مازاد' : 'کسری') + (multi ? ' این بازه' : ' این ماه') + '</div></div>';
      if (want('accounts')) kp += '<div class="kpi"><div class="l">موجودی حساب‌ها</div><div class="v">' + pdfMoney(accSum) + '</div><div class="s">' + toPersianDigits(Object.keys(accMap).length) + ' حساب</div></div>';
      var UNAME = ''; try { UNAME = hkMainTitle(); } catch (eU) {}
      /* ۱.۳.۷۷: عکس کوچک کاربر کنار اسمش (فقط PDF) */
      var _av = ''; try { _av = (typeof hkAvatarGet === 'function' ? hkAvatarGet() : '') || ''; if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(_av)) _av = ''; } catch (eAv) { _av = ''; }
      B.push({ html: '<div class="pb hd"><div class="hd-u">' + (_av ? '<img class="hd-av" alt="" src="' + _av + '">' : '') + '<h1>گزارش مالی ' + (UNAME ? E(UNAME) + ' — ' : '') + E(periodLabel) + '</h1></div><div class="sub">حساب‌کتاب<br>تاریخ تهیه: ' +
        toPersianDigits(today.y) + '/' + toPersianPad2(today.m) + '/' + toPersianPad2(today.d) + '</div></div>' +
        (kp ? '<div class="pb kpis">' + kp + '</div>' : '') });
      /* ---- خلاصهٔ کارت‌ها ---- */
      /* ۱.۳.۴۷: تک‌کاربره: جدول «خلاصهٔ کارت‌ها» لازم نیست (همان سربرگ) */
      if (order.length > 1 && (want('income') || want('expense'))) {
        var h = '<div class="pb sec"><div class="st">خلاصهٔ کارت‌ها <small>(مبالغ شخصی؛ سهم پروژه‌ها جدا حساب شده)</small></div><table><thead><tr><th style="width:28%">کارت</th><th>درآمد</th><th>مخارج</th><th>مانده</th><th>پرداخت‌نشده</th></tr></thead><tbody>';
        var sI = 0, sE = 0, sU = 0;
        order.forEach(function (t) {
          var c = byCard[t]; sI += c.inc; sE += c.exp; sU += c.unpaidExp;
          h += '<tr><td>' + E(t) + '</td><td class="n">' + pdfMoney(c.inc) + '</td><td class="n">' + pdfMoney(c.exp) + '</td><td class="n">' + pdfMoney(c.inc - c.exp) + '</td><td class="n">' + pdfMoney(c.unpaidExp) + '</td></tr>';
        });
        if (order.length > 1) h += '<tr class="T"><td>جمع</td><td class="n">' + pdfMoney(sI) + '</td><td class="n">' + pdfMoney(sE) + '</td><td class="n">' + pdfMoney(sI - sE) + '</td><td class="n">' + pdfMoney(sU) + '</td></tr>';
        B.push({ html: h + '</tbody></table></div>' });
      }
      /* ---- جزئیات درآمد/مخارج ---- */
      function detail(tab, monthLabel, my, mm) {
        var isInc = tab === 'income', cls = isInc ? 'inc' : 'exp';
        /* ۱.۳.۷۳: تاریخ کامل (شمسی بالا، میلادی پایین در یک خانه) و ساعت؛ همه در یک ردیف با همان ارتفاع */
        var head = '<thead><tr><th style="width:4%">#</th><th style="width:11%">تاریخ</th><th style="width:6%">ساعت</th><th>شرح</th>' + (isInc ? '' : '<th style="width:12%">دسته</th>') + '<th style="width:12%">حساب</th><th style="width:14%">مبلغ</th><th style="width:13%">وضعیت</th></tr></thead>';
        var cols = isInc ? 7 : 8, body = '', any = false, gp = 0, gu = 0;
        tabRows(tab).forEach(function (sec) {
          var rows = (sec.rows || []).filter(usable);
          if (!rows.length) return;
          any = true;
          /* ۱.۳.۴۷: نام کارت تکرار نمی‌شود */
          var p = 0, u = 0;
          rows.slice().sort(function (a, b) { return (parseInt(toEnglishDigits(String(a.day || '99')), 10) || 99) - (parseInt(toEnglishDigits(String(b.day || '99')), 10) || 99); }).forEach(function (r, i) {
            var paid = r.status === 'paid', amt = Number(r.amount) || 0;
            if (!r.p2p) { if (paid) p += amt; else u += amt; }
            var cat = '';
            if (!isInc) { try { var c = HKCategorizer.classify(r.desc, r); cat = c ? c.label : ''; } catch (e) {} }
            var proj = '';
            try { var fc = rowFinancialContext(r); if (fc && fc.subjectName && fc.subjectId !== 'personal') proj = ' <span style="color:#666">(پروژه: ' + E(fc.subjectName) + ')</span>'; } catch (e2) {}
            body += '<tr><td class="c">' + toPersianDigits(i + 1) + '</td>' + hkExpDateTd(r, my || currentYear, mm || currentMonth) + '<td class="c tm">' + hkExpTime(r) + '</td><td>' + E(r.desc || '') + proj + '</td>' +
              (isInc ? '' : '<td class="c">' + E(cat) + '</td>') + '<td class="c">' + E(r.account || '') + '</td><td class="n">' + pdfMoney(amt) + '</td>' +
              '<td class="c' + (paid ? '' : ' un') + '">' + (paid ? '● ' + (isInc ? 'دریافت‌شده' : 'پرداخت‌شده') : '○ ' + (isInc ? 'دریافت‌نشده' : 'پرداخت‌نشده')) + '</td></tr>';
          });
          gp += p; gu += u;
          if (false) body += '<tr class="t"><td colspan="' + (cols - 2) + '">جمع ' + E(titleOf(sec)) + ' — ' + (isInc ? 'دریافت‌شده ' : 'پرداخت‌شده ') + pdfMoney(p) + ' · ' + (isInc ? 'دریافت‌نشده ' : 'پرداخت‌نشده ') + pdfMoney(u) + '</td><td class="n">' + pdfMoney(p + u) + '</td><td></td></tr>';
        });
        var title = '<div class="st ' + cls + '">' + (isInc ? 'درآمدها' : 'مخارج') + ' <small>' + E(monthLabel || periodLabel) + '</small></div>';
        if (!any) { if (!multi) B.push({ html: '<div class="pb sec">' + title + '<div class="empty">ثبتی وجود ندارد</div></div>' }); return; }
        body += '<tr class="T"><td colspan="' + (cols - 2) + '">جمع کل ' + (isInc ? 'درآمد' : 'مخارج') + ' — ' + (isInc ? 'دریافت‌شده ' : 'پرداخت‌شده ') + pdfMoney(gp) + ' · ' + (isInc ? 'دریافت‌نشده ' : 'پرداخت‌نشده ') + pdfMoney(gu) + '</td><td class="n">' + pdfMoney(gp + gu) + '</td><td></td></tr>';
        B.push({ html: '<div class="pb sec">' + title + '<table>' + head + '<tbody>' + body + '</tbody></table></div>', split: true });
      }
      /* بازهٔ چندماهه: ماه‌به‌ماه، بعد جمع هر ماه */
      months.forEach(function (mo) {
        PD = mo.pd;
        if (want('income')) detail('income', mo.label, mo.y, mo.m);
        if (want('expense')) detail('expense', mo.label, mo.y, mo.m);
      });
      PD = periodData;
      if (multi && (want('income') || want('expense'))) {
        var mh = '<div class="pb sec"><div class="st">جمع ماه‌به‌ماه <small>' + E(periodLabel) + '</small></div><table><thead><tr><th style="width:28%">ماه</th>' +
          (want('income') ? '<th>درآمد</th>' : '') + (want('expense') ? '<th>مخارج</th>' : '') + (want('income') && want('expense') ? '<th>مانده</th>' : '') + '</tr></thead><tbody>';
        var si = 0, se = 0;
        perMonth.forEach(function (pm) {
          si += pm.inc; se += pm.exp;
          mh += '<tr><td>' + E(pm.label) + '</td>' + (want('income') ? '<td class="n">' + pdfMoney(pm.inc) + '</td>' : '') + (want('expense') ? '<td class="n">' + pdfMoney(pm.exp) + '</td>' : '') + (want('income') && want('expense') ? '<td class="n">' + pdfMoney(pm.inc - pm.exp) + '</td>' : '') + '</tr>';
        });
        mh += '<tr class="T"><td>جمع</td>' + (want('income') ? '<td class="n">' + pdfMoney(si) + '</td>' : '') + (want('expense') ? '<td class="n">' + pdfMoney(se) + '</td>' : '') + (want('income') && want('expense') ? '<td class="n">' + pdfMoney(si - se) + '</td>' : '') + '</tr></tbody></table></div>';
        B.push({ html: mh, split: true });
      }
      /* ---- حساب‌ها + درآمد ثابت (کنار هم) ---- */
      var accKeys = Object.keys(accMap);
      var accHtml = '<div class="st acc">موجودی حساب‌ها</div>' + (accKeys.length ?
        '<table><thead><tr><th>حساب</th><th style="width:42%">موجودی</th></tr></thead><tbody>' + accKeys.map(function (k) { return '<tr><td>' + E(k) + '</td><td class="n">' + pdfMoney(accMap[k]) + '</td></tr>'; }).join('') +
        (accKeys.length > 1 ? '<tr class="T"><td>جمع</td><td class="n">' + pdfMoney(accSum) + '</td></tr>' : '') + '</tbody></table>' : '<div class="empty">حسابی تعریف نشده</div>');
      var rec = []; try { rec = (recurringIncomes || []).filter(function (r) { return r && !r.deletedAt && (r.name || r.amount) && (!O.user || (r.sectionTitle || '').trim() === O.user); }); } catch (e) {}
      /* ---- درآمدهای ثابت: جدول بالا = مشخصات هر قرارداد (به ترتیب روز)، جدول پایین = واریزهای همین بازه (به ترتیب تاریخ) ---- */
      var numDate = function (d) { return (d && d.y) ? toPersianDigits(d.y + '/' + String(d.m).padStart(2, '0') + '/' + String(d.d).padStart(2, '0')) : '—'; };
      var recSorted = rec.slice().sort(function (a, b) { return (parseInt(toEnglishDigits(String(a.day || '')), 10) || 99) - (parseInt(toEnglishDigits(String(b.day || '')), 10) || 99); });
      var recSum = 0, depSum = 0;
      var recHtml = '<div class="st inc">درآمدهای ثابت</div>' + (rec.length ?
        '<table><thead><tr><th>نام</th><th style="width:15%">مبلغ ماهانه</th><th style="width:14%">رهن</th><th style="width:13%">شروع قرارداد</th><th style="width:13%">پایان قرارداد</th><th style="width:15%">حساب</th></tr></thead><tbody>' +
        recSorted.map(function (r) {
          recSum += Number(r.amount) || 0; depSum += Number(r.deposit) || 0;
          return '<tr><td>' + E(r.name || '—') + '</td><td class="n">' + pdfMoney(r.amount) + '</td><td class="n">' + (Number(r.deposit) > 0 ? pdfMoney(r.deposit) : '—') + '</td><td class="c">' + numDate(r.contractStart) + '</td><td class="c">' + numDate(r.contractEnd) + '</td><td class="c">' + E(r.account || '—') + '</td></tr>';
        }).join('') +
        (rec.length > 1 ? '<tr class="T"><td>جمع</td><td class="n">' + pdfMoney(recSum) + '</td><td class="n">' + (depSum ? pdfMoney(depSum) : '—') + '</td><td colspan="3"></td></tr>' : '') + '</tbody></table>' : '<div class="empty">درآمد ثابتی ثبت نشده</div>');
      if (want('accounts')) B.push({ html: '<div class="pb sec">' + accHtml + '</div>' });
      if (want('recurring')) B.push({ html: '<div class="pb sec">' + recHtml + '</div>', split: rec.length > 0 });
      if (want('recurring') && rec.length) {
        var mk = {}; months.forEach(function (mo) { mk[mo.y * 100 + mo.m] = 1; });
        var dep = [];
        rec.forEach(function (it) {
          var rows = []; try { rows = recArchiveRows(it).filter(function (x) { return mk[x.key]; }); } catch (e) {}
          rows.forEach(function (x) { dep.push({ it: it, x: x, d: parseInt(toEnglishDigits(String(x.row.day || '')), 10) || 0 }); });
        });
        dep.sort(function (a, b) { return (a.x.key - b.x.key) || (a.d - b.d); });
        if (dep.length) {
          var ar = '', paidSum = 0;
          dep.forEach(function (o) {
            var ok = o.x.row.status === 'paid', y = Math.floor(o.x.key / 100), m = o.x.key % 100;
            if (ok) paidSum += Number(o.x.row.amount) || 0;
            ar += '<tr><td>' + E(o.x.row.desc || o.it.name || '') + '</td><td class="c">' + toPersianDigits(y + '/' + String(m).padStart(2, '0') + (o.d ? '/' + String(o.d).padStart(2, '0') : '')) + '</td><td class="n">' + pdfMoney(o.x.row.amount) + '</td><td class="c">' + E(o.x.row.account || '—') + '</td><td class="c' + (ok ? '' : ' un') + '">' + (ok ? '● دریافت‌شده' : '○ دریافت‌نشده') + '</td></tr>';
          });
          ar += '<tr class="T"><td colspan="2">جمع دریافت‌شده</td><td class="n">' + pdfMoney(paidSum) + '</td><td colspan="2"></td></tr>';
          B.push({ html: '<div class="pb sec"><div class="st inc">واریزهای درآمدهای ثابت <small>' + E(periodLabel) + '</small></div><table><thead><tr><th>نام (شرح)</th><th style="width:16%">تاریخ</th><th style="width:17%">مبلغ</th><th style="width:17%">حساب</th><th style="width:16%">وضعیت پرداخت</th></tr></thead><tbody>' + ar + '</tbody></table></div>', split: true });
        }
      }
      /* ---- اقساط ---- */
      var ps = (plans || []).filter(function (p) { return p && !p.deletedAt && (!O.user || (p.expenseSectionTitle || '').trim() === O.user); });
      if (false && ps.length && want('install')) { /* ۱.۳.۴۸: اقساط از PDF و Excel حذف شد */
        var ti = 0, tp = 0, tr = 0, tm = 0;
        var ih = '<div class="pb sec"><div class="st ins">اقساط</div><table><thead><tr><th style="width:22%">نام وام</th><th>مبلغ هر قسط</th><th style="width:12%">پرداخت‌شده</th><th style="width:17%">سررسید بعدی</th><th>جمع پرداختی</th><th>باقی‌مانده</th></tr></thead><tbody>';
        ps.forEach(function (plan) {
          var count = Math.max(0, parseInt(plan.count, 10) || 0), paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
          var amt = 0, total = 0;
          try { amt = planInstallmentAmount(plan); total = planTotalPayable(plan); } catch (e) { amt = Number(plan.amount) || 0; total = amt * count; }
          var next = '—';
          if (paid < count) { try { var d = dueDateForInstallment(plan, paid); next = toPersianDigits(d.d) + ' ' + MONTHS[d.m - 1] + ' ' + toPersianDigits(d.y); } catch (e2) {} }
          else next = 'تسویه';
          tp += paid * amt; tr += total - paid * amt; ti += total; if (paid < count) tm += amt;
          ih += '<tr><td>' + E(plan.name || '—') + '</td><td class="n">' + pdfMoney(amt) + '</td><td class="c">' + toPersianDigits(paid) + ' از ' + toPersianDigits(count) + '</td><td class="c">' + next + '</td><td class="n">' + pdfMoney(paid * amt) + '</td><td class="n">' + pdfMoney(total - paid * amt) + '</td></tr>';
        });
        ih += '<tr class="T"><td>جمع</td><td class="n">' + pdfMoney(tm) + '</td><td></td><td></td><td class="n">' + pdfMoney(tp) + '</td><td class="n">' + pdfMoney(tr) + '</td></tr></tbody></table>' +
          '<div class="note">«مبلغ هر قسط» در ردیف جمع = جمع قسط‌های ماهانهٔ وام‌های تسویه‌نشده. جمع کل قابل پرداخت همهٔ وام‌ها: ' + pdfMoney(ti) + '</div></div>';
        B.push({ html: ih, split: true });
      }
      /* ---- قرض (۱.۳.۷۳): هر رابطه با همهٔ ردیف‌هایی که در نرم‌افزار دیده می‌شوند، تاریخ کامل، ساعت، وضعیت تسویه و مانده ---- */
      var pairs = []; try { pairs = ledgerPairNets() || []; } catch (e) {}
      var lgs = []; try { lgs = hkExpLedgerData(months); } catch (e) {}
      if ((pairs.length || lgs.length) && want('ledger')) {
        var withBy = lgs.some(function (g) { return g.withBy; });
        var LC = withBy ? 9 : 8, byTd = function (v) { return withBy ? '<td class="c">' + v + '</td>' : ''; };
        var lh = '<div class="pb sec"><div class="st led">قرض و طلب <small>' + E(periodLabel) + '</small></div>' +
          '<table><thead><tr><th style="width:4%">#</th><th style="width:11%">تاریخ</th><th style="width:6%">ساعت</th><th>شرح</th><th style="width:12%">بدهکار</th><th style="width:12%">بستانکار</th><th style="width:13%">مبلغ</th><th style="width:9%">وضعیت</th>' + (withBy ? '<th style="width:10%">ثبت‌کننده</th>' : '') + '</tr></thead><tbody>';
        lgs.forEach(function (g) {
          lh += '<tr class="g"><td colspan="' + LC + '">' + E(g.title) + '</td></tr>';
          g.rows.forEach(function (x, i) {
            lh += '<tr' + (x.r.settled ? ' class="dim"' : '') + '><td class="c">' + toPersianDigits(i + 1) + '</td>' + hkExpDateTd(x.r, x.y, x.m) + '<td class="c tm">' + hkExpTime(x.r) + '</td><td>' + E(x.r.desc || '') + '</td>' +
              '<td class="c">' + E(x.debtor) + '</td><td class="c">' + E(x.creditor) + '</td><td class="n">' + pdfMoney(x.amt) + '</td><td class="c">' + (x.r.settled ? '✓ تسویه' : 'باز') + '</td>' + byTd(E(x.r.createdByName || '')) + '</tr>';
          });
          lh += '<tr class="t"><td colspan="6">' + E(g.netTxt) + '</td><td class="n">' + pdfMoney(Math.abs(g.net)) + '</td><td></td>' + byTd('') + '</tr>';
        });
        if (pairs.length) {
          lh += '<tr class="g"><td colspan="' + LC + '">خلاصهٔ مانده‌ها (همهٔ رابطه‌ها، تا امروز)</td></tr>';
          pairs.forEach(function (p) {
            lh += '<tr class="T"><td colspan="4">' + E((p.debtor || '') + ' به ' + (p.creditor || '') + ' بدهکار است') + '</td><td class="c">' + E(p.debtor || '') + '</td><td class="c">' + E(p.creditor || '') + '</td><td class="n">' + pdfMoney(p.amount) + '</td><td></td>' + byTd('') + '</tr>';
          });
        }
        lh += '</tbody></table><div class="note">ردیف‌های تسویه‌نشدهٔ ماه‌های قبل هم (مثل جدول قرض در نرم‌افزار) آمده‌اند؛ ردیف تسویه‌شده در مانده حساب نمی‌شود.</div>';
        B.push({ html: lh + '</div>', split: true });
      }
      /* ---- پروژه‌ها: واریزی‌ها، مخارج و وضعیت طلب/بدهی هر پروژه (همهٔ ماه‌ها) ---- */
      var subs = [];
      try { subs = (loadFinancialSubjects() || []).filter(function (x) { return x && x.id && x.id !== 'personal'; }); } catch (e) {}
      var rowDate = function (r) {
        var parts = String(r.key || '').split('-'), y = parts[0] || '', m = parseInt(parts[1], 10) || 0, d = parseInt(toEnglishDigits(String(r.day || '')), 10) || 0;
        if (!y) return '—';
        return toPersianDigits(y + '/' + String(m).padStart(2, '0') + (d >= 1 && d <= 31 ? '/' + String(d).padStart(2, '0') : ''));
      };
      var txTable = function (list, cap, cls) {
        var sumT = 0;
        var h = '<div class="pb"><div class="st ' + cls + '" style="font-size:11px">' + cap + '</div>';
        if (!list.length) return h + '<div class="empty">موردی ثبت نشده</div></div>';
        h += '<table><thead><tr><th style="width:13%">تاریخ</th><th style="width:7%">ساعت</th><th>شرح</th><th style="width:18%">حساب</th><th style="width:18%">مبلغ</th></tr></thead><tbody>';
        list.slice().sort(function (x, y) { return String(x.key).localeCompare(String(y.key)) || ((parseInt(x.day, 10) || 0) - (parseInt(y.day, 10) || 0)); }).forEach(function (r) {
          sumT += Number(r.amt) || 0;
          var kp = String(r.key || '').split('-'), ky = parseInt(kp[0], 10) || 0, km = parseInt(kp[1], 10) || 0;
          var dc = (ky && parseInt(toEnglishDigits(String(r.day || '')), 10)) ? hkExpDateTd({ day: r.day }, ky, km) : '<td class="c">' + rowDate(r) + '</td>';
          h += '<tr>' + dc + '<td class="c tm">' + hkExpTime(r) + '</td><td>' + E(r.desc || '—') + '</td><td class="c">' + E(r.bank || '—') + '</td><td class="n">' + pdfMoney(r.amt) + '</td></tr>';
        });
        return h + '<tr class="t"><td colspan="4">جمع ' + cap + '</td><td class="n">' + pdfMoney(sumT) + '</td></tr></tbody></table></div>';
      };
      if (!want('projects')) subs = [];
      subs.forEach(function (sub, si) {
        var rep = null; try { rep = computeSubjectReport(sub.id); } catch (e) {}
        if (!rep) return;
        var dep = Number(rep.received) || 0, ex = Number(rep.totalExpense != null ? rep.totalExpense : rep.totalCost) || 0, net = dep - ex;
        var status = net > 0 ? 'پروژه ' + pdfMoney(net) + ' تومان طلب دارد' : net < 0 ? 'پروژه ' + pdfMoney(-net) + ' تومان بدهکار است' : 'پروژه تسویه است';
        var pc = '#5b6b7a'; try { pc = getProjectHighlightMeta(sub.highlightColor).accent || pc; } catch (eC) {}
        var head = '<div class="st" style="border-right:7px solid ' + pc + '"><span class="swatch" style="background:' + pc + '"></span>پروژهٔ ' + E(sub.name || '—') + ' <small>همهٔ ماه‌ها</small></div>' +
          '<div class="kpis" style="margin-bottom:6px"><div class="kpi"><div class="l">جمع واریزی</div><div class="v">' + pdfMoney(dep) + '</div></div>' +
          '<div class="kpi"><div class="l">جمع مخارج</div><div class="v">' + pdfMoney(ex) + '</div></div>' +
          '<div class="kpi" style="flex:1.6"><div class="l">وضعیت</div><div class="v" style="direction:rtl;text-align:right;font-size:12px">' + status + '</div></div></div>';
        var ins = (rep.rows || []).filter(function (x) { return x.tab === 'income'; });
        var outs = (rep.rows || []).filter(function (x) { return x.tab === 'expense'; });
        var depT = txTable(ins, 'واریزی‌ها', 'inc');
        B.push({ html: depT.replace('<div class="pb">', '<div class="pb sec">' + head), split: ins.length > 0 });
        B.push({ html: txTable(outs, 'مخارج پروژه', 'exp'), split: outs.length > 0 });
      });
      /* ---- پس‌انداز (ارز و طلا): جدا از موجودی کل ---- */
      var sv = want('savings') ? savingsExportData() : null;
      if (sv) {
        var sh = '<div class="pb sec"><div class="st sav">پس‌انداز (ارز و طلا) <small>جدا از موجودی حساب‌ها؛ قیمت روز را کاربر وارد کرده</small></div>' +
          '<table><thead><tr><th style="width:20%">نوع</th><th style="width:15%">مقدار</th><th>قیمت خرید کل</th><th>قیمت روز هر واحد</th><th>ارزش روز</th><th style="width:15%">سود / زیان</th></tr></thead><tbody>';
        sv.groups.forEach(function (G) {
          sh += '<tr><td>' + E(G.name) + '</td><td class="c">' + E(sv.qty(G.qty) + ' ' + G.unit) + '</td><td class="n">' + (G.cost ? pdfMoney(G.cost) : '—') + '</td><td class="n">' + (G.price ? pdfMoney(G.price) : 'وارد نشده') + '</td><td class="n">' + (G.price ? pdfMoney(G.value) : '—') + '</td><td class="n">' + (G.pnl != null ? (G.pnl > 0 ? '+' : '') + pdfMoney(G.pnl) : '—') + '</td></tr>';
        });
        sh += '<tr class="T"><td colspan="2">جمع</td><td class="n">' + pdfMoney(sv.tot.cost) + '</td><td></td><td class="n">' + pdfMoney(sv.tot.value) + '</td><td class="n">' + (sv.tot.anyP ? (sv.tot.pnl > 0 ? '+' : '') + pdfMoney(sv.tot.pnl) : '—') + '</td></tr></tbody></table>' +
          (sv.tot.missing ? '<div class="note">قیمت روز ' + toPersianDigits(sv.tot.missing) + ' مورد وارد نشده و ارزش آن در جمع نیامده است.</div>' : '') + '</div>';
        B.push({ html: sh });
        var dh = '<div class="pb sec"><div class="st sav" style="font-size:11px">ردیف‌های خرید پس‌انداز</div><table><thead><tr><th style="width:18%">نوع</th><th style="width:14%">تاریخ خرید</th><th style="width:15%">مقدار</th><th>قیمت خرید هر واحد</th><th>قیمت خرید کل</th><th style="width:20%">یادداشت</th></tr></thead><tbody>';
        sv.groups.forEach(function (G) {
          G.items.forEach(function (it) {
            var q = Number(it.qty) || 0, b = Number(it.buy) || 0;
            dh += '<tr><td>' + E(G.name) + '</td><td class="c">' + (sv.dateOf(it) || '—') + '</td><td class="c">' + E(sv.qty(q) + ' ' + sv.unitOf(it)) + '</td><td class="n">' + (b ? pdfMoney(b) : '—') + '</td><td class="n">' + (b ? pdfMoney(q * b) : '—') + '</td><td>' + E(it.note || '') + '</td></tr>';
          });
        });
        B.push({ html: dh + '</tbody></table></div>', split: true });
      }
      return B;
    }
    /* اندازه‌گیری در iframe ایزوله (استایل‌های نرم‌افزار روی گزارش اثر نگذارند) */
    function pdfMeasurer() {
      var fr = document.createElement('iframe');
      fr.setAttribute('aria-hidden', 'true');
      fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + PDF_W + 'px;height:2000px;border:0;visibility:hidden;';
      document.body.appendChild(fr);
      var d = fr.contentDocument;
      d.open(); d.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>' + pdfStyleCss() + '</style></head><body><div id="m" style="display:flow-root;width:' + (PDF_W - PDF_PAD * 2) + 'px"></div></body></html>'); d.close();
      var box = d.getElementById('m');
      /* فونت باید قبل از اندازه‌گیری بارگذاری شده باشد (وگرنه ارتفاع‌ها اشتباه می‌شود) */
      var ready = (async function () {
        try { await Promise.all(['400 10px Vazirmatn', '700 10px Vazirmatn'].map(function (f) { return d.fonts.load(f, 'سلام ۱۲۳'); })); await d.fonts.ready; } catch (e) {}
      })();
      return {
        ready: ready,
        h: function (html) { box.innerHTML = html; var h = box.getBoundingClientRect().height; box.innerHTML = ''; return Math.ceil(h) + 1; },
        doc: d,
        done: function () { try { fr.remove(); } catch (e) {} }
      };
    }
    /* تقسیم جدول بلوک روی مرز ردیف: سرستون تکرار می‌شود و ردیف عنوان گروه تنها در پایین صفحه نمی‌ماند */
    function pdfSplitBlock(M, html, firstMax, nextMax) {
      var tmp = M.doc.createElement('div'); tmp.innerHTML = html;
      var root = tmp.firstElementChild, tables = root.querySelectorAll('table');
      var table = tables[tables.length - 1];
      if (!table) return [html];
      var pre = '', node = root.firstChild;
      var preParts = [];
      while (node && node !== table) { preParts.push(node.outerHTML || node.textContent || ''); node = node.nextSibling; }
      var post = []; node = table.nextSibling; while (node) { post.push(node.outerHTML || ''); node = node.nextSibling; }
      pre = preParts.join('');
      var thead = table.querySelector('thead') ? table.querySelector('thead').outerHTML : '';
      var rows = Array.prototype.slice.call(table.querySelectorAll('tbody > tr')).map(function (r) { return { html: r.outerHTML, g: r.classList.contains('g') }; });
      var tStyle = table.getAttribute('style') || '';
      var rootCls = root.getAttribute('class') || 'pb';
      var wrap = function (lead, rs, tail, cls) { return '<div class="' + (cls || 'pb') + '">' + lead + '<table style="' + tStyle + '">' + thead + '<tbody>' + rs.map(function (r) { return r.html; }).join('') + '</tbody></table>' + tail + '</div>'; };
      var parts = [], i = 0, first = true, emitted = false;
      /* عنوان بخش در صفحهٔ بعد با برچسب «ادامه» تکرار شود */
      var contTitle = '';
      var stm = pre.match(/<div class="st[^"]*">[\s\S]*?<\/div>/);
      if (stm) contTitle = stm[0].indexOf('<small>') >= 0 ? stm[0].replace('<small>', '<small>ادامه · ') : stm[0].replace('</div>', ' <small>ادامه</small></div>');
      while (i < rows.length) {
        var max = first ? firstMax : nextMax, lead = emitted ? contTitle : pre, chunk = [];
        var j = i;
        while (j < rows.length) {
          chunk.push(rows[j]);
          var tail = (j === rows.length - 1) ? post.join('') : '';
          if (M.h(wrap(lead, chunk, tail, emitted ? 'pb' : rootCls)) > max) { chunk.pop(); break; }
          j++;
        }
        if (!chunk.length) {
          if (first && firstMax < nextMax) { parts.push(null); first = false; continue; }  /* اصلاً جا نشد → از صفحهٔ بعد */
          chunk = [rows[i]]; j = i + 1;
        }
        while (chunk.length > 1 && chunk[chunk.length - 1].g) { chunk.pop(); j--; }  /* عنوان گروه بی‌ردیف نماند */
        parts.push(wrap(lead, chunk, j >= rows.length ? post.join('') : '', emitted ? 'pb' : rootCls));
        i = j; first = false; emitted = true;
      }
      return parts;
    }
    async function buildPdfPages() {
      var M = pdfMeasurer(), pages = [], cur = [], used = 0, GAP = 0;
      await M.ready;
      var blocks = buildPdfBlocks();
      var push = function () { if (cur.length) pages.push(cur.join('')); cur = []; used = 0; };
      blocks.forEach(function (b) {
        var h = M.h(b.html);
        if (used + h <= PDF_BODY_H) { cur.push(b.html); used += h + GAP; return; }
        if (b.split) {
          var room = PDF_BODY_H - used;
          var parts = pdfSplitBlock(M, b.html, room > 140 ? room : 0, PDF_BODY_H);
          parts.forEach(function (p, idx) {
            if (p === null) { push(); return; }
            var ph = M.h(p);
            if (used + ph > PDF_BODY_H && cur.length) push();
            cur.push(p); used += ph + GAP;
          });
          return;
        }
        push();
        cur.push(b.html); used = h + GAP;
      });
      push();
      M.done();
      var n = pages.length, label = MONTHS[currentMonth - 1] + ' ' + toPersianDigits(currentYear);
      try { if (_hkExportOpts) label = hkExportRangeLabel(_hkExportOpts.range || 'month', hkExportMonths(_hkExportOpts.range || 'month')) || label; } catch (eL) {}
      return pages.map(function (inner, i) {
        return '<div class="pdf-page" data-page="' + i + '">' + inner +
          '<div class="pdf-foot"><span>حساب‌کتاب — گزارش ' + escapeHtml(label) + '</span><span>صفحهٔ ' + toPersianDigits(i + 1) + ' از ' + toPersianDigits(n) + '</span></div></div>';
      });
    }
    async function buildPdfFullDocument() {
      var pages = await buildPdfPages(), label = MONTHS[currentMonth - 1] + ' ' + toPersianDigits(currentYear);
      return '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=' + PDF_W + '">' +
        '<title>حساب کتاب — ' + escapeHtml(label) + '</title><style>' + pdfStyleCss() + '</style></head><body>' +
        '<scr' + 'ipt>window.__PDF_PAGE_COUNT__=' + pages.length + ';</scr' + 'ipt>' + pages.join('') + '</body></html>';
    }
    /* مسیر آفلاین (مرورگر/اگر native شکست): هر صفحه جدا رندر می‌شود تا مرز صفحات دقیقاً همان باشد */
    async function renderPdfPagesOffline() {
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
      var pages = await buildPdfPages(), css = pdfStyleCss(), SCALE = 2, out = [];
      for (var i = 0; i < pages.length; i++) {
        /* foreignObject فقط XHTML معتبر می‌پذیرد → سریال‌سازی XML */
        var holder = document.createElement('div');
        holder.className = 'pdf-root';
        holder.setAttribute('dir', 'rtl');
        holder.innerHTML = pages[i];
        var st = document.createElement('style'); st.textContent = css; holder.insertBefore(st, holder.firstChild);
        var xhtml = new XMLSerializer().serializeToString(holder);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PDF_W + '" height="' + PDF_PAGE_H + '"><foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
        var img = new Image();
        await new Promise(function (res, rej) { img.onload = res; img.onerror = function () { rej(new Error('svg')); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
        var c = document.createElement('canvas'); c.width = PDF_W * SCALE; c.height = PDF_PAGE_H * SCALE;
        var x = c.getContext('2d', { alpha: false }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.setTransform(SCALE, 0, 0, SCALE, 0, 0); x.drawImage(img, 0, 0);
        var bin = atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]), jpg = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) jpg[k] = bin.charCodeAt(k);
        out.push({ jpg: jpg, w: c.width, h: c.height });
      }
      if (!out.length) throw new Error('no pages');
      return buildSimpleImagePdf(out, 595.28, 841.89);
    }

/* بعد از ذخیره: فهرست برنامه‌های نمایش PDF باز می‌شود و فایل با برنامهٔ انتخاب‌شده نشان داده می‌شود */
function openPdfWithChooser(uri) {
  try {
    var P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeFileExport;
    if (!P || typeof P.openUri !== 'function' || !uri) return;
    setTimeout(function () {
      Promise.resolve(P.openUri({ uri: String(uri), mimeType: 'application/pdf', title: 'باز کردن PDF با' })).catch(function (e) {
        var m = String((e && (e.message || e.code)) || e || '');
        if (/no_app/.test(m)) { try { showToast('برنامه‌ای برای باز کردن PDF پیدا نشد؛ فایل در Downloads است'); } catch (eT) {} }
      });
    }, 350);
  } catch (e) {}
}
async function exportPdf(){
      try{
        persistCurrent();
        const name = hkExportFileBase() + '.pdf';
        showToast('در حال ساخت PDF...');
        const C = window.Capacitor, plugins = C && C.Plugins, native = plugins && plugins.NativeFileExport;
        const isNative = C && typeof C.isNativePlatform === 'function' && C.isNativePlatform();

        // اولویت روی اندروید: Native WebView.draw (محتوای واقعی)
        if (isNative && native && typeof native.exportHtmlToPdf === 'function') {
          try {
            const html = await buildPdfFullDocument();
            console.log('[PDF-DEBUG] native html length', html.length);
            if (html.length < 200) throw new Error('html too short');
            const result = await native.exportHtmlToPdf({ html: html, filename: name });
            if (result && result.uri) {
              showToast('PDF در Downloads ذخیره شد');
              openPdfWithChooser(result.uri);
              return;
            }
            throw new Error('no uri');
          } catch (ne) {
            console.warn('[PDF-DEBUG] native failed', ne);
          }
        }

        // fallback آفلاین (مرورگر / اگر native شکست)
        try {
          const blob = await renderPdfPagesOffline();
          if (!blob || !blob.size) throw new Error('empty');
          /* آیفون: ذخیره در Files و پنجرهٔ اشتراک (بدون صفحهٔ چاپ که کل نرم‌افزار را می‌پوشاند) */
          if (typeof hkIsIos === 'function' && hkIsIos()) { await hkIosSaveBlob(blob, name, 'application/pdf'); return; }
          if (isNative) {
            const b64 = await blobToBase64(blob);
            const saved = await nativeSaveBase64(name, 'application/pdf', b64);
            if (saved && saved.uri) { showToast('PDF ذخیره شد'); openPdfWithChooser(saved.uri); return; }
            throw new Error('save fail');
          }
          const saved = await shareExportFile(blob, name, 'application/pdf');
          if (!saved) downloadBlob(blob, name);
          showToast(saved ? 'PDF آماده است' : 'دانلود PDF شروع شد');
          return;
        } catch (oe) {
          console.warn('[PDF-DEBUG] offline failed', oe);
        }

        if (typeof hkIsIos === 'function' && hkIsIos()) { showToast('ساخت PDF ناموفق بود'); return; }
        await openPdfPrintWindow();
        showToast('پیش‌نمایش چاپ — Save as PDF');
      } catch (e) {
        console.error(e);
        showToast('ساخت PDF ناموفق بود');
      }
    }

async function openPdfPrintWindow(){
      // Android WebView/Print Preview ممکن است afterprint را خیلی زود، درست هنگام
      // باز شدن پیش‌نمایش، اجرا کند. اگر همان لحظه نرم‌افزار را برگردانیم، سرویس چاپ
      // به‌جای سند چاپی، صفحه اصلی را ذخیره می‌کند. بنابراین تا وقتی کاربر از
      // Print Preview برنگشته، صفحه گزارش را دست نمی‌زنیم.
      const appUrl=window.location.href;
      const printHtml=await buildPdfFullDocument();
      let printingStarted=false;
      let restored=false;
      let returnedFromPrint=false;
      let leftForPrintPreview=false;
      const cleanup=()=>{
        try{document.removeEventListener('visibilitychange',onVisibilityChange,true);}catch(e){}
        try{window.removeEventListener('pageshow',onPageShow,true);}catch(e){}
        try{window.removeEventListener('focus',onFocus,true);}catch(e){}
      };
      const restoreApp=()=>{
        if(restored || !printingStarted || !returnedFromPrint)return;
        restored=true; cleanup();
        setTimeout(()=>{try{window.location.replace(appUrl);}catch(e){try{window.location.reload();}catch(x){}}},150);
      };
      const onVisibilityChange=()=>{
        // hidden = ورود به Print Preview؛ visible بعد از Save/Cancel = برگشت به نرم‌افزار
        if(printingStarted && document.visibilityState==='hidden'){
          leftForPrintPreview=true;
          return;
        }
        if(printingStarted && leftForPrintPreview && document.visibilityState==='visible'){
          returnedFromPrint=true;
          restoreApp();
        }
      };
      const onPageShow=()=>{
        if(printingStarted && leftForPrintPreview){ returnedFromPrint=true; restoreApp(); }
      };
      const onFocus=()=>{
        if(printingStarted && leftForPrintPreview && document.visibilityState==='visible'){
          returnedFromPrint=true; restoreApp();
        }
      };
      try{
        document.open();
        document.write(printHtml);
        document.close();
        document.addEventListener('visibilitychange',onVisibilityChange,true);
        window.addEventListener('pageshow',onPageShow,true);
        window.addEventListener('focus',onFocus,true);
        setTimeout(()=>{
          printingStarted=true;
          try{window.focus();window.print();}
          catch(e){returnedFromPrint=true;restoreApp();}
        },700);
        // فقط برای حالت خرابی کامل Print Service؛ نباید در چاپ عادی فعال شود.
        setTimeout(()=>{
          if(!restored && printingStarted && leftForPrintPreview && document.visibilityState==='visible') { returnedFromPrint=true; restoreApp(); }
        },180000);
        return true;
      }catch(e){
        console.error('print export failed',e);
        try{window.location.replace(appUrl);}catch(x){window.location.reload();}
        return false;
      }
    }

    /* —— Menu —— */
    function blockAppTouchWhenMenuOpen(e) {
      const menu = document.getElementById('menuDropdown');
      if (!menu || !menu.classList.contains('open')) return;
      if (menu.contains(e.target)) return;
      /* پنجره‌های روی منو (بروزرسانی، پشتیبان و …) لمس خودشان را بگیرند */
      try { if (e.target && e.target.closest && e.target.closest('.backup-pick-overlay, .hk-av-pop, .hk-av-view, .hk-av-crop')) return; } catch (eO) {}
      const btn = document.getElementById('menuBtn');
      if (btn && btn.contains(e.target)) return;
      // تاچ/کلیک بیرون منو: جلوگیری از عبور به نرم‌افزار
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (e.type === 'touchstart' || e.type === 'mousedown') {
        closeSideMenu();
      }
    }
    const _menuBlockOpts = { capture: true, passive: false };
    function bindMenuBlockers() {
      document.addEventListener('touchmove', blockAppTouchWhenMenuOpen, _menuBlockOpts);
      document.addEventListener('touchstart', blockAppTouchWhenMenuOpen, _menuBlockOpts);
      document.addEventListener('mousedown', blockAppTouchWhenMenuOpen, true);
    }
    function unbindMenuBlockers() {
      document.removeEventListener('touchmove', blockAppTouchWhenMenuOpen, _menuBlockOpts);
      document.removeEventListener('touchstart', blockAppTouchWhenMenuOpen, _menuBlockOpts);
      document.removeEventListener('mousedown', blockAppTouchWhenMenuOpen, true);
    }
    /* —— قفل اسکرول بدنه هنگام باز بودن شیت/مودال (جلوگیری از پرش) —— */
    let _bodyScrollLockY = 0;
    let _bodyScrollLockCount = 0;
    function lockBodyScroll() {
      if (_bodyScrollLockCount === 0) {
        _bodyScrollLockY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = (-_bodyScrollLockY) + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }
      _bodyScrollLockCount++;
    }
    function unlockBodyScroll() {
      if (_bodyScrollLockCount > 0) _bodyScrollLockCount--;
      if (_bodyScrollLockCount <= 0) {
        _bodyScrollLockCount = 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        try { window.scrollTo(0, _bodyScrollLockY); } catch (e) {}
      }
    }

    /* باز کردن منوی همبرگری با کشیدن انگشت از لبهٔ راست صفحه به سمت چپ (فقط وقتی پنجره/منوی دیگری باز نیست) */
    (function () {
      var sx = 0, sy = 0, on = false, fired = false, EDGE = 28;
      function busy() {
        try {
          if (document.body.classList.contains('menu-open')) return true;
          if (document.querySelector('.modal-overlay.open, .backup-pick-overlay, .hk-recon-ov, #recPickModal, #recArchiveModal, #recRenewModal, #hkExportModal, #recurringSheet, .tour-root')) return true;
          /* ۱.۳.۵۵: از هر صفحه‌ای (مخارج/درآمد، منوها) هم باز می‌شود؛ فقط پنجره‌های روی صفحه مانع‌اند */
          var lk = document.getElementById('appLockOverlay'); if (lk && lk.classList.contains('show')) return true;
          if (document.querySelector('.hk-re-ov, .hk-bulk-ov, #smsConfirmModal.open, #recAddPrevModal, .hk-row-act')) return true;
        } catch (e) {}
        return false;
      }
      document.addEventListener('touchstart', function (e) {
        on = false; fired = false;
        if (!e.touches || e.touches.length !== 1) return;
        var t = e.touches[0];
        if (t.clientX < window.innerWidth - EDGE || busy()) return;
        sx = t.clientX; sy = t.clientY; on = true;
      }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        if (!on || fired || !e.touches || !e.touches[0]) return;
        var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) { on = false; return; }
        if (dx < -45) { fired = true; on = false; try { openSideMenu(); } catch (e2) {} }
      }, { passive: true });
      document.addEventListener('touchend', function () { on = false; }, { passive: true });
    })();
    function openSideMenu() {
      try { updateProfessionalModeUI(); } catch (e) {}
      try { if (typeof silentUpdateCheck === 'function') silentUpdateCheck(2 * 60 * 1000); } catch (eU) {}
      try { if (typeof hkPermRefresh === 'function') hkPermRefresh(); } catch (ePm) {}
      const menu = document.getElementById('menuDropdown');
      const bd = document.getElementById('menuBackdrop');
      /* ۱.۳.۴۷: نام کاربر (کارت اصلی) بالای منوی کناری؛ دیگر روی کارت نوشته نمی‌شود */
      try { hkRenderMenuProfile(); hkMenuSearchClear(); var _msi2 = document.getElementById('menuSearchInput'); if (_msi2 && document.activeElement === _msi2) _msi2.blur(); } catch (eUn) {}
      if (menu) menu.classList.add('open');
      if (bd) bd.classList.add('open');
      document.body.classList.add('menu-open');
      // همیشه از بالای منو شروع شود
      try {
        const sc = document.querySelector('.menu-scroll');
        if (sc) sc.scrollTop = 0;
      } catch (e) {}
      bindMenuBlockers();
    }
    /* =====================================================================
       آمار (منوی همبرگری): روزانه / هفتگی / ماهانه / سالانه با فیلتر و نمودار
       داده‌ها از همهٔ ماه‌های آرشیو + ماه جاری؛ مبالغ «شخصی» با همان قاعدهٔ
       sectionPaidUnpaidTotal (سهم پروژه حساب نمی‌شود) تا با بقیهٔ نرم‌افزار یکی باشد.
       ===================================================================== */
    var HKStats = (function () {
      var st = { mode: 'daily', y: 0, m: 0, card: '', type: 'both', status: 'all' };
      var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
      /* پاستلیِ کمی شارپ (ترتیب ثابت؛ رنگ به دسته می‌چسبد نه به رتبه) */
      var CAT_DARK = ['#6ea8fe', '#ff9b7a', '#5fd3a6', '#ffcc66', '#c49bff', '#ff8fb8', '#6fd6ea'];
      var CAT_LIGHT = ['#4f8ff7', '#f5835e', '#36bf8c', '#f2b43c', '#a97cf0', '#f06fa0', '#3fbfd8'];
      function fa(n) { return toPersianDigits(String(n)); }
      function money(n) { return formatNum(Math.round(n || 0)); }
      function short(n) { try { return spAmt(Math.round(n || 0)); } catch (e) { return money(n); } }
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
      /* ---- تقویم شمسی: روز ژولینی، روز هفته (شنبه=۰)، طول ماه ---- */
      function jd(y, m, d) {
        var epbase = y - (y >= 0 ? 474 : 473), epyear = 474 + ((epbase % 2820) + 2820) % 2820;
        return d + (m <= 7 ? (m - 1) * 31 : (m - 1) * 30 + 6) + Math.floor((epyear * 682 - 110) / 2816) + (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 + 1948319.5;
      }
      /* تبدیل دقیق با تقویم شمسیِ خود مرورگر (Intl)؛ فرمول فقط تخمین اولیه است */
      var _pf = null, _gc = {};
      function pOf(dt) {
        if (!_pf) _pf = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
        var o = {}; _pf.formatToParts(dt).forEach(function (x) { if (x.type === 'year' || x.type === 'month' || x.type === 'day') o[x.type] = parseInt(x.value, 10); });
        return o;
      }
      function gDate(y, m, d) {
        var k = y + '-' + m + '-' + d;
        if (k in _gc) return _gc[k];
        var base = (jd(y, m, d) - 2440587.5) * 86400000, hit = null;
        try {
          for (var off = 0; off <= 3 && !hit; off++) {
            [off, -off].forEach(function (o) {
              if (hit) return;
              var dt = new Date(base + o * 86400000), q = pOf(dt);
              if (q.year === y && q.month === m && q.day === d) hit = dt;
            });
          }
        } catch (e) {}
        _gc[k] = hit;
        return hit;
      }
      function weekday(y, m, d) {
        var dt = gDate(y, m, d);
        if (dt) return (dt.getUTCDay() + 1) % 7;   /* شنبه = ۰ */
        var w = ((Math.floor(jd(y, m, d) + 1.5) % 7) + 7) % 7; return (w + 1) % 7;
      }
      function monthLen(y, m) { if (m <= 6) return 31; if (m <= 11) return 30; return gDate(y, 12, 30) ? 30 : 29; }
      /* ---- جمع‌آوری ردیف‌ها ---- */
      function monthData(y, m) {
        if (y === currentYear && m === currentMonth) return periodData;
        return (typeof archive !== 'undefined' && archive) ? archive[periodKey(y, m)] : null;
      }
      function allMonths() {
        var set = {}, out = [];
        try { Object.keys(archive || {}).forEach(function (k) { if (/^\d+-\d+$/.test(k)) set[k] = 1; }); } catch (e) {}
        set[periodKey(currentYear, currentMonth)] = 1;
        Object.keys(set).forEach(function (k) { var p = k.split('-'); out.push({ y: +p[0], m: +p[1] }); });
        return out.sort(function (a, b) { return a.y - b.y || a.m - b.m; });
      }
      function rowsOf(y, m) {
        var pd = monthData(y, m), out = [];
        if (!pd) return out;
        ['income', 'expense'].forEach(function (kind) {
          ((pd[kind] && pd[kind].sections) || []).forEach(function (sec) {
            var title = ((sec && sec.title) || '').trim();
            ((sec && sec.rows) || []).forEach(function (r) {
              if (!r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (kind === 'expense' && isPreAppPlanRow(r, y, m)) return;
              var t = sectionPaidUnpaidTotal({ rows: [r] }, kind === 'income' ? { personalIncomeOnly: true } : { personalExpenseOnly: true });
              if (!t.total) return;
              var d = parseInt(toEnglishDigits(String(r.day || '')), 10);
              out.push({ y: y, m: m, d: (d >= 1 && d <= 31) ? d : 0, kind: kind, paid: t.paid, unpaid: t.unpaid, desc: (r.desc || '').trim(), title: title, row: r });
            });
          });
        });
        return out;
      }
      /* ماهِ «فعال» = ماهی که گذشته (نه آینده) و کاربر در آن دست‌کم یک ثبتِ واقعی (غیر از قسطِ خودکار) دارد.
         در آمار ماهانه/سالانه فقط ماه‌های فعال جمع زده می‌شوند تا اقساطِ خودکارِ آینده یا ماه‌های بی‌استفاده عدد را باد نکنند. */
      var _actCache = null;
      function monthActive(y, m) {
        var t = getTodayPersian();
        if (y > t.y || (y === t.y && m > t.m)) return false;
        var k = y + '-' + m;
        if (!_actCache) _actCache = {};
        if (k in _actCache) return _actCache[k];
        var pd = monthData(y, m), on = false;
        if (pd) ['income', 'expense'].forEach(function (kind) {
          ((pd[kind] && pd[kind].sections) || []).forEach(function (sec) {
            ((sec && sec.rows) || []).forEach(function (r) {
              if (on || !r || r.deletedAt || !(Number(r.amount) > 0)) return;
              if (kind === 'income' || r.fromPlanId == null) on = true;
            });
          });
        });
        if (y === t.y && m === t.m) on = true;
        _actCache[k] = on;
        return on;
      }
      var _skipped = 0;
      function filtered(list) {
        return list.filter(function (x) {
          if (st.card && x.title !== st.card) return false;
          if (st.type !== 'both' && x.kind !== st.type) return false;
          return true;
        });
      }
      function amt(x) { return st.status === 'paid' ? x.paid : st.status === 'unpaid' ? x.unpaid : x.paid + x.unpaid; }
      function cards() {
        var set = {};
        try { allPersonTitles().forEach(function (t) { set[t] = 1; }); } catch (e) {}
        return Object.keys(set);
      }
      /* ---- سطل‌های زمانی برای هر حالت ---- */
      function buckets() {
        var b = [], rows = [];
        _actCache = null; _skipped = 0;
        var skip = function (list) { list.forEach(function (x) { _skipped += amt(x) * (x.kind === 'expense' ? 1 : 0); }); return []; };
        if (st.mode === 'daily') {
          var n = monthLen(st.y, st.m);
          for (var d = 1; d <= n; d++) b.push({ label: fa(d), full: fa(d) + ' ' + MONTHS[st.m - 1], inc: 0, exp: 0 });
          rows = filtered(rowsOf(st.y, st.m));
          rows.forEach(function (x) { var i = (x.d || 1) - 1; if (b[i]) b[i][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
        } else if (st.mode === 'weekly') {
          /* هفته‌های ماه انتخابی (شنبه تا جمعه) */
          var n2 = monthLen(st.y, st.m), wk = -1, map = [];
          for (var d2 = 1; d2 <= n2; d2++) {
            if (d2 === 1 || weekday(st.y, st.m, d2) === 0) { wk++; b.push({ label: 'هفته ' + fa(wk + 1), full: '', from: d2, to: d2, inc: 0, exp: 0 }); }
            b[wk].to = d2; map[d2] = wk;
          }
          b.forEach(function (x) { x.full = 'هفتهٔ ' + fa(b.indexOf(x) + 1) + ' (' + fa(x.from) + ' تا ' + fa(x.to) + ' ' + MONTHS[st.m - 1] + ')'; });
          rows = filtered(rowsOf(st.y, st.m));
          rows.forEach(function (x) { var i = map[x.d || 1]; if (b[i]) b[i][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
        } else if (st.mode === 'monthly') {
          for (var m = 1; m <= 12; m++) {
            b.push({ label: MONTHS[m - 1].slice(0, 3), full: MONTHS[m - 1] + ' ' + fa(st.y), inc: 0, exp: 0 });
            var rm = filtered(rowsOf(st.y, m));
            if (!monthActive(st.y, m)) { b[m - 1].off = 1; rm = skip(rm); }
            rm.forEach(function (x) { b[m - 1][x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
            rows = rows.concat(rm);
          }
        } else {
          var years = {};
          allMonths().forEach(function (p) { years[p.y] = 1; });
          Object.keys(years).map(Number).sort().forEach(function (y) {
            var it = { label: fa(y), full: 'سال ' + fa(y), inc: 0, exp: 0 };
            for (var m2 = 1; m2 <= 12; m2++) {
              var ry = filtered(rowsOf(y, m2));
              if (!monthActive(y, m2)) ry = skip(ry);
              ry.forEach(function (x) { it[x.kind === 'income' ? 'inc' : 'exp'] += amt(x); });
              rows = rows.concat(ry);
            }
            b.push(it);
          });
        }
        return { b: b, rows: rows };
      }
      /* ---- نمودارها (SVG ساده و سبک) ---- */
      function tipShow(wrap, html, x) {
        var tip = wrap.querySelector('.st-tip');
        tip.innerHTML = html;
        tip.style.display = 'block';
        var w = wrap.clientWidth, tw = tip.offsetWidth;
        tip.style.left = Math.max(4, Math.min(w - tw - 4, x - tw / 2)) + 'px';
      }
      function tipHide(wrap) { var t = wrap.querySelector('.st-tip'); if (t) t.style.display = 'none'; }
      /* لمس بیرون از نمودار = بستن جزئیات همهٔ نمودارها */
      function clearPins(except) {
        document.querySelectorAll('#statsBody .st-chart').forEach(function (w) {
          if (w === except) return;
          tipHide(w);
          w.querySelectorAll('.st-hit.on').forEach(function (h) { h.classList.remove('on'); });
          var c = w.querySelector('.st-cross'), m = w.querySelector('.st-mark');
          if (c) c.style.display = 'none'; if (m) m.style.display = 'none';
        });
      }
      document.addEventListener('pointerdown', function (e) {
        if (!e.target.closest) return;
        var sh = document.getElementById('statsSheet');
        if (!sh || !sh.classList.contains('open')) return;
        /* لمس بیرون از برش‌ها/راهنمای دایرهٔ دسته‌بندی = همهٔ دسته‌ها دوباره رنگی */
        if (!e.target.closest('#statsBody .st-slice, #statsBody .st-leg')) {
          document.querySelectorAll('#statsBody .st-slice.dim').forEach(function (x) { x.classList.remove('dim'); });
          document.querySelectorAll('#statsBody .st-leg.on').forEach(function (x) { x.classList.remove('on'); });
        }
        if (e.target.closest('#statsBody .st-chart')) return;
        clearPins(null);
      }, true);
      function niceMax(v) {
        if (v <= 0) return 1;
        var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
        return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
      }
      function topRound(x, y, w, h, r) {
        if (h <= 0) return '';
        r = Math.min(r, w / 2, h);
        return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
      }
      /* ستونی گروهی: درآمد/خرج در هر سطل؛ محور زمان راست‌به‌چپ */
      function barChart(wrap, b, showInc, showExp) {
        var W = Math.max(260, wrap.clientWidth), H = 190, padT = 10, padB = 24, padR = 4, padL = 44;
        var mx = 0;
        b.forEach(function (x) { if (showInc) mx = Math.max(mx, x.inc); if (showExp) mx = Math.max(mx, x.exp); });
        var top = niceMax(mx), plotW = W - padL - padR, plotH = H - padT - padB;
        var n = b.length, slot = plotW / n, groups = (showInc ? 1 : 0) + (showExp ? 1 : 0);
        var bw = Math.max(3, Math.min(12, (slot - 4) / groups - 3));
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">';
        for (var g = 0; g <= 3; g++) {
          var gy = padT + plotH - plotH * g / 3;
          svg += '<line class="st-grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"/>';
          svg += '<text class="st-ax" x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + (g ? esc(short(top * g / 3)) : '۰') + '</text>';
        }
        var step = n > 16 ? Math.ceil(n / 8) : 1;
        b.forEach(function (x, i) {
          var cx = W - padR - slot * (i + 0.5);   /* RTL: اولین سطل سمت راست */
          var x0 = cx - (groups * bw + (groups - 1) * 3) / 2, k = 0;
          svg += '<rect class="st-hit" data-i="' + i + '" x="' + (cx - slot / 2) + '" y="' + padT + '" width="' + slot + '" height="' + plotH + '"/>';
          /* لوله: شیار تیرهٔ تمام‌قد + پرشدن از پایین با انیمیشن (مثل لوله‌های باکس هوشمند) */
          var tube = function (tx, v, c) {
            var h = v > 0 ? Math.max(bw, plotH * v / top) : 0, rr = (bw / 2).toFixed(2);
            var o = '<rect class="st-trk" x="' + tx.toFixed(2) + '" y="' + padT + '" width="' + bw.toFixed(2) + '" height="' + plotH + '" rx="' + rr + '"/>';
            if (h > 0) o += '<rect class="st-tf ' + c + '" style="animation-delay:' + Math.min(600, i * 35) + 'ms" x="' + tx.toFixed(2) + '" y="' + (padT + plotH - h).toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="' + rr + '"/>';
            return o;
          };
          if (showInc) { svg += tube(x0, x.inc, 'st-inc'); k++; }
          if (showExp) { svg += tube(x0 + k * (bw + 3), x.exp, 'st-exp'); }
          if (i % step === 0) svg += '<text class="st-ax" x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(x.label) + '</text>';
        });
        svg += '<line class="st-base" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '"/></svg>';
        wrap.innerHTML = svg + '<div class="st-tip"></div>';
        var svgEl = wrap.querySelector('svg');
        function at(ev) {
          var r = svgEl.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
          var i = Math.floor((W - padR - px) / slot);
          if (i < 0 || i >= n) { tipHide(wrap); return; }
          var x = b[i];
          wrap.querySelectorAll('.st-hit').forEach(function (h) { h.classList.toggle('on', +h.getAttribute('data-i') === i); });
          tipShow(wrap, '<b>' + esc(x.full || x.label) + '</b>' + (showInc ? '<div><i class="st-dot inc"></i>درآمد: ' + money(x.inc) + '</div>' : '') + (showExp ? '<div><i class="st-dot exp"></i>مخارج: ' + money(x.exp) + '</div>' : ''), (W - padR - slot * (i + 0.5)) * r.width / W);
        }
        /* یک لمس = نمایش و ماندن جزئیات؛ لمس جای دیگر = بسته شدن (بدون لانگ‌پرس و بدون پرش) */
        svgEl.addEventListener('click', function (ev) { clearPins(wrap); at(ev); });
      }
      /* خطی: روند مانده (تجمعی درآمد − خرج) */
      function lineChart(wrap, b) {
        var W = Math.max(260, wrap.clientWidth), H = 160, padT = 12, padB = 22, padR = 8, padL = 44;
        var acc = 0, pts = b.map(function (x) { acc += x.inc - x.exp; return acc; });
        var lo = Math.min(0, Math.min.apply(null, pts)), hi = Math.max(0, Math.max.apply(null, pts));
        if (hi === lo) hi = lo + 1;
        var plotW = W - padL - padR, plotH = H - padT - padB, n = b.length;
        var X = function (i) { return n === 1 ? W - padR - plotW / 2 : W - padR - plotW * i / (n - 1); };
        var Y = function (v) { return padT + plotH * (hi - v) / (hi - lo); };
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">';
        [hi, (hi + lo) / 2, lo].forEach(function (v) {
          svg += '<line class="st-grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
          svg += '<text class="st-ax" x="' + (padL - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + esc(v < 0 ? '−' + short(-v) : short(v)) + '</text>';
        });
        if (lo < 0) svg += '<line class="st-zero" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
        var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
        svg += '<path class="st-area" d="' + d + 'L' + X(n - 1).toFixed(1) + ' ' + Y(Math.max(lo, 0)) + 'L' + X(0).toFixed(1) + ' ' + Y(Math.max(lo, 0)) + 'Z"/>';
        svg += '<path class="st-line" pathLength="1" d="' + d + '"/>';
        var step = n > 16 ? Math.ceil(n / 8) : 1;
        b.forEach(function (x, i) { if (i % step === 0) svg += '<text class="st-ax" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(x.label) + '</text>'; });
        svg += '<line class="st-cross" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + plotH) + '" style="display:none"/><circle class="st-mark" r="4.5" style="display:none"/></svg>';
        wrap.innerHTML = svg + '<div class="st-tip"></div>';
        var svgEl = wrap.querySelector('svg'), cross = svgEl.querySelector('.st-cross'), mark = svgEl.querySelector('.st-mark');
        function at(ev) {
          var r = svgEl.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
          var i = n === 1 ? 0 : Math.round((W - padR - px) / plotW * (n - 1));
          i = Math.max(0, Math.min(n - 1, i));
          cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.style.display = '';
          mark.setAttribute('cx', X(i)); mark.setAttribute('cy', Y(pts[i])); mark.style.display = '';
          var v = pts[i];
          tipShow(wrap, '<b>' + esc(b[i].full || b[i].label) + '</b><div>مانده تا این‌جا: <span class="' + (v < 0 ? 'neg' : 'pos') + '">' + (v < 0 ? '−' : '') + money(Math.abs(v)) + '</span></div>', X(i) * r.width / W);
        }
        svgEl.addEventListener('click', function (ev) { clearPins(wrap); at(ev); });
      }
      /* دایره‌ای (دونات) با راهنما؛ حداکثر ۷ دسته + «سایر» */
      function donut(wrap, items, total, centerLabel) {
        var pal = isLight() ? CAT_LIGHT : CAT_DARK;
        var list = items.slice(0, 7), rest = items.slice(7).reduce(function (s, x) { return s + x.amount; }, 0);
        if (rest > 0) list.push({ label: 'سایر', amount: rest, other: true });
        var R = 64, r0 = 42, C = 80, a = -Math.PI / 2, svg = '<svg viewBox="0 0 160 160" width="160" height="160">';
        list.forEach(function (x, i) {
          var frac = x.amount / total, a2 = a + frac * Math.PI * 2;
          var large = frac > 0.5 ? 1 : 0, col = x.other ? 'var(--st-other)' : pal[i];
          x.color = col;
          if (frac >= 0.9999) {
            svg += '<circle class="st-slice" data-i="' + i + '" cx="' + C + '" cy="' + C + '" r="' + ((R + r0) / 2) + '" fill="none" stroke="' + col + '" stroke-width="' + (R - r0) + '"/>';
          } else {
            var p = function (rad, ang) { return (C + rad * Math.cos(ang)).toFixed(2) + ' ' + (C + rad * Math.sin(ang)).toFixed(2); };
            svg += '<path class="st-slice" data-i="' + i + '" fill="' + col + '" d="M' + p(R, a) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(R, a2) + 'L' + p(r0, a2) + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a) + 'Z"/>';
          }
          a = a2;
        });
        svg += '<text class="st-dc1" x="80" y="76" text-anchor="middle">' + esc(short(total)) + '</text><text class="st-dc2" x="80" y="94" text-anchor="middle">' + esc(centerLabel) + '</text></svg>';
        var leg = '<div class="st-legend">' + list.map(function (x, i) {
          return '<div class="st-leg" data-i="' + i + '"><i style="background:' + x.color + '"></i><span class="st-leg-l">' + esc(x.label) + '</span><span class="st-leg-p">' + fa(Math.round(x.amount / total * 100)) + '٪</span><span class="st-leg-v">' + esc(short(x.amount)) + '</span></div>';
        }).join('') + '</div>';
        wrap.innerHTML = '<div class="st-donut">' + svg + '</div>' + leg;
        function pick(i) {
          wrap.querySelectorAll('.st-slice').forEach(function (s) { s.classList.toggle('dim', i >= 0 && +s.getAttribute('data-i') !== i); });
          wrap.querySelectorAll('.st-leg').forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-i') === i); });
        }
        wrap.querySelectorAll('.st-slice, .st-leg').forEach(function (el) {
          el.addEventListener('click', function () { var i = +el.getAttribute('data-i'); pick(el.classList.contains('on') ? -1 : i); });
        });
      }
      /* افقی: فهرست مقایسه‌ای (کارت‌ها / روزهای هفته / بیشترین خرج‌ها) */
      function hbars(wrap, list, cls) {
        var mx = list.reduce(function (s, x) { return Math.max(s, x.amount); }, 0) || 1;
        wrap.innerHTML = list.map(function (x, k) {
          return '<div class="st-hb"><div class="st-hb-row"><span class="st-hb-l">' + esc(x.label) + '</span><span class="st-hb-v">' + money(x.amount) + '</span></div>' +
            '<div class="st-hb-bar st-tube"><i class="' + (x.cls || cls || 'exp') + '" style="animation-delay:' + Math.min(700, k * 90) + 'ms;width:' + Math.max(x.amount > 0 ? 2 : 0, x.amount / mx * 100).toFixed(1) + '%"></i></div></div>';
        }).join('') || '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
      }
      /* ---- ساخت صفحه ---- */
      function card(title, sub, body) {
        return '<section class="st-card"><div class="st-card-h"><span>' + title + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + body + '</section>';
      }
      /* منوی کشویی با استایل خود نرم‌افزار (نه انتخابگر اندروید) */
      var DD = {};
      function dd(field, opts) {
        DD[field] = opts;
        var cur = opts.filter(function (o) { return o[0] === st[field]; })[0] || opts[0];
        return '<button type="button" class="st-dd" data-dd="' + field + '"><span>' + esc(cur[1]) + '</span><i class="st-chev"></i></button>';
      }
      function closeDd() { var l = document.getElementById('stDdList'); if (l) l.remove(); }
      function openDd(btn) {
        var field = btn.getAttribute('data-dd'), opts = DD[field] || [];
        var was = document.getElementById('stDdList');
        closeDd();
        if (was && was._f === field) return;
        var sh = document.getElementById('statsSheet'), r = btn.getBoundingClientRect(), sr = sh.getBoundingClientRect();
        var l = document.createElement('div');
        l.id = 'stDdList'; l.className = 'st-dd-list'; l._f = field;
        l.innerHTML = opts.map(function (o) { return '<button type="button" class="st-dd-opt' + (o[0] === st[field] ? ' on' : '') + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('');
        l.style.top = (r.bottom - sr.top + 6) + 'px';
        l.style.right = (sr.right - r.right) + 'px';
        l.style.minWidth = r.width + 'px';
        sh.appendChild(l);
        l.querySelectorAll('.st-dd-opt').forEach(function (o) {
          o.onclick = function () { st[field] = o.getAttribute('data-v'); closeDd(); render(); };
        });
      }
      document.addEventListener('pointerdown', function (e) {
        if (!e.target.closest) return;
        if (e.target.closest('#stDdList') || e.target.closest('.st-dd')) return;
        closeDd();
      }, true);
      function periodLabel() {
        if (st.mode === 'daily' || st.mode === 'weekly') return MONTHS[st.m - 1] + ' ' + fa(st.y);
        if (st.mode === 'monthly') return 'سال ' + fa(st.y);
        return 'همهٔ سال‌ها';
      }
      /* مقایسه با دورهٔ قبل: روزانه/هفتگی → ماه قبل، ماهانه → سال قبل، سالانه → سال آخر در برابر سال پیش از آن */
      function sumRows(list) { var o = { inc: 0, exp: 0 }; list.forEach(function (x) { o[x.kind === 'income' ? 'inc' : 'exp'] += amt(x); }); return o; }
      function yearRows(y) { var r = []; for (var m = 1; m <= 12; m++) if (monthActive(y, m)) r = r.concat(filtered(rowsOf(y, m))); return r; }
      function comparePrev() {
        var cur, prev, prevLabel;
        if (st.mode === 'daily' || st.mode === 'weekly') {
          var py = st.y, pm = st.m - 1; if (pm < 1) { pm = 12; py--; }
          cur = sumRows(filtered(rowsOf(st.y, st.m))); prev = sumRows(filtered(rowsOf(py, pm)));
          prevLabel = MONTHS[pm - 1] + ' ' + fa(py);
        } else if (st.mode === 'monthly') {
          cur = sumRows(yearRows(st.y)); prev = sumRows(yearRows(st.y - 1)); prevLabel = 'سال ' + fa(st.y - 1);
        } else {
          var ys = {}; allMonths().forEach(function (p) { ys[p.y] = 1; });
          var arr = Object.keys(ys).map(Number).sort();
          if (arr.length < 2) return null;
          var a = arr[arr.length - 1], b0 = arr[arr.length - 2];
          cur = sumRows(yearRows(a)); prev = sumRows(yearRows(b0)); prevLabel = 'سال ' + fa(b0);
        }
        return { cur: cur, prev: prev, prevLabel: prevLabel };
      }
      function compareChart(wrap, c, showInc, showExp) {
        var items = [];
        if (showInc) items.push({ label: 'درآمد', a: c.cur.inc, b: c.prev.inc, cls: 'inc', goodUp: true });
        if (showExp) items.push({ label: 'مخارج', a: c.cur.exp, b: c.prev.exp, cls: 'exp', goodUp: false });
        if (showInc && showExp) items.push({ label: 'مانده', a: c.cur.inc - c.cur.exp, b: c.prev.inc - c.prev.exp, cls: 'bal', goodUp: true });
        var mx = 1; items.forEach(function (x) { mx = Math.max(mx, Math.abs(x.a), Math.abs(x.b)); });
        wrap.innerHTML = items.map(function (x, k) {
          var d = x.b ? Math.round((x.a - x.b) / Math.abs(x.b) * 100) : (x.a ? 100 : 0);
          var up = x.a > x.b, good = x.a === x.b ? null : (up === x.goodUp);
          var badge = x.a === x.b ? '<span class="st-cmp-d">بدون تغییر</span>' :
            '<span class="st-cmp-d ' + (good ? 'good' : 'bad') + '">' + (up ? '▲ ' : '▼ ') + fa(Math.abs(d)) + '٪</span>';
          var w = function (v) { return Math.max(v ? 2 : 0, Math.abs(v) / mx * 100).toFixed(1); };
          var sg = function (v) { return (v < 0 ? '−' : '') + money(Math.abs(v)); };
          return '<div class="st-cmp"><div class="st-hb-row"><span class="st-hb-l">' + x.label + '</span>' + badge + '</div>' +
            '<div class="st-cmp-l"><small>این دوره</small><div class="st-hb-bar st-tube"><i class="' + (x.cls === 'bal' ? (x.a < 0 ? 'exp' : 'inc') : x.cls) + '" style="animation-delay:' + (k * 120) + 'ms;width:' + w(x.a) + '%"></i></div><b>' + sg(x.a) + '</b></div>' +
            '<div class="st-cmp-l prev"><small>قبل</small><div class="st-hb-bar st-tube"><i class="prev" style="animation-delay:' + (k * 120 + 60) + 'ms;width:' + w(x.b) + '%"></i></div><b>' + sg(x.b) + '</b></div></div>';
        }).join('');
      }
      function render() {
        var root = document.getElementById('statsBody');
        if (!root) return;
        var R = buckets(), b = R.b, rows = R.rows;
        var showInc = st.type !== 'expense', showExp = st.type !== 'income';
        var inc = 0, exp = 0;
        b.forEach(function (x) { inc += x.inc; exp += x.exp; });
        var cs = cards();
        var nav = st.mode === 'yearly' ? '<span class="st-nav-l">' + periodLabel() + '</span>' :
          '<button type="button" class="st-nav-b" data-nav="-1" aria-label="قبلی">›</button><span class="st-nav-l">' + periodLabel() + '</span><button type="button" class="st-nav-b" data-nav="1" aria-label="بعدی">‹</button>';
        var html = '<div class="st-filters">' +
          '<div class="st-seg" role="tablist">' + [['daily', 'روزانه'], ['weekly', 'هفتگی'], ['monthly', 'ماهانه'], ['yearly', 'سالانه']].map(function (o) {
            return '<button type="button" data-mode="' + o[0] + '" class="' + (st.mode === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="st-row2">' +
            (cs.length > 1 ? dd('card', cs.map(function (t) { return [t, t]; }).concat([['', 'همهٔ کارت‌ها']])) : '') +
            dd('type', [['both', 'درآمد و مخارج'], ['income', 'فقط درآمد'], ['expense', 'فقط مخارج']]) +
            dd('status', [['all', 'همهٔ وضعیت‌ها'], ['paid', 'پرداخت‌شده'], ['unpaid', 'پرداخت‌نشده']]) +
          '</div>' +
          '<div class="st-nav">' + nav + '</div></div>';
        /* کاشی‌های خلاصه */
        var days = st.mode === 'daily' || st.mode === 'weekly' ? monthLen(st.y, st.m) : 0;
        var tiles = [];
        if (showInc) tiles.push(['درآمد کل', money(inc), 'pos']);
        if (showExp) tiles.push(['خرج کل', money(exp), 'neg']);
        if (showInc && showExp) tiles.push(['مانده کل', (inc - exp < 0 ? '−' : '') + money(Math.abs(inc - exp)), inc - exp < 0 ? 'neg' : 'pos']);
        if (showExp && days) tiles.push(['میانگین خرج روزانه', money(exp / days), '']);
        if (showExp && st.mode === 'monthly') tiles.push(['میانگین خرج ماهانه', money(exp / Math.max(1, b.filter(function (x) { return !x.off && (x.exp > 0 || x.inc > 0); }).length)), '']);
        html += '<div class="st-tiles">' + tiles.map(function (t) { return '<div class="st-tile"><small>' + t[0] + '</small><b class="' + t[2] + '">' + t[1] + '</b></div>'; }).join('') + '</div>';
        if (_skipped > 0 && showExp && (st.mode === 'monthly' || st.mode === 'yearly')) html += '<div class="st-skip-note">' + money(_skipped) + ' اقساطِ خودکارِ ماه‌های آینده یا ماه‌هایی که در آن‌ها ثبتی نداشته‌اید، در این جمع‌ها حساب نشده است.</div>';
        var any = inc > 0 || exp > 0;
        var legend = '<div class="st-keys">' + (showInc ? '<span><i class="st-dot inc"></i>درآمد</span>' : '') + (showExp ? '<span><i class="st-dot exp"></i>مخارج</span>' : '') + '</div>';
        var titles = { daily: 'روزهای ماه', weekly: 'هفته‌های ماه', monthly: 'ماه‌های سال', yearly: 'سال‌ها' };
        html += card(showInc && showExp ? 'درآمد و مخارج — ' + titles[st.mode] : (showInc ? 'درآمد' : 'مخارج') + ' — ' + titles[st.mode], 'برای جزئیات روی ستون بزنید', (showInc && showExp ? legend : '') + '<div class="st-chart" id="stBar"></div>');
        var cmp = comparePrev();
        if (cmp) html += card('مقایسه با ' + cmp.prevLabel, periodLabel() + ' در برابر ' + cmp.prevLabel, '<div id="stCmp"></div>');
        if (showExp) html += card('دسته‌بندی مخارج', periodLabel(), '<div id="stCats"></div>');
        if (showExp && st.mode !== 'yearly') html += card('خرج بر اساس روز هفته', 'کدام روزها بیشتر خرج می‌کنید', '<div id="stWeek"></div>');
        if (showExp) html += card('وضعیت پرداخت مخارج', '', '<div id="stPay"></div>');
        if (!st.card && cs.length > 1) html += card('مقایسهٔ کارت‌ها', showExp ? 'خرج هر کارت' : 'درآمد هر کارت', '<div id="stCards"></div>');
        html += card(showExp ? 'بیشترین خرج‌ها' : 'بیشترین درآمدها', periodLabel(), '<div id="stTop"></div>');
        root.innerHTML = html + (any ? '' : '<div class="st-empty big">برای این بازه ثبتی وجود ندارد</div>');
        /* نمودارها پس از قرارگیری در صفحه (عرض واقعی) */
        try { barChart(document.getElementById('stBar'), b, showInc, showExp); } catch (e1) {}
        try { if (cmp && document.getElementById('stCmp')) compareChart(document.getElementById('stCmp'), cmp, showInc, showExp); } catch (e2) {}
        var expRows = rows.filter(function (x) { return x.kind === 'expense'; });
        if (document.getElementById('stCats')) {
          var cm = {}, tot = 0;
          expRows.forEach(function (x) {
            var a = amt(x); if (!a) return; tot += a;
            var c = null; try { c = HKCategorizer.classify(x.desc, x.row); } catch (e) {}
            if (!c) { cm['نامشخص'] = (cm['نامشخص'] || 0) + a; return; }
            c.ids.forEach(function (id) { var l = HKCategorizer.byId[id].label; cm[l] = (cm[l] || 0) + a / c.ids.length; });
          });
          var cl = Object.keys(cm).map(function (k) { return { label: k, amount: cm[k] }; }).sort(function (p, q) { return q.amount - p.amount; });
          var un = cl.filter(function (x) { return x.label === 'نامشخص'; });
          cl = cl.filter(function (x) { return x.label !== 'نامشخص'; }).concat(un);
          var el = document.getElementById('stCats');
          if (tot > 0) donut(el, cl, tot, 'جمع مخارج'); else el.innerHTML = '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
        }
        if (document.getElementById('stWeek')) {
          var wd = [0, 0, 0, 0, 0, 0, 0];
          expRows.forEach(function (x) { if (x.d) wd[weekday(x.y, x.m, x.d)] += amt(x); });
          hbars(document.getElementById('stWeek'), WEEKDAYS.map(function (n, i) { return { label: n, amount: wd[i] }; }), 'exp');
        }
        if (document.getElementById('stPay')) {
          var pp = 0, uu = 0;
          expRows.forEach(function (x) { if (st.status !== 'unpaid') pp += x.paid; if (st.status !== 'paid') uu += x.unpaid; });
          var tt = pp + uu;
          document.getElementById('stPay').innerHTML = tt > 0 ?
            '<div class="st-stack"><i class="paid" style="width:' + (pp / tt * 100).toFixed(1) + '%"></i><i class="unpaid" style="width:' + (uu / tt * 100).toFixed(1) + '%"></i></div>' +
            '<div class="st-keys"><span><i class="st-dot paid"></i>پرداخت‌شده ' + fa(Math.round(pp / tt * 100)) + '٪ — ' + money(pp) + '</span><span><i class="st-dot unpaid"></i>پرداخت‌نشده ' + fa(Math.round(uu / tt * 100)) + '٪ — ' + money(uu) + '</span></div>'
            : '<div class="st-empty">داده‌ای برای نمایش نیست</div>';
        }
        if (document.getElementById('stCards')) {
          var kind = showExp ? 'expense' : 'income', byc = {};
          rows.forEach(function (x) { if (x.kind === kind) byc[x.title] = (byc[x.title] || 0) + amt(x); });
          hbars(document.getElementById('stCards'), cs.map(function (t) { return { label: t, amount: byc[t] || 0 }; }).sort(function (p, q) { return q.amount - p.amount; }), kind === 'expense' ? 'exp' : 'inc');
        }
        var kindT = showExp ? 'expense' : 'income';
        var top = rows.filter(function (x) { return x.kind === kindT && amt(x) > 0; }).sort(function (p, q) { return amt(q) - amt(p); }).slice(0, 6);
        hbars(document.getElementById('stTop'), top.map(function (x) {
          return { label: (x.desc || 'بدون شرح') + '، ' + (x.d ? fa(x.d) + ' ' : '') + MONTHS[x.m - 1], amount: amt(x) };
        }), kindT === 'expense' ? 'exp' : 'inc');
        bind(root);
      }
      function bind(root) {
        root.querySelectorAll('[data-mode]').forEach(function (bt) { bt.onclick = function () { st.mode = bt.getAttribute('data-mode'); render(); }; });
        root.querySelectorAll('.st-dd').forEach(function (b) { b.onclick = function () { openDd(b); }; });
        root.querySelectorAll('[data-nav]').forEach(function (bt) {
          bt.onclick = function () {
            var dir = +bt.getAttribute('data-nav');
            if (st.mode === 'monthly') st.y += dir;
            else { st.m += dir; if (st.m > 12) { st.m = 1; st.y++; } if (st.m < 1) { st.m = 12; st.y--; } }
            render();
          };
        });
      }
      /* ۱.۳.۴۸: opts = { mode, card, focus } — از باکس هوشمند مستقیم روی تب و بخش مرتبط باز می‌شود */
      function open(opts) {
        opts = opts || {};
        try { closeSideMenu(); } catch (e) {}
        try { persistCurrent(); } catch (e0) {}
        st.y = currentYear; st.m = currentMonth;
        /* پیش‌فرض: کارت اول (گزینهٔ «همهٔ کارت‌ها» آخر فهرست است) */
        var cs0 = cards(); st.card = cs0[0] || '';
        if (opts.card && cs0.indexOf(opts.card) >= 0) st.card = opts.card;
        if (opts.mode) st.mode = opts.mode;
        var sh = document.getElementById('statsSheet');
        if (!sh) return;
        sh.classList.add('open');
        sh.setAttribute('aria-hidden', 'false');
        try { lockBodyScroll(); } catch (e1) {}
        /* هر بار باز شدن: از بالای صفحه (فیلترهای روزانه/هفتگی/...) شروع شود */
        var body0 = document.getElementById('statsBody');
        if (body0) body0.scrollTop = 0;
        requestAnimationFrame(function () {
          render(); var b1 = document.getElementById('statsBody');
          if (b1) { b1.scrollTop = 0; requestAnimationFrame(function () { b1.scrollTop = 0; }); }
          if (opts.focus) setTimeout(function () {
            var f = document.getElementById(opts.focus), sec = f && f.closest('.st-card');
            if (sec && b1) { try { hkSlowScrollTo(sec, 700); } catch (eF) {} }
          }, 360);
        });
      }
      function close() {
        var sh = document.getElementById('statsSheet');
        if (!sh || !sh.classList.contains('open')) return false;
        closeDd();
        sh.classList.remove('open');
        sh.setAttribute('aria-hidden', 'true');
        try { unlockBodyScroll(); } catch (e) {}
        return true;
      }
      return { open: open, close: close, render: render, _weekday: weekday, _monthLen: monthLen };
    })();
    function openStatsSheet(opts) { setTimeout(function () { HKStats.open(opts && opts.type ? null : opts); }, 40); }

    function closeSideMenu() {
      /* ۱.۳.۸۰: بستن منو جستجویش را همیشه غیرفعال می‌کند (متن پاک، کیبورد بسته، فهرست کامل) */
      try { var _msi = document.getElementById('menuSearchInput'); if (_msi && document.activeElement === _msi) _msi.blur(); hkMenuSearchClear(); } catch (eMs) {}
      /* ۱.۳.۸۲: ویرایش نام کاربر با بسته شدن منو لغو می‌شود تا کیبورد روی صفحهٔ اصلی باز نماند */
      try { var _nm = document.getElementById('menuUserNameText'); if (_nm && _nm.querySelector('input') && typeof _nm._hkCancelEdit === 'function') _nm._hkCancelEdit(); var _ae = document.activeElement; if (_ae && _ae.closest && _ae.closest('#menuDropdown') && _ae.blur) _ae.blur(); } catch (eNe) {}
      try { if (typeof hkToggleProfile === 'function') hkToggleProfile(false); } catch (eTp) {}
      const menu = document.getElementById('menuDropdown');
      const bd = document.getElementById('menuBackdrop');
      if (menu) menu.classList.remove('open');
      if (bd) bd.classList.remove('open');
      document.body.classList.remove('menu-open');
      unbindMenuBlockers();
    }
    function toggleMenu() {
      const menu = document.getElementById('menuDropdown');
      if (!menu) return;
      if (menu.classList.contains('open')) closeSideMenu();
      else openSideMenu();
    }
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('menuDropdown');
      const btn = document.getElementById('menuBtn');
      const bd = document.getElementById('menuBackdrop');
      if (!menu || !btn) return;
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      if (bd && e.target === bd) closeSideMenu();
      else if (!menu.contains(e.target)) closeSideMenu();
    });



    function askResetCurrentMonth() {
      closeSideMenu();
      askConfirm('اطلاعات این ماه حذف شود؟', () => safetyBackupThen('reset-month', () => {
        try {
          // کل ماه جاری به سطل
          var _mName = (MONTHS[currentMonth - 1] || ('ماه ' + currentMonth));
          pushToTrash('period_month', _mName + ' ' + toPersianDigits(currentYear), {
            periodKey: periodKey(currentYear, currentMonth),
            periodData: JSON.parse(JSON.stringify(periodData)),
            year: currentYear,
            month: currentMonth,
            sourceLabel: 'پاک کردن ماه'
          });
        } catch (e) { console.warn(e); }
        /* کارت‌ها (نام، رنگ، ترتیب) می‌مانند و فقط ردیف‌ها پاک می‌شوند؛ نه برگشت به «نام کاربر» */
        var _keep = { income: [], expense: [] }, _ord = periodData.personCardOrder;
        ['income', 'expense'].forEach(function (tab) {
          ((periodData[tab] && periodData[tab].sections) || []).forEach(function (sc) {
            if (sc && (sc.title || '').trim()) _keep[tab].push({ id: sc.id, title: sc.title, color: sc.color, collapsed: false, rows: [emptyRow(tab)] });
          });
        });
        periodData = emptyPeriodData();
        ['income', 'expense'].forEach(function (tab) {
          if (_keep[tab].length && periodData[tab]) { periodData[tab].sections = _keep[tab]; periodData[tab].nextId = Math.max(periodData[tab].nextId || 1, _keep[tab].length + 1); }
        });
        if (Array.isArray(_ord) && _ord.length) periodData.personCardOrder = _ord.slice();
        persistCurrent();
        saveArchive();
        renderAll();
        showToast('این ماه به سطل زباله منتقل شد');
      }));
    }

    function askResetAllData() {
      closeSideMenu();
      askConfirm('تمامی اطلاعات حذف شود؟', () => safetyBackupThen('reset-all', () => {
        try {
          pushToTrash('full_backup', 'کل اطلاعات', {
            sourceLabel: 'پاک کردن همه آرشیو',
            archive: JSON.parse(JSON.stringify(archive || {})),
            plans: JSON.parse(JSON.stringify(plans || [])),
            periodData: JSON.parse(JSON.stringify(periodData || emptyPeriodData())),
            recurringIncomes: JSON.parse(JSON.stringify(recurringIncomes || [])),
            year: currentYear,
            month: currentMonth
          });
        } catch (e) { console.warn(e); }
        archive = {};
        plans = [];
        periodData = emptyPeriodData();
        try { recurringIncomes = []; saveRecurring(); } catch (e) {}
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY + '_meta');
        try { localStorage.removeItem(familyStorageKey(familyCode)); } catch (e) {}
        try { hkMirrorClear(); } catch (eMc) {}
        localStorage.removeItem('hesabKetabArchive_v4');
        localStorage.removeItem('hesabKetabArchive_v3');
        localStorage.removeItem('hesabKetabArchive_v2');
        localStorage.removeItem('hesabKetabArchive_v1');
        renderAll();
        try { renderPlans(); renderRecurringBar(); renderLedgerTab(); } catch (e) {}
        showToast('همه اطلاعات به سطل زباله منتقل شد');
      }));
    }

    /* —— Plans UI —— */
    function openPlanNameSheet(plan, onDone) {
      closeRemindBarIfOpen();
      let sheet = document.getElementById('planNameSheet');
      if (sheet) sheet.remove();
      sheet = document.createElement('div');
      sheet.id = 'planNameSheet';
      sheet.style.cssText = 'position:fixed;left:12px;right:12px;z-index:460;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;box-shadow:0 12px 32px var(--shadow);';
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + Math.max(80, Math.floor((vv ? vv.height : window.innerHeight) * 0.22));
      sheet.style.top = top + 'px';

      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;text-align:center;';
      lab.textContent = 'نام قسط';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = (plan.name || '').trim();
      inp.placeholder = 'نام قسط را وارد کنید';
      inp.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;font-size:1rem;margin-bottom:10px;text-align:center;box-sizing:border-box;';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;margin-top:4px;';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.textContent = 'تأیید';
      ok.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent);color:#fff;font-family:inherit;font-weight:bold;cursor:pointer;';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'انصراف';
      cancel.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-family:inherit;font-weight:bold;cursor:pointer;';

      const close = () => {
        try { sheet.remove(); } catch (e) {}
        document.removeEventListener('mousedown', outside, true);
      };
      const wasNew = !!plan.isNew || !(plan.name || '').trim();
      const save = () => {
        const v = (inp.value || '').trim();
        if (!v) { showToast('نام قسط را وارد کنید'); return; }
        const dup = (plans || []).some(p => p.id !== plan.id && (p.name || '').trim() === v);
        if (dup) { showToast('اسم تکراری است'); return; }
        plan.name = v;
        plan.isNew = false;
        if (typeof onDone === 'function') onDone(v);
        persistCurrent();
        scheduleSave();
        close();
        renderPlans();
        updateInstallSummary();
        checkInstallReminders();
      };
      ok.onclick = save;
      const cancelNew = () => {
        if (wasNew && (!(plan.name || '').trim() || plan.isNew)) {
          plans = plans.filter(x => x.id !== plan.id);
          renderPlans();
          scheduleSave();
        }
        close();
      };
      cancel.onclick = cancelNew;
      const outside = (e) => {
        if (!sheet.contains(e.target)) cancelNew();
      };
      setTimeout(() => document.addEventListener('mousedown', outside, true), 30);
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel.onclick(); }
      };

      actions.appendChild(ok);
      actions.appendChild(cancel);
      sheet.appendChild(lab);
      sheet.appendChild(inp);
      sheet.appendChild(actions);
      document.body.appendChild(sheet);
      setTimeout(() => {
        try { inp.focus(); if (inp.value) caretToEnd(inp); } catch (e) {}
      }, 50);
    }

    function addPlan() {
      closeRemindBarIfOpen();
      const p = emptyPlan();
      const today = getTodayPersian();
      p.grantYear = today.y;
      p.startYear = today.y;
      stampRowOwner(p);
      plans.push(p);
      renderPlans();
      scheduleSave();
      setTimeout(() => openPlanNameSheet(p), 60);
    }

    function deletePlan(id) {
      askConfirm('این قسط به سطل زباله منتقل شود؟', () => {
        const plan = (plans || []).find(p => p && p.id === id);
        if (plan && !canEditRow(plan)) { showToast('فقط ثبت‌کننده می‌تواند حذف کند'); return; }
        if (plan && plan.id && sharedAccountId) {
          plan.deletedAt = Date.now();
          plan.updatedAt = Date.now();
          try {
            enqueueSync('delete_record', {
              id: plan.id,
              kind: 'plan',
              created_by: plan.createdBy || ownerAuthUid(),
              deleted_at: new Date(plan.deletedAt).toISOString(),
              payload: plan
            });
          } catch (e) {}
        }
        try {
          const _p = (plans || []).find(p => p && p.id === id);
          if (_p) pushToTrash('plan', _p.name || 'قسط', Object.assign(JSON.parse(JSON.stringify(_p)), { sourceLabel: 'اقساط' }));
        } catch (e) {}
        plans = (plans || []).filter(p => p.id !== id);
        syncPlansToExpenseAll();
        renderPlans();
        checkInstallReminders();
        scheduleSave();
        if (currentTab === 'expense') renderAll();
        showToast('به سطل زباله منتقل شد');
      });
    }

    function markNextPaid(id) {
      const plan = plans.find(p => p.id === id);
      if (!plan) return;
      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
      if (paid >= count) return;
      plan.paidCount = paid + 1;
      syncPlansToExpenseAll();
      renderPlans();
      checkInstallReminders();
      scheduleSave();
      if (currentTab === 'expense') renderAll();
    }

    function renderPlans() {
      closeDarkSelects();
      document.querySelectorAll('.dark-select-list').forEach(el => {
        if (!el.closest('.top-bar') && !document.getElementById('monthSelectWrap')?.contains(el)) {
          // لیست‌های قدیمی اقساط
        }
      });
      // حذف لیست‌های رها شده (غیر از ماه/سال بالا)
      document.querySelectorAll('body > .dark-select-list').forEach(el => {
        const wraps = document.querySelectorAll('.dark-select');
        let used = false;
        wraps.forEach(w => { if (w._list === el) used = true; });
        if (!used) el.remove();
      });
      const box = document.getElementById('plans-container');
      box.innerHTML = '';
      plans.forEach(plan => box.appendChild(buildPlanCard(plan)));
      updateInstallSummary();
      enableLongPressReorder(box, '.plan-card', (ids) => {
        const map = {};
        plans.forEach(p => { map[p.id] = p; });
        const ordered = ids.map(id => map[id]).filter(Boolean);
        plans.forEach(p => { if (!ids.includes(p.id)) ordered.push(p); });
        plans = ordered;
        updateInstallSummary();
        scheduleSave();
      });
    }

    function buildPlanCard(plan) {
      if (plan.interestRate === undefined || plan.interestRate === null) plan.interestRate = 0;
      // فیلدهای خالی را برای پلن جدید اجباری پر نکن
      if (plan.grantMonth === undefined) plan.grantMonth = '';
      if (plan.grantYear === undefined) plan.grantYear = '';
      if (plan.startMonth === undefined) plan.startMonth = '';
      if (plan.startYear === undefined) plan.startYear = '';
      if (plan.startDay === undefined) plan.startDay = '';
      if (plan.count === undefined) plan.count = '';

      const card = document.createElement('div');
      if (plan.collapsed === undefined) plan.collapsed = false;
      card.className = 'plan-card' + (plan.collapsed ? ' collapsed' : '') + (plan.editing ? ' is-editing' : '');
      try { if (_instFlashPlans[String(plan.id || plan.name || 'p')]) card.classList.add('inst-alert'); } catch (eFA) {}
      card.dataset.planId = plan.id;

      const count = Math.max(0, parseInt(plan.count, 10) || 0);
      const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
      const pct = count ? Math.round((paid / count) * 100) : 0;
      const payAmt = count ? planInstallmentAmount(plan) : 0;

      let nextText = 'تمام شده';
      if (paid < count) {
        const due = dueDateForInstallment(plan, paid);
        nextText = 'قسط بعدی: ' + toPersianDigits(paid + 1) + ' از ' + toPersianDigits(count) +
          ' — ' + toPersianDigits(due.d) + ' ' + MONTHS[due.m - 1] + ' ' + toPersianDigits(due.y) +
          ' — ' + formatNum(payAmt) + ' تومان';
      }

      const top = document.createElement('div');
      top.className = 'plan-top';
      top.style.cursor = 'pointer';

      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      arrow.innerHTML = plan.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';

      const nameDisp = document.createElement('div');
      nameDisp.className = 'plan-name';
      nameDisp.style.cssText = 'border:none;background:transparent;cursor:default;flex:1;min-width:0;';
      nameDisp.textContent = (plan.name || '').trim() || 'نام قسط';
      if (!(plan.name || '').trim()) nameDisp.style.opacity = '0.5';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit-title' + (plan.editing ? ' is-editing' : '');
      editBtn.title = plan.editing ? 'در حال ویرایش' : 'ویرایش قسط';
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        plan.editing = !plan.editing;
        if (plan.editing && plan.collapsed) {
          plan.collapsed = false;
        }
        renderPlans();
        scheduleSave();
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-del-row';
      delBtn.title = 'حذف قسط';
      delBtn.textContent = '×';
      delBtn.onclick = (e) => { e.stopPropagation(); deletePlan(plan.id); };
      const dragHandle = document.createElement('button');
      dragHandle.type = 'button';
      dragHandle.className = 'drag-handle';
      dragHandle.title = 'جابه‌جایی';
      dragHandle.setAttribute('aria-label', 'جابه‌جایی');
      dragHandle.innerHTML = DRAG_HANDLE_SVG;
      dragHandle.onclick = (e) => e.stopPropagation();

      top.appendChild(dragHandle);
      top.appendChild(arrow);
      top.appendChild(nameDisp);
      top.appendChild(editBtn);
      top.appendChild(delBtn);
      top.onclick = (e) => {
        if (card._skipClick || card.classList.contains('dragging')) return;
        if (e.target === delBtn || e.target === editBtn || editBtn.contains(e.target) || delBtn.contains(e.target) || e.target.closest('.drag-handle')) return;
        plan.collapsed = !plan.collapsed;
        hkSlideSet(card, !plan.collapsed, function (o) { card.classList.toggle('collapsed', !o); });
        arrow.innerHTML = plan.collapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
        scheduleSave();
      };
      card.appendChild(top);

      const body = document.createElement('div');
      body.className = 'plan-body';

      const grid = document.createElement('div');
      grid.className = 'plan-grid';

      function field(label, el) {
        const wrap = document.createElement('div');
        wrap.className = 'plan-field';
        const lb = document.createElement('label');
        lb.textContent = label;
        wrap.appendChild(lb);
        wrap.appendChild(el);
        return wrap;
      }

      function refreshProgressOnly() {
        const count2 = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid2 = Math.min(count2, Math.max(0, parseInt(plan.paidCount, 10) || 0));
        const pct2 = count2 ? Math.round((paid2 / count2) * 100) : 0;
        const payAmt2 = planInstallmentAmount(plan);
        let nextText2 = 'تمام شده';
        if (paid2 < count2) {
          const due = dueDateForInstallment(plan, paid2);
          nextText2 = 'قسط بعدی: ' + toPersianDigits(paid2 + 1) + ' از ' + toPersianDigits(count2) +
            ' — ' + toPersianDigits(due.d) + ' ' + MONTHS[due.m - 1] + ' ' + toPersianDigits(due.y) +
            ' — ' + formatNum(payAmt2) + ' تومان';
        }
        const progEl = card.querySelector('.plan-progress');
        if (progEl) {
          progEl.innerHTML = toPersianDigits(paid2) + ' از ' + toPersianDigits(count2) +
            ' قسط پرداخت شده (' + toPersianDigits(pct2) + '٪)' +
            '<div class="bar"><span style="width:' + pct2 + '%"></span></div>';
        }
        const nextEl = card.querySelector('.plan-next');
        if (nextEl) nextEl.textContent = nextText2;
        const payBtn = card.querySelector('.btn-pay');
        if (payBtn) payBtn.disabled = paid2 >= count2;
        const finalEl = card.querySelector('.final-amt');
        if (finalEl) finalEl.value = formatNum(planInstallmentAmount(plan));
        const lastDueEl = card.querySelector('.last-due-date');
        if (lastDueEl) lastDueEl.value = formatPlanLastDue(plan);
        if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
          ensureExpenseSectionThroughPlanEnd(plan);
        }
        syncPlansToExpenseAll();
        updateInstallSummary();
        checkInstallReminders();
        scheduleSave();
      }

      // مبلغ
      const amtInp = document.createElement('input');
      amtInp.className = 'amount-input';
      amtInp.inputMode = 'numeric';
      amtInp.pattern = '[0-9]*';
      amtInp.value = plan.amount ? formatNum(plan.amount) : '';
      amtInp.placeholder = '';
      amtInp.oninput = () => {
        const digits = toEnglishDigits(amtInp.value).replace(/[^0-9]/g, '');
        plan.amount = digits ? parseInt(digits, 10) : 0;
        amtInp.value = plan.amount ? formatNum(plan.amount) : '';
        refreshProgressOnly();
      };
      amtInp.className = (amtInp.className || '') + ' amount-input';
      amtInp.style.textAlign = 'right';
      amtInp.style.direction = 'rtl';
      grid.appendChild(field('مبلغ کل (تومان)', amtInp));

      // سود
      const rateInp = document.createElement('input');
      rateInp.inputMode = 'decimal';
      rateInp.pattern = '[0-9]*';
      rateInp.value = plan.interestRate ? toPersianDigits(String(plan.interestRate)) : '۰';
      rateInp.placeholder = '۰';
      rateInp.oninput = () => {
        let v = toEnglishDigits(rateInp.value).replace(/[^0-9.]/g, '');
        // فقط یک نقطه
        const parts = v.split('.');
        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
        plan.interestRate = v ? parseFloat(v) : 0;
        if (isNaN(plan.interestRate)) plan.interestRate = 0;
        rateInp.value = toPersianDigits(String(plan.interestRate));
        refreshProgressOnly();
      };
      grid.appendChild(field('سود (٪)', rateInp));

      // تعداد
      const countInp = document.createElement('input');
      countInp.inputMode = 'numeric';
      countInp.pattern = '[0-9]*';
      countInp.value = (plan.count !== '' && plan.count != null && Number(plan.count) > 0) ? toPersianDigits(plan.count) : '';
      countInp.placeholder = '۳۶';
      countInp.oninput = () => {
        const digits = toEnglishDigits(countInp.value).replace(/[^0-9]/g, '');
        plan.count = digits ? parseInt(digits, 10) : 0;
        if (plan.paidCount > plan.count) plan.paidCount = plan.count;
        countInp.value = plan.count ? toPersianDigits(plan.count) : '';
        refreshProgressOnly();
      };
      grid.appendChild(field('تعداد اقساط', countInp));

      // روز سررسید
      const dayInp = document.createElement('input');
      dayInp.inputMode = 'numeric';
      dayInp.pattern = '[0-9]*';
      dayInp.maxLength = 2;
      dayInp.value = plan.startDay ? toPersianDigits(plan.startDay) : '';
      dayInp.placeholder = '۱ تا ۳۱';
      dayInp.oninput = () => {
        let v = toEnglishDigits(dayInp.value).replace(/[^0-9]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        let n = v ? parseInt(v, 10) : 0;
        if (n > 31) n = 31;
        plan.startDay = n || 1;
        dayInp.value = v ? toPersianDigits(n > 31 ? 31 : n) : '';
        refreshProgressOnly();
      };
      dayInp.onblur = () => {
        if (!plan.startDay || plan.startDay < 1) plan.startDay = 1;
        dayInp.value = toPersianDigits(plan.startDay);
        refreshProgressOnly();
      };
      grid.appendChild(field('روز سررسید هر ماه', dayInp));

      // ماه شروع
      
      const monthOpts = MONTHS.map((name, i) => ({ value: i + 1, label: name }));
      const yearOpts = [];
      for (let y = YEAR_START; y <= YEAR_END; y++) yearOpts.push({ value: y, label: toPersianDigits(y) });

      const grantMonthSel = createDarkSelect({
        options: monthOpts,
        value: plan.grantMonth || '',
        onChange: (v) => { plan.grantMonth = parseInt(v, 10) || ''; scheduleSave(); }
      });
      grid.appendChild(field('ماه اعطا', grantMonthSel));

      const grantYearSel = createDarkSelect({
        options: yearOpts,
        value: plan.grantYear || '',
        onChange: (v) => { plan.grantYear = parseInt(v, 10) || ''; scheduleSave(); }
      });
      grid.appendChild(field('سال اعطا', grantYearSel));

      const monthSel = createDarkSelect({
        options: monthOpts,
        value: plan.startMonth || '',
        onChange: (v) => { plan.startMonth = parseInt(v, 10) || ''; refreshProgressOnly(); }
      });
      grid.appendChild(field('ماه شروع بازپرداخت', monthSel));

      const yearSel = createDarkSelect({
        options: yearOpts,
        value: plan.startYear || '',
        onChange: (v) => { plan.startYear = parseInt(v, 10) || ''; refreshProgressOnly(); }
      });
      grid.appendChild(field('سال شروع بازپرداخت', yearSel));

      const paidInp = document.createElement('input');
      paidInp.inputMode = 'numeric';
      paidInp.pattern = '[0-9]*';
      paidInp.setAttribute('enterkeyhint', 'done');
      paidInp.value = toPersianDigits(paid);
      paidInp.oninput = () => {
        let n = parseInt(toEnglishDigits(paidInp.value).replace(/[^0-9]/g, '') || '0', 10);
        if (n < 0) n = 0;
        const c = Math.max(0, parseInt(plan.count, 10) || 0);
        if (n > c) n = c;
        plan.paidCount = n;
        /* ویرایش دستی این عدد = اصلاح مرز قسط‌های گذشته (قفل)؛ پرداخت‌هایی که بعداً ثبت می‌شوند مرز را جابه‌جا نمی‌کنند */
        plan.lockedCount = n;
        paidInp.value = toPersianDigits(n);
        try { clampPlanPaymentState(plan); } catch (eC) {}
        refreshProgressOnly();
      };
      paidInp.onblur = () => {
        try { clampPlanPaymentState(plan); } catch (eC2) {}
        try {
          if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
            syncPlansToExpenseAll();
          }
        } catch (eS) {}
        try { updateInstallSummary(); } catch (eU) {}
        try { checkInstallReminders(); } catch (eR) {}
        scheduleSave();
        if (currentTab === 'expense') renderAll();
      };
      paidInp.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          try { paidInp.blur(); } catch (err) {}
          scheduleSave();
        }
      };
      grid.appendChild(field('تعداد قسط پرداخت‌شده', paidInp));

      // مبلغ نهایی با سود (فقط نمایش)
      const finalShow = document.createElement('input');
      finalShow.readOnly = true;
      finalShow.value = formatNum(payAmt);
      finalShow.className = 'amount-input plan-readonly final-amt';
      grid.appendChild(field('مبلغ هر قسط (محاسبه‌شده)', finalShow));

      // افزودن به مخارج — زیر مبلغ هر قسط — «هیچکدام» همیشه آخرین
      const expSecOpts = [];
      (periodData.expense.sections || []).forEach(s => {
        const t = (s.title || '').trim();
        expSecOpts.push({
          value: s.id,
          label: t || ('بخش بدون نام')
        });
      });
      expSecOpts.push({ value: '', label: 'هیچکدام' });
      let linkedVal = plan.expenseSectionId || '';
      if (!linkedVal && (plan.expenseSectionTitle || '').trim()) {
        const found = (periodData.expense.sections || []).find(
          s => (s.title || '').trim() === (plan.expenseSectionTitle || '').trim()
        );
        if (found) linkedVal = found.id;
      }
      // اگر id در لیست فعلی نیست، فقط عنوان فارسی را نشان بده یا هیچکدام
      if (linkedVal && !expSecOpts.some(o => String(o.value) === String(linkedVal))) {
        const byTitle = (periodData.expense.sections || []).find(
          s => (s.title || '').trim() === (plan.expenseSectionTitle || '').trim()
        );
        linkedVal = byTitle ? byTitle.id : '';
        plan.expenseSectionId = linkedVal;
      }
      // تاریخ آخرین سررسید
      const lastDueShow = document.createElement('input');
      lastDueShow.readOnly = true;
      lastDueShow.className = 'plan-readonly last-due-date';
      lastDueShow.value = formatPlanLastDue(plan);
      grid.appendChild(field('تاریخ آخرین سررسید', lastDueShow));

      const expSecSel = createDarkSelect({
        options: expSecOpts,
        value: linkedVal,
        onChange: (v) => {
          const val = (v == null) ? '' : String(v);
          plan.expenseSectionId = val;
          const sec = (periodData.expense.sections || []).find(s => s.id === val);
          plan.expenseSectionTitle = sec ? ((sec.title || '').trim()) : '';
          if (val) ensureExpenseSectionThroughPlanEnd(plan);
          syncPlansToExpenseAll();
          scheduleSave();
          if (currentTab === 'expense') renderAll();
          showToast(val ? 'به مخارج وصل شد' : 'بدون اتصال به مخارج');
        }
      });
      grid.appendChild(field('افزودن به مخارج', expSecSel));

      body.appendChild(grid);

      const prog = document.createElement('div');
      prog.className = 'plan-progress';
      prog.innerHTML = toPersianDigits(paid) + ' از ' + toPersianDigits(count) +
        ' قسط پرداخت شده (' + toPersianDigits(pct) + '٪)' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>';
      body.appendChild(prog);

      const actions = document.createElement('div');
      actions.className = 'plan-actions';
      const next = document.createElement('div');
      next.className = 'plan-next';
      next.textContent = nextText;
      const payBtn = document.createElement('button');
      payBtn.className = 'btn btn-pay';
      payBtn.textContent = 'ثبت پرداخت قسط بعدی';
      payBtn.disabled = paid >= count;
      payBtn.onclick = () => markNextPaid(plan.id);
      actions.appendChild(next);
      actions.appendChild(payBtn);
      body.appendChild(actions);
      if (!plan.editing) {
        body.classList.add('view-only');
      } else {
        // دکمه اتمام ویرایش
        const done = document.createElement('button');
        done.type = 'button';
        done.className = 'btn btn-pay';
        done.style.width = '100%';
        done.style.marginTop = '8px';
        done.textContent = 'اتمام ویرایش';
        done.onclick = () => {
          plan.editing = false;
          if (plan.expenseSectionId || (plan.expenseSectionTitle || '').trim()) {
            ensureExpenseSectionThroughPlanEnd(plan);
          }
          syncPlansToExpenseAll();
          renderPlans();
          updateInstallSummary();
          checkInstallReminders();
          scheduleSave();
          if (currentTab === 'expense') renderAll();
        };
        body.appendChild(done);
        // ویرایش نام با Done کافی است — وابسته به آیکون ادیت نیست
                nameDisp.style.cursor = 'pointer';
        nameDisp.onclick = (e) => {
          e.stopPropagation();
          openPlanNameSheet(plan);
        };
      }
      card.appendChild(body);

      return card;
    }

    function updateInstallSummary() {
      const tbody = document.getElementById('install-summary-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      let gPaid = 0, gRemain = 0, gTotal = 0;
      function bindAmt(td, num) {
        const full = formatNum(num);
        td.textContent = full;
        td.title = full;
        td.style.cursor = 'pointer';
        td.onclick = function(e) {
          e.stopPropagation();
          try { showCellTextPopup(td, full); } catch (err) {}
        };
      }
      plans.forEach(plan => {
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid = Math.min(count, Math.max(0, parseInt(plan.paidCount, 10) || 0));
        const amt = planInstallmentAmount(plan);
        const total = planTotalPayable(plan);
        const paidSum = paid * amt;
        const remainSum = total - paidSum;
        gPaid += paidSum; gRemain += remainSum; gTotal += total;
        const tr = document.createElement('tr');
        const tdN = document.createElement('td'); tdN.className = 'sec-name'; tdN.textContent = plan.name || '—';
        const tdP = document.createElement('td'); tdP.className = 'val paid-cell'; bindAmt(tdP, paidSum);
        const tdR = document.createElement('td'); tdR.className = 'val unpaid-cell'; bindAmt(tdR, remainSum);
        const tdT = document.createElement('td'); tdT.className = 'val total-cell'; bindAmt(tdT, total);
        tr.appendChild(tdN); tr.appendChild(tdP); tr.appendChild(tdR); tr.appendChild(tdT);
        tbody.appendChild(tr);
      });
      [['ins-paid', gPaid], ['ins-remain', gRemain], ['ins-total', gTotal]].forEach(function(pair) {
        const el = document.getElementById(pair[0]);
        if (!el) return;
        const full = formatNum(pair[1]);
        el.textContent = full;
        el.style.cursor = 'pointer';
        el.onclick = function() { try { showCellTextPopup(el, full); } catch (e) {} };
      });
    }


    function syncEmptyClass(el) {
      if (!el) return;
      const v = (el.value || '').trim();
      const empty = !v || v === '۰' || v === '0';
      if (empty && !el.classList.contains('unlocked') && document.activeElement !== el) {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    }
    function approxCaretIndexFromClick(el, clientX) {
      try {
        const val = el.value || '';
        if (!val.length) return 0;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const padL = parseFloat(style.paddingLeft) || 0;
        const padR = parseFloat(style.paddingRight) || 0;
        const usable = Math.max(1, rect.width - padL - padR);
        let ratio = (clientX - rect.left - padL) / usable;
        const rtl = (style.direction === 'rtl') || (el.getAttribute('dir') === 'rtl') ||
          !!(el.closest && el.closest('[dir="rtl"]'));
        if (rtl) ratio = 1 - ratio;
        ratio = Math.max(0, Math.min(1, ratio));
        return Math.round(ratio * val.length);
      } catch (e) {
        return (el.value || '').length;
      }
    }
    /* نشانگر را به انتهای متن ببر (بعد از فوکوس/دبل‌کلیک؛ چند بار تا انتخاب پیش‌فرض مرورگر را جایگزین کند) */
    /* فیلد مبلغ با جداکنندهٔ هزارگان: چپ‌به‌راست تا نشانگرِ آخر عدد واقعاً آخر باشد و «پاک کردن» کیبورد رقم آخر را پاک کند؛
       بعد از جداکننده‌گذاری، نشانگر نسبت به آخر عدد سر جایش می‌ماند */
    function hkAmountInput(inp) {
      if (!inp || inp._hkAmt) return;
      inp._hkAmt = true;
      inp.setAttribute('dir', 'ltr');
      inp.style.direction = 'ltr';
      var toEnd = function () { try { var n = inp.value.length; inp.setSelectionRange(n, n); } catch (e) {} };
      inp.addEventListener('focus', function () { setTimeout(toEnd, 0); });
      inp.addEventListener('input', function () {
        var v = inp.value, pos = inp.selectionStart == null ? v.length : inp.selectionStart;
        var digitsAfter = toEnglishDigits(v.slice(pos)).replace(/[^0-9]/g, '').length;
        var digits = toEnglishDigits(v).replace(/[^0-9]/g, '');
        if (!digits) { inp.value = ''; return; }
        var out = formatNum(parseInt(digits, 10) || 0);
        inp.value = out;
        /* همان تعداد رقم بعد از نشانگر بماند */
        var i = out.length, seen = 0;
        while (i > 0 && seen < digitsAfter) { if (/[0-9۰-۹]/.test(out[i - 1])) seen++; i--; }
        try { inp.setSelectionRange(i, i); } catch (e) {}
      });
    }
    /* رفتن به خانهٔ بعد/قبل جدول بدون بسته شدن صفحه‌کلید: خانهٔ مقصد قابل‌ویرایش و همان لحظه (داخل همان رویداد کلید) فعال می‌شود؛
       خانهٔ قبلی خودبه‌خود blur می‌شود و مقدارش ذخیره می‌شود. هیچ لحظه‌ای بدون خانهٔ فعال نمی‌ماند (علت بسته و باز شدن صفحه‌کلید) */
    /* باز/بسته شدن نرم (همان سرعت سطر «رمزنگاری پشتیبان خودکار»: ۰٫۴۵ ثانیه): ارتفاع قاب از اندازهٔ فعلی به اندازهٔ جدید می‌رود؛
       هنگام بستن، محتوا تا پایان حرکت دیده می‌شود. setOpen(bool) فقط کلاس/حالت نمایش را عوض می‌کند */
    function hkSlideSet(el, open, setOpen) {
      if (!el || !el.animate || !el.isConnected) { setOpen(open); return; }
      if (el._hkHA) { try { el._hkHA.cancel(); } catch (e0) {} }
      var h0 = el.getBoundingClientRect().height;
      setOpen(open);
      var h1 = el.getBoundingClientRect().height;
      if (Math.abs(h1 - h0) < 1) return;
      if (!open) { setOpen(true); el.classList.add('hk-shutting'); } else el.classList.remove('hk-shutting');
      /* ۱.۳.۴۲: overflow با !important (بعضی باکس‌ها مثل قرض در CSS «overflow: visible !important» دارند و محتوای در حال
         باز/بسته شدن از باکس بیرون می‌زد و روی باکس بعدی می‌افتاد) */
      var ov = el.style.getPropertyValue('overflow'), ovp = el.style.getPropertyPriority('overflow');
      var restore = function () { el.style.removeProperty('overflow'); if (ov) el.style.setProperty('overflow', ov, ovp); };
      el.style.setProperty('overflow', 'hidden', 'important');
      var a = el._hkHA = el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 450, easing: 'ease' });
      a.onfinish = function () { el._hkHA = null; restore(); el.classList.remove('hk-shutting'); if (!open) setOpen(false); };
      a.oncancel = function () { el._hkHA = null; restore(); el.classList.remove('hk-shutting'); };
    }
    /* باز/بسته شدن نرمِ چند بخش داخلی (به‌جای کل باکس): ارتفاع، فاصله‌ها و خط‌ها همه با هم به صفر می‌رسند تا
       لحظهٔ آخر هیچ چیزی نپرد. gap = فاصلهٔ flex قبل از بخش (با حاشیهٔ منفی جمع می‌شود). */
    function hkSlideParts(host, getParts, open, setOpen, gap) {
      if (!host || !host.animate || !host.isConnected) { setOpen(open); return; }
      (host._hkParts || []).forEach(function (a0) { try { a0.cancel(); } catch (e0) {} });
      host._hkParts = [];
      setOpen(true);
      var parts = (getParts() || []).filter(function (p) { return p && getComputedStyle(p).display !== 'none'; });
      if (!parts.length) { setOpen(open); return; }
      if (!open) host.classList.add('hk-shutting'); else host.classList.remove('hk-shutting');
      var left = parts.length, finished = false;
      var cleanOne = function (p) { p.style.removeProperty('overflow'); ['boxSizing', 'height', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'marginTop', 'marginBottom'].forEach(function (k) { p.style[k] = ''; }); };
      parts.forEach(function (p) {
        p.style.setProperty('overflow', 'hidden', 'important'); p.style.boxSizing = 'border-box';
        var cs = getComputedStyle(p);
        var full = { height: p.getBoundingClientRect().height + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, borderTopWidth: cs.borderTopWidth, borderBottomWidth: cs.borderBottomWidth, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 };
        var zero = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', marginTop: (gap ? -gap : 0) + 'px', marginBottom: '0px', opacity: 0 };
        var a = p.animate(open ? [zero, full] : [full, zero], { duration: host._hkSlideMs || 450, easing: host._hkSlideMs ? ((!open && host._hkSlideEaseClose) || 'cubic-bezier(0.45, 0, 0.25, 1)') : 'ease' });
        host._hkParts.push(a);
        a.onfinish = function () {
          if (--left > 0) return;
          finished = true; host._hkParts = [];
          if (!open) setOpen(false);
          parts.forEach(cleanOne); host.classList.remove('hk-shutting');
        };
        a.oncancel = function () { cleanOne(p); host.classList.remove('hk-shutting'); };
      });
    }
    function hkSlideBox(el, open, setOpen, gap) { hkSlideParts(el, function () { return [el]; }, open, setOpen, gap); }
    /* شرح در حال تایپ: یک‌خطی، مگر اینکه متن جا نشود؛ آن‌وقت به اندازهٔ متن (تا سقف) بلند می‌شود */
    function hkDescAutosize(el) {
      try {
        el.style.height = '20px';
        var h = el.scrollHeight;
        if (h > 22) el.style.height = Math.min(h + 2, 110) + 'px';
      } catch (e) {}
    }
    function hkMoveFocus(el) {
      if (!el) return false;
      try { el.readOnly = false; } catch (e0) {}
      try { el.focus({ preventScroll: true }); } catch (e1) { try { el.focus(); } catch (e2) { return false; } }
      try { if (typeof caretToEnd === 'function') caretToEnd(el); } catch (e3) {}
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e4) {}
      return document.activeElement === el;
    }
    function caretToEnd(el) {
      if (!el || typeof el.value !== 'string') return;
      var put = function () {
        try {
          if (document.activeElement !== el || el.readOnly || !el._caretEndUntil || Date.now() > el._caretEndUntil) return;
          var n = el.value.length;
          el.setSelectionRange(n, n);
          if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight;
        } catch (e) {}
      };
      el._caretEndUntil = Date.now() + 1600;
      /* مبلغ در فیلد راست‌به‌چپ: نشانگرِ «آخر متن» سمت چپ عدد (پشت رقم بزرگ) دیده می‌شد.
         تا وقتی فیلد در حال ویرایش است جهتش چپ‌به‌راست شود (چینش ظاهری همان قبلی) تا نشانگر بعد از یکان دیده شود */
      try {
        var vv = String(el.value || '');
        var amountLike = (el.inputMode === 'numeric' || el.getAttribute('inputmode') === 'numeric') || (vv && /^[0-9۰-۹,٬.\s\-−]+$/.test(vv));
        if (amountLike && el.tagName === 'INPUT' && !el._ltrEdit) {
          var cs = getComputedStyle(el);
          if (cs.direction === 'rtl') {
            el._ltrEdit = { d: el.style.getPropertyValue('direction'), dp: el.style.getPropertyPriority('direction'), a: el.style.getPropertyValue('text-align'), ap: el.style.getPropertyPriority('text-align') };
            var ta = cs.textAlign === 'start' ? 'right' : cs.textAlign === 'end' ? 'left' : cs.textAlign;
            el.style.setProperty('text-align', ta, 'important');
            el.style.setProperty('direction', 'ltr', 'important');
            var restore = function () {
              el.removeEventListener('blur', restore);
              var o = el._ltrEdit; el._ltrEdit = null; if (!o) return;
              if (o.d) el.style.setProperty('direction', o.d, o.dp); else el.style.removeProperty('direction');
              if (o.a) el.style.setProperty('text-align', o.a, o.ap); else el.style.removeProperty('text-align');
            };
            el.addEventListener('blur', restore);
          }
        }
      } catch (eLtr) {}
      put(); setTimeout(put, 0); setTimeout(put, 60); setTimeout(put, 180); setTimeout(put, 350); setTimeout(put, 600); setTimeout(put, 1000); setTimeout(put, 1500);
      /* اندروید با دوبار ضربه کلمه را انتخاب می‌کند یا نشانگر را دیرتر جابه‌جا می‌کند؛
         تا ۱.۶ ثانیه بعد از شروع ویرایش هر جابه‌جایی نشانگر به انتهای متن برگردانده می‌شود */
      /* باز شدن کیبورد اندروید گاهی تا یک ثانیه بعد نشانگر را به محل لمس می‌برد؛ پس تا اولین تایپ کاربر، نشانگر آخرِ مبلغ می‌ماند */
      if (!el._caretEndHooked) {
        el._caretEndHooked = true;
        var stop = function () { el._caretEndUntil = 0; };
        el.addEventListener('keydown', stop); el.addEventListener('beforeinput', stop); el.addEventListener('blur', stop);
      }
    }
    try { window.caretToEnd = caretToEnd; } catch (eW) {}
    document.addEventListener('selectionchange', function () {
      var el = document.activeElement;
      if (!el || !el._caretEndUntil || Date.now() > el._caretEndUntil) return;
      if (typeof el.value !== 'string' || el.readOnly) return;
      try {
        var n = el.value.length;
        if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
      } catch (e) {}
    });
    /* هر فیلدی که با دوبار ضربه/کلیک قفلش باز می‌شود (حتی بدون رویداد dblclick مرورگر) */
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') || t.readOnly) return;
      if (t.classList && (t.classList.contains('unlocked') || t.dataset.lastTap)) { caretToEnd(t); return; }
      /* ۱.۳.۶۵: هر جای نرم‌افزار که ویرایش شروع شود: نشانگر بعد از آخرین کلمه / جلوی یکانِ مبلغ
         (مگر جایی که خود کد عمداً همهٔ متن را انتخاب کرده باشد) */
      var ty = t.tagName === 'TEXTAREA' ? 'textarea' : String(t.type || 'text').toLowerCase();
      if (['text', 'search', 'tel', 'url', 'email', 'number', 'textarea'].indexOf(ty) < 0) return;
      setTimeout(function () {
        try {
          if (document.activeElement !== t) return;
          var n = (t.value || '').length;
          if (n && t.selectionStart === 0 && t.selectionEnd === n) return;
          caretToEnd(t);
        } catch (eCe) {}
      }, 0);
    }, true);
    /* هر جا با دبل‌کلیک ویرایش شروع شود (مبلغ، شرح، روز، ...) نشانگر به آخر برود */
    /* فاز capture: بعضی سلول‌ها (مثل مبلغ در جدول کارت) رویداد را stopPropagation می‌کنند و قبلاً به این‌جا نمی‌رسید */
    document.addEventListener('dblclick', function (e) {
      var t = e.target;
      if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      setTimeout(function () { caretToEnd(t); }, 0);
      setTimeout(function () { caretToEnd(t); }, 120);
    }, true);
    function lockField(el, shouldLock) {
      if (!el) return;
      if (shouldLock) {
        if (el.tagName !== 'SELECT') el.readOnly = true;
        el.classList.add('locked');
        el.classList.remove('unlocked');
        el.dataset.locked = '1';
        delete el.dataset.fullSelected;
        syncEmptyClass(el);
      } else {
        if (el.tagName !== 'SELECT') el.readOnly = false;
        el.classList.remove('locked');
        el.classList.add('unlocked');
        el.classList.remove('is-empty');
        el.dataset.locked = '0';
        try {
          el.focus({ preventScroll: true });
          /* بعد از دبل‌کلیک، نشانگر چشمک‌زن آخر مبلغ/نوشته قرار می‌گیرد */
          caretToEnd(el);
        } catch (e) { try { el.focus(); } catch (e2) {} }
      }
    }
    function setupLockable(el, hasValue, permaLocked, lockMsg) {
      if (hasValue) lockField(el, true);
      else {
        // خالی: نه قفل کامل، باریک و شفاف
        if (el.tagName !== 'SELECT') el.readOnly = false;
        el.classList.remove('locked');
        el.classList.remove('unlocked');
        el.dataset.locked = '0';
        el.classList.add('is-empty');
      }
      if (permaLocked) {
        el.dataset.permaLocked = '1';
        el.dataset.permaLockedMsg = lockMsg || 'برای ویرایش از بخش اقساط اقدام کنید';
        if (el.tagName !== 'SELECT') el.readOnly = true;
      }
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (el.dataset.permaLocked === '1') { showToast(el.dataset.permaLockedMsg || 'برای ویرایش از بخش اقساط اقدام کنید'); return; }
        lockField(el, false);
      });
      // جلوگیری از اسکرول ناخواسته صفحه هنگام اولین لمس/کلیک روی سلول قفل‌شده
      el.addEventListener('mousedown', (e) => {
        if (el.tagName === 'SELECT') return;
        if (el.classList.contains('locked')) {
          e.preventDefault();
          try { el.focus({ preventScroll: true }); } catch (err) { try { el.focus(); } catch (e2) {} }
          return;
        }
        // حالت هایلایت کامل: کلیک بعدی نشانگر تایپ را همان‌جا می‌گذارد
        if (el.dataset.fullSelected === '1' && typeof el.setSelectionRange === 'function') {
          const x = e.clientX;
          // بگذار رفتار پیش‌فرض هم اجرا شود؛ بعد اگر هنوز همه انتخاب بود، دستی بگذار
          setTimeout(() => {
            try {
              if (el.dataset.fullSelected !== '1') return;
              const len = (el.value || '').length;
              if (el.selectionStart === 0 && el.selectionEnd === len && len > 0) {
                const pos = approxCaretIndexFromClick(el, x);
                el.setSelectionRange(pos, pos);
              }
              delete el.dataset.fullSelected;
            } catch (err) {}
          }, 0);
        }
      });
      el.addEventListener('click', (e) => {
        if (el.tagName === 'SELECT') return;
        if (el.classList.contains('locked') || el.readOnly) return;
        if (el.dataset.fullSelected !== '1') return;
        if (typeof el.setSelectionRange !== 'function') return;
        const len = (el.value || '').length;
        if (!len) { delete el.dataset.fullSelected; return; }
        // اگر هنوز کل متن انتخاب است، نشانگر را نزدیک محل کلیک بگذار
        if (el.selectionStart === 0 && el.selectionEnd === len) {
          const pos = approxCaretIndexFromClick(el, e.clientX);
          try { el.setSelectionRange(pos, pos); } catch (err) {}
        }
        delete el.dataset.fullSelected;
      });
      // لمس طولانی‌تر موبایل: دوبار لمس سریع (فقط اگر لمس واقعاً "تپ" باشد نه اسکرول)
      let lastTap = 0;
      let touchStartX = 0, touchStartY = 0, touchMoved = false;
      el.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
        touchMoved = false;
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          const dx = Math.abs(e.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 10 || dy > 10) touchMoved = true;
        }
      }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (touchMoved) { lastTap = 0; touchMoved = false; return; }
        const now = Date.now();
        if (now - lastTap < 350) {
          e.preventDefault();
          if (el.dataset.permaLocked === '1') { showToast(el.dataset.permaLockedMsg || 'برای ویرایش از بخش اقساط اقدام کنید'); return; }
          lockField(el, false);
        } else if (el.classList.contains('locked')) {
          e.preventDefault();
          try { el.focus({ preventScroll: true }); } catch (err) { try { el.focus(); } catch (e2) {} }
        } else if (el.dataset.fullSelected === '1' && typeof el.setSelectionRange === 'function') {
          // بعد از هایلایت کامل، تک‌لمس نشانگر را نزدیک محل لمس می‌گذارد
          const touch = (e.changedTouches && e.changedTouches[0]) || null;
          const x = touch ? touch.clientX : 0;
          const len = (el.value || '').length;
          setTimeout(() => {
            try {
              if (el.dataset.fullSelected !== '1') return;
              if (len > 0 && el.selectionStart === 0 && el.selectionEnd === len) {
                const pos = approxCaretIndexFromClick(el, x);
                el.setSelectionRange(pos, pos);
              }
              delete el.dataset.fullSelected;
            } catch (err) {}
          }, 0);
        }
        lastTap = now;
      });
      el.addEventListener('focus', () => {
        el.classList.remove('is-empty');
        el.classList.add('unlocked');
      });
      el.addEventListener('input', () => syncEmptyClass(el));
      el.addEventListener('blur', () => {
        const v = (el.value || '').trim();
        if (v !== '' && v !== '۰' && v !== '0') lockField(el, true);
        else {
          el.classList.remove('unlocked');
          el.classList.remove('locked');
          el.classList.add('is-empty');
        }
      });
    }
    /** با لمس/کلیک در هر جای دیگه صفحه (حتی نواحی غیرقابل‌فوکوس)، سلول شرح بازشده باید جمع شود */
    function collapseOpenDescField(target) {
      const ae = document.activeElement;
      if (!ae || !ae.classList || !ae.classList.contains('desc-input')) return;
      if (ae === target || (ae.contains && ae.contains(target))) return;
      try { ae.blur(); } catch (e) {}
    }
    document.addEventListener('mousedown', (e) => collapseOpenDescField(e.target), true);
    document.addEventListener('touchstart', (e) => collapseOpenDescField(e.target), { capture: true, passive: true });

    const DRAG_HANDLE_SVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 4v16"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/>' +
      '</svg>';

    /** مدیر سراسری درگ — فقط یک درگ همزمان، همیشه پاک‌سازی می‌شود */
    const DragReorder = {
      timer: null,
      active: null,
      ghost: null,
      container: null,
      itemSel: '',
      onCommit: null,
      pressX: 0,
      pressY: 0,
      startTop: 0,
      startLeft: 0,
      safety: null,
      bound: false,

      resetSoft() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      },

      hardCancel() {
        this.resetSoft();
        if (this.safety) { clearTimeout(this.safety); this.safety = null; }
        this.unbindMove();
        if (this.ghost && this.ghost.parentNode) {
          try { this.ghost.remove(); } catch (e) {}
        }
        this.ghost = null;
        if (this.active) {
          try {
            this.active.classList.remove('drag-source');
            this.active.style.opacity = '';
            const el = this.active;
            el._skipClick = true;
            setTimeout(function() { try { el._skipClick = false; } catch (e2) {} }, 280);
          } catch (e) {}
        }
        try {
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
        } catch (e) {}
        this.active = null;
        this.container = null;
        this.onCommit = null;
      },

      unbindMove() {
        if (!this.bound) return;
        document.removeEventListener('pointermove', this._onMove);
        document.removeEventListener('pointerup', this._onUp);
        document.removeEventListener('pointercancel', this._onUp);
        this.bound = false;
      },

      bindMove() {
        if (this.bound) return;
        document.addEventListener('pointermove', this._onMove, { passive: false });
        document.addEventListener('pointerup', this._onUp);
        document.addEventListener('pointercancel', this._onUp);
        this.bound = true;
      },

      _onMove(e) {
        const self = DragReorder;
        if (!self.active || !self.ghost) return;
        e.preventDefault();
        e.stopPropagation();
        const dy = e.clientY - self.pressY;
        self.ghost.style.top = (self.startTop + dy) + 'px';
        self.ghost.style.left = self.startLeft + 'px';
        const y = e.clientY;
        const list = Array.from(self.container.querySelectorAll(self.itemSel))
          .filter(el => el !== self.active);
        let before = null;
        for (let i = 0; i < list.length; i++) {
          const r = list[i].getBoundingClientRect();
          const mid = r.top + r.height * 0.45;
          if (y < mid) { before = list[i]; break; }
        }
        try {
          if (before) {
            if (self.active.nextSibling !== before) self.container.insertBefore(self.active, before);
          } else if (list.length) {
            const last = list[list.length - 1];
            if (self.active !== last) self.container.appendChild(self.active);
          }
        } catch (err) {}
      },

      _onUp() {
        const self = DragReorder;
        if (!self.active) {
          self.resetSoft();
          return;
        }
        const cont = self.container;
        const sel = self.itemSel;
        const cb = self.onCommit;
        const ids = cont
          ? Array.from(cont.querySelectorAll(sel)).map(el => el.dataset.secId || el.dataset.planId || '').filter(Boolean)
          : [];
        self.hardCancel();
        try { if (typeof cb === 'function' && ids.length) cb(ids); } catch (err) {}
      },

      begin(item, e, container, itemSel, onCommit) {
        this.hardCancel();
        if (!item || !container) return;
        this.active = item;
        this.container = container;
        this.itemSel = itemSel;
        this.onCommit = onCommit;
        this.pressX = e.clientX;
        this.pressY = e.clientY;
        item._skipClick = true;
        try { if (e.pointerId != null && item.setPointerCapture) item.setPointerCapture(e.pointerId); } catch (err) {}
        try { window.appHaptic(12); } catch (err) {}
        try {
          document.body.style.overflow = 'hidden';
          document.body.style.touchAction = 'none';
        } catch (err) {}

        const rect = item.getBoundingClientRect();
        this.startTop = rect.top;
        this.startLeft = rect.left;

        const g = document.createElement('div');
        g.className = 'drag-ghost';
        g.style.cssText = [
          'position:fixed',
          'left:' + rect.left + 'px',
          'top:' + rect.top + 'px',
          'width:' + rect.width + 'px',
          'height:' + Math.min(rect.height, 120) + 'px',
          'z-index:99999',
          'pointer-events:none',
          'border-radius:12px',
          'box-shadow:0 12px 32px rgba(0,0,0,0.4)',
          'background:var(--bg2,#1c1c1e)',
          'border:1px solid var(--border,#333)',
          'opacity:0.95',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'font-family:Tahoma,sans-serif',
          'font-size:14px',
          'color:var(--text,#eee)',
          'padding:8px 12px',
          'box-sizing:border-box'
        ].join(';');
        // فقط عنوان، نه کل درخت DOM (جلوگیری از فریز)
        let title = '';
        const nameEl = item.querySelector('.title-display, .plan-name, .section-title-display, .section-title');
        if (nameEl) title = (nameEl.textContent || '').trim();
        if (!title) title = 'جابه‌جایی…';
        g.textContent = title;
        document.body.appendChild(g);
        this.ghost = g;

        item.classList.add('drag-source');
        try { window.appHaptic(10); } catch (err) {}

        this.bindMove();
        // اگر pointerup از دست رفت، حداکثر ۳ ثانیه بعد رها شود
        this.safety = setTimeout(() => {
          if (DragReorder.active) DragReorder._onUp();
        }, 3000);
      }
    };
    // bind this
    DragReorder._onMove = DragReorder._onMove.bind(DragReorder);
    DragReorder._onUp = DragReorder._onUp.bind(DragReorder);

    function enableLongPressReorder(container, itemSelector, onCommit) {
      if (!container) return;
      container._lpItemSel = itemSelector;
      container._lpOnCommit = onCommit;
      if (container._lpBound) return;
      container._lpBound = true;

      container.addEventListener('pointerdown', (e) => {
        const sel = container._lpItemSel;
        if (e.button != null && e.button !== 0) return;
        if (e.target.closest && e.target.closest('input:not([readonly]), textarea:not([readonly]), select, a, .btn-edit-title, .btn-del-row, .btn-circle-plus')) return;
        const handle = e.target.closest && e.target.closest('.drag-handle');
        let item = null;
        if (handle && container.contains(handle)) {
          item = handle.closest(sel);
        } else {
          item = e.target.closest && e.target.closest(sel);
          if (!item || !container.contains(item)) return;
          if (item.classList.contains('plan-card') && !handle) return;
        }
        if (!item) return;
        if (DragReorder.active) return;

        const sx = e.clientX;
        const sy = e.clientY;
        const pointerId = e.pointerId;
        let activated = false;
        let cancelled = false;

        const onMoveBefore = (ev) => {
          if (cancelled || activated) return;
          if (Math.abs(ev.clientX - sx) > 22 || Math.abs(ev.clientY - sy) > 22) {
            cancelled = true;
            DragReorder.resetSoft();
            cleanupBefore();
          }
        };
        const onUpBefore = () => {
          if (activated) return;
          cancelled = true;
          DragReorder.resetSoft();
          cleanupBefore();
        };
        function cleanupBefore() {
          document.removeEventListener('pointermove', onMoveBefore);
          document.removeEventListener('pointerup', onUpBefore);
          document.removeEventListener('pointercancel', onUpBefore);
        }
        document.addEventListener('pointermove', onMoveBefore, { passive: true });
        document.addEventListener('pointerup', onUpBefore);
        document.addEventListener('pointercancel', onUpBefore);

        DragReorder.resetSoft();
        DragReorder.timer = setTimeout(() => {
          if (cancelled) return;
          activated = true;
          cleanupBefore();
          try {
            item._skipClick = true;
            try { if (item.setPointerCapture) item.setPointerCapture(pointerId); } catch (err) {}
            DragReorder.begin(
              item,
              { clientX: sx, clientY: sy, pointerId: pointerId },
              container,
              container._lpItemSel,
              container._lpOnCommit
            );
          } catch (err) {
            DragReorder.hardCancel();
          }
        }, 400);
      });
    }


