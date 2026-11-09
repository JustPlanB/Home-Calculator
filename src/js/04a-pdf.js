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
              '<td class="c">' + E(x.debtor) + '</td><td class="c">' + E(x.creditor) + '</td><td class="n">' + pdfMoney(x.amt) + '</td><td class="c">' + (x.r.settled ? '<svg width="11" height="11" viewBox="0 0 24 24" style="vertical-align:-1px" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg> تسویه' : 'باز') + '</td>' + byTd(E(x.r.createdByName || '')) + '</tr>';
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
