# Blocking issues audit

Audit date: 2026-11-02. Branch: `cherry-picking` (working tree, with uncommitted changes).
Scope: `backend/` in full (static checks, route/auth review); `front/` was not audited.
Method: import resolution, ESLint `no-undef` pass over the backend, reading of routes/controllers/middleware, `git ls-files` review. Nothing was run against a database, and no fixes were applied.

Severity: **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug that will break a code path.

---

## P0 — Fix before any deploy

### 1. The server does not start (broken import) — FIXED
`backend/controllers/rotation.controller.js:7`

```js
import AppError from '../errors/AppError.js';   // wrong folder AND wrong export style
```

The folder is `backend/error/` (not `errors/`), and `AppError` is a **named** export (`export class AppError`), not a default export. Because `routes/index.js` → `rotations.routes.js` → this controller, `server.js` crashes at import time.
Verified: `import('./routes/index.js')` fails with `ERR_MODULE_NOT_FOUND`.
Likely cause: the uncommitted rename `appError.js → AppError.js` / folder refactor was applied only partly.
**Fix:** `import { AppError } from '../error/AppError.js';`
**Status:** fixed. A second startup crash sat behind it: `rotations.routes.js` referenced `confirmAddActivationDate` / `confirmRemoveActivationDate`, which no longer exist in the controller (merged into `addActivationDate` / `removeActivationDate` via a `confirmed` flag). The `/confirm-*` routes now call those handlers with `confirmed: true`, so the front end is unchanged. `routes/index.js` imports cleanly.

### 2. Center admin accounts get a guessable password on every boot — FIXED (rotate existing accounts)
`backend/utils/seedAdmin.js` (`createLocalAdmin`, called unconditionally from `server.js` after the Mongo connect)

For every center, it upserts a user `admin-<oaci>@celeste-app.fr` with `isAdmin: true`, `adminType: 'local'`, `points: MAX_SAFE_INTEGER` and the password **`admin-<oaci>`**. On existing accounts it `Object.assign`s over the document, so:
- anyone who knows a center's OACI code (public, and listed by `GET /api/center`) can log in as that center's admin in production;
- any password a real admin sets is **reset on the next restart**.

