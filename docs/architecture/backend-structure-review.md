# Backend structure review

Review of `backend/` folders, file names and layering (first written 2026-11-12, rechecked 2026-11-13). This page lists
**only what is still out of place or not standard**, with the target position or name, so the changes can be done in
small, separate steps. What was done is removed from here and recorded in `docs/product/roadmap.md` ("Done"). Facts come
from `git ls-files`, an import graph of the backend modules, and line counts.

The target conventions are the ones the code already follows most of the time (see `CLAUDE.md`):
`routes/ → controllers/ → services/ → models/`, pure helpers in `utils/`, **one name per domain**, and in services the dot
style `<domain>.<action>.js` (`user.team.js`, `request.accept.js`).

## 1. Folders and repository files

| Where | Anomaly | Proposed |
|---|---|---|
| `backend/error/` | singular folder with a single file (`AppError.js`); the other error code is `middleware/errorHandler.js` | `backend/errors/AppError.js`, or `utils/AppError.js` |
| `backend/scripts/` | two migration scripts (`migrateCycleOffsets.js`, `migrateDayFields.js`), both marked `TEMPORARY`; another `scripts/` folder exists at the repository root (`backup_mongo.sh`, ssh helpers) | `backend/scripts/migrations/` and a note that they are deleted after the cut-over; keep one rule for what goes in the root `scripts/` |
| `backend/docker-compose.yml`, `Dockerfile.dev` | development files that share their names with the production `Dockerfile` / `docker-compose.yml` at the root | `docker-compose.dev.yml` (the `Dockerfile.dev` name is fine) |
| repository root | tracked files that are not part of the app: `replacement.txt`, `ssh_config`, `Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt` (secrets tracked: known issue #5) | remove from git, add to `.gitignore` |
| `backend/.env` | present locally, untracked (good); no `.env.example` and no backend `README` to say which variables exist | add `backend/.env.example` generated from the list in `CLAUDE.md` |

## 2. Layering (`routes → controllers → services → models`)

- **10 of 15 controllers still import models directly** (`accountRecovery`, `announcement`, `auth`, `center`, `message`,
  `otp`, `rule`, `stat`, `substitution`, `team`) and run queries and business rules themselves; the biggest is
  `substitution.controller.js` (457 lines). Proposed: controllers read **and validate** the request, call a service and
  answer in the one response shape described in `CLAUDE.md`; move the rest to `services/<domain>/`, one resource per
  change, `substitution` next, then `center`, `team` and the small ones. The same pass should apply the validators of
  `utils/validation.js` (`assertId`, `assertEmail`, ...) to each controller's inputs and drop the `console.error` calls in
  controllers (`errorHandler` logs).
- `accountRecovery.controller.js` imports `readNewUser` from `user.controller.js`, the only controller-to-controller
  import. Once the account creation moves to a service (`user.create.js`), the input reading should live next to it, or in
  `utils/validation.js`, and both controllers should import it from there.
- `middleware/centerAuth.js` imports six models (it looks up the resource to find its center). Acceptable for an
  authorization guard; if it is moved, the lookups belong to `services/auth/` (`auth.centerAccess.js`).

## 3. File naming

| Current | Anomaly | Proposed |
|---|---|---|
| `services/ticket/ticket.service.js`, `services/publicAnnouncement/publicAnnouncement.service.js`, `services/rule/rule.service.js` | one `<domain>.service.js` file per domain instead of the dot style by action | split by action (`ticket.create.js`, `ticket.reply.js`, ...) when their controllers are extracted |
| `services/email/` top level (`adminNotificationEmail.js`, `announcementEmail.js`, `approvalEmail.js`, `newTicketEmail.js`, `otpEmail.js`, `resetPasswordEmail.js`, `ticketReplyEmail.js`, `mailRenderer.js`) | mails named after the mail, while the transport and inbound files use `email.<name>.js` | `email.<name>.js` (`email.approval.js`, ...), or keep and document the exception |
| `services/planning/` (`computeUserShifts.js`, `computeShiftOfTeam.js`, `generateShiftsMap.js`), `services/substitution/compatibility/` (`categorizeDemand.js`, `demandVariations.js`) | files named after their main function rather than `<domain>.<action>.js` | `planning.userShifts.js`, `planning.teamShift.js`, `planning.shiftsMap.js`; the compatibility files are acceptable as a sub-folder of a domain |
| controllers `accountRecovery`, `calendarEntry`, `publicAnnouncement` | camelCase, while their route files are kebab-case (`account-recovery.routes.js`, `calendar-entry.routes.js`, `public-announcement.routes.js`) | pick one case for multi-word resources (kebab-case for files, as the routes already are) |
| `models/CalendarEntry.js` | exports four models (`CalendarEntry`, `Assignment`, `Modification`, `HourPatch`) with no header comment | fine as discriminators, but name them in a header comment; the service folder is `calendarEntry/` and the controller `calendarEntry.controller.js` while the route file is `calendar-entry.routes.js` (see the case row above) |

## 4. URLs

All mounts are singular (`routes/index.js`). What is left are sub-paths that still name a plural, called by the front, so
they change only together with it: `/stat/users|centers|substitutions`, `/center/users/count`, `/user/teams/:centerId`
(and `/timeline`), `/announcement/users-count`, `/user/:id/team-occurrences`, `/user/:id/transactions`.
Decide whether sub-paths follow the same rule (`/stat/user`, `/user/team/:centerId`, ...) or stay as descriptive names.

## 5. Files to remove or check

- `backend/services/substitution/request.internal.js`: untracked, imported by nothing, and it declares the same functions
  as `request.accept.js`, `request.cascade.js` and `request.expiry.js` (a stale copy of the code that was split); it is the
  reason this file is left out of `services/substitution/index.js`. Delete it once confirmed.
- `backend/services/rotationService/` and `backend/services/rules/`: empty folders left on disk (not tracked by git).
- Tests (`backend/test/`) import service files directly, as they test internals (`categorizeDemand`, `demandVariations`);
  this is the only place that does it outside `services/`.

## 6. Hygiene

- **63 `console.log` calls** in controllers (12), services (45), middleware (3) and jobs (3), plus 3 in `bootstrap/` and 5
  in `dev/`, and no logger: add a small `utils/logger.js` with levels, and stop logging in controllers.
- `package.json`: no lint configuration for the backend (the checks in this repository use the front's ESLint with a
  temporary configuration); no `engines` field although the Dockerfile uses Node 20 (and the tests ran on Node 26).
- Files over 500 lines (candidates to split): `services/substitution/compatibility/categorizeDemand.js` 510,
  `services/rotation/rotation.activation.js` 502.

## 7. Suggested order of what remains

1. Extract the controller logic of `substitution`, then `center`, `team` and the small ones into services, one resource per
   change, with input validation and the common response shape (section 2); add each new service file to its
   domain's `index.js`.
2. Add `backend/.env.example`, a logger, and a backend lint configuration with `engines`.
3. Clean the repository root (tracked `replacement.txt`, `ssh_config`, `Microsoft/`), rename the development compose file,
   move the error folder, delete the stale files of section 5.
4. Settle the file-naming exceptions (section 3).
5. Decide whether the plural sub-paths of section 4 are renamed too, together with the front.
