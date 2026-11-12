# Backend structure review (2026-11-12)

Review of `backend/` folders, file names and layering. **Nothing was moved or renamed**: this page lists what is out of
place or not standard, with the target position or name, so the changes can be done in small, separate steps. Facts come
from `git ls-files`, an import graph of the backend modules (136 tracked `.js` files outside `test/`), and line counts.

The target conventions used below are the ones the code already follows most of the time (see `CLAUDE.md`):
`routes/ → controllers/ → services/ → models/`, pure helpers in `utils/`, **one name per domain**, and in services the dot
style `<domain>.<action>.js` (`user.team.js`, `request.accept.js`).

## 0. Fixed (2026-11-12): a file whose name differed in case from what the code imports

Git tracks `backend/error/appError.js` (lower-case `a`) while the file on disk is `backend/error/AppError.js` and **49
imports** use `../error/AppError.js`. Windows ignores case (`core.ignorecase=true`), so git never saw the rename. On a
case-sensitive checkout (Linux, the Docker image if it is built from a git clone) every one of those imports fails with
`ERR_MODULE_NOT_FOUND` and the server does not start. Fix (two steps, so git records it):
`git mv backend/error/appError.js backend/error/tmp.js && git mv backend/error/tmp.js backend/error/AppError.js`, then
check with `git ls-files backend/error`. A script that compares every relative import with the exact tracked name found
no other case mismatch in the backend. (The front was not checked.) Fixed with the two-step `git mv` (the rename is staged, to be committed); the check script now reports no mismatch. It was known issue #49.

## 1. Folders

