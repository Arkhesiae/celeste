# Known issues

Last reviewed: 2026-11-25. Every issue below was checked against the code on that date unless it says otherwise. Scope: `backend/` in full (static checks, route/auth review); `front/` only where noted.

This file lists **open issues only**, **ranked by how easy they are to fix** (cheapest first, severity breaking ties). Issue numbers are stable identifiers, so the numbering has gaps. **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug or hardening; **P3** = cosmetic or housekeeping.

Whatever the ease, **#5, #2 and #21 come before any production deploy** (#4 is done: the JWT secrets must now be in the environment).

## Ranking

| Rank | # | Issue | Sev. | Effort |
|---|---|---|---|---|
| 1 | 31 | `updateDayInRotation`: `rest` ignored, variation clean-up is a no-op | P1 | under 1 h |
| 2 | 36 | Rotation flow, smaller defects | P2 | under 1 h |
| 3 | 18 | Dead conflict dialogs in the team UI | P2 | under 1 h |
| 4 | 54 | Kebab-case theme variables resolve to Vuetify's defaults | P2 | under 1 h |
| 5 | 62 | Demand pile "+" marker has no style in the day block | P2 | under 1 h |
| 6 | 64 | The dashboard 7-day card takes "today" from the browser, not the center | P3 | under 1 h |
| 7 | S8 | Cascade children lose the final status of the root | P1 | under 1 h |
| 8 | S4 | Any center member can cancel anyone's demand or mail the administration | P0 | 1 h |
| 9 | 30 | `deleteRotation` allows deleting a rotation that was active in the past | P1 | 1 h |
| 10 | 5 | Server details committed to git | P0 | 1 h + rotation of credentials |
| 11 | 47 | Overlapping shifts counted twice in the 48 h total | P2 | 1-2 h |
| 12 | 23 | Cascaded cancellation mails give no reason | P2 | 1-2 h |
| 13 | 41 | Cron jobs compute "today" in the default time zone | P2 | 2 h |
| 14 | 57 | A failed mail send is silent for most mails | P2 | 2 h |
| 15 | 20 | Admin routes without a center guard | P1 | 2 h |
| 16 | 11 | Request bodies and avatar upload | P1 | 2 h |
| 17 | 8 + 6 + 25 | No brute-force protection or throttling | P1 | half a day |
| 18 | 7 | SNS inbound-mail webhook is unauthenticated | P1 | half a day |
| 19 | 21 | Production MongoDB standalone, flows need transactions | P1 | half a day (ops) |
| 20 | 2 | Guessable local admin passwords in production | P0 | ops |
| 21 | 63 | The dashboard calendar throws a `TypeError` when the API is unreachable | P2 | to investigate |
| 22 | 39 | Center and role in the access token can be stale | P2 | 1 day |
| 23 | 22 | The `confirmed` flag is not bound to what was previewed | P2 | 1 day |
| 24 | 50 | Account recovery does not prove ownership of the legacy account | P1 | 1 day + a decision |
| 25 | 56 | Navigation restructuring only partly verified | P2 | 1 day of testing |
| 26 | 35 | Rotation change leaves stale variations and calendar entries | P2 | 1-2 days |
| 27 | S9 | Acceptance of a demand is not validated on the server | P1 | 1-2 days |
| 28 | 52 | Inactive accounts and center transfer refusal | P2 | 2 days |
| 29 | 61 | Mail leftovers: unused template, four unwired templates, wording | P3 | 1 day |
| 30 | 40 | Day-field and cycle migrations are not finished | P1 | ops, several steps |

`S4`, `S8` and `S9` come from `docs/quality/calendar-substitution-review.md`, where they are described in full and were rechecked on 2026-11-25.

---

## Under an hour

