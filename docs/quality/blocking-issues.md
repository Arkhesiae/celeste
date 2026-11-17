# Blocking issues audit

Last reviewed: 2026-11-18. Scope: `backend/` in full (static checks, route/auth review); `front/` only where noted.

This file lists **open issues only**. Issue numbers are stable identifiers, so the numbering has gaps.

Severity is shown on each issue; sections are ordered by when to work on them. **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug that will break a code path.

---

## Now — blocks a deploy, or blocks exercising the app
Do these first: #4, #5, #2 and #21 before any production deploy.

### 4. JWT secrets fall back to public literals — P0
`backend/middleware/authMiddleware.js` and `backend/services/auth/auth.refreshToken.js`

```js
process.env.JWT_SECRET || 'secret'
process.env.JWT_REFRESH_SECRET || 'refresh-secret'
```

If either variable is missing from the production environment (the root `.env` tracked in git is empty, and `.env.prod` is not in the repo), the server silently signs tokens with a known key, and anyone can forge an admin/master-admin token. `auth.refreshToken.js` also reads `process.env` at module load; ES imports are hoisted, so `dotenv.config()` may not have run yet.
**Needed:** fail at startup when either secret is unset, and confirm the production values are not these literals.

### 5. Secrets and server details committed to git — P0
Tracked files (`git ls-files`): `.env`, `front/.env.production`, `ssh_config`, `replacement.txt`, `hs_err_pid*.log`, `replay_pid*.log`.
- `.env` is empty today, but history shows MongoDB credentials were committed and then deleted (commits `3fe86b8`, `ee2c783`). They remain recoverable from history: treat them as leaked.
- `ssh_config` publishes the production host IP, login `root`, and `StrictHostKeyChecking no` (disables host verification, enabling MITM).
- The JVM crash/replay logs may contain environment variables and local paths. Contents not inspected.
- `.gitignore` lists `.env`, yet the file is still tracked, because it was added before the ignore rule.

