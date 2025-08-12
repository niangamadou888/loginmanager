(() => {
  // --- Simple client-side admin auth (not secure for real secrets) ---
  const ADMIN_STORAGE_KEY = 'lm_admin_logged_in';
  const DEFAULT_ADMIN_PASSWORD = 'admin123'; // Change this in production

  function isAdminLoggedIn() {
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  }

  function setAdminLoggedIn(value) {
    if (value) localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    else localStorage.removeItem(ADMIN_STORAGE_KEY);
  }

  function getConfiguredAdminPassword() {
    // Allow overriding via global variable, else fallback
    const fromGlobal = typeof window !== 'undefined' && window.ADMIN_PASSWORD;
    return (fromGlobal && String(fromGlobal)) || DEFAULT_ADMIN_PASSWORD;
  }

  function enforceAuthForSitesPage() {
    const onSitesPage = !!document.getElementById('sitesList');
    if (onSitesPage && !isAdminLoggedIn()) {
      window.location.replace('index.html#login-required');
    }
  }

  function toggleProtectedLinks() {
    const sitesLinks = document.querySelectorAll('a[href="sites.html"], a.nav-link[href="sites.html"]');
    sitesLinks.forEach((a) => {
      if (!isAdminLoggedIn()) {
        a.setAttribute('aria-disabled', 'true');
        a.classList.add('hidden');
      } else {
        a.removeAttribute('aria-disabled');
        a.classList.remove('hidden');
      }
    });
  }

  function wireLoginUI() {
    const loginForm = document.getElementById('adminLoginForm');
    const passwordInput = document.getElementById('adminPassword');
    const loginStatus = document.getElementById('loginStatus');
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setAdminLoggedIn(false);
        toggleProtectedLinks();
        const loggedInWrap = document.getElementById('loggedInWrap');
        const loginWrap = document.getElementById('loginWrap');
        if (loggedInWrap) loggedInWrap.classList.add('hidden');
        if (loginWrap) loginWrap.classList.remove('hidden');
      });
    }

    if (!loginForm || !passwordInput) return;

    // If already logged in, flip UI states
    const loggedIn = isAdminLoggedIn();
    const loggedInWrap = document.getElementById('loggedInWrap');
    const loginWrap = document.getElementById('loginWrap');
    if (loggedIn) {
      if (loginWrap) loginWrap.classList.add('hidden');
      if (loggedInWrap) loggedInWrap.classList.remove('hidden');
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const expected = getConfiguredAdminPassword();
      const provided = String(passwordInput.value || '').trim();
      if (!provided) {
        if (loginStatus) loginStatus.textContent = 'Please enter the admin password.';
        return;
      }
      if (provided !== expected) {
        if (loginStatus) loginStatus.textContent = 'Invalid password.';
        return;
      }
      setAdminLoggedIn(true);
      toggleProtectedLinks();
      if (loginStatus) loginStatus.textContent = '';
      // If a redirect was intended, go to sites
      window.location.href = 'sites.html';
    });
  }

  // Initialize auth UI and protections early
  enforceAuthForSitesPage();
  toggleProtectedLinks();
  wireLoginUI();

  const loadSitesBtn = document.getElementById('loadSitesBtn');
  const exportAllEmailsBtn = document.getElementById('exportAllEmailsBtn');
  const sitesList = document.getElementById('sitesList');
  const notice = document.getElementById('notice');

  // Fixed backend base URL
  const API_BASE = 'https://smm-panel-q8q0.onrender.com';

  function fmtDate(s) {
    try { return new Date(s).toLocaleString(); } catch (_) { return s || '-'; }
  }

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  async function fetchJSON(path) {
    const url = API_BASE + path;
    const res = await fetch(url, { credentials: 'omit' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json && json.error ? json.error : `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  function renderSites(sites) {
    sitesList.innerHTML = '';
    if (!sites.length) {
      const empty = el('div', 'muted');
      empty.style.padding = '12px';
      empty.textContent = 'No sites found.';
      sitesList.appendChild(empty);
      return;
    }

    const tpl = document.getElementById('siteRowTpl');
    sites.forEach((s) => {
      const node = tpl.content.cloneNode(true);
      node.querySelector('.site-key').textContent = s.key;
      node.querySelector('.site-meta').textContent = `${s.name || s.key} • Users: ${s.usersCount ?? '—'} • Created: ${fmtDate(s.createdAt)}`;
      const usersWrap = node.querySelector('.users');
      const usersStatus = node.querySelector('.users-status');
      const usersTbody = node.querySelector('tbody');
      const btn = node.querySelector('.load-users');

      async function loadUsers() {
        usersWrap.hidden = false;
        usersStatus.hidden = false;
        usersStatus.textContent = 'Loading...';
        usersTbody.innerHTML = '';
        try {
          const data = await fetchJSON(`/api/sites/${encodeURIComponent(s.key)}/users`);
          const users = data.users || [];
          if (!users.length) {
            usersStatus.textContent = 'No users for this site yet.';
            return;
          }
          usersStatus.hidden = true;
          usersTbody.innerHTML = users
            .map((u) => {
              const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-';
              const provider = `<span class="pill">${u.provider || 'password'}</span>`;
              return `<tr>
                <td>${name}</td>
                <td>${u.email || '-'}</td>
                <td>${u.phone || '-'}</td>
                <td>${provider}</td>
                <td>${fmtDate(u.createdAt)}</td>
              </tr>`;
            })
            .join('');
        } catch (err) {
          usersStatus.hidden = false;
          usersStatus.textContent = `Error loading users: ${err.message}`;
        }
      }

      btn.addEventListener('click', loadUsers);
      sitesList.appendChild(node);
    });
  }

  async function loadSites() {
    sitesList.innerHTML = '';
    notice.classList.remove('muted');
    notice.textContent = 'Loading sites...';
    try {
      const data = await fetchJSON('/api/sites');
      const sites = data.sites || [];
      renderSites(sites);
      notice.classList.add('muted');
      notice.textContent = `${sites.length} site(s) loaded.`;
    } catch (err) {
      notice.classList.remove('muted');
      notice.textContent = `Could not load sites: ${err.message}.`;
    }
  }

  async function exportAllEmails() {
    if (!notice) return;
    const originalText = exportAllEmailsBtn ? exportAllEmailsBtn.textContent : '';
    try {
      if (exportAllEmailsBtn) {
        exportAllEmailsBtn.disabled = true;
        exportAllEmailsBtn.textContent = 'Exporting…';
      }
      notice.classList.remove('muted');
      notice.textContent = 'Exporting emails…';

      const sitesRes = await fetchJSON('/api/sites');
      const sites = sitesRes.sites || [];
      if (!sites.length) {
        notice.textContent = 'No sites available to export.';
        return;
      }

      const emailSetsPerSite = await Promise.all(
        sites.map(async (s) => {
          try {
            const usersRes = await fetchJSON(`/api/sites/${encodeURIComponent(s.key)}/users`);
            const users = usersRes.users || [];
            return users
              .map((u) => (u.email || '').trim())
              .filter((e) => !!e);
          } catch (_) {
            return [];
          }
        })
      );

      const allEmails = new Set();
      emailSetsPerSite.forEach((arr) => arr.forEach((e) => allEmails.add(e)));
      const lines = Array.from(allEmails.values());

      if (!lines.length) {
        notice.textContent = 'No emails found to export.';
        return;
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loginmanager-emails.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      notice.classList.add('muted');
      notice.textContent = `Exported ${lines.length} unique email(s).`;
    } catch (err) {
      notice.classList.remove('muted');
      notice.textContent = `Export failed: ${err.message}`;
    } finally {
      if (exportAllEmailsBtn) {
        exportAllEmailsBtn.disabled = false;
        exportAllEmailsBtn.textContent = originalText || 'Export all emails';
      }
    }
  }

  // Wire up events (Sites page only)
  if (loadSitesBtn && sitesList && notice) {
    loadSitesBtn.addEventListener('click', loadSites);
    if (exportAllEmailsBtn) exportAllEmailsBtn.addEventListener('click', exportAllEmails);
    // Auto-load only on sites page
    loadSites();
  }
})();