### 31. `updateDayInRotation` residual defects — P1
`PUT /rotation/:id/day` refuses (400 `ROTATION_HAS_ACTIVATIONS`) any rotation that has activation dates, so days can only be edited on a never-activated rotation. Two bugs remain in `services/rotation/rotation.update.js`:
- setting a day to `rest` is silently ignored: the update block is guarded by `type !== 'rest'` (line 52) but 200 is returned;
- the clean-up `Variation.deleteMany({ _id: { $nin: newList, $in: shift.variations } })` (line 93) is a no-op because `shift.variations` was already reset to the new list (line 65), so removed variations are orphaned.

### 36. Rotation flow, smaller defects — P2
- Removing a date that does not exist succeeds silently: `rotation.activation.js` only throws "Aucune activation trouvée" when the rotation itself is missing (`findByIdAndUpdate` returns the document even when `$pull` matched nothing).
- Retroactive activation changes also convert or cancel past demands that the cron has not archived yet.
- `saveRotation` (`rotation.create.js`) assumes `days` exists and fails with a 500 when it is missing; the `days` branch of `updateRotation` is dead (commented out).

### 18. Dead conflict dialogs in the team UI — P2
`UserTeamCard.vue:187` and `TeamChangeDialog.vue:232` render a "Conflits détectés" dialog using `substitutionConflicts`, `handleDeleteAndSubmit` and `showConflictDialog`; `showConflictDialog` is never set to true. Superseded by the server-driven 409 flow (`TeamChangeImpactDialog`).
**Fix:** delete both dialogs and their handlers.

### 54. Kebab-case theme variables resolve to Vuetify's defaults — P2
33 uses of `var(--v-theme-on-surface)`, `var(--v-theme-surface-variant)` and similar (kebab-case; e.g. `WelcomeTitle.vue`, `WorkdayAmplitudeGraph.vue`, `OwnDemandCard.vue`, `CurrentBudgetCard.vue`, `Donations.vue`, `TeamChangeImpactDialog.vue`, `TeamOccurrence.vue`, `UserTeamCard.vue`) read Vuetify's built-in palette, because the project defines `onSurface` / `surfaceVariant` (camelCase). The colour is close but not the theme's, and light and dark may differ (found by the 2026-11-23 front scan, count rechecked 2026-11-25).
**Fix:** replace with the camelCase variables and look at the screens.

### 62. The demand pile "+" marker has no style in the day block — P2
`components/Calendar/Panels/CalendarDayBlock.vue:82` uses `class="chipe position-absolute"`, but `.chipe` (14 px circle, centred by a transform) is declared only in `CalendarDesktop.vue`'s scoped style, so the marker is unstyled in the day block. Found by the 2026-11-25 utility-class scan; not checked on screen.
**Fix:** move `.chipe` to the day block (or a global file), then check the calendar.

