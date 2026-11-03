# Roadmap

One line per item, with the date. Move items between sections as they progress.

## Planned
- (2026-11-02) Fix the rest of the rotation change flow: `deleteRotation` (#30), swallowed errors (#33), same-date activations (#34), stale variations/entries (#35).
- (2026-11-02) Test the team-change approval flow in a browser against MongoDB (assign, replace, delete; with and without affected substitutions). Expected behaviours to confirm: retroactive changes also deactivate past shift-related calendar entries (completed substitutions are not cancelled, their entries are); `changes[].to` is inclusive; `assignTeamToUser` checks the team (404) before the user (404).
- (2026-11-02) Fix the front build (`demandComment` import) and remove the dead conflict dialogs (known issues #17, #18).
- (2026-11-02) Test team assignment / occurrence deletion end to end against MongoDB (sanitize + save in one transaction).
- (2026-11-02) Authentication and authorization fixes from `docs/quality/blocking-issues.md` (#3-#9, #11).
- (2026-11-02) Remove committed secrets from git and rotate credentials (#5).

## In progress
- (2026-11-02) Backend cleanup after the controllers/services refactor (see known issues).

## Done
- (2026-11-03) Rotation activation: preview and confirm merged into one endpoint per action (`/activate`, `/remove-date`, `confirmed` boolean in the body) and one front service call each (`setActiveRotation(id, date, confirm)`, `removeActivationDate(id, date, confirm)`); the `/confirm-activate`, `/confirm-remove-activate` aliases and their compatibility shim are gone; `confirmed` must be a real boolean.
- (2026-11-03) Rotation change can be confirmed from the UI again: `rotation.vue` now reads `rotationId` when confirming (known issue #27); verified through the confirm routes and the center guard. Fix is in the working tree, not yet committed.
- (2026-11-03) Center API secured: create/update/delete and cross-center reads are master-admin only, active rotation limited to the center's members, and the one public route (`GET /center`) no longer leaks admin user ids, related centers or time zones (known issue #3; new issue #38 for the delete handler).
- (2026-11-03) One-year team timelines: team members drawer (past, current and upcoming members, reinforcements hatched) and the user's own teams in `UserTeamCard`; new endpoints `GET /users/teams/:centerId/timeline` and `GET /users/:id/team-timeline`, `buildTeamTimeline`, `middleware/centerAuth.js`.
- (2026-11-03) Reminder email the evening before a replacement/switch, to the accepter only (`replacementReminder` template, `reminderJob`, `Substitution.reminderSentAt`); optional `REMINDER_HOUR` (default 18, center-local time).
- (2026-11-03) Third parties are now emailed after commit when a team change or rotation change cancels a request or withdraws an accepter (new generic `demandCancelled` template, existing `cancelledAcceptance` reused for removed accepters, `notifyDemandChanges`); mails state neither the cause nor that the change was automatic; the acting user is not emailed; nothing is sent when the transaction fails. Residual cases in known issue #23.
- (2026-11-03) Error handling simplified: every `catch` is `next(error)`; `errorHandler` returns a generic 500 for anything that is not an `AppError` (no more raw Mongoose/driver messages), passes framework 4xx and `MulterError` through, and no longer trusts a `.status` set on a plain `Error`. User-facing plain errors in `computeShiftOfTeam`, `computeUserShifts`, `transaction.scheduled` and `calendar-entry` are now `AppError`s with proper statuses.
- (2026-11-02) Legacy error handling removed from the backend: controllers, `dev.routes`, the SNS webhook and `authMiddleware` now throw `AppError` / call `next(error)` instead of writing `res.status(4xx/5xx).json(...)`; `errorHandler` returns `{ error, message, code }`; `ruleService`, `publicAnnouncementService` and the rotation/user controllers throw `AppError` with proper statuses (rule not found is now 404, locked 403, instead of a blanket 400).
- (2026-11-02) Rotation days can only be edited while the rotation has no activation date (past or future); the admin gets an error message otherwise (known issue #31, residual bugs remain).
- (2026-11-02) Rotation change: demands cancelled because the rotation length differs now get the full cancel cleanup (cascade, pending points transactions, substitution calendar entries); pending transactions of cancelled requests are skipped by the nightly job; changes are processed sequentially inside the transaction.
- (2026-11-02) Rotation mutations are scoped to the admin's center (`middleware/rotationAuth.js`); `PUT /rotations/:id/update` no longer accepts `centerId` / `activationDates`.
- (2026-11-02) Dead backend files deleted (`workshift.routes.js`, `backend/deprecated/*`, `utils/categorizeDemand.js` v1, `utils/convertToCenterTime.js`; none were imported).
- (2026-11-02) `cancelSubstitutionEntries` now runs inside the caller's Mongo transaction (session passed to every query; shifts are no longer recomputed inside a transaction; transient errors keep their label so `withTransaction` can retry).
- (2026-11-02) Team change/removal returns 409 with a detailed impact preview (substitutions to cancel/withdraw, calendar entries to deactivate) and `TeamChangeImpactDialog.vue` with a before/after timeline; `assign-team` accepts `replaceOccurrenceId`.
- (2026-11-02) `user.team.js` now uses `buildTeamSegments`, `diffTeamSegments` and `sanitizeUserPeriod` (old `findChangedPeriods` and stubs removed).
- (2026-11-02) Team segment helpers added: `utils/teamSegments.js` (contiguous ownership segments and diff between two segment lists).
- (2026-11-02) Backend import errors fixed; server loads again.
- (2026-11-02) Missing `next` fixed in controllers; local admin password now comes from `LOCAL_ADMIN_PASSWORD`.
- (2026-11-02) Duplicate `toDateKey` removed from `CalendarPanel.vue`.
- (2026-11-02) Period helpers added: `services/user/user.sanitizePeriod.js` (cancel/withdraw substitutions, deactivate shift calendar entries, combined sanitize).
