Sites Users Front
=================

Lightweight standalone frontend to view users per site across your SMM Panel deployment. Designed to be deployed separately from the main app.

Features
- Lists all sites from `GET /api/sites` with user counts.
- Per-site on-demand loading of users via `GET /api/sites/:siteKey/users`.
- Filter box, manual site key fallback, and configurable backend base URL.

Usage
- Serve this folder via any static hosting (e.g., Nginx, Vercel static, S3).
- Open `index.html` and set the backend base URL (leave blank if served under same origin as API), then click “Load Sites”.
- Optional query params:
  - `?backend=https://api.example.com` to prefill backend origin.
  - `&autoload=1` to auto-fetch sites on load.

API Requirements
- Backend must expose:
  - `GET /api/sites` → `{ sites: [{ key, name, usersCount, createdAt }] }`
  - `GET /api/sites/:siteKey/users` → `{ users: [...] }`

