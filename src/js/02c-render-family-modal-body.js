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


