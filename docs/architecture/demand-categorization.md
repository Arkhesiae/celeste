# Demand categorization

How the backend decides whether a substitution / switch demand is compatible with a given user's planning, which
assumptions it makes, and what it returns. Code comments are in French; this page is in English for the docs folder.

Files (all under `backend/`):

| File | Role |
|---|---|
| `services/planning/planning.shiftsMap.js` | builds the user's planning around the demand day (`Map` day → shift entry) |
| `services/substitution/compatibility/compatibility.categorize.js` | the compatibility computation for one demand: `categorize`, `checkCompatibilityForVariation` |
| `services/substitution/compatibility/compatibility.rules.js` | the pure legal rules: `legalLimitsFor` and the seven checks (no database, no environment) |
| `services/substitution/compatibility/compatibility.variations.js` | **optional** exploration of ambiguous variations (`categorizeWithVariations`) |
| `utils/shifts/shiftTime.js` | `withZonedBounds` (date key + `HH:mm` → Temporal instants in the center's zone) and `wallClockIso` (instant → text for the front) |
| `utils/shifts/nightControl.js` | what a night control is (`isNightControl`) |
| `services/substitution/substitution.switches.js` | `getCompatibleSwitches`: the same rules for the candidate days of a switch |
| `test/` | `npm test` (see "Tests" below) |

## 1. Flow

```
 request.list.js / substitution.compatibility.js / substitution.userPool.js
                 |
   generateShiftsMap(demand days, userId)         planning of the user, ±12 days, worked shifts only
                 |
   categorize(demand, shiftsMap, options)         (or categorizeWithVariations for display)
                 |
   checkCompatibilityForVariation
      1. effective hours of the demanded shift    selected variation, else the shift's default hours
      2. put that shift in a copy of the planning at the demand day (it replaces what the user had that day)
      3. user already working that day?           -> 'alreadyWorking' ; canSwitch if that shift is one the poster accepts
      4. legalLimitsFor(...)                      the 7 rules, evaluated around the demand day
                 |
   demand + { limit[], canSwitch, rest, invalidRest35, invalidWork48 }
```

Who calls what:

- **User pool** (who gets the e-mail for a new demand, `substitution.userPool.js`): `categorize` only. It reads `limit`,
  `canSwitch` and `rest`.
- **Demand lists and detail** (`request.list.js`, `substitution.compatibility.js`): `categorizeWithVariations`, which is
  `categorize` plus the optional variation exploration (off by default, see section 5).
- **Switch dialog** (`GET /substitution/compatible-switches/:date`, `getCompatibleSwitches`): for each non-rest day of
  the rotation active at that date, the candidate day is put in the planning and goes through the same `legalLimitsFor`.

## 2. The planning: `generateShiftsMap`

- Input: the demand day(s) and a user. Output: `Map<'YYYY-MM-DD', entry>` with
  `entry = { shift, team, date, selectedVariation, startTime, endTime, endsNextDay }`: the day the shift **starts**
  (key) and its `HH:mm` hours, no timestamps.
- It covers **12 days before and after** each demand day (the 7-day windows of the rules reach 6 days before and 12 days
  after the target, plus a margin for nights).
- Only **worked** shifts are in the map: rest days, days off and empty days are absent. "No entry" therefore means "not
  working".
- The shifts come from `computeUserShifts`: rotation + team cycle + calendar entries, variations, substitutions and
  transactions already applied. A variation chosen by the user in their calendar is `entry.selectedVariation` and its
  hours are used; otherwise the shift's default hours.

## 3. Assumptions

1. **One time zone for the whole planning: the center's.** The shifts of a user are times of day in the time zone of the
   user's center (`Center.timeZone`, default `Europe/Paris`). Every shift entered in a computation uses that same zone;
   see "Time zones" below.
2. **A shift is a date key plus `HH:mm` hours**, never a `Date` or a timestamp; instants only exist inside the
   computation, as `Temporal.ZonedDateTime` in the center's zone (see "Time zones").
3. **A shift belongs to the day it starts.** A 22:00–06:00 night dated D ends on D+1. Consecutive days / nights are
   consecutive start days.
4. **Variations: the default hours apply until someone chooses one.** A variation chosen on the demand
   (`posterShift.selectedVariation`) or in the user's calendar is always taken into account. `categorize` also accepts
   `options.selectedVariation` to evaluate the choice of the user who is looking at the demand. Trying *every*
   variation is the optional exploration (section 5), not part of the base result.
5. **The demanded shift replaces the user's shift of that day** (a switch or a substitution: the user would work the
   demanded shift instead). The user's other days are what the planning says.
