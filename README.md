Sites Users Front
=================

Lightweight standalone frontend to view users per site across your SMM Panel deployment. Designed to be deployed separately from the main app.

Features
- Lists all sites from `GET /api/sites` with user counts.
- Per-site on-demand loading of users via `GET /api/sites/:siteKey/users`.
- Fixed backend base URL to the provided API.

Configured API Base
- `https://smm-panel-q8q0.onrender.com`

Usage
- Serve this folder via any static hosting (e.g., Nginx, Vercel static, S3).
- Open `index.html`; it will automatically load sites from the configured API. Use the “Reload Sites” button to refresh.

API Requirements
- Backend must expose:
  - `GET /api/sites` → `{ sites: [{ key, name, usersCount, createdAt }] }`
  - `GET /api/sites/:siteKey/users` → `{ users: [...] }`
