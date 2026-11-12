# Backend structure review

Review of `backend/` folders, file names and layering (first written 2026-11-12). This page lists **what is still out of
place or not standard**, with the target position or name, so the changes can be done in small, separate steps. Items that
were done are removed (they are recorded in `docs/product/roadmap.md`, "Done"). Facts come from `git ls-files`, an import
graph of the backend modules, and line counts.

Done so far: the case of `AppError.js` in git (known issue #49), the dead `AccountRecoveryRequest` model, `config/` (shared
constants, one file per topic), `public/avatars` and the root crash logs untracked, the mechanical renames, the file moves
(`src/mail` → `services/email`, `utils/team*` → `services/team`, the substitution code out of `services/planning/`,
`findLatestRotation` → `services/rotation`, dev fixtures → `dev/`) and the service renames to the dot style (the
`calendarEntry` and `request.internal` files were split by responsibility).

The target conventions used below are the ones the code already follows most of the time (see `CLAUDE.md`):
`routes/ → controllers/ → services/ → models/`, pure helpers in `utils/`, **one name per domain**, and in services the dot
style `<domain>.<action>.js` (`user.team.js`, `request.accept.js`).

## 1. Folders

| Where | Anomaly | Proposed |
|---|---|---|
| `backend/error/` | singular folder with a single file (`AppError.js`); the other error code is `middleware/errorHandler.js` | `backend/errors/AppError.js`, or `utils/AppError.js` |
| `backend/public/avatars/` | untracked now, but the Docker deployment has no volume for it: uploads are lost on a redeploy | mount `backend/public/avatars` as a volume |
| `backend/dev/` and `backend/bootstrap/` | moved (2026-11-12): `bootstrap/` keeps `seedAdmin.js` (run at startup), `dev/` holds the fixtures used by the dev-only routes (`seedDefaultConfig.js`, `seedTeamUsers.js`, `seedTeamDemands.js`). `routes/dev.routes.js` stays in `routes/` | |
| `backend/scripts/` | two migration scripts (`migrateCycleOffsets.js`, `migrateDayFields.js`), both marked `TEMPORARY`; another `scripts/` folder exists at the repository root (`backup_mongo.sh`, ssh helpers) | `backend/scripts/migrations/` and a note that they are deleted after the cut-over; keep one rule for what goes in the root `scripts/` |
| `backend/docker-compose.yml`, `Dockerfile.dev` | development files that share their names with the production `Dockerfile` / `docker-compose.yml` at the root | `docker-compose.dev.yml` (the `Dockerfile.dev` name is fine) |
| repository root | `replacement.txt`, `ssh_config`, a `Microsoft/` folder and a `node_modules/` that are not part of the backend (secrets tracked: known issue #5) | remove / gitignore |
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
- Good: no service imports a controller, route or middleware, and no model imports a service.

## 3. File naming

Most services now follow the dot style (`<domain>.<action>.js`); what still breaks it is listed here.

| Current | Anomaly | Proposed |
|---|---|---|
| `services/rules/` | the only plural service folder (`substitution`, `transaction`, `calendarEntry` are singular), next to `rule.controller.js` and `models/Rule.js`; its files are `ruleService.js`, `initializeRules.js`, `predefinedRules.js` | `services/rule/` with `rule.service.js`, `rule.initialize.js`, `rule.predefined.js` (the URL `/rules` can stay) |
| `models/Transaction.js` | a transfer of points, which reads like a database transaction (`inTransaction`, `session`) | `PointTransfer.js` (or `PointTransaction.js`) |
| `models/CalendarEntry.js` | exports four models (`CalendarEntry`, `Assignment`, `Modification`, `HourPatch`) | fine as discriminators, but name them in a header comment; the folder `calendarEntry/`, the route `calendar-entry.routes.js` and the URL `/planning-modifications` are three names for one resource |

## 4. Routes, controllers and URLs

| Route file | Controller | Mount | Anomaly |
|---|---|---|---|
| `account-recovery.routes.js` | `recovery.controller.js` | `/account-recovery` | three names for one resource (route, controller, URL) |
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
  `ticketReplyEmail.js`, `rotation.activation.js`, `ruleService.js`. Proposed: named exports
  for controllers, services and utils (they are easier to search and to mock); default only for models and routers.
- Barrels (`index.js`) exist for `services/auth` and `services/substitution` only, and the controllers do not all use them.
  Either use them everywhere or drop them.

## 6. Hygiene

- **69 `console.log` calls** (controllers 18, services 45, middleware 3, jobs 3) and no logger: add a small `utils/logger.js`
  with levels, and stop logging in controllers.
- `package.json`: no lint configuration for the backend (the checks in this
  repository use the front's ESLint with a temporary configuration); no `engines` field although the Dockerfile uses Node 20
  (and the tests ran on Node 26).
- Files over 500 lines (candidates to split): `controllers/user.controller.js` 943, `controllers/rotation.controller.js` 653,
  `services/calendarEntry/calendar-entry.js` 544, `services/rotation/rotation.activation.js` 502.
- Test layout is consistent (`backend/test/<area>.test.js`, run by `npm test`).

## 7. Suggested order of what remains

1. Extract controller logic into services, one resource per change, `rotation` first, then `user`.
2. Rename the last service folder and model that break the naming (`services/rules` → `services/rule`, `models/Transaction.js`
   → `PointTransfer.js`) and the route / controller / URL pairs of section 4.
3. Add `backend/.env.example`, the Docker volume for the avatars, and a logger.
4. Decide the URL naming (singular `/center`, `/substitution`) together with a front change, if at all.
