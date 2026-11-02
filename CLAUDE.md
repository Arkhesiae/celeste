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
- Cron: `jobs/` (imported by `server.js`) uses node-cron; `requestJob` every 30 min cancels past substitution demands and completes/archives finished ones via `services/substitution/request.internal.js`; `transactionJob` runs scheduled transactions (`services/transaction/`).
- Mail: `services/email/*` with MJML/Handlebars templates rendered by `src/mail/mailRenderer.js` (`/preview/:template` route for dev preview); `MAIL_SERVICE=console` logs instead of sending. Inbound mail parsed in `email.inbound.js`.
- Rules: `services/rules/` (predefined rules seeded at startup) configure per-center behaviour.

### Core domain (needs several files to understand)
Shifts are not stored per-day per-user; they are **computed** from `Rotation` (a cyclic pattern of `Shift`s per `Team`, activated via `rotationService/rotationActivationService.js`) plus overrides (`CalendarEntry`, `Variation`, `Substitution`, `Transaction`). Helpers in `utils/` (`computeUserShifts`, `computeShiftOfTeam`, `getTeamAtGivenDate`, `findLatestRotation`, `generateShiftsMap`, `getEffectiveShiftTimes`, `overlapTest`) do this computation; dates are center-timezone sensitive (`@js-temporal/polyfill`).

Substitutions (`services/substitution/`, split by action: creation, accept, cancel, withdraw, delete, getAndCat, internal; `index.js` re-exports) let a user post a shift ("demand") that others accept/swap. `compatibilityService` and `demandService` decide who can take it (overlap/rest/rules), and `utils/categorizeDemand_v2.js` categorizes demands for the requesting user (v1 was removed). Models: `Substitution`, `User`, `Team`, `Center`, `Rule`, `Ticket`, `Announcement`, `Message`.

`backend/deprecated/` and `front/src/deprecated/` hold dead code being phased out (notifications were deprecated) — don't build on them.

## Front architecture

- File-based routing from `src/pages/` (`vue-router/vite`, typed routes in `typed-router.d.ts`) with layouts from `src/layouts/` (`vite-plugin-vue-layouts-next`). Components and Vue/vue-router APIs are auto-imported (`unplugin-vue-components`, `unplugin-auto-import`); `components.d.ts` / `auto-imports.d.ts` are generated — don't hand-edit.
- Data flow: page/component → Pinia store (`src/stores/*Store.js`) → API wrapper in `src/services/*Service.js` (one per backend resource, mirroring `/api/<resource>` routes) → backend. Keep service, store and backend route/controller in sync when changing an endpoint.
- `src/plugins/` registers Vuetify, router, Pinia; theming in `src/styles/settings.scss`. Shared dialogs/components live in `src/components` (e.g. a `baseDialog`).
- Auth: JWT access token + refresh flow (`authService`/`authStore`); biometric login via Capacitor native plugin.
