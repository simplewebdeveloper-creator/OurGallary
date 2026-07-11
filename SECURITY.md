# Atelier Gallery Security Recommendations

## 1. Use environment variables

- Store sensitive values in a `.env` file, not in source code.
- Use `SESSION_SECRET`, admin credentials, and `NODE_ENV` in `.env`.
- Ensure `.env` is excluded from version control by adding it to `.gitignore`.

## 2. Migrate from JSON files to a real database

- Replace `data/users.json` and `data/gallery.json` with SQLite, PostgreSQL, or MongoDB.
- This improves security, concurrency, and reliability.

## 3. Enable HTTPS / TLS

- Serve production traffic over HTTPS.
- Use a reverse proxy like Nginx, or deploy on a hosting platform that handles TLS for you.

## 4. Add stronger auth protections

- Add CSRF protection for state-changing requests.
- Add rate limiting to login and register routes.
- Validate and sanitize all user inputs.

## 5. Implement real password recovery

- Replace the placeholder `/api/forgot` logic with a token-based reset system.
- Send reset links via email and verify them server-side.

## 6. Audit dependencies

- Run `npm audit fix` and keep packages updated.
- Regularly review dependencies for security advisories.