### 2. Local admin passwords in production are guessable — P0
Existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand. `backend/dev/seedDefaultConfig.js` also hardcodes the passwords `user` and `admin-lfbb` (acceptable only if strictly dev; see #5 and the `ensureDev` guard in `dev.routes.js`).

### 21. Production MongoDB is a standalone server but several flows require transactions — P1
`inTransaction` (`utils/mongo.js`, used by team changes, cycle position changes, rotation activation, substitution accept/cancel/withdraw) uses `session.withTransaction`, which fails on a standalone `mongod` ("Transaction numbers are only allowed on a replica set member or mongos"). The root `docker-compose.yml` (production) starts `mongo:8.0` with no `--replSet`; only `backend/docker-compose.yml` (dev) sets `--replSet rs0`. If production runs this way, all of those flows return 500.

---

## Next — security and correctness defects to fix this sprint
Open authorization holes, data-corrupting bugs and the compatibility computation. #8 also unlocks the throttling needed by #6.

### 20. Admin routes without a center guard — P1
The center guards (`middleware/centerAuth.js`) cover users, teams, tickets, demands, rotations, grid/heatmap/timeline and announcement sending. Not covered:
- Email announcements: `GET /announcement/history` and `/stats` list **all** centers' announcements to any admin (`Announcement.find()`).
- Contact messages: `GET /message` and `PUT /message/:id/read` show every message to any admin (messages have no center; whether they are master-only is undecided).
- The team-change preview names people from cascaded requests of other users when someone previews their own change.

### 47. Overlapping shifts are counted twice in the 48h total — P2
`checkWeeklyWorkHours` (`compatibility.rules.js`) sums the minutes of overlapping shifts instead of their union (test: todo). Only matters once overlapping data exist (such a planning already fails the 11h rule on the shifts involved, but not on unrelated targets).

### 7. SNS inbound-mail webhook is unauthenticated — P1
`POST /api/ticket/inbound` (`services/email/email.inbound.js`) accepts any JSON body: it does not verify the SNS signature or `TopicArn`, and it calls `confirmSubscription(message.SubscribeURL)` with a URL taken from the request (server-side request forgery). Anyone can inject ticket replies on behalf of any user, or make the server fetch arbitrary URLs.

### 8. No brute-force protection — P1
`package.json` has no `express-rate-limit` or `helmet`. `/auth/login`, `/auth/reset-password`, `/otp/verify` (6-digit codes) and `/otp/send` are open to unlimited guessing, and OTP verification has no attempt limit.

### 6. Public endpoints that need throttling (they cannot require a token) — P1
These routes are reached before an account exists or before login. They return the strict minimum (see `CLAUDE.md`) but stay open to abuse until #8 is done:
- `POST /api/ticket/create` (the `/contact-admin` form also serves people who cannot log in): spam and mail flooding to administrators;
- `POST /api/user/check-email`, `GET /api/user/info/:email` (login screen shows name, avatar, center), `POST /api/user/create`, `POST /api/otp/*`: account enumeration and OTP guessing;
- `GET /api/team/public/:centerId`, `GET /api/center`, `GET /api/stat*`: harmless data (names, counters) but scrapeable.

### 53. `GET /api/rule` is readable without a token — P2
`backend/routes/rule.routes.js` declares `router.get('/', ruleController.getAllRules)` before `router.use(verifyToken)`, so anyone can read the rules of any center with `?centerId=`. It is not one of the routes a screen needs before login (see `CLAUDE.md`, "Access control"), and the front calls it only when logged in (`front/src/services/ruleService.js`). Per-center configuration is exposed to anonymous callers.

### 11. Oversized request bodies and file uploads — P1
`server.js` applies `REQUEST_BODY_LIMIT` (`config/limits.js`, `50mb`) to `express.json` and `urlencoded` globally, unauthenticated. The avatar upload (`user.routes.js`) trusts the client: any file is saved with a `.png` extension and no MIME check, into `public/avatars`, which is served statically.

### 30. `deleteRotation` allows deleting a rotation that was active in the past — P1
`services/rotation/rotation.delete.js` (`deleteRotation`) only blocks a rotation that is active now or has future activations. Deleting one that was active in the past rewrites history: `findLatestRotation` ignores deleted rotations, so past days are recomputed from an earlier rotation, and completed substitutions point to deleted shifts.

### 31. `updateDayInRotation` residual defects — P1
`PUT /rotation/:id/day` refuses (400, code `ROTATION_HAS_ACTIVATIONS`) any rotation that has activation dates, so days can only be edited on a never-activated rotation. Two bugs remain in that handler (`services/rotation/rotation.update.js`):
- setting a day to `rest` is silently ignored (the whole update block is guarded by `type !== 'rest'` but 200 is returned);
- the variation clean-up `Variation.deleteMany({ _id: { $nin: newList, $in: shift.variations } })` is a no-op because `shift.variations` was already reset to the new list, so removed variations are orphaned.

### 40. Day-field migration (`Date` → `YYYY-MM-DD`) is not finished: nothing protects against drift — P1
The twin fields, dual write and dual read are in place, but the data is only consistent once `node backend/scripts/migrateDayFields.js --apply --confirm=<db>` has run in each environment, then `--check` is clean and no `[jours]` line appears in the logs. Until then, rows without a twin work through the legacy fallback (logged), and any writer added without the twin silently creates drift. `Transaction.effectiveDate` has not been decided (day or instant). Everything to delete at cut-over is tagged `TEMPORARY(day-fields)` (`grep -rn "TEMPORARY(day-fields)" backend front/src`). The cycle migration (`migrateCycleOffsets.js`) has the same status per center: the local "Bordeaux" center is blocked by an anomaly (12 teams vs a 2-day rotation).

### 50. Account recovery does not prove ownership of the legacy account — P1
`initiateAccountRecovery` (public route) lets anyone who knows a legacy account's `login` claim it: nothing proves the caller owns it, because the OTP step is client side only.

---

## Soon — rotation/team-change correctness and hardening
Not urgent individually; most concern the rotation change flow (#35-#36) and the team-change flow (#22-#25).

### 41. Cron jobs compute "today" in the default time zone, not per center — P2
`services/substitution/request.expiry.js` (`processPastDemands`, `processAndCompleteDemands`) call `todayIn()` with the default zone (`Europe/Paris`), so a center in another zone has demands cancelled/archived at the wrong moment around midnight.

### 35. Rotation change leaves stale variations and calendar entries — P2
Converted demands keep `posterShift.selectedVariation` pointing at a variation of the old shift. Calendar entries are never touched by a rotation change (unlike team changes): an accepted substitution's accepter assignment stores the old `shiftData.shift`, which `computeUserShifts` applies directly, so after conversion the calendar can show the old shift while the demand shows the new one; Modifications/HourPatches on old shift ids are ignored by the consistency check and accumulate.

### 38. Deleting a center does not delete its rotations — P2
`controllers/center.controller.js` (`deleteCenter`) runs `Rotation.updateMany({ center: id }, ...)`, but rotations store their center in `centerId`, so the filter matches nothing and a deleted center's rotations stay active. The same handler also unsets `centerId` and `teams` on every user of the center without any confirmation or preview.

### 36. Rotation flow, smaller defects — P2
- Removing a date that does not exist succeeds silently: `rotation.activation.js` only throws when the rotation itself is missing (`findByIdAndUpdate` returns the document even when `$pull` matched nothing), so "Aucune activation trouvée" cannot fire for a missing date.
- Retroactive activation changes also convert/cancel past demands that the cron has not archived yet.
- `saveRotation` throws a 500 when `days` is missing; the `days` branch of `updateRotation` is dead (commented out).

### 24. Input validation gaps on the team-change body — P2
- No `toDate >= fromDate` check: an inverted occurrence is stored and silently ignored by the segment logic (`buildTeamSegments`), leaving confusing data.
- `teamId` / `:id` / `occurrenceId` that are not valid ObjectIds raise Mongoose `CastError`s, which come back as a generic 500 instead of a 400.
- The exported helpers (`sanitizeUserPeriod`, `previewUserPeriodImpact`) put `userId` straight into query objects. Safe today (callers pass `user._id`), but a future caller passing `req.body` values would allow operator injection.

### 22. The `confirmed` flag is advisory and not bound to what was previewed — P2
The client may send `confirmed: true` at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. The rotation activation flow and the team cycle position flow (`PUT /team/:id/cycle-position`) behave the same (the confirm path recomputes the changes instead of applying the previewed ones). Not a privilege issue (the caller is already authorised), but the safeguard is only UX.

### 25. Amplification: unbounded cascade lookup, no rate limiting — P2
`previewUserPeriodImpact` walks `dependsOn` children one query at a time (N+1, guarded against cycles), and a period without `to` matches all future rows. With no rate limiting (#8), repeated previews are cheap to trigger and comparatively expensive to serve.

### 23. Cascaded cancellation mails give no reason — P2
Cascaded children get the same cancellation mail as the demand that caused it, with nothing saying that their request depended on another one that was cancelled. The `systemCancel` template is headed "Demande annulée [système]", which contradicts the intent of generic mails without "automatic" wording.

### 39. Center and role in the access token can be stale — P2
`middleware/centerAuth.js` (`loadCaller`) trusts `centerId`, `adminType` and `isAdmin` from the JWT (access lifetime 15m). A user moved to another center, demoted, or deleted keeps their old center and role until the token expires.

### 52. Pending center transfers cannot be created, and the front does not handle an inactive account — P2
- Nothing sets `User.pendingCenterTransfer`: the front `TransferRequestDialog.vue` simulates the call, and no admin of the target center can approve (then clear it and set `centerId`) or refuse a request.
- The front does not react to 403 `ACCOUNT_INACTIVE`: no rejection dialog at login, no logout of an open session.
- Nothing lets an admin deactivate an account (`User.isActive` is only set by seeds).
- Undecided: scheduled points transfers (`services/transaction/transaction.scheduled.js`) still run for inactive or pending users, and the mails of `requestJob` / `reminderJob` still go to an inactive accepter.

---

## Cleanup
Dead code, safe to remove once confirmed.

### 18. Dead conflict dialogs in the team UI — P2
`UserTeamCard.vue` and `TeamChangeDialog.vue` render a "Conflits détectés" dialog using `substitutionConflicts` / `handleDeleteAndSubmit` / `showConflictDialog`; `showConflictDialog` is never set to true, and `substitutionConflicts` is not defined in `UserTeamCard.vue`'s script. Superseded by the server-driven 409 flow (`TeamChangeImpactDialog`).

---

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content).
- Runtime behaviour in production: tests run on scratch databases (`backend/test/`); the app was never exercised end to end against the production topology (replica set, team-change, cycle-position and rotation approval flows).
- Business-rule correctness of the shift/substitution computation beyond what the tests cover.
- Docker/nginx configuration beyond the files already noted.