6. **Only the neighbourhood of the target counts.** Windows of 7 days that contain the target day (13 of them), the
   streak of days that contains the target, the nights next to the target. An old violation far from the target is not
   charged to it.
7. **A night control is any shift that works at some moment between 00:00 and 06:00** (center local time), see
   `isNightControl`: 22:00–06:00 yes, 06:00–14:00 no, 16:00–00:00 no, 16:00–00:01 yes.
8. **Overlapping shifts** are possible in data (they are rejected by the 11 h rule) and count twice in the 48 h total
   (known issue #47).

## 4. The rules and the limit codes

`legalLimitsFor(targetShift, day, planning)` returns the list of codes (empty = compatible). The planning passed in
already contains the target shift.

| Code | Rule | Evaluated on |
|---|---|---|
| `insufficientRest` | at least 11 h between two shifts | the shift before and the shift after the target |
| `35limit` | in every 7-day window a continuous rest of at least 35 h | the 13 windows starting at D-6 … D+6 (midnight to midnight) |
| `48hLimit` | at most 48 h worked in every 7-day window | the same 13 windows (shifts crossing a window edge count for the part inside) |
| `consecutiveDaysLimit` | at most 5 consecutive working days | the streak that contains the target |
| `nightControlRestLimit` | at least 12 h of rest after a night control | the target, and the shift just before it |
| `consecutiveNightLimit` | at most 2 consecutive night controls | the streak of nights that contains the target |
| `restAfterTwoNightsLimit` | at least 48 h of rest after two consecutive nights | the pairs the target belongs to, or that it follows |

`categorize` adds `alreadyWorking` (the user has a shift that day) and the technical `invalidDemand` / `invalidShift`.

The 35 h rule is **bounded by the window by design**: the rest must fit entirely inside each 7-day window, so a rest that
straddles two windows is cut, and a Monday–Friday 07:00–15:00 week (64 h of weekend rest, but 31 h + 33 h inside a window
starting on Sunday) is rejected.

Known limits of the rules (see `docs/quality/blocking-issues.md`): **#45** `getCompatibleSwitches` uses default hours only;
**#47** overlapping shifts counted twice.

## 4b. Time zones

Planning entries carry no instants: a shift is `{ date, startTime, endTime, endsNextDay }` and its hours are **local
hours of the center** (`Center.timeZone`). All the shifts of a planning share that one zone: the zone of the center of the
user whose planning it is.

- `withZonedBounds(shifts, timeZone)` (`utils/shifts/shiftTime.js`) is the only place where hours become instants: it adds
  `start` / `end` (`Temporal.ZonedDateTime`) to each shift. A time that does not exist (02:30 on the spring change) moves
  after the gap; a time that exists twice (02:30 on the autumn change) takes the first occurrence. Durations are then
  real: a 22:00–06:00 night lasts 7 h when clocks go forward, 9 h when they go back.
- `legalLimitsFor(targetDate, shiftsSorted, timeZone)` calls it **once**; every rule then works on those zoned instants
  with Temporal only (`Temporal.ZonedDateTime.compare`, `until`). The 7-day windows start and end at **local** midnights
  (a window with a clock change lasts 167 h or 169 h) and the 00:00–06:00 band of a night control is the local one
  (`isNightControl` reads the zone from the shift's `start`).
- Callers pass the zone explicitly: `categorize(demand, map, { timeZone })`, `categorizeWithVariations(..., { timeZone })`,
  `legalLimitsFor(..., timeZone)`, read with `getCenterTimeZone(centerId)` / `getUserTimeZone(userId)`
  (`services/center/center.timezone.js`). The user pool uses the center of the demand (all pool users belong to it).
  Without a zone the application default (`Europe/Paris`) applies.
- **Text for the front.** The front displays the UTC hours of the ISO strings it receives, so `wallClockIso` writes the
  local time of the center with a `Z` (`2026-03-28T22:00:00.000Z` for 22:00 in Paris). It is used for the
  `invalidRest35` / `invalidWork48` windows (`windowStart`, `windowEnd`, `longestRestStart`, `longestRestEnd`) and for the
  `start` / `end` of the planning returned by `getCompatibility` (`substitution.compatibility.js`). Durations (`rest`,
  `longestRest`, `totalWorkMinutes`) are real minutes.

## 5. Result

`categorize(demand, shiftsMap, options)` returns the demand (`demand.toObject()`) plus:

| Field | Meaning |
|---|---|
| `limit` | array of codes above; empty = the user could take the demand as is |
| `canSwitch` | the user already works that day with a shift the poster accepts in exchange (switch / hybrid) |
| `rest` | `{ before, after }` minutes of rest around the demanded shift (0 when there is no neighbour) |
| `invalidRest35` | windows without a 35 h rest: `{ windowStart, windowEnd, longestRest, longestRestStart, longestRestEnd }` (ISO strings, `longestRest` in minutes) |
| `invalidWork48` | windows over 48 h: `{ windowStart, windowEnd, totalWorkMinutes }` (ISO strings) |

How the pool and the front read it: for a **substitution**, `limit.length === 0`; for a **switch**,
`canSwitch && limit.length === 1` (the only limit is `alreadyWorking`); for a **hybrid**, either. The front graph
(`WorkdayAmplitudeGraph.vue`) draws `rest`, `invalidRest35` and `invalidWork48` and labels every code.

`getCompatibleSwitches` returns, per candidate day of the rotation: `{ _id, name, order, startTime, endTime,
endsNextDay, limit, compatible }`.

### Optional variation exploration (`categorizeWithVariations`)

Disabled by default. It adds `compatibleVariations`, `compatibleFetcherVariationsByDate`,
`compatiblePairsByFetcherDate`, `potentiallyCompatible`, and always `variationsExplored` (`false` = these fields are empty
because nothing was explored, not because no variation fits).

- Enable per call: `categorizeWithVariations(demand, shiftsMap, { explore: true })`; or by default with the environment
  variable `EXPLORE_VARIATIONS=true` (`explore: false` always wins).
- What it does: for each shift of the user that has 2+ variations and no chosen one (within 7 days of the demand, at most
  4 days), and for each variation of the demanded shift when none is chosen, it recomputes the compatibility and keeps the
  combinations that pass. `potentiallyCompatible` = some combinations pass and some fail. The number of evaluations is
  capped at 128.
- Status: the exploration is not fully integrated in the UI (`DemandCard.vue`, `WorkdayAmplitudeGraph.vue` read these
  fields); with the flag off, those hints are simply absent and `substitutionStore.potentiallyCompatibleDemands` is empty.

## 6. Tests

`cd backend && npm test` (Node's built-in runner).

- `test/compatibility.rules.test.js`: every rule at its boundaries, 3000 random plannings against an independent
  minute-by-minute oracle for 11 h / 35 h / 48 h, night controls under four server time zones, and the limit codes through
  `categorize`. Tests marked `todo` describe known defects (#47).
- `test/compatibility.db.test.js`: `getCompatibleSwitches` on a scratch MongoDB database (`TEST_MONGO_URI`, default
  `mongodb://127.0.0.1:27017/celeste_test_compat`, dropped before and after, skipped when unreachable) against the same
  oracle extended with the 5-day and night rules.
- `test/demandVariations.test.js`: the optional exploration, the flag, and selected variations.
