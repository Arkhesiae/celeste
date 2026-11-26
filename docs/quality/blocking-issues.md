# Known issues

Last reviewed: 2026-11-25. Every issue below was checked against the code on that date unless it says otherwise. Scope: `backend/` in full (static checks, route/auth review); `front/` only where noted.

This file lists **open issues only**, **ranked by how easy they are to fix** (cheapest first, severity breaking ties). Issue numbers are stable identifiers, so the numbering has gaps. **P0** = the app cannot run or is trivially compromised; **P1** = serious security/correctness defect; **P2** = latent bug or hardening; **P3** = cosmetic or housekeeping.

Whatever the ease, **#5 and #21 come before any production deploy** (#4 is done: the JWT secrets must now be in the environment).

## Ranking

| Rank | # | Issue | Sev. | Effort |
|---|---|---|---|---|
| 1 | 75 | A second team from the same day is saved but ignored | P1 | under 1 h |
| 2 | 36 | Rotation flow, smaller defects | P2 | under 1 h |
| 3 | 74 | The member list by team includes deleted teams | P3 | under 1 h |
| 4 | S8 | Cascade children lose the final status of the root | P1 | under 1 h |
| 5 | S4 | Any center member can cancel anyone's demand or mail the administration | P0 | 1 h |
| 6 | 71 | Deleting a team leaves its members in it | P1 | 1-2 h + a decision |
| 7 | 5 | Server details committed to git | P0 | 1 h + rotation of credentials |
| 8 | 47 | Overlapping shifts counted twice in the 48 h total | P2 | 1-2 h |
| 9 | 23 | Cascaded cancellation mails give no reason | P2 | 1-2 h |
| 10 | 73 | A cycle move cleans a member's whole future, not only their days in the team | P2 | 1-2 h |
| 11 | 57 | A failed mail send is silent for most mails | P2 | 2 h |
| 12 | 69 | A failed startup request leaves the app on the loading screen | P2 | 2-3 h |
| 13 | 20 | Admin routes without a center guard | P1 | 2 h |
| 14 | 11 | Request bodies and avatar upload | P1 | 2 h |
| 15 | 8 + 6 + 25 | No brute-force protection or throttling | P1 | half a day |
| 16 | 7 | SNS inbound-mail webhook is unauthenticated | P1 | half a day |
| 17 | 21 | Production MongoDB standalone, flows need transactions | P1 | half a day (ops) |
| 18 | 67 | Moving a team in the cycle also rewrites its past planning | P1 | 1-2 days |
| 19 | 68 | A day of an activated rotation can be edited after a simple confirmation | P1 | 1 h to remove, days to version |
| 20 | 39 | Center and role in the access token can be stale | P2 | 1 day |
| 21 | 22 | The `confirmed` flag is not bound to what was previewed | P2 | 1 day |
| 22 | 56 | Navigation restructuring only partly verified | P2 | 1 day of testing |
| 23 | 35 | Stale calendar entries after a rotation, cycle or team change | P2 | 1-2 days |
| 24 | S9 | Acceptance of a demand is not validated on the server | P1 | 1-2 days |
| 25 | 52 | Inactive accounts | P2 | 2 days |
| 26 | 61 | Mail leftovers: unused template, four unwired templates, wording | P3 | 1 day |
| 27 | 40 | Day-field and cycle migrations are not finished | P1 | ops, several steps |

`S4`, `S8` and `S9` come from `docs/quality/calendar-substitution-review.md`, where they are described in full and were rechecked on 2026-11-25.

---

## Under an hour

