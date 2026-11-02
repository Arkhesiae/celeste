# Blocking issues audit

Audit date: 2026-11-02. Branch: `cherry-picking` (working tree, with uncommitted changes).
Scope: `backend/` in full (static checks, route/auth review); `front/` was not audited, except where noted.
Method: import resolution, ESLint `no-undef` pass over the backend, reading of routes/controllers/middleware, `git ls-files` review. Nothing was run against a database.

This file lists **open issues only**. Fixed items are removed (history is in git and `docs/product/roadmap.md`); issue numbers are stable identifiers, so gaps are fixed issues.

Severity: **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug that will break a code path.

---

## P0 — Fix before any deploy

### 2. Local admin passwords already in production (residual)
`createLocalAdmin` now requires `LOCAL_ADMIN_PASSWORD` and no longer overwrites existing passwords, so existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand: **rotate them**. Also, `utils/seedDefaultConfig.js:328,340` hardcodes `password: 'user'` / `'admin-lfbb'` (acceptable only if strictly dev; see #5 and the `ensureDev` guard in `dev.routes.js`).

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

### 27. Rotation change: confirming from the UI always fails
`front/src/pages/rotation.vue:362,386` store the pending change as `{ type, rotationId, date, changes, centerId }`, but `confirmChange` (line 398) destructures `{ type, rotation, date, centerId }`. `rotation` is `undefined`, so the confirm call goes to `/rotations/undefined/confirm-activate` (or `confirm-remove-activate`) and the backend answers 400 "ID de rotation invalide". Any activation change that needs approval (which is every change that alters the effective timeline) can therefore not be applied from the UI. **Fix:** read `rotationId` (and reset with the same key in `cancelActivation`).

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

### 20. Team-change endpoints: cross-center destructive access and data oracle (extends #9)
`POST /api/users/:id/assign-team` and `DELETE /api/users/:id/team-occurrences/:occurrenceId` (`routes/user.routes.js:71-72`) are protected only by `isUserOrAdmin`: **any admin of any center** can call them for **any user**. Since the team-change work, these calls really execute `sanitizeUserPeriod` (cancel/withdraw substitutions, including other users' cascaded requests, and deactivate calendar entries) instead of throwing, so the impact of #9 is now destructive, not just a data change.
- **Read oracle:** calling without `confirmed` returns the 409 payload for the chosen period: the victim's substitutions (dates, status, poster/accepter full names) and calendar entries. Anyone allowed to call it can probe any user. If the chosen change affects nothing, it is applied immediately without any confirmation.
- **`checkUserCenter` fails open on these routes:** it reads `req.params.userId || req.body.userId`, but these routes use `:id`, so adding it as-is would silently pass (`if (!targetUserId) return next()`). The same silent bypass already affects `GET /:id/team-at`.
- A regular user acting on themselves can also see names from cascaded requests of other users in the preview (`previewUserPeriodImpact` populates dependent requests' poster/accepter).
**Fix:** a center-scoped guard keyed on `:id` (target user's `centerId` equals the caller's, except master admin) on every `/:id/...` route, with fail-closed behaviour when the target user is missing; restrict cascade names to the caller's own requests or to admins of that center.

### 21. Production MongoDB is a standalone server but team changes now require transactions
`inTransaction` in `services/user/user.team.js` (and `user.sanitizePeriod.js`) uses `session.withTransaction`, which fails on a standalone `mongod` ("Transaction numbers are only allowed on a replica set member or mongos"). The root `docker-compose.yml` (production) starts `mongo:8.0` with `--bind_ip_all --port 27017` and **no `--replSet`**; only `backend/docker-compose.yml` (dev) sets `--replSet rs0`. If production really runs this way, every team assignment/removal now returns 500, where it previously only saved the user (the substitution cancel/withdraw/accept flows already depend on transactions and would be failing too). **Fix:** confirm production topology; run a single-node replica set in production (`--replSet` + `rs.initiate`) or add a non-transactional fallback.

### 30. `deleteRotation` checks the wrong rotation for "currently active"
`controllers/rotation.controller.js` (`deleteRotation`) looks for the active rotation with an aggregate that has **no `centerId` filter**, so it compares against the most recently activated rotation of *all* centers: a center's currently active rotation can be deleted (or a deletable one refused) depending on other centers. It also only blocks rotations that are active now or have future activations: deleting one that was active in the past rewrites history (`findLatestRotation` ignores deleted rotations, so past days are recomputed from an earlier rotation, and completed substitutions point to deleted shifts). **Fix:** filter by the rotation's `centerId` and refuse deletion while the rotation has any activation date (or soft-delete while keeping history resolvable).

### 31. `updateDayInRotation` edits shifts in place with no approval or conversion
`PUT /:id/day` mutates the `Shift` (times, points, type, name, variations) of a rotation that may be active, retroactively changing every user's planning and the shifts referenced by open, accepted and completed substitutions, without any preview, demand re-evaluation or compatibility check. Also: setting a day to `rest` is silently ignored (the whole update block is skipped but 200 is returned); and the variation clean-up `Variation.deleteMany({ _id: { $nin: newList, $in: shift.variations } })` is a no-op because `shift.variations` was already reset to the new list, so removed variations are orphaned. **Fix:** refuse (or route through the same approval flow) edits to rotations that have activation dates; delete variations against the previous list.

---

## P2 — Latent runtime errors (code paths that will throw)

### 13. Undefined identifier in `categorizeDemand_v2.js`
`utils/categorizeDemand_v2.js:734` uses `localShiftsSorted`, but the `simulateInsertShift(...)` line that defines it is commented out (`checkConsecutiveNightControls`). It throws a `ReferenceError` whenever that check runs for a work shift. Unfinished code, not a missing import: needs the intended logic.

### 26. `addSubstitutionEntries` ignores the Mongo session (same defect as the fixed #15)
`services/calendarEntry/calendar-entry.js:308` takes only `(demand)`, but `request.internal.js:174` calls `addSubstitutionEntries(request, { session })`: its reads, `updateOne`s and saves run outside the acceptance transaction and cannot be rolled back. Fix like `cancelSubstitutionEntries`: accept `{ session }`, pass it to every query/save, and avoid recomputing shifts inside the transaction (the caller uses `accepterShift` from its result, so that return value needs to be computed after commit).

### 17. Front production build fails: missing `@/utils/demandComment`
`front/src/components/Admin/AdminDemandCard.vue` imports `@/utils/demandComment`, which does not exist (`vite build` stops with `ENOENT`). Found while verifying the team-change dialog; unrelated to it and not fixed. Also, `vite build` warns that an `@import url(...)` in a stylesheet is not at the top of the file (the DM Serif Display font import is ignored).

### 18. Dead conflict dialogs in the team UI
`UserTeamCard.vue` (template lines ~157-188) and `TeamChangeDialog.vue` (~193-222) render a "Conflits détectés" dialog using `substitutionConflicts` / `handleDeleteAndSubmit`, which are not defined in `UserTeamCard.vue`'s script (and `substitutionConflicts` is also missing in `TeamChangeDialog.vue`); `showConflictDialog` is never set to true. Superseded by the server-driven 409 flow, safe to delete once confirmed.

### 19. `teams.vue` passes a string to `assignUserToTeam`
`front/src/pages/center/[centerId]/teams.vue:383` calls `teamStore.assignUserToTeam(user._id, team._id)` but the store/service expect an object `{ teamId, fromDate, toDate }`. Not verified at runtime; likely returns 400.

### 22. The `confirmed` flag is advisory and not bound to what was previewed
(The rotation activation flow behaves the same: `/activate` accepts `confirmed: true` directly and the confirm path recomputes the changes instead of applying the previewed ones.)
The client may send `confirmed: true` (body / `?confirmed=true`) at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. Not a privilege issue (the caller is already authorised), but the safeguard is only UX. **Fix (optional):** return an `impactHash` in the 409 and require it with `confirmed`; recompute inside the transaction and answer 409 again if it differs.

### 23. Third parties are affected without notice
Cancelling a poster's accepted request removes the accepter's shift swap, pending point transactions are cancelled, and cascaded requests of unrelated users are cancelled, with **no email or notification** (`sanitizeUserPeriod` deliberately sends none). Integrity/consent concern rather than a vulnerability: affected users learn about it only by noticing their calendar changed. **Fix:** notify the counterpart (reuse `sendCancelledAcceptanceEmail` / a cancellation mail) after commit.

### 24. Input validation gaps on the team-change body
- No `toDate >= fromDate` check: an inverted occurrence is stored and silently ignored by the segment logic (`buildTeamSegments`), leaving confusing data.
- `teamId` / `:id` / `occurrenceId` that are not valid ObjectIds raise Mongoose `CastError`s; `errorHandler` returns `err.message` for 500s, so schema/internal details reach the client.
- The exported helpers (`sanitizeUserPeriod`, `previewUserPeriodImpact`) put `userId` straight into query objects. Safe today (callers pass `user._id`), but a future caller passing `req.body` values would allow operator injection (`{ "$ne": null }`). Coerce with `new mongoose.Types.ObjectId(...)` inside the helpers.

### 25. Amplification: unbounded cascade lookup, no rate limiting
`previewUserPeriodImpact` walks `dependsOn` children one query at a time (N+1, guarded against cycles), and a period without `to` matches all future rows. With no rate limiting (#8), repeated previews are cheap to trigger and comparatively expensive to serve. **Fix:** rate-limit these routes, batch the cascade lookup (`$in` per level), and cap the number of returned items.

### 33. Rotation change: errors swallowed inside the transaction
In `convertCenterDemands`, `cancelRequestWithSession` and `withdrawFromRequestWithSession` are wrapped in `try/catch` that only logs, and the code then logs success and counts the demand. A database error aborts the transaction server-side (later operations or the commit then fail with a confusing message); a logic error leaves the demand unconverted while the user is told otherwise. After `withdrawFromRequestWithSession` the code also calls `populatedDemand.save()` on an in-memory document that is stale relative to what the withdraw saved (possible `VersionError` when `acceptedSwitches` is replaced). **Fix:** let errors propagate (abort and report), re-read the demand after a withdraw.

### 34. Same-date activations are ambiguous and the period diff mis-dedupes dates
Nothing prevents activating two different rotations on the same date. `findLatestRotation` and `findChangedPeriods` then break the tie arbitrarily; verified on the real function: activations `[A, B]` on one day give **no change** while `[B, A]` give a change A→B (and the latter yields two zero-length duplicate periods). Cause: `new Set(...map(a => a.activationDate))` dedupes `Date` objects by reference, not value. **Fix:** reject a second activation on an existing date for the center, and dedupe with `getTime()`.

### 35. Rotation change leaves stale variations and calendar entries
Converted demands keep `posterShift.selectedVariation` pointing at a variation of the old shift. Calendar entries are never touched by a rotation change (unlike team changes): an accepted substitution's accepter assignment stores the old `shiftData.shift`, which `computeUserShifts` applies directly, so after conversion the calendar can show the old shift while the demand shows the new one; Modifications/HourPatches on old shift ids are ignored by the consistency check and accumulate. **Fix:** on conversion, reset or remap `selectedVariation`, and remap or deactivate the affected entries.

### 36. Rotation flow, smaller defects
- Removing a date that does not exist succeeds silently (`$pull` is a no-op and still returns the document), so the "Aucune activation trouvée" error can never fire.
- `GET /rotations/active-at-date` always returns `null`/errors: it passes `req.centerId` (never set) and indexes `rotations[0]` on a function that already returns a single object. The front end does not call it.
- Retroactive activation changes also convert/cancel past demands that the cron has not archived yet.
- Rotation reads (`GET /rotations/center/:centerId`, `/status/:centerId`) are not scoped to the caller's center (only the mutations are, see `middleware/rotationAuth.js`).
- `saveRotation` throws a 500 when `days` is missing; the `days` branch of `updateRotation` is dead (commented out).

---

## Suggested order of work
0. #27 (one-line front fix; without it rotation changes cannot be applied).
1. #3, #4, #5 and #20 (center authorization on the team routes) before the next production deploy; confirm #21 (replica set) first; rotate credentials (#2, #5) in parallel.
2. #17 (front build) and #13 so the app can be exercised end to end.
3. #30-#31; #6-#9 next sprint; #10-#11 and #22-#25 as hardening; #18, #19, #26, #33-#36 as cleanup.

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content).
- Runtime behaviour: no tests exist (`npm test` is a stub), and the app was never exercised against MongoDB (including the new team-change approval flow and the period helpers).
- Business-rule correctness of the shift/substitution computation.
- Docker/nginx configuration beyond the files already noted.
