# Review: calendar entries, user shift computation, substitutions (chained included)

Review date: 2026-11-14. **Read-only review: no code was changed.** Everything below is a proposal waiting for a decision.

Scope read in full: `services/calendarEntry/*`, `controllers/calendarEntry.controller.js`, `routes/calendarEntry.routes.js`,
`services/planning/planning.userShifts.js`, `services/substitution/request.{accept,cancel,cascade,creation,delete,expiry,list,withdraw}.js`,
`services/substitution/substitution.userPool.js`, `models/Substitution.js`, `models/CalendarEntry.js`, `controllers/substitution.controller.js`,
`routes/substitution.routes.js`, and the front calendar / modal call sites that touch them.

**How sure am I.** Items marked *(verified)* were reproduced with a small script (Mongoose cast, schema). The others come from reading the code and
tracing the calls; nothing was run against a database for this review, so each one should be confirmed with a test before the fix.
Severity: **P0** wrong data or security hole, **P1** feature broken or inconsistent state reachable by a normal user, **P2** fragile or misleading.

---

## 1. Summary of the most important findings

| # | Sev | Where | One line |
|---|-----|-------|----------|
| S1 | P0 | `request.creation.js`, `substitution.controller.js` `createDemand` | A replaced agent can post a new demand on the shift they gave away: two people end up working it |
| S2 | P0 | `calendarEntry.register.js` `registerModification` | A `pres` modification brings a replaced agent back on a shift now held by someone else |
| S3 | P0 | `substitution.controller.js` `createDemand`, `POST /substitution/` | The poster comes from the request body, not from the token, and there is no center guard |
| S4 | P0 | `routes/substitution.routes.js` | Any member of the center can cancel or delete anybody's demand |
| S5 | P1 | `calendarEntry.register.js` `addSubstitutionEntries` | A switch never gives the poster the accepter's shift |
| S6 | P1 | `request.accept.js` `acceptRequestWithSession` | Accepting a switch throws (`userShiftData.shift`, `.teamObject` do not exist) |
| S7 | P1 | `calendarEntry.cancel.js` | Cancellations are fire-and-forget: the shift returned to the client is computed before they are written |
| S8 | P1 | `request.cascade.js` | Cascaded children never receive the `reason` (`system-cancelled` becomes `cancelled`) |
| S9 | P1 | `request.accept.js` | No server-side compatibility check, no date check, `reservedForUserId` ignored |
| S10 | P1 | `calendarEntry.read.js`, controller | `getUserEntries` never matches (verified), `getModification` calls a missing function |
| S11 | P1 | `request.cancel.js` / `cascade.js` | Cancelling an already finished demand rewrites its status without undoing anything |

The chained-substitution analysis is in section 3, the interface proposal in section 4, naming in section 5, simplifications in section 6.

---

## 2. Bugs and inconsistencies

### 2.1 Substitution flow

**S1 (P0). A replaced agent can post a demand on a shift they no longer hold.**
`createDemand` only checks `computedShift.shiftData.shift` exists. For the poster of an accepted substitution `resolveAssignment` deliberately keeps the base
shift in `shiftData.shift` (to display it struck out) and sets `isOff: true`, so the check passes. `createDemand` never looks at `isOff`, nor at
`isWorked`, nor at `shift.type`: a **rest** shift is also a `shift` document, so a demand can be posted on a rest day too (the UI hides it through
`GET /substitution/check-shift`, the server does not).
Scenario: A posts S1, B accepts. A posts S4 for the same day, D accepts it. B and D now both work A's shift; `dependsOn` of S4 even contains S1.
Fix direction: in `createDemand`, require `computedShift.isWorked && !computedShift.isOff` (and the shift to be `work`).

**S2 (P0). A modification brings a replaced agent back.** `registerModification` checks `isSameShift(userShift, data)` against `shiftData.shift`, which is the
kept base shift for a replaced poster, so it passes. Then `applyModification` case `pres` sets `isOff: false`, so A is "present" again while B holds the shift.
Other modifications on such a day (`vic`, `variation`, `disp`) are accepted too, and an accepter (B) can add `disp` without the substitution being touched, so
nobody works the shift while the demand stays `accepted`. `registerAssignment` blocks active substitutions, `registerModification` and `registerHourPatch` do not.
Fix direction: same guard as `registerAssignment` (`latestAssignment.subType === 'substitution'` or an open/accepted `Substitution` that day), or a
dedicated message "annulez d'abord la demande".