### 75. A second team from the same day is saved but ignored — P1
`assignTeamToUser` (`services/user/user.team.js`) without `replaceOccurrenceId` adds the occurrence even when one of the same kind already starts that day. On an equal start day the first of the list wins (`ownerAt`, `services/team/team.atDay.js`), so the new team changes nothing: the request succeeds, reports no change and asks for no confirmation. Reproduced on 2026-11-26. The profile card used to show the ignored team; since the same day it shows the one the planning uses. The team change dialog normally sends `replaceOccurrenceId` for a permanent team already planned that day, so this takes a direct API call, outdated dialog data, or a same-day team that has been deleted (not listed to the dialog).
**Fix:** in `assignTeamToUser`, make a new occurrence replace the ones of the same kind starting that day (through the same change, so the impact is previewed). Do not change the tie rule: it would rewrite the past planning of users who already have such pairs.

### 74. The member list by team includes deleted teams — P3
`getUsersGroupedByTeam` (`services/user/user.teamRead.js`, `GET /user/teams/:centerId`) reads `Team.find({ center })` without `deleted: false`, so a deleted team is returned like a live one. Reproduced on 2026-11-26. What the screens that use it show was not checked.
**Fix:** filter deleted teams, after checking that no screen relies on them (past dates can be asked for, and a team deleted since then had members).

### 36. Rotation flow, smaller defects — P2
- `saveRotation` (`rotation.create.js`) assumes `days` exists and fails with a 500 when it is missing; the `days` branch of `updateRotation` is dead (commented out).

### S8. Cascade children lose the final status of the root — P1
`services/demand/demand.cascade.js:100`: `cancelDemandWithSession(child._id, { visited, session, cancelledDemands })` drops `reason`, so when the root is cancelled with `system-cancelled` the children get `cancelled`. The parameter is also misnamed (it is a final **status**). Details in `calendar-substitution-review.md`.

---

## An hour

### 71. Deleting a team leaves its members in it — P1
`deleteTeam` (`controllers/team.controller.js`) runs `$pull: { teams: { team: id } }`, but the field is `teams.teamId`, so nothing is removed. Members keep the occurrence, and `computeUserShifts` does not check `team.deleted`, so their planning keeps following the deleted team. No demand or entry is cleaned, no one is told. Found by reading the code on 2026-11-26.
**Fix:** decide what deletion means for current members (refuse while the team has current or future members is the simplest); do not just correct the field, which would erase past plannings.

### S4. Any center member can cancel anyone's demand or mail the administration — P0
`POST /demand/:id/cancel` and `POST /demand/:id/send-email` are only behind `authorizeDemandAccess` (same center); `cancelDemand` uses `actorId` only for the notification. Rechecked 2026-11-25: still open. Details in `calendar-substitution-review.md`.
**Fix:** require the poster (or an admin of the center) in the service.

### 5. Server details committed to git — P0
Still tracked (`git ls-files`): `ssh_config` (production host IP, login `root`, `StrictHostKeyChecking no`, which disables host verification), `replacement.txt`, `Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt` (a shell history file: content not inspected), and an empty `.env`. `front/.env.production` only holds `VITE_API_URL=` (no secret). The JVM crash logs listed in the previous review are no longer tracked.
- History shows MongoDB credentials were committed then deleted (commits `3fe86b8`, `ee2c783`): they remain recoverable, **treat them as leaked and rotate them**.
**Fix:** `git rm --cached` the four files and add them to `.gitignore`; rotate the credentials; the `ssh_config` host-checking line needs fixing wherever it is really used.

---

## A few hours

### 73. A cycle move cleans a member's whole future, not only their days in the team — P2
`setTeamCyclePosition` (`services/team/team.cycle.js`) sanitizes every affected member from the date with no end. A member whose time in the moved team is bounded (a reinforcement, or a move to another team later on) also loses demands and shift entries on days outside the team. Found by reading the code on 2026-11-26, older than the fix of #72.
**Fix:** sanitize only the periods where the member holds a moved team (`buildTeamSegments`, clipped to the date).

### 69. A failed startup request leaves the app on the loading screen — P2
`pages/loading.vue` awaits `initializeApp` (`composables/useAppInitialization.js`) and `App.vue` awaits `initializeCenters`, with no handling on screen: when one of these requests fails (500 or dropped connection), the loading page stays, with no message and no retry, and the errors are unhandled. Also, `handleResponse` (`config/api.js`) turns a 200 that is not JSON (an HTML fallback page) into `{}`, so the stores then fail with `newShifts.forEach is not a function`. Seen on 2026-11-26 in headless Edge against a stub API.
**Fix:** show an error with a retry button on the loading page, and treat a successful non-JSON response as an error.