| Where | Anomaly | Proposed |
|---|---|---|
| `backend/config/` | **Done (2026-11-12)**: was empty; it now holds the shared constants, one file per topic (`points`, `auth`, `limits`, `schedules`, `server`, `paths`, `workRules`, `compatibility`, `geocoding`, see `CLAUDE.md`, "Configuration"). Environment variables are still read where they are used (18 files); a single reader was tried and rejected | |
| `backend/src/` | holds only the mail renderer and templates (`src/mail/...`); the name suggests the application source, and `npm run format` formats only `src/**` (so none of the real code) | move to `services/email/` (`mailRenderer.js`, `templates/`), and point `format` at the whole backend (or drop `prettier` if it is not used) |
| `backend/error/` | singular folder with a single file (`AppError.js`, wrong case in git, see 0); the other error code is `middleware/errorHandler.js` | `backend/errors/AppError.js`, or `utils/AppError.js` |
| `backend/public/avatars/` | **Done (2026-11-12)**: 15 user-uploaded images were tracked in git; they are now untracked and ignored (the files stay on disk), the folder is created at startup. Still to do: mount it as a volume in the Docker deployment so uploads survive a redeploy | |
| `backend/bootstrap/` | mixes production seeds (`seedAdmin.js`, `seedDefaultConfig.js`, run at startup) with development fixtures (`generateTeamUsers.js`, `seedTeamDemands.js`); verbs differ (`generate` / `seed`) | `bootstrap/` for the seeds run at startup, `dev/` (or `bootstrap/dev/`) for the fixtures, with `routes/dev.routes.js` next to them; one verb (`seed*`) |
| `backend/scripts/` | two migration scripts (`migrateCycleOffsets.js`, `migrateDayFields.js`), both marked `TEMPORARY`; another `scripts/` folder exists at the repository root (`backup_mongo.sh`, ssh helpers) | `backend/scripts/migrations/` and a note that they are deleted after the cut-over; keep one rule for what goes in the root `scripts/` |
| `backend/docker-compose.yml`, `Dockerfile.dev` | development files that share their names with the production `Dockerfile` / `docker-compose.yml` at the root | `docker-compose.dev.yml` (the `Dockerfile.dev` name is fine) |
| repository root | `hs_err_pid*.log` and `replay_pid*.log` are **untracked and ignored (2026-11-12)**; `replacement.txt`, `ssh_config`, a `Microsoft/` folder and a `node_modules/` remain (secrets tracked: known issue #5) | remove / gitignore the rest |
| `backend/.env` | present locally, untracked (good); no `.env.example` and no backend `README` to say which variables exist | add `backend/.env.example` generated from the list in `CLAUDE.md` |

## 2. Layering (`routes → controllers → services → models`)

- **12 of 15 controllers import models directly** (`announcement`, `auth`, `center`, `message`, `otp`, `recovery`,
  `rotation`, `rule`, `stat`, `substitution`, `team`, `user`) and run queries and business rules themselves. The biggest
  are `user.controller.js` (943 lines, 5 models), `rotation.controller.js` (653 lines, copying a rotation, editing a day,
  deleting) and `substitution.controller.js` (457 lines). `services/rotation/` contains one file
  (`rotation.activation.js`) although the rotation CRUD lives in the controller. Proposed: controllers only read the
  request, call a service and answer; move the rest to `services/<domain>/`, starting with `rotation` and `user`.
- `middleware/centerAuth.js` imports six models (it looks up the resource to find its center). Acceptable for an
  authorization guard; if it is moved, the lookups belong to `services/auth/` (`auth.centerAccess.js`).
- `utils/` holds domain code that is not a pure helper: `utils/getTeamAtDay.js`, `utils/teamCycle.js`,
  `utils/teamSegments.js` (team cycle and membership rules, they use `AppError`). Proposed: `services/team/` (or
  `utils/team/` if they stay pure); keep `utils/` for `ids`, `math`, `names`, `mongo`, `validation`, `dates/`, `shifts/`.
- `services/planning/` mixes the planning core with substitution-only code: `categorizeDemand.js`,
  `demandVariations.js` and `computeUserPool.js` belong to the substitution domain, and `findLatestRotation.js` to the
  rotation domain. Proposed: `services/substitution/compatibility/{categorizeDemand,demandVariations}.js`,
  `services/substitution/computeUserPool.js`, `services/rotation/findLatestRotation.js`; `planning/` keeps
  `computeUserShifts`, `computeShiftOfTeam`, `generateShiftsMap`.
- Good: no service imports a controller, route or middleware, and no model imports a service.

## 3. File naming

**Three styles are mixed in `services/`** (dot `request.accept.js`, camel + suffix `demandService.js`, kebab
`calendar-entry.js`), and some files have no suffix at all.

| Current | Anomaly | Proposed |
|---|---|---|
| `services/publicAnnouncementService.js`, `services/ticketService.js` | loose at the services root, camel + `Service` | `services/publicAnnouncement/publicAnnouncement.service.js`, `services/ticket/ticket.service.js` |
| `services/calendarEntry/calendar-entry.js` | kebab file in a camel folder, 544 lines, registration + cancellation + reads | `calendarEntry.register.js`, `calendarEntry.cancel.js`, `calendarEntry.read.js` |
| `services/substitution/request.heatmap.js` | not a request | `substitution.heatmap.js` (or `demand.heatmap.js`) |
| `services/substitution/request.mutations.utils.js` | double suffix, one function (`cancelPendingTransactions`) | `request.pendingTransactions.js`, or into `request.cancel.js` |
| `services/substitution/request.getAndCat.js` | abbreviation (`Cat`) | `request.list.js` (it lists and categorizes) |
| `services/substitution/request.internal.js` | accept logic, cascades and the two cron jobs in one file | `request.cascade.js` + `request.expiry.js`; accept stays in `request.accept.js` |
| `services/substitution/demandService.js`, `compatibilityService.js` | camel `Service` among dot-style files; "demand", "request" and "substitution" all name the same thing (model `Substitution`, files `request.*`, `demandService`, route `/substitution`, front "demande") | one word in file names (`request.*` is the majority), and `substitution.compatibility.js`, `substitution.switches.js` |
| `services/auth/auth.js` | contains only `userPayload` | `auth.payload.js` |
| `services/email/resetPassword.js` | the only sender without the `Email` suffix | `resetPasswordEmail.js` |
| `services/email/emailService.js`, `email.inbound.js` | camel `Service` and dot style side by side | `email.transport.js`, `email.inbound.js` |
| `services/rules/` | the only plural service folder (`substitution`, `transaction`, `calendarEntry` are singular), next to `rule.controller.js` and `models/Rule.js` | `services/rule/` (the URL `/rules` can stay) |
| `services/transaction/transaction.scheduled.js` | the functions are spelled `createScheduledTransation` / `cancelScheduledTransation` (8 occurrences in 4 files) | fix the typo (`Transaction`) |
| `models/Transaction.js` | a transfer of points, which reads like a database transaction (`inTransaction`, `session`) | `PointTransfer.js` (or `PointTransaction.js`) |
| `utils/shifts/overlapTest.js` | not a test; confusing next to `backend/test/` | `shiftsOverlap.js` |
| `models/AccountRecoveryRequest.js` | **deleted (2026-11-12)**: it was imported nowhere (`recovery.controller.js` works on `User` fields) | |
| `models/CalendarEntry.js` | exports four models (`CalendarEntry`, `Assignment`, `Modification`, `HourPatch`) | fine as discriminators, but name them in a header comment; the folder `calendarEntry/`, the route `calendar-entry.routes.js` and the URL `/planning-modifications` are three names for one resource |

## 4. Routes, controllers and URLs

| Route file | Controller | Mount | Anomaly |
|---|---|---|---|
| `account-recovery.routes.js` | `recovery.controller.js` | `/account-recovery` | model is `AccountRecoveryRequest` (unused) |
| `rules.routes.js` | `rule.controller.js` | `/rules` | plural route, singular controller |
| `stats.routes.js` | `stat.controller.js` | `/stats` | idem |
| `calendar-entry.routes.js` | `calendarEntry.controller.js` | `/planning-modifications` | three names |
| `public-announcement.routes.js` | `publicAnnouncement.controller.js` | `/public-announcements` | kebab route, camel controller (acceptable, but the pattern is not written anywhere) |
| `center.routes.js` | `center.controller.js` | `/center` | **singular URL**, while `/users`, `/teams`, `/rotations`, `/rules` are plural; `/substitution` is singular too. Changing a URL touches the front (`services/*Service.js`), so only do it with the front |

Rule to write down: route files kebab-case plural of the resource, controllers `<resource>.controller.js` in the
singular, and the same singular word in `models/` and `services/`.

## 5. Export style

- Models, routes: `export default` (normal). **Controllers: 6 use `export default { ... }` (`auth`, `message`, `otp`,
  `rotation`, `rule`, `stat`) and 9 use named exports.** Services are named exports except `emailService.js`,
  `ticketReplyEmail.js`, `rotation.activation.js`, `ruleService.js`, `utils/shifts/overlapTest.js`. Proposed: named exports
  for controllers, services and utils (they are easier to search and to mock); default only for models and routers.
- Barrels (`index.js`) exist for `services/auth` and `services/substitution` only, and the controllers do not all use them.
  Either use them everywhere or drop them.

## 6. Hygiene

- **69 `console.log` calls** (controllers 18, services 45, middleware 3, jobs 3) and no logger: add a small `utils/logger.js`
  with levels, and stop logging in controllers.
- `package.json`: the `format` script targets `src/**` only; no lint configuration for the backend (the checks in this
  repository use the front's ESLint with a temporary configuration); no `engines` field although the Dockerfile uses Node 20
  (and the tests ran on Node 26).
- Files over 500 lines (candidates to split): `controllers/user.controller.js` 943, `controllers/rotation.controller.js` 653,
  `services/calendarEntry/calendar-entry.js` 544, `services/rotation/rotation.activation.js` 502.
- Test layout is consistent (`backend/test/<area>.test.js`, run by `npm test`).

## 7. Suggested order

1. Done: the case of `AppError.js` in git (section 0).
2. Done: dead `AccountRecoveryRequest` model deleted, `config/` now holds the configuration, `public/avatars` and the
   root logs untracked.
3. Mechanical renames with search-and-replace and a test run each: the `Transation` typo, `overlapTest.js`,
   `auth.js` → `auth.payload.js`, `resetPassword.js`, `request.heatmap.js`, `request.getAndCat.js`.
4. Move files without renaming their content: `src/mail` → `services/email`, `utils/team*` → `services/team`,
   `planning/{categorizeDemand,demandVariations,computeUserPool}` → `services/substitution`, `findLatestRotation` →
   `services/rotation`, `bootstrap/` dev fixtures → `dev/`.
5. Extract controller logic into services, one resource per change, `rotation` first, then `user`.
6. Decide the URL naming (singular `/center`, `/substitution`) together with a front change, if at all.