**S3 (P0). The poster is read from the body.** `createDemand` controller calls `substitutionService.createDemand(req.body)` and the service uses
`posterId` from the body. Any logged-in user can post demands for any user id (the center used is the victim's). Also: `status` comes from the body
(a client can create a demand directly `accepted` or `completed`), `points` and `acceptedSwitches` are not validated (`acceptedSwitches` undefined makes
`maximumTransactionPoints` throw a TypeError, a missing `points` gives `NaN` and then a schema error, both end as generic 500), and
`req.body.posterShift.date` is read before the existence of `posterShift` is checked. The project rule "the target always in the URL, caller from the token"
is not applied here. Fix direction: `posterId = req.user.userId`, whitelist the body (`posterShift.date`, `selectedVariation`, `points`, `acceptedSwitches`, `comment`, `isTrueSwitch`),
force `status: 'open'`.

**S4 (P0). Missing actor checks.** `POST /:id/cancel` and `DELETE /:id/delete` are only behind `authorizeDemandAccess` (same center). Nothing checks that
the caller is the poster (or an admin). `cancelRequest` only uses `actorId` for the notification. `DELETE /:id/delete` runs the WIP `deleteDemand`
(file header says "not operational"): it flags `deleted` without touching the calendar entries, so on an accepted demand the replacement stays in the
planning. `POST /:id/send-email` lets any member send mail to the center's administrators for any demand (and puts user names into raw HTML).
`POST /detect-team-change-conflicts` takes `userId` from the body without any center guard: it discloses another user's demands and dates.

**S5 (P1). A switch never gives the poster the accepter's shift.** `addSubstitutionEntries` always writes `accepterEntry` with the poster's shift and
`posterEntry` with `shiftData: null`, whatever `demand.type` is. For an exchange, the poster should receive `demand.accepterShift` (the accepter's own shift
that day), otherwise after a swap one shift is worked twice and the other not at all. `savedEntry` aside, `accepterShift` is stored in the demand and used
nowhere else for this. (Confirm the intended meaning of a switch: from `substitution.switches.js` it is "same day, different shift".)

**S6 (P1). Accepting a switch cannot work as written.** `acceptRequestWithSession` reads `userShifts[0]` (an entry of `computeUserShifts`, which has
`shiftData.shift` and `shiftData.team`) as `userShiftData.shift._id` and `userShiftData.teamObject._id`. Neither `shift` nor `teamObject` exists on that
result (`teamObject` is only produced for demands in `compatibility.categorize.js`), so this throws a TypeError, caught in `acceptRequest` as a generic
`AppError` whose message is `"Erreur lors de l'acceptation de la permutation" + error` (the raw error text reaches the client, against the error convention).
It probably hides S5.

**S7 (P1). Fire-and-forget writes.** `cancelModifications`, `cancelHourPatches` and `cancelAssignments` use `forEach(... save())` without awaiting.
`restoreInitialShift` and `undoMods` call all three without `await`, then immediately `computeUserShifts`, so the returned `userShift` can still show the
old state, and an error becomes an unhandled rejection. `registerModification`/`registerAssignment` `await cancelHourPatches(...)` which returns before the
saves are done. Fix direction: `await Model.updateMany({ userId, date, active: true }, { active: false })` (what the substitution cancel already does).

**S8 (P1). `reason` is lost in cascades.** `cancelCascade` calls `cancelRequestWithSession(child._id, { visited, session, cancelledRequests })` without
`reason`. When the root is cancelled with `system-cancelled` (rotation change, team change), the cascaded children get `cancelled`. The parameter is also
misnamed: it is a final **status**, not a reason.

**S9 (P1). Acceptance is not re-validated on the server.** `acceptRequestWithSession` checks status, self-acceptance and an open demand of the accepter that day,
and nothing else: no rest/workload compatibility (the whole `compatibility.*` stack only runs for display), no check that the accepter is not already working
that day (a user holding another substitution that day can accept a second one), no date check (a demand of a past day not yet expired by the 30-minute job
can still be accepted, cancelled, withdrawn), `reservedForUserId` exists in the model and is read nowhere (so a reserved demand is open to everyone), and
`isTrueSwitch` is never stored (dead schema field). The server is the only place that can be trusted for a race or a tampered client.

**S10 (P1). Calendar entry reads.**
- `getUserEntries` filters `date: new Date(date)` on a **String** field. Mongoose casts the Date to `"Fri Nov 13 2026 01:00:00 GMT+0100 ..."` *(verified)*, which never
  equals `YYYY-MM-DD`: the endpoint always returns an empty list. The route is `POST /calendar-entry/:userId` but the controller ignores the parameter and uses the token.
- `deleteModification` and `getModification` call `calendarEntryService.removeModification` and `getModificationById`, which do not exist (`GET /calendar-entry/:id` answers 500).
- The front `planningModificationService.registerModification` posts to `/calendar-entry/register-modification` with `type: 'selectedVariation'`: that route does not exist (404),
  so choosing a variation from `DemandModal` fails. The result field `updatedDemand(s)` that the front looks for is always `null` on the server (six places).

**S11 (P1). Cancelling a finished demand.** `cancelRequestWithSession` has no state guard (accept has one). Cancelling a `completed`, `expired` or `cancelled` demand rewrites
its status to `cancelled`; entries and transactions are only undone when the status was `accepted`, so a completed demand (points already transferred) becomes `cancelled`
with its transactions and entries untouched.


**Other points**
- Non-atomic writes in `registerEntry` (no transaction): `registerHourPatch` deactivates the previous patch **before** the validations that can answer 422; a 422 leaves the day without its patch.
  `registerModification` deactivates the old modification, then cancels patches, then saves.
- `acceptRequest`, `withdrawFromRequest` and `cancelRequest` recompute shifts after the commit; a failure there (`computeUserShifts`, `categorizeRequests`) answers 500
  although the action is committed and cannot be retried (the user sees an error, the data changed). The post-commit steps should be best-effort.
- `createDemand` controller: after `res.status(201).json(...)` the notification code (populate, pool computation) can throw and calls `next(err)` on an answered response.
- `getUserDemands` reads `req.user.posterId` (always undefined, the token has `userId`) so `GET /substitution/user` always answers 404; the front does not call it. Dead route.
- `detect-team-change-conflicts` filters `status: { $in: ['open', 'pending', 'accepted'] }`; `pending` is not a status of the model.
- Expiry: `processPastDemands` and `processAndCompleteDemands` set `deleted: true` for `expired` and `completed` demands, so `deleted` means both "archived" and "deleted by hand".
  `getAllCenterDemands` filters `deleted: false`, so an admin never sees the history.
- `updatedAt`, `createdAt` are set by hand (`request.updatedAt = new Date()`, `createdAt: new Date()`) although the schema has `timestamps: true`.

### 2.2 User shift computation (`planning.userShifts.js`)

- **Stale entries can break a whole batch.** `applyHourPatch` adds hours to `resolvedShift.startTime`; if a patch is still active on a day that became a rest day or an assignment day
  (rotation or team change) `startTime` is `undefined` and `addHours` throws a TypeError. `computeUserShifts` runs the days in a `Promise.all`, so one bad day fails the whole month.
  Modifications are protected by `isModificationConsistent` (same shift id), hour patches are not. Same for a `variation` modification whose variation was deleted
  (`modShiftData.selectedVariation.startTime` on `null`).
- `checkHourPatchCoherence` tests `latestModification.subType === 'absence'`, which cannot happen (the modification enum is `disp, vic, variation, pres`). Dead check.
- `isSameShift` returns `undefined` (not a boolean) when an id is missing, and `registerEntry`'s own `isSameShift(userShift, data)` has the same name and another signature (section 5).
- `getActiveEntriesByDates` carries branches that cannot happen: `typeof a.date === 'string' ? a.date.slice(0, 10) : a.date` (the field is always a string), the
  `|| { assignments: [] ... }` fallback in `computeUserShifts` (the map is pre-filled for every date), and a populate chain that is repeated three times for a `shiftData` that is a
  sub-document, not a reference (`populate({ path: 'shiftData', populate: 'shift' })` is a no-op next to the `shiftData.shift` populate).
- `baseShift` has two shapes: in `applyEntries`/`resolveAssignment` it is `{ shift, team }`; in `computeUserShifts` it is the rotation `Shift` document, and the final `{ ...resolvedShift, baseShift }` overwrites the first with the second.
  Readers of `result.baseShift` (`calendarEntry.register.js` `current?.baseShift?.team`) therefore read `team` on a `Shift` document, which has none (the fallback chain there is dead and misleading).
- Only the **latest** assignment, modification and hour patch are used (`.at(-1)`). That relies on the writers keeping a single active one; `cancelSubstitutionEntries` and `deleteAssignment`
  use `createdAt >= ...` instead. Both conventions work together only if timestamps never collide (see 3.3).

### 2.3 Calendar entry registration (`calendarEntry.register.js` and `.cancel.js`)

- `registerMDDA` is never called nor exported (hard-coded `adjustedStart: 1, adjustedEnd: 2`): dead stub next to the real `registerHourPatch`.
- `cancelSubstitutionAssignment` (and the commented call in `cancelSingleAssignment`) is dead; it is also the only reason `calendarEntry.cancel.js` imports `request.cancel.js` and
  `request.withdraw.js`, which import `request.cascade.js`, which imports `calendarEntry.cancel.js`: a real **import cycle** (works today because only functions are used at call time).
- `restoreInitialShift` and `undoMods` are the same function twice (and both keep unused `user` and `initialShift` variables). The route names `/restore-initial` and `/undo-mods` both exist.
- `comment: data?.subType === "congé" ? 'congé' : ""` reads `data.subType`, while the front sends `data.entryType` (the model field is `subType`): the comment is never set, and the literal is French text used as a code.
- `data.team` (assignment) and `data.teamId` (modification, hour patch) are two names for one input; `registerHourPatch` accepts both plus two fallbacks (`teamFromShift?._id ?? teamFromShift`, `baseShift.team`...).
- `registerEntry` loads `substitution`, the three latest entries and the shifts for every handler although each handler uses a subset.
- `getUserEntries` also has a "Date" for a day string (`new Date(date)`), and `findLatestAssignment` in `addSubstitutionEntries` ignores substitution entries on purpose (see 3.2).
- `savedEntry` is written (`demand` entries) and **never read**: nothing restores the entry that `addSubstitutionEntries` deactivated. If C had an assignment that day, accepting a replacement deactivates it,
  and cancelling or withdrawing the replacement does not bring it back (`cancelSubstitutionEntries` only deactivates what is newer). Either use `savedEntry` to reactivate, or refuse the acceptance.

---

## 3. Chained substitutions

Take A posts S1, B accepts, B posts S2 (child of S1), C accepts, C posts S3, D accepts.

### 3.1 What works
- `dependsOn` + `cancelCascade` cancels the descendants first, then the parent (depth-first), inside one transaction; `visited` stops loops.
- Calendar entries are unwound by timestamp (`createdAt >= subEntry.createdAt`): cancelling S2 removes B's S2 poster entry and C's S2 accepter entry, so B's earlier S1 accepter entry becomes the latest again and B works.
  This is also why `addSubstitutionEntries` must not deactivate a previous `substitution` assignment (the filter `subType: { $ne: 'substitution' }`): the chain relies on the older entries staying active underneath.
- Withdrawal by B from S1 cancels S2/S3 and reopens S1.
- Mails after commit for cascaded demands (`notifyDemandChanges`).

### 3.2 What can go wrong
1. **S1/S2 above**: a replaced agent can re-enter the chain (new demand or `pres`), creating two holders of the same shift.
2. **`dependsOn` is too broad and used as a single parent.** `createDemand` stores **every** accepted demand of that day involving the poster as poster *or* accepter. The correct parent of S2 is the one demand
   whose `accepterId` is the new poster (the shift passed to B). With the broad rule, a user who both gave and received on the same day gets several parents, a cancel of any of them cancels the child, and the
   cycle check in the `pre('save')` hook is wrong for arrays: `this.dependsOn` is always truthy (an array), `findById(array)` is cast to `$in` and returns **only the first** match,
   `seen.has(current.dependsOn.toString())` compares a joined string of ids (never an id) for 2+ parents, and the hook runs one query per level on **every** save (accept, cancel, `seenBy`...) outside the session.
   Cycle detection is therefore unreliable. A single `parentId` (nullable) would make the check trivial and the UI easy (section 4).
3. **A chain can loop back on a person.** B's S2 can be accepted by A (the first poster): entries are consistent (A's newest entry is the accepter entry) but A holds a transaction S1 (A pays B) and S2 (B pays A),
   and the display of the chain is a loop. Probably allowed on purpose; it should be explicit in the UI (4.2) and in the points.
