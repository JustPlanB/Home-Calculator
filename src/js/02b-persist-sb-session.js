    function persistSbSession(data) {
      const access = data.access_token || (data.session && data.session.access_token) || '';
      const refresh = data.refresh_token || (data.session && data.session.refresh_token) || '';
      const user = data.user || (data.session && data.session.user) || {};
      const uid = user.id || '';
      const expIn = parseInt(data.expires_in || (data.session && data.session.expires_in) || '3600', 10) || 3600;
      supabaseAccessToken = access;
      supabaseUserId = uid;
      supabaseTokenExp = Date.now() + expIn * 1000;
      if (uid) {
        authUid = uid;
        localUid = uid;
        try { localStorage.setItem(STORAGE_KEY + '_uid', uid); } catch (e) {}
      }
      try {
        localStorage.setItem(STORAGE_KEY + '_sb_session', JSON.stringify({
          access_token: access,
          refresh_token: refresh,
          user_id: uid,
          expires_at: supabaseTokenExp
        }));
      } catch (e) {}
      return { userId: uid || currentUserId(), token: access || null };
    }
    async function sbFetch(path, options) {
      const auth = await ensureSupabaseAuth(false);
      if (!auth.token) throw new Error('no-auth');
      const url = SUPABASE_URL.replace(/\/+$/, '') + path;
      const opts = options || {};
      const headers = sbHeaders(auth.token, opts.headers || {});
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
      });
      return res;
    }
    function genShareCode() {
      // بدون O/0 و I/1/L
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let s = '';
      for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }
    function saveSharedAccountLocal() {
      try {
        localStorage.setItem(STORAGE_KEY + '_sharedAccount', JSON.stringify({
          account_id: sharedAccountId || '',
          share_code: familyCode || '',
          member_name: memberName || '',
          member_handle: memberHandle || '',
          user_id: supabaseUserId || authUid || localUid || '',
          updated_at: Date.now()
        }));
      } catch (e) {}
      try {
        if ((memberHandle || '').trim()) localStorage.setItem(STORAGE_KEY + '_memberHandle', normalizeHandle(memberHandle));
        if ((memberName || '').trim()) localStorage.setItem(STORAGE_KEY + '_memberName', (memberName || '').trim());
      } catch (e) {}
    }
    function loadSharedAccountLocal() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_sharedAccount');
        if (!raw) return;
        const o = JSON.parse(raw);
        if (o && o.account_id) sharedAccountId = o.account_id;
        if (o && o.share_code) familyCode = o.share_code;
        if (o && o.member_name && !(memberName || '').trim()) memberName = o.member_name;
        if (o && o.member_handle && !(memberHandle || '').trim()) memberHandle = o.member_handle;
      } catch (e) {}
      try {
        if (!(memberHandle || '').trim()) {
          const h = localStorage.getItem(STORAGE_KEY + '_memberHandle');
          if (h) memberHandle = h;
        }
        if (!(memberName || '').trim()) {
          const n = localStorage.getItem(STORAGE_KEY + '_memberName');
          if (n) memberName = n;
        }
      } catch (e) {}
    }
    function isLocallyOwnedRow(row) {
      if (!row || typeof row !== 'object') return false;
      const owner = (row.createdBy || '').trim();
      if (!owner) return true; // ردیف محلی بدون مالک
      if (owner === currentUserId()) return true;
      try { if (typeof isOwnedByMe === 'function' && isOwnedByMe(owner)) return true; } catch (e) {}
      const h = normalizeHandle(memberHandle);
      if (h && rowOwnerHandle(row) === h) return true;
      return false;
    }
    function stripForeignSharedData() {
      let removed = 0;
      const filterRows = (rows) => {
        if (!Array.isArray(rows)) return rows;
        const next = rows.filter(r => {
          if (isLocallyOwnedRow(r)) return true;
          removed++;
          return false;
        });
        if (!next.length) next.push(typeof emptyRow === 'function' ? emptyRow() : { day: '', desc: '', amount: 0, status: 'unpaid' });
        return next;
      };
      const walkPeriod = (pd) => {
        if (!pd) return;
        ['income', 'expense'].forEach(tab => {
          if (!pd[tab] || !Array.isArray(pd[tab].sections)) return;
          pd[tab].sections = pd[tab].sections.filter(sec => {
            // بخش متعلق به دیگری را حذف کن (اگر owner دارد)
            if (sec && (sec.createdBy || '').trim() && !isLocallyOwnedRow(sec)) {
              removed += (sec.rows || []).length || 1;
              return false;
            }
            if (sec) sec.rows = filterRows(sec.rows || []);
            return true;
          });
          // بخش پیش‌فرض اجباری نیست؛ اگر خالی شد همان‌طور بماند
        });
        if (pd.ledger && Array.isArray(pd.ledger.sections)) {
          pd.ledger.sections = pd.ledger.sections.filter(sec => {
            if (sec && (sec.createdBy || '').trim() && !isLocallyOwnedRow(sec)) {
              removed += (sec.rows || []).length || 1;
              return false;
            }
            if (sec) sec.rows = filterRows(sec.rows || []);
            return true;
          });
        }
      };
      walkPeriod(periodData);
      Object.keys(archive || {}).forEach(k => walkPeriod(archive[k]));
      // اقساط و درآمد ثابت دیگران
      try {
        const beforeP = (plans || []).length;
        plans = (plans || []).filter(p => isLocallyOwnedRow(p));
        removed += Math.max(0, beforeP - plans.length);
      } catch (e) {}
      try {
        const beforeR = (recurringIncomes || []).length;
        recurringIncomes = (recurringIncomes || []).filter(r => isLocallyOwnedRow(r));
        removed += Math.max(0, beforeR - recurringIncomes.length);
      } catch (e) {}
      return removed;
    }
    function leaveSharedAccount() {
      askConfirm('از حساب مشترک خارج می‌شوید؟ داده‌های دیگران (دریافتی از ابر) حذف می‌شود و فقط اطلاعات خودتان روی این دستگاه می‌ماند.', () => {
        try {
          const removed = stripForeignSharedData();
          familyCode = '';
          sharedAccountId = '';
          familyMembers = {};
          syncQueue = [];
          try { saveSyncQueue(); } catch (e) {}
          try { localStorage.removeItem(STORAGE_KEY + '_sharedAccount'); } catch (e) {}
          try {
            localStorage.setItem(STORAGE_KEY + '_sharedAccount', JSON.stringify({
              account_id: '', share_code: '', member_name: memberName || '', member_handle: memberHandle || '',
              user_id: '', updated_at: Date.now()
            }));
          } catch (e) {}
          setSyncStatus('محلی', 'ok');
          persistCurrent();
          saveArchive();
          updateFamilyUI();
          try { renderFamilyModalBody(); } catch (e) {}
          try { renderAll(); } catch (e) {}
          showToast(removed
            ? ('خارج شدید — ' + toPersianDigits(removed) + ' مورد دیگران حذف شد')
            : 'از حساب مشترک خارج شدید — حالت تک‌نفره');
        } catch (e) {
          console.error('[leaveSharedAccount]', e);
          showToast('خطا در خروج از حساب مشترک');
        }
      });
    }

    async function supabaseCreateSharedAccount() {
      const client = getSupabaseClient();
      if (!client) throw new Error('اتصال Supabase برقرار نشد');
      await ensureSupabaseAuth(true);
      if (!supabaseUserId) throw new Error('احراز هویت انجام نشده');
      const name = (memberName || '').trim() || 'عضو';
      const { data, error } = await client.rpc('create_shared_account', {
        p_member_name: name
      });
      if (error) {
        console.error('[Supabase] create_shared_account:', error);
        throw new Error(error.message || 'ساخت حساب ناموفق');
      }
      const row = Array.isArray(data) ? data[0] : data;
      const accountId = row && (row.account_id || row.id);
      const shareCode = row && (row.share_code || row.shareCode);
      if (!accountId || !shareCode) {
        console.error('[Supabase] پاسخ ناقص create:', data);
        throw new Error('پاسخ سرور ناقص است');
      }
      sharedAccountId = accountId;
      familyCode = String(shareCode).toUpperCase();
      saveSharedAccountLocal();
      return { account_id: sharedAccountId, share_code: familyCode };
    }

    async function supabaseJoinSharedAccount(code) {
      const client = getSupabaseClient();
      if (!client) throw new Error('اتصال Supabase برقرار نشد');
      await ensureSupabaseAuth(true);
      if (!supabaseUserId) throw new Error('احراز هویت انجام نشده');
      code = String(code || '').trim().toUpperCase();
      const name = (memberName || '').trim() || 'عضو';
      const { data, error } = await client.rpc('join_shared_account', {
        p_share_code: code,
        p_member_name: name
      });
      if (error) {
        const msg = (error.message || String(error));
        console.error('[Supabase] join_shared_account:', error);
        const low = msg.toLowerCase();
        if (/full|limit|capacity|maximum|max.?2|already.?full|پر/i.test(low)) throw new Error('full');
        if (/not.?found|invalid|no row|unknown|کد|code/i.test(low)) throw new Error('not-found');
        throw new Error(msg || 'پیوستن ناموفق');
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row && (row.account_id || row.id)) {
        sharedAccountId = row.account_id || row.id;
      } else if (typeof data === 'string' && data.length > 8) {
        sharedAccountId = data;
      }
      familyCode = code;
      if (row && (row.share_code || row.shareCode)) {
        familyCode = String(row.share_code || row.shareCode).toUpperCase();
      }
      if (!sharedAccountId) {
        // بعضی RPCها فقط موفقیت برمی‌گردانند؛ کد را نگه می‌داریم
        console.warn('[Supabase] join بدون account_id در پاسخ:', data);
      }
      saveSharedAccountLocal();
      return { account_id: sharedAccountId, share_code: familyCode };
    }

    async function supabaseUpsertAccountData(bundle) {
      if (!sharedAccountId) return false;
      const auth = await ensureSupabaseAuth(true);
      if (!auth.token) {
        console.warn('[Sync] upsert account_data: no auth token');
        return false;
      }
      const body = {
        account_id: sharedAccountId,
        payload: bundle,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId || supabaseUserId || null
      };
      // Upsert یک‌مرحله‌ای
      let res = await sbFetch('/rest/v1/account_data?on_conflict=account_id', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: body
      });
      if (res.ok) {
        console.log('[Sync] account_data upsert OK');
        return true;
      }
      // fallback: PATCH سپس POST
      const patch = await sbFetch('/rest/v1/account_data?account_id=eq.' + encodeURIComponent(sharedAccountId), {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: body
      });
      if (patch.ok) return true;
      const ins = await sbFetch('/rest/v1/account_data', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: body
      });
      if (!ins.ok) {
        let detail = '';
        try { detail = await ins.text(); } catch (e) {}
        console.error('[Sync] account_data upsert failed', ins.status, detail);
        lastPullError = 'ارسال account_data ناموفق: HTTP ' + ins.status + (detail ? (' — ' + detail.slice(0, 120)) : '');
        return false;
      }
      return true;
    }
    async function supabasePullAccountData() {
      if (!sharedAccountId && familyCode && SUPABASE_ENABLED) {
        try {
          const res = await sbFetch('/rest/v1/accounts?share_code=eq.' + encodeURIComponent(familyCode) + '&select=id,share_code', { method: 'GET' });
          if (res.ok) {
            const rows = await res.json();
            if (rows && rows[0]) sharedAccountId = rows[0].id;
          }
        } catch (e) {}
      }
      if (!sharedAccountId) {
        lastPullError = 'account_id خالی است';
        return false;
      }
      await ensureSupabaseAuth(true);
      const res = await sbFetch('/rest/v1/account_data?account_id=eq.' + encodeURIComponent(sharedAccountId) + '&select=payload,updated_at,updated_by', { method: 'GET' });
      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch (e) {}
        lastPullError = 'دریافت account_data ناموفق: HTTP ' + res.status + (detail ? (' — ' + detail.slice(0, 100)) : '');
        console.error('[Sync] pull account_data', res.status, detail);
        return false;
      }
      const rows = await res.json();
      if (!rows || !rows[0] || !rows[0].payload) {
        lastPullError = 'در ابر هنوز داده‌ای برای این حساب نیست — اول از دستگاه دیگر «ارسال به ابر» بزنید';
        return false;
      }
      const remote = rows[0].payload;
      applyBundle(remote);
      const remoteAt = (remote && remote.updatedAt) || Date.parse(rows[0].updated_at) || Date.now();
      localUpdatedAt = Math.max(localUpdatedAt || 0, remoteAt || 0);
      try { saveArchive(); } catch (e) {}
      try { loadCurrent(); } catch (e) {}
      console.log('[Sync] account_data applied, archive keys', Object.keys(archive || {}));
      return true;
    }
    async function supabaseLoadMembers() {
      if (!sharedAccountId) return;
      try {
        const res = await sbFetch('/rest/v1/account_members?account_id=eq.' + encodeURIComponent(sharedAccountId) + '&select=user_id,display_name,created_at', { method: 'GET' });
        if (!res.ok) return;
        const rows = await res.json();
        const map = {};
        (rows || []).forEach(m => {
          const raw = String(m.display_name || 'عضو');
          let handle = '';
          let name = raw;
          if (raw.indexOf('·') >= 0) {
            const parts = raw.split('·');
            name = (parts[0] || '').trim() || raw;
            handle = normalizeHandle(parts.slice(1).join('·'));
          }
          map[m.user_id] = {
            name: name,
            handle: handle,
            joinedAt: m.created_at ? Date.parse(m.created_at) : Date.now()
          };
        });
        familyMembers = map;
      } catch (e) {}
    }
    async function flushSyncQueue() {
      return; /* ابر حذف شد */

      if (!SUPABASE_ENABLED || !navigator.onLine) return;
      loadSyncQueue();
      if (!syncQueue.length) return;
      const left = [];
      for (let i = 0; i < syncQueue.length; i++) {
        const item = syncQueue[i];
        try {
          if (item.op === 'upsert_account_data') {
            sharedAccountId = item.payload.account_id || sharedAccountId;
            const ok = await supabaseUpsertAccountData(item.payload.bundle || getBundle());
            if (!ok) { item.tries = (item.tries || 0) + 1; if (item.tries < 8) left.push(item); }
          } else {
            left.push(item);
          }
        } catch (e) {
          item.tries = (item.tries || 0) + 1;
          if (item.tries < 8) left.push(item);
        }
      }
      syncQueue = left;
      saveSyncQueue();
    }
    async function supabasePush(manual) {
      if (!SUPABASE_ENABLED) return false;
      try {
        if (!sharedAccountId && familyCode) {
          await supabasePullAccountData();
        }
        if (!sharedAccountId) return false;
        registerSelfInFamily();
        const ok = await supabaseUpsertAccountData(getBundle());
        await flushSyncQueue();
        if (ok) {
          setSyncStatus('همگام با ابر' + (memberName ? ' — ' + memberName : ''), 'ok');
          if (manual) showToast('همگام‌سازی انجام شد');
        } else if (manual) {
          setSyncStatus('صف آفلاین', 'err');
          showToast('ذخیره محلی شد؛ با اینترنت همگام می‌شود');
        }
        return ok;
      } catch (e) {
        enqueueSync('upsert_account_data', { account_id: sharedAccountId, bundle: getBundle() });
        if (manual) showToast('آفلاین — در صف همگام‌سازی');
        return false;
      }
    }
    async function supabasePull(manual) {
      if (!SUPABASE_ENABLED) return false;
      try {
        const ok = await supabasePullAccountData();
        await supabaseLoadMembers();
        if (ok) {
          loadCurrent();
          initSelectors();
          updateTabUI();
          updateFamilyUI();
          renderAll();
          setSyncStatus('دریافت از ابر', 'ok');
          if (manual) showToast('داده از ابر دریافت شد');
        } else if (manual) showToast('داده‌ای در ابر نیست یا آفلاین هستید');
        await flushSyncQueue();
        return ok;
      } catch (e) {
        if (manual) showToast('دریافت ناموفق — حالت آفلاین');
        return false;
      }
    }

        function familyStorageKey(code) {
      return STORAGE_KEY + '_fam_' + (code || 'local');
    }

    function getBundle() {
      registerSelfInFamily();
      try { persistCurrent(); } catch (e) {}
      return {
        archive: archive,
        plans: plans || [],
        recurringIncomes: (typeof recurringIncomes !== 'undefined' && Array.isArray(recurringIncomes)) ? recurringIncomes : [],
        members: familyMembers || {},
        memberName: memberName || '',
        memberHandle: memberHandle || '',
        updatedAt: localUpdatedAt || Date.now()
      };
    }

    function applyBundle(obj) {
      if (!obj) return;
      // ادغام آرشیو: ماه‌های ریموت اضافه/جایگزین شوند
      if (obj.archive && typeof obj.archive === 'object') {
        if (!archive || typeof archive !== 'object') archive = {};
        Object.keys(obj.archive).forEach(pk => {
          archive[pk] = obj.archive[pk];
        });
      }
      if (Array.isArray(obj.plans)) {
        // ادغام اقساط بر اساس id
        const map = {};
        (plans || []).forEach(p => { if (p && p.id) map[p.id] = p; });
        obj.plans.forEach(p => {
          if (!p || !p.id) return;
          const local = map[p.id];
          if (!local || (Number(p.updatedAt) || 0) >= (Number(local.updatedAt) || 0)) map[p.id] = p;
        });
        plans = Object.keys(map).map(k => map[k]);
      }
      if (Array.isArray(obj.recurringIncomes)) {
        const map = {};
        (recurringIncomes || []).forEach(r => { if (r && r.id) map[r.id] = r; });
        obj.recurringIncomes.forEach(r => {
          if (!r || !r.id) return;
          const local = map[r.id];
          if (!local || (Number(r.updatedAt) || 0) >= (Number(local.updatedAt) || 0)) map[r.id] = r;
        });
        recurringIncomes = Object.keys(map).map(k => map[k]);
        try { saveRecurring(); 
        /* ۱.۳.۶۰: هنگام بالا آمدن نرم‌افزار، صفحه بعداً یک‌بار کامل ساخته می‌شود؛ اینجا فقط ذخیره (بی‌رندر و بی‌تغییر زمان ویرایش) */
        if (_hkBoot) { setTimeout(function () { try { persistCurrent(); } catch (e1) {} _hkSkipSame = true; try { saveArchive(); } catch (e2) {} _hkSkipSame = false; }, 450); } else {
        try { scheduleSave(); } catch (e) {}
        try { renderHomeCards(); } catch (e) {}
        try {
          if (typeof _detailContext !== 'undefined' && _detailContext && _detailContext.kind === 'income') {
            renderPersonDetailPanel('income', _detailContext.title);
          }
        } catch (e) {}
        }
} catch (e) {}
      }
      if (obj.members && typeof obj.members === 'object') {
        familyMembers = Object.assign({}, familyMembers || {}, obj.members);
      }
      if (obj.updatedAt) localUpdatedAt = Math.max(localUpdatedAt || 0, obj.updatedAt || 0);
    }

    var _hkBoot = false, _hkSkipSame = false;
    function touchLocal() {
      localUpdatedAt = Date.now();
    }

    /* ===== لایهٔ ذخیره‌سازی: شکست نوشتن بی‌صدا رد نمی‌شود =====
       hkStorageSet نتیجه را برمی‌گرداند (true/false) تا فراخوان بداند واقعاً ذخیره شده یا نه.
       پیام به کاربر یکی و با فاصله (چند خطای پشت‌سرهم = یک پیام). در کنسول فقط نام کلید و نوع خطا، هرگز محتوا. */
    var _hkPersist = { fails: 0, lastKind: '', lastKey: '', lastAt: 0, lastToastAt: 0, quiet: 0 };
    function hkIsQuotaError(e) {
      if (!e) return false;
      var n = String(e.name || ''), c = e.code;
      return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' || c === 22 || c === 1014;
    }
    function hkPersistFailed(key, e) {
      var quota = hkIsQuotaError(e);
      _hkPersist.fails++; _hkPersist.lastKind = quota ? 'quota' : 'error'; _hkPersist.lastKey = String(key || ''); _hkPersist.lastAt = Date.now();
      try { console.warn('storage: write failed for "' + _hkPersist.lastKey + '":', quota ? 'quota' : (e && e.name ? e.name : 'error')); } catch (eL) {}
      if (_hkPersist.quiet > 0) return;           /* عملیات بزرگ‌تر (مثل بازیابی) خودش یک پیام جمع‌بندی می‌دهد */
      if (Date.now() - _hkPersist.lastToastAt < 6000) return;
      _hkPersist.lastToastAt = Date.now();
      try {
        showToastLong(quota ? 'حافظهٔ ذخیره‌سازی پر است؛ آخرین تغییرات ذخیره نشد. پیش از بستن برنامه یک پشتیبان بگیرید.'
                            : 'ذخیرهٔ اطلاعات ناموفق بود؛ آخرین تغییرات ذخیره نشد. پیش از بستن برنامه یک پشتیبان بگیرید.');
      } catch (eT) {}
    }
    function hkStorageSet(key, value) {
      /* ۱.۳.۶۰: فقط ذخیرهٔ هنگام شروع: همان مقدار از قبل ذخیره است → نوشتن دوباره لازم نیست (نوشتن بزرگ روی گوشی کند است) */
      if (_hkSkipSame) { try { if (localStorage.getItem(key) === value) return true; } catch (eG) {} }
      try { localStorage.setItem(key, value); return true; }
      catch (e) { hkPersistFailed(key, e); return false; }
    }
    /** ذخیرهٔ آرشیو؛ true فقط وقتی هر سه کلید نوشته شده باشند.
        اول کلید خانواده (که بوت اول همان را می‌خواند)؛ اگر نشد، بقیه هم نوشته نمی‌شوند تا ذخیره‌ها ناهمسان نشوند. */
    function saveArchive() {
      var ok = false;
      try {
        if (!localUpdatedAt) localUpdatedAt = Date.now();
        const bundle = getBundle();
        const bundleStr = JSON.stringify(bundle);
        /* ۱.۳.۶۳: نسخهٔ دوم در IndexedDB (بی‌سقف ۵ میلیون حرفی)؛ علامت «جلوتر» قبل از نوشتن اصلی گذاشته و بعد از موفقیت برداشته می‌شود */
        if (!_hkMirrorHold) {
          try { if (!_hkSkipSame) localStorage.setItem(HK_MIRROR_FLAG, '1'); } catch (eF) {}
          hkMirrorSchedule(bundleStr, localUpdatedAt);
        }
        ok = hkStorageSet(familyStorageKey(familyCode), bundleStr) &&
        hkStorageSet(STORAGE_KEY + '_meta', JSON.stringify({
          familyCode: familyCode,
          memberName: memberName,
          firebaseUrl: firebaseUrl,
          firebaseApiKey: firebaseApiKey,
          localUid: localUid,
          authUid: authUid,
          authRefreshToken: authRefreshToken,
          sharedAccountId: sharedAccountId,
          currentYear: currentYear,
          currentMonth: currentMonth,
          currentTab: currentTab,
          localUpdatedAt: localUpdatedAt
        })) &&
        /* ۱.۳.۶۳: کلید اصلی دیگر نسخهٔ تکراری کل داده نیست (نصف فضا آزاد می‌شود)؛ داده فقط در کلید خانواده */
        hkStorageSet(STORAGE_KEY, JSON.stringify({ currentYear, currentMonth, currentTab, memberName }));
        if (ok && !_hkMirrorHold) { try { localStorage.removeItem(HK_MIRROR_FLAG); } catch (eR) {} }
      } catch (e) { hkPersistFailed('archive', e); ok = false; }
      scheduleRemotePush();
      return ok;
    }
    /* ===== ۱.۳.۶۳: نسخهٔ دوم آرشیو در IndexedDB =====
       بعد از هر ذخیره (با کمی مکث) آخرین آرشیو آنجا هم نوشته می‌شود. فقط وقتی به کار می‌رود که آخرین نوشتن اصلی
       شکست خورده باشد (علامت HK_MIRROR_FLAG مانده باشد)؛ آن‌وقت در بالا آمدن بعدی، اگر نسخهٔ IndexedDB جدیدتر باشد، همان خوانده می‌شود. */
    var HK_MIRROR_FLAG = STORAGE_KEY + '_mirrorAhead';
    /* وضعیت لحظهٔ بالا آمدن (پیش از هر ذخیره)؛ تا بررسی نسخهٔ دوم تمام نشده، ذخیره‌ها به علامت و نسخهٔ دوم دست نمی‌زنند */
    var _hkMirrorBoot = null, _hkMirrorHold = false;
    function hkMirrorNoteBoot(diskUpd) {
      if (_hkMirrorBoot) return;
      var flag = false, missing = false;
      try { flag = !!localStorage.getItem(HK_MIRROR_FLAG); missing = !localStorage.getItem(familyStorageKey(familyCode)); } catch (e) {}
      _hkMirrorBoot = { flag: flag, missing: missing, upd: Number(diskUpd) || 0 };
      _hkMirrorHold = flag || missing;
    }
    var HKStore = (function () {
      var DB = 'hk-store', ST = 'kv', _db = null;
      function db() {
        if (_db) return Promise.resolve(_db);
        return new Promise(function (res, rej) {
          try {
            var rq = indexedDB.open(DB, 1);
            rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains(ST)) rq.result.createObjectStore(ST); };
            rq.onsuccess = function () { _db = rq.result; res(_db); };
            rq.onerror = function () { rej(rq.error); };
          } catch (e) { rej(e); }
        });
      }
      function put(k, v) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { rej(t.error); }; }); }); }
      function get(k) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(ST, 'readonly'), rq = t.objectStore(ST).get(k); rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); }; }); }); }
      function del(k) { return db().then(function (d) { return new Promise(function (res) { var t = d.transaction(ST, 'readwrite'); t.objectStore(ST).delete(k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }); }
      return { put: put, get: get, del: del };
    })();
    var _hkMirrorT = null, _hkMirrorPending = null;
    function hkMirrorSchedule(str, upd) {
      if (typeof indexedDB === 'undefined') return;
      _hkMirrorPending = { v: str, upd: Number(upd) || 0, at: Date.now() };
      clearTimeout(_hkMirrorT);
      _hkMirrorT = setTimeout(hkMirrorFlush, 1500);
    }
    function hkMirrorFlush() {
      clearTimeout(_hkMirrorT); _hkMirrorT = null;
      var p = _hkMirrorPending; _hkMirrorPending = null;
      if (!p) return Promise.resolve(false);
      return HKStore.put('archive', p).catch(function () { return false; });
    }
    /* رفتن نرم‌افزار به پس‌زمینه: نوشتن معوق همان لحظه انجام شود */
    try { document.addEventListener('visibilitychange', function () { if (document.hidden && _hkMirrorPending) hkMirrorFlush(); }); window.addEventListener('pagehide', function () { if (_hkMirrorPending) hkMirrorFlush(); }); } catch (eVis) {}
    function hkMirrorClear() {
      clearTimeout(_hkMirrorT); _hkMirrorT = null; _hkMirrorPending = null;
      try { localStorage.removeItem(HK_MIRROR_FLAG); } catch (e) {}
      try { return HKStore.del('archive'); } catch (e2) { return Promise.resolve(false); }
    }
    /* بالا آمدن: اگر آخرین نوشتن اصلی ناموفق بوده و نسخهٔ IndexedDB جدیدتر است، یا کلید داده اصلاً نیست، همان جایگزین می‌شود */
    function hkMirrorRecover() {
      var st = _hkMirrorBoot || { flag: false, missing: false, upd: 0 };
      function done(r) { _hkMirrorHold = false; return r; }
      if ((!st.flag && !st.missing) || typeof indexedDB === 'undefined') return Promise.resolve(done(false));
      return HKStore.get('archive').then(function (m) {
        if (!m || !m.v || !(st.missing || Number(m.upd) > st.upd)) return done(false);
        var obj = JSON.parse(m.v);
        if (!obj || typeof obj !== 'object' || !obj.archive) return done(false);
        _hkMirrorHold = false;
        applyBundle(obj);
        localUpdatedAt = Math.max(Number(localUpdatedAt) || 0, Number(m.upd) || 0);
        try { loadCurrent(); } catch (e1) {}
        try { renderAll(); } catch (e2) {}
        try { if (saveArchive()) localStorage.removeItem(HK_MIRROR_FLAG); } catch (e3) {}
        return true;
      }).catch(function () { return done(false); });
    }

    function loadArchive() {
      try {
        const metaRaw = localStorage.getItem(STORAGE_KEY + '_meta');
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          familyCode = meta.familyCode || '';
          memberName = meta.memberName || '';
          firebaseUrl = meta.firebaseUrl || '';
          firebaseApiKey = meta.firebaseApiKey || '';
          localUid = meta.localUid || '';
          authUid = meta.authUid || '';
          authRefreshToken = meta.authRefreshToken || '';
          sharedAccountId = meta.sharedAccountId || '';
          if (meta.currentYear) currentYear = meta.currentYear;
          if (meta.currentMonth) currentMonth = meta.currentMonth;
          if (['expense', 'income', 'install', 'balance'].includes(meta.currentTab)) currentTab = meta.currentTab;
          if (meta.localUpdatedAt) localUpdatedAt = meta.localUpdatedAt;
        }
        try { hkMirrorNoteBoot(localUpdatedAt); } catch (eMb) {}
        let raw = localStorage.getItem(familyStorageKey(familyCode));
        if (!raw) { raw = localStorage.getItem(STORAGE_KEY); if (raw && raw.indexOf('"archive"') < 0) raw = null; /* ۱.۳.۶۳: کلید اصلی کوچک‌شده داده ندارد */ }
        if (!raw) raw = localStorage.getItem('hesabKetabArchive_v4');
        if (!raw) raw = localStorage.getItem('hesabKetabArchive_v3');
        if (!raw) raw = localStorage.getItem('hesabKetabArchive_v2');
        if (!raw) raw = localStorage.getItem('hesabKetabArchive_v1');
        if (raw) {
          const obj = JSON.parse(raw);
          applyBundle(obj);
          // سازگاری نسخه‌های قدیمی که ماه را داخل bundle داشتند
          if (obj.currentYear && !metaRaw) currentYear = obj.currentYear;
          if (obj.currentMonth && !metaRaw) currentMonth = obj.currentMonth;
          if (!localUpdatedAt && obj.updatedAt) localUpdatedAt = obj.updatedAt;
          return true;
        }
      } catch (e) {}
      return false;
    }

    function randomFamilyCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s = '';
      for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }


    function ensureLocalUid() {
      if (localUid && String(localUid).length > 8) return localUid;
      try {
        const stored = localStorage.getItem(STORAGE_KEY + '_uid');
        if (stored && stored.length > 8) { localUid = stored; return localUid; }
      } catch (e) {}
      localUid = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(STORAGE_KEY + '_uid', localUid); } catch (e) {}
      return localUid;
    }
    function currentUserId() {
      ensureLocalUid();
      return (authUid && String(authUid).length > 4) ? authUid : localUid;
    }
    function newRecordId() {
      return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }
    function normalizeHandle(h) {
      return String(h || '').trim().toLowerCase().replace(/\s+/g, '');
    }
    /** نمایش @handle: لاتین → @ سمت چپ؛ فارسی → @ سمت راست */
    function formatHandleDisplay(handle) {
      const h = String(handle || '').trim();
      if (!h) return '';
      const isLatin = /^[a-zA-Z0-9._-]+$/.test(h);
      if (isLatin) {
        return '<span class="fam-handle" dir="ltr">@' + escapeHtml(h) + '</span>';
      }
      return '<span class="fam-handle" dir="rtl">' + escapeHtml(h) + '@</span>';
    }
    function isHandleTakenByOther(handle, myUid) {
      const h = normalizeHandle(handle);
      if (!h) return false;
      const me = myUid || currentUserId();
      const members = familyMembers || {};
      return Object.keys(members).some(uid => {
        if (uid === me) return false;
        const mh = normalizeHandle(members[uid] && (members[uid].handle || members[uid].name));
        if (mh === h) return true;
        // display_name ممکن است «نام · handle» باشد
        const raw = String((members[uid] && members[uid].name) || '');
        if (raw.indexOf('·') >= 0) {
          const parts = raw.split('·').map(s => normalizeHandle(s));
          if (parts.some(p => p === h)) return true;
        }
        return false;
      });
    }
    function myOwnerHandles() {
      const set = new Set();
      const h = normalizeHandle(memberHandle);
      if (h) set.add(h);
      const n = normalizeHandle(memberName);
      if (n) set.add(n);
      return set;
    }
    function rowOwnerHandle(row) {
      if (!row) return '';
      const h = normalizeHandle(row.ownerHandle || row.createdByHandle || '');
      if (h) return h;
      return normalizeHandle(row.createdByName || '');
    }
    function canEditRow(row) {
      if (!row) return true;
      if (row.deletedAt) return false;
      /* قسط گذشته (قفل): فقط برای دیدن */
      if (row.planLocked && row.fromPlanId) return false;
      const owner = (row.createdBy || '').trim();
      if (!owner) return true;
      if (owner === currentUserId()) return true;
      try { if (typeof isOwnedByMe === 'function' && isOwnedByMe(owner)) return true; } catch (e) {}
      const handles = myOwnerHandles();
      if (handles.size) {
        const rh = rowOwnerHandle(row);
        if (rh && handles.has(rh)) return true;
      }
      return false;
    }
    function ensureRecordMeta(row) {
      if (!row || typeof row !== 'object') return row;
      if (!row.id) row.id = newRecordId();
      const now = Date.now();
      if (!row.createdAt) row.createdAt = now;
      row.updatedAt = now;
      if (row.deletedAt === undefined) row.deletedAt = null;
      return row;
    }
    function ownerAuthUid() {
      // برای RLS باید auth.uid() باشد نه localUid
      if (supabaseUserId && String(supabaseUserId).length > 8) return supabaseUserId;
      if (authUid && String(authUid).length > 8) return authUid;
      return currentUserId();
    }
    function stampRowOwner(row) {
      if (!row) return;
      ensureRecordMeta(row);
      if (!(row.createdBy || '').trim()) {
        row.createdBy = ownerAuthUid();
        const nm = (memberName || '').trim();
        if (nm) row.createdByName = nm;
        const h = normalizeHandle(memberHandle) || normalizeHandle(memberName);
        if (h) row.ownerHandle = h;
        row.createdAt = row.createdAt || Date.now();
      } else if (canEditRow(row)) {
        if (!normalizeHandle(row.ownerHandle)) {
          const h = normalizeHandle(memberHandle) || normalizeHandle(memberName);
          if (h) row.ownerHandle = h;
        }
        if (!(row.createdByName || '').trim()) {
          const nm = (memberName || '').trim();
          if (nm) row.createdByName = nm;
        }
      }
      row.updatedAt = Date.now();
    }
    function registerSelfInFamily() {
      if (!familyCode) return;
      const uid = currentUserId();
      if (!familyMembers || typeof familyMembers !== 'object') familyMembers = {};
      const prev = familyMembers[uid] || {};
      const h = normalizeHandle(memberHandle) || normalizeHandle(memberName) || normalizeHandle(prev.handle);
      familyMembers[uid] = {
        name: (memberName || '').trim() || prev.name || 'بدون نام',
        handle: h || prev.handle || '',
        joinedAt: prev.joinedAt || Date.now()
      };
    }
    function reclaimRowsByHandle() {
      const h = normalizeHandle(memberHandle) || normalizeHandle(memberName);
      if (!h) return 0;
      const uid = ownerAuthUid();
      let n = 0;
      const touchRow = (row) => {
        if (!row || typeof row !== 'object') return;
        const rh = rowOwnerHandle(row);
        if (rh && rh === h) {
          row.createdBy = uid;
          if ((memberName || '').trim()) row.createdByName = (memberName || '').trim();
          row.ownerHandle = h;
          row.updatedAt = Date.now();
          n++;
        }
      };
      const walkPeriod = (pd) => {
        if (!pd) return;
        ['income', 'expense'].forEach(tab => {
          ((pd[tab] && pd[tab].sections) || []).forEach(sec => {
            touchRow(sec);
            (sec.rows || []).forEach(touchRow);
          });
        });
        if (pd.ledger && pd.ledger.sections) {
          pd.ledger.sections.forEach(sec => {
            touchRow(sec);
            (sec.rows || []).forEach(touchRow);
          });
        }
      };
      walkPeriod(periodData);
      Object.keys(archive || {}).forEach(k => walkPeriod(archive[k]));
      (plans || []).forEach(touchRow);
      try { (recurringIncomes || []).forEach(touchRow); } catch (e) {}
      return n;
    }
    function formatJoinedFa(ts) {
      if (!ts) return '';
      try {
        const d = new Date(ts);
        return toPersianDigits(d.toLocaleDateString('fa-IR'));
      } catch (e) { return ''; }
    }

    async function ensureFirebaseAuth(force) {
      ensureLocalUid();
      if (!firebaseApiKey) return { uid: currentUserId(), token: null };
      const now = Date.now();
      if (!force && authIdToken && authTokenExp > now + 60000) {
        return { uid: authUid || currentUserId(), token: authIdToken };
      }
      try {
        if (authRefreshToken) {
          const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(firebaseApiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(authRefreshToken)
          });
          if (r.ok) {
            const data = await r.json();
            authIdToken = data.id_token || data.idToken || '';
            authRefreshToken = data.refresh_token || data.refreshToken || authRefreshToken;
            authUid = data.user_id || data.userId || authUid;
            const expSec = parseInt(data.expires_in || data.expiresIn || '3600', 10) || 3600;
            authTokenExp = Date.now() + expSec * 1000;
            if (authUid) return { uid: authUid, token: authIdToken };
          }
        }
        // Anonymous sign-up
        const r2 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(firebaseApiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true })
        });
        if (r2.ok) {
          const data = await r2.json();
          authIdToken = data.idToken || '';
          authRefreshToken = data.refreshToken || '';
          authUid = data.localId || '';
          const expSec = parseInt(data.expiresIn || '3600', 10) || 3600;
          authTokenExp = Date.now() + expSec * 1000;
          try { localStorage.setItem(STORAGE_KEY + '_uid', authUid || localUid); } catch (e) {}
          if (authUid) localUid = authUid;
          return { uid: authUid || currentUserId(), token: authIdToken };
        }
      } catch (e) {}
      return { uid: currentUserId(), token: null };
    }

    function updateFamilyUI() {
      const label = document.getElementById('familyCodeLabel');
      if (label) label.textContent = familyCode || 'محلی';
      const inp = document.getElementById('memberNameInp');
      if (inp && document.activeElement !== inp) inp.value = memberName || '';
      // رندر بدنه مودال اگر باز است
      const body = document.getElementById('familyModalBody');
      if (body && document.getElementById('familyModal') &&
          document.getElementById('familyModal').classList.contains('open')) {
        renderFamilyModalBody();
      }
    }

    function onMemberChange() {
      const inp = document.getElementById('memberNameInp');
      memberName = (inp && inp.value || '').trim();
      registerSelfInFamily();
      saveSharedAccountLocal();
      touchLocal();
      scheduleSave();
    }
    function onHandleChange() {
      const inp = document.getElementById('memberHandleInp');
      memberHandle = normalizeHandle(inp && inp.value || '');
      if (familyCode && isHandleTakenByOther(memberHandle)) {
        showToast('این نام کاربری متعلق به عضو دیگری است');
      }
      registerSelfInFamily();
      saveSharedAccountLocal();
      touchLocal();
      scheduleSave();
    }

    function setFamilyTab(tab) {
      familyModalTab = tab === 'create' ? 'create' : 'join';
      renderFamilyModalBody();
    }

    function onJoinCodeInput() {
      const inp = document.getElementById('joinCodeInp');
      const btn = document.getElementById('joinFamilyBtn');
      if (!btn) return;
      const v = (inp && inp.value || '').trim();
      btn.disabled = v.length < 4;
    }

    const ICON_SVG_SHARE = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="8.6" y1="10.6" x2="15.4" y2="6.4" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="8.6" y1="13.4" x2="15.4" y2="17.6" stroke="currentColor" stroke-width="2"/>' +
      '</svg>';
    const ICON_SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="8" width="12" height="12" rx="4" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

