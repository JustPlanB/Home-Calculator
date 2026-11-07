    function removeCarriedInstallmentRows(planId, planIndex, afterY, afterM) {
      planIndex = parseInt(planIndex, 10);
      afterY = afterY != null ? parseInt(afterY, 10) : null;
      afterM = afterM != null ? parseInt(afterM, 10) : null;
      function periodAfter(y, m) {
        if (afterY == null || afterM == null) return true;
        y = parseInt(y, 10); m = parseInt(m, 10);
        return (y > afterY) || (y === afterY && m > afterM);
      }
      function scrub(pd) {
        if (!pd || !pd.expense || !pd.expense.sections) return;
        pd.expense.sections.forEach(function(s) {
          if (!s.rows) return;
          s.rows = s.rows.filter(function(r) {
            if (!r || r.fromPlanId !== planId) return true;
            if (parseInt(r.fromPlanIndex, 10) !== planIndex) return true;
            if (r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0)) return false;
            return true;
          });
          if (!s.rows.length) s.rows = [emptyRow()];
        });
      }
      try {
        if (afterY == null || periodAfter(currentYear, currentMonth)) scrub(periodData);
      } catch (e0) {}
      try {
        Object.keys(archive || {}).forEach(function(k) {
          if (!archive[k]) return;
          var parts = String(k).split('-');
          var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
          if (afterY == null || periodAfter(y, m)) scrub(archive[k]);
        });
      } catch (e1) {}
    }


    function getWritablePeriodData(y, m) {
      y = parseInt(y, 10) || currentYear;
      m = parseInt(m, 10) || currentMonth;
      if (y === currentYear && m === currentMonth) return { data: periodData, isCurrent: true };
      if (!archive || typeof archive !== 'object') archive = {};
      const key = periodKey(y, m);
      let data = archive[key];
      if (!data) data = emptyPeriodData();
      else {
        try { data = JSON.parse(JSON.stringify(data)); } catch (e) { data = emptyPeriodData(); }
      }
      if (!data.expense) data.expense = { sections: [], nextId: 1 };
      if (!data.income) data.income = { sections: [], nextId: 1 };
      if (!data.expense.sections) data.expense.sections = [];
      if (!data.income.sections) data.income.sections = [];
      return { data: data, isCurrent: false, key: key };
    }
    function commitWritablePeriodData(ctx) {
      if (!ctx) return;
      if (ctx.isCurrent) {
        try { persistCurrent(); } catch (e) {}
      } else if (ctx.key) {
        archive[ctx.key] = ctx.data;
        try { if (typeof saveArchive === 'function') saveArchive(); } catch (e) {}
      }
    }

