    /* ===================== Supabase Shared Account (Offline-first) ===================== */
    function loadSyncQueue() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_sync_queue');
        syncQueue = raw ? (JSON.parse(raw) || []) : [];
      } catch (e) { syncQueue = []; }
    }
    function saveSyncQueue() {
      try { localStorage.setItem(STORAGE_KEY + '_sync_queue', JSON.stringify(syncQueue || [])); } catch (e) {}
    }
    function enqueueSync(op, payload) {
      // صف فقط وقتی حساب مشترک فعال است و کاربر بعداً «ارسال به ابر» می‌زند معنا دارد
      if (!sharedAccountId || !SUPABASE_ENABLED) return;
      loadSyncQueue();
      if (op === 'upsert_record' && payload && payload.id) {
        syncQueue = syncQueue.filter(item => !(item.op === 'upsert_record' && item.payload && item.payload.id === payload.id));
      }
      if (op === 'delete_record' && payload && payload.id) {
        syncQueue = syncQueue.filter(item => !(item.op === 'upsert_record' && item.payload && item.payload.id === payload.id));
      }
      syncQueue.push({
        id: 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        op: op,
        payload: payload || {},
        createdAt: Date.now(),
        tries: 0
      });
      // ذخیره صف را هم سبک نگه دار — فقط هنگام ارسال به ابر flush می‌شود
      try {
        clearTimeout(window._syncQueueSaveTimer);
        window._syncQueueSaveTimer = setTimeout(() => { try { saveSyncQueue(); } catch (e) {} }, 1200);
      } catch (e) { try { saveSyncQueue(); } catch (e2) {} }
    }

    function migrateLocalRecordsForSync() {
      Object.keys(archive || {}).forEach(pk => {
        const pd = archive[pk];
        if (!pd) return;
        ['expense', 'income'].forEach(tab => {
          const block = pd[tab];
          if (!block || !Array.isArray(block.sections)) return;
          block.sections.forEach(sec => {
            if (!sec.id) sec.id = newRecordId();
            (sec.rows || []).forEach(r => {
              if (!r.id) r.id = newRecordId();
              if (!r.createdAt && (r.desc || r.amount || r.day)) r.createdAt = Date.now();
              if (!r.updatedAt) r.updatedAt = r.createdAt || 0;
              if (r.deletedAt === undefined) r.deletedAt = null;
            });
          });
        });
        if (pd.ledger && Array.isArray(pd.ledger.sections)) {
          pd.ledger.sections.forEach(sec => {
            if (!sec.id) sec.id = newRecordId();
            (sec.rows || []).forEach(r => {
              if (!r.id) r.id = newRecordId();
              if (!r.createdAt && (r.desc || r.amount || r.day)) r.createdAt = Date.now();
              if (!r.updatedAt) r.updatedAt = r.createdAt || 0;
              if (r.deletedAt === undefined) r.deletedAt = null;
            });
          });
        }
      });
      (plans || []).forEach(p => {
        if (!p.id) p.id = newRecordId();
        if (!p.createdAt) p.createdAt = Date.now();
        if (!p.updatedAt) p.updatedAt = p.createdAt;
        if (p.deletedAt === undefined) p.deletedAt = null;
      });
      (recurringIncomes || []).forEach(r => {
        if (!r.id) r.id = newRecordId();
        if (!r.createdAt) r.createdAt = Date.now();
        if (!r.updatedAt) r.updatedAt = r.createdAt;
        if (r.deletedAt === undefined) r.deletedAt = null;
      });
    }

    function collectLocalSharedRecords() {
      migrateLocalRecordsForSync();
      const out = [];
      function pushRow(kind, periodKey, sectionId, sectionTitle, row) {
        if (!row || !row.id) return;
        const empty = !row.desc && !row.amount && !row.day && !row.name;
        if (empty && !row.deletedAt) return;
        out.push({
          id: row.id,
          account_id: sharedAccountId,
          kind: kind,
          period_key: periodKey || null,
          section_id: sectionId || null,
          section_title: sectionTitle || null,
          payload: row,
          created_by: row.createdBy || ownerAuthUid(),
          created_by_name: row.createdByName || (memberName || '').trim() || null,
          created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
          updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
          deleted_at: row.deletedAt ? new Date(row.deletedAt).toISOString() : null
        });
      }
      Object.keys(archive || {}).forEach(pk => {
        const pd = archive[pk];
        if (!pd) return;
        ['expense', 'income'].forEach(tab => {
          const block = pd[tab];
          if (!block || !Array.isArray(block.sections)) return;
          block.sections.forEach(sec => {
            if (sec.id) {
              out.push({
                id: 'sec_' + sec.id + '_' + tab + '_' + pk,
                account_id: sharedAccountId,
                kind: tab + '_section',
                period_key: pk,
                section_id: sec.id,
                section_title: sec.title || '',
                payload: { id: sec.id, title: sec.title || '', color: sec.color || '', collapsed: !!sec.collapsed },
                created_by: sec.createdBy || currentUserId(),
                created_by_name: sec.createdByName || memberName || '',
                created_at: new Date(sec.createdAt || Date.now()).toISOString(),
                updated_at: new Date(sec.updatedAt || Date.now()).toISOString(),
                deleted_at: sec.deletedAt ? new Date(sec.deletedAt).toISOString() : null
              });
            }
            (sec.rows || []).forEach(r => pushRow(tab + '_row', pk, sec.id, sec.title || '', r));
          });
        });
        if (pd.ledger && Array.isArray(pd.ledger.sections)) {
          pd.ledger.sections.forEach(sec => {
            if (sec.id) {
              out.push({
                id: 'lsec_' + sec.id + '_' + pk,
                account_id: sharedAccountId,
                kind: 'ledger_section',
                period_key: pk,
                section_id: sec.id,
                section_title: ((sec.personA || '') + ' / ' + (sec.personB || '')),
                payload: { id: sec.id, personA: sec.personA || '', personB: sec.personB || '', collapsed: !!sec.collapsed },
                created_by: sec.createdBy || currentUserId(),
                created_by_name: sec.createdByName || memberName || '',
                created_at: new Date(sec.createdAt || Date.now()).toISOString(),
                updated_at: new Date(sec.updatedAt || Date.now()).toISOString(),
                deleted_at: sec.deletedAt ? new Date(sec.deletedAt).toISOString() : null
              });
            }
            (sec.rows || []).forEach(r => pushRow('ledger_row', pk, sec.id, '', r));
          });
        }
      });
      (plans || []).forEach(p => {
        if (!p || !p.id) return;
        out.push({
          id: p.id, account_id: sharedAccountId, kind: 'plan', period_key: null, section_id: null, section_title: null,
          payload: p, created_by: p.createdBy || null, created_by_name: p.createdByName || null,
          created_at: new Date(p.createdAt || Date.now()).toISOString(),
          updated_at: new Date(p.updatedAt || Date.now()).toISOString(),
          deleted_at: p.deletedAt ? new Date(p.deletedAt).toISOString() : null
        });
      });
      (recurringIncomes || []).forEach(r => {
        if (!r || !r.id) return;
        out.push({
          id: r.id, account_id: sharedAccountId, kind: 'recurring', period_key: null, section_id: null, section_title: null,
          payload: r, created_by: r.createdBy || null, created_by_name: r.createdByName || null,
          created_at: new Date(r.createdAt || Date.now()).toISOString(),
          updated_at: new Date(r.updatedAt || Date.now()).toISOString(),
          deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null
        });
      });
      return out;
    }

    function ensurePeriodInArchive(pk) {
      if (!archive[pk]) archive[pk] = emptyPeriodData();
      const pd = archive[pk];
      if (!pd.expense) pd.expense = { sections: [], nextId: 1 };
      if (!pd.income) pd.income = { sections: [], nextId: 1 };
      if (!pd.ledger) pd.ledger = { sections: [], nextId: 1 };
      return pd;
    }

    function findOrCreateSection(block, sectionId, title, color) {
      if (!block.sections) block.sections = [];
      let sec = block.sections.find(s => s.id === sectionId);
      if (!sec && title) sec = block.sections.find(s => (s.title || '').trim() === (title || '').trim());
      if (!sec) {
        sec = { id: sectionId || newRecordId(), title: title || '', color: color || '#08b5f5', rows: [], collapsed: false };
        block.sections.push(sec);
      }
      return sec;
    }

    function applyRemoteSharedRecord(rec) {
      // returns: 'merged' | 'skipped' | 'ignored'
      if (!rec || !rec.id) return 'ignored';
      let payload = rec.payload;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
      }
      if (!payload || typeof payload !== 'object') payload = {};

      let kind = rec.kind || payload.kind || '';
      if (!kind) return 'ignored';

      const updatedAt = rec.updated_at ? Date.parse(rec.updated_at) : (Number(payload.updatedAt) || 0);
      const deletedAt = rec.deleted_at ? Date.parse(rec.deleted_at) : (payload.deletedAt || null);

      function mergeRowInto(arr) {
        if (!Array.isArray(arr)) return 'ignored';
        const id = payload.id || rec.id;
        const idx = arr.findIndex(x => x && x.id === id);
        const local = idx >= 0 ? arr[idx] : null;
        // فقط اگر local واقعاً جدیدتر و دارای داده باشد رد کن
        const localHasData = local && (local.desc || local.amount || local.day || local.name);
        if (localHasData && (local.updatedAt || 0) > updatedAt) return 'skipped';
        const merged = Object.assign({}, local || {}, payload, {
          id: id,
          day: payload.day != null ? payload.day : (local && local.day) || '',
          desc: payload.desc != null ? payload.desc : (local && local.desc) || '',
          amount: payload.amount != null ? payload.amount : (local && local.amount) || 0,
          status: payload.status != null ? payload.status : (local && local.status) || '',
          account: payload.account != null ? payload.account : (local && local.account) || '',
          createdBy: rec.created_by || payload.createdBy || (local && local.createdBy) || '',
          createdByName: rec.created_by_name || payload.createdByName || (local && local.createdByName) || '',
          createdAt: payload.createdAt || (rec.created_at ? Date.parse(rec.created_at) : Date.now()),
          updatedAt: updatedAt || Date.now(),
          deletedAt: deletedAt
        });
        if (idx >= 0) arr[idx] = merged; else arr.push(merged);
        return 'merged';
      }

      const pk = rec.period_key || payload.period_key || null;

      if (kind === 'expense_row' || kind === 'income_row') {
        const tab = kind === 'expense_row' ? 'expense' : 'income';
        if (!pk) return 'ignored';
        const pd = ensurePeriodInArchive(pk);
        if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
        const sec = findOrCreateSection(pd[tab], rec.section_id, rec.section_title || payload._sectionTitle || '');
        if (!sec.rows) sec.rows = [];
        return mergeRowInto(sec.rows);
      }
      if (kind === 'ledger_row') {
        if (!pk) return 'ignored';
        const pd = ensurePeriodInArchive(pk);
        if (!pd.ledger) pd.ledger = { sections: [], nextId: 1 };
        let sec = (pd.ledger.sections || []).find(s => s.id === rec.section_id);
        if (!sec && rec.section_id && hkLedGone().indexOf(rec.section_id) >= 0) return 'ignored';
        if (!sec) {
          sec = { id: rec.section_id || newRecordId(), personA: '', personB: '', collapsed: false, rows: [] };
          pd.ledger.sections.push(sec);
        }
        if (!sec.rows) sec.rows = [];
        return mergeRowInto(sec.rows);
      }
      if (kind === 'expense_section' || kind === 'income_section') {
        const tab = kind === 'expense_section' ? 'expense' : 'income';
        if (!pk) return 'ignored';
        const pd = ensurePeriodInArchive(pk);
        if (!pd[tab]) pd[tab] = { sections: [], nextId: 1 };
        const sec = findOrCreateSection(pd[tab], rec.section_id || payload.id, payload.title || rec.section_title || '', payload.color);
        const localHas = (sec.updatedAt || 0) > updatedAt && (sec.title || '').trim();
        if (localHas) return 'skipped';
        if (payload.title != null) sec.title = payload.title;
        if (payload.color) sec.color = payload.color;
        if (payload.collapsed != null) sec.collapsed = payload.collapsed;
        sec.updatedAt = updatedAt || Date.now();
        return 'merged';
      }
      if (kind === 'ledger_section') {
        if (!pk) return 'ignored';
        const pd = ensurePeriodInArchive(pk);
        if (!pd.ledger) pd.ledger = { sections: [], nextId: 1 };
        let sec = (pd.ledger.sections || []).find(s => s.id === (rec.section_id || payload.id));
        if (!sec && hkLedGone().indexOf(rec.section_id || payload.id) >= 0) return 'ignored';
        if (!sec) {
          sec = { id: rec.section_id || payload.id || newRecordId(), personA: '', personB: '', collapsed: false, rows: [] };
          pd.ledger.sections.push(sec);
        }
        if ((sec.updatedAt || 0) > updatedAt && (sec.personA || sec.personB)) return 'skipped';
        if (payload.personA != null) sec.personA = payload.personA;
        if (payload.personB != null) sec.personB = payload.personB;
        if (payload.collapsed != null) sec.collapsed = payload.collapsed;
        sec.updatedAt = updatedAt || Date.now();
        return 'merged';
      }
      if (kind === 'plan') {
        if (!Array.isArray(plans)) plans = [];
        const idx = plans.findIndex(p => p && p.id === rec.id);
        const local = idx >= 0 ? plans[idx] : null;
        if (local && (local.name || local.amount) && (local.updatedAt || 0) > updatedAt) return 'skipped';
        const merged = Object.assign({}, local || {}, payload, {
          id: rec.id,
          createdBy: rec.created_by || payload.createdBy || '',
          createdByName: rec.created_by_name || payload.createdByName || '',
          createdAt: payload.createdAt || Date.now(),
          updatedAt: updatedAt || Date.now(),
          deletedAt: deletedAt
        });
        if (idx >= 0) plans[idx] = merged; else plans.push(merged);
        return 'merged';
      }
      if (kind === 'recurring') {
        if (!Array.isArray(recurringIncomes)) recurringIncomes = [];
        const idx = recurringIncomes.findIndex(r => r && r.id === rec.id);
        const local = idx >= 0 ? recurringIncomes[idx] : null;
        if (local && (local.name || local.amount) && (local.updatedAt || 0) > updatedAt) return 'skipped';
        const merged = Object.assign({}, local || {}, payload, {
          id: rec.id,
          createdBy: rec.created_by || payload.createdBy || '',
          createdByName: rec.created_by_name || payload.createdByName || '',
          createdAt: payload.createdAt || Date.now(),
          updatedAt: updatedAt || Date.now(),
          deletedAt: deletedAt
        });
        if (idx >= 0) recurringIncomes[idx] = merged; else recurringIncomes.push(merged);
        return 'merged';
      }
      return 'ignored';
    }

    function isOwnedByMe(createdBy) {
      const cb = (createdBy || '').trim();
      if (!cb) return true;
      if (supabaseUserId && cb === supabaseUserId) return true;
      if (authUid && cb === authUid) return true;
      if (localUid && cb === localUid) return true;
      try { if (typeof ownerAuthUid === 'function' && cb === ownerAuthUid()) return true; } catch (e) {}
      return false;
    }

    // نام نمایشی مالک رکورد: اول createdByName خودِ رکورد، وگرنه از account_members (familyMembers) resolve کن،
    // و فقط در نهایت «عضو» نمایش بده — هرگز این fallback داخل داده ذخیره نشود.
    function resolveRecordAuthorName(row) {
      if (!row) return 'عضو';
      const nm = (row.createdByName || '').trim();
      if (nm) return nm;
      const cb = (row.createdBy || '').trim();
      if (cb) {
        if (cb === currentUserId() || cb === supabaseUserId || cb === authUid) {
          const self = (memberName || '').trim();
          if (self) return self;
        }
        if (familyMembers && familyMembers[cb] && (familyMembers[cb].name || '').trim()) {
          return familyMembers[cb].name.trim();
        }
      }
      return 'عضو';
    }


    function queueAllLocalRecordsForSync() {
      if (!sharedAccountId || !SUPABASE_ENABLED) return;
      const auth = (typeof ownerAuthUid === 'function') ? ownerAuthUid() : (supabaseUserId || authUid || currentUserId());
      const myName = (memberName || '').trim();
      collectLocalSharedRecords().forEach(r => {
        const payloadOwner = (r.payload && r.payload.createdBy) || '';
        if (!isOwnedByMe(r.created_by) && !isOwnedByMe(payloadOwner)) return;
        // اگر رکورد مالک معتبر دارد، همان مالک را نگه دار؛ فقط رکوردهای بدون مالک
        // با auth.uid این دستگاه صاحب‌گذاری می‌شوند.
        r.created_by = r.created_by || payloadOwner || auth;
        if (r.payload && typeof r.payload === 'object') {
          if (!r.payload.createdBy) r.payload.createdBy = r.created_by;
          if (!r.payload.createdByName && myName && r.created_by === auth) {
            r.payload.createdByName = myName;
          }
        }
        // ستون سطح‌بالای created_by_name هم باید نام واقعی باشد، نه جعلی
        if (!r.created_by_name && myName && r.created_by === auth) r.created_by_name = myName;
        enqueueSync('upsert_record', r);
      });
    }

    async function pushQueuedRecordOps() {
      const result = { sent: 0, failed: 0, lastError: '', skipped: 0 };
      if (!SUPABASE_ENABLED || !sharedAccountId || !navigator.onLine) {
        result.skipped = 1;
        return result;
      }
      const client = await ensureSupabaseClient();
      if (!client) {
        result.lastError = 'کلاینت Supabase آماده نیست';
        return result;
      }
      try {
        const { data: sessWrap } = await client.auth.getSession();
        if (sessWrap && sessWrap.session && sessWrap.session.user) {
          supabaseUserId = sessWrap.session.user.id;
          authUid = sessWrap.session.user.id;
        }
      } catch (e) {}
      if (!supabaseUserId) {
        try { await ensureSupabaseAuth(true); } catch (e) {}
      }
      if (!supabaseUserId) {
        result.lastError = 'auth.uid خالی است';
        return result;
      }
      loadSyncQueue();
      if (!syncQueue.length) return result;
      const left = [];
      const auth = supabaseUserId;
      for (let i = 0; i < syncQueue.length; i++) {
        const item = syncQueue[i];
        try {
          if (item.op === 'upsert_record' && item.payload) {
            // مالک رکورد را حفظ کن؛ قبلاً اینجا created_by همیشه با auth کاربر فعلی
            // overwrite می‌شد و مالکیت رکوردهای کاربر اول روی دستگاه دوم خراب می‌شد.
            const originalCreatedBy =
              (item.payload && item.payload.created_by) ||
              (item.payload && item.payload.payload && item.payload.payload.createdBy) ||
              auth;
            const originalCreatedByName =
              (item.payload && item.payload.created_by_name) ||
              (item.payload && item.payload.payload && item.payload.payload.createdByName) ||
              null;
            const row = Object.assign({}, item.payload, {
              account_id: sharedAccountId,
              created_by: originalCreatedBy,
              created_by_name: originalCreatedByName
            });
            const { error } = await client.from('shared_records').upsert(row, { onConflict: 'id' });
            if (error) {
              console.error('[Sync] upsert_record failed:', error);
              result.failed++;
              result.lastError = formatSupabaseError(error, 'upsert failed');
              item.tries = (item.tries || 0) + 1;
              if (item.tries < 12) left.push(item);
            } else {
              result.sent++;
            }
          } else if (item.op === 'delete_record' && item.payload && item.payload.id) {
            const { error } = await client.from('shared_records').upsert({
              id: item.payload.id,
              account_id: sharedAccountId,
              kind: item.payload.kind || 'expense_row',
              period_key: item.payload.period_key || null,
              section_id: item.payload.section_id || null,
              section_title: item.payload.section_title || null,
              payload: item.payload.payload || { id: item.payload.id },
              deleted_at: item.payload.deleted_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: auth
            }, { onConflict: 'id' });
            if (error) {
              console.error('[Sync] delete_record failed:', error);
              result.failed++;
              result.lastError = formatSupabaseError(error, 'upsert failed');
              item.tries = (item.tries || 0) + 1;
              if (item.tries < 12) left.push(item);
            } else {
              result.sent++;
            }
          } else if (item.op !== 'upsert_account_data') {
            left.push(item);
          }
        } catch (e) {
          console.error('[Sync] queue item error:', e);
          result.failed++;
          result.lastError = formatSupabaseError(e, 'exception');
          item.tries = (item.tries || 0) + 1;
          if (item.tries < 12) left.push(item);
        }
      }
      syncQueue = left;
      saveSyncQueue();
      return result;
    }

    function formatSupabaseError(err, fallback) {
      if (!err) return fallback || 'خطای ناشناخته';
      try {
        if (typeof err === 'string') return err;
        const parts = [];
        if (err.status || err.statusCode) parts.push('HTTP ' + (err.status || err.statusCode));
        if (err.statusText) parts.push(String(err.statusText));
        if (err.code) parts.push('code=' + err.code);
        if (err.message) parts.push(err.message);
        if (err.details) parts.push('details=' + err.details);
        if (err.hint) parts.push('hint=' + err.hint);
        if (err.error && err.error.message) parts.push(err.error.message);
        if (!parts.length) parts.push(JSON.stringify(err));
        return parts.join(' — ');
      } catch (e) {
        return (err && err.message) ? err.message : String(err || fallback || 'خطا');
      }
    }

    // آخرین خطای pull برای نمایش در UI
    let lastPullError = '';
     async function pullAndMergeSharedRecords() {
      return false; /* ابر حذف شد */

      lastPullError = '';
      lastPullStats = { fetched: 0, merged: 0, skipped: 0, ignored: 0 };
      if (!SUPABASE_ENABLED || !sharedAccountId || !navigator.onLine) {
        lastPullError = !navigator.onLine ? 'آفلاین هستید' : (!sharedAccountId ? 'account_id خالی است' : 'Supabase غیرفعال است');
        return false;
      }
      const client = await ensureSupabaseClient();
      if (!client) {
        lastPullError = 'کلاینت Supabase آماده نیست (supabase-js بارگذاری نشد؟)';
        return false;
      }
      let data, error;
      try {
        const res = await client.from('shared_records').select('*').eq('account_id', sharedAccountId);
        data = res.data;
        error = res.error;
        if (error && res.status) error.status = error.status || res.status;
        if (error && res.statusText) error.statusText = error.statusText || res.statusText;
      } catch (e) {
        lastPullError = 'Supabase exception: ' + formatSupabaseError(e, 'خطای شبکه/JS');
        console.error('[Sync] pull exception:', e);
        return false;
      }
      if (error) {
        lastPullError = 'Supabase error: ' + formatSupabaseError(error, 'pull failed');
        console.error('[Sync] pull failed:', error);
        return false;
      }

      const rows = Array.isArray(data) ? data : [];
      lastPullStats.fetched = rows.length;
      console.log('[Sync] pull fetched', rows.length, rows);

      // اسامی واقعی اعضا را از account_members بگیر تا رکوردهای بدون created_by_name به «عضو» تبدیل نشوند
      try { await supabaseLoadMembers(); } catch (e) { console.error('[Sync] loadMembers:', e); }

      rows.forEach(rec => {
        try {
          const st = applyRemoteSharedRecord(rec);
          if (st === 'merged') lastPullStats.merged++;
          else if (st === 'skipped') lastPullStats.skipped++;
          else lastPullStats.ignored++;
        } catch (e) {
          console.error('[Sync] apply error', e, rec);
          lastPullStats.ignored++;
        }
      });

      // soft-deleted را از نمایش فیلتر کن
      Object.keys(archive || {}).forEach(pk => {
        const pd = archive[pk];
        if (!pd) return;
        ['expense', 'income'].forEach(tab => {
          (pd[tab] && pd[tab].sections || []).forEach(sec => {
            sec.rows = (sec.rows || []).filter(r => !r.deletedAt);
          });
        });
        if (pd.ledger) {
          (pd.ledger.sections || []).forEach(sec => {
            sec.rows = (sec.rows || []).filter(r => !r.deletedAt);
          });
        }
      });
      plans = (plans || []).filter(p => !p.deletedAt);
      recurringIncomes = (recurringIncomes || []).filter(r => !r.deletedAt);
      try { saveRecurring(); 
        try { scheduleSave(); } catch (e) {}
        try { renderHomeCards(); } catch (e) {}
        try {
          if (typeof _detailContext !== 'undefined' && _detailContext && _detailContext.kind === 'income') {
            renderPersonDetailPanel('income', _detailContext.title);
          }
        } catch (e) {}
} catch (e) {}

      // مهم: اول archive را ذخیره کن، بعد periodData را از archive بخوان
      // (persistCurrent قبل از loadCurrent باعث overwrite merge با داده خالی حافظه می‌شد)
      try { saveArchive(); } catch (e) { console.error(e); }
      try { loadCurrent(); } catch (e) { console.error(e); }
      try { saveArchive(); } catch (e) {}

      console.log('[Sync] pull stats', lastPullStats, 'archive keys', Object.keys(archive || {}));
      return true;
    }

    let _syncSharedRunning = false;
    async function countServerSharedRecords() {
      const client = getSupabaseClient();
      if (!client || !sharedAccountId) return -1;
      try {
        const res = await client.from('shared_records')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', sharedAccountId);
        if (res.error) {
          console.error('[Sync] count server records:', res.error);
          lastPullError = 'Supabase count error: ' + formatSupabaseError(res.error);
          return -1;
        }
        return typeof res.count === 'number' ? res.count : 0;
      } catch (e) {
        console.error('[Sync] count error:', e);
        lastPullError = 'Supabase count exception: ' + formatSupabaseError(e);
        return -1;
      }
    }

    async function syncSharedData(manual) {
      return false; /* ابر حذف شد */

      try { loadSharedAccountLocal(); } catch (e) {}
      if (!SUPABASE_ENABLED || !sharedAccountId) {
        if (manual) showToast('خطا: account_id حساب مشترک خالی است');
        return false;
      }
      if (!navigator.onLine) {
        setSyncStatus('در انتظار اینترنت', 'pending');
        if (manual) showToast('در انتظار اینترنت');
        return false;
      }
      if (_syncSharedRunning) {
        if (manual) showToast('همگام‌سازی در حال انجام است...');
        return false;
      }
      _syncSharedRunning = true;
      setSyncStatus('در حال همگام‌سازی...', 'busy');
      try {
        await ensureSupabaseAuth(true);
        if (!supabaseUserId) {
          const msg = 'خطا: auth.uid خالی است';
          setSyncStatus(msg, 'err');
          if (manual) showToast(msg);
          return false;
        }
        migrateLocalRecordsForSync();
        const serverCount = await countServerSharedRecords();
        console.log('[Sync] account=', sharedAccountId, 'uid=', supabaseUserId, 'serverCount=', serverCount);

        queueAllLocalRecordsForSync();
        loadSyncQueue();
        const queued = (syncQueue || []).length;
        if (manual) showToast('در حال ارسال... (' + queued + ' مورد در صف)');

        const pushRes = await pushQueuedRecordOps() || { sent: 0, failed: 0, lastError: '' };
        console.log('[Sync] push result', pushRes);

        if (pushRes.failed > 0 && pushRes.sent === 0 && pushRes.lastError) {
          const msg = 'خطا: ' + pushRes.lastError;
          setSyncStatus(msg, 'err');
          if (manual) showToast(msg);
        } else if (manual && pushRes.sent > 0) {
          showToast('ارسال موفق (' + pushRes.sent + ' رکورد)');
        } else if (manual && queued === 0) {
          showToast('موردی برای ارسال نبود — در حال دریافت...');
        }

        if (manual) showToast('در حال دریافت...');
        const ok = await pullAndMergeSharedRecords();
        const pushRes2 = await pushQueuedRecordOps() || {};

        loadSyncQueue();
        if (ok) {
          if (syncQueue && syncQueue.length) {
            setSyncStatus('در حال همگام‌سازی...', 'busy');
            if (manual) {
              const err = pushRes2.lastError || pushRes.lastError || '';
              showToast(err
                ? ('خطا: ' + err + ' — باقی‌مانده صف: ' + syncQueue.length)
                : ('دریافت موفق — باقی‌مانده صف: ' + syncQueue.length));
            }
          } else {
            setSyncStatus('همگام شد', 'ok');
            if (manual) showToast('دریافت موفق');
          }
          updateFamilyUI();
          renderAll();
          return true;
        }
        const detail = lastPullError || (pushRes && pushRes.lastError) || 'دریافت از سرور ناموفق (بدون جزئیات از Supabase)';
        setSyncStatus('خطا: ' + detail, 'err');
        if (manual) showToast('خطا: ' + detail);
        return false;
      } catch (e) {
        console.error('[Sync] syncSharedData:', e);
        const msg = 'خطا: ' + ((e && e.message) || e);
        setSyncStatus(msg, 'err');
        if (manual) showToast(msg);
        return false;
      } finally {
        _syncSharedRunning = false;
      }
    }

    let _sharedSyncDebounce = null;
    function scheduleSharedSync() {
      // Sync را هنگام تایپ مستقیم اجرا نکن؛ فقط یک اجرای debounce شده انجام بده.
      // همگام‌سازی اصلی record-level است و دیگر account_data کل بسته را overwrite نمی‌کند.
      if (!SUPABASE_ENABLED || !sharedAccountId || !navigator.onLine) return;
      clearTimeout(_sharedSyncDebounce);
      _sharedSyncDebounce = setTimeout(() => {
        try { syncSharedData(false); } catch (e) { console.error('[Sync] scheduled:', e); }
      }, 1200);
    }

    function sbHeaders(token, extra) {

      const h = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      };
      if (token) h['Authorization'] = 'Bearer ' + token;
      if (extra) Object.keys(extra).forEach(k => { h[k] = extra[k]; });
      return h;
    }
    function getSupabaseClient() {
      return null; // Supabase disabled
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
      if (supabaseClient) return supabaseClient;
      try {
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
          console.error('[Supabase] کتابخانه supabase-js بارگذاری نشد.');
          return null;
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: window.localStorage
          }
        });
      } catch (e) {
        console.error('[Supabase] ساخت client ناموفق:', e);
        return null;
      }
      return supabaseClient;
    }

    /* اگر تگ <script src=supabase-js> هنگام باز شدن نرم‌افزار (مثلاً بدون اینترنت) هنوز لود نشده باشد،
       این تابع کمی صبر می‌کند و در صورت لزوم خودش دوباره اسکریپت را تزریق می‌کند تا کتابخانه لود شود،
       به‌جای اینکه فوراً بگوید «کلاینت آماده نیست». */
    let supabaseLibLoadPromise = null;
    function ensureSupabaseLibLoaded() {
      /* Supabase غیرفعال — نرم‌افزار بدون اینترنت/همگام‌سازی ابری کار می‌کند */
      return Promise.resolve(false);
    }
    async function ensureSupabaseClient() {
      if (supabaseClient) return supabaseClient;
      const ok = await ensureSupabaseLibLoaded();
      if (!ok) return null;
      return getSupabaseClient();
    }

    /**
     * فقط احراز هویت ناشناس / بازیابی session.
     * یک client و یک کاربر — بدون ساخت حساب مشترک یا sync.
     */
    /* نمایش خطا فقط در صورت شکست Auth — پیام SUCCESS حذف شده */
    function showSupabaseAuthDebug(ok, detail) {
      if (ok) return;
      try {
        // Supabase غیرفعال — بدون toast / UI
        return;
        const box = document.getElementById('supabaseDebugBox');
        if (!box) {
          return;
        }
        box.style.borderColor = '#ef4444';
        box.innerHTML = '<div style="font-weight:700;margin-bottom:4px;color:#ef4444;">Supabase Auth: FAILED</div>' +
          '<div style="word-break:break-all;opacity:.95;">' + String(detail || '') + '</div>';
        box.style.display = 'block';
      } catch (e) {}
    }

    async function initSupabaseAuth() {
      return null; // Supabase disabled
      const client = await ensureSupabaseClient();
      if (!client) {
        const msg = !SUPABASE_ANON_KEY
          ? 'SUPABASE_ANON_KEY is empty'
          : (typeof supabase === 'undefined'
              ? 'supabase-js library not loaded'
              : 'Failed to create Supabase client');
        console.warn('[Supabase]', msg);
        showSupabaseAuthDebug(false, msg);
        return null;
      }
      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) {
          console.error('[Supabase] خطا در خواندن session:', sessionError.message || sessionError);
        }
        let session = sessionData && sessionData.session;
        if (!session || !session.user) {
          const { data, error } = await client.auth.signInAnonymously();
          if (error) {
            const msg = error.message || String(error);
            console.error('[Supabase] Anonymous Sign-in ناموفق:', msg);
            showSupabaseAuthDebug(false, msg);
            return null;
          }
          session = data && data.session;
        }
        if (session && session.user && session.user.id) {
          supabaseUserId = session.user.id;
          authUid = session.user.id;
          supabaseAccessToken = session.access_token || '';
          const expSec = typeof session.expires_in === 'number' ? session.expires_in : 3600;
          supabaseTokenExp = Date.now() + expSec * 1000;
          if (session.expires_at) {
            supabaseTokenExp = session.expires_at * 1000;
          }
          console.log('[Supabase] احراز هویت آماده. user.id =', supabaseUserId);
          showSupabaseAuthDebug(true, 'User ID: ' + supabaseUserId);
          return supabaseUserId;
        }
        const msg = 'Session received without user.id';
        console.error('[Supabase]', msg);
        showSupabaseAuthDebug(false, msg);
        return null;
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        console.error('[Supabase] خطای غیرمنتظره در احراز هویت:', e);
        showSupabaseAuthDebug(false, msg);
        return null;
      }
    }

    async function ensureSupabaseAuth(force) {
      if (!SUPABASE_ENABLED) return { userId: currentUserId(), token: null };
      if (!force && supabaseUserId && supabaseAccessToken && supabaseTokenExp > Date.now() + 30000) {
        return { userId: supabaseUserId, token: supabaseAccessToken };
      }
      const uid = await initSupabaseAuth();
      if (uid) {
        return { userId: supabaseUserId, token: supabaseAccessToken || null };
      }
      return { userId: currentUserId(), token: null };
    }

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

    function renderFamilyModalBody() {
      const body = document.getElementById('familyModalBody');
      if (!body) return;
      ensureLocalUid();
      let html = '';
      html += '<p class="family-help">با ساخت حساب مشترک، هر کسی که کد را داشته باشد می‌تواند بپیوندد. برای دستگاه دیگر از <strong>نام کاربری یکتا</strong> + کد اشتراک استفاده کنید.</p>';

      if (familyCode) {
        html += '<div class="fam-current">';
        html += '<div class="fam-current-label">کد فعلی شما</div>';
        html += '<div class="code-row">';
        html += '<div class="code-box code-box-sm" id="familyCodeDisplay">' + escapeHtml(familyCode) + '</div>';
        html += '<button type="button" class="icon-btn" title="کپی" onclick="copyFamilyCode()">' + ICON_SVG_COPY + '</button>';
        html += '<button type="button" class="icon-btn" title="اشتراک‌گذاری" onclick="shareFamilyCode()">' + ICON_SVG_SHARE + '</button>';
        html += '</div>';
        const entries = Object.keys(familyMembers || {}).map(uid => ({
          uid: uid,
          name: (familyMembers[uid] && familyMembers[uid].name) || 'عضو',
          handle: (familyMembers[uid] && familyMembers[uid].handle) || '',
          joinedAt: (familyMembers[uid] && familyMembers[uid].joinedAt) || 0
        })).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
        if (!entries.length) {
          entries.push({ uid: currentUserId(), name: memberName || 'شما', handle: memberHandle || '', joinedAt: Date.now() });
        }
        html += '<div class="fam-members-title">اعضای حساب مشترک</div>';
        entries.forEach(m => {
          const letter = (m.name || '؟').trim().charAt(0) || '؟';
          const me = m.uid === currentUserId() ? ' (شما)' : '';
          html += '<div class="fam-member">';
          html += '<span class="fam-avatar">' + escapeHtml(letter) + '</span>';
          html += '<div class="meta"><div>' + escapeHtml(m.name || 'عضو') + me + '</div>';
          if (m.handle) html += '<div class="joined">' + formatHandleDisplay(m.handle) + '</div>';
          if (m.joinedAt) html += '<div class="joined">عضویت: ' + formatJoinedFa(m.joinedAt) + '</div>';
          html += '</div></div>';
        });
        html += '<label class="family-label" style="margin-top:8px;">نام نمایشی</label>';
        html += '<input id="memberNameInp" class="family-input" placeholder="مثلاً سهراب" value="' + escapeHtml(memberName || '') + '" oninput="onMemberChange()">';
        html += '<label class="family-label">نام کاربری یکتا</label>';
        html += '<input id="memberHandleInp" class="family-input" placeholder="مثلاً ali_01" dir="ltr" value="' + escapeHtml(memberHandle || '') + '" oninput="onHandleChange()" autocomplete="username">';
        html += '<p class="family-help" style="margin-top:4px;">با همین نام کاربری + کد اشتراک از دستگاه دیگر به اطلاعات خود دسترسی دارید.</p>';
        html += '</div>';
      } else {
        html += '<label class="family-label">نام نمایشی</label>';
        html += '<input id="memberNameInp" class="family-input" placeholder="مثلاً سهراب" value="' + escapeHtml(memberName || '') + '" oninput="onMemberChange()">';
        html += '<label class="family-label">نام کاربری یکتا</label>';
        html += '<input id="memberHandleInp" class="family-input" placeholder="مثلاً ali_01" dir="ltr" value="' + escapeHtml(memberHandle || '') + '" oninput="onHandleChange()" autocomplete="username">';
        html += '<p class="family-help">نام کاربری برای بازیابی روی دستگاه دیگر لازم است.</p>';
      }

      html += '<div class="fam-seg">';
      html += '<button type="button" class="' + (familyModalTab === 'join' ? 'active' : '') + '" onclick="setFamilyTab(\'join\')">پیوستن به حساب مشترک</button>';
      html += '<button type="button" class="' + (familyModalTab === 'create' ? 'active' : '') + '" onclick="setFamilyTab(\'create\')">ساخت کد جدید</button>';
      html += '</div>';
      html += '<div id="familyActionStatus" class="family-help" style="min-height:1.4em;margin:6px 0;"></div>';

      if (familyModalTab === 'create') {
        html += '<div class="fam-panel active">';
        html += '<p class="family-help" style="margin-bottom:10px;">نام خود را وارد کنید و روی «ساخت کد جدید» بزنید.</p>';
        html += '<button class="btn btn-pay family-btn" type="button" id="createFamilyBtn">ساخت کد جدید</button>';
        html += '</div>';
      } else {
        html += '<div class="fam-panel active">';
        html += '<label class="family-label">کد اشتراک</label>';
        html += '<input id="joinCodeInp" class="family-input" placeholder="مثلاً AB12KD" dir="ltr" oninput="onJoinCodeInput()" autocomplete="off">';
        html += '<button class="btn btn-add-row family-btn" style="width:100%;margin:0 0 10px;" type="button" id="joinFamilyBtn" disabled>پیوستن به حساب مشترک</button>';
        html += '</div>';
      }

      if (!SUPABASE_ENABLED) {
        html += '<button type="button" class="fam-advanced-toggle" onclick="toggleFamilyAdvanced()">' +
          '<span class="hk-chev' + (familyAdvancedOpen ? ' open' : '') + '" aria-hidden="true">' + HK_CHEV_SVG + '</span> تنظیمات پیشرفته</button>';
        html += '<div class="fam-advanced' + (familyAdvancedOpen ? ' open' : '') + '" id="familyAdvancedBox">';
        html += '<p class="family-help">همگام‌سازی ابری از طریق Supabase در نسخه توسعه‌دهنده پیکربندی می‌شود و اینجا نمایش داده نمی‌شود.</p>';
        html += '</div>';
      } else {
        html += '<p class="family-help" style="margin-top:8px;">همگام‌سازی ابری فعال است. بدون اینترنت هم می‌توانید کار کنید؛ با اتصال دوباره همگام می‌شود.</p>';
      }

      if (familyCode) {
        html += '<div class="fam-leave-wrap">';
        html += '<button type="button" class="btn btn-del-row family-btn fam-leave-btn" onclick="leaveSharedAccount()">خروج از حساب مشترک</button>';
        html += '<p class="family-help fam-leave-hint">پس از خروج، دادهٔ دیگران حذف می‌شود و فقط اطلاعات خودتان به‌صورت تک‌نفره (آفلاین) می‌ماند.</p>';
        html += '</div>';
      }
      body.innerHTML = html;
      onJoinCodeInput();
      try {
        const cbtn = document.getElementById('createFamilyBtn');
        if (cbtn) {
          cbtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            createFamily();
          });
        }
        const jbtn = document.getElementById('joinFamilyBtn');
        if (jbtn) {
          jbtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            joinFamily();
          });
        }
      } catch (e) { console.error('[family modal bind]', e); }
    }

    function setFamilyActionStatus(msg, isError) {
      try {
        const el = document.getElementById('familyActionStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#ef4444' : 'var(--muted)';
        el.style.fontWeight = '700';
      } catch (e) {}
    }

    function toggleFamilyAdvanced() {
      familyAdvancedOpen = !familyAdvancedOpen;
      renderFamilyModalBody();
    }

    function openFamilyModal() {
      /* حساب مشترک / ابر حذف شد */
      try { closeFamilyModal(); } catch (e) {}
      return;
    }
    
    function closeFamilyModal() {
      document.getElementById('familyModal').classList.remove('open');
      openSideMenu();
    }

    async function createFamily() {
      try {
        const n = document.getElementById('memberNameInp');
        if (n && (n.value || '').trim()) memberName = n.value.trim();
      } catch (e) {}
      try {
        const h = document.getElementById('memberHandleInp');
        if (h && (h.value || '').trim()) memberHandle = normalizeHandle(h.value);
      } catch (e) {}
      if (!(memberName || '').trim()) {
        setFamilyActionStatus('لطفاً نام نمایشی خود را وارد کنید', true);
        showToast('نام نمایشی را وارد کنید');
        return;
      }
      if (!normalizeHandle(memberHandle)) {
        setFamilyActionStatus('لطفاً نام کاربری یکتا وارد کنید', true);
        showToast('نام کاربری یکتا لازم است');
        return;
      }
      if (!SUPABASE_ENABLED) {
        setFamilyActionStatus('خطا: Supabase پیکربندی نشده', true);
        showToast('Supabase پیکربندی نشده');
        return;
      }
      const cbtn = document.getElementById('createFamilyBtn');
      if (cbtn) { cbtn.disabled = true; cbtn.textContent = 'در حال ساخت...'; }
      setFamilyActionStatus('در حال ساخت کد...', false);
      showToast('در حال ساخت کد...');
      try {
        persistCurrent();
        const client = await ensureSupabaseClient();
        if (!client) throw new Error('اتصال به Supabase برقرار نشد — اینترنت را بررسی کنید و دوباره تلاش کنید');
        const { data: sessWrap, error: sessErr } = await client.auth.getSession();
        if (sessErr) {
          console.error('[Supabase] getSession:', sessErr);
          throw new Error(sessErr.message || 'خطای session');
        }
        if (!sessWrap || !sessWrap.session || !sessWrap.session.user) {
          const { data: signData, error: signErr } = await client.auth.signInAnonymously();
          if (signErr) {
            console.error('[Supabase] signInAnonymously:', signErr);
            throw new Error(signErr.message || 'احراز هویت ناموفق');
          }
          if (signData && signData.user) {
            supabaseUserId = signData.user.id;
            authUid = signData.user.id;
          }
          if (signData && signData.session) {
            supabaseAccessToken = signData.session.access_token || '';
          }
        } else {
          supabaseUserId = sessWrap.session.user.id;
          authUid = sessWrap.session.user.id;
          supabaseAccessToken = sessWrap.session.access_token || supabaseAccessToken;
        }
        if (!supabaseUserId) throw new Error('احراز هویت انجام نشده');

        const name = (memberName || '').trim();
        const { data, error } = await client.rpc('create_shared_account', {
          p_member_name: name
        });
        if (error) {
          console.error('[Supabase] create_shared_account RPC error:', error);
          throw new Error(error.message || JSON.stringify(error));
        }
        console.log('[Supabase] create_shared_account response:', data);
        const row = Array.isArray(data) ? data[0] : data;
        const accountId = row && (row.account_id || row.id);
        const shareCode = row && (row.share_code || row.shareCode);
        if (!accountId || !shareCode) {
          console.error('[Supabase] پاسخ ناقص create_shared_account:', data);
          throw new Error('پاسخ سرور ناقص است (account_id/share_code نیست)');
        }
        sharedAccountId = accountId;
        familyCode = String(shareCode).toUpperCase();
        familyMembers = {};
        registerSelfInFamily();
        touchLocal();
        saveArchive();
        saveSharedAccountLocal();
        updateFamilyUI();
        familyModalTab = 'join';
        renderFamilyModalBody();
        setFamilyActionStatus('کد با موفقیت ساخته شد: ' + familyCode, false);
        showToast('کد با موفقیت ساخته شد: ' + familyCode);
        // حساب تازه ساخته شده باید بلافاصله داده‌های همین دستگاه را به shared_records بفرستد.
        try {
          await syncSharedData(false);
        } catch (syncErr) {
          console.warn('[Sync] initial create sync failed:', syncErr);
        }
      } catch (e) {
        console.error('[Supabase] createFamily failed:', e);
        const msg = (e && e.message) ? e.message : String(e);
        let friendly = msg;
        if (/network|fetch|Failed to fetch/i.test(msg)) friendly = 'خطای شبکه — اینترنت را بررسی کنید';
        else if (/auth|احراز|session|JWT/i.test(msg)) friendly = 'خطای احراز هویت — دوباره تلاش کنید';
        setFamilyActionStatus('خطا: ' + friendly, true);
        showToast('خطا: ' + friendly);
      } finally {
        try {
          const b = document.getElementById('createFamilyBtn');
          if (b) { b.disabled = false; b.textContent = 'ساخت کد جدید'; }
        } catch (e2) {}
      }
    }

    async function joinFamily() {
      const raw = (document.getElementById('joinCodeInp').value || '').trim().toUpperCase();
      if (!raw || raw.length < 4) {
        setFamilyActionStatus('کد اشتراک را وارد کنید', true);
        showToast('کد معتبر نیست');
        return;
      }
      try {
        const n = document.getElementById('memberNameInp');
        if (n && (n.value || '').trim()) memberName = n.value.trim();
      } catch (e) {}
      try {
        const h = document.getElementById('memberHandleInp');
        if (h && (h.value || '').trim()) memberHandle = normalizeHandle(h.value);
      } catch (e) {}
      if (!(memberName || '').trim()) {
        setFamilyActionStatus('لطفاً نام نمایشی خود را وارد کنید', true);
        showToast('نام نمایشی را وارد کنید');
        return;
      }
      if (!normalizeHandle(memberHandle)) {
        setFamilyActionStatus('لطفاً نام کاربری یکتا وارد کنید', true);
        showToast('نام کاربری یکتا لازم است');
        return;
      }
      if (!SUPABASE_ENABLED) {
        setFamilyActionStatus('خطا: Supabase پیکربندی نشده', true);
        showToast('Supabase پیکربندی نشده');
        return;
      }
      const jbtn = document.getElementById('joinFamilyBtn');
      if (jbtn) { jbtn.disabled = true; jbtn.textContent = 'در حال پیوستن...'; }
      setFamilyActionStatus('در حال پیوستن...', false);
      showToast('در حال پیوستن...');
      try {
        persistCurrent();
        const client = await ensureSupabaseClient();
        if (!client) throw new Error('اتصال به Supabase برقرار نشد — اینترنت را بررسی کنید و دوباره تلاش کنید');
        const { data: sessWrap, error: sessErr } = await client.auth.getSession();
        if (sessErr) {
          console.error('[Supabase] getSession:', sessErr);
          throw new Error(sessErr.message || 'خطای session');
        }
        if (!sessWrap || !sessWrap.session || !sessWrap.session.user) {
          const { data: signData, error: signErr } = await client.auth.signInAnonymously();
          if (signErr) {
            console.error('[Supabase] signInAnonymously:', signErr);
            throw new Error(signErr.message || 'احراز هویت ناموفق');
          }
          if (signData && signData.user) {
            supabaseUserId = signData.user.id;
            authUid = signData.user.id;
          }
        } else {
          supabaseUserId = sessWrap.session.user.id;
          authUid = sessWrap.session.user.id;
        }
        if (!supabaseUserId) throw new Error('احراز هویت انجام نشده');

        const name = (memberName || '').trim();
        let data = null;
        let error = null;
        try {
          const res = await client.rpc('join_shared_account', {
            p_share_code: raw,
            p_member_name: name + (memberHandle ? (' · ' + memberHandle) : '')
          });
          data = res.data;
          error = res.error;
        } catch (rpcEx) {
          error = rpcEx;
        }
        if (error) {
          console.error('[Supabase] join_shared_account RPC error:', error);
          const low = String(error.message || error || '').toLowerCase();
          // سقف قدیمی سرور را دور بزن: مستقیم عضو شو
          if (/full|limit|capacity|maximum|max|2/i.test(low)) {
            try {
              const accRes = await sbFetch('/rest/v1/accounts?share_code=eq.' + encodeURIComponent(raw) + '&select=id,share_code', { method: 'GET' });
              if (!accRes.ok) throw new Error('not-found');
              const accRows = await accRes.json();
              if (!accRows || !accRows[0]) throw new Error('not-found');
              const accId = accRows[0].id;
              const ins = await sbFetch('/rest/v1/account_members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({
                  account_id: accId,
                  user_id: supabaseUserId,
                  display_name: name + (memberHandle ? (' · ' + normalizeHandle(memberHandle)) : '')
                })
              });
              if (!ins.ok && ins.status !== 409) {
                const t = await ins.text();
                console.warn('[Supabase] direct member insert failed', ins.status, t);
                // حتی اگر insert رد شد، اگر بتوانیم account_id را داریم ادامه بده (ممکن است از قبل عضو باشد)
              }
              data = { account_id: accId, share_code: accRows[0].share_code || raw };
              error = null;
            } catch (bypassErr) {
              console.error('[Supabase] join bypass failed:', bypassErr);
              if (String(bypassErr.message) === 'not-found') throw new Error('not-found');
              throw new Error('full');
            }
          } else if (/not.?found|invalid|no row|unknown code/i.test(low)) {
            throw new Error('not-found');
          } else {
            throw new Error(error.message || JSON.stringify(error));
          }
        }
        console.log('[Supabase] join_shared_account response:', data);
        const row = Array.isArray(data) ? data[0] : data;
        if (row && (row.account_id || row.id)) {
          sharedAccountId = row.account_id || row.id;
        } else if (typeof data === 'string' && data.length > 8) {
          sharedAccountId = data;
        }
        familyCode = raw;
        if (row && (row.share_code || row.shareCode)) {
          familyCode = String(row.share_code || row.shareCode).toUpperCase();
        }
        registerSelfInFamily();
        try { await supabaseLoadMembers(); } catch (e) {}
        if (isHandleTakenByOther(memberHandle)) {
          setFamilyActionStatus('این نام کاربری قبلاً توسط عضو دیگری استفاده شده — نام دیگری انتخاب کنید', true);
          showToast('نام کاربری تکراری است');
          // اتصال را نگه می‌داریم ولی هشدار می‌دهیم؛ کاربر می‌تواند handle را عوض کند
        }
        const reclaimed = reclaimRowsByHandle();
        saveArchive();
        saveSharedAccountLocal();
        updateFamilyUI();
        renderFamilyModalBody();
        const dup = isHandleTakenByOther(memberHandle);
        setFamilyActionStatus(
          (dup ? 'هشدار: نام کاربری تکراری است. ' : '') +
          'با موفقیت به حساب مشترک پیوستید' + (reclaimed ? (' — ' + toPersianDigits(reclaimed) + ' مورد بازیابی شد') : ''),
          !!dup
        );
        showToast(dup
          ? 'پیوستید ولی نام کاربری تکراری است'
          : (reclaimed ? ('پیوستید؛ ' + toPersianDigits(reclaimed) + ' مورد متعلق به شما بازیابی شد') : 'با موفقیت به حساب مشترک پیوستید'));
        // هنگام Join ابتدا فقط داده‌های حساب مشترک را دریافت کن؛
        // داده‌های محلی دستگاه دوم نباید در همان لحظه به حساب موجود push شوند.
        try {
          await ensureSupabaseAuth(true);
          const pulled = await pullAndMergeSharedRecords();
          if (pulled) {
            updateFamilyUI();
            renderAll();
          }
        } catch (syncErr) {
          console.warn('[Sync] initial join pull failed:', syncErr);
        }
      } catch (e) {
        console.error('[Supabase] joinFamily failed:', e);
        const msg = String(e && e.message || e);
        let friendly = msg;
        if (msg === 'full') friendly = 'سرور عضویت را رد کرد؛ دوباره تلاش کنید';
        else if (msg === 'not-found') friendly = 'کد اشتراک اشتباه است';
        else if (/network|fetch|Failed to fetch/i.test(msg)) friendly = 'خطای شبکه — اینترنت را بررسی کنید';
        else if (/auth|احراز|session|JWT/i.test(msg)) friendly = 'خطای احراز هویت';
        setFamilyActionStatus('خطا: ' + friendly, true);
        showToast('خطا: ' + friendly);
      } finally {
        try {
          const b = document.getElementById('joinFamilyBtn');
          if (b) {
            const inp = document.getElementById('joinCodeInp');
            const v = (inp && inp.value || '').trim();
            b.disabled = v.length < 4;
            b.textContent = 'پیوستن به حساب مشترک';
          }
        } catch (e2) {}
      }
    }

    function copyFamilyCode() {
      if (!familyCode) {
        openFamilyModal();
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(familyCode).then(() => showToast('کد کپی شد')).catch(() => showToast(familyCode));
      } else {
        showToast(familyCode);
      }
    }

    function shareFamilyCode() {
      if (!familyCode) { openFamilyModal(); return; }
      const text = 'کد خانواده حساب‌کتاب: ' + familyCode;
      if (navigator.share) {
        navigator.share({ title: 'کد خانواده', text: text }).catch(() => copyFamilyCode());
      } else {
        copyFamilyCode();
      }
    }


    function saveFirebaseUrl() {
      const urlEl = document.getElementById('firebaseUrlInp');
      const keyEl = document.getElementById('firebaseApiKeyInp');
      firebaseUrl = (urlEl && urlEl.value || '').trim().replace(/\/+$/, '');
      firebaseApiKey = (keyEl && keyEl.value || '').trim();
      saveArchive();
      showToast(firebaseUrl ? 'تنظیمات همگام‌سازی ذخیره شد' : 'آدرس پاک شد');
      // دریافت خودکار غیرفعال — فقط از منوی «دریافت از ابر»

    }

    function setSyncStatus(msg, cls) {
      const el = document.getElementById('syncStatus');
      if (!el) return;
      let label = msg || '';
      if (cls === 'ok') label = msg || 'همگام شد';
      else if (cls === 'err') label = msg || 'خطا در همگام‌سازی';
      else if (cls === 'pending') label = msg || 'در انتظار اینترنت';
      else if (cls === 'busy') label = msg || 'در حال همگام‌سازی...';
      el.title = label;
      el.textContent = label;
      el.className = 'sync-status' + (cls ? ' ' + cls : '');
    }
    function refreshSyncStatusFromQueue() {
      try {
        if (!sharedAccountId || !SUPABASE_ENABLED) return;
        loadSyncQueue();
        if (!navigator.onLine) {
          if (syncQueue && syncQueue.length) setSyncStatus('در انتظار اینترنت', 'pending');
          return;
        }
        if (syncQueue && syncQueue.length) setSyncStatus('در حال همگام‌سازی...', 'busy');
      } catch (e) {}
    }

    function remotePath(token) {
      if (!firebaseUrl || !familyCode) return null;
      const base = firebaseUrl.replace(/\/+$/, '');
      let url = base + '/families/' + familyCode + '.json';
      if (token) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'auth=' + encodeURIComponent(token);
      return url;
    }
    async function remotePathAuth() {
      const auth = await ensureFirebaseAuth(false);
      return remotePath(auth.token || null);
    }

    function scheduleRemotePush() {
      // مسیر قدیمی Firebase اینجا بود. برای حساب مشترک جدید، sync record-level را زمان‌بندی کن.
      scheduleSharedSync();
    }

    async function pushRemote(manual) {
      try { closeSideMenu(); } catch (e) {}
      // حساب مشترک جدید فقط از shared_records استفاده می‌کند.
      // account_data حذف شد چون last-write-wins روی کل bundle باعث از بین رفتن
      // تغییرات همزمان دو دستگاه می‌شد.
      return await syncSharedData(!!manual);
    }

    async function pullRemote(manual) {
      try { closeSideMenu(); } catch (e) {}
      // دریافت نیز همان مسیر record-level را استفاده می‌کند تا رکوردهای هر دو کاربر
      // مستقل از هم merge شوند.
      return await syncSharedData(!!manual);
    }

    function startSyncLoop() {
      /* ابر حذف شد — همگام‌سازی دوره‌ای غیرفعال */
      try { if (typeof syncTimer !== 'undefined' && syncTimer) clearInterval(syncTimer); } catch (e) {}
      syncTimer = null;
    }

    /* —— Installment reminders —— */
    function getReminderItems() {
      /* ۱.۳.۵۱: اقساط کامل پنهان: نوار یادآور قسط در هیچ ماهی نمی‌آید */
      if (!HK_INSTALLMENTS_ON) return [];
      const today = getTodayPersian();
      const todayIdx = dateToIndex(today.y, today.m, today.d);
      const items = [];

      plans.forEach(plan => {
        const count = Math.max(0, parseInt(plan.count, 10) || 0);
        const paid = Math.max(0, parseInt(plan.paidCount, 10) || 0);
        for (let i = paid; i < count; i++) {
          if (plan.paidEarlyMap && plan.paidEarlyMap[String(i)]) continue; /* پیش‌پرداخت شده */
          const due = dueDateForInstallment(plan, i);
          const dueIdx = dateToIndex(due.y, due.m, due.d);
          const amt = planInstallmentAmount(plan);
          const name = plan.name || 'بدون نام';
          const qNum = toPersianDigits(i + 1) + ' از ' + toPersianDigits(count);
          // سمت راست = روز، وسط = ماه، سمت چپ = سال — اعداد تک‌رقمی با صفر
          const dueLabel = toPersianPad2(due.y) + '/' + toPersianPad2(due.m) + '/' + toPersianPad2(due.d);
          const warnIdx = dueIdx - 1;
          if (todayIdx === warnIdx) {
            items.push({ kind: 'tomorrow', badge: 'فردا', title: name, qNum, amount: amt, dueLabel });
          } else if (todayIdx === dueIdx) {
            items.push({ kind: 'today', badge: 'امروز', title: name, qNum, amount: amt, dueLabel });
          } else if (todayIdx > dueIdx) {
            const daysLate = todayIdx - dueIdx;
            items.push({
              kind: 'overdue',
              badge: toPersianDigits(daysLate) + ' روز تاخیر',
              title: name, qNum, amount: amt, dueLabel
            });
          }
          break;
        }
      });
      return items;
    }

    
    function computePersonEndingInstants() {
      const map = {};
      try {
        (typeof allPersonTitles === 'function' ? allPersonTitles() : []).forEach(function(t) {
          try {
            const tot = personTotals(t);
            map[t] = Number(tot && tot.instant) || 0;
          } catch (e) { map[t] = 0; }
        });
      } catch (e) {}
      return map;
    }
    /** موجودی آنی پایانی هر حساب (برای انتقال به ماه بعد) */
    function computeAccountEndingBalances() {
      const map = {};
      try {
        const labels = (typeof selectedAccountLabels === 'function') ? selectedAccountLabels() : [];
        labels.forEach(function(lb) {
          map[lb] = (typeof getAccountOpeningBalance === 'function' ? getAccountOpeningBalance(lb) : 0) || 0;
        });
        // جمع تراکنش‌های paid همه کاربران روی هر حساب (فقط حساب‌های موجود به ماه بعد منتقل می‌شوند)
        ['income', 'expense'].forEach(function(tab) {
          const sign = tab === 'income' ? 1 : -1;
          ((periodData[tab] && periodData[tab].sections) || []).forEach(function(sec) {
            (sec && sec.rows || []).forEach(function(r) {
              if (!r || (r.status || 'paid') !== 'paid') return;
              const acc = (r.account || '').trim();
              if (!acc || !isLiveAccountLabel(acc)) return;
              const amt = Number(r.amount) || 0;
              map[acc] = (map[acc] || 0) + sign * amt;
            });
          });
        });
      } catch (e) {}
      return map;
    }
    function autoAdvancePersianMonthIfNeeded() {
      try {
        const today = getTodayPersian();
        if (!today || !today.y || !today.m) return false;
        // اگر ماه/سال فعلی نرم‌افزار عقب‌تر از ماه واقعی است، جلو ببر
        let guard = 0;
        let advanced = false;
        while (guard < 24) {
          guard++;
          const curKey = (currentYear || 0) * 100 + (currentMonth || 0);
          const todayKey = today.y * 100 + today.m;
          if (curKey >= todayKey) break;
          // ذخیره ماه فعلی با موجودی پایانی
          try { persistCurrent(); } catch (eP) {}
          const ending = computePersonEndingInstants();
          const accEnding = (typeof computeAccountEndingBalances === 'function') ? computeAccountEndingBalances() : {};
          try {
            archive[periodKey(currentYear, currentMonth)] = JSON.parse(JSON.stringify(periodData));
          } catch (eA) {}
          // ماه بعد
          let nm = (currentMonth || 1) + 1;
          let ny = currentYear || today.y;
          if (nm > 12) { nm = 1; ny += 1; }
          currentMonth = nm;
          currentYear = ny;
          // بارگذاری ماه جدید
          try { loadCurrent(); } catch (eL) {}
          if (!periodData.personOpeningInstant || typeof periodData.personOpeningInstant !== 'object') {
            periodData.personOpeningInstant = {};
          }
          if (!periodData.accountOpeningInstant || typeof periodData.accountOpeningInstant !== 'object') {
            periodData.accountOpeningInstant = {};
          }
          var hasRows = false;
          try {
            ['income', 'expense'].forEach(function(tab) {
              (periodData[tab] && periodData[tab].sections || []).forEach(function(s) {
                if (s && s.rows && s.rows.some(function(r) { return r && (r.amount || r.desc); })) hasRows = true;
              });
            });
          } catch (eH) {}
          if (!hasRows) {
            periodData.personOpeningInstant = ending;
            periodData.accountOpeningInstant = accEnding;
          } else {
            Object.keys(ending).forEach(function(k) {
              if (periodData.personOpeningInstant[k] == null) periodData.personOpeningInstant[k] = ending[k];
            });
            /* ماهی که الان رسیده: موجودی اول ماه = پایان ماه قبل. عددی که قبلاً (وقتی این ماه آینده بود) ذخیره شده کهنه است
               و جایگزین می‌شود؛ فقط حسابی که در همین ماه ساخته شده موجودی اولیهٔ خودش را نگه می‌دارد */
            var _arrK = currentYear * 100 + currentMonth;
            Object.keys(accEnding).forEach(function(k) {
              var _ck = 0; try { _ck = _hkAccCreationKey(k); } catch (eCk) {}
              if (periodData.accountOpeningInstant[k] == null || _ck < _arrK) periodData.accountOpeningInstant[k] = accEnding[k];
            });
          }
          /* موجودی زمان ایجاد کارت قفل است — با پایان ماه عوض نشود */
          try { persistCurrent(); } catch (eP2) {}
          advanced = true;
        }
        if (advanced) {
          try {
            const hm = document.getElementById('monthSelect');
            const hy = document.getElementById('yearSelect');
            if (hm) hm.value = currentMonth;
            if (hy) hy.value = currentYear;
            const mw = document.getElementById('monthSelectWrap');
            const yw = document.getElementById('yearSelectWrap');
            if (mw && mw.setValue) mw.setValue(currentMonth);
            if (yw && yw.setValue) yw.setValue(currentYear);
          } catch (eS) {}
          try { scheduleSave(); } catch (e) {}
          try { renderAll(); } catch (e) {}
          try { renderHomeCards(); } catch (e) {}
        }
        return advanced;
      } catch (e) {
        return false;
      }
    }

    function checkInstallReminders() {
      const bar = document.getElementById('remindBar');
      const banner = document.getElementById('remindBanner');
      const dot = document.getElementById('remindDot');
      let items = [];
      try { items = getReminderItems() || []; } catch (e) { items = []; }
      if (!bar || !banner) return;
      if (bar._dismissing) return; /* در حال انیمیشن بسته شدن */
      // یادآور باید داخل sticky-chrome بماند
      try {
        const chrome = document.getElementById('stickyChrome');
        if (chrome && bar.parentNode !== chrome) {
          const tabs = document.getElementById('tabsBar');
          if (tabs && tabs.parentNode === chrome) chrome.insertBefore(bar, tabs);
          else chrome.appendChild(bar);
        }
      } catch (e) {}
      if (window._remindDismissed && window._remindDismissed.install) {
        /* کاربر باکس اقساط را (موقتاً) بسته است؛ تا ورود دوباره به نرم‌افزار نمایش داده نمی‌شود */
        bar.style.display = 'none';
        bar.classList.remove('has-alerts');
        bar.classList.remove('open');
        bar.classList.remove('open-overlay');
        if (dot) dot.style.display = 'none';
        requestAnimationFrame(syncChromeHeight);
        return;
      }
      if (!items.length) {
        bar.style.display = 'none';
        bar.classList.remove('has-alerts');
        banner.innerHTML = '';
        if (dot) dot.style.display = 'none';
        requestAnimationFrame(syncChromeHeight);
        return;
      }
      bar.style.display = 'block';
      bar.classList.remove('has-alerts');
      if (dot) { dot.style.display = 'none'; }
      let html = '<div class="remind-table-wrap"><table class="remind-table"><thead><tr>' +
        '<th style="text-align:center;">وضعیت</th><th style="text-align:center;">نام</th><th style="text-align:center;">قسط</th><th style="text-align:center;">مبلغ</th><th style="text-align:center;">سررسید</th>' +
        '</tr></thead><tbody>';
      items.forEach(i => {
        html += '<tr>' +
          '<td class="r-badge-cell"><span class="remind-badge ' + i.kind + '">' + escapeHtml(i.badge) + '</span></td>' +
          '<td class="r-name"><strong>' + escapeHtml(i.title) + '</strong></td>' +
          '<td style="text-align:center;">' + escapeHtml(i.qNum) + '</td>' +
          '<td class="r-amt">' + formatNum(i.amount) + '</td>' +
          '<td class="r-due">' + escapeHtml(i.dueLabel) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
      banner.innerHTML = html;
      requestAnimationFrame(syncChromeHeight);

      if ('Notification' in window && Notification.permission === 'granted') {
        const today = getTodayPersian();
        const key = 'notif_' + today.y + '_' + today.m + '_' + today.d;
        if (!sessionStorage.getItem(key)) {
          const body = items.map(i => i.badge + ': ' + i.title + ' قسط ' + i.qNum).join(' | ');
          try {
            new Notification('یادآوری اقساط', { body: body, dir: 'rtl' });
            sessionStorage.setItem(key, '1');
          } catch (e) {}
        }
      }
    }
    function closeRemindBar() {
      try {
        const bar = document.getElementById('remindBar');
        const bd = document.getElementById('remindBackdrop');
        if (bar) {
          bar.classList.remove('open');
          bar.classList.remove('open-overlay');
        }
        const arrow = document.getElementById('remindArrow');
        if (arrow) arrow.style.transform = '';
        try { if (window.resetRemindCollapseStyles) window.resetRemindCollapseStyles(); } catch (eR) {}
        /* بستن یادآور کاربر هم اگر باز است */
        try {
          const ur = document.getElementById('userRemindBar');
          if (ur) {
            ur.classList.remove('open');
            ur.classList.remove('open-overlay');
          }
        } catch (eU) {}
        if (bd) bd.classList.remove('open');
        // ارتفاع کروم را قفل نگه دار تا صفحه اصلی تکان نخورد
        try {
          const locked = document.documentElement.style.getPropertyValue('--chrome-h');
          if (locked) {
            document.body.style.paddingTop = 'calc(' + locked.trim() + ' + env(safe-area-inset-top, 0px))';
          }
        } catch (eP) {}
      } catch (e) {}
    }
    function bindRemindScrollClose() {
      if (window._remindScrollCloseBound) return;
      window._remindScrollCloseBound = true;
      let lastY = 0;
      let touching = false;
      window._remindCollapse = 0; // 0 باز کامل … 1 بسته
      function getRemindBody() {
        const bar = document.getElementById('remindBar');
        return bar && (bar.querySelector('.remind-bar-body') || document.getElementById('remindBanner'));
      }
      function applyRemindCollapse(p, withTransition) {
        const bar = document.getElementById('remindBar');
        if (!bar || !bar.classList.contains('open')) return;
        const body = getRemindBody();
        p = Math.max(0, Math.min(1, p));
        window._remindCollapse = p;
        if (body) {
          const full = body._fullH || body.scrollHeight || body.offsetHeight || 280;
          body._fullH = full;
          const h = Math.max(0, Math.round(full * (1 - p)));
          body.style.overflow = 'hidden';
          if (withTransition) body.style.transition = 'max-height 0.22s ease, opacity 0.22s ease';
          else body.style.transition = 'none';
          body.style.maxHeight = h + 'px';
          body.style.opacity = String(Math.max(0.2, 1 - p * 0.85));
        }
      }
      function snapRemindCollapse() {
        const p = window._remindCollapse || 0;
        // بیشتر از نصف باز بود (collapse < 0.5) → کامل باز؛ وگرنه ببند
        if (p < 0.5) {
          applyRemindCollapse(0, true);
          setTimeout(function() {
            try { if (window.resetRemindCollapseStyles) window.resetRemindCollapseStyles(); } catch (e) {}
          }, 240);
        } else {
          applyRemindCollapse(1, true);
          setTimeout(function() {
            try { closeRemindBar(); } catch (e) {}
          }, 200);
        }
      }
      function resetRemindCollapseStyles() {
        const body = getRemindBody();
        if (body) {
          body.style.maxHeight = '';
          body.style.opacity = '';
          body.style.overflow = '';
          body.style.transition = '';
          body._fullH = 0;
        }
        window._remindCollapse = 0;
      }
      window.resetRemindCollapseStyles = resetRemindCollapseStyles;
      document.addEventListener('touchstart', function(e) {
        if (!e.touches || !e.touches[0]) return;
        lastY = e.touches[0].clientY;
        touching = true;
        const bar = document.getElementById('remindBar');
        if (bar && bar.classList.contains('open')) {
          const body = getRemindBody();
          if (body && !body._fullH) body._fullH = body.scrollHeight || body.offsetHeight || 280;
        }
      }, { passive: true });
      document.addEventListener('touchmove', function(e) {
        if (!touching) return;
        const bar = document.getElementById('remindBar');
        if (!bar || !bar.classList.contains('open')) return;
        if (!e.touches || !e.touches[0]) return;
        const y = e.touches[0].clientY;
        const dy = y - lastY;
        lastY = y;
        if (dy < 0) {
          applyRemindCollapse((window._remindCollapse || 0) + (-dy) / 220, false);
        } else if (dy > 0 && (window._remindCollapse || 0) > 0) {
          applyRemindCollapse((window._remindCollapse || 0) - dy / 260, false);
        }
      }, { passive: true });
      document.addEventListener('touchend', function() {
        if (!touching) return;
        touching = false;
        const bar = document.getElementById('remindBar');
        if (!bar || !bar.classList.contains('open')) return;
        if ((window._remindCollapse || 0) > 0.02) snapRemindCollapse();
      }, { passive: true });
      document.addEventListener('touchcancel', function() {
        touching = false;
        const bar = document.getElementById('remindBar');
        if (!bar || !bar.classList.contains('open')) return;
        if ((window._remindCollapse || 0) > 0.02) snapRemindCollapse();
      }, { passive: true });
      // چرخ موس: فقط در حین حرکت، بدون snap لحظه‌ای
      document.addEventListener('wheel', function(e) {
        const bar = document.getElementById('remindBar');
        if (!bar || !bar.classList.contains('open')) return;
        if (e.deltaY < 0) {
          applyRemindCollapse((window._remindCollapse || 0) + (-e.deltaY) / 400, false);
        } else if (e.deltaY > 0 && (window._remindCollapse || 0) > 0) {
          applyRemindCollapse((window._remindCollapse || 0) - e.deltaY / 450, false);
        }
      }, { passive: true });
    }
    function toggleRemindBar() {
      const bar = document.getElementById('remindBar');
      const bd = document.getElementById('remindBackdrop');
      if (!bar) return;
      const willOpen = !bar.classList.contains('open');
      if (willOpen) {
        try { syncChromeHeight(); } catch (e) {}
        bar.classList.add('open');
        bar.classList.add('open-overlay');
        if (bd) bd.classList.add('open');
        const arrow = document.getElementById('remindArrow');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        try { bindRemindScrollClose(); } catch (eB) {}
      } else {
        closeRemindBar();
        // بدون syncChromeHeight تا صفحه جابه‌جا نشود
      }
    }

    function closeRemindBarIfOpen() {
      const bar = document.getElementById('remindBar');
      if (!bar || !bar.classList.contains('open')) return;
      bar.classList.remove('open');
      const arrow = document.getElementById('remindArrow');
      if (arrow) arrow.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
      requestAnimationFrame(() => {
        syncChromeHeight();
        moveTabIndicator();
      });
    }

    function requestNotifPermission() {
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(function () {
          try { Notification.requestPermission(); } catch (e) {}
        }, 1500);
      }
    }


