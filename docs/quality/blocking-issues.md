# Blocking issues audit

Audit date: 2026-11-02; re-verified against the code on 2026-11-11 (every issue below was spot-checked on that date, except #11, #22, #25 which are unchanged by recent commits and were only re-read). Branch: `cherry-picking` (working tree, with uncommitted changes).
Scope: `backend/` in full (static checks, route/auth review); `front/` was not audited, except where noted.
Method: import resolution, ESLint `no-undef` pass over the backend, reading of routes/controllers/middleware, `git ls-files` review. Nothing was run against a database.

This file lists **open issues only**. Fixed items are removed (history is in git and `docs/product/roadmap.md`); issue numbers are stable identifiers, so gaps are fixed or closed issues (#1, #26, #48, #13, #17, #19, #42 (35h rule bounded by the window: intended), #43, #44, #46, #3, #9, #10, #12, #14-#16, #27-#29, #32-#34, #37 and the activation-center-filter part of #30).

Severity is shown on each issue; sections below are ordered by when to work on them. **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug that will break a code path.

Compatibility audit (2026-11-11): #45, #47, with tests in `backend/test/` (`npm test` in `backend/`; the 11h / 35h / 48h functions agree with an independent minute-by-minute oracle on 3000 random plannings and, end to end, on four rotations on a scratch database).

Changes in this revision (2026-11-11): #13 moved (the file is now `services/planning/categorizeDemand.js`); #30 reduced to its remaining part (the center filter is fixed); #10 removed (cookie options are `httpOnly` / `secure` / `sameSite` in production; the 15m lifetime is covered by #39); #2 path updated (`bootstrap/seedDefaultConfig.js`); #6 moved next to #8; new entries #40 and #41 for the day-field migration.

---

## Now — blocks a deploy, or blocks exercising the app
Do these first: #4, #5, #2 and #21 before any production deploy.

### 4. JWT secrets fall back to public literals — P0
`backend/middleware/authMiddleware.js:14` and `backend/services/auth/auth.refreshToken.js:7-8`

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
- The JVM crash/replay logs may contain environment variables and local paths. Contents not inspected; review before keeping.
- `.gitignore` lists `.env`, yet the file is still tracked, because it was added before the ignore rule.
**Fix:** `git rm --cached` these files, rotate the Mongo credentials, review the logs for secrets, and set `StrictHostKeyChecking` to `accept-new` or `yes`. Rewriting history (a `git-filter-repo` dependency is already in the root `package.json`) is optional once the secrets are rotated.

### 2. Local admin passwords already in production (residual) — P0
`createLocalAdmin` requires `LOCAL_ADMIN_PASSWORD` and no longer overwrites existing passwords, so existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand: **rotate them**. Also, `backend/bootstrap/seedDefaultConfig.js:324,336` hardcodes `password: 'user'` / `'admin-lfbb'` (acceptable only if strictly dev; see #5 and the `ensureDev` guard in `dev.routes.js`).

### 21. Production MongoDB is a standalone server but several flows require transactions — P1
`inTransaction` (`utils/mongo.js`, used by team changes, cycle position changes, rotation activation, substitution accept/cancel/withdraw) uses `session.withTransaction`, which fails on a standalone `mongod` ("Transaction numbers are only allowed on a replica set member or mongos"). The root `docker-compose.yml` (production) starts `mongo:8.0` with no `--replSet`; only `backend/docker-compose.yml` (dev) sets `--replSet rs0`. If production runs this way, all of those flows return 500. **Fix:** confirm production topology; run a single-node replica set in production (`--replSet` + `rs.initiate`) or add a non-transactional fallback.

---

## Next — security and correctness defects to fix this sprint
Open authorization holes, data-corrupting bugs and the compatibility computation (#45, #47). #8 also unlocks the throttling needed by #6.

### 20. Admin routes still without a center guard — P1
`middleware/centerAuth.js` provides the guards (`authorizeCenterParam`, `authorizeResourceCenter`, `authorizeTargetUserCenter`...) and they cover users, teams, tickets, demands, rotations, grid/heatmap/timeline and announcement sending. Not yet covered (`routes/announcement.routes.js:25-29`, `routes/message.routes.js:9,15`):
- Email announcements: `GET /announcements/history` and `/stats` list **all** centers' announcements to any admin (`Announcement.find()`), and `DELETE /announcements/:id` lets any admin delete any announcement. Its owner check reads `req.user._id`, but the token carries `userId`, so the check compares against `undefined` (the admin bypass hides it today).
- Contact messages: `GET /messages` and `PUT /messages/:id/read` show every message to any admin (messages have no center; decide whether they are master-only).
- The team-change preview still names people from cascaded requests of other users when someone previews their own change.

### 45. Switch compatibility ignores variations — P2
`demandService.getCompatibleSwitches` evaluates each rotation day with `day.default` hours only. A shift with variations (other start / end times) is reported with the default hours' result; the front cannot tell which variation breaks a rule. Test: `getCompatibleSwitches : une rotation à variantes ...` in `backend/test/compatibility.db.test.js` (todo).

### 47. Overlapping shifts are counted twice in the 48h total — P2
`checkWeeklyWorkHours` (`categorizeDemand.js`) sums the minutes of overlapping shifts instead of their union (test: todo). Only matters once overlapping data exist (such a planning already fails the 11h rule on the shifts involved, but not on unrelated targets).

### 7. SNS inbound-mail webhook is unauthenticated — P1
`POST /api/tickets/inbound` (`services/email/email.inbound.js:56-57`) accepts any JSON body: it does not verify the SNS signature or `TopicArn`, and it calls `confirmSubscription(message.SubscribeURL)` with a URL taken from the request (server-side request forgery). Anyone can inject ticket replies on behalf of any user, or make the server fetch arbitrary URLs.
**Fix:** verify the SNS message signature and `TopicArn`, and only fetch `SubscribeURL` on `*.amazonaws.com`.

### 8. No brute-force protection — P1
`package.json` has no `express-rate-limit`/`helmet`. `/auth/login`, `/auth/reset-password`, `/otp/verify` (6-digit codes) and `/otp/send` are open to unlimited guessing. Add rate limiting, and attempt-limiting on OTP verification.

### 6. Public endpoints that need throttling (they cannot require a token) — P1
These routes are reached before an account exists or before login, so a token cannot be required. They return the strict minimum (see CLAUDE.md for the policy) but stay open to abuse until #8 is done:
- `POST /api/tickets/create` (the `/contact-admin` form also serves people who cannot log in): spam and mail flooding to administrators;
- `POST /api/users/check-email`, `GET /api/users/info/:email` (login screen shows name, avatar, center), `POST /api/users/create`, `POST /api/otp/*`: account enumeration and OTP guessing;
- `GET /api/teams/public/:centerId`, `GET /api/center`, `GET /api/stats*`: harmless data (names, counters) but scrapeable.

### 11. Oversized request bodies and file uploads — P1
`server.js:53-54` sets `express.json({ limit: '50mb' })` and `urlencoded` to 50mb globally, unauthenticated. The avatar upload (`user.routes.js`) trusts the client: any file is saved with a `.png` extension and no MIME check, into `public/avatars`, which is served statically. Reduce the global limit, validate MIME type and magic bytes, and consider re-encoding images.

### 30. `deleteRotation` still allows deleting a rotation that was active in the past — P1
(The missing `centerId` filter is fixed: `findLatestRotation(result.centerId, ...)`.) `controllers/rotation.controller.js` (`deleteRotation`) only blocks a rotation that is active now or has future activations. Deleting one that was active in the past rewrites history: `findLatestRotation` ignores deleted rotations, so past days are recomputed from an earlier rotation, and completed substitutions point to deleted shifts. **Fix:** refuse deletion while the rotation has any activation day (or soft-delete while keeping history resolvable).

### 31. `updateDayInRotation` residual defects — P1
`PUT /rotations/:id/day` refuses (400, code `ROTATION_HAS_ACTIVATIONS`) any rotation that has activation dates, so days can only be edited on a never-activated rotation. Two bugs remain in that handler (`controllers/rotation.controller.js`, ~lines 404-450):
- setting a day to `rest` is silently ignored (the whole update block is guarded by `type !== 'rest'` but 200 is returned);
- the variation clean-up `Variation.deleteMany({ _id: { $nin: newList, $in: shift.variations } })` is a no-op because `shift.variations` was already reset to the new list, so removed variations are orphaned.
**Fix:** handle `type: 'rest'` explicitly (or reject it), and delete variations against the previous list.

### 40. Day-field migration (`Date` → `YYYY-MM-DD`) is not finished: nothing protects against drift — P1
The twin fields, dual write and dual read are in place, but the data is only consistent once `node backend/scripts/migrateDayFields.js --apply --confirm=<db>` has run in each environment, then `--check` is clean and no `[jours]` line appears in the logs. Until then, rows without a twin work through the legacy fallback (logged), and any writer added without the twin silently creates drift. Also pending: `Transaction.effectiveDate` has not been decided (day or instant). Everything to delete at cut-over is tagged `TEMPORARY(day-fields)` (`grep -rn "TEMPORARY(day-fields)" backend front/src`). **Fix:** run the script per environment, then follow the steps in `docs/product/roadmap.md`. The cycle migration (`migrateCycleOffsets.js`) has the same status per center: the local "Bordeaux" center was blocked by an anomaly (12 teams vs a 2-day rotation) before it was reported migrated.

---

## Soon — rotation/team-change correctness and hardening
Not urgent individually; most concern the rotation change flow (#35-#36) and the team-change flow (#22-#25).

### 41. Cron jobs compute "today" in the default time zone, not per center — P2
`services/substitution/request.internal.js:189,218` (`processPastDemands`, `processAndCompleteDemands`) call `todayIn()` with the default zone (`Europe/Paris`), so a center in another zone has demands cancelled/archived at the wrong moment around midnight. `reminderJob` is already per-center. **Fix:** group by center and use `getCenterTimeZone`.

### 35. Rotation change leaves stale variations and calendar entries — P2
Converted demands keep `posterShift.selectedVariation` pointing at a variation of the old shift. Calendar entries are never touched by a rotation change (unlike team changes): an accepted substitution's accepter assignment stores the old `shiftData.shift`, which `computeUserShifts` applies directly, so after conversion the calendar can show the old shift while the demand shows the new one; Modifications/HourPatches on old shift ids are ignored by the consistency check and accumulate. **Fix:** on conversion, reset or remap `selectedVariation`, and remap or deactivate the affected entries.

### 38. Deleting a center does not delete its rotations — P2
`controllers/center.controller.js:146` (`deleteCenter`) runs `Rotation.updateMany({ center: id }, ...)`, but rotations store their center in `centerId`, so the filter matches nothing and a deleted center's rotations stay active. The same handler also unsets `centerId` and `teams` on every user of the center without any confirmation or preview. **Fix:** filter on `centerId`, and consider a confirm step (like the team-change 409 flow) since the operation wipes memberships.

### 36. Rotation flow, smaller defects — P2
- Removing a date that does not exist succeeds silently: `rotation.activation.js:89` only throws when the rotation itself is missing (`findByIdAndUpdate` returns the document even when `$pull` matched nothing), so "Aucune activation trouvée" cannot fire for a missing date.
- `GET /rotations/active-at-date` is broken: it passes `req.centerId` (never set) to `findLatestRotation` (`rotation.controller.js:263`). The front does not call it.
- Retroactive activation changes also convert/cancel past demands that the cron has not archived yet.
- Rotation reads (`GET /rotations/center/:centerId`, `/status/:centerId`) are not scoped to the caller's center (only the mutations are guarded, see `authorizeRotationAccess`).
- `saveRotation` throws a 500 when `days` is missing; the `days` branch of `updateRotation` is dead (commented out).

### 24. Input validation gaps on the team-change body — P2
- No `toDate >= fromDate` check: an inverted occurrence is stored and silently ignored by the segment logic (`buildTeamSegments`), leaving confusing data.
- `teamId` / `:id` / `occurrenceId` that are not valid ObjectIds raise Mongoose `CastError`s, which come back as a generic 500 (no leak) instead of a 400: map `CastError` to 400 in `errorHandler` or validate ids with `isValidId`.
- The exported helpers (`sanitizeUserPeriod`, `previewUserPeriodImpact`) put `userId` straight into query objects. Safe today (callers pass `user._id`), but a future caller passing `req.body` values would allow operator injection. Coerce with `new mongoose.Types.ObjectId(...)` inside the helpers.

### 22. The `confirmed` flag is advisory and not bound to what was previewed — P2
The client may send `confirmed: true` at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. The rotation activation flow and the team cycle position flow (`PUT /teams/:id/cycle-position`) behave the same (the confirm path recomputes the changes instead of applying the previewed ones). Not a privilege issue (the caller is already authorised), but the safeguard is only UX. **Fix (optional):** return an `impactHash` in the 409 and require it with `confirmed`; recompute inside the transaction and answer 409 again if it differs.

### 25. Amplification: unbounded cascade lookup, no rate limiting — P2
`previewUserPeriodImpact` walks `dependsOn` children one query at a time (N+1, guarded against cycles), and a period without `to` matches all future rows. With no rate limiting (#8), repeated previews are cheap to trigger and comparatively expensive to serve. **Fix:** rate-limit these routes, batch the cascade lookup (`$in` per level), and cap the number of returned items.

### 23. Notifications still missing in two cases — P2
Team changes, cycle position changes and rotation changes email the affected third parties after commit (`services/email/demand/demandChangeNotifications.js`). Still silent:
- **User-initiated cancellation:** when a poster cancels their own *accepted* request (`request.cancel.js`), the accepter gets nothing. The `cancelledDemand` template exists but no code sends it.
- **Converted demands:** when a rotation change only *modifies* a demand (new shift id, hybrid downgraded to substitution, accepted switches reduced), the poster and accepter are not told.
- The mails are intentionally generic (no cause, no "automatic" wording); cascaded children get the same cancellation mail, with nothing saying that their request depended on another one that was cancelled.

### 39. Center and role in the access token can be stale — P2
`middleware/centerAuth.js` (`loadCaller`) trusts `centerId`, `adminType` and `isAdmin` from the JWT (`generateAccessToken` also sets the access lifetime, 15m). A user moved to another center, demoted, or deleted keeps their old access until the token expires. Acceptable at that lifetime; reload the user in `loadCaller` if immediate revocation is needed.

---

## Cleanup
Dead code, safe to remove once confirmed.

### 18. Dead conflict dialogs in the team UI — P2
`UserTeamCard.vue` (~line 163) and `TeamChangeDialog.vue` (~line 193) render a "Conflits détectés" dialog using `substitutionConflicts` / `handleDeleteAndSubmit` / `showConflictDialog`; `showConflictDialog` is never set to true, and `substitutionConflicts` is not defined in `UserTeamCard.vue`'s script. Superseded by the server-driven 409 flow (`TeamChangeImpactDialog`), safe to delete once confirmed.

---

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content).
- Runtime behaviour: tests exist only for the compatibility computation (`backend/test/`); the app was never exercised against a replica-set MongoDB end to end (team-change, cycle-position and rotation approval flows, the period helpers, the day-field dual write were only exercised on scratch databases).
- Business-rule correctness of the shift/substitution computation.
- Docker/nginx configuration beyond the files already noted.