### 64. The dashboard 7-day card takes "today" from the browser, not the center — P3
`components/Dashboard/UpcomingWorkWindow.vue` uses `todayKey()` (the browser's local day). The server computes shifts in the center's time zone, so someone connecting from another zone can see the window starting a day off.
**Fix:** use the center's `timeZone` (served by `GET /center`) with Temporal.

### S8. Cascade children lose the final status of the root — P1
`services/demand/demand.cascade.js:100`: `cancelDemandWithSession(child._id, { visited, session, cancelledDemands })` drops `reason`, so when the root is cancelled with `system-cancelled` the children get `cancelled`. The parameter is also misnamed (it is a final **status**). Details in `calendar-substitution-review.md`.

---

## An hour

### S4. Any center member can cancel anyone's demand or mail the administration — P0
`POST /demand/:id/cancel` and `POST /demand/:id/send-email` are only behind `authorizeDemandAccess` (same center); `cancelDemand` uses `actorId` only for the notification. Rechecked 2026-11-25: still open. Details in `calendar-substitution-review.md`.
**Fix:** require the poster (or an admin of the center) in the service.

### 30. `deleteRotation` allows deleting a rotation that was active in the past — P1
`services/rotation/rotation.delete.js` only blocks a rotation that is active now or has future activations. Deleting one that was active in the past rewrites history: `findLatestRotation` ignores deleted rotations, so past days are recomputed from an earlier rotation, and completed substitutions point to deleted shifts.
**Fix:** refuse any rotation with an activation date (the `updateDayInRotation` rule), or archive it instead of deleting it.

### 5. Server details committed to git — P0
Still tracked (`git ls-files`): `ssh_config` (production host IP, login `root`, `StrictHostKeyChecking no`, which disables host verification), `replacement.txt`, `Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt` (a shell history file: content not inspected), and an empty `.env`. `front/.env.production` only holds `VITE_API_URL=` (no secret). The JVM crash logs listed in the previous review are no longer tracked.
- History shows MongoDB credentials were committed then deleted (commits `3fe86b8`, `ee2c783`): they remain recoverable, **treat them as leaked and rotate them**.
**Fix:** `git rm --cached` the four files and add them to `.gitignore`; rotate the credentials; the `ssh_config` host-checking line needs fixing wherever it is really used.

---

## A few hours

### 47. Overlapping shifts counted twice in the 48 h total — P2
`checkWeeklyWorkHours` (`compatibility.rules.js`) sums the minutes of overlapping shifts instead of their union (the test is marked `todo`). It only matters once overlapping data exist (such a planning already fails the 11 h rule on the shifts involved, but not on unrelated targets).

### 23. Cascaded cancellation mails give no reason — P2
Cascaded children get the same cancellation mail as the demand that caused it, with nothing saying that their request depended on another one that was cancelled. (The `systemCancel` title no longer says "[système]" since the MJML rewrite of 2026-11-24.)

### 41. Cron jobs compute "today" in the default time zone, not per center — P2
`services/demand/demand.expiry.js` (`processPastDemands`, lines 14 and 43, and `processAndCompleteDemands`) call `todayIn()` with the default zone (`Europe/Paris`), so a center in another zone has demands cancelled or archived at the wrong moment around midnight.

### 57. A failed mail send is silent for most mails — P2
`emailService.sendEmail` never throws; it returns `{ sent: false }`. The OTP mail now checks it (fixed 2026-11-24, the code is saved only after a successful send), but the password reset (`email.resetPassword.js:40`) and the approval and rejection mails (`email.approval.js`) do not look at the result, and `sendMassEmail` / `sendBulkEmail` only count failures (the announcement and the ticket mails return the counts to their callers). A user waiting for a reset link gets "sent" whatever happened. There are no tests of the sender functions, only of the templates and of the points mails.

### 20. Admin routes without a center guard — P1
The center guards (`middleware/centerAuth.js`) cover users, teams, tickets, demands, rotations, grid/heatmap/timeline and announcement sending. Not covered (rechecked 2026-11-25):
- `GET /announcement/history` and `/stats` list **all** centers' announcements to any admin (`Announcement.find()`);
- `GET /message` and `PUT /message/:id/read` show every contact message to any admin (messages have no center; whether they are master-only is undecided);
- the team-change preview names people from cascaded requests of other users when someone previews their own change.

### 11. Request bodies and avatar upload — P1
`server.js` applies `REQUEST_BODY_LIMIT` (`config/limits.js`, `50mb`) to `express.json` and `urlencoded` globally, unauthenticated. The avatar upload is better than before (multer size limit, and `updateAvatar` refuses a declared type that does not start with `image/`) but still trusts the client: the type is the browser's header, any content is saved with a `.png` extension into `public/avatars`, which is served statically.
**Fix:** a small global body limit with a larger one only where needed; check the file's real signature.

---

## Half a day

### 8, 6 and 25. No brute-force protection or throttling — P1
`package.json` has no `express-rate-limit` or `helmet`. `/auth/login`, `/auth/reset-password`, `/otp/verify` (6-digit codes) and `/otp/send` are open to unlimited guessing, and OTP verification has no attempt limit. The routes that must stay public (a screen needs them before an account exists) stay open to abuse until this is done: `POST /api/ticket/create` (spam and mail flooding to administrators), `POST /api/user/check-email`, `GET /api/user/info/:email`, `POST /api/user/create`, `POST /api/otp/*` (account enumeration, OTP guessing), and the scrapeable but harmless `GET /api/team/public/:centerId`, `GET /api/center`, `GET /api/stat*`. Because there is no limit, `previewUserPeriodImpact` (an N+1 walk of `dependsOn` children, with a period without `to` matching all future rows) is cheap to trigger and comparatively expensive to serve (#25).

### 7. SNS inbound-mail webhook is unauthenticated — P1
`POST /api/ticket/inbound` (`services/email/email.inbound.js`) accepts any body: it does not verify the SNS signature or `TopicArn`, and it calls `confirmSubscription(message.SubscribeURL)` with a URL taken from the request (server-side request forgery). Anyone can inject ticket replies on behalf of any user, or make the server fetch arbitrary URLs.

### 21. Production MongoDB is a standalone server but several flows need transactions — P1
`inTransaction` (`utils/mongo.js`, used by team changes, cycle position changes, rotation activation, demand accept, cancel and withdraw, center transfer) uses `session.withTransaction`, which fails on a standalone `mongod` ("Transaction numbers are only allowed on a replica set member or mongos"). The root `docker-compose.yml` starts `mongo:8.0` with `--bind_ip_all --port 27017` and no `--replSet`; only `backend/docker-compose.yml` (dev) sets `--replSet rs0`. If production runs this way, all of those flows return 500.

### 2. Local admin passwords in production are guessable — P0
Existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand (operations, not code; not checkable from the repository). `backend/dev/seedDefaultConfig.js` also hardcodes the passwords `user` and `admin-lfbb` (acceptable only if strictly dev, see the `ensureDev` guard in `dev.routes.js`).

---

## A day or two

### 63. The dashboard calendar throws a `TypeError` when the API is unreachable — P2
Loading the dashboard in a build with no API (2026-11-25, headless browser) logged `TypeError: Cannot read properties of undefined (reading 'type')` from the `useCalendarData` chunk, twice, on the dashboard. The cause was not traced: it is somewhere in the load chain that `useCalendarData` starts (shifts, demands, work check) when a request fails. A server error should show the snackbar and nothing else.

### 39. Center and role in the access token can be stale — P2
`middleware/centerAuth.js` (`loadCaller`) trusts `centerId`, `adminType` and `isAdmin` from the JWT (access lifetime 15 min). A user moved to another center, demoted or deleted keeps their old center and role until the token expires (`verifyUserActive` already re-reads the account for deactivation, so reading the role and center there too would fix it).

### 22. The `confirmed` flag is advisory and not bound to what was previewed — P2
The client may send `confirmed: true` at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. The rotation activation flow and the team cycle position flow (`PUT /team/:id/cycle-position`) behave the same (the confirm path recomputes the changes instead of applying the previewed ones). Not a privilege issue, the safeguard is only UX.

### 50. Account recovery does not prove ownership of the legacy account — P1
`initiateAccountRecovery` (`controllers/accountRecovery.controller.js`, public route) lets anyone who knows a legacy account's `login` or old email claim it: nothing proves the caller owns it, because the OTP step is client side only. Needs a decision on what proves ownership (a code sent to the old address, for instance).

### 56. Navigation restructuring only partly verified — P2
`router/index.js`, `router/tabMemory.js`, `layouts/*`, the root pages and the per-tab piles were checked with the route table, a Node model of the piles and the back rule, and the real browser history on a scratch build with the auth guard skipped; **nothing was run signed in**. The history handling (back to the dashboard from a tab root, dashboard seeded below pages opened directly) is switched off in `router/index.js`, so points 3 and 4 only apply once it is back. Open points:
1. the bare root addresses `/admin`, `/center` and `/demand-page` match a root page with nothing inside (blank page): they have no redirect;
2. the shell's `<transition>` and `@enter` scroll hook do not run between two pages of one section (the root page stays mounted), and a sub-page registered by the `alternative` layout restores scroll when the layout updates, which can clamp to the previous page's height (see the scroll-restoration note in `CLAUDE.md`);
3. Android's hardware back has no handler (`@capacitor/app` is not installed), untested on a device, and cannot exit the app from the dashboard on purpose;
4. a back to `/loading` is redirected to the dashboard; the pending-route flow after login was not exercised;
5. the modals (assistance, dashboard transaction history), the toolbar back arrow, the redirects of the old addresses and the users pages for non-admin members were not exercised.

### 35. Rotation change leaves stale variations and calendar entries — P2
Converted demands keep `posterShift.selectedVariation` pointing at a variation of the old shift. Calendar entries are never touched by a rotation change (unlike team changes; the rotation activation code does not reference `CalendarEntry`): an accepted substitution's accepter assignment stores the old `shiftData.shift`, which `computeUserShifts` applies directly, so after conversion the calendar can show the old shift while the demand shows the new one; modifications and hour patches on old shift ids are ignored by the consistency check and accumulate.

### S9. Acceptance of a demand is not validated on the server — P1
`acceptDemandWithSession` (`services/demand/demand.accept.js`) checks the status, self-acceptance, an open demand of the accepter that day, and for a switch the held shift; but no rest or workload compatibility (the `compatibility.*` stack only runs for display), no check that the accepter is not already working that day, no date check (a past demand that the 30-minute job has not expired yet can still be accepted, cancelled or withdrawn), and `reservedForUserId` (in the model) is read nowhere, so a reserved demand is open to everyone. Rechecked 2026-11-25: still open. Details in `calendar-substitution-review.md`.

---

## Several days, or a decision first

### 52. Inactive accounts and center transfer refusal — P2
- The receiving admin can accept a center transfer but not refuse it; only the user can cancel it. The agent is not emailed when it is accepted (the template `centerTransferAccepted` exists, not wired: see #61).
- The front does not react to 403 `ACCOUNT_INACTIVE` (no match in `front/src`): no rejection dialog at login, no logout of an open session.
- Nothing lets an admin deactivate an account (`User.isActive` is only set by seeds); the template `accountDeactivated` exists, not wired.
- Undecided: scheduled points transfers (`services/transaction/transaction.scheduled.js`) still run for inactive or pending users, and the mails of `demandJob` / `reminderJob` still go to an inactive accepter.

### 61. Mail leftovers — P3
- The template `unacceptedDemand` is sent by nothing.
- Four templates are preview-only, with no sender and no call site: `rotationChange`, `centerTransferAccepted`, `accountDeactivated`, `ticketReceived`.
- The points template `pointsTransferCancelled` has a reason `cancelledByUser` that nothing triggers (no route cancels a manual deferred transfer).
- `cancelledDemand` always says "demande de remplacement" (even for a switch) and shows the poster's full last name where the other demand mails abbreviate it; its `accepters` and `youWereAccepter` branches never run.
- The announcement mail never receives a date, author, details or link (only title, message, scope and center name) and is not addressed to the user by name.
- `newTicket` ignores `creationDate`, `adminNotification` ignores `center`, `ticketReply` ignores `adminName`.
- Mails of demands are not tested against real mail clients (Gmail, Outlook, Apple Mail, dark mode).

### 40. Day-field (`Date` → `YYYY-MM-DD`) and cycle migrations are not finished — P1
The twin fields, dual write and dual read are in place, but the data is only consistent once `node backend/scripts/migrateDayFields.js --apply --confirm=<db>` has run in each environment, then `--check` is clean and no `[jours]` line appears in the logs. Until then, rows without a twin work through the legacy fallback (logged), and any writer added without the twin silently creates drift. `Transaction.effectiveDate` has not been decided (day or instant). Everything to delete at cut-over is tagged `TEMPORARY(day-fields)` (`grep -rn "TEMPORARY(day-fields)" backend front/src`). The cycle migration (`migrateCycleOffsets.js`) has the same status per center: the local "Bordeaux" center is blocked by an anomaly (12 teams vs a 2-day rotation).

---

## Ignored for now
Open on purpose: the owner decided not to act on these yet. They are not ranked above.

### 65. `FranceSection.vue` is used nowhere — P3
`components/Landing/FranceSection.vue` (the France map for the landing page) is imported nowhere since the placeholder comment was removed from `landing.vue` on 2026-11-25. The project rule is that dead front code is deleted.
**Fix:** delete it (it stays in git history) or put it back on the landing page.
*(Ignored on 2026-11-25.)*

---

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content). Mail layouts were checked in a desktop browser only.
- Runtime behaviour in production: tests run on scratch databases (`backend/test/`); the app was never exercised end to end against the production topology (replica set, team-change, cycle-position and rotation approval flows).
- Business-rule correctness of the shift/substitution computation beyond what the tests cover.
- Docker/nginx configuration beyond the files already noted.
- Front ESLint errors (about 150, see the roadmap) and the optional legacy-CSS leftovers (see the roadmap line of 2026-11-25).

## Removed from this file on 2026-11-25
- **#24** (team-change body): fixed the simple way in `assignTeamToUser` (`services/user/user.team.js`): a malformed `teamId` and a `toDate` before `fromDate` are refused with a 400 before any query (test `test/teamChangeInput.test.js`). The note about future callers passing `req.body` into `sanitizeUserPeriod` was a caution, not a defect, and is dropped.
- **#66** (rules of any center readable by any logged-in user): fixed. A new guard `authorizeCenterQuery` (`middleware/centerAuth.js`) refuses another center's `?centerId=` (403) except for the master admin; `getAllRules` answers for the caller's own center when none is named and no longer sends `adminValues` (the other centers' values) to anyone but the master. Test `test/ruleRead.db.test.js`.
- **#58** (mail transport): fixed. One SMTP port (`EMAIL_PORT`, default 587) for both transporters, the logs name it; `MAIL_SERVICE` now decides (see `CLAUDE.md`): in production mails always go out through SES, elsewhere they are simulated unless `MAIL_SERVICE=ses`; the console transporter prints "Mail simulé" and returns `simulated: true` instead of silently reporting a send.
- **#4** (JWT secrets fall back to public literals): fixed the simple way: `authMiddleware.js` and `auth.refreshToken.js` read `process.env.JWT_SECRET` / `JWT_REFRESH_SECRET` directly, with no fallback literal (a missing secret makes signing fail instead of using a public value). No startup check, no rotation: the values in the production environment file stay as they are (decision: not a threat given the current audience of the app).
- **#53** (`GET /api/rule` readable without a token): fixed, the route is under `verifyToken`; a logged-in user used to read any center's rules, fixed too (below).
- **#38** (deleting a center did not delete its rotations): fixed (`{ centerId: id }`), test `test/centerDelete.db.test.js`.
- **#60** (password reset reveals which emails have an account): intended, not considered a risk (decision 2026-11-25).
- **#59** (mail art URLs relative without a public URL): fixed, the server logs a warning at startup in production when `MAIL_ASSETS_URL` and `FRONT_URL` / `FRONTEND_URL` are all unset (`checkMailAssetsUrl`).
- **#55** (Google Fonts imported at runtime, twice): fixed, the two CSS `@import` are gone and the donations font goes through `unplugin-fonts`.
- **#5 (part)**: the tracked JVM crash and replay logs are no longer in the repository.
- **#25** and **#6** merged into #8 (same fix); the CastError part of **#24** and the avatar type check of **#11** are done.
