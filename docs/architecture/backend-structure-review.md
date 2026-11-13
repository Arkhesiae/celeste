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
| repository root | tracked files that are not part of the app: `replacement.txt`, `ssh_config`, `Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt` (secrets tracked: known issue #5) | remove from git, add to `.gitignore` |

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

Rule (in `CLAUDE.md`): service files are `<domain>.<action>.js`, and routes, controllers, models and service folders use the
same singular camelCase word (kebab-case is for URLs only). What still breaks it:

| Current | Anomaly | Proposed |
|---|---|---|
| `services/ticket/ticket.service.js` (10 functions), `services/publicAnnouncement/publicAnnouncement.service.js`, `services/rule/rule.service.js` | one `<domain>.service.js` file per domain instead of one file per action | accepted for a small single-file domain (documented in `CLAUDE.md`); split by action (`ticket.create.js`, `ticket.reply.js`, ...) if one of them grows or when its controller is reworked |
| `services/substitution/compatibility/` (`categorizeDemand.js`, `demandVariations.js`) | named after their main function, in a sub-folder of the domain | acceptable (used by the tests and documented in `docs/architecture/demand-categorization.md`); rename to `compatibility.categorize.js` / `compatibility.variations.js` only if the folder grows |
| `middleware/` (`authMiddleware.js`, `centerAuth.js`, `errorHandler.js`) | three different suffix styles | `auth.middleware.js`, `centerAuth.middleware.js`, `errorHandler.middleware.js`, or keep (they are named after what they export) |

## 4. URLs

All mounts are singular (`routes/index.js`). What is left are sub-paths that still name a plural, called by the front, so
they change only together with it: `/stat/users|centers|substitutions`, `/center/users/count`, `/user/teams/:centerId`
(and `/timeline`), `/announcement/users-count`, `/user/:id/team-occurrences`, `/user/:id/transactions`.
Decide whether sub-paths follow the same rule (`/stat/user`, `/user/team/:centerId`, ...) or stay as descriptive names.

## 5. Exceptions to the import rule

- Tests (`backend/test/`) import service files directly, as they test internals (`categorizeDemand`, `demandVariations`);
  this is the only place that does it outside `services/`.

## 6. Hygiene

- **63 `console.log` calls** in controllers (12), services (45), middleware (3) and jobs (3), plus 3 in `bootstrap/` and 5
  in `dev/`, and no logger: add a small `utils/logger.js` with levels, and stop logging in controllers.
- `package.json`: no lint configuration for the backend (the checks in this repository use the front's ESLint with a
  temporary configuration); no `engines` field although the Dockerfile uses Node 20 (and the tests ran on Node 26).
- `MAIL_SERVICE` is read in `services/email/email.transport.js` but never used: mails go to the console unless
  `NODE_ENV=production`, then through SES. Either make `MAIL_SERVICE` decide (as `CLAUDE.md` says) or stop reading it.
- Files over 500 lines (candidates to split): `services/substitution/compatibility/categorizeDemand.js` 510,
  `services/rotation/rotation.activation.js` 502.

## 7. Suggested order of what remains

1. Extract the controller logic of `substitution`, then `center`, `team` and the small ones into services, one resource per
   change, with input validation and the common response shape (section 2); add each new service file to its
   domain's `index.js`.
2. Add a logger, and a backend lint configuration with `engines` (`backend/.env.example` is done).
3. Clean the repository root (tracked `replacement.txt`, `ssh_config`, `Microsoft/`), move the error folder.
4. Decide the two remaining file-naming exceptions (section 3: `<domain>.service.js`, middleware suffixes).
5. Decide whether the plural sub-paths of section 4 are renamed too, together with the front.