### 47. Overlapping shifts counted twice in the 48 h total — P2
`checkWeeklyWorkHours` (`compatibility.rules.js`) sums the minutes of overlapping shifts instead of their union (the test is marked `todo`). It only matters once overlapping data exist (such a planning already fails the 11 h rule on the shifts involved, but not on unrelated targets).

### 23. Cascaded cancellation mails give no reason — P2
Cascaded children get the same cancellation mail as the demand that caused it, with nothing saying that their request depended on another one that was cancelled. (The `systemCancel` title no longer says "[système]" since the MJML rewrite of 2026-11-24.)

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

---

## A day or two

### 68. A day of an activated rotation can be edited after a simple confirmation — P1
`PUT /rotation/:id/day` with `confirmed: true` (`services/rotation/rotation.update.js`) changes the `Shift` document in place, on purpose and provisionally (decision 2026-11-26). Past plannings and work checks change, open and accepted demands silently get the new hours (no compatibility check, no email, points unchanged), and a variation's new hours apply to every demand or entry that chose it.
**Fix:** remove the bypass (refuse whenever there is an activation date, offering to duplicate the rotation), or version the days so that an edit only applies from a date.

### 67. Moving a team in the cycle also rewrites its past planning — P1
A team has one start of cycle (`Center.cycleAnchorDate` + `Team.cycleOffset`, `services/team/team.cycleIndex.js`) with no effective date, and base shifts are computed, not stored. `PUT /team/:id/cycle-position` (`services/team/team.cycle.js`) cleans demands and entries from today on, but the new offset also applies to every earlier day: past calendars and work checks change. Found by reading the code on 2026-11-26, not reproduced.
**Fix:** needs a decision: keep dated cycle positions (one per change, resolved per day like rotation activations).

### 39. Center and role in the access token can be stale — P2
`middleware/centerAuth.js` (`loadCaller`) trusts `centerId`, `adminType` and `isAdmin` from the JWT (access lifetime 15 min). A user moved to another center, demoted or deleted keeps their old center and role until the token expires (`verifyUserActive` already re-reads the account for deactivation, so reading the role and center there too would fix it).

### 22. The `confirmed` flag is advisory and not bound to what was previewed — P2
The client may send `confirmed: true` at any time; the server does not check that the caller saw the impact. Between the 409 preview and the confirmation, new substitutions or entries can appear and be cancelled without the user having seen them. The rotation activation flow and the team cycle position flow (`PUT /team/:id/cycle-position`) behave the same (the confirm path recomputes the changes instead of applying the previewed ones). Not a privilege issue, the safeguard is only UX.

### 56. Navigation restructuring only partly verified — P2
`router/index.js`, `router/tabMemory.js`, `layouts/*`, the root pages and the per-tab piles were checked with the route table, a Node model of the piles and the back rule, and the real browser history on a scratch build with the auth guard skipped; **nothing was run signed in**. The history handling (back to the dashboard from a tab root, dashboard seeded below pages opened directly) is switched off in `router/index.js`, so points 3 and 4 only apply once it is back. Open points:
1. the bare root addresses `/admin`, `/center` and `/demand-page` match a root page with nothing inside (blank page): they have no redirect;
2. the shell's `<transition>` and `@enter` scroll hook do not run between two pages of one section (the root page stays mounted), and a sub-page registered by the `alternative` layout restores scroll when the layout updates, which can clamp to the previous page's height (see the scroll-restoration note in `CLAUDE.md`);
3. Android's hardware back has no handler (`@capacitor/app` is not installed), untested on a device, and cannot exit the app from the dashboard on purpose;
4. a back to `/loading` is redirected to the dashboard; the pending-route flow after login was not exercised;
5. the modals (assistance, dashboard transaction history), the toolbar back arrow, the redirects of the old addresses and the users pages for non-admin members were not exercised.