function confirmSmsEntry() {
      try {
      if (!pendingSmsEntry) {
        showToast('اطلاعات تراکنش ناقص است');
        return;
      }
      const typeEl = document.getElementById('smsConfirmType');
      const amtEl = document.getElementById('smsConfirmAmount');
      const bankEl = document.getElementById('smsConfirmBank');
      const dayEl = document.getElementById('smsConfirmDay');
      const type = (typeEl && typeEl.value === 'income') ? 'income' : 'expense';
      const amount = parseAmount(amtEl ? amtEl.value : pendingSmsEntry.amount);
      if (!amount) { showToast('مبلغ را وارد کنید'); return; }
      let bank = (bankEl && bankEl.value) ? String(bankEl.value).trim() : '';
      const _accLabels = (typeof selectedAccountLabels === 'function') ? selectedAccountLabels() : [];
      if (bank && _accLabels.indexOf(bank) < 0) {
        bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(bank) || '') : '';
      }
      if (!bank && pendingSmsEntry && pendingSmsEntry.bank) {
        bank = (typeof matchSelectedBank === 'function') ? (matchSelectedBank(pendingSmsEntry.bank) || '') : '';
      }
      if (bank && pendingSmsEntry && pendingSmsEntry.raw) { try { saveSmsBankPref(pendingSmsEntry.raw, bank); } catch (e) {} }
      let day = '';
      if (dayEl && dayEl.value) {
        const d = parseInt(toEnglishDigits(dayEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (d >= 1 && d <= 31) day = String(d);
      } else if (pendingSmsEntry.day) day = pendingSmsEntry.day;

      const monthEl = document.getElementById('smsConfirmMonth');
      const yearEl = document.getElementById('smsConfirmYear');
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      if (monthEl && monthEl.value) {
        const mm = parseInt(toEnglishDigits(monthEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (mm >= 1 && mm <= 12) targetMonth = mm;
      } else if (pendingSmsEntry && pendingSmsEntry.month) {
        targetMonth = pendingSmsEntry.month;
      }
      if (yearEl && yearEl.value) {
        let yy = parseInt(toEnglishDigits(yearEl.value).replace(/[^0-9]/g, '') || '0', 10) || 0;
        if (yy > 0 && yy < 100) {
          const base = Math.floor((currentYear || 1400) / 100) * 100;
          yy = base + yy;
        }
        if (yy >= 1300 && yy <= 1500) targetYear = yy;
      } else if (pendingSmsEntry && pendingSmsEntry.year) {
        targetYear = pendingSmsEntry.year;
      }
      /* واریز مربوط به درآمد ثابت: همان ردیف «دریافت نشده» پر می‌شود و ردیف تازه ساخته نمی‌شود */
      try {
        var _recSel = document.getElementById('smsRecMatchSel');
        if (type === 'income' && _recSel && _recSel.value &&
            recApplySmsMatch(_recSel.value, { amount: amount, bank: bank, day: day, y: targetYear, m: targetMonth, raw: pendingSmsEntry && pendingSmsEntry.raw, desc: ((document.getElementById('smsConfirmDesc') || {}).value || '').trim() })) return;
      } catch (eRecMatch) {}
      const periodCtx = getWritablePeriodData(targetYear, targetMonth);
      const targetPd = periodCtx.data;

      const tab = type;
      const descInp = document.getElementById('smsConfirmDesc');
      let desc = ((descInp && descInp.value) || '').trim() || (type === 'income' ? 'واریز بانکی' : 'برداشت بانکی');
      /* تشخیص تکرار پیش از ثبت: همین مبلغ (±۱٪) در همان روز/روز مجاور و همان حساب قبلاً (دستی یا پیامکی) ثبت شده؟
         کاربر تصمیم می‌گیرد؛ چیزی خودکار دوباره ثبت نمی‌شود */
      try {
        var _pbAttr = descInp ? (descInp.getAttribute('data-plan-batch') || '') : '';
        var _isPlanPay = !!(descInp && descInp.getAttribute('data-plan-id')) || (_pbAttr && _pbAttr !== '[]');
        if (!window._smsDupBypass && !_isPlanPay) {
          var _dupHit = HKAlerts.findSimilarBeforeSave(targetPd, tab, amount, day, bank, desc);
          if (_dupHit) {
            var _dupYes = function () { window._smsDupBypass = true; try { confirmSmsEntry(); } finally { window._smsDupBypass = false; } };
            /* ۱.۳.۶۴: دو تراکنش زیر هم برای مقایسه (پیامک تازه / ثبت قبلی)؛ تفاوت‌ها پررنگ */
            try {
              hkAskDupCompare({ type: tab, amount: amount, day: day, y: targetYear, m: targetMonth, account: bank, raw: pendingSmsEntry && pendingSmsEntry.raw, at: pendingSmsEntry && pendingSmsEntry.receivedAt }, _dupHit, _dupYes);
            } catch (eDc) {
              askConfirm('احتمال ثبت تکراری: تراکنش «' + (_dupHit.row.desc || '—') + '» با مبلغ ' + formatNum(amount) + ' تومان' +
                (_dupHit.row.day ? ' (روز ' + toPersianDigits(_dupHit.row.day) + ')' : '') + ' قبلاً ثبت شده. باز هم ثبت شود؟', _dupYes);
            }
            return;
          }
        }
      } catch (eDupChk) {}
      const planIdLink = HK_INSTALLMENTS_ON && descInp && descInp.getAttribute('data-plan-id');
      const planIdxLink = descInp && descInp.getAttribute('data-plan-index');
      let batchItems = [];
      try {
        batchItems = JSON.parse((descInp && descInp.getAttribute('data-plan-batch')) || '[]') || [];
        if (!Array.isArray(batchItems)) batchItems = [];
        if (!HK_INSTALLMENTS_ON) batchItems = [];
      } catch (eBat) { batchItems = []; }
      let linkedPlan = null;
      let linkedIdx = -1;
      if (planIdLink && tab === 'expense' && !batchItems.length) {
        linkedPlan = (plans || []).find(function(p){ return p && p.id === planIdLink; }) || null;
        if (linkedPlan) {
          linkedIdx = (planIdxLink != null && planIdxLink !== '')
            ? parseInt(planIdxLink, 10)
            : earliestUnpaidPlanIndex(linkedPlan);
          if (isNaN(linkedIdx)) linkedIdx = -1;
        }
      }

      const sel = document.getElementById('smsConfirmSectionSel');
      let sec = null;
      let secTitleWanted = '';
      if (sel && sel.value && sel.value !== '__auto__') {
        /* اول در ماه هدف با id */
        sec = (targetPd[tab] && targetPd[tab].sections || []).find(function(s){ return s.id === sel.value; });
        /* اگر ماه هدف بخش با این id ندارد (آرشیو)، با عنوان گزینه پیدا/بساز */
        if (!sec) {
          try {
            var opt = sel.options[sel.selectedIndex];
            secTitleWanted = opt ? String(opt.textContent || '').trim() : '';
          } catch (eO) { secTitleWanted = ''; }
          if (secTitleWanted) {
            sec = (targetPd[tab] && targetPd[tab].sections || []).find(function(s){
              return (s.title || '').trim() === secTitleWanted;
            });
            if (!sec) {
              sec = ensureSmsSection(tab, secTitleWanted, targetPd);
            }
          }
        } else {
          secTitleWanted = (sec.title || '').trim();
        }
      }
      if (!sec) {
        sec = ensureSmsSection(tab, tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی', targetPd);
      }
      if (!sec) {
        showToast('بخش مقصد مشخص نیست. یک کاربر/بخش انتخاب کنید');
        return;
      }
      if (!targetPd[tab]) {
        showToast('خطا در داده‌ی ماه هدف');
        return;
      }
      if (!Array.isArray(sec.rows)) sec.rows = [];
      /* مطمئن شو sec داخل targetPd است */
      if (!(targetPd[tab].sections || []).some(function(s){ return s === sec || s.id === sec.id; })) {
        targetPd[tab].sections.push(sec);
      }

      /* ترجیح: حساب از لیست کاربر — حساب جدید خودکار نساز */
      if (bank && pendingSmsEntry.raw) {
        try {
          const acc = extractAccountFromSms(pendingSmsEntry.raw);
          if (acc && smsAccountBankMap[acc] !== bank) {
            smsAccountBankMap[acc] = bank;
            saveSmsAccountBankMap();
          }
        } catch (eMap) {}
      }

      if (batchItems.length && tab === 'expense') {
        /* پرداخت دسته‌ای اقساط — مبلغ تراکنش ÷ تعداد تیک‌خورده */
        var batchOk = 0;
        var validBatch = [];
        batchItems.forEach(function(bi) {
          if (!bi || !bi.id) return;
          var bp0 = (plans || []).find(function(p){ return p && p.id === bi.id; });
          if (!bp0) return;
          var bIdx0 = parseInt(bi.index, 10);
          if (isNaN(bIdx0) || bIdx0 < 0) return;
          validBatch.push({ bi: bi, bp: bp0, bIdx: bIdx0 });
        });
        var nSplit = validBatch.length || 1;
        var totalAmt = Number(amount) || 0;
        var baseShare = Math.floor(totalAmt / nSplit);
        var remShare = totalAmt - baseShare * nSplit;
        validBatch.forEach(function(item, iSplit) {
          var bi = item.bi;
          var bp = item.bp;
          var bIdx = item.bIdx;
          var bCnt = Math.max(0, parseInt(bp.count, 10) || 0);
          /* سهم مساوی؛ باقی‌مانده تقسیم به اولین قسط */
          var bAmt = baseShare + (iSplit === 0 ? remShare : 0);
          if (!bAmt && totalAmt) bAmt = totalAmt;
          var bDesc = planInstallmentDesc(bp, bIdx, bCnt);
          var dueB = null;
          try { dueB = dueDateForInstallment(bp, bIdx); } catch (eD) {}
          var isMoavaghB = dueB && ((dueB.y < targetYear) || (dueB.y === targetYear && dueB.m < targetMonth));
          var isFutureDue = dueB && ((dueB.y > targetYear) || (dueB.y === targetYear && dueB.m > targetMonth));
          /* همه در ماه/تاریخ تراکنش ثبت شوند — از جمله پیش‌پرداخت */
          var tRow = null, tSec = sec;
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (!(r && r.fromPlanId === bp.id && parseInt(r.fromPlanIndex, 10) === bIdx)) return;
              if (isFutureDue || r.planEarlyPay) {
                if (r.planEarlyPay || !tRow) { tRow = r; tSec = s; }
              } else if (isMoavaghB) {
                if (r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0)) { tRow = r; tSec = s; }
                else if (!tRow) { tRow = r; tSec = s; }
              } else {
                if (!r.planCarried) { tRow = r; tSec = s; }
                else if (!tRow) { tRow = r; tSec = s; }
              }
            });
          });
          if (!tRow && !isFutureDue) {
            try { syncPlansToExpensePeriod(targetPd, targetYear, targetMonth); } catch (eSy) {}
            (targetPd.expense.sections || []).forEach(function(s) {
              (s.rows || []).forEach(function(r) {
                if (r && r.fromPlanId === bp.id && parseInt(r.fromPlanIndex, 10) === bIdx && !tRow) {
                  tRow = r; tSec = s;
                }
              });
            });
          }
          if (!tRow) {
            tRow = emptyRow();
            tRow.fromPlanId = bp.id;
            tRow.fromPlanIndex = bIdx;
            if (!tSec) tSec = sec;
            if (!tSec.rows) tSec.rows = [];
            var ei = tSec.rows.findIndex(function(r){ return r && !r.desc && !r.amount && !r.day && !r.fromPlanId; });
            if (ei >= 0) tSec.rows[ei] = tRow;
            else tSec.rows.push(tRow);
          }
          tRow.status = 'paid';
          tRow.amount = bAmt;
          if (day) tRow.day = day;
          else if (dueB && !isFutureDue && !isMoavaghB) tRow.day = String(dueB.d);
          if (bank) tRow.account = bank;
          if (isFutureDue) {
            tRow.desc = bDesc + ' (پیش‌پرداخت)';
            tRow.planEarlyPay = true;
            tRow.planCarried = false;
            if (!bp.paidEarlyMap) bp.paidEarlyMap = {};
            bp.paidEarlyMap[String(bIdx)] = {
              y: targetYear, m: targetMonth,
              amount: bAmt, day: day || '', account: bank || ''
            };
            /* پیش‌پرداخت: paidCount بالا نرود تا ماه سررسید پرداخت‌نشده بماند */
          } else {
            tRow.desc = bDesc + (isMoavaghB ? ' (معوق)' : '');
            tRow.planCarried = !!isMoavaghB;
            tRow.planEarlyPay = false;
            if (isMoavaghB) setPlanIndexPaidLate(bp, bIdx, true);
            else setPlanIndexPaidLate(bp, bIdx, false);
            var need = bIdx + 1;
            var curPaid = Math.max(0, parseInt(bp.paidCount, 10) || 0);
            if (curPaid < need) bp.paidCount = Math.min(bCnt, need);
            try { clampPlanPaymentState(bp); } catch (eC) {}
            try { removeCarriedInstallmentRows(bp.id, bIdx, targetYear, targetMonth); } catch (eR) {}
          }
          tRow.allowPlanFieldEdit = true;
          tRow.fromPlanId = bp.id;
          tRow.fromPlanIndex = bIdx;
          batchOk++;
          sec = tSec || sec;
        });
        try {
          if (periodCtx.isCurrent && typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
          else syncPlansToExpensePeriod(targetPd, targetYear, targetMonth);
        } catch (eSy2) {}
        if (sec && sec.rows) {
          sec.rows.sort(function(a, b) {
            return (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99);
          });
          sec.collapsed = false;
        }
        commitWritablePeriodData(periodCtx);
        try { persistCurrent(); } catch (eP) {}
        try { saveArchive(); } catch (eA) {}
        scheduleSave();
        closeSmsConfirmModal();
        try {
          if (typeof navigateToPeriod === 'function') navigateToPeriod(targetYear, targetMonth);
        } catch (eN) {}
        if (currentTab !== tab) switchTab(tab);
        else renderAll();
        showToast('پرداخت دسته‌ای: ' + toPersianDigits(batchOk) + ' قسط ثبت شد');
        return;
      }
      if (linkedPlan && linkedIdx >= 0) {
        const cnt = Math.max(0, parseInt(linkedPlan.count, 10) || 0);
        const baseDesc = planInstallmentDesc(linkedPlan, linkedIdx, cnt);
        /* پرداخت زودهنگام قسط ماه بعد: فقط ردیف در ماه جاری؛ ماه سررسید دست‌نخورده */
        var dueEarly = null;
        try { dueEarly = dueDateForInstallment(linkedPlan, linkedIdx); } catch (eDe) {}
        var isFutureDue = dueEarly && ((dueEarly.y > targetYear) || (dueEarly.y === targetYear && dueEarly.m > targetMonth));
        if (isFutureDue) {
          if (!linkedPlan.paidEarlyMap) linkedPlan.paidEarlyMap = {};
          linkedPlan.paidEarlyMap[String(linkedIdx)] = {
            y: targetYear, m: targetMonth,
            amount: amount, day: day || '', account: bank || ''
          };
          /* paidCount را بالا نبر — ماه سررسید پرداخت‌نشده بماند */
          let earlyRow = null;
          let earlySec = sec;
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (r && r.fromPlanId === linkedPlan.id && parseInt(r.fromPlanIndex, 10) === linkedIdx && r.planEarlyPay) {
                earlyRow = r; earlySec = s;
              }
            });
          });
          if (!earlyRow) {
            earlyRow = emptyRow();
            earlyRow.fromPlanId = linkedPlan.id;
            earlyRow.fromPlanIndex = linkedIdx;
            earlyRow.planEarlyPay = true;
            const emptyIdxE = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
            if (emptyIdxE >= 0) sec.rows[emptyIdxE] = earlyRow;
            else sec.rows.push(earlyRow);
            earlySec = sec;
          }
          earlyRow.status = 'paid';
          earlyRow.amount = amount;
          if (day) earlyRow.day = day;
          if (bank) earlyRow.account = bank;
          earlyRow.desc = baseDesc + ' (پیش‌پرداخت)';
          earlyRow.planEarlyPay = true;
          earlyRow.allowPlanFieldEdit = true;
          earlyRow.fromPlanId = linkedPlan.id;
          earlyRow.fromPlanIndex = linkedIdx;
          if (earlySec && earlySec.rows) {
            earlySec.rows.sort((a, b) => (parseInt(a.day, 10) || 99) - (parseInt(b.day, 10) || 99));
            earlySec.collapsed = false;
          }
          sec = earlySec || sec;
          try { updateInstallSummary(); } catch (eU) {}
          try { checkInstallReminders(); } catch (eR) {}
          commitWritablePeriodData(periodCtx);
          persistCurrent();
          scheduleSave();
          closeSmsConfirmModal();
          try {
            if (typeof navigateToPeriod === 'function') navigateToPeriod(targetYear, targetMonth);
          } catch (eNavE) {}
          if (currentTab !== tab) switchTab(tab);
          else renderAll();
          showToast('پیش‌پرداخت قسط ثبت شد: ' + formatNum(amount));
          return;
        }
        /* هدف: همان ردیف قسط در ماه جاری (اولویت با معوق) */
        let target = null;
        let targetSec = null;
                var dueMatch = dueEarly && dueEarly.y === targetYear && dueEarly.m === targetMonth;
        (targetPd.expense.sections || []).forEach(function(s) {
          (s.rows || []).forEach(function(r) {
            if (!r || r.fromPlanId !== linkedPlan.id) return;
            if (parseInt(r.fromPlanIndex, 10) !== linkedIdx) return;
            const isMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
            if (dueMatch) {
              /* تاریخ پیامک = ماه سررسید → ردیف عادی همان ماه */
              if (!isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            } else {
              if (isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            }
          });
        });
        if (!target) {
          /* اگر هنوز ردیف ساخته نشده، اول همگام‌سازی ماه جاری */
          try { syncPlansToExpensePeriod(targetPd, targetYear, targetMonth); } catch (eS0) {}
          (targetPd.expense.sections || []).forEach(function(s) {
            (s.rows || []).forEach(function(r) {
              if (!r || r.fromPlanId !== linkedPlan.id) return;
              if (parseInt(r.fromPlanIndex, 10) !== linkedIdx) return;
              const isMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
              if (isMoavagh) { target = r; targetSec = s; }
              else if (!target) { target = r; targetSec = s; }
            });
          });
        }
        if (target) {
          const keepMoavagh = !!target.planCarried || (target.desc && String(target.desc).indexOf('معوق') >= 0);
          /* پرداخت معوق: ماه قبل دست‌نخورده؛ غیرمعوق: همین ماه سررسید */
          if (keepMoavagh) setPlanIndexPaidLate(linkedPlan, linkedIdx, true);
          else setPlanIndexPaidLate(linkedPlan, linkedIdx, false);
          const need = linkedIdx + 1;
          const curPaid = Math.max(0, parseInt(linkedPlan.paidCount, 10) || 0);
          if (curPaid < need) linkedPlan.paidCount = Math.min(cnt, need);
          const snap = {
            amount: amount,
            day: day,
            account: bank,
            planCarried: keepMoavagh
          };
          try {
            if (periodCtx.isCurrent && typeof syncPlansToExpenseAll === 'function') syncPlansToExpenseAll();
            else syncPlansToExpensePeriod(targetPd, targetYear, targetMonth);
            var applied = false;
            var appliedSec = null;
            (targetPd.expense.sections || []).forEach(function(s) {
              (s.rows || []).forEach(function(r) {
                if (!(r && r.fromPlanId === linkedPlan.id && parseInt(r.fromPlanIndex, 10) === linkedIdx)) return;
                const rowMoavagh = !!r.planCarried || (r.desc && String(r.desc).indexOf('معوق') >= 0);
                if (keepMoavagh) {
                  if (!rowMoavagh) return;
                } else {
                  if (rowMoavagh) return;
                }
                r.status = 'paid';
                r.amount = snap.amount;
                if (snap.day) r.day = snap.day;
                if (snap.account) r.account = snap.account;
                r.desc = planInstallmentDesc(linkedPlan, linkedIdx, cnt) + (keepMoavagh ? ' (معوق)' : '') + (Number(snap.amount) > (Number(linkedPlan.amount) || 0) && Number(linkedPlan.amount) > 0 ? ' — دیرکرد ' + formatNum(Number(snap.amount) - Number(linkedPlan.amount)) : '');
                r.planCarried = !!keepMoavagh;
                if (snap.account) linkedPlan.lastPayAccount = snap.account;
                r.allowPlanFieldEdit = true;
                hkSmsStamp(r);
                applied = true;
                appliedSec = s;
              });
            });
            /* اگر بعد از همگام‌سازی ردیف پیدا نشد، حتماً بساز تا در جدول دیده شود */
            if (!applied) {
              var fallSec = targetSec || sec;
              if (!fallSec) {
                fallSec = ensureSmsSection('expense', 'برداشت بانکی', targetPd);
              }
              if (fallSec) {
                if (!Array.isArray(fallSec.rows)) fallSec.rows = [];
                var nr = emptyRow();
                nr.fromPlanId = linkedPlan.id;
                nr.fromPlanIndex = linkedIdx;
                nr.status = 'paid';
                nr.amount = snap.amount;
                if (snap.day) nr.day = snap.day;
                if (snap.account) nr.account = snap.account;
                nr.desc = planInstallmentDesc(linkedPlan, linkedIdx, cnt) + (keepMoavagh ? ' (معوق)' : '');
                nr.planCarried = !!keepMoavagh;
                nr.allowPlanFieldEdit = true;
                hkSmsStamp(nr);
                var emptyIdxN = fallSec.rows.findIndex(function(r) {
                  return r && !r.desc && !r.amount && !r.day && !r.fromPlanId;
                });
                if (emptyIdxN >= 0) fallSec.rows[emptyIdxN] = nr;
                else fallSec.rows.push(nr);
                fallSec.collapsed = false;
                appliedSec = fallSec;
                applied = true;
              }
            }
            if (appliedSec) {
              sec = appliedSec;
              targetSec = appliedSec;
            }
          } catch (eSync) {
            try { showToast('خطا در همگام‌سازی قسط'); } catch (eT) {}
          }
          /* هر معوقِ این قسط در ماه‌های بعد از تاریخ پرداخت حذف شود (چندماهه هم) */
          try {
            removeCarriedInstallmentRows(linkedPlan.id, linkedIdx, targetYear, targetMonth);
          } catch (eRm) {}
          try {
            if (!periodCtx.isCurrent && typeof syncPlansToExpensePeriod === 'function') {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            } else if (typeof syncPlansToExpensePeriod === 'function') {
              syncPlansToExpensePeriod(periodData, currentYear, currentMonth);
            }
          } catch (eSync2) {}
          try { if (typeof checkInstallReminders === 'function') checkInstallReminders(); } catch (eR2) {}
          try { updateInstallSummary(); } catch (eU) {}
          try { checkInstallReminders(); } catch (eR) {}
          sec = targetSec || sec;
        } else {
          /* ردیف پیدا نشد — ردیف جدید لینک‌شده به قسط */
          const row = emptyRow();
          row.day = day;
          row.amount = amount;
          row.status = 'paid';
          row.account = bank;
          row.fromPlanId = linkedPlan.id;
          row.fromPlanIndex = linkedIdx;
          row.desc = baseDesc;
          row.viaSms = true;
          try { var _rl2 = hkSmsRialFor(amount); if (_rl2) row.amountRial = _rl2; } catch (eRl2) {}
          row.allowPlanFieldEdit = true;
          hkSmsStamp(row);
          try { row.financialContext = readSmsFinancialContext('expense'); } catch (eFcP) {}
          const emptyIdx = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
          if (emptyIdx >= 0) sec.rows[emptyIdx] = row;
          else sec.rows.push(row);
          const need = linkedIdx + 1;
          const curPaid = Math.max(0, parseInt(linkedPlan.paidCount, 10) || 0);
          if (curPaid < need) linkedPlan.paidCount = Math.min(cnt, need);
        }
      } else {
        /* تراکنش عادی بدون لینک قسط — حساب جدید خودکار ساخته نشود */
        const row = emptyRow();
        row.day = day;
        row.desc = desc;
        row.amount = amount;
        row.status = 'paid';
        row.account = bank;
        row.viaSms = true; /* برای تشخیص «پیامک بانکی در برابر ثبت دستی» */
        hkSmsStamp(row);
        try { var _rl = hkSmsRialFor(amount); if (_rl) row.amountRial = _rl; } catch (eRl) {}
        try {
          row.financialContext = readSmsFinancialContext(tab);
          // تخصیص خودکار مخارج پروژه — amount همین تومان canonical است
          if (tab === 'expense' && row.financialContext && row.financialContext.accountType === 'project' &&
              row.financialContext.subjectId && row.financialContext.subjectId !== 'personal') {
            var alloc = allocateProjectExpense(row.financialContext.subjectId, amount);
            row.financialContext.projectAmount = alloc.projectAmount;
            row.financialContext.personalAdvanceAmount = alloc.personalAdvanceAmount;
            row.financialContext.fundingSource = alloc.fundingSource;
            if (alloc.personalAdvanceAmount > 0) row.createsReceivable = true;
          } else if (tab === 'income' && row.financialContext && row.financialContext.accountType === 'project') {
            row.financialContext.projectAmount = amount;
            row.financialContext.personalAdvanceAmount = 0;
            row.financialContext.fundingSource = 'subject';
          }
        } catch (eFc) { row.financialContext = defaultFinancialContext(); }
        const emptyIdx = (sec.rows || []).findIndex(r => !r.desc && !r.amount && !r.day && !r.fromPlanId);
        if (emptyIdx >= 0) sec.rows[emptyIdx] = row;
        else sec.rows.push(row);
      }
      if (sec && sec.rows) {
        sec.rows.sort((a, b) => {
          const da = parseInt(a.day, 10) || 99;
          const db = parseInt(b.day, 10) || 99;
          return da - db || hkTimeCmp(a, b);
        });
        sec.collapsed = false;
      }

      if (!sec || !Array.isArray(sec.rows)) {
        showToast('ثبت انجام نشد. بخش مقصد را بررسی کنید');
        return;
      }
      /* اگر ردیف هنوز اضافه نشده، همین‌جا بساز (ایمنی نهایی) */
      var hasMatching = sec.rows.some(function(r) {
        if (!r) return false;
        if (Number(r.amount) === Number(amount) && (r.desc || '') === (desc || '')) return true;
        if (r.fromPlanId && Number(r.amount) === Number(amount)) return true;
        return false;
      });
      if (!hasMatching) {
        var safety = emptyRow();
        safety.day = day || '';
        safety.desc = desc || (tab === 'income' ? 'واریز بانکی' : 'برداشت بانکی');
        safety.amount = amount;
        safety.status = 'paid';
        safety.account = bank || '';
        safety.viaSms = true;
        hkSmsStamp(safety);
        try {
          safety.financialContext = readSmsFinancialContext(tab);
          if (tab === 'expense' && safety.financialContext && safety.financialContext.accountType === 'project' &&
              safety.financialContext.subjectId && safety.financialContext.subjectId !== 'personal') {
            var allocS = allocateProjectExpense(safety.financialContext.subjectId, amount);
            safety.financialContext.projectAmount = allocS.projectAmount;
            safety.financialContext.personalAdvanceAmount = allocS.personalAdvanceAmount;
            safety.financialContext.fundingSource = allocS.fundingSource;
          } else if (tab === 'income' && safety.financialContext && safety.financialContext.accountType === 'project') {
            safety.financialContext.projectAmount = amount;
            safety.financialContext.personalAdvanceAmount = 0;
            safety.financialContext.fundingSource = 'subject';
          }
        } catch (eSf) {}
        var emptyIdxS = sec.rows.findIndex(function(r) {
          return r && !r.desc && !r.amount && !r.day && !r.fromPlanId;
        });
        if (emptyIdxS >= 0) sec.rows[emptyIdxS] = safety;
        else sec.rows.push(safety);
      }
      sec.collapsed = false;
      try {
        if (!periodCtx.isCurrent) {
          archive[periodCtx.key] = targetPd;
        } else {
          periodData = targetPd;
        }
      } catch (eForce) {}
      commitWritablePeriodData(periodCtx);
      try { persistCurrent(); } catch (eP) {}
      try { saveArchive(); } catch (eA) {}
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('hesab_force_flush', String(Date.now()));
        }
      } catch (eL) {}
      scheduleSave();
      closeSmsConfirmModal();
      var periodNote = '';
      try {
        if (targetYear !== currentYear || targetMonth !== currentMonth) {
          periodNote = ' در ' + (MONTHS[targetMonth - 1] || '') + ' ' + toPersianDigits(targetYear);
        }
        /* همیشه بعد از ثبت به ماه تراکنش برو تا ردیف همان لحظه دیده شود */
        if (typeof navigateToPeriod === 'function') {
          navigateToPeriod(targetYear, targetMonth);
        } else {
          currentYear = targetYear;
          currentMonth = targetMonth;
          try { loadCurrent(); } catch (eL2) {}
        }
      } catch (eN) {}
      if (currentTab !== tab) switchTab(tab);
      else renderAll();
      var secNote = (sec && sec.title) ? (' — ' + sec.title) : '';
      /* کوتاه: تا انیمیشن چرخش عدد موجودی دیده شود */
      showToast((tab === 'income' ? 'واریز' : 'برداشت') + ' ثبت شد: ' + formatNum(amount) + periodNote + secNote, 900);
      try {
        if (sec) {
          const el = document.getElementById('sec-' + tab + '-' + sec.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {}
      try {
        var sidRefresh = '';
        try {
          var fcR = (typeof readSmsFinancialContext === 'function') ? null : null;
        } catch (e0) {}
        /* از ردیف ثبت‌شده subjectId را بردار */
        try {
          var lastRows = (sec && sec.rows) ? sec.rows : [];
          for (var ri = lastRows.length - 1; ri >= 0; ri--) {
            var rr = lastRows[ri];
            var fcr = rr && rr.financialContext;
            if (fcr && fcr.subjectId && fcr.subjectId !== 'personal') {
              sidRefresh = fcr.subjectId;
              break;
            }
          }
        } catch (eS) {}
        if (typeof refreshOpenProjectViews === 'function') refreshOpenProjectViews(sidRefresh, { report: true });
      } catch (eRef) {}
      } catch (eConfirm) {
        try { console.error('confirmSmsEntry', eConfirm); } catch (e0) {}
        try { showToast('خطا در ثبت: ' + (eConfirm && eConfirm.message ? eConfirm.message : 'نامشخص')); } catch (e1) {}
      }
    }

    // اگر نرم‌افزار داخل WebView با پل نیتیو باشد (مثلاً Capacitor)، از بیرون قابل فراخوانی است:
    // window.onBankSmsReceived(smsText)
    function isSmsConfirmOpen() {
      const m = document.getElementById('smsConfirmModal');
      return !!(m && m.classList.contains('open'));
    }
