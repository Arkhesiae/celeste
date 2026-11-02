# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Celeste is a shift-management / planning app (teams, rotations, shift substitutions between users, tickets, announcements) for "centers". Two parts, deployed together:

- `backend/` — Node 20, Express 5, Mongoose 9 (MongoDB), ES modules (`"type": "module"`). Code comments, logs and user-facing messages are largely in French.
- `front/` — Vue 3 (Composition API, `<script setup>`), Vuetify 4, Pinia stores, Vite, Capacitor (Android/iOS wrapper).

Cursor rule (`.cursor/rules`): always provide solutions that consider the full front-to-back workflow, and always use the Vue Composition API with `<script setup>`.

## Commands

Backend (`cd backend`):
- `npm run dev` — nodemon `server.js`; `npm start` — plain node
- `npm run format` — prettier on `src/**`
- No test suite exists (`npm test` is a stub).

Front (`cd front`):
- `npm run dev` (or `npm run front` for `--host`), `npm run build`, `npm run lint` (eslint --fix)
- Capacitor: `npm run cap:sync`, `cap:open:android`, `cap:open:ios`

Local setup (see CONTRIBUTING.md, marked incomplete): create `front/.env.local` (`VITE_API_URL=http://localhost:3000/api`, `VITE_NODE_ENV`, `VITE_ADMIN_MAIL`, `VITE_ADMIN_PASS`) and `backend/.env.development` (`MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `MAIL_SERVICE=console`). Needs a local MongoDB. Backend also reads `JWT_SECRET`, `FRONT_URL`, `PORT`.

Deploy: root `Dockerfile` builds `front` and copies `dist` into `backend/public`, so one Express container serves both API and SPA. `docker-compose.yml` adds mongo, nginx, certbot, a backup job (`scripts/backup_mongo.sh`) on an external `celeste` network, using `.env.prod`.

## Backend architecture

Layering: `routes/` → `controllers/` → `services/` → `models/` (+ `utils/` for pure helpers).

- `server.js`: CORS (explicit origin allowlist incl. `capacitor://` origins), mounts `routes/index.js` under `/api`, serves `public/` (the built SPA, with catch-all for non-`/api` paths) and `/api/avatars`, then `errorHandler` last. On Mongo connect (5 retries) it runs `initializeRules()`, `createAdmin()`, `createLocalAdmin()` before listening.
- Errors: throw `AppError(message, status, code)` (`error/AppError.js`; file was recently renamed from `appError.js` — mind casing on imports). `middleware/errorHandler.js` serializes it. Auth uses `middleware/authMiddleware.js` (Bearer JWT → `req.user`; `isAdmin` etc.). Auth flows (login, refresh token, password reset, OTP, account recovery) live in `services/auth/`.
- Rotation mutations (`routes/rotations.routes.js`) go through `middleware/rotationAuth.js` (`authorizeRotationAccess` / `authorizeRotationCreation`): a local admin can only touch rotations of their own center (master admin: all; fail-closed when the center is missing). Activation dates only change through the activate / remove-date flow (preview 409 → confirm), which cancels or converts the affected substitutions inside one transaction; `PUT /rotations/:id/update` only renames.
- Cron: `jobs/` (imported by `server.js`) uses node-cron; `requestJob` every 30 min cancels past substitution demands and completes/archives finished ones via `services/substitution/request.internal.js`; `transactionJob` runs scheduled transactions (`services/transaction/`).
- Mail: `services/email/*` with MJML/Handlebars templates rendered by `src/mail/mailRenderer.js` (`/preview/:template` route for dev preview); `MAIL_SERVICE=console` logs instead of sending. Inbound mail parsed in `email.inbound.js`.
- Rules: `services/rules/` (predefined rules seeded at startup) configure per-center behaviour.

### Core domain (needs several files to understand)
Shifts are not stored per-day per-user; they are **computed** from `Rotation` (a cyclic pattern of `Shift`s per `Team`, activated via `rotationService/rotationActivationService.js`) plus overrides (`CalendarEntry`, `Variation`, `Substitution`, `Transaction`). Helpers in `utils/` (`computeUserShifts`, `computeShiftOfTeam`, `getTeamAtGivenDate`, `findLatestRotation`, `generateShiftsMap`, `getEffectiveShiftTimes`, `overlapTest`) do this computation; dates are center-timezone sensitive (`@js-temporal/polyfill`).

Substitutions (`services/substitution/`, split by action: creation, accept, cancel, withdraw, delete, getAndCat, internal; `index.js` re-exports) let a user post a shift ("demand") that others accept/swap. `compatibilityService` and `demandService` decide who can take it (overlap/rest/rules), and `utils/categorizeDemand_v2.js` categorizes demands for the requesting user (v1 was removed). Models: `Substitution`, `User`, `Team`, `Center`, `Rule`, `Ticket`, `Announcement`, `Message`.

Period cleanup for a user (e.g. after a team change): `services/user/user.sanitizePeriod.js` exports `cancelUserSubstitutionsInPeriod`, `clearUserCalendarEntriesInPeriod` and `sanitizeUserPeriod(userId, { from, to? })` (open-ended when `to` is omitted; both ends inclusive). Calendar entries are deactivated (`active: false`), never deleted, and no emails are sent.

Team ownership is stored as overlapping occurrences (`user.teams`: `{ teamId, fromDate, toDate|null }`, `toDate` inclusive; a bounded occurrence = reinforcement and beats the open-ended permanent one). `utils/teamSegments.js` turns them into contiguous segments (`buildTeamSegments`, `getOwnerTeamIdAt`) and diffs two segment lists (`diffTeamSegments` → `{ from, to, oldTeam, newTeam }`, inclusive bounds, `to: null` = unlimited, directly usable as a `sanitizeUserPeriod` period). `services/user/user.team.js` (`assignTeamToUser`, `deleteTeamOccurrence`) uses them: it diffs the segments, runs `sanitizeUserPeriod` on each changed period and saves `user.teams`, all in one transaction, and returns the `changes`. Without `confirmed`, if the change would cancel substitutions or deactivate calendar entries, it applies nothing and returns **409** `{ needsApproval, message, segments: { before, after }, teams: { id: name }, changes: [{ from, to, oldTeam, newTeam, substitutions, entries }] }` (built with `previewUserPeriodImpact`, the read-only twin of `sanitizeUserPeriod`); the client re-sends with `confirmed: true` (body for `POST /users/:id/assign-team`, `?confirmed=true` for `DELETE /users/:id/team-occurrences/:occurrenceId`). `assign-team` also accepts `replaceOccurrenceId` to swap an occurrence in one atomic change. Front: `apiFetch` turns any 409 into `{ ...data, needsApproval: true }` (no throw); `components/Profile/TeamChangeImpactDialog.vue` shows the before/after timeline and the affected items.

`front/src/deprecated/` holds dead code being phased out (notifications were deprecated) — don't build on it. (`backend/deprecated/` and the other unused backend files were deleted; they remain in git history.)

## Front architecture

- File-based routing from `src/pages/` (`vue-router/vite`, typed routes in `typed-router.d.ts`) with layouts from `src/layouts/` (`vite-plugin-vue-layouts-next`). Components and Vue/vue-router APIs are auto-imported (`unplugin-vue-components`, `unplugin-auto-import`); `components.d.ts` / `auto-imports.d.ts` are generated — don't hand-edit.
- Data flow: page/component → Pinia store (`src/stores/*Store.js`) → API wrapper in `src/services/*Service.js` (one per backend resource, mirroring `/api/<resource>` routes) → backend. Keep service, store and backend route/controller in sync when changing an endpoint.
- `src/plugins/` registers Vuetify, router, Pinia; theming in `src/styles/settings.scss`. Shared dialogs/components live in `src/components` (e.g. a `baseDialog`).
- Auth: JWT access token + refresh flow (`authService`/`authStore`); biometric login via Capacitor native plugin.

## Working agreement (applies to every task)

1. **Minimal reasonable change.** Fix the problem with the smallest diff that solves it properly. No drive-by refactors, renames, reformatting or unrelated cleanups; if you spot something adjacent, record it (step 4) instead of fixing it. "Minimal" means the smallest correct fix, not a workaround that leaves the root cause.
2. **Update documentation** touched by the change: this file (commands, architecture, env variables), `CONTRIBUTING.md` (setup), and anything under `docs/` that describes the changed behavior. New env variables must be documented in the same change.
3. **Roadmap** — `docs/product/roadmap.md` (create it if missing): record planned, in-progress and completed work, one line each with the date. Move items between sections as they progress.
4. **Known issues** — `docs/quality/blocking-issues.md`: when a task fixes an item there, mark it fixed and say how; when it uncovers a new defect or leaves something unfinished, add it with severity (P0/P1/P2), file and line, and impact.
5. **Report** the doc updates in the final message, and say plainly what was not verified (for example, nothing was run against MongoDB).
