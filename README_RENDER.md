Render deployment guide for Atelier Gallery

This guide explains how to deploy the full app (frontend + Node `server.js`) to Render so the site is live and secure.

1) Prepare your repository

- Ensure you have a Git repo and all production-ready files included (don't commit secrets):
  - Include: `index.html`, `auth.html`, `admin-login.html`, `dashboard.html`, `user-dashboard.html`, `admin-dashboard.html`, `css/`, `js/`, `server.js`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, `SECURITY.md`.
  - Exclude: `node_modules/`, `.env`, `data/` (file-based storage is not durable on Render for production).

Quick Git commands (run from project root):

```bash
git init
git add .
git commit -m "Initial commit"
# create a GitHub repository, then:
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

2) Create a Render account and connect your GitHub repo

- Sign up at https://render.com and connect your GitHub account when prompted.
- In Render dashboard click: "New" → "Web Service" → select your repository and branch (usually `main`).

3) Configure service settings on Render

- Environment: `Node` (Build/Start will use Node/npm)
- Build Command: `npm install`
- Start Command: `npm start`
  - Render provides a `PORT` env var; your `server.js` uses `process.env.PORT || 3000` so this is OK.
- Instance type: choose Free or Paid depending on traffic and availability.

4) Add required Environment Variables (Render → Service → Environment)

Add the following env vars (use secure values):

- `SESSION_SECRET` — long random string (e.g. 48 bytes hex). Generate locally:

```bash
# Linux / macOS (openssl):
openssl rand -hex 48

# Node (cross-platform):
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- `NODE_ENV=production`
- `ADMIN_EMAIL` (example: `admin@atelier.com`)
- `ADMIN_USERNAME` (example: `Loveyy`)
- `ADMIN_PASSWORD` (replace the default with a secure password)

Optional:
- `PORT` (usually not needed; Render sets this for you)

How-to in Render UI:
- Open your service → "Environment" tab → click "Add Environment Variable" → add each key/value.

5) Remove or migrate JSON storage (recommended)

- Render file system is ephemeral across deploys. Do NOT rely on `data/users.json` and `data/gallery.json` for persistent production storage.
- Options:
  - Use a managed Postgres database (Render offers Postgres add-on) and update `server.js` to use the DB instead of JSON files.
  - Use an external file store (S3) for large media and a DB for metadata.

6) Deploy and verify

- After filling env vars and settings, click "Create Web Service".
- Render will build and start the service. Watch the build logs on Render.
- Once deployed, open the generated service URL (e.g. `https://your-app.onrender.com`).

Test admin login:
- Visit `https://<your-service>/admin-login.html`
- Sign in using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set.

7) Troubleshooting

- If login fails or the app shows blank pages:
  - Check Render service logs (Service → Logs) for stack traces or errors.
  - Confirm env vars are present and `SESSION_SECRET` is set.
  - Ensure `NODE_ENV=production` so cookie `secure` flag is set in production.

- If static files appear broken:
  - Confirm `server.js` is serving static files from the project root (the current `server.js` serves `express.static(path.join(__dirname, '.'))`).

- If session cookies are not persisting:
  - Confirm the browser is visiting the same domain as the backend URL.
  - For custom domains, ensure HTTPS is enabled and cookies `secure: true` are effective.

8) Post-deploy security steps

- Migrate to a real DB (Postgres) and remove file-based users storage.
- Configure automatic backups for your DB.
- Add rate limiting (e.g. `express-rate-limit`) for auth endpoints.
- Add CSRF protection and input validation.
- Run `npm audit fix` and keep dependencies updated.

9) If you prefer the static frontend on GitHub Pages and backend on Render

- Deploy the static `*.html`, `css/`, `js/` to GitHub Pages.
- Deploy `server.js` to Render.
- Set `API_BASE` in `js/app.js` to your Render service URL (e.g. `https://your-app.onrender.com`).
- Configure CORS and cookies appropriately (`sameSite: 'none'`, `secure: true`) for cross-origin requests.

10) Quick checklist (summary)

- [ ] Push repo to GitHub
- [ ] Create Render Web Service (select repo)
- [ ] Set Build: `npm install`, Start: `npm start`
- [ ] Add env vars: `SESSION_SECRET`, `NODE_ENV`, `ADMIN_*`
- [ ] Deploy and test `/admin-login.html`
- [ ] Migrate storage to a DB for production

If you want, I can:
- Add a `README.md` with these steps merged into your repo root.
- Generate a minimal `docker-compose.yml` / Dockerfile for containerized deployment.
- Help migrate `data/users.json` -> Postgres with a small migration script.


File created: `README_RENDER.md` in the project root.