### 35. Stale calendar entries after a rotation, cycle or team change — P2
How a stale entry behaves (`applyEntries`, `planning.userShifts.js`; checked on 2026-11-26): an **assignment** with a shift (substitution, switch, assignment on a shift) replaces the base shift, so the old shift stays on screen and counts as work; a replaced poster stays "replaced". A **modification** is ignored when its shift no longer matches, except that `pres`, `variation` or `vic` still confirm an optional day of another shift. An **hour patch** is ignored when its shift no longer matches (fixed, was #70).
- **Activation added or removed** (`rotation.activation.js`): only demands are converted or cancelled. Cancelled and reopened ones clean their substitution entries; **converted** accepted demands keep entries on the old shifts, and no other entry is touched.
- Converted demands also keep `posterShift.selectedVariation` of the old shift.
- **Rotation day edit with `confirmed`** (#68): same `Shift` id, so entries stay attached with new hours, past included; a removed variation stays on the entries that use it; a day turned to rest drops its hour patches from the planning.
- **Cycle position** (`team.cycle.js`): entries are cleaned only from the `date` sent by the client, which is not checked to be today, while the new offset applies to every day (#67). Deactivated members (`isActive: false`) are skipped.
- **Team deleted** (`deleteTeam`): nothing is cleaned (#71).
- **`assignUserToCenter`** (`POST /user/:id/assign-center`) and **`deleteCenter`**: demands and entries from today on are not cleaned (past planning is kept since 2026-11-26).
- **User deleted** (`deleteUserById`): the user's demands are not cancelled, so counterparts keep substitution entries.
- **A stale demand accepted later**: `addSubstitutionEntries` copies the demand's shifts without checking that the poster still holds them.
- Not affected: team assignment changes clean every changed period (from today on); day notes are independent of shifts on purpose.

### S9. Acceptance of a demand is not validated on the server — P1
`acceptDemandWithSession` (`services/demand/demand.accept.js`) checks the status, self-acceptance, an open demand of the accepter that day, and for a switch the held shift; but no rest or workload compatibility (the `compatibility.*` stack only runs for display), no check that the accepter is not already working that day, no date check (a past demand that the 30-minute job has not expired yet can still be accepted, cancelled or withdrawn), and `reservedForUserId` (in the model) is read nowhere, so a reserved demand is open to everyone. Rechecked 2026-11-25: still open. Details in `calendar-substitution-review.md`.

---

## Several days, or a decision first

### 52. Inactive accounts — P2
- The front does not react to 403 `ACCOUNT_INACTIVE` (no match in `front/src`): no rejection dialog at login, no logout of an open session.
- Nothing lets an admin deactivate an account (`User.isActive` is only set by seeds); the template `accountDeactivated` exists, not wired.
- Undecided: scheduled points transfers (`services/transaction/transaction.scheduled.js`) still run for inactive or pending users, and the mails of `demandJob` / `reminderJob` still go to an inactive accepter.

### 61. Mail leftovers — P3
- The template `unacceptedDemand` is sent by nothing.
- `accountDeactivated` is preview-only: nothing deactivates an account (#52). `rotationChange`, `centerTransferAccepted` and `ticketReceived` were wired on 2026-11-26.
- `rotationChange` is sent when the activation is saved, even for a date far ahead, and nothing is sent when an activation is removed (a rotation announced earlier is not retracted).
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

### 2. Local admin passwords in production are guessable — P0
Existing production accounts `admin-<oaci>@celeste-app.fr` still have the old guessable password `admin-<oaci>` until changed by hand (operations, not code; not checkable from the repository). `backend/dev/seedDefaultConfig.js` also hardcodes the passwords `user` and `admin-lfbb` (acceptable only if strictly dev, see the `ensureDev` guard in `dev.routes.js`).
*(Ignored on 2026-11-26 by the owner's decision. The accounts have not been checked or changed.)*

### 50. Account recovery does not prove ownership of the legacy account — P1
`initiateAccountRecovery` (`controllers/accountRecovery.controller.js`, public route) lets anyone who knows a legacy account's `login` or old email claim it: nothing proves the caller owns it, because the OTP step is client side only. Proof of ownership would need, for instance, a code sent to the old address.
*(By design and not critical, owner's decision of 2026-11-26. Nothing changed.)*

---

## Not covered
- `front/` beyond the issues listed above (auth storage in the browser, Capacitor config, XSS in rendered content). Mail layouts were checked in a desktop browser only.
- Runtime behaviour in production: tests run on scratch databases (`backend/test/`); the app was never exercised end to end against the production topology (replica set, team-change, cycle-position and rotation approval flows).
- Business-rule correctness of the shift/substitution computation beyond what the tests cover.
- Docker/nginx configuration beyond the files already noted.
- Front ESLint errors (about 150, see the roadmap) and the optional legacy-CSS leftovers (see the roadmap line of 2026-11-25).

## Removed from this file on 2026-11-25
- **#72** (a cycle move also cleaned former members): fixed on 2026-11-26. `membersOfTeams` keeps only those who hold a moved team on or after the date (`holdsAnyTeamFrom`). Test `test/teamServices.db.test.js`.
- **#70** (stale hour patch): fixed on 2026-11-26. `applyHourPatch` applies a patch only to the shift it was entered on, and only when that day has hours. Test `test/hourPatch.test.js`.
- **#41** (expiry job used the default time zone): fixed on 2026-11-26. `demand.expiry.js` judges each demand against today in its own center's time zone, and re-checks the status when writing. `reminderJob` already did it per center. Test `test/demandExpiry.db.test.js`.
- **#63** (dashboard `TypeError` without an API): fixed on 2026-11-26. `ShiftCard.vue` read `vacation.type` when the store had no entry for the day (the error came from the same build chunk as `useCalendarData`, not from it); it now shows the empty card. `fetchMonthData` no longer shows a second snackbar nor throws into the mounted hooks and watchers. Reproduced and checked in headless Edge against a stub API.
- **#31** (`updateDayInRotation`): fixed on 2026-11-26. A day can become a rest day (hours, variations and `optional` cleared); removed variations are deleted unless a demand or calendar entry still points to them; only the day's own variations can be rewritten (any other id used to update that variation, whatever its rotation or center); hours are validated before the first write. Test `test/rotationDayUpdate.db.test.js`.
- **#30** (deleting a rotation active in the past rewrote history): fixed on 2026-11-26. The deletion is still allowed for such a rotation, and every reader of past days (planning, `findLatestRotation`, activation timeline, status list) now includes deleted rotations; only the rotation cards leave them out. A removal that would bring a deleted rotation back into force is refused. The same work refuses removing a past activation date and answers 404 for an unknown one (the first two points of #36). Rotations deleted before this fix count again for their past days. Test `test/rotationGuards.db.test.js`.
- **#64** (dashboard 7-day card used the browser's day): fixed, `UpcomingWorkWindow.vue` takes today in the center's time zone (Temporal, centers loaded if needed, `Europe/Paris` fallback). Not tried in a browser.
- **#62** (demand pile "+" marker unstyled): fixed, `.chipe` moved from `CalendarDesktop.vue` (where nothing used it) into the scoped style of `CalendarDayBlock.vue`. Not looked at on screen.
- **#54** (kebab-case theme variables): fixed, the 34 uses of `--v-theme-on-surface`, `-on-background`, `-surface-variant` and `-surface-container` now use the camelCase names the theme defines (none left in `front/src`). Not looked at on screen.
- **#18** (dead conflict dialogs in the team UI): fixed, both dialogs and their handlers deleted from `UserTeamCard.vue` and `TeamChangeDialog.vue`.
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