4. **Two parents of one shift after a withdraw + re-accept.** B withdraws S1, D accepts it: `reminderSentAt` is reset, entries are new, but S1's `dependsOn` children are cancelled; fine. If instead B's S2 was open (not cascaded because `status` open is cancelled too)
   the cancellation of an *open* child sends nothing to the people who had shown interest (`interested`): minor.
5. **Timestamps as ordering.** Correctness of the unwinding depends on `createdAt` being strictly increasing per user and day, and on `$gte` (which also removes an entry of the same millisecond).
   Entries of one demand are created in one transaction for two different users, so they do not collide, but a manual entry created in the same millisecond as an acceptance would be deactivated.
   `cancelAfter` also deactivates **every** newer entry of the user (modifications, patches, assignments) even ones unrelated to the demand; this is deliberate for S2 children but is a surprise for e.g. a hour patch added by C after accepting.
6. **Points.** Transactions are scheduled per demand at acceptance (`createScheduledTransaction`); the cancellation removes them (`cancelRequestTransactions`). With S11 (status rewritten on finished demands) and the date gap (S9) a cancelled-after-the-fact chain leaves
   transfers that the planning no longer justifies.
7. **Expiry of a chain.** `processAndCompleteDemands` completes each accepted demand independently once the day has passed (`deleted: true`); a late cancel of the root then hits S11.
8. **`cancelledRequests` order is a hidden contract.** The root is the **last** element (`cancelledRequests[cancelledRequests.length - 1]` in `cancelRequest`), the children come first; in `withdrawFromRequest` the array holds only children.
   The next change to the traversal order silently breaks which demand is reported as the root and who is notified.

