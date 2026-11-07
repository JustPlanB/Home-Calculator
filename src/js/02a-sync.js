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

