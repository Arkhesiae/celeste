# Roadmap

One line per item, with the date. Move items between sections as they progress.

## Planned
- (2026-11-02) Fix the rest of the rotation change flow: front confirm key (#27), `deleteRotation` (#30), in-place day edits (#31), swallowed errors (#33), same-date activations (#34), stale variations/entries (#35).
- (2026-11-02) Test the team-change approval flow in a browser against MongoDB (assign, replace, delete; with and without affected substitutions). Expected behaviours to confirm: retroactive changes also deactivate past shift-related calendar entries (completed substitutions are not cancelled, their entries are); `changes[].to` is inclusive; `assignTeamToUser` checks the team (404) before the user (404).
- (2026-11-02) Fix the front build (`demandComment` import) and remove the dead conflict dialogs (known issues #17, #18).
- (2026-11-02) Test team assignment / occurrence deletion end to end against MongoDB (sanitize + save in one transaction).
- (2026-11-02) Authentication and authorization fixes from `docs/quality/blocking-issues.md` (#3-#9, #11).
- (2026-11-02) Remove committed secrets from git and rotate credentials (#5).

## In progress
- (2026-11-02) Backend cleanup after the controllers/services refactor (see known issues).

## Done
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