### 3.3 Verifications worth turning into tests
A→B→C then A cancels; A→B→C then B withdraws; A→B→A; replaced A posts or adds `pres`; A→B where B had a training or an `absence` assignment that day (entry deactivated, never restored);
switch acceptance end to end (S5, S6); cancel of an already completed demand (S11); concurrent accept of the same demand by two users.

---

## 4. Interface: letting everyone see the final outcome

**What a user sees today.** `getRequests` returns the open/accepted demands of the center for a period; each demand knows its poster and its accepter, nothing about its neighbours in the chain.
`computeUserShifts` keeps a `history` for the day (`type`, `shiftData`, `wasOverride`) but drops `substitution.id`, so the front cannot link an entry to a demand or to the other person.
`DemandChip` and `DemandModal` show the **direct** accepter (avatar, name, phone, e-mail). So A sees "replaced by B" and B's contact data, although C is the one who will actually work.
Nobody is told when the chain below them changes (B's S2 accepted, withdrawn or cancelled).

**Proposal (to validate before any work).**
1. **Data.** Replace the array `dependsOn` by a single `parentId` (the demand through which the poster obtained the shift), keep a derived `rootId`. A day's chain is then `root → ... → leaf`, and the "final holder"
   is the accepter of the last accepted node (or the node's poster if the last demand is still open, shown as "pending"). Expose it on `getRequests` as `chain: [{ demandId, posterId, accepterId, status }]` (counts and ids only, names resolved by the existing user store), or on a small endpoint
   `GET /substitution/:id/chain`.
2. **Calendar entry.** Add `substitution: { id, role: 'poster' | 'accepter' }` to `history` entries, so a day can show "remplacé par B" and open the demand.
3. **Day block / modal for the original poster A.** A compact line "A → B → C" with one marker per link: accepted, open (waiting), cancelled. The last holder is highlighted and is the only contact card shown; intermediate people keep their name only.
   For A the day still says "remplacé" while the chain is open at the end ("en attente d'un remplaçant"): A knows that B is currently still responsible until someone accepts S2.
4. **For B (middle).** B sees "Vous avez repris la vacation de A, remplacée par C" and the poster-side actions of S2 (cancel, change points); the withdraw from S1 button warns that it cancels S2.
5. **Notifications.** After commit, tell the other holders of the chain (not only the people of the changed link) when a link changes: C accepts S2 (A is informed that the final holder is C), C withdraws (A and B are informed that B works again),
   B withdraws from S1 (A is told S1 is open again and that S2 was cancelled). The current mails are intentionally generic; a "chain" mail would only say who is now on the shift.
6. **Guard rails the UI should reflect.** The "remplacé" day must not offer "poster une demande" or the `pres` action (S1, S2); the chain should refuse a loop unless confirmed.

---

## 5. Naming (important: several names say the opposite of what the value is)

| Name | Where | Problem | Suggestion |
|------|-------|---------|-----------|
| `shiftAssignment` | `request.creation.js` | holds `computedShift.shiftData`, neither a shift nor an assignment | `shiftData` |
| `userShift` | `registerEntry`, `cancel*`, `acceptRequest` | it is an **array** of days; the singular name hides it (`userShift[0]` everywhere) | `userDays` (array) / `userDay` (one) |
| `userShifts`, `userShiftData` | `request.accept.js` | array / one day entry, again | `userDays`, `userDay` |
| `posterShift`, `accepterShift` (on `Substitution`) | model, all services | not a shift: `{ shift, day, date, teamId, selectedVariation }`; `posterShift.shift` stutters | `posterSlot` / `posterDay` or `poster: { shift, day, teamId, variation }` |
| `posterShift` / `accepterShift` (return of `addSubstitutionEntries`, `cancelSubstitutionEntries`) | `calendarEntry.*` | **same name, different shape**: here a computed day, `null` in a transaction (and destructured then ignored in `withdraw`) | `posterDay`, `accepterDay` |
| `baseShift` | `planning.userShifts.js` | `{ shift, team }` inside, a `Shift` document at the end (2.2) | `base` / `rotationDay` for the wrapper, `rotationShift` for the document |
| `NewShiftSchema` | `models/Substitution.js` | legacy "new" | `SlotSchema` |
| `isSameShift` | `register.js` and `planning.userShifts.js` | same name, two signatures, one returns `undefined` | `sameShiftId` / `isSameShiftAs` |
| `type` | four meanings: entry discriminator (`assignment`, ...), result `type` (`creation`, `modification`, `restoration`), day `type` (`shift`, `empty`, or the assignment subtype), demand `type` (`switch`, `hybrid`, `substitution`) | `type` cannot be read without its file | `kind` for the discriminator, `action`/`outcome` for the result, `dayKind` for the computed day |
| `substitution` | demand `type`, assignment `subType`, the model name and `Substitution.type` | a "replacement" and the whole collection share a word; files say `request`, functions say `demand`, variables say `sub`, `request`, `demand`, `substitution` | decide: `demand` for the entity, `replacement` for the kind |
| `subType` / `entryType` | model / front payload | same concept, two names | `subType` end to end |
| `team` / `teamId` | `data.team`, `data.teamId`, `shiftData.team`, `posterShift.teamId` | a `Team` reference called both | `teamId` for ids, `team` only for documents |
| `reason` | `cancelRequestWithSession` | it is a final **status** | `finalStatus` |
| `initialCancel` | `request.cancel.js` | it is the root demand that was cancelled | `rootRequest` |
| `date` | everywhere in `calendarEntry.*`, `registerEntry(userId, date, data)` | it is a `YYYY-MM-DD` **string** (the schema type is String), while `Substitution.posterShift.date` is a real `Date`; `toDay`, `toDateKey`, `posterDayOf`, `new Date(...)` convert both ways | `day` for the string, `date` only for a `Date` |
| `isTrueSwitch` | request body | never stored, `type` already says it | drop |
| `userId` in `getUserDemands` | `req.user.posterId` | the token holds `userId` | `req.user.userId` |

**Back-and-forth conversions to remove (day string ↔ `Date` ↔ string).**
`posterDayOf(demand)` (string) → `new Date(...)` for the transaction date → back; `cancelSubstitutionEntries({ date })` is documented as a `Date`, receives a string, applies `toDateKey(date)` to get a string and
then still passes the raw `date` to `computeUserShifts`; `getUserEntries` builds a `Date` for a string field (bug S10); `registerEntry` passes the raw `date` for some queries and `toDay(date)` for others;
`acceptRequest` calls `computeUserShifts(posterDayOf(request))` (a string, not an array) in one place and `[posterDayOf(request)]` in the other. One rule would remove all of it: **a day is always a `YYYY-MM-DD` string
inside the services; a `Date` appears only at a Mongo or library boundary** (this is already the project's Temporal rule, it is just not applied in these files).

---

## 6. Simplification (without changing behaviour)

1. **One writer for "deactivate entries".** `cancelModifications`, `cancelHourPatches`, `cancelAssignments`, `cancelSingleAssignment`, `cancelAfter`, `deleteAssignment`'s `Promise.all`:
   all are `updateMany({ userId, date, active: true, ...filter }, { active: false }, { session })`. One helper with a `kind` list and an optional `since` removes ~60 lines and fixes S7.
2. **One function for `restoreInitialShift` / `undoMods`**, no unused `user`/`initialShift`, and drop `cancelSubstitutionAssignment`, `registerMDDA`, the commented code: this also removes the import cycle.
3. **`registerEntry`**: load only what each handler needs; one validation point for "the day must not be involved in an active substitution" (S2) instead of a check in only one of the three handlers.
4. **`getActiveEntriesByDates`**: three queries are fine; the grouping can be one `groupBy` on `a.date` with no `typeof` branch, and the populate paths reduced to the ones that exist (`shiftData.shift` with `variations`, `shiftData.selectedVariation`, `shiftData.team`).
5. **`computeUserShifts`**: the `resolveAssignment` / `applyModification` / `applyHourPatch` pipeline is readable; the two things that make it hard are the double shape of `baseShift` and the three places that decide `isOff`.
   A `base = { shift, team }` wrapper renamed, and `isOff` / `isWorked` assigned in `resolveAssignment` and one final step, would make each day's state a function of (base, latest assignment, latest modification, latest patch).
6. **Demand state machine.** The legal transitions (`open → accepted | cancelled | expired`, `accepted → open (withdraw) | cancelled | completed`) are implicit in `if (status === ...)` scattered over accept, cancel, withdraw, expiry.
   A small table `canTransition(from, to)` checked in the three entry points fixes S11 and makes S9 (date checks) one more rule in the same place.
7. **Result shape.** Drop `updatedDemands: null` (6 places), the always-`null` `posterShift`/`accepterShift` in transaction mode, and return `{ root, cascaded }` instead of an array whose last item is special (3.2, point 8).
8. **Post-commit steps** (`computeUserShifts`, categorization, mails) wrapped as best effort in one helper, so that a failure after commit never answers an error for a done action.

---

## 7. Suggested order (if you decide to act)

1. Guards, small and safe: S3, S4 (token poster, actor check), S1, S2 (no demand or modification on a replaced day).
2. Data correctness: S7 (await/updateMany), S8 (`finalStatus` forwarded), S11 (state guard), S9 (server compatibility, date, reservation), restoring `savedEntry` or refusing the acceptance.
3. Switch: S5 and S6 together, with an end-to-end test on the scratch database.
4. Dead routes and calls: S10, `getUserDemands`, `register-modification`.
5. Chain model: `parentId`, then the chain in the API and the UI of section 4.
6. Renames and the day/`Date` clean-up (section 5), done last because they touch most files.

Nothing above has been applied. Tell me which items to take and in which order.