`seedDefaultConfig.js:328,340` also hardcodes `password: 'user'` / `'admin-lfbb'` (acceptable only if strictly dev, see #5).
**Status:** `createLocalAdmin` now requires `LOCAL_ADMIN_PASSWORD`; without it, no account is created or touched. New admins get the password `<LOCAL_ADMIN_PASSWORD>-<oaci>`, and existing accounts keep their password. Existing production accounts still have the old `admin-<oaci>` password until it is changed by hand.
**Original recommendation:** remove `createLocalAdmin` from the production boot path (gate it on a non-production `NODE_ENV`, and never overwrite an existing user's password). Rotate any local admin passwords currently in production.

### 3. Center management API has no authentication
`backend/routes/center.routes.js` — no `verifyToken`/`isAdmin` anywhere.

Unauthenticated callers can `POST /api/center` (create), `PUT /api/center/:id` (update) and `DELETE /api/center/:id` (delete a center), and read admin lists (`GET /api/center/admins`) and user counts.
**Fix:** add `verifyToken` to the router and `isMasterAdmin` (or an equivalent center-scoped check) to the write routes.

### 4. JWT secrets fall back to public literals
`backend/middleware/authMiddleware.js:19` and `backend/services/auth/auth.refreshToken.js:6-7`

```js
process.env.JWT_SECRET || 'secret'
process.env.JWT_REFRESH_SECRET || 'refresh-secret'
```

If either variable is missing from the production environment (the root `.env` tracked in git is empty, and `.env.prod` is not in the repo), the server silently signs tokens with a known key, and anyone can forge an admin/master-admin token. Also, `auth.refreshToken.js` reads `process.env` at module load; verify `dotenv.config()` has run before that import in `server.js` (ES imports are hoisted, so it may not have).
**Fix:** throw at startup when either secret is unset; confirm the production values are set and are not these literals.

### 5. Secrets and server details committed to git
Tracked files (`git ls-files`): `.env`, `front/.env.production`, `ssh_config`, `replacement.txt`, `hs_err_pid*.log`, `replay_pid*.log`.
- `.env` is empty today, but history shows MongoDB credentials were committed and then deleted (commits `3fe86b8`, `ee2c783`). They remain recoverable from history: **treat them as leaked and rotate**.
- `ssh_config` publishes the production host IP, login `root`, and `StrictHostKeyChecking no` (disables host verification, enabling MITM).
- The JVM crash/replay logs may contain environment variables and local paths. I did not inspect their contents; review before keeping.
- `.gitignore` lists `.env`, yet the file is still tracked, because it was added before the ignore rule.
**Fix:** `git rm --cached` these files, rotate the Mongo credentials, review the logs for secrets, and set `StrictHostKeyChecking` to `accept-new` or `yes`. Rewriting history (a `git-filter-repo` dependency is already in the root `package.json`) is optional once the secrets are rotated.

---

## P1 — Serious security/correctness defects

### 6. Other endpoints that need no token
| Route | Problem |
|---|---|
| `GET /api/stats`, `/users`, `/centers`, `/substitutions` | comment says "all routes require authentication"; none do |
| `POST /api/tickets/status/:id` | anyone can change any ticket's status (the handler also returns 500 for every error) |
| `POST /api/tickets/create` | comment says authenticated users only; no `verifyToken`, so `req.user` is unavailable |
| `POST /api/messages` | unauthenticated write (probably the public contact form; add rate limiting) |
| `GET /api/teams/:id` | unauthenticated |
| `GET /api/users/info/:email`, `GET /api/users/devlist` | unauthenticated user lookup/enumeration; `devlist` returns names, emails and teams of all active users and has no environment guard |
| `POST /api/users/check-email`, `POST /api/otp/*` | account/email enumeration; see #8 |

### 7. SNS inbound-mail webhook is unauthenticated
`POST /api/tickets/inbound` (`services/email/email.inbound.js`) accepts any JSON body: it does not verify the SNS signature or `TopicArn`, and it calls `confirmSubscription(message.SubscribeURL)` with a URL taken from the request (server-side request forgery). Anyone can inject ticket replies on behalf of any user, or make the server fetch arbitrary URLs.
**Fix:** verify the SNS message signature and `TopicArn`, and only fetch `SubscribeURL` on `*.amazonaws.com`.

### 8. No brute-force protection
`package.json` has no `express-rate-limit`/`helmet`. `/auth/login`, `/auth/reset-password`, `/otp/verify` (6-digit codes) and `/otp/send` are open to unlimited guessing. Add rate limiting, and attempt-limiting on OTP verification.

### 9. Authorization gaps in `isUserOrAdmin`
`middleware/authMiddleware.js:63` lets **any** admin act on **any** user (including other centers), for example `assign-team`, `team-occurrences` deletion and avatar upload. Also `GET /users/:id/transactions`, `/current-team` and `/teams/:centerId`, `/center/:centerId` have no ownership/center check at all (any logged-in user can read any center's data). Needs a center-scope check (`checkUserCenter` exists but is used on only one route).

### 10. Access tokens are `15m`, refresh tokens `180d` — but the cookie lives 365 days
`auth.controller.js:25` sets `maxAge` 365 days while the refresh JWT expires in 180 days (the comment in `auth.refreshToken.js` says "365 jours"). Harmless but inconsistent; confirm the intended lifetime, and that `COOKIE_OPTIONS` sets `httpOnly`, `secure` and `sameSite`.

### 11. Oversized request bodies and file uploads
`server.js` sets `express.json({ limit: '50mb' })` globally, unauthenticated. The avatar upload (`user.routes.js`) trusts the client: any file is saved with a `.png` extension and no MIME check, into `public/avatars`, which is served statically. Reduce the global limit, validate MIME type and magic bytes, and consider re-encoding images.

---

## P2 — Latent runtime errors (code paths that will throw)

### 12. `next` used but never declared (15+ handlers) — FIXED
The handlers are `async (req, res) =>` but their `catch` calls `next(error)`. In Express 5 the resulting `ReferenceError` becomes a generic 500 and **replaces the real `AppError` status and message** (404/400/403 all turn into 500).

| File | Lines |
|---|---|
| `controllers/accountRecovery.controller.js` | 11, 21, 38 |
| `controllers/announcement.controller.js` | 74, 107, 179, 213, 266, 294 |
| `controllers/calendarEntry.controller.js` | 82, 156, 171 |
| `controllers/message.controller.js` | 15, 52, 74, 90 |
| `controllers/otp.controller.js` | 55, 85 |
| `controllers/recovery.controller.js` | 44 (`fetchLegacyUser`) |
| `controllers/rotation.controller.js` | 264, 309, 352, 375 |
| `controllers/user.controller.js` | 28 (`createUser`, also used as middleware in `/account-recovery/recover`) |

**Status:** fixed. `next` added to 23 handler signatures; `getMailList` in `announcement.controller.js` is a helper, not a handler, so it now rethrows instead of calling `next`.

### 13. Undefined identifiers in services (ReferenceError when reached) — partly fixed
Fixed: `cancelRequestWithSession`, `User` (request.internal.js), `scheduledTransactionService`. Still open: `user.team.js` and `categorizeDemand_v2.js` (unfinished code, not missing imports).
Found by an ESLint `no-undef` pass:

| File | Line | Missing |
|---|---|---|
| `services/rotationService/rotationActivationService.js` | 271 | `cancelRequestWithSession` (not imported) |
| `services/substitution/request.internal.js` | 110 | `User` (not imported) |
| `services/substitution/request.mutations.utils.js` | 9 | `scheduledTransactionService` (not imported) |
| `services/user/user.team.js` | 110-111 | `cancelModification`, `cancelSubstitution` |
| `services/user/user.team.js` | 163 | `Modification`, `userId` |
| `utils/categorizeDemand_v2.js` | 734 | `localShiftsSorted` (the same bug exists at line 427 of the old v1 file) |

These sit on rotation activation, the substitution cleanup cron (every 30 minutes) and team assignment, so they affect core flows once the server boots. `request.internal.js` is the code run by the cron job, so expect scheduled-job errors in the logs.

### 14. Half-finished cleanup in the working tree
- `routes/workshift.routes.js` is staged for deletion, and it imports a controller that does not exist (`workshiftController.js`); it is not mounted, so no runtime impact.
- `backend/deprecated/*` imports `models/Notification.js`, which does not exist (dead code, safe to delete as intended).
- `utils/categorizeDemand.js` and `utils/convertToCenterTime.js` are staged as deleted but still exist on disk; nothing imports them. Finish the deletion or restore them.

---

## Suggested order of work
1. #1 (unblocks everything else), then #12 and #13 so the app can be exercised end to end.
2. #2, #3, #4, #5 before the next production deploy; rotate credentials in parallel.
3. #6-#9 next sprint; #10-#11 as hardening.

## Not covered
- `front/` (auth storage in the browser, Capacitor config, XSS in rendered content).
- Runtime behaviour: no tests exist (`npm test` is a stub), and I could not exercise the app against MongoDB.
- Business-rule correctness of the shift/substitution computation.
- Docker/nginx configuration beyond the files already noted.
