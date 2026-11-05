# Blocking issues audit

Audit date: 2026-11-02; backend status re-checked 2026-11-05 (spot-checked against the code: #4, #7, #8, #11, #13, #17, #19, #20, #21, #26, #30, #36, #38 are still open; the others were not re-verified; the only new entry is the stale-token trade-off #39). Branch: `cherry-picking` (working tree, with uncommitted changes).
Scope: `backend/` in full (static checks, route/auth review); `front/` was not audited, except where noted.
Method: import resolution, ESLint `no-undef` pass over the backend, reading of routes/controllers/middleware, `git ls-files` review. Nothing was run against a database.

This file lists **open issues only**. Fixed items are removed (history is in git and `docs/product/roadmap.md`); issue numbers are stable identifiers, so gaps are fixed issues.

Severity is shown on each issue; sections below are ordered by when to work on them. **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug that will break a code path.

---

## Now — blocks a deploy, or blocks exercising the app
Do these first. #4, #5, #2 and #21 before any production deploy; #17 and #13 so the app can be built and run end to end.

### 4. JWT secrets fall back to public literals — P0
`backend/middleware/authMiddleware.js:19` and `backend/services/auth/auth.refreshToken.js:6-7`

```js
process.env.JWT_SECRET || 'secret'
process.env.JWT_REFRESH_SECRET || 'refresh-secret'
```

If either variable is missing from the production environment (the root `.env` tracked in git is empty, and `.env.prod` is not in the repo), the server silently signs tokens with a known key, and anyone can forge an admin/master-admin token. Also, `auth.refreshToken.js` reads `process.env` at module load; verify `dotenv.config()` has run before that import in `server.js` (ES imports are hoisted, so it may not have).
**Fix:** throw at startup when either secret is unset; confirm the production values are set and are not these literals.

### 5. Secrets and server details committed to git — P0
Tracked files (`git ls-files`): `.env`, `front/.env.production`, `ssh_config`, `replacement.txt`, `hs_err_pid*.log`, `replay_pid*.log`.
- `.env` is empty today, but history shows MongoDB credentials were committed and then deleted (commits `3fe86b8`, `ee2c783`). They remain recoverable from history: **treat them as leaked and rotate**.
- `ssh_config` publishes the production host IP, login `root`, and `StrictHostKeyChecking no` (disables host verification, enabling MITM).
- The JVM crash/replay logs may contain environment variables and local paths. I did not inspect their contents; review before keeping.
- `.gitignore` lists `.env`, yet the file is still tracked, because it was added before the ignore rule.
**Fix:** `git rm --cached` these files, rotate the Mongo credentials, review the logs for secrets, and set `StrictHostKeyChecking` to `accept-new` or `yes`. Rewriting history (a `git-filter-repo` dependency is already in the root `package.json`) is optional once the secrets are rotated.

### 2. Local admin passwords already in production (residual) — P0
`createLocalAdmin` now requires `LOCAL_ADMIN_PASSWORD` and no longer overwrites existing passwords, so existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand: **rotate them**. Also, `utils/seedDefaultConfig.js:328,340` hardcodes `password: 'user'` / `'admin-lfbb'` (acceptable only if strictly dev; see #5 and the `ensureDev` guard in `dev.routes.js`).

### 21. Production MongoDB is a standalone server but team changes now require transactions — P1
`inTransaction` in `services/user/user.team.js` (and `user.sanitizePeriod.js`) uses `session.withTransaction`, which fails on a standalone `mongod` ("Transaction numbers are only allowed on a replica set member or mongos"). The root `docker-compose.yml` (production) starts `mongo:8.0` with `--bind_ip_all --port 27017` and **no `--replSet`**; only `backend/docker-compose.yml` (dev) sets `--replSet rs0`. If production really runs this way, every team assignment/removal now returns 500, where it previously only saved the user (the substitution cancel/withdraw/accept flows already depend on transactions and would be failing too). **Fix:** confirm production topology; run a single-node replica set in production (`--replSet` + `rs.initiate`) or add a non-transactional fallback.

### 17. Front production build fails: missing `@/utils/demandComment` — P2
`front/src/components/Admin/AdminDemandCard.vue` imports `@/utils/demandComment`, which does not exist (`vite build` stops with `ENOENT`). Found while verifying the team-change dialog; unrelated to it and not fixed. Also, `vite build` warns that an `@import url(...)` in a stylesheet is not at the top of the file (the DM Serif Display font import is ignored).

### 13. Undefined identifier in `categorizeDemand_v2.js` — P2
`utils/categorizeDemand_v2.js:734` (line numbers as of 2026-11-05) uses `localShiftsSorted`, but the `simulateInsertShift(...)` line that defines it is commented out (`checkConsecutiveNightControls`). It throws a `ReferenceError` whenever that check runs for a work shift. Unfinished code, not a missing import: needs the intended logic.

---

## Next — security and correctness defects to fix this sprint
Open authorization holes and data-corrupting bugs. #8 also unlocks the throttling asked for in #6, #19 is probably a broken screen.

### 20. Admin routes still without a center guard — P1
`middleware/centerAuth.js` now provides the guards (`authorizeCenterParam`, `authorizeResourceCenter`, `authorizeUserAccess`...) and they cover users, teams, tickets, demands, rotations and announcement sending. Not yet covered:
- Email announcements: `GET /announcements/history` and `/stats` list **all** centers' announcements to any admin (`Announcement.find()`), and `DELETE /announcements/:id` lets any admin delete any announcement (its owner check is bypassed for admins; it also reads `req.user._id`, which the token does not carry, so it can throw).
- Contact messages: `GET /messages` and `PUT /messages/:id/read` show every message to any admin (messages have no center; decide whether they are master-only).
- The team-change preview still names people from cascaded requests of other users when someone previews their own change.

### 7. SNS inbound-mail webhook is unauthenticated — P1
`POST /api/tickets/inbound` (`services/email/email.inbound.js`) accepts any JSON body: it does not verify the SNS signature or `TopicArn`, and it calls `confirmSubscription(message.SubscribeURL)` with a URL taken from the request (server-side request forgery). Anyone can inject ticket replies on behalf of any user, or make the server fetch arbitrary URLs.
**Fix:** verify the SNS message signature and `TopicArn`, and only fetch `SubscribeURL` on `*.amazonaws.com`.

### 8. No brute-force protection — P1
`package.json` has no `express-rate-limit`/`helmet`. `/auth/login`, `/auth/reset-password`, `/otp/verify` (6-digit codes) and `/otp/send` are open to unlimited guessing. Add rate limiting, and attempt-limiting on OTP verification. The public routes listed in #6 are the other targets.

### 11. Oversized request bodies and file uploads — P1
`server.js` sets `express.json({ limit: '50mb' })` globally, unauthenticated. The avatar upload (`user.routes.js`) trusts the client: any file is saved with a `.png` extension and no MIME check, into `public/avatars`, which is served statically. Reduce the global limit, validate MIME type and magic bytes, and consider re-encoding images.

### 30. `deleteRotation` checks the wrong rotation for "currently active" — P1
`controllers/rotation.controller.js` (`deleteRotation`) looks for the active rotation with an aggregate that has **no `centerId` filter**, so it compares against the most recently activated rotation of *all* centers: a center's currently active rotation can be deleted (or a deletable one refused) depending on other centers. It also only blocks rotations that are active now or have future activations: deleting one that was active in the past rewrites history (`findLatestRotation` ignores deleted rotations, so past days are recomputed from an earlier rotation, and completed substitutions point to deleted shifts). **Fix:** filter by the rotation's `centerId` and refuse deletion while the rotation has any activation date (or soft-delete while keeping history resolvable).

### 31. `updateDayInRotation` residual defects (the retroactive-edit risk is fixed) — P1
`PUT /rotations/:id/day` now refuses (400, code `ROTATION_HAS_ACTIVATIONS`) any rotation that has activation dates, past or future, and the UI shows the message; days can only be edited on a never-activated rotation. Two bugs remain in that handler:
- setting a day to `rest` is silently ignored (the whole update block is skipped but 200 is returned);
- the variation clean-up `Variation.deleteMany({ _id: { $nin: newList, $in: shift.variations } })` is a no-op because `shift.variations` was already reset to the new list, so removed variations are orphaned.
**Fix:** handle `type: 'rest'` explicitly (or reject it), and delete variations against the previous list.

### 19. `teams.vue` passes a string to `assignUserToTeam` — P2
`front/src/pages/center/[centerId]/teams.vue:390` calls `teamStore.assignUserToTeam(user._id, team._id)` but the store/service expect an object `{ teamId, fromDate, toDate }`. The call is still wrong as of 2026-11-05; not verified at runtime, likely returns 400, so assigning a team from this page is probably broken.

### 6. Public endpoints that need throttling (they cannot require a token) — P1
Reviewed against the screens that call them: these routes are reached before an account exists or before login, so a token cannot be required. They are now minimal (see CLAUDE.md for the policy) but remain open to abuse until #8 is done:
- `POST /api/tickets/create` (the `/contact-admin` form also serves people who cannot log in): spam and mail flooding to administrators;
- `POST /api/users/check-email`, `GET /api/users/info/:email` (login screen shows name, avatar, center), `POST /api/users/create`, `POST /api/otp/*`: account enumeration and OTP guessing;
- `GET /api/teams/public/:centerId`, `GET /api/center`, `GET /api/stats*`: harmless data (names, counters) but scrapeable.
`GET /users/devlist` is now disabled in production; `POST /messages` and `POST /tickets/status/:id` require a token and the right center.

---

## Soon — rotation/team-change correctness and hardening
Not urgent individually; most concern the rotation change flow (#35-#36) and the new team-change flow (#22-#25).

### 35. Rotation change leaves stale variations and calendar entries — P2
Converted demands keep `posterShift.selectedVariation` pointing at a variation of the old shift. Calendar entries are never touched by a rotation change (unlike team changes): an accepted substitution's accepter assignment stores the old `shiftData.shift`, which `computeUserShifts` applies directly, so after conversion the calendar can show the old shift while the demand shows the new one; Modifications/HourPatches on old shift ids are ignored by the consistency check and accumulate. **Fix:** on conversion, reset or remap `selectedVariation`, and remap or deactivate the affected entries.

### 38. Deleting a center does not delete its rotations — P2
`controllers/center.controller.js` (`deleteCenter`) runs `Rotation.updateMany({ center: id }, { $set: { deleted: true } })`, but rotations store their center in `centerId`, so the filter matches nothing and a deleted center's rotations stay active. The same handler also unsets `centerId` and `teams` on every user of the center without any confirmation or preview. **Fix:** filter on `centerId`, and consider a confirm step (like the team-change 409 flow) since the operation wipes memberships.

### 36. Rotation flow, smaller defects — P2
- Removing a date that does not exist succeeds silently (`$pull` is a no-op and still returns the document), so the "Aucune activation trouvée" error can never fire.
- `GET /rotations/active-at-date` always returns `null`/errors: it passes `req.centerId` (never set) and indexes `rotations[0]` on a function that already returns a single object. The front end does not call it.
- Retroactive activation changes also convert/cancel past demands that the cron has not archived yet.
- Rotation reads (`GET /rotations/center/:centerId`, `/status/:centerId`) are not scoped to the caller's center (only the mutations are guarded, see `authorizeRotationAccess` in `middleware/centerAuth.js`).
- `saveRotation` throws a 500 when `days` is missing; the `days` branch of `updateRotation` is dead (commented out).

### 26. `addSubstitutionEntries` ignores the Mongo session (same defect as the fixed #15) — P2
`services/calendarEntry/calendar-entry.js:308` takes only `(demand)`, but `request.internal.js:174` calls `addSubstitutionEntries(request, { session })`: its reads, `updateOne`s and saves run outside the acceptance transaction and cannot be rolled back. Fix like `cancelSubstitutionEntries`: accept `{ session }`, pass it to every query/save, and avoid recomputing shifts inside the transaction (the caller uses `accepterShift` from its result, so that return value needs to be computed after commit).

### 24. Input validation gaps on the team-change body — P2
- No `toDate >= fromDate` check: an inverted occurrence is stored and silently ignored by the segment logic (`buildTeamSegments`), leaving confusing data.
- `teamId` / `:id` / `occurrenceId` that are not valid ObjectIds raise Mongoose `CastError`s, which now come back as a generic 500 (no leak) instead of a 400: map `CastError` to 400 in `errorHandler` or validate ids with `isValidId`.
- The exported helpers (`sanitizeUserPeriod`, `previewUserPeriodImpact`) put `userId` straight into query objects. Safe today (callers pass `user._id`), but a future caller passing `req.body` values would allow operator injection (`{ "$ne": null }`). Coerce with `new mongoose.Types.ObjectId(...)` inside the helpers.

### 22. The `confirmed` flag is advisory and not bound to what was previewed — P2
(The rotation activation flow behaves the same: `/activate` accepts `confirmed: true` directly and the confirm path recomputes the changes instead of applying the previewed ones.)
The client may send `confirmed: true` (body / `?confirmed=true`) at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. Not a privilege issue (the caller is already authorised), but the safeguard is only UX. **Fix (optional):** return an `impactHash` in the 409 and require it with `confirmed`; recompute inside the transaction and answer 409 again if it differs.

### 25. Amplification: unbounded cascade lookup, no rate limiting — P2
`previewUserPeriodImpact` walks `dependsOn` children one query at a time (N+1, guarded against cycles), and a period without `to` matches all future rows. With no rate limiting (#8), repeated previews are cheap to trigger and comparatively expensive to serve. **Fix:** rate-limit these routes, batch the cascade lookup (`$in` per level), and cap the number of returned items.

### 23. Notifications still missing in two cases (the system-initiated ones are fixed) — P2
Team changes and rotation changes now email the affected third parties after commit (`services/email/demand/demandChangeNotifications.js`). Still silent:
- **User-initiated cancellation:** when a poster cancels their own *accepted* request (`request.cancel.js`), the accepter gets nothing. The `cancelledDemand` template exists but no code sends it.
- **Converted demands:** when a rotation change only *modifies* a demand (new shift id, hybrid downgraded to substitution, accepted switches reduced), the poster and accepter are not told.
- The mails are intentionally generic (no cause, no "automatic" wording); cascaded children get the same cancellation mail, with nothing saying that their request depended on another one that was cancelled.

### 39. Center and role in the access token can be stale — P2
`middleware/centerAuth.js` (`loadCaller`) trusts `centerId`, `adminType` and `isAdmin` from the JWT. A user moved to another center, demoted, or deleted keeps their old access until the token expires (15m, `auth.refreshToken.js`). Acceptable at that lifetime; reload the user in `loadCaller` if immediate revocation is needed.

### 10. Access tokens are `15m` — P1
Harmless but inconsistent; confirm the intended lifetime, and that `COOKIE_OPTIONS` sets `httpOnly`, `secure` and `sameSite`.

---

## Cleanup
Dead code, safe to remove once confirmed.

### 18. Dead conflict dialogs in the team UI — P2
`UserTeamCard.vue` (template lines ~157-188) and `TeamChangeDialog.vue` (~193-222) render a "Conflits détectés" dialog using `substitutionConflicts` / `handleDeleteAndSubmit`, which are not defined in `UserTeamCard.vue`'s script (and `substitutionConflicts` is also missing in `TeamChangeDialog.vue`); `showConflictDialog` is never set to true. Superseded by the server-driven 409 flow, safe to delete once confirmed.

---

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content).
- Runtime behaviour: no tests exist (`npm test` is a stub), and the app was never exercised against MongoDB (including the new team-change approval flow and the period helpers).
- Business-rule correctness of the shift/substitution computation.
- Docker/nginx configuration beyond the files already noted.
