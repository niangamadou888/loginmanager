(() => {
  const qs = new URLSearchParams(location.search);
  const backendInput = document.getElementById('backendInput');
  const loadSitesBtn = document.getElementById('loadSitesBtn');
  const filterInput = document.getElementById('filterInput');
  const sitesList = document.getElementById('sitesList');
  const notice = document.getElementById('notice');
  const siteKeyInput = document.getElementById('siteKeyInput');
  const loadOneBtn = document.getElementById('loadOneBtn');

  // Determine backend base URL
  const initialBackend = qs.get('backend') || '';
  backendInput.value = initialBackend;

  function backendBase() {
    const raw = backendInput.value.trim();
    if (!raw) return '';
    try {
      const u = new URL(raw);
      return u.origin; // normalize
    } catch (_) {
      return raw; // best effort
    }
  }

  function fmtDate(s) {
    try { return new Date(s).toLocaleString(); } catch (_) { return s || '-'; }
  }

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  async function fetchJSON(path) {
    const base = backendBase();
    const url = base + path;
    const res = await fetch(url, { credentials: 'include' });
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
    const filter = filterInput.value.trim().toLowerCase();
    const filtered = sites.filter((s) => {
      if (!filter) return true;
      return (
        (s.key && s.key.toLowerCase().includes(filter)) ||
        (s.name && String(s.name).toLowerCase().includes(filter))
      );
    });

    sitesList.innerHTML = '';
    if (!filtered.length) {
      const empty = el('div', 'muted');
      empty.style.padding = '12px';
      empty.textContent = 'No sites found.';
      sitesList.appendChild(empty);
      return;
    }

    const tpl = document.getElementById('siteRowTpl');
    filtered.forEach((s) => {
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
      notice.textContent = `Could not load sites: ${err.message}. You can still fetch a single site below.`;
    }
  }

  async function loadSingleSite() {
    const key = siteKeyInput.value.trim().toLowerCase();
    if (!key) {
      siteKeyInput.focus();
      return;
    }
    const fake = [{ key, name: key, usersCount: '—', createdAt: null }];
    renderSites(fake);
    // Auto-click the first site's View Users
    const firstBtn = sitesList.querySelector('.load-users');
    if (firstBtn) firstBtn.click();
  }

  // Wire up events
  loadSitesBtn.addEventListener('click', loadSites);
  loadOneBtn.addEventListener('click', loadSingleSite);
  filterInput.addEventListener('input', () => {
    // Re-render using last loaded sites shown in DOM, so simply trigger a synthetic load
    // In a lightweight way: collect current displayed sites and re-run render
    const rows = Array.from(sitesList.querySelectorAll('.site'));
    if (!rows.length) return;
    const sites = rows.map((row) => {
      const key = row.querySelector('.site-key').textContent;
      const meta = row.querySelector('.site-meta').textContent;
      const m = meta.match(/Users: (\d+|—)/);
      const usersCount = m && m[1] !== '—' ? Number(m[1]) : undefined;
      return { key, name: key, usersCount };
    });
    renderSites(sites);
  });

  // Autoload on first visit
  if (qs.has('autoload')) {
    loadSites();
  }
})();

